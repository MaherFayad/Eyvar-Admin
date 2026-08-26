/**
 * Safety incident — Support › Safety & Incidents, three views
 * (`open`, `critical-sos`, `closed`).
 *
 * Derived from `DB.incidents` (`eyvar_ops_panel_v40_fixed.html:13389`),
 * `renderSafetyPage()` (`:13396`), `INC_STEPS` (`:13394`), `toggleIncStep`
 * (`:13458`), `precautionSuspend` (`:13468`) and `closeIncident` (`:13480`).
 *
 * ## Why this type did not exist until now, and why that mattered
 *
 * `fixtures/navCounts.ts` recorded a cross-fixture inconsistency it could not
 * fix: notification **N7** is an unacknowledged SOS on `TRP-7742`, and an open
 * SOS is the canonical breach in this product — yet `support-safety` sat at
 * `count: 0`, because there was no type to count. A queue that cannot be
 * counted cannot be toned, cannot be sorted and cannot be reached. This file
 * closes that gap; `fixtures/navCounts.ts` now spends one of its two
 * `attention` tones here, and says which sub-tab stepped aside.
 *
 * ## The protocol is the disposition set
 *
 * Most queues dispose with a verb (approve / reject, assign / expire, uphold /
 * overturn). This one disposes with a **checklist**: contact → verify → act →
 * document, and `closeIncident` refuses while any step is unticked (`:13483`).
 * That is modelled as data — four steps, each with who ticked it and when —
 * rather than as a `progress: number`, because the accountability trail is the
 * point (`:13452`) and a percentage cannot be audited.
 */

import type { Claim, IsoDateTime } from './common'
import type { SlaTracked, WorkItemSeverity } from './workQueue'

/**
 * Legacy `type` is **free text** rendered straight into a grey chip
 * (`:13437`): `'SOS'`, `'Accident'`, `'Harassment report'`. A free string
 * cannot be filtered, faceted or translated, so it is closed here.
 *
 * The two extra members are not invented — they are the remaining §6 reason
 * codes in `DB.reasonCodes` (`:14692`–`:14694`), which is the taxonomy this
 * product already ships:
 *   `SAF_RIDER_UNSAFE` §6.1 → `unsafe-driving`
 *   `SAF_THEFT`        §6.3 → `theft`
 * `other` exists so the enum is closed rather than open-ended.
 */
export type SafetyIncidentType =
  | 'sos'
  | 'accident'
  | 'harassment'
  | 'unsafe-driving'
  | 'theft'
  | 'other'

/**
 * Legacy `severity` (`:13390`), verbatim. Drives the `critical-sos` view and
 * the row emphasis, **not** the queue order — see `WorkItemSeverity`.
 *
 * Tones (R7): critical → `warning`, high → `warning`, normal → `neutral`.
 *
 * **Finding for product-designer.** Legacy renders critical as
 * `<span class="b b-red">🆘 CRITICAL</span>` over a `--red-lt` row
 * (`:13435`, `:13441`). R5a permits no red badge and R7 has no fifth
 * escalation above `warning`, so `critical` and `high` collapse to one badge
 * tone and the distinction has to be carried some other way — a row marker, an
 * icon, or the SLA track. **That is a real loss of resolution on the one screen
 * where it matters most, and it is a design decision, not a data one.**
 */
export type SafetyIncidentSeverity = 'critical' | 'high' | 'normal'

/**
 * Legacy has exactly two (`:13390`, `closeIncident` `:13486`). Not extended:
 * the close handler's own comment says *"reopen it manually if new information
 * comes in later"* (`:13485`), which is a transition back to `open`, not a
 * third state.
 *
 * Tones (R7): open → `info`, closed → `neutral`.
 */
export type SafetyIncidentStatus = 'open' | 'closed'

/** `INC_STEPS` (`:13394`), in order. The labels are UI copy and live in the design spec. */
export type SafetyProtocolStepKey = 'contact' | 'verify' | 'act' | 'document'

export const SAFETY_PROTOCOL_STEPS: readonly SafetyProtocolStepKey[] = [
  'contact',
  'verify',
  'act',
  'document',
] as const

export interface SafetyProtocolStep {
  key: SafetyProtocolStepKey
  done: boolean
  /**
   * Legacy records `{done:true,by:'Sarah Al-Rashid',at:'Yesterday 18:52'}` —
   * a **name and a display string, no id and no instant** (`:13391`). Both an
   * id and an ISO instant here; the name stays because the audit trail must
   * survive a user being deleted.
   */
  completedByUserId: string | null
  completedByUserName: string | null
  completedAt: IsoDateTime | null
}

/** Legacy `precautionSuspend` writes `DB.complianceSuspensions[drvId]` and ticks `act` (`:13473`). */
export interface PrecautionarySuspension {
  driverId: string
  driverName: string
  reason: string
  at: IsoDateTime
  byUserId: string
  byUserName: string
}

export interface SafetyIncident extends SlaTracked {
  id: string
  type: SafetyIncidentType
  severity: SafetyIncidentSeverity
  status: SafetyIncidentStatus

  /**
   * The `SAF_*` code from `DB.reasonCodes`, so the SLA above has a traceable
   * origin. `null` where no code covers the type — see `slaSource: 'unset'`.
   */
  reasonCode: string | null

  /** One-line description. Legacy `summary` (`:13390`). */
  summary: string

  /** Legacy `opened:'09:02' | 'Yesterday 18:40' | '22 Jun'` — three formats in one field. */
  openedAt: IsoDateTime
  /** `null` while open. Legacy never records *when* an incident closed, only that it did. */
  closedAt: IsoDateTime | null
  closedByUserId: string | null
  closedByUserName: string | null

  /** Legacy `trip` (`:13390`). Nullable: an incident can be raised off-trip. */
  tripId: string | null

  /**
   * Who raised it. **Nullable, and one fixture exercises it.**
   *
   * Legacy always has a reporter and renders `nm2(inc.reporter)`
   * unconditionally (`:13432`) — so an incident with none prints the raw id or
   * `undefined` into the operator's row. A device-triggered incident
   * (automatic crash detection, a panic press from a signed-out session) has no
   * human reporter, and modelling it as a required field is how that row
   * becomes a support call instead of a screen.
   */
  reporterId: string | null
  reporterName: string | null
  /** Legacy `reporter` is `RDR-*` or `DRV-*` (`:13390`–`:13391`). `null` when there is no reporter. */
  reporterKind: 'rider' | 'driver' | 'system' | null

  /** Who it is against. `null` on `INC-013` in the legacy seed — a driver-reported accident with no counterparty. */
  againstId: string | null
  againstName: string | null

  /** Always four entries, in `SAFETY_PROTOCOL_STEPS` order. Never a subset. */
  protocol: SafetyProtocolStep[]

  precautionarySuspension: PrecautionarySuspension | null

  /**
   * Legacy's own urgency read: `inboxItems()` pushes a critical incident with
   * `dueMs: -1` — **already breached** — and everything else with `null`, no
   * clock at all (`:19188`). Restated as a field so the inbox and this queue
   * cannot disagree.
   */
  workSeverity: WorkItemSeverity

  claim: Claim | null
}

/**
 * SLA windows, in minutes, from `DB.reasonCodes` §6 (`:14692`–`:14694`) via
 * `rcTargets` (`:14730`).
 *
 * **Three of six types have a shipped number; three do not.** The three that
 * do are mapped; the rest carry `null` and render no countdown until Q8 says
 * otherwise. Filling those in from a plausible neighbour is the `/90` bug at
 * `:11652` all over again.
 *
 * Note what the code says about the first response on a Tier-1 incident:
 * `DB.slaPolicy.tiers.T1.firstResponseMin = 0` (`:14652`) — *immediately*. And
 * note the defect that hides it: `slaState`'s breach check is
 * `frBreached: !obj.firstResponseAtMs && frMs > 0 && elapsedFr > frMs`
 * (`:14780`). With `frMs === 0` the middle clause is false, so **a Critical
 * incident's zero-minute first-response target can never register a breach.**
 * The strictest promise in the product is the one the clock cannot enforce.
 * Recorded here as a finding; the resolve window below is unaffected.
 */
export const SAFETY_RESOLVE_MINUTES: Record<SafetyIncidentType, number | null> = {
  /* SAF_RIDER_UNSAFE §6.1 — T1, res 60. An SOS is the rider pressing that button. */
  sos: 60,
  /* SAF_ACCIDENT §6.2 — T1, res 60. */
  accident: 60,
  /* SAF_RIDER_UNSAFE §6.1 — T1, res 60. */
  'unsafe-driving': 60,
  /* SAF_THEFT §6.3 — T2, res 1440. */
  theft: 1440,
  /* No §6 code covers a harassment report. Open — product-owner (Q8). */
  harassment: null,
  other: null,
}

/** The reason code each type inherits its window from. `null` where none exists. */
export const SAFETY_REASON_CODE: Record<SafetyIncidentType, string | null> = {
  sos: 'SAF_RIDER_UNSAFE',
  accident: 'SAF_ACCIDENT',
  'unsafe-driving': 'SAF_RIDER_UNSAFE',
  theft: 'SAF_THEFT',
  harassment: null,
  other: null,
}
