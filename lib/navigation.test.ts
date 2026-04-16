import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AUTH_PROTECTED_PREFIXES,
  DASHBOARD_HOME,
  getWorkbenchRouteKey,
} from './navigation.ts'

test('uses /canvas as the logged-in dashboard home', () => {
  assert.equal(DASHBOARD_HOME, '/canvas')
  assert.ok(AUTH_PROTECTED_PREFIXES.includes('/canvas'))
})

test('maps canvas routes to the canvas workbench context key', () => {
  assert.equal(getWorkbenchRouteKey('/canvas'), 'canvas')
  assert.equal(getWorkbenchRouteKey('/canvas/123'), 'canvas')
  assert.equal(getWorkbenchRouteKey('/generate'), 'generate')
  assert.equal(getWorkbenchRouteKey('/settings'), 'settings')
})
