import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import { getTaskRecoveryAction } from './task-recovery.ts'

const now = new Date('2026-04-10T12:00:00.000Z').getTime()

test('kicks stale pending tasks without zombie recovery', () => {
  assert.equal(
    getTaskRecoveryAction({
      status: 'pending',
      createdAt: new Date(now - 16_000),
      updatedAt: new Date(now - 16_000),
    }, now),
    'kick'
  )
})

test('recovers zombie processing tasks before kicking worker', () => {
  assert.equal(
    getTaskRecoveryAction({
      status: 'processing',
      createdAt: new Date(now - 700_000),
      updatedAt: new Date(now - 601_000),
    }, now),
    'recover-and-kick'
  )
})

test('does not recover fresh processing tasks', () => {
  assert.equal(
    getTaskRecoveryAction({
      status: 'processing',
      createdAt: new Date(now - 120_000),
      updatedAt: new Date(now - 120_000),
    }, now),
    'none'
  )
})
