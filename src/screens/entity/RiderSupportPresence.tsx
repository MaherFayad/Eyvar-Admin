/**
 * **Elsewhere in the console** — every support record that references this
 * rider, as presence rather than as prose.
 *
 * ```
 *  Elsewhere in the console
 *  Complaints        1 on record · 1 open
 *  Conversations     1 on record · 1 open
 *  Disputes          1 on record · 1 open
 *  Lost and found    1 on record · 1 open
 *  Fairness cases    1 on record · 1 open
 *  Ride requests     1 on record · 1 open
 *  Tickets           None
 * ```
 *
 * ## Why this block exists at all
 *
 * The reference drew one composed sentence — *"No support tickets reference
 * this record. No device recorded."* — and it is refused twice over: §9.6
 * forbids building a string by concatenation outright, and it was **false** for
 * a record that has a device. Deleting it removed the sentence and left a hole,
 * because the sheet renders this presence and the page did not. That is a
 * parity breach in the first wave of the contract meant to prevent them, and
 * this closes it.
 *
 * ## The three states, and why `total` and `open` are both needed
 *
 * `{total: 3, open: 0}` and `{total: 0, open: 0}` are different facts and read
 * differently to an operator deciding whether to look: one says *this has been
 * dealt with*, the other says *there is nothing here*. So the row has three
 * forms and the middle one is not a rounding of the others:
 *
 *   nothing on record   `None`
 *   some, none open     `3 on record · none open`
 *   some, some open     `3 on record · 1 open`
 *
 * All three are whole keys from the SHEET's dictionary (`profile.rider.support.*`),
 * so the two surfaces cannot word one presence two ways. Nothing here is
 * assembled from fragments.
 *
 * ## Two labels come from the older shared vocabulary
 *
 * `profile.rider.support.*` names five of the seven resources; `Tickets` and
 * `Disputes` are `profile.section.tickets` / `.disputes`, which have existed
 * since the section registry and are what every other profile surface calls
 * them. Minting a second `Tickets` here would be a second spelling of a word
 * this page already uses.
 *
 * Rules applied
 *   §7.2       a rail card is a read-only display. No action, no edit
 *              affordance: this block says where to look, not what to do.
 *   §9.6       every sentence is one key with named params.
 *   §11.3      loading is a skeleton shaped like the rows. Never a spinner.
 *   §9.2 #14   a failed read fails THIS card and nothing else on the page.
 */

import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import type { RiderRelatedCount, RiderSupportPresence as Presence } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatCount } from '@/lib'
import type { Language, Translator } from '@/lib'

export interface RiderSupportPresenceProps {
  result: AsyncResult<Presence>
  t: Translator
  language: Language
}

/**
 * The seven resources, in the order they are read, with the key that names
 * each. A `Record`-shaped list rather than a loop over `Object.entries` so a
 * resource cannot be added to the envelope and rendered here unlabelled.
 */
const ROWS: ReadonlyArray<{ field: keyof Presence & string; labelKey: string }> = [
  { field: 'complaints', labelKey: 'profile.rider.support.complaints' },
  { field: 'conversations', labelKey: 'profile.rider.support.conversations' },
  { field: 'disputes', labelKey: 'profile.section.disputes' },
  { field: 'lostAndFound', labelKey: 'profile.rider.support.lostAndFound' },
  { field: 'fairnessCases', labelKey: 'profile.rider.support.fairnessCases' },
  { field: 'requests', labelKey: 'profile.rider.support.requests' },
  { field: 'tickets', labelKey: 'profile.section.tickets' },
]

export function RiderSupportPresenceCard({ result, t, language }: RiderSupportPresenceProps) {
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
        message={t('profile.state.error', { section: t('profile.rider.support.heading') })}
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
            {/* A Latin numeral run inside what may be an Arabic paragraph. */}
            <bdi>{presenceLine(presence[field] as RiderRelatedCount, t, language)}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One presence, as one of three whole sentences.
 *
 * **`total === 0` is not `open === 0`.** A resource with three closed records
 * and one with none are different answers to *should I look here*, and the
 * envelope carries both fields precisely so a surface cannot flatten them.
 */
function presenceLine(count: RiderRelatedCount, t: Translator, language: Language): string {
  if (count.total === 0) return t('profile.rider.support.none')
  const total = formatCount(count.total, language)
  if (count.open === 0) return t('profile.rider.support.allClosed', { total })
  return t('profile.rider.support.some', { total, open: formatCount(count.open, language) })
}
