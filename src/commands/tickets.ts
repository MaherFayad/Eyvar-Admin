/**
 * Every command that acts on a **support ticket** —
 * `design/05-command-centre.md` §2, phase **C-5**.
 *
 * ## Why this domain
 *
 * Support › Tickets is a work queue with an SLA on it, and `Claim` is the verb
 * an agent presses before every other thing they do all day. It is the clearest
 * case in the console for a command that should not require finding a row
 * first.
 *
 * ## Ported from `TicketsScreen`, unchanged
 *
 * `Claim` and `Resolve` are the screen's two declared row actions, with the
 * screen's own predicates — including the two **precise** singular refusals
 * that name *which* rule applied (`{name} already owns this ticket.` versus
 * `A closed ticket is not claimed. Reopen it first.`). §11.2 wants the
 * sentence, not the fact of refusal, and collapsing those two into one D21
 * family would have thrown away the half that tells the agent what to do next.
 * The set sentences are added beside them, not in place of them.
 *
 * Neither confirms, which is also the screen's behaviour and — for `Resolve` —
 * **D18's ruling rather than a coincidence**: the inverse is declared in this
 * registry, nothing left the console, so the dialog goes and the undo handle
 * arrives.
 *
 * ## `Reopen` is new to the UI and not new to the product
 *
 * `reopenTicket` has existed in the data layer since tickets did
 * (`clients/tickets.ts:215`) and **no screen surfaces it**. It is declared here
 * for two reasons, both of them rules rather than preferences:
 *
 *   1. **§11.2 / the `:4113` defect.** The legacy roster renders
 *      `Reinstate account` **or** `Suspend account` and never both, so an
 *      operator looking at a resolved record cannot see that reopening is a
 *      thing that exists. Declaring one direction of a pair and hiding the
 *      other is that defect. `ticket.action.claim.blocked.closed` already tells
 *      an agent to *"reopen it first"* — a sentence the console could not act
 *      on until now.
 *   2. **D18 clause (a).** `Resolve` may only offer an undo if its inverse is a
 *      **declared command in this same registry**. Reaching `reopenTicket`
 *      directly from inside `resolve`'s handle would be a second write path
 *      with no refusal predicate on it, which is what the ruling forbids.
 *
 * **One caveat, stated rather than glossed:** `reopenTicket` sets `status` to
 * `open`, not to whatever the ticket was before it was resolved
 * (`clients/tickets.ts:224`). A ticket that was `waiting` when it was resolved
 * comes back as `open`. That is the data layer's contract and the undo copy is
 * written to it — `{id} is open again`, never *"restored"*. Reported to
 * mock-data-engineer: `resolveTicket` should stash the prior status if reopen
 * is meant to be a true inverse.
 *
 * ## Where the operator's identity comes from, and why it is not on the session
 *
 * `claimTicket(id, userId, userName)` needs the agent. `CommandSession` carries
 * one boolean and no identity (`session.ts`), so the actor is read **through
 * the data seam** inside `run` — `getSession()`, the same `/session` the shell
 * itself renders from, in the same place every other client call is allowed
 * (CQ-4: a command reaches the outside world from inside `run` and nowhere
 * else).
 *
 * That is correct but it is not free: it is one extra read per claim, and it
 * means the palette's idea of *who I am* comes from the server rather than from
 * the shell. In the mock they are the same value (`buildSession(mockUserId)`).
 * **Raised in the handoff:** `CommandSession` should carry the actor, which is
 * one field and one optional argument on `commandSession()`, and it is the same
 * gap that keeps `claim` / `release` / `take over` out of `applicants.ts`.
 *
 * ## CQ-7
 *
 * `unavailable` reads `status` and `ownerId` and nothing else. The role half
 * goes through `roleRefusal`, naming `manage_tickets` — the permission
 * `TicketsScreen.tsx:74` computes its own `canWrite` from.
 */

import { CheckCircleIcon, HandIcon, RotateCcwIcon } from 'lucide-react'
import { claimTicket, getSession, reopenTicket, resolveTicket } from '@/data/clients'
import type { Ticket } from '@/data/types'
import { formatCount } from '@/lib'
import { roleRefusal, type Command, type CommandContext, type CommandRegistry } from './registry'
import { undoHandle } from './undo'

/** The permission `TicketsScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_tickets'

/** The two statuses with no work left in them. `resolveTicket`'s own contract. */
function isDone(ticket: Ticket): boolean {
  return ticket.status === 'resolved' || ticket.status === 'closed'
}

/* ─────────────────────────── refusal predicates ─────────────────────────── */

/**
 * **D21's three sentences, with the singular kept precise.**
 *
 * `blockedSentence` in `refusal.ts` assumes one `.one` sentence per command,
 * which is right where there is one reason to refuse. Claiming has two, and
 * they lead somewhere different: *reopen it first* is an instruction, *Yousef
 * holds it* is a person to go and ask. So the one-target case keeps the
 * screen's two keys and only the set case is new.
 */
function setSentence<T>(
  ctx: CommandContext<T>,
  blocked: readonly T[],
  prefix: string,
  singular: (only: T) => string,
): string | null {
  if (blocked.length === 0) return null
  const only = ctx.targets.length === 1 ? blocked[0] : undefined
  if (only !== undefined) return singular(only)
  const count = formatCount(blocked.length, ctx.language)
  return blocked.length === ctx.targets.length
    ? ctx.t(`${prefix}.all`, { count })
    : ctx.t(`${prefix}.other`, { count })
}

function claimRefusal(ctx: CommandContext<Ticket>): string | null {
  const blocked = ctx.targets.filter(
    (ticket) => ticket.status === 'closed' || ticket.ownerId !== null,
  )
  return setSentence(ctx, blocked, 'ticket.action.claim.blocked', (only) =>
    only.status === 'closed'
      ? ctx.t('ticket.action.claim.blocked.closed')
      : ctx.t('ticket.action.claim.blocked.owned', {
          name: only.ownerName ?? only.ownerId ?? '',
        }),
  )
}

function resolveRefusal(ctx: CommandContext<Ticket>): string | null {
  const blocked = ctx.targets.filter(isDone)
  return setSentence(ctx, blocked, 'ticket.action.resolve.blocked', (only) =>
    ctx.t('ticket.action.resolve.blocked.done', { status: ctx.t(`ticket.status.${only.status}`) }),
  )
}

function reopenRefusal(ctx: CommandContext<Ticket>): string | null {
  const blocked = ctx.targets.filter((ticket) => !isDone(ticket))
  return setSentence(ctx, blocked, 'ticket.action.reopen.blocked', (only) =>
    ctx.t('ticket.action.reopen.blocked.open', { status: ctx.t(`ticket.status.${only.status}`) }),
  )
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * Take ownership. No confirmation — the screen has none, claiming is what an
 * agent does dozens of times an hour, and a dialog on it would be furniture.
 *
 * **No undo handle either, and that is D18 refusing rather than an omission:**
 * there is no `releaseTicket` in the data layer, so clause (a) fails — the
 * inverse is not a declared command in this registry because it is not a
 * client function anywhere. Reported.
 */
const claim: Command<Ticket> = {
  id: 'ticket.claim',
  titleKey: 'ticket.action.claim',
  section: 'do',
  keywords: [
    'claim',
    'take',
    'assign to me',
    'own',
    'pick up',
    'grab',
    /* The legacy permission label an operator would recognise
       (`eyvar_ops_panel_v40_fixed.html:10644`). `tickets` is the legacy page
       id the route table resolves. */
    'resolve tickets',
    'tickets',
    'استلام',
    'تعيين لي',
    'أخذ',
    'تذكرة',
  ],
  icon: HandIcon,
  scope: { kind: 'entity', entityType: 'ticket', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'ticket.action.claim.blocked.permission') ??
    claimRefusal(ctx),
  async run(ctx) {
    /* CQ-4 — every client, including the read that says who is asking, is
       reached from inside `run`. See the header for why the actor is not on
       `CommandSession` yet. */
    const me = await getSession()
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(
      ctx.targets.map((ticket) => claimTicket(ticket.id, me.userId, me.name)),
    )
    return {
      message:
        count === 1
          ? ctx.t('ticket.toast.claimed', { id: first?.id ?? '' })
          : ctx.t('ticket.toast.claimed.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * Close the work. **No confirmation, by D18** — the inverse is declared below,
 * nothing left the console, and the ten-second undo on the toast is the net the
 * dialog would otherwise have been.
 */
const resolve: Command<Ticket> = {
  id: 'ticket.resolve',
  titleKey: 'ticket.action.resolve',
  section: 'do',
  keywords: [
    'resolve',
    'close',
    'done',
    'complete',
    'finish',
    'settle',
    'resolve tickets',
    'tickets',
    'حل',
    'إغلاق',
    'إنهاء',
    'تذكرة',
  ],
  icon: CheckCircleIcon,
  scope: { kind: 'entity', entityType: 'ticket', plural: true },
  /* R5a — resolving is undone by the command declared beneath it, so it is not
     the unrecoverable act red is reserved for. */
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'ticket.action.resolve.blocked.permission') ??
    resolveRefusal(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(ctx.targets.map((ticket) => resolveTicket(ticket.id)))
    return {
      message:
        count === 1
          ? ctx.t('ticket.toast.resolved', { id: first?.id ?? '' })
          : ctx.t('ticket.toast.resolved.other', { count: formatCount(count, ctx.language) }),
      changed,
      undo: undoHandle(ctx, {
        inverse: (ticket) => reopenTicket(ticket.id),
        copyPrefix: 'ticket.toast.resolved',
        nameOf: (ticket) => ({ id: ticket.id }),
        record: (ticket) => ({ entityType: 'ticket', entityId: ticket.id }),
      }),
    }
  },
}

/**
 * The inverse. See the header for why it is declared although no screen shows
 * it — §11.2's `:4113` argument and D18's clause (a), not an appetite for a
 * third row action.
 */
const reopen: Command<Ticket> = {
  id: 'ticket.reopen',
  titleKey: 'ticket.action.reopen',
  section: 'do',
  keywords: [
    'reopen',
    'open again',
    'unresolve',
    'undo resolve',
    'back to queue',
    /* The legacy console's own word for it, on a closed conversation
       (`eyvar_ops_panel_v40_fixed.html:6264`). */
    'reopen ticket',
    'tickets',
    'إعادة فتح',
    'فتح مجددا',
    'تراجع',
    'تذكرة',
  ],
  icon: RotateCcwIcon,
  scope: { kind: 'entity', entityType: 'ticket', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'ticket.action.reopen.blocked.permission') ??
    reopenRefusal(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(ctx.targets.map((ticket) => reopenTicket(ticket.id)))
    return {
      message:
        count === 1
          ? ctx.t('ticket.toast.reopened', { id: first?.id ?? '' })
          : ctx.t('ticket.toast.reopened.other', { count: formatCount(count, ctx.language) }),
      changed,
      undo: undoHandle(ctx, {
        inverse: (ticket) => resolveTicket(ticket.id),
        copyPrefix: 'ticket.toast.reopened',
        nameOf: (ticket) => ({ id: ticket.id }),
        record: (ticket) => ({ entityType: 'ticket', entityId: ticket.id }),
      }),
    }
  },
}

/**
 * The ticket registry, in the order an agent works a ticket: take it, finish
 * it, and — when finishing it was wrong — put it back.
 *
 * **No `Open ticket` command.** Its destination is the route
 * `/support/tickets/:id` and `CommandHost` has no `navigate` yet
 * (`registry.ts`). ⌘K's `Find` verb already resolves a `TKT-*` id to the
 * ticket's 360° layer (§5, `clients/profile.ts:253`).
 *
 * **No `Reply`.** `replyTicket` exists, but a reply is a body of text with a
 * channel behind it — `Ticket.channel` is optional and *"treat absent as
 * unknown, ask before replying"* — and `CommandConfirmRequest` carries one
 * `reason` field with no channel and no delivery state. A palette that can send
 * a customer-visible message into an unknown channel is worse than one that
 * cannot send one at all.
 */
export const TICKET_COMMANDS: CommandRegistry<Ticket> = [claim, resolve, reopen]
