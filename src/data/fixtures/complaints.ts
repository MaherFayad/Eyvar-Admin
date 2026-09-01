/**
 * Complaints — legacy's four seeds plus nine more, and the first data
 * `Driver.openComplaints` has ever had behind it.
 *
 * ## The reconciliation this file exists to satisfy
 *
 * `Driver.openComplaints` is a **count**, `Driver.complaintIds` is the list it
 * counts, and `isOpenComplaint` (`types/complaint.ts`) is the definition of
 * which statuses are in it. Until this file the count had nothing behind it at
 * all: `DRV-0202` claimed 2 and `DRV-0204` claimed 3, both with
 * `complaintIds: []`, and the Risk & Fraud column sorted on a number no
 * operator could open.
 *
 * Eight complaints here are open (`open` or `under-review`), and they land like
 * this — this table **is** the invariant, and it is the thing to check when a
 * driver fixture and this file disagree:
 *
 * | captain | open | ids |
 * |---|---|---|
 * | `DRV-0101` Ahmed Salem | 1 | `CMP-330` |
 * | `DRV-0103` Khalid Mansour | 1 | `CMP-301` |
 * | `DRV-0105` Youssef Nouri | 1 | `CMP-318` |
 * | `DRV-0202` Majed Al-Shamrani | **2** | `CMP-343`, `CMP-344` |
 * | `DRV-0204` Turki Al-Mutairi | **3** | `CMP-350`, `CMP-351`, `CMP-352` |
 *
 * Every other captain has none, which matches every other driver fixture.
 *
 * **`DRV-0101` is a genuine cross-fixture defect and it is not mine to fix.**
 * `CMP-330` is `status: 'Open'` in legacy (`:2711`), notification **N6** says
 * *"CMP-330 against Ahmed Salem"* — and `fixtures/drivers.ts` gives `DRV-0101`
 * `openComplaints: 0` and `complaintIds: []`. One of the two is wrong and the
 * legacy record is the older witness, so `CMP-330` stays open here and the
 * driver fixture needs `openComplaints: 1, complaintIds: ['CMP-330']`. Raised
 * with the owner of `fixtures/drivers.ts` rather than worked around; inventing
 * an answer is how two fixtures ship incompatible truths.
 *
 * The same applies on the rider side, in both directions. `RDR-2031` filed
 * `CMP-301` (legacy `by`, `:2708`) and carries `complaintIds: []`; seven more
 * riders are in the same position. And `RDR-1049` Ali Al-Balawi — added to
 * `fixtures/riders.ts` while this file was being written, as the one rider
 * `management.churn.repeatComplaintRate` has to divide by — named `CMP-341` and
 * `CMP-347`, **neither of which existed**. Both now do, below, and the two
 * complaints this file had numbered `CMP-341` / `CMP-342` moved to `CMP-343` /
 * `CMP-344` to get out of the way. A rider fixture inventing complaint ids is
 * the same species of problem this whole file fixes, one level up.
 *
 * ## Coverage
 *
 * All four `ComplaintStatus` arms, all three `ComplaintSeverity` arms, all
 * three `ComplaintOutcome` arms, seven of the ten categories, and — the ones
 * that are easy to leave out and expensive to discover missing:
 *
 *   - a row with **no clock at all** (`CMP-322`, `slaSource: 'unset'`),
 *   - a row **breached and still open** (`CMP-301`, `CMP-330`, `CMP-343`, `CMP-351`),
 *   - a row **resolved late** (`CMP-372`) — breached, then disposed, and the
 *     breach stamp stays, which is `types/workQueue.ts`'s whole argument for
 *     `slaBreachedAt` being a field rather than `slaDueAt < now`,
 *   - a row whose **first-response clock broke while the resolve clock is
 *     intact** (`CMP-318`) — the two-clock case,
 *   - a row a **different operator is holding** (`CMP-344`, USR-5) and one
 *     **this operator holds** (`CMP-352`, USR-1),
 *   - a row against the **61-character Arabic captain name** (`CMP-361`) and
 *     one from the **44-character Arabic rider name** (`CMP-343`),
 *   - a Tier-1 row nobody has answered for eleven hours whose first-response
 *     breach **cannot be stamped** (`CMP-344`) — see below.
 *
 * ## The `fr: 0` defect, made visible rather than papered over
 *
 * `CAP_CONDUCT` and `SAF_RIDER_UNSAFE` are Tier-1 with `fr: 0` — answer
 * *immediately*. `slaState`'s check is `!firstResponseAtMs && frMs > 0 &&
 * elapsed > frMs` (`:14780`), so with `frMs === 0` the middle clause is false
 * and the breach can never be stamped. `CMP-344` is that row: filed 22:10 last
 * night, Tier-1, nobody has touched it, `firstResponseBreachedAt: null`. The
 * fixture reproduces the defect rather than hiding it, so the screen that
 * decides what to do about it has a row to do it on.
 */

import type { Complaint } from '../types/complaint'
import { COMPLAINT_RESOLVE_MINUTES } from '../types/complaint'

export const complaintFixtures: Complaint[] = [
  /* ══ legacy `DB.complaints`, all four ══════════════════════════════════ */
  {
    /* `:2708` — against DRV-0103, by RDR-2031, High, Open, 24 Jun.
       Filed on the morning of `TRP-7738`; the resolve window is four hours and
       it is a day and a half past it. Somebody owes an explanation. */
    id: 'CMP-301',
    category: 'punctuality',
    severity: 'high',
    status: 'open',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    tripId: 'TRP-7738',
    subscriptionId: 'SUB-1052',
    ticketId: null,
    disputeId: null,
    subject: 'Late pickup 3× consecutive',
    detail:
      'Third morning running the captain has arrived after the slot. I am late for work every time and nobody has called me back.',
    reasonCode: 'CAP_LATE',
    filedAt: '2026-06-24T07:30:00+03:00',
    slaStartedAt: '2026-06-24T07:30:00+03:00',
    slaDueAt: '2026-06-24T11:30:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.punctuality,
    slaBreachedAt: '2026-06-24T11:30:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T07:45:00+03:00',
    firstResponseAt: '2026-06-24T07:41:00+03:00',
    firstResponseBreachedAt: null,
    resolution: null,
    claim: null,
  },
  {
    /* `:2709` — against DRV-0102, by RDR-2087, **Low**, **Resolved**, 20 Jun.
       Legacy's `Low` and `Medium` both land on `normal`; see
       `ComplaintSeverity` for why, and for the finding that goes with it. */
    id: 'CMP-310',
    category: 'route',
    severity: 'normal',
    status: 'resolved',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    tripId: null,
    subscriptionId: 'SUB-0998',
    ticketId: null,
    disputeId: null,
    subject: 'Route deviation',
    detail: 'The captain went a different way than the map showed and it took longer.',
    reasonCode: 'TRP_ROUTE_DEVIATION',
    filedAt: '2026-06-20T14:05:00+03:00',
    slaStartedAt: '2026-06-20T14:05:00+03:00',
    slaDueAt: '2026-06-22T14:05:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.route,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-20T15:05:00+03:00',
    firstResponseAt: '2026-06-20T14:52:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      /* Dismissed, and **nothing is paid**. `dismissed` is claimant-neutral by
         design (`ComplaintOutcome`): the route was right, the rider was not
         being unreasonable, and the record says the first thing without
         implying the second. */
      outcome: 'dismissed',
      compensationHalalas: 0,
      refundId: null,
      note: 'GPS trail matches a live roadworks closure on Takhassusi. The diversion added 4 minutes and no charge.',
      resolvedAt: '2026-06-21T10:20:00+03:00',
      resolvedByUserId: 'USR-3',
      resolvedByUserName: 'Lina Al-Otaibi',
    },
    claim: null,
  },
  {
    /* `:2710` — against DRV-0105, by RDR-2055, Medium, Open, 25 Jun, and
       `TRP-9003` is the cancelled quick ride behind it.

       **The two-clock row.** The resolve window (four hours) is intact; the
       first-response window (ten minutes) closed an hour ago with nobody having
       answered. A queue can break its promise to *answer* long before it breaks
       its promise to *finish* — `types/workQueue.ts` — and this is the only row
       in the set that shows it. */
    id: 'CMP-318',
    category: 'cancellation',
    severity: 'normal',
    status: 'open',
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    tripId: 'TRP-9003',
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Cancelled after arrival',
    detail: 'He pulled up, looked at the address, and cancelled. I was standing on the street.',
    reasonCode: 'CAP_CANCEL_ADV',
    filedAt: '2026-06-25T08:02:00+03:00',
    slaStartedAt: '2026-06-25T08:02:00+03:00',
    slaDueAt: '2026-06-25T12:02:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.cancellation,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-25T08:12:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-25T08:12:00+03:00',
    resolution: null,
    claim: null,
  },
  {
    /* `:2711` — against DRV-0101, by RDR-1075, Medium, **Open**, 23 Jun.
       This is notification **N6**'s target (`CMP-330 against Ahmed Salem`) and
       the reason `DRV-0101`'s `openComplaints: 0` is wrong — see the header.

       Severity is `high`, not `normal`: `CAP_CONDUCT` is the taxonomy's own
       Tier-1 code with a 50 SAR compensation ceiling, which is a stronger
       statement than legacy's `Medium` chip.

       The first response came 35 minutes late. That leaves
       `firstResponseBreachedAt: null` — legacy's `frMissed`, a **different
       failure** from `frBreached`: one already stopped, the other is still
       happening (`:14781`). */
    id: 'CMP-330',
    category: 'conduct',
    severity: 'high',
    status: 'open',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Driver behavior complaint',
    detail:
      'He argued with me about the drop-off point for the whole ride and raised his voice when I asked him to stop.',
    reasonCode: 'CAP_CONDUCT',
    filedAt: '2026-06-23T19:40:00+03:00',
    slaStartedAt: '2026-06-23T19:40:00+03:00',
    slaDueAt: '2026-06-24T19:40:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.conduct,
    slaBreachedAt: '2026-06-24T19:40:00+03:00',
    slaSource: 'legacy-reason-code',
    /* `fr: 0` — the target is the filing instant itself. */
    firstResponseDueAt: '2026-06-23T19:40:00+03:00',
    firstResponseAt: '2026-06-23T20:15:00+03:00',
    firstResponseBreachedAt: null,
    resolution: null,
    claim: null,
  },

  /* ══ DRV-0202 · Majed Al-Shamrani · openComplaints: 2 ══════════════════
     Suspended with `manualFlag: true`. The driver fixture's stated suspension
     reason is an expired operating card; these two are what the manual flag was
     for, and the second is the one still unanswered. */
  {
    /* Filed by the 44-character Arabic rider name. `CAP_OFFPLATFORM_PAY` is a
       compliance matter — the captain asked to be paid outside the platform —
       and it is six days past a 24-hour window. */
    id: 'CMP-343',
    category: 'off-platform-payment',
    severity: 'high',
    status: 'open',
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Captain asked for cash and told me to cancel in the app',
    detail:
      'He said the app fee was too high and asked me to cancel the ride and pay him 40 riyals directly. I refused and he drove off.',
    reasonCode: 'CAP_OFFPLATFORM_PAY',
    filedAt: '2026-06-18T13:05:00+03:00',
    slaStartedAt: '2026-06-18T13:05:00+03:00',
    slaDueAt: '2026-06-19T13:05:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES['off-platform-payment'],
    slaBreachedAt: '2026-06-19T13:05:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-18T13:20:00+03:00',
    firstResponseAt: '2026-06-18T13:18:00+03:00',
    firstResponseBreachedAt: null,
    resolution: null,
    claim: null,
  },
  {
    /* **`critical`, Tier-1, eleven hours old, nobody has answered — and the
       first-response breach cannot be stamped**, because `CAP_CONDUCT` has
       `fr: 0` and `:14780` requires `frMs > 0`. The strictest promise in the
       taxonomy is the one the clock cannot enforce. See the file header.

       Held by USR-5, so the take-over affordance has a row. */
    id: 'CMP-344',
    category: 'conduct',
    severity: 'critical',
    status: 'open',
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Captain followed me after drop-off',
    detail:
      'After I got out he drove slowly behind me down the street for about two minutes. I went into a shop and waited until he left.',
    reasonCode: 'CAP_CONDUCT',
    filedAt: '2026-06-24T22:10:00+03:00',
    slaStartedAt: '2026-06-24T22:10:00+03:00',
    slaDueAt: '2026-06-25T22:10:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.conduct,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T22:10:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    resolution: null,
    claim: {
      key: 'complaint:CMP-344',
      entityType: 'complaint',
      entityId: 'CMP-344',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: '2026-06-25T08:05:00+03:00',
      touchedAt: '2026-06-25T08:47:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
  },

  /* ══ DRV-0204 · Turki Al-Mutairi · openComplaints: 3 ═══════════════════
     `flaggedForDeclines`, `manualFlag`, 62 % on-time, a rejected bank record.
     Three open complaints is what that captain looks like from the rider side. */
  {
    id: 'CMP-350',
    category: 'punctuality',
    severity: 'normal',
    status: 'open',
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Fifteen minutes late again this morning',
    detail: null,
    reasonCode: 'CAP_LATE',
    filedAt: '2026-06-25T06:50:00+03:00',
    slaStartedAt: '2026-06-25T06:50:00+03:00',
    slaDueAt: '2026-06-25T10:50:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.punctuality,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-25T07:05:00+03:00',
    firstResponseAt: '2026-06-25T07:02:00+03:00',
    firstResponseBreachedAt: null,
    resolution: null,
    claim: null,
  },
  {
    /* Two days old, breached on both clocks, and **nobody has ever touched
       it** — `firstResponseAt: null` with a stamped `firstResponseBreachedAt`.
       The row an operations review is looking for.

       Linked to `TKT-503`, whose subject is *"Captain did not arrive for
       scheduled morning departure"*. Note that `TKT-503`'s own `entityId`
       (`RDR-1043`) names a rider that is not in `fixtures/riders.ts` — the
       ticket fixtures carry several such names, which is a pre-existing drift
       in that file and is raised there, not patched here. */
    id: 'CMP-351',
    category: 'no-show',
    severity: 'high',
    status: 'open',
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    tripId: null,
    subscriptionId: null,
    ticketId: 'TKT-503',
    disputeId: null,
    subject: 'Captain never arrived and marked the trip complete',
    detail:
      'I waited 25 minutes at the gate. He never came and the app then said the trip had finished. I was charged.',
    reasonCode: 'CAP_NOSHOW',
    filedAt: '2026-06-23T06:15:00+03:00',
    slaStartedAt: '2026-06-23T06:15:00+03:00',
    slaDueAt: '2026-06-23T10:15:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES['no-show'],
    slaBreachedAt: '2026-06-23T10:15:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-23T06:25:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-23T06:25:00+03:00',
    resolution: null,
    claim: null,
  },
  {
    /* **The complaint that became a money claim.** `DSP-112` is an open
       `fare-dispute` by `RDR-3002` against `DRV-0204` in
       `fixtures/disputes.ts`; this is the conduct grievance it started as. The
       two records coexist because they end differently — a complaint can be
       settled with an apology, a dispute cannot (`types/complaint.ts`).

       `under-review`, claimed by the current operator, so the `mine` view and
       the release affordance both have a row. */
    id: 'CMP-352',
    category: 'fare',
    severity: 'normal',
    status: 'under-review',
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    riderId: 'RDR-3002',
    riderName: 'Hind Al-Sulaiman',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: 'DSP-112',
    subject: 'Charged a different amount than the app quoted',
    detail: 'The app said 32 riyals before I booked and the receipt says 51.',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    filedAt: '2026-06-24T17:30:00+03:00',
    slaStartedAt: '2026-06-24T17:30:00+03:00',
    slaDueAt: '2026-06-25T17:30:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.fare,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T17:45:00+03:00',
    firstResponseAt: '2026-06-24T17:44:00+03:00',
    firstResponseBreachedAt: null,
    resolution: null,
    claim: {
      key: 'complaint:CMP-352',
      entityType: 'complaint',
      entityId: 'CMP-352',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: '2026-06-25T08:58:00+03:00',
      touchedAt: '2026-06-25T09:11:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
  },

  /* ══ the disposed rows ════════════════════════════════════════════════ */
  {
    /* **`withdrawn`, and no clock at all.**
     *
     * `vehicle-condition` is the one category `DB.reasonCodes` does not cover,
     * so `reasonCode` is `null`, `slaSource` is `unset` and every SLA field is
     * `null` — not zero, not a synthetic deadline. No countdown, no track, no
     * breach, tone stays neutral (`types/workQueue.ts`).
     *
     * `withdrawn` also carries `resolution: null`: the rider dropped it and
     * nobody decided anything, which is a different fact from `dismissed` and
     * must not render as one.
     */
    id: 'CMP-322',
    category: 'vehicle-condition',
    severity: 'normal',
    status: 'withdrawn',
    driverId: 'DRV-0106',
    driverName: 'Reem Al-Otaibi',
    riderId: 'RDR-1060',
    riderName: 'Khaled Al-Zahrani',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Air conditioning was not working',
    detail: null,
    reasonCode: null,
    filedAt: '2026-06-19T09:00:00+03:00',
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    resolution: null,
    claim: null,
  },
  {
    /* **`upheld` with real compensation**, against the 61-character Arabic
       captain name, on the taxonomy's tightest window: `SAF_RIDER_UNSAFE` is
       Tier-1 with a 60-minute resolve target and a 100 SAR ceiling, and this
       was closed in 32 minutes.

       10,000 halalas posts to `expense.compensation` — *"Rider compensation"*,
       an account the chart already carries. It is **not** a refund: nothing was
       returned, so `refundId` is null, no credit note is minted and
       `contra.refunds` is untouched (§3.4). */
    id: 'CMP-361',
    category: 'safety',
    severity: 'critical',
    status: 'resolved',
    driverId: 'DRV-0201',
    driverName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    riderId: 'RDR-3001',
    riderName: 'Abdullah Al-Rasheed',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Captain was driving at speed on the wrong side of a service road',
    detail:
      'He overtook three cars on the shoulder to get to the ring road. I asked him to stop and he did not.',
    reasonCode: 'SAF_RIDER_UNSAFE',
    filedAt: '2026-06-14T22:40:00+03:00',
    slaStartedAt: '2026-06-14T22:40:00+03:00',
    slaDueAt: '2026-06-14T23:40:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.safety,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-14T22:40:00+03:00',
    firstResponseAt: '2026-06-14T22:42:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      outcome: 'upheld',
      compensationHalalas: 10_000,
      refundId: null,
      note: 'Telematics confirms two hard-acceleration events on the shoulder. Captain coached and moved to review.',
      resolvedAt: '2026-06-14T23:12:00+03:00',
      resolvedByUserId: 'USR-3',
      resolvedByUserName: 'Lina Al-Otaibi',
    },
    claim: null,
  },
  {
    /* **Resolved, but late.** Breached on 12 Jun, disposed on 13 Jun, and
       `slaBreachedAt` stays stamped forever — the row `types/workQueue.ts` is
       written around, and the reason breach is a field rather than
       `slaDueAt < now`, which would call every closed row in the archive
       overdue.

       `partially-upheld` with 25.00 SAR: the delay was real, the amount claimed
       was not. */
    id: 'CMP-372',
    category: 'other',
    severity: 'normal',
    status: 'resolved',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Nobody told me my regular captain had changed',
    detail:
      'Different car, different person, no message. I only found out when he called from the gate.',
    reasonCode: 'OTHER_UNCODED',
    filedAt: '2026-06-10T11:00:00+03:00',
    slaStartedAt: '2026-06-10T11:00:00+03:00',
    slaDueAt: '2026-06-12T11:00:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.other,
    slaBreachedAt: '2026-06-12T11:00:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-10T12:00:00+03:00',
    firstResponseAt: '2026-06-10T11:36:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      outcome: 'partially-upheld',
      compensationHalalas: 2_500,
      refundId: null,
      note: 'Reassignment notice was never sent — a real failure. The plan itself ran as sold, so the claim for a full week is not upheld.',
      resolvedAt: '2026-06-13T09:30:00+03:00',
      resolvedByUserId: 'USR-2',
      resolvedByUserName: 'Fahad Al-Dosari',
    },
    claim: null,
  },
  {
    /* Dismissed against `TRP-9101`, the trip the platform itself recorded as a
       no-show. The rider says the captain never came; the trip says the rider
       never boarded. **The two systems disagree and the record keeps both**,
       which is the case a complaint queue exists to arbitrate. */
    id: 'CMP-380',
    category: 'no-show',
    severity: 'high',
    status: 'resolved',
    driverId: 'DRV-0207',
    driverName: 'Saud Al-Harbi',
    riderId: 'RDR-4001',
    riderName: 'Abdulaziz Al-Suwailem',
    tripId: 'TRP-9101',
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Charged a no-show fee for a captain who never arrived',
    detail: 'I was outside the whole time. He marked me as absent and I paid 15 riyals for nothing.',
    reasonCode: 'CAP_NOSHOW',
    filedAt: '2026-06-16T08:30:00+03:00',
    slaStartedAt: '2026-06-16T08:30:00+03:00',
    slaDueAt: '2026-06-16T12:30:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES['no-show'],
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-16T08:40:00+03:00',
    firstResponseAt: '2026-06-16T08:38:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      outcome: 'dismissed',
      compensationHalalas: 0,
      refundId: null,
      note: 'GPS trail places the vehicle stationary at the pickup point for 11 minutes. The fee stands.',
      resolvedAt: '2026-06-16T10:05:00+03:00',
      resolvedByUserId: 'USR-2',
      resolvedByUserName: 'Fahad Al-Dosari',
    },
    claim: null,
  },
  /* ══ RDR-1049 · Ali Al-Balawi · the repeat complainer ══════════════════
     `fixtures/riders.ts` gives him `complaintIds: ['CMP-341', 'CMP-347']` and
     `churnRisk: 'high'` at 2.6★, as the one row
     `management.churn.repeatComplaintRate` has to divide by — a metric that has
     only ever read 0.0 % because nobody was in that population. Both ids
     resolve now.

     Both **resolved**, deliberately: an open one would move a captain's
     `openComplaints` and break the reconciliation table at the top of this
     file. His movement log records a single `Complaint filed` entry on 21 Jun,
     and these are it — two grievances about the same night, filed twenty
     minutes apart, which is what a repeat complainer's record actually looks
     like. */
  {
    id: 'CMP-341',
    category: 'punctuality',
    severity: 'normal',
    status: 'resolved',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    riderId: 'RDR-1049',
    riderName: 'Ali Al-Balawi',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Waited twenty minutes at Al Batha for a five minute ETA',
    detail: 'The app kept saying five minutes for twenty minutes.',
    reasonCode: 'CAP_LATE',
    filedAt: '2026-06-21T23:10:00+03:00',
    slaStartedAt: '2026-06-21T23:10:00+03:00',
    slaDueAt: '2026-06-22T03:10:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.punctuality,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-21T23:25:00+03:00',
    firstResponseAt: '2026-06-21T23:19:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      outcome: 'partially-upheld',
      compensationHalalas: 1_500,
      refundId: null,
      note: 'ETA did stall on a stale position fix. The wait was 12 minutes, not 20.',
      resolvedAt: '2026-06-22T01:40:00+03:00',
      resolvedByUserId: 'USR-3',
      resolvedByUserName: 'Lina Al-Otaibi',
    },
    claim: null,
  },
  {
    /* The second grievance of the same night, and **the only one in the set
       whose remedy was a genuine refund of a charge rather than a goodwill
       credit** — so `refundId` is set and `compensationHalalas` is `0`. The two
       are different money: a refund reverses a sale through `contra.refunds`, a
       compensation credit is a new expense (§3.4). `REF-0003` is the wallet
       refund in `fixtures/financials.ts` with no source payment, which is
       exactly the shape a fare correction with no traceable charge takes. */
    id: 'CMP-347',
    category: 'fare',
    severity: 'normal',
    status: 'resolved',
    driverId: 'DRV-0106',
    driverName: 'Reem Al-Otaibi',
    riderId: 'RDR-1049',
    riderName: 'Ali Al-Balawi',
    tripId: null,
    subscriptionId: null,
    ticketId: null,
    disputeId: null,
    subject: 'Second ride the same night was charged at the surge rate',
    detail: null,
    reasonCode: 'PAY_INCORRECT_CHARGE',
    filedAt: '2026-06-21T23:32:00+03:00',
    slaStartedAt: '2026-06-21T23:32:00+03:00',
    slaDueAt: '2026-06-22T23:32:00+03:00',
    slaTargetMinutes: COMPLAINT_RESOLVE_MINUTES.fare,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-21T23:47:00+03:00',
    firstResponseAt: '2026-06-21T23:44:00+03:00',
    firstResponseBreachedAt: null,
    resolution: {
      outcome: 'upheld',
      compensationHalalas: 0,
      refundId: 'REF-0003',
      note: 'Surge multiplier applied outside a declared surge window. Fare corrected and the difference refunded to the wallet.',
      resolvedAt: '2026-06-22T09:05:00+03:00',
      resolvedByUserId: 'USR-3',
      resolvedByUserName: 'Lina Al-Otaibi',
    },
    claim: null,
  },
]
