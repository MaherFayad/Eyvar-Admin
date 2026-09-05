/**
 * Communications client — sender identities, transactional templates, the
 * delivery log, and the push broadcast record (**P6-T2**).
 *
 * Shaped exactly like `notifications.ts` and `tickets.ts`: a `DATA_SOURCE`
 * branch on every operation, the `mock` / `mockMutation` wrapper so latency and
 * injected failure are never skipped, an operation-id constant per call so QA
 * can fail any one of them from `?mockFail=`, and `Paginated<T>` on every list.
 *
 * ## The four things this file decides
 *
 * **1. Rendering a template is pure, and it lives here.** `substituteVariables`,
 * `referencedVariables` and `emailTemplateIssues` are exported as plain
 * functions so the editor can validate **while the operator types** and the
 * mock can validate **at save** with the same code. A second implementation in
 * the component is how a save that the form said was fine gets rejected.
 *
 * **2. A save is refused twice, on purpose.** The editor gates the button
 * (§11.2 — disabled in place, with the reason), and `saveEmailTemplate` throws
 * anyway if it is called with an invalid draft. The first is the interface; the
 * second is the contract, and the http branch will get the same 422 from a real
 * server.
 *
 * **3. `sendCount` is computed from the log, not read from the template.** It
 * is what the in-use warning quantifies, and a counter maintained beside the
 * thing it counts drifts from it. One read, one source.
 *
 * **4. A resend is a new row.** It does not mutate the failed delivery, because
 * the failed delivery is what happened. `resendOf` threads the two, so the log
 * can show a retry without losing the original.
 *
 * ## Not done here, and why
 *
 * **Changing the default sender identity is an audited act and no audit entry
 * is written yet.** `appendAudit` requires an `AuditAction` from the closed
 * union in `types/audit.ts` and a `detail` key that exists in the English
 * dictionary; both files are owned elsewhere and both edits were requested
 * rather than made. `updatedBy` / `updatedAt` on the identity carry who and
 * when in the meantime. See the handoff note — this is a gap, not a decision.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Paginated, type QueryParams } from '../types/common'
import {
  EMAIL_LOCALES,
  EMAIL_TEMPLATE_KEYS,
  type EmailDelivery,
  type EmailLocale,
  type EmailTemplate,
  type EmailTemplateCoverage,
  type EmailTemplateDraft,
  type EmailTemplateIssue,
  type EmailTemplateKey,
  type EmailTemplatePreview,
  type EmailTemplateValidation,
  type MessagingTemplate,
  type PushAudience,
  type PushAudienceId,
  type PushBroadcast,
  type SenderIdentity,
} from '../types/email'
import { appendAudit } from './audit'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let canResendFailure!: Fixtures['canResendFailure']
let emailDeliveryFixtures!: Fixtures['emailDeliveryFixtures']
let emailTemplateFixtures!: Fixtures['emailTemplateFixtures']
let messagingTemplateFixtures!: Fixtures['messagingTemplateFixtures']
let pushAudienceFixtures!: Fixtures['pushAudienceFixtures']
let pushBroadcastFixtures!: Fixtures['pushBroadcastFixtures']
let senderBlock!: Fixtures['senderBlock']
let senderIdentityFixtures!: Fixtures['senderIdentityFixtures']
onFixturesLoaded((f) => {
  canResendFailure = f.canResendFailure
  emailDeliveryFixtures = f.emailDeliveryFixtures
  emailTemplateFixtures = f.emailTemplateFixtures
  messagingTemplateFixtures = f.messagingTemplateFixtures
  pushAudienceFixtures = f.pushAudienceFixtures
  pushBroadcastFixtures = f.pushBroadcastFixtures
  senderBlock = f.senderBlock
  senderIdentityFixtures = f.senderIdentityFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  identities = senderIdentityFixtures.map((row) => ({ ...row }))
  templates = emailTemplateFixtures.map((row) => ({ ...row }))
  deliveries = emailDeliveryFixtures.map((row) => ({ ...row }))
  broadcasts = pushBroadcastFixtures.map((row) => ({ ...row }))
})

export const EMAIL_OPERATIONS = {
  identities: 'emails.identities.list',
  setDefaultIdentity: 'emails.identities.setDefault',
  verifyIdentity: 'emails.identities.verify',
  templates: 'emails.templates.list',
  template: 'emails.templates.get',
  coverage: 'emails.templates.coverage',
  preview: 'emails.templates.preview',
  validate: 'emails.templates.validate',
  saveTemplate: 'emails.templates.save',
  deliveries: 'emails.deliveries.list',
  resend: 'emails.deliveries.resend',
  messagingTemplates: 'messaging.templates.list',
  pushAudiences: 'push.audiences.list',
  pushBroadcasts: 'push.broadcasts.list',
  sendPush: 'push.broadcasts.send',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(EMAIL_OPERATIONS))

/* ─────────────────────────── mutable mock state ────────────────────────── */

let identities!: SenderIdentity[]
let templates!: EmailTemplate[]
let deliveries!: EmailDelivery[]
let broadcasts!: PushBroadcast[]

/**
 * Session-minted ids, seeded high so they are greppably distinct from the
 * fixtures and can never collide with them — the reasoning `tickets.ts` sets
 * out for `MSG-901` and `ledger.ts` for `JE-9…`. **Not a clock read:** an id
 * derived from `Date.now()` is different on every run, so nothing that diffs
 * output can tell a real change from the clock ticking.
 */
let deliverySequence = 9000
let broadcastSequence = 900

export function resetEmails(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  identities = senderIdentityFixtures.map((row) => ({ ...row }))
  templates = emailTemplateFixtures.map((row) => ({ ...row }))
  deliveries = emailDeliveryFixtures.map((row) => ({ ...row }))
  broadcasts = pushBroadcastFixtures.map((row) => ({ ...row }))
  deliverySequence = 9000
  broadcastSequence = 900
}

/**
 * A send another client makes through the product (the invitation, O-T6),
 * recorded on the log as `queued`. Sync, so a mutation elsewhere can call it
 * inside its own `mockMutation` body; the sender is the default identity.
 */
export function recordEmailDelivery(input: {
  recipient: string
  recipientName: string | null
  templateKey: EmailTemplateKey
  locale: EmailLocale
}): EmailDelivery | null {
  if (!fixturesLoaded()) return null
  const identity = identities.find((row) => row.isDefault) ?? identities[0]
  const template = templates.find((row) => row.key === input.templateKey && row.locale === input.locale) ?? null
  if (!identity) return null
  deliverySequence += 1
  const row: EmailDelivery = {
    id: `EML-${deliverySequence}`,
    direction: 'outbound',
    recipient: input.recipient,
    recipientName: input.recipientName,
    from: identity.address,
    senderIdentityId: identity.id,
    templateKey: input.templateKey,
    templateId: template?.id ?? null,
    locale: input.locale,
    subject: template?.subject ?? input.templateKey,
    state: 'queued',
    queuedAt: EYVAR_NOW,
    updatedAt: EYVAR_NOW,
    failure: null,
    canResend: false,
    resendOf: null,
    inReplyTo: null,
    ticketId: null,
  }
  deliveries = [row, ...deliveries]
  return { ...row }
}

/* ────────────────────── pure template mechanics ────────────────────── */

/**
 * `{{ name }}` with optional inner spaces — the syntax the legacy gateway
 * templates already use. Declared once, used by the renderer, the validator and
 * the preview, so the three cannot disagree about what a reference is.
 */
const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g

/** Every variable a piece of text references, in order, without duplicates. */
export function referencedVariables(text: string): string[] {
  const out: string[] = []
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1]
    if (name !== undefined && !out.includes(name)) out.push(name)
  }
  return out
}

/**
 * Substitute what we have and **leave what we do not** — an undeclared
 * reference stays visible in the preview rather than silently becoming an empty
 * string, because an empty string in a rendered mail is the bug nobody sees
 * until a customer does.
 */
export function substituteVariables(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (whole, name: string) => values[name] ?? whole)
}

/**
 * Everything wrong with a draft, in one list.
 *
 * The rule that matters: **a body referencing a variable the template does not
 * declare is an error and names the variable.** Everything else is a warning,
 * including `template-in-use`, which is not a fault at all — it is the
 * confirmation gate, carried in the same list so a caller has one thing to read
 * rather than two.
 */
export function emailTemplateIssues(
  draft: EmailTemplateDraft,
  options: { inUse: boolean },
): EmailTemplateValidation {
  const issues: EmailTemplateIssue[] = []
  const declared = draft.variables.map((v) => v.name)

  if (draft.subject.trim() === '') {
    issues.push({ code: 'empty-subject', severity: 'error', field: 'subject', variable: null })
  }
  if (draft.body.trim() === '') {
    issues.push({ code: 'empty-body', severity: 'error', field: 'body', variable: null })
  }

  for (const field of ['subject', 'body'] as const) {
    for (const name of referencedVariables(draft[field])) {
      if (declared.includes(name)) continue
      issues.push({ code: 'undeclared-variable', severity: 'error', field, variable: name })
    }
  }

  const referenced = [...referencedVariables(draft.subject), ...referencedVariables(draft.body)]
  for (const name of declared) {
    if (referenced.includes(name)) continue
    issues.push({ code: 'unused-variable', severity: 'warning', field: null, variable: name })
  }

  if (options.inUse) {
    issues.push({ code: 'template-in-use', severity: 'warning', field: null, variable: null })
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    requiresConfirmation: options.inUse,
  }
}

/**
 * The template rendered with its declared sample values — **not the source**.
 * A preview that shows `{{riderName}}` has told the operator nothing they could
 * not read in the editor.
 */
export function renderEmailPreview(
  template: EmailTemplate,
  draft?: EmailTemplateDraft,
): EmailTemplatePreview {
  const subject = draft?.subject ?? template.subject
  const body = draft?.body ?? template.body
  const variables = draft?.variables ?? template.variables
  const values: Record<string, string> = {}
  for (const variable of variables) values[variable.name] = variable.sample

  const declared = variables.map((v) => v.name)
  const undeclared = [...referencedVariables(subject), ...referencedVariables(body)].filter(
    (name, index, all) => !declared.includes(name) && all.indexOf(name) === index,
  )

  return {
    templateId: template.id,
    key: template.key,
    locale: template.locale,
    dir: template.locale === 'ar' ? 'rtl' : 'ltr',
    subject: substituteVariables(subject, values),
    body: substituteVariables(body, values),
    values,
    undeclared,
  }
}

/* ───────────────────────── sender identities ───────────────────────── */

const identityShape: QueryShape<SenderIdentity> = {
  searchable: [(row) => row.displayName, (row) => row.address, (row) => row.replyTo],
  sortable: {
    address: (row) => row.address,
    displayName: (row) => row.displayName,
    verification: (row) => row.verification,
  },
  filterable: {
    verification: (row) => row.verification,
    canSend: (row) => row.canSend,
    isDefault: (row) => row.isDefault,
  },
  facetable: ['verification'],
}

/**
 * GET /api/v1/email/identities
 *   params: q · verification · page · pageSize
 *   -> Paginated<SenderIdentity>, default first
 *
 * The default identity leads because it is the one that answers "what does a
 * customer see when we mail them", and it must never be something an operator
 * has to scan a list to find.
 */
export async function listSenderIdentities(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<SenderIdentity>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<SenderIdentity>>('/email/identities', { ...params, signal: undefined }, { signal })
  }
  return mock(EMAIL_OPERATIONS.identities, signal ?? params.signal, () => {
    const ordered = [...identities].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.address.localeCompare(b.address, ['ar', 'en']),
    )
    return runQuery(ordered, params, identityShape)
  })
}

/**
 * POST /api/v1/email/identities/:id/default
 *   -> SenderIdentity[]
 *
 * Returns the **whole set**, because two rows change and a caller handed only
 * the winner has to guess which row lost. `409` when the identity cannot send:
 * an unverified address as the system default is mail that silently stops.
 *
 * **Audited, as of P6 remediation.** The type's own note called this the one of
 * the three that matters most: changing which address the product sends as is
 * invisible to everyone except the recipient, and its blast radius is every
 * transactional email sent afterwards. It wrote no audit row at all, so the act
 * with the widest reach on this screen was the one act nobody could prove had
 * happened. The entry names both sides of the swap, because a log that records
 * only the winner leaves the reader to guess which address stopped sending.
 */
export async function setDefaultSenderIdentity(
  id: string,
  actorId: string,
  signal?: AbortSignal,
): Promise<SenderIdentity[]> {
  if (DATA_SOURCE === 'http') {
    return http.post<SenderIdentity[]>(`/email/identities/${id}/default`, { actorId }, { signal })
  }
  return mockMutation(EMAIL_OPERATIONS.setDefaultIdentity, signal, () => {
    const target = identities.find((row) => row.id === id)
    if (!target) throw notFound('sender identity', id)
    if (!target.canSend) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'sender_not_verified',
        message: `Sender identity ${id} is not verified and cannot be the default sender.`,
        retryable: false,
      })
    }
    const previous = identities.find((row) => row.isDefault && row.id !== id) ?? null
    identities = identities.map((row) =>
      row.id === id
        ? { ...row, isDefault: true, updatedAt: EYVAR_NOW, updatedBy: actorId }
        : row.isDefault
          ? { ...row, isDefault: false, updatedAt: EYVAR_NOW, updatedBy: actorId }
          : row,
    )
    appendAudit({
      action: 'senderIdentity.setDefault',
      subjectType: 'senderIdentity',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      actorId,
      detail: {
        key: 'admin.audit.email.senderDefault',
        params: { address: target.address, previous: previous?.address ?? '—' },
      },
    })
    return identities.map((row) => ({ ...row }))
  })
}

/**
 * POST /api/v1/email/identities/:id/verify
 *   -> SenderIdentity
 *
 * Re-requests verification. Legal from `unverified` and from `failed`; a `409`
 * from `pending` and `verified`, because re-requesting either is a no-op the
 * operator would read as progress.
 */
export async function requestSenderVerification(
  id: string,
  actorId: string,
  signal?: AbortSignal,
): Promise<SenderIdentity> {
  if (DATA_SOURCE === 'http') {
    return http.post<SenderIdentity>(`/email/identities/${id}/verify`, { actorId }, { signal })
  }
  return mockMutation(EMAIL_OPERATIONS.verifyIdentity, signal, () => {
    const index = identities.findIndex((row) => row.id === id)
    const existing = identities[index]
    if (!existing) throw notFound('sender identity', id)
    if (existing.verification === 'pending' || existing.verification === 'verified') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'verification_not_needed',
        message: `Sender identity ${id} is already ${existing.verification}.`,
        retryable: false,
      })
    }
    const updated: SenderIdentity = {
      ...existing,
      verification: 'pending',
      verificationRequestedAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      updatedBy: actorId,
      ...senderBlock('pending'),
    }
    identities[index] = updated
    return { ...updated }
  })
}

/* ──────────────────────── transactional templates ──────────────────────── */

export interface EmailTemplateQuery extends QueryParams {
  key?: EmailTemplateKey
  locale?: EmailLocale
}

const templateShape: QueryShape<EmailTemplate> = {
  searchable: [(row) => row.name, (row) => row.subject, (row) => row.key, (row) => row.body],
  sortable: {
    key: (row) => row.key,
    name: (row) => row.name,
    updatedAt: (row) => row.updatedAt,
    version: (row) => row.version,
  },
  filterable: {
    key: (row) => row.key,
    locale: (row) => row.locale,
    status: (row) => row.status,
    inUse: (row) => row.inUse,
  },
  facetable: ['key', 'locale', 'status'],
}

/** How many deliveries reference a template. The in-use warning's number. */
function sendCountOf(templateId: string): number {
  return deliveries.filter((row) => row.templateId === templateId).length
}

/** Every template leaves this client with `sendCount` derived from the log. */
function serveTemplate(row: EmailTemplate): EmailTemplate {
  return { ...row, sendCount: sendCountOf(row.id) }
}

/**
 * GET /api/v1/email/templates
 *   params: q · key · locale · status · page · pageSize
 *   -> Paginated<EmailTemplate>
 */
export async function listEmailTemplates(
  params: EmailTemplateQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<EmailTemplate>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<EmailTemplate>>('/email/templates', { ...params, signal: undefined }, { signal })
  }
  return mock(EMAIL_OPERATIONS.templates, signal ?? params.signal, () => {
    const scoped = templates
      .filter((row) => (params.key ? row.key === params.key : true))
      .filter((row) => (params.locale ? row.locale === params.locale : true))
      .map(serveTemplate)
    return runQuery(scoped, params, templateShape)
  })
}

/**
 * GET /api/v1/email/templates/:id
 *   -> EmailTemplate
 */
export async function getEmailTemplate(id: string, signal?: AbortSignal): Promise<EmailTemplate> {
  if (DATA_SOURCE === 'http') {
    return http.get<EmailTemplate>(`/email/templates/${id}`, undefined, { signal })
  }
  return mock(EMAIL_OPERATIONS.template, signal, () => {
    const row = templates.find((template) => template.id === id)
    if (!row) throw notFound('email template', id)
    return serveTemplate(row)
  })
}

/**
 * GET /api/v1/email/templates/coverage
 *   -> EmailTemplateCoverage[]
 *
 * **Which locale is missing, answered once.** Derived from every template row
 * rather than from a page of them, because a pane that computes coverage from
 * whatever the current filter returned reports a hole that is not there.
 */
export async function listEmailTemplateCoverage(
  signal?: AbortSignal,
): Promise<EmailTemplateCoverage[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<EmailTemplateCoverage[]>('/email/templates/coverage', undefined, { signal })
  }
  return mock(EMAIL_OPERATIONS.coverage, signal, () =>
    EMAIL_TEMPLATE_KEYS.map((key) => {
      const family = templates.filter((row) => row.key === key)
      const templateIds = { en: null, ar: null } as Record<EmailLocale, string | null>
      for (const locale of EMAIL_LOCALES) {
        templateIds[locale] = family.find((row) => row.locale === locale)?.id ?? null
      }
      const present = EMAIL_LOCALES.filter((locale) => templateIds[locale] !== null)
      const missing = EMAIL_LOCALES.filter((locale) => templateIds[locale] === null)
      const named = family.find((row) => row.locale === 'en') ?? family[0]
      return { key, name: named?.name ?? key, present, missing, templateIds }
    }),
  )
}

/**
 * POST /api/v1/email/templates/:id/preview
 *   body: the unsaved draft, or nothing for the saved template
 *   -> EmailTemplatePreview
 *
 * A POST rather than a GET because the interesting preview is of a draft the
 * server has not seen, and that draft does not belong in a query string.
 */
export async function previewEmailTemplate(
  id: string,
  draft?: EmailTemplateDraft,
  signal?: AbortSignal,
): Promise<EmailTemplatePreview> {
  if (DATA_SOURCE === 'http') {
    return http.post<EmailTemplatePreview>(`/email/templates/${id}/preview`, draft, { signal })
  }
  return mock(EMAIL_OPERATIONS.preview, signal, () => {
    const row = templates.find((template) => template.id === id)
    if (!row) throw notFound('email template', id)
    return renderEmailPreview(row, draft)
  })
}

/**
 * POST /api/v1/email/templates/:id/validate
 *   -> EmailTemplateValidation
 */
export async function validateEmailTemplate(
  id: string,
  draft: EmailTemplateDraft,
  signal?: AbortSignal,
): Promise<EmailTemplateValidation> {
  if (DATA_SOURCE === 'http') {
    return http.post<EmailTemplateValidation>(`/email/templates/${id}/validate`, draft, { signal })
  }
  return mock(EMAIL_OPERATIONS.validate, signal, () => {
    const row = templates.find((template) => template.id === id)
    if (!row) throw notFound('email template', id)
    return emailTemplateIssues(draft, { inUse: row.inUse })
  })
}

/**
 * PUT /api/v1/email/templates/:id
 *   body: draft + `confirmInUse`
 *   -> EmailTemplate
 *
 * Two refusals, and they are different refusals:
 *   `422` — the draft is invalid. `details` names the field and the variable,
 *           so a form can put the message on the offending control.
 *   `409` — the draft is fine but the template is live and the operator has
 *           not confirmed. Retried with `confirmInUse`, it succeeds.
 */
export async function saveEmailTemplate(
  id: string,
  draft: EmailTemplateDraft,
  options: { confirmInUse?: boolean; actorId: string },
  signal?: AbortSignal,
): Promise<EmailTemplate> {
  if (DATA_SOURCE === 'http') {
    return http.put<EmailTemplate>(`/email/templates/${id}`, { ...draft, ...options }, { signal })
  }
  return mockMutation(EMAIL_OPERATIONS.saveTemplate, signal, () => {
    const index = templates.findIndex((template) => template.id === id)
    const existing = templates[index]
    if (!existing) throw notFound('email template', id)

    const validation = emailTemplateIssues(draft, { inUse: existing.inUse })
    if (!validation.valid) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'template_invalid',
        message: 'This template references a variable it does not declare.',
        retryable: false,
        details: validation.issues
          .filter((issue) => issue.severity === 'error')
          .map((issue) => ({
            field: issue.field ?? 'body',
            code: issue.code,
            message: issue.variable ?? issue.code,
          })),
      })
    }
    if (existing.inUse && options.confirmInUse !== true) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'template_in_use',
        message: `Template ${id} is in use by a live system event. Confirm before saving.`,
        retryable: false,
      })
    }

    const updated: EmailTemplate = {
      ...existing,
      subject: draft.subject,
      body: draft.body,
      variables: draft.variables.map((variable) => ({ ...variable })),
      version: existing.version + 1,
      updatedAt: EYVAR_NOW,
      updatedBy: options.actorId,
    }
    templates[index] = updated
    /* The version is what makes this row worth reading: a template save is
       otherwise indistinguishable from any other, and `inUse` records that the
       operator overrode a live-template warning rather than saving a draft
       nobody was sending yet. */
    appendAudit({
      action: 'emailTemplate.save',
      subjectType: 'emailTemplate',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      actorId: options.actorId,
      detail: {
        key: existing.inUse ? 'admin.audit.email.templateSavedLive' : 'admin.audit.email.templateSaved',
        params: { name: updated.name, version: String(updated.version) },
      },
    })
    return serveTemplate(updated)
  })
}

/* ───────────────────────────── delivery log ───────────────────────────── */

const deliveryShape: QueryShape<EmailDelivery> = {
  /* Searchable by recipient first, because that is what an operator has in
     front of them when a customer says "I never got it". */
  searchable: [
    (row) => row.recipient,
    (row) => row.recipientName,
    (row) => row.from,
    (row) => row.subject,
    (row) => row.id,
    (row) => row.ticketId,
  ],
  sortable: {
    queuedAt: (row) => row.queuedAt,
    updatedAt: (row) => row.updatedAt,
    recipient: (row) => row.recipient,
    state: (row) => row.state,
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    subject: (r) => r.subject,
    templateKey: (r) => r.templateKey,
    ticketId: (r) => r.ticketId,
  },
  filterable: {
    state: (row) => row.state,
    templateKey: (row) => row.templateKey,
    senderIdentityId: (row) => row.senderIdentityId,
    locale: (row) => row.locale,
    direction: (row) => row.direction,
    ticketId: (row) => row.ticketId,
  },
  facetable: ['state', 'templateKey', 'senderIdentityId'],
  /**
   * `routeTable.ts:791`'s two views, and they are **views, not endpoints**
   * (§3.8 rule 3). `all` exists for a caller that wants the whole log — the
   * ticket timeline in P5-T7 does, and it should not have to ask twice.
   */
  views: {
    outbox: (row) => row.direction === 'outbound',
    inbox: (row) => row.direction === 'inbound',
    all: () => true,
  },
}

/**
 * GET /api/v1/email/deliveries
 *   params: view=outbox|inbox|all · q · state · templateKey · sort · page · pageSize
 *   -> Paginated<EmailDelivery>, newest first
 */
export async function listEmailDeliveries(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<EmailDelivery>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<EmailDelivery>>('/email/deliveries', { ...params, signal: undefined }, { signal })
  }
  return mock(EMAIL_OPERATIONS.deliveries, signal ?? params.signal, () => {
    const newestFirst = [...deliveries].sort((a, b) => Date.parse(b.queuedAt) - Date.parse(a.queuedAt))
    return runQuery(newestFirst, params, deliveryShape)
  })
}

/**
 * POST /api/v1/email/deliveries/:id/resend
 *   -> EmailDelivery — **the new row**, queued
 *
 * The original is left exactly as it is. A log that rewrites a failure into a
 * success when someone retries it is not a log.
 */
export async function resendEmailDelivery(id: string, signal?: AbortSignal): Promise<EmailDelivery> {
  if (DATA_SOURCE === 'http') {
    return http.post<EmailDelivery>(`/email/deliveries/${id}/resend`, undefined, { signal })
  }
  return mockMutation(EMAIL_OPERATIONS.resend, signal, () => {
    const original = deliveries.find((row) => row.id === id)
    if (!original) throw notFound('email delivery', id)
    if (!original.canResend) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'resend_refused',
        message: `Delivery ${id} cannot be resent: ${original.failure?.code ?? 'it did not fail'}.`,
        retryable: false,
      })
    }
    deliverySequence += 1
    const resent: EmailDelivery = {
      ...original,
      id: `EML-${deliverySequence}`,
      state: 'queued',
      queuedAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      failure: null,
      canResend: false,
      resendOf: original.id,
    }
    deliveries = [resent, ...deliveries]
    return { ...resent }
  })
}

/* ────────────────── messaging catalogue and push broadcasts ────────────── */

const messagingShape: QueryShape<MessagingTemplate> = {
  searchable: [(row) => row.name, (row) => row.code, (row) => row.sampleText],
  sortable: { name: (row) => row.name, channel: (row) => row.channel },
  filterable: { channel: (row) => row.channel, audience: (row) => row.audience, status: (row) => row.status },
  facetable: ['channel', 'audience'],
}

/**
 * GET /api/v1/messaging/templates
 *   -> Paginated<MessagingTemplate>
 */
export async function listMessagingTemplates(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<MessagingTemplate>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<MessagingTemplate>>('/messaging/templates', { ...params, signal: undefined }, { signal })
  }
  return mock(EMAIL_OPERATIONS.messagingTemplates, signal ?? params.signal, () =>
    runQuery(messagingTemplateFixtures, params, messagingShape),
  )
}

/**
 * GET /api/v1/push/audiences
 *   -> PushAudience[]
 *
 * The composer's audience list, **with the device count**, so a broadcast's
 * delivered figure comes from the audience it went to rather than from a
 * literal in a component.
 */
export async function listPushAudiences(signal?: AbortSignal): Promise<PushAudience[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<PushAudience[]>('/push/audiences', undefined, { signal })
  }
  return mock(EMAIL_OPERATIONS.pushAudiences, signal, () => pushAudienceFixtures.map((row) => ({ ...row })))
}

/**
 * GET /api/v1/push/broadcasts
 *   -> Paginated<PushBroadcast>, newest first
 */
export async function listPushBroadcasts(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<PushBroadcast>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<PushBroadcast>>('/push/broadcasts', { ...params, signal: undefined }, { signal })
  }
  return mock(EMAIL_OPERATIONS.pushBroadcasts, signal ?? params.signal, () => {
    const newestFirst = [...broadcasts].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt))
    return paginate(newestFirst, params)
  })
}

/**
 * POST /api/v1/push/broadcasts
 *   -> PushBroadcast
 *
 * **The fabricated-number fix.** `deliveredCount` is the audience's device
 * count, and `openRate` is `null` — nobody has opened anything a second after
 * the send, and `0` would say they chose not to. The broadcast lands `queued`,
 * because that is what it is until the provider says otherwise.
 */
export async function sendPushBroadcast(
  input: { title: string; body: string; audienceId: PushAudienceId; deepLink: string | null; actorId: string },
  signal?: AbortSignal,
): Promise<PushBroadcast> {
  if (DATA_SOURCE === 'http') {
    return http.post<PushBroadcast>('/push/broadcasts', input, { signal })
  }
  return mockMutation(EMAIL_OPERATIONS.sendPush, signal, () => {
    const audience = pushAudienceFixtures.find((row) => row.id === input.audienceId)
    if (!audience) throw notFound('push audience', input.audienceId)
    broadcastSequence += 1
    const created: PushBroadcast = {
      id: `BRD-${broadcastSequence}`,
      title: input.title,
      body: input.body,
      audienceId: input.audienceId,
      deepLink: input.deepLink,
      sentAt: EYVAR_NOW,
      sentBy: input.actorId,
      state: 'queued',
      deliveredCount: audience.deviceCount,
      openRate: null,
    }
    broadcasts = [created, ...broadcasts]
    return { ...created }
  })
}

/* ─────────────────────────── QA affordances ────────────────────────────── */

/** Serve an empty delivery log — the first-run empty of both views. */
export function useNoEmailDeliveries(): void {
  deliveries = []
}

/** Serve a log with nothing left to fix: no failure, no bounce, no complaint. */
export function useCleanEmailDeliveries(): void {
  deliveries = deliveries.filter((row) => row.failure === null)
}

/** Serve zero sender identities — the state where the system cannot mail at all. */
export function useNoSenderIdentities(): void {
  identities = []
}

/** How many deliveries the log holds right now. The cheapest form of a resend assertion. */
export function emailDeliveryCount(): number {
  return deliveries.length
}

export { canResendFailure }
