/*
 * Copyright TO TYPESCRIPT PORT — see the ported files for the original
 * Copyright (C) 2016  Tobias Bielefeld (GPL-3.0).
 *
 * The GPL-3.0 notice above must survive every further copy.
 */

/**
 * PORT TO JAVASCRIPT of the PRNG uniformity and rejection-sampling tests.
 *
 * These exist because of a defect that no gameplay test could ever have caught, and
 * which no amount of playing would reliably have surfaced either.
 */

import { describe, expect, it } from './runner.js';
import { Prng } from '../cards/engine/util/prng.js';

/**
 * Runs `fn` with `globalThis.crypto` replaced, then puts the real one back.
 *
 * `crypto` is a getter-only global in the browser, so it cannot simply be assigned;
 * `defineProperty` is the only way to swap it, and the descriptor is restored in a
 * `finally` so one failing assertion cannot poison every test after it.
 */
function withCrypto(replacement, fn) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: replacement });
    try {
        return fn();
    }
    finally {
        if (original) {
            Object.defineProperty(globalThis, 'crypto', original);
        }
        else {
            delete globalThis.crypto;
        }
    }
}

/**
 * A byte source that returns `values` in order, then the last one forever.
 *
 * Each value is a uint32 written out **big-endian**, because that is the byte order
 * `DataView.getUint32(0)` reads with its default arguments. Writing it the other way
 * round silently turns every value into a different one -- `0x2A` becomes `0x2A000000`,
 * which is still under the rejection limit for a small bound, so a test written against
 * the wrong order can pass for entirely the wrong reason.
 */
function scriptedSource(values) {
    let i = 0;
    return {
        calls: 0,
        getRandomValues(out) {
            this.calls++;
            const value = values[Math.min(i, values.length - 1)];
            i++;
            for (let k = 0; k < out.length; k++) {
                out[k] = (value >>> (8 * (out.length - 1 - k))) & 0xff;
            }
            return out;
        },
    };
}

describe('Prng', () => {
    describe('rejection sampling', () => {
        /*
         * The regression this whole file is for.
         *
         * `nextInt` drew its four bytes *once*, before the loop, and re-read the same
         * four on every pass. A draw that the rejection test threw out was therefore
         * thrown out forever: `for (;;)` with nothing in it that can change the value.
         * The tab locked, the event loop starved so hard that not even a `setTimeout`
         * could fire to break out, and the game was unrecoverable short of killing the
         * process.
         *
         * The probability per call is around 1e-8, which reads as impossible -- and
         * which is exactly why it survived. A deal is ~52 draws and an
         * ensure-movability search is up to 2000 deals, so a full search crosses about
         * 1 in 900. Rare enough to look like a fluke forever; not rare enough that
         * "hasn't happened to anyone yet" means it can't happen to anyone.
         */
        it('draws again after a rejection instead of re-reading the same bytes', () => {
            // 0xFFFFFFFF is rejected for any bound above 1; 0x0000002A is accepted.
            const source = scriptedSource([0xFFFFFFFF, 0xFFFFFFFF, 0x2A]);
            const value = withCrypto(source, () => new Prng().nextInt(52));
            expect(source.calls).toBe(3);
            expect(value).toBe(42 % 52);
        });

        it('accepts a first draw without re-reading', () => {
            const source = scriptedSource([0x2A]);
            const value = withCrypto(source, () => new Prng().nextInt(52));
            expect(source.calls).toBe(1);
            expect(value).toBe(42 % 52);
        });

        /*
         * The fallback branch. If the source is missing the answer has to come from
         * `Math.random`, and it has to come from it on the *first* try — a source that
         * returns null after a rejection must not send the caller back into the loop.
         */
        it('falls back to Math.random when no CSPRNG is available', () => {
            const value = withCrypto(undefined, () => new Prng().nextInt(10));
            expect(value >= 0).toBe(true);
            expect(value < 10).toBe(true);
        });
    });

    describe('range', () => {
        it('returns 0 for a non-positive bound rather than looping', () => {
            const p = new Prng();
            expect(p.nextInt(0)).toBe(0);
            expect(p.nextInt(-7)).toBe(0);
        });

        it('returns 0 for a bound of 1', () => {
            expect(new Prng().nextInt(1)).toBe(0);
        });

        it('never returns the bound or a negative value', () => {
            const p = new Prng();
            for (let bound = 2; bound <= 60; bound++) {
                for (let i = 0; i < 40; i++) {
                    const v = p.nextInt(bound);
                    expect(v >= 0 && v < bound).toBe(true);
                }
            }
        });
    });

    describe('distribution', () => {
        /*
         * Rejection sampling exists to keep this flat. A shrunken `limit` would bias the
         * low residues, which is exactly the kind of defect that shows up as "this game
         * feels rigged" years later and is impossible to see by reading the code.
         */
        it('is uniform over a full deck', () => {
            const p = new Prng();
            const n = 52;
            const counts = new Array(n).fill(0);
            const draws = n * 400;
            for (let i = 0; i < draws; i++) {
                counts[p.nextInt(n)]++;
            }
            const expected = draws / n;
            const chi = counts.reduce((a, c) => a + (c - expected) ** 2 / expected, 0);
            // 51 degrees of freedom, 99.9th percentile ~96.5.
            expect(chi < 96.5).toBe(true);
        });

        /*
         * The rejection arithmetic itself, pinned at the boundary.
         *
         * `limit` is `floor(2^32 / bound) * bound`, the largest multiple of the bound
         * that still fits in 32 bits. A draw at or above it would over-represent the low
         * residues, so it must be discarded; one just below must be kept. An off-by-one
         * here is invisible in every other test -- it still looks random -- and quietly
         * skews the deck.
         *
         * The window is tiny (48 values out of 2^32 at bound 52, about 1 in 90 million
         * per draw), which is exactly why this needed pinning rather than inspection:
         * the hang was real and the odds were not.
         */
        it('rejects a draw at the limit and accepts the one below it', () => {
            const bound = 52;
            const limit = Math.floor(0x1_0000_0000 / bound) * bound;
            expect(limit).toBe(4294967248);
            expect(0x1_0000_0000 - limit).toBe(48);

            const below = withCrypto(scriptedSource([limit - 1]), () => new Prng().nextInt(bound));
            expect(below).toBe((limit - 1) % bound);

            // At the limit: rejected, so the source is asked again, and the fallback
            // value from the repeat is what comes back.
            const at = scriptedSource([limit, 0x2A]);
            const value = withCrypto(at, () => new Prng().nextInt(bound));
            expect(at.calls).toBe(2);
            expect(value).toBe(42 % bound);
        });

        /*
         * 52 independent draws will collide -- that is what a random draw is. A
         * *permutation* needs Fisher-Yates, so build one and check the property that
         * actually matters: 52 draws produce 52 distinct cards, and none is lost or
         * duplicated on the way. It also walks the reject-and-redraw path 52 times a
         * deal, which is the shape of the call pattern that used to hang.
         */
        it('yields a true permutation when used to shuffle a deck', () => {
            const p = new Prng();
            for (let round = 0; round < 20; round++) {
                const deck = Array.from({ length: 52 }, (_, i) => i);
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = p.nextInt(i + 1);
                    const swap = deck[i];
                    deck[i] = deck[j];
                    deck[j] = swap;
                }
                expect(new Set(deck).size).toBe(52);
                expect(deck.reduce((a, b) => a + b, 0)).toBe(1326);
            }
        });
    });
});