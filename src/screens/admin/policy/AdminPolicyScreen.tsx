import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Plus, Radio, Sliders } from 'lucide-react'

interface CityConfig {
  id: string
  name: string
  nameAr: string
  quickRidesEnabled: boolean
  subscriptionsEnabled: boolean
  activeCaptains: number
}

const INITIAL_CITIES: CityConfig[] = [
  { id: 'CITY-01', name: 'Riyadh', nameAr: 'الرياض', quickRidesEnabled: true, subscriptionsEnabled: true, activeCaptains: 142 },
  { id: 'CITY-02', name: 'Jeddah', nameAr: 'جدة', quickRidesEnabled: true, subscriptionsEnabled: true, activeCaptains: 86 },
  { id: 'CITY-03', name: 'Dammam', nameAr: 'الدمام', quickRidesEnabled: true, subscriptionsEnabled: true, activeCaptains: 45 },
  { id: 'CITY-04', name: 'Mecca', nameAr: 'مكة المكرمة', quickRidesEnabled: false, subscriptionsEnabled: true, activeCaptains: 28 },
  { id: 'CITY-05', name: 'Medina', nameAr: 'المدينة المنورة', quickRidesEnabled: true, subscriptionsEnabled: false, activeCaptains: 19 },
]

export function AdminPolicyScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir } = shell.language

  const [cities, setCities] = useState<CityConfig[]>(INITIAL_CITIES)
  const [autoRadiusKm, setAutoRadiusKm] = useState('5.0')
  const [searchTimeoutSec, setSearchTimeoutSec] = useState('45')
  const [maxSurgeMult, setMaxSurgeMult] = useState('2.5')
  const [maxDriverHours, setMaxDriverHours] = useState('10')
  const [maxConcurrentSubs, setMaxConcurrentSubs] = useState('5')
  const [maxRiderCancels, setMaxRiderCancels] = useState('3')

  const [addCityOpen, setAddCityOpen] = useState(false)
  const [newCityName, setNewCityName] = useState('')
  const [newCityNameAr, setNewCityNameAr] = useState('')

  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canWrite = shell.permissions.permissions.includes('manage_settings')

  useEffect(() => {
    if (isDirty && canWrite) {
      shell.setSaveBar({
        status: isSaving ? 'save-in-flight' : 'dirty',
        entity: t('admin.policy.entity', { defaultValue: 'Operational Policy' }),
        canSave: true,
        canDiscard: true,
        isSaving,
        onSave: async () => {
          setIsSaving(true)
          setTimeout(() => {
            setIsSaving(false)
            setIsDirty(false)
            shell.setSaveBar(null)
            toast.success(t('admin.toast.policySaved', { defaultValue: 'Operational policies saved successfully' }))
          }, 300)
        },
        onDiscard: () => {
          setIsDirty(false)
          shell.setSaveBar(null)
          toast.info(t('admin.toast.discarded', { defaultValue: 'Changes discarded' }))
        },
      })
    } else {
      shell.setSaveBar(null)
    }

    return () => {
      shell.setSaveBar(null)
    }
  }, [isDirty, isSaving, canWrite, shell, t])

  const handleToggleCityService = (cityId: string, service: 'quickRides' | 'subscriptions') => {
    setCities((prev) =>
      prev.map((c) => {
        if (c.id !== cityId) return c
        if (service === 'quickRides') return { ...c, quickRidesEnabled: !c.quickRidesEnabled }
        return { ...c, subscriptionsEnabled: !c.subscriptionsEnabled }
      })
    )
    setIsDirty(true)
  }

  const handleAddCity = () => {
    if (!newCityName.trim()) return
    const newCity: CityConfig = {
      id: `CITY-0${cities.length + 1}`,
      name: newCityName.trim(),
      nameAr: newCityNameAr.trim() || newCityName.trim(),
      quickRidesEnabled: true,
      subscriptionsEnabled: true,
      activeCaptains: 0,
    }
    setCities((prev) => [...prev, newCity])
    setNewCityName('')
    setNewCityNameAr('')
    setAddCityOpen(false)
    setIsDirty(true)
    toast.success(t('admin.toast.cityAdded', { defaultValue: 'City {name} added to operating regions', name: newCity.name }))
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.policy.meta', { defaultValue: 'Dispatch parameters, operating regions, limits, and SLA targets' })}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* 1. Matching & Dispatch Parameters */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              {t('admin.dispatch.title', { defaultValue: 'Matching & Dispatch Parameters' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.dispatch.desc', { defaultValue: 'Configure search radius, phase timeouts, and surge multiplier boundaries.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.autoRadius', { defaultValue: 'Initial Search Radius (km)' })}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={autoRadiusKm}
                  onChange={(e) => { setAutoRadiusKm(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.searchTimeout', { defaultValue: 'Search Phase Timeout (Seconds)' })}</Label>
                <Input
                  type="number"
                  value={searchTimeoutSec}
                  onChange={(e) => { setSearchTimeoutSec(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.maxSurge', { defaultValue: 'Maximum Surge Ceiling (Multiplier)' })}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxSurgeMult}
                  onChange={(e) => { setMaxSurgeMult(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Operating Cities & Services */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {t('admin.cities.title', { defaultValue: 'Operating Cities & Regional Services' })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('admin.cities.desc', { defaultValue: 'Enable or disable quick rides and recurring subscription packages per city.' })}
                </CardDescription>
              </div>
              {canWrite && (
                <Button size="xs" variant="secondary" onClick={() => setAddCityOpen(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {t('admin.addCity', { defaultValue: 'Add City' })}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">City</th>
                    <th className="p-3 text-center">Quick Rides</th>
                    <th className="p-3 text-center">Subscriptions</th>
                    <th className="p-3 text-right">Active Fleet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cities.map((city) => (
                    <tr key={city.id} className="hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{city.name}</span>
                          <span className="text-muted-foreground font-arabic text-xs">({city.nameAr})</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={city.quickRidesEnabled}
                          onCheckedChange={() => handleToggleCityService(city.id, 'quickRides')}
                          disabled={!canWrite}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={city.subscriptionsEnabled}
                          onCheckedChange={() => handleToggleCityService(city.id, 'subscriptions')}
                          disabled={!canWrite}
                        />
                      </td>
                      <td className="p-3 text-right tabular-nums text-foreground">
                        {city.activeCaptains} captains
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Operational Safety Limits */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              {t('admin.limits.title', { defaultValue: 'Operational Safety Limits' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.limits.desc', { defaultValue: 'Guardrails for maximum driving hours and concurrent subscription packages.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.maxDriverHours', { defaultValue: 'Captain Daily Driving Cap (Hours)' })}</Label>
                <Input
                  type="number"
                  value={maxDriverHours}
                  onChange={(e) => { setMaxDriverHours(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.maxSubs', { defaultValue: 'Max Concurrent Subscriptions / Captain' })}</Label>
                <Input
                  type="number"
                  value={maxConcurrentSubs}
                  onChange={(e) => { setMaxConcurrentSubs(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('admin.maxCancels', { defaultValue: 'Rider Max Daily Cancellations' })}</Label>
                <Input
                  type="number"
                  value={maxRiderCancels}
                  onChange={(e) => { setMaxRiderCancels(e.target.value); setIsDirty(true) }}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addCityOpen} onOpenChange={setAddCityOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('admin.addCityTitle', { defaultValue: 'Add Operating City' })}</DialogTitle>
            <DialogDescription>{t('admin.addCityDesc', { defaultValue: 'Register a new urban center for dispatch.' })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">City Name (English) *</Label>
              <Input value={newCityName} onChange={(e) => setNewCityName(e.target.value)} placeholder="e.g. Taif" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">City Name (Arabic)</Label>
              <Input value={newCityNameAr} onChange={(e) => setNewCityNameAr(e.target.value)} placeholder="e.g. الطائف" dir="rtl" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" size="xs" onClick={() => setAddCityOpen(false)}>
              {t('action.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button size="xs" onClick={handleAddCity} disabled={!newCityName.trim()}>
              {t('admin.confirmAddCity', { defaultValue: 'Add City' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SingleColumnPage>
  )
}
