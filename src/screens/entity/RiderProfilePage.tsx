/**
 * **The rider's full profile page** — `/entity/:entityId` where the record is a
 * rider. `docs/05-restructure/design/people-rider-profile.md` §7.
 *
 * ```
 *  ┌ band ─────────────────────────────────────────────────────────────────┐
 *  │ ←  RIDER · RDR-4002                                                   │
 *  │    الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي                       │
 *  │    +966 59 448 7070 │ On demand │ New tier │ Riyadh │ Joined 22 Jun    │
 *  ├ strip ──────────────┬───────────────────────┬────────────────────────┤
 *  │ Money               │ Engagement            │ Plan                    │
 *  │ 200.00 SAR          │ 0                     │ Expired                 │
 *  │ in wallet           │ trips completed       │ ended 8 Jun             │
 *  │ Lifetime value 0.00 │ 0 quick rides ·       │ ▭▭▭▭▭ 0 of 5 trips used │
 *  │                     │ last trip not recorded│ Churn risk High         │
 *  │                     │ Since 22 Jun          │ Lapsed with nothing used│
 *  └─────────────────────┴───────────────────────┴────────────────────────┘
 *  ┌ main ─────────────────────────────┐ ┌ side ──────────┐
 *  │ Open right now                    │ │ Identity       │
 *  │ Wallet and payments  (the ledger) │ │ Device         │
 *  │ Payments                          │ └────────────────┘
 *  │ History                           │
 *  └───────────────────────────────────┘
 * ```
 *
 * ## Where this sits against the spec, exactly
 *
 * **The band is `BoardBand shape="inset"`, not a new component.** §5 asks for a
 * shared `ProfileBand` serving both surfaces; the sheet has already shipped its
 * own (`components/profile/rider/RiderBand.tsx`, which embeds `SheetClose` and
 * `SheetTitle` and so cannot mount on a route), and `components/profile/` is not
 * mine to refactor. `BoardBand` is the product's existing `--ev-hero` field with
 * the measure, the padding token and the block inset already solved, and it is
 * exported for a second caller by design. The band's CONTENT below is built
 * from the same fields, in the same order, with the same keys as `RiderBand`'s
 * meta row, so the two cannot disagree about a fact — which is what §3 protects.
 * **Reported**: `ProfileBand` and `ProfileSummaryBlock` should be extracted and
 * both surfaces switched.
 *
 * **The ledger sits at the end of `main`, not in a `below` band.** §7.6 rules it
 * a full-width band and §14 A requires `DetailPage` to gain a `below` slot for
 * it. `PageShell.tsx` is shared and outside my files, so this builds the
 * **fallback §14 A names**: the ledger goes last in `main` and scrolls
 * horizontally above `--ev-bp-wide`, which `DataTable` handles as a bounded
 * scroller. The defect is recorded rather than hidden — at 1440 the main column
 * is ~696px against the ledger's 832px budget, so the table scrolls.
 *
 * **What dropping `PageHeader` costs, stated so it stays visible.** §8 slot 1
 * had to be rebuilt here and could not have been kept: `PageHeader.onBack` is a
 * `() => void`, so it can only ever be a button calling a handler, and this
 * page's back affordance must be an `<a href>` with a real destination. Slots 2
 * and 3 move into the band unchanged, and slot 5's record pager was never
 * passed and is refused by §8 anyway. **What is genuinely lost is a MECHANISM:**
 * slot 4a's two-secondary cap with its `More actions ▾` spill, and slot 4c's
 * one-primary cap, are enforced inside `PageHeader` and this band has no
 * equivalent. Today they hold by construction — the band carries no actions and
 * the only filled button on the page is the trip card's. **The day someone adds
 * a third action to this band, nothing will stop them**, and that is the moment
 * to extract the cap rather than to rediscover it.
 *
 * **No action cluster in the band.** The references draw `Renew plan` and
 * `Release`; neither has a client operation — `clients/subscriptions.ts` ships
 * `freeze` and `cancel` and no renew, and no operation releases a payment hold.
 * A command with no operation is **absent from both surfaces together**, which
 * is the parity contract working rather than a gap, and it is why nothing here
 * ships a disabled button with an invented reason. The one action on this page
 * is the open-trip card's `Assign a captain`, and it navigates.
 *
 * ## The four states
 *
 * Owned here for the page, and per-block for everything that fetches
 * independently. The band renders **in full in every state** — a header that
 * appears after the data is a layout shift on every navigation — and the back
 * arrow is enabled in all four, including the 404, where it is the one control
 * that must still work (AC-RP-19).
 *
 * Rules applied
 *   §7.2/AC-34  `DetailPage`'s 2 : 1 grid; the side cards restack beneath main
 *               below `--ev-bp-wide`, in order, with nothing dropped.
 *   §5.1        `--ev-hero`, not `--ev-brand`: a brand-coloured SURFACE is a
 *               different token from a brand-coloured control, and `globals.css`
 *               says so — *"lightness means different things at 32px and at
 *               560px"*.
 *   §8/AC-RP-11 the band carries §8's slots 1–3; the page mounts no
 *               `PageHeader` and has exactly one `<h1>`, the name.
 *   D18/X-4     no uppercase-plus-letter-spacing label off the band. The
 *               eyebrow is the single licensed exception (§5.1).
 *   R5a/X-1     no red anywhere. `Expired` is neutral ink at figure rank.
 *   §8.1/X-3    churn risk is a **prediction**, so it wears no status chrome:
 *               label plus value in words, not focusable, with its derivation.
 *   §9.1        logical utilities only; the strip's dividers are
 *               `border-inline-start`, never `border-l`.
 */

import { BoardBand } from '@/components/metrics'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailPage } from '@/components/PageShell'
import { ErrorState } from '@/components/ErrorState'
import { FieldList, type Field } from '@/components/profile/fields'
import {
  getRiderMoneyMovements,
  getRiderSupportPresence,
  getRiderTimeline,
  listSubscriptions,
  listTrips,
} from '@/data/clients'
import { OPEN_TRIP_STATUSES } from '@/data/types'
import type {
  Paginated,
  ProfileRef,
  Rider,
  RiderMoneyMovements,
  RiderSupportPresence,
  RiderTimelineEvent,
  Subscription,
  Trip,
} from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import {
  formatCount,
  formatDate,
  formatLocalisedText,
  formatPercent,
  type Direction,
  type Language,
  type Translator,
} from '@/lib'
import { cn } from '@/lib/utils'
import { CHURN_RISK, RIDER_STATUS, RIDER_TIER } from '@/screens/operations/people/domain'
import { SUBSCRIPTION_STATUS } from '@/components/profile/domain'
import { ReturnControl } from './ReturnControl'
import { RiderMovementsTable } from './RiderMovementsTable'
import { RiderOpenTrip } from './RiderOpenTrip'
import { RiderHistory } from './RiderHistory'
import { RiderPayments } from './RiderPayments'
import { RiderSupportPresenceCard } from './RiderSupportPresence'

/** Financials › Rider wallets — where the ledger's first-run action lands. */
const WALLETS_PATH = '/financials/rider-wallets'

export interface RiderProfilePageProps {
  entity: ProfileRef
  /** The record read, owned by `EntityPageScreen` and shared with nothing else. */
  rider: AsyncResult<Rider>
  /** Resolved by `EntityPageScreen`: `location.state.from`, or the rider index. */
  backTo: string
  /** Already translated, and it names the destination. */
  backLabel: string
  /** Whether the operator may open Live dispatch — §11.2's one refusal here. */
  canOpenDispatch: boolean
  t: Translator
  language: Language
  dir: Direction
}

export function RiderProfilePage({
  entity,
  rider,
  backTo,
  backLabel,
  canOpenDispatch,
  t,
  language,
  dir,
}: RiderProfilePageProps) {
  const riderId = entity.entityId

  /* Three reads beside the record, each owning its own four states so one
     failure does not take the page with it (§9.2 #14).

     **No `cacheKey` on the two queries.** `useAsync`'s key is `cacheKey` plus a
     serialisation of `deps`, and its contract is that *everything the fetcher
     varies on* is in `deps`. These two vary on a page size and a sort the sheet's
     own reads spell differently under the same operation id, so sharing a key
     would serve one surface the other's rows. Uncached is the documented safe
     default; the movements read, whose only input is the id, keys properly. */
  const movements = useAsync<RiderMoneyMovements>(
    (signal) => getRiderMoneyMovements(riderId, signal),
    { deps: [riderId], cacheKey: 'riders.movements' },
  )

  /* **The newest open trip.** `OPEN_TRIP_STATUSES` is the data layer's own
     definition — the complement of the three terminal statuses, so it cannot
     drift — and it includes `requested`, which is why `TRP-9104` renders here
     and does not appear on the dispatch board (a `requested` trip has no captain
     and no position to plot). `pageSize: 1` with the server's `total` is what
     gives the card its `+n more open` line without pulling rows nobody sees. */
  const openTrips = useAsync<Paginated<Trip>>(
    (signal) =>
      listTrips(
        {
          riderId,
          filters: [{ field: 'status', op: 'in', value: [...OPEN_TRIP_STATUSES] }],
          sort: { field: 'startedAt', dir: 'desc' },
          pageSize: 1,
        },
        signal,
      ),
    { deps: [riderId] },
  )

  /* The rider's latest cycle. Same query and same sort the sheet's
     `SubscriptionsSection` issues, so the two surfaces can never disagree about
     WHICH subscription is the current one. */
  const subscriptions = useAsync<Paginated<Subscription>>(
    (signal) =>
      listSubscriptions(
        { riderId, sort: { field: 'endsOn', dir: 'desc' }, pageSize: 1 },
        signal,
      ),
    { deps: [riderId] },
  )

  /* The dated history — server-derived across the account, its subscriptions
     and its trips, because a sheet and a page merging those three each is the
     "two screens, two answers" defect `types/rider.ts` names. */
  const timeline = useAsync<Paginated<RiderTimelineEvent>>(
    (signal) => getRiderTimeline(riderId, {}, signal),
    { deps: [riderId], cacheKey: 'riders.timeline' },
  )

  /* **Every support record that references this rider, from one read.** The
     sheet renders this presence; a page that did not would be the parity
     contract breached in its own first wave. It also replaces the reference's
     composed absence sentence, which §9.6 forbids and which was false for a
     record carrying a device. */
  const support = useAsync<RiderSupportPresence>(
    (signal) => getRiderSupportPresence(riderId, signal),
    { deps: [riderId], cacheKey: 'riders.supportPresence' },
  )

  const record = rider.data
  const subscription = subscriptions.data?.items[0] ?? null

  return (
    <DetailPage
      header={
        <div className="flex flex-col gap-4 pb-5">
          <RiderBandBlock
            entity={entity}
            rider={record}
            backTo={backTo}
            backLabel={backLabel}
            t={t}
            language={language}
            dir={dir}
          />
          <SummaryStrip
            rider={record}
            subscription={subscription}
            subscriptionLoading={subscriptions.status === 'loading'}
            t={t}
            language={language}
          />
        </div>
      }
      main={
        record === null ? (
          /* The record is what every block below is built from, so its failure
             is the main column's. The band above still carries the name, the id
             and the back control (AC-RP-19). */
          <ErrorState
            scope="card"
            message={t('state.overlayError.message')}
            action={{ label: t('state.overlayError.action'), onClick: rider.refetch }}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <RiderOpenTrip
              result={openTrips}
              canOpenDispatch={canOpenDispatch}
              t={t}
              language={language}
              dir={dir}
            />
            {/* §14 A's FALLBACK placement for the ledger — see the file
                header — with the card money beside it rather than inside it. */}
            <RiderMovementsTable
              result={movements}
              walletsPath={WALLETS_PATH}
              t={t}
              language={language}
            />
            <RiderPayments result={movements} t={t} language={language} />
            <RiderHistory result={timeline} t={t} language={language} />
          </div>
        )
      }
      /* AC-34 — the array IS the restack order below `--ev-bp-wide`. */
      rail={record === null ? [] : [
        <IdentityCard key="identity" rider={record} t={t} language={language} />,
        <DeviceCard key="device" rider={record} t={t} />,
        <SideCard key="support" title={t('profile.rider.support.heading')}>
          <RiderSupportPresenceCard result={support} t={t} language={language} />
        </SideCard>,
      ]}
    />
  )
}

/* ─────────────────────────────── the band ──────────────────────────────── */

/**
 * §5.2's band, on the page: back arrow, eyebrow, name, five-part meta row.
 *
 * The meta row is built from exactly the fields `RiderBand` builds it from, in
 * the same order and through the same domain maps, so the two surfaces state
 * one set of facts (§3, AC-RP-09). Its separators are 1px spans between
 * surviving items rather than a border on one physical side — a `border-r` here
 * is a defect on arrival (§10.3) and a divider placed *beside* an item leaves
 * an orphan when that item is absent.
 */
function RiderBandBlock({
  entity,
  rider,
  backTo,
  backLabel,
  t,
  language,
  dir,
}: {
  entity: ProfileRef
  rider: Rider | null
  backTo: string
  backLabel: string
  t: Translator
  language: Language
  dir: Direction
}) {
  const meta: string[] = rider
    ? [
        rider.phone,
        t(RIDER_STATUS[rider.status].key),
        t('profile.value.tier', { tier: t(RIDER_TIER[rider.tier]) }),
        rider.city,
        t('profile.rider.joined', {
          date: formatDate(rider.joinedAt, { style: 'day-month-year', language }),
        }),
      ].filter((value) => value !== '')
    : /* Before the record lands the band still says who this is, from the ref
         that resolved first. Nothing waits for the read (§9.2). */
      [entity.subtitle ?? ''].filter((value) => value !== '')

  return (
    <BoardBand shape="inset" density="bar">
      <div className="flex flex-col gap-2">
        {/* §8 slot 1 — the back arrow leads the name row in both directions,
            and it is the page's first tab stop. */}
        <div className="flex items-center gap-2">
          <ReturnControl to={backTo} label={backLabel} dir={dir} />
          {/* §5.1's licensed eyebrow: two independent labels with a decorative
              separator between them. `uppercase` and `tracking-wider` are
              no-ops in Arabic by design, and the `·` is `aria-hidden` so the
              visual order becomes `RDR-4002 · راكب` under `dir="rtl"` — the
              logical string read right to left, which is correct. */}
          <p className="flex items-center gap-1.5 text-2xs font-medium tracking-wider text-hero-label uppercase">
            <span>{t(`profile.kind.${entity.entityType}`)}</span>
            <span aria-hidden="true">·</span>
            <bdi className="tabular-nums">{entity.entityId}</bdi>
          </p>
        </div>

        {/* AC-RP-11 — the page's ONE `<h1>`, and it is the name. It wraps and is
            never clamped: a 46-character Arabic name's patronymic chain is the
            half that disambiguates two riders with one surname. */}
        <h1 className="text-band font-medium break-words text-hero-foreground">
          <bdi>{entity.title}</bdi>
        </h1>

        {meta.length > 0 && (
          <ul
            role="list"
            className="flex list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-muted"
          >
            {meta.map((value, index) => (
              <li key={value} className="flex items-center gap-3">
                {index > 0 && (
                  <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hero-line" />
                )}
                <bdi>{value}</bdi>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BoardBand>
  )
}

/* ────────────────────────────── the strip ──────────────────────────────── */

/**
 * §7.1's three-up summary strip.
 *
 * **`bg-muted`, divided by vertical rules** — D-RP-2: the subdued fill does
 * work a border cannot, saying *this is a readout of what is below, not another
 * card of content*. The dividers are `border-inline-start` on every cell after
 * the first, so they land between cells in reading order in both directions
 * with no second rule (§10.3). Below the wide breakpoint the cells stack and the
 * rules become block-start rules for the same reason.
 */
function SummaryStrip({
  rider,
  subscription,
  subscriptionLoading,
  t,
  language,
}: {
  rider: Rider | null
  subscription: Subscription | null
  subscriptionLoading: boolean
  t: Translator
  language: Language
}) {
  return (
    <div
      data-numeric
      className={cn(
        'grid grid-cols-1 rounded-xl bg-muted',
        'wide:grid-cols-3',
        /* Logical, so it mirrors: a block-start rule when stacked, an
           inline-start rule when side by side. */
        '[&>*+*]:border-t [&>*+*]:border-border',
        'wide:[&>*+*]:border-t-0 wide:[&>*+*]:border-s wide:[&>*+*]:border-border',
      )}
    >
      <StripCell label={t('entity.rider.strip.money')}>
        {rider === null ? (
          <StripSkeleton />
        ) : (
          <>
            <StripFigure>
              <Money
                amount={rider.walletBalanceHalalas}
                unit="none"
                className="text-kpi-lead font-medium"
              />
            </StripFigure>
            <StripCaption>{t('entity.rider.money.inWallet')}</StripCaption>
            {/* **No `held` line here.** `Rider.heldHalalas` is money on a
                DIFFERENT ledger — captured at a gateway and not settled onward —
                and the wallet's own `pendingHalalas` is `0`, so none of this
                balance is held. §8.3.4 wants a pending amount on a separate
                labelled line, and `held` printed under a balance reads as *held
                out of your balance*, which would be a false statement. It is
                said once, over the `Payments` group, as `under review`. */}
            {/* §9.4 — a negative balance is U+2212 in ordinary ink, and the
                condition is carried by a word as well (§7.5). */}
            {rider.walletBalanceHalalas < 0 && (
              <StripCaption>{t('entity.rider.money.belowZero')}</StripCaption>
            )}
            {/* §8.3.1 — zero renders `0.00 SAR`, never an em dash (AC-RP-28). */}
            <div className="flex items-baseline justify-between gap-3 pt-1 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('profile.field.lifetimeValue')}
              </span>
              <Money amount={rider.lifetimeValueHalalas} className="tabular-nums" />
            </div>
          </>
        )}
      </StripCell>

      <StripCell label={t('entity.rider.strip.engagement')}>
        {rider === null ? (
          <StripSkeleton />
        ) : (
          <>
            <StripFigure>
              <span className="text-kpi-lead font-medium tabular-nums text-foreground">
                {formatCount(rider.totalTrips, language)}
              </span>
            </StripFigure>
            <StripCaption>{t('profile.field.totalTrips')}</StripCaption>
            {/* Two independent facts with a decorative separator between them,
                not one sentence built from two translated fragments (§9.6). */}
            <StripCaption>
              <bdi>
                {/* The count is passed as a NUMBER: `pluralCountIn` selects the
                    form from it and refuses a pre-formatted string, which is
                    what makes `1 quick rides` unrepresentable. */}
                {t.plural('entity.rider.trips.quickRides', { count: rider.quickRides })}
              </bdi>
              <span aria-hidden="true"> · </span>
              <bdi>
                {rider.lastTripAt === null
                  ? t('entity.rider.trips.noLastTrip')
                  : t('entity.rider.trips.lastTrip', {
                      date: formatDate(rider.lastTripAt, { style: 'day-month', language }),
                    })}
              </bdi>
            </StripCaption>
            <StripCaption>
              <bdi>
                {t('profile.rider.rail.since', {
                  date: formatDate(rider.joinedAt, { style: 'day-month', language }),
                })}
              </bdi>
            </StripCaption>
          </>
        )}
      </StripCell>

      {/* **`Plan`, and the label never changes with the value** (AC-RP-26). The
          band's meta row says `On demand` — how the rider buys rides — and this
          cell says what happened to their last cycle. Two answers to two
          questions, which is why neither may borrow the other's word. */}
      <StripCell label={t('profile.rider.rail.plan')}>
        {subscriptionLoading ? (
          <StripSkeleton />
        ) : subscription === null ? (
          /* AC-RP-27 — never an em dash, which would claim a plan exists
             somewhere. */
          <p className="text-sm text-muted-foreground">{t('profile.rider.rail.noPlan')}</p>
        ) : (
          <>
            {/* X-1 — ink at figure rank, no hue. R5a spends red on four things
                and a status word is not one of them; `profile/domain.ts` already
                rules `expired → neutral`. */}
            <StripFigure>
              <span className="text-kpi-lead font-medium text-foreground">
                {t(SUBSCRIPTION_STATUS[subscription.status].key)}
              </span>
            </StripFigure>
            <StripCaption>
              <bdi>
                {t(
                  ENDED_STATUSES.has(subscription.status)
                    ? 'profile.rider.rail.planEnded'
                    : 'profile.rider.rail.planEnds',
                  {
                    plan: subscription.planName,
                    date: formatDate(subscription.endsOn, { style: 'day-month', language }),
                  },
                )}
              </bdi>
            </StripCaption>
            <TripMeter used={subscription.tripsCompleted} total={subscription.tripsIncluded} />
            <StripCaption>
              <bdi>
                {subscription.tripsIncluded === 0
                  ? t('entity.rider.plan.noAllowance')
                  : t('profile.rider.rail.planLegs', {
                      used: formatCount(subscription.tripsCompleted, language),
                      total: formatCount(subscription.tripsIncluded, language),
                    })}
              </bdi>
            </StripCaption>
            {rider !== null && <ChurnReading rider={rider} t={t} />}
          </>
        )}
        {/* The churn reading belongs to the rider, not to the plan, so it still
            renders when there is no plan at all. */}
        {subscription === null && rider !== null && <ChurnReading rider={rider} t={t} />}
      </StripCell>
    </div>
  )
}

/** The two cycle states whose end date is in the past tense. */
const ENDED_STATUSES: ReadonlySet<Subscription['status']> = new Set(['expired', 'cancelled'])

function StripCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5 px-5 py-4">
      {/* X-4 / D18 — sentence case, no letter-spacing. Uppercase plus tracking
          is licensed on the band's eyebrow and nowhere else on this page. */}
      <h2 className="text-xs text-muted-foreground">{label}</h2>
      {children}
    </section>
  )
}

/** A numeral and its unit on one baseline: 40px and 11px align on the text, not the box. */
function StripFigure({ children }: { children: React.ReactNode }) {
  return <div className="flex items-baseline gap-1.5">{children}</div>
}

function StripCaption({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/** §11.3 — a skeleton shaped like the cell it replaces. Never a spinner. */
function StripSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/**
 * **Churn risk — a status, and not a badge either** (§8.1, X-3, AC-RP-25).
 *
 * Not a control: §8 slot 3 forbids a status inside an action cluster and §12.1
 * makes a badge non-interactive by type. Not red: R5a enumerates four uses and
 * a risk chip is not one. And **not a badge at all**, which is the ruling rather
 * than the lookup — churn risk is a *prediction*, and the badge family
 * communicates *status*; a prediction wearing status chrome claims a certainty
 * the value does not have.
 *
 * **The reason line is mandatory** (§8.2): `Rider.churnRisk` is computed, and a
 * computed level with no stated basis is the legacy defect §8.2 exists to
 * close. `churnReason` is `null` only when the risk is `low`, and `null` there
 * means *no negative signal on record* — a sentence, not a blank (§3.5).
 */
function ChurnReading({ rider, t }: { rider: Rider; t: Translator }) {
  return (
    <div className="flex flex-col gap-0.5 pt-1">
      <p className="text-sm text-foreground">
        <span className="text-muted-foreground">{t('profile.field.churnRisk')}</span>{' '}
        <span className="font-medium">{t(CHURN_RISK[rider.churnRisk].key)}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        <bdi>
          {rider.churnReason === null
            ? t('profile.rider.rail.churnNone')
            : formatLocalisedText(rider.churnReason, t)}
        </bdi>
      </p>
    </div>
  )
}

/**
 * The plan's trips, one segment each — §6.6, AC-RP-29 … AC-RP-35.
 *
 * **Not a fixed five.** The reference draws five because the reference plan
 * includes five; a fixed five is a defect the moment a plan includes four or
 * eight. Past a dozen, counting segments is slower than reading the caption
 * that is already underneath, so the meter simply does not render — the caption
 * carries it alone.
 *
 * `aria-hidden` in full: the caption below **is** the value and is always
 * rendered, which satisfies §7.5 with one carrier to maintain and removes the
 * `aria-valuemax` problem in the over-delivery case entirely.
 *
 * **It mirrors** (§10.4). A flex row of `flex-1` segments with the filled ones
 * first in DOM order reverses with the document; there is no `left`, no
 * `translateX`, no `background-position` and no width-from-the-left anywhere in
 * it, because none of those reverse.
 */
const MAX_METER_SEGMENTS = 12

function TripMeter({ used, total }: { used: number; total: number }) {
  if (total <= 0 || total > MAX_METER_SEGMENTS) return null
  const filled = Math.min(used, total)
  return (
    <div aria-hidden="true" className="flex gap-1 py-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn('h-1 flex-1 rounded-sm', index < filled ? 'bg-foreground' : 'bg-border')}
        />
      ))}
    </div>
  )
}

/* ──────────────────────────── the side column ──────────────────────────── */

/**
 * §7.5's `Identity` card.
 *
 * `Rating`, `Renewal rate` and `Last trip` are passed with `value: null` and
 * **the shipped path does the rest**: `splitAbsent()`'s threshold is three,
 * which is exactly this case, and `AbsentLine` renders `Not recorded: Rating ·
 * Renewal rate · Last trip`. No em dashes and no value column — X-8, AC-RP-65.
 * Nothing new is built for it, deliberately.
 */
function IdentityCard({
  rider,
  t,
  language,
}: {
  rider: Rider
  t: Translator
  language: Language
}) {
  const fields: Field[] = [
    { label: t('profile.field.phone'), value: rider.phone },
    {
      label: t('profile.field.status'),
      value: (
        <StatusBadge tone={RIDER_STATUS[rider.status].tone}>
          {t(RIDER_STATUS[rider.status].key)}
        </StatusBadge>
      ),
    },
    { label: t('profile.field.tier'), value: t(RIDER_TIER[rider.tier]) },
    { label: t('profile.field.city'), value: rider.city },
    /* Raw off the record, exactly as `rail.tsx` renders it on the sheet. It is
       an untranslated enum on both surfaces; translating it here alone would be
       the two surfaces disagreeing about a word. **Reported.** */
    { label: t('profile.field.gender'), value: rider.gender },
    {
      label: t('profile.field.joined'),
      value: formatDate(rider.joinedAt, { style: 'day-month-year', language }),
    },
    { label: t('profile.field.address'), value: rider.address },
    /* The three absences, grouped by the shipped path. */
    { label: t('profile.field.rating'), value: rider.rating === null ? null : rider.rating },
    {
      label: t('profile.field.renewalRate'),
      value:
        rider.renewalRatePercent === null
          ? null
          : formatPercent(rider.renewalRatePercent, language),
    },
    {
      label: t('profile.field.lastTrip'),
      value:
        rider.lastTripAt === null
          ? null
          : formatDate(rider.lastTripAt, { style: 'day-month-time', language }),
    },
  ]

  return (
    <SideCard title={t('profile.section.identity')}>
      <FieldList t={t} fields={fields} />
    </SideCard>
  )
}

/**
 * §7.5's `Device` card — rendered whenever any of the four has a value
 * (AC-RP-66).
 *
 * **There is no composed absence sentence** (X-7, AC-RP-67). The reference's
 * `No tickets, no device, no rating on this record.` is built by concatenating
 * clauses, which §9.6 forbids outright — a *conditional* concatenation is still
 * one — and it is false for a record that carries a device. Its two jobs are
 * already done: absences are named by the `Not recorded:` group above, and the
 * registration is in the band's meta row.
 */
function DeviceCard({ rider, t }: { rider: Rider; t: Translator }) {
  const fields: Field[] = [
    { label: t('profile.field.device'), value: rider.device || null },
    { label: t('profile.field.appLanguage'), value: rider.appLanguage || null },
    { label: t('profile.field.lastIp'), value: rider.lastIp || null },
    { label: t('profile.field.ipLocation'), value: rider.ipLocation || null },
  ]
  if (fields.every((field) => field.value === null)) return null

  return (
    <SideCard title={t('profile.section.devices')}>
      <FieldList t={t} fields={fields} />
    </SideCard>
  )
}

/** §7.2's rail card shape — a read-only display, never an inline form. */
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="min-h-10 content-center border-b border-border px-3 py-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-3">{children}</CardContent>
    </Card>
  )
}

