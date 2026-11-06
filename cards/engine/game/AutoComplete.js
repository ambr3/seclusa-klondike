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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/AutoComplete.java`.
 *
 * If the last card on the tableau is flipped up, the auto complete can be run. It simply
 * tests every card from the tableau and the stock if it can be placed on the foundation,
 * continuing until the last card was moved. Then the win animation starts.
 */
import { shared, max, moveToStackSingle } from './SharedData.js';
import { HelperCardMovement } from './HelperCardMovement.js';
import { Sounds } from './Sounds.js';
const START_TIME = 300; // start velocity of the handler callings
const DELTA_TIME = 5; // will be decreased on every call by this number
const MIN_TIME = 50; // minimum to avoid errors
export class AutoComplete extends HelperCardMovement {
    currentTime = START_TIME;
    isFinished = false;
    phase = 1;
    buttonShown = false;
    start() {
        this.hideButton();
        this.phase = 1;
        this.isFinished = false;
        this.currentTime = START_TIME;
        super.start();
    }
    buttonIsShown() {
        return this.buttonShown;
    }
    showButton(withoutMovement) {
        this.buttonShown = true;
        shared.uiHooks.setAutoCompleteButtonVisible?.(true, withoutMovement);
    }
    hideButton() {
        this.buttonShown = false;
        shared.uiHooks.setAutoCompleteButtonVisible?.(false, true);
    }
    moveCard() {
        switch (this.phase) {
            case 1:
                this.phase1();
                break;
            case 2:
                this.phase2();
                break;
            case 3:
            default:
                this.phase3();
                break;
        }
    }
    phase1() {
        const cardAndStack = shared.currentGame.autoCompletePhaseOne();
        if (cardAndStack === null) {
            this.phase = 2;
            this.nextIteration(0);
        }
        else {
            const cards = [];
            const origin = cardAndStack.card.getStack();
            for (let i = origin.getIndexOfCard(cardAndStack.card); i < origin.getSize(); i++) {
                cards.push(origin.getCard(i));
            }
            shared.sounds.playSound(Sounds.Names.CARD_SET);
            moveToStackSingle(cards, cardAndStack.stack, 0);
            this.currentTime = max(this.currentTime - DELTA_TIME, MIN_TIME);
            this.nextIteration(this.currentTime);
        }
    }
    phase2() {
        const cardAndStack = shared.currentGame.autoCompletePhaseTwo();
        if (cardAndStack === null) {
            this.phase = 3;
            this.nextIteration(START_TIME);
        }
        else {
            const card = cardAndStack.card;
            const destination = cardAndStack.stack;
            shared.scores.move(card, destination);
            card.removeFromCurrentStack();
            destination.addCard(card);
            card.bringToFront();
            shared.sounds.playSound(Sounds.Names.CARD_SET);
            card.setLocation(destination.getX(), destination.getY());
            this.currentTime = max(this.currentTime - DELTA_TIME, MIN_TIME);
            this.nextIteration(this.currentTime);
        }
    }
    phase3() {
        this.stop();
        shared.gameLogic.testIfWon();
    }
    haltCondition() {
        return shared.animate.cardIsAnimating() && (this.phase === 1 || this.isFinished);
    }
    /** Kept for parity with the Java field, which the win flow also touched. */
    getIsFinished() {
        return this.isFinished;
    }
    setIsFinished(value) {
        this.isFinished = value;
    }
}
