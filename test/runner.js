/*
 * Seclusa Games — card engine test runner.
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * A ~120 line stand-in for the `describe`/`it`/`expect` trio the TypeScript port used with
 * vitest. There is no test runner in this app by design, so the suites below load the real
 * engine and assert against real behaviour in a real browser, print pass/fail to the page
 * and set `document.title` to a summary.
 *
 * Derived from the vitest suites in `Solitaire/pwa/test/`; test names are kept identical
 * where they already existed.
 */

const suites = [];
let current = null;

export function describe(name, fn) {
    current = { name, tests: [], before: [], after: [] };
    suites.push(current);
    fn();
    current = null;
}

export function it(name, fn) {
    if (!current) {
        throw new Error(`it("${name}") outside a describe()`);
    }
    current.tests.push({ name, fn });
}

export function beforeEach(fn) {
    current.before.push(fn);
}

export function afterEach(fn) {
    current.after.push(fn);
}

function fail(message) {
    throw new Error(message);
}

function stringify(value) {
    if (typeof value === 'string') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stringify).join(', ')}]`;
    if (value && typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
}

function check(ok, negated, message) {
    if (negated ? ok : !ok) {
        fail(negated ? `expected NOT ${message}` : `expected ${message}`);
    }
}

function buildExpect(actual, negated) {
    return {
        toBe(expected) {
            check(Object.is(actual, expected), negated, `${stringify(expected)} but got ${stringify(actual)}`);
        },
        toEqual(expected) {
            check(deepEqual(actual, expected), negated, `${stringify(expected)} but got ${stringify(actual)}`);
        },
        toBeTruthy() {
            check(!!actual, negated, `truthy but got ${stringify(actual)}`);
        },
        toBeFalsy() {
            check(!actual, negated, `falsy but got ${stringify(actual)}`);
        },
        toBeNull() {
            check(actual === null, negated, `null but got ${stringify(actual)}`);
        },
        toBeGreaterThan(n) {
            check(actual > n, negated, `${stringify(actual)} > ${stringify(n)}`);
        },
        toBeGreaterThanOrEqual(n) {
            check(actual >= n, negated, `${stringify(actual)} >= ${stringify(n)}`);
        },
        toBeLessThan(n) {
            check(actual < n, negated, `${stringify(actual)} < ${stringify(n)}`);
        },
        toBeLessThanOrEqual(n) {
            check(actual <= n, negated, `${stringify(actual)} <= ${stringify(n)}`);
        },
        toContain(needle) {
            const has = typeof actual === 'string'
                ? actual.includes(needle)
                : Array.from(actual).includes(needle);
            check(has, negated, `${stringify(actual)} to contain ${stringify(needle)}`);
        },
        toMatch(re) {
            check(re.test(String(actual)), negated, `${stringify(actual)} to match ${re}`);
        },
        toThrow() {
            let threw = false;
            try {
                actual();
            } catch {
                threw = true;
            }
            check(threw, negated, 'the call to throw');
        },
    };
}

export const expect = (actual) => ({
    ...buildExpect(actual, false),
    not: buildExpect(actual, true),
});

/** Runs every registered suite and returns `{passed, failed, results}`. */
export async function runAll(filter) {
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const suite of suites) {
        for (const test of suite.tests) {
            const full = `${suite.name} > ${test.name}`;
            if (filter && !full.toLowerCase().includes(filter.toLowerCase())) continue;
            const t0 = performance.now();
            try {
                for (const fn of suite.before) await fn();
                await test.fn();
                for (const fn of suite.after) {
                    try {
                        await fn();
                    } catch {
                        /* a failing teardown must not mask the result */
                    }
                }
                passed++;
                results.push({ suite: suite.name, name: test.name, ok: true, ms: performance.now() - t0 });
            } catch (err) {
                failed++;
                results.push({
                    suite: suite.name,
                    name: test.name,
                    ok: false,
                    error: err && err.message ? err.message : String(err),
                    ms: performance.now() - t0,
                });
            }
        }
    }

    return { passed, failed, results, total: passed + failed };
}