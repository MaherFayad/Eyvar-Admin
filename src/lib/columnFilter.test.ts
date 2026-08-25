import { describe, expect, it } from 'vitest'
import {
  columnFilterIssue,
  formatColumnFilterBounds,
  toFilterSpec,
  type ColumnFilterValue,
} from './columnFilter'


describe('text', () => {
  it('emits contains for a non-blank query', () => {
    expect(toFilterSpec('name', { kind: 'text', value: 'Nora' })).toEqual({
      field: 'name',
      op: 'contains',
      value: 'Nora',
    })
  })

  it('trims, because a trailing space matches nothing on a code column', () => {
    expect(toFilterSpec('plate', { kind: 'text', value: '  ABC 1234  ' })).toEqual({
      field: 'plate',
      op: 'contains',
      value: 'ABC 1234',
    })
  })

  it('emits nothing for an empty or whitespace-only box', () => {
    expect(toFilterSpec('name', { kind: 'text', value: '' })).toBeNull()
    expect(toFilterSpec('name', { kind: 'text', value: '   ' })).toBeNull()
  })

  it('keeps Arabic input intact and does not transliterate it', () => {
    const spec = toFilterSpec('name', { kind: 'text', value: 'نورة الحربي' })
    expect(spec).toEqual({ field: 'name', op: 'contains', value: 'نورة الحربي' })
  })
})

describe('select and multi-select', () => {
  it('emits eq for a single selection', () => {
    expect(toFilterSpec('status', { kind: 'select', value: 'active' })).toEqual({
      field: 'status',
      op: 'eq',
      value: 'active',
    })
  })

  it('emits nothing when nothing is selected', () => {
    expect(toFilterSpec('status', { kind: 'select', value: null })).toBeNull()
    expect(toFilterSpec('status', { kind: 'multi-select', values: [] })).toBeNull()
  })

  it('stays `in` for one selected option, so ticking a second box does not change the operator', () => {
    expect(toFilterSpec('status', { kind: 'multi-select', values: ['active'] })).toEqual({
      field: 'status',
      op: 'in',
      value: ['active'],
    })
  })

  it('deduplicates restored values, first occurrence wins, order preserved', () => {
    expect(
      toFilterSpec('city', { kind: 'multi-select', values: ['riyadh', 'jeddah', 'riyadh'] }),
    ).toEqual({ field: 'city', op: 'in', value: ['riyadh', 'jeddah'] })
  })

  it('accepts an Arabic option value unchanged', () => {
    expect(toFilterSpec('city', { kind: 'multi-select', values: ['الرياض'] })).toEqual({
      field: 'city',
      op: 'in',
      value: ['الرياض'],
    })
  })
})

describe('boolean — `false` is a value, not an absence', () => {
  it('emits eq false, which is the whole point of this case', () => {
    expect(toFilterSpec('suspended', { kind: 'boolean', value: false })).toEqual({
      field: 'suspended',
      op: 'eq',
      value: false,
    })
  })

  it('emits eq true', () => {
    expect(toFilterSpec('suspended', { kind: 'boolean', value: true })).toEqual({
      field: 'suspended',
      op: 'eq',
      value: true,
    })
  })

  it('emits nothing only when the control is genuinely unset', () => {
    expect(toFilterSpec('suspended', { kind: 'boolean', value: null })).toBeNull()
  })
})

describe('number range', () => {
  it('emits between when both ends are set', () => {
    expect(toFilterSpec('trips', { kind: 'number-range', min: 10, max: 50 })).toEqual({
      field: 'trips',
      op: 'between',
      value: [10, 50],
    })
  })

  it('emits gte with only a lower bound and lte with only an upper one', () => {
    expect(toFilterSpec('trips', { kind: 'number-range', min: 10, max: null })).toEqual({
      field: 'trips',
      op: 'gte',
      value: 10,
    })
    expect(toFilterSpec('trips', { kind: 'number-range', min: null, max: 50 })).toEqual({
      field: 'trips',
      op: 'lte',
      value: 50,
    })
  })

  it('emits nothing when neither end is set', () => {
    expect(toFilterSpec('trips', { kind: 'number-range', min: null, max: null })).toBeNull()
  })

  it('treats zero as a bound, not as empty', () => {
    expect(toFilterSpec('trips', { kind: 'number-range', min: 0, max: 0 })).toEqual({
      field: 'trips',
      op: 'between',
      value: [0, 0],
    })
  })

  it('accepts a negative bound — an overdrawn wallet is a real balance', () => {
    expect(
      toFilterSpec('balance', { kind: 'number-range', min: -50_000, max: 0, unit: 'money' }),
    ).toEqual({ field: 'balance', op: 'between', value: [-50_000, 0] })
  })

  it('accepts a very large bound without losing precision', () => {
    const big = Number.MAX_SAFE_INTEGER
    expect(toFilterSpec('balance', { kind: 'number-range', min: null, max: big })).toEqual({
      field: 'balance',
      op: 'lte',
      value: big,
    })
  })

  it('throws on a decimal bound, because that means major units reached a halalas field', () => {
    expect(() =>
      toFilterSpec('balance', { kind: 'number-range', min: 12.34, max: null, unit: 'money' }),
    ).toThrow(/integer bounds/)
  })
})

describe('inverted ranges', () => {
  it('reports the issue as a code so the control can disable Apply', () => {
    expect(columnFilterIssue({ kind: 'number-range', min: 500, max: 100 })).toBe('range-inverted')
    expect(columnFilterIssue({ kind: 'date-range', from: '2026-06-30', to: '2026-06-25' })).toBe(
      'range-inverted',
    )
  })

  it('reports no issue for an open-ended or equal-ended range', () => {
    expect(columnFilterIssue({ kind: 'number-range', min: 500, max: null })).toBeNull()
    expect(columnFilterIssue({ kind: 'number-range', min: 100, max: 100 })).toBeNull()
    expect(columnFilterIssue({ kind: 'date-range', from: '2026-06-25', to: '2026-06-25' })).toBeNull()
  })

  it('reports no issue for the kinds that have no range', () => {
    const kinds: ColumnFilterValue[] = [
      { kind: 'text', value: 'x' },
      { kind: 'select', value: null },
      { kind: 'multi-select', values: [] },
      { kind: 'boolean', value: false },
    ]
    for (const value of kinds) expect(columnFilterIssue(value)).toBeNull()
  })

  it('throws rather than emitting a spec that silently matches nothing', () => {
    expect(() => toFilterSpec('trips', { kind: 'number-range', min: 500, max: 100 })).toThrow(
      /range-inverted/,
    )
  })
})

describe('date range — the inclusive end day, in Riyadh', () => {
  it('emits instants, not bare days, with an explicit +03:00 offset', () => {
    expect(toFilterSpec('createdAt', { kind: 'date-range', from: '2026-06-25', to: '2026-06-30' })).toEqual(
      {
        field: 'createdAt',
        op: 'between',
        value: ['2026-06-25T00:00:00+03:00', '2026-06-30T23:59:59.999+03:00'],
      },
    )
  })

  it('opens at the start of the day and closes at the last millisecond of it', () => {
    expect(toFilterSpec('createdAt', { kind: 'date-range', from: '2026-06-25', to: null })).toEqual({
      field: 'createdAt',
      op: 'gte',
      value: '2026-06-25T00:00:00+03:00',
    })
    expect(toFilterSpec('createdAt', { kind: 'date-range', from: null, to: '2026-06-30' })).toEqual({
      field: 'createdAt',
      op: 'lte',
      value: '2026-06-30T23:59:59.999+03:00',
    })
  })

  it('emits nothing when the picker is untouched', () => {
    expect(toFilterSpec('createdAt', { kind: 'date-range', from: null, to: null })).toBeNull()
  })

  it('rejects a full instant where a calendar day belongs', () => {
    expect(() =>
      toFilterSpec('createdAt', { kind: 'date-range', from: '2026-06-25T09:14:00+03:00', to: null }),
    ).toThrow(/calendar days/)
  })

  it('rejects a stored legacy display string', () => {
    // `eyvar_ops_panel_v40_fixed.html:2676` stores `'25 Jun 07:00'`, which
    // `Date.parse` happily turns into a plausible wrong date.
    expect(() =>
      toFilterSpec('createdAt', { kind: 'date-range', from: '25 Jun 07:00', to: null }),
    ).toThrow(/calendar days/)
  })

  it('spans a DST boundary elsewhere in the world without moving, because it is built as a string', () => {
    // 29 March 2026 is when Europe springs forward. Riyadh does not, and this
    // helper never constructs a host-local Date, so the bounds are fixed.
    expect(toFilterSpec('createdAt', { kind: 'date-range', from: '2026-03-28', to: '2026-03-30' })).toEqual(
      {
        field: 'createdAt',
        op: 'between',
        value: ['2026-03-28T00:00:00+03:00', '2026-03-30T23:59:59.999+03:00'],
      },
    )
  })
})

describe('the emitted bounds compare correctly as instants', () => {
  // Any engine — the mock's `numeric()` and every SQL date comparison — orders
  // these by instant. These are the four rows the boundary has to get right.
  const bounds = (): [number, number] => {
    const spec = toFilterSpec('createdAt', { kind: 'date-range', from: '2026-06-25', to: '2026-06-30' })
    const value = spec?.value
    expect(Array.isArray(value)).toBe(true)
    const [from, to] = value as [string, string]
    return [Date.parse(from), Date.parse(to)]
  }

  it('includes an instant late on the final day — the bug a bare end date would cause', () => {
    const [, upper] = bounds()
    expect(Date.parse('2026-06-30T22:45:00+03:00')).toBeLessThanOrEqual(upper)
    // A bare `2026-06-30` upper bound is midnight **UTC** — 03:00 Riyadh — and
    // would have excluded that row and the whole working day behind it.
    expect(Date.parse('2026-06-30T22:45:00+03:00')).toBeGreaterThan(Date.parse('2026-06-30'))
  })

  it('includes a bare calendar day stored on either end of the range', () => {
    const [lower, upper] = bounds()
    expect(Date.parse('2026-06-25')).toBeGreaterThanOrEqual(lower)
    expect(Date.parse('2026-06-30')).toBeLessThanOrEqual(upper)
  })

  it('excludes the instant just before the opening midnight and just after the closing one', () => {
    const [lower, upper] = bounds()
    expect(Date.parse('2026-06-24T23:00:00+03:00')).toBeLessThan(lower)
    expect(Date.parse('2026-07-01T00:10:00+03:00')).toBeGreaterThan(upper)
  })
})

describe('formatColumnFilterBounds — §9.2, the calendar and digits trap', () => {
  it('formats a date range in Gregorian Latin digits in Arabic', () => {
    const value: ColumnFilterValue = { kind: 'date-range', from: '2026-06-25', to: '2026-06-30' }
    const arabic = formatColumnFilterBounds(value, 'ar')
    // Gregorian: the year is 2026, not 1447. Latin: `2026`, not `٢٠٢٦`.
    expect(arabic?.from).toContain('2026')
    expect(arabic?.from).toMatch(/25/)
    expect(arabic?.to).toMatch(/30/)
    expect(arabic?.from).not.toMatch(/[٠-٩]/)
    expect(arabic?.to).not.toMatch(/1447/)
  })

  it('formats the same range in English with the same digits', () => {
    const value: ColumnFilterValue = { kind: 'date-range', from: '2026-06-25', to: '2026-06-30' }
    expect(formatColumnFilterBounds(value, 'en')).toEqual({ from: '25 Jun 2026', to: '30 Jun 2026' })
  })

  it('renders a money range through formatMoney, so halalas never surface as a count', () => {
    expect(
      formatColumnFilterBounds({ kind: 'number-range', min: 10_000, max: 50_000, unit: 'money' }),
    ).toEqual({ from: '100.00 SAR', to: '500.00 SAR' })
  })

  it('renders a count range with grouping and no currency', () => {
    expect(formatColumnFilterBounds({ kind: 'number-range', min: 1_000, max: 4_218 })).toEqual({
      from: '1,000',
      to: '4,218',
    })
  })

  it('leaves an open end as null rather than inventing copy for it', () => {
    expect(formatColumnFilterBounds({ kind: 'number-range', min: null, max: 50 })).toEqual({
      from: null,
      to: '50',
    })
  })

  it('returns null for a kind that has no range', () => {
    expect(formatColumnFilterBounds({ kind: 'text', value: 'x' })).toBeNull()
    expect(formatColumnFilterBounds({ kind: 'boolean', value: true })).toBeNull()
  })
})

describe('guards', () => {
  it('refuses a blank field name', () => {
    expect(() => toFilterSpec('  ', { kind: 'text', value: 'x' })).toThrow(/non-empty field/)
  })
})
