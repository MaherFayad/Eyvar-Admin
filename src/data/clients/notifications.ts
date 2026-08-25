/**
 * Notification centre client — foundation spec §4.3.2, §8.3.
 *
 * Two sizes off one resource: the bell popover is the top 8 by priority, the
 * shell layer is the full list with filters. One endpoint, one sort, two page
 * sizes — not two datasets that can disagree.
 */

import { DATA_SOURCE } from '../config'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import { notificationFixtures, notificationFixturesAllRead } from '../fixtures/notifications'
import type { Paginated, QueryParams } from '../types/common'
import {
  NOTIFICATION_PREVIEW_SIZE,
  NOTIFICATION_PRIORITY_RANK,
  type Notification,
  type NotificationFilter,
  type NotificationSummary,
} from '../types/notifications'
import { http } from './http'

export const NOTIFICATION_OPERATIONS = {
  list: 'notifications.list',
  preview: 'notifications.preview',
  summary: 'notifications.summary',
  markRead: 'notifications.markRead',
  markAllRead: 'notifications.markAllRead',
} as const

/** Mutable copy so `markRead` is observable in the mock. Reset by `resetNotifications()`. */
let rows: Notification[] = notificationFixtures.map((n) => ({ ...n }))

export interface NotificationQuery extends QueryParams {
  filter?: NotificationFilter
}

/**
 * GET /api/v1/notifications
 *   params: filter=all|unread|<type> · page · pageSize
 *   -> Paginated<Notification>
 *
 * **Sorted priority-first, then newest-first within a tier** — never recency
 * alone (`:2175`–`:2187`). §4.3.2: "That design is right and must survive the
 * move." The sort belongs to the server so the popover and the layer agree.
 */
export async function listNotifications(
  params: NotificationQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Notification>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Notification>>('/notifications', { ...params, signal }, { signal })
  }
  return mock(NOTIFICATION_OPERATIONS.list, signal, () => paginate(sorted(filtered(rows, params.filter)), params))
}

/**
 * GET /api/v1/notifications?pageSize=8
 *   -> Paginated<Notification>
 *
 * The bell popover preview. Same endpoint, capped page size (`NOTIF_PANEL_PREVIEW = 8`, `:2197`).
 */
export async function previewNotifications(signal?: AbortSignal): Promise<Notification[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<Paginated<Notification>>(
      '/notifications',
      { pageSize: NOTIFICATION_PREVIEW_SIZE },
      { signal },
    )
    return res.items
  }
  return mock(NOTIFICATION_OPERATIONS.preview, signal, () => sorted(rows).slice(0, NOTIFICATION_PREVIEW_SIZE))
}

/**
 * GET /api/v1/notifications/summary
 *   -> NotificationSummary
 *
 * The bell badge. Separate from the list because the badge is polled and the
 * list is not. **Zero renders no badge** (§8.3 `notif-unread-zero`) — that is a
 * UI rule, but the client must return `0` rather than omitting the field, or
 * "unknown" and "none" become the same thing.
 */
export async function getNotificationSummary(signal?: AbortSignal): Promise<NotificationSummary> {
  if (DATA_SOURCE === 'http') {
    return http.get<NotificationSummary>('/notifications/summary', undefined, { signal })
  }
  return mock(NOTIFICATION_OPERATIONS.summary, signal, () => ({
    unread: rows.filter((n) => !n.read).length,
    total: rows.length,
  }))
}

/**
 * POST /api/v1/notifications/:id/read
 *   -> Notification
 *
 * Legacy loses every read flag on reload — the badge returns to 3 every time
 * (§4.3.2, third defect). The endpoint exists so it does not.
 */
export async function markNotificationRead(id: string, signal?: AbortSignal): Promise<Notification> {
  if (DATA_SOURCE === 'http') return http.post<Notification>(`/notifications/${id}/read`, undefined, { signal })
  return mockMutation(NOTIFICATION_OPERATIONS.markRead, signal, () => {
    const row = rows.find((n) => n.id === id)
    if (!row) throw notFound('notification', id)
    row.read = true
    return { ...row }
  })
}

/**
 * POST /api/v1/notifications/read-all
 *   -> NotificationSummary
 */
export async function markAllNotificationsRead(signal?: AbortSignal): Promise<NotificationSummary> {
  if (DATA_SOURCE === 'http') {
    return http.post<NotificationSummary>('/notifications/read-all', undefined, { signal })
  }
  return mockMutation(NOTIFICATION_OPERATIONS.markAllRead, signal, () => {
    rows = rows.map((n) => ({ ...n, read: true }))
    return { unread: 0, total: rows.length }
  })
}

/* ─────────────────────────── QA affordances ────────────────────────────── */

/** Serve the all-read set, so the `notif-unread-zero` state is one call away. */
export function useAllReadNotifications(): void {
  rows = notificationFixturesAllRead.map((n) => ({ ...n }))
}

/** Serve zero notifications — the empty state of the shell layer, distinct from all-read. */
export function useNoNotifications(): void {
  rows = []
}

export function resetNotifications(): void {
  rows = notificationFixtures.map((n) => ({ ...n }))
}

/* ─────────────────────────────── helpers ───────────────────────────────── */

function filtered(all: Notification[], filter: NotificationFilter = 'all'): Notification[] {
  if (filter === 'all') return all
  if (filter === 'unread') return all.filter((n) => !n.read)
  return all.filter((n) => n.type === filter)
}

function sorted(all: Notification[]): Notification[] {
  return [...all].sort((a, b) => {
    const byPriority = NOTIFICATION_PRIORITY_RANK[a.priority] - NOTIFICATION_PRIORITY_RANK[b.priority]
    if (byPriority !== 0) return byPriority
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}
