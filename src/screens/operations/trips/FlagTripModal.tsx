/**
 * **Flag trips for investigation** — the form behind `Flag` on the row kebab
 * **and** on the bulk bar. `surfaces.md`: a short focused form is a modal.
 *
 * ## What changed, and why each one was a defect
 *
 * **The fake latency is gone.** `handleConfirm` ran `setTimeout(…, 200)`, called
 * `onConfirm` and closed. The real write started *after* the dialog was already
 * gone, so a rejection had nowhere to report but a toast over a surface the
 * operator had left — and the 200ms made an unwired form feel wired, which is
 * the pattern that hides a missing write. `onConfirm` is awaited now, the
 * dialog stays open for the round trip, and a refusal renders **in place** with
 * the category and the note intact (§11.2).
 *
 * **It takes a SET.** One form, one confirmation copy, one write path, whether
 * the operator used the kebab on one row or the bulk bar over twelve. A second
 * bulk-only dialog is how the two surfaces end up asking different questions
 * about the same act — §9.1's confirmation states the verb **and the count**,
 * which is a difference in the sentence and not in the flow.
 *
 * **The category list is keys, not strings.** It was five `<SelectItem>`s with
 * English hardcoded in JSX; the screen passes the keys and the copy lives in
 * `./copy.ts` (**AC-74**).
 *
 * ## Reported, not fixed here
 *
 * `flagTrip(id, _reason)` (`clients/trips.ts:167`) takes the reason and
 * **ignores it**: `setTripFlag` writes the boolean only. So the category and
 * the note this form collects are stored nowhere, and the *Flagged* view can
 * tell an operator that a trip is under investigation without telling them what
 * for. Named in the handoff for mock-data-engineer — the form is right and the
 * client is thin, not the other way round.
 *
 * Rules applied
 *   §9.1 / §5.3  the title states the VERB and the COUNT; the body states the
 *                consequence **and what will not change**; the primary repeats
 *                the verb. Never `OK`, `Yes` or `Confirm`.
 *   R5a          **blue, not red.** A flag is reversible from the same kebab,
 *                so it is not one of the four places red is permitted.
 *   §10.4        validated in the modal, not as a 422 the operator has to
 *                interpret: the primary is dead until a category is chosen.
 *   §7.2         nothing here removes an outline, so nothing restores one.
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
import { isApiError, type Trip } from '@/data/types'
import { formatCount, type Translate } from '@/lib'

interface FlagTripModalProps {
  /** The trips being flagged. Empty closes the dialog; one or many opens it. */
  trips: readonly Trip[]
  /** The category options, as copy KEYS. The screen owns the list, this renders it. */
  reasonKeys: readonly string[]
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (trips: readonly Trip[], reason: string) => Promise<void>
  t: Translate
}

export function FlagTripModal({ trips, reasonKeys, onClose, onConfirm, t }: FlagTripModalProps) {
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const open = trips.length > 0
  /* Each opening is a fresh question: last time's category, note and failure
     must not greet the operator on the next trip. */
  useEffect(() => {
    if (open) {
      setCategory('')
      setNote('')
      setSubmitError(null)
    }
  }, [open])

  const single = trips.length === 1 ? trips[0] : undefined

  const handleConfirm = async () => {
    if (category === '') return
    /* One key with two named placeholders. `category + ': ' + note` is what
       AC-75 forbids, and it is also unparseable by whatever eventually stores
       it — so the two travel joined by a delimiter the client owns, not by a
       sentence assembled here. */
    const reason = note.trim() === '' ? category : `${category}|${note.trim()}`
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(trips, reason)
      onClose()
    } catch (error: unknown) {
      setSubmitError(isApiError(error) ? error.message : t('trips.flag.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {/* §9.1 — the VERB and the COUNT. One trip names itself; twelve
                name their number, because `Flag trip TRP-7741 and 11 others` is
                a sentence nobody can check. */}
            {single
              ? t('trips.flag.title.one', { id: single.id })
              : t('trips.flag.title.other', { count: formatCount(trips.length) })}
          </DialogTitle>
          <DialogDescription>
            {t(single ? 'trips.flag.body.one' : 'trips.flag.body.other')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-category" className="text-xs font-medium">
              {t('trips.flag.category')}
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="flag-category">
                <SelectValue placeholder={t('trips.flag.category')} />
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
            <Label htmlFor="flag-note" className="text-xs font-medium">
              {t('trips.flag.note')}
            </Label>
            <Input
              id="flag-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('trips.flag.notePlaceholder')}
            />
          </div>

          {/* §11.2 / §8.4.4 — the refusal is real text, in the surface that
              made the request, with the operator's input still on screen. */}
          {submitError !== null && (
            <p role="alert" className="text-xs text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {/* The shell's own key: `Cancel` is shared vocabulary and this
                screen has no business minting a second copy of it. */}
            {t('table.cancel')}
          </Button>
          {/* R5a — BLUE. A flag is reversible from the same kebab, so it is not
              one of the four places red is permitted. */}
          <Button size="xs" onClick={() => void handleConfirm()} disabled={busy || category === ''}>
            {t(single ? 'trips.flag.confirm' : 'trips.flag.confirm.other')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
