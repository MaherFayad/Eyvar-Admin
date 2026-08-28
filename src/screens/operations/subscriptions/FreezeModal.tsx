import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EYVAR_TODAY } from '@/data/mock/clock'
import type { Subscription } from '@/data/types'
import type { Translate } from '@/lib'

interface FreezeModalProps {
  subscription: Subscription | null
  open: boolean
  onClose: () => void
  onConfirm: (subId: string, untilDate: string, reason: string) => void
  t: Translate
}

export function FreezeModal({ subscription, open, onClose, onConfirm, t }: FreezeModalProps) {
  const [durationDays, setDurationDays] = useState<string>('7')
  const [reason, setReason] = useState<string>('Rider travel')
  const [busy, setBusy] = useState(false)

  if (!subscription) return null

  const calculateUntilDate = (days: number): string => {
    const base = new Date(EYVAR_TODAY)
    base.setDate(base.getDate() + days)
    return base.toISOString().slice(0, 10)
  }

  const handleConfirm = () => {
    const until = calculateUntilDate(parseInt(durationDays, 10) || 7)
    setBusy(true)
    setTimeout(() => {
      onConfirm(subscription.id, until, reason)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('sub.freeze.title', { defaultValue: 'Freeze Subscription' })}</DialogTitle>
          <DialogDescription>
            {t('sub.freeze.desc', {
              defaultValue: 'Temporarily pause subscription {id} for {rider}. Unused days will be preserved.',
              id: subscription.id,
              rider: subscription.riderName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="freeze-duration" className="text-xs font-medium">
              {t('sub.freeze.duration', { defaultValue: 'Freeze Duration' })}
            </Label>
            <Select value={durationDays} onValueChange={setDurationDays}>
              <SelectTrigger id="freeze-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{t('sub.freeze.3d', { defaultValue: '3 Days' })}</SelectItem>
                <SelectItem value="7">{t('sub.freeze.7d', { defaultValue: '7 Days (1 Week)' })}</SelectItem>
                <SelectItem value="14">{t('sub.freeze.14d', { defaultValue: '14 Days (2 Weeks)' })}</SelectItem>
                <SelectItem value="30">{t('sub.freeze.30d', { defaultValue: '30 Days (1 Month)' })}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t('sub.freeze.resumeOn', {
                defaultValue: 'Will automatically resume on: {date}',
                date: calculateUntilDate(parseInt(durationDays, 10) || 7),
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="freeze-reason" className="text-xs font-medium">
              {t('sub.freeze.reasonLabel', { defaultValue: 'Reason for Hold' })}
            </Label>
            <Input
              id="freeze-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('sub.freeze.reasonPlaceholder', { defaultValue: 'e.g. Rider vacation, medical leave' })}
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
            {busy ? t('action.saving', { defaultValue: 'Freezing...' }) : t('sub.confirmFreeze', { defaultValue: 'Freeze Subscription' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
