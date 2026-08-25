import { describe, expect, it } from 'vitest'
import {
  NO_CLOCK,
  SLA_MESSAGES_EN,
  compareBySla,
  formatSlaLabel,
  slaBand,
  slaClock,
  slaSortKey,
  slaTrackPercent,
} from './sla'
import { createTranslator } from './i18n/translate'

const NOW = '2026-06-25T09:14:00+03:00'
const t = createTranslator({ dictionary: SLA_MESSAGES_EN })

/** `now` plus a signed number of minutes, as an ISO instant. */
function at(minutesFromNow: number): string {
  return new Date(Date.parse(NOW) + minutesFromNow * 60_000).toISOString()
}

describe('slaClock — No clock is a value, not a gap', () => {
  it('returns the No clock value when there is no deadline', () => {
    expect(slaClock({ dueAt: null }, NOW)).toBe(NO_CLOCK)
    expect(slaClock({ dueAt: null }, NOW).kind).toBe('no-clock')
  })

  it('renders "No clock" in words, never an em dash and never a synthetic deadline', () => {
    const label = formatSlaLabel(NO_CLOCK, t)
    expect(label).toBe('No clock')
    expect(label).not.toContain('—')
    expect(label).not.toContain('left')
  })

  it('is neutral and shows no track', () => {
    expect(slaBand(NO_CLOCK)).toBe('neutral')
    expect(slaTrackPercent(NO_CLOCK)).toBeNull()
  })

  it('is referentially stable, so a memo can compare it', () => {
    expect(slaClock({ dueAt: null }, NOW)).toBe(slaClock({ dueAt: null }, NOW))
  })
})

describe('slaClock — running and breached', () => {
  it('formats the four running / breached shapes §9.3 fixes', () => {
    expect(formatSlaLabel(slaClock({ dueAt: at(12) }, NOW), t)).toBe('12m left')
    expect(formatSlaLabel(slaClock({ dueAt: at(200) }, NOW), t)).toBe('3h 20m left')
    expect(formatSlaLabel(slaClock({ dueAt: at(2 * 1440 + 240) }, NOW), t)).toBe('2d 4h left')
    expect(formatSlaLabel(slaClock({ dueAt: at(-14) }, NOW), t)).toBe('overdue 14m')
  })

  it('treats the exact deadline instant as breached, not as running', () => {
    const clock = slaClock({ dueAt: NOW }, NOW)
    expect(clock.kind).toBe('breached')
    expect(slaBand(clock)).toBe('breached')
  })

  it('says "overdue" in words, so the state survives colour being removed (R5a c)', () => {
    expect(formatSlaLabel(slaClock({ dueAt: at(-14) }, NOW), t)).toContain('overdue')
  })
})

describe('slaBand — the denominator is the item´s own target', () => {
  it('is neutral at or above half the window, warning below it', () => {
    // Started 60 minutes ago, due in 60 — a 120-minute window, half consumed.
    expect(slaBand(slaClock({ startedAt: at(-60), dueAt: at(60) }, NOW))).toBe('neutral')
    // Started 60 minutes ago, due in 40 — a 100-minute window, 60% consumed.
    expect(slaBand(slaClock({ startedAt: at(-60), dueAt: at(40) }, NOW))).toBe('warning')
  })

  it('holds neutral right up to the halfway mark and turns at it', () => {
    // Exactly half left is still neutral: §9.3 reads ">= 50% -> neutral".
    expect(slaBand(slaClock({ startedAt: at(-50), dueAt: at(50) }, NOW))).toBe('neutral')
    expect(slaBand(slaClock({ startedAt: at(-51), dueAt: at(49) }, NOW))).toBe('warning')
  })

  it('reads the window from `targetMinutes` when the start instant is unknown', () => {
    expect(slaBand(slaClock({ dueAt: at(60), targetMinutes: 100 }, NOW))).toBe('neutral')
    expect(slaBand(slaClock({ dueAt: at(40), targetMinutes: 100 }, NOW))).toBe('warning')
  })

  it('ignores `targetMinutes` when a real start instant is available', () => {
    // The item´s own start wins: a shared default must never override a fact.
    expect(slaBand(slaClock({ startedAt: at(-10), dueAt: at(50), targetMinutes: 1000 }, NOW))).toBe(
      'neutral',
    )
  })

  it('gives a 30-minute SLA and a 4-hour SLA different bands at the same remaining time', () => {
    // The legacy bar divides by a hardcoded 90 (`:11652`), so these two were
    // identical. They must not be.
    const shortSla = slaClock({ dueAt: at(20), startedAt: at(-10) }, NOW) // 30m window
    const longSla = slaClock({ dueAt: at(20), startedAt: at(-220) }, NOW) // 4h window
    expect(slaBand(shortSla)).toBe('neutral')
    expect(slaBand(longSla)).toBe('warning')
  })

  it('stays neutral when the window is genuinely unknown rather than inventing one', () => {
    const clock = slaClock({ dueAt: at(1) }, NOW)
    expect(slaBand(clock)).toBe('neutral')
  })
})

describe('slaTrackPercent — no window, no track', () => {
  it('returns null when the window is unknown, which is not the same as zero', () => {
    expect(slaTrackPercent(slaClock({ dueAt: at(30) }, NOW))).toBeNull()
    expect(slaTrackPercent(slaClock({ dueAt: at(30), targetMinutes: null }, NOW))).toBeNull()
  })

  it('is the fraction of the item´s own window consumed', () => {
    expect(slaTrackPercent(slaClock({ dueAt: at(30), startedAt: at(-30) }, NOW))).toBe(50)
    expect(slaTrackPercent(slaClock({ dueAt: at(45), startedAt: at(-15) }, NOW))).toBe(25)
  })

  it('clamps at 100 once breached rather than reporting 140%', () => {
    expect(slaTrackPercent(slaClock({ dueAt: at(-30), startedAt: at(-90) }, NOW))).toBe(100)
  })

  it('returns null for a zero-length or reversed window instead of dividing by zero', () => {
    expect(slaTrackPercent(slaClock({ dueAt: at(10), startedAt: at(10) }, NOW))).toBeNull()
    expect(slaTrackPercent(slaClock({ dueAt: at(10), startedAt: at(20) }, NOW))).toBeNull()
  })
})

describe('ordering — breached first, No clock last', () => {
  it('sorts breached before running before No clock', () => {
    const rows = [
      { id: 'no-clock', clock: slaClock({ dueAt: null }, NOW) },
      { id: 'plenty', clock: slaClock({ dueAt: at(200) }, NOW) },
      { id: 'breached-14m', clock: slaClock({ dueAt: at(-14) }, NOW) },
      { id: 'soon', clock: slaClock({ dueAt: at(12) }, NOW) },
      { id: 'breached-2h', clock: slaClock({ dueAt: at(-120) }, NOW) },
    ]
    const order = rows.sort((a, b) => compareBySla(a.clock, b.clock)).map((r) => r.id)
    expect(order).toEqual(['breached-2h', 'breached-14m', 'soon', 'plenty', 'no-clock'])
  })

  it('puts No clock last even against an item due a decade out', () => {
    const decade = slaClock({ dueAt: at(10 * 365 * 1440) }, NOW)
    expect(compareBySla(NO_CLOCK, decade)).toBeGreaterThan(0)
    expect(slaSortKey(NO_CLOCK)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('is a total order — no pair compares as both less and greater', () => {
    const clocks = [NO_CLOCK, slaClock({ dueAt: at(-1) }, NOW), slaClock({ dueAt: at(1) }, NOW)]
    for (const a of clocks) {
      for (const b of clocks) {
        expect(Math.sign(compareBySla(a, b)) + Math.sign(compareBySla(b, a))).toBe(0)
      }
    }
  })

  it('keeps equal keys in their original order, so a queue does not reshuffle', () => {
    const same = () => slaClock({ dueAt: at(30) }, NOW)
    const rows = [
      { id: 'a', clock: same() },
      { id: 'b', clock: same() },
      { id: 'c', clock: same() },
    ]
    expect(rows.sort((x, y) => compareBySla(x.clock, y.clock)).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('copy', () => {
  it('interpolates a named placeholder inside a single key — AC-75', () => {
    expect(SLA_MESSAGES_EN['sla.left']).toBe('{duration} left')
    expect(SLA_MESSAGES_EN['sla.overdue']).toBe('overdue {duration}')
  })

  it('falls back to English when the Arabic dictionary is empty — AC-74', () => {
    const arabic = createTranslator({ dictionary: {}, fallback: SLA_MESSAGES_EN })
    expect(formatSlaLabel(slaClock({ dueAt: at(12) }, NOW), arabic)).toBe('12m left')
    expect(formatSlaLabel(NO_CLOCK, arabic)).toBe('No clock')
  })

  it('lets the Arabic dictionary reorder the sentence around the duration', () => {
    const arabic = createTranslator({
      dictionary: { 'sla.left': 'متبقٍ {duration}', 'sla.overdue': 'متأخر {duration}', 'sla.noClock': 'بدون مؤقت' },
      fallback: SLA_MESSAGES_EN,
    })
    expect(formatSlaLabel(slaClock({ dueAt: at(12) }, NOW), arabic)).toBe('متبقٍ 12m')
    expect(formatSlaLabel(NO_CLOCK, arabic)).toBe('بدون مؤقت')
  })
})
