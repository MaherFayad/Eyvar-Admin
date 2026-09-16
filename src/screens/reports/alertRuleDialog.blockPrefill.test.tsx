/**
 * `04-alerting-v2.md` §4 — a page's report block opens the composer with the
 * report and its first current series prefilled, via `AlertRuleDialog`'s own
 * `firstSeriesId` effect. Proves the `presetReportId`-with-no-`presetSeriesId`
 * path, previously untested.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getAlertRule, resetDataLayer } from '@/data/clients'
import { AlertRuleDialog } from './AlertRuleDialog'
import { REPORTS_EN } from './copy'

function t(key: string, params?: Record<string, string | number>): string {
  let value = (REPORTS_EN[key] as string | undefined) ?? key
  for (const [k, v] of Object.entries(params ?? {})) value = value.replaceAll(`{${k}}`, String(v))
  return value
}
t.plural = (key: string, params: Record<string, string | number>) => t(key, params)

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})


describe('a page block’s "Create alert…" prefills the series, not just the report', () => {
  it('defaults the series select to the report’s first legal current series', async () => {
    render(
      <AlertRuleDialog
        open
        onOpenChange={() => {}}
        rule={null}
        presetReportId="RPT-1"
        onSaved={() => {
          throw new Error('nothing saves itself — the operator must click Save')
        }}
        today="2026-06-25"
        t={t}
        language="en"
      />,
    )

    // The report, resolved from `presetReportId`.
    await waitFor(() => expect(screen.getByText('Captains vs riders · 30 days')).toBeInTheDocument())

    // `captains.registered` is `query.measures[0]` (reports.ts) with no
    // `groupBy`, so its `#_#current` series is `seriesOptions[0]` —
    // `firstSeriesId` — and the trigger shows its label, not the "Series"
    // placeholder `AlertRuleDialog.tsx:578` falls back to when `seriesId` is
    // still `''`.
    await waitFor(() => expect(document.getElementById('rb-alert-series')?.textContent).toBe('Registered captains'))
  })

  it('does not overwrite an existing rule’s own series with the report’s first one', async () => {
    /* Read through the client seam, never the fixture file (seam.test.ts). */
    const alr10 = (await getAlertRule('ALR-10')).data

    render(
      <AlertRuleDialog
        open
        onOpenChange={() => {}}
        rule={alr10}
        presetReportId="RPT-1"
        onSaved={() => {
          throw new Error('nothing saves itself — the operator must click Save')
        }}
        today="2026-06-25"
        t={t}
        language="en"
      />,
    )

    await waitFor(() => expect(screen.getByText('Captains vs riders · 30 days')).toBeInTheDocument())

    // ALR-10's own `seriesId` is `riders.registered#_#current` — the
    // SECOND measure, never the first — so seeing it confirms the
    // `rule !== null` guard on the prefill effect held, not merely that
    // the effect never ran.
    await waitFor(() => expect(document.getElementById('rb-alert-series')?.textContent).toBe('Registered riders'))
  })
})
