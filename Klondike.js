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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/games/Klondike.java`.
 * Behaviour is intentionally identical; only the language changed.
 *
 * Klondike has 7 tableau stacks, 4 foundation fields, 1 main stack and 3 discard stacks.
 * The 3 discard stacks are for the "deal3" option. If it is set to "deal1", the last
 * discard stack is used.
 */
import { Game, testMode, testMode2, testMode3 } from './cards/engine/game/Game.js';
import { shared, moveCardToStack, moveCardToStackDefault, moveToStackSingle, min, } from './cards/engine/game/SharedData.js';
import { Card } from './cards/engine/game/Card.js';
export class Klondike extends Game {
    constructor() {
        super();
        this.setNumberOfDecks(1);
        this.setNumberOfStacks(15);
        this.setTableauStackIDs(0, 1, 2, 3, 4, 5, 6);
        this.setFoundationStackIDs(7, 8, 9, 10);
        this.setDiscardStackIDs(11, 12, 13);
        this.setMainStackIDs(14);
        this.setNumberOfRecycles('pref_key_klondike_number_of_recycles', '3');
        this.toggleRecycles(shared.prefs.getSavedKlondikeLimitedRecycles());
    }
    setStacks(layout) {
        // initialize the dimensions
        this.setUpCardWidth(layout, 8, 10);
        // calculate spacing and start position of cards
        const spacing = this.setUpHorizontalSpacing(layout, 7, 8);
        let startPos = layout.width / 2 - Card.width / 2 - 3 * Card.width - 3 * spacing;
        // first order the foundation stacks
        for (let i = 0; i < 4; i++) {
            shared.stacks[7 + i].setX(startPos + spacing * i + Card.width * i);
            shared.stacks[7 + i].setY((layout.isLandscape ? Card.width / 4 : Card.width / 2) + 1);
        }
        // then the trash and main stacks
        startPos = layout.width - 2 * spacing - 3 * Card.width;
        for (let i = 0; i < 3; i++) {
            shared.stacks[11 + i].setX(startPos + (Card.width / 2) * i);
            shared.stacks[11 + i].setY((layout.isLandscape ? Card.width / 4 : Card.width / 2) + 1);
        }
        shared.stacks[14].setX(shared.stacks[13].getX() + Card.width + spacing);
        shared.stacks[14].setY(shared.stacks[13].getY());
        // now the tableau stacks
        startPos = layout.width / 2 - Card.width / 2 - 3 * Card.width - 3 * spacing;
        for (let i = 0; i < 7; i++) {
            shared.stacks[i].setX(startPos + spacing * i + Card.width * i);
            shared.stacks[i].setY(shared.stacks[7].getY() + Card.height + (layout.isLandscape ? Card.width / 4 : Card.width / 2));
        }
        // also set backgrounds of the stacks
        for (const stack of shared.stacks) {
            if (stack.getId() > 6 && stack.getId() <= 10) {
                stack.backgroundKey = '1';
            }
            else if (stack.getId() > 10 && stack.getId() <= 13) {
                stack.backgroundKey = 'transparent';
            }
            else if (stack.getId() === 14) {
                stack.backgroundKey = 'talon';
            }
        }
    }
    winTest() {
        // if the foundation stacks aren't full, not won. Else won
        for (let i = 7; i <= 10; i++) {
            if (shared.stacks[i].getSize() !== 13) {
                return false;
            }
        }
        return true;
    }
    dealCards() {
        // save the new settings, so it only takes effect on new deals
        shared.prefs.saveKlondikeDrawModeOld();
        // deal cards to trash according to the draw option
        if (shared.prefs.getSavedKlondikeDrawModeOld() === '1') {
            moveCardToStack(this.getMainStack().getTopCard(), shared.stacks[13], 2 /* OPTION_NO_RECORD */);
            shared.stacks[13].getCard(0).flipUp();
        }
        else {
            for (let i = 0; i < 3; i++) {
                moveCardToStack(this.getMainStack().getTopCard(), shared.stacks[11 + i], 2 /* OPTION_NO_RECORD */);
                shared.stacks[11 + i].getCard(0).flipUp();
            }
        }
        // and move cards to the tableau
        for (let i = 0; i <= 6; i++) {
            for (let j = 0; j < i + 1; j++) {
                moveCardToStack(this.getMainStack().getTopCard(), shared.stacks[i], 2 /* OPTION_NO_RECORD */);
            }
            shared.stacks[i].getCard(i).flipUp();
        }
    }
    onMainStackTouch() {
        const deal3 = shared.prefs.getSavedKlondikeDrawModeOld() === '3';
        // if there are cards on the main stack
        if (this.getMainStack().getSize() > 0) {
            if (deal3) {
                let size = min(3, this.getMainStack().getSize());
                const cardsReversed = [];
                const originReversed = [];
                const cards = [];
                const origin = [];
                // add cards from 2. and 3. discard stack to the first one
                while (!shared.stacks[12].isEmpty()) {
                    cards.push(shared.stacks[12].getTopCard());
                    origin.push(shared.stacks[12]);
                    moveCardToStack(shared.stacks[12].getTopCard(), shared.stacks[11], 2 /* OPTION_NO_RECORD */);
                }
                while (!shared.stacks[13].isEmpty()) {
                    cards.push(shared.stacks[13].getTopCard());
                    origin.push(shared.stacks[13]);
                    moveCardToStack(shared.stacks[13].getTopCard(), shared.stacks[11], 2 /* OPTION_NO_RECORD */);
                }
                // reverse the array orders, so they will be reversed again, so they are in the right
                // order again at this part, because now there are only the cards from the discard
                // stacks on.
                for (let i = 0; i < cards.length; i++) {
                    cardsReversed.push(cards[cards.length - 1 - i]);
                    originReversed.push(origin[origin.length - 1 - i]);
                }
                for (let i = 0; i < cards.length; i++) {
                    cards[i] = cardsReversed[i];
                    origin[i] = originReversed[i];
                }
                // add up to 3 cards from main to the first discard stack
                for (let i = 0; i < size; i++) {
                    cards.push(this.getMainStack().getTopCard());
                    origin.push(this.getMainStack());
                    moveCardToStack(this.getMainStack().getTopCard(), shared.stacks[11], 2 /* OPTION_NO_RECORD */);
                    shared.stacks[11].getTopCard().flipUp();
                }
                // then move up to 2 cards to the 2. and 3. discard stack
                size = min(3, shared.stacks[11].getSize());
                if (size > 1) {
                    moveCardToStack(shared.stacks[11].getCardFromTop(1), shared.stacks[12], 2 /* OPTION_NO_RECORD */);
                    if (!cards.includes(shared.stacks[12].getTopCard())) {
                        cards.push(shared.stacks[12].getTopCard());
                        origin.push(shared.stacks[11]);
                    }
                }
                if (size > 0) {
                    moveCardToStack(shared.stacks[11].getTopCard(), shared.stacks[13], 2 /* OPTION_NO_RECORD */);
                    if (!cards.includes(shared.stacks[13].getTopCard())) {
                        cards.push(shared.stacks[13].getTopCard());
                        origin.push(shared.stacks[11]);
                    }
                }
                // now bring the cards to front
                if (!shared.stacks[12].isEmpty()) {
                    shared.stacks[12].getTopCard().bringToFront();
                }
                if (!shared.stacks[13].isEmpty()) {
                    shared.stacks[13].getTopCard().bringToFront();
                }
                // reverse everything so the cards on the stack will be in the right order when using an undo
                cardsReversed.length = 0;
                originReversed.length = 0;
                for (let i = 0; i < cards.length; i++) {
                    cardsReversed.push(cards[cards.length - 1 - i]);
                    originReversed.push(origin[origin.length - 1 - i]);
                }
                // finally add the record
                shared.recordList.addWithOrigins(cardsReversed, originReversed);
            }
            else {
                // no deal3 option, just deal one card without that huge amount of calculation for the recordList
                moveCardToStackDefault(this.getMainStack().getTopCard(), shared.stacks[13]);
            }
            return 1;
        }
        // if there are NO cards on the main stack, but cards on the discard stacks,
        // move them all to main
        else if (shared.stacks[11].getSize() !== 0 || shared.stacks[12].getSize() !== 0 || shared.stacks[13].getSize() !== 0) {
            const cards = [];
            for (let i = 0; i < shared.stacks[11].getSize(); i++) {
                cards.push(shared.stacks[11].getCard(i));
            }
            for (let i = 0; i < shared.stacks[12].getSize(); i++) {
                cards.push(shared.stacks[12].getCard(i));
            }
            for (let i = 0; i < shared.stacks[13].getSize(); i++) {
                cards.push(shared.stacks[13].getCard(i));
            }
            const cardsReversed = [];
            for (let i = 0; i < cards.length; i++) {
                cardsReversed.push(cards[cards.length - 1 - i]);
            }
            moveToStackSingle(cardsReversed, this.getMainStack(), 3 /* OPTION_REVERSED_RECORD */);
            return 2;
        }
        return 0;
    }
    autoCompleteStartTest() {
        // if every card is faced up, show the auto complete button
        for (let i = 0; i < 7; i++) {
            if (shared.stacks[i].getSize() > 0 && !shared.stacks[i].getCard(0).isUp()) {
                return false;
            }
        }
        // the waste and stock cards are playable by auto complete too, so they do not block it
        return true;
    }
    cardTest(stack, card) {
        // move cards according to the klondike rules
        if (stack.getId() < 7) {
            if (stack.isEmpty()) {
                return card.getValue() === 13;
            }
            else {
                return this.canCardBePlaced(stack, card, testMode.ALTERNATING_COLOR, testMode3.DESCENDING);
            }
        }
        else if (stack.getId() < 11 && shared.movingCards.hasSingleCard()) {
            if (stack.isEmpty()) {
                return card.getValue() === 1;
            }
            else {
                return this.canCardBePlaced(stack, card, testMode.SAME_FAMILY, testMode3.ASCENDING);
            }
        }
        else {
            return false;
        }
    }
    addCardToMovementGameTest(card) {
        // don't move cards from the discard stacks if there is a card on top of them.
        // E.g. if a card on stack 11 (first discard stack) was touched but there is a card
        // on stack 12 (second discard stack), don't move it.
        return !(((card.getStackId() === 11 || card.getStackId() === 12) && !shared.stacks[13].isEmpty()) ||
            (card.getStackId() === 11 && !shared.stacks[12].isEmpty()));
    }
    hintTest(visited) {
        let card;
        for (let i = 0; i <= 6; i++) {
            const origin = shared.stacks[i];
            if (origin.isEmpty()) {
                continue;
            }
            /* complete visible part of a stack to move on the tableau */
            card = origin.getFirstUpCard();
            if (card !== null &&
                !visited.includes(card) &&
                !(card.isFirstCard() && card.getValue() === 13) &&
                card.getValue() !== 1) {
                for (let j = 0; j <= 6; j++) {
                    if (j === i) {
                        continue;
                    }
                    if (card.test(shared.stacks[j])) {
                        return { card, stack: shared.stacks[j] };
                    }
                }
            }
            /* last card of a stack to move to the foundation */
            card = origin.getTopCard();
            if (!visited.includes(card)) {
                for (let j = 7; j <= 10; j++) {
                    if (card.test(shared.stacks[j])) {
                        return { card, stack: shared.stacks[j] };
                    }
                }
            }
        }
        /* card from trash or stock to every other stack */
        for (let i = 0; i < 3; i++) {
            if ((i < 2 && !shared.stacks[13].isEmpty()) || (i === 0 && !shared.stacks[12].isEmpty())) {
                continue;
            }
            if (shared.stacks[11 + i].getSize() > 0 && !visited.includes(shared.stacks[11 + i].getTopCard())) {
                for (let j = 10; j >= 0; j--) {
                    if (shared.stacks[11 + i].getTopCard().test(shared.stacks[j])) {
                        return { card: shared.stacks[11 + i].getTopCard(), stack: shared.stacks[j] };
                    }
                }
            }
        }
        return null;
    }
    doubleTapTest(card) {
        // foundation stacks
        if (card.isTopCard()) {
            for (let j = 7; j < 11; j++) {
                if (card.test(shared.stacks[j])) {
                    return shared.stacks[j];
                }
            }
        }
        // tableau stacks
        for (let j = 0; j < 7; j++) {
            if (card.getStackId() < 7 && this.sameCardOnOtherStack(card, shared.stacks[j], testMode2.SAME_VALUE_AND_COLOR)) {
                continue;
            }
            if (card.getValue() === 13 && card.isFirstCard() && card.getStackId() <= 6) {
                continue;
            }
            if (card.test(shared.stacks[j])) {
                return shared.stacks[j];
            }
        }
        // empty tableau stacks
        for (let j = 0; j < 7; j++) {
            if (shared.stacks[j].isEmpty() && card.test(shared.stacks[j])) {
                return shared.stacks[j];
            }
        }
        return null;
    }
    autoCompletePhaseTwo() {
        // just go through every stack
        for (let i = 7; i <= 10; i++) {
            const destination = shared.stacks[i];
            for (let j = 0; j <= 6; j++) {
                const origin = shared.stacks[j];
                if (origin.getSize() > 0 && origin.getTopCard().test(destination)) {
                    return { card: origin.getTopCard(), stack: destination };
                }
            }
            for (let j = 11; j < 15; j++) {
                const origin = shared.stacks[j];
                for (let k = 0; k < origin.getSize(); k++) {
                    if (origin.getCard(k).test(destination)) {
                        origin.getCard(k).flipUp();
                        return { card: origin.getCard(k), stack: destination };
                    }
                }
            }
        }
        return null;
    }
    addPointsToScore(_cards, originIDs, destinationIDs, _isUndoMovement) {
        const originID = originIDs[0];
        const destinationID = destinationIDs[0];
        // relevant for the deal3 option, because cards on the waste move first and checking
        // only the first id would not be enough
        for (let i = 0; i < originIDs.length; i++) {
            if (originIDs[i] >= 11 && originIDs[i] <= 13 && destinationIDs[i] <= 10) {
                // stock to tableau/foundation
                return 45;
            }
        }
        if (originID < 7 && destinationID >= 7 && destinationID <= 10) {
            // transfer from tableau to foundations
            return 60;
        }
        if (destinationID < 7 && originID >= 7 && originID <= 10) {
            // foundation to tableau
            return -75;
        }
        if (originID === destinationID) {
            // turn a card over
            return 25;
        }
        if (originID >= 11 && originID < 14 && destinationID === 14) {
            // returning cards to stock
            return -200;
        }
        return 0;
    }
    testAfterMove() {
        /*
         * after a card is moved from the discard stacks, the order of the cards on the
         * discard stacks needs to be updated (but only in deal3 mode). This movement will be
         * added to the last record list entry, so it will also be undone if the card will be
         * moved back to the discard stacks.
         */
        if (shared.gameLogic.hasWon()) {
            return;
        }
        const deal1 = shared.prefs.getSavedKlondikeDrawModeOld() === '1';
        Klondike.checkEmptyDiscardStack(this.getMainStack(), shared.stacks[11], shared.stacks[12], shared.stacks[13], deal1);
    }
    static checkEmptyDiscardStack(mainStack, discard1, discard2, discard3, deal1) {
        const OPTION_NO_RECORD = 2;
        if (deal1 && discard3.isEmpty() && !mainStack.isEmpty()) {
            shared.recordList.addToLastEntrySingle(mainStack.getTopCard(), mainStack);
            moveCardToStack(mainStack.getTopCard(), discard3, OPTION_NO_RECORD);
        }
        else if (!deal1 && discard1.isEmpty() && discard2.isEmpty() && discard3.isEmpty() && !mainStack.isEmpty()) {
            let size = min(3, mainStack.getSize());
            const cards = [];
            const origin = [];
            // add up to 3 cards from main to the first discard stack
            for (let i = 0; i < size; i++) {
                cards.push(mainStack.getTopCard());
                origin.push(mainStack);
                moveCardToStack(mainStack.getTopCard(), discard1, OPTION_NO_RECORD);
                discard1.getTopCard().flipUp();
            }
            // then move up to 2 cards to the 2. and 3. discard stack
            size = min(3, discard1.getSize());
            if (size > 1) {
                moveCardToStack(discard1.getCardFromTop(1), discard2, OPTION_NO_RECORD);
                if (!cards.includes(discard2.getTopCard())) {
                    cards.push(discard2.getTopCard());
                    origin.push(discard1);
                }
            }
            if (size > 0) {
                moveCardToStack(discard1.getTopCard(), discard3, OPTION_NO_RECORD);
                if (!cards.includes(discard3.getTopCard())) {
                    cards.push(discard3.getTopCard());
                    origin.push(discard1);
                }
            }
            // reverse everything so the cards on the stack will be in the right order when using an undo
            const cardsReversed = [];
            const originReversed = [];
            for (let i = 0; i < cards.length; i++) {
                cardsReversed.push(cards[cards.length - 1 - i]);
                originReversed.push(origin[origin.length - 1 - i]);
            }
            if (!discard2.isEmpty()) {
                discard2.getTopCard().bringToFront();
            }
            if (!discard3.isEmpty()) {
                discard3.getTopCard().bringToFront();
            }
            // finally add the record
            shared.recordList.addToLastEntry(cardsReversed, originReversed);
        }
        if (!deal1 && (discard2.isEmpty() || discard3.isEmpty()) && discard1.getSize() > 1) {
            const cards = [];
            const origin = [];
            // add the cards to the first discard pile
            while (!discard2.isEmpty()) {
                cards.push(discard2.getTopCard());
                origin.push(discard2);
                moveCardToStack(discard2.getTopCard(), discard1, OPTION_NO_RECORD);
            }
            // and then move cards from there to fill the discard stacks
            if (discard1.getSize() > 1) {
                moveCardToStack(discard1.getCardFromTop(1), discard2, OPTION_NO_RECORD);
                if (!cards.includes(discard2.getTopCard())) {
                    cards.push(discard2.getTopCard());
                    origin.push(discard1);
                }
            }
            if (!discard1.isEmpty()) {
                moveCardToStack(discard1.getTopCard(), discard3, OPTION_NO_RECORD);
                if (!cards.includes(discard3.getTopCard())) {
                    cards.push(discard3.getTopCard());
                    origin.push(discard1);
                }
            }
            // reverse order for the record
            const cardsReversed = [];
            const originReversed = [];
            for (let i = 0; i < cards.length; i++) {
                cardsReversed.push(cards[cards.length - 1 - i]);
                originReversed.push(origin[origin.length - 1 - i]);
            }
            if (!discard2.isEmpty()) {
                discard2.getTopCard().bringToFront();
            }
            if (!discard3.isEmpty()) {
                discard3.getTopCard().bringToFront();
            }
            // and add it IN FRONT of the last entry
            shared.recordList.addToLastEntry(cardsReversed, originReversed);
        }
    }
}
