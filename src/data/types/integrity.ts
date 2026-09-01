/**
 * Data integrity — Admin › Data & Compliance, the `integrity` pane (P6-T4).
 *
 * Legacy ancestor: `#stab-integrity` (`eyvar_ops_panel_v40_fixed.html:1750`),
 * `reconcileEntity()` (`:18517`, monkey-patched at `:20437`) and
 * `integrityScan()` (`:18566`). The rationale is written out at `:18471`–`:18493`
 * and is worth keeping in front of anyone who edits this file:
 *
 * > *"A rider profile showed '6 trips · 750.67 SAR paid' in the header and 'no
 * > trips on record' two centimetres below it. Both numbers were rendered by
 * > the same function, from two different sources, with nothing comparing
 * > them."*
 *
 * ## The one rule this whole type exists to enforce
 *
 * **Every finding names the check that produced it.** `IntegrityFinding.checkId`
 * is required, is a member of a closed union, and has no `null` arm. A finding
 * with no provenance is unactionable: the operator cannot tell a real problem
 * from a stale rule, and cannot decide whether to fix the record or delete the
 * check. Legacy gets this half-right — its rows carry a `severity` but never the
 * rule's identity, so `Trips: 42 vs 0` is a sentence with no author.
 *
 * ## A check reports; it does not repair
 *
 * There is deliberately no `fix` / `repair` / `autoResolve` field anywhere in
 * this file. Legacy has one — `rebuildAllHistory()` (`:18605`) — and it is the
 * single most destructive action in the settings screen: it **generates**
 * hundreds of trip and payment records so a stored total stops disagreeing with
 * the records behind it, and it does so with **no permission gate at all**
 * (`16b` §12 item 1; `saveDataWindow`, which only changes a number, is the one
 * that checks `manage_settings`). Making a number look consistent by inventing
 * the records under it is not a repair. If a repair is ever warranted it gets
 * its own client, its own permission and its own audit entry — not a column on
 * a findings table.
 *
 * ## Determinism
 *
 * An integrity check is a computation over fixture state and must produce the
 * same answer on every run, or nothing that diffs output — a snapshot, a visual
 * regression, a QA repro — can tell a real change from the clock ticking. So:
 * run ids come from a session counter, timestamps are `EYVAR_NOW`, and finding
 * ids are derived from the check, the record and the field.
 */

import type { BadgeTone, Halalas, IsoDateTime, LocalisedText } from './common'

/* ─────────────────────────── the catalogue ───────────────────────────── */

/**
 * The checks, as a closed set.
 *
 * Closed rather than free text for the same reason `AuditAction` is: a findings
 * table whose provenance column is a string cannot be grouped, filtered or
 * translated, and *"group by check"* is one of the two groupings this pane
 * owes. Adding a check is a one-line addition here plus its arm in
 * `clients/integrity.ts` — the compiler finds every place that has to change.
 *
 * The prefix is the group and is not decorative: `ref.` cannot resolve an id,
 * `agree.` finds two records that disagree about one fact, `invariant.` finds
 * one record disagreeing with itself, `money.` reconciles halalas.
 */
export type IntegrityCheckId =
  /* ── dangling references ── */
  | 'ref.trip-links'
  | 'ref.subscription-links'
  | 'ref.person-links'
  | 'ref.ticket-subject'
  | 'ref.money-party'
  | 'ref.ledger-subject'
  /* ── two records that disagree ── */
  | 'agree.party-name'
  | 'agree.escrow-amount'
  | 'agree.aggregate-vs-records'
  /* ── one record disagreeing with itself ── */
  | 'invariant.status-fields'
  | 'invariant.counters'
  /* ── money ── */
  | 'money.trip-split'
  | 'money.wallet-balance'
  | 'money.journal-balance'
  | 'money.payout-net'

export const INTEGRITY_CHECK_IDS: readonly IntegrityCheckId[] = [
  'ref.trip-links',
  'ref.subscription-links',
  'ref.person-links',
  'ref.ticket-subject',
  'ref.money-party',
  'ref.ledger-subject',
  'agree.party-name',
  'agree.escrow-amount',
  'agree.aggregate-vs-records',
  'invariant.status-fields',
  'invariant.counters',
  'money.trip-split',
  'money.wallet-balance',
  'money.journal-balance',
  'money.payout-net',
] as const

/** What kind of question the check asks. The pane groups its check list by this. */
export type IntegrityCheckGroup = 'reference' | 'contradiction' | 'invariant' | 'financial'

export const INTEGRITY_CHECK_GROUPS: readonly IntegrityCheckGroup[] = [
  'reference',
  'contradiction',
  'invariant',
  'financial',
] as const

/**
 * How much the finding matters.
 *
 * Three values, and **two of them share a badge tone on purpose**. R7's palette
 * is closed at five tones with no red, and R17 gives exactly one warning tone —
 * *"separate the two with the label, not a second fill"*. `ComplianceDocState`
 * already sets that precedent (`expiring` and `critical` are both `warning`),
 * and this follows it rather than minting a sixth tone for a sixth screen.
 *
 *   `critical`  the record cannot be used as it stands — a dangling id, money
 *               that does not add up. Takes the §8.4 row marker as well.
 *   `warning`   the record is usable but two surfaces will disagree about it.
 *   `advisory`  worth knowing, not worth stopping for.
 */
export type IntegritySeverity = 'critical' | 'warning' | 'advisory'

export const INTEGRITY_SEVERITY_ORDER: readonly IntegritySeverity[] = [
  'critical',
  'warning',
  'advisory',
] as const

/** R7/R17 — see `IntegritySeverity`. There is no red badge and no sixth tone. */
export const INTEGRITY_SEVERITY_TONE: Readonly<Record<IntegritySeverity, BadgeTone>> = {
  critical: 'warning',
  warning: 'warning',
  advisory: 'info',
}

/**
 * What a finding is *about*.
 *
 * Overlaps `ProfileEntityType` but is not it: that union answers *"what does
 * `?entity=<id>` open"* and covers `plan` and `applicant`, which no check
 * reads; this one covers `payout`, `escrow-hold`, `deduction`,
 * `ledger-posting` and `journal-entry`, which that one does not. Two questions,
 * two unions — collapsing them would put five always-unreachable arms on the
 * profile resolver.
 */
export type IntegrityEntityType =
  | 'rider'
  | 'driver'
  | 'trip'
  | 'subscription'
  | 'ticket'
  | 'corporate-account'
  | 'payout'
  | 'escrow-hold'
  | 'deduction'
  | 'ledger-posting'
  | 'journal-entry'

/**
 * The entity types `?entity=<id>` can actually open, so the findings table can
 * decide **before paint** whether a row gets a link or a plain code.
 *
 * A link that resolves to *"No record found"* is worse than no link on a
 * findings table specifically: the operator is already being told the data is
 * wrong, and a dead link reads as a second fault rather than as the expected
 * consequence of the first.
 */
export const INTEGRITY_LINKABLE_ENTITY_TYPES: readonly IntegrityEntityType[] = [
  'rider',
  'driver',
  'trip',
  'subscription',
  'ticket',
  'corporate-account',
] as const

/* ───────────────────────────── the check ─────────────────────────────── */

export interface IntegrityCheck {
  id: IntegrityCheckId
  group: IntegrityCheckGroup
  /**
   * What the check verifies, as a sentence an operator understands. A key, not
   * a sentence — every string on this pane resolves through the screen's
   * `copy.ts` like every other string in the product.
   */
  titleKey: string
  descriptionKey: string
  /** The worst severity this check is capable of raising. Not the worst it found. */
  severity: IntegritySeverity
  /** Which records it reads. Renders as the blast radius on the check row. */
  scope: readonly IntegrityEntityType[]
  /**
   * **`null` means "not run in this session", and `0` means "ran and found
   * nothing".** Those are different facts and a screen that renders both as
   * `0` is lying about the second one — which is the whole defect this pane
   * exists to catch, reproduced in its own chrome.
   */
  lastRunAt: IsoDateTime | null
  findingCount: number | null
  /** How many records the last run read. The denominator that makes `0` mean something. */
  recordsScanned: number | null
}

/* ──────────────────────────── the finding ────────────────────────────── */

export interface IntegrityFinding {
  /**
   * Stable across runs and derived from the finding itself —
   * `${checkId}|${entityId}|${field}` — so two runs over unchanged data
   * produce the same ids and a diff shows nothing.
   */
  id: string
  /**
   * **The rule.** Which check produced this row. Required, never null: see the
   * file header.
   */
  checkId: IntegrityCheckId
  severity: IntegritySeverity
  entityType: IntegrityEntityType
  entityId: string
  /** What to call the record in a list. The id when the record has no name. */
  entityLabel: string
  /** Dotted from the record root — `riderId`, `bank.iban`, `messages[0].senderName`. */
  field: string
  /**
   * What is wrong. Keyed plus named params, never an assembled sentence, and
   * money params keep the `Halalas` suffix so `formatLocalisedText` is still
   * the only formatter (`lib/format/localisedText.ts`).
   */
  detail: LocalisedText
  /**
   * The other record in a contradiction — the ticket that disagrees with the
   * rider, the hold that disagrees with the subscription. `null` on a finding
   * that is about one record only.
   */
  counterpartType: IntegrityEntityType | null
  counterpartId: string | null
  /**
   * The gap, when the check is arithmetic. `null` on every non-money check.
   * Signed and integral: **an off-by-one halala is a finding, not a rounding
   * artefact** (§8.3 — money never becomes a float on the way through).
   */
  deltaHalalas: Halalas | null
}

/* ───────────────────────────── the run ───────────────────────────────── */

export interface IntegrityRun {
  /** `IRUN-0001`, from a session counter. Never a clock-derived id. */
  id: string
  ranAt: IsoDateTime
  /** Which checks this run covered — one, several, or all of them. */
  checkIds: readonly IntegrityCheckId[]
  /**
   * The **whole** catalogue, with each check's state after this run. Checks the
   * run did not cover keep whatever they knew before, including `null`.
   */
  checks: readonly IntegrityCheck[]
  /** Only the findings from the checks this run covered. */
  findings: readonly IntegrityFinding[]
  /** Records read across the covered checks. */
  recordsScanned: number
}

/** How the findings table is grouped. Both groupings are required by P6-T4. */
export type IntegrityGrouping = 'check' | 'entity'
