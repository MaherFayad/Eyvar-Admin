/**
 * **Cancel and settle a subscription** — Operations › Subscriptions.
 *
 * ## What changed
 *
 * **The fake latency is gone.** This ran `setTimeout(…, 200)` and closed before
 * `cancelSubscription` had been called, so a rejection could only surface as a
 * toast over a dialog the operator had already left. `onConfirm` is awaited
 * now, the dialog stays open for the round trip, and a refusal renders in place
 * with the reason and the note intact (§11.2).
 *
 * **The refund figure was labelled `Calculated refund`, and it is not.** It is
 * `paidHalalas / tripsIncluded × unused`, computed in this component. The
 * settlement is computed by the **server** and returned on `refundedHalalas`,
 * and `clients/subscriptions.ts` says so in as many words: *"computing it
 * client-side is how two screens end up offering two refunds."* The two can
 * disagree, and a label claiming otherwise is a promise this screen cannot
 * keep.
 *
 * Two changes follow, and neither invents a policy:
 *
 *   - **the line reads `Estimated refund`**, with a sentence saying Finance
 *     calculates the settlement on confirmation;
 *   - **the toast quotes the SERVER's figure**, not this one (see
 *     `SubscriptionsScreen.runCancel`).
 *
 * Reported to product-owner: the honest fix is a quote endpoint, so the
 * operator sees the real number **before** committing rather than after.
 *
 * **The reason list is keys, not strings.** Five `<SelectItem>`s with English
 * hardcoded in JSX became a list the screen passes and `./copy.ts` owns
 * (**AC-74**).
 *
 * Rules applied
 *   §9.1 / §5.3  the title states the verb and the object; the body states the
 *                consequence **and that it cannot be undone from here**; the
 *                primary repeats the verb, never `Confirm`.
 *   R5a          **blue, not red.** R5a spends red on four things and a
 *                subscription cancellation with a refund behind it is a
 *                recoverable commercial act, not one of them. The gravity is
 *                carried by the confirmation itself and by the money on screen.
 *   §10.4        validated in the modal: the primary is dead until a reason is
 *                chosen, rather than surfacing a 422 the operator must decode.
 *   AC-73        every figure is `<bdi>`-isolated through `Money` / `bdi`.
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Money } from '@/components/Money'
import { isApiError, type Subscription } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'

interface CancelSettleModalProps {
  subscription: Subscription | null
  /** The termination reasons, as copy KEYS. The screen owns the list. */
  reasonKeys: readonly string[]
  open: boolean
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (subId: string, reason: string) => Promise<void>
  language: Language
  t: Translate
}

export function CancelSettleModal({
  subscription,
  reasonKeys,
  open,
  onClose,
  onConfirm,
  language,
  t,
}: CancelSettleModalProps) {
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* Hooks first, guard second — the early return must never change the hook
     order between renders. Each opening is a fresh question. */
  const subscriptionId = subscription?.id ?? null
  useEffect(() => {
    setCategory('')
    setNote('')
    setSubmitError(null)
  }, [subscriptionId])

  if (!subscription) return null

  const unused = Math.max(0, subscription.tripsIncluded - subscription.tripsCompleted)
  /* An ESTIMATE, and the label says so. See the header. */
  const estimateHalalas =
    subscription.tripsIncluded > 0
      ? Math.round((subscription.paidHalalas / subscription.tripsIncluded) * unused)
      : 0

  const handleConfirm = async () => {
    if (category === '') return
    const reason = note.trim() === '' ? category : `${category}|${note.trim()}`
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(subscription.id, reason)
      onClose()
    } catch (error: unknown) {
      setSubmitError(isApiError(error) ? error.message : t('subs.settle.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('subs.settle.title', { id: subscription.id })}</DialogTitle>
          <DialogDescription>{t('subs.settle.body')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <SummaryRow label={t('subs.settle.paid')}>
              <Money amount={subscription.paidHalalas} />
            </SummaryRow>
            <SummaryRow label={t('subs.settle.tripsRatio')}>
              <bdi>
                {t('subs.trips.ratio', {
                  completed: formatCount(subscription.tripsCompleted, language),
                  included: formatCount(subscription.tripsIncluded, language),
                })}
              </bdi>
            </SummaryRow>
            <SummaryRow label={t('subs.settle.unused')}>
              <bdi>{formatCount(unused, language)}</bdi>
            </SummaryRow>
            <span aria-hidden="true" className="my-0.5 h-px bg-border" />
            <SummaryRow label={t('subs.settle.estimate')} strong>
              <Money amount={estimateHalalas} />
            </SummaryRow>
            {/* The sentence that stops a browser-side arithmetic result from
                reading as a settlement Finance has agreed to. */}
            <p className="text-2xs text-muted-foreground">{t('subs.settle.estimateHelp')}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-category" className="text-xs font-medium">
              {t('subs.settle.reason')}
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="settle-category">
                <SelectValue placeholder={t('subs.settle.reason')} />
              </SelectTrigger>
              <SelectContent>
                {reasonKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-note" className="text-xs font-medium">
              {t('subs.settle.note')}
            </Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('subs.settle.notePlaceholder')}
            />
          </div>

          {/* §11.2 / §8.4.4 — a refusal is real text, in the surface that made
              the request. */}
          {submitError !== null && (
            <p role="alert" className="text-xs text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('table.cancel')}
          </Button>
          <Button size="xs" onClick={() => void handleConfirm()} disabled={busy || category === ''}>
            {t('subs.settle.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A label and a figure on one line. R4: the figure takes the inline-END. */
function SummaryRow({
  label,
  strong = false,
  children,
}: {
  label: string
  strong?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'text-end font-semibold tabular-nums text-foreground'
            : 'text-end tabular-nums text-foreground'
        }
      >
        {children}
      </span>
    </div>
  )
}
