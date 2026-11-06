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
 * The browser stand-in for the two Android `Handler` classes the game leans on:
 *
 *  - `WaitForAnimationHandler` (`TIME_DELTA = 100` ms) — polls until no card is animating,
 *    then runs the callback. Used for "after move" and "test if won".
 *  - `HandlerTimer` — refreshes the clock once a second.
 *
 * Both are ported here so the timing behaviour (and the "don't accept input while a card
 * is animating" rule) matches the app exactly.
 */
import { shared } from './SharedData.js';
export const TIME_DELTA = 100;
const browserHost = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
};
export class Scheduler {
    host;
    /**
     * Every id this scheduler handed out and has not cancelled or fired yet.
     *
     * Without it `cancelPending()` had nothing to cancel: each holder (the timer, an undo
     * cascade, a helper movement) keeps its own id, and a screen teardown only reached the
     * two it happened to know about. Teardown clears this set instead.
     */
    pending = new Set();
    constructor(host = browserHost) {
        this.host = host;
    }
    post(fn, delayMs) {
        const id = this.host.setTimeout(() => {
            this.pending.delete(id);
            fn();
        }, delayMs);
        this.pending.add(id);
        return id;
    }
    cancel(id) {
        if (id !== null) {
            this.host.clearTimeout(id);
            this.pending.delete(id);
        }
    }
    cancelPending() {
        for (const id of this.pending) {
            this.host.clearTimeout(id);
        }
        this.pending.clear();
    }
}
/** Port of `WaitForAnimationHandler`. */
export class WaitForAnimationHandler {
    callback;
    id = null;
    constructor(callback) {
        this.callback = callback;
    }
    sendDelayed() {
        if (shared.stopUiUpdates) {
            return;
        }
        this.id = shared.scheduler.post(() => this.tick(), TIME_DELTA);
    }
    sendNow() {
        if (shared.stopUiUpdates) {
            return;
        }
        this.id = shared.scheduler.post(() => this.tick(), 0);
    }
    forceSendNow() {
        this.id = shared.scheduler.post(() => this.tick(), 0);
    }
    clear() {
        if (this.id !== null) {
            shared.scheduler.cancel(this.id);
            this.id = null;
        }
    }
    tick() {
        if (shared.animate.cardIsAnimating() ||
            shared.uiHooks.isPaused() ||
            this.callback.additionalHaltCondition()) {
            this.id = shared.scheduler.post(() => this.tick(), TIME_DELTA);
        }
        else {
            this.callback.doAfterAnimation();
        }
    }
}
