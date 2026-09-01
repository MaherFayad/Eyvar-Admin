/**
 * **Freeze a subscription** — the form behind `Freeze` on the row kebab **and**
 * on the bulk bar. `surfaces.md`: a short focused form is a modal.
 *
 * ## What changed
 *
 * **The fake latency is gone.** `handleConfirm` ran `setTimeout(…, 200)`, called
 * `onConfirm` and closed. The real write started *after* the dialog was already
 * gone, so a rejection had nowhere to report but a toast over a surface the
 * operator had left — and the 200ms made an unwired form feel wired, which is
 * the pattern that hides a missing write. `onConfirm` is awaited now, the
 * dialog stays open for the round trip, and a refusal renders **in place** with
 * the duration and the reason intact (§11.2).
 *
 * **It takes a SET.** One form, one confirmation, one write path, whether the
 * operator used the kebab on one row or the bulk bar over twelve. §9.1's
 * confirmation states the verb **and the count**, which is a difference in the
 * sentence and not in the flow — a second bulk-only dialog is how two surfaces
 * end up asking different questions about the same act.
 *
 * **The date is computed against the FIXED clock**, `EYVAR_TODAY`, not
 * `Date.now()`. Every fixture in the product is written against it, so a
 * host-clock resume date would disagree with every record it is compared to and
 * a capture taken at 23:59 would differ from one taken at 00:01.
 *
 * Rules applied
 *   §9.1 / §5.3  the title states the verb and the count; the body states the
 *                consequence **and what does not change** — the rider keeps
 *                every unused trip and is charged nothing; the primary repeats
 *                the verb.
 *   R5a          blue. A freeze is reversible, so it is not one of the four
 *                places red is permitted.
 *   AC-73        the resume date is `<bdi>`-isolated: `2 Jul` reorders to
 *                `Jul 2` in an RTL paragraph without it.
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
import { EYVAR_TODAY } from '@/data/mock/clock'
import { isApiError, type Subscription } from '@/data/types'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'

/** The four windows the form offers, in days. A closed set, not free text. */
const DURATIONS: readonly number[] = [3, 7, 14, 30]

interface FreezeModalProps {
  /** The records being frozen. Empty closes the dialog; one or many opens it. */
  subscriptions: readonly Subscription[]
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (subscriptions: readonly Subscription[], untilDate: string) => Promise<void>
  language: Language
  t: Translate
}

export function FreezeModal({
  subscriptions,
  onClose,
  onConfirm,
  language,
  t,
}: FreezeModalProps) {
  const [days, setDays] = useState('7')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const open = subscriptions.length > 0
  /* Each opening is a fresh question. */
  useEffect(() => {
    if (open) {
      setDays('7')
      setReason('')
      setSubmitError(null)
    }
  }, [open])

  const single = subscriptions.length === 1 ? subscriptions[0] : undefined

  /* The fixed clock, deliberately — see the header. */
  const untilDate = (() => {
    const base = new Date(EYVAR_TODAY)
    base.setDate(base.getDate() + (Number.parseInt(days, 10) || 7))
    return base.toISOString().slice(0, 10)
  })()

  const handleConfirm = async () => {
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(subscriptions, untilDate)
      onClose()
    } catch (error: unknown) {
      setSubmitError(isApiError(error) ? error.message : t('subs.freeze.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {single
              ? t('subs.freeze.title.one', { id: single.id })
              : t('subs.freeze.title.other', {
                  count: formatCount(subscriptions.length, language),
                })}
          </DialogTitle>
          <DialogDescription>
            {t(single ? 'subs.freeze.body.one' : 'subs.freeze.body.other')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freeze-duration" className="text-xs font-medium">
              {t('subs.freeze.duration')}
            </Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="freeze-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {t('subs.freeze.days', { count: formatCount(option, language) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* The consequence, restated as a date rather than as a duration:
                `Resumes on 2 Jul` is checkable against a rider's message and
                `14 days` is not. */}
            <p className="text-2xs text-muted-foreground">
              <bdi>{t('subs.freeze.resumeOn', { date: formatDate(untilDate, { language }) })}</bdi>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freeze-reason" className="text-xs font-medium">
              {t('subs.freeze.reason')}
            </Label>
            <Input
              id="freeze-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('subs.freeze.reasonPlaceholder')}
            />
          </div>

          {/* §11.2 / §8.4.4 — a refusal is real text in the surface that made
              the request, with the operator's input still on screen. */}
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
          {/* R5a — blue. A freeze is reversible. */}
          <Button size="xs" onClick={() => void handleConfirm()} disabled={busy}>
            {t(single ? 'subs.freeze.confirm' : 'subs.freeze.confirm.other')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
