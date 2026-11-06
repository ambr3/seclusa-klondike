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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/MovingCards.java`.
 *
 * Handles the input of cards to move around. When a card is touched, all cards up to the
 * stack top are added to the movement. It moves them and returns them to their old
 * location if they cannot be placed on another stack.
 */
import { shared, moveToStackSingle } from './SharedData.js';
import { Card as CardClass } from './Card.js';
import { Stack as StackClass } from './Stack.js';
import { Sounds } from './Sounds.js';
export class MovingCards {
    currentCards = [];
    offsetX = 0;
    offsetY = 0;
    moveStartedFlag = false;
    reset() {
        this.currentCards = [];
    }
    /**
     * Adds a card and every card above it to the movement. Also sets up the little offset
     * from the touch position to the card coordinates for smooth movements.
     */
    add(card, offsetX, offsetY) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        const stack = card.getStack();
        this.moveStartedFlag = false;
        for (let i = stack.getIndexOfCard(card); i < stack.getSize(); i++) {
            stack.getCard(i).saveOldLocation();
            this.currentCards.push(stack.getCard(i));
        }
    }
    /** Moves the cards to the new location. */
    move(X, Y) {
        for (const card of this.currentCards) {
            card.setLocationWithoutMovement(X - this.offsetX, Y - this.offsetY + this.currentCards.indexOf(card) * (StackClass.defaultSpacing / 2));
        }
    }
    moveStarted(X, Y) {
        return this.moveStartedFlag || this.didMoveStart(X, Y);
    }
    /**
     * Checks if the current touch point of the movement left the little area around the
     * starting point.
     */
    didMoveStart(X, Y) {
        if (Math.abs(this.currentCards[0].getX() + this.offsetX - X) > CardClass.width / 4 ||
            Math.abs(this.currentCards[0].getY() + this.offsetY - Y) > CardClass.height / 4) {
            this.moveStartedFlag = true;
            return true;
        }
        return false;
    }
    /** Moves the current cards to the new destination. */
    moveToDestination(destination) {
        shared.gameLogic.checkFirstMovement();
        shared.sounds.playSound(Sounds.Names.CARD_SET);
        const origin = this.currentCards[0].getStack();
        moveToStackSingle(this.currentCards, destination, 0);
        if (origin.getSize() > 0 &&
            origin.getId() <= shared.currentGame.getLastTableauId() &&
            !origin.getTopCard().isUp()) {
            origin.getTopCard().flipWithAnim();
        }
        this.currentCards = [];
        shared.gameLogic.checkForAutoCompleteButton(false);
    }
    /** Returns the cards to the old location if the movement to the new stack did not work. */
    returnToPos() {
        for (const card of this.currentCards) {
            card.returnToOldLocation();
        }
        this.currentCards = [];
    }
    /**
     * Checks if only one card is moving. The size is still zero in hints (because hints call
     * `cardTest()`, which calls `hasSingleCard()`), so return true when fewer than 2 cards move.
     */
    hasSingleCard() {
        return this.getSize() < 2;
    }
    first() {
        return this.currentCards[0];
    }
    getSize() {
        return this.currentCards.length;
    }
    hasCards() {
        return this.currentCards.length !== 0;
    }
}
