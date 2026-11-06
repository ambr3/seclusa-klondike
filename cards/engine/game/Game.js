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
 * Port of the shared engine `app/src/main/java/de/tobiasbielefeld/solitaire/games/Game.java`.
 * Everything Klondike needs from the abstract base lives here: stack ids, layout maths,
 * `canCardBePlaced`, double-tap resolution, recycle counter and the scoring/test hooks
 * that concrete games implement.
 */
import { shared, min } from './SharedData.js';
import { Card } from './Card.js';
import { SpacingDirection } from './Stack.js';
import { Sounds } from './Sounds.js';
export var testMode;
(function (testMode) {
    testMode[testMode["SAME_COLOR"] = 0] = "SAME_COLOR";
    testMode[testMode["ALTERNATING_COLOR"] = 1] = "ALTERNATING_COLOR";
    testMode[testMode["DOESNT_MATTER"] = 2] = "DOESNT_MATTER";
    testMode[testMode["SAME_FAMILY"] = 3] = "SAME_FAMILY";
})(testMode || (testMode = {}));
export var testMode2;
(function (testMode2) {
    testMode2[testMode2["SAME_VALUE_AND_COLOR"] = 0] = "SAME_VALUE_AND_COLOR";
    testMode2[testMode2["SAME_VALUE_AND_FAMILY"] = 1] = "SAME_VALUE_AND_FAMILY";
    testMode2[testMode2["SAME_VALUE"] = 2] = "SAME_VALUE";
})(testMode2 || (testMode2 = {}));
export var testMode3;
(function (testMode3) {
    testMode3[testMode3["ASCENDING"] = 0] = "ASCENDING";
    testMode3[testMode3["DESCENDING"] = 1] = "DESCENDING";
})(testMode3 || (testMode3 = {}));
export class Game {
    /** Stack not visible on screen, used to remove cards from a game. */
    offScreenStack;
    cardDrawablesOrder = [1, 2, 3, 4];
    directions = null;
    directionBorders = null;
    discardStackIDs = [-1];
    mainStackIDs = [-1];
    hasLimitedRecyclesFlag = false;
    hasFoundationStacksFlag = false;
    hasMainStacks = false;
    hasDiscardStacks = false;
    firstMainStackID = -1;
    firstDiscardStackID = -1;
    dealFromID = -1;
    lastTableauID = -1;
    lastFoundationID = -1;
    recycleCounter = 0;
    totalRecycles = 0;
    textViewColor = 0;
    hasArrowFlag = false;
    singleTapEnabled = false;
    bonusEnabled = true;
    pointsInDollar = false;
    hideRecycleCounterFlag = false;
    hintCosts = 25;
    undoCosts = 25;
    recycleCounterCallback = null;
    // ---------------------------------------------------------------- lifecycle
    dealNewGame() {
        this.dealCards();
        this.load();
    }
    // -------------------------------------------------------------- overridable
    /** Called from onPause() of the game manager. */
    save() {
        /* nothing by default */
    }
    /** Gets executed when a game starts. */
    load() {
        /* nothing by default */
    }
    /** Gets executed after an undo movement. */
    afterUndo() {
        /* nothing by default */
    }
    /** Does stuff on game reset. */
    reset() {
        if (this.hasLimitedRecyclesFlag) {
            this.recycleCounter = 0;
            this.recycleCounterCallback?.();
        }
    }
    /** Tests when an autocomplete can be started. */
    autoCompleteStartTest() {
        return false;
    }
    /** First phase of the autocomplete (waits for animations to end). */
    autoCompletePhaseOne() {
        return null;
    }
    /** Second phase of the autocomplete (does not wait, accelerates). */
    autoCompletePhaseTwo() {
        return null;
    }
    saveRecentScore() {
        return false;
    }
    /** Return false to break `addNewScore()` so high scores are not saved. */
    processScore(_currentScore) {
        return true;
    }
    /** Reset additional statistics data, if any. */
    deleteAdditionalStatisticsData() {
        /* nothing by default */
    }
    /** Called when starting a new game, or when a game is won. */
    onGameEnd() {
        /* nothing by default */
    }
    /** Tests if the main stack got touched. */
    testIfMainStackTouched(X, Y) {
        for (const id of this.mainStackIDs) {
            if (shared.stacks[id].isOnLocation(X, Y)) {
                return true;
            }
        }
        return false;
    }
    /** If the game needs to execute code after every card movement. */
    testAfterMove() {
        /* nothing by default */
    }
    textViewSetColor(color) {
        this.textViewColor = color;
    }
    getTextViewColor() {
        return this.textViewColor;
    }
    // ----------------------------------------------------------- double tapping
    /** Called to test where the given card can be moved to. */
    doubleTap(card) {
        const destination = this.doubleTapTest(card);
        if (destination != null) {
            return { card, stack: destination };
        }
        return null;
    }
    /** Same as `doubleTap(Card)`, but for the whole stack (tiered from the first up card). */
    doubleTapStack(stack) {
        let cardAndStack = null;
        let destination = null;
        const firstUpCardPos = stack.getFirstUpCardPos();
        if (firstUpCardPos === -1) {
            return null;
        }
        for (let i = firstUpCardPos; i < stack.getSize(); i++) {
            if (this.addCardToMovementTest(stack.getCard(i))) {
                destination = this.doubleTapTest(stack.getCard(i));
            }
            if (destination != null) {
                if (destination.isEmpty()) {
                    if (cardAndStack === null) {
                        cardAndStack = { card: stack.getCard(i), stack: destination };
                    }
                }
                else {
                    cardAndStack = { card: stack.getCard(i), stack: destination };
                    break;
                }
            }
        }
        return cardAndStack;
    }
    // ------------------------------------------------------------ main stacking
    /**
     * The public main-stack touch: handles the limited-recycle counter, then delegates to
     * `onMainStackTouch()` and plays the matching sound. Port of `Game.mainStackTouch()`.
     */
    mainStackTouch() {
        if (this.hasLimitedRecycles() && this.getDealStack().isEmpty() && this.discardStacksContainCards()) {
            if (this.getRemainingNumberOfRecycles() === 0) {
                return 0;
            }
            this.incrementRecycleCounter();
        }
        const sound = this.onMainStackTouch();
        switch (sound) {
            case 1:
                shared.sounds.playSound(Sounds.Names.CARD_SET);
                break;
            case 2:
                shared.sounds.playSound(Sounds.Names.DEAL_CARDS);
                break;
            default:
                break;
        }
        return sound;
    }
    discardStacksContainCards() {
        for (const stack of this.getDiscardStacks()) {
            if (!stack.isEmpty()) {
                return true;
            }
        }
        return false;
    }
    // --------------------------------------------------------------- protected
    /**
     * Tests card from startPos to stack top if the cards are in the right order.
     * Port of `Game.testCardsUpToTop(Stack, int, testMode)`.
     */
    testCardsUpToTop(stack, startPos, mode) {
        for (let i = startPos; i < stack.getSize() - 1; i++) {
            const bottomCard = stack.getCard(i);
            const upperCard = stack.getCard(i + 1);
            if (!bottomCard.isUp() || !upperCard.isUp()) {
                return false;
            }
            switch (mode) {
                case testMode.ALTERNATING_COLOR:
                    if (bottomCard.getColor() % 2 === upperCard.getColor() % 2 ||
                        bottomCard.getValue() !== upperCard.getValue() + 1) {
                        return false;
                    }
                    break;
                case testMode.SAME_COLOR:
                    if (bottomCard.getColor() % 2 !== upperCard.getColor() % 2 ||
                        bottomCard.getValue() !== upperCard.getValue() + 1) {
                        return false;
                    }
                    break;
                case testMode.SAME_FAMILY:
                    if (bottomCard.getColor() !== upperCard.getColor() ||
                        bottomCard.getValue() !== upperCard.getValue() + 1) {
                        return false;
                    }
                    break;
                case testMode.DOESNT_MATTER:
                    if (bottomCard.getValue() !== upperCard.getValue() + 1) {
                        return false;
                    }
                    break;
            }
        }
        return true;
    }
    /** Sets the number of limited recycles for this game. -1 disables them. */
    setLimitedRecycles(number) {
        if (number >= 0) {
            this.hasLimitedRecyclesFlag = true;
            this.totalRecycles = number;
            this.hideRecycleCounterFlag = number === 0;
        }
        else {
            this.hasLimitedRecyclesFlag = false;
        }
    }
    /**
     * Sets card width according to the two limiting values.
     * Port of `Game.setUpCardWidth(RelativeLayout, boolean, int, int)`.
     */
    setUpCardWidth(layout, portraitValue, landscapeValue) {
        const cardsInRow = layout.isLandscape ? landscapeValue : portraitValue;
        // Phone landscape: height-fit like setUpCardDimensions (tablets keep width-only).
        if (layout.isLandscape && this.isPhoneLandscape(layout)) {
            this.setUpCardDimensions(layout, cardsInRow, Game.PHONE_LANDSCAPE_MIN_CARD_COLUMNS);
            return;
        }
        Card.width = layout.width / cardsInRow;
        Card.height = Math.trunc(Card.width * 1.5);
        // Width-only games (Klondike) need a tighter desktop ceiling than height-fit
        // games (Pyramid); phones stay under either cap and are unchanged.
        if (Card.width > Game.MAX_CARD_WIDTH_WIDTH_FIT) {
            Card.width = Game.MAX_CARD_WIDTH_WIDTH_FIT;
            Card.height = Math.trunc(Card.width * 1.5);
        }
    }
    /** Min card-heights that must fit on a phone in landscape (foundation + tableau + chrome). */
    static PHONE_LANDSCAPE_MIN_CARD_COLUMNS = 4;
    /**
     * Cap for height-fit layouts (Pyramid). Rarely hit; phone/tablet are width-limited
     * first. Kept separate so Pyramid can stay at the size that already looks right.
     */
    static MAX_CARD_WIDTH = 150;
    /** Cap for width-only layouts (Klondike) — desktop was oversized at the shared 150. */
    static MAX_CARD_WIDTH_WIDTH_FIT = 120;
    isPhoneLandscape(layout) {
        return !layout.isLargeTablet && layout.isLandscape;
    }
    /**
     * Sets up the dimensions so everything fits on screen.
     * Port of `Game.setUpCardDimensions(RelativeLayout, int, int)`.
     */
    setUpCardDimensions(layout, cardsInRow, cardsInColumn) {
        let columnLimit = cardsInColumn;
        if (this.isPhoneLandscape(layout)) {
            columnLimit = Math.max(cardsInColumn, Game.PHONE_LANDSCAPE_MIN_CARD_COLUMNS);
        }
        const testWidth1 = layout.width / cardsInRow;
        const testHeight1 = Math.trunc(testWidth1 * 1.5);
        const testHeight2 = layout.height / columnLimit;
        const testWidth2 = Math.trunc(testHeight2 / 1.5);
        if (testHeight1 < testHeight2) {
            Card.width = testWidth1;
            Card.height = testHeight1;
        }
        else {
            Card.width = testWidth2;
            Card.height = testHeight2;
        }
        if (Card.width > Game.MAX_CARD_WIDTH) {
            Card.width = Game.MAX_CARD_WIDTH;
            Card.height = Math.trunc(Card.width * 1.5);
        }
    }
    /**
     * Returns the calculated horizontal spacing for the layout.
     * Port of `Game.setUpHorizontalSpacing(...)`.
     */
    setUpHorizontalSpacing(layout, numberOfCards, divider) {
        return min(Card.width / 2, (layout.width - numberOfCards * Card.width) / divider);
    }
    /** Port of `Game.setUpVerticalSpacing(...)`. */
    setUpVerticalSpacing(layout, numberOfCards, divider) {
        return min(Card.width / 2, (layout.height - numberOfCards * Card.height) / divider);
    }
    setNumberOfDecks(number) {
        shared.cards = new Array(52 * number);
        shared.gameLogic.randomCards = new Array(shared.cards.length);
    }
    setNumberOfStacks(number) {
        shared.stacks = new Array(number);
    }
    setMainStackIDs(...IDs) {
        this.hasMainStacks = true;
        this.mainStackIDs = IDs;
        this.dealFromID = IDs[0];
        this.firstMainStackID = this.dealFromID;
    }
    setFoundationStackIDs(...IDs) {
        this.hasFoundationStacksFlag = true;
        this.lastFoundationID = IDs[IDs.length - 1];
    }
    setTableauStackIDs(...IDs) {
        this.lastTableauID = IDs[IDs.length - 1];
    }
    setDiscardStackIDs(...IDs) {
        this.discardStackIDs = IDs;
        this.firstDiscardStackID = IDs[0];
        this.hasDiscardStacks = true;
    }
    setDealFromID(id) {
        this.dealFromID = id;
    }
    disableMainStack() {
        this.mainStackIDs = [-1];
        this.hasMainStacks = false;
    }
    /** Sets the direction in which the cards on a stack are stacked. */
    setDirections(...newDirections) {
        this.directions = newDirections.map((d) => {
            switch (d) {
                case 1:
                    return SpacingDirection.DOWN;
                case 2:
                    return SpacingDirection.UP;
                case 3:
                    return SpacingDirection.LEFT;
                case 4:
                    return SpacingDirection.RIGHT;
                case 0:
                default:
                    return SpacingDirection.NONE;
            }
        });
    }
    setDirectionBorders(...stackIDs) {
        this.directionBorders = stackIDs;
    }
    /** Sets the background of a stack to an arrow (left-handed mode reverses it). */
    setArrow(stack) {
        this.hasArrowFlag = true;
        stack.setArrow('LEFT');
    }
    /** Sets the card families (1..4) used for this game. */
    setCardFamilies(p1, p2, p3, p4) {
        if (p1 < 1 || p2 < 1 || p3 < 1 || p4 < 1 || p1 > 4 || p2 > 4 || p3 > 4 || p4 > 4) {
            throw new Error('Card families can be between 1 and 4');
        }
        this.cardDrawablesOrder = [p1, p2, p3, p4];
    }
    /**
     * Tests if the given card is above the same card as the top card on the other stack.
     * Port of `Game.sameCardOnOtherStack(Card, Stack, testMode2)`.
     */
    sameCardOnOtherStack(card, otherStack, mode) {
        const origin = card.getStack();
        if (card.getIndexOnStack() > 0 && origin.getCard(card.getIndexOnStack() - 1).isUp() && otherStack.getSize() > 0) {
            const cardBelow = origin.getCard(card.getIndexOnStack() - 1);
            const otherTop = otherStack.getTopCard();
            if (mode === testMode2.SAME_VALUE_AND_COLOR) {
                return cardBelow.getValue() === otherTop.getValue() && cardBelow.getColor() % 2 === otherTop.getColor() % 2;
            }
            else if (mode === testMode2.SAME_VALUE_AND_FAMILY) {
                return cardBelow.getValue() === otherTop.getValue() && cardBelow.getColor() === otherTop.getColor();
            }
            else if (mode === testMode2.SAME_VALUE) {
                return cardBelow.getValue() === otherTop.getValue();
            }
        }
        return false;
    }
    /** True if the same card was moved from `destination` very recently (hint anti-loop). */
    movementDoneRecently(card, destination) {
        const entries = shared.recordList.entries;
        for (let i = entries.length - 1; i >= entries.length - 5 && i >= 0; i--) {
            const entry = entries[i];
            for (let j = 0; j < entry.currentCards.length; j++) {
                if (card === entry.currentCards[j] && destination === entry.currentOrigins[j]) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Applies the direction borders set using `setDirectionBorders()`.
     * Port of `Game.applyDirectionBorders(RelativeLayout)`.
     */
    applyDirectionBorders(layout) {
        if (this.directionBorders != null) {
            for (let i = 0; i < this.directionBorders.length; i++) {
                if (this.directionBorders[i] !== -1) {
                    shared.stacks[i].setSpacingMax(this.directionBorders[i]);
                }
                else {
                    shared.stacks[i].setSpacingMaxToLayout(layout.width, layout.height);
                }
            }
        }
        else {
            for (const stack of shared.stacks) {
                stack.setSpacingMaxToLayout(layout.width, layout.height);
            }
        }
    }
    /**
     * If no card could be found, try to move the longest correct sequence from the stacks to
     * an empty one. Port of `Game.findBestSequenceToMoveToEmptyStack(testMode)`.
     */
    findBestSequenceToMoveToEmptyStack(mode) {
        let cardToMove = null;
        let sequenceLength = 0;
        let emptyStack = null;
        const lastTableau = this.getLastTableauId();
        if (lastTableau < 0) {
            return null;
        }
        for (let i = 0; i <= lastTableau; i++) {
            if (shared.stacks[i].isEmpty()) {
                emptyStack = shared.stacks[i];
            }
        }
        if (emptyStack === null) {
            return null;
        }
        for (let i = 0; i <= lastTableau; i++) {
            const sourceStack = shared.stacks[i];
            if (sourceStack.isEmpty()) {
                continue;
            }
            const firstUpCardPos = sourceStack.getFirstUpCardPos();
            if (firstUpCardPos === -1) {
                continue;
            }
            for (let j = firstUpCardPos; j < sourceStack.getSize(); j++) {
                if (this.testCardsUpToTop(sourceStack, j, mode)) {
                    const card = sourceStack.getCard(j);
                    if (j !== 0 && this.cardTest(emptyStack, card)) {
                        const length = sourceStack.getSize() - j;
                        if (length > sequenceLength) {
                            cardToMove = card;
                            sequenceLength = length;
                        }
                    }
                    break;
                }
            }
        }
        if (cardToMove !== null && !this.movementDoneRecently(cardToMove, emptyStack)) {
            return { card: cardToMove, stack: emptyStack };
        }
        return null;
    }
    /** Formula courtesy of matejx, used by the games that need power-move maths. */
    getPowerMoveCount(cellIDs, stackIDs, movingToEmptyStack) {
        let numberOfFreeCells = 0;
        let numberOfFreeTableauStacks = 0;
        for (const id of cellIDs) {
            if (shared.stacks[id].isEmpty()) {
                numberOfFreeCells++;
            }
        }
        for (const id of stackIDs) {
            if (shared.stacks[id].isEmpty()) {
                numberOfFreeTableauStacks++;
            }
        }
        if (movingToEmptyStack && numberOfFreeTableauStacks > 0) {
            numberOfFreeTableauStacks--;
        }
        return (numberOfFreeCells + 1) * (1 << numberOfFreeTableauStacks);
    }
    /** Little overload so `wrap` does not have to be specified (defaults to false). */
    canCardBePlaced(stack, card, mode, direction) {
        return this.canCardBePlacedWithWrap(stack, card, mode, direction, false);
    }
    /** Port of `Game.canCardBePlaced(..., boolean wrap)`. */
    canCardBePlacedWithWrap(stack, card, mode, direction, wrap) {
        if (stack.isEmpty()) {
            return true;
        }
        const topCardColor = stack.getTopCard().getColor();
        const topCardValue = stack.getTopCard().getValue();
        const cardColor = card.getColor();
        const cardValue = card.getValue();
        if (direction === testMode3.DESCENDING) {
            switch (mode) {
                case testMode.SAME_COLOR:
                    return topCardColor % 2 === cardColor % 2 && (topCardValue === cardValue + 1 || (wrap && topCardValue === 1 && cardValue === 13));
                case testMode.ALTERNATING_COLOR:
                    return topCardColor % 2 !== cardColor % 2 && (topCardValue === cardValue + 1 || (wrap && topCardValue === 1 && cardValue === 13));
                case testMode.SAME_FAMILY:
                    return topCardColor === cardColor && (topCardValue === cardValue + 1 || (wrap && topCardValue === 1 && cardValue === 13));
                case testMode.DOESNT_MATTER:
                    return topCardValue === cardValue + 1 || (wrap && topCardValue === 1 && cardValue === 13);
            }
        }
        else {
            switch (mode) {
                case testMode.SAME_COLOR:
                    return topCardColor % 2 === cardColor % 2 && (topCardValue === cardValue - 1 || (wrap && topCardValue === 13 && cardValue === 1));
                case testMode.ALTERNATING_COLOR:
                    return topCardColor % 2 !== cardColor % 2 && (topCardValue === cardValue - 1 || (wrap && topCardValue === 13 && cardValue === 1));
                case testMode.SAME_FAMILY:
                    return topCardColor === cardColor && (topCardValue === cardValue - 1 || (wrap && topCardValue === 13 && cardValue === 1));
                case testMode.DOESNT_MATTER:
                    return topCardValue === cardValue - 1 || (wrap && topCardValue === 13 && cardValue === 1);
            }
        }
        return false; // can't be reached
    }
    disableBonus() {
        this.bonusEnabled = false;
    }
    setPointsInDollar() {
        this.pointsInDollar = true;
    }
    setUndoCosts(costs) {
        this.undoCosts = costs;
    }
    setHintCosts(costs) {
        this.hintCosts = costs;
    }
    setSingleTapEnabled() {
        this.singleTapEnabled = true;
    }
    // ---------------------------------------------------------------- getters
    getMainStack() {
        if (this.mainStackIDs[0] === -1) {
            throw new Error('No main stack specified');
        }
        return shared.stacks[this.mainStackIDs[0]];
    }
    getLastTableauId() {
        if (this.lastTableauID === -1) {
            throw new Error('No last tableau stack specified');
        }
        return this.lastTableauID;
    }
    getLastTableauStack() {
        return shared.stacks[this.lastTableauID];
    }
    getLastFoundationID() {
        return this.lastFoundationID;
    }
    getDiscardStack() {
        if (this.firstDiscardStackID === -1) {
            throw new Error('No discard stack specified');
        }
        return shared.stacks[this.firstDiscardStackID];
    }
    getDiscardStacks() {
        return this.discardStackIDs.map((id) => {
            if (id === -1) {
                throw new Error('No discard stack specified');
            }
            return shared.stacks[id];
        });
    }
    getDealStack() {
        return shared.stacks[this.dealFromID];
    }
    hasMainStack() {
        return this.hasMainStacks;
    }
    hasDiscardStack() {
        return this.hasDiscardStacks;
    }
    hasLimitedRecycles() {
        return this.hasLimitedRecyclesFlag;
    }
    hasFoundationStacks() {
        return this.hasFoundationStacksFlag;
    }
    getRemainingNumberOfRecycles() {
        const remaining = this.totalRecycles - this.recycleCounter;
        return remaining > 0 ? remaining : 0;
    }
    incrementRecycleCounter() {
        this.recycleCounter++;
        this.recycleCounterCallback?.();
    }
    decrementRecycleCounter() {
        this.recycleCounter--;
        this.recycleCounterCallback?.();
    }
    saveRecycleCount() {
        shared.prefs.saveRedealCount(this.recycleCounter);
    }
    loadRecycleCount() {
        this.recycleCounter = shared.prefs.getSavedRecycleCounter(this.totalRecycles);
        this.recycleCounterCallback?.();
    }
    hasArrow() {
        return this.hasArrowFlag;
    }
    toggleRecycles(value) {
        this.hasLimitedRecyclesFlag = value;
    }
    isSingleTapEnabled() {
        return this.singleTapEnabled && shared.prefs.getSavedSingleTapSpecialGames();
    }
    flipAllCardsUp() {
        for (const card of shared.cards) {
            card.flipUp();
        }
    }
    isBonusEnabled() {
        return this.bonusEnabled;
    }
    isPointsInDollar() {
        return this.pointsInDollar;
    }
    getUndoCosts() {
        return this.undoCosts;
    }
    getHintCosts() {
        return this.hintCosts;
    }
    mainStacksContain(id) {
        return this.hasMainStack() && id >= this.firstMainStackID;
    }
    discardStacksContain(id) {
        return this.hasDiscardStack() && id >= this.firstDiscardStackID && id < this.firstMainStackID;
    }
    hidesRecycleCounter() {
        return this.hideRecycleCounterFlag;
    }
    tableauStacksContain(ID) {
        return ID <= this.getLastTableauId();
    }
    foundationStacksContain(ID) {
        return this.hasFoundationStacksFlag && ID > this.getLastTableauId() && ID <= this.getLastFoundationID();
    }
    addCardToMovementTest(card) {
        return this.addCardToMovementGameTest(card);
    }
    setRecycleCounterCallback(callback) {
        this.recycleCounterCallback = callback;
    }
    setNumberOfRecycles(key, defaultValue) {
        const recycles = shared.prefs.getSavedNumberOfRecycles(key, defaultValue);
        this.setLimitedRecycles(recycles);
        this.recycleCounterCallback?.();
    }
    hintTestDefault() {
        return this.hintTest([]);
    }
    setOffScreenStack() {
        this.offScreenStack.setX(-2 * Card.width);
        this.offScreenStack.setY(-2 * Card.height);
    }
}
