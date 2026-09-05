/**
 * What the plan editor's three parts agree on — the form's values, the derived
 * chain hung off them, and the two rules every derived value on the screen
 * obeys. FINANCIALS-UX-PLAN §11.
 *
 * The form (`PlanEditorScreen`), the calculations view and the rider preview
 * all read these, and none of them may redeclare a shape another one writes.
 */

import type { PlanFeature, SubscriptionPlan } from '@/data/types'
import { ABSENT, formatMoney, formatPercent, type Language } from '@/lib'
import type { DerivedValue, PlanClass } from './derived'

/**
 * **The catalogue half only.** The pricing half is absent for the same reason
 * it is absent from `SavePlanInput`: Stage A's boundary is enforced at the
 * seam, not by a `disabled` attribute a screen could forget.
 *
 * Numbers are `number | null` because **blank is `null`** — not `0`, which is a
 * real duration, and not the previously stored value, which is a lie.
 */
export interface PlanValues {
  nameEn: string
  nameAr: string
  durationDays: number | null
  executeDays: number | null
  cancelCap: number | null
  sortOrder: number | null
  status: SubscriptionPlan['status']
  features: PlanFeature[]
  economyActive: boolean
  comfortActive: boolean
}

export type PlanDerived = Record<PlanClass, DerivedValue[]>

/**
 * §8.2 / **AC-391**, as attributes. Spread onto a `span`, never onto an input,
 * and note the absence of `tabIndex`: `-1` is still focusable by script and by
 * click, and the rule is *not focusable*.
 */
export const DERIVED_PROPS = {
  'aria-readonly': true,
  'aria-live': 'polite',
} as const

/** One derived value as text — **AC-393**'s em dash included. */
export function renderDerived(value: DerivedValue, language: Language): string {
  if (value.value === null || !Number.isFinite(value.value)) return ABSENT
  if (value.unit === 'percent') return formatPercent(value.value, language)
  /* The chain carries full precision until `driverEarns` rounds, so a mid-chain
     value can be fractional. `formatMoney` refuses a non-integer on purpose —
     money is never a float — so the display rounds at the boundary and the
     ARITHMETIC does not. */
  return formatMoney(Math.round(value.value))
}

/** One derived value by id, or `null` when the chain does not carry it. */
export function derivedById(values: readonly DerivedValue[], id: string): DerivedValue | null {
  return values.find((value) => value.id === id) ?? null
}

/**
 * Which class the rider preview quotes. A plan that offers Economy is quoted at
 * Economy, because that is the price the app leads with; a Comfort-only plan is
 * quoted at Comfort. A plan offering neither still has to render a price, and
 * Economy is the one the catalogue was priced against.
 */
export function quotedClass(values: PlanValues): PlanClass {
  return values.economyActive || !values.comfortActive ? 'economy' : 'comfort'
}
