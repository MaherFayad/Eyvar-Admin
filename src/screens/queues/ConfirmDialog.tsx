/**
 * The queue confirmation — `specs/02-work-queues.md` §4.2 Q-4, §4.5 Q-24,
 * `design/04-index-screen-redesign.md` §7.8, `DESIGN.md` §5.3, §5.4, **R5a**.
 *
 * One dialog serves every confirmed act in wave 2, because §4 makes them one
 * shape: a named consequence, an optional stated reason, an optional choice of
 * counterparty, and a primary that repeats the verb.
 *
 * | Where | Reason | Choice |
 * |---|---|---|
 * | Take over a claim (**AC-203**, **AC-209**) | — | — |
 * | Assign a captain (**AC-247**) | — | the captain |
 * | Expire a request | — | — |
 * | Offer a leg to a backup | — | the captain |
 * | Record a leg as `assumed` (422 `note_required`) | **required** | the source |
 * | Waive an absence (422 `reason_required`) | **required** | — |
 * | Uphold / overturn a case (**AC-333**, 422 `rationale_required`) | **required** | — |
 * | Suspend a captain precautionarily | **required** | — |
 * | Close an incident | — | — |
 *
 * Rules applied
 *   §9.1       440px (`size="sm"`), vertically centred. The title states **the
 *              verb and the subject**; the body states the consequence in one
 *              sentence **and what will not change**; the primary **repeats the
 *              verb** — never `OK`, `Yes`, `Confirm` or `Submit`.
 *   §5.3 / R5a a red primary is for the **unrecoverable** only (R5a use #1).
 *              Claiming, assigning, acknowledging and deciding are recorded and
 *              appealable, so their primary is the ordinary one. `destructive`
 *              is opt-in and is spent on the two acts nothing walks back.
 *   §10.4      a required reason is validated **before** the mutation, in the
 *              modal, with the message under the field — not a 422 the operator
 *              has to interpret. Every one of the four 422s above is reachable
 *              from the mock, and this is what stops the operator meeting one.
 *   §7.4.5     a placeholder is never a label. The label is above the field and
 *              the constraint is helper text beneath it.
 *   §7.3.3     a modal DOES trap focus — that is `dialog.tsx`'s behaviour and
 *              it is correct for a scrimmed surface. `Escape` cancels, and
 *              **cancelling leaves the claim with the original owner**
 *              (**AC-203**): nothing here mutates until the primary is pressed.
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export interface ConfirmChoiceOption {
  value: string
  label: string
  /** A second line — a distance, a rating, a vehicle class. Never the only carrier. */
  hint?: string | null
}

export interface ConfirmRequest {
  title: string
  /** One sentence: the consequence, and what will NOT change (`copy.md` 9). */
  body: string
  confirmLabel: string
  /** R5a use #1 — the near-black primary becomes red only for the unrecoverable. */
  destructive?: boolean
  /** Present when the domain requires a stated reason. Empty is not submittable. */
  reason?: { label: string; help: string; message: string }
  /** Present when the act names a counterparty the operator has to pick. */
  choice?: {
    label: string
    help: string
    message: string
    placeholder: string
    options: readonly ConfirmChoiceOption[]
    /** §11.6 — an empty option list is a sentence, never an empty popover. */
    emptyMessage: string
  }
  onConfirm: (values: { reason: string; choice: string }) => void
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
  const [choice, setChoice] = useState('')
  const [touched, setTouched] = useState(false)

  /* A fresh dialog starts clean. Keyed on the title so a second confirmation
     never inherits the first one's half-typed reason or its captain. */
  useEffect(() => {
    setReason('')
    setChoice('')
    setTouched(false)
  }, [request?.title])

  if (request === null) return null

  const reasonMissing = request.reason !== undefined && reason.trim() === ''
  const choiceMissing = request.choice !== undefined && choice === ''
  const invalid = reasonMissing || choiceMissing
  const noOptions = request.choice !== undefined && request.choice.options.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>

        {request.choice && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="queue-confirm-choice">{request.choice.label}</Label>
            {noOptions ? (
              /* §11.6 — one grey sentence. An empty picker with a caret is a
                 control that looks operable and is not. */
              <p className="text-sm text-muted-foreground">{request.choice.emptyMessage}</p>
            ) : (
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger
                  id="queue-confirm-choice"
                  aria-invalid={touched && choiceMissing}
                  aria-describedby="queue-confirm-choice-help"
                  className="w-full"
                >
                  <SelectValue placeholder={request.choice.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {request.choice.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.hint ? `${option.label} · ${option.hint}` : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p id="queue-confirm-choice-help" className="text-xs text-muted-foreground">
              {touched && choiceMissing && !noOptions
                ? request.choice.message
                : request.choice.help}
            </p>
          </div>
        )}

        {request.reason && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="queue-confirm-reason">{request.reason.label}</Label>
            {/* A `textarea`, not an `input`. Every reason in wave 2 is a
                sentence somebody outside this console reads — a captain reading
                why their appeal was upheld, or why a strike stands — and a
                single-line field tells the operator to write less than that. */}
            <Textarea
              id="queue-confirm-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && reasonMissing}
              aria-describedby="queue-confirm-reason-help"
            />
            <p id="queue-confirm-reason-help" className="text-xs text-muted-foreground">
              {touched && reasonMissing ? request.reason.message : request.reason.help}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('queue.confirm.cancel')}
          </Button>
          <Button
            variant={request.destructive ? 'destructive' : 'default'}
            disabled={invalid || busy}
            onClick={() => request.onConfirm({ reason: reason.trim(), choice })}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
