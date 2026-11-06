/*
 * theme-game.js behaviour, driven in a real iframe.
 *
 * The script is a classic IIFE that installs `window.SeclusaGameTheme`, so it cannot be
 * imported. It is loaded into a throwaway same-origin iframe instead, which also gives it
 * the document it expects — `data-palette` / `data-theme` on <html>, its own matchMedia,
 * and a real `load` event.
 *
 * The suite that matters here is "corrects a wrong theme once loading completes". That
 * pins the bug where three of five games rendered light on a dark device: the first
 * apply() ran while the iframe was still parsing, matchMedia had not settled on the OS
 * scheme yet, and because nothing changed afterwards the `change` listener never fired.
 * The code was right; the moment it ran in was wrong.
 */

import { afterEach, describe, expect, it } from './runner.js';

const THEME_GAME_JS = '../theme-game.js';

const PREF_THEME_COLOR = 'ssc.pref_key_theme_color';
const PREF_NIGHT_MODE = 'ssc.pref_key_night_mode';

/*
 * This suite reads and writes the real `ssc.` preferences, because that is the only way
 * to exercise the code path a game actually takes. The values are therefore captured at
 * import time — before any test runs — and restored after every one of them.
 *
 * Without this the suite silently repaints the app: it left the palette set to `lime`,
 * so a full test run changed what the launcher looked like on a real machine. A test that
 * leaves state behind is worse than no test, because it makes the next run depend on the
 * last one.
 */
const SAVED = {
    color: localStorage.getItem(PREF_THEME_COLOR),
    mode: localStorage.getItem(PREF_NIGHT_MODE),
};

function restore(key, value) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
}

/*
 * Registered inside the describe() below, not here.
 *
 * afterEach() pushes onto the *currently open* suite, so calling it at module scope —
 * where no suite is open — throws, the dynamic import of this file rejects, and the
 * whole run sits at "Running…" forever. Which is what happened.
 */

async function loadThemeGame() {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'theme-game subject');
    // No src and no srcdoc: an appended, source-less iframe has a same-origin about:blank
    // document that is usable synchronously, which is all theme-game.js needs — it
    // touches documentElement, matchMedia, localStorage and an optional meta tag.
    //
    // The obvious srcdoc version is a trap. Setting srcdoc navigates, so waiting on
    // `load` from a point where the document is already 'complete' resolves against the
    // initial about:blank; the srcdoc load then replaces the document and discards the
    // script that was injected into it, so `onload` never fires and the suite hangs
    // forever rather than failing.
    document.body.append(frame);

    const win = frame.contentWindow;
    await new Promise((resolve, reject) => {
        const s = win.document.createElement('script');
        s.src = new URL(THEME_GAME_JS, location.href).href;
        s.onload = resolve;
        s.onerror = () => reject(new Error('theme-game.js failed to load'));
        win.document.head.append(s);
        // A hang must fail the test, not stall the whole run with no output.
        setTimeout(() => reject(new Error('theme-game.js did not execute within 5s')), 5000);
    });

    if (!win.SeclusaGameTheme) throw new Error('theme-game.js did not install its API');
    return { frame, win, api: win.SeclusaGameTheme };
}

/**
 * Loads theme-game.js the way a real document does: as a parser-inserted script while
 * `document.readyState` is still 'loading', with the parse finished only when the caller
 * says so.
 *
 * This is what makes the load-correction testable at all. An appended source-less iframe
 * has a complete about:blank document, so theme-game.js takes its
 * `readyState === 'complete'` path and never registers a `load` listener — the branch
 * that actually failed in the field would never be exercised.
 */
async function loadThemeGameMidParse() {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'theme-game subject');
    document.body.append(frame);

    const win = frame.contentWindow;
    const doc = win.document;
    const url = new URL(THEME_GAME_JS, location.href).href;

    doc.open();
    doc.write(`<!doctype html><html><head><script src="${url}"></script></head><body></body></html>`);

    /*
     * A script injected through document.write is not parser-blocking here, so the API is
     * not installed the instant write() returns. Wait for it — crucially without calling
     * close(), which would end the parse and fire `load`, and the whole point is to get
     * in before that happens.
     */
    const deadline = performance.now() + 5000;
    while (!win.SeclusaGameTheme && performance.now() < deadline) {
        await new Promise((r) => setTimeout(r, 10));
    }
    if (!win.SeclusaGameTheme) {
        doc.close();
        throw new Error('theme-game.js did not execute within 5s');
    }

    return {
        frame,
        win,
        api: win.SeclusaGameTheme,
        get readyState() { return doc.readyState; },
        finish() { doc.close(); },
    };
}

function teardown(subject) {
    subject.frame.remove();
}

describe('theme-game.js', () => {
    afterEach(() => {
        restore(PREF_THEME_COLOR, SAVED.color);
        restore(PREF_NIGHT_MODE, SAVED.mode);
        // A test that fails part-way can leave its frame behind; clear them all.
        for (const frame of document.querySelectorAll('iframe[title="theme-game subject"]')) {
            frame.remove();
        }
    });
    it('installs its public surface', async () => {
        localStorage.removeItem(PREF_THEME_COLOR);
        localStorage.removeItem(PREF_NIGHT_MODE);

        const s = await loadThemeGame();
        try {
            expect(typeof s.api).toBe('object');
            expect(typeof s.api.apply).toBe('function');
            expect(typeof s.api.resolveIsDark).toBe('function');
            expect(s.api.currentPalette()).toBe('navy');
            expect(s.api.PREF_KEY_THEME_COLOR).toBe(PREF_THEME_COLOR);
        } finally {
            teardown(s);
        }
    });

    it('resolves night mode explicitly, and through the OS for "system"', async () => {
        const s = await loadThemeGame();
        try {
            expect(s.api.resolveIsDark('dark')).toBe(true);
            expect(s.api.resolveIsDark('light')).toBe(false);

            const prefersDark = s.win.matchMedia('(prefers-color-scheme: dark)').matches;
            expect(s.api.resolveIsDark('system')).toBe(prefersDark);
            // An unrecognised mode must not silently become dark or light.
            expect(s.api.resolveIsDark('nonsense')).toBe(prefersDark);
        } finally {
            teardown(s);
        }
    });

    it('writes the attributes the stylesheet keys on', async () => {
        localStorage.setItem(PREF_THEME_COLOR, 'crimson');
        localStorage.setItem(PREF_NIGHT_MODE, 'dark');
        const s = await loadThemeGame();
        try {
            expect(s.win.document.documentElement.dataset.palette).toBe('crimson');
            expect(s.win.document.documentElement.dataset.theme).toBe('dark');
        } finally {
            teardown(s);
        }
    });

    it('rejects a palette it does not know and falls back to the default', async () => {
        // A stale list in one copy of the palette array would reject a palette the other
        // just wrote. Falling back must land on navy, not on nothing.
        //
        // Note the assertion is on the attribute, not on currentPalette(): that getter
        // returns the stored value unvalidated and validation happens in applyTheme().
        // What the stylesheet sees is the attribute, so that is what is guaranteed.
        localStorage.setItem(PREF_THEME_COLOR, 'chartreuse');
        const s = await loadThemeGame();
        try {
            expect(s.win.document.documentElement.dataset.palette).toBe('navy');
            expect(s.api.PALETTES).not.toContain('chartreuse');
        } finally {
            teardown(s);
        }
    });

    it('corrects a wrong data-theme once loading completes', async () => {
        localStorage.removeItem(PREF_THEME_COLOR);
        localStorage.setItem(PREF_NIGHT_MODE, 'system');
        const s = await loadThemeGameMidParse();
        try {
            const de = s.win.document.documentElement;
            const expected = s.api.resolveIsDark('system') ? 'dark' : 'light';

            // The race, reproduced exactly: the frame is still parsing, and is left with
            // the value apply() derived from an iframe whose matchMedia had not yet
            // reported the OS scheme.
            expect(s.readyState).toBe('loading');
            de.dataset.theme = expected === 'dark' ? 'light' : 'dark';

            s.finish();

            expect(de.dataset.theme).toBe(expected);
        } finally {
            teardown(s);
        }
    });

    it('does not revisit an explicit light or dark choice on load', async () => {
        // "system" means "ask the OS". An explicit choice is the user's, and the
        // correction pass must leave it alone even if the frame starts out wrong.
        for (const [mode, expected] of [['light', 'light'], ['dark', 'dark']]) {
            localStorage.setItem(PREF_NIGHT_MODE, mode);
            const s = await loadThemeGameMidParse();
            try {
                expect(s.readyState).toBe('loading');
                s.finish();
                expect(s.win.document.documentElement.dataset.theme).toBe(expected);
            } finally {
                teardown(s);
            }
        }
    });

    it('follows a storage change from another frame', async () => {
        const s = await loadThemeGame();
        try {
            localStorage.setItem(PREF_THEME_COLOR, 'teal');
            localStorage.setItem(PREF_NIGHT_MODE, 'dark');
            s.win.dispatchEvent(new s.win.StorageEvent('storage', {
                key: PREF_THEME_COLOR,
                newValue: 'teal',
                storageArea: localStorage,
            }));
            expect(s.win.document.documentElement.dataset.palette).toBe('teal');
        } finally {
            teardown(s);
        }
    });

    it('survives storage that throws, as private browsing does', async () => {
        localStorage.setItem(PREF_THEME_COLOR, 'lime');
        const s = await loadThemeGame();
        try {
            const real = s.win.localStorage.getItem.bind(s.win.localStorage);
            s.win.localStorage.getItem = () => { throw new Error('SecurityError'); };
            expect(s.api.currentPalette()).toBe('navy');
            s.win.localStorage.getItem = real;
        } finally {
            teardown(s);
        }
    });
});