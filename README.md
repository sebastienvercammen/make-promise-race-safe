# make-promise-race-safe   [![Build Status](https://travis-ci.org/sebastienvercammen/make-promise-race-safe.svg?branch=master)](https://travis-ci.org/sebastienvercammen/make-promise-race-safe)

A Node.js module to make the use of `Promise.race()` safe. Supplementary to [make-promises-safe](https://github.com/mcollina/make-promises-safe/) by [Matteo Collina](https://github.com/mcollina).

It implements the deprecation [DEP0018][unhandled] of Node.js in versions 6+ for Promise rejections that are (unknowingly, unintentionally) concealed by `Promise.race()`. Using promises without this module might cause file descriptor and memory leaks.

**It is important that this module is only used in top-level program code, not in reusable modules!**

## The Problem

I happily refer you to the [original documentation about "The Problem"](https://github.com/mcollina/make-promises-safe#the-problem) by [Matteo Collina](https://github.com/mcollina).

This module patches `Promise.race` to emit `unhandledRejection` when a Promise without error handler rejects in `Promise.race`, making the rejection visible again.

## The Solution

`make-promise-race-safe` + [`make-promises-safe`](https://github.com/mcollina/make-promises-safe)

## Install

```
npm install make-promise-race-safe --save-prod
```

## Usage

Adding error handlers to all promises may have an overhead cost. Benchmark the overhead in your environment before using it in production.

```js
'use strict';

// Promise rejection will be invisible.
Promise.race([
    Promise.resolve('ok'),
    Promise.reject('#1-invisible-rejection')
]);

// Promise rejection is made visible. The same events are emitted as Node.js core:
// unhandledRejection degrades to UnhandledPromiseRejectionWarning + DEP0018.
require('make-promise-race-safe');

Promise.race([
    Promise.resolve('ok'),
    Promise.reject('#2-visible-rejection')
]);
```

Non-standard Promise libraries with a `.race()` method can also be patched if they're affected:
```js
const MyPromise = require('some-promise-library');
require('make-promise-race-safe')(MyPromise);
```

### as a preloader

You can add this behavior to any Node.js application by using it as a preloader:

```
node -r make-promise-race-safe server.js
```

## Benchmark

The overhead is only for Promises used with `Promise.race`. All other Promises are unaffected.

In our tests, the average overhead was ~9%:
```
┌──────────┬──────────┬────────────────────┐
│ (index)  │ numRaces │     durationMs     │
├──────────┼──────────┼────────────────────┤
│ standard │ 1000000  │ 10108.004952966228 │
│ patched  │ 1000000  │ 11013.985727012361 │
└──────────┴──────────┴────────────────────┘

Measured a 8.96% performance difference over 1,000,000 races and 10,000,000 Promises.
```

### To run the benchmark yourself
```sh
npm run bench -- --races=250000 --gc-per-x-races=1000
```

### Notes

* We call the garbage collector between sets of races, otherwise the executing code gets affected significantly.
* Benchmark timing is tied to the scope of the race - the GC that runs afterwards is not included in the timing.
* `--gc-per-x-races` will affect your benchmark results if set to an inappropriate value.

Run the benchmark enough times to get significant results.

## Feedback

Found something wrong or do you have any feedback? Let me know via the Issue tracker on GitHub, I'd love to learn what I can improve.

## License

MIT

[unhandled]: https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections
