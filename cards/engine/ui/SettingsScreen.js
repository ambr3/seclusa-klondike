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
 * Port of the settings screens:
 *   - `ui/settings/Settings.java` (headers list + detail pane, custom preference rows)
 *   - `res/xml/pref_customize.xml`, `pref_games.xml`, `pref_sounds.xml`,
 *     `pref_movement_methods.xml`, `pref_other.xml`, `pref_expert_settings.xml`
 *   - the `DialogPreference*` classes for cards, card background, colours, margins,
 *     menu bar position, max undos and ensure-movability min moves
 *
 * Trimmed for Seclusa Games: each iframe hosts one game, so there is no in-app game
 * selector / main-menu settings, and light/dark + palette live on the launcher Theme
 * control. Orientation, immersive mode, hide-menu, and "this game only" are gone too.
 *
 * Layout: one scrolling page of grouped cards (Rules, Look, Controls, Sound, Advanced)
 * instead of the Android master/detail sidebar — easier to scan in a single-game iframe.
 */
import { shared } from '../game/SharedData.js';
import { Preferences } from '../game/Preferences.js';
import * as DifficultyPolicy from '../game/DifficultyPolicy.js';
import { BACKGRADIENT_NAMES, TEXT_COLORS, argbToCss, resolveIsDark, } from './theme.js';
import { el, button } from './dom.js';
import { strings } from './strings.js';
import { openPillDialog, showToast } from './Dialogs.js';
import { CARD_THEME_NAMES } from '../render/Bitmaps.js';
import { iconSvg } from './icons.js';
export class SettingsScreen {
    bitmaps;
    host;
    root;
    detail;
    titleNode;
    prefs = new Preferences();
    constructor(mount, bitmaps, host) {
        this.bitmaps = bitmaps;
        this.host = host;
        this.prefs.setCriticalSettings();
        this.prefs.setCriticalGameSettings();
        this.root = el('div', 'screen settings');
        const appBar = el('div', 'app-bar');
        const close = button('icon-button', '', () => this.host.close());
        close.innerHTML = iconSvg('close', 22);
        close.setAttribute('aria-label', strings.game_close);
        this.titleNode = el('div', 'app-bar-title', strings.title_activity_settings);
        appBar.append(close, this.titleNode);
        this.detail = el('div', 'settings-body settings-scroll');
        this.root.append(appBar, this.detail);
        mount.appendChild(this.root);
        this.render();
    }
    sections() {
        const p = this.prefs;
        return [
            {
                key: 'rules',
                title: strings.settings_rules_section,
                description: strings.settings_rules_section_description,
                rows: [
                    {
                        kind: 'choice',
                        key: 'difficulty',
                        title: strings.settings_difficulty,
                        summary: strings.settings_difficulty_summary,
                        options: [
                            { label: strings.settings_difficulty_easy, value: 'easy' },
                            { label: strings.settings_difficulty_medium, value: 'medium' },
                            { label: strings.settings_difficulty_hard, value: 'hard' },
                        ],
                        get: () => p.getSavedDifficulty(),
                        set: (v) => p.saveDifficulty(v),
                        restart: true,
                    },
                    {
                        kind: 'choice',
                        key: 'draw',
                        games: ['Klondike'],
                        title: strings.settings_klondike_draw,
                        summary: strings.settings_klondike_draw_summary,
                        options: [
                            { label: strings.settings_draw_1, value: '1' },
                            { label: strings.settings_draw_3, value: '3' },
                        ],
                        get: () => p.getSavedKlondikeDrawMode(),
                        set: (v) => p.saveKlondikeDrawMode(v),
                        restart: true,
                    },
                    {
                        kind: 'toggle',
                        key: 'limitedRecycles',
                        games: ['Klondike'],
                        title: strings.settings_limit_number_of_recycles,
                        summary: strings.settings_limit_number_of_recycles_text,
                        get: () => p.getSavedKlondikeLimitedRecycles(),
                        set: (v) => {
                            p.saveKlondikeLimitedRecycles(v);
                            shared.gameLogic?.toggleRecycles(v);
                        },
                    },
                    {
                        kind: 'choice',
                        key: 'recycles',
                        games: ['Klondike'],
                        title: strings.settings_number_of_recycles,
                        summary: '',
                        enabledWhen: () => p.getSavedKlondikeLimitedRecycles(),
                        whyNot: strings.settings_needs_limited_recycles,
                        options: [0, 1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n) })),
                        get: () => String(p.getSavedNumberOfRecycles('pref_key_klondike_number_of_recycles', '3')),
                        set: (v) => p.saveNumberOfRecycles('pref_key_klondike_number_of_recycles', v),
                        restart: true,
                    },
                    /*
                     * PORT: Pyramid's rows, from `res/xml/pref_pyramid.xml`. Filtered by
                     * the loaded game. Win-condition labels already state the rule.
                     */
                    {
                        kind: 'choice',
                        key: 'pyramidDifficulty',
                        games: ['Pyramid'],
                        title: strings.settings_pyramid_difficulty,
                        summary: '',
                        options: [
                            { label: strings.settings_pyramid_difficulty_1, value: '1' },
                            { label: strings.settings_pyramid_difficulty_2, value: '2' },
                        ],
                        get: () => p.getSavedPyramidDifficulty(),
                        set: (v) => p.savePyramidDifficulty(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'pyramidAutoMove',
                        games: ['Pyramid'],
                        title: strings.settings_auto_move_title,
                        summary: strings.settings_pyramid_auto_move_text,
                        get: () => p.getSavedPyramidAutoMove(),
                        set: (v) => p.savePyramidAutoMove(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'pyramidLimitedRecycles',
                        games: ['Pyramid'],
                        title: strings.settings_limit_number_of_recycles,
                        summary: strings.settings_limit_number_of_recycles_text,
                        get: () => p.getSavedPyramidLimitedRecycles(),
                        set: (v) => {
                            p.savePyramidLimitedRecycles(v);
                            shared.gameLogic?.toggleRecycles(v);
                        },
                    },
                    {
                        kind: 'choice',
                        key: 'pyramidRecycles',
                        games: ['Pyramid'],
                        title: strings.settings_number_of_recycles,
                        summary: '',
                        enabledWhen: () => p.getSavedPyramidLimitedRecycles(),
                        whyNot: strings.settings_needs_limited_recycles,
                        options: [0, 1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n) })),
                        get: () => String(p.getSavedNumberOfRecycles('pref_key_pyramid_number_of_recycles', '2')),
                        set: (v) => p.saveNumberOfRecycles('pref_key_pyramid_number_of_recycles', v),
                        restart: true,
                    },
                    {
                        kind: 'toggle',
                        key: 'ensureMovability',
                        title: strings.settings_ensure_movability_title,
                        summary: strings.settings_ensure_movability_text,
                        get: () => p.getSavedEnsureMovability(),
                        set: (v) => p.saveEnsureMovability(v),
                    },
                    {
                        kind: 'action',
                        key: 'minMoves',
                        title: strings.settings_ensure_movability_min_moves_title,
                        summary: strings.settings_ensure_movability_min_moves_text,
                        enabledWhen: () => this.minMovesState().used,
                        whyNot: this.minMovesState().why,
                        onOpen: () => this.pickMinMoves(),
                    },
                    {
                        kind: 'toggle',
                        key: 'autoStart',
                        title: strings.settings_auto_start_new_game_title,
                        summary: strings.settings_auto_start_new_game_text,
                        get: () => p.getSavedAutoStartNewGame(),
                        set: (v) => p.saveAutoStartNewGame(v),
                    },
                ],
            },
            {
                key: 'look',
                title: strings.settings_look_section,
                description: strings.settings_look_section_description,
                rows: [
                    {
                        kind: 'action',
                        key: 'cards',
                        title: strings.settings_cards,
                        summary: CARD_THEME_NAMES[p.getSavedCardTheme()] ?? 'Basic',
                        onOpen: () => this.pickCardTheme(),
                    },
                    {
                        kind: 'action',
                        key: 'cardBack',
                        title: strings.settings_cards_back,
                        summary: `#${p.getSavedCardBackground() + 1}`,
                        onOpen: () => this.pickCardBackground(),
                    },
                    {
                        kind: 'toggle',
                        key: 'fourColors',
                        title: strings.settings_4_color_mode_title,
                        summary: strings.settings_4_color_mode_text,
                        get: () => p.getSavedFourColorMode(),
                        set: (v) => p.putFourColorMode(v),
                    },
                    {
                        kind: 'action',
                        key: 'backgroundColor',
                        title: strings.settings_background_color,
                        summary: BACKGRADIENT_NAMES[p.getSavedBackgroundColor()] ?? 'Green',
                        onOpen: () => this.pickBackgroundColor(),
                    },
                    {
                        kind: 'action',
                        key: 'textColor',
                        title: strings.settings_text_colour,
                        summary: this.textColorSummary(),
                        onOpen: () => this.pickTextColor(),
                    },
                    {
                        kind: 'action',
                        key: 'margins',
                        title: strings.settings_game_layout_margins_title,
                        summary: this.marginsSummary(),
                        onOpen: () => this.pickMargins(),
                    },
                    {
                        kind: 'action',
                        key: 'menuBarPosition',
                        title: strings.settings_menu_bar_position,
                        summary: this.menuBarSummary(),
                        onOpen: () => this.pickMenuBarPosition(),
                    },
                    {
                        kind: 'toggle',
                        key: 'hideTime',
                        title: strings.settings_hide_time,
                        summary: '',
                        get: () => p.getSavedHideTime(),
                        set: (v) => p.putHideTime(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'hideScore',
                        title: strings.settings_hide_score,
                        summary: '',
                        get: () => p.getSavedHideScore(),
                        set: (v) => p.putHideScore(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'hideAutoComplete',
                        title: strings.settings_hide_auto_complete_button,
                        summary: '',
                        get: () => p.getHideAutoCompleteButton(),
                        set: (v) => p.putHideAutoCompleteButton(v),
                    },
                ],
            },
            {
                key: 'controls',
                title: strings.settings_controls_section,
                description: strings.settings_controls_section_description,
                rows: [
                    {
                        kind: 'choice',
                        key: 'speed',
                        title: strings.settings_movement_speed,
                        summary: '',
                        options: [
                            { label: strings.settings_movement_speed_1, value: '0.5' },
                            { label: strings.settings_movement_speed_2, value: '1' },
                            { label: strings.settings_movement_speed_3, value: '2' },
                            { label: strings.settings_movement_speed_4, value: '4' },
                        ],
                        get: () => String(p.getSavedMovementSpeed()),
                        set: (v) => p.saveMovementSpeed(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'leftHanded',
                        title: strings.settings_left_handed_mode,
                        summary: strings.settings_left_handed_mode_description,
                        get: () => p.getSavedLeftHandedMode(),
                        set: (v) => p.saveLeftHandedMode(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'doubleTap',
                        title: strings.settings_double_tap_enable,
                        summary: strings.settings_double_tap_enable_text,
                        get: () => p.getSavedDoubleTapEnabled(),
                        set: (v) => p.saveDoubleTapEnabled(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'doubleTapAll',
                        title: strings.settings_double_tap_all_cards,
                        summary: strings.settings_double_tap_all_cards_text,
                        enabledWhen: () => p.getSavedDoubleTapEnabled(),
                        whyNot: strings.settings_needs_double_tap,
                        get: () => p.getSavedDoubleTapAllCards(),
                        set: (v) => p.saveDoubleTapAllCards(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'foundationFirst',
                        title: strings.settings_double_tap_foundation_first,
                        summary: strings.settings_double_tap_foundation_first_text,
                        enabledWhen: () => p.getSavedDoubleTapAllCards() && p.getSavedDoubleTapEnabled(),
                        whyNot: strings.settings_needs_both_taps,
                        get: () => p.getSavedDoubleTapFoundationFirst(),
                        set: (v) => p.saveDoubleTapFoundationFirst(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'tapToSelect',
                        title: strings.settings_tap_to_select_enable,
                        summary: strings.settings_tap_to_select_enable_text,
                        get: () => p.getSavedTapToSelectEnabled(),
                        set: (v) => p.saveTapToSelectEnabled(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'singleTapAll',
                        title: strings.settings_single_tap_enable,
                        summary: strings.settings_single_tap_all_games_text,
                        get: () => p.getSingleTapAllGames(),
                        set: (v) => p.saveSingleTapAllGames(v),
                    },
                ],
            },
            {
                key: 'sound',
                title: strings.settings_sounds_title,
                description: strings.settings_sounds_text,
                rows: [
                    {
                        kind: 'toggle',
                        key: 'sound',
                        title: strings.settings_sound,
                        summary: '',
                        get: () => p.getSavedSoundEnabled(),
                        set: (v) => p.saveSoundEnabled(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'soundWin',
                        title: strings.settings_sound_win,
                        summary: '',
                        get: () => p.getSavedSoundWinEnabled(),
                        set: (v) => p.saveSoundWinEnabled(v),
                    },
                ],
            },
            {
                key: 'advanced',
                title: strings.settings_advanced_section,
                description: strings.settings_advanced_section_description,
                rows: [
                    {
                        kind: 'action',
                        key: 'maxUndos',
                        title: strings.settings_max_number_undos,
                        summary: String(p.getSavedMaxNumberUndos()),
                        onOpen: () => this.pickMaxUndos(),
                    },
                    {
                        kind: 'toggle',
                        key: 'disableUndoCosts',
                        title: strings.settings_diable_undo_costs,
                        summary: '',
                        get: () => p.getDisableUndoCosts(),
                        set: (v) => p.saveDisableUndoCosts(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'disableHintCosts',
                        title: strings.settings_diable_hint_costs,
                        summary: '',
                        get: () => p.getDisableHintCosts(),
                        set: (v) => p.saveDisableHintCosts(v),
                    },
                    {
                        kind: 'toggle',
                        key: 'trueRandom',
                        title: strings.settings_use_true_randomisation_title,
                        summary: strings.settings_use_true_randomisation_text,
                        get: () => p.getSavedUseTrueRandomisation(),
                        set: (v) => p.saveUseTrueRandomisation(v),
                    },
                ],
            },
        ];
    }
    /**
     * Renders every group on one page. Rows that name a `games` list are only shown for
     * the loaded game (Klondike vs Pyramid).
     */
    render() {
        this.detail.innerHTML = '';
        this.titleNode.textContent = strings.title_activity_settings;
        const game = Preferences.getGameId();
        for (const section of this.sections()) {
            const rows = section.rows.filter((row) => !row.games || row.games.includes(game));
            if (rows.length === 0) {
                continue;
            }
            const heading = el('div', 'pref-category');
            heading.appendChild(el('div', 'pref-category-title', section.title));
            if (section.description) {
                heading.appendChild(el('div', 'pref-category-desc', section.description));
            }
            const card = el('div', 'pref-card');
            for (const row of rows) {
                card.appendChild(this.renderRow(row));
            }
            this.detail.append(heading, card);
        }
    }
    renderRow(row) {
        const node = el('button', 'pref-row');
        node.type = 'button';
        /*
         * A row that is saved but not read, because the setting it depends on is off.
         *
         * Shown rather than hidden: removing it would make the screen rearrange itself
         * under the finger that is mid-way through a group, and would leave the player
         * with no way to set the value up for when they do turn the parent on. Dimmed,
         * labelled with the reason, and inert is the honest middle.
         */
        const inert = row.enabledWhen ? !row.enabledWhen() : false;
        if (inert) {
            node.classList.add('is-inactive');
            node.disabled = true;
            node.setAttribute('aria-disabled', 'true');
        }
        const main = el('div', 'pref-row-main');
        main.appendChild(el('div', 'pref-row-title', row.title));
        if (inert && row.whyNot) {
            main.appendChild(el('div', 'pref-row-why', row.whyNot));
        } else if (row.summary) {
            main.appendChild(el('div', 'pref-row-summary', row.summary));
        }
        node.appendChild(main);
        if (inert) {
            return node;
        }
        switch (row.kind) {
            case 'toggle': {
                const sw = el('span', 'switch');
                if (row.get()) {
                    sw.classList.add('is-on');
                }
                node.appendChild(sw);
                node.addEventListener('click', () => {
                    const next = !row.get();
                    row.set(next);
                    sw.classList.toggle('is-on', next);
                    this.afterChange(row.restart === true);
                });
                break;
            }
            case 'choice': {
                const current = row.get();
                const match = row.options.find((o) => String(o.value) === String(current));
                node.appendChild(el('div', 'pref-row-value', match ? match.label : String(current)));
                node.addEventListener('click', () => this.showChoice(row));
                break;
            }
            case 'action':
                node.addEventListener('click', () => row.onOpen());
                break;
            case 'info':
                node.addEventListener('click', () => undefined);
                break;
        }
        return node;
    }
    showChoice(row) {
        const current = row.get();
        const options = row.options.map((o) => ({
            label: o.label,
            selected: String(o.value) === String(current),
            onClick: () => {
                row.set(String(o.value));
                this.afterChange(row.restart === true);
            },
        }));
        openPillDialog({
            title: row.title,
            options,
            cancelLabel: strings.game_cancel,
        });
    }
    afterChange(restart) {
        this.render();
        this.host.onChanged();
        if (restart && shared.gameLogic != null) {
            showToastText(
                strings.settings_restart_game.replace(
                    '%s',
                    Preferences.getGameId() === 'Pyramid' ? strings.games_Pyramid : strings.games_Klondike,
                ),
            );
        }
    }
    // ------------------------------------------------------------ dialog ports

    /**
     * Whether "minimum amount of moves" is read at all, and if not, which setting is
     * responsible.
     *
     * The answer is asked of `DifficultyPolicy` rather than re-derived here, because the
     * policy is three rules deep and it is not obvious enough to restate: Hard turns
     * movability off outright so there is no minimum to reach; Easy replaces the number
     * with a hint-bot win, which is a stricter rule than any the player can pick; Medium
     * reads it but not below its own floor of 40; anything else reads it when the expert
     * toggle is on. A first attempt at this re-derived it as "off unless the expert toggle
     * is on", which is wrong on Medium -- movability is always on there -- and so greyed
     * out the row on the default configuration of a fresh install.
     */
    minMovesState() {
        const difficulty = this.prefs.getSavedDifficulty();
        const expertToggle = this.prefs.getSavedEnsureMovability();

        if (!DifficultyPolicy.isEnsureMovabilityEnabled(difficulty, expertToggle)) {
            return { used: false, why: strings.settings_difficulty_beats_expert };
        }
        if (difficulty === DifficultyPolicy.EASY) {
            return { used: false, why: strings.settings_difficulty_beats_expert };
        }
        return { used: true, why: '' };
    }

    menuBarSummary() {
        const portrait = this.prefs.getSavedMenuBarPosPortrait() === 'bottom'
            ? strings.settings_menu_bar_position_bottom
            : strings.settings_menu_bar_position_top;
        const landscape = this.prefs.getSavedMenuBarPosLandscape() === 'right'
            ? strings.settings_menu_bar_position_right
            : strings.settings_menu_bar_position_left;
        return `${strings.settings_portrait}: ${portrait}, ${strings.settings_landscape}: ${landscape}`;
    }
    pickMenuBarPosition() {
        const portrait = this.prefs.getSavedMenuBarPosPortrait();
        const landscape = this.prefs.getSavedMenuBarPosLandscape();
        const build = (currentPortrait, currentLandscape) => {
            const body = el('div');
            const portraitRow = el('div', 'pill-row');
            for (const value of ['bottom', 'top']) {
                const label = value === 'bottom' ? strings.settings_menu_bar_position_bottom : strings.settings_menu_bar_position_top;
                const pill = button(value === currentPortrait ? 'pill-choice is-selected' : 'pill-choice', label, () => {
                    this.prefs.saveMenuBarPosPortrait(value);
                    openPillDialog({
                        title: strings.settings_menu_bar_position,
                        options: [],
                        header: build(value, currentLandscape),
                        cancelLabel: strings.game_cancel,
                    });
                    this.afterChange(false);
                });
                portraitRow.appendChild(pill);
            }
            const landscapeRow = el('div', 'pill-row');
            for (const value of ['right', 'left']) {
                const label = value === 'right' ? strings.settings_menu_bar_position_right : strings.settings_menu_bar_position_left;
                const pill = button(value === currentLandscape ? 'pill-choice is-selected' : 'pill-choice', label, () => {
                    this.prefs.saveMenuBarPosLandscape(value);
                    this.afterChange(false);
                });
                landscapeRow.appendChild(pill);
            }
            body.append(el('div', 'pref-category', strings.settings_portrait), portraitRow, el('div', 'pref-category', strings.settings_landscape), landscapeRow);
            return body;
        };
        openPillDialog({
            title: strings.settings_menu_bar_position,
            header: build(portrait, landscape),
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    marginsSummary() {
        const name = (value) => value === 1
            ? strings.settings_game_layout_margins_small
            : value === 2
                ? strings.settings_game_layout_margins_medium
                : value === 3
                    ? strings.settings_game_layout_margins_large
                    : strings.settings_game_layout_margins_none;
        return `${strings.settings_portrait}: ${name(this.prefs.getSavedGameLayoutMarginsPortrait())}, ${strings.settings_landscape}: ${name(this.prefs.getSavedGameLayoutMarginsLandscape())}`;
    }
    pickMargins() {
        const names = [0, 1, 2, 3].map((v) => v === 1
            ? strings.settings_game_layout_margins_small
            : v === 2
                ? strings.settings_game_layout_margins_medium
                : v === 3
                    ? strings.settings_game_layout_margins_large
                    : strings.settings_game_layout_margins_none);
        const build = (currentPortrait, currentLandscape) => {
            const body = el('div');
            const portraitRow = el('div', 'pill-row');
            names.forEach((label, value) => {
                portraitRow.appendChild(button(value === currentPortrait ? 'pill-choice is-selected' : 'pill-choice', label, () => {
                    this.prefs.saveGameLayoutMarginsPortrait(value);
                    openPillDialog({
                        title: strings.settings_game_layout_margins_title,
                        header: build(value, currentLandscape),
                        options: [],
                        cancelLabel: strings.game_cancel,
                    });
                    this.afterChange(false);
                }));
            });
            const landscapeRow = el('div', 'pill-row');
            names.forEach((label, value) => {
                landscapeRow.appendChild(button(value === currentLandscape ? 'pill-choice is-selected' : 'pill-choice', label, () => {
                    this.prefs.saveGameLayoutMarginsLandscape(value);
                    this.afterChange(false);
                }));
            });
            body.append(el('div', 'pref-category', strings.settings_portrait), portraitRow, el('div', 'pref-category', strings.settings_landscape), landscapeRow);
            return body;
        };
        openPillDialog({
            title: strings.settings_game_layout_margins_title,
            header: build(this.prefs.getSavedGameLayoutMarginsPortrait(), this.prefs.getSavedGameLayoutMarginsLandscape()),
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    pickBackgroundColor() {
        const currentType = this.prefs.getSavedBackgroundColorType();
        const currentColor = this.prefs.getSavedBackgroundColor();
        const build = (type, color) => {
            const body = el('div');
            const row = el('div', 'pill-row');
            /*
             * Over the map, not 1..6. The bound was a literal, so adding a
             * gradient to BACKGRADIENTS put it in the preference and out of the
             * picker -- a setting that silently does not exist is the same
             * failure as one that silently does nothing.
             */
            for (const key of Object.keys(BACKGRADIENT_NAMES)) {
                const i = Number(key);
                const choice = button(type === 1 && color === i ? 'pill-choice is-selected' : 'pill-choice', BACKGRADIENT_NAMES[i], () => {
                    this.prefs.saveBackgroundColorType(1);
                    this.prefs.saveBackgroundColor(i);
                    /*
                     * The ring on the gradients is the dialog's own doing now, but this row
                     * and the Custom row are two separate groups, so the gradient has to
                     * clear the Custom button itself. Leaving both ringed would say the
                     * felt is both a gradient and a colour.
                     */
                    customChoice.classList.remove('is-selected');
                    this.afterChange(false);
                });
                row.appendChild(choice);
            }
            const customRow = el('div', 'pill-row');
            const customChoice = button(type === 0 ? 'pill-choice is-selected' : 'pill-choice', strings.settings_background_color_custom, () => {
                openPillDialog({
                    title: strings.settings_background_color_custom,
                    header: build(0, color),
                    options: [],
                    cancelLabel: strings.game_cancel,
                });
            });
            customRow.appendChild(customChoice);
            if (type === 0) {
                const swatches = el('div', 'color-swatches');
                for (const entry of TEXT_COLORS) {
                    const swatch = button('color-swatch', '', () => {
                        this.prefs.saveBackgroundColorType(0);
                        this.prefs.saveBackgroundCustomColor(entry.value);
                        this.afterChange(false);
                    });
                    swatch.style.background = argbToCss(entry.value);
                    if (color === entry.value) {
                        swatch.classList.add('is-selected');
                    }
                    swatches.appendChild(swatch);
                }
                customRow.appendChild(swatches);
            }
            body.append(row, customRow);
            return body;
        };
        openPillDialog({
            title: strings.settings_background_color,
            header: build(currentType, currentColor),
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    textColorSummary() {
        const value = this.prefs.getSavedTextColor();
        const match = TEXT_COLORS.find((c) => c.value === value);
        return match ? match.name : `#${value.toString(16)}`;
    }
    pickTextColor() {
        const current = this.prefs.getSavedTextColor();
        const body = el('div', 'color-swatches');
        for (const entry of TEXT_COLORS) {
            const swatch = button('color-swatch', '', () => {
                this.prefs.saveTextColor(entry.value);
                this.afterChange(false);
            });
            swatch.style.background = argbToCss(entry.value);
            if (entry.value === current) {
                swatch.classList.add('is-selected');
            }
            body.appendChild(swatch);
        }
        openPillDialog({
            title: strings.settings_text_colour,
            header: body,
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    /** `DialogPreferenceCards` — a 2-column grid of theme previews drawn from `card_previews.png`. */
    pickCardTheme() {
        const current = this.prefs.getSavedCardTheme();
        const grid = el('div', 'preview-grid');
        for (let theme = 1; theme <= 10; theme++) {
            const cell = button('preview-cell', '', () => {
                this.prefs.saveCardTheme(theme);
                this.afterChange(false);
            });
            if (theme === current) {
                cell.classList.add('is-selected');
            }
            const canvas = el('canvas');
            cell.appendChild(canvas);
            grid.appendChild(cell);
            this.drawThemePreview(canvas, theme);
        }
        openPillDialog({
            title: strings.settings_cards,
            header: grid,
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    drawThemePreview(canvas, theme) {
        const image = this.bitmaps.get('card_previews');
        const ctx = canvas.getContext('2d');
        if (!image || !ctx) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width || 110);
        const h = Math.max(1, rect.height || 165);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.scale(dpr, dpr);
        const cell = this.bitmaps.getCardPreview2Cell(theme - 1, 0);
        ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, 0, 0, w, h);
    }
    /** `DialogPreferenceCardBackground` — 10 backs x 4 colour rows. */
    pickCardBackground() {
        const build = (background, color) => {
            const body = el('div');
            const grid = el('div', 'preview-grid');
            for (let i = 0; i < 10; i++) {
                const cell = button('preview-cell', '', () => {
                    this.prefs.saveCardBackground(i);
                    this.prefs.saveCardBackgroundColor(color);
                    this.afterChange(false);
                });
                if (i === background) {
                    cell.classList.add('is-selected');
                }
                const canvas = el('canvas');
                cell.appendChild(canvas);
                grid.appendChild(cell);
                this.drawBackPreview(canvas, i, color);
            }
            const colors = el('div', 'pill-row');
            const names = [strings.blue, strings.red, strings.green, strings.yellow];
            for (let i = 0; i < 4; i++) {
                colors.appendChild(button(i === color ? 'pill-choice is-selected' : 'pill-choice', names[i], () => {
                    openPillDialog({
                        title: strings.settings_cards_back,
                        header: build(background, i),
                        options: [],
                        cancelLabel: strings.game_cancel,
                    });
                }));
            }
            body.append(grid, colors);
            return body;
        };
        openPillDialog({
            title: strings.settings_cards_back,
            header: build(this.prefs.getSavedCardBackground(), this.prefs.getSavedCardBackgroundColor()),
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    drawBackPreview(canvas, index, color) {
        const image = this.bitmaps.get('backgrounds_cards');
        const ctx = canvas.getContext('2d');
        if (!image || !ctx) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width || 110);
        const h = Math.max(1, rect.height || 165);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.scale(dpr, dpr);
        const cell = this.bitmaps.getCardBackCell(index, color);
        ctx.save();
        ctx.beginPath();
        const radius = w * 0.1;
        ctx.moveTo(radius, 0);
        ctx.lineTo(w - radius, 0);
        ctx.quadraticCurveTo(w, 0, w, radius);
        ctx.lineTo(w, h - radius);
        ctx.quadraticCurveTo(w, h, w - radius, h);
        ctx.lineTo(radius, h);
        ctx.quadraticCurveTo(0, h, 0, h - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, 0, 0, w, h);
        ctx.restore();
    }
    pickMinMoves() {
        const current = this.prefs.getSavedEnsureMovabilityMinMoves();
        const body = el('div', 'pill-row');
        for (const value of [0, 5, 10, 15, 20, 25, 30, 40, 50]) {
            body.appendChild(button(value === current ? 'pill-choice is-selected' : 'pill-choice', String(value), () => {
                this.prefs.saveEnsureMovabilityMinMoves(value);
                this.afterChange(false);
            }));
        }
        openPillDialog({
            title: strings.settings_ensure_movability_min_moves_title,
            header: body,
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    pickMaxUndos() {
        const current = this.prefs.getSavedMaxNumberUndos();
        const body = el('div', 'pill-row');
        for (const value of [0, 5, 10, 20, 50, 100]) {
            body.appendChild(button(value === current ? 'pill-choice is-selected' : 'pill-choice', String(value), () => {
                this.prefs.saveMaxNumberUndos(value);
                shared.recordList?.setMaxRecords();
                this.afterChange(false);
            }));
        }
        openPillDialog({
            title: strings.settings_max_number_undos,
            header: body,
            options: [],
            cancelLabel: strings.game_cancel,
        });
    }
    destroy() {
        this.root.remove();
    }
    isDark() {
        return resolveIsDark(this.prefs.getSavedNightMode());
    }
}
function showToastText(text) {
    showToast(text);
}
