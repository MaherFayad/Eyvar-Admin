/**
 * Writes to `audit_log` (`0001_analytics.sql`) — WP-6.2c / F-V2-22: every
 * client-side `writeAudit`/`appendAudit` call runs and refuses correctly but
 * records nothing server-side, so Activity Log playback would be empty. This
 * is the one write path every mutating handler that changes team, rbac,
 * saved-report, page, segment, annotation, alert or webhook config calls.
 *
 * `action`/`acting_via`/`entity_type` are open vocabularies by the table's
 * own design (`0001_analytics.sql`'s comment: "a closed type would need
 * revisiting on each one") — this module does **not** reuse the frontend's
 * `AuditAction` union (`src/data/types/audit.ts`). That type is a closed
 * union for a different, wider audit surface (money movements, tickets,
 * workspace) with no table in this migration set; conflating the two would
 * either force analytics-v2 actions into a vocabulary that does not name
 * them, or require editing a `src/` file this WP does not own. Where a name
 * already exists there in the same sense (`team.invite`, `team.suspend`,
 * `role.create`, …) this module reuses it verbatim for a reader's sake; new
 * actions this table needs and that union does not have follow the same
 * `entity.verb` shape.
 */
import type { Database } from './db'

export interface AuditWrite {
  /** The operator whose action this is — usually `ctx.operator.userId`. */
  userId: string
  /** `'operator'` (a signed-in operator acting directly) unless stated otherwise — mirrors `agent.ts`'s own `actingVia` resolution for the analyst runner. */
  actingVia?: string
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
