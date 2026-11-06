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
 * PORT TO JAVASCRIPT — colour conversion helpers from `engine/ui/theme.js`.
 *
 * Android colour resources and preferences are ARGB ints (`0xAARRGGBB`) while CSS hex is
 * `#RRGGBBAA`. These tests pin the conversion so the score and time chips cannot silently
 * go transparent again.
 */

import { describe, expect, it } from './runner.js';
import { argbToCss, resolveUiTextColor } from '../cards/engine/ui/theme.js';

describe('argbToCss', () => {
    it('renders opaque black as #000000, not #ff000000', () => {
        // DEFAULT_TEXT_COLOR in helper/Preferences.java is 0xff000000.
        expect(argbToCss(0xff000000)).toBe('#000000');
    });

    it('keeps the channel order of opaque colours', () => {
        expect(argbToCss(0xff455a64)).toBe('#455a64'); // menuBarLabel, values/colors.xml
        expect(argbToCss(0xfff2f4f5)).toBe('#f2f4f5'); // menuBarLabel, values-night/colors.xml
    });

    it('converts the alpha channel to rgba rather than swapping it in', () => {
        expect(argbToCss(0x801affff)).toBe('rgba(26, 255, 255, 0.5020)');
    });

    it('never emits 8-digit hex, which CSS would read as RGBA', () => {
        for (const color of [0xff000000, 0xff123456, 0x00112233, 0xcc1a1a1a]) {
            expect(argbToCss(color)).not.toMatch(/^#[0-9a-f]{8}$/);
        }
    });
});

describe('resolveUiTextColor', () => {
    it('returns the colour untouched in day mode', () => {
        expect(resolveUiTextColor(0xff000000, 'light')).toBe('#000000');
    });

    it('keeps a light colour in night mode', () => {
        // luminance of #f2f4f5 is well above the 140 threshold
        expect(resolveUiTextColor(0xfff2f4f5, 'dark')).toBe('#f2f4f5');
    });

    it('substitutes menuBarLabel for dark text in night mode', () => {
        expect(resolveUiTextColor(0xff000000, 'dark')).toBe('#F2F4F5');
    });

    it('never returns a transparent colour', () => {
        for (const mode of ['light', 'dark', 'system']) {
            expect(resolveUiTextColor(0xff000000, mode)).not.toMatch(/rgba\([^)]*,\s*0\.0+\)$/);
        }
    });
});