import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
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

test('provides polished creation and gallery copy in both languages', () => {
  for (const locale of locales) {
    assert.ok(copy[locale].scenario.freeformPromptLabel)
    assert.ok(copy[locale].scenario.freeformPromptPlaceholder)
    assert.ok(copy[locale].scenario.uploadHint)
    assert.ok(copy[locale].scenario.resultAlt)
    assert.ok(copy[locale].scenario.waitingTitle)
    assert.ok(copy[locale].scenario.waitingDescription)
    assert.ok(copy[locale].scenario.requestTimeout)
    assert.ok(copy[locale].gallery.pageTitle)
    assert.ok(copy[locale].gallery.emptyDescription)
  }
})
