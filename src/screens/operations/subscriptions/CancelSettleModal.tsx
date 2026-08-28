import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Money } from '@/components/Money'
import type { Subscription } from '@/data/types'
import type { Translate } from '@/lib'

interface CancelSettleModalProps {
  subscription: Subscription | null
  open: boolean
  onClose: () => void
  onConfirm: (subId: string, reason: string) => void
  t: Translate
}

export function CancelSettleModal({ subscription, open, onClose, onConfirm, t }: CancelSettleModalProps) {
  const [reasonCategory, setReasonCategory] = useState<string>('driver_unavailable')
  const [customNote, setCustomNote] = useState<string>('')
  const [busy, setBusy] = useState(false)

  if (!subscription) return null

  const unusedTrips = Math.max(0, subscription.tripsIncluded - subscription.tripsCompleted)
  const estimatedRefundHalalas =
    subscription.tripsIncluded > 0
      ? Math.round((subscription.paidHalalas / subscription.tripsIncluded) * unusedTrips)
      : 0

  const handleConfirm = () => {
    const fullReason = `${reasonCategory}${customNote ? `: ${customNote}` : ''}`
    setBusy(true)
    setTimeout(() => {
      onConfirm(subscription.id, fullReason)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('sub.settle.title', { defaultValue: 'Cancel & Settle Subscription' })}</DialogTitle>
          <DialogDescription>
            {t('sub.settle.desc', {
              defaultValue: 'Early termination settlement for {id} ({rider}).',
              id: subscription.id,
              rider: subscription.riderName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.paidAmount', { defaultValue: 'Paid Package Price' })}:</span>
              <span className="font-medium text-foreground"><Money amount={subscription.paidHalalas} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.tripsRatio', { defaultValue: 'Completed / Total' })}:</span>
              <span className="font-medium text-foreground">{subscription.tripsCompleted} / {subscription.tripsIncluded} trips</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.unusedTrips', { defaultValue: 'Unused Trips Remaining' })}:</span>
              <span className="font-medium text-foreground">{unusedTrips} trips</span>
            </div>
            <div className="h-[1px] bg-border my-0.5" />
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-foreground">{t('sub.calculatedRefund', { defaultValue: 'Calculated Refund' })}:</span>
              <span className="font-semibold text-foreground"><Money amount={estimatedRefundHalalas} /></span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settle-category" className="text-xs font-medium">
              {t('sub.settle.reasonCategory', { defaultValue: 'Termination Reason' })}
            </Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger id="settle-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver_unavailable">{t('sub.reason.noDriver', { defaultValue: 'No replacement captain available' })}</SelectItem>
                <SelectItem value="service_failure">{t('sub.reason.serviceFailure', { defaultValue: 'Service quality failure / repeated missed trips' })}</SelectItem>
                <SelectItem value="rider_relocated">{t('sub.reason.relocated', { defaultValue: 'Rider relocated outside service zone' })}</SelectItem>
                <SelectItem value="vehicle_breakdown">{t('sub.reason.vehicleBreakdown', { defaultValue: 'Vehicle breakdown / prolonged maintenance' })}</SelectItem>
                <SelectItem value="rider_violation">{t('sub.reason.riderViolation', { defaultValue: 'Rider policy violation' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settle-note" className="text-xs font-medium">
              {t('sub.settle.additionalNote', { defaultValue: 'Internal Notes (optional)' })}
            </Label>
            <Input
              id="settle-note"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={t('sub.settle.notePlaceholder', { defaultValue: 'e.g. Approved by ops supervisor' })}
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
            {busy ? t('action.saving', { defaultValue: 'Processing...' }) : t('sub.confirmCancel', { defaultValue: 'Confirm Cancellation' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
