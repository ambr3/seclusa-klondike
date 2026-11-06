/*
 * Seclusa Games — shared theme bootstrap for every game frame.
 *
 * The launcher owns the chrome: the appearance dialog, the about dialog, the
 * stage bar. This file is what a game needs and nothing more — it puts the
 * palette and night mode on the game's own <html> and keeps them in step with
 * the launcher. `../../theme.css` turns the two attributes into the Material 3
 * colour roles; a game's own stylesheet builds on those roles.
 *
 * WHY THE STORAGE LISTENER IS THE WHOLE POINT
 *
 * Every frame is same-origin (shell.js passes `allow-same-origin`), so all of
 * them read one copy of the `ssc.` preferences in localStorage. The `storage`
 * event fires in *other* same-origin documents when one of them writes — it does
 * not fire in the document that did the writing. So without a listener, picking
 * a palette in the launcher updates the launcher and nothing else, and a game
 * already sitting in the frame keeps the palette it booted with.
 *
 * That is the difference between "the themes are the same list" and "change the
 * colour in one game and every game follows". This listener is the second one.
 *
 * The same-document direction (a game writing the pref from its own settings
 * screen) cannot be served by `storage`, so games call
 * `SeclusaGameTheme.apply()` themselves after they write — and the card games
 * already re-read the preference for their own reasons.
 *
 * Settings live in the same namespace the Android Solitaire app used (`ssc.` +
 * the Android preference key names), so the launcher, the games and any saved
 * Android-era values all agree.
 */

(function () {
    "use strict";

    var PREF_PREFIX = "ssc.";
    var KEY_THEME_COLOR = PREF_PREFIX + "pref_key_theme_color";
    var KEY_NIGHT_MODE = PREF_PREFIX + "pref_key_night_mode";

    /*
     * Navy is the default, and this list must stay identical to the one in
     * theme.js and games/pacman/theme.js. All four share the same localStorage key, so
     * a stale list does not error — it silently rejects the palette the launcher just
     * wrote and falls back to the default. That is how the eight newer palettes used to
     * snap back to green the moment a game opened.
     */
    var DEFAULT_THEME_COLOR = "navy";
    var DEFAULT_NIGHT_MODE = "system";
    var PALETTES = [
        "orange", "green", "blue", "purple",
        "rose", "teal", "amber", "slate",
        "navy", "indigo", "lime", "crimson"
    ];
    var NIGHT_MODES = ["system", "light", "dark"];

    var root = document.documentElement;
    var listeners = [];
    var systemQuery = null;
    var bound = false;

    // ------------------------------------------------------------- preferences

    function readPref(key, fallback) {
        try {
            var value = window.localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (err) {
            // Storage can be unavailable (private browsing, blocked cookies).
            // The game still has to render, so fall back rather than throw.
            return fallback;
        }
    }

    function currentPalette() {
        return readPref(KEY_THEME_COLOR, DEFAULT_THEME_COLOR);
    }

    function currentNightMode() {
        return readPref(KEY_NIGHT_MODE, DEFAULT_NIGHT_MODE);
    }

    // ------------------------------------------------------------------- theme

    function prefersDark() {
        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    function resolveIsDark(nightMode) {
        if (nightMode === "dark") return true;
        if (nightMode === "light") return false;
        return prefersDark();
    }

    /**
     * Writes the two attributes. Idempotent: calling it when nothing changed is
     * a no-op for the CSS but still notifies listeners, because a game may have
     * changed something else (a custom property it writes itself) and wants a
     * redraw either way.
     */
    function applyTheme(palette, nightMode) {
        if (PALETTES.indexOf(palette) < 0) palette = DEFAULT_THEME_COLOR;
        if (NIGHT_MODES.indexOf(nightMode) < 0) nightMode = DEFAULT_NIGHT_MODE;

        var dark = resolveIsDark(nightMode);
        var theme = dark ? "dark" : "light";

        if (root.getAttribute("data-palette") !== palette) {
            root.setAttribute("data-palette", palette);
        }
        if (root.getAttribute("data-theme") !== theme) {
            root.setAttribute("data-theme", theme);
        }

        // Keep the browser/OS chrome in step with the frame, reading the active
        // palette's own anchor rather than a fixed green literal — see the same
        // block in theme.js.
        var themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            var anchor = window.getComputedStyle(root)
                .getPropertyValue("--theme-game-select-background").trim();
            themeColorMeta.setAttribute("content", anchor || "#0d2340");
        }

        notify();
    }

    /** Reads both preferences and applies them. The usual entry point. */
    function apply() {
        applyTheme(currentPalette(), currentNightMode());
    }

    // --------------------------------------------------------------- listeners

    function notify() {
        for (var i = 0; i < listeners.length; i++) {
            try {
                listeners[i](currentPalette(), currentNightMode());
            } catch (err) {
                // One game's listener must not stop the others.
                if (window.console && console.error) console.error(err);
            }
        }
    }

    /**
     * Runs `callback(palette, nightMode)` whenever the theme changes — from the
     * storage listener, from `apply()`, or from the OS flipping colour scheme.
     * Canvas games need this: CSS repaints itself, a canvas does not.
     */
    function onChange(callback) {
        if (typeof callback !== "function") return function () {};
        listeners.push(callback);
        return function off() {
            var i = listeners.indexOf(callback);
            if (i >= 0) listeners.splice(i, 1);
        };
    }

    // -------------------------------------------------------------------- bind

    function bind() {
        if (bound) return;
        bound = true;

        /*
         * `storage` fires in every same-origin document *except* the one that
         * wrote. `event.key` is null when storage is cleared wholesale, which
         * also means "go back to the defaults", so that case is handled too.
         */
        window.addEventListener("storage", function (event) {
            if (event.key === null) {
                apply();
                return;
            }
            if (event.key === KEY_THEME_COLOR || event.key === KEY_NIGHT_MODE) {
                apply();
            }
        });

        // "System" night mode stays live when the OS flips.
        if (window.matchMedia) {
            systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
            var listener = function () {
                if (currentNightMode() === "system") {
                    applyTheme(currentPalette(), "system");
                }
            };
            if (systemQuery.addEventListener) systemQuery.addEventListener("change", listener);
            else if (systemQuery.addListener) systemQuery.addListener(listener);

            /*
             * Re-check once the document has finished loading.
             *
             * The first apply() runs while this file is still being parsed, and a
             * freshly-created iframe does not reliably report the OS colour scheme at
             * that point — measured: it answered `prefers-color-scheme: dark` as `false`
             * for the whole parse, then `true` from the next tick onward.
             *
             * Because the value then *changed* from the listener's point of view only
             * if it fired, and no change event is delivered for a value that was still
             * settling at registration time, the `change` listener above never ran and
             * the frame stayed pinned to `data-theme="light"` on a dark device — while
             * the launcher around it was dark. Three of the five games looked wrong on
             * arrival and none of them could be fixed by reloading, because every reload
             * hit the same race.
             *
             * So: re-resolve once loading completes, and only write when the answer
             * actually differs. `applyTheme` notifies listeners unconditionally, and
             * firing that a second time with nothing changed would make every game
             * redraw for no reason.
             */
            var settle = function () {
                if (currentNightMode() !== "system") return;
                var wanted = prefersDark() ? "dark" : "light";
                if (root.getAttribute("data-theme") !== wanted) {
                    applyTheme(currentPalette(), "system");
                }
            };
            if (document.readyState === "complete") {
                settle();
            } else {
                window.addEventListener("load", settle, { once: true });
            }
        }
    }

    /*
     * Public surface. Exposed before the first apply() so a game can register a
     * listener in its own <head> and still be told about the initial paint.
     */
    window.SeclusaGameTheme = {
        apply: apply,
        applyTheme: applyTheme,
        onChange: onChange,
        readPref: readPref,
        currentPalette: currentPalette,
        currentNightMode: currentNightMode,
        resolveIsDark: resolveIsDark,
        PALETTES: PALETTES.slice(),
        NIGHT_MODES: NIGHT_MODES.slice(),
        PREF_KEY_THEME_COLOR: KEY_THEME_COLOR,
        PREF_KEY_NIGHT_MODE: KEY_NIGHT_MODE,
    };

    bind();
    apply();
})();