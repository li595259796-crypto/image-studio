import test from 'node:test'
import assert from 'node:assert/strict'

import { copy, defaultLocale, locales } from './i18n.ts'

test('exposes the supported locales and defaults to zh', () => {
  assert.deepEqual(locales, ['zh', 'en'])
  assert.equal(defaultLocale, 'zh')
})

test('provides landing page and legal copy in both languages', () => {
  for (const locale of locales) {
    assert.ok(copy[locale].landing.brand)
    assert.ok(copy[locale].landing.cta)
    assert.ok(copy[locale].nav.login)
    assert.ok(copy[locale].legal.termsTitle)
    assert.ok(copy[locale].legal.privacyTitle)
  }
})
