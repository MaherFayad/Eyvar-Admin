/**
 * **The canvas for the three modes whose result is not a set of axes** — the
 * funnel cascade, the retention matrix and the journey tree.
 *
 * ```
 *  Result                                  Computed 25 Jun 09:14
 *  · These rungs count totals, not people…    ← stated, never silent
 *  ┌────────────────────────────────────────────────────────────┐
 *  │ 1  Riders who joined            1 240      100 %           │
 *  │    ███████████████████████████████████████████████████     │
 *  │ 2  Trips completed                412       33 %  ▼ 67 %   │
 *  │    ████████████████                                        │
 *  └────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## It renders a `ReportResult` and nothing else
 *
 * There is no funnel-shaped payload and no cohort-shaped payload: a rung, a
 * retention column and a path are all `ReportSeries` (see `resolveReport.ts`).
 * **Conversion, drop-off and share are computed here**, from `points`, and are
 * deliberately not on the wire — a second copy of a derived number is a second
 * number that can disagree with the one above it.
 *
 * ## The four states are `ResultCanvas`'s four states
 *
 * `status` is the same `CanvasStatus` and every branch means the same thing, so
 * switching mode never changes what *loading* or *error* looks like. Only the
 * content branch differs, and it differs because the shape of the answer does.
 *
 * ## Colour
 *
 * `--chart-series` and `--chart-fill`, the two the product has. §6.2 **D-12**
 * (a categorical palette) is open and the designer recommends declining it, so
 * nothing here needs a second hue: a cascade is one measure narrowing and a
 * retention matrix is one number at different strengths. **The matrix encodes
 * strength as bar length inside the cell rather than as a colour ramp**, because
 * a ramp is a sequential palette and no sequential palette has been minted —
 * inventing one here is exactly the drift `tokens.md` exists to stop. It is
 * named in the handoff.
 *
 * Rules applied
 *   `states.md` content · empty · loading · error, none a TODO.
 *   R5a         no red. A drop-off is a fact, not an error, and it is carried
 *               by the word and the number (AC-885's reasoning, applied here).
 *   R5-15       every percentage renders next to the count it is a percentage
 *               of, and a cohort row names its own size.
 *   §9.1        `inline-size` and logical padding; the bars grow from the start
 *               edge in both directions.
 *   §7.1        every table is a real `<table>` with a header row, so the
 *               numbers are navigable and announced.
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import type { CanvasStatus } from '@/components/reports'
import { OTHER_GROUP } from '@/data/clients'
import { reportMode, type Measure, type QueryViolation, type ReportResult } from '@/data/types'
/* Deep import, NOT the `@/components/metrics` barrel. The barrel also exports
   `TrendChart`, which pulls recharts -- a 337 kB chunk (104 kB gzip) that then
   loads on `/management/reports` where no chart renders. `formatMetric.ts` has
   no React in it. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { formatDate, type Language, type Translator } from '@/lib'
import { Reasons } from './ReportModePanel'

/** The resolver's sentinel for *this subject did nothing after the root event*. */
const NO_PATH = '__none__'

export interface ReportModeCanvasProps {
  status: CanvasStatus
  /** Retained across a re-run and across an error, so the operator never loses the picture. */
  result: ReportResult | null
  /** True when the panel has been edited since `result` was computed (§8.3 state 2). */
  stale: boolean
  violations: readonly QueryViolation[]
  measuresByKey: Readonly<Record<string, Measure>>
  onRetry: () => void
  /** §3.7's sentence, passed in so it stays byte-identical with every board. */
  noDataSentence: string
  t: Translator
  language: Language
}

export function ReportModeCanvas({
  status,
  result,
  stale,
  violations,
  measuresByKey,
  onRetry,
  noDataSentence,
  t,
  language,
}: ReportModeCanvasProps) {
  return (
    <section
      aria-label={t('rb.canvas.heading')}
      className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      {status === 'unstarted' ? (
        /* R8's SECOND kind. One grey sentence — the data exists, the question
           has not been asked (AC-843). Worded for the mode, because *choose a
           measure* is not what a funnel is waiting for. */
        <EmptyState kind="no-match" message={t('rb.canvas.unstarted.mode')} />
      ) : status === 'loading' ? (
        <LoadingSkeleton pattern="P5" label={t('rb.canvas.loading')} />
      ) : status === 'error' ? (
        <ErrorState
          scope="card"
          message={t('rb.canvas.error')}
          action={{ label: t('rb.canvas.error.retry'), onClick: onRetry }}
        />
      ) : status === 'invalid' ? (
        <Card className="w-full py-0">
          <div role="alert" className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.canvas.invalid')}</p>
            <Reasons items={violations} t={t} />
          </div>
        </Card>
      ) : result ? (
        <>
          {/* Freshness and the way to change it in one control, identical to
              `ResultCanvas`'s — switching mode must not change where the
              refresh is. The sentence keeps its own `role="status"`; the
              button stays outside the live region. */}
          <div className="flex flex-wrap items-center gap-2">
            <p role={stale ? 'status' : undefined} className="text-xs text-muted-foreground">
              {stale
                ? t('rb.canvas.stale', {
                    time: formatDate(result.asOf, { style: 'day-month-time', language }),
                  })
                : t('rb.canvas.asOf', {
                    time: formatDate(result.asOf, { style: 'day-month-time', language }),
                  })}
            </p>
            <Button type="button" variant="ghost" size="xs" onClick={onRetry}>
              {t('rb.canvas.error.retry')}
            </Button>
          </div>
          <Conditions result={result} t={t} />
          <Body
            result={result}
            measuresByKey={measuresByKey}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        </>
      ) : null}
    </section>
  )
}

/**
 * Everything this result is required to admit, as sentences beside the result
 * they describe — never a page banner (R10 permits one and a dashboard holds
 * several results), never a toast (every one of these is a standing condition).
 */
function Conditions({ result, t }: { result: ReportResult; t: Translator }) {
  const lines: string[] = []
  if (result.warnings.includes('funnel-counted-not-followed')) lines.push(t('rb.warning.funnelCounted'))
  if (result.warnings.includes('mode-not-resolved')) lines.push(t('rb.warning.modeNotResolved'))
  if (result.warnings.includes('gaps-outside-fixture-range')) lines.push(t('rb.warning.gaps'))
  if (result.foldedGroupCount !== null) {
    lines.push(t('rb.warning.pathsFolded', { count: result.foldedGroupCount }))
  }
  if (result.truncated) {
    lines.push(t('rb.warning.truncated', { rows: result.truncatedAtRows ?? 0 }))
  }
  if (lines.length === 0) return null
  return (
    <ul className="flex list-none flex-col gap-0.5">
      {lines.map((line) => (
        <li key={line} className="text-xs text-muted-foreground">
          {line}
        </li>
      ))}
    </ul>
  )
}

function Body({
  result,
  measuresByKey,
  noDataSentence,
  t,
  language,
}: {
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  noDataSentence: string
  t: Translator
  language: Language
}) {
  const mode = reportMode(result.query)

  /* A blocked series carries no points at all (§13.1), so *this ran and found
     nothing* and *you may not see this* have to be told apart before either
     sentence is chosen. */
  const blocked = result.series.filter((s) => s.blocked !== null)
  const readable = result.series.filter((s) => s.blocked === null)

  if (result.series.length === 0) {
    return <NoData title={t(`rb.${mode}.heading`)} sentence={noDataSentence} t={t} />
  }

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle>{t(`rb.${mode}.heading`)}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {blocked.length > 0 && (
          /* Named, not omitted. The operator learns a rung exists and that they
             may not read it, which is a different fact from an empty funnel. */
          <ul className="flex list-none flex-col gap-0.5 pb-3">
            {blocked.map((series) => (
              <li key={series.id} className="text-sm text-muted-foreground">
                {t('rb.panel.blocked', { permission: series.blocked ?? '' })}
              </li>
            ))}
          </ul>
        )}

        {readable.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
        ) : mode === 'funnel' ? (
          <FunnelCascade result={result} measuresByKey={measuresByKey} t={t} language={language} />
        ) : mode === 'cohort' ? (
          <CohortMatrix result={result} noDataSentence={noDataSentence} t={t} language={language} />
        ) : (
          <JourneyTree
            result={result}
            measuresByKey={measuresByKey}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        )}
      </CardContent>
    </Card>
  )
}

/** AC-844 — the run returned nothing, in a card that keeps its title and frame. */
function NoData({ title, sentence }: { title: string; sentence: string; t: Translator }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="py-10 text-center text-sm text-muted-foreground">{sentence}</p>
      </CardContent>
    </Card>
  )
}

/* ──────────────────────────── the cascade ──────────────────────────────── */

/**
 * **One rung per step, in step order, with the drop-off between them.**
 *
 * Conversion is measured against the **first** rung and drop-off against the
 * **previous** one, and both are labelled as such — they are different numbers
 * and a cascade that shows one of them unlabelled is the reason funnel figures
 * get quoted wrongly. The bar's length is the conversion against the first
 * rung, so the picture and the right-hand number are the same fact.
 */
function FunnelCascade({
  result,
  measuresByKey,
  t,
  language,
}: {
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  t: Translator
  language: Language
}) {
  const rungs = result.series.filter((s) => s.blocked === null)
  const first = Number(rungs[0]?.points[0] ?? 0)

  return (
    <ol className="flex list-none flex-col gap-4">
      {rungs.map((series, index) => {
        /* `noUncheckedIndexedAccess` — a rung with no bucket at all is a
           different absence from a rung whose bucket has no reading, and both
           are `null` here on purpose: neither draws a bar. */
        const value = series.points[0] ?? null
        const previous = index === 0 ? null : Number(rungs[index - 1]?.points[0] ?? 0)
        const measure = measuresByKey[series.measureKey]
        /* `null` is *no reading*, and it is not zero. A rung outside a store's
           coverage draws no bar and says so, rather than drawing an empty one
           that reads as "nobody converted". */
        const conversion = value === null || first === 0 ? null : Math.round((value / first) * 100)
        const dropOff =
          value === null || previous === null || previous === 0
            ? null
            : Math.round((1 - value / previous) * 100)

        return (
          <li key={series.id} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium text-foreground">
                {t('rb.funnel.step', { position: index + 1 })}
                {' · '}
                {measure ? t(measure.labelKey) : series.measureKey}
              </span>
              <span className="flex items-baseline gap-3 text-sm">
                {/* The product's ONE value formatter — the same function a
                    metric tile, an axis tick and the result table use, so a
                    rung's number is formatted like every other number in the
                    product and `null` renders as the em dash rather than as a
                    zero (§8.3.1). */}
                <span className="font-medium text-foreground">
                  {formatMetricValue(value ?? null, series.unit, language)}
                </span>
                <span className="text-muted-foreground">
                  {conversion === null
                    ? t('rb.funnel.conversion.none')
                    : t('rb.funnel.conversion', {
                        percent: formatMetricValue(conversion, 'percent', language),
                      })}
                </span>
              </span>
            </div>

            {/* The track keeps its full width so the bars are comparable to one
                another and not just to themselves. */}
            <div className="h-2 w-full overflow-hidden rounded-sm bg-chart-fill">
              <div
                className="h-full bg-chart-series"
                /* Data-driven, so it is a style and not a class. `inlineSize`
                   rather than `width`: the bar grows from the start edge, which
                   is the right edge in Arabic (§9.1). */
                style={{ inlineSize: `${conversion ?? 0}%` }}
              />
            </div>

            {dropOff !== null && dropOff > 0 && (
              /* Not red. R5a permits red in four places and a drop-off is none
                 of them; the word carries the meaning. */
              <p className="text-xs text-muted-foreground">
                {t('rb.funnel.dropoff', {
                  percent: formatMetricValue(dropOff, 'percent', language),
                })}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ─────────────────────────── the retention matrix ──────────────────────── */

/**
 * **Cohorts down, age across.** One row per cohort, one column per interval.
 *
 * The size column is not decoration: a percentage of an unstated base is the
 * defect R5-15 exists to prevent, and `ReportResult.cohortSizes` is on the wire
 * for exactly this cell.
 */
function CohortMatrix({
  result,
  noDataSentence,
  t,
  language,
}: {
  result: ReportResult
  noDataSentence: string
  t: Translator
  language: Language
}) {
  const columns = result.series.filter((s) => s.blocked === null)
  const sizes = result.cohortSizes ?? []

  if (result.buckets.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
  }

  /* Σ(size × M1 %) ÷ Σ size — derived here rather than sent, so it cannot
     disagree with the matrix it summarises. */
  const m1 = columns.find((s) => s.groupValue === 'M1')
  const totalSize = sizes.reduce((sum, n) => sum + n, 0)
  const survived = m1
    ? sizes.reduce((sum, size, row) => sum + ((m1.points[row] ?? 0) / 100) * size, 0)
    : 0
  const overall = totalSize > 0 && m1 ? Math.round((survived / totalSize) * 100) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="p-2 text-start font-medium text-muted-foreground">
                {t('rb.cohort.col.cohort')}
              </th>
              <th scope="col" className="p-2 text-end font-medium text-muted-foreground">
                {t('rb.cohort.col.size')}
              </th>
              {columns.map((series) => (
                <th
                  key={series.id}
                  scope="col"
                  className="p-2 text-end font-medium text-muted-foreground"
                >
                  {series.groupValue}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.buckets.map((bucket, row) => (
              <tr key={bucket} className="border-b border-border last:border-b-0">
                <th scope="row" className="p-2 text-start font-medium text-foreground">
                  {formatDate(bucket, { style: 'day-month-year', language })}
                </th>
                <td className="p-2 text-end tabular-nums text-muted-foreground">
                  {formatMetricValue(sizes[row] ?? null, 'count', language)}
                </td>
                {columns.map((series) => {
                  const value = series.points[row] ?? null
                  return (
                    <td key={series.id} className="p-2 align-middle">
                      {value === null ? (
                        /* A cell nobody measured. `copy.md` rule 10: stated in
                           words, never left blank. */
                        <span className="block text-end text-xs text-muted-foreground">
                          {t('rb.cohort.cell.none')}
                        </span>
                      ) : (
                        <span className="flex flex-col items-end gap-1">
                          <span className="tabular-nums text-foreground">
                            {formatMetricValue(value, 'percent', language)}
                          </span>
                          <span className="h-1 w-12 overflow-hidden rounded-sm bg-chart-fill">
                            <span
                              className="block h-full bg-chart-series"
                              style={{ inlineSize: `${Math.max(0, Math.min(100, value))}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overall !== null && (
        <p className="text-xs text-muted-foreground">
          {t('rb.cohort.survival', {
            percent: formatMetricValue(overall, 'percent', language),
          })}
        </p>
      )}
    </div>
  )
}

/* ──────────────────────────── the journey tree ─────────────────────────── */

interface PathNode {
  measureKey: string
  subjects: number
  children: PathNode[]
}

/**
 * **A set of paths is a tree**, so the tree is built here by prefix rather than
 * sent. Each node carries the number of subjects whose path runs through it,
 * which is the sum of its own leaf and every leaf beneath it.
 *
 * Depth is expressed as nesting in a real `<ul>`, not as an indent computed
 * into a class: a nested list is what a screen reader announces as a hierarchy,
 * and it mirrors in Arabic without a single physical utility.
 */
function JourneyTree({
  result,
  measuresByKey,
  noDataSentence,
  t,
  language,
}: {
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  noDataSentence: string
  t: Translator
  language: Language
}) {
  const rows = result.series.filter((s) => s.blocked === null)
  const total = rows.reduce((sum, s) => sum + Number(s.points[0] ?? 0), 0)

  const roots: PathNode[] = []
  let wentNowhere = 0
  let folded = 0

  for (const series of rows) {
    const path = series.groupValue ?? NO_PATH
    const subjects = Number(series.points[0] ?? 0)
    if (path === NO_PATH) {
      wentNowhere += subjects
      continue
    }
    if (path === OTHER_GROUP) {
      folded += subjects
      continue
    }
    let level = roots
    for (const measureKey of path.split('>')) {
      let node = level.find((n) => n.measureKey === measureKey)
      if (!node) {
        node = { measureKey, subjects: 0, children: [] }
        level.push(node)
      }
      node.subjects += subjects
      level = node.children
    }
  }

  const sortTree = (nodes: PathNode[]): PathNode[] =>
    [...nodes]
      /* Deterministic: subjects descending, then key ascending. A tie must not
         reshuffle between renders. */
      .sort((a, b) => b.subjects - a.subjects || a.measureKey.localeCompare(b.measureKey))
      .map((node) => ({ ...node, children: sortTree(node.children) }))

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
  }

  const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t('rb.journey.entered', {
          subjects: formatMetricValue(total, 'count', language),
        })}
      </p>

      {roots.length === 0 ? (
        /* Every subject stopped at the root. Not an empty result — a real
           answer, and one worth reading. */
        <p className="text-sm text-muted-foreground">{t('rb.journey.allStopped')}</p>
      ) : (
        <Branch nodes={sortTree(roots)} measuresByKey={measuresByKey} share={share} t={t} language={language} />
      )}

      <ul className="flex list-none flex-col gap-1 border-t border-border pt-2">
        <li className="text-xs text-muted-foreground">
          {t('rb.journey.stopped', {
            subjects: formatMetricValue(wentNowhere, 'count', language),
            percent: formatMetricValue(share(wentNowhere), 'percent', language),
          })}
        </li>
        {folded > 0 && (
          <li className="text-xs text-muted-foreground">
            {t('rb.journey.folded', {
              subjects: formatMetricValue(folded, 'count', language),
              percent: formatMetricValue(share(folded), 'percent', language),
            })}
          </li>
        )}
      </ul>
    </div>
  )
}

function Branch({
  nodes,
  measuresByKey,
  share,
  t,
  language,
}: {
  nodes: PathNode[]
  measuresByKey: Readonly<Record<string, Measure>>
  share: (n: number) => number
  t: Translator
  language: Language
}) {
  return (
    <ul className="flex list-none flex-col gap-2">
      {nodes.map((node) => {
        const measure = measuresByKey[node.measureKey]
        return (
          <li key={node.measureKey} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm text-foreground">
                {measure ? t(measure.labelKey) : node.measureKey}
              </span>
              <span className="flex items-baseline gap-3 text-sm">
                <span className="text-foreground">
                  {formatMetricValue(node.subjects, 'count', language)}
                </span>
                <span className="text-muted-foreground">
                  {t('rb.journey.share', {
                    percent: formatMetricValue(share(node.subjects), 'percent', language),
                  })}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-chart-fill">
              <div
                className="h-full bg-chart-series"
                style={{ inlineSize: `${share(node.subjects)}%` }}
              />
            </div>
            {node.children.length > 0 && (
              /* Nesting is `ps-`, so the tree indents from the start edge and
                 mirrors in Arabic with no second rule. */
              <div className="border-s border-border ps-3">
                <Branch
                  nodes={node.children}
                  measuresByKey={measuresByKey}
                  share={share}
                  t={t}
                  language={language}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
