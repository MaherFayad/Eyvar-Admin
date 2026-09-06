/**
 * Operational policy — the document Admin › Policy edits, and the one
 * `src/lib/sla.ts` computes against.
 *
 * Four panes, one document: `dispatch`, `cities`, `limits` and `reasons`
 * (the reason-code registry plus the SLA grid). They are one type because they
 * are one save. Legacy split them into four buttons over four mutable globals
 * (`saveSlaPolicy` `:15140`, `saveReasonCodes` `:15093`, `saveCompPolicy`) and
 * nothing round-tripped, which is how F-014 happened.
 *
 * ## The rule this file exists to make mechanical
 *
 * **`null` on an SLA target means *inherit from the tier*. It is not zero and
 * it is not missing.** `firstResponseMinutes: 0` is a real policy — T1 answers
 * immediately (legacy `:14652`) — so a nullable number is the only shape that
 * can tell "answer now" from "whatever the tier says". Every other spelling
 * (`undefined`, an absent key, a sentinel `-1`) collapses one of those two into
 * the other.
 *
 * **F-014, named.** Legacy rendered the *effective* target into the input
 * (`renderReasonCodesTable`, `:15083`–`:15084`: `value="'+tg.fr+'"`, where
 * `tg = rcTargets(code)` has already resolved inheritance) and then read that
 * input straight back on save (`:15104`: `rc[f] = inp.value === '' ? null :
 * parseInt(...)`). One save with no edit therefore turned every inherited cell
 * into an explicit override carrying the tier's current number — after which
 * changing a tier default propagated to nothing. The defect is not in the save;
 * it is in the **round trip**, which is why the type carries the null and the
 * client's `changedFields` reports what actually moved.
 *
 * Nothing here imports a fixture, `src/lib`, or a React type. It models the
 * API.
 */

import type { IsoDateTime } from './common'
/**
 * **There is one `WorkQueueId` and it is `workQueue.ts`'s.** This module used to
 * declare a second, plural one — `requests` / `safety` / `tickets` — which
 * shared a name with the canonical union and only two members. An SLA row for
 * `'tickets'` could never have been joined to a work item filed under
 * `'ticket'`, and nothing would have caught it, because two unrelated string
 * unions that happen to share a name typecheck perfectly against themselves.
 * Ruled by the coordinator; the older, singular union wins.
 */
import type { WorkQueueId } from './workQueue'

export type { WorkQueueId }

/* ══════════════════════════ SLA ══════════════════════════ */

/** The four priority tiers. Legacy `DB.slaPolicy.tiers` (`:14650`). */
export type SlaTierKey = 'T1' | 'T2' | 'T3' | 'T4'

/**
 * Declaration order, and it is load-bearing: `SlaQueuePolicy.tiers` carries one
 * entry per key **in this order**, so a grid row and a grid column can be
 * indexed without a lookup and a save can be compared positionally.
 */
export const SLA_TIER_KEYS = ['T1', 'T2', 'T3', 'T4'] as const

/** Whether a tier's clock runs around the clock or only in business hours. */
export type SlaCoverage = 'continuous' | 'business-hours'

export interface SlaTierDefault {
  key: SlaTierKey
  /**
   * i18n key, never English. The tier's name is copy, and legacy stored it as
   * a literal (`label:'Critical'`, `:14652`) which is why the tier name is the
   * one string on that screen that never had an Arabic form.
   */
  labelKey: string
  /** Minutes. `0` is legal and means "answer immediately" (T1, `:14652`). */
  firstResponseMinutes: number
  resolutionMinutes: number
  /** T4 follows business hours; T1–T3 run continuously (`:14646`). */
  coverage: SlaCoverage
  /** The resolution clock pauses while waiting on the customer. Never for T1 (`:14648`). */
  pausesOnCustomer: boolean
}

/**
 * One cell of the queue × tier grid.
 *
 * **Both numbers are `number | null` and `null` is `inherit`.** Read the file
 * header before changing either to a plain `number` "for convenience": that
 * change *is* F-014.
 */
export interface SlaQueueTier {
  tier: SlaTierKey
  firstResponseMinutes: number | null
  resolutionMinutes: number | null
}

/**
 * What a breach does. Both effects are real behaviour elsewhere in the product,
 * declared here so the policy screen is editing the thing that actually runs
 * rather than a description of it:
 *
 *   `marksRow`        R5a (b) — the row-critical GROUND
 *                     draws, and one of the four places red is permitted.
 *   `reordersQueue`   §9.3 / `lib/sla.ts` rule 2 — breached first, most overdue
 *                     first, `No clock` last. `compareBySla` implements it.
 */
export interface SlaBreachPolicy {
  marksRow: boolean
  reordersQueue: boolean
  /** Role key a breach escalates to, or `null` for no escalation (`:14658`). */
  escalateToRole: string | null
}

export interface SlaQueuePolicy {
  queueId: WorkQueueId
  /** i18n key for the queue's operator-facing name. */
  labelKey: string
  /**
   * Exactly one entry per `SLA_TIER_KEYS`, in that order. **Always four, even
   * when all four inherit** — an absent *entry* would be indistinguishable from
   * an absent *override*, and the whole point of the shape is that those two
   * are different facts.
   */
  tiers: SlaQueueTier[]
  breach: SlaBreachPolicy
}

export interface SlaPolicy {
  tiers: SlaTierDefault[]
  queues: SlaQueuePolicy[]
  /** Share of the resolution window consumed at which a row reads `at risk` (`:14657`). */
  atRiskPercent: number
  /** Above this share of `OTHER_UNCODED` the taxonomy is stale (`:14659`). */
  uncodedCeilingPercent: number
}

/* ── resolving the grid ─────────────────────────────────────────────── */

/** Where an effective number came from. The UI renders these two differently. */
export type SlaTargetSource = 'tier' | 'queue'

export interface EffectiveSlaTarget {
  minutes: number
  source: SlaTargetSource
}

export interface EffectiveSlaTargets {
  firstResponse: EffectiveSlaTarget
  resolution: EffectiveSlaTarget
}

/**
 * The **one** place inheritance is resolved. Legacy had `rcTargets()`
 * (`:14732`) doing the same job and then a second, silent copy of it inside the
 * render function — which is the copy that flattened. There is one here and the
 * editor never re-derives.
 *
 * Throws on an unknown queue or a malformed grid rather than falling back to a
 * tier: a grid missing a row is a data defect, and answering it with a number
 * hides the defect behind a plausible SLA.
 */
export function effectiveSlaTargets(
  policy: SlaPolicy,
  queueId: WorkQueueId,
  tier: SlaTierKey,
): EffectiveSlaTargets {
  const tierDefault = policy.tiers.find((each) => each.key === tier)
  if (!tierDefault) throw new Error(`No SLA tier default for ${tier}`)

  const queue = policy.queues.find((each) => each.queueId === queueId)
  if (!queue) throw new Error(`No SLA policy for queue ${queueId}`)

  const cell = queue.tiers.find((each) => each.tier === tier)
  if (!cell) throw new Error(`No ${tier} row in the SLA policy for queue ${queueId}`)

  return {
    firstResponse:
      cell.firstResponseMinutes === null
        ? { minutes: tierDefault.firstResponseMinutes, source: 'tier' }
        : { minutes: cell.firstResponseMinutes, source: 'queue' },
    resolution:
      cell.resolutionMinutes === null
        ? { minutes: tierDefault.resolutionMinutes, source: 'tier' }
        : { minutes: cell.resolutionMinutes, source: 'queue' },
  }
}

/**
 * The resolution window in minutes, which is exactly `SlaInput.targetMinutes`
 * in `src/lib/sla.ts`. This is the whole reason the editor exists: `sla.ts`
 * already computes bands, tracks and the sort key against a window, and until
 * now no surface could change one.
 */
export function resolutionTargetMinutes(
  policy: SlaPolicy,
  queueId: WorkQueueId,
  tier: SlaTierKey,
): number {
  return effectiveSlaTargets(policy, queueId, tier).resolution.minutes
}

/** How many cells in the grid carry an explicit override. F-014's own metric. */
export function overrideCount(policy: SlaPolicy): number {
  let count = 0
  for (const queue of policy.queues) {
    for (const cell of queue.tiers) {
      if (cell.firstResponseMinutes !== null) count += 1
      if (cell.resolutionMinutes !== null) count += 1
    }
  }
  return count
}

/* ═══════════════════════ reason codes ═══════════════════════ */

/**
 * The surfaces a code may be offered on. A code is not "a cancellation reason"
 * or "a refund reason" — the same scenario disposes of work on more than one
 * surface (a captain no-show cancels a trip *and* justifies a refund), so the
 * membership is a set, and a picker asks for its own surface.
 */
export type ReasonSurface =
  | 'trip-cancellation'
  | 'refund'
  | 'suspension'
  | 'dispute-outcome'
  | 'wallet-adjustment'
  | 'payout-deduction'
  | 'subscription-freeze'
  | 'ticket'

export const REASON_SURFACES = [
  'trip-cancellation',
  'refund',
  'suspension',
  'dispute-outcome',
  'wallet-adjustment',
  'payout-deduction',
  'subscription-freeze',
  'ticket',
] as const

/**
 * `active` is in the picker. `retired` is **not** in the picker and **still
 * renders everywhere else**.
 *
 * There is no `deleted`, and there never will be: historical records point at
 * these keys by string, so a code that stops resolving turns a closed dispute
 * into a raw `CAP_NOSHOW` on an audit line. Legacy states the rule in its own
 * UI copy (`:1793`) — *"Codes are never deleted or renamed — deactivate and add
 * a successor, because historical records point at them"* — and then offers no
 * way to name the successor, which is what `supersededByKey` is for.
 */
export type ReasonCodeState = 'active' | 'retired'

/**
 * Both languages, always. Not `LocalisedText` (a key plus params): a reason
 * code's label is **operator-authored content**, not product copy, so it cannot
 * live in a dictionary that ships with the build.
 */
export interface ReasonCodeLabels {
  en: string
  ar: string
}

export interface ReasonCode {
  /** Stable, uppercase, never renamed. Historical records carry this string. */
  key: string
  /** The call-centre guide's section number (`§1.3`), or `null` for a code the guide does not cover. */
  reference: string | null
  labels: ReasonCodeLabels
  /** Non-empty. A code offered on no surface cannot be chosen and is a data defect. */
  surfaces: ReasonSurface[]
  /**
   * The operator must type an elaboration before the disposition commits.
   * `Other` always requires one; a specific code usually does not.
   */
  requiresNote: boolean
  state: ReasonCodeState
  /** The tier the work opened under this code inherits. */
  tier: SlaTierKey
  /**
   * A recurring "next update" promise in minutes, for the few codes that make
   * one (legacy `upd`, `:14670`: a late captain every 15, a lost item every 30).
   * Absent or `null` = no such promise.
   */
  updateEveryMinutes?: number | null
  /** The team that can make this code stop existing. `null` = unassigned (`:14669`). */
  ownerTeam: string | null
  /** `null` while active. Set once, on retirement; never cleared by a restore. */
  retiredAt: IsoDateTime | null
  /** The code that replaced it, when the operator named one. */
  supersededByKey: string | null
}

/** Active only, in `key` order — what a picker on `surface` may offer. */
export function pickableReasonCodes(
  codes: readonly ReasonCode[],
  surface: ReasonSurface,
): ReasonCode[] {
  return codes
    .filter((code) => code.state === 'active' && code.surfaces.includes(surface))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/* ══════════════════ dispatch · cities · limits ══════════════════ */

/**
 * Matching and dispatch. Every field is an **integer in its base unit** —
 * metres, seconds, percent — for the same reason money is halalas: a radius
 * carried as `5.0` through a text input and back is a float comparison waiting
 * to fail, and legacy held all three as strings in a DOM input.
 */
export interface DispatchPolicy {
  /** Metres. The UI renders kilometres; the wire does not carry a decimal. */
  initialSearchRadiusMetres: number
  searchPhaseTimeoutSeconds: number
  /** Percent of the base fare. `250` is a 2.5× ceiling. */
  maxSurgePercent: number
}

export interface OperatingCity {
  id: string
  nameEn: string
  nameAr: string
  quickRidesEnabled: boolean
  subscriptionsEnabled: boolean
  /**
   * **Derived, and read-only on this surface.** It is the size of the fleet, not
   * a policy, which is why `SaveOperationalPolicyInput` omits it: a save that
   * could write a fleet count is a save that can disagree with the fleet.
   */
  activeCaptains: number
}

export interface SafetyLimits {
  /** Minutes, so it shares a unit with every SLA target on the same screen. */
  maxCaptainDailyDrivingMinutes: number
  maxConcurrentSubscriptionsPerCaptain: number
  maxRiderDailyCancellations: number
  /**
   * Legacy `compPolicy` (`:15379`): what an operator may credit a rider wallet
   * without a second approval, per role, in halalas. `null` is no cap. An
   * operator's own cap on Team & Access overrides it (O-T5).
   */
  compensationCapHalalasByRole: Record<string, number | null>
  /** D22: live chats one operator may hold at once. Owner is exempt. Range 1 to 8. */
  maxConcurrentChatsPerOperator: number
}

/* ═══════════════════ the document ═══════════════════ */

export interface OperationalPolicy {
  dispatch: DispatchPolicy
  cities: OperatingCity[]
  limits: SafetyLimits
  reasonCodes: ReasonCode[]
  sla: SlaPolicy
}

/** A city as the operator may write it — no derived fleet count. */
export type OperatingCityInput = Omit<OperatingCity, 'activeCaptains'>

/**
 * What `saveOperationalPolicy` accepts.
 *
 * It **mirrors the stored document field for field**, minus the two derived
 * things (`activeCaptains`, and the registry, which has its own per-code
 * writes). That is deliberate: a save input shaped differently from the read is
 * a mapping, and F-014 lived inside a mapping. Here the round trip is the
 * identity function, so a save that changes anything changed it on purpose.
 */
export interface SaveOperationalPolicyInput {
  dispatch: DispatchPolicy
  cities: OperatingCityInput[]
  limits: SafetyLimits
  sla: SlaPolicy
}

/**
 * Every field the save actually moved, as dotted paths:
 * `dispatch.searchPhaseTimeoutSeconds`, `sla.queues.tickets.T2.resolutionMinutes`,
 * `cities.CITY-04.quickRidesEnabled`.
 *
 * It is the audit entry's payload **and** F-014's instrument. A save that
 * flattens inheritance cannot do it quietly, because every flattened cell
 * appears here as `null → 60`.
 */
export interface SavePolicyResult {
  policy: OperationalPolicy
  changedFields: string[]
}

/** What a reason code's editor may write. `key` is not here — a key is never renamed. */
export interface SaveReasonCodeInput {
  labels: ReasonCodeLabels
  surfaces: ReasonSurface[]
  requiresNote: boolean
  tier: SlaTierKey
  ownerTeam: string | null
  reference: string | null
}

/** What creating a code needs on top of `SaveReasonCodeInput`. */
export interface CreateReasonCodeInput extends SaveReasonCodeInput {
  key: string
}
