/**
 * The destructive confirmation — design spec §9.1, §5.3, §5.4, **R5a**.
 *
 * Rules applied
 *   §9.1       a modal at **440px** (`size="sm"`), vertically centred, whose
 *              title states **the verb and the count** (`Suspend 3 captains?`)
 *              and whose body states the consequence in one sentence **and
 *              what will not change**. The primary **repeats the verb**
 *              (`Suspend captains`) — never `OK`, `Yes`, `Confirm` or
 *              `Submit`.
 *   §5.3 / R5a a red primary is for the **unrecoverable** only (R5a use #1).
 *              Suspending, reinstating and rejecting are all reversible or
 *              appealable, so the primary here is the ordinary brand blue.
 *              Spending red on a recoverable action trains operators to
 *              ignore it.
 *   §10.4      a required reason is validated **before** the mutation, in the
 *              modal, with the message under the field — not a 422 the
 *              operator has to interpret. `rejectApplicant` throws 422 on an
 *              empty reason and `suspendDriver` requires one by contract; the
 *              modal makes that visible instead of letting the request fail.
 *   §7.4.5     a placeholder is never a label. The label is above the field
 *              and the constraint is in helper text beneath it (`copy.md` 7).
 *   §7.3.3     a modal DOES trap focus (unlike the shell's drawers) — that is
 *              `dialog.tsx`'s behaviour and it is correct for a scrimmed
 *              surface. `Escape` cancels.
 *   R-3 §1.3   tier 3 elevation, from `dialog.tsx`. Nothing added here.
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  /** Present when the domain requires a stated reason. Empty is not submittable. */
  reason?: { label: string; help: string; message: string }
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

  const needsReason = request.reason !== undefined
  const invalid = needsReason && reason.trim() === ''

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>

        {request.reason && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="people-confirm-reason">{request.reason.label}</Label>
            <Input
              id="people-confirm-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && invalid}
              aria-describedby="people-confirm-reason-help"
            />
            <p id="people-confirm-reason-help" className="text-xs text-muted-foreground">
              {touched && invalid ? request.reason.message : request.reason.help}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('people.confirm.cancel')}
          </Button>
          <Button
            variant="default"
            disabled={invalid || busy}
            onClick={() => request.onConfirm(reason.trim())}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
