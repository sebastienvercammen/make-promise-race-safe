'use strict'

// Promise rejection will be invisible.
Promise.race([Promise.resolve('yes'), Promise.reject(new Error('#1-invisible-rejection'))])

// Promise rejection is made visible..
require('../make-promise-race-safe')(Promise, {
  allowOverhead: true
})

Promise.race([Promise.resolve('yes'), Promise.reject(new Error('#2-visible-rejection'))])
