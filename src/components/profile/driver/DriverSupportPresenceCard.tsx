/**
 * **Elsewhere in the console** — every support record that references this
 * captain, as presence rather than as prose.
 *
 * ```
 *  Complaints        1 on record · 1 open
 *  Conversations     None
 *  Disputes          2 on record · none open
 *  Lost and found    None
 *  Fairness cases    1 on record · 1 open
 *  Tickets           None
 *  Safety incidents  1 on record · none open
 *  Cash reports      2 on record · 1 open
 *  Deductions        7 on record · none open
 * ```
 *
 * ## Why this exists on a captain and what it replaces
 *
 * `Driver.openComplaints` is **a single number with nothing behind it**, and it
 * counts complaints only. A profile that answered *"is anything open against
 * this captain"* from that field would say `0` for a captain with an open
 * dispute, an unresolved cash report and a fairness case under review — which
 * is `DRV-0202` exactly. `getDriverSupportPresence` asks all nine.
 *
 * **Nine, where the rider has seven**, and the difference is the point:
 * **safety incidents**, **cash reports** and **deductions** are collections a
 * captain has and a rider cannot, and **ride requests** are the reverse — a
 * captain does not hail a ride. This card is not the rider's card with a
 * different record id in it.
 *
 * ## Three states per row, and the middle one is not a rounding of the others
 *
 * `{total: 3, open: 0}` and `{total: 0, open: 0}` are different facts and read
 * differently to an operator deciding whether to look: one says *this has been
 * dealt with*, the other says *there is nothing here*. So:
 *
 *   nothing on record   `None`
 *   some, none open     `3 on record · none open`
 *   some, some open     `3 on record · 1 open`
 *
 * All three are whole keys and nothing is assembled from fragments (§9.6).
 * **The three sentences are the rider's own** (`profile.rider.support.*`),
 * reused rather than restated: a presence line means the same thing on both
 * records, and a second spelling of `3 on record · 1 open` would be a second
 * place for it to drift. Only the two labels a captain has and a rider does not
 * are minted under `profile.driver.`.
 *
 * Rules applied
 *   §7.2       a rail card is a read-only display. No action and no edit
 *              affordance: this block says where to look, not what to do.
 *   §11.3      loading is a skeleton shaped like the rows. Never a spinner.
 *   §9.2 #14   a failed read fails THIS card and nothing else on the surface.
 *   AC-73      a count line is a Latin numeral run inside what may be an Arabic
 *              paragraph, so every value is `<bdi>`-isolated.
 */

import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import type { DriverSupportPresence, RelatedCount } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatCount, type Language, type Translator } from '@/lib'

export interface DriverSupportPresenceCardProps {
  result: AsyncResult<DriverSupportPresence>
  t: Translator
  language: Language
}

/**
 * The nine collections, in the order they are read, with the key that names
 * each.
 *
 * A declared list rather than a loop over `Object.entries` so a tenth
 * collection cannot be added to the envelope and rendered here unlabelled — and
 * `computedAt` and `driverId`, which are on the envelope and are not
 * collections, cannot be swept in.
 *
 * Seven labels are shared vocabulary the rider profile already owns; only
 * `safetyIncidents` and `cashReports` are minted for the captain, because a
 * rider has neither. `deductions` takes the sheet's own heading, which is the
 * same word its own section uses two inches away.
 */
const ROWS: ReadonlyArray<{ field: keyof DriverSupportPresence & string; labelKey: string }> = [
  { field: 'complaints', labelKey: 'profile.rider.support.complaints' },
  { field: 'conversations', labelKey: 'profile.rider.support.conversations' },
  { field: 'disputes', labelKey: 'profile.section.disputes' },
  { field: 'lostAndFound', labelKey: 'profile.rider.support.lostAndFound' },
  { field: 'fairnessCases', labelKey: 'profile.rider.support.fairnessCases' },
  { field: 'tickets', labelKey: 'profile.section.tickets' },
  { field: 'safetyIncidents', labelKey: 'profile.driver.support.safetyIncidents' },
  { field: 'cashReports', labelKey: 'profile.driver.support.cashReports' },
  { field: 'deductions', labelKey: 'profile.driver.deductions.heading' },
]

export function DriverSupportPresenceCard({
  result,
  t,
  language,
}: DriverSupportPresenceCardProps) {
  if (result.status === 'loading') {
    return (
      <div className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <Skeleton key={row.field} className="h-4 w-full" />
        ))}
      </div>
    )
  }

  if (result.status === 'error' || result.data === null) {
    return (
      <ErrorState
        scope="card"
        card={false}
        message={t('profile.state.error', { section: t('profile.driver.support.heading') })}
        action={{ label: t('profile.state.retry'), onClick: result.refetch }}
      />
    )
  }

  const presence = result.data

  return (
    <dl data-numeric className="flex flex-col gap-1.5 text-sm">
      {ROWS.map(({ field, labelKey }) => (
        <div key={field} className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-xs text-muted-foreground">{t(labelKey)}</dt>
          <dd className="min-w-0 text-end text-foreground">
            <bdi>{presenceLine(presence[field] as RelatedCount, t, language)}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One presence, as one of three whole sentences.
 *
 * **`total === 0` is not `open === 0`.** A collection with three closed records
 * and one with none are different answers to *should I look here*, and the
 * envelope carries both fields precisely so a surface cannot flatten them.
 */
function presenceLine(count: RelatedCount, t: Translator, language: Language): string {
  if (count.total === 0) return t('profile.rider.support.none')
  const total = formatCount(count.total, language)
  if (count.open === 0) return t('profile.rider.support.allClosed', { total })
  return t('profile.rider.support.some', { total, open: formatCount(count.open, language) })
}
