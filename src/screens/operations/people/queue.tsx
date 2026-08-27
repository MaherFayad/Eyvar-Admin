/**
 * The work-queue vocabulary the Applications view needs — design spec §9.3,
 * §8.4, **R5a**, **AC-50**, **AC-76**.
 *
 * **Why these live in the screen directory and not in `src/components/`.**
 * `00-shell.md` §12 lists `SlaCountdown` (V-04), `OwnerChip` (V-06) and
 * `DecisionBadge` (V-07) as components, and 0.4 did not build them — nothing
 * in `src/components/` provides one. `src/components/` has a single owner and
 * Phase 1 runs in parallel, so they are built here, to the spec, and named in
 * the handoff for promotion the moment a second queue needs them. They are
 * pure presentational functions over values the caller computed; promoting
 * them is a file move.
 *
 * Rules applied
 *   §9.3 (a)(b)(c) / AC-50
 *              all three parts of R5a, and none substitutes for another: the
 *              page banner with a count (the screen renders it), the 3px
 *              `--ev-red` leading-edge marker per breached row
 *              (`RowCriticalMarker`, already built in `StatusBadge.tsx`), and
 *              the countdown reading **`overdue 14m` in words**, so the state
 *              survives colour being removed.
 *   R17 / R5a  the breached pill is **warning tone, not red**. There is no red
 *              badge; the WORD `overdue` is what separates it from `12m left`,
 *              exactly as R17 separates "waiting on them" from "waiting on
 *              you" by label rather than by a second fill.
 *   §9.3       **no deadline ⇒ `No clock`, neutral tone, sorts last.** Never
 *              `—`, never a synthetic deadline. `slaClock` returns `NO_CLOCK`
 *              and `slaSortKey` puts it last; nothing here invents one.
 *   §8.4.2     the track renders **only when the window is known**, and its
 *              denominator is the item's own SLA target — `slaClock` gets the
 *              applicant's `appliedAt` as `startedAt`, so the legacy hardcoded
 *              `90` (`:11652`) has no way in.
 *   R18        nothing here pulses, blinks or loops.
 *   §8.4.1     the owner chip has exactly three states — unclaimed / yours /
 *              someone else's — with tones neutral / success / warning.
 *              **No emoji**: the legacy `✋` is dropped (**AC-76**).
 *   §8.4.5 / V-07
 *              a decided row converts IN PLACE, naming outcome, actor and
 *              reason, with the timestamp beneath. **A rejection is NEUTRAL**
 *              — a terminal factual outcome, like `Refunded` — never red
 *              (`:10907` is the defect).
 *   §4.6       a decided row is **never de-emphasised with `opacity`**
 *              (`:10929` uses `.7`, which is §4.6's disabled treatment and
 *              says "this will come back"). It switches to `--ev-text-2`.
 *   §11.2      controls are gated **at render**, not at commit: a disposition
 *              the role cannot use renders disabled in place with its reason.
 */

import type { BadgeTone, Claim } from '@/data/types'
import {
  formatDuration,
  formatSlaLabel,
  slaTrackPercent,
  type SlaClock,
  type Translate,
} from '@/lib'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/StatusBadge'
import { Cell } from './cells'

/* ───────────────────── V-04 · SLA countdown (§8.4.2) ───────────────────── */

export function SlaCountdown({ clock, t }: { clock: SlaClock; t: Translate }) {
  const label = formatSlaLabel(clock, t)
  const percent = slaTrackPercent(clock)
  /* Three bands → two badge tones. `breached` is NOT a third fill: R5a spends
     red on the row marker, and the word `overdue` carries the escalation. */
  const tone: BadgeTone = clock.band === 'neutral' ? 'neutral' : 'warning'

  return (
    <span className="block">
      <Cell>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </Cell>
      {/* Only when the window is known. `null` is not zero — an absent track
          and a zero-width track mean different things. */}
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

/* ─────────────────────── V-06 · owner chip (§8.4.1) ─────────────────────── */

export interface OwnerChipProps {
  claim: Claim | null
  /** The acting operator. `session.userId` — never a constant in a component. */
  currentUserId: string
  /** For `Yours · 4m`: the elapsed time since the claim was taken. */
  now: string
  t: Translate
  onClaim: () => void
  onRelease: () => void
  onTakeOver: () => void
  /** §11.2 — gate at render. `false` disables in place, with the reason. */
  canWrite: boolean
  disabledReason: string
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
}: OwnerChipProps) {
  const held = claim && claim.state === 'claimed' ? claim : null
  const mine = held !== null && held.ownerId === currentUserId

  if (held === null) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <StatusBadge tone="neutral" className="min-w-0 truncate">
          {t('people.queue.owner.unclaimed')}
        </StatusBadge>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClaim}
          disabled={!canWrite}
          title={canWrite ? undefined : disabledReason}
        >
          {t('people.queue.claim')}
        </Button>
      </span>
    )
  }

  if (mine) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <StatusBadge tone="success" className="min-w-0 truncate">
          {t('people.queue.owner.mine', {
            duration: formatDuration(Date.parse(now) - Date.parse(held.claimedAt)),
          })}
        </StatusBadge>
        <Button variant="ghost" size="xs" onClick={onRelease} disabled={!canWrite}>
          {t('people.queue.release')}
        </Button>
      </span>
    )
  }

  return (
    /* §7.4 declares this column at 144 and `Yousef Al-Balawi` + `Take over`
       needs ~168, so the pair overflowed the cell and painted into `Decision`.
       **The CHIP gives way, not the verb**: a truncated name is still a name
       and the full one is in `title`, whereas a truncated verb is an unusable
       control. `min-w-0` is the half that makes `truncate` work at all inside
       a flex row. Raised as a finding against §7.4's 144. */
    <span className="flex min-w-0 items-center gap-1.5" title={held.ownerName}>
      {/* Someone else's: warning tone, and the chip names WHO. */}
      <StatusBadge tone="warning" className="min-w-0 truncate">
        {held.ownerName}
      </StatusBadge>
      <Button
        variant="ghost"
        size="xs"
        onClick={onTakeOver}
        disabled={!canWrite}
        title={canWrite ? undefined : disabledReason}
      >
        {t('people.queue.takeOver')}
      </Button>
    </span>
  )
}

/* ───────────────────── V-07 · decision badge (§8.4.5) ───────────────────── */

export function DecisionBadge({
  outcome,
  meta,
  reason,
}: {
  /** The outcome WORD — `Approved`. One badge, one word. */
  outcome: string
  /** `{actor} · {date}`, resolved through one key by the caller (**AC-75**). */
  meta: string | null
  /**
   * The rejection reason, when there is one. **It no longer wraps** — see
   * below; it is `title`-only until §11's drawer carries it.
   */
  reason: string | null
}) {
  return (
    /* **R20 — this cell may not grow the row, and it was the one that did.**
       `04-index-screen-redesign.md` §7.6 makes row height the TABLE's, and the
       measurement that forced the ruling names this component: Applications ran
       117 / 44 / 44 / 69 / 44 / 44 / 44 / 41, and the 117 was `APP-2206`'s
       rejection reason wrapping to four lines under a badge and a meta line.
       A data table's rules are a repeating beat; five interval changes in eight
       rows reads as damage.

       So: two lines, both `truncate`, and the full sentence stays reachable as
       the element's `title`. §9.2 goes further — the whole column becomes one
       nowrap line of plain text, `Approved · Yousef Al-Balawi · 24 Jun 11:20`,
       and default-hidden — but that is build item 10, and the row height is
       item 2. This is item 2's half: nothing here can change a row's height. */
    <span className="block min-w-0" title={reason ?? undefined}>
      <Cell>
        {/* A terminal factual outcome is NEUTRAL — approval included. The
            outcome word carries the meaning, not a colour. */}
        <StatusBadge tone="neutral">{outcome}</StatusBadge>
      </Cell>
      {meta !== null && (
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      )}
    </span>
  )
}
