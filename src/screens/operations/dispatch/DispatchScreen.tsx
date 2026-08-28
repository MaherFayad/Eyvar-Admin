import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { allTripFixtures } from '@/data/fixtures/trips'
import { allRequestFixtures } from '@/data/fixtures/requests'
import { allDriverFixtures } from '@/data/fixtures/drivers'
import type { SubTabRoute } from '@/data/types'
import { formatCount } from '@/lib'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { MonitorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Car, Clock, MapPin, Navigation, User } from 'lucide-react'
import { InterventionsCard } from './InterventionsCard'
import { ManualDispatchModal } from './ManualDispatchModal'

export function DispatchScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language

  const [activeTab, setActiveTab] = useState<'trips' | 'pending' | 'fleet'>('trips')

  // Live in-progress trips
  const activeTrips = useMemo(
    () => allTripFixtures.filter((trip) => trip.status === 'in-trip' || trip.status === 'assigned' || trip.status === 'en-route'),
    []
  )

  // Pending live / sub requests
  const pendingRequests = useMemo(
    () => allRequestFixtures.filter((r) => r.status === 'searching' || r.status === 'offered'),
    []
  )

  // Online drivers
  const onlineDrivers = useMemo(
    () => allDriverFixtures.filter((d) => d.status === 'active'),
    []
  )

  // Simulated live interventions
  const [interventions, setInterventions] = useState([
    {
      id: 'INT-01',
      kind: 'delayed' as const,
      title: 'Delayed Arrival — SUB-1041',
      subtitle: 'Captain Abdullah Al-Otaibi is 8 mins delayed for pickup at Al-Olaya',
      elapsedMinutes: 8,
      tripId: 'TRP-1002',
    },
    {
      id: 'INT-02',
      kind: 'sos' as const,
      title: 'Emergency Signal — TRP-1004',
      subtitle: 'Rider flagged route deviation on King Fahd Rd',
      elapsedMinutes: 3,
      tripId: 'TRP-1004',
    },
  ])

  // Manual dispatch modal
  const [manualDispatchReq, setManualDispatchReq] = useState<{
    id: string
    riderName: string
    pickup: string
  } | null>(null)

  const canWrite = shell.permissions.permissions.includes('live_ops')

  const handleResolveIntervention = (id: string) => {
    setInterventions((prev) => prev.filter((item) => item.id !== id))
    toast.success(t('dispatch.toast.resolved', { defaultValue: 'Intervention alert resolved' }))
  }

  const handleReassignIntervention = (id: string) => {
    setInterventions((prev) => prev.filter((item) => item.id !== id))
    toast.success(t('dispatch.toast.reassigned', { defaultValue: 'Automated captain reassignment dispatched' }))
  }

  const handleManualDispatchConfirm = (requestId: string, _driverId: string, driverName: string) => {
    toast.success(t('dispatch.toast.dispatched', {
      defaultValue: 'Request {id} assigned to captain {name}',
      id: requestId,
      name: driverName,
    }))
  }

  const metaText = `${formatCount(activeTrips.length, language)} ${t('dispatch.inTransit', { defaultValue: 'in-transit' })} · ${t('dispatch.liveConnected', { defaultValue: 'Real-time Telemetry Live' })}`

  const header = (
    <PageHeader
      title={t(row.titleKey)}
      meta={metaText}
      t={t}
      dir={dir}
    />
  )

  const canvas = (
    <div className="flex flex-col gap-4">
      {/* Live Dispatch Feed Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="trips" className="text-xs gap-1.5">
              <Navigation className="h-3.5 w-3.5" />
              {t('dispatch.feed.activeTrips', { defaultValue: 'Active Trips' })}
              <span className="ml-1 text-[11px] font-mono rounded-full bg-primary/10 text-primary px-1.5">
                {activeTrips.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('dispatch.feed.pendingMatch', { defaultValue: 'Pending Dispatch' })}
              <span className="ml-1 text-[11px] font-mono rounded-full bg-amber-500/10 text-amber-600 px-1.5">
                {pendingRequests.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="text-xs gap-1.5">
              <Car className="h-3.5 w-3.5" />
              {t('dispatch.feed.fleet', { defaultValue: 'Fleet Online' })}
              <span className="ml-1 text-[11px] font-mono rounded-full bg-muted text-muted-foreground px-1.5">
                {onlineDrivers.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Active In-Progress Trips */}
        <TabsContent value="trips" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTrips.map((trip) => (
              <Card key={trip.id} className="border-border">
                <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">{trip.id}</span>
                    <StatusBadge tone="info">{trip.kind}</StatusBadge>
                  </div>
                  <span className="text-xs font-semibold text-foreground"><Money amount={trip.fareHalalas} /></span>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-xs space-y-2.5">
                  <div className="space-y-1 bg-muted/30 p-2.5 rounded border border-border">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{trip.pickup}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3 text-rose-600 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-foreground">{trip.riderName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span className="font-medium text-foreground">{trip.driverName ?? 'Unassigned'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Pending Requests */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
            {pendingRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t('dispatch.noPending', { defaultValue: 'No unassigned ride requests pending match.' })}
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{req.id}</span>
                      <StatusBadge tone="warning">{req.channel}</StatusBadge>
                      <span className="text-[11px] text-muted-foreground">{req.riderName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {req.pickup} → {req.destination}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground capitalize">{req.vehicleClass}</span>
                    {canWrite && (
                      <Button
                        size="xs"
                        onClick={() =>
                          setManualDispatchReq({
                            id: req.id,
                            riderName: req.riderName,
                            pickup: req.pickup,
                          })
                        }
                      >
                        {t('dispatch.assignCaptain', { defaultValue: 'Dispatch Captain' })}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Fleet Online */}
        <TabsContent value="fleet" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {onlineDrivers.slice(0, 9).map((driver) => (
              <Card key={driver.id} className="border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-foreground">{driver.name}</span>
                  <StatusBadge tone="success">Active</StatusBadge>
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>{driver.city} · {driver.vehicleClass}</span>
                  <span className="font-semibold text-foreground">{driver.rating !== null ? `★ ${driver.rating.toFixed(1)}` : '—'}</span>
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border">
                  <span>{driver.activeSubscriptions}/{driver.maxSubscriptions} active subs</span>
                  <span className="font-mono">{driver.id}</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )

  const aside = (
    <div className="flex flex-col gap-4">
      <InterventionsCard
        items={interventions}
        onResolve={handleResolveIntervention}
        onReassign={handleReassignIntervention}
        canWrite={canWrite}
        t={t}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-emerald-600" />
            {t('dispatch.liveTelemetry', { defaultValue: 'Dispatch Velocity' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('dispatch.avgMatchTime', { defaultValue: 'Avg Match Time' })}:</span>
            <span className="font-semibold text-foreground">42s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('dispatch.autoMatchRate', { defaultValue: 'Auto-Match Rate' })}:</span>
            <span className="font-semibold text-emerald-600">96.4%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('dispatch.fleetUtilization', { defaultValue: 'Fleet Utilization' })}:</span>
            <span className="font-semibold text-foreground">78.2%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <MonitorShell header={header} canvas={canvas} aside={aside} />

      <ManualDispatchModal
        requestId={manualDispatchReq?.id ?? null}
        riderName={manualDispatchReq?.riderName ?? ''}
        pickup={manualDispatchReq?.pickup ?? ''}
        open={!!manualDispatchReq}
        onClose={() => setManualDispatchReq(null)}
        onConfirm={handleManualDispatchConfirm}
        t={t}
      />
    </>
  )
}
