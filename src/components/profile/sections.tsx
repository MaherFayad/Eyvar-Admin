/**
 * **The twelve section renderers, and the registry both presentations read.**
 *
 * `ProfileSectionKey` has twelve members and, until this file, none of them had
 * a renderer. `ProfileLayer` declared a `sectionRenderers` prop that
 * `AppLayout` never passed; `EntityPageScreen` had no such prop and hardcoded
 * the same fallback. So every section fell to the `??` branch and rendered
 * `state.cardError.message` — *"Couldn't load identity. The filters are
 * unchanged."* — and a **healthy** captain's profile showed nine cards each
 * claiming to have failed. An operator could not tell that from an outage.
 *
 * ## The contract
 *
 * §6.2 asks for *"a stack of collapsible cards contributed by workspaces as a
 * declared contract… not one 600-line builder"*. `ProfileRef.sections` is that
 * contract as data, and `SECTIONS` in `clients/profile.ts` is where a captain
 * gets nine and a rider eight. **Nothing in this file branches on how many
 * sections an entity has**; a renderer only decides *which query answers its own
 * question for this entity kind*, which is unavoidable — `listTrips({riderId})`
 * and `listTrips({driverId})` are different requests.
 *
 * ## Every card owns its four states
 *
 * That is the whole reason the sections are separate. A failed wallet read
 * fails the wallet card and nothing else; the layer stays dismissible and the
 * other eight cards keep their content (§9.2 #14). `SectionStates` is the one
 * place content · empty · loading · error is decided, so a card cannot ship
 * three of the four the way the profile itself shipped three of the four.
 *
 * ## §11.2, where a section has no source
 *
 * Every `(entityType, section)` pair `SECTIONS` declares now has a real client
 * operation behind it. `SectionUnavailable` — a `no-match` empty **carrying the
 * reason**, never hidden and never an error — survives as the defensive branch
 * for the day a twelfth section is given to a kind whose data has not arrived,
 * because a `??` fallback that renders "failed" is exactly the defect this file
 * closes and it must not be able to come back.
 *
 * ## Client operations adopted here
 *
 * Six existed and had no caller before this file: `getWalletLedger`,
 * `getCaptainPayableLedger`, `getDriverCompliance`, `listAbsences`,
 * `listPaymentsForEntity` and `listDisputes`. Each is used exactly where its
 * own header says it should be — `listPaymentsForEntity`'s says *"a profile
 * section is a history"*, and this is that section.
 */

import type { ReactNode } from 'react'
import {
  getCaptainPayableLedger,
  getDriverCompliance,
  getWalletLedger,
  listAbsences,
  listDisputes,
  listFairnessCases,
  listPaymentsForEntity,
  listSubscriptions,
  listTickets,
  listTrips,
} from '@/data/clients'
import { SETTLEMENT_BADGE_TONE } from '@/data/types'
import type {
  AbsenceEvent,
  Dispute,
  DriverCompliance,
  FairnessCase,
  Ledger,
  Paginated,
  Payment,
  ProfileRef,
  ProfileSectionKey,
  Subscription,
  Ticket,
  Trip,
} from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import {
  formatCount,
  formatDate,
  formatDecimal,
  formatLocalisedText,
  formatPercent,
  type Language,
  type Translate,
} from '@/lib'
import { StatusBadge } from '@/components/StatusBadge'
/* **Reused, not restated.** People already owns the tone decision for every
   captain, rider, applicant and compliance-document value, and a second copy
   here would be a second answer to "is a suspension warning or neutral". The
   module is a leaf of constants over `@/data/types`, so importing it costs
   nothing at runtime and cannot cycle. */
import {
  APPLICANT_STATUS,
  DOC_STATE,
  DRIVER_STATUS,
  DRIVER_TIER,
  RIDER_STATUS,
  RIDER_TIER,
  WORST_STATE,
} from '@/screens/operations/people/domain'
import {
  COMPLAINT_STATUS,
  CORPORATE_STATUS,
  DISPUTE_STATUS,
  DOC_STATE_LABEL,
  FAIRNESS_STATUS,
  PLAN_STATUS,
  REQUEST_STATUS,
  SETTLEMENT_LABEL_KEY,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TRIP_STATUS,
} from './domain'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { SectionStates, SectionUnavailable } from './SectionCard'
import {
  FieldList,
  MINI_LEDGER_ROWS,
  MiniLedger,
  MoneyValue,
  NumberValue,
  RowList,
  type Field,
  type ListRow,
} from './fields'
import { personFacets, type ProfileRecord, type ProfileRecordResult } from './record'

/* ────────────────────────── the renderer contract ────────────────────── */

export interface ProfileSectionProps {
  entity: ProfileRef
  /**
   * The entity's own record, fetched **once** by the presentation. Sections that
   * read the record share this result; sections that query a related collection
   * ignore it and issue their own request.
   */
  record: ProfileRecordResult
  t: Translate
  language: Language
}

/** A section renderer is a component, because a section that fetches uses hooks. */
export type ProfileSectionComponent = (props: ProfileSectionProps) => ReactNode

/** How many related rows a card shows. §6.2 sizes the money card; the rest follow it. */
const CARD_ROWS = MINI_LEDGER_ROWS

/* ───────────────────────────── small helpers ─────────────────────────── */

/**
 * One related-collection read, with the section's own four states.
 *
 * `cacheKey` is the data-layer operation id the section's fetcher calls, and it
 * is **per call site** rather than one id for all of them, because these nine
 * sections call nine different operations. Every one of them keys on the
 * entity's id and type, which is all their queries vary on (P3-13) — so a
 * profile closed and re-opened inside the TTL paints its cards instead of nine
 * skeletons. Omit it and the section is simply uncached, which is the safe
 * default `useAsync` documents.
 */
function useSection<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  enabled = true,
  cacheKey?: string,
): AsyncResult<T> {
  return useAsync<T>(run, { deps, enabled, cacheKey })
}

/** `null` means §3.5's empty pair. A present value is rendered as text. */
function text(value: string | null | undefined): ReactNode | null {
  return value === null || value === undefined || value === '' ? null : value
}

function count(value: number | null | undefined, language: Language): ReactNode | null {
  return value === null || value === undefined ? null : (
    <NumberValue>{formatCount(value, language)}</NumberValue>
  )
}

function money(value: number | null | undefined): ReactNode | null {
  return value === null || value === undefined ? null : <MoneyValue amount={value} />
}

function percent(value: number | null | undefined, language: Language): ReactNode | null {
  return value === null || value === undefined ? null : (
    <NumberValue>{formatPercent(value, language)}</NumberValue>
  )
}

function date(
  value: string | null | undefined,
  language: Language,
  style: 'day-month-year' | 'day-month-time' = 'day-month-year',
): ReactNode | null {
  return value === null || value === undefined ? null : formatDate(value, { style, language })
}

function badge(tone: Parameters<typeof StatusBadge>[0]['tone'], label: string): ReactNode {
  return <StatusBadge tone={tone}>{label}</StatusBadge>
}

/** A star rating. `null` is *"no rating yet"* and is never rendered as `0`. */
function rating(value: number | null, t: Translate, language: Language): ReactNode | null {
  return value === null ? null : (
    <NumberValue>{t('profile.value.stars', { value: formatDecimal(value, 1, language) })}</NumberValue>
  )
}

function yesNo(value: boolean, t: Translate): ReactNode {
  return t(value ? 'profile.value.yes' : 'profile.value.no')
}

/**
 * A settlement state, as §7.2 renders it: a badge where the data layer gives a
 * tone, **plain text where it gives `null`**.
 *
 * `failed` and `escalated` are the two `SETTLEMENT_BADGE_TONE` returns `null`
 * for, and that is not a gap — R5a spends red on four things and a returned
 * payment is not one of them, and there is no fifth tone. The word carries it
 * (§7.5), which is what it was always doing.
 */
function settlement(state: Parameters<typeof SETTLEMENT_LABEL_KEY>[0], t: Translate): ReactNode {
  const tone = SETTLEMENT_BADGE_TONE[state]
  const label = t(SETTLEMENT_LABEL_KEY(state))
  return tone === null ? label : badge(tone, label)
}

/**
 * §11.2's sentence for a section with no source on this entity kind.
 *
 * The section's own **heading sits directly above it**, so the sentence names
 * only the kind. Interpolating the section name too would mean either a second,
 * lower-case register for all twelve headings or a capital in mid-sentence, and
 * the heading has already said which card this is.
 */
function noSource(entity: ProfileRef, _section: ProfileSectionKey, t: Translate): string {
  return t('profile.unavailable.noSource', { kind: t(`profile.kind.${entity.entityType}`) })
}

/* ─────────────────────────────── 1 · identity ─────────────────────────── */

/**
 * Who or what this record is. The one section every entity kind carries, and
 * the only one whose content is the record itself rather than a query over a
 * related collection.
 *
 * On the **full page** this card does not appear in the main column: §7.2 puts
 * status, summary and metadata in the right rail, and those three are built from
 * exactly these fields. See `ProfileSections`.
 */
export const IdentitySection: ProfileSectionComponent = ({ record, t, language }) => (
  <SectionStates
    result={record}
    section={t('profile.section.identity')}
    empty={t('profile.state.empty')}
    t={t}
    skeletonRows={5}
  >
    {(value) => <FieldList layout="grid" t={t} fields={identityFields(value, t, language)} />}
  </SectionStates>
)

export function identityFields(
  record: ProfileRecord,
  t: Translate,
  language: Language,
): Field[] {
  switch (record.entityType) {
    case 'rider': {
      const r = record.data
      return [
        { label: t('profile.field.phone'), value: text(r.phone) },
        { label: t('profile.field.status'), value: badge(RIDER_STATUS[r.status].tone, t(RIDER_STATUS[r.status].key)) },
        { label: t('profile.field.tier'), value: t(RIDER_TIER[r.tier]) },
        { label: t('profile.field.rating'), value: rating(r.rating, t, language) },
        { label: t('profile.field.city'), value: text(r.city) },
        { label: t('profile.field.address'), value: text(r.address) },
        { label: t('profile.field.joined'), value: date(r.joinedAt, language) },
      ]
    }
    case 'new-rider': {
      const r = record.data
      return [
        { label: t('profile.field.phone'), value: text(r.phone) },
        { label: t('profile.field.firstAction'), value: text(r.firstAction) },
        { label: t('profile.field.dateOfBirth'), value: date(r.dateOfBirth, language) },
        { label: t('profile.field.nationalId'), value: text(r.nationalId) },
        { label: t('profile.field.city'), value: text(r.city) },
        { label: t('profile.field.address'), value: text(r.address) },
        { label: t('profile.field.joined'), value: date(r.joinedAt, language) },
      ]
    }
    case 'driver': {
      const d = record.data
      return [
        { label: t('profile.field.phone'), value: text(d.phone) },
        { label: t('profile.field.email'), value: text(d.email) },
        { label: t('profile.field.status'), value: badge(DRIVER_STATUS[d.status].tone, t(DRIVER_STATUS[d.status].key)) },
        { label: t('profile.field.tier'), value: t(DRIVER_TIER[d.tier]) },
        { label: t('profile.field.rating'), value: rating(d.rating, t, language) },
        { label: t('profile.field.vehicle'), value: text(d.vehicle) },
        { label: t('profile.field.vehicleClass'), value: text(d.vehicleClass) },
        { label: t('profile.field.city'), value: text(d.city) },
        /* §11.2 — a bank account an operator may not edit here is still shown,
           with its verification state, because absence is not an explanation. */
        { label: t('profile.field.bank'), value: text(`${d.bank.bankName} · ${d.bank.status}`) },
        { label: t('profile.field.joined'), value: date(d.joinedAt, language) },
      ]
    }
    case 'applicant': {
      const a = record.data
      return [
        { label: t('profile.field.phone'), value: text(a.phone) },
        { label: t('profile.field.status'), value: badge(APPLICANT_STATUS[a.status].tone, t(APPLICANT_STATUS[a.status].key)) },
        { label: t('profile.field.vehicle'), value: text(a.vehicle) },
        { label: t('profile.field.plate'), value: text(a.plate) },
        { label: t('profile.field.nationalId'), value: text(a.nationalId) },
        { label: t('profile.field.city'), value: text(a.city) },
        { label: t('profile.field.created'), value: date(a.appliedAt, language, 'day-month-time') },
      ]
    }
    case 'trip': {
      const trip = record.data
      return [
        { label: t('profile.field.status'), value: badge(TRIP_STATUS[trip.status].tone, t(TRIP_STATUS[trip.status].key)) },
        { label: t('profile.field.kind'), value: text(trip.kind) },
        { label: t('profile.field.rider'), value: text(trip.riderName) },
        { label: t('profile.field.captain'), value: text(trip.driverName) },
        { label: t('profile.field.startedAt'), value: date(trip.startedAt, language, 'day-month-time') },
        { label: t('profile.field.endedAt'), value: date(trip.endedAt, language, 'day-month-time') },
      ]
    }
    case 'subscription': {
      const s = record.data
      /* **`status` and `plan` are NOT here, and their absence is the point.**
         Identity answers *who and what is this record*; the Subscriptions
         section below answers *what is the subscription doing*. Both used to
         claim the plan, and the standing was claimed by both this card and the
         layer header, so `SUB-2003` rendered `Expired` twice and
         `Weekly Economy` three times before a single fact that appeared only
         once. The owner's word for it was redundancy.

         The standing now lives once, in the header, where it is visible without
         opening a card. The plan lives once, in Subscriptions, beside the cycle
         and the legs it governs — which is where a reader looking for it would
         go, because it is a property of the subscription rather than of the
         record's identity. */
      return [
        { label: t('profile.field.rider'), value: text(s.riderName) },
        { label: t('profile.field.captain'), value: text(s.driverName) },
        { label: t('profile.field.vehicleClass'), value: text(s.vehicleClass) },
      ]
    }
    case 'corporate-account': {
      const c = record.data
      return [
        { label: t('profile.field.company'), value: text(c.companyName) },
        { label: t('profile.field.status'), value: badge(CORPORATE_STATUS[c.status].tone, t(CORPORATE_STATUS[c.status].key)) },
        { label: t('profile.field.contact'), value: text(c.contactName) },
        { label: t('profile.field.email'), value: text(c.contactEmail) },
        { label: t('profile.field.phone'), value: text(c.contactPhone) },
        { label: t('profile.field.created'), value: date(c.createdAt, language) },
      ]
    }
    case 'ticket': {
      const k = record.data
      return [
        { label: t('profile.field.subject'), value: text(k.subject) },
        { label: t('profile.field.status'), value: badge(TICKET_STATUS[k.status].tone, t(TICKET_STATUS[k.status].key)) },
        { label: t('profile.field.about'), value: text(`${k.entityName} · ${k.entityId}`) },
        { label: t('profile.field.category'), value: text(k.category) },
        /* A3 — the code is a join key, not a label. */
        { label: t('profile.field.reasonCode'), value: text(reasonLabel(t, k.reasonCode)) },
        { label: t('profile.field.priority'), value: text(k.priority) },
        { label: t('profile.field.owner'), value: text(k.ownerName) },
        { label: t('profile.field.created'), value: date(k.createdAt, language, 'day-month-time') },
      ]
    }
    case 'plan': {
      const p = record.data
      return [
        { label: t('profile.field.name'), value: text(p.nameEn) },
        { label: t('profile.field.planNameAr'), value: text(p.nameAr) },
        { label: t('profile.field.status'), value: badge(PLAN_STATUS[p.status].tone, t(PLAN_STATUS[p.status].key)) },
        { label: t('profile.field.durationDays'), value: t('profile.value.days', { count: p.durationDays }) },
        { label: t('profile.field.executeDays'), value: count(p.executeDays, language) },
        { label: t('profile.field.cancelCap'), value: count(p.cancelCap, language) },
        { label: t('profile.field.classes'), value: planClasses(p.economyActive, p.comfortActive, t) },
      ]
    }
    case 'payment': {
      const pay = record.data
      return [
        { label: t('profile.field.kind'), value: t(`profile.paymentKind.${pay.kind}`) },
        { label: t('profile.field.status'), value: settlement(pay.settlement, t) },
        { label: t('profile.field.rider'), value: text(pay.riderName) },
        { label: t('profile.field.captain'), value: text(pay.captainName) },
        { label: t('profile.field.balance'), value: money(pay.amountHalalas) },
        { label: t('profile.field.postedAt'), value: date(pay.initiatedAt, language, 'day-month-time') },
        /* Keyed, never a concatenated sentence (§11). Set iff the payment
           failed, so the pair simply is not there on a healthy one. */
        ...(pay.failureReason === null
          ? []
          : [{ label: t('profile.field.failureReason'), value: formatLocalisedText(pay.failureReason, t) }]),
      ]
    }
    case 'request': {
      const r = record.data
      /* **The ride, and only what the ROW knows.** The rider's own facts — tier,
         wallet, churn — belong to the rider's record and are one click away
         through the name; repeating them here would put two answers to *who is
         this* on two surfaces. What this record uniquely holds is the journey,
         its money and its clock. */
      return [
        { label: t('profile.field.status'), value: badge(REQUEST_STATUS[r.status].tone, t(REQUEST_STATUS[r.status].key)) },
        { label: t('profile.request.field.channel'), value: t(`requests.channel.${r.channel}`) },
        { label: t('profile.request.field.pickup'), value: text(r.pickup) },
        { label: t('profile.request.field.destination'), value: text(r.destination) },
        { label: t('profile.request.field.vehicleClass'), value: text(r.vehicleClass) },
        { label: t('profile.request.field.requestedAt'), value: date(r.requestedAt, language, 'day-month-time') },
        { label: t('profile.field.rider'), value: text(r.riderName) },
        /* One of the two is `null` on every row by construction — see
           `types/request.ts`. `splitAbsent` groups them once three facts are
           absent together, so a subscription request does not print
           `Estimated fare — not recorded` beside its own hold. */
        { label: t('profile.request.field.fare'), value: money(r.quotedFareHalalas) },
        { label: t('profile.request.field.hold'), value: money(r.authorisationHoldHalalas) },
        /* `subs.plan.*`, reused — the subscriptions queue already names these three
           and a fourth spelling of `Weekly` is a fourth thing to translate. */
        { label: t('profile.request.field.plan'), value: r.planKey === null ? null : t(`subs.plan.${r.planKey}`) },
        { label: t('profile.request.field.preferredTime'), value: text(r.preferredPickupTime) },
        { label: t('profile.request.field.captain'), value: text(r.assignedDriverName ?? r.offeredToDriverName) },
        { label: t('profile.request.field.notes'), value: text(r.notes) },
      ]
    }
    case 'complaint': {
      const cmp = record.data
      return [
        { label: t('profile.field.subject'), value: text(cmp.subject) },
        {
          label: t('profile.field.status'),
          value: badge(COMPLAINT_STATUS[cmp.status].tone, t(COMPLAINT_STATUS[cmp.status].key)),
        },
        { label: t('profile.field.captain'), value: text(cmp.driverName) },
        { label: t('profile.field.rider'), value: text(cmp.riderName) },
        { label: t('profile.field.category'), value: t(`profile.complaintCategory.${cmp.category}`) },
        /* A3 — the code is a join key, not a label. */
        { label: t('profile.field.reasonCode'), value: text(reasonLabel(t, cmp.reasonCode)) },
        { label: t('profile.field.created'), value: date(cmp.filedAt, language, 'day-month-time') },
        { label: t('profile.field.detail'), value: text(cmp.detail) },
      ]
    }
  }
}

function planClasses(economy: boolean, comfort: boolean, t: Translate): string {
  if (economy && comfort) return t('profile.value.both')
  if (economy) return t('profile.value.economy')
  if (comfort) return t('profile.value.comfort')
  return t('profile.value.none')
}

/* ─────────────────────────────── 2 · trips ────────────────────────────── */

/**
 * The record's recent trips, newest first.
 *
 * For a `trip` the entity **is** the trip, so the card shows the journey — route,
 * legs, distance, duration, the rating the rider gave — from the record already
 * in hand. There is no second request and no list of one row.
 */
export const TripsSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const query = tripQueryFor(entity)
  const trips = useSection<Paginated<Trip>>(
    (signal) => listTrips({ ...query, pageSize: CARD_ROWS, sort: { field: 'startedAt', dir: 'desc' } }, signal),
    [entity.entityId, entity.entityType],
    query !== null,
    'trips.list',
  )

  if (entity.entityType === 'trip') {
    return (
      <SectionStates
        result={record}
        section={t('profile.section.trips')}
        empty={t('profile.state.emptyTrips')}
        t={t}
        skeletonRows={6}
      >
        {(value) =>
          value.entityType !== 'trip' ? (
            <SectionUnavailable reason={noSource(entity, 'trips', t)} />
          ) : (
            <FieldList layout="grid" t={t} fields={tripJourneyFields(value.data, t, language)} />
          )
        }
      </SectionStates>
    )
  }

  if (query === null) return <SectionUnavailable reason={noSource(entity, 'trips', t)} />

  return (
    <SectionStates
      result={trips}
      section={t('profile.section.trips')}
      empty={t('profile.state.emptyTrips')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <RowList
          t={t}
          total={page.total}
          rows={page.items.map(
            (trip): ListRow => ({
              id: trip.id,
              title: trip.route,
              meta: `${trip.id} · ${formatDate(trip.startedAt, { style: 'day-month-time', language })}`,
              badge: { tone: TRIP_STATUS[trip.status].tone, label: t(TRIP_STATUS[trip.status].key) },
              trailing: <MoneyValue amount={trip.fareHalalas} />,
            }),
          )}
        />
      )}
    </SectionStates>
  )
}

/** Which relation on `Trip` this entity is. `null` = no trip relation exists. */
function tripQueryFor(entity: ProfileRef): { riderId?: string; driverId?: string; subscriptionId?: string } | null {
  switch (entity.entityType) {
    case 'rider':
    case 'new-rider':
      return { riderId: entity.entityId }
    case 'driver':
    case 'applicant':
      return { driverId: entity.entityId }
    case 'subscription':
      return { subscriptionId: entity.entityId }
    default:
      return null
  }
}

function tripJourneyFields(trip: Trip, t: Translate, language: Language): Field[] {
  return [
    { label: t('profile.field.route'), value: text(trip.route) },
    { label: t('profile.field.pickup'), value: text(trip.pickup) },
    { label: t('profile.field.destination'), value: text(trip.destination) },
    /* `null` on a cancelled or unstarted trip. `types/trip.ts` is explicit that
       legacy coerces these to `0` and then computes from them — do not. */
    {
      label: t('profile.field.distance'),
      value:
        trip.distanceKm === null
          ? null
          : t('profile.value.km', { value: formatDecimal(trip.distanceKm, 1, language) }),
    },
    {
      label: t('profile.field.duration'),
      value: trip.durationMinutes === null ? null : t('profile.value.minutes', { count: trip.durationMinutes }),
    },
    { label: t('profile.field.ratingGiven'), value: rating(trip.driverRatingGiven, t, language) },
    {
      label: t('profile.field.latenessMinutes'),
      value: trip.latenessMinutes === null ? null : t('profile.value.minutes', { count: trip.latenessMinutes }),
    },
  ]
}

/* ────────────────────────── 3 · subscriptions ─────────────────────────── */

/**
 * The plans this record holds. For a `subscription` the entity is the plan
 * cycle itself, so the card shows the cycle — dates, legs used, money — instead
 * of a list containing only itself.
 *
 * A corporate account's subscriptions are its **employees'**, so the query waits
 * on the record for `riderIds` and then asks for all of them at once
 * (`riderId in […]`). That is a dependent read, and it is why this section takes
 * the record as well as issuing its own request.
 */
export const SubscriptionsSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const riderIds =
    record.data?.entityType === 'corporate-account' ? record.data.data.riderIds : null

  const params = subscriptionQueryFor(entity, riderIds)
  const subs = useSection<Paginated<Subscription>>(
    (signal) => listSubscriptions({ ...params, pageSize: CARD_ROWS, sort: { field: 'endsOn', dir: 'desc' } }, signal),
    [entity.entityId, entity.entityType, (riderIds ?? []).join(',')],
    params !== null,
    'subscriptions.list',
  )

  if (entity.entityType === 'subscription') {
    return (
      <SectionStates
        result={record}
        section={t('profile.section.subscriptions')}
        empty={t('profile.state.emptySubscriptions')}
        t={t}
        skeletonRows={6}
      >
        {(value) =>
          value.entityType !== 'subscription' ? (
            <SectionUnavailable reason={noSource(entity, 'subscriptions', t)} />
          ) : (
            <FieldList layout="grid" t={t} fields={subscriptionCycleFields(value.data, t, language)} />
          )
        }
      </SectionStates>
    )
  }

  /* A corporate account with no employees on file has nothing to query for, and
     that is an EMPTY rather than a refusal — the account is real and the list
     will fill. `enabled` false would hold the card in `loading` forever. */
  if (entity.entityType === 'corporate-account' && riderIds !== null && riderIds.length === 0) {
    return <SectionUnavailable reason={t('profile.state.emptySubscriptions')} />
  }

  if (params === null) return <SectionUnavailable reason={noSource(entity, 'subscriptions', t)} />

  return (
    <SectionStates
      result={subs}
      section={t('profile.section.subscriptions')}
      empty={t('profile.state.emptySubscriptions')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <RowList
          t={t}
          total={page.total}
          rows={page.items.map(
            (sub): ListRow => ({
              id: sub.id,
              title: sub.planName,
              meta: `${sub.id} · ${formatDate(sub.startedOn, { language })} → ${formatDate(sub.endsOn, { language })}`,
              badge: { tone: SUBSCRIPTION_STATUS[sub.status].tone, label: t(SUBSCRIPTION_STATUS[sub.status].key) },
              trailing: (
                <NumberValue>
                  {t('profile.value.ratio', { used: sub.tripsCompleted, total: sub.tripsIncluded })}
                </NumberValue>
              ),
            }),
          )}
        />
      )}
    </SectionStates>
  )
}

function subscriptionQueryFor(
  entity: ProfileRef,
  riderIds: string[] | null,
): Record<string, unknown> | null {
  switch (entity.entityType) {
    case 'rider':
      return { riderId: entity.entityId }
    case 'driver':
      return { driverId: entity.entityId }
    case 'plan':
      /* Plan ids ARE the `PlanKey` catalogue slugs — `clients/profile.ts` keeps
         the fixture's own id on the ref for exactly this. */
      return { planKey: entity.entityId }
    case 'corporate-account':
      /* Waits on the record. `null` while it is still arriving keeps the query
         disabled rather than firing an unfiltered one. */
      return riderIds === null
        ? null
        : { filters: [{ field: 'riderId', op: 'in' as const, value: riderIds }] }
    default:
      return null
  }
}

function subscriptionCycleFields(sub: Subscription, t: Translate, language: Language): Field[] {
  return [
    { label: t('profile.field.plan'), value: text(sub.planName) },
    {
      label: t('profile.field.cycle'),
      value: `${formatDate(sub.startedOn, { language })} → ${formatDate(sub.endsOn, { language })}`,
    },
    {
      label: t('profile.field.legs'),
      value: (
        <NumberValue>
          {t('profile.value.ratio', { used: sub.tripsCompleted, total: sub.tripsIncluded })}
        </NumberValue>
      ),
    },
    { label: t('profile.field.frozenUntil'), value: date(sub.frozenUntil, language) },
    { label: t('profile.field.renewalLikelihood'), value: percent(sub.renewalLikelihoodPercent, language) },
    { label: t('profile.field.cancelledAt'), value: date(sub.cancelledAt, language, 'day-month-time') },
    { label: t('profile.field.cancellationReason'), value: text(sub.cancellationReason) },
  ]
}

/* ───────────────────────────── 4 · compliance ─────────────────────────── */

/**
 * Document expiry. A captain's is a **separate resource** with its own client
 * (`getDriverCompliance`, which had no caller); an applicant's travels on the
 * application itself, because the two are different collections with different
 * cardinality (`types/driver.ts`).
 *
 * `worstState: null` is **not `valid`** — a captain with no file on record gets
 * its own label, because *"reporting `valid` for one would be the most dangerous
 * possible default"*.
 */
export const ComplianceSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const compliance = useSection<DriverCompliance>(
    (signal) => getDriverCompliance(entity.entityId, signal),
    [entity.entityId],
    entity.entityType === 'driver',
    'compliance.get',
  )

  if (entity.entityType === 'applicant') {
    return (
      <SectionStates
        result={record}
        section={t('profile.section.compliance')}
        empty={t('profile.state.emptyCompliance')}
        t={t}
        skeletonRows={5}
      >
        {(value) =>
          value.entityType !== 'applicant' ? (
            <SectionUnavailable reason={noSource(entity, 'compliance', t)} />
          ) : value.data.docs.length === 0 ? (
            <SectionUnavailable reason={t('profile.state.emptyCompliance')} />
          ) : (
            <FieldList
              layout="grid"
              t={t}
              fields={value.data.docs.map(
                (doc): Field => ({
                  label: doc.type,
                  value: `${doc.status}${doc.expiresOn === null ? '' : ` · ${formatDate(doc.expiresOn, { language })}`}`,
                }),
              )}
            />
          )
        }
      </SectionStates>
    )
  }

  if (entity.entityType !== 'driver') {
    return <SectionUnavailable reason={noSource(entity, 'compliance', t)} />
  }

  return (
    <SectionStates
      result={compliance}
      section={t('profile.section.compliance')}
      empty={t('profile.state.emptyCompliance')}
      t={t}
      skeletonRows={5}
    >
      {(row) => {
        /* `worstState: null` is **not `valid`** — `types/driver.ts` calls
           reporting `valid` for a captain with no file "the most dangerous
           possible default", so People's map carries `none` as a value of its
           own and this reads it rather than defaulting. */
        const worst = WORST_STATE[row.worstState ?? 'none']
        return (
          <div className="flex flex-col gap-2">
            <FieldList
              layout="grid"
              t={t}
              fields={[
                { label: t('profile.field.worstState'), value: badge(worst.tone, t(worst.key)) },
                { label: t('profile.field.docsOnFile'), value: count(row.docs.length, language) },
                { label: t('profile.field.suspensionReason'), value: text(row.suspendedReason) },
              ]}
            />
            {row.docs.length > 0 && (
              <div className="border-t border-border pt-2">
                <FieldList
                  layout="grid"
                  t={t}
                  fields={row.docs.map(
                    (doc): Field => ({
                      label: doc.type,
                      value: (
                        <span className="inline-flex items-center gap-2">
                          {formatDate(doc.expiresOn, { language })}
                          {badge(DOC_STATE[doc.state], t(DOC_STATE_LABEL[doc.state]))}
                        </span>
                      ),
                    }),
                  )}
                />
              </div>
            )}
          </div>
        )
      }}
    </SectionStates>
  )
}

/* ──────────────────────────── 5 · commitment ──────────────────────────── */

/**
 * The captain's missed legs — `listAbsences`, which had no caller.
 *
 * **The empty state here means "nothing has gone wrong"**, which the client's
 * own header says in as many words, so the sentence is a statement about the
 * captain and not about a filter. A waived or decayed strike stays on the
 * record and stops counting: *"deterrence without a route back produces
 * withdrawal, not compliance"*.
 */
export const CommitmentSection: ProfileSectionComponent = ({ entity, t, language }) => {
  const absences = useSection<Paginated<AbsenceEvent>>(
    (signal) =>
      listAbsences(
        { driverId: entity.entityId, pageSize: CARD_ROWS, sort: { field: 'occurredAt', dir: 'desc' } },
        signal,
      ),
    [entity.entityId],
    entity.entityType === 'driver',
    'assurance.absences',
  )

  if (entity.entityType !== 'driver') {
    return <SectionUnavailable reason={noSource(entity, 'commitment', t)} />
  }

  return (
    <SectionStates
      result={absences}
      section={t('profile.section.commitment')}
      empty={t('profile.state.emptyCommitment')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <div className="flex flex-col gap-2">
          <FieldList
            layout="grid"
            t={t}
            fields={[
              {
                label: t('profile.field.strikes'),
                value: count(page.items.filter((a) => !a.waived && !a.decayed).length, language),
              },
              {
                label: t('profile.field.forfeited'),
                value: money(page.items.reduce((sum, a) => sum + a.forfeitedHalalas, 0)),
              },
            ]}
          />
          <div className="border-t border-border pt-2">
            <RowList
              t={t}
              total={page.total}
              rows={page.items.map(
                (absence): ListRow => ({
                  id: absence.id,
                  title: t('profile.value.tier', { tier: absence.tier }),
                  meta: `${formatDate(absence.occurredAt, { style: 'day-month-time', language })} · ${absence.subscriptionId}`,
                  badge: absenceBadge(absence, t),
                  trailing: <MoneyValue amount={absence.forfeitedHalalas} />,
                }),
              )}
            />
          </div>
        </div>
      )}
    </SectionStates>
  )
}

function absenceBadge(absence: AbsenceEvent, t: Translate): ListRow['badge'] {
  if (absence.waived) return { tone: 'success', label: t('profile.value.waived') }
  if (absence.decayed) return { tone: 'neutral', label: t('profile.value.decayed') }
  if (absence.terminated) return { tone: 'neutral', label: t('profile.value.terminated') }
  return { tone: 'warning', label: t('profile.value.counting') }
}

/* ────────────────────────────── 6 · wallet ────────────────────────────── */

/**
 * §6.2's money card, on the **balance** ledger.
 *
 * A rider's is `liability.wallet` (`getWalletLedger`); a captain's is
 * `liability.driver`, their earnings payable (`getCaptainPayableLedger`). Both
 * clients existed and neither had a caller. `credit` means the balance goes up
 * in both, which is the convention `§3.2` sets once and every row is relative
 * to — the card does not restate it per row, it labels the direction.
 */
export const WalletSection: ProfileSectionComponent = ({ entity, t, language }) => {
  const supported = entity.entityType === 'rider' || entity.entityType === 'driver'
  const ledger = useSection<Ledger>(
    (signal) =>
      entity.entityType === 'rider'
        ? getWalletLedger(entity.entityId, undefined, signal)
        : getCaptainPayableLedger(entity.entityId, undefined, signal),
    [entity.entityId, entity.entityType],
    supported,
    /* Two operations behind one card, chosen by `entityType` — which is in
       `deps`, so a rider's wallet and a captain's payable can never share a
       key. The id follows the same branch the fetcher takes. */
    entity.entityType === 'rider' ? 'wallets.ledger' : 'payouts.ledger',
  )

  if (!supported) return <SectionUnavailable reason={noSource(entity, 'wallet', t)} />

  return (
    <SectionStates
      result={ledger}
      section={t('profile.section.wallet')}
      empty={t('profile.state.emptyLedger')}
      t={t}
      skeletonRows={4}
    >
      {(value) => <MiniLedger ledger={value} t={t} language={language} />}
    </SectionStates>
  )
}

/* ───────────────────────────── 7 · payments ───────────────────────────── */

/**
 * The payments this record is part of — **`listPaymentsForEntity`, which was
 * written for exactly this card and had no caller.**
 *
 * Its own header states the rule and the reason: *"a rider's payments are the
 * ones they made, a captain's are the payouts to them **plus** the fares on the
 * trips they drove, and a subscription's include a charge that names no trip at
 * all. A component that had to know which of `riderId`, `captainId`, `tripId`
 * or `subscriptionId` to filter on would be re-deriving that rule per screen,
 * and the fifth screen would get it wrong."* So this section passes the id and
 * asks nothing else. It is also already newest-first, which is what a history
 * on a profile wants.
 *
 * **A corporate account is the one kind it cannot answer**: `Payment` carries
 * two counterparties, a rider and a captain, and neither is a company. A
 * corporate account's money is its **billing**, which lives on the account
 * record — so that arm reads the record it already has rather than issuing a
 * query that would correctly return nothing and wrongly look empty.
 */
export const PaymentsSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const isCorporate = entity.entityType === 'corporate-account'

  const payments = useSection<Paginated<Payment>>(
    (signal) => listPaymentsForEntity(entity.entityId, { pageSize: CARD_ROWS }, signal),
    [entity.entityId],
    !isCorporate,
    'payments.listForEntity',
  )

  if (isCorporate) {
    return (
      <SectionStates
        result={record}
        section={t('profile.section.payments')}
        empty={t('profile.state.empty')}
        t={t}
        skeletonRows={5}
      >
        {(value) =>
          value.entityType === 'corporate-account' ? (
            <FieldList layout="grid" t={t} fields={corporateBillingFields(value, t, language)} />
          ) : (
            <SectionUnavailable reason={noSource(entity, 'payments', t)} />
          )
        }
      </SectionStates>
    )
  }

  return (
    <SectionStates
      result={payments}
      section={t('profile.section.payments')}
      empty={t('profile.state.emptyPayments')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <RowList
          t={t}
          total={page.total}
          rows={page.items.map(
            (payment): ListRow => ({
              id: payment.id,
              title: t(`profile.paymentKind.${payment.kind}`),
              meta: `${payment.id} · ${formatDate(payment.initiatedAt, { style: 'day-month-time', language })}`,
              /* §7.2 — `failed` and `escalated` carry NO badge (R5a); the
                 helper returns the word instead, and `RowList` renders it in
                 the trailing slot beside the amount. */
              trailing: (
                <span className="flex items-center gap-2">
                  {settlement(payment.settlement, t)}
                  <MoneyValue amount={payment.amountHalalas} />
                </span>
              ),
            }),
          )}
        />
      )}
    </SectionStates>
  )
}

function corporateBillingFields(
  record: Extract<ProfileRecord, { entityType: 'corporate-account' }>,
  t: Translate,
  language: Language,
): Field[] {
  const c = record.data
  return [
    { label: t('profile.field.billingType'), value: text(c.billingType) },
    { label: t('profile.field.totalSpend'), value: money(c.totalSpendHalalas) },
    { label: t('profile.field.invoiceDay'), value: count(c.invoiceDayOfMonth, language) },
    { label: t('profile.field.nextInvoice'), value: date(c.nextInvoiceOn, language) },
    { label: t('profile.field.lastInvoice'), value: date(c.lastInvoiceGeneratedAt, language) },
    { label: t('profile.value.invoiceOverdue'), value: yesNo(c.invoiceOverdue, t) },
  ]
}

/* ───────────────────────────── 8 · tickets ────────────────────────────── */

/**
 * Support tickets that name this record.
 *
 * Three shapes, one per relation the data actually carries:
 *
 *   a person or a company   `Ticket.entityId` — the filter `ticketShape`
 *                           declares, and an exact one.
 *   a **ticket**            the entity IS the thread, so the card shows the
 *                           messages. Its own facts stay in `identity`.
 *   a **complaint**         `Complaint.ticketId` — the ticket it was raised
 *                           from, `null` when the rider filed it in-app. That
 *                           `null` is a real and common state, so it renders as
 *                           a sentence and not as a failure.
 *
 * The complaint arm waits on the record, which is why this section takes the
 * record as well as issuing its own query.
 */
export const TicketsSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const raisedFrom = record.data?.entityType === 'complaint' ? record.data.data.ticketId : null

  const params = ticketQueryFor(entity, raisedFrom)
  const tickets = useSection<Paginated<Ticket>>(
    (signal) =>
      listTickets(
        { ...params, pageSize: CARD_ROWS, sort: { field: 'createdAt', dir: 'desc' } },
        signal,
      ),
    [entity.entityId, entity.entityType, raisedFrom ?? ''],
    params !== null,
    'tickets.list',
  )

  if (entity.entityType === 'ticket') {
    return (
      <SectionStates
        result={record}
        section={t('profile.section.tickets')}
        empty={t('profile.state.emptyTickets')}
        t={t}
        skeletonRows={4}
      >
        {(value) =>
          value.entityType !== 'ticket' ? (
            <SectionUnavailable reason={noSource(entity, 'tickets', t)} />
          ) : value.data.messages.length === 0 ? (
            <SectionUnavailable reason={t('profile.state.emptyTickets')} />
          ) : (
            <RowList
              t={t}
              total={value.data.messages.length}
              rows={value.data.messages.map(
                (message): ListRow => ({
                  id: message.id,
                  title: message.body,
                  meta: `${message.senderName} · ${formatDate(message.sentAt, { style: 'day-month-time', language })}`,
                }),
              )}
            />
          )
        }
      </SectionStates>
    )
  }

  /* A complaint the rider filed in the app was never a ticket. The record has
     arrived and said so, which is an answer — not something still loading. */
  if (entity.entityType === 'complaint' && record.status === 'content' && raisedFrom === null) {
    return <SectionUnavailable reason={t('profile.state.emptyComplaintTicket')} />
  }

  if (params === null && entity.entityType !== 'complaint') {
    return <SectionUnavailable reason={noSource(entity, 'tickets', t)} />
  }

  return (
    <SectionStates
      result={tickets}
      section={t('profile.section.tickets')}
      empty={t('profile.state.emptyTickets')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <RowList
          t={t}
          total={page.total}
          rows={page.items.map(
            (ticket): ListRow => ({
              id: ticket.id,
              title: ticket.subject,
              meta: `${ticket.id} · ${formatDate(ticket.createdAt, { style: 'day-month-time', language })}`,
              badge: {
                tone: TICKET_STATUS[ticket.status].tone,
                label: t(TICKET_STATUS[ticket.status].key),
              },
            }),
          )}
        />
      )}
    </SectionStates>
  )
}

function ticketQueryFor(
  entity: ProfileRef,
  raisedFrom: string | null,
): Record<string, unknown> | null {
  switch (entity.entityType) {
    case 'rider':
    case 'new-rider':
    case 'driver':
    case 'applicant':
    case 'corporate-account':
      return { filters: [{ field: 'entityId', op: 'eq' as const, value: entity.entityId }] }
    case 'complaint':
      /* `null` holds the query disabled until the record says which ticket —
         or that there is none. It never fires unfiltered. */
      return raisedFrom === null
        ? null
        : { filters: [{ field: 'id', op: 'eq' as const, value: raisedFrom }] }
    default:
      return null
  }
}

/* ───────────────────────────── 9 · disputes ───────────────────────────── */

/**
 * The money claims attached to this record — `listDisputes`, which had no
 * caller.
 *
 * A `Dispute` is the escalation of a grievance into a settlement question, and
 * the relation differs by kind. All three are filters `disputeShape` already
 * declares:
 *
 *   trip        `tripId` — every claim about a journey names it.
 *   complaint   `Complaint.disputeId`, the complaint's own forward link.
 *               `null` means it never escalated, which is the ordinary and good
 *               outcome and reads as a sentence rather than as a gap.
 *   ticket      the ticket's `entityId` matched against `claimantId` — the
 *               person a ticket is about is the person whose claim it would be.
 */
export const DisputesSection: ProfileSectionComponent = ({ entity, record, t, language }) => {
  const link = disputeLinkFrom(record)
  const params = disputeQueryFor(entity, link)

  const disputes = useSection<Paginated<Dispute>>(
    (signal) =>
      listDisputes(
        { ...params, pageSize: CARD_ROWS, sort: { field: 'filedAt', dir: 'desc' } },
        signal,
      ),
    [entity.entityId, entity.entityType, link ?? ''],
    params !== null,
    'disputes.list',
  )

  /* The record arrived and said this complaint never escalated. An answer. */
  if (entity.entityType === 'complaint' && record.status === 'content' && link === null) {
    return <SectionUnavailable reason={t('profile.state.emptyComplaintDispute')} />
  }

  if (params === null && entity.entityType === 'trip') {
    return <SectionUnavailable reason={noSource(entity, 'disputes', t)} />
  }

  return (
    <SectionStates
      result={disputes}
      section={t('profile.section.disputes')}
      empty={t('profile.state.emptyDisputes')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => (
        <RowList
          t={t}
          total={page.total}
          rows={page.items.map(
            (dispute): ListRow => ({
              id: dispute.id,
              title: t(`dispute.kind.${dispute.kind}`),
              meta: `${dispute.id} · ${formatDate(dispute.filedAt, { style: 'day-month-time', language })}`,
              badge: {
                tone: DISPUTE_STATUS[dispute.status].tone,
                label: t(DISPUTE_STATUS[dispute.status].key),
              },
              trailing: <MoneyValue amount={dispute.amountHalalas} />,
            }),
          )}
        />
      )}
    </SectionStates>
  )
}

/** The forward link the record carries, when the kind has one. */
function disputeLinkFrom(record: ProfileRecordResult): string | null {
  const value = record.data
  if (value === null) return null
  if (value.entityType === 'complaint') return value.data.disputeId
  if (value.entityType === 'ticket') return value.data.entityId
  return null
}

function disputeQueryFor(entity: ProfileRef, link: string | null): Record<string, unknown> | null {
  switch (entity.entityType) {
    case 'trip':
      return { filters: [{ field: 'tripId', op: 'eq' as const, value: entity.entityId }] }
    case 'complaint':
      return link === null ? null : { filters: [{ field: 'id', op: 'eq' as const, value: link }] }
    case 'ticket':
      return link === null
        ? null
        : { filters: [{ field: 'claimantId', op: 'eq' as const, value: link }] }
    default:
      return null
  }
}

/* ──────────────────────────── 10 · fairness ───────────────────────────── */

/**
 * The captain's own fairness record — every case that names them, whichever
 * side it was opened from. `driverId` is *"always set — `fcNew` requires it"*,
 * so this is the one exact filter in the family.
 *
 * `overturned` is **`success`**, not a failure: the queue's own empty state says
 * *"a high overturn rate on this page is not a failure — it means the appeal
 * route is doing its job"*, and the tone follows the words.
 */
export const FairnessSection: ProfileSectionComponent = ({ entity, t, language }) => {
  const cases = useSection<Paginated<FairnessCase>>(
    (signal) =>
      listFairnessCases(
        {
          filters: [{ field: 'driverId', op: 'eq', value: entity.entityId }],
          pageSize: CARD_ROWS,
          sort: { field: 'openedAt', dir: 'desc' },
        },
        signal,
      ),
    [entity.entityId],
    entity.entityType === 'driver',
    'fairness.list',
  )

  if (entity.entityType !== 'driver') {
    return <SectionUnavailable reason={noSource(entity, 'fairness', t)} />
  }

  return (
    <SectionStates
      result={cases}
      section={t('profile.section.fairness')}
      empty={t('profile.state.emptyFairness')}
      t={t}
      skeletonRows={CARD_ROWS}
    >
      {(page) => <FairnessRows page={page} t={t} language={language} />}
    </SectionStates>
  )
}

function FairnessRows({
  page,
  t,
  language,
}: {
  page: Paginated<FairnessCase>
  t: Translate
  language: Language
}) {
  return (
    <RowList
      t={t}
      total={page.total}
      rows={page.items.map(
        (row): ListRow => ({
          id: row.id,
          title: t(`profile.caseKind.${row.kind}`),
          meta: `${row.id} · ${formatDate(row.openedAt, { style: 'day-month-time', language })}`,
          badge: { tone: FAIRNESS_STATUS[row.status].tone, label: t(FAIRNESS_STATUS[row.status].key) },
        }),
      )}
    />
  )
}

/* ──────────────────────────── 11 · movement ───────────────────────────── */

/**
 * `movementLog` — the record's own history of where it has been and what
 * happened to it. Newest first, because a profile is opened to find out what
 * changed most recently.
 *
 * It rides on the record rather than on a query of its own: all four
 * person-shaped types carry it as a field (`MovementLogEntry[]`), so this card
 * costs no request at all.
 */
export const MovementSection: ProfileSectionComponent = ({ entity, record, t, language }) => (
  <SectionStates
    result={record}
    section={t('profile.section.movement')}
    empty={t('profile.state.emptyMovement')}
    t={t}
    skeletonRows={4}
  >
    {(value) => {
      const facets = personFacets(value)
      if (facets === null) return <SectionUnavailable reason={noSource(entity, 'movement', t)} />
      if (facets.movementLog.length === 0) {
        return <SectionUnavailable reason={t('profile.state.emptyMovement')} />
      }
      const newestFirst = [...facets.movementLog].reverse().slice(0, CARD_ROWS)
      return (
        <RowList
          t={t}
          total={facets.movementLog.length}
          rows={newestFirst.map(
            (entry): ListRow => ({
              id: `${entry.at}-${entry.action}`,
              title: entry.action,
              meta: `${formatDate(entry.at, { language })} · ${entry.location}`,
            }),
          )}
        />
      )
    }}
  </SectionStates>
)

/* ───────────────────────────── 12 · devices ───────────────────────────── */

/**
 * The device the customer uses and where it last connected.
 *
 * **Not `listDevices`** — that operation is an *operator's* browser sessions
 * under `manage_team` (`clients/auth.ts`), a different resource for a different
 * person. A rider's device is four fields on the rider record, and two of them
 * are the fraud signals `riderShape` exposes as filters: two seeded riders share
 * `160.156.4.90`, and this card is where an operator sees that.
 */
export const DevicesSection: ProfileSectionComponent = ({ entity, record, t }) => (
  <SectionStates
    result={record}
    section={t('profile.section.devices')}
    empty={t('profile.state.empty')}
    t={t}
    skeletonRows={4}
  >
    {(value) => {
      const facets = personFacets(value)
      if (facets === null) return <SectionUnavailable reason={noSource(entity, 'devices', t)} />
      return (
        <FieldList
          layout="grid"
          t={t}
          fields={[
            { label: t('profile.field.device'), value: text(facets.device) },
            { label: t('profile.field.appLanguage'), value: text(facets.appLanguage) },
            { label: t('profile.field.lastIp'), value: text(facets.lastIp) },
            { label: t('profile.field.ipLocation'), value: text(facets.ipLocation) },
          ]}
        />
      )
    }}
  </SectionStates>
)

/* ─────────────────────────────── the registry ─────────────────────────── */

/**
 * **The one map both presentations read.** `ProfileSections` is the only
 * consumer; the drawer and the full page render that component rather than
 * indexing this themselves, so there is no second place for a key to be handled
 * differently.
 *
 * Every `ProfileSectionKey` has an entry. `Record<ProfileSectionKey, …>` is what
 * makes that a compile error rather than a review note — adding a thirteenth
 * section key without a renderer will not build, which is precisely the failure
 * mode that produced nine "Couldn't load" cards.
 */
export const PROFILE_SECTION_RENDERERS: Readonly<
  Record<ProfileSectionKey, ProfileSectionComponent>
> = {
  identity: IdentitySection,
  trips: TripsSection,
  subscriptions: SubscriptionsSection,
  compliance: ComplianceSection,
  commitment: CommitmentSection,
  wallet: WalletSection,
  payments: PaymentsSection,
  tickets: TicketsSection,
  disputes: DisputesSection,
  fairness: FairnessSection,
  movement: MovementSection,
  devices: DevicesSection,
}

/** The heading for each card. Same map, same completeness guarantee. */
export const SECTION_TITLE_KEYS: Readonly<Record<ProfileSectionKey, string>> = {
  identity: 'profile.section.identity',
  trips: 'profile.section.trips',
  subscriptions: 'profile.section.subscriptions',
  compliance: 'profile.section.compliance',
  commitment: 'profile.section.commitment',
  wallet: 'profile.section.wallet',
  payments: 'profile.section.payments',
  tickets: 'profile.section.tickets',
  disputes: 'profile.section.disputes',
  fairness: 'profile.section.fairness',
  movement: 'profile.section.movement',
  devices: 'profile.section.devices',
}
