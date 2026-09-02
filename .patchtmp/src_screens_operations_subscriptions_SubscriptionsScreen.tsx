/**
 * **Operations › Subscriptions** — `routeTable.ts`, shape `index`, five views.
 *
 * ## What P4-T1 and P8-T1 changed here
 *
 * **The table had a checkbox column and nothing behind it.** `mode: 'index'`
 * gives `canSelect: true` unconditionally, so every row rendered a checkbox and
 * the header a select-all — while `DataTable` only draws the bulk bar when
 * `bulkActions` is non-empty, and this screen declared none. Selecting rows
 * produced no bar, no count and no way to clear.
 *
 * **`Freeze` is the bulk command, and it is the only one.** A school holiday or
 * a Ramadan schedule freezes a cohort, which is the canonical bulk act on this
 * resource and is fully backed by `freezeSubscription`. `Cancel and settle` is
 * deliberately **not** offered over a set: it moves money, the refund is
 * server-computed per record, and twelve refunds committed from one pill is a
 * different risk from twelve freezes. That is a narrowing I am reporting rather
 * than a rule I found — flagged to product-designer in the handoff.
 *
 * **D21, in full.** A bulk command is refused if **any** selected subscription
 * would be refused on its own row; the refusal names the count in one of three
 * sentences (one, some, **all**); there is no partial apply; and the way out is
 * `Select only the N eligible`, which changes the SELECTION rather than
 * narrowing the command. One predicate answers for the row menu and the bar.
 *
 * **Three cells named an entity and none of them opened one properly.** The
 * rider and the captain were `<button onClick={navigate}>` carrying
 * `focus:outline-none` with nothing in its place — not middle-clickable, not
 * copyable, and with the focus ring removed (§7.2). The subscription's own id
 * was not a link at all. All three go through `EntityLink` now, and a
 * subscription with no captain renders **plain text with its reason** rather
 * than a dead control (§11.2).
 *
 * **§11.2 — the three row actions were HIDDEN behind `canWrite`.** An operator
 * without `manage_subscriptions` saw a kebab with two navigation items and no
 * sign that freezing or cancelling exists. They render and refuse now.
 *
 * **`Change captain` has no write behind it and now says so.** It set a local
 * `{ driverId, driverName }` override and toasted success; the next refetch
 * discarded it. `clients/subscriptions.ts` has no reassign operation — the
 * signature requested is in `ChangeDriverModal`'s header and in the handoff —
 * so the action is disabled in place with its reason. A truthful dead control
 * beats a button that reports a reassignment nobody made.
 *
 * **There is now a subscription record to open.** `getSubscription` had no
 * consumer and 21 fields were reachable from nowhere; see
 * `SubscriptionDetailDrawer`.
 *
 * Rules applied
 *   §9.1 / AC-43  the first data cell is the identity and **a link**.
 *   §9.1 / R4     money, counts and percentages are inline-END, `tabular-nums`.
 *   §8.3.1        `escrowHeldHalalas: null` is *no hold*, not `0`.
 *   R5a           no red badge. `cancelled` is neutral; the WORD carries it.
 *   R3            one primary per screen, and Subscriptions has none — nobody
 *                 creates a subscription from ops.
 *   §11.2         gated at RENDER, disabled in place, with the reason.
 *   AC-74/75      every string is a key in `./copy.ts`, named placeholders only.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cancelSubscription, freezeSubscription, listSubscriptions } from '@/data/clients'
import type { Paginated, SubTabRoute, Subscription, SubscriptionStatus } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, formatMoney } from '@/lib'
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, NumCell } from '@/screens/queues/cells'
import { setRefusal, type SetRefusal } from '../bulkRefusal'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { withFallback } from '../localCopy'
import { SUBSCRIPTIONS_EN } from './copy'
import { ChangeDriverModal } from './ChangeDriverModal'
import { FreezeModal } from './FreezeModal'
import { CancelSettleModal } from './CancelSettleModal'
import { SUBSCRIPTION_TONE, SubscriptionDetailDrawer } from './SubscriptionDetailDrawer'

/** The five termination reasons the settle form offers, as copy KEYS. */
const SETTLE_REASONS: readonly string[] = [
  'subs.reason.noDriver',
  'subs.reason.serviceFailure',
  'subs.reason.relocated',
  'subs.reason.vehicleBreakdown',
  'subs.reason.riderViolation',
]

/** The statuses no write can act on. The client raises 409 on both. */
const TERMINAL: readonly SubscriptionStatus[] = ['cancelled', 'expired']

function isTerminal(sub: Subscription): boolean {
  return TERMINAL.includes(sub.status)
}

export function SubscriptionsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { dir, language } = shell.language
  /* AC-74 — the copy lives in `./copy.ts`. See `localCopy` for what deletes
     this wrapper. */
  const t = withFallback(shell.language.t, SUBSCRIPTIONS_EN)

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Subscription>({
    mode: 'index',
    getRowId: (sub) => sub.id,
    initialSort: { field: 'endsOn', dir: 'asc' },
  })

  const queryParams = useMemo(
    () => ({ ...table.params, view: activeTab }),
    [table.params, activeTab],
  )

  const data = useAsync<Paginated<Subscription>>(
    (signal) => listSubscriptions(queryParams, signal),
    { deps: [queryParams], cacheKey: 'subscriptions.list' },
  )

  /**
   * The mutated rows, held over the list until a real read agrees with them.
   * The mock clients deliberately do not write back to their fixture arrays, so
   * without this an operator freezes a subscription, reads the toast, and
   * watches the row stay active. The value held is the **response body**, never
   * something recomputed here — which is what makes the refund figure in the
   * record the server's and not the browser's.
   */
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Subscription>>(() => new Map())
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [reassigning, setReassigning] = useState<Subscription | null>(null)
  const [settling, setSettling] = useState<Subscription | null>(null)
  /** The subscriptions the freeze form is asking about — one, or the selection. */
  const [freezing, setFreezing] = useState<readonly Subscription[]>([])

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return overrides.size === 0 ? raw : raw.map((item) => overrides.get(item.id) ?? item)
  }, [data.data?.items, overrides])

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  /**
   * **P8-T1 — resolution is ASKED, not assumed.** `useEntityLinks` asks
   * `resolveProfile` once per distinct id on the page and answers `null` for
   * anything that names nothing, so an unresolvable name renders as text with
   * its reason rather than as a link into the overlay's not-found state.
   */
  const hrefFor = useEntityLinks(
    useMemo(() => rows.flatMap((sub) => [sub.id, sub.riderId, sub.driverId]), [rows]),
  )

  /** §11.2 — two different facts, two different sentences. */
  const captainReason = useCallback(
    (sub: Subscription) =>
      sub.driverId === null ? t('subs.captain.none.reason') : t('subs.entity.unresolved'),
    [t],
  )

  const record = useCallback((updated: readonly Subscription[]) => {
    setOverrides((current) => {
      const next = new Map(current)
      updated.forEach((sub) => next.set(sub.id, sub))
      return next
    })
  }, [])

  /* ── D21, one predicate per command ─────────────────────────────────── */

  /** D17 / D21 rule 5 — a permission refusal outranks every domain refusal. */
  const roleReason = canWrite ? null : t('subs.action.noPermission')

  const freezeRefusal = useCallback(
    (targets: readonly Subscription[]): SetRefusal =>
      setRefusal({
        targets,
        getId: (sub) => sub.id,
        /* The client's own 409: `cancelled` and `expired` cannot be frozen. The
           predicate is the client's contract restated, not a second policy. */
        isBlocked: isTerminal,
        roleReason,
        blockedKeyPrefix: 'subs.action.freeze.blocked',
        t,
        language,
      }),
    [roleReason, t, language],
  )

  const cancelRefusal = useCallback(
    (targets: readonly Subscription[]): SetRefusal =>
      setRefusal({
        targets,
        getId: (sub) => sub.id,
        isBlocked: isTerminal,
        roleReason,
        blockedKeyPrefix: 'subs.action.cancel.blocked',
        t,
        language,
      }),
    [roleReason, t, language],
  )

  /**
   * **The one refusal on this screen that is not about the record.**
   * `Change captain` has no client operation behind it at all, so it is refused
   * for every row and every role, and the sentence says which — *not connected
   * yet*, rather than a permission or a status. §11.2: never hidden.
   */
  const reassignRefusal = roleReason ?? t('subs.action.changeDriver.unavailable')

  /* ── the writes. Every bulk action reaches the data layer ────────────── */

  const runFreeze = useCallback(
    async (subs: readonly Subscription[], until: string) => {
      const updated = await Promise.all(subs.map((sub) => freezeSubscription(sub.id, until)))
      record(updated)
      table.clearSelection()
      toast(
        subs.length === 1
          ? t('subs.toast.frozen.one')
          : t('subs.toast.frozen.other', { count: formatCount(subs.length, language) }),
      )
    },
    [record, table, t, language],
  )

  const runCancel = useCallback(
    async (sub: Subscription, reason: string) => {
      const updated = await cancelSubscription(sub.id, reason)
      record([updated])
      /**
       * **The toast names the SERVER's refund, not the browser's estimate.**
       * `cancelSubscription` computes the settlement and returns it on
       * `refundedHalalas`; `CancelSettleModal` shows an estimate derived from
       * unused trips, and the two can disagree. Quoting the response is the
       * only figure this screen is entitled to assert.
       */
      toast(
        t('subs.toast.cancelled', {
          /* `formatMoney` deliberately takes NO language: §8.3.1 fixes `,`
             thousands and `.` decimals, and AC-73 requires a money value to
             read in the same character order in Arabic as in English. */
          amount: formatMoney(updated.refundedHalalas ?? 0),
        }),
      )
    },
    [record, t, language],
  )

  /** The selection as RECORDS, which is what every predicate takes. */
  const selected = useMemo(
    () => rows.filter((sub) => table.selectedIds.has(sub.id)),
    [rows, table.selectedIds],
  )

  /* ── columns ─────────────────────────────────────────────────────────── */

  const columns: ReadonlyArray<DataColumn<Subscription>> = useMemo(
    () => [
      {
        id: 'id',
        header: t('subs.col.id'),
        alwaysVisible: true,
        minWidth: 176,
        dataType: 'id',
        sortField: 'id',
        cell: (sub) => {
          const href = hrefFor(sub.id)
          /* §7.7 — line 2 QUALIFIES line 1: the plan and how far through it the
             rider is, which is what an operator reads next. One key with named
             placeholders; `plan + ' · ' + ratio` is what AC-75 forbids. */
          const secondary = t('subs.identity.secondary', {
            plan: sub.planName,
            trips: t('subs.trips.ratio', {
              completed: formatCount(sub.tripsCompleted, language),
              included: formatCount(sub.tripsIncluded, language),
            }),
          })
          /* **The identity degrades to text too** — see the same branch on
             Trips, and the `Identity` contract change requested in the handoff. */
          if (href === null) {
            return (
              <span className="flex min-w-0 max-w-80 flex-col justify-center">
                <EntityLink
                  href={null}
                  code
                  label={t('subs.open.subscription', { id: sub.id })}
                  reason={t('subs.entity.unresolved')}
                  reasonId={`sub-${sub.id}-unresolved`}
                >
                  {sub.id}
                </EntityLink>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{secondary}</bdi>
                </span>
              </span>
            )
          }
          return (
            <Identity
              to={href}
              name={sub.id}
              code
              secondary={secondary}
              label={t('subs.open.subscription', { id: sub.id })}
            />
          )
        },
      },
      {
        id: 'riderName',
        header: t('subs.col.rider'),
        width: 152,
        dataType: 'text',
        sortField: 'riderName',
        filter: { kind: 'text', field: 'riderName' },
        cell: (sub) => (
          <Cell>
            <EntityLink
              href={hrefFor(sub.riderId)}
              label={t('subs.open.rider', { name: sub.riderName })}
              reason={t('subs.entity.unresolved')}
              reasonId={`sub-${sub.id}-rider-unresolved`}
            >
              {sub.riderName}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'driverName',
        header: t('subs.col.captain'),
        width: 152,
        dataType: 'text',
        sortField: 'driverName',
        filter: { kind: 'text', field: 'driverName' },
        /* §11.2 / P8-T1 — an unassigned subscription has no captain to open, so
           the cell is plain muted text with the reason, never a dead link. */
        cell: (sub) => (
          <Cell>
            <EntityLink
              href={hrefFor(sub.driverId)}
              label={t('subs.open.captain', { name: sub.driverName ?? '' })}
              reason={captainReason(sub)}
              reasonId={`sub-${sub.id}-captain-absent`}
            >
              {sub.driverName ?? t('subs.captain.none')}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'status',
        header: t('subs.col.status'),
        width: 112,
        dataType: 'enum',
        sortField: 'status',
        filter: {
          kind: 'multi-select',
          field: 'status',
          options: (Object.keys(SUBSCRIPTION_TONE) as SubscriptionStatus[]).map((value) => ({
            value,
            label: t(`subs.status.${value}`),
          })),
        },
        cell: (sub) => (
          <Cell>
            <StatusBadge tone={SUBSCRIPTION_TONE[sub.status]}>
              {t(`subs.status.${sub.status}`)}
            </StatusBadge>
          </Cell>
        ),
      },
      {
        id: 'paidHalalas',
        header: t('subs.col.paid'),
        width: 112,
        align: 'end',
        dataType: 'money',
        sortField: 'paidHalalas',
        cell: (sub) => (
          <NumCell className="font-medium">
            <Money amount={sub.paidHalalas} />
          </NumCell>
        ),
      },
      {
        id: 'endsOn',
        header: t('subs.col.ends'),
        width: 128,
        dataType: 'date',
        sortField: 'endsOn',
        /* §7.3 rule 5 — the trailing visible column is a DATE, never `money`
           or `id`, where a truncation reads as a different valid value. */
        cell: (sub) => <DateCell>{formatDate(sub.endsOn, { language })}</DateCell>,
      },

      /* ── behind the column control (§7.4) ─────────────────────────────── */
      {
        id: 'startedOn',
        header: t('subs.col.starts'),
        width: 128,
        dataType: 'date',
        defaultHidden: true,
        sortField: 'startedOn',
        cell: (sub) => <DateCell>{formatDate(sub.startedOn, { language })}</DateCell>,
      },
      {
        id: 'planKey',
        header: t('subs.col.plan'),
        width: 112,
        dataType: 'enum',
        defaultHidden: true,
        filter: {
          kind: 'multi-select',
          field: 'planKey',
          options: [
            { value: 'weekly', label: t('subs.plan.weekly') },
            { value: 'biweekly', label: t('subs.plan.biweekly') },
            { value: 'monthly', label: t('subs.plan.monthly') },
          ],
        },
        cell: (sub) => <Cell>{t(`subs.plan.${sub.planKey}`)}</Cell>,
      },
      {
        id: 'vehicleClass',
        header: t('subs.col.class'),
        width: 112,
        dataType: 'enum',
        defaultHidden: true,
        filter: { kind: 'select', field: 'vehicleClass', options: [] },
        cell: (sub) => <Cell>{sub.vehicleClass}</Cell>,
      },
      {
        id: 'escrowHeldHalalas',
        header: t('subs.col.escrow'),
        width: 128,
        align: 'end',
        dataType: 'money',
        defaultHidden: true,
        sortField: 'escrowHeldHalalas',
        /* §8.3.1 — `null` means NO HOLD EXISTS, which is not a hold of zero.
           The client's own note makes the distinction; the cell keeps it. */
        cell: (sub) =>
          sub.escrowHeldHalalas === null ? (
            <Absent numeric />
          ) : (
            <NumCell>
              <Money amount={sub.escrowHeldHalalas} />
            </NumCell>
          ),
      },
      {
        id: 'renewalLikelihoodPercent',
        header: t('subs.col.renewal'),
        width: 144,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        sortField: 'renewalLikelihoodPercent',
        /* "No renewal history to predict from" is a KNOWN fact about most
           first-cycle riders, so it reads in words rather than as `—`. */
        cell: (sub) =>
          sub.renewalLikelihoodPercent === null ? (
            <Cell className="text-end text-muted-foreground">{t('subs.renewal.none')}</Cell>
          ) : (
            <NumCell>
              {t('subs.renewal.percent', {
                percent: formatCount(sub.renewalLikelihoodPercent, language),
              })}
            </NumCell>
          ),
      },
      {
        id: 'frozenUntil',
        header: t('subs.col.frozenUntil'),
        width: 128,
        dataType: 'date',
        defaultHidden: true,
        cell: (sub) =>
          sub.frozenUntil === null ? (
            <Absent />
          ) : (
            <DateCell>{formatDate(sub.frozenUntil, { language })}</DateCell>
          ),
      },
      {
        id: 'refundedHalalas',
        header: t('subs.col.refunded'),
        width: 128,
        align: 'end',
        dataType: 'money',
        defaultHidden: true,
        cell: (sub) =>
          sub.refundedHalalas === null ? (
            <Absent numeric />
          ) : (
            <NumCell>
              <Money amount={sub.refundedHalalas} />
            </NumCell>
          ),
      },
    ],
    [t, language, hrefFor, captainReason],
  )

  /* ── row actions (§7.8 / D8 — four declared, so a kebab) ─────────────── */

  const rowActions: ReadonlyArray<RowAction<Subscription>> = useMemo(
    () => [
      {
        label: t('subs.action.view'),
        onSelect: (sub: Subscription) => setDrawerId(sub.id),
        /* **P0-2 — the declared row-click target.** `Freeze`, `Change driver`
           and `Cancel` all mutate; none may carry this. */
        rowClick: true,
      },
      {
        label: t('subs.action.freeze'),
        onSelect: (sub: Subscription) => setFreezing([sub]),
        disabled: (sub: Subscription) => freezeRefusal([sub]).refused,
        reason: (sub: Subscription) => freezeRefusal([sub]).reason,
      },
      {
        /* §11.2 — rendered, refused, and the sentence says the write does not
           exist rather than implying the operator lacks a permission. */
        label: t('subs.action.changeDriver'),
        onSelect: (sub: Subscription) => setReassigning(sub),
        disabled: () => true,
        reason: () => reassignRefusal,
      },
      {
        label: t('subs.action.cancel'),
        onSelect: (sub: Subscription) => setSettling(sub),
        disabled: (sub: Subscription) => cancelRefusal([sub]).refused,
        reason: (sub: Subscription) => cancelRefusal([sub]).reason,
      },
    ],
    [t, freezeRefusal, cancelRefusal, reassignRefusal],
  )

  /* ── the bulk bar ─────────────────────────────────────────────────────── */

  const bulkActions: ReadonlyArray<BulkAction> = useMemo(() => {
    const freeze = freezeRefusal(selected)
    return [
      {
        label: t('subs.bulk.freeze'),
        onClick: () => setFreezing(selected),
        disabled: freeze.refused,
        reason: freeze.reason,
        /* D21 — a narrowing, not a partial apply. Empty when every selected
           subscription is terminal, and the bar renders no control then. */
        eligibleIds: freeze.eligibleIds,
      },
    ]
  }, [selected, freezeRefusal, t])

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0
  const meta =
    data.status === 'content'
      ? total === 1
        ? t('subs.meta.one', { count: '1' })
        : t('subs.meta.other', { count: formatCount(total, language) })
      : null

  /* AC-24 / AC-36 — a whole-read failure takes the PAGE scope: there is no
     table left for a card-scoped error to sit beside. */
  if (data.status === 'error') {
    const title = t(row.titleKey)
    return (
      <SingleColumnPage header={<PageHeader title={title} t={t} dir={dir} />}>
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: data.refetch }}
        />
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(sub) => sub.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="operations-subscriptions"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) =>
          navigate({ pathname: location.pathname, search: withView(location.search, id) })
        }
        searchPlaceholder={t('subs.search')}
        rowActions={rowActions}
        bulkActions={bulkActions}
        firstRun={{
          heading: t('subs.empty.firstRun.heading'),
          body: t('subs.empty.firstRun.body'),
          actions: [
            {
              label: t('subs.empty.firstRun.action'),
              onClick: () =>
                navigate({ pathname: location.pathname, search: withView(location.search, 'all') }),
            },
          ],
        }}
        noMatch={{ message: t('subs.empty.noMatch') }}
        error={{ message: t('subs.error.list'), onRetry: data.refetch }}
      />

      <SubscriptionDetailDrawer
        subscriptionId={drawerId}
        onClose={() => setDrawerId(null)}
        language={language}
        t={t}
      />

      <FreezeModal
        subscriptions={freezing}
        onClose={() => setFreezing([])}
        onConfirm={runFreeze}
        language={language}
        t={t}
      />

      <ChangeDriverModal
        subscription={reassigning}
        open={reassigning !== null}
        onClose={() => setReassigning(null)}
        /* There is no write. The modal's primary is dead and states why; this
           exists only so the promise contract is satisfied and so a future
           `reassignSubscriptionDriver` has one obvious place to land. */
        onConfirm={() => Promise.reject(new Error(reassignRefusal))}
        unavailableReason={reassignRefusal}
        t={t}
      />

      <CancelSettleModal
        subscription={settling}
        reasonKeys={SETTLE_REASONS}
        open={settling !== null}
        onClose={() => setSettling(null)}
        onConfirm={(_id, reason) =>
          settling === null ? Promise.resolve() : runCancel(settling, reason)
        }
        language={language}
        t={t}
      />
    </SingleColumnPage>
  )
}
