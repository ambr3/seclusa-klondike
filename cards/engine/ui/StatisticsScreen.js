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
 * Port of `ui/statistics/StatisticsActivity.java`, `StatisticsFragment.java`,
 * `HighScoresFragment.java` and `RecentScoresFragment.java`.
 *
 * Three tabs: statistics overview, high scores and recent scores — same content and the
 * same "delete all entries" button (`DialogHighScoreDelete`).
 */
import { shared } from '../game/SharedData.js';
import { MAX_SAVED_SCORES } from '../game/Preferences.js';
import { el, button } from './dom.js';
import { strings, format } from './strings.js';
import { openPillDialog, showToast } from './Dialogs.js';
import { iconSvg } from './icons.js';
export class StatisticsScreen {
    host;
    root;
    body;
    tabButtons = [];
    tab = 'overview';
    constructor(mount, host) {
        this.host = host;
        this.root = el('div', 'screen settings');
        const appBar = el('div', 'app-bar');
        const close = button('icon-button', '', () => this.host.close());
        close.innerHTML = iconSvg('close', 22);
        close.setAttribute('aria-label', strings.game_close);
        const title = el('div', 'app-bar-title', strings.title_activity_statistics);
        appBar.append(close, title);
        const tabs = el('div', 'tabs');
        const entries = [
            ['overview', strings.settings_other],
            ['high', strings.statistics_high_scores],
            ['recent', strings.statistics_recent_scores],
        ];
        for (const [key, label] of entries) {
            const tabButton = button('tab', label, () => this.showTab(key));
            tabButton.type = 'button';
            this.tabButtons.push(tabButton);
            tabs.appendChild(tabButton);
        }
        this.body = el('div', 'doc');
        this.root.append(appBar, tabs, this.body);
        mount.appendChild(this.root);
        this.showTab('overview');
    }
    showTab(tab) {
        this.tab = tab;
        this.tabButtons.forEach((node, index) => {
            const keys = ['overview', 'high', 'recent'];
            node.classList.toggle('is-active', keys[index] === tab);
        });
        this.body.innerHTML = '';
        if (tab === 'overview') {
            this.buildOverview();
        }
        else {
            this.buildScoreTable(tab);
        }
    }
    /** `StatisticsFragment` — win rate, totals, longest run. */
    buildOverview() {
        const prefs = shared.prefs;
        const wonGames = prefs.getSavedNumberOfWonGames();
        const totalGames = prefs.getSavedNumberOfPlayedGames();
        const totalHintsShown = prefs.getSavedTotalHintsShown();
        const totalNumberUndos = prefs.getSavedTotalNumberUndos();
        const totalTime = prefs.getSavedTotalTimePlayed();
        const totalPoints = prefs.getSavedTotalPointsEarned();
        const list = el('div');
        list.appendChild(this.card(format(strings.statistics_text_won_games, wonGames, totalGames), ''));
        if (!prefs.getSavedStatisticsHideWinPercentage()) {
            list.appendChild(this.card(format(strings.statistics_win_percentage, totalGames > 0 ? Math.floor((wonGames * 100) / totalGames) : 0), ''));
        }
        list.appendChild(this.card(strings.statistics_total_time, formatHms(totalTime)));
        list.appendChild(this.card(strings.statistics_total_hints_shown, String(totalHintsShown)));
        list.appendChild(this.card(strings.statistics_total_number_undos, String(totalNumberUndos)));
        list.appendChild(this.card(strings.statistics_total_points_earned, `${totalPoints}${shared.currentGame.isPointsInDollar() ? ' $' : ''}`));
        list.appendChild(this.card(strings.game_longest_run, String(prefs.getSavedLongestRun())));
        this.body.appendChild(list);
        const deleteButton = button('pill', strings.statistics_button_delete, () => {
            openPillDialog({
                title: strings.statistics_button_delete,
                message: strings.statistics_button_delete_text,
                options: [
                    {
                        label: strings.game_confirm,
                        primary: true,
                        onClick: () => {
                            shared.scores.deleteScores();
                            shared.gameLogic.deleteStatistics();
                            prefs.saveLongestRun(0);
                            prefs.saveRunCounter(0);
                            showToast(strings.statistics_button_deleted_all_entries);
                            this.showTab(this.tab);
                        },
                    },
                ],
                cancelLabel: strings.game_cancel,
            });
        });
        this.body.appendChild(deleteButton);
    }
    card(title, body) {
        const node = el('div', 'card');
        node.appendChild(el('div', 'card-title', title));
        if (body) {
            node.appendChild(el('div', 'card-body', body));
        }
        return node;
    }
    /** `HighScoresFragment` / `RecentScoresFragment`. */
    buildScoreTable(which) {
        const source = which === 'high' ? 'getHighScore' : 'getRecentScore';
        const table = el('table', 'stats-table');
        const head = el('thead');
        const headRow = el('tr');
        for (const label of ['', strings.statistics_date, strings.statistics_time_of_day, ' ']) {
            headRow.appendChild(el('th', undefined, label));
        }
        head.appendChild(headRow);
        table.appendChild(head);
        const bodyEl = el('tbody');
        let any = false;
        for (let i = 0; i < MAX_SAVED_SCORES; i++) {
            const score = shared.scores[source](i, 0);
            if (score === 0) {
                continue;
            }
            any = true;
            const time = shared.scores[source](i, 1);
            const date = shared.scores[source](i, 2);
            const row = el('tr');
            row.appendChild(el('td', undefined, `${score}${shared.currentGame.isPointsInDollar() ? ' $' : ''}`));
            row.appendChild(el('td', undefined, new Date(date).toLocaleDateString()));
            row.appendChild(el('td', undefined, new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
            row.appendChild(el('td', undefined, formatHms(time)));
            bodyEl.appendChild(row);
        }
        table.appendChild(bodyEl);
        this.body.appendChild(table);
        if (!any) {
            this.body.appendChild(el('p', undefined, strings.statistics_no_entries));
        }
    }
    destroy() {
        this.root.remove();
    }
}
function formatHms(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
