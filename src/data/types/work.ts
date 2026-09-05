/**
 * Work item — Operations › My Work, three views (`mine`, `unassigned`,
 * `everything`).
 *
 * Derived from `inboxItems()` (`eyvar_ops_panel_v40_fixed.html:19119`),
 * `wi()` (`:19110`), `inboxFiltered()` (`:19206`) and `WORK_ROUTING`
 * (`:19088`).
 *
 * ## This resource has no fixture, on purpose
 *
 * My Work is a **routing layer over the other queues**, not a queue of its own:
 * *"The queues stay. They are the right place to work a domain in depth. The
 * inbox is a routing layer over them, not a replacement"* (`:19070`). Legacy
 * builds it by walking twelve collections at render time and normalising each
 * one through `wi()`.
 *
 * `clients/myWork.ts` does the same thing over the fixtures. There is no
 * `fixtures/work.ts`, and there must not be: a second, independently-seeded
 * copy of the same rows is how My Work ends up showing a breach that the queue
 * it links to says is resolved. If a row appears here it is because it appears
 * there, and `clients/workQueues.test.ts` asserts the two agree.
 *
 * ## Three rules the legacy inbox got right, restated as data
 *
 *   1. **Sort by deadline, not by severity label.** *"A 'critical' incident
 *      with four hours left is less urgent than a High ticket breaching in
 *      ninety seconds"* (`:19074`). So `dueAt` is the sort key and `severity`
 *      is descriptive.
 *   2. **Breached first, undated last.** An item with no clock sorts to the
 *      bottom, not the top: *"it has no clock, so it cannot be more urgent than
 *      something that has one"* (`:19212`). `dueAt: null` is last, not first.
 *   3. **Route by role, never hide.** Role routing is a default view, not a
 *      permission — *"a queue an operator cannot see is a queue nobody owns at
 *      02:00"* (`:19080`). `routedToMyRole` is a field the operator can filter
 *      off; it is not an omission.
 */

import type { Claim, IsoDateTime } from './common'
import type { RoleName } from './session'
import type { SlaTracked, WorkItemSeverity, WorkQueueId } from './workQueue'

/**
 * One value a `titleKey` or `subtitleKey` interpolates.
 *
 * A `string` or `number` is a **fact** off the record: a name, an id, a place,
 * a count. A `{ key }` is an **enum member** whose words another screen already
 * owns, resolved by the screen with `t` (X2). The data layer never calls `t`.
 */
export type WorkItemParam = string | number | { readonly key: string }

export type WorkItemParams = Readonly<Record<string, WorkItemParam>>

/**
 * One row of somebody's day, from whichever queue it came from.
 *
 * Deliberately **narrow**: title, subtitle, when it is due, who holds it, where
 * to act. Everything domain-specific stays in the domain client. An inbox that
 * accumulates one optional field per source queue stops being an inbox.
 */
export interface WorkItem extends SlaTracked {
  /** `<queue>:<id>` — legacy `ckey()` (`:18858`). Stable across the union, unlike `id` alone. */
  key: string
  queue: WorkQueueId
  /** The id **in the source queue**. `INC-014`, `REQ-503`, `FC-0001`. Not unique across queues. */
  id: string

  /**
   * One line, as a **key plus its values** and never a sentence (X2, T4.1).
   * Legacy assembled `c.kind+' — '+nm2(c.driverId)` (`:19141`); a projection
   * that builds English cannot be read in Arabic, so the screen calls `t`.
   */
  titleKey: string
  titleParams: WorkItemParams
  /**
   * The supporting line: who it is about, which plan, which reason code.
   * `null` when there is nothing to add.
   */
  subtitleKey: string | null
  subtitleParams: WorkItemParams

  /**
   * `slaDueAt` restated under the name the inbox sorts on. Identical value;
   * kept as its own field because a screen that sorts a *union* should not have
   * to know that one queue calls its clock an SLA and another calls it an offer
   * window.
   */
  dueAt: IsoDateTime | null
  /**
   * `true` when this item's promise is broken **now**. Distinct from
   * `slaBreachedAt !== null` only in one case: a queue whose breach is a status
   * rather than a stamp. Both are set together by the client, so a screen may
   * read either; `breached` is the cheap one.
   */
  breached: boolean

  severity: WorkItemSeverity

  /** The entity the row is about, for the `?entity=` overlay. `null` on a system item. */
  entityId: string | null
  entityType: string | null

  /**
   * Where to go to act on it, in the **new** route table.
   *
   * Legacy stores an executable string — `action:"go('safety',null)"`,
   * `action:"openTicketDetail('TKT-503')"` (`:19129`) — which is a code
   * injection surface and unroutable under D1. A path here.
   */
  route: string

  /**
   * Whether this queue is routed to the current session's role — `WORK_ROUTING`
   * (`:19088`). A *default*, not a permission: the `everything` view shows the
   * rest, and §11.2 decides what a role may actually open.
   */
  routedToMyRole: boolean

  claim: Claim | null
}

/**
 * Which roles are accountable for which queue — `WORK_ROUTING` (`:19088`),
 * verbatim, minus the three queues that no longer exist under D1.
 *
 * *"Kept in one table so the routing is arguable in a meeting rather than
 * buried in code"* (`:19086`). Still true, still one table.
 *
 * **`Ops Manager` is not in the legacy table and every legacy row lists
 * `Operations`.** `RoleName` has no `Operations` — the five seeded operators
 * are `Owner`, `Finance`, `Support`, `Ops Manager` ×2 (`DB.teamUsers`,
 * `:2830`). So `Operations` maps to `Ops Manager`; the legacy routing table
 * names a role that does not exist on any user, which means **role routing has
 * never actually matched an Operations row for any seeded operator except the
 * Owner.** Recorded as a finding, corrected here.
 */
export const WORK_ROUTING: Record<WorkQueueId, readonly RoleName[]> = {
  ticket: ['Support', 'Ops Manager', 'Owner'],
  dispute: ['Support', 'Finance', 'Owner'],
  fairness: ['Ops Manager', 'Owner'],
  incident: ['Ops Manager', 'Owner', 'Support'],
  application: ['Ops Manager', 'Owner'],
  request: ['Ops Manager', 'Owner'],
  assurance: ['Ops Manager', 'Owner'],
  absence: ['Ops Manager', 'Owner'],
  erasure: ['Owner', 'Ops Manager'],
}

/**
 * Where each queue's rows live under D1 — the replacement for `QUEUE_ROUTE`
 * (`:19107`), which sent five different types to the retired `commitment` page.
 *
 * `:id` is substituted by the client. A route with no `:id` opens the queue's
 * index at the view that contains the row.
 */
export const WORK_QUEUE_ROUTE: Record<WorkQueueId, string> = {
  ticket: '/support/tickets/:id',
  dispute: '/support/disputes',
  fairness: '/support/fairness',
  incident: '/support/safety?view=open',
  application: '/operations/people/applications/:id',
  /* The DEFAULT for the queue. A request's channel decides which of the two
     sub-tabs holds it, and `WORK_REQUEST_ROUTE` below is where that is made:
     each sub-tab pins its own channel, so a subscription request opened here
     landed on a queue that cannot contain it (AC-281). */
  request: '/operations/ride-requests',
  assurance: '/operations/assurance?view=departing-24h',
  absence: '/operations/assurance?view=absences',
  erasure: '/admin/data',
}

/**
 * The two sub-tabs the `request` queue is split across — `RequestsScreen` pins
 * `channel` per route, so the row has to be sent to the one that holds it.
 */
export const WORK_REQUEST_ROUTE: Readonly<Record<'instant' | 'subscription', string>> = {
  instant: '/operations/ride-requests',
  subscription: '/operations/subscription-requests',
}
