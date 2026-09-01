/**
 * Safety incidents — Support › Safety & Incidents.
 *
 * `INC-011`, `INC-013` and `INC-014` are `DB.incidents`
 * (`eyvar_ops_panel_v40_fixed.html:13389`) converted field-for-field: ids,
 * types, severities, statuses, trips, reporters, summaries and every completed
 * protocol step with its author, verbatim. The rest are added to reach states
 * the seeded three cannot.
 *
 * ## `INC-015` is the reason this file exists
 *
 * Notification **N7** — `SOS — TRP-7742 · rider triggered the panic button`,
 * six minutes old, unread, routing to `/support/safety?view=critical-sos` — has
 * pointed at an empty queue since the notification fixtures were written,
 * because there was no `SafetyIncident` type to point at.
 * `fixtures/navCounts.ts` recorded that as a known cross-fixture inconsistency
 * and left `support-safety` at `count: 0`. `INC-015` is the incident N7 is
 * about, down to the trip, the rider, the captain and the minute.
 *
 * `support-safety` now carries the product's **one visible `attention` tone**,
 * and `fixtures/navCounts.ts` says which sub-tab stepped aside for it.
 *
 * ## The breach that has no denominator problem
 *
 * `Applicant.slaDueAt` needed a window nobody had decided (**Q8**). An open SOS
 * does not: `DB.slaPolicy.tiers.T1.firstResponseMin` is **0** (`:14652`) —
 * respond immediately — so an unacknowledged SOS is past its first-response
 * deadline the instant it is raised, with no number to choose. The legacy
 * inbox already encodes exactly that, pushing every critical incident with
 * `dueMs: -1`, already breached (`:19188`).
 *
 * ## What each row is for
 *
 * `INC-014`  legacy SOS, 12 min old, **nobody has touched it**. First response
 *            breached; resolve window (60 min) still running.
 * `INC-015`  N7's SOS, 6 min old, same shape. Two live criticals is not
 *            unrealistic and it is what the `critical-sos` view is for.
 * `INC-013`  legacy accident, **resolve-breached by thirteen and a half
 *            hours**, first response made on time. Beside `INC-014` this is
 *            minutes-over against hours-over on one screen.
 * `INC-016`  inside its window, **held by another operator** (`USR-3`).
 * `INC-017`  **no reporter at all** — automatic crash detection. Legacy renders
 *            `nm2(inc.reporter)` unconditionally (`:13432`), so this row prints
 *            `undefined` into an operator's list in the legacy app.
 * `INC-019`  a **precautionary suspension** already applied, and the `act` step
 *            ticked by it — the one protocol step the system can complete on
 *            an operator's behalf (`:13473`). Claimed by the current user.
 * `INC-011`  legacy harassment report, **closed with all four steps** and
 *            **no clock at all**: no §6 reason code covers harassment, so
 *            `slaSource` is `unset` and no countdown ever rendered.
 * `INC-018`  closed **inside** its window, five days ago. `slaDueAt` is long
 *            past and `slaBreachedAt` is `null` — the row that fails a naive
 *            `slaDueAt < now` breach check.
 */

import type { IsoDateTime } from '../types/common'
import type {
  SafetyIncident,
  SafetyIncidentType,
  SafetyProtocolStep,
  SafetyProtocolStepKey,
} from '../types/safety'
import { SAFETY_PROTOCOL_STEPS, SAFETY_REASON_CODE, SAFETY_RESOLVE_MINUTES } from '../types/safety'
import { cycle, cycleRecord } from './cycle'
import { allTripFixtures } from './trips'

/**
 * Build the four-step protocol block. Always four entries in
 * `SAFETY_PROTOCOL_STEPS` order — never a subset, so a screen can render four
 * rows without a lookup and a missing step cannot masquerade as an undone one.
 *
 * Not a clever factory: it takes a literal map of the *done* steps and fills
 * the rest. Anyone hand-editing a row edits the literal.
 */
function protocol(
  done: Partial<Record<SafetyProtocolStepKey, { userId: string; userName: string; at: string }>>,
): SafetyProtocolStep[] {
  return SAFETY_PROTOCOL_STEPS.map((key) => {
    const d = done[key]
    return {
      key,
      done: Boolean(d),
      completedByUserId: d?.userId ?? null,
      completedByUserName: d?.userName ?? null,
      completedAt: d?.at ?? null,
    }
  })
}

const namedSafetyIncidents: SafetyIncident[] = [
  {
    id: 'INC-014',
    type: 'sos',
    severity: 'critical',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.sos,
    summary: 'Rider pressed SOS during trip — no answer on first callback',
    openedAt: '2026-06-25T09:02:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    tripId: 'TRP-9012',
    reporterId: 'RDR-2087',
    reporterName: 'Layla Al-Faraj',
    reporterKind: 'rider',
    againstId: 'DRV-0102',
    againstName: 'Omar Farouk',
    protocol: protocol({}),
    precautionarySuspension: null,
    workSeverity: 'critical',
    claim: null,
    slaStartedAt: '2026-06-25T09:02:00+03:00',
    slaDueAt: '2026-06-25T10:02:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES.sos,
    /* Inside its 60-minute resolve window. The breach below is the *response*,
       not the resolution — two clocks, and only one of them has run out. */
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-25T09:02:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-25T09:02:00+03:00',
  },
  {
    /**
     * **The incident notification N7 has been pointing at.**
     * `TRP-7742` · rider `RDR-2055` · captain `DRV-0103` — the same trip, rider
     * and captain the notification names, six minutes before the fixed clock.
     */
    id: 'INC-015',
    type: 'sos',
    severity: 'critical',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.sos,
    summary: 'Rider triggered the panic button mid-trip — captain 8 minutes late to pickup, no contact since',
    openedAt: '2026-06-25T09:08:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    tripId: 'TRP-7742',
    reporterId: 'RDR-2055',
    reporterName: 'Bandar Al-Harbi',
    reporterKind: 'rider',
    againstId: 'DRV-0103',
    againstName: 'Khalid Mansour',
    protocol: protocol({}),
    precautionarySuspension: null,
    workSeverity: 'critical',
    claim: null,
    slaStartedAt: '2026-06-25T09:08:00+03:00',
    slaDueAt: '2026-06-25T10:08:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES.sos,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-25T09:08:00+03:00',
    firstResponseAt: null,
    firstResponseBreachedAt: '2026-06-25T09:08:00+03:00',
  },
  {
    /**
     * **Resolve-breached by thirteen and a half hours**, and the first response
     * was made on time — twelve minutes in, against a zero-minute target it
     * could never have met. Answered, then dropped: two protocol steps done
     * yesterday evening and nothing since.
     *
     * `againstId` is `null` in the legacy seed and stays null here — a captain
     * reporting their own collision has no counterparty, and a screen that
     * assumes one renders "Against undefined".
     */
    id: 'INC-013',
    type: 'accident',
    severity: 'high',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.accident,
    summary: 'Minor collision reported by driver — no injuries, vehicle drivable',
    openedAt: '2026-06-24T18:40:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    /* Was `TRP-8977`, legacy verbatim (`:13391`) -- and **it does not exist in
       legacy either**: `DB.trips` holds eight rows and this is not one of them,
       so the legacy incident list has always linked to nothing. `TRP-8010` is a
       real leg driven by `DRV-0104`, who is this incident's reporter, so the
       trip and the incident now name the same captain. */
    tripId: 'TRP-8010',
    reporterId: 'DRV-0104',
    reporterName: 'Hassan Al-Ghamdi',
    reporterKind: 'driver',
    againstId: null,
    againstName: null,
    protocol: protocol({
      contact: { userId: 'USR-1', userName: 'Sarah Al-Rashid', at: '2026-06-24T18:52:00+03:00' },
      verify: { userId: 'USR-1', userName: 'Sarah Al-Rashid', at: '2026-06-24T19:10:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'high',
    claim: null,
    slaStartedAt: '2026-06-24T18:40:00+03:00',
    slaDueAt: '2026-06-24T19:40:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES.accident,
    slaBreachedAt: '2026-06-24T19:40:00+03:00',
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T18:40:00+03:00',
    firstResponseAt: '2026-06-24T18:52:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /* Inside its 24-hour window, 13 hours used, and **held by USR-3** — the
       take-over affordance's case on this queue. */
    id: 'INC-016',
    type: 'theft',
    severity: 'normal',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.theft,
    summary: 'Rider reports a laptop bag left in the vehicle and not returned after two callbacks',
    openedAt: '2026-06-24T20:15:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    /* Was `TRP-8901`, which no collection held. `TRP-8004` is `SUB-1075`'s
       leg -- rider `RDR-1075`, captain `DRV-0101` -- the exact pair this
       incident is between. */
    tripId: 'TRP-8004',
    reporterId: 'RDR-1075',
    reporterName: 'Sara Al-Ghamdi',
    reporterKind: 'rider',
    againstId: 'DRV-0101',
    againstName: 'Ahmed Salem',
    protocol: protocol({
      contact: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-24T20:41:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'normal',
    claim: {
      key: 'incident:INC-016',
      entityType: 'incident',
      entityId: 'INC-016',
      ownerId: 'USR-3',
      ownerName: 'Lina Al-Otaibi',
      claimedAt: '2026-06-25T08:52:00+03:00',
      touchedAt: '2026-06-25T09:04:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: '2026-06-24T20:15:00+03:00',
    slaDueAt: '2026-06-25T20:15:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES.theft,
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-24T20:30:00+03:00',
    firstResponseAt: '2026-06-24T20:41:00+03:00',
    /* Answered eleven minutes past a fifteen-minute target — late, but
       answered. `frMissed`, not `frBreached` (`:14780`–`:14781`). */
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **No reporter.** Raised by the captain's device, not by a person:
     * automatic crash detection on a trip whose captain had been assigned but
     * had not started. `reporterId`, `reporterName` and `againstId` are all
     * `null`, and `reporterKind` is `'system'`.
     *
     * Legacy has no such row and its renderer cannot survive one:
     * `'Reporter '+nm2(inc.reporter)` (`:13432`) with `inc.reporter === undefined`
     * prints the literal string into the operator's list.
     */
    id: 'INC-017',
    type: 'accident',
    severity: 'high',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.accident,
    summary: 'Automatic crash detection fired on the captain device — no voice contact established',
    openedAt: '2026-06-25T08:31:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    tripId: 'TRP-9103',
    reporterId: null,
    reporterName: null,
    reporterKind: 'system',
    againstId: null,
    againstName: null,
    protocol: protocol({
      contact: { userId: 'USR-5', userName: 'Yousef Al-Balawi', at: '2026-06-25T08:33:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'high',
    claim: null,
    slaStartedAt: '2026-06-25T08:31:00+03:00',
    slaDueAt: '2026-06-25T09:31:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES.accident,
    /* Seventeen minutes left on the resolve clock. The row that shows a
       countdown rather than an overrun. */
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-25T08:31:00+03:00',
    /**
     * Answered in two minutes — and still **late**, because the target is zero.
     * A promise nobody can keep is not a promise; whether T1's
     * `firstResponseMin: 0` (`:14652`) is a commitment or a placeholder is a
     * **product-owner question (Q8)**, and this row is the one that asks it.
     */
    firstResponseAt: '2026-06-25T08:33:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * A **precautionary suspension already applied**, which ticked the `act`
     * step as a side effect (`:13473`) — the only protocol step the system
     * completes on an operator's behalf. Held by the current user (`USR-1`), so
     * the release affordance has a case.
     *
     * **No clock**: no §6 reason code covers a harassment report, so every SLA
     * field is `null` and `slaSource` is `unset`. This row renders with no
     * countdown, no track and a `neutral` band — not a breach, and not a zero.
     */
    id: 'INC-019',
    type: 'harassment',
    severity: 'high',
    status: 'open',
    reasonCode: SAFETY_REASON_CODE.harassment,
    summary: 'Rider reports intimidating language and a refusal to follow the agreed route',
    openedAt: '2026-06-23T21:10:00+03:00',
    closedAt: null,
    closedByUserId: null,
    closedByUserName: null,
    /* Was `TRP-8845`, which no collection held. `TRP-9108` is this captain's
       last leg before the suspension, and it is the trip the report is about. */
    tripId: 'TRP-9108',
    reporterId: 'RDR-1060',
    reporterName: 'Khaled Al-Zahrani',
    reporterKind: 'rider',
    againstId: 'DRV-0202',
    againstName: 'Majed Al-Shamrani',
    protocol: protocol({
      contact: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-23T21:38:00+03:00' },
      act: { userId: 'USR-1', userName: 'Sarah Al-Rashid', at: '2026-06-23T22:05:00+03:00' },
    }),
    precautionarySuspension: {
      driverId: 'DRV-0202',
      driverName: 'Majed Al-Shamrani',
      reason: 'Precautionary — pending INC-019 investigation',
      at: '2026-06-23T22:05:00+03:00',
      byUserId: 'USR-1',
      byUserName: 'Sarah Al-Rashid',
    },
    workSeverity: 'high',
    claim: {
      key: 'incident:INC-019',
      entityType: 'incident',
      entityId: 'INC-019',
      ownerId: 'USR-1',
      ownerName: 'Sarah Al-Rashid',
      claimedAt: '2026-06-25T08:58:00+03:00',
      touchedAt: '2026-06-25T09:11:00+03:00',
      state: 'claimed',
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
    firstResponseAt: '2026-06-23T21:38:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /* Legacy `INC-011`, verbatim: closed, all four steps, two operators, and
       no clock — the archive row the `closed` view is built on. */
    id: 'INC-011',
    type: 'harassment',
    severity: 'high',
    status: 'closed',
    reasonCode: SAFETY_REASON_CODE.harassment,
    summary: 'Verbal misconduct reported — investigated, warning issued, rider credited',
    openedAt: '2026-06-22T09:48:00+03:00',
    closedAt: '2026-06-22T14:45:00+03:00',
    closedByUserId: 'USR-1',
    closedByUserName: 'Sarah Al-Rashid',
    /**
     * Was `TRP-8720` against `DRV-0105` -- and `TRP-8720` exists in no
     * collection, in this layer or in legacy (`:13392`).
     *
     * **The reporter is kept and the counterparty moves**, because the
     * counterparty is a *join off the trip*: a harassment report is filed by
     * the rider of a trip against the captain of that trip, so whichever of the
     * two is wrong, it is the one the trip contradicts. `RDR-2031` holds
     * `SUB-1052`, whose legs are driven by `DRV-0103`; `TRP-8007` is the one
     * that ran three days before the report.
     */
    tripId: 'TRP-8007',
    reporterId: 'RDR-2031',
    reporterName: 'Tariq Al-Saud',
    reporterKind: 'rider',
    againstId: 'DRV-0103',
    againstName: 'Khalid Mansour',
    protocol: protocol({
      contact: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T10:15:00+03:00' },
      verify: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T11:02:00+03:00' },
      act: { userId: 'USR-1', userName: 'Sarah Al-Rashid', at: '2026-06-22T14:30:00+03:00' },
      document: { userId: 'USR-1', userName: 'Sarah Al-Rashid', at: '2026-06-22T14:45:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'high',
    claim: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: '2026-06-22T10:15:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Merely old.** Deadline `2026-06-18T15:02`, seven days past; closed at
     * `14:41`, twenty-one minutes inside it. `slaDueAt < now` says breached; it
     * was not. This is the safety-queue twin of `SREQ-002`.
     */
    id: 'INC-018',
    type: 'unsafe-driving',
    severity: 'normal',
    status: 'closed',
    reasonCode: SAFETY_REASON_CODE['unsafe-driving'],
    summary: 'Rider reported speeding on the ring road — telemetry reviewed, captain coached',
    openedAt: '2026-06-18T14:02:00+03:00',
    closedAt: '2026-06-18T14:41:00+03:00',
    closedByUserId: 'USR-5',
    closedByUserName: 'Yousef Al-Balawi',
    /* Was `TRP-8690` against `DRV-0207`, and `TRP-8690` existed nowhere.
       `TRP-8016` is `RDR-1041`'s `SUB-1041` leg on 10 Jun, eight days before
       the report; its captain is `DRV-0101`, so the counterparty moves to the
       captain who actually drove -- the same reasoning as INC-011 above. */
    tripId: 'TRP-8016',
    reporterId: 'RDR-1041',
    reporterName: 'Nora Al-Harbi',
    reporterKind: 'rider',
    againstId: 'DRV-0101',
    againstName: 'Ahmed Salem',
    protocol: protocol({
      contact: { userId: 'USR-5', userName: 'Yousef Al-Balawi', at: '2026-06-18T14:06:00+03:00' },
      verify: { userId: 'USR-5', userName: 'Yousef Al-Balawi', at: '2026-06-18T14:20:00+03:00' },
      act: { userId: 'USR-5', userName: 'Yousef Al-Balawi', at: '2026-06-18T14:33:00+03:00' },
      document: { userId: 'USR-5', userName: 'Yousef Al-Balawi', at: '2026-06-18T14:41:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'normal',
    claim: null,
    slaStartedAt: '2026-06-18T14:02:00+03:00',
    slaDueAt: '2026-06-18T15:02:00+03:00',
    slaTargetMinutes: SAFETY_RESOLVE_MINUTES['unsafe-driving'],
    slaBreachedAt: null,
    slaSource: 'legacy-reason-code',
    firstResponseDueAt: '2026-06-18T14:02:00+03:00',
    firstResponseAt: '2026-06-18T14:06:00+03:00',
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **`other` -- the sixth incident type, and the first row to reach it.**
     *
     * `SafetyIncidentType` closes the enum with `other` so a report that fits
     * none of the five named kinds still has somewhere to go. The filter facet
     * has offered it since the type was written and nothing produced it, so the
     * facet has never matched a row and the chip has never rendered.
     *
     * Like `harassment`, no Section 6 reason code covers it, so
     * `SAFETY_RESOLVE_MINUTES.other` is `null` and the row carries **no clock
     * at all** -- `slaSource: 'unset'`, every SLA field null. Two of the six
     * types having no measurable window is the finding, not the fixture: it is
     * the same Q8 the harassment rows raise, and it is why `slaSource` exists.
     */
    id: 'INC-020',
    type: 'other',
    severity: 'normal',
    /**
     * **Closed, and that is a constraint rather than a preference.**
     * `fixtures/navCounts.ts:340` pins `support-safety` at `6` and reasons
     * about the six open rows *by id* over eighty lines — which two SOS
     * incidents justify the product's one `attention` tone, and which sub-tab
     * stepped aside for them. `navCounts.test.ts` asserts the literal against
     * the live `open` queue. A seventh open incident would either falsify the
     * literal or silently rewrite that argument, so every row added to this
     * file after the original eight is closed.
     */
    status: 'closed',
    reasonCode: SAFETY_REASON_CODE.other,
    summary: 'Rider reports a child seat was promised on the plan and has not been fitted for three legs',
    openedAt: '2026-06-22T07:26:00+03:00',
    closedAt: '2026-06-22T11:40:00+03:00',
    closedByUserId: 'USR-3',
    closedByUserName: 'Lina Al-Otaibi',
    tripId: 'TRP-8004',
    reporterId: 'RDR-1075',
    reporterName: 'Sara Al-Ghamdi',
    reporterKind: 'rider',
    againstId: 'DRV-0101',
    againstName: 'Ahmed Salem',
    protocol: protocol({
      contact: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T07:41:00+03:00' },
      verify: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T09:02:00+03:00' },
      act: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T11:15:00+03:00' },
      document: { userId: 'USR-3', userName: 'Lina Al-Otaibi', at: '2026-06-22T11:40:00+03:00' },
    }),
    precautionarySuspension: null,
    workSeverity: 'normal',
    claim: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: '2026-06-22T07:41:00+03:00',
    firstResponseBreachedAt: null,
  },
]

/**
 * `iso` plus `minutes`, rendered back in the dataset's Riyadh offset.
 *
 * Local on purpose. `mock/clock.ts`'s `offsetFromNow` measures from the fixed
 * clock, and an incident's clock is measured from **the trip it is about** --
 * so a filler that used `offsetFromNow` for the opening time and read a trip
 * record for the parties would be doing exactly what `cycle.ts` exists to stop:
 * deriving two halves of one fact from two independent sources, and letting
 * them disagree about which came first.
 *
 * No host clock is read. `Date.parse` on a literal ISO string is total and
 * deterministic; `Date.now()` never appears.
 */
function plusMinutes(iso: IsoDateTime, minutes: number): IsoDateTime {
  const d = new Date(Date.parse(iso) + minutes * 60_000 + 3 * 3_600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+03:00`
  )
}

/**
 * Every finished trip with a captain on it, projected to the fields an incident
 * denormalises.
 *
 * **This is the whole anti-drift device.** An incident's `tripId`,
 * `reporterId`, `reporterName`, `againstId`, `againstName` and `openedAt` are
 * six facts about one event, and every one of them comes off the same `Trip`
 * record here. There is no second list to fall out of step with the first, and
 * a trip that stops existing is a build failure rather than a queue row linking
 * to a 404 -- which is what `TRP-8690`, `TRP-8720`, `TRP-8845`, `TRP-8901` and
 * `TRP-8977` were doing on five of the eight hand-written rows above.
 */
interface IncidentSubject {
  readonly id: string
  readonly riderId: string
  readonly riderName: string
  readonly driverId: string
  readonly driverName: string
  readonly endedAt: IsoDateTime
}

const INCIDENT_SUBJECTS: readonly IncidentSubject[] = allTripFixtures.flatMap((t) =>
  t.driverId === null || t.driverName === null || t.endedAt === null
    ? []
    : [
        {
          id: t.id,
          riderId: t.riderId,
          riderName: t.riderName,
          driverId: t.driverId,
          driverName: t.driverName,
          endedAt: t.endedAt,
        },
      ],
)

const FILLER_INCIDENT_TYPES: readonly SafetyIncidentType[] = [
  'unsafe-driving',
  'theft',
  'harassment',
  'accident',
  'other',
  'sos',
]

const FILLER_INCIDENT_SUMMARIES: readonly string[] = [
  'Rider reported harsh braking and lane weaving on the ring road',
  'Rider left a phone in the vehicle and reports it was not returned',
  'Rider reports the captain argued about the destination and raised his voice',
  'Kerb strike reported by the captain — no injuries, tyre replaced',
  'Rider reports the vehicle was not the one shown in the app',
  'Panic button pressed and cancelled within the same minute — no voice contact',
]

/**
 * Volume for the Safety queue. Eight hand-written rows could not page at the
 * default 25, so the second page, the sort controls and the `closed` archive
 * view had never been exercised against more than one screenful.
 *
 * Deterministic by index, and **every timestamp descends from the source
 * trip's own `endedAt`** — the incident is opened between four minutes and
 * three hours after the leg finished, its resolve clock starts there, and its
 * closing time falls inside or outside the window by construction rather than
 * by a literal somebody has to keep in step.
 *
 * **Every one of them is `closed`, and the open queue is deliberately not
 * grown.** `fixtures/navCounts.ts:340` pins `support-safety` at `6` and argues
 * for the product's one `attention` tone from those six rows by id;
 * `navCounts.test.ts` asserts the literal against the live `open` queue, and
 * `myWorkBacklogSize()` counts the same rows again. Adding open incidents would
 * falsify a number three files reason about. It is also the truthful shape: an
 * operations console's open safety queue is six rows and its archive is
 * hundreds.
 */
export const fillerSafetyIncidents: SafetyIncident[] = Array.from({ length: 44 }, (_, i) => {
  const subject = cycleRecord(INCIDENT_SUBJECTS, i * 7 + 1)
  const type = cycle(FILLER_INCIDENT_TYPES, i)
  const target = SAFETY_RESOLVE_MINUTES[type]
  const severity = type === 'sos' ? 'critical' : type === 'accident' || type === 'harassment' ? 'high' : 'normal'
  const openedAt = plusMinutes(subject.endedAt, 4 + ((i * 17) % 176))
  const respondedAt = plusMinutes(openedAt, 3 + (i % 24))
  const closedAt = plusMinutes(openedAt, 25 + ((i * 13) % 400))
  /* Two of the six types have no measurable window (Q8), so a third of these
     rows carry no clock at all — which is the honest distribution, not a gap. */
  const clocked = target !== null
  /* Whoever closed it, from one row of the roster. */
  const operator = cycleRecord(
    [
      { id: 'USR-1', name: 'Sarah Al-Rashid' },
      { id: 'USR-3', name: 'Lina Al-Otaibi' },
      { id: 'USR-5', name: 'Yousef Al-Balawi' },
    ],
    i,
  )
  const step = { userId: operator.id, userName: operator.name, at: respondedAt }
  return {
    id: `INC-${1001 + i}`,
    type,
    severity,
    status: 'closed',
    reasonCode: SAFETY_REASON_CODE[type],
    summary: cycle(FILLER_INCIDENT_SUMMARIES, i),
    openedAt,
    closedAt,
    closedByUserId: operator.id,
    closedByUserName: operator.name,
    tripId: subject.id,
    reporterId: subject.riderId,
    reporterName: subject.riderName,
    reporterKind: 'rider',
    againstId: subject.driverId,
    againstName: subject.driverName,
    protocol: protocol({
      contact: step,
      verify: { ...step, at: plusMinutes(respondedAt, 12) },
      act: { ...step, at: plusMinutes(respondedAt, 30) },
      document: { userId: operator.id, userName: operator.name, at: closedAt },
    }),
    precautionarySuspension: null,
    workSeverity: severity,
    /* A closed incident is in nobody's name — `closeIncident` releases the
       claim (`:13480`). The take-over case lives on `INC-016`, which is open. */
    claim: null,
    slaStartedAt: clocked ? openedAt : null,
    slaDueAt: clocked ? plusMinutes(openedAt, target) : null,
    slaTargetMinutes: target,
    /**
     * Breached iff it closed **later than its own deadline** — computed from
     * the two instants rather than asserted, so a row cannot claim a breach its
     * own dates deny. Roughly a third of them do breach, which is what makes
     * the archive worth sorting by.
     */
    slaBreachedAt:
      clocked && Date.parse(closedAt) > Date.parse(plusMinutes(openedAt, target))
        ? plusMinutes(openedAt, target)
        : null,
    slaSource: clocked ? 'legacy-reason-code' : 'unset',
    firstResponseDueAt: clocked ? plusMinutes(openedAt, severity === 'critical' ? 0 : 15) : null,
    firstResponseAt: respondedAt,
    firstResponseBreachedAt: null,
  } satisfies SafetyIncident
})

/** 53 rows — three pages at the default 25, and an archive worth sorting. */
export const safetyIncidentFixtures: SafetyIncident[] = [
  ...namedSafetyIncidents,
  ...fillerSafetyIncidents,
]

/**
 * **The clean-shift scenario: nothing open.**
 *
 * Not reachable by filtering the set above, and a real state — the console at
 * the end of a quiet night. Reached with `useQuietSafetyQueue()`; QA never
 * hand-edits a fixture to see the empty state, and the nav badge disappears
 * with it because `count: 0` renders nothing (Q12).
 *
 * Derived from the same rows rather than seeded separately, so it cannot drift.
 */
export const safetyIncidentFixturesAllClosed: SafetyIncident[] = safetyIncidentFixtures.map(
  (incident) =>
    incident.status === 'closed'
      ? incident
      : {
          ...incident,
          status: 'closed' as const,
          closedAt: '2026-06-25T09:12:00+03:00',
          closedByUserId: 'USR-1',
          closedByUserName: 'Sarah Al-Rashid',
          claim: null,
          protocol: incident.protocol.map((step) => ({
            ...step,
            done: true,
            completedByUserId: step.completedByUserId ?? 'USR-1',
            completedByUserName: step.completedByUserName ?? 'Sarah Al-Rashid',
            completedAt: step.completedAt ?? '2026-06-25T09:12:00+03:00',
          })),
          firstResponseBreachedAt: null,
          firstResponseAt: incident.firstResponseAt ?? '2026-06-25T09:10:00+03:00',
        },
)
