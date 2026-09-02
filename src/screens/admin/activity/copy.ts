/**
 * Admin › Activity — the audit trail, plus the bulk bar added by **P4-T1**.
 *
 * ## The set rule, stated once, here, because the copy is the rule
 *
 * *"A bulk command is refused if **any** selected record would be refused, and
 * the refusal names the count."* There is no partial application: the bar does
 * not export nine of twelve and stay quiet about three. `admin.activity.bulk.
 * export.refused` is the sentence that carries the count, and it renders as
 * real text above the bar — never a tooltip (§8.4.4).
 */

import type { Dictionary } from '@/lib'

export const ADMIN_ACTIVITY_EN: Dictionary = {
  'admin.activity.meta': 'Append-only. Every mutating action, with the operator who took it.',
  'admin.activity.search': 'Search by operator, action or target',

  'admin.activity.column.event': 'Event',
  'admin.activity.column.operator': 'Operator',
  'admin.activity.column.action': 'Action',
  'admin.activity.column.detail': 'What happened',
  'admin.activity.column.note': 'Note',
  'admin.activity.column.target': 'Target',
  'admin.activity.column.amount': 'Amount',
  'admin.activity.column.reason': 'Reason code',
  'admin.activity.column.time': 'When',

  'admin.activity.empty.heading': 'The record of who did what, and when',
  'admin.activity.empty.body':
    'The log is append-only and starts empty. The first payout, suspension or settings change writes the first line.',
  'admin.activity.noMatch': 'No entries match that query.',
  'admin.activity.error': 'The activity log could not be loaded.',

  /* ── the bulk bar (P4-T1) ───────────────────────────────────────────── */
  'admin.activity.bulk.export': 'Export selected',
  'admin.activity.bulk.copyIds': 'Copy event IDs',
  /**
   * **D21 — three sentences, not two, and which one appears changes what the
   * operator does next.**
   *
   * `.other` names the count as a fraction of the selection — *"3 of 12"* —
   * because *"3 entries cannot be exported"* leaves the operator to work out
   * whether deselecting three fixes it. `.all` exists because `.other` is
   * *true* of 3-of-3 and would invite them to believe a subset works; in that
   * case there is nothing to narrow to and no `Select only…` control renders.
   */
  'admin.activity.bulk.export.refused.one':
    'That entry records a money movement, and you cannot read financials. Ask an Owner for the “Financials access” permission.',
  'admin.activity.bulk.export.refused.other':
    '{blocked} of {total} selected entries record a money movement, and you cannot read financials. Ask an Owner for the “Financials access” permission.',
  'admin.activity.bulk.export.refused.all':
    'All {count} selected entries record a money movement, and you cannot read financials. Ask an Owner for the “Financials access” permission.',
  'admin.activity.bulk.exported': 'Exported {count} entries',
  'admin.activity.bulk.copied': 'Copied {count} event IDs',
}
