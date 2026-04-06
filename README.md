# Minimal reproduction: MOCHA_GREP doesn't prevent test file loading

**Forum thread:** https://forums.meteor.com/t/the-mocha-grep-env-var-isnt-working-with-this-meteor-3-4-rspack-setup/64516

## The issue

`MOCHA_GREP` filters which tests Mocha **runs**, but it cannot prevent test files
from being **loaded and evaluated**. When `mainModule` is set in `package.json`
without a `testModule`, Meteor eagerly loads ALL `*.test.js` files at startup.
Files with load-time side effects (infrastructure imports, DB connections, service
dependencies) will fail before Mocha's grep filter is ever applied.

This is **not an rspack issue**. It is a structural limitation of how `MOCHA_GREP`
interacts with Meteor's test file discovery.

## Reproduce

```bash
meteor npm install

# Step 1: Run ALL tests (both good.test.js and bad.test.js)
# Expected: fails — bad.test.js throws on load
npm test

# Step 2: Run with MOCHA_GREP targeting only "good suite"
# Expected: should skip bad.test.js entirely
# Actual:   STILL FAILS — bad.test.js is loaded and throws before grep runs
npm run test:grep
```

## What happens

```
Meteor test startup
  ├─ Compiler: isTestFilePath("imports/test/good.test.js") → true → EAGER
  ├─ Compiler: isTestFilePath("imports/test/bad.test.js")  → true → EAGER
  │
  ├─ Load good.test.js → describe('good suite') registered ✓
  ├─ Load bad.test.js  → throw Error("LOAD-TIME SIDE EFFECT...") ✗ CRASH
  │                       ^^^^ grep cannot prevent this
  │
  └─ meteortesting:mocha start() never reached
      └─ mochaInstance.grep("good suite")  ← never called
      └─ mochaInstance.run()               ← never called
```

## Why nachocodoner can't reproduce it

The default Meteor 3.4 skeleton includes `"testModule": "tests/main.js"` in
`package.json`. With `testModule` set, only the declared entry point is eagerly
loaded — other `*.test.js` files are lazy and must be explicitly imported.

This repo removes `testModule` to match the configuration of projects that
predate the skeleton default or intentionally omit it (e.g. because they use
`mainModule` with eager test file discovery).

## The fix

### Option A: Add `testModule` to package.json (workaround — works today)

```json
{
  "meteor": {
    "mainModule": {
      "client": "client/main.js",
      "server": "server/main.js"
    },
    "testModule": "tests/main.js"
  }
}
```

Then in `tests/main.js`, explicitly import only the test files you want:
```js
import '../imports/test/good.test.js';
// Don't import bad.test.js → it never loads
```

This gives file-level control that `MOCHA_GREP` structurally cannot provide.

### Option B: Make `MOCHA_GREP` influence file loading (feature request)

`MOCHA_GREP` could be read earlier in the pipeline — during Meteor's module
resolution in `compiler-plugin.js` `_isLazy()` — to skip loading test files
whose names don't match the pattern. This would require changes to Meteor core
or to `meteortesting:mocha-core`.

## Key files in this repo

| File | Purpose |
|---|---|
| `imports/test/good.test.js` | Clean test — grep should select this |
| `imports/test/bad.test.js` | Throws on load — grep should exclude this but can't |
| `package.json` | Has `mainModule`, deliberately NO `testModule` |
| `server/main.js` | Minimal server entry |

## Configuration that matters

```json
"meteor": {
  "mainModule": {
    "client": "client/main.js",
    "server": "server/main.js"
  }
  // NOTE: no "testModule" — this is the trigger
}
```

Without `testModule`, Meteor's `_isLazy()` in `compiler-plugin.js` calls
`isTestFilePath()` on every file. Any file matching `*.test.*` / `*.spec.*`
is eagerly loaded, regardless of `mainModule` restrictions and regardless
of any runtime grep filter.

## Environment

- Meteor 3.4
- meteortesting:mocha 3.3.0
- meteortesting:mocha-core 8.2.0
- Node.js (Meteor-bundled)
