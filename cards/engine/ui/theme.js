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
const LIGHT = {
    primary: '#8B5000',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFDCC2',
    onPrimaryContainer: '#2C1500',
    secondary: '#77574B',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFDCC2',
    onSecondaryContainer: '#2C1500',
    tertiary: '#6C5D2F',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#F5E1A7',
    onTertiaryContainer: '#241A00',
    inversePrimary: '#FFB77D',
    gameSelectBackground: '#BF360C',
    gameSelectBackgroundEnd: '#7E2202',
    colorDrawerSelected: '#FFE0B2',
};
const DARK = {
    primary: '#E8A872',
    onPrimary: '#412300',
    primaryContainer: '#5C3A1A',
    onPrimaryContainer: '#FFDCC2',
    secondary: '#D4B5A6',
    onSecondary: '#3C2A21',
    secondaryContainer: '#4E3B32',
    onSecondaryContainer: '#F5DFD3',
    tertiary: '#C8B887',
    onTertiary: '#342B0A',
    tertiaryContainer: '#463F22',
    onTertiaryContainer: '#E6D8A6',
    inversePrimary: '#8B5000',
    gameSelectBackground: '#14532D',
    gameSelectBackgroundEnd: '#0B3B1E',
    colorDrawerSelected: '#5C3A1A',
};
/** Playfield background gradients, from `res/drawable/background_color_*.xml`. */
const BACKGRADIENTS = {
    1: ['#849CF4', '#3F62E4', '#284FDD'], // blue
    2: ['#43CA34', '#33A127', '#29831F'], // green
    3: ['#E57373', '#C62828', '#8E1B1B'], // red
    4: ['#FFE082', '#FBC02D', '#C49000'], // yellow
    5: ['#FFB74D', '#F57C00', '#C65E00'], // orange
    6: ['#BA68C8', '#8E24AA', '#5B1470'], // purple
    /*
     * The app's own surface, so the default table is the same greys as the rest
     * of Seclusa Games rather than a felt green. It lives here rather than being
     * forced from CSS because the settings screen builds itself from this map:
     * adding the entry is what puts it in front of the user, and it goes through
     * the same save path as the other six, so choosing it is a real choice that
     * survives rather than a stylesheet that can be overridden.
     */
    7: ['#2E2E2E', '#1F1F1F', '#141414'], // monochrome
};
/** The entry in {@link BACKGRADIENTS} that is the app's surface rather than a felt. */
const MONOCHROME_BACKGROUND = 7;
export const BACKGRADIENT_NAMES = {
    1: 'Blue',
    2: 'Green',
    3: 'Red',
    4: 'Yellow',
    5: 'Orange',
    6: 'Purple',
    7: 'Monochrome',
};
/*
 * The felt for the current theme.
 *
 * Six of the seven entries are colours the player chose, so they come back untouched: a
 * green table stays green under a white theme, because choosing green is the one thing
 * this setting is for and a theme switch is not a reason to overrule it.
 *
 * Monochrome is the exception because it is not a colour at all -- it is meant to be the
 * app's own surface, and the entry was written once, dark. That left a light theme
 * painting a near-black table under black menu bars, which is the one pairing on the
 * board with no reading at all: not "dark mode", just dark on dark. So the one entry
 * that means "whatever the app's surface is" follows the surface.
 */
export function resolveFeltGradient(index, nightMode) {
    const gradient = BACKGRADIENTS[index];
    if (!gradient || Number(index) !== MONOCHROME_BACKGROUND) {
        return gradient;
    }
    if (resolveIsDark(nightMode)) {
        return gradient;
    }
    // The light counterpart to the dark trio above, not a second copy of it.
    return ['#FFFFFF', '#FAFAFA', '#F2F2F2'];
}
/** Text colours offered by the settings dialog (`DialogPreferenceTextColor`). */
export const TEXT_COLORS = [
    { name: 'Black', value: 0xff000000 },
    { name: 'White', value: 0xffffffff },
    { name: 'Grey', value: 0xff808080 },
    { name: 'Red', value: 0xffff0000 },
    { name: 'Green', value: 0xff00c000 },
    { name: 'Blue', value: 0xff0000ff },
    { name: 'Yellow', value: 0xffffff00 },
];
let systemDarkQuery = null;
function prefersDark() {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return false;
    }
    if (systemDarkQuery === null) {
        systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return systemDarkQuery.matches;
}
export function resolveIsDark(nightMode) {
    if (nightMode === 'dark') {
        return true;
    }
    if (nightMode === 'light') {
        return false;
    }
    return prefersDark();
}
/** Applies the Material 3 role variables to `<html>`. */
/* Palette names and night modes, matching the shell's `theme.js`, `theme-game.js` and
 * `games/pacman/theme.js`. All share one localStorage key, so a list that drifts from
 * the others does not throw — it quietly discards the palette the player chose and
 * substitutes the default. */
export const DEFAULT_PALETTE = 'navy';
export const DEFAULT_NIGHT_MODE = 'system';
export const PALETTES = [
  'orange', 'green', 'blue', 'purple',
  'rose', 'teal', 'amber', 'slate',
  'navy', 'indigo', 'lime', 'crimson',
];
export const NIGHT_MODES = ['system', 'light', 'dark'];

/*
 * PORT: the PWA wrote every Material 3 role as an inline custom property. Inside the
 * Seclusa Games shell that would fight the shell's own `theme.css`, which keys the same
 * tokens off `data-palette` / `data-theme` on <html> — the values are identical, but two
 * sources of truth is one too many. So the same two attributes are set instead, and the
 * shared stylesheet supplies the values. See `games/<game>/theme.js`.
 */
export function applyTheme(palette, nightMode) {
    if (!PALETTES.includes(palette)) {
        palette = DEFAULT_PALETTE;
    }
    if (!NIGHT_MODES.includes(nightMode)) {
        nightMode = DEFAULT_NIGHT_MODE;
    }
    const dark = resolveIsDark(nightMode);
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/** Listens for system dark-mode changes so "System" night mode stays live. */
export function onSystemThemeChange(callback) {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return;
    }
    systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => callback();
    if (typeof systemDarkQuery.addEventListener === 'function') {
        systemDarkQuery.addEventListener('change', listener);
    }
    else if (typeof systemDarkQuery.addListener === 'function') {
        systemDarkQuery.addListener(listener);
    }
}
/**
 * Android stores colours as ARGB ints (`0xAARRGGBB`); CSS hex is `#RRGGBBAA`.
 * Handing the ARGB digits straight to CSS swaps the channels, so opaque black
 * `0xff000000` becomes `#ff000000`, which CSS reads as fully transparent red.
 */
export function argbToCss(color) {
    const a = (color >>> 24) & 0xff;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const hex = (n) => n.toString(16).padStart(2, '0');
    if (a === 0xff) {
        return `#${hex(r)}${hex(g)}${hex(b)}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(4)})`;
}
/** `GameManager.resolveUiTextColor(int)` — lighten dark text in night mode. */
export function resolveUiTextColor(color, nightMode) {
    if (!resolveIsDark(nightMode)) {
        return argbToCss(color);
    }
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance >= 140) {
        return argbToCss(color);
    }
    // R.color.menuBarLabel from values-night/colors.xml
    return '#F2F4F5';
}
