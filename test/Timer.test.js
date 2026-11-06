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
 * PORT TO JAVASCRIPT of `helper/Timer.java` + `handler/HandlerTimer.java`.
 *
 * Two defects these tests pin down. Both used to leave a millisecond epoch rendered into
 * the hours field, giving strings like `Time: 497703760:47:02`:
 *
 *  1. `GameLogic.tryLoadSavedGame()` seeds `currentTime` from `getSavedEndTime()`, which is
 *     `System.currentTimeMillis()`, into a *seconds* field. Android only survives this
 *     because `HandlerTimer` is re-armed independently and overwrites it on the next tick.
 *  2. `HandlerTimer.handleMessage()` re-arms the next message from *inside* the
 *     `isRunning() && !hasWon()` branch. `GameLogic.redeal()` calls `timer.reset()` while
 *     `won` is still true, so a synchronous port stops scheduling the next tick and the
 *     clock is dead for the rest of the session — which turns defect 1 from "wrong for one
 *     second" into "wrong forever".
 *
 * `Date.now()` is stubbed per test rather than faked through a timer API, because the
 * clock is derived from the wall clock, not from a counter.
 */

import { afterEach, beforeEach, describe, expect, it } from './runner.js';
import { shared } from '../cards/engine/game/SharedData.js';
import { Scheduler } from '../cards/engine/game/Scheduler.js';
import { setupGame } from './harness.js';

const TIME_PREFIX = 'Time: ';

let realNow = Date.now;
let now = 0;

function setNow(value) {
    now = value;
}

/** A scheduler the test drives by hand, so we can see whether the Timer re-armed. */
class ManualScheduler {
    constructor() {
        this.queue = new Map();
        this.nextId = 1;
        this.host = {
            setTimeout: (fn) => {
                const id = this.nextId++;
                this.queue.set(id, fn);
                return id;
            },
            clearTimeout: (id) => {
                this.queue.delete(id);
            },
        };
    }

    get pending() {
        return this.queue.size;
    }

    /** Fires every queued callback once. Returns how many fired. */
    fire() {
        const entries = [...this.queue.entries()];
        this.queue.clear();
        for (const [, fn] of entries) fn();
        return entries.length;
    }
}

function parseClock(text) {
    const [h, m, s] = text.replace(TIME_PREFIX, '').split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

describe('Timer', () => {
    let clock;
    let shown;

    beforeEach(() => {
        now = 1_700_000_000_000;
        realNow = Date.now;
        Date.now = () => now;
        setNow(now);

        setupGame();

        clock = new ManualScheduler();
        shared.scheduler = new Scheduler(clock.host);
        shared.stopUiUpdates = false;
        shared.gameLogic.setWon(false);

        shown = [];
        shared.timer.onTick = (text) => shown.push(text);
    });

    afterEach(() => {
        Date.now = realNow;
        shared.timer.stop();
    });

    const last = () => shown[shown.length - 1] ?? '';

    it('shows 00:00:00 on a fresh deal', () => {
        shared.timer.reset();

        expect(last()).toBe('Time: 00:00:00');
        expect(shared.timer.getCurrentTime()).toBe(0);
    });

    it('counts up on a fresh deal', () => {
        shared.timer.reset();

        setNow(now + 3000);
        clock.fire();

        expect(last()).toBe('Time: 00:00:03');
        expect(shared.timer.getCurrentTime()).toBe(3);
    });

    it('keeps ticking every second', () => {
        shared.timer.reset();

        setNow(now + 1000);
        clock.fire();
        setNow(now + 2000);
        clock.fire();

        expect(shared.timer.getCurrentTime()).toBe(3);
        expect(last()).toBe('Time: 00:00:03');
    });

    it('never renders a millisecond epoch as an hours field', () => {
        // The exact shape of the old bug: Date.now() fed into a seconds field, then
        // formatted as hh:mm:ss, produced six-figure "hours".
        const nowMs = now;
        shared.prefs.saveEndTime(nowMs);
        shared.prefs.saveStartTime(nowMs - 45_000);

        shared.timer.load();
        setNow(nowMs + 1000);
        clock.fire();

        expect(parseClock(last())).toBeLessThan(3600);
        expect(parseClock(last())).toBe(46);
    });

    it('shows the correct elapsed time when a saved game is resumed', () => {
        // Played for 3 minutes, then the app was paused. Elapsed play time is
        // savedEnd - savedStart; the pause in between must not be counted.
        shared.prefs.saveStartTime(now - 180_000);
        shared.prefs.saveEndTime(now);
        shared.prefs.saveWinningTime(0);

        shared.timer.load();

        expect(last()).toBe('Time: 00:03:00');
        expect(shared.timer.getCurrentTime()).toBe(180);

        setNow(now + 5000);
        clock.fire();
        expect(last()).toBe('Time: 00:03:05');
    });

    it('re-arms even when reset() runs while the game is still flagged won', () => {
        // GameLogic.redeal() calls timer.reset() *before* it clears `won`. Java re-arms from
        // the Looper, so this is harmless there. A port that reschedules from inside the
        // !hasWon() branch queues nothing here, and the clock never moves again.
        shared.gameLogic.setWon(true);

        shared.timer.reset();
        expect(clock.pending).toBeGreaterThan(0);

        shared.gameLogic.setWon(false); // redeal() clears it a few lines later
        setNow(now + 2000);
        clock.fire();

        expect(shared.timer.getCurrentTime()).toBe(2);
        expect(last()).toBe('Time: 00:00:02');
    });

    it('survives a won game and starts counting again for the next one', () => {
        shared.timer.reset();
        setNow(now + 5000);
        clock.fire();
        const beforeWin = shared.timer.getCurrentTime();

        // The game is won: the displayed time must freeze on the winning time.
        shared.timer.setWinningTime();
        shared.gameLogic.setWon(true);
        setNow(now + 60_000);
        clock.fire();

        expect(shared.timer.getCurrentTime()).toBe(beforeWin);
        expect(last()).toBe('Time: 00:00:05');

        // Next game: redeal() resets while `won` is still true, then clears it.
        shared.timer.reset();
        shared.gameLogic.setWon(false);
        setNow(now + 2000);
        clock.fire();

        expect(shared.timer.getCurrentTime()).toBe(2);
        expect(last()).toBe('Time: 00:00:02');
    });

    it('blanks the chip when the hide-time setting is on', () => {
        shared.prefs.putHideTime(true);

        shared.timer.reset();
        expect(last()).toBe('');

        // The clock itself keeps running; only the display is suppressed.
        setNow(now + 2000);
        clock.fire();
        expect(shared.timer.getCurrentTime()).toBe(2);
    });

    it('does not blank the chip when hide-time is off', () => {
        shared.prefs.putHideTime(false);

        shared.timer.reset();
        expect(last()).toBe('Time: 00:00:00');
    });
});

describe('Timer seeding from a saved game', () => {
    let clock;
    let shown;

    beforeEach(() => {
        now = 1_700_000_000_000;
        realNow = Date.now;
        Date.now = () => now;

        setupGame();

        clock = new ManualScheduler();
        shared.scheduler = new Scheduler(clock.host);
        shared.stopUiUpdates = false;

        shown = [];
        shared.timer.onTick = (text) => shown.push(text);
    });

    afterEach(() => {
        Date.now = realNow;
        shared.timer.stop();
    });

    const last = () => shown[shown.length - 1] ?? '';

    it('resuming a saved game renders the elapsed time, not a millisecond epoch', () => {
        // A game that has been running for 4 minutes and was paused a minute ago.
        shared.prefs.saveStartTime(now - 240_000);
        shared.prefs.saveEndTime(now - 60_000);
        shared.prefs.saveWinningTime(0);
        shared.prefs.saveFirstRun(false);

        shared.gameLogic.load(true);
        shared.timer.load();

        expect(shared.timer.getCurrentTime()).toBe(180);
        expect(last()).toBe('Time: 00:03:00');
        expect(parseClock(last())).toBeLessThan(3600);
    });

    it('survives a saved game that was already won', () => {
        shared.prefs.saveStartTime(now - 240_000);
        shared.prefs.saveEndTime(now);
        shared.prefs.saveWinningTime(0);
        shared.prefs.saveFirstRun(false);
        // Keep the won board: auto-start (default on) would deal a new game here.
        shared.prefs.saveAutoStartNewGame(false);
        shared.prefs.saveWon(true);

        shared.gameLogic.load(true);
        // GameManager.onResume() calls timer.load() right after onCreate().
        shared.timer.load();

        expect(shared.timer.getCurrentTime()).toBe(240);
        expect(parseClock(last())).toBeLessThan(3600);
        expect(shared.gameLogic.hasWon()).toBe(true);

        // Then "New game" runs redeal(), which resets while `won` is still true.
        // Easy + EnsureMovability off so newGame() takes the plain redeal() path, and
        // stopUiUpdates so redeal() deals synchronously instead of via DealCards.
        shared.prefs.saveDifficulty('1');
        shared.prefs.saveEnsureMovability(false);
        shared.stopUiUpdates = true;
        shared.gameLogic.newGame();
        shared.stopUiUpdates = false;
        shared.gameLogic.setWon(false);
        setNow(now + 2000);
        clock.fire();

        expect(shared.timer.getCurrentTime()).toBeLessThan(60);
        expect(parseClock(last())).toBeLessThan(3600);
    });

    it('starts from zero when no end time was ever saved', () => {
        // The app was killed before `hasLoaded`, so `save()` never ran.
        shared.prefs.saveStartTime(0);
        shared.prefs.saveEndTime(0);
        shared.prefs.saveWinningTime(0);
        shared.prefs.saveFirstRun(false);

        shared.gameLogic.load(true);
        shared.timer.load();

        expect(shared.timer.getCurrentTime()).toBe(0);
        expect(last()).toBe('Time: 00:00:00');
    });
});