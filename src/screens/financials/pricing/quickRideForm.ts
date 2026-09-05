/**
 * What the quick-ride editor's three parts agree on — the form's values, the
 * derived chain hung off them, and the trial numbers the Calculations view
 * adds. FINANCIALS-UX-PLAN §12. The same split `planForm.ts` makes for a plan.
 */

import { PLAN_EXAMPLE_INPUTS, type QuickRideType } from '@/data/types'
import type { DerivedValue } from './derived'

/**
 * Everything on a class but its id. Unlike a plan, the rates are the form's
 * own: this store is the class's (spec §4.3, `manage_plans`), so a rate is
 * saved, not disabled. Blank is `null` (§8.2.5).
 */
export interface QuickRideValues {
  name: string
  nameAr: string
  baseFareHalalas: number | null
  perKmHalalas: number | null
  perMinHalalas: number | null
  active: boolean
}

/** One chain, one class. Wrapped so `useForm` can keep it disjoint from the values. */
export interface QuickRideDerived {
  chain: DerivedValue[]
}

/**
 * The numbers the Calculations view can change that are NOT the record's:
 * the example trip, the surge multiplier and the commission the fare is split
 * at. Never form state and never saved (§11.8's rule, applied here).
 */
export interface QuickRideTrial {
  exampleKm: number | null
  exampleMinutes: number | null
  surgeMultiplier: number | null
  commissionPercent: number | null
}

export function valuesFromType(type: QuickRideType | null): QuickRideValues {
  return {
    name: type?.name ?? '',
    nameAr: type?.nameAr ?? '',
    baseFareHalalas: type?.baseFareHalalas ?? null,
    perKmHalalas: type?.perKmHalalas ?? null,
    perMinHalalas: type?.perMinHalalas ?? null,
    active: type?.active ?? true,
  }
}

/** The trial as it starts: no surge, the live rate card's on-demand commission. */
export function trialFromRateCard(commissionPercent: number | null): QuickRideTrial {
  return {
    exampleKm: PLAN_EXAMPLE_INPUTS.exampleKm,
    exampleMinutes: PLAN_EXAMPLE_INPUTS.exampleMinutes,
    surgeMultiplier: 1,
    commissionPercent,
  }
}

export function isQuickTrialActive(trial: QuickRideTrial, base: QuickRideTrial): boolean {
  return (Object.keys(base) as (keyof QuickRideTrial)[]).some((key) => trial[key] !== base[key])
}
