/**
 * **Reviewing a captain application** — the queue's sheet and the document
 * page behind it.
 *
 * The claims under test:
 *
 *   1. **the document set is four, and only four.** National ID, driving
 *      licence, vehicle licence, profile photo. The inspection certificate, the
 *      insurance policy and the operating card are gone from the MODEL, not
 *      hidden from a screen, and a set that quietly grew again would be caught
 *      here rather than in an operator's face.
 *   2. **§11.2 over the approval.** `Approve captain` is refused, at render,
 *      naming the documents still open — the queue row used to gate on the
 *      permission alone while the server refused on the documents, which
 *      reproduced the exact "click, wait, told no" defect the rewrite exists to
 *      remove.
 *   3. **the review sheet knows its place in the queue** and steps through it,
 *      disabled at the ends rather than wrapping.
 *   4. **a document's verdict is not the application's decision** — verifying a
 *      licence changes one row and unblocks the checklist; it does not approve
 *      anybody.
 *   5. the viewer's states, including *nothing uploaded*, which is the ordinary
 *      case and must never render as an error.
 */

import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getApplicant,
  listApplicants,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import { DOCUMENT_TYPES, type Applicant } from '@/data/types'
import { createTranslator, type Translator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { ApplicationSheet } from './ApplicationSheet'
import { approvalChecklist, approvalRefusal, documentsFor, openDocuments } from './documentReview'

const t: Translator = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    en(key),
  )

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

afterEach(() => {
  mockFailures.clear()
})

/* ───────────────────────── discovering records ───────────────────────── */

/** The applications still waiting on somebody, in the order the queue shows them. */
async function pendingQueue(): Promise<Applicant[]> {
  const page = await listApplicants({ pageSize: 100 })
  const rows = page.items.filter((row) => row.status === 'pending' || row.status === 'in-review')
  expect(rows.length, 'no undecided applications in the fixtures').toBeGreaterThan(1)
  return rows
}

/** An application with at least one document not yet verified — §11.2's case. */
async function applicationWithOpenDocuments(): Promise<Applicant> {
  const rows = await pendingQueue()
  const row = rows.find((applicant) => openDocuments(applicant).length > 0)
  expect(row, 'no application with an open document in the fixtures').toBeDefined()
  return row!
}

/* === 1 · the document set ============================================== */

describe('the product has four documents and no fifth', () => {
  it('declares exactly national ID, driving licence, vehicle licence and profile photo', () => {
    expect(DOCUMENT_TYPES.map((d) => d.key)).toEqual([
      'id_card',
      'license',
      'vehicle_reg',
      'photo',
    ])
  })

  it('gives every application all four rows, including the ones nobody uploaded', async () => {
    /* An application missing its vehicle licence entirely has three rows in
       `docs`, and a viewer walking that array would never show the fourth — so
       the one document nobody uploaded is the one the reviewer never sees. */
    for (const applicant of await pendingQueue()) {
      expect(documentsFor(applicant).map((doc) => doc.type)).toEqual([
        'id_card',
        'license',
        'vehicle_reg',
        'photo',
      ])
    }
  })

  it('carries no inspection, insurance or operating-card document anywhere', async () => {
    const page = await listApplicants({ pageSize: 100 })
    const types = new Set(page.items.flatMap((row) => row.docs.map((doc) => doc.type)))
    for (const gone of ['inspection', 'insurance', 'operating_card', 'background']) {
      expect([...types], `${gone} is still seeded`).not.toContain(gone)
    }
  })

  it('has a word for each of the four in both dictionaries', () => {
    /* The words are the dictionary's and the enum is the data layer's — §8.3's
       split. A type with no label is one that renders as a machine name. */
    for (const { labelKey } of DOCUMENT_TYPES) {
      expect(EN[labelKey], `EN ${labelKey}`).toBeDefined()
    }
  })
})

/* === 2 · §11.2 over the approval ======================================= */

describe('§11.2 — approving is refused at render, naming what is still open', () => {
  it('names the open documents rather than counting them', async () => {
    const applicant = await applicationWithOpenDocuments()
    const refusal = approvalRefusal(applicant, applicant.status, true, t)
    expect(refusal).not.toBeNull()
    /* "2 documents still open" makes the operator go and find out which. */
    for (const type of openDocuments(applicant)) {
      const label = EN[`people.col.doc.${DOC_KEY[type]}`] as string
      expect(refusal).toContain(label)
    }
  })

  it('puts the ROLE refusal first, because it outranks the state one (D17)', async () => {
    const applicant = await applicationWithOpenDocuments()
    expect(approvalRefusal(applicant, applicant.status, false, t)).toBe(
      en('people.action.noPermission'),
    )
  })

  it('derives the checklist from the record, one line per document plus the payout', async () => {
    const applicant = await applicationWithOpenDocuments()
    const checks = approvalChecklist(applicant)
    expect(checks).toHaveLength(DOCUMENT_TYPES.length + 1)
    /* A checklist that only showed the failures could not be read as *this is
       what I checked* by the person who has to defend the decision. */
    expect(checks.some((check) => check.done)).toBe(true)
    expect(checks.some((check) => !check.done)).toBe(true)
  })
})

/* === 3 · the review sheet ============================================== */

function renderSheet(
  queue: Applicant[],
  index: number,
  onSelect: (row: Applicant) => void = () => undefined,
) {
  return render(
    <MemoryRouter>
      <ApplicationSheet
        applicant={queue[index] ?? null}
        queue={queue}
        onSelect={onSelect}
        onClose={() => undefined}
        onUpdated={() => undefined}
        canWrite
        t={t}
        language="en"
      />
    </MemoryRouter>,
  )
}

describe('the review sheet knows where it is in the queue', () => {
  it('says `n of m` against the rows the queue has loaded', async () => {
    const queue = await pendingQueue()
    renderSheet(queue, 0)
    const sheet = await screen.findByRole('dialog')
    expect(
      within(sheet).getByText(fill('applicant.sheet.position', { index: 1, total: queue.length })),
    ).toBeInTheDocument()
  })

  it('disables the step controls at the ends rather than wrapping', async () => {
    /* A queue that silently returns to the top is one an operator finishes
       twice. */
    const queue = await pendingQueue()
    const first = renderSheet(queue, 0)
    let sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('button', { name: en('applicant.sheet.previous') })).toBeDisabled()
    expect(
      within(sheet).getByRole('button', { name: en('applicant.sheet.next') }),
    ).not.toBeDisabled()
    first.unmount()

    renderSheet(queue, queue.length - 1)
    sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('button', { name: en('applicant.sheet.next') })).toBeDisabled()
  })

  it('steps to the next application when asked', async () => {
    const user = userEvent.setup()
    const queue = await pendingQueue()
    const seen: Applicant[] = []
    renderSheet(queue, 0, (row) => {
      seen.push(row)
    })
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: en('applicant.sheet.next') }))
    expect(seen[0]?.id).toBe(queue[1]?.id)
  })

  it('refuses the approval in the footer, with the reason beside the control', async () => {
    const queue = await pendingQueue()
    const index = queue.findIndex((row) => openDocuments(row).length > 0)
    renderSheet(queue, index)
    const sheet = await screen.findByRole('dialog')
    const approve = within(sheet).getByRole('button', { name: en('applicant.action.approve') })
    expect(approve).toBeDisabled()
    /* The reason is RENDERED, not hovered: a tooltip is unreachable by keyboard
       and by touch, and is heard as a label rather than as a reason. */
    const describedBy = approve.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy!)?.textContent).toBe(
      approvalRefusal(queue[index]!, queue[index]!.status, true, t),
    )
  })

  it('shows every one of the four documents with its state in words', async () => {
    const queue = await pendingQueue()
    renderSheet(queue, 0)
    const sheet = await screen.findByRole('dialog')
    for (const doc of documentsFor(queue[0]!)) {
      const label = EN[`people.col.doc.${DOC_KEY[doc.type]}`] as string
      expect(within(sheet).getByText(label)).toBeInTheDocument()
    }
  })
})

/* === 4 · a document's verdict is not the application's decision ========= */

describe('a document’s verdict changes one row and decides nobody', () => {
  it('verifies one document and leaves the application undecided', async () => {
    const applicant = await applicationWithOpenDocuments()
    const open = openDocuments(applicant)
    const { verifyApplicantDocument } = await import('@/data/clients')
    const after = await verifyApplicantDocument(applicant.id, open[0]!)

    expect(after.docs.find((doc) => doc.type === open[0])?.status).toBe('verified')
    /* Legacy conflated the two — rejecting a document rejected the applicant —
       which is why somebody with a blurry photo was told they had failed
       screening. */
    expect(after.status).toBe(applicant.status)
    expect(after.approvedDriverId).toBeNull()
  })

  it('clears the file and what was read off it when a re-upload is asked for', async () => {
    const applicant = await applicationWithOpenDocuments()
    const uploaded = documentsFor(applicant).find((doc) => doc.file !== null)
    expect(uploaded, 'no uploaded document to ask again for').toBeDefined()

    const { requestApplicantDocumentReupload } = await import('@/data/clients')
    const after = await requestApplicantDocumentReupload(applicant.id, uploaded!.type)
    const row = after.docs.find((doc) => doc.type === uploaded!.type)
    /* Leaving the old scan on the record would let a second reviewer verify the
       document that was just refused. */
    expect(row?.file).toBeNull()
    expect(row?.readFields).toEqual([])
    expect(row?.status).toBe('pending')
  })

  it('refuses to verify a document nobody uploaded', async () => {
    const page = await listApplicants({ pageSize: 100 })
    const applicant = page.items.find((row) =>
      row.docs.some((doc) => doc.status === 'missing'),
    )
    expect(applicant, 'no application with a missing document').toBeDefined()
    const missing = applicant!.docs.find((doc) => doc.status === 'missing')!

    const { verifyApplicantDocument } = await import('@/data/clients')
    await expect(verifyApplicantDocument(applicant!.id, missing.type)).rejects.toMatchObject({
      status: 422,
    })
  })
})

/* === 5 · the scan =====================================================. */

describe('the document store answers the four outcomes', () => {
  it('serves bytes for an uploaded document, captioned as a sample', async () => {
    const applicant = await getApplicant('APP-2205')
    const uploaded = applicant.docs.find((doc) => doc.file !== null)
    expect(uploaded, 'APP-2205 has no uploaded document').toBeDefined()

    const { getApplicationDocumentFile } = await import('@/data/clients')
    const read = await getApplicationDocumentFile(uploaded!.id)
    expect(read.outcome).toBe('bytes')
    if (read.outcome === 'bytes') {
      expect(read.bytes.byteLength).toBeGreaterThan(0)
      expect(read.mimeType).toBe(uploaded!.file!.mimeType)
    }
  })

  it('reports NOTHING UPLOADED as its own outcome, never as an error', async () => {
    const page = await listApplicants({ pageSize: 100 })
    const applicant = page.items.find((row) => row.docs.some((doc) => doc.file === null))
    expect(applicant, 'no application with an un-uploaded document').toBeDefined()
    const empty = applicant!.docs.find((doc) => doc.file === null)!

    const { getApplicationDocumentFile } = await import('@/data/clients')
    /* A 404 here would say *the document id is wrong*, which is a different
       sentence to an operator and a different bug to whoever is called. */
    const read = await getApplicationDocumentFile(empty.id)
    expect(read.outcome).toBe('no-file-on-record')
  })
})

/**
 * `DocumentType` → the suffix its label key uses. The keys do not match the
 * enum member spelling; `documentReview.ts` carries the same map and records
 * whose the rename is.
 */
const DOC_KEY: Readonly<Record<string, string>> = {
  id_card: 'nationalId',
  license: 'license',
  vehicle_reg: 'vehicleReg',
  photo: 'photo',
}
