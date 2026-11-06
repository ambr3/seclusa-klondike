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
/**
 * Breaks runs of 4+ same colour by swapping the 4th card with a later different colour.
 */
export function breakColorClumps(length, colorAt, swap) {
    for (let i = 0; i < length - 3; i++) {
        const color = colorAt(i);
        if (colorAt(i + 1) !== color || colorAt(i + 2) !== color || colorAt(i + 3) !== color) {
            continue;
        }
        for (let j = i + 4; j < length; j++) {
            if (colorAt(j) !== color) {
                swap(i + 3, j);
                break;
            }
        }
    }
}
/** Convenience overload for tests / plain int colour arrays (in place). */
export function breakColorClumpsInPlace(colors) {
    breakColorClumps(colors.length, (i) => colors[i], (a, b) => {
        const tmp = colors[a];
        colors[a] = colors[b];
        colors[b] = tmp;
    });
}
/** True if any run of 4 identical colours remains. */
export function hasColorClumpOfFour(colors) {
    for (let i = 0; i < colors.length - 3; i++) {
        const color = colors[i];
        if (colors[i + 1] === color && colors[i + 2] === color && colors[i + 3] === color) {
            return true;
        }
    }
    return false;
}
