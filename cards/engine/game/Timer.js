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
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Timer.java` plus the
 * ticking body of `handler/HandlerTimer.java`.
 *
 * As in Java, the clock is derived from `Date.now()` rather than a counter, so pausing
 * the tab does not drift.
 */
import { shared } from './SharedData.js';
import { DEFAULT_WINNING_TIME } from './Preferences.js';
import { strings } from '../ui/strings.js';
export class Timer {
    currentTime = 0; // seconds; frozen when a game has been won
    startTime = 0;
    running = false;
    winningTime = 0;
    timerId = null;
    /** Playing time in seconds. If a winning time was saved, show that instead. */
    getCurrentTime() {
        return this.winningTime !== 0 ? this.winningTime : this.currentTime;
    }
    /** Sets the time in seconds. */
    setCurrentTime(time) {
        this.currentTime = time;
    }
    save() {
        if (shared.stopUiUpdates) {
            return;
        }
        this.running = false;
        if (!shared.gameLogic.hasWon()) {
            shared.prefs.saveEndTime(Date.now());
            shared.prefs.saveStartTime(this.startTime);
        }
        else {
            shared.prefs.saveWinningTime(this.winningTime);
        }
    }
    /** Load the time, but subtract the time where the game was paused. */
    load() {
        this.running = true;
        const savedStart = shared.prefs.getSavedStartTime();
        const savedEnd = shared.prefs.getSavedEndTime();
        // Java: `startTime = prefs.getSavedStartTime() + System.currentTimeMillis()
        // - prefs.getSavedEndTime();`
        // DIVERGENCE (defensive only): if no end time was ever written — the app was killed
        // before `hasLoaded`, so `save()` never ran — that expression collapses to
        // `savedStart + now`, i.e. "the game started before the epoch", and the chip renders
        // a six-figure hours field on the very first frame. Start from now instead.
        this.startTime = savedEnd > 0 ? savedStart + Date.now() - savedEnd : Date.now();
        this.winningTime = shared.prefs.getSavedWinningTime();
        this.tick();
    }
    /** Reset all the data, so it will be shown as 0 seconds again. */
    reset() {
        this.running = true;
        shared.prefs.saveStartTime(Date.now());
        shared.prefs.saveEndTime(Date.now());
        shared.prefs.saveWinningTime(DEFAULT_WINNING_TIME);
        this.winningTime = 0;
        this.startTime = Date.now();
        this.tick();
    }
    isRunning() {
        return this.running;
    }
    getStartTime() {
        return this.startTime;
    }
    setWinningTime() {
        this.winningTime = this.currentTime;
    }
    /** Port of the `handleMessage` body of `HandlerTimer`. */
    tick() {
        if (this.timerId !== null) {
            shared.scheduler.cancel(this.timerId);
            this.timerId = null;
        }
        if (this.running && !shared.gameLogic.hasWon()) {
            this.currentTime = Math.trunc((Date.now() - this.startTime) / 1000);
        }
        // DIVERGENCE FROM THE JAVA (deliberate).
        // `HandlerTimer.handleMessage()` re-arms with `sendEmptyMessageDelayed(0, 1000)` from
        // *inside* the `isRunning() && !hasWon()` branch, so in Android the clock stops when
        // the game is won and only restarts because `Timer.reset()` sends a fresh message.
        //
        // `GameLogic.redeal()` calls `timer.reset()` while `won` is still true — it clears
        // `won` a few lines further down. On Android that is harmless, because
        // `sendEmptyMessage` only *posts* to the Looper: `handleMessage` runs after `won` has
        // already been cleared. A port that runs the tick synchronously would instead cancel
        // the pending tick, skip the update and skip the re-arm, leaving the clock dead for
        // the rest of the session with a stale `currentTime` on screen.
        //
        // So: gate the *value* on `hasWon()`, and gate the *scheduling* on `running` only.
        // The extra 1 Hz heartbeat while a game is won costs nothing and `getCurrentTime()`
        // keeps returning `winningTime`, so the display still freezes. `save()` clears
        // `running`, which ends the loop one tick later.
        if (this.running) {
            this.timerId = shared.scheduler.post(() => this.tick(), 1000);
        }
        if (shared.prefs.getSavedHideTime()) {
            this.onTick('');
            return;
        }
        if (shared.stopUiUpdates) {
            return;
        }
        const time = this.getCurrentTime();
        this.onTick(`${strings.game_time}: ${pad(Math.trunc(time / 3600))}:${pad(Math.trunc((time % 3600) / 60))}:${pad(time % 60)}`);
    }
    /** Replaced by the GameManager; kept as a field so `Timer` stays UI-free. */
    onTick = () => undefined;
    stop() {
        if (this.timerId !== null) {
            shared.scheduler.cancel(this.timerId);
            this.timerId = null;
        }
    }
}
function pad(value) {
    return String(value).padStart(2, '0');
}
