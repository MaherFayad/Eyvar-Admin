import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SubTabRoute } from '@/data/types'
import { formatDate } from '@/lib'
import { useIndexTable } from '@/hooks'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'

interface ActivityLogItem {
  id: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  category: 'auth' | 'financial' | 'operations' | 'support' | 'policy'
  targetEntityId: string
  targetEntityType: string
  ipAddress: string
  timestamp: string
  details: string
}

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'ACT-901',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    actorRole: 'Owner',
    action: 'payout.release',
    category: 'financial',
    targetEntityId: 'PAY-1002',
    targetEntityType: 'PayoutBatch',
    ipAddress: '197.240.11.45',
    timestamp: '2026-06-25T08:42:00+03:00',
    details: 'Released weekly payout batch of 48,250 SAR to 42 captains.',
  },
  {
    id: 'ACT-902',
    actorId: 'USR-2',
    actorName: 'Tariq Al-Ghamdi',
    actorRole: 'Ops Manager',
    action: 'driver.approve',
    category: 'operations',
    targetEntityId: 'APP-104',
    targetEntityType: 'Applicant',
    ipAddress: '197.240.11.49',
    timestamp: '2026-06-25T08:15:00+03:00',
    details: 'Approved applicant Sultan Al-Harbi (DRV-0104) following document verification.',
  },
  {
    id: 'ACT-903',
    actorId: 'USR-3',
    actorName: 'Lina Al-Otaibi',
    actorRole: 'Support Specialist',
    action: 'ticket.resolve',
    category: 'support',
    targetEntityId: 'TCK-1001',
    targetEntityType: 'Ticket',
    ipAddress: '197.240.12.18',
    timestamp: '2026-06-25T07:50:00+03:00',
    details: 'Resolved ticket regarding toll dispute and credited 15 SAR goodwill refund.',
  },
  {
    id: 'ACT-904',
    actorId: 'USR-1',
    actorName: 'Sarah Al-Rashid',
    actorRole: 'Owner',
    action: 'policy.update',
    category: 'policy',
    targetEntityId: 'ZONE-01',
    targetEntityType: 'PricingZone',
    ipAddress: '197.240.11.45',
    timestamp: '2026-06-24T16:20:00+03:00',
    details: 'Updated base fare from 12.00 to 14.00 SAR for Riyadh City Core.',
  },
  {
    id: 'ACT-905',
    actorId: 'USR-4',
    actorName: 'Noura Al-Fahad',
    actorRole: 'Support Specialist',
    action: 'auth.login_success',
    category: 'auth',
    targetEntityId: 'USR-4',
    targetEntityType: 'TeamUser',
    ipAddress: '197.240.14.99',
    timestamp: '2026-06-24T08:02:00+03:00',
    details: 'Successful 2FA TOTP authentication from Chrome macOS.',
  },
]

export function AdminActivityScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const [logs] = useState<ActivityLogItem[]>(INITIAL_LOGS)

  const table = useIndexTable<ActivityLogItem>({
    mode: 'index',
    getRowId: (item) => item.id,
    initialSort: { field: 'timestamp', dir: 'desc' },
  })

  const filteredLogs = useMemo(() => {
    if (activeTab === 'all') return logs
    return logs.filter((l) => l.category === activeTab)
  }, [logs, activeTab])

  const columns: DataColumn<ActivityLogItem>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.event', { defaultValue: 'Event' }),
        width: 110,
        dataType: 'text',
        cell: (item) => <span className="font-mono text-xs font-semibold text-foreground">{item.id}</span>,
      },
      {
        id: 'actor',
        header: t('column.operator', { defaultValue: 'Operator' }),
        width: 160,
        dataType: 'text',
        cell: (item) => (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-foreground">{item.actorName}</span>
            <span className="text-[11px] text-muted-foreground">{item.actorRole} · {item.actorId}</span>
          </div>
        ),
      },
      {
        id: 'action',
        header: t('column.action', { defaultValue: 'Action' }),
        width: 150,
        dataType: 'text',
        cell: (item) => <span className="font-mono text-xs font-medium text-foreground">{item.action}</span>,
      },
      {
        id: 'category',
        header: t('column.category', { defaultValue: 'Category' }),
        width: 110,
        dataType: 'enum',
        cell: (item) => (
          <StatusBadge
            tone={
              item.category === 'financial'
                ? 'warning'
                : item.category === 'auth'
                  ? 'info'
                  : item.category === 'policy'
                    ? 'new'
                    : 'neutral'
            }
          >
            {item.category}
          </StatusBadge>
        ),
      },
      {
        id: 'details',
        header: t('column.details', { defaultValue: 'Audit Details' }),
        width: 280,
        dataType: 'text',
        cell: (item) => (
          <div className="flex flex-col text-xs max-w-[280px]">
            <span className="text-foreground truncate">{item.details}</span>
            <span className="font-mono text-[10px] text-muted-foreground">Target: {item.targetEntityId} ({item.targetEntityType})</span>
          </div>
        ),
      },
      {
        id: 'ipAddress',
        header: t('column.ip', { defaultValue: 'IP Address' }),
        width: 120,
        dataType: 'text',
        cell: (item) => <span className="font-mono text-[11px] text-muted-foreground">{item.ipAddress}</span>,
      },
      {
        id: 'timestamp',
        header: t('column.time', { defaultValue: 'Timestamp' }),
        width: 140,
        dataType: 'date',
        cell: (item) => <span className="text-[11px] text-muted-foreground">{formatDate(item.timestamp, { language })}</span>,
      },
    ],
    [language, t]
  )

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.audit.tamperProof', { defaultValue: 'Tamper-Evident Immutable Audit Trail (Append-Only)' })}
          t={t}
          dir={dir}
        />
      }
    >
      <DataTable
        table={table}
        rows={filteredLogs}
        columns={columns}
        getRowId={(item) => item.id}
        status="content"
        total={filteredLogs.length}
        t={t}
        language={language}
        tableId="admin-activity"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
        searchPlaceholder={t('admin.audit.searchPlaceholder', { defaultValue: 'Search audit log by operator, action, or target ID...' })}
        firstRun={{
          heading: t('admin.audit.empty.heading', { defaultValue: 'No audit events recorded' }),
          body: t('admin.audit.empty.body', { defaultValue: 'Operator security and mutating system events are logged here in append-only storage.' }),
          actions: [],
        }}
        noMatch={{ message: t('admin.audit.noMatch', { defaultValue: 'No audit records match your query' }) }}
        error={{ message: t('admin.audit.error', { defaultValue: 'Failed to load audit trail' }), onRetry: () => {} }}
      />
    </SingleColumnPage>
  )
}
