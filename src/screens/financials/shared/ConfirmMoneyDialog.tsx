/**
 * The Financials confirmation — every money-moving act on the seven sub-tabs
 * raises this one dialog.
 *
 * `DESIGN.md` §5.3, §5.4, **R5a**, spec §7.3 and §10.3.
 *
 * | Where | Lines | Amount | Reason |
 * |---|---|---|---|
 * | Pay a captain (**AC-366**) | payable · debt · **net** | — | — |
 * | Release escrow (**AC-364**) | amount | — | — |
 * | Apply a deduction (**AC-371**) | amount | — | — |
 * | Waive a deduction (**AC-369**) | amount | — | **required** |
 * | Resolve / escalate a cash report (**AC-374**) | — | — | **required** |
 * | Record a repayment (**AC-379**) | outstanding | **required** | **required** |
 * | Adjust a wallet (**AC-386**, **AC-387**) | authority | **required** | **required** |
 * | Suspend surge (**AC-411**) | — | — | **required** |
 *
 * ## Why this is not `queues/ConfirmDialog`
 *
 * That dialog serves the §4 dispositions and has a reason and a counterparty.
 * Two criteria here need a third field it does not have, and both are the point
 * of their sub-tab: **AC-379** requires a **partial amount**, because
 * `commitCashRepayment` clears the balance to zero by assignment and calls it a
 * feature (`:12197`, **D-F5**); and **AC-366** requires **three labelled
 * lines** — payable, debt, net — because the transferred amount is the net and
 * legacy has been over-paying by the debt for two versions (**D-F6**).
 *
 * Rules applied
 *   §9.1       440px, vertically centred. The title states **the verb and the
 *              amount**; the body states the consequence **and what will not
 *              change** (rule 9); the primary **repeats the verb**.
 *   §5.3 / R5a the primary is the ordinary one. Every act here is recorded,
 *              audited and appealable, so none of them spends R5a use #1.
 *   §10.4      a required reason is validated **in the modal, before the
 *              mutation** — never as a 422 the operator has to interpret. Every
 *              422 the clients can raise for a missing reason is reachable, and
 *              this is what stops an operator meeting one.
 *   §8.3.1 / §4.2
 *              the amount field is a money **input**, so `SAR` is an
 *              inline-START prefix inside the field — the opposite of a money
 *              *output*, which carries the code trailing. Two rules, one field
 *              type, and this is the input side.
 *   §7.3.3     the modal traps focus; `Escape` cancels and **nothing has
 *              mutated** at that point.
 */

import { useEffect, useMemo, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/components/Money'
import { formatMoneyInput, parseMoneyInput, type Translate } from '@/lib'
import type { Halalas } from '@/data/types'

export interface ConfirmLine {
  label: string
  amountHalalas: Halalas
  /** The line the act commits — the net, the remainder. Weight, never colour. */
  emphasis?: boolean
}

export interface ConfirmReasonOption {
  value: string
  label: string
}

export interface MoneyConfirmRequest {
  title: string
  /** One sentence: the consequence, and what will NOT change. */
  body: string
  confirmLabel: string
  /** **AC-366** — the labelled lines, in the order the operator reads them. */
  lines?: readonly ConfirmLine[]
  /** A standing note the confirmation must state before it commits (**AC-386**). */
  note?: string | null
  /** **AC-379** — a partial amount. Bounded by `maxHalalas`, never clamped silently. */
  amount?: {
    label: string
    help: string
    message: string
    maxHalalas: Halalas
    /** Prefilled, in halalas. The operator may lower it. */
    initialHalalas?: Halalas
  }
  /** A free-text reason (**AC-369**) or a closed set of reason codes (**AC-387**). */
  reason?: {
    label: string
    help: string
    message: string
    options?: readonly ConfirmReasonOption[]
    placeholder?: string
  }
  onConfirm: (values: { amountHalalas: Halalas | null; reason: string }) => void
}

export function ConfirmMoneyDialog({
  request,
  onClose,
  busy,
  t,
}: {
  request: MoneyConfirmRequest | null
  onClose: () => void
  busy: boolean
  t: Translate
}) {
  const [raw, setRaw] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  /* A fresh dialog starts clean, keyed on the title, so a second confirmation
     never inherits the first one's half-typed amount or reason. */
  useEffect(() => {
    setRaw(
      request?.amount?.initialHalalas === undefined
        ? ''
        : formatMoneyInput(request.amount.initialHalalas),
    )
    setReason('')
    setTouched(false)
  }, [request?.title, request?.amount?.initialHalalas])

  const amountHalalas = useMemo(() => (raw.trim() === '' ? null : parseMoneyInput(raw)), [raw])

  if (request === null) return null

  const amountRequired = request.amount !== undefined
  const amountBad =
    amountRequired &&
    (amountHalalas === null ||
      amountHalalas <= 0 ||
      amountHalalas > (request.amount?.maxHalalas ?? 0))
  const reasonMissing = request.reason !== undefined && reason.trim() === ''
  const invalid = amountBad || reasonMissing

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.body}</DialogDescription>
        </DialogHeader>

        {request.lines && request.lines.length > 0 && (
          <dl className="flex flex-col gap-1">
            {request.lines.map((line) => (
              <div
                key={line.label}
                className={
                  line.emphasis
                    ? 'flex items-baseline justify-between gap-3 border-t border-border pt-2 font-semibold'
                    : 'flex items-baseline justify-between gap-3'
                }
              >
                <dt className="text-sm text-muted-foreground">{line.label}</dt>
                <dd className="text-sm text-foreground">
                  <Money amount={line.amountHalalas} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {request.note && <p className="text-sm text-muted-foreground">{request.note}</p>}

        {request.amount && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="fin-confirm-amount">{request.amount.label}</Label>
            <div className="flex items-center gap-2">
              {/* §4.2 — the currency PREFIX rule governs a money input. The code
                  sits at the field's inline start, outside the value, so the
                  operator types digits and nothing else. */}
              <span aria-hidden="true" className="text-sm text-muted-foreground">
                SAR
              </span>
              <Input
                id="fin-confirm-amount"
                inputMode="decimal"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && amountBad ? true : undefined}
                aria-describedby="fin-confirm-amount-help"
              />
            </div>
            <p id="fin-confirm-amount-help" className="text-xs text-muted-foreground">
              {touched && amountBad ? request.amount.message : request.amount.help}
            </p>
          </div>
        )}

        {request.reason && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="fin-confirm-reason">{request.reason.label}</Label>
            {request.reason.options ? (
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  id="fin-confirm-reason"
                  aria-invalid={touched && reasonMissing ? true : undefined}
                  aria-describedby="fin-confirm-reason-help"
                  className="w-full"
                >
                  <SelectValue placeholder={request.reason.placeholder ?? request.reason.label} />
                </SelectTrigger>
                <SelectContent>
                  {request.reason.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Textarea
                id="fin-confirm-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && reasonMissing ? true : undefined}
                aria-describedby="fin-confirm-reason-help"
              />
            )}
            <p id="fin-confirm-reason-help" className="text-xs text-muted-foreground">
              {touched && reasonMissing ? request.reason.message : request.reason.help}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('queue.confirm.cancel')}
          </Button>
          {/* **AC-333 / AC-387** — the primary is disabled until a reason is
              chosen, and it is not re-triggerable while a commit is in flight. */}
          <Button
            variant="default"
            disabled={invalid || busy}
            onClick={() => request.onConfirm({ amountHalalas, reason: reason.trim() })}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
