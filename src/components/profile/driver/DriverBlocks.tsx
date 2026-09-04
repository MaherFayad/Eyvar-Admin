/**
 * **The four summary blocks, in the order that is the whole argument.**
 *
 * ```
 *  Standing            <- may this captain work at all
 *  Documents           <- what will stop them, and when
 *  Earnings            <- what they are owed
 *  Subscription slots  <- how much work they can still be given
 * ```
 *
 * A rider's summary leads with money because a rider's money is what they can
 * spend. A captain's leads with **standing**, because a suspended captain earns
 * nothing, takes no trips and holds no slots — every other block on this screen
 * is moot behind it. Documents come second and money third for the same reason
 * one step down: a licence that expires on Tuesday takes the captain off the
 * road on Tuesday whether anybody acts or not, and no operator can spend their
 * way out of it.
 *
 * The sheet stacks these down a rail and the page lays them across a strip.
 * Same components, same order, same words — the surfaces choose geometry and
 * nothing else (§3).
 *
 * ## Each block owns its own four states
 *
 * The record is one read; the money envelope, the payout position, the document
 * file, the ledger, the deductions, the timeline and the support presence are
 * seven more, and each fails independently (§9.2 #14). A failed compliance read
 * leaves the standing block, the earnings block and the whole rest of the
 * surface working — which is the entire reason they are separate reads.
 *
 * **No figure renders while its read is in flight.** A `0` printed before a
 * read returns is indistinguishable from a real zero, and on a payable that
 * mistake reads as *"we owe this captain nothing"*.
 *
 * Rules applied
 *   §7.5       every condition is carried by a WORD. `Under review`,
 *              `Suspended`, `Expiring` — no block on this surface communicates
 *              anything by colour alone, and none of them carries a tone.
 *   R5a        no red anywhere in these four. A suspension is reversible and
 *              `commands/captains.ts` already ruled it *"blue, not red"*; an
 *              expired document is `neutral` per `people/domain.ts`'s
 *              `DOC_STATE`; a bank rejection is `neutral` for the same reason.
 *   §12.1      the standing block is **not a badge**. The status badge belongs
 *              on the `Identity` card, where it is a status on a record; here
 *              the value is at figure rank and the reasons are underneath.
 *   §8.3.4     the cash debt is a separate labelled line beneath the payable
 *              and is never inside it, netted against it, or summed with it.
 *   §9.1       logical utilities only.
 */

import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { FlagList } from '../fields'
import { SectionStates } from '../SectionCard'
import type { CaptainPayout, Driver, DriverMoneyMovements, Paginated } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatCount, formatDate, type Language, type Translator } from '@/lib'
import { DRIVER_STATUS, WORST_STATE } from '@/screens/operations/people/domain'
import {
  BlockCaption,
  BlockFigure,
  BlockSkeleton,
  BlockWord,
  SlotMeter,
  SummaryBlock,
} from './SummaryBlock'
import { soonestDocument, documentRows, standingFlags } from './facts'
import { complianceState, type DriverReads } from './reads'

export interface DriverBlockProps {
  driver: Driver
  /** The seven reads, declared once in `reads.ts` and shared by both surfaces. */
  reads: DriverReads
  /** The instant the countdowns are measured against. Passed, never read here. */
  nowIso: string
  t: Translator
  language: Language
}

/** The one row, or `null`. `undefined` while the read has not answered. */
function payoutRow(result: AsyncResult<Paginated<CaptainPayout>>): CaptainPayout | null | undefined {
  if (result.status === 'loading' || result.status === 'error') return undefined
  return result.data?.items[0] ?? null
}

/* ───────────────────────────── 1 · standing ────────────────────────────── */

/**
 * **What the console will let this captain do today, and why.**
 *
 * `Driver.status` is a server field derived from three signals, and
 * `types/driver.ts` keeps the contributing flags on the record *"because the
 * detail page shows why"*. The word is the value; the reasons are a list of
 * words beneath it, never a sentence built by joining the ones that happen to
 * be true (§9.6).
 *
 * The two flags that come from the payout read are held back until it answers,
 * rather than shown as an absence — a list that grows a line after the fact is
 * worse than a list that arrives complete, because the operator has already
 * read it.
 */
export function StandingBlock({ driver, reads, t, language }: DriverBlockProps) {
  const payout = payoutRow(reads.payout)
  const flags = standingFlags(driver, payout, t, language)

  return (
    <SummaryBlock label={t('profile.driver.block.standing')}>
      <BlockWord>{t(DRIVER_STATUS[driver.status].key)}</BlockWord>
      {payout === undefined ? (
        <BlockSkeleton />
      ) : flags.length === 0 ? (
        /* §3.5 — a block with nothing to report says so in a sentence. An
           empty list here is a real, meaningful answer: nothing is standing
           against this captain. */
        <BlockCaption>{t('profile.driver.standing.clear')}</BlockCaption>
      ) : (
        <FlagList flags={flags} className="text-xs text-muted-foreground" />
      )}
    </SummaryBlock>
  )
}

/* ──────────────────────────── 2 · documents ────────────────────────────── */

/**
 * **The clock a rider does not have.**
 *
 * Five documents, each with a date, each capable of taking this captain off the
 * road on its own with nobody acting. That is the structural fact that earns
 * this block its place above money, and it has no counterpart on a rider
 * record at all.
 *
 * The value is `worstState` — the file's worst bucket, the same five words the
 * Compliance view prints. The caption is the **soonest** expiry, which is a
 * different question and is answered separately rather than inferred: a licence
 * that expired last year is the worst state while the next thing to happen is
 * an inspection due on Tuesday.
 *
 * `worstState === null` is `No file` and never `All valid` — `types/driver.ts`
 * calls the second *"the most dangerous possible default"* and it is right.
 */
export function DocumentsBlock({ driver, reads, nowIso, t, language }: DriverBlockProps) {
  const state = complianceState(reads.compliance)

  return (
    <SummaryBlock label={t('profile.driver.block.documents')}>
      {state.kind === 'loading' && <BlockSkeleton />}

      {state.kind === 'error' && (
        /* §9.2 #14 — card-scoped. A failed document read leaves standing,
           earnings, capacity and the whole rest of the surface working. */
        <ErrorState
          scope="card"
          card={false}
          message={t('profile.state.error', { section: t('profile.driver.block.documents') })}
          action={{ label: t('profile.state.retry'), onClick: state.retry }}
        />
      )}

      {/* **A 404 is an answer, not a failure.** `No file` is the word
          `people/domain.ts` already assigns to `worstState: null`, and
          `types/driver.ts` calls reporting `valid` for an empty file *"the most
          dangerous possible default"*. Nothing failed, so nothing says it did. */}
      {state.kind === 'no-file' && (
        <>
          <BlockWord>{t(WORST_STATE.none.key)}</BlockWord>
          <BlockCaption>{t('profile.driver.documents.none')}</BlockCaption>
        </>
      )}

      {state.kind === 'file' &&
        (() => {
          const rows = documentRows(state.compliance, t, nowIso)
          const soonest = soonestDocument(rows)
          const worst = WORST_STATE[state.compliance.worstState ?? 'none']
          return (
            <>
              <BlockWord>{t(worst.key)}</BlockWord>
              {soonest === null ? (
                <BlockCaption>{t('profile.driver.documents.none')}</BlockCaption>
              ) : (
                <BlockCaption>
                  <bdi>
                    {t(
                      soonest.days < 0
                        ? 'profile.driver.documents.expired'
                        : 'profile.driver.documents.soonest',
                      {
                        document: soonest.label,
                        date: formatDate(soonest.expiresOn, { style: 'day-month-year', language }),
                      },
                    )}
                  </bdi>
                </BlockCaption>
              )}
              <BlockCaption>
                <bdi>{t.plural('profile.driver.documents.count', { count: rows.length })}</bdi>
              </BlockCaption>
              {/* **The compliance file's own suspension reason, and ONLY when
                  the record is not already carrying it.**

                  `DriverCompliance.suspendedReason` and
                  `Driver.suspensionReason` both read from
                  `DB.complianceSuspensions` (`types/driver.ts`), so on a
                  suspended captain they are the same sentence — and the banner
                  above is already stating it. Printing it here too is R10's
                  *one event, one surface* breached inside a single screen: the
                  operator reads the same words twice and has to work out
                  whether they are two findings.

                  The line still exists, because the type permits compliance to
                  have suspended a captain whose record does not say so, and
                  that case is genuinely new information rather than an echo. */}
              {!driver.suspended && state.compliance.suspendedReason !== null && (
                <BlockCaption>
                  <bdi>
                    {t('profile.driver.documents.suspendedBy', {
                      reason: state.compliance.suspendedReason,
                    })}
                  </bdi>
                </BlockCaption>
              )}
            </>
          )
        })()}
    </SummaryBlock>
  )
}

/* ───────────────────────────── 3 · earnings ────────────────────────────── */

/**
 * **A payable, and it is not a wallet. Five figures, because there are five
 * facts.**
 *
 * A rider has one balance and one held figure. A captain has **two ledgers** —
 * what Eyvar owes them and what they owe Eyvar — and **three off-ledger
 * figures** attached to them and in neither. `types/driver.ts` puts it plainly:
 * *"five numbers, because there are five facts, and collapsing any two of them
 * is how a payout over-pays (D-F6)."*
 *
 * | figure | account | what it is |
 * |---|---|---|
 * | `payableHalalas` | `liability.driver` | what Eyvar owes. **May be negative.** |
 * | `cashDebtHalalas` | `ar.driver` | what the captain owes, from cash fares kept |
 * | `escrowHeldHalalas` | — | held against plans not yet delivered |
 * | `payoutInFlightHalalas` | — | committed out, not settled; the ledger cannot hold it (AC-312) |
 * | `pendingDeductionsHalalas` | — | raised and not applied: no posting, no balance, no row |
 *
 * ## Nothing here is combined, and that is the load-bearing rule
 *
 * `netPayableHalalas` is **deliberately not a field**. `clients/payouts.ts`:
 * *"it is `payable − cashDebt`, it is what the payout action commits (AC-366),
 * and it must be computed once from two independently-true server values rather
 * than sent as a third value that can disagree with them."* This surface takes
 * no payout, so it states no net — a figure here subtracting one from the other
 * would be a number **no ledger holds**, printed beside two that both do.
 *
 * So the four subordinate figures render as **four separately labelled lines
 * beneath the payable**, which is §8.3.4's own construction (*"a pending amount
 * is not part of a balance… it MUST appear as a separate labelled line beneath
 * it"*) applied across four sources rather than within one. There is no sum, no
 * difference and no total anywhere in this block.
 *
 * ## Each line renders only when it is non-zero
 *
 * `Cash debt 0.00 SAR` invents a category this captain is not in — the tile
 * rule (R4-11 §11.2) applied to a line. A `0` on any of the four is a real zero
 * meaning *nothing held / nothing in flight / nothing pending*, and the honest
 * rendering of that is silence, not a row of zeroes.
 *
 * ## A negative payable is a real state and gets its own caption
 *
 * `DRV-0202` is −1,500: an absentee forfeited an emergency cover cost, so the
 * captain owes **on the payable account**. `payable to this captain` is false
 * for that row, so the caption changes with the sign rather than the figure
 * being clamped or the label being left wrong. The figure itself is U+2212 in
 * ordinary ink — never red, never parentheses, never a badge (§8.3.2).
 */
export function EarningsBlock({ reads, t, language }: DriverBlockProps) {
  return (
    <SummaryBlock label={t('profile.driver.block.earnings')}>
      <SectionStates
        result={reads.money}
        section={t('profile.driver.block.earnings')}
        empty={t('profile.driver.earnings.empty')}
        t={t}
        skeletonRows={2}
      >
        {(money) => (
          <>
            <BlockFigure>
              {/* §8.3.1 — the unit stated ONCE beside the figure, the way a
                  table states it once in a header. The numeral itself is
                  `Money unit="none"`. */}
              <Money
                amount={money.payableHalalas}
                unit="none"
                className="text-kpi-lead font-medium"
              />
              <span className="text-2xs text-muted-foreground">
                {t('profile.driver.earnings.unit')}
              </span>
            </BlockFigure>
            <BlockCaption>
              {money.payableHalalas < 0
                ? t('profile.driver.earnings.negative')
                : t('profile.driver.earnings.payable')}
            </BlockCaption>

            {/* The four subordinate figures, each on its own labelled line,
                each present only when it is non-zero, and **none of them ever
                combined with the payable or with each other**. */}
            <MoneyLines money={money} t={t} />

            <BlockCaption>
              <bdi>
                {lastPaidOf(reads) === null
                  ? t('profile.driver.earnings.neverPaid')
                  : t('profile.driver.earnings.lastPaid', {
                      date: formatDate(lastPaidOf(reads) as string, {
                        style: 'day-month-year',
                        language,
                      }),
                    })}
              </bdi>
            </BlockCaption>
          </>
        )}
      </SectionStates>
    </SummaryBlock>
  )
}

/**
 * `lastPayoutAt` is the one fact in this block that is **not** on the money
 * envelope, so it comes off the payout position — and only once that read has
 * answered. `undefined` while it is in flight is treated as *not yet paid*
 * rather than held back, because the line is a caption on a figure that has
 * already rendered and a caption that appears late is a jump.
 *
 * It is read here and nowhere else in the block: `payableHalalas` and
 * `cashDebtHalalas` also exist on `CaptainPayout` and are deliberately **not**
 * read from it. One figure, one source (`reads.ts`).
 */
function lastPaidOf(reads: DriverReads): string | null {
  return reads.payout.data?.items[0]?.lastPayoutAt ?? null
}

/**
 * The four labelled lines beneath the payable.
 *
 * A label and its value on one baseline — the shipped construction, not a
 * sentence with a formatted amount interpolated into it. `Money` owns the
 * isolation, so the figure cannot be walked backwards by an Arabic paragraph
 * (AC-73), and no money string is ever built by this layer.
 *
 * The block-start rule appears only when at least one line does, so a captain
 * with a clean position gets a figure and a caption and no empty divider — and
 * `Not included in the payable` goes with it, because a qualifier over nothing
 * is worse than no qualifier (AC-CP-156).
 *
 * **Owner amendment 4 removed the per-line `note` slot entirely** (§13.3 #3–#7).
 * Four sentences that rendered on every record in every state — each defining
 * the label immediately above it — became one fragment above the group. The
 * slot is gone rather than left empty: a per-line slot with no occupant is how
 * the sentences come back.
 */
function MoneyLines({ money, t }: { money: DriverMoneyMovements; t: Translator }) {
  const lines: Array<{ key: string; label: string; amount: number }> = []
  if (money.cashDebtHalalas !== 0) {
    lines.push({
      key: 'debt',
      label: t('profile.driver.field.cashDebt'),
      amount: money.cashDebtHalalas,
    })
  }
  if (money.escrowHeldHalalas !== 0) {
    lines.push({
      key: 'escrow',
      label: t('profile.driver.field.escrowHeld'),
      amount: money.escrowHeldHalalas,
    })
  }
  if (money.payoutInFlightHalalas !== 0) {
    lines.push({
      key: 'inFlight',
      label: t('profile.driver.field.payoutInFlight'),
      amount: money.payoutInFlightHalalas,
    })
  }
  if (money.pendingDeductionsHalalas !== 0) {
    lines.push({
      key: 'pendingDeductions',
      label: t('profile.driver.field.pendingDeductions'),
      amount: money.pendingDeductionsHalalas,
    })
  }
  if (lines.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-1.5">
      {/* **The group's one qualifier — owner amendment 4, §13.5.** It is said
          ONCE, above the lines it qualifies, and it is the only thing the four
          deleted per-line sentences had in common. Above rather than below,
          because a reader who has already added two of these numbers to the
          payable has already made the mistake. Never repeated per line, never
          in a heading, and never behind an ⓘ (D-CP-16) — this summary holds
          zero focusable elements and sits above the `TabsList`. */}
      <BlockCaption>{t('profile.driver.earnings.notInPayable')}</BlockCaption>
      {lines.map((line) => (
        <div key={line.key} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-xs text-muted-foreground">{line.label}</span>
          <Money amount={line.amount} className="tabular-nums" />
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── 4 · capacity ────────────────────────────── */

/**
 * How much work this captain can still be given.
 *
 * Legacy stored `stats.activeSubs` as the string `'4/5'`, which cannot be
 * compared, sorted or metered; the data layer split it into two integers, and
 * this is the first surface that spends them. A rider has no counterpart.
 *
 * The caption always names both numbers and is mandatory — the meter is
 * `aria-hidden` and the sentence is the only carrier (§7.5).
 */
export function CapacityBlock({ driver, t, language }: DriverBlockProps) {
  const { activeSubscriptions: used, maxSubscriptions: total } = driver
  return (
    <SummaryBlock label={t('profile.driver.block.capacity')}>
      {total <= 0 ? (
        /* Not an em dash and not an empty meter: `—` is reserved for
           not-applicable (§8.3.1) and an empty meter would claim a quota that
           does not exist (§3.5). */
        <BlockCaption>{t('profile.driver.capacity.none')}</BlockCaption>
      ) : (
        <>
          <BlockFigure>
            <span className="text-kpi-lead font-medium tabular-nums text-foreground">
              {formatCount(driver.openSubscriptionSlots, language)}
            </span>
          </BlockFigure>
          <BlockCaption>
            {driver.openSubscriptionSlots === 0
              ? t('profile.driver.capacity.full')
              : t.plural('profile.driver.capacity.open', {
                  count: driver.openSubscriptionSlots,
                })}
          </BlockCaption>
          <SlotMeter used={used} total={total} />
          <BlockCaption>
            <bdi>
              {t('profile.driver.capacity.used', {
                used: formatCount(used, language),
                total: formatCount(total, language),
              })}
            </bdi>
          </BlockCaption>
          {/* `multiSubException` is why this captain's ceiling may not match
              the platform default. Stated, rather than left to be inferred
              from a number that looks wrong. */}
          {driver.multiSubException && (
            <BlockCaption>{t('profile.driver.capacity.exception')}</BlockCaption>
          )}
        </>
      )}
    </SummaryBlock>
  )
}
