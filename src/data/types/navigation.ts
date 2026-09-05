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

/**
 * §3.4 named five level-3 routes: corporate, applicant, ticket, plan editor,
 * and the profile's full-page escape.
 *
 * **`report` and `dashboard` are the sixth and seventh, added with the
 * `management-reports` row (D1a).** `specs/06-report-builder.md` §5.1 requires
 * both — a saved report opens at `/management/reports/:reportId` and a
 * dashboard at `/management/reports/dashboards/:dashboardId`. They are detail
 * routes rather than views because each addresses **one named record**, which
 * is what `?view=` cannot carry (§3.8 rule 3).
 */
export type DetailKind =
  | 'corporate'
  | 'applicant'
  | 'ticket'
  | 'plan-editor'
  | 'entity'
  | 'report'
  | 'dashboard'
  /** Support › Disputes › one claim (S-7). */
  | 'dispute'
  /** Support › Safety › one incident (S-8, spec F-2). */
  | 'incident'
  /** Support › Captain Fairness › one case (S-8). */
  | 'fairness-case'
  /* Support › Contact Centre. The conversation pane is a **page**, not a
     drawer, and the reasoning is worth keeping because the first answer was
     wrong for a revealing reason: it was chosen as a drawer only because this
     row declared `detailRoutes: []` and `routes.tsx` has a single owner — a
     file-ownership constraint deciding a page shape. On the design itself,
     §5.0's drawer is *"a surface consulted against the page behind it"*, and
     under D22's 45-second first response at a cap of three an operator is IN
     the conversation for twenty minutes rather than consulting it; and
     `--ev-drawer-w` is 406px, which cannot hold a thread, a 320px rail and a
     pinned composer at once. */
  | 'conversation'

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

/**
 * **The twenty keys — DECISIONS.md D17.**
 *
 * Twelve survive from the legacy `PERMISSION_LABELS` (`:3225`–`:3239`), eight
 * are minted, and `manage_settings` is **retired**. Every mint closes a named
 * gap in `PROPOSED-STRUCTURE.md` §10.5; none is speculative.
 *
 * Declaration order is the order §6.4's "exactly what your role can do" summary
 * renders them in: the five workspace read keys first, then `view_profiles`,
 * then the write keys in the order their workspaces appear on the rail.
 */
export type PermissionKey =
  /* ── the five workspace read keys ───────────────────────────────
     `view_finance` already WAS one and has been since the legacy app. The other
     four complete the pattern; the alternative — bending a write-flavoured key
     such as `live_ops` into a view gate — reproduces `manage_settings`: one key
     doing two jobs, and nobody able to grant half of it (D17). */
  | 'view_analytics'
  | 'view_operations'
  | 'view_finance'
  | 'view_support'
  | 'view_admin'
  /* The 360° layer. Enforced at ZERO call sites before D17 (§10.5 Problem 2). */
  | 'view_profiles'
  /* ── write keys ──────────────────────────────────────────── */
  | 'approve_drivers'
  | 'manage_subscriptions'
  | 'live_ops'
  | 'manage_plans'
  | 'process_payouts'
  | 'release_escrow'
  | 'apply_deductions'
  | 'manage_tickets'
  | 'contact_users'
  | 'manage_team'
  /* Dispatch radius, cities, limits, reason codes, SLA policy, the D22 chat cap. */
  | 'manage_ops_policy'
  /* General, branding, legal, communications, integrations. */
  | 'manage_workspace'
  /* Retention, erasure, integrity, exports. */
  | 'manage_data_governance'
  /* Second-factor enforcement, session lifetime, re-auth window. **Closes Q-78**,
     which recorded that AC-663 fails visibly for want of this key. It is a
     separate key from `manage_workspace` on purpose: folded together, the person
     who edits the logo can turn off the second factor. */
  | 'manage_security_policy'
  /**
   * **RETIRED by D17** — it was 39 of the console's 131 guards, held by one
   * person (§10.5 Problem 1). It splits into `manage_ops_policy`,
   * `manage_workspace`, `manage_data_governance` and `manage_security_policy`.
   *
   * **It survives in the union as a transitional alias, granted to `Owner` and
   * to nobody else**, because five screens outside this file's owner still read
   * it directly and deleting the key would make them read-only for the Owner
   * mid-migration. **It gates no route-table row.** The migration each screen
   * owner has to make:
   *
   * | Screen | reads today | must read |
   * |---|---|---|
   * | `admin/workspace/AdminWorkspaceScreen.tsx:97` | `manage_settings` | `manage_workspace` |
   * | `admin/communications/AdminCommunicationsScreen.tsx:76` | `manage_settings` | `manage_workspace` |
   * | `admin/policy/AdminPolicyScreen.tsx:~60` | `manage_settings` | `manage_ops_policy` |
   * | `admin/data/RetentionCard.tsx:78` | `manage_settings` | `manage_data_governance` |
   * | `admin/data/IntegrityPane.tsx:149` | `manage_settings` | `manage_data_governance` |
   *
   * **AC-925 fails until those five land**, and it fails naming this comment.
   * Delete this member the day the last one migrates.
   *
   * @deprecated D17 — use one of the four successors above.
   */
  | 'manage_settings'

/**
 * **Retired from the navigation model by D17; retained for the measure
 * catalogue only.**
 *
 * `PermissionLevel` was a property of the ROW, so a sub-tab was `full` or
 * `read` for everybody — and §10.3's matrix needs Operations › People to be
 * full-access for Ops Manager and read-only for Finance **at the same time**.
 * That is a modelling defect, not a missing value, which is why D17 replaces
 * `SubTabRoute.permission` with `viewPermission` + `writePermission` and makes
 * read/write a fact about the OPERATOR, where it always was.
 *
 * These two declarations survive only because `types/measure.ts:268` and
 * `fixtures/measures.ts` still carry `permission: PermissionRef | null` on a
 * **measure**, which D17 does not rule on and whose owner is not this one.
 * **Nothing in the navigation model may reference them.** Delete both from this
 * file the day the measure catalogue is re-modelled.
 *
 * @deprecated D17 — navigation carries `PermissionKey | null` directly.
 */

/**
 * Every `PermissionKey`, as a value.
 *
 * The union is the authority; this is it at runtime, and
 * `navigation.test.ts` asserts the two cannot diverge. Added because a
 * literal `13` was serving as the denominator in the onboarding intro —
 * *"You hold 3 of 13 permissions"* against a model that has had 21 since
 * D17 split `manage_settings` into four.
 */
export const PERMISSION_KEYS: readonly PermissionKey[] = [
  'view_analytics',
  'view_operations',
  'view_finance',
  'view_support',
  'view_admin',
  'view_profiles',
  'approve_drivers',
  'manage_subscriptions',
  'live_ops',
  'manage_plans',
  'process_payouts',
  'release_escrow',
  'apply_deductions',
  'manage_tickets',
  'contact_users',
  'manage_team',
  'manage_ops_policy',
  'manage_workspace',
  'manage_data_governance',
  'manage_security_policy',
  'manage_settings',
]

export type PermissionLevel = 'full' | 'read'

/** @deprecated D17 — see `PermissionLevel`. Measure catalogue only. */
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
   * **D17 — the row declares TWO keys, not one level.**
   *
   * `● = the operator holds both · ◐ = holds view only · ○ = holds neither`.
   *
   * This is the key that decides whether the row RENDERS at all
   * (`isSubTabVisible`, AC-58) and which key `forbiddenReason` names on a deep
   * link (AC-56).
   *
   * **Non-null on 34 of the 35 rows.** `admin-activity` is the one `null` and
   * it is deliberate: every authenticated operator can open the Activity Log,
   * and its rows are filtered **server-side** to entities the operator can
   * otherwise see. An audit trail only the accused can hide is not a control,
   * and a client-side filter over a full log is a leak in the network tab.
   * **AC-919 asserts it is the only one.**
   */
  viewPermission: PermissionKey | null
  /**
   * The key that decides whether this row's write actions are ENABLED
   * (`canWriteSubTab`). §11.2: a read-only sub-tab still renders, with its write
   * actions **disabled in place, at rest, with the reason named**.
   *
   * **`null` means this sub-tab declares no write actions at all, and
   * `canWriteSubTab` returns `false` for it** — the four Overview boards,
   * `management-overview`, `management-performance` and `admin-activity`.
   * Returning `true` there would be the same open-by-default that made the old
   * `permission: null` mean "ungated" and turned every `disabled={!gate.canWrite}`
   * in Financials into decoration (REMEDIATION-PLAN §4.7.1).
   *
   * It may equal `viewPermission`: `operations-my-work` and `management-reports`
   * are **self-gating** — claiming your own work and saving your own report
   * require no authority beyond being able to see the screen.
   */
  writePermission: PermissionKey | null
  /** Whether this sub-tab owns a backlog and therefore can carry a count badge (§8.4). */
  hasBacklog: boolean
}

/* ─────────────────────── Shell layers ─────────────────────── */

/**
 * §4.3 — `profile`, `notifications-all` and `my-account` stop being tabs and
 * become overlay params on the current route. They are **rows in this table**
 * even though they are not sub-tabs, because they carry the remaining three
 * census ids and AC-04 counts the union over every row.
 *
 * ## `onboarding` is the fourth, and `reauth` is deliberately NOT a fifth
 *
 * **R4-2 §2.2** mints the guided checklist as a shell layer and **R4-3** rules
 * that the shell has **four** layers, one open at a time. `onboarding` is that
 * fourth, carried as `?onboarding=1` — an overlay *param*, never a route of its
 * own, so browser Back closes it and stays put.
 *
 * **Re-authentication is a modal with no route and no URL param.** An earlier
 * revision of `specs/04-auth-and-onboarding.md` asked for `reauth` here as a
 * fifth layer and R4-3 §3.2 reversed it; spec §18 item 6 now says so outright.
 * The reason is not tidiness: §7.3.3's focus law forces it — a no-scrim layer
 * does not trap focus, so `Tab` would walk an operator out of the only working
 * control into the frozen console behind it. And **a re-auth surface with an
 * address is a re-auth surface someone can navigate past.** Do not add it.
 */
export type ShellLayerId = 'entity' | 'notifications' | 'account' | 'onboarding'

export interface ShellLayerRoute {
  layerId: ShellLayerId
  /** `entity`, `notifications`, `account` — the search-param name (§3.8 rule 4). */
  overlayParam: string
  titleKey: string
  /** Deep-review full-page escape, where one exists. Only the 360° profile has one (§3.10). */
  fullPagePath: string | null
  legacyPageIds: string[]
  patterns: PatternKey[]
  /**
   * The same two-key shape as `SubTabRoute` (D17), so one predicate serves both
   * and the shell never has to ask which kind of row it is holding. `null` on
   * both = every authenticated operator, which is three of the four layers.
   */
  viewPermission: PermissionKey | null
  writePermission: PermissionKey | null
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

