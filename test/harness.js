/*
 * Seclusa Games — card engine test harness.
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * Derived from `Solitaire/pwa/test/helpers/harness.ts`. Boots the ported engine headlessly
 * — no board, no bitmaps — the same way `GameManager.onCreate()` does for the Android app:
 * shared helpers first, then the stacks, then the 52 cards, then the layout.
 */

import { shared } from '../cards/engine/game/SharedData.js';
import { Klondike } from '../Klondike.js';
import { Preferences, resetAllPreferences } from '../cards/engine/game/Preferences.js';
import { Scheduler } from '../cards/engine/game/Scheduler.js';
import { GameLogic } from '../cards/engine/game/GameLogic.js';
import { Scores } from '../cards/engine/game/Scores.js';
import { RecordList } from '../cards/engine/game/RecordList.js';
import { MovingCards } from '../cards/engine/game/MovingCards.js';
import { Card } from '../cards/engine/game/Card.js';
import { Stack, SpacingDirection } from '../cards/engine/game/Stack.js';
import { Hint } from '../cards/engine/game/Hint.js';
import { AutoComplete } from '../cards/engine/game/AutoComplete.js';
import { Timer } from '../cards/engine/game/Timer.js';

function fakeAnimate() {
    return {
        layoutWidth: 400,
        layoutHeight: 800,
        moveCard(card, x, y) {
            card.x = x;
            card.y = y;
            card.renderX = x;
            card.renderY = y;
        },
        moveCardSlow(card, x, y) {
            card.x = x;
            card.y = y;
            card.renderX = x;
            card.renderY = y;
        },
        cardHint() {},
        flipCard(card, mode) {
            if (mode) card.flipUp();
            else card.flipDown();
        },
        cardIsAnimating() {
            return false;
        },
        reset() {},
        winAnimation() {},
        wonAnimationPhase2() {},
        updateMovementSpeed() {},
        onWinPhaseOneDone: null,
    };
}

function fakeSounds() {
    const played = [];
    return {
        played,
        playSound(name) {
            played.push(String(name));
        },
        playWinSound() {
            played.push('win');
        },
        unlock() {},
        silence() {},
    };
}

export const CLUB = 1;
export const HEART = 2;
export const SPADE = 3;
export const DIAMOND = 4;

export const VIEWPORT = { width: 400, height: 800, isLandscape: false };
export const WIDE = { width: 800, height: 400, isLandscape: true };

// The suites that construct a GameManager build a real `Sounds`, which resolves its files
// against `shared.assetBase`. Left at its './' default it would look for sounds under
// `test/` and log six CSP errors on every run; this points it at the real asset tree.
shared.assetBase = '../';

/**
 * Creates a fresh, fully wired game with no board and no bitmaps.
 *
 * @param {{width:number,height:number,isLandscape:boolean}} viewport
 * @param {{game?: string, keepPreferences?: boolean, deal?: boolean}} options
 */
export function setupGame(viewport = VIEWPORT, options = {}) {
    const gameId = options.game || 'Klondike';
    // Tests live in /test/, so the card art and clips are one level up.
    shared.assetBase = '../cards/';
    if (!options.keepPreferences) {
        resetAllPreferences();
    }
    Preferences.setGameId(gameId);

    // Order matters: `new Klondike()` allocates cards and stacks through shared.gameLogic,
    // which mirrors GameManager.onCreate() creating gameLogic before the game class.
    shared.prefs = new Preferences();
    shared.scheduler = new Scheduler();
    shared.gameLogic = new GameLogic();
    shared.currentGame = new Klondike();

    shared.scores = new Scores();
    shared.recordList = new RecordList(shared.scheduler);
    shared.timer = new Timer();
    shared.movingCards = new MovingCards();
    shared.hint = new Hint();
    shared.autoComplete = new AutoComplete();
    shared.animate = fakeAnimate();
    shared.sounds = fakeSounds();
    // Headless stand-ins for the helpers GameManager wires. `newGame()` → `redeal()` calls
    // `dealCards.start()` unless `stopUiUpdates` is set; Easy/Medium also call
    // `ensureMovability.start()`. Without these, any test that reaches those paths throws.
    shared.dealCards = {
        start() {
            shared.currentGame.dealNewGame();
        },
        stop() {},
        pause() {},
        resume() {},
    };
    shared.ensureMovability = {
        start() {},
        stop() {},
        pause() {},
        resume() {},
        isRunning() {
            return false;
        },
    };

    const posted = [];
    shared.uiHooks = {
        post(fn) {
            posted.push(fn);
        },
        cancelPending() {},
        toast() {},
        isPaused: () => false,
        showWonDialog() {},
        setAutoCompleteButtonVisible() {},
        setEnsureMovabilityDialog() {},
        updateLimitedRecyclesCounter() {},
    };

    // the game's stacks, plus the off-screen stack, exactly like GameManager.onCreate()
    shared.stacks = new Array(shared.stacks.length);
    for (let i = 0; i < shared.stacks.length; i++) {
        shared.stacks[i] = new Stack(i);
    }
    shared.currentGame.offScreenStack = new Stack(-1);
    shared.currentGame.offScreenStack.setSpacingDirection(SpacingDirection.NONE);
    shared.stacks.push(shared.currentGame.offScreenStack);

    shared.cards = new Array(52);
    for (let i = 0; i < shared.cards.length; i++) {
        shared.cards[i] = new Card(i);
    }

    layout(viewport);
    deal();

    return { posted, sounds: shared.sounds };
}

/** `GameManager.initializeLayout()` without the UI. */
export function layout(viewport) {
    shared.currentGame.setStacks(viewport);
    shared.currentGame.setOffScreenStack();

    Stack.defaultSpacing = Card.width / 2;
    for (const stack of shared.stacks) {
        stack.applyDefaultSpacing();
        if (stack.getId() <= shared.currentGame.getLastTableauId()) {
            stack.setSpacingDirection(SpacingDirection.DOWN);
        } else {
            stack.setSpacingDirection(SpacingDirection.NONE);
        }
        stack.width = Card.width;
        stack.height = Card.height;
    }
    shared.currentGame.applyDirectionBorders(viewport);
}

/** `GameLogic.newGame()` — shuffle and deal, without the deal animation. */
export function deal() {
    shared.stopUiUpdates = true;
    shared.cards.forEach((card, i) => {
        shared.gameLogic.randomCards[i] = card;
    });
    shared.gameLogic.randomize(shared.gameLogic.randomCards);
    shared.gameLogic.redealForEnsureMovability();
    shared.stopUiUpdates = false;
}

/** Finds the card with the given value (1..13) and colour (1..4). */
export function findCard(value, color) {
    const card = shared.cards.find((c) => c.getValue() === value && c.getColor() === color);
    if (!card) throw new Error(`No ${value} of colour ${color} in the deck`);
    return card;
}

/** Empties every stack and puts all 52 cards back on the stock (stack 14). */
export function resetToStock() {
    for (const stack of shared.stacks) {
        stack.reset();
    }
    for (const card of shared.cards) {
        shared.stacks[14].addCard(card);
        card.flipDown();
    }
}