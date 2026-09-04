/**
 * **The two people on the ride** — the passenger card and the captain card.
 *
 * ```
 *  ┌───────────────────────────────────────────┐
 *  │ PASSENGER                    [Call rider] │
 *  │ (NA)  Nora Al-Harbi                       │
 *  │ Subscription  SUB-1041 · Weekly · leg 5/5 │
 *  │ Mobile        +966 55 118 4402            │
 *  │ Rating given  3.0 — “captain was late”    │
 *  └───────────────────────────────────────────┘
 * ```
 *
 * ## Why the phone number is on this surface at all
 *
 * It is the one thing an operator needs and the record does not carry: `Trip`
 * denormalises the rider's and captain's NAMES for the index table and nothing
 * else, so answering *"ring the rider"* meant leaving the ride, opening a
 * profile, copying a number, and coming back to a sheet that had closed. Two
 * reads — the rider's row and the captain's — put both numbers where the
 * question is asked.
 *
 * They are `tel:` links and not buttons. A number an operator cannot copy, or
 * cannot dial from a phone, is a number they will read out loud and mistype.
 *
 * ## §11.2 — the captain card renders on a ride that never had one
 *
 * A trip cancelled before assignment has `driverId: null`. The card does not
 * disappear: it renders with the sentence saying why there is nobody to call.
 * Hiding it would leave an operator wondering whether the sheet was still
 * loading, which is the systemic legacy defect §11.2 exists to end — *the
 * operator clicks, waits, and is told no*.
 *
 * ## The subscription line is the SUBSCRIPTION TRIPS sheet
 *
 * `Operations › Subscription trips` and `Operations › Quick rides` are one
 * screen over one resource split by `kind` (`DECISIONS.md` D1b), and the record
 * behind them is one record. The only thing a subscription leg has that a quick
 * ride does not is its plan and its position in it, and that is this line —
 * *"SUB-1041 · Weekly Economy · leg 5 of 5"*, one key with three placeholders
 * (AC-75). A quick ride simply does not render it, which is why there is one
 * sheet and not two.
 *
 * Rules applied
 *   §8.3.1     `—` is not-applicable only. *Not rated* is a KNOWN fact and
 *              reads in words.
 *   §7.5       the captain's standing is words and figures, never a colour.
 *   R4         every figure is `tabular-nums`.
 *   AC-73      `<bdi>` on every numeric run — `+966 55 118 4402` walks
 *              backwards in an Arabic paragraph without it.
 */

import type { ReactNode } from 'react'
import { PhoneIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Driver, Rider, Subscription, Trip } from '@/data/types'
import { formatCount, formatDecimal, formatPercent, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TripPartiesProps {
  trip: Trip
  /** The rider's own row, for the phone and the rating note. `null` while it loads or fails. */
  rider: Rider | null
  captain: Driver | null
  /** The plan this leg belongs to. `null` on a quick ride, and on a leg whose plan was purged. */
  subscription: Subscription | null
  /** `?entity=` hrefs, computed by the presentation. A component does not know the router's shape. */
  riderHref: string | null
  captainHref: string | null
  subscriptionHref: string | null
  t: Translate
  language: Language
  /** `'stacked'` in the 480px sheet, `'side-by-side'` where there is room. */
  layout?: 'stacked' | 'side-by-side'
}

export function TripParties({
  trip,
  rider,
  captain,
  subscription,
  riderHref,
  captainHref,
  subscriptionHref,
  t,
  language,
  layout = 'stacked',
}: TripPartiesProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        /* Desktop-first, and there is no `md:`. `globals.css` sets every
           `--breakpoint-*` to `initial`, so Tailwind's own responsive variants
           compile to nothing and the utility is silently dropped — the trap
           `breakpointVariants.test.ts` exists to catch. Two columns is the
           desktop answer; `compact:` is the one override below 768px. */
        layout === 'side-by-side' ? 'grid-cols-2 compact:grid-cols-1' : 'grid-cols-1',
      )}
    >
      <PartyCard
        role={t('profile.trip.party.passenger')}
        name={trip.riderName}
        href={riderHref}
        openLabel={t('profile.trip.party.openRider', { name: trip.riderName })}
        phone={rider?.phone ?? null}
        callLabel={t('profile.trip.party.callRider')}
        t={t}
        rows={[
          subscription === null
            ? null
            : {
                label: t('profile.trip.party.subscription'),
                value: subscriptionHref === null ? (
                  <bdi>
                    {t('profile.trip.sub.leg', {
                      id: subscription.id,
                      plan: subscription.planName,
                      index: formatCount(subscription.tripsCompleted, language),
                      total: formatCount(subscription.tripsIncluded, language),
                    })}
                  </bdi>
                ) : (
                  <Link
                    to={subscriptionHref}
                    className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                    aria-label={t('profile.trip.sub.open', { id: subscription.id })}
                  >
                    <bdi>
                      {t('profile.trip.sub.leg', {
                        id: subscription.id,
                        plan: subscription.planName,
                        index: formatCount(subscription.tripsCompleted, language),
                        total: formatCount(subscription.tripsIncluded, language),
                      })}
                    </bdi>
                  </Link>
                ),
              },
          {
            label: t('profile.trip.party.mobile'),
            value: rider === null ? null : <bdi>{rider.phone}</bdi>,
          },
          {
            label: t('profile.trip.party.rating'),
            value:
              trip.driverRatingGiven === null ? (
                /* §8.3.1 — "nobody rated it" is a known fact, not an absent
                   one, so it reads in words rather than as `—`. */
                <span className="text-muted-foreground">
                  {t('profile.trip.party.notRated')}
                </span>
              ) : (
                <bdi>{formatDecimal(trip.driverRatingGiven, 1, language)}</bdi>
              ),
          },
        ]}
      />

      <PartyCard
        role={t('profile.trip.party.captain')}
        name={trip.driverName ?? t('profile.trip.party.noCaptain')}
        href={trip.driverName === null ? null : captainHref}
        openLabel={t('profile.trip.party.openCaptain', { name: trip.driverName ?? '' })}
        phone={captain?.phone ?? null}
        callLabel={t('profile.trip.party.callCaptain')}
        /* §11.2 — the control renders disabled with its reason rather than
           disappearing, and the reason is the record's own fact. */
        callRefusal={
          trip.driverId === null ? t('profile.trip.party.noCaptainReason') : null
        }
        t={t}
        rows={
          captain === null
            ? []
            : [
                {
                  label: t('profile.trip.party.vehicle'),
                  value: (
                    <bdi>
                      {t('profile.trip.party.vehicleValue', {
                        vehicle: captain.vehicle,
                        tier: captain.vehicleClass,
                      })}
                    </bdi>
                  ),
                },
                {
                  label: t('profile.trip.party.mobile'),
                  value: <bdi>{captain.phone}</bdi>,
                },
                {
                  label: t('profile.trip.party.standing'),
                  value: (
                    <bdi>
                      {t('profile.trip.party.standingValue', {
                        rating:
                          captain.rating === null
                            ? '—'
                            : formatDecimal(captain.rating, 1, language),
                        trips: formatCount(captain.totalTrips, language),
                        /* The captain's own on-time figure, not a count of
                           late trips this week — the record carries the first
                           and nothing carries the second, and a number the
                           data cannot source is one an operator will act on. */
                        onTime:
                          captain.onTimePercent === null
                            ? '—'
                            : formatPercent(captain.onTimePercent, language),
                      })}
                    </bdi>
                  ),
                },
              ]
        }
      />
    </div>
  )
}

interface PartyRow {
  label: string
  /** `null` renders §3.5's placeholder — the fact is not on the record yet. */
  value: ReactNode | null
}

/**
 * One party. The role is an eyebrow, the name is the heading, the call control
 * sits opposite it, and the facts are a definition list beneath.
 *
 * The call control is a `tel:` LINK dressed as a button, so it is copyable and
 * middle-clickable and works on a phone. Where there is nobody to call it is a
 * disabled `button` carrying the reason — a disabled `<a>` is not a thing the
 * platform has, and faking one with `pointer-events: none` removes it from the
 * keyboard as well as from the mouse.
 */
function PartyCard({
  role,
  name,
  href,
  openLabel,
  phone,
  callLabel,
  callRefusal = null,
  rows,
  t,
}: {
  role: string
  name: string
  href: string | null
  openLabel: string
  phone: string | null
  callLabel: string
  callRefusal?: string | null
  rows: ReadonlyArray<PartyRow | null>
  t: Translate
}) {
  const present = rows.filter((row): row is PartyRow => row !== null)
  const refusalId = callRefusal === null ? undefined : `${role}-call-refusal`

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
          {role}
        </span>
        {callRefusal !== null ? (
          <>
            <Button variant="secondary" size="xs" disabled aria-describedby={refusalId}>
              <PhoneIcon />
              {callLabel}
            </Button>
          </>
        ) : phone === null ? null : (
          <Button variant="secondary" size="xs" asChild>
            <a href={`tel:${phone.replace(/\s+/gu, '')}`}>
              <PhoneIcon />
              {callLabel}
            </a>
          </Button>
        )}
      </div>

      <p className="min-w-0 truncate text-sm font-semibold text-foreground">
        {href === null ? (
          <bdi>{name}</bdi>
        ) : (
          <Link
            to={href}
            aria-label={openLabel}
            className="underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            <bdi>{name}</bdi>
          </Link>
        )}
      </p>

      {callRefusal !== null && (
        <p id={refusalId} className="text-2xs text-muted-foreground">
          {callRefusal}
        </p>
      )}

      {present.length > 0 && (
        <dl className="flex flex-col gap-1 text-xs">
          {present.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              {/* **Wraps rather than truncates.** In the 320px rail on the ride
                  page `SUB-1041 · Weekly Economy · leg 5 of 5` lost its last
                  three words to an ellipsis — and *which leg* is the whole
                  reason the line is there. A pair that needs two lines gets
                  two. */}
              <dd className="min-w-0 text-end break-words tabular-nums text-foreground">
                {row.value ?? (
                  <span className="text-muted-foreground">{t('profile.field.absent')}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
