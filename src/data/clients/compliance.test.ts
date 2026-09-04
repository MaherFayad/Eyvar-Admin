/**
 * **The compliance document model's data invariants, made permanent.**
 *
 * `ComplianceDoc` grew seven fields this wave — `id`, `dateSource`,
 * `recordedAt`, `recordedByUserId`, `recordedByUserName`, `previousExpiresOn`
 * and `file`. Every one of them exists to answer the question an operator opens
 * a document to ask, and `types/driver.ts` argues each at length: *can I trust
 * this date, and is there anything behind it*.
 *
 * A type cannot answer that. `dateSource: 'auto-default'` is only meaningful
 * while `recordedByUserId` is genuinely `null` on those rows and the expiry is
 * genuinely a year out from an approval nobody read a document at. The moment a
 * fixture drifts, the field stops being provenance and becomes decoration — and
 * decoration renders in the same ink as fact, which is precisely the defect the
 * whole addition exists to end.
 *
 * These nine held when they were measured. This file makes a drift loud.
 *
 * ## Two house rules, and why they are not ceremony here
 *
 * **Everything is read through `clients/drivers.ts`, never off
 * `fixtures/compliance.ts`.** `seam.test.ts` fails a component that imports a
 * fixture; a test that asserts an invariant against the fixture module proves
 * the invariant of a module no screen can see. The compliance list is the read
 * the Compliance view makes and `getDriverCompliance` is the read the captain
 * profile makes, so those are what is asserted.
 *
 * **Every negative assertion has a positive twin.** This suite would pass
 * vacuously against an empty population — "no document has an `href`" is true
 * of no documents — and this codebase has shipped exactly that defect before, a
 * `mine` view that was green because it was always empty. So the population is
 * counted and characterised first, in `describe('the population')`, and every
 * scan below asserts it actually scanned something.
 *
 * **No `Date.now()` and no `new Date()`.** `EYVAR_NOW` is the clock and
 * `toEpochMs` is the only parser used. Calendar arithmetic below is done on
 * strings, which is exact for this dataset because every instant in it carries
 * the one Riyadh offset — asserted rather than assumed.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { EYVAR_NOW, EYVAR_TZ_OFFSET, toEpochMs } from '../mock/clock'
import type { IsoDate, IsoDateTime } from '../types/common'
import { COMPLIANCE_DOC_FILE_KIND } from '../types/driver'
import type {
  ComplianceDoc,
  ComplianceDocFile,
  ComplianceDocState,
  DriverCompliance,
} from '../types/driver'
import { getDriverCompliance, listDriverCompliance } from './drivers'

/* ── the population, read once, through the client ────────────────────── */

/** Every compliance record the resource holds. Filled in `beforeAll`. */
let records: DriverCompliance[] = []
/** Every document on every record, carrying the captain it came off. */
let docs: Array<{ driverId: string; doc: ComplianceDoc }> = []

beforeAll(async () => {
  disableMockLatency()
  /* One page big enough to hold the whole resource. `total` is asserted against
     `items.length` below — a paged read that quietly dropped half the rows
     would make every invariant in this file weaker without failing any. */
  const page = await listDriverCompliance({ pageSize: 500 })
  expect(page.items.length).toBe(page.total)
  records = page.items
  docs = records.flatMap((r) => r.docs.map((doc) => ({ driverId: r.driverId, doc })))
})

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

/* ── helpers ──────────────────────────────────────────────────────────── */

/**
 * The Riyadh calendar day an instant falls on.
 *
 * A slice is correct **only** while every instant in the dataset carries
 * `+03:00`, which `mock/clock.ts` states as the dataset's single offset. That
 * is asserted at the call, so a fixture that ships a `Z` instant fails here
 * with the reason rather than silently shifting three hours into the wrong day
 * — the exact bug `toInstant` exists to prevent one layer down.
 */
function riyadhDay(instant: IsoDateTime): IsoDate {
  expect(instant.endsWith(EYVAR_TZ_OFFSET), `${instant} is not a Riyadh instant`).toBe(true)
  return instant.slice(0, 10)
}

/** `2025-08-15` → `2026-08-15`. String arithmetic, so no clock is touched. */
function plusOneYear(day: IsoDate): IsoDate {
  return `${Number(day.slice(0, 4)) + 1}${day.slice(4)}`
}

const NOW_MS = toEpochMs(EYVAR_NOW)

/**
 * The two sources `approveDriver` writes in one pass (`:11113`). Both are
 * stamped by the same approval, which is what invariant 4 is about.
 */
const APPROVAL_SOURCES = ['application-review', 'auto-default'] as const

function approvalStamps(record: DriverCompliance): IsoDateTime[] {
  return record.docs
    .filter((d) => (APPROVAL_SOURCES as readonly string[]).includes(d.dateSource))
    .map((d) => d.recordedAt)
}

const ALL_STATES: readonly ComplianceDocState[] = ['valid', 'expiring', 'critical', 'expired']

/* ── the positive twin for everything below ───────────────────────────── */

describe('the population', () => {
  /**
   * The guard that stops the rest of this file passing against nothing. Every
   * invariant below is a `for` loop that collects failures; a loop over an
   * empty array collects none and reports green.
   */
  it('is a real population of compliance records read through the client', () => {
    expect(records.length).toBeGreaterThan(40)
    /* 153 today — 51 captains with a file, at the THREE expiring documents
       `COMPLIANCE_DOC_TYPES` now declares. It was `> 200` against a set of
       five; the floor moved with the document set rather than the guard being
       dropped, because its job is unchanged: stop every loop below passing
       against an empty array. */
    expect(docs.length).toBeGreaterThan(120)
  })

  it('reaches both kinds of empty — a captain with no documents, and documents with no scan', () => {
    /* `worstState: null` is the list's empty state and it is not `valid`.
       `types/driver.ts`: reporting `valid` for a captain with no file on record
       would be the most dangerous possible default. */
    const noFileOnRecord = records.filter((r) => r.docs.length === 0)
    expect(noFileOnRecord.length).toBeGreaterThan(0)
    for (const r of noFileOnRecord) expect(r.worstState).toBeNull()

    /* And the viewer's own empty state: a document that exists with no scan
       behind it. `types/driver.ts` requires this to stay the *common* case —
       a viewer whose empty state is rare is a viewer whose empty state was
       never built. */
    const withoutScan = docs.filter((d) => d.doc.file === null)
    expect(withoutScan.length).toBeGreaterThan(docs.length / 2)
  })

  it('serves the same documents from the captain-scoped read as from the list', async () => {
    /* One read, one answer. A viewer that re-fetches and disagrees with the
       list it was opened from is the defect `getDriverCompliance`'s docblock
       refuses a per-document route to avoid — so the two reads are pinned
       against each other rather than trusted to agree. */
    expect(records.length).toBeGreaterThan(0)
    for (const record of records.slice(0, 5)) {
      expect(await getDriverCompliance(record.driverId)).toStrictEqual(record)
    }
  })
})

/* ── 1 ────────────────────────────────────────────────────────────────── */

describe('1 — document ids are unique across the whole fixture set', () => {
  it('has no duplicate document id anywhere in the population', () => {
    /* Uniqueness is trivially true of nothing, and `seen.size === docs.length`
       below is `0 === 0` on an empty read. Guarded here rather than left to the
       population test, so this one cannot go green on its own. */
    expect(docs.length, 'no document was read — uniqueness would be vacuous').toBeGreaterThan(0)
    const seen = new Map<string, string[]>()
    for (const { driverId, doc } of docs) {
      seen.set(doc.id, [...(seen.get(doc.id) ?? []), driverId])
    }
    const duplicated = [...seen].filter(([, owners]) => owners.length > 1)
    expect(
      duplicated.map(([id, owners]) => `${id} on ${owners.join(', ')}`),
      'a document id is a React key, a `?doc=` param and the address a viewer opens — two rows sharing one is two rows the operator cannot tell apart',
    ).toEqual([])
    /* The twin: uniqueness over an empty set is trivially true. */
    expect(seen.size).toBe(docs.length)
  })
})

/* ── 2 ────────────────────────────────────────────────────────────────── */

describe('2 — dateSource is auto-default if and only if recordedByUserId is null', () => {
  /**
   * Asserted in both directions, because the field is branched on from both.
   * `types/driver.ts` states it as an iff and says *"a screen may branch on
   * either"* — a screen that reads `recordedByUserId === null` as "system
   * wrote it" and a screen that reads `dateSource === 'auto-default'` must be
   * looking at the same rows, or the two surfaces disagree about which dates
   * are guesses.
   */
  it('auto-default implies recordedByUserId is null', () => {
    const auto = docs.filter((d) => d.doc.dateSource === 'auto-default')
    expect(auto.length, 'no auto-default document exists — this direction would pass vacuously').toBeGreaterThan(0)
    expect(auto.filter((d) => d.doc.recordedByUserId !== null).map((d) => d.doc.id)).toEqual([])
  })

  it('recordedByUserId null implies auto-default', () => {
    const unattributed = docs.filter((d) => d.doc.recordedByUserId === null)
    expect(
      unattributed.length,
      'no unattributed document exists — this direction would pass vacuously',
    ).toBeGreaterThan(0)
    expect(
      unattributed.filter((d) => d.doc.dateSource !== 'auto-default').map((d) => `${d.doc.id} is ${d.doc.dateSource}`),
      'an unattributed date that is not auto-default is a date nobody can be asked about',
    ).toEqual([])
  })
})

/* ── 3 ────────────────────────────────────────────────────────────────── */

describe('3 — auto-default implies expiresOn is exactly recordedAt plus one year', () => {
  /**
   * **This is the whole mechanism, and the reason the field was added.**
   *
   * `approveDriver` fills a blank expiry with one year from the approval
   * (`:11111`–`:11113`) and the approval modal warns *"approving now will
   * default them to 1 year out"* (`:7183`). So an `auto-default` row means
   * nobody has ever read that document — and today two such rows render a green
   * `Valid` badge in the same ink as a date somebody read off paper.
   *
   * If the arithmetic drifts, the row is no longer identifiable as a guess from
   * its own two fields, and the only remaining evidence that nobody read the
   * document is a string enum that could have been set by anything.
   */
  it('every auto-default expiry is its approval day, one year on', () => {
    const auto = docs.filter((d) => d.doc.dateSource === 'auto-default')
    expect(auto.length).toBeGreaterThan(0)
    expect(
      auto
        .filter(({ doc }) => doc.expiresOn !== plusOneYear(riyadhDay(doc.recordedAt)))
        .map(({ doc }) => `${doc.id}: recorded ${doc.recordedAt}, expires ${doc.expiresOn}`),
      'an auto-defaulted expiry that is not a year out is not the value approveDriver writes, so something typed it',
    ).toEqual([])
  })
})

/* ── 4 ────────────────────────────────────────────────────────────────── */

describe('4 — application-review and auto-default share one recordedAt per captain', () => {
  it('stamps every approval-written document on a captain at one instant', () => {
    const wrong: string[] = []
    let captainsChecked = 0
    for (const record of records) {
      const stamps = new Set(approvalStamps(record))
      if (stamps.size === 0) continue
      captainsChecked += 1
      /* `approveDriver` creates all five records in one pass (`:11113`). Five
         different stamps on one captain would describe five approvals of one
         captain, which is not a thing that happened. */
      if (stamps.size > 1) wrong.push(`${record.driverId}: ${[...stamps].sort().join(' / ')}`)
    }
    expect(captainsChecked).toBeGreaterThan(40)
    expect(wrong).toEqual([])
  })
})

/* ── 5 ────────────────────────────────────────────────────────────────── */

describe('5 — every ops-entry is strictly after the approval instant', () => {
  /**
   * A correction cannot predate the record it corrects, and it cannot land on
   * the same instant either — that would be a re-entry of a date nobody had
   * typed yet. `saveDriverDocDates` (`:13366`) is reachable only from
   * Compliance, which is reachable only for an approved captain.
   */
  it('records no ops-entry at or before the approval that created the file', () => {
    const wrong: string[] = []
    let compared = 0
    for (const record of records) {
      const opsEntries = record.docs.filter((d) => d.dateSource === 'ops-entry')
      if (opsEntries.length === 0) continue
      const stamps = approvalStamps(record)
      if (stamps.length === 0) {
        /* Not skipped quietly: a captain whose file is entirely re-entries has
           no approval instant to be after, and that is a finding about the
           fixture rather than a test that does not apply. */
        wrong.push(`${record.driverId}: has ops-entry rows and no approval-stamped row to compare against`)
        continue
      }
      const approvedAtMs = Math.max(...stamps.map(toEpochMs))
      for (const doc of opsEntries) {
        compared += 1
        if (toEpochMs(doc.recordedAt) <= approvedAtMs) {
          wrong.push(`${doc.id}: re-entered ${doc.recordedAt}, approved at or after it`)
        }
      }
    }
    expect(compared, 'no ops-entry document exists — this would pass vacuously').toBeGreaterThan(0)
    expect(wrong).toEqual([])
  })
})

/* ── 6 ────────────────────────────────────────────────────────────────── */

describe('6 — previousExpiresOn is non-null if and only if dateSource is ops-entry', () => {
  /**
   * Both directions, and each is a different lie if it breaks.
   *
   * A `previousExpiresOn` on an approval-written row claims a date was
   * corrected when the record has only ever held one; an `ops-entry` with a
   * null previous throws away the `old → new` pair legacy builds to log the
   * change (`:13368`) — which is the second question an operator asks when a
   * suspension lifts the moment somebody edits a field.
   */
  it('every ops-entry carries the expiry it replaced', () => {
    const opsEntries = docs.filter((d) => d.doc.dateSource === 'ops-entry')
    expect(opsEntries.length).toBeGreaterThan(0)
    expect(opsEntries.filter((d) => d.doc.previousExpiresOn === null).map((d) => d.doc.id)).toEqual([])
  })

  it('no document that is not an ops-entry carries a previous expiry', () => {
    const withPrevious = docs.filter((d) => d.doc.previousExpiresOn !== null)
    expect(withPrevious.length, 'no document carries a previous expiry — this would pass vacuously').toBeGreaterThan(0)
    expect(
      withPrevious.filter((d) => d.doc.dateSource !== 'ops-entry').map((d) => `${d.doc.id} is ${d.doc.dateSource}`),
    ).toEqual([])
  })
})

/* ── 7 ────────────────────────────────────────────────────────────────── */

describe('7 — no recordedAt and no uploadedAt is stamped after EYVAR_NOW', () => {
  /**
   * The fixed clock is `2026-06-25T09:14:00+03:00`, and it is the legacy app's
   * own internal today. A record stamped after it describes something that has
   * not happened — and it would render as *"recorded 4 days ago"* by a helper
   * that floors a negative, which reads as a fact rather than as nonsense.
   */
  it('records no expiry date in the future of the fixed clock', () => {
    expect(docs.length).toBeGreaterThan(0)
    expect(
      docs
        .filter(({ doc }) => toEpochMs(doc.recordedAt) > NOW_MS)
        .map(({ doc }) => `${doc.id}: recorded ${doc.recordedAt}, now is ${EYVAR_NOW}`),
    ).toEqual([])
  })

  it('uploads no scan in the future of the fixed clock', () => {
    const withFile = docs.filter((d) => d.doc.file !== null)
    expect(withFile.length, 'no document has a file — this would pass vacuously').toBeGreaterThan(0)
    expect(
      withFile
        .filter(({ doc }) => toEpochMs((doc.file as ComplianceDocFile).uploadedAt) > NOW_MS)
        .map(({ doc }) => `${doc.id}: uploaded ${(doc.file as ComplianceDocFile).uploadedAt}`),
    ).toEqual([])
  })
})

/* ── 8 ────────────────────────────────────────────────────────────────── */

describe('8 — no href-like key exists on any file object', () => {
  /**
   * **A guard against a future well-meaning addition, and the only test here
   * that is about a field that does not exist.**
   *
   * There are no bytes in this product. Legacy's own document viewer is a
   * striped rectangle captioned *"Simulated scan preview"* (`:10893`), and
   * `types/driver.ts` argues the refusal in full: a URL under the mock could
   * only point at a fabricated scan — which `design/people-captain-profile.md`
   * §6.4 forbids outright — or at nothing, which reads to an operator as *"the
   * system is broken"* rather than *"we do not hold this"*. Those are opposite
   * diagnoses and an operator acts differently on each.
   *
   * The scan is **structural, over the real objects**, not a type assertion:
   * a type says what may be declared, and this is about what a fixture actually
   * carries. `Object.keys` on every file the resource serves is the only form
   * of this test that catches an excess property riding across the seam.
   *
   * `ComplianceDoc` itself is scanned too. The refused field is `file.href` in
   * the spec, but the same well-meaning addition lands on the document just as
   * easily, and it is the same defect one level up.
   */
  const FORBIDDEN = ['href', 'url', 'thumbnailUrl', 'previewUrl']
  /* Broader than the four named, so `fileUrl`, `downloadUri` and `assetSrc`
     are caught by the same test rather than by a fifth string added later. */
  const URLISH = /(href|url|uri|src)/i

  it('the file objects being scanned exist and are fully populated', () => {
    /* The positive twin, and the reason it is a separate test: "no href found"
       is true of an empty array, and this suite has to prove it was not one. */
    const files = docs.filter((d) => d.doc.file !== null).map((d) => ({ id: d.doc.id, file: d.doc.file! }))
    expect(files.length).toBeGreaterThan(0)

    const malformed: string[] = []
    for (const { id, file } of files) {
      if (Object.keys(file).length === 0) malformed.push(`${id}: file is an empty object`)
      if (file.name.trim() === '') malformed.push(`${id}: file has no name`)
      if (!(file.mimeType in COMPLIANCE_DOC_FILE_KIND)) malformed.push(`${id}: ${file.mimeType} has no display kind`)
      if (!Number.isInteger(file.sizeBytes) || file.sizeBytes <= 0) malformed.push(`${id}: sizeBytes ${file.sizeBytes}`)
      if (file.uploadedByUserName.trim() === '') malformed.push(`${id}: file has no uploader name`)
      /* `uploadedAt` is parsed rather than pattern-matched — `toEpochMs` throws
         on garbage rather than yielding NaN silently. */
      expect(() => toEpochMs(file.uploadedAt), `${id}: uploadedAt`).not.toThrow()
    }
    expect(malformed).toEqual([])
  })

  it('carries no href, url, thumbnailUrl or previewUrl on any file or document object', () => {
    const offences: string[] = []
    let scannedFiles = 0
    for (const { doc } of docs) {
      const objects: Array<[string, object]> = [[`${doc.id}`, doc]]
      if (doc.file !== null) {
        scannedFiles += 1
        objects.push([`${doc.id}.file`, doc.file])
      }
      for (const [where, object] of objects) {
        for (const key of Object.keys(object)) {
          if (FORBIDDEN.includes(key) || URLISH.test(key)) offences.push(`${where}.${key}`)
        }
      }
    }
    expect(scannedFiles, 'no file object was scanned — the absence below would be vacuous').toBeGreaterThan(0)
    expect(
      offences,
      'there are no bytes in this product, so such a key could only point at a fabricated scan or at nothing',
    ).toEqual([])
  })
})

/* ── 9 ────────────────────────────────────────────────────────────────── */

describe('9 — every state × file/no-file combination is reachable', () => {
  /**
   * **Non-empty, not exact.** A count assertion fails the day somebody seeds
   * one more document, which is not a defect — but a cell falling to zero *is*,
   * because it makes a combination the viewer must render unreachable from the
   * data, and an unreachable state is an unbuilt state.
   *
   * `expired` is the cell to watch: one document with a scan and one without,
   * and both are hand-written. `fixtures/compliance.ts` constructs the 43-row
   * filler so it can never expire a document, deliberately, because
   * `navCounts.test.ts` pins the lapsed half of the `operations-people` badge
   * at exactly 2. That count is load-bearing across two files and is already
   * asserted in one of them; it is not duplicated here.
   */
  const cells = ALL_STATES.flatMap((state) => [
    [state, true] as const,
    [state, false] as const,
  ])

  it.each(cells)('reaches state %s with a file on record: %s', (state, withFile) => {
    const matching = docs.filter((d) => d.doc.state === state && (d.doc.file !== null) === withFile)
    expect(
      matching.map((d) => d.doc.id).slice(0, 3),
      `no ${state} document ${withFile ? 'with' : 'without'} a scan — the viewer cannot be built against this combination`,
    ).not.toEqual([])
  })

  it('accounts for every document in exactly one cell', () => {
    /* The twin for the eight above: eight non-empty cells could still leave
       documents in a ninth if `state` ever grew a member the matrix does not
       name. */
    expect(docs.length).toBeGreaterThan(0)
    const counted = cells.reduce(
      (sum, [state, withFile]) =>
        sum + docs.filter((d) => d.doc.state === state && (d.doc.file !== null) === withFile).length,
      0,
    )
    expect(counted).toBe(docs.length)
  })
})

/* ── beyond the nine ──────────────────────────────────────────────────── */

/**
 * Two checks that were not on the brief, both stated as rules in
 * `types/driver.ts` and both one line to guard. Recorded separately so the nine
 * above stay exactly the nine that were measured.
 */
describe('beyond the nine — two rules the type states in prose', () => {
  it('keeps recordedByUserName in step with recordedByUserId', () => {
    /* *"The operator's name, denormalised for display. `null` with
       `recordedByUserId`."* A name without an id is a display string nobody can
       be asked about; an id without a name renders as a raw `USR-5`. */
    expect(docs.length).toBeGreaterThan(0)
    expect(
      docs
        .filter(({ doc }) => (doc.recordedByUserId === null) !== (doc.recordedByUserName === null))
        .map(({ doc }) => `${doc.id}: id ${doc.recordedByUserId}, name ${doc.recordedByUserName}`),
    ).toEqual([])
  })

  it('stores a display name on every file and never a path or a URL', () => {
    /* `ComplianceDocFile.name` — *"Display name, as it was uploaded. **Never a
       path and never a URL**"*. The same ruling as invariant 8, one field over:
       a URL smuggled into `name` is a URL the product does not have. */
    const files = docs.filter((d) => d.doc.file !== null)
    expect(files.length).toBeGreaterThan(0)
    expect(
      files
        .filter((d) => /:\/\//.test(d.doc.file!.name) || d.doc.file!.name.startsWith('/'))
        .map((d) => `${d.doc.id}: ${d.doc.file!.name}`),
    ).toEqual([])
  })
})
