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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/classes/Card.java`.
 *
 * The Java class holds an `ImageView`. Here the card holds plain layout coordinates
 * (`x`, `y`) that `render/Animate.js` tweens between, which is the canvas equivalent of
 * the Android view animation + `CustomImageView.setDestination()` behaviour.
 */
import { shared, moveCardToStack, moveCardToStackDefault, OPTION_NO_RECORD, } from './SharedData.js';
export const ACE = 1;
export const JOKER = 11;
export const QUEEN = 12;
export const KING = 13;
const STATE_FACED_DOWN = 0;
export const STATE_FACED_UP = 1;
export const STATE_INVISIBLE = 2;
export class Card {
    /** Shared card dimensions, recalculated by `Game.setUpCardWidth()` on every layout. */
    static width = 0;
    static height = 0;
    /** 1=clubs 2=hearts 3=spades 4=diamonds */
    color;
    /** 1=ace .. 11=joker 12=queen 13=king */
    value;
    /** internal id, also the index into `shared.cards` */
    id;
    stack = null;
    up = false;
    invisible = false;
    /** Layout position — what Android's `view.getX()` would return. */
    x = 0;
    y = 0;
    /**
     * Interpolated position the renderer actually paints. While an animation runs this
     * differs from `x`/`y`; it equals them once nothing is moving.
     */
    renderX = 0;
    renderY = 0;
    /** Horizontal squash used by the flip animation (1 = normal). */
    renderScaleX = 1;
    /** Saved position so a failed drag can be reverted (Java: `Card.oldLocation`). */
    oldX = 0;
    oldY = 0;
    /** z-order among all cards; higher paints later (Java: `bringToFront()`). */
    z = 0;
    /** Temporary renderer state for the hint fade-out and for invisible cards. */
    renderAlpha = 1;
    renderHidden = false;
    static zCounter = 1;
    /**
     * Sets id, color and value. Cards are initialized at game start with a for loop.
     * The color depends on `cardDrawablesOrder`; value range is 1..13 (ace to king).
     */
    constructor(id) {
        this.id = id;
        this.color = shared.currentGame.cardDrawablesOrder[Math.floor((id % 52) / 13)];
        this.value = (id % 13) + 1;
        this.z = Card.zCounter++;
    }
    /** Port of `Card.updateCardDrawableChoice()` — no-op here, render reads the theme live. */
    static updateCardDrawableChoice() {
        /* renderer subscribes to theme changes */
    }
    /** Port of `Card.updateCardBackgroundChoice()` — no-op here, render reads the theme live. */
    static updateCardBackgroundChoice() {
        /* renderer subscribes to theme changes */
    }
    /** Port of `Card.save()`. */
    static save() {
        const list = [];
        for (const card of shared.cards) {
            let state = card.up ? STATE_FACED_UP : STATE_FACED_DOWN;
            if (card.invisible) {
                state = STATE_INVISIBLE;
            }
            list.push(state);
        }
        shared.prefs.saveCards(list);
    }
    /** Port of `Card.load()`. */
    static load() {
        const list = shared.prefs.getSavedCards();
        for (let i = 0; i < shared.cards.length; i++) {
            switch (list[i]) {
                case STATE_FACED_UP:
                    shared.cards[i].flipUp();
                    break;
                case STATE_FACED_DOWN:
                    shared.cards[i].flipDown();
                    break;
                case STATE_INVISIBLE:
                    shared.cards[i].renderHidden = true;
                    shared.cards[i].invisible = true;
                    break;
                default:
                    break;
            }
        }
    }
    /**
     * Moves a card to the given coordinates using an animation.
     * Port of `Card.setLocation()`.
     */
    setLocation(pX, pY) {
        if (this.invisible) {
            this.setLocationWithoutMovement(pX, pY);
            return;
        }
        if (!shared.stopUiUpdates) {
            if (this.x !== pX || this.y !== pY) {
                shared.animate.moveCard(this, pX, pY);
            }
        }
    }
    /** Port of `Card.setLocationWithoutMovement()`. */
    setLocationWithoutMovement(pX, pY) {
        if (!shared.stopUiUpdates) {
            this.bringToFront();
            this.x = pX;
            this.y = pY;
            this.renderX = pX;
            this.renderY = pY;
        }
    }
    saveOldLocation() {
        this.oldX = this.x;
        this.oldY = this.y;
    }
    /**
     * Port of `Card.returnToOldLocation()`.
     *
     * PORT NOTE. In Android `view.setX()/setY()` *is* the card's position — there is only
     * one. Here the logical position (`x`/`y`) and the drawn position (`renderX`/`renderY`)
     * are separate so the tweens can interpolate, so an illegal drop has to restore both.
     * Restoring only `x`/`y` left the card painted where it was dropped: `MovingCards`
     * -> `returnToPos()` appeared to do nothing and the card stayed stuck under the finger.
     */
    returnToOldLocation() {
        this.x = this.oldX;
        this.y = this.oldY;
        this.renderX = this.oldX;
        this.renderY = this.oldY;
    }
    flipUp() {
        this.up = true;
    }
    flipDown() {
        this.up = false;
    }
    flip() {
        if (this.isUp()) {
            this.flipDown();
        }
        else {
            this.flipUp();
        }
    }
    /**
     * Sets the direction to the opposite of the current direction, but with an animation.
     * Also updates the score (a same-stack move counts as a flip) and adds a record.
     * Port of `Card.flipWithAnim()`.
     */
    flipWithAnim() {
        if (this.isUp()) {
            this.up = false;
            shared.scores.undo(this, this.getStack());
            if (!shared.stopUiUpdates) {
                shared.animate.flipCard(this, false);
            }
        }
        else {
            this.up = true;
            shared.scores.move(this, this.getStack());
            shared.recordList.addFlip(this);
            if (!shared.stopUiUpdates) {
                shared.animate.flipCard(this, true);
            }
        }
    }
    /**
     * Tests if this card can be placed on a stack.
     * Port of `Card.test(Stack)`.
     */
    test(destination) {
        return (!((!this.isUp() || (destination.getSize() !== 0 && !destination.getTopCard().isUp())) &&
            !shared.autoComplete.isRunning()) && shared.currentGame.cardTest(destination, this));
    }
    getColor() {
        return this.color;
    }
    isTopCard() {
        return this.getStack().getTopCard() === this;
    }
    isFirstCard() {
        return this.getStack().getCard(0) === this;
    }
    getIndexOnStack() {
        return this.getStack().getIndexOfCard(this);
    }
    isUp() {
        return this.up;
    }
    getId() {
        return this.id;
    }
    getValue() {
        return this.value;
    }
    getStack() {
        return this.stack;
    }
    setStack(stack) {
        this.stack = stack;
    }
    getX() {
        return this.x;
    }
    setX(X) {
        this.x = X;
    }
    getY() {
        return this.y;
    }
    setY(Y) {
        this.y = Y;
    }
    getStackId() {
        return this.getStack().getId();
    }
    isInvisible() {
        return this.invisible;
    }
    removeFromCurrentStack() {
        if (this.stack != null) {
            this.getStack().removeCard(this);
            this.stack = null;
        }
    }
    getCardOnTop() {
        return this.getIndexOnStack() < this.getStack().getSize() - 1
            ? this.getStack().getCard(this.getIndexOnStack() + 1)
            : this;
    }
    getCardBelow() {
        return this.getIndexOnStack() === 0 ? this : this.getStack().getCard(this.getIndexOnStack() - 1);
    }
    bringToFront() {
        if (!shared.stopUiUpdates) {
            this.z = Card.zCounter++;
        }
    }
    removeFromGame() {
        this.renderHidden = true;
        this.invisible = true;
        moveCardToStack(this, shared.currentGame.offScreenStack, OPTION_NO_RECORD);
    }
    addBackToGame(moveTo) {
        this.invisible = false;
        this.flipUp();
        this.renderHidden = false;
        moveCardToStackDefault(this, moveTo);
    }
}
