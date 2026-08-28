import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { allDriverFixtures } from '@/data/fixtures/drivers'
import type { Subscription } from '@/data/types'
import type { Translate } from '@/lib'

interface ChangeDriverModalProps {
  subscription: Subscription | null
  open: boolean
  onClose: () => void
  onConfirm: (subId: string, driverId: string, driverName: string) => void
  t: Translate
}

export function ChangeDriverModal({ subscription, open, onClose, onConfirm, t }: ChangeDriverModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  if (!subscription) return null

  const qualifiedDrivers = allDriverFixtures.filter(
    (d) => d.status === 'active' && d.id !== subscription.driverId
  )

  const handleConfirm = () => {
    if (!selectedDriverId) return
    const driver = allDriverFixtures.find((d) => d.id === selectedDriverId)
    if (!driver) return
    setBusy(true)
    setTimeout(() => {
      onConfirm(subscription.id, driver.id, driver.name)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('sub.changeDriver.title', { defaultValue: 'Change Assigned Captain' })}</DialogTitle>
          <DialogDescription>
            {t('sub.changeDriver.desc', {
              defaultValue: 'Reassign subscription {id} ({rider}) to another qualified captain.',
              id: subscription.id,
              rider: subscription.riderName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.currentDriver', { defaultValue: 'Current Captain' })}:</span>
              <span className="font-medium text-foreground">{subscription.driverName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.plan', { defaultValue: 'Plan' })}:</span>
              <span className="font-medium text-foreground">{subscription.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.progress', { defaultValue: 'Trips Completed' })}:</span>
              <span className="font-medium text-foreground">{subscription.tripsCompleted} / {subscription.tripsIncluded}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driver-select" className="text-xs font-medium">
              {t('sub.selectDriver', { defaultValue: 'Select New Captain' })}
            </Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger id="driver-select" className="w-full">
                <SelectValue placeholder={t('sub.selectDriverPlaceholder', { defaultValue: 'Choose an active captain...' })} />
              </SelectTrigger>
              <SelectContent>
                {qualifiedDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.city} · ★{d.rating !== null ? d.rating.toFixed(1) : '—'} · {d.activeSubscriptions}/{d.maxSubscriptions} subs)
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
            {busy ? t('action.saving', { defaultValue: 'Reassigning...' }) : t('sub.confirmChange', { defaultValue: 'Reassign Captain' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
