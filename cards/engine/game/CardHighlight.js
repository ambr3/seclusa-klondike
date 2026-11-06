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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/CardHighlight.java`.
 *
 * Sets a semi-transparent rectangle behind the card to highlight it, so the user knows
 * which card was tapped. In the app that was an ImageView; here it is a state object the
 * renderer paints under the cards.
 */
import { Card } from './Card.js';
export class CardHighlight {
    padding = 0;
    width = 0;
    height = 0;
    moveStarted = false;
    state = {
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#000000',
    };
    /** Sets the size of the highlight and moves it behind the cards. */
    set(card) {
        const stack = card.getStack();
        this.padding = Math.round(Card.width * 0.25);
        this.width = Card.width + this.padding;
        this.height = Math.round(stack.getTopCard().getY() + Card.height - card.getY() + this.padding);
        this.state.width = this.width;
        this.state.height = this.height;
        this.state.x = card.getX() - this.padding / 2;
        this.state.y = card.getY() - this.padding / 2;
        this.state.visible = true;
        for (let i = card.getIndexOnStack(); i < stack.getSize(); i++) {
            stack.getCard(i).bringToFront();
        }
        this.moveStarted = false;
    }
    /**
     * For drag and drop movements: updates the position of the highlight behind the card.
     * The height needs updating because `MovingCards.move()` changes the card offsets.
     */
    move(card) {
        if (!this.moveStarted) {
            this.moveStarted = true;
            this.height = Math.round(card.getStack().getTopCard().getY() + Card.height - card.getY() + this.padding);
            this.state.height = this.height;
        }
        this.state.x = card.getX() - this.padding / 2;
        this.state.y = card.getY() - this.padding / 2;
    }
    hide() {
        this.state.visible = false;
    }
}
