/**
 * The Admin › Team confirmation — `DESIGN.md` §5.3, §5.4, §10.4, **R5a**.
 *
 * Three of the six lifecycle transitions are confirmed, and they are confirmed
 * for different reasons, which is why one dialog serves all three rather than
 * three dialogs sharing a look:
 *
 * | Transition | Reason required | Primary |
 * |---|---|---|
 * | Revoke invitation | — | ordinary |
 * | Suspend operator  | **required** | ordinary — reinstatement is one click |
 * | Offboard operator | **required** | **destructive** (R5a use #1) |
 *
 * `resend` and `reinstate` are not confirmed: resending is idempotent and
 * reinstating is the undo of the act that *was* confirmed. A confirmation on
 * every transition trains the operator to dismiss confirmations.
 *
 * Rules applied
 *   §5.3 / R5a  the red primary is for the **unrecoverable** only. Offboarding
 *               removes the record and nothing on this screen restores it;
 *               suspension is reversible and keeps the ordinary primary.
 *   §10.4       a required reason is validated **in the dialog, before** the
 *               mutation, with the message under the field — not a 422 the
 *               operator has to interpret.
 *   §7.4.5      a placeholder is never a label. The label is above the field;
 *               the constraint is helper text beneath it.
 *   §5.7        the primary **repeats the verb**. Never `OK`, `Yes`, `Confirm`.
 *   §7.2        focus is trapped by `dialog.tsx` and `Escape` cancels; nothing
 *               here mutates until the primary is pressed.
 */

import { useEffect, useState } from 'react'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface ConfirmRequest {
  title: string
  /** One sentence: the consequence, and what will NOT change. */
  body: string
  confirmLabel: string
  /** R5a use #1 — spent only on the act nothing walks back. */
  destructive?: boolean
  /** Present when the transition records a reason on its audit entry. */
  requireReason?: boolean
  onConfirm: (reason: string) => void
}

export function ConfirmDialog({
  request,
  onClose,
  busy,
  t,
}: {
  request: ConfirmRequest | null
  onClose: () => void
  busy: boolean
  t: Translate
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  /* A fresh dialog starts clean. Keyed on the title so a second confirmation
     never inherits the first one's half-typed reason. */
  useEffect(() => {
    setReason('')
    setTouched(false)
  }, [request?.title])

  if (request === null) return null

  const missing = request.requireReason === true && reason.trim() === ''

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>

        {request.requireReason === true && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-team-confirm-reason">
              {t('admin.team.confirm.reason.label')}
            </Label>
            <Textarea
              id="admin-team-confirm-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && missing}
              aria-describedby="admin-team-confirm-reason-help"
              rows={3}
            />
            <span id="admin-team-confirm-reason-help" className="text-2xs text-muted-foreground">
              {touched && missing
                ? t('admin.team.confirm.reason.message')
                : t('admin.team.confirm.reason.help')}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.confirm.cancel')}
          </Button>
          <Button
            size="xs"
            variant={request.destructive === true ? 'destructive' : 'default'}
            disabled={busy || missing}
            onClick={() => request.onConfirm(reason.trim())}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
