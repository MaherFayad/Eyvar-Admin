/**
 * Captain (driver) — Operations › People, view *Captains*.
 *
 * Derived from `DB.drivers` (`eyvar_ops_panel_v40_fixed.html:2633`–`:2673`) and
 * from `renderDriversTable()` (`:6344`), which is what actually decides which
 * fields are real.
 *
 * Four legacy shapes are corrected on the way across the seam, each noted at
 * the field:
 *   money strings   `'2,840 SAR'`  → integer halalas
 *   date strings    `'Feb 2025'`   → ISO
 *   derived status  three booleans → one server-returned enum
 *   `stats.activeSubs: '4/5'`      → two integers
 */

import type { Halalas, IsoDate, IsoDateTime, LocalisedText, RelatedCount } from './common'
import type { AccountKey, PostingDirection, SettlementState } from './ledger'
import type { ProfileEntityType } from './profile'

/** Legacy `lvl` (`:2634`), rendered as the tier badge. `renderDriversTable` also computes a fifth bucket. */
export type DriverTier = 'gold' | 'silver' | 'standard'

/**
 * **Derived in legacy, a server field here.** `renderDriversTable` (`:6394`)
 * computes the status cell from three independent signals:
 *   `d.suspended`                                   → Suspended
 *   open complaints ∨ `flaggedForDeclines` ∨ `manualFlag` → Under review
 *   otherwise                                       → Active
 * plus a `status !== 'pending'` filter on the collection itself (`:6346`).
 *
 * Recomputing that in three screens guarantees three answers, so the API owns
 * it. The contributing flags stay on the record because the detail page shows
 * *why*.
 *
 * Badge tones (R7, five-tone palette): active → `success`, under-review →
 * `warning`, suspended → `neutral` (**there is no red badge** — a suspension is
 * a standing condition and gets the §8.4 row marker, not a sixth tone),
 * pending → `new`.
 */
export type DriverStatus = 'active' | 'under-review' | 'suspended' | 'pending'

/**
 * **There is no `churnRisk` twin on a captain, and that is a finding rather
 * than a gap this file should fill.**
 *
 * Recorded here because it will be asked again. `Rider.churnRisk` /
 * `churnReason` are a *prediction* promoted to a server field. Nothing on
 * `Driver` is a prediction: `suspended`, `flaggedForDeclines`, `manualFlag` and
 * `openComplaints` are all facts that have already happened, and `status` is
 * the enum derived from them.
 *
 * **The domain does have the concept.** Legacy `driverRiskScore(drvId)`
 * (`eyvar_ops_panel_v40_fixed.html:14283`–`:14306`) is *"Driver availability
 * risk"*, it returns `{score, reasons[]}` exactly as `riderChurnRisk` does, it
 * is rendered on the Predictive page through the same `healthBand()`
 * (`:14231`), and `fixtures/metrics.ts` already seeds
 * `management.risk.atRiskCaptains` with the comment *"`driverRiskScore` below
 * 80"*. So the absence is not that nobody thought of it.
 *
 * **It is not modelled, for three reasons, and all three are somebody else's to
 * settle:**
 *
 *   1. **Its weights are unstated policy.** −40 for an expired document, −30
 *      for a suspension, −15 per open dispute or incident, −20 for a repeat
 *      cash pattern, −10 for two plans with no backup. No spec carries a single
 *      one of those numbers. Reproducing them here would mint product policy in
 *      a mock data layer.
 *   2. **One of its bands is already a reported defect.** It buckets on
 *      *"expires within 14 days"*, and `docs/01-modules/10d-compliance.md` §11
 *      calls that *"a third, undocumented urgency band"* that exists in no
 *      Compliance rule and in no UI label — while `ComplianceDocState` above
 *      buckets at 7 and 30. Shipping the score ships the contradiction.
 *   3. **The tile it feeds is a recorded literal.** `management.risk
 *      .atRiskCaptains` is seeded at `3` and nothing derives it. Deriving it
 *      would move a metric that a board asserts, which is a change with an
 *      owner, and that owner is not this file.
 *
 * **The profile does not need it.** Everything the score is computed *from* is
 * already served, first-hand: `DriverCompliance.worstState` and its documents,
 * `suspended` + `suspensionReason`, `DriverSupportPresence.disputes` /
 * `.safetyIncidents` / `.fairnessCases`, and `DriverMoneyMovements
 * .cashDebtHalalas`. A captain's standing can be *stated* without a score being
 * *invented*, which is the better answer for a screen an operator acts from.
 */

/** Legacy `type` (`:2634`). Two vehicle classes, everywhere in the product. */
export type VehicleClass = 'Economy' | 'Comfort'

/** Legacy `bank.status` (`:2637`). */
export type BankAccountStatus = 'Verified' | 'Pending verification' | 'Rejected'

/**
 * Legacy `planAccess` — only `'terminated'` is ever written (`:6379`), the other
 * states are implied by its absence. Named here so the enum is complete rather
 * than "the string or undefined".
 */
export type PlanAccess = 'granted' | 'frozen' | 'terminated'

export interface BankAccount {
  bankName: string
  iban: string
  holder: string
  status: BankAccountStatus
}

/** Legacy `bankHistory[]` (`:2653`) — present on exactly one seeded driver. */
export interface BankAccountChange extends BankAccount {
  replacedAt: IsoDate
  reason: string
}

/** Legacy `movementLog[]` (`:2634`), on every person record. `{date,action,location}`. */
export interface MovementLogEntry {
  at: IsoDate
  action: string
  location: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  /** Riders have none; drivers do (`:2634`). Nullable because the applicant flow does not require one. */
  email: string | null
  /**
   * `0` is a real, seeded value meaning **no rating yet** — `RDR-2090` carries
   * `rating: 0` (`:2607`) and the renderer branches on it (`:6393`). It is not
   * a zero-star rating, and `null` would be the honest wire form; kept as
   * `number | null` so the distinction survives.
   */
  rating: number | null
  tier: DriverTier
  status: DriverStatus
  /** `'Corolla 2022 · White'` — one display string in legacy, and genuinely one field. */
  vehicle: string
  vehicleClass: VehicleClass
  /** Legacy `joined: 'Feb 2025'` — month precision only, so the day is 01. */
  joinedAt: IsoDate
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  city: string
  address: string
  /** `'iPhone 14 · iOS 17.4'` (`:2634`). */
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string

  bank: BankAccount
  /** Empty for most; one seeded driver has a change record (`:2653`). */
  bankHistory: BankAccountChange[]
  movementLog: MovementLogEntry[]

  /* ── subscription capacity ─────────────────────────────────────────── */
  /** Legacy `stats.activeSubs: '4/5'` split into two integers. A string here cannot be compared or sorted. */
  activeSubscriptions: number
  maxSubscriptions: number
  /** Legacy `multiSubException` (`:2634`) — a per-driver override of the ops limit. */
  multiSubException: boolean

  /* ── flags feeding `status` ────────────────────────────────────────── */
  suspended: boolean
  /** Why, for the banner. `null` when not suspended. Legacy `DB.complianceSuspensions[driverId]` (`:13285`). */
  suspensionReason: string | null
  planAccess: PlanAccess
  /** Legacy `planFreezeUntilMs` — epoch in legacy, ISO here. `null` when not frozen. */
  planFrozenUntil: IsoDateTime | null
  flaggedForDeclines: boolean
  manualFlag: boolean
  openComplaints: number

  /* ── performance ───────────────────────────────────────────────────── */
  totalTrips: number
  /** Legacy `stats.monthEarn: '2,840 SAR'` → halalas. Formatting is the UI's (§8.3). */
  monthEarningsHalalas: Halalas
  /** Legacy `stats.onTime: '96%'` → integer percent. `null` when there is no history to compute from. */
  onTimePercent: number | null
  /** Legacy `capacity: '1 open' | 'Full'` → the number. `Full` is `0`. */
  openSubscriptionSlots: number
  /** `null` for a captain who has never driven — a real fixture case. */
  lastTripAt: IsoDateTime | null

  /** Related ids. The profile's sections fetch their own data from these. */
  tripIds: string[]
  paymentIds: string[]
  complaintIds: string[]
}

/* ── The document set ──────────────────────────────────────────────────── */

/**
 * **Four documents. There is no fifth, and that is the product's ruling, not a
 * subset of a larger list.**
 *
 * | key | what it is |
 * |---|---|
 * | `id_card`     | Saudi national ID |
 * | `license`     | driving licence |
 * | `vehicle_reg` | vehicle licence — the istimara |
 * | `photo`       | profile photo |
 *
 * Legacy carried three more — a periodic inspection certificate (`fahs`), an
 * insurance policy and a transport-authority operating card — and they are
 * **removed from the model rather than hidden from a screen**. The distinction
 * matters: a hidden type still expires, still drags a captain's `worstState`
 * down, still shows up in a nav badge and still has to be answered for in an
 * approval. A type nobody may upload must not be able to do any of that, so it
 * does not exist here.
 *
 * The order is the order every surface reads them in — identity first, then
 * the two licences, then the photo, which is the order an operator checks an
 * application in.
 */
export type DocumentType = 'id_card' | 'license' | 'vehicle_reg' | 'photo'

/**
 * The four, with their label key and whether the thing physically expires.
 *
 * ## `label` was English prose in the data layer. It is `labelKey`.
 *
 * Reported by the i18n owner (`i18n/vocabulary/copy.ts:619`): this constant
 * carried `'Vehicle registration (Istimara)'` and four more hard-coded English
 * strings, so **a document type was untranslatable for anything that read the
 * constant**. Nothing did — which is the other half of the defect. Three
 * surfaces each kept a private copy of the same words rather than read a
 * constant that could only speak English.
 *
 * The rule it restores is §8.3's, one layer up: the data layer states the enum
 * and its order, the UI states the words — exactly as money travels as halalas
 * and is formatted at the edge.
 *
 * ## `expires` is a property of the document, not of a screen
 *
 * A profile photo has no expiry date, and every surface that asks "when does
 * this lapse" has to know that about it. Answering the question here means the
 * compliance collection, the applicant's checklist and the captain's document
 * list all take the same answer instead of each hard-coding *"except the
 * photo"*.
 *
 * The `people.col.*` namespace is a column header being read as a document
 * name. That naming wart is recorded at `i18n/vocabulary/copy.ts:615` and is
 * the i18n owner's to rename; a second spelling would be worse than a `col.` in
 * a key.
 */
export const DOCUMENT_TYPES: ReadonlyArray<{
  key: DocumentType
  labelKey: string
  expires: boolean
}> = [
  { key: 'id_card', labelKey: 'people.col.doc.nationalId', expires: true },
  { key: 'license', labelKey: 'people.col.doc.license', expires: true },
  { key: 'vehicle_reg', labelKey: 'people.col.doc.vehicleReg', expires: true },
  { key: 'photo', labelKey: 'people.col.doc.photo', expires: false },
]

/** The label key for one document type, so no screen keeps its own map. */
export function documentLabelKey(type: DocumentType): string {
  return DOCUMENT_TYPES.find((d) => d.key === type)?.labelKey ?? 'people.col.doc.license'
}

/* ── Compliance: Operations › People, view *Compliance* ────────────────── */

/**
 * Separate resource, separate client, **same screen**. Compliance is document
 * expiry per captain (`DB.driverDocs`, `:13278`); it is not a field on `Driver`
 * because the two are different queries with different cardinality, and fusing
 * them because they share a route is the mistake §5.1 warns about.
 *
 * **It is the three documents that expire, not all four.** A profile photo has
 * no date, so a compliance row for one could only carry a null expiry — and a
 * nullable `expiresOn` on every row, so that one type may opt out of the only
 * question the collection exists to answer, is a worse model than a narrower
 * type. `Exclude` derives it, so adding a fifth document with `expires: true`
 * cannot forget to widen this.
 */
export type ComplianceDocType = Exclude<DocumentType, 'photo'>

/**
 * The expiring subset of `DOCUMENT_TYPES`, in the same order.
 *
 * The keys are listed rather than filtered because `filter` cannot narrow
 * `DocumentType` to `ComplianceDocType` — the predicate would have to assert
 * what it claims to prove. The **labels** are still derived, so the three words
 * have one home; only the membership is restated, and `ComplianceDocType`
 * fails to compile if it drifts from this list.
 */
export const COMPLIANCE_DOC_TYPES: ReadonlyArray<{ key: ComplianceDocType; labelKey: string }> = (
  ['id_card', 'license', 'vehicle_reg'] as const
).map((key) => ({ key, labelKey: documentLabelKey(key) }))

/**
 * Legacy `docState(days)` (`:13291`) buckets by days remaining:
 *   `< 0` expired · `≤ 7` critical · `≤ 30` expiring · else valid.
 *
 * The buckets are the domain's, so they are a field. The **days remaining** is
 * not — it depends on the clock and is computed by the UI from `expiresOn`
 * against a passed clock, never from a module-scope `Date.now()`.
 *
 * Tones (R7): valid → `success`, expiring → `warning`, critical → `warning`
 * (**one warning tone**, R17 — separate the two with the label, not a second
 * fill), expired → `neutral` plus the §8.4 row marker.
 *
 * ## Three bucketings are live at once, and §6.2 is about to print one of them
 *
 * `design/people-captain-profile.md` §6.2 requires the expanded row to state
 * how the bucket was derived — *"Marked expiring because 30 days or fewer
 * remain."* That is the right call under §8.2, and it turns three quiet
 * disagreements into things an operator can see. Measured across the 255 seeded
 * documents rather than asserted:
 *
 * **1. The 14-day band — 8 documents, and no label for any of them.**
 * `driverRiskScore` (`:14289`) buckets on `worst <= 14` and scores −20 with the
 * reason *"Document expires in N days"*. Nothing in Compliance has a 14-day
 * boundary; `docs/01-modules/10d-compliance.md` §11 calls it *"a third,
 * undocumented band"* and it is why `Driver`'s header refused to model the
 * score. Eight seeded documents sit inside it and read only `Expiring` on the
 * table — `DRV-0102`'s insurance at 10 days and `DRV-0105`'s registration at 13
 * are the two on named captains. So a captain can be *"at risk"* on Predictive
 * Signals and *"Expiring"* on Compliance, on the same document, on the same
 * day, and neither surface says why. **Product-owner's to settle**: either the
 * risk score adopts 7/30, or Compliance grows a fourth band and this union
 * grows a member. It is not settled here.
 *
 * **2. The day count itself differs from legacy's on every single row.**
 * Legacy `docDaysLeft` (`:13287`) subtracts `REQ_NOW_REF`, which carries a
 * time-of-day (09:14), so it floors *one lower* than a calendar difference —
 * `10d-compliance.md:90` states the rule and works the example: expiry
 * `2026-07-19` is **23** days out, where the profile's `daysUntil`
 * (`profile/driver/facts.tsx`) floors both instants to their Riyadh calendar day
 * and renders **24**. That divergence is deliberate and argued at the helper —
 * a document expiring later today must read *"Expires today"* and not *"0 days
 * left"* or *"1 day left"* depending on the hour the page was opened — and this
 * file's fixtures bucket on the same calendar convention, so **the badge, the
 * countdown and §6.2's sentence agree on all 255 rows.** Recorded because the
 * module doc's numbers are one lower throughout, and "fixing" the countdown to
 * match it would break the agreement rather than restore it.
 *
 * **3. Two documents change bucket between the two conventions.** Both expire
 * `2026-07-26` — `DRV-0315`'s operating card and `DRV-0334`'s insurance — 31
 * calendar days out and `valid` here, 30 and `expiring` under legacy's floor.
 * They are the rows where mixing the conventions becomes visible as nonsense:
 * *"31 days left"* under *"Marked expiring because 30 days or fewer remain."*
 * Nothing in this codebase mixes them today; they are named so a future change
 * to either side has a test case waiting.
 */
export type ComplianceDocState = 'valid' | 'expiring' | 'critical' | 'expired'

/**
 * **Where `expiresOn` came from.** Three values, all three legacy's own, and
 * the field that makes a document worth opening at all.
 *
 * A compliance date is not a fact the platform observed — it is a date a human
 * read off a piece of paper, *or did not*. Legacy is unusually explicit about
 * this, in a header comment of its own (`:11085`):
 *
 * > *"document expiry dates were either missing entirely (application stage:
 * > verified/pending only, no date) or auto-guessed a year out (Compliance's
 * > old 'mark renewed'). Ops now enters the ACTUAL expiry date read off each
 * > document."*
 *
 *   `application-review`  ops typed it on the application, off the document —
 *                         `saveDocExpiry` writes `a.docExpiry` (`:11035`) and
 *                         `approveDriver` copies it into `DB.driverDocs`
 *                         (`:11113`).
 *   `ops-entry`           ops typed it later, from Compliance —
 *                         `saveDriverDocDates` (`:13366`), which logs the
 *                         `old → new` pair (`:13368`).
 *   `auto-default`        **nobody typed it.** `approveDriver` fills any blank
 *                         with `defaultExpiry`, one year from the approval
 *                         (`:11111`–`:11113`), and the approval modal warns
 *                         *"approving now will default them to 1 year out"*
 *                         (`:7183`).
 *
 * **`auto-default` is a guess wearing a date, and today it is indistinguishable
 * from a fact.** That is the operational point: a captain whose operating card
 * "expires" 364 days from approval is not compliant — nobody has ever looked at
 * the card. Rendering that date next to one read off a document, in the same
 * grey, is the defect a document viewer exists to end.
 *
 * This is the same shape as `LegAckSource` (`types/assurance.ts:60`) and for
 * the same reason: *"three different things that all look like a tick until
 * someone disputes the leg"*.
 *
 * **No tone is assigned here.** Whether `auto-default` earns a badge, a caption
 * or nothing is product-designer's call under R7 — the data layer states the
 * provenance and does not decide how loud it is.
 *
 * Legacy `markDocRenewed` (`:13371`) is a **fourth** writer that also guesses a
 * year out, and it is **not modelled**: the Compliance page's button calls
 * `openDocDateEditor` (`:13352`), nothing calls `markDocRenewed`, and it is
 * dead code its own replacement comment describes as *"the old 'guess a year
 * out' shortcut"* (`:13364`). A value for a code path that cannot run would be
 * a state QA could never reach.
 */
export type ComplianceDocDateSource = 'application-review' | 'ops-entry' | 'auto-default'

/**
 * **The record of an uploaded scan. Never the scan.**
 *
 * ## The ruling, stated where it will be read
 *
 * There is **no image and no PDF anywhere in this product**, mock or legacy,
 * and this type must not create the impression that there is. Legacy says so
 * itself, in the only surface that ever claimed to show a document —
 * `zoomDoc()` (`:10893`) paints a diagonal-striped rectangle and captions it:
 *
 * > *"Simulated scan preview — full document viewer would render the uploaded
 * > file here."*
 *
 * So the honest model is the **record row a real system holds beside the
 * object**, and not the object: a name, a type, a size, when it arrived and who
 * sent it. That row is a true statement about data we have. A `fileUrl` would
 * be a true-looking statement about data we do not, and a placeholder scan
 * would be worse than either — an operator who is taught that the viewer shows
 * a licence will read the next placeholder as a licence too.
 *
 * **There is deliberately no `url`, `href`, `thumbnailUrl` or `previewUrl` on
 * this type.** Fetching the bytes is a separate, streaming, separately-permitted
 * read against an object store, and it does not exist. When it does it is one
 * route on this record — the id is already here — and adding it is a one-line
 * change to this interface plus one client function. Declaring it now would
 * ship a field every screen would have to special-case as "always null", which
 * is how a placeholder becomes permanent.
 *
 * ## Why a file reference is evidenced rather than invented
 *
 * `DB.driverDocs` (`:13278`) holds five dates and nothing else, so none of the
 * fields below is read off a legacy record. What *is* read off legacy is the
 * **existence of an upload**, and it is not a guess: the document-rejection
 * reason codes (`:10871`) are
 *
 *   `Photo unclear / blurry` · `Document expired` · `Mismatch with national ID`
 *   `Wrong document type uploaded` · `Suspected forgery`
 *
 * Three of those five are unreadable unless somebody uploaded a file and looked
 * at it. `docsGrid` invites *"Tap to preview"* (`:7126`) and `zoomDoc` opens the
 * viewer this type is the record for. The upload is real; only the bytes are
 * missing, and this type says exactly that.
 *
 * **`null` is the common case and must stay the common case.** Legacy's
 * `DB.driverDocs` tracks a date per document and never a file, so most rows
 * have no file on record. A viewer whose empty state is rare is a viewer whose
 * empty state was never built.
 */
export interface ComplianceDocFile {
  /**
   * Display name, as it was uploaded. **Never a path and never a URL** —
   * `design/people-captain-profile.md` §6.5 names the field and that
   * constraint, and both are kept.
   *
   * It is data, not copy: never translated, never transliterated, and it
   * renders in whichever script it was saved in. `DRV-0201` carries two Arabic
   * names, one with Arabic-Indic digits, which is the hardest bidi case on the
   * surface and is seeded rather than discovered in production.
   */
  name: string
  /**
   * What the operator's browser would be handed. Three values, because a phone
   * camera and a broker's PDF are what actually arrive.
   *
   * **§6.5 asked for `kind: string` — `'PDF'`, `'JPG'`, uppercase in the data —
   * and that is refused, with a replacement rather than a shrug.** A display
   * form stored in a record is the defect this same wave removed one screen
   * over: `COMPLIANCE_DOC_TYPES` shipped `'Vehicle registration (Istimara)'`
   * and three surfaces kept private copies of the five words rather than read a
   * constant that could only speak English. `'JPG'` versus `'JPEG'` is exactly
   * that choice, one size smaller.
   *
   * The wire fact is the media type; the four-letter form the meta line wants
   * is `COMPLIANCE_DOC_FILE_KIND[mimeType]`, exported below so the tile has one
   * answer and no screen invents a second.
   */
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf'
  /** Bytes. An integer, formatted at the edge exactly as halalas are (§8.3) — never a `'2.4 MB'` string. */
  sizeBytes: number
  /**
   * When the scan arrived — **not** when the date was recorded, and the two
   * differ on real rows.
   *
   * Not in §6.5's two-line tile, and carried anyway: `DRV-0104`'s inspection is
   * `expired`, and the scan on record was uploaded in March 2025 for the year
   * it covered. A tile that names the file without saying when it arrived
   * invites an operator to read a lapsed certificate as a current one. What the
   * design does with it is the design's call; a record that cannot answer the
   * question at all is this file's problem.
   */
  uploadedAt: IsoDateTime
  /**
   * `null` when **the captain uploaded it from the driver app**; otherwise the
   * operator who uploaded it for them.
   *
   * The convention is `LegAcknowledgement.byUserId`'s, verbatim
   * (`types/assurance.ts:75`): a `USR-*` id means a member of staff acted, and
   * `null` means the subject of the record did. Inventing a second actor
   * vocabulary for the same distinction is how two screens end up disagreeing
   * about who did something.
   */
  uploadedByUserId: string | null
  /** Always a name — the captain's when `uploadedByUserId` is `null`. Same rule as `LegAcknowledgement.byUserName`. */
  uploadedByUserName: string
}

/**
 * The short form §6.5's meta line prints — `PDF · 240 kB`.
 *
 * Here rather than on the record, so `mimeType` stays the wire fact and the
 * four letters have exactly one spelling. A `Record` keyed by the union also
 * fails to compile the day a fourth media type is accepted, which an inline
 * `switch` in a component would not.
 *
 * **These three are format acronyms, not prose.** `PDF`, `JPG` and `PNG` are
 * written identically in an Arabic interface, so they are not translation keys
 * and this constant is not a repeat of the `label` → `labelKey` defect above —
 * that one carried a *sentence* (`'Vehicle registration (Istimara)'`). Flagged
 * to the i18n owner as a judgement rather than assumed: if Arabic should read
 * `ملف PDF`, the key belongs in the dictionary and this map returns the token
 * the key interpolates.
 */
export const COMPLIANCE_DOC_FILE_KIND: Readonly<Record<ComplianceDocFile['mimeType'], string>> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
}

/**
 * **`href` is refused, and this is the one place to read why.**
 *
 * `design/people-captain-profile.md` §6.5 specifies a fourth field —
 * *"`href`: where the bytes are. A blob or asset URL under the mock"* — and
 * asks for the tile to be an `<a target="_blank">`. The rest of §6.5 is adopted
 * verbatim; that field is not, and the disagreement is recorded rather than
 * resolved quietly, because the two of us are describing different products.
 *
 * **There are no bytes.** Not in `DB.driverDocs`, which is five ISO dates
 * (`:13278`); not anywhere else in the legacy file. Legacy's own viewer is a
 * striped rectangle captioned *"Simulated scan preview — full document viewer
 * would render the uploaded file here"* (`:10893`). A URL under the mock could
 * only point at a fabricated scan or at nothing:
 *
 *   - **A fabricated scan is the thing the spec itself forbids.** §6.4: *"A
 *     fabricated scan is worse than an honest absence."* An asset URL to a stock
 *     licence image is a fabricated scan with a file name on it.
 *   - **A URL to nothing is worse than the placeholder**, not better. The tile
 *     opens a blank tab or a 404, which reads as *"the system is broken"* rather
 *     than *"we do not hold this"*. Those are opposite diagnoses and an operator
 *     acts differently on each.
 *
 * **What this leaves the design, precisely**, so the gap is sized rather than
 * hinted at:
 *
 *   1. §6.4's sentence is untouched and remains correct for every document with
 *      `file === null` — 187 of the 255 seeded documents.
 *   2. For the 68 with a `file`, the record exists and the bytes do not. §6.5's
 *      tile can render its name, kind and size truthfully; **what it cannot be
 *      is a link.** §6.3 already specifies the shape of a tile that renders and
 *      cannot be opened — *"in place, disabled, with its reason as real text
 *      beneath it, `aria-describedby`-linked"* — for the permission refusal, and
 *      the same instrument fits a scan that is on the record and not yet
 *      retrievable. **The sentence is product-designer's to write**, not mine;
 *      a data file inventing operator copy is the other half of the defect this
 *      wave just removed.
 *   3. The day the object store exists, `href` is one field here and one
 *      streaming read on `ComplianceDoc.id` — and it should be its **own**
 *      read, not a field, because a signed URL has a lifetime and a field on a
 *      cached compliance response does not. §6.5 already specifies the slot's
 *      four states for exactly that shape.
 *
 * Raised to product-owner as the routing question it is: *does the console hold
 * scans at all, or only the record of them?*
 */

/**
 * One document on a captain's compliance file.
 *
 * ## What is here, and what each field is for
 *
 * `type`, `expiresOn` and `state` are the table row. Everything else is the
 * answer to the question an operator has **when they stop scanning the table
 * and open one document**, which is never *"what does the row say"* — they can
 * already see the row — but *"can I trust this date, and is there anything
 * behind it"*.
 *
 * ## What is deliberately NOT here
 *
 * **A document number.** An Istimara has a serial, an insurance policy has a
 * policy number, an operating card has a card number, a licence has a licence
 * number. Legacy stores **none of them**: `DB.driverDocs` is five ISO date
 * strings per captain (`:13278`) and nothing else. The only two real-world
 * identifiers in the whole legacy dataset are `nid` — the captain's national id,
 * on the *person* (`:2634`) — and `plate`, on the *applicant* (`:2713`).
 * Neither is a property of a document. Five invented identifier fields would be
 * five fields a backend must either source from somewhere nobody has named or
 * return null forever.
 *
 * **An issue date.** Same reason, and a sharper one: it would be null on every
 * row, and a field that is null on every row tells a backend engineer to build
 * a column for a value the product never captures.
 *
 * **An issuer.** Four of the five have a *fixed* issuing authority — the
 * Transport General Authority for the operating card (legacy names it twice,
 * `:13277` and `:13361`), the traffic department for the licence and Istimara,
 * an MVPI centre for the inspection. A constant per `type` is a **label**, not a
 * record field, and it belongs beside `COMPLIANCE_DOC_TYPES` as another key if
 * a screen ever needs it. The fifth, insurance, has a per-record issuer — the
 * insurance company — and legacy stores it nowhere, so it would be the one
 * genuinely variable value and the one that has to be invented. Refused whole.
 *
 * **A verification verdict.** Legacy *has* one — `docs: {license: '✓ Verified',
 * …}` on an applicant (`:2717`), with a five-value rejection reason list
 * (`:10871`) — and `ApplicantDoc.status` already models it
 * (`types/applicant.ts:33`). It is **not carried onto an active captain's
 * document, because legacy throws it away**: `approveDriver` copies only the
 * expiry dates into `DB.driverDocs` (`:11113`) and the verdicts are never seen
 * again. Adding one here would require answering *"is a renewed document
 * re-verified, by whom, and what happens to a captain while it is pending"* —
 * three product rules nobody has written. **That is a question for
 * product-owner, not a field for this file.**
 *
 * **A full change history.** `previousExpiresOn` is one step back, not a log.
 * Every change is already recorded — `saveDriverDocDates` calls `logAction`
 * with the `old → new` pair (`:13369`) — and the audit trail is its own read
 * (`clients/audit.ts`, `subjectType`/`subjectId`). Duplicating it inside a
 * compliance row would put the same events on two surfaces that can drift.
 */
export interface ComplianceDoc {
  /**
   * `DRV-0104-inspection` — the captain and the document, in that order.
   *
   * Legacy has no id: `DB.driverDocs` is a map keyed by captain then by type
   * (`:13278`), so the *pair* has always been the key and this only writes it
   * down. It exists because a viewer needs something to be addressed by — a
   * React key, a `?doc=` param, an id a test can name — and deriving one in the
   * component would put the format in three places.
   *
   * **Treat it as opaque.** A server free to issue `CDOC-8814` instead must be
   * able to, so nothing may parse a captain id back out of it. The compliance
   * row already carries `driverId` for that.
   */
  id: string
  type: ComplianceDocType
  expiresOn: IsoDate
  state: ComplianceDocState

  /** Where `expiresOn` came from. See `ComplianceDocDateSource` — this is the field the viewer is for. */
  dateSource: ComplianceDocDateSource

  /**
   * When the current `expiresOn` was written. **Not** when the document was
   * issued and not when it expires — when this *record* last changed.
   *
   * Legacy stamps it through `logAction` on both writers (`:13369`, `:11049`);
   * the stamp exists in the audit trail and simply was not on the record.
   */
  recordedAt: IsoDateTime
  /**
   * Who wrote it. **`null` exactly when `dateSource === 'auto-default'`** — the
   * system filled a blank at approval and no human read a document, which is
   * the whole content of that value.
   *
   * The invariant is one-directional and worth stating: `auto-default` implies
   * `null`, and `null` implies `auto-default`. A screen may branch on either.
   */
  recordedByUserId: string | null
  /** The operator's name, denormalised for display. `null` with `recordedByUserId`. */
  recordedByUserName: string | null
  /**
   * The expiry this one replaced, or `null` if this is the first date ever
   * recorded for the document.
   *
   * Legacy builds exactly this pair to log a change —
   * `dt[1] + ': ' + (docs[dt[0]] || '—') + ' → ' + v` (`:13368`) — and then
   * discards it into prose. It answers *"was this date just corrected, and what
   * did it say before"*, which is the second question an operator asks when a
   * suspension lifts the moment somebody edits a field.
   */
  previousExpiresOn: IsoDate | null

  /**
   * The uploaded scan's record, or `null` for **no file on record** — which is
   * the ordinary case, not an error. See `ComplianceDocFile` for the ruling on
   * why there are no bytes and no URL.
   */
  file: ComplianceDocFile | null
}

/**
 * **The answer to a read of a document's bytes — the streaming read
 * `ComplianceDocFile` said would exist one day.**
 *
 * That day is this one, and the record above is unchanged: there is still no
 * `url`, `href`, `previewUrl` or `fileUrl` on `ComplianceDoc` or
 * `ComplianceDocFile`, and `compliance.test.ts` §8 still fails if one appears.
 * The bytes are reached by **the document id, which was already on the record**
 * — `clients/drivers.ts#getComplianceDocumentFile`.
 *
 * One measurement worth recording, because the ruling predicted otherwise: it
 * said *"adding it is a one-line change to this interface plus one client
 * function"*, and the one line turned out to be unnecessary. `ComplianceDoc.id`
 * is *"something to be addressed by"* already, so the read needed nothing added
 * to either interface. A signed URL would have needed the field, and would have
 * been wrong for the reason §3 of the `href` refusal gives — *"a signed URL has
 * a lifetime and a field on a cached compliance response does not"*.
 *
 * ## Four outcomes, and none of them collapsed into another
 *
 * | Outcome | How it arrives | How a caller sees it |
 * |---|---|---|
 * | bytes | resolves | `outcome === 'bytes'` — `bytes` and `mimeType` |
 * | **no file on record** | resolves | `outcome === 'no-file-on-record'` |
 * | refused for want of permission | rejects | `ApiError` · `403` · `kind: 'forbidden'` · `retryable: false` |
 * | the read failed | rejects | `ApiError` · `5xx`/`0` · `kind: 'server'`/`'network'` · `retryable: true` |
 *
 * **The second is not an error and must never be rendered as one.** It is the
 * common case — 187 of the 255 seeded documents — and `ComplianceDocFile`'s
 * header is explicit that a viewer whose empty state is rare is a viewer whose
 * empty state was never built. A 404 here would mean *the document id is wrong*,
 * which is a different sentence to an operator and a different bug to whoever
 * is called about it.
 *
 * **The last two are the pair `compliance.test.ts` §8 argues about** — *"those
 * are opposite diagnoses and an operator acts differently on each"*. They stay
 * distinguishable through the fields the shell's error handling already reads:
 * `kind` decides the copy and `retryable` decides whether a `Try again` button
 * exists at all. Nothing new was invented to carry the distinction; a refusal
 * throwing `403 forbidden` is `clients/wallets.ts:389`'s convention.
 *
 * ## What is deliberately not on this shape
 *
 * **Provenance.** `dateSource`, `recordedAt`, `recordedByUserName` and
 * `previousExpiresOn` are on `ComplianceDoc`, which the viewer was opened from,
 * and `getDriverCompliance` states the rule this would break: *"a viewer that
 * re-fetches can disagree with the list it was opened from. One read, one
 * answer."* Two sources for the same four fields is how a viewer ends up
 * showing a date the row beside it denies.
 *
 * **A file name.** The caller holds `file.name`, which is the record's own
 * answer and the one the meta line already prints. `mimeType` is here and the
 * name is not because they are different kinds of fact: you cannot decode bytes
 * without knowing what they are, and the transport's `Content-Type` is the
 * authority on that, whereas a download's name is a property of the record.
 *
 * **Any marker saying the bytes are a sample.** In `http` mode it would be
 * `false` forever — the always-null field the `href` refusal is about, in
 * mirror image. `fixtures/complianceScans.ts` puts the marking inside the bytes
 * instead, where it survives a screenshot and a download.
 */
export type ComplianceDocumentFileRead =
  | {
      readonly outcome: 'bytes'
      /** Echoed back, so a late response can be matched to the document that asked for it. */
      readonly documentId: string
      /**
       * What these bytes actually are, from the store rather than from the
       * record. `file.mimeType` is the record's claim about what was uploaded;
       * a disagreement between the two is a real condition and the type lets a
       * caller see it rather than hiding it behind one field.
       */
      readonly mimeType: ComplianceDocFile['mimeType']
      readonly bytes: Uint8Array
    }
  | {
      readonly outcome: 'no-file-on-record'
      readonly documentId: string
    }

export interface DriverCompliance {
  driverId: string
  driverName: string
  vehicle: string
  docs: ComplianceDoc[]
  /**
   * The worst state across all five. **`null` when `docs` is empty** — a
   * captain with no file on record has no worst state, and reporting `valid`
   * for one would be the most dangerous possible default.
   */
  worstState: ComplianceDocState | null
  /** Set when compliance has suspended the captain. Legacy `DB.complianceSuspensions` (`:13285`). */
  suspendedReason: string | null
}

/* ─────────────────────────── the record's history ───────────────────────── */

/**
 * **What happened to this captain, as events rather than as sentences.**
 *
 * The same three rules `types/rider.ts` sets out for `RiderTimelineEvent`, for
 * the same three reasons: it is **not a stored log** (`Driver.movementLog` is
 * `{at, action, location}` with free English text and no record id on it), it
 * is **not a client-side merge** (a side sheet and a full page merging trips,
 * compliance and banking each is the "two screens, two answers" defect), and it
 * **carries no rendered string**.
 *
 * ## What a captain's history is made of, and where it differs from a rider's
 *
 * | Contributor | Rider | Captain |
 * |---|---|---|
 * | registration | ✓ | ✓ |
 * | trips | as passenger | **as driver** — `Trip.driverId`, and there are far more of them |
 * | subscriptions | their plan | **not mirrored** — see below |
 * | compliance | — | ✓ a document that has lapsed |
 * | banking | — | ✓ a bank account replaced |
 *
 * **`subscription-*` is deliberately not mirrored.** A captain *is assigned to*
 * a plan; they do not hold one. `Subscription` carries `driverId` but **no
 * assignment timestamp** — `startedOn` / `endsOn` are the rider's cycle — so a
 * `plan-assigned` event could only be dated by the rider's plan start, which is
 * a different fact wearing the right date. `DRV-0101` is on twelve plans and
 * every one of them would be dated by somebody else's cycle. That is a missing
 * field (`Subscription.assignedAt`), reported rather than papered over.
 *
 * **Suspension is not here for the same reason and it is the more serious
 * gap.** `Driver.suspended` is a boolean and `suspensionReason` is a string;
 * **neither carries a timestamp**, so the single most important event in a
 * captain's history has no date to sort by. `DRV-0202`'s movement log holds
 * `{at: '2026-06-18', action: 'Suspended — expired operating card'}`, and
 * regex-matching English prose to recover the date is the legacy defect
 * (`/cancel/i` on a subscription status) this layer exists to stop. The fix is
 * one nullable field, `Driver.suspendedAt`, and it is product-owner's to grant.
 *
 * ## What is deliberately NOT in it
 *
 * **Money**, exactly as on the rider's. Payouts, deductions and escrow releases
 * are `GET /drivers/:id/movements`, which both surfaces already draw as its own
 * card. Putting them in both turns `DRV-0101`'s twenty-event history into
 * thirty, a third of it repeating the card above it.
 *
 * **Complaints, disputes, incidents and fairness cases.** They are support
 * records, and support records are `GET /drivers/:id/support` — the same line
 * the rider's timeline draws. The rule is *the timeline is the record's own
 * lifecycle*, and keeping it identical on both profiles is worth more than
 * making the captain's list longer.
 */
export type DriverTimelineKind =
  | 'account-registered'
  | 'trip-requested'
  | 'trip-completed'
  | 'trip-cancelled'
  | 'trip-no-show'
  | 'document-expired'
  | 'bank-account-changed'

/**
 * One timeline row. `kind` picks the sentence, `detail` fills its placeholders,
 * `recordId` + `recordType` are what the row links to in the profile overlay.
 *
 * **`detail` is typed per `kind`, and that is the whole point of this
 * generic.** `RiderTimelineDetail` is a bag of optional keys and its builder
 * omits the ones it has no value for — which is a runtime trap, because
 * `lib/i18n/translate.ts`'s `interpolate` **throws** on an omitted parameter:
 *
 * ```ts
 * const value = params?.[name]
 * if (value === undefined) throw new TypeError(`Translation "${key}" needs a "${name}" parameter…`)
 * ```
 *
 * A `null` renders the string `"null"` into an operator's screen; an omission
 * crashes the card. Neither is a state a profile should be able to reach, and
 * "remember to add a fallback key" is a convention, not a mechanism.
 *
 * So **no arm below has an optional key and no arm has a nullable value**. A
 * builder that omits one does not compile, and every placeholder any sentence
 * can declare is guaranteed present. Where the source value can be absent, the
 * field is not carried at all and the reason is stated at the arm.
 */
interface DriverEvent<K extends DriverTimelineKind, D extends object> {
  /** Stable and deterministic — `trip-completed|TRP-9005`. A React key, and a name a test can assert. */
  id: string
  at: IsoDateTime
  kind: K
  /** The record this event is about. `null` when it is about the captain. */
  recordId: string | null
  /** What `recordId` opens in the profile overlay. `null` with `recordId`. */
  recordType: ProfileEntityType | null
  detail: D
}

export type DriverTimelineEvent =
  /**
   * Dated by `Driver.joinedAt`, which is the field the header prints, so the
   * timeline and the header can never state two different join dates.
   *
   * **`location` is not carried, unlike the rider's.** It would come from the
   * movement log's registration row, and `DRV-0203`'s log has no such row — it
   * reads `'Application approved'`, because that captain came through the
   * applicant flow. An optional `location` is exactly the omission that throws.
   * `Driver.city` is *not* substituted: `types/rider.ts` already refused that
   * guess, and a home city is not a registration place.
   */
  | DriverEvent<'account-registered', { tier: DriverTier; vehicleClass: VehicleClass }>
  /**
   * The legs this captain drove. `riderName` is the only detail carried and it
   * is **non-null on `Trip`** (denormalised for the index at `:3427`).
   *
   * **The route is not carried**, unlike the rider's `pickup` / `destination`.
   * Both are `string | null` on `Trip`, which is precisely the optional-key
   * trap; and a captain's own timeline is a list of *who they carried*, where a
   * rider's is a list of *where they went*. `Trip.route` exists and is
   * non-null, but it is a pre-joined `'A → B'` whose arrow has to mirror in
   * Arabic (`design/people-rider-profile.md` §10.2) — a joined string is not a
   * placeholder value.
   */
  | DriverEvent<'trip-requested', { riderName: string }>
  | DriverEvent<'trip-completed', { riderName: string }>
  | DriverEvent<'trip-cancelled', { riderName: string }>
  | DriverEvent<'trip-no-show', { riderName: string }>
  /**
   * A document that has **already lapsed**, dated by `expiresOn`.
   *
   * Only `state === 'expired'` produces an event. `expiring` and `critical` are
   * dated in the *future* and have not happened; a history that lists them is
   * not a history. The compliance card draws those, with the days remaining
   * computed against a clock it is passed (see `ComplianceDoc` above).
   *
   * `recordId` is `null`: a compliance document is not an entity `?entity=`
   * resolves, and pointing the row at the captain's own id would be a self-link.
   */
  | DriverEvent<'document-expired', { docType: ComplianceDocType }>
  /**
   * `Driver.bankHistory[]` — every field on `BankAccountChange` is a required
   * non-null string, so this arm cannot omit anything. `reason` is operator
   * prose and travels as data, on the same reading `Complaint.subject` states:
   * nothing translates what somebody wrote.
   */
  | DriverEvent<'bank-account-changed', { fromBank: string; toBank: string; reason: string }>

/** The detail bags, as a union. `kind` discriminates; there is no shared optional key. */
export type DriverTimelineDetail = DriverTimelineEvent['detail']

/* ──────────────────────────── the money movements ───────────────────────── */

/**
 * Which ledger a movement came off. Four, where the rider has two — see
 * `DriverMoneyMovements` for why a captain's money is not a wallet.
 */
export type DriverMovementSource = 'payable' | 'receivable' | 'escrow' | 'payout'

/** The two running balances a movement can sum into. */
export type DriverBalance = 'payable' | 'cash-debt'

/**
 * The account behind each balance, so a screen and a test read the summation
 * rule off one declaration rather than each remembering it.
 *
 * **The two sum on opposite sides**, because the accounts do:
 * `liability.driver` is credit-normal (a credit means Eyvar owes the captain
 * more) and `ar.driver` is debit-normal (a debit means the captain owes Eyvar
 * more). `CHART_OF_ACCOUNTS[k].normalSide` is the authority; this map is only
 * the join from a movement row back to it.
 */
export const DRIVER_BALANCE_ACCOUNT: Readonly<Record<DriverBalance, AccountKey>> = {
  payable: 'liability.driver',
  'cash-debt': 'ar.driver',
}

/**
 * One line of the captain's money list.
 *
 * ## `amountHalalas` is positive. Always.
 *
 * `types/ledger.ts` §3.1 — *"a posting carries a positive integer
 * `amountHalalas` and a `direction`. Balances are signed; postings are not."*
 * The sign the design draws is `direction` rendered, and it is the UI's, as the
 * currency symbol is (§8.3). A signed amount would leave `0` no column to sit
 * in.
 *
 * ## `direction` needs no flip, and that is the real difference from the rider
 *
 * `getRiderMoneyMovements` has to flip `Payment.direction`, because a payment's
 * direction is **platform-relative** — `inbound` is money arriving at Eyvar,
 * which is money leaving the rider. Nothing here is flipped, and it is not
 * luck: `liability.driver` and `ar.driver` are both **captain-scoped** accounts
 * whose normal sides already point at the captain's position.
 *
 *   - `liability.driver` `credit` — Eyvar owes them more. Their position improves.
 *   - `liability.driver` `debit`  — a payout or a deduction. It falls.
 *   - `ar.driver` `debit`  — they owe Eyvar more. It falls.
 *   - `ar.driver` `credit` — a cash surplus. It improves.
 *
 * So `direction` is the posting's own direction, unmodified, and it already
 * reads as *"did this captain's position improve"* on every row.
 */
export interface DriverMoneyMovement {
  /** `PAY-0101-2` for a payable posting, `ARD-0101-1` for a receivable one, `ESC-1041`, `PAY-W640`. */
  id: string
  source: DriverMovementSource
  at: IsoDateTime
  /** i18n key + params — `fin.posting.tripEarnings`, `fin.posting.escrowHeld`. Never a sentence. */
  label: LocalisedText
  /** One vocabulary for all four sources; `SETTLEMENT_BADGE_TONE` already tones every value. */
  state: SettlementState
  direction: PostingDirection
  /** Positive integer. See the note above. */
  amountHalalas: Halalas
  /**
   * **Which stated figure this row is counted in, or `null` for none.**
   *
   * The field that stops the card lying, and the captain's answer to the
   * rider's `inWalletBalance`. It is three-valued rather than a boolean because
   * a captain has **two** balances, not one:
   *
   *   - `'payable'`   — a settled `liability.driver` posting. Sums, credit-positive, to `payableHalalas`.
   *   - `'cash-debt'` — a settled `ar.driver` posting. Sums, **debit-positive**, to `cashDebtHalalas`.
   *   - `null`        — in the list and in no balance: an escrow hold, a payout in
   *                     flight, or a posting that has not settled (AC-312).
   *
   * **The signed sum of the whole list is the balance of nothing**, exactly as
   * on the rider's card, and for a sharper reason: the rows belong to two
   * ledgers with opposite normal sides plus two off-ledger figures.
   */
  countsToward: DriverBalance | null
  /** The payout document this row **is**. `null` on every other source. */
  paymentId: string | null
  /** The escrow hold this row **is**. `null` on every other source. */
  escrowId: string | null
  /**
   * The running balance of **this row's own ledger** after this row.
   *
   * `null` on an escrow hold and on a payout in flight, neither of which is on
   * a captain-scoped ledger, and `null` on any posting that has not settled
   * (AC-312).
   *
   * **A single interleaved running-balance column is forbidden.** Two ledgers
   * with two normal sides produce two independent running balances, and one
   * column carrying both is a number that steps backwards for no visible
   * reason. Group by `source`, or draw the full ledger from
   * `GET /ledgers/liability.driver/:captainId` (`getCaptainPayableLedger`),
   * which is one ledger and can carry one. `DESIGN.md` §8.3.3 already makes the
   * narrower version of this argument about a rail-sized card.
   */
  balanceAfterHalalas: Halalas | null
}

/**
 * **A captain earns; a rider spends — and that is not one surface with the sign
 * flipped.**
 *
 * A rider has one balance and one held figure. A captain has *two ledgers* —
 * what Eyvar owes them and what they owe Eyvar — and *three* off-ledger figures
 * that are attached to them and in neither. Five numbers, because there are
 * five facts, and collapsing any two of them is how a payout over-pays (D-F6).
 *
 * **`netPayableHalalas` is deliberately absent.** `clients/payouts.ts` is
 * explicit: it is `payable − cashDebt`, it is what the payout action commits
 * (AC-366), and *"it must be computed once from two independently-true server
 * values rather than sent as a third value that can disagree with them"*.
 * Sending it here would create that third value on a second surface.
 */
export interface DriverMoneyMovements {
  driverId: string
  /**
   * The `liability.driver` closing balance — what Eyvar owes this captain.
   *
   * **May be negative.** `DRV-0202` is −1,500: an absentee forfeited an
   * emergency cover cost, so the captain owes on the payable account. A screen
   * that renders this as an amount payable is wrong for that row.
   *
   * Equal to `CaptainPayout.payableHalalas`, because both are read from the
   * ledger by `subjectClosingBalance` rather than carried beside it.
   */
  payableHalalas: Halalas
  /**
   * The `ar.driver` closing balance. **Positive means the captain owes Eyvar**,
   * which is the convention `CaptainPayout.cashDebtHalalas` already states, and
   * a second convention for one number is the defect this layer refuses.
   *
   * **May be negative.** `DRV-0104` is −440: they handed in more cash than they
   * owed and Eyvar owes them 4.40.
   */
  cashDebtHalalas: Halalas
  /**
   * **The captain's `heldHalalas`.** Money attached to them and outside the
   * payable: the sum of their `held` escrow holds, one per plan whose trips are
   * not all delivered. Non-negative, and `0` means *nothing held*, which is a
   * real answer and not an absence.
   *
   * It is the structural twin of the rider's held figure — captured, frozen,
   * outside the balance — and it becomes payable when the plan is delivered and
   * `releaseEscrow` posts the credit (AC-364).
   */
  escrowHeldHalalas: Halalas
  /**
   * **Money committed out and not settled** — the sum of this captain's
   * outbound payments whose settlement is one of `PENDING_SETTLEMENTS`.
   * Non-negative.
   *
   * It is outside `payableHalalas` **because the ledger cannot hold it**: a
   * pending leg produces no GL line (AC-312), so `payCaptain` writes the debit
   * only when the money moves. `DRV-0101` carries 64,000 from `PAY-W640`, a
   * bank transfer initiated at 06:00 on 25 June and still pending.
   *
   * Equal to the sum of the `source: 'payout'` rows in `movements`, exactly —
   * which is where this differs from the rider's held figure and why. See the
   * note on the client.
   */
  payoutInFlightHalalas: Halalas
  /**
   * **Raised against this captain and not yet applied.** Non-negative.
   *
   * Stated, and **in no balance and in no list**: a pending deduction has moved
   * no money — `applyDeduction` is what writes the posting — so it is neither a
   * movement nor a balance. It is here because it is the operator's question at
   * exactly the moment they are reading a payable, and answering it costs one
   * number rather than a second request.
   *
   * **What the product does about it is not decided here.** Whether a pending
   * deduction should reduce what a payout offers is a rule nobody has written;
   * netting it into anything would be inventing that rule on a profile screen.
   */
  pendingDeductionsHalalas: Halalas
  /** Newest first. */
  movements: DriverMoneyMovement[]
  computedAt: IsoDateTime
}

/* ────────────────────── what else references this captain ───────────────── */

/**
 * **The presence of every support record that references this captain, from one
 * read.**
 *
 * Same argument as `RiderSupportPresence`, and one extra that is the captain's
 * own: `Driver.openComplaints` is a **single number with nothing behind it**
 * (`types/complaint.ts` says so in as many words), and it counts complaints
 * only. A profile that asked *"is anything open against this captain"* and read
 * that field would answer `0` for a captain with an open dispute, an unresolved
 * cash report and a fairness case under review.
 *
 * Nine collections rather than the rider's seven, and the difference is the
 * point of this file:
 *
 * | | Rider | Captain | Why |
 * |---|---|---|---|
 * | complaints | filed by them | **against them** | `Complaint.driverId` is always set (`:2708`) |
 * | conversations | ✓ | ✓ | `Conversation.entityType === 'driver'` is seeded |
 * | disputes | either side | either side | same rule: the question does not care which end |
 * | lost & found | their lost item | **their vehicle** | `LostFoundItem.driverId` — *"ask the captain to check the vehicle"* |
 * | fairness cases | as subject | **as the captain the case is about or from** | `FairnessCase.driverId`, always set |
 * | tickets | ✓ | ✓ | `Ticket.entityType` already includes `'driver'` |
 * | **safety incidents** | — | ✓ | `SafetyIncident.againstId` / `reporterId`; legacy's own captain-risk read counts them (`:14294`) |
 * | **cash reports** | — | ✓ | `CashReport.captainId`; a rider hands in no cash |
 * | **deductions** | — | ✓ | `Deduction.captainId`; a rider is not deducted from |
 * | ride requests | ✓ | **—** | `Request.riderId` only. A captain does not hail a ride, and `searching` / `no-drivers` are not states a captain can be in |
 *
 * **Absences are not counted here**, though `AbsenceEvent` carries a
 * `driverId`. The absence ledger ships **empty by construction**
 * (`DB.absenceEvents = []`, `:16564`, and `clients/assurance.ts` keeps it that
 * way), so the field could only read `{0, 0}` for every captain — a presence
 * signal that is constant is not a presence signal. The `commitment` profile
 * section already fetches `listAbsences` for its own card and renders its own
 * empty state. It is a one-line addition the day the ledger is seeded.
 */
export interface DriverSupportPresence {
  driverId: string
  /** Filed **against** this captain. Open = `OPEN_COMPLAINT_STATUSES` (`open`, `under-review`). */
  complaints: RelatedCount
  /** Contact Centre threads about this captain. Open = anything not `closed`. */
  conversations: RelatedCount
  /** Claims they filed **or** claims filed against them. Open = not `resolved`. */
  disputes: RelatedCount
  /** Items left in this captain's vehicle. Open = not `returned`. */
  lostAndFound: RelatedCount
  /** Cases about or from this captain. Open = `open`. */
  fairnessCases: RelatedCount
  /** Open = not `resolved` and not `closed`. */
  tickets: RelatedCount
  /** Raised against them, or raised by them. Open = `open`. */
  safetyIncidents: RelatedCount
  /** Cash handed in, or not. Open = not `resolved` — an `escalated` report still needs somebody. */
  cashReports: RelatedCount
  /** Raised against their earnings. Open = `pending`; `applied` and `waived` are both decided. */
  deductions: RelatedCount
  computedAt: IsoDateTime
}
