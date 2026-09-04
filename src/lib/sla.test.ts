import { describe, expect, it } from 'vitest'
import {
  NO_CLOCK,
  SLA_MESSAGES_EN,
  compareBySla,
  formatSlaLabel,
  queueClock,
  slaBand,
  slaClock,
  slaPrecision,
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

/* ═══════ rule 5 — the window picks the tier (Q-13 / AC-215, D22) ═══════ */

describe('slaPrecision — the window decides, not the number', () => {
  /** `now` plus a signed number of seconds, as an ISO instant. */
  const atSeconds = (s: number) => new Date(Date.parse(NOW) + s * 1_000).toISOString()

  it('counts a sub-10-minute window in seconds', () => {
    // D22: a 45-second chat first-response target, 44 seconds in.
    const chat = slaClock({ dueAt: atSeconds(44), targetMinutes: 0.75 }, NOW)
    expect(slaPrecision(chat)).toBe('second')
    expect(formatSlaLabel(chat, t)).toBe('44s left')
  })

  it('watches a 45-second promise move — the whole point of the tier', () => {
    const labels = [44, 30, 9, 1].map((s) =>
      formatSlaLabel(slaClock({ dueAt: atSeconds(s), targetMinutes: 0.75 }, NOW), t),
    )
    expect(labels).toEqual(['44s left', '30s left', '9s left', '1s left'])
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('counts a short window overdue in seconds too', () => {
    const late = slaClock({ dueAt: atSeconds(-20), targetMinutes: 3 }, NOW)
    expect(formatSlaLabel(late, t)).toBe('overdue 20s')
  })

  it('keeps the minute tier for the 3- and 5-minute windows above a minute', () => {
    expect(formatSlaLabel(slaClock({ dueAt: at(2), targetMinutes: 3 }, NOW), t)).toBe('2m left')
    expect(formatSlaLabel(slaClock({ dueAt: at(4), targetMinutes: 5 }, NOW), t)).toBe('4m left')
  })

  it('turns exactly at a 10-minute window', () => {
    expect(slaPrecision(slaClock({ dueAt: atSeconds(30), targetMinutes: 9.99 }, NOW))).toBe('second')
    expect(slaPrecision(slaClock({ dueAt: atSeconds(30), targetMinutes: 10 }, NOW))).toBe('minute')
  })

  it('leaves a 4-hour ticket clock in minutes in its last seconds — no `47s` regression', () => {
    const ticket = slaClock({ dueAt: atSeconds(47), startedAt: at(-240) }, NOW)
    expect(slaPrecision(ticket)).toBe('minute')
    expect(formatSlaLabel(ticket, t)).toBe('1m left')
  })

  it('keeps minutes when the window is unknown, rather than guessing from the remaining time', () => {
    const unknown = slaClock({ dueAt: atSeconds(47) }, NOW)
    expect(unknown.kind === 'running' && unknown.windowMs).toBeNull()
    expect(slaPrecision(unknown)).toBe('minute')
    expect(formatSlaLabel(unknown, t)).toBe('1m left')
    expect(slaPrecision(NO_CLOCK)).toBe('minute')
  })

  it('reports the window it used, and treats a non-positive window as unknown', () => {
    const running = slaClock({ dueAt: at(30), targetMinutes: 100 }, NOW)
    expect(running.kind === 'running' && running.windowMs).toBe(100 * 60_000)
    const breached = slaClock({ dueAt: at(-5), startedAt: at(-65) }, NOW)
    expect(breached.kind === 'breached' && breached.windowMs).toBe(60 * 60_000)
    // Started after the deadline: not a window, so no ratio and no precision claim.
    const nonsense = slaClock({ dueAt: at(-30), startedAt: at(-10) }, NOW)
    expect(nonsense.kind === 'breached' && nonsense.windowMs).toBeNull()
    expect(slaTrackPercent(nonsense)).toBeNull()
    expect(slaPrecision(nonsense)).toBe('minute')
  })

  it('holds AC-290 in both tiers — no row reads `overdue 0m` while it is late', () => {
    // Minute tier: 30 seconds late still rounds up to a whole minute.
    expect(formatSlaLabel(slaClock({ dueAt: atSeconds(-30), targetMinutes: 60 }, NOW), t)).toBe(
      'overdue 1m',
    )
    // Seconds tier: it says how late it actually is instead.
    expect(formatSlaLabel(slaClock({ dueAt: atSeconds(-30), targetMinutes: 3 }, NOW), t)).toBe(
      'overdue 30s',
    )
  })
})

describe('queueClock — O7: a past cut-off with no breach stamp is Missed, not Due', () => {
  const input = (breachedAt: string | null) => ({
    startedAt: null,
    dueAt: at(-12 * 60),
    targetMinutes: null,
    breachedAt,
  })

  it('reports a passed cut-off with no stamp as passed unbroken, and not as breached', () => {
    const result = queueClock(input(null), NOW, { terminal: false })
    expect(result.deadlinePassedUnbroken).toBe(true)
    expect(result.breached).toBe(false)
  })

  it('sorts it with the breached rows, not last with No clock', () => {
    const missed = queueClock(input(null), NOW, { terminal: false })
    const breached = queueClock(input(at(-11 * 60)), NOW, { terminal: false })
    const running = slaClock({ dueAt: at(30) }, NOW)
    expect(slaSortKey(missed.clock)).toBeLessThan(slaSortKey(running))
    expect(slaSortKey(missed.clock)).toBeLessThan(slaSortKey(NO_CLOCK))
    /* Both are twelve hours past the same cut-off, so neither outranks the
       other by lateness: they land together, which is what O7 asks for. */
    expect(compareBySla(missed.clock, breached.clock)).toBe(0)
  })

  it('draws no track for it, because no window was ever agreed', () => {
    const missed = queueClock(input(null), NOW, { terminal: false })
    expect(slaTrackPercent(missed.clock)).toBeNull()
  })

  it('stops the clock entirely once the row is decided (Q-18)', () => {
    const decided = queueClock(input(null), NOW, { terminal: true })
    expect(decided.clock).toBe(NO_CLOCK)
    expect(decided.deadlinePassedUnbroken).toBe(false)
  })
})
