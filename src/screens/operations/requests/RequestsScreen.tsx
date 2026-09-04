/**
 * **Operations › Requests** — merge **M3**, `requests` + `requests-sub-all` +
 * `requests-instant-all`. Pattern **P8**. `specs/02-work-queues.md` §5.
 *
 * §5.1 names the three things that make this queue different from the other
 * four, and each one is visible in the code below:
 *
 * **Two item types on one queue, and they are not variants of each other.** An
 * instant ride request is matched automatically by the tick engine and ops
 * intervenes only on breach; a subscription request is matched manually against
 * a payment authorisation hold. Different clocks (3 minutes vs 2 hours),
 * different money consequences, different definitions of "resolved". The merge
 * is right — the operator is answering one question, *who is waiting for
 * service* — but **the row is not one row**, which is why `Type` is a visible
 * column at the front of the table and not a filter you have to go looking for
 * (**AC-240**).
 *
 * **This is the only queue where money moves on disposition.** Assigning a
 * captain to a subscription request captures the rider's authorisation hold.
 * That is why `Assign captain` confirms on the subscription channel with a
 * different sentence from the instant one (**AC-247**), and it is why the
 * confirmation says *"this cannot be undone from here"* rather than offering an
 * undo it cannot honour.
 *
 * **This is the only queue whose items can resolve themselves.** An instant
 * request the tick engine matches leaves without an operator touching it, and
 * `Q-57` binds: a system disposition is still a disposition, so it **converts
 * the row in place and names the system as the actor**. Legacy splices the
 * record out of the array on both paths (`:11895`, `:12482`), which is why the
 * `Assigned` chip only ever matches fabricated seed rows.
 *
 * Rules applied
 *   §4.6 Q-32  the default view is **`pending`** — the open work — and not
 *              `All`. See `DEFAULT_VIEW`.
 *   §4.12 AC-217
 *              the order is the server's: `slaDueAt` ascending puts breached
 *              rows first, most overdue at the top, then remaining time
 *              ascending, then `No clock` last. The view never re-sorts rows it
 *              was given.
 *   §4.2 AC-209
 *              disposing of an item **claimed by someone else** takes the same
 *              take-over confirmation as claiming it — that is the moment a
 *              customer gets two answers.
 *   §4.2 AC-210
 *              an **unclaimed** item can be disposed of without claiming it
 *              first. Requiring a claim adds a click to the common case to
 *              solve a problem the claim already solves for the uncommon one.
 *   §4.5 AC-225
 *              the disposition set is closed and is §5.5's, narrowed to what
 *              the client can actually do — see the deviation note at
 *              `dispositions` below.
 *   §11.2 / AC-232
 *              every control is gated at RENDER, disabled in place with its
 *              reason. The systemic legacy defect (`:10237`, `:11876`) is that
 *              the operator clicks, waits, and is told no.
 *   R3         **no filled primary in a row.** §5.5 permits at most one; zero
 *              satisfies it and R3 at once, and a blue `Assign` repeated down
 *              twenty rows is what R3 exists to prevent.
 *   R18        nothing pulses, blinks or loops. `reqPulse` (`:145`) is not a
 *              critical signal (**Q-23**, **AC-224**).
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  assignRequest,
  claimRequest,
  expireRequest,
  listDrivers,
  listRequests,
  releaseRequest,
} from '@/data/clients'
import type {
  Driver,
  IsoDateTime,
  Paginated,
  RequestChannel,
  RequestStatus,
  RideRequest,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { toast } from 'sonner'
import { setRefusal } from '../bulkRefusal'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { ErrorState } from '@/components/ErrorState'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import type { DataColumn, ExtraFilterSpec } from '@/components/DataTable'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import {
  Absent,
  BreachBanner,
  Cell,
  DateCell,
  DecisionBadge,
  MutedCell,
  OwnerChip,
  SubjectIdentity,
  QueuePage,
  QueueTable,
  SlaCell,
  queueClock,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type QueueClockResult,
  type RowFailure,
} from '@/screens/queues'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { withFallback } from '../localCopy'
import { REQUESTS_EN } from './copy'

/**
 * **Q-32 — a work queue's default view is its open work, not `All`.**
 *
 * §5.3's rename has landed: the route table declares `needs-decision` and the
 * client's predicate is `searching ∪ offered ∪ no-drivers` (T3.2), so the
 * breach state the banner counts is now on the tab that opens by default.
 */
/**
 * The captain picker's query, hoisted to module scope so it can be a **cache
 * dependency**.
 *
 * `useAsync`'s contract (`useAsync.ts:66-72`): with a `cacheKey`, everything the
 * fetcher varies on must be in `deps`. `status` and `pageSize` were literals
 * inside the closure and therefore invisible to the key, so this read and every
 * other `deps: []` read of `drivers.list` in the app would have shared one entry
 * and the first one to resolve would have decided the page size for all of them.
 * Naming the query and depending on it puts those two values in the key, so a
 * site that asks a different question gets a different entry by construction.
 */
const ACTIVE_CAPTAINS_QUERY = { status: 'active', pageSize: 50 } as const

const DEFAULT_VIEW = 'needs-decision'

/** §5.5 — the statuses after which nothing is owed. `no-drivers` is NOT one. */
const TERMINAL: readonly RequestStatus[] = ['assigned', 'expired', 'cancelled']

function isTerminal(row: RideRequest): boolean {
  return TERMINAL.includes(row.status)
}

export function RequestsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const location = useLocation()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, REQUESTS_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()

  const { tabs, activeTab, selectTab } = useQueueViews(row, DEFAULT_VIEW, t)
  const { meta, onTotal } = useQueueMeta(t, language, 'requests.meta')

  const table = useIndexTable<RideRequest>({
    mode: 'queue',
    getRowId: (request) => request.id,
    initialView: activeTab,
    /* **AC-217**, expressed as the one thing the server can do: earliest
       deadline first. `compare` sorts nulls last, so `No clock` lands last
       without a second pass, and a breached row's deadline is by definition
       earlier than a healthy one's. */
    initialSort: { field: 'slaDueAt', dir: 'asc' },
    /**
     * **§9.3 / P4-T1 — the checkbox column, and the one command allowed behind
     * it.** A queue gets a selection **only** where every bulk action offered is
     * a claim or an assign; `bulkClaim: true` is how this file says so, and
     * without it `table.selectedIds` is not on the returned type at all. Bulk
     * disposition is forbidden outright (`DESIGN.md:5328`), which is why
     * `Assign captain` and `Close` stay row-only however many rows are ticked:
     * assigning a captain captures a rider's authorisation hold, and twelve
     * captures from one pill is exactly the act §9.3 exists to prevent.
     */
    bulkClaim: true,
  })

  /**
   * **The channel this sub-tab IS.** One screen, two sub-tabs — the same shape
   * `TripsScreen` uses for quick rides and subscription trips (D1b), and for
   * the same reason: the two queues share every column, every clock and every
   * lifecycle view, and differ only in which rows they are about.
   *
   * Read off `subTabId` rather than held in state, so it cannot drift from the
   * route: a reload, a back button and a deep link all land on the channel the
   * URL names.
   */
  const channel: RequestChannel =
    row?.subTabId === 'operations-subscription-requests' ? 'subscription' : 'instant'

  /* The view tab and the client's `view` param are the same value. Passing it
     through `params` rather than calling `setView` in an effect keeps the URL
     the single source: a reload lands on the same rows.

     `channel` rides with it as a pinned filter. It is NOT a view: a view is
     something the operator switches, and this is what the page is. */
  const params = useMemo(
    () => ({ ...table.params, view: activeTab, channel }),
    [table.params, activeTab, channel],
  )

  const data = useAsync<Paginated<RideRequest>>((signal) => listRequests(params, signal), {
    /* `params` carries the table query and the view tab. */
    deps: [params],
    cacheKey: 'requests.list',
  })

  /**
   * **R5a (a)** — the count is of the WHOLE queue and of **open work only**.
   *
   * `open` is the client's own boolean — `searching ∪ offered ∪ no-drivers` —
   * so this counts what is still owed and not what went past its deadline
   * before somebody answered it. **Q-18**: a stopped clock is not a backlog.
   */
  const breached = useAsync<Paginated<RideRequest>>(
    (signal) =>
      listRequests(
        {
          pageSize: 1,
          channel,
          filters: [
            { field: 'breached', op: 'eq', value: true },
            { field: 'open', op: 'eq', value: true },
          ],
        },
        signal,
      ),
    /* **Scoped to this tab's channel too.** The chip states how much of THIS
       queue is past its clock, and a count taken across both would send an
       operator hunting for breaches that are on the other tab. */
    { deps: [channel], cacheKey: 'requests.list' },
  )

  /* The captain picker's options. Read once: §5.2 calls for *the shared
     nearby-driver picker*, which does not exist as a component, so this is the
     honest reduction — active captains, named, chosen deliberately. Recorded in
     the handoff as a narrowing rather than a substitution. */
  const captains = useAsync<Paginated<Driver>>(
    (signal) => listDrivers(ACTIVE_CAPTAINS_QUERY, signal),
    { deps: [ACTIVE_CAPTAINS_QUERY], cacheKey: 'drivers.list' },
  )

  /* **P8-T1** — every id the page names, asked once each. */
  const hrefFor = useEntityLinks(
    useMemo(
      () => (data.data?.items ?? []).flatMap((r) => [r.riderId, r.offeredToDriverId, r.assignedDriverId]),
      [data.data?.items],
    ),
  )

  const actions = useRowActions<RideRequest>({ t })
  /** True while a bulk claim is in flight; the bar's command is not re-entrant. */
  const [claimingMany, setClaimingMany] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const rows = actions.rows(data.data?.items ?? [])
  const breachedCount = breached.data?.total ?? 0
  const scoped = table.filters.some((filter) => filter.field === 'breached')
  const canWrite = shell.permissions.permissions.includes('live_ops')
  const currentUserId = shell.session?.userId ?? ''

  /* ── ownership (§4.2) ─────────────────────────────────────────────── */

  function claim(request: RideRequest, takeOver: boolean) {
    void actions.run({
      id: request.id,
      errorKey: 'requests.error.row.claim',
      toastKey: takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      action: () => claimRequest(request.id, { takeOver }),
    })
    setConfirm(null)
  }

  function release(request: RideRequest) {
    void actions.run({
      id: request.id,
      errorKey: 'requests.error.row.release',
      toastKey: 'queue.toast.released',
      action: () => releaseRequest(request.id),
    })
  }

  /** **AC-203** — names the current owner and says they lose it unasked. */
  function askTakeOver(request: RideRequest) {
    const owner = request.claim?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(request, true),
    })
  }

  /**
   * **AC-209 / AC-210, in one function.**
   *
   * An unclaimed item is disposed of directly. An item held by **someone else**
   * takes the take-over confirmation first, and the take-over and the
   * disposition then run as one act — because that, not the claim, is the
   * moment a customer gets two answers. An item held by *me* needs nothing.
   */
  function guarded(request: RideRequest, proceed: () => void) {
    const held = request.claim?.state === 'claimed' ? request.claim : null
    if (held === null || held.ownerId === currentUserId) {
      proceed()
      return
    }
    setConfirm({
      title: t('queue.takeOver.decide.title', { name: held.ownerName }),
      body: t('queue.takeOver.decide.body', { name: held.ownerName }),
      confirmLabel: t('queue.takeOver.decide.confirm'),
      onConfirm: () => {
        setConfirm(null)
        proceed()
      },
    })
  }

  /* ── dispositions (§5.5) ──────────────────────────────────────────── */

  function askAssign(request: RideRequest) {
    guarded(request, () =>
      setConfirm({
        title: t('requests.assign.title', { id: request.id }),
        body: t(
          request.channel === 'subscription'
            ? 'requests.assign.body.subscription'
            : 'requests.assign.body.instant',
        ),
        confirmLabel: t('requests.assign.confirm'),
        choice: {
          label: t('requests.assign.choice'),
          help: t('requests.assign.choice.help'),
          message: t('requests.assign.choice.message'),
          placeholder: t('requests.assign.choice.placeholder'),
          emptyMessage: t('requests.assign.choice.empty'),
          options: (captains.data?.items ?? []).map((captain) => ({
            value: captain.id,
            label: captain.name,
            hint: captain.city,
          })),
        },
        onConfirm: ({ choice }) => {
          setConfirm(null)
          void actions.run({
            id: request.id,
            errorKey: 'requests.error.row.assign',
            toastKey: 'requests.toast.assigned',
            action: () => assignRequest(request.id, choice),
          })
        },
      }),
    )
  }

  function askExpire(request: RideRequest) {
    guarded(request, () =>
      setConfirm({
        title: t('requests.expire.title', { id: request.id }),
        body: t('requests.expire.body'),
        confirmLabel: t('requests.expire.confirm'),
        onConfirm: () => {
          setConfirm(null)
          void actions.run({
            id: request.id,
            errorKey: 'requests.error.row.expire',
            toastKey: 'requests.toast.expired',
            action: () => expireRequest(request.id),
          })
        },
      }),
    )
  }

  /* ── the bulk bar (§9.3, D21) ─────────────────────────────────────── */

  /** The selection as RECORDS, which is what the predicate takes. */
  const selected = rows.filter((request) => table.selectedIds.has(request.id))

  /**
   * **D21 over a set.** Refused if ANY selected request would be refused on its
   * own row, in one of three sentences, with the permission refusal first.
   *
   * A row already held by somebody is **blocked, not taken over**: AC-203 makes
   * a take-over a confirmed act that NAMES the operator losing the item, and
   * over a set it would strip N owners and name none of them. A decided row has
   * nothing left to claim. Both are `.blocked`, and `Select only the N
   * eligible` is how the operator gets past them in one click.
   */
  const claimRefusal = setRefusal({
    targets: selected,
    getId: (request) => request.id,
    isBlocked: (request) => isTerminal(request) || request.claim?.state === 'claimed',
    roleReason: canWrite ? null : t('requests.action.noPermission'),
    blockedKeyPrefix: 'requests.action.claim.blocked',
    t,
    language,
  })

  /**
   * **Every bulk action reaches the data layer.** One `claimRequest` per
   * record — the same call the row's own `Claim` makes, so the projection, the
   * queue and My Work cannot disagree about who holds what. A bulk action that
   * only fired a toast would be worse than none.
   */
  async function claimSelected(ids: ReadonlySet<string>) {
    setClaimingMany(true)
    try {
      await Promise.all([...ids].map((id) => claimRequest(id, { takeOver: false })))
      table.clearSelection()
      toast(
        ids.size === 1
          ? t('queue.toast.claimed')
          : t('requests.toast.claimed.other', { count: formatCount(ids.size, language) }),
      )
    } catch {
      toast(t('requests.error.row.claim'))
    } finally {
      setClaimingMany(false)
      data.refetch()
    }
  }

  const columns = requestColumns({
    t,
    language,
    now,
    canWrite,
    currentUserId,
    /* The overlay for any id this screen names. It is handed the REQUEST's own
       id by the identity cell now, and a captain's or a rider's by the columns
       that name one — the function is about `?entity=`, not about a kind. */
    profileHref: (id) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    /* **P8-T1 — resolution is ASKED, not assumed.** A captain the resolver
       cannot find renders as text with its reason rather than as a link into
       the overlay's own not-found state. */
    hrefFor,
    failure: actions.failure,
    onClaim: (request) => claim(request, false),
    onRelease: release,
    onTakeOver: askTakeOver,
    onAssign: askAssign,
    onExpire: askExpire,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      {/* R5a (a) — ONE page-level critical banner, and R10: never two. */}
      <BreachBanner
        id="operations-requests-sla"
        count={breachedCount}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="requests.banner.one"
        otherKey="requests.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(request) => request.id}
        columns={columns}
        tableId="operations-requests"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('requests.search')}
        extraFilters={BREACH_FILTER(t)}
        /* **R5a** — one expression behind the marker, the pill and the tint. */
        isRowCritical={(row) => requestClock(row, now).breached}
        /* §9.3 — claims only. `Assign` and `Close` are dispositions and stay on
           the row, however many rows are ticked. */
        bulkActions={[
          {
            label: t('requests.bulk.claim'),
            onClick: (ids) => void claimSelected(ids),
            disabled: claimRefusal.refused || claimingMany,
            reason: claimRefusal.reason,
            /* D21's escape hatch — a narrowing of the SELECTION, not a partial
               apply. Empty when every selected request is blocked. */
            eligibleIds: claimRefusal.eligibleIds,
          },
        ]}
        cleared={{
          heading: t('requests.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'requests.empty.cleared.all'),
        }}
        /* §4.7 Q-37 — E3 is unreachable on this queue: requests arrive from the
           system continuously. It collapses into E1, so `emptyKind` is never
           `first-run` here and this copy never renders. It is supplied because
           the type requires it, which is what stops an empty state being a TODO. */
        firstRun={{
          heading: t('requests.empty.firstRun.heading'),
          body: t('requests.empty.firstRun.body'),
          actions: [
            {
              label: t('requests.empty.firstRun.action'),
              onClick: () => selectTab('all'),
            },
          ],
        }}
        noMatch={{ message: t('requests.empty.noMatch') }}
        error={{ message: t('requests.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/**
 * §4.7 **E1** — one sentence naming **the scope that is clear**, per view.
 * Q-36: an operator who has just cleared the Requests queue must not be shown
 * an illustration telling them no requests exist.
 */
const CLEARED_BODY: Readonly<Record<string, string>> = {
  all: 'requests.empty.cleared.all',
  instant: 'requests.empty.cleared.instant',
  subscription: 'requests.empty.cleared.subscription',
  'needs-decision': 'requests.empty.cleared.needsDecision',
  assigned: 'requests.empty.cleared.assigned',
  expired: 'requests.empty.cleared.expired',
}

/**
 * The breach scope, as a **filter** rather than a view.
 *
 * Three things follow from that choice and all three are acceptance criteria: it
 * shows as a chip in the query strip so it is clearable from inside the queue
 * without a reload (**AC-235**, **AC-325**); it makes `table.isFiltered` true so
 * the resulting zero renders the no-match sentence rather than the
 * cleared-queue one (**AC-234**); and its label says **`Past deadline`**, not
 * `Breached`, because the client's `breached` predicate is the stamp on every
 * row including decided ones — **Q-18** requires the wider audit set to say so
 * in its own label.
 */
const BREACH_FILTER = (t: Translate): readonly ExtraFilterSpec[] => [
  {
    field: 'breached',
    label: t('queue.filter.breached'),
    kind: 'boolean',
    trueLabel: t('queue.filter.breached.yes'),
    falseLabel: t('queue.filter.breached.no'),
  },
]

/* ─────────────────────────────── columns ─────────────────────────────── */

export interface ColumnDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  profileHref: (id: string) => string
  /** **P8-T1** — `null` when the id names nothing this console can open. */
  hrefFor: (id: string | null | undefined) => string | null
  failure: (id: string) => RowFailure | undefined
  onClaim: (row: RideRequest) => void
  onRelease: (row: RideRequest) => void
  onTakeOver: (row: RideRequest) => void
  onAssign: (row: RideRequest) => void
  onExpire: (row: RideRequest) => void
}

/** R7 tones. **No red badge** (R5a): `no-drivers` is `warning`, not red. */
const STATUS: Readonly<Record<RequestStatus, { tone: 'success' | 'warning' | 'info' | 'neutral' | 'new'; key: string }>> = {
  searching: { tone: 'info', key: 'requests.status.searching' },
  offered: { tone: 'new', key: 'requests.status.offered' },
  assigned: { tone: 'success', key: 'requests.status.assigned' },
  'no-drivers': { tone: 'warning', key: 'requests.status.noDrivers' },
  expired: { tone: 'neutral', key: 'requests.status.expired' },
  cancelled: { tone: 'neutral', key: 'requests.status.cancelled' },
}

/**
 * §7.3's width contract, for this view:
 * `104 + 104 + 136 + 176 + 176 = 696`, plus the identity's `minWidth: 168`
 * = **864**, inside the Arabic budget of 870 and the English one of 910.
 *
 * **136 on `Deadline` is measured too.** `overdue 12h 11m` inside an 11/600
 * badge is ~107px, and 120 clipped it to `overdue 12h 11r` — a countdown a
 * reader cannot tell has been cut, which is §7.3 rule 5's hazard arriving
 * through a column the rule does not name. The 16 came off the identity's
 * floor, which has 226px of residual at 1280 and 188 in Arabic.
 * The trailing visible column is `enum`, so §7.3 rule 5 holds — no `money` and
 * no `id` at the end, where a truncation reads as a different valid value.
 *
 * **`Owner` at 176 is measured, and it is the number all five wave-2 queues
 * share.** The chip's widest state is not `Unclaimed` — it is **`Yours · 16m`
 * beside `Release`**, which is ~84 + 64 + a 6px gap + the cell's own 24 = 178.
 * At 140 the chip clipped to `Unclaimec`; at 160 the duration clipped to
 * `16n`. One number across five queues, so an operator moving between them
 * finds the same control in the same place.
 */
/**
 * **The request's clock — module level, because THREE carriers read it**: R5a's
 * leading-edge marker, the countdown pill, and the row tint declared on
 * `QueueTable`, where the columns are out of scope. `isTerminal` is part of the
 * expression, not a detail of the marker: a request decided inside its window
 * is not late and must not be tinted.
 */
export function requestClock(row: RideRequest, now: IsoDateTime): QueueClockResult {
  return queueClock(
    {
      startedAt: row.slaStartedAt,
      dueAt: row.slaDueAt,
      targetMinutes: row.slaTargetMinutes,
      breachedAt: row.slaBreachedAt,
    },
    now,
    { terminal: isTerminal(row) },
  )
}

export function requestColumns(deps: ColumnDeps): ReadonlyArray<DataColumn<RideRequest>> {
  const { t, language, now } = deps

  const clockFor = (row: RideRequest): QueueClockResult => requestClock(row, now)

  return [
    {
      id: 'ride',
      emphasis: 'primary',
      csv: (row) => `${row.pickup} / ${row.destination}`,
      header: t('requests.col.ride'),
      /* AC-104 / AC-106 — the identity is implicitly pinned and R5a's marker
         rides it, which is what keeps a breached row's marker visible at every
         horizontal scroll offset. */
      alwaysVisible: true,
      minWidth: 168,
      dataType: 'text',
      /* Sorts by PICKUP, which is the half of the route the eye reads first and
         the half an operator groups by — six requests out of Al Sahafa are a
         supply problem in Al Sahafa. `pickup` is a scalar field on the row and
         the shape resolves it; the rendered two-line cell is not a field and
         could not be ordered as one. */
      sortField: 'pickup',
      cell: (row) => (
        <>
          {/* **R5a (b)** — 3px `--ev-red` on the row's leading edge, and only
              when the promise is broken and still owed (Q-17). At most ONE red
              carrier per row, and this is it. */}
          {clockFor(row).breached && <RowCriticalMarker />}
          {/**
           * **The row's subject is the RIDE, and this is where that changed.**
           *
           * It was an `Identity` — an avatar of the rider's initials, their
           * name on line one, the route demoted to the qualifier beneath — and
           * it opened `?entity=<riderId>`. So selecting the thing an operator
           * is deciding about produced a person's wallet balance and churn
           * risk: facts about a rider, on a surface that had been asked a
           * question about a journey. One rider may have three requests open,
           * and none of the three is answered by their record.
           *
           * `SubjectIdentity` is the cell for exactly this — *"a queue whose
           * identity is a sentence rather than a person"* — and dropping the
           * avatar is part of the fix rather than a side effect: a placeholder
           * circle beside `KAFD → Airport T5` is furniture depicting nobody.
           *
           * The rider is not lost. They are the qualifier on line two, they are
           * a labelled field in the sheet's Rider group, and that field is a
           * link back to their own record (`RequestPanels.riderHref`).
           */}
          <SubjectIdentity
            to={deps.profileHref(row.id)}
            /* One key, two named placeholders, and the Arabic entry carries
               `←`: §9.5 swaps a mirroring glyph at string-construction time,
               never with CSS. The sheet's own title is built from the same key
               for the same reason. */
            title={t('requests.route', {
              pickup: row.pickup,
              destination: row.destination,
            })}
            /* §7.7 — line 2 QUALIFIES line 1. Who is waiting on this ride. */
            secondary={row.riderName}
            label={t('requests.a11y.open', {
              pickup: row.pickup,
              destination: row.destination,
            })}
          />
        </>
      ),
    },
    {
      id: 'type',
      emphasis: 'data',
      header: t('requests.col.type'),
      /* 104 -> 128. The old measure was sized for an 11px BADGE LABEL, and with
         the badge gone `Subscription` truncated to `Subscripti…` at 14px —
         verified at 1512 in the browser, not reasoned about. A width derived
         from a chip does not survive the chip's removal unchanged. */
      width: 128,
      dataType: 'enum',
      sortField: 'channel',
      filter: {
        kind: 'select',
        field: 'channel',
        options: [
          { value: 'instant', label: t('requests.channel.instant') },
          { value: 'subscription', label: t('requests.channel.subscription') },
        ],
      },
      /* **AC-240** — the type is legible without opening the row, and it is a
         visible column rather than a filter, because §5.1's whole point is that
         these two are not variants of each other. */
      /**
       * **H7 — the badge budget, and this column was over it.** A default row
       * on this queue carried FOUR tone fills: type, status, SLA and owner.
       * `globals.css` states the rule — *"at most one tone-filled badge per
       * row, and it lives in the ONE status column"* — and the reason: colour
       * is a channel with a fixed capacity, so a fourth chip does not add a
       * fourth signal, it removes the first three.
       *
       * Type is the one to give up, and not by elimination.
       * `design/15-hierarchy-and-scannability.md` §2.1 names this queue's DATA
       * tier as *"**type** · clock · status"* — DATA is `--ev-ink`,
       * `--text-sm`, 400. So the type was already specified as ink text; the
       * badge was the thing that disagreed with the spec, and AC-240's
       * requirement (*"legible without opening the row"*) is a requirement on
       * the COLUMN, which survives untouched. The precedent is on this
       * product's own `AssuranceScreen`, §9.1 / D-21: *"a value may be a badge
       * only if it is a lifecycle state the operator can act on"*. A channel
       * is neither a lifecycle nor actionable.
       */
      cell: (row) => (
        /* No colour class: the column already declares `emphasis: 'data'`, so
           `DataTable` gives the cell ink. Writing it again here would be a
           second source for one decision, and the tier is the one that
           survives a column being hidden or reordered. */
        <Cell>
          {t(
            row.channel === 'instant'
              ? 'requests.channel.instant'
              : 'requests.channel.subscription',
          )}
        </Cell>
      ),
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('queue.col.status'),
      width: 104,
      dataType: 'enum',
      sortField: 'status',
      filter: {
        kind: 'multi-select',
        field: 'status',
        options: (Object.keys(STATUS) as RequestStatus[]).map((value) => ({
          value,
          label: t(STATUS[value].key),
        })),
      },
      cell: (row) => (
        <Cell>
          <StatusBadge tone={STATUS[row.status].tone}>{t(STATUS[row.status].key)}</StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'sla',
      emphasis: 'data',
      header: t('queue.col.sla'),
      width: 136,
      dataType: 'date',
      /* **AC-114 — no `sortField`, deliberately.** §4.6's order is a RULE, not
         an operator preference. A sort control able to override it from this
         column would be a defect; the queue's order is set once in
         `initialSort` and the toolbar popover reads the same declaration. */
      cell: (row) =>
        isTerminal(row) ? (
          /* A decided item has no clock left to run. `—` is not-applicable,
             which is exactly what it is — never a synthetic deadline (Q-16). */
          <Absent />
        ) : (
          <SlaCell
            result={clockFor(row)}
            dueAt={row.slaDueAt}
            t={t}
            language={language}
          />
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
        falseLabel: t('queue.owner.heldBy', { name: '' }).trim(),
      },
      cell: (row) =>
        isTerminal(row) ? (
          <Absent />
        ) : (
          <OwnerChip
            claim={row.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={deps.canWrite}
            disabledReason={t('queue.action.noPermission')}
            onClaim={() => deps.onClaim(row)}
            onRelease={() => deps.onRelease(row)}
            onTakeOver={() => deps.onTakeOver(row)}
          />
        ),
    },
    {
      id: 'decision',
      header: t('queue.col.decision'),
      width: 176,
      dataType: 'enum',
      cell: (row) => {
        /* **AC-41** — the failure replaces THIS row's action cell and nothing
           else. No page banner, and every other row keeps working. */
        const failed = deps.failure(row.id)
        if (failed) {
          return (
            <ErrorState
              scope="row"
              message={failed.message}
              action={{ label: t('queue.error.retry'), onClick: failed.retry }}
            />
          )
        }

        /* **Q-26 / AC-226** — the decided row converts IN PLACE: its actions
           are replaced by a badge naming outcome, actor and time, and it does
           not vanish. **Q-57** — a SYSTEM disposition is still a disposition,
           and it names the system as the actor. */
        if (isTerminal(row)) {
          const outcome =
            row.status === 'assigned'
              ? 'requests.decided.assigned'
              : row.status === 'expired'
                ? 'requests.decided.expired'
                : 'requests.decided.cancelled'
          const decidedAt = row.assignedAt ?? row.expiredAt ?? row.cancelledAt
          return (
            <DecisionBadge
              outcome={t(outcome)}
              meta={
                decidedAt === null
                  ? null
                  : t(
                      row.assignedByUserName === null
                        ? 'queue.decided.bySystem'
                        : 'queue.decided.by',
                      {
                        actor: row.assignedByUserName ?? '',
                        date: formatDate(decidedAt, { style: 'day-month-time', language }),
                      },
                    )
              }
              /* **Q-18 / AC-222** — late, and NOT breached. The badge records
                 it and the row carries no marker: a stopped clock is not a
                 backlog. */
              late={row.slaBreachedAt !== null}
              lateLabel={t('queue.decided.late')}
            />
          )
        }

        /* **AC-246** — the offer is with the captain's device, not with ops.
           The cell is informational and offers no assign; legacy renders an
           assign control here that cannot work (`:9954`). */
        if (row.status === 'offered') {
          /* **P8-T1** — the offer names a captain, so the cell opens that
             captain. It used to be one muted sentence with the name buried in
             it, which is a cell that names an entity and reaches none: an
             operator asking *"who is this and why have they not answered"* had
             nowhere to go from here.

             The sentence and the link are separate elements rather than one
             interpolated string with an `<a>` inside it, because AC-75 forbids
             assembling a sentence around a component and a link inside a
             translated template cannot be moved by a translator. */
          if (row.offeredToDriverId !== null && row.offeredToDriverName !== null) {
            return (
              <Cell className="flex items-center gap-1 text-xs text-muted-foreground">
                <EntityLink
                  href={deps.hrefFor(row.offeredToDriverId)}
                  label={t('requests.a11y.openCaptain', { name: row.offeredToDriverName })}
                  reason={t('requests.entity.unresolved')}
                  reasonId={`req-${row.id}-captain-unresolved`}
                >
                  {row.offeredToDriverName}
                </EntityLink>
                <span className="truncate">{t('requests.offered.waiting')}</span>
              </Cell>
            )
          }
          const offered = t('requests.offered.unnamed')
          return <MutedCell title={offered}>{offered}</MutedCell>
        }

        /* §5.5's disposition set, narrowed to what the client offers. R3: no
           filled primary in a row. §11.2: gated at render, disabled in place. */
        return (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => deps.onAssign(row)}
              disabled={!deps.canWrite}
              title={
                deps.canWrite
                  ? t('requests.action.assign.help')
                  : t('queue.action.noPermission')
              }
            >
              {t('requests.action.assign')}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => deps.onExpire(row)}
              disabled={!deps.canWrite}
              title={
                deps.canWrite
                  ? t('requests.action.expire.help')
                  : t('queue.action.noPermission')
              }
            >
              {t('requests.action.expire')}
            </Button>
          </span>
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (row) => <MutedCell className="tabular-nums">{row.id}</MutedCell>,
    },
    {
      id: 'requested',
      header: t('requests.col.requested'),
      width: 128,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'requestedAt',
      cell: (row) => (
        <DateCell>{formatDate(row.requestedAt, { style: 'day-month-time', language })}</DateCell>
      ),
    },
    {
      id: 'plan',
      header: t('requests.col.plan'),
      width: 112,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'multi-select',
        field: 'planKey',
        options: [
          { value: 'weekly', label: t('requests.plan.weekly') },
          { value: 'biweekly', label: t('requests.plan.biweekly') },
          { value: 'monthly', label: t('requests.plan.monthly') },
        ],
      },
      /* §8.3.1 — an instant request HAS no plan. `—` is not-applicable, which
         is what this is; it is never a zero and never an empty cell. */
      cell: (row) =>
        row.planKey === null ? <Absent /> : <Cell>{t(`requests.plan.${row.planKey}`)}</Cell>,
    },
    {
      id: 'note',
      header: t('requests.col.note'),
      width: 200,
      dataType: 'text',
      defaultHidden: true,
      filter: { kind: 'text', field: 'notes' },
      /**
       * **AC-245** in its second reading: *on the row or in the row's detail*.
       * §7.3's budget has no room for a 200px free-text column at 1280, so the
       * carrier is the request sheet (`?entity=REQ-…`, `components/profile/
       * request`) and this column is `defaultHidden`.
       */
      cell: (row) => (row.notes === null ? <Absent /> : <Cell>{row.notes}</Cell>),
    },
    {
      id: 'class',
      header: t('requests.col.class'),
      width: 112,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'select',
        field: 'vehicleClass',
        options: [
          { value: 'Economy', label: t('requests.class.economy') },
          { value: 'Comfort', label: t('requests.class.comfort') },
        ],
      },
      cell: (row) => (
        <Cell>
          {t(row.vehicleClass === 'Economy' ? 'requests.class.economy' : 'requests.class.comfort')}
        </Cell>
      ),
    },
    {
      id: 'flags',
      header: t('requests.col.riderDetail'),
      width: 176,
      dataType: 'enum',
      defaultHidden: true,
      /**
       * The three facts about the rider that change how an operator answers,
       * and which legacy renders as three emoji chips (`:9906`, `:9909`).
       *
       * `REQ-501` is the fixture that matters: **a rider with no rating at
       * all** — *"the most common row in a growth month"*. §8.3.1 forbids `—`
       * here, because "no rating yet" is a KNOWN fact and not an absent one, so
       * it reads in words.
       */
      /**
       * **H7 — three tone fills in ONE cell, and the worst of the three was a
       * number.** The budget's fourth clause is explicit: *"a count is not a
       * status. `3 open` is H1's DATA tier — `--ev-ink`, `--text-sm`, tabular
       * figures — and never a chip. Most of the over-budget rows are counts
       * wearing badges."* A rider's rating is that sentence exactly.
       *
       * What the cell keeps, and why each:
       *   · the **rating** becomes DATA-tier text. Reading `4.8` off a chip and
       *     off ink are the same act; the chip only spent a colour.
       *   · **VIP** stays a badge because `new` is an OUTLINE, not a fifth fill
       *     (`ui/badge.tsx`, §12.1) — it costs no tone from the budget — and it
       *     qualifies the IDENTITY, which is clause 1's one licensed exception.
       *   · **Subscriber** demotes to clause 3's route: text in the tone's own
       *     foreground. `--ev-blue-dk` #1b51c4 measures 6.95 : 1 on white and
       *     **6.26 : 1 on `--ev-row-critical-emphasis`**, which is the ground a
       *     breached row on this queue takes — the case the clause warns is the
       *     one a reviewer forgets, because a badge used to bring its own
       *     ground with it. Neutral is the tone that fails there (4.35) and no
       *     neutral is demoted here.
       */
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="tabular-nums text-foreground">
            {row.riderRating === null
              ? t('requests.rider.newRating')
              : /* `formatCount` refuses a non-integer by design — *"a count is
                   a count"* — and there is no decimal formatter in
                   `src/lib/format/`. `toFixed(1)` matches the latin numbering
                   system every other number on the page uses. Requested from
                   utilities-engineer in the handoff rather than written here. */
                t('requests.rider.rating', { rating: row.riderRating.toFixed(1) })}
          </span>
          {row.vip && <StatusBadge tone="new">{t('requests.tag.vip')}</StatusBadge>}
          {row.riderHasPriorSubscription && (
            <span className="font-medium text-info-foreground">
              {t('requests.tag.subscriber')}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'pickup',
      sortField: 'pickup',
      header: t('requests.col.pickup'),
      width: 160,
      dataType: 'text',
      defaultHidden: true,
      filter: { kind: 'text', field: 'pickup' },
      cell: (row) => <Cell>{row.pickup}</Cell>,
    },
    {
      id: 'destination',
      sortField: 'destination',
      header: t('requests.col.destination'),
      width: 160,
      dataType: 'text',
      defaultHidden: true,
      filter: { kind: 'text', field: 'destination' },
      cell: (row) => <Cell>{row.destination}</Cell>,
    },
  ]
}
