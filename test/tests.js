/*
 * Seclusa Games — card engine test page controller.
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * Registers every suite, renders the results and puts the summary in the tab title.
 * Kept out of tests.html because `script-src 'self'` forbids an inline module.
 */

import { runAll } from './runner.js';

    /*
     * Suites are imported for their registration side effect: each file calls
     * describe()/it() as it loads.
     *
     * A failure here used to be invisible. A module that throws while loading — a
     * syntax error, or a call outside a describe() that the runner cannot attribute —
     * rejects this import chain, `run()` is never reached, and the page sits on
     * "Running…" with no error, no count and no way to tell that anything went wrong.
     * That is exactly how a broken suite looks identical to a slow one.
     *
     * So each import is isolated, and a suite that will not load is reported as a
     * failure instead of silently taking the run with it.
     */
    const SUITES = [
        './DeckShuffle.test.js',
        './DifficultyPolicy.test.js',
        './prng.test.js',
        './theme.test.js',
        './Timer.test.js',
        './storage.test.js',
        './settingsScreen.test.js',
        './themeGame.test.js',
        './klondike.test.js',
        './GameManagerInput.test.js',
    ];

    const loadFailures = [];

    for (const path of SUITES) {
        try {
            await import(path);
        } catch (err) {
            loadFailures.push({ path, message: (err && err.message) || String(err) });
        }
    }

    const summary = document.getElementById('summary');
    const results = document.getElementById('results');
    const filterBox = document.getElementById('filter');

    function render(report) {
    results.textContent = '';
    let suite = null;

    for (const r of report.results) {
    if (r.suite !== suite) {
    suite = r.suite;
    const h = document.createElement('div');
    h.className = 'suite';
    h.textContent = suite;
    results.append(h);
    }

    const row = document.createElement('div');
    row.className = `test ${r.ok ? 'ok' : 'bad'}`;

    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = r.ok ? '✓' : '✗';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = r.name;
    const ms = document.createElement('span');
    ms.className = 'ms';
    ms.textContent = `${r.ms.toFixed(1)}ms`;

    row.append(mark, name, ms);
    results.append(row);

    if (!r.ok) {
    const err = document.createElement('div');
    err.className = 'err';
    err.textContent = r.error;
    results.append(err);
    }
    }

    summary.textContent = '';
    const pass = document.createElement('span');
    pass.className = 'count pass';
    pass.textContent = `${report.passed} passed`;
    const fail = document.createElement('span');
    fail.className = `count ${report.failed ? 'fail' : ''}`;
    fail.textContent = `${report.failed} failed`;
    const total = document.createElement('span');
    total.className = 'total';
    total.textContent = `of ${report.total}`;
    summary.append(pass, fail, total);

    // The summary is also in the tab title, so a headless run still reports.
    document.title = `${report.failed ? 'FAIL' : 'PASS'} — ${report.passed}/${report.total} tests`;
    }

    async function run() {
    const filter = filterBox.value.trim();
    summary.textContent = 'Running…';

    if (loadFailures.length) {
    results.textContent = '';
    for (const f of loadFailures) {
    const h = document.createElement('div');
    h.className = 'suite';
    h.textContent = f.path;
    const e = document.createElement('div');
    e.className = 'err';
    e.textContent = 'Suite failed to load: ' + f.message;
    results.append(h, e);
    }
    summary.textContent = '';
    const fail = document.createElement('span');
    fail.className = 'count fail';
    fail.textContent = `${loadFailures.length} suite(s) failed to load`;
    summary.append(fail);
    document.title = 'FAIL — suite load error';
    window.__results = loadFailures.map((f) => ({
    suite: f.path,
    name: 'suite load',
    ok: false,
    error: f.message,
    }));
    return;
    }

    const report = await runAll(filter);
    render(report);
    // Published so a headless run can read what failed without scraping the
    // rendered page. A failed run that reports only a count is a report you
    // cannot act on.
    window.__results = report.results;
    }

    filterBox.addEventListener('input', run);
    document.getElementById('rerun').addEventListener('click', run);

    run();
