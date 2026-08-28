import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Money } from '@/components/Money'
import type { Translate } from '@/lib'

export interface DisputeItem {
  id: string
  kind: string
  claimantName: string
  claimantId: string
  tripId: string
  amountHalalas: number
  status: 'pending' | 'under-review' | 'resolved'
  filedAt: string
  details: string
}

interface ResolveDisputeModalProps {
  dispute: DisputeItem | null
  open: boolean
  onClose: () => void
  onConfirm: (disputeId: string, resolution: string, refundHalalas: number) => void
  t: Translate
}

export function ResolveDisputeModal({ dispute, open, onClose, onConfirm, t }: ResolveDisputeModalProps) {
  const [resolutionType, setResolutionType] = useState('full_refund')
  const [customRefund, setCustomRefund] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (!dispute) return null

  const refundAmount =
    resolutionType === 'full_refund'
      ? dispute.amountHalalas
      : resolutionType === 'partial_refund'
        ? (parseFloat(customRefund) || 0) * 100
        : 0

  const handleConfirm = () => {
    setBusy(true)
    setTimeout(() => {
      onConfirm(dispute.id, `${resolutionType}${note ? `: ${note}` : ''}`, refundAmount)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('dispute.resolve.title', { defaultValue: 'Resolve Dispute & Claim' })}</DialogTitle>
          <DialogDescription>
            {t('dispute.resolve.desc', {
              defaultValue: 'Review claim {id} for {claimant} on trip {trip}.',
              id: dispute.id,
              claimant: dispute.claimantName,
              trip: dispute.tripId,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('dispute.disputedAmount', { defaultValue: 'Claimed Amount' })}:</span>
              <span className="font-semibold text-foreground"><Money amount={dispute.amountHalalas} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('dispute.claimCategory', { defaultValue: 'Category' })}:</span>
              <span className="text-foreground">{dispute.kind}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">{dispute.details}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('dispute.verdict', { defaultValue: 'Resolution Verdict' })}</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_refund">{t('dispute.verdict.fullRefund', { defaultValue: 'Approve 100% Refund to Rider Wallet' })}</SelectItem>
                <SelectItem value="partial_refund">{t('dispute.verdict.partialRefund', { defaultValue: 'Approve Partial Compensation Adjustment' })}</SelectItem>
                <SelectItem value="uphold_charge">{t('dispute.verdict.uphold', { defaultValue: 'Uphold Charge (No Refund - Policy Valid)' })}</SelectItem>
                <SelectItem value="goodwill_credit">{t('dispute.verdict.goodwill', { defaultValue: 'Credit Goodwill Promotional Voucher' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {resolutionType === 'partial_refund' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('dispute.customAmount', { defaultValue: 'Adjustment Amount (SAR)' })}</Label>
              <Input
                type="number"
                value={customRefund}
                onChange={(e) => setCustomRefund(e.target.value)}
                placeholder="25.00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('dispute.resolutionNote', { defaultValue: 'Resolution Note' })}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Telemetry verified incorrect toll was added"
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
            {busy ? t('action.saving', { defaultValue: 'Submitting...' }) : t('dispute.confirmVerdict', { defaultValue: 'Confirm Resolution' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
