/**
 * **The dated history** — spec §7.7, reference
 * `02-orders/order-detail-timeline-full-history.webp`.
 *
 * ```
 *  History ───────────────────────────────────────────────────────────────
 *
 *  25 Jun
 *    ●  Trip requested                                          09:11
 *       حي حطين → مستشفى الملك فيصل التخصصي · No captain was assigned.
 *  22 Jun
 *    ●  Account registered                                      00:00
 *       Riyadh, SA · New tier
 * ```
 *
 * ## It is a server read, not a client merge
 *
 * `getRiderTimeline` derives the events across three resources — the account,
 * its subscriptions and its trips — and `types/rider.ts` says why it must:
 * *"a side sheet and a full page merging those three each is the 'two screens,
 * two answers' defect"*, and same-day ordering has more than one plausible
 * answer and must have exactly one. So this component receives events and
 * arranges them; it decides nothing about what is in them.
 *
 * ## It carries no rendered string either
 *
 * An event is `{ at, kind, recordId, recordType, detail }`. `riderTimelineStrings`
 * — `src/i18n/vocabulary/copy.ts`, shared with the sheet — turns that into a
 * title, a subtitle and a note, and it owns the branching as well as the
 * vocabulary: which variant a missing `destination` selects, whether a
 * place-less registration falls back or throws. A pre-joined title would be
 * untranslatable and would take the link with it.
 *
 * Rules applied
 *   §3.8        date heading, one row per event, a dot at the inline-START and
 *               the time at the inline-END. **No connecting rule** — the
 *               reference frame has none, and a rule through a restacking
 *               column is a maintenance liability for no reading.
 *   §10.5       the dots MIRROR: they are chrome, so they take the row's
 *               inline-start and the timestamp its inline-end. `ms-`/`me-`,
 *               never `ml-`/`mr-`.
 *   R8/§9.3     empty is ONE grey sentence, and it is `states.md`'s **third**
 *               kind: nothing is captured, so there is nothing to query or to
 *               rank. Never `no-match`, which would claim a filter is narrowing.
 *   §3.8        **no composer.** §3.8 puts one above a feed; a timeline of
 *               system events has nothing to compose against.
 */

import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SectionHeading } from '@/components/metrics'
import { Skeleton } from '@/components/ui/skeleton'
import type { Paginated, RiderTimelineEvent } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { riderTimelineStrings } from '@/i18n/vocabulary/copy'
import { formatDate } from '@/lib'
import type { Language, Translator } from '@/lib'

export interface RiderHistoryProps {
  result: AsyncResult<Paginated<RiderTimelineEvent>>
  t: Translator
  language: Language
}

export function RiderHistory({ result, t, language }: RiderHistoryProps) {
  const events = result.data?.items ?? []

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('entity.rider.history.title')} />

      {result.status === 'loading' && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-72" />
            </div>
          ))}
        </div>
      )}

      {result.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('profile.state.error', { section: t('entity.rider.history.title') })}
          action={{ label: t('profile.state.retry'), onClick: result.refetch }}
        />
      )}

      {result.status !== 'loading' && result.status !== 'error' && events.length === 0 && (
        <EmptyState kind="no-match" card={false} message={t('profile.rider.activity.empty')} />
      )}

      {events.length > 0 && (
        <ol className="flex list-none flex-col gap-4">
          {groupByDay(events, language).map((day) => (
            <li key={day.heading} className="flex flex-col gap-2">
              {/* The date heading. `<bdi>` because `25 يونيو` is a numeral run
                  inside what may be an Arabic paragraph. */}
              <h3 className="text-xs font-medium text-foreground">
                <bdi>{day.heading}</bdi>
              </h3>
              <ol className="flex list-none flex-col gap-2.5">
                {day.events.map((event) => (
                  <TimelineRow key={event.id} event={event} t={t} language={language} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {result.data !== null && result.data.total > events.length && (
        /* §5.4 — the end of a truncated list is stated in words, never implied. */
        <p className="text-xs text-muted-foreground">
          {t('profile.list.truncated', { shown: events.length, total: result.data.total })}
        </p>
      )}
    </section>
  )
}

function TimelineRow({
  event,
  t,
  language,
}: {
  event: RiderTimelineEvent
  t: Translator
  language: Language
}) {
  const strings = riderTimelineStrings(t, event, language)
  const time = formatDate(event.at, { style: 'day-month-time', language })

  return (
    <li className="flex items-start gap-3">
      {/* §10.5 — the dot takes the row's inline-start and mirrors with it. It is
          decoration: the title beside it is what is announced. R18 — static. */}
      <span
        aria-hidden="true"
        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm text-foreground">
            {/* The record this event is about, when it has one. `?entity=` opens
                the 360° layer over the current route rather than replacing it,
                which is the shell's own convention for reaching a record from
                inside another. */}
            {event.recordId === null ? (
              strings.title
            ) : (
              <Link
                to={`?entity=${event.recordId}`}
                className="rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {strings.title}
              </Link>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            <bdi>{time}</bdi>
          </span>
        </div>
        {strings.subtitle !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>{strings.subtitle}</bdi>
          </p>
        )}
        {strings.note !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>{strings.note}</bdi>
          </p>
        )}
      </div>
    </li>
  )
}

/**
 * Events grouped under one heading per day, in the order the server returned
 * them (newest first).
 *
 * The heading is the FORMATTED day, so two events on one day group whatever
 * their instants are, and the grouping key is the same string the reader sees —
 * there is no second date derivation to drift from the one on screen.
 */
function groupByDay(
  events: readonly RiderTimelineEvent[],
  language: Language,
): Array<{ heading: string; events: RiderTimelineEvent[] }> {
  const days: Array<{ heading: string; events: RiderTimelineEvent[] }> = []
  for (const event of events) {
    const heading = formatDate(event.at, { style: 'day-month', language })
    const last = days[days.length - 1]
    if (last !== undefined && last.heading === heading) last.events.push(event)
    else days.push({ heading, events: [event] })
  }
  return days
}
