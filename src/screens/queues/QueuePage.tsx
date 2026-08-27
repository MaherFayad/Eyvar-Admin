/**
 * The page shell and the table adapter every wave-2 work queue mounts into —
 * `specs/02-work-queues.md` §4.6, §4.7, §4.11, §4.12 ·
 * `design/04-index-screen-redesign.md` §7 · `DESIGN.md` §8.4, §9.4.
 *
 * §9.4's one mechanical rule governs all five:
 *
 * > `DataTable` takes a `mode` — `index | ledger | queue` — and **the mode, not
 * > the route, decides which furniture renders. A route may mount more than one
 * > mode over its lifetime. It may never mount two at once.**
 *
 * Every wave-2 sub-tab is `queue`, with one deliberate exception that proves
 * the rule: Captain Fairness's `Captain economics` view is **P5, not P8** — it
 * fails §4.1's admission test on all four clauses — so it mounts a metric board
 * instead of a table and grows no claim, no clock and no disposition (§9.1,
 * **AC-340**).
 *
 * Rules applied
 *   §3.8 rule 3 / AC-10
 *              the view is `?view=` — **a control, never a path segment** — and
 *              it changes neither nav column's highlight. The view ids and
 *              their labels come from the ROUTE TABLE (`row.views`), so
 *              renaming or re-ordering one is a data change.
 *   §4.6 Q-32  **a work queue's default view is its open work, not `All`.** A
 *              deliberate departure from foundation §7.1's index-table doctrine
 *              and the reason `defaultView` is a screen constant rather than
 *              `row.views.find(isDefault)` — see `useQueueViews`.
 *   §8 slot 1  **no back arrow**: these are index routes (§2.2).
 *   §8 / V4    the `meta` line is the mounted view's own record count, derived
 *              from the data on screen. `null` until the read lands, so the
 *              line is absent rather than reading `0` for a second.
 *   §8 slot 4  **no page-level action cluster.** Nobody creates a queue item
 *              (§4.7 Q-36); every act a queue offers acts on a row. R3's one
 *              primary is better spent nowhere than on a button that has to
 *              invent a flow.
 *   §11.4 / R10
 *              the breach banner is the VIEW's, and there is never more than
 *              one page-level banner.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SubTabRoute, SubTabView } from '@/data/types'
import { formatCount, type Direction, type Language, type Translate } from '@/lib'
import { Banner } from '@/components/Banner'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import {
  DataTable,
  type DataColumn,
  type ExtraFilterSpec,
  type RowAction,
  type ToolbarTab,
} from '@/components/DataTable'
import type { AnyTable } from '@/hooks'
import { useRouteState, withView } from '@/shell/routeState'

/* ────────────────────────────── the views ──────────────────────────────── */

export interface QueueViews {
  /** The route table's declaration, in its declared order. */
  views: readonly SubTabView[]
  /** The toolbar's segmented control (D12), already translated. */
  tabs: readonly ToolbarTab[]
  activeTab: string
  selectTab: (id: string) => void
}

/** The translated tab row. Separate so a screen can decorate a label. */
function toTabs(views: readonly SubTabView[], t: Translate): readonly ToolbarTab[] {
  return views.map((view) => ({ id: view.id, label: t(view.titleKey) }))
}

/**
 * The view row, resolved against the URL — with **Q-32's departure made
 * explicit**.
 *
 * Foundation §7.1 says *"`All` is always first and always default"*, and
 * `routeTable.ts` encodes exactly that: `views()` marks index 0 `isDefault`.
 * **That is index-table doctrine and it is wrong for a queue.** §4.6 Q-32: an
 * index describes a resource, so `All` is the honest default; a queue describes
 * *work owed*, and a default that includes decided rows buries it. `All`
 * remains available and remains first in the tab row; it is simply not where an
 * operator lands.
 *
 * So `defaultView` is a constant on each screen, named in that screen's file
 * with the sentence from §5.3 / §6.3 / §7.3 / §8.9 / §9.3 that chose it.
 *
 * **This is a divergence from the route table that I could not close in my own
 * files.** The spec's §12 asks mock-data-engineer for `pending` → `needs-decision`
 * (and for it to become default), for `all` to stop being Requests' default, and
 * for `all` views on Assurance and Fairness. None of those landed, and
 * `routeTable.ts` has a single owner. Reported rather than edited.
 */
export function useQueueViews(
  row: SubTabRoute,
  defaultView: string,
  t: Translate,
): QueueViews {
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])

  const activeTab = views.some((view) => view.id === route.view)
    ? (route.view as string)
    : defaultView

  const selectTab = useCallback(
    (id: string) => {
      navigate({ pathname: location.pathname, search: withView(location.search, id) })
    },
    [navigate, location.pathname, location.search],
  )

  return { views, tabs: toTabs(views, t), activeTab, selectTab }
}

/* ─────────────────────────────── the page ──────────────────────────────── */

export function QueuePage({
  row,
  meta,
  t,
  dir,
  children,
}: {
  row: SubTabRoute
  meta: string | null
  t: Translate
  dir: Direction
  children: ReactNode
}) {
  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      {children}
    </SingleColumnPage>
  )
}

/* ──────────────────────── R5a (a) · the breach banner ──────────────────── */

export interface BreachBannerProps {
  id: string
  /** **Work still owed and past its deadline.** Q-18: a stopped clock is not a backlog. */
  count: number
  /** True while the list is already narrowed to the breached set — the banner stands down. */
  scoped: boolean
  onShowBreached: () => void
  t: Translate
  language: Language
  /** One key for one, one for many. There is no plural engine, and Arabic has six categories. */
  oneKey: string
  otherKey: string
}

/**
 * **R5a part (a)** — *exactly one* page-level critical banner stating the
 * count, with one secondary control that filters the list to those items
 * (**AC-219**: nine breached items produce one banner, not nine).
 *
 * The count is of the **whole queue**, not the page: a count of what is on
 * screen understates the backlog the moment there are two pages. And it counts
 * only items **still awaiting a decision** — **Q-18** / **AC-222**, the answer
 * to wave 1's finding **G9**, whose `breached` view counted approved and
 * rejected applications. A stopped clock is not a backlog.
 *
 * The control applies a **filter**, not a view, and that is deliberate: a
 * filter shows as a chip in the query strip, so it is clearable from inside the
 * queue without a reload (**AC-235**, **AC-325**), and it makes
 * `table.isFiltered` true, so the resulting zero renders `no-match` rather than
 * the cleared-queue sentence. Neither would be true of a view.
 */
export function BreachBanner({
  id,
  count,
  scoped,
  onShowBreached,
  t,
  language,
  oneKey,
  otherKey,
}: BreachBannerProps) {
  if (count === 0 || scoped) return null
  return (
    <Banner
      className="mb-3"
      banner={{
        id,
        tone: 'critical',
        title:
          count === 1 ? t(oneKey) : t(otherKey, { count: formatCount(count, language) }),
        actions: [{ label: t('queue.showBreached'), onClick: onShowBreached }],
      }}
    />
  )
}

/* ────────────────────────── the table adapter ──────────────────────────── */

export interface QueueTableProps<T> {
  t: Translate
  language: Language
  table: AnyTable<T>
  rows: readonly T[]
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  getRowId: (row: T) => string
  columns: ReadonlyArray<DataColumn<T>>

  /** §7.6 — the key both column hooks share. Per table AND per view. */
  tableId: string
  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  /** §8's `meta` line. Reported from here so every queue answers the same way. */
  onTotal: (total: number | null) => void
  searchPlaceholder: string

  extraFilters?: readonly ExtraFilterSpec[]
  now?: string | null
  rowActions?: ReadonlyArray<RowAction<T>>
  rowActionsWidth?: number

  /**
   * §4.7 — **E1**, and the copy names the scope that is clear, per view. This
   * is the prop `DataTable` grew for **F-3**; passing it is what makes
   * **AC-234** pass.
   */
  cleared: { heading: string; body: string }
  /**
   * §4.7 **E3** — reachable on exactly one of these five queues (Q-37). Every
   * other queue passes copy that will never render, because `emptyKind` is
   * `'cleared'` on all of them; the prop stays required so an empty state can
   * never be a TODO.
   */
  firstRun: { heading: string; body: string; actions: { label: string; onClick: () => void }[] }
  /**
   * §4.7 **E3 vs E1**, decided by the CALL SITE (F-3). Only Safety passes
   * `'first-run'`, and only when its whole corpus is empty.
   */
  emptyKind?: 'cleared' | 'first-run'
  noMatch: { message: string; action?: { label: string; onClick: () => void } }
  error: { message: string; onRetry: () => void }
}

export function QueueTable<T>({
  t,
  language,
  table,
  rows,
  status,
  total,
  getRowId,
  columns,
  tableId,
  tabs,
  activeTab,
  onSelectTab,
  onTotal,
  searchPlaceholder,
  extraFilters,
  now = null,
  rowActions,
  rowActionsWidth,
  cleared,
  firstRun,
  emptyKind = 'cleared',
  noMatch,
  error,
}: QueueTableProps<T>) {
  /* The page header's `meta` count. Reported after paint rather than during
     render, because it sets state on an ancestor. `null` until the read lands,
     so the line is absent rather than reading `0` for a second (AC-26). */
  useEffect(() => {
    onTotal(status === 'content' ? total : null)
    return () => onTotal(null)
  }, [onTotal, status, total])

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      status={status}
      total={total}
      t={t}
      language={language}
      tableId={tableId}
      /* §7.6 — the column hooks are keyed per table AND per view, so one view's
         hidden set can never be read as another's. Assurance needs this most:
         its four views mount four different column sets. */
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={searchPlaceholder}
      extraFilters={extraFilters}
      now={now}
      /* AC-35 — the QUEUE skeleton, shaped like the columns it replaces. */
      skeletonPattern="P8"
      rowActions={rowActions}
      rowActionsWidth={rowActionsWidth}
      firstRun={firstRun}
      noMatch={noMatch}
      emptyKind={emptyKind}
      cleared={cleared}
      error={error}
    />
  )
}

/* ─────────────────── the meta line, one shape for five ─────────────────── */

/**
 * `12 requests` / `1 request`. **Two keys per noun, never a plural engine** —
 * `translate.ts` says why: Arabic has six plural categories and a half-built
 * engine is worse than an explicit choice.
 *
 * `noun` is a key PREFIX and the caller passes the one its mounted view uses,
 * so switching Assurance from `Departing next 24 h` to `Absences` changes the
 * word as well as the number.
 */
export function useQueueMeta(
  t: Translate,
  language: Language,
  noun: string,
): { meta: string | null; onTotal: (total: number | null) => void } {
  const [total, setTotal] = useState<number | null>(null)
  const onTotal = useCallback((next: number | null) => setTotal(next), [])

  const meta = useMemo(() => {
    if (total === null) return null
    return t(`${noun}.${total === 1 ? 'one' : 'other'}`, { count: formatCount(total, language) })
  }, [noun, total, t, language])

  return { meta, onTotal }
}
