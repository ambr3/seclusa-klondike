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
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/ui/GameSelector.java` and
 * `res/layout/activity_game_selector.xml` + `content_game_selector.xml`.
 *
 * Only Klondike is in this first release, so the grid shows a single tile — but it uses the
 * real menu preview artwork (`backgrounds_menu.png`, cell 8 in the default order) and the
 * same header bar with About / Settings / Manual.
 */
import { el } from './dom.js';
import { strings } from './strings.js';
import { MENU_INDEX } from '../render/Bitmaps.js';
import { shared } from '../game/SharedData.js';
/**
 * PORT: the two games this build ships. `menuIndex` is the cell in `backgrounds_menu.png`
 * (6 x 4) that `LoadGame.loadAllGames()` assigns to the game.
 */
const GAME_LIST = [
    { id: 'Klondike', name: strings.games_Klondike, menuIndex: MENU_INDEX.Klondike },
];

export class GameSelector {
    bitmaps;
    host;
    root;
    grid;
    /**
     * The `resize` listener `updateGrid()` installs. Held so it can be taken off again:
     * `updateGrid()` runs on every resize and every resume, so a listener added per call
     * and never removed grew without bound, and each copy went on painting canvases that
     * had already been thrown away by the rebuild.
     */
    fitHandler = null;
    constructor(mount, bitmaps, host) {
        this.bitmaps = bitmaps;
        this.host = host;
        this.root = el('div', 'screen selector');
        const header = el('div', 'selector-header');
        const title = el('div', 'selector-title');
        title.textContent = strings.app_name_menu;
        header.appendChild(title);
        for (const [label, action] of [
            [strings.game_selector_about_short, () => this.host.openAbout()],
            [strings.settings, () => this.host.openSettings()],
            [strings.title_activity_manual, () => this.host.openManual()],
        ]) {
            const btn = el('button', 'header-button', label);
            btn.type = 'button';
            btn.addEventListener('click', action);
            header.appendChild(btn);
        }
        this.grid = el('div', 'selector-grid');
        this.root.append(header, this.grid);
        mount.appendChild(this.root);
        shared.prefs.saveCurrentGame(-1);
        this.updateGrid();
    }
    /** `GameSelector.loadGameList()`. */
    updateGrid() {
        if (this.fitHandler !== null) {
            window.removeEventListener('resize', this.fitHandler);
            this.fitHandler = null;
        }
        this.grid.innerHTML = '';
        const columns = Math.max(1, window.innerWidth > window.innerHeight
            ? shared.prefs.getSavedMenuColumnsLandscape()
            : shared.prefs.getSavedMenuColumnsPortrait());
        this.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        const tiles = [];
        for (const entry of GAME_LIST) {
            const tile = el('button', 'game-tile');
            tile.type = 'button';
            tile.setAttribute('aria-label', entry.name);
            tile.addEventListener('click', () => this.host.startGame(entry.id));
            const canvas = el('canvas');
            tile.appendChild(canvas);
            tile.appendChild(el('span', 'game-tile-label', entry.name));
            this.grid.appendChild(tile);
            tiles.push({ tile, canvas, index: entry.menuIndex });
        }
        // Square the cell. Java: `GameSelector` wraps the preview in a FrameLayout and sets
        // width == height == min(available width, available height) in its `onLayoutChange`.
        // Here the tile is a grid cell, so the height budget is the grid's own height.
        const fit = () => {
            const availableWidth = this.grid.getBoundingClientRect().width / tiles.length;
            const availableHeight = this.grid.getBoundingClientRect().height;
            const side = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight)));
            for (const entry of tiles) {
                entry.tile.style.height = `${side}px`;
                this.drawPreview(entry.canvas, entry.index);
            }
        };
        requestAnimationFrame(fit);
        this.fitHandler = fit;
        window.addEventListener('resize', fit);
        // The sprite sheet is loaded asynchronously; redraw the tiles when it has arrived.
        // A sheet that never decodes rejects, and `Bitmaps.load()` caches that rejected
        // promise, so without a catch here the rejection is reported again on every later
        // request for the same file.
        this.bitmaps.load('backgrounds_menu').then(() => {
            if (this.root.isConnected) {
                for (const entry of tiles) {
                    this.drawPreview(entry.canvas, entry.index);
                }
            }
        }).catch(() => {
            /* no sheet — the tiles stay blank, which drawPreview() already handles */
        });
        for (const entry of tiles) {
            this.drawPreview(entry.canvas, entry.index);
        }
    }
    /** Draws a menu tile (`Bitmaps.getMenu(index)` + `drawTextToBitmap`). */
    drawPreview(canvas, menuIndex) {
        const image = this.bitmaps.get('backgrounds_menu');
        const ctx = canvas.getContext('2d');
        if (!image || !ctx) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const side = Math.max(1, Math.min(rect.width || 160, rect.height || 160));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(side * dpr);
        canvas.height = Math.round(side * dpr);
        ctx.scale(dpr, dpr);
        const cell = this.bitmaps.getMenuCell(menuIndex);
        // Round the face, light rim and soft drop shadow (ported from `polishMenuTile`).
        const pad = 3;
        const radius = 14;
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, pad * 0.5, pad * 0.7, side - pad * 0.85, side - pad * 0.95, radius);
        ctx.fillStyle = 'rgba(0,0,0,0.43)';
        ctx.filter = 'blur(3px)';
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, pad, pad, side - pad * 2, side - pad * 2, radius);
        ctx.clip();
        ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, pad, pad, side - pad * 2, side - pad * 2);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        roundRect(ctx, pad, pad, side - pad * 2, side - pad * 2, radius);
        ctx.stroke();
        ctx.restore();
    }
    onResize() {
        this.updateGrid();
    }
    onResume() {
        this.updateGrid();
    }
    destroy() {
        if (this.fitHandler !== null) {
            window.removeEventListener('resize', this.fitHandler);
            this.fitHandler = null;
        }
        this.root.remove();
    }
}
function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
