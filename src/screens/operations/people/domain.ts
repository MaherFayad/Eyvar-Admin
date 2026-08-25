/**
 * Domain value → tone and copy key. One table per enum, in one file.
 *
 * **R7 closes the tone set at five and there is no red badge (R5a).** These
 * maps are the single place a People status becomes a tone, so a status cannot
 * be `warning` on one view and `neutral` on another — the exact drift §8.2
 * describes when a derived value is computed in three screens.
 *
 * The tones are the ones the data layer's own type files specify:
 *   `types/driver.ts`     active → success · under-review → warning ·
 *                         suspended → **neutral** (a suspension is a standing
 *                         condition, not a sixth tone) · pending → new
 *   `types/rider.ts`      subscriber → success · on-demand → info
 *   `types/applicant.ts`  pending → new · in-review → info · approved →
 *                         success · rejected → **neutral** (V-07: a rejection
 *                         is a terminal factual outcome, never red) ·
 *                         withdrawn → neutral
 *   `types/driver.ts`     valid → success · expiring → warning · critical →
 *                         **warning** (ONE warning tone, R17 — the LABEL
 *                         separates the two) · expired → neutral
 *
 * `worstState: null` is **not `valid`**. A captain with no compliance file on
 * record has no worst state, and "reporting `valid` for one would be the most
 * dangerous possible default" (`types/driver.ts`). It gets its own label.
 */

import type {
  ApplicantStatus,
  BadgeTone,
  ChurnRisk,
  ComplianceDocState,
  DriverStatus,
  DriverTier,
  RiderStatus,
  RiderTier,
} from '@/data/types'

export const DRIVER_STATUS: Readonly<Record<DriverStatus, { tone: BadgeTone; key: string }>> = {
  active: { tone: 'success', key: 'people.driverStatus.active' },
  'under-review': { tone: 'warning', key: 'people.driverStatus.underReview' },
  suspended: { tone: 'neutral', key: 'people.driverStatus.suspended' },
  pending: { tone: 'new', key: 'people.driverStatus.pending' },
}

export const RIDER_STATUS: Readonly<Record<RiderStatus, { tone: BadgeTone; key: string }>> = {
  subscriber: { tone: 'success', key: 'people.riderStatus.subscriber' },
  'on-demand': { tone: 'info', key: 'people.riderStatus.onDemand' },
}

export const APPLICANT_STATUS: Readonly<
  Record<ApplicantStatus, { tone: BadgeTone; key: string }>
> = {
  pending: { tone: 'new', key: 'people.applicantStatus.pending' },
  'in-review': { tone: 'info', key: 'people.applicantStatus.inReview' },
  approved: { tone: 'success', key: 'people.applicantStatus.approved' },
  rejected: { tone: 'neutral', key: 'people.applicantStatus.rejected' },
  withdrawn: { tone: 'neutral', key: 'people.applicantStatus.withdrawn' },
}

export const DRIVER_TIER: Readonly<Record<DriverTier, string>> = {
  gold: 'people.tier.gold',
  silver: 'people.tier.silver',
  standard: 'people.tier.standard',
}

export const RIDER_TIER: Readonly<Record<RiderTier, string>> = {
  gold: 'people.tier.gold',
  silver: 'people.tier.silver',
  bronze: 'people.tier.bronze',
  new: 'people.tier.new',
}

export const CHURN_RISK: Readonly<Record<ChurnRisk, { tone: BadgeTone; key: string }>> = {
  low: { tone: 'success', key: 'people.churn.low' },
  medium: { tone: 'warning', key: 'people.churn.medium' },
  high: { tone: 'warning', key: 'people.churn.high' },
}

export const DOC_STATE: Readonly<Record<ComplianceDocState, BadgeTone>> = {
  valid: 'success',
  expiring: 'warning',
  /* R17 — ONE warning tone. `critical` and `expiring` differ by the number of
     days in the label, not by a second fill. */
  critical: 'warning',
  expired: 'neutral',
}

/** `worstState` including the `null` case, which is a value and not a gap. */
export const WORST_STATE: Readonly<Record<ComplianceDocState | 'none', { tone: BadgeTone; key: string }>> =
  {
    valid: { tone: 'success', key: 'people.compliance.worst.valid' },
    expiring: { tone: 'warning', key: 'people.compliance.worst.expiring' },
    critical: { tone: 'warning', key: 'people.compliance.worst.critical' },
    expired: { tone: 'neutral', key: 'people.compliance.worst.expired' },
    none: { tone: 'neutral', key: 'people.compliance.worst.none' },
  }

export const VEHICLE_CLASS: Readonly<Record<'Economy' | 'Comfort', string>> = {
  Economy: 'people.class.economy',
  Comfort: 'people.class.comfort',
}
