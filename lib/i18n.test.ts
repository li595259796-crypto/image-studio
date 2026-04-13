import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import { copy, defaultLocale, locales } from './i18n.ts'

function assertNonEmptyText(value: unknown, path: string) {
  assert.equal(typeof value, 'string', `${path} should be a string`)
  assert.ok(value.trim().length > 0, `${path} should not be blank`)
}

function assertNoBlankStrings(value: unknown, path: string) {
  if (typeof value === 'string') {
    assertNonEmptyText(value, path)
    return
  }

  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${path} should not be empty`)
    value.forEach((item, index) => {
      assertNoBlankStrings(item, `${path}[${index}]`)
    })
    return
  }

  assert.ok(value && typeof value === 'object', `${path} should be an object`)
  for (const [key, nestedValue] of Object.entries(value)) {
    assertNoBlankStrings(nestedValue, `${path}.${key}`)
  }
}

test('exposes the supported locales and defaults to zh', () => {
  assert.deepEqual(locales, ['zh', 'en'])
  assert.equal(defaultLocale, 'zh')
})

test('provides landing page and legal copy in both languages', () => {
  for (const locale of locales) {
    assertNonEmptyText(copy[locale].landing.brand, `${locale}.landing.brand`)
    assertNonEmptyText(copy[locale].landing.cta, `${locale}.landing.cta`)
    assertNonEmptyText(copy[locale].nav.login, `${locale}.nav.login`)
    assertNonEmptyText(copy[locale].legal.termsTitle, `${locale}.legal.termsTitle`)
    assertNonEmptyText(copy[locale].legal.privacyTitle, `${locale}.legal.privacyTitle`)
  }
})

test('pins locale-specific sentinel copy values', () => {
  assert.equal(copy.zh.landing.cta, '开始创作')
  assert.equal(copy.zh.nav.login, '登录')
  assert.equal(copy.zh.gallery.libraryTitle, '作品库')
  assert.equal(copy.zh.auth.accessHeading, '访问你的账户')

  assert.equal(copy.en.landing.cta, 'Start Creating')
  assert.equal(copy.en.nav.login, 'Log In')
  assert.equal(copy.en.gallery.libraryTitle, 'Library')
  assert.equal(copy.en.auth.accessHeading, 'Access your account')
})

test('locks the redesign copy contract across public, workbench, library, and account surfaces', () => {
  for (const locale of locales) {
    const localeCopy = copy[locale]

    assertNonEmptyText(localeCopy.landing.valuePill, `${locale}.landing.valuePill`)
    assertNonEmptyText(localeCopy.landing.workbenchLabel, `${locale}.landing.workbenchLabel`)
    assertNonEmptyText(
      localeCopy.landing.workbenchDescription,
      `${locale}.landing.workbenchDescription`
    )

    assertNonEmptyText(localeCopy.auth.accessHeading, `${locale}.auth.accessHeading`)
    assertNonEmptyText(localeCopy.auth.accessSupport, `${locale}.auth.accessSupport`)

    assertNonEmptyText(localeCopy.gallery.libraryTitle, `${locale}.gallery.libraryTitle`)
    assertNonEmptyText(
      localeCopy.gallery.libraryDescription,
      `${locale}.gallery.libraryDescription`
    )
    assertNonEmptyText(localeCopy.gallery.emptyTitle, `${locale}.gallery.emptyTitle`)
    assertNonEmptyText(localeCopy.gallery.emptyDescription, `${locale}.gallery.emptyDescription`)
    assertNonEmptyText(
      localeCopy.gallery.filteredEmptyTitle,
      `${locale}.gallery.filteredEmptyTitle`
    )
    assertNonEmptyText(
      localeCopy.gallery.filteredEmptyDescription,
      `${locale}.gallery.filteredEmptyDescription`
    )
    assertNonEmptyText(
      localeCopy.gallery.copyToGenerate,
      `${locale}.gallery.copyToGenerate`
    )
    assertNonEmptyText(localeCopy.gallery.copyPrompt, `${locale}.gallery.copyPrompt`)
    assertNonEmptyText(localeCopy.gallery.continueEdit, `${locale}.gallery.continueEdit`)

    assertNonEmptyText(localeCopy.settings.pageDescription, `${locale}.settings.pageDescription`)

    assertNonEmptyText(localeCopy.upgrade.usageTitle, `${locale}.upgrade.usageTitle`)
    assertNonEmptyText(
      localeCopy.upgrade.usageDescription,
      `${locale}.upgrade.usageDescription`
    )
  }
})

test('locks the canvas copy contract in both locales', () => {
  for (const locale of locales) {
    const localeCopy = copy[locale]

    assertNonEmptyText(localeCopy.nav.canvas, `${locale}.nav.canvas`)
    assertNonEmptyText(localeCopy.canvas.listTitle, `${locale}.canvas.listTitle`)
    assertNonEmptyText(
      localeCopy.canvas.listDescription,
      `${locale}.canvas.listDescription`
    )
    assertNonEmptyText(localeCopy.canvas.emptyTitle, `${locale}.canvas.emptyTitle`)
    assertNonEmptyText(
      localeCopy.canvas.emptyDescription,
      `${locale}.canvas.emptyDescription`
    )
    assertNonEmptyText(localeCopy.canvas.newCanvas, `${locale}.canvas.newCanvas`)
    assertNonEmptyText(localeCopy.canvas.renameAction, `${locale}.canvas.renameAction`)
    assertNonEmptyText(localeCopy.canvas.deleteAction, `${locale}.canvas.deleteAction`)
    assertNonEmptyText(localeCopy.canvas.autosaveIdle, `${locale}.canvas.autosaveIdle`)
    assertNonEmptyText(
      localeCopy.canvas.autosaveSaving,
      `${locale}.canvas.autosaveSaving`
    )
    assertNonEmptyText(localeCopy.canvas.autosaveSaved, `${locale}.canvas.autosaveSaved`)
    assertNonEmptyText(localeCopy.canvas.autosaveError, `${locale}.canvas.autosaveError`)
  }
})

test('keeps shared locale surfaces free of blank strings', () => {
  for (const locale of locales) {
    const localeCopy = copy[locale]

    assertNoBlankStrings(localeCopy.landing, `${locale}.landing`)
    assertNoBlankStrings(localeCopy.nav, `${locale}.nav`)
    assertNoBlankStrings(localeCopy.legal, `${locale}.legal`)
    assertNoBlankStrings(localeCopy.scenario, `${locale}.scenario`)
    assertNoBlankStrings(localeCopy.postAction, `${locale}.postAction`)
    assertNoBlankStrings(localeCopy.refine, `${locale}.refine`)
    assertNoBlankStrings(localeCopy.auth, `${locale}.auth`)
    assertNoBlankStrings(localeCopy.gallery, `${locale}.gallery`)
    assertNoBlankStrings(localeCopy.galleryFilter, `${locale}.galleryFilter`)
    assertNoBlankStrings(localeCopy.settings, `${locale}.settings`)
    assertNoBlankStrings(localeCopy.upgrade, `${locale}.upgrade`)
  }
})

test('freezes the shared locale contract at runtime', () => {
  assert.ok(Object.isFrozen(copy))

  for (const locale of locales) {
    const localeCopy = copy[locale]

    assert.ok(Object.isFrozen(localeCopy))
    assert.ok(Object.isFrozen(localeCopy.landing))
    assert.ok(Object.isFrozen(localeCopy.landing.samples))
    assert.ok(Object.isFrozen(localeCopy.legal))
    assert.ok(Object.isFrozen(localeCopy.legal.termsSections))
    assert.ok(Object.isFrozen(localeCopy.legal.termsSections[0]))
    assert.ok(Object.isFrozen(localeCopy.legal.privacySections))
    assert.ok(Object.isFrozen(localeCopy.legal.privacySections[0]))
    assert.ok(Object.isFrozen(localeCopy.gallery))
    assert.ok(Object.isFrozen(localeCopy.upgrade.features))
  }
})
