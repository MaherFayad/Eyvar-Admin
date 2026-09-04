import { afterEach, describe, expect, it } from 'vitest'
import { WIDE_BREAKPOINT_FALLBACK_PX, isWideViewport, readWideBreakpointPx } from './breakpoint'

afterEach(() => {
  document.documentElement.style.removeProperty('--ev-bp-wide')
})

describe('the one breakpoint — D2', () => {
  it('is 1280px — D2 as amended by O1', () => {
    expect(WIDE_BREAKPOINT_FALLBACK_PX).toBe(1280)
  })

  it('reads --ev-bp-wide from CSS, so globals.css stays the source of truth', () => {
    document.documentElement.style.setProperty('--ev-bp-wide', '1400px')
    expect(readWideBreakpointPx()).toBe(1400)
  })

  it('falls back when the custom property is absent or unparseable', () => {
    expect(readWideBreakpointPx()).toBe(1280)
    document.documentElement.style.setProperty('--ev-bp-wide', 'not-a-length')
    expect(readWideBreakpointPx()).toBe(1280)
    document.documentElement.style.setProperty('--ev-bp-wide', '0px')
    expect(readWideBreakpointPx()).toBe(1280)
  })

  it('calls D2 own floor wide, which is what O1 changed', () => {
    expect(isWideViewport({ innerWidth: 1280, document } as Window)).toBe(true)
    expect(isWideViewport({ innerWidth: 1440, document } as Window)).toBe(true)
  })

  it('is inclusive at the breakpoint itself: 1280 is wide, 1279 is not', () => {
    expect(isWideViewport({ innerWidth: 1280, document } as Window)).toBe(true)
    expect(isWideViewport({ innerWidth: 1279, document } as Window)).toBe(false)
  })

  it('keeps a 1366-class laptop on the wide side once its scrollbar is subtracted', () => {
    expect(isWideViewport({ innerWidth: 1349, document } as Window)).toBe(true)
  })

  it('assumes wide when there is no window at all', () => {
    expect(isWideViewport(null)).toBe(true)
  })
})
