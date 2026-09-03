/**
 * Support › Disputes & Lost and Found.
 *
 * Rules applied
 *   §2         **the data comes from a client.** The screen this replaces held
 *              `INITIAL_DISPUTES` and `INITIAL_LOST_FOUND` as module literals in
 *              `useState`, so nothing could page, filter, fail or be swapped for
 *              an API. Both views now read `clients/disputes.ts`.
 *   §4.3       **all four states**, on both views, from `useAsync().status`. The
 *              old screen passed `status="content"` as a literal and an
 *              `onRetry` that was `() => {}` — an error branch that could not be
 *              reached and could not have recovered if it had been.
 *   §11.2      **an action the operator may not take is disabled in place with
 *              its reason**, never hidden. Every row action here is declared for
 *              every row; `disabled` and `reason` decide what the operator sees.
 *              The old screen rendered `null` — so a resolved claim showed no
 *              trace that resolving exists, and a returned item showed no trace
 *              of the ladder it had come down.
 *   D8-b       two declared row actions render as two labelled controls, not a
 *              kebab. That is `DataTable`'s threshold and this screen does not
 *              re-implement it.
 *   AC-68      row actions are visible at rest and keyboard-operable. Nothing
 *              here appears on `:hover`.
 *   §9.3       the verdict clock is `slaClock`, and `No clock` is a VALUE —
 *              `DSP-118` has no deadline and says so rather than showing `—`.
 *   AC-74/75   every string is a key in `./copy`, with named placeholders. No
 *              `defaultValue` anywhere.
 *   §4.6 · 1   `view` is passed **after** `table.params`, explicitly `null`,
 *              rather than letting `table.params.view` clobber the tab. These
 *              two collections are separate endpoints, not two views of one.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  advanceLostFoundItem,
  claimDispute,
  listDisputes,
  listLostFound,
  resolveDispute,
  type ResolveDisputeInput,
} from '@/data/clients'
import {
  DISPUTE_KINDS,
  DISPUTE_OUTCOMES,
  DISPUTE_STATUSES,
  LOST_FOUND_STATUSES,
  type BadgeTone,
  type Dispute,
  type LostFoundItem,
  type Paginated,
  type SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import {
  NO_CLOCK,
  formatDate,
  formatMoney,
  formatSlaLabel,
  slaClock,
} from '@/lib'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { MoneyCell } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { ResolveDisputeModal } from './ResolveDisputeModal'
import { withFallback } from '../../operations/localCopy'
import { DISPUTES_EN } from './copy'

const DISPUTE_STATUS_TONE: Record<Dispute['status'], BadgeTone> = {
  open: 'warning',
  'under-review': 'info',
  resolved: 'success',
}

const LOST_FOUND_STATUS_TONE: Record<LostFoundItem['status'], BadgeTone> = {
  searching: 'warning',
  'with-captain': 'info',
  returned: 'success',
}

const LOST_FOUND_VIEW = 'lost-and-found'

export function DisputesScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, DISPUTES_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  /* One clock (`AC-28`). The verdict countdown re-reads it every 15 s, which is
     §9.3's SLA bucket, not a per-screen interval.

     **`useNowIso`, not `useNow`.** This screen was the only queue reading the
     host clock directly, and the fixtures are written against `EYVAR_NOW`
     (2026-06-25) — so every one of the 28 disputes rendered `overdue 67d` while
     Safety, on the same data and the same 48-hour SLA, read `overdue 12m`. The
     15-second bucket is kept; it is the pinning that was missing. */
  const now = useNowIso(15)

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'disputes'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback
  const onLostFound = activeTab === LOST_FOUND_VIEW

  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  /* ── disputes ─────────────────────────────────────────────────────── */

  const disputeTable = useIndexTable<Dispute>({
    mode: 'index',
    getRowId: (d) => d.id,
    initialSort: { field: 'filedAt', dir: 'desc' },
  })

  const disputeParams = useMemo(
    /* `view: null` LAST, on purpose. `table.params.view` is `null` on a screen
       that passes no `initialView`, and three call sites in Financials spread it
       after the tab and silently delete their own filter (§4.6 item 1). Here the
       two tabs are two collections, so there is no view to send at all — stating
       it beats relying on the spread order. */
    () => ({ ...disputeTable.params, view: null }),
    [disputeTable.params],
  )

  const disputes = useAsync<Paginated<Dispute>>(
    (signal) => listDisputes(disputeParams, signal),
    /* `disputeParams` is the whole argument, so the key is complete. The two
       tabs here are two collections and two operations, so switching to Lost
       and found and back re-paints this table's own rows. `claim` and `resolve`
       both call `refetch`. */
    { deps: [disputeParams], cacheKey: 'disputes.list', enabled: !onLostFound },
  )

  /* ── lost and found ───────────────────────────────────────────────── */

  const lfTable = useIndexTable<LostFoundItem>({
    mode: 'index',
    getRowId: (l) => l.id,
    initialSort: { field: 'reportedAt', dir: 'desc' },
  })

  const lfParams = useMemo(() => ({ ...lfTable.params, view: null }), [lfTable.params])

  const lostFound = useAsync<Paginated<LostFoundItem>>(
    (signal) => listLostFound(lfParams, signal),
    /* `lostFound.list` is its own operation, not a view of `disputes.list`, so
       the two tabs cannot key into each other. `lfParams` is the whole
       argument; `advance` calls `refetch`. */
    { deps: [lfParams], cacheKey: 'lostFound.list', enabled: onLostFound },
  )

  /* ── mutations ────────────────────────────────────────────────────── */

  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null)

  const handleTake = useCallback(
    async (dispute: Dispute) => {
      try {
        await claimDispute(dispute.id, currentUserId, currentUserName)
        toast.success(t('dispute.toast.taken', { id: dispute.id }))
        disputes.refetch()
      } catch {
        toast.error(t('dispute.toast.failed', { id: dispute.id }))
      }
    },
    [currentUserId, currentUserName, disputes, t],
  )

  /**
   * Resolving is the money-moving act, so the screen owns the call and the
   * modal stays dumb. It **re-throws**: the modal renders the seam's own reason
   * inline and stays open, because closing a form over a refusal loses the
   * operator's note and tells them nothing.
   */
  const handleResolve = useCallback(
    async (input: ResolveDisputeInput) => {
      const dispute = activeDispute
      if (!dispute) return
      const { dispute: resolved } = await resolveDispute(input)
      const outcome = resolved.resolution?.outcome
      if (outcome && outcome !== 'declined') {
        toast.success(
          t('dispute.toast.resolved', {
            id: resolved.id,
            amount: formatMoney(resolved.resolution?.refundHalalas ?? 0, { unit: 'code' }),
            name: resolved.claimantName,
          }),
        )
      } else {
        toast.success(t('dispute.toast.declined', { id: resolved.id }))
      }
      setActiveDispute(null)
      disputes.refetch()
    },
    [activeDispute, disputes, t],
  )

  const handleAdvance = useCallback(
    async (item: LostFoundItem) => {
      try {
        const updated = await advanceLostFoundItem({ id: item.id })
        toast.success(
          t('dispute.lf.toast.advanced', {
            id: updated.id,
            status: t(`dispute.lf.status.${updated.status}`),
          }),
        )
        lostFound.refetch()
      } catch {
        toast.error(t('dispute.lf.toast.failed', { id: item.id }))
      }
    },
    [lostFound, t],
  )

  /* ── columns ──────────────────────────────────────────────────────── */

  const disputeColumns: DataColumn<Dispute>[] = useMemo(
    () => [
      {
        id: 'id',
        sortField: 'id',
        emphasis: 'primary',
        csv: (d) => d.id,
        header: t('dispute.col.case'),
        width: 96,
        dataType: 'text',
        alwaysVisible: true,
        cell: (d) => <span className="font-mono text-xs font-semibold text-foreground">{d.id}</span>,
      },
      {
        id: 'what',
        header: t('dispute.col.what'),
        minWidth: 240,
        dataType: 'enum',
        sortField: 'kind',
        cell: (d) => (
          <span className="block truncate text-xs font-medium text-foreground">
            {t(`dispute.kind.${d.kind}`)}
          </span>
        ),
        /* §15 — the options come from the CLOSED union, so a seventh kind is a
           missing key at build time rather than a facet nobody added. Every
           member has at least one seeded row (`fixtures/disputes.ts`), which is
           what stops this being a filter that can never match. */
        filter: {
          kind: 'select',
          field: 'kind',
          options: DISPUTE_KINDS.map((value) => ({ value, label: t(`dispute.kind.${value}`) })),
        },
        secondaryLine: (d) => (
          <span className="block truncate text-xs text-muted-foreground">{d.claim}</span>
        ),
      },
      {
        id: 'parties',
        header: t('dispute.col.parties'),
        width: 180,
        dataType: 'text',
        sortField: 'claimantName',
        cell: (d) => (
          <span className="block truncate text-xs text-foreground">
            {t('dispute.line.claimant', { name: d.claimantName })}
          </span>
        ),
        secondaryLine: (d) => (
          <span className="block truncate text-xs text-muted-foreground">
            {d.againstName === null
              ? t('dispute.line.noAgainst')
              : t('dispute.line.against', { name: d.againstName })}
          </span>
        ),
      },
      {
        id: 'amount',
        emphasis: 'data',
        csv: (d) => d.amountHalalas,
        header: t('dispute.col.amount'),
        width: 116,
        align: 'end',
        dataType: 'money',
        sortField: 'amountHalalas',
        cell: (d) => <MoneyCell amount={d.amountHalalas} />,
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('dispute.col.status'),
        width: 132,
        dataType: 'enum',
        sortField: 'status',
        cell: (d) => (
          <StatusBadge tone={DISPUTE_STATUS_TONE[d.status]}>
            {t(`dispute.status.${d.status}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'status',
          options: DISPUTE_STATUSES.map((value) => ({
            value,
            label: t(`dispute.status.${value}`),
          })),
        },
        secondaryLine: (d) =>
          d.resolution === null ? (
            <span className="block truncate text-xs text-muted-foreground">
              {d.ownerName === null
                ? t('dispute.line.unowned')
                : t('dispute.line.owner', { name: d.ownerName })}
            </span>
          ) : (
            <span className="block truncate text-xs text-muted-foreground">
              {d.resolution.refundHalalas === 0
                ? t('dispute.line.settledNothing', {
                    outcome: t(`dispute.outcome.${d.resolution.outcome}`),
                  })
                : t('dispute.line.settled', {
                    outcome: t(`dispute.outcome.${d.resolution.outcome}`),
                    amount: formatMoney(d.resolution.refundHalalas, { unit: 'code' }),
                  })}
            </span>
          ),
      },
      {
        id: 'due',
        emphasis: 'data',
        header: t('dispute.col.due'),
        width: 124,
        dataType: 'date',
        sortField: 'dueAt',
        cell: (d) => {
          /* A decided claim's clock has stopped. Driving the pill off a past
             `dueAt` would print `overdue 3d` on work nobody owes — §9.3's own
             rule, and the reason `NO_CLOCK` is referentially stable. */
          const clock =
            d.status === 'resolved' ? NO_CLOCK : slaClock({ dueAt: d.dueAt, startedAt: d.filedAt }, now)
          return (
            <StatusBadge tone={clock.band === 'neutral' ? 'neutral' : 'warning'}>
              {formatSlaLabel(clock, t)}
            </StatusBadge>
          )
        },
      },
    ],
    [now, t],
  )

  const lfColumns: DataColumn<LostFoundItem>[] = useMemo(
    () => [
      {
        id: 'id',
        sortField: 'id',
        emphasis: 'primary',
        csv: (l) => l.id,
        header: t('dispute.lf.col.case'),
        width: 96,
        dataType: 'text',
        alwaysVisible: true,
        cell: (l) => <span className="font-mono text-xs font-semibold text-foreground">{l.id}</span>,
      },
      {
        id: 'item',
        header: t('dispute.lf.col.item'),
        minWidth: 240,
        dataType: 'text',
        sortField: 'item',
        cell: (l) => (
          <span className="block truncate text-xs font-medium text-foreground">{l.item}</span>
        ),
      },
      {
        id: 'rider',
        header: t('dispute.lf.col.rider'),
        width: 170,
        dataType: 'text',
        cell: (l) => <span className="block truncate text-xs text-foreground">{l.riderName}</span>,
        secondaryLine: (l) => (
          <span className="block font-mono text-xs text-muted-foreground">{l.riderId}</span>
        ),
      },
      {
        id: 'captain',
        header: t('dispute.lf.col.captain'),
        width: 190,
        dataType: 'text',
        cell: (l) => (
          <span className="block truncate text-xs text-foreground">
            {l.driverName === null
              ? t('dispute.lf.line.noCaptain', { trip: l.tripId })
              : t('dispute.lf.line.captain', { name: l.driverName, trip: l.tripId })}
          </span>
        ),
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('dispute.lf.col.status'),
        width: 140,
        dataType: 'enum',
        sortField: 'status',
        cell: (l) => (
          <StatusBadge tone={LOST_FOUND_STATUS_TONE[l.status]}>
            {t(`dispute.lf.status.${l.status}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'status',
          options: LOST_FOUND_STATUSES.map((value) => ({
            value,
            label: t(`dispute.lf.status.${value}`),
          })),
        },
      },
      {
        id: 'reportedAt',
        header: t('dispute.lf.col.reported'),
        width: 124,
        dataType: 'date',
        sortField: 'reportedAt',
        cell: (l) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(l.reportedAt, { style: 'day-month-time', language })}
          </span>
        ),
      },
    ],
    [language, t],
  )

  /* ── row actions · §11.2, declared for every row ──────────────────── */

  const disputeActions: RowAction<Dispute>[] = useMemo(
    () => [
      {
        label: t('dispute.action.take'),
        onSelect: (d) => void handleTake(d),
        disabled: (d) => !canWrite || d.status === 'resolved' || d.ownerId !== null,
        reason: (d) => {
          if (!canWrite) return t('dispute.action.take.blocked.permission')
          if (d.status === 'resolved') return t('dispute.action.take.blocked.resolved')
          if (d.ownerId !== null) {
            return t('dispute.action.take.blocked.owned', { name: d.ownerName ?? d.ownerId })
          }
          return null
        },
      },
      {
        label: t('dispute.action.resolve'),
        onSelect: (d) => setActiveDispute(d),
        disabled: (d) => !canWrite || d.status === 'resolved',
        reason: (d) => {
          if (!canWrite) return t('dispute.action.resolve.blocked.permission')
          if (d.status === 'resolved') {
            return t('dispute.action.resolve.blocked.resolved', {
              date: formatDate(d.resolution?.resolvedAt ?? d.filedAt, {
                style: 'day-month',
                language,
              }),
            })
          }
          return null
        },
      },
    ],
    [canWrite, handleTake, language, t],
  )

  const lfActions: RowAction<LostFoundItem>[] = useMemo(
    () => [
      {
        label: t('dispute.lf.action.found'),
        onSelect: (l) => void handleAdvance(l),
        disabled: (l) => !canWrite || l.status !== 'searching' || l.driverId === null,
        reason: (l) => {
          if (!canWrite) return t('dispute.lf.action.found.blocked.permission')
          if (l.status !== 'searching') return t('dispute.lf.action.found.blocked.past')
          if (l.driverId === null) return t('dispute.lf.action.found.blocked.noCaptain')
          return null
        },
      },
      {
        label: t('dispute.lf.action.returned'),
        onSelect: (l) => void handleAdvance(l),
        disabled: (l) => !canWrite || l.status !== 'with-captain',
        reason: (l) => {
          if (!canWrite) return t('dispute.lf.action.returned.blocked.permission')
          if (l.status === 'searching') return t('dispute.lf.action.returned.blocked.searching')
          if (l.status === 'returned') return t('dispute.lf.action.returned.blocked.done')
          return null
        },
      },
    ],
    [canWrite, handleAdvance, t],
  )

  /* ── render ───────────────────────────────────────────────────────── */

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const onSelectTab = (id: string) =>
    navigate({ pathname: location.pathname, search: withView(location.search, id) })

  const total = onLostFound ? (lostFound.data?.total ?? 0) : (disputes.data?.total ?? 0)
  const meta = onLostFound
    ? t.plural('dispute.lf.meta', { count: total })
    : t.plural('dispute.meta', { count: total })

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      {onLostFound ? (
        <DataTable
          table={lfTable}
          rows={lostFound.data?.items ?? []}
          columns={lfColumns}
          getRowId={(l) => l.id}
          status={lostFound.status}
          total={total}
          t={t}
          language={language}
          tableId="support-lost-found"
          view={activeTab}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          searchPlaceholder={t('dispute.lf.search')}
          rowActions={lfActions}
          rowActionsWidth={224}
          firstRun={{
            heading: t('dispute.lf.empty.heading'),
            body: t('dispute.lf.empty.body'),
            actions: [],
          }}
          noMatch={{ message: t('dispute.lf.empty.noMatch') }}
          error={{ message: t('dispute.lf.error.read'), onRetry: lostFound.refetch }}
        />
      ) : (
        <DataTable
          table={disputeTable}
          rows={disputes.data?.items ?? []}
          columns={disputeColumns}
          getRowId={(d) => d.id}
          status={disputes.status}
          total={total}
          t={t}
          language={language}
          tableId="support-disputes"
          view={activeTab}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          searchPlaceholder={t('dispute.search')}
          /* §6.4 — a filter bound to no visible column. The verdict lives inside
             `resolution`, which has no column of its own, and *"show me every
             claim we declined"* is the first question anyone asks of a settled
             queue. `resolution` is null on an open claim, so the filter matches
             only decided rows by construction. */
          extraFilters={[
            {
              kind: 'select',
              field: 'outcome',
              label: t('dispute.col.outcome'),
              options: DISPUTE_OUTCOMES.map((value) => ({
                value,
                label: t(`dispute.outcome.${value}`),
              })),
            },
          ]}
          rowActions={disputeActions}
          rowActionsWidth={224}
          firstRun={{
            heading: t('dispute.empty.heading'),
            body: t('dispute.empty.body'),
            actions: [],
          }}
          noMatch={{ message: t('dispute.empty.noMatch') }}
          error={{ message: t('dispute.error.read'), onRetry: disputes.refetch }}
        />
      )}

      <ResolveDisputeModal
        dispute={activeDispute}
        open={activeDispute !== null}
        canWrite={canWrite}
        onClose={() => setActiveDispute(null)}
        onConfirm={handleResolve}
        t={t}
        language={language}
      />
    </SingleColumnPage>
  )
}
