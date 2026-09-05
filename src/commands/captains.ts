/**
 * Every command that acts on a **captain** — `design/05-command-centre.md` §2,
 * phase **C-1**, task P2-T2.
 *
 * ## What this file replaces
 *
 * Three inline declarations in `CaptainsView.tsx` (`rowActions` at :187,
 * `bulkActions` at :203) and the confirmation copy that sat beside them. The
 * two lists had already diverged in the way D9 records: `Suspend` in the row
 * menu carried `disabled: (d) => !canWrite || d.suspended`, and `Suspend` in
 * the bulk bar carried nothing — so selecting a suspended captain and using the
 * bulk bar suspended them a second time, while the kebab on that same row was
 * dead. One declaration, two surfaces, and now one answer.
 *
 * ## Ported behaviour, unchanged
 *
 * Everything here is the behaviour `CaptainsView` had, moved rather than
 * redesigned:
 *
 *   - the same three actions in the same order — `Open 360° profile`,
 *     `Suspend captain`, `Reinstate captain`;
 *   - the same two bulk actions, and no third;
 *   - the same confirmation copy, from the same keys: title by count, a body
 *     that says what will **not** change, a primary that repeats the verb, and
 *     the reason field `suspendDriver` requires by contract (§10.4 — validated
 *     in the modal, not as a 422 the operator has to interpret);
 *   - the same toasts, singular and plural (R9);
 *   - **blue, not red** (R5a): a suspension is reversible, so `affordance` is
 *     `default` and not `destructive`. That is the call `people/copy.ts`
 *     already recorded for the confirmation's primary button, kept here so the
 *     palette cannot reach a different conclusion.
 *
 * ## Two things that changed, deliberately
 *
 *   1. **The bulk bar now honours the refusal.** That is the fix, not a
 *      regression — see the header of `registry.ts`.
 *   2. **The refusal now has a sentence.** The row menu previously disabled
 *      `Suspend` with no explanation, which §11.2 / **AC-368** forbids and
 *      which `rowActions.tsx` has had a field for since it was written. The
 *      permission sentence (`people.action.noPermission`) already existed in
 *      the dictionary and was reachable only from `ApplicationsView`; the two
 *      domain-state sentences are new keys in the same file.
 *
 * ## What P3-T9 added, and the one thing it deliberately did not
 *
 * **D21's third sentence** is now wired. `people/copy.ts` has carried
 * `people.action.suspend.blocked.all` and `…reinstate.blocked.all` since the
 * ruling and **nothing called them**, so an all-blocked selection still read
 * `3 of the selected captains are already suspended` — true of 3-of-3, and an
 * invitation to deselect a few when there is nothing to deselect to.
 *
 * **D18's undo handles** are set on both mutating commands, which is the
 * ruling's own worked example and needs no new client operation.
 *
 * **`reinstate` still confirms, and that is not an oversight.** D18 buys a
 * reversible command out of its dialog — but the surface has to be offering the
 * undo before the dialog can go, and `CaptainsView.tsx:222` still calls
 * `toast(result.outcome.message)`, which drops the handle. Removing the
 * confirmation today would take the net away from the row kebab and the bulk
 * bar without hanging the rope. **That swap is P4-T2**, it is a one-line change
 * in a screen this task does not own, and the exact diff is in the handoff.
 *
 * ## CQ-7
 *
 * `unavailable` reads `driver.suspended` and nothing else. The role half goes
 * through `roleRefusal`, naming `approve_drivers` — the permission
 * `PeopleScreen.tsx:105` computes `canWrite` from today — so that when **Q4**
 * closes the change is to one function in `registry.ts`.
 */

import { CircleSlashIcon, PlayIcon, UserRoundIcon } from 'lucide-react'
import { reinstateDriver, suspendDriver } from '@/data/clients'
import type { Driver } from '@/data/types'
import { formatCount } from '@/lib'
import {
  roleRefusal,
  type Command,
  type CommandContext,
  type CommandRegistry,
  type UndoHandle,
} from './registry'

/**
 * The permission `canWrite` stands for today. Passed to `roleRefusal`, which
 * records it and does not evaluate it — **Q4**.
 */
const WRITE_PERMISSION = 'approve_drivers'

/* ─────────────────────────── refusal predicates ─────────────────────────── */

/**
 * §11.2 over a **set** — **D21, ratified**: refuse if any selected captain
 * would be refused on its own row, and name how many.
 *
 * The strict reading is the one C-1 exists for, and D21 restates why the other
 * two are wrong. Acting on the eligible subset silently drops records the
 * operator picked — the bar says `12 selected`, the toast says `7 suspended`,
 * and their mental model is wrong in a direction they will not check. Refusing
 * only when *every* target is ineligible lets the bulk bar suspend a captain
 * the kebab refuses, which is the divergence being removed, reintroduced at the
 * set boundary.
 *
 * **Three sentences, not two.** `.other` is *true* of an all-blocked selection
 * — `3 of the selected captains are already suspended` is true of 3-of-3 — and
 * it invites the operator to deselect a few when there is nothing to deselect
 * to. Which sentence appears changes what they do next, which is what buys the
 * third key. The `.all` strings were written into `people/copy.ts` with the
 * ruling and had no caller until this predicate; **D21's `Select only the N
 * eligible` is deliberately not offered beside `.all`** (**AC-960**), and the
 * shape below is what tells the surface which case it is in.
 */
function blockedSentence(
  ctx: CommandContext<Driver>,
  blocked: number,
  prefix: string,
): string | null {
  if (blocked === 0) return null
  const count = formatCount(blocked, ctx.language)
  if (ctx.targets.length === 1) return ctx.t(`${prefix}.one`)
  if (blocked === ctx.targets.length) return ctx.t(`${prefix}.all`, { count })
  return ctx.t(`${prefix}.other`, { count })
}

function alreadySuspended(ctx: CommandContext<Driver>): string | null {
  const blocked = ctx.targets.filter((driver) => driver.suspended).length
  return blockedSentence(ctx, blocked, 'people.action.suspend.blocked')
}

/** The mirror. `Reinstate` on a captain who is not suspended does nothing. */
function notSuspended(ctx: CommandContext<Driver>): string | null {
  const blocked = ctx.targets.filter((driver) => !driver.suspended).length
  return blockedSentence(ctx, blocked, 'people.action.reinstate.blocked')
}

/* ─────────────────────────────── D18's undo ─────────────────────────────── */

/**
 * **`Suspend` and `Reinstate` are each other's inverse — D18's own example, and
 * the cheapest possible proof of the model.**
 *
 * The ruling's test is mechanical and both pass it: (a) the inverse is a
 * declared command in *this* registry, and (b) nothing left the console — a
 * suspension moves no money, sends no message and tells no third party. Compare
 * `Approve application`, which fails (b) because the applicant is notified, and
 * which therefore confirms and offers no undo.
 *
 * **The inverse runs through the seam**, as a real, separately audited
 * mutation, never an optimistic local reversal: the audit log is the product,
 * and a reversal that never reaches the server records the suspension and not
 * the retraction. Two entries, the act and its retraction, and a log that can
 * erase its own rows is not a log.
 *
 * **The window does not extend on bulk.** Twelve records undone is one inverse
 * over twelve ids — `Promise.all`, exactly as the forward direction runs.
 */
function undoHandle(
  ctx: CommandContext<Driver>,
  inverse: (driver: Driver) => Promise<Driver>,
  copyPrefix: string,
): UndoHandle {
  const targets = ctx.targets
  const count = targets.length
  const only = count === 1 ? targets[0] : undefined
  const params: Readonly<Record<string, string>> = only
    ? { name: only.name }
    : { count: formatCount(count, ctx.language) }
  const suffix = only ? 'one' : 'other'

  return {
    label: ctx.t('command.undo'),
    run: async () => {
      await Promise.all(targets.map((driver) => inverse(driver)))
    },
    doneMessage: ctx.t(`${copyPrefix}.undone.${suffix}`, params),
    failedMessage: ctx.t(`${copyPrefix}.undoFailed.${suffix}`, params),
    /* Only where there is one record to open. A link to an arbitrary member of
       a twelve-record set is a guess, and D18 asks for *the* record. */
    ...(only
      ? {
          recordLink: {
            label: ctx.t('command.undo.openRecord'),
            open: () => ctx.host.openProfile('driver', only.id),
          },
        }
      : {}),
  }
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * §9.1 / **AC-43** — the identity is a link to the 360° profile layer, and this
 * is the same destination as a menu item. A captain has no detail route of its
 * own, so it is `?entity=`, an overlay param on the current route (**AC-21**,
 * **AC-22**), which is why the command asks the host rather than building a
 * path.
 */
const openProfile: Command<Driver> = {
  id: 'captain.openProfile',
  titleKey: 'people.action.viewProfile',
  /* §13.4 — `View`, for the 88px single-action lane. Already in the dictionary
     for exactly this reason. */
  compactTitleKey: 'people.action.view',
  section: 'go',
  keywords: [
    'profile',
    '360',
    'open',
    'view',
    'captain',
    'driver',
    /* Legacy vocabulary — `openProfile` is the second-most-used handler in the
       old console (100 call sites) and `drivers` is one of People's five
       `pageAliasIds` (`fixtures/routeTable.ts:470`). */
    'drivers',
    'ملف',
    'الملف الشخصي',
    'عرض',
    'كابتن',
    'سائق',
  ],
  icon: UserRoundIcon,
  /* `plural: false` — twenty profile layers is not an action. Offered on a row,
     withheld from the bulk bar, which is exactly what the screen did before. */
  scope: { kind: 'entity', entityType: 'driver', plural: false },
  affordance: 'default',
  arity: 'needs-target',
  /**
   * **CM-4.** ⌘K already opens a captain's profile through §5's `Find` verb —
   * typing `DRV-0204` resolves the record and opens the same layer. A `Do` row
   * that duplicates a `Records` row would put the same destination in the
   * palette twice under two names.
   */
  hiddenFromPalette:
    'Find already opens this: §5 resolves a captain id or name to the same 360° layer, so a Do row would duplicate a Records row.',
  run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return
    ctx.host.openProfile('driver', target.id)
  },
}

/**
 * §9.1 / §5.3 — the confirmation names the verb and the count, says what will
 * **not** change, and its primary repeats the verb.
 *
 * `arity: 'needs-input'` because the reason is not optional: the captain is
 * shown it, and a suspension with no stated reason is not appealable
 * (`clients/drivers.ts`). `suspendDriver` requires it by contract.
 */
const suspend: Command<Driver> = {
  id: 'captain.suspend',
  titleKey: 'people.action.suspend',
  compactTitleKey: 'people.bulk.suspend',
  section: 'do',
  keywords: [
    'suspend',
    'deactivate',
    'disable',
    'block',
    'stand down',
    'off dispatch',
    /* The legacy label, verbatim (`eyvar_ops_panel_v40_fixed.html:4113`,
       `:9058`) — an operator who learnt the old console types this. */
    'suspend account',
    'إيقاف',
    'تعليق',
    'إيقاف الحساب',
    'حظر',
    'كابتن',
    'سائق',
  ],
  icon: CircleSlashIcon,
  scope: { kind: 'entity', entityType: 'driver', plural: true },
  /* R5a — red is for the unrecoverable. A suspension is reversible by the
     command directly below it. */
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'people.action.noPermission') ?? alreadySuspended(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const reason = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('people.confirm.suspend.title.one')
          : ctx.t('people.confirm.suspend.title.other', {
              count: formatCount(count, ctx.language),
            }),
      body: ctx.t('people.confirm.suspend.body'),
      confirmLabel: ctx.t('people.confirm.suspend.confirm'),
      reason: {
        label: ctx.t('people.confirm.suspend.reason'),
        help: ctx.t('people.confirm.suspend.reasonHelp'),
        message: ctx.t('people.confirm.suspend.reasonHelp'),
      },
    })
    if (reason === null) return null

    /* CQ-4 — the client is reached from inside `run`, never at module scope. */
    const changed = await Promise.all(
      ctx.targets.map((driver) => suspendDriver(driver.id, reason)),
    )
    return {
      message:
        count === 1
          ? ctx.t('people.toast.suspended.one')
          : ctx.t('people.toast.suspended.other', { count: formatCount(count, ctx.language) }),
      changed,
      /* **D18.** `reinstateDriver` is `captain.reinstate`'s own client call, so
         the inverse is a declared command in this registry and the handle is
         not a second write path. */
      undo: undoHandle(ctx, (driver) => reinstateDriver(driver.id), 'people.toast.suspended'),
    }
  },
}

/** The reverse. No reason field — `reinstateDriver` takes none. */
const reinstate: Command<Driver> = {
  id: 'captain.reinstate',
  titleKey: 'people.action.reinstate',
  compactTitleKey: 'people.bulk.reinstate',
  section: 'do',
  keywords: [
    'reinstate',
    'restore',
    'unsuspend',
    'reactivate',
    'enable',
    'lift suspension',
    'back on dispatch',
    /* Legacy label (`eyvar_ops_panel_v40_fixed.html:4113`). */
    'reinstate account',
    'إعادة',
    'استئناف',
    'تفعيل',
    'رفع الإيقاف',
    'كابتن',
    'سائق',
  ],
  icon: PlayIcon,
  scope: { kind: 'entity', entityType: 'driver', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'people.action.noPermission') ?? notSuspended(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const confirmed = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('people.confirm.reinstate.title.one')
          : ctx.t('people.confirm.reinstate.title.other', {
              count: formatCount(count, ctx.language),
            }),
      body: ctx.t('people.confirm.reinstate.body'),
      confirmLabel: ctx.t('people.confirm.reinstate.confirm'),
    })
    if (confirmed === null) return null

    const changed = await Promise.all(ctx.targets.map((driver) => reinstateDriver(driver.id)))
    return {
      message:
        count === 1
          ? ctx.t('people.toast.reinstated.one')
          : ctx.t('people.toast.reinstated.other', { count: formatCount(count, ctx.language) }),
      changed,
      /**
       * **The inverse of a reinstatement is a suspension, and a suspension
       * needs a stated reason** — `suspendDriver` requires one by contract,
       * because a suspension the captain cannot read is not appealable.
       *
       * An undo control cannot collect one: it is a word on a toast with a
       * ten-second life. So the reason is the one already on file — the reason
       * *this* reinstatement removed, carried on the record the command was
       * handed. Reverting therefore restores exactly the state that existed,
       * and does not invent a justification to put in the audit log.
       *
       * **Where a target carries no reason, no undo is offered at all.** That
       * is a captain whose `suspended` flag was set without one, and the honest
       * consequence is that D18 buys this command nothing for that target: the
       * confirmation stays, which is the branch a command with no undo handle
       * is supposed to take.
       */
      ...(ctx.targets.every((driver) => (driver.suspensionReason ?? '') !== '')
        ? {
            undo: undoHandle(
              ctx,
              (driver) => suspendDriver(driver.id, driver.suspensionReason ?? ''),
              'people.toast.reinstated',
            ),
          }
        : {}),
    }
  },
}

/**
 * The captain registry, **in the order the row menu renders them** — the same
 * order `CaptainsView` declared, because that order is a design decision and
 * re-sorting it in the resolver would move the decision somewhere nobody reads.
 */
export const CAPTAIN_COMMANDS: CommandRegistry<Driver> = [openProfile, suspend, reinstate]
