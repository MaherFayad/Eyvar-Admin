/**
 * The **shared domain vocabularies** — the families the DATA LAYER emits and
 * more than one surface renders, as keys (**AC-74**), each with the resolver
 * every surface goes through.
 *
 * Two families live here today and they are here for one reason:
 *
 *   `reason.*`   — a reason code, minted on a ticket, a complaint, a fairness
 *                  case, a ledger posting, a refund and an audit line.
 *   `rider.*`    — `Rider.churnReason` and `RiderTimelineEvent.kind`, rendered
 *                  by the rider side sheet AND the full-page rider profile.
 *
 * **The test for membership is "how many surfaces mint it", not "what is it
 * about".** A string one screen renders belongs in that screen's `copy.ts`. A
 * string the data layer hands to whoever asks belongs here, because six copies
 * of its label is six chances to disagree about what the code means.
 *
 * The `rider.*` half is set out under its own heading below `VOCABULARY_EN`.
 *
 * ## `reason.*` — the defect this closes (gap A3, `docs/ref/i18n.md`)
 *
 * Eight render sites printed the raw code. `TicketsScreen.tsx:155` and
 * `TicketDetailScreen.tsx:486` did it in `font-mono`, so a support operator
 * read `fare_dispute` and `captain_absence`; Admin › Activity, the refunds
 * table and the 360° profile rail and drawer did the same with
 * `PAY_REFUND_REQ` and `dispute_toll_charge`. A machine identifier is not copy
 * and it is not translatable — under `lang="ar"` it stays English forever, and
 * it is unreadable in either language.
 *
 * The irony worth recording: `admin/policy/ReasonCodesCard.tsx` is 735 lines
 * built entirely around the rule that a code is **never renamed**, *because* a
 * key that stops resolving "turns a two-year-old decision into a raw
 * `TRP_GHOST_COMPLETE` on screen" (its own header). It sat two files from two
 * screens doing exactly that.
 *
 * ## Why this is one shared module and not six screen dictionaries
 *
 * A reason code is a **cross-cutting vocabulary**: the same `CAP_LATE` lands on
 * a ticket, a complaint, a fairness case, a ledger posting, a refund and an
 * audit line. Six copies of its label is six chances to disagree about what the
 * code means, and the whole point of a closed vocabulary is that it means one
 * thing. `screens/queues/copy.ts` is the same shape — one contract vocabulary,
 * inherited rather than restated.
 *
 * It is **not** in `dictionaries.ts`: that file is the shell. This is domain
 * vocabulary, and it is assembled into `EN` the same way a screen's `copy.ts`
 * is — one import, one spread.
 *
 * ## Where these labels come from, and the one duplication to be aware of
 *
 * The 32 registry codes carry `labels: { en, ar }` **in the registry itself**
 * (`fixtures/policy.ts`), because an operator with `manage_ops_policy` can mint
 * and re-label a code at runtime and no static key can describe a code invented
 * tomorrow. The English side here is the **shipped default**, byte-identical to
 * the registry today.
 *
 * The duplication is deliberate and bounded, and it exists because
 * `resolveReasonCode()` is **async** — a `DataTable` cell renderer cannot await
 * a registry read per row, and a table that fetches 50 labels to draw one page
 * is worse than the defect. `ReasonCodesCard` keeps rendering the live,
 * editable registry label; every read-only surface renders this one.
 *
 * **Follow-up, once `data/clients/policy.ts` is free** (another agent is in it):
 * expose a synchronous `reasonCodeLabels()` snapshot fed by the registry read
 * the shell already does, and make `reasonLabel()` prefer it, falling back to
 * these keys. That collapses the duplication to a seed without changing a
 * single call site.
 *
 * ## The fallback is the raw code, on purpose
 *
 * `Ticket.reasonCode` is typed `string`, not a union, and it has to stay that
 * way while the registry is operator-editable. So `reasonLabel()` cannot
 * blind-call `t()`: an unknown code would throw the AC-74 dev guard on a
 * perfectly legitimate value. It tests membership first and returns the code
 * unchanged when there is no key — the pre-A3 behaviour, and only for codes
 * that genuinely have no label anywhere. The set below is complete against
 * every code any shipped fixture or client mints, so that path is unreachable
 * today; it opens the day somebody adds a code, and it degrades to what the
 * screen already did rather than to a crash or a blank.
 */

import type { RiderTier, RiderTimelineDetail, RiderTimelineKind } from '@/data/types'
import { formatCount, formatDate } from '@/lib'
import type { Dictionary, Language, Translate } from '@/lib'

export const VOCABULARY_EN: Dictionary = {
  /* ── the registry, §1 captain conduct and reliability ─────────────── */
  'reason.CAP_CANCEL_ADV': 'Captain cancelled in advance',
  'reason.CAP_LATE': 'Captain late for pickup',
  'reason.CAP_NOSHOW': 'Captain no-show',
  'reason.CAP_OFFPLATFORM_PAY': 'Captain asked for cash off-platform',
  'reason.CAP_CONDUCT': 'Captain behaved inappropriately',

  /* ── the registry, §2 booking ─────────────────────────────────────── */
  'reason.BKG_CANCEL_REQ': 'Rider cancelled the booking',
  'reason.BKG_WRONG_SLOT': 'Rider booked the wrong date or time',
  'reason.BKG_NO_SUPPLY': 'No captain available in the area',

  /* ── the registry, §3 payment ─────────────────────────────────────── */
  'reason.PAY_INCORRECT_CHARGE': 'Rider charged incorrectly',
  'reason.PAY_DECLINED': 'Payment failed or was declined',
  'reason.PAY_REFUND_REQ': 'Rider asked for a refund',
  'reason.PAY_GOODWILL': 'Goodwill credit, no fault found',

  /* ── the registry, §4 trip ────────────────────────────────────────── */
  'reason.TRP_ROUTE_DEVIATION': 'Captain took the wrong route',
  'reason.TRP_LOST_ITEM': 'Rider left belongings in the vehicle',
  /* Retired in the registry, and it still resolves here — that is the whole
     rule the registry pane exists to keep. A closed dispute from two years ago
     points at this string and must keep reading as a sentence. */
  'reason.TRP_GHOST_COMPLETE': 'Trip completed but the rider never boarded',
  'reason.TRP_FALSE_COMPLETE': 'Captain ended a trip that never ran',
  'reason.TECH_STATE_DESYNC': 'Ride state desync — the two apps disagree',

  /* ── the registry, §5 technical ───────────────────────────────────── */
  'reason.APP_LOGIN': 'Rider cannot sign in',
  'reason.APP_CRASH': 'App crashes or will not open',
  /* Also retired. Same rule. */
  'reason.APP_PROMO': 'Promo code did not apply',

  /* ── the registry, §6 safety ──────────────────────────────────────── */
  'reason.SAF_RIDER_UNSAFE': 'Rider felt unsafe during the trip',
  'reason.SAF_ACCIDENT': 'Accident or vehicle breakdown',
  'reason.SAF_THEFT': 'Item lost or stolen during the trip',

  /* ── the registry, subscriptions ──────────────────────────────────── */
  'reason.SUB_SAME_CAPTAIN_BROKEN': 'Assigned captain changed mid-plan',
  'reason.SUB_FREEZE_TRAVEL': 'Rider away — plan paused',
  'reason.SUB_FREEZE_MEDICAL': 'Medical reason — plan paused',

  /* ── the registry, captain-side disputes and money ────────────────── */
  'reason.DRV_RATING_DISPUTE': 'Captain disputes an unfair rating',
  'reason.DRV_DEDUCTION_DISPUTE': 'Captain disputes a deduction',
  'reason.DRV_SUSPENSION_APPEAL': 'Captain appeals a suspension',
  'reason.DRV_DOC_EXPIRED': 'Required document expired',
  'reason.CASH_SHORTFALL': 'Cash collected does not match the trip',

  /* ── the registry, the escape hatch ───────────────────────────────── */
  'reason.OTHER_UNCODED': 'Other — needs a taxonomy review',

  /* ── off-registry, but shipped in fixtures ────────────────────────────
     Four codes that reach a screen and are in no registry entry. They are
     labelled here rather than left raw; whether they should be *added* to the
     registry is a taxonomy question for the policy owner, not an i18n one. */
  /* `fixtures/ledger.ts` — a rider who declined the captain offered. */
  'reason.BKG_CAPTAIN_PREF': 'Rider asked for a different captain',
  /* `fixtures/fairness.ts` — the three captain-raised cases the registry has no
     entry for. Fairness renders its own shorter forms under `fairness.reason.*`
     because every row on that screen is already a captain's; these are the
     forms for surfaces where that context is not given. */
  'reason.DRV_RIDER_NOSHOW': 'Rider did not show for the trip',
  'reason.DRV_RIDER_CONDUCT': 'Rider behaved inappropriately',
  'reason.DRV_VEHICLE_DAMAGE': 'Rider damaged the vehicle',

  /* ── the ticket vocabulary ────────────────────────────────────────────
     `snake_case`, minted before the registry existed, and the five codes an
     operator was reading raw. Each is labelled from what the fixture ticket it
     sits on actually SAYS, which is not always what the code looks like:

       `payout_blocked` is not "the payout is late" — TKT-505 is a payout run
       that REFUSED the captain's bank details, so the label names the refusal
       and not the delay.
       `app_issue` is not "the app is broken" — TKT-504 is an upload that fails,
       so the label stays as wide as the code and no wider.
       `captain_absence` is a SCHEDULED departure nobody arrived for, which is
       the subscription case and not the on-demand `CAP_NOSHOW`. */
  'reason.fare_dispute': 'Rider disputes the fare',
  'reason.lost_item': 'Rider left belongings in the vehicle',
  'reason.captain_absence': 'Captain did not arrive for a scheduled trip',
  'reason.app_issue': 'App fault reported',
  'reason.payout_blocked': 'Payout refused on the details held',

  /* ── minted by the dispute resolver ───────────────────────────────────
     `clients/disputes.ts:370` builds `dispute_${kind}` for the wallet, ledger
     and audit lines a resolution writes, so the six `DisputeKind` members each
     reach a screen as a reason code. They are enumerated, not derived: a key
     assembled at runtime is a key no extractor can see. */
  'reason.dispute_no_show': 'Disputed — no-show',
  'reason.dispute_vehicle_class': 'Disputed — vehicle class',
  'reason.dispute_fare_dispute': 'Disputed — fare',
  'reason.dispute_toll_charge': 'Disputed — toll charge',
  'reason.dispute_cancellation_fee': 'Disputed — cancellation fee',
  'reason.dispute_vehicle_damage': 'Disputed — vehicle damage',
}

/**
 * Every code `VOCABULARY_EN` labels, derived from the keys themselves so the
 * set and the dictionary cannot drift apart. Adding a key is the only step.
 */
const LABELLED = new Set(
  Object.keys(VOCABULARY_EN)
    .filter((key) => key.startsWith('reason.'))
    .map((key) => key.slice('reason.'.length)),
)

/** Whether a code has a label — for a caller that wants to branch on it. */
export function hasReasonLabel(code: string): boolean {
  return LABELLED.has(code)
}

/**
 * The label an operator reads for a reason code, in the active language.
 *
 * Returns the code unchanged when nothing labels it, rather than calling `t()`
 * and tripping AC-74's dev guard on a code the registry legitimately minted
 * after this file was written. See the header.
 *
 * **`null` in, `null` out** — a `Complaint`'s and an `AuditEntry`'s reason code
 * are both nullable, and *"no reason was recorded"* is a different statement
 * from *"the reason has no label"*. The caller renders the em dash it already
 * renders for every other absent field; this function does not invent one.
 */
export function reasonLabel(t: Translate, code: string): string
export function reasonLabel(t: Translate, code: string | null | undefined): string | null
export function reasonLabel(t: Translate, code: string | null | undefined): string | null {
  if (code === null || code === undefined) return null
  return LABELLED.has(code) ? t(`reason.${code}`) : code
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE RIDER VOCABULARY — `rider.*`
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * **The two families the rider data layer emits, and neither profile surface
 * mints.**
 *
 * `Rider.churnReason` is a `LocalisedText` and `RiderTimelineEvent` is a `kind`
 * plus a `detail` bag — in both cases the *server* names the sentence and the
 * *client* fills its placeholders. A side sheet and a full page both render
 * them, which is the whole argument for this file: `types/rider.ts` puts it as
 * *"the side sheet would infer 'lapsed' … and `RDR-4002` would carry two
 * different explanations of one badge on two surfaces of the same record."*
 *
 * ## `rider.churn.*` — six keys, and where they came from
 *
 * Enumerated as `ChurnReasonKey` in `types/rider.ts`, which also carries the
 * legacy line for each. Two take a parameter: `complaintsFiled` a `{count}`,
 * `lowRenewalRate` a `{percent}`.
 *
 * The English is **moved, not rewritten**. It was parked in
 * `components/profile/rider/copy.ts`, whose header says so and asks for exactly
 * this: *"these six belong beside the other data-layer-emitted families … and
 * whoever owns them should take them out of this file."* The Arabic is likewise
 * lifted verbatim from `i18n/ar/riderProfile.ts` rather than re-spelled — a
 * second spelling of a shipped string is the drift this module exists to stop.
 *
 * **`complaintsFiled` is not a plural family and cannot be one.** A
 * `LocalisedText` resolves through `formatLocalisedText`, which takes
 * `Translate` and not `Translator`, so `t.plural` is unreachable from it. The
 * English is phrased so the count *trails* the noun (`Complaints on record: 1`),
 * which is correct at every count in both languages instead of correct at one
 * of them. This is a phrasing constraint, not a licence to write
 * `count === 1 ? … : …` at a call site.
 *
 * ## `rider.timeline.*` — eight kinds, a title and a subtitle each
 *
 * `kind` picks the sentence and `detail` fills it; the event carries **no
 * rendered string**, because a pre-joined title would be untranslatable and
 * would take the record link with it (`types/rider.ts`).
 *
 * ### The placeholders are optional and `interpolate` throws — so the branching
 * ### is here, once, and not in two screens
 *
 * `RiderTimelineDetail` is optional-keyed on purpose. `clients/riders.ts`
 * **omits** `pickup`/`destination` when the trip never recorded them, and omits
 * `location` when the movement log holds no registration row. But
 * `interpolate()` throws on a placeholder with no parameter — *"Translation
 * needs a `destination` parameter, and none was given."* So the day a surface
 * renders `TRP-9003` (cancelled at Al Aqiq before a destination was confirmed,
 * `fixtures/trips.ts:235`) a `{destination}` in the template is a crash, not a
 * gap.
 *
 * That is why `riderTimelineStrings()` exists and why both surfaces should call
 * it rather than reaching for the keys: the variant keys below are chosen by
 * **which fields the event actually carries**, and getting that wrong is a
 * throw rather than a blemish.
 *
 * ### `captainAssigned: false` gets its own sentence, not a clause
 *
 * §9.6 forbids building a string by concatenation, so *"Trip requested ·
 * TRP-9104, still unassigned"* cannot be `title + ', ' + t('…unassigned')`. It
 * is a third string — `note` on the returned object — which the surface renders
 * as its own element. `TRP-9104` is the record the design's card is built
 * around and the only reason this key exists.
 *
 * ### The mirrored glyph is IN the string
 *
 * `{pickup} → {destination}` in English, `{pickup} ← {destination}` in Arabic.
 * §9.5 and `lib/i18n/direction.ts`: a glyph that mirrors is swapped at
 * string-construction time and never with CSS, and a dictionary IS string
 * construction time. Same rule `profile.rider.trip.route` follows.
 *
 * ### Proper nouns are interpolated, never translated
 *
 * `{plan}` is `Subscription.planName` — `Weekly Economy`, a product name, which
 * R4 leaves in Latin with its English capitalisation. `{pickup}`,
 * `{destination}` and `{location}` are Saudi place names, Arabic in this data.
 * All four are strong-first-character runs, so the render site wraps them in a
 * bare content-sized `<bdi>` (`dir="auto"`) — see `lib/i18n/isolate.ts`, and
 * note that it rules **against** U+2066/U+2069 in the string itself because the
 * control characters ride along into an operator's next search box.
 */
export const RIDER_VOCABULARY_EN: Dictionary = {
  /* ── why a rider is a churn risk — `ChurnReasonKey`, `types/rider.ts` ─── */
  'rider.churn.noSubscription': 'No subscription — quick rides only.',
  'rider.churn.cancelledOnRecord': 'A cancelled subscription is on record.',
  'rider.churn.complaintsFiled': 'Complaints on record: {count}',
  'rider.churn.ratingBelowFour': 'Rating below 4.',
  'rider.churn.lowRenewalRate': 'Renewal rate {percent}%.',
  'rider.churn.lapsedUnused': 'The plan lapsed with nothing used.',

  /* ── the timeline, one title per `RiderTimelineKind` ──────────────────
     The record id is NOT in the title. `recordId` is a link the surface draws,
     and a `TRP-9104` baked into the sentence is a link that cannot be clicked
     and a Latin run inside Arabic prose with no element to isolate it. */
  'rider.timeline.account-registered.title': 'Account registered',
  'rider.timeline.trip-requested.title': 'Trip requested',
  'rider.timeline.trip-completed.title': 'Trip completed',
  'rider.timeline.trip-cancelled.title': 'Trip cancelled',
  /* Neutral about WHOSE no-show, deliberately. `Trip.status: 'no-show'` does not
     say, and the reason-code vocabulary needs two separate codes to tell them
     apart (`CAP_NOSHOW` vs `DRV_RIDER_NOSHOW`). Naming a party here would be
     inventing a fact the data does not carry. */
  'rider.timeline.trip-no-show.title': 'Trip recorded as a no-show',
  'rider.timeline.subscription-started.title': 'Subscription started',
  'rider.timeline.subscription-expired.title': 'Subscription expired',
  'rider.timeline.subscription-cancelled.title': 'Subscription cancelled',

  /* ── the timeline, one subtitle per kind ──────────────────────────────
     The four trip kinds share a route subtitle by VALUE and not by reference:
     four keys, four identical strings. They are separate because a subtitle is
     the kind's to change — the day a cancelled trip wants to say when it was
     cancelled, that is an edit to one key. `vocabulary.test.ts` asserts the
     four still agree in both languages, so drift is a build failure rather
     than something noticed in a screenshot. */
  'rider.timeline.account-registered.subtitle': '{location} · {tier} tier',
  'rider.timeline.trip-requested.subtitle': '{pickup} → {destination}',
  'rider.timeline.trip-completed.subtitle': '{pickup} → {destination}',
  'rider.timeline.trip-cancelled.subtitle': '{pickup} → {destination}',
  'rider.timeline.trip-no-show.subtitle': '{pickup} → {destination}',
  'rider.timeline.subscription-started.subtitle': '{plan} · {from} → {to}',
  'rider.timeline.subscription-expired.subtitle': '{plan} · {used} of {total} trips used',
  'rider.timeline.subscription-cancelled.subtitle': '{plan} · {used} of {total} trips used',

  /* ── the variants the omitted fields need ─────────────────────────────
     Each of these is reachable, and one of them is reachable TODAY: `TRP-9003`
     and `TRP-9108` are cancelled with `destination: null`, so the pickup-only
     route is on a shipped fixture. The place-less registration is reachable by
     TYPE — every seeded rider carries an `Account registered` movement row, and
     `clients/riders.ts` omits `location` rather than guessing it from `city`
     when one does not. */
  'rider.timeline.account-registered.subtitleNoPlace': '{tier} tier',
  'rider.timeline.trip.routePickupOnly': 'From {pickup} — no destination confirmed',
  /* The §9.6 case: its own sentence, never a clause welded onto the title. */
  'rider.timeline.trip.noCaptain': 'No captain was assigned.',
  /**
   * **The same fact about a trip that is still open, and it is a different
   * sentence rather than a second spelling.**
   *
   * The line above is a timeline row: it reports something that has finished
   * happening, so it is past tense. A live trip card reports a trip that is
   * open right now and still waiting — `No captain was assigned` there reads
   * as though the trip is over, which is the one thing that card exists to say
   * it is not.
   *
   * Both surfaces' live cards take THIS key and both timelines take that one,
   * so the tense follows the context rather than the surface. That is the
   * distinction the shared module is for: one sentence per meaning, not one
   * sentence per string that looks similar.
   */
  'rider.trip.noCaptainYet': 'No captain assigned yet.',
}

/**
 * The tier labels the registration subtitle reads, enumerated rather than built
 * as a template key. Same rule the dispute codes above follow: a key assembled
 * at runtime is a key no extractor can see.
 *
 * They are `people.tier.*` and not a second spelling, because `Gold` already has
 * a translated label that the riders table renders. The rider sheet's own header
 * makes the same choice for the same reason — *"a second spelling of Wallet on
 * one surface is how two surfaces start disagreeing about a word."*
 */
const TIER_LABEL_KEY: Readonly<Record<RiderTier, string>> = {
  gold: 'people.tier.gold',
  silver: 'people.tier.silver',
  bronze: 'people.tier.bronze',
  new: 'people.tier.new',
}

/**
 * Every `RiderTimelineKind`, so a test can iterate the union at runtime — the
 * type is erased and `RIDER_TIMELINE_KINDS` is the only thing a completeness
 * check can loop over.
 *
 * **Built from a `Record` and not written as an array**, because an array
 * `satisfies readonly RiderTimelineKind[]` proves every entry is a kind and
 * says nothing about whether every kind is an entry. A `Record` keyed on the
 * union is exhaustive in both directions: a ninth kind added to `types/rider.ts`
 * and not listed here is a compile error, which is the point — the alternative
 * is a kind that renders in dev, passes review, and throws
 * `Missing translation key` on the first record that carries it.
 */
const TIMELINE_KINDS: Readonly<Record<RiderTimelineKind, true>> = {
  'account-registered': true,
  'trip-requested': true,
  'trip-completed': true,
  'trip-cancelled': true,
  'trip-no-show': true,
  'subscription-started': true,
  'subscription-expired': true,
  'subscription-cancelled': true,
}

export const RIDER_TIMELINE_KINDS = Object.keys(TIMELINE_KINDS) as readonly RiderTimelineKind[]

/**
 * One timeline row's strings — three fields, because §9.6 forbids the fourth.
 *
 * `note` is a **separate sentence**, not something to append to `subtitle`. The
 * design's card reads *"Trip requested · TRP-9104, still unassigned"* and the
 * only way to render that without concatenating a translated fragment is to
 * give the surface two strings and let the layout join them.
 *
 * `subtitle` is `null` when the event carries nothing to say — a trip with
 * neither end of its route recorded. The row draws its title and its record
 * link and no second line. That is absence rendered as absence; inventing *"No
 * route recorded"* would put a sentence where the data has none.
 */
export interface RiderTimelineStrings {
  title: string
  subtitle: string | null
  note: string | null
}

/**
 * The strings for one timeline event, in the active language — **the resolver
 * both profile surfaces go through**.
 *
 * Takes the event rather than the strings so that the *branching* is shared and
 * not just the vocabulary. Which variant key a missing `destination` selects,
 * whether a place-less registration falls back or throws, and how a date is
 * formatted are all decisions that must have one answer across the sheet and
 * the full page — the same argument `getRiderTimeline` makes for deriving the
 * events on the server rather than merging them twice on the client.
 *
 * **It cannot throw on well-typed input.** Every optional field in
 * `RiderTimelineDetail` has a branch, which is the point: `interpolate()` throws
 * on an unfilled placeholder, so a template chosen without checking its inputs
 * is a crash on a legitimate record.
 *
 * Dates go through `formatDate` and counts through `formatCount`, both in the
 * UI language, so a row cannot group a number one way here and another way in
 * the rail two inches to its left (§9.2).
 */
export function riderTimelineStrings(
  t: Translate,
  event: { kind: RiderTimelineKind; detail: RiderTimelineDetail },
  language: Language = 'en',
): RiderTimelineStrings {
  const { kind, detail } = event
  const title = t(`rider.timeline.${kind}.title`)
  const subtitleKey = `rider.timeline.${kind}.subtitle`

  switch (kind) {
    case 'account-registered': {
      const { location, tier } = detail
      /* `tier` is optional on the type and always set by the client. Absent, the
         row has nothing to say about itself and says nothing. */
      if (tier === undefined) return { title, subtitle: null, note: null }
      const tierLabel = t(TIER_LABEL_KEY[tier])
      return {
        title,
        subtitle:
          location === undefined
            ? t('rider.timeline.account-registered.subtitleNoPlace', { tier: tierLabel })
            : t(subtitleKey, { location, tier: tierLabel }),
        note: null,
      }
    }

    case 'subscription-started': {
      const { planName, startedOn, endsOn } = detail
      if (planName === undefined || startedOn === undefined || endsOn === undefined) {
        return { title, subtitle: null, note: null }
      }
      return {
        title,
        subtitle: t(subtitleKey, {
          plan: planName,
          from: formatDate(startedOn, { style: 'day-month', language }),
          to: formatDate(endsOn, { style: 'day-month', language }),
        }),
        note: null,
      }
    }

    case 'subscription-expired':
    case 'subscription-cancelled': {
      const { planName, tripsUsed, tripsIncluded } = detail
      if (planName === undefined || tripsUsed === undefined || tripsIncluded === undefined) {
        return { title, subtitle: null, note: null }
      }
      return {
        title,
        subtitle: t(subtitleKey, {
          plan: planName,
          used: formatCount(tripsUsed, language),
          total: formatCount(tripsIncluded, language),
        }),
        note: null,
      }
    }

    case 'trip-requested':
    case 'trip-completed':
    case 'trip-cancelled':
    case 'trip-no-show': {
      const { pickup, destination, captainAssigned } = detail
      /* Only the FALSE case is a sentence. `true` is the unremarkable state and
         a row saying "a captain was assigned" on every completed trip is noise;
         `undefined` is the field never being set, which is not the same claim as
         "nobody came" and must not render as one. */
      const note = captainAssigned === false ? t('rider.timeline.trip.noCaptain') : null
      if (pickup !== undefined && destination !== undefined) {
        return { title, subtitle: t(subtitleKey, { pickup, destination }), note }
      }
      if (pickup !== undefined) {
        return { title, subtitle: t('rider.timeline.trip.routePickupOnly', { pickup }), note }
      }
      return { title, subtitle: null, note }
    }
  }
}
