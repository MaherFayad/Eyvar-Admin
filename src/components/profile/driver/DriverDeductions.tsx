/**
 * **What has been taken off this captain's payable, and why.**
 *
 * ```
 *  Late pickup (13 min)          Applied     DED-108 · raised 9 Jun · TRP-8046      5.00 SAR
 *  Vehicle cleanliness           Applied     DED-118 · raised 19 Apr · TRP-8109    15.00 SAR
 * ```
 *
 * A rider has no counterpart to this list. A deduction is money the platform
 * takes back off what it owes a captain, and it is the other half of the story
 * the payable ledger tells in postings: `applyDeduction` posts a debit on
 * `liability.driver` (and, where the deduction exceeds the payable, a second on
 * `ar.driver`), so an operator reading the ledger and asking *"why did this go
 * down"* finds the answer here rather than by decoding a posting reference.
 *
 * ## Why the amounts are positive and unsigned
 *
 * `Deduction.amountHalalas` is a positive integer by contract, exactly as a
 * `LedgerPosting`'s is. The direction is not a sign and is not a colour: every
 * row in this group is money coming off the captain, and the **group says so**
 * once, in its heading, rather than sixty rows each carrying a minus the reader
 * has to interpret. §8.3.2 / AC-300.
 *
 * ## There is no `Apply` or `Waive` control here
 *
 * Both operations exist (`applyDeduction`, `waiveDeduction`) — which is what
 * makes this different from the rider's two removed buttons — and both are
 * already declared on the Deductions screen, with the §5.3 confirmation and the
 * validated reason code they require. §5.5 forbids a modal nested inside the
 * profile modal, so the sheet could not host that confirmation and the page
 * could; a command present on one profile surface and absent from the other is
 * exactly what §3's parity contract refuses. Declaring them a second time here
 * is also the divergence `commands/captains.ts` was created to remove. See
 * `copy.ts`.
 *
 * Rules applied
 *   R5a         `waived` and `applied` are terminal factual outcomes and take
 *               `neutral`; `pending` needs attention and takes the ONE warning
 *               tone (R17). No red: a deduction is not one of red's four uses.
 *   §7.5        the state is a word as well as a tone.
 *   §11 / §9.6  the reason is a `LocalisedText` the DATA layer mints
 *               (`fin.deduction.*`), resolved through `formatLocalisedText`.
 *               Never a sentence this layer assembled.
 *   §5.4        a truncated list states its end in words.
 *   R8/AC-37    an empty group is ONE grey sentence.
 */

import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { SectionStates } from '../SectionCard'
import type { BadgeTone, Deduction, DeductionState, Paginated } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatDate, formatLocalisedText } from '@/lib'
import type { Language, Translator } from '@/lib'
import { DRIVER_LIST_ROWS } from './reads'

/**
 * R7's five tones, and the same three readings every other status map in the
 * product uses: a terminal factual outcome is `neutral`, something needing
 * attention is `warning`, and there is no red badge (R5a).
 */
const DEDUCTION_TONE: Readonly<Record<DeductionState, BadgeTone>> = {
  pending: 'warning',
  applied: 'neutral',
  waived: 'neutral',
}

export interface DriverDeductionsProps {
  result: AsyncResult<Paginated<Deduction>>
  t: Translator
  language: Language
}

export function DriverDeductions({ result, t, language }: DriverDeductionsProps) {
  return (
    <SectionStates
      result={result}
      section={t('profile.section.payments')}
      empty={t('profile.driver.deductions.empty')}
      t={t}
      skeletonRows={3}
    >
      {(page) => (
        <div className="flex flex-col gap-2">
          <ul className="flex list-none flex-col divide-y divide-border">
            {page.items.map((deduction) => (
              <DeductionRow
                key={deduction.id}
                deduction={deduction}
                t={t}
                language={language}
              />
            ))}
          </ul>
          {page.total > page.items.length && (
            <p className="text-xs text-muted-foreground">
              {t('profile.list.truncated', { shown: page.items.length, total: page.total })}
            </p>
          )}
        </div>
      )}
    </SectionStates>
  )
}

/** Rows the deduction list holds, so a caller's skeleton matches the content. */
export const DEDUCTION_ROWS = DRIVER_LIST_ROWS

function DeductionRow({
  deduction,
  t,
  language,
}: {
  deduction: Deduction
  t: Translator
  language: Language
}) {
  const date = formatDate(deduction.raisedAt, { style: 'day-month', language })
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm text-foreground">
          {formatLocalisedText(deduction.type, t)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {/* One key per shape, chosen — never one key plus a clause appended
              when a trip happens to be attached (§9.6). */}
          <bdi className="tabular-nums">
            {deduction.tripId === null
              ? t('profile.driver.deduction.meta', { id: deduction.id, date })
              : t('profile.driver.deduction.onTrip', {
                  id: deduction.id,
                  date,
                  trip: deduction.tripId,
                })}
          </bdi>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge tone={DEDUCTION_TONE[deduction.status]}>
          {t(`fin.deduction.status.${deduction.status}`)}
        </StatusBadge>
        {/* Positive and unsigned. The group says which way it moves. */}
        <Money amount={deduction.amountHalalas} className="text-sm" />
      </div>
    </li>
  )
}
