/*
 * Copyright TO TYPESCRIPT PORT — see the ported files for the original
 * Copyright (C) 2016  Tobias Bielefeld (GPL-3.0).
 *
 * The Android app shuffles with `java.security.SecureRandom`. The port uses the Web Crypto
 * CSPRNG when available and falls back to `Math.random()` only when it is not (e.g. some
 * non-secure test contexts). Same distribution guarantees, same API surface.
 
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step).
 *
 * Derived from the TypeScript port of the Android app by Tobias Bielefeld
 * (GPL-3.0), which is itself derived from the original Java sources in
 * `Solitaire/app/src/main/java/de/tobiasbielefeld/solitaire/`. Type
 * annotations are dropped; naming, structure, comments and behaviour are
 * unchanged. The GPL-3.0 notice above must survive every further copy.
*/
function cryptoBytes(length) {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
        const out = new Uint8Array(length);
        c.getRandomValues(out);
        return out;
    }
    return null;
}
export class Prng {
    /** Uniform integer in [0, bound). Mirrors `SecureRandom.nextInt(bound)`. */
    nextInt(bound) {
        if (bound <= 0) {
            return 0;
        }
        // Rejection sampling keeps the distribution uniform: discard any draw that would
        // bias the low residues and take another.
        const limit = Math.floor(0x1_0000_0000 / bound) * bound;
        for (;;) {
            /*
             * The bytes are drawn INSIDE the loop, and that is the whole fix.
             *
             * Drawing them once outside and re-reading the same four bytes on every pass
             * re-tests the identical rejected value forever: `for (;;)` with no code path
             * that can ever change `value`. It is not slow, it is a hard hang — the tab
             * locks so hard that not even a timer callback can fire to break out, nothing
             * is saved, and only killing the process recovers it.
             *
             * The window is 48 values out of 2^32 at bound 52, about 1 in 90 million per
             * draw, which is why this survived: a deal is ~52 draws and a
             * ensure-movability search is up to 2000 deals, so a full search crosses
             * roughly 1 in 900. Rare enough to look like a fluke forever, and not rare
             * enough that it never reaches a player.
             */
            const bytes = cryptoBytes(4);
            if (bytes === null) {
                return Math.floor(Math.random() * bound);
            }
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const value = view.getUint32(0);
            if (value < limit) {
                return value % bound;
            }
        }
    }
}
export const prng = new Prng();
