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
 * The canvas replacement for the Android `RelativeLayout` that held every `ImageView`.
 *
 * Draw order mirrors the Android view order:
 *   1. card-highlight rectangle (was an ImageView brought to front, drawn behind the cards)
 *   2. stack backgrounds (added to the layout first, so they sit underneath)
 *   3. cards, sorted by their `z` (the canvas equivalent of `bringToFront()`)
 *
 * Stack geometry (`Stack.x/y`, card offsets, `Stack.spacing`) is computed by the ported
 * engine in `game/`, not here — this file only paints it.
 */
import { shared } from '../game/SharedData.js';
import { Card } from '../game/Card.js';
import { Bitmaps } from './Bitmaps.js';
export class Renderer {
    canvas;
    bitmaps;
    ctx;
    dpr = 1;
    width = 0;
    height = 0;
    constructor(canvas, bitmaps) {
        this.canvas = canvas;
        this.bitmaps = bitmaps;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            throw new Error('Canvas 2D is not available in this browser.');
        }
        this.ctx = ctx;
    }
    /** Sizes the backing store to the CSS box, honouring devicePixelRatio. */
    resize(width, height, dpr) {
        this.dpr = dpr;
        this.width = width;
        this.height = height;
        this.canvas.width = Math.max(1, Math.round(width * dpr));
        this.canvas.height = Math.max(1, Math.round(height * dpr));
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }
    getWidth() {
        return this.width;
    }
    getHeight() {
        return this.height;
    }
    clear() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /**
     * Full board repaint. Called every animation frame; cheap because the whole board is at
     * most 68 sprites.
     */
    draw(theme, highlight) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (highlight && highlight.visible) {
            this.drawHighlight(highlight, theme);
        }
        for (const stack of shared.stacks) {
            this.drawStackBackground(stack, theme);
        }
        const cards = shared.cards.slice().sort((a, b) => a.z - b.z);
        for (const card of cards) {
            this.drawCard(card);
        }
    }
    /** `drawable/card_highlight.xml`: #88000000, 10dp radius, 5dp padding. */
    drawHighlight(highlight, theme) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.53;
        ctx.fillStyle = theme.textColor;
        roundRect(ctx, highlight.x, highlight.y, highlight.width, highlight.height, 10);
        ctx.fill();
        ctx.restore();
    }
    drawStackBackground(stack, theme) {
        // `backgroundTransparent` (the three discard stacks) draws nothing, like the Java code.
        if (stack.backgroundKey === 'transparent') {
            return;
        }
        const image = this.bitmaps.get('backgrounds_stacks');
        if (!image) {
            return;
        }
        const { posX, posY } = Bitmaps.stackBackgroundCoords(stack.backgroundKey);
        const cell = this.bitmaps.getStackBackgroundCell(posX, posY);
        // The sheet cells are a black silhouette; `setColorFilter(int)` in
        // `GameManager.setUiElementsColor()` replaced their RGB with the text colour while
        // keeping the alpha, which is what drawTinted() does.
        drawTinted(this.ctx, image, cell, stack.x, stack.y, Card.width, Card.height, theme.textColor);
    }
    drawCard(card) {
        if (card.renderHidden || card.invisible) {
            return;
        }
        const theme = shared.prefs.getSavedCardTheme();
        const fourColors = shared.prefs.getSavedFourColorMode();
        const ctx = this.ctx;
        ctx.save();
        if (card.renderScaleX !== 1) {
            const cx = card.renderX + Card.width / 2;
            ctx.translate(cx, card.renderY);
            ctx.scale(Math.max(0.02, card.renderScaleX), 1);
            ctx.translate(-cx, -card.renderY);
        }
        if (card.renderAlpha !== 1) {
            ctx.globalAlpha = card.renderAlpha;
        }
        if (card.isUp()) {
            const frontImage = this.bitmaps.get(cardSheetFile(theme));
            if (frontImage) {
                const cell = this.bitmaps.getCardFrontCellFor(theme, fourColors, card.getColor(), card.getValue());
                ctx.drawImage(frontImage, cell.sx, cell.sy, cell.sw, cell.sh, card.renderX, card.renderY, Card.width, Card.height);
            }
        }
        else {
            const backImage = this.bitmaps.get('backgrounds_cards');
            if (backImage) {
                const cell = this.bitmaps.getCardBackCell(shared.prefs.getSavedCardBackground(), shared.prefs.getSavedCardBackgroundColor());
                // Round the back like `Bitmaps.getCardBack()` does, so face-down cards do not
                // show a square edge next to the rounded face-up cards.
                ctx.save();
                roundRectPath(ctx, card.renderX, card.renderY, Card.width, Card.height, Card.width * 0.1);
                ctx.clip();
                ctx.drawImage(backImage, cell.sx, cell.sy, cell.sw, cell.sh, card.renderX, card.renderY, Card.width, Card.height);
                ctx.restore();
            }
        }
        ctx.restore();
    }
}
// ------------------------------------------------------------------ helpers
function cardSheetFile(theme) {
    switch (theme) {
        case 2:
            return 'cards_classic';
        case 3:
            return 'cards_abstract';
        case 4:
            return 'cards_simple';
        case 5:
            return 'cards_modern';
        case 6:
            return 'cards_oxygen_dark';
        case 7:
            return 'cards_oxygen_light';
        case 8:
            return 'cards_poker';
        case 9:
            return 'cards_paris';
        case 10:
            return 'cards_dondorf';
        case 1:
        default:
            return 'cards_basic';
    }
}
function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
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
function roundRect(ctx, x, y, w, h, r) {
    roundRectPath(ctx, x, y, w, h, r);
}
/**
 * Draws a sprite with an Android-style `colorFilter` applied.
 *
 * `setColorFilter(int)` keeps the source alpha and replaces the RGB — that is how the app
 * let the "text colour" setting tint the stack placeholders. `multiply` against a filled
 * rectangle reproduces that in one pass and keeps the sprite's alpha.
 */
function drawTinted(ctx, image, cell, dx, dy, dw, dh, color) {
    ctx.save();
    // Isolate the sprite, tint it, then composite it back over the board.
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, dx, dy, dw, dh);
    // Re-draw the same sprite through the tint, restricted to where the sprite has alpha.
    const scratch = getScratchCanvas();
    const sctx = scratch.getContext('2d');
    if (sctx) {
        if (scratch.width !== cell.sw || scratch.height !== cell.sh) {
            scratch.width = cell.sw;
            scratch.height = cell.sh;
        }
        sctx.globalCompositeOperation = 'source-over';
        sctx.clearRect(0, 0, scratch.width, scratch.height);
        sctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, 0, 0, cell.sw, cell.sh);
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = color;
        sctx.fillRect(0, 0, scratch.width, scratch.height);
        sctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, dx, dy, dw, dh);
    }
    ctx.restore();
}
let scratchCanvas = null;
function getScratchCanvas() {
    if (scratchCanvas === null) {
        scratchCanvas = document.createElement('canvas');
    }
    return scratchCanvas;
}
