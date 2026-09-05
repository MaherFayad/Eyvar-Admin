/**
 * **D22's breach asymmetry, as one pure function.**
 *
 * `DECISIONS.md` **D22** sets the two promises `types/conversation.ts` left open
 * (*"Open question for the owner: what is the first-response promise on a chat
 * with no ticket behind it?"*) and rules what each kind of breach does. **The
 * numbers themselves are no longer here** — they are stamped on the rows by
 * `fixtures/conversations.ts`, which is where D22 put them:
 *
 * | Channel | First response | Resolution | `slaSource` |
 * |---|---|---|---|
 * | `chat`, no ticket | 45 s | 20 min | `chat-policy` |
 * | `email` / `whatsapp`, no ticket | 4 h | 24 h | `chat-policy` |
 * | `phone` | none | none | `unset` — a call makes no promise |
 * | any channel, **with a ticket** | the ticket's reason-code target | ditto | `legacy-reason-code` |
 *
 * That table documents what the DATA carries. This file reads the row and
 * switches on no channel at all.
 *
 * ## The asymmetry, which is the part most likely to be flattened
 *
 * > **A first-response breach reorders the queue. A resolution breach does
 * > not.**
 *
 * Two separate booleans come out of here, and they are consumed in two separate
 * places, on purpose:
 *
 *   - `firstResponseBreached` is the **only** input to `compareForQueue` and the
 *     **only** thing the breach banner counts. It carries the R5a leading-edge
 *     marker.
 *   - `resolutionBreached` is read by the conversation pane and by nothing else.
 *     It raises `Create ticket` to the primary action (**AC-964**) and it
 *     **does not move the row and does not appear in any count**. D22: *"a chat
 *     that has run twenty minutes is not a chat; it is a ticket"* — the twenty
 *     minutes is a conversion prompt, not an escalation, because
 *     `breachEscalateTo` has no recipient and D19 ruled routing out of v1.
 *
 * There is deliberately no single `breached` boolean on `ConversationSla`. One
 * flag is how the two halves get collapsed by the next person to touch this.
 *
 * ## What this file used to do, and why it stopped
 *
 * It shipped with a second branch that applied D22's channel table to
 * `createdAt`, because `SlaSource` had no `'chat-policy'` member and ten of the
 * twelve seeded conversations carried `slaSource: 'unset'` with null clocks. It
 * was written as *"a stand-in for fixture data, not a second source of truth"*,
 * with the promise that the moment the fixtures landed it would stop executing
 * without anybody editing a screen.
 *
 * **The fixtures landed and it did.** The branch is deleted rather than kept:
 * plausible-looking code that nothing exercises is a second opinion waiting to
 * disagree with the first, and the whole point of writing the fallback that way
 * was so that retiring it would cost one deletion.
 *
 * ## The stamp
 *
 * `types/workQueue.ts` is emphatic that *"breach is a stamp, never `slaDueAt <
 * now`"*, and both breach booleans below read the stamp. A naive comparison
 * would call every closed row in the archive overdue — and with 55 seeded
 * conversations, twenty of them closed, that is most of the store.
 */

import type { Conversation, IsoDateTime, SlaSource } from '@/data/types'
import { queueClock, type QueueClockInput, type QueueClockResult } from '@/screens/queues'

/* ──────────────────────── D22 · where the numbers live now ───────────── */

/**
 * **They are in the data, and this file no longer carries a copy of them.**
 *
 * `SlaSource` gained `'chat-policy'` and `fixtures/conversations.ts` now stamps
 * `slaStartedAt`, `slaDueAt`, `slaTargetMinutes`, `firstResponseDueAt` and the
 * two breach instants on every non-`phone` row — which is exactly the work D22
 * assigned to mock-data-engineer. So the channel table this module used to hold
 * (45 s / 20 min for chat, 4 h / 24 h for email and WhatsApp, nothing for a
 * call) is **retired rather than kept as a second opinion**: two places holding
 * one promise is two answers the first time either moves.
 *
 * That is the outcome the interim was written for. Its own note said *"the
 * moment the fixtures carry `slaSource: 'chat-policy'` … branch 1 claims every
 * row and branch 2 stops executing without anybody editing a screen"* — and it
 * did, so the dead branch is deleted rather than left as plausible-looking code
 * nothing exercises.
 *
 * Verified across all 55 seeded conversations: every `chat`, `email` and
 * `whatsapp` row carries `chat-policy` or `legacy-reason-code`, and the only
 * `unset` rows are the nine `phone` ones — whose clocks are `null` because
 * **a call makes no promise** (**AC-966**), which is a different fact from an
 * unknown one.
 */
export type ConversationSlaSource = SlaSource

/* ─────────────────────────── what comes out ────────────────────────────── */

export interface ConversationSla {
  /**
   * The promise to *answer*. `null` where the channel makes none (`phone`) or
   * where both clocks are paused (`snoozed`).
   */
  firstResponse: QueueClockInput | null
  /** The promise to *finish*. Same nullability rule. */
  resolution: QueueClockInput | null

  /**
   * **This reorders the queue and nothing else does.** D22: *"sorts the row
   * above every non-breached row, regardless of `waitingSince`"* — the clause
   * exists because a transferred conversation gets a new claim and
   * `waitingSince` does not reset, so ordering on the clock alone lets a
   * breached row that changed hands sink beneath fresher ones.
   */
  firstResponseBreached: boolean
  /**
   * **This reorders nothing and is counted nowhere.** It raises `Create ticket`
   * to primary in the conversation pane (**AC-964**).
   */
  resolutionBreached: boolean

  /** Where the two clocks came from. Rendered, so a reviewer can see the branch. */
  source: ConversationSlaSource
  /** **D22 — both clocks pause on `snoozed`.** A countdown against a decision the operator already made is a false breach. */
  paused: boolean
  /** `closed`: nothing is owed, so nothing counts (Q-18, *"a stopped clock is not a backlog"*). */
  terminal: boolean
}

/* ─────────────────────────── the resolver ──────────────────────── */

/**
 * **It reads the row. It derives nothing.**
 *
 * There is no `if (channel === 'chat')` here and there is deliberately no
 * channel table left to switch on — which is `types/conversation.ts`'s own
 * design goal, that *"there is not one `if (channel === 'whatsapp')` shaped hole
 * for a vendor to fill later"*. A call has no promise because **its own row says
 * so**, not because this file knows what a call is; the day a fifth channel
 * arrives, its rows carry its clocks and nothing here changes.
 */
export function conversationSla(conversation: Conversation): ConversationSla {
  const terminal = conversation.status === 'closed'
  const paused = conversation.status === 'snoozed'

  const none: Omit<ConversationSla, 'source' | 'paused' | 'terminal'> = {
    firstResponse: null,
    resolution: null,
    firstResponseBreached: false,
    resolutionBreached: false,
  }

  /**
   * **AC-966** — no promise of either kind. The nine `phone` rows are what
   * reaches this today: `slaSource: 'unset'` **and** both deadlines null, which
   * together say *"nothing was ever promised here"*. `slaSource` alone would not
   * be enough — a row could be `unset` mid-migration with real clocks — and the
   * deadlines alone would not either, since a row can legitimately carry one
   * clock and not the other.
   */
  if (
    conversation.slaSource === 'unset' &&
    conversation.firstResponseDueAt === null &&
    conversation.slaDueAt === null
  ) {
    return { ...none, source: 'unset', paused, terminal }
  }

  /* **D22 — both clocks pause on `snoozed`**, and a closed row's clock has
     stopped (**Q-18**, *"a stopped clock is not a backlog"*). Neither can
     breach, and neither renders a countdown. */
  if (paused || terminal) {
    return { ...none, source: conversation.slaSource, paused, terminal }
  }

  /**
   * **The window is passed, not just the deadline** — and that is what makes
   * D22's 45 seconds render as seconds.
   *
   * `lib/sla.ts` decides the countdown's precision from the **window**, not from
   * the remaining value: under ten minutes it counts in seconds, at or above it
   * in minutes, *"because a four-hour ticket clock must not start flickering
   * `47s` in its last minute"*. The window is only knowable if the clock is
   * built with a `startedAt` or a `targetMinutes`; built from `dueAt` alone the
   * pill reads `1m` for its whole life and then breaches — the exact defect the
   * seconds tier was added to close. So `startedAt` is supplied on **both**
   * clocks, and `slaStartedAt` is preferred over `createdAt` because it is the
   * instant the promise actually started against.
   */
  const startedAt = conversation.slaStartedAt ?? conversation.createdAt

  return {
    /* `null` where there is no such deadline, so the pane omits the block
       rather than rendering `No clock` beside a promise that does exist. */
    firstResponse:
      conversation.firstResponseDueAt === null
        ? null
        : {
            startedAt,
            dueAt: conversation.firstResponseDueAt,
            targetMinutes: null,
            breachedAt: conversation.firstResponseBreachedAt,
          },
    resolution:
      conversation.slaDueAt === null
        ? null
        : {
            startedAt,
            dueAt: conversation.slaDueAt,
            targetMinutes: conversation.slaTargetMinutes,
            breachedAt: conversation.slaBreachedAt,
          },
    /* **Breach is a STAMP, never `dueAt < now`** — `types/workQueue.ts`'s rule,
       and the reason a closed row in the archive is not reported as overdue. */
    firstResponseBreached: conversation.firstResponseBreachedAt !== null,
    resolutionBreached: conversation.slaBreachedAt !== null,
    source: conversation.slaSource,
    paused,
    terminal,
  }
}


/* ─────────────────────── one countdown per row (§4.3) ──────────────────── */

/**
 * **AC-211 — one countdown per row**, and the running one is chosen here rather
 * than by the cell, exactly as Safety's `activeClock` does it.
 *
 * `firstResponseAt === null` means nobody has answered, so the **answer**
 * promise is running. Once somebody has, it is the **finish** promise. The row's
 * status badge says which, and `SlaCountdown` gains no new variant.
 */
export function runningClock(
  conversation: Conversation,
  sla: ConversationSla,
  now: IsoDateTime,
): { result: QueueClockResult; input: QueueClockInput | null; promise: 'first-response' | 'resolution' | 'none' } {
  const answered = conversation.firstResponseAt !== null
  const input = answered ? sla.resolution : sla.firstResponse
  if (input === null) {
    return {
      result: queueClock(
        { startedAt: null, dueAt: null, targetMinutes: null, breachedAt: null },
        now,
        { terminal: sla.terminal || sla.paused },
      ),
      input: null,
      promise: 'none',
    }
  }
  return {
    result: queueClock(input, now, { terminal: sla.terminal }),
    input,
    promise: answered ? 'resolution' : 'first-response',
  }
}

/* ──────────────────────────── the queue order ──────────────────────────── */

/**
 * **D19's queue order and D22's reordering clause, in one comparator.**
 *
 * > *"sorted breached-first, then `waitingSince` ascending"* — D19
 * > *"a first-response breach sorts the row above every non-breached row …
 * > within the breached set, oldest first"* — D22
 *
 * `resolutionBreached` is not read. That absence is the asymmetry and it is
 * asserted by **AC-964**.
 *
 * A `null` `waitingSince` sorts **last**, which is the rule My Work applies to
 * an item with no clock and the rule `runQuery`'s own comparator applies to the
 * same field: *"it has no clock, so it cannot be more urgent than something
 * that has one."*
 */
export function compareForQueue(
  a: { conversation: Conversation; sla: ConversationSla },
  b: { conversation: Conversation; sla: ConversationSla },
): number {
  if (a.sla.firstResponseBreached !== b.sla.firstResponseBreached) {
    return a.sla.firstResponseBreached ? -1 : 1
  }
  return waitingRank(a.conversation.waitingSince) - waitingRank(b.conversation.waitingSince)
}

function waitingRank(waitingSince: IsoDateTime | null): number {
  return waitingSince === null ? Number.MAX_SAFE_INTEGER : Date.parse(waitingSince)
}
