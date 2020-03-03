'use strict'

const argv = require('minimist')(process.argv.slice(2))

// Not pre-calling the GC works against standard Promises, in favor of the second (patched) run.
if (!global || !global.gc) {
  throw new Error('Benchmark must be run with --expose-gc')
}

const { performance, PerformanceObserver } = require('perf_hooks')

// All promises reject immediately.
const NUM_RACES = argv.races || 250 * 1000
// Per X% of the races, we'll log a message.
const LOG_RACES_PER_X_PCT = 10
const SLEEP_AFTER_PHASE_MS = 2000
// Explicit garbage collection call after every X races.
const GC_PER_X_RACES = argv['gc-per-x-races'] || 1000

// Function call has overhead but hides the error spam & doesn't end the process.
process.on('unhandledRejection', function onUnhandledRejection () {
  //
})

function sleep (ms) {
  return new Promise((resolve, reject) => {
    if (ms === 0) return resolve()

    setTimeout(() => {
      return resolve()
    }, ms)
  })
}

function createImmediatePromise () {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      return resolve()
    })
  })
}

async function gc () {
  global.gc(true)
  // createImmediatePromise may have no significant effect in our case, but it still feels like an official starting line. 🏁
  await createImmediatePromise()
}

async function runRace (label, i) {
  performance.mark(`${label}-promise-start`)

  // Create Promises inside Promise.race.
  await Promise.race([
    // First resolve hides the following rejections.
    Promise.resolve(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i),
    Promise.reject(i)
  ])

  performance.mark(`${label}-promise-end`)
  performance.measure(label, `${label}-promise-start`, `${label}-promise-end`)
}

async function testPromises (label) {
  const logPerXRaces = Math.floor(NUM_RACES / 100 * LOG_RACES_PER_X_PCT)

  for (let i = 0; i < NUM_RACES; i++) {
    if (i % logPerXRaces === 0) {
      console.log(`\tRunning race ${i.toLocaleString()}...`)
    }

    await runRace(label, i)

    if (i % GC_PER_X_RACES === 0) {
      await gc()
    }
  }
}

async function start () {
  const timers = {
    standard: {
      numRaces: 0,
      durationMs: 0
    },
    patched: {
      numRaces: 0,
      durationMs: 0
    }
  }

  const perfObserver = new PerformanceObserver((items) => {
    const entry = items.getEntries()[0]
    const timer = timers[entry.name]

    timer.numRaces++
    timer.durationMs += entry.duration
    performance.clearMarks()
  })
  perfObserver.observe({ entryTypes: ['measure'] })

  console.log(`Starting with clean slate for ${NUM_RACES} races, GC per ${GC_PER_X_RACES} races...`)
  await gc()
  await sleep(SLEEP_AFTER_PHASE_MS)

  console.log('\nBenchmarking standard Promises...')
  await testPromises('standard')
  console.log('Done.')

  // Promise rejection is made visible.
  console.log('\nPatching Promises...')
  require('../make-promise-race-safe')(Promise)

  console.log('Explicit garbage collection before next test...')
  await gc()
  await sleep(SLEEP_AFTER_PHASE_MS)

  console.log('\nBenchmarking patched Promises...')
  await testPromises('patched')
  console.log('Done.')

  console.log('\nCleaning up...')
  await gc()

  perfObserver.disconnect()
  console.log()
  console.table(timers)
  const diffPct = (timers.patched.durationMs - timers.standard.durationMs) / timers.standard.durationMs * 100
  const numPromises = NUM_RACES * 10
  console.log(`\nMeasured a ${diffPct.toFixed(2)}% performance difference over ${NUM_RACES.toLocaleString()} races and ${numPromises.toLocaleString()} Promises.`)
}

start()
