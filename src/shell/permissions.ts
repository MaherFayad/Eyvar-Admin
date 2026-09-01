/**
 * Workspace-tile and sub-tab-row visibility, and the write gate — spec §11.2,
 * **AC-56**, **AC-57**, **AC-58**, **AC-61**; design spec finding **F-6**;
 * **DECISIONS.md D17**.
 *
 * **This is a FILTER over the route table, not a layout branch.** F-6 states
 * the rule the whole file implements:
 *
 * > Workspace-tile and sub-tab-row visibility are a **filter over the route
 * > table**: a tile renders when the role can see ≥1 sub-tab in it (AC-57), a
 * > row renders when the role holds its view permission (AC-58). Adding
 * > `Trust & Safety` and `Dispatcher` is a **data change**.
 *
 * So there is still no role list here and no `if (role === 'Support')` anywhere
 * — D17 added the two roles and **not one line of this file was needed for
 * them**, which is the claim F-6 made and this is the receipt.
 *
 * ## What D17 changed, and the defect it closes
 *
 * Before D17 a row carried one `PermissionRef { key, level }`, and this file
 * read:
 *
 * ```ts
 * export function canWriteSubTab(ctx, row) {
 *   if (row.permission === null) return true      // ← all 35 rows
 *   return row.permission.level === 'full' && ctx.permissions.includes(row.permission.key)
 * }
 * ```
 *
 * All 35 rows shipped `permission: null`, so **`canWriteSubTab` returned
 * `true` for every operator on every screen**, `useWriteGate` handed back
 * `canWrite: true`, and every `disabled={!gate.canWrite}` across Payouts, Cash,
 * Ledger, Wallets and Pricing was decoration (REMEDIATION-PLAN §4.7.1). The
 * five money screens looked the most carefully gated in the product and were
 * gated by nothing.
 *
 * **And it failed green**: a test asserting *"an operator without permission
 * cannot do X"* could not fail, because no operator lacked a permission. Any
 * new assertion written here must therefore construct its refusal from state
 * the test controls **and prove the positive case against the same input**, so
 * a vacuous pass is caught by its twin. `permissions.test.ts` does that.
 *
 * `level` was the modelling defect, not the missing values: it was a property
 * of the ROW, so a sub-tab was read-only for everybody or for nobody, while
 * §10.3's matrix needs Operations › People to be full-access for Ops Manager
 * and read-only for Finance at the same time. D17 replaces it with two keys per
 * row and makes read/write a fact about the **operator**.
 */

import type { PermissionKey, Session, SubTabRoute, Workspace } from '@/data/types'

/**
 * What the filter reads. A subset of `Session`, so a test can pass two fields
 * instead of a whole session, and so nothing here can reach for `role`.
 */
export interface PermissionContext {
  /**
   * The operator's **effective** permissions — role baseline plus the signed
   * per-user delta, already resolved. D17: computed server-side and delivered
   * on `Session.permissions`, because *"a console that re-derives its own
   * authority will eventually disagree with the server that granted it"*.
   * `effectivePermissions()` in `data/types/session.ts` is the mock server's
   * implementation; nothing in the shell calls it.
   */
  permissions: readonly PermissionKey[]
  /**
   * §8.2 — the server's per-sub-tab view keys, derived from the same
   * `viewPermission` column this file reads, so the two cannot disagree. An
   * **empty array is "ungated"** (that is `admin-activity`); an **absent entry**
   * means the server did not say, and the row's own key decides.
   */
  subTabPermissions: Readonly<Record<string, readonly PermissionKey[]>>
}

export function permissionContext(session: Session | null): PermissionContext {
  return {
    permissions: session?.permissions ?? [],
    subTabPermissions: session?.subTabPermissions ?? {},
  }
}

/**
 * Does the operator hold this requirement?
 *
 * **`null` passes**, and after D17 that is a narrow, named case rather than the
 * whole table: exactly one row — `admin-activity` — carries `viewPermission:
 * null`, because every authenticated operator can open the Activity Log and its
 * rows are filtered server-side to entities they can otherwise see (AC-919,
 * AC-920). Three of the four shell layers carry it for the same reason.
 *
 * It does **not** mean "unresolved" any more. If a new row ships with a `null`
 * view key, `routes.test.ts` fails, by design.
 */
export function holdsPermission(ctx: PermissionContext, required: PermissionKey | null): boolean {
  if (required === null) return true
  return ctx.permissions.includes(required)
}

/** **AC-58.** A sub-tab the role cannot see does not render a row. */
export function isSubTabVisible(ctx: PermissionContext, row: SubTabRoute): boolean {
  const derived = ctx.subTabPermissions[row.subTabId]
  if (derived && derived.length > 0) {
    return derived.some((key) => ctx.permissions.includes(key))
  }
  return holdsPermission(ctx, row.viewPermission)
}

/**
 * §11.2 — a `◐` read-only sub-tab renders, and its write actions render
 * **disabled in place** with the reason available. Gate at render, not at
 * commit: the systemic legacy defect (`:10237`, `:11876`) is that the operator
 * clicks, waits, and is told no.
 *
 * **`writePermission: null` returns `false`, and that is the fix.** A sub-tab
 * that declares no write key has nothing to write — the four Overview boards,
 * Performance and the Activity Log. Returning `true` there is the same
 * open-by-default that turned every money-screen `disabled` prop into
 * decoration. If a screen under a `null`-write row needs an enabled control,
 * the row is missing its key and the answer is a data change here, never a
 * `?? true` at the call site.
 *
 * A row whose write key **equals** its view key is self-gating on purpose
 * (`operations-my-work`, `management-reports`): visible implies writable, and
 * the two calls still agree because they read the same key.
 */
export function canWriteSubTab(ctx: PermissionContext, row: SubTabRoute): boolean {
  if (row.writePermission === null) return false
  return ctx.permissions.includes(row.writePermission)
}

/**
 * The key a refusal must NAME when `canWriteSubTab` says no — the
 * `{permission}` half of D17's two sentences:
 *
 * > `You need the “{permission}” permission. {granter} can grant it.`
 *
 * `null` when the operator can write, and also when the row declares no write
 * key at all: *"you lack a permission"* is the wrong sentence for a board that
 * has no actions. A screen in that position renders no disabled control to
 * explain.
 *
 * The caller renders the key through `perm.label.<key>` as a **quoted label,
 * never a bare key** — `“Approve / reject driver applications”`, not
 * `approve_drivers`. A key is a fact about the software (D17 clause 1).
 */
export function writeRefusalPermission(
  ctx: PermissionContext,
  row: SubTabRoute,
): PermissionKey | null {
  if (row.writePermission === null) return null
  return canWriteSubTab(ctx, row) ? null : row.writePermission
}

/** The rows of one workspace's level-2 column, in display order, filtered. */
export function visibleSubTabs(
  ctx: PermissionContext,
  rows: readonly SubTabRoute[],
  workspaceId: Workspace['id'],
): SubTabRoute[] {
  return rows
    .filter((row) => row.workspaceId === workspaceId && isSubTabVisible(ctx, row))
    .sort((a, b) => a.order - b.order)
}

/**
 * **AC-57.** A workspace tile renders when the role can see **at least one**
 * sub-tab in it. A workspace filtered to zero is not rendered at all — not
 * greyed, not disabled. §2.3: *"Disabled does not exist. A workspace the role
 * cannot see is not rendered."* A deep link into it still resolves and shows
 * `route-forbidden` rather than a silent redirect (**AC-56**).
 *
 * Under D17 this genuinely drops tiles: Financials does not render for Support,
 * Trust & Safety, or the Dispatcher (**AC-916**), and Management does not render
 * for the Dispatcher or for Support (**AC-914**).
 */
export function visibleWorkspaces(
  ctx: PermissionContext,
  workspaces: readonly Workspace[],
  rows: readonly SubTabRoute[],
): Workspace[] {
  return workspaces
    .filter((workspace) => rows.some((row) => row.workspaceId === workspace.id && isSubTabVisible(ctx, row)))
    .sort((a, b) => a.order - b.order)
}

/**
 * **AC-56.** `null` when the route is permitted; otherwise the permission key
 * the forbidden state must NAME. §11.2: never a silent redirect — a redirect
 * teaches the operator that the URL they were given is wrong, when the truth is
 * that their role is.
 *
 * **AC-918**: `/financials/payouts` as Support renders the forbidden state
 * naming `view_finance`, in the same two sentences a disabled control uses
 * (D17 clause 5 — one refusal grammar, not a screen grammar and a route
 * grammar).
 */
export function forbiddenReason(
  ctx: PermissionContext,
  row: SubTabRoute | null,
): PermissionKey | null {
  if (row === null) return null
  if (isSubTabVisible(ctx, row)) return null
  return row.viewPermission
}

/**
 * **The twenty, as a value.**
 *
 * `PermissionKey` is a type union in `data/types/navigation.ts` and there is no
 * runtime list beside it, so nothing could iterate the set. §6.4's *"exactly
 * what your role can do"* summary needs to: a list of only the **held** keys
 * answers "what can I do" and not "why can I not do this", and the second is the
 * question that brings an operator to that card.
 *
 * The `Record<PermissionKey, true>` before the `keyof` is the whole point —
 * adding a twenty-first key to the union without adding it here is a **compile
 * error**, so this cannot drift out of the type the way a hand-written array
 * would. Declared in the shell because the shell is the only consumer; when the
 * data layer grows its own exported constant, this becomes a re-export.
 *
 * **`manage_settings` is present and retired.** It is a member of the union
 * until the five screens still reading it directly move to its four successors
 * (see `PermissionKey`), so it must be here or this file stops compiling. It is
 * held only by `Owner` and gates no route-table row.
 */
const PERMISSION_SET: Readonly<Record<PermissionKey, true>> = {
  view_analytics: true,
  view_operations: true,
  view_finance: true,
  view_support: true,
  view_admin: true,
  view_profiles: true,
  approve_drivers: true,
  manage_subscriptions: true,
  live_ops: true,
  manage_plans: true,
  process_payouts: true,
  release_escrow: true,
  apply_deductions: true,
  manage_tickets: true,
  contact_users: true,
  manage_team: true,
  manage_ops_policy: true,
  manage_workspace: true,
  manage_data_governance: true,
  manage_security_policy: true,
  /* @deprecated D17 — retired, Owner-only, gates no row. */
  manage_settings: true,
}

/** Declaration order is the order §6.4's summary renders them in. */
export const PERMISSION_KEYS = Object.keys(PERMISSION_SET) as readonly PermissionKey[]
