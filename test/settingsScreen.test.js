/*
 * Seclusa Games — the settings screen's judgement calls.
 *
 * One suite, and it exists for one reason. The screen has to decide whether a row is live
 * or greyed out, and doing that means answering a question the game already answers
 * somewhere else. `minMovesIsUsed()` was the first attempt at restating that rule in the
 * UI layer, and it was wrong on the common case: it treated the expert "Ensure movability"
 * toggle as the gate on every difficulty, where the real policy overrides the toggle
 * outright on Hard and on Easy, and overrides it in the *other* direction on Medium, where
 * movability is always on. The result was a row greyed out by default on a fresh install,
 * on a setting that was being read.
 *
 * So these assert the screen agrees with `DifficultyPolicy` rather than restating it a
 * third time, and they go through the real `SettingsScreen` because the bug was in the
 * wiring, not in the policy module -- the policy has its own tests.
 */

import { describe, expect, it } from './runner.js';

import { SettingsScreen } from '../cards/engine/ui/SettingsScreen.js';
import { EASY, MEDIUM, HARD, isEnsureMovabilityEnabled } from '../cards/engine/game/DifficultyPolicy.js';

/**
 * A real `SettingsScreen` over a detached mount.
 *
 * Real rather than stubbed because the thing under test is a method that reads three live
 * preferences and decides a string. The bitmaps are absent, which is fine: nothing on the
 * Rules section asks for one, and `render()` only reads what the rows return.
 */
function makeSettingsScreen() {
    const bitmaps = {
        get: () => null,
        getCardPreview2Cell: () => ({}),
        getCardBackCell: () => ({}),
    };
    const host = { close() {}, onChanged() {}, openSettings() {} };
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const screen = new SettingsScreen(mount, bitmaps, host);
    return { screen, prefs: screen.prefs };
}

/**
 * The independent truth: is the expert minimum-moves value read at all?
 *
 * Written from the policy's own rules rather than from `minMovesState()`, so the test
 * fails if the screen drifts rather than if the screen and the test agree on a mistake.
 * `isEnsureMovabilityEnabled` is called directly rather than inferred, because Hard is the
 * case where the two would otherwise be easy to confuse.
 */
function policyReadsMinMoves(difficulty, expertToggle) {
    if (!isEnsureMovabilityEnabled(difficulty, expertToggle)) {
        return false;
    }
    // Easy replaces the number with a hint-bot win, which no player choice can reach.
    return difficulty !== EASY;
}

describe('Settings — the minimum-moves row against the real policy', () => {
    it('is live on Medium, because movability is always on there', () => {
        const { screen, prefs } = makeSettingsScreen();
        prefs.saveDifficulty(MEDIUM);
        // Even with the expert toggle off, which is the default on a fresh install.
        prefs.saveEnsureMovability(false);

        expect(screen.minMovesState().used).toBe(true);
    });

    it('is greyed out on Hard, where movability is off whatever the toggle says', () => {
        const { screen, prefs } = makeSettingsScreen();
        for (const toggle of [false, true]) {
            prefs.saveDifficulty(HARD);
            prefs.saveEnsureMovability(toggle);
            expect(screen.minMovesState().used).toBe(false);
        }
    });

    it('is greyed out on Easy, where the win rule replaces the number', () => {
        const { screen, prefs } = makeSettingsScreen();
        for (const toggle of [false, true]) {
            prefs.saveDifficulty(EASY);
            prefs.saveEnsureMovability(toggle);
            expect(screen.minMovesState().used).toBe(false);
        }
    });

    it('always names Difficulty as the reason, and never blames the toggle', () => {
        const { screen, prefs } = makeSettingsScreen();
        for (const difficulty of [EASY, HARD]) {
            for (const toggle of [false, true]) {
                prefs.saveDifficulty(difficulty);
                prefs.saveEnsureMovability(toggle);
                const state = screen.minMovesState();
                expect(state.why).toBeTruthy();
                expect(state.why).toContain('Deal difficulty');
            }
        }
    });

    it('agrees with the policy on every combination', () => {
        const { screen, prefs } = makeSettingsScreen();
        for (const difficulty of [EASY, MEDIUM, HARD]) {
            for (const toggle of [false, true]) {
                prefs.saveDifficulty(difficulty);
                prefs.saveEnsureMovability(toggle);
                prefs.saveEnsureMovabilityMinMoves(10);
                expect(`${difficulty}/${toggle}=${screen.minMovesState().used}`)
                    .toBe(`${difficulty}/${toggle}=${policyReadsMinMoves(difficulty, toggle)}`);
            }
        }
    });

    it('has no reason string when the row is live', () => {
        const { screen, prefs } = makeSettingsScreen();
        prefs.saveDifficulty(MEDIUM);
        prefs.saveEnsureMovability(true);
        expect(screen.minMovesState().why).toBe('');
    });
});

describe('Settings — dependent rows follow their parent', () => {
    /** The row definition for a key, read through the screen's own `sections()`. */
    function row(screen, sectionKey, rowKey) {
        return screen.sections()
            .find((section) => section.key === sectionKey)
            .rows.find((candidate) => candidate.key === rowKey);
    }

    it('greys the recycle count only when recycles are unlimited', () => {
        const { screen, prefs } = makeSettingsScreen();
        const recycles = row(screen, 'rules', 'recycles');
        prefs.saveKlondikeLimitedRecycles(false);
        expect(recycles.enabledWhen()).toBe(false);
        prefs.saveKlondikeLimitedRecycles(true);
        expect(recycles.enabledWhen()).toBe(true);
    });

    it('greys the foundation-first row only when both its parents are on', () => {
        const { screen, prefs } = makeSettingsScreen();
        const foundationFirst = row(screen, 'controls', 'foundationFirst');
        prefs.saveDoubleTapEnabled(false);
        prefs.saveDoubleTapAllCards(false);
        expect(foundationFirst.enabledWhen()).toBe(false);
        prefs.saveDoubleTapEnabled(true);
        expect(foundationFirst.enabledWhen()).toBe(false);
        prefs.saveDoubleTapAllCards(true);
        expect(foundationFirst.enabledWhen()).toBe(true);
    });

    it('names both parents in the reason, since either one greys the row', () => {
        const { screen } = makeSettingsScreen();
        const why = row(screen, 'controls', 'foundationFirst').whyNot;
        expect(why).toContain('Double-tap to move');
        expect(why).toContain('Move the whole build');
    });
});