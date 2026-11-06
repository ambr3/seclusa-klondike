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
 * PORT TO JAVASCRIPT — Klondike rules, scoring, stock, undo and layout.
 * Test names are kept identical to `Solitaire/pwa/test/klondike.test.ts`.
 */

import { beforeEach, describe, expect, it } from './runner.js';
import { shared, moveToStackSingle } from '../cards/engine/game/SharedData.js';
import { Preferences } from '../cards/engine/game/Preferences.js';
import { Card } from '../cards/engine/game/Card.js';
import { Game } from '../cards/engine/game/Game.js';
import { setupGame, findCard, resetToStock, VIEWPORT, CLUB, HEART, SPADE, DIAMOND } from './harness.js';

const OPTION_NO_RECORD = 2;

describe('Klondike dealing', () => {
    beforeEach(() => setupGame());

    it('deals the classic 1..7 tableau with only the last card face up', () => {
        for (let i = 0; i < 7; i++) {
            const stack = shared.stacks[i];
            expect(stack.getSize()).toBe(i + 1);
            for (let j = 0; j < i; j++) {
                expect(stack.getCard(j).isUp()).toBe(false);
            }
            expect(stack.getCard(i).isUp()).toBe(true);
        }
    });

    it('leaves the rest of the deck on the main stack (draw 1)', () => {
        // 52 cards - 28 tableau - 1 to the discard stack
        expect(shared.stacks[14].getSize()).toBe(23);
        expect(shared.stacks[13].getSize()).toBe(1);
        expect(shared.stacks[13].getTopCard().isUp()).toBe(true);
        expect(shared.stacks[11].getSize()).toBe(0);
        expect(shared.stacks[12].getSize()).toBe(0);
    });

    it('deals three cards to the discard stacks (draw 3)', () => {
        new Preferences().saveKlondikeDrawMode('3');
        setupGame(VIEWPORT, { keepPreferences: true });

        expect(shared.stacks[11].getSize()).toBe(1);
        expect(shared.stacks[12].getSize()).toBe(1);
        expect(shared.stacks[13].getSize()).toBe(1);
        expect(shared.stacks[14].getSize()).toBe(21);
    });

    it('flips the top card of a tableau pile when a card leaves it', () => {
        const tableau = shared.stacks[6];
        expect(tableau.getCard(5).isUp()).toBe(false);
        expect(tableau.getCard(6).isUp()).toBe(true);

        const moving = tableau.getCard(6);
        moveToStackSingle([moving], shared.stacks[14], OPTION_NO_RECORD);
        // MovingCards does this in moveToDestination(); emulate the engine's flip step.
        if (tableau.getSize() > 0 && !tableau.getTopCard().isUp()) {
            tableau.getTopCard().flipWithAnim();
        }
        expect(tableau.getSize()).toBe(6);
        expect(tableau.getTopCard().isUp()).toBe(true);
    });
});

describe('Klondike card rules', () => {
    beforeEach(() => setupGame());

    it('only accepts kings on an empty tableau stack', () => {
        resetToStock();

        const king = findCard(13, HEART);
        const ace = findCard(1, SPADE);

        expect(shared.currentGame.cardTest(shared.stacks[0], king)).toBe(true);
        expect(shared.currentGame.cardTest(shared.stacks[0], ace)).toBe(false);
    });

    it('accepts alternating colours in descending order on the tableau', () => {
        resetToStock();
        shared.stacks[0].reset();
        shared.stacks[0].addCard(findCard(9, HEART));

        expect(shared.currentGame.cardTest(shared.stacks[0], findCard(8, SPADE))).toBe(true);
        expect(shared.currentGame.cardTest(shared.stacks[0], findCard(8, HEART))).toBe(false);
        expect(shared.currentGame.cardTest(shared.stacks[0], findCard(7, SPADE))).toBe(false);
    });

    it('only accepts aces on an empty foundation stack and keeps families apart', () => {
        const foundation = shared.stacks[7];
        expect(shared.currentGame.cardTest(foundation, findCard(1, SPADE))).toBe(true);
        expect(shared.currentGame.cardTest(foundation, findCard(2, SPADE))).toBe(false);

        foundation.addCard(findCard(1, SPADE));
        expect(shared.currentGame.cardTest(foundation, findCard(2, SPADE))).toBe(true);
        expect(shared.currentGame.cardTest(foundation, findCard(2, HEART))).toBe(false);
    });

    it('refuses more than one card when the player moves a stack to a foundation', () => {
        // movingCards.hasSingleCard() gates the foundation branch of cardTest
        shared.movingCards.add(findCard(1, SPADE), 0, 0);
        shared.movingCards.add(findCard(2, SPADE), 0, 0);
        expect(shared.movingCards.hasSingleCard()).toBe(false);
        expect(shared.currentGame.cardTest(shared.stacks[7], findCard(1, SPADE))).toBe(false);
        shared.movingCards.reset();
    });
});

describe('Klondike scoring', () => {
    beforeEach(() => setupGame());

    it('uses the same point table as the Java game', () => {
        const cards = [];
        const add = (origin, destination) => {
            cards.length = 0;
            for (let i = 0; i <= 12; i++) {
                cards.push(shared.cards[i]);
            }
            const originIDs = new Array(cards.length).fill(origin);
            const destinationIDs = new Array(cards.length).fill(destination);
            return shared.currentGame.addPointsToScore(cards, originIDs, destinationIDs, false);
        };

        expect(add(0, 7)).toBe(60); // tableau -> foundation
        expect(add(7, 0)).toBe(-75); // foundation -> tableau
        expect(add(3, 3)).toBe(25); // flip a card
        expect(add(12, 14)).toBe(-200); // discard -> stock
        expect(add(11, 7)).toBe(45); // stock -> foundation (deal-3 path)
        expect(add(0, 1)).toBe(0); // tableau -> tableau
    });

    it('adds the same points for a real tableau to foundation move', () => {
        // Put the ace of spades on top of the first tableau pile, then send it to a
        // foundation: the table says tableau -> foundation is worth +60.
        resetToStock();
        const ace = findCard(1, SPADE);
        shared.stacks[0].reset();
        shared.stacks[0].addCard(ace);

        moveToStackSingle([ace], shared.stacks[7], 0);
        expect(shared.scores.getScore()).toBe(60);
    });
});

describe('Klondike stock', () => {
    beforeEach(() => setupGame());

    it('draws one card at a time in draw-1 mode', () => {
        expect(shared.currentGame.mainStackTouch()).toBe(1);
        expect(shared.stacks[13].getSize()).toBe(2);
        expect(shared.stacks[14].getSize()).toBe(22);
    });

    it('spreads three cards over the three discard stacks in draw-3 mode', () => {
        new Preferences().saveKlondikeDrawMode('3');
        setupGame(VIEWPORT, { keepPreferences: true });

        shared.currentGame.mainStackTouch();

        // The deal leaves one card on each discard stack. Pressing the stock sweeps
        // stacks 12 and 13 back onto 11, then fans three new cards out again.
        expect(shared.stacks[11].getSize()).toBe(4);
        expect(shared.stacks[12].getSize()).toBe(1);
        expect(shared.stacks[13].getSize()).toBe(1);
        expect(shared.stacks[14].getSize()).toBe(18);
    });

    it('recycles the discard stacks back to the stock when the stock runs out', () => {
        let guard = 0;
        while (shared.stacks[14].getSize() > 0 && guard++ < 100) {
            shared.currentGame.mainStackTouch();
        }
        expect(shared.stacks[14].getSize()).toBe(0);

        const totalDiscard =
            shared.stacks[11].getSize() + shared.stacks[12].getSize() + shared.stacks[13].getSize();
        expect(totalDiscard).toBeGreaterThan(0);

        // press once more: everything goes back on the stock
        expect(shared.currentGame.mainStackTouch()).toBe(2);
        expect(shared.stacks[14].getSize()).toBe(totalDiscard);
        expect(shared.stacks[11].getSize()).toBe(0);
        expect(shared.stacks[12].getSize()).toBe(0);
        expect(shared.stacks[13].getSize()).toBe(0);
    });
});

describe('Klondike hints and win detection', () => {
    beforeEach(() => setupGame());

    it('is not won on a fresh deal and wins when every foundation has 13 cards', () => {
        expect(shared.currentGame.winTest()).toBe(false);

        // Give each foundation the 13 cards of one family, ace first (as the game builds up).
        const families = [CLUB, HEART, SPADE, DIAMOND];
        families.forEach((family, index) => {
            const foundation = shared.stacks[7 + index];
            foundation.reset();
            const cards = shared.cards
                .filter((card) => card.getColor() === family)
                .sort((a, b) => a.getValue() - b.getValue());
            expect(cards.length).toBe(13);
            for (const card of cards) {
                foundation.addCard(card);
            }
        });

        expect(shared.currentGame.winTest()).toBe(true);
    });

    it('shows the autocomplete only when the whole tableau is face up', () => {
        expect(shared.currentGame.autoCompleteStartTest()).toBe(false);
        for (let i = 0; i < 7; i++) {
            for (const card of shared.stacks[i].currentCards) {
                card.flipUp();
            }
        }
        expect(shared.currentGame.autoCompleteStartTest()).toBe(true);
    });
});

describe('Klondike auto complete button', () => {
    beforeEach(() => setupGame());

    it('hides the button again when the tableau is no longer fully face up', () => {
        for (let i = 0; i < 7; i++) {
            for (const card of shared.stacks[i].currentCards) {
                card.flipUp();
            }
        }
        shared.gameLogic.checkForAutoCompleteButton(true);
        expect(shared.autoComplete.buttonIsShown()).toBe(true);

        shared.stacks[0].getCard(0).flipDown();
        shared.gameLogic.checkForAutoCompleteButton(true);
        expect(shared.autoComplete.buttonIsShown()).toBe(false);
    });
});

function placeCards(stackId, cards, up) {
    for (const card of cards) {
        shared.stacks[stackId].addCard(card);
        if (up) {
            card.flipUp();
        }
    }
}

function setOpenPosition(kingsIn) {
    for (const stack of shared.stacks) {
        stack.reset();
    }
    const families = [CLUB, HEART, SPADE, DIAMOND];
    families.forEach((family, index) => {
        const cards = [];
        for (let value = 1; value <= 12; value++) {
            cards.push(findCard(value, family));
        }
        placeCards(7 + index, cards, true);
    });
    const kings = [CLUB, HEART, SPADE, DIAMOND].map((family) => findCard(13, family));
    placeCards(kingsIn, kings, false);
}

function waitForAutoComplete() {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
            if (!shared.autoComplete.isRunning()) {
                resolve();
            } else if (Date.now() - started > 20000) {
                reject(new Error('auto complete did not finish'));
            } else {
                setTimeout(poll, 20);
            }
        };
        poll();
    });
}

describe('Klondike auto complete finishes the game', () => {
    beforeEach(() => setupGame());

    it('offers and finishes the game in draw-3 mode when the kings are on a discard pile', async () => {
        new Preferences().saveKlondikeDrawMode('3');
        setupGame(VIEWPORT, { keepPreferences: true });
        setOpenPosition(11);
        expect(shared.currentGame.autoCompleteStartTest()).toBe(true);

        shared.autoComplete.start();
        await waitForAutoComplete();

        expect(shared.currentGame.winTest()).toBe(true);
    });
});

describe('Klondike shuffle', () => {
    beforeEach(() => setupGame());

    it('produces a permutation of the 52 cards', () => {
        const ids = new Set(shared.gameLogic.randomCards.map((c) => c.getId()));
        expect(ids.size).toBe(52);
    });

    it('changes the deal between two new games', () => {
        const before = shared.gameLogic.snapshotDealOrder().join(',');
        shared.gameLogic.randomize(shared.gameLogic.randomCards);
        const after = shared.gameLogic.snapshotDealOrder().join(',');
        expect(after === before).toBe(false);
    });
});

describe('Klondike undo', () => {
    beforeEach(() => setupGame());

    it('moves the card back to where it came from', () => {
        const tableau = shared.stacks[0];
        const card = tableau.getCard(0);
        const origin = card.getStack();

        moveToStackSingle([card], shared.stacks[14], OPTION_NO_RECORD);
        expect(card.getStack()).toBe(shared.stacks[14]);

        shared.recordList.entries.push({
            moveOrder: [0],
            currentCards: [card],
            currentOrigins: [origin],
            flipCards: [],
            alreadyDecremented: false,
        });
        shared.recordList.undoMore();

        expect(card.getStack()).toBe(origin);
    });
});

describe('undo lock', () => {
    beforeEach(() => setupGame());

    it('releases input when the record list was emptied during an undo', () => {
        shared.recordList.entries.push({
            moveOrder: [],
            currentCards: [],
            currentOrigins: [],
            flipCards: [],
            alreadyDecremented: false,
        });
        shared.recordList.undo();
        shared.recordList.reset();
        shared.recordList.handleMessage();
        expect(shared.recordList.isWorking()).toBe(false);
    });
});

describe('Klondike layout', () => {
    it('lays the 7 tableau stacks out left to right in portrait', () => {
        setupGame(VIEWPORT);

        // Card.width = 400 / 8 = 50, so 7 columns of 50 + 8 gaps fit with 6.25px spacing.
        expect(Card.width).toBe(50);
        expect(Card.height).toBe(75);

        const spacing = 6.25;
        const startPos = 400 / 2 - Card.width / 2 - 3 * Card.width - 3 * spacing;
        for (let i = 0; i < 7; i++) {
            const expected = startPos + spacing * i + Card.width * i;
            expect(Math.abs(shared.stacks[i].getX() - expected)).toBeLessThan(0.00001);
            expect(shared.stacks[i].getX()).toBeLessThan(400);
        }
        // The foundations share the tableau's starting column.
        expect(Math.abs(shared.stacks[7].getX() - shared.stacks[0].getX())).toBeLessThan(0.00001);
        for (let i = 8; i < 11; i++) {
            expect(shared.stacks[i].getX()).toBeGreaterThan(shared.stacks[i - 1].getX());
        }
        // The stock sits to the right of the last discard stack.
        expect(shared.stacks[14].getX()).toBeGreaterThan(shared.stacks[13].getX());
    });

    it('caps the card size on large desktop viewports', () => {
        setupGame({ width: 1600, height: 900, isLandscape: false, isLargeTablet: true });

        // Portrait: cardsInRow 8 → ideal 200px → Klondike width-fit cap (120).
        expect(Card.width).toBe(Game.MAX_CARD_WIDTH_WIDTH_FIT);
        expect(Card.height).toBe(Math.trunc(Card.width * 1.5));
    });

    it('caps landscape cards on very wide desktop viewports', () => {
        setupGame({ width: 2400, height: 900, isLandscape: true, isLargeTablet: true });

        // Landscape: cardsInRow 10 → ideal 240px → Klondike width-fit cap (120).
        expect(Card.width).toBe(Game.MAX_CARD_WIDTH_WIDTH_FIT);
        expect(Card.height).toBe(Math.trunc(Card.width * 1.5));
    });

    it('puts the tableau below the foundation row', () => {
        setupGame(VIEWPORT);
        for (let i = 0; i < 7; i++) {
            expect(shared.stacks[i].getY()).toBeGreaterThan(shared.stacks[7].getY());
        }
    });

    it('mirrors the board in left-handed mode', () => {
        setupGame(VIEWPORT);
        const normalMainX = shared.stacks[14].getX();

        shared.prefs.saveLeftHandedMode(true);
        shared.gameLogic.mirrorStacks(400);

        expect(Math.abs(shared.stacks[14].getX() - (400 - normalMainX - Card.width))).toBeLessThan(0.00001);
    });
});

describe('four-colour mode', () => {
    beforeEach(() => setupGame());

    it('does not change the rules, only the sprite rows', () => {
        const ace = findCard(1, CLUB);
        expect(ace.getColor()).toBe(CLUB);
        shared.prefs.putFourColorMode(true);
        expect(ace.getColor()).toBe(CLUB);
        expect(DIAMOND).toBe(4);
    });
});

describe('returning to a won game', () => {
    beforeEach(() => setupGame());

    it('starts a new deal when auto-start is on (the default)', () => {
        /*
         * After a win the save leaves GameWon=true and the cards parked off-screen.
         * Opening the game again must deal a fresh layout when the preference (default
         * on) says so. The port never called setWonAndReloaded(), so that path was dead
         * and every return painted an empty board.
         *
         * Hard difficulty so newGame() takes the plain redeal path (Easy/Medium would
         * hand off to EnsureMovability, which the harness stubs as a no-op).
         */
        shared.prefs.saveDifficulty('hard');
        shared.prefs.saveWon(true);
        shared.prefs.saveWonAndReloaded(false);
        shared.gameLogic.won = true;
        shared.gameLogic.wonAndReloaded = false;

        shared.gameLogic.load(true);

        expect(shared.gameLogic.hasWon()).toBe(false);
        expect(shared.stacks[0].getSize()).toBe(1);
        expect(shared.stacks[6].getSize()).toBe(7);
        expect(shared.stacks[0].getTopCard().renderX).toBeGreaterThan(-1000);
    });

    it('keeps the won board when auto-start is off', () => {
        shared.prefs.saveAutoStartNewGame(false);
        shared.prefs.saveWon(true);
        shared.prefs.saveWonAndReloaded(false);
        shared.gameLogic.won = true;
        shared.gameLogic.wonAndReloaded = false;

        shared.gameLogic.load(true);

        expect(shared.gameLogic.hasWon()).toBe(true);
    });
});