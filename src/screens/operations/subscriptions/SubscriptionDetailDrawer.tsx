/**
 * **The subscription record** — the drawer behind `Open` on Operations ›
 * Subscriptions. `surfaces.md`: a record read beside the list it came from is a
 * drawer.
 *
 * ## Why this file exists
 *
 * **There was no subscription detail pane at all.** `getSubscription`
 * (`clients/subscriptions.ts:146`) had no consumer anywhere in the product, and
 * `Subscription`'s 21 fields were only ever seen three to six at a time, inside
 * the three action modals — so `escrowHeldHalalas`, `renewalLikelihoodPercent`,
 * `refundedHalalas`, `frozenUntil`, `cancellationReason`, `vehicleClass` and
 * `startedOn` were reachable from nowhere in the UI. An operator answering
 * *"why was this refunded 43.25?"* had no surface to answer it on.
 *
 * It is a **drawer and not a route**, deliberately: `src/routes.tsx` has a
 * single owner, and a level-3 detail route would need a row in the route table.
 * A drawer needs neither, keeps the filtered, sorted, paged list behind it
 * (P1-T1's whole point), and is the right surface for a record an operator
 * reads and returns from. If Subscriptions is later given a full detail route,
 * this component is its `main` column unchanged.
 *
 * ## P8-T1
 *
 * Both entities this record names — the rider and the captain — are real
 * `<Link>`s into the 360° layer, and a subscription with no captain assigned
 * yet renders **plain text with its reason** rather than a dead link (§11.2).
 *
 * Rules applied
 *   AC-36        all four states. `not-found` names the id (§9.2).
 *   §8.3.1       `—` is not-applicable only. `escrowHeldHalalas: null` is *no
 *                hold* and is not `0`; a `null` renewal likelihood is *no
 *                history yet*, which is a known fact and reads in words.
 *   R4           every money and count figure is inline-END, `tabular-nums`.
 *   AC-73        `<bdi>` on every numeric and date run.
 *   R5a          `cancelled` is neutral, `at-risk` and `expiring` are warning.
 *                There is no red badge.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { getSubscription } from '@/data/clients'
import type { Subscription, SubscriptionStatus } from '@/data/types'
import { useAsync } from '@/hooks'
import { ABSENT, formatCount, formatDate, type Language, type Translate } from '@/lib'
import { EntityLink, useEntityLinks } from '../EntityLink'

/** R7 tones, keyed on the union. R5a: no red badge — `cancelled` is neutral. */
export const SUBSCRIPTION_TONE: Readonly<
  Record<SubscriptionStatus, 'success' | 'warning' | 'info' | 'neutral' | 'new'>
> = {
  active: 'success',
  expiring: 'warning',
  'at-risk': 'warning',
  frozen: 'info',
  cancelled: 'neutral',
  expired: 'neutral',
}

interface SubscriptionDetailDrawerProps {
  /** The record to read. `null` closes the drawer. */
  subscriptionId: string | null
  onClose: () => void
  language: Language
  t: Translate
}

export function SubscriptionDetailDrawer({
  subscriptionId,
  onClose,
  language,
  t,
}: SubscriptionDetailDrawerProps) {
  /* `enabled` holds the read until there is an id: the drawer is mounted for
     the whole session, so an unconditional read would fire on every page load. */
  const record = useAsync<Subscription>((signal) => getSubscription(subscriptionId ?? '', signal), {
    /* The record id is the only input and it is in `deps`, so reopening the
       drawer on the same row paints instead of flashing a skeleton - and
       reopening on a DIFFERENT row can never serve the previous row's record. */
    deps: [subscriptionId],
    enabled: subscriptionId !== null,
    cacheKey: 'subscriptions.get',
  })

  const sub = record.data ?? null

  /* **P8-T1 — resolution is ASKED.** Two ids on this record; a name that does
     not resolve is text with its reason, never a link to nowhere. */
  const hrefFor = useEntityLinks([sub?.riderId, sub?.driverId])

  return (
    <Sheet open={subscriptionId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base font-semibold tabular-nums">
              <bdi>{subscriptionId ?? ''}</bdi>
            </SheetTitle>
            {sub !== null && (
              <StatusBadge tone={SUBSCRIPTION_TONE[sub.status]}>
                {t(`subs.status.${sub.status}`)}
              </StatusBadge>
            )}
          </div>
          <SheetDescription className="text-xs">{sub === null ? ' ' : sub.planName}</SheetDescription>
        </SheetHeader>

        {/* AC-36 — loading, error, empty (not found), content, in that order. */}
        {record.status === 'loading' && (
          <div className="py-4">
            <LoadingSkeleton pattern="P2" />
          </div>
        )}

        {record.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('subs.drawer.error')}
            action={{ label: t('state.pageError.action'), onClick: record.refetch }}
          />
        )}

        {record.status === 'empty' && (
          <EmptyState
            card={false}
            kind="no-match"
            message={t('subs.drawer.notFound', { id: subscriptionId ?? '' })}
          />
        )}

        {record.status === 'content' && sub !== null && (
          <div className="flex flex-col gap-4 py-4 text-xs">
            <Group title={t('subs.drawer.people')}>
              <Row label={t('subs.col.rider')}>
                <EntityLink
                  href={hrefFor(sub.riderId)}
                  label={t('subs.open.rider', { name: sub.riderName })}
                  reason={t('subs.entity.unresolved')}
                  reasonId="sub-drawer-rider-unresolved"
                >
                  {sub.riderName}
                </EntityLink>
              </Row>
              <Row label={t('subs.col.captain')}>
                {/* §11.2 — plain text with the reason, never a dead link. */}
                <EntityLink
                  href={hrefFor(sub.driverId)}
                  label={t('subs.open.captain', { name: sub.driverName ?? '' })}
                  reason={
                    sub.driverId === null
                      ? t('subs.captain.none.reason')
                      : t('subs.entity.unresolved')
                  }
                  reasonId="sub-drawer-captain-absent"
                >
                  {sub.driverName ?? t('subs.captain.none')}
                </EntityLink>
              </Row>
            </Group>

            <Group title={t('subs.drawer.plan')}>
              <Row label={t('subs.col.plan')}>{sub.planName}</Row>
              <Row label={t('subs.col.class')}>{sub.vehicleClass}</Row>
              <Row label={t('subs.col.starts')}>
                <bdi>{formatDate(sub.startedOn, { language })}</bdi>
              </Row>
              <Row label={t('subs.col.ends')}>
                <bdi>{formatDate(sub.endsOn, { language })}</bdi>
              </Row>
              {/* §8.3.1 — a freeze end date exists only on a frozen record. */}
              {sub.frozenUntil !== null && (
                <Row label={t('subs.col.frozenUntil')}>
                  <bdi>{formatDate(sub.frozenUntil, { language })}</bdi>
                </Row>
              )}
              <Row label={t('subs.col.trips')}>
                <bdi>
                  {t('subs.trips.ratio', {
                    completed: formatCount(sub.tripsCompleted, language),
                    included: formatCount(sub.tripsIncluded, language),
                  })}
                </bdi>
              </Row>
            </Group>

            <Group title={t('subs.drawer.money')}>
              <Row label={t('subs.col.paid')} strong>
                <Money amount={sub.paidHalalas} />
              </Row>
              <Row label={t('subs.drawer.escrow')}>
                {/* §8.3.1 — `null` is NO HOLD, and `0` would be a different
                    fact: a hold of zero. The client's own note says so. */}
                {sub.escrowHeldHalalas === null ? (
                  <span className="text-muted-foreground">{t('subs.drawer.escrow.none')}</span>
                ) : (
                  <Money amount={sub.escrowHeldHalalas} />
                )}
              </Row>
              <Row label={t('subs.col.renewal')}>
                {sub.renewalLikelihoodPercent === null ? (
                  /* "No renewal history to predict from" is a KNOWN fact — most
                     first-cycle riders — so it reads in words, not as `—`. */
                  <span className="text-muted-foreground">{t('subs.renewal.none')}</span>
                ) : (
                  <bdi>
                    {t('subs.renewal.percent', {
                      percent: formatCount(sub.renewalLikelihoodPercent, language),
                    })}
                  </bdi>
                )}
              </Row>
            </Group>

            {/* Only on a record that ended. A cancellation block on an active
                subscription would be four `—`s explaining nothing. */}
            {sub.cancelledAt !== null && (
              <Group title={t('subs.drawer.outcome')}>
                <Row label={t('subs.drawer.cancelledAt')}>
                  <bdi>{formatDate(sub.cancelledAt, { style: 'day-month-time', language })}</bdi>
                </Row>
                <Row label={t('subs.drawer.refunded')}>
                  {sub.refundedHalalas === null ? (
                    <span className="text-muted-foreground">{ABSENT}</span>
                  ) : (
                    <Money amount={sub.refundedHalalas} />
                  )}
                </Row>
                {sub.cancellationReason !== null && (
                  <div className="flex flex-col gap-0.5 pt-1">
                    <span className="text-muted-foreground">{t('subs.drawer.cancelReason')}</span>
                    {/* The one line in this pane allowed to wrap: a reason that
                        has been truncated explains nothing. */}
                    <span className="whitespace-normal text-foreground">
                      {sub.cancellationReason}
                    </span>
                  </div>
                )}
              </Group>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ───────────────────────────── the furniture ───────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h3 className="border-b border-border pb-1 text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** A label and a value on one line. R4: the value takes the inline-END. */
function Row({
  label,
  strong = false,
  children,
}: {
  label: string
  strong?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'min-w-0 truncate text-end font-semibold tabular-nums text-foreground'
            : 'min-w-0 truncate text-end tabular-nums text-foreground'
        }
      >
        {children}
      </span>
    </div>
  )
}
