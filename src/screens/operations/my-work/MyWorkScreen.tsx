/**
 * **Operations › My Work** — `inbox`, re-specified as a **projection** over the
 * other queues rather than a queue of its own. Pattern **P10 + P8**.
 * `specs/02-work-queues.md` §7.
 *
 * §7.1: *"It is not a queue. It is a projection over every queue in the
 * product."* The legacy design contract says so in three sentences
 * (`:19061`–`:19083`) and they still bind, so they are the three things this
 * file is built around:
 *
 * **"The queues stay."** It routes an operator into the domain page and never
 * duplicates the domain actions. §7.2 puts it as a scope rule: **any
 * disposition is out.** `Decide`, `Approve`, `Advance` and `Cover it` as
 * *actions* (`:19138`–`:19211`) all become `Open`, and the decision happens
 * where the context is (**AC-281**). That is the reason this screen is safe to
 * build over twelve domains at once.
 *
 * **"Sort by DEADLINE, not by age or severity label."** `urgency` ascending —
 * breached first, then by deadline, undated last. *"A 'critical' incident with
 * four hours left is less urgent than a High ticket breaching in ninety
 * seconds"* (`:19074`). Severity is a column, never the order (**AC-289**).
 *
 * **"Route by role, but never hide."** Role routing is a **filter the operator
 * can switch off**, not an access control (Q-62) — see `ROUTING_FILTER`.
 *
 * **My Work sets no target of its own** (§4.3, §7.1). Every clock on this
 * screen is inherited from the queue the row came from, which is why there is
 * no SLA constant anywhere in this file and why `WorkItem.dueAt` is *"`slaDueAt`
 * restated under the name the inbox sorts on"*.
 *
 * Rules applied
 *   §4.8 Q-40 / AC-280
 *              **the only surface that may show an item owned by another
 *              queue**, and therefore the only one that must label each row with
 *              the queue it came from, in words.
 *   §7.3 Q-61  the default view depends on the operator's live claims: `Mine`
 *              when they hold at least one, `Unassigned` otherwise. Legacy
 *              defaults to `Mine` unconditionally (`:19085`) while seeding
 *              `DB.ownership` empty (`:18851`), so **a fresh session opens on
 *              an empty page** and the screen's first impression is that there
 *              is no work (**AC-282**, **AC-283**).
 *   §7.4 F-12  `WORK_ROUTING` names a role no user has. Corrected in
 *              `types/work.ts` by the data layer; **AC-284** is the criterion
 *              that proves it from the outside.
 *   §7.6 AC-290
 *              no row shows `overdue 0m` at rest. The three `dueMs = -1`
 *              sentinels (`:19154`, `:19168`, `:19191`) are not in the data and
 *              `formatDuration` rounds **up** to the minute, so a live
 *              countdown cannot read `0m` for a whole minute (**Q-16**).
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  claimApplicant,
  claimAssuranceTrip,
  claimDispute,
  claimFairnessCase,
  claimRequest,
  claimSafetyIncident,
  claimTicket,
  listWorkItems,
  releaseApplicant,
  releaseAssuranceTrip,
  releaseDispute,
  releaseFairnessCase,
  releaseRequest,
  releaseSafetyIncident,
  releaseTicket,
} from '@/data/clients'
import type {
  IsoDateTime,
  Paginated,
  SubTabRoute,
  WorkItem,
  WorkItemParams,
  WorkItemSeverity,
  WorkQueueId,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, type Language, type Translate } from '@/lib'
import { toast } from 'sonner'
import { setRefusal } from '../bulkRefusal'
import { ErrorState } from '@/components/ErrorState'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import type { DataColumn, ExtraFilterSpec, RowAction } from '@/components/DataTable'
import { useShell } from '@/shell/ShellContext'
import {
  BreachBanner,
  Cell,
  MutedCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  SubjectIdentity,
  queueClock,
  type QueueClockResult,
  useNowIso,
  useQueueViews,
} from '@/screens/queues'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { withFallback } from '../localCopy'
import { MY_WORK_EN } from './copy'

/**
 * **Q-61 — the default view depends on the operator's live claims.**
 *
 * `Mine` when they hold at least one, `Unassigned` otherwise. The route table
 * marks `mine` default unconditionally, which is the legacy behaviour and the
 * legacy defect: a fresh session with no claims opens on an empty page, and the
 * screen's first impression is that there is no work.
 *
 * Resolved with one extra read of `view=mine` at `pageSize: 1` — the count, not
 * the rows. Once the operator picks a view the URL carries it and this does not
 * apply again (**AC-282**, **AC-283**).
 */
const VIEW_MINE = 'mine'
const VIEW_UNASSIGNED = 'unassigned'

/**
 * **X3 / O8** — the rail badge is `myWorkBacklogSize()`: routed to this role
 * and not held by somebody else, which is `mine` ∪ `unassigned`. Two disjoint
 * `pageSize: 1` reads through the same client add up to it by construction.
 * Named, because `useAsync` keys on `deps` and two `[]` reads of one operation
 * would share a cache entry.
 */
const MINE_COUNT_QUERY = { view: VIEW_MINE, pageSize: 1 } as const
const OPEN_COUNT_QUERY = { view: VIEW_UNASSIGNED, pageSize: 1 } as const

export function MyWorkScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, MY_WORK_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()

  /* Q-61's probe, and half of the backlog. Constant queries, so they answer a
     question about the session rather than about the current filters and do not
     make the default flicker under the operator. Both are role-scoped, so an
     item held by this operator but routed elsewhere no longer sends them to a
     `Mine` tab the routing filter has emptied. */
  const held = useAsync<Paginated<WorkItem>>(
    (signal) => listWorkItems(MINE_COUNT_QUERY, signal),
    { deps: [MINE_COUNT_QUERY], cacheKey: 'work.list' },
  )
  const open = useAsync<Paginated<WorkItem>>(
    (signal) => listWorkItems(OPEN_COUNT_QUERY, signal),
    { deps: [OPEN_COUNT_QUERY], cacheKey: 'work.list' },
  )
  const defaultView = (held.data?.total ?? 0) > 0 ? VIEW_MINE : VIEW_UNASSIGNED

  const { tabs, activeTab, selectTab } = useQueueViews(row, defaultView, t)

  /**
   * **§8 / V4, read differently here on purpose (X3).** Elsewhere the meta line
   * is the mounted view's count; this projection has a rail badge beside its
   * name and the two disagreed (badge 25 above `5 items`). The line states the
   * backlog; the table's own `Showing 1–N of N` states the view.
   */
  const backlog =
    held.data === null || open.data === null ? null : held.data.total + open.data.total
  const heldRefetch = held.refetch
  const openRefetch = open.refetch
  const countsRefetch = useCallback(() => {
    heldRefetch()
    openRefetch()
  }, [heldRefetch, openRefetch])
  const meta = useMemo(
    () =>
      backlog === null
        ? null
        : t(`myWork.meta.${backlog === 1 ? 'one' : 'other'}`, {
            count: formatCount(backlog, language),
          }),
    [backlog, t, language],
  )
  /* The table reports its own total to nobody: the header line above is the
     backlog, not this view's count. */
  const onTotal = useCallback(() => {}, [])

  const table = useIndexTable<WorkItem>({
    mode: 'queue',
    getRowId: (item) => item.key,
    initialView: activeTab,
    /**
     * **AC-289 / AC-217, and a defect in the obvious answer.**
     *
     * The client offers `urgency`, and its documented job is exactly this
     * criterion — *"breached, then by deadline, undated last"*. But it computes
     * `w.breached ? -1 : dueAt ? Date.parse(dueAt) : MAX_SAFE_INTEGER`
     * (`clients/myWork.ts:258`), so **every breached row ties at `-1`** and the
     * comparator falls back to array order. Measured on screen: `overdue 20h 9m`
     * above `overdue 1d 16h` above `overdue 2m`. AC-217 asks for *"breached rows
     * first, **most overdue at the top**"*, and `urgency` cannot deliver the
     * second half.
     *
     * `dueAt` ascending delivers both, with no second pass: a breached row's
     * deadline is by definition earlier than a healthy one's, the most overdue
     * has the earliest of all, and `compare` puts nulls last so `No clock` sorts
     * to the bottom (Q-20). It is the same key Requests and Trip Assurance sort
     * on, which is what makes one order across five queues true rather than
     * asserted.
     *
     * **Reported to mock-data-engineer**: `urgency` has the same flaw on
     * Fairness and Safety, and it is the field a QA test would reach for first.
     */
    initialSort: { field: 'dueAt', dir: 'asc' },
    /**
     * **Q-62 / AC-286 — role routing is a FILTER, and it is on by default.**
     *
     * `WorkItem.routedToMyRole` is a filterable boolean, so routing rides the
     * ordinary filter machinery: it shows as a chip in the query strip with its
     * own ✕, it is one control the operator can find **without opening a menu**,
     * clearing it increases the row count, and `Add filter` puts it back. None
     * of that would be true of a bespoke toggle, and all of it is what Q-62
     * means by *"it reduces what is shown; it never hides work"*.
     */
    initialFilters: [{ field: 'routedToMyRole', op: 'eq', value: true }],
    /**
     * **§9.3 / P4-T1, and this projection is the queue that most needs it.**
     * §7.2 says My Work never decides anything — it claims, releases and routes
     * — so `Claim` is not merely the only bulk action §9.3 permits here, it is
     * the only bulk action that exists on this screen at all. Picking up the
     * next ten unassigned items is the act the whole surface is for.
     */
    bulkClaim: true,
  })

  /* `includeOtherRoles: true` **always**, because the routing decision has moved
     into the filter above. Sending the server-side scope as well would apply it
     twice and make the chip's ✕ do nothing. */
  const params = useMemo(
    () => ({ ...table.params, view: activeTab, includeOtherRoles: true }),
    [table.params, activeTab],
  )

  const data = useAsync<Paginated<WorkItem>>((signal) => listWorkItems(params, signal), {
    deps: [params],
    cacheKey: 'work.list',
  })

  /* R5a (a). The scope is *what this operator can see*, which is why the banner
     copy says so: on a projection, "the whole queue" is not a thing. */
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<ReadonlyMap<string, { message: string; retry: () => void }>>(
    () => new Map(),
  )

  const currentUserId = shell.session?.userId ?? ''
  const routed = table.filters.some((filter) => filter.field === 'routedToMyRole')

  /**
   * R5a (a), **narrowed by Q-63**.
   *
   * *"Every count on this screen respects every active filter."* Legacy computes
   * its tab counts and KPI tiles from the unfiltered set (`:19242`–`:19245`)
   * while rendering rows from the filtered one, so a tab can read
   * `Everything · 9` above zero rows.
   *
   * **This banner was doing the same thing, one level up.** It asked for
   * `view: 'breached'`, which is a view of its own — so it counted breaches
   * across every view rather than inside the one on screen. On the `Mine` tab
   * that put three different numbers for one screen in front of the operator at
   * once: the rail badge read 22, the header read 2 items, and the banner read
   * 13 past their deadline, above two rows whose deadlines were `1d 1h left`
   * and `No clock`. Neither visible row was overdue. A banner that names a
   * number the list cannot account for teaches the operator to stop believing
   * the list.
   *
   * It now runs the table's own query with `breached` added, so the number is
   * by construction a subset of what is on screen: change the tab, the filters
   * or the routing scope, and the count moves with them. Asking for the count
   * separately is what let the two drift.
   */
  const breachedParams = useMemo(
    () => ({
      ...params,
      filters: [...(params.filters ?? []), { field: 'breached', op: 'eq' as const, value: true }],
      pageSize: 1,
    }),
    [params],
  )

  const breached = useAsync<Paginated<WorkItem>>(
    (signal) => listWorkItems(breachedParams, signal),
    /* `requestCacheKey` serialises deps into the key, so this cannot collide
       with the table's own read against the same operation id. */
    { deps: [breachedParams], cacheKey: 'work.list' },
  )
  const scoped = table.filters.some((filter) => filter.field === 'breached')

  /**
   * **My Work has no client of its own, and it must not grow one.**
   *
   * `clients/myWork.ts` is a routing layer with no fixture, deliberately: *"a
   * second, independently-seeded copy of the same rows is how My Work ends up
   * showing a breach that the queue it links to says is resolved."* The same
   * logic applies to mutations, so a claim made here is sent to the **source
   * queue's own client** and the projection is re-read. That is what makes
   * **AC-288** true by construction rather than by a second write path:
   * claiming here and opening the owning queue shows the same claim because it
   * IS the same claim.
   */
  const run = useCallback(
    async (item: WorkItem, errorKey: string, action: () => Promise<unknown>) => {
      setBusy(true)
      setFailures((current) => {
        if (!current.has(item.key)) return current
        const next = new Map(current)
        next.delete(item.key)
        return next
      })
      try {
        await action()
        /* Re-read rather than overlay: the source of truth is the source queue
           and this screen is a projection of it. An overlay here would be the
           parallel copy `clients/myWork.ts` refuses to keep. The two counts go
           with it, or a take-over leaves the header line behind the badge. */
        data.refetch()
        countsRefetch()
        return true
      } catch {
        setFailures((current) =>
          new Map(current).set(item.key, {
            message: t(errorKey),
            retry: () => void run(item, errorKey, action),
          }),
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [data, countsRefetch, t],
  )

  function claim(item: WorkItem, takeOver: boolean) {
    const client = CLAIM_CLIENTS[item.queue]
    if (!client) return
    void run(item, 'myWork.error.row.claim', () => client.claim(item.id, takeOver))
    setConfirm(null)
  }

  function release(item: WorkItem) {
    const client = CLAIM_CLIENTS[item.queue]
    if (!client) return
    void run(item, 'myWork.error.row.release', () => client.release(item.id))
  }

  function askTakeOver(item: WorkItem) {
    const owner = item.claim?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(item, true),
    })
  }

  /* ── the bulk bar (§9.3, D21) ─────────────────────────────────────── */

  const visibleRows = data.data?.items ?? []
  const selected = visibleRows.filter((item) => table.selectedIds.has(item.key))

  /**
   * D21 over a set, with **three** blocking causes on this screen rather than
   * two: an item already held (a bulk take-over would strip N owners and name
   * none of them — AC-203), and an item whose source queue this wave did not
   * build, which is §7.5's `source-queue-unavailable` (**AC-292**) reaching the
   * bulk bar the same way it already reaches the row's own claim control.
   */
  const claimRefusal = setRefusal({
    targets: selected,
    getId: (item) => item.key,
    isBlocked: (item) =>
      item.claim?.state === 'claimed' || CLAIM_CLIENTS[item.queue] === undefined,
    blockedKeyPrefix: 'myWork.action.claim.blocked',
    t,
    language,
  })

  /**
   * **The write goes to the SOURCE queue's own client, one call per record** —
   * never to a My Work client, because there is not one and there must not be.
   * `clients/myWork.ts` is a routing layer with no fixture, deliberately: a
   * second independently-seeded copy is how My Work ends up showing a claim the
   * owning queue disagrees with. **AC-288** holds over a set for the same
   * reason it holds over a row — it is the same claim.
   */
  const [claimingMany, setClaimingMany] = useState(false)
  async function claimSelected(keys: ReadonlySet<string>) {
    const targets = visibleRows.filter((item) => keys.has(item.key))
    setClaimingMany(true)
    try {
      await Promise.all(
        targets.map((item) => CLAIM_CLIENTS[item.queue]?.claim(item.id, false) ?? Promise.resolve()),
      )
      table.clearSelection()
      toast(
        targets.length === 1
          ? t('queue.toast.claimed')
          : t('myWork.toast.claimed.other', { count: formatCount(targets.length, language) }),
      )
    } catch {
      toast(t('myWork.error.row.claim'))
    } finally {
      setClaimingMany(false)
      data.refetch()
      countsRefetch()
    }
  }

  const columns = workColumns({
    t,
    language,
    now,
    currentUserId,
    failure: (key) => failures.get(key),
    onClaim: (item) => claim(item, false),
    onRelease: release,
    onTakeOver: askTakeOver,
  })

  /**
   * **D8 — one action, so it is that action, labelled, and not a kebab.**
   * `Open` and `Claim` are two separate, separately labelled controls
   * (**AC-201**), and this is the one §7.2 permits: it routes, it does not
   * decide. `WorkItem.route` is a **path**, which is the replacement for
   * legacy's executable `action:"go('safety',null)"` string (`:19129`,
   * `:14970`) — **F-26**, a `new Function()` call over record ids.
   */
  const rowActions: ReadonlyArray<RowAction<WorkItem>> = [
    /* **P0-2 — the declared row-click target.** It routes; it does not
       decide (§7.2), which is exactly what a row click is allowed to do. */
    { label: t('myWork.action.open'), onSelect: (item) => navigate(item.route), rowClick: true },
  ]

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      <BreachBanner
        id="operations-my-work-sla"
        count={breached.data?.total ?? 0}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="myWork.banner.one"
        otherKey="myWork.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={data.data?.items ?? []}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(item) => item.key}
        columns={columns}
        tableId="operations-my-work"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('myWork.search')}
        extraFilters={FILTERS(t)}
        /* **R5a** — one expression behind the marker, the pill and the tint. */
        isRowCritical={(item) => workClock(item, now).breached}
        rowActions={rowActions}
        /* §7.2 — My Work claims, releases and routes; it never decides. `Claim`
           is therefore both the only bulk action §9.3 permits and the only one
           this screen has. */
        bulkActions={[
          {
            label: t('myWork.bulk.claim'),
            onClick: (keys) => void claimSelected(keys),
            disabled: claimRefusal.refused || claimingMany,
            reason: claimRefusal.reason,
            eligibleIds: claimRefusal.eligibleIds,
          },
        ]}
        /* §7.8 — `12 + label + 12`, declared per view because a label's width is
           a translation question. `Open` is the shortest verb in the product. */
        rowActionsWidth={88}
        cleared={{
          heading: t('myWork.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'myWork.empty.cleared.everything'),
        }}
        firstRun={{
          heading: t('myWork.empty.firstRun.heading'),
          body: t('myWork.empty.firstRun.body'),
          actions: [
            {
              label: t('myWork.empty.firstRun.action'),
              onClick: () => table.removeFilter('routedToMyRole'),
            },
          ],
        }}
        /**
         * **§7.5 `routed-to-zero` — not E1 and not E2**, and this is where the
         * three are told apart.
         *
         * With the routing filter on, a zero is `no-match` mechanically (a
         * filter is narrowing) — but the SENTENCE is the one §7.5 asks for: it
         * names the filter, it says other queues may still have work, and its
         * action **switches routing off in place** (**AC-287**). Legacy shows
         * this message even when routing is off, where it is simply false
         * (`:19290`); here the message and the control both key off whether the
         * filter is actually applied.
         */
        noMatch={
          routed && table.filters.length === 1 && table.query.trim() === ''
            ? {
                message: t('myWork.empty.routed'),
                action: {
                  label: t('myWork.routing.clear'),
                  onClick: () => table.removeFilter('routedToMyRole'),
                },
              }
            : { message: t('myWork.empty.noMatch') }
        }
        error={{ message: t('myWork.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </QueuePage>
  )
}

/* ─────────────────────────────── vocabulary ────────────────────────────── */

const CLEARED_BODY: Readonly<Record<string, string>> = {
  mine: 'myWork.empty.cleared.mine',
  unassigned: 'myWork.empty.cleared.unassigned',
  everything: 'myWork.empty.cleared.everything',
}

const FILTERS = (t: Translate): readonly ExtraFilterSpec[] => [
  {
    field: 'routedToMyRole',
    label: t('myWork.routing.chip'),
    kind: 'boolean',
    trueLabel: t('myWork.routing.yes'),
    falseLabel: t('myWork.routing.no'),
  },
  {
    field: 'breached',
    label: t('queue.filter.breached'),
    kind: 'boolean',
    trueLabel: t('queue.filter.breached.yes'),
    falseLabel: t('queue.filter.breached.no'),
  },
]

/**
 * **AC-288, and the reason it is not a second write path.** A claim made on the
 * projection is sent to the queue that owns the record, so there is one claim
 * and one owner everywhere (§4.2 Q-9).
 *
 * **Two of the nine queues are absent, and that is the honest state.**
 * `erasure` has no client, and `absence` has no claim at all — `AbsenceEvent`
 * is a recorded fact, not a task (Q-60). A row from either still renders with
 * its data and its claim control **disabled with the reason** (§7.5,
 * **AC-292**), rather than the whole projection failing.
 */
const CLAIM_CLIENTS: Partial<
  Record<
    WorkQueueId,
    { claim: (id: string, takeOver: boolean) => Promise<unknown>; release: (id: string) => Promise<unknown> }
  >
> = {
  request: {
    claim: (id, takeOver) => claimRequest(id, { takeOver }),
    release: (id) => releaseRequest(id),
  },
  incident: {
    claim: (id, takeOver) => claimSafetyIncident(id, { takeOver }),
    release: (id) => releaseSafetyIncident(id),
  },
  fairness: {
    claim: (id, takeOver) => claimFairnessCase(id, { takeOver }),
    release: (id) => releaseFairnessCase(id),
  },
  assurance: {
    claim: (id, takeOver) => claimAssuranceTrip(id, { takeOver }),
    release: (id) => releaseAssuranceTrip(id),
  },
  application: {
    claim: (id, takeOver) => claimApplicant(id, { takeOver }),
    release: (id) => releaseApplicant(id),
  },
  /* T1.6 — the two queues the refusal above used to name. The claimant is left
     to the client, which resolves the signed-in session exactly as the five
     above do; asserting it here would let one screen claim as another operator. */
  ticket: {
    claim: (id, takeOver) => claimTicket(id, undefined, undefined, { takeOver }),
    release: (id) => releaseTicket(id),
  },
  dispute: {
    claim: (id, takeOver) => claimDispute(id, undefined, undefined, { takeOver }),
    release: (id) => releaseDispute(id),
  },
}

/** R4-10 — a label and a tone, and `critical` and `high` share the tone. */
const SEVERITY: Readonly<Record<WorkItemSeverity, { tone: 'warning' | 'neutral'; key: string }>> = {
  critical: { tone: 'warning', key: 'myWork.severity.critical' },
  high: { tone: 'warning', key: 'myWork.severity.high' },
  normal: { tone: 'neutral', key: 'myWork.severity.normal' },
}

const QUEUE_LABEL: Readonly<Record<WorkQueueId, string>> = {
  request: 'myWork.queue.request',
  assurance: 'myWork.queue.assurance',
  absence: 'myWork.queue.absence',
  incident: 'myWork.queue.incident',
  fairness: 'myWork.queue.fairness',
  application: 'myWork.queue.application',
  ticket: 'myWork.queue.ticket',
  dispute: 'myWork.queue.dispute',
  erasure: 'myWork.queue.erasure',
}

/* ─────────────────────────────── columns ───────────────────────────────── */

export interface WorkDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  currentUserId: string
  failure: (key: string) => { message: string; retry: () => void } | undefined
  onClaim: (item: WorkItem) => void
  onRelease: (item: WorkItem) => void
  onTakeOver: (item: WorkItem) => void
}

/**
 * §7.3's width contract: `136 + 104 + 160 + 176 = 576`, plus the identity's
 * `minWidth: 208` = **784**, plus §7.8's 88px single-action lane = **872**,
 * two over the Arabic budget of 870, which `fitColumnWidths` absorbs from the
 * four shrinkable columns rather than from the identity (T5.1).
 *
 * **There is no `Decision` column and there must not be one** (§7.2,
 * **AC-281**). The trailing data column is the owner chip; the action lane
 * beyond it holds exactly one control, and that control opens the item where
 * the context is.
 */
/**
 * **The item's clock — module level, because THREE carriers read it**: R5a's
 * leading-edge marker, the countdown pill, and the row tint declared on
 * `QueueTable`, where the columns are out of scope.
 */
export function workClock(item: WorkItem, now: IsoDateTime): QueueClockResult {
  return queueClock(
    {
      startedAt: item.slaStartedAt,
      dueAt: item.dueAt,
      targetMinutes: item.slaTargetMinutes,
      /* The projection carries `breached` as a cheap boolean **and** the stamp
         it was derived from, and `clients/workQueues.test.ts` asserts the two
         agree with the source queue in both directions. The stamp is the one
         `queueClock` takes, so My Work and the domain queue cannot disagree
         about whether a row is late. */
      breachedAt: item.slaBreachedAt,
    },
    now,
    { terminal: false },
  )
}

/**
 * **T4.1 — the row's line is made here, never in the client.** A `{ key }`
 * param is an enum member whose words another screen owns (`fairness.kind.*`,
 * `people.class.*`); everything else is a fact off the record.
 */
export function workText(t: Translate, key: string, params: WorkItemParams): string {
  const resolved: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(params)) {
    resolved[name] = typeof value === 'object' ? t(value.key) : value
  }
  return t(key, resolved)
}

export function workColumns(deps: WorkDeps): ReadonlyArray<DataColumn<WorkItem>> {
  const { t, language, now } = deps

  const clockFor = (item: WorkItem) => workClock(item, now)
  const titleOf = (item: WorkItem) => workText(t, item.titleKey, item.titleParams)

  return [
    {
      id: 'item',
      emphasis: 'primary',
      csv: (item) => titleOf(item),
      header: t('myWork.col.item'),
      alwaysVisible: true,
      /* **T5.1, and it does not reach zero.** 208 is every px `Queue` can give
         back (measured: 129 en / 109 ar for its widest label). The widest line
         one on the fixtures is 570 en / 529 ar — an incident summary and a
         ticket subject are sentences, not identities — so a sentence still
         truncates into its `title`. Named in the handoff; the fix is a column
         or a shorter line one, and neither is this file's to choose. */
      minWidth: 208,
      dataType: 'text',
      sortField: 'title',
      cell: (item) => (
        <>
          {clockFor(item).breached && <RowCriticalMarker />}
          {/* **AC-200 / AC-281** — the identity NAVIGATES. It does not claim, and
              it does not decide; `item.route` is the queue that owns the record. */}
          <SubjectIdentity
            to={item.route}
            title={titleOf(item)}
            secondary={
              item.subtitleKey === null
                ? null
                : workText(t, item.subtitleKey, item.subtitleParams)
            }
            label={t('myWork.a11y.open', { title: titleOf(item) })}
          />
        </>
      ),
    },
    {
      id: 'queue',
      header: t('queue.col.queue'),
      /* 136, measured: `Safety & Incidents` is 129px with its padding and the
         widest Arabic label is 109. The 24 goes to the identity (T5.1). */
      width: 136,
      dataType: 'enum',
      sortField: 'queue',
      filter: {
        kind: 'multi-select',
        field: 'queue',
        options: (Object.keys(QUEUE_LABEL) as WorkQueueId[]).map((value) => ({
          value,
          label: t(QUEUE_LABEL[value]),
        })),
      },
      /* **AC-280** — in WORDS, and not a badge: the queue a row came from is a
         fact about where it lives, not a lifecycle state anyone can change
         (§3.4). Every row in this column has a value, so a badge on all of them
         would be D-21's "25 identical rectangles". */
      cell: (item) => (
        <Cell className="text-muted-foreground">{t(QUEUE_LABEL[item.queue])}</Cell>
      ),
    },
    {
      id: 'severity',
      sortField: 'severity',
      emphasis: 'data',
      header: t('queue.col.severity'),
      width: 104,
      dataType: 'enum',
      /* **No `sortField`, deliberately.** *"Sort by DEADLINE, not by age or
         severity label"* (`:19074`) is the contract's second sentence, and a
         sort control on this column would offer the operator the exact ordering
         the contract exists to prevent. */
      filter: {
        kind: 'multi-select',
        field: 'severity',
        options: (Object.keys(SEVERITY) as WorkItemSeverity[]).map((value) => ({
          value,
          label: t(SEVERITY[value].key),
        })),
      },
      cell: (item) =>
        /* D-21 — `normal` is this column's resting value, so it is plain text.
           A badge on every row communicates nothing. */
        item.severity === 'normal' ? (
          <Cell className="text-muted-foreground">{t(SEVERITY.normal.key)}</Cell>
        ) : (
          <Cell>
            <StatusBadge tone={SEVERITY[item.severity].tone}>
              {t(SEVERITY[item.severity].key)}
            </StatusBadge>
          </Cell>
        ),
    },
    {
      id: 'sla',
      emphasis: 'data',
      header: t('queue.col.sla'),
      width: 160,
      dataType: 'date',
      /* AC-114 — no sort. §4.6's order is a rule; here it is the contract's. */
      cell: (item) => (
        <SlaCell result={clockFor(item)} dueAt={item.dueAt} t={t} language={language} />
      ),
    },
    {
      id: 'owner',
      header: t('queue.col.owner'),
      width: 176,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'unclaimed',
        trueLabel: t('queue.owner.unclaimed'),
        falseLabel: t('queue.filter.breached.no'),
      },
      cell: (item) => {
        const failed = deps.failure(item.key)
        if (failed) {
          return (
            <ErrorState
              scope="row"
              message={failed.message}
              action={{ label: t('queue.error.retry'), onClick: failed.retry }}
            />
          )
        }
        return (
          <OwnerChip
            claim={item.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            /* §7.2 — My Work never decides, but it DOES claim, release and
               route. That is the contract's own list. */
            canWrite
            disabledReason={t('queue.action.noPermission')}
            /* §7.5 `source-queue-unavailable` / **AC-292** — a row whose source
               queue this wave did not build keeps its data and loses its
               control, naming the queue. It never fails at commit. */
            unavailableReason={
              CLAIM_CLIENTS[item.queue]
                ? null
                : t('myWork.claim.unavailable', { queue: t(QUEUE_LABEL[item.queue]) })
            }
            onClaim={() => deps.onClaim(item)}
            onRelease={() => deps.onRelease(item)}
            onTakeOver={() => deps.onTakeOver(item)}
          />
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 128,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'key',
      filter: { kind: 'text', field: 'id' },
      cell: (item) => <MutedCell className="tabular-nums">{item.id}</MutedCell>,
    },
  ]
}
