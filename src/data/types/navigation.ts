/**
 * The navigation model as data — foundation spec §3 and §8.5.
 *
 * D1: five workspaces, 34 sub-tabs. The route table is **data, not code**, for
 * two reasons the spec is explicit about:
 *
 *   - "a sub-tab's route must not encode its workspace in anything except the
 *     route table, so moving one is a data change" (§3.4, Operations risk R1);
 *   - "the shell must be built so that adding or changing a permission on a
 *     route is a data change in the route table, not a code change in a
 *     screen" (§11.3).
 *
 * QA diffs this table against §3.4 and §3.5 mechanically (AC-03, AC-04, AC-15).
 */

import type { IsoDateTime, NavBadgeTone } from './common'

/* ───────────────────────── Workspaces ──────────────────────── */

/** §3.3. Rail order is the declaration order; `admin` is pinned to the bottom. */
export type WorkspaceId = 'management' | 'operations' | 'financials' | 'support' | 'admin'

export const WORKSPACE_IDS: readonly WorkspaceId[] = [
  'management',
  'operations',
  'financials',
  'support',
  'admin',
] as const

export interface Workspace {
  id: WorkspaceId
  /** `/management`, `/operations`, … — the first path segment (§3.8 rule 1). */
  routePrefix: string
  titleKey: string
  /** Rail position, ascending. `admin` carries the highest and is pinned. */
  order: number
  pinnedToBottom: boolean
  /**
   * The sub-tab a click on the tile resolves to. Always that workspace's
   * `Overview` (§3.3, AC-06).
   */
  defaultSubTabId: string
  /**
   * Icon **concept**, not an asset name. product-designer specifies the glyph
   * (0.2 handoff item 4); this string is the brief, and the legacy line is the
   * candidate that already exists.
   */
  iconConcept: string
  legacyIconLine: number
}

/* ────────────────── Patterns, shapes, views ────────────────── */

/** §5.1. Ten pattern keys plus the shell itself. A merged sub-tab carries more than one. */
export type PatternKey = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | 'SH'

/** §3.10. Every destination resolves to exactly one. */
export type PageShape = 'single' | 'detail' | 'bleed' | 'monitor'

/** §3.8 rule 3 — a view is a `?view=` search param and a control, never a path segment. */
export interface SubTabView {
  /** Stable id used in `?view=` and in the mock query engine. */
  id: string
  titleKey: string
  /** Ordinal in the view-tab row. */
  order: number
  /** True for the view a bare sub-tab route resolves to. Exactly one per sub-tab that has views. */
  isDefault: boolean
}

/** §3.4 — five level-3 routes: corporate, applicant, ticket, plan editor, and the profile's full-page escape. */
export type DetailKind = 'corporate' | 'applicant' | 'ticket' | 'plan-editor' | 'entity'

export interface DetailRoute {
  kind: DetailKind
  /** Canonical path with named params, e.g. `/operations/people/applications/:applicantId`. */
  path: string
  /** The sub-tab whose row stays highlighted while this route is active (§3.8 rule 2). */
  parentSubTabId: string
  paramName: string
  titleKey: string
  shape: PageShape
  patterns: PatternKey[]
}

/* ────────────────────── Permissions ────────────────────────── */

/** The 13 broad keys that exist today — legacy `PERMISSION_LABELS` (`:3225`–`:3239`). */
export type PermissionKey =
  | 'approve_drivers'
  | 'manage_subscriptions'
  | 'live_ops'
  | 'manage_plans'
  | 'view_finance'
  | 'process_payouts'
  | 'release_escrow'
  | 'apply_deductions'
  | 'manage_tickets'
  | 'view_profiles'
  | 'contact_users'
  | 'manage_team'
  | 'manage_settings'

/** §11.2 — `◐` read-only sub-tabs render, with write actions disabled in place. */
export type PermissionLevel = 'full' | 'read'

export interface PermissionRef {
  key: PermissionKey
  level: PermissionLevel
}

/* ─────────────────────── The route row ─────────────────────── */

export interface SubTabRoute {
  subTabId: string
  workspaceId: WorkspaceId
  /** Canonical route, unique across the table (AC-03). */
  path: string
  /** Display order within the workspace, 1-based. */
  order: number
  titleKey: string
  /** Null renders nothing — not an empty `›` separator (§4.2). Legacy has 41 titles and only 31 subtitles. */
  subtitleKey: string | null
  views: SubTabView[]
  detailRoutes: DetailRoute[]
  /**
   * **The merge register as data** (§8.5). Ids from `GROUND-TRUTH-INVENTORY.md`
   * §A. A *Split* page appears in several rows — AC-04 requires each census id
   * in *at least* one row, not exactly one. `interventions` appears in none
   * (§3.11). This field is what lets global search resolve a legacy name such
   * as "Renewal pipeline" to Operations › Subscriptions — Expiring ≤ 7 days
   * (§4.3.4).
   */
  legacyPageIds: string[]
  /**
   * Legacy settings pane keys absorbed by this sub-tab (§3.7). Not in §8.5's
   * field list, but **AC-15 requires it**: "a test that walks the route table
   * finds all 21 and none twice". Empty for every sub-tab that absorbs none.
   */
  legacySettingsPanes: string[]
  patterns: PatternKey[]
  shape: PageShape
  /**
   * `null` = unresolved. **Q4 is open**: the rule is settled (§11.3), the 34
   * values are not, and 19 legacy pages had nothing to inherit. Shipping `null`
   * is the recorded gap AC-61 fails against — it is not a decision this file
   * is allowed to make.
   */
  permission: PermissionRef | null
  /** Whether this sub-tab owns a backlog and therefore can carry a count badge (§8.4). */
  hasBacklog: boolean
}

/* ─────────────────────── Shell layers ─────────────────────── */

/**
 * §4.3 — `profile`, `notifications-all` and `my-account` stop being tabs and
 * become overlay params on the current route. They are **rows in this table**
 * even though they are not sub-tabs, because they carry the remaining three
 * census ids and AC-04 counts the union over every row.
 */
export type ShellLayerId = 'entity' | 'notifications' | 'account'

export interface ShellLayerRoute {
  layerId: ShellLayerId
  /** `entity`, `notifications`, `account` — the search-param name (§3.8 rule 4). */
  overlayParam: string
  titleKey: string
  /** Deep-review full-page escape, where one exists. Only the 360° profile has one (§3.10). */
  fullPagePath: string | null
  legacyPageIds: string[]
  patterns: PatternKey[]
  permission: PermissionRef | null
}

export interface RouteTable {
  workspaces: Workspace[]
  subTabs: SubTabRoute[]
  shellLayers: ShellLayerRoute[]
  /** Ids retired with no destination — `interventions` (§3.11). Present so AC-04 can assert absence, not infer it. */
  retiredLegacyPageIds: string[]
}

/* ─────────────────────── Nav counts ────────────────────────── */

/**
 * §8.4. These are **not** constants: in production they come from an endpoint,
 * which means the nav can load, fail and be empty, and the shell has to handle
 * all three. Labels come from the route table and render immediately (§9.1) —
 * only the numbers are async.
 */
export interface SubTabCount {
  subTabId: string
  /**
   * `null` means "this sub-tab has no backlog concept" — a different thing from
   * `0`, which means "the backlog is empty". **Zero renders no badge, not a
   * `0`** (§3.9; legacy renders `0` on eleven rail badges at boot, D-L8).
   */
  count: number | null
  /**
   * What **kind** of backlog this sub-tab is — not what its number currently is.
   * A queue that needs a human decision stays `attention` after it empties: the
   * tone describes the queue, the count describes its contents.
   *
   * That separation is exactly why the workspace roll-up must gate on the count
   * as well as the tone. See `workspaceBadge` in `src/shell/navBadges.ts`.
   */
  tone: NavBadgeTone
}

/**
 * The nav-count endpoint returns **per sub-tab only**. There is deliberately no
 * `workspaceCount` and no `workspaceBadgeTone` field.
 *
 * The roll-up depends on which sub-tabs are *visible to this role* — §11.2: a
 * sub-tab the role cannot see is not rendered at all — and role visibility is
 * resolved in the shell, not least because **Q4 is open** and no route carries a
 * permission yet. A server-computed workspace tone would be summed over a
 * different set of children than the one the operator is looking at, and would
 * start disagreeing with the sub-tab list the moment permissions land.
 *
 * The shell derives it with `workspaceBadge` (`src/shell/navBadges.ts`).
 */
export interface NavCounts {
  subTabs: SubTabCount[]
  /** When the server computed these. Drives the freshness line, not a `Date.now()` in a component. */
  computedAt: IsoDateTime
}

