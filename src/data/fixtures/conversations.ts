/**
 * Seeded conversations — **P5-T3**.
 *
 * There is **no legacy source for this resource**. `ContactCentreScreen` models
 * phone agents and a CPT table; `DB.tickets` has a thread with no channel on
 * it. So unlike every other fixture in this directory these rows are not
 * transcribed from `eyvar_ops_panel_v40_fixed.html` — they are constructed to
 * satisfy the states `types/conversation.ts` declares, and every field that
 * *could* have come from the legacy app (rider ids, captain ids, operator
 * names, the ticket ids) does.
 *
 * ## The states QA must reach without hand-editing this file
 *
 * | | Reached by |
 * |---|---|
 * | unassigned and waiting, oldest first | `CNV-101`, `CNV-104`, `CNV-107`, `CNV-110`, `CNV-112` |
 * | claimed by me (`USR-1`) | `CNV-102`, `CNV-105`, `CNV-108`, `CNV-111` |
 * | claimed by **another operator** | `CNV-103` (`USR-3`, fresh) |
 * | a claim gone **stale** past the 30-minute window | `CNV-112` (`USR-5`, idle 42 min) |
 * | every channel | chat · email · whatsapp · phone |
 * | every status | waiting · active · snoozed · closed |
 * | every delivery state | `queued` `CNV-105` · `sent` `CNV-105` · `delivered` `CNV-102` · `read` `CNV-105` · `failed` `CNV-104`, `CNV-110` |
 * | an internal note | `CNV-102`, `CNV-106`, `CNV-110` |
 * | a thread long enough to page | `CNV-108`, 64 messages |
 * | an empty conversation | `CNV-107`, zero messages |
 * | nowhere to send it | `CNV-110`, participant `handle: null` |
 * | a first-response breach | `CNV-104`, and under D22 also `CNV-101`, `CNV-103`, `CNV-107`, `CNV-112`, `CNV-114` |
 * | a **resolution** breach, with no first-response breach | `CNV-102` — **AC-964**, the row `Create ticket` promotes on |
 * | a deadline that has passed and is **not** a breach | `CNV-111` (snoozed, clock paused), `CNV-115` (closed before it fell due) |
 * | a countdown reading exactly zero | `CNV-109`, opened 24 h ago against a 24 h promise |
 * | a message that was **retried**, with the failure kept | `CNV-105` / `CMSG-1041` — `deliveryHistory` is non-empty |
 * | a chat customer reachable **by email too** | `CNV-101`, `CNV-102`, `CNV-108` — `Reply by email`'s *enabled* branch |
 * | a chat customer we have **never** had an address for | `CNV-103`, `CNV-112` — the `email` key is missing, not `null` |
 * | a name that breaks the column | `CNV-101` (41-char Arabic), `CNV-109` (66-char company) |
 *
 * ## The chat SLA, which used to be the thing not decided here
 *
 * **`DECISIONS.md` D22 decided it, and these rows now carry it.** Chat promises
 * **45 s** to answer and **20 min** to finish; email and WhatsApp promise **4 h**
 * and **24 h** — `T4.firstResponseMin` and `T2.resolveMin` from the shipped
 * `DB.slaPolicy` (`:14650`), reused rather than minted; `phone` promises nothing
 * and keeps `slaSource: 'unset'`, because call notes make no promise and that is
 * not the same fact as a promise of zero.
 *
 * The provenance is **`chat-policy`**, a fourth `SlaSource` member added for
 * this. It is not `legacy-policy`: nothing in the legacy app enforces 45
 * seconds, and a ruled number claiming a measured number's provenance is the
 * exact lie that field exists to prevent. Rows with a ticket behind them are
 * untouched and stay `legacy-reason-code` — D22: *'a conversation with a ticket
 * inherits that ticket's reason-code SLA and has no second clock.'*
 *
 * **Breach stays a stamp, never `slaDueAt < now`.** Three rows depend on the
 * difference and each is commented where it sits: `CNV-111` is snoozed, so its
 * passed deadline is a paused clock rather than a breach; `CNV-115` was closed
 * before its deadline fell, so it is merely old; `CNV-102` was answered five
 * minutes into a 45-second promise, which is `firstResponseAt >
 * firstResponseDueAt` — legacy's `frMissed` — and **not** a
 * `firstResponseBreachedAt` stamp, which is reserved for a window that closed
 * with nobody having responded at all.
 *
 * ## One thing deliberately not decided here
 *
 * **`RDR-1041` is Nora Al-Harbi, and this file now says so — F-8.**
 *
 * `CNV-104` used to name her *Mohammed Al-Ghamdi*, because `TKT-501` does and
 * the rule here was *"a conversation that is the thread of a ticket agrees
 * with its ticket"*. That rule chose the wrong authority. The **rider record**
 * is what a customer's name is — `fixtures/riders.ts` has held `Nora Al-Harbi`
 * throughout, the profile drawer resolves to it, and global search returns it —
 * so a ticket that disagrees is the row that is wrong, not the two screens that
 * agree with the profile.
 *
 * It also stopped being cosmetic. The defect is now **third-order**: the ticket
 * fixture, this conversation that copied it, and the pane that links to both.
 * Two support screens disagreeing about a customer's name *in front of that
 * customer* is the failure mode, and the product owner promoted it above the
 * stale-metric class of finding for exactly that reason.
 *
 * `fixtures/tickets.ts` now agrees: `TKT-501` names her Nora Al-Harbi, and
 * the integrity scanner's seeded contradiction moved to `TKT-504`.
 */

import { offsetFromNow } from '../mock/clock'
import {
  CHAT_FIRST_RESPONSE_SECONDS,
  CHAT_RESOLUTION_MINUTES,
  lastMessageAuthorKindOf,
  stampChatClocks,
} from '../types/conversation'
import type { Conversation, ConversationCloseReason, Message } from '../types/conversation'

/**
 * A hand-written row. `lastMessageAuthorKind` is derived from the messages by
 * `normaliseConversation` below, never typed by hand, so it cannot disagree
 * with the thread (CONTACT-CENTRE-REDESIGN-PLAN §4).
 */
type ConversationSeed = Omit<Conversation, 'lastMessageAuthorKind'>
import { cycle, cycleRef, refsOf, type FixtureRef } from './cycle'
import { driverFixtures } from './drivers'
import { riderFixtures } from './riders'

/* ────────────────────────────── CNV-101 ─────────────────────────────── */

const CNV_101_MESSAGES: Message[] = [
  {
    id: 'CMSG-1001',
    conversationId: 'CNV-101',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-4002',
    authorName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    authorKind: 'customer',
    body: 'السائق ألغى الرحلة بعد ما وصل الموقع وانا كنت واقفة تحت الشمس عشرين دقيقة. أبغى أعرف ليش انخصم مني رسوم إلغاء.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -47 }),
    attachments: [],
  },
  {
    id: 'CMSG-1002',
    conversationId: 'CNV-101',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-4002',
    authorName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    authorKind: 'customer',
    body: 'في أحد يرد؟',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -31 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-102 ─────────────────────────────── */

const CNV_102_MESSAGES: Message[] = [
  {
    id: 'CMSG-1010',
    conversationId: 'CNV-102',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-1041',
    authorName: 'Nora Al-Harbi',
    authorKind: 'customer',
    body: 'My subscription renewed this morning but the app still shows my old plan.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -22 }),
    attachments: [],
  },
  {
    /* The internal note. Never sent, never delivered, and the thing the whole
       `visibility` field exists to keep off the customer's screen. */
    id: 'CMSG-1011',
    conversationId: 'CNV-102',
    channel: 'chat',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'Billing shows the renewal posted at 06:02 but the plan swap job failed. Do not promise a refund — this is a display bug, not a double charge.',
    visibility: 'internal',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -19 }),
    attachments: [],
  },
  {
    id: 'CMSG-1012',
    conversationId: 'CNV-102',
    channel: 'chat',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'Thank you for waiting, Nora. Your renewal did go through this morning — the app is showing the old plan name and I have raised it. Nothing extra has been charged.',
    visibility: 'customer',
    delivery: {
      state: 'delivered',
      updatedAt: offsetFromNow({ minutes: -17 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -17 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-103 ─────────────────────────────── */

const CNV_103_MESSAGES: Message[] = [
  {
    id: 'CMSG-1020',
    conversationId: 'CNV-103',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-2087',
    authorName: 'Layla Al-Faraj',
    authorKind: 'customer',
    body: 'I left my daughter’s school bag in the car. Silver Camry, dropped me at Al Nakheel around 07:40.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -12 }),
    attachments: [
      {
        id: 'ATT-201',
        filename: 'bag.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1_482_113,
        url: null,
      },
    ],
  },
]

/* ────────────────────────────── CNV-104 ─────────────────────────────── */

const CNV_104_MESSAGES: Message[] = [
  {
    id: 'CMSG-1030',
    conversationId: 'CNV-104',
    channel: 'email',
    direction: 'inbound',
    authorId: 'RDR-1041',
    authorName: 'Nora Al-Harbi',
    authorKind: 'customer',
    body: 'I was charged 145 SAR for my morning commute which normally costs 85 SAR. The app showed 1.2x surge but the final charge was much higher. Please send me the fare breakdown.',
    visibility: 'customer',
    delivery: null,
    subject: 'Re: Fare calculation discrepancy on surge trip',
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -3 }),
    attachments: [],
  },
  {
    /* Bounced forty minutes after it was accepted. Rendered as "sent" by any
       console that does not read `delivery.state`, which is the defect. */
    id: 'CMSG-1031',
    conversationId: 'CNV-104',
    channel: 'email',
    direction: 'outbound',
    authorId: 'USR-3',
    authorName: 'Lina Al-Otaibi',
    authorKind: 'operator',
    body: 'Hello Nora, I have attached the fare breakdown for trip TRP-8841. The surge applied was 1.2x on the base fare only.',
    visibility: 'customer',
    delivery: {
      state: 'failed',
      updatedAt: offsetFromNow({ hours: -2, minutes: -20 }),
      failureCode: 'bounced',
      failureMessage: 'Mailbox full (552 5.2.2)',
      providerMessageId: null,
    },
    subject: 'Re: Fare calculation discrepancy on surge trip',
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -3, minutes: 0 }),
    attachments: [
      {
        id: 'ATT-202',
        filename: 'fare-breakdown-TRP-8841.pdf',
        contentType: 'application/pdf',
        sizeBytes: 84_220,
        url: null,
      },
    ],
  },
]

/* ────────────────────────────── CNV-105 ─────────────────────────────── */

const CNV_105_MESSAGES: Message[] = [
  {
    id: 'CMSG-1040',
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    direction: 'inbound',
    authorId: 'DRV-0104',
    authorName: 'Hassan Al-Ghamdi',
    authorKind: 'customer',
    body: 'التطبيق يطلع لي خطأ لما أرفع الاستمارة. جربت ثلاث مرات.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -40 }),
    attachments: [],
  },
  {
    /**
     * `read` — the customer opened it. **And the one message in the set that
     * was retried**, which is what makes a non-empty `deliveryHistory`
     * renderable without anybody having to press `Send again` first.
     *
     * The story is one message, two attempts: the gateway expired the first at
     * minute 37 and the operator pressed `Send again`; the retry landed and was
     * read a minute later. **One bubble, one `CMSG` id** — the customer
     * received this sentence once and a transcript that showed it twice would
     * be wrong about the conversation.
     *
     * The expiry is **not** rewritten. It sits in `deliveryHistory`, intact,
     * exactly as `clients/emails.ts` keeps a bounce when a resend supersedes
     * it: *'a resend is a new row — it does not mutate the failed delivery,
     * because the failed delivery is what happened.'*
     */
    id: 'CMSG-1041',
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'أرسل لي صورة الاستمارة هنا وأنا أرفعها لك يدوياً.',
    visibility: 'customer',
    delivery: {
      state: 'read',
      updatedAt: offsetFromNow({ minutes: -36 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    deliveryHistory: [
      {
        state: 'failed',
        updatedAt: offsetFromNow({ minutes: -37 }),
        failureCode: 'expired',
        failureMessage: 'The message expired before the handset came online',
        providerMessageId: null,
      },
    ],
    subject: null,
    sentAt: offsetFromNow({ minutes: -38 }),
    attachments: [],
  },
  {
    /* `sent` — the gateway has it, the handset has not confirmed. */
    id: 'CMSG-1042',
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'وصلتني الصورة، جاري الرفع.',
    visibility: 'customer',
    delivery: {
      state: 'sent',
      updatedAt: offsetFromNow({ minutes: -6 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -6 }),
    attachments: [],
  },
  {
    /* `queued` — accepted by us, not yet handed over. A console must show this
       as pending and must not let the operator believe it was sent. */
    id: 'CMSG-1043',
    conversationId: 'CNV-105',
    channel: 'whatsapp',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'تم رفع الاستمارة والحساب صار موثق.',
    visibility: 'customer',
    delivery: {
      state: 'queued',
      updatedAt: offsetFromNow({ minutes: -1 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -1 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-106 ─────────────────────────────── */

const CNV_106_MESSAGES: Message[] = [
  {
    /* A phone conversation has no customer-visible message at all. The thread
       *is* the call notes, and every one of them is internal. A renderer that
       assumes at least one customer message renders nothing here. */
    id: 'CMSG-1050',
    conversationId: 'CNV-106',
    channel: 'phone',
    direction: 'outbound',
    authorId: 'USR-3',
    authorName: 'Lina Al-Otaibi',
    authorKind: 'operator',
    body: 'Outbound call, 4m12s. Confirmed the captain returned the briefcase to the Olaya office at 13:40. Rider collecting after 17:00.',
    visibility: 'internal',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ days: -1, hours: -3 }),
    attachments: [],
  },
  {
    id: 'CMSG-1051',
    conversationId: 'CNV-106',
    channel: 'phone',
    direction: 'outbound',
    authorId: 'USR-3',
    authorName: 'Lina Al-Otaibi',
    authorKind: 'operator',
    body: 'Rider called back to confirm collection. Closing.',
    visibility: 'internal',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ days: -1, hours: -1 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-109 ─────────────────────────────── */

const CNV_109_MESSAGES: Message[] = [
  {
    /* Operator-initiated: the first message is outbound. A thread renderer that
       assumes the customer speaks first puts this on the wrong side. */
    id: 'CMSG-1060',
    conversationId: 'CNV-109',
    channel: 'email',
    direction: 'outbound',
    authorId: 'USR-2',
    authorName: 'Fahad Al-Dosari',
    authorKind: 'operator',
    body: 'Dear Ms Al-Otaibi, your June invoice is ready and covers 412 employee trips. The monthly cap was reached on the 22nd; eleven trips after that were declined at booking.',
    visibility: 'customer',
    delivery: {
      state: 'read',
      updatedAt: offsetFromNow({ hours: -20 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: 'June invoice and monthly cap — Saudi Arabian Advanced Petrochemical Manufacturing Company Limited',
    deliveryHistory: [],
    sentAt: offsetFromNow({ days: -1 }),
    attachments: [],
  },
  {
    id: 'CMSG-1061',
    conversationId: 'CNV-109',
    channel: 'email',
    direction: 'inbound',
    authorId: 'CORP-002',
    authorName: 'نورة بنت عبد الرحمن آل الشيخ',
    authorKind: 'customer',
    body: 'Please raise the cap to 35,000 SAR from July and send the amended agreement to finance@sapmc.example.',
    visibility: 'customer',
    delivery: null,
    subject: 'June invoice and monthly cap — Saudi Arabian Advanced Petrochemical Manufacturing Company Limited',
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -19 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-110 ─────────────────────────────── */

const CNV_110_MESSAGES: Message[] = [
  {
    id: 'CMSG-1070',
    conversationId: 'CNV-110',
    channel: 'email',
    direction: 'outbound',
    authorId: 'USR-5',
    authorName: 'Yousef Al-Balawi',
    authorKind: 'operator',
    body: 'Following up on your refund request — could you confirm the last four digits of the card?',
    visibility: 'customer',
    delivery: {
      /* There is no address on file. It was never going anywhere, and the
         console should have refused the send rather than queued it. */
      state: 'failed',
      updatedAt: offsetFromNow({ minutes: -18 }),
      failureCode: 'no_handle',
      failureMessage: 'No email address on file for this rider',
      providerMessageId: null,
    },
    subject: 'Refund request — card ending unknown',
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -18 }),
    attachments: [],
  },
  {
    id: 'CMSG-1071',
    conversationId: 'CNV-110',
    channel: 'email',
    direction: 'outbound',
    authorId: 'USR-5',
    authorName: 'Yousef Al-Balawi',
    authorKind: 'operator',
    body: 'No email on the account. Ask ops to call him on the number in the profile instead.',
    visibility: 'internal',
    delivery: null,
    subject: 'Refund request — card ending unknown',
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -17 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-111 ─────────────────────────────── */

const CNV_111_MESSAGES: Message[] = [
  {
    id: 'CMSG-1080',
    conversationId: 'CNV-111',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-1075',
    authorName: 'Sara Al-Ghamdi',
    authorKind: 'customer',
    body: 'I will send the bank letter tomorrow morning once the branch opens.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -4 }),
    attachments: [],
  },
  {
    id: 'CMSG-1081',
    conversationId: 'CNV-111',
    channel: 'chat',
    direction: 'outbound',
    authorId: 'USR-1',
    authorName: 'Sarah Al-Rashid',
    authorKind: 'operator',
    body: 'Perfect — I will keep this open until then.',
    visibility: 'customer',
    delivery: {
      state: 'read',
      updatedAt: offsetFromNow({ hours: -4 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -4 }),
    attachments: [],
  },
]

/* ────────────────────────────── CNV-112 ─────────────────────────────── */

const CNV_112_MESSAGES: Message[] = [
  {
    id: 'CMSG-1090',
    conversationId: 'CNV-112',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-2090',
    authorName: 'Hessa Al-Mutlaq',
    authorKind: 'customer',
    body: 'The captain asked me to cancel so he would not get a penalty. I do not want to be charged for that.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: -31 }),
    attachments: [],
  },
]

/* ─────────────────── CNV-108: the thread that pages ─────────────────── */

/**
 * 64 messages, alternating, so `messages` (the last page) is not the thread and
 * a screen that renders `messages.length` as the count is visibly wrong.
 *
 * Built rather than typed out, exactly as `fillerDrivers` (`fixtures/drivers.ts:706`)
 * is: the point of these rows is their *number*, and sixty-four hand-written
 * literals would bury the eleven rows that carry meaning. Nothing here is
 * random — index arithmetic against the fixed clock, and two runs are
 * byte-identical.
 */
const CNV_108_TOTAL = 64
const CNV_108_PAGE = 25

const CNV_108_ALL: Message[] = Array.from({ length: CNV_108_TOTAL }, (_, i): Message => {
  const inbound = i % 2 === 0
  const minutesAgo = -(CNV_108_TOTAL - i) * 3
  return {
    id: `CMSG-8${String(100 + i)}`,
    conversationId: 'CNV-108',
    channel: 'chat',
    direction: inbound ? 'inbound' : 'outbound',
    authorId: inbound ? 'RDR-1080' : 'USR-1',
    authorName: inbound ? 'Mohammed Al-Qahtani' : 'Sarah Al-Rashid',
    authorKind: inbound ? 'customer' : 'operator',
    body: inbound
      ? `Message ${i + 1}: the driver still has not accepted, this is the ${i + 1}th time I am asking.`
      : `Message ${i + 1}: thank you for your patience — I am checking dispatch again now.`,
    visibility: 'customer',
    delivery: inbound
      ? null
      : {
          state: 'read',
          updatedAt: offsetFromNow({ minutes: minutesAgo + 1 }),
          failureCode: null,
          failureMessage: null,
          providerMessageId: null,
        },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ minutes: minutesAgo }),
    attachments: [],
  }
})

/** Every message of `CNV-108`, for `listConversationMessages` to page over. */
export const CNV_108_MESSAGES: readonly Message[] = CNV_108_ALL

const CNV_113_MESSAGES: Message[] = [
  {
    id: 'CMSG-1301',
    conversationId: 'CNV-113',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-1048',
    authorName: 'Maryam Al-Anazi',
    authorKind: 'customer',
    body: 'I have not used my plan in weeks and I want to know if it is still charging me.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -30 }),
    attachments: [],
  },
  {
    id: 'CMSG-1302',
    conversationId: 'CNV-113',
    channel: 'chat',
    direction: 'outbound',
    authorId: 'USR-3',
    authorName: 'Lina Al-Otaibi',
    authorKind: 'operator',
    body: 'It expired on 8 June and nothing has been charged since. Would you like me to check the last invoice with you?',
    visibility: 'customer',
    delivery: {
      state: 'read',
      updatedAt: offsetFromNow({ hours: -29 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -29 }),
    attachments: [],
  },
  {
    id: 'CMSG-1303',
    conversationId: 'CNV-113',
    channel: 'chat',
    direction: 'outbound',
    authorId: 'USR-3',
    authorName: 'Lina Al-Otaibi',
    authorKind: 'operator',
    /* Delivered and read, and still unanswered. `read` is the state that makes
       `no-response` a fact rather than a guess: she saw it and did not reply. */
    body: 'Are you still there? I will leave this open for a little while.',
    visibility: 'customer',
    delivery: {
      state: 'read',
      updatedAt: offsetFromNow({ hours: -26 }),
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -26 }),
    attachments: [],
  },
]

const CNV_114_MESSAGES: Message[] = [
  {
    id: 'CMSG-1401',
    conversationId: 'CNV-114',
    channel: 'chat',
    direction: 'inbound',
    authorId: 'RDR-1049',
    authorName: 'Ali Al-Balawi',
    authorKind: 'customer',
    body: 'Still waiting on the refund I asked about earlier today.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -6 }),
    attachments: [],
  },
  {
    id: 'CMSG-1402',
    conversationId: 'CNV-114',
    channel: 'chat',
    /**
     * **The system message.** `authorId` is `null` — a transport notice has no
     * identity to attribute, and the type makes that explicit rather than
     * leaving a renderer to print `undefined` the way legacy's safety list does
     * with a missing reporter (`:13432`).
     *
     * `inbound` and `visibility: 'customer'`, so `delivery` is `null`: it
     * arrived here, we did not send it, and a delivery tick on it would be a
     * fabricated fact.
     */
    direction: 'inbound',
    authorId: null,
    authorName: 'Chat gateway',
    authorKind: 'system',
    body: 'The customer left the chat.',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ hours: -5 }),
    attachments: [],
  },
]

const CNV_115_MESSAGES: Message[] = [
  {
    id: 'CMSG-1501',
    conversationId: 'CNV-115',
    channel: 'whatsapp',
    direction: 'inbound',
    authorId: 'RDR-1045',
    authorName: 'Youssef Abdelrahman El-Sayed Farag',
    authorKind: 'customer',
    /* Right-to-left content in a thread whose other rows are Latin. The one
       message in the set that nobody should answer. */
    body: 'عروض تمويل فوري بدون كفيل — تواصل معنا الآن',
    visibility: 'customer',
    delivery: null,
    subject: null,
    deliveryHistory: [],
    sentAt: offsetFromNow({ days: -2 }),
    attachments: [],
  },
]

/* ──────────────────────────── the rows ──────────────────────────────── */

const namedConversations: ConversationSeed[] = [
  {
    id: 'CNV-101',
    channel: 'chat',
    status: 'waiting',
    subject: null,
    entityId: 'RDR-4002',
    entityType: 'rider',
    entityName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    participants: [
      {
        id: 'RDR-4002',
        name: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-9f31',
        /* **Reachable on chat AND on email.** Until this row existed, no
           seeded chat participant carried an `email` key, so `Reply by email`
           — the control D19 invented the whole channel switch for — could only
           ever render its refusal. The enabled branch had never executed.

           An RTL row on purpose: the address is Latin inside an Arabic name's
           bubble, which is the bidi case the composer has to get right. */
        handles: { chat: 'web-session-9f31', email: 'aljawharah.alotaibi@example.com' },
        joinedAt: offsetFromNow({ minutes: -47 }),
        leftAt: null,
      },
    ],
    messages: CNV_101_MESSAGES,
    messageCount: CNV_101_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -31 }),
    lastMessagePreview: 'في أحد يرد؟',
    waitingSince: offsetFromNow({ minutes: -47 }),
    unreadCount: 2,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -47 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: null,
    /* **D22 - the chat promise, now that there is one.** 45 s to answer,
       20 min to finish, and the provenance is `chat-policy` because a ruling
       made these numbers and nothing in the legacy app enforces them.

       Forty-seven minutes unanswered, so **both** clocks broke. The first
       response broke at second 46 and nobody has responded since, which is what
       `firstResponseBreachedAt` is stamped for - *'only when the window closed
       with nobody having responded'*. It is the row that carries the R5a marker
       and sorts above everything (**AC-963**). */
    slaStartedAt: offsetFromNow({ minutes: -47 }),
    slaDueAt: offsetFromNow({ minutes: -27 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ minutes: -27 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -47, seconds: 45 }),
    firstResponseAt: null,
    firstResponseBreachedAt: offsetFromNow({ minutes: -47, seconds: 45 }),
  },

  {
    id: 'CNV-102',
    channel: 'chat',
    status: 'active',
    subject: null,
    entityId: 'RDR-1041',
    entityType: 'rider',
    entityName: 'Nora Al-Harbi',
    participants: [
      {
        id: 'RDR-1041',
        name: 'Nora Al-Harbi',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-2c07',
        /* The second chat with an email address, and the one the escalation
           story is actually about: an active chat the signed-in operator holds,
           where `Reply by email` is enabled and pressing it stamps
           `message.channel = 'email'` on a conversation whose own `channel`
           stays `chat`. Two rows, so the console can test choosing between
           channels rather than only the one that is offered. */
        handles: { chat: 'web-session-2c07', email: 'nora.alharbi@example.com' },
        joinedAt: offsetFromNow({ minutes: -22 }),
        leftAt: null,
      },
      {
        id: 'USR-1',
        name: 'Sarah Al-Rashid',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ minutes: -20 }),
        leftAt: null,
      },
    ],
    messages: CNV_102_MESSAGES,
    messageCount: CNV_102_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -17 }),
    /* The preview skips `CMSG-1011`. An internal note must never be the line
       an operator screen-shares. */
    lastMessagePreview:
      'Thank you for waiting, Nora. Your renewal did go through this morning — the app is showing the old plan name and I have raised it. Nothing extra has been charged.',
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -22 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-102',
      entityType: 'conversation',
      entityId: 'CNV-102',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: offsetFromNow({ minutes: -20 }),
      touchedAt: offsetFromNow({ minutes: -17 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* **AC-964 - the resolution breach, and the only row that is one without
       also being a first-response breach.** Twenty-two minutes of live chat, so
       the twenty-minute promise broke two minutes ago; `Create ticket` becomes
       the pane's primary and **the row does not move in the queue**.

       `firstResponseBreachedAt` stays `null` even though she waited five
       minutes for an answer against a 45-second promise. That is the
       `types/workQueue.ts` rule and not an oversight: a late-but-real response
       is `firstResponseAt > firstResponseDueAt`, which is legacy's separate
       `frMissed`. One failure already stopped happening; the other is still
       happening. Collapsing them loses the difference. */
    slaStartedAt: offsetFromNow({ minutes: -22 }),
    slaDueAt: offsetFromNow({ minutes: -2 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ minutes: -2 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -22, seconds: 45 }),
    firstResponseAt: offsetFromNow({ minutes: -17 }),
    firstResponseBreachedAt: null,
  },

  {
    /* Held by another operator, fresh (idle 4 min < the 30-minute window). The
       take-over affordance §8.4 exists for, on a chat. */
    id: 'CNV-103',
    channel: 'chat',
    status: 'waiting',
    subject: null,
    entityId: 'RDR-2087',
    entityType: 'rider',
    entityName: 'Layla Al-Faraj',
    participants: [
      {
        id: 'RDR-2087',
        name: 'Layla Al-Faraj',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-51ba',
        /* **Chat only, and deliberately.** The `email` key is *missing*, not
           `null`: we have never learned an address for her. `CNV-110` is the
           other absence — key present, value `null`, meaning we looked and
           there is none. The console collapses the two into one refusal
           sentence today (§8.6.5); the distinction stays here so a second
           sentence costs one branch and not a migration. */
        handles: { chat: 'web-session-51ba' },
        joinedAt: offsetFromNow({ minutes: -12 }),
        leftAt: null,
      },
      {
        id: 'USR-3',
        name: 'Lina Al-Otaibi',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ minutes: -11 }),
        leftAt: null,
      },
    ],
    messages: CNV_103_MESSAGES,
    messageCount: CNV_103_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -12 }),
    lastMessagePreview:
      'I left my daughter’s school bag in the car. Silver Camry, dropped me at Al Nakheel around 07:40.',
    waitingSince: offsetFromNow({ minutes: -12 }),
    unreadCount: 1,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -12 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-103',
      entityType: 'conversation',
      entityId: 'CNV-103',
      ownerId: 'USR-3',
      ownerName: 'Lina Al-Otaibi',
      claimedAt: offsetFromNow({ minutes: -11 }),
      touchedAt: offsetFromNow({ minutes: -4 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* **The clean AC-963 row: first-response breached, resolution still
       inside its window** (eight minutes left). D22's two breaches do different
       things and this is the row that proves they are separable - it carries
       the R5a marker and sorts first, and `Create ticket` is *not* promoted. */
    slaStartedAt: offsetFromNow({ minutes: -12 }),
    slaDueAt: offsetFromNow({ minutes: 8 }),
    slaTargetMinutes: 20,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -12, seconds: 45 }),
    firstResponseAt: null,
    firstResponseBreachedAt: offsetFromNow({ minutes: -12, seconds: 45 }),
  },

  {
    /* The thread of `TKT-501`, on email. The only rows with a clock are the
       rows with a ticket, and the clock is the ticket's reason-code SLA. This
       one has **breached its first-response promise**: nobody answered inside
       the window and the customer is still waiting. */
    id: 'CNV-104',
    channel: 'email',
    status: 'waiting',
    subject: 'Re: Fare calculation discrepancy on surge trip',
    entityId: 'RDR-1041',
    entityType: 'rider',
    entityName: 'Nora Al-Harbi',
    participants: [
      {
        id: 'RDR-1041',
        name: 'Nora Al-Harbi',
        kind: 'customer',
        entityType: 'rider',
        handle: 'n.alharbi@example.com',
        handles: { email: 'n.alharbi@example.com' },
        joinedAt: offsetFromNow({ hours: -3 }),
        leftAt: null,
      },
      {
        id: 'USR-3',
        name: 'Lina Al-Otaibi',
        kind: 'operator',
        entityType: null,
        handle: 'support@eyvar.com',
        handles: { email: 'support@eyvar.com' },
        joinedAt: offsetFromNow({ hours: -3 }),
        leftAt: offsetFromNow({ hours: -2 }),
      },
    ],
    messages: CNV_104_MESSAGES,
    messageCount: CNV_104_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -3 }),
    lastMessagePreview:
      'Hello Nora, I have attached the fare breakdown for trip TRP-8841. The surge applied was 1.2x on the base fare only.',
    waitingSince: offsetFromNow({ hours: -3 }),
    unreadCount: 1,
    ticketId: 'TKT-501',
    createdAt: offsetFromNow({ hours: -3 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: null,
    slaStartedAt: offsetFromNow({ hours: -3 }),
    slaDueAt: offsetFromNow({ hours: 2 }),
    slaTargetMinutes: 300,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: offsetFromNow({ hours: -1 }),
    firstResponseAt: null,
    /* The reply that *was* sent bounced, so nobody has responded. Stamped, and
       never cleared — "resolved, but late" has to stay visible. */
    firstResponseBreachedAt: offsetFromNow({ hours: -1 }),
  },

  {
    id: 'CNV-105',
    channel: 'whatsapp',
    status: 'active',
    subject: null,
    entityId: 'DRV-0104',
    entityType: 'driver',
    entityName: 'Hassan Al-Ghamdi',
    participants: [
      {
        id: 'DRV-0104',
        name: 'Hassan Al-Ghamdi',
        kind: 'customer',
        entityType: 'driver',
        handle: '+966 55 402 1188',
        handles: { whatsapp: '+966 55 402 1188' },
        joinedAt: offsetFromNow({ minutes: -40 }),
        leftAt: null,
      },
      {
        id: 'USR-1',
        name: 'Sarah Al-Rashid',
        kind: 'operator',
        entityType: null,
        handle: '+966 92 000 1234',
        handles: { whatsapp: '+966 92 000 1234' },
        joinedAt: offsetFromNow({ minutes: -39 }),
        leftAt: null,
      },
    ],
    messages: CNV_105_MESSAGES,
    messageCount: CNV_105_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -1 }),
    lastMessagePreview: 'تم رفع الاستمارة والحساب صار موثق.',
    waitingSince: null,
    unreadCount: 0,
    ticketId: 'TKT-504',
    createdAt: offsetFromNow({ minutes: -40 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-105',
      entityType: 'conversation',
      entityId: 'CNV-105',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: offsetFromNow({ minutes: -39 }),
      touchedAt: offsetFromNow({ minutes: -1 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: offsetFromNow({ minutes: -40 }),
    slaDueAt: offsetFromNow({ hours: 7, minutes: 20 }),
    slaTargetMinutes: 480,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: offsetFromNow({ minutes: -10 }),
    firstResponseAt: offsetFromNow({ minutes: -38 }),
    firstResponseBreachedAt: null,
  },

  {
    id: 'CNV-106',
    channel: 'phone',
    status: 'closed',
    subject: null,
    entityId: 'RDR-2031',
    entityType: 'rider',
    entityName: 'Tariq Al-Saud',
    participants: [
      {
        id: 'RDR-2031',
        name: 'Tariq Al-Saud',
        kind: 'customer',
        entityType: 'rider',
        handle: '+966 50 771 9002',
        handles: { phone: '+966 50 771 9002' },
        joinedAt: offsetFromNow({ days: -1, hours: -3 }),
        leftAt: offsetFromNow({ days: -1, hours: -1 }),
      },
      {
        id: 'USR-3',
        name: 'Lina Al-Otaibi',
        kind: 'operator',
        entityType: null,
        handle: '+966 92 000 1234',
        handles: { phone: '+966 92 000 1234' },
        joinedAt: offsetFromNow({ days: -1, hours: -3 }),
        leftAt: offsetFromNow({ days: -1, hours: -1 }),
      },
    ],
    messages: CNV_106_MESSAGES,
    messageCount: CNV_106_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ days: -1, hours: -1 }),
    /* Every message is internal, so there is no preview. `null`, not the note. */
    lastMessagePreview: null,
    waitingSince: null,
    unreadCount: 0,
    ticketId: 'TKT-502',
    createdAt: offsetFromNow({ days: -1, hours: -3 }),
    snoozedUntil: null,
    closedAt: offsetFromNow({ days: -1, hours: -1 }),
    closeReason: 'resolved',
    claim: {
      key: 'conversation:CNV-106',
      entityType: 'conversation',
      entityId: 'CNV-106',
      ownerId: 'USR-3',
      ownerName: 'Lina Al-Otaibi',
      claimedAt: offsetFromNow({ days: -1, hours: -3 }),
      touchedAt: offsetFromNow({ days: -1, hours: -1 }),
      state: 'done',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: offsetFromNow({ days: -1, hours: -3 }),
    firstResponseBreachedAt: null,
  },

  {
    /* **Empty.** A rider opened the chat widget and typed nothing. `messages`
       is `[]`, `lastMessageAt` is `null`, and the queue still has to show the
       row — this is `empty-because-nothing-has-happened`, not
       `empty-because-a-filter-matched-nothing`. */
    id: 'CNV-107',
    channel: 'chat',
    status: 'waiting',
    subject: null,
    entityId: 'RDR-1060',
    entityType: 'rider',
    entityName: 'Khaled Al-Zahrani',
    participants: [
      {
        id: 'RDR-1060',
        name: 'Khaled Al-Zahrani',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-77e2',
        handles: { chat: 'web-session-77e2', email: 'm.alqahtani@example.com' },
        joinedAt: offsetFromNow({ minutes: -6 }),
        leftAt: null,
      },
    ],
    messages: [],
    messageCount: 0,
    hasMoreBefore: false,
    lastMessageAt: null,
    lastMessagePreview: null,
    waitingSince: offsetFromNow({ minutes: -6 }),
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -6 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: null,
    /* A chat with **no messages at all** and a broken first-response promise.
       Six minutes is a long time against 45 seconds, and the clock runs from
       `createdAt` rather than from a first message - which is the only way this
       row can have a clock, because it has no message to start one. */
    slaStartedAt: offsetFromNow({ minutes: -6 }),
    slaDueAt: offsetFromNow({ minutes: 14 }),
    slaTargetMinutes: 20,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -6, seconds: 45 }),
    firstResponseAt: null,
    firstResponseBreachedAt: offsetFromNow({ minutes: -6, seconds: 45 }),
  },

  {
    /* 64 messages, of which `messages` holds the last 25. */
    id: 'CNV-108',
    channel: 'chat',
    status: 'active',
    subject: null,
    entityId: 'RDR-1080',
    entityType: 'rider',
    entityName: 'Mohammed Al-Qahtani',
    participants: [
      {
        id: 'RDR-1080',
        name: 'Mohammed Al-Qahtani',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-3d40',
        handles: { chat: 'web-session-3d40' },
        joinedAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 }),
        leftAt: null,
      },
      {
        id: 'USR-1',
        name: 'Sarah Al-Rashid',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 + 3 }),
        leftAt: null,
      },
    ],
    messages: CNV_108_ALL.slice(-CNV_108_PAGE),
    messageCount: CNV_108_TOTAL,
    hasMoreBefore: true,
    lastMessageAt: offsetFromNow({ minutes: -3 }),
    lastMessagePreview: `Message ${CNV_108_TOTAL}: thank you for your patience — I am checking dispatch again now.`,
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-108',
      entityType: 'conversation',
      entityId: 'CNV-108',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 + 3 }),
      touchedAt: offsetFromNow({ minutes: -3 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* Three hours of live chat. Answered inside three minutes - late against
       45 seconds, so no first-response stamp - and long past the twenty-minute
       resolution promise. Derived from `CNV_108_TOTAL` like every other clock
       on this row, so changing the thread length cannot leave the SLA behind. */
    slaStartedAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 }),
    slaDueAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 + 20 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 + 20 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3, seconds: 45 }),
    firstResponseAt: offsetFromNow({ minutes: -CNV_108_TOTAL * 3 + 3 }),
    firstResponseBreachedAt: null,
  },

  {
    /* A corporate contact, on email, started by us. 66-character company name
       and a 34-character Arabic contact name — the row the column does not
       fit, on the channel with a subject line. */
    id: 'CNV-109',
    channel: 'email',
    status: 'active',
    subject: 'June invoice and monthly cap — Saudi Arabian Advanced Petrochemical Manufacturing Company Limited',
    entityId: 'CORP-002',
    entityType: 'corporate-account',
    entityName: 'Saudi Arabian Advanced Petrochemical Manufacturing Company Limited',
    participants: [
      {
        id: 'CORP-002',
        name: 'نورة بنت عبد الرحمن آل الشيخ',
        kind: 'customer',
        entityType: 'corporate-account',
        handle: 'noura.alshaikh@sapmc.example',
        handles: { email: 'noura.alshaikh@sapmc.example' },
        joinedAt: offsetFromNow({ days: -1 }),
        leftAt: null,
      },
      {
        id: 'USR-2',
        name: 'Fahad Al-Dosari',
        kind: 'operator',
        entityType: null,
        handle: 'billing@eyvar.com',
        handles: { email: 'billing@eyvar.com' },
        joinedAt: offsetFromNow({ days: -1 }),
        leftAt: null,
      },
    ],
    messages: CNV_109_MESSAGES,
    messageCount: CNV_109_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -19 }),
    lastMessagePreview:
      'Please raise the cap to 35,000 SAR from July and send the amended agreement to finance@sapmc.example.',
    waitingSince: offsetFromNow({ hours: -19 }),
    unreadCount: 1,
    ticketId: null,
    createdAt: offsetFromNow({ days: -1 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-109',
      entityType: 'conversation',
      entityId: 'CNV-109',
      ownerId: 'USR-2',
      ownerName: 'Fahad Al-Dosari',
      claimedAt: offsetFromNow({ days: -1 }),
      touchedAt: offsetFromNow({ hours: -19 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* **Email: 4 h and 24 h** - D22, and neither number is invented. They are
       `T4.firstResponseMin` and `T2.resolveMin` from the shipped `DB.slaPolicy`
       (`eyvar_ops_panel_v40_fixed.html:14650`), reused for a channel with no
       live customer rather than minted.

       Opened exactly twenty-four hours ago, so `slaDueAt` is **this instant**:
       a countdown reading zero, neither breached nor running. Nothing else in
       the set reaches it and it is the state an off-by-one in a comparison
       flips. */
    slaStartedAt: offsetFromNow({ days: -1 }),
    slaDueAt: offsetFromNow({ days: -1, hours: 24 }),
    slaTargetMinutes: 1_440,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ days: -1, hours: 4 }),
    firstResponseAt: offsetFromNow({ days: -1 }),
    firstResponseBreachedAt: null,
  },

  {
    /* Nowhere to send it: the customer participant has `handle: null`. The
       console must refuse the compose, and the one message that was sent
       anyway carries `failureCode: 'no_handle'`. */
    id: 'CNV-110',
    channel: 'email',
    status: 'waiting',
    subject: 'Refund request — card ending unknown',
    entityId: 'RDR-2055',
    entityType: 'rider',
    entityName: 'Bandar Al-Harbi',
    participants: [
      {
        id: 'RDR-2055',
        name: 'Bandar Al-Harbi',
        kind: 'customer',
        entityType: 'rider',
        handle: null,
        handles: { email: null },
        joinedAt: offsetFromNow({ minutes: -19 }),
        leftAt: null,
      },
      {
        id: 'USR-5',
        name: 'Yousef Al-Balawi',
        kind: 'operator',
        entityType: null,
        handle: 'support@eyvar.com',
        handles: { email: 'support@eyvar.com' },
        joinedAt: offsetFromNow({ minutes: -19 }),
        leftAt: null,
      },
    ],
    messages: CNV_110_MESSAGES,
    messageCount: CNV_110_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -17 }),
    lastMessagePreview:
      'Following up on your refund request — could you confirm the last four digits of the card?',
    waitingSince: offsetFromNow({ minutes: -19 }),
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -19 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: null,
    /* Nineteen minutes into a four-hour promise. Unanswered and **not** late:
       the row whose send will fail for `no_handle` is not also a breach, and
       conflating 'we cannot reach her' with 'we were slow' would hide the first
       behind the second. */
    slaStartedAt: offsetFromNow({ minutes: -19 }),
    slaDueAt: offsetFromNow({ minutes: -19, hours: 24 }),
    slaTargetMinutes: 1_440,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -19, hours: 4 }),
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },

  {
    id: 'CNV-111',
    channel: 'chat',
    status: 'snoozed',
    subject: null,
    entityId: 'RDR-1075',
    entityType: 'rider',
    entityName: 'Sara Al-Ghamdi',
    participants: [
      {
        id: 'RDR-1075',
        name: 'Sara Al-Ghamdi',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-6b18',
        handles: { chat: 'web-session-6b18' },
        joinedAt: offsetFromNow({ hours: -4 }),
        /* Closed the tab. A live-chat console that assumes the customer is
           still there types into nothing. */
        leftAt: offsetFromNow({ hours: -4 }),
      },
      {
        id: 'USR-1',
        name: 'Sarah Al-Rashid',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ hours: -4 }),
        leftAt: null,
      },
    ],
    messages: CNV_111_MESSAGES,
    messageCount: CNV_111_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -4 }),
    lastMessagePreview: 'Perfect — I will keep this open until then.',
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ hours: -4 }),
    snoozedUntil: offsetFromNow({ hours: 22 }),
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-111',
      entityType: 'conversation',
      entityId: 'CNV-111',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: offsetFromNow({ hours: -4 }),
      touchedAt: offsetFromNow({ hours: -4 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* **Snoozed, and therefore not breached - D22: *'both clocks pause on
       `snoozed`'*.** `slaDueAt` passed three hours and forty minutes ago and
       `slaBreachedAt` is deliberately `null`: the operator parked this until
       tomorrow morning, and a countdown running against a decision they already
       made is a false breach. The stored deadline stays so the clock resumes
       from a real number when it un-snoozes; the *pause* is a fact about
       `status`, read at render time, not a second stored field to fall out of
       step. */
    slaStartedAt: offsetFromNow({ hours: -4 }),
    slaDueAt: offsetFromNow({ hours: -4, minutes: 20 }),
    slaTargetMinutes: 20,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ hours: -4, seconds: 45 }),
    firstResponseAt: offsetFromNow({ hours: -4 }),
    firstResponseBreachedAt: null,
  },

  {
    /* Claimed by `USR-5` but idle 42 minutes — past `OWNERSHIP_STALE_MINUTES`
       (30). `liveClaim` treats it as free, so `claim` is non-null and the row
       is claimable anyway. Whether the UI *shows* it as held is the same
       undecided product question `fixtures/claims.ts` records as D-L12. */
    id: 'CNV-112',
    channel: 'chat',
    status: 'waiting',
    subject: null,
    entityId: 'RDR-2090',
    entityType: 'rider',
    entityName: 'Hessa Al-Mutlaq',
    participants: [
      {
        id: 'RDR-2090',
        name: 'Hessa Al-Mutlaq',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-08cd',
        handles: { chat: 'web-session-08cd' },
        joinedAt: offsetFromNow({ minutes: -31 }),
        leftAt: null,
      },
      {
        id: 'USR-5',
        name: 'Yousef Al-Balawi',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ minutes: -50 }),
        leftAt: null,
      },
    ],
    messages: CNV_112_MESSAGES,
    messageCount: CNV_112_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ minutes: -31 }),
    lastMessagePreview:
      'The captain asked me to cancel so he would not get a penalty. I do not want to be charged for that.',
    waitingSince: offsetFromNow({ minutes: -31 }),
    unreadCount: 1,
    ticketId: null,
    createdAt: offsetFromNow({ minutes: -50 }),
    snoozedUntil: null,
    closedAt: null,
    closeReason: null,
    claim: {
      key: 'conversation:CNV-112',
      entityType: 'conversation',
      entityId: 'CNV-112',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: offsetFromNow({ minutes: -50 }),
      touchedAt: offsetFromNow({ minutes: -42 }),
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    /* Breached on both clocks **and** held by a claim that went stale eight
       minutes ago. This is the row D22's reordering clause was written for: a
       conversation that changes hands keeps its `waitingSince`, so ordering on
       the clock alone would let it sink beneath fresher rows. The breach flag
       is what floats it. */
    slaStartedAt: offsetFromNow({ minutes: -50 }),
    slaDueAt: offsetFromNow({ minutes: -30 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ minutes: -30 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ minutes: -50, seconds: 45 }),
    firstResponseAt: null,
    firstResponseBreachedAt: offsetFromNow({ minutes: -50, seconds: 45 }),
  },

  /* ── the three close reasons nothing reached ─────────────────────────── */
  {
    /**
     * **`no-response` — closed because the customer stopped answering.**
     *
     * `ConversationCloseReason` has four members and `resolved` was the only
     * one any row carried, so the close dialog offered three options that had
     * never been seen on a row and the `closed` view could not be filtered by
     * outcome at all.
     *
     * This is the most common non-resolution in a chat queue and the one that
     * matters most to get right: the operator answered, twice, and the customer
     * had gone. Nothing was fixed and nothing was refused — a distinction the
     * `resolved` badge would erase, and the reason the enum is not a boolean.
     */
    id: 'CNV-113',
    channel: 'chat',
    status: 'closed',
    subject: null,
    entityId: 'RDR-1048',
    entityType: 'rider',
    entityName: 'Maryam Al-Anazi',
    participants: [
      {
        id: 'RDR-1048',
        name: 'Maryam Al-Anazi',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-4a90',
        handles: { chat: 'web-session-4a90' },
        joinedAt: offsetFromNow({ hours: -30 }),
        /* She closed the tab twenty-six hours ago. `leftAt` is what makes the
           close reason true rather than asserted. */
        leftAt: offsetFromNow({ hours: -26 }),
      },
      {
        id: 'USR-3',
        name: 'Lina Al-Otaibi',
        kind: 'operator',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ hours: -29 }),
        leftAt: null,
      },
    ],
    messages: CNV_113_MESSAGES,
    messageCount: CNV_113_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -26 }),
    lastMessagePreview: 'Are you still there? I will leave this open for a little while.',
    /* Closed, so nothing is waiting. `null` sorts last, exactly as it should. */
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ hours: -30 }),
    snoozedUntil: null,
    closedAt: offsetFromNow({ hours: -2 }),
    closeReason: 'no-response',
    claim: null,
    /* **Closed, and late - the pair `types/workQueue.ts` insists on keeping
       apart.** It broke the twenty-minute promise twenty-eight hours before it
       was closed, and closing it does not clear the stamp: *'resolved, but
       late'* is the number an operations review actually wants. */
    slaStartedAt: offsetFromNow({ hours: -30 }),
    slaDueAt: offsetFromNow({ hours: -30, minutes: 20 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ hours: -30, minutes: 20 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ hours: -30, seconds: 45 }),
    firstResponseAt: offsetFromNow({ hours: -29 }),
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **`duplicate`, and the first conversation with a `system` participant.**
     *
     * Two things nothing reached, in one row because they are one event: the
     * customer opened a second chat about a conversation already in the queue,
     * the transport announced their arrival and departure, and the operator
     * closed this one as the duplicate.
     *
     * `ParticipantKind.system` exists so a transport notice is attributed to
     * neither the operator nor the customer — *"the customer left the chat"* is
     * not something either of them said, and putting it in either name is how a
     * transcript stops being evidence. The system message is `inbound` and
     * customer-visible with **`delivery: null`**: it arrived, so there is no
     * delivery of ours to report, which is `deliveryIsWellFormed`'s rule and
     * not a special case for system rows.
     */
    id: 'CNV-114',
    channel: 'chat',
    status: 'closed',
    subject: null,
    entityId: 'RDR-1049',
    entityType: 'rider',
    entityName: 'Ali Al-Balawi',
    participants: [
      {
        id: 'RDR-1049',
        name: 'Ali Al-Balawi',
        kind: 'customer',
        entityType: 'rider',
        handle: 'web-session-c22d',
        handles: { chat: 'web-session-c22d' },
        joinedAt: offsetFromNow({ hours: -6 }),
        leftAt: offsetFromNow({ hours: -5 }),
      },
      {
        /**
         * The transport itself. `id` is transport-scoped and `entityType` is
         * `null`, because a chat gateway is not a profile and must not resolve
         * to one — the `?entity=` union has no member for it and inventing one
         * would put a system notice behind a profile drawer.
         */
        id: 'system:chat-gateway',
        name: 'Chat gateway',
        kind: 'system',
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ hours: -6 }),
        leftAt: null,
      },
    ],
    messages: CNV_114_MESSAGES,
    messageCount: CNV_114_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -5 }),
    lastMessagePreview: 'The customer left the chat.',
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ hours: -6 }),
    snoozedUntil: null,
    closedAt: offsetFromNow({ hours: -5 }),
    closeReason: 'duplicate',
    claim: null,
    /* Never answered and closed as a duplicate an hour later: both promises
       broke before the disposition, so both stamps stand. */
    slaStartedAt: offsetFromNow({ hours: -6 }),
    slaDueAt: offsetFromNow({ hours: -6, minutes: 20 }),
    slaTargetMinutes: 20,
    slaBreachedAt: offsetFromNow({ hours: -6, minutes: 20 }),
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ hours: -6, seconds: 45 }),
    firstResponseAt: null,
    firstResponseBreachedAt: offsetFromNow({ hours: -6, seconds: 45 }),
  },
  {
    /**
     * **`spam` — an unsolicited inbound, closed unanswered.**
     *
     * The only row in the set that was **never answered and should not have
     * been**, which is why it is not the same as `no-response`: nobody failed
     * here. It is also the one conversation whose customer is not a customer —
     * `entityId` still has to be *something*, and it points at the rider
     * account the number is registered to rather than at a fabricated id.
     *
     * `unreadCount: 0` on a closed spam row is deliberate: marking it read is
     * part of disposing of it, and a badge that keeps counting junk trains an
     * operator to ignore the badge.
     */
    id: 'CNV-115',
    channel: 'whatsapp',
    status: 'closed',
    subject: null,
    entityId: 'RDR-1045',
    entityType: 'rider',
    entityName: 'Youssef Abdelrahman El-Sayed Farag',
    participants: [
      {
        id: 'RDR-1045',
        name: 'Youssef Abdelrahman El-Sayed Farag',
        kind: 'customer',
        entityType: 'rider',
        handle: '+966 59 002 7788',
        handles: { whatsapp: '+966 59 002 7788' },
        joinedAt: offsetFromNow({ days: -2 }),
        leftAt: null,
      },
    ],
    messages: CNV_115_MESSAGES,
    messageCount: CNV_115_MESSAGES.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ days: -2 }),
    lastMessagePreview: 'عروض تمويل فوري بدون كفيل — تواصل معنا الآن',
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ days: -2 }),
    snoozedUntil: null,
    closedAt: offsetFromNow({ days: -2 }),
    closeReason: 'spam',
    claim: null,
    /* **Merely old, not breached - and the row that makes the difference
       visible.** Both deadlines are two days in the past and *both* fell after
       it was closed, because spam was disposed of the moment it arrived. Under
       a naive `slaDueAt < now` every archived row in the set would read
       'overdue'; under a stamp, this one is clean and stays clean however long
       ago it happened. */
    slaStartedAt: offsetFromNow({ days: -2 }),
    slaDueAt: offsetFromNow({ days: -2, hours: 24 }),
    slaTargetMinutes: 1_440,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: offsetFromNow({ days: -2, hours: 4 }),
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
]

/* ── volume ──────────────────────────────────────────────────────────── */

/**
 * The customers the archive is spread across, resolved from the canonical rider
 * and captain records once. A conversation denormalises `entityId`,
 * `entityType` and `entityName`, and the participant repeats the name a second
 * time — four facts that must agree, read off one object. `refsOf` throws at
 * module load on a duplicate id.
 */
const CONVERSATION_RIDERS: readonly FixtureRef[] = refsOf(riderFixtures.slice(0, 20))
const CONVERSATION_CAPTAINS: readonly FixtureRef[] = refsOf(driverFixtures)

const ARCHIVE_OPENERS: readonly string[] = [
  'My plan renewed twice this month and I was charged for both.',
  'The captain could not find the pickup and the app kept moving the pin.',
  'Can I move my morning leg to 07:30 for the rest of the week?',
  'I was charged a cancellation fee for a trip the captain cancelled.',
  'The wallet credit from last week has not appeared.',
  'How do I change the captain on my subscription?',
  'My invoice has last month’s address on it and I need it reissued.',
]

const ARCHIVE_CLOSE_REASONS: readonly ConversationCloseReason[] = [
  'resolved',
  'resolved',
  'resolved',
  'no-response',
  'duplicate',
  'resolved',
  'spam',
]

/**
 * Volume for the Contact Centre — 40 archived conversations, so the list pages,
 * the `closed` view has something to sort and the close-reason facet has a
 * population to divide.
 *
 * **Every one is `closed`, and the live queue is deliberately not grown.** The
 * fifteen hand-written rows above are the states the console is built against —
 * five waiting, four claimed, one stale, one empty, one 64-message thread — and
 * `conversations.test.ts` reasons about several of them by id and by position
 * in the `unassigned` ordering. Adding open rows would bury them and change an
 * ordering another file asserts. `closed` is also where the volume genuinely
 * is: a contact centre holds a handful of live chats and thousands of finished
 * ones.
 *
 * **`slaSource: 'chat-policy'` on every non-`phone` row**, per D22 and the note
 * at the top of the file. Because every archived conversation was closed two
 * hours after it opened, the sixteen `chat` rows are **resolution-breached**
 * (a 20-minute promise) and the sixteen `email`/`whatsapp` rows are **not** (a
 * 24-hour one) — a population large enough to count, on the one distinction a
 * naive `slaDueAt < now` destroys. The eight `phone` rows stay `unset`.
 */
export const fillerConversations: ConversationSeed[] = Array.from({ length: 40 }, (_, i) => {
  const captainThread = i % 5 === 4
  const party = captainThread
    ? cycleRef(CONVERSATION_CAPTAINS, i)
    : cycleRef(CONVERSATION_RIDERS, i)
  const channel = cycle(['chat', 'chat', 'email', 'whatsapp', 'phone'] as const, i)
  const id = `CNV-2${String(100 + i).padStart(3, '0')}`
  const operator = cycle(
    [
      { id: 'USR-1', name: 'Sarah Al-Rashid' },
      { id: 'USR-3', name: 'Lina Al-Otaibi' },
      { id: 'USR-5', name: 'Yousef Al-Balawi' },
    ],
    i,
  )
  /* One offset per row. The opening, the reply and the close all descend from
     it, so a thread cannot close before it opened. */
  const openedHoursAgo = 26 + i * 7
  const opener = cycle(ARCHIVE_OPENERS, i)
  const closeReason = cycle(ARCHIVE_CLOSE_REASONS, i)
  /* A phone thread is call notes only — every message internal, no preview.
     `CNV-106` establishes the shape; these follow it rather than inventing a
     second one. */
  const internalOnly = channel === 'phone'
  /* **D22's promise, by channel.** `null` on `phone`: *'call notes have no
     promise'*, which is a different fact from a promise of zero and the reason
     these rows keep `slaSource: 'unset'` while every other channel gains one. */
  const resolutionMinutes =
    channel === 'phone' ? null : channel === 'chat' ? CHAT_RESOLUTION_MINUTES : 1_440
  const firstResponseSeconds =
    channel === 'phone' ? null : channel === 'chat' ? CHAT_FIRST_RESPONSE_SECONDS : 4 * 60 * 60
  const resolutionDueAt =
    resolutionMinutes === null
      ? null
      : offsetFromNow({ hours: -openedHoursAgo, minutes: resolutionMinutes })
  const firstResponseDueAt =
    firstResponseSeconds === null
      ? null
      : offsetFromNow({ hours: -openedHoursAgo, seconds: firstResponseSeconds })
  /* Every archived row was closed two hours after it opened. A chat's
     twenty-minute promise therefore broke **before** the disposition and is
     stamped; a 24-hour email or WhatsApp promise fell due long afterwards and is
     not. That is the `breached` / `merely old` distinction `types/workQueue.ts`
     argues for, spread across forty rows so it can be counted rather than
     reasoned about. */
  const resolutionBreachedAt = resolutionMinutes !== null && resolutionMinutes < 2 * 60 ? resolutionDueAt : null
  const messages: Message[] = [
    {
      id: `CMSG-2${String(i * 2 + 100).padStart(4, '0')}`,
      conversationId: id,
      channel,
      direction: internalOnly ? 'outbound' : 'inbound',
      authorId: internalOnly ? operator.id : party.id,
      authorName: internalOnly ? operator.name : party.name,
      authorKind: internalOnly ? 'operator' : 'customer',
      body: internalOnly ? `Inbound call. ${opener}` : opener,
      visibility: internalOnly ? 'internal' : 'customer',
      delivery: null,
      subject: channel === 'email' ? `Re: ${opener.slice(0, 48)}` : null,
      deliveryHistory: [],
      sentAt: offsetFromNow({ hours: -openedHoursAgo }),
      attachments: [],
    },
    {
      id: `CMSG-2${String(i * 2 + 101).padStart(4, '0')}`,
      conversationId: id,
      channel,
      direction: 'outbound',
      authorId: operator.id,
      authorName: operator.name,
      authorKind: 'operator',
      body: internalOnly
        ? 'Explained the charge and confirmed the correction on the call. Nothing owed.'
        : 'Thank you for waiting — I have checked the account and corrected it. You should see it within the hour.',
      visibility: internalOnly ? 'internal' : 'customer',
      delivery: internalOnly
        ? null
        : {
            state: 'delivered' as const,
            updatedAt: offsetFromNow({ hours: -openedHoursAgo + 1 }),
            failureCode: null,
            failureMessage: null,
            providerMessageId: null,
          },
      subject: channel === 'email' ? `Re: ${opener.slice(0, 48)}` : null,
      deliveryHistory: [],
      sentAt: offsetFromNow({ hours: -openedHoursAgo + 1 }),
      attachments: [],
    },
  ]
  return {
    id,
    channel,
    status: 'closed',
    subject: channel === 'email' ? `Re: ${opener.slice(0, 48)}` : null,
    entityId: party.id,
    entityType: captainThread ? 'driver' : 'rider',
    entityName: party.name,
    participants: [
      {
        id: party.id,
        name: party.name,
        kind: 'customer' as const,
        entityType: (captainThread ? 'driver' : 'rider') as 'driver' | 'rider',
        handle: `archive-${channel}-${i}`,
        handles: { [channel]: `archive-${channel}-${i}` },
        joinedAt: offsetFromNow({ hours: -openedHoursAgo }),
        leftAt: null,
      },
      {
        id: operator.id,
        name: operator.name,
        kind: 'operator' as const,
        entityType: null,
        handle: null,
        handles: {},
        joinedAt: offsetFromNow({ hours: -openedHoursAgo }),
        leftAt: null,
      },
    ],
    messages,
    messageCount: messages.length,
    hasMoreBefore: false,
    lastMessageAt: offsetFromNow({ hours: -openedHoursAgo + 1 }),
    /* Customer-visible only. A phone thread is all internal, so it has none —
       the same rule `CNV-106` proves, and the reason this is not
       `messages[messages.length - 1].body`. */
    lastMessagePreview: internalOnly
      ? null
      : 'Thank you for waiting — I have checked the account and corrected it. You should see it within the hour.',
    waitingSince: null,
    unreadCount: 0,
    ticketId: null,
    createdAt: offsetFromNow({ hours: -openedHoursAgo }),
    snoozedUntil: null,
    closedAt: offsetFromNow({ hours: -openedHoursAgo + 2 }),
    closeReason,
    claim: null,
    slaStartedAt: resolutionMinutes === null ? null : offsetFromNow({ hours: -openedHoursAgo }),
    slaDueAt: resolutionDueAt,
    slaTargetMinutes: resolutionMinutes,
    slaBreachedAt: resolutionBreachedAt,
    slaSource: resolutionMinutes === null ? 'unset' : 'chat-policy',
    firstResponseDueAt,
    firstResponseAt: offsetFromNow({ hours: -openedHoursAgo + 1 }),
    /* Answered an hour in — late against a chat's 45 seconds, and **that is
       not a stamp**. `firstResponseAt > firstResponseDueAt` is legacy's
       `frMissed`; the stamp is for a window that closed with nobody having
       responded, which never happens in the archive because every archived row
       was answered. */
    firstResponseBreachedAt: null,
  } satisfies ConversationSeed
})

/**
 * The derived fields every row carries. A live chat without a first-response
 * clock is stamped from its opening instant (D22), so `No clock` never renders
 * on one; `lastMessageAuthorKind` follows the thread. Hand-written clocks are
 * kept: the stamp fills an absence, it does not overrule a row.
 */
function normaliseConversation(seed: ConversationSeed): Conversation {
  const needsChatClock =
    seed.channel === 'chat' && seed.status !== 'closed' && seed.firstResponseDueAt === null
  return {
    ...seed,
    ...(needsChatClock ? stampChatClocks(seed.createdAt) : {}),
    lastMessageAuthorKind: lastMessageAuthorKindOf(seed.messages),
  }
}

/** 55 rows — fifteen hand-written states and forty of archive. */
export const conversationFixtures: Conversation[] = [
  ...namedConversations,
  ...fillerConversations,
].map(normaliseConversation)

/**
 * Operator availability — the seed for `listAgentPresence()`.
 *
 * The five operators are `fixtures/teamUsers.ts`, so presence cannot name
 * somebody who is not on the team. `activeCount` is **not** stored here: the
 * client derives it from live claims over `conversationFixtures`, because a
 * seeded count and a seeded claim set drift the moment anyone claims anything.
 *
 * **The concurrent-chat cap is D22's — three — and it is still not a number in
 * this layer.** It lives as a constant in the console
 * (`hooks/usePresence.ts`) because `types/policy.ts` has
 * no field for it. It belongs in Admin › Operational Policy › Limits (D20), and
 * until it does, two places could disagree about it. Raised, not invented here.
 *
 * **`USR-1` is an `Owner`, and D22 exempts Owner from the cap.** So the cap
 * cannot fire for the default signed-in operator at all; it is reachable only
 * through `switchMockUser` to `USR-3` or `USR-4` (`Support`), which is why
 * `clients/conversations.ts` now resolves `view=mine` and `heldByMe` against
 * the session rather than against `CURRENT_USER_ID`.
 */
export const agentPresenceFixtures: ReadonlyArray<{
  userId: string
  userName: string
  state: 'online' | 'away' | 'offline'
  lastSeenAt: string | null
}> = [
  { userId: 'USR-1', userName: 'Sarah Al-Rashid', state: 'online', lastSeenAt: offsetFromNow({ minutes: -1 }) },
  { userId: 'USR-2', userName: 'Fahad Al-Dosari', state: 'away', lastSeenAt: offsetFromNow({ minutes: -24 }) },
  { userId: 'USR-3', userName: 'Lina Al-Otaibi', state: 'online', lastSeenAt: offsetFromNow({ minutes: -4 }) },
  /* Never signed in. `lastSeenAt: null` is a different thing from "offline for
     a long time", and a UI that prints "last seen —" for both loses it. */
  { userId: 'USR-4', userName: 'Noura Al-Fahad', state: 'offline', lastSeenAt: null },
  { userId: 'USR-5', userName: 'Yousef Al-Balawi', state: 'offline', lastSeenAt: offsetFromNow({ hours: -11 }) },
]
