/**
 * **Support › Contact Centre** — the route's entry point, and nothing else.
 *
 * `routes.tsx` mounts `ContactCentreScreen` for `support-contact-centre` **and
 * for its level-3 route** `/support/contact-centre/:conversationId`
 * (`detail.kind === 'conversation'`), and that file has a single owner
 * (`PHASE-PLAN.md`), so the name stays and the screen moves. One component
 * answers on both addresses and never draws both modes at once (§9.4). Everything the console is now lives in
 * `screens/support/conversations/`, because **D19** turns this sub-tab into two
 * existing §6.4 rows composed — a **work queue (§8.4)** and a **two-column
 * detail (§2.2, §3.8)** — and neither of them is "a contact roster".
 *
 * ## What used to be in this file
 *
 * 302 lines with **no `useAsync`, no client and none of the four states**. Three
 * cards, all three reading module constants:
 *
 *   - `INITIAL_AGENTS` (`:32`) — three operators with hand-written CSAT scores
 *     and average handle times. **D19: superseded by `AgentPresence` over the
 *     realtime seam.** Deleted.
 *   - `CPT_METRICS` (`:62`) — four reason codes with hand-written volumes,
 *     targets and SLA percentages, and a "root cause owner" free-text column.
 *     **D19: superseded.** Deleted. There is no store behind a single one of
 *     those numbers, and a metric with no store is a number an operator quotes
 *     in a review.
 *   - a `useState` literal for the call log (`:105`), appended to by
 *     `handleCallComplete` (`:128`). Deleted: `phone` conversations are real
 *     rows over `clients/conversations.ts` and `CNV-106` is the seeded one.
 *
 * `CallConsoleModal` went with them. It defaulted its caller to the string
 * `'Sara Al-Otaibi (+966 54 111 2233)'`, ran a `setInterval` against an `any`,
 * and its only act was pushing a row into component state. **D19 rules `phone`
 * read-only in v1**, so there was nothing left for it to do — and call
 * *logging* already has a real home with a real client operation, `logTicketCall`
 * on Support › Tickets.
 *
 * The route row's `hasBacklog: true` is now honest: the console counts waiting
 * conversations and first-response breaches, both from the seam.
 */

import type { SubTabRoute } from '@/data/types'
import { ConversationConsoleScreen } from '@/screens/support/conversations'

export function ContactCentreScreen({ row }: { row: SubTabRoute }) {
  return <ConversationConsoleScreen row={row} />
}
