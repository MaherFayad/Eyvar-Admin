/**
 * The full page's **right rail** — §7.2, §2.2.
 *
 * `EntityPageScreen` shipped `rail={[]}`, so §6.2's *"main + right rail shape,
 * for deep review"* collapsed to a single column and the full-page escape was a
 * wider drawer with a back arrow. This is the rail.
 *
 * **What belongs in it is not a judgement call.** §7.2:
 *
 * > The rail holds **only** status, publishing, summary and metadata (§2.2).
 * > Primary form fields stay in the main column. Rail cards are read-only
 * > displays with an edit affordance, never inline forms.
 *
 * There is nothing to publish on a profile — it is a read of a record, not a
 * resource with a draft — so the rail is the other three:
 *
 *   **Status**    what standing this record is in, and every flag that puts it
 *                 there. The badge and its reasons, never a badge alone.
 *   **Summary**   the figures an operator opens a profile to check. Trips,
 *                 money, on-time, capacity — the derived numbers §8.2 insists
 *                 the server owns.
 *   **Metadata**  the identity code, the record type, and the facts that do not
 *                 change: when it was created, where, who it belongs to.
 *
 * All three are built from the **same record read** the identity section uses,
 * and the identity card is therefore **not** repeated in the main column on the
 * page. That is the one deliberate difference between the two presentations:
 * the drawer has no rail, so it keeps identity as its first card; the page moves
 * the same facts into the rail §7.2 asks for. Both read the same `ProfileRecord`
 * and the same field helpers, so they cannot disagree about what a record says.
 *
 * Rules applied
 *   §7.2        read-only displays; no inline form, no primary.
 *   §3.5/§7.2   empty pairs render an explicit grey placeholder, never blank.
 *   AC-34       below `--ev-bp-wide` these restack beneath the main column **in
 *               this order**, which is why `profileRail` returns an array and
 *               `DetailPage` takes one.
 *   §9.2 #14    each card carries its own four states, from the shared record
 *               result. A failed record read leaves the main column's trips,
 *               wallet and tickets cards working.
 *   R7/§7.5     one badge, one word. No red anywhere (R5a); a suspension is a
 *               standing condition and gets `neutral` plus its stated reason.
 */

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { SETTLEMENT_BADGE_TONE } from '@/data/types'
import type { ProfileRef } from '@/data/types'
import {
  formatCount,
  formatDate,
  formatDecimal,
  formatLocalisedText,
  formatPercent,
  type Language,
  type Translate,
} from '@/lib'
import {
  APPLICANT_STATUS,
  CHURN_RISK,
  DRIVER_STATUS,
  DRIVER_TIER,
  RIDER_STATUS,
  RIDER_TIER,
} from '@/screens/operations/people/domain'
import {
  COMPLAINT_STATUS,
  CORPORATE_STATUS,
  PLAN_STATUS,
  REQUEST_STATUS,
  SETTLEMENT_LABEL_KEY,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TRIP_STATUS,
} from './domain'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { FieldList, FlagList, MoneyValue, NumberValue, type Field } from './fields'
import { SectionStates } from './SectionCard'
import type { ProfileRecord, ProfileRecordResult } from './record'

export interface ProfileRailProps {
  entity: ProfileRef
  record: ProfileRecordResult
  t: Translate
  language: Language
}

/**
 * The three cards, in restack order (**AC-34**). An array, not a slot: below the
 * breakpoint they fall beneath the main column in exactly this sequence, and a
 * slot API cannot express an order.
 */
export function profileRail(props: ProfileRailProps): ReactNode[] {
  return [
    <RailCard key="status" title={props.t('profile.rail.status')} {...props}>
      {(record) => <StatusBody record={record} entity={props.entity} t={props.t} language={props.language} />}
    </RailCard>,
    <RailCard key="summary" title={props.t('profile.rail.summary')} {...props}>
      {(record) => <FieldList t={props.t} fields={summaryFields(record, props.t, props.language)} />}
    </RailCard>,
    <RailCard key="metadata" title={props.t('profile.rail.metadata')} {...props}>
      {(record) => (
        <FieldList t={props.t} fields={metadataFields(record, props.entity, props.t, props.language)} />
      )}
    </RailCard>,
  ]
}

/**
 * One rail card. Not a `Collapsible`: §7.2's rail cards are read-only displays
 * that stay open, and the collapse rule in §6.2 is about the drawer's stack.
 */
function RailCard({
  title,
  record,
  t,
  children,
}: ProfileRailProps & { title: string; children: (record: ProfileRecord) => ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      {/* `content-center`, NOT `justify-center`. `CardHeader` is a GRID, so
          `justify-*` centres its items along the INLINE axis and centred the
          three rail headings — the only centred card titles in the product.
          The block axis on a grid is `align-content`, which is what a
          `min-h-10` band actually wants. */}
      <CardHeader className="min-h-10 content-center border-b border-border px-3 py-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-3">
        <SectionStates
          result={record}
          section={title}
          empty={t('profile.state.empty')}
          t={t}
          skeletonRows={4}
        >
          {children}
        </SectionStates>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────── status ───────────────────────────────── */

/**
 * The badge **and the reasons**. A status word on its own is the legacy defect
 * §11.2 names: absence is not an explanation, so every flag that contributes to
 * the standing is listed under it in words (§7.5 — never colour alone).
 */
function StatusBody({
  record,
  entity,
  t,
  language,
}: {
  record: ProfileRecord
  entity: ProfileRef
  t: Translate
  language: Language
}) {
  const standing = statusOf(record, t)
  const flags = flagsOf(record, t, language)

  if (standing === null) {
    /* Defensive only. Every one of the eleven kinds has a standing today; a
       twelfth that arrives without one says so rather than rendering blank
       (§3.5) or claiming to have failed (§11.2). */
    return (
      <p className="text-sm text-muted-foreground">
        {t('profile.unavailable.noSource', { kind: t(`profile.kind.${entity.entityType}`) })}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* A `null` tone is R5a's refusal to badge, not a missing value. The
          word renders on its own line and carries the same meaning. */}
      {standing.tone === null ? (
        <p className="text-sm text-foreground">{standing.label}</p>
      ) : (
        <StatusBadge tone={standing.tone}>{standing.label}</StatusBadge>
      )}
      {flags.length > 0 ? (
        <FlagList flags={flags} className="border-t border-border pt-2 text-muted-foreground" />
      ) : null}
    </div>
  )
}

export function statusOf(
  record: ProfileRecord,
  t: Translate,
): { tone: Parameters<typeof StatusBadge>[0]['tone'] | null; label: string } | null {
  switch (record.entityType) {
    case 'operator': {
      const status = record.data.status
      return {
        tone: status === 'Active' ? 'success' : status === 'Invited' ? 'info' : 'neutral',
        label: t(`profile.operator.status.${status}`),
      }
    }
    case 'rider': {
      const s = RIDER_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'driver': {
      const s = DRIVER_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'applicant': {
      const s = APPLICANT_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'request': {
      const r = REQUEST_STATUS[record.data.status]
      return { tone: r.tone, label: t(r.key) }
    }
    case 'trip': {
      const s = TRIP_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'subscription': {
      const s = SUBSCRIPTION_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'corporate-account': {
      const s = CORPORATE_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'ticket': {
      const s = TICKET_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    case 'plan': {
      const s = PLAN_STATUS[record.data.status]
      return { tone: s.tone, label: t(s.key) }
    }
    /* A registration in its first 24 hours has no status field at all —
       `types/rider.ts` models `NewRider` separately for exactly that reason —
       so the standing is what they have done, which is a real answer. */
    case 'new-rider':
      return { tone: 'new', label: record.data.firstAction }
    case 'complaint': {
      const c = COMPLAINT_STATUS[record.data.status]
      return { tone: c.tone, label: t(c.key) }
    }
    /**
     * **`failed` and `escalated` carry NO badge**, and that is §7.2 verbatim:
     * `SETTLEMENT_BADGE_TONE` returns `null` for exactly those two because R5a
     * spends red on four things and a returned payment is not one of them, and
     * there is no fifth tone to reach for. The card renders the word instead —
     * which is what was carrying the meaning all along (§7.5).
     */
    case 'payment': {
      const state = record.data.settlement
      return { tone: SETTLEMENT_BADGE_TONE[state], label: t(SETTLEMENT_LABEL_KEY(state)) }
    }
  }
}

/** Every standing condition, as words. Empty is a real answer and renders nothing. */
function flagsOf(record: ProfileRecord, t: Translate, language: Language): string[] {
  const flags: string[] = []
  switch (record.entityType) {
    case 'driver': {
      const d = record.data
      if (d.suspensionReason !== null) flags.push(d.suspensionReason)
      if (d.flaggedForDeclines) flags.push(t('profile.value.declineFlag'))
      if (d.manualFlag) flags.push(t('profile.value.flagged'))
      if (d.multiSubException) flags.push(t('profile.value.multiSubException'))
      if (d.openComplaints > 0) {
        flags.push(`${t('profile.field.openComplaints')}: ${formatCount(d.openComplaints, language)}`)
      }
      if (d.planAccess !== 'granted') {
        flags.push(`${t('profile.field.planAccess')}: ${t(`profile.planAccess.${d.planAccess}`)}`)
      }
      break
    }
    case 'rider': {
      const r = record.data
      const churn = CHURN_RISK[r.churnRisk]
      flags.push(`${t('profile.field.churnRisk')}: ${t(churn.key)}`)
      break
    }
    case 'trip': {
      const trip = record.data
      if (trip.flagged) flags.push(t('profile.value.flagged'))
      if (trip.stateDesynced) flags.push(t('profile.value.desynced'))
      break
    }
    case 'ticket':
      if (record.data.slaBreached) flags.push(t('profile.value.slaBreached'))
      break
    case 'corporate-account':
      if (record.data.invoiceOverdue) flags.push(t('profile.value.invoiceOverdue'))
      break
    case 'applicant':
      if (record.data.claim === null) flags.push(t('profile.field.unclaimed'))
      break
    case 'complaint': {
      const c = record.data
      flags.push(`${t('profile.field.severity')}: ${t(`profile.complaintSeverity.${c.severity}`)}`)
      if (c.slaBreachedAt !== null) flags.push(t('profile.value.slaBreached'))
      if (c.claim === null) flags.push(t('profile.field.unclaimed'))
      break
    }
    case 'payment':
      /* Keyed, never a concatenated sentence (§11). Set iff the payment
         failed, so a healthy one contributes nothing here. */
      if (record.data.failureReason !== null) {
        flags.push(formatLocalisedText(record.data.failureReason, t))
      }
      break
    default:
      break
  }
  return flags
}

/* ─────────────────────────────── summary ──────────────────────────────── */

/**
 * The figures. **Every one is a server field**, never a client computation:
 * §8.2's whole point is that a derived value computed in three screens produces
 * three answers, and `types/rider.ts` and `types/driver.ts` moved status, churn
 * risk, lifetime value and the platform cut onto the wire for that reason.
 */
function summaryFields(record: ProfileRecord, t: Translate, language: Language): Field[] {
  switch (record.entityType) {
    /* An operator's figures are their access, drawn by the operator arrangement. */
    case 'operator':
      return []
    case 'rider': {
      const r = record.data
      return [
        { label: t('profile.field.totalTrips'), value: <NumberValue>{formatCount(r.totalTrips, language)}</NumberValue> },
        { label: t('profile.field.quickRides'), value: <NumberValue>{formatCount(r.quickRides, language)}</NumberValue> },
        { label: t('profile.field.lifetimeValue'), value: <MoneyValue amount={r.lifetimeValueHalalas} /> },
        /* `types/rider.ts`: this **may be negative**, and nothing in the product
           prevents it. `Money` renders U+2212, never a hyphen and never red. */
        { label: t('profile.field.walletBalance'), value: <MoneyValue amount={r.walletBalanceHalalas} /> },
        {
          label: t('profile.field.renewalRate'),
          /* `null` is *"no renewal history"*, not 0%. */
          value: r.renewalRatePercent === null ? null : formatPercent(r.renewalRatePercent, language),
        },
        {
          label: t('profile.field.lastTrip'),
          value: r.lastTripAt === null ? null : formatDate(r.lastTripAt, { style: 'day-month-time', language }),
        },
      ]
    }
    case 'driver': {
      const d = record.data
      return [
        { label: t('profile.field.totalTrips'), value: <NumberValue>{formatCount(d.totalTrips, language)}</NumberValue> },
        { label: t('profile.field.monthEarnings'), value: <MoneyValue amount={d.monthEarningsHalalas} /> },
        {
          label: t('profile.field.onTime'),
          /* `null` when there is no history to compute from. */
          value: d.onTimePercent === null ? null : formatPercent(d.onTimePercent, language),
        },
        {
          label: t('profile.field.activeSubscriptions'),
          value: (
            <NumberValue>
              {t('profile.value.ratio', { used: d.activeSubscriptions, total: d.maxSubscriptions })}
            </NumberValue>
          ),
        },
        {
          label: t('profile.field.lastTrip'),
          value: d.lastTripAt === null ? null : formatDate(d.lastTripAt, { style: 'day-month-time', language }),
        },
      ]
    }
    case 'new-rider':
      return [{ label: t('profile.field.firstAction'), value: record.data.firstAction }]
    case 'applicant': {
      const a = record.data
      return [
        { label: t('profile.field.totalTrips'), value: <NumberValue>{formatCount(a.acceptedTrips, language)}</NumberValue> },
        { label: t('profile.field.docsOnFile'), value: <NumberValue>{formatCount(a.docs.length, language)}</NumberValue> },
        { label: t('profile.field.claimedBy'), value: a.claim?.ownerName ?? null },
      ]
    }
    case 'trip': {
      const trip = record.data
      return [
        { label: t('profile.field.fare'), value: <MoneyValue amount={trip.fareHalalas} /> },
        { label: t('profile.field.driverEarnings'), value: <MoneyValue amount={trip.driverEarningsHalalas} /> },
        { label: t('profile.field.platformCut'), value: <MoneyValue amount={trip.platformCutHalalas} /> },
        {
          label: t('profile.field.distance'),
          value:
            trip.distanceKm === null
              ? null
              : t('profile.value.km', { value: formatDecimal(trip.distanceKm, 1, language) }),
        },
        {
          label: t('profile.field.duration'),
          value:
            trip.durationMinutes === null ? null : t('profile.value.minutes', { count: trip.durationMinutes }),
        },
      ]
    }
    case 'subscription': {
      const s = record.data
      /* **`legs` is NOT here either**, for the same reason and with the same
         evidence: the Subscriptions section states `0 of 5` in the main column,
         and the rail restated it two inches away. What is left is the MONEY,
         which is what a summary of a subscription is for and which appears
         nowhere else on the surface. */
      return [
        { label: t('profile.field.paid'), value: <MoneyValue amount={s.paidHalalas} /> },
        { label: t('profile.field.escrow'), value: <MoneyValue amount={s.escrowHeldHalalas} /> },
        { label: t('profile.field.refunded'), value: <MoneyValue amount={s.refundedHalalas} /> },
      ]
    }
    case 'request': {
      const r = record.data
      /* One figure or the other, never both — the channel decides which, and
         `types/request.ts` documents why they are two fields rather than one
         with two meanings. A `null` renders §3.5's placeholder, and with the
         clock and the two people also absent on some rows `splitAbsent` groups
         them into a single line rather than four em dashes. */
      return [
        { label: t('profile.request.field.fare'), value: r.quotedFareHalalas === null ? null : <MoneyValue amount={r.quotedFareHalalas} /> },
        { label: t('profile.request.field.hold'), value: r.authorisationHoldHalalas === null ? null : <MoneyValue amount={r.authorisationHoldHalalas} /> },
        { label: t('profile.request.field.vehicleClass'), value: r.vehicleClass },
        {
          label: t('profile.request.field.slaDue'),
          value: r.slaDueAt === null ? null : formatDate(r.slaDueAt, { style: 'day-month-time', language }),
        },
      ]
    }
    case 'corporate-account': {
      const c = record.data
      return [
        { label: t('profile.field.employees'), value: <NumberValue>{formatCount(c.employeeCount, language)}</NumberValue> },
        { label: t('profile.field.totalSpend'), value: <MoneyValue amount={c.totalSpendHalalas} /> },
        { label: t('profile.field.nextInvoice'), value: c.nextInvoiceOn === null ? null : formatDate(c.nextInvoiceOn, { language }) },
      ]
    }
    case 'ticket': {
      const k = record.data
      return [
        { label: t('profile.field.priority'), value: k.priority },
        { label: t('profile.field.owner'), value: k.ownerName },
        { label: t('profile.field.messages'), value: <NumberValue>{formatCount(k.messages.length, language)}</NumberValue> },
        {
          label: t('profile.field.slaDue'),
          value: k.slaDueAt === null ? null : formatDate(k.slaDueAt, { style: 'day-month-time', language }),
        },
      ]
    }
    case 'plan': {
      const p = record.data
      return [
        { label: t('profile.field.durationDays'), value: t('profile.value.days', { count: p.durationDays }) },
        { label: t('profile.field.executeDays'), value: <NumberValue>{formatCount(p.executeDays, language)}</NumberValue> },
        { label: t('profile.field.cancelCap'), value: <NumberValue>{formatCount(p.cancelCap, language)}</NumberValue> },
        { label: t('profile.field.commission'), value: formatPercent(p.commissionPercent, language) },
        { label: t('profile.field.discount'), value: formatPercent(p.discountPercent, language) },
      ]
    }
    case 'payment': {
      const pay = record.data
      return [
        { label: t('profile.field.balance'), value: <MoneyValue amount={pay.amountHalalas} /> },
        /* The VAT is the residual INSIDE the total (M-3): subtotal is derived,
           deliberately not stored, and never re-rounded here. */
        { label: t('profile.field.vat'), value: <MoneyValue amount={pay.vatHalalas} /> },
        { label: t('profile.field.gatewayFee'), value: <MoneyValue amount={pay.gatewayFeeHalalas} /> },
        { label: t('profile.field.refunded'), value: <MoneyValue amount={pay.refundedHalalas} /> },
        {
          label: t('profile.field.capturedAt'),
          value:
            pay.capturedAt === null
              ? null
              : formatDate(pay.capturedAt, { style: 'day-month-time', language }),
        },
      ]
    }
    case 'complaint': {
      const c = record.data
      return [
        { label: t('profile.field.category'), value: t(`profile.complaintCategory.${c.category}`) },
        { label: t('profile.field.severity'), value: t(`profile.complaintSeverity.${c.severity}`) },
        { label: t('profile.field.claimedBy'), value: c.claim?.ownerName ?? null },
        /* Non-null iff `resolved`. A withdrawn complaint carries `null`, which
           is a different fact from "dismissed" and must not render as one. */
        { label: t('profile.field.resolution'), value: c.resolution?.outcome ?? null },
      ]
    }
  }
}

/* ────────────────────────────── metadata ──────────────────────────────── */

/**
 * The facts that identify the record rather than describe its behaviour. The
 * identity code is always first: it is what the operator pastes into a ticket,
 * and it is the one field that is the same on all eleven kinds.
 */
function metadataFields(
  record: ProfileRecord,
  entity: ProfileRef,
  t: Translate,
  language: Language,
): Field[] {
  const common: Field[] = [
    { label: t('profile.field.id'), value: entity.entityId },
    { label: t('profile.field.kind'), value: t(`profile.kind.${entity.entityType}`) },
  ]

  switch (record.entityType) {
    case 'operator':
      return common
    case 'rider': {
      const r = record.data
      return [
        ...common,
        { label: t('profile.field.tier'), value: t(RIDER_TIER[r.tier]) },
        { label: t('profile.field.phone'), value: r.phone },
        { label: t('profile.field.city'), value: r.city },
        { label: t('profile.field.gender'), value: r.gender },
        { label: t('profile.field.joined'), value: formatDate(r.joinedAt, { language }) },
      ]
    }
    case 'new-rider': {
      const r = record.data
      return [
        ...common,
        { label: t('profile.field.phone'), value: r.phone },
        /* PII, and gated at the layer rather than at the field (**AC-60**). */
        { label: t('profile.field.nationalId'), value: r.nationalId },
        { label: t('profile.field.dateOfBirth'), value: formatDate(r.dateOfBirth, { language }) },
        { label: t('profile.field.city'), value: r.city },
        { label: t('profile.field.joined'), value: formatDate(r.joinedAt, { language }) },
      ]
    }
    case 'driver': {
      const d = record.data
      return [
        ...common,
        { label: t('profile.field.tier'), value: t(DRIVER_TIER[d.tier]) },
        { label: t('profile.field.phone'), value: d.phone },
        { label: t('profile.field.email'), value: d.email },
        { label: t('profile.field.vehicle'), value: d.vehicle },
        { label: t('profile.field.city'), value: d.city },
        { label: t('profile.field.joined'), value: formatDate(d.joinedAt, { language }) },
      ]
    }
    case 'applicant': {
      const a = record.data
      return [
        ...common,
        { label: t('profile.field.phone'), value: a.phone },
        { label: t('profile.field.nationalId'), value: a.nationalId },
        { label: t('profile.field.vehicle'), value: `${a.vehicle} · ${a.plate}` },
        { label: t('profile.field.city'), value: a.city },
        { label: t('profile.field.created'), value: formatDate(a.appliedAt, { style: 'day-month-time', language }) },
      ]
    }
    case 'trip': {
      const trip = record.data
      return [
        ...common,
        { label: t('profile.field.rider'), value: trip.riderName },
        { label: t('profile.field.captain'), value: trip.driverName },
        { label: t('profile.field.startedAt'), value: formatDate(trip.startedAt, { style: 'day-month-time', language }) },
        { label: t('profile.field.endedAt'), value: trip.endedAt === null ? null : formatDate(trip.endedAt, { style: 'day-month-time', language }) },
        { label: t('profile.field.paymentId'), value: trip.paymentId },
      ]
    }
    case 'subscription': {
      const s = record.data
      /* **`plan` and `cycle` are NOT here.** The Subscriptions section in the
         main column carries both, so the page rendered `Weekly Economy` and
         `1 Jun → 8 Jun` twice, ~1,100px apart, with nothing marking either copy
         as the authoritative one. §7.2's rule for this rail is *status, summary
         and metadata* — and a plan and a billing cycle are neither identity nor
         summary; they are what the subscription IS DOING, which is the section's
         subject.

         **`vehicleClass` takes their place, and that is a gap being closed
         rather than a swap.** It is an identity field, and `RAIL_SECTIONS`
         omits the identity card from the page's main column precisely so the
         rail can carry those facts — but this list never picked it up, so on
         the full page the vehicle class of a subscription appeared nowhere at
         all. */
      return [
        ...common,
        { label: t('profile.field.rider'), value: s.riderName },
        { label: t('profile.field.captain'), value: s.driverName },
        { label: t('profile.field.vehicleClass'), value: s.vehicleClass },
      ]
    }
    case 'corporate-account': {
      const c = record.data
      return [
        ...common,
        { label: t('profile.field.contact'), value: c.contactName },
        { label: t('profile.field.email'), value: c.contactEmail },
        { label: t('profile.field.phone'), value: c.contactPhone },
        { label: t('profile.field.billingType'), value: c.billingType },
        { label: t('profile.field.created'), value: formatDate(c.createdAt, { language }) },
      ]
    }
    case 'ticket': {
      const k = record.data
      return [
        ...common,
        { label: t('profile.field.about'), value: `${k.entityName} · ${k.entityId}` },
        { label: t('profile.field.category'), value: k.category },
        /* A3 — the code is a join key, not a label. */
        { label: t('profile.field.reasonCode'), value: reasonLabel(t, k.reasonCode) },
        { label: t('profile.field.created'), value: formatDate(k.createdAt, { style: 'day-month-time', language }) },
      ]
    }
    case 'plan': {
      const p = record.data
      return [
        ...common,
        { label: t('profile.field.name'), value: p.nameEn },
        { label: t('profile.field.planNameAr'), value: p.nameAr },
      ]
    }
    case 'payment': {
      const pay = record.data
      return [
        ...common,
        { label: t('profile.field.kind'), value: t(`profile.paymentKind.${pay.kind}`) },
        { label: t('profile.field.rider'), value: pay.riderName },
        { label: t('profile.field.captain'), value: pay.captainName },
        /* An id, not a display name: `gatewayId` is a foreign key precisely so
           volume cannot be attributed by prefix-matching a label (D-F16). */
        { label: t('profile.field.gateway'), value: pay.gatewayId },
        { label: t('profile.field.instrument'), value: pay.instrumentLast4 },
        { label: t('profile.field.invoice'), value: pay.invoiceNumber },
        { label: t('profile.field.paymentId'), value: pay.tripId },
      ]
    }
    case 'request': {
      const r = record.data
      return [
        ...common,
        { label: t('profile.request.field.channel'), value: t(`requests.channel.${r.channel}`) },
        { label: t('profile.field.rider'), value: r.riderName },
        { label: t('profile.request.field.pickup'), value: r.pickup },
        { label: t('profile.request.field.destination'), value: r.destination },
        { label: t('profile.request.field.requestedAt'), value: formatDate(r.requestedAt, { style: 'day-month-time', language }) },
      ]
    }
    case 'complaint': {
      const c = record.data
      return [
        ...common,
        { label: t('profile.field.captain'), value: c.driverName },
        { label: t('profile.field.filedBy'), value: c.riderName },
        /* A3 — the code is a join key, not a label. */
        { label: t('profile.field.reasonCode'), value: reasonLabel(t, c.reasonCode) },
        {
          label: t('profile.field.created'),
          value: formatDate(c.filedAt, { style: 'day-month-time', language }),
        },
      ]
    }
  }
}
