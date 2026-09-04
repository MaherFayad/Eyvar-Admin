/**
 * The ride sheet's footer — §6.2's footer exactly: **a plain link, and no
 * primary, because the layer commits nothing.**
 *
 * The one control a ride record could commit is `Flag` / `Remove flag`, and it
 * is deliberately not here. It lives on the trips table, where it is declared
 * once, gated once (`flagRefusal` / `unflagRefusal`) and answers for both the
 * row menu and the bulk bar — one predicate, so there is no single-record code
 * path for the two to disagree in. Adding a third caller in a drawer would be a
 * second gate on the same command, and §5.5 forbids the modal the flag form
 * needs from opening inside a drawer anyway.
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
