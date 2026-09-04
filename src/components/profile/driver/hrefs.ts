/**
 * **Where the captain profile's two controls go**, built once so both surfaces
 * send an operator to the same place.
 *
 * ## Why these are functions and not two strings at two call sites
 *
 * §3's parity contract is about content, and a destination is content: a sheet
 * that opened the Compliance view unfiltered while the page opened it on this
 * captain would be two answers to *"where do I renew this licence"*. There is
 * one answer, here, and both surfaces import it.
 *
 * ## Why the query parameter is scoped, and how the scope is decided
 *
 * `useUrlTableState.tableScope` builds a table's parameter prefix from the
 * route's `?view=` plus the table's own `urlKey`: *"`?view=captains` +
 * `urlKey: 'lf'` → `captains.lf`. Empty string means bare names."*
 *
 * - **People** declares four views and Compliance is one of them, so its table
 *   reads `compliance.q` and a bare `?q=` would be ignored.
 * - **Payouts** declares none in the route table and its default tab writes no
 *   `?view=`, so its table reads a bare `?q=`.
 *
 * Both `q` values are matched against ids by the screens' own query shapes —
 * `complianceShape.searchable` includes `driverId` and
 * `payoutShape.searchable` includes `captainId` — so the captain's own id is
 * the narrowing term and no name has to be guessed at or spelled twice.
 *
 * **`?q=` and not `location.state`.** A back-and-forward through these has to
 * restore the filter, a pasted link has to arrive filtered, and `state` does
 * neither. The rider profile's back control makes the opposite choice for the
 * opposite reason — `routes.tsx` records that a redirect target *"is an
 * attacker-controllable URL parameter"* — and the two are consistent: a
 * navigation *target* is state, a table *filter* is the URL.
 */

/** Operations › People, view *Compliance*, narrowed to this captain. */
export function driverComplianceHref(driverId: string): string {
  return `/operations/people?view=compliance&compliance.q=${encodeURIComponent(driverId)}`
}

/** Financials › Payouts, narrowed to this captain. */
export function driverPayoutsHref(driverId: string): string {
  return `/financials/payouts?q=${encodeURIComponent(driverId)}`
}

/**
 * The two view permissions the destinations require, from the route table
 * (`fixtures/routeTable.ts`).
 *
 * Named here so a call site cannot pass the wrong string and silently refuse a
 * control that would have worked — the defect `shell/permissions.ts` records as
 * *"every `disabled={!gate.canWrite}` across five money screens was
 * decoration"*, in its other direction.
 */
export const COMPLIANCE_VIEW_PERMISSION = 'view_operations'
export const PAYOUTS_VIEW_PERMISSION = 'view_finance'
