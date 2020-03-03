'use strict'

/*
 * TODO:
 *  - Use a testing suite.
 */

require('../make-promise-race-safe')(Promise)

const reject1 = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('reject1'))
  }, 1000)
})

const reject2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('reject2'))
  }, 5000)
}).catch(() => {
  // reject2 is handled
})

Promise.race([
  Promise.resolve('resolve1'),
  Promise.reject(new Error('reject3')),
  reject1,
  reject2
])
