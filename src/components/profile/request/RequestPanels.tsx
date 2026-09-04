/**
 * The request sheet's panels — everything about the ride that is not a
 * standing fact, under two tabs.
 *
 * ```
 *  Details │ Timeline 6
 *  ───────────────────────────────────
 *  THE RIDE
 *  ┌───────────────┬───────────────┐
 *  │ Type          │ Vehicle class │      a FactGrid, so a label and its
 *  │ Instant       │ Comfort       │      value are never far apart
 *  └───────────────┴───────────────┘
 *  MONEY
 *  …
 * ```
 *
 * ## Why there are no reads in this file, and why that is the whole design
 *
 * A rider's sheet issues four collection reads and a captain's five, because
 * their records are summaries of things that happened elsewhere. **A request is
 * not.** Every fact below is a field on the one record `ProfileLayer` already
 * fetched — the rider's name and rating are denormalised onto the row
 * (`types/request.ts` says why: legacy called `nm2(r.rider)` per row per
 * render), the captain's name likewise, and the timeline is the record's own
 * timestamps put in order.
 *
 * So the sheet costs **one request**, has one loading state, and cannot show an
 * operator a half-answered record. The moment this file grows a `useAsync` is
 * the moment it needs a reason better than *more would be nice*.
 *
 * ## The timeline is ORDERED, not inferred
 *
 * Every row is a stamp the record carries, sorted by its own instant. Nothing
 * is invented and nothing is computed from something else — there is no
 * `offeredAt` field, so the offer's row is the moment its reply window closes,
 * which is the field that exists (`offerExpiresAt`), and it is labelled as that
 * rather than back-dated by the 12 seconds `OFFER_WINDOW_SECONDS` would allow
 * us to guess.
 *
 * Rules applied
 *   §3.5       an absent value is passed as `null`, never omitted, so
 *              `fields.tsx` groups them into one `Not recorded:` line once
 *              three or more are absent together. A subscription request's
 *              four instant-only fields are exactly that case.
 *   §8.3.1     every figure goes through `Money` / `formatDate` /
 *              `formatDecimal`. Nothing is assembled from parts (§9.6).
 *   §7.5       the timeline's marks are dots of one colour; what separates the
 *              rows is the SENTENCE, never the hue.
 *   §12.1      no badge on a person and none on a timestamp.
 *   §9.1       logical utilities only. The timeline's rule is a `border-s` and
 *              mirrors with the document.
 */

import { Link } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { IsoDateTime, RideRequest } from '@/data/types'
import { formatCount, formatDate, formatDecimal, type Language, type Translate } from '@/lib'
import { FieldList, MoneyValue } from '../fields'

export interface RequestPanelsProps {
  request: RideRequest
  /**
   * **Where the rider's own record is, and why this prop exists.**
   *
   * Before this sheet, the queue's identity cell opened the RIDER — so an
   * operator selecting a row landed on a person. Making the row open the ride
   * is the fix, but it would have quietly removed the only path from this queue
   * to the person waiting on it. The name is therefore a link, and this is the
   * href.
   *
   * It is a prop rather than a `useLocation` call here because the overlay's
   * address is the shell's business: `ProfileLayer` already knows the path and
   * already owns `?entity=`, and a component under `components/` reaching into
   * `shell/routeState` to rebuild the same query string would be a second
   * answer to where a record lives. `null` renders the name as text, which is
   * what the full-page surface wants.
   */
  riderHref?: string | null
  t: Translate
  language: Language
}

export function RequestPanels({ request, riderHref = null, t, language }: RequestPanelsProps) {
  const events = requestEvents(request, t)
  const isSubscription = request.channel === 'subscription'

  return (
    <Tabs defaultValue="details" className="min-w-0 flex-1 gap-3 p-4">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="details" className="flex-none">
          {t('profile.request.tab.details')}
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex-none">
          {t('profile.request.tab.timeline')}
          <span className="text-2xs tabular-nums text-muted-foreground">
            {formatCount(events.length, language)}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* ── details ──────────────────────────────────────────────────── */}
      <TabsContent value="details" className="flex flex-col gap-5">
        <Group heading={t('profile.request.group.ride')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.request.field.channel'),
                value: t(`requests.channel.${request.channel}`),
              },
              {
                label: t('profile.request.field.vehicleClass'),
                value: request.vehicleClass,
              },
              {
                label: t('profile.request.field.requestedAt'),
                value: formatDate(request.requestedAt, { style: 'day-month-time', language }),
              },
              {
                label: t('profile.request.field.slaDue'),
                value:
                  request.slaDueAt === null
                    ? null
                    : formatDate(request.slaDueAt, { style: 'day-month-time', language }),
              },
              /**
               * **Subscription-only, and ABSENT on the other channel rather
               * than `null`.**
               *
               * §3.5's `null` means *this record could carry a value and does
               * not* — `Not recorded`. A plan on an instant ride request is not
               * that: an instant request has no plan **by construction**
               * (`types/request.ts` declares `planKey` non-null only on the
               * subscription channel), so printing `Plan — Not recorded` would
               * report a gap in the data where there is none, and would put two
               * such lines on every instant row.
               *
               * The distinction is the one §8.3.1 already draws between absent
               * and not-applicable. Not-applicable, on a whole channel, is a
               * field that does not belong on the card.
               */
              ...(request.channel === 'subscription'
                ? [
                    {
                      label: t('profile.request.field.plan'),
                      value:
                        request.planKey === null ? null : t(`subs.plan.${request.planKey}`),
                    },
                    {
                      label: t('profile.request.field.preferredTime'),
                      value: request.preferredPickupTime,
                    },
                  ]
                : []),
            ]}
          />
        </Group>

        <Group heading={t('profile.request.group.money')}>
          <FieldList
            layout="grid"
            t={t}
            /* **One figure, chosen by the channel** — same rule as the plan
               fields above. The two are separate fields on the record because
               they are separate facts, and exactly one of them applies to any
               given request. Showing the other as `Not recorded` claims the
               data is missing something it was never going to have. */
            fields={[
              isSubscription
                ? {
                    label: t('profile.request.field.hold'),
                    value: money(request.authorisationHoldHalalas),
                  }
                : {
                    label: t('profile.request.field.fare'),
                    value: money(request.quotedFareHalalas),
                  },
            ]}
          />
          {/* The caveat the floating card on the map has no room for. It is a
              caption under the pair rather than a field, because it qualifies
              the figure rather than adding a fact. */}
          <p className="text-xs text-muted-foreground">
            {t(
              isSubscription ? 'profile.request.rail.holdNote' : 'profile.request.rail.fareNote',
            )}
          </p>
        </Group>

        <Group heading={t('profile.request.group.rider')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.field.rider'),
                value:
                  riderHref === null ? (
                    request.riderName
                  ) : (
                    <Link
                      to={riderHref}
                      className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <bdi>{request.riderName}</bdi>
                    </Link>
                  ),
              },
              {
                /* `null` is *no rating yet* — the most common row in a growth
                   month (`types/request.ts`) — and is never rendered as `0`. */
                label: t('profile.request.field.riderRating'),
                value:
                  request.riderRating === null
                    ? null
                    : t('profile.value.stars', {
                        value: formatDecimal(request.riderRating, 1, language),
                      }),
              },
              {
                label: t('profile.request.field.priorSubscription'),
                value: t(request.riderHasPriorSubscription ? 'profile.value.yes' : 'profile.value.no'),
              },
            ]}
          />
        </Group>

        <Group heading={t('profile.request.group.captain')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.request.field.captain'),
                value: request.assignedDriverName ?? request.offeredToDriverName,
              },
              {
                label: t('profile.request.field.offerExpires'),
                value:
                  request.offerExpiresAt === null
                    ? null
                    : formatDate(request.offerExpiresAt, { style: 'day-month-time', language }),
              },
              {
                label: t('profile.request.field.assignedBy'),
                value: request.assignedByUserName,
              },
              /* The subscription this request created, which only the
                 subscription channel can have. Same reasoning as the plan
                 fields: `Subscription created — Not recorded` on every instant
                 ride is a gap reported where none exists. */
              ...(isSubscription
                ? [
                    {
                      label: t('profile.request.field.subscription'),
                      value: request.assignedSubscriptionId,
                    },
                  ]
                : []),
            ]}
          />
        </Group>

        <Group heading={t('profile.request.group.notes')}>
          {/* Free text from the rider, and `null` when there is none — not `''`
              (`types/request.ts`). `<bdi>` because a note is arbitrary text in
              either script sitting inside the sheet's own paragraph. */}
          {request.notes === null ? (
            <p className="text-sm text-muted-foreground">{t('profile.request.notes.empty')}</p>
          ) : (
            <p className="text-sm text-foreground">
              <bdi>{request.notes}</bdi>
            </p>
          )}
        </Group>
      </TabsContent>

      {/* ── timeline ─────────────────────────────────────────────────── */}
      <TabsContent value="timeline" className="flex flex-col gap-3">
        <ol className="flex list-none flex-col gap-0">
          {events.map((event) => (
            <li key={event.key} className="flex gap-3">
              {/* The rule and the dot: one column, drawn with a `border-s` so it
                  mirrors with the document. `aria-hidden` — the order is the
                  list's, and a screen reader gets it from the `<ol>`. */}
              <span
                aria-hidden="true"
                className="relative flex w-2 shrink-0 justify-center border-s border-border"
              >
                <span className="absolute top-2 size-1.5 -translate-x-1/2 rounded-full bg-border-control" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
                <p className="text-sm text-foreground">
                  <bdi>{event.label}</bdi>
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <bdi>{formatDate(event.at, { style: 'day-month-time', language })}</bdi>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </TabsContent>
    </Tabs>
  )
}

/** A labelled group inside a tab. Heading, then the pairs. */
function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {heading}
      </h4>
      {children}
    </section>
  )
}

/**
 * `MoneyValue`, the same node `sections.tsx` and `rail.tsx` hand a `Field`, so
 * one component decides how a figure is weighted across all three surfaces.
 * `null` is the empty pair and renders §3.5's placeholder — never `0.00 SAR`.
 */
function money(amount: number | null): React.ReactNode | null {
  return amount === null ? null : <MoneyValue amount={amount} />
}

interface RequestEvent {
  key: string
  at: IsoDateTime
  label: string
}

/**
 * The record's own stamps, in order.
 *
 * Newest first, matching every other history the console shows. `requestedAt`
 * is the one row every request has; the rest are present exactly when their
 * field is non-null, which is what makes this a projection of the record rather
 * than a story about it.
 */
export function requestEvents(request: RideRequest, t: Translate): RequestEvent[] {
  const rows: RequestEvent[] = [
    {
      key: 'requested',
      at: request.requestedAt,
      label: t('profile.request.event.requested'),
    },
  ]

  if (request.claim !== null) {
    rows.push({
      key: 'claimed',
      at: request.claim.claimedAt,
      label: t('profile.request.event.claimed', { name: request.claim.ownerName }),
    })
  }

  if (request.offerExpiresAt !== null && request.offeredToDriverName !== null) {
    rows.push({
      key: 'offer',
      at: request.offerExpiresAt,
      label: t('profile.request.event.offerCloses', { name: request.offeredToDriverName }),
    })
  }

  /* **A stamp, never `slaDueAt < now`.** `types/workQueue.ts` is unambiguous
     about it: a naive comparison calls every closed row in the archive
     overdue. This row exists iff the promise was actually broken. */
  if (request.slaBreachedAt !== null) {
    rows.push({
      key: 'breached',
      at: request.slaBreachedAt,
      label: t('profile.request.event.breached'),
    })
  }

  if (request.assignedAt !== null) {
    const name = request.assignedDriverName
    rows.push({
      key: 'assigned',
      at: request.assignedAt,
      /* Two keys rather than one with an optional clause: legacy stores
         `assignedBy` as a NAME STRING WITH NO ID and it can be absent, and a
         sentence assembled from a conditional clause is still assembled (§9.6). */
      label:
        request.assignedByUserName === null
          ? t('profile.request.event.assigned', { name: name ?? '' })
          : t('profile.request.event.assignedBy', {
              name: name ?? '',
              actor: request.assignedByUserName,
            }),
    })
  }

  if (request.expiredAt !== null) {
    rows.push({ key: 'expired', at: request.expiredAt, label: t('profile.request.event.expired') })
  }

  if (request.cancelledAt !== null) {
    rows.push({
      key: 'cancelled',
      at: request.cancelledAt,
      label: t('profile.request.event.cancelled'),
    })
  }

  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
