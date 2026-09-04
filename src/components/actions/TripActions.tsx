/**
 * **A ride's two commands, mounted on the record sheet** — the footer row and
 * the flag form behind it.
 *
 * `Flag` and `Remove flag` are what the trips table offers on every row, and
 * the owner asked for them on the sheet that row opens. Everything that could
 * have become a second answer is a call into `./trip.ts` instead — the
 * predicate, the write, the toast and the five categories are the queue's own.
 *
 * `TripFooter`'s header still records the argument against a third caller, and
 * it was right about the hazard: *"Adding a third caller in a drawer would be a
 * second gate on the same command."* The hazard was the second GATE, and there
 * isn't one — both surfaces call `flagRefusal`. The §5.5 objection in the same
 * comment is real and is knowingly suspended; `ActionBar`'s header carries the
 * owner's decision and the way back.
 *
 * ## Why `Remove flag` needs no form and `Flag` does
 *
 * Flagging asks *why* — a category from a closed list, which is the whole point
 * of the flag — so it takes the form. Un-flagging asks nothing: it is the
 * inverse of a decision already recorded, and a confirmation on it would be a
 * dialog whose only answer is yes. `runUnflag` toasts and is done, exactly as
 * the queue's own `Remove flag` does.
 */

import { useState } from 'react'
import type { Trip } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { ActionBar, type SheetAction } from './ActionBar'
import { FlagTripModal } from './FlagTripModal'
import { FLAG_REASONS, flagRefusal, runFlag, runUnflag, unflagRefusal } from './trip'

export interface TripActionsProps {
  trip: Trip
  /** Whether this operator holds the write permission. Gates both commands. */
  canWrite: boolean
  onOpenFullRecord: () => void
  /** Called after a write lands, so the owner of the record can re-read it. */
  onDone: () => void
  t: Translate
  language: Language
}

export function TripActions({
  trip,
  canWrite,
  onOpenFullRecord,
  onDone,
  t,
  language,
}: TripActionsProps) {
  const [flagging, setFlagging] = useState(false)
  const [busy, setBusy] = useState(false)

  const context = {
    roleReason: canWrite ? null : t('trips.action.noPermission'),
    t,
    language,
  }
  /* A set of one — the predicates take an array because the bulk bar does, and
     passing `[record]` is what makes a single record impossible to refuse
     differently from the same record inside a selection. */
  const one = [trip]
  const flag = flagRefusal(one, context)
  const unflag = unflagRefusal(one, context)

  const actions: SheetAction[] = [
    {
      id: 'trip-flag',
      label: t('trips.action.flag'),
      onSelect: () => setFlagging(true),
      disabled: flag.refused,
      reason: flag.reason,
    },
    {
      id: 'trip-unflag',
      label: t('trips.action.unflag'),
      onSelect: () => {
        /* Not re-entrant: `runUnflag` toasts on failure rather than throwing,
           so nothing else here would stop a second press landing a second
           write. */
        if (busy) return
        setBusy(true)
        void runUnflag(one, { onRecord: onDone, t, language }).finally(() => setBusy(false))
      },
      disabled: unflag.refused || busy,
      reason: unflag.reason,
    },
  ]

  return (
    <>
      <ActionBar
        onOpenFullRecord={onOpenFullRecord}
        openLabel={t('profile.trip.footer.open')}
        actions={actions}
      />

      <FlagTripModal
        trips={flagging ? one : []}
        reasonKeys={FLAG_REASONS}
        onClose={() => setFlagging(false)}
        onConfirm={async (trips, reason) => {
          await runFlag(trips, reason, { onRecord: onDone, t, language })
          setFlagging(false)
        }}
        t={t}
      />
    </>
  )
}
