/**
 * The subscription sheet's panels — the record's remaining facts under two
 * tabs, and no reads of its own.
 *
 * ## Why there are no reads in this file
 *
 * Every fact below is a field on the one record `ProfileLayer` already fetched:
 * the rider and captain names are denormalised onto the row, the plan is a
 * name and a key, and the timeline is the record's own dates put in order. So
 * the sheet costs **one request**, has one loading state, and cannot show an
 * operator a half-answered record — the same contract `RequestPanels` keeps and
 * for the same reasons.
 *
 * A **Legs** tab was considered and left out. It would need
 * `listTrips({ subscriptionId })`, and seven trips in the whole fixture set
 * carry a `subscriptionId` — so on nearly every cycle the tab would be an empty
 * state sitting beside two that are not, which teaches an operator to stop
 * opening it. When the trips fixture grows legs for its cycles, that tab is one
 * read and one list away and this note is the place to start.
 *
 * ## The timeline is ORDERED, not inferred
 *
 * Every row is a date the record carries. `startedOn` and `endsOn` are the two
 * every cycle has; the rest appear exactly when their field is non-null, which
 * is what makes this a projection of the record rather than a story about it.
 *
 * **`endsOn` is in the list even when it is in the future**, and it is labelled
 * as the date the cycle *ends* rather than as something that happened. A
 * commitment's whole point is that it runs out on a stated day, and hiding that
 * row until it passes would remove the fact an operator is usually here to
 * check.
 *
 * Rules applied
 *   §3.5       an absent value is passed as `null`, never omitted, so
 *              `fields.tsx` groups them once three or more are absent together.
 *   §8.3.1     every figure goes through `MoneyValue` / `formatDate`.
 *   §9.1       the timeline's rule is a `border-s` and mirrors with the document.
 */

import { Link } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { IsoDateTime, Subscription } from '@/data/types'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { FieldList, MoneyValue } from '../fields'

export interface SubscriptionPanelsProps {
  subscription: Subscription
  /** The rider's own record. `null` renders the name as text. */
  riderHref?: string | null
  /** The captain's own record. `null` when there is none, or none resolvable. */
  captainHref?: string | null
  t: Translate
  language: Language
}

export function SubscriptionPanels({
  subscription,
  riderHref = null,
  captainHref = null,
  t,
  language,
}: SubscriptionPanelsProps) {
  const events = subscriptionEvents(subscription, t)

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
        <Group heading={t('profile.subscription.group.commitment')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              { label: t('profile.request.field.plan'), value: subscription.planName },
              {
                label: t('profile.subscription.field.tripKind'),
                value: t(
                  subscription.tripKind === 'round-trip'
                    ? 'profile.subscription.map.roundTrip'
                    : 'profile.subscription.map.oneWay',
                ),
              },
              {
                label: t('profile.request.field.vehicleClass'),
                value: subscription.vehicleClass,
              },
              {
                label: t('profile.subscription.field.legs'),
                value: t('profile.value.ratio', {
                  used: formatCount(subscription.tripsCompleted, language),
                  total: formatCount(subscription.tripsIncluded, language),
                }),
              },
              {
                label: t('profile.request.field.pickup'),
                value: subscription.pickup,
              },
              {
                label: t('profile.request.field.destination'),
                value: subscription.destination,
              },
            ]}
          />
        </Group>

        <Group heading={t('profile.request.group.money')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.subscription.figure.paid'),
                value: <MoneyValue amount={subscription.paidHalalas} />,
              },
              {
                label: t('profile.subscription.rail.escrow'),
                value:
                  subscription.escrowHeldHalalas === null ? null : (
                    <MoneyValue amount={subscription.escrowHeldHalalas} />
                  ),
              },
              {
                /* Non-null only after a settlement. `null` is *nothing was
                   refunded*, which is a different fact from `0.00`. */
                label: t('profile.field.refunded'),
                value:
                  subscription.refundedHalalas === null ? null : (
                    <MoneyValue amount={subscription.refundedHalalas} />
                  ),
              },
            ]}
          />
        </Group>

        <Group heading={t('profile.request.group.rider')}>
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.field.rider'),
                value: person(subscription.riderName, riderHref),
              },
              {
                label: t('profile.subscription.rail.captain'),
                value: person(subscription.driverName, captainHref),
              },
            ]}
          />
        </Group>

        {subscription.cancellationReason !== null && (
          <Group heading={t('profile.subscription.group.cancellation')}>
            {/* Free text in legacy — a reason CODE is a product decision, not a
                data one (`types/subscription.ts`), so it renders as the prose it
                is rather than through a lookup that would fail on half of them. */}
            <p className="text-sm text-foreground">
              <bdi>{subscription.cancellationReason}</bdi>
            </p>
          </Group>
        )}
      </TabsContent>

      {/* ── timeline ─────────────────────────────────────────────────── */}
      <TabsContent value="timeline" className="flex flex-col gap-3">
        <ol className="flex list-none flex-col gap-0">
          {events.map((event) => (
            <li key={event.key} className="flex gap-3">
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
                  <bdi>{formatDate(event.at, { style: 'day-month-year', language })}</bdi>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </TabsContent>
    </Tabs>
  )
}

/** A person's name, as a link into their own record when there is one. */
function person(name: string | null, href: string | null): React.ReactNode | null {
  if (name === null) return null
  if (href === null) return name
  return (
    <Link
      to={href}
      className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <bdi>{name}</bdi>
    </Link>
  )
}

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

interface SubscriptionEvent {
  key: string
  at: IsoDateTime
  label: string
}

/**
 * The record's own dates, newest first.
 *
 * `startedOn` and `endsOn` are `IsoDate` — a day with no time — and they sort
 * correctly against the `IsoDateTime` stamps because both are ISO-8601 and
 * `Date.parse` reads a bare date as midnight UTC. That is exact enough for a
 * list whose rows are days apart, and the rows print as days.
 */
export function subscriptionEvents(
  subscription: Subscription,
  t: Translate,
): SubscriptionEvent[] {
  const rows: SubscriptionEvent[] = [
    {
      key: 'started',
      at: subscription.startedOn,
      label: t('profile.subscription.event.started'),
    },
    {
      key: 'ends',
      at: subscription.endsOn,
      label: t('profile.subscription.event.ends'),
    },
  ]

  if (subscription.frozenUntil !== null) {
    rows.push({
      key: 'frozen',
      at: subscription.frozenUntil,
      label: t('profile.subscription.event.frozen'),
    })
  }

  if (subscription.cancelledAt !== null) {
    rows.push({
      key: 'cancelled',
      at: subscription.cancelledAt,
      label: t('profile.subscription.event.cancelled'),
    })
  }

  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
