import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { allDriverFixtures } from '@/data/fixtures/drivers'
import type { Translate } from '@/lib'

interface ManualDispatchModalProps {
  requestId: string | null
  riderName: string
  pickup: string
  open: boolean
  onClose: () => void
  onConfirm: (requestId: string, driverId: string, driverName: string) => void
  t: Translate
}

export function ManualDispatchModal({
  requestId,
  riderName,
  pickup,
  open,
  onClose,
  onConfirm,
  t,
}: ManualDispatchModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  if (!requestId) return null

  const availableDrivers = allDriverFixtures.filter((d) => d.status === 'active')

  const handleConfirm = () => {
    if (!selectedDriverId) return
    const driver = allDriverFixtures.find((d) => d.id === selectedDriverId)
    if (!driver) return
    setBusy(true)
    setTimeout(() => {
      onConfirm(requestId, driver.id, driver.name)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('dispatch.manual.title', { defaultValue: 'Manual Captain Assignment' })}</DialogTitle>
          <DialogDescription>
            {t('dispatch.manual.desc', {
              defaultValue: 'Assign a captain manually for request {id} ({rider}) at {pickup}.',
              id: requestId,
              rider: riderName,
              pickup,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('column.rider', { defaultValue: 'Rider' })}:</span>
              <span className="font-medium text-foreground">{riderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('trip.pickup', { defaultValue: 'Pickup' })}:</span>
              <span className="font-medium text-foreground">{pickup}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-driver-select" className="text-xs font-medium">
              {t('sub.selectDriver', { defaultValue: 'Select Available Captain' })}
            </Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger id="manual-driver-select">
                <SelectValue placeholder={t('sub.selectDriverPlaceholder', { defaultValue: 'Choose an active captain...' })} />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.city} · ★{d.rating !== null ? d.rating.toFixed(1) : '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            disabled={!selectedDriverId || busy}
          >
            {busy ? t('action.saving', { defaultValue: 'Assigning...' }) : t('dispatch.confirmAssign', { defaultValue: 'Dispatch Captain' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
