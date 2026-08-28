import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cancelSubscription, freezeSubscription, listSubscriptions } from '@/data/clients'
import type { Paginated, SubTabRoute, Subscription } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withOverlay, withView } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { ChangeDriverModal } from './ChangeDriverModal'
import { FreezeModal } from './FreezeModal'
import { CancelSettleModal } from './CancelSettleModal'

const STATUS_TONES: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'new'> = {
  active: 'success',
  expiring: 'warning',
  'at-risk': 'warning',
  frozen: 'info',
  cancelled: 'neutral',
  expired: 'neutral',
}

export function SubscriptionsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Subscription>({
    mode: 'index',
    getRowId: (s) => s.id,
    initialSort: { field: 'startedOn', dir: 'desc' },
  })

  const queryParams = useMemo(
    () => ({
      ...table.params,
      view: activeTab,
    }),
    [table.params, activeTab]
  )

  const data = useAsync<Paginated<Subscription>>(
    (signal) => listSubscriptions(queryParams, signal),
    { deps: [queryParams] }
  )

  // Local overrides for optimistic actions
  const [overrides, setOverrides] = useState<Record<string, Partial<Subscription>>>({})

  // Modals state
  const [activeSubForDriver, setActiveSubForDriver] = useState<Subscription | null>(null)
  const [activeSubForFreeze, setActiveSubForFreeze] = useState<Subscription | null>(null)
  const [activeSubForSettle, setActiveSubForSettle] = useState<Subscription | null>(null)

  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return raw.map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item))
  }, [data.data?.items, overrides])

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  const handleChangeDriver = (subId: string, driverId: string, driverName: string) => {
    setOverrides((prev) => ({
      ...prev,
      [subId]: { ...prev[subId], driverId, driverName },
    }))
    toast.success(t('sub.toast.driverChanged', { defaultValue: 'Assigned captain changed to {name}', name: driverName }))
  }

  const handleFreeze = async (subId: string, until: string, _reason: string) => {
    try {
      await freezeSubscription(subId, until)
      setOverrides((prev) => ({
        ...prev,
        [subId]: { ...prev[subId], status: 'frozen', frozenUntil: until },
      }))
      toast.success(t('sub.toast.frozen', { defaultValue: 'Subscription {id} frozen until {date}', id: subId, date: until }))
    } catch {
      toast.error(t('sub.toast.freezeError', { defaultValue: 'Failed to freeze subscription' }))
    }
  }

  const handleCancelSettle = async (subId: string, reason: string) => {
    try {
      await cancelSubscription(subId, reason)
      setOverrides((prev) => ({
        ...prev,
        [subId]: { ...prev[subId], status: 'cancelled', cancellationReason: reason },
      }))
      toast.success(t('sub.toast.cancelled', { defaultValue: 'Subscription {id} cancelled and settled', id: subId }))
    } catch {
      toast.error(t('sub.toast.cancelError', { defaultValue: 'Failed to cancel subscription' }))
    }
  }

  const columns: DataColumn<Subscription>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.subscription', { defaultValue: 'Subscription' }),
        width: 140,
        dataType: 'text',
        cell: (s) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">{s.id}</span>
            <span className="text-[11px] text-muted-foreground">{s.planName}</span>
          </div>
        ),
      },
      {
        id: 'riderName',
        header: t('column.rider', { defaultValue: 'Rider' }),
        width: 160,
        dataType: 'text',
        cell: (s) => (
          <button
            type="button"
            onClick={() => navigate(profileHref(s.riderId))}
            className="flex flex-col text-left focus:outline-none group"
          >
            <span className="text-xs font-medium text-foreground group-hover:underline">{s.riderName}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{s.riderId}</span>
          </button>
        ),
      },
      {
        id: 'driverName',
        header: t('column.captain', { defaultValue: 'Captain' }),
        width: 160,
        dataType: 'text',
        cell: (s) =>
          s.driverId ? (
            <button
              type="button"
              onClick={() => navigate(profileHref(s.driverId!))}
              className="flex flex-col text-left focus:outline-none group"
            >
              <span className="text-xs font-medium text-foreground group-hover:underline">{s.driverName}</span>
              <span className="text-[11px] text-muted-foreground font-mono">{s.driverId}</span>
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {t('sub.unassigned', { defaultValue: 'Unassigned' })}
            </span>
          ),
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
        width: 110,
        dataType: 'enum',
        cell: (s) => (
          <StatusBadge tone={STATUS_TONES[s.status] ?? 'neutral'}>
            {s.status}
          </StatusBadge>
        ),
      },
      {
        id: 'progress',
        header: t('column.progress', { defaultValue: 'Trips' }),
        width: 100,
        align: 'end',
        dataType: 'number',
        cell: (s) => (
          <span className="text-xs tabular-nums text-foreground">
            {s.tripsCompleted} / {s.tripsIncluded}
          </span>
        ),
      },
      {
        id: 'paidHalalas',
        header: t('column.price', { defaultValue: 'Price' }),
        width: 110,
        align: 'end',
        dataType: 'money',
        cell: (s) => (
          <span className="text-xs font-semibold tabular-nums text-foreground">
            <Money amount={s.paidHalalas} />
          </span>
        ),
      },
      {
        id: 'endsOn',
        header: t('column.expires', { defaultValue: 'Expires On' }),
        width: 120,
        dataType: 'date',
        cell: (s) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(s.endsOn, { language })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 60,
        align: 'end',
        cell: (s) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('action.more', { defaultValue: 'More' })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(profileHref(s.riderId))}>
                {t('action.viewRider', { defaultValue: 'View Rider Profile' })}
              </DropdownMenuItem>
              {s.driverId && (
                <DropdownMenuItem onClick={() => navigate(profileHref(s.driverId!))}>
                  {t('action.viewCaptain', { defaultValue: 'View Captain Profile' })}
                </DropdownMenuItem>
              )}
              {canWrite && s.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => setActiveSubForDriver(s)}>
                    {t('sub.action.changeDriver', { defaultValue: 'Change Captain' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveSubForFreeze(s)}>
                    {t('sub.action.freeze', { defaultValue: 'Freeze Package' })}
                  </DropdownMenuItem>
                </>
              )}
              {canWrite && (s.status === 'active' || s.status === 'frozen') && (
                <DropdownMenuItem
                  onClick={() => setActiveSubForSettle(s)}
                  className="text-destructive"
                >
                  {t('sub.action.cancelSettle', { defaultValue: 'Cancel & Settle' })}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canWrite, language, navigate, profileHref, t]
  )

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0
  const meta = t('sub.meta.count', {
    defaultValue: '{count} subscriptions',
    count: formatCount(total, language),
  })

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={meta}
          t={t}
          dir={dir}
        />
      }
    >
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="operations-subscriptions"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
        searchPlaceholder={t('sub.searchPlaceholder', { defaultValue: 'Search subscriptions by ID, rider, or captain...' })}
        firstRun={{
          heading: t('sub.empty.heading', { defaultValue: 'No active subscriptions' }),
          body: t('sub.empty.body', { defaultValue: 'Scheduled school and corporate commuter packages appear here.' }),
          actions: [],
        }}
        noMatch={{ message: t('sub.empty.noMatch', { defaultValue: 'No subscriptions match your query' }) }}
        error={{ message: t('sub.error.read', { defaultValue: 'Failed to load subscriptions' }), onRetry: data.refetch }}
      />

      <ChangeDriverModal
        subscription={activeSubForDriver}
        open={!!activeSubForDriver}
        onClose={() => setActiveSubForDriver(null)}
        onConfirm={handleChangeDriver}
        t={t}
      />

      <FreezeModal
        subscription={activeSubForFreeze}
        open={!!activeSubForFreeze}
        onClose={() => setActiveSubForFreeze(null)}
        onConfirm={handleFreeze}
        t={t}
      />

      <CancelSettleModal
        subscription={activeSubForSettle}
        open={!!activeSubForSettle}
        onClose={() => setActiveSubForSettle(null)}
        onConfirm={handleCancelSettle}
        t={t}
      />
    </SingleColumnPage>
  )
}
