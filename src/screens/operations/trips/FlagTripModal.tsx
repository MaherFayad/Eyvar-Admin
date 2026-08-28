import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Trip } from '@/data/types'
import type { Translate } from '@/lib'

interface FlagTripModalProps {
  trip: Trip | null
  open: boolean
  onClose: () => void
  onConfirm: (tripId: string, reason: string) => void
  t: Translate
}

export function FlagTripModal({ trip, open, onClose, onConfirm, t }: FlagTripModalProps) {
  const [reasonCategory, setReasonCategory] = useState('fare_dispute')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (!trip) return null

  const handleConfirm = () => {
    const fullReason = `${reasonCategory}${note ? `: ${note}` : ''}`
    setBusy(true)
    setTimeout(() => {
      onConfirm(trip.id, fullReason)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('trip.flag.title', { defaultValue: 'Flag Trip for Investigation' })}</DialogTitle>
          <DialogDescription>
            {t('trip.flag.desc', {
              defaultValue: 'Flag trip {id} ({rider} with {driver}) for ops review.',
              id: trip.id,
              rider: trip.riderName,
              driver: trip.driverName ?? 'Unassigned',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('trip.flag.reason', { defaultValue: 'Flag Category' })}</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fare_dispute">{t('trip.reason.fareDispute', { defaultValue: 'Fare / Toll Dispute' })}</SelectItem>
                <SelectItem value="route_deviation">{t('trip.reason.routeDeviation', { defaultValue: 'Significant Route Deviation' })}</SelectItem>
                <SelectItem value="speed_violation">{t('trip.reason.speedViolation', { defaultValue: 'Speed / Reckless Driving Alert' })}</SelectItem>
                <SelectItem value="safety_incident">{t('trip.reason.safetyIncident', { defaultValue: 'Safety / Conduct Incident' })}</SelectItem>
                <SelectItem value="unusual_pairing">{t('trip.reason.unusualPairing', { defaultValue: 'Suspicious / Fraudulent Pairing' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('trip.flag.note', { defaultValue: 'Investigation Note' })}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Rider reported toll was double charged"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? t('action.saving', { defaultValue: 'Flagging...' }) : t('trip.confirmFlag', { defaultValue: 'Flag Trip' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
