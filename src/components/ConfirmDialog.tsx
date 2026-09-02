/**
 * **The confirmation.** One dialog for every confirmed act in the product —
 * `design/14-system-wide-ux-plan.md` **G5**, `DESIGN.md` §5.3, §5.4, §10.4,
 * **R5a**, `docs/ref/surfaces.md` (destructive → modal, primary restated as the
 * verb).
 *
 * ## What this replaced
 *
 * Four files drew the same modal and had drifted apart:
 * `screens/queues/ConfirmDialog.tsx` (reason + choice + `destructive`),
 * `screens/admin/team/ConfirmDialog.tsx` (`requireReason: boolean`, no choice),
 * `screens/operations/people/ConfirmDialog.tsx` (**no `destructive` at all**)
 * and `screens/admin/workspace/IntegrationsConfirm.tsx` (title/body only). The
 * queues shape was a superset of all three, so it is the one promoted;
 * `requireReason: true` folds into `reason: { label, help, message }`, which
 * carries the same fact and also carries the copy the boolean had to hardcode.
 *
 * **The defect the duplication was hiding.** `people/ConfirmDialog.tsx`
 * hardcoded `variant="default"`, so a captain **suspension** and an applicant
 * **rejection** confirmed with an ordinary primary while the identical
 * pattern in Queues could go red. `destructive` now drives the variant for
 * every caller, with no per-call-site override of the button itself.
 *
 * ## When `destructive` is true — R5a use #1, and only that
 *
 * Red is spent on the **unrecoverable**. An act that is reversible from this
 * console, or appealable by the person it lands on, keeps the ordinary
 * primary — claiming, assigning, acknowledging, deciding, suspending and
 * rejecting are all recorded and all have a route back, so none of them is
 * red. Offboarding an operator and revoking a credential are, because nothing
 * in the product restores either. Spending red on a recoverable action trains
 * operators to ignore it, which is the failure R5a exists to prevent.
 *
 * ## Rules applied
 *   §9.1 / G6  `size="sm"` (420px), vertically centred. The title states **the
 *              verb and the subject or count**; the body states the consequence
 *              in one sentence **and what will not change** (`copy.md` 9); the
 *              primary **repeats the verb** — never `OK`, `Yes`, `Confirm` or
 *              `Submit`.
 *   §10.4      a required reason or choice is validated **before** the
 *              mutation, in the modal, with the message under the field — not a
 *              422 the operator has to interpret.
 *   §7.4.5     a placeholder is never a label. The label is above the field and
 *              the constraint is helper text beneath it.
 *   §7.3.3     a modal DOES trap focus — that is `dialog.tsx`'s behaviour and
 *              it is correct for a scrimmed surface. `Escape` cancels, and
 *              cancelling mutates nothing: **nothing here writes until the
 *              primary is pressed** (AC-203).
 *   §11.6      an empty option list is a sentence, never an empty popover.
 *   R-3 §1.3   tier 3 elevation, from `dialog.tsx`. Nothing added here.
 *
 * The footer buttons are the **default** 28px control, not `xs` — `xs` is
 * documented in `ui/button.tsx` as the top-bar chip and the in-cell control,
 * and a modal footer is neither.
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
  /** R5a use #1 — the ordinary primary becomes red only for the unrecoverable. */
  destructive?: boolean
  /**
   * Present when the domain requires a stated reason. Empty is not
   * submittable. This is what `admin/team`'s `requireReason: boolean` became:
   * the same requirement, carrying its own label and its own two messages
   * rather than borrowing one screen's.
   */
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
    /* Un-dismissable while the write is in flight: `Escape` and the scrim both
       stop answering once `busy`, so a commit cannot be abandoned halfway by a
       keystroke that used to mean "nothing happened". */
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>

        {request.choice && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="confirm-choice">{request.choice.label}</Label>
            {noOptions ? (
              /* §11.6 — one grey sentence. An empty picker with a caret is a
                 control that looks operable and is not. */
              <p className="text-sm text-muted-foreground">{request.choice.emptyMessage}</p>
            ) : (
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger
                  id="confirm-choice"
                  aria-invalid={touched && choiceMissing}
                  aria-describedby="confirm-choice-help"
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
            <p id="confirm-choice-help" className="text-xs text-muted-foreground">
              {touched && choiceMissing && !noOptions
                ? request.choice.message
                : request.choice.help}
            </p>
          </div>
        )}

        {request.reason && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="confirm-reason">{request.reason.label}</Label>
            {/* A `textarea`, not an `input`. Every reason here is a sentence
                somebody outside this console reads — a captain reading why
                their appeal was upheld, or why a strike stands — and a
                single-line field tells the operator to write less than that. */}
            <Textarea
              id="confirm-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && reasonMissing}
              aria-describedby="confirm-reason-help"
            />
            <p id="confirm-reason-help" className="text-xs text-muted-foreground">
              {touched && reasonMissing ? request.reason.message : request.reason.help}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('confirm.cancel')}
          </Button>
          <Button
            variant={request.destructive === true ? 'destructive' : 'default'}
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
