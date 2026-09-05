/**
 * Seeded tickets, legacy `DB.tickets`, on the work-queue contract (S-1, S-2).
 * Every clock below is stamped from the policy fixture through the same
 * resolver the client uses, so a tier edit in Admin › Policy and a ticket agree.
 * `TKT-501 ⇄ CNV-104` (email), `TKT-502 ⇄ CNV-106` (phone), `TKT-504 ⇄ CNV-105`
 * (WhatsApp); `TKT-503` and `TKT-505` have no thread and no channel.
 */

import type { Claim, IsoDateTime } from '../types/common'
import { stampTicketClocks, ticketSlaTargets, type Ticket } from '../types/ticket'
import { offsetFromNow } from '../mock/clock'
import { operationalPolicyFixture } from './policy'

function clocks(reasonCode: string, openedAt: IsoDateTime) {
  return stampTicketClocks(ticketSlaTargets(operationalPolicyFixture, reasonCode), openedAt)
}

function claim(
  id: string,
  owner: { id: string; name: string },
  claimedAt: IsoDateTime,
  touchedAt: IsoDateTime,
  state: Claim['state'] = 'claimed',
): Claim {
  return {
    key: `ticket:${id}`,
    entityType: 'ticket',
    entityId: id,
    ownerId: owner.id,
    ownerName: owner.name,
    claimedAt,
    touchedAt,
    state,
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  }
}

const SARAH = { id: 'USR-1', name: 'Sarah Al-Rashid' }
const LINA = { id: 'USR-3', name: 'Lina Al-Otaibi' }
const YOUSEF = { id: 'USR-5', name: 'Yousef Al-Balawi' }

export const ticketFixtures: Ticket[] = [
  /* A first reply still owed, inside its window: the warning band on the queue. */
  {
    id: 'TKT-501',
    subject: 'Fare calculation discrepancy on surge trip',
    entityId: 'RDR-1041',
    entityName: 'Nora Al-Harbi',
    entityType: 'rider',
    requesterPhone: null,
    csat: null,
    category: 'Billing',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    priority: 'High',
    status: 'open',
    claim: null,
    ownerId: null,
    ownerName: null,
    createdAt: offsetFromNow({ minutes: -10 }),
    resolvedAt: null,
    ...clocks('PAY_INCORRECT_CHARGE', offsetFromNow({ minutes: -10 })),
    firstResponseAt: null,
    lastUpdateAt: null,
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: false,
    conversationId: 'CNV-104',
    channel: 'email',
    callLogs: [],
    callGuideScript: {
      scenario: 'Fare Dispute / Multiplier Question',
      say: 'Review the base fare, surge multiplier, and distance recorded on the trip telemetry. If the surge was incorrectly applied, issue a partial fare adjustment to the rider wallet.',
      do: 'Verify trip route against normal route. Check if driver took an unapproved detour. If validated, apply adjustment via Wallet Adjust.',
      policyRef: 'POL-FIN-04 §3',
    },
    messages: [
      {
        id: 'MSG-01',
        senderId: 'RDR-1041',
        senderName: 'Nora Al-Harbi',
        senderType: 'customer',
        body: 'I was charged 145 SAR for my morning commute which normally costs 85 SAR. The app showed 1.2x surge but final charge was much higher.',
        sentAt: offsetFromNow({ minutes: -10 }),
      },
    ],
  },
  /* Held, answered, and carrying the recurring-update promise a lost item makes. */
  {
    id: 'TKT-502',
    subject: 'Left briefcase in back seat of Camry',
    entityId: 'RDR-1042',
    entityName: 'Sara Al-Otaibi',
    entityType: 'rider',
    requesterPhone: null,
    csat: null,
    category: 'Operations',
    reasonCode: 'TRP_LOST_ITEM',
    priority: 'Medium',
    status: 'in-progress',
    claim: claim('TKT-502', LINA, offsetFromNow({ minutes: -70 }), offsetFromNow({ minutes: -20 })),
    ownerId: LINA.id,
    ownerName: LINA.name,
    createdAt: offsetFromNow({ minutes: -90 }),
    resolvedAt: null,
    ...clocks('TRP_LOST_ITEM', offsetFromNow({ minutes: -90 })),
    firstResponseAt: offsetFromNow({ minutes: -25 }),
    lastUpdateAt: offsetFromNow({ minutes: -20 }),
    /* The next update is owed 30 minutes after the last one, not after opening. */
    updateDueAt: offsetFromNow({ minutes: 10 }),
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: false,
    conversationId: 'CNV-106',
    channel: 'phone',
    callLogs: [
      {
        id: 'CALL-01',
        outcome: 'no-answer',
        notes: 'Called the captain twice; both went to voicemail.',
        loggedAt: offsetFromNow({ minutes: -70 }),
        loggedByUserId: LINA.id,
        loggedByUserName: LINA.name,
      },
      {
        id: 'CALL-02',
        outcome: 'escalated',
        notes: 'Captain confirmed the briefcase is in the boot. Drop-off at Olaya by 14:00.',
        loggedAt: offsetFromNow({ minutes: -20 }),
        loggedByUserId: LINA.id,
        loggedByUserName: LINA.name,
      },
    ],
    callGuideScript: {
      scenario: 'Lost Item Recovery Protocol',
      say: 'Confirm the item description, trip ID, and dropoff time with rider. Contact captain immediately to inspect vehicle safely.',
      do: 'Check Captain last location. Call captain and log outcome. If item found, coordinate return or handover at central dispatch office.',
      policyRef: 'POL-SUP-09 §2',
    },
    messages: [
      {
        id: 'MSG-02',
        senderId: 'RDR-1042',
        senderName: 'Sara Al-Otaibi',
        senderType: 'customer',
        body: 'I forgot my brown leather briefcase with work documents in the back seat. Trip ended at 08:30 AM.',
        sentAt: offsetFromNow({ minutes: -90 }),
      },
      {
        id: 'MSG-03',
        senderId: LINA.id,
        senderName: LINA.name,
        senderType: 'agent',
        body: 'Hello Sara, I have contacted Captain Abdullah. He confirmed locating the briefcase and will drop it at the Olaya office by 14:00.',
        sentAt: offsetFromNow({ minutes: -25 }),
      },
    ],
  },
  /* Held by the acting operator, no thread, no channel: the composer refuses. */
  {
    id: 'TKT-503',
    subject: 'Captain did not arrive for scheduled morning departure',
    entityId: 'RDR-1043',
    entityName: 'Fahad Al-Shehri',
    entityType: 'rider',
    requesterPhone: null,
    csat: null,
    category: 'Assurance',
    reasonCode: 'CAP_NOSHOW',
    priority: 'High',
    status: 'in-progress',
    claim: claim('TKT-503', SARAH, offsetFromNow({ minutes: -6 }), offsetFromNow({ minutes: -6 })),
    ownerId: SARAH.id,
    ownerName: SARAH.name,
    createdAt: offsetFromNow({ minutes: -8 }),
    resolvedAt: null,
    ...clocks('CAP_NOSHOW', offsetFromNow({ minutes: -8 })),
    firstResponseAt: null,
    lastUpdateAt: null,
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: false,
    conversationId: null,
    channel: null,
    callLogs: [],
    callGuideScript: {
      scenario: 'Scheduled Trip Absence / No-Show',
      say: 'Apologize sincerely for the missed subscription departure. Immediate backup dispatch or priority quick ride booking.',
      do: 'Auto-dispatch available backup captain. Credit 100% leg refund + 25 SAR goodwill credit to rider wallet.',
      policyRef: 'POL-OPS-02 §1',
    },
    messages: [
      {
        id: 'MSG-04',
        senderId: 'RDR-1043',
        senderName: 'Fahad Al-Shehri',
        senderType: 'customer',
        body: 'My subscription driver did not show up at 07:30. I waited 20 minutes and had to take an emergency taxi to airport.',
        sentAt: offsetFromNow({ minutes: -8 }),
      },
    ],
  },
  /* Resolved inside its window: a stopped clock, and the scanner's seeded name contradiction (TKT-504 ≠ DRV-0104). */
  {
    id: 'TKT-504',
    subject: 'App crashes when uploading Istemara registration',
    entityId: 'DRV-0104',
    entityName: 'Sultan Al-Harbi',
    entityType: 'driver',
    requesterPhone: null,
    csat: { score: 4, comment: 'Quick and clear once someone picked it up.', at: offsetFromNow({ hours: -20 }) },
    category: 'Technical',
    reasonCode: 'APP_CRASH',
    priority: 'Medium',
    status: 'resolved',
    claim: claim('TKT-504', YOUSEF, offsetFromNow({ days: -2, hours: 1 }), offsetFromNow({ days: -1 }), 'done'),
    ownerId: YOUSEF.id,
    ownerName: YOUSEF.name,
    createdAt: offsetFromNow({ days: -2 }),
    resolvedAt: offsetFromNow({ days: -1 }),
    ...clocks('APP_CRASH', offsetFromNow({ days: -2 })),
    firstResponseAt: offsetFromNow({ days: -2, hours: 1 }),
    lastUpdateAt: offsetFromNow({ days: -1 }),
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: false,
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    callLogs: [
      {
        id: 'CALL-03',
        outcome: 'waiting-on-customer',
        notes: 'Asked the captain to resend the registration photo under 5 MB.',
        loggedAt: offsetFromNow({ days: -2, hours: 1 }),
        loggedByUserId: YOUSEF.id,
        loggedByUserName: YOUSEF.name,
      },
    ],
    callGuideScript: {
      scenario: 'Document Upload Failure',
      say: 'Advise captain to ensure photo is under 5MB and in JPEG/PNG format. Alternatively receive doc via official WhatsApp.',
      do: 'Upload document manually via KYC inspector if captain submits via direct channel.',
      policyRef: 'POL-TECH-01',
    },
    messages: [
      {
        id: 'MSG-05',
        senderId: 'DRV-0104',
        senderName: 'Sultan Al-Harbi',
        senderType: 'customer',
        body: 'The app closes automatically when I select my vehicle registration photo.',
        sentAt: offsetFromNow({ days: -2 }),
      },
      {
        id: 'MSG-06',
        senderId: YOUSEF.id,
        senderName: YOUSEF.name,
        senderType: 'agent',
        body: 'Received document via support channel and uploaded directly. Account is verified.',
        sentAt: offsetFromNow({ days: -1 }),
      },
    ],
  },
  /* Unanswered past its first-reply window, with an empty thread: the breached reading and the empty state. */
  {
    id: 'TKT-505',
    subject: 'Payout run refused the captain bank details on file',
    entityId: 'RDR-2031',
    entityName: 'Tariq Al-Saud',
    entityType: 'rider',
    requesterPhone: null,
    csat: null,
    category: 'Billing',
    reasonCode: 'PAY_DECLINED',
    priority: 'Medium',
    status: 'open',
    claim: null,
    ownerId: null,
    ownerName: null,
    createdAt: offsetFromNow({ hours: -10 }),
    resolvedAt: null,
    ...clocks('PAY_DECLINED', offsetFromNow({ hours: -10 })),
    /* Stamped at the instant the promise broke: an hour after opening. */
    firstResponseBreachedAt: offsetFromNow({ hours: -9 }),
    firstResponseAt: null,
    lastUpdateAt: null,
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: true,
    conversationId: null,
    channel: null,
    callLogs: [],
    messages: [],
  },
]
