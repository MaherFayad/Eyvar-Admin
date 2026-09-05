import type { IsoDateTime } from './common'
import type { ConversationChannel } from './conversation'
import { effectiveSlaTargets, type OperationalPolicy, type SlaTierKey } from './policy'
import type { WorkQueueRow } from './workQueue'

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed'

/** Who may read a message on the ticket. Absent means `customer` (the pre-S-3 rows). */
export type TicketMessageVisibility = 'customer' | 'internal'

export interface TicketMessage {
  id: string
  senderId: string
  senderName: string
  senderType: 'customer' | 'agent' | 'system'
  body: string
  sentAt: IsoDateTime
  /** `internal` is never sent to the customer: a transfer note, a handover. */
  visibility?: TicketMessageVisibility
}

/**
 * How a call ended. A closed union so the log can be counted; values are
 * hyphenated like every other union in this folder.
 */
export type TicketCallOutcome =
  | 'resolved-on-call'
  | 'escalated'
  | 'waiting-on-customer'
  | 'no-answer'

export const TICKET_CALL_OUTCOMES: readonly TicketCallOutcome[] = [
  'resolved-on-call',
  'escalated',
  'waiting-on-customer',
  'no-answer',
]

/**
 * One recorded call. Not a `TicketMessage`: a message has a body written to a
 * customer, a call log has an outcome nobody typed. It renders on the ticket's
 * timeline interleaved with the messages by time.
 */
export interface TicketCallLog {
  /** `CALL-nnn`. Minted from a counter, never from the clock. */
  id: string
  outcome: TicketCallOutcome
  notes: string | null
  loggedAt: IsoDateTime
  loggedByUserId: string
  loggedByUserName: string
}

/**
 * A work-queue row (S-1): the shared `Claim` plus the `SlaTracked` block, so
 * `OwnerChip`, `SlaCell` and My Work read it directly. Three clocks stamped
 * from policy at creation (S-2): first response, resolution (pauses while
 * waiting on the customer, never for a suspension appeal, Q-81), next update.
 */
export interface Ticket extends WorkQueueRow {
  id: string
  subject: string
  entityId: string
  entityName: string
  entityType: 'rider' | 'driver' | 'corporate'
  /** §7.5: the requester's number as on their record, so a caller reading it out is found. */
  requesterPhone: string | null
  category: string
  /** A key in the reason-code registry. `OTHER_UNCODED` targets apply when it is not. */
  reasonCode: string
  priority: TicketPriority
  status: TicketStatus

  /** The live holder, projected from `claim` by the client. `null` = nobody. */
  ownerId: string | null
  ownerName: string | null

  createdAt: IsoDateTime
  resolvedAt: IsoDateTime | null

  /** The recurring-update promise, when the reason code makes one. */
  updateDueAt: IsoDateTime | null
  /** The last outbound customer-visible act: a reply or a logged call. */
  lastUpdateAt: IsoDateTime | null
  /** `Waiting on customer` since. The resolution clock does not run while set. */
  pausedAt: IsoDateTime | null
  /** Minutes the resolution clock has already spent paused. */
  pausedMinutes: number

  /** Either breach stamp set. Derived by the client; never written by a screen. */
  slaBreached: boolean

  /** The thread this ticket is discussed in. `null` = nobody has contacted the customer. */
  conversationId: string | null
  /** Where a reply goes. `null` = unknown; ask before replying, never a default. */
  channel: ConversationChannel | null

  callGuideScript?: {
    scenario: string
    say: string
    do: string
    policyRef: string
  }
  messages: TicketMessage[]
  /** Every call wrap-up, oldest first. `[]` is an answer, not the absence of one. */
  callLogs: TicketCallLog[]
  /** B4: the customer's rating after the ticket was decided, or `null` until one arrives. */
  csat: TicketCsat | null
}

export interface TicketCsat {
  score: 1 | 2 | 3 | 4 | 5
  comment: string | null
  at: IsoDateTime
}

/* ── the SLA, resolved from policy ─────────────────────────────────────── */

/** Legacy `rcPriority` (`:14745`): the tier names the priority. */
export const PRIORITY_BY_TIER: Record<SlaTierKey, TicketPriority> = {
  T1: 'Critical',
  T2: 'High',
  T3: 'Medium',
  T4: 'Low',
}

export interface TicketSlaTargets {
  tier: SlaTierKey
  firstResponseMinutes: number
  resolutionMinutes: number
  updateEveryMinutes: number | null
  pausesOnCustomer: boolean
  /** `false` when the code is not in the registry and `OTHER_UNCODED` answered. */
  coded: boolean
}

/** The code whose targets an unknown code inherits (legacy `rcTargets`, `:14733`). */
export const UNCODED_REASON = 'OTHER_UNCODED'

/**
 * The one place a ticket's promises are resolved (B1). Reads the registry entry
 * for its tier, the queue × tier grid for the minutes, and Q-81 for the pause.
 */
export function ticketSlaTargets(policy: OperationalPolicy, reasonCode: string): TicketSlaTargets {
  const code =
    policy.reasonCodes.find((each) => each.key === reasonCode) ??
    policy.reasonCodes.find((each) => each.key === UNCODED_REASON)
  const tier: SlaTierKey = code?.tier ?? 'T3'
  const targets = effectiveSlaTargets(policy.sla, 'ticket', tier)
  const tierDefault = policy.sla.tiers.find((each) => each.key === tier)
  return {
    tier,
    firstResponseMinutes: targets.firstResponse.minutes,
    resolutionMinutes: targets.resolution.minutes,
    updateEveryMinutes: code?.updateEveryMinutes ?? null,
    pausesOnCustomer:
      (tierDefault?.pausesOnCustomer ?? true) && reasonCode !== 'DRV_SUSPENSION_APPEAL',
    coded: code !== undefined && code.key === reasonCode,
  }
}

export function addMinutes(iso: IsoDateTime, minutes: number): IsoDateTime {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString()
}

/** The clock fields a fresh ticket carries, from its targets and opening instant. */
export function stampTicketClocks(
  targets: TicketSlaTargets,
  openedAt: IsoDateTime,
): Pick<
  Ticket,
  | 'slaStartedAt'
  | 'slaDueAt'
  | 'slaTargetMinutes'
  | 'slaBreachedAt'
  | 'slaSource'
  | 'firstResponseDueAt'
  | 'firstResponseBreachedAt'
  | 'updateDueAt'
> {
  return {
    slaStartedAt: openedAt,
    slaDueAt: addMinutes(openedAt, targets.resolutionMinutes),
    slaTargetMinutes: targets.resolutionMinutes,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: addMinutes(openedAt, targets.firstResponseMinutes),
    firstResponseBreachedAt: null,
    updateDueAt:
      targets.updateEveryMinutes === null ? null : addMinutes(openedAt, targets.updateEveryMinutes),
  }
}

/** Legacy's eleven categories (`13a` §6), derived from the registry key's prefix. */
export function categoryOf(reasonCode: string): string {
  const prefix = reasonCode.split('_')[0] ?? ''
  switch (prefix) {
    case 'CAP':
      return 'Captain'
    case 'BKG':
      return 'Booking'
    case 'PAY':
      return 'Payment'
    case 'TRP':
      return 'Trip'
    case 'APP':
    case 'TECH':
      return 'Technical'
    case 'SAF':
      return 'Safety'
    case 'FBK':
      return 'Feedback'
    case 'SUB':
      return 'Subscription'
    case 'DRV':
      return 'Driver'
    case 'CORP':
      return 'Corporate'
    default:
      return 'Other'
  }
}

/** Work still owed. Resolved and closed tickets have stopped clocks. */
export function ticketIsLive(ticket: Pick<Ticket, 'status'>): boolean {
  return ticket.status !== 'resolved' && ticket.status !== 'closed'
}
