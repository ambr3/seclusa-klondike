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
 * PORT TO JAVASCRIPT of `app/src/test/java/.../helper/DeckShuffleTest.java`.
 * Test names and assertions mirror the JUnit test 1:1 so the two suites stay comparable.
 */

import { describe, expect, it } from './runner.js';
import { breakColorClumpsInPlace, hasColorClumpOfFour } from '../cards/engine/game/DeckShuffle.js';

describe('DeckShuffle', () => {
    it('breaksFourSameColourRunWhenLaterDifferentColourExists', () => {
        const colors = [0, 0, 0, 0, 1, 1];
        expect(hasColorClumpOfFour(colors)).toBe(true);

        breakColorClumpsInPlace(colors);

        expect(hasColorClumpOfFour(colors)).toBe(false);
        expect(colors).toEqual([0, 0, 0, 1, 0, 1]);
    });

    it('leavesDeckAloneWhenNoAlternateColourExists', () => {
        const colors = [1, 1, 1, 1, 1];
        breakColorClumpsInPlace(colors);
        expect(colors).toEqual([1, 1, 1, 1, 1]);
        expect(hasColorClumpOfFour(colors)).toBe(true);
    });

    it('ignoresRunsShorterThanFour', () => {
        const colors = [0, 0, 0, 1, 1, 1, 0];
        const original = colors.slice();
        breakColorClumpsInPlace(colors);
        expect(colors).toEqual(original);
        expect(hasColorClumpOfFour(colors)).toBe(false);
    });

    it('breaksMultipleClumps', () => {
        const colors = [0, 0, 0, 0, 1, 1, 1, 1, 0];
        breakColorClumpsInPlace(colors);
        expect(hasColorClumpOfFour(colors)).toBe(false);
    });
});