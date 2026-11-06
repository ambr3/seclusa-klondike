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
 * Port of `ui/about/AboutActivity.java`, `InformationFragment.java` and `LicenseFragment.java`.
 * All credits from `strings.xml` are reproduced.
 *
 * Privacy note carried over from README.md of the Android app: no ads, no tracking,
 * no network access. The PWA keeps that stance — the only outbound links here are the
 * license/attribution links the app already showed.
 */
import { el, button } from './dom.js';
import { strings } from './strings.js';
import { iconSvg } from './icons.js';

/*
 * The shell version lives in one place: the launcher's <meta name="version">.
 * This screen used to show the Android port's 1.0.0 and a compile date, which
 * is a different product. Read the meta instead of keeping a second literal.
 * Standalone (no launcher above this frame) has nothing to read, so the row
 * is omitted rather than invented.
 */
function shellVersion() {
    const docs = [];
    try {
        if (window.parent && window.parent !== window) docs.push(window.parent.document);
    } catch {
        /* opaque parent */
    }
    docs.push(document);
    for (const doc of docs) {
        const meta = doc.querySelector('meta[name="version"]');
        const value = meta && meta.getAttribute('content');
        if (value && /^[0-9][\d.]{0,31}$/.test(value)) return value;
    }
    return '';
}

export class AboutScreen {
    host;
    root;
    body;
    constructor(mount, host) {
        this.host = host;
        this.root = el('div', 'screen settings');
        const appBar = el('div', 'app-bar');
        const close = button('icon-button', '', () => this.host.close());
        close.innerHTML = iconSvg('close', 22);
        close.setAttribute('aria-label', strings.game_close);
        appBar.append(close, el('div', 'app-bar-title', strings.title_activity_about));
        this.body = el('div', 'doc');
        this.root.append(appBar, this.body);
        mount.appendChild(this.root);
        this.buildInfo();
    }
    /** `InformationFragment`. */
    buildInfo() {
        this.body.innerHTML = '';
        this.body.appendChild(el('h2', undefined, strings.app_name));
        const info = el('div', 'card');
        info.appendChild(row(strings.about_developer, strings.about_developer_name));
        info.appendChild(row(strings.about_contact, strings.about_contact_value));
        const version = shellVersion();
        if (version) info.appendChild(row(strings.app_version, version));
        const sourceLink = el('span', 'link', 'GitHub');
        sourceLink.addEventListener('click', () => {
            window.open('https://github.com/ambr3/seclusa-klondike', '_blank', 'noopener,noreferrer');
        });
        info.appendChild(row(strings.about_source_code, '')).lastElementChild?.append(sourceLink);
        const licenseLink = el('span', 'link', 'GPL 3.0+');
        licenseLink.addEventListener('click', () => {
            window.open('https://www.gnu.org/licenses/gpl.html', '_blank', 'noopener,noreferrer');
        });
        info.appendChild(row(strings.about_license, '')).lastElementChild?.append(licenseLink);
        this.body.appendChild(info);
        /*
         * The in-game Privacy card used to be built here. Privacy is a property of the
         * whole app, not of one game, so it is stated once in the Seclusa Games launcher
         * About dialog rather than repeated inside every game.
         */
        this.body.appendChild(el('h2', undefined, strings.about_third_party_licenses));
        for (const [title, usage, url] of LICENSES) {
            const card = el('div', 'card');
            card.appendChild(el('div', 'card-title', title));
            const body = el('div', 'card-body');
            body.textContent = usage;
            if (url) {
                body.appendChild(document.createTextNode(' '));
                const link = el('span', 'link', 'License');
                link.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
                body.appendChild(link);
            }
            card.appendChild(body);
            this.body.appendChild(card);
        }
        this.body.appendChild(el('h2', undefined, strings.about_further_contributors));
        const contrib = el('div', 'card');
        const names = [
            'tryton-vanmeer',
            'TodorBalabanov',
            'strooonger',
            'SkewedZeppelin',
            'dankan1890',
            'anok',
            'dseomn',
            'ManolisPapadimitriou',
            'TacoTheDank',
        ];
        for (const name of names) {
            const link = el('span', 'link', name);
            link.addEventListener('click', () => {
                window.open(`https://github.com/${name}`, '_blank', 'noopener,noreferrer');
            });
            contrib.appendChild(el('div', 'card-body'));
            contrib.lastElementChild?.append(link, document.createTextNode('  '));
        }
        this.body.appendChild(contrib);
        /*
         * The `about_footer` string ("Forked with ... from 🇬🇧") used to be appended
         * here. Attribution now lives in the launcher's About dialog, which is the
         * single place a player is told where this came from.
         */
    }
    destroy() {
        this.root.remove();
    }
}
function row(title, value) {
    const node = el('div', 'card-body');
    node.appendChild(el('strong', undefined, `${title}: `));
    if (value) {
        node.appendChild(document.createTextNode(value));
    }
    return node;
}
const LICENSES = [
    [
        strings.about_card_themes_title,
        strings.about_card_themes_usage,
        'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
    ],
    [
        strings.about_material_icons_title,
        strings.about_material_icons_usage,
        'https://github.com/google/material-design-icons/blob/master/LICENSE',
    ],
    [strings.about_poker_themes_title, strings.about_poker_themes_usage, ''],
    [strings.about_paris_themes_title, 'Card theme "Paris" (SVG-cards 2.1).', 'https://www.gnu.org/licenses/lgpl-2.1.html'],
];
