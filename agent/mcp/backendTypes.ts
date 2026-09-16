/**
 * The one seam every tool calls through. `source.ts` picks mock or http at
 * runtime; tool files never import `../../src/data/clients` or `client.ts`
 * directly, so they work unchanged once the real backend exists.
 */

import type { PermissionKey } from '../../src/data/types/navigation'
import type { Paginated, QueryParams, Single, FilterSpec, IsoDate } from '../../src/data/types/common'
import type { Dimension, Measure } from '../../src/data/types/measure'
import type { ReportQuery, ReportWindow, SavedReport } from '../../src/data/types/report'
import type { RecordRunOutcome, ReportRun, CompareWindowsResult } from '../../src/data/clients/runs'
import type { ContributionInput } from '../../src/data/clients/reports'
import type { ContributionResult, DescribeResult } from '../../src/data/reporting/stats'
import type { Page, PageKind, Block } from '../../src/data/types/page'
import type { AlertRule, AlertFiring } from '../../src/data/types/alert'
import type { Annotation } from '../../src/data/types/annotation'
import type { AgentJob } from '../../src/data/types/agent'

export interface SaveReportOutcomeLike {
  status: 'saved' | 'invalid'
  report?: SavedReport
  reasons?: string[]
}

export interface SavePageOutcomeLike {
  status: 'saved' | 'invalid' | 'conflict'
  page?: Page
  violations?: unknown[]
}

/** T16's `alert_context` — one firing, its rule, the series around it, and the context around that. */
export interface AlertContextResult {
  rule: AlertRule
  bucketStart: string
  value: number
  threshold: number
  series: {
    id: string
    measureKey: string
    groupValue: string | null
    buckets: string[]
    points: (number | null)[]
    partialBucketIndexes: number[]
  } | null
  priorFirings: AlertFiring[]
  annotations: Annotation[]
}

export interface Backend {
  today(): IsoDate
  currentPermissions(): Promise<PermissionKey[] | null>

  listMeasures(params: QueryParams & { category?: string }): Promise<Paginated<Measure>>
  listDimensions(params: QueryParams): Promise<Paginated<Dimension>>

  recordRun(query: ReportQuery, jobId: string | null): Promise<RecordRunOutcome>
  getRun(runId: string): Promise<Single<ReportRun>>
  compareWindows(
    query: ReportQuery,
    windowA: ReportWindow,
    windowB: ReportWindow,
  ): Promise<CompareWindowsResult | { status: 'invalid-query' }>
  describeSeries(runId: string, seriesId: string): Promise<DescribeResult>
  contribution(input: ContributionInput): Promise<ContributionResult>
  sampleRows(input: {
    resource: string
    filters: FilterSpec[]
    bucket?: IsoDate
    limit?: number
  }): Promise<Array<Record<string, unknown>>>

  listReports(params: QueryParams & { view?: string | null }): Promise<Paginated<SavedReport>>
  getReport(id: string): Promise<Single<SavedReport>>
  saveReport(input: {
    name: string
    description: string | null
    query: ReportQuery
    visibility: 'private'
    tags: string[]
  }): Promise<SaveReportOutcomeLike>

  listPages(params: QueryParams & { view?: string | null }): Promise<Paginated<Page>>
  getPage(id: string): Promise<Single<Page>>
  savePage(input: {
    kind: PageKind
    title: string
    blocks: Block[]
    tags: string[]
  }): Promise<SavePageOutcomeLike>

  listAlertRules(params: QueryParams): Promise<Paginated<AlertRule>>
  getAlertRule(id: string): Promise<Single<AlertRule>>
  listAlertFirings(ruleId: string, params: QueryParams): Promise<Paginated<AlertFiring>>
  listFirings(params: QueryParams): Promise<Paginated<AlertFiring>>
  /** `null` means no firing with that id. */
  alertContext(firingId: string): Promise<AlertContextResult | null>

  listAnnotations(params: { from?: IsoDate; to?: IsoDate }): Promise<Annotation[]>

  getAgentJob(id: string): Promise<Single<AgentJob>>
  noteFinding(jobId: string, text: string, runIds: string[]): Promise<{ ok: true }>
}
