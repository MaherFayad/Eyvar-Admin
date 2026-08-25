import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryStore, resetDefaultUiStores } from '@/lib/persistence'
import { applyDocumentDirection, useLanguageState } from './useLanguage'

const dictionaries = {
  en: { 'shell.save': 'Save', 'nav.workspace.operations': 'Operations' },
  ar: { 'shell.save': 'حفظ' },
}

afterEach(() => {
  resetDefaultUiStores()
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

const setup = (initialLanguage: 'en' | 'ar' = 'en') =>
  renderHook(() =>
    useLanguageState({ initialLanguage, dictionaries, store: createMemoryStore<'en' | 'ar'>() }),
  )

describe('AC-70 — dir on the document element, not a subtree', () => {
  it('sets dir and lang on <html>', () => {
    setup('ar')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
  })

  it('flips both when the language changes', () => {
    const { result } = setup('en')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    act(() => result.current.setLanguage('ar'))
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
  })

  it('is idempotent', () => {
    applyDocumentDirection('ar')
    applyDocumentDirection('ar')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
  })

  it('touches no element other than <html>', () => {
    applyDocumentDirection('ar')
    expect(document.body.getAttribute('dir')).toBeNull()
  })

  it('does not touch the document when the caller opts out', () => {
    renderHook(() =>
      useLanguageState({
        initialLanguage: 'ar',
        dictionaries,
        store: createMemoryStore<'en' | 'ar'>(),
        applyToDocument: false,
      }),
    )
    expect(document.documentElement.getAttribute('dir')).toBeNull()
  })
})

describe('the derived values', () => {
  it('derives dir and the explicit locale, and never stores them', () => {
    const { result } = setup('ar')
    expect(result.current.dir).toBe('rtl')
    expect(result.current.locale).toBe('ar-SA-u-ca-gregory-nu-latn')
  })

  it('gives English the Gregorian/Latin locale too', () => {
    expect(setup('en').result.current.locale).toBe('en-GB-u-ca-gregory-nu-latn')
  })
})

describe('the translator it hands out', () => {
  it('uses the active dictionary', () => {
    const { result } = setup('ar')
    expect(result.current.t('shell.save')).toBe('حفظ')
  })

  it('falls back to English for a key the Arabic dictionary lacks — AC-74', () => {
    const { result } = setup('ar')
    expect(result.current.t('nav.workspace.operations')).toBe('Operations')
  })

  it('shows the English fallback for EVERY string when Arabic is empty, and no raw key', () => {
    const { result } = renderHook(() =>
      useLanguageState({
        initialLanguage: 'ar',
        dictionaries: { en: dictionaries.en, ar: {} },
        store: createMemoryStore<'en' | 'ar'>(),
      }),
    )
    for (const [key, english] of Object.entries(dictionaries.en)) {
      expect(result.current.t(key)).toBe(english)
      expect(result.current.t(key)).not.toBe(key)
    }
  })

  it('swaps the translator when the language changes', () => {
    const { result } = setup('en')
    expect(result.current.t('shell.save')).toBe('Save')
    act(() => result.current.setLanguage('ar'))
    expect(result.current.t('shell.save')).toBe('حفظ')
  })
})

describe('persistence', () => {
  it('prefers a stored language over the initial one', () => {
    const store = createMemoryStore<'en' | 'ar'>()
    store.write('ar')
    const { result } = renderHook(() =>
      useLanguageState({ initialLanguage: 'en', dictionaries, store }),
    )
    expect(result.current.language).toBe('ar')
  })

  it('ignores a stored value that is not a language', () => {
    const store = createMemoryStore<'en' | 'ar'>('fr' as 'en')
    const { result } = renderHook(() =>
      useLanguageState({ initialLanguage: 'en', dictionaries, store }),
    )
    expect(result.current.language).toBe('en')
  })

  it('writes the operator´s choice to the store', () => {
    const store = createMemoryStore<'en' | 'ar'>()
    const { result } = renderHook(() => useLanguageState({ dictionaries, store }))
    act(() => result.current.setLanguage('ar'))
    expect(store.read()).toBe('ar')
  })
})
