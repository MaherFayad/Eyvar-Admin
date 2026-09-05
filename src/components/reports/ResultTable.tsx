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

import { useId, useMemo, useState, type ReactNode } from 'react'
import { SortAscIcon, SortDescIcon, SortNoneIcon, ExportIcon, SearchIcon } from '@/components/icons'
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
import type { BucketAggregate, Measure, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
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
          containerClassName="rounded-xl"
          /* §9.1 — see the file header. Intrinsic width, floored at the card. */
          className="w-auto min-w-full table-auto"
        >
          <TableHeader>
            <TableRow>
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
            ) : (
              rows.map((series) => {
                const label = labels.get(series.id) ?? series.measureKey
                const summary = summaries.get(series.id)
                return (
                  <TableRow key={series.id}>
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
              })
            )}
          </TableBody>
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
