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
 *
 * ## The definition, ruled: two clauses, both required (R4-10b)
 *
 * This file proposed *"a breach whose harm is irreversible or statutory"* and
 * product-designer adopted it with one correction — **"irreversible" is
 * arguable**, so a rider who might churn could be argued into a slot. The
 * ruling tightens it to two clauses, neither sufficient alone:
 *
 *   1. **The harm lands on a person, on money that cannot be recovered, or on a
 *      legal obligation** — never on a metric, a rating, a conversion or a
 *      queue length.
 *   2. **The deadline that makes it irreversible is not one we set.** If the
 *      number can be changed in Admin › Operational Policy and the harm changes
 *      with it, the queue is `neutral`. If the harm accrues whether or not we
 *      have a policy, it is `attention`.
 *
 * **Clause 2 is the falsifiable one and it is checkable from data these
 * fixtures already carry** — `slaSource`, and whether a policy row exists.
 *
 * ## The cap is **3**, and it changed job (R4-10b)
 *
 * It was 2, and this file's own comment showed the cap producing a wrong
 * answer: three queues qualified under a rule everybody agreed with, and a cap
 * of two forced one genuine statutory breach to go quiet. **The cap was never
 * the rule — the definition is.** It stays as a **tripwire**, at 3, so that a
 * fourth is a deliberate act with a reason attached rather than a drive-by, and
 * `navCounts.test.ts` fails the build with the two clauses in its message.
 *
 * ## Wave 2 exhausted the budget, and that is a finding
 *
 * Building the five work queues produced **four** sub-tabs with evidenced,
 * currently-open breaches:
 *
 *   `support-safety`       two unacknowledged SOS incidents (`INC-014`, `INC-015`)
 *   `operations-requests`  a rider five days into a two-hour search window
 *                          (`SREQ-006`), and an instant request two minutes past
 *                          a three-minute one (`REQ-503`)
 *   `support-fairness`     an appeal four and a half days past a 24-hour window
 *                          that nobody has answered at all (`FC-0004`)
 *   `operations-people`    `APP-2204` and `APP-2205` past a 48-hour window, and
 *                          `DRV-0104` driving on a lapsed national ID
 *
 * Four breaches, two slots, and one of the two is spent permanently on
 * `financials-cash` (below). **That conflict is now settled: the cap moved.**
 *
 * Under the two clauses above, a rider waiting five days for a subscription is
 * bad, visible in the count, and governed by **our own** two-hour promise —
 * widen it and the breach vanishes, so clause 2 fails and it stays neutral. An
 * unacknowledged SOS has no dial to turn: `firstResponseMin` is **0**
 * (`:14652`). Applied to every candidate:
 *
 *   `support-safety`       an SOS in progress — a person, and no dial   **attention**
 *   `financials-cash`      money that stops being collectable           **attention**
 *   `admin-data`           PDPL, statutory, and now breached            **attention**
 *   `operations-requests`  the two-hour promise is ours                 neutral
 *   `operations-people`    48h is `slaSource: 'unset'` — nobody set it  neutral
 *   `support-fairness`     the 24-hour window is ours                   neutral
 *
 * ## `operations-people` stepped aside for `support-safety`
 *
 * The previous revision's note said this would happen and why: *"When that
 * lands, this becomes the strongest `attention` candidate in the product and
 * one of the two above must justify itself or step aside."*
 *
 * People stepped aside on the narrowest ground: **its breach rests on a number
 * nobody has decided.** The 48-hour application SLA is a placeholder —
 * `slaSource: 'unset'` on every applicant row says so, and **Q8** is still open
 * on it. A tone that rests on a placeholder moves when the placeholder moves.
 * An SOS breach needs no such number: `DB.slaPolicy.tiers.T1.firstResponseMin`
 * is **0** (`:14652`), and the legacy inbox already treats every open critical
 * incident as past due (`dueMs: -1`, `:19188`).
 *
 * Its count stays at 7 and its badge stays visible. What it loses is the
 * colour. If Q8 sets a real application SLA, People has a claim on the slot
 * again — and something else has to give it up.
 *
 * Note the tone is a property of the *queue*, not of its current contents: an
 * escalation queue stays `attention`-kind when it empties, and the count is
 * what makes it visible. That is the whole reason `workspaceBadge` gates on
 * `count > 0` (Q12), and `financials-cash` below is the case that proves it.
 *
 * ## Three counts were corrected against spec §19 (AC-720, AC-722, AC-724)
 *
 * A badge and a metric tile are allowed to differ — Q-108 — but only when they
 * measure different things and each label says which. Three pairs failed that
 * test and each row below records its own correction:
 *
 *   `management-risk`   badge 6 and an `Open signals` tile of 6, the same
 *                       figure twice. Badge authoritative; the tile is gone.
 *   `admin-activity`    1,247 log rows as a backlog. Now `null`: a log owes
 *                       nobody work.
 *   `management-zones`  a badge of 0 against a `Zones tracked` tile of 6. Now
 *                       2 — supply-starved zones, which is what legacy's own
 *                       badge carries (`:14140`).
 *
 * **Two divergences are legitimate and must not be forced equal.** People's 7
 * is 5 applications plus 2 lapsed documents against an `Applications waiting`
 * tile of 5 (AC-721); My Work's 25 is the backlog against a `Work items past
 * their SLA` tile of 13 (AC-723). Both are asserted by name in
 * `navCounts.test.ts` so that a later "fix" to make them agree fails the build.
 */

import type { SubTabCount } from '../types/navigation'

export const navCountFixtures: SubTabCount[] = [
  /* Management */
  { subTabId: 'management-overview', count: null, tone: 'neutral' },
  { subTabId: 'management-performance', count: null, tone: 'neutral' },
  /**
   * Risk & Signals computes a flag and routes the operator elsewhere — §3.4's
   * M1 ruling is explicit that it "has no work queue" (PAGE-TRACEABILITY row 4).
   * Six standing signals, nothing breached, nothing to action here.
   *
   * **This badge is the authority for the number six — AC-720.** The board used
   * to carry an `Open signals` tile reading the same 6 (`:14375`,
   * `redSubs + atRiskDrivers + paymentRisk`), six pixels from the badge. The
   * tile is deleted in `fixtures/metrics.ts`; the badge stays.
   */
  { subTabId: 'management-risk', count: 6, tone: 'neutral' },
  { subTabId: 'management-growth', count: null, tone: 'neutral' },
  /**
   * **Supply-starved zones — two. Corrected from `0`; AC-724.**
   *
   * The `0` was legacy's boot-time placeholder, ported literally: `:523` writes
   * `<span class="sb-badge a" id="sbb-zones">0</span>` into the markup and the
   * real number is only assigned when the Zones page first renders (`:14140`,
   * `sbb.textContent = starved`). That is defect **L-11** — five badges stale
   * until their page is visited — and this fixture inherited the stale half.
   *
   * **`starved` is what legacy's own badge carries**, and it is not the zone
   * census: `:14133` counts zones where `supply > 0 && demand / supply >= 3`.
   * Two qualify — Al Narjis at 14 : 2 and Al Sahafa at 9 : 3 (`:13952`–`:13959`).
   * The other four sit between 1.2 : 1 and 2.75 : 1.
   *
   * The board's `Zones tracked` tile reads **6**, and a badge of `0` beside a
   * tile of `6` was two different meanings wearing one number: a watchlist and
   * a census. The badge is the watchlist. **Neutral** — a starved zone is a
   * supply shortfall and a recruitment decision, recoverable, not an
   * irreversible or statutory breach.
   *
   * **AC-724 is now assertable — against the right tile.** The board carries
   * `management.zones.starvedZones`, seeded 2 from the same legacy predicate,
   * and `navCounts.test.ts` asserts the pair are equal.
   *
   * **The criterion names the wrong tile and it is carried as a spec error.**
   * AC-724 says *"the first tile on Market & Zones"*; §9.1 ranks
   * `Captains needed for a healthy ratio` first and `Supply-starved zones`
   * second. The badge is legacy's `starved` count, so the tile it must agree
   * with is **tile 2**. Re-ranking the board to make the sentence true would be
   * bending the data to fit a typo.
   *
   * **Still ungrounded, and that is the remaining finding.** There is no zones
   * resource in this layer, so unlike Requests, Assurance, Safety and Fairness
   * neither the badge nor the tile can be asserted against a client — they are
   * asserted against *each other*, and both are cited to `:14133`. A real
   * `clients/zones.ts` closes it.
   */
  { subTabId: 'management-zones', count: 2, tone: 'neutral' },
  /* `count: null` renders no badge at all, which is the honest state for the
     report builder: `hasBacklog: false` (§12.6) because a report is a question,
     not a queue. A `0` here would draw an empty chip claiming there is a
     backlog with nothing in it. */
  { subTabId: 'management-reports', count: null, tone: 'neutral' },

  /* Operations */
  { subTabId: 'operations-overview', count: null, tone: 'neutral' },
  /**
   * **Computed, not seeded — O8.** `clients/navCounts.ts` overwrites this with
   * `myWorkBacklogSize()`; the number here is the expected value a bug report
   * can name, and it moved to 46 when tickets and disputes joined (T1.6).
   *
   * Legacy would tone this `attention` whenever anything is breached
   * (`:19314`), which lights the chip permanently. Count and tone are separate.
   */
  { subTabId: 'operations-my-work', count: 46, tone: 'neutral' },
  { subTabId: 'operations-dispatch', count: null, tone: 'neutral' },
  /**
   * Seven open requests — four instant, three subscription — of which **three
   * are past their deadline**: `REQ-503` by two minutes against a three-minute
   * promise (`:9832`), `SREQ-003` by twelve hours and `SREQ-006` by five days
   * against a two-hour one (`:9577`).
   *
   * **This was the strongest `attention` candidate that did not get a slot,
   * and the cap moving did not give it one** — which is the point of R4-10b
   * replacing a budget with a definition. Its breaches are measured, not
   * placeholders, so it passes clause 1 more convincingly than
   * `operations-people` does. **It fails clause 2**: the two-hour promise
   * (`:9577`) is ours, it lives in Admin › Operational Policy, and widening it
   * makes the breach vanish. A rider waiting five days is a bad week, not an
   * unrecoverable one, and the count says seven either way.
   */
  /* The seven open requests, split by the channel each tab now pins: four
     instant, three subscription. A tab's badge counts the rows that tab
     shows — a combined seven on either would send an operator looking for
     three rows that are on the other tab. */
  { subTabId: 'operations-ride-requests', count: 4, tone: 'neutral' },
  { subTabId: 'operations-subscription-requests', count: 3, tone: 'neutral' },
  /* **Computed, not seeded — O8.** `subscriptionCount()` overwrites this with
     what the default `all` view shows. The old `8` matched nothing on the page
     (X3); seventy is the number the queue's own footer prints. */
  { subTabId: 'operations-subscriptions', count: 70, tone: 'neutral' },
  /* One pending corporate account — CORP-001 (`:13847`). */
  { subTabId: 'operations-corporate', count: 1, tone: 'neutral' },
  { subTabId: 'operations-quick-rides', count: null, tone: 'neutral' },
  { subTabId: 'operations-subscription-trips', count: null, tone: 'neutral' },
  /**
   * Four legs departing inside 24 h with **no eligible backup captain** —
   * `listAssuranceTrips({ view: 'no-backup-captain' })`, asserted in
   * `navCounts.test.ts`. Two of the four have nobody registered at all; one has
   * a registered backup whose vehicle sits below the plan tier, which is the
   * gap `renderCoverage` calls the only number that matters (`:17520`).
   *
   * Preventive by design. Two of these legs *are* past the 21:00 confirmation
   * cut-off, so the queue has breaches — but the harm is still avoidable right
   * up to departure, which is the whole point of the screen. Neutral.
   */
  { subTabId: 'operations-assurance', count: 4, tone: 'neutral' },
  /**
   * **Computed, not seeded — O8.** `captainCount()` overwrites this with what
   * People's default `captains` view shows. The old `7` was a cross-view sum
   * (five applications plus two lapsed documents) that appeared on no single
   * page, so no operator could reconcile it (X3).
   *
   * `neutral`, not `attention`: it stepped aside for `support-safety` in wave 2.
   */
  { subTabId: 'operations-people', count: 57, tone: 'neutral' },

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
  /**
   * **Fourteen open cases — was four, and the move is deliberate.**
   *
   * Ten of `fillerFairnessCases` are now live rather than decided. That file
   * says why in full: `Deadline` and `Owner` are columns only a live case can
   * fill, the landing view is a *kind* filter rather than a status one, and the
   * result was a queue whose first screen was 16 rows of archive and one row of
   * work — 336px of a 1038px table carrying one value between two columns
   * (`docs/audit/PAGE-SWEEP.md` §2 S8).
   *
   * This literal and that generator are pinned to each other by
   * `navCounts.test.ts` — *"support-fairness equals the open case queue"* —
   * which is exactly the coupling that made the old comment warn against
   * growing the queue. The warning was right; the answer is to move both
   * numbers in one pass, not to leave the queue empty.
   *
   * The named cases still carry the reasons the badge is worth reading:
   * `FC-0003` is 64 minutes past a 24-hour window and `FC-0004` is four and a
   * half days past one **with no first response at all** — the appeal route not
   * answering is the failure the appeal route exists to prevent.
   *
   * Neutral, under the same rule as Requests: bad, visible in the count,
   * recoverable. It is the second candidate if the cap ever moves.
   */
  { subTabId: 'support-fairness', count: 14, tone: 'neutral' },
  /**
   * **Attention 1 of 2, and the only one currently visible. The cross-fixture
   * inconsistency this file recorded is now closed.**
   *
   * The previous revision said: *"Notification `N7` is an unacknowledged SOS on
   * `TRP-7742`, and an open SOS is the canonical breach — it should give this
   * sub-tab a non-zero `attention` count. It cannot yet: there is no
   * `SafetyIncident` type to count."* There is now, and `INC-015` is that
   * incident — same trip, same rider (`RDR-2055`), same captain (`DRV-0103`),
   * same minute.
   *
   * Six open incidents. Two of them are unacknowledged criticals:
   *
   *   `INC-014`  SOS on `TRP-9012`, opened 09:02, **no protocol step ticked**
   *   `INC-015`  SOS on `TRP-7742`, opened 09:08, the same
   *
   * The breach needs no product decision to exist:
   * `DB.slaPolicy.tiers.T1.firstResponseMin` is `0` (`:14652`) — respond
   * immediately — and the legacy inbox already pushes every open critical
   * incident as already breached (`dueMs: -1`, `:19188`). Both rows carry
   * `firstResponseBreachedAt` set to their own `openedAt`.
   *
   * **If both are acknowledged, this must go neutral with them.**
   * `navCounts.test.ts` asserts the link, so it cannot quietly stop being true.
   */
  { subTabId: 'support-safety', count: 6, tone: 'attention' },
  { subTabId: 'support-contact-centre', count: 5, tone: 'neutral' },

  /* Admin */
  { subTabId: 'admin-overview', count: 2, tone: 'neutral' },
  { subTabId: 'admin-workspace', count: null, tone: 'neutral' },
  /* USR-4 is `Invited` and has never logged in (`:2837`). */
  { subTabId: 'admin-team', count: 1, tone: 'neutral' },
  { subTabId: 'admin-policy', count: null, tone: 'neutral' },
  { subTabId: 'admin-communications', count: 0, tone: 'neutral' },
  /**
   * **The third `attention` queue, and the reason R4-10b raised the cap.**
   *
   * One PDPL erasure request, **now past its statutory deadline**
   * (`ERASURE_SLA_DAYS = 30`, `:15962`; the tile is
   * `admin.overview.erasureOverdue`). This row's previous revision predicted
   * exactly this in writing — *"it takes a slot the moment it runs out…
   * toning it up means retiring one of the two above, and `support-safety`
   * would not be the one to go"* — which is the conflict R4-10b settled by
   * moving the cap rather than by silencing a genuine statutory breach.
   *
   * It passes **both** clauses on its own terms:
   *
   *   1. the harm lands on a **legal obligation**, not on a metric;
   *   2. the deadline **is not ours** — PDPL's thirty days cannot be widened in
   *      Admin › Operational Policy, which is the falsifiable half.
   *
   * Its count is unchanged at 1: one request, and it is now late.
   */
  { subTabId: 'admin-data', count: 1, tone: 'attention' },
  /**
   * **`null`, not 1,247 — AC-722.**
   *
   * A badge means *work waiting* (Q-46: a count is work owed in the sub-tab).
   * The Activity Log owes nobody anything: it is an append-only record of what
   * already happened, there is nothing in it to action, and no value of it
   * changes what an operator does. 1,247 was the row count of the log, which is
   * a measure of how busy the log was.
   *
   * **A cost, named:** this was the only four-digit count in the fixture, and
   * the header used to call that deliberate — *"a four-digit count in a narrow
   * rail column is the layout case nobody designs for until it ships."* That
   * case now has no coverage anywhere. Re-creating it needs a sub-tab that
   * genuinely owes four digits of work, and none does. Flagged to visual-QA
   * rather than kept as a wrong number for a right reason.
   */
  { subTabId: 'admin-activity', count: null, tone: 'neutral' },
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
