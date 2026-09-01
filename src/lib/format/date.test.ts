import { describe, expect, it } from 'vitest'
import { EYVAR_NOW, EYVAR_TODAY } from '@/data/clients'
import { RIYADH_TIME_ZONE, formatDate, toDate } from './date'

describe('formatDate', () => {
  it('renders the styles in English', () => {
    expect(formatDate(EYVAR_NOW, { style: 'day-month' })).toBe('25 Jun')
    expect(formatDate(EYVAR_NOW, { style: 'day-month-year' })).toBe('25 Jun 2026')
    expect(formatDate(EYVAR_NOW, { style: 'time' })).toBe('09:14')
    expect(formatDate(EYVAR_NOW, { style: 'weekday-day-month-year' })).toContain('Thursday')
  })

  /* ── month-year: a cohort row is a month, not the first of it ── */

  it('renders month-year without a day', () => {
    expect(formatDate('2026-03-01', { style: 'month-year' })).toBe('Mar 2026')
    expect(formatDate('2026-03-17T14:05:00+03:00', { style: 'month-year' })).toBe('Mar 2026')
    expect(formatDate(EYVAR_NOW, { style: 'month-year' })).toBe('Jun 2026')
  })

  it('claims no day precision a monthly cohort does not have', () => {
    // The defect: a cohort header reading `1 Mar 2026` states a day the row
    // does not have. Every day of March must render identically.
    const march = ['2026-03-01', '2026-03-15', '2026-03-31'].map((d) =>
      formatDate(d, { style: 'month-year' }),
    )
    expect(new Set(march).size).toBe(1)
    expect(march[0]).not.toMatch(/\b(1|15|31)\b/)
  })

  it('is locale-built in Arabic too — the month name translates, the digits do not', () => {
    const arabic = formatDate('2026-03-01', { style: 'month-year', language: 'ar' })
    expect(arabic).toContain('2026')
    expect(arabic).not.toMatch(/[٠-٩]/)
    expect(arabic).not.toContain('Mar')
  })

  it('respects the Riyadh boundary, so a cohort does not slip a month', () => {
    // 21:30 UTC on 28 February is 00:30 on 1 March in Riyadh.
    expect(formatDate('2026-02-28T21:30:00Z', { style: 'month-year' })).toBe('Mar 2026')
    expect(formatDate('2026-02-28T20:30:00Z', { style: 'month-year' })).toBe('Feb 2026')
  })

  it('joins date and time with a plain space, as §9.3 words it', () => {
    // Asking Intl for both at once yields `25 Jun, 09:14`; the spec´s decided-row
    // timestamp is `19 Jul 09:14`.
    expect(formatDate(EYVAR_NOW, { style: 'day-month-time' })).toBe('25 Jun 09:14')
    expect(formatDate(EYVAR_NOW, { style: 'day-month-time' })).not.toContain(',')
  })

  it('defaults to day-month, the table-cell shape', () => {
    expect(formatDate(EYVAR_NOW)).toBe('25 Jun')
  })

  /* ── the Hijri / Arabic-Indic trap ── */

  it('uses Western digits and the Gregorian calendar in Arabic', () => {
    const arabic = formatDate(EYVAR_NOW, { style: 'day-month-year', language: 'ar' })
    expect(arabic).toContain('25')
    expect(arabic).toContain('2026')
    expect(arabic).not.toMatch(/[٠-٩]/)
  })

  it('is what a bare ar-SA locale would NOT have produced', () => {
    // The reason this module exists. A bare locale resolves numberingSystem
    // `arab`, and on some ICU builds calendar `islamic-umalqura` too.
    const bare = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
    expect(bare.format(toDate(EYVAR_NOW))).toMatch(/[٠-٩]/)
    expect(bare.resolvedOptions().numberingSystem).toBe('arab')

    expect(formatDate(EYVAR_NOW, { style: 'day-month-year', language: 'ar' })).not.toMatch(/[٠-٩]/)
  })

  it('keeps the time reading left-to-right in Arabic', () => {
    expect(formatDate(EYVAR_NOW, { style: 'time', language: 'ar' })).toBe('09:14')
  })

  /* ── time zone ── */

  it('renders in Riyadh by default, not in the host time zone', () => {
    // 22:30 UTC on 24 June is 01:30 on 25 June in Riyadh. A host set to UTC
    // must still show the 25th — this is the off-by-one nobody reproduces.
    const lateUtc = '2026-06-24T22:30:00Z'
    expect(formatDate(lateUtc, { style: 'day-month' })).toBe('25 Jun')
    expect(formatDate(lateUtc, { style: 'time' })).toBe('01:30')
  })

  it('treats a bare calendar date as midnight in Riyadh, matching the data layer', () => {
    expect(formatDate(EYVAR_TODAY, { style: 'day-month-time' })).toBe('25 Jun 00:00')
  })

  it('honours an explicit time zone when one is genuinely non-Riyadh', () => {
    expect(formatDate(EYVAR_NOW, { style: 'time', timeZone: 'UTC' })).toBe('06:14')
    expect(RIYADH_TIME_ZONE).toBe('Asia/Riyadh')
  })

  it('is unaffected by a DST transition, because Riyadh has none', () => {
    // 29 March 2026, 01:00 UTC — Europe/London springs forward at exactly this
    // instant. Riyadh is +03:00 on both sides of it.
    const before = '2026-03-29T00:59:00Z'
    const after = '2026-03-29T01:01:00Z'
    expect(formatDate(before, { style: 'time' })).toBe('03:59')
    expect(formatDate(after, { style: 'time' })).toBe('04:01')
    // ...and the same instants in a zone that does observe DST jump an hour.
    expect(formatDate(before, { style: 'time', timeZone: 'Europe/London' })).toBe('00:59')
    expect(formatDate(after, { style: 'time', timeZone: 'Europe/London' })).toBe('02:01')
  })

  /* ── month ends and leap years ── */

  it('handles a month end and a leap day', () => {
    expect(formatDate('2026-01-31', { style: 'day-month-year' })).toBe('31 Jan 2026')
    expect(formatDate('2028-02-29', { style: 'day-month-year' })).toBe('29 Feb 2028')
  })

  /* ── bad input ── */

  it('throws rather than rendering Invalid Date into a table', () => {
    // The legacy app stores display strings like this (`:2676`). V8 parses it
    // happily, assuming the current year — a plausible wrong date is worse
    // than a throw.
    expect(Number.isNaN(Date.parse('25 Jun 07:00'))).toBe(false)
    expect(() => formatDate('25 Jun 07:00')).toThrow(/Not an ISO date/)
    expect(() => formatDate('')).toThrow(/Not an ISO date/)
    expect(() => formatDate('2026-13-45T99:99:00+03:00')).toThrow()
    expect(() => formatDate(new Date(Number.NaN))).toThrow(/Invalid Date/)
  })

  it('refuses an ISO date-time with no offset, because that is a different instant per host', () => {
    expect(() => formatDate('2026-06-25T09:14:00')).toThrow(/offset/)
  })

  it('accepts a Date as well as an ISO string', () => {
    expect(formatDate(new Date('2026-06-25T09:14:00+03:00'), { style: 'day-month' })).toBe('25 Jun')
  })
})
