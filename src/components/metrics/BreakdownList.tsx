/**
 * **The ranked list — `design/07-rulings-r4.md` R4-4 §4.1 as amended by
 * `design/09-rulings-r5.md` §9.1, which is normative for every slot below.**
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ Top 5 zones by failure rate                                 │  heading — dimension, ranking, cut-off
 *  ├─────────────────────────────────────────────────────────────┤
 *  │ Al Narjis                                               42% │  label / the ONE numeric column
 *  │ ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                 │  optional bar
 *  │ 4 of 20 trips ran late                                      │  optional sub-label — carries the second NUMBER
 *  │ ─────────────────────────────────────────────────────────── │
 *  │ Al Yasmin                                               31% │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │ Showing the top 5 of 14 zones.                              │  AC-696
 *  └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * Rules applied
 *   R5-5 §9.1   **exactly ONE numeric column: the measure the list is ranked
 *               by.** The secondary numeric slot is *withdrawn*, not
 *               deprecated. It shipped one pass ago, it rendered
 *               `Friday … 6 6` and `884.00 SAR 63` — two numbers, neither
 *               named — and the designer withdrew their own rule after seeing
 *               it built. A second numeric fact is now a **noun phrase in the
 *               sub-label**, carried by `subLabelKey` with `subLabelParams`.
 *
 *               Three things that buys, and the third arrived from the fixture
 *               rather than from the reference: every number carries its own
 *               noun, so there is no left-to-right convention to get wrong in
 *               Arabic; and **a nullable second fact becomes statable**. On
 *               `zones.citiesHealth` three of four cities have no failure-rate
 *               reading at all. As a column that is an em dash — the same mark
 *               V-2 is about. As a phrase, a city with no reading simply does
 *               not state one, and `Not launched` says why. A city with no
 *               reading and a city with a reading of zero are different facts
 *               and only the phrase form can render the difference.
 *   R5-9 §20   **the caveat line — a THIRD slot, under the heading and above
 *               the first row.** A reason the ranking below may not be trusted,
 *               and nothing else: never a status, a value, a delta, an action, a
 *               link, a restatement of the cut-off, or a permanent property of
 *               the list — a permanent property is what the heading is for. And
 *               never a general uncertainty: **a caveat that cannot name the
 *               number that raises it and the number that clears it is a
 *               disclaimer**, and a disclaimer on a ranking is a sign the
 *               ranking should not ship.
 *
 *               It **wraps rather than truncating**, which is the one geometric
 *               difference from the caption and is deliberate: a truncated
 *               caveat is worse than no caveat, because the half that survives
 *               still looks authoritative.
 *
 *               `caveat.gatedBy` names the metric on the same board whose value
 *               raises it. **This component never evaluates the condition** —
 *               the data layer decides whether the caveat is raised and hands
 *               over a `caveat` or a `null`. Same division as `selectNotice`,
 *               and for the same reason: a rendering rule that re-derives a
 *               threshold is a second place for the threshold to be wrong.
 *   R5-11a §19 **the card-state precedence, stated once and in one place:**
 *               awaiting-a-store → no rows → caveat + rows + cut-off. A card
 *               awaiting a store renders **no caveat and no cut-off**, because
 *               both are claims about a ranking that did not happen.
 *
 *               `awaitingStore` is a **named store, and a closed union**, not a
 *               boolean and not a free string — a card cannot claim to be
 *               awaiting one without saying which, and `''` / `'TODO'` cannot
 *               satisfy it. That is `breakdown.row.entity`'s failure mode, and
 *               a rule that re-created it would have learnt nothing from R5-7.
 *               The store name is **not rendered**: it is an engineering fact
 *               in an operator's register, nobody can act on it, and R5-11's
 *               sentence is byte-identical wherever it appears.
 *   R5-12 §18.4 **a bar is legal only where the rows are ordered by the measure
 *               the bar draws.** That is the list's property and the fixture
 *               sets `bar: false` where it fails; this component draws what it
 *               is given, and additionally refuses where `max === min`.
 *   R5-7 §9.1   **the row label is a `BreakdownLabel`, and the union is not
 *               tidiness** — the two kinds need different rendering and until
 *               now the component could not tell them apart. See `RowLabel`,
 *               which is where V-4 is fixed.
 *   R5-6 §9.1   **the bar: `--chart-series`, 4px, share-of-max, and only where
 *               `max > min`.** See `Bar`.
 *   R4-4 §4.1   **the anatomy, slot by slot.** Heading is a fragment stating
 *               dimension, ranking and cut-off (AC-690, no period — R6). Label
 *               `--text-sm`/500/`--ev-ink`, truncates, never wraps. Sub-label
 *               `--text-xs`/`--ev-text-2`, one line, truncates, a key with
 *               params and never a concatenation. Primary value right-aligned
 *               and tabular. Cut-off sentence last, and only when
 *               `rowsTotal > rowsShown`.
 *   R4-4 §4.1   **row height is uniform and comes from the bar**: `--ev-row-h`
 *               without one, `--ev-row-h-media` with one. *"A row that grows to
 *               fit is R20's defect in a new place."* So the height is fixed
 *               and the two text slots truncate rather than wrap.
 *   R5-8 §9.1   **a breakdown never exceeds half the content width.** That is
 *               the board's grid to enforce, not this card's — see
 *               `MetricBoardScreen`'s section grid. What this file owes it is
 *               `min-w-0`, so a long entity name truncates inside the cell
 *               instead of widening it.
 *   AC-694      **no mutating control, ever.** A breakdown is a reading
 *               surface. The only interaction a row offers is following its
 *               drilldown, and legacy's `Send retention offer` button on the
 *               at-risk rider list deliberately does not come across.
 *   AC-693      a row is a link **only when its destination is already
 *               filtered to that row**; `drilldownRoute: null` renders plain
 *               text, never a link to an unfiltered list.
 *   AC-691      fewer rows than the cut-off renders all of them — no padding
 *               and no `and 0 more`.
 *   AC-692      **zero rows is R8's SECOND kind of empty**: one grey sentence,
 *               never the first-run illustration, because the *section* is
 *               empty and the page is not. `support.contactReasons` is that
 *               fixture and it is the most valuable list in the product.
 *   R4 / §9.2   the value column is aligned to the inline-end with
 *               `tabular-nums`; in Arabic the COLUMN mirrors and the NUMERAL
 *               RUN does not (AC-73), which is what the isolation buys.
 *   §7.2 / §7.4 a linked row **is** an `<a>` wrapping the row, so the focusable
 *               element and the visible box are the same object and the ring
 *               traces the row. An unlinked row is not a focus stop — a stop
 *               that does nothing is worse than no stop.
 *   §7.5        the list is a `<ul>` labelled by its own heading, so a screen
 *               reader gets the ranking and the item count rather than a run of
 *               links. The bar is `aria-hidden`: it restates the number beside
 *               it and adds nothing a reader does not already have.
 *
 * **Every isolated run in this file goes through `isolatedRunProps`.** The
 * helper returns two prop bags and types the run's `className` as `never`, so a
 * class can only land on the box — which is §5.4's finding as a compile error
 * rather than as a note somebody has to remember. A `<bdi>` that IS the box
 * takes its own direction and flushes its text to ITS start; that was live on
 * all eight boards two passes ago and it is invisible to every source audit.
 */

import { useId } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { tableCsvFilename, tableCsvText, type TableCsvView } from '@/components/table/csv'
import type { DataColumn } from '@/components/table/columns'
import { downloadCsv } from '@/screens/reports/csv'
import {
  announce,
  formatCount,
  formatPercent,
  invariant,
  isolatedRunProps,
  type Language,
  type Translate,
  type TranslateParams,
} from '@/lib'
import type {
  BreakdownLabel,
  IsoDate,
  MetricBreakdown,
  MetricBreakdownRow,
} from '@/data/types'
import { formatMetricValue } from './formatMetric'

/**
 * **What each sub-label parameter measures — a closed set, and adding to it is
 * a review event rather than an import.**
 *
 * R5-5 §11.4 requires the value to be **formatted before interpolation**:
 * `{rate}` renders `45%`, not `45`. `MetricBreakdownRow.subLabelParams` carries
 * **bare numbers** and puts the formatting here, on the precedent
 * `overview.compare.target` sets — `MetricComparison.value` is a `number` and
 * `MetricTile` runs it through `formatMetricValue` before handing it to `t()`.
 *
 * The reason it is not pre-formatted in the fixture is the one that matters:
 * a stored `'45%'` can never render Arabic-Indic digits. Formatting is a
 * function of the language and the language is not known where the data is
 * seeded.
 *
 * **What AC-713 actually forbids is a per-cent sign assembled by
 * CONCATENATION.** One produced by `formatPercent` and interpolated into a key
 * is not that, and it is the only form that survives translation.
 *
 * The unit is a property of the **key**, not of the row, so it cannot be read
 * off `MetricBreakdownRow.unit` — `zones.citiesHealth` ranks on a count of
 * zones and its sub-label states a percentage. Hence a table, and hence an
 * `invariant` rather than a default: a seventh parameter name defaulting
 * silently to a count is how `45` ships where `45%` was meant.
 */
const NUMERIC_PARAM_UNIT = {
  rate: 'percent',
  /* R5-9's caveat parameter. Same table, because it is the same rule. */
  share: 'percent',
  late: 'count',
  total: 'count',
  trips: 'count',
  past: 'count',
  count: 'count',
} as const satisfies Record<string, 'percent' | 'count'>

function formatNumericParams(
  params: Record<string, string | number> | null,
  language: Language,
): TranslateParams | undefined {
  if (params === null) return undefined
  const formatted: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(params)) {
    /* A string is already text — a name, a term — and there is nothing to
       format. Only numbers reach a formatter. */
    if (typeof value === 'string') {
      formatted[name] = value
      continue
    }
    const unit = NUMERIC_PARAM_UNIT[name as keyof typeof NUMERIC_PARAM_UNIT] as
      | 'percent'
      | 'count'
      | undefined
    invariant(
      unit !== undefined,
      `Parameter '${name}' has no declared unit. Add it to NUMERIC_PARAM_UNIT (R5-5 §11.4).`,
    )
    formatted[name] = unit === 'percent' ? formatPercent(value, language) : formatCount(value, language)
  }
  return formatted
}

/**
 * **What this list is a slice OF**, and the export's precondition.
 *
 * `components/table/csv.ts` opens with the reason: *"a CSV of bare numbers with
 * no window is unattributable the moment it reaches a spreadsheet, and
 * unattributable numbers are how the wrong figure ends up in a deck."* A
 * breakdown carries no board id, no sub-tab and no dates — `MetricBreakdown` is
 * a ranking and nothing else — so the surface that renders it has to hand them
 * over, and **a list that is not given them offers no export at all** rather
 * than writing a file that cannot say what it is.
 */
export interface BreakdownScope {
  /** `management-overview` — workspace and sub-tab, as the route table joins them. */
  subTabId: string
  /**
   * The window the board's figures cover. `null` on a board made entirely of
   * point-in-time figures, which is a real case rather than a gap — the header
   * block says which of the two it is instead of leaving the field blank.
   */
  period: { start: IsoDate; end: IsoDate } | null
}

export interface BreakdownListProps {
  breakdown: MetricBreakdown
  /**
   * **There is no `frame` here any more, and its removal is the finding.**
   *
   * This component carried `frame?: 'card' | 'plain'` and twelve styling
   * branches off it — the box, the header rule, the cut-off's position, the row
   * dividers, the row's plate, the bar's track, the row height. Its own doc
   * said *"`plain` is what a metric board passes"*. **No caller passed it**, in
   * production or in a test: `MetricBoardScreen` is the only production site
   * and it never has. §E7 then gave that screen's panels their card frames back
   * — the density the 20px gutter is paid for with — so `plain` was left
   * describing a board that no longer exists.
   *
   * The `card` shape is therefore the only shape, and it is the one every
   * caller was already getting. If a chromeless list is wanted again it comes
   * back as one decision with a caller attached, not as a dozen dormant
   * branches kept alive by a comment.
   */
  /** See `BreakdownScope`. Absent means no export button. */
  scope?: BreakdownScope | null
  t: Translate
  language: Language
}

export function BreakdownList({
  breakdown,
  scope = null,
  t,
  language,
}: BreakdownListProps) {
  const headingId = useId()
  const heading = t(`breakdown.${breakdown.key}`)

  /**
   * **`max > min` is a rendering condition, not only a seeding condition**
   * (R5-6 §9.1). `breakdown.bar` is the list's permission and this is the
   * question the permission cannot answer on its own, because it is about the
   * rows that actually arrived.
   *
   * `admin.rotaGapsByDay` is the worked case: seven rows all valued 6, so every
   * bar is full, so seven identical bands cost 20px of row height each and
   * carry no comparison at all. The finding they encode survives without them —
   * *nobody is on call at any hour of any day* is what the seven equal numbers
   * say, and they say it.
   *
   * Checked here as well as in the fixture for the reason this file already
   * gives about `bar` and `barFraction`: **a contract is not a runtime.**
   */
  const values = breakdown.rows.map((row) => row.value)
  const showBar =
    breakdown.bar &&
    values.length > 0 &&
    Math.max(...values) > Math.min(...values)
  /* R5-11a §19.1 — a card awaiting a store renders no cut-off, because a
     cut-off is a claim about a ranking that did not happen. */
  const showCutOff =
    breakdown.awaitingStore === null && breakdown.rowsTotal > breakdown.rowsShown

  return (
    <Card className="min-w-0 border border-border shadow-xs">
      {/* The heading's rule is the panel's own divider, exactly as the chart
          footer's is. */}
      <CardHeader className="border-b border-border/50 pb-3">
        {/* AC-690 — dimension, ranking and cut-off, as a fragment. No period. */}
        <CardTitle id={headingId}>{heading}</CardTitle>
        {/* **Principle 5's exportable half.** `CardAction` and not a bare div
            carrying the slot attribute: the slot switches `CardHeader` to
            `1fr auto` and the component also carries the grid placement that
            puts the control beside the heading rather than under it — the
            shape `ChartCard`'s report link already uses.

            **AC-694 is not in the way.** It forbids a *mutating* control on a
            breakdown, because a row that can be acted on is a work-queue row.
            An export mutates nothing; it hands the operator the reading they
            are already looking at, which is the alternative to retyping it.

            Rendered only when there are rows to write AND a scope to attribute
            them to — see `BreakdownScope`. */}
        {scope !== null && breakdown.awaitingStore === null && breakdown.rows.length > 0 && (
          <CardAction>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => exportBreakdown({ breakdown, scope, t, language })}
            >
              {/* A download mark is an object, not a direction: it does not
                  mirror (§9.5). Drawn, never typed — Inter carries no ⎙ and
                  Windows falls through to a colour emoji font. */}
              <DownloadIcon aria-hidden="true" />
              {t('breakdown.export')}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="min-w-0 p-2">
        {breakdown.awaitingStore !== null ? (
          /* **R5-11 — the THIRD absence, and conflating any two of the three is
             the V-2 defect in a new slot.** *We ranked and this window had
             nothing* is `breakdown.empty`; *we queried and this range returned
             nothing* is the chart's sentence; **nothing is captured, so no
             ranking is possible** is this one.

             **The card renders rather than vanishing, and the asymmetry with
             the tile is structural rather than aesthetic: a tile has no body
             and a card does.** A tile's entire content is its number, so there
             is nowhere to put a sentence and an em dash cannot be made honest —
             which is why R4-11 §11.2 deletes the tile. A card has a heading that
             names the measure truthfully whether or not the data exists, so the
             body can carry the truth and there is no reason to throw the
             heading away with it. `Top 5 contact reasons, per 1,000 trips` over
             this sentence is what gets the contact log built; an absent card is
             not. */
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('overview.notRecorded')}
          </p>
        ) : breakdown.rows.length === 0 ? (
          /* AC-692 — R8's second kind. One grey sentence, no illustration. */
          <p className="py-6 text-center text-sm text-muted-foreground">{t('breakdown.empty')}</p>
        ) : (
          <>
            {/* **R5-9 §20 — the caveat line, directly under the heading and
                above the first row, and the POSITION is the ruling.** *A gate
                that appears after the thing it gates is not a gate.* A reader
                who scans five rows and forms a conclusion before reaching a
                footer has already been misled, which is the whole failure
                AC-674 exists to prevent — so this cannot live beside the
                cut-off sentence, and a test that only asserts the string is on
                screen would pass with it there.

                **It wraps; it does not truncate**, and that is the one
                geometric difference from the caption, deliberately. A caption
                sits in a grid cell read across, where a variable height breaks
                the row. A caveat sits in a card body where nothing is read
                across it, and **a truncated caveat is worse than no caveat**
                because the half that survives still looks authoritative.

                No icon, no tone, no link, no action. R7 owns statuses and this
                is not one. It renders only when the data hands one over — the
                condition lives on `caveat.gatedBy`'s metric, and it is
                evaluated there, not here. */}
            {breakdown.caveat && <Caveat caveat={breakdown.caveat} t={t} language={language} />}
            <ul
              aria-labelledby={headingId}
              className="flex list-none flex-col gap-0.5 divide-y divide-border/40"
            >
            {breakdown.rows.map((row) => (
              <li key={row.id} className="min-w-0">
                <Row row={row} showBar={showBar} t={t} language={language} />
              </li>
            ))}
            </ul>
          </>
        )}
      </CardContent>

      {/* AC-696's sentence — the list is the top five of seven. It sits in a
          footer with a rule above it, which is a footer's job: the ranking has
          ended and this states its extent. */}
      {showCutOff && (
        <CardFooter className="border-t border-border/50 bg-muted/10 pt-3">
          {/* AC-696. A full SENTENCE, so it takes a period (R6). The dimension
              is a key of its own — `queues` and `captains` are copy. */}
          <CutOff breakdown={breakdown} t={t} />
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * **The ranked list, as a file — and there is no third CSV writer here.**
 *
 * `components/table/csv.ts` owns the RFC-4180 quoting and the header block, and
 * `screens/reports/csv.ts` owns the blob and the object URL. This assembles a
 * `TableCsvView` over the rows a breakdown is already holding and calls both.
 * A fourth `join(',')` here is precisely the defect the first file was written
 * to stop: *"this dataset contains company names written in Arabic, and an
 * unquoted comma in one silently shifts every column to its right."*
 *
 * ## The header block, and why it is not optional
 *
 * A breakdown is a slice — the top five of fourteen, on one board, over one
 * window — and every one of those facts is invisible in the rows themselves.
 * So `table` names the board and its sub-tab, `view` names the list, a `filter`
 * line names the window, `rows` is what the file holds and `total_matching` is
 * what it was ranked out of. Reading `4` in a cell without them is how the
 * wrong figure reaches a deck.
 *
 * **A board of point-in-time figures has no window**, and the file says
 * `point-in-time` rather than leaving the field blank — a blank reads as a
 * window somebody forgot to record.
 *
 * ## The values
 *
 * Raw numbers, and **money as integer halalas** (§8.3.1, and
 * `components/table/csv.ts`’s own rule): `formatMoney` emits `884.00 SAR`,
 * which a spreadsheet reads as text with an embedded separator and cannot sum.
 * The `unit` and `currency` columns carry what the number is in.
 *
 * The row LABEL is translated, because it is what the operator reads; the
 * column ids and the header block are not, because they are what a spreadsheet
 * and whoever receives the file read. That split is `table/csv.ts`’s.
 *
 * `cell` is `() => null` on every column and is never called: `tableCsvText`
 * returns early from `valueOf` wherever a `csv` accessor is declared, and all
 * six declare one. This view exists to be exported and is never rendered.
 */
function exportBreakdown({
  breakdown,
  scope,
  t,
  language,
}: {
  breakdown: MetricBreakdown
  scope: BreakdownScope
  t: Translate
  language: Language
}): void {
  const columns: Array<DataColumn<MetricBreakdownRow>> = [
    {
      id: 'rank',
      header: 'rank',
      cell: () => null,
      /* The order IS the ranking (R5-12 §18.4), so the position is a fact about
         the row rather than a decoration — and it is what `sort` below names. */
      csv: (row) => breakdown.rows.indexOf(row) + 1,
    },
    {
      id: 'label',
      header: 'label',
      cell: () => null,
      /* R5-7’s union, and the same branch `RowLabel` takes: a `key` is copy and
         is translated, a `text` is an entity name and nothing may translate it. */
      csv: (row) =>
        row.label.kind === 'key' ? t(row.label.key, row.label.params ?? undefined) : row.label.text,
    },
    {
      id: 'value',
      header: 'value',
      cell: () => null,
      /* Unformatted. Halalas for money — see the note above. */
      csv: (row) => row.value,
    },
    { id: 'unit', header: 'unit', cell: () => null, csv: (row) => row.unit },
    { id: 'currency', header: 'currency', cell: () => null, csv: (row) => row.currency },
    {
      id: 'sub_label',
      header: 'sub_label',
      cell: () => null,
      /* R5-5 — the row’s second fact is a noun phrase and not a second numeric
         column, so it exports as the sentence it is. */
      csv: (row) =>
        row.subLabelKey === null
          ? null
          : t(row.subLabelKey, formatNumericParams(row.subLabelParams, language)),
    },
  ]

  const [board = scope.subTabId, ...rest] = scope.subTabId.split('-')
  const exportedAt = new Date().toISOString()
  const view: TableCsvView<MetricBreakdownRow> = {
    tableId: `metrics-${scope.subTabId}`,
    view: breakdown.key,
    columns,
    visible: columns,
    rows: breakdown.rows,
    query: '',
    filters: [
      { field: 'board', op: 'eq', value: board },
      { field: 'sub_tab', op: 'eq', value: rest.join('-') },
      scope.period === null
        ? { field: 'window', op: 'eq', value: 'point-in-time' }
        : { field: 'window', op: 'between', value: `${scope.period.start} ${scope.period.end}` },
    ],
    /* Not `value desc`: three of the seven lists rank ASCENDING (*least likely
       to renew* is one), and a file that claimed a direction would be wrong on
       those. `rank asc` is true of every one of them and names a real column. */
    sort: { field: 'rank', dir: 'asc' },
    total: breakdown.rowsTotal,
    exportedAt,
  }

  downloadCsv(tableCsvFilename(view.tableId, view.view, exportedAt), tableCsvText(view))
  /* §13.6 — announced, never toasted. R9/R10 spend a toast on a mutation of an
     object and an export mutates nothing. `DataTable` says the same thing the
     same way. */
  announce(t('breakdown.export.done', { rows: formatCount(breakdown.rows.length, language) }))
}

/**
 * R5-9's caveat. One sentence, so it takes a period (R6). It leads with a
 * numeral in English, so it is isolated on the same terms as everything else
 * here — and unlike every other run in this file its box does **not**
 * truncate, which is §18.1's one deliberate departure from the caption.
 */
function Caveat({
  caveat,
  t,
  language,
}: {
  caveat: NonNullable<MetricBreakdown['caveat']>
  t: Translate
  language: Language
}) {
  const { box, run } = isolatedRunProps({ className: 'pb-2 text-xs text-muted-foreground' })
  return (
    <p {...box}>
      <bdi {...run}>{t(caveat.key, formatNumericParams(caveat.params, language))}</bdi>
    </p>
  )
}

/**
 * AC-696's sentence. It opens with `Showing` in English and with a numeral in
 * several translations, and it always contains two numerals, so it is isolated
 * on the same terms as everything else here.
 */
function CutOff({ breakdown, t }: { breakdown: MetricBreakdown; t: Translate }) {
  const { box, run } = isolatedRunProps({ className: 'text-xs text-muted-foreground' })
  return (
    <p {...box}>
      <bdi {...run}>
        {t('breakdown.cutOff', {
          shown: breakdown.rowsShown,
          total: breakdown.rowsTotal,
          dimension: t(`breakdown.dimension.${breakdown.dimension}`),
        })}
      </bdi>
    </p>
  )
}

/**
 * **The row label, and the two kinds it can be — R5-7 §9.1.**
 *
 * `breakdown.row.entity` was a pass-through key whose entire English string was
 * `{name}`. It satisfied the type and AC-697 and it was a fig leaf, and the
 * union replaces it: `kind: 'key'` is **copy** — a rota day, a queue, a plan
 * tier, a reason code, a closed set — and `kind: 'text'` is **data** — a
 * person, a city, a subscription. Nothing translates a `text` and nothing may
 * try, which is why it does not reach `t` at all.
 *
 * **The two kinds render differently, and that is what makes V-4 fixable by
 * analysis instead of defensively.**
 *
 * | | `kind: 'key'` | `kind: 'text'` |
 * |---|---|---|
 * | Direction | takes the **page** direction — a translated label in an Arabic console must lay out RTL | **unknown at build time**; `Abdulaziz Al-Suwailem` in an Arabic console is the shipping case and it is LTR |
 * | Isolation | none needed | isolated, and the **truncating box** takes the run's direction |
 *
 * **V-4:** under `dir="rtl"` an overflowing Latin row label was ellipsised at
 * its HEAD — `Abdulaziz Al-Suwailem` became `…uwailem` — because the truncating
 * span carried the page's direction while the isolated run inside carried its
 * own. `dir="auto"` on the truncating box is the fix, and it is applied **only
 * to entity names**: the same treatment on a translated label would be wrong
 * for it, and before the union there was no way to tell the two apart, which is
 * why every row label was isolated defensively.
 *
 * The box still carries every class. `dir` is not a class and does not size
 * anything, so it does not reintroduce §5.4.
 */
const LABEL_BOX = 'min-w-0 flex-1 truncate text-sm font-medium text-foreground'

function RowLabel({ label, t }: { label: BreakdownLabel; t: Translate }) {
  if (label.kind === 'key') {
    return <span className={LABEL_BOX}>{t(label.key, label.params ?? undefined)}</span>
  }
  const { box, run } = isolatedRunProps({ className: LABEL_BOX })
  return (
    <span {...box} dir="auto">
      <bdi {...run}>{label.text}</bdi>
    </span>
  )
}

/**
 * One row. Two shapes — a link and a plain block — and they are the same
 * geometry, so a list of mixed rows does not step where the links stop
 * (`zones.citiesHealth` is exactly that list: Riyadh has a destination and the
 * three unlaunched cities do not).
 */
function Row({
  row,
  showBar,
  t,
  language,
}: {
  row: MetricBreakdownRow
  showBar: boolean
  t: Translate
  language: Language
}) {
  const value = isolatedRunProps({
    className: 'shrink-0 text-end text-sm tabular-nums text-foreground',
  })
  /**
   * **V-9, which stopped being latent the moment R5-5 changed what a sub-label
   * contains.** Until this pass the sub-label was the one slot in this file
   * with no isolation, and it rendered correctly only because every sub-label
   * was a pure strong-LTR run — `Document expired`, `Weekly plan`, `Live`.
   * Under R5-5 **every sub-label written leads with or contains a numeral**:
   * `4 of 20 trips ran late`, `3 past their SLA`, `Live · 45% of requests
   * unserved`. Under `dir="rtl"` the UBA would move the leading `4` to the far
   * end and the row would read `of 20 trips ran late 4`. The two changes ship
   * together for that reason; one without the other is a new defect.
   *
   * A sub-label is **copy**, so the box keeps the page direction and takes no
   * `dir="auto"` — the reasoning is `RowLabel`'s `kind: 'key'` arm. The run
   * inside isolates the numerals and nothing more.
   */
  const subLabel = isolatedRunProps({ className: 'truncate text-xs text-muted-foreground' })

  const body = (
    <>
      {/* The label and its figure share ONE line — R4-4's own diagram puts the
          value beside the label, not beneath it — and the bar and the sub-label
          span the full width underneath, which is what makes the bar's track
          the row's width rather than the label's. */}
      <span className="flex min-w-0 items-center justify-between gap-3">
        <RowLabel label={row.label} t={t} />
        {/* R5-5 — **the only numeric column**, aligned to the inline-end and
            tabular, and isolated so `45%` does not hop its sign or its unit in
            Arabic. There is nothing after it. */}
        <span {...value.box}>
          <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-border/40 bg-muted/60 px-1.5 py-0.5 text-xs font-bold tabular-nums text-foreground">
            <bdi {...value.run}>{formatMetricValue(row.value, row.unit, language)}</bdi>
          </span>
        </span>
      </span>
      {/* Order says *which is bigger*; the bar says *by how much*, and on a
          list whose top row is twice the second that is the whole reading. */}
      {showBar && <Bar fraction={row.barFraction} />}
      {row.subLabelKey && (
        <span {...subLabel.box}>
          <bdi {...subLabel.run}>
            {t(row.subLabelKey, formatNumericParams(row.subLabelParams, language))}
          </bdi>
        </span>
      )}
    </>
  )

  /* R4-4 — uniform height, chosen by the bar and not by the content, so a card
     of rows is one object read down. The two text slots truncate into it rather
     than growing it. */
  const shape = cn(
    'flex flex-col justify-center gap-0.5 rounded-lg px-3 transition-colors',
    showBar ? 'h-row-media' : 'h-row',
    'hover:bg-muted/50',
    row.drilldownRoute && 'cursor-pointer group',
  )

  if (!row.drilldownRoute) {
    return <span className={shape}>{body}</span>
  }

  return (
    <Link
      to={row.drilldownRoute}
      className={cn(
        shape,
        'outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {body}
    </Link>
  )
}

/**
 * The row's bar — **R5-6 §9.1, and the token is the whole of the change.**
 *
 * It was `--chart-fill`, which is `--ev-blue` at 10 % on white and measures
 * **1.142 : 1** against the card. That is a band, not a mark. The visual audit
 * read it as *"20px of row height that returns nothing the number beside it did
 * not"* and concluded the bar should go; the ruling's answer is that the
 * conclusion was right about the band and wrong about the bar, because the
 * reference's own ranked bar (`Top locations`, `analytics-live-view-globe-map`)
 * is a **saturated fill at full strength**. A pale area fill is what sits under
 * a line, where the line does the delimiting. A ranked bar has no line above
 * it, so it is the mark itself.
 *
 * So: **`--chart-series`** — `--ev-blue`, 4.574 : 1 on card white. No new
 * token; the token already existed and the wrong one was cited.
 *
 * **4px, not 6.** The 6 was chosen in the absence of a figure in the ruling,
 * reasoning that 4px at 1.15 : 1 is invisible. At 4.574 : 1 it is not, and 4 is
 * on the grid where 6 was on nothing but the half-step.
 *
 * **The denominator is the largest row shown**, so the top bar is always full
 * and the question the bar answers is a ranked list's own question — *how far
 * behind the leader?* Share-of-total answers a composition question that a
 * `Top 5 of 14` cut-off has already broken. `barFraction` arrives already
 * computed against that denominator; this component does not divide, for the
 * same reason `formatMetric` does not subtract.
 *
 * **No painted track.** `inlineSize` rather than a physical width: the bar
 * grows from the inline-start, so it grows from the right in Arabic without a
 * second rule (§9.1).
 */
function Bar({ fraction }: { fraction: number | null }) {
  if (fraction === null) return null
  const percent = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full">
      <span
        className="block h-full rounded-full bg-chart-series"
        /* Dynamic: a computed chart width. `inlineSize` rather than a physical
           width, so the bar grows from the inline-start in both languages. */
        style={{ inlineSize: `${percent}%` }}
      />
    </span>
  )
}
