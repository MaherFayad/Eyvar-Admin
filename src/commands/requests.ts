/**
 * Every command that acts on a **ride request** — D9, `COMMAND-PALETTE-DISCOVERY`
 * F6, **Q-P7** (*"dispatch and wallets first"*).
 *
 * Ported from `RequestsScreen`'s own dispositions (`askAssign`, `askExpire`)
 * and its claim guard, with the screen's predicates unchanged. The one command
 * with no screen behind it is `request.claimNext`, and it is the reason Q-P7
 * named this domain: an operator working the queue claims the top row dozens of
 * times a shift, and today that costs a page, a scroll and a click.
 *
 * ## `claimNext` cannot state a refusal, and says so in an outcome instead
 *
 * §11.2 wants the refusal at RENDER. `unavailable` is synchronous and sees only
 * `ctx.targets`, and this command has none — the record it acts on is whatever
 * the server ranks first at the moment it runs. So *"nothing is waiting"* is a
 * toast, not a disabled row. Stated rather than glossed: the alternative is an
 * async `unavailable`, which would put a network read behind every row the
 * palette draws.
 *
 * ## Assign confirms, and never offers an undo
 *
 * On the subscription channel an assignment **captures the rider's
 * authorisation hold** (`types/request.ts`, `authorisationHoldHalalas`), which
 * is money leaving the console — D18's second clause fails outright, and there
 * is no unassign operation for the first. The confirmation is the whole net,
 * exactly as `RequestsScreen` has it.
 *
 * ## CQ-7
 *
 * `unavailable` reads `status` and `claim` and nothing else; the role half goes
 * through `roleRefusal` naming `manage_requests`, the permission
 * `RequestsScreen` computes its own `canWrite` from.
 */

import { HandIcon } from 'lucide-react'
import { AssignIcon, RejectIcon } from '@/components/icons'
import { assignRequest, claimRequest, expireRequest, listDrivers, listRequests } from '@/data/clients'
import type { Driver, RideRequest } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy } from './refusal'
import {
  roleRefusal,
  type Command,
  type CommandConfirmOption,
  type CommandRegistry,
} from './registry'

/** The permission `RequestsScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_requests'

/**
 * §5.5 — the statuses after which nothing is owed. `RequestsScreen.tsx:141`'s
 * own list, and `assignRequest`'s 409 restated at render. `no-drivers` is
 * deliberately **not** terminal: a stuck row still needs a captain.
 */
export function isClosedRequest(request: RideRequest): boolean {
  return request.status === 'assigned' || request.status === 'expired' || request.status === 'cancelled'
}

/** Held by somebody right now. A released claim is not a hold (`clients/requests.ts:458`). */
function isHeld(request: RideRequest): boolean {
  return request.claim !== null && request.claim.state === 'claimed'
}

/** The captain picker's options — `RequestsScreen.tsx:136`'s query, unchanged. */
const ACTIVE_CAPTAINS_QUERY = { status: 'active', pageSize: 50 } as const

function captainOptions(captains: readonly Driver[]): readonly CommandConfirmOption[] {
  return captains.map((captain) => ({ value: captain.id, label: captain.name, hint: captain.city }))
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * **The verb Q-P7 exists for.** No target, no dialog: take the top unclaimed
 * row and open nothing.
 *
 * `unassigned` is the client's own view (`clients/requests.ts:180`), and
 * `urgency` descending is legacy `reqUrgencyScore` (`:10057`) — breached first,
 * then longest waiting — so the row this takes is the row the queue's own
 * default order puts at the top. The palette does not get to pick a different
 * one.
 */
const claimNext: Command<RideRequest> = {
  id: 'request.claimNext',
  titleKey: 'request.action.claimNext',
  compactTitleKey: 'request.bulk.claimNext',
  section: 'do',
  keywords: [
    'claim next',
    'next request',
    'take next',
    'grab next',
    'work the queue',
    'dispatch',
    /* The legacy page ids the route table resolves for this queue. */
    'requests',
    'requests-instant',
    'استلام التالي',
    'الطلب التالي',
    'إرسال',
    'طلب',
  ],
  icon: HandIcon,
  /* Global rather than route-scoped: an operator two workspaces away who types
     `claim next` has said exactly what they want, and making them navigate
     first is the cost ⌘K exists to remove. */
  scope: { kind: 'global' },
  affordance: 'default',
  arity: 'immediate',
  unavailable: (ctx) => roleRefusal(ctx, WRITE_PERMISSION, 'request.action.noPermission'),
  async run(ctx) {
    /* CQ-4 — every client call is reached from inside `run`. */
    const page = await listRequests({
      view: 'unassigned',
      pageSize: 1,
      sort: { field: 'urgency', dir: 'desc' },
    })
    const next = page.items.find((row) => !isClosedRequest(row))
    /* R8's second empty: *nothing is waiting* is a fact about the queue, not a
       failure. See the header for why it cannot be a render-time refusal. */
    if (next === undefined) return { message: ctx.t('request.toast.nothingWaiting') }
    const claimed = await claimRequest(next.id)
    return {
      /* R9 — the toast names the object, and names the rider because that is
         what the operator is about to say on the phone. */
      message: ctx.t('request.toast.claimedNext', { id: claimed.id, rider: claimed.riderName }),
      changed: [claimed],
    }
  },
}

/**
 * Take ownership of a row already on screen. No dialog — `RequestsScreen` has
 * none either, and claiming is what an operator does before everything else.
 *
 * **No undo handle.** `releaseRequest` exists in the data layer, but D18's
 * clause (a) requires the inverse to be a **declared command in this
 * registry**, and `release` is not declared: `CommandSession` carries no
 * operator identity, so a release command could drop a colleague's claim with
 * nothing to check it against. Reported — the same gap that keeps `release` out
 * of `tickets.ts`.
 */
const claim: Command<RideRequest> = {
  id: 'request.claim',
  titleKey: 'request.action.claim',
  section: 'do',
  keywords: [
    'claim',
    'take',
    'own',
    'pick up',
    'assign to me',
    'requests',
    'استلام',
    'أخذ',
    'تعيين لي',
    'طلب',
  ],
  icon: HandIcon,
  scope: { kind: 'entity', entityType: 'request', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'request.action.noPermission') ??
    blockedBy(ctx, (row) => isClosedRequest(row) || isHeld(row), 'request.action.claim.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(ctx.targets.map((row) => claimRequest(row.id)))
    return {
      message:
        count === 1
          ? ctx.t('request.toast.claimed', { id: first?.id ?? '' })
          : ctx.t('request.toast.claimed.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * Give the ride to a captain. Legacy `Assign driver`
 * (`eyvar_ops_panel_v40_fixed.html:9958`, `:11865`, audit verb `assign_driver`
 * at `:2899`).
 *
 * `plural: false` and that is a domain fact rather than a caution: one captain
 * cannot take twelve rides, and a set would need twelve pickers.
 */
const assign: Command<RideRequest> = {
  id: 'request.assign',
  titleKey: 'request.action.assign',
  compactTitleKey: 'request.bulk.assign',
  section: 'do',
  keywords: [
    'assign',
    'dispatch',
    'give to captain',
    'send captain',
    'manual assign',
    /* Legacy's own button and audit verb, verbatim (`:9958`, `:2899`). */
    'assign driver',
    'requests',
    'إسناد',
    'تعيين كابتن',
    'إرسال كابتن',
    'طلب',
  ],
  icon: AssignIcon,
  scope: { kind: 'entity', entityType: 'request', plural: false },
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'request.action.noPermission') ??
    blockedBy(ctx, isClosedRequest, 'request.action.assign.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    /* The picker's options are read HERE rather than declared on the command:
       a candidate list is state, and a registry that held one would hold a
       stale one. `subscriptions.ts` records `Change captain` as impossible for
       want of this; `choice` (T6.1) is what made it possible. */
    const captains = (await listDrivers(ACTIVE_CAPTAINS_QUERY)).items
    const options = captainOptions(captains)
    let driverId = options[0]?.value ?? ''

    const confirmed = await ctx.host.confirm({
      title: ctx.t('request.assign.title', { id: target.id }),
      /* §5.7 rule 9 — the body says what will NOT change, and on the
         subscription channel it says the hold is captured and cannot be walked
         back from here. `RequestsScreen` splits the same two sentences. */
      body: ctx.t(
        target.channel === 'subscription'
          ? 'request.assign.body.subscription'
          : 'request.assign.body.instant',
      ),
      confirmLabel: ctx.t('request.assign.confirm'),
      choice: {
        label: ctx.t('request.assign.choice'),
        help: ctx.t('request.assign.choice.help'),
        message: ctx.t('request.assign.choice.message'),
        placeholder: ctx.t('request.assign.choice.placeholder'),
        /* §11.6 — an empty option list is a sentence, never an empty popover. */
        emptyMessage: ctx.t('request.assign.choice.empty'),
        options,
        initial: driverId,
        onSelect: (value) => {
          driverId = value
        },
      },
    })
    if (confirmed === null) return null

    const changed = await assignRequest(target.id, driverId)
    const captain = captains.find((each) => each.id === driverId)
    return {
      message: ctx.t('request.toast.assigned', {
        id: changed.id,
        captain: captain?.name ?? driverId,
      }),
      changed: [changed],
      /* No undo — there is no unassign operation, and on the subscription
         channel the authorisation hold has been captured. D18 fails twice. */
    }
  },
}

/**
 * Close a request nobody can serve. Legacy only ever did this **automatically**
 * (`justExpired`, `:9690`); there is no operator-facing expire button in the
 * old console at all, which is why an operator watching a dead row could do
 * nothing but wait for the sweep.
 *
 * **R5a red.** The row closes, the rider is told nothing more, and there is no
 * inverse anywhere in the data layer — so the confirm step is mandatory and the
 * shape of `run` is what makes it so.
 */
const expire: Command<RideRequest> = {
  id: 'request.expire',
  titleKey: 'request.action.expire',
  compactTitleKey: 'request.bulk.expire',
  section: 'do',
  keywords: [
    'expire',
    'close request',
    'give up',
    'no drivers',
    'cancel search',
    /* The legacy filter chip an operator would recognise (`:2097`). */
    'expired no drivers',
    'requests',
    'إنهاء',
    'إغلاق الطلب',
    'لا يوجد كباتن',
    'طلب',
  ],
  icon: RejectIcon,
  scope: { kind: 'entity', entityType: 'request', plural: true },
  affordance: 'destructive',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'request.action.noPermission') ??
    blockedBy(ctx, isClosedRequest, 'request.action.expire.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    if (first === undefined) return null

    const confirmed = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('request.expire.title', { id: first.id })
          : ctx.t('request.expire.title.other', { count: formatCount(count, ctx.language) }),
      body: ctx.t('request.expire.body'),
      confirmLabel: ctx.t('request.expire.confirm'),
      /* `expireRequest` records no reason, so no field is invented for one. */
    })
    if (confirmed === null) return null

    const changed = await Promise.all(ctx.targets.map((row) => expireRequest(row.id)))
    return {
      message:
        count === 1
          ? ctx.t('request.toast.expired', { id: first.id })
          : ctx.t('request.toast.expired.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * The dispatch registry, in the order an operator works a request: take the
 * next one, take this one, give it to a captain, or close it.
 *
 * **No `release`, no `take over`.** `CommandSession` carries one boolean and no
 * operator identity, so neither can be gated on *whose* claim it is — the same
 * gap recorded in `tickets.ts` and `applicants.ts`.
 */
export const REQUEST_COMMANDS: CommandRegistry<RideRequest> = [claimNext, claim, assign, expire]
