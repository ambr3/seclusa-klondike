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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/GameLogic.java`.
 *
 * Owns new game / redeal / save / load, the shuffle (`randomize`) and the win test.
 */
import { shared } from './SharedData.js';
import { Card } from './Card.js';
import { breakColorClumps } from './DeckShuffle.js';
import { prng } from '../util/prng.js';
import { Sounds } from './Sounds.js';
import { strings } from '../ui/strings.js';
export class GameLogic {
    /** array to shuffle the cards */
    randomCards = [];
    won = false;
    wonAndReloaded = false;
    movedFirstCard = false;
    /** Checks if the first card of a game has been moved. */
    checkFirstMovement() {
        if (!this.movedFirstCard) {
            this.movedFirstCard = true;
        }
    }
    /** Saves all relevant data of the current game so it can be loaded on resume. */
    save() {
        if (!shared.stopUiUpdates) {
            shared.scores.save();
            shared.recordList.save();
            shared.prefs.saveWon(this.won);
            shared.prefs.saveWonAndReloaded(this.wonAndReloaded);
            shared.prefs.saveMovedFirstCard(this.movedFirstCard);
            // Timer will be saved by the caller (GameManager.onPause)
            for (const stack of shared.stacks) {
                stack.save();
            }
            Card.save();
            this.saveRandomCards();
            shared.currentGame.save();
            shared.currentGame.saveRecycleCount();
            shared.prefs.backupGameData();
        }
    }
    setWonAndReloaded() {
        if (this.won) {
            this.wonAndReloaded = true;
        }
    }
    /**
     * Loads everything saved at the start of a game. If the last game has been won, every card
     * is put outside the screen. The main loading part is wrapped in a try/catch so a corrupt
     * save falls back to the backup, and only if that also fails does a new game start.
     */
    load(withoutMovement) {
        this.won = shared.prefs.isWon();
        this.wonAndReloaded = shared.prefs.isWonAndReloaded();
        this.movedFirstCard = shared.prefs.hasMovedFirstCard();
        /*
         * Android called `setWonAndReloaded()` when the player picked the game from the
         * menu after already winning. That call was never wired in the port, so
         * `wonAndReloaded` stayed false forever, the auto-start-new-game preference
         * (on by default) never fired, and every return to a won deal painted an empty
         * board with cards parked at (-5000, -5000). Every boot of this screen is the
         * menu path — the launcher (or a fresh tab) created a new GameManager — so mark
         * the reload here before `tryLoadSavedGame` decides whether to deal again.
         *
         * Gate on `hasSavedWon()`: a missing GameWon key still reads as won (Android's
         * DEFAULT_WON), and that must not trigger auto-start on a fresh install.
         */
        if (this.won && shared.prefs.hasSavedWon()) {
            this.setWonAndReloaded();
        }
        shared.animate.reset();
        shared.autoComplete.hideButton();
        if (!withoutMovement) {
            shared.sounds.playSound(Sounds.Names.DEAL_CARDS);
            for (const card of shared.cards) {
                card.setLocationWithoutMovement(shared.currentGame.getDealStack().getX(), shared.currentGame.getDealStack().getY());
                card.flipDown();
            }
        }
        if (!this.tryLoadSavedGame(withoutMovement)) {
            if (shared.prefs.restoreGameDataBackup()) {
                // the save was corrupt, but a backup of the last known good state exists
                this.won = shared.prefs.isWon();
                this.wonAndReloaded = shared.prefs.isWonAndReloaded();
                this.movedFirstCard = shared.prefs.hasMovedFirstCard();
                shared.uiHooks.toast(strings.game_load_recovered);
                if (!this.tryLoadSavedGame(withoutMovement)) {
                    shared.uiHooks.toast(strings.game_load_error);
                    this.newGame();
                }
            }
            else {
                // saved data may be corrupt (e.g. interrupted write, version change)
                shared.uiHooks.toast(strings.game_load_error);
                this.newGame();
            }
        }
    }
    tryLoadSavedGame(withoutMovement) {
        try {
            if (shared.prefs.isFirstRun()) {
                this.newGame();
                shared.prefs.saveFirstRun(false);
            }
            else if (this.wonAndReloaded && shared.prefs.getSavedAutoStartNewGame()) {
                // in case the game was selected from the main menu and it was already won, start a new game
                this.newGame();
            }
            else {
                shared.scores.load();
                shared.recordList.load();
                // Java: `timer.setCurrentTime(prefs.getSavedEndTime());` (GameLogic.java:151)
                //
                // DIVERGENCE FROM THE JAVA (deliberate). `saveEndTime()` writes
                // `System.currentTimeMillis()`, but `Timer.setCurrentTime()` takes *seconds*
                // (`HandlerTimer` computes `(System.currentTimeMillis() - startTime) / 1000`).
                // The Java line therefore seeds a millisecond epoch into a seconds field and
                // renders e.g. `Time: 497703760:47:02` — harmless on Android only because
                // `HandlerTimer` is re-armed independently of that gate and overwrites the value
                // on the very next tick.
                //
                // We keep the call and the intent ("seed the clock from the saved times") but
                // convert the units explicitly, so the first frame is already correct even if the
                // next tick is late or never arrives. `Timer.load()` recomputes `startTime` from
                // the same pair of values a moment later, so this is the seed, not the result.
                const savedEnd = shared.prefs.getSavedEndTime();
                const savedStart = shared.prefs.getSavedStartTime();
                shared.timer.setCurrentTime(savedEnd > 0 && savedStart > 0 ? Math.max(0, Math.trunc((savedEnd - savedStart) / 1000)) : 0);
                // load cards first, so their direction (up/down) is known for correct spacing
                Card.load();
                for (const stack of shared.stacks) {
                    stack.load(withoutMovement);
                }
                this.loadRandomCards();
                this.checkForAutoCompleteButton(withoutMovement);
                // load game dependent data
                shared.currentGame.load();
                shared.currentGame.loadRecycleCount();
            }
            return true;
        }
        catch {
            return false;
        }
    }
    checkForAutoCompleteButton(withoutMovement) {
        const shouldShow = !shared.prefs.getHideAutoCompleteButton() &&
            shared.currentGame.autoCompleteStartTest() &&
            !this.hasWon();
        if (shouldShow !== shared.autoComplete.buttonIsShown()) {
            if (shouldShow) {
                shared.autoComplete.showButton(withoutMovement);
            }
            else {
                shared.autoComplete.hideButton();
            }
        }
    }
    newGameForEnsureMovability() {
        shared.cards.forEach((card, i) => {
            this.randomCards[i] = card;
        });
        this.randomize(this.randomCards);
        this.redealForEnsureMovability();
    }
    /** Card ids in current deal order (for the EnsureMovability best-deal fallback). */
    snapshotDealOrder() {
        const ids = new Array(this.randomCards.length);
        for (let i = 0; i < this.randomCards.length; i++) {
            ids[i] = this.randomCards[i].getId();
        }
        return ids;
    }
    applyDealOrder(cardIds) {
        for (let i = 0; i < cardIds.length; i++) {
            this.randomCards[i] = shared.cards[cardIds[i]];
        }
    }
    /** Starts a new game. The only difference to a re-deal is the shuffling of the cards. */
    newGame() {
        shared.cards.forEach((card, i) => {
            this.randomCards[i] = card;
        });
        this.randomize(this.randomCards);
        if (shared.prefs.isEnsureMovabilityEnabledForCurrentGame()) {
            this.save();
            shared.stopUiUpdates = true;
            this.redealForEnsureMovability();
            shared.ensureMovability.start(shared.prefs.getSavedEnsureMovabilityMinMovesForCurrentGame());
        }
        else {
            this.redeal();
        }
    }
    setWon(value) {
        this.won = value;
    }
    /** Starts a new game, but with the same deal. */
    redealForEnsureMovability() {
        for (const stack of shared.stacks) {
            stack.reset();
        }
        for (const card of this.randomCards) {
            shared.currentGame.getDealStack().addCard(card);
            card.flipDown();
        }
        // to reset the recycle counter
        shared.currentGame.reset();
        shared.currentGame.dealNewGame();
    }
    /** Starts a new game, but with the same deal. */
    redeal() {
        // reset EVERYTHING
        if (!this.won) {
            // if the game has been won, the score was already saved
            this.incrementPlayedGames();
            shared.scores.addNewScore(this.movedFirstCard || shared.currentGame.saveRecentScore());
            shared.currentGame.onGameEnd();
        }
        shared.currentGame.reset();
        shared.animate.reset();
        shared.scores.reset();
        shared.movingCards.reset();
        shared.recordList.reset();
        shared.timer.reset();
        shared.autoComplete.hideButton();
        for (const stack of shared.stacks) {
            stack.reset();
        }
        // Put cards to the specified "deal from" stack
        for (const card of this.randomCards) {
            if (this.won) {
                card.setLocationWithoutMovement(shared.currentGame.getDealStack().getX(), shared.currentGame.getDealStack().getY());
            }
            else {
                card.setLocation(shared.currentGame.getDealStack().getX(), shared.currentGame.getDealStack().getY());
            }
            shared.currentGame.getDealStack().addCard(card);
            card.flipDown();
        }
        this.movedFirstCard = false;
        this.won = false;
        this.wonAndReloaded = false;
        if (shared.stopUiUpdates) {
            // no need to wait in the handler when stopUiUpdates is true
            shared.currentGame.dealNewGame();
        }
        else {
            // deal the cards from the game!
            shared.dealCards.start();
        }
    }
    /**
     * In case the current game is won: save the score and start the win animation. The record
     * list is reset, so the player can't revert card movements after the animation.
     */
    testIfWon() {
        if (!this.won && !shared.autoComplete.isRunning() && shared.currentGame.winTest()) {
            // Keep won/played counts aligned — only count a win when the game
            // also counted as played (player moved at least one card).
            this.incrementPlayedGames();
            if (this.movedFirstCard) {
                this.incrementNumberWonGames();
            }
            shared.scores.updateBonus();
            shared.scores.addNewScore(this.movedFirstCard);
            shared.recordList.reset();
            shared.timer.setWinningTime();
            shared.autoComplete.hideButton();
            shared.animate.winAnimation();
            this.won = true;
            shared.currentGame.onGameEnd();
        }
    }
    /**
     * Randomizes a given card array using the Fisher–Yates shuffle.
     * Port of `GameLogic.randomize(Card[])`.
     */
    randomize(array) {
        let index;
        let dummy;
        // swap first card outside the loop
        index = prng.nextInt(array.length);
        dummy = array[array.length - 1];
        array[array.length - 1] = array[index];
        array[index] = dummy;
        for (let i = array.length - 2; i > 0; i--) {
            if (shared.prefs.getSavedUseTrueRandomisation()) {
                index = prng.nextInt(i + 1);
            }
            else {
                // Avoid adjacent same value/color (clumps broken further in breakColorClumps).
                let counter = 0;
                do {
                    index = prng.nextInt(i + 1);
                    counter++;
                } while ((array[index].getValue() === array[i + 1].getValue() ||
                    array[index].getColor() === array[i + 1].getColor()) &&
                    counter < 20);
            }
            dummy = array[i];
            array[i] = array[index];
            array[index] = dummy;
        }
        if (!shared.prefs.getSavedUseTrueRandomisation()) {
            this.breakColorClumps(array);
        }
    }
    /**
     * Breaks runs of 4+ same colour in the shuffled deal so tableau openings are less likely
     * to be all-red or all-black blocks.
     */
    breakColorClumps(array) {
        breakColorClumps(array.length, (i) => array[i].getColor(), (a, b) => {
            const tmp = array[a];
            array[a] = array[b];
            array[b] = tmp;
        });
    }
    /** For left handed mode: mirrors the stacks to the other side. */
    mirrorStacks(layoutWidth) {
        if (shared.stacks != null) {
            for (const stack of shared.stacks) {
                stack.mirrorStack(layoutWidth);
            }
        }
        shared.uiHooks.updateLimitedRecyclesCounter?.();
        // change the arrow direction
        if (shared.currentGame.hasArrow()) {
            for (const stack of shared.stacks) {
                stack.applyArrow();
            }
        }
    }
    toggleRecycles(value) {
        shared.currentGame.toggleRecycles(value);
        shared.uiHooks.updateLimitedRecyclesCounter?.();
    }
    setNumberOfRecycles(key, defaultValue) {
        if (shared.currentGame.hasLimitedRecycles()) {
            shared.currentGame.setNumberOfRecycles(key, defaultValue);
        }
    }
    hasWon() {
        return this.won;
    }
    deleteStatistics() {
        shared.prefs.saveNumberOfWonGames(0);
        shared.prefs.saveNumberOfPlayedGames(0);
    }
    saveRandomCards() {
        const list = [];
        for (const card of this.randomCards) {
            list.push(card.getId());
        }
        shared.prefs.saveRandomCards(list);
    }
    loadRandomCards() {
        const list = shared.prefs.getSavedRandomCards();
        for (let i = 0; i < this.randomCards.length && i < list.length; i++) {
            this.randomCards[i] = shared.cards[list[i]];
        }
    }
    incrementPlayedGames() {
        if (this.movedFirstCard) {
            shared.prefs.saveNumberOfPlayedGames(shared.prefs.getSavedNumberOfPlayedGames() + 1);
        }
    }
    incrementNumberWonGames() {
        shared.prefs.saveNumberOfWonGames(shared.prefs.getSavedNumberOfWonGames() + 1);
    }
    /**
     * Tests if movements shouldn't be allowed. For example, if a hint is currently shown,
     * don't accept input, or otherwise something will go wrong.
     */
    stopConditions() {
        return (shared.autoComplete.isRunning() ||
            shared.animate.cardIsAnimating() ||
            shared.hint.isRunning() ||
            shared.recordList.isWorking() ||
            /*
             * The deal search is a background pass over the board and the player must not
             * touch it while it runs.
             *
             * It sets `stopUiUpdates`, which gates the *drawing* of card movement, and it
             * opens its progress dialog non-modally, so `shared.isDialogVisible` stays
             * false. Neither was enough: a drag was still accepted, and since the model's
             * `setLocation`/`bringToFront` are gated on `!stopUiUpdates`, the card moved in
             * the model but not on screen until the search ended and `redeal()` ran. This is
             * the default path, not an edge case -- ensure movability is always on at Easy
             * and Medium regardless of the expert toggle.
             */
            shared.ensureMovability.isRunning() ||
            shared.isDialogVisible);
    }
}
