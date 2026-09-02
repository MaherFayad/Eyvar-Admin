/**
 * The colour theme's decision logic. **Three settings, not two**, and the whole
 * feature is which class is on `<html>`.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { applyTheme, isThemeChoice, resolveTheme, systemTheme } from './useTheme'

/** A `window` that answers `prefers-color-scheme` however the test wants. */
function fakeWindow(dark: boolean): Window {
  return {
    matchMedia: (query: string) => ({
      matches: query.includes('dark') ? dark : !dark,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  } as unknown as Window
}

describe('isThemeChoice', () => {
  it('accepts the three settings and nothing else', () => {
    expect(isThemeChoice('light')).toBe(true)
    expect(isThemeChoice('dark')).toBe(true)
    expect(isThemeChoice('system')).toBe(true)
    /* The reason this exists rather than a cast: a stored value is whatever
       was in `localStorage` last, and `'Dark'` reaching `classList.toggle`
       would silently resolve to light. */
    expect(isThemeChoice('Dark')).toBe(false)
    expect(isThemeChoice('auto')).toBe(false)
    expect(isThemeChoice(null)).toBe(false)
    expect(isThemeChoice(undefined)).toBe(false)
  })
})

describe('systemTheme', () => {
  it('reads the media query', () => {
    expect(systemTheme(fakeWindow(true))).toBe('dark')
    expect(systemTheme(fakeWindow(false))).toBe('light')
  })

  it('answers light where nothing can be asked', () => {
    /* A server render, an old jsdom, a browser with the feature off. A console
       that cannot ask should render the theme it was designed in first. */
    expect(systemTheme(undefined)).toBe('light')
    expect(systemTheme({} as Window)).toBe('light')
  })
})

describe('resolveTheme — an explicit choice outranks the machine, both ways', () => {
  it('follows the machine on `system`', () => {
    expect(resolveTheme('system', fakeWindow(true))).toBe('dark')
    expect(resolveTheme('system', fakeWindow(false))).toBe('light')
  })

  it('keeps dark on a light machine, and light on a dark one', () => {
    /* The half that is easy to get wrong. A dispatcher who wants the dark
       console on a bright morning gets it; so does the one who wants the light
       console at 3am. */
    expect(resolveTheme('dark', fakeWindow(false))).toBe('dark')
    expect(resolveTheme('light', fakeWindow(true))).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('puts the class on and takes it off', () => {
    applyTheme('dark', document)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light', document)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('is idempotent, because it runs at boot AND on every change', () => {
    applyTheme('dark', document)
    applyTheme('dark', document)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    /* One class, not two — `classList.toggle` rather than `+=`. */
    expect(
      Array.from(document.documentElement.classList).filter((c) => c === 'dark'),
    ).toHaveLength(1)
  })

  it('does nothing without a document rather than throwing', () => {
    expect(() => applyTheme('dark', undefined)).not.toThrow()
  })
})
