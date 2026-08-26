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

import type { SafetyIncident, SafetyProtocolStep, SafetyProtocolStepKey } from '../types/safety'
import { SAFETY_PROTOCOL_STEPS, SAFETY_REASON_CODE, SAFETY_RESOLVE_MINUTES } from '../types/safety'

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

export const safetyIncidentFixtures: SafetyIncident[] = [
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
    tripId: 'TRP-8977',
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
    tripId: 'TRP-8901',
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
    tripId: 'TRP-8845',
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
    tripId: 'TRP-8720',
    reporterId: 'RDR-2031',
    reporterName: 'Tariq Al-Saud',
    reporterKind: 'rider',
    againstId: 'DRV-0105',
    againstName: 'Youssef Nouri',
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
    tripId: 'TRP-8690',
    reporterId: 'RDR-1041',
    reporterName: 'Nora Al-Harbi',
    reporterKind: 'rider',
    againstId: 'DRV-0207',
    againstName: 'Saud Al-Harbi',
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
