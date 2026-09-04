/**
 * **A ride's two commands, as one declaration each** — `Flag` and `Remove
 * flag`.
 *
 * Same reasoning as `subscription.ts`, and the same trigger: the owner asked
 * for the table's actions to be present in the record sheet too, and a command
 * with two callers needs one declaration or the two surfaces disagree about who
 * may run it.
 *
 * `TripFooter`'s header records the state this replaces — *"it lives on the
 * trips table, where it is declared once, gated once … Adding a third caller in
 * a drawer would be a second gate on the same command."* The objection was to a
 * second GATE, not to a second control, and this file removes the second gate:
 * the queue and the sheet now call the same predicate and the same write.
 *
 * The §5.5 conflict the same comment raises — that the flag form is a modal and
 * a modal may not open inside a drawer — is real, was put to the owner, and the
 * owner chose to reuse the existing modal. It is recorded at `TripActions`,
 * where the modal is mounted, rather than here.
 */

import { toast } from 'sonner'
import { flagTrip, unflagTrip } from '@/data/clients'
import type { Trip } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'
import { setRefusal, type SetRefusal } from '@/screens/operations/bulkRefusal'

/** The five categories the flag form offers. Keys, never strings (AC-74). */
export const FLAG_REASONS: readonly string[] = [
  'trips.reason.fareDispute',
  'trips.reason.routeDeviation',
  'trips.reason.speedViolation',
  'trips.reason.safetyIncident',
  'trips.reason.unusualPairing',
]

export interface TripCommandContext {
  /** D17 / D21 rule 5 — a permission refusal outranks every domain refusal. */
  roleReason: string | null
  t: Translate
  language: Language
}

/** Already flagged is the block; the inverse is `unflagRefusal`. */
export function flagRefusal(
  targets: readonly Trip[],
  { roleReason, t, language }: TripCommandContext,
): SetRefusal {
  return setRefusal({
    targets,
    getId: (trip) => trip.id,
    isBlocked: (trip) => trip.flagged,
    roleReason,
    blockedKeyPrefix: 'trips.action.flag.blocked',
    t,
    language,
  })
}

export function unflagRefusal(
  targets: readonly Trip[],
  { roleReason, t, language }: TripCommandContext,
): SetRefusal {
  return setRefusal({
    targets,
    getId: (trip) => trip.id,
    isBlocked: (trip) => !trip.flagged,
    roleReason,
    blockedKeyPrefix: 'trips.action.unflag.blocked',
    t,
    language,
  })
}

/* ── the writes ────────────────────────────────────────────────────────── */

export interface TripWriteContext {
  onRecord: (updated: readonly Trip[]) => void
  t: Translate
  language: Language
}

export async function runFlag(
  trips: readonly Trip[],
  reason: string,
  { onRecord, t, language }: TripWriteContext,
): Promise<void> {
  try {
    const updated = await Promise.all(trips.map((trip) => flagTrip(trip.id, reason)))
    onRecord(updated)
    toast.success(
      trips.length === 1
        ? t('trips.toast.flagged.one')
        : t('trips.toast.flagged.other', { count: formatCount(trips.length, language) }),
    )
  } catch (error: unknown) {
    /* Re-thrown so `FlagTripModal` keeps itself open and states the refusal
       beside the category that produced it (§11.2). */
    throw error instanceof Error ? error : new Error(t('trips.error.flag'))
  }
}

/**
 * **Returns whether the write landed, and that boolean is load-bearing.**
 *
 * Un-flagging has no form to keep open, so unlike `runFlag` it reports the
 * failure as a toast rather than throwing. That leaves the caller with no way
 * to tell success from failure — and the caller has something to do about it:
 * the queue clears its selection, and **a selection cleared after a refused
 * write tells an operator that twelve records changed when none did.**
 *
 * `trips.test.tsx` pins exactly this: inject a failure, un-flag, and the bulk
 * bar must still be holding the record. It is one boolean rather than a throw
 * because the toast is the operator-facing half and re-throwing would make
 * every caller write a `catch` that only swallowed it again.
 *
 * `unflagTrip` runs under the **`trips.flag`** operation (`setTripFlag`), which
 * is why a failure injected on `trips.flag` reaches this path at all.
 */
export async function runUnflag(
  trips: readonly Trip[],
  { onRecord, t, language }: TripWriteContext,
): Promise<boolean> {
  try {
    const updated = await Promise.all(trips.map((trip) => unflagTrip(trip.id)))
    onRecord(updated)
    toast.success(
      trips.length === 1
        ? t('trips.toast.unflagged.one')
        : t('trips.toast.unflagged.other', { count: formatCount(trips.length, language) }),
    )
    return true
  } catch {
    toast.error(t('trips.error.unflag'))
    return false
  }
}
