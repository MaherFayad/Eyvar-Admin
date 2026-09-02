/**
 * **Operations › Trip Assurance** — merge **M6**, `readiness` + `coverage` +
 * `commitment`. Pattern **P8** (+ P5, pending **F-1**).
 * `specs/02-work-queues.md` §6.
 *
 * §6.1: *one question at three horizons — **will tomorrow's subscription trip
 * actually happen?*** Readiness watches the next hours, Coverage watches
 * structural exposure, Commitment watches the captain's nightly confirmation.
 * `PROPOSED-STRUCTURE.md` §13.1 R4 names the merge's risk — three pages into
 * one screen is dense — with a mitigation that **binds: views, not stacked
 * cards.** That is the whole architecture of this file: four views, four column
 * sets, one table, and no card ever stacked under another.
 *
 * **This is the widest queue in the product.** §6.4 lists seven item types
 * against the two the other queues carry, and §6.5's field list is the widest
 * in wave 2. What actually landed in `src/data` is **two resources**,
 * `AssuranceTrip` and `AbsenceEvent`, and that governs what this screen can
 * do — see the deviation ledger in `build/09-work-queues.md` and the handoff.
 *
 * **It is the only queue where the deadline is somebody else's event.** A
 * departing leg's clock is anchored to a departure time this console does not
 * control. Nothing here is *"we have N hours to respond"*; it is *"this trip
 * leaves at 07:30 and it is 06:55"*.
 *
 * **And it is the only queue where a breach cannot be undone.** A support
 * ticket answered late is answered. A subscription leg that departed without a
 * captain did not depart.
 *
 * Rules applied
 *   §6.3 / F-7 the `Departing next 24 h` view **actually filters**. Legacy's
 *              page copy promises "next 24 hours" and no time filter is ever
 *              applied (`:13008` sorts and never filters); the client's
 *              `departing-24h` predicate is a real window and this screen uses
 *              it rather than re-implementing one (**AC-260**).
 *   §6.4 Q-58 / AC-263
 *              **the readiness ladder is a reason, not a severity, and it is
 *              not the clock.** It is a COLUMN. A leg whose captain is
 *              unavailable but which departs in nine hours is a serious reason
 *              and is not late.
 *   §4.4 Q-22 / AC-275
 *              **no red row background.** Four legacy row tints do not ship;
 *              the only red on a row is the breach marker.
 *   §4.3 / Q-59 / AC-262
 *              a leg outside its clock window reads `No clock` and sorts last.
 *              `AssuranceTrip.slaTargetMinutes` is `null` on every row
 *              (**Q8-b**, open), so **no progress track renders on this queue
 *              at all** — inventing a start is the `/90` bug at `:11652`.
 *   §6.4 item 3 / AC-268
 *              the confirmation SOURCE is load-bearing and survives: `app`,
 *              `phone`/`whatsapp` and `assumed` are three different words with
 *              three different tones, because *"if the UI renders all three as
 *              a tick, an operator cannot tell a confirmed leg from one
 *              somebody decided to risk"*.
 *   §6.4 Q-60  **the absence counter is a column, not a queue.** `AbsenceEvent`
 *              carries no claim and no SLA — it is a recorded fact, not a task,
 *              and the task it generates is the appeal, which lives in Captain
 *              Fairness.
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  acknowledgeLeg,
  claimAssuranceTrip,
  listAbsences,
  listAssuranceTrips,
  listDrivers,
  offerBackup,
  releaseAssuranceTrip,
  waiveAbsence,
} from '@/data/clients'
import type {
  AbsenceEvent,
  AssuranceTrip,
  CaptainDepartureState,
  Driver,
  IsoDateTime,
  LegAckSource,
  Paginated,
  SubTabRoute,
} from '@/data/types'
import { toast } from 'sonner'
import { useAsync, useIndexTable } from '@/hooks'
import { setRefusal } from '../bulkRefusal'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import type { DataColumn, ExtraFilterSpec } from '@/components/DataTable'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import {
  BreachBanner,
  Cell,
  ConfirmDialog,
  DateCell,
  Identity,
  MutedCell,
  NumCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  SubjectIdentity,
  queueClock,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type ConfirmRequest,
  type QueueClockResult,
  type RowFailure,
} from '@/screens/queues'

/**
 * **Q-32 / §6.3** — the default is the ops manager's opening question
 * (foundation §3.6 M6): *what is departing in the next 24 hours?*
 *
 * It happens to agree with the route table's `isDefault` here, which is a
 * coincidence and not a reason: the queue's default is stated in this file
 * because §4.6 says a queue's default is its open work, not because index 0
 * happened to be right.
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

const DEFAULT_VIEW = 'departing-24h'
const VIEW_ABSENCES = 'absences'

export function AssuranceScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { tabs, activeTab, selectTab } = useQueueViews(row, DEFAULT_VIEW, t)

  /* §9.4 — **one mode at a time.** The absences view is a different RESOURCE
     with no claim and no clock (Q-60), so it is a different component and the
     switch unmounts the previous table. That is `AC-25`'s mechanism reused:
     nothing can survive a view change that should not. */
  return activeTab === VIEW_ABSENCES ? (
    <AbsencesView key={VIEW_ABSENCES} row={row} tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
  ) : (
    <LegsView key="legs" row={row} tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} t={t} dir={dir} language={language} />
  )
}

interface ViewProps {
  row: SubTabRoute
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
}

/* ─────────────────────────── the three leg views ───────────────────────── */

function LegsView({
  row,
  tabs,
  activeTab,
  onSelectTab,
  t,
  dir,
  language,
}: ViewProps & { t: Translate; dir: 'ltr' | 'rtl'; language: Language }) {
  const shell = useShell()
  const location = useLocation()
  const now = useNowIso()
  const { meta, onTotal } = useQueueMeta(t, language, 'assurance.meta.legs')

  const table = useIndexTable<AssuranceTrip>({
    mode: 'queue',
    getRowId: (trip) => trip.id,
    initialView: activeTab,
    /* **AC-217** — earliest deadline first, `No clock` last. `compare` sorts
       nulls last on `asc`, so Q-59's out-of-window legs land at the bottom
       without a second pass. */
    initialSort: { field: 'slaDueAt', dir: 'asc' },
    /**
     * **§9.3 / P4-T1.** A queue gets a checkbox column **only** where every
     * bulk action is a claim or an assign, and `bulkClaim: true` is how this
     * file declares it — without it `table.selectedIds` is not on the returned
     * type. `Confirm` and `Offer backup` are dispositions and stay row-only:
     * confirming twelve legs from one pill would attest to twelve phone calls
     * nobody made, and §6.4 requires a note *"so the risk has a name attached
     * to it"*.
     *
     * The **absences** view below declares no `bulkClaim` and therefore has no
     * checkbox, which is correct and is Q-60 rather than an omission: an
     * `AbsenceEvent` is a recorded fact with no claim and no clock.
     */
    bulkClaim: true,
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<AssuranceTrip>>((signal) => listAssuranceTrips(params, signal), {
    /* `params` carries the table query AND the view tab, so each sub-tab keys
       separately and switching back paints its own rows. */
    deps: [params],
    cacheKey: 'assurance.list',
  })

  /* R5a (a) — the whole queue, and the stamp. `AssuranceTrip` has no terminal
     status, so there is no "decided but late" set to exclude here: every row
     this counts is still owed. */
  const breached = useAsync<Paginated<AssuranceTrip>>(
    (signal) =>
      listAssuranceTrips(
        { pageSize: 1, filters: [{ field: 'breached', op: 'eq', value: true }] },
        signal,
      ),
    /* A constant one-row count query; `deps: []` serialises to `[]`, which the
       keyed read above (`[{...params}]`) can never collide with. */
    { deps: [], cacheKey: 'assurance.list' },
  )

  const captains = useAsync<Paginated<Driver>>(
    (signal) => listDrivers(ACTIVE_CAPTAINS_QUERY, signal),
    { deps: [ACTIVE_CAPTAINS_QUERY], cacheKey: 'drivers.list' },
  )

  /* **P8-T1** — every id the page names, asked once each. */
  const hrefFor = useEntityLinks(
    useMemo(
      () =>
        (data.data?.items ?? []).flatMap((trip) => [
          trip.subscriptionId,
          trip.riderId,
          trip.driverId,
        ]),
      [data.data?.items],
    ),
  )

  const actions = useRowActions<AssuranceTrip>({ t })
  /** True while a bulk claim is in flight; the bar's command is not re-entrant. */
  const [claimingMany, setClaimingMany] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const rows = actions.rows(data.data?.items ?? [])
  const scoped = table.filters.some((filter) => filter.field === 'breached')
  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')
  const currentUserId = shell.session?.userId ?? ''

  function claim(trip: AssuranceTrip, takeOver: boolean) {
    void actions.run({
      id: trip.id,
      errorKey: 'assurance.error.row.claim',
      toastKey: takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      action: () => claimAssuranceTrip(trip.id, { takeOver }),
    })
    setConfirm(null)
  }

  function askTakeOver(trip: AssuranceTrip) {
    const owner = trip.claim?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(trip, true),
    })
  }

  /** **AC-209 / AC-210** — see `RequestsScreen`; the rule is §4.2's, not this queue's. */
  function guarded(trip: AssuranceTrip, proceed: () => void) {
    const held = trip.claim?.state === 'claimed' ? trip.claim : null
    if (held === null || held.ownerId === currentUserId) return proceed()
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

  /**
   * **§6.4 item 3, and the one place a 422 is genuinely load-bearing.**
   *
   * `acknowledgeLeg` throws 422 `note_required` when the source is `assumed`
   * and no note is given, *"so the risk has a name attached to it"*. §10.4 says
   * the modal validates before the mutation, so the operator meets the rule
   * rather than the error — which is why the reason field is always present and
   * the source picker leads.
   *
   * **The reason field is required unconditionally here, and that is a
   * deliberate narrowing.** The client only requires it for `assumed`; making
   * it required for all four costs an operator one sentence on a phone
   * attestation and buys a record of who attested. Named as a narrowing in the
   * handoff, not a silent tightening.
   */
  function askConfirm(trip: AssuranceTrip) {
    guarded(trip, () =>
      setConfirm({
        title: t('assurance.confirm.title', { id: trip.id }),
        body: t('assurance.confirm.body'),
        confirmLabel: t('assurance.confirm.commit'),
        choice: {
          label: t('assurance.confirm.choice'),
          help: t('assurance.confirm.choice.help'),
          message: t('assurance.confirm.choice.message'),
          placeholder: t('assurance.confirm.choice.placeholder'),
          emptyMessage: t('assurance.confirm.choice.empty'),
          options: ACK_SOURCES.map((source) => ({
            value: source,
            label: t(ACK[source].key),
          })),
        },
        reason: {
          label: t('assurance.confirm.reason'),
          help: t('assurance.confirm.reason.help'),
          message: t('assurance.confirm.reason.message'),
        },
        onConfirm: ({ choice, reason }) => {
          setConfirm(null)
          void actions.run({
            id: trip.id,
            errorKey: 'assurance.error.row.confirm',
            toastKey: 'assurance.toast.confirmed',
            action: () => acknowledgeLeg(trip.id, choice as LegAckSource, reason),
          })
        },
      }),
    )
  }

  function askOffer(trip: AssuranceTrip) {
    guarded(trip, () =>
      setConfirm({
        title: t('assurance.offer.title', { id: trip.id }),
        /* Q-12's stated exception: the backup offer's deadline and its automatic
           action coincide, deliberately. The body says the window and says the
           leg is not covered until the backup answers — *"handing over is not
           accepting"* (`:18159`). */
        body: t('assurance.offer.body'),
        confirmLabel: t('assurance.offer.commit'),
        choice: {
          label: t('assurance.offer.choice'),
          help: t('assurance.offer.choice.help'),
          message: t('assurance.offer.choice.message'),
          placeholder: t('assurance.offer.choice.placeholder'),
          emptyMessage: t('assurance.offer.choice.empty'),
          options: (captains.data?.items ?? []).map((captain) => ({
            value: captain.id,
            label: captain.name,
            hint: captain.city,
          })),
        },
        onConfirm: ({ choice }) => {
          setConfirm(null)
          void actions.run({
            id: trip.id,
            errorKey: 'assurance.error.row.offer',
            toastKey: 'assurance.toast.offered',
            action: () => offerBackup(trip.id, choice),
          })
        },
      }),
    )
  }

  /* ── the bulk bar (§9.3, D21) ─────────────────────────────────────── */

  const selected = rows.filter((trip) => table.selectedIds.has(trip.id))

  /**
   * D21 over a set. A leg already held is **blocked, not taken over** —
   * AC-203's take-over names the operator losing it, and over a set it would
   * name none of them.
   */
  const claimRefusal = setRefusal({
    targets: selected,
    getId: (trip) => trip.id,
    isBlocked: (trip) => trip.claim?.state === 'claimed',
    roleReason: canWrite ? null : t('assurance.action.noPermission'),
    blockedKeyPrefix: 'assurance.action.claim.blocked',
    t,
    language,
  })

  /** One `claimAssuranceTrip` per record — the same call the row's own `Claim`
      makes, so the queue and My Work cannot disagree about who holds what. */
  async function claimSelected(ids: ReadonlySet<string>) {
    setClaimingMany(true)
    try {
      await Promise.all([...ids].map((id) => claimAssuranceTrip(id, { takeOver: false })))
      table.clearSelection()
      toast(
        ids.size === 1
          ? t('queue.toast.claimed')
          : t('assurance.toast.claimed.other', { count: formatCount(ids.size, language) }),
      )
    } catch {
      toast(t('assurance.error.row.claim'))
    } finally {
      setClaimingMany(false)
      data.refetch()
    }
  }

  const columns = legColumns(activeTab, {
    t,
    language,
    now,
    canWrite,
    currentUserId,
    profileHref: (id) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    /* **P8-T1 — resolution is ASKED, not assumed.** */
    hrefFor,
    failure: actions.failure,
    onClaim: (trip) => claim(trip, false),
    onRelease: (trip) =>
      void actions.run({
        id: trip.id,
        errorKey: 'assurance.error.row.release',
        toastKey: 'queue.toast.released',
        action: () => releaseAssuranceTrip(trip.id),
      }),
    onTakeOver: askTakeOver,
    onConfirm: askConfirm,
    onOffer: askOffer,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      <BreachBanner
        id="operations-assurance-sla"
        count={breached.data?.total ?? 0}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="assurance.banner.one"
        otherKey="assurance.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(trip) => trip.id}
        columns={columns}
        tableId="operations-assurance"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('assurance.search.legs')}
        extraFilters={BREACH_FILTER(t)}
        /* §9.3 — claims only. `Confirm` and `Offer backup` are dispositions and
           stay on the row. */
        bulkActions={[
          {
            label: t('assurance.bulk.claim'),
            onClick: (ids) => void claimSelected(ids),
            disabled: claimRefusal.refused || claimingMany,
            reason: claimRefusal.reason,
            eligibleIds: claimRefusal.eligibleIds,
          },
        ]}
        /* **AC-274** — each view's cleared sentence names THAT view's scope. */
        cleared={{
          heading: t('assurance.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'assurance.empty.cleared.all'),
        }}
        firstRun={{
          heading: t('assurance.empty.firstRun.heading'),
          body: t('assurance.empty.firstRun.body'),
          actions: [{ label: t('assurance.empty.firstRun.action'), onClick: () => onSelectTab(DEFAULT_VIEW) }],
        }}
        noMatch={{ message: t('assurance.empty.noMatch') }}
        error={{ message: t('assurance.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ────────────────────────── the absences view ──────────────────────────── */

/**
 * **Q-60 — the absence counter is a column, not a queue**, and this view is the
 * ledger behind it. `AbsenceEvent` has **no claim and no SLA**: it is a
 * recorded fact with a financial consequence, immutable once written, and the
 * unit of *work* it generates is the captain's appeal — which lives in Captain
 * Fairness and has both (§9).
 *
 * So this view carries no owner chip and no countdown, and that is the §4.1
 * admission test being applied rather than furniture being forgotten. It keeps
 * one disposition, `Waive`, because a waiver is a decision somebody makes here.
 *
 * **Empty by default, and that is the healthy state** — an empty strike ledger
 * means nobody has missed a committed leg. `useAbsenceHistory()` populates all
 * three tiers for QA.
 */
function AbsencesView({ row, tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const location = useLocation()
  const { t, dir, language } = shell.language
  const now = useNowIso()
  const { meta, onTotal } = useQueueMeta(t, language, 'assurance.meta.absences')

  const table = useIndexTable<AbsenceEvent>({
    mode: 'queue',
    getRowId: (event) => event.id,
    initialView: activeTab,
    /* No clock on this resource, so the order is the ledger's own: most recent
       first. Q-33's breached-first clause is vacuous where nothing has a
       deadline, and inventing one to satisfy the shape would be Q-16. */
    initialSort: { field: 'occurredAt', dir: 'desc' },
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<AbsenceEvent>>((signal) => listAbsences(params, signal), {
    deps: [params],
    cacheKey: 'assurance.absences',
  })

  const actions = useRowActions<AbsenceEvent>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  function askWaive(event: AbsenceEvent) {
    setConfirm({
      title: t('assurance.waive.title', { name: event.driverName }),
      /* **F-10, stated rather than reproduced.** `recordAbsence()` forfeits the
         captain's remaining plan earnings and writes no wallet, escrow or
         payout record (`10b` §17.7). §6.5 binds: the queue must not present a
         completed money action that did not happen, so the body says the
         forfeited earnings are **not returned from here**. */
      body: t('assurance.waive.body'),
      confirmLabel: t('assurance.waive.confirm'),
      reason: {
        label: t('assurance.waive.reason'),
        help: t('assurance.waive.reason.help'),
        message: t('assurance.waive.reason.message'),
      },
      onConfirm: ({ reason }) => {
        setConfirm(null)
        void actions.run({
          id: event.id,
          errorKey: 'assurance.error.row.waive',
          toastKey: 'assurance.toast.waived',
          action: () => waiveAbsence(event.id, reason),
        })
      },
    })
  }

  const columns = absenceColumns({
    t,
    language,
    canWrite,
    profileHref: (id) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    failure: actions.failure,
    onWaive: askWaive,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      {/* No breach banner: nothing on this resource has a deadline, so there is
          nothing to be past. R5a's part (a) is not optional where a breach can
          happen and is meaningless where one cannot. */}
      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={actions.rows(data.data?.items ?? [])}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(event) => event.id}
        columns={columns}
        tableId="operations-assurance"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('assurance.search.absences')}
        cleared={{
          heading: t('assurance.empty.cleared.heading'),
          body: t('assurance.empty.cleared.absences'),
        }}
        firstRun={{
          heading: t('assurance.empty.firstRun.heading'),
          body: t('assurance.empty.firstRun.body'),
          actions: [{ label: t('assurance.empty.firstRun.action'), onClick: () => onSelectTab(DEFAULT_VIEW) }],
        }}
        noMatch={{ message: t('assurance.empty.noMatch.absences') }}
        error={{ message: t('assurance.error.absences'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ─────────────────────────────── vocabulary ────────────────────────────── */

const CLEARED_BODY: Readonly<Record<string, string>> = {
  'departing-24h': 'assurance.empty.cleared.departing',
  'no-backup-captain': 'assurance.empty.cleared.noBackup',
  'awaiting-confirmation': 'assurance.empty.cleared.awaiting',
  absences: 'assurance.empty.cleared.absences',
}

const BREACH_FILTER = (t: Translate): readonly ExtraFilterSpec[] => [
  {
    field: 'breached',
    label: t('queue.filter.breached'),
    kind: 'boolean',
    trueLabel: t('queue.filter.breached.yes'),
    falseLabel: t('queue.filter.breached.no'),
  },
]

const ACK_SOURCES: readonly LegAckSource[] = ['app', 'phone', 'whatsapp', 'assumed']

/**
 * **AC-268 / §7.3 of `build/05`** — three acknowledgement weights that must not
 * all look like a tick. `strong` is the captain acting, `attested` is an
 * operator vouching under their own name, and `weak` is *"not a confirmation"*.
 * Three words and three tones; `assumed` is **`warning`**, because it is the
 * one that leaves risk on the table.
 */
const ACK: Readonly<Record<LegAckSource, { tone: 'success' | 'info' | 'warning'; key: string }>> = {
  app: { tone: 'success', key: 'assurance.ack.app' },
  phone: { tone: 'info', key: 'assurance.ack.phone' },
  whatsapp: { tone: 'info', key: 'assurance.ack.whatsapp' },
  assumed: { tone: 'warning', key: 'assurance.ack.assumed' },
}

const CAPTAIN_STATE: Readonly<
  Record<CaptainDepartureState, { tone: 'success' | 'neutral' | 'warning'; key: string }>
> = {
  moving: { tone: 'success', key: 'assurance.captain.moving' },
  'not-started': { tone: 'neutral', key: 'assurance.captain.notStarted' },
  unavailable: { tone: 'warning', key: 'assurance.captain.unavailable' },
}

/**
 * **Q-58 — the readiness ladder as a reason.** Six values, in the order an
 * operator triages them, and **not** a severity: `:8703` has no time condition,
 * so legacy paints a leg nine hours out in critical red. The clock is the
 * urgency; this is only what is wrong.
 */
function reasonKeyOf(trip: AssuranceTrip): string {
  if (trip.captainDepartureState === 'unavailable') return 'assurance.reason.captainUnavailable'
  if (!trip.backupEligible && trip.nearbyEligibleCount === 0) return 'assurance.reason.noBackup'
  if (trip.acknowledgement === null && !trip.autoHandedOff)
    return 'assurance.reason.awaitingConfirmation'
  if (!trip.riderConfirmed) return 'assurance.reason.riderUnconfirmed'
  if (trip.captainDepartureState === 'not-started' && trip.minutesToPickup !== null)
    return 'assurance.reason.captainNotMoving'
  return 'assurance.reason.onTrack'
}

/* ─────────────────────────────── columns ───────────────────────────────── */

export interface LegDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  profileHref: (id: string) => string
  /** **P8-T1** — `null` when the id names nothing this console can open. */
  hrefFor: (id: string | null | undefined) => string | null
  failure: (id: string) => RowFailure | undefined
  onClaim: (row: AssuranceTrip) => void
  onRelease: (row: AssuranceTrip) => void
  onTakeOver: (row: AssuranceTrip) => void
  onConfirm: (row: AssuranceTrip) => void
  onOffer: (row: AssuranceTrip) => void
}

/**
 * §7.3's width contract, per view — and **the reason the column sets differ by
 * view is M6's binding mitigation**, not economy: *"views, not stacked cards"*.
 * Seven item types across four views, with different columns per view, on one
 * table.
 *
 * ```
 * departing-24h         176 + 152 + 160 + 176 + 176 = 840
 * no-backup-captain     176 + 176 + 160 + 176 + 176 = 864
 * awaiting-confirmation 176 + 176 + 160 + 176 + 176 = 864
 * ```
 * Every one inside the Arabic budget of 870. The trailing visible column is
 * `enum` in all three, so §7.3 rule 5 holds.
 */
export function legColumns(view: string, deps: LegDeps): ReadonlyArray<DataColumn<AssuranceTrip>> {
  const { t, language, now } = deps

  const clockFor = (trip: AssuranceTrip): QueueClockResult =>
    queueClock(
      {
        startedAt: trip.slaStartedAt,
        dueAt: trip.slaDueAt,
        /* **`null` on every row, and it stays null.** Q8-b is open: the
           confirmation DEADLINE is a policy constant (21:00) but the window's
           START is undefined, so there is no denominator and no track. */
        targetMinutes: trip.slaTargetMinutes,
        breachedAt: trip.slaBreachedAt,
      },
      now,
      /* A leg has no terminal status in the data layer. `autoHandedOff` is the
         nearest thing — the system disposed of it — and F-8's `Departed`
         conversion has no field behind it. Recorded, not faked. */
      { terminal: false },
    )

  const identity: DataColumn<AssuranceTrip> = {
    id: 'leg',
    header: t('assurance.col.leg'),
    alwaysVisible: true,
    minWidth: 176,
    dataType: 'text',
    sortField: 'departsAt',
    cell: (trip) => (
      <>
        {clockFor(trip).breached && <RowCriticalMarker />}
        <SubjectIdentity
          to={deps.profileHref(trip.subscriptionId)}
          title={trip.route}
          /* §7.7 — the two facts an operator reads next: when it leaves, and
             who is driving it. ONE key with two named placeholders. */
          secondary={
            trip.driverName === null
              ? t('assurance.leg.noCaptain', {
                  time: formatDate(trip.departsAt, { style: 'day-month-time', language }),
                })
              : t('assurance.leg.line', {
                  time: formatDate(trip.departsAt, { style: 'day-month-time', language }),
                  captain: trip.driverName,
                })
          }
          label={t('assurance.a11y.open', { name: trip.route })}
        />
      </>
    ),
  }

  const sla: DataColumn<AssuranceTrip> = {
    id: 'sla',
    header: t('queue.col.sla'),
    /* 160, measured. This queue's SLA cell carries the LONGEST of the three
       readings — `Due 24 Jun 21:00`, a full instant rather than a duration —
       because `slaDueAt` here is a fixed 21:00 cut-off and `queueClock` refuses
       to print `overdue` on a row the data says was never breached. 136 clipped
       it; 160 holds it with Arabic headroom, and the 16 came off the identity's
       floor, which still has 100+px of residual on all three views. */
    width: 160,
    dataType: 'date',
    /* AC-114 — no `sortField`. §4.6's order is a rule, not a preference. */
    cell: (trip) => (
      <SlaCell result={clockFor(trip)} dueAt={trip.slaDueAt} t={t} language={language} />
    ),
  }

  const owner: DataColumn<AssuranceTrip> = {
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
    cell: (trip) => (
      <OwnerChip
        claim={trip.claim}
        currentUserId={deps.currentUserId}
        now={now}
        t={t}
        canWrite={deps.canWrite}
        disabledReason={t('queue.action.noPermission')}
        onClaim={() => deps.onClaim(trip)}
        onRelease={() => deps.onRelease(trip)}
        onTakeOver={() => deps.onTakeOver(trip)}
      />
    ),
  }

  const decision: DataColumn<AssuranceTrip> = {
    id: 'decision',
    header: t('queue.col.decision'),
    width: 176,
    dataType: 'enum',
    cell: (trip) => {
      const failed = deps.failure(trip.id)
      if (failed) {
        return (
          <ErrorState
            scope="row"
            message={failed.message}
            action={{ label: t('queue.error.retry'), onClick: failed.retry }}
          />
        )
      }
      /* Q-26 — a leg the system handed to its backup converted in place and
         names the system as the actor. It is not removed from the board. */
      if (trip.autoHandedOff) {
        return <MutedCell>{t('assurance.ack.handedOff')}</MutedCell>
      }
      return (
        <span className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => deps.onConfirm(trip)}
            disabled={!deps.canWrite}
            title={
              deps.canWrite ? t('assurance.action.confirm.help') : t('queue.action.noPermission')
            }
          >
            {t('assurance.action.confirm')}
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => deps.onOffer(trip)}
            disabled={!deps.canWrite}
            title={
              deps.canWrite
                ? t('assurance.action.offerBackup.help')
                : t('queue.action.noPermission')
            }
          >
            {t('assurance.action.offerBackup')}
          </Button>
        </span>
      )
    },
  }

  /** The middle column, and it is the one that changes with the view. */
  const middle: DataColumn<AssuranceTrip> =
    view === 'no-backup-captain'
      ? {
          id: 'backup',
          header: t('assurance.col.backup'),
          width: 176,
          dataType: 'text',
          filter: {
            kind: 'boolean',
            field: 'coverageNominal',
            trueLabel: t('assurance.backup.none'),
            falseLabel: t('assurance.backup.eligible', { name: '' }).trim(),
          },
          /**
           * **AC-265** — a plan whose registered backup fails eligibility
           * appears here and **states the reason the backup would be skipped,
           * by name**. That is the whole point of the Coverage view: *"a
           * registered backup whose vehicle sits below the plan tier, who is
           * frozen, or who is already committed elsewhere will be skipped at
           * the moment of need — and the rider waits while the system
           * searches"* (`:17517`). A plan that reads as covered and is not.
           */
          cell: (trip) => {
            if (trip.backupDriverId === null) {
              return (
                <Cell className="text-muted-foreground">{t('assurance.backup.none')}</Cell>
              )
            }
            const name = trip.backupDriverName ?? trip.backupDriverId
            if (trip.backupEligible) {
              return <Cell>{t('assurance.backup.eligible', { name })}</Cell>
            }
            const line = t('assurance.backup.ineligible', {
              name,
              reason: trip.backupIneligibleReason ?? '',
            })
            return (
              <Cell className="text-muted-foreground" title={line}>
                {line}
              </Cell>
            )
          },
        }
      : view === 'awaiting-confirmation'
        ? {
            id: 'confirmation',
            header: t('assurance.col.confirmation'),
            width: 176,
            dataType: 'enum',
            filter: {
              kind: 'boolean',
              field: 'ackAssumed',
              trueLabel: t('assurance.ack.assumed'),
              falseLabel: t('assurance.ack.app'),
            },
            /** **AC-268** — three weights, three words, three tones. */
            cell: (trip) => {
              const ack = trip.acknowledgement
              if (ack === null) {
                return (
                  <Cell>
                    <StatusBadge tone="neutral">{t('assurance.ack.none')}</StatusBadge>
                  </Cell>
                )
              }
              const entry = ACK[ack.source]
              return (
                <Cell title={t('assurance.ack.by', { source: t(entry.key), name: ack.byUserName })}>
                  <StatusBadge tone={entry.tone}>{t(entry.key)}</StatusBadge>
                </Cell>
              )
            },
          }
        : {
            id: 'reason',
            header: t('queue.col.reason'),
            width: 152,
            dataType: 'enum',
            filter: {
              kind: 'select',
              field: 'captainDepartureState',
              options: (Object.keys(CAPTAIN_STATE) as CaptainDepartureState[]).map((value) => ({
                value,
                label: t(CAPTAIN_STATE[value].key),
              })),
            },
            /**
             * **Q-58 / AC-263** — the readiness ladder as a REASON column. A
             * leg whose captain is unavailable but which departs in nine hours
             * carries no breach marker; its reason is stated here. Severity and
             * lateness are two facts and the row does not collapse them.
             */
            cell: (trip) => {
              const key = reasonKeyOf(trip)
              const line = t(key)
              /* **§9.1 / D-21 — the column's RESTING value is plain text.** *"A
                 value may be a badge only if it is a lifecycle state the
                 operator can act on or change, **and** only when it is not that
                 column's resting value."* `On track` is the answer this column
                 hopes for on every row; drawing it as a badge spends colour on
                 the rows that need none and flattens the ones that do. */
              if (key === 'assurance.reason.onTrack') {
                return <Cell className="text-muted-foreground">{line}</Cell>
              }
              return (
                <Cell title={trip.captainUnavailableReason ?? line}>
                  <StatusBadge tone="warning">{line}</StatusBadge>
                </Cell>
              )
            },
          }

  return [
    identity,
    middle,
    sla,
    owner,
    decision,

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (trip) => <MutedCell className="tabular-nums">{trip.id}</MutedCell>,
    },
    {
      id: 'rider',
      header: t('queue.col.rider'),
      width: 152,
      dataType: 'text',
      defaultHidden: true,
      sortField: 'riderName',
      /* **P8-T1** — a cell that names a rider opens that rider. It was plain
         text, so an operator reading a leg could not reach the person it is
         for without going through global search. */
      cell: (trip) => (
        <Cell>
          <EntityLink
            href={deps.hrefFor(trip.riderId)}
            label={t('assurance.a11y.openRider', { name: trip.riderName })}
            reason={t('assurance.entity.unresolved')}
            reasonId={`leg-${trip.id}-rider-unresolved`}
          >
            {trip.riderName}
          </EntityLink>
        </Cell>
      ),
    },
    {
      id: 'captain',
      header: t('queue.col.captain'),
      width: 176,
      dataType: 'text',
      defaultHidden: true,
      sortField: 'driverName',
      filter: {
        kind: 'select',
        field: 'captainDepartureState',
        options: (Object.keys(CAPTAIN_STATE) as CaptainDepartureState[]).map((value) => ({
          value,
          label: t(CAPTAIN_STATE[value].key),
        })),
      },
      /**
       * The committed captain's READINESS is the badge; the captain's NAME is
       * the link beside it (**P8-T1**). Before this the column carried only a
       * state, so the one cell on the row that is about a person named nobody
       * and opened nobody.
       *
       * §11.2 — an uncommitted leg has no captain to open, so the name is plain
       * muted text with its reason rather than a dead link.
       */
      cell: (trip) => (
        <Cell title={trip.captainUnavailableReason ?? undefined}>
          <span className="flex min-w-0 items-center gap-1.5">
            <StatusBadge tone={CAPTAIN_STATE[trip.captainDepartureState].tone}>
              {t(CAPTAIN_STATE[trip.captainDepartureState].key)}
            </StatusBadge>
            <EntityLink
              href={deps.hrefFor(trip.driverId)}
              label={t('assurance.a11y.openCaptain', { name: trip.driverName ?? '' })}
              reason={
                trip.driverId === null
                  ? t('assurance.captain.none.reason')
                  : t('assurance.entity.unresolved')
              }
              reasonId={`leg-${trip.id}-captain-absent`}
              className="min-w-0"
            >
              {trip.driverName ?? t('assurance.captain.none')}
            </EntityLink>
          </span>
        </Cell>
      ),
    },
    {
      id: 'departs',
      header: t('assurance.col.departs'),
      width: 136,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'departsAt',
      cell: (trip) => (
        <DateCell>{formatDate(trip.departsAt, { style: 'day-month-time', language })}</DateCell>
      ),
    },
    {
      id: 'nearby',
      header: t('assurance.col.nearby'),
      align: 'end',
      width: 136,
      dataType: 'number',
      defaultHidden: true,
      sortField: 'nearbyEligibleCount',
      /* `0` is what makes a leg uncovered, and §8.3.1 forbids rendering it as
         `—`: a zero is a measurement and an absence is not. */
      cell: (trip) => (
        <NumCell>
          {trip.nearbyEligibleCount === 0
            ? t('assurance.backup.nearby.none')
            : trip.nearbyEligibleCount === 1
              ? t('assurance.backup.nearby.one')
              : t('assurance.backup.nearby.other', {
                  count: formatCount(trip.nearbyEligibleCount, language),
                })}
        </NumCell>
      ),
    },
    {
      id: 'subscription',
      header: t('assurance.col.subscription'),
      width: 136,
      dataType: 'id',
      defaultHidden: true,
      filter: { kind: 'text', field: 'subscriptionId' },
      cell: (trip) => <MutedCell className="tabular-nums">{trip.subscriptionId}</MutedCell>,
    },
  ]
}

export interface AbsenceDeps {
  t: Translate
  language: Language
  canWrite: boolean
  profileHref: (id: string) => string
  failure: (id: string) => RowFailure | undefined
  onWaive: (row: AbsenceEvent) => void
}

/**
 * §7.3's width contract: `128 + 120 + 136 + 128 + 144 = 656` plus the
 * identity's `minWidth: 184` = **840**.
 *
 * **`Forfeited (SAR)` is `money` and is deliberately not the trailing column**
 * — §7.3 rule 5: a truncated amount reads as a different, valid amount, and it
 * is the one value on this screen a captain would dispute.
 */
export function absenceColumns(deps: AbsenceDeps): ReadonlyArray<DataColumn<AbsenceEvent>> {
  const { t, language } = deps
  return [
    {
      id: 'captain',
      header: t('queue.col.captain'),
      alwaysVisible: true,
      minWidth: 184,
      dataType: 'text',
      sortField: 'driverName',
      /* **No `RowCriticalMarker` anywhere in this view.** An absence has no
         deadline, so it can never be breached (Q-20), and Q-19 is explicit that
         age is not breach: *"a queue that marks its oldest row teaches
         operators to ignore the marker."* */
      cell: (event) => (
        <Identity
          to={deps.profileHref(event.driverId)}
          name={event.driverName}
          secondary={event.subscriptionId}
          label={t('assurance.a11y.open', { name: event.driverName })}
        />
      ),
    },
    {
      id: 'occurred',
      header: t('assurance.col.occurred'),
      width: 128,
      dataType: 'date',
      sortField: 'occurredAt',
      cell: (event) => (
        <DateCell>{formatDate(event.occurredAt, { style: 'day-month', language })}</DateCell>
      ),
    },
    {
      id: 'tier',
      header: t('assurance.col.tier'),
      width: 120,
      dataType: 'enum',
      sortField: 'tier',
      filter: {
        kind: 'multi-select',
        field: 'tier',
        options: [
          { value: '1', label: t('assurance.absence.tier', { tier: '1' }) },
          { value: '2', label: t('assurance.absence.tier', { tier: '2' }) },
          { value: '3', label: t('assurance.absence.tier', { tier: '3' }) },
        ],
      },
      /* Q-60 — a DERIVED value. §3.4: derived values are plain text, never a
         badge. `Strike 2 of 3` is a count, not a lifecycle state. */
      cell: (event) => <Cell>{t('assurance.absence.tier', { tier: String(event.tier) })}</Cell>,
    },
    {
      id: 'forfeited',
      header: t('assurance.col.forfeited'),
      align: 'end',
      width: 136,
      dataType: 'money',
      sortField: 'forfeitedHalalas',
      /* §8.3.1 — the header carries `(SAR)`, so the cell does not repeat it. */
      cell: (event) => (
        <Cell className="text-end">
          <Money amount={event.forfeitedHalalas} unit="none" />
        </Cell>
      ),
    },
    {
      id: 'status',
      header: t('queue.col.status'),
      width: 128,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'counting',
        trueLabel: t('assurance.absence.counting'),
        falseLabel: t('assurance.absence.waived'),
      },
      /* `waived` and `decayed` both stop a strike counting, for completely
         different reasons — one captain was excused and one recovered. The
         client keeps them apart and so does this cell. */
      cell: (event) => (
        <Cell>
          <StatusBadge tone={event.waived ? 'neutral' : event.decayed ? 'neutral' : 'warning'}>
            {t(
              event.waived
                ? 'assurance.absence.waived'
                : event.decayed
                  ? 'assurance.absence.decayed'
                  : 'assurance.absence.counting',
            )}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'decision',
      header: t('queue.col.decision'),
      width: 144,
      dataType: 'enum',
      cell: (event) => {
        const failed = deps.failure(event.id)
        if (failed) {
          return (
            <ErrorState
              scope="row"
              message={failed.message}
              action={{ label: t('queue.error.retry'), onClick: failed.retry }}
            />
          )
        }
        if (event.waived) {
          return (
            <MutedCell title={event.waivedReason ?? undefined}>
              {event.waivedReason ?? t('assurance.absence.waived')}
            </MutedCell>
          )
        }
        return (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => deps.onWaive(event)}
            disabled={!deps.canWrite}
            title={deps.canWrite ? t('assurance.action.waive.help') : t('queue.action.noPermission')}
          >
            {t('assurance.action.waive')}
          </Button>
        )
      },
    },
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (event) => <MutedCell className="tabular-nums">{event.id}</MutedCell>,
    },
  ]
}
