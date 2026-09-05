/**
 * The two decisions on a **captain fairness case** — D9, F6.
 *
 * Legacy `decideFairness(caseId, uphold)` (`eyvar_ops_panel_v40_fixed.html:15591`)
 * with its two buttons, `Uphold` and `Overturn` (`:15664`–`:15665`). It wrote
 * status, decider and timestamp and **left `rationale` at `null`** (`:15597`),
 * so every decided appeal in the old console is unexplained — an appeal
 * answered with no reason is the thing an appeal route exists to stop.
 * `decideFairnessCase` requires the rationale (422), so both commands here are
 * `needs-input` and the field is the contract rather than a courtesy.
 *
 * ## Which one is `decision-affirm`
 *
 * The subject of the case is the **appeal**, not the original decision.
 * `overturn` grants it — and it is the one legacy paints as the primary
 * (`btn p sm`, `:15665`) — so it is `decision-affirm`; `uphold` refuses the
 * appeal and is `decision-reject`. Naming them the other way round would make
 * the affirmative affordance mean *"the captain loses"*.
 *
 * ## `scope: 'route'`, hidden from the palette — CM-4
 *
 * A fairness case has **no `ProfileEntityType`**. Same sentence as `safety.ts`,
 * `cash.ts` and `disputes.ts`; same report to mock-data-engineer. The captain
 * the case is about *is* findable, which is the nearest ⌘K currently gets.
 *
 * ## Neither offers an undo
 *
 * *"A decision has to actually DO something, or an appeals process is theatre"*
 * (`:15588`): overturning a suspension sets `reinstatedAt` and overturning a
 * rating voids it out of the captain's average. There is no operation that
 * un-decides a case, so D18's clause (a) fails on both.
 */

import { ApproveIcon, RejectIcon } from '@/components/icons'
import { decideFairnessCase } from '@/data/clients'
import type { FairnessCase } from '@/data/types'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `FairnessScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'approve_drivers'

const NO_PROFILE_ENTITY =
  'A fairness case has no ProfileEntityType, so the palette has no way to find one as a target.'

/** `decideFairnessCase`'s own 409, restated at render. */
function isDecided(row: FairnessCase): boolean {
  return row.status !== 'open'
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * The appeal is granted: the suspension is lifted, or the contested rating is
 * voided out of the average. Legacy's primary (`:15665`).
 */
const overturn: Command<FairnessCase> = {
  id: 'fairnessCase.overturn',
  titleKey: 'fairnessCase.action.overturn',
  compactTitleKey: 'fairnessCase.bulk.overturn',
  section: 'do',
  keywords: [
    'overturn',
    'grant appeal',
    'reverse',
    'reinstate captain',
    'void rating',
    /* Legacy's own button, verbatim (`:15665`), and the legacy page id. */
    'overturn',
    'driver-fairness',
    'نقض القرار',
    'قبول التظلم',
    'إعادة الكابتن',
    'إنصاف',
  ],
  icon: ApproveIcon,
  scope: { kind: 'route', subTabId: 'support-fairness' },
  affordance: 'decision-affirm',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'fairnessCase.action.noPermission') ??
    blockedBy(ctx, isDecided, 'fairnessCase.action.overturn.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const rationale = await ctx.host.confirm({
      title: ctx.t('fairnessCase.overturn.title', { id: target.id, captain: target.driverName }),
      /* §5.7 rule 9 — what does NOT change: the trips, the earnings and the
         complaint that started it all stay exactly as they are. */
      body: ctx.t('fairnessCase.overturn.body'),
      confirmLabel: ctx.t('fairnessCase.overturn.confirm'),
      reason: {
        label: ctx.t('fairnessCase.rationale.label'),
        /* The captain reads this. That is the whole reason the 422 exists. */
        help: ctx.t('fairnessCase.rationale.help'),
        message: ctx.t('fairnessCase.rationale.message'),
      },
    })
    if (rationale === null) return null
    const changed = await decideFairnessCase(target.id, 'overturned', rationale)
    return {
      message: ctx.t('fairnessCase.toast.overturned', {
        id: changed.id,
        captain: changed.driverName,
      }),
      changed: [changed],
    }
  },
}

/** The appeal is refused: the original decision stands. Legacy `Uphold` (`:15664`). */
const uphold: Command<FairnessCase> = {
  id: 'fairnessCase.uphold',
  titleKey: 'fairnessCase.action.uphold',
  compactTitleKey: 'fairnessCase.bulk.uphold',
  section: 'do',
  keywords: [
    'uphold',
    'refuse appeal',
    'decision stands',
    'reject appeal',
    'confirm suspension',
    'driver-fairness',
    'تأييد القرار',
    'رفض التظلم',
    'إبقاء القرار',
    'إنصاف',
  ],
  icon: RejectIcon,
  scope: { kind: 'route', subTabId: 'support-fairness' },
  affordance: 'decision-reject',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'fairnessCase.action.noPermission') ??
    blockedBy(ctx, isDecided, 'fairnessCase.action.uphold.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const rationale = await ctx.host.confirm({
      title: ctx.t('fairnessCase.uphold.title', { id: target.id, captain: target.driverName }),
      body: ctx.t('fairnessCase.uphold.body'),
      confirmLabel: ctx.t('fairnessCase.uphold.confirm'),
      reason: {
        label: ctx.t('fairnessCase.rationale.label'),
        help: ctx.t('fairnessCase.rationale.help'),
        message: ctx.t('fairnessCase.rationale.message'),
      },
    })
    if (rationale === null) return null
    const changed = await decideFairnessCase(target.id, 'upheld', rationale)
    return {
      message: ctx.t('fairnessCase.toast.upheld', { id: changed.id, captain: changed.driverName }),
      changed: [changed],
    }
  },
}

export const FAIRNESS_COMMANDS: CommandRegistry<FairnessCase> = [overturn, uphold]
