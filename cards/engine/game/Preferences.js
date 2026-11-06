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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Preferences.java`.
 *
 * The Android app splits state over two `SharedPreferences` files: a global one and a
 * per-game one. The port keeps that split exactly (`shared:` vs `Klondike:` key prefixes in
 * localStorage) because several settings can be scoped "only for this game".
 *
 * Keys and defaults are transcribed from `res/values/booleans.xml`, `integers.xml`,
 * `strings-non-translateable.xml` and `array.xml`.
 */
import * as DifficultyPolicy from './DifficultyPolicy.js';
export const SHARED_PREFIX = 'ssc.';
export const DEFAULT_GAME_ID = 'Klondike';
/*
 * PORT: the Android app holds one `SharedPreferences` file per game and swaps the
 * reference in `Preferences.setCurrentGame()`. Here the per-game namespace is a key
 * prefix, so it is selected the same way: the game entry point calls
 * `Preferences.setGameId('Pyramid')` before anything reads a game-scoped value.
 * Klondike stays the default so every existing call site is unchanged.
 */
export function gamePrefix(gameId) {
    return 'ssc.game.' + gameId + '.';
}
export function backupPrefix(gameId) {
    return 'ssc.game.' + gameId + '_bak.';
}
export const GAME_PREFIX = gamePrefix(DEFAULT_GAME_ID);
export const BACKUP_PREFIX = backupPrefix(DEFAULT_GAME_ID);
// ------------------------------------------------------------------ key names
export const PREF_KEY_HIDE_STATUS_BAR = 'pref_key_hide_status_bar';
export const PREF_KEY_LONGEST_RUN = 'longest_run';
export const PREF_KEY_RUN_COUNTER = 'run_counter';
export const PREF_KEY_ORDER = 'order';
export const PREF_KEY_SCORE = 'Score';
export const PREF_KEY_SAVED_SCORES = 'SavedScores';
export const PREF_KEY_SAVED_RECENT_SCORES = 'SavedRecentScores';
export const PREF_KEY_TOTAL_NUMBER_UNDOS = 'pref_key_total_number_undos';
export const PREF_KEY_TOTAL_HINTS_SHOWN = 'pref_key_total_hints_shown';
export const PREF_KEY_TOTAL_POINTS_EARNED = 'pref_key_total_points_earned';
export const PREF_KEY_TOTAL_TIME_PLAYED = 'pref_key_total_time_played';
export const PREF_KEY_DEALING_CARDS = 'pref_key_dealing_cards';
export const PREF_KEY_HIDE_MENU_BUTTON = 'pref_key_hide_menu_button';
export const PREF_KEY_STATISTICS_HIDE_WIN_PERCENTAGE = 'pref_key_statistics_hide_win_percentage';
export const OLD = '_old';
export const PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT = 'pref_key_game_layout_margins_portrait';
export const PREF_KEY_ENSURE_MOVABILITY = 'pref_key_ensure_movability';
export const PREF_KEY_ENSURE_MOVABILITY_MIN_MOVES = 'pref_key_ensure_movability_min_moves';
export const PREF_KEY_SETTINGS_ONLY_FOR_THIS_GAME = 'pref_key_settings_only_for_this_game';
export const PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE = 'pref_key_game_layout_margins_landscape';
export const PREF_KEY_DISABLE_UNDO_COSTS = 'pref_key_disable_undo_costs';
export const PREF_KEY_DISABLE_HINT_COSTS = 'pref_key_disable_hint_costs';
export const PREF_KEY_GAME_REDEAL_COUNT = 'GameRecycleCount';
export const PREF_KEY_GAME_WON = 'GameWon';
export const PREF_KEY_GAME_WON_AND_RELOADED = 'GameWonAndReloaded';
export const PREF_KEY_GAME_NUMBER_OF_WON_GAMES = 'GameNumberOfWonGames';
export const PREF_KEY_GAME_NUMBER_OF_PLAYED_GAMES = 'GameNumberOfPlayedGames';
export const PREF_KEY_GAME_RANDOM_CARDS = 'GameRandomCards';
export const PREF_KEY_GAME_FIRST_RUN = 'GameFirstRun';
export const PREF_KEY_GAME_MOVED_FIRST_CARD = 'GameMovedFirstCard';
export const PREF_KEY_RECORD_LIST_ENTRY = 'RecordListEntry';
export const PREF_KEY_RECORD_LIST_ENTRIES_SIZE = 'RecordListEntriesSize';
export const PREF_KEY_FLIP_CARD = 'FlipCard';
export const PREF_KEY_ORIGIN = 'Origin';
export const PREF_KEY_CARD = 'Card';
export const PREF_KEY_CARDS = 'Cards';
export const PREF_KEY_STACK = 'Stack';
export const PREF_KEY_TIMER_END_TIME = 'SavedCurrentTime';
export const PREF_KEY_TIMER_START_TIME = 'SavedStartTime';
export const PREF_KEY_TIMER_WINNING_TIME = 'SavedShownTime';
export const PREF_KEY_CARD_DRAWABLES = 'CardDrawables';
export const PREF_KEY_CARD_BACKGROUND = 'pref_key_cards_background_new';
export const PREF_KEY_CARD_BACKGROUND_COLOR = 'pref_key_cards_background_color';
export const PREF_KEY_START_WITH_MENU = 'pref_key_start_menu';
export const PREF_KEY_KLONDIKE_DRAW = 'pref_key_klondike_draw';
export const PREF_KEY_KLONDIKE_DRAW_OLD = PREF_KEY_KLONDIKE_DRAW + OLD;
export const PREF_KEY_LANGUAGE = 'pref_key_language';
export const PREF_KEY_CURRENT_GAME = 'pref_key_current_game_v2';
export const PREF_KEY_LAST_PLAYED_GAME = 'pref_key_last_played_game';
export const PREF_KEY_ORIENTATION = 'pref_key_orientation';
export const PREF_KEY_4_COLOR_MODE = 'pref_key_4_color_mode';
export const PREF_KEY_LEFT_HANDED_MODE = 'pref_key_left_handed_mode';
export const PREF_KEY_MENU_BAR_POS_PORTRAIT = 'pref_key_menu_bar_position_portrait';
export const PREF_KEY_MENU_BAR_POS_LANDSCAPE = 'pref_key_menu_bar_position_landscape';
export const PREF_KEY_DOUBLE_TAP_ENABLED = 'pref_key_double_tap_enable';
export const PREF_KEY_DOUBLE_TAP_ALL_CARDS = 'pref_key_double_tap_all_cards';
export const PREF_KEY_DOUBLE_TAP_FOUNDATION_FIRST = 'pref_key_double_tap_foundation_first';
export const PREF_KEY_TAP_TO_SELECT_ENABLED = 'pref_key_tap_to_select_enable';
export const PREF_KEY_SINGLE_TAP_SPECIAL_GAMES = 'pref_key_single_tap_enable';
export const PREF_KEY_BACKGROUND_COLOR_TYPE = 'pref_key_background_color_type';
export const PREF_KEY_BACKGROUND_COLOR = 'pref_key_background_color';
export const PREF_KEY_BACKGROUND_COLOR_CUSTOM = 'pref_key_background_color_custom';
export const PREF_KEY_MOVEMENT_SPEED = 'pref_key_movement_speed';
export const PREF_KEY_TEXT_COLOR = 'pref_key_text_color';
export const PREF_KEY_THEME_COLOR = 'pref_key_theme_color';
export const DEFAULT_THEME_COLOR = 'navy';
export const PREF_KEY_NIGHT_MODE = 'pref_key_night_mode';
export const DEFAULT_NIGHT_MODE = 'system';
export const PREF_KEY_DYNAMIC_COLORS = 'pref_key_dynamic_colors';
export const PREF_KEY_SOUND_ENABLED = 'pref_key_sound_enabled';
export const PREF_KEY_SOUND_WIN_ENABLED = 'pref_key_sound_win_enabled';
export const PREF_KEY_KLONDIKE_LIMITED_RECYCLES = 'pref_key_klondike_limit_recycles';
export const PREF_KEY_KLONDIKE_NUMBER_OF_RECYCLES = 'pref_key_klondike_number_of_recycles';
/*
 * Pyramid. `pref_key_pyramid_difficulty`'s *value* is `pref_key_pyramid_difficult` — the
 * typo is in the Android strings-non-translateable.xml and is transcribed faithfully.
 */
export const PREF_KEY_PYRAMID_DIFFICULTY = 'pref_key_pyramid_difficult';
export const PREF_KEY_PYRAMID_LIMITED_RECYCLES = 'pref_key_pyramid_limit_recycles';
export const PREF_KEY_PYRAMID_NUMBER_OF_RECYCLES = 'pref_key_pyramid_number_of_recycles';
export const PREF_KEY_PYRAMID_AUTO_MOVE = 'pref_key_pyramid_auto_move';
export const DEFAULT_PYRAMID_DIFFICULTY = '1'; // first entry of pref_pyramid_difficulty_values
export const DEFAULT_PYRAMID_NUMBER_OF_RECYCLES = '2';
export const DEFAULT_PYRAMID_LIMITED_RECYCLES = true;
export const DEFAULT_PYRAMID_AUTO_MOVE = true;

export const PREF_KEY_AUTO_START_NEW_GAME = 'pref_key_auto_start_new_game';
export const PREF_KEY_FORCE_TABLET_LAYOUT = 'pref_key_force_tablet_layout';
export const PREF_KEY_HIDE_TIME = 'pref_key_hide_time';
export const PREF_KEY_HIDE_SCORE = 'pref_key_hide_score';
export const PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON = 'pref_key_hide_auto_complete_button';
export const PREF_KEY_SINGLE_TAP_ALL_GAMES = 'pref_key_single_tap_all_games';
export const PREF_KEY_USE_TRUE_RANDOMISATION = 'pref_key_use_true_randomisation';
export const PREF_KEY_MAX_NUMBER_UNDOS = 'pref_key_max_number_undos';
export const PREF_KEY_SHOW_DIALOG_NEW_GAME = 'pref_key_show_dialog_new_game';
export const PREF_KEY_SHOW_DIALOG_REDEAL = 'pref_key_show_dialog_redeal';
export const PREF_KEY_HIDE_MENU_BAR = 'pref_key_hide_menu_bar';
export const PREF_KEY_IMMERSIVE_MODE = 'pref_key_immersive_mode';
export const PREF_KEY_MENU_COLUMNS_PORTRAIT = 'MenuColumnsPortrait';
export const PREF_KEY_MENU_COLUMNS_LANDSCAPE = 'MenuColumnsLandscape';
export const VALUE_DIFFICULTY_EASY = DifficultyPolicy.EASY;
export const VALUE_DIFFICULTY_MEDIUM = DifficultyPolicy.MEDIUM;
export const VALUE_DIFFICULTY_HARD = DifficultyPolicy.HARD;
export const DEFAULT_DIFFICULTY = VALUE_DIFFICULTY_MEDIUM;
export const VALUE_WINNABLE_MOVES = DifficultyPolicy.WINNABLE_MOVES;
// ------------------------------------------------------------------- defaults
export const DEFAULT_CANFIELD_DRAW = '3';
export const DEFAULT_KLONDIKE_DRAW = '1';
export const DEFAULT_MENU_BAR_POSITION_LANDSCAPE = 'right';
export const DEFAULT_MENU_BAR_POSITION_PORTRAIT = 'bottom';
export const DEFAULT_LANGUAGE = 'default';
export const DEFAULT_MENU_COLUMNS_LANDSCAPE = '6';
export const DEFAULT_MENU_COLUMNS_PORTRAIT = '3';
export const DEFAULT_ORIENTATION = '1';
export const DEFAULT_BACKGROUND_COLOR = '7';
export const DEFAULT_KLONDIKE_NUMBER_OF_RECYCLES = '3';
export const DEFAULT_MOVEMENT_SPEED = '2';
export const DEFAULT_CURRENT_GAME = -1;
export const DEFAULT_GAME_LAYOUT_MARGINS_PORTRAIT = 0;
export const DEFAULT_GAME_LAYOUT_MARGINS_LANDSCAPE = 0;
export const DEFAULT_CARD_BACKGROUND = 0;
export const DEFAULT_CARD_BACKGROUND_COLOR = 0;
export const DEFAULT_WINNING_TIME = 0;
export const DEFAULT_BACKGROUND_COLOR_TYPE = 1;
export const DEFAULT_BACKGROUND_COLOR_CUSTOM = 0xffe5e5e5;
export const DEFAULT_MAX_NUMBER_UNDOS = 20;
export const DEFAULT_ENSURE_MOVABILITY_MIN_MOVES = 10;
export const DEFAULT_TEXT_COLOR = 0xff000000;
export const DEFAULT_DYNAMIC_COLORS = false;
export const DEFAULT_STATISTICS_HIDE_WIN_PERCENTAGE = false;
export const DEFAULT_ENSURE_MOVABILITY = false;
export const DEFAULT_HIDE_AUTOCOMPLETE_BUTTON = false;
/*
 * Seclusa Games hosts one game per iframe, so customization must not leak between
 * Klondike and Pyramid. The Android "settings for this game only" toggle is gone from
 * the UI; the default is on, and `ensureSettingsOnlyForThisGame()` seeds each game's
 * store from the old shared values once.
 */
export const DEFAULT_SETTINGS_ONLY_FOR_THIS_GAME = true;
export const DEFAULT_HIDE_MENU_BUTTON = false;
export const DEFAULT_IMMERSIVE_MODE = false;
export const DEFAULT_DISABLE_UNDO_COSTS = false;
export const DEFAULT_DISABLE_HINT_COSTS = false;
export const DEFAULT_SHOW_DIALOG_NEW_GAME = true;
export const DEFAULT_SHOW_DIALOG_REDEAL = true;
export const DEFAULT_LEFT_HANDED_MODE = false;
export const DEFAULT_DOUBLE_TAP_ENABLE = true;
export const DEFAULT_DOUBLE_TAP_ALL_CARDS = true;
export const DEFAULT_DOUBLE_TAP_FOUNDATION_FIRST = true;
export const DEFAULT_WON = true;
export const DEFAULT_HIDE_MENU_BAR = false;
export const DEFAULT_WON_AND_RELOADED = false;
export const DEFAULT_FIRST_RUN = true;
export const DEFAULT_MOVED_FIRST_CARD = false;
export const DEFAULT_4_COLOR_MODE = false;
export const DEFAULT_TAP_TO_SELECT_ENABLED = true;
export const DEFAULT_SINGLE_TAP_SPECIAL_GAMES_ENABLED = true;
/*
 * Sound is on by default here, because the launcher's sound pill is.
 *
 * These are the same preference — the pill writes this key — so the two defaults have to
 * agree or one of them is lying. The pill reads "on" when the key is absent, which is the
 * app's position; this file said "off", so a fresh install showed a pressed Sound pill
 * over a silent card game.
 *
 * There is deliberately no `DEFAULT_SOUND_WIN_ENABLED` beside it. The win jingle follows
 * the main sound setting until the player sets it explicitly (getSavedSoundWinEnabled),
 * so it has no default of its own to disagree with. A constant saying "off" was here
 * once, exported and never read — the worst of both, because it read as though the win
 * sound defaulted to off while the code did the opposite.
 */
export const DEFAULT_SOUND_ENABLED = true;
export const DEFAULT_AUTO_START_NEW_GAME = true;
export const DEFAULT_FORCE_TABLET_LAYOUT = false;
export const DEFAULT_HIDE_TIME = false;
export const DEFAULT_HIDE_SCORE = false;
export const DEFAULT_SINGLE_TAP_ALL_GAMES = false;
export const DEFAULT_KLONDIKE_LIMITED_RECYCLES = false;
export const DEFAULT_USE_TRUE_RANDOMISATION = false;
export const MAX_SAVED_SCORES = 10;
/**
 * Ceiling on a stored comma-separated integer list, in characters.
 *
 * The score and recent-score lists are re-parsed on every `Scores.load()` -- every layout,
 * every resume, every settings change -- so a corrupt or hand-edited multi-megabyte value
 * was being turned into a multi-million element array several times per session. A real
 * list is 10 rows of three numbers; 16KB is four orders of magnitude more than that, and
 * cheap to hold. `RecordList` caps its own lists for the same reason and says why.
 */
const MAX_STORED_LIST_CHARS = 16384;
/** Wipes every stored setting — used by tests and by nothing else. */
export function resetAllPreferences() {
    Store.clearAll();
}
// --------------------------------------------------------------- raw storage
/**
 * Tiny typed wrapper over localStorage.
 *
 * Android's `SharedPreferences` is process-global, so the fallback used when storage is
 * unavailable (private browsing, or the Node test environment) has to be module-global too —
 * otherwise a second `Preferences` instance would not see the first one's writes.
 */
class Store {
    static fallback = new Map();
    static get memoryOnly() {
        try {
            return typeof localStorage === 'undefined';
        }
        catch {
            return true;
        }
    }
    get(key) {
        if (Store.memoryOnly) {
            return Store.fallback.get(key) ?? null;
        }
        try {
            return localStorage.getItem(key);
        }
        catch {
            return Store.fallback.get(key) ?? null;
        }
    }
    set(key, value) {
        if (Store.memoryOnly) {
            Store.fallback.set(key, value);
            return;
        }
        try {
            localStorage.setItem(key, value);
        }
        catch {
            Store.fallback.set(key, value);
        }
    }
    remove(key) {
        Store.fallback.delete(key);
        if (Store.memoryOnly) {
            return;
        }
        try {
            localStorage.removeItem(key);
        }
        catch {
            /* storage unavailable */
        }
    }
    /** Drops everything from both the primary and the fallback storage. */
    static clearAll() {
        for (const key of Array.from(Store.fallback.keys())) {
            Store.fallback.delete(key);
        }
        if (Store.memoryOnly) {
            return;
        }
        try {
            const doomed = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key != null && key.startsWith(SHARED_PREFIX)) {
                    doomed.push(key);
                }
            }
            for (const key of doomed) {
                localStorage.removeItem(key);
            }
        }
        catch {
            /* storage unavailable */
        }
    }
}
function parseIntSafe(value, fallback) {
    if (value == null) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}
function parseFloatSafe(value, fallback) {
    if (value == null) {
        return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}
/**
 * Port of `Preferences`. Two logical stores, mirroring `savedSharedData` / `savedGameData`.
 */
export class Preferences {
    static gameId = DEFAULT_GAME_ID;
    sharedStore = new Store();
    gameStore = new Store();
    // ------------------------------------------------- raw shared-data accessors
    getString(key, def) {
        const value = this.sharedStore.get(SHARED_PREFIX + key);
        return value === null ? def : value;
    }
    setString(key, value) {
        this.sharedStore.set(SHARED_PREFIX + key, value);
    }
    getInt(key, def) {
        return parseIntSafe(this.sharedStore.get(SHARED_PREFIX + key), def);
    }
    setInt(key, value) {
        this.sharedStore.set(SHARED_PREFIX + key, String(value));
    }
    getBool(key, def) {
        const value = this.sharedStore.get(SHARED_PREFIX + key);
        return value === null ? def : value === 'true';
    }
    setBool(key, value) {
        this.sharedStore.set(SHARED_PREFIX + key, value ? 'true' : 'false');
    }
    hasShared(key) {
        return this.sharedStore.get(SHARED_PREFIX + key) !== null;
    }
    static getGameId() {
        return Preferences.gameId;
    }
    /** PORT: selects the per-game localStorage namespace; call before reading prefs. */
    static setGameId(id) {
        Preferences.gameId = id || DEFAULT_GAME_ID;
    }
    get gamePrefix() {
        return gamePrefix(Preferences.gameId);
    }
    get backupPrefix() {
        return backupPrefix(Preferences.gameId);
    }
    getGameString(key, def) {
        const value = this.gameStore.get(this.gamePrefix + key);
        return value === null ? def : value;
    }
    setGameString(key, value) {
        this.gameStore.set(this.gamePrefix + key, value);
    }
    getGameInt(key, def) {
        return parseIntSafe(this.gameStore.get(this.gamePrefix + key), def);
    }
    setGameInt(key, value) {
        this.gameStore.set(this.gamePrefix + key, String(value));
    }
    getGameLong(key, def) {
        return parseIntSafe(this.gameStore.get(this.gamePrefix + key), def);
    }
    setGameLong(key, value) {
        this.gameStore.set(this.gamePrefix + key, String(value));
    }
    getGameBool(key, def) {
        const value = this.gameStore.get(this.gamePrefix + key);
        return value === null ? def : value === 'true';
    }
    setGameBool(key, value) {
        this.gameStore.set(this.gamePrefix + key, value ? 'true' : 'false');
    }
    getGameIntList(key) {
        return splitToNumbers(this.gameStore.get(this.gamePrefix + key));
    }
    setGameIntList(key, list) {
        this.gameStore.set(this.gamePrefix + key, list.join(',') + (list.length ? ',' : ''));
    }
    getGameLongList(key) {
        return splitToNumbers(this.gameStore.get(this.gamePrefix + key));
    }
    setGameLongList(key, list) {
        this.gameStore.set(this.gamePrefix + key, list.join(',') + (list.length ? ',' : ''));
    }
    /**
     * Copies the complete saved data of the current game to a backup file after a successful
     * save, so a corrupt save can be reverted to the last known good state.
     * Port of `Preferences.backupGameData()`.
     */
    backupGameData() {
        for (const key of this.gameKeys()) {
            const full = this.gamePrefix + key;
            const value = this.gameStore.get(full);
            if (value !== null) {
                this.gameStore.set(this.backupPrefix + key, value);
            }
        }
    }
    /**
     * Restores the last known good game save from the backup file.
     * Port of `Preferences.restoreGameDataBackup()`.
     */
    restoreGameDataBackup() {
        const keys = this.backupKeys();
        if (keys.length === 0) {
            return false;
        }
        for (const key of keys) {
            const value = this.gameStore.get(this.backupPrefix + key);
            if (value !== null) {
                this.gameStore.set(this.gamePrefix + key, value);
            }
        }
        return true;
    }
    gameKeys() {
        return this.keysWithPrefix(this.gamePrefix);
    }
    backupKeys() {
        return this.keysWithPrefix(this.backupPrefix);
    }
    keysWithPrefix(prefix) {
        const result = [];
        if (this.memoryOnlyProbe()) {
            return result;
        }
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key != null && key.startsWith(prefix)) {
                    result.push(key.substring(prefix.length));
                }
            }
        }
        catch {
            /* storage unavailable */
        }
        return result;
    }
    memoryOnlyProbe() {
        try {
            return typeof localStorage === 'undefined';
        }
        catch {
            return true;
        }
    }
    /**
     * Ensure these settings exist, otherwise the settings screen would think the user just
     * changed them (port of `Preferences.setCriticalSettings()`).
     */
    setCriticalSettings() {
        this.saveLocale(this.getSavedLocale());
        this.saveForcedTabletLayout(this.getSavedForcedTabletLayout());
        this.saveSingleTapAllGames(this.getSingleTapAllGames());
        this.saveTapToSelectEnabled(this.getSavedTapToSelectEnabled());
        this.saveLeftHandedMode(this.getSavedLeftHandedMode());
    }
    /** Port of `Preferences.setCriticalGameSettings()` (Klondike only). */
    setCriticalGameSettings() {
        this.saveKlondikeDrawMode(this.getSavedKlondikeDrawMode());
    }
    // -------------------------------------------------- per-game data (getters)
    getSavedTotalTimePlayed() {
        return this.getGameLong(PREF_KEY_TOTAL_TIME_PLAYED, 0);
    }
    getSavedTotalPointsEarned() {
        return this.getGameLong(PREF_KEY_TOTAL_POINTS_EARNED, 0);
    }
    getSavedEndTime() {
        return this.getGameLong(PREF_KEY_TIMER_END_TIME, Date.now());
    }
    getSavedScore() {
        return this.getGameLong(PREF_KEY_SCORE, 0);
    }
    getSavedStartTime() {
        return this.getGameLong(PREF_KEY_TIMER_START_TIME, Date.now());
    }
    getSavedWinningTime() {
        return this.getGameLong(PREF_KEY_TIMER_WINNING_TIME, DEFAULT_WINNING_TIME);
    }
    getSavedHighScores() {
        const scores = this.getGameLongList(PREF_KEY_SAVED_SCORES + '0');
        const times = this.getGameLongList(PREF_KEY_SAVED_SCORES + '1');
        const dates = this.getGameLongList(PREF_KEY_SAVED_SCORES + '2');
        return buildScoreMatrix(scores, times, dates);
    }
    getSavedRecentScores() {
        const scores = this.getGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '0');
        const times = this.getGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '1');
        const dates = this.getGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '2');
        return buildScoreMatrix(scores, times, dates);
    }
    getSavedTotalNumberUndos() {
        return this.getGameInt(PREF_KEY_TOTAL_NUMBER_UNDOS, 0);
    }
    getSavedTotalHintsShown() {
        return this.getGameInt(PREF_KEY_TOTAL_HINTS_SHOWN, 0);
    }
    getSavedRecycleCounter(total) {
        return this.getGameInt(PREF_KEY_GAME_REDEAL_COUNT, total);
    }
    getSavedLongestRun() {
        return this.getGameInt(PREF_KEY_LONGEST_RUN, 0);
    }
    getSavedRunCounter() {
        return this.getGameInt(PREF_KEY_RUN_COUNTER, 0);
    }
    getSavedNumberOfPlayedGames() {
        return this.getGameInt(PREF_KEY_GAME_NUMBER_OF_PLAYED_GAMES, this.getSavedNumberOfWonGames());
    }
    getSavedNumberOfWonGames() {
        return this.getGameInt(PREF_KEY_GAME_NUMBER_OF_WON_GAMES, 0);
    }
    getSavedEnsureMovabilityMinMoves() {
        return this.getGameInt(PREF_KEY_ENSURE_MOVABILITY_MIN_MOVES, DEFAULT_ENSURE_MOVABILITY_MIN_MOVES);
    }
    static getDifficultyKey(sharedPrefName) {
        return 'difficulty_' + sharedPrefName;
    }
    getSavedDifficulty() {
        return this.getString(Preferences.getDifficultyKey(Preferences.gameId), VALUE_DIFFICULTY_MEDIUM);
    }
    /** Port of `Preferences.isEnsureMovabilityEnabledForCurrentGame()`. */
    isEnsureMovabilityEnabledForCurrentGame() {
        return DifficultyPolicy.isEnsureMovabilityEnabled(this.getSavedDifficulty(), this.getSavedEnsureMovability());
    }
    getSavedEnsureMovabilityMinMovesForCurrentGame() {
        return DifficultyPolicy.minMovesForDifficulty(this.getSavedDifficulty(), this.getSavedEnsureMovabilityMinMoves());
    }
    getSavedRecordListEntriesSize() {
        return this.getGameInt(PREF_KEY_RECORD_LIST_ENTRIES_SIZE, -1);
    }
    getSavedFlipCardId(pos) {
        return this.getGameInt(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_FLIP_CARD, -1);
    }
    isFirstRun() {
        return this.getGameBool(PREF_KEY_GAME_FIRST_RUN, DEFAULT_FIRST_RUN);
    }
    hasSettingsOnlyForThisGame() {
        // One game per iframe: customization always scopes to the loaded game.
        return this.getSavedCurrentGame() !== DEFAULT_CURRENT_GAME;
    }
    /**
     * One-time seed of this game's customization store from the shared keys that used
     * to apply to both Klondike and Pyramid. Safe to call on every boot: a written
     * flag means this game has already been split.
     */
    ensureSettingsOnlyForThisGame() {
        if (this.getSavedCurrentGame() === DEFAULT_CURRENT_GAME) {
            return;
        }
        if (this.gameStore.get(this.gamePrefix + PREF_KEY_SETTINGS_ONLY_FOR_THIS_GAME) !== null) {
            return;
        }
        this.copySharedCustomizationToThisGame();
        this.setGameBool(PREF_KEY_SETTINGS_ONLY_FOR_THIS_GAME, true);
    }
    isDealingCards() {
        return this.getGameBool(PREF_KEY_DEALING_CARDS, false);
    }
    isWon() {
        return this.getGameBool(PREF_KEY_GAME_WON, DEFAULT_WON);
    }
    /**
     * True when this game has an explicit GameWon entry. The default for a missing key is
     * `true` (Android legacy), which must not be treated as "the player already won" —
     * that would auto-start a new deal on every fresh storage wipe.
     */
    hasSavedWon() {
        return this.gameStore.get(this.gamePrefix + PREF_KEY_GAME_WON) !== null;
    }
    isWonAndReloaded() {
        return this.getGameBool(PREF_KEY_GAME_WON_AND_RELOADED, DEFAULT_WON_AND_RELOADED);
    }
    hasMovedFirstCard() {
        return this.getGameBool(PREF_KEY_GAME_MOVED_FIRST_CARD, DEFAULT_MOVED_FIRST_CARD);
    }
    getSavedCards() {
        return this.getGameIntList(PREF_KEY_CARDS);
    }
    getSavedStacks(id) {
        return this.getGameIntList(PREF_KEY_STACK + id);
    }
    getSavedRandomCards() {
        return this.getGameIntList(PREF_KEY_GAME_RANDOM_CARDS);
    }
    getSavedRecordListCards(pos) {
        return this.getGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_CARD);
    }
    getSavedRecordListOrigins(pos) {
        return this.getGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_ORIGIN);
    }
    getSavedRecordListOrders(pos) {
        return this.getGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_ORDER);
    }
    getSavedRecordListFlipCards(pos) {
        return this.getGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_FLIP_CARD);
    }
    // -------------------------------------------------- per-game data (setters)
    saveTotalPointsEarned(value) {
        this.setGameLong(PREF_KEY_TOTAL_POINTS_EARNED, value);
    }
    saveTotalTimePlayed(value) {
        this.setGameLong(PREF_KEY_TOTAL_TIME_PLAYED, value);
    }
    saveScore(value) {
        this.setGameLong(PREF_KEY_SCORE, value);
    }
    saveStartTime(value) {
        this.setGameLong(PREF_KEY_TIMER_START_TIME, value);
    }
    saveEndTime(value) {
        this.setGameLong(PREF_KEY_TIMER_END_TIME, value);
    }
    saveWinningTime(value) {
        this.setGameLong(PREF_KEY_TIMER_WINNING_TIME, value);
    }
    saveHighScores(savedScores) {
        this.setGameLongList(PREF_KEY_SAVED_SCORES + '0', column(savedScores, 0));
        this.setGameLongList(PREF_KEY_SAVED_SCORES + '1', column(savedScores, 1));
        this.setGameLongList(PREF_KEY_SAVED_SCORES + '2', column(savedScores, 2));
    }
    saveRecentScores(savedScores) {
        this.setGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '0', column(savedScores, 0));
        this.setGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '1', column(savedScores, 1));
        this.setGameLongList(PREF_KEY_SAVED_RECENT_SCORES + '2', column(savedScores, 2));
    }
    saveTotalNumberUndos(value) {
        this.setGameInt(PREF_KEY_TOTAL_NUMBER_UNDOS, value);
    }
    saveTotalHintsShown(value) {
        this.setGameInt(PREF_KEY_TOTAL_HINTS_SHOWN, value);
    }
    saveRedealCount(value) {
        this.setGameInt(PREF_KEY_GAME_REDEAL_COUNT, value);
    }
    saveEnsureMovabilityMinMoves(value) {
        this.setGameInt(PREF_KEY_ENSURE_MOVABILITY_MIN_MOVES, value);
    }
    saveLongestRun(value) {
        this.setGameInt(PREF_KEY_LONGEST_RUN, value);
    }
    saveRunCounter(value) {
        this.setGameInt(PREF_KEY_RUN_COUNTER, value);
    }
    saveNumberOfWonGames(value) {
        this.setGameInt(PREF_KEY_GAME_NUMBER_OF_WON_GAMES, value);
    }
    saveNumberOfPlayedGames(value) {
        this.setGameInt(PREF_KEY_GAME_NUMBER_OF_PLAYED_GAMES, value);
    }
    saveRecordListEntriesSize(value) {
        this.setGameInt(PREF_KEY_RECORD_LIST_ENTRIES_SIZE, value);
    }
    setSettingsOnlyForThisGame(value) {
        this.setGameBool(PREF_KEY_SETTINGS_ONLY_FOR_THIS_GAME, value);
    }
    saveFirstRun(value) {
        this.setGameBool(PREF_KEY_GAME_FIRST_RUN, value);
    }
    setDealingCards(value) {
        this.setGameBool(PREF_KEY_DEALING_CARDS, value);
    }
    saveWon(value) {
        this.setGameBool(PREF_KEY_GAME_WON, value);
    }
    saveWonAndReloaded(value) {
        this.setGameBool(PREF_KEY_GAME_WON_AND_RELOADED, value);
    }
    saveMovedFirstCard(value) {
        this.setGameBool(PREF_KEY_GAME_MOVED_FIRST_CARD, value);
    }
    saveCards(list) {
        this.setGameIntList(PREF_KEY_CARDS, list);
    }
    saveStacks(list, id) {
        this.setGameIntList(PREF_KEY_STACK + id, list);
    }
    saveRandomCards(list) {
        this.setGameIntList(PREF_KEY_GAME_RANDOM_CARDS, list);
    }
    saveRecordListCards(list, pos) {
        this.setGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_CARD, list);
    }
    saveRecordListOrigins(list, pos) {
        this.setGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_ORIGIN, list);
    }
    saveRecordListOrders(list, pos) {
        this.setGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_ORDER, list);
    }
    saveRecordListFlipCards(list, pos) {
        this.setGameIntList(PREF_KEY_RECORD_LIST_ENTRY + pos + PREF_KEY_FLIP_CARD, list);
    }
    // -------------------------------------------- shared settings (getters)
    getSavedGameLayoutMarginsPortrait() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, DEFAULT_GAME_LAYOUT_MARGINS_PORTRAIT)
            : this.getInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, DEFAULT_GAME_LAYOUT_MARGINS_PORTRAIT);
    }
    getSavedGameLayoutMarginsLandscape() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, DEFAULT_GAME_LAYOUT_MARGINS_LANDSCAPE)
            : this.getInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, DEFAULT_GAME_LAYOUT_MARGINS_LANDSCAPE);
    }
    getSavedCardBackground() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_CARD_BACKGROUND, DEFAULT_CARD_BACKGROUND)
            : this.getInt(PREF_KEY_CARD_BACKGROUND, DEFAULT_CARD_BACKGROUND);
    }
    getSavedCardBackgroundColor() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_CARD_BACKGROUND_COLOR, DEFAULT_CARD_BACKGROUND_COLOR)
            : this.getInt(PREF_KEY_CARD_BACKGROUND_COLOR, DEFAULT_CARD_BACKGROUND_COLOR);
    }
    getSavedBackgroundColorType() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_BACKGROUND_COLOR_TYPE, DEFAULT_BACKGROUND_COLOR_TYPE)
            : this.getInt(PREF_KEY_BACKGROUND_COLOR_TYPE, DEFAULT_BACKGROUND_COLOR_TYPE);
    }
    getSavedBackgroundCustomColor() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, DEFAULT_BACKGROUND_COLOR_CUSTOM)
            : this.getInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, DEFAULT_BACKGROUND_COLOR_CUSTOM);
    }
    getSavedCardTheme() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_CARD_DRAWABLES, 1)
            : this.getInt(PREF_KEY_CARD_DRAWABLES, 1);
    }
    getSavedCurrentGame() {
        return this.getInt(PREF_KEY_CURRENT_GAME, DEFAULT_CURRENT_GAME);
    }
    getSavedLastPlayedGame() {
        return this.getInt(PREF_KEY_LAST_PLAYED_GAME, DEFAULT_CURRENT_GAME);
    }
    getSavedOrientation() {
        return parseIntSafe(this.getString(PREF_KEY_ORIENTATION, DEFAULT_ORIENTATION), 1);
    }
    getSavedBackgroundColor() {
        const fallback = parseIntSafe(DEFAULT_BACKGROUND_COLOR, 2);
        return this.hasSettingsOnlyForThisGame()
            ? parseIntSafe(this.getGameString(PREF_KEY_BACKGROUND_COLOR, DEFAULT_BACKGROUND_COLOR), fallback)
            : parseIntSafe(this.getString(PREF_KEY_BACKGROUND_COLOR, DEFAULT_BACKGROUND_COLOR), fallback);
    }
    getSavedTextColor() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameInt(PREF_KEY_TEXT_COLOR, DEFAULT_TEXT_COLOR)
            : this.getInt(PREF_KEY_TEXT_COLOR, DEFAULT_TEXT_COLOR);
    }
    getSavedThemeColor() {
        return this.getString(PREF_KEY_THEME_COLOR, DEFAULT_THEME_COLOR);
    }
    getSavedNightMode() {
        return this.getString(PREF_KEY_NIGHT_MODE, DEFAULT_NIGHT_MODE);
    }
    getSavedDynamicColors() {
        return this.getBool(PREF_KEY_DYNAMIC_COLORS, DEFAULT_DYNAMIC_COLORS);
    }
    getSavedMenuColumnsPortrait() {
        return parseIntSafe(this.getString(PREF_KEY_MENU_COLUMNS_PORTRAIT, DEFAULT_MENU_COLUMNS_PORTRAIT), 4);
    }
    getSavedMenuColumnsLandscape() {
        return parseIntSafe(this.getString(PREF_KEY_MENU_COLUMNS_LANDSCAPE, DEFAULT_MENU_COLUMNS_LANDSCAPE), 6);
    }
    getSavedNumberOfRecycles(key, defaultValue) {
        return parseIntSafe(this.getString(key, defaultValue), parseIntSafe(defaultValue, 0));
    }
    getSavedMovementSpeed() {
        const defaultSpeed = parseFloatSafe(DEFAULT_MOVEMENT_SPEED, 2);
        const value = parseFloatSafe(this.getString(PREF_KEY_MOVEMENT_SPEED, DEFAULT_MOVEMENT_SPEED), defaultSpeed);
        return value <= 0 ? defaultSpeed : value;
    }
    getSavedMaxNumberUndos() {
        return this.getInt(PREF_KEY_MAX_NUMBER_UNDOS, DEFAULT_MAX_NUMBER_UNDOS);
    }
    getSavedLocale() {
        return this.getString(PREF_KEY_LANGUAGE, DEFAULT_LANGUAGE);
    }
    getSavedKlondikeDrawMode() {
        return this.getString(PREF_KEY_KLONDIKE_DRAW, DEFAULT_KLONDIKE_DRAW);
    }
    getSavedKlondikeDrawModeOld() {
        return this.getString(PREF_KEY_KLONDIKE_DRAW_OLD, DEFAULT_KLONDIKE_DRAW);
    }
    getSavedMenuBarPosPortrait() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameString(PREF_KEY_MENU_BAR_POS_PORTRAIT, DEFAULT_MENU_BAR_POSITION_PORTRAIT)
            : this.getString(PREF_KEY_MENU_BAR_POS_PORTRAIT, DEFAULT_MENU_BAR_POSITION_PORTRAIT);
    }
    getSavedMenuBarPosLandscape() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, DEFAULT_MENU_BAR_POSITION_LANDSCAPE)
            : this.getString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, DEFAULT_MENU_BAR_POSITION_LANDSCAPE);
    }
    getSavedForcedTabletLayout() {
        return this.getBool(PREF_KEY_FORCE_TABLET_LAYOUT, DEFAULT_FORCE_TABLET_LAYOUT);
    }
    getSavedLeftHandedMode() {
        return this.getBool(PREF_KEY_LEFT_HANDED_MODE, DEFAULT_LEFT_HANDED_MODE);
    }
    getSavedFourColorMode() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameBool(PREF_KEY_4_COLOR_MODE, DEFAULT_4_COLOR_MODE)
            : this.getBool(PREF_KEY_4_COLOR_MODE, DEFAULT_4_COLOR_MODE);
    }
    getSavedHideStatusBar() {
        return this.getBool(PREF_KEY_HIDE_STATUS_BAR, false);
    }
    getSavedStatisticsHideWinPercentage() {
        return this.getBool(PREF_KEY_STATISTICS_HIDE_WIN_PERCENTAGE, DEFAULT_STATISTICS_HIDE_WIN_PERCENTAGE);
    }
    getHideMenuButton() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameBool(PREF_KEY_HIDE_MENU_BUTTON, DEFAULT_HIDE_MENU_BUTTON)
            : this.getBool(PREF_KEY_HIDE_MENU_BUTTON, DEFAULT_HIDE_MENU_BUTTON);
    }
    getHideAutoCompleteButton() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, DEFAULT_HIDE_AUTOCOMPLETE_BUTTON)
            : this.getBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, DEFAULT_HIDE_AUTOCOMPLETE_BUTTON);
    }
    getSavedImmersiveMode() {
        return this.getBool(PREF_KEY_IMMERSIVE_MODE, DEFAULT_IMMERSIVE_MODE);
    }
    getSavedKlondikeLimitedRecycles() {
        return this.getBool(PREF_KEY_KLONDIKE_LIMITED_RECYCLES, DEFAULT_KLONDIKE_LIMITED_RECYCLES);
    }
    // ---------------------------------------------------------------- Pyramid
    /* Port of the `getSavedPyramid*` group in `helper/Preferences.java`. */
    getSavedPyramidDifficulty() {
        return this.getString(PREF_KEY_PYRAMID_DIFFICULTY, DEFAULT_PYRAMID_DIFFICULTY);
    }
    savePyramidDifficulty(value) {
        this.setString(PREF_KEY_PYRAMID_DIFFICULTY, value);
    }
    getSavedPyramidLimitedRecycles() {
        return this.getBool(PREF_KEY_PYRAMID_LIMITED_RECYCLES, DEFAULT_PYRAMID_LIMITED_RECYCLES);
    }
    savePyramidLimitedRecycles(value) {
        this.setBool(PREF_KEY_PYRAMID_LIMITED_RECYCLES, value);
    }
    getSavedPyramidAutoMove() {
        return this.getBool(PREF_KEY_PYRAMID_AUTO_MOVE, DEFAULT_PYRAMID_AUTO_MOVE);
    }
    savePyramidAutoMove(value) {
        this.setBool(PREF_KEY_PYRAMID_AUTO_MOVE, value);
    }
    getSavedHideTime() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameBool(PREF_KEY_HIDE_TIME, DEFAULT_HIDE_TIME)
            : this.getBool(PREF_KEY_HIDE_TIME, DEFAULT_HIDE_TIME);
    }
    getSavedHideScore() {
        return this.hasSettingsOnlyForThisGame()
            ? this.getGameBool(PREF_KEY_HIDE_SCORE, DEFAULT_HIDE_SCORE)
            : this.getBool(PREF_KEY_HIDE_SCORE, DEFAULT_HIDE_SCORE);
    }
    getSavedAutoStartNewGame() {
        return this.getBool(PREF_KEY_AUTO_START_NEW_GAME, DEFAULT_AUTO_START_NEW_GAME);
    }
    getSavedTapToSelectEnabled() {
        return this.getBool(PREF_KEY_TAP_TO_SELECT_ENABLED, DEFAULT_TAP_TO_SELECT_ENABLED);
    }
    getSavedDoubleTapEnabled() {
        return this.getBool(PREF_KEY_DOUBLE_TAP_ENABLED, DEFAULT_DOUBLE_TAP_ENABLE);
    }
    getSavedDoubleTapAllCards() {
        return this.getBool(PREF_KEY_DOUBLE_TAP_ALL_CARDS, DEFAULT_DOUBLE_TAP_ALL_CARDS);
    }
    getSavedDoubleTapFoundationFirst() {
        return this.getBool(PREF_KEY_DOUBLE_TAP_FOUNDATION_FIRST, DEFAULT_DOUBLE_TAP_FOUNDATION_FIRST);
    }
    getSavedEnsureMovability() {
        return this.getBool(PREF_KEY_ENSURE_MOVABILITY, DEFAULT_ENSURE_MOVABILITY);
    }
    getSavedSingleTapSpecialGames() {
        return this.getBool(PREF_KEY_SINGLE_TAP_SPECIAL_GAMES, DEFAULT_SINGLE_TAP_SPECIAL_GAMES_ENABLED);
    }
    getSavedStartWithMenu() {
        return this.getBool(PREF_KEY_START_WITH_MENU, false);
    }
    getSavedSoundEnabled() {
        return this.getBool(PREF_KEY_SOUND_ENABLED, DEFAULT_SOUND_ENABLED);
    }
    /** The win jingle follows the main sound toggle until the user sets it explicitly. */
    getSavedSoundWinEnabled() {
        if (!this.hasShared(PREF_KEY_SOUND_WIN_ENABLED)) {
            return this.getSavedSoundEnabled();
        }
        return this.getBool(PREF_KEY_SOUND_WIN_ENABLED, DEFAULT_SOUND_ENABLED);
    }
    getSingleTapAllGames() {
        return this.getBool(PREF_KEY_SINGLE_TAP_ALL_GAMES, DEFAULT_SINGLE_TAP_ALL_GAMES);
    }
    getSavedUseTrueRandomisation() {
        return this.getBool(PREF_KEY_USE_TRUE_RANDOMISATION, DEFAULT_USE_TRUE_RANDOMISATION);
    }
    getShowDialogNewGame() {
        return this.getBool(PREF_KEY_SHOW_DIALOG_NEW_GAME, DEFAULT_SHOW_DIALOG_NEW_GAME);
    }
    getShowDialogRedeal() {
        return this.getBool(PREF_KEY_SHOW_DIALOG_REDEAL, DEFAULT_SHOW_DIALOG_REDEAL);
    }
    getDisableUndoCosts() {
        return this.getBool(PREF_KEY_DISABLE_UNDO_COSTS, DEFAULT_DISABLE_UNDO_COSTS);
    }
    getDisableHintCosts() {
        return this.getBool(PREF_KEY_DISABLE_HINT_COSTS, DEFAULT_DISABLE_HINT_COSTS);
    }
    getHideMenuBar() {
        return this.getBool(PREF_KEY_HIDE_MENU_BAR, DEFAULT_HIDE_MENU_BAR);
    }
    // -------------------------------------------- shared settings (setters)
    saveKlondikeDrawModeOld() {
        this.setString(PREF_KEY_KLONDIKE_DRAW_OLD, this.getSavedKlondikeDrawMode());
    }
    saveBackgroundColorType(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_BACKGROUND_COLOR_TYPE, value);
        }
        else {
            this.setInt(PREF_KEY_BACKGROUND_COLOR_TYPE, value);
        }
    }
    saveBackgroundCustomColor(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, value);
        }
        else {
            this.setInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, value);
        }
    }
    saveCardBackground(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_CARD_BACKGROUND, value);
        }
        else {
            this.setInt(PREF_KEY_CARD_BACKGROUND, value);
        }
    }
    saveCardBackgroundColor(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_CARD_BACKGROUND_COLOR, value);
        }
        else {
            this.setInt(PREF_KEY_CARD_BACKGROUND_COLOR, value);
        }
    }
    saveCardTheme(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_CARD_DRAWABLES, value);
        }
        else {
            this.setInt(PREF_KEY_CARD_DRAWABLES, value);
        }
    }
    saveGameLayoutMarginsPortrait(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, value);
        }
        else {
            this.setInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, value);
        }
    }
    saveGameLayoutMarginsLandscape(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, value);
        }
        else {
            this.setInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, value);
        }
    }
    saveCurrentGame(value) {
        this.setInt(PREF_KEY_CURRENT_GAME, value);
    }
    saveLastPlayedGame(value) {
        this.setInt(PREF_KEY_LAST_PLAYED_GAME, value);
    }
    saveLocale(locale) {
        this.setString(PREF_KEY_LANGUAGE, locale);
    }
    saveKlondikeDrawMode(value) {
        this.setString(PREF_KEY_KLONDIKE_DRAW, value);
    }
    saveForcedTabletLayout(value) {
        this.setBool(PREF_KEY_FORCE_TABLET_LAYOUT, value);
    }
    saveHideMenuBar(value) {
        this.setBool(PREF_KEY_HIDE_MENU_BAR, value);
    }
    saveStatisticsHideWinPercentage(value) {
        this.setBool(PREF_KEY_STATISTICS_HIDE_WIN_PERCENTAGE, value);
    }
    saveBackgroundColor(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameString(PREF_KEY_BACKGROUND_COLOR, String(value));
        }
        else {
            this.setString(PREF_KEY_BACKGROUND_COLOR, String(value));
        }
    }
    saveMaxNumberUndos(value) {
        this.setInt(PREF_KEY_MAX_NUMBER_UNDOS, value);
    }
    saveTextColor(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameInt(PREF_KEY_TEXT_COLOR, value);
        }
        else {
            this.setInt(PREF_KEY_TEXT_COLOR, value);
        }
    }
    saveMenuBarPosPortrait(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameString(PREF_KEY_MENU_BAR_POS_PORTRAIT, value);
        }
        else {
            this.setString(PREF_KEY_MENU_BAR_POS_PORTRAIT, value);
        }
    }
    saveMenuBarPosLandscape(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, value);
        }
        else {
            this.setString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, value);
        }
    }
    saveMenuColumnsPortrait(value) {
        this.setString(PREF_KEY_MENU_COLUMNS_PORTRAIT, value);
    }
    saveMenuColumnsLandscape(value) {
        this.setString(PREF_KEY_MENU_COLUMNS_LANDSCAPE, value);
    }
    saveSingleTapAllGames(value) {
        this.setBool(PREF_KEY_SINGLE_TAP_ALL_GAMES, value);
    }
    saveTapToSelectEnabled(value) {
        this.setBool(PREF_KEY_TAP_TO_SELECT_ENABLED, value);
    }
    saveLeftHandedMode(value) {
        this.setBool(PREF_KEY_LEFT_HANDED_MODE, value);
    }
    putShowDialogNewGame(value) {
        this.setBool(PREF_KEY_SHOW_DIALOG_NEW_GAME, value);
    }
    putShowDialogRedeal(value) {
        this.setBool(PREF_KEY_SHOW_DIALOG_REDEAL, value);
    }
    putFourColorMode(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameBool(PREF_KEY_4_COLOR_MODE, value);
        }
        else {
            this.setBool(PREF_KEY_4_COLOR_MODE, value);
        }
    }
    putHideTime(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameBool(PREF_KEY_HIDE_TIME, value);
        }
        else {
            this.setBool(PREF_KEY_HIDE_TIME, value);
        }
    }
    putHideScore(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameBool(PREF_KEY_HIDE_SCORE, value);
        }
        else {
            this.setBool(PREF_KEY_HIDE_SCORE, value);
        }
    }
    putHideMenuButton(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameBool(PREF_KEY_HIDE_MENU_BUTTON, value);
        }
        else {
            this.setBool(PREF_KEY_HIDE_MENU_BUTTON, value);
        }
    }
    putHideAutoCompleteButton(value) {
        if (this.hasSettingsOnlyForThisGame()) {
            this.setGameBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, value);
        }
        else {
            this.setBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, value);
        }
    }
    /**
     * Copies the game-specific settings into the per-game store.
     * Port of `Preferences.copyToGameIndividualSettings()` (Klondike-relevant keys only).
     *
     * Reads the *shared* keys directly so a migration still works after
     * `hasSettingsOnlyForThisGame()` always returns true for a loaded game.
     */
    copyToGameIndividualSettings() {
        this.copySharedCustomizationToThisGame();
    }
    /** Seeds the current game store from the shared customization keys. */
    copySharedCustomizationToThisGame() {
        this.setGameBool(PREF_KEY_HIDE_MENU_BUTTON, this.getBool(PREF_KEY_HIDE_MENU_BUTTON, DEFAULT_HIDE_MENU_BUTTON));
        this.setGameBool(PREF_KEY_HIDE_TIME, this.getBool(PREF_KEY_HIDE_TIME, DEFAULT_HIDE_TIME));
        this.setGameBool(PREF_KEY_HIDE_SCORE, this.getBool(PREF_KEY_HIDE_SCORE, DEFAULT_HIDE_SCORE));
        this.setGameBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, this.getBool(PREF_KEY_HIDE_AUTOCOMPLETE_BUTTON, DEFAULT_HIDE_AUTOCOMPLETE_BUTTON));
        this.setGameBool(PREF_KEY_4_COLOR_MODE, this.getBool(PREF_KEY_4_COLOR_MODE, DEFAULT_4_COLOR_MODE));
        this.setGameString(PREF_KEY_MENU_BAR_POS_PORTRAIT, this.getString(PREF_KEY_MENU_BAR_POS_PORTRAIT, DEFAULT_MENU_BAR_POSITION_PORTRAIT));
        this.setGameString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, this.getString(PREF_KEY_MENU_BAR_POS_LANDSCAPE, DEFAULT_MENU_BAR_POSITION_LANDSCAPE));
        this.setGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, this.getInt(PREF_KEY_GAME_LAYOUT_MARGINS_PORTRAIT, DEFAULT_GAME_LAYOUT_MARGINS_PORTRAIT));
        this.setGameInt(PREF_KEY_TEXT_COLOR, this.getInt(PREF_KEY_TEXT_COLOR, DEFAULT_TEXT_COLOR));
        this.setGameInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, this.getInt(PREF_KEY_GAME_LAYOUT_MARGINS_LANDSCAPE, DEFAULT_GAME_LAYOUT_MARGINS_LANDSCAPE));
        this.setGameString(PREF_KEY_BACKGROUND_COLOR, this.getString(PREF_KEY_BACKGROUND_COLOR, DEFAULT_BACKGROUND_COLOR));
        this.setGameInt(PREF_KEY_BACKGROUND_COLOR_TYPE, this.getInt(PREF_KEY_BACKGROUND_COLOR_TYPE, DEFAULT_BACKGROUND_COLOR_TYPE));
        this.setGameInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, this.getInt(PREF_KEY_BACKGROUND_COLOR_CUSTOM, DEFAULT_BACKGROUND_COLOR_CUSTOM));
        this.setGameInt(PREF_KEY_CARD_DRAWABLES, this.getInt(PREF_KEY_CARD_DRAWABLES, 1));
        this.setGameInt(PREF_KEY_CARD_BACKGROUND, this.getInt(PREF_KEY_CARD_BACKGROUND, DEFAULT_CARD_BACKGROUND));
        this.setGameInt(PREF_KEY_CARD_BACKGROUND_COLOR, this.getInt(PREF_KEY_CARD_BACKGROUND_COLOR, DEFAULT_CARD_BACKGROUND_COLOR));
    }
    // ------------------------------------------------------------- new setters
    // The Android app let the preference widgets write straight into SharedPreferences.
    // The port keeps the same behaviour with these small named setters.
    saveThemeColor(value) {
        this.setString(PREF_KEY_THEME_COLOR, value);
    }
    saveNightMode(value) {
        this.setString(PREF_KEY_NIGHT_MODE, value);
    }
    saveDifficulty(value) {
        this.setString(Preferences.getDifficultyKey(Preferences.gameId), value);
    }
    saveOrientation(value) {
        this.setString(PREF_KEY_ORIENTATION, String(value));
    }
    saveMovementSpeed(value) {
        this.setString(PREF_KEY_MOVEMENT_SPEED, value);
    }
    saveNumberOfRecycles(key, value) {
        this.setString(key, value);
    }
    saveKlondikeLimitedRecycles(value) {
        this.setBool(PREF_KEY_KLONDIKE_LIMITED_RECYCLES, value);
    }
    saveDoubleTapEnabled(value) {
        this.setBool(PREF_KEY_DOUBLE_TAP_ENABLED, value);
    }
    saveDoubleTapAllCards(value) {
        this.setBool(PREF_KEY_DOUBLE_TAP_ALL_CARDS, value);
    }
    saveDoubleTapFoundationFirst(value) {
        this.setBool(PREF_KEY_DOUBLE_TAP_FOUNDATION_FIRST, value);
    }
    saveImmersiveMode(value) {
        this.setBool(PREF_KEY_IMMERSIVE_MODE, value);
    }
    saveAutoStartNewGame(value) {
        this.setBool(PREF_KEY_AUTO_START_NEW_GAME, value);
    }
    saveEnsureMovability(value) {
        this.setBool(PREF_KEY_ENSURE_MOVABILITY, value);
    }
    saveStartWithMenu(value) {
        this.setBool(PREF_KEY_START_WITH_MENU, value);
    }
    saveDisableUndoCosts(value) {
        this.setBool(PREF_KEY_DISABLE_UNDO_COSTS, value);
    }
    saveDisableHintCosts(value) {
        this.setBool(PREF_KEY_DISABLE_HINT_COSTS, value);
    }
    saveUseTrueRandomisation(value) {
        this.setBool(PREF_KEY_USE_TRUE_RANDOMISATION, value);
    }
    saveSoundEnabled(value) {
        this.setBool(PREF_KEY_SOUND_ENABLED, value);
    }
    saveSoundWinEnabled(value) {
        this.setBool(PREF_KEY_SOUND_WIN_ENABLED, value);
    }
}
// ----------------------------------------------------------------- helpers
function splitToNumbers(raw) {
    if (raw == null || raw.length === 0 || raw.length > MAX_STORED_LIST_CHARS) {
        return [];
    }
    const result = [];
    for (const token of raw.split(',')) {
        if (token.length === 0) {
            continue;
        }
        const value = Number.parseInt(token, 10);
        if (!Number.isNaN(value)) {
            result.push(value);
        }
    }
    return result;
}
function buildScoreMatrix(scores, times, dates) {
    const matrix = [];
    for (let i = 0; i < MAX_SAVED_SCORES; i++) {
        matrix.push([
            scores.length > i ? scores[i] : 0,
            times.length > i ? times[i] : 0,
            dates.length > i ? dates[i] : 0,
        ]);
    }
    return matrix;
}
function column(matrix, index) {
    return matrix.map((row) => row[index]);
}
