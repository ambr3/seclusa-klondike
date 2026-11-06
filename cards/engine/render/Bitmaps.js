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
 
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step).
 *
 * Derived from the TypeScript port of the Android app by Tobias Bielefeld
 * (GPL-3.0), which is itself derived from the original Java sources in
 * `Solitaire/app/src/main/java/de/tobiasbielefeld/solitaire/`. Type
 * annotations are dropped; naming, structure, comments and behaviour are
 * unchanged. The GPL-3.0 notice above must survive every further copy.
*/
export const NUM_CARD_THEMES = 10;
export const NUM_CARD_BACKGROUNDS = 10;
const CARD_THEME_FILES = {
    1: 'cards_basic',
    2: 'cards_classic',
    3: 'cards_abstract',
    4: 'cards_simple',
    5: 'cards_modern',
    6: 'cards_oxygen_dark',
    7: 'cards_oxygen_light',
    8: 'cards_poker',
    9: 'cards_paris',
    10: 'cards_dondorf',
};
export const CARD_THEME_NAMES = {
    1: 'Basic',
    2: 'Classic',
    3: 'Abstract',
    4: 'Simple',
    5: 'Modern',
    6: 'Oxygen Dark',
    7: 'Oxygen Light',
    8: 'Poker',
    9: 'Paris',
    10: 'Dondorf',
};
export class Bitmaps {
    baseUrl;
    images = new Map();
    cells = new Map();
    loaded = new Map();
    constructor(baseUrl = './assets/') {
        this.baseUrl = baseUrl;
    }
    path(file) {
        return `${this.baseUrl}assets/cards/${file}.png`;
    }
    /** Loads (and caches) one sprite sheet. */
    load(file) {
        const cached = this.loaded.get(file);
        if (cached) {
            return cached;
        }
        const existing = this.images.get(file);
        if (existing) {
            return Promise.resolve(existing);
        }
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => {
                this.images.set(file, image);
                this.cells.clear();
                resolve(image);
            };
            image.onerror = () => reject(new Error(`Failed to load ${file}.png`));
            image.src = this.path(file);
        });
        this.loaded.set(file, promise);
        return promise;
    }
    get(file) {
        return this.images.get(file);
    }
    isLoaded(file) {
        return this.images.has(file);
    }
    /** Loads every sheet the app can need, so theme switching never stutters. */
    async preloadAll() {
        const files = [
            'backgrounds_cards',
            'backgrounds_menu',
            'backgrounds_stacks',
            'card_previews',
            ...Object.values(CARD_THEME_FILES),
        ];
        await Promise.allSettled(files.map((f) => this.load(f)));
        this.invalidateCells();
    }
    /**
     * Drops the cached sprite-sheet cell maths. Cell sizes are derived from the decoded
     * image, so this has to run whenever a sheet is (re)loaded.
     */
    invalidateCells() {
        this.cells.clear();
    }
    // ------------------------------------------------------------- card fronts
    /**
     * Cell for a single card front.
     * Port of `Bitmaps.getCardFront(posX, posY)`.
     */
    getCardFrontCell(theme, posX, posY) {
        const key = `front:${theme}:${posX}:${posY}`;
        const cached = this.cells.get(key);
        if (cached) {
            return cached;
        }
        const image = this.images.get(CARD_THEME_FILES[theme] ?? CARD_THEME_FILES[1]);
        const w = image ? Math.floor(image.naturalWidth / 13) : 133;
        const h = image ? Math.floor(image.naturalHeight / 6) : 200;
        const cell = { sx: posX * w, sy: posY * h, sw: w, sh: h };
        this.cells.set(key, cell);
        return cell;
    }
    /**
     * The 52 card front cells of the currently selected theme.
     *
     * Port of `Bitmaps.getCardFrontDrawables(boolean fourColors)`:
     *   clubs      → row 0, or row 1 in four-colour mode (clubs become green)
     *   hearts     → row 2
     *   spades     → row 3
     *   diamonds   → row 4, or row 5 in four-colour mode (diamonds become blue)
     *
     * @param color 1=clubs 2=hearts 3=spades 4=diamonds
     * @param value 1=ace .. 13=king
     */
    getCardFrontCellFor(theme, fourColors, color, value) {
        const posX = value - 1;
        switch (color) {
            case 1:
                return this.getCardFrontCell(theme, posX, fourColors ? 1 : 0);
            case 2:
                return this.getCardFrontCell(theme, posX, 2);
            case 3:
                return this.getCardFrontCell(theme, posX, 3);
            case 4:
            default:
                return this.getCardFrontCell(theme, posX, fourColors ? 5 : 4);
        }
    }
    // -------------------------------------------------------------- card backs
    /**
     * Cell for the card back. Port of `Bitmaps.getCardBack(posX, posY)`.
     * The sheet is 10 x 4 of 133x200 cells.
     *
     * The Android version additionally rounded the corners of the back, because the sheet
     * ships square backs while the fronts are rounded. This port does the same rounding at
     * draw time (see `renderRoundCardBack`), so face-down cards do not show a square edge.
     */
    getCardBackCell(posX, posY) {
        const key = `back:${posX}:${posY}`;
        const cached = this.cells.get(key);
        if (cached) {
            return cached;
        }
        const image = this.images.get('backgrounds_cards');
        const w = image ? Math.floor(image.naturalWidth / NUM_CARD_BACKGROUNDS) : 133;
        const h = image ? Math.floor(image.naturalHeight / 4) : 200;
        const cell = { sx: posX * w, sy: posY * h, sw: w, sh: h };
        this.cells.set(key, cell);
        return cell;
    }
    // --------------------------------------------------------- stack backgrounds
    /**
     * Cell for a stack background. Port of `Bitmaps.getStackBackground(posX, posY)`.
     * The sheet is 9 x 2 of 133x200 cells.
     */
    getStackBackgroundCell(posX, posY) {
        const key = `stack:${posX}:${posY}`;
        const cached = this.cells.get(key);
        if (cached) {
            return cached;
        }
        const image = this.images.get('backgrounds_stacks');
        const w = image ? Math.floor(image.naturalWidth / 9) : 133;
        const h = image ? Math.floor(image.naturalHeight / 2) : 200;
        const cell = { sx: posX * w, sy: posY * h, sw: w, sh: h };
        this.cells.set(key, cell);
        return cell;
    }
    /**
     * Sprite coordinates of a stack background, following the mapping in
     * `Stack.loadBackgrounds()`.
     */
    static stackBackgroundCoords(key) {
        switch (key) {
            case 'talon':
                return { posX: 1, posY: 0 };
            case '1':
                return { posX: 2, posY: 0 };
            case '2':
                return { posX: 3, posY: 0 };
            case '3':
                return { posX: 4, posY: 0 };
            case '4':
                return { posX: 5, posY: 0 };
            case '5':
                return { posX: 6, posY: 0 };
            case '6':
                return { posX: 7, posY: 0 };
            case '7':
                return { posX: 0, posY: 1 };
            case 'arrowLeft':
                return { posX: 6, posY: 1 };
            case 'arrowRight':
                return { posX: 7, posY: 1 };
            case 'transparent':
                return { posX: 8, posY: 1 };
            case 'default':
            default:
                return { posX: 0, posY: 0 };
        }
    }
    // ------------------------------------------------------------- previews
    /**
     * Cell of a card-theme preview. Port of `Bitmaps.getCardPreview(posX, posY)`.
     * The sheet is 10 x 2 of 266x200 cells.
     */
    getCardPreviewCell(posX, posY) {
        const key = `preview:${posX}:${posY}`;
        const cached = this.cells.get(key);
        if (cached) {
            return cached;
        }
        const image = this.images.get('card_previews');
        const w = image ? Math.floor(image.naturalWidth / (NUM_CARD_THEMES * 2)) : 266;
        const h = image ? Math.floor(image.naturalHeight / 2) : 200;
        const cell = { sx: posX * w, sy: posY * h, sw: w, sh: h };
        this.cells.set(key, cell);
        return cell;
    }
    /**
     * The single King preview shown next to the theme preference.
     * Port of `Bitmaps.getCardPreview2(posX, posY)` — it doubles the x index to skip to the
     * King half of each theme cell.
     */
    getCardPreview2Cell(posX, posY) {
        const doubled = posX * 2 + 1;
        const key = `preview2:${posX}:${posY}`;
        const cached = this.cells.get(key);
        if (cached) {
            return cached;
        }
        const image = this.images.get('card_previews');
        const w = image ? Math.floor(image.naturalWidth / (NUM_CARD_THEMES * 2)) : 133;
        const h = image ? Math.floor(image.naturalHeight / 2) : 200;
        const cell = { sx: doubled * w, sy: posY * h, sw: w, sh: h };
        this.cells.set(key, cell);
        return cell;
    }
    /**
     * Menu tile image. Port of `Bitmaps.getMenu(index)` — the sheet is 6 x 4 cells.
     * The index is the game's position in `LoadGame.loadAllGames()`; see `MENU_INDEX`.
     */
    getMenuCell(index) {
        const posX = index % 6;
        const posY = Math.floor(index / 6);
        const image = this.images.get('backgrounds_menu');
        const w = image ? Math.floor(image.naturalWidth / 6) : 333;
        const h = image ? Math.floor(image.naturalHeight / 4) : 275;
        return { sx: posX * w, sy: posY * h, sw: w, sh: h };
    }
}
/*
 * Menu-tile indices in `LoadGame.loadAllGames()`. `backgrounds_menu.png` is a 6 x 4 sheet
 * and the Android loader appends the games in alphabetical order, so the index is simply
 * the game's position in that list. Only the two games this build ships are listed; the
 * other sixteen cells are deliberately left unreferenced.
 */
export const MENU_INDEX = {
    Klondike: 8,
    Pyramid: 12,
};
