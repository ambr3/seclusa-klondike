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
 * Port of `ui/manual/Manual.java` and `ManualGames.java`.
 * The in-app manual for the game(s). Structure / Objective / Rules / Scoring sections,
 * transcribed from `manual_Klondike_*` in strings.xml.
 */
import { el, button } from './dom.js';
import { strings } from './strings.js';
import { Preferences } from '../game/Preferences.js';
import { iconSvg } from './icons.js';
const PAGES = [
    { key: 'start', label: strings.manual_startpage },
    { key: 'ui', label: strings.manual_ui },
    { key: 'games', label: strings.manual_games },
];
export class ManualScreen {
    host;
    root;
    nav;
    body;
    page = 'games';
    constructor(mount, host) {
        this.host = host;
        this.root = el('div', 'screen settings');
        const appBar = el('div', 'app-bar');
        const close = button('icon-button', '', () => this.host.close());
        close.innerHTML = iconSvg('close', 22);
        close.setAttribute('aria-label', strings.game_close);
        appBar.append(close, el('div', 'app-bar-title', strings.title_activity_manual));
        const layout = el('div', 'settings-body');
        this.nav = el('div', 'settings-nav');
        this.body = el('div', 'doc');
        layout.append(this.nav, this.body);
        this.root.append(appBar, layout);
        mount.appendChild(this.root);
        for (const entry of PAGES) {
            const node = button('settings-nav-item', entry.label, () => this.showPage(entry.key));
            node.dataset.page = entry.key;
            this.nav.appendChild(node);
        }
        this.showPage('games');
    }
    showPage(page) {
        this.page = page;
        for (const node of Array.from(this.nav.children)) {
            node.classList.toggle('is-active', node.dataset.page === page);
        }
        this.body.innerHTML = '';
        switch (page) {
            case 'start':
                this.body.appendChild(el('h2', undefined, strings.manual_startpage));
                this.body.appendChild(paragraphs(strings.manual_startpage_text));
                this.body.appendChild(el('h2', undefined, strings.manual_bonus));
                this.body.appendChild(paragraphs(strings.manual_bonus));
                break;
            case 'ui':
                this.body.appendChild(el('h2', undefined, strings.manual_ui));
                this.body.appendChild(paragraphs(strings.manual_ui_text_part_1));
                this.body.appendChild(el('h2', undefined, strings.manual_menu_bar_title));
                this.body.appendChild(paragraphs(strings.manual_menu_bar_intro));
                const list = el('ul');
                for (const line of [
                    strings.manual_menu_bar_new_game,
                    strings.manual_menu_bar_support,
                    strings.manual_menu_bar_undo,
                    strings.manual_menu_bar_settings,
                    strings.manual_menu_bar_score,
                ]) {
                    list.appendChild(el('li', undefined, line));
                }
                this.body.appendChild(list);
                break;
            case 'games':
            default:
                // PORT: the Android manual has a page per game; this build ships two, so the
                // page follows the game that is currently loaded.
                const game = Preferences.getGameId();
                const name = game === 'Pyramid' ? strings.games_Pyramid : strings.games_Klondike;
                const prefix = game === 'Pyramid' ? 'Pyramid' : 'Klondike';
                this.body.appendChild(el('h2', undefined, name));
                this.body.appendChild(paragraphs(strings.manual_games_text1));
                for (const [title, text] of [
                    [strings.manual_structure, strings['manual_' + prefix + '_structure']],
                    [strings.manual_objective, strings['manual_' + prefix + '_objective']],
                    [strings.manual_rules, strings['manual_' + prefix + '_rules']],
                    [strings.manual_scoring, strings['manual_' + prefix + '_scoring']],
                ]) {
                    const card = el('div', 'card');
                    card.appendChild(el('div', 'card-title', title));
                    card.appendChild(paragraphs(text));
                    this.body.appendChild(card);
                }
                break;
        }
    }
    getCurrentPage() {
        return this.page;
    }
    destroy() {
        this.root.remove();
    }
}
/** Renders `\n\n`-separated blocks as paragraphs, keeping single newlines as breaks. */
function paragraphs(text) {
    const fragment = document.createDocumentFragment();
    for (const block of text.split('\n\n')) {
        if (block.length === 0) {
            continue;
        }
        const p = el('p');
        p.textContent = block;
        fragment.appendChild(p);
    }
    return fragment;
}
