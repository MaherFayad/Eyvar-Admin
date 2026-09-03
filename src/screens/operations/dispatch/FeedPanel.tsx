/**
 * **The feed — the board's three lists, floating on the map.**
 *
 * One panel with three tabs, not three cards: an operator watching dispatch is
 * asking one question at a time ("what is waiting?", "what is moving?", "who is
 * on shift?"), and three stacked boxes would spend the map's whole inline-start
 * answering all three at once.
 *
 * ## Selection is the link between the list and the map
 *
 * Picking a row lights its pin, and picking a pin lights its row — `selectedId`
 * is one piece of state in `DispatchScreen` and both surfaces read it. That is
 * what makes the map worth having next to the list rather than instead of it:
 * `Al Rabwah District → Riyadh Park Mall` is a sentence, and the pin is where
 * that sentence happens.
 *
 * It is also where the row's action lives. The reference draws a clean list
 * with no buttons on it, and this screen owns a write (`Dispatch captain`) that
 * §11.2 forbids hiding. Both hold: the action appears on the row an operator
 * has *chosen*, identically for every operator, and when they may not perform
 * it the control is there and refuses with a reason rather than vanishing.
 *
 * Rules applied
 *   H1/H3     the route is the row's DATA line — 14px ink. The id and the
 *             channel are META above it, the rider and the clock META below.
 *             One thing per row is worth reading first, and it is the route.
 *   §9.1      logical utilities throughout; the `→` between two places is a
 *             mark and mirrors through `mirrorGlyph`, and every place name is
 *             wrapped in `<bdi>` so an Arabic district inside an English row
 *             cannot reorder the arrow.
 *   §11.2     a blocked control is disabled in place with a stated reason,
 *             pointed at by every control that shares it.
 *   R8        each tab carries its own `cleared` empty, naming its own scope.
 */

import { type ReactNode } from 'react'
import { Car, Clock, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import type { Driver, RideRequest, Trip, TripStatus } from '@/data/types'
import {
  ABSENT,
  formatCount,
  mirrorGlyph,
  type Direction,
  type Language,
  type Translate,
} from '@/lib'
import { cn } from '@/lib/utils'

export type FeedTab = 'pending' | 'trips' | 'fleet'

export interface FeedPanelProps {
  tab: FeedTab
  onTab: (tab: FeedTab) => void
  collapsed: boolean
  onCollapsed: (collapsed: boolean) => void

  trips: readonly Trip[]
  requests: readonly RideRequest[]
  captains: readonly Driver[]
  /** Server totals, which are the truth; the lists are one screenful of it. */
  totals: Readonly<Record<FeedTab, number>>

  selectedId: string | null
  onSelect: (id: string | null) => void

  /** The row action. `null` when the operator may not dispatch — see `deniedReason`. */
  onDispatch: (request: RideRequest) => void
  canDispatch: boolean
  deniedReason: string

  language: Language
  dir: Direction
  t: Translate
}

const DENIED_ID = 'dispatch-feed-denied'

/**
 * The tone for each status a trip can hold while it is ON this board.
 *
 * Only the three active ones, because `ACTIVE_TRIP_STATUSES` is what the read
 * asks for — a `Partial` here would be a lie about the query. The tones are
 * `TripsScreen`'s own (`:96`): `assigned` is `new` because a captain has
 * accepted and nothing has moved, and both moving states are `info`. R5a — no
 * red; a late trip is an intervention, and interventions have their own card.
 */
const TRIP_STATUS_TONE: Readonly<
  Record<'assigned' | 'en-route' | 'in-trip', 'new' | 'info'>
> = {
  assigned: 'new',
  'en-route': 'info',
  'in-trip': 'info',
}

/**
 * A tone for a status the board should never hold. `neutral` rather than a
 * throw: a monitor that crashes because the server sent a fourth status is
 * worse than one that draws it in grey and keeps working.
 */
function toneFor(status: TripStatus): 'new' | 'info' | 'neutral' {
  return TRIP_STATUS_TONE[status as 'assigned' | 'en-route' | 'in-trip'] ?? 'neutral'
}

export function FeedPanel({
  tab,
  onTab,
  collapsed,
  onCollapsed,
  trips,
  requests,
  captains,
  totals,
  selectedId,
  onSelect,
  onDispatch,
  canDispatch,
  deniedReason,
  language,
  dir,
  t,
}: FeedPanelProps) {
  const scope =
    tab === 'pending'
      ? t('dispatch.feed.scope.pending', { count: formatCount(totals.pending, language) })
      : tab === 'trips'
        ? t('dispatch.feed.scope.trips', { count: formatCount(totals.trips, language) })
        : t('dispatch.feed.scope.fleet', { count: formatCount(totals.fleet, language) })

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2',
        /* Collapsed, the panel is its own header and nothing else, so it must
           NOT claim the region's height — hence the growth is conditional
           rather than a constant `flex-1`. */
        !collapsed && 'wide:flex-1',
      )}
    >
      <Tabs value={tab} onValueChange={(value) => onTab(value as FeedTab)} className="flex min-h-0 flex-1 flex-col gap-0">
        {/* **`variant="line"`, not a hand-rolled transparent list.**
            This was `bg-transparent` + `rounded-none` + a `border-b` bolted
            onto the `default` variant — three overrides to un-draw the pill
            track, which left three plain words with no active state but a
            weight change. The primitive already ships the shape this header
            wants: `line` drops the track and turns on the 2px `--primary`
            underline under the active trigger, which is the one thing telling
            an operator which of the three lists they are looking at. The
            list's own `border-b` is the rule the underline sits ON, so the
            indicator lands on the panel's edge rather than floating above it. */}
        <TabsList
          variant="line"
          className="h-control w-full shrink-0 justify-start gap-3 border-b border-border px-3"
        >
          <FeedTrigger value="pending" count={totals.pending} language={language} tone="warning">
            <Clock aria-hidden="true" className="size-3.5" />
            {t('dispatch.tab.pending')}
          </FeedTrigger>
          <FeedTrigger value="trips" count={totals.trips} language={language} tone="ink">
            <Navigation aria-hidden="true" className="size-3.5" />
            {t('dispatch.tab.trips')}
          </FeedTrigger>
          <FeedTrigger value="fleet" count={totals.fleet} language={language} tone="muted">
            <Car aria-hidden="true" className="size-3.5" />
            {t('dispatch.tab.fleet')}
          </FeedTrigger>
        </TabsList>

        {/* The scope line and the collapse, on one rule. The sentence names
            what the tab is showing so the count on the tab has a subject. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-1.5">
          <span className="truncate text-2xs text-muted-foreground">{scope}</span>
          <button
            type="button"
            onClick={() => onCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="shrink-0 rounded-sm text-2xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {collapsed ? t('dispatch.feed.expand') : t('dispatch.feed.collapse')}{' '}
            {/* A chevron is a mark: it mirrors with the document (§9.5). */}
            <span aria-hidden="true">{collapsed ? mirrorGlyph('›', dir) : mirrorGlyph('‹', dir)}</span>
          </button>
        </div>

        {!collapsed && (
          <>
            <TabsContent value="pending" className="min-h-0 flex-1 overflow-y-auto">
              {requests.length === 0 ? (
                <EmptyState
                  kind="cleared"
                  heading={t('dispatch.empty.pending.heading')}
                  body={t('dispatch.empty.pending.body')}
                />
              ) : (
                <ul role="list" className="m-0 list-none divide-y divide-border p-0">
                  {requests.map((request) => {
                    const selected = selectedId === request.id
                    return (
                      /* `relative` — the selection bar and the row's action are
                         both positioned against the row's own box. */
                      <li key={request.id} className="relative">
                        {selected && (
                          /* **The selected row is marked on its edge, not only
                              by a tint.** A `bg-muted` fill at half strength is
                              a few per cent of shift on a dark console, and in
                              the screenshot that prompted this an operator
                              could see that a button had appeared but not which
                              row it belonged to. A 2px bar on the inline-start
                              edge needs no contrast against the tint to be
                              seen, and it is drawn as an OVERLAY rather than a
                              border so selecting a row does not shift its text
                              by 2px. */
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 start-0 z-10 w-0.5 bg-primary"
                          />
                        )}
                        <Row
                          selected={selected}
                          onSelect={() => onSelect(selected ? null : request.id)}
                          id={request.id}
                          badge={<StatusBadge tone="warning">{request.channel}</StatusBadge>}
                          trailing={request.vehicleClass}
                          from={request.pickup}
                          to={request.destination}
                          meta={request.riderName}
                          /* The meta line yields the width the action takes, so
                             a long rider name truncates rather than running
                             under the button. */
                          reserveTrailing={selected}
                          dir={dir}
                        />
                        {/* **The action sits ON the row it acts on, level with
                            the meta line's empty inline-end.**

                            It used to be a strip BELOW the row, which grew the
                            row by 40px on selection — every row under it
                            jumped — and drew the one write on this board in the
                            gap between two rows, belonging to neither. It is a
                            DOM SIBLING of the row button rather than a child,
                            because a button inside a button is not markup a
                            browser will honour; it is positioned over it, so
                            the click lands on the action and never on the row
                            underneath. */}
                        {selected && (
                          <div className="absolute bottom-2 end-3 z-10 flex items-center">
                            <Button
                              size="xs"
                              disabled={!canDispatch}
                              aria-describedby={canDispatch ? undefined : DENIED_ID}
                              onClick={() => onDispatch(request)}
                            >
                              {t('dispatch.assignCaptain')}
                            </Button>
                          </div>
                        )}
                        {selected && !canDispatch && (
                          /* §11.2 / D17 — one sentence, naming the permission
                             and who can grant it, so the refusal says what to
                             do next rather than only that the operator cannot.
                             This is the one thing that may still grow the row:
                             a refusal an operator cannot read is not a
                             refusal. */
                          <p
                            id={DENIED_ID}
                            className="bg-muted/60 px-3 pb-2.5 text-2xs text-muted-foreground"
                          >
                            {deniedReason}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="trips" className="min-h-0 flex-1 overflow-y-auto">
              {trips.length === 0 ? (
                <EmptyState
                  kind="cleared"
                  heading={t('dispatch.empty.trips.heading')}
                  body={t('dispatch.empty.trips.body')}
                />
              ) : (
                <ul role="list" className="m-0 list-none divide-y divide-border p-0">
                  {trips.map((trip) => (
                    <li key={trip.id}>
                      <Row
                        selected={selectedId === trip.id}
                        onSelect={() => onSelect(selectedId === trip.id ? null : trip.id)}
                        id={trip.id}
                        /* **The badge is the STATUS, and the fare is gone.**
                           A trip on this board has not ended, so its
                           `fareHalalas` is `0` — the only thing a non-nullable
                           `Halalas` can say for "not settled yet" — and
                           `Money` rendered that as `0.00 SAR` on two of the
                           four rows. R4-12: a fare that does not exist yet is
                           not a fare of zero, and a dispatch operator was
                           being told a subscription trip in flight would earn
                           nothing. What they actually need in that slot is
                           whether the captain is on the way or the rider is
                           aboard. */
                        badge={
                          <StatusBadge tone={toneFor(trip.status)}>
                            {t(`dispatch.trip.status.${trip.status}`)}
                          </StatusBadge>
                        }
                        trailing={trip.kind}
                        from={trip.pickup ?? ABSENT}
                        to={trip.destination ?? ABSENT}
                        meta={`${trip.riderName} · ${trip.driverName ?? t('dispatch.unassigned')}`}
                        dir={dir}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="fleet" className="min-h-0 flex-1 overflow-y-auto">
              {captains.length === 0 ? (
                <EmptyState
                  kind="cleared"
                  heading={t('dispatch.empty.fleet.heading')}
                  body={t('dispatch.empty.fleet.body')}
                />
              ) : (
                <ul role="list" className="m-0 list-none divide-y divide-border p-0">
                  {captains.map((driver) => (
                    <li key={driver.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          <bdi>{driver.name}</bdi>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <bdi>{driver.city}</bdi> · {driver.vehicleClass}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        {/* R4-12 — a captain with no rating has no rating. */}
                        <p className="text-xs tabular-nums text-foreground">
                          {driver.rating === null ? ABSENT : `★ ${driver.rating.toFixed(1)}`}
                        </p>
                        <p className="text-2xs tabular-nums text-muted-foreground">
                          {t('dispatch.fleet.subs', {
                            active: formatCount(driver.activeSubscriptions, language),
                            max: formatCount(driver.maxSubscriptions, language),
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}

/**
 * A tab, with the count pill the reference puts beside its name.
 *
 * H2 — the pill numeral is `--text-2xs`'s one declared job, and the tone is the
 * layer's own colour, so the tab and the mark on the map agree without a
 * legend lookup.
 */
function FeedTrigger({
  value,
  count,
  language,
  tone,
  children,
}: {
  value: FeedTab
  count: number
  language: Language
  tone: 'warning' | 'ink' | 'muted'
  children: ReactNode
}) {
  return (
    /* `flex-none` — the primitive's triggers are `flex-1` because a default
       tab list is a segmented control that fills its track. A line tab bar is
       three labels reading from the inline-start, and three equal thirds of a
       400px panel would have put `Fleet` in the middle of nowhere. */
    <TabsTrigger value={value} className="h-full flex-none gap-1.5 px-0 text-xs">
      {children}
      <span
        className={cn(
          /* A pill is a fixed shape whatever it holds: `min-w-4` and centred
             text so `6` and `51` are the same object at two lengths rather
             than two differently-shaped chips. */
          'ms-0.5 inline-flex min-w-4 justify-center rounded-full px-1 py-px font-mono text-2xs tabular-nums',
          tone === 'warning' && 'bg-warning text-warning-foreground',
          tone === 'ink' && 'bg-foreground/10 text-foreground',
          tone === 'muted' && 'bg-muted text-muted-foreground',
        )}
      >
        {formatCount(count, language)}
      </span>
    </TabsTrigger>
  )
}

/**
 * One feed row: an id line, the route, and a meta line.
 *
 * The whole row is the control, because the target an operator aims at on a
 * live board should be the size of the thing they are reading, not the size of
 * a chevron at the end of it.
 */
function Row({
  selected,
  onSelect,
  id,
  badge,
  trailing,
  from,
  to,
  meta,
  reserveTrailing = false,
  dir,
}: {
  selected: boolean
  onSelect: () => void
  id: string
  badge: ReactNode
  trailing: ReactNode
  from: string
  to: string
  meta: string
  /** Keep the meta line clear of an action overlaid at the row's inline-end. */
  reserveTrailing?: boolean
  dir: Direction
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-0.5 px-3 py-2.5 text-start transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        selected ? 'bg-muted/60' : 'hover:bg-muted/25',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-2xs text-muted-foreground">{id}</span>
          {badge}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-foreground">{trailing}</span>
      </span>
      {/* H1 — the route is the row's one DATA line. `<bdi>` on each end so an
          Arabic place name inside an English row cannot swallow the arrow. */}
      <span className="truncate text-sm text-foreground">
        <bdi>{from}</bdi> <span aria-hidden="true">{mirrorGlyph('→', dir)}</span> <bdi>{to}</bdi>
      </span>
      <span className={cn('truncate text-xs text-muted-foreground', reserveTrailing && 'pe-28')}>
        <bdi>{meta}</bdi>
      </span>
    </button>
  )
}
