import test from 'node:test'
import assert from 'node:assert/strict'
import { closeStreamOnce } from './close-once'

test('closeStreamOnce calls controller.close once', () => {
  let closedCount = 0
  const controller = {
    close: () => {
      closedCount++
    },
  }
  closeStreamOnce(controller as unknown as ReadableStreamDefaultController)
  closeStreamOnce(controller as unknown as ReadableStreamDefaultController)
  closeStreamOnce(controller as unknown as ReadableStreamDefaultController)
  assert.equal(closedCount, 1)
})

test('closeStreamOnce swallows "Invalid state" errors', () => {
  const controller = {
    close: () => {
      throw new TypeError('Invalid state: Controller is already closed')
    },
  }
  // Must not throw
  closeStreamOnce(controller as unknown as ReadableStreamDefaultController)
})

test('closeStreamOnce rethrows unexpected errors', () => {
  const controller = {
    close: () => {
      throw new Error('Something else')
    },
  }
  assert.throws(
    () => closeStreamOnce(controller as unknown as ReadableStreamDefaultController),
    /Something else/
  )
})
