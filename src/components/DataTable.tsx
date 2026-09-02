/**
 * `DataTable` (D-01) — `DESIGN.md` §9.1–§9.4 and **§8.5**, built to
 * `docs/05-restructure/design/01-table-controls.md`.
 *
 * > **§9.4**: `DataTable` takes a `mode` prop — `index | ledger | queue` — and
 * > **the mode, not the route, decides which furniture renders. A route may
 * > mount more than one mode over its lifetime. It may never mount two at
 * > once.**
 *
 * **The mode is `table.mode`, off `useIndexTable`'s discriminated union — not a
 * prop invented here.** In the `ledger` branch TypeScript refuses to compile a
 * selection or a sort, because `LedgerTable` has no `selectedIds`, no
 * `toggleRow` and no `setSortField` **at all**. So **AC-48 is enforced by
 * `tsc`**, not by a runtime `if` — and **AC-113** rides the same mechanism: the
 * header menu's `sorting` prop is `null` on a ledger because there is nothing to
 * pass it.
 *
 * ## What this component now owns, and no screen does
 *
 * | | before | after |
 * |---|---|---|
 * | sort | a popover the page passed in through `toolbar` | this component's, reachable from the toolbar **and** from every sortable header |
 * | filter | `filterRow?: ReactNode` the page built | a column **declares** its filter; this renders the control, the chip strip and the picker. `filterRow` is **removed** (**AC-103**) |
 * | columns | the page held `useColumnVisibility` | held here, beside `useColumnPinning`, keyed on the same `tableId` + `view` |
 * | pinning | did not exist | §8.5's three regions, over `useColumnPinning` |
 *
 * ## The two decisions this file makes
 *
 * **Where the sticky axes cross.** Three stacking levels and no more: the
 * sticky header row (20) sits above pinned **body** cells (10); a pinned
 * column's own header — the corner cell — is sticky on both axes and above
 * everything (30). Separation at both boundaries is a **hairline, never a
 * shadow**: all three elevation tokens are `offset-x: 0` so nothing mirrors,
 * and an inline-edge shadow would need an x-offset — which is the second half
 * of the legacy defect at `:751` (**AC-110**).
 *
 * **`tableId` and where elevation sits.** `tableId` is required and is passed
 * verbatim to *both* hooks along with `table.view`; pass different keys and the
 * per-view column state diverges. Elevation stays on the **card** (tier 1, from
 * `card.tsx`) and on the floating bulk bar (tier 2). No cell carries any.
 *
 * ## What `04-index-screen-redesign.md` changed here
 *
 * **D-18 — there is no card.** `DESIGN.md` §3.1's one-card rule and
 * `specs/00-foundation.md` §7.1's `Container` row are both §1–§5 Shopify
 * observations that **D7** replaced, and §7.1 supersedes them by name: **the
 * TABLE is the bordered object**, and the control row, the query strip and the
 * pagination row sit on the white content ground outside it.
 *
 * **D-19 — the table is a bounded scroller and the page does not scroll.**
 * Bands 2, 3 and 5 do not flex; band 4 grows, shrinks, carries a zero minimum
 * and owns `overflow: auto` on both axes, with a 216px floor. That is the only
 * construction that puts the pagination row, the horizontal scrollbar and the
 * sticky header inside the viewport at once — and each of those was a live
 * defect (N2, S16′, craft-critique F1 part 3).
 *
 * **D-19 NOTE — the boundedness is read off the PARENT, and no class here says
 * so.** The zero-percent flex basis on those three boxes is doing two jobs, and
 * the second one is invisible: under a parent whose main size is INDEFINITE, a
 * percentage flex basis resolves to `content` (Flexbox §7.2.3). So the same
 * declaration that bounds this table inside a page pinned to the viewport makes
 * it report its true height upward inside a page that sizes to its content —
 * `SingleColumnPage`'s `body="flow"`, a page that stacks a map above a table.
 *
 * **This is why nothing in this file changed when that shape was added, and why
 * the obvious change was wrong.** Swapping the zero basis for a content basis
 * looks equivalent and is not: it makes the deficit under a definite parent
 * negative, and the shrink is then shared with the SIBLINGS of this component.
 * Measured on `/support/contact-centre` at 1280: the summary card above the
 * table went from 278px to 221px — a card with `overflow` set, silently clipped
 * to buy the table 57px it had not asked for. Leave the basis alone.
 *
 * **§7.3 — the width contract.** Every column declares a width; exactly one,
 * the identity, declares `minWidth` and absorbs the residual under
 * `table-layout: fixed`. `Σ + identity min ≤ 910` (English) / `≤ 870`
 * (Arabic — the `:lang(ar)` rail and sub-tab steps are 40px wide between them),
 * and a `money` or `id` column may never be the last visible data column.
 * Asserted per view in `table/columnBudget.test.ts`.
 *
 * **The floor is on the `<table>`, not on the cell** — `tableMinInlineSize`,
 * P0-3. Under `table-fixed` a cell's `min-width` is ignored, so the identity
 * column's floor has to be carried by the one box that can hold it; below it
 * the scroll container overflows instead of the column collapsing.
 *
 * Rules applied
 *   §14.4/AC-112
 *               the toolbar, the chip strip, the pagination and the bulk bar sit
 *               **outside** the horizontal scroll container. The bulk bar is
 *               positioned against the card; inside the scroller it would slide
 *               off with the columns.
 *   §9.1/AC-46  ticking any checkbox **replaces the header row** with `N
 *               selected`; the column labels are absent while selection is
 *               active, so no header menu exists then (**AC-115**) and the
 *               toolbar is the reachable entry point.
 *   D-6/AC-80   a header cell contains **exactly one** interactive element — a
 *               menu trigger — or none. Never two. This supersedes AC-45's
 *               "headers are not interactive" clause and nothing else.
 *   §11.2       a **re-query keeps the header row alive** and replaces only the
 *               body rows. The operator applied that filter from that header
 *               and their focus is on its trigger; destroying it mid-interaction
 *               is what §7.2 forbids. An internal ref, not a new `status`
 *               value — a new status would change every page, which is the
 *               opposite of the request.
 *   §11.5       `no-match` supplies its own action when the page does not:
 *               `Clear {column} filter` for a single filter, `Clear all
 *               filters` otherwise. One fewer thing every page writes.
 *   §13.6       sort, filter and pin are announced through `useAnnounce`
 *               (`aria-live="polite"`). **No toast fires for any of them**:
 *               R9/R10 spend a toast on a mutation of an object, and sorting a
 *               view mutates nothing.
 *   §9.1/AC-68  the row kebab **always renders**, muted, taking ink and a fill
 *               on the row's hover **or focus-within**. Closes **D19**.
 *   §9.1        **the whole row is not a click target** — only the identity
 *               link is.
 *   §9.1/R4     numeric, currency and count columns are `text-end`, never
 *               `text-align: right`, header and value sharing one edge.
 *   §9.2/AC-49  a ledger opens and closes with labelled balance rows.
 *   R8/AC-37/38 `no-match` vs everything-else comes from `table.isFiltered`, so
 *               that choice is mechanical rather than a judgement at the call
 *               site. A column filter sets it exactly like a toolbar filter, so
 *               neither criterion needed amending.
 *   §4.7/AC-234 **`first-run` vs `cleared` is the call site's, and it has to
 *               be.** `specs/02-work-queues.md` **F-3** was raised against this
 *               file: an unfiltered empty QUEUE rendered the illustrated
 *               first-run state, telling an operator who had just cleared their
 *               queue that they have never had one. `emptyKind` is the fix, and
 *               it is a prop rather than a `mode` branch because Safety &
 *               Incidents reaches both kinds (Q-37) on one route.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  directionFor,
  formatCount,
  pageRange,
  toFilterSpec,
  type ColumnFilterValue,
  type Language,
  type Translate,
} from '@/lib'
import type { PinRefusal, PinnableColumn, TableSorting } from '@/hooks'
import {
  useAnnounce,
  useColumnPinning,
  useColumnVisibility,
  useCompactShell,
  useRovingFocus,
} from '@/hooks'
import type { AnyTable } from '@/hooks'
import { EmptyState, type EmptyAction } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { ColumnHeaderCell } from './table/ColumnHeaderCell'
import { ColumnLayoutPopover } from './table/ColumnLayoutPopover'
import { AddFilterPopover, FilterChipRow } from './table/FilterChipRow'
import { IndexToolbar, type ToolbarTab } from './table/IndexToolbar'
import { NarrowRowCards } from './table/NarrowRowCards'
import { SortControl } from './table/SortControl'
import {
  emphasisOf,
  filterEntries,
  filterFieldOf,
  isolatesValue,
  type DataColumn,
  type ExtraFilterSpec,
} from './table/columns'
import { densityClasses, useTableDensity } from './table/density'
import { tableCsvFilename, tableCsvText } from './table/csv'
/* **`downloadCsv` is imported, not re-implemented.** It already serves the
   Report Builder, Admin › Data and the export card, and it carries two
   decisions this file must not get to re-take: a blob URL rather than a data
   URI, because a 3,200-row file is refused as a data URI by more than one
   browser, and the object URL revoked immediately, because one that is never
   revoked keeps the whole blob alive for the life of a tab an operations
   console keeps open all day. The module it lives in imports one TYPE and
   nothing else, so this edge is not a cycle back into the screens layer. */
import { downloadCsv } from '@/screens/reports/csv'
import {
  RowActionMenuItem,
  SingleRowAction,
  refusalFor,
  type RowAction,
} from './table/rowActions'
import {
  ACTION_LANE_WIDTH_PX,
  KEBAB_COLUMN_ID,
  LANE_WIDTH_PX,
  SELECT_COLUMN_ID,
  SINGLE_ACTION_LANE_WIDTH_PX,
  pinnedStyle,
  useTableOverflow,
} from './table/pinning'
import { fitColumnWidths } from './table/fitWidths'
import { dataTypeOf } from './table/columns'

export type {
  ColumnDataType,
  ColumnEmphasis,
  ColumnFilterOption,
  ColumnFilterSpec,
  DataColumn,
  ExtraFilterSpec,
} from './table/columns'
export type { ToolbarTab } from './table/IndexToolbar'

/**
 * **`RowAction` and both of its shapes now live in `./table/rowActions`.**
 *
 * They moved so §11.2's second clause could be built where the table controls
 * live: an action disabled in place owes the operator a **reason**, `RowAction`
 * had no field to carry one, and both shapes rendered a control that explained
 * nothing (**AC-368**). The type is re-exported here because every caller
 * imports it from this file, and the shape a row renders is still decided
 * below, by the count of DECLARED actions and nothing else.
 */
export type { RowAction } from './table/rowActions'

/* ──────────────────────────── the props ──────────────────────────── */

export interface DataTableProps<T> {
  /** From `useIndexTable`. **The mode is `table.mode`** — see the header. */
  table: AnyTable<T>
  rows: readonly T[]
  /** Every declared column, in declaration order. Hidden ones included. */
  columns: ReadonlyArray<DataColumn<T>>
  getRowId: (row: T) => string
  /** The four states, in order. `content` is whatever `rows` holds. */
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  t: Translate
  language: Language

  /**
   * §7.6 — the key both column hooks share. Per table **and** per view: pass
   * different keys to the two hooks and their per-view state diverges.
   */
  tableId: string
  /**
   * §7.6 — the second half of the key. Defaults to `table.view`, which is right
   * whenever the saved-view tabs ARE the table's views. A screen whose tabs
   * mount different column sets (Operations › People) passes the tab instead,
   * so one tab's hidden set can never be read as another's.
   */
  view?: string | null

  /** §9.1 — the view tabs, rendered by the toolbar this component owns. */
  tabs?: readonly ToolbarTab[]
  activeTab?: string
  onSelectTab?: (id: string) => void
  searchPlaceholder: string
  /** §9.4 — a queue scope chip. A view, not a filter; it carries its own ✕. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null
  /** §6.4 — filters bound to no visible column. */
  extraFilters?: readonly ExtraFilterSpec[]
  /** §6.1 — the clock a `date-range` filter's presets are computed against. */
  now?: string | null

  /** §9.1 — always renders; takes ink and a fill on hover **or focus-within**. */
  rowActions?: ReadonlyArray<RowAction<T>>
  /**
   * §7.8 — the actions lane's width when exactly ONE action is declared and it
   * therefore renders as a labelled button rather than a kebab. `12 + label +
   * 12`, **declared per view** because a label's width is a translation
   * question, and declared rather than measured because §7.3's budget has to be
   * assertable before paint. Defaults to §7.8's 88. Ignored otherwise.
   */
  rowActionsWidth?: number
  /**
   * §9.1 — at most THREE labelled secondary buttons, then `…`.
   *
   * **`disabled` and `reason` are §11.2's other half, and they were missing.**
   * The rule is one sentence: an action the operator may not take is *"never
   * hidden, disabled in place **with its reason**"*. `RowAction` has carried
   * both fields since it was written; `BulkAction` carried neither, so the bulk
   * bar could only refuse **after** the click — gating at commit, which is the
   * legacy behaviour §11.2 exists to replace.
   *
   * That gap produced a live divergence, which is the defect D9 records: the
   * same operator was stopped by the row kebab and allowed by the bulk bar over
   * the same record, because only one of the two surfaces could express a
   * refusal. The command registry (`src/commands/`) now derives both from one
   * predicate, and this is the field that lets the bulk bar render what the
   * predicate says.
   *
   * `reason` is the sentence, not a boolean — same shape as `RowAction.reason`,
   * so the two surfaces cannot word a refusal differently.
   */
  /**
   * **`BulkAction`, not a structural copy of it — and the difference was a live
   * defect.** This prop used to inline its own `{ label; onClick; disabled;
   * reason }`, which type-checked and drifted: when `BulkAction` gained D21's
   * `eligibleIds`, the prop kept the old shape, so no caller could pass the
   * field the bar had just learned to render. The same mistake is live one
   * directory away at `screens/operations/people/PeopleTable.tsx:75`, where a
   * narrowed re-declaration strips `disabled` and `reason` and forces
   * `CaptainsView` to refuse **after** the click.
   *
   * A shared contract is named once. A second spelling of it is a second
   * contract that has not noticed yet.
   */
  bulkActions?: ReadonlyArray<BulkAction>

  /** §11.1 — the `first-run` copy. Required so the empty state cannot be a TODO. */
  firstRun: { heading: string; body: string; actions: EmptyAction[] }
  /** §11.5 — the `no-match` sentence. The ACTION is optional; this supplies a default. */
  noMatch: { message: string; action?: EmptyAction }
  /**
   * **F-3 — which empty an UNFILTERED zero is** (`specs/02-work-queues.md`
   * §4.7, **AC-234**).
   *
   * `isFiltered` decides `no-match` and always has; it cannot decide the other
   * two, and pretending it could is the defect. An unfiltered zero is
   * `first-run` on an index and **`cleared` (E1)** on a work queue — and on
   * Safety & Incidents it is `first-run` before the first incident is ever
   * reported and `cleared` on every day after (Q-37, **AC-324**), so the
   * distinction is not derivable from the mode either. **The call site knows;
   * this component does not.**
   *
   * Defaults to `'first-run'`, so every existing caller is unchanged.
   */
  emptyKind?: 'first-run' | 'cleared'
  /**
   * §4.7 **E1** — required when `emptyKind` is `'cleared'`, and this is the one
   * place where the copy names the SCOPE that is clear. Per queue **and per
   * view**: `Nothing departing in the next 24 hours` is a different sentence
   * from `No open incidents`, and a queue with one sentence for four views is
   * telling three of them a half-truth.
   */
  cleared?: { heading: string; body: string }
  /** §11.2 — card-scoped error copy. */
  error: { message: string; onRetry: () => void }

  /** §9.2 — ledger only. `Opening balance` / `Closing balance`, bold both sides. */
  ledgerBoundaryRows?: { opening: ReactNode; closing: ReactNode }
  /** V-11 — one centred line, outside the card. */
  learnMore?: ReactNode
  /** §11.3 — which skeleton shape. Defaults from the mode. */
  skeletonPattern?: 'P1' | 'P7' | 'P8'
  /**
   * **R5a — which rows are critical, DECLARED by the screen.**
   *
   * Omitted means **no row on this table is critical**, and that is a correct
   * answer rather than a gap: a row tinted by accident is worse than a row not
   * tinted at all, because the operator's only available reading of an
   * inconsistent tint is *"the highlighting is broken."*
   *
   * This used to fall back to a duck-typing sweep — `r.flagged`, `r.starved`,
   * `r.unlinked`, `r.status === 'escalated'`, `r.balanceHalalas < 0`, and a
   * `r.sourcePaymentId === null && 'refundId' in r` clause that matched no
   * type in the product. Two audits found it independently and a third read the
   * symptom off the screen: on `/operations/trips`, `TRP-8001` (Cancelled) is
   * tinted and `TRP-9003` (Cancelled) is not, because one carries the unrelated
   * `flagged` bit and nothing in the row says so. The same sweep tinted every
   * credit-normal account on the trial balance, whose `balanceHalalas` is
   * *signed on the account's normal side* and negative by design.
   *
   * It is the same defect as the row-click label regex and the
   * `columnIndex === 0` emphasis: **behaviour inferred from the shape of a
   * value instead of read from a declaration.** The screen knows what critical
   * means for its own rows; this component cannot.
   */
  isRowCritical?: (row: T) => boolean
  /** Custom class generator per row. */
  rowClassName?: (row: T) => string | undefined
  /** Handler when any row is clicked to open/view */
  onRowClick?: (row: T) => void
  /**
   * **The row carries an avatar or a thumbnail**, and so takes the taller media
   * pitch (`--ev-row-h-media`, 60px) instead of the single-line one
   * (`--ev-row-h`, 40px).
   *
   * **Defaults to `false`, and the default is the fix.** Every non-ledger table
   * took media pitch unconditionally — `isLedger ? 'h-row' : 'h-row-media'` —
   * whether or not it had any media in it. Measured consequence at 1512x900:
   * 204px of chrome leaves 644px, which is **10.7 rows**. At 40px it is 16.
   * Four tables actually carry an avatar (the People views, via `Identity` in
   * `screens/operations/people/cells.tsx`); the other eighteen were paying 20px
   * a row for a picture they do not show.
   *
   * All three independent audits reached this finding, and none of the static
   * passes could see it — it took running the app and counting rows.
   */
  rowMedia?: boolean
  /** Enables infinite scroll instead of manual pagination buttons (defaults to true). */
  infiniteScroll?: boolean
  className?: string
}

/**
 * **A2 — the one place a table cell's value is bidi-isolated** (`docs/ref/i18n.md`).
 *
 * Applied here rather than at the ~200 `cell:` call sites, and driven by
 * `isolatesValue(column)` — declared meaning, never the value. What it buys is
 * a cell whose value cannot be reordered by the OTHER content in the same
 * cell: a translated label beside a phone number, `Due` beside a timestamp,
 * a count beside a word. A cell holding one value alone is its own bidi
 * paragraph and never needed help.
 *
 * ## Why there is no `dir="ltr"` on it, which is the finding
 *
 * `lib/i18n/isolate.ts` lists `date` and `money` among the eight runs that must
 * be PINNED `ltr` because they contain no strong character. That reasoning is
 * sound for `+966 55…` and wrong for a translated date, and the difference only
 * shows up in a browser. Measured at 1280 under `dir="rtl"`, on the logical
 * string `25 يونيو 09:39`:
 *
 * | rendering | visual, left to right |
 * |---|---|
 * | no isolation | `09:39 يونيو 25` — an RTL line; read right to left it IS `25 يونيو 09:39` |
 * | `<bdi>` (`auto`) | `09:39 يونيو 25` — identical |
 * | `<bdi dir="ltr">` | **`25 09:39 يونيو`** — the day and the time adjacent, the month orphaned |
 *
 * The third one is wrong in **either** reading direction, and it is what
 * pinning produces: UBA rule W2 turns the digits following an Arabic letter
 * into Arabic Numbers, which take a level two higher than the month and jump
 * over it. A run with no strong character at all — `+966 55 123 4567`,
 * `4 / 5`, `0.00 SAR` — resolves LTR under `auto` anyway, so `auto` is right
 * where `ltr` is right and right where `ltr` is not. Recorded against
 * `isolate.ts`'s `date` member for its owner.
 *
 * ## Why the `<bdi>` is an `inline-block` and not the block itself
 *
 * `isolate.ts` §5.4: **the `<bdi>` goes INSIDE the box, never as the box.** A
 * stretched `<bdi>` whose content resolves LTR aligns its own text to *its*
 * start, so under `dir="rtl"` the value flushes to the wrong edge — the defect
 * the metric tiles shipped. `inline-block` makes it shrink-to-fit, so the
 * outer `<span>` keeps the page's direction and does the aligning exactly as
 * it did before. `max-w-full` caps the shrink-to-fit at the column so
 * `truncate` still truncates; `align-top` because an `inline-block` containing
 * an `overflow: hidden` child takes its baseline from its bottom margin edge
 * (CSS 2.1 §10.8.1) and would otherwise shift every isolated row.
 *
 * **`secondaryLine` is deliberately NOT isolated.** Its content is genuinely
 * mixed across the 30 columns that declare one — an id in Revenue, a plan's
 * Arabic name in Pricing (already `<bdi dir="rtl">`), a whole translated
 * sentence in Alerts — and the column's `dataType` describes the *primary*
 * value, so there is no declaration here to key off. Isolating a translated
 * sentence from its own line is this defect with the sign flipped.
 */
function CellValue({ isolated, children }: { isolated: boolean; children: ReactNode }) {
  return (
    <span className="block">
      {isolated ? (
        <bdi className="inline-block max-w-full align-top">{children}</bdi>
      ) : (
        children
      )}
    </span>
  )
}


export function DataTable<T>(props: DataTableProps<T>) {
  const {
    table,
    rows,
    columns,
    getRowId,
    status,
    total,
    t,
    language,
    tableId,
    view: viewKey,
    tabs = [],
    activeTab = '',
    onSelectTab,
    searchPlaceholder,
    scope = null,
    extraFilters = [],
    now = null,
    rowActions,
    rowActionsWidth,
    bulkActions,
    firstRun,
    noMatch,
    emptyKind = 'first-run',
    cleared,
    error,
    ledgerBoundaryRows,
    learnMore,
    skeletonPattern,
    onRowClick,
    rowMedia = false,
    infiniteScroll = true,
    className,
  } = props

  const announce = useAnnounce()
  const direction = directionFor(language)

  /* AC-48, at the type level. `canSelect` and `canRowAction` are LITERAL
     `false` on `LedgerTable`, so these two constants are `false` at compile
     time in the ledger branch and a reviewer can see it. */
  const isLedger = table.mode === 'ledger'
  /**
   * **D25 — a table selects only if it has something to do with a selection.**
   *
   * `table.canSelect` says the *hook* permits selection; `bulkActions` says the
   * *screen* declared work. Both are required, and the conjunction lives here
   * because this is the one place that renders both halves of **AC-46** —
   * *"replaces the column header row with an `N selected` count **and** shows
   * the bulk action bar."*
   *
   * Eleven index tables were failing that criterion, and the failure was worse
   * than "selecting does nothing": every `mode: 'index'` table gets
   * `canSelect: true` from `useIndexTable`, so ticking a box **destroyed the
   * column header row** — labels, sort affordances and header menus replaced by
   * the `N selected` cell at `:782` — and then no bar arrived, because the bar
   * renders only when `bulkActions.length > 0`. The operator removed their own
   * column labels by ticking a box, and got no `Clear`, no action and no
   * acknowledged mode in exchange.
   *
   * Enforced in the predicate rather than by review, deliberately. The
   * alternative ruling — *"every selectable table must declare a bulk
   * command"* — is a rule somebody has to remember on each of eleven screens,
   * and a rule like that gets satisfied by a fig leaf: there is no export
   * affordance anywhere in this product, so `Export selected` would have minted
   * a subsystem to make a checkbox honest. Deriving it makes the two halves of
   * AC-46 inseparable in one line, and a screen that declares no command loses
   * its checkbox with nobody editing it.
   */
  /**
   * **The compact render mode's one switch.** `useCompactShell` reads the media
   * query off `--ev-bp-compact` and subscribes to it, so a rotation crosses
   * the boundary without a reload, and `src/test/setup.ts` shims `matchMedia`
   * to report `false` — every existing test sees the desktop table and none of
   * them change behaviour.
   *
   * **A boolean, not a `compact:` variant, and the reason is the DOM.** The
   * variant would mean rendering both trees on all forty screens and hiding
   * one, which runs every `column.cell(row)` twice, mints two roving-focus
   * groups and two elements for every `id`. A branch renders exactly one — and
   * it is also what makes *"the desktop rendering is unchanged"* provable
   * rather than asserted: at 768 and above the card subtree is not in the
   * document at all.
   */
  const compact = useCompactShell()

  /**
   * **`&& !compact` is the whole of the owner's bulk-selection ruling.**
   * Below the breakpoint bulk selection is ABSENT, not disabled
   * (`globals.css` §2.3 — *"Disabled does not exist"*). One predicate takes the
   * lane, the header checkbox, every row checkbox, the selected row state and
   * the floating bulk bar out together, because all five already read this
   * flag; four separate suppressions would be four places for one of them to
   * be forgotten. The reasoning is recorded in `NarrowRowCards`.
   */
  const selectable = !isLedger && table.canSelect && (bulkActions?.length ?? 0) > 0 && !compact

  /**
   * **D8 — the actions cell's shape comes from the COUNT of declared actions,
   * and it is decided here rather than per screen.** Owner, twice:
   * *"if only 1 action put the action not 3 dots"* · *"still kebab with 1
   * item"*. §7.8's table:
   *
   * | declared actions | renders | lane |
   * |---|---|---:|
   * | 0 | nothing, and no lane at all | — |
   * | 1 | that action, **labelled**, no menu | `rowActionsWidth ?? 88` |
   * | 2 | both actions, **labelled**, side by side | `rowActionsWidth ?? 2×88 |
   * | 3 or more | the `⋯` kebab | 56 |
   *
   * **The count is of DECLARED actions, never of enabled ones.** §11.2 renders
   * an unavailable action disabled in place with its reason; counting enabled
   * ones instead would make the treatment depend on the row, and the column
   * would jitter between a button and a kebab down the length of the table —
   * which is a worse defect than the one being fixed.
   *
   * §7.8 also specifies a third shape, the `✓ ✗ View` decision triad at 116.
   * That is build item 11 and is not derivable from a count: it needs the
   * dispositions to be declared as a pair. Recorded, not guessed at.
   *
   * **THE KEBAB BEGINS AT THREE — D8-b, and this used to collapse at two.**
   * §7.8 jumped from 1 to "3 or more" and said nothing about 2, so the first
   * cut took a kebab as the safe reading and raised it. The ruling went the
   * other way, and the argument is that §7.8's own decision-pair row already
   * renders THREE controls directly at n=2: a rule that shows three at two and
   * hides two at two is incoherent. So two actions render side by side.
   *
   * A screen may not work around this. `PayoutsScreen` carried a comment
   * asserting the old behaviour's opposite while the code did the opposite of
   * the comment; both are now the same thing.
   */
  const declaredActions = !isLedger && table.canRowAction ? (rowActions ?? []) : []
  const actionShape: 'none' | 'direct' | 'menu' =
    declaredActions.length === 0 ? 'none' : declaredActions.length <= 2 ? 'direct' : 'menu'
  const kebabs = actionShape !== 'none'
  const actionLaneWidth =
    actionShape === 'direct'
      ? (rowActionsWidth ?? SINGLE_ACTION_LANE_WIDTH_PX * declaredActions.length)
      : ACTION_LANE_WIDTH_PX

  /**
   * **P0-2 — the row-click target, and the only place it can come from.**
   *
   * `RowAction.rowClick` is declared data on the action. It replaces a regex
   * over the **translated** label with `?? declaredActions[0]` behind it, which
   * meant a screen declaring one destructive action got that action on a plain
   * row click — `EmailLogCard`'s unconfirmed `Resend`, `ApiKeysCard`'s rotate,
   * `WebhookDeliveryLogCard`'s replay. See `rowActions.tsx` for the contract
   * and the rule for declaring it.
   *
   * No match is a legitimate answer and means **no row click**: no handler is
   * attached and no `cursor-pointer` is painted, so the affordance and the
   * behaviour cannot disagree. There is deliberately no fallback of any kind —
   * not the first action, not the first control in the first cell. Both were
   * inference, and inference is what this defect was.
   */
  const primaryRowAction = declaredActions.find((action) => action.rowClick === true)

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  const handleResizeColumn = (columnId: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnId]: width }))
  }

  const handleResetColumnWidth = (columnId: string) => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      delete next[columnId]
      return next
    })
  }


  /* AC-113 — `null` on a ledger, and not as a flag: `LedgerTable` has no
     `setSortField`, so there is nothing to put in this object. A sort item in a
     ledger header would be a compile error, not a convention. */
  const rawSorting: TableSorting | null = table.mode === 'ledger' ? null : table
  const view = viewKey === undefined ? table.view : viewKey

  /* §9.1 / §7.6 — per table AND per view, both hooks on the same key. */
  const visibility = useColumnVisibility({ columns, tableId, view })
  const visible = visibility.visible

  const { scrollRef, overflowing, containerWidth } = useTableOverflow(direction)

  /** The declared width, or the operator's resize if they made one. */
  const declaredWidth = (column: DataColumn<T>) => columnWidths[column.id] ?? column.width

  /**
   * **§7.3's budget, resolved against the container it is actually in.**
   *
   * Four of the product's tables declare more width than the content region
   * has — Tickets by 140px at 1440 — which is why a header could read `Verdic`.
   * `fitWidths` takes the overflow out of the columns that can afford it and
   * leaves the lanes, `money`, `id` and anything the operator resized alone.
   * See that file for the whole rule and for why this is not `table-layout:
   * auto`.
   *
   * `visibility.visible` is the input, not `columns`: a hidden column costs no
   * width, so a table with four columns switched off has more to distribute
   * than its declaration suggests.
   */
  const fitted = useMemo(
    () =>
      fitColumnWidths(
        [
          ...(selectable ? [{ id: SELECT_COLUMN_ID, width: LANE_WIDTH_PX, isLane: true }] : []),
          ...visible.map((column) => ({
            id: column.id,
            width: columnWidths[column.id] ?? column.width ?? column.minWidth ?? 0,
            /* `dataTypeOf`, not `column.dataType`: the type is DECLARED
               meaning, and an undeclared column still has one — `align: 'end'`
               means `number`. Reading the raw field would let a money column
               that leans on the align default shrink and truncate silently,
               which is the exact case §7.3 rule 5 exists to prevent. */
            type: dataTypeOf(column),
            userResized: columnWidths[column.id] !== undefined,
            floor: column.minWidth,
          })),
          ...(kebabs ? [{ id: KEBAB_COLUMN_ID, width: actionLaneWidth, isLane: true }] : []),
        ],
        containerWidth,
      ),
    [visible, columnWidths, containerWidth, selectable, kebabs, actionLaneWidth],
  )

  /**
   * The width a cell and its header actually render at.
   *
   * **The same map has to feed the pin descriptors**, and below it does: a
   * sticky offset is arithmetic over these widths, so a column that renders at
   * a fitted width and pins at its declared one is a frozen column in the wrong
   * place. That is the one way this change could have broken §7.2.
   */
  const resolvedWidth = (column: DataColumn<T>) =>
    fitted?.get(column.id) ?? declaredWidth(column)


  /* §7.1's three regions. The R5a marker lane rides the identity column, which
     is why there is no fourth entry here: §8.4 draws the marker at the row's
     inset-inline-start, inside the first cell, and the first cell is locked. */
  const pinColumns = useMemo<PinnableColumn[]>(() => {
    const list: PinnableColumn[] = []
    if (selectable)
      list.push({
        id: SELECT_COLUMN_ID,
        width: LANE_WIDTH_PX,
        lockedEdge: 'start',
      })
    visible.forEach((column, index) => {
      /* **AC-104 with its precondition made explicit.** Column index 0 is the
         identity and is pinned implicitly and permanently — *provided it
         declares an inline size*. §7.2 makes that a requirement of the column
         contract, and `useColumnPinning` enforces it by THROWING
         (`Column "captain" cannot be pinned without a positive width`).
         The hook is right to throw; the caller is wrong to ask, so this asks
         only when the answer can be yes. A screen that forgets `width` gets a
         table with no frozen identity column — degraded, legible, and not a
         crash on first paint. */
      /* §7.3 rule 2 makes the identity column FLEXIBLE — it declares
         `minWidth` and no `width` — and §7.2 requires a declared size to pin.
         The two are reconciled by the one fact that makes the conflict
         vacuous: **a table that overflows has no residual to distribute, so the
         identity column renders at exactly its `minWidth`.** Pinning only means
         anything while the table overflows, so the offset computed from
         `minWidth` is exact at every moment it is used.

         **P0-3 made that reconciliation true.** It was previously an assertion
         about a `min-width` the browser was ignoring — under `table-fixed` the
         identity column could and did render NARROWER than its `minWidth`, at
         which point every offset below was wrong by the difference. The floor
         now lives on the `<table>` as `min-inline-size` (`tableMinInlineSize`),
         so the residual reaching zero and the identity column reaching
         `minWidth` are the same moment, which is what the paragraph above
         always claimed. */
      /* **THE FITTED WIDTH, not the declared one, and they must be the same
         number the cell renders at.** A sticky offset is the sum of the widths
         inline-start of a column; if a column renders at a fitted width and
         pins at its declared one, every frozen column after it sits that many
         pixels off. `resolvedWidth` returns the declaration untouched whenever
         nothing was fitted, so the common case is byte-identical to before. */
      const declared = fitted?.get(column.id) ?? column.width ?? column.minWidth
      const sizeable = typeof declared === 'number' && Number.isFinite(declared) && declared > 0
      list.push({
        id: column.id,
        width: sizeable ? declared : 0,
        ...(index === 0 && sizeable ? { lockedEdge: 'start' as const } : {}),
      })
    })
    /* AC-105 — the kebab column is pinned to the inline-END implicitly and
       permanently. `PinEdge` supports `'end'` for exactly this; **no operator
       control ever passes it** (AC-107). */
    if (kebabs)
      list.push({
        id: KEBAB_COLUMN_ID,
        width: actionLaneWidth,
        lockedEdge: 'end',
      })
    return list
  }, [selectable, kebabs, actionLaneWidth, visible, fitted])

  const pins = useColumnPinning({ columns: pinColumns, tableId, view })

  /* ── announcements (§13.6). Never a toast: sorting mutates nothing. ── */

  const headerOf = useCallback(
    (field: string): string =>
      columns.find((column) => column.sortField === field)?.header ?? field,
    [columns],
  )

  const labelOf = useCallback(
    (field: string): string => {
      const column = columns.find((each) => filterFieldOf(each) === field)
      if (column) return column.header
      return extraFilters.find((each) => each.field === field)?.label ?? field
    },
    [columns, extraFilters],
  )

  const sorting = useMemo<TableSorting | null>(() => {
    if (rawSorting === null) return null
    return {
      sort: rawSorting.sort,
      setSortField: (field) => {
        rawSorting.setSortField(field)
        const dir = rawSorting.sort?.dir ?? 'asc'
        announce(
          t(dir === 'desc' ? 'table.announce.sortedDesc' : 'table.announce.sortedAsc', {
            column: headerOf(field),
          }),
        )
      },
      setSortDirection: (dir) => {
        rawSorting.setSortDirection(dir)
        const field = rawSorting.sort?.field
        if (field === undefined) return
        announce(
          t(dir === 'desc' ? 'table.announce.sortedDesc' : 'table.announce.sortedAsc', {
            column: headerOf(field),
          }),
        )
      },
      clearSort: () => {
        rawSorting.clearSort()
        announce(t('table.announce.sortCleared'))
      },
    }
  }, [rawSorting, announce, t, headerOf])

  /**
   * §6.3 — one commit path for every trigger. `toFilterSpec` returns the
   * `FilterSpec` or `null`, and `null` means `removeFilter`: that pairing is the
   * whole contract, and it is why a column filter sets `isFiltered` exactly like
   * a toolbar filter (**AC-93**, **AC-94**).
   */
  const commitFilter = useCallback(
    (field: string, value: ColumnFilterValue) => {
      const spec = toFilterSpec(field, value)
      if (spec === null) {
        table.removeFilter(field)
        announce(t('table.announce.filterRemoved', { column: labelOf(field) }))
        return
      }
      table.setFilter(spec)
      announce(t('table.announce.filterApplied', { column: labelOf(field) }))
    },
    [table, announce, t, labelOf],
  )

  const removeFilter = useCallback(
    (field: string) => {
      table.removeFilter(field)
      announce(t('table.announce.filterRemoved', { column: labelOf(field) }))
    },
    [table, announce, t, labelOf],
  )

  const clearAll = useCallback(() => {
    table.clearAll()
    announce(t('table.announce.allFiltersCleared'))
  }, [table, announce, t])

  /* ── pin + visibility controls, gated at render (§7.2, §11.2) ── */

  const pinnableIds = useMemo(() => {
    const ids = new Set<string>()
    visible.forEach((column, index) => {
      if (index === 0) return
      if (column.width === undefined || column.pinnable === false) return
      ids.add(column.id)
    })
    return ids
  }, [visible])

  const canPinColumn = useCallback(
    (id: string): PinRefusal | null | undefined =>
      pinnableIds.has(id) ? pins.canPin(id, 'start') : undefined,
    [pinnableIds, pins],
  )

  const togglePin = useCallback(
    (id: string) => {
      const wasPinned = pins.isPinned(id)
      const refusal = pins.togglePin(id, 'start')
      if (refusal !== null) return
      announce(
        t(wasPinned ? 'table.announce.unpinned' : 'table.announce.pinned', {
          column: columns.find((column) => column.id === id)?.header ?? id,
        }),
      )
    },
    [pins, announce, t, columns],
  )

  const toggleVisible = useCallback(
    (id: string) => {
      const wasVisible = visibility.isVisible(id)
      visibility.toggle(id)
      announce(
        t(wasVisible ? 'table.announce.columnHidden' : 'table.announce.columnShown', {
          column: columns.find((column) => column.id === id)?.header ?? id,
        }),
      )
    },
    [visibility, announce, t, columns],
  )

  const resetColumns = useCallback(() => {
    visibility.reset()
    pins.clearPins()
  }, [visibility, pins])

  /* ── the header row is ONE tab stop (§14.2, AC-85) ── */

  const headerCells = useMemo(
    () =>
      visible.map((column, index) => ({
        column,
        /* §7.1 — the identity column is never hideable and never unpinnable. */
        hideable: !isLedger && index > 0 && visibility.isHideable(column.id),
        pinnable: pinnableIds.has(column.id),
      })),
    [visible, isLedger, visibility, pinnableIds],
  )

  const rovingCount = headerCells.length
  const roving = useRovingFocus({
    itemCount: rovingCount,
    orientation: 'horizontal',
    direction,
    loop: false,
  })

  /* §11.2 — once this table has shown content, a re-query keeps the header row
     and replaces only the body. An internal ref rather than a new `status`
     value: a new status would change every page. */
  const hasShownContent = useRef(false)
  useEffect(() => {
    if (status === 'content') hasShownContent.current = true
  }, [status])
  const refreshing = status === 'loading' && hasShownContent.current

  /**
   * **R20 — row height is the TABLE's, not the row's, and there are no
   * exceptions.** `04-index-screen-redesign.md` §7.6: `DESIGN.md` §3.1's prose
   * says a two-line primary cell *"grows to fit rather than truncating"* and
   * §3.1's own **Rules** block says row height *"MUST be uniform within a
   * table"*. The build followed the prose. Measured before the fix, Applications
   * ran 117 / 44 / 44 / 69 / 44 / 44 / 44 / 41 — five interval changes in eight
   * rows, which a reader parses as damage rather than as data.
   *
   * The MUST wins and the prose clause is void. Declared here rather than on the
   * `<td>` so that a cell's line box can never move a row again, which is what
   * makes the loading skeleton's pitch and the content row's pitch the same
   * number by construction (§10.2, craft-critique F3's ~575px of layout shift).
   *
   * A ledger keeps `--ev-row-h`: it is a different table, and R20 is per table.
   */
  /* A ledger is always single-line; everything else takes media pitch only if
     it declares media. See `rowMedia`. */
  /**
   * **`ui.density`, and this is its first consumer** — see `table/density.ts`
   * for what compact measures and why it is not the 40px row docs `13` and `15`
   * assumed.
   *
   * The density is read here rather than taken as a prop: it is one preference
   * for every index in the product, and a prop means twenty-two screens
   * forwarding a value none of them owns. R20 still holds — the height is the
   * TABLE's and lands on the row and on every cell, so a cell's line box still
   * cannot move one row relative to its neighbours.
   */
  const density = useTableDensity()
  const pitch = densityClasses(density, !isLedger && rowMedia)
  const rowHeightClass = pitch.row

  const selectedCount = selectable ? table.selectedCount : 0
  /* `selectOnly` is on the selectable variants only. `selectable` narrows it at
     runtime, but a union does not follow a boolean, so the capability is read
     once here where the narrowing holds rather than cast at each use. */
  const selectOnly = selectable ? table.selectOnly : undefined

  /**
   * **The refusal compartment's lines — one per DISTINCT sentence, not one per
   * refused action.**
   *
   * Each disabled action used to render its own unlabelled sentence, stacked.
   * With two refused actions the operator could not tell which sentence
   * belonged to which dead button, and with two refused actions sharing a
   * reason — the common case, because a permission refusal outranks a domain
   * one and then every action carries the *same* sentence — they read the same
   * line twice and had to work out that it was one fact.
   *
   * So identical sentences collapse to one line with no prefix, and different
   * ones are prefixed with the action they belong to. Every refused control
   * points `aria-describedby` at the line that actually carries its reason,
   * which is why the id comes from this map rather than from each action's own
   * label.
   */
  const refusalLines = useMemo(() => {
    const refused = (bulkActions ?? []).filter(
      (action) => action.disabled === true && action.reason,
    )
    const distinct = new Set(refused.map((action) => action.reason))
    const labelled = distinct.size > 1
    const lines: {
      key: string
      text: string
      narrow: { count: number; onSelect: () => void } | null
    }[] = []
    const seen = new Map<string, string>()

    for (const action of refused) {
      const reason = action.reason as string
      const existing = seen.get(reason)
      if (existing !== undefined) {
        /* Same sentence, already on screen. The control still needs an id to
           point at, and it points at the line that is there. */
        continue
      }
      const key = bulkReasonId(action.label)
      seen.set(reason, key)

      /* D21's escape hatch, offered only when narrowing leaves something to act
         on. An eligible set that is empty or as large as the selection is not a
         narrowing — it is the `.all` case (AC-960) or a no-op. */
      const eligible = action.eligibleIds
      const narrowable =
        eligible !== undefined && eligible.size > 0 && eligible.size < selectedCount

      lines.push({
        key,
        text: labelled ? t('table.bulk.refusalLabelled', { action: action.label, reason }) : reason,
        narrow: narrowable
          ? { count: eligible.size, onSelect: () => selectOnly?.(eligible) }
          : null,
      })
    }
    return lines
  }, [bulkActions, selectOnly, selectedCount, t])

  /** Which line a refused control points at — see `refusalLines`. */
  const reasonIdFor = useCallback(
    (action: BulkAction): string | undefined => {
      if (action.disabled !== true || !action.reason) return undefined
      const match = (bulkActions ?? []).find(
        (each) => each.disabled === true && each.reason === action.reason,
      )
      return match === undefined ? undefined : bulkReasonId(match.label)
    },
    [bulkActions],
  )

  const pattern = skeletonPattern ?? (isLedger ? 'P7' : table.mode === 'queue' ? 'P8' : 'P1')
  const range = pageRange(table.page, table.pageSize, total)
  const columnCount = visible.length + (selectable ? 1 : 0) + (kebabs ? 1 : 0)

  /**
   * **P0-3 — the identity column's floor, on the element that can enforce it.**
   *
   * `ui/table.tsx` sets `table-fixed`, and under `table-layout: fixed`
   * **`min-width` on a cell is ignored**: a column is exactly as wide as the
   * first row declares, and a column that declares nothing takes the residual —
   * including a residual of zero. `pinning.ts` emitted `minWidth` for the
   * identity column and asserted in a comment that this was *"what stops the
   * residual from being zero"*. It never did. Audit C measured the consequence
   * on `/operations/trips`: the `Trip` column at **0px at 1152 and 38px at
   * 1280**, every row an avatar with no id and no route.
   *
   * The floor is a property of the TABLE, which is the box that can carry a
   * `min-inline-size`, so that is where it goes: Σ of every declared column
   * width, plus the identity column's `minWidth`, plus the two implicit lanes.
   * `w-full` still wins whenever the container is wider — the identity column
   * goes on absorbing 100 % of the residual, which is §7.3 rule 2 — and below
   * that point the table stops shrinking and the container's existing
   * `overflow-x-auto` produces a scrollbar instead of a 0px column.
   *
   * This is also what makes §7.2's pinned offsets true rather than nearly true.
   * They are computed from `width ?? minWidth`, which is exact only when there
   * is no residual to distribute; the floor is precisely the width at which the
   * residual reaches zero, so the arithmetic and the layout now agree at every
   * width where pinning is visible.
   *
   * `minInlineSize`, not `minWidth`: this table ships Arabic.
   *
   * A resized column counts at its resized width, so dragging a column wider
   * pushes the floor out rather than eating the identity column.
   */
  const tableMinInlineSize = useMemo(() => {
    let total = selectable ? LANE_WIDTH_PX : 0
    for (const column of visible) {
      /* **The FITTED width, for the same reason the pin offsets take it.** This
         floor is the whole width model under `table-layout: fixed` — a `<col>`
         narrowed by `fitWidths` is overruled by a `min-inline-size` computed
         from the declaration, and the table renders at its declared total
         anyway. That is not a subtle failure: with the floor left on the
         declared numbers, Tickets stayed 1178px wide in a 1038px box and went
         on clipping its last header, with the fit silently doing nothing.

         Reading `fitted` here keeps the floor's own contract intact rather than
         weakening it. It is still "the width below which the table stops
         shrinking and scrolls instead" — the resolved widths ARE the widths in
         play, so the floor still lands exactly where the residual reaches zero
         and §7.2's pinned offsets still agree with the layout. */
      total +=
        fitted?.get(column.id) ?? columnWidths[column.id] ?? column.width ?? column.minWidth ?? 0
    }
    if (kebabs) total += actionLaneWidth
    return total
  }, [selectable, visible, columnWidths, kebabs, actionLaneWidth, fitted])

  const entries = useMemo(() => filterEntries(columns, extraFilters), [columns, extraFilters])

  const chipProps = {
    t,
    language,
    entries,
    active: table.filters,
    onCommit: commitFilter,
    onRemove: removeFilter,
    onClearAll: clearAll,
    isFiltered: table.isFiltered,
    scope,
    today: now === null ? null : now.slice(0, 10),
  }

  /* §11.5 — the component's own `no-match` action, when the page gives none. */
  const noMatchAction = useMemo<EmptyAction | undefined>(() => {
    if (noMatch.action) return noMatch.action
    const only = table.filters.length === 1 ? table.filters[0] : undefined
    if (only && table.query.trim() === '') {
      return {
        label: t('table.clearOneFilter', { column: labelOf(only.field) }),
        onClick: () => removeFilter(only.field),
      }
    }
    if (!table.isFiltered) return undefined
    return { label: t('table.clearFilters'), onClick: clearAll }
  }, [
    noMatch.action,
    table.filters,
    table.query,
    table.isFiltered,
    t,
    labelOf,
    removeFilter,
    clearAll,
  ])

  /* AC-111 — a pinned cell is OPAQUE and takes the ROW's own background,
     hover included, or the scrolling content shows through it. */
  const laneStyle = (id: string) =>
    pinnedStyle(
      pins.pinnedColumn(id),
      id === KEBAB_COLUMN_ID ? actionLaneWidth : LANE_WIDTH_PX,
      overflowing,
    )
  const laneClass = (id: string, isCritical?: boolean) =>
    cn(
      /* The density's cell half. On EVERY body cell, including the two implicit
         lanes and the skeleton's: `ui/table.tsx` declares `h-row px-3 py-2` on
         the primitive, so a compact override applied to the data cells alone
         would leave the checkbox and the kebab holding the comfortable floor
         and the row would not move. `cn` merges the `h-` and `py-` groups, and
         `TableCell` takes `className` last, so this wins by construction rather
         than by ordering luck. */
      pitch.cell,
      id === KEBAB_COLUMN_ID ? undefined : 'w-10',
      pins.isPinned(id) && [
        'z-10',
        /* **P1-4 — the critical ground, on token, and OPAQUE.** This was a
           rose palette literal at 95 % alpha, and the alpha existed only so the
           class could blend down onto the white beneath it. `--ev-row-critical`
           IS that blended value, so the alpha leaves with the literal and
           AC-111's opaque pinned cell stops depending on one — an alpha here is
           the one thing that lets scrolling content show through a frozen
           column.

           **The class name is described rather than spelled, and that is not
           style.** Tailwind v4 scans comments as plain text and has no idea
           what a comment is: naming the literal in backticks MINTED IT, and the
           rule for a palette colour this file exists to have removed was
           shipping in `dist` on the strength of the sentence saying so.
           `ChartCard.tsx:104` records the same leak and `scratch/prose-class-
           leak.mjs` is the check. Verify in `dist`, never in `src`. */
        isCritical
          ? 'bg-row-critical group-hover/row:bg-row-critical-emphasis group-focus-within/row:bg-row-critical-emphasis group-data-[state=selected]/row:bg-row-critical-emphasis'
          : 'bg-card group-hover/row:bg-accent group-focus-within/row:bg-accent group-data-[state=selected]/row:bg-accent',
      ],
    )
  const headLaneClass = (id: string) =>
    cn(
      'sticky top-0 bg-muted',
      id === KEBAB_COLUMN_ID ? undefined : 'w-10',
      pins.isPinned(id) ? 'z-30' : 'z-20',
    )

  const headerRow = (
    <TableHeader>
      <TableRow ref={roving.containerRef}>
        {selectable && (
          <TableHead
            scope="col"
            style={laneStyle(SELECT_COLUMN_ID)}
            className={headLaneClass(SELECT_COLUMN_ID)}
          >
            <Checkbox
              aria-label={t('table.selectAll')}
              checked={
                table.pageSelectionState(rows) === 'all'
                  ? true
                  : table.pageSelectionState(rows) === 'some'
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={() => table.toggleAllOnPage(rows)}
            />
          </TableHead>
        )}

        {/* AC-46 / AC-115 — while anything is selected the column LABELS are
            absent and one `N selected` cell takes their place, so no header
            menu exists. Sort, filter and columns stay reachable from the
            toolbar. Not a banner above the table. */}
        {selectedCount > 0 ? (
          <TableHead
            colSpan={columnCount - 1}
            className="sticky top-0 z-20 bg-muted font-semibold text-foreground"
          >
            {t('table.selectedCount', { count: selectedCount })}
          </TableHead>
        ) : (
          <>
            {headerCells.map((cell, index) => (
              <ColumnHeaderCell
                key={cell.column.id}
                t={t}
                language={language}
                column={cell.column}
                width={resolvedWidth(cell.column)}
                onResize={(w) => handleResizeColumn(cell.column.id, w)}
                onResetWidth={() => handleResetColumnWidth(cell.column.id)}
                sorting={sorting}
                activeFilter={table.filters.find(
                  (spec) => spec.field === filterFieldOf(cell.column),
                )}
                onCommitFilter={(value) => {
                  const field = filterFieldOf(cell.column)
                  if (field !== null) commitFilter(field, value)
                }}
                onClearFilter={() => {
                  const field = filterFieldOf(cell.column)
                  if (field !== null) removeFilter(field)
                }}
                pin={
                  cell.pinnable
                    ? {
                        isPinned: pins.isPinned(cell.column.id),
                        refusal: pins.canPin(cell.column.id, 'start'),
                        onToggle: () => togglePin(cell.column.id),
                      }
                    : null
                }
                onHide={cell.hideable ? () => toggleVisible(cell.column.id) : null}
                pinned={pins.pinnedColumn(cell.column.id)}
                overflowing={overflowing}
                today={chipProps.today}
                rovingProps={roving.itemProps(index)}
              />
            ))}
            {kebabs && (
              <TableHead
                style={laneStyle(KEBAB_COLUMN_ID)}
                className={headLaneClass(KEBAB_COLUMN_ID)}
              />
            )}
          </>
        )}
      </TableRow>
    </TableHeader>
  )

  /**
   * **The row-open contract, and it is ONE function.**
   *
   * P0-2 replaced a regex over the translated label with a declared
   * `rowClick`, and the keyboard path must arrive through the same door or the
   * defect comes back through the other one: a second resolution would be a
   * second answer to *"what does opening this row do"*, and the two would
   * diverge on the first screen that declares an action the mouse path refuses.
   *
   * §11.2 gates at RENDER, so an action the operator may not take is dead in
   * the lane. Neither a click nor an `Enter` may be a second, ungated way to
   * reach it — which is why the `disabled` predicate is consulted here rather
   * than only where the button is drawn.
   */
  const activateRow = (row: T) => {
    if (onRowClick) {
      onRowClick(row)
      return
    }
    /* Only the DECLARED target. There is deliberately no fallback of any kind
       — not the first action, not the first control in the first cell. Both
       were inference, and inference is what P0-2 was. */
    if (!primaryRowAction) return
    if (primaryRowAction.disabled?.(row) === true) return
    primaryRowAction.onSelect(row)
  }

  /* `HTMLElement`, not `HTMLTableRowElement`: the handler reads `e.target` and
     nothing else, and the compact card is a `<div>` rather than a `<tr>`. One
     handler for both modes is what makes P0-2 — no destructive action reachable
     by a row click — true at both widths without a second review. */
  const handleTableRowClick = (row: T, e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="checkbox"], [role="menuitem"], [role="button"], [data-radix-collection-item], [data-state="checked"]',
      )
    ) {
      return
    }

    activateRow(row)
  }

  /**
   * **P3-12 — export what the operator is looking at.**
   *
   * Twenty-two index tables could not export a row while `downloadCsv` had been
   * serving three other surfaces since wave 3. Finance staff on Payouts,
   * Ledger, Cash and Wallets had no way to get a figure out except by retyping
   * it, which is how a console loses the argument to a spreadsheet.
   *
   * **The view, not the resource.** `rows` is what the table is holding, in the
   * order it is holding it; `visible` is the column set the operator chose;
   * `table.query` and `table.filters` are what narrowed it. A button that
   * dumped the collection would answer a different question from the one on
   * screen, and the operator would have two numbers and no way to tell which
   * one they had asked for. `total` goes in the header block for the same
   * reason: a file holding page 1 of 4,000 says so.
   *
   * The clock is read here and passed in, so `tableCsvText` stays pure and the
   * filename and the `exported_at` line can never name two different instants.
   *
   * §13.6 — announced, never toasted. R9/R10 spend a toast on a mutation of an
   * object, and an export mutates nothing.
   */
  const handleExport = () => {
    const exportedAt = new Date().toISOString()
    const text = tableCsvText({
      tableId,
      view,
      columns,
      visible,
      rows,
      query: table.query,
      filters: table.filters,
      sort: rawSorting?.sort ?? null,
      total,
      exportedAt,
    })
    downloadCsv(tableCsvFilename(tableId, view, exportedAt), text)
    announce(t('table.announce.exported', { count: formatCount(rows.length) }))
  }

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (infiniteScroll === false) return
    const target = e.currentTarget
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 60) {
      if (range.hasNext && status !== 'loading') {
        table.nextPage()
      }
    }
  }

  /* The affordance and the behaviour come from the SAME test, so a row can
     never paint `cursor-pointer` over nothing, nor act on a click it gave no
     sign it would take. */
  const hasRowClickAction = onRowClick !== undefined || primaryRowAction !== undefined

  /**
   * **P1-5 — the rows are a roving-focus group, and until now they were not a
   * keyboard destination at all.**
   *
   * The body painted `cursor-pointer` on every row of every table with a
   * declared row action and offered no key that could take it. A pointer-only
   * affordance on the product's primary navigation gesture is a 2.1.1 failure
   * on forty screens at once.
   *
   * `useRovingFocus` already runs the rail, the sub-tab column and this table's
   * own header row — every group in the product except the one an operator
   * spends the day in. The model is the same one those three use, which is what
   * makes it learnable rather than a fourth convention:
   *
   * | key | |
   * |---|---|
   * | `Tab` | **one stop for the whole grid**, not one per row — 25 rows contribute a single tabindex 0 |
   * | `↑` / `↓` | move between rows; `loop: false`, so the ends are the ends and focus does not wrap silently past the last record |
   * | `Home` / `End` | first and last row |
   * | `Enter` / `Space` | `activateRow` — the SAME contract the click takes |
   * | `Escape` | **untouched.** `useRovingFocus` returns from its `default` branch without `preventDefault`, so a row never swallows the key a sheet, a dialog or the command palette above it is listening for |
   *
   * `orientation: 'vertical'` takes no `direction`: `ArrowDown` is down in
   * every language, which is the same reason the rail and the sub-tab list need
   * no RTL branch and the header row — horizontal — does.
   *
   * **The in-row controls keep their own tab stops**, and that is a decision
   * rather than an omission. A full `role="grid"` would take the checkbox, the
   * identity link and the kebab out of the tab order until their row is active;
   * two written accessibility criteria assert the opposite today
   * (`financials/keyboard.test.tsx` — *"a ledger's source link takes focus from
   * the keyboard alone"* and *"both row actions are reachable and operable from
   * the keyboard alone"*), and overturning them is a design decision, not a
   * refactor. Recorded in the handoff with the measurement.
   */
  const rowRoving = useRovingFocus({
    itemCount: rows.length,
    orientation: 'vertical',
    loop: false,
  })

  /**
   * **The grid keeps exactly one tab stop even after the row set shrinks.**
   *
   * `useRovingFocus` holds its own `activeIndex`, and a filter, a page or a
   * cleared query can leave that index past the end of `rows` — at which point
   * no row matches, every row is `tabIndex: -1`, and the grid drops out of the
   * tab order entirely. Clamping here rather than resetting the hook's state
   * keeps the operator's place when the list grows back (infinite scroll
   * appends), and costs nothing when it has not moved.
   */
  const activeRowIndex = Math.min(rowRoving.activeIndex, Math.max(0, rows.length - 1))

  /**
   * **The row's declared actions, built ONCE and rendered in two places.**
   * The desktop lane puts this inside a pinned `TableCell`; the compact card
   * puts it at the card's inline-end with no lane to pin to. Extracting it is
   * what stops the two modes drifting — D8's *"one action is a button, not a
   * menu"* is a rule about the COUNT of declared actions, and a second copy of
   * that rule is a second place for it to be got wrong.
   *
   * Nothing about the desktop output changes: the JSX below is the lane's
   * former contents, moved and not rewritten, which is why the column widths
   * and the row pitch measure identical at 1440.
   */
  /**
   * **Does any row on THIS page carry a refusal?** If so every row reserves the
   * refusal line's two lines and the table keeps one row pitch; if not, nothing
   * is reserved and the page is exactly as dense as before.
   *
   * Per page rather than per table, deliberately: `Claim` is refused on the two
   * disputes someone else already owns and on none of the other twenty-six, so
   * a table-wide reservation would cost every row height for a condition that
   * is usually absent. `rows` is the page, so this answers the question the
   * reader can actually see.
   */
  const reserveRefusal =
    actionShape === 'direct' &&
    rows.some((row) => declaredActions.some((action) => refusalFor(action, row) !== null))

  const rowActionControls = (row: T, id: string): ReactNode =>
    actionShape === 'direct' ? (
      /* One or two, side by side. The lane was sized from the same count
         above, so two never overflow into the cell beside them. */
      <div className="flex items-center justify-end gap-1">
        {declaredActions.map((action) => (
          /* `label` is the key: `RowAction` has no id, and two actions on one
             row with the same label would be a defect in the caller rather
             than a collision here. */
          <SingleRowAction
            key={action.label}
            action={action}
            row={row}
            reserveRefusal={reserveRefusal}
          />
        ))}
      </div>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('table.rowActions', { row: id })}
            /* AC-68 / D19 — ALWAYS rendered. Muted at rest; ink plus a fill on
               the row's hover OR its focus-within. Never zero opacity. */
            className="text-muted-foreground group-hover/row:bg-accent group-hover/row:text-foreground group-focus-within/row:bg-accent group-focus-within/row:text-foreground"
          >
            <span aria-hidden="true">⋯</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {declaredActions.map((action) => (
            /* §11.2 — disabled in place, and with its reason on a second line
               inside the item (§8.4.4). Never a tooltip. */
            <RowActionMenuItem key={action.label} action={action} row={row} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )

  const rowItemProps = (index: number, row: T) => {
    const base = rowRoving.itemProps(index)
    return {
      ...base,
      tabIndex: (index === activeRowIndex ? 0 : -1) as 0 | -1,
      onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
        /* **Only while the ROW itself holds focus.** A checkbox, a menu trigger
           or a link inside the row owns its own keys, and a row that read
           `ArrowDown` out of a control's own handler would move focus out from
           under whatever the operator was actually using. */
        if (event.target !== event.currentTarget) return

        if (event.key === 'Enter' || event.key === ' ') {
          if (!hasRowClickAction) return
          /* `Space` scrolls the nearest scroll container by default, and the
             nearest one here is the table's own — so activating a row would
             also jump the body a page down. */
          event.preventDefault()
          activateRow(row)
          return
        }

        base.onKeyDown(event)
      },
    }
  }

  return (
    /* **§7.2 / D-19 — the bands, and the page does not scroll.**
       The four bands below are siblings on the white content ground, not a
       stack inside a card. Bands 2, 3 and 5 do not flex; band 4 does, carries a
       zero minimum, and owns `overflow: auto` on both axes. The twelve is
       §1.2's, declared once: 2→3, 3→4 and 4→5 are all 12 and there is no fourth
       number in this composition.

       Consequences, all of them wanted: the pagination row is always in the
       viewport (it sat at y = 1278 in an 820px one, so the owner had literally
       never seen it — match audit N2); the horizontal scrollbar is always in
       the viewport (craft-critique F1 part 3 put it ~430px below the fold);
       and `<thead>`'s sticky finally works, because the scroller has a height
       constraint for the first time. The declarations were already correct.

       The zero-PERCENT basis is load-bearing twice over — see the D-19 note in
       the file header. Do not "simplify" it to a content basis. */
    <div className={cn('flex min-h-0 w-full flex-1 flex-col gap-3', className)}>
      {/* **BAND 2 — the control row.** §7.1 / D-18: there is no card, so this
          sits on the page ground. AC-112 still holds — it is outside the
          horizontal scroll container and does not move when the table scrolls. */}
      <IndexToolbar
        t={t}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab ?? (() => undefined)}
        searchPlaceholder={searchPlaceholder}
        query={table.query}
        onQueryChange={table.setQuery}
        filterTrigger={(trigger) => <AddFilterPopover {...chipProps} trigger={trigger} />}
        filterCount={table.filters.length}
        columnsControl={
          visibility.needsColumnsControl ? (
            <ColumnLayoutPopover
              t={t}
              columns={columns}
              isVisible={visibility.isVisible}
              isHideable={visibility.isHideable}
              onToggleVisible={toggleVisible}
              isPinned={pins.isPinned}
              canPin={canPinColumn}
              onTogglePin={togglePin}
              onReset={resetColumns}
              /* §9 — a ledger's column set is fixed by §8.3.3; it gets pin
                   toggles and no visibility checkboxes. */
              showVisibility={!isLedger}
            />
          ) : null
        }
        sortControl={
          sorting === null ? null : <SortControl t={t} sorting={sorting} columns={columns} />
        }
        /* Only where there is something to export. In `loading`, `error` and
           both empties `rows` is empty, and a control that hands the operator a
           file with a header block and no records is a control that has to be
           explained. */
        exportControl={
          status === 'content' && rows.length > 0 ? (
            <Button variant="secondary" onClick={handleExport}>
              <Download aria-hidden="true" />
              {t('table.export')}
            </Button>
          ) : null
        }
      />

      {/* **BAND 3 — the query strip**, on the ground, with a declared 12 above
          it and a declared 12 below. §6.1 makes it permanent so that adding a
          filter cannot move the table; that is build item 8, and until it lands
          it still appears only when something is narrowing. */}
      {(table.isFiltered || scope !== null) && <FilterChipRow {...chipProps} />}

      {/* **BAND 4 — the table, and it is the bordered object.** §7.1 / D-18.
          Craft-critique F17 said the card that held everything was invisible;
          it was invisible because a 1.122 : 1 border around 976px of white
          containing more white has nothing to separate. **The border value does
          not change** — what changes is what it encloses. F9's four inline-start
          edges collapse to one at the same time, because there is no card
          inset left to inset from. */}
      {/* **The box is capped by the residual, not filled to it — S1.**
          It used to declare a grow factor, so a three-row table sat in a box
          sized to the page: measured at 1440 x 900, `/support/tickets` drew
          221px of table inside a 606px scroll box, **385px of empty white
          inside a border**, and six more screens between 166 and 353. That one
          declaration is the largest single source of the "nothing has changed"
          reading, because five screens are mostly empty card.

          Shrink without grow is the whole fix. When the rows are shorter than
          the residual there is surplus, nothing claims it, and the border stops
          where the last row does. When they are longer the deficit is real,
          this is still the only box here with a zero minimum, and it absorbs
          all of it — so the bounded scroller, the pinned header and the
          on-screen pagination row are exactly as they were. */}
      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-border bg-card">
        {status === 'loading' && !refreshing && (
          <div className="p-3">
            <LoadingSkeleton pattern={pattern} />
          </div>
        )}

        {/* §11.2 — the card scope keeps the control row and the query strip
            rendered above, so the operator can change the query that failed.
            §11.3: the header row is NOT rendered in the error state, which is
            exactly why the strip above it is the escape route. */}
        {status === 'error' && (
          <ErrorState
            scope="card"
            message={error.message}
            action={{
              label: t('state.pageError.action'),
              onClick: error.onRetry,
            }}
          />
        )}

        {/* **AC-37 / AC-38 / AC-234 — two decisions, not one.**

            The FIRST is still mechanical and still `isFiltered`: something is
            narrowing, so the answer is `no-match` and the call site cannot
            override it. A ledger is NEVER `first-run` empty (§9.2), so it
            collapses here too.

            The SECOND is the one F-3 says this component was getting wrong. An
            unfiltered zero is `first-run` on an index and **`cleared`** on a
            work queue worked to zero, and no property of the table distinguishes
            them — not `isFiltered`, and not `mode` either, because Safety &
            Incidents reaches BOTH (Q-37). So `emptyKind` comes from the call
            site and defaults to `first-run`. `cleared` copy is required with it;
            without it this falls back rather than rendering a blank card. */}
        {/* **`card={false}` on all three, and it is D-18 catching up.**
            `EmptyState` cards by default because it used to render straight onto
            `--ev-bg` with nothing under it. Under D-18 **the table is the
            bordered object**, so this band is already a bordered box — and a
            carded state inside it draws a second border, which reads on screen
            as a stray horizontal rule beneath the sentence rather than as a
            designed edge. `card` is opt-OUT for exactly this case, and its own
            doc names it: *"a state rendered inside a card that already
            exists."*

            **This changes wave 1's empty states too**, because `DataTable` is
            where all of them render. Disclosed in the handoff rather than left
            for visual-QA to find as a difference between two waves. */}
        {status === 'empty' &&
          (table.isFiltered || isLedger ? (
            <EmptyState
              card={false}
              kind="no-match"
              message={noMatch.message}
              action={noMatchAction}
            />
          ) : emptyKind === 'cleared' && cleared ? (
            <EmptyState card={false} kind="cleared" heading={cleared.heading} body={cleared.body} />
          ) : (
            <EmptyState
              card={false}
              kind="first-run"
              heading={firstRun.heading}
              body={firstRun.body}
              actions={firstRun.actions}
            />
          ))}

        {(status === 'content' || refreshing) &&
          /* **The compact render mode.** Below `--ev-bp-compact` a nine-column
             grid cannot be narrowed into a 390px viewport: under
             `table-layout: fixed` the width model IS the declared column
             widths, and `min-width` on a cell does nothing, so there is no
             width tweak that turns nine columns into three. It is a different
             rendering or it is nothing. `NarrowRowCards` carries the reasoning,
             including what is deliberately unavailable there.

             A ternary and not a variant: at 768 and above the card subtree is
             not in the document, so the desktop rendering is unchanged by
             construction rather than by assertion. */
          (compact ? (
            <NarrowRowCards
              rows={rows}
              /* The VISIBLE set, so the columns popover governs both modes. */
              visible={visible}
              /* The DECLARED set — `emphasisOf` anchors to this, never to the
                 visible one, which is what stops hiding a column moving which
                 value becomes the card's heading. */
              declared={columns}
              getRowId={getRowId}
              isRowCritical={props.isRowCritical}
              rowClassName={props.rowClassName}
              hasRowClickAction={hasRowClickAction}
              onRowClick={handleTableRowClick}
              rowItemProps={rowItemProps}
              renderRowActions={kebabs ? rowActionControls : undefined}
              cellValue={(isolated, children) => (
                <CellValue isolated={isolated}>{children}</CellValue>
              )}
              boundary={isLedger ? ledgerBoundaryRows : null}
            />
          ) : (
            /* §14.4 — ONE scroll container per table, wrapping the `<table>`, and
               under D-19 it is the BOUNDED one: it flexes on both counts with
               `overflow: auto` on both axes and §7.2's floor guard,
               `min-block-size: calc(36px + 3 × 60px)` = 216. Below that the page
                itself scrolls, which is the documented fallback and not a second
               breakpoint. `overscroll-behavior-inline: contain` so a trackpad
               flick at the end of a wide table does not trigger the browser's
               back-navigation gesture.

               In a page declared `flow` this same box reports the table's real
               height instead and there is nothing to scroll INSIDE it, which is
               the correct reading of "one scroll container": a nested scrollport
               inside a scrolling page is two ways to move the same rows. */
            <Table
              containerRef={scrollRef}
              containerClassName="min-h-54 flex-1 overflow-y-auto"
              /* **P0-3** — see `tableMinInlineSize`. A style rather than a class
                 because the value is arithmetic over the declared column widths
                 and changes with the visible set, the resize handles and the
                 actions lane; a utility cannot hold a computed number, and an
                 arbitrary-value class here would be a new class name per screen. */
              style={{ minInlineSize: tableMinInlineSize }}
              onScroll={handleTableScroll}
            >
              {headerRow}

              {/* P1-5 — the roving group's container. `useRovingFocus` finds its
                  items by `[data-roving-item]` scoped to this node, so the body's
                  rows and the header row's cells are two independent groups on
                  two independent axes and neither can focus the other's items. */}
              <TableBody ref={rowRoving.containerRef}>
                {/* §9.2 / AC-49 — a ledger OPENS with a labelled opening balance. */}
                {isLedger && ledgerBoundaryRows && (
                  <TableRow className="font-semibold">
                    <TableCell colSpan={columnCount}>{ledgerBoundaryRows.opening}</TableCell>
                  </TableRow>
                )}

                {refreshing
                  ? Array.from({ length: Math.max(rows.length, 5) }, (_, index) => (
                      <TableRow
                        key={`skeleton-${index}`}
                        className={cn('group/row relative', rowHeightClass)}
                      >
                        {selectable && (
                          <TableCell
                            style={laneStyle(SELECT_COLUMN_ID)}
                            className={laneClass(SELECT_COLUMN_ID)}
                          >
                            <Skeleton className="size-4" />
                          </TableCell>
                        )}
                        {visible.map((column) => (
                          <TableCell
                            key={column.id}
                            style={pinnedStyle(
                              pins.pinnedColumn(column.id),
                              resolvedWidth(column),
                              overflowing,
                              column.minWidth,
                            )}
                            className={laneClass(column.id)}
                          >
                            <Skeleton className="h-3 w-full" />
                          </TableCell>
                        ))}
                        {kebabs && (
                          <TableCell
                            style={laneStyle(KEBAB_COLUMN_ID)}
                            className={laneClass(KEBAB_COLUMN_ID)}
                          >
                            <Skeleton className="size-4" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  : rows.map((row, rowIndex) => {
                      const id = getRowId(row)
                      const isCritical = props.isRowCritical?.(row) ?? false
                      return (
                        <TableRow
                          key={id}
                          data-state={selectable && table.isSelected(id) ? 'selected' : undefined}
                          /* P1-5 — `data-roving-item`, the single tabindex 0,
                               the arrow handler and Enter/Space. See `rowRoving`. */
                          {...rowItemProps(rowIndex, row)}
                          /* P0-2 — no declared target means no handler at all,
                               not a handler that quietly does nothing. */
                          onClick={
                            hasRowClickAction ? (e) => handleTableRowClick(row, e) : undefined
                          }
                          /* `group` so the kebab and the pinned cells can respond
                               to the row's hover AND its focus-within (AC-68).
                               `relative` so a `RowCriticalMarker` can position
                               against it — and because the marker rides the
                               implicitly pinned first cell, it stays visible at
                               every horizontal scroll offset (**AC-106**). */
                          /* A row-level hook for Defence 3 in `globals.css`. The
                             derived critical ink is applied per CELL and scoped to
                             `tier === 'meta'`, which cannot reach a nested span
                             that sets its own colour — and two do
                             (`rowActions.tsx`'s refusal line, `queues/cells.tsx`'s
                             secondary line), both landing at 4.354:1 on the active
                             ground. One attribute lets CSS catch every such site,
                             including ones written after this. */
                          data-row-critical={isCritical ? '' : undefined}
                          className={cn(
                            'group/row relative transition-colors',
                            rowHeightClass,
                            /* P1-5 — the ring for the stop that now exists.
                                 INSET, because the global `:focus-visible` rule
                                 offsets its outline by 2px and a row's outline
                                 would then be drawn over its neighbours and
                                 clipped at the scroll container's edges. 2px of
                                 `--ring` against the row's own ground, so it is
                                 visible on the critical tint and on the selected
                                 fill as well as on white. */
                            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                            hasRowClickAction && 'cursor-pointer hover:bg-muted/60',
                            /* **P1-4 — the critical row's ground, on token.**
                                 `--ev-row-critical` / `--ev-row-critical-emphasis`
                                 are the blended values the `/70` and `/80` alphas
                                 used to produce, so the alphas leave with the
                                 palette classes. The `dark:` half is DELETED
                                 rather than tokenised: `.dark` is never applied
                                 anywhere in this product and there is no dark
                                 palette, so those classes could only ever have
                                 painted a dark red row inside a white table. */
                            isCritical &&
                              'bg-row-critical hover:bg-row-critical-emphasis focus-within:bg-row-critical-emphasis',
                            props.rowClassName?.(row),
                          )}
                        >
                          {selectable && (
                            <TableCell
                              style={laneStyle(SELECT_COLUMN_ID)}
                              className={laneClass(SELECT_COLUMN_ID, isCritical)}
                            >
                              <Checkbox
                                aria-label={t('table.selectRow')}
                                checked={table.isSelected(id)}
                                onCheckedChange={() => table.toggleRow(id)}
                              />
                            </TableCell>
                          )}

                          {visible.map((column) => {
                            const pinned = pins.pinnedColumn(column.id)
                            const tier = emphasisOf(column, columns)
                            return (
                              <TableCell
                                key={column.id}
                                style={pinnedStyle(
                                  pinned,
                                  resolvedWidth(column),
                                  overflowing,
                                  column.minWidth,
                                )}
                                className={cn(
                                  column.align === 'end' && 'text-end',
                                  /* **H1 — the emphasis tier, declared.**
                                       `03-navattic-language.md` §4.5 and the
                                       match audit's largest single delta: **ink
                                       belongs to the columns the operator came to
                                       read; the rest of the row is quieter.**
                                       Measured `#6b7280` against our `#24242f` —
                                       about 3× too dark, and a large part of why
                                       the table read heavy. `TableCell` defaults
                                       to `--ev-text-2`; `primary` and `data` take
                                       it back.

                                       This was `columnIndex === 0`, which is the
                                       same class of defect as P0-2's label regex
                                       one directory over: it keyed the row's ink
                                       off a position in the VISIBLE array, so
                                       hiding or reordering a column moved the
                                       emphasis onto whatever landed first. The
                                       tier travels with the declaration and
                                       nothing an operator does can move it. */
                                  tier !== 'meta' && 'text-foreground',
                                  tier === 'primary' && 'font-medium',
                                  /* **P1-4's second half, and the half that
                                       actually closes the defect.** Moving the
                                       ground alone leaves every quiet cell on
                                       `--muted-foreground` `#6b7280`, which
                                       measures **4.354 : 1** on the active
                                       critical ground — still under AA. The
                                       derived ink measures 4.931 / 4.689.
                                       `globals.css` states the law being broken:
                                       darkening a surface without re-deriving the
                                       ink on it is how a re-skin quietly drops
                                       below AA.

                                       Scoped to the `meta` tier rather than
                                       ordered before the ink, because `cn` merges
                                       last-wins and an ink-bearing column's
                                       `text-foreground` is already 16.488 /
                                       15.680 on this ground — the override would
                                       have QUIETENED the columns that carry the
                                       row's meaning. Following the TIER and not
                                       the index is what keeps that true after H1:
                                       a `data` column at position 4 is ink, so it
                                       must not take the derived muted ink either. */
                                  isCritical &&
                                    tier === 'meta' &&
                                    'text-row-critical-foreground',
                                  laneClass(column.id, isCritical),
                                  pinned &&
                                    isCritical &&
                                    'bg-row-critical group-hover/row:bg-row-critical-emphasis group-focus-within/row:bg-row-critical-emphasis',
                                )}
                              >
                                {/* A2 — see `CellValue`. */}
                                <CellValue isolated={isolatesValue(column)}>
                                  {column.cell(row)}
                                </CellValue>
                                {/* §9.1 — a 12px second line INSIDE the identity
                                      cell. The row grows to fit.

                                      **BOUNDED AT TWO LINES, and §9.1's "never
                                      truncates" is narrowed rather than
                                      reversed.** Every ordinary second line —
                                      a phone number, a city, a record id — is
                                      one line and is untouched by this. What is
                                      not ordinary is `admin/communications`,
                                      whose delivery cell puts an SMTP bounce
                                      message here (`550 5.1.1 The email account
                                      that you tried to reach…`); it ran to four
                                      lines and shipped a **105px row beside 77px
                                      rows in the same table**, which is the
                                      pitch defect the refusal line's reservation
                                      exists to prevent, arriving by a second
                                      door.

                                      Two lines, so nothing an identity cell
                                      legitimately carries is ever cut, and a
                                      paragraph that does not belong in a row is
                                      bounded instead of setting the table's
                                      pitch. NO `block` BESIDE THE CLAMP: the
                                      clamp sets `-webkit-box` and a second
                                      display declaration is decided by
                                      stylesheet order, not class order —
                                      `rowActions.tsx` records the same trap
                                      after shipping it once. */}
                                {column.secondaryLine && (
                                  <span
                                    className={cn(
                                      'line-clamp-2 text-xs text-muted-foreground',
                                      /* This line names `text-muted-foreground`
                                         itself, so the cell-level override above
                                         cannot reach it — `#6b7280` on the
                                         critical ground, 4.354 : 1. It takes the
                                         derived ink directly. */
                                      isCritical && 'text-row-critical-foreground',
                                    )}
                                  >
                                    {column.secondaryLine(row)}
                                  </span>
                                )}
                              </TableCell>
                            )
                          })}

                          {kebabs && (
                            <TableCell
                              style={laneStyle(KEBAB_COLUMN_ID)}
                              /* **`isCritical`, which this lane alone was not
                                   passing.** The selection lane two blocks up has
                                   always passed it; the actions lane did not, so
                                   on a critical row the pinned end lane painted
                                   `bg-card` — a white notch at the end of a
                                   tinted row, and under AC-111 an OPAQUE white
                                   one, so it stayed white at every scroll offset.
                                   Found while measuring P1-4: the ground was the
                                   only thing wrong with it, and tokenising the
                                   other three sites would have left this one
                                   white against the new tint. */
                              className={laneClass(KEBAB_COLUMN_ID, isCritical)}
                            >
                              {/* **D8 — one action is a BUTTON, not a menu.**
                                    §7.8. Still §11.2-gated: an action the role
                                    cannot use renders disabled IN PLACE, because
                                    the count that chose this shape is the count
                                    of DECLARED actions and does not move per row.
                                    AC-68 / D19 — visible at rest, never revealed
                                    by hover.

                                    The controls themselves are built by
                                    `rowActionControls`, which the compact card
                                    also calls. */}
                              {rowActionControls(row, id)}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
              </TableBody>

              {/* §9.2 / AC-49 — and CLOSES with a labelled closing balance. */}
              {isLedger && ledgerBoundaryRows && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={columnCount}>{ledgerBoundaryRows.closing}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          ))}
      </div>

      {/* **BAND 5 — the status/pagination row, OUTSIDE the table.** */}
      {status === 'content' && (
        <div className="flex h-9 flex-none items-center justify-between gap-3 px-1">
          <span className="text-xs text-muted-foreground">
            {t('table.showing', {
              from: formatCount(range.from),
              to: formatCount(range.to),
              total: formatCount(range.total),
            })}
          </span>
          {infiniteScroll === false ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={table.previousPage}
                disabled={!range.hasPrevious}
              >
                {t('table.previous')}
              </Button>
              <Button variant="ghost" size="xs" onClick={table.nextPage} disabled={!range.hasNext}>
                {t('table.next')}
              </Button>
            </div>
          ) : (
            range.hasNext && (
              <span className="text-2xs text-muted-foreground">
                {t('table.scrollMore')}
              </span>
            )
          )}
        </div>
      )}

      {/* §9.1 / AC-112 — THE BULK BAR FLOATS AGAINST THE PAGE, NOT THE CARD.
          It is `sticky` in the content region's own scroll context and carries
          zero layout height, so it rides 24px above the fold for as long as the
          table is on screen and never pushes a row.

          OWNER RULING — it has to READ as actions. The previous bar was a white
          32px strip of ghost text on a white card: `Suspend  Reinstate` with no
          surface, no context and no way out, which is why it was missed. It is
          now the one INVERTED surface in the app - ink ground, white ink, tier 3
          - which is the strongest "this is a mode, and it is temporary" signal
          available without spending a colour. It states the count it is acting
          on, and it carries its own exit.

          A ledger cannot reach this branch: `selectable` is `false` at compile
          time. */}
      {selectable && selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="pointer-events-none sticky bottom-6 z-40 -mt-3 flex h-0 items-end justify-center">
          {/**
           * **One object with two compartments, not a card floating above a pill.**
           *
           * The provisional treatment was a borderless white card on a white page
           * — §6.2 D-11 / §6.3 D1, the defect itself — setting a load-bearing
           * sentence at `text-2xs`, a size `globals.css` annotates as *"count
           * badge numeral, status badge label"*, centred, wrapping, and off the
           * 4px grid. Two surfaces also meant two shadows and two radii for what
           * is one control in one state.
           *
           * The refusal now joins the bar: same container, same shadow, same
           * radius, a `background/20` rule between the compartments — the rule
           * the bar already draws between its own groups. Growth is upward, and
           * the container is bottom-aligned inside a zero-height sticky row, so
           * a refusal appearing moves nothing on the page.
           */}
          <div className="pointer-events-auto flex flex-col rounded-xl bg-foreground text-background shadow-3">
            {refusalLines.length > 0 && (
              <>
                <div className="flex max-w-prose flex-col gap-1 px-4 py-2 text-start">
                  {refusalLines.map((line) => (
                    <div
                      key={line.key}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                    >
                      {/* `text-xs` on `background/80` measures 11.6 : 1 on ink —
                          AA with room. `text-2xs` is a badge size and this is a
                          sentence somebody has to act on. */}
                      <span id={line.key} className="text-xs text-background/80">
                        {line.text}
                      </span>
                      {line.narrow !== null && (
                        /* D21's escape hatch, at the compartment's inline-end.
                           It leaves the sentence for discoverability, not for
                           accessibility: at `size="xs"` it is ≥28px, sits at a
                           predictable edge, and stops competing with the text it
                           was embedded in. The label is unchanged. */
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={line.narrow.onSelect}
                          className="h-7 shrink-0 rounded-lg bg-background/20 px-2.5 text-background hover:bg-background/30 hover:text-background focus-visible:ring-background"
                        >
                          {t('table.bulk.selectEligible', {
                            count: formatCount(line.narrow.count),
                          })}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <span aria-hidden="true" className="h-px bg-background/20" />
              </>
            )}
            <div
              role="group"
              aria-label={t('table.selectedCount', {
                count: formatCount(selectedCount),
              })}
              /* Chrome moved to the shared container above. `ps-4 pe-2` rather
                 than the old `ps-3.5 pe-1.5`, which was off the 4px grid
                 (design/12 F-3). */
              className="flex h-11 items-center gap-0.5 ps-4 pe-2"
            >
              <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                {t('table.selectedCount', {
                  count: formatCount(selectedCount),
                })}
              </span>
              <span aria-hidden="true" className="mx-2 h-5 w-px bg-background/25" />
              {bulkActions.slice(0, 3).map((action) => (
                <BulkBarButton
                  key={action.label}
                  action={action}
                  describedBy={reasonIdFor(action)}
                  onRun={() => action.onClick(table.selectedIds)}
                />
              ))}
              {bulkActions.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('shell.moreActions')}
                      className="h-8 w-8 rounded-lg bg-background/20 text-background hover:bg-background/30 hover:text-background focus-visible:ring-background"
                    >
                      <span aria-hidden="true">⋯</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {bulkActions.slice(3).map((action) => (
                      <BulkBarMenuItem
                        key={action.label}
                        action={action}
                        onRun={() => action.onClick(table.selectedIds)}
                      />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <span aria-hidden="true" className="mx-2 h-5 w-px bg-background/25" />
              <Button
                variant="ghost"
                size="xs"
                onClick={table.clearSelection}
                className="h-8 px-2.5 text-background/80 hover:bg-background/15 hover:text-background focus-visible:ring-background"
              >
                {t('table.clear')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* V-11 — one centred `Learn more about {resource}.`, outside the card. */}
      {/* Does not shrink — see the toolbar. Band 4 absorbs every deficit. */}
      {learnMore && <div className="shrink-0 text-center">{learnMore}</div>}
    </div>
  )
}

/* ─────────────────────── the bulk bar's two shapes ─────────────────────── */

/**
 * What a screen declares for the bulk bar. Deliberately the same three ideas as
 * `RowAction` — label, refusal, handler — so one command registry can feed both
 * surfaces without either translating the other's vocabulary.
 */
export interface BulkAction {
  label: string
  onClick: (ids: ReadonlySet<string>) => void
  disabled?: boolean
  reason?: string | null
  /**
   * **D21** — the ids in the current selection this command *would* accept.
   *
   * Present only on a refused action that has something to narrow to. The bar
   * renders `Select only the N eligible` from it and narrows the selection; it
   * never recomputes the predicate, because the predicate belongs to the
   * command registry and a second implementation here is a second answer.
   *
   * **Omitted when every selected record is refused** — there is nothing to
   * narrow to, that case gets the `.all` sentence, and no control renders
   * (AC-960). The bar treats an empty set the same way for the same reason.
   */
  eligibleIds?: ReadonlySet<string>
}

/**
 * §11.2 — **disabled in place, at rest, with its reason.** Before this existed
 * the bulk bar had no way to say no until after the click, so the row kebab and
 * the bulk bar could disagree about the same record. That divergence is the
 * defect **D9** records, and the command registry now derives both from one
 * predicate; this is the half that renders it.
 *
 * The reason is not on the button. The bar is a 44px inverted pill and a second
 * line inside it would break the geometry, so the sentence renders in the
 * light-ground region above the bar and the button points at it with
 * `aria-describedby` — real text, reachable by keyboard and by screen reader,
 * which is what §8.4.4 requires and what a `title` attribute would not give.
 */
function BulkBarButton({
  action,
  describedBy,
  onRun,
}: {
  action: BulkAction
  /** The refusal line this control points at — see `refusalLines`. Identical
      sentences collapse to one line, so it is not always this action's own. */
  describedBy?: string | undefined
  onRun: () => void
}) {
  const refused = action.disabled === true
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={refused}
      aria-describedby={describedBy}
      onClick={onRun}
      className="h-8 rounded-lg bg-background/20 px-2.5 text-background hover:bg-background/30 hover:text-background focus-visible:ring-background"
    >
      {action.label}
    </Button>
  )
}

/**
 * The overflow item — §8.4.4's construction exactly, and identical to
 * `RowActionMenuItem`'s: disabled in place with the reason on a second line
 * **inside** the item, the accessible name kept as the bare label so a caller
 * that finds an action by its label still finds it.
 */
function BulkBarMenuItem({ action, onRun }: { action: BulkAction; onRun: () => void }) {
  const refused = action.disabled === true
  const reason = refused ? (action.reason ?? null) : null
  const reasonId = useId()

  return (
    <DropdownMenuItem
      onSelect={onRun}
      disabled={refused}
      aria-label={reason === null ? undefined : action.label}
      aria-describedby={reason === null ? undefined : reasonId}
      className={cn(reason !== null && 'flex-col items-start gap-0.5 whitespace-normal')}
    >
      {action.label}
      {reason !== null && (
        <span
          id={reasonId}
          className="block text-2xs font-normal whitespace-normal text-muted-foreground"
        >
          {reason}
        </span>
      )}
    </DropdownMenuItem>
  )
}

/** Stable across renders and shared by the button and the sentence above the bar. */
function bulkReasonId(label: string): string {
  return `bulk-refusal-${label.replace(/\W+/g, '-').toLowerCase()}`
}
