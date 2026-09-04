/**
 * **The captain's own lifecycle**, from one server-derived read.
 *
 * ```
 *  Trip completed · Nora Al-Otaibi                       TRP-7741 · 25 Jun 07:00
 *  Operating card expired                                           14 Jun
 *  Bank account changed · Al Rajhi Bank → Riyad Bank                 2 Mar
 *  Account registered · Gold, Economy                                1 Feb 2025
 *  Showing 6 of 21.
 * ```
 *
 * ## One list, and it is the server's
 *
 * `getDriverTimeline` merges the account, its trips, its expired documents and
 * its bank-account changes **server-side**, for the reason `types/rider.ts`
 * states about the rider's: *"two surfaces merging three resources each is the
 * two-answers defect, and same-day ordering must have exactly one answer."* An
 * earlier cut of this file merged `listTrips` with `Driver.movementLog` in the
 * component and kept the two groups apart precisely so it would not have to
 * invent a tie-break. That is gone; there is one list and one order.
 *
 * ## What the timeline does not carry, and why each absence is deliberate
 *
 * - **Money.** Both surfaces already draw the movements as their own card;
 *   putting them here too turns a twenty-event history into thirty, a third of
 *   it repeating the card above it.
 * - **Complaints, disputes, incidents, fairness cases.** Those are support
 *   records and they are the support presence card. The rule — *the timeline is
 *   the record's own lifecycle* — is identical on both profiles.
 * - **The suspension.** A timeline event needs a time, and `Driver` carries
 *   `suspended` and `suspensionReason` but **no `suspendedAt`**. Placing it
 *   here would mean inventing a date, which is worse than omitting it. The two
 *   surfaces divide cleanly instead: the **banner** reports the current state
 *   (*this captain is suspended*), the timeline says nothing about it, and
 *   neither lies. **If a dated suspension is ever wanted on this list,
 *   `Driver.suspendedAt` is the one change that unlocks it** — the absence is a
 *   decision, not an oversight.
 * - **`expiring` and `critical` documents.** Only `expired` produces an event.
 *   The other two are dated in the *future* and have not happened; a history
 *   that lists them is not a history. The documents section draws them with the
 *   days remaining computed against a passed clock.
 *
 * ## The sentence comes from `kind`, and the placeholders from `detail`
 *
 * No row carries a rendered sentence across the seam. `detail` is typed per
 * `kind` and **no arm has an optional key**, which is a structural guarantee
 * rather than a convention: `interpolate` *throws* on an omitted parameter, so
 * an optional placeholder is a crash waiting for the first record that lacks
 * it. The switch below is exhaustive over the union, so a twelfth kind does not
 * compile until it has a sentence.
 *
 * Rules applied
 *   §9.2 #14   the read owns its four states here; a failed timeline leaves the
 *              rest of the surface working.
 *   §5.4       a truncated list states its end in words, so the page and the
 *              rows reconcile by reading rather than by counting pixels.
 *   §3.8/§10.5 the row is a title at the inline-start and a timestamp at the
 *              inline-end. `ms-`/`me-` only; there is no connecting rule to
 *              mirror.
 *   §9.6       every sentence is one key with named parameters. Nothing is
 *              joined, and nothing is joined *conditionally* either.
 *   R8/AC-37   an empty list is ONE grey sentence.
 */

import { SectionStates } from '../SectionCard'
import type { DriverTimelineEvent } from '@/data/types'
import type { AsyncResult, } from '@/hooks'
import type { Paginated } from '@/data/types'
import { formatDate, type Language, type Translator } from '@/lib'
import { DOC_LABEL } from './facts'

export interface DriverTimelineProps {
  result: AsyncResult<Paginated<DriverTimelineEvent>>
  t: Translator
  language: Language
}

export function DriverTimeline({ result, t, language }: DriverTimelineProps) {
  return (
    <SectionStates
      result={result}
      section={t('profile.driver.tab.activity')}
      empty={t('profile.driver.activity.empty')}
      t={t}
      skeletonRows={6}
    >
      {(page) => (
        <div className="flex flex-col gap-2">
          <ul className="flex list-none flex-col divide-y divide-border">
            {page.items.map((event) => (
              <TimelineRow key={event.id} event={event} t={t} language={language} />
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

function TimelineRow({
  event,
  t,
  language,
}: {
  event: DriverTimelineEvent
  t: Translator
  language: Language
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-1.5 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">
          <bdi>{timelineSentence(event, t)}</bdi>
        </p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        {/* Two isolated runs with a decorative separator between them, never
            one string joined from two (§9.6). An id and a timestamp are Latin
            runs whose internal separators are bidi-neutral (AC-73). */}
        <bdi className="tabular-nums">
          {event.recordId === null ? '' : event.recordId}
        </bdi>
        {event.recordId !== null && <span aria-hidden="true"> · </span>}
        <bdi className="tabular-nums">
          {formatDate(event.at, { style: 'day-month-time', language })}
        </bdi>
      </p>
    </li>
  )
}

/**
 * `kind` picks the sentence; `detail` fills it.
 *
 * **Exhaustive over the union by type**, so an eighth `DriverTimelineKind`
 * without a sentence is a compile error rather than a raw key an operator
 * meets. `detail` narrows with `kind` because `DriverEvent` is a discriminated
 * generic, so no arm can read a field another arm carries.
 *
 * `docType` is resolved through `DOC_LABEL` — the five names
 * `ComplianceView` already owns — rather than through a sixth spelling minted
 * for this list.
 */
export function timelineSentence(event: DriverTimelineEvent, t: Translator): string {
  switch (event.kind) {
    case 'account-registered':
      return t('profile.driver.timeline.registered', {
        tier: t(`people.tier.${event.detail.tier}`),
        vehicleClass: t(
          event.detail.vehicleClass === 'Economy' ? 'people.class.economy' : 'people.class.comfort',
        ),
      })
    case 'trip-requested':
      return t('profile.driver.timeline.tripRequested', { rider: event.detail.riderName })
    case 'trip-completed':
      return t('profile.driver.timeline.tripCompleted', { rider: event.detail.riderName })
    case 'trip-cancelled':
      return t('profile.driver.timeline.tripCancelled', { rider: event.detail.riderName })
    case 'trip-no-show':
      return t('profile.driver.timeline.tripNoShow', { rider: event.detail.riderName })
    case 'document-expired':
      return t('profile.driver.timeline.documentExpired', {
        document: t(DOC_LABEL[event.detail.docType]),
      })
    case 'bank-account-changed':
      return t('profile.driver.timeline.bankChanged', {
        from: event.detail.fromBank,
        to: event.detail.toBank,
        reason: event.detail.reason,
      })
  }
}
