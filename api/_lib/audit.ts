/**
 * Writes to `audit_log` (`0001_analytics.sql`) — F-V2-22. Every mutating
 * handler that changes team, rbac, saved-report, page, segment, annotation,
 * alert or webhook config calls this, the one server-side write path.
 */
import type { Database } from './db'

export interface AuditWrite {
  /** The operator whose action this is — usually `ctx.operator.userId`. */
  userId: string
  /** `'operator'` (a signed-in operator acting directly) unless stated otherwise — mirrors `agent.ts`'s own `actingVia` resolution for the analyst runner. */
  actingVia?: string
  /** Open vocabulary by design (`0001_analytics.sql`): not the frontend's closed `AuditAction` union, which covers a different, wider surface. Existing names (`team.invite`, …) are reused verbatim; new ones follow `entity.verb`. */
  action: string
  entityType: string
  entityId: string
  /** Freeform, JSON-serialisable detail — never a secret, a password hash, or a decrypted webhook URL. */
  summary?: Record<string, unknown>
}

/** Fire-and-forget from the caller's point of view, but always awaited: a write that silently failed is worse than one that never ran. */
export async function recordAudit(db: Database, write: AuditWrite): Promise<void> {
  await db.sql`
    INSERT INTO audit_log (user_id, acting_via, action, entity_type, entity_id, summary_json)
    VALUES (${write.userId}, ${write.actingVia ?? 'operator'}, ${write.action}, ${write.entityType}, ${write.entityId}, ${JSON.stringify(write.summary ?? {})})
  `
}
