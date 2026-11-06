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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/classes/Stack.java`.
 * The Java `view` (an ImageView) becomes plain `x`/`y` layout coordinates plus a
 * `backgroundKey` that the canvas renderer resolves to a sprite.
 */
import { shared, leftHandedModeEnabled, min } from './SharedData.js';
import { Card } from './Card.js';
export var SpacingDirection;
(function (SpacingDirection) {
    SpacingDirection["NONE"] = "NONE";
    SpacingDirection["UP"] = "UP";
    SpacingDirection["LEFT"] = "LEFT";
    SpacingDirection["RIGHT"] = "RIGHT";
    SpacingDirection["DOWN"] = "DOWN";
})(SpacingDirection || (SpacingDirection = {}));
export var ArrowDirection;
(function (ArrowDirection) {
    ArrowDirection["LEFT"] = "LEFT";
    ArrowDirection["RIGHT"] = "RIGHT";
})(ArrowDirection || (ArrowDirection = {}));
export class Stack {
    /** The default space between cards, calculated in GameManager.initializeLayout(). */
    static defaultSpacing = 0;
    /** id: 0 to 6 tableau, 7 to 10 foundations, 11..13 discard, 14 main stack. */
    id;
    currentCards = [];
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    /** Which sprite from `backgrounds_stacks.png` to draw. */
    backgroundKey = 'default';
    /** z-order of the stack background; all stack backgrounds sit under all cards. */
    z = 0;
    spacing = 0;
    spacingDirection = SpacingDirection.NONE;
    arrowDirection = null;
    spacingMax = 0;
    static zCounter = -1000;
    constructor(id) {
        this.id = id;
        this.z = Stack.zCounter++;
    }
    reset() {
        this.currentCards = [];
    }
    /**
     * Adds a card to this stack. Updates the spacings and flips the card if the stack
     * is a main- or discard stack.
     */
    addCard(card) {
        card.setStack(this);
        this.currentCards.push(card);
        if (shared.currentGame.mainStacksContain(this.getId())) {
            card.flipDown();
        }
        else if (shared.currentGame.discardStacksContain(this.getId())) {
            card.flipUp();
        }
    }
    removeCard(card) {
        const index = this.currentCards.indexOf(card);
        if (index >= 0) {
            this.currentCards.splice(index, 1);
        }
        this.updateSpacing();
    }
    getTopCard() {
        if (!this.isEmpty()) {
            return this.currentCards[this.currentCards.length - 1];
        }
        throw new Error('Empty Stack, check with isEmpty() before!');
    }
    getCardFromTop(index) {
        if (!this.isEmpty()) {
            return this.currentCards[this.currentCards.length - 1 - index];
        }
        throw new Error('Empty Stack, check with isEmpty() before!');
    }
    /**
     * Test if the given location is on the stack. The stack location runs from the first
     * card to the top card.
     */
    isOnLocation(pX, pY) {
        const topPoint = this.getPosition(0);
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                topPoint.y += Card.height;
                return (pX >= this.x && pX <= this.x + Card.width && pY >= this.y && pY <= topPoint.y);
            case SpacingDirection.UP:
                return (pX >= this.x &&
                    pX <= this.x + Card.width &&
                    pY >= topPoint.y &&
                    pY <= this.y + Card.height);
            case SpacingDirection.LEFT:
                if (leftHandedModeEnabled()) {
                    topPoint.x += Card.width;
                    return pX >= this.x && pX <= topPoint.x && pY >= this.y && pY <= this.y + Card.height;
                }
                return pX >= topPoint.x && pX <= this.x + Card.width && pY >= this.y && pY <= this.y + Card.height;
            case SpacingDirection.RIGHT:
                if (leftHandedModeEnabled()) {
                    return pX >= topPoint.x && pX <= this.x + Card.width && pY >= this.y && pY <= this.y + Card.height;
                }
                topPoint.x += Card.width;
                return pX >= this.x && pX <= topPoint.x && pY >= this.y && pY <= this.y + Card.height;
            case SpacingDirection.NONE:
            default:
                return pX >= this.x && pX <= this.x + Card.width && pY >= this.y && pY <= this.y + Card.height;
        }
    }
    /**
     * Gets the position a new card would have according to the spacing and offset (used for hints).
     * Port of `Stack.getPosition(int)`.
     */
    getPosition(offset) {
        offset += 1;
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                return {
                    x: this.x,
                    y: this.isEmpty() ? this.y + (offset - 1) * this.spacing : this.getTopCard().getY() + offset * this.spacing,
                };
            case SpacingDirection.UP:
                return {
                    x: this.x,
                    y: this.isEmpty() ? this.y - (offset - 1) * this.spacing : this.getTopCard().getY() - offset * this.spacing,
                };
            case SpacingDirection.LEFT:
                return {
                    x: this.isEmpty()
                        ? this.x +
                            (leftHandedModeEnabled() ? (offset - 1) * this.spacing : -(offset - 1) * this.spacing)
                        : this.getTopCard().getX() +
                            (leftHandedModeEnabled() ? offset * this.spacing : -offset * this.spacing),
                    y: this.y,
                };
            case SpacingDirection.RIGHT:
                return {
                    x: this.isEmpty()
                        ? this.x +
                            (leftHandedModeEnabled() ? -(offset - 1) * this.spacing : (offset - 1) * this.spacing)
                        : this.getTopCard().getX() +
                            (leftHandedModeEnabled() ? -offset * this.spacing : offset * this.spacing),
                    y: this.y,
                };
            case SpacingDirection.NONE:
            default:
                return { x: this.x, y: this.y };
        }
    }
    /** Save which cards are currently on this stack. Port of `Stack.save()`. */
    save() {
        const list = [];
        for (const card of this.currentCards) {
            list.push(card.getId());
        }
        shared.prefs.saveStacks(list, this.id);
    }
    /** Port of `Stack.load(boolean)`. */
    load(withoutMovement) {
        this.reset();
        const list = shared.prefs.getSavedStacks(this.id);
        for (const i of list) {
            const card = shared.cards[i];
            /*
             * Skip rather than add. Storage is plaintext and never trusted, so an id that
             * is out of range yields `undefined` and `addCard` throws on it -- which is
             * caught upstream and costs the player their whole game. A corrupt stack is
             * one stack; it should not be the deal.
             *
             * The cap is the same reasoning: a list of 10^6 valid ids repeated is accepted
             * and then walked by `runSpacing`, which is a hang wearing a game's clothes.
             * One card per deck is the most a stack can physically hold.
             */
            if (card === undefined || this.currentCards.length >= shared.cards.length) {
                continue;
            }
            this.addCard(card);
        }
        if (!shared.gameLogic.hasWon()) {
            if (withoutMovement) {
                this.updateSpacingWithoutMovement();
            }
            else {
                this.updateSpacing();
            }
        }
        else {
            for (const card of this.currentCards) {
                card.setLocationWithoutMovement(-5000, -5000);
            }
        }
    }
    /** Port of `Stack.updateSpacing()` — the animated variant. */
    updateSpacing() {
        this.runSpacing(true);
    }
    /** Port of `Stack.updateSpacingWithoutMovement()`. */
    updateSpacingWithoutMovement() {
        this.runSpacing(false);
    }
    runSpacing(animate) {
        if (this.currentCards.length === 0) {
            return;
        }
        const place = (card, px, py) => {
            if (animate) {
                card.setLocation(px, py);
            }
            else {
                card.setLocationWithoutMovement(px, py);
                card.bringToFront();
            }
        };
        let posX = 0;
        let posY = 0;
        let facedDownSpacing = 0;
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                posY = this.y;
                this.spacing = min((this.spacingMax - this.y) / (this.currentCards.length + 1), Stack.defaultSpacing);
                facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                place(this.currentCards[0], this.x, this.y);
                for (let i = 1; i < this.currentCards.length; i++) {
                    posY += this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                    place(this.currentCards[i], this.x, posY);
                }
                break;
            case SpacingDirection.UP:
                posY = this.y;
                this.spacing = min((this.y - this.spacingMax) / (this.currentCards.length + 1), Stack.defaultSpacing);
                facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                place(this.currentCards[0], this.x, this.y);
                for (let i = 1; i < this.currentCards.length; i++) {
                    posY -= this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                    place(this.currentCards[i], this.x, posY);
                }
                break;
            case SpacingDirection.LEFT:
                posX = this.x;
                place(this.currentCards[0], this.x, this.y);
                if (leftHandedModeEnabled()) {
                    this.spacing = min((this.spacingMax - this.x) / (this.currentCards.length + 1), Stack.defaultSpacing);
                    facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                    for (let i = 1; i < this.currentCards.length; i++) {
                        posX += this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                        place(this.currentCards[i], posX, this.y);
                    }
                }
                else {
                    this.spacing = min((this.x - this.spacingMax) / (this.currentCards.length + 1), Stack.defaultSpacing);
                    facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                    for (let i = 1; i < this.currentCards.length; i++) {
                        posX -= this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                        place(this.currentCards[i], posX, this.y);
                    }
                }
                break;
            case SpacingDirection.RIGHT:
                posX = this.x;
                place(this.currentCards[0], this.x, this.y);
                if (leftHandedModeEnabled()) {
                    this.spacing = min((this.x - this.spacingMax) / (this.currentCards.length + 1), Stack.defaultSpacing);
                    facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                    for (let i = 1; i < this.currentCards.length; i++) {
                        posX -= this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                        place(this.currentCards[i], posX, this.y);
                    }
                }
                else {
                    this.spacing = min((this.spacingMax - this.x) / (this.currentCards.length + 1), Stack.defaultSpacing);
                    facedDownSpacing = min(this.spacing, Stack.defaultSpacing / 2);
                    for (let i = 1; i < this.currentCards.length; i++) {
                        posX += this.currentCards[i - 1].isUp() ? this.spacing : facedDownSpacing;
                        place(this.currentCards[i], posX, this.y);
                    }
                }
                break;
            case SpacingDirection.NONE:
            default:
                for (let i = 0; i < this.currentCards.length; i++) {
                    place(this.currentCards[i], this.x, this.y);
                }
                break;
        }
        for (const card of this.currentCards) {
            card.bringToFront();
        }
    }
    getFirstUpCard() {
        for (const card of this.currentCards) {
            if (card.isUp()) {
                return card;
            }
        }
        return null;
    }
    getFirstUpCardPos() {
        for (let i = 0; i < this.currentCards.length; i++) {
            if (this.currentCards[i].isUp()) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Sets another stack as a border, so cards from this stack won't overlap the other stack.
     * Port of `Stack.setSpacingMax(int)`.
     */
    setSpacingMax(index) {
        const stack = shared.stacks[index];
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                this.spacingMax = stack.getY() - Card.height;
                break;
            case SpacingDirection.UP:
                this.spacingMax = stack.getY() + Card.height;
                break;
            case SpacingDirection.LEFT:
                this.spacingMax = leftHandedModeEnabled() ? stack.getX() - Card.width : stack.getX() + Card.width;
                break;
            case SpacingDirection.RIGHT:
                this.spacingMax = leftHandedModeEnabled() ? stack.getX() + Card.width : stack.getX() - Card.width;
                break;
            case SpacingDirection.NONE:
            default:
                break;
        }
    }
    /**
     * Sets the playfield dimensions as a border, so cards on this stack won't leave the screen.
     * Port of `Stack.setSpacingMax(RelativeLayout)`.
     */
    setSpacingMaxToLayout(layoutWidth, layoutHeight) {
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                // Keep the full face of the bottom card inside the playfield (above Score/Time).
                this.spacingMax = layoutHeight - Card.height;
                break;
            case SpacingDirection.UP:
                this.spacingMax = 0;
                break;
            case SpacingDirection.LEFT:
                this.spacingMax = leftHandedModeEnabled() ? layoutWidth - Card.width : 0;
                break;
            case SpacingDirection.RIGHT:
                this.spacingMax = leftHandedModeEnabled() ? 0 : layoutWidth - Card.width;
                break;
            case SpacingDirection.NONE:
            default:
                break;
        }
    }
    /**
     * Changes the layout if left handed mode is enabled: mirrors the stacks to the other side.
     * Port of `Stack.mirrorStack(RelativeLayout)`.
     */
    mirrorStack(layoutWidth) {
        this.x = layoutWidth - this.x - Card.width;
        for (let j = 0; j < this.getSize(); j++) {
            const card = this.getCard(j);
            card.setLocationWithoutMovement(layoutWidth - card.getX() - Card.width, card.getY());
        }
        if (this.spacingDirection === SpacingDirection.LEFT || this.spacingDirection === SpacingDirection.RIGHT) {
            const borders = shared.currentGame.directionBorders;
            if (borders != null && borders[this.getId()] !== -1) {
                this.setSpacingMax(borders[this.getId()]);
            }
        }
    }
    /**
     * Gets the rectangle enclosing the stack with all current cards on it. Used to determine if
     * moving cards are intersecting this stack. Port of `Stack.getRect()`.
     */
    getRect() {
        if (this.isEmpty()) {
            return {
                left: this.x,
                top: this.y,
                right: this.x + this.width,
                bottom: this.y + this.height,
            };
        }
        switch (this.spacingDirection) {
            case SpacingDirection.DOWN:
                return {
                    left: this.x,
                    top: this.y,
                    right: this.x + this.width,
                    bottom: this.getTopCard().getY() + this.height,
                };
            case SpacingDirection.UP:
                return {
                    left: this.x,
                    top: this.getTopCard().getY(),
                    right: this.x + this.width,
                    bottom: this.y + this.height,
                };
            case SpacingDirection.LEFT:
                // Mirrors isOnLocation(): left-handed mode fans the opposite way.
                if (leftHandedModeEnabled()) {
                    return {
                        left: this.x,
                        top: this.y,
                        right: this.getTopCard().getX() + this.width,
                        bottom: this.y + this.height,
                    };
                }
                return {
                    left: this.getTopCard().getX(),
                    top: this.y,
                    right: this.x + this.width,
                    bottom: this.y + this.height,
                };
            case SpacingDirection.RIGHT:
                if (leftHandedModeEnabled()) {
                    return {
                        left: this.getTopCard().getX(),
                        top: this.y,
                        right: this.x + this.width,
                        bottom: this.y + this.height,
                    };
                }
                return {
                    left: this.x,
                    top: this.y,
                    right: this.getTopCard().getX() + this.width,
                    bottom: this.y + this.height,
                };
            case SpacingDirection.NONE:
            default:
                return {
                    left: this.x,
                    top: this.y,
                    right: this.x + this.width,
                    bottom: this.y + this.height,
                };
        }
    }
    topCardIsUp() {
        return this.getSize() === 0 || this.getTopCard().isUp();
    }
    getCard(index) {
        return this.currentCards[index];
    }
    getId() {
        return this.id;
    }
    getIndexOfCard(card) {
        return this.currentCards.indexOf(card);
    }
    getSize() {
        return this.currentCards.length;
    }
    isEmpty() {
        return this.getSize() === 0;
    }
    setSpacingDirection(value) {
        this.spacingDirection = value;
    }
    getSpacingDirection() {
        return this.spacingDirection;
    }
    setArrow(direction) {
        this.arrowDirection = direction;
        this.applyArrow();
    }
    hasArrow() {
        return this.arrowDirection != null;
    }
    applyArrow() {
        if (this.arrowDirection == null) {
            return;
        }
        const leftHandedMode = shared.prefs.getSavedLeftHandedMode();
        if (this.arrowDirection === ArrowDirection.LEFT && leftHandedMode) {
            this.backgroundKey = 'arrowRight';
        }
        else if (this.arrowDirection === ArrowDirection.LEFT) {
            this.backgroundKey = 'arrowLeft';
        }
        else if (this.arrowDirection === ArrowDirection.RIGHT && leftHandedMode) {
            this.backgroundKey = 'arrowLeft';
        }
        else {
            this.backgroundKey = 'arrowRight';
        }
    }
    applyDefaultSpacing() {
        this.spacing = Stack.defaultSpacing;
    }
    flipTopCardUp() {
        if (this.getSize() > 0) {
            this.getTopCard().flipUp();
        }
    }
    /**
     * Exchanges oldCard (currently on THIS stack) with another card newCard.
     * Port of `Stack.exchangeCard(Card, Card)`.
     */
    exchangeCard(oldCard, newCard) {
        const oldCardPreviousIndexOnStack = oldCard.getIndexOnStack();
        const newCardPreviousIndexOnStack = newCard.getIndexOnStack();
        const newCardPreviousStack = newCard.getStack();
        const newCardPreviousDirection = newCard.isUp();
        const oldCardPreviousDirection = oldCard.isUp();
        if (oldCardPreviousDirection) {
            newCard.flipUp();
        }
        else {
            newCard.flipDown();
        }
        newCard.setStack(this);
        this.currentCards[oldCardPreviousIndexOnStack] = newCard;
        newCardPreviousStack.currentCards[newCardPreviousIndexOnStack] = oldCard;
        oldCard.setStack(newCardPreviousStack);
        if (newCardPreviousDirection) {
            oldCard.flipUp();
        }
        else {
            oldCard.flipDown();
        }
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
}
