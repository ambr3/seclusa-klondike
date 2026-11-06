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
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/helper/Sounds.java`.
 *
 * The Android class used a `SoundPool`. A single `HTMLAudioElement` is not that: seeking
 * it back to 0, or `cloneNode()`-ing it at the moment of the drop, both wait on the
 * decoder, so the card noise arrived after the card had already moved. Each clip therefore
 * owns a few elements created and buffered up front. A play grabs one that is already
 * sitting at the start. Web Audio would start even sooner, but these pages ship
 * `connect-src 'none'`, so the bytes have to come through `media-src` rather than `fetch`.
 *
 * Audio is never started before a user gesture, so browsers stay happy, and nothing here
 * ever touches the network beyond loading the bundled files.
 */
import { shared } from './SharedData.js';
export var Names;
(function (Names) {
    Names[Names["CARD_RETURN"] = 0] = "CARD_RETURN";
    Names[Names["CARD_SET"] = 1] = "CARD_SET";
    Names[Names["HINT"] = 2] = "HINT";
    Names[Names["DEAL_CARDS"] = 3] = "DEAL_CARDS";
    Names[Names["SHOW_AUTOCOMPLETE"] = 4] = "SHOW_AUTOCOMPLETE";
    Names[Names["WIN"] = 5] = "WIN";
})(Names || (Names = {}));
const FILES = {
    [Names.CARD_RETURN]: 'card_return.ogg',
    [Names.CARD_SET]: 'card_set.ogg',
    [Names.HINT]: 'hint.ogg',
    [Names.DEAL_CARDS]: 'deal_cards.ogg',
    [Names.SHOW_AUTOCOMPLETE]: 'show_autocomplete.ogg',
    [Names.WIN]: 'win.wav',
};
/*
 * PORT: Vite's `import.meta.env.BASE_URL` is gone — there is no bundler. The game entry
 * point sets `shared.assetBase` (e.g. `../cards/`) before the engine boots, and this is
 * the fallback for a standalone run straight from `games/cards/`.
 */
const BASE = './';
/** Idle copies of each clip. Overlapping drops must not decode a new element. */
const VOICES = 4;
export class Sounds {
    baseUrl;
    /** The Android app used `Sounds.names.CARD_SET`; the port keeps the same shape. */
    static Names = Names;
    pool = new Map();
    /** Every element `silence()` has to be able to reach. */
    voices = new Set();
    ready = false;
    unlocked = false;
    constructor(baseUrl = shared.assetBase || BASE) {
        this.baseUrl = baseUrl;
        this.load();
        this.watchMasterSound();
    }
    /** Buffer every copy during load, not on the first drop. */
    load() {
        for (const name of [
            Names.CARD_RETURN,
            Names.CARD_SET,
            Names.HINT,
            Names.DEAL_CARDS,
            Names.SHOW_AUTOCOMPLETE,
            Names.WIN,
        ]) {
            const file = FILES[name];
            const url = `${this.baseUrl}assets/sounds/${file}`;
            const voices = [];
            for (let i = 0; i < VOICES; i++) {
                const audio = new Audio(url);
                audio.preload = 'auto';
                audio.load();
                audio.addEventListener('ended', () => {
                    try {
                        audio.currentTime = 0;
                    }
                    catch {
                        /* not seekable yet */
                    }
                });
                voices.push(audio);
                this.voices.add(audio);
            }
            this.pool.set(name, voices);
        }
        this.ready = true;
    }
    /**
     * Browsers block audio until a user gesture. `unlock()` is called from the first pointer
     * event and plays one silent element that is not part of the pool, so a drop in that
     * same gesture still finds every copy at full volume and at the start.
     */
    unlock() {
        if (this.unlocked) {
            return;
        }
        this.unlocked = true;
        const sample = this.voices.values().next().value;
        if (!sample) {
            return;
        }
        const primer = new Audio(sample.src);
        primer.volume = 0;
        let done = false;
        const release = () => {
            if (done) {
                return;
            }
            done = true;
            primer.pause();
            primer.removeAttribute('src');
            primer.load();
        };
        try {
            const started = primer.play();
            if (started && started.then) {
                started.then(release, release);
            }
            else {
                release();
            }
        }
        catch {
            release();
        }
    }
    playSound(name) {
        if (!this.ready) {
            this.load();
        }
        if (!shared.prefs.getSavedSoundEnabled() || shared.stopUiUpdates) {
            return;
        }
        this.play(name);
    }
    playWinSound() {
        /*
         * The winning sound is gated by the app's sound pill first.
         *
         * Its own setting only says the win sound is *allowed*; it says nothing about
         * whether the player wants to hear anything at all. Without the master check, a
         * player who turned the launcher's sound pill off still got a fanfare every time
         * they won, which is exactly the "the pill did not stop the sound" case.
         */
        if (!shared.prefs.getSavedSoundEnabled()) {
            return;
        }
        if (!shared.prefs.getSavedSoundWinEnabled()) {
            return;
        }
        this.play(Names.WIN);
    }
    play(name) {
        const voices = this.pool.get(name);
        if (!voices || !voices.length) {
            return;
        }
        let audio = null;
        for (const candidate of voices) {
            if (candidate.paused && candidate.currentTime < 0.05) {
                audio = candidate;
                break;
            }
        }
        if (!audio) {
            for (const candidate of voices) {
                if (candidate.paused) {
                    audio = candidate;
                    break;
                }
            }
        }
        if (!audio) {
            audio = voices[0];
        }
        if (!audio.paused || audio.currentTime >= 0.05) {
            try {
                audio.pause();
                audio.currentTime = 0;
            }
            catch {
                /* not seekable yet; play from wherever it is */
            }
        }
        void audio.play().catch(() => undefined);
    }

    /**
     * Stops everything currently sounding.
     *
     * Gating the next sound is not the same as stopping the one that is playing: a card
     * being turned makes a short noise, and the launcher's pill says off, that noise should
     * stop now rather than finish. Each copy is rewound so the next drop finds it already
     * at the start instead of seeking on the gesture.
     */
    silence() {
        for (const audio of this.voices) {
            if (!audio.paused) {
                audio.pause();
            }
            try {
                audio.currentTime = 0;
            }
            catch {
                /* not seekable yet */
            }
        }
    }

    /**
     * Follows the launcher's sound pill while this game is open.
     *
     * The pill writes localStorage from the launcher document; this game is a frame inside
     * it, so the write arrives here as a `storage` event — the only channel between the two,
     * and the reason this can be a listener rather than a poll. A null key means the store
     * was cleared wholesale, which is also "back to the default", so it re-reads instead of
     * assuming.
     */
    watchMasterSound() {
        this.onStorage = (event) => {
            if (event.key !== null && event.key !== 'ssc.pref_key_sound_enabled') {
                return;
            }
            if (!shared.prefs.getSavedSoundEnabled()) {
                this.silence();
            }
        };
        window.addEventListener('storage', this.onStorage);
    }

    /**
     * Release the window listener and the pooled audio elements.
     *
     * `shared.sounds` is replaced by a fresh `Sounds` in every `GameManager` constructor,
     * and each one registers this listener and eagerly builds 6 clips x 4 voices. Switching
     * between Klondike and Pyramid therefore left behind one more listener and 24 more
     * `Audio` elements per switch, all retained by the closure and none released -- the
     * listener was anonymous, so nothing could ever remove it. Calling `silence()` is not a
     * substitute: it stops playback, it does not unhook or free.
     */
    destroy() {
        if (this.onStorage) {
            window.removeEventListener('storage', this.onStorage);
            this.onStorage = null;
        }
        for (const audio of this.voices) {
            audio.pause();
            // Dropping the source is what actually lets the decoder go; without it the
            // element keeps the whole clip alive for as long as the object exists.
            audio.removeAttribute('src');
            audio.load();
        }
        this.voices.clear();
        this.pool.clear();
    }

    isLoaded() {
        return this.ready;
    }
}
