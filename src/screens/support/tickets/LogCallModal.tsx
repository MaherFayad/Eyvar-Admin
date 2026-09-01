/**
 * Log a call. **It now persists.**
 *
 * Two defects, both fixed here:
 *
 * 1. **The outcome and the note were discarded before the handler saw them.**
 *    The modal called `onConfirm(outcome, notes)`; the handler it reached was
 *    `TicketDetailScreen.tsx:86` — `handleLogCallConfirm = () =>
 *    toast.success(…)`, declared with **no parameters at all**. So the two
 *    arguments could not arrive even in principle, and the operator was told
 *    *"Support call logged successfully"* over nothing at all.
 * 2. **`setTimeout(() => { onConfirm(); onClose() }, 200)`** — a fake latency
 *    that made an unwired form feel wired. Gone. `logTicketCall` supplies the
 *    real latency, and the modal stays open on failure with the reason on
 *    screen.
 *
 * Rules applied
 *   §11.2      the primary is disabled in place with a stated reason. The old
 *              one was `disabled={busy}` alone.
 *   §8         the *"what this will do"* line is a derived value: logging
 *              `Resolved on the call` resolves the ticket and logging `No
 *              answer` does not, and the operator reads that before they
 *              commit rather than discovering it in the queue afterwards.
 *   R3         one primary. `Cancel` is secondary.
 *   AC-74/75   every string is a key in `./copy`.
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logTicketCall } from '@/data/clients'
import { TICKET_CALL_OUTCOMES, isApiError, type Ticket, type TicketCallOutcome } from '@/data/types'
import type { Translate } from '@/lib'

export interface LogCallModalProps {
  ticket: Ticket
  open: boolean
  onClose: () => void
  /** The updated ticket, so the caller can refetch and toast against a real record. */
  onLogged: (ticket: Ticket) => void
  actorId: string
  actorName: string
  t: Translate
}

export function LogCallModal({
  ticket,
  open,
  onClose,
  onLogged,
  actorId,
  actorName,
  t,
}: LogCallModalProps) {
  const [outcome, setOutcome] = useState<TicketCallOutcome>('resolved-on-call')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* A different ticket is a different form. Carrying one ticket's call note
     into the next is how a wrap-up ends up on the wrong record. */
  useEffect(() => {
    setOutcome('resolved-on-call')
    setNotes('')
    setFailure(null)
    setBusy(false)
  }, [ticket.id])

  /**
   * §11.2's second clause. An outcome is always selected, so the only refusal
   * left is the one the *note* carries: everything except `no-answer` records a
   * decision somebody else will read, and a decision with no note is a decision
   * nobody can check. `no-answer` needs none — there was nothing to summarise.
   */
  const refusal: string | null =
    outcome !== 'no-answer' && notes.trim() === '' ? t('ticket.logCall.blocked.note') : null

  const handleConfirm = async () => {
    if (refusal !== null) return
    setBusy(true)
    setFailure(null)
    try {
      const updated = await logTicketCall(
        { ticketId: ticket.id, outcome, notes: notes.trim() ? notes.trim() : null },
        actorId,
        actorName,
      )
      onLogged(updated)
    } catch (error) {
      setFailure(
        t('ticket.logCall.failed', {
          reason: isApiError(error) ? error.message : String(error),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('ticket.logCall.title', { id: ticket.id })}</DialogTitle>
          <DialogDescription>
            {t('ticket.logCall.desc', { name: ticket.entityName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="call-outcome" className="text-xs font-medium">
              {t('ticket.logCall.outcome')}
            </Label>
            <Select
              value={outcome}
              onValueChange={(next) => setOutcome(next as TicketCallOutcome)}
              disabled={busy}
            >
              <SelectTrigger id="call-outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CALL_OUTCOMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`ticket.call.outcome.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="call-notes" className="text-xs font-medium">
              {t('ticket.logCall.notes')}
            </Label>
            <Textarea
              id="call-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('ticket.logCall.notesPlaceholder')}
              disabled={busy}
              aria-invalid={refusal !== null && notes !== ''}
            />
          </div>

          {/* The derived line — what logging this does to the ticket. */}
          <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
            {t(`ticket.logCall.willDo.${outcome}`)}
          </p>

          {failure !== null && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {failure}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('ticket.logCall.cancel')}
          </Button>
          <span className="flex flex-col items-stretch gap-1">
            <Button
              size="xs"
              onClick={() => void handleConfirm()}
              disabled={busy || refusal !== null}
              aria-describedby={refusal === null ? undefined : 'log-call-refusal'}
            >
              {busy ? t('ticket.logCall.saving') : t('ticket.logCall.confirm')}
            </Button>
            {refusal !== null && (
              <span
                id="log-call-refusal"
                className="text-2xs whitespace-normal text-muted-foreground"
              >
                {refusal}
              </span>
            )}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
