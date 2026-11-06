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
 
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step).
 *
 * Derived from the TypeScript port of the Android app by Tobias Bielefeld
 * (GPL-3.0), which is itself derived from the original Java sources in
 * `Solitaire/app/src/main/java/de/tobiasbielefeld/solitaire/`. Type
 * annotations are dropped; naming, structure, comments and behaviour are
 * unchanged. The GPL-3.0 notice above must survive every further copy.
*/
export const OPTION_UNDO = 1;
export const OPTION_NO_RECORD = 2;
export const OPTION_REVERSED_RECORD = 3;
export const GAME = 'game';
export const WON_DIALOG = 'dialogWon';
const noop = () => {
    /* replaced during boot */
};
export const shared = {
    currentGame: undefined,
    /*
     * PORT: the concrete game class (Klondike or Pyramid), injected by the game folder's
     * entry point before `GameManager` is constructed. The Android app resolves this in
     * `LoadGame.loadClass()` from the saved game id instead.
     */
    gameFactory: null,
    /*
     * PORT: relative path prefix for `assets/`. The PWA used Vite's BASE_URL; inside the
     * launcher each game passes its own, e.g. `../cards/`. Set before anything loads.
     */
    assetBase: './',
    cards: [],
    stacks: [],
    prefs: undefined,
    scores: undefined,
    gameLogic: undefined,
    animate: undefined,
    autoComplete: undefined,
    timer: undefined,
    sounds: undefined,
    recordList: undefined,
    hint: undefined,
    dealCards: undefined,
    movingCards: undefined,
    ensureMovability: undefined,
    scheduler: undefined,
    stopUiUpdates: false,
    isDialogVisible: false,
    uiHooks: {
        post: noop,
        cancelPending: noop,
        toast: noop,
        isPaused: () => false,
        showWonDialog: noop,
    },
};
/** Mirrors `SharedData.leftHandedModeEnabled()`. */
export function leftHandedModeEnabled() {
    return shared.prefs.getSavedLeftHandedMode();
}
export function min(a, b) {
    return a < b ? a : b;
}
export function max(a, b) {
    return a > b ? a : b;
}
/**
 * Moves a single card to a stack.
 * Port of `SharedData.moveToStack(Card, Stack, int)`.
 */
export function moveCardToStack(card, destination, option) {
    moveToStack([card], [destination], option);
}
/** Port of `SharedData.moveToStack(Card, Stack)`. */
export function moveCardToStackDefault(card, destination) {
    moveCardToStack(card, destination, 0);
}
/** Port of `SharedData.moveToStack(ArrayList<Card>, Stack, int)`. */
export function moveToStackSingle(cards, destination, option) {
    moveToStack(cards, cards.map(() => destination), option);
}
/**
 * Moves multiple cards to multiple destinations, with an additional option.
 *
 * Mirrors `SharedData.moveToStack(ArrayList<Card>, ArrayList<Stack>, int)`:
 * change the score, add to the record list, move every card one by one, bring the
 * moving cards to front, and schedule the "after move" handlers.
 */
export function moveToStack(cards, destinations, option) {
    if (!shared.stopUiUpdates) {
        if (option === OPTION_UNDO) {
            shared.scores.undoMany(cards, destinations);
        }
        else if (option === 0) {
            shared.scores.moveMany(cards, destinations);
            shared.recordList.add(cards);
        }
        else if (option === OPTION_REVERSED_RECORD) {
            const cardsReversed = [];
            for (let i = 0; i < cards.length; i++) {
                cardsReversed.push(cards[cards.length - 1 - i]);
            }
            shared.recordList.add(cardsReversed);
            shared.scores.moveMany(cards, destinations);
        }
        // else if (OPTION_NO_RECORD), do nothing
    }
    for (let i = 0; i < cards.length; i++) {
        // this means to flip a card
        if (cards[i].getStack() === destinations[i]) {
            cards[i].flip();
        }
    }
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].getStack() !== destinations[i]) {
            cards[i].removeFromCurrentStack();
            destinations[i].addCard(cards[i]);
        }
    }
    for (const stack of destinations) {
        stack.updateSpacing();
    }
    for (const card of cards) {
        card.bringToFront();
    }
    // following stuff in handlers, because they should wait until possible card movements are over.
    if (option === 0 && !shared.stopUiUpdates) {
        shared.uiHooks.post(() => afterMoveHandlers(), 100);
    }
}
/**
 * PORT: Pyramid's `testAfterMove()` ends with `handlerTestAfterMove.sendDelayed()`, which
 * re-runs the whole "after move" chain once more (because the pair removal itself counts
 * as a move). `GameManager`'s handler is private to that class, so the chain is exposed
 * here instead — `moveToStack()` already posts the very same function.
 */
export function resendAfterMove() {
    if (!shared.stopUiUpdates) {
        shared.uiHooks.post(() => afterMoveHandlers(), 100);
    }
}

/** The `handlerTestAfterMove` body from `GameManager.onCreate`. */
function afterMoveHandlers() {
    if (!shared.gameLogic.hasWon()) {
        shared.currentGame.testAfterMove();
    }
    shared.uiHooks.post(() => shared.gameLogic.testIfWon(), 100);
    if (!shared.autoComplete.isRunning() && !shared.gameLogic.hasWon()) {
        shared.gameLogic.checkForAutoCompleteButton(false);
    }
}
