/**
 * The ride sheet's footer — §6.2's footer exactly: **a plain link, and no
 * primary, because the layer commits nothing.**
 *
 * `Flag` and `Remove flag` are not here: they are `TripActions`, which resolves
 * `src/commands/trips.ts`, so the sheet and the table share one predicate and
 * one write rather than a second gate on the same command.
 *
 * What an operator can do from here is *reach* the ride's other records — the
 * rider, the captain, the subscription, the payment — and every one of those is
 * a real link inside the body.
 */

import { Button } from '@/components/ui/button'
import type { Translate } from '@/lib'

export interface TripFooterProps {
  onOpenFullRecord: () => void
  t: Translate
}

export function TripFooter({ onOpenFullRecord, t }: TripFooterProps) {
  return (
    <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
      <Button variant="link" onClick={onOpenFullRecord}>
        {t('profile.trip.footer.open')}
      </Button>
    </div>
  )
}
