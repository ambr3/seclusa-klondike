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
 * PORT TO JAVASCRIPT of `app/src/test/java/.../helper/DifficultyPolicyTest.java`.
 * Test names and assertions mirror the JUnit test 1:1 so the two suites stay comparable.
 */

import { describe, expect, it } from './runner.js';
import {
    EASY,
    HARD,
    MEDIUM,
    MEDIUM_MIN_MOVES,
    WINNABLE_MOVES,
    dealScore,
    isDealAcceptable,
    isEnsureMovabilityEnabled,
    minMovesForDifficulty,
    minOpeningMoves,
    requiresWin,
} from '../cards/engine/game/DifficultyPolicy.js';

describe('DifficultyPolicy', () => {
    it('easyAndMediumEnableEnsureMovability', () => {
        expect(isEnsureMovabilityEnabled(EASY, false)).toBe(true);
        expect(isEnsureMovabilityEnabled(MEDIUM, false)).toBe(true);
    });

    it('hardDisablesEnsureMovability', () => {
        expect(isEnsureMovabilityEnabled(HARD, true)).toBe(false);
        expect(isEnsureMovabilityEnabled(HARD, false)).toBe(false);
    });

    it('customDifficultyUsesExpertToggle', () => {
        expect(isEnsureMovabilityEnabled('custom', true)).toBe(true);
        expect(isEnsureMovabilityEnabled('custom', false)).toBe(false);
    });

    it('easyUsesWinnableMoveTarget', () => {
        expect(minMovesForDifficulty(EASY, 10)).toBe(WINNABLE_MOVES);
    });

    it('mediumUsesAtLeastFortyMoves', () => {
        expect(minMovesForDifficulty(MEDIUM, 10)).toBe(40);
        expect(MEDIUM_MIN_MOVES).toBe(40);
        expect(minMovesForDifficulty(MEDIUM, 45)).toBe(45);
    });

    it('hardAndCustomUseExpertMinMoves', () => {
        expect(minMovesForDifficulty(HARD, 10)).toBe(10);
        expect(minMovesForDifficulty('custom', 12)).toBe(12);
    });

    it('easyRequiresWinAndOpeningMoves', () => {
        expect(requiresWin(EASY)).toBe(true);
        expect(minOpeningMoves(EASY)).toBe(3);
        expect(isDealAcceptable(EASY, 80, true, 2, 10)).toBe(false);
        expect(isDealAcceptable(EASY, 80, true, 3, 10)).toBe(true);
        expect(isDealAcceptable(EASY, 80, false, 5, 10)).toBe(false);
    });

    it('mediumAcceptsLongPlayOrWin', () => {
        expect(isDealAcceptable(MEDIUM, 20, false, 0, 10)).toBe(false);
        expect(isDealAcceptable(MEDIUM, 40, false, 0, 10)).toBe(true);
        expect(isDealAcceptable(MEDIUM, 10, true, 0, 10)).toBe(true);
    });

    it('dealScorePrefersWins', () => {
        expect(dealScore(true, 10, 0)).toBeGreaterThan(dealScore(false, 200, 52));
        expect(dealScore(false, 30, 5)).toBeGreaterThan(dealScore(false, 30, 0));
    });
});