/**
 * Complaint — a rider's grievance against a captain, and the second of the two
 * id spaces the rebuild referenced everywhere and modelled nowhere.
 *
 * Legacy has it as a first-class collection: `DB.complaints`
 * (`eyvar_ops_panel_v40_fixed.html:2707`–`:2711`), four rows, resolved by
 * `resolveId` (`:3269`):
 *
 * ```js
 * {id, against, by, subject, date, severity, status}          // `:2708`
 * ```
 *
 * The rebuild ported `Driver.openComplaints`, `Driver.complaintIds` and
 * `Rider.complaintIds`, notification **N6** (`CMP-330 against Ahmed Salem`) and
 * `PROFILE_ENTITY_TYPES.complaint` — and none of the records. So
 * `Driver.openComplaints` is a count with nothing behind it, the Risk & Fraud
 * column sorts on a number no operator can open, and `clients/profile.ts` grew
 * a `complaintIndex` (`:218`) whose only job was to stop `?entity=CMP-330`
 * throwing.
 *
 * ## This is the third thing raised against a captain, so it borrows the shape
 *
 * `FairnessCase` and `SafetyIncident` already established the house vocabulary
 * and this file deliberately adds no fourth one:
 *
 *   - **`extends SlaTracked`** with a `claim: Claim | null`, exactly as
 *     `FairnessCase` and `SafetyIncident` do. A complaint is a work-queue row;
 *     an operator owns it and disposes of it.
 *   - **`driverId` / `driverName`** for the captain it is *against* —
 *     `FairnessCase`'s field names, and always set, because legacy's `against`
 *     always is.
 *   - **`riderId` / `riderName`** for who filed it — legacy `by`, always set.
 *   - **severity is `critical | high | normal`** — `SafetyIncidentSeverity`'s
 *     value set, not a fourth one. See `ComplaintSeverity`.
 *   - **the reason code carries the SLA**, via `DB.reasonCodes` /
 *     `rcTargets(code).res` (`:14730`), which is what `FairnessCase` does and
 *     why it is the one queue whose window needed no product decision.
 *   - **a separate resolution object**, as `Dispute` has, because one field
 *     cannot carry both *"is it decided"* and *"what was decided"*.
 *
 * ## Where it stops and `Dispute` starts
 *
 * A **complaint** is about conduct: the captain was late, took the wrong route,
 * cancelled on arrival, behaved badly. It may end in compensation, but money is
 * not what it is about.
 *
 * A **dispute** is about a specific charge — `types/dispute.ts`'s six kinds are
 * all *"this amount is wrong"*. It carries `amountHalalas` as a settlement
 * ceiling because that is the thing in contention.
 *
 * The two overlap at `fare` and they are still different records: a complaint
 * about a fare can be resolved with an apology, a dispute cannot. `disputeId`
 * below links them when one became the other.
 */

import type { Claim, Halalas, IsoDateTime } from './common'
import type { SlaTracked } from './workQueue'

/**
 * Legacy `subject` is **free prose** — `'Late pickup 3× consecutive'`,
 * `'Route deviation'`, `'Cancelled after arrival'`, `'Driver behavior
 * complaint'` (`:2708`–`:2711`) — rendered straight into a row. Free text
 * cannot be filtered, faceted, counted or translated, so it is closed here and
 * the prose survives as `subject`, which is the rider's own words and is data.
 *
 * **Every member is a category `DB.reasonCodes` already ships a code for,**
 * except one, and that one is marked. See `COMPLAINT_REASON_CODE`.
 */
export type ComplaintCategory =
  /** Legacy `CMP-301` — `CAP_LATE` §1.2. */
  | 'punctuality'
  /** `CAP_NOSHOW` §1.3. */
  | 'no-show'
  /** Legacy `CMP-318` — `CAP_CANCEL_ADV` §1.1. */
  | 'cancellation'
  /** Legacy `CMP-310` — `TRP_ROUTE_DEVIATION` §4.1. */
  | 'route'
  /** Legacy `CMP-330` — `CAP_CONDUCT` §1.5. */
  | 'conduct'
  /** `PAY_INCORRECT_CHARGE` §3.1. */
  | 'fare'
  /** `CAP_OFFPLATFORM_PAY` §1.4 — the captain asked to be paid in cash. */
  | 'off-platform-payment'
  /** `SAF_RIDER_UNSAFE` §6.1. A complaint that should probably have been an incident. */
  | 'safety'
  /** **No `DB.reasonCodes` entry covers it.** See `COMPLAINT_REASON_CODE`. */
  | 'vehicle-condition'
  /** `OTHER_UNCODED` — the taxonomy's own escape hatch, and it is `active: true`. */
  | 'other'

export const COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  'punctuality',
  'no-show',
  'cancellation',
  'route',
  'conduct',
  'fare',
  'off-platform-payment',
  'safety',
  'vehicle-condition',
  'other',
]

/**
 * The `DB.reasonCodes` code each category inherits its SLA from. `null` where
 * none exists — and that `null` is load-bearing.
 *
 * `vehicle-condition` has no code in the shipped taxonomy. Mapping it onto a
 * plausible neighbour would put an invented window beside nine measured ones,
 * which is the `/90` bug at `:11652` all over again and exactly what
 * `types/safety.ts` refuses to do for `harassment`. It carries
 * `slaSource: 'unset'`, renders no countdown, and is a **question for
 * product-owner (Q8)**.
 */
export const COMPLAINT_REASON_CODE: Readonly<Record<ComplaintCategory, string | null>> = {
  punctuality: 'CAP_LATE',
  'no-show': 'CAP_NOSHOW',
  cancellation: 'CAP_CANCEL_ADV',
  route: 'TRP_ROUTE_DEVIATION',
  conduct: 'CAP_CONDUCT',
  fare: 'PAY_INCORRECT_CHARGE',
  'off-platform-payment': 'CAP_OFFPLATFORM_PAY',
  safety: 'SAF_RIDER_UNSAFE',
  'vehicle-condition': null,
  other: 'OTHER_UNCODED',
}

/**
 * Resolve windows in minutes — `rcTargets(code).res` (`:14730`), measured off
 * the codes above and not chosen. `null` where the category has no code.
 */
export const COMPLAINT_RESOLVE_MINUTES: Readonly<Record<ComplaintCategory, number | null>> = {
  /* CAP_LATE §1.2 — T3, res 240, and `upd: 15` — the only recurring-promise code here. */
  punctuality: 240,
  /* CAP_NOSHOW §1.3 — T2, res 240. */
  'no-show': 240,
  /* CAP_CANCEL_ADV §1.1 — T2, res 240. */
  cancellation: 240,
  /* TRP_ROUTE_DEVIATION §4.1 — T3, res 2880. */
  route: 2880,
  /* CAP_CONDUCT §1.5 — T1, res 1440. */
  conduct: 1440,
  /* PAY_INCORRECT_CHARGE §3.1 — T2, res 1440. */
  fare: 1440,
  /* CAP_OFFPLATFORM_PAY §1.4 — T2, res 1440. */
  'off-platform-payment': 1440,
  /* SAF_RIDER_UNSAFE §6.1 — T1, res 60. */
  safety: 60,
  /* Nobody has decided. Not a placeholder — a product commitment (Q8). */
  'vehicle-condition': null,
  /* OTHER_UNCODED — T3, res 2880. */
  other: 2880,
}

/**
 * First-response windows in minutes — `rcTargets(code).fr`. `null` where the
 * category has no code.
 *
 * **Note the two zeroes, and the defect that hides them.** `CAP_CONDUCT` and
 * `SAF_RIDER_UNSAFE` are Tier-1 with `fr: 0` — answer *immediately* — and
 * `slaState`'s breach check is `frBreached: !obj.firstResponseAtMs && frMs > 0
 * && elapsedFr > frMs` (`:14780`). With `frMs === 0` the middle clause is
 * false, so **the strictest promise in the taxonomy is the one the clock cannot
 * enforce**. `types/safety.ts` records the same finding against the same line;
 * it is one defect, not two.
 */
export const COMPLAINT_FIRST_RESPONSE_MINUTES: Readonly<
  Record<ComplaintCategory, number | null>
> = {
  punctuality: 15,
  'no-show': 10,
  cancellation: 10,
  route: 60,
  conduct: 0,
  fare: 15,
  'off-platform-payment': 15,
  safety: 0,
  'vehicle-condition': null,
  other: 60,
}

/**
 * The compensation the taxonomy already authorises for the category, in SAR —
 * `DB.reasonCodes[].comp` (`:14668`–`:14694`). Halalas here.
 *
 * **It is a ceiling the taxonomy states, not an amount this file decides.** It
 * is put on the type rather than left in the browser because `compCheck`
 * (`:15412`) — the authority envelope — is server-computed for exactly the
 * reason §6.6 gives: *a ceiling the browser evaluates is a ceiling the browser
 * can be asked not to evaluate*. A screen reads `AuthorityCheck`, not this map;
 * this is the taxonomy's own figure, kept beside the codes it came from.
 */
export const COMPLAINT_COMPENSATION_HALALAS: Readonly<
  Record<ComplaintCategory, Halalas | null>
> = {
  /* CAP_LATE comp 15 SAR. */
  punctuality: 1_500,
  /* CAP_NOSHOW comp 50 SAR. */
  'no-show': 5_000,
  /* CAP_CANCEL_ADV comp 25 SAR. */
  cancellation: 2_500,
  /* TRP_ROUTE_DEVIATION comp 0. */
  route: 0,
  /* CAP_CONDUCT comp 50 SAR. */
  conduct: 5_000,
  /* PAY_INCORRECT_CHARGE comp 0 — the refund *is* the remedy. */
  fare: 0,
  /* CAP_OFFPLATFORM_PAY comp 0. */
  'off-platform-payment': 0,
  /* SAF_RIDER_UNSAFE comp 100 SAR — the taxonomy's highest. */
  safety: 10_000,
  /* No code, so no authorised figure. `null` ≠ zero. */
  'vehicle-condition': null,
  /* OTHER_UNCODED comp 0. */
  other: 0,
}

/**
 * Legacy `severity: 'High' | 'Medium' | 'Low'` (`:2708`), mapped onto the house
 * value set rather than kept as a fourth vocabulary:
 *
 *   `High` → `high` · `Medium` → `normal` · `Low` → `normal`
 *
 * `critical` is added at the top, for the complaint that should have been a
 * safety incident and is being triaged as one.
 *
 * **Finding for product-designer, and it is the same finding
 * `types/safety.ts` already filed.** R5a permits no red badge and R7's palette
 * is closed at five, so `critical` and `high` collapse to one badge tone
 * (`warning`) and the distinction has to be carried by a row marker, an icon or
 * the SLA track. The collapse of legacy's `Medium` and `Low` onto `normal` is a
 * second, smaller loss: nothing in legacy branches on the difference — it is
 * rendered as a chip and never read — but if triage needs three ordinary
 * levels, that is a product decision and it changes this union, not a screen.
 *
 * Tones (R7): critical → `warning`, high → `warning`, normal → `neutral`.
 */
export type ComplaintSeverity = 'critical' | 'high' | 'normal'

export const COMPLAINT_SEVERITIES: readonly ComplaintSeverity[] = ['critical', 'high', 'normal']

/**
 * Legacy has two — `'Open'` and `'Resolved'` (`:2708`). Four here, and each
 * extra one is `Dispute`'s argument rather than a new one:
 *
 *   `under-review`  somebody is on it. `Dispute` adds the same value for the
 *                   same reason: the facet list needs a value for the middle
 *                   state, and the claim chip alone cannot be filtered on.
 *   `withdrawn`     the rider dropped it. Without a value for it the row would
 *                   have to be **deleted**, which destroys the history the
 *                   captain's record depends on — `FairnessCase` adds
 *                   `withdrawn` for exactly this.
 *
 * **There is no `dismissed` status.** Dismissing a complaint is an OUTCOME; the
 * record is `resolved` either way. That is `Dispute`'s rule verbatim, and it is
 * what stops *"decided in the captain's favour"* from looking like *"still
 * open"* in `Driver.openComplaints`.
 *
 * Tones (R7): open → `info`, under-review → `warning`, resolved → `success`,
 * withdrawn → `neutral`.
 */
export type ComplaintStatus = 'open' | 'under-review' | 'resolved' | 'withdrawn'

export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'open',
  'under-review',
  'resolved',
  'withdrawn',
]

/**
 * **The definition `Driver.openComplaints` counts, stated once.**
 *
 * A complaint somebody has picked up is still open — the captain still has an
 * unanswered grievance against them. Legacy's binary made this unaskable; with
 * three non-terminal-looking states it has to be written down somewhere, and
 * the one place it can be written down without two screens disagreeing is here.
 *
 * `clients/complaints.ts` filters on it, `clients/drivers.ts`' `openComplaints`
 * column is the count of it, and `fixtures/complaints.ts` reconciles against
 * it.
 */
export const OPEN_COMPLAINT_STATUSES: readonly ComplaintStatus[] = ['open', 'under-review']

export function isOpenComplaint(status: ComplaintStatus): boolean {
  return OPEN_COMPLAINT_STATUSES.includes(status)
}

/**
 * The verdict. Three, mapped onto `DisputeOutcome`'s four with the two refund
 * arms collapsed — a complaint has no charge to refund a fraction of, so
 * `full-refund` / `partial-refund` have no meaning here and `compensationHalalas`
 * carries the amount instead.
 *
 * `dismissed` is `Dispute`'s `declined`, named the same way and for the same
 * reason: it is **claimant-neutral**. It says what happened to the complaint,
 * not what anyone thinks of the person who filed it.
 */
export type ComplaintOutcome = 'upheld' | 'partially-upheld' | 'dismissed'

export const COMPLAINT_OUTCOMES: readonly ComplaintOutcome[] = [
  'upheld',
  'partially-upheld',
  'dismissed',
]

/** The only outcome that authorises no compensation, stated once so no screen re-derives it. */
export function outcomeAuthorisesCompensation(outcome: ComplaintOutcome): boolean {
  return outcome !== 'dismissed'
}

/**
 * The verdict and what went with it. One object rather than six nullable
 * fields, because they only ever exist together — `Dispute.resolution`'s
 * argument, and `FairnessCase` is the counter-example that shows the cost of
 * not doing it: `decideFairness` writes status, decider and timestamp and
 * leaves `rationale` at `null` (`:15597`), so every decided case in the legacy
 * app is unexplained.
 */
export interface ComplaintResolution {
  outcome: ComplaintOutcome
  /**
   * What was actually paid to the rider, integer halalas. **`0` on `dismissed`,
   * and only there** — an upheld complaint may still warrant nothing but an
   * apology, and `0` with `outcome: 'upheld'` says exactly that.
   *
   * Posts to `expense.compensation` (*"Rider compensation"*), which is an
   * account the chart already carries. It is **not** a refund: nothing is being
   * returned, so it mints no credit note and does not touch `contra.refunds`.
   * §3.4 is explicit that a refund and a new economic event are different
   * things, and conflating them is how a ledger stops being evidence.
   */
  compensationHalalas: Halalas
  /**
   * The `Refund` document, when the remedy was a genuine refund of a charge
   * rather than a goodwill credit — a `fare` complaint upheld against a real
   * overcharge. `null` otherwise, and **never a fabricated id**.
   */
  refundId: string | null
  /** Why. Free text, the operator's own words. `null` when they wrote none. */
  note: string | null
  resolvedAt: IsoDateTime
  resolvedByUserId: string
  resolvedByUserName: string
}

export interface Complaint extends SlaTracked {
  /** `CMP-301`. Legacy's own scheme (`:2708`). */
  id: string
  category: ComplaintCategory
  severity: ComplaintSeverity
  status: ComplaintStatus

  /**
   * The captain the complaint is against. **Always set** — legacy's `against`
   * always is, and three other surfaces read it: the repeat-incident panel
   * (`:14344`), subscription readiness (`:14222`) and captain risk (`:14294`).
   * `FairnessCase.driverId` is the same field under the same name.
   */
  driverId: string
  driverName: string

  /**
   * The rider who filed it. **Always set** — legacy `by` (`:2708`).
   *
   * A captain's grievance against a *rider* is not this record: it is a
   * `FairnessCase` of kind `rider-report`, or a `Dispute` of kind
   * `vehicle-damage`. Two vocabularies for one direction is exactly what this
   * file exists not to add.
   */
  riderId: string
  riderName: string

  /** The trip it is about. `null` on a plan-level or account-level grievance. */
  tripId: string | null
  /** `null` on a quick-ride complaint. */
  subscriptionId: string | null
  /** The support ticket it was raised from, when it was. `null` when the rider filed it in-app. */
  ticketId: string | null
  /** Set when the complaint escalated into a money claim. `null` otherwise. */
  disputeId: string | null

  /**
   * Legacy `subject` (`:2708`) — the rider's own one-line grievance. Prose, and
   * data rather than UI copy: it is not translated, because nothing translates
   * what somebody wrote.
   */
  subject: string
  /** The longer statement. `null` when the rider only picked a category. */
  detail: string | null

  /**
   * The `DB.reasonCodes` code, so the SLA above has a traceable origin.
   * `null` on `vehicle-condition`, which no code covers — the same shape
   * `SafetyIncident.reasonCode` uses and for the same reason.
   */
  reasonCode: string | null

  /** Legacy `date: '24 Jun'` — a display string that cannot be sorted. */
  filedAt: IsoDateTime

  /**
   * Non-null **iff** `status === 'resolved'`.
   *
   * A `withdrawn` complaint carries `null`: the rider dropped it and nobody
   * decided anything, which is a different fact from *"dismissed"* and must not
   * render as one.
   */
  resolution: ComplaintResolution | null

  claim: Claim | null
}
