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
 */

/**
 * PORT TO JAVASCRIPT — untrusted-storage and scheduler-teardown tests.
 *
 * Everything the engine persists is plaintext in localStorage, and a value there is only
 * ever as good as the code that reads it. Three of the bugs these pin down shared one
 * shape: a number or an index taken from storage and used as a bound or an index without
 * a check.
 *
 *   1. `RecordList.load()` looped `getSavedRecordListEntriesSize()` times. That count is a
 *      raw number, so a value like `1000000000` spun forever and the game never started.
 *   2. `RecordList.loadEntry()` indexed `shared.cards[]` / `shared.stacks[]` with stored
 *      ids. An id out of range is `undefined`, and the entry only blew up later — on the
 *      *next* save, from `saveEntry()` calling `getId()` on it — so every later move threw
 *      with nothing on screen to explain it.
 *   3. `RecordList.maxRecords` came straight from a preference, so a corrupt value removed
 *      the cap on the undo list for the rest of the session.
 *
 * `Scheduler.cancelPending()` had nothing to cancel at all: each holder kept its own id and
 * only the two `GameManager.destroy()` happened to clear had been reachable, so an undo
 * cascade could outlive the screen it belonged to.
 */

import { beforeEach, describe, expect, it } from './runner.js';
import { shared } from '../cards/engine/game/SharedData.js';
import { Preferences, resetAllPreferences } from '../cards/engine/game/Preferences.js';
import { RecordList } from '../cards/engine/game/RecordList.js';
import { Scheduler } from '../cards/engine/game/Scheduler.js';
import { EnsureMovability } from '../cards/engine/game/EnsureMovability.js';
import { iconSvg } from '../cards/engine/ui/icons.js';
import { setupGame } from './harness.js';

const GAME_PREFIX = 'ssc.game.Klondike.';

function put(key, value) {
    localStorage.setItem(GAME_PREFIX + key, value);
}

/** A scheduler host the test drives by hand, so nothing real is left armed. */
class ManualHost {
    constructor() {
        this.queue = new Map();
        this.nextId = 1;
    }

    setTimeout(fn) {
        const id = this.nextId++;
        this.queue.set(id, fn);
        return id;
    }

    clearTimeout(id) {
        this.queue.delete(id);
    }

    get pending() {
        return this.queue.size;
    }

    fire() {
        const entries = [...this.queue.entries()];
        this.queue.clear();
        for (const [, fn] of entries) fn();
        return entries.length;
    }
}

describe('RecordList reads only what storage can actually mean', () => {
    beforeEach(() => {
        setupGame();
    });

    it('drops an entry whose stored card id is out of range', () => {
        put('RecordListEntriesSize', '1');
        put('RecordListEntry0Card', '9999');
        put('RecordListEntry0Origin', '0');
        put('RecordListEntry0Order', '0');

        shared.recordList.load();

        // The entry is kept but empty, rather than holding an `undefined` card that throws
        // on the next save.
        expect(shared.recordList.entries.length).toBe(1);
        expect(shared.recordList.entries[0].currentCards.length).toBe(0);
    });

    it('drops an entry whose stored origin stack id is out of range', () => {
        put('RecordListEntriesSize', '1');
        put('RecordListEntry0Card', '5');
        put('RecordListEntry0Origin', '9999');
        put('RecordListEntry0Order', '0');

        shared.recordList.load();

        expect(shared.recordList.entries[0].currentOrigins.length).toBe(0);
    });

    it('drops an out-of-range flip card', () => {
        put('RecordListEntriesSize', '1');
        put('RecordListEntry0Card', '5');
        put('RecordListEntry0Origin', '0');
        put('RecordListEntry0Order', '0');
        put('RecordListEntry0FlipCard', '9999');

        shared.recordList.load();

        expect(shared.recordList.entries[0].flipCards.length).toBe(0);
    });

    it('still saves after loading a corrupt entry', () => {
        // The actual failure: `saveEntry()` calls `getId()` on every card, so one bad id
        // made every later save throw.
        put('RecordListEntriesSize', '1');
        put('RecordListEntry0Card', '5,9999');
        put('RecordListEntry0Origin', '9999,0');
        put('RecordListEntry0Order', '0,0');

        shared.recordList.load();
        shared.recordList.save();

        expect(shared.prefs.getSavedRecordListEntriesSize()).toBe(1);
    });

    it('keeps a valid entry intact', () => {
        put('RecordListEntriesSize', '1');
        put('RecordListEntry0Card', '5');
        put('RecordListEntry0Origin', '0');
        put('RecordListEntry0Order', '0');

        shared.recordList.load();

        expect(shared.recordList.entries[0].currentCards.length).toBe(1);
        expect(shared.recordList.entries[0].currentCards[0]).toBe(shared.cards[5]);
        expect(shared.recordList.entries[0].currentOrigins[0]).toBe(shared.stacks[0]);
    });

    it('never reads more entries than the undo list can hold', () => {
        // A stored size in the billions used to be the loop bound. The load now stops at
        // the cap, so this returns instead of hanging.
        put('RecordListEntriesSize', '1000000000');

        shared.recordList.load();

        expect(shared.recordList.entries.length).toBeLessThan(100);
    });

    it('caps a corrupt maximum-undo preference', () => {
        localStorage.setItem('ssc.pref_key_max_number_undos', '999999999');

        const list = new RecordList(shared.scheduler);

        expect(RecordList.maxRecords).toBe(1000);
        expect(list.entries.length).toBe(0);
    });

    it('honours a zero maximum-undo preference as no undo at all', () => {
        localStorage.setItem('ssc.pref_key_max_number_undos', '0');

        const list = new RecordList(shared.scheduler);
        list.add([shared.cards[0], shared.cards[1]]);

        expect(list.entries.length).toBe(0);
    });
});

describe('Scheduler teardown', () => {
    it('cancelPending() cancels every armed callback', () => {
        const host = new ManualHost();
        const scheduler = new Scheduler(host);
        let fired = 0;

        scheduler.post(() => fired++, 10);
        scheduler.post(() => fired++, 20);
        scheduler.post(() => fired++, 30);
        expect(host.pending).toBe(3);

        scheduler.cancelPending();

        expect(host.pending).toBe(0);
        expect(scheduler.pending.size).toBe(0);
        host.fire();
        expect(fired).toBe(0);
    });

    it('forgets an id once its callback has run', () => {
        const host = new ManualHost();
        const scheduler = new Scheduler(host);
        let fired = 0;

        scheduler.post(() => fired++, 10);
        host.fire();

        expect(fired).toBe(1);
        expect(scheduler.pending.size).toBe(0);
    });

    it('cancel(id) cancels only that one', () => {
        const host = new ManualHost();
        const scheduler = new Scheduler(host);
        let first = 0;
        let second = 0;

        const id = scheduler.post(() => first++, 10);
        scheduler.post(() => second++, 20);
        scheduler.cancel(id);
        host.fire();

        expect(first).toBe(0);
        expect(second).toBe(1);
    });
});

describe('EnsureMovability survives a pause', () => {
    beforeEach(() => {
        setupGame();
        shared.ensureMovability = new EnsureMovability(() => {
            /* the test drives the search by hand, so `step` is never advanced */
        });
    });

    it('resumes the search instead of stranding the game half-dealt', () => {
        shared.ensureMovability.start(10);
        expect(shared.ensureMovability.cancelled).toBe(false);
        expect(shared.stopUiUpdates).toBe(true);

        shared.ensureMovability.pause();
        // A paused search is cancelled, and `stopUiUpdates` is handed back so the rest of
        // the game is not frozen while the tab is in the background.
        expect(shared.ensureMovability.cancelled).toBe(true);
        expect(shared.stopUiUpdates).toBe(false);

        shared.ensureMovability.resume();

        // A restart, not a no-op: the search is live again and the board is a real deal
        // rather than the hint bot's half-played one.
        expect(shared.ensureMovability.cancelled).toBe(false);
        expect(shared.stopUiUpdates).toBe(true);
        expect(shared.cards.every((card) => card.getStack() !== null)).toBe(true);
    });

    it('stop() leaves nothing running', () => {
        shared.ensureMovability.start(10);
        shared.ensureMovability.stop();

        expect(shared.ensureMovability.isRunning()).toBe(false);
        expect(shared.stopUiUpdates).toBe(false);

        shared.ensureMovability.resume();
        expect(shared.ensureMovability.isRunning()).toBe(false);
    });
});

describe('iconSvg writes only numbers into its attributes', () => {
    it('renders a known icon at a numeric size', () => {
        const svg = iconSvg('close', 22);

        expect(svg).toContain('width="22"');
        expect(svg).toContain('height="22"');
    });

    it('refuses a size that is not a number rather than emitting it', () => {
        // The string goes to innerHTML at every call site, so a size carrying markup must
        // not reach the `width` attribute.
        expect(iconSvg('close', '24" onload="alert(1)')).toBe('');
        expect(iconSvg('close', Number.NaN)).toBe('');
    });

    it('refuses an unknown icon instead of throwing', () => {
        expect(iconSvg('nope', 24)).toBe('');
    });
});
/*
 * A corrupt value in localStorage must cost at most the thing it corrupted.
 *
 * Storage is plaintext and never trusted -- the engine's own rule -- but "never trusted"
 * is only true if reading a bad value degrades instead of throwing. Every test here feeds
 * in something a hand-edit, a truncated write or a version change could realistically
 * leave behind, and asserts that the player still gets a playable board.
 */
describe('corrupt saved state degrades instead of taking the game with it', () => {
    beforeEach(() => {
        setupGame();
    });

    it('skips a stack entry that names a card which does not exist', () => {
        // 999 is not a card id. `addCard(undefined)` throws on `card.setStack`, and that
        // throw unwinds through the whole load -- so one bad digit in one stack used to
        // cost the player their entire deal.
        put('Stack0', '0,1,999,3');

        shared.stacks[0].load(true);

        expect(shared.stacks[0].getSize()).toBe(3);
        // The good ids kept their order; the bad one left no trace and no gap.
        expect(shared.stacks[0].currentCards.map((c) => c.getId())).toEqual([0, 1, 3]);
    });

    it('survives a stack list that is entirely out of range', () => {
        put('Stack1', '998,999,1000,1001');

        shared.stacks[1].load(true);

        expect(shared.stacks[1].getSize()).toBe(0);
    });

    it('will not let a stack hold more cards than the deck has', () => {
        // Every id valid, repeated far beyond a deck's worth. Accepted as-is, this is a
        // list `runSpacing` then walks -- a hang wearing a game's clothes.
        put('Stack2', Array.from({ length: 5000 }, () => 0).join(','));

        shared.stacks[2].load(true);

        expect(shared.stacks[2].getSize() <= shared.cards.length).toBe(true);
    });

    it('refuses an oversized saved-score list without parsing it', () => {
        // Re-parsed on every Scores.load(), so every layout and every resume. A
        // multi-megabyte value became a multi-million element array each time.
        put('SavedScores0', Array.from({ length: 500000 }, (_, i) => i % 52).join(','));

        shared.scores.load();

        expect(Array.isArray(shared.scores.highScores ?? [])).toBe(true);
    });

    it('ignores a saved-score list made entirely of junk', () => {
        put('SavedScores0', 'not,numbers,at,all');
        shared.scores.load();

        put('SavedScores0', '');
        shared.scores.load();

        expect(Array.isArray(shared.scores.highScores ?? [])).toBe(true);
    });
});

describe('Klondike and Pyramid keep separate customization', () => {
    beforeEach(() => {
        resetAllPreferences();
    });

    it('does not let a Klondike card-back change rewrite Pyramid', () => {
        Preferences.setGameId('Klondike');
        const klondike = new Preferences();
        klondike.saveCurrentGame(0);
        klondike.ensureSettingsOnlyForThisGame();
        klondike.saveCardBackground(4);

        Preferences.setGameId('Pyramid');
        const pyramid = new Preferences();
        pyramid.saveCurrentGame(1);
        pyramid.ensureSettingsOnlyForThisGame();
        expect(pyramid.getSavedCardBackground()).not.toBe(4);

        pyramid.saveCardBackground(7);

        // gamePrefix follows the static game id, so switch before each read.
        Preferences.setGameId('Klondike');
        expect(klondike.getSavedCardBackground()).toBe(4);
        Preferences.setGameId('Pyramid');
        expect(pyramid.getSavedCardBackground()).toBe(7);
    });

    it('seeds each game once from the old shared values', () => {
        // Shared store still holds the pre-split customization.
        const seed = new Preferences();
        seed.saveCurrentGame(-1);
        seed.setInt('pref_key_cards_background_new', 3);

        Preferences.setGameId('Klondike');
        const klondike = new Preferences();
        klondike.saveCurrentGame(0);
        klondike.ensureSettingsOnlyForThisGame();
        expect(klondike.getSavedCardBackground()).toBe(3);

        // Second call must not re-seed over a later change.
        klondike.saveCardBackground(9);
        klondike.ensureSettingsOnlyForThisGame();
        expect(klondike.getSavedCardBackground()).toBe(9);
    });
});
