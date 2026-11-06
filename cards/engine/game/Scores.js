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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Scores.java`.
 */
import { shared } from './SharedData.js';
import { MAX_SAVED_SCORES } from './Preferences.js';
export class Scores {
    score = 0;
    preBonus = 0;
    bonus = 0;
    savedHighScores = emptyScores();
    savedRecentScores = emptyScores();
    callback = () => undefined;
    move(card, stack) {
        this.moveMany([card], [stack]);
    }
    moveMany(cards, stacks) {
        const originIDs = [];
        const destinationIDs = [];
        for (let i = 0; i < cards.length; i++) {
            originIDs[i] = cards[i].getStackId();
            destinationIDs[i] = stacks[i].getId();
        }
        const points = shared.currentGame.addPointsToScore(cards, originIDs, destinationIDs, false);
        this.update(points);
    }
    undo(card, stack) {
        this.undoMany([card], [stack]);
    }
    undoMany(cards, stacks) {
        const originIDs = [];
        const destinationIDs = [];
        for (let i = 0; i < cards.length; i++) {
            originIDs[i] = cards[i].getStackId();
            destinationIDs[i] = stacks[i].getId();
        }
        const points = -shared.currentGame.addPointsToScore(cards, destinationIDs, originIDs, true);
        this.update(points);
    }
    /** Updates the current score, but only if the game hasn't been won. */
    update(points) {
        if (shared.gameLogic.hasWon()) {
            return;
        }
        this.score += points;
        this.output();
    }
    /** Adds a bonus to the score, used after a game has been won. */
    updateBonus() {
        const currentTime = shared.timer.getCurrentTime(); // in seconds
        this.preBonus = this.score;
        if (shared.currentGame.isBonusEnabled() && currentTime > 0 && this.score > 0) {
            this.bonus = 20 * Math.floor(this.score / currentTime);
            this.update(this.bonus);
        }
        else {
            this.bonus = 0;
        }
    }
    save() {
        shared.prefs.saveScore(this.score);
    }
    /**
     * Adds a new high score. The new score is inserted at the last position and moved towards
     * the highest score until it is in the correct position.
     * Port of `Scores.addNewHighScore(long, long)`.
     */
    addNewHighScore(newScore, timeTaken) {
        if (!shared.currentGame.processScore(newScore) || newScore <= 0) {
            return;
        }
        const systemTime = Date.now();
        let index = MAX_SAVED_SCORES - 1;
        // Override the last score when the new score is larger, or the score is equal but the
        // time is less than or equal, or the saved score is zero (empty).
        if (newScore > this.savedHighScores[index][0] ||
            (newScore === this.savedHighScores[index][0] && timeTaken <= this.savedHighScores[index][1])) {
            this.savedHighScores[index] = [newScore, timeTaken, systemTime];
            while (index > 0 &&
                (this.savedHighScores[index - 1][0] === 0 ||
                    this.savedHighScores[index - 1][0] < this.savedHighScores[index][0] ||
                    (this.savedHighScores[index - 1][0] === this.savedHighScores[index][0] &&
                        this.savedHighScores[index - 1][1] >= this.savedHighScores[index][1]))) {
                const dummy = this.savedHighScores[index];
                this.savedHighScores[index] = this.savedHighScores[index - 1];
                this.savedHighScores[index - 1] = dummy;
                index--;
            }
            shared.prefs.saveHighScores(this.savedHighScores);
        }
    }
    /** Port of `Scores.addNewRecentScore(long, long)`. */
    addNewRecentScore(newScore, timeTaken) {
        if (!shared.currentGame.processScore(newScore)) {
            return;
        }
        const systemTime = Date.now();
        let index = MAX_SAVED_SCORES - 1;
        // move every entry one position to the right, so the last one is overridden
        while (index > 0) {
            this.savedRecentScores[index] = this.savedRecentScores[index - 1];
            index--;
        }
        this.savedRecentScores[0] = [newScore, timeTaken, systemTime];
        shared.prefs.saveRecentScores(this.savedRecentScores);
    }
    addNewScore(savesRecentScore) {
        const time = shared.timer.getCurrentTime();
        this.addNewHighScore(this.score, time);
        if (savesRecentScore) {
            this.addNewRecentScore(this.score, time);
        }
        this.setTotalTimePlayed(time);
        this.setTotalPointsEarned(this.score);
    }
    load() {
        this.score = shared.prefs.getSavedScore();
        this.output();
        this.savedHighScores = shared.prefs.getSavedHighScores();
        this.savedRecentScores = shared.prefs.getSavedRecentScores();
    }
    reset() {
        this.score = 0;
        this.preBonus = 0;
        this.bonus = 0;
        this.output();
    }
    deleteScores() {
        this.savedHighScores = emptyScores();
        this.savedRecentScores = emptyScores();
        shared.prefs.saveHighScores(this.savedHighScores);
        shared.prefs.saveRecentScores(this.savedRecentScores);
        shared.prefs.saveTotalTimePlayed(0);
        shared.prefs.saveTotalHintsShown(0);
        shared.prefs.saveTotalNumberUndos(0);
        shared.prefs.saveTotalPointsEarned(0);
    }
    /** 0 = score, 1 = time taken, 2 = date */
    getHighScore(i, j) {
        return this.savedHighScores[i][j];
    }
    getRecentScore(i, j) {
        return this.savedRecentScores[i][j];
    }
    output() {
        const dollar = shared.currentGame.isPointsInDollar() ? '$' : '';
        this.callback(this.score, dollar);
    }
    setTotalTimePlayed(time) {
        shared.prefs.saveTotalTimePlayed(shared.prefs.getSavedTotalTimePlayed() + time);
    }
    setTotalPointsEarned(score) {
        if (score < 0) {
            return;
        }
        shared.prefs.saveTotalPointsEarned(shared.prefs.getSavedTotalPointsEarned() + score);
    }
    getScore() {
        return this.score;
    }
    getPreBonus() {
        return this.preBonus;
    }
    getBonus() {
        return this.bonus;
    }
    setCallback(callback) {
        this.callback = callback;
    }
}
function emptyScores() {
    return new Array(MAX_SAVED_SCORES).fill(0).map(() => [0, 0, 0]);
}
