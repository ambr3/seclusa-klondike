/*
 * Copyright (C) 2016  Tobias Bielefeld
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * If you want to contact me, send me an e-mail at tobias.bielefeld@gmail.com
 */
/**
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/ui/GameManager.java`.
 *
 * In the Android app this was an Activity containing a RelativeLayout full of ImageViews.
 * Here it is a screen containing one `<canvas>` plus DOM chrome, but the control flow is
 * transcribed 1:1: the same input handlers, the same `initializeLayout()` ordering, the
 * same `WaitForAnimationHandler` chains, and the same `menuClick()` routing.
 */
import { shared } from '../game/SharedData.js';
import { Card } from '../game/Card.js';
import { Stack, SpacingDirection } from '../game/Stack.js';
import { Preferences } from '../game/Preferences.js';
import { Scores } from '../game/Scores.js';
import { RecordList } from '../game/RecordList.js';
import { GameLogic } from '../game/GameLogic.js';
import { Timer } from '../game/Timer.js';
import { Sounds } from '../game/Sounds.js';
import { MovingCards } from '../game/MovingCards.js';
import { Hint } from '../game/Hint.js';
import { AutoComplete } from '../game/AutoComplete.js';
import { DealCards } from '../game/DealCards.js';
import { EnsureMovability } from '../game/EnsureMovability.js';
import { Scheduler, WaitForAnimationHandler } from '../game/Scheduler.js';
import { Animate } from '../render/Animate.js';
import { Renderer } from '../render/Renderer.js';
import { CardHighlight } from '../game/CardHighlight.js';
import { el, button, setVisible } from './dom.js';
import { iconSvg, iconElement } from './icons.js';
import { strings } from './strings.js';
import { openPillDialog, showToast } from './Dialogs.js';
import { argbToCss, resolveFeltGradient, resolveIsDark, resolveUiTextColor, } from './theme.js';
const DOUBLE_TAP_SPEED = 400; // time delta between two taps, in ms
/** dimens.xml, converted from dp to CSS pixels. */
const DP = {
    barMargin: 16,
    bottomChrome: 64,
    /* Capsule: 56px thumb hits + 8px pad each side. */
    menuBarHeight: 72,
    menuBarWidth: 72,
    menuBarPortraitMaxWidth: 256,
    menuBarLandscapeMaxHeight: 256,
    /** `buttonMainAutoComplete` marginBottom in activity_game_manager.xml. */
    autoCompleteMarginBottom: 12,
    /** `mainButtonScores` marginStart/marginLeft in activity_game_manager.xml. */
    chipMarginStart: 2,
};
export class GameManager {
    host;
    hasLoaded = false;
    root;
    background;
    canvas;
    chromeBar;
    scoreChip;
    scoreValue;
    timeChip;
    timeValue;
    recyclesBadge;
    overlayLower;
    overlayUpper;
    menuBar;
    autoCompleteButton;
    renderer;
    highlight = new CardHighlight();
    layout = { width: 0, height: 0, isLandscape: false, isLargeTablet: false };
    firstTapTime = 0;
    tapped = null;
    activityPaused = false;
    rafId = null;
    pendingTimers = [];
    destroyed = false;
    menuBarVisible = true;
    handlerTestAfterMove;
    handlerTestIfWon;
    safeArea = { top: 0, bottom: 0, left: 0, right: 0 };
    constructor(root, bitmaps, host) {
        this.host = host;
        this.root = root;
        // ------------------------------------------------------- static helpers
        // Order mirrors `GameManager.onCreate()`: helpers first, then the game class — the
        // the game constructor allocates cards and stacks through `shared.gameLogic`.
        shared.prefs = new Preferences();
        shared.scheduler = new Scheduler();
        shared.gameLogic = new GameLogic();
        /*
         * PORT: the PWA hard-coded `new Klondike()`. This build hosts two games, so the
         * concrete class is injected by the game folder's entry point through
         * `shared.gameFactory`. It is created once and reused for the lifetime of the
         * screen, exactly like the Android Activity.
         */
        if (!shared.gameFactory) {
            throw new Error('shared.gameFactory was not set before GameManager was built');
        }
        shared.currentGame = shared.gameFactory();
        shared.animate = new Animate((cb) => globalThis.requestAnimationFrame(cb), (id) => globalThis.cancelAnimationFrame(id));
        // The render loop below advances the tweens, so Animate must not self-schedule.
        shared.animate.setExternallyDriven(true);
        shared.sounds = new Sounds();
        shared.recordList = new RecordList(shared.scheduler);
        shared.scores = new Scores();
        shared.timer = new Timer();
        shared.timer.onTick = (text) => {
            this.timeValue.textContent = text;
        };
        shared.movingCards = new MovingCards();
        shared.hint = new Hint();
        shared.autoComplete = new AutoComplete();
        shared.ensureMovability = new EnsureMovability((fn) => this.postToFrame(fn));
        this.handlerTestAfterMove = new WaitForAnimationHandler({
            doAfterAnimation: () => {
                if (!shared.gameLogic.hasWon()) {
                    shared.currentGame.testAfterMove();
                }
                this.handlerTestIfWon.sendDelayed();
                if (!shared.autoComplete.isRunning() && !shared.gameLogic.hasWon()) {
                    shared.gameLogic.checkForAutoCompleteButton(false);
                }
            },
            additionalHaltCondition: () => shared.stopUiUpdates,
        });
        this.handlerTestIfWon = new WaitForAnimationHandler({
            doAfterAnimation: () => shared.gameLogic.testIfWon(),
            additionalHaltCondition: () => shared.stopUiUpdates,
        });
        shared.dealCards = new DealCards(this.handlerTestAfterMove);
        shared.currentGame.setRecycleCounterCallback(() => this.updateNumberOfRecycles());
        shared.scores.setCallback((score, dollar) => this.updateScore(score, dollar));
        // ------------------------------------------------------------- UI hooks
        shared.uiHooks = {
            post: (fn, delay) => {
                this.post(fn, delay);
            },
            cancelPending: () => this.cancelPending(),
            toast: (text) => showToast(text),
            isPaused: () => this.activityPaused || this.destroyed,
            showWonDialog: () => this.showWonDialog(),
            setAutoCompleteButtonVisible: (visible, withoutMovement) => this.setAutoCompleteButtonVisible(visible, withoutMovement),
            setEnsureMovabilityDialog: (visible) => this.setEnsureMovabilityDialog(visible),
            updateLimitedRecyclesCounter: () => this.updateLimitedRecyclesCounter(),
        };
        // --------------------------------------------------- setting up game data
        // Port of `GameManager.onCreate()`: create the stacks (plus the off-screen stack)
        // and then one Card per card id. The canvas renderer reads the same structures.
        shared.stacks = new Array(shared.stacks.length);
        for (let i = 0; i < shared.stacks.length; i++) {
            shared.stacks[i] = new Stack(i);
            shared.stacks[i].backgroundKey = 'default';
        }
        shared.currentGame.offScreenStack = new Stack(-1);
        shared.currentGame.offScreenStack.setSpacingDirection(SpacingDirection.NONE);
        shared.stacks.push(shared.currentGame.offScreenStack);
        for (let i = 0; i < shared.cards.length; i++) {
            shared.cards[i] = new Card(i);
        }
        // ---------------------------------------------------------------- build
        this.root.className = 'game-root';
        this.background = el('div', 'game-background');
        this.canvas = el('canvas', 'game-layout');
        this.renderer = new Renderer(this.canvas, bitmaps);
        this.chromeBar = el('div', 'chrome-bar');
        this.scoreChip = el('div', 'chip');
        this.scoreChip.setAttribute('role', 'button');
        this.scoreChip.tabIndex = 0;
        this.scoreChip.setAttribute('aria-label', strings.title_activity_statistics);
        this.scoreChip.innerHTML = iconSvg('star', 22);
        this.scoreValue = el('span', 'chip-score');
        this.scoreChip.appendChild(this.scoreValue);
        this.scoreChip.addEventListener('click', () => this.host.openStatistics());
        this.timeChip = el('div', 'chip');
        this.timeValue = el('span', 'chip-time');
        this.timeChip.appendChild(this.timeValue);
        this.recyclesBadge = el('div', 'recycles-badge', '0');
        this.menuBar = this.buildMenuBar();
        this.autoCompleteButton = el('button', 'autocomplete-button', strings.game_auto_complete_text);
        this.autoCompleteButton.type = 'button';
        this.autoCompleteButton.addEventListener('click', () => this.menuClick('autoComplete'));
        this.chromeBar.append(this.scoreChip, this.timeChip);
        // The RelativeLayout has *two* overlays on top of the playfield: the lower one
        // (`mainRelativeLayoutGameOverlayLower`, which carries the same params2 as the playfield
        // and so is inset by the layout margins) holds the recycle badge, and the upper one
        // (`mainRelativeLayoutGameOverlay`, params3, never margined) holds the auto-complete
        // button. They are not always the same size, so they stay separate elements rather
        // than one full-window layer.
        this.overlayLower = this.makeOverlay();
        this.overlayUpper = this.makeOverlay();
        this.overlayLower.append(this.recyclesBadge);
        this.overlayUpper.append(this.autoCompleteButton);
        this.root.append(this.background, this.canvas, this.overlayLower, this.chromeBar, this.overlayUpper, this.menuBar);
        this.attachInput();
        shared.animate.onWinPhaseOneDone = () => this.showWonDialog();
    }
    makeOverlay() {
        const overlay = el('div');
        Object.assign(overlay.style, {
            position: 'absolute',
            pointerEvents: 'none',
        });
        for (const child of Array.from(overlay.children)) {
            child.style.pointerEvents = 'auto';
        }
        return overlay;
    }
    // ------------------------------------------------------------------- boot
    /** `GameManager.initializeLayout()` plus the deferred first `gameLogic.load()`. */
    start() {
        this.measureSafeArea();
        this.applyLayout();
        this.updateMenuBar();
        this.loadBackgroundColor();
        this.applyCssTextColor();
        setVisible(this.scoreChip, !shared.prefs.getSavedHideScore());
        setVisible(this.timeChip, !shared.prefs.getSavedHideTime());
        // `onResume()` always follows `onCreate()` on Android, and it calls `timer.load()`
        // before the deferred `HandlerLoadGame` runs. Without this the clock keeps a start
        // time of 0 and the time chip reads a 14-digit elapsed time.
        shared.timer.load();
        // The Android app deferred the first load by 200 ms so the deal looks smoother.
        this.loadPending = true;
        this.post(() => {
            shared.gameLogic.load(false);
            this.hasLoaded = true;
            this.loadPending = false;
        }, 200);
        this.startRenderLoop();
    }
    /**
     * Re-arms the deferred first load if `pause()` cancelled it.
     *
     * `cancelPending()` clears the same list `uiHooks.post` draws from, so hiding the tab
     * inside that 200 ms window took the load with it -- and `resume()` did not put it
     * back. `hasLoaded` stayed false, which gates the timer save and the score save, and
     * the board kept drawing stack backgrounds over an empty game until the page was
     * reloaded. The same list backs the after-move chain, so a pause inside the 100 ms
     * after the winning move dropped `testIfWon()` entirely: no win dialog, and the score
     * never recorded.
     *
     * The flag is cleared by the callback itself rather than by `cancelPending()`, because
     * that is the only place that knows whether the load actually ran.
     */
    rearmLoadIfPending() {
        if (this.loadPending && !this.destroyed) {
            this.post(() => {
                shared.gameLogic.load(false);
                this.hasLoaded = true;
                this.loadPending = false;
            }, 200);
        }
    }
    pause() {
        this.activityPaused = true;
        if (this.hasLoaded) {
            shared.timer.save();
            shared.gameLogic.save();
        }
        // A clip that is already sounding finishes on its own otherwise, so hiding the tab
        // still played the win fanfare and the last card noise into a backgrounded page.
        shared.sounds.silence();
        shared.autoComplete.pause();
        shared.hint.pause();
        shared.ensureMovability.pause();
        shared.dealCards.pause();
        this.cancelPending();
        // Stop painting a board nobody can see — the continuous loop is the battery cost.
        if (this.rafId !== null) {
            globalThis.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    resume() {
        this.activityPaused = false;
        this.measureSafeArea();
        this.measureCanvas();
        this.loadBackgroundColor();
        this.applyCssTextColor();
        shared.animate.updateMovementSpeed();
        this.updateMenuBar();
        this.updateGameLayout();
        shared.timer.load();
        shared.autoComplete.resume();
        shared.hint.resume();
        shared.ensureMovability.resume();
        shared.dealCards.resume();
        this.rearmLoadIfPending();
        if (this.rafId === null && !this.destroyed) {
            this.startRenderLoop();
        }
    }
    destroy() {
        this.destroyed = true;
        this.cancelPending();
        this.handlerTestIfWon.clear();
        this.handlerTestAfterMove.clear();
        /*
         * The helpers below drive themselves from `shared.scheduler`. `postToFrame()`
         * checks `destroyed`, but a scheduled tick does not, so left running they keep
         * moving cards on a board that is no longer on screen — and an EnsureMovability
         * search that outlives the screen holds `stopUiUpdates` true, which silently
         * freezes every game opened after it.
         */
        shared.autoComplete.stop();
        shared.hint.stop();
        shared.dealCards.stop();
        shared.ensureMovability.stop();
        shared.sounds.silence();
        // And released, not just silenced: a fresh Sounds is built per GameManager, so
        // without this every game switch left a `storage` listener and 24 Audio elements
        // behind, unreachable because the listener was anonymous.
        shared.sounds.destroy();
        shared.timer.stop();
        // Whatever else is still armed on the shared scheduler: the undo cascade and any
        // handler that re-armed itself since the clears above.
        shared.scheduler.cancelPending();
        if (this.rafId !== null) {
            globalThis.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.unbindCanvasResize();
        shared.animate.reset();
        this.root.innerHTML = '';
    }
    // ------------------------------------------------------------------ layout
    measureSafeArea() {
        this.safeArea = readSafeArea();
    }
    isLandscape() {
        return window.innerWidth > window.innerHeight;
    }
    /** `applyGameLayoutMargins()` — the user-chosen playfield inset, in dp. */
    layoutMargin() {
        const value = this.isLandscape()
            ? shared.prefs.getSavedGameLayoutMarginsLandscape()
            : shared.prefs.getSavedGameLayoutMarginsPortrait();
        return value === 1 ? 20 : value === 2 ? 60 : value === 3 ? 100 : 0;
    }
    /**
     * The whole screen, laid out exactly as the Android RelativeLayout in
     * `updateMenuBar()` (GameManager.java:806-885) plus `activity_game_manager.xml`.
     *
     * The four cases, transcribed rule for rule:
     *
     *   landscape, menu RIGHT   menuBar ALIGN_PARENT_RIGHT   margins(0, m, m, m)
     *                          chromeBar ALIGN_PARENT_BOTTOM + LEFT_OF menuBar
     *                          game window + overlays      LEFT_OF menuBar + ABOVE chromeBar
     *   landscape, menu LEFT    menuBar ALIGN_PARENT_LEFT    margins(m, m, 0, m)
     *                          chromeBar ALIGN_PARENT_BOTTOM + RIGHT_OF menuBar
     *                          game window + overlays      RIGHT_OF menuBar + ABOVE chromeBar
     *   portrait,  menu BOTTOM  menuBar ALIGN_PARENT_BOTTOM margins(m, 0, m, m), full width
     *                          chromeBar ABOVE menuBar (full width, unconstrained)
     *                          game window + overlays      ABOVE chromeBar
     *   portrait,  menu TOP     menuBar ALIGN_PARENT_TOP    margins(m, m, m, 0), full width
     *                          chromeBar ALIGN_PARENT_BOTTOM (full width)
     *                          game window + overlays      BELOW menuBar + ABOVE chromeBar
     *
     * The load-bearing detail: whenever the menu bar is vertical (landscape), the chrome bar
     * and the playfield are trimmed to stop where the bar begins. That is what keeps the
     * score/time pills from sliding under it.
     */
    computeBoxes() {
        const isLandscape = this.isLandscape();
        const { top, bottom, left, right } = this.safeArea;
        const margin = this.layoutMargin();
        const barMargin = DP.barMargin;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        // The playfield inset the user asked for: `applyGameLayoutMargins()` only ever calls
        // `params.setMargins(margin, 0, margin, 0)`, so it is a horizontal inset only, and it
        // is applied to params2 alone — i.e. the playfield and the lower overlay.
        const insetLeft = left + margin;
        const insetRight = right + margin;
        // ---------------------------------------------------------------- landscape
        if (isLandscape) {
            const menuOnRight = shared.prefs.getSavedMenuBarPosLandscape() === 'right';
            const barWidth = DP.menuBarWidth;
            // Rail reserved for the bar (full height) so the playfield still clears it;
            // the visible pill itself is short and vertically centered.
            const railLeft = menuOnRight
                ? viewportW - right - barMargin - barWidth
                : left + barMargin;
            const availableHeight = Math.max(0, viewportH - top - bottom - barMargin * 2);
            const barHeight = Math.min(availableHeight, DP.menuBarLandscapeMaxHeight);
            const barTop = top + barMargin + Math.round((availableHeight - barHeight) / 2);
            // LEFT_OF / RIGHT_OF pins the far edge to the bar and leaves the near edge on the
            // parent, so both boxes are trimmed where the vertical bar begins.
            const chromeLeft = menuOnRight ? left : railLeft + barWidth;
            const chromeRight = menuOnRight ? railLeft : viewportW - right;
            const chromeBar = {
                left: chromeLeft,
                top: viewportH - bottom - DP.bottomChrome,
                width: Math.max(0, chromeRight - chromeLeft),
                height: DP.bottomChrome,
            };
            // params2 adds the layout margin to whichever edge is NOT the RelativeLayout anchor,
            // so a menu on the left pushes the playfield right, and a menu on the right leaves it
            // against the parent edge.
            const playfield = {
                left: chromeLeft + margin,
                top,
                width: Math.max(0, chromeRight - chromeLeft - margin * 2),
                height: Math.max(0, chromeBar.top - top),
            };
            return {
                isLandscape,
                menuOnRight,
                menuAtBottom: false,
                menuBar: {
                    left: railLeft,
                    top: barTop,
                    width: barWidth,
                    height: barHeight,
                },
                chromeBar,
                playfield,
                overlayUpper: { left: chromeLeft, top, width: chromeBar.width, height: playfield.height },
            };
        }
        // ----------------------------------------------------------------- portrait
        const menuAtBottom = shared.prefs.getSavedMenuBarPosPortrait() === 'bottom';
        const barHeight = DP.menuBarHeight;
        const availableWidth = Math.max(0, viewportW - insetLeft - insetRight);
        const barWidth = Math.min(availableWidth, DP.menuBarPortraitMaxWidth);
        const menuBar = {
            left: insetLeft + Math.round((availableWidth - barWidth) / 2),
            top: menuAtBottom ? viewportH - bottom - barMargin - barHeight : top + barMargin,
            width: barWidth,
            height: barHeight,
        };
        // menu BOTTOM: paramsChrome is ABOVE the menu bar. menu TOP: paramsChrome is
        // ALIGN_PARENT_BOTTOM, full width. Either way it runs edge to edge.
        const chromeBar = {
            left: left,
            top: menuAtBottom ? menuBar.top - DP.bottomChrome : viewportH - bottom - DP.bottomChrome,
            width: Math.max(0, viewportW - left - right),
            height: DP.bottomChrome,
        };
        // ABOVE chromeBar, plus BELOW menuBar when the bar is at the top.
        const fieldTop = menuAtBottom ? top : menuBar.top + barHeight;
        const playfield = {
            left: insetLeft,
            top: fieldTop,
            width: Math.max(0, viewportW - insetLeft - insetRight),
            height: Math.max(0, chromeBar.top - fieldTop),
        };
        return {
            isLandscape,
            menuOnRight: false,
            menuAtBottom,
            menuBar,
            chromeBar,
            playfield,
            overlayUpper: { left, top: fieldTop, width: chromeBar.width, height: playfield.height },
        };
    }
    /** The playfield box — the same one `Klondike.setStacks()` lays the cards out in. */
    playfieldRect() {
        const { playfield } = this.computeBoxes();
        return { width: Math.max(1, playfield.width), height: Math.max(1, playfield.height) };
    }
    isLargeTablet() {
        return (shared.prefs.getSavedForcedTabletLayout() ||
            Math.min(window.innerWidth, window.innerHeight) >= 600);
    }
    /** Mirrors `GameManager.initializeLayout()`. */
    applyLayout() {
        const playfield = this.playfieldRect();
        const isLandscape = this.isLandscape();
        this.layout = {
            width: playfield.width,
            height: playfield.height,
            isLandscape,
            isLargeTablet: this.isLargeTablet(),
        };
        shared.currentGame.setStacks(this.layout);
        shared.currentGame.setOffScreenStack();
        // if left handed mode is true, mirror all stacks
        if (shared.prefs.getSavedLeftHandedMode()) {
            shared.gameLogic.mirrorStacks(playfield.width);
        }
        // calculate the spacing for cards on a stack
        Stack.defaultSpacing = Card.width / 2;
        for (const stack of shared.stacks) {
            stack.applyDefaultSpacing();
        }
        // setup how the cards on the stacks will be stacked (offset to the previous card)
        const directions = shared.currentGame.directions;
        for (let i = 0; i < shared.stacks.length; i++) {
            if (directions === null) {
                shared.stacks[i].setSpacingDirection(shared.stacks[i].getId() <= shared.currentGame.getLastTableauId()
                    ? SpacingDirection.DOWN
                    : SpacingDirection.NONE);
            }
            else {
                shared.stacks[i].setSpacingDirection(directions[i] ?? SpacingDirection.NONE);
            }
        }
        shared.currentGame.applyDirectionBorders(this.layout);
        for (const stack of shared.stacks) {
            stack.width = Card.width;
            stack.height = Card.height;
        }
        shared.animate.layoutWidth = playfield.width;
        shared.animate.layoutHeight = playfield.height;
        this.root.style.setProperty('--card-width', Card.width + 'px');
        shared.scores.load();
        this.updateLimitedRecyclesCounter();
    }
    /** `GameManager.updateGameLayout()` — re-apply the layout and redraw without animation. */
    updateGameLayout() {
        this.measureSafeArea();
        this.applyLayout();
        if (shared.gameLogic.hasWon()) {
            for (const card of shared.cards) {
                card.setLocationWithoutMovement(this.layout.width, 0);
            }
        }
        else {
            for (const stack of shared.stacks) {
                stack.updateSpacingWithoutMovement();
            }
        }
        this.updateMenuBar();
        // Playfield CSS size just changed — sync the canvas buffer or the next paint
        // stretches the old bitmap (fullscreen enter/exit is the usual trigger).
        this.measureCanvas();
    }
    /** `GameManager.updateMenuBar()`. */
    updateMenuBar() {
        const boxes = this.computeBoxes();
        this.menuBarVisible = true;
        setVisible(this.menuBar, true);
        const place = (node, box) => {
            Object.assign(node.style, {
                left: `${box.left}px`,
                top: `${box.top}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                right: 'auto',
                bottom: 'auto',
            });
        };
        place(this.menuBar, boxes.menuBar);
        this.menuBar.classList.toggle('is-vertical', boxes.isLandscape);
        // The chrome bar is paramsChrome: never margined, trimmed to the vertical menu bar.
        place(this.chromeBar, boxes.chromeBar);
        place(this.canvas, boxes.playfield);
        // The lower overlay shares params2 with the playfield; the upper one is params3.
        place(this.overlayLower, boxes.playfield);
        place(this.overlayUpper, boxes.overlayUpper);
        // The felt covers the whole window, behind the menu bar included.
        Object.assign(this.background.style, {
            left: '0px',
            top: '0px',
            width: `${window.innerWidth}px`,
            height: `${window.innerHeight}px`,
            right: 'auto',
            bottom: 'auto',
        });
        // ---- auto-complete button: alignParentBottom + centerHorizontal of the upper overlay
        Object.assign(this.autoCompleteButton.style, {
            left: '50%',
            right: 'auto',
            bottom: `${DP.autoCompleteMarginBottom}px`,
            transform: 'translateX(-50%)',
        });
        // The recycle badge tracks the main stack inside the lower overlay.
        this.updateLimitedRecyclesCounter();
    }
    buildMenuBar() {
        const bar = el('div', 'menu-bar');
        const item = (action, icon, label, onClick) => {
            const node = el('div', 'menu-item');
            node.dataset.action = action;
            node.setAttribute('role', 'button');
            node.tabIndex = 0;
            // Built as nodes, not as one HTML string: the label goes in as text, so it can
            // never become markup.
            node.setAttribute('aria-label', label);
            node.title = label;
            node.append(iconElement(icon, 24), el('span', 'menu-item-label', label));
            node.addEventListener('click', onClick);
            node.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            });
            return node;
        };
        // Four actions, evenly spaced: New · Hint · Undo · Settings.
        // Back-to-launcher lives on the shell stage bar; hide-bar is gone.
        bar.append(
            item('newGame', 'newGame', strings.menu_new_game, () => this.menuClick('newGame')),
            item('hint', 'lightbulb', strings.settings_support, () => this.menuClick('hint')),
            item('undo', 'undo', strings.menu_undo, () => this.menuClick('undo')),
            item('settings', 'settings', strings.menu_settings, () => this.menuClick('settings')),
        );
        return bar;
    }
    /** `GameManager.menuClick(View)`. */
    menuClick(action) {
        // if something important happens don't accept input
        if (shared.gameLogic.stopConditions()) {
            return;
        }
        // also return moving cards, to prevent bugs
        if (shared.movingCards.hasCards()) {
            shared.movingCards.returnToPos();
        }
        this.resetTappedCard();
        switch (action) {
            case 'undo':
                if (!shared.gameLogic.hasWon()) {
                    shared.recordList.undo();
                }
                break;
            case 'hint':
                this.showHelpDialog();
                break;
            case 'newGame':
                this.showNewGameDialog();
                break;
            case 'settings':
                this.host.openSettings();
                break;
            case 'autoComplete':
                shared.autoComplete.start();
                break;
            default:
                break;
        }
    }
    /** `DialogStartNewGame` — "Deal new cards" or "Keep the same cards". */
    showNewGameDialog() {
        openPillDialog({
            title: strings.dialog_start_new_game_title,
            message: strings.dialog_start_new_game_text,
            options: [
                {
                    label: strings.menu_deal_new_cards,
                    primary: true,
                    onClick: () => shared.gameLogic.newGame(),
                },
                {
                    label: strings.menu_same_cards,
                    onClick: () => shared.gameLogic.redeal(),
                },
            ],
            cancelLabel: strings.game_cancel,
        });
    }
    /** `DialogInGameHelpMenu` — hints or the manual. */
    showHelpDialog() {
        openPillDialog({
            title: strings.settings_support,
            options: [
                {
                    label: strings.dialog_show_hints,
                    primary: true,
                    onClick: () => {
                        if (!shared.gameLogic.hasWon()) {
                            shared.hint.start();
                        }
                    },
                },
                {
                    label: strings.item_game_rules,
                    onClick: () => this.host.openManual(),
                },
            ],
            cancelLabel: strings.game_cancel,
        });
    }
    /** `DialogWon` — score breakdown plus the three options. */
    showWonDialog() {
        const header = el('div', 'dialog-scores');
        if (shared.currentGame.isBonusEnabled()) {
            const rows = [
                [strings.dialog_win_score, shared.scores.getPreBonus()],
                [strings.dialog_win_bonus, shared.scores.getBonus()],
                [strings.dialog_win_total, shared.scores.getScore()],
            ];
            for (const [label, value] of rows) {
                header.appendChild(el('div', null, label.replace('%d', String(value))));
            }
        }
        openPillDialog({
            title: strings.dialog_win_titel,
            header,
            options: [
                {
                    label: strings.menu_deal_new_cards,
                    primary: true,
                    onClick: () => shared.gameLogic.newGame(),
                },
                {
                    label: strings.menu_same_cards,
                    onClick: () => shared.gameLogic.redeal(),
                },
            ],
            cancelLabel: undefined,
        });
    }
    ensureMovabilityHandle = null;
    setEnsureMovabilityDialog(visible) {
        if (!visible) {
            this.ensureMovabilityHandle?.root.remove();
            this.ensureMovabilityHandle = null;
            return;
        }
        if (this.ensureMovabilityHandle) {
            return;
        }
        const handle = openPillDialog({
            title: strings.dialog_ensure_movability_title,
            message: strings.dialog_ensure_movability_text,
            options: [
                {
                    label: strings.dialog_ensure_movability_cancel,
                    onClick: () => {
                        shared.ensureMovability.stop();
                        shared.gameLogic.redeal();
                    },
                },
            ],
            cancelLabel: undefined,
            modal: false,
        });
        handle.root.id = 'ssc-ensure-movability';
        const dialog = handle.root.querySelector('.dialog');
        if (dialog) {
            dialog.insertBefore(el('div', 'spinner'), dialog.firstChild);
        }
        this.ensureMovabilityHandle = handle;
    }
    // ------------------------------------------------------------------ colours
    /** `GameManager.loadBackgroundColor()`. */
    loadBackgroundColor() {
        if (shared.prefs.getSavedBackgroundColorType() === 1) {
            const gradient = resolveFeltGradient(shared.prefs.getSavedBackgroundColor(), shared.prefs.getSavedNightMode());
            if (gradient) {
                this.background.style.background = `linear-gradient(to bottom, ${gradient[0]}, ${gradient[1]} 50%, ${gradient[2]})`;
                return;
            }
        }
        const custom = shared.prefs.getSavedBackgroundCustomColor();
        this.background.style.background = argbToCss(custom);
    }
    applyCssTextColor() {
        const nightMode = shared.prefs.getSavedNightMode();
        this.root.style.setProperty('--ui-text-color', resolveUiTextColor(shared.prefs.getSavedTextColor(), nightMode));
    }
    // -------------------------------------------------------------------- chips
    updateScore(score, dollar) {
        this.scoreValue.textContent = `${strings.game_score}: ${score}${dollar ? ` ${dollar}` : ''}`;
    }
    updateNumberOfRecycles() {
        if (shared.stopUiUpdates) {
            return;
        }
        this.recyclesBadge.textContent = String(shared.currentGame.getRemainingNumberOfRecycles());
    }
    /** `GameManager.updateLimitedRecyclesCounter()`. */
    updateLimitedRecyclesCounter() {
        if (shared.currentGame.hasLimitedRecycles() && !shared.currentGame.hidesRecycleCounter()) {
            const mainStack = shared.currentGame.getMainStack();
            this.recyclesBadge.style.display = 'flex';
            this.recyclesBadge.style.left = `${mainStack.getX()}px`;
            this.recyclesBadge.style.top = `${mainStack.getY()}px`;
        }
        else {
            this.recyclesBadge.style.display = 'none';
        }
        this.updateNumberOfRecycles();
    }
    setAutoCompleteButtonVisible(visible, withoutMovement) {
        if (visible) {
            if (!withoutMovement) {
                shared.sounds.playSound(Sounds.Names.SHOW_AUTOCOMPLETE);
            }
            this.autoCompleteButton.classList.add('is-visible');
        }
        else {
            this.autoCompleteButton.classList.remove('is-visible');
        }
    }
    // ------------------------------------------------------------------- input
    attachInput() {
        this.canvas.addEventListener('pointerdown', (event) => this.onTouch(event));
        this.canvas.addEventListener('pointermove', (event) => this.onTouch(event));
        this.canvas.addEventListener('pointerup', (event) => this.onTouch(event));
        this.canvas.addEventListener('pointercancel', (event) => this.onTouch(event));
        this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        // Chrome buttons stop propagation so the board does not see them.
        this.chromeBar.addEventListener('pointerdown', (event) => event.stopPropagation());
        this.menuBar.addEventListener('pointerdown', (event) => event.stopPropagation());
        /*
         * Browsers refuse to start audio until the page has been interacted with, so the
         * sound pool is unlocked from the first real gesture. `attachInput()` runs from the
         * constructor — i.e. on load, before any gesture — and calling `unlock()` there
         * meant six promises rejected at once and `unlocked` latched true anyway, so the
         * pool stayed locked and the first sounds of the session were silent.
         */
        const unlock = () => {
            shared.sounds.unlock();
            globalThis.removeEventListener('pointerdown', unlock, true);
            globalThis.removeEventListener('keydown', unlock, true);
        };
        globalThis.addEventListener('pointerdown', unlock, true);
        globalThis.addEventListener('keydown', unlock, true);
    }
    /**
   * The grab offset `MovingCards` needs, in the coordinate space of the card being picked up.
   *
   * PORT NOTE (not a behavioural divergence — a translation of `event.getX()`).
   * In the Android app every card is its own `CustomImageView` and the touch listener is
   * attached to that view, so `event.getX()` in `motionActionDown()` is *already* relative
   * to the card:
   *
   *     CustomImageView v = (CustomImageView) view;      // v IS the card's view
   *     float X = event.getX() + v.getX(), Y = event.getY() + v.getY();
   *     ...
   *     movingCards.add(tapped.getCard(), event.getX(), event.getY());
   *
   * The PWA has a single listener on the canvas, so the same quantity has to be derived:
   * the pointer position `X`/`Y` is canvas-relative, and the card's own position is
   * `card.getX()`, so `X - card.getX()` is the offset inside the card. Passing
   * `event.offsetX` (canvas-relative) instead broke two things at once: `didMoveStart()`
   * no longer collapses to zero, so it reported a movement on the very first stationary tap
   * and dragged every plain tap into the drop branch — which is what stopped tap-to-select
   * from ever engaging — and `move()` then placed the card at `X - canvasOffset`, so the
   * card jumped out from under the finger.
   *
   * `card.getX()` is whatever the card's current position is, including a mirrored one, so
   * left-handed mode needs no special case: the offset is derived after the flip.
   */
    grabOffset(card, X, Y) {
        return { x: X - card.getX(), y: Y - card.getY() };
    }
    /** `GameManager.onTouch(View, MotionEvent)`. */
    onTouch(event) {
        // a held card is always let go, even if an animation started during the drag
        const releasing = (event.type === 'pointerup' || event.type === 'pointercancel') && shared.movingCards.hasCards();
        // if something important happens don't accept input
        if (!releasing && (shared.gameLogic.stopConditions() || shared.gameLogic.hasWon())) {
            return;
        }
        // also don't do anything with a second touch point
        if (!event.isPrimary && shared.movingCards.hasCards()) {
            shared.movingCards.returnToPos();
            this.resetTappedCard();
            this.releasePointer(event);
            return;
        }
        // Re-read on down: a cached rect goes stale when the mobile chrome bar
        // collapses without a resize we already listened for.
        if (event.type === 'pointerdown' || !this.canvasRect) {
            this.canvasRect = this.canvas.getBoundingClientRect();
        }
        const rect = this.canvasRect;
        const X = event.clientX - rect.left;
        const Y = event.clientY - rect.top;
        if (event.type === 'pointerdown') {
            if (shared.movingCards.hasCards()) {
                shared.movingCards.returnToPos();
                this.resetTappedCard();
            }
            this.motionActionDown(X, Y);
            // Keep move/up even when the finger leaves the canvas. Without capture a drag
            // off the board lost pointermove and left the card stuck under the pointer.
            if (shared.movingCards.hasCards() && event.pointerId != null) {
                event.preventDefault();
                try {
                    this.canvas.setPointerCapture(event.pointerId);
                    this.capturedPointerId = event.pointerId;
                }
                catch {
                    /* setPointerCapture can throw if the pointer is already gone */
                }
            }
        }
        else if (event.type === 'pointermove') {
            if (shared.movingCards.hasCards() && shared.movingCards.moveStarted(X, Y)) {
                event.preventDefault();
                shared.movingCards.move(X, Y);
                if (this.tapped !== null) {
                    this.highlight.move(this.tapped.card);
                }
            }
        }
        else if (event.type === 'pointerup') {
            if (shared.movingCards.hasCards()) {
                this.motionActionUp(X, Y);
            }
            this.releasePointer(event);
        }
        else if (event.type === 'pointercancel') {
            if (shared.movingCards.hasCards()) {
                shared.movingCards.returnToPos();
                this.resetTappedCard();
            }
            this.releasePointer(event);
        }
    }
    releasePointer(event) {
        const id = event?.pointerId ?? this.capturedPointerId;
        if (id == null) {
            this.capturedPointerId = null;
            return;
        }
        try {
            if (this.canvas.hasPointerCapture?.(id)) {
                this.canvas.releasePointerCapture(id);
            }
        }
        catch {
            /* already released */
        }
        this.capturedPointerId = null;
    }
    /**
     * Contains the code for double tap and tap-to-select movements.
     * Port of `GameManager.motionActionDown(...)`.
     */
    motionActionDown(X, Y) {
        // if the main stack got touched
        if (shared.currentGame.hasMainStack() && shared.currentGame.testIfMainStackTouched(X, Y)) {
            // if no card could be moved, do nothing
            if (shared.currentGame.mainStackTouch() === 0) {
                return;
            }
            shared.gameLogic.checkForAutoCompleteButton(false);
            this.handlerTestAfterMove.sendDelayed();
            this.resetTappedCard();
            return;
        }
        const card = this.cardAt(X, Y);
        // tapping an empty stack area completes a tap-to-select move
        if (card === null) {
            const stack = this.stackAt(X, Y);
            if (stack !== null && shared.prefs.getSavedTapToSelectEnabled() && this.tapped !== null) {
                if (this.tapped.stack !== stack && shared.currentGame.addCardToMovementTest(this.tapped.card)) {
                    // The offset belongs to the *tapped* card, not to whatever empty stack area the
                    // second tap landed on.
                    const grab = this.grabOffset(this.tapped.card, X, Y);
                    shared.movingCards.add(this.tapped.card, grab.x, grab.y);
                    if (this.tapped.card.test(stack)) {
                        shared.movingCards.moveToDestination(stack);
                    }
                    else {
                        shared.movingCards.reset();
                    }
                }
            }
            this.resetTappedCard();
            return;
        }
        if (!card.isUp()) {
            return;
        }
        if (this.tapped !== null) {
            // double tap
            if (shared.prefs.getSavedDoubleTapEnabled() &&
                this.tapped.stack === card.getStack() &&
                Date.now() - this.firstTapTime < DOUBLE_TAP_SPEED) {
                const result = this.doubleTapCalculation(X, Y);
                // do not return early: addCardToMovementTest() needs to run in case the
                // calculation returns false
                if (result) {
                    return;
                }
            }
            // tap to select
            else if (shared.prefs.getSavedTapToSelectEnabled() &&
                this.tapped.stack !== card.getStack() &&
                shared.currentGame.addCardToMovementTest(this.tapped.card)) {
                // Again the previously tapped card is the one being added, even though X/Y are
                // the coordinates of this second tap.
                const grab = this.grabOffset(this.tapped.card, X, Y);
                shared.movingCards.add(this.tapped.card, grab.x, grab.y);
                if (this.tapped.card.test(card.getStack())) {
                    shared.movingCards.moveToDestination(card.getStack());
                    this.resetTappedCard();
                    return;
                }
                shared.movingCards.reset();
            }
        }
        if (shared.currentGame.addCardToMovementTest(card)) {
            this.tapped = { card, stack: card.getStack() };
            this.firstTapTime = Date.now();
            // The drag-setup path: the pointer is on `card` right now, so this is exactly
            // Android's `event.getX()`.
            const grab = this.grabOffset(card, X, Y);
            shared.movingCards.add(this.tapped.card, grab.x, grab.y);
            this.highlight.set(card);
        }
    }
    /**
   * Port of `GameManager.doubleTapCalculation(float X, float Y)`.
   *
   * `X`/`Y` are the canvas-relative pointer position of the double tap, matching the two
   * arguments Java passes in.
   */
    doubleTapCalculation(X, Y) {
        const tapped = this.tapped;
        if (tapped === null) {
            return false;
        }
        let cardAndStack = null;
        if (shared.prefs.getSavedDoubleTapAllCards() &&
            tapped.stack.getId() <= shared.currentGame.getLastTableauId()) {
            if (shared.prefs.getSavedDoubleTapFoundationFirst() && shared.currentGame.hasFoundationStacks()) {
                cardAndStack = shared.currentGame.doubleTap(tapped.stack.getTopCard());
            }
            if (cardAndStack === null || cardAndStack.stack.getId() <= shared.currentGame.getLastTableauStack().getId()) {
                cardAndStack = shared.currentGame.doubleTapStack(tapped.stack);
            }
        }
        else if (shared.currentGame.addCardToMovementTest(tapped.card)) {
            cardAndStack = shared.currentGame.doubleTap(tapped.card);
        }
        if (cardAndStack !== null) {
            shared.movingCards.reset();
            // `cardAndStack.card` can differ from the tapped card (double-tap picks the stack's
            // top card), so derive the offset from the card actually being added.
            const grab = this.grabOffset(cardAndStack.card, X, Y);
            shared.movingCards.add(cardAndStack.card, grab.x, grab.y);
            shared.movingCards.moveToDestination(cardAndStack.stack);
            this.resetTappedCard();
            return true;
        }
        return false;
    }
    /** Port of `GameManager.motionActionUp(...)`. */
    motionActionUp(X, Y) {
        if (shared.movingCards.moveStarted(X, Y)) {
            this.highlight.hide();
            const stack = this.getIntersectingStack(shared.movingCards.first());
            if (stack !== null) {
                // card.test() was already called in getIntersectingStack()
                shared.movingCards.moveToDestination(stack);
            }
            else {
                shared.movingCards.returnToPos();
            }
            this.resetTappedCard();
            return;
        }
        const tapped = this.tapped;
        if (tapped !== null) {
            if (shared.prefs.getSingleTapAllGames()) {
                const result = this.doubleTapCalculation(X, Y);
                // do not return early: movingCards.returnToPos() needs to run in case the
                // calculation returns false
                if (result) {
                    return;
                }
            }
            else if (shared.currentGame.isSingleTapEnabled() &&
                tapped.card.test(shared.currentGame.getDiscardStack())) {
                shared.movingCards.moveToDestination(shared.currentGame.getDiscardStack());
                this.resetTappedCard();
                return;
            }
        }
        shared.movingCards.returnToPos();
    }
    /**
     * Uses the rectangles of the card and the stacks to determine if they intersect and if
     * the card can be placed on that stack. Port of `GameManager.getIntersectingStack(Card)`.
     */
    getIntersectingStack(card) {
        const cardRect = {
            left: card.getX(),
            top: card.getY(),
            right: card.getX() + Card.width,
            bottom: card.getY() + Card.height,
        };
        let returnStack = null;
        let overlapArea = 0;
        for (const stack of shared.stacks) {
            if (card.getStack() === stack) {
                continue;
            }
            const stackRect = stack.getRect();
            if (cardRect.right < stackRect.left ||
                cardRect.left > stackRect.right ||
                cardRect.bottom < stackRect.top ||
                cardRect.top > stackRect.bottom) {
                continue;
            }
            const overlapX = Math.max(0, Math.min(cardRect.right, stackRect.right) - Math.max(cardRect.left, stackRect.left));
            const overlapY = Math.max(0, Math.min(cardRect.bottom, stackRect.bottom) - Math.max(cardRect.top, stackRect.top));
            if (overlapX * overlapY > overlapArea && card.test(stack)) {
                overlapArea = overlapX * overlapY;
                returnStack = stack;
            }
        }
        return returnStack;
    }
    /** Topmost card under the touch point, or null. */
    cardAt(X, Y) {
        const cards = shared.cards.slice().sort((a, b) => b.z - a.z);
        for (const card of cards) {
            if (card.invisible || card.renderHidden) {
                continue;
            }
            if (X >= card.getX() &&
                X <= card.getX() + Card.width &&
                Y >= card.getY() &&
                Y <= card.getY() + Card.height) {
                return card;
            }
        }
        return null;
    }
    /** Stack under the touch point, for tap-to-select onto an empty stack. */
    stackAt(X, Y) {
        for (const stack of shared.stacks) {
            if (stack.isOnLocation(X, Y)) {
                return stack;
            }
        }
        return null;
    }
    resetTappedCard() {
        this.tapped = null;
        this.highlight.hide();
    }
    // -------------------------------------------------------------- render loop
    /**
     * The board is repainted every frame.
     *
     * On Android each `ImageView` invalidates itself, so the RelativeLayout is always in sync.
     * A canvas has no such per-view invalidation, so the equivalent is a continuous loop —
     * `Animate` is externally driven from here. Layout size is measured on resize only;
     * reading `getBoundingClientRect` every frame was pure thrash on a still board.
     */
    canvasRect = null;
    capturedPointerId = null;
    startRenderLoop() {
        this.bindCanvasResize();
        this.measureCanvas();
        const loop = () => {
            this.rafId = globalThis.requestAnimationFrame(loop);
            shared.animate.step();
            this.draw();
        };
        this.rafId = globalThis.requestAnimationFrame(loop);
    }
    _layoutRaf = null;
    bindCanvasResize() {
        if (this._resizeBound) {
            return;
        }
        this._resizeBound = true;
        // Full layout, not measure-only: measureCanvas alone resizes the bitmap while
        // stacks still sit at the old playfield size (stretched cards / cards under chrome).
        this._onCanvasResize = () => this.scheduleLayout();
        window.addEventListener('resize', this._onCanvasResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this._onCanvasResize);
        }
    }
    unbindCanvasResize() {
        if (!this._resizeBound || !this._onCanvasResize) {
            return;
        }
        window.removeEventListener('resize', this._onCanvasResize);
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this._onCanvasResize);
        }
        this._onCanvasResize = null;
        this._resizeBound = false;
        if (this._layoutRaf !== null) {
            globalThis.cancelAnimationFrame(this._layoutRaf);
            this._layoutRaf = null;
        }
    }
    scheduleLayout() {
        if (this._layoutRaf !== null || this.destroyed || this.activityPaused) {
            return;
        }
        this._layoutRaf = globalThis.requestAnimationFrame(() => {
            this._layoutRaf = null;
            if (!this.destroyed && !this.activityPaused) {
                this.updateGameLayout();
            }
        });
    }
    measureCanvas() {
        this.canvasRect = this.canvas.getBoundingClientRect();
        const rect = this.canvasRect;
        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        if (Math.abs(this.renderer.getWidth() - rect.width) > 0.5 ||
            Math.abs(this.renderer.getHeight() - rect.height) > 0.5) {
            this.renderer.resize(rect.width, rect.height, dpr);
        }
        // Keep tween bounds on the same box the stacks were laid into.
        shared.animate.layoutWidth = this.layout.width;
        shared.animate.layoutHeight = this.layout.height;
    }
    draw() {
        // Parent-shell fullscreen often resizes the iframe without a reliable child
        // `resize` — catch CSS box drift here (one clientWidth read per frame).
        const cssW = this.canvas.clientWidth;
        const cssH = this.canvas.clientHeight;
        if (!this.canvasRect ||
            cssW <= 0 ||
            Math.abs(this.canvasRect.width - cssW) > 1 ||
            Math.abs(this.canvasRect.height - cssH) > 1) {
            this.updateGameLayout();
            if (!this.canvasRect || this.canvasRect.width <= 0) {
                return;
            }
        }
        const nightMode = shared.prefs.getSavedNightMode();
        this.renderer.draw({
            textColor: resolveUiTextColor(shared.prefs.getSavedTextColor(), nightMode),
            chipTextColor: resolveIsDark(nightMode) ? '#F2F4F5' : '#455A64',
        }, this.highlight.state);
    }
    post(fn, delayMs) {
        const id = globalThis.setTimeout(() => {
            this.pendingTimers = this.pendingTimers.filter((t) => t !== id);
            if (!this.destroyed) {
                fn();
            }
        }, delayMs);
        this.pendingTimers.push(id);
        return id;
    }
    cancelPending() {
        for (const id of this.pendingTimers) {
            globalThis.clearTimeout(id);
        }
        this.pendingTimers = [];
    }
    postToFrame(fn) {
        globalThis.requestAnimationFrame(() => {
            if (!this.destroyed) {
                fn();
            }
        });
    }
    /** Called by the shell after a settings change that affects the board. */
    onSettingsChanged() {
        this.measureSafeArea();
        this.applyLayout();
        this.updateMenuBar();
        this.loadBackgroundColor();
        this.applyCssTextColor();
        setVisible(this.scoreChip, !shared.prefs.getSavedHideScore());
        setVisible(this.timeChip, !shared.prefs.getSavedHideTime());
    }
}
function readSafeArea() {
    const result = { top: 0, bottom: 0, left: 0, right: 0 };
    if (typeof document === 'undefined' || document.body === null) {
        return result;
    }
    const probe = document.createElement('div');
    probe.style.cssText =
        'position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;' +
            'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);' +
            'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);';
    document.body.appendChild(probe);
    const styles = getComputedStyle(probe);
    for (const side of ['top', 'bottom', 'left', 'right']) {
        const value = Number.parseInt(styles.getPropertyValue(`padding-${side}`), 10);
        result[side] = Number.isFinite(value) ? value : 0;
    }
    probe.remove();
    return result;
}
