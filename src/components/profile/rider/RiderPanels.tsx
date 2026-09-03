/**
 * The rider sheet's right column — three tabs over four server reads.
 *
 * ```
 *   read                          this column
 *   ─────────────────────────────────────────────────────────────────
 *   getRiderTimeline()        ──  Activity   what happened, newest first
 *   getRiderMoneyMovements()  ──  Money      what moved
 *   getRider()                ─┐
 *   getRiderSupportPresence() ─┴  Identity   what we know, and what references it
 * ```
 *
 * ## Nothing here merges, derives or composes
 *
 * The timeline is **server-derived across three resources** — the account, its
 * subscriptions, its trips — because a sheet and a full page each merging those
 * three is the two-screens-two-answers defect, and because same-day ordering has
 * more than one plausible answer and must have exactly one. The sentences come
 * from `riderTimelineStrings`, the shared resolver, so the branch that decides
 * which template a missing `destination` selects is shared too and not merely
 * the vocabulary.
 *
 * The money list is one read for the same reason: an operator asking *"where did
 * the money go"* does not know that a top-up is a `liability.wallet` posting and
 * a fare is a `mada` capture that never touched the wallet.
 *
 * ## The counts, and what they are counting
 *
 * A tab's badge is **the number of records that tab covers** — the server's
 * `total` for the timeline, the length of the movements list. It is not the
 * number of rows on screen: the timeline shows the first page and states its own
 * truncation in words (`profile.list.truncated`, §5.4), so `Activity 23` over
 * `Showing 6 of 23.` reconciles by reading rather than by counting pixels.
 *
 * **No count renders while anything behind it is still in flight.** A `0`
 * printed before a read returns is indistinguishable from a real zero, so the
 * badge is a skeleton until its read has answered.
 *
 * The two numbers differ because the tabs cover **disjoint** collections, and
 * the data layer enforces that rather than this file promising it: money is
 * deliberately absent from the timeline (`types/rider.ts`) so a top-up cannot be
 * counted under both. **Identity carries no badge** — it is one record, not a
 * list, and a `1` on it would count nothing an operator can count.
 *
 * Rules applied
 *   §9.2 #14   each read owns its four states through `SectionStates`, so a
 *              failed timeline leaves the money tab and the rail working and the
 *              sheet dismissible.
 *   R8/AC-37   a tab with nothing behind it renders ONE grey sentence, not one
 *              per collection.
 *   §11.2      `Assign a captain` is DISABLED IN PLACE with its reason beside
 *              it. It is never hidden and never absent.
 *   §7.5       the open-trip card carries the words `Open right now`. The dot is
 *              decoration and is `aria-hidden`; it does not animate — R18
 *              licenses an ambient loop only for *"this feed is live"*, and one
 *              record card is not a feed.
 *   §8.3.2     a movement's sign is `direction` RENDERED, never a negated
 *              amount: `types/ledger.ts` §3.1 fixes `amountHalalas` positive,
 *              and negating one here would be a second money convention plus
 *              arithmetic in a component.
 *   §9.1       logical utilities only; the amounts sit in a `justify-between`
 *              row, which reverses with the document.
 */

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { Money } from '@/components/Money'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { SETTLEMENT_BADGE_TONE } from '@/data/types'
import type {
  Paginated,
  Rider,
  RiderMoneyMovement,
  RiderMoneyMovements,
  RiderRelatedCount,
  RiderSupportPresence,
  RiderTimelineEvent,
} from '@/data/types'
import type { AsyncResult } from '@/hooks'
import {
  MINUS_SIGN,
  formatCount,
  formatDate,
  formatLocalisedText,
  type Language,
  type Translate,
} from '@/lib'
import { riderTimelineStrings } from '@/i18n/vocabulary/copy'
import { SectionStates } from '../SectionCard'
import { FieldList, MINI_LEDGER_ROWS, NumberValue, type Field } from '../fields'
import { RIDER_STATUS, RIDER_TIER } from '@/screens/operations/people/domain'
import { riderRefusals, type RiderRefusal } from './refusals'

export interface RiderReads {
  timeline: AsyncResult<Paginated<RiderTimelineEvent>>
  money: AsyncResult<RiderMoneyMovements>
  support: AsyncResult<RiderSupportPresence>
}

export interface RiderPanelsProps {
  rider: Rider
  reads: RiderReads
  t: Translate
  language: Language
}

/** `null` while a read has not answered — a count that guesses is worse than none. */
function countOf<T>(result: AsyncResult<T>, of: (data: T) => number): number | null {
  if (result.status === 'loading' || result.status === 'error') return null
  return result.data === null ? 0 : of(result.data)
}

export function RiderPanels({ rider, reads, t, language }: RiderPanelsProps) {
  const { timeline, money, support } = reads

  const activityCount = countOf(timeline, (page) => page.total)
  const moneyCount = countOf(money, (value) => value.movements.length)

  /**
   * The trip that has not finished, pinned above the rest.
   *
   * `kind === 'trip-requested'` **is** the open-trip test, and it is the data
   * layer's own: `TRIP_EVENT` in `clients/riders.ts` maps `requested`,
   * `assigned`, `en-route` and `in-trip` onto that one kind and everything else
   * onto a completed, cancelled or no-show kind. There is no local status set
   * here to drift from `OPEN_TRIP_STATUSES` — `late` in particular is NOT open
   * (it means *arrived* late) and this cannot get that wrong, because it never
   * sees a status.
   */
  const openEvent = useMemo(
    () => timeline.data?.items.find((event) => event.kind === 'trip-requested') ?? null,
    [timeline.data],
  )
  const earlier = useMemo(
    () => timeline.data?.items.filter((event) => event !== openEvent) ?? [],
    [timeline.data, openEvent],
  )

  return (
    <Tabs defaultValue="activity" className="min-w-0 flex-1 gap-3 p-4">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="activity" className="flex-none">
          {t('profile.rider.tab.activity')}
          <TabCount value={activityCount} language={language} />
        </TabsTrigger>
        <TabsTrigger value="money" className="flex-none">
          {t('profile.rider.tab.money')}
          <TabCount value={moneyCount} language={language} />
        </TabsTrigger>
        {/* No badge. One record is not a list. */}
        <TabsTrigger value="identity" className="flex-none">
          {t('profile.section.identity')}
        </TabsTrigger>
      </TabsList>

      {/* ── activity ─────────────────────────────────────────────────── */}
      <TabsContent value="activity" className="flex flex-col gap-4">
        <SectionStates
          result={timeline}
          section={t('profile.rider.tab.activity')}
          empty={t('profile.rider.activity.empty')}
          t={t}
          skeletonRows={MINI_LEDGER_ROWS}
        >
          {(page) => (
            <div className="flex flex-col gap-4">
              {openEvent && (
                <OpenTripCard event={openEvent} t={t} language={language} />
              )}
              {earlier.length > 0 && (
                <section className="flex flex-col gap-2">
                  <GroupHeading>{t('profile.rider.activity.earlier')}</GroupHeading>
                  <ul className="flex list-none flex-col divide-y divide-border">
                    {earlier.map((event) => (
                      <TimelineRow key={event.id} event={event} t={t} language={language} />
                    ))}
                  </ul>
                </section>
              )}
              {page.total > page.items.length && (
                /* §5.4 — the end of a truncated list is stated in words, so the
                   badge above and the rows below reconcile by reading. */
                <p className="text-xs text-muted-foreground">
                  {t('profile.list.truncated', { shown: page.items.length, total: page.total })}
                </p>
              )}
            </div>
          )}
        </SectionStates>
      </TabsContent>

      {/* ── money ────────────────────────────────────────────────────── */}
      <TabsContent value="money" className="flex flex-col gap-4">
        <SectionStates
          result={money}
          section={t('profile.rider.tab.money')}
          empty={t('profile.rider.money.empty')}
          t={t}
          skeletonRows={MINI_LEDGER_ROWS}
        >
          {(value) =>
            value.movements.length === 0 ? (
              <EmptyState kind="no-match" card={false} message={t('profile.rider.money.empty')} />
            ) : (
              <ul className="flex list-none flex-col divide-y divide-border">
                {value.movements.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    t={t}
                    language={language}
                  />
                ))}
              </ul>
            )
          }
        </SectionStates>
      </TabsContent>

      {/* ── identity ─────────────────────────────────────────────────── */}
      <TabsContent value="identity" className="flex flex-col gap-4">
        {/* The record's own facts. Absent values are passed as `null` — never
            omitted — so `fields.tsx` groups them into one `Not recorded:` line
            once three or more are absent together (§3.5 as amended). There is no
            closing sentence in this file: a conditional sentence assembled from
            three clauses is still assembled (§9.6), and this mechanism is
            already built and already translated. */}
        <FieldList layout="grid" t={t} fields={identityFields(rider, t, language)} />

        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.rider.support.heading')}</GroupHeading>
          <SectionStates
            result={support}
            section={t('profile.rider.support.heading')}
            empty={t('profile.state.empty')}
            t={t}
            skeletonRows={4}
          >
            {(presence) => (
              /* **Presence PER RESOURCE, asked rather than assumed.** The design
                 ended on one sentence — *"No tickets, no device, no rating on
                 this record"* — which was false for the record it was drawn
                 from: that rider has an open complaint, an unanswered chat, a
                 dispute under review, a lost-and-found search, an open fairness
                 case and an SLA-breached request. Tickets were the one thing
                 genuinely absent. Six of the seven lines below would have been
                 wrong. */
              <FieldList layout="grid" t={t} fields={supportFields(presence, t, language)} />
            )}
          </SectionStates>
        </section>
      </TabsContent>
    </Tabs>
  )
}

/* ─────────────────────────────── pieces ──────────────────────────────── */

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

/** The count beside a tab's name. A skeleton while it is unknown, never a `0` guess. */
function TabCount({ value, language }: { value: number | null; language: Language }) {
  if (value === null) return <Skeleton className="h-4 w-5" />
  return (
    <span className="rounded-md bg-neutral px-1.5 text-2xs tabular-nums text-neutral-foreground">
      {formatCount(value, language)}
    </span>
  )
}

/**
 * The trip that has not finished, on its own ground.
 *
 * `--tone-success` is R7's *live · complete · settled* tone and this is the
 * first of the three. The dot beside the words is `aria-hidden` and static.
 *
 * **No fare.** The design prints `0.00 SAR` on it, and Dispatch already removed
 * exactly that: a trip that has not ended has `fareHalalas: 0` because `Halalas`
 * is not nullable, *"the only thing a non-nullable `Halalas` can say for 'not
 * settled yet'"* — so `0.00 SAR` on an open trip is a number the record does not
 * have. The timeline carries no money at all, which is the same decision made
 * one layer down.
 */
function OpenTripCard({
  event,
  t,
  language,
}: {
  event: RiderTimelineEvent
  t: Translate
  language: Language
}) {
  const strings = riderTimelineStrings(t, event, language)
  const refusal = riderRefusals.assignCaptain(event)

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-success p-3">
      <p className="flex items-center gap-1.5 text-2xs font-medium tracking-widest text-success-foreground uppercase">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success-foreground" />
        {t('profile.rider.activity.open')}
      </p>

      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{strings.title}</p>
        {strings.subtitle !== null && (
          /* The route's arrow lives in the STRING and the Arabic entry carries
             `←`. §9.5: a mirrored glyph is swapped at string-construction time
             and never with CSS. */
          <p className="text-sm text-foreground">
            <bdi>{strings.subtitle}</bdi>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          <bdi>
            {event.recordId === null ? '' : `${event.recordId} · `}
            {formatDate(event.at, { style: 'day-month-time', language })}
          </bdi>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        {/* The fact, from the event — and the tense from the CONTEXT, so the
            sheet and the page say it in the same words as each other rather
            than in the timeline's.

            `strings.note` is the resolver's, and the resolver answers for a
            timeline row: past tense, because a row reports what has happened.
            This is the open-trip card, where the trip has not happened yet, and
            "was assigned" would read as though it were over. Both live cards
            take `rider.trip.noCaptainYet` from the same shared module — one
            sentence per meaning, not one per surface. */}
        <p className="text-sm text-foreground">
          {strings.note === null
            ? t('profile.rider.activity.captainOnBoard')
            : t('rider.trip.noCaptainYet')}
        </p>
        <RefusableAction refusal={refusal} t={t} />
      </div>
      <RefusalLine refusal={refusal} t={t} />
    </section>
  )
}

function TimelineRow({
  event,
  t,
  language,
}: {
  event: RiderTimelineEvent
  t: Translate
  language: Language
}) {
  const strings = riderTimelineStrings(t, event, language)
  return (
    <li className="flex items-start justify-between gap-3 py-1.5 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{strings.title}</p>
        {strings.subtitle !== null && (
          <p className="truncate text-xs text-muted-foreground">
            <bdi>{strings.subtitle}</bdi>
          </p>
        )}
        {strings.note !== null && <p className="text-xs text-muted-foreground">{strings.note}</p>}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        <bdi className="tabular-nums">
          {event.recordId === null ? '' : `${event.recordId} · `}
          {formatDate(event.at, { style: 'day-month-time', language })}
        </bdi>
      </p>
    </li>
  )
}

/**
 * One line of the money list.
 *
 * **The sign is `direction`, rendered.** `amountHalalas` is a positive integer
 * by contract (`types/ledger.ts` §3.1), so this renders U+2212 or `+` beside the
 * magnitude rather than negating anything — negating would be arithmetic in a
 * component and would give the list a second money convention. `MINUS_SIGN` is
 * the same U+2212 `formatMoney` uses, imported rather than typed, so the two
 * cannot diverge.
 *
 * The sign and the amount share ONE `<bdi>`: a sign outside the isolate is a
 * bidi-neutral character that an Arabic paragraph moves to the other end of the
 * run, which turns a debit into a credit (AC-73).
 */
function MovementRow({
  movement,
  t,
  language,
}: {
  movement: RiderMoneyMovement
  t: Translate
  language: Language
}) {
  const tone = SETTLEMENT_BADGE_TONE[movement.state]
  const settlement = t(`fin.settlement.${movement.state}`)
  return (
    <li className="flex items-start justify-between gap-3 py-1.5 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {formatLocalisedText(movement.label, t)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <bdi>
            {formatDate(movement.at, { style: 'day-month-time', language })} · {movement.id}
          </bdi>
        </p>
        {/* **The reconciliation line, and it is load-bearing.** The rows do not
            sum to the balance and are not meant to: a card capture never touched
            the wallet, and an unsettled posting is out of the balance by AC-312.
            An operator adding the column up and finding a different number would
            reasonably conclude the screen is wrong, so the rows that are outside
            the balance say so. `inWalletBalance` is the server's own field —
            NOT `source === 'wallet'`, which gets the unsettled case backwards. */}
        {!movement.inWalletBalance && (
          <p className="text-2xs text-muted-foreground">
            {t('profile.rider.money.outsideBalance')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {tone === null ? (
          <span className="text-xs text-foreground">{settlement}</span>
        ) : (
          <StatusBadge tone={tone}>{settlement}</StatusBadge>
        )}
        <bdi className="text-sm tabular-nums text-foreground">
          {movement.direction === 'debit' ? MINUS_SIGN : '+'}
          <Money amount={movement.amountHalalas} className="tabular-nums" />
        </bdi>
      </div>
    </li>
  )
}

/**
 * §11.2 — a blocked write is disabled IN PLACE, never hidden, and the reason is
 * on screen beside it rather than in a tooltip nobody opens.
 *
 * `aria-describedby` still points at the sentence even though a `disabled`
 * button is not focusable: some assistive technology exposes disabled controls,
 * and the association costs nothing when it does not.
 */
export function RefusableAction({ refusal, t }: { refusal: RiderRefusal; t: Translate }) {
  return (
    <Button
      size="xs"
      variant="secondary"
      disabled={refusal.reason !== null}
      aria-describedby={refusal.reason === null ? undefined : refusal.reasonId}
      onClick={refusal.onAct}
    >
      {refusal.label(t)}
    </Button>
  )
}

export function RefusalLine({ refusal, t }: { refusal: RiderRefusal; t: Translate }) {
  if (refusal.reason === null) return null
  return (
    <p id={refusal.reasonId} className="text-2xs text-muted-foreground">
      {t(refusal.reason.key, refusal.reason.params)}
    </p>
  )
}

/* ─────────────────────────────── fields ──────────────────────────────── */

function identityFields(rider: Rider, t: Translate, language: Language): Field[] {
  return [
    { label: t('profile.field.phone'), value: rider.phone || null },
    {
      label: t('profile.field.status'),
      value: (
        <StatusBadge tone={RIDER_STATUS[rider.status].tone}>
          {t(RIDER_STATUS[rider.status].key)}
        </StatusBadge>
      ),
    },
    { label: t('profile.field.tier'), value: t(RIDER_TIER[rider.tier]) },
    {
      label: t('profile.field.rating'),
      /* `0` in legacy means "no rating yet"; the data layer already turned that
         into `null`, and it is never rendered as a zero rating. */
      value:
        rider.rating === null ? null : (
          <NumberValue>{t('profile.value.stars', { value: rider.rating })}</NumberValue>
        ),
    },
    { label: t('profile.field.city'), value: rider.city || null },
    { label: t('profile.field.address'), value: rider.address || null },
    {
      label: t('profile.field.joined'),
      value: formatDate(rider.joinedAt, { style: 'day-month-year', language }),
    },
    {
      label: t('profile.field.lastTrip'),
      value:
        rider.lastTripAt === null
          ? null
          : formatDate(rider.lastTripAt, { style: 'day-month-time', language }),
    },
    {
      label: t('profile.field.renewalRate'),
      value:
        rider.renewalRatePercent === null ? null : (
          <NumberValue>
            {t('profile.value.percent', { value: formatCount(rider.renewalRatePercent, language) })}
          </NumberValue>
        ),
    },
    {
      label: t('profile.field.quickRides'),
      value: <NumberValue>{formatCount(rider.quickRides, language)}</NumberValue>,
    },
    /* **The device facts, rendered whenever the record has any.** `device` is
       `string | null` now, so absence is representable and `null` reaches
       `AbsentLine` rather than printing an empty cell. The design's *"no
       device"* was false for the record it was drawn from, and the fix is to
       ASK the record rather than to soften the sentence. */
    { label: t('profile.field.device'), value: rider.device },
    { label: t('profile.field.appLanguage'), value: rider.appLanguage || null },
    { label: t('profile.field.lastIp'), value: rider.lastIp || null },
    { label: t('profile.field.ipLocation'), value: rider.ipLocation || null },
  ]
}

/**
 * The seven support resources, each with its own presence.
 *
 * `{total: 3, open: 0}` and `{total: 0, open: 0}` are different states and get
 * different sentences — *"three complaints, all resolved"* is not the same page
 * as *"no complaints"*, which is why `RiderRelatedCount` carries both fields.
 * Neither is ever composed with another resource's.
 */
function supportFields(
  presence: RiderSupportPresence,
  t: Translate,
  language: Language,
): Field[] {
  const line = (count: RiderRelatedCount) => {
    if (count.total === 0) return <span>{t('profile.rider.support.none')}</span>
    return (
      <NumberValue>
        {t(count.open === 0 ? 'profile.rider.support.allClosed' : 'profile.rider.support.some', {
          total: formatCount(count.total, language),
          open: formatCount(count.open, language),
        })}
      </NumberValue>
    )
  }

  return [
    { label: t('profile.section.tickets'), value: line(presence.tickets) },
    { label: t('profile.rider.support.complaints'), value: line(presence.complaints) },
    { label: t('profile.rider.support.conversations'), value: line(presence.conversations) },
    { label: t('profile.section.disputes'), value: line(presence.disputes) },
    { label: t('profile.rider.support.lostAndFound'), value: line(presence.lostAndFound) },
    { label: t('profile.rider.support.fairnessCases'), value: line(presence.fairnessCases) },
    { label: t('profile.rider.support.requests'), value: line(presence.requests) },
  ]
}

