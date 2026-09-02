/**
 * The **reason-code vocabulary** — one operator-facing label per code, as keys
 * (**AC-74**), and the resolver every surface that shows a code goes through.
 *
 * ## The defect this closes (gap A3, `docs/ref/i18n.md`)
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

import type { Dictionary, Translate } from '@/lib'

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
