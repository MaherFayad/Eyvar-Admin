/**
 * Firing delivery — 04-alerting-v2.md §3's order: an `alert_firings` row (the
 * caller's job, before this runs), then one `notifications` row per in-app
 * recipient, then email per `email` channel user, then Slack per webhook.
 * AC-1283: one `alert_deliveries` row per recipient per channel attempt,
 * AC-1284: a failed Slack post is recorded `failed` and never thrown — this
 * function never rejects on a delivery failure, only on a programming error.
 *
 * D43: `dropRecipients` (`src/data/reporting/alerts/machine.ts`) is the one
 * reader of "does this recipient still hold the measure's permission" — not
 * reimplemented here.
 */
import type { AlertChannel, AlertSeverity } from '@/data/types/alert'
import type { NotificationPriority } from '@/data/types/notifications'
import { dropRecipients, type RecipientPermission } from '@/data/reporting/alerts/machine'
import type { Database } from './db'
import type { EmailAdapter } from './email'
import type { SecretsAdapter } from './secrets'
import { holdsPermission, loadOperatorPermissions } from './permissions'
import type { PermissionKey } from '@/data/types/navigation'
import type { IsoDateTime } from '@/data/types/common'

export interface SlackAdapter {
  post(url: string, payload: unknown): Promise<void>
}

/** The real implementation: an incoming-webhook POST. A non-2xx response is a failure (recorded, never thrown past this file). */
export class FetchSlackAdapter implements SlackAdapter {
  async post(url: string, payload: unknown): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Slack webhook responded ${res.status}`)
  }
}

export function createSlackAdapterFromEnv(): SlackAdapter {
  return new FetchSlackAdapter()
}

function notificationPriorityOf(severity: AlertSeverity): NotificationPriority {
  return severity === 'critical' ? 'critical' : 'high'
}

async function recordDelivery(
  db: Database,
  firingId: string,
  channelType: AlertChannel['type'],
  target: string | null,
  status: 'sent' | 'failed' | 'muted',
  error: string | null,
  at: IsoDateTime,
): Promise<void> {
  await db.sql`
    INSERT INTO alert_deliveries (firing_id, channel_type, target, status, error, at)
    VALUES (${firingId}, ${channelType}, ${target}, ${status}, ${error}, ${at})
  `
}

function errorMessageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function checkRecipients(
  db: Database,
  ids: readonly string[],
  measurePermissionKey: PermissionKey | null,
): Promise<{ keptIds: string[]; droppedIds: string[] }> {
  const unique = [...new Set(ids)]
  const checked: RecipientPermission[] = await Promise.all(
    unique.map(async (id) => ({ id, hasPermission: holdsPermission(await loadOperatorPermissions(db, id), measurePermissionKey) })),
  )
  const { keptIds, droppedIds } = dropRecipients(checked)
  return { keptIds, droppedIds }
}

export interface DeliverFiringRule {
  id: string
  name: string
  ownerId: string
  recipientIds: readonly string[]
  channels: readonly AlertChannel[]
  severity: AlertSeverity
}

export interface DeliverFiringOptions {
  db: Database
  email: EmailAdapter
  slack: SlackAdapter
  secrets: SecretsAdapter
  rule: DeliverFiringRule
  firingId: string
  /** `mutedUntil` in effect at evaluation time — §7 state 26: firings are recorded, deliveries are suppressed and marked `muted`, never sent. */
  muted: boolean
  now: IsoDateTime
  /** The rule's measure permission — `null` when the measure is ungated (D4). */
  measurePermissionKey: PermissionKey | null
  /** `reportQueryPath(savedReport.query)` — the report at the evaluated window; `null` when the report could not be resolved for a route. */
  route: string | null
}

export interface DeliverFiringResult {
  sent: number
  failed: number
  muted: number
  droppedRecipientIds: string[]
}

export async function deliverFiring(opts: DeliverFiringOptions): Promise<DeliverFiringResult> {
  const { db, email, slack, secrets, rule, firingId, muted, now, measurePermissionKey, route } = opts
  let sent = 0
  let failed = 0
  let mutedCount = 0
  const dropped = new Set<string>()

  for (const channel of rule.channels) {
    if (channel.type === 'in-app') {
      const { keptIds, droppedIds } = await checkRecipients(db, rule.recipientIds, measurePermissionKey)
      droppedIds.forEach((id) => dropped.add(id))
      for (const userId of keptIds) {
        if (muted) {
          await recordDelivery(db, firingId, 'in-app', userId, 'muted', null, now)
          mutedCount += 1
          continue
        }
        await db.sql`
          INSERT INTO notifications (user_id, type, priority, title, body, created_at, route, entity_id, entity_type)
          VALUES (${userId}, 'alert', ${notificationPriorityOf(rule.severity)}, ${rule.name}, ${'An alert rule fired.'}, ${now}, ${route}, ${rule.id}, 'alert_rule')
        `
        await recordDelivery(db, firingId, 'in-app', userId, 'sent', null, now)
        sent += 1
      }
    } else if (channel.type === 'email') {
      const { keptIds, droppedIds } = await checkRecipients(db, channel.userIds, measurePermissionKey)
      droppedIds.forEach((id) => dropped.add(id))
      for (const userId of keptIds) {
        if (muted) {
          await recordDelivery(db, firingId, 'email', userId, 'muted', null, now)
          mutedCount += 1
          continue
        }
        const rows = await db.sql<{ email: string }>`SELECT email FROM users WHERE id = ${userId}`
        const to = rows[0]?.email
        if (!to) {
          await recordDelivery(db, firingId, 'email', userId, 'failed', 'recipient has no email on file', now)
          failed += 1
          continue
        }
        try {
          await email.send({ to, subject: `Eyvar alert: ${rule.name}`, html: `<p><strong>${rule.name}</strong> fired.</p>` })
          await recordDelivery(db, firingId, 'email', userId, 'sent', null, now)
          sent += 1
        } catch (err) {
          await recordDelivery(db, firingId, 'email', userId, 'failed', errorMessageOf(err), now)
          failed += 1
        }
      }
    } else {
      // slack — one delivery per webhook, not per recipient (there is no per-person Slack identity here).
      if (muted) {
        await recordDelivery(db, firingId, 'slack', channel.webhookId, 'muted', null, now)
        mutedCount += 1
        continue
      }
      const rows = await db.sql<{ url_encrypted: string }>`SELECT url_encrypted FROM webhooks WHERE id = ${channel.webhookId}`
      const encrypted = rows[0]?.url_encrypted
      if (!encrypted) {
        await recordDelivery(db, firingId, 'slack', channel.webhookId, 'failed', 'webhook not found', now)
        failed += 1
        continue
      }
      try {
        const url = secrets.decrypt(encrypted)
        await slack.post(url, { text: `*${rule.name}* fired.` })
        await recordDelivery(db, firingId, 'slack', channel.webhookId, 'sent', null, now)
        sent += 1
      } catch (err) {
        // AC-1284: recorded, never thrown — a Slack failure does not fail the cron.
        await recordDelivery(db, firingId, 'slack', channel.webhookId, 'failed', errorMessageOf(err), now)
        failed += 1
      }
    }
  }

  if (dropped.size > 0) {
    await db.sql`
      INSERT INTO notifications (user_id, type, priority, title, body, created_at, route, entity_id, entity_type)
      VALUES (
        ${rule.ownerId}, 'warning', 'medium', 'A recipient was dropped from an alert',
        ${`${[...dropped].join(', ')} no longer holds the permission "${rule.name}" needs and was not notified.`},
        ${now}, NULL, ${rule.id}, 'alert_rule'
      )
    `
  }

  return { sent, failed, muted: mutedCount, droppedRecipientIds: [...dropped] }
}
