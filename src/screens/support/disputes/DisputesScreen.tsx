import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { formatDate } from '@/lib'
import { useIndexTable } from '@/hooks'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { PackageCheck } from 'lucide-react'
import { ResolveDisputeModal, type DisputeItem } from './ResolveDisputeModal'

interface LostFoundItem {
  id: string
  itemDescription: string
  riderName: string
  riderId: string
  driverName: string
  driverId: string
  tripId: string
  status: 'reported' | 'item-found' | 'in-transit' | 'returned'
  reportedAt: string
}

const INITIAL_DISPUTES: DisputeItem[] = [
  {
    id: 'DSP-101',
    kind: 'Toll Discrepancy',
    claimantName: 'Sarah Al-Ghamdi',
    claimantId: 'RDR-1041',
    tripId: 'TRP-1002',
    amountHalalas: 2500,
    status: 'pending',
    filedAt: '2026-06-25T08:15:00+03:00',
    details: 'Airport toll gate was billed twice on quick ride invoice.',
  },
  {
    id: 'DSP-102',
    kind: 'Late Cancellation Charge',
    claimantName: 'Rayan Al-Shehri',
    claimantId: 'RDR-1044',
    tripId: 'TRP-1005',
    amountHalalas: 1500,
    status: 'under-review',
    filedAt: '2026-06-24T18:30:00+03:00',
    details: 'Driver took 15 minutes to arrive; rider cancelled due to excessive wait time.',
  },
  {
    id: 'DSP-103',
    kind: 'Vehicle Interior Damage',
    claimantName: 'Abdullah Al-Otaibi',
    claimantId: 'DRV-0101',
    tripId: 'TRP-1001',
    amountHalalas: 15000,
    status: 'pending',
    filedAt: '2026-06-25T09:00:00+03:00',
    details: 'Beverage spilled on rear seat upholstery requiring steam cleaning.',
  },
]

const INITIAL_LOST_FOUND: LostFoundItem[] = [
  {
    id: 'LF-201',
    itemDescription: 'Apple MacBook Pro in grey sleeve',
    riderName: 'Fahad Al-Dosari',
    riderId: 'RDR-1042',
    driverName: 'Sultan Al-Harbi',
    driverId: 'DRV-0104',
    tripId: 'TRP-1004',
    status: 'item-found',
    reportedAt: '2026-06-25T08:45:00+03:00',
  },
  {
    id: 'LF-202',
    itemDescription: 'Black leather wallet with national ID & bank cards',
    riderName: 'Noura Al-Fahad',
    riderId: 'RDR-1043',
    driverName: 'Khalid Al-Zahrani',
    driverId: 'DRV-0102',
    tripId: 'TRP-1003',
    status: 'in-transit',
    reportedAt: '2026-06-24T20:10:00+03:00',
  },
  {
    id: 'LF-203',
    itemDescription: 'Prescription sunglasses in black Ray-Ban case',
    riderName: 'Yousef Al-Balawi',
    riderId: 'RDR-1045',
    driverName: 'Abdullah Al-Otaibi',
    driverId: 'DRV-0101',
    tripId: 'TRP-1001',
    status: 'returned',
    reportedAt: '2026-06-23T14:20:00+03:00',
  },
]

export function DisputesScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'disputes'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const [disputes, setDisputes] = useState<DisputeItem[]>(INITIAL_DISPUTES)
  const [lostFound, setLostFound] = useState<LostFoundItem[]>(INITIAL_LOST_FOUND)
  const [activeDispute, setActiveDispute] = useState<DisputeItem | null>(null)

  const disputeTable = useIndexTable<DisputeItem>({
    mode: 'index',
    getRowId: (d) => d.id,
  })

  const lfTable = useIndexTable<LostFoundItem>({
    mode: 'index',
    getRowId: (lf) => lf.id,
  })

  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  const handleResolveDispute = (disputeId: string, resolution: string, _refundHalalas: number) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === disputeId ? { ...d, status: 'resolved' } : d))
    )
    toast.success(t('dispute.toast.resolved', { defaultValue: 'Dispute {id} resolved: {res}', id: disputeId, res: resolution }))
  }

  const handleAdvanceLF = (id: string) => {
    setLostFound((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const nextStatus =
          item.status === 'reported'
            ? 'item-found'
            : item.status === 'item-found'
              ? 'in-transit'
              : 'returned'
        return { ...item, status: nextStatus }
      })
    )
    toast.success(t('dispute.toast.lfAdvanced', { defaultValue: 'Lost & Found item status updated' }))
  }

  const disputeColumns: DataColumn<DisputeItem>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.case', { defaultValue: 'Case ID' }),
        width: 110,
        dataType: 'text',
        cell: (d) => <span className="font-mono text-xs font-semibold text-foreground">{d.id}</span>,
      },
      {
        id: 'kind',
        header: t('column.claimType', { defaultValue: 'Claim Category' }),
        width: 200,
        dataType: 'text',
        cell: (d) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{d.kind}</span>
            <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{d.details}</span>
          </div>
        ),
      },
      {
        id: 'claimant',
        header: t('column.claimant', { defaultValue: 'Claimant' }),
        width: 150,
        dataType: 'text',
        cell: (d) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{d.claimantName}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{d.claimantId}</span>
          </div>
        ),
      },
      {
        id: 'trip',
        header: t('column.trip', { defaultValue: 'Related Trip' }),
        width: 110,
        dataType: 'text',
        cell: (d) => <span className="font-mono text-xs text-muted-foreground">{d.tripId}</span>,
      },
      {
        id: 'amount',
        header: t('column.disputedAmount', { defaultValue: 'Disputed' }),
        width: 110,
        align: 'end',
        dataType: 'money',
        cell: (d) => (
          <span className="text-xs font-semibold tabular-nums text-foreground">
            <Money amount={d.amountHalalas} />
          </span>
        ),
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
        width: 110,
        dataType: 'enum',
        cell: (d) => (
          <StatusBadge tone={d.status === 'resolved' ? 'success' : d.status === 'pending' ? 'warning' : 'info'}>
            {d.status}
          </StatusBadge>
        ),
      },
      {
        id: 'filedAt',
        header: t('column.filed', { defaultValue: 'Filed' }),
        width: 120,
        dataType: 'date',
        cell: (d) => <span className="text-[11px] text-muted-foreground">{formatDate(d.filedAt, { language })}</span>,
      },
      {
        id: 'actions',
        header: '',
        width: 100,
        align: 'end',
        cell: (d) =>
          canWrite && d.status !== 'resolved' ? (
            <Button
              size="xs"
              onClick={() => setActiveDispute(d)}
            >
              {t('dispute.action.resolve', { defaultValue: 'Resolve Claim' })}
            </Button>
          ) : null,
      },
    ],
    [canWrite, language, t]
  )

  const lfColumns: DataColumn<LostFoundItem>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.case', { defaultValue: 'Case ID' }),
        width: 110,
        dataType: 'text',
        cell: (lf) => <span className="font-mono text-xs font-semibold text-foreground">{lf.id}</span>,
      },
      {
        id: 'item',
        header: t('column.item', { defaultValue: 'Item Description' }),
        width: 200,
        dataType: 'text',
        cell: (lf) => <span className="text-xs font-medium text-foreground">{lf.itemDescription}</span>,
      },
      {
        id: 'rider',
        header: t('column.rider', { defaultValue: 'Rider' }),
        width: 150,
        dataType: 'text',
        cell: (lf) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{lf.riderName}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{lf.riderId}</span>
          </div>
        ),
      },
      {
        id: 'driver',
        header: t('column.captain', { defaultValue: 'Captain & Trip' }),
        width: 160,
        dataType: 'text',
        cell: (lf) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{lf.driverName}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{lf.tripId}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
        width: 120,
        dataType: 'enum',
        cell: (lf) => (
          <StatusBadge
            tone={
              lf.status === 'returned'
                ? 'success'
                : lf.status === 'in-transit'
                  ? 'info'
                  : lf.status === 'item-found'
                    ? 'new'
                    : 'warning'
            }
          >
            {lf.status}
          </StatusBadge>
        ),
      },
      {
        id: 'reportedAt',
        header: t('column.reported', { defaultValue: 'Reported' }),
        width: 120,
        dataType: 'date',
        cell: (lf) => <span className="text-[11px] text-muted-foreground">{formatDate(lf.reportedAt, { language })}</span>,
      },
      {
        id: 'actions',
        header: '',
        width: 130,
        align: 'end',
        cell: (lf) =>
          canWrite && lf.status !== 'returned' ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleAdvanceLF(lf.id)}
              className="gap-1"
            >
              <PackageCheck className="h-3.5 w-3.5 text-muted-foreground" />
              {lf.status === 'reported'
                ? t('dispute.markFound', { defaultValue: 'Mark Found' })
                : lf.status === 'item-found'
                  ? t('dispute.inTransit', { defaultValue: 'In Transit' })
                  : t('dispute.handoverReturned', { defaultValue: 'Hand Over' })}
            </Button>
          ) : null,
      },
    ],
    [canWrite, language, t]
  )

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} t={t} dir={dir} />}>
      {activeTab === 'lost-and-found' ? (
        <DataTable
          table={lfTable}
          rows={lostFound}
          columns={lfColumns}
          getRowId={(lf) => lf.id}
          status="content"
          total={lostFound.length}
          t={t}
          language={language}
          tableId="support-lost-found"
          view={activeTab}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
          searchPlaceholder={t('dispute.searchPlaceholder', { defaultValue: 'Search cases by ID or user...' })}
          firstRun={{
            heading: t('dispute.lf.empty.heading', { defaultValue: 'No lost property reports' }),
            body: t('dispute.lf.empty.body', { defaultValue: 'Items reported lost in vehicles during trips appear here.' }),
            actions: [],
          }}
          noMatch={{ message: t('dispute.empty.noMatch', { defaultValue: 'No records match your filter' }) }}
          error={{ message: t('dispute.error.read', { defaultValue: 'Failed to load records' }), onRetry: () => {} }}
        />
      ) : (
        <DataTable
          table={disputeTable}
          rows={disputes}
          columns={disputeColumns}
          getRowId={(d) => d.id}
          status="content"
          total={disputes.length}
          t={t}
          language={language}
          tableId="support-disputes"
          view={activeTab}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
          searchPlaceholder={t('dispute.searchPlaceholder', { defaultValue: 'Search cases by ID or user...' })}
          firstRun={{
            heading: t('dispute.empty.heading', { defaultValue: 'No active disputes' }),
            body: t('dispute.empty.body', { defaultValue: 'Customer fare adjustments and property damage claims appear here.' }),
            actions: [],
          }}
          noMatch={{ message: t('dispute.empty.noMatch', { defaultValue: 'No disputes match your filter' }) }}
          error={{ message: t('dispute.error.read', { defaultValue: 'Failed to load disputes' }), onRetry: () => {} }}
        />
      )}

      <ResolveDisputeModal
        dispute={activeDispute}
        open={!!activeDispute}
        onClose={() => setActiveDispute(null)}
        onConfirm={handleResolveDispute}
        t={t}
      />
    </SingleColumnPage>
  )
}
