/**
 * Support › Tickets — the index.
 *
 * Rules applied
 *   §11.2      **the row actions are declared for every row and disabled in
 *              place with a reason.** The old screen hid them: `canWrite &&
 *              !tk.ownerId && (<DropdownMenuItem …>)` at `:228` and
 *              `canWrite && tk.status !== 'resolved' && (…)` at `:233`, plus a
 *              `Claim` button in the owner cell at `:190` that vanished when
 *              the ticket was owned. An operator who cannot claim now sees the
 *              control and the sentence saying who has it.
 *   D8-b       two declared actions render as two labelled controls; the kebab
 *              starts at three. That is `DataTable`'s threshold — the old
 *              screen hand-rolled a `DropdownMenu` in an `actions` column,
 *              which is the shape D8-c says to delete once the shared component
 *              owns it.
 *   §9.3       the queue shows its SLA. `slaBreached` is a **stamp**: a decided
 *              ticket does not go on counting, and a passed deadline that was
 *              never breached renders as a date rather than `overdue 3d`.
 *   §7.5       the identity link is a real `<a>`-shaped control, not a `<div
 *              onClick>`. It keeps its focus ring.
 *   AC-74/75   every string is a key in `./copy`.
 *   §4.6 · 1   `view` is passed AFTER `table.params`, so the tab is not
 *              clobbered by the table's own null view.
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { claimTicket, listTickets, resolveTicket } from '@/data/clients'
import type { Paginated, SubTabRoute, Ticket } from '@/data/types'
import { useAsync, useIndexTable, useNow } from '@/hooks'
import { NO_CLOCK, formatDate, formatSlaLabel, slaClock } from '@/lib'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { PRIORITY_TONE, STATUS_TONE } from './tone'

export function TicketsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language
  const now = useNow(15)

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'open'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Ticket>({
    mode: 'index',
    getRowId: (tk) => tk.id,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  /* The tab LAST. `table.params.view` is `null` here and would otherwise
     clobber it — `REMEDIATION-PLAN.md` §4.6 item 1, three live call sites. */
  const queryParams = useMemo(
    () => ({ ...table.params, view: activeTab }),
    [table.params, activeTab],
  )

  const data = useAsync<Paginated<Ticket>>((signal) => listTickets(queryParams, signal), {
    deps: [queryParams],
  })

  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  const openTicket = useCallback(
    (id: string) => navigate(`/support/tickets/${id}`),
    [navigate],
  )

  const handleClaim = useCallback(
    async (ticket: Ticket) => {
      try {
        await claimTicket(ticket.id, currentUserId, currentUserName)
        toast.success(t('ticket.toast.claimed', { id: ticket.id }))
        data.refetch()
      } catch {
        toast.error(t('ticket.toast.claimFailed', { id: ticket.id }))
      }
    },
    [currentUserId, currentUserName, data, t],
  )

  const handleResolve = useCallback(
    async (ticket: Ticket) => {
      try {
        await resolveTicket(ticket.id)
        toast.success(t('ticket.toast.resolved', { id: ticket.id }))
        data.refetch()
      } catch {
        toast.error(t('ticket.toast.resolveFailed', { id: ticket.id }))
      }
    },
    [data, t],
  )

  const columns: DataColumn<Ticket>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('ticket.col.ticket'),
        width: 104,
        dataType: 'text',
        alwaysVisible: true,
        cell: (tk) => (
          /* §7.5 / defect D19 — a real button, keyboard-reachable, with the
             focus ring its primitive ships. Never a `<div onClick>`. */
          <button
            type="button"
            onClick={() => openTicket(tk.id)}
            aria-label={t('ticket.a11y.open', { id: tk.id })}
            className="rounded-sm font-mono text-xs font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {tk.id}
          </button>
        ),
      },
      {
        id: 'subject',
        header: t('ticket.col.subject'),
        minWidth: 240,
        dataType: 'text',
        sortField: 'subject',
        cell: (tk) => (
          <button
            type="button"
            onClick={() => openTicket(tk.id)}
            className="block max-w-full truncate rounded-sm text-start text-xs font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {tk.subject}
          </button>
        ),
        secondaryLine: (tk) => (
          <span className="block truncate text-xs text-muted-foreground">
            {tk.entityName} · {tk.entityId}
          </span>
        ),
      },
      {
        id: 'category',
        header: t('ticket.col.category'),
        width: 150,
        dataType: 'enum',
        cell: (tk) => <span className="text-xs text-foreground">{tk.category}</span>,
        secondaryLine: (tk) => (
          <span className="block font-mono text-xs text-muted-foreground">{tk.reasonCode}</span>
        ),
      },
      {
        id: 'priority',
        header: t('ticket.col.priority'),
        width: 104,
        dataType: 'enum',
        sortField: 'priority',
        cell: (tk) => (
          <StatusBadge tone={PRIORITY_TONE[tk.priority]}>
            {t(`ticket.priority.${tk.priority}`)}
          </StatusBadge>
        ),
      },
      {
        id: 'status',
        header: t('ticket.col.status'),
        width: 140,
        dataType: 'enum',
        sortField: 'status',
        cell: (tk) => (
          <StatusBadge tone={STATUS_TONE[tk.status]}>
            {t(`ticket.status.${tk.status}`)}
          </StatusBadge>
        ),
        secondaryLine: (tk) => (
          <span className="block truncate text-xs text-muted-foreground">
            {tk.ownerName ?? t('ticket.owner.unassigned')}
          </span>
        ),
      },
      {
        id: 'sla',
        header: t('ticket.col.sla'),
        width: 124,
        dataType: 'date',
        cell: (tk) => {
          const terminal = tk.status === 'resolved' || tk.status === 'closed'
          const live = slaClock({ dueAt: tk.slaDueAt, startedAt: tk.createdAt }, now)
          /* The stamp decides. A decided ticket's clock has stopped, and a
             deadline that passed without a breach was a promise KEPT — printing
             `overdue` on either is the queue lying about its own backlog. */
          const clock = terminal || (live.kind === 'breached' && !tk.slaBreached) ? NO_CLOCK : live
          return (
            <StatusBadge tone={tk.slaBreached || clock.band !== 'neutral' ? 'warning' : 'neutral'}>
              {tk.slaBreached ? t('ticket.sla.breached') : formatSlaLabel(clock, t)}
            </StatusBadge>
          )
        },
      },
      {
        id: 'createdAt',
        header: t('ticket.col.opened'),
        width: 116,
        dataType: 'date',
        sortField: 'createdAt',
        cell: (tk) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(tk.createdAt, { style: 'day-month-time', language })}
          </span>
        ),
      },
    ],
    [language, now, openTicket, t],
  )

  /* §11.2 — declared for every row; `disabled` and `reason` do the refusing. */
  const rowActions: RowAction<Ticket>[] = useMemo(
    () => [
      {
        label: t('ticket.action.claim'),
        onSelect: (tk) => void handleClaim(tk),
        disabled: (tk) => !canWrite || tk.status === 'closed' || tk.ownerId !== null,
        reason: (tk) => {
          if (!canWrite) return t('ticket.action.claim.blocked.permission')
          if (tk.status === 'closed') return t('ticket.action.claim.blocked.closed')
          if (tk.ownerId !== null) {
            return t('ticket.action.claim.blocked.owned', { name: tk.ownerName ?? tk.ownerId })
          }
          return null
        },
      },
      {
        label: t('ticket.action.resolve'),
        onSelect: (tk) => void handleResolve(tk),
        disabled: (tk) => !canWrite || tk.status === 'resolved' || tk.status === 'closed',
        reason: (tk) => {
          if (!canWrite) return t('ticket.action.resolve.blocked.permission')
          if (tk.status === 'resolved' || tk.status === 'closed') {
            return t('ticket.action.resolve.blocked.done', {
              status: t(`ticket.status.${tk.status}`),
            })
          }
          return null
        },
      },
    ],
    [canWrite, handleClaim, handleResolve, t],
  )

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t.plural('ticket.meta', { count: total })}
          t={t}
          dir={dir}
        />
      }
    >
      <DataTable
        table={table}
        rows={data.data?.items ?? []}
        columns={columns}
        getRowId={(tk) => tk.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="support-tickets"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) =>
          navigate({ pathname: location.pathname, search: withView(location.search, id) })
        }
        searchPlaceholder={t('ticket.search')}
        rowActions={rowActions}
        rowActionsWidth={200}
        firstRun={{
          heading: t('ticket.empty.heading'),
          body: t('ticket.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('ticket.empty.noMatch') }}
        error={{ message: t('ticket.error.read'), onRetry: data.refetch }}
      />
    </SingleColumnPage>
  )
}
