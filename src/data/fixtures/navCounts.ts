/**
 * Nav count badges — foundation spec §8.4.
 *
 * Seventeen badge ids exist today across 30 rail items
 * (`GROUND-TRUTH-INVENTORY.md` §B). Under D1 they redistribute across 34
 * sub-tabs. The numbers below are the seeded backlogs the legacy renderers
 * compute at boot, restated per sub-tab.
 *
 * Three cases every screen has to handle, all present here on purpose:
 *
 *   `null`  the sub-tab has no backlog concept — **no badge, ever**
 *   `0`     the backlog is empty — **still no badge**, not a `0`. Legacy paints
 *           the literal `0` on eleven rail badges at boot (`:491`, `:492`,
 *           `:496`, `:508`, `:514`–`:518`, `:523`, `:533`), which is defect
 *           D-L8 and is why operators stop reading them.
 *   `> 0`   a badge, toned `attention` or `neutral` (`.sb-badge a` `:491` vs
 *           `.sb-badge n` `:502`).
 *
 * ## What the two tones mean
 *
 * **`attention` means _breached_. It does not mean _non-empty_.** The count
 * beside the chip already says how many items there are; a tone that only
 * repeats "there are some" is a second copy of the number wearing a colour.
 *
 *   `neutral`    work is queued and inside its window — the normal state of a
 *                healthy backlog, however large. Activity Log's 1,247 is
 *                neutral, and so are eight open subscriptions.
 *   `attention`  something in this queue has **passed a deadline, expired, or
 *                needs a decision now**. An SLA blown, a document lapsed, a
 *                statutory clock run out.
 *
 * An earlier revision of this file toned **nine of the 34** sub-tabs
 * `attention`, using it to mean "has items". That is the same failure as the
 * legacy rail's eleven boot-time zeroes (defect D-L8): a signal that is almost
 * always on carries no information, and operators learn to stop looking at it.
 * **At most two sub-tabs may be `attention` at once**, and
 * `clients/navCounts.test.ts` fails the build if a third appears — so adding
 * one is a deliberate act with a reason attached, not a drive-by.
 *
 * Note the tone is a property of the *queue*, not of its current contents: an
 * escalation queue stays `attention`-kind when it empties, and the count is
 * what makes it visible. That is the whole reason `workspaceBadge` gates on
 * `count > 0` (Q12), and `financials-cash` below is the case that proves it.
 *
 * The 1,247 on Activity Log is deliberate: a four-digit count in a narrow rail
 * column is the layout case nobody designs for until it ships.
 */

import type { SubTabCount } from '../types/navigation'

export const navCountFixtures: SubTabCount[] = [
  /* Management */
  { subTabId: 'management-overview', count: null, tone: 'neutral' },
  { subTabId: 'management-performance', count: null, tone: 'neutral' },
  /* Risk & Signals computes a flag and routes the operator elsewhere — §3.4's
     M1 ruling is explicit that it "has no work queue" (PAGE-TRACEABILITY row 4).
     Six standing signals, nothing breached, nothing to action here. */
  { subTabId: 'management-risk', count: 6, tone: 'neutral' },
  { subTabId: 'management-growth', count: null, tone: 'neutral' },
  /* Zero, not null: the zone watchlist exists and is currently empty. No badge. */
  { subTabId: 'management-zones', count: 0, tone: 'neutral' },

  /* Operations */
  { subTabId: 'operations-overview', count: null, tone: 'neutral' },
  /* Twelve items in your own inbox is a normal shift, not an emergency. */
  { subTabId: 'operations-my-work', count: 12, tone: 'neutral' },
  { subTabId: 'operations-dispatch', count: null, tone: 'neutral' },
  /* Three open ride requests; the oldest (REQ-503) has waited 2:40 with no
     captain found. Uncomfortable, not yet past a deadline. */
  { subTabId: 'operations-requests', count: 3, tone: 'neutral' },
  { subTabId: 'operations-subscriptions', count: 8, tone: 'neutral' },
  /* One pending corporate account — CORP-001 (`:13847`). */
  { subTabId: 'operations-corporate', count: 1, tone: 'neutral' },
  { subTabId: 'operations-trips', count: null, tone: 'neutral' },
  /* Trip Assurance is preventive by design — four trips departing inside 24 h
     that still need a backup captain. Acting early is the point; nothing here
     has failed yet. */
  { subTabId: 'operations-assurance', count: 4, tone: 'neutral' },
  /* Five pending applications (`DB.pendingDrivers`, `:2712`) + 2 compliance expiries. */
  /**
   * **Attention 1 of 2 — and the only one currently visible.**
   *
   * Seven items: five pending applications plus two lapsed compliance
   * documents. Two of them are genuine breaches, both evidenced in this repo's
   * own fixtures rather than asserted here:
   *
   *   `APP-2204` submitted 2026-06-22 13:05 against a 48 h SLA, so it fell due
   *     2026-06-24 13:05 — **20 hours ago** on the fixed clock. It is what
   *     `listApplicants({ view: 'breached' })` returns.
   *   `DRV-0104` has an inspection certificate that expired 2026-06-20 — a gold
   *     captain with 524 trips driving on a lapsed document.
   *
   * If either of those is ever fixed in the fixtures, this tone must go neutral
   * with it.
   */
  { subTabId: 'operations-people', count: 7, tone: 'attention' },

  /* Financials */
  { subTabId: 'financials-overview', count: null, tone: 'neutral' },
  { subTabId: 'financials-revenue', count: null, tone: 'neutral' },
  { subTabId: 'financials-payouts', count: 2, tone: 'neutral' },
  /**
   * **Attention 2 of 2, and the `count > 0` gate's fixture.**
   *
   * Cash & Captain Debt's escalations are a work queue whose items are, by
   * definition, already past the point of routine collection — so the queue is
   * an `attention` *kind* of backlog. Right now it is empty, which is why it
   * renders nothing and why the tone is invisible rather than misleading.
   *
   * Financials therefore rolls up to `count: 2` (from Payouts) and
   * `tone: 'neutral'`, because the only `attention` child has nothing in it.
   * Without the gate the Financials tile would read `warning` over a `2` that,
   * when expanded, shows two routine neutral payout batches and an empty
   * escalation queue with **no badge at all** — a warning the operator cannot
   * trace to anything. Asserted in `clients/navCounts.test.ts`; do not
   * "simplify" it back to a bare `tone === 'attention'` check.
   */
  { subTabId: 'financials-cash', count: 0, tone: 'attention' },
  { subTabId: 'financials-rider-wallets', count: null, tone: 'neutral' },
  { subTabId: 'financials-pricing', count: null, tone: 'neutral' },
  { subTabId: 'financials-ledger', count: null, tone: 'neutral' },

  /* Customer Support */
  { subTabId: 'support-overview', count: null, tone: 'neutral' },
  /* Three open/in-progress tickets (`DB.tickets`, `:2763`), none past its
     response SLA. */
  { subTabId: 'support-tickets', count: 3, tone: 'neutral' },
  { subTabId: 'support-disputes', count: 0, tone: 'neutral' },
  { subTabId: 'support-fairness', count: 2, tone: 'neutral' },
  /**
   * **Known cross-fixture inconsistency, recorded not hidden.** Notification
   * `N7` is an unacknowledged SOS on `TRP-7742`, and an open SOS is the
   * canonical breach — it should give this sub-tab a non-zero `attention`
   * count. It cannot yet: Safety & Incidents is wave 2 and there is no
   * `SafetyIncident` type to count. When that lands, this becomes the strongest
   * `attention` candidate in the product and one of the two above must justify
   * itself or step aside. Flagged for the Safety & Incidents spec.
   */
  { subTabId: 'support-safety', count: 0, tone: 'neutral' },
  { subTabId: 'support-contact-centre', count: 5, tone: 'neutral' },

  /* Admin */
  { subTabId: 'admin-overview', count: 2, tone: 'neutral' },
  { subTabId: 'admin-workspace', count: null, tone: 'neutral' },
  /* USR-4 is `Invited` and has never logged in (`:2837`). */
  { subTabId: 'admin-team', count: 1, tone: 'neutral' },
  { subTabId: 'admin-policy', count: null, tone: 'neutral' },
  { subTabId: 'admin-communications', count: 0, tone: 'neutral' },
  /* One open PDPL erasure request. PDPL does carry a statutory clock, so this
     is the strongest candidate for a third `attention` — but it is inside its
     window today. Toning it up means retiring one of the two above. */
  { subTabId: 'admin-data', count: 1, tone: 'neutral' },
  /* Four digits in a rail badge. Someone will discover this the hard way. */
  { subTabId: 'admin-activity', count: 1247, tone: 'neutral' },
]

/**
 * The "every backlog is empty" fixture. Not reachable by filtering the set
 * above, and it is a **real state**: the console after a clean shift. QA
 * switches to it with `useEmptyNavCounts()`.
 */
export const navCountFixturesAllEmpty: SubTabCount[] = navCountFixtures.map((c) => ({
  ...c,
  count: c.count === null ? null : 0,
}))
