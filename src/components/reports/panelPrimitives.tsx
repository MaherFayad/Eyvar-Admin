/**
 * WP-8.4 §5 — the pure half of `SeriesChart.tsx` / `PanelCard.tsx`: no mark,
 * no `recharts` import, so a caller of a title, a colour or a numeral never
 * loads a chart to get one. Fixes the "reachable both ways" chain named in
 * `docs/09-analytics-v2/handoffs/performance.md` (`ResultCanvas`, `KpiCard`).
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { DashboardIcon } from '@/components/icons'
import { findSubTabById, OTHER_GROUP } from '@/data/clients'
import type { CurrencyCode, Measure, MetricUnit, ReportPanel } from '@/data/types'
import { type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { splitMetricValue } from '@/components/metrics/formatMetric'

/* ─────────────────────── SeriesChart's series identity ───────────────────── */

/**
 * The six categorical stops, in draw order, plus v2's `--chart-s7`/`-s8`
 * (`docs/09-analytics-v2/02-report-builder-v2.md` §4.8). Kept identical to
 * `SeriesChart.tsx`'s own copy before the move — see that file's header for
 * why eight and not more.
 */
const SERIES_STOPS = [
  'var(--chart-s1)',
  'var(--chart-s2)',
  'var(--chart-s3)',
  'var(--chart-s4)',
  'var(--chart-s5)',
  'var(--chart-s6)',
  'var(--chart-s7)',
  'var(--chart-s8)',
] as const

/** The one lookup the dot, the line and the legend chip all share, so they
 * cannot drift. Wraps past eight rather than throwing (`foldedGroupCount`
 * keeps that rare); see `SeriesChart.tsx`'s file header for the derivation. */
export function seriesColor(index: number): string {
  return SERIES_STOPS[index % SERIES_STOPS.length] ?? SERIES_STOPS[0]
}

/** Past eight series the second lap is dotted (`1 3`), never the
 * comparison's `4 3` — the two cannot co-occur (§4.8). */
export function seriesDash(index: number): string | undefined {
  return index < SERIES_STOPS.length ? undefined : '1 3'
}

/** The legend's toggle id for the comparison entry — it toggles as one unit (§2.1). */
export const COMPARISON_SERIES_ID = '__comparison__'

/* ────────────────────────── PanelCard's frame and title ──────────────────── */

/** The panel's outer surface — a `Card`, or the unframed branch: no
 * `data-slot="card"`, so a caller that already drew a frame counts one, not
 * two. See `PanelCard.tsx`'s file header for the full derivation. */
export function PanelFrame({
  framed,
  className,
  children,
}: {
  framed: boolean
  className?: string
  children: ReactNode
}) {
  if (framed) return <Card className={className}>{children}</Card>
  return (
    <div
      data-slot="panel-frame"
      className={cn(
        'flex flex-col gap-(--card-spacing) text-sm text-card-foreground',
        '[--card-spacing:--spacing(3)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * §7.4's fold, named rather than string-matched. `Other` is always last and
 * **renders even at zero**, so it is visible that something was folded; the
 * canvas states how many.
 */
export function panelTitle(panel: ReportPanel, t: Translator): { text: string; groupValue: string | null } {
  const measureLabel = t(String(panel.titleParams['measure'] ?? ''))
  const group = panel.titleParams['group']
  if (group === undefined) return { text: t(panel.titleKey, { measure: measureLabel }), groupValue: null }
  const groupValue = String(group)
  const groupLabel = groupValue === OTHER_GROUP ? t('rb.panel.other') : groupValue
  return {
    text: t(panel.titleKey, { measure: measureLabel, group: groupLabel }),
    groupValue: groupLabel,
  }
}

/* ─────────────────────── §A12 — the real back-reference ──────────────────── */

/** One board this measure is already displayed on. Resolved, never guessed. */
export interface RelatedBoard {
  subTabId: string
  path: string
  titleKey: string
}

/**
 * **`displayedAsMetricKeys` → the boards that show this measure.**
 *
 * See `PanelCard.tsx`'s file header for the full derivation (Amplitude's
 * similarity model, refused, and F-9's real back-reference instead);
 * unchanged by the move.
 */
export function relatedBoards(measure: Measure | null): RelatedBoard[] {
  if (measure === null) return []
  const seen = new Set<string>()
  const out: RelatedBoard[] = []
  for (const metricKey of measure.displayedAsMetricKeys) {
    const segments = metricKey.split('.')
    if (segments.length < 2) continue
    const subTabId = `${segments[0]}-${segments[1]}`
    if (seen.has(subTabId)) continue
    const route = findSubTabById(subTabId)
    if (route === null) continue
    seen.add(subTabId)
    out.push({ subTabId, path: route.path, titleKey: route.titleKey })
  }
  return out
}

/**
 * The strip itself — small cards, one per board, each a real anchor. See
 * `PanelCard.tsx`'s file header for why an anchor and not a `div` `onClick`.
 */
export function RelatedBoards({ boards, t }: { boards: readonly RelatedBoard[]; t: Translator }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">{t('rb.related.heading')}</p>
      <ul role="list" className="flex list-none flex-wrap gap-2">
        {boards.map((board) => (
          <li key={board.subTabId}>
            <Link
              to={board.path}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <DashboardIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{t(board.titleKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────────────── the KPI/panel numeral and prose ─────────────────── */

/**
 * **The panel's headline quantity — one component, both panel shapes.**
 *
 * See `PanelCard.tsx`'s file header for the two-rung derivation and its
 * measurements; unchanged by the move.
 */
export function PanelNumeral({
  value,
  unit,
  currency,
  framed,
  language,
  children,
}: {
  /** Already rolled up by the caller, under a rule the caller can defend. `null` is an em dash. */
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  /** The builder-versus-tile signal — it picks the rung. */
  framed: boolean
  language: Language
  /** On the numeral's baseline, after the unit. A delta, or nothing. */
  children?: ReactNode
}) {
  const shown = splitMetricValue(value, unit, currency, language)
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span
        data-slot="metric-value"
        className={cn('font-semibold text-foreground', framed ? 'text-kpi' : 'text-lg')}
      >
        <bdi>{shown.value}</bdi>
      </span>
      {shown.unit && <span className="text-2xs text-muted-foreground">{shown.unit}</span>}
      {children}
    </span>
  )
}

/**
 * **R5-15's three sentences, at the foot of the card.** See `PanelCard.tsx`'s
 * file header for the full derivation; unchanged by the move.
 */
export function PanelProse({
  predicate,
  caption,
  base,
}: {
  predicate: string
  /** `null` where the measure declares none — never an empty string. */
  caption: string | null
  /** `null` where there is no response to count readings in. */
  base: string | null
}) {
  return (
    <p data-slot="panel-population" className="text-xs text-muted-foreground">
      <bdi>{predicate}</bdi>
      {caption !== null && <> <bdi>{caption}</bdi></>}
      {base !== null && <> <bdi>{base}</bdi></>}
    </p>
  )
}
