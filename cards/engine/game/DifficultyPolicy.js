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
 * `app/src/main/java/de/tobiasbielefeld/solitaire/helper/DifficultyPolicy.java`.
 * Behaviour is intentionally identical; only the language changed.
 *
 * Tuned from a 20k-deal Klondike replay of the greedy hint bot:
 * median depth ~41 (draw-1) / ~25 (draw-3); old Medium (>=20) passed ~96% of deals.
 */
export const EASY = 'easy';
export const MEDIUM = 'medium';
export const HARD = 'hard';
/** Sentinel: Easy keeps searching until the hint bot wins (never reaches this count). */
export const WINNABLE_MOVES = 500;
/**
 * Medium needs a long greedy playthrough (around draw-1 median), not a trivial opener.
 * Wins also count.
 */
export const MEDIUM_MIN_MOVES = 40;
/** Easy also wants a few distinct plays available before anything is moved. */
export const EASY_MIN_OPENING_MOVES = 3;
/**
 * Easy/Medium filter deals; Hard is fully random; other values use the expert toggle.
 */
export function isEnsureMovabilityEnabled(difficulty, expertEnsureMovability) {
    if (difficulty === HARD) {
        return false;
    }
    if (difficulty === EASY || difficulty === MEDIUM) {
        return true;
    }
    return expertEnsureMovability;
}
/**
 * Easy aims for a hint-bot win; Medium uses at least {@link MEDIUM_MIN_MOVES};
 * otherwise the expert min-moves setting.
 */
export function minMovesForDifficulty(difficulty, expertMinMoves) {
    if (difficulty === EASY) {
        return WINNABLE_MOVES;
    }
    if (difficulty === MEDIUM) {
        return Math.max(MEDIUM_MIN_MOVES, expertMinMoves);
    }
    return expertMinMoves;
}
export function requiresWin(difficulty) {
    return difficulty === EASY;
}
export function minOpeningMoves(difficulty) {
    if (difficulty === EASY) {
        return EASY_MIN_OPENING_MOVES;
    }
    return 0;
}
/**
 * Whether a finished greedy playthrough is good enough to deal to the player.
 *
 * @param movesMade     hint-bot moves before getting stuck (or winning)
 * @param won           `winTest()` succeeded
 * @param openingMoves  distinct hint moves available on the fresh deal
 */
export function isDealAcceptable(difficulty, movesMade, won, openingMoves, expertMinMoves) {
    if (openingMoves < minOpeningMoves(difficulty)) {
        return false;
    }
    if (requiresWin(difficulty)) {
        return won;
    }
    const minMoves = minMovesForDifficulty(difficulty, expertMinMoves);
    return won || movesMade >= minMoves;
}
/**
 * Score for best-deal fallback when the deal budget is exhausted.
 * Higher is better; wins dominate depth.
 */
export function dealScore(won, movesMade, foundationCards) {
    if (won) {
        return 1_000_000 + movesMade;
    }
    return movesMade * 10 + foundationCards;
}
