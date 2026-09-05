/**
 * The verdict form. **This is the surface that moves money**, and it had two
 * defects, both fixed here.
 *
 * 1. **The primary was `disabled={busy}` and nothing else** (`:127` of the old
 *    file). Choosing *Partial refund* and leaving the amount blank produced
 *    `parseFloat('') || 0` → `0`, and the button stayed live: an operator could
 *    confirm a 0.00 SAR partial refund and be told it had worked. §11.2 requires
 *    a control the operator may not use to be **disabled in place with its
 *    reason**, so the refusal is now computed from the form and rendered as a
 *    sentence the button points `aria-describedby` at.
 * 2. **`setTimeout(() => { onConfirm(); onClose() }, 200)`** — a fake 200 ms that
 *    made an unwired form feel wired, and closed the dialog before anything had
 *    happened. Gone. `onConfirm` is awaited, the real client call supplies the
 *    real latency, and the dialog **stays open on failure** with the seam's own
 *    reason on screen. Closing over a refusal loses the operator's note and
 *    tells them nothing.
 *
 * Rules applied
 *   §11.2      disabled in place, with the reason as rendered text and never a
 *              `title`. Same construction as `components/table/rowActions.tsx`,
 *              which is where this contract already lives.
 *   §8         the *"what this will do"* line is a **derived value**: computed
 *              from the verdict and the amount, never typed, and stated before
 *              the operator commits.
 *   §8.3       money is integer halalas. The operator types major units and
 *              `parseMoneyInput` converts on the digit string — `19.99 * 100` is
 *              `1998.9999999999998` and that is how a halala goes missing.
 *   §10.4      an invalid field carries a 1px `--ev-red` border **and** a
 *              message. No fill — see `DECISIONS.md` §6.2 D-14 clause B.
 *   AC-74/75   every string is a key in `./copy`, with named placeholders.
 *   R3         one primary. `Cancel` is secondary.
 */

import { useEffect, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/components/Money'
import { getTeamUser, type ResolveDisputeInput } from '@/data/clients'
import { useAsync } from '@/hooks'
import { DISPUTE_OUTCOMES, type Dispute, type DisputeOutcome } from '@/data/types/dispute'
import { isApiError } from '@/data/types'
import { useShell } from '@/shell/ShellContext'
import { formatDate, formatMoney, parseMoneyInput, type Language, type Translate } from '@/lib'

export interface ResolveDisputeModalProps {
  dispute: Dispute | null
  open: boolean
  /** §11.2 — `false` disables the primary with a reason; it never hides it. */
  canWrite: boolean
  onClose: () => void
  /**
   * The screen owns the client call. This component composes an input and
   * renders whatever comes back — including a rejection, which it shows inline
   * rather than swallowing.
   */
  onConfirm: (input: ResolveDisputeInput) => Promise<void>
  /** B2: hands the dispute to an operator whose cap covers the amount. */
  onRequestApproval?: (amountHalalas: number) => Promise<void>
  t: Translate
  language: Language
}

/** Which verdicts let the operator choose the figure. The other two are fixed. */
const AMOUNT_IS_EDITABLE: Record<DisputeOutcome, boolean> = {
  'full-refund': false,
  'partial-refund': true,
  'goodwill-credit': true,
  declined: false,
}

export function ResolveDisputeModal({
  dispute,
  open,
  canWrite,
  onClose,
  onConfirm,
  onRequestApproval,
  t,
  language,
}: ResolveDisputeModalProps) {
  /* B2: the signed-in operator's ceiling from their team record; `null` is no ceiling. */
  const session = useShell().session
  const me = useAsync((signal) => getTeamUser(session?.userId ?? '', signal), {
    deps: [session?.userId],
    enabled: session !== null,
    cacheKey: 'session.me',
  })
  const capHalalas = me.data?.compensationCapHalalas ?? null
  const [outcome, setOutcome] = useState<DisputeOutcome>('full-refund')
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* A new claim is a new form. Without this the previous claim's amount and
     note ride into the next one, which on a money surface is not a cosmetic
     bug. Keyed on the id so re-opening the SAME claim keeps what was typed. */
  useEffect(() => {
    setOutcome('full-refund')
    setAmountInput('')
    setNote('')
    setFailure(null)
    setBusy(false)
  }, [dispute?.id])

  const editable = AMOUNT_IS_EDITABLE[outcome]

  /**
   * The figure that will actually move, in integer halalas.
   *
   * `null` means *"the operator has not given one"* — which is a different
   * thing from zero, and telling them apart is the whole of defect 2. The old
   * modal collapsed both to `0` with `parseFloat(x) || 0`.
   */
  const amountHalalas: number | null = useMemo(() => {
    if (dispute === null) return null
    if (outcome === 'declined') return 0
    if (outcome === 'full-refund') return dispute.amountHalalas
    return parseMoneyInput(amountInput)
  }, [amountInput, dispute, outcome])

  /**
   * §11.2's second clause. `null` means the primary is live; a sentence means
   * it is disabled and this is why.
   */
  const refusal: string | null = useMemo(() => {
    if (dispute === null) return null
    if (!canWrite) return t('dispute.resolve.blocked.permission')
    if (amountHalalas === null || (editable && amountHalalas <= 0)) {
      return t('dispute.resolve.blocked.amountRequired')
    }
    if (amountHalalas > dispute.amountHalalas) {
      return t('dispute.resolve.blocked.amountAboveClaim', {
        max: formatMoney(dispute.amountHalalas, { unit: 'code' }),
      })
    }
    if (capHalalas !== null && amountHalalas > capHalalas) {
      return t('dispute.resolve.blocked.aboveCap', { cap: formatMoney(capHalalas, { unit: 'code' }) })
    }
    return null
  }, [amountHalalas, canWrite, capHalalas, dispute, editable, t])
  const aboveCap = capHalalas !== null && amountHalalas !== null && amountHalalas > capHalalas

  if (dispute === null) return null

  const willMove =
    amountHalalas === null || amountHalalas === 0
      ? t('dispute.resolve.willMove.nothing')
      : t(
          dispute.claimantType === 'captain'
            ? 'dispute.resolve.willMove.captain'
            : 'dispute.resolve.willMove.rider',
          {
            amount: formatMoney(amountHalalas, { unit: 'code' }),
            name: dispute.claimantName,
          },
        )

  const handleConfirm = async () => {
    if (refusal !== null || amountHalalas === null) return
    setBusy(true)
    setFailure(null)
    try {
      await onConfirm({
        disputeId: dispute.id,
        outcome,
        refundHalalas: amountHalalas,
        note: note.trim() ? note.trim() : null,
      })
    } catch (error) {
      /* The seam's own sentence, not a generic one. `ApiError.message` names the
         ceiling, the claim total or the conflict; replacing it with "something
         went wrong" is how an operator retries the same refused amount. */
      setFailure(
        t('dispute.resolve.failed', {
          reason: isApiError(error) ? error.message : String(error),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dispute.resolve.title', { id: dispute.id })}</DialogTitle>
          <DialogDescription>
            {t('dispute.resolve.desc', { claimant: dispute.claimantName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* What is claimed, and on what evidence. The page is titled
              "evidence-first resolution"; deciding without it is what this
              block exists to prevent. */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('dispute.resolve.kind')}</span>
              <span className="text-foreground">{t(`dispute.kind.${dispute.kind}`)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('dispute.resolve.claimed')}</span>
              <span className="font-semibold">
                <Money amount={dispute.amountHalalas} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('dispute.resolve.filed')}</span>
              <span className="text-foreground">
                {formatDate(dispute.filedAt, { style: 'day-month-time', language })}
              </span>
            </div>
            <p className="border-t border-border pt-2 text-muted-foreground">
              <span className="block font-medium text-foreground">
                {t('dispute.resolve.claim')}
              </span>
              {dispute.claim}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">
              {t('dispute.resolve.evidence')}
            </span>
            {dispute.evidence.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('dispute.resolve.noEvidence')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dispute.evidence.map((item) => (
                  <li
                    key={`${item.source}-${item.detail}`}
                    className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {t(`dispute.evidence.${item.source}`)}
                    </span>
                    {' — '}
                    {item.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dispute-verdict" className="text-xs font-medium">
              {t('dispute.resolve.verdict')}
            </Label>
            <Select
              value={outcome}
              onValueChange={(next) => setOutcome(next as DisputeOutcome)}
              disabled={busy}
            >
              <SelectTrigger id="dispute-verdict">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_OUTCOMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`dispute.outcome.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editable && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dispute-amount" className="text-xs font-medium">
                {t('dispute.resolve.amount')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t('dispute.resolve.amountUnit')}
                </span>
                <Input
                  id="dispute-amount"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  aria-describedby="dispute-amount-help"
                  /* §10.4 — the border and the message. The message is the
                     refusal line under the primary; there is no third fill. */
                  aria-invalid={refusal !== null && amountInput.trim() !== ''}
                />
              </div>
              <p id="dispute-amount-help" className="text-xs text-muted-foreground">
                {t('dispute.resolve.amountHelp', {
                  max: formatMoney(dispute.amountHalalas, { unit: 'code' }),
                })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dispute-note" className="text-xs font-medium">
              {t('dispute.resolve.note')}
            </Label>
            <Textarea
              id="dispute-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('dispute.resolve.notePlaceholder')}
              disabled={busy}
            />
          </div>

          {/* The derived line. It is the sentence the operator is agreeing to. */}
          <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
            {willMove}
            {capHalalas !== null && (
              <>
                {' '}
                {t('dispute.resolve.capLine', { cap: formatMoney(capHalalas, { unit: 'code' }) })}
              </>
            )}
          </p>

          {failure !== null && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {failure}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('dispute.resolve.cancel')}
          </Button>
          {aboveCap && onRequestApproval !== undefined && amountHalalas !== null && (
            <Button
              variant="secondary"
              size="xs"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                onRequestApproval(amountHalalas)
                  .then(onClose)
                  .catch((error: unknown) =>
                    setFailure(
                      t('dispute.resolve.failed', { reason: isApiError(error) ? error.message : String(error) }),
                    ),
                  )
                  .finally(() => setBusy(false))
              }}
            >
              {t('dispute.resolve.requestApproval')}
            </Button>
          )}
          <span className="flex flex-col items-stretch gap-1">
            <Button
              size="xs"
              onClick={() => void handleConfirm()}
              disabled={busy || refusal !== null}
              aria-describedby={refusal === null ? undefined : 'dispute-resolve-refusal'}
            >
              {busy ? t('dispute.resolve.submitting') : t('dispute.resolve.confirm')}
            </Button>
            {refusal !== null && (
              <span
                id="dispute-resolve-refusal"
                className="block text-xs font-normal whitespace-normal text-muted-foreground"
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
