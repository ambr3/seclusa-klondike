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
 * Direct port of
 * `app/src/main/java/de/tobiasbielefeld/solitaire/helper/EnsureMovability.java`.
 *
 * Filters new deals according to `DifficultyPolicy`. It uses `Game.hintTest()` to play
 * greedily; if not enough progress is found, a new game is dealt and the test restarts.
 *
 * The Android version ran this in an `AsyncTask` and showed a progress dialog. Here the
 * search is chunked across animation frames so the browser stays responsive and the
 * "waiting" dialog can be cancelled; `stopUiUpdates` is set for the whole search, exactly
 * like the Java code, so cards do not move visibly while they are being assigned.
 */
import { shared, moveToStackSingle } from './SharedData.js';
import * as DifficultyPolicy from './DifficultyPolicy.js';
const MAX_DEALS = 2000;
export class EnsureMovability {
    searchHook;
    paused = false;
    minPossibleMovements = 0;
    running = false;
    cancelled = false;
    /** Set by `pause()` so `resume()` knows the search still owes the player a deal. */
    wasRunning = false;
    constructor(searchHook) {
        this.searchHook = searchHook;
    }
    start(minPossibleMovements) {
        this.minPossibleMovements = minPossibleMovements;
        this.paused = false;
        this.cancelled = false;
        this.running = true;
        shared.uiHooks.setEnsureMovabilityDialog?.(true, minPossibleMovements);
        const difficulty = shared.prefs.getSavedDifficulty();
        const expertMinMoves = shared.prefs.getSavedEnsureMovabilityMinMoves();
        let counter = 0;
        let dealCounter = 0;
        let openingMoves = 0;
        let mainStackAlreadyFlipped = false;
        let currentDealOrder = [];
        let bestDealOrder = null;
        let bestScore = -1;
        const beginDealTracking = () => {
            currentDealOrder = shared.gameLogic.snapshotDealOrder();
            openingMoves = this.countOpeningMoves();
        };
        const considerBestDeal = (won) => {
            const score = DifficultyPolicy.dealScore(won, counter, this.countFoundationCards());
            if (score > bestScore) {
                bestScore = score;
                bestDealOrder = currentDealOrder.slice();
            }
        };
        const restoreBestDeal = () => {
            if (bestDealOrder !== null) {
                shared.gameLogic.applyDealOrder(bestDealOrder);
            }
        };
        const nextTry = (won) => {
            if (this.cancelled) {
                return;
            }
            considerBestDeal(won);
            counter = 0;
            dealCounter++;
            mainStackAlreadyFlipped = false;
            shared.gameLogic.newGameForEnsureMovability();
            beginDealTracking();
        };
        beginDealTracking();
        const step = () => {
            if (this.cancelled) {
                return;
            }
            let finished = false;
            if (dealCounter > MAX_DEALS) {
                restoreBestDeal();
                finished = true;
            }
            else {
                const won = shared.currentGame.winTest();
                if (DifficultyPolicy.isDealAcceptable(difficulty, counter, won, openingMoves, expertMinMoves)) {
                    finished = true;
                }
                else if (won) {
                    // Easy can win with a poor opening — keep it as fallback, then redeal
                    nextTry(true);
                }
                else {
                    const cardAndStack = shared.currentGame.hintTest([]);
                    if (cardAndStack !== null) {
                        const destination = cardAndStack.stack;
                        const card = cardAndStack.card;
                        const origin = card.getStack();
                        const startIndex = card.getIndexOnStack();
                        const cardsToMove = [];
                        for (let l = startIndex; l < origin.getSize(); l++) {
                            cardsToMove.push(origin.getCard(l));
                        }
                        moveToStackSingle(cardsToMove, destination, 0);
                        if (origin.getSize() > 0 &&
                            origin.getId() <= shared.currentGame.getLastTableauId() &&
                            !origin.getTopCard().isUp()) {
                            origin.getTopCard().flip();
                        }
                        shared.currentGame.testAfterMove();
                        mainStackAlreadyFlipped = false;
                        counter++;
                        // Fast-accept Medium/custom once the move floor is reached
                        if (counter >= this.minPossibleMovements &&
                            DifficultyPolicy.isDealAcceptable(difficulty, counter, false, openingMoves, expertMinMoves)) {
                            finished = true;
                        }
                    }
                    else if (shared.currentGame.hasMainStack()) {
                        const result = shared.currentGame.mainStackTouch();
                        if (result === 0 || (result === 2 && mainStackAlreadyFlipped)) {
                            nextTry(false);
                        }
                        else if (result === 2) {
                            mainStackAlreadyFlipped = true;
                        }
                    }
                    else {
                        nextTry(false);
                    }
                }
            }
            if (finished) {
                shared.stopUiUpdates = false;
                this.running = false;
                shared.uiHooks.setEnsureMovabilityDialog?.(false, 0);
                shared.gameLogic.redeal();
                return;
            }
            // Yield to the browser so the UI can paint the wait dialog and stay interactive.
            this.searchHook(step);
        };
        shared.stopUiUpdates = true;
        this.searchHook(step);
    }
    stop() {
        this.cancelled = true;
        this.running = false;
        shared.stopUiUpdates = false;
        shared.uiHooks.setEnsureMovabilityDialog?.(false, 0);
    }
    isRunning() {
        return this.running;
    }
    pause() {
        if (this.isRunning()) {
            this.paused = true;
            this.wasRunning = true;
            this.cancelled = true;
            shared.stopUiUpdates = false;
            shared.uiHooks.setEnsureMovabilityDialog?.(false, 0);
        }
    }
    resume() {
        if (this.paused) {
            this.paused = false;
            this.cancelled = false;
            /*
             * `step` is a closure created by `start()`, so a paused search has nothing left
             * to resume: the next frame sees `cancelled` and returns, and the game is left
             * half-dealt with `stopUiUpdates` false and no board. Backgrounding the tab
             * during a search therefore ended the game. Start the search over instead — it
             * is the same search, just begun again.
             */
            if (this.wasRunning) {
                this.wasRunning = false;
                // Re-deal first: the search moves cards around as it goes, so restarting
                // from the current board would resume mid-hint-playthrough with a counter
                // back at zero. `redealForEnsureMovability()` restores the deal order held
                // in `randomCards`, which the search never touches.
                shared.stopUiUpdates = true;
                shared.gameLogic.redealForEnsureMovability();
                this.start(this.minPossibleMovements);
            }
        }
    }
    countOpeningMoves() {
        const visited = [];
        let n = 0;
        let next = shared.currentGame.hintTest(visited);
        while (next !== null) {
            visited.push(next.card);
            n++;
            if (n > 40) {
                break;
            }
            next = shared.currentGame.hintTest(visited);
        }
        return n;
    }
    countFoundationCards() {
        if (!shared.currentGame.hasFoundationStacks()) {
            return 0;
        }
        let n = 0;
        for (let i = shared.currentGame.getLastTableauId() + 1; i <= shared.currentGame.getLastFoundationID(); i++) {
            n += shared.stacks[i].getSize();
        }
        return n;
    }
}
