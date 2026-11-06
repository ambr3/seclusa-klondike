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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Animate.java`,
 * plus the parts of `classes/CustomImageView.java` that mattered (the "move to the
 * pending destination when the animation ends / is stopped" behaviour).
 *
 * Durations are transcribed one-to-one from the Java:
 *   moveCard      : (long)(distance * 100 / Card.width / speedFactor)   ms
 *   moveCardSlow  : (long)(distance * 100 / Card.width)                ms
 *   cardHint      : (long)(distance * 100 / Card.width / speedFactor)   ms
 *   flip          : 100 ms shrink + 100 ms grow (card_to_middle / card_from_middle)
 *   hint fade out : 300 ms, hint fade in: 300 ms (card_fade_out / card_fade_in)
 *   win animation : phase 1 to the centre, handler, then phase 2 out of the screen
 */
import { shared } from '../game/SharedData.js';
import { Card } from '../game/Card.js';
/** Linear ease, which is what Android's default `TranslateAnimation` interpolator is. */
function ease(t) {
    return t;
}
/** `accelerate_interpolator`, used by the Android fade animations. */
function accelerate(t) {
    return t * t;
}
export class Animate {
    animations = new Map();
    speedFactor = 2;
    rafId = null;
    now;
    requestFrame;
    cancelFrame;
    winPhase = 1;
    /** Called after the win animation phase 1 finishes. */
    onWinPhaseOneDone = null;
    /** Playfield size, set by the renderer each frame. */
    layoutWidth = 0;
    layoutHeight = 0;
    constructor(requestFrame, cancelFrame, now = () => performance.now()) {
        this.requestFrame = requestFrame;
        this.cancelFrame = cancelFrame;
        this.now = now;
        this.updateMovementSpeed();
    }
    updateMovementSpeed() {
        this.speedFactor = shared.prefs.getSavedMovementSpeed();
    }
    /**
   * True once the owner has taken over the frame loop.
   *
   * `GameManager` calls `step()` from its own render loop so the tween and the repaint stay on
   * the same frame. When it has not (unit tests, a headless harness), the animation drives
   * itself through the injected `requestAnimationFrame`.
   */
    externallyDriven = false;
    setExternallyDriven(value) {
        this.externallyDriven = value;
    }
    ensureRunning() {
        if (this.externallyDriven) {
            return;
        }
        if (this.rafId === null) {
            this.rafId = this.requestFrame(() => this.step());
        }
    }
    /** Advances every running animation. Called by the render loop. */
    step() {
        this.rafId = null;
        const time = this.now();
        const finished = [];
        for (const [card, anim] of this.animations) {
            const elapsed = time - anim.startTime;
            const raw = anim.duration <= 0 ? 1 : Math.min(1, elapsed / anim.duration);
            switch (anim.phase) {
                case 'move':
                case 'win':
                case 'hint': {
                    const t = ease(raw);
                    card.renderX = anim.fromX + (anim.toX - anim.fromX) * t;
                    card.renderY = anim.fromY + (anim.toY - anim.fromY) * t;
                    if (raw >= 1) {
                        finished.push(card);
                    }
                    break;
                }
                case 'flip': {
                    // scaleX 1 -> 0 (or 0 -> 1) over 100 ms, then the other half
                    if (anim.flipMode) {
                        card.renderScaleX = raw < 0.5 ? 1 - raw * 2 : (raw - 0.5) * 2;
                    }
                    else {
                        card.renderScaleX = raw < 0.5 ? raw * 2 : 1 - (raw - 0.5) * 2;
                    }
                    if (raw >= 1) {
                        finished.push(card);
                    }
                    break;
                }
                case 'hintFade': {
                    const t = accelerate(raw);
                    card.renderAlpha = anim.flipMode === false ? 1 - t : t;
                    if (raw >= 1) {
                        finished.push(card);
                    }
                    break;
                }
            }
        }
        for (const card of finished) {
            const anim = this.animations.get(card);
            this.animations.delete(card);
            this.complete(card, anim);
        }
        if (this.animations.size > 0) {
            this.ensureRunning();
        }
    }
    /** True while at least one card is mid-move, flip or fade. */
    get busy() {
        return this.animations.size > 0;
    }
    /** Mirrors `CustomImageView.onAnimationEnd()`: snap to destination, restore defaults. */
    complete(card, anim) {
        switch (anim.phase) {
            case 'move':
            case 'win':
                card.x = anim.toX;
                card.y = anim.toY;
                card.renderX = anim.toX;
                card.renderY = anim.toY;
                break;
            case 'hint': {
                const stack = anim.hintStack;
                if (stack) {
                    const point = stack.getPosition(anim.hintOffset ?? 0);
                    card.x = point.x;
                    card.y = point.y;
                    card.renderX = point.x;
                    card.renderY = point.y;
                }
                // hideCard -> fade out, then showCard -> return to the old location and fade in
                this.startFade(card, false);
                break;
            }
            case 'hintFade':
                if (anim.flipMode === false) {
                    // end of fade-out: restore the old position and fade back in
                    card.renderHidden = true;
                    this.startFade(card, true);
                }
                else {
                    card.returnToOldLocation();
                    card.renderX = card.x;
                    card.renderY = card.y;
                    card.renderHidden = false;
                    card.renderAlpha = 1;
                }
                break;
            case 'flip':
                card.renderScaleX = 1;
                break;
        }
        anim.onDone?.();
    }
    /** `anim/card_fade_out.xml` and `anim/card_fade_in.xml` (300 ms, accelerate). */
    startFade(card, fadeIn) {
        const anim = {
            phase: 'hintFade',
            startTime: this.now(),
            duration: 300,
            fromX: card.renderX,
            fromY: card.renderY,
            toX: card.renderX,
            toY: card.renderY,
            flipMode: fadeIn,
        };
        card.renderHidden = false;
        card.renderAlpha = fadeIn ? 0 : 1;
        this.animations.set(card, anim);
        this.ensureRunning();
    }
    cardIsAnimating() {
        return this.animations.size > 0;
    }
    /** `Animate.reset()` / `CustomImageView.stopAnim()`. */
    reset() {
        for (const [card, anim] of this.animations) {
            if (anim.phase === 'move' || anim.phase === 'win' || anim.phase === 'hint') {
                card.x = anim.toX;
                card.y = anim.toY;
                card.renderX = anim.toX;
                card.renderY = anim.toY;
            }
            card.renderScaleX = 1;
            card.renderAlpha = 1;
        }
        this.animations.clear();
        if (this.rafId !== null) {
            this.cancelFrame(this.rafId);
            this.rafId = null;
        }
    }
    /** Stops everything immediately (activity teardown). */
    stopAll() {
        this.reset();
    }
    // ------------------------------------------------------------ card movements
    /** Port of `Animate.moveCard(Card, float, float)`. */
    moveCard(card, pX, pY) {
        const distance = Math.trunc(Math.sqrt(Math.pow(pX - card.x, 2) + Math.pow(pY - card.y, 2)));
        const duration = Math.max(1, Math.trunc((distance * 100) / Card.width / this.speedFactor));
        this.animations.set(card, {
            phase: 'move',
            startTime: this.now(),
            duration,
            fromX: card.x,
            fromY: card.y,
            toX: pX,
            toY: pY,
        });
        this.ensureRunning();
    }
    /**
     * Same as `moveCard` but without the user speed factor; used for the win animation.
     * Port of `Animate.moveCardSlow(Card, float, float)`.
     */
    moveCardSlow(card, pX, pY) {
        if (card.isInvisible()) {
            return;
        }
        const distance = Math.trunc(Math.sqrt(Math.pow(pX - card.x, 2) + Math.pow(pY - card.y, 2)));
        const duration = Math.max(1, Math.trunc((distance * 100) / Card.width));
        this.animations.set(card, {
            phase: 'win',
            startTime: this.now(),
            duration,
            fromX: card.x,
            fromY: card.y,
            toX: pX,
            toY: pY,
        });
        this.ensureRunning();
    }
    /**
     * Moves a card to another stack, fades the card out and fades it in on the origin as a hint.
     * Port of `Animate.cardHint(Card, int, Stack)`.
     */
    cardHint(card, offset, destination) {
        card.bringToFront();
        card.saveOldLocation();
        const pointAtStack = destination.getPosition(offset);
        const distX = pointAtStack.x - card.x;
        const distY = pointAtStack.y - card.y;
        const distance = Math.trunc(Math.sqrt(distX * distX + distY * distY));
        const duration = Math.max(1, Math.trunc((distance * 100) / Card.width / this.speedFactor));
        this.animations.set(card, {
            phase: 'hint',
            startTime: this.now(),
            duration,
            fromX: card.x,
            fromY: card.y,
            toX: pointAtStack.x,
            toY: pointAtStack.y,
            hintOffset: offset,
            hintStack: destination,
        });
        this.ensureRunning();
    }
    /** `animator/card_to_middle.xml` + `animator/card_from_middle.xml`, 100 ms each. */
    flipCard(card, mode) {
        this.animations.set(card, {
            phase: 'flip',
            startTime: this.now(),
            duration: 200,
            fromX: card.x,
            fromY: card.y,
            toX: card.x,
            toY: card.y,
            flipMode: mode,
        });
        this.ensureRunning();
    }
    // ------------------------------------------------------------ win animation
    /** Every card moves to the middle of the screen; the handler then runs phase 2. */
    winAnimation() {
        const posX = this.layoutWidth / 2 - Card.width / 2;
        const posY = this.layoutHeight / 2 - Card.height / 2;
        for (const card of shared.cards) {
            this.moveCardSlow(card, posX, posY);
        }
        shared.sounds.playWinSound();
        // Stand-in for `handlerAfterWon.sendDelayed()` — it polls until nothing animates.
        const wait = () => {
            if (this.cardIsAnimating()) {
                shared.scheduler.post(wait, 50);
                return;
            }
            this.winPhase = 2;
            this.wonAnimationPhase2();
            this.waitForPhaseTwo();
        };
        shared.scheduler.post(wait, 100);
    }
    waitForPhaseTwo() {
        const wait = () => {
            if (this.cardIsAnimating()) {
                shared.scheduler.post(wait, 50);
                return;
            }
            this.winPhase = 1;
            this.onWinPhaseOneDone?.();
        };
        shared.scheduler.post(wait, 100);
    }
    /**
     * Moves every card out of the screen as phase 2 of the win animation.
     * Port of `Animate.wonAnimationPhase2()` — same four-edge walk with the same counter.
     */
    wonAnimationPhase2() {
        let direction = 0;
        let counter = 0;
        const newPositions = new Array(shared.cards.length);
        const rand = () => Math.floor(Math.random() * 1e9);
        for (let i = 0; i < shared.cards.length; i++) {
            switch (direction) {
                case 0:
                default: {
                    // right side
                    newPositions[i] = { x: this.layoutWidth, y: counter };
                    counter += Card.height;
                    if (counter >= this.layoutHeight) {
                        direction = 1;
                        counter = rand() % Math.max(1, Card.height);
                    }
                    break;
                }
                case 1: {
                    // bottom side
                    newPositions[i] = { x: counter, y: this.layoutHeight + Card.height };
                    counter += Card.width;
                    if (counter >= this.layoutWidth) {
                        direction = 2;
                        counter = rand() % Math.max(1, Card.width);
                    }
                    break;
                }
                case 2: {
                    // left side
                    newPositions[i] = { x: -Card.width, y: counter };
                    counter += Card.height;
                    if (counter >= this.layoutHeight) {
                        direction = 3;
                        counter = rand() % Math.max(1, Card.height);
                    }
                    break;
                }
                case 3: {
                    // top side
                    newPositions[i] = { x: counter, y: -Card.height };
                    counter += Card.width;
                    if (counter >= this.layoutWidth) {
                        direction = 0;
                        counter = rand() % Math.max(1, Card.width);
                    }
                    break;
                }
            }
        }
        for (let i = 0; i < shared.cards.length; i++) {
            this.moveCardSlow(shared.cards[i], newPositions[i].x, newPositions[i].y);
        }
    }
}
