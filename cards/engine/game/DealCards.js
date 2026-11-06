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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/DealCards.java`.
 *
 * Two phases exactly like the Java version: run the game's `dealCards()`, play the deal
 * sound, then hand control to the "after move" handler chain.
 */
import { shared } from './SharedData.js';
import { HelperCardMovement } from './HelperCardMovement.js';
import { Sounds } from './Sounds.js';
export class DealCards extends HelperCardMovement {
    handlerTestAfterMove;
    phase = 1;
    constructor(handlerTestAfterMove) {
        super();
        this.handlerTestAfterMove = handlerTestAfterMove;
    }
    start() {
        this.phase = 1;
        super.start();
    }
    moveCard() {
        switch (this.phase) {
            case 1:
                shared.currentGame.dealNewGame();
                shared.sounds.playSound(Sounds.Names.DEAL_CARDS);
                this.phase = 2;
                this.nextIteration();
                break;
            case 2:
            default:
                this.handlerTestAfterMove.sendNow();
                this.stop();
                break;
        }
    }
}
