/**
 * **What "ready to approve" means, in one place.**
 *
 * Three surfaces ask the same question about one application — the queue row's
 * `Approve` disposition, the review sheet's footer, and the detail page's
 * decision bar — and before this they answered it three ways. The queue gated
 * on permission and status; the page gated on permission and status; and the
 * server gated on **documents**, throwing a 422 the moment either of them let
 * an operator through. So the systemic legacy defect §11.2 exists to end — *the
 * operator clicks, waits, and is told no* — was reproduced exactly, on the one
 * screen the rewrite had already fixed it on.
 *
 * `approvalBlockers` is the predicate, and every surface renders from it. The
 * server still checks (a gate that only exists in a component is a gate a
 * second component can forget), but no operator reaches the server to find out.
 *
 * ## Why the checklist is derived rather than stored
 *
 * `Applicant` carries `docs`, `bank` and `status`; every line of the checklist
 * is a statement about those. Storing a `readyToApprove` boolean beside them
 * would be a fourth answer that can disagree with the three facts it is
 * computed from — which is the defect `types/rider.ts` opens with: *"a derived
 * value computed in three screens produces three answers."* One derivation,
 * here, from the record.
 */

import type { Applicant, ApplicantDoc, ApplicantDocStatus, DocumentType } from '@/data/types'
import { DOCUMENT_TYPES } from '@/data/types'

/**
 * R7 tones for a document's four states.
 *
 * **R5a — nothing here is red.** A rejected document is `neutral` and the WORD
 * carries it; a missing one is `neutral` too. The red on this surface is spent
 * on `Reject application`, which is a destructive button and is one of the four
 * uses R5a permits.
 */
export const DOC_STATUS_TONE: Readonly<
  Record<ApplicantDocStatus, 'success' | 'warning' | 'neutral'>
> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'neutral',
  missing: 'neutral',
}

/** The label key for a document's state. */
export const DOC_STATUS_LABEL: Readonly<Record<ApplicantDocStatus, string>> = {
  verified: 'applicant.docStatus.verified',
  pending: 'applicant.docStatus.pending',
  rejected: 'applicant.docStatus.rejected',
  missing: 'applicant.docStatus.missing',
}

/**
 * The applicant's documents in the product's declared order, **including the
 * ones that are not on the record**.
 *
 * An application missing its vehicle licence entirely has three rows in `docs`,
 * and a viewer that walked that array would simply not show the fourth — so the
 * one document nobody uploaded is the one the reviewer never sees. Walking
 * `DOCUMENT_TYPES` instead means the set is always four and an absent document
 * renders as `missing`, which is what it is.
 */
export function documentsFor(applicant: Applicant): ApplicantDoc[] {
  return DOCUMENT_TYPES.map(
    ({ key }) =>
      applicant.docs.find((doc) => doc.type === key) ?? {
        id: `${applicant.id}-${key}`,
        type: key,
        status: 'missing' as const,
        expiresOn: null,
        file: null,
        readFields: [],
        rejectionCode: null,
      },
  )
}

/** How many of the four are verified. The header's `n of m` counts this. */
export function verifiedCount(applicant: Applicant): number {
  return documentsFor(applicant).filter((doc) => doc.status === 'verified').length
}

/** One line of the approval checklist: a claim, and whether it holds. */
export interface ApprovalCheck {
  /** Stable, so a test can name a line without matching its words. */
  id: string
  labelKey: string
  /**
   * The document this line is about, where it is about one.
   *
   * The TYPE and not its label: the checklist is derived in this file and the
   * words live in the dictionary, so handing back `'id_card'` and letting the
   * renderer call `t(docLabelKey(type))` keeps §8.3's split — the data layer
   * states the enum, the UI states the word.
   */
  documentType?: DocumentType
  done: boolean
}

/**
 * **Everything that must be true before an application can be approved.**
 *
 * One line per document, plus the bank account — the four the server's 422
 * actually tests, plus the one it does not and should. Returned in full rather
 * than filtered to the failures, because a checklist that only shows what is
 * wrong cannot be read as *"this is what I checked"* by the person who has to
 * defend the decision.
 */
export function approvalChecklist(applicant: Applicant): ApprovalCheck[] {
  const checks: ApprovalCheck[] = documentsFor(applicant).map((doc) => ({
    id: `doc-${doc.type}`,
    labelKey: 'applicant.check.document',
    documentType: doc.type,
    done: doc.status === 'verified',
  }))
  checks.push({
    id: 'bank',
    labelKey: 'applicant.check.bank',
    /* The bank status is a legacy display string (`'Verified'`), so the
       comparison is on the value the record actually carries. Flagged to the
       data owner as a value that wants an enum; it is not this file's to
       change. */
    done: applicant.bank.status === 'Verified',
  })
  return checks
}

/** The types still standing between this application and an approval. */
export function openDocuments(applicant: Applicant): DocumentType[] {
  return documentsFor(applicant)
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => doc.type)
}

/**
 * The **first** document a reviewer should open — the first that is not
 * verified, in the product's declared order.
 *
 * `null` when everything is verified, which is what turns the header's `Open
 * first unreviewed` control off rather than pointing it at a document that
 * needs nothing.
 */
export function firstUnreviewed(applicant: Applicant): ApplicantDoc | null {
  return documentsFor(applicant).find((doc) => doc.status !== 'verified') ?? null
}

/**
 * §11.2 — **why `Approve captain` is refused, in one sentence, or `null`.**
 *
 * The order is D17's: the ROLE refusal outranks the state one, which outranks
 * the document one. Telling an operator *four documents are still open* when
 * the real answer is *you may not approve anything* wastes their time twice.
 */
export function approvalRefusal(
  applicant: Applicant,
  status: Applicant['status'],
  canWrite: boolean,
  t: (key: string, params?: Record<string, string>) => string,
): string | null {
  if (!canWrite) return t('people.action.noPermission')
  if (status !== 'pending' && status !== 'in-review') {
    return t('applicant.action.decided', { status })
  }
  const open = openDocuments(applicant)
  if (open.length > 0) {
    /* The sentence NAMES the documents rather than counting them. *"2 documents
       still open"* makes the operator go and find out which. AC-75 exempts this
       join: the list runs to an unknown length, so it cannot be one key, and
       `·` is the separator the Arabic dictionary already uses between values. */
    return t('applicant.action.documentsOpen', {
      documents: open.map((type) => t(`people.col.doc.${DOC_KEY[type]}`)).join(' · '),
    })
  }
  if (applicant.bank.status !== 'Verified') return t('applicant.action.bankUnverified')
  return null
}

/**
 * `DocumentType` → the suffix its label key uses.
 *
 * The keys are `people.col.doc.nationalId` and friends, which do not match the
 * enum member spelling — `types/driver.ts` records that naming wart and whose
 * it is to rename. Until it is renamed, this is the one place the two spellings
 * are joined.
 */
const DOC_KEY: Readonly<Record<DocumentType, string>> = {
  id_card: 'nationalId',
  license: 'license',
  vehicle_reg: 'vehicleReg',
  photo: 'photo',
}

/** The label key for one document type. */
export function docLabelKey(type: DocumentType): string {
  return `people.col.doc.${DOC_KEY[type]}`
}
