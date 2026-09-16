/**
 * AC-1262 — the one-shot URL contract every entry point writes and
 * `AnalystView` reads once, then strips: a plain query-param pair mirroring
 * `ReportBuilder`'s `openAlert`. `label` travels with it, needing no refetch.
 */

import type { AgentJobContext } from '@/data/types/agent'

const ASK_KIND_PARAM = 'askKind'
const ASK_ID_PARAM = 'askId'
const ASK_LABEL_PARAM = 'askLabel'

export type AnalystEntryKind = 'report' | 'page' | 'firing'

export interface AnalystEntryContext {
  kind: AnalystEntryKind
  id: string
  label: string
}

function isAnalystEntryKind(value: string): value is AnalystEntryKind {
  return value === 'report' || value === 'page' || value === 'firing'
}

/** The link every entry point writes; always lands on the analyst index. */
export function analystAskUrl(context: AnalystEntryContext): string {
  const params = new URLSearchParams()
  params.set('view', 'analyst')
  params.set(ASK_KIND_PARAM, context.kind)
  params.set(ASK_ID_PARAM, context.id)
  params.set(ASK_LABEL_PARAM, context.label)
  return `/management/reports?${params.toString()}`
}

/** Reads the one-shot context out of a location's search string; `null` when absent or malformed. */
export function readAnalystEntryContext(search: string): AnalystEntryContext | null {
  const params = new URLSearchParams(search)
  const kind = params.get(ASK_KIND_PARAM)
  const id = params.get(ASK_ID_PARAM)
  const label = params.get(ASK_LABEL_PARAM)
  if (!kind || !id || !label || !isAnalystEntryKind(kind)) return null
  return { kind, id, label }
}

/** Strips the three one-shot params from a search string, keeping everything else. */
export function withoutAnalystEntryContext(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(ASK_KIND_PARAM)
  params.delete(ASK_ID_PARAM)
  params.delete(ASK_LABEL_PARAM)
  const next = params.toString()
  return next === '' ? '' : `?${next}`
}

export function toAgentJobContext(entry: AnalystEntryContext): AgentJobContext {
  return { kind: entry.kind, id: entry.id }
}
