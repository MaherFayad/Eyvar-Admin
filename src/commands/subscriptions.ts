/**
 * Every command that acts on a **subscription** — D9, phase C-5, closed by
 * T6.1. `components/actions/subscription.ts` was the second declaration and is
 * gone (X9); the queue, its bulk bar, the record sheet and ⌘K resolve this one.
 * `Freeze` now carries D18's undo: `CommandConfirmRequest.choice` collects the
 * duration as a typed option list, and `unfreezeSubscription` is the inverse.
 */

/**
 * `Change captain` is not here: its confirmation is an asynchronous captain
 * picker, which `CommandConfirmRequest` cannot describe. `reassignRefusal`
 * below is the one predicate its two surfaces share. `Open` is not here either
 * — `CommandHost` has no `navigate` (§11.2 is unaffected either way).
 */

import { FreezeIcon, RefreshIcon, RejectIcon } from '@/components/icons'
import { cancelSubscription, freezeSubscription, unfreezeSubscription } from '@/data/clients'
import { EYVAR_TODAY } from '@/data/mock/clock'
import type { Subscription, SubscriptionStatus } from '@/data/types'
import { formatCount, formatDate, formatMoney, type Language, type Translate } from '@/lib'
import { blockedBy } from './refusal'
import {
  roleRefusal,
  type Command,
  type CommandConfirmChoice,
  type CommandRegistry,
} from './registry'
import { undoHandle } from './undo'

/** The permission `SubscriptionsScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_subscriptions'

/**
 * The client's own 409, restated. Duplicating it here rather than importing the
 * screen's copy keeps the layering right: a screen consumes a registry.
 */
const TERMINAL: readonly SubscriptionStatus[] = ['cancelled', 'expired']

export function isTerminalSubscription(sub: Subscription): boolean {
  return TERMINAL.includes(sub.status)
}

/** The five termination reasons the settle form offers, as copy KEYS (AC-74). */
export const SETTLE_REASONS: readonly string[] = [
  'subs.reason.noDriver',
  'subs.reason.serviceFailure',
  'subs.reason.relocated',
  'subs.reason.vehicleBreakdown',
  'subs.reason.riderViolation',
]

/**
 * The four windows a freeze may take, in days. A closed set, and the option
 * VALUES are the resume dates computed from it — see `freezeChoice`.
 */
export const FREEZE_DAYS: readonly number[] = [3, 7, 14, 30]

/** The window a freeze opens on. */
const DEFAULT_FREEZE_DAYS = 7

/**
 * The resume date a freeze of `days` ends on, against the **fixed clock**.
 * Every fixture is written against `EYVAR_TODAY`, so a host-clock date would
 * disagree with every record it is compared to.
 */
function resumeDate(days: number): string {
  const base = new Date(EYVAR_TODAY)
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

/**
 * §11.2 — `Change captain` refuses on the permission or on a terminal cycle,
 * and both surfaces that offer it ask this one function.
 */
export function reassignRefusal(
  sub: Subscription,
  { canWrite, t }: { canWrite: boolean; t: Translate },
): string | null {
  if (!canWrite) return t('subs.action.noPermission')
  return isTerminalSubscription(sub) ? t('subs.action.changeDriver.blocked.one') : null
}

/**
 * `reassignSubscriptionDriver`'s three 422s, restated at RENDER so the picker
 * disables an ineligible captain in place with its sentence (§11.2) instead of
 * hiding them and discovering the refusal after the press.
 */
export function reassignCandidateRefusal(
  sub: Subscription,
  driver: { id: string; status: string; vehicleClass: string },
  t: Translate,
): string | null {
  if (driver.id === sub.driverId) return t('sub.candidate.same')
  if (driver.status !== 'active') return t('sub.candidate.unavailable')
  if (sub.vehicleClass === 'Comfort' && driver.vehicleClass !== 'Comfort') {
    return t('sub.candidate.belowPlan')
  }
  return null
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * §9.1 / §5.3 — the title states the verb and the count, the body says what
 * does **not** change, and the primary repeats the verb. `needs-input` is for
 * the duration, not for a confirmation: D18 buys it out of *are you sure*.
 */
const freeze: Command<Subscription> = {
  id: 'subscription.freeze',
  titleKey: 'subs.action.freeze',
  compactTitleKey: 'subs.bulk.freeze',
  section: 'do',
  keywords: [
    'freeze',
    'pause',
    'hold',
    'suspend subscription',
    'freeze subscription',
    'subscriptions',
    'تجميد',
    'إيقاف مؤقت',
    'تعليق',
    'اشتراك',
  ],
  icon: FreezeIcon,
  /* R5a — blue. A freeze is reversed by the command declared beneath it. */
  affordance: 'default',
  scope: { kind: 'entity', entityType: 'subscription', plural: true },
  arity: 'needs-input',
  /* CM-4 — the palette's confirm step renders a reason field and no option
     list, so a freeze reached from ⌘K could not state how long it lasts. It is
     offered on the row, the bulk bar and the record sheet, all three of which
     mount the form that asks. */
  hiddenFromPalette:
    'The palette’s confirm step cannot render the duration list this command requires.',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'subs.action.noPermission') ??
    blockedBy(ctx, isTerminalSubscription, 'subs.action.freeze.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    if (first === undefined) return null

    let until = resumeDate(DEFAULT_FREEZE_DAYS)
    const reason = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('subs.freeze.title.one', { id: first.id })
          : ctx.t('subs.freeze.title.other', { count: formatCount(count, ctx.language) }),
      body: ctx.t(count === 1 ? 'subs.freeze.body.one' : 'subs.freeze.body.other'),
      confirmLabel: ctx.t(count === 1 ? 'subs.freeze.confirm' : 'subs.freeze.confirm.other'),
      /* The typed option list the wave-1 note asked for. Each value IS the
         resume date, so the surface hands back a date and nobody parses one. */
      choice: freezeChoice(ctx.t, ctx.language, (value) => {
        until = value
      }),
      reason: {
        label: ctx.t('subs.freeze.reason'),
        help: ctx.t('subs.freeze.reasonPlaceholder'),
        message: ctx.t('subs.freeze.reasonPlaceholder'),
      },
    })
    if (reason === null) return null

    /* CQ-4 — the client is reached from inside `run`, never at module scope. */
    const changed = await Promise.all(
      ctx.targets.map((sub) => freezeSubscription(sub.id, until)),
    )
    return {
      message:
        count === 1
          ? ctx.t('subs.toast.frozen.one')
          : ctx.t('subs.toast.frozen.other', { count: formatCount(count, ctx.language) }),
      changed,
      /* **D18.** `unfreezeSubscription` is `subscription.unfreeze`'s own client
         call, so the inverse is a declared command in this registry; a hold
         tells no customer and moves no money. */
      undo: undoHandle(ctx, {
        inverse: (sub) => unfreezeSubscription(sub.id),
        copyPrefix: 'subs.toast.frozen',
        nameOf: (sub) => ({ id: sub.id }),
        record: (sub) => ({ entityType: 'subscription', entityId: sub.id }),
      }),
    }
  },
}

/** The duration control, built once so the command and its test agree. */
function freezeChoice(
  t: Translate,
  language: Language,
  onSelect: (value: string) => void,
): CommandConfirmChoice {
  return {
    label: t('subs.freeze.duration'),
    help: t('subs.freeze.durationHelp'),
    message: t('subs.freeze.durationMessage'),
    placeholder: t('subs.freeze.durationPlaceholder'),
    emptyMessage: t('subs.freeze.durationEmpty'),
    options: FREEZE_DAYS.map((days) => ({
      value: resumeDate(days),
      label: t('subs.freeze.days', { count: formatCount(days, language) }),
      /* The consequence as a DATE: `Resumes on 2 Jul` is checkable against a
         rider's message and `14 days` is not. */
      hint: t('subs.freeze.resumeOn', { date: formatDate(resumeDate(days), { language }) }),
    })),
    initial: resumeDate(DEFAULT_FREEZE_DAYS),
    onSelect,
  }
}

/**
 * The reverse, and **the one command here with no confirmation** — D18's trade,
 * taken because all three clauses hold: the inverse is declared above, nothing
 * left the console, and every surface offering it offers the handle.
 */
const unfreeze: Command<Subscription> = {
  id: 'subscription.unfreeze',
  titleKey: 'subs.action.unfreeze',
  compactTitleKey: 'subs.bulk.unfreeze',
  section: 'do',
  keywords: [
    'unfreeze',
    'resume',
    'restart',
    'lift hold',
    'resume subscription',
    'subscriptions',
    'استئناف',
    'رفع التجميد',
    'إلغاء التجميد',
    'اشتراك',
  ],
  icon: RefreshIcon,
  affordance: 'default',
  scope: { kind: 'entity', entityType: 'subscription', plural: true },
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'subs.action.noPermission') ??
    blockedBy(ctx, (sub) => sub.status !== 'frozen', 'subs.action.unfreeze.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const changed = await Promise.all(ctx.targets.map((sub) => unfreezeSubscription(sub.id)))
    return {
      message:
        count === 1
          ? ctx.t('subs.toast.resumed.one')
          : ctx.t('subs.toast.resumed.other', { count: formatCount(count, ctx.language) }),
      changed,
      /**
       * **Re-freezing restores the state that existed, minus a date nobody
       * kept.** `frozenUntil` is cleared by the unfreeze and the handle carries
       * no record of it, so the reversal uses the default window and the toast
       * names the subscription rather than a date it would be inventing.
       */
      undo: undoHandle(ctx, {
        inverse: (sub) => freezeSubscription(sub.id, resumeDate(DEFAULT_FREEZE_DAYS)),
        copyPrefix: 'subs.toast.resumed',
        nameOf: (sub) => ({ id: sub.id }),
        record: (sub) => ({ entityType: 'subscription', entityId: sub.id }),
      }),
    }
  },
}

/**
 * §5.3 — the question names the verb and the record, the body says what will
 * **not** change *and* what cannot be walked back, and the primary repeats the
 * verb (`Cancel subscription`, never `OK` and never a bare `Cancel`).
 */
const cancel: Command<Subscription> = {
  id: 'subscription.cancel',
  titleKey: 'subs.action.cancel',
  section: 'do',
  keywords: [
    'cancel',
    'terminate',
    'end',
    'settle',
    'refund',
    'cancel and settle',
    'stop subscription',
    /* Legacy labels, verbatim: the audit verb `cancel_subscription`
       (`eyvar_ops_panel_v40_fixed.html:2900`) and the profile button
       `Cancel & refund` (`:4355`). `subscriptions` is the legacy page id. */
    'cancel subscription',
    'cancel refund',
    'subscriptions',
    'إلغاء',
    'إنهاء الاشتراك',
    'استرداد',
    'اشتراك',
  ],
  icon: RejectIcon,
  /**
   * **R5a — one of the four places red is permitted.** The subscription ends
   * and money moves, and neither is recoverable from this console. Compare the
   * two commands above, both `default` because each has an inverse declared
   * beside it.
   */
  affordance: 'destructive',
  scope: { kind: 'entity', entityType: 'subscription', plural: false },
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'subs.action.noPermission') ??
    blockedBy(ctx, isTerminalSubscription, 'subs.action.cancel.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    /* **The confirm step is mandatory, enforced by the shape of this function
       and not by a flag.** `run` cannot reach the client without `host.confirm`
       resolving, and a dismissal returns `null`. */
    const reason = await ctx.host.confirm({
      title: ctx.t('subs.settle.title', { id: target.id }),
      /* §5.7 rule 9 — a destructive confirmation says what will NOT change
         alongside what will. */
      body: ctx.t('subs.settle.body'),
      confirmLabel: ctx.t('subs.settle.confirm'),
      reason: {
        label: ctx.t('subs.settle.reason'),
        help: ctx.t('subs.settle.notePlaceholder'),
        message: ctx.t('subs.settle.notePlaceholder'),
      },
    })
    if (reason === null) return null

    const changed = await cancelSubscription(target.id, reason)
    return {
      /**
       * **The toast names the SERVER's refund, not an estimate.** The modal
       * shows a browser-side figure from unused trips and the two can disagree;
       * quoting the response is the only figure this command may assert.
       * `formatMoney` takes no language — §8.3.1 fixes the separators and AC-73
       * requires one character order in both languages.
       */
      message: ctx.t('subs.toast.cancelled', {
        amount: formatMoney(changed.refundedHalalas ?? 0),
      }),
      changed: [changed],
      /* **No undo — D18 fails on both clauses.** There is no inverse client
         function, and a refund is money that left the console. */
    }
  },
}

export const SUBSCRIPTION_COMMANDS: CommandRegistry<Subscription> = [freeze, unfreeze, cancel]
