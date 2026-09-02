/**
 * Fairness cases — Support › Captain Fairness.
 *
 * Legacy seeds `DB.fairnessCases = []` (`eyvar_ops_panel_v40_fixed.html:15505`)
 * and fills it at runtime, with one exception: `seedFairness()` (`:15810`)
 * opens a single rating dispute at boot *"so the fairness route is visible on
 * first load rather than only after something goes wrong live"*. `FC-0002`
 * below is that case, verbatim — same kind, same detail text, same
 * `openedAtMs = agoMs(90)`, which against the fixed clock is 07:44.
 *
 * Everything else is unreachable in the legacy app without driving the UI:
 * every other state — upheld, overturned, withdrawn, breached, decided-late —
 * exists only after an operator clicks through a modal. That is why nobody has
 * ever seen this page with a decided case on it.
 *
 * ## The SLA here is measured, not chosen
 *
 * Every case carries a `reasonCode`, and `rcTargets(code).res` is a shipped
 * per-code resolve window (`:14730`). The legacy page renders `⚠ past 24h SLA`
 * off exactly that arithmetic (`:15648`). So unlike `Applicant.slaDueAt`,
 * nothing here is waiting on Q8 — `slaSource` is `legacy-reason-code`
 * throughout and the numbers come from `FAIRNESS_RESOLVE_MINUTES`.
 *
 * ## What each row is for
 *
 * `FC-0002`  the legacy boot case. Open, 90 min into a 48-hour window, and
 *            **claimed by another operator** (`USR-5`).
 * `FC-0003`  breached by **64 minutes**. Still open.
 * `FC-0004`  breached by **four and a half days**. Still open, and the subject
 *            is the 44-character Arabic rider name.
 * `FC-0005`  overturned **inside** its window — `slaDueAt` two days past,
 *            `slaBreachedAt` null. Merely old.
 * `FC-0006`  overturned **after** breaching, and `averageAdjusted: false` —
 *            the score was voided but the historical average could not be
 *            reversed. Legacy refuses to fake this arithmetic (`:15606`) and so
 *            does the fixture.
 * `FC-0007`  upheld, **with a rationale**. The only row that has one; see the
 *            field note on `rationale` for why every legacy decision has none.
 * `FC-0008`  withdrawn by the captain — a disposition with no decision.
 */

import { offsetFromNow } from '../mock/clock'
import type { FairnessCase, FairnessCaseKind, FairnessReasonCode } from '../types/fairness'
import { FAIRNESS_RESOLVE_MINUTES } from '../types/fairness'
import { cycle, cycleRecord, cycleRef, refsFor, type FixtureRef } from './cycle'
import { driverFixtures } from './drivers'
import { riderFixtures } from './riders'

const namedFairnessCases: FairnessCase[] = [
  {
    /* Filed 24 minutes ago against a 24-hour window. The comfortable row —
       there has to be one, or the SLA column only ever renders red. */
    id: 'FC-0001',
    kind: 'suspension-appeal',
    status: 'open',
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    subjectId: null,
    subjectName: null,
    detail:
      'The operating card was renewed on the 19th and the receipt was uploaded the same day. I have not been able to work for six days.',
    reasonCode: 'DRV_SUSPENSION_APPEAL',
    openedAt: '2026-06-25T08:50:00+03:00',
    decidedAt: null,
    decidedByUserId: null,
    decidedByUserName: null,
    rationale: null,
    tripId: null,
    disputedRating: null,
    averageAdjusted: null,
    /* Verbatim from `drivers.ts` — the reason that was actually served. */
    suspensionReason: 'Transport authority operating card expired 7 days ago',
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T08:50:00+03:00',
    slaDueAt: '2026-06-26T08:50:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_SUSPENSION_APPEAL,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    /* T2 · first response 15 min (`:14650`). Nobody has answered yet, and the
       window closed nine minutes ago: **first-response breached, resolve clock
       still running** — the same two-clock shape as an open SOS, at a much
       lower stake. */
    firstResponseDueAt: '2026-06-25T09:05:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-25T09:05:00+03:00',
  },
  {
    /**
     * `seedFairness()` (`:15810`), verbatim — kind, detail and
     * `openedAtMs = agoMs(90)`, which is 07:44 against the fixed clock.
     * **Claimed by another operator**, so the take-over affordance has a case
     * on this queue too.
     */
    id: 'FC-0002',
    kind: 'rating-dispute',
    status: 'open',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    subjectId: 'RDR-2031',
    subjectName: 'Tariq Al-Saud',
    detail:
      'Rider was 12 minutes late to the pickup point; captain waited and was rated down for the delay.',
    reasonCode: 'DRV_RATING_DISPUTE',
    openedAt: '2026-06-25T07:44:00+03:00',
    decidedAt: null,
    decidedByUserId: null,
    decidedByUserName: null,
    rationale: null,
    tripId: 'TRP-7738',
    disputedRating: 2,
    averageAdjusted: null,
    suspensionReason: null,
    reinstatedAt: null,
    claim: {
      key: 'fairness:FC-0002',
      entityType: 'fairness',
      entityId: 'FC-0002',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: '2026-06-25T08:20:00+03:00',
      touchedAt: '2026-06-25T09:06:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: '2026-06-25T07:44:00+03:00',
    slaDueAt: '2026-06-27T07:44:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_RATING_DISPUTE,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    /* T3 · first response 60 min. Answered in 36. */
    firstResponseDueAt: '2026-06-25T08:44:00+03:00',
    firstResponseAt: '2026-06-25T08:20:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /** **Breached by 64 minutes**, still open, nobody holding it. */
    id: 'FC-0003',
    kind: 'rider-report',
    status: 'open',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    subjectId: 'RDR-2055',
    subjectName: 'Bandar Al-Harbi',
    detail:
      'Waited the full ten minutes at the pickup point and called twice. Rider never came down and the ride auto-cancelled.',
    reasonCode: 'DRV_RIDER_NOSHOW',
    openedAt: '2026-06-24T08:10:00+03:00',
    decidedAt: null,
    decidedByUserId: null,
    decidedByUserName: null,
    rationale: null,
    tripId: 'TRP-9003',
    disputedRating: null,
    averageAdjusted: null,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-24T08:10:00+03:00',
    slaDueAt: '2026-06-25T08:10:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_RIDER_NOSHOW,
    slaBreachedAt: '2026-06-25T08:10:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T09:10:00+03:00',
    firstResponseAt: '2026-06-24T08:55:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Breached by four and a half days**, still open, never answered at all
     * — `firstResponseAt` is null and the first-response window closed on the
     * 19th. Beside `FC-0003` (64 minutes over) this is the pair that decides
     * whether "over" is a duration or a flag.
     *
     * The subject is the 44-character Arabic rider name.
     */
    id: 'FC-0004',
    kind: 'rider-report',
    status: 'open',
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    subjectId: 'RDR-4002',
    subjectName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    detail: 'الراكبة اعترضت على المسار المحدد في التطبيق ورفعت صوتها؛ أطلب مراجعة التسجيل.',
    reasonCode: 'DRV_RIDER_CONDUCT',
    openedAt: '2026-06-19T18:20:00+03:00',
    decidedAt: null,
    decidedByUserId: null,
    decidedByUserName: null,
    rationale: null,
    tripId: null,
    disputedRating: null,
    averageAdjusted: null,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-19T18:20:00+03:00',
    slaDueAt: '2026-06-20T18:20:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_RIDER_CONDUCT,
    slaBreachedAt: '2026-06-20T18:20:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-19T18:35:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-19T18:35:00+03:00',
  },
  {
    /**
     * **Overturned inside the window.** Due `2026-06-23T10:00`, decided
     * `2026-06-22T09:30`. Two days past its deadline *now*, and it never
     * breached — the fairness-queue twin of `SREQ-002` and `INC-018`.
     *
     * `averageAdjusted: true`: the server had a real rating count to reverse
     * against. Note that `Driver` does **not** expose `ratingCount` — the index
     * row carries `rating` with no denominator — so a screen cannot recompute
     * this and must not try. That is the whole reason the field is on the case.
     */
    id: 'FC-0005',
    kind: 'rating-dispute',
    status: 'overturned',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    subjectId: 'RDR-1052',
    subjectName: 'Omar Al-Shehri',
    detail: 'Rider marked one star for a route the app itself selected; captain followed navigation.',
    reasonCode: 'DRV_RATING_DISPUTE',
    openedAt: '2026-06-21T10:00:00+03:00',
    decidedAt: '2026-06-22T09:30:00+03:00',
    decidedByUserId: 'USR-1',
    decidedByUserName: 'Sarah Al-Rashid',
    /**
     * `null`, and that is the truth: `decideFairness` sets status, decider and
     * timestamp and **never writes `rationale`** (`:15597`–`:15599`), so every
     * decided case in the legacy app is unexplained. Only `FC-0007` has one,
     * to prove the populated state renders.
     *
     * **Raised as an invariant violation — "an overturn with no stated reason"
     * — and left alone deliberately.** It is not a fixture slip; it is the
     * defect this fixture was written to make visible, and the type's own field
     * note says so: *"whether the UI should require it is a product
     * decision"*. Filling it in here would close the question by fiat and
     * remove the only evidence that the legacy decision path drops the reason
     * on the floor. `FC-0007` (upheld) and `FC-0009` (overturned) both carry
     * one, so the populated state renders on both dispositions and nothing is
     * untestable.
     */
    rationale: null,
    tripId: 'TRP-9008',
    disputedRating: 1,
    averageAdjusted: true,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-21T10:00:00+03:00',
    slaDueAt: '2026-06-23T10:00:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_RATING_DISPUTE,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-21T11:00:00+03:00',
    firstResponseAt: '2026-06-21T10:22:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Breached, then overturned** — and the overturn could not undo the
     * damage: `averageAdjusted: false`. The score is voided and excluded going
     * forward, but the historical average stays where it is, because there was
     * no stored count to reverse against.
     *
     * Legacy's own comment on this branch is the clearest sentence in the file:
     * *"A seeded average with no denominator cannot be un-averaged — inventing
     * one produces impossible results (removing a 2★ from 4.5 over an assumed
     * n=2 yields 7★)"* (`:15606`). The UI has to say so; the field is how.
     */
    id: 'FC-0006',
    kind: 'rating-dispute',
    status: 'overturned',
    driverId: 'DRV-0206',
    driverName: 'Ibrahim Diarra Coulibaly',
    subjectId: 'RDR-4003',
    subjectName: 'Meshari Al-Dossari',
    detail: 'Captain contests a two-star rating left after a trip the rider cancelled at the door.',
    reasonCode: 'DRV_RATING_DISPUTE',
    openedAt: '2026-06-16T12:00:00+03:00',
    decidedAt: '2026-06-19T09:00:00+03:00',
    decidedByUserId: 'USR-5',
    decidedByUserName: 'Yousef Al-Balawi',
    rationale: null,
    tripId: 'TRP-9102',
    disputedRating: 2,
    averageAdjusted: false,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-16T12:00:00+03:00',
    slaDueAt: '2026-06-18T12:00:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_RATING_DISPUTE,
    slaBreachedAt: '2026-06-18T12:00:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-16T13:00:00+03:00',
    firstResponseAt: '2026-06-17T08:40:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /* Upheld, with a stated reason. The suspension stood and the captain has
       the sentence that says why — the thing an appeals process exists to
       produce and the thing legacy never records. */
    id: 'FC-0007',
    kind: 'suspension-appeal',
    status: 'upheld',
    driverId: 'DRV-0205',
    driverName: 'Nawaf Al-Juhani',
    subjectId: null,
    subjectName: null,
    detail: 'I was told the third no-show was a system error. Requesting review of the record.',
    reasonCode: 'DRV_SUSPENSION_APPEAL',
    openedAt: '2026-06-14T09:00:00+03:00',
    decidedAt: '2026-06-14T16:20:00+03:00',
    decidedByUserId: 'USR-1',
    decidedByUserName: 'Sarah Al-Rashid',
    rationale:
      'Three absences inside the 30-day window, each with a matching rider report and GPS trail. The suspension stands and the appeal window has closed.',
    tripId: null,
    disputedRating: null,
    averageAdjusted: null,
    suspensionReason: 'Third absence inside the rolling 30-day window',
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-14T09:00:00+03:00',
    slaDueAt: '2026-06-15T09:00:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_SUSPENSION_APPEAL,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-14T09:15:00+03:00',
    firstResponseAt: '2026-06-14T09:11:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /* Withdrawn — a disposition with no decision. Without this value the row
       would have to be deleted, which destroys the record an appeals process
       exists to keep. */
    id: 'FC-0008',
    kind: 'rider-report',
    status: 'withdrawn',
    driverId: 'DRV-0207',
    driverName: 'Saud Al-Harbi',
    subjectId: 'RDR-1090',
    subjectName: 'Reem Al-Dosari',
    detail: 'Reported spilled drink and cleaning cost; captain withdrew after the rider paid directly.',
    reasonCode: 'DRV_VEHICLE_DAMAGE',
    openedAt: '2026-06-20T13:00:00+03:00',
    decidedAt: '2026-06-20T15:40:00+03:00',
    decidedByUserId: null,
    decidedByUserName: null,
    rationale: null,
    tripId: null,
    disputedRating: null,
    averageAdjusted: null,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-20T13:00:00+03:00',
    slaDueAt: '2026-06-22T13:00:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_VEHICLE_DAMAGE,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-20T14:00:00+03:00',
    firstResponseAt: '2026-06-20T13:31:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **`DRV_DEDUCTION_DISPUTE` — the sixth reason code, and the first case to
     * carry it.** Every other code in `FairnessReasonCode` had a row; this one
     * had none, so its filter facet had never matched and its 24-hour window
     * had never been rendered.
     *
     * **Finding for product-owner, not something a fixture may settle.**
     * `FairnessReasonCode` has six members and `FairnessCaseKind` has three,
     * and this code maps onto none of them. A deduction dispute is a captain
     * contesting a decision **Eyvar** made against them, which is structurally
     * the `suspension-appeal` shape — counterparty is Eyvar, so `subjectId` is
     * `null` (`commitDriverAppeal`, `:15583`) — and that is the kind used here,
     * because leaving the code unrepresented is worse than representing it
     * imperfectly. But the queue view will label this row *"Suspension
     * appeal"* when no suspension is in question. Either the kind enum needs a
     * fourth member or the code needs to move; both are product decisions.
     *
     * It also carries a **rationale on an overturn**, which nothing else does:
     * `FC-0007` proves the populated state on `upheld` and this proves it on
     * `overturned`, without touching `FC-0005`/`FC-0006`, whose empty
     * rationales are the legacy defect being documented.
     */
    id: 'FC-0009',
    kind: 'suspension-appeal',
    status: 'overturned',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    subjectId: null,
    subjectName: null,
    detail:
      'DED-01 charges me for a late pickup on TRP-7742. The rider changed the destination twice while I was waiting and the app never re-timed the leg.',
    reasonCode: 'DRV_DEDUCTION_DISPUTE',
    openedAt: '2026-06-23T11:20:00+03:00',
    decidedAt: '2026-06-24T08:05:00+03:00',
    decidedByUserId: 'USR-2',
    decidedByUserName: 'Fahad Al-Dosari',
    rationale:
      'Trip log confirms two destination changes during the wait. The lateness is not attributable to the captain; DED-01 is to be waived and the on-time percentage recomputed for the period.',
    tripId: 'TRP-7742',
    disputedRating: null,
    averageAdjusted: null,
    suspensionReason: null,
    reinstatedAt: null,
    claim: null,
    slaStartedAt: '2026-06-23T11:20:00+03:00',
    slaDueAt: '2026-06-24T11:20:00+03:00',
    slaTargetMinutes: FAIRNESS_RESOLVE_MINUTES.DRV_DEDUCTION_DISPUTE,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-23T11:35:00+03:00',
    firstResponseAt: '2026-06-23T11:29:00+03:00',
    firstResponseBreachedAt: null,
  },
]

/* ── volume ──────────────────────────────────────────────────────────── */

/**
 * The captains and riders the decided archive is spread across, resolved from
 * the canonical records once. `refsFor` throws at module load on an id that no
 * longer exists, so a decided case can never name a captain who is not there.
 */
const FAIRNESS_CAPTAINS: readonly FixtureRef[] = refsFor(driverFixtures, [
  'DRV-0101',
  'DRV-0102',
  'DRV-0103',
  'DRV-0104',
  'DRV-0105',
  'DRV-0106',
  'DRV-0202',
  'DRV-0204',
  'DRV-0206',
  'DRV-0207',
])

const FAIRNESS_SUBJECTS: readonly FixtureRef[] = refsFor(riderFixtures, [
  'RDR-1041',
  'RDR-1044',
  'RDR-1045',
  'RDR-1046',
  'RDR-1048',
  'RDR-1049',
  'RDR-1052',
  'RDR-1075',
])

/**
 * Each reason code with the kind it belongs to, **as one record**. The kind and
 * the code are two halves of one classification and are never cycled apart.
 */
const FAIRNESS_CLASSES: ReadonlyArray<{
  readonly id: FairnessReasonCode
  readonly kind: FairnessCaseKind
  readonly detail: string
}> = [
  {
    id: 'DRV_RATING_DISPUTE',
    kind: 'rating-dispute',
    detail: 'Captain contests a low score left after a leg the app itself re-routed.',
  },
  {
    id: 'DRV_RIDER_NOSHOW',
    kind: 'rider-report',
    detail: 'Rider did not appear at the pickup point and did not answer two calls.',
  },
  {
    id: 'DRV_RIDER_CONDUCT',
    kind: 'rider-report',
    detail: 'Rider smoked in the vehicle and refused to stop when asked.',
  },
  {
    id: 'DRV_VEHICLE_DAMAGE',
    kind: 'rider-report',
    detail: 'Torn seat cover reported at the end of the leg, with photographs attached.',
  },
  {
    id: 'DRV_SUSPENSION_APPEAL',
    kind: 'suspension-appeal',
    detail: 'Captain appeals a suspension served while the renewed document was already on file.',
  },
  {
    id: 'DRV_DEDUCTION_DISPUTE',
    kind: 'suspension-appeal',
    detail: 'Captain disputes a cleanliness deduction raised without a photograph.',
  },
]

/**
 * Volume for Captain Fairness — 37 decided cases and **7 live ones**, so the
 * queue pages, sorts, has an archive worth reading, *and* has work in it.
 *
 * ## Why seven of these are now open — and what it cost to keep them all decided
 *
 * This generator used to make every row decided, on the reasoning that *"four
 * open and forty-four decided is what an appeals queue looks like"*. The shape
 * was right and the consequence was not. `Deadline` and `Owner` are columns
 * that only a **live** case can fill — the screen renders `<Absent />` on a
 * decided row, correctly — and the default view is a **kind** filter
 * (`suspension-appeals`), not a status one. So the landing view of
 * `/support/fairness` showed **17 rows with 16 of them decided**, and those two
 * columns came to **336px of a 1038px table, 32% of its width, carrying one
 * value between them** (`docs/audit/PAGE-SWEEP.md` §2 S8, measured live).
 *
 * A queue whose landing view is 94% archive is a fixture problem before it is a
 * screen problem. Seven live appeals across the three kinds is still an
 * archive-heavy ratio — **11 open against 42 decided** — and it is enough for
 * every queue column to mean something on every view.
 *
 * **The `navCounts` coupling is real and is honoured, not sidestepped.**
 * `fixtures/navCounts.ts` pins `support-fairness` to the size of the live
 * `open` view and `navCounts.test.ts` asserts the two against each other. That
 * literal moved from `4` to `11` in the same pass, deliberately, and the
 * assertion is what proves it moved together.
 *
 * ## Claims — the state nothing in this fixture could reach
 *
 * **Not one of the fifty-three cases outside `FC-0002` carried a claim**, so
 * `view=mine` returned nothing, `view=unassigned` returned everything, and the
 * three states `OwnerChip` renders — mine, someone else's, and a claim gone
 * stale past the thirty-minute window — could only be reached by hand-editing
 * this file. The seven live rows cycle all four possibilities, including the
 * stale one, so QA reaches take-over from the seeded data.
 *
 * ## Every timestamp still descends from one offset per row
 *
 * `openedMinutesAgo` is the single source; the deadline, the first response and
 * the decision are all that number plus a literal, so a row cannot claim a
 * breach its own dates deny — `slaBreachedAt` is computed from the comparison,
 * never asserted. A live row uses a **much smaller** offset (2 hours to ~2
 * days) than an archived one (3 to 40 days): an appeal opened five weeks ago
 * and still unanswered is not a queue, it is a scandal.
 */
export const fillerFairnessCases: FairnessCase[] = Array.from({ length: 44 }, (_, i) => {
  const captain = cycleRef(FAIRNESS_CAPTAINS, i)
  const subject = cycleRef(FAIRNESS_SUBJECTS, i)
  const klass = cycleRecord(FAIRNESS_CLASSES, i)
  const target = FAIRNESS_RESOLVE_MINUTES[klass.id]
  /**
   * **The rows that are still live, named by index rather than by a modulus.**
   *
   * `i % 6 === 1` was the first attempt and it is the exact defect
   * `fixtures/cycle.ts` was written about: `FAIRNESS_CLASSES` has **six**
   * members, so a period-6 predicate selects the *same class every time* — all
   * seven live rows came out `DRV_RIDER_NOSHOW`, and `suspension-appeals`, the
   * landing view, gained nothing at all. Two sequences with the same period
   * walk in lockstep; two with different periods walk out of phase. Neither is
   * what you want when the distribution is the point.
   *
   * So the indices are listed. Six land on a suspension-appeal class (4, 5),
   * three on a rider-report (1, 2, 3) and one on a rating dispute (0), which
   * puts live work on all three kind views and the most of it on the one that
   * opens by default.
   */
  const live = [4, 5, 7, 10, 12, 14, 16, 21, 23, 35].includes(i)
  const openedMinutesAgo = live
    ? 120 + ((i * 37) % 2_760)
    : 1_440 * (3 + (i % 38)) + ((i * 53) % 1_380)
  const decideAfter = 90 + ((i * 271) % 4_600)
  const operator = cycleRecord(
    [
      { id: 'USR-1', name: 'Sarah Al-Rashid' },
      { id: 'USR-2', name: 'Fahad Al-Dosari' },
      { id: 'USR-5', name: 'Yousef Al-Balawi' },
    ],
    i,
  )
  /* Overturned twice as often as upheld, with one withdrawal in seven. The
     page's own empty state says a high overturn rate is the appeal route
     working (`:15690`), so the archive should not read as a rubber stamp. */
  const status = live
    ? ('open' as const)
    : i % 7 === 6
      ? ('withdrawn' as const)
      : i % 3 === 0
        ? ('upheld' as const)
        : ('overturned' as const)
  /**
   * The four owner states an operator can be looking at, in order: nobody has
   * it, I have it, somebody else has it, and somebody else has had it open and
   * untouched past the thirty-minute window. `OwnerChip` renders a different
   * thing for each and only the first was reachable before.
   *
   * `touchedAt` is what makes the fourth one stale, so it is derived from the
   * same offset as everything else on the row rather than typed as a date.
   */
  const claimant = cycle(
    [
      null,
      { id: 'USR-1', name: 'Sarah Al-Rashid', staleMinutes: 0 },
      { id: 'USR-2', name: 'Fahad Al-Dosari', staleMinutes: 0 },
      { id: 'USR-5', name: 'Yousef Al-Balawi', staleMinutes: 74 },
    ],
    i,
  )
  const isRating = klass.kind === 'rating-dispute'
  const isAppeal = klass.kind === 'suspension-appeal'
  return {
    id: `FC-1${String(100 + i).padStart(3, '0')}`,
    kind: klass.kind,
    status,
    driverId: captain.id,
    driverName: captain.name,
    subjectId: isAppeal ? null : subject.id,
    subjectName: isAppeal ? null : subject.name,
    detail: klass.detail,
    reasonCode: klass.id,
    openedAt: offsetFromNow({ minutes: -openedMinutesAgo }),
    /* An open case has not been decided. Every field that describes a decision
       goes with it — a `decidedAt` on an undecided row is the contradiction the
       screen's `isDecided` branch reads. */
    decidedAt: live ? null : offsetFromNow({ minutes: -openedMinutesAgo + decideAfter }),
    /* A withdrawal has no decider — the captain dropped it (`FC-0008`). */
    decidedByUserId: live || status === 'withdrawn' ? null : operator.id,
    decidedByUserName: live || status === 'withdrawn' ? null : operator.name,
    /* Two in five decisions state a reason. The rest are legacy's shape:
       `decideFairness` never writes one (`:15597`). */
    rationale:
      !live && status !== 'withdrawn' && i % 5 < 2
        ? cycle(
            [
              'Telemetry and the trip log corroborate the captain’s account; the score is voided.',
              'The document was on file before the suspension was served. Reinstated with the period restored.',
            ],
            i,
          )
        : null,
    tripId: isRating ? cycle(['TRP-8004', 'TRP-8007', 'TRP-8010', 'TRP-8016'], i) : null,
    disputedRating: isRating ? 1 + (i % 3) : null,
    /**
     * Only meaningful on an overturned rating dispute, and `false` on a third
     * of those: the score is voided but the historical average had no
     * denominator to reverse against (`:15606`). `null` everywhere else.
     */
    averageAdjusted: isRating && status === 'overturned' ? i % 3 !== 1 : null,
    suspensionReason: isAppeal ? 'Rating below the 3.5 review threshold for two consecutive weeks' : null,
    reinstatedAt:
      isAppeal && status === 'overturned'
        ? offsetFromNow({ minutes: -openedMinutesAgo + decideAfter })
        : null,
    /* Decided cases are in nobody's name; a live one may be in anybody's. */
    claim:
      live && claimant !== null
        ? {
            key: `fairness:FC-1${String(100 + i).padStart(3, '0')}`,
            entityType: 'fairness' as const,
            entityId: `FC-1${String(100 + i).padStart(3, '0')}`,
            ownerId: claimant.id,
            ownerName: claimant.name,
            claimedAt: offsetFromNow({ minutes: -openedMinutesAgo + 20 }),
            /* Stale is `touchedAt` older than the thirty-minute window, and it
               is a *derived* condition — never a flag on the row. */
            touchedAt: offsetFromNow({ minutes: -(claimant.staleMinutes || 6) }),
            state: 'claimed' as const,
            releasedAt: null,
            releaseReason: null,
            takeovers: [],
          }
        : null,
    slaStartedAt: offsetFromNow({ minutes: -openedMinutesAgo }),
    slaDueAt: offsetFromNow({ minutes: -openedMinutesAgo + target }),
    slaTargetMinutes: target,
    /**
     * A breach on a decided row is *decided after the deadline*. On a live row
     * it is *the deadline passed and nobody has decided* — the same fact
     * measured against now instead of against the decision, which is why this
     * is two arms and not one.
     */
    slaBreachedAt: live
      ? openedMinutesAgo > target
        ? offsetFromNow({ minutes: -openedMinutesAgo + target })
        : null
      : decideAfter > target
        ? offsetFromNow({ minutes: -openedMinutesAgo + target })
        : null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: offsetFromNow({ minutes: -openedMinutesAgo + 15 }),
    firstResponseAt: offsetFromNow({ minutes: -openedMinutesAgo + 4 + (i % 40) }),
    firstResponseBreachedAt: null,
  } satisfies FairnessCase
})

/** 53 rows — nine hand-written, forty-four of archive. */
export const fairnessCaseFixtures: FairnessCase[] = [...namedFairnessCases, ...fillerFairnessCases]
