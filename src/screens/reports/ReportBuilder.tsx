/**
 * The builder — **a persistent query panel beside a canvas that follows the
 * question.**
 *
 * ```
 *  [Draft]  Rider growth by district                    [Save] [⋯]
 *           What question does this report answer?
 *           On 2 dashboards
 *  ┌────────────┐  ┌──────────────────────────────────────────────┐
 *  │ Question   │  │ Compare to […] ✕     Computed 25 Jun 09:14 ↻  │ ← toolbar
 *  │ Measure    │  │   📈 Line Bar │ Day Week │ 7d 30d │ 📅 Range   │
 *  │ Second     │  └──────────────────────────────────────────────┘
 *  │ Split by   │  ┌──────────────────────────────────────────────┐
 *  │ Filters    │  │ · Part of this range is outside…             │
 *  │ [Refresh]  │  │ ┌──────────┐ ┌──────────┐                    │
 *  └────────────┘  │ │ panel    │ │ panel    │                    │
 *                  │ └──────────┘ └──────────┘                    │
 *                  └──────────────────────────────────────────────┘
 * ```
 *
 * ## The rail is the question; the toolbar is the lens
 *
 * Four controls that used to sit in the rail — **range, grain, compare-to and
 * chart type** — are `ChartToolbar`'s now, on one row directly above the plot
 * they change (Amplitude §A7). Nothing is rendered twice: each was removed from
 * `QueryPanel` and from `ReportModePanel` in the same change, and
 * `builder.chrome.test.tsx` asserts each appears exactly once in the document.
 *
 * The freshness sentence and its refresh moved up with them, out of
 * `ResultCanvas.Meta` — which is why both canvases take `withMeta={false}` here
 * and a dashboard tile, which has no toolbar, keeps them.
 *
 * ## The URL is the storage adapter, and that is an acceptance criterion
 *
 * **Q1 is open and there is no storage adapter.** `lib/persistence.ts` is
 * explicit that shipping a `localStorage` one would be *"answering Q1 by
 * writing code"*. §9.2's answer is that the URL stores the question, and
 * **AC-853** makes it binding: reload does not lose it, `Back` steps through
 * previous questions (**AC-854**), and sharing works with no share feature
 * because pasting a link into a chat is how every analytics tool is actually
 * used (**AC-855**). `serialiseReportQuery` is lossless by construction and
 * lives in the data layer, so an alert notification's `route` and this screen's
 * address bar are produced by one function.
 *
 * ## The canvas follows the question — **AC-809 is superseded**
 *
 * The spec's AC-809 said *"no query runs until `Run` is activated"* and AC-810
 * described the dirty canvas that rule produces. **The business owner overrode
 * both, in these words: *"the run button click it it should happen
 * automatically"*.** That is recorded here rather than in the spec because this
 * file does not own the spec; product-owner has been asked to amend AC-809 and
 * AC-810 and the amendment is named in the handoff.
 *
 * What replaces it:
 *
 * ```
 *  edit a control ──┐
 *                   ├─ 350ms quiet ─→ plan legal? ─→ run ─→ replace the address
 *  edit another ────┘                      │
 *                                          └─ illegal → nothing is requested
 * ```
 *
 * 1. **350ms of quiet, then run.** `useDebouncedValue` is the product's one
 *    debounce (every index table's search field is on it), so this is not a
 *    second timing rule. 350 rather than 250: an index table trails one
 *    keystroke, and this trails a *sequence of pointer decisions* — opening a
 *    `Select`, reading four options and clicking one leaves gaps a typist never
 *    produces, and at 250ms picking a measure and then its split fired two
 *    runs. It is still under the ~400ms where a change stops reading as caused
 *    by the click that preceded it.
 * 2. **An illegal query is never sent, and the gate is in ONE place.** It is
 *    the first thing `run` does — before the token, before the abort, before
 *    the request — so the debounce, the seed and the address effect are gated
 *    by construction rather than by three copies of one condition.
 *
 *    It used to be a guard in the debounce effect and a second one in the
 *    seed effect, and the address effect below them had **none**: a shared
 *    link carrying a question the planner already refuses reached
 *    `reports.run`, which under `DATA_SOURCE === 'http'` is a POST the client
 *    knew would fail — and the seed's guard was dead code, because the effect
 *    below it re-ran the same query ungated. A refused seed now renders the
 *    refusal on the canvas: the same screen `invalid-query` produces, one
 *    round trip earlier. The legality machinery is otherwise untouched — the
 *    disabled control, the reason beside it, the invalid canvas.
 * 3. **The newest question wins.** `runToken` discards a superseded response
 *    and the in-flight request is `abort()`ed, so a slow first leg cannot land
 *    on top of a fast second.
 * 4. **AC-810's promise survives, and it is now brief.** A run that has a
 *    previous answer *of the same shape* to keep does not blank the canvas —
 *    the picture stays, the freshness sentence says it is the previous run, and
 *    the numbers are replaced when they arrive. `stale` is therefore an
 *    in-flight state and not a standing condition; it only stands while the
 *    question is illegal, which is exactly when the operator must not be shown
 *    a fresh-looking number.
 *
 * ## `push` for a question asked, `replace` for a question followed
 *
 * One rule, and it is the reason `Back` still means something:
 *
 * | reason | what wrote it | history |
 * |---|---|---|
 * | `seed` | the URL already carries this question | nothing is written |
 * | `auto` | the debounce fired on an edit | **replace** |
 * | `ask`  | the rail's `Refresh`, a deliberate act | **push** |
 *
 * A mode switch that restores a cached answer asks nothing and still amends
 * the address — **replace**, for the same reason `auto` does: the address is
 * the storage adapter and it must say what is on screen (AC-855). A mode
 * arriving with no cached answer writes nothing until its own run does,
 * because an illegal question is never written to the address.
 *
 * Auto-running with `push` would put one entry in the history per control the
 * operator touched, and `Back` would walk keystrokes instead of questions —
 * AC-854 inverted. Replacing still keeps AC-853 (reload loses nothing) and
 * AC-855 (the address bar is always the question on screen) exactly true.
 *
 * ## Switching mode is not a refetch, and it does not lose a pick
 *
 * The business owner, looking at the mode strip: *"when changing between those
 * data shouldn't refresh either you retain the choices I made"*.
 *
 * There is one `query`, one `ranQuery` and one `result` on this screen and the
 * strip rewrote all three, so `Trend → Funnel → Trend` threw the trend's answer
 * away, blanked the canvas to `unstarted`, and let the debounce ask for it
 * again. With auto-run on, that was every click of the strip.
 *
 * `ModeMemory` is one entry per mode — what the mode had, what it last asked,
 * and what came back. A switch **restores** rather than re-asks, and the
 * debounce asks whether **this mode** has already issued **this question**
 * rather than whether the screen has. Two `useRef`s used to carry the chart
 * type and the grain across a switch; they were the same idea for two fields,
 * and they are gone, so one place decides what a mode remembers.
 *
 * `applyReportMode` still owns every legality rule: it is applied to the
 * remembered question on the way back in, so a value the target mode cannot
 * express never survives the restore. The memory only supplies the fields the
 * mode leaves to the operator.
 *
 * ## Retrying one failed series does not re-request the others
 *
 * **AC-851.** A failed leg re-runs as a **single-measure query** and its panels
 * and series are spliced into the result that already succeeded. Buckets are
 * identical because the window and grain are, and `panelId` is derived from the
 * measure and group rather than from an index, so the splice is by key and not
 * by position.
 *
 * Rules applied
 *   §5.1        NOT full-bleed. The rail and the sub-tab list stay, because the
 *               one screen whose job is comparison must not be the one screen
 *               you cannot leave.
 *   R3          `Refresh` is the panel's primary; the page header carries
 *               secondaries only, so there is one primary on screen.
 *   §8 slot 4c  no page-level primary. `Save` is the one secondary; everything
 *               else is in the `⋯` overflow (§A6).
 *   `states.md` all four base states live in `ResultCanvas`; none is a TODO.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertRuleIcon,
  ChatIcon,
  CopyIcon,
  CsvIcon,
  DashboardIcon,
  DeleteIcon,
  ExportIcon,
  HistoryIcon,
  ImageIcon,
  LinkIcon,
  MoreIcon,
  SaveIcon,
} from '@/components/icons'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChartToolbar, QueryPanel, ResultCanvas, type CanvasStatus } from '@/components/reports'
import { useAsync, useDebouncedValue } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import type { Annotation, AnnotationKind } from '@/data/types/annotation'
import {
  EYVAR_TODAY,
  REPORT_QUERY_PARAM,
  deleteReport,
  deserialiseReportQuery,
  duplicateReport,
  exportReport,
  listAnnotations,
  listDimensions,
  listMeasures,
  listPages,
  listReportVersions,
  localDayOf,
  planReportQuery,
  resolveWindow,
  runReport,
  saveAnnotation,
  savePage,
  serialiseReportQuery,
} from '@/data/clients'
import type {
  ChartType,
  Dimension,
  Measure,
  QueryViolation,
  ReportQuery,
  ReportResult,
  SavedReport,
  SavedReportVersion,
} from '@/data/types'
import { applyReportMode } from '@/data/clients/reports'
import { normaliseReportQuery, reportMode, type ReportMode } from '@/data/types'
import { pageTemplate, type Page } from '@/data/types/page'
import { formatDate, isDeepEqual, type Language, type Translator } from '@/lib'
import { downloadPng, renderChartPng, type ChartPngCaption } from '@/lib/chartPng'
import { auditExport, downloadCsv, reportCsvToText } from './export'
import { AlertRuleDialog } from './AlertRuleDialog'
import { SaveReportDialog } from './SaveReportDialog'
import { ReportModePanel } from './ReportModePanel'
import { ReportModeCanvas } from './ReportModeCanvas'

/**
 * The empty question. **Not a first-run illustration** (R8's first kind claims
 * the data does not exist); the data exists and the question has not been
 * asked, so the canvas carries one grey sentence and every control but the
 * measure picker is disabled in place (§5.3, AC-807, AC-843).
 */
export const EMPTY_QUERY: ReportQuery = {
  measures: [],
  /* G4, `02-report-builder-v2.md` §2.4 — `groupBy` is now `DimensionKey[]`, ≤ 2; `[]` is the v2 default that replaces v1's `null`. */
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

/**
 * **The question nobody has asked yet, in the encoding this file compares
 * questions in.**
 *
 * R8's second kind of empty is not a refusal: *"choose a measure to see the
 * report"* is what an unstarted canvas says, and `no-measure` is the planner
 * agreeing rather than objecting. Every other refusal names something the
 * operator did — an inverted window, a horizon that no longer fits, a measure
 * the catalogue dropped — and those the canvas must state.
 *
 * Compared through `serialiseReportQuery` rather than by reference, so a link
 * that spells the empty question out (`?q=` with the defaults written) is the
 * same unstarted canvas as one that omits it.
 */
const UNSTARTED_QUESTION = serialiseReportQuery(EMPTY_QUERY)

/**
 * **350ms of quiet before the canvas follows the question.**
 *
 * `DEFAULT_DEBOUNCE_MS` is 250 and belongs to a *search field*: it trails one
 * keystroke, and a typist's inter-key gap is shorter than that. This trails a
 * sequence of **pointer** decisions — open a `Select`, read four options, click
 * one, then reach for the split beside it — and those gaps are longer. At 250
 * that sequence fired two runs, the first of them for a question nobody
 * finished asking. 350 absorbs it and is still under the ~400ms at which a
 * change stops reading as caused by the click that preceded it.
 *
 * Exported so a test states the same number this module runs on rather than
 * sleeping on a literal that can drift away from it.
 */
export const AUTO_RUN_DEBOUNCE_MS = 350

/**
 * Why a run happened, which is the only input to what it writes to the address.
 * See the "push for a question asked" table in this file's header.
 */
type RunReason = 'seed' | 'auto' | 'ask'

/**
 * Amend the address with a question. **Never composes a fresh search string**:
 * `?view=`, `?failSeries=` and the library's own table parameters are other
 * owners' and a run is not a navigation away from them.
 */
function withReportQuery(search: string, encoded: string): string {
  const params = new URLSearchParams(search)
  params.set(REPORT_QUERY_PARAM, encoded)
  const next = params.toString()
  return next === '' ? '' : `?${next}`
}

/**
 * **The two modes that draw a series over a calendar axis — and the one
 * predicate that decides which canvas draws a report.**
 *
 * Exported because a dashboard tile has to route a pinned report the same way
 * this screen routes an open one. `DashboardTile` called `ResultCanvas`
 * unconditionally, so `RPT-7` was a retention matrix in the builder and a flat
 * series table on a board: one saved report, two different pictures of the
 * same numbers, with the tile's own AC-873 note claiming the opposite. One
 * exported predicate is what stops the two drifting apart again.
 *
 * It belongs beside `reportMode` in `src/data/types/report.ts`, where
 * `planQuery` already re-derives it as a local. That file is another owner's;
 * the move is named in the handoff.
 */
export function isSeriesMode(mode: ReportMode): boolean {
  return mode === 'trend' || mode === 'table'
}

/**
 * **The part of the question a RUN depends on — everything except the chart
 * type.**
 *
 * `chartType` reaches `planReportQuery` (for legality and coercion) and reaches
 * no resolver at all: every hit for it under `src/data/reporting` is in
 * `plan.ts`. A line and a bar over one question are the same numbers drawn
 * twice.
 *
 * Before this they were not treated that way. The debounce compared
 * `serialiseReportQuery`, which carries the chart type, so **switching from a
 * line to a bar issued a fresh request** — and `stale`, a deep-equal on the
 * same object, marked the canvas *Showing the previous run* until it landed.
 * The owner's sentence names exactly that: *"when changing between those data
 * shouldn't refresh"*. It is the same complaint the mode strip produced, one
 * control along, and now that both controls are one menu it is the same fix.
 *
 * So the two comparisons that decide *has this been asked* and *is this answer
 * still about the question on screen* both go through here. Everything else —
 * the address bar, the saved report, the shared link — keeps the full
 * serialisation, because the chart type IS part of what a saved report is.
 */
function askedOf(query: ReportQuery): string {
  return serialiseReportQuery({ ...query, chartType: 'line' })
}

/**
 * **What one mode remembers while another is on screen.**
 *
 *   `query`    what the mode held when it was left. `applyReportMode` is
 *              applied to it on the way back in, so a remembered value the
 *              mode cannot express never survives the restore.
 *   `issued`   the serialised question of the last run this mode ISSUED,
 *              written synchronously inside `run`. This is what the debounce
 *              asks, and it is why a restored mode does not re-run: the
 *              screen-wide `issued` belongs, after a switch, to the mode that
 *              was left.
 *   `ranQuery` / `result` — the answer and the question that produced it, kept
 *              together so a restore can prove they still match before showing
 *              them. They never travel apart.
 */
interface ModeMemory {
  query: ReportQuery
  issued: string | null
  ranQuery: ReportQuery | null
  result: ReportResult | null
}

export interface ReportBuilderProps {
  /** The saved report being edited, when one is open. `null` is an unsaved question. */
  report: SavedReport | null
  /** §8.3 state 12 — the report was deleted while open; `Save` becomes `Save as new`. */
  deleted?: boolean
  /** §3.7's no-data sentence, passed down so it stays byte-identical with every board. */
  noDataSentence: string
  /**
   * The page's heading. **Not rendered as the visible title any more** — §A5
   * makes that an editable field seeded from the record — but a page still owes
   * a screen reader one `h1`, and this is what it says when the report has no
   * name yet.
   *
   * `dir` used to be here for `PageHeader`'s mirrored back arrow. This header
   * has no glyph that mirrors, so the prop went with it; direction reaches
   * everything below through the document and the logical utilities.
   */
  title: string
  t: Translator
  language: Language
  onSaved?: (report: SavedReport) => void
}

export function ReportBuilder({
  report,
  deleted = false,
  noDataSentence,
  title,
  t,
  language,
  onSaved,
}: ReportBuilderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNowIso()
  const today = useMemo(() => (now ? localDayOf(now) : EYVAR_TODAY), [now])
  /* F-V2-28 — no `manage_analytics` key exists; the server gates every
     analytics write on `view_analytics`, so this is what "the caller
     resolves it" (`ResultCanvas.tsx`'s own doc comment) means today. */
  const canAnnotate = useShell().permissions.permissions.includes('view_analytics')

  /* AC-1205 — `ReportPickerPanel`'s `New report` link (§5's inline "add a
     report" panel). `undefined`, not `null`: `SaveReportDialog` takes its
     absence as "the dialog is exactly as it is today" (D9 optional-prop rule). */
  const pinTo = new URLSearchParams(location.search).get('pinTo') ?? undefined

  /* The question, restored from the URL when there is one, then from the saved
     report, then empty. Reading the URL FIRST is what makes a link to a
     modified version of a saved report reproduce the modification. */
  const initial = useMemo(() => {
    const encoded = new URLSearchParams(location.search).get(REPORT_QUERY_PARAM)
    const fromUrl = encoded ? deserialiseReportQuery(encoded) : null
    return fromUrl ?? report?.query ?? EMPTY_QUERY
    /* Deliberately keyed on the report id and the encoded param only: this is a
       seed, and re-seeding it on every navigation would discard edits. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id])

  const [query, setQuery] = useState<ReportQuery>(initial)
  const [ranQuery, setRanQuery] = useState<ReportQuery | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [violations, setViolations] = useState<readonly QueryViolation[]>([])
  const [status, setStatus] = useState<CanvasStatus>('unstarted')
  const [saveOpen, setSaveOpen] = useState(false)
  /** `Save as new` forces the dialog to CREATE, even on a saved record. */
  const [saveAsNew, setSaveAsNew] = useState(false)
  /** §11.3's delete, with the pinned-dashboard refusal it owes (AC-868). */
  const [pendingDelete, setPendingDelete] = useState<{
    dashboards: Array<{ id: string; name: string }>
    failed: boolean
  } | null>(null)

  /* §8's overflow — WP-2.7. `alertOpen` reuses the library's own dialog so a
     rule created from either surface is one component, one behaviour. */
  const [alertOpen, setAlertOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  /* The chart's own DOM node, for PNG export (`chartPng.ts` rasterises the
     `<svg>` it finds inside). A ref rather than a prop into `ResultCanvas`:
     that component is another agent's file right now. */
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  /**
   * **§A5 — the report names itself, in the header, editable in place.**
   *
   * A draft, exactly like the query beside it: **nothing here commits on a
   * keystroke.** The name and the description travel into `SaveReportDialog` as
   * `draftName` / `draftDescription`, so an operator who typed the title in the
   * header does not type it again in the dialog, and `Save` is still the only
   * thing that writes.
   *
   * Seeded from the record and re-seeded only when a DIFFERENT record opens —
   * re-seeding on every render would discard what is being typed.
   */
  const [draftName, setDraftName] = useState(report?.name ?? '')
  const [draftDescription, setDraftDescription] = useState(report?.description ?? '')
  useEffect(() => {
    setDraftName(report?.name ?? '')
    setDraftDescription(report?.description ?? '')
  }, [report?.id, report?.name, report?.description])

  /* §8.3 state 10 — one leg failed while the rest resolved. The data layer
     exposes `failMeasureKeys` as the seam and defines no transport for it, so
     the screen reads one search param and passes it through. Named in the
     handoff: without it AC-852 ("every state reachable with no code change")
     is not true of the partial-failure state.

     **Memoised on the raw string, not on `location.search`.** Auto-run amends
     the address on every legal edit, so keying this on the whole search string
     gave `run` — and therefore the debounce effect that depends on it — a new
     identity after every one of its own writes. */
  const failSeriesParam = new URLSearchParams(location.search).get('failSeries')
  const failMeasureKeys = useMemo(
    () => (failSeriesParam ? failSeriesParam.split(',').filter(Boolean) : undefined),
    [failSeriesParam],
  )

  /* The live address, readable inside `run` without `location.search` in its
     dependency list — for the same reason as above. Declared before every
     effect that calls `run`, so it is already current in the commit that
     follows a navigation. */
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  const catalogue = useAsync<{ measures: Measure[]; dimensions: Dimension[] }>(
    async (signal) => {
      const [measures, dimensions] = await Promise.all([
        listMeasures({ pageSize: 100 }, signal),
        listDimensions({ pageSize: 100 }, signal),
      ])
      return { measures: measures.items, dimensions: dimensions.items }
    },
    {
      deps: [],
      /* Parameterless catalogue read, shared by key with
         `DashboardDetailScreen`'s identical fetcher. `failMeasureKeys` is a
         parameter of the RUN, not of this read, so it is correctly absent. */
      cacheKey: 'catalogue.measures',
      isEmpty: (data) => data.measures.length === 0,
    },
  )

  const measures = catalogue.data?.measures ?? []
  const dimensions = catalogue.data?.dimensions ?? []
  const measuresByKey = useMemo(
    () => Object.fromEntries(measures.map((m) => [m.key, m])),
    [measures],
  )

  /* Synchronous, pure, and the SAME function `reports.run` calls. AC-817
     requires the answer before a request exists — and under auto-run it is
     load-bearing twice over: it is what disables the illegal control, and it is
     the gate the debounce below asks before it sends anything. */
  /* One catalogue object, so the panel's plan and `run`'s legality gate are
     the same call on the same inputs — and so `run`'s identity moves only when
     the catalogue actually lands, rather than on every render that rebuilt a
     fresh `{ measures, dimensions }` literal and re-armed the debounce with
     it. */
  const catalogueForPlan = useMemo(() => ({ measures, dimensions }), [measures, dimensions])

  const plan = useMemo(
    () => planReportQuery(query, catalogueForPlan, today),
    [query, catalogueForPlan, today],
  )

  const runToken = useRef(0)
  /** The in-flight request, so a superseded one stops costing anything. */
  const inFlight = useRef<AbortController | null>(null)
  /* The answer on screen, readable inside `run`. A ref rather than a
     dependency: `run` sits in two effects' dependency lists, and a new identity
     after every result would re-arm the debounce on the run that just landed. */
  const resultRef = useRef<ReportResult | null>(null)
  useEffect(() => {
    resultRef.current = result
  }, [result])
  /**
   * The serialised question of the **last run issued** — set synchronously, at
   * the top of `run`, before any `await`.
   *
   * This is what stops the debounce, the seed and the address-bar echo from
   * asking the same question three times. A state flag could not do it: the
   * debounce effect and the `location.search` effect both fire before a
   * `setState` from an earlier one has committed.
   */
  const issued = useRef<string | null>(null)

  /**
   * **One entry per mode, so the strip restores instead of re-asking.**
   *
   * A ref rather than state: it is written inside `run` before any `await` and
   * read by two effects in the same commit, which is the same reason `issued`
   * above is a ref. Nothing renders from it directly — a switch copies what it
   * holds into `query`, `ranQuery` and `result`, which are what render.
   */
  const modeMemory = useRef<Partial<Record<ReportMode, ModeMemory>>>({})
  /** Merge into a mode's entry, leaving untouched whatever the patch omits. */
  const remember = useCallback(
    (mode: ReportMode, patch: Partial<ModeMemory> & { query: ReportQuery }) => {
      const prior = modeMemory.current[mode]
      modeMemory.current[mode] = {
        issued: prior?.issued ?? null,
        ranQuery: prior?.ranQuery ?? null,
        result: prior?.result ?? null,
        ...patch,
      }
    },
    [],
  )

  const run = useCallback(
    async (next: ReportQuery, reason: RunReason) => {
      /* **THE legality gate — one condition, one place, every entry point.**
         It is deliberately the first statement in this function: ahead of the
         token, ahead of the abort and ahead of the request, so a refusal costs
         nothing and cannot cancel a legal run that is still in flight.

         The same pure function `reports.run` validates with, so the local
         refusal and the server's are one answer rather than two that agree
         today. See the header's rule 2 for what this replaced. */
      const encoded = serialiseReportQuery(next)
      const refusal = planReportQuery(next, catalogueForPlan, today)
      if (refusal.violations.length > 0) {
        setViolations(refusal.violations)
        /* A SEEDED question was ASKED — by a link, by a saved report, by an
           alert's route — so the canvas owes an answer, and the answer is the
           refusal. That is the screen `invalid-query` renders, one round trip
           earlier, and it is the only way a stale shared link says what is
           wrong with it.
           An EDITED question is still being composed: the rail already
           disables the control and names the reason, and blanking the canvas
           on the click that made the question briefly illegal is AC-810's
           blanked canvas, ninety times an hour.
           The empty question is neither. Nobody asked it, so it is R8's second
           kind of empty and the canvas keeps saying so. */
        if (reason === 'seed' && encoded !== UNSTARTED_QUESTION) setStatus('invalid')
        return
      }

      const token = (runToken.current += 1)
      /* Cancel, do not merely ignore. The token below already discards a
         superseded response; aborting also stops the request that would have
         produced it. */
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      issued.current = encoded
      /* **This mode has now asked this question.** Written synchronously for
         the same reason `issued` is, and keyed by mode: a trend that has just
         run must not make a funnel look answered, and — the defect the owner
         named — a funnel that has just run must not make the trend you come
         back to look unasked. */
      const runMode = reportMode(next)
      remember(runMode, { query: next, issued: askedOf(next) })

      /* **§8.3 state 2, kept honest under auto-run.** A run that has a previous
         answer *of the same shape* behind it does not blank the canvas: the
         picture stays, the toolbar's freshness sentence says it is the previous
         run, and the numbers are replaced when they land. A skeleton on every
         control change is the blanked canvas AC-810 forbids, ninety times an
         hour. A run with nothing behind it — the first one, or one whose mode
         has no previous answer to show — still gets the skeleton, because there
         is nothing to keep. */
      const previous = resultRef.current
      const keepsFrame = previous !== null && reportMode(previous.query) === reportMode(next)
      setStatus(keepsFrame ? 'content' : 'loading')

      try {
        const outcome = await runReport(next, {
          today,
          failMeasureKeys,
          signal: controller.signal,
        })
        if (token !== runToken.current) return
        if (outcome.status === 'invalid-query') {
          /* A DOMAIN answer, returned. The previous result is kept; the
             violations say what to fix (AC-825). */
          setViolations(outcome.violations)
          setStatus('invalid')
          return
        }
        setViolations([])
        setResult(outcome.result)
        setRanQuery(next)
        setStatus('content')
        /* Filed under the mode that asked. This is what a switch hands back,
           and it is what makes a round trip through another mode cost no
           request at all. */
        remember(runMode, {
          query: next,
          issued: askedOf(next),
          ranQuery: next,
          result: outcome.result,
        })

        /* The address is the storage adapter (§9.2), so it is amended for every
           run that was not seeded FROM it — and amended, never composed: the
           view, `?failSeries=` and the library's own parameters are not this
           run's to discard. `replace` for a question the canvas followed,
           `push` for one the operator asked. See the table in the header. */
        if (reason !== 'seed') {
          navigate(
            {
              pathname: locationRef.current.pathname,
              search: withReportQuery(locationRef.current.search, serialiseReportQuery(next)),
            },
            { replace: reason === 'auto' },
          )
        }
      } catch {
        if (token !== runToken.current) return
        /* AC-846 — the error is IN the canvas, the query is not lost, and the
           panel stays usable. */
        setStatus('error')
      }
    },
    [today, failMeasureKeys, navigate, catalogueForPlan, remember],
  )

  /* A question that arrives already composed — from a link, from a saved
     report, from an alert notification — runs itself once, on arrival, without
     waiting out the debounce. The debounce effect below stands down for it (see
     its `issued` guard), so a shared link still costs exactly one request.

     **The seed is also the only run that writes nothing to the address**: it
     was read FROM the address, so re-writing it would spend a history entry on
     opening a link.

     **"Composed" is the planner's answer, not `measures.length`.** A funnel,
     a cohort and a journey carry no `measures` by construction (P7-T1 put
     their configuration in `funnel` / `cohort` / `journey`), so keying the
     seed on that array meant a shared link to any of the three landed on an
     unstarted canvas and the operator had to press `Run` to see the report
     they were sent — which is AC-855 not holding for four of the five
     modes. The planner already answers "is this question answerable", it is
     the same function `reports.run` calls, and it says no for the empty
     query. */
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    if (catalogue.status !== 'content') return
    seeded.current = true
    /* `seed` — the address already carries this question, so nothing is
       written to it and no history entry is spent on arriving.

       **No legality check here, and that is the fix rather than an omission.**
       There was one, and it was dead: the address effect fifty lines below
       re-ran the same query with no check at all, so refusing here changed
       nothing except which line a reader trusted. `run` owns the gate now, for
       every entry point, and it states the refusal on the canvas instead of
       sending it. */
    void run(initial, 'seed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.status, initial, run])

  /**
   * **The canvas follows the question.** This is the whole of the owner's
   * second sentence — *"the run button click it it should happen
   * automatically"*.
   *
   * `useDebouncedValue` is the product's one debounce; `settled !== query`
   * means the operator is still deciding, so the effect does nothing until the
   * value has stood still for `AUTO_RUN_DEBOUNCE_MS`. Four guards, and each one
   * is a distinct failure it prevents:
   *
   * 1. `seeded` — the seed effect above owns the first run. Without this, a
   *    composed link ran twice: once on arrival and once when the debounce
   *    caught up (AC-855's "no second click" becomes "two requests").
   * 2. `catalogue.status` — every measure is unresolved until the catalogue
   *    lands, so a run before it is a run the planner would refuse for a reason
   *    the operator did not cause.
   * 3. `modeMemory` — the question **this mode** has already asked. This is
   *    what makes the address-bar echo below, the seed and this effect
   *    converge instead of handing each other work, and it is per-mode
   *    because after a switch the screen-wide `issued` belongs to the mode
   *    that was left: a single flag made a restored trend look unasked and
   *    re-fetched an answer already on screen.
   *
   * The legality gate is **not** here any more. It is the first thing `run`
   * does, which is what gates the seed and the address effect too — see the
   * header's rule 2. Nothing about the machinery moved: the control stays
   * disabled, the reason stays beside it, and an illegal edit keeps the
   * previous answer marked stale.
   */
  const settled = useDebouncedValue(query, AUTO_RUN_DEBOUNCE_MS)
  useEffect(() => {
    if (!seeded.current) return
    if (catalogue.status !== 'content') return
    if (settled !== query) return
    if (modeMemory.current[reportMode(query)]?.issued === askedOf(query)) return
    void run(query, 'auto')
  }, [settled, query, catalogue.status, run])

  /* AC-854 — Back steps through previous questions, and the panel follows.
     The URL is the source of truth for what has been RUN, so a popstate
     re-seeds the panel and re-runs.

     **`issued` is checked first, and under auto-run it is load-bearing.** This
     effect used to fire only after `Run`; it now fires after every debounced
     run, because the run amends the address. Without the guard the screen would
     answer its own write by re-seeding the panel from it and running a second
     time — twice the requests, and a `setQuery` racing whatever the operator
     typed in between. */
  useEffect(() => {
    const encoded = new URLSearchParams(location.search).get(REPORT_QUERY_PARAM)
    if (!encoded) return
    if (encoded === issued.current) return
    const fromUrl = deserialiseReportQuery(encoded)
    if (!fromUrl) return
    if (ranQuery && isDeepEqual(fromUrl, ranQuery)) return
    if (catalogue.status !== 'content') return
    setQuery(fromUrl)
    void run(fromUrl, 'seed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, catalogue.status])

  /**
   * **AC-851** — retry one leg without re-requesting the others.
   *
   * The retry is a single-measure query, so the resolved series is never asked
   * for again. Merging is by `panelId` and `measureKey`, never by index: the
   * buckets are identical because the window and grain are, and a positional
   * merge would silently mis-file a group if the fold changed.
   */
  const retrySeries = useCallback(
    async (measureKey: string) => {
      if (!ranQuery || !result) return
      const outcome = await runReport({ ...ranQuery, measures: [{ key: measureKey }] }, { today })
      if (outcome.status !== 'ok') return
      setResult((current) => {
        if (!current) return current
        return {
          ...current,
          panels: [
            ...current.panels.filter(
              (panel) =>
                !current.series.some((s) => s.panelId === panel.panelId && s.measureKey === measureKey),
            ),
            ...outcome.result.panels,
          ],
          series: [
            ...current.series.filter((s) => s.measureKey !== measureKey),
            ...outcome.result.series,
          ],
        }
      })
    },
    [ranQuery, result, today],
  )

  const exportCsv = useCallback(async () => {
    const target = ranQuery ?? query
    const csv = await exportReport(target, { reportName: report?.name ?? null, today })
    downloadCsv(`${report?.name ?? 'report'}.csv`, reportCsvToText(csv))
    /* AC-1160 — one audit entry per export. */
    auditExport({
      format: 'csv',
      reportName: report?.name ?? null,
      windowFrom: csv.header.windowFrom,
      windowTo: csv.header.windowTo,
      filters: target.filters,
    })
  }, [ranQuery, query, report, today])

  /**
   * AC-1159 — the chart's own `<svg>` in `chartContainerRef`, rasterised at 2×
   * with a caption band and the same text in a `tEXt` chunk (`chartPng.ts`).
   * `table` and the mode canvases have no plot yet, so `pngExportable` below
   * keeps this disabled in place rather than exporting a blank image.
   */
  const exportPng = useCallback(async () => {
    const target = ranQuery ?? query
    if (!result) return
    /* `.recharts-surface` first: the container also holds small decorative
       icon `<svg>`s (the refresh glyph, `InfoHint`), and a bare `svg` selector
       grabbed the first one of those instead of the plot. */
    const svg =
      chartContainerRef.current?.querySelector<SVGSVGElement>('svg.recharts-surface') ??
      chartContainerRef.current?.querySelector<SVGSVGElement>('svg')
    if (!svg) return
    const win = resolveWindow(target.window, today)
    const caption: ChartPngCaption = {
      title: (report?.name ?? draftName).trim() || t('rb.title.placeholder'),
      window: t('rb.control.window.range', { from: win.from, to: win.to }),
      grain: t(`rb.grain.${target.grain}`),
      comparison:
        typeof target.periodComparison === 'string'
          ? t(`rb.compare.${target.periodComparison}`)
          : t('rb.compare.fixed', { from: target.periodComparison.from, to: target.periodComparison.to }),
      filters: target.filters.map((filter) => `${filter.field} ${filter.op} ${String(filter.value)}`),
      asOf: t('rb.canvas.asOf', {
        time: formatDate(result.asOf, { style: 'day-month-time', language }),
      }),
      pageUrl: `${window.location.origin}${location.pathname}?${REPORT_QUERY_PARAM}=${serialiseReportQuery(target)}`,
    }
    const blob = await renderChartPng({ svg, caption, query: serialiseReportQuery(target) })
    downloadPng(`${report?.name ?? 'report'}.png`, blob)
    auditExport({
      format: 'png',
      reportName: report?.name ?? null,
      windowFrom: win.from,
      windowTo: win.to,
      filters: target.filters,
    })
  }, [ranQuery, query, result, report, draftName, today, language, location.pathname, t])

  /* Dirty means *the numbers on screen answer a different question*. Redrawing
     the same numbers as bars is not that — see `askedOf`. */
  const stale = ranQuery !== null && askedOf(query) !== askedOf(ranQuery)

  /**
   * **Share, with no share feature** — AC-855, finally rendered.
   *
   * The link is not a second representation of the question: it is the *same*
   * `serialiseReportQuery` the `Run` push writes to the address bar and the
   * same one an alert notification's `route` is built from, so what lands in
   * the clipboard is byte-identical to what `Back` walks. `ranQuery` first,
   * because the honest thing to hand someone is the question that produced the
   * numbers on screen; `query` only when nothing has run yet.
   *
   * **R10 sends this to a toast and R9 makes it name the object.** Every other
   * message in this module is a standing condition and correctly renders as a
   * sentence beside the result — this one is a transient confirmation of an
   * action that left no trace on screen, which is the one case a toast is for.
   *
   * The clipboard is a permission, so it is a promise that can be refused.
   * `SecretRevealDialog` recovers by selecting the text; there is no text to
   * select here, so the refusal is *stated* rather than swallowed — a silent
   * failure means pasting whatever was in the clipboard before.
   */
  const copyLink = useCallback(async () => {
    const target = ranQuery ?? query
    const url = `${window.location.origin}${location.pathname}?${REPORT_QUERY_PARAM}=${serialiseReportQuery(target)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('rb.canvas.link.copied'))
    } catch {
      toast.error(t('rb.canvas.link.failed'))
    }
  }, [ranQuery, query, location.pathname, t])

  /**
   * **§A5's `DRAFT` / `SAVED`, and it is derived rather than tracked.**
   *
   * A report is clean when the record on the server and the three things on
   * screen — the question, the name and the description — say the same thing.
   * Anything else is a draft, including a report that has never been saved and
   * a report that was deleted underneath the operator (§8.3 state 12), whose
   * only honest save is a new one.
   *
   * The query comparison goes through `normaliseReportQuery` because that is
   * the equality the data layer defines; comparing the objects directly would
   * call a report dirty over key order or an absent optional.
   */
  const dirty =
    report === null ||
    deleted ||
    draftName !== (report.name ?? '') ||
    draftDescription !== (report.description ?? '') ||
    !isDeepEqual(normaliseReportQuery(query), normaliseReportQuery(report.query))

  const pinnedCount = report?.pinnedToDashboardIds.length ?? 0

  /** §11.3 / AC-868 — refused by default when the report is pinned, WITH names. */
  const confirmDelete = useCallback(
    async (force: boolean) => {
      if (!report) return
      try {
        const outcome = await deleteReport(report.id, { force })
        if (outcome.status === 'pinned') {
          setPendingDelete({ dashboards: outcome.dashboards, failed: false })
          return
        }
        setPendingDelete(null)
        navigate('/management/reports')
      } catch {
        /* A failed mutation never closes the surface it came from (§8.3). */
        setPendingDelete((current) => (current ? { ...current, failed: true } : current))
      }
    },
    [report, navigate],
  )

  /* A `table` chart and the three mode canvases (funnel/cohort/journey) have
     no `<svg>` plot yet — `pngExportable` keeps the PNG item disabled in place
     rather than rasterising a blank container. */
  const pngExportable = isSeriesMode(reportMode(query)) && query.chartType !== 'table'

  /** AC-1166 — a private copy named `<name> (copy)`, opened immediately. */
  const duplicate = useCallback(async () => {
    if (!report) return
    const outcome = await duplicateReport(report.id)
    onSaved?.(outcome.data)
  }, [report, onSaved])

  /* §8's `Pin to a page…` — pages of `kind: 'dashboard'` only, mirroring
     `SaveReportDialog`'s own picker. Fetched only once the overflow's submenu
     is open, so a builder that is never pinned costs no extra request. */
  const [pinMenuOpen, setPinMenuOpen] = useState(false)
  const pinPages = useAsync(
    async (signal) => {
      const result = await listPages(
        { pageSize: 100, filters: [{ field: 'kind', op: 'eq', value: 'dashboard' }] },
        signal,
      )
      /* Templates dropped — see the matching comment in `SaveReportDialog.tsx`. */
      const items = result.items.filter((page) => !pageTemplate(page))
      return { ...result, items, total: items.length }
    },
    {
      deps: [pinMenuOpen],
      enabled: pinMenuOpen,
      cacheKey: 'pages.list.dashboard',
      isEmpty: (res) => res.items.length === 0,
    },
  )
  const pinToPage = useCallback(
    async (page: Page) => {
      if (!report) return
      try {
        const outcome = await savePage({
          id: page.id,
          kind: page.kind,
          title: page.title,
          icon: page.icon,
          description: page.description,
          visibility: page.visibility,
          tags: page.tags,
          scope: page.scope,
          blocks: [
            ...page.blocks,
            { id: `RPB-${page.id}-${report.id}`, type: 'report', reportId: report.id, view: 'chart', height: 'M', title: report.name },
          ],
          version: page.version,
        })
        if (outcome.status !== 'saved') throw new Error('pin failed')
        toast.success(t('rb.overflow.pin.toast', { page: page.title }))
      } catch {
        toast.error(t('rb.overflow.pin.failed'))
      }
    },
    [report, t],
  )

  /* §8's `Version history` — a panel under the header, not a dialog: an
     operator looks at an old version and walks away, so `Restore` loads the
     query into the DRAFT and never calls `saveReport` (AC-1162). */
  const versions = useAsync<readonly SavedReportVersion[]>(
    async (signal) => {
      if (!report) return []
      const page = await listReportVersions(report.id, { pageSize: 20 }, signal)
      return page.items
    },
    {
      deps: [report?.id, versionsOpen],
      enabled: versionsOpen && report !== null,
      cacheKey: `reports.versions.${report?.id ?? 'none'}`,
      isEmpty: (rows) => rows.length === 0,
    },
  )
  const restoreVersion = useCallback(
    (version: SavedReportVersion) => {
      setQuery(version.query)
      toast.success(
        t('rb.overflow.versions.restored', {
          time: formatDate(version.at, { style: 'day-month-time', language }),
        }),
      )
    },
    [t, language],
  )

  /**
   * **The header — §8's anatomy, wearing §A5 and §A6.**
   *
   * It is written here rather than composed from `PageHeader` because three of
   * its parts have no slot in that component and are not this screen's to add
   * to it: a **title that is an input**, a **description placeholder beneath
   * it**, and an **overflow carrying a submenu**. `PageHeader.title` is a
   * `string` and its overflow is a flat list of `PageAction`s.
   *
   * Everything §8 does specify is kept: one row, title first, badges on the
   * title's baseline, data-derived meta on the second line, actions at the
   * inline end, at most one primary (there is none — `Run` is the rail's), and
   * unavailable actions greyed IN PLACE rather than removed.
   *
   * Named in the handoff as a deviation for product-designer to rule on.
   */
  const header = (
    <header className="flex flex-col gap-1 pb-5">
      {/* One `h1` per page (§7.2). The visible title is an input — a text field
          is not a heading, and a page whose only name is a form control has no
          landmark a screen-reader user can jump to. It says the report's name
          once it has one, and the route's name until then. */}
      <h1 className="sr-only">{draftName.trim() === '' ? title : draftName}</h1>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* R7: `Draft` is `info` — written, not yet live. `Saved` is
                `neutral` — an inert factual outcome, deliberately NOT
                `success`, which R7 keeps for money settled and work complete.
                §7.5: the word carries the state, never the tone alone. */}
            <StatusBadge tone={dirty ? 'info' : 'neutral'}>
              {t(dirty ? 'rb.state.draft' : 'rb.state.saved')}
            </StatusBadge>
            {/* A real `<input>`, never a `div` with `contentEditable`: it is
                focusable, it announces as a text field, it takes the focus ring
                and it carries its own label. `text-band` is §8 slot 2's own
                size, so the title does not change rank by becoming editable. */}
            <input
              /* AC-898 — a report name is USER CONTENT. `dir="auto"` is the
                 mechanism for a text field (a `<bdi>` cannot wrap one), so an
                 Arabic name types and renders right-to-left inside an English
                 UI, and an English one does not flip inside an Arabic one. */
              dir="auto"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              aria-label={t('rb.title.label')}
              placeholder={t('rb.title.placeholder')}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-start text-band font-medium text-foreground outline-none placeholder:text-muted-foreground hover:border-border focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          {/* §A5's second line, and it is a QUESTION — *"What question does
              this report answer?"*. It is the one place a report says why it
              exists, which is why it belongs in the header rather than in a
              field buried inside the save dialog. */}
          <input
            dir="auto"
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            aria-label={t('rb.description.label')}
            placeholder={t('rb.description.placeholder')}
            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-start text-sm text-muted-foreground outline-none placeholder:text-muted-foreground hover:border-border focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />

          {/* §8's meta line — DATA-DERIVED, which is what that slot is for: it
              changes when the report is pinned or unpinned. A plural family,
              never a count glued to a noun (AC-895). Absent at zero rather than
              printing "on no dashboards", which is chrome for a fact nobody
              asked about. */}
          {pinnedCount > 0 && (
            <p className="px-1 text-sm text-muted-foreground">
              {t.plural('rb.header.dashboards', { count: pinnedCount })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* §8 slot 4c — no page-level primary. `Run` is the rail's one
              primary and stays it (R3). */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSaveAsNew(false)
              setSaveOpen(true)
            }}
            /* Nothing to save until something has been asked — and *asked* is
               mode-shaped: a funnel has no `measures` and never will, so keying
               this on `measures.length` alone made `Save` permanently off in
               three of the five modes. The planner already knows whether the
               question is answerable, and that is the same test `saveReport`
               applies (`query-invalid`). */
            disabled={plan.violations.length > 0}
          >
            <SaveIcon aria-hidden="true" className="size-4" />
            {/* `Save as new` is what a DELETED report's save becomes (§8.3
                state 12). A report that has simply never been saved is `Save`;
                calling it "save as new" would imply an original it is diverging
                from. */}
            {deleted ? t('rb.saveAs') : t('rb.save')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* §A6's `⋯`. The accessible name is the shell's own
                  `More actions`, so the overflow is called the same thing here
                  as on every other screen — the glyph replaces the word on
                  screen, never in the accessibility tree. */}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t('shell.moreActions')}
              >
                <MoreIcon aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* §1.5: once one item in a menu carries a leading icon, every
                  item does. */}
              <DropdownMenuItem
                onSelect={() => void copyLink()}
                /* An unrunnable question is not a shareable link: the recipient
                   would land on the invalid-query canvas holding violations
                   they did not cause. Disabled IN PLACE (D9 CQ-3). */
                disabled={plan.violations.length > 0}
              >
                <LinkIcon aria-hidden="true" className="size-4" />
                {t('rb.canvas.link.copy')}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setSaveAsNew(true)
                  setSaveOpen(true)
                }}
                disabled={plan.violations.length > 0}
              >
                <CopyIcon aria-hidden="true" className="size-4" />
                {t('rb.saveAs')}
              </DropdownMenuItem>

              {/* §8 — Duplicate, Pin to a page, Create alert, Ask the analyst,
                  Version history. All five need a SAVED report; a draft has
                  nothing yet for any of them to point at. */}
              <DropdownMenuItem onSelect={() => void duplicate()} disabled={report === null}>
                <CopyIcon aria-hidden="true" className="size-4" />
                {t('rb.library.duplicate')}
              </DropdownMenuItem>

              <DropdownMenuSub onOpenChange={setPinMenuOpen}>
                <DropdownMenuSubTrigger disabled={report === null}>
                  <DashboardIcon aria-hidden="true" className="size-4" />
                  {t('rb.overflow.pin')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {pinPages.status === 'loading' && (
                    <p className="px-1.5 py-1 text-xs text-muted-foreground">
                      {t('rb.overflow.pin.loading')}
                    </p>
                  )}
                  {pinPages.status === 'error' && (
                    <p className="px-1.5 py-1 text-xs text-muted-foreground">
                      {t('rb.overflow.pin.error')}
                    </p>
                  )}
                  {pinPages.status === 'empty' && (
                    <p className="px-1.5 py-1 text-xs text-muted-foreground">
                      {t('rb.overflow.pin.empty')}
                    </p>
                  )}
                  {(pinPages.data?.items ?? []).map((page) => (
                    <DropdownMenuItem key={page.id} onSelect={() => void pinToPage(page)}>
                      <bdi>{page.title}</bdi>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem onSelect={() => setAlertOpen(true)} disabled={report === null}>
                <AlertRuleIcon aria-hidden="true" className="size-4" />
                {t('rb.overflow.createAlert')}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => navigate('/management/reports?view=analyst')}
              >
                <ChatIcon aria-hidden="true" className="size-4" />
                {t('rb.overflow.ask')}
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => setVersionsOpen(true)} disabled={report === null}>
                <HistoryIcon aria-hidden="true" className="size-4" />
                {t('rb.overflow.versions')}
              </DropdownMenuItem>

              {/* §B4's `Export ▸`. PNG works now (AC-1159); PDF stays blocked. */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ExportIcon aria-hidden="true" className="size-4" />
                  {t('rb.export.menu')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => void exportCsv()} disabled={result === null}>
                    <CsvIcon aria-hidden="true" className="size-4" />
                    {t('rb.export')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void exportPng()}
                    disabled={result === null || !pngExportable}
                  >
                    <ImageIcon aria-hidden="true" className="size-4" />
                    {t('rb.export.png')}
                  </DropdownMenuItem>
                  {/* **Blocked, and rendered anyway.** §11.2 gates at render and
                      D9 CQ-3 disables in place with a reason. Amplitude greys
                      these out and says nothing; the sentence beneath it is
                      the whole difference. */}
                  <DropdownMenuItem disabled>
                    <ImageIcon aria-hidden="true" className="size-4" />
                    {t('rb.export.pdf')}
                  </DropdownMenuItem>
                  <p className="px-1.5 py-1 text-xs text-muted-foreground">
                    {t('rb.export.pdf.blocked')}
                  </p>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* §8 slot 4b — destructive LAST and separated, and still not red:
                  the confirmation that follows carries the weight (§5.4). */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setPendingDelete({ dashboards: [], failed: false })}
                /* Nothing to delete on a report that was never saved, and
                   nothing left to delete on one already gone. */
                disabled={report === null || deleted}
              >
                <DeleteIcon aria-hidden="true" className="size-4" />
                {t('rb.library.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )

  /**
   * **P7-T4 — the `isDirectSerializedQuery` fallback is gone, and with it
   * `ReportStudio`.**
   *
   * It used to render the Studio whenever the URL carried no `?q=`, which made
   * the ungoverned editor the front door and left the governed one reachable
   * only from a link the governed one had produced — a closed loop where the
   * shareable half could only be entered by someone who already had a share
   * (`REMEDIATION-PLAN.md` §3.3). The Studio's five modes are now on this
   * builder, behind `mode`, so there is nothing left to fall back to.
   */
  const mode = reportMode(query)
  /* `trend` and `table` are the two modes `QueryPanel` was written for: a
     measure, a split, a grain, a chart. The other three configure a different
     shape and get the rail built for it. */
  const seriesMode = isSeriesMode(mode)

  /**
   * **The mode strip — a restore, not a refetch.**
   *
   * This used to be a `setQuery` and two `useRef`s carrying the chart type and
   * the grain across the switch. Everything else about the mode was thrown
   * away: the answer, the question that produced it, and therefore the four
   * hundred milliseconds and one request it took to get them back. The owner's
   * sentence — *"when changing between those data shouldn't refresh either you
   * retain the choices I made"* — is both halves of that, so both are here.
   *
   * Four things happen, in this order, and none of them is optional:
   *
   * 1. **The mode being left is filed**, with what it holds right now. The
   *    answer is filed only when it BELONGS to that mode; a result from
   *    another mode is on screen for one render after an abort, and filing it
   *    here would hand it back later as this mode's answer.
   * 2. **A run in flight is discarded.** It belongs to the mode being left, so
   *    letting it land would write one mode's numbers over another's.
   *    `runToken` already exists to say which response is still wanted.
   * 3. **`applyReportMode` decides, last and always.** The memory supplies
   *    what the mode remembered; the data layer's one function then fixes
   *    everything the mode itself decides — a funnel is bars at one total — so
   *    a remembered value the target mode cannot express never survives. With
   *    no memory, the question travels across from the mode being left, which
   *    is what makes *"look at this as a funnel"* work the first time.
   * 4. **An answer is handed back only if it still answers this question.**
   *    Compared through `serialiseReportQuery`, which is the data layer's own
   *    canonical encoding, so a key the deserialiser filled in and the
   *    operator never touched does not read as an edit.
   */
  const switchMode = useCallback(
    (next: ReportMode, chartType?: ChartType | null) => {
      const from = reportMode(query)
      if (from === next) return

      const live = result !== null && reportMode(result.query) === from
      remember(from, live ? { query, ranQuery, result } : { query })

      runToken.current += 1
      inFlight.current?.abort()

      const memory = modeMemory.current[next]
      /* **The shape the operator picked wins over the shape the mode
         remembered, and `applyReportMode` still decides last.**

         The shape menu is one control now, so picking `Bar chart` while a
         retention matrix is on screen is one action that means two things:
         *go to trend* and *draw it as bars*. Without this the mode's memory
         handed back whatever it was last drawn as and the operator got a line
         they did not ask for — the pick silently discarded.

         Applied BEFORE `applyReportMode` rather than after, so a mode that
         fixes its own shape (a funnel is bars at one total) still overrides
         it. A control that cannot be overruled by the mode it is switching
         into is a control that lies. */
      const carried = memory?.query ?? query
      const restored = applyReportMode(
        chartType == null ? carried : { ...carried, chartType },
        next,
      )
      const encoded = serialiseReportQuery(restored)
      const answer =
        memory?.result != null &&
        memory.ranQuery != null &&
        askedOf(memory.ranQuery) === askedOf(restored)
          ? memory.result
          : null

      setQuery(restored)
      setViolations([])
      setResult(answer)
      /* `restored` rather than `memory.ranQuery`: the two are the same question
         by the canonical encoding, and handing back the one on screen is what
         keeps `stale` false on a restore that changed nothing. */
      setRanQuery(answer === null ? null : restored)
      setStatus(answer === null ? 'unstarted' : 'content')

      if (answer !== null) {
        /* The address is the storage adapter and must say what is on screen
           (AC-855) — including after a switch that asked nothing. `replace`,
           because following one question into another shape is not a new
           question. `issued` is set FIRST so the address effect does not
           answer this write by re-seeding and re-running the question it just
           restored. Only a mode with an answer writes: a mode arriving
           unanswered may be illegal, and an illegal question is never written
           to the address. */
        issued.current = encoded
        navigate(
          {
            pathname: locationRef.current.pathname,
            search: withReportQuery(locationRef.current.search, encoded),
          },
          { replace: true },
        )
      }
    },
    [query, ranQuery, result, remember, navigate],
  )

  /**
   * **One menu, two kinds of consequence.**
   *
   * `ChartToolbar` owns the seven-entry shape menu and the `(mode, chartType)`
   * each entry maps to; this decides what a pick DOES, because only the builder
   * holds the per-mode memory:
   *
   * | pick | what happens | requests |
   * |---|---|---|
   * | a different mode | `switchMode` restores that mode's cached answer | **0** |
   * | a different chart type | `setQuery` redraws the numbers already here | **0** |
   *
   * Both are zero, and the second one is new — see `askedOf`. That is the whole
   * of the owner's *"when changing between those data shouldn't refresh either
   * you retain the choices I made"*, now that the mode strip and the chart-type
   * strip are one control and a pick can mean either.
   */
  const chooseVisualisation = useCallback(
    ({ mode: next, chartType }: { mode: ReportMode; chartType: ChartType | null }) => {
      if (next !== reportMode(query)) {
        switchMode(next, chartType)
        return
      }
      if (chartType === null || chartType === query.chartType) return

      const redrawn = { ...query, chartType }
      setQuery(redrawn)

      /* **The address still says what is on screen, and it costs no request.**

         `askedOf` deliberately takes the chart type out of the *has this been
         asked* comparison, which is what makes a redraw free. But the address
         is the storage adapter (AC-855) and the chart type IS part of a saved
         report, so leaving it out of the address too would mean a reload, a
         `Back`, or a pasted link silently dropped the shape the operator
         chose. So the write happens here instead of falling out of a run.

         `issued` is set FIRST, for the same reason `switchMode` sets it: the
         address effect below would otherwise answer this write by re-seeding
         the panel from it and running the question again — turning a free
         redraw back into a request.

         Nothing is written while the question is illegal. That rule has one
         owner (`run`'s gate) and this is the one other place that can reach
         the address, so it asks the same plan. */
      if (plan.violations.length === 0) {
        const encoded = serialiseReportQuery(redrawn)
        issued.current = encoded
        navigate(
          {
            pathname: locationRef.current.pathname,
            search: withReportQuery(locationRef.current.search, encoded),
          },
          { replace: true },
        )
      }
    },
    [query, switchMode, plan.violations.length, navigate],
  )

  /**
   * **A retained result belongs to the question that produced it, and changing
   * mode changes the question.**
   *
   * §8.3 state 2 keeps the previous answer on screen while the panel is edited,
   * and that is right for every edit except this one: a trend's series drawn
   * under a funnel's chrome is not a stale answer, it is a picture of a
   * different question — `rb.trend.heading` does not exist because a trend is
   * not one of the three shapes this canvas draws. So a result from another
   * mode is withheld and the canvas falls back to its unstarted sentence,
   * which is honest: this question has not been asked yet.
   *
   * The previous result is **not discarded** — `switchMode` files it under
   * the mode that produced it and hands it back on the way in, which is what
   * makes a round trip cost no request.
   *
   * **This pair is now a backstop rather than the mechanism.** `switchMode`
   * already guarantees `result` belongs to `mode`; the guard stays because the
   * canvas must not draw a trend's series under a funnel's chrome if some
   * later path ever sets `result` without going through the strip.
   */
  const resultInMode = result !== null && reportMode(result.query) === mode
  const shownResult = resultInMode ? result : null
  const shownStatus: CanvasStatus = status === 'content' && !resultInMode ? 'unstarted' : status

  /**
   * §2.4 — the window an answer is actually drawing for, not the draft. Only
   * the two series modes reach `ResultCanvas`'s compound plot; the other
   * three take `ReportModeCanvas`, which has no marks to draw.
   */
  const annotationWindow = useMemo(() => {
    if (!seriesMode || !shownResult) return null
    return resolveWindow(shownResult.query.window, today)
  }, [seriesMode, shownResult, today])

  const annotationsAsync = useAsync<Annotation[]>(
    async (signal) => {
      if (!annotationWindow) return []
      return listAnnotations({ from: annotationWindow.from, to: annotationWindow.to }, signal)
    },
    { deps: [annotationWindow?.from, annotationWindow?.to], enabled: annotationWindow !== null },
  )
  const annotations = annotationsAsync.data ?? []

  /* AC-1150 — writes through the client, then re-reads the window so the
     mark appears with no page reload; the form's own catch (`AnnotationForm`)
     keeps the draft open on failure. */
  const saveAnnotationForWindow = useCallback(
    async (input: { date: string; label: string; kind: AnnotationKind; note: string }) => {
      await saveAnnotation({ id: null, date: input.date, label: input.label, note: input.note, kind: input.kind })
      annotationsAsync.refetch()
    },
    [annotationsAsync],
  )

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-page-pad py-6 wide:px-page-pad-wide">
      <div className="shrink-0">{header}</div>

      {/* §8.3 state 12 — read-only with a stated notice, and `Save` becomes
          `Save as new`. Not a page banner: R5 reserves that for critical state
          and this is a condition of one record. */}
      {deleted && (
        <p role="status" className="shrink-0 pb-3 text-sm text-muted-foreground">
          {t('rb.report.deleted')}
        </p>
      )}

      {/* §8's `Version history` — a panel UNDER the header, not a dialog:
          `Restore` loads the query into the draft and never saves (AC-1162),
          so an operator can look at an old version and walk away. */}
      {versionsOpen && (
        <div className="mb-3 flex shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">{t('rb.overflow.versions.heading')}</h2>
            <Button type="button" variant="ghost" size="xs" onClick={() => setVersionsOpen(false)}>
              {t('rb.overflow.versions.close')}
            </Button>
          </div>
          {versions.status === 'loading' && (
            <p className="text-sm text-muted-foreground">{t('rb.overflow.versions.loading')}</p>
          )}
          {versions.status === 'error' && (
            <p className="text-sm text-muted-foreground">{t('rb.overflow.versions.error')}</p>
          )}
          {versions.status === 'empty' && (
            <p className="text-sm text-muted-foreground">{t('rb.overflow.versions.empty')}</p>
          )}
          {versions.status === 'content' && (
            <ul className="flex list-none flex-col gap-1">
              {(versions.data ?? []).map((version) => (
                <li
                  key={version.at}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-control bg-background px-2 py-1.5 text-sm"
                >
                  <span className="text-foreground">
                    {t('rb.overflow.versions.savedBy', {
                      by: version.by,
                      at: formatDate(version.at, { style: 'day-month-time', language }),
                    })}
                  </span>
                  <Button type="button" variant="secondary" size="xs" onClick={() => restoreVersion(version)}>
                    {t('rb.overflow.versions.restore')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* The rail: the panel the chosen shape is asked in. One `Refresh`,
            one primary, whichever panel is below it (R3). */}
        <div className="flex min-h-0 w-72 shrink-0 flex-col gap-3 overflow-y-auto">
          {/* **The mode strip is gone.** Its five options are entries in the
              toolbar's one `Chart type` menu, on the owner's ruling — see
              `ChartToolbar`'s header for the mapping and the reason. The rail
              is now only *what am I asking*, which is what §5.3 always said it
              was. */}
          {seriesMode ? (
            <QueryPanel
              query={query}
              onChange={setQuery}
              onRun={() => void run(query, 'ask')}
              plan={plan}
              measures={measures}
              dimensions={dimensions}
              catalogueStatus={catalogue.status}
              onRetryCatalogue={catalogue.refetch}
              running={status === 'loading'}
              t={t}
            />
          ) : (
            <ReportModePanel
              query={query}
              onChange={setQuery}
              onRun={() => void run(query, 'ask')}
              plan={plan}
              measures={measures}
              dimensions={dimensions}
              catalogueStatus={catalogue.status}
              onRetryCatalogue={catalogue.refetch}
              running={status === 'loading'}
              t={t}
            />
          )}
        </div>

        {/* **The toolbar, then the canvas — in that DOM order, on purpose.**
            §A7 puts the presentation controls in one row directly above the
            plot they change, and the reading order has to match the visual one
            or a keyboard operator reaches them after scrolling past twelve
            panels. It renders for ALL FIVE modes: the three mode reports carry
            no chart-type and no grain of their own, but every one of them has a
            window and a freshness. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <ChartToolbar
            query={query}
            onChange={setQuery}
            onVisualisation={chooseVisualisation}
            plan={plan}
            result={shownResult}
            stale={stale}
            onRefresh={() => void run(ranQuery ?? query, 'auto')}
            seriesMode={seriesMode}
            /* AC-807's unstarted rule reaches the toolbar unchanged — and ONLY
               for the two series modes. A retention window decides how many
               columns the matrix can reach, so it must be live before anything
               else is. */
            unstarted={seriesMode && query.measures.length === 0}
            today={today}
            t={t}
            language={language}
          />

          {/* The canvas the mode's answer has a shape for. Both take the same
              `status`, so loading, error and empty look identical in all five. */}
          {seriesMode ? (
            /* AC-1159 — the chart's own `<svg>` lives inside this node;
               `exportPng` queries it directly rather than taking a ref prop
               through `ResultCanvas`, another agent's file right now. */
            <div ref={chartContainerRef} className="flex min-h-0 flex-1 flex-col">
              <ResultCanvas
                status={shownStatus}
                result={shownResult}
                stale={stale}
                violations={violations}
                measuresByKey={measuresByKey}
                coercedFrom={plan.chartTypeCoerced ? query.chartType : null}
                effectiveChartType={plan.effectiveChartType}
                annotations={annotations}
                canAnnotate={canAnnotate}
                onSaveAnnotation={saveAnnotationForWindow}
                onRetry={() => void run(ranQuery ?? query, 'auto')}
                onRetrySeries={(key) => void retrySeries(key)}
                /* The builder is a workspace, so it takes the workspace chrome:
                   the numbers beneath the picture. The freshness line and its
                   refresh are the TOOLBAR's now, which is why `withMeta` is off —
                   it carries both, and a dashboard tile has no toolbar and keeps
                   them. */
                withTable
                withMeta={false}
                /* §A11 puts the export beside the thing it exports. The SAME
                   `exportCsv` the page overflow calls, so the header-row button
                   and the menu item write one file rather than two that agree
                   today. */
                onExport={() => void exportCsv()}
                noDataSentence={noDataSentence}
                t={t}
                language={language}
              />
            </div>
          ) : (
            <ReportModeCanvas
              status={shownStatus}
              result={shownResult}
              stale={stale}
              violations={violations}
              measuresByKey={measuresByKey}
              onRetry={() => void run(ranQuery ?? query, 'auto')}
              withMeta={false}
              noDataSentence={noDataSentence}
              t={t}
              language={language}
            />
          )}
        </div>
      </div>

      <SaveReportDialog
        open={saveOpen}
        onOpenChange={(open) => {
          setSaveOpen(open)
          if (!open) setSaveAsNew(false)
        }}
        /* A deleted report has no id to update, and `Save as new` says not to
           use the one it has — which is what makes both honest rather than
           decorative. Either way the dialog can only CREATE. */
        report={deleted || saveAsNew ? null : report}
        /* §A5 — what the header's title block already holds, so nobody types a
           name twice. */
        draftName={draftName}
        draftDescription={draftDescription}
        pinTo={pinTo}
        query={query}
        onSaved={(saved) => {
          setSaveOpen(false)
          setSaveAsNew(false)
          onSaved?.(saved)
        }}
        t={t}
      />

      {/* §8's `Create alert…` — the same dialog `ReportLibrary`'s row action
          opens, so a rule created from either surface is one component. */}
      {alertOpen && report !== null && (
        <AlertRuleDialog
          open
          onOpenChange={(open) => !open && setAlertOpen(false)}
          rule={null}
          presetReportId={report.id}
          today={today}
          onSaved={(saved) => {
            setAlertOpen(false)
            toast.success(t('rb.alert.toast.saved', { name: saved.name }))
          }}
          t={t}
          language={language}
        />
      )}

      {/* §11.3 — the same confirmation the library gives, from the same keys,
          because deleting a report is one action and it must not have two
          different consequences depending on where it was started. */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete && pendingDelete.dashboards.length > 0
                ? t('rb.delete.pinned.title')
                : t('rb.delete.title', { name: report?.name ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.dashboards.length > 0
                ? t('rb.delete.pinned.body', { name: report?.name ?? '' })
                : t('rb.delete.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* The dashboards, BY NAME. The client returned them for this. */}
          {pendingDelete && pendingDelete.dashboards.length > 0 && (
            <ul className="flex list-none flex-col gap-0.5">
              {pendingDelete.dashboards.map((dashboard) => (
                <li key={dashboard.id} className="text-sm text-foreground">
                  <bdi>{dashboard.name}</bdi>
                </li>
              ))}
            </ul>
          )}

          {pendingDelete?.failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.delete.failed')}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t('rb.delete.cancel')}</AlertDialogCancel>
            {/* R5a use #1 — a destructive button. The explicit second step
                carries its own label so nobody confirms the wrong scope. */}
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete((pendingDelete?.dashboards.length ?? 0) > 0)}
            >
              {pendingDelete && pendingDelete.dashboards.length > 0
                ? t('rb.delete.pinned.confirm')
                : t('rb.delete.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
