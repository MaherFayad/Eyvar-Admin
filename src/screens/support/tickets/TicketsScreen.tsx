import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { claimTicket, listTickets, resolveTicket } from '@/data/clients/tickets'
import type { Paginated, SubTabRoute, Ticket } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

const PRIORITY_TONES: Record<string, 'warning' | 'info' | 'neutral' | 'new' | 'success'> = {
  Critical: 'warning',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'new'> = {
  open: 'warning',
  'in-progress': 'info',
  waiting: 'neutral',
  resolved: 'success',
  closed: 'neutral',
}

export function TicketsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'open'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Ticket>({
    mode: 'index',
    getRowId: (tk) => tk.id,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  const queryParams = useMemo(
    () => ({
      ...table.params,
      view: activeTab,
    }),
    [table.params, activeTab]
  )

  const data = useAsync<Paginated<Ticket>>(
    (signal) => listTickets(queryParams, signal),
    { deps: [queryParams] }
  )

  const [overrides, setOverrides] = useState<Record<string, Partial<Ticket>>>({})

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return raw.map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item))
  }, [data.data?.items, overrides])

  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  const handleClaim = async (ticketId: string) => {
    try {
      await claimTicket(ticketId, currentUserId, currentUserName)
      setOverrides((prev) => ({
        ...prev,
        [ticketId]: { ...prev[ticketId], ownerId: currentUserId, ownerName: currentUserName, status: 'in-progress' },
      }))
      toast.success(t('support.toast.claimed', { defaultValue: 'Ticket {id} assigned to you', id: ticketId }))
    } catch {
      toast.error(t('support.toast.claimError', { defaultValue: 'Failed to claim ticket' }))
    }
  }

  const handleResolve = async (ticketId: string) => {
    try {
      await resolveTicket(ticketId)
      setOverrides((prev) => ({
        ...prev,
        [ticketId]: { ...prev[ticketId], status: 'resolved' },
      }))
      toast.success(t('support.toast.resolved', { defaultValue: 'Ticket {id} resolved', id: ticketId }))
    } catch {
      toast.error(t('support.toast.resolveError', { defaultValue: 'Failed to resolve ticket' }))
    }
  }

  const columns: DataColumn<Ticket>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.ticket', { defaultValue: 'Ticket' }),
        width: 120,
        dataType: 'text',
        cell: (tk) => (
          <button
            type="button"
            onClick={() => navigate(`/support/tickets/${tk.id}`)}
            className="font-mono text-xs font-semibold text-foreground hover:underline focus:outline-none"
          >
            {tk.id}
          </button>
        ),
      },
      {
        id: 'subject',
        header: t('column.subject', { defaultValue: 'Subject' }),
        width: 260,
        dataType: 'text',
        cell: (tk) => (
          <button
            type="button"
            onClick={() => navigate(`/support/tickets/${tk.id}`)}
            className="text-xs font-medium text-foreground hover:underline text-left max-w-[260px] truncate block"
          >
            {tk.subject}
          </button>
        ),
      },
      {
        id: 'requester',
        header: t('column.requester', { defaultValue: 'Requester' }),
        width: 160,
        dataType: 'text',
        cell: (tk) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{tk.entityName}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{tk.entityId}</span>
          </div>
        ),
      },
      {
        id: 'category',
        header: t('column.category', { defaultValue: 'Category' }),
        width: 140,
        dataType: 'enum',
        cell: (tk) => (
          <div className="flex flex-col text-xs">
            <span className="text-foreground">{tk.category}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{tk.reasonCode}</span>
          </div>
        ),
      },
      {
        id: 'priority',
        header: t('column.priority', { defaultValue: 'Priority' }),
        width: 110,
        dataType: 'enum',
        cell: (tk) => (
          <StatusBadge tone={PRIORITY_TONES[tk.priority] ?? 'neutral'}>
            {tk.priority}
          </StatusBadge>
        ),
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
        width: 110,
        dataType: 'enum',
        cell: (tk) => (
          <StatusBadge tone={STATUS_TONES[tk.status] ?? 'neutral'}>
            {tk.status}
          </StatusBadge>
        ),
      },
      {
        id: 'owner',
        header: t('column.owner', { defaultValue: 'Owner' }),
        width: 130,
        dataType: 'text',
        cell: (tk) =>
          tk.ownerName ? (
            <span className="text-xs text-foreground font-medium">{tk.ownerName}</span>
          ) : canWrite ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleClaim(tk.id)}
              className="h-6 text-[11px] px-2"
            >
              {t('support.claim', { defaultValue: 'Claim' })}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          ),
      },
      {
        id: 'createdAt',
        header: t('column.created', { defaultValue: 'Opened' }),
        width: 130,
        dataType: 'date',
        cell: (tk) => (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(tk.createdAt, { language })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 60,
        align: 'end',
        cell: (tk) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('action.more', { defaultValue: 'More' })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/support/tickets/${tk.id}`)}>
                {t('support.openTicket', { defaultValue: 'Open Conversation' })}
              </DropdownMenuItem>
              {canWrite && !tk.ownerId && (
                <DropdownMenuItem onClick={() => handleClaim(tk.id)}>
                  {t('support.claimTicket', { defaultValue: 'Claim Ticket' })}
                </DropdownMenuItem>
              )}
              {canWrite && tk.status !== 'resolved' && (
                <DropdownMenuItem onClick={() => handleResolve(tk.id)}>
                  {t('support.markResolved', { defaultValue: 'Mark Resolved' })}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canWrite, currentUserId, currentUserName, language, navigate, t]
  )

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0
  const meta = t('support.meta.count', {
    defaultValue: '{count} tickets',
    count: formatCount(total, language),
  })

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      <DataTable
        table={table}
        rows={rows}
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
        onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
        searchPlaceholder={t('support.searchPlaceholder', { defaultValue: 'Search tickets by ID, subject, or customer...' })}
        firstRun={{
          heading: t('support.empty.heading', { defaultValue: 'No support tickets' }),
          body: t('support.empty.body', { defaultValue: 'Inbound customer care tickets and operator call wrap-ups appear here.' }),
          actions: [],
        }}
        noMatch={{ message: t('support.empty.noMatch', { defaultValue: 'No tickets match your filter' }) }}
        error={{ message: t('support.error.read', { defaultValue: 'Failed to load tickets' }), onRetry: data.refetch }}
      />
    </SingleColumnPage>
  )
}
