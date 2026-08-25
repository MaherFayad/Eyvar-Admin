/**
 * Workspace-tile and sub-tab-row visibility — spec §11.2, **AC-57**, **AC-58**,
 * **AC-60**, **AC-61**; design spec finding **F-6**.
 *
 * **This is a FILTER over the route table, not a layout branch.** F-6 states
 * the rule the whole file implements:
 *
 * > Workspace-tile and sub-tab-row visibility are a **filter over the route
 * > table**: a tile renders when the role can see ≥1 sub-tab in it (AC-57), a
 * > row renders when the role holds its view permission (AC-58). Adding
 * > `Trust & Safety` and `Dispatcher` is a **data change**.
 *
 * So there is no role list here and no `if (role === 'Support')` anywhere.
 * **`Trust & Safety` and `Dispatcher` are not assumed to exist** (Q3), and
 * nothing below would need to change if they did.
 *
 * **AC-61 FAILS TODAY, AND IT FAILS VISIBLY.** Q4 is unanswered: `permission`
 * is `null` on all 34 route-table rows and `session.subTabPermissions` is
 * `{}`. `isVisible` therefore currently returns `true` for every row — an
 * ungated row is one nobody has gated yet, which is exactly what the product
 * does today. The moment Q4 lands, the 34 values go into
 * `src/data/fixtures/routeTable.ts` and this file starts denying without a
 * line changing. Papering over it — inventing a plausible permission per row —
 * would ship an answer the business owner has not given.
 */

import type { PermissionKey, PermissionRef, Session, SubTabRoute, Workspace } from '@/data/types'

/**
 * What the filter reads. A subset of `Session`, so a test can pass two fields
 * instead of a whole session, and so nothing here can reach for `role`.
 */
export interface PermissionContext {
  permissions: readonly PermissionKey[]
  /** §8.2 — 34 entries required. `{}` today; see the header. */
  subTabPermissions: Readonly<Record<string, readonly PermissionKey[]>>
}

export function permissionContext(session: Session | null): PermissionContext {
  return {
    permissions: session?.permissions ?? [],
    subTabPermissions: session?.subTabPermissions ?? {},
  }
}

/**
 * Does the role hold this requirement?
 *
 * `null` — the requirement is unresolved (**Q4**) — passes. See the header:
 * the alternative is a console with no navigation until a business decision
 * lands, which is worse than a console that is not yet gated.
 *
 * `level: 'read'` also passes: §11.2 says a read-only sub-tab **is** rendered,
 * with its write actions disabled in place. Read-only is a visibility answer of
 * "yes"; it is the ACTIONS that differ, and that is `canWrite`'s job.
 */
export function holdsPermission(ctx: PermissionContext, required: PermissionRef | null): boolean {
  if (required === null) return true
  return ctx.permissions.includes(required.key)
}

/** **AC-58.** A sub-tab the role cannot see does not render a row. */
export function isSubTabVisible(ctx: PermissionContext, row: SubTabRoute): boolean {
  const derived = ctx.subTabPermissions[row.subTabId]
  if (derived && derived.length > 0) {
    return derived.some((key) => ctx.permissions.includes(key))
  }
  return holdsPermission(ctx, row.permission)
}

/**
 * §11.2 — a `◐` read-only sub-tab renders, and its write actions render
 * **disabled in place** with the reason available. Gate at render, not at
 * commit: the systemic legacy defect (`:10237`, `:11876`) is that the operator
 * clicks, waits, and is told no.
 */
export function canWriteSubTab(ctx: PermissionContext, row: SubTabRoute): boolean {
  if (row.permission === null) return true
  return row.permission.level === 'full' && ctx.permissions.includes(row.permission.key)
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
 */
export function forbiddenReason(
  ctx: PermissionContext,
  row: SubTabRoute | null,
): PermissionKey | null {
  if (row === null) return null
  if (isSubTabVisible(ctx, row)) return null
  return row.permission?.key ?? null
}
