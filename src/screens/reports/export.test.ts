/**
 * `export.ts` — CSV serialisation and the shared export audit call (AC-1160).
 * PNG rendering itself is `chartPng.ts`'s, proven in `chartPng.test.ts` and a
 * harness; this file only proves the CSV text and the `track` call both formats
 * share.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { recentEvents, resetAnalytics } from '@/lib/analytics'
import type { ReportCsv } from '@/data/types'
import { auditExport, reportCsvToText } from './export'

function baseCsv(overrides: Partial<ReportCsv['header']> = {}): ReportCsv {
  return {
    header: {
      reportName: 'Weekly gross fares',
      windowFrom: '2026-06-01',
      windowTo: '2026-06-30',
      grain: 'week',
      periodComparison: 'previous-period',
      filters: [],
      asOf: '2026-06-30T09:14:00Z',
      omittedSeries: [],
      ...overrides,
    },
    rows: [],
  }
}

beforeEach(() => resetAnalytics())

describe('reportCsvToText', () => {
  it('writes a string comparison as-is', () => {
    const text = reportCsvToText(baseCsv({ periodComparison: 'previous-quarter' }))
    expect(text).toContain('"comparison","previous-quarter"')
  })

  it('writes a fixed comparison as a machine-readable range, not the object', () => {
    const text = reportCsvToText(
      baseCsv({ periodComparison: { kind: 'fixed', from: '2026-01-01', to: '2026-01-31' } }),
    )
    expect(text).toContain('"comparison","fixed:2026-01-01..2026-01-31"')
  })

  it('quotes an embedded comma and doubles an embedded quote (RFC 4180)', () => {
    const text = reportCsvToText(baseCsv({ reportName: 'Riyadh, "peak" fares' }))
    expect(text).toContain('"report","Riyadh, ""peak"" fares"')
  })
})

describe('auditExport — AC-1160', () => {
  it('records one event naming the format, the report, the window and the filters', () => {
    auditExport({
      format: 'csv',
      reportName: 'Weekly gross fares',
      windowFrom: '2026-06-01',
      windowTo: '2026-06-30',
      filters: [{ field: 'city', op: 'eq', value: 'RUH' }],
    })
    const events = recentEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      name: 'reports.export',
      props: {
        format: 'csv',
        reportName: 'Weekly gross fares',
        windowFrom: '2026-06-01',
        windowTo: '2026-06-30',
      },
    })
    expect(String(events[0]?.props.filters)).toContain('city')
  })

  it('records a PNG export as its own event, format "png"', () => {
    auditExport({
      format: 'png',
      reportName: null,
      windowFrom: '2026-06-01',
      windowTo: '2026-06-30',
      filters: [],
    })
    expect(recentEvents()[0]).toMatchObject({ name: 'reports.export', props: { format: 'png', reportName: '' } })
  })
})
