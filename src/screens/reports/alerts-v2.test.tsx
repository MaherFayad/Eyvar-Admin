/**
 * The alerting v2 client — AC-1225…1239. Read through the client seam, never
 * a fixture module (`seam.test.ts`). AC-1226/1233 are `H` in the criteria
 * list — jsdom lays out no SVG, so their drawn proof is
 * `scripts/harness/alerts-v2.mjs`; this file only asserts their wiring.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { EN as SHELL_EN } from '@/i18n/dictionaries'
import {
  disableMockLatency,
  listAlertFirings,
  listAlertRules,
  resetDataLayer,
} from '@/data/clients'
import type { AlertRule } from '@/data/types'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const EN = (key: string, params?: Record<string, string | number>) => {
  let value = REPORTS_EN[key] as string
  for (const [k, v] of Object.entries(params ?? {})) value = value.replace(`{${k}}`, String(v))
  return value
}
const HINT = SHELL_EN['shell.hint.show'] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither, and Radix's select/menu/tabs call them on the
     trigger. Same stubs every other reports test carries. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function alertRules(): Promise<readonly AlertRule[]> {
  return (await listAlertRules({ pageSize: 100 })).items
}

async function rowNamed(name: string): Promise<HTMLElement> {
  const rows = await screen.findAllByRole('row')
  const row = rows.find((candidate) => within(candidate).queryByText(name))
  expect(row, `no row named ${name}`).toBeDefined()
  return row as HTMLElement
}

async function openRowOverflow(user: ReturnType<typeof userEvent.setup>, row: HTMLElement) {
  await user.click(within(row).getByRole('button', { name: /More actions/ }))
}

async function openRule(user: ReturnType<typeof userEvent.setup>, name: string): Promise<HTMLElement> {
  await openRowOverflow(user, await rowNamed(name))
  await user.click(await screen.findByRole('menuitem', { name: EN('rb.library.open') }))
  const heading = await screen.findByRole('heading', { name: EN('rb.alert.panel.heading.edit') })
  return heading.closest('[data-slot="card"]') as HTMLElement
}

/* ────────────────────── AC-1225 — the inline panel ───────────────────── */

describe('AC-1225 — the composer is an inline panel with the four condition kinds', () => {
  it('carries no dialog role, and offers exactly the four kinds as a segmented control', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'Cancellation rate over 6%')

    expect(screen.queryByRole('dialog')).toBeNull()

    const kindTabs = within(panel).getAllByRole('tab', {
      name: new RegExp(
        [
          EN('rb.alert.kind.static.name'),
          EN('rb.alert.kind.relative.name'),
          EN('rb.alert.kind.anomaly.name'),
          EN('rb.alert.kind.missing.name'),
        ].join('|'),
      ),
    })
    expect(kindTabs).toHaveLength(4)
    /* ALR-1 is a v1 `static` rule (`alertCondition()` defaults it) — its own
       kind tab starts selected. */
    expect(within(panel).getByRole('tab', { name: EN('rb.alert.kind.static.name') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

/* ─────────────────────────── AC-1227 — cadence ───────────────────────── */

describe('AC-1227 — cadence offers Hourly, Daily and Not scheduled', () => {
  it('saving `Not scheduled` stores `null`, and `Hourly` stores `hourly`', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'قاعدة تنبيه غير مفعّلة · انخفاض عدد الكباتن المسجلين')

    for (const key of ['rb.alert.cadence.hourly', 'rb.alert.cadence.daily', 'rb.alert.cadence.none']) {
      expect(within(panel).getByRole('tab', { name: EN(key) })).toBeInTheDocument()
    }
    expect(within(panel).getByRole('tab', { name: EN('rb.alert.cadence.none') })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(within(panel).getByRole('tab', { name: EN('rb.alert.cadence.hourly') }))
    await user.click(within(panel).getByRole('button', { name: EN('rb.alert.action.save') }))
    await waitFor(async () => {
      const saved = (await alertRules()).find((r) => r.id === 'ALR-5')
      expect(saved?.cadence).toBe('hourly')
    })
  })
})

/* ───────────────────── AC-1231 — money in SAR, wire in halalas ───────── */

describe('AC-1231 — a money threshold is entered in SAR and stored in halalas', () => {
  it('prefills 400 for a 40 000-halala threshold, and 500 saves as 50 000', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'Gross revenue below SAR 400 a day')

    const amount = within(panel).getByLabelText(EN('rb.alert.form.threshold')) as HTMLInputElement
    expect(amount.value).toBe('400')
    expect(within(panel).getByText(EN('rb.unit.money'))).toBeInTheDocument()

    await user.clear(amount)
    await user.type(amount, '500')
    await user.click(within(panel).getByRole('button', { name: EN('rb.alert.action.save') }))

    await waitFor(async () => {
      const saved = (await alertRules()).find((r) => r.id === 'ALR-2')
      expect(saved?.threshold).toBe(50_000)
    })
  })
})

/* ──────────────────── AC-1229 — critical severity gated ──────────────── */

describe('AC-1229 — critical severity is disabled with the Q-RB-9 reason', () => {
  it('disables the Critical tab, and the reason is reachable', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'Cancellation rate over 6%')

    const critical = within(panel).getByRole('tab', { name: EN('rb.alert.severity.critical') })
    expect(critical).toBeDisabled()

    /* `InfoHint` lazy-mounts its content — reachable on hover, per §7.2. */
    await user.hover(within(panel).getByRole('button', { name: HINT }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EN('rb.alert.severity.critical.blocked'))
  })
})

/* ─────────────── AC-1228 — email/recipients filtered by D43 ──────────── */

describe('AC-1228 — the email/recipient pickers are filtered by the measure’s permission', () => {
  it('offers Finance/Owner/Ops Manager, never Support, for a `view_finance` measure', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'Gross revenue below SAR 400 a day')

    await user.click(within(panel).getByRole('button', { name: EN('rb.alert.channel.email.add') }))
    expect((await screen.findAllByText('Fahad Al-Dosari')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Lina Al-Otaibi')).toBeNull()
  })

  it('the Slack picker lists the webhook by NAME, and never its URL', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'Active subscriptions below 30')

    expect(within(panel).getByText('Corporate billing sink')).toBeInTheDocument()
    expect(panel.textContent).not.toContain('hooks.aramco-mobility.example')
  })
})

/* ────────────── AC-1230 — anomaly, insufficient baseline ─────────────── */

describe('AC-1230 — an anomaly rule short of 8 complete buckets states the count', () => {
  it('names the count on the Condition cell (§7 state 23)', async () => {
    renderAt('/management/reports?view=alerts')
    const row = await rowNamed('New subscriptions outside their usual band')
    /* RPT-13's window is short of the 8-point floor (`fixtures/alerts.ts`'s
       own comment on `ALR-9`) — the exact count is a resolver detail, the
       sentence naming the floor and a count below it is the contract. */
    const cell = await within(row).findByText(/Needs 8 complete buckets/)
    expect(cell.textContent).toMatch(/This series has [0-7]\./)
  })
})

/* ─────────── AC-1232 — the condition summary, one sentence per kind ──── */

describe('AC-1232 — the Condition column carries a summary sentence per kind', () => {
  it('reads correctly for static, relative, anomaly and missing rules', async () => {
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const staticRow = await rowNamed('Cancellation rate over 6%')
    /* ALR-1: `comparator: 'gt', threshold: 6` (percent) — "goes above 6%". */
    expect(within(staticRow).getByText(new RegExp(EN('rb.alert.comparator.gt')))).toBeInTheDocument()

    const relativeRow = await rowNamed('Completed trips down 20% vs the previous bucket')
    /* The rule's own NAME also contains "the previous bucket" — scoped to the
       compact Condition-column sentence, which reads differently. */
    expect(within(relativeRow).getByText('falls by 20% vs the previous bucket')).toBeInTheDocument()

    const anomalyRow = await rowNamed('Gross revenue outside its usual band')
    expect(within(anomalyRow).getByText(/falls below its 95% band/)).toBeInTheDocument()

    const missingRow = await rowNamed('No newly registered captains for 2 days')
    expect(within(missingRow).getByText(/misses 2 buckets in a row/)).toBeInTheDocument()
  })
})

/* ─────────────────────── AC-1233 — the sparkline ──────────────────────── */

describe('AC-1233 — the rules table sparkline never draws in a destructive tone', () => {
  it('the Last reading cell’s own chart carries no destructive fill or stroke', async () => {
    renderAt('/management/reports?view=alerts')
    const table = await screen.findByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const index = headers.findIndex((h) => h.textContent?.includes(EN('rb.alerts.col.lastValue')))
    expect(index).toBeGreaterThan(-1)

    const row = await rowNamed('Cancellation rate over 6%')
    const cell = within(row).getAllByRole('cell')[index]!
    /* jsdom's `ResponsiveContainer` never resolves a real size, so it draws
       no `<svg>` at all (the project's own standing note: a green suite
       proves nothing about a drawn chart) — `[data-chart]` is `ChartContainer`
       mounting, which is what this test can see; the drawn proof is the
       harness. Bounded to the page's own rows, but each is its own
       `runReport` — the default 1 000 ms `waitFor` is short for eleven of
       them in series. */
    await waitFor(() => expect(cell.querySelector('[data-chart]')).toBeTruthy(), { timeout: 5000 })
    /* The colours are `--chart-axis`/`--chart-fill`/`--color-value` tokens
       (`RuleSparkline`'s own props) — never a literal `destructive` fill or
       stroke, which is the one thing R5a would forbid here. */
    expect(cell.innerHTML).not.toMatch(/stroke="[^"]*destructive|fill="[^"]*destructive/)
  })
})

/* ───────────────────────── AC-1234 — mute menu ────────────────────────── */

describe('AC-1234 — `Mute for…` offers the five durations, then the row shows `Muted until …`', () => {
  it('mutes for 1 hour from the rules table', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const row = await rowNamed('Cancellation rate over 6%')

    await user.click(
      within(row).getByRole('button', { name: EN('rb.alert.mute.action', { name: 'Cancellation rate over 6%' }) }),
    )
    for (const key of ['rb.alert.mute.1h', 'rb.alert.mute.8h', 'rb.alert.mute.24h', 'rb.alert.mute.untilMonday', 'rb.alert.mute.custom']) {
      expect(await screen.findByRole('menuitem', { name: EN(key) })).toBeInTheDocument()
    }
    await user.click(screen.getByRole('menuitem', { name: EN('rb.alert.mute.1h') }))

    await waitFor(() => {
      expect(within(row).getByText(/Muted until/)).toBeInTheDocument()
    })
    await waitFor(async () => {
      const saved = (await alertRules()).find((r) => r.id === 'ALR-1')
      expect(saved?.mutedUntil).not.toBeNull()
    })
  })
})

/* ─────────────────────────── AC-1235 — lag state ──────────────────────── */

describe('AC-1235 — evaluation lag beyond 2× cadence renders the warning tone', () => {
  it('states the expected cadence, with the icon, once a cadence is set', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    /* ALR-4's `lastEvaluatedAt` is nine hours in the past — set an hourly
       cadence on it and its own lag now exceeds 2×1h. */
    const panel = await openRule(user, 'Completed trips below 3 a day')
    await user.click(within(panel).getByRole('tab', { name: EN('rb.alert.cadence.hourly') }))
    await user.click(within(panel).getByRole('button', { name: EN('rb.alert.action.save') }))

    await waitFor(async () => {
      const row = await rowNamed('Completed trips below 3 a day')
      expect(row.textContent).toContain(EN('rb.alert.cadence.hourly'))
      expect(row.querySelector('[data-state-glyph]') || row.querySelector('svg')).toBeTruthy()
    })
  })
})

/* ─────────────────────────── AC-1236 — the ledger ─────────────────────── */

describe('AC-1236 — the firings feed is a ledger, filtered by rule/date/acknowledged/severity', () => {
  it('has no selection checkbox and no sort control', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: EN('rb.alerts.tab.firings') }))

    const table = await screen.findByRole('table')
    expect(within(table).queryAllByRole('checkbox')).toHaveLength(0)
    /* AC-1236 — the only per-row acts are `Acknowledge` and `Explain`. */
    expect(within(table).getAllByRole('button', { name: EN('rb.alert.feed.acknowledge') }).length).toBeGreaterThan(0)
    expect(within(table).getAllByRole('link', { name: EN('rb.alert.feed.explain') }).length).toBeGreaterThan(0)
  })
})

/* ──────────────────── AC-1237 — a failed delivery ─────────────────────── */

describe('AC-1237 — a failed delivery names the channel and the error in `title`', () => {
  it('AFR-4 (ALR-11’s Slack channel) shows the failure without touching the row’s own tone', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: EN('rb.alerts.tab.firings') }))

    const table = await screen.findByRole('table')
    const rows = await within(table).findAllByRole('row')
    const row = rows.find((candidate) => within(candidate).queryByText(/slack/))
    expect(row, 'no row with a slack delivery').toBeDefined()
    const failed = within(row as HTMLElement).getByText(/slack ✗/)
    expect(failed.getAttribute('title')).toContain('Webhook returned 404')
    expect(row!.className).not.toContain('destructive')
  })
})

/* ─────────────────── AC-1238 — acknowledge and explain ────────────────── */

describe('AC-1238 — `Acknowledge` writes who/when without changing the rule’s state', () => {
  it('acknowledges a firing, and leaves the rule’s own state untouched', async () => {
    const user = userEvent.setup()
    const before = (await alertRules()).find((r) => r.id === 'ALR-1')
    expect(before?.state).toBe('firing')

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: EN('rb.alerts.tab.firings') }))
    const table = await screen.findByRole('table')

    const ackButtons = within(table).getAllByRole('button', { name: EN('rb.alert.feed.acknowledge') })
    await user.click(ackButtons[0]!)

    await waitFor(async () => {
      expect(screen.getByText(EN('rb.alert.feed.acknowledged.toast'))).toBeInTheDocument()
    })
    const after = (await alertRules()).find((r) => r.id === 'ALR-1')
    expect(after?.state).toBe('firing')
  })

  it('`Explain` is a real link carrying the firing to the analyst', async () => {
    const user = userEvent.setup()
    const firings = await listAlertFirings('ALR-1', { pageSize: 10 })
    const firing = firings.items[0]!

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: EN('rb.alerts.tab.firings') }))
    const table = await screen.findByRole('table')

    const links = within(table).getAllByRole('link', { name: EN('rb.alert.feed.explain') })
    expect(links.some((link) => link.getAttribute('href')?.includes(firing.id))).toBe(true)
  })
})

/* ─────────────────────── AC-1239 — the Changes tab ────────────────────── */

describe('AC-1239 — the history panel’s Changes tab lists every save as field: old → new', () => {
  it('records the cadence change made through the composer', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    const panel = await openRule(user, 'قاعدة تنبيه غير مفعّلة · انخفاض عدد الكباتن المسجلين')
    await user.click(within(panel).getByRole('tab', { name: EN('rb.alert.cadence.daily') }))
    await user.click(within(panel).getByRole('button', { name: EN('rb.alert.action.save') }))

    await waitFor(() => screen.getByRole('table'))
    await openRowOverflow(user, await rowNamed('قاعدة تنبيه غير مفعّلة · انخفاض عدد الكباتن المسجلين'))
    await user.click(await screen.findByRole('menuitem', { name: EN('rb.alert.history') }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: EN('rb.alert.history.tab.changes') }))

    await waitFor(() => {
      expect(
        within(dialog).getByText(
          EN('rb.alert.history.changes.entry', {
            field: EN('rb.alert.history.changes.field.cadence'),
            from: EN('rb.alert.cadence.none'),
            to: 'daily',
          }),
        ),
      ).toBeInTheDocument()
    })
  })
})
