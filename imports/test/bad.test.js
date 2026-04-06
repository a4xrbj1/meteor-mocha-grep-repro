/**
 * This file simulates a test with a load-time side effect.
 *
 * In real projects, this would be a heavy test file that imports
 * infrastructure (BullMQ workers, MongoDB sessions, S3 clients,
 * cross-service fixtures) that fails without running services.
 *
 * The key point: this code runs when the FILE IS LOADED, which
 * happens BEFORE Mocha's grep filter is applied during run().
 * Setting MOCHA_GREP to exclude "bad suite" does NOT prevent
 * this file from being evaluated.
 */

// ---- LOAD-TIME SIDE EFFECT ----
// This throws during module evaluation, before any describe/it
// blocks are registered, and long before mochaInstance.grep()
// or mochaInstance.run() are called.
console.error(
    '\n>>> bad.test.js is being LOADED even though MOCHA_GREP ' +
    'should have excluded it. <<<\n'
);

throw new Error(
    'LOAD-TIME SIDE EFFECT: bad.test.js was evaluated at load time. ' +
    'MOCHA_GREP filters at run() time, not at load time. ' +
    'This file should not have been loaded at all.'
);

// This code is unreachable, but shows the intent:
// these tests should have been filtered out by grep.
describe('bad suite', function () {
    it('never reaches here', function () {
        throw new Error('should not run');
    });
});
