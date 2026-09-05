/**
 * Support › Tickets — a §8.4 work queue (S-1, SUPPORT-UX-PLAN.md §5.1).
 * `QueuePage` + `QueueTable`, the shared `OwnerChip`, `SlaCell`, R5a's banner
 * and marker; `Resolve` keeps D18's undo, `Reopen` is its declared inverse.
 * Bulk offers `Claim selected` and nothing else (S-12, §8.4 rule).
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import {
  claimTicket,
  listTickets,
  liveClaim,
  releaseTicket,
  reopenTicket,
  resolveTicket,
} from '@/data/clients'
import type { IsoDateTime, Paginated, SubTabRoute, Ticket } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translator } from '@/lib'
import type { DataColumn } from '@/components/DataTable'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { useShell } from '@/shell/ShellContext'
import {
  Absent,
  BreachBanner,
  Cell,
  DateCell,
  MutedCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  SubjectIdentity,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type RowFailure,
} from '@/screens/queues'
import { toastOutcome } from '@/commands'
import { setRefusal } from '../../operations/bulkRefusal'
import { withFallback } from '../../operations/localCopy'
import { runningTicketClock, ticketIsDecided } from './clock'
import { NewTicketModal } from './NewTicketModal'
import { PRIORITY_TONE, STATUS_TONE } from './tone'
import { TICKETS_EN } from './copy'

/** §4.6 Q-32: a queue lands on the work nobody holds. */
const DEFAULT_VIEW = 'unassigned'

const CLEARED_BODY: Readonly<Record<string, string>> = {
  unassigned: 'ticket.empty.cleared.unassigned',
  mine: 'ticket.empty.cleared.mine',
  open: 'ticket.empty.cleared.open',
  waiting: 'ticket.empty.cleared.waiting',
  done: 'ticket.empty.cleared.done',
}

export function TicketsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const location = useLocation()
  /* Memoised: `withFallback` returns a new function per call and `t` sits in deps. */
  const t = useMemo(() => withFallback(shell.language.t, TICKETS_EN), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNowIso(15)

  const { tabs, activeTab, selectTab } = useQueueViews(row, DEFAULT_VIEW, t)
  const { meta, onTotal } = useQueueMeta(t, language, 'ticket.meta')

  const table = useIndexTable<Ticket>({
    mode: 'queue',
    getRowId: (ticket) => ticket.id,
    initialView: activeTab,
    /* AC-217: breached first, then the running deadline; `No clock` last. */
    initialSort: { field: 'urgency', dir: 'asc' },
    bulkClaim: true,
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<Ticket>>((signal) => listTickets(params, signal), {
    deps: [params],
    cacheKey: 'tickets.list',
  })

  /* R5a (a): live tickets past either promise, counted over the whole queue. */
  const breached = useAsync<Paginated<Ticket>>(
    (signal) =>
      listTickets({ pageSize: 1, filters: [{ field: 'breached', op: 'eq', value: true }] }, signal),
    { deps: ['breached'], cacheKey: 'tickets.list' },
  )

  const actions = useRowActions<Ticket>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [claimingMany, setClaimingMany] = useState(false)
  const [creating, setCreating] = useState(false)

  const rows = actions.rows(data.data?.items ?? [])
  const scoped = table.filters.some((filter) => filter.field === 'breached')
  const canWrite = shell.permissions.permissions.includes('manage_tickets') && !shell.isFrozen
  const currentUserId = shell.session?.userId ?? ''

  /* ── ownership (§4.2) ─────────────────────────────────────────────── */

  function claim(ticket: Ticket, takeOver: boolean) {
    void actions.run({
      id: ticket.id,
      errorKey: 'ticket.error.row.claim',
      toastKey: takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      action: () => claimTicket(ticket.id, undefined, undefined, { takeOver }),
    }).then((ok) => ok && breached.refetch())
    setConfirm(null)
  }

  /** AC-S-10: the confirmation names the operator who loses the ticket. */
  function askTakeOver(ticket: Ticket) {
    const owner = liveClaim(ticket.claim)?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(ticket, true),
    })
  }

  function release(ticket: Ticket) {
    void actions.run({
      id: ticket.id,
      errorKey: 'ticket.error.row.release',
      toastKey: 'queue.toast.released',
      action: () => releaseTicket(ticket.id),
    })
  }

  /* ── dispositions ─────────────────────────────────────────────────── */

  /** D18: no dialog, because the inverse is one press away on the toast. */
  function resolve(ticket: Ticket) {
    void actions
      .run({
        id: ticket.id,
        errorKey: 'ticket.error.row.resolve',
        action: () => resolveTicket(ticket.id),
      })
      .then((ok) => {
        if (!ok) return
        toastOutcome(
          {
            message: t('ticket.toast.resolved', { id: ticket.id }),
            undo: {
              label: t('command.undo'),
              run: async () => {
                await reopenTicket(ticket.id)
                data.refetch()
              },
              doneMessage: t('ticket.toast.resolved.undone.one', { id: ticket.id }),
              failedMessage: t('ticket.toast.resolved.undoFailed.one', { id: ticket.id }),
            },
          },
          t,
        )
      })
  }

  function reopen(ticket: Ticket) {
    void actions.run({
      id: ticket.id,
      errorKey: 'ticket.error.row.reopen',
      toastKey: 'ticket.toast.reopened.row',
      action: () => reopenTicket(ticket.id),
    })
  }

  /* ── the bulk bar (§9.3, D21): claims only ────────────────────────── */

  const selected = rows.filter((ticket) => table.selectedIds.has(ticket.id))
  const claimRefusal = setRefusal({
    targets: selected,
    getId: (ticket) => ticket.id,
    isBlocked: (ticket) => ticketIsDecided(ticket) || liveClaim(ticket.claim) !== null,
    roleReason: canWrite ? null : t('ticket.action.claim.blocked.permission'),
    blockedKeyPrefix: 'ticket.bulk.claim.blocked',
    t,
    language,
  })

  async function claimSelected(ids: ReadonlySet<string>) {
    setClaimingMany(true)
    try {
      await Promise.all([...ids].map((id) => claimTicket(id, undefined, undefined, { takeOver: false })))
      table.clearSelection()
      toast(
        ids.size === 1
          ? t('queue.toast.claimed')
          : t('ticket.toast.claimed.other', { count: formatCount(ids.size, language) }),
      )
    } catch {
      toast(t('ticket.error.row.claim'))
    } finally {
      setClaimingMany(false)
      data.refetch()
    }
  }

  const columns = ticketColumns({
    t,
    language,
    now,
    canWrite,
    currentUserId,
    detailHref: (id) => `/support/tickets/${id}${location.search}`,
    failure: actions.failure,
    onClaim: (ticket) => claim(ticket, false),
    onRelease: release,
    onTakeOver: askTakeOver,
  })

  return (
    <QueuePage
      row={row}
      meta={meta}
      t={t}
      dir={dir}
      primaryAction={{
        label: t('ticket.new'),
        onClick: () => setCreating(true),
        disabled: !canWrite,
        reason: canWrite ? null : t('ticket.action.claim.blocked.permission'),
      }}
    >
      <NewTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          setCreating(false)
          toast.success(t('ticket.toast.created', { id: created.id }))
          data.refetch()
          breached.refetch()
        }}
        t={t}
        language={language}
      />
      <BreachBanner
        id="support-tickets-sla"
        count={breached.data?.total ?? 0}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="ticket.banner.one"
        otherKey="ticket.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(ticket) => ticket.id}
        columns={columns}
        tableId="support-tickets"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('ticket.search')}
        extraFilters={[
          {
            field: 'breached',
            label: t('queue.filter.breached'),
            kind: 'boolean',
            trueLabel: t('queue.filter.breached.yes'),
            falseLabel: t('queue.filter.breached.no'),
          },
        ]}
        /* R5a: the same predicate as the marker and the pill. */
        isRowCritical={(ticket) => runningTicketClock(ticket, now).result.breached}
        /* One disposition per view: `Done` holds decided rows and offers
           `Reopen`; every other view holds live rows and offers `Resolve`. The
           counterpart is stated on the detail header (§11.2); repeating its
           refusal on every row here would level the pitch up (R20). */
        rowActions={
          activeTab === 'done'
            ? [
                {
                  label: t('ticket.action.reopen'),
                  onSelect: reopen,
                  disabled: (ticket) => !canWrite || !ticketIsDecided(ticket),
                  reason: (ticket) =>
                    !canWrite
                      ? t('ticket.action.reopen.blocked.permission')
                      : ticketIsDecided(ticket)
                        ? null
                        : t('ticket.action.reopen.blocked.open', {
                            status: t(`ticket.status.${ticket.status}`),
                          }),
                },
              ]
            : [
                {
                  label: t('ticket.action.resolve'),
                  onSelect: resolve,
                  disabled: (ticket) => !canWrite || ticketIsDecided(ticket),
                  reason: (ticket) =>
                    !canWrite
                      ? t('ticket.action.resolve.blocked.permission')
                      : ticketIsDecided(ticket)
                        ? t('ticket.action.resolve.blocked.done', {
                            status: t(`ticket.status.${ticket.status}`),
                          })
                        : null,
                },
              ]
        }
        rowActionsWidth={112}
        bulkActions={[
          {
            label: t('ticket.bulk.claim'),
            onClick: (ids) => void claimSelected(ids),
            disabled: claimRefusal.refused || claimingMany,
            reason: claimRefusal.reason,
            eligibleIds: claimRefusal.eligibleIds,
          },
        ]}
        cleared={{
          heading: t('ticket.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'ticket.empty.cleared.unassigned'),
        }}
        firstRun={{
          heading: t('ticket.empty.heading'),
          body: t('ticket.empty.body'),
          actions: [{ label: t('ticket.empty.firstRun.action'), onClick: () => selectTab('done') }],
        }}
        noMatch={{ message: t('ticket.empty.noMatch') }}
        error={{ message: t('ticket.error.read'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ─────────────────────────────── columns ───────────────────────────────── */

interface TicketDeps {
  /* `Translator`, not `Translate`: the owner chip pluralises (T5.12). */
  t: Translator
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  detailHref: (id: string) => string
  failure: (id: string) => RowFailure | undefined
  onClaim: (ticket: Ticket) => void
  onRelease: (ticket: Ticket) => void
  onTakeOver: (ticket: Ticket) => void
}

/** §7.3 budget: `96 + 120 + 136 + 176 = 528`, plus the identity's `minWidth: 200`. */
export function ticketColumns(deps: TicketDeps): ReadonlyArray<DataColumn<Ticket>> {
  const { t, language, now } = deps

  return [
    {
      id: 'ticket',
      emphasis: 'primary',
      csv: (ticket) => ticket.subject,
      header: t('ticket.col.ticket'),
      alwaysVisible: true,
      minWidth: 200,
      dataType: 'text',
      sortField: 'subject',
      cell: (ticket) => {
        const clock = runningTicketClock(ticket, now)
        return (
          <>
            {clock.result.breached && <RowCriticalMarker />}
            <SubjectIdentity
              to={deps.detailHref(ticket.id)}
              title={ticket.subject}
              /* §7.7: who is asking, and the reason as a sentence. One key. */
              secondary={t('ticket.line', {
                requester: ticket.entityName,
                reason: reasonLabel(t, ticket.reasonCode),
              })}
              label={t('ticket.a11y.open', { id: ticket.id })}
            />
          </>
        )
      },
    },
    {
      id: 'priority',
      emphasis: 'data',
      header: t('ticket.col.priority'),
      width: 96,
      dataType: 'enum',
      sortField: 'priority',
      filter: {
        kind: 'select',
        field: 'priority',
        options: (['Critical', 'High', 'Medium', 'Low'] as const).map((value) => ({
          value,
          label: t(`ticket.priority.${value}`),
        })),
      },
      /* R4-10 / Safety's precedent: only the two escalated levels wear a chip;
         `Medium` and `Low` are words (D-21, H7's one-badge budget). */
      cell: (ticket) =>
        ticket.priority === 'Low' || ticket.priority === 'Medium' ? (
          <Cell className="text-muted-foreground">{t(`ticket.priority.${ticket.priority}`)}</Cell>
        ) : (
          <Cell>
            <StatusBadge tone={PRIORITY_TONE[ticket.priority]}>
              {t(`ticket.priority.${ticket.priority}`)}
            </StatusBadge>
          </Cell>
        ),
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('ticket.col.status'),
      width: 120,
      dataType: 'enum',
      sortField: 'status',
      filter: {
        kind: 'select',
        field: 'status',
        options: (['open', 'in-progress', 'waiting', 'resolved', 'closed'] as const).map(
          (value) => ({ value, label: t(`ticket.status.${value}`) }),
        ),
      },
      cell: (ticket) => (
        <Cell>
          <StatusBadge tone={STATUS_TONE[ticket.status]}>
            {t(`ticket.status.${ticket.status}`)}
          </StatusBadge>
          {/* B4: the rating rides the decided row as text, never a second chip. */}
          {ticket.csat !== null && (
            <span className="ms-2 text-xs text-muted-foreground">
              {t('ticket.csat.short', { score: formatCount(ticket.csat.score, language) })}
            </span>
          )}
        </Cell>
      ),
    },
    {
      id: 'sla',
      emphasis: 'data',
      header: t('queue.col.sla'),
      width: 136,
      dataType: 'date',
      cell: (ticket) => {
        const clock = runningTicketClock(ticket, now)
        return (
          <SlaCell
            result={clock.result}
            dueAt={clock.input?.dueAt ?? null}
            t={t}
            language={language}
            promiseLabel={t(`ticket.promise.${clock.promise}`)}
          />
        )
      },
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
      cell: (ticket) => {
        const failed = deps.failure(ticket.id)
        if (failed) {
          return (
            <MutedCell title={failed.message}>
              <button
                type="button"
                className="rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={failed.retry}
              >
                {t('queue.error.retry')}
              </button>
            </MutedCell>
          )
        }
        if (ticketIsDecided(ticket)) {
          return ticket.ownerName === null ? <Absent /> : <MutedCell>{ticket.ownerName}</MutedCell>
        }
        return (
          <OwnerChip
            claim={ticket.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={deps.canWrite}
            disabledReason={t('ticket.action.claim.blocked.permission')}
            onClaim={() => deps.onClaim(ticket)}
            onRelease={() => deps.onRelease(ticket)}
            onTakeOver={() => deps.onTakeOver(ticket)}
          />
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 104,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (ticket) => <MutedCell className="font-mono">{ticket.id}</MutedCell>,
    },
    {
      id: 'category',
      header: t('ticket.col.category'),
      width: 136,
      dataType: 'enum',
      defaultHidden: true,
      sortField: 'category',
      filter: { kind: 'text', field: 'category' },
      cell: (ticket) => <Cell>{ticket.category}</Cell>,
    },
    {
      id: 'reasonCode',
      header: t('ticket.col.reasonCode'),
      width: 176,
      dataType: 'id',
      defaultHidden: true,
      filter: { kind: 'text', field: 'reasonCode' },
      cell: (ticket) => (
        <MutedCell className="font-mono">
          <bdi>{ticket.reasonCode}</bdi>
        </MutedCell>
      ),
    },
    {
      id: 'channel',
      header: t('ticket.col.channel'),
      width: 112,
      dataType: 'enum',
      defaultHidden: true,
      cell: (ticket) =>
        ticket.channel === null ? (
          <Absent word={t('ticket.channel.unknown')} />
        ) : (
          <Cell>{t(`ticket.channel.${ticket.channel}`)}</Cell>
        ),
    },
    {
      id: 'createdAt',
      header: t('ticket.col.opened'),
      width: 136,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'createdAt',
      cell: (ticket) => (
        <DateCell>
          <bdi>{formatDate(ticket.createdAt, { style: 'day-month-time', language })}</bdi>
        </DateCell>
      ),
    },
  ]
}
