/**
 * The 360° profile layer — foundation spec §4.3.1.
 *
 * `openProfile` has **100 call sites**, the second-most-used handler in the
 * legacy file after `closeModal`. It is the highest-traffic surface in the
 * product and the one with the widest id space.
 *
 * §4.3.1: entity types "must extend from 6 to 11". Legacy `resolveId()`
 * (`eyvar_ops_panel_v40_fixed.html:3266`) covers six — riders, drivers, trips,
 * subscriptions, payments, complaints. It does **not** cover `newRiders`,
 * `pendingDrivers`, `tickets`, `corporateAccounts` or `plans`, so `TKT-505`,
 * `APP-2201` and `CORP-001` return "No record found" while having perfectly
 * good detail screens.
 */

import type { IsoDateTime } from './common'

/**
 * All twelve. The five marked below have no resolver in the legacy app, and
 * `request` is the twelfth — added after the eleven, and for a different
 * reason from any of them.
 *
 * **Why a request is a record and not a row.** Requests were the one work
 * queue whose row opened *the rider* — `RequestsScreen` handed the identity
 * cell `riderId`, so clicking the thing an operator is deciding about opened
 * somebody's wallet balance and churn risk. The subject of that queue is the
 * RIDE: where it goes, what it is worth, how long it has been waiting and who
 * has been offered it. None of that is on a person's record, and the two are
 * not interchangeable — one rider may have three requests open.
 */
export type ProfileEntityType =
  | 'rider'
  | 'driver'
  | 'trip'
  | 'subscription'
  | 'payment'
  | 'complaint'
  /* ↓ the five §4.3.1 adds */
  | 'new-rider'
  | 'applicant'
  | 'ticket'
  | 'corporate-account'
  | 'plan'
  /* ↓ the ride an operator is actually deciding about */
  | 'request'
  /* ↓ a colleague, under `manage_team` (plan T5.1) */
  | 'operator'

export const PROFILE_ENTITY_TYPES: readonly ProfileEntityType[] = [
  'rider',
  'driver',
  'trip',
  'subscription',
  'payment',
  'complaint',
  'new-rider',
  'applicant',
  'ticket',
  'corporate-account',
  'plan',
  'request',
  'operator',
] as const

/** The five that return "No record found" today. Kept as data so QA can assert the fix, not eyeball it. */
export const UNRESOLVED_IN_LEGACY: readonly ProfileEntityType[] = [
  'new-rider',
  'applicant',
  'ticket',
  'corporate-account',
  'plan',
] as const

/**
 * What `?entity=<id>` resolves to. Deliberately thin: the profile's *content*
 * is "sections contributed by workspaces, as a declared contract" (§4.3.1) —
 * Financials contributes wallet cards, Support contributes tickets, Operations
 * contributes trips. Not one 600-line builder, and therefore not one 600-field
 * type. Each workspace's section fetches its own data keyed on this ref.
 */
export interface ProfileRef {
  entityId: string
  entityType: ProfileEntityType
  /** Display name or, for non-person entities, the best available label. */
  title: string
  /** Second line — phone for people, route for trips, plan for subscriptions. `null` renders nothing. */
  subtitle: string | null
  /** Deep-review full-page escape (§3.10). */
  fullPagePath: string
  /** Which workspace sections have data for this entity. Drives the card stack, and its skeleton. */
  sections: ProfileSectionKey[]
}

/** One card group in the profile, owned by exactly one workspace. */
export type ProfileSectionKey =
  | 'identity'
  | 'trips'
  | 'subscriptions'
  | 'compliance'
  | 'commitment'
  | 'wallet'
  | 'payments'
  | 'tickets'
  | 'disputes'
  | 'fairness'
  | 'movement'
  | 'devices'

/** A global-search hit. Three kinds of target (§4.3.4), one result type. */
export type SearchResultKind = 'entity' | 'destination' | 'action'

export interface SearchResult {
  kind: SearchResultKind
  /** Line one of the two-line result row. */
  title: string
  /** Line two — the id for an entity, the breadcrumb for a destination. `null` renders one line. */
  subtitle: string | null
  /** Where activating it goes. For an entity, the `?entity=` overlay on the current route. */
  target: { entityId: string; entityType: ProfileEntityType } | { path: string; viewId: string | null }
  /**
   * The legacy name that matched, when one did. This is what makes "Renewal
   * pipeline" a visible reason for the row rather than a mystery hit.
   */
  matchedAliasName: string | null
  /**
   * Server-scored. Legacy's name search is an unordered `for…in` returning the
   * first substring hit over riders and drivers only, so "Al-Harbi" silently
   * picks one of two people (§4.3.4). A score plus a stable sort is the fix.
   */
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  /** Scope chip inside the input, e.g. `captains`. `null` = unscoped. */
  scope: string | null
  computedAt: IsoDateTime
}
