/**
 * The audit log every money-moving action writes to (AC-437).
 *
 * It is a client rather than a helper because AC-437 is only checkable if the
 * log is *readable*: *"a test that performs each in turn observes one new audit
 * entry per action"*. `appendAudit` is internal to `src/data` — a component
 * never writes an audit entry, because a component that can choose not to write
 * one is a component that will forget.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock } from '../mock/delay'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'
import type { Paginated } from '../types/common'
import type { AuditAction, AuditEntry } from '../types/audit'
import { http } from './http'

export const AUDIT_OPERATIONS = { list: 'audit.list' } as const

/**
 * Session-only. Empty at boot on purpose: AC-437 counts the *delta* around one
 * action, and a seeded backlog makes "one new entry" a subtraction rather than
 * an observation.
 */
let entries: AuditEntry[] = []
let sequence = 0

export function resetAudit(): void {
  entries = []
  sequence = 0
}

/** Internal. Called by every mutation in `src/data/clients/`, never by a screen. */
export function appendAudit(input: {
  action: AuditAction
  subjectType: string
  subjectId: string
  amountHalalas: number | null
  reasonCode: string | null
  note: string | null
  detail: AuditEntry['detail']
  /** Defaults to the acting session user. */
  actorId?: string
}): AuditEntry {
  const actorId = input.actorId ?? CURRENT_USER_ID
  const actor = teamUserFixtures.find((u) => u.id === actorId)
  sequence += 1
  const entry: AuditEntry = {
    id: `AUD-${String(sequence).padStart(5, '0')}`,
    at: EYVAR_NOW,
    action: input.action,
    actorId,
    actorName: actor?.name ?? actorId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    amountHalalas: input.amountHalalas,
    reasonCode: input.reasonCode,
    note: input.note,
    detail: input.detail,
  }
  entries = [...entries, entry]
  return entry
}

/**
 * GET /api/v1/audit
 *   params: subjectType · subjectId · action · page · pageSize
 *   -> Paginated<AuditEntry>, newest-first
 */
export async function listAuditEntries(
  params: {
    subjectType?: string
    subjectId?: string
    action?: AuditAction
    page?: number
    pageSize?: number
    signal?: AbortSignal
  } = {},
): Promise<Paginated<AuditEntry>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AuditEntry>>('/audit', { ...params, signal: undefined }, { signal: params.signal })
  }
  return mock(AUDIT_OPERATIONS.list, params.signal, () => {
    const rows = entries
      .filter((e) => !params.subjectType || e.subjectType === params.subjectType)
      .filter((e) => !params.subjectId || e.subjectId === params.subjectId)
      .filter((e) => !params.action || e.action === params.action)
      .slice()
      .reverse()
    const pageSize = params.pageSize ?? 25
    const page = params.page ?? 1
    const start = (page - 1) * pageSize
    return {
      items: rows.slice(start, start + pageSize),
      page,
      pageSize,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    }
  })
}

/** How many entries the log holds right now. The cheapest form of AC-437's assertion. */
export function auditLogSize(): number {
  return entries.length
}
