import { findSubTabById } from '@/data/clients'
import type { OnboardingStep } from '@/data/types/onboarding'

/**
 * Where a step's `Open` goes. A layer is a param on the current route; the
 * `profile` layer needs an entity the checklist does not name, so it yields
 * `null` and the step completes manually only (design §10.2).
 */
export function destinationPath(step: OnboardingStep): string | null {
  const destination = step.destination
  if (destination === null) return null
  if (destination.layer !== null) return destination.layer === 'account' ? '?account=me' : null
  if (destination.subTabId === null) return null
  const row = findSubTabById(destination.subTabId)
  if (!row) return null
  return destination.view === null ? row.path : `${row.path}?view=${destination.view}`
}
