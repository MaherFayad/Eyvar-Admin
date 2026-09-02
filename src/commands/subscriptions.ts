/**
 * Every command that acts on a **subscription** —
 * `design/05-command-centre.md` §2, phase **C-5**.
 *
 * ## One command, and the reason is the point of this file
 *
 * `SubscriptionsScreen` declares four row actions. Exactly one of them can be
 * declared here honestly, and saying which and why is worth more than four
 * commands where three do not work:
 *
 * | screen action | client | why it is or is not here |
 * |---|---|---|
 * | `Cancel and settle` | `cancelSubscription(id, reason)` | **declared** — one record, one reason string, which is precisely what `CommandConfirmRequest` carries |
 * | `Freeze` | `freezeSubscription(id, until)` | **not declared** — needs a *duration*, and the confirm request has one free-text `reason` field and nothing else. A text box the operator types `30` into, parsed into a date, is a form pretending to be a sentence |
 * | `Change captain` | none | **not declared** — the screen already renders it disabled with *"not connected yet"* (§11.2). A command with no client function is not a command; D9's rule is that the registry surfaces existing capability, never invents it |
 * | `Open` | drawer | **not declared** — `CommandHost` has no `navigate`, and the screen's `Open` is a drawer rather than the `?entity=` overlay `openProfile` reaches. Choosing between them is a design decision |
 *
 * `Freeze` is the one worth reading twice, because it is not a missing client —
 * it is a **missing shape in the command contract**, and the fix is a typed
 * option list or a duration field on `CommandConfirmRequest`. Reported to
 * product-designer and recorded here so the next person does not solve it with
 * a parsed string.
 *
 * ## The destructive one, and what R5a buys
 *
 * `Cancel and settle` is the only command in phase C-5 that is genuinely
 * **`affordance: 'destructive'`**, and it earns red on both of R5a's counts:
 * the subscription ends, and **money moves** — `cancelSubscription` computes a
 * settlement and Finance pays it (`clients/subscriptions.ts:213`). The screen's
 * own copy says it: *"this cannot be undone from here."*
 *
 * Which makes it the worked example of the registry's own rule:
 *
 * > *the absence of an undo handle on an `affordance: 'destructive'` command
 * > makes the confirm step mandatory.*
 *
 * There is no `uncancelSubscription`, nothing that walks a refund back, and a
 * refund is the definition of *something left the console* — so D18 fails on
 * both clauses, there is no undo, and the confirmation is not optional.
 *
 * ## `plural: false`, and it is a domain fact not a caution
 *
 * The screen offers `Cancel and settle` on a row and **not** in the bulk bar,
 * and the copy is why: `subs.settle.title` reads `Cancel and settle {id}?` and
 * `subs.toast.cancelled` names *the server's* refund figure for that one
 * subscription. A set has no single settlement to name, and a toast that
 * summed twelve refunds would be asserting a number no endpoint returned.
 * `plural: false` withholds it from the bulk bar and from a palette target that
 * is a selection — which is what the screen already did, and now says once.
 *
 * ## §11.2 at render
 *
 * `cancelSubscription` refuses a `cancelled` or `expired` subscription. The
 * predicate restates the client's contract rather than inventing a second
 * policy — the same `isTerminal` the screen uses, so the two cannot disagree.
 *
 * ## CQ-7
 *
 * `unavailable` reads `status` and nothing else. The role half goes through
 * `roleRefusal`, naming `manage_subscriptions` — the permission
 * `SubscriptionsScreen.tsx:151` computes its own `canWrite` from.
 */

import { CircleXIcon } from 'lucide-react'
import { cancelSubscription } from '@/data/clients'
import type { Subscription, SubscriptionStatus } from '@/data/types'
import { formatMoney } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `SubscriptionsScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_subscriptions'

/**
 * The client's own 409, restated. `SubscriptionsScreen` holds the same list;
 * it is duplicated rather than imported because a `commands/` module importing
 * from `screens/` inverts the layering — a screen consumes a registry, never
 * the other way round. **Raised in the handoff:** it belongs on the
 * `Subscription` type or beside the client, as `isTerminalSubscription`.
 */
const TERMINAL: readonly SubscriptionStatus[] = ['cancelled', 'expired']

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * §5.3 — the question names the verb and the record, the body says what will
 * **not** change *and* what cannot be walked back, and the primary repeats the
 * verb (`Cancel subscription`, never `OK` and never `Yes` — and never a bare
 * `Cancel`, which on this command would be the word for both buttons).
 *
 * `arity: 'needs-input'` because the termination reason is not optional: it is
 * what Finance reconciles the refund against, and the screen collects it in the
 * same field with the same helper text.
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
  icon: CircleXIcon,
  /**
   * **R5a — one of the four places red is permitted.** The subscription ends
   * and money moves, and neither is recoverable from this console. Compare
   * every other command in phase C-5, all of which are `default` because each
   * has an inverse declared beside it.
   */
  affordance: 'destructive',
  /* See the header: the copy names one id and one server-computed refund, and
     a set has neither. */
  scope: { kind: 'entity', entityType: 'subscription', plural: false },
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'subs.action.noPermission') ??
    blockedBy(ctx, (sub) => TERMINAL.includes(sub.status), 'subs.action.cancel.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    /**
     * **The confirm step is mandatory here and enforced by the shape of this
     * function, not by a flag.** `run` cannot reach the client without
     * `host.confirm` resolving, and a dismissal returns `null` — which
     * `runCommand` reports as `cancelled` with nothing written.
     */
    const reason = await ctx.host.confirm({
      title: ctx.t('subs.settle.title', { id: target.id }),
      /* §5.7 rule 9 — a destructive confirmation says what will NOT change
         alongside what will. The screen's own sentence, unchanged. */
      body: ctx.t('subs.settle.body'),
      confirmLabel: ctx.t('subs.settle.confirm'),
      reason: {
        label: ctx.t('subs.settle.reason'),
        help: ctx.t('subs.settle.notePlaceholder'),
        message: ctx.t('subs.settle.notePlaceholder'),
      },
    })
    if (reason === null) return null

    /* CQ-4 — the client is reached from inside `run`, never at module scope. */
    const changed = await cancelSubscription(target.id, reason)
    return {
      /**
       * **The toast names the SERVER's refund, not an estimate.**
       *
       * `cancelSubscription` computes the settlement and returns it on
       * `refundedHalalas`; the screen's modal shows a browser-side estimate
       * from unused trips, and the two can disagree. Quoting the response is
       * the only figure this command is entitled to assert — the same call
       * `SubscriptionsScreen.runCancel` already made, kept here so the palette
       * cannot reach a different one.
       *
       * `formatMoney` deliberately takes no language: §8.3.1 fixes `,`
       * thousands and `.` decimals, and **AC-73** requires a money value to
       * read in the same character order in Arabic as in English.
       */
      message: ctx.t('subs.toast.cancelled', {
        amount: formatMoney(changed.refundedHalalas ?? 0),
      }),
      changed: [changed],
      /* **No undo — D18 fails on both clauses.** There is no inverse client
         function, and a refund is money that left the console. The
         confirmation above is the whole net, which is exactly why it is not
         optional on a `destructive` command. */
    }
  },
}

export const SUBSCRIPTION_COMMANDS: CommandRegistry<Subscription> = [cancel]
