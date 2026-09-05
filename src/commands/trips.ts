/**
 * Every command that acts on a **trip** — `design/05-command-centre.md` §2,
 * phase **C-5**.
 *
 * ## Why trips first, after captains
 *
 * Volume. Trips is the highest-traffic index in the console and flagging is the
 * one write on it, so it is the command an operator reaches for most often and
 * the one that most benefits from not going through a kebab.
 *
 * ## The only declaration (X9, T6.1)
 *
 * `TripsScreen`, the ride sheet's `TripActions` and ⌘K all resolve this file,
 * so one predicate and one write answer for four surfaces and `Flag` carries
 * D18's undo on every one of them. `components/actions/trip.ts` was the second
 * declaration and is gone.
 *
 * Ported verbatim:
 *
 *   - the two actions in the screen's own order — `Flag`, then `Remove flag`;
 *   - the same refusal families, including **D21's third sentence**
 *     (`trips.action.flag.blocked.all`), which `bulkRefusal` already wired;
 *   - the same confirmation copy (`trips.flag.*`) and the same toasts
 *     (`trips.toast.flagged.*`, `trips.toast.unflagged.*`);
 *   - **no red** (R5a). A flag is a review marker, removed by the command
 *     declared beneath it, so `affordance` is `default`. Red is spent on the
 *     unrecoverable and this is not it.
 *
 * ## Two things the registry decides that the screen did not have to
 *
 * **1. `Flag` asks for the note; it does not ask *are you sure*.** The screen's
 * `FlagTripModal` collects a **category** and a note. `CommandConfirmRequest`
 * carries one free-text `reason` field, so the category cannot be collected
 * here — and `flagTrip(id, reason?)` drops the reason before the request in
 * both the mock and the `http` branch (`clients/trips.ts:175`), so nothing is
 * lost that the data layer was keeping. The note is still asked for, because
 * the reviewer picking the trip out of the Flagged view needs to know what to
 * look at first, which is what the modal's own helper text says. **Reported in
 * the handoff:** the category belongs in `CommandConfirmRequest` as a declared
 * option list, or `flagTrip` should stop advertising a parameter it discards.
 *
 * **2. `Remove flag` does not confirm, and offers an undo instead.** That is
 * **D18's** trade taken deliberately, and it is the branch `captain.reinstate`
 * could not take: a reversible command whose inverse is declared in the same
 * registry is bought out of its dialog, provided the surface actually offers
 * the handle. The palette does (`outcomeToast.ts`), and the screen's own
 * `Remove flag` never confirmed either — so this is the ported behaviour and
 * the ruling agreeing for once.
 *
 * ## CQ-7
 *
 * `unavailable` reads `trip.flagged` and nothing else. The role half goes
 * through `roleRefusal`, naming `live_ops` — the permission
 * `TripsScreen.tsx:159` computes its own `canWrite` from — so that when **Q4**
 * closes the change is to one function in `registry.ts` and not to this file.
 *
 * **`roleRefusal` still evaluates `session.canWrite`, which today stands for
 * `approve_drivers`.** Naming `live_ops` here is therefore documentation, not a
 * lookup — exactly as `registry.ts` describes the seam. It is recorded in the
 * handoff as the first place where the single-boolean stand-in is visibly the
 * wrong shape: an operator with `live_ops` and without `approve_drivers` is
 * refused a trip flag they are entitled to.
 */

import { FlagIcon, FlagOffIcon } from 'lucide-react'
import { flagTrip, unflagTrip } from '@/data/clients'
import type { Trip } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'
import { undoHandle } from './undo'

/**
 * The permission `TripsScreen` computes `canWrite` from. Passed to
 * `roleRefusal`, which records it and does not evaluate it — **Q4**.
 */
const WRITE_PERMISSION = 'live_ops'

/**
 * The five categories the flag form offers. Keys, never strings (AC-74).
 * Beside the command that asks for one, the way `SETTLE_REASONS` sits beside
 * cancel: a surface renders the list, no surface owns it.
 */
export const FLAG_REASONS: readonly string[] = [
  'trips.reason.fareDispute',
  'trips.reason.routeDeviation',
  'trips.reason.speedViolation',
  'trips.reason.safetyIncident',
  'trips.reason.unusualPairing',
]

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * §9.1 / §5.3 — the confirmation names the verb and the count, the body says
 * what will **not** change (*the trip stays completed and nothing is
 * refunded*), and the primary repeats the verb.
 *
 * `arity: 'needs-input'` because the investigation note is not decoration: the
 * Flagged view is a queue somebody else works, and a flag with no note is a row
 * with no question on it.
 */
const flag: Command<Trip> = {
  id: 'trip.flag',
  titleKey: 'trips.action.flag',
  /* §13.4 — the bulk bar's inverted strip takes the compact form. Same word
     here, and declared anyway so the two cannot drift apart later. */
  compactTitleKey: 'trips.bulk.flag',
  section: 'do',
  keywords: [
    'flag',
    'investigate',
    'review',
    'escalate',
    'mark for review',
    'dispute',
    'fare dispute',
    /* The legacy labels, verbatim (`eyvar_ops_panel_v40_fixed.html:4276`) — an
       operator who learnt the old console types these. `trips` is one of
       Operations' `pageAliasIds`. */
    'flag trip',
    'trips',
    'وضع علامة',
    'تعليم',
    'إبلاغ',
    'مراجعة',
    'رحلة',
  ],
  icon: FlagIcon,
  scope: { kind: 'entity', entityType: 'trip', plural: true },
  /* R5a — red is for the unrecoverable. A flag is removed by the command
     declared directly below it. */
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'trips.action.noPermission') ??
    blockedBy(ctx, (trip) => trip.flagged, 'trips.action.flag.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const note = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('trips.flag.title.one', { id: first?.id ?? '' })
          : ctx.t('trips.flag.title.other', { count: formatCount(count, ctx.language) }),
      body: count === 1 ? ctx.t('trips.flag.body.one') : ctx.t('trips.flag.body.other'),
      confirmLabel:
        count === 1 ? ctx.t('trips.flag.confirm') : ctx.t('trips.flag.confirm.other'),
      reason: {
        label: ctx.t('trips.flag.note'),
        help: ctx.t('trips.flag.notePlaceholder'),
        message: ctx.t('trips.flag.notePlaceholder'),
      },
    })
    if (note === null) return null

    /* CQ-4 — the client is reached from inside `run`, never at module scope. */
    const changed = await Promise.all(ctx.targets.map((trip) => flagTrip(trip.id, note)))
    return {
      message:
        count === 1
          ? ctx.t('trips.toast.flagged.one')
          : ctx.t('trips.toast.flagged.other', { count: formatCount(count, ctx.language) }),
      changed,
      /* **D18.** `unflagTrip` is `trip.unflag`'s own client call, so the
         inverse is a declared command in this registry rather than a second
         write path, and a flag tells no customer and moves no money. */
      undo: undoHandle(ctx, {
        inverse: (trip) => unflagTrip(trip.id),
        copyPrefix: 'trips.toast.flagged',
        nameOf: (trip) => ({ id: trip.id }),
        record: (trip) => ({ entityType: 'trip', entityId: trip.id }),
      }),
    }
  },
}

/**
 * The reverse, and **the one command in this pass with no confirmation** —
 * D18's own trade, taken because all three of its clauses hold: the inverse
 * (`trip.flag`) is declared above, nothing left the console, and the surface
 * offers the handle.
 *
 * It is also what `TripsScreen` already does — `onSelect: () => void
 * runUnflag([trip])`, straight to the client — so this is the ported behaviour
 * and not a relaxation invented here.
 */
const unflag: Command<Trip> = {
  id: 'trip.unflag',
  titleKey: 'trips.action.unflag',
  compactTitleKey: 'trips.bulk.unflag',
  section: 'do',
  keywords: [
    'unflag',
    'remove flag',
    'clear flag',
    'clear',
    'close review',
    'dismiss',
    /* Legacy label (`eyvar_ops_panel_v40_fixed.html:4276`). */
    'unflag trip',
    'إزالة العلامة',
    'رفع العلامة',
    'إلغاء',
    'رحلة',
  ],
  icon: FlagOffIcon,
  scope: { kind: 'entity', entityType: 'trip', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'trips.action.noPermission') ??
    blockedBy(ctx, (trip) => !trip.flagged, 'trips.action.unflag.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const changed = await Promise.all(ctx.targets.map((trip) => unflagTrip(trip.id)))
    return {
      message:
        count === 1
          ? ctx.t('trips.toast.unflagged.one')
          : ctx.t('trips.toast.unflagged.other', { count: formatCount(count, ctx.language) }),
      changed,
      /**
       * **The inverse of removing a flag is flagging, and the note is gone.**
       *
       * `Trip` has no field for a flag reason — `flagTrip(id, _reason?)` drops
       * the parameter before the request in both branches — so there is no note
       * on file for the reversal to restore and none to invent. Re-flagging
       * therefore restores exactly the state that existed, which is the same
       * standard `captain.reinstate` holds itself to.
       */
      undo: undoHandle(ctx, {
        inverse: (trip) => flagTrip(trip.id),
        copyPrefix: 'trips.toast.unflagged',
        nameOf: (trip) => ({ id: trip.id }),
        record: (trip) => ({ entityType: 'trip', entityId: trip.id }),
      }),
    }
  },
}

/**
 * **No `Open trip` command, and that is a gap rather than a decision.**
 *
 * The screen's third row action is `Telemetry`, which opens a *drawer*
 * (`setDrawerTripId`), not the `?entity=` overlay. `CommandHost` carries
 * `openProfile` and `confirm` and nothing else — `navigate` is deliberately
 * absent until `shell.ts` lands (`registry.ts`) — so a command here could only
 * offer the 360° layer, which is a different destination from the one the row
 * menu opens. Choosing between them is a design decision and this task does not
 * make design decisions; it is reported instead.
 *
 * ⌘K's `Find` verb already resolves a trip id to the 360° layer (§5), so
 * nothing is unreachable in the meantime.
 */
export const TRIP_COMMANDS: CommandRegistry<Trip> = [flag, unflag]
