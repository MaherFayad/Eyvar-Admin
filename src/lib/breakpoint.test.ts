import { afterEach, describe, expect, it } from 'vitest'
import { WIDE_BREAKPOINT_FALLBACK_PX, isWideViewport, readWideBreakpointPx } from './breakpoint'

afterEach(() => {
  document.documentElement.style.removeProperty('--ev-bp-wide')
})

describe('the one breakpoint — D2', () => {
  it('is 1344px', () => {
    expect(WIDE_BREAKPOINT_FALLBACK_PX).toBe(1344)
  })

  it('reads --ev-bp-wide from CSS, so globals.css stays the source of truth', () => {
    document.documentElement.style.setProperty('--ev-bp-wide', '1400px')
    expect(readWideBreakpointPx()).toBe(1400)
  })

  it('falls back when the custom property is absent or unparseable', () => {
    expect(readWideBreakpointPx()).toBe(1344)
    document.documentElement.style.setProperty('--ev-bp-wide', 'not-a-length')
    expect(readWideBreakpointPx()).toBe(1344)
    document.documentElement.style.setProperty('--ev-bp-wide', '0px')
    expect(readWideBreakpointPx()).toBe(1344)
  })

  it('calls 1280 narrow and 1440 wide — the two states D2 requires be reviewed', () => {
    expect(isWideViewport({ innerWidth: 1280, document } as Window)).toBe(false)
    expect(isWideViewport({ innerWidth: 1440, document } as Window)).toBe(true)
  })

  it('is inclusive at the breakpoint itself: 1344 is wide, 1343 is not', () => {
    expect(isWideViewport({ innerWidth: 1344, document } as Window)).toBe(true)
    expect(isWideViewport({ innerWidth: 1343, document } as Window)).toBe(false)
  })

  it('keeps a 1366-class laptop on the wide side once its scrollbar is subtracted', () => {
    // The reason 1344 and not 1360 — DECISIONS.md D2.
    expect(isWideViewport({ innerWidth: 1349, document } as Window)).toBe(true)
  })

  it('assumes wide when there is no window at all', () => {
    expect(isWideViewport(null)).toBe(true)
  })
})
