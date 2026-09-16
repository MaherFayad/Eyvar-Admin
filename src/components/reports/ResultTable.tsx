/**
 * The result as a table — **legal for every query shape in §7.1, and the one
 * chart type that is never disabled** (AC-841).
 *
 * It renders *the same numbers the chart renders*, formatted from each series'
 * own `unit`. That is the criterion, and it is why the values come from
 * `formatMetricValue` — the single formatter a tile, an axis tick and a legend
 * all call — rather than from a second rounding rule written here.
 *
 * ## One table, not one per panel
 *
 * Small multiples exist because two series at different scales cannot share a
 * y-axis. A table has no axis, so the argument does not apply and splitting the
 * numbers across N tables would only make them harder to compare — which is the
 * thing the operator came for. Each row names its series, so nothing is
 * ambiguous.
 *
 * ## §A11's chrome, and the one part of it that is refused
 *
 * *"A chart always ships with its table. Sortable, searchable, checkable,
 * exportable — the table is not a separate view."* Three of those four are
 * built here, behind `chrome` (see the prop). The fourth is not:
 *
 * **There are no row checkboxes, and that is a decision rather than an
 * omission.** Amplitude's checked rows drive which series the plot shows.
 * Series membership in this product is decided by `panelId` **on the wire** —
 * the planner produced exactly the series the question asked for — so a
 * checkbox that hid one would make the picture disagree with the question that
 * produced it, and the disagreement would survive a screenshot. The way to
 * remove a series is to remove the measure from the question, in the rail, and
 * re-run.
 *
 * ## §A11's trailing summary column, and why it is not `Row Average`
 *
 * Amplitude closes every breakdown row with `Row Average ⌄`. **A mean is the
 * wrong number for most of this catalogue** — the arithmetic mean of thirty
 * daily *counts* is not a fact anybody asked for, and the mean of thirty
 * *end-of-period* levels is not even a level. So the column is not an average
 * and is not named one.
 *
 * It is the measure's **declared** `bucketAggregate`, applied across buckets by
 * `rollUpSeries` — the same call, on the same series, that produces the
 * headline figure on the panel above. So the summary column and the card's big
 * number are one computation rather than two that agree today, and the honesty
 * argument is `rollup.ts`'s, not a second one written here:
 *
 *   `count` · `sum`                       → the total
 *   `mean`                                → the average
 *   `end-of-period` · `cumulative-count`  → the latest reading
 *
 * ## The declaration belongs to the SERIES, and a catalogue key is not proof
 *
 * **This column shipped rendering `1,200% total` on a shipped fixture**, and
 * the mechanism is worth writing down because it will recur. A cohort series
 * carries `measureKey: 'riders.joined'`, whose catalogue entry declares
 * `bucketAggregate: 'count'` over `unit: 'count'`. But `resolveCohort` does not
 * emit that measure's counts — it emits **retention percentages** and says so
 * by re-declaring `unit: 'percent'` on the series. Keying the rollup on
 * `measureKey` alone therefore summed twelve monthly retention rates and
 * labelled the result `total`, with the same authority as a real figure. The
 * audit's sentence for it: *an invented figure is indistinguishable from a
 * measured one once it is on screen.*
 *
 * So `declaredAggregate` asks a narrower question than "is this measure in the
 * catalogue": **does the catalogue entry describe THESE numbers?** The test is
 * `pairRefusal`'s own triple — `temporality`, `unit`, `currency` — because that
 * is already this product's definition of "two runs of numbers that may be
 * combined" (`types/measure.ts`). A resolver that re-declares any of the three
 * has changed what the series counts, and the aggregate does not travel with
 * the key.
 *
 * `resolveCohort` (`percent`), `resolveJourney` (`count`) and a followed
 * `resolveFunnel` (`count`, `currency: null`) all re-declare, and each says why
 * in its own comment. None of them declares a replacement aggregate, because
 * `ReportSeries` has no field for one — so the honest answer is **no cell**,
 * not a guess. Should the wire ever grow `ReportSeries.bucketAggregate`, this
 * is the one function that reads it.
 *
 * Three consequences follow, and each is visible rather than assumed:
 *
 *   - **each cell names its own aggregate in words**, because one column can
 *     hold two measures and one header cannot honestly name both;
 *   - **a partial bucket is excluded** (`rollUpSeries`, §3.5/AC-818) and the
 *     header says so whenever the table actually holds one;
 *   - **a series whose rollup nobody declared gets an em dash and a stated
 *     reason**, never a guessed sum. A rollup nobody declared is
 *     indistinguishable from one that was, once it is in a cell — so the cell
 *     says which of the two it is looking at.
 *
 * The whole column is absent when no caller supplied the catalogue, so the
 * aggregate is never inferred from the numbers themselves — and absent again
 * when **nothing** in the table resolves one, which is the cohort case: a
 * retention matrix now draws no summary column at all rather than a column of
 * sums of percentages.
 *
 * ## The three things a cell must keep apart
 *
 *   a **gap**            no reading. An em dash, never `0`.
 *   a **real zero**      the measurement ran and the answer was zero.
 *   a **blocked** series no points in the payload at all — the row states the
 *                        permission instead of showing an empty column.
 *
 * §7.5's rule, in a cell: *"a chart draws a break, not a dip to the axis, and
 * conflating them is how an outage looks like a collapse in demand."*
 *
 * Rules applied
 *   §A11       a search input, a sort per column, and `Export CSV` **beside the
 *              thing it exports** — a header row on the table, not a menu item
 *              three clicks away in the page's own overflow.
 *   §1.5       lucide only, 16px, `currentColor`, glyphs `aria-hidden`.
 *   §9.1       numeric columns take the inline-end edge and the header follows
 *              the value, so the two share one edge.
 *   §9.5       the sort caret is a **magnitude mark and does not mirror**; the
 *              search glyph and the download glyph are objects and do not
 *              mirror either.
 *   §3.5       a partial bucket is **marked**, never dropped — and the marker
 *              is a SIBLING of the sort button rather than a child of it, so
 *              the button's `aria-label` cannot swallow it. See the header
 *              cell.
 *   §9.1       **a column is never shrunk below legibility — it scrolls.** The
 *              `Table` primitive is `w-full table-fixed`, which is right for a
 *              six-column index screen and catastrophic here: a 30-bucket
 *              window divided the card's 734px between 32 columns and produced
 *              **23px-wide, 109px-tall headers whose text overprinted the row
 *              labels and each other** (measured in Chromium at 1440; 19px at
 *              1280, 38px at 1920). Fixed layout takes its widths from the
 *              header row and `w-full` pins the total, so the primitive's own
 *              `overflow-x-auto` could never engage — the table could not be
 *              wider than its scrollport. This table therefore declares
 *              `table-auto` with `w-auto min-w-full`: intrinsic width, floored
 *              at the card so a three-bucket result still fills it. That is the
 *              primitive's own note — *"more than ~6 columns means horizontal
 *              scroll, never shrinking a column below legibility"* — applied,
 *              not overridden.
 *   §14.4      **one scrollport, and it is the primitive's.** `Table` already
 *              renders `div[data-slot=table-container]` with
 *              `overflow-x-auto overscroll-x-contain`, and its own doc warns
 *              that *"a caller that wrapped its own would nest two
 *              scrollports"* — which is what the card here was doing. The card
 *              now carries only the border, the ground and the radius; the
 *              container carries the scroll and the same radius so the header's
 *              ground clips to the corner. The PAGE never scrolls sideways:
 *              every ancestor up to the canvas is `min-w-0`.
 *   §9.2       the table mirrors; the numerals do not.
 *   §7.2       every sort is a real `<button>` inside its `<th>`, with the
 *              primitive's own ring, and the `<th>` carries `aria-sort` so the
 *              state is announced rather than only drawn.
 */

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SortAscIcon, SortDescIcon, SortNoneIcon, ExportIcon, SearchIcon } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMetricValue } from '@/components/metrics'
import type { BucketAggregate, Measure, PermissionKey, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
/* `TableSpec`/`TableColumn`/`TableFormatBand` are v2-only and not yet in the
   `@/data/types` barrel — read directly, the same way `DashboardTile.tsx` does. */
import type { TableColumn, TableFormatBand, TableSpec } from '@/data/types/report'
import { ABSENT, formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { panelTitle } from './PanelCard'
import { declaredAggregate, rollUpSeries } from './rollup'

/**
 * **When a search input earns its place.** Amplitude ships one unconditionally;
 * a search box over four rows is a control that costs a tab stop and saves
 * nothing, and it invites the reader to believe there are rows they cannot see.
 * Eight is where a series list stops being scannable in one glance — two
 * measures split four ways, which is the first shape in this product that
 * actually produces a list.
 */
const SEARCH_THRESHOLD = 8

/**
 * WP-8.4 — below this many rows the plain table, every row mounted and
 * `table-auto` sizing each column from real content, is cheaper than the
 * virtualiser and keeps Ctrl+F able to find every row. The number is the
 * execution plan's own line for this work package, and the convention
 * `ConversationList.tsx` (Q-CC5) already uses for the inbox.
 */
const VIRTUALISE_ABOVE = 200

/** `estimateSize`'s starting guess for a windowed row, in px — every row in
 * both tables below renders a fixed, content-independent number of lines
 * (see each component's row JSX), so unlike `ConversationList` no per-row
 * `measureElement` correction is needed once this constant is right. */
const ROW_HEIGHT_ESTIMATE = 52
const ROW_HEIGHT_ESTIMATE_SINGLE_LINE = 40

/** Matches `--font-sans` (`globals.css`): one stack serves both languages,
 * since Inter has no Arabic glyph and falls through to Naskh per character. */
const TABLE_FONT_FAMILY =
  '"Inter Variable", "Noto Naskh Arabic Variable", "Noto Naskh Arabic", "Noto Sans Arabic", ui-sans-serif, "Segoe UI", system-ui, sans-serif'

/**
 * WP-8.4 — column pixel widths measured off-DOM, so `table-fixed` holds every
 * column steady while only a window of rows is mounted; `table-auto` sizes
 * from whatever is rendered (this file's own §9.1 note), which is what would
 * jitter as the window scrolls. `null` with no canvas 2D context (jsdom).
 */
function useMeasuredColumnWidths(active: boolean, columns: readonly (readonly string[])[]): number[] | null {
  return useMemo(() => {
    if (!active) return null
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return null
    ctx.font = `14px ${TABLE_FONT_FAMILY}`
    return columns.map((texts) => {
      let max = 0
      for (const text of texts) max = Math.max(max, ctx.measureText(text).width)
      return Math.ceil(max) + 32 /* the cell's px-3 padding plus a band `Badge`'s own chrome */
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, columns])
}

/**
 * The two spacer rows a windowed `<tbody>` needs so the scrollbar reports the
 * table's real height without every row being mounted. A padding row, not
 * `position: absolute` on the `<tr>`s themselves — an absolutely positioned
 * table row is blockified (CSS Display 3 §2.3.1) and stops taking part in
 * table layout, which is the one thing this table cannot give up (§9.1).
 */
function VirtualPadRow({ height, columnCount }: { height: number; columnCount: number }) {
  if (height <= 0) return null
  return (
    <TableRow aria-hidden="true">
      <TableCell colSpan={columnCount} style={{ height }} />
    </TableRow>
  )
}

/**
 * WP-8.4 — `Table`'s own container is `overflow-x-auto` only, never `-y`
 * (the primitive's own design), so the scroller a row virtualiser needs is
 * further up: `AppLayout`'s shell region. Found at runtime rather than
 * assumed, so this virtualises correctly in the builder, a dashboard tile,
 * or wherever else this component is ever mounted.
 */
function useNearestScrollParent(ref: React.RefObject<HTMLElement | null>, active: boolean): HTMLElement | null {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!active) return
    /* Starts one level ABOVE `ref` on purpose: `ref` is `Table`'s own
       `overflow-x-auto` container, and CSS Overflow §3 computes its unset
       Y axis to `auto` too, which would read as a (false) vertical
       scrollport if this walk started there. */
    let node = ref.current?.parentElement ?? null
    while (node && !/(auto|scroll)/.test(getComputedStyle(node).overflowY)) node = node.parentElement
    setParent(node)
  }, [active, ref])
  return parent
}

/** `null` is the unsorted order — the order the planner returned, which is meaningful. */
type SortColumn = 'series' | 'summary' | number
interface Sort {
  column: SortColumn
  descending: boolean
}

/**
 * The aggregate, in the operator's words — **one phrase per declared kind, and
 * no default.** `BucketAggregate` is a closed union, so a sixth member arrives
 * as a compile error here rather than as a cell silently labelled `total`.
 */
const AGGREGATE_WORD: Record<BucketAggregate, string> = {
  count: 'rb.table.window.sum',
  sum: 'rb.table.window.sum',
  mean: 'rb.table.window.mean',
  'end-of-period': 'rb.table.window.latest',
  'cumulative-count': 'rb.table.window.latest',
}

/** What one row's trailing cell states: the number, and what kind of number it is. */
interface Summary {
  value: number | null
  aggregate: BucketAggregate
}

/**
 * **The aggregate that genuinely describes THIS series — or `null`.**
 *
 * `ReportSeries` carries no aggregate of its own; the catalogue is the only
 * place one is declared. So the question this answers is not *"is this measure
 * in the catalogue"* but *"is this catalogue entry about these numbers"*, and
 * the test is `pairRefusal`'s triple: `temporality`, `unit`, `currency`.
 *
 * That is not a new rule invented here. `types/measure.ts` already defines two
 * runs of numbers as combinable exactly when those three agree — it is why two
 * measures may share a y-axis. A resolver that re-declares any of them has
 * changed what the series counts, and `bucketAggregate` describes what it used
 * to count. Cohort is the live case (`unit: 'percent'` over a `count` measure);
 * journey and a followed funnel are the other two.
 *
 * Exported because **`PanelCard`'s headline and its `readings` base have the
 * same defect** — both call `rollUpSeries(series, measure.bucketAggregate, …)`
 * with no such check — and the fix there should be this call, not a second
 * predicate that agrees with it today.
 */

export interface ResultTableProps {
  result: ReportResult
  /**
   * **§A11's header row, opted into — because this component has two callers.**
   *
   * The builder renders the table *under* the chart as a workspace surface, and
   * that is where a search, a sort and an export belong. A **dashboard tile
   * pinned as a table** renders the same component as its whole body: a search
   * box and an export button inside a 300px tile is chrome competing with the
   * reading it frames, and the tile has its own actions already.
   *
   * Off by default, so a tile inherits nothing it did not ask for.
   */
  chrome?: boolean
  /**
   * Writes the CSV. Absent by default — an `Export CSV` button with no
   * exporter is a dead affordance, and §10.1's export is a client call that a
   * component this dumb has no business making.
   */
  onExport?: (() => void) | undefined
  /**
   * **The catalogue, for §A11's trailing summary column — and its absence is
   * what withholds the column.**
   *
   * The rollup is `Measure.bucketAggregate`'s, never this component's: see the
   * file header. A caller that cannot resolve the measures passes nothing and
   * gets the per-bucket table it has always had, rather than a column of sums
   * over measures that may not be summable.
   *
   * `ResultCanvas` passes it on **both** its paths — the builder's table under
   * the chart, and a dashboard tile pinned as a table — because a summary is a
   * reading rather than chrome, and the tile is the surface with the least room
   * to scan thirty columns by eye.
   */
  measuresByKey?: Readonly<Record<string, Measure>>
  t: Translator
  language: Language
}

export function ResultTable({
  result,
  chrome = false,
  onExport,
  measuresByKey,
  t,
  language,
}: ResultTableProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort | null>(null)
  /* Two tables can be on one page — the builder's and a pinned tile's — so the
     ids the partial markers are addressed by are namespaced per instance. */
  const uid = useId()

  const panelById = useMemo(
    () => new Map<string, ReportPanel>(result.panels.map((p) => [p.panelId, p])),
    [result.panels],
  )

  /** The row's own name — the one both the search and the sort read. */
  const labels = useMemo(() => {
    const out = new Map<string, string>()
    for (const series of result.series) {
      const panel = panelById.get(series.panelId)
      out.set(series.id, panel ? panelTitle(panel, t).text : series.measureKey)
    }
    return out
  }, [result.series, panelById, t])

  /**
   * One rolled-up number per series, or no entry at all.
   *
   * A blocked or failed series is skipped rather than given a `null` value:
   * those rows say the permission or the failure across the whole width and
   * have no cells to put a summary in. A series whose rollup `declaredAggregate`
   * will not vouch for is skipped too — and its cell states that, rather than
   * borrowing the anchor measure's aggregate and rendering a number nobody
   * computed.
   */
  const summaries = useMemo(() => {
    const out = new Map<string, Summary>()
    if (measuresByKey === undefined) return out
    for (const series of result.series) {
      if (series.blocked !== null || series.failed !== null) continue
      const aggregate = declaredAggregate(series, measuresByKey[series.measureKey])
      if (aggregate === null) continue
      out.set(series.id, {
        value: rollUpSeries(series, aggregate, result.buckets.length).value,
        aggregate,
      })
    }
    return out
  }, [measuresByKey, result.series, result.buckets.length])

  /* No catalogue, no buckets, or nothing resolvable — the column is absent
     rather than empty. An all-em-dash column reads as data that failed. */
  const withSummary = summaries.size > 0 && result.buckets.length > 0

  const rows = useMemo(() => {
    const labelOf = (series: ReportSeries) => labels.get(series.id) ?? series.measureKey
    const needle = query.trim().toLocaleLowerCase()
    const matching =
      !chrome || needle === ''
        ? [...result.series]
        : result.series.filter((series) => labelOf(series).toLocaleLowerCase().includes(needle))

    if (!chrome || sort === null) return matching
    const direction = sort.descending ? -1 : 1
    const column = sort.column
    return [...matching].sort((a, b) => {
      if (column === 'series') {
        return direction * labelOf(a).localeCompare(labelOf(b))
      }
      /* A gap and a redaction are not small values — they are *no* value, and a
         sort that treated them as zero would rank an outage above a real low
         reading. Both sink to the bottom whichever way the column is sorted.
         The summary column obeys the same rule: an unresolved rollup is no
         value either. */
      const left = column === 'summary' ? (summaries.get(a.id)?.value ?? null) : valueAt(a, column)
      const right = column === 'summary' ? (summaries.get(b.id)?.value ?? null) : valueAt(b, column)
      if (left === null && right === null) return 0
      if (left === null) return 1
      if (right === null) return -1
      return direction * (left - right)
    })
  }, [result.series, labels, query, sort, chrome, summaries])

  const toggle = (column: SortColumn) =>
    setSort((current) =>
      current === null || current.column !== column
        ? { column, descending: false }
        : current.descending
          ? null
          : { column, descending: true },
    )

  const sortState = (column: SortColumn): 'ascending' | 'descending' | 'none' =>
    sort === null || sort.column !== column ? 'none' : sort.descending ? 'descending' : 'ascending'

  /** The series column, the buckets, and §A11's summary when it is drawn. */
  const bucketSpan = Math.max(1, result.buckets.length) + (withSummary ? 1 : 0)
  const columnCount = 1 + bucketSpan
  const anyPartial = result.buckets.some((_, index) => isPartial(result, index))

  /* WP-8.4 — a breakdown or a folded group can put hundreds of series on one
     table (`:962` finding 2); above `VIRTUALISE_ABOVE` only a window mounts. */
  const containerRef = useRef<HTMLDivElement>(null)
  const virtual = rows.length > VIRTUALISE_ABOVE
  const scrollParent = useNearestScrollParent(containerRef, virtual)
  const rowVirtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollParent,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 12,
  })
  const virtualItems = virtual ? rowVirtualizer.getVirtualItems() : []

  const columnWidthInputs = useMemo(() => {
    if (!virtual) return []
    const seriesColumn = [t('rb.table.series'), ...rows.map((series) => labels.get(series.id) ?? series.measureKey)]
    const bucketColumns = result.buckets.map((bucket, index) => [
      formatDate(bucket, { style: 'day-month', language }),
      ...rows.map((series) =>
        series.blocked || series.failed ? '' : formatMetricValue(series.points[index] ?? null, series.unit, language),
      ),
    ])
    const out = [seriesColumn, ...bucketColumns]
    if (withSummary) {
      out.push([
        t('rb.table.window'),
        ...rows.map((series) => formatMetricValue(summaries.get(series.id)?.value ?? null, series.unit, language)),
      ])
    }
    return out
  }, [virtual, t, rows, labels, result.buckets, withSummary, summaries, language])
  const columnWidths = useMeasuredColumnWidths(virtual, columnWidthInputs)

  const renderSeriesRow = (series: ReportSeries, rowIndex: number, windowed: boolean) => {
    const label = labels.get(series.id) ?? series.measureKey
    const summary = summaries.get(series.id)
    return (
      <TableRow
        key={series.id}
        data-index={windowed ? rowIndex : undefined}
        aria-rowindex={windowed ? rowIndex + 2 : undefined}
      >
        <TableCell className="text-start whitespace-nowrap">
          <span className="flex flex-col">
            <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
              <bdi {...isolatedRunProps().run}>{label}</bdi>
            </span>
            <span className="text-xs text-muted-foreground">
              {series.role === 'comparison'
                ? t('rb.table.role.comparison')
                : t('rb.table.role.current')}
            </span>
          </span>
        </TableCell>

        {series.blocked ? (
          /* No points in the payload. The row says why rather than
             rendering a run of dashes that reads as missing data.
             `bucketSpan` covers the summary column too — a row that
             states a permission must not leave a stray cell beside
             the sentence. */
          <TableCell colSpan={bucketSpan} className="text-start text-muted-foreground">
            {t('rb.panel.blocked', { permission: series.blocked })}
          </TableCell>
        ) : series.failed ? (
          <TableCell colSpan={bucketSpan} className="text-start text-muted-foreground">
            {t('rb.panel.failed')}
          </TableCell>
        ) : (
          <>
            {result.buckets.map((bucket, index) => (
              <TableCell key={bucket} className="text-end whitespace-nowrap tabular-nums">
                {/* `null` is a gap and formats to the em dash; `0` is
                    a real zero and formats to `0`. */}
                {formatMetricValue(series.points[index] ?? null, series.unit, language)}
              </TableCell>
            ))}
            {withSummary && (
              /* The number, then what kind of number it is. The
                  word is per-cell rather than in the header because
                  one table can hold two measures with two declared
                  aggregates, and a single header naming one of them
                  would be wrong for the other half of the rows.

                  **And where there is no declared aggregate, the
                  cell says so in the same slot.** An em dash on its
                  own reads as a gap in the data; this is not a gap,
                  it is a refusal to combine numbers nobody said how
                  to combine. The dash is `aria-hidden` and the
                  sentence beneath it is what a screen reader gets —
                  the same pairing `PanelCard` uses for an absent
                  delta, so a missing figure is never merely drawn. */
              <TableCell className="text-end">
                <span className="flex flex-col items-end">
                  <span
                    className="tabular-nums"
                    aria-hidden={summary === undefined ? 'true' : undefined}
                  >
                    {formatMetricValue(summary?.value ?? null, series.unit, language)}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {summary
                      ? t(AGGREGATE_WORD[summary.aggregate])
                      : t('rb.table.window.undeclared')}
                  </span>
                </span>
              </TableCell>
            )}
          </>
        )}
      </TableRow>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {chrome && (
        /* §A11's header row. The search sits with the rows it filters and the
           export sits with the numbers it writes — the whole point of putting
           them here rather than in a page-level menu. */
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            /* One child cannot be `justify-between`d to the inline end, and a
               spacer element to make it look right is a `<div>` doing a
               stylesheet's job. */
            result.series.length >= SEARCH_THRESHOLD ? 'justify-between' : 'justify-end',
          )}
        >
          {result.series.length >= SEARCH_THRESHOLD && (
            <div className="relative flex min-w-0 items-center">
              {/* A magnifying glass is an object, not a direction: it does not
                  mirror (§9.5). It sits at the field's inline START in both
                  languages, which `start-2.5` is exactly. */}
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground"
              />
              <Input
                type="search"
                /* AC-898 — typed text is user content; it follows its own script. */
                dir="auto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t('rb.table.search')}
                placeholder={t('rb.table.search')}
                className="h-8 w-56 ps-8"
              />
            </div>
          )}

          {onExport && (
            <Button type="button" variant="ghost" size="xs" onClick={onExport}>
              <ExportIcon aria-hidden="true" className="size-4" />
              {t('rb.table.export')}
            </Button>
          )}
        </div>
      )}

      {/* The card is the frame; the SCROLLPORT is the primitive's own
          container, one level in. Two nested `overflow-x-auto`s was the bug
          the primitive's doc predicted, and it is why the radius travels to the
          container as well — the header's `bg-muted` would otherwise square off
          the two top corners it scrolls under. */}
      <div className="rounded-xl border border-card-border bg-card">
        <Table
          containerRef={containerRef}
          containerClassName="rounded-xl"
          /* §9.1 — see the file header. Intrinsic width, floored at the card —
             unless windowed, where `table-fixed` + the measured `<colgroup>`
             below is what keeps columns from jittering as the window moves. */
          className={virtual && columnWidths ? 'w-full table-fixed' : 'w-auto min-w-full table-auto'}
          aria-rowcount={virtual ? rows.length + 1 : undefined}
        >
          {virtual && columnWidths && (
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
          )}
          <TableHeader>
            <TableRow aria-rowindex={virtual ? 1 : undefined}>
              <TableHead
                className="text-start whitespace-nowrap"
                aria-sort={chrome ? sortState('series') : undefined}
              >
                <SortableHeader
                  active={chrome}
                  state={sortState('series')}
                  label={t('rb.table.series')}
                  onToggle={() => toggle('series')}
                  t={t}
                >
                  {t('rb.table.series')}
                </SortableHeader>
              </TableHead>
              {result.buckets.map((bucket, index) => {
                const label = formatDate(bucket, { style: 'day-month', language })
                const partial = isPartial(result, index)
                return (
                  <TableHead
                    key={bucket}
                    /* A bucket label is a date and a date does not wrap: `25
                       Jun` broken over two lines is what made the header row
                       109px tall. The primitive's `whitespace-normal` is right
                       for a 6-column index screen and wrong for 30 dates. */
                    className="text-end whitespace-nowrap"
                    aria-sort={chrome ? sortState(index) : undefined}
                  >
                    <span className="flex flex-col items-end">
                      <SortableHeader
                        active={chrome}
                        state={sortState(index)}
                        label={label}
                        onToggle={() => toggle(index)}
                        end
                        describedBy={partial ? `${uid}-partial-${index}` : undefined}
                        t={t}
                      >
                        <bdi>{label}</bdi>
                      </SortableHeader>
                      {/* §3.5 — marked, in WORDS. A superscript glyph would be
                          a mark only a sighted operator could resolve.

                          **It is a SIBLING of the sort control, not a child of
                          it, and that is the whole fix.** `aria-label` REPLACES
                          a button's contents in the accessible-name
                          computation, so while this span lived inside the
                          button the computed name was `Sort by 13 Aug` and the
                          word `Incomplete` was rendered and silenced in the
                          same element — a screen-reader operator read a partial
                          bucket's numbers as complete, with the disclaimer on
                          screen and inaudible. Outside the button it is content
                          of the `<th>`, which every screen reader announces
                          when it reads the column header; and the button points
                          at it with `aria-describedby`, so the state also
                          reaches anyone who arrives by Tab and never reads the
                          cell. §7.4's *"name a control from its visible text"*
                          is satisfied by the name still being the column, which
                          is what the control sorts. */}
                      {partial && (
                        <span
                          id={`${uid}-partial-${index}`}
                          className="text-xs font-normal text-muted-foreground"
                        >
                          {t('rb.table.partial')}
                        </span>
                      )}
                    </span>
                  </TableHead>
                )
              })}

              {withSummary && (
                /* §A11's trailing column. It sorts like any other numeric
                   column, and it carries the exclusion the rollup applies —
                   but only where the table actually holds a partial bucket, so
                   the note is a fact about THIS result rather than a standing
                   disclaimer nobody reads. Same shape as the `Incomplete`
                   marker above: a SIBLING of the sort button, pointed at by
                   `aria-describedby`, because an `aria-label` would swallow
                   anything nested inside the control. */
                <TableHead
                  className="text-end whitespace-nowrap"
                  aria-sort={chrome ? sortState('summary') : undefined}
                >
                  <span className="flex flex-col items-end">
                    <SortableHeader
                      active={chrome}
                      state={sortState('summary')}
                      label={t('rb.table.window')}
                      onToggle={() => toggle('summary')}
                      end
                      describedBy={anyPartial ? `${uid}-window-note` : undefined}
                      t={t}
                    >
                      {t('rb.table.window')}
                    </SortableHeader>
                    {anyPartial && (
                      <span
                        id={`${uid}-window-note`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        {t('rb.table.window.note')}
                      </span>
                    )}
                  </span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              /* The SECOND kind of empty (`states.md`): the rows exist, this
                 search matched none of them. Never the first-run illustration,
                 which would claim there is no data. */
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {t('rb.table.search.empty')}
                </TableCell>
              </TableRow>
            ) : virtual ? (
              <>
                <VirtualPadRow height={virtualItems[0]?.start ?? 0} columnCount={columnCount} />
                {virtualItems.map((item) => {
                  const series = rows[item.index]
                  return series ? renderSeriesRow(series, item.index, true) : null
                })}
                <VirtualPadRow
                  height={rowVirtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0)}
                  columnCount={columnCount}
                />
              </>
            ) : (
              rows.map((series, index) => renderSeriesRow(series, index, false))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ═══════════════════════ §7 — the columns mode (v2) ═══════════════════════ */

/** AC-1176 — the tone set is closed at three. An unrecognised string (a stray `critical` in a fixture) falls back to `neutral` rather than rendering. */
function bandToneOf(tone: string): 'success' | 'warning' | 'neutral' {
  return tone === 'success' || tone === 'warning' || tone === 'neutral' ? tone : 'neutral'
}

/** The first band whose `lte` the value clears, in the order given. `null` when no band matches or the value is a gap. */
function bandFor(value: number | null, bands: readonly TableFormatBand[]): TableFormatBand | null {
  if (value === null) return null
  for (const band of bands) {
    if (value <= band.lte) return band
  }
  return null
}

/** One row's identity, shared across every column. `''` label is the degenerate `rows: []` case — one synthetic row, the whole result. */
interface ColumnsRow {
  key: string
  label: string
}

/**
 * §7's row axis, read off a column's OWN already-resolved result rather than
 * computed here: `rows: ['time']` walks its `buckets`, a dimension walks the
 * distinct `groupValue`s its own `groupBy` already produced. No cross-product
 * is computed in this component — a two-level split already arrives as one
 * joined `groupValue` per series (`<g1>|<g2>`), the same convention every
 * other v2 series reads.
 */
function columnsRowsOf(result: ReportResult, rows: TableSpec['rows']): ColumnsRow[] {
  const mode = rows[0] ?? null
  if (mode === null) return [{ key: '__single__', label: '' }]
  if (mode === 'time') return result.buckets.map((bucket) => ({ key: bucket, label: bucket }))
  const seen = new Set<string>()
  const out: ColumnsRow[] = []
  for (const series of result.series) {
    if (series.role !== 'current') continue
    const key = series.groupValue ?? ''
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, label: key })
  }
  return out
}

/** The series and bucket index one row/column cell reads, or `null` when this column has nothing at that row. */
function columnsCellOf(
  result: ReportResult,
  row: ColumnsRow,
  rows: TableSpec['rows'],
): { series: ReportSeries; index: number } | null {
  const mode = rows[0] ?? null
  const current = result.series.find((s) => s.role === 'current' && s.blocked === null && s.failed === null)
  if (!current) return null
  if (mode === 'time') return { series: current, index: result.buckets.indexOf(row.key) }
  if (mode === null) return { series: current, index: 0 }
  const grouped = result.series.find(
    (s) => s.role === 'current' && s.blocked === null && s.failed === null && (s.groupValue ?? '') === row.key,
  )
  return grouped ? { series: grouped, index: 0 } : null
}

/** §13.1 — the permission the viewer lacks on this column's leg, or `null`. Read off the first current series; a blocked leg has exactly one, with no points. */
function columnsBlockedOf(result: ReportResult): PermissionKey | null {
  return result.series.find((s) => s.role === 'current')?.blocked ?? null
}

/** A `TableColumn`'s header text — the caller's own `label`, or the catalogue's for a measure column with none. */
function columnLabel(column: TableColumn, measuresByKey: Readonly<Record<string, Measure>> | undefined, t: Translator): string {
  if (column.label) return column.label
  if (column.kind === 'formula') return column.expression
  const measure = measuresByKey?.[column.ref.key]
  return measure ? t(measure.labelKey) : column.ref.key
}

/**
 * F-V2-47's connection: one `ReportResult` slice per column, from the SAME
 * run `result` already carries — never a second query (the orchestrator's
 * ruling for §7, applied here too). A column naming a measure or formula
 * outside `result.series` has no leg to slice, and this returns `null` so the
 * caller falls back rather than drawing a guessed column.
 */
export function deriveColumnResults(result: ReportResult, columns: readonly TableColumn[]): ReportResult[] | null {
  const out: ReportResult[] = []
  for (const column of columns) {
    const measureKey = column.kind === 'formula' ? '__formula__' : column.ref.key
    const series = result.series.filter((s) => s.measureKey === measureKey)
    if (series.length === 0) return null
    const seriesIds = new Set(series.map((s) => s.id))
    const panels = result.panels.filter((p) => p.seriesIds.some((id) => seriesIds.has(id)))
    out.push({ ...result, series, panels })
  }
  return out
}

export interface ResultTableColumnsProps {
  spec: TableSpec
  /**
   * **One resolved leg per `spec.columns[i]`** (§7): each measure or formula
   * column is its own `ReportResult`, so one blocked or failed column redacts
   * only its own cells — the table around it stays readable (AC-1174).
   */
  columnResults: readonly ReportResult[]
  measuresByKey?: Readonly<Record<string, Measure>>
  t: Translator
  language: Language
}

/**
 * §7's data table: measure/formula columns across, row dimensions down.
 * `ResultTable` above stays the degenerate `rows: ['time']` case a pre-columns
 * saved report keeps rendering (AC-1100). Reuses `Table`, so AC-1177's
 * contained scroll is the primitive's guarantee, not a second one here.
 */
export function ResultTableColumns({ spec, columnResults, measuresByKey, t, language }: ResultTableColumnsProps) {
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null)
  const [query, setQuery] = useState('')

  /** The union across every column's own rows, first-seen order, UNFILTERED
   * by the search below — columns may carry different filters and so
   * different group values present. This is the list the search narrows,
   * never replaces, so the threshold and the "no data" vs "no match" empty
   * states both read from here rather than from whatever the search left. */
  const allRows = useMemo(() => {
    const seen = new Map<string, ColumnsRow>()
    for (const result of columnResults) {
      for (const row of columnsRowsOf(result, spec.rows)) {
        if (!seen.has(row.key)) seen.set(row.key, row)
      }
    }
    return [...seen.values()]
  }, [columnResults, spec.rows])

  /** The row's own visible text — what the search matches and what the
   * `<td>` renders, so a match is never a fact the cell disagrees with. */
  const rowLabelOf = (row: ColumnsRow): string =>
    spec.rows[0] === 'time'
      ? formatDate(row.key, { style: 'day-month-year', language })
      : row.label || t('rb.table.columns.rowLabel')

  const rows = useMemo(() => {
    /* Filters the FULL union above, not a window of it — above
       `VIRTUALISE_ABOVE` only a slice of `allRows` ever mounts, and a
       filter over the mounted slice would repeat the gap this closes: a row
       Ctrl+F (and this search) must be able to find even though it never
       rendered. */
    const needle = query.trim().toLocaleLowerCase()
    const matching =
      needle === '' ? allRows : allRows.filter((row) => rowLabelOf(row).toLocaleLowerCase().includes(needle))
    if (sort === null) return matching

    const result = columnResults[sort.column]
    if (!result) return matching
    const valueOf = (row: ColumnsRow): number | null => {
      const cell = columnsCellOf(result, row, spec.rows)
      return cell ? (cell.series.points[cell.index] ?? null) : null
    }
    const direction = sort.descending ? -1 : 1
    /* AC-1178 — a gap sinks to the bottom whichever way the column is sorted,
       the same rule `ResultTable`'s own sort applies above. */
    return [...matching].sort((a, b) => {
      const left = valueOf(a)
      const right = valueOf(b)
      if (left === null && right === null) return 0
      if (left === null) return 1
      if (right === null) return -1
      return direction * (left - right)
    })
  }, [allRows, query, sort, columnResults, spec.rows, t, language])

  const toggle = (column: number) =>
    setSort((current) =>
      current === null || current.column !== column
        ? { column, descending: false }
        : current.descending
          ? null
          : { column, descending: true },
    )
  const sortState = (column: number): 'ascending' | 'descending' | 'none' =>
    sort === null || sort.column !== column ? 'none' : sort.descending ? 'descending' : 'ascending'

  /* WP-8.4 — `rows: ['time']` over a wide window is the shape that actually
     crosses 200 (`:822` finding 2); every hook below must run before the
     early empty-return, so the windowing decision lives here regardless of
     which branch the render below takes. */
  const containerRef = useRef<HTMLDivElement>(null)
  const virtual = rows.length > VIRTUALISE_ABOVE
  const scrollParent = useNearestScrollParent(containerRef, virtual)
  const rowVirtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollParent,
    estimateSize: () => ROW_HEIGHT_ESTIMATE_SINGLE_LINE,
    overscan: 12,
  })
  const virtualItems = virtual ? rowVirtualizer.getVirtualItems() : []
  const columnCount = 1 + spec.columns.length

  const columnWidthInputs = useMemo(() => {
    if (!virtual) return []
    const rowLabelColumn = [
      spec.rows[0] === 'time' ? t('rb.table.columns.rowTime') : t('rb.table.columns.rowLabel'),
      ...rows.map((row) => rowLabelOf(row)),
    ]
    const dataColumns = spec.columns.map((column, index) => {
      const header = columnLabel(column, measuresByKey, t)
      const result = columnResults[index]
      if (!result || columnsBlockedOf(result)) return [header, ABSENT]
      return [
        header,
        ...rows.map((row) => {
          const cell = columnsCellOf(result, row, spec.rows)
          const value = cell ? (cell.series.points[cell.index] ?? null) : null
          return formatMetricValue(value, cell?.series.unit ?? 'count', language)
        }),
      ]
    })
    return [rowLabelColumn, ...dataColumns]
  }, [virtual, spec.rows, spec.columns, rows, columnResults, measuresByKey, t, language])
  const columnWidths = useMeasuredColumnWidths(virtual, columnWidthInputs)

  const renderColumnsRow = (row: ColumnsRow, rowIndex: number, windowed: boolean) => (
    <TableRow key={row.key} data-index={windowed ? rowIndex : undefined} aria-rowindex={windowed ? rowIndex + 2 : undefined}>
      <TableCell className="text-start whitespace-nowrap">
        <bdi>{rowLabelOf(row)}</bdi>
      </TableCell>
      {spec.columns.map((_column, index) => {
        const result = columnResults[index]
        if (!result) return <TableCell key={index} className="text-end text-muted-foreground">{ABSENT}</TableCell>

        const blocked = columnsBlockedOf(result)
        if (blocked) {
          return (
            <TableCell key={index} className="text-end text-muted-foreground">
              {ABSENT}
              <span className="sr-only">{t('rb.panel.blocked', { permission: blocked })}</span>
            </TableCell>
          )
        }

        const cell = columnsCellOf(result, row, spec.rows)
        const value = cell ? (cell.series.points[cell.index] ?? null) : null
        const unit = cell?.series.unit ?? 'count'
        const bands = spec.format.find((f) => f.column === index)?.bands ?? []
        const band = bandFor(value, bands)
        const formatted = formatMetricValue(value, unit, language)

        return (
          <TableCell key={index} className="text-end tabular-nums">
            {/* R7 tones only — `bandToneOf` refuses a sixth. Colour is
                never the sole carrier: the number itself is the badge's
                content either way. */}
            {band ? <Badge tone={bandToneOf(band.tone)}>{formatted}</Badge> : formatted}
          </TableCell>
        )
      })}
    </TableRow>
  )

  if (spec.columns.length === 0 || allRows.length === 0) {
    /* R8's second kind of empty: a table asked for and drawn with nothing to
       show — never the first-run illustration, which would claim no data
       exists anywhere. Reads `allRows`, not the searched `rows`: a search
       that matches nothing is a DIFFERENT empty, drawn inside the table
       shell below rather than replacing it. */
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('rb.table.columns.empty')}</p>
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {allRows.length >= SEARCH_THRESHOLD && (
        /* Same search `rb.table.search` gives the classic table (§A11),
           over the row dimension: above `VIRTUALISE_ABOVE` only a window of
           rows mounts, so Ctrl+F cannot see the rest — this filters
           `allRows`, the full list, before either the sort or the
           virtualiser ever see it. */
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 items-center">
            {/* A magnifying glass is an object, not a direction: it does not
                mirror (§9.5). It sits at the field's inline START in both
                languages, which `start-2.5` is exactly. */}
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground"
            />
            <Input
              type="search"
              dir="auto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('rb.table.columns.search')}
              placeholder={t('rb.table.columns.search')}
              className="h-8 w-56 ps-8"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-card-border bg-card">
        <Table
          containerRef={containerRef}
          containerClassName="rounded-xl"
          className={virtual && columnWidths ? 'w-full table-fixed' : 'w-auto min-w-full table-auto'}
          aria-rowcount={virtual ? rows.length + 1 : undefined}
        >
          {virtual && columnWidths && (
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
          )}
          <TableHeader>
            <TableRow aria-rowindex={virtual ? 1 : undefined}>
              <TableHead className="text-start whitespace-nowrap">
                {spec.rows[0] === 'time' ? t('rb.table.columns.rowTime') : t('rb.table.columns.rowLabel')}
              </TableHead>
              {spec.columns.map((column, index) => {
                const label = columnLabel(column, measuresByKey, t)
                return (
                  <TableHead key={index} className="text-end whitespace-nowrap" aria-sort={sortState(index)}>
                    <SortableHeader active state={sortState(index)} label={label} onToggle={() => toggle(index)} end t={t}>
                      {label}
                    </SortableHeader>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              /* The SECOND kind of empty (`states.md`): the rows exist, this
                 search matched none of them. Never the first-run
                 illustration, which would claim there is no data. */
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {t('rb.table.columns.search.empty')}
                </TableCell>
              </TableRow>
            ) : virtual ? (
              <>
                <VirtualPadRow height={virtualItems[0]?.start ?? 0} columnCount={columnCount} />
                {virtualItems.map((item) => {
                  const row = rows[item.index]
                  return row ? renderColumnsRow(row, item.index, true) : null
                })}
                <VirtualPadRow
                  height={rowVirtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0)}
                  columnCount={columnCount}
                />
              </>
            ) : (
              rows.map((row, index) => renderColumnsRow(row, index, false))
            )}
          </TableBody>
          {spec.totals && (
            /* AC-1175/AC-1298 — read off `columnResults` and `spec.columns`
               directly, never `rows`: the totals are over the whole report,
               so the operator's search text narrows what is LISTED above
               and never what is SUMMED here. */
            <tfoot>
              <TableRow>
                <TableCell className="text-start font-medium text-foreground">{t('rb.table.columns.totals')}</TableCell>
                {spec.columns.map((column, index) => {
                  const result = columnResults[index]
                  const measure = column.kind === 'measure' ? measuresByKey?.[column.ref.key] : undefined
                  const series = result?.series.find((s) => s.role === 'current' && s.blocked === null && s.failed === null)
                  if (!result || !series) {
                    return <TableCell key={index} className="text-end text-muted-foreground">{ABSENT}</TableCell>
                  }
                  /* AC-1175: additive → a real sum (or the catalogue's own
                     declared combination); anything else names its aggregate
                     word instead of guessing one — same rule, same helper,
                     `ResultTable`'s single summary column already applies. */
                  const aggregate = declaredAggregate(series, measure)
                  if (aggregate === null) {
                    return (
                      <TableCell key={index} className="text-end">
                        <span className="flex flex-col items-end">
                          <span aria-hidden="true">{ABSENT}</span>
                          <span className="text-xs font-normal text-muted-foreground">{t('rb.table.window.undeclared')}</span>
                        </span>
                      </TableCell>
                    )
                  }
                  const value = rollUpSeries(series, aggregate, result.buckets.length).value
                  return (
                    <TableCell key={index} className="text-end">
                      <span className="flex flex-col items-end">
                        <span className="tabular-nums">{formatMetricValue(value, series.unit, language)}</span>
                        <span className="text-xs font-normal text-muted-foreground">{t(AGGREGATE_WORD[aggregate])}</span>
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  )
}

/**
 * A column header that sorts, or the same header as plain text when it does not.
 *
 * The caret is `ArrowUp` / `ArrowDown` — **the same two shapes the delta uses,
 * and for the same reason.** Up and down are magnitude, not reading order, so
 * they are in §9.5's closed set of marks that do not mirror; nothing here adds
 * an `rtl:` transform to them. `ChevronsUpDown` marks a column that *can* be
 * sorted and is not, so the affordance is visible before the first click rather
 * than discovered by trying.
 *
 * The accessible name is `Sort by {column}` on the button while the `<th>`
 * carries `aria-sort`, which is the pair a screen reader announces as one fact:
 * what this control does, and what it has already done.
 *
 * **Nothing else may be put inside this button.** `aria-label` replaces a
 * button's contents in the accessible-name computation, so any text nested here
 * is rendered and silenced at the same time. §3.5's `Incomplete` marker was
 * exactly that, and it now sits outside with `describedBy` pointing at it.
 */
function SortableHeader({
  active,
  state,
  label,
  onToggle,
  end = false,
  describedBy,
  children,
  t,
}: {
  active: boolean
  state: 'ascending' | 'descending' | 'none'
  /** The plain text of this column, for the button's accessible name. */
  label: string
  onToggle: () => void
  /** A numeric column's header follows its values to the inline end (§9.1). */
  end?: boolean
  /**
   * The id of a marker that qualifies this column — §3.5's `Incomplete`.
   *
   * `aria-describedby` rather than a suffix on the name: what the control DOES
   * is sort by this column, and folding a state into the name would leave the
   * button announcing something no visible text says. The description is the
   * visible word beside it, so the two agree.
   */
  describedBy?: string | undefined
  children: ReactNode
  t: Translator
}) {
  if (!active) return <>{children}</>
  const Caret = state === 'none' ? SortNoneIcon : state === 'descending' ? SortDescIcon : SortAscIcon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={t('rb.table.sort', { column: label })}
      aria-describedby={describedBy}
      className={cn(
        'flex w-full items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        end ? 'justify-end' : 'justify-start',
      )}
    >
      {children}
      <Caret
        aria-hidden="true"
        className={cn('size-3 shrink-0', state === 'none' ? 'text-muted-foreground' : 'text-foreground')}
      />
    </button>
  )
}

/** `null` for a gap, a redaction and a failure alike — see the sort's own note. */
function valueAt(series: ReportSeries, index: number): number | null {
  if (series.blocked || series.failed) return null
  return series.points[index] ?? null
}

function isPartial(result: ReportResult, index: number): boolean {
  return result.series.some(
    (series) => series.role === 'current' && series.partialBucketIndexes.includes(index),
  )
}
