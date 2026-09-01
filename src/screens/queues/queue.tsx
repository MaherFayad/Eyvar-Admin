/**
 * **The §4 work-queue contract, as components.** `specs/02-work-queues.md` §4,
 * `DESIGN.md` §8.4, **R5a**, `design/07-rulings-r4.md` **R4-10**.
 *
 * §4 is one contract that five sub-tabs inherit; a per-queue section may
 * *narrow* a rule and may not contradict one. That sentence is the reason this
 * file exists: the countdown, the owner chip and the decision badge are where
 * four of §4's rules physically live, and five copies of them is five chances
 * for one queue to disagree with the contract.
 *
 * Rules applied
 *   §4.3 / AC-211
 *              **one countdown per row.** Safety has two clocks and shows the
 *              running one; `SlaCountdown` takes ONE `SlaClock` and there is no
 *              prop that would let a row render two.
 *   §4.3 Q-15 / AC-213
 *              **the track's denominator is the item's own window, always.**
 *              `slaTrackPercent` returns `null` when the window is unknown and
 *              `null` is not zero — no track renders at all. The legacy
 *              hardcoded `90` (`:11652`) has no way in, in any queue, for any
 *              reason.
 *   §4.4 Q-21 / AC-220
 *              R5a's three parts, none substituting for another: the page
 *              banner (the screen renders it), the 3px leading-edge marker
 *              (`RowCriticalMarker`), and the pill reading **`overdue 14m` in
 *              words** — so the queue in greyscale still identifies which rows
 *              are breached.
 *   §4.4 Q-23 / AC-221 / AC-224
 *              **at most one red carrier per row**, and nothing pulses. The
 *              breached pill is `warning` tone; red is spent on the marker.
 *   §4.2 / AC-201 / AC-202
 *              `Claim` and `Open` are separate controls, and an item held by
 *              someone else shows **that operator's name and `Take over`** —
 *              never disabled, never hidden, never a silent failure at commit.
 *   §4.2 Q-7 / AC-207
 *              the 30-minute expiry is stated **on the queue**, on the owner
 *              chip itself. See `CLAIM_EXPIRY_MINUTES` below for why it is a
 *              `title` and what that does not buy.
 *   §4.5 Q-26–Q-28 / AC-226–AC-228
 *              a decided row converts **in place**, naming outcome, actor and
 *              reason. It is **not** dimmed with `opacity` (`:10929` uses `.7`,
 *              which is §4.6's disabled treatment and promises the row will
 *              come back), and **a rejection is neutral, never red**.
 *   R4-10      severity is a LABEL (`Critical` / `High` / `Normal`), the clock
 *              is the order, and the marker is the escalation. Three carriers
 *              where legacy had one red badge. `SeverityBadge` is the label
 *              half and it is deliberately not a tone escalation: R7 closes the
 *              palette at five and `critical` and `high` both map to `warning`.
 */

import type { BadgeTone, Claim, IsoDateTime } from '@/data/types'
import {
  NO_CLOCK,
  formatDate,
  formatDuration,
  formatSlaLabel,
  slaClock,
  slaTrackPercent,
  type SlaClock,
  type Translate,
} from '@/lib'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { liveClaim } from '@/data/clients'
import { StatusBadge } from '@/components/StatusBadge'
import { Cell } from './cells'

/* ─────────────── §4.4 · breached, late, and old — the one rule ─────────── */

/** The three SLA fields any wave-2 row carries, in whichever pair is running. */
export interface QueueClockInput {
  startedAt: IsoDateTime | null
  dueAt: IsoDateTime | null
  targetMinutes: number | null
  /** **The stamp.** `types/workQueue.ts`: breach is a stamp, never `dueAt < now`. */
  breachedAt: IsoDateTime | null
}

export interface QueueClockResult {
  /** What the countdown pill renders. `NO_CLOCK` where nothing is running. */
  clock: SlaClock
  /** **Q-17** — R5a's three parts hang off this and nothing else. */
  breached: boolean
  /**
   * The deadline is behind us and **the promise was not broken**. See below;
   * this is why the function exists.
   */
  deadlinePassedUnbroken: boolean
}

/**
 * **§4.4, Q-17 – Q-20, resolved once for all five queues.**
 *
 * `types/workQueue.ts` is unambiguous: *"breach is a stamp, never
 * `slaDueAt < now`"*, because a naive comparison calls every closed row in the
 * archive overdue. So `breached` reads `slaBreachedAt` and adds Q-17's second
 * clause — **still awaiting a decision**. A decided row is `late-decided`
 * (Q-18), its badge says so, and it carries **no marker**: the R5a leading edge
 * is reserved for work still owed. That is wave 1's finding **G9**, answered.
 *
 * **The case this function exists for, and it is a live one.** Four Trip
 * Assurance rows — `UST-1`, `UST-2`, `UST-5`, `UST-7` — are past their
 * `slaDueAt` (21:00 the evening before) and carry `slaBreachedAt: null`. That
 * is not a fixture error: `UST-5` was auto-handed-off to its backup, so the
 * system kept the promise, and `UST-3` vs `UST-5` are documented as *"same
 * cut-off, same null acknowledgement, opposite breach states"*. Driving the
 * pill from the live clock would print `overdue 12h` on a row the data says was
 * never breached — and then either the marker contradicts the pill (R5a
 * requires all three parts together, **AC-220**) or the pill contradicts the
 * banner (**AC-219**).
 *
 * So a passed-but-unbroken deadline renders as **a date, not a countdown**:
 * `Due 24 Jun 21:00`, neutral, no track, no marker. It is one clock readout per
 * row (**AC-211**), it is true, and it agrees with everything else on screen.
 *
 * It is also exactly what the data layer asked for on this queue: `slaSource`
 * is `unset` and `slaTargetMinutes` is `null` on every `AssuranceTrip`, and
 * §6's own note says *"the screen can show 'due 21:00' and **cannot** draw a
 * progress track. Inventing a start is the `/90` bug at `:11652`."* (**Q8-b**,
 * open, product-owner.)
 */
export function queueClock(
  input: QueueClockInput,
  now: IsoDateTime,
  { terminal }: { terminal: boolean },
): QueueClockResult {
  const base = slaClock(
    { dueAt: input.dueAt, startedAt: input.startedAt, targetMinutes: input.targetMinutes },
    now,
  )

  /* Q-18 — a decided row's clock has stopped. The decision badge carries the
     record of when, and how late it was. Nothing is owed, so nothing counts. */
  if (terminal) return { clock: NO_CLOCK, breached: false, deadlinePassedUnbroken: false }

  const breached = input.breachedAt !== null
  if (base.kind === 'breached' && !breached) {
    return { clock: NO_CLOCK, breached: false, deadlinePassedUnbroken: true }
  }
  return { clock: base, breached, deadlinePassedUnbroken: false }
}

/**
 * `DB.ownershipConfig.staleMin` (`:18853`) — a claim untouched for this long is
 * released. **§4.2 Q-7 requires the number to be stated in the UI**, *"not left
 * for the operator to discover by losing an item"*, and **AC-207** requires it
 * to be readable on the queue without opening a settings page.
 *
 * It is carried on the owner chip's `title`, in all three states, through one
 * key with a named placeholder. That is readable on the queue and it is **not
 * enough on its own for a keyboard-only or screen-reader operator** — a `title`
 * is not announced reliably. Recorded as a finding rather than papered over:
 * the honest carrier is a line in the queue's own help or beside the toolbar,
 * and neither exists as a slot today.
 */
export const CLAIM_EXPIRY_MINUTES = 30

/* ───────────────────── V-04 · SLA countdown (§4.3) ───────────────────── */

export interface SlaCellProps {
  result: QueueClockResult
  t: Translate
  language: import('@/lib').Language
  /** Only read when the deadline has passed unbroken. */
  dueAt: IsoDateTime | null
  promiseLabel?: string | null
}

/**
 * The SLA cell every queue renders — **one countdown per row** (**AC-211**),
 * and the three readings §4.4 permits, chosen by `queueClock` rather than by
 * the screen.
 *
 * | `queueClock` says | The cell reads |
 * |---|---|
 * | running / breached | the countdown pill — `45s left`, `overdue 14m` |
 * | passed unbroken | `Due 24 Jun 21:00` — a date, neutral, no track |
 * | no clock at all | `No clock` — a VALUE (Q-20), sorted last, never `—` |
 */
export function SlaCell({ result, t, language, dueAt, promiseLabel = null }: SlaCellProps) {
  if (result.deadlinePassedUnbroken && dueAt !== null) {
    return (
      <span className="block" title={promiseLabel ?? undefined}>
        <Cell className="text-muted-foreground">
          <bdi>
            {t('queue.sla.dueAt', {
              date: formatDate(dueAt, { style: 'day-month-time', language }),
            })}
          </bdi>
        </Cell>
      </span>
    )
  }
  return <SlaCountdown clock={result.clock} t={t} promiseLabel={promiseLabel} />
}

export interface SlaCountdownProps {
  clock: SlaClock
  t: Translate
  /**
   * §4.3 **Q-11** — Safety is the only queue with two clocks and only one runs
   * at a time. **The countdown gains no new variant**; the promise that is
   * running is named by the row's STATUS BADGE, and this label is here so the
   * pill still has an accessible description saying which. `null` on every
   * one-clock queue.
   */
  promiseLabel?: string | null
}

export function SlaCountdown({ clock, t, promiseLabel = null }: SlaCountdownProps) {
  const label = formatSlaLabel(clock, t)
  const percent = slaTrackPercent(clock)
  /* Three bands → two badge tones. `breached` is NOT a third fill: R5a spends
     red on the row marker and the WORD `overdue` carries the escalation. */
  const tone: BadgeTone = clock.band === 'neutral' ? 'neutral' : 'warning'

  return (
    <span className="block" title={promiseLabel ?? undefined}>
      <Cell>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </Cell>
      {/* Q-15 — only when the window is known. `null` is not zero: an absent
          track and a zero-width track mean different things, and a track drawn
          against a denominator nobody chose is the `/90` bug. */}
      {percent !== null && (
        <Progress
          value={percent}
          tone={clock.band === 'neutral' ? 'neutral' : 'warning'}
          aria-label={label}
          className="mt-1 w-20"
        />
      )}
    </span>
  )
}

/* ─────────────────────── V-06 · owner chip (§4.2) ─────────────────────── */

export interface OwnerChipProps {
  claim: Claim | null
  /** The acting operator. `session.userId` — never a constant in a component. */
  currentUserId: string
  /** For `Yours · 4m`: the elapsed hold time. */
  now: string
  t: Translate
  onClaim: () => void
  onRelease: () => void
  onTakeOver: () => void
  /**
   * §4.13 Q-50 / **AC-205**, **AC-232** — gate at RENDER. `false` disables in
   * place with the reason available, never hides and never enables-then-refuses.
   */
  canWrite: boolean
  disabledReason: string
  /**
   * **My Work is a projection, not a queue** (§4.8 Q-40). Rows whose source
   * queue has no client in this wave cannot be claimed from here, and the
   * control says so instead of failing at commit.
   */
  unavailableReason?: string | null
}

export function OwnerChip({
  claim,
  currentUserId,
  now,
  t,
  onClaim,
  onRelease,
  onTakeOver,
  canWrite,
  disabledReason,
  unavailableReason = null,
}: OwnerChipProps) {
  /* Only a LIVE claim is ownership. A released or done claim is history, and a
     row still carrying one is unclaimed — §4.2 Q-6.
     **And a claim that has gone stale is history too**, which this used to
     miss: it read `state === 'claimed'` and stopped there, ignoring the
     `OWNERSHIP_STALE_MINUTES` window it prints in its own tooltip two lines
     below. The clients' `unassigned` views use `liveClaim`, so the chip
     disagreed with the list it was rendering — a row the client had returned as
     free drew `Held by … · Take over`. One predicate, asked in one place. */
  const held = liveClaim(claim ?? null)
  const mine = held !== null && held.ownerId === currentUserId
  const blocked = !canWrite || unavailableReason !== null
  const reason = unavailableReason ?? disabledReason
  /* AC-207 — the expiry period, stated on the queue itself. */
  const expiry = t('queue.owner.expiry', { minutes: String(CLAIM_EXPIRY_MINUTES) })

  if (held === null) {
    return (
      <span className="flex min-w-0 items-center gap-1.5" title={expiry}>
        <StatusBadge tone="neutral" className="min-w-0 shrink justify-start truncate">
          {t('queue.owner.unclaimed')}
        </StatusBadge>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0"
          onClick={onClaim}
          disabled={blocked}
          title={blocked ? reason : expiry}
        >
          {t('queue.claim')}
        </Button>
      </span>
    )
  }

  if (mine) {
    return (
      <span className="flex min-w-0 items-center gap-1.5" title={expiry}>
        <StatusBadge tone="success" className="min-w-0 shrink justify-start truncate">
          {t('queue.owner.mine', {
            duration: formatDuration(Date.parse(now) - Date.parse(held.claimedAt)),
          })}
        </StatusBadge>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0"
          onClick={onRelease}
          disabled={blocked}
          title={blocked ? reason : expiry}
        >
          {t('queue.release')}
        </Button>
      </span>
    )
  }

  return (
    /* **AC-202** — the owner's NAME and a `Take over`. The chip gives way, not
       the verb: a truncated name is still a name and the full one is in
       `title`, whereas a truncated verb is an unusable control. `min-w-0` is
       the half that makes `truncate` work at all inside a flex row.
       **Q-56** flags this cell as one of two that must be checked at their
       longest in Arabic; `SREQ-006` and `FC-0004` are the fixtures that do it. */
    <span
      className="flex min-w-0 items-center gap-1.5"
      title={t('queue.owner.heldBy', { name: held.ownerName })}
    >
      <StatusBadge tone="warning" className="min-w-0 shrink justify-start truncate">
        {held.ownerName}
      </StatusBadge>
      {/* **`shrink-0` on the button and `shrink` on the chip — both halves are
          needed, and only one of them is obvious.** `badgeVariants`' own base
          carries `shrink-0` and `whitespace-nowrap` (`ui/badge.tsx:44`), so a
          `truncate` passed in through `className` can never fire: the chip
          refuses to shrink and the BUTTON yields instead. At 140px that
          rendered `Yousef Al-Balawi` beside `Tak`.
          `justify-start` is the third half: the badge base is
          `justify-center`, so a clipped label loses characters from BOTH ends
          and `Yousef Al-Balawi` rendered as `ef Al-B` — a name that is not a
          name. Truncation has to happen at one end for the ellipsis to mean
          anything, and it is the inline-END, which mirrors on its own.
          A truncated name is still a name and the full one is in `title`; a
          truncated verb is an unusable control. Q-56 flags this cell as one of
          the two that must be checked at their longest in Arabic.
          Without it the flex row shrinks whichever child yields first, and at
          140px that was the BUTTON: the cell rendered `Yousef Al-Balawi` beside
          `Tak`. A truncated name is still a name and the full one is in
          `title`; a truncated verb is an unusable control. Q-56 flags this cell
          as one of the two that must be checked at their longest in Arabic. */}
      <Button
        variant="ghost"
        size="xs"
        className="shrink-0"
        onClick={onTakeOver}
        disabled={blocked}
        title={blocked ? reason : expiry}
      >
        {t('queue.takeOver')}
      </Button>
    </span>
  )
}

/* ───────────────────── V-07 · decision badge (§4.5) ───────────────────── */

export interface DecisionBadgeProps {
  /** The outcome WORD — `Upheld`, `Assigned`, `Closed`. One badge, one word. */
  outcome: string
  /** `{actor} · {date}`, resolved through one key by the caller (**AC-75**). */
  meta: string | null
  /** The stated reason, when the queue requires one. `title`-only — see R20. */
  reason?: string | null
  /**
   * §4.4 **Q-18** / **AC-222** — *"a stopped clock is not a backlog."* An item
   * decided after its deadline says so **here**, in the badge, and carries
   * **no row marker**: the R5a leading edge is reserved for work still owed.
   */
  late?: boolean
  lateLabel?: string
}

export function DecisionBadge({
  outcome,
  meta,
  reason = null,
  late = false,
  lateLabel,
}: DecisionBadgeProps) {
  return (
    /* **R20 — this cell may not grow the row.** Two lines, both `truncate`, and
       the full sentence reachable as the element's `title`. The measurement
       that forced the ruling names this component: a rejection reason wrapping
       to four lines under a badge and a meta line produced five interval
       changes in eight rows, which a reader parses as damage rather than data. */
    <span className="block min-w-0" title={reason ?? undefined}>
      <Cell>
        <span className="inline-flex items-center gap-1">
          {/* **Q-28 / AC-228** — a terminal factual outcome is NEUTRAL. A
              rejection, a dismissal and a refusal are facts with no action
              left, exactly like `Refunded`; `b-red` at `:10907` does not ship,
              and neither does a green one for the outcomes we happen to like. */}
          <StatusBadge tone="neutral">{outcome}</StatusBadge>
          {/* Q-18 — late, and NOT breached. A second neutral chip rather than a
              tone, because lateness after the fact is a record, not a signal. */}
          {late && lateLabel && <StatusBadge tone="neutral">{lateLabel}</StatusBadge>}
        </span>
      </Cell>
      {meta !== null && (
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      )}
    </span>
  )
}

/* ──────────────── R4-10 · severity as a LABEL, not a tone ──────────────── */

export interface SeverityBadgeProps {
  tone: BadgeTone
  label: string
}

/**
 * **R4-10, the label half.** *"The label carries the distinction; the row
 * marker carries the escalation; the clock carries the order."*
 *
 * R7 closes the tone palette at five and R5a permits no red badge, so
 * `critical` and `high` both resolve to `warning` — the resolution that legacy
 * carried in colour moves into the **word**, which is R17's principle exactly:
 * *"separate them with the label, not a second fill."*
 *
 * **AC-223 / AC-319** ride on this: a `critical` incident inside its
 * acknowledgement window carries no breach marker and no red row background.
 * Severity and lateness are two facts and the row must not collapse them into
 * one (Q-22).
 */
export function SeverityBadge({ tone, label }: SeverityBadgeProps) {
  return (
    <Cell>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </Cell>
  )
}
