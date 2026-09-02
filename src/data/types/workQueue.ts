/**
 * The vocabulary every work queue shares — ownership, SLA, breach.
 *
 * Five sub-tabs across two workspaces are work queues (§5.1, pattern **P8**):
 * Operations › Requests, Trip Assurance, My Work, and Support › Safety &
 * Incidents, Captain Fairness. `Applicant` was the sixth and it landed first,
 * so **its shape is the precedent** and these fields are the generalisation of
 * it rather than a second answer to the same question.
 *
 * What `Applicant` already had, unchanged here: `claim: Claim | null` and
 * `slaDueAt: IsoDateTime | null`.
 *
 * What it did **not** have, and every queue after it needs:
 *
 *   `slaTargetMinutes`  the *denominator*. `slaDueAt` alone says when the clock
 *      runs out but not how long the promise was, so a screen cannot draw a
 *      progress track, cannot say "3 of 48 h used", and cannot show two rows
 *      from different queues on one bar. `Applicant` got away without it
 *      because Q8 left its window undecided — see `slaSource: 'unset'`.
 *   `slaStartedAt`      the numerator's origin. Usually the row's own creation
 *      instant, but not always: a Trip Assurance row's clock starts at the
 *      **confirmation deadline**, not at the moment the leg was scheduled. The
 *      brief's "a queue with no natural start needs `targetMinutes` on the row"
 *      is exactly this case, and both fields carry it.
 *   `slaBreachedAt`     **breach as a stamped state, not a comparison.**
 *   `slaSource`         where the number came from.
 *
 * ## Why breach is a field and not `slaDueAt < now`
 *
 * `slaDueAt < now` conflates two different rows:
 *
 *   a still-open item whose deadline passed — **breached**, someone owes an
 *     explanation;
 *   a disposed item whose deadline passed *after* it was disposed — **merely
 *     old**, and nothing went wrong. Every closed row in the archive is
 *     "overdue" under a naive comparison, which is why the legacy fairness page
 *     guards its own check with `&&c.status==='Open'` (`:15648`) and the
 *     ticket SLA guards with `!obj.resolvedAtMs` (`:14766`).
 *
 * The server stamps `slaBreachedAt` at the instant the promise was broken and
 * never clears it, so "resolved, but late" stays visible after the fact — the
 * number an operations review actually wants. A row that was disposed inside
 * its window keeps `slaBreachedAt: null` forever, however long ago it closed.
 *
 * `slaDueAt === null` means **no clock at all**: no countdown, no track, no
 * breach, tone stays `neutral`. It is not a breach and it is not zero.
 */

import type { Claim, IsoDateTime } from './common'

/**
 * Where an SLA number came from. **On the row, so an invented window cannot
 * hide among measured ones.**
 *
 *   `legacy-policy`       a constant the legacy app enforces in code — the
 *                         3-minute instant-request search (`:9832`), the
 *                         2-hour subscription search window (`:9577`), the
 *                         20-minute backup-offer window (`:18126`).
 *   `legacy-reason-code`  `rcTargets(code).res` — `DB.reasonCodes` carries a
 *                         per-code `fr`/`res` in minutes, falling back to the
 *                         four-tier `DB.slaPolicy` (`:14650`). A real, shipped
 *                         denominator.
 *   `chat-policy`         **DECISIONS.md D22** — a promise the product *ruled*,
 *                         for a queue the legacy app never had. Chat: 45 s
 *                         first response, 20 min resolution. Email and
 *                         WhatsApp: 4 h and 24 h, which are `T4.firstResponseMin`
 *                         and `T2.resolveMin` from the shipped `DB.slaPolicy`
 *                         (`:14650`) reused rather than minted. `phone` makes no
 *                         promise and stays `unset`.
 *
 *                         **It is not `legacy-policy`.** Nothing in the legacy
 *                         app enforces 45 seconds, and a number a ruling
 *                         created must not claim a provenance it does not have
 *                         — that is the entire reason this field exists.
 *   `unset`               **nobody has decided.** `slaTargetMinutes` and
 *                         `slaDueAt` are both `null` and stay null. This is not
 *                         a placeholder to be filled in by whoever ships first;
 *                         it is a product commitment (**Q8**) and the queue
 *                         renders with no countdown until it is made.
 *
 * **Six queues read this union** — applications, requests, safety, fairness,
 * assurance and My Work, which folds all five — plus cash reports and
 * conversations. Every one of them treats it as an opaque provenance label:
 * they expose it as a filter and a facet (`clients/{applicants,assurance,cash,
 * complaints,fairness,myWork,requests,safety}.ts`) and none switches on its
 * members. Adding a member is therefore additive for all of them; only
 * `clients/workQueues.test.ts`, which mirrors the union as a literal list, has
 * to be told.
 */
export type SlaSource = 'legacy-policy' | 'legacy-reason-code' | 'chat-policy' | 'unset'

/**
 * The SLA block every work-queue row carries. Flattened onto the row rather
 * than nested, so each field is independently sortable, filterable and
 * greppable — `filters: [{ field: 'slaDueAt', op: 'lt', ... }]` works without
 * the query engine learning about nested paths.
 */
export interface SlaTracked {
  /** When this row's clock started. `null` when there is no clock. */
  slaStartedAt: IsoDateTime | null
  /** `slaStartedAt + slaTargetMinutes`, resolved server-side. `null` when there is no clock. */
  slaDueAt: IsoDateTime | null
  /** The promise, in minutes. `null` when there is no clock. */
  slaTargetMinutes: number | null
  /**
   * Stamped once, when the promise broke. `null` on a row that is inside its
   * window **and** on a row that was disposed before its deadline — those two
   * are different rows and both are fine.
   */
  slaBreachedAt: IsoDateTime | null
  slaSource: SlaSource

  /* ── the first-response clock ────────────────────────────────────────── */
  /**
   * Two clocks, not one. `DB.slaPolicy` carries a `firstResponseMin` beside a
   * `resolveMin` on every tier (`:14650`), and `slaState` returns `frLeftMs`
   * and `resLeftMs` side by side (`:14766`) because a queue can break its
   * promise to *answer* long before it breaks its promise to *finish*.
   *
   * `null` on every field below when the queue makes no first-response promise
   * — which is most of them. Requests, Trip Assurance and Applications have one
   * clock; Safety and Fairness have two.
   */
  firstResponseDueAt: IsoDateTime | null
  /** When a human first touched it. `null` = nobody has, yet. */
  firstResponseAt: IsoDateTime | null
  /**
   * Stamped only when the window closed with **nobody having responded** —
   * legacy `frBreached` (`:14780`). A late-but-real response leaves this `null`
   * and shows as `firstResponseAt > firstResponseDueAt`, which is legacy's
   * separate `frMissed` flag (`:14781`). Two different failures: one is still
   * happening, the other already stopped.
   */
  firstResponseBreachedAt: IsoDateTime | null
}

/**
 * A row that a human owns and disposes of. Every work-queue type in `src/data`
 * satisfies this, including `Applicant` — asserted in
 * `clients/workQueues.test.ts` so the sixth queue cannot quietly diverge.
 *
 * Not an inheritance hierarchy: each resource declares its own fields as
 * literals for greppability. This is the contract those literals must meet.
 */
export interface WorkQueueRow extends SlaTracked {
  id: string
  /** `null` = unclaimed. Held by another operator is the state §8.4 exists for. */
  claim: Claim | null
}

/**
 * The queue an item belongs to — legacy `QUEUE_LABEL` / `QUEUE_ROUTE`
 * (`:19104`–`:19108`), restated against the D1 route table.
 *
 * `QUEUE_ROUTE` sends five different types to the retired `commitment` page and
 * two more to `support`; under D1 they resolve to the sub-tabs below. The
 * mapping lives in `clients/myWork.ts`, once.
 */
export type WorkQueueId =
  /** Support › Tickets — `DB.tickets`. Wave 3. */
  | 'ticket'
  /** Support › Disputes — `DB.disputes` (`:14392`). Wave 3. */
  | 'dispute'
  /** Support › Captain Fairness — `DB.fairnessCases` (`:15505`). */
  | 'fairness'
  /** Support › Safety & Incidents — `DB.incidents` (`:13389`). */
  | 'incident'
  /** Operations › People, view Applications — `DB.pendingDrivers` (`:2712`). */
  | 'application'
  /** Operations › Requests — `DB.rideRequests` + `DB.subscriptionRequests` (`:2786`, `:2794`). */
  | 'request'
  /** Operations › Trip Assurance, the upcoming legs — `DB.upcomingSubTrips` (`:6177`). */
  | 'assurance'
  /** Operations › Trip Assurance, view Absences — `DB.absenceEvents` (`:16564`). */
  | 'absence'
  /** Admin › Data & Integrity — `DB.erasureRequests`. Wave 3. */
  | 'erasure'

/**
 * Legacy `wi(...).severity` (`:19110`) — `critical` / `high` / `normal`.
 *
 * **Severity is not urgency and does not order the queue.** The legacy inbox
 * sorts on the deadline and says why: *"a 'critical' incident with four hours
 * left is less urgent than a High ticket breaching in ninety seconds"*
 * (`:19075`). Severity is what the item *is*; the SLA is when it is *due*.
 */
export type WorkItemSeverity = 'critical' | 'high' | 'normal'
