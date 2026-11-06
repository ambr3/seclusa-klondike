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
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/classes/HelperCardMovement.java`.
 *
 * Generalises the loop used by auto complete, hint and the initial deal: each iteration
 * waits until no card is animating, runs `moveCard()`, then schedules the next iteration
 * after `timeDelta` milliseconds. Pause/resume mirrors the Android behaviour.
 */
import { shared } from './SharedData.js';
export class HelperCardMovement {
    timeDelta = 100; // in ms
    running = false;
    paused = false;
    timerId = null;
    start() {
        this.running = true;
        this.dispatch();
    }
    stop() {
        this.running = false;
        this.clearTimer();
    }
    pause() {
        if (this.isRunning()) {
            this.paused = true;
            this.running = false;
            this.clearTimer();
        }
    }
    /** Is nearly the same as start(), but it does not reinitialize data. */
    resume() {
        if (this.paused) {
            this.paused = false;
            this.running = true;
            this.dispatch();
        }
    }
    isPaused() {
        return this.paused;
    }
    isRunning() {
        return this.running;
    }
    /**
     * Java has two overloads here (`nextIteration()` and `nextIteration(int)`); an optional
     * parameter keeps both call sites working with one implementation.
     */
    nextIteration(customTimeDelta) {
        if (customTimeDelta !== undefined) {
            this.timeDelta = customTimeDelta;
        }
        this.schedule(this.timeDelta);
    }
    haltCondition() {
        return shared.animate.cardIsAnimating();
    }
    stopCondition() {
        return false;
    }
    dispatch() {
        this.clearTimer();
        this.timerId = shared.scheduler.post(() => this.tick(), 0);
    }
    tick() {
        this.timerId = null;
        if (!this.running) {
            return;
        }
        if (this.stopCondition()) {
            this.running = false;
            return;
        }
        if (this.haltCondition()) {
            this.timerId = shared.scheduler.post(() => this.tick(), 16);
            return;
        }
        this.moveCard();
        // `moveCard()` is expected to call nextIteration() or stop()
    }
    schedule(delay) {
        this.clearTimer();
        if (this.running) {
            this.timerId = shared.scheduler.post(() => this.tick(), delay);
        }
    }
    clearTimer() {
        if (this.timerId !== null) {
            shared.scheduler.cancel(this.timerId);
            this.timerId = null;
        }
    }
}
