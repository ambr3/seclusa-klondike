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
 * English UI strings, transcribed verbatim from `app/src/main/res/values/strings.xml`.
 *
 * The Android app ships 17 translations. The PWA is English-only in this first release —
 * adding locales would mean porting all 17 `values-XX` folders. See the open questions
 * in the porting report.
 */
export const strings = {
    app_name: 'Seclusa Klondike',
    app_version: 'Version',
    app_name_menu: 'Klondike',
    // Manual / menu bar
    manual_menu_bar_title: 'The game menu bar',
    manual_menu_bar_intro: 'The bar at the bottom of a game holds these buttons:',
    manual_menu_bar_new_game: 'New game — Start a new game. You can keep the same cards or deal fresh ones.',
    manual_menu_bar_support: 'Support — Show a hint for your next move, or open the rules of the current game.',
    manual_menu_bar_undo: 'Undo — Take back your last move.',
    manual_menu_bar_settings: 'Settings — Open the settings for this game.',
    manual_menu_bar_score: 'Score — Open your score and statistics for this game.',
    game_score: 'Score',
    game_time: 'Time',
    game_cancel: 'Cancel',
    game_confirm: 'Confirm',
    game_auto_complete_text: 'Autocomplete',
    game_load_error: 'Loading data failed, starting new game…',
    game_load_recovered: 'Loading data failed, restored the last backup…',
    game_close: 'Close game',
    game_main_menu: 'Main menu',
    item_game_rules: 'Game rules',
    item_return_to_main_menu: 'Return to main menu',
    // Menu bar labels
    menu_undo: 'Undo',
    menu_main_menu: 'Menu',
    menu_settings: 'Settings',
    menu_new_game: 'New game',
    menu_hide_bar: 'Hide',
    games_Klondike: 'Klondike',
    games_Pyramid: 'Pyramid',
    // Colours
    blue: 'Blue',
    green: 'Green',
    red: 'Red',
    yellow: 'Yellow',
    orange: 'Orange',
    purple: 'Purple',
    game_longest_run: 'Longest sequence:',
    dialog_win_titel: 'Congratulations!',
    dialog_win_score: 'Score: %d',
    dialog_win_bonus: 'Bonus: %d',
    dialog_win_total: 'Total: %d',
    dialog_start_new_game_title: 'Start new game',
    dialog_start_new_game_text: 'Your current progress will be lost and a new random game will be dealt.',
    menu_deal_new_cards: 'Deal new cards',
    menu_same_cards: 'Keep the same cards',
    dialog_redeal_title: 'Give cards again',
    dialog_redeal_text: 'Your current progress will be lost, but the cards are dealt like in the current game.',
    title_activity_manual: 'Manual',
    title_activity_settings: 'Settings',
    title_activity_about: 'About Game',
    game_selector_about_short: 'About',
    title_activity_statistics: 'Statistics',
    settings: 'Settings',
    // About
    about_developer: 'Developer',
    about_developer_name: 'ambr3',
    about_contact: 'Contact',
    about_contact_value: '@solair3:matrix.org',
    about_compiled: 'Compiled on',
    about_source_code: 'Source code',
    about_license: 'License',
    about_third_party_licenses: 'Third-party licenses',
    about_third_party_licenses_open: 'Show',
    about_translations: 'Translations',
    about_further_contributors: 'Further contributors',
    
    about_material_icons_title: 'Material design icons',
    about_material_icons_usage: 'Used for all icons in this application',
    about_card_themes_title: 'Card themes',
    about_card_themes_usage: 'The card themes were taken from pixabay.com',
    about_poker_themes_title: 'Vectorized Playing Cards 2.0',
    about_poker_themes_usage: 'Used as Poker theme - Copyright 2015 - Chris Aguilar',
    about_paris_themes_title: 'SVG-cards 2.1',
    about_custom_color_picker_title: 'AmbilWarna library',
    about_custom_color_picker_usage: 'Used for the custom color picker',
    // Manual
    game_manual: 'Manual',
    manual_games: 'Games',
    manual_feedback: 'Feedback',
    manual_startpage: 'Start page',
    manual_back_to_game: 'Back to game',
    manual_structure: 'Structure',
    manual_objective: 'Objective',
    manual_rules: 'Rules',
    manual_scoring: 'Scoring',
    manual_main_menu: 'Main menu',
    manual_ui: 'User interface',
    manual_bonus: 'After winning a game, you get a bonus: The faster you win, the higher the bonus will be.',
    manual_open_google_play: 'Open Google Play',
    manual_open_github: 'Open GitHub Repo',
    manual_games_text1: 'Choose a game to show its structure, objective, rules and scoring.',
    manual_startpage_text: 'Welcome to the manual of this game collection! I hope it will explain everything.\n\nUse the menu on the left side to access the other manual pages.',
    manual_general_main_menu: 'The usage of the main menu is relatively simple. Just tap on a game to start it.\n\nThe app will automatically load the last played game on a restart, if the app was paused in it. This behavior can be disabled in the settings under "General".',
    manual_feedback_text: 'Found a bug or an error? Something I should improve? I am happy to receive any kind of feedback.',
    manual_ui_text_part_1: 'A game will always show a little menu on the bottom part of the screen (Portrait mode) or on the right side (Landscape mode). It will also show the current score and current played time of the game.',
    manual_Klondike_structure: '1 deck of 52 cards.\n\n7 tableau stacks, 4 foundation stacks, 1 main and 1 discard stack.',
    manual_Klondike_objective: 'Order every card in real families in ascending order on the foundation.',
    manual_Klondike_rules: 'Cards can be placed on the tableau in descending order and in alternating colors. You can move a whole sequence of cards at once. On the foundation, cards can be placed only in ascending order on the corresponding family.\n\nOnly kings can be placed on empty tableau stacks and only aces can be placed on empty foundation stacks.\n\nBy pressing on the main stack, cards will be moved to the discard stack from where you can use them. The amount of cards depends on the chosen settings. If "Draw 1" has been selected, only one card will be moved (This is the default setting, for easier game play). With "Draw 3" enabled, 3 cards will be moved at once.\n\nIf the main stack is empty, you can still press on it to move every card from the discard stack to the main stack and use them again.',
    manual_Pyramid_structure: '1 deck of 52 cards.\n\n28 pyramid stacks in 7 rows, 1 king stack, 2 discard stacks and 1 main stack.',
    manual_Pyramid_objective: 'Remove every card from the pyramid by pairing them up.',
    manual_Pyramid_rules: 'Cards are laid out in a pyramid of 7 rows. Kings are removed on their own, everything else has to find its partner: the two values have to add up to 13. Kings are placed on the king pile next to the pyramid.\n\nA pair is made by dragging one card onto its partner. Both cards then jump to the king pile.\n\nOnly the lowest card of a pair — the one that has no cards resting on it — can be used.\n\nBy pressing on the main stack, the top card moves to the discard stack. If the main stack is empty and the discard stack still has cards, pressing it moves them all back.\n\nThe game is won when the pyramid is empty. On the harder difficulty setting you also have to use up the discard stack.',
    manual_Pyramid_scoring: 'Removing a pair: +50\n\nReturning all cards from the discard stack to the main stack: -200',
    manual_Klondike_scoring: 'From tableau to foundation: +60\n\nFrom discard stack to foundation: +45\n\nFrom foundation to tableau: -75\n\nTurn a card over: +25\n\nReturn all cards from discard stack to main stack: -200',
    // Settings
    settings_background_color: 'Background colour',
    settings_theme_color: 'Theme colour',
    settings_theme_color_green: 'Green',
    settings_theme_color_orange: 'Orange',
    settings_theme_color_blue: 'Blue',
    settings_theme_color_purple: 'Purple',
    settings_appearance: 'Appearance',
    settings_night_mode: 'Light / dark mode',
    settings_night_mode_system: 'System',
    settings_night_mode_light: 'Light',
    settings_night_mode_dark: 'Dark',
    settings_night_mode_summary: 'Choose light, dark, or follow the device setting',
    settings_dynamic_colors: 'Dynamic colours',
    settings_dynamic_colors_summary: 'Use the wallpaper colours on Android 12 or newer (overrides the theme colour choice)',
    settings_hide_status_bar: 'Hide status bar',
    settings_left_handed_mode: 'Left handed mode',
    settings_left_handed_mode_description: 'Mirrors the card and stack positions to the left side',
    settings_orientation: 'Screen orientation',
    settings_cards: 'Cards',
    settings_classic: 'Classic',
    settings_simple: 'Simple',
    settings_cards_back: 'Card backgrounds',
    settings_modern: 'Modern',
    settings_abstract: 'Abstract',
    settings_basic: 'Basic',
    settings_oxygen_dark: 'Oxygen Dark',
    settings_oxygen_light: 'Oxygen Light',
    settings_poker: 'Poker',
    settings_background: 'Background number',
    settings_customization: 'Appearance',
    settings_other: 'General',
    settings_other_description: 'Set all other settings',
    settings_games: 'Games',
    settings_games_description: 'Set preferences for the game variants',
    settings_game: 'Game',
    settings_game_description: 'Deal, difficulty and recycle options for this game',
    settings_rules_section: 'Rules',
    settings_rules_section_description: 'How deals work, when you win, and recycles',
    settings_look_section: 'Look',
    settings_look_section_description: 'Cards, table colour and on-screen chrome',
    settings_controls_section: 'Controls',
    settings_controls_section_description: 'How you move cards, and left-handed mirroring',
    settings_advanced_section: 'Advanced',
    settings_advanced_section_description: 'Undo limits, score penalties and shuffle behaviour',
    settings_klondike_draw: 'Cards drawn from the stock',
    settings_klondike_draw_summary: 'Draw one card at a time, or three',
    settings_show_main_menu: 'Start to main menu',
    settings_show_main_menu_description: 'Do not enter the last played game on start',
    settings_menu: 'Main menu',
    settings_menu_description: 'Change number of columns, show and hide games',
    settings_difficulty: 'Deal difficulty',
    settings_difficulty_easy: 'Easy',
    settings_difficulty_medium: 'Medium',
    settings_difficulty_hard: 'Hard',
    settings_difficulty_summary: 'Easy deals hands that are very likely winnable. Medium filters for playable starts. Hard deals fully random hands.',
    settings_menu_columns: 'Number of columns',
    settings_menu_games: 'Show and hide games',
    settings_menu_games_description: 'Select which games are shown in the menu',
    settings_change_language: 'Change language',
    settings_menu_bar_position: 'Menu bar position',
    settings_menu_bar_position_top: 'Top',
    settings_menu_bar_position_bottom: 'Bottom',
    settings_menu_bar_position_left: 'Left',
    settings_menu_bar_position_right: 'Right',
    settings_4_color_mode_title: '4 color decks',
    settings_4_color_mode_text: 'Change the colors from Clubs to green and from diamonds to blue',
    settings_additional_movements: 'Additional card movements',
    settings_additional_movements_description: 'Enable and disable double-tap and other movement methods',
    settings_double_tap: 'Double-Tap',
    settings_double_tap_enable: 'Double-tap to move',
    settings_double_tap_enable_text: 'Tap a card twice to send it to the next legal stack',
    settings_double_tap_all_cards: 'Move the whole build',
    settings_double_tap_all_cards_text: 'Double-tap moves every card that can go, not only the one you touched',
    settings_tap_to_select: 'Tap-To-Select',
    settings_tap_to_select_enable: 'Tap to pick up, tap to drop',
    settings_tap_to_select_enable_text: 'Tap a card, then tap where it should go',
    settings_single_tap: 'Single-Tap',
    settings_single_tap_enable_text: 'Only for Golf and TriPeaks: Press a card once to move it to the discard stack',
    settings_double_tap_foundation_first: 'Try the foundation first',
    settings_double_tap_foundation_first_text: 'On double-tap, send the top card to a foundation before moving the rest',
    settings_movement_speed: 'Animation speed',
    settings_background_color_custom: 'Custom',
    settings_text_colour: 'Card text colour',
    settings_limit_number_of_recycles: 'Limit number of recycles',
    settings_limit_number_of_recycles_text: 'Recycling the waste back to the main stack is limited',
    settings_number_of_recycles: 'Amount of recycles',
    /*
     * Why a row is dimmed. These are settings that exist and are saved, but do
     * nothing until the one they depend on is on. Saying so beats leaving a
     * control that looks live and is not.
     */
    settings_needs_limited_recycles: 'Turn on "Limit number of recycles" first',
    settings_needs_double_tap: 'Turn on "Double-tap to move" first',
    settings_needs_both_taps: 'Needs "Double-tap to move" and "Move the whole build" both on',
    settings_difficulty_beats_expert: 'Set by "Deal difficulty" under Rules, not here',
    settings_auto_start_new_game_title: 'Start a new game when won',
    settings_auto_start_new_game_text: 'If returned to an already won game, automatically start a new game',
    settings_customization_description: 'Cards, felt, layout and on-board chrome',
    settings_force_tablet_layout_title: 'Force tablet layout',
    settings_force_tablet_layout_text: 'Show the application as on large screens (≥7")',
    settings_immersive_mode_title: 'Immersive mode',
    settings_immersive_mode_text: 'Hide the status and navigation bars while playing',
    settings_auto_move_title: 'Automatic movement',
    settings_rules: 'Rules',
    settings_support: 'Support',
    settings_hide_time: 'Hide time',
    settings_hide_score: 'Hide score',
    settings_single_tap_enable: 'Single-tap to move',
    settings_single_tap_all_games_text: 'One tap sends a card to the next legal stack (same rules as double-tap). Turns off tap-to-pick-up.',
    settings_use_true_randomisation_title: 'Use true randomization',
    settings_use_true_randomisation_text: 'The default randomization avoids similar cards next to each other. Check this to enable a truly uniform randomisation',
    settings_max_number_undos: 'Maximum amount of undo movements',
    settings_expert_settings: 'Expert settings',
    settings_expert_settings_text: 'May be useful for some people',
    settings_follow_system_settings: 'Follow system settings',
    settings_portrait: 'Portrait',
    settings_landscape: 'Landscape',
    settings_landscape_upside_down: 'Landscape upside down',
    settings_draw_1: 'Draw 1',
    settings_draw_3: 'Draw 3',
    settings_language_default: 'Default language',
    settings_movement_speed_1: 'Very slow',
    settings_movement_speed_2: 'Slow',
    settings_movement_speed_3: 'Normal',
    settings_movement_speed_4: 'Fast',
    settings_ensure_movability_title: 'Ensure movability',
    settings_ensure_movability_text: 'Only deal hands that the hint bot can move far enough',
    settings_ensure_movability_min_moves_title: 'Minimum amount of moves',
    settings_ensure_movability_min_moves_text: 'How many moves the hint bot must make before the deal is accepted',
    settings_diable_undo_costs: 'Disable undo score penalty',
    settings_diable_hint_costs: 'Disable hint score penalty',
    settings_game_layout_margins_title: 'Game layout margins',
    settings_game_layout_margins_text: 'Add margins around the playing field',
    settings_game_layout_margins_none: 'None',
    settings_game_layout_margins_small: 'Small',
    settings_game_layout_margins_medium: 'Medium',
    settings_game_layout_margins_large: 'Large',
    settings_background_color_type: 'Background colour',
    settings_show_dialog_new_game: 'Show dialog on new game',
    settings_show_dialog_redeal: 'Show dialog on redeal',
    settings_hide_menu_button: 'Hide menu button',
    settings_hide_menu_bar: 'Hide menu bar',
    settings_hide_auto_complete_button: 'Hide auto-complete button',
    settings_menu_order_title: 'Menu order',
    settings_menu_order_summary: 'Long press an entry, then use drag and drop to reorder the menu entries',
    settings_cat_key_only_for_this_game: 'Settings for this game only',
    // Pyramid (pref_games.xml -> games_Pyramid category)
    settings_pyramid_difficulty: 'Win condition',
    settings_pyramid_difficulty_1: 'Easy: Game is won when tableau is empty',
    settings_pyramid_difficulty_2: 'Hard: Game is won when tableau and stock are empty',
    settings_pyramid_auto_move_text: 'Automatically move Kings to the waste, when possible',

    settings_restart_game: 'The game of "%s" is restarted, to apply the settings.',
    settings_sounds_title: 'Sounds',
    settings_sounds_text: 'Turn the game sounds on or off',
    settings_sound: 'Enable sounds',
    settings_sound_win: 'Enable winning sound',
    // Dialogs
    dialog_show_hints: 'Show hints',
    dialog_no_hint_available: 'No hint available!',
    dialog_ensure_movability_title: 'Searching for a playable deal…',
    dialog_ensure_movability_text: 'Testing deals with the hint bot.',
    dialog_ensure_movability_cancel: 'Cancel',
    dialog_ensure_movability_min_moves_title: 'Minimum amount of moves',
    dialog_max_number_undos_title: 'Maximum amount of undo movements',
    // Statistics
    statistics_text_won_games: 'Won %d out of %d games',
    statistics_win_percentage: 'Your win percentage: %d%%',
    statistics_button_delete: 'Delete all entries!',
    statistics_button_delete_text: 'Delete all entries for this game! Are you sure?',
    statistics_button_deleted_all_entries: 'Deleted all entries',
    statistics_time_of_day: 'Daytime',
    statistics_date: 'Date',
    statistics_high_scores: 'High Scores',
    statistics_recent_scores: 'Recent Scores',
    statistics_total_time: 'Total time played',
    statistics_total_hints_shown: 'Total hints shown',
    statistics_total_number_undos: 'Total undo movements',
    statistics_total_points_earned: 'Total points earned',
    statistics_no_entries: 'No entries, go play some games!',
};
/**
 * Replaces `%d` / `%s` placeholders like `String.format` does.
 *
 * `%%` is an escaped literal percent sign, exactly as in Java's `String.format`, so
 * "Your win percentage: %1$.0f%%" prints a single trailing `%`.
 */
export function format(template, ...args) {
    let index = 0;
    let out = '';
    for (let i = 0; i < template.length; i++) {
        const char = template[i];
        if (char !== '%') {
            out += char;
            continue;
        }
        const next = template[i + 1];
        if (next === '%') {
            out += '%';
            i++;
            continue;
        }
        if (next === 'd' || next === 's' || next === 'f') {
            const value = args[index++];
            out += value === undefined ? '' : String(value);
            i++;
            continue;
        }
        out += char;
    }
    return out;
}
