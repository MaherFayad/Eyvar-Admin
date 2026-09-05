/**
 * Communications fixtures — sender identities, transactional templates, the
 * delivery log, and the push records the screen used to invent.
 *
 * **Depth is the requirement, not decoration.** Three properties this file owes
 * the pane, each of which is asserted by a test:
 *
 *   1. **Every one of the six delivery states carries at least one row**, and
 *      every template key carries at least one send. A filter facet that can
 *      never match anything is an invisible hole, and it is this codebase's
 *      most common defect.
 *   2. **The outbox pages at least twice** at the default page size of 25.
 *   3. **Two template keys are missing their Arabic row.** The pane's whole
 *      reason for showing locale coverage is that the gap is real; a fixture
 *      set with complete coverage tests nothing.
 *
 * Every timestamp is derived from the fixed clock through `offsetFromNow`.
 * There is no `Date.now()` and no `Math.random()` anywhere under `src/data`,
 * and `seam.test.ts` fails the build if one appears.
 */

import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import type {
  EmailDelivery,
  EmailDeliveryState,
  EmailFailureCode,
  EmailLocale,
  EmailTemplate,
  EmailTemplateKey,
  MessagingTemplate,
  PushAudience,
  PushBroadcast,
  SenderIdentity,
} from '../types/email'

/* ───────────────────────── sender identities ───────────────────────── */

/**
 * Five identities covering all four verification states, with **exactly one
 * default**. `canSend` and `blockedFor` are derived here by the same rule the
 * client applies to a newly verified identity — see `senderBlock` below — so
 * the seam has one predicate rather than a fixture that disagrees with it.
 */
export const senderIdentityFixtures: SenderIdentity[] = [
  identity({
    id: 'SND-01',
    displayName: 'Eyvar',
    address: 'no-reply@eyvar.sa',
    replyTo: null,
    verification: 'verified',
    verificationRequestedAt: offsetFromNow({ days: -190 }),
    verifiedAt: offsetFromNow({ days: -189 }),
    isDefault: true,
    createdAt: offsetFromNow({ days: -190 }),
    updatedAt: offsetFromNow({ days: -189 }),
    updatedBy: null,
  }),
  identity({
    id: 'SND-02',
    displayName: 'Eyvar Support',
    address: 'support@eyvar.sa',
    /* Replies to a support message must land in the support inbox, not in the
       transactional void. This is the identity P5-T7 sends a ticket reply as. */
    replyTo: 'support@eyvar.sa',
    verification: 'verified',
    verificationRequestedAt: offsetFromNow({ days: -120 }),
    verifiedAt: offsetFromNow({ days: -119 }),
    isDefault: false,
    createdAt: offsetFromNow({ days: -120 }),
    updatedAt: offsetFromNow({ days: -119 }),
    updatedBy: 'USR-1',
  }),
  identity({
    id: 'SND-03',
    displayName: 'Eyvar Billing',
    address: 'billing@eyvar.sa',
    replyTo: null,
    /* Requested, DNS not propagated yet. Cannot send, and the reason is not the
       same reason as SND-04's — waiting is not "never asked". */
    verification: 'pending',
    verificationRequestedAt: offsetFromNow({ days: -1, hours: -3 }),
    verifiedAt: null,
    isDefault: false,
    createdAt: offsetFromNow({ days: -1, hours: -3 }),
    updatedAt: offsetFromNow({ days: -1, hours: -3 }),
    updatedBy: 'USR-2',
  }),
  identity({
    id: 'SND-04',
    displayName: 'Eyvar Careers',
    address: 'careers@eyvar.sa',
    replyTo: null,
    verification: 'unverified',
    verificationRequestedAt: null,
    verifiedAt: null,
    isDefault: false,
    createdAt: offsetFromNow({ days: -9 }),
    updatedAt: offsetFromNow({ days: -9 }),
    updatedBy: 'USR-1',
  }),
  identity({
    id: 'SND-05',
    displayName: 'Eyvar Notifications',
    address: 'notifications@eyvar.com.sa',
    replyTo: null,
    /* The DKIM record was never published on the second domain. A failed
       verification is retryable, which is why the card offers `Verify again`. */
    verification: 'failed',
    verificationRequestedAt: offsetFromNow({ days: -14 }),
    verifiedAt: null,
    isDefault: false,
    createdAt: offsetFromNow({ days: -16 }),
    updatedAt: offsetFromNow({ days: -13 }),
    updatedBy: 'USR-2',
  }),
]

/**
 * The one place the block rule lives. `verified` sends; nothing else does, and
 * each refusal keeps its own code so §11.2's sentence can be specific.
 */
export function senderBlock(
  verification: SenderIdentity['verification'],
): Pick<SenderIdentity, 'canSend' | 'blockedFor'> {
  switch (verification) {
    case 'verified':
      return { canSend: true, blockedFor: null }
    case 'pending':
      return { canSend: false, blockedFor: 'verification-pending' }
    case 'failed':
      return { canSend: false, blockedFor: 'verification-failed' }
    case 'unverified':
      return { canSend: false, blockedFor: 'unverified' }
  }
}

function identity(
  input: Omit<SenderIdentity, 'canSend' | 'blockedFor'>,
): SenderIdentity {
  return { ...input, ...senderBlock(input.verification) }
}

/* ──────────────────────── transactional templates ──────────────────────── */

/**
 * Ten rows across six keys. **`payout.processed` and `ticket.reply` have no
 * Arabic row** — that is the hole the coverage strip exists to show, and it is
 * deliberate: a rider whose account language is Arabic gets an English payout
 * mail today, which is exactly the class of defect §9.3 says the rebuild is
 * here to retire.
 *
 * The bodies use `{{name}}` because that is the syntax the legacy gateway
 * templates use, and `password.reset` (en) deliberately references
 * `{{expiryMinutes}}`, which it does **not** declare — the save-blocking
 * validation has a real row to fire on rather than one a test has to construct.
 */
export const emailTemplateFixtures: EmailTemplate[] = [
  {
    id: 'TPL-001',
    key: 'trip.receipt',
    locale: 'en',
    name: 'Trip receipt',
    subject: 'Your Eyvar receipt for trip {{tripId}}',
    body:
      'Hello {{riderName}},\n\n' +
      'Thank you for riding with Eyvar. Your trip {{tripId}} on {{tripDate}} came to {{fare}}.\n' +
      'Captain: {{captainName}}.\n\n' +
      'This receipt is also in the app under Trips.',
    variables: [
      { name: 'riderName', required: true, sample: 'Nora Al-Harbi' },
      { name: 'tripId', required: true, sample: 'TRP-24817' },
      { name: 'tripDate', required: true, sample: '25 June 2026' },
      { name: 'fare', required: true, sample: 'SAR 38.50' },
      { name: 'captainName', required: true, sample: 'Faisal Al-Otaibi' },
    ],
    version: 7,
    status: 'active',
    inUse: true,
    sendCount: 7,
    updatedAt: offsetFromNow({ days: -31 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-002',
    key: 'trip.receipt',
    locale: 'ar',
    name: 'إيصال الرحلة',
    subject: 'إيصال إيفار لرحلتك {{tripId}}',
    body:
      'مرحباً {{riderName}}،\n\n' +
      'شكراً لاستخدامك إيفار. بلغت قيمة رحلتك {{tripId}} بتاريخ {{tripDate}} مبلغ {{fare}}.\n' +
      'الكابتن: {{captainName}}.\n\n' +
      'يمكنك الاطلاع على الإيصال في التطبيق ضمن الرحلات.',
    variables: [
      { name: 'riderName', required: true, sample: 'نورة الحربي' },
      { name: 'tripId', required: true, sample: 'TRP-24817' },
      { name: 'tripDate', required: true, sample: '٢٥ يونيو ٢٠٢٦' },
      { name: 'fare', required: true, sample: 'SAR 38.50' },
      { name: 'captainName', required: true, sample: 'فيصل العتيبي' },
    ],
    version: 4,
    status: 'active',
    inUse: true,
    sendCount: 3,
    updatedAt: offsetFromNow({ days: -31 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-003',
    key: 'account.verifyEmail',
    locale: 'en',
    name: 'Verify your email',
    subject: 'Confirm your email address',
    body:
      'Hello {{riderName}},\n\n' +
      'Confirm {{emailAddress}} to finish setting up your Eyvar account: {{verifyLink}}',
    variables: [
      { name: 'riderName', required: true, sample: 'Nora Al-Harbi' },
      { name: 'emailAddress', required: true, sample: 'nora@example.com' },
      { name: 'verifyLink', required: true, sample: 'https://eyvar.sa/verify/9f2c' },
    ],
    version: 3,
    status: 'active',
    inUse: true,
    sendCount: 3,
    updatedAt: offsetFromNow({ days: -64 }),
    updatedBy: 'USR-2',
  },
  {
    id: 'TPL-004',
    key: 'account.verifyEmail',
    locale: 'ar',
    name: 'تأكيد البريد الإلكتروني',
    subject: 'أكّد بريدك الإلكتروني',
    body:
      'مرحباً {{riderName}}،\n\n' +
      'أكّد {{emailAddress}} لإكمال إنشاء حسابك في إيفار: {{verifyLink}}',
    variables: [
      { name: 'riderName', required: true, sample: 'نورة الحربي' },
      { name: 'emailAddress', required: true, sample: 'nora@example.com' },
      { name: 'verifyLink', required: true, sample: 'https://eyvar.sa/verify/9f2c' },
    ],
    version: 2,
    status: 'active',
    inUse: true,
    sendCount: 1,
    updatedAt: offsetFromNow({ days: -64 }),
    updatedBy: 'USR-2',
  },
  {
    id: 'TPL-005',
    key: 'password.reset',
    locale: 'en',
    name: 'Reset your password',
    /* Declares three variables and references four. `{{expiryMinutes}}` is the
       save-blocking error the editor has to name. */
    subject: 'Reset your Eyvar password',
    body:
      'Hello {{riderName}},\n\n' +
      'Use {{resetLink}} to choose a new password. The link expires in {{expiryMinutes}} minutes.\n' +
      'If you did not ask for this, tell us at {{supportAddress}}.',
    variables: [
      { name: 'riderName', required: true, sample: 'Nora Al-Harbi' },
      { name: 'resetLink', required: true, sample: 'https://eyvar.sa/reset/4d81' },
      { name: 'supportAddress', required: true, sample: 'support@eyvar.sa' },
    ],
    version: 5,
    status: 'active',
    inUse: true,
    sendCount: 2,
    updatedAt: offsetFromNow({ days: -12 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-006',
    key: 'password.reset',
    locale: 'ar',
    name: 'إعادة تعيين كلمة المرور',
    subject: 'إعادة تعيين كلمة مرور إيفار',
    body:
      'مرحباً {{riderName}}،\n\n' +
      'استخدم {{resetLink}} لاختيار كلمة مرور جديدة.\n' +
      'إذا لم تطلب ذلك، راسلنا على {{supportAddress}}.',
    variables: [
      { name: 'riderName', required: true, sample: 'نورة الحربي' },
      { name: 'resetLink', required: true, sample: 'https://eyvar.sa/reset/4d81' },
      { name: 'supportAddress', required: true, sample: 'support@eyvar.sa' },
    ],
    version: 3,
    status: 'active',
    inUse: true,
    sendCount: 1,
    updatedAt: offsetFromNow({ days: -12 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-007',
    key: 'payout.processed',
    locale: 'en',
    name: 'Weekly payout processed',
    subject: 'Your payout of {{amount}} is on its way',
    body:
      'Hello {{captainName}},\n\n' +
      'Your payout of {{amount}} for the week ending {{periodEnd}} has been sent to {{iban}}.\n' +
      'It usually lands within one business day.',
    variables: [
      { name: 'captainName', required: true, sample: 'Faisal Al-Otaibi' },
      { name: 'amount', required: true, sample: 'SAR 1,240.00' },
      { name: 'periodEnd', required: true, sample: '21 June 2026' },
      { name: 'iban', required: true, sample: 'SA44 •••• 8821' },
    ],
    version: 6,
    status: 'active',
    inUse: true,
    sendCount: 6,
    updatedAt: offsetFromNow({ days: -5 }),
    updatedBy: 'USR-2',
  },
  {
    id: 'TPL-008',
    key: 'subscription.renewalReminder',
    locale: 'en',
    name: 'Subscription renewal reminder',
    subject: 'Your {{planName}} renews on {{renewalDate}}',
    body:
      'Hello {{riderName}},\n\n' +
      'Your {{planName}} package renews on {{renewalDate}}. You have {{tripsLeft}} trips left this cycle.',
    variables: [
      { name: 'riderName', required: true, sample: 'Nora Al-Harbi' },
      { name: 'planName', required: true, sample: 'Monthly 40' },
      { name: 'renewalDate', required: true, sample: '1 July 2026' },
      { name: 'tripsLeft', required: true, sample: '11' },
    ],
    version: 2,
    status: 'active',
    inUse: true,
    sendCount: 6,
    updatedAt: offsetFromNow({ days: -22 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-009',
    key: 'subscription.renewalReminder',
    locale: 'ar',
    name: 'تذكير بتجديد الاشتراك',
    subject: 'يتجدد اشتراك {{planName}} بتاريخ {{renewalDate}}',
    body:
      'مرحباً {{riderName}}،\n\n' +
      'يتجدد اشتراكك {{planName}} بتاريخ {{renewalDate}}. تبقّى لديك {{tripsLeft}} رحلات في هذه الدورة.',
    variables: [
      { name: 'riderName', required: true, sample: 'نورة الحربي' },
      { name: 'planName', required: true, sample: 'الشهري ٤٠' },
      { name: 'renewalDate', required: true, sample: '١ يوليو ٢٠٢٦' },
      { name: 'tripsLeft', required: true, sample: '١١' },
    ],
    version: 1,
    status: 'active',
    inUse: true,
    sendCount: 1,
    updatedAt: offsetFromNow({ days: -22 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-010',
    key: 'ticket.reply',
    locale: 'en',
    name: 'Support reply',
    /* Draft, not in use: P5-T7 is the thing that will start sending it, which is
       why this pane is that task's precondition. */
    subject: 'Re: {{ticketSubject}} ({{ticketId}})',
    body: 'Hello {{customerName}},\n\n{{agentMessage}}\n\n— {{agentName}}, Eyvar Support',
    variables: [
      { name: 'customerName', required: true, sample: 'Nora Al-Harbi' },
      { name: 'ticketSubject', required: true, sample: 'Charged twice for one trip' },
      { name: 'ticketId', required: true, sample: 'TKT-501' },
      { name: 'agentMessage', required: true, sample: 'We have refunded the duplicate charge.' },
      { name: 'agentName', required: true, sample: 'Sara' },
      /* Declared, referenced nowhere — the `unused-variable` warning's row. */
      { name: 'ticketUrl', required: false, sample: 'https://eyvar.sa/t/501' },
    ],
    version: 1,
    status: 'draft',
    inUse: false,
    sendCount: 2,
    updatedAt: offsetFromNow({ days: -2 }),
    updatedBy: 'USR-3',
  },
  {
    id: 'TPL-011',
    key: 'team.invite',
    locale: 'en',
    name: 'Operator invitation',
    subject: 'You are invited to Eyvar Admin',
    body:
      'Hello {{name}},\n\n' +
      'You have been invited to the Eyvar console as {{role}}. Set your password here: {{link}}\n\n' +
      'The link expires on {{expiresAt}}.',
    variables: [
      { name: 'name', required: true, sample: 'Noura Al-Fahad' },
      { name: 'role', required: true, sample: 'Support' },
      { name: 'link', required: true, sample: 'https://admin.eyvar.sa/activate?token=INV-901' },
      { name: 'expiresAt', required: true, sample: '2 July 2026' },
    ],
    version: 1,
    status: 'active',
    inUse: true,
    sendCount: 1,
    updatedAt: offsetFromNow({ days: -30 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'TPL-012',
    key: 'team.invite',
    locale: 'ar',
    name: 'دعوة مشغّل',
    subject: 'أنت مدعو إلى لوحة إيفار',
    body:
      'مرحباً {{name}}،\n\n' +
      'دُعيت إلى لوحة إيفار بصفة {{role}}. عيّن كلمة مرورك من هنا: {{link}}\n\n' +
      'تنتهي صلاحية الرابط في {{expiresAt}}.',
    variables: [
      { name: 'name', required: true, sample: 'نورة الفهد' },
      { name: 'role', required: true, sample: 'الدعم' },
      { name: 'link', required: true, sample: 'https://admin.eyvar.sa/activate?token=INV-901' },
      { name: 'expiresAt', required: true, sample: '2 يوليو 2026' },
    ],
    version: 1,
    status: 'active',
    inUse: true,
    sendCount: 0,
    updatedAt: offsetFromNow({ days: -30 }),
    updatedBy: 'USR-1',
  },
]

/* ───────────────────────────── delivery log ───────────────────────────── */

/**
 * Subject lines as they were **rendered at send time**, per key and locale. A
 * delivery keeps the subject it went out with; re-deriving it from the current
 * template would rewrite history every time an operator edits one.
 */
const SENT_SUBJECT: Record<EmailTemplateKey, Record<EmailLocale, string>> = {
  'trip.receipt': {
    en: 'Your Eyvar receipt for trip TRP-24817',
    ar: 'إيصال إيفار لرحلتك TRP-24817',
  },
  'account.verifyEmail': { en: 'Confirm your email address', ar: 'أكّد بريدك الإلكتروني' },
  'password.reset': {
    en: 'Reset your Eyvar password',
    ar: 'إعادة تعيين كلمة مرور إيفار',
  },
  'payout.processed': {
    en: 'Your payout of SAR 1,240.00 is on its way',
    ar: 'تم إرسال دفعتك',
  },
  'team.invite': { en: 'You are invited to Eyvar Admin', ar: 'أنت مدعو إلى لوحة إيفار' },
  'subscription.renewalReminder': {
    en: 'Your Monthly 40 renews on 1 July 2026',
    ar: 'يتجدد اشتراك الشهري ٤٠ بتاريخ ١ يوليو ٢٠٢٦',
  },
  'ticket.reply': { en: 'Re: Charged twice for one trip (TKT-501)', ar: 'رد الدعم' },
}

/** The provider's verbatim words for each failure code. Never translated. */
const PROVIDER_MESSAGE: Record<EmailFailureCode, string> = {
  'hard-bounce': '550 5.1.1 The email account that you tried to reach does not exist',
  'soft-bounce': '451 4.3.0 Temporary deferral, retry later',
  'mailbox-full': '552 5.2.2 Mailbox full',
  'invalid-address': '501 5.1.3 Bad recipient address syntax',
  'spam-complaint': 'feedback-loop: abuse report received from mailbox provider',
  unsubscribed: 'suppressed: recipient on the unsubscribe list',
  'rate-limited': '421 4.7.0 Too many messages from this sender, try again later',
  'provider-error': '500 upstream provider returned an unexpected response',
}

/**
 * A resend is offered where a retry can plausibly work, and refused where it
 * cannot. Sending again to a dead mailbox, an address that is not an address,
 * someone who complained, or someone who unsubscribed is at best noise and at
 * worst a compliance problem — so those four refuse **in place, with the
 * reason**, rather than hiding the control (§11.2).
 */
export function canResendFailure(code: EmailFailureCode | null): boolean {
  if (code === null) return false
  return code === 'soft-bounce' || code === 'mailbox-full' || code === 'rate-limited' || code === 'provider-error'
}

type DeliveryRow = readonly [
  id: string,
  minutesAgo: number,
  recipient: string,
  recipientName: string | null,
  templateKey: EmailTemplateKey,
  locale: EmailLocale,
  senderIdentityId: string,
  state: EmailDeliveryState,
  failure: EmailFailureCode | null,
]

/**
 * Thirty outbound sends. **Six states, six template keys, both locales, three
 * sending identities** — and more than 25 rows, so the outbox pages twice at
 * the default page size and pagination is exercised rather than assumed.
 */
const OUTBOUND: readonly DeliveryRow[] = [
  ['EML-1001', -6, 'nora.alharbi@example.com', 'Nora Al-Harbi', 'trip.receipt', 'en', 'SND-01', 'queued', null],
  ['EML-1002', -9, 'saad.alqahtani@example.com', 'Saad Al-Qahtani', 'trip.receipt', 'ar', 'SND-01', 'queued', null],
  ['EML-1003', -14, 'reem.alzahrani@example.com', 'Reem Al-Zahrani', 'subscription.renewalReminder', 'en', 'SND-01', 'queued', null],
  ['EML-1004', -21, 'mishal.alharthi@example.com', 'Mishal Al-Harthi', 'trip.receipt', 'en', 'SND-01', 'sent', null],
  ['EML-1005', -28, 'hessa.aldosari@example.com', 'Hessa Al-Dosari', 'account.verifyEmail', 'en', 'SND-01', 'sent', null],
  ['EML-1006', -35, 'turki.alshammari@example.com', 'Turki Al-Shammari', 'payout.processed', 'en', 'SND-03', 'sent', null],
  ['EML-1007', -44, 'lama.alsubaie@example.com', 'Lama Al-Subaie', 'password.reset', 'ar', 'SND-01', 'sent', null],
  ['EML-1008', -52, 'faisal.alotaibi@example.com', 'Faisal Al-Otaibi', 'payout.processed', 'en', 'SND-03', 'delivered', null],
  ['EML-1009', -61, 'maha.alghamdi@example.com', 'Maha Al-Ghamdi', 'trip.receipt', 'ar', 'SND-01', 'delivered', null],
  ['EML-1010', -73, 'yousef.alanazi@example.com', 'Yousef Al-Anazi', 'trip.receipt', 'en', 'SND-01', 'delivered', null],
  ['EML-1011', -88, 'noura.alqahtani@example.com', 'Noura Al-Qahtani', 'account.verifyEmail', 'ar', 'SND-01', 'delivered', null],
  ['EML-1012', -96, 'bandar.alrashid@example.com', 'Bandar Al-Rashid', 'subscription.renewalReminder', 'en', 'SND-01', 'delivered', null],
  ['EML-1013', -110, 'aisha.almutairi@example.com', 'Aisha Al-Mutairi', 'password.reset', 'en', 'SND-01', 'delivered', null],
  ['EML-1014', -125, 'salman.alfaraj@example.com', 'Salman Al-Faraj', 'trip.receipt', 'en', 'SND-01', 'delivered', null],
  ['EML-1015', -140, 'dana.alsalem@example.com', 'Dana Al-Salem', 'subscription.renewalReminder', 'ar', 'SND-01', 'delivered', null],
  ['EML-1016', -155, 'omar.albishi@example.com', 'Omar Al-Bishi', 'payout.processed', 'en', 'SND-03', 'delivered', null],
  ['EML-1017', -170, 'ghada.alsheikh@example.com', 'Ghada Al-Sheikh', 'trip.receipt', 'ar', 'SND-01', 'delivered', null],
  ['EML-1018', -186, 'khalid.almazrou@example.com', 'Khalid Al-Mazrou', 'trip.receipt', 'en', 'SND-01', 'delivered', null],
  ['EML-1019', -205, 'sultan.alharbi@example.com', 'Sultan Al-Harbi', 'account.verifyEmail', 'en', 'SND-01', 'delivered', null],
  ['EML-1020', -228, 'wafa.alnasser@example.com', 'Wafa Al-Nasser', 'subscription.renewalReminder', 'en', 'SND-01', 'delivered', null],
  ['EML-1021', -250, 'ibrahim.alsaif@example.com', 'Ibrahim Al-Saif', 'payout.processed', 'en', 'SND-03', 'delivered', null],
  ['EML-1022', -275, 'jana.alamri@example.com', 'Jana Al-Amri', 'ticket.reply', 'en', 'SND-02', 'delivered', null],
  /* The four failure shapes an operator has to tell apart. */
  ['EML-1023', -300, 'old.address@example.com', 'Majed Al-Suwailem', 'trip.receipt', 'en', 'SND-01', 'bounced', 'hard-bounce'],
  ['EML-1024', -318, 'busy.mailbox@example.com', 'Rania Al-Jaber', 'payout.processed', 'en', 'SND-03', 'bounced', 'mailbox-full'],
  ['EML-1025', -340, 'deferred@example.com', 'Talal Al-Malki', 'subscription.renewalReminder', 'en', 'SND-01', 'bounced', 'soft-bounce'],
  ['EML-1026', -366, 'annoyed.rider@example.com', 'Huda Al-Rasheed', 'subscription.renewalReminder', 'en', 'SND-01', 'complained', 'spam-complaint'],
  ['EML-1027', -395, 'unhappy.captain@example.com', 'Nawaf Al-Dossari', 'payout.processed', 'en', 'SND-03', 'complained', 'spam-complaint'],
  ['EML-1028', -420, 'not-an-address@@example', null, 'account.verifyEmail', 'en', 'SND-01', 'failed', 'invalid-address'],
  ['EML-1029', -455, 'throttled.rider@example.com', 'Amal Al-Yami', 'trip.receipt', 'en', 'SND-01', 'failed', 'rate-limited'],
  ['EML-1030', -500, 'provider.outage@example.com', 'Rakan Al-Juhani', 'password.reset', 'en', 'SND-01', 'failed', 'provider-error'],
  ['EML-1031', -540, 'opted.out@example.com', 'Basma Al-Khaldi', 'subscription.renewalReminder', 'en', 'SND-01', 'failed', 'unsubscribed'],
  ['EML-1032', -600, 'ticket.reporter@example.com', 'Fatima Al-Enezi', 'ticket.reply', 'en', 'SND-02', 'delivered', null],
  /* Noura's invitation, six days ago: the one `Invited` row in the roster. */
  ['EML-1033', -8640, 'noura.f@eyvar.com', 'Noura Al-Fahad', 'team.invite', 'en', 'SND-01', 'delivered', null],
]

/**
 * Six inbound replies — the `inbox` view. A human answering a transactional
 * message is the only inbound this product receives; a bounce is a **state on
 * the outbound row**, not a row of its own, because it belongs to the send it
 * describes.
 *
 * `inReplyTo` and `ticketId` are the joins P5-T7 needs: a reply that already
 * belongs to a ticket, and one that does not yet.
 */
interface InboundRow {
  id: string
  minutesAgo: number
  from: string
  fromName: string
  toIdentity: string
  subject: string
  locale: EmailLocale
  inReplyTo: string | null
  ticketId: string | null
}

const INBOUND: readonly InboundRow[] = [
  {
    id: 'EML-2001',
    minutesAgo: -18,
    from: 'jana.alamri@example.com',
    fromName: 'Jana Al-Amri',
    toIdentity: 'SND-02',
    subject: 'Re: Charged twice for one trip (TKT-501)',
    locale: 'en',
    inReplyTo: 'EML-1022',
    ticketId: 'TKT-501',
  },
  {
    id: 'EML-2002',
    minutesAgo: -47,
    from: 'faisal.alotaibi@example.com',
    fromName: 'Faisal Al-Otaibi',
    toIdentity: 'SND-03',
    subject: 'Re: Your payout of SAR 1,240.00 is on its way',
    locale: 'en',
    inReplyTo: 'EML-1008',
    ticketId: null,
  },
  {
    id: 'EML-2003',
    minutesAgo: -132,
    from: 'maha.alghamdi@example.com',
    fromName: 'Maha Al-Ghamdi',
    toIdentity: 'SND-01',
    subject: 'رد: إيصال إيفار لرحلتك TRP-24817',
    locale: 'ar',
    inReplyTo: 'EML-1009',
    ticketId: null,
  },
  {
    id: 'EML-2004',
    minutesAgo: -260,
    from: 'fatima.alenezi@example.com',
    fromName: 'Fatima Al-Enezi',
    toIdentity: 'SND-02',
    subject: 'Re: Charged twice for one trip (TKT-502)',
    locale: 'en',
    inReplyTo: 'EML-1032',
    ticketId: 'TKT-502',
  },
  {
    id: 'EML-2005',
    minutesAgo: -410,
    from: 'aisha.almutairi@example.com',
    fromName: 'Aisha Al-Mutairi',
    toIdentity: 'SND-01',
    subject: 'Re: Reset your Eyvar password',
    locale: 'en',
    inReplyTo: 'EML-1013',
    ticketId: null,
  },
  {
    id: 'EML-2006',
    minutesAgo: -900,
    from: 'huda.alrasheed@example.com',
    fromName: 'Huda Al-Rasheed',
    toIdentity: 'SND-01',
    subject: 'Please stop emailing me',
    locale: 'en',
    /* An unprompted inbound: nothing to thread it to, and the complaint on
       EML-1026 is a different record about the same person. */
    inReplyTo: null,
    ticketId: null,
  },
]

const IDENTITY_ADDRESS: Record<string, string> = Object.fromEntries(
  senderIdentityFixtures.map((row) => [row.id, row.address]),
)

const TEMPLATE_ID: Record<string, string> = Object.fromEntries(
  emailTemplateFixtures.map((row) => [`${row.key}:${row.locale}`, row.id]),
)

/** Newest first — the order the log is read in, fixed here rather than sorted at render. */
export const emailDeliveryFixtures: EmailDelivery[] = [
  ...OUTBOUND.map(
    ([id, minutesAgo, recipient, recipientName, templateKey, locale, senderIdentityId, state, failure]): EmailDelivery => ({
      id,
      direction: 'outbound',
      recipient,
      recipientName,
      from: IDENTITY_ADDRESS[senderIdentityId] ?? 'no-reply@eyvar.sa',
      senderIdentityId,
      templateKey,
      templateId: TEMPLATE_ID[`${templateKey}:${locale}`] ?? null,
      locale,
      subject: SENT_SUBJECT[templateKey][locale],
      state,
      queuedAt: offsetFromNow({ minutes: minutesAgo }),
      /* A queued message has not transitioned yet, so the two stamps agree.
         Everything else moved a minute after it was queued. */
      updatedAt: state === 'queued' ? offsetFromNow({ minutes: minutesAgo }) : offsetFromNow({ minutes: minutesAgo + 1 }),
      failure:
        failure === null
          ? null
          : {
              code: failure,
              providerMessage: PROVIDER_MESSAGE[failure],
              at: offsetFromNow({ minutes: minutesAgo + 1 }),
            },
      canResend: canResendFailure(failure),
      resendOf: null,
      inReplyTo: null,
      ticketId: templateKey === 'ticket.reply' ? (id === 'EML-1022' ? 'TKT-501' : 'TKT-502') : null,
    }),
  ),
  ...INBOUND.map(
    (row): EmailDelivery => ({
      id: row.id,
      direction: 'inbound',
      /* The identity it arrived at. `recipient` is "who it was addressed to" in
         both directions, which is what keeps one search box honest. */
      recipient: IDENTITY_ADDRESS[row.toIdentity] ?? 'support@eyvar.sa',
      recipientName: null,
      from: row.from,
      senderIdentityId: row.toIdentity,
      templateKey: null,
      templateId: null,
      locale: row.locale,
      subject: row.subject,
      /* An inbound is delivered the moment we have it. There is no other state
         it can be in, and inventing one would put a facet on the inbox filter
         that never matches. */
      state: 'delivered',
      queuedAt: offsetFromNow({ minutes: row.minutesAgo }),
      updatedAt: offsetFromNow({ minutes: row.minutesAgo }),
      failure: null,
      canResend: false,
      resendOf: null,
      inReplyTo: row.inReplyTo,
      ticketId: row.ticketId,
    }),
  ),
]

/** The sender name shown beside an inbound row, keyed by delivery id. */
export const inboundSenderNames: Record<string, string> = Object.fromEntries(
  INBOUND.map((row) => [row.id, row.fromName]),
)

/* ─────────────────────────── push broadcasts ─────────────────────────── */

/**
 * Audience sizes. **This is where a delivered count comes from** — the screen
 * used to render `deliveredCount: 142` for every broadcast regardless of who it
 * went to, which is a fabricated number shown to an operator as a result.
 */
export const pushAudienceFixtures: PushAudience[] = [
  { id: 'all-captains', deviceCount: 4812 },
  { id: 'online-captains', deviceCount: 317 },
  { id: 'all-riders', deviceCount: 28460 },
  { id: 'active-subscription-riders', deviceCount: 2194 },
]

export const pushBroadcastFixtures: PushBroadcast[] = [
  {
    id: 'BRD-101',
    title: 'Surge alert: KAFD Riyadh area',
    body: 'High demand near KAFD. 1.4x surge bonus active for the next 45 minutes.',
    audienceId: 'online-captains',
    deepLink: 'eyvar://demand-map',
    sentAt: offsetFromNow({ hours: -25 }),
    sentBy: 'USR-1',
    state: 'sent',
    deliveredCount: 284,
    openRate: 92,
  },
  {
    id: 'BRD-102',
    title: 'App maintenance scheduled',
    body: 'Eyvar will be briefly unavailable on Friday between 02:00 and 02:30.',
    audienceId: 'all-riders',
    deepLink: null,
    sentAt: offsetFromNow({ days: -5 }),
    sentBy: 'USR-2',
    state: 'sent',
    deliveredCount: 27311,
    /* Reported late by the provider, so this one has a rate and the fresh one
       below does not. `null` is "not reported", never zero. */
    openRate: 88,
  },
  {
    id: 'BRD-103',
    title: 'Weekend bonus for captains',
    body: 'Complete 20 trips this weekend for a SAR 150 bonus.',
    audienceId: 'all-captains',
    deepLink: 'eyvar://earnings',
    sentAt: EYVAR_NOW,
    sentBy: 'USR-1',
    state: 'queued',
    deliveredCount: 4812,
    openRate: null,
  },
]

/* ──────────────── SMS / WhatsApp / push template catalogue ─────────────── */

/**
 * The four rows that were a module literal in `AdminCommunicationsScreen`
 * (`:23`). Same content, now behind the seam, so the card has four states and
 * the catalogue can grow without a component edit.
 */
export const messagingTemplateFixtures: MessagingTemplate[] = [
  {
    id: 'MSG-01',
    code: 'driver_assigned',
    name: 'Captain assigned notice',
    channel: 'push',
    audience: 'rider',
    sampleText: 'Captain {driver_name} has accepted your trip ({vehicle_model} · {plate}).',
    status: 'active',
  },
  {
    id: 'MSG-02',
    code: 'subscription_reminder',
    name: 'Monthly subscription renewal',
    channel: 'whatsapp',
    audience: 'rider',
    sampleText: 'Your monthly package {plan_name} renews on {date}. Unused trips: {trips_left}.',
    status: 'active',
  },
  {
    id: 'MSG-03',
    code: 'payout_processed',
    name: 'Weekly earnings payout processed',
    channel: 'sms',
    audience: 'driver',
    sampleText: 'Your weekly payout of SAR {amount} has been transferred to your IBAN {iban}.',
    status: 'active',
  },
  {
    id: 'MSG-04',
    code: 'sos_alert',
    name: 'Emergency SOS broadcast',
    channel: 'sms',
    audience: 'both',
    sampleText: 'Emergency trigger on trip {trip_id}. Ops safety desk has been alerted.',
    status: 'active',
  },
]
