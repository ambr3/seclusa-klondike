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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Hint.java`.
 */
import { shared } from './SharedData.js';
import { HelperCardMovement } from './HelperCardMovement.js';
import { Sounds } from './Sounds.js';
import { strings } from '../ui/strings.js';
/** Max number of hints which are shown when pressing the button. */
export const MAX_NUMBER_OF_HINTS = 3;
export class Hint extends HelperCardMovement {
    counter = 0;
    showedFirstHint = false;
    visited = [];
    start() {
        this.showedFirstHint = false;
        this.visited = [];
        this.counter = 0;
        super.start();
    }
    stopCondition() {
        return this.counter >= MAX_NUMBER_OF_HINTS;
    }
    moveCard() {
        const cardAndStack = shared.currentGame.hintTest(this.visited);
        if (cardAndStack === null) {
            if (!this.showedFirstHint) {
                shared.uiHooks.toast(strings.dialog_no_hint_available);
            }
            this.stop();
        }
        else {
            if (!this.showedFirstHint) {
                shared.sounds.playSound(Sounds.Names.HINT);
                this.showedFirstHint = true;
                shared.prefs.saveTotalHintsShown(shared.prefs.getSavedTotalHintsShown() + 1);
            }
            this.makeHint(cardAndStack.card, cardAndStack.stack);
            this.counter++;
            this.nextIteration();
        }
    }
    /**
     * Moves a card with the hint animation. It is also marked as visited, so it won't be used
     * in the next step. It gets one card and the stack destination, but it also adds all the
     * cards above.
     */
    makeHint(card, destination) {
        const origin = card.getStack();
        const index = origin.getIndexOfCard(card);
        const currentCards = [];
        if (this.counter === 0 && !shared.prefs.getDisableHintCosts()) {
            shared.scores.update(-shared.currentGame.getHintCosts());
        }
        this.visited.push(card);
        for (let i = index; i < origin.getSize(); i++) {
            currentCards.push(origin.getCard(i));
        }
        for (let i = 0; i < currentCards.length; i++) {
            shared.animate.cardHint(currentCards[i], i, destination);
        }
    }
}
