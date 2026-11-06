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
 * Direct port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/RecordList.java`.
 *
 * The Java class drives its undo cascade through a `WaitForAnimationHandler`. Here the
 * equivalent is a scheduled callback (see `schedule`), so the "tiered" undo (lowest move
 * order first, then the next tier) behaves the same.
 */
import { shared, moveToStack, OPTION_UNDO } from './SharedData.js';
import { Sounds } from './Sounds.js';
export class RecordList {
    scheduler;
    entries = [];
    working = false;
    constructor(scheduler) {
        this.scheduler = scheduler;
        this.setMaxRecords();
    }
    reset() {
        this.entries = [];
    }
    clear() {
        this.scheduler.cancelPending();
    }
    static maxRecords = 20;
    /** Adds the cards; origin is the current stack of each card. */
    add(cards) {
        this.push(newEntry(cards, null, null));
    }
    /** Adds the cards with a single origin stack. */
    addWithOrigin(cards, origin) {
        this.push(newEntry(cards, origin, null));
    }
    /** Adds the cards with one origin stack per card. */
    addWithOrigins(cards, origins) {
        this.push(newEntry(cards, null, origins));
    }
    push(entry) {
        if (RecordList.maxRecords <= 0) {
            return;
        }
        if (this.entries.length >= RecordList.maxRecords) {
            this.entries.shift();
        }
        this.entries.push(entry);
    }
    /**
     * Adds more cards to the last entry but as the FIRST cards of that entry, so these cards
     * will be moved first if the record is undone.
     */
    addToLastEntry(cards, origins) {
        if (this.entries.length === 0) {
            this.push(newEntry(cards, null, origins));
        }
        else {
            addInFront(this.entries[this.entries.length - 1], cards, origins);
        }
    }
    addToLastEntrySingle(card, origin) {
        this.addToLastEntry([card], [origin]);
    }
    /** Reverts one record, deletes it from the list and takes 25 points off the score. */
    undo() {
        if (this.entries.length === 0) {
            return;
        }
        this.working = true;
        shared.sounds.playSound(Sounds.Names.CARD_RETURN);
        if (!shared.prefs.getDisableUndoCosts()) {
            shared.scores.update(-shared.currentGame.getUndoCosts());
        }
        const entry = this.entries[this.entries.length - 1];
        for (const card of entry.flipCards) {
            card.flipWithAnim();
        }
        this.scheduler.post(() => this.handleMessage(), 100);
    }
    undoMore() {
        if (this.entries.length > 0) {
            undoMore(this.entries[this.entries.length - 1]);
        }
    }
    /** A flip card will be added to the last entry, so it can be flipped back on undo. */
    addFlip(card) {
        if (this.entries.length > 0) {
            this.entries[this.entries.length - 1].flipCards.push(card);
        }
    }
    save() {
        shared.prefs.saveRecordListEntriesSize(this.entries.length);
        for (let i = 0; i < this.entries.length; i++) {
            saveEntry(this.entries[i], String(i));
        }
    }
    load() {
        this.reset();
        /*
         * The stored size is a plain number out of localStorage and one entry is read per
         * unit of it, so it is bounded by what the undo list can ever hold. Without the
         * clamp a corrupt or hand-edited value spins here for as long as the number is
         * large — the game never starts and never says why.
         */
        const stored = shared.prefs.getSavedRecordListEntriesSize();
        const count = Math.max(0, Math.min(stored, RecordList.maxRecords));
        for (let i = 0; i < count; i++) {
            this.entries.push(loadEntry(String(i)));
        }
    }
    deleteLast() {
        if (this.entries.length > 0) {
            this.entries.pop();
        }
    }
    hasMoreToUndo() {
        if (this.entries.length === 0) {
            this.working = false;
            return false;
        }
        if (this.entries[this.entries.length - 1].currentCards.length !== 0) {
            return true;
        }
        this.entries.pop();
        this.working = false;
        // check if the undo movement makes autocomplete undoable
        if (shared.autoComplete.buttonIsShown() && !shared.currentGame.autoCompleteStartTest()) {
            shared.autoComplete.hideButton();
        }
        shared.currentGame.afterUndo();
        return false;
    }
    isWorking() {
        return this.working;
    }
    setMaxRecords() {
        /*
         * The cap is a plain number out of localStorage. The settings dialog offers up to
         * 100, so 1000 is well past any real choice, but it is still a ceiling: without one
         * a corrupt value drops the bound entirely and the undo list grows for the rest of
         * the session.
         */
        RecordList.maxRecords = Math.max(0, Math.min(shared.prefs.getSavedMaxNumberUndos(), 1000));
        while (this.entries.length > RecordList.maxRecords) {
            this.entries.shift();
        }
    }
    handleMessage() {
        if (this.hasMoreToUndo()) {
            this.undoMore();
            this.scheduler.post(() => this.handleMessage(), 100);
        }
    }
    getCurrentCards(entry) {
        return entry.currentCards;
    }
    getCurrentOrigins(entry) {
        return entry.currentOrigins;
    }
}
// -------------------------------------------------------------- entry helpers
function newEntry(cards, singleOrigin, origins) {
    const entry = {
        moveOrder: [],
        currentCards: [],
        currentOrigins: [],
        flipCards: [],
        alreadyDecremented: false,
    };
    entry.currentCards = cards.slice();
    if (singleOrigin !== null) {
        for (let i = 0; i < entry.currentCards.length; i++) {
            entry.currentOrigins.push(singleOrigin);
            entry.moveOrder.push(0);
        }
    }
    else {
        entry.currentOrigins = (origins ?? cards.map((c) => c.getStack())).slice();
        for (let i = 0; i < entry.currentCards.length; i++) {
            entry.moveOrder.push(0);
        }
    }
    return entry;
}
function loadEntry(pos) {
    const cardList = shared.prefs.getSavedRecordListCards(pos);
    const originList = shared.prefs.getSavedRecordListOrigins(pos);
    const orderList = shared.prefs.getSavedRecordListOrders(pos);
    const entry = {
        moveOrder: [],
        currentCards: [],
        currentOrigins: [],
        flipCards: [],
        alreadyDecremented: false,
    };
    /*
     * localStorage is plaintext and is never trusted: an id that is out of range indexes to
     * `undefined`, and the entry would then throw on the *next* save (`saveEntry` calls
     * `getId()` on every card) instead of here — a save that throws on every subsequent
     * move, with nothing on screen to explain it.
     */
    for (let i = 0; i < cardList.length; i++) {
        const card = shared.cards[cardList[i]];
        const origin = shared.stacks[originList[i]];
        if (card === undefined || origin === undefined) {
            continue;
        }
        entry.currentCards.push(card);
        entry.currentOrigins.push(origin);
        entry.moveOrder.push(orderList.length > i ? orderList[i] : 0);
    }
    const flipCardList = shared.prefs.getSavedRecordListFlipCards(pos);
    if (flipCardList.length > 0) {
        for (const id of flipCardList) {
            const card = shared.cards[id];
            if (card !== undefined) {
                entry.flipCards.push(card);
            }
        }
    }
    else {
        // compatibility with the older way of saving: one flip card only
        const flipCardID = shared.prefs.getSavedFlipCardId(pos);
        const flipCard = shared.cards[flipCardID];
        if (flipCardID > 0 && flipCard !== undefined) {
            entry.flipCards.push(flipCard);
        }
    }
    return entry;
}
function saveEntry(entry, pos) {
    const listCards = [];
    const listFlipCards = [];
    const listOrigins = [];
    for (let i = 0; i < entry.currentCards.length; i++) {
        listCards.push(entry.currentCards[i].getId());
        listOrigins.push(entry.currentOrigins[i].getId());
    }
    shared.prefs.saveRecordListCards(listCards, pos);
    shared.prefs.saveRecordListOrigins(listOrigins, pos);
    shared.prefs.saveRecordListOrders(entry.moveOrder, pos);
    for (const card of entry.flipCards) {
        listFlipCards.push(card.getId());
    }
    shared.prefs.saveRecordListFlipCards(listFlipCards, pos);
}
/**
 * Contains the actual card movements. It undoes the cards with the lowest move order and
 * removes them from the list. Called repeatedly until all cards are away, so the movements
 * are tiered. Port of `RecordList.Entry.undoMore()`.
 */
function undoMore(entry) {
    // Check if the movement resulted in an increment of the redeal counter; if so, revert it
    if (shared.currentGame.hasLimitedRecycles() && !entry.alreadyDecremented) {
        const discardStacks = shared.currentGame.getDiscardStacks();
        for (let i = 0; i < entry.currentCards.length; i++) {
            if (entry.currentCards[i].getStack() === shared.currentGame.getDealStack() &&
                discardStacks.includes(entry.currentOrigins[i])) {
                shared.currentGame.decrementRecycleCounter();
                entry.alreadyDecremented = true;
                break;
            }
        }
    }
    const cardsWorkCopy = [];
    const originsWorkCopy = [];
    const moveOrderWorkCopy = [];
    if (entry.moveOrder.length === 0) {
        return;
    }
    // `SharedData.min(ArrayList<Integer>)` in Java: returns 0 for an empty list.
    const minMoveOrder = entry.moveOrder.reduce((acc, value) => (value < acc ? value : acc), entry.moveOrder[0]);
    for (let i = 0; i < entry.currentCards.length; i++) {
        if (entry.moveOrder[i] === minMoveOrder) {
            cardsWorkCopy.push(entry.currentCards[i]);
            originsWorkCopy.push(entry.currentOrigins[i]);
            moveOrderWorkCopy.push(entry.moveOrder[i]);
        }
    }
    moveToStack(cardsWorkCopy, originsWorkCopy, OPTION_UNDO);
    for (let i = 0; i < cardsWorkCopy.length; i++) {
        entry.currentCards.splice(entry.currentCards.indexOf(cardsWorkCopy[i]), 1);
        entry.currentOrigins.splice(entry.currentOrigins.indexOf(originsWorkCopy[i]), 1);
        entry.moveOrder.splice(entry.moveOrder.indexOf(moveOrderWorkCopy[i]), 1);
    }
}
/**
 * Adds cards in front of this entry. Every current card's move order is increased by 1 and
 * the new cards get order 0. Port of `RecordList.Entry.addInFront(...)`.
 */
function addInFront(entry, cards, stacks) {
    const tempCards = entry.currentCards;
    const tempOrigins = entry.currentOrigins;
    const tempMoveOrders = entry.moveOrder;
    entry.currentCards = cards.slice();
    entry.currentOrigins = stacks.slice();
    entry.moveOrder = new Array(entry.currentCards.length).fill(0);
    for (let i = 0; i < tempCards.length; i++) {
        entry.currentCards.push(tempCards[i]);
        entry.currentOrigins.push(tempOrigins[i]);
        entry.moveOrder.push(tempMoveOrders[i] + 1);
    }
}
