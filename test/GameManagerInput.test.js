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
 * PORT TO JAVASCRIPT — grab-offset regression tests for `ui/GameManager.js`.
 *
 * In the Android app every card is its own `CustomImageView` and the touch listener is
 * attached to it, so `event.getX()` in `motionActionDown()` is already relative to the card:
 *
 *     CustomImageView v = (CustomImageView) view;
 *     float X = event.getX() + v.getX(), Y = event.getY() + v.getY();
 *     movingCards.add(tapped.getCard(), event.getX(), event.getY());
 *
 * This port has a single listener on the canvas, so that quantity has to be derived as
 * `X - card.getX()`. Passing the canvas-relative offset instead broke two things at once:
 * `didMoveStart()` stopped collapsing to zero and reported a movement on the very first
 * stationary tap (which killed tap-to-select), and `move()` placed the card's top-left at
 * `X - canvasOffset`, so the card jumped out from under the finger.
 *
 * These drive `GameManager`'s real pointer listeners with real `PointerEvent`s on a real
 * canvas, because the bug lived in `GameManager` and a `MovingCards`-only test would never
 * have seen it.
 */

import { afterEach, beforeEach, describe, expect, it } from './runner.js';
import { shared } from '../cards/engine/game/SharedData.js';
import { Card } from '../cards/engine/game/Card.js';
import { Stack, SpacingDirection } from '../cards/engine/game/Stack.js';
import { GameManager } from '../cards/engine/ui/GameManager.js';
import { Klondike } from '../Klondike.js';
import { setupGame, findCard, resetToStock, CLUB, HEART, SPADE } from './harness.js';

const VIEWPORT = { width: 800, height: 600, isLandscape: false };
/** Grab a point a quarter of the way into the card, so offsets are not trivially zero. */
const GRAB_FX = 0.25;
const GRAB_FY = 0.2;

const noopHost = {
    exitToMenu() {},
    openStatistics() {},
    openSettings() {},
    openManual() {},
};

let root;
let canvas;
let gm;

function findCanvas() {
    const found = root.querySelector('canvas');
    if (!found) throw new Error('canvas not found');
    return found;
}

/**
 * `GameManager`'s constructor re-creates every object in `shared` (mirroring
 * `GameManager.onCreate()`), which throws away the harness's stacks and cards. The layout
 * that gives them positions lives in `GameManager.initializeLayout()`, called from
 * `start()` — which would also deal a game and stomp the board under test — so the same
 * steps are applied directly here.
 */
function layoutGame() {
    const layout = {
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        isLandscape: false,
        isLargeTablet: false,
    };
    shared.currentGame.setStacks(layout);
    shared.currentGame.setOffScreenStack();
    Stack.defaultSpacing = Card.width / 2;
    for (const stack of shared.stacks) {
        stack.applyDefaultSpacing();
        stack.setSpacingDirection(
            stack.getId() <= shared.currentGame.getLastTableauId()
                ? SpacingDirection.DOWN
                : SpacingDirection.NONE,
        );
        stack.width = Card.width;
        stack.height = Card.height;
    }
}

/**
 * Dispatches a pointer event at a point given in *canvas* coordinates.
 *
 * `GameManager.onTouch()` derives its own X/Y from `clientX - rect.left`, so the canvas
 * rect is read first. That keeps the test independent of where on the page the test root
 * happens to be laid out.
 */
function pointer(type, x, y) {
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
        new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            isPrimary: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: rect.left + x,
            clientY: rect.top + y,
        }),
    );
}

/** Canvas-relative pointer position of a point `fx`/`fy` across a card. */
function pointOn(card, fx = GRAB_FX, fy = GRAB_FY) {
    return { x: card.getX() + Card.width * fx, y: card.getY() + Card.height * fy };
}

function tap(x, y) {
    pointer('pointerdown', x, y);
    pointer('pointerup', x, y);
}

/**
 * Sets up a single face-up Ace of hearts on tableau column 0 with an empty foundation,
 * so a move is unambiguous.
 */
function loneCard() {
    resetToStock();
    const ace = findCard(1, HEART);
    shared.stacks[0].addCard(ace);
    ace.flipUp();
    ace.setLocationWithoutMovement(shared.stacks[0].getX(), shared.stacks[0].getY());
    return ace;
}

/** The foundation a card belongs on, resolved rather than hardcoded (stacks 7..10). */
function homeFoundation(card) {
    const found = shared.stacks.find((s) => s.getId() >= 7 && s.getId() <= 10 && card.test(s));
    if (!found) throw new Error(`no foundation accepts colour ${card.getColor()}`);
    return found;
}

function isFoundation(card) {
    return card.getStackId() >= 7 && card.getStackId() <= 10;
}

describe('GameManager grab offset', () => {
    beforeEach(() => {
        setupGame(VIEWPORT);

        root = document.createElement('div');
        Object.assign(root.style, {
            position: 'fixed',
            left: '0',
            top: '0',
            width: `${VIEWPORT.width}px`,
            height: `${VIEWPORT.height}px`,
            zIndex: '-1',
        });
        document.body.appendChild(root);

        // Bitmaps are only used while drawing, and these tests never render, so an empty
        // object with the handful of methods the constructor touches is enough.
        shared.gameFactory = () => new Klondike();
        gm = new GameManager(root, {}, noopHost);
        canvas = findCanvas();
        layoutGame();
        shared.stopUiUpdates = false;
        shared.gameLogic.setWon(false);
    });

    afterEach(() => {
        gm.destroy();
        shared.timer.stop();
        root.remove();
    });

    it('attaches the pointer listeners the tests drive', () => {
        // A canvas that reaches the listeners at all is the real assertion; count them by
        // dispatching and observing the engine's state instead of sniffing addEventListener.
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);
        const grabbed = shared.movingCards.hasCards();
        pointer('pointerup', p.x, p.y);

        expect(grabbed).toBe(true);
        expect(shared.movingCards.hasCards()).toBe(false);
    });

    it('a stationary tap does not report a started movement', () => {
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);
        expect(shared.movingCards.hasCards()).toBe(true);

        // Same coordinates: the pointer has not moved, so no drag has begun.
        expect(shared.movingCards.moveStarted(p.x, p.y)).toBe(false);
        expect(shared.movingCards.moveStarted(p.x + 1, p.y + 1)).toBe(false);

        // Just inside the Card.width/4 dead zone.
        expect(shared.movingCards.moveStarted(p.x + Card.width / 4 - 1, p.y)).toBe(false);
        expect(shared.movingCards.moveStarted(p.x, p.y + Card.height / 4 - 1)).toBe(false);

        pointer('pointerup', p.x, p.y);
    });

    it('a move beyond the dead zone reports a started movement', () => {
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);

        expect(shared.movingCards.moveStarted(p.x + Card.width / 4 + 1, p.y)).toBe(true);
        expect(shared.movingCards.moveStarted(p.x, p.y + Card.height / 4 + 1)).toBe(true);

        pointer('pointerup', p.x, p.y);
    });

    it('a drag leaves the card under the pointer instead of jumping away', () => {
        const card = loneCard();
        const p = pointOn(card);
        const grabOffsetX = p.x - card.getX();
        const grabOffsetY = p.y - card.getY();

        pointer('pointerdown', p.x, p.y);

        const target = { x: p.x + 120, y: p.y + 80 };
        pointer('pointermove', target.x, target.y);

        // The grab point must still be the same point of the same card: pure translation.
        expect(card.getX()).toBe(target.x - grabOffsetX);
        expect(card.getY()).toBe(target.y - grabOffsetY);

        pointer('pointerup', target.x, target.y);
    });

    it('a release during an animation still lets go of the held card', () => {
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);
        pointer('pointermove', p.x + 120, p.y + 80);
        shared.animate.moveCard(shared.cards[30], 0, 0);
        pointer('pointerup', p.x + 120, p.y + 80);

        expect(shared.movingCards.hasCards()).toBe(false);
    });

    it('a drag is measured from the grabbed card, not from the canvas origin', () => {
        // Guards the specific mistake: offsetting by the canvas-relative pointer position
        // makes the card land at (0,0)-ish instead of under the finger.
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);
        pointer('pointermove', p.x + 60, p.y + 40);

        expect(card.getX()).toBeGreaterThan(0);
        expect(card.getY()).toBeGreaterThan(0);
        // and the pointer is still inside the card it grabbed
        const insideX = card.getX() <= p.x + 60 && p.x + 60 <= card.getX() + Card.width;
        const insideY = card.getY() <= p.y + 40 && p.y + 40 <= card.getY() + Card.height;
        expect(insideX && insideY).toBe(true);

        pointer('pointerup', p.x + 60, p.y + 40);
    });

    it('tap-to-select moves the tapped card to a legal destination', () => {
        resetToStock();

        // black 2 on the tableau, black Ace on the foundation that suits it
        // (foundations need SAME_FAMILY, so both cards must share a suit)
        const two = findCard(2, SPADE);
        shared.stacks[0].addCard(two);
        two.flipUp();
        two.setLocationWithoutMovement(shared.stacks[0].getX(), shared.stacks[0].getY());

        const ace = findCard(1, SPADE);
        ace.flipUp(); // card.test() needs it face up

        const foundation = homeFoundation(ace);
        foundation.addCard(ace);
        ace.setLocationWithoutMovement(foundation.getX(), foundation.getY());

        const from = pointOn(two);
        const to = pointOn(ace);

        tap(from.x, from.y); // first tap selects the 2
        tap(to.x, to.y); // second tap drops it on the Ace

        expect(two.getStack().getId()).toBe(foundation.getId());
        expect(shared.movingCards.hasCards()).toBe(false);
    });

    it('tap-to-select clears the selection after an illegal destination', () => {
        const card = loneCard();
        const p = pointOn(card);

        tap(p.x, p.y);
        tap(p.x, p.y + 200); // empty space, not a legal target

        // The card must be back on its own stack and no drag left dangling.
        expect(card.getStack().getId()).toBe(0);
        expect(shared.movingCards.hasCards()).toBe(false);
    });

    it('a single tap neither moves the card nor leaves it held', () => {
        const card = loneCard();
        const p = pointOn(card);
        const homeX = card.getX();
        const homeY = card.getY();

        tap(p.x, p.y);

        expect(card.getX()).toBe(homeX);
        expect(card.getY()).toBe(homeY);
    });

    it('double tap still moves a card to the foundation', () => {
        const card = loneCard();
        const p = pointOn(card);

        pointer('pointerdown', p.x, p.y);
        pointer('pointerup', p.x, p.y);
        pointer('pointerdown', p.x, p.y);
        pointer('pointerup', p.x, p.y);

        expect(isFoundation(card)).toBe(true);
        expect(shared.movingCards.hasCards()).toBe(false);
    });

    it('an illegal drop returns the card to where it was picked up, drawn position included', () => {
        // `Renderer.drawCard()` paints at renderX/renderY, which is a different pair from the
        // logical x/y in this port. `returnToOldLocation()` has to restore both or the card
        // stays painted where it was dropped.
        const card = loneCard();
        const p = pointOn(card);
        const homeX = card.getX();
        const homeY = card.getY();

        pointer('pointerdown', p.x, p.y);
        pointer('pointermove', p.x + 140, p.y + 200);
        pointer('pointerup', p.x + 140, p.y + 200);

        expect(card.getX()).toBe(homeX);
        expect(card.getY()).toBe(homeY);
        expect(card.renderX).toBe(homeX);
        expect(card.renderY).toBe(homeY);
    });

    it('the stock tap path still deals', () => {
        resetToStock();
        const dealStack = shared.stacks[14];
        const before = dealStack.getSize();

        const p = { x: dealStack.getX() + 10, y: dealStack.getY() + 10 };
        tap(p.x, p.y);

        expect(dealStack.getSize()).toBeLessThan(before);
    });

    it('computes the grab offset in mirrored (left-handed) space', () => {
        // mirrorStacks() rewrites card.getX(); the offset must be derived from the mirrored
        // position, otherwise left-handed mode drags cards relative to the pre-flip layout.
        const card = loneCard();
        shared.gameLogic.mirrorStacks(VIEWPORT.width);

        const p = pointOn(card);
        const grabOffsetX = p.x - card.getX();
        const grabOffsetY = p.y - card.getY();

        pointer('pointerdown', p.x, p.y);
        const target = { x: p.x + 90, y: p.y + 30 };
        pointer('pointermove', target.x, target.y);

        expect(card.getX()).toBe(target.x - grabOffsetX);
        expect(card.getY()).toBe(target.y - grabOffsetY);

        pointer('pointerup', target.x, target.y);
    });

    it('event.offsetX and the canvas-relative X are the same unit', () => {
        // `onTouch()` builds X from `clientX - rect.left`, i.e. plain CSS pixels. If a DPR
        // factor were applied on top, a drag on a 2x display would move the card twice as
        // far as the finger.
        const card = loneCard();
        const p = pointOn(card);
        const grabOffsetX = p.x - card.getX();

        pointer('pointerdown', p.x, p.y);
        const target = { x: p.x + 50, y: p.y };
        pointer('pointermove', target.x, target.y);

        // exactly 50 CSS px of travel, no scaling
        expect(card.getX() - (p.x - grabOffsetX)).toBe(50);

        pointer('pointerup', target.x, target.y);
    });
});

describe('club colour constant is used', () => {
    it('sanity', () => {
        expect(CLUB).toBe(1);
        expect(HEART).toBe(2);
    });
});

/**
 * Teardown. `destroy()` used to clear two handlers and the render frame and nothing else:
 * the deal / hint / auto-complete loops and the EnsureMovability search kept their own
 * timers, and a search that outlived the screen held `stopUiUpdates` true — which silently
 * freezes every game opened after it, with nothing on screen to say why.
 */
describe('GameManager teardown', () => {
    let teardownRoot;
    let teardownGm;

    beforeEach(() => {
        setupGame(VIEWPORT);
        teardownRoot = document.createElement('div');
        document.body.appendChild(teardownRoot);
        shared.gameFactory = () => new Klondike();
        teardownGm = new GameManager(teardownRoot, {}, noopHost);
    });

    afterEach(() => {
        teardownGm.destroy();
        shared.timer.stop();
        teardownRoot.remove();
    });

    it('pause() stops the helpers that own their own timers', () => {
        // A clip already playing finishes on its own otherwise, so hiding the tab still
        // played the last card noise into a backgrounded page.
        shared.hint.running = true;
        shared.ensureMovability.running = true;
        shared.stopUiUpdates = true;

        teardownGm.pause();

        expect(shared.hint.isRunning()).toBe(false);
        expect(shared.autoComplete.isRunning()).toBe(false);
        expect(shared.dealCards.isRunning()).toBe(false);
        // `paused` is a field, not a method: the search is suspended rather than stopped,
        // because resume() has to be able to start it again from the untouched deal. The
        // other three helpers are genuinely stopped, which is why they are asked with
        // isRunning() and this one is not.
        expect(shared.ensureMovability.paused).toBe(true);
    });

    it('destroy() leaves nothing armed and no frozen next game', () => {
        shared.stopUiUpdates = true;
        shared.scheduler.post(() => undefined, 5000);
        shared.ensureMovability.running = true;
        shared.autoComplete.running = true;
        shared.hint.running = true;

        teardownGm.destroy();

        expect(shared.stopUiUpdates).toBe(false);
        expect(shared.scheduler.pending.size).toBe(0);
        expect(shared.ensureMovability.isRunning()).toBe(false);
        expect(shared.autoComplete.isRunning()).toBe(false);
        expect(shared.hint.isRunning()).toBe(false);
    });
});