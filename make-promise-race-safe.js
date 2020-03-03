'use strict'

// const getPromiseDetails = process.binding('util').getPromiseDetails || null;

/*
 * Notes:
 *  - Adding multiple catch handlers to a rejecting Promise only triggers the first (nearest) catch handler.
 *
 * TODO:
 *  - Allow binding Promise to the emitted event.
 *  - In one case, creating a Promise outside of Promise.race() that later rejects caused Node.js to
 *          emit unhandledRejection even when we attached a .catch() handler, triggering double notices.
 *          Unfortunately I couldn't reproduce the issue.
 *          An example that once caused it is examples/multiple-scenarios.js.
 */

function throwUnhandledRejection (reason) {
  // From https://github.com/nodejs/node/blob/c9b93e234454322ac0b7a6cd29d394f428f3e37d/lib/internal/process/promises.js#L226
  let message =
    '[make-promise-race-safe]: ' +
    'This error originated either by ' +
    'throwing inside of an async function without a catch block, ' +
    'or by rejecting a promise which was not handled with .catch().'

  if (reason) {
    message +=
      ' The promise rejected with the reason ' +
      `"${reason}".`
  }

  const handled = process.emit('unhandledRejection', message)

  if (!handled) {
    message =
      '[make-promise-race-safe]: ' +
      'Unhandled promise rejection in Promise.race. This error originated either by ' +
      'throwing inside of an async function without a catch block, ' +
      'or by rejecting a promise which was not handled with .catch(). ' +
      'To terminate the node process on unhandled promise ' +
      'rejection, use the CLI flag `--unhandled-rejections=strict` (see ' +
      'https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). '

    if (reason) {
      message +=
        ' The promise rejected with the reason ' +
        `"${reason}".`
    }

    const tmp = Error.stackTraceLimit
    Error.stackTraceLimit = 0
    const warning = new Error(message)
    Error.stackTraceLimit = tmp
    warning.name = 'UnhandledPromiseRejectionWarning'

    process.emitWarning(warning)
    process.emitWarning(
      '[make-promise-race-safe]: ' +
      'Unhandled promise rejections are deprecated. In the future, ' +
      'promise rejections that are not handled will terminate the ' +
      'Node.js process with a non-zero exit code.',
      'DeprecationWarning', 'DEP0018')
  }
}

function createRaceReplacement (race) {
  return function raceReplacement (promises) {
    for (const promise of promises) {
      // const [ state, result ] = getPromiseDetails(promise);
      promise.catch(throwUnhandledRejection)
    }

    return race.call(this, ...arguments)
  }
}

module.exports = function makePromiseRaceSafe (promise) {
  if (!promise) {
    promise = Promise
  }

  if (!promise) {
    throw new Error('Missing Promise library')
  }

  /* if (!getPromiseDetails) {
      throw new Error("Can't fetch process.binding('util').getPromiseDetails to inspect Promise states.");
  } */

  const _race = promise.race || promise.prototype.race
  Promise.race = createRaceReplacement(_race)
}
