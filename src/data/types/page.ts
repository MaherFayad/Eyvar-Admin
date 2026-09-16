/**
 * Pages and blocks (D42, `03-pages-and-dashboards.md` §2) — `Dashboard`
 * generalised to a block canvas. `dashboardToPage()` (`reporting/pages/migrate.ts`,
 * a later phase) converts a v1 `Dashboard`; this file is the target shape only.
 */

import type { AlertCondition } from './alert'
import type { FilterSpec, IsoDateTime } from './common'
import type { ReportWindow } from './report'

export type PageKind = 'dashboard' | 'case-study' | 'note'
export type PageVisibility = 'private' | 'team'

/**
 * A registry key from `src/components/icons.ts` — never an emoji. That
 * module exports no name union yet; this alias stands in until it does.
 */
export type IconName = string

/** §2's block cap, counted recursively across `toggle` and `columns` nesting. */
export const PAGE_BLOCK_MAX = 200
/** A `columns` block holds 2 … 4 columns; a column's own widths sum to ≤ this out of 12. */
export const PAGE_COLUMNS_MIN = 2
export const PAGE_COLUMNS_MAX = 4
export const PAGE_COLUMN_WIDTH_MAX = 12
export const PAGE_TEXT_MD_MAX = 8000
export const PAGE_HEADING_MAX = 200

export type ReportBlockHeight = 'S' | 'M' | 'L' | 'XL'
export type ReportBlockView = 'chart' | 'table' | 'headline'
export type CalloutTone = 'info' | 'success' | 'warning' | 'neutral'
export type MetricBlockFormat = 'value' | 'value-delta' | 'sparkline'
export type PageTableColumn = { key: string; label: string; align: 'start' | 'end' }

interface BlockBase {
  id: string
}

export interface HeadingBlock extends BlockBase {
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

/** A markdown subset (§4), capped at `PAGE_TEXT_MD_MAX`. */
export interface TextBlock extends BlockBase {
  type: 'text'
  md: string
}

export interface CalloutBlock extends BlockBase {
  type: 'callout'
  tone: CalloutTone
  md: string
}

export interface DividerBlock extends BlockBase {
  type: 'divider'
}

/** One level of nesting: a toggle may not hold `columns` or another `toggle`. */
export interface ToggleBlock extends BlockBase {
  type: 'toggle'
  title: string
  open: boolean
  blocks: Block[]
}

/** 2 … 4 columns; a column may not hold another `columns` block. Unset widths share the remainder equally. */
export interface ColumnsBlock extends BlockBase {
  type: 'columns'
  columns: { width?: number; blocks: Block[] }[]
}

/**
 * A pinned report. `title` is set at pin time and editable — the replacement
 * for `DashboardTile.pinnedName`, and the fallback shown when `reportId` 404s.
 */
export interface ReportBlock extends BlockBase {
  type: 'report'
  reportId: string
  view: ReportBlockView
  height: ReportBlockHeight
  title: string | null
}

/** `seriesId: null` reads the report's first series. */
export interface MetricBlock extends BlockBase {
  type: 'metric'
  reportId: string
  seriesId: string | null
  format: MetricBlockFormat
}

/** A hand-authored table, editable — not a pinned report. */
export interface TableBlock extends BlockBase {
  type: 'table'
  columns: PageTableColumn[]
  rows: string[][]
}

/** State badge and last value per rule, read live. */
export interface AlertStatusBlock extends BlockBase {
  type: 'alert-status'
  ruleIds: string[]
}

/** AC-1260 — the report, series and condition a finding's own recommendation
 * proposed; prefills the alert composer. Never created without the
 * operator's own save (§5 — an agent proposes, it never arms). */
export interface AgentAlertProposal {
  reportId: string
  seriesId: string
  condition: AlertCondition
}

/** Read-only; provenance link back to the job and the runs it cites. */
export interface AgentInsightBlock extends BlockBase {
  type: 'agent-insight'
  jobId: string
  findingId: string
  md: string
  runIds: string[]
  /** `undefined`/`null` when the study proposed no alert for this finding. */
  alertProposal?: AgentAlertProposal | null
}

export interface BookmarkBlock extends BlockBase {
  type: 'bookmark'
  target: { kind: 'page' | 'report'; id: string }
}

export type Block =
  | HeadingBlock
  | TextBlock
  | CalloutBlock
  | DividerBlock
  | ToggleBlock
  | ColumnsBlock
  | ReportBlock
  | MetricBlock
  | TableBlock
  | AlertStatusBlock
  | AgentInsightBlock
  | BookmarkBlock

export interface Page {
  id: string
  kind: PageKind
  /** 1–120 characters. */
  title: string
  icon: IconName | null
  description: string | null
  ownerId: string
  visibility: PageVisibility
  tags: string[]
  /** Set only by `manage_analytics` (D17 — key not yet minted; see `annotation.ts`). */
  official: boolean
  /** `03-pages-and-dashboards.md` §6 — a shipped template, copied rather than opened. **Absent means `false`**; read via `pageTemplate()`. */
  template?: boolean
  /** §7's index star toggle. Not in §2's model block; a spec gap, mirrored on `SavedReport`. **Absent means `[]`**; read via `pageStarredBy()`. */
  starredBy?: string[]
  scope: { range: ReportWindow | null; filters: FilterSpec[] }
  blocks: Block[]
  /** Server-incremented. A save against a stale `version` is a 409. */
  version: number
  /** `null` = draft (agent output, template copy). */
  publishedAt: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  updatedBy: string
}

/** The **one** reader of `page.template`. See `Page.template`. */
export function pageTemplate(page: Pick<Page, 'template'>): boolean {
  return page.template ?? false
}

/** The **one** reader of `page.starredBy`. See `Page.starredBy`. */
export function pageStarredBy(page: Pick<Page, 'starredBy'>): string[] {
  return page.starredBy ?? []
}
