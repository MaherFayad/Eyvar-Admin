import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { flagTrip, listTrips, unflagTrip } from '@/data/clients/trips'
import type { Paginated, SubTabRoute, Trip } from '@/data/types'
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
import { Flag, MoreHorizontal } from 'lucide-react'
import { FlagTripModal } from './FlagTripModal'
import { TripDetailDrawer } from './TripDetailDrawer'

const STATUS_TONES: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'new'> = {
  done: 'success',
  'in-progress': 'info',
  assigned: 'new',
  cancelled: 'neutral',
  scheduled: 'info',
}

export function TripsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Trip>({
    mode: 'index',
    getRowId: (trip) => trip.id,
    initialSort: { field: 'startedAt', dir: 'desc' },
  })

  const queryParams = useMemo(
    () => ({
      ...table.params,
      view: activeTab,
    }),
    [table.params, activeTab]
  )

  const data = useAsync<Paginated<Trip>>(
    (signal) => listTrips(queryParams, signal),
    { deps: [queryParams] }
  )

  const [overrides, setOverrides] = useState<Record<string, Partial<Trip>>>({})
  const [activeTripForDetail, setActiveTripForDetail] = useState<Trip | null>(null)
  const [activeTripForFlag, setActiveTripForFlag] = useState<Trip | null>(null)

  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return raw.map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item))
  }, [data.data?.items, overrides])

  const canWrite = shell.permissions.permissions.includes('live_ops')

  const handleFlagConfirm = async (tripId: string, reason: string) => {
    try {
      await flagTrip(tripId, reason)
      setOverrides((prev) => ({
        ...prev,
        [tripId]: { ...prev[tripId], flagged: true },
      }))
      toast.success(t('trip.toast.flagged', { defaultValue: 'Trip {id} flagged for review', id: tripId }))
    } catch {
      toast.error(t('trip.toast.flagError', { defaultValue: 'Failed to flag trip' }))
    }
  }

  const handleUnflag = async (tripId: string) => {
    try {
      await unflagTrip(tripId)
      setOverrides((prev) => ({
        ...prev,
        [tripId]: { ...prev[tripId], flagged: false },
      }))
      toast.success(t('trip.toast.unflagged', { defaultValue: 'Trip {id} unflagged', id: tripId }))
    } catch {
      toast.error(t('trip.toast.unflagError', { defaultValue: 'Failed to unflag trip' }))
    }
  }

  const columns: DataColumn<Trip>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('column.tripId', { defaultValue: 'Trip' }),
        width: 120,
        dataType: 'text',
        cell: (trip) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTripForDetail(trip)}
              className="font-mono text-xs font-semibold text-foreground hover:underline focus:outline-none"
            >
              {trip.id}
            </button>
            {trip.flagged && <Flag className="h-3 w-3 text-amber-600 shrink-0" />}
          </div>
        ),
      },
      {
        id: 'kind',
        header: t('column.kind', { defaultValue: 'Kind' }),
        width: 120,
        dataType: 'enum',
        cell: (trip) => (
          <StatusBadge tone={trip.kind === 'Quick ride' ? 'new' : 'info'}>
            {trip.kind}
          </StatusBadge>
        ),
      },
      {
        id: 'riderName',
        header: t('column.rider', { defaultValue: 'Rider' }),
        width: 140,
        dataType: 'text',
        cell: (trip) => (
          <button
            type="button"
            onClick={() => navigate(profileHref(trip.riderId))}
            className="text-xs font-medium text-foreground hover:underline focus:outline-none text-left"
          >
            {trip.riderName}
          </button>
        ),
      },
      {
        id: 'driverName',
        header: t('column.captain', { defaultValue: 'Captain' }),
        width: 140,
        dataType: 'text',
        cell: (trip) =>
          trip.driverId ? (
            <button
              type="button"
              onClick={() => navigate(profileHref(trip.driverId!))}
              className="text-xs text-foreground hover:underline focus:outline-none text-left"
            >
              {trip.driverName}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          ),
      },
      {
        id: 'route',
        header: t('column.route', { defaultValue: 'Route' }),
        width: 200,
        dataType: 'text',
        cell: (trip) => (
          <div className="flex flex-col text-xs max-w-[200px]">
            <span className="font-medium text-foreground truncate">{trip.pickup}</span>
            <span className="text-[11px] text-muted-foreground truncate">→ {trip.destination}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
        width: 110,
        dataType: 'enum',
        cell: (trip) => (
          <StatusBadge tone={STATUS_TONES[trip.status] ?? 'neutral'}>
            {trip.status}
          </StatusBadge>
        ),
      },
      {
        id: 'fareHalalas',
        header: t('column.fare', { defaultValue: 'Fare' }),
        width: 110,
        align: 'end',
        dataType: 'money',
        cell: (trip) => (
          <span className="text-xs tabular-nums font-semibold text-foreground">
            <Money amount={trip.fareHalalas} />
          </span>
        ),
      },
      {
        id: 'rating',
        header: t('column.rating', { defaultValue: 'Rating' }),
        width: 90,
        align: 'end',
        dataType: 'number',
        cell: (trip) => (
          <span className="text-xs tabular-nums text-foreground">
            {trip.driverRatingGiven !== null ? `★ ${trip.driverRatingGiven}` : '—'}
          </span>
        ),
      },
      {
        id: 'startedAt',
        header: t('column.time', { defaultValue: 'Date & Time' }),
        width: 130,
        dataType: 'date',
        cell: (trip) => (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(trip.startedAt, { language })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 60,
        align: 'end',
        cell: (trip) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('action.more', { defaultValue: 'More' })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTripForDetail(trip)}>
                {t('trip.viewDetails', { defaultValue: 'View Trip Telemetry' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(profileHref(trip.riderId))}>
                {t('action.viewRider', { defaultValue: 'View Rider Profile' })}
              </DropdownMenuItem>
              {trip.driverId && (
                <DropdownMenuItem onClick={() => navigate(profileHref(trip.driverId!))}>
                  {t('action.viewCaptain', { defaultValue: 'View Captain Profile' })}
                </DropdownMenuItem>
              )}
              {canWrite && (
                trip.flagged ? (
                  <DropdownMenuItem onClick={() => handleUnflag(trip.id)}>
                    {t('trip.unflag', { defaultValue: 'Remove Flag' })}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setActiveTripForFlag(trip)} className="text-amber-600">
                    {t('trip.flagForReview', { defaultValue: 'Flag for Investigation' })}
                  </DropdownMenuItem>
                )
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
  const meta = t('trip.meta.count', {
    defaultValue: '{count} trips recorded',
    count: formatCount(total, language),
  })

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(trip) => trip.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="operations-trips"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
        searchPlaceholder={t('trip.searchPlaceholder', { defaultValue: 'Search trips by ID, rider, captain, or location...' })}
        firstRun={{
          heading: t('trip.empty.heading', { defaultValue: 'No trips recorded' }),
          body: t('trip.empty.body', { defaultValue: 'Trips completed across both subscription plans and instant quick rides appear here.' }),
          actions: [],
        }}
        noMatch={{ message: t('trip.empty.noMatch', { defaultValue: 'No trips match your filter' }) }}
        error={{ message: t('trip.error.read', { defaultValue: 'Failed to load trips' }), onRetry: data.refetch }}
      />

      <TripDetailDrawer
        trip={activeTripForDetail}
        open={!!activeTripForDetail}
        onClose={() => setActiveTripForDetail(null)}
        language={language}
        t={t}
      />

      <FlagTripModal
        trip={activeTripForFlag}
        open={!!activeTripForFlag}
        onClose={() => setActiveTripForFlag(null)}
        onConfirm={handleFlagConfirm}
        t={t}
      />
    </SingleColumnPage>
  )
}
