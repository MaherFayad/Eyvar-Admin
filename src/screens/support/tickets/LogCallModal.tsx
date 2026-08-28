import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Translate } from '@/lib'

interface LogCallModalProps {
  ticketId: string
  entityName: string
  open: boolean
  onClose: () => void
  onConfirm: (outcome: string, notes: string) => void
  t: Translate
}

export function LogCallModal({ ticketId, entityName, open, onClose, onConfirm, t }: LogCallModalProps) {
  const [outcome, setOutcome] = useState('resolved_on_call')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const handleConfirm = () => {
    setBusy(true)
    setTimeout(() => {
      onConfirm(outcome, notes)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('support.logCall.title', { defaultValue: 'Log Support Call Wrap-up' })}</DialogTitle>
          <DialogDescription>
            {t('support.logCall.desc', {
              defaultValue: 'Record call outcome and notes for ticket {id} ({name}).',
              id: ticketId,
              name: entityName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('support.callOutcome', { defaultValue: 'Call Outcome' })}</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved_on_call">{t('support.outcome.resolved', { defaultValue: 'Resolved on Call' })}</SelectItem>
                <SelectItem value="escalated_ops">{t('support.outcome.escalated', { defaultValue: 'Escalated to Operations / Safety' })}</SelectItem>
                <SelectItem value="pending_rider_info">{t('support.outcome.waitingRider', { defaultValue: 'Waiting on Customer Info' })}</SelectItem>
                <SelectItem value="no_answer">{t('support.outcome.noAnswer', { defaultValue: 'Customer Unreachable / No Answer' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('support.callNotes', { defaultValue: 'Summary & Next Steps' })}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Explained surge calculation formula to rider; agreed on 15 SAR goodwill credit."
              rows={3}
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
            {busy ? t('action.saving', { defaultValue: 'Saving...' }) : t('support.saveCall', { defaultValue: 'Log Call' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
