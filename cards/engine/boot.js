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
 * PORT of `src/main.ts` from the TypeScript Solitaire PWA — the shell that owns the
 * screens, built on top of the ported Android app by Tobias Bielefeld (GPL-3.0).
 *
 * Differences from the PWA, all forced by living inside the Seclusa Games launcher:
 *
 *   - the game class is injected. The PWA hard-coded `new Klondike()`; this build hosts
 *     two games, so `games/klondike/index.html` passes Klondike and `games/pyramid/`
 *     passes Pyramid.
 *   - no service worker. The app-level `sw.js` owns caching for the whole umbrella app,
 *     and registering a second one from inside the frame would fight with it.
 *   - no CSS import. The host page links the stylesheets; there is no bundler to
 *     resolve `import './theme.css'`.
 *   - the asset base is a plain relative path instead of `import.meta.env.BASE_URL`.
 *
 * PRIVACY (kept from the Android app's README): no network requests, no analytics, no ads,
 * no tracking. Everything is stored in localStorage on the device.
 */

import { shared } from './game/SharedData.js';
import { Preferences } from './game/Preferences.js';
import { Bitmaps } from './render/Bitmaps.js';
import { applyTheme, onSystemThemeChange } from './ui/theme.js';
import { GameManager } from './ui/GameManager.js';
import { GameSelector } from './ui/GameSelector.js';
import { SettingsScreen } from './ui/SettingsScreen.js';
import { StatisticsScreen } from './ui/StatisticsScreen.js';
import { AboutScreen } from './ui/AboutScreen.js';
import { ManualScreen } from './ui/ManualScreen.js';
import { closeDialog } from './ui/Dialogs.js';

const mount = document.getElementById('app');

/*
 * PORT: the Android app resolves the game from an id string in `LoadGame.loadClass()`.
 * Here each game folder imports its own class and hands it to `start()`, and the list
 * below is the order the selector and the saved-game index use. Only the two games this
 * build ships are present; the other sixteen are deliberately not referenced.
 */
const GAME_LIST = [{ id: 'Klondike' }];

let bitmaps = null;

let currentScreen = null;
let gameManager = null;
let gameSelector = null;
let overlayScreen = null;
let overlayName = null;

function destroyScreen() {
    closeDialog();
    if (gameManager) {
        gameManager.destroy();
        gameManager = null;
    }
    if (gameSelector) {
        gameSelector.destroy();
        gameSelector = null;
    }
    if (overlayScreen) {
        overlayScreen.destroy();
        overlayScreen = null;
    }
    overlayName = null;
    mount.innerHTML = '';
}

/**
 * Shows the game selection screen.
 *
 * `resumeLastGame` mirrors `GameSelector.onCreate()`: on a cold start (and only then) the
 * Android app jumps straight back into the last played game unless the player turned that
 * off. Returning to the menu *from inside a game* must always show the menu, otherwise the
 * "Menu" button in the game would appear to do nothing.
 */
function showSelector(resumeLastGame = false) {
    destroyScreen();
    currentScreen = 'selector';

    const prefs = new Preferences();
    prefs.saveCurrentGame(-1);

    if (resumeLastGame && !prefs.getSavedStartWithMenu()) {
        const lastPlayed = prefs.getSavedLastPlayedGame();
        if (lastPlayed !== -1 && GAME_LIST[lastPlayed]) {
            showGame(GAME_LIST[lastPlayed].id);
            return;
        }
    }

    gameSelector = new GameSelector(mount, bitmaps, {
        startGame: (id) => showGame(id),
        openSettings: () => showSettings(),
        openManual: () => showManual(),
        openAbout: () => showAbout(),
    });
}

/**
 * Exits to the Seclusa Games launcher.
 *
 * Inside the launcher this game runs in an iframe, and a frame may not navigate its
 * opener — `window.top.location` is blocked and would throw. So the frame posts a
 * message instead and the launcher owns the navigation (see shell.js).
 *
 * When the file is opened directly, with no launcher above it, there is nothing to post
 * to and the inner selector is the only sensible destination.
 */
function exitToLauncher() {
    if (window.parent === window) {
        showSelector();
        return;
    }
    window.parent.postMessage({ type: 'seclusa:exit-to-launcher' }, window.location.origin);
}

function showGame(gameId) {
    destroyScreen();
    currentScreen = 'game';

    const entry = GAME_LIST.findIndex((g) => g.id === gameId);
    const prefs = new Preferences();
    prefs.saveCurrentGame(entry);
    prefs.saveLastPlayedGame(entry);
    // PORT: select the per-game localStorage namespace before anything reads a game value.
    Preferences.setGameId(gameId);
    // One game per iframe: stop Klondike/Pyramid customization leaking through the
    // shared keys. Seeds each game's store from those shared values once.
    prefs.ensureSettingsOnlyForThisGame();

    gameManager = new GameManager(mount, bitmaps, {
        exitToMenu: () => exitToLauncher(),
        openStatistics: () => showStatistics(),
        openSettings: () => showSettings(),
        openManual: () => showManual(),
    });

    gameManager.start();

    // Card art is decoded asynchronously. Redraw once the sheets have landed; until then the
    // board shows the stack backgrounds only, exactly like the Android app before a theme has
    // finished decoding. The redraw is a nicety, so a failure here is swallowed rather than
    // left as an unhandled rejection on a board that is already playable.
    void bitmaps.preloadAll().then(() => {
        gameManager?.updateGameLayout();
    }).catch(() => {
        /* board stays with stack backgrounds only */
    });
}

function showSettings() {
    if (overlayName === 'settings') {
        return;
    }
    closeDialog();
    overlayScreen = new SettingsScreen(mount, bitmaps, {
        close: () => closeOverlay(),
        onChanged: () => {
            applyThemeFromPrefs();
            gameManager?.onSettingsChanged();
        },
    });
    overlayName = 'settings';
}

function showStatistics() {
    if (overlayName === 'statistics') {
        return;
    }
    closeDialog();
    // `StatisticsFragment` needs the game helpers; if the app was resumed directly into the
    // statistics screen they are not initialised yet, so the Android app just closes it.
    if (shared.prefs == null || shared.scores == null || shared.currentGame == null) {
        return;
    }
    overlayScreen = new StatisticsScreen(mount, { close: () => closeOverlay() });
    overlayName = 'statistics';
}

function showAbout() {
    if (overlayName === 'about') {
        return;
    }
    closeDialog();
    overlayScreen = new AboutScreen(mount, { close: () => closeOverlay() });
    overlayName = 'about';
}

function showManual() {
    if (overlayName === 'manual') {
        return;
    }
    closeDialog();
    overlayScreen = new ManualScreen(mount, { close: () => closeOverlay() });
    overlayName = 'manual';
}

function closeOverlay() {
    if (overlayScreen) {
        overlayScreen.destroy();
        overlayScreen = null;
    }
    overlayName = null;
}

/**
 * Re-reads the theme settings and re-applies them to this frame's <html>.
 *
 * `../../theme-game.js` already owns that job — it is what the launcher and the
 * other games use — so prefer it when it is present and fall back to the ported
 * engine helper only if the shared bootstrap failed to load. Either way the
 * result is the same two attributes, and the settings screen only has to write
 * the preference and call this.
 */
function applyThemeFromPrefs() {
    if (window.SeclusaGameTheme && typeof window.SeclusaGameTheme.apply === 'function') {
        window.SeclusaGameTheme.apply();
        return;
    }
    const prefs = new Preferences();
    applyTheme(prefs.getSavedThemeColor(), prefs.getSavedNightMode());
}

// ------------------------------------------------------------------ lifecycle

let resizeRaf = null;
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

function onResize() {
    if (resizeRaf !== null) {
        return;
    }
    resizeRaf = globalThis.requestAnimationFrame(() => {
        resizeRaf = null;
        const rotated = lastWidth !== window.innerWidth || lastHeight !== window.innerHeight;

        if (rotated) {
            lastWidth = window.innerWidth;
            lastHeight = window.innerHeight;

            if (currentScreen === 'game') {
                gameManager?.updateGameLayout();
            } else if (currentScreen === 'selector') {
                gameSelector?.onResize();
            }
        }
    });
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

/*
 * Launcher fullscreen lives on the parent document. It posts this so the board
 * re-lays even when the iframe's own resize is late or missing.
 */
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
        return;
    }
    if (!event.data || event.data.type !== 'seclusa:viewport-changed') {
        return;
    }
    lastWidth = 0;
    lastHeight = 0;
    onResize();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        gameManager?.pause();
    } else if (currentScreen === 'game') {
        gameManager?.resume();
    }
});

window.addEventListener('pagehide', () => {
    gameManager?.pause();
});

// ---------------------------------------------------------------------- boot

/**
 * @param {Function} GameClass the concrete game class (Klondike or Pyramid)
 * @param {string} assetBase   relative path prefix that `assets/` hangs off, e.g. `../cards/`
 * @param {string} gameId      id from GAME_LIST, used for the saved-game namespace
 */
function boot(GameClass, assetBase, gameId) {
    shared.assetBase = assetBase;
    bitmaps = new Bitmaps(assetBase);

    // The game layer keeps everything in statics (ported from `SharedData`); the settings
    // store has to exist before any screen reads it.
    shared.prefs = new Preferences();
    shared.gameFactory = () => new GameClass();

    applyThemeFromPrefs();
    onSystemThemeChange(() => {
        if (shared.prefs.getSavedNightMode() === 'system') {
            applyThemeFromPrefs();
        }
    });

    /*
     * The felt is theme-dependent, so a theme change has to repaint it.
     *
     * Making the Monochrome playfield follow the app's surface is what put a white table
     * under a light theme — and it also made the table something that can go stale. CSS
     * repaints itself when the attributes change; this is a canvas, so it does not. The
     * hook above only sets the attributes, and it only hears about the OS flipping at
     * sunset; a night-mode change made in the launcher while this game sits on the stage
     * never reached the engine at all. Either way `background.style.background` kept the
     * old trio, and the result was the exact pairing this was changed to fix — a light
     * table under dark menu bars, or the reverse — just triggered by a different event.
     *
     * `SeclusaGameTheme.onChange` covers both triggers, which is what it is documented
     * for ("Canvas games need this"), and theme-game.js is already loaded by these pages.
     * Blockfall registers the same way.
     */
    if (window.SeclusaGameTheme && typeof window.SeclusaGameTheme.onChange === 'function') {
        window.SeclusaGameTheme.onChange(() => {
            applyThemeFromPrefs();
            gameManager?.loadBackgroundColor();
            gameManager?.applyCssTextColor();
        });
    }

    /*
     * Straight into the game.
     *
     * The Android app opened on a game selector, and showSelector() above still builds
     * one — but that screen is the launcher's job now. Showing it here too meant tapping
     * Klondike in Seclusa Games opened a *second* menu listing Klondike and Pyramid, so
     * it took two taps to start the thing the player had already chosen.
     *
     * showSelector stays reachable for the in-game Menu button when this file is opened
     * directly, outside the launcher.
     */
    showGame(gameId || GAME_LIST[0].id);
}

export { boot, GAME_LIST };
