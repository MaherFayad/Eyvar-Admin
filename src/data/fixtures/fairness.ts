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

import type { FairnessCase } from '../types/fairness'
import { FAIRNESS_RESOLVE_MINUTES } from '../types/fairness'

export const fairnessCaseFixtures: FairnessCase[] = [
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
]
