/**
 * Seeded tickets — legacy `DB.tickets`.
 *
 * **`conversationId` and `channel` were added in P5-T1.** They are the link
 * between a ticket and the thread it is actually discussed in
 * (`fixtures/conversations.ts`), and they are what stops a reply being composed
 * with no idea where it goes. The two sides agree by id in both directions:
 *
 *   `TKT-501` ⇄ `CNV-104` · email     (the reply that bounced)
 *   `TKT-502` ⇄ `CNV-106` · phone     (call notes only, no customer message)
 *   `TKT-504` ⇄ `CNV-105` · whatsapp  (all four delivery states)
 *
 * `TKT-503` deliberately has **neither**: a ticket raised from an operations
 * event that nobody has contacted the customer about yet. `channel` is absent
 * rather than guessed, which is the state the optional field exists to carry —
 * see the follow-up note in `types/ticket.ts`.
 */

import type { Ticket } from '../types/ticket'
import { offsetFromNow } from '../mock/clock'

export const ticketFixtures: Ticket[] = [
  {
    id: 'TKT-501',
    subject: 'Fare calculation discrepancy on surge trip',
    entityId: 'RDR-1041',
    entityName: 'Nora Al-Harbi',
    entityType: 'rider',
    category: 'Billing',
    reasonCode: 'fare_dispute',
    priority: 'High',
    status: 'open',
    ownerId: null,
    ownerName: null,
    createdAt: offsetFromNow({ hours: -2 }),
    slaDueAt: offsetFromNow({ hours: 2 }),
    slaBreached: false,
    conversationId: 'CNV-104',
    channel: 'email',
    /* Nobody has phoned. `[]` is the answer, not the absence of one. */
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
        sentAt: offsetFromNow({ hours: -2 }),
      },
    ],
  },
  {
    id: 'TKT-502',
    subject: 'Left briefcase in back seat of Camry',
    entityId: 'RDR-1042',
    entityName: 'Sara Al-Otaibi',
    entityType: 'rider',
    category: 'Operations',
    reasonCode: 'lost_item',
    priority: 'High',
    status: 'in-progress',
    ownerId: 'USR-3',
    ownerName: 'Lina Al-Otaibi',
    createdAt: offsetFromNow({ hours: -5 }),
    slaDueAt: offsetFromNow({ hours: 1 }),
    slaBreached: false,
    conversationId: 'CNV-106',
    channel: 'phone',
    /* A phone ticket whose whole record IS the call log — legacy's `contact
       log` evidence, ported. Two entries so the timeline has to interleave
       calls and messages rather than appending one block after the other. */
    callLogs: [
      {
        id: 'CALL-01',
        outcome: 'no-answer',
        notes: 'Called the captain twice; both went to voicemail.',
        loggedAt: offsetFromNow({ hours: -4 }),
        loggedByUserId: 'USR-3',
        loggedByUserName: 'Lina Al-Otaibi',
      },
      {
        id: 'CALL-02',
        outcome: 'resolved-on-call',
        notes: 'Captain confirmed the briefcase is in the boot. Drop-off at Olaya by 14:00.',
        loggedAt: offsetFromNow({ hours: -3, minutes: -10 }),
        loggedByUserId: 'USR-3',
        loggedByUserName: 'Lina Al-Otaibi',
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
        sentAt: offsetFromNow({ hours: -5 }),
      },
      {
        id: 'MSG-03',
        senderId: 'USR-3',
        senderName: 'Lina Al-Otaibi',
        senderType: 'agent',
        body: 'Hello Sara, I have contacted Captain Abdullah. He confirmed locating the briefcase and will drop it at the Olaya office by 14:00.',
        sentAt: offsetFromNow({ hours: -3 }),
      },
    ],
  },
  {
    id: 'TKT-503',
    subject: 'Captain did not arrive for scheduled morning departure',
    entityId: 'RDR-1043',
    entityName: 'Fahad Al-Shehri',
    entityType: 'rider',
    category: 'Assurance',
    reasonCode: 'captain_absence',
    priority: 'Critical',
    status: 'open',
    ownerId: 'USR-1',
    ownerName: 'Sarah Al-Rashid',
    createdAt: offsetFromNow({ hours: -1 }),
    slaDueAt: offsetFromNow({ minutes: 30 }),
    slaBreached: false,
    /* No conversation, and no channel. Nobody has spoken to this rider yet —
       which is exactly why `callLogs` is empty and the composer has to refuse
       in place rather than send a reply into the dark. */
    conversationId: null,
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
        sentAt: offsetFromNow({ hours: -1 }),
      },
    ],
  },
  {
    id: 'TKT-504',
    subject: 'App crashes when uploading Istemara registration',
    entityId: 'DRV-0104',
    entityName: 'Sultan Al-Harbi',
    entityType: 'driver',
    category: 'Technical',
    reasonCode: 'app_issue',
    priority: 'Medium',
    status: 'resolved',
    ownerId: 'USR-5',
    ownerName: 'Yousef Al-Balawi',
    createdAt: offsetFromNow({ days: -2 }),
    slaDueAt: null,
    slaBreached: false,
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    callLogs: [
      {
        id: 'CALL-03',
        outcome: 'waiting-on-customer',
        notes: 'Asked the captain to resend the registration photo under 5 MB.',
        loggedAt: offsetFromNow({ days: -2, hours: 1 }),
        loggedByUserId: 'USR-5',
        loggedByUserName: 'Yousef Al-Balawi',
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
        senderId: 'USR-5',
        senderName: 'Yousef Al-Balawi',
        senderType: 'agent',
        body: 'Received document via support channel and uploaded directly. Account is verified.',
        sentAt: offsetFromNow({ days: -1 }),
      },
    ],
  },
  /**
   * **The two states nothing else could reach.**
   *
   * `TKT-505` exists because two readings of this screen were unreachable
   * without hand-editing a fixture, and an unreachable state is an unbuilt one:
   *
   * 1. **An empty thread.** Every other ticket carries at least one message, so
   *    the conversation card's first-run empty state could never render. This
   *    one was raised by an operations event — a payout run refused a captain's
   *    bank details — and nobody has written to anybody about it yet.
   * 2. **`slaBreached: true`.** All four tickets above are `false`, so the whole
   *    breached reading of the SLA console was dead code. This one is a first
   *    reply that was owed six hours ago and has not been sent.
   *
   * It also has **no `channel` and no `conversationId`**, like `TKT-503`, which
   * is what makes the composer's refusal legible: there is nothing to reply
   * into, because nobody has opened a thread.
   *
   * `entityName` agrees with `riders.ts:95` exactly, so this row adds no new
   * finding to `clients/integrity.ts`; `TKT-504` is the seeded contradiction
   * that test is about.
   */
  {
    id: 'TKT-505',
    subject: 'Payout run refused the captain bank details on file',
    entityId: 'RDR-2031',
    entityName: 'Tariq Al-Saud',
    entityType: 'rider',
    category: 'Billing',
    reasonCode: 'payout_blocked',
    priority: 'High',
    status: 'open',
    ownerId: null,
    ownerName: null,
    createdAt: offsetFromNow({ hours: -10 }),
    slaDueAt: offsetFromNow({ hours: -6 }),
    slaBreached: true,
    conversationId: null,
    callLogs: [],
    messages: [],
  },
]
