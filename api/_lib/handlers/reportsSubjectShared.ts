/**
 * Shared helpers for the three subject-shaped modes — `reportsFunnel.ts`,
 * `reportsCohort.ts`, `reportsJourney.ts` (WP-6.4c). Ports of the
 * module-private helpers `resolveReport.ts` keeps beside `resolveFunnel`/
 * `resolveCohort`/`resolveJourney` (`earliestPerSubject`, `groupBySubject`,
 * `latestPerSubject`, `mergeLatest`, `blockedFor`, `redactedSeries`,
 * `emptyModeResult`, `conversionWindowDays`) — not imported, because none of
 * them is exported from a `src/` file this WP may edit (`AGENT-BRIEF.md`:
 * "touch only `api/**`"). Each is pure and a direct, line-for-line port; the
 * AC-1276 equality test is what proves that port exact rather than merely
 * plausible.
 */
import type { SubjectEvent } from '../compile'
import type { FilterSpec, IsoDate } from '@/data/types/common'
import type { Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type { ReportQuery, ReportResult, ReportSeries, ReportWarning } from '@/data/types/report'

/** §13.1 — authorised per viewer, per measure, at the data layer. */
export function blockedFor(measure: Measure, permissions: readonly PermissionKey[]): PermissionKey | null {
  const required = measure.permission
  return required && !permissions.includes(required.key) ? required.key : null
}

/** A series carrying no points, for a rung/column/path the viewer may not read (§13.1, AC-888). */
export function redactedSeries(
  measure: Measure,
  groupValue: string,
  panelId: string,
  blocked: PermissionKey,
): ReportSeries {
  return {
    id: `${measure.key}#${groupValue}#current`,
    measureKey: measure.key,
    groupValue,
    role: 'current',
    panelId,
    unit: measure.unit,
    currency: measure.currency,
    temporality: measure.temporality,
    points: [],
    partialBucketIndexes: [],
    blocked,
    failed: null,
  }
}

/** A well-formed result with nothing in it, for a configuration the planner would refuse before a run. */
export function emptyModeResult(query: ReportQuery, asOf: string, warnings: ReportWarning[] = []): ReportResult {
  return {
    query,
    asOf,
    buckets: [],
    panels: [],
    series: [],
    truncated: false,
    truncatedAtRows: null,
    warnings,
    foldedGroupCount: null,
  }
}

/** `subjectId → its earliest event`, which is when it entered. */
export function earliestPerSubject(events: readonly SubjectEvent[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held === undefined || event.date < held) out.set(event.subjectId, event.date)
  }
  return out
}

/** `earliestPerSubject`, keeping the whole winning event — `holdConstant` needs its `dimValue`, not only its date. */
export function earliestEventPerSubject(events: readonly SubjectEvent[]): Map<string, SubjectEvent> {
  const out = new Map<string, SubjectEvent>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (!held || event.date < held.date) out.set(event.subjectId, event)
  }
  return out
}

/** `subjectId → its events, ascending`. The input is already sorted (`fetchSubjectEvents`). */
export function groupBySubject(events: readonly SubjectEvent[]): Map<string, SubjectEvent[]> {
  const out = new Map<string, SubjectEvent[]>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held) held.push(event)
    else out.set(event.subjectId, [event])
  }
  return out
}

/** `subjectId → its latest event`, which is the last time it was seen doing that. */
export function latestPerSubject(events: readonly SubjectEvent[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held === undefined || event.date > held) out.set(event.subjectId, event.date)
  }
  return out
}

/** Several `latestPerSubject` maps, OR-combined: each subject keeps the latest date any of them recorded. */
export function mergeLatest(maps: readonly Map<string, IsoDate>[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const m of maps) {
    for (const [id, date] of m) {
      const held = out.get(id)
      if (held === undefined || date > held) out.set(id, date)
    }
  }
  return out
}

/** G10's `{value, unit}` in days; `'week'` scales, `'hour'` rounds to same-day. `null` is the report window. */
export function conversionWindowDays(cw: { value: number; unit: 'hour' | 'day' | 'week' } | null): number | null {
  if (cw === null) return null
  if (cw.unit === 'week') return cw.value * 7
  if (cw.unit === 'hour') return 0
  return cw.value
}

/** `panelIdFor` (`resolveReport.ts`), verbatim — the wire id format, not this file's to invent. */
export function panelIdFor(measureKey: string, groupValue: string | null): string {
  return groupValue === null ? `p:${measureKey}` : `p:${measureKey}:${groupValue}`
}

export type { FilterSpec }
