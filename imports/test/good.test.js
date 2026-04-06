/**
 * A clean, self-contained test suite with no side effects on load.
 * MOCHA_GREP="good suite" should run ONLY this file's tests.
 */
describe('good suite', function () {
    it('passes trivially', function () {
        if (1 + 1 !== 2) {
            throw new Error('math is broken');
        }
    });

    it('also passes', function () {
        if (typeof Meteor === 'undefined') {
            throw new Error('Meteor not defined');
        }
    });
});
