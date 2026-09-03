/**
 * The four onboarding tracks — **21 steps, ids verbatim from
 * `docs/05-restructure/design/08-auth-and-onboarding.md` §10.5**.
 *
 * ## The ids are the contract, and two criteria diff against them
 *
 * **AC-618** — steps 1–3 are byte-identical across all four tracks, *by step
 * `id`*. **AC-642** — step ids present in both tracks and already completed stay
 * completed across a role change, so nobody redoes the common three.
 *
 * Both are satisfied structurally rather than by discipline: `common.account`,
 * `common.mywork` and `common.audit` exist **once**, as data, and all four
 * tracks list the same three ids. There is no second copy to drift.
 *
 * > **Getting an id subtly wrong makes both criteria fail in a way that looks
 * > like a logic bug.** They are copied from §10.5 and not adapted.
 *
 * ## Track sizes, and they are the spec's
 *
 * | Role | Steps | Criterion |
 * |---|---:|---|
 * | Owner | 3 + 4 = **7** | AC-619 |
 * | Finance | 3 + 5 = **8** | AC-622 |
 * | Ops Manager | 3 + 5 = **8** | AC-624 |
 * | Support | 3 + 4 = **7** | AC-627 |
 *
 * 3 common + 4 + 5 + 5 + 4 = **21 rows**. Thirty *track memberships*, 21 rows.
 *
 * **AC-624 and AC-603 measure different things and a QA engineer who conflates
 * them files a defect against a correct screen** (spec §19.3). `steps` carries
 * every row in the track — no step is ever hidden (AC-611) — and `total` counts
 * only the reachable ones.
 *
 * **They currently agree, and that is a fact about today's route table, not
 * about the rule.** `UNBUILT_SUB_TAB_IDS` in `clients/routes.ts` is `[]` since
 * Live Dispatch and Support › Tickets shipped, so every destination in all four
 * tracks resolves and is built and **no step is unavailable**. An Ops Manager
 * sees eight rows and reads `n of 8`. The moment a track points at an unbuilt
 * destination the two diverge again, and nothing in this file changes when it
 * does — which is AC-626, and is why the ops.dispatch note below now records a
 * discharged criterion rather than a pending one.
 *
 * ## `null` twice on every row, and neither is an oversight
 *
 *   - **`learnMoreKey: null` × 21.** Eyvar has no help centre. §5.6's SHOULD,
 *     unmet, recorded as **Q-82** with a named content owner (**F-2**). Design
 *     §10.2 renders no link on any step ever, and **AC-605 fails if one is
 *     rendered** (spec §19.3 C-5). *Not to be filled in by guessing.*
 *   - ~~**`requiredPermission: null` × 21**, until **D4/Q4**~~ — **CLOSED
 *     2026-09-02.** That blocker was cleared when the route table gained real
 *     permissions (35 of 36 rows now carry a `viewPermission`) and nobody closed
 *     the loop here. Every step is now gated by the permission its own
 *     destination requires, **derived from the route table**, and
 *     `onboardingGates.test.ts` asserts they stay equal.
 *
 *     It was not cosmetic. Support's step 6 sent them into
 *     `financials-rider-wallets` (`view_finance`) and Finance's step 2 into
 *     `operations-my-work` (`view_operations`) — two of four tracks walking an
 *     operator into a workspace their role forbids.
 *
 *     Three steps stay `null` and are correct: two target a shell layer, which
 *     has no route permission, and `common.audit` targets `admin-activity`,
 *     the one route deliberately open to every authenticated operator.
 *
 *     **Consequence to weigh, and it is the owner's call:** gating means a
 *     Finance or Support operator no longer sees the `My Work` step at all,
 *     because that queue lives in Operations. The alternative is granting them
 *     `view_operations` — a permission-model change, not a fixture edit. Gating
 *     is the safe direction: a missing step costs a little guidance, a broken
 *     one costs trust in the whole track.
 *
 * ## English copy — owed by `src/screens/…/copy.ts`, which is not this file
 *
 * The keys below are `onboarding.step.<id>.title` / `.body`. The strings are
 * §10.5's, final, and reproduced here so frontend-engineer can lift them
 * verbatim and so **AC-618's byte-identity has one place to be diffed from**:
 *
 * ```
 * common.account       Check the account that is now yours
 *   Confirm the number your codes go to, then review your active sessions and end anything you don't recognise.
 * common.mywork        Claim one item, then release it
 *   Operations › My Work is where every queue reaches you. Claim something from Unassigned and release it again, so you learn what a claim is before you're holding six.
 * common.audit         Find your own name in the activity log
 *   Everything you do here is recorded with your name on it. Read the log once, and read who is on call, so you know who to reach at 2am.
 *
 * owner.team           Read the role matrix, and decide if it still holds
 *   One account holds manage_settings, and that key gates 39 of the console's 131 permission checks. Decide whether that is still acceptable.
 * owner.policy         Read the policy you are accountable for
 *   Dispatch radius, operating limits, SLA targets and reason codes. Read them once, deliberately, rather than the first time one is disputed.
 * owner.position       State the current contribution margin
 *   The trial balance and the contribution margin are the two numbers you'll be asked about. This is where they live, and this step is done when you can say them out loud.
 * owner.pricing        Settle how captains are paid
 *   The console computes captain earnings four different ways and nobody has chosen one. That decision is outstanding, and it is yours.
 *
 * finance.ledger       Read a ledger before you post to one
 *   Learn the sign convention, and learn that a posted row is never edited — it is reversed by a second row. Nothing in Financials undoes itself.
 * finance.escrow       Read what releasing escrow does, without releasing it
 *   Open one escrow row and read it through. Release moves money to a captain, and there is no undo — only a reversing entry.
 * finance.reconciliation  Work one reconciliation item end to end
 *   Claim it, decide it, and watch the row convert in place. This queue is how cash and captain debt stay true to each other.
 * finance.goodwill     Find the cap that bounds a goodwill credit
 *   You and Support share one compensation cap. Find the number before a rider asks you to go past it.
 * finance.routing      Know which queue reaches you
 *   Disputes route to Finance. Turn role routing off once in My Work and see what changes, so you know what you're filtering out.
 *
 * ops.application      Decide one captain application end to end
 *   Read the documents, then approve or reject. The row gives you a tick, a cross and View — there is no menu to open.
 * ops.requests         Claim, work and dispose of one request
 *   Watch the SLA clock while you hold it. Read what a breach means — a breach is a missed target, not a failure to act.
 * ops.assurance        Cover one trip before it departs
 *   Trip Assurance lists subscriptions with no backup captain. Register or replace a captain on one of them.
 * ops.dispatch         Tell a stale feed from a dead one
 *   Live Dispatch shows a freshness line. Learn the difference between data that is late and data that has stopped, before you act on either.
 * ops.fairness         Read one suspension appeal from the captain's side
 *   Captain Fairness shows you the economics a suspension takes away. Read one before you're asked to answer for a decision.
 *
 * support.ticket       Answer one ticket end to end
 *   Open it, respond, and resolve it with a reason code. The reason code is what makes a ticket countable later.
 * support.profile      Open a 360° profile, and know what you may not do with it
 *   One profile carries every piece of personal data the console holds about a person, across 11 record types. Open it only when the work in front of you needs it.
 * support.goodwill     Credit a rider, inside your cap
 *   This is the one money action you take mid-call, and it's bounded by policy. Find the cap before you need it.
 * support.boundary     Know what you may not decide, and who does
 *   You can see every safety incident and you cannot decide one — an Ops Manager does. Read one incident, and stop there.
 * ```
 *
 * Plus the four role intros (§10.5, keys `onboarding.intro.owner` ·
 * `.opsManager` · `.finance` · `.support`), whose strings are in the design doc
 * and are not repeated here because no fixture references them — the client
 * returns the role and the layer picks the key.
 *
 * ## Four view ids these steps name that the route table does not declare
 *
 * `all-postings`, `escrow`, `reconciliation` and `goodwill` are §10.5's, and
 * `ROUTE_TABLE` declares **no views at all** on `financials-revenue`,
 * `financials-payouts`, `financials-cash` or `financials-rider-wallets`. The
 * ids are kept as the designer wrote them rather than blanked, because a step
 * that lands on an unfiltered list is the AC-693 failure — *"a link to an
 * unfiltered list is worse than no link, because it looks like it worked"* —
 * and blanking them would hide the gap instead of naming it.
 *
 * **Requested from the route-table owner, not taken.** `clients/onboarding.test.ts`
 * pins the list, so the test fails if it *grows* and passes silently when the
 * views land. Same precedent as `operations.overview.breachedWorkItems`'
 * `?view=breached`.
 */

import type { OnboardingStep, OnboardingTracks } from '../types/onboarding'

/** `Omit` of the two server-derived fields — a fixture may not state them (§8.2). */
export type OnboardingStepSeed = Omit<OnboardingStep, 'available' | 'reachable'>

const key = (id: string, part: 'title' | 'body') => `onboarding.step.${id}.${part}`

/**
 * All 21, in one flat array. Deliberately not a factory: someone will need to
 * hand-edit one of these to reproduce a bug, and `order` is per-track position
 * so it must be visible on the row rather than inferred from an index.
 */
export const onboardingStepSeeds: OnboardingStepSeed[] = [
  /* ── common — all four tracks, positions 1–3, byte-identical (AC-618) ──── */
  {
    id: 'common.account',
    order: 1,
    titleKey: key('common.account', 'title'),
    bodyKey: key('common.account', 'body'),
    learnMoreKey: null,
    /* The `my-account` shell layer, security section — not a sub-tab. */
    destination: { subTabId: null, view: 'security', layer: 'account' },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: null,
  },
  {
    id: 'common.mywork',
    order: 2,
    titleKey: key('common.mywork', 'title'),
    bodyKey: key('common.mywork', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'operations-my-work', view: 'unassigned', layer: null },
    completion: 'auto',
    autoSignal: 'queue.item.claimed',
    requiredPermission: 'view_operations',
  },
  {
    id: 'common.audit',
    order: 3,
    titleKey: key('common.audit', 'title'),
    bodyKey: key('common.audit', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'admin-activity', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: null,
  },

  /* ── Owner — 4 (AC-619) ───────────────────────────────────────────────── */
  {
    /** **AC-620.** */
    id: 'owner.team',
    order: 4,
    titleKey: key('owner.team', 'title'),
    bodyKey: key('owner.team', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'admin-team', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'manage_team',
  },
  {
    id: 'owner.policy',
    order: 5,
    titleKey: key('owner.policy', 'title'),
    bodyKey: key('owner.policy', 'body'),
    learnMoreKey: null,
    /* §10.5 writes the destination as `admin/operational-policy`; the route
       table's row is `admin-policy` at `/admin/policy`. The id is the route
       table's, because the id is what resolves. */
    destination: { subTabId: 'admin-policy', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_admin',
  },
  {
    /**
     * **The one named exception to AC-630**, which bans a workspace Overview as
     * a destination. Spec §19.2 rewrote the carve-out as a **closed allow-list
     * of exactly one step id**, diffable against this fixture, plus the clause
     * the ban was reaching for: *no step's destination is the operator's own
     * `session.landingRoute`.*
     *
     * `financials/overview` **is** the Finance role's landing route and **is
     * not** the Owner's — which is exactly why this step is worth an Owner's
     * morning and would be worth nothing to a Finance lead. All 21 satisfy the
     * landing-route clause; `clients/onboarding.test.ts` asserts it.
     */
    id: 'owner.position',
    order: 6,
    titleKey: key('owner.position', 'title'),
    bodyKey: key('owner.position', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-overview', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },
  {
    /** **AC-621.** */
    id: 'owner.pricing',
    order: 7,
    titleKey: key('owner.pricing', 'title'),
    bodyKey: key('owner.pricing', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-pricing', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },

  /* ── Finance — 5 (AC-622) ─────────────────────────────────────────────── */
  {
    /** **AC-623.** `all-postings` is not yet a declared view — see the header. */
    id: 'finance.ledger',
    order: 4,
    titleKey: key('finance.ledger', 'title'),
    bodyKey: key('finance.ledger', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-revenue', view: 'all-postings', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },
  {
    id: 'finance.escrow',
    order: 5,
    titleKey: key('finance.escrow', 'title'),
    bodyKey: key('finance.escrow', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-payouts', view: 'escrow', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },
  {
    id: 'finance.reconciliation',
    order: 6,
    titleKey: key('finance.reconciliation', 'title'),
    bodyKey: key('finance.reconciliation', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-cash', view: 'reconciliation', layer: null },
    completion: 'auto',
    autoSignal: 'queue.item.disposed',
    requiredPermission: 'view_finance',
  },
  {
    id: 'finance.goodwill',
    order: 7,
    titleKey: key('finance.goodwill', 'title'),
    bodyKey: key('finance.goodwill', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-rider-wallets', view: 'goodwill', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },
  {
    id: 'finance.routing',
    order: 8,
    titleKey: key('finance.routing', 'title'),
    bodyKey: key('finance.routing', 'body'),
    learnMoreKey: null,
    /* No `?view=` — the step is about the role-routing toggle, not a tab. */
    destination: { subTabId: 'operations-my-work', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_operations',
  },

  /* ── Ops Manager — 5 (AC-624) ─────────────────────────────────────────── */
  {
    /** Auto-completes on **D8**'s direct tick/cross, not on opening the row. */
    id: 'ops.application',
    order: 4,
    titleKey: key('ops.application', 'title'),
    bodyKey: key('ops.application', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'operations-people', view: 'applications', layer: null },
    completion: 'auto',
    autoSignal: 'application.decided',
    requiredPermission: 'view_operations',
  },
  {
    /** **AC-625.** */
    id: 'ops.requests',
    order: 5,
    titleKey: key('ops.requests', 'title'),
    bodyKey: key('ops.requests', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'operations-ride-requests', view: null, layer: null },
    completion: 'auto',
    autoSignal: 'queue.item.disposed',
    requiredPermission: 'view_operations',
  },
  {
    /**
     * §10.5 writes `operations/trip-assurance?view=no-backup`; the route table's
     * row is `operations-assurance` and its view id is **`no-backup-captain`**.
     * The route table's id is used, because a near-miss view id lands the
     * operator on the default tab and looks like it worked.
     */
    id: 'ops.assurance',
    order: 6,
    titleKey: key('ops.assurance', 'title'),
    bodyKey: key('ops.assurance', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'operations-assurance', view: 'no-backup-captain', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_operations',
  },
  {
    /**
     * **AC-626 — DISCHARGED, and this row is the evidence.**
     *
     * Was *"unbuilt, wave 6"*: `available: false`, rendered disabled in place
     * with `Live Dispatch isn't built yet. This step will open when it is.`,
     * and excluded from `totalCount`. Live Dispatch has since shipped
     * (`screens/operations/dispatch`, routed as `operations-dispatch`), the
     * route-table owner removed its line from `UNBUILT_SUB_TAB_IDS`, **and not
     * one character of this row moved** — which is exactly the property AC-626
     * asks for. `available` was never fixture data; it is derived in
     * `clients/onboarding.ts`, so there is nothing here to un-set.
     *
     * The disabled treatment is still the designed behaviour for the next
     * unbuilt destination, and is covered — labelled **synthetic**, because no
     * real step reaches it any more — in `screens/onboarding/onboarding.test.tsx`.
     */
    id: 'ops.dispatch',
    order: 7,
    titleKey: key('ops.dispatch', 'title'),
    bodyKey: key('ops.dispatch', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'operations-dispatch', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_operations',
  },
  {
    id: 'ops.fairness',
    order: 8,
    titleKey: key('ops.fairness', 'title'),
    bodyKey: key('ops.fairness', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'support-fairness', view: 'suspension-appeals', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_support',
  },

  /* ── Support — 4 (AC-627) ─────────────────────────────────────────────── */
  {
    /**
     * Was *"unbuilt, wave 5"*. Support › Tickets shipped as `support-tickets`
     * and left `UNBUILT_SUB_TAB_IDS` with it; same discharge as `ops.dispatch`,
     * same zero edits here.
     */
    id: 'support.ticket',
    order: 4,
    titleKey: key('support.ticket', 'title'),
    bodyKey: key('support.ticket', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'support-tickets', view: null, layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_support',
  },
  {
    /** The `profile` shell layer, reached from any rider or captain row. */
    id: 'support.profile',
    order: 5,
    titleKey: key('support.profile', 'title'),
    bodyKey: key('support.profile', 'body'),
    learnMoreKey: null,
    destination: { subTabId: null, view: null, layer: 'profile' },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: null,
  },
  {
    /* The same destination as `finance.goodwill`, and deliberately so: §10.5
       gives Support and Finance one shared compensation cap, and the step that
       teaches it is the same screen for both. Two ids, one destination — the
       ids differ because the bodies do. */
    id: 'support.goodwill',
    order: 6,
    titleKey: key('support.goodwill', 'title'),
    bodyKey: key('support.goodwill', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'financials-rider-wallets', view: 'goodwill', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_finance',
  },
  {
    /** **AC-628** — read-only, and the body says so rather than the data. */
    id: 'support.boundary',
    order: 7,
    titleKey: key('support.boundary', 'title'),
    bodyKey: key('support.boundary', 'body'),
    learnMoreKey: null,
    destination: { subTabId: 'support-safety', view: 'open', layer: null },
    completion: 'manual',
    autoSignal: null,
    requiredPermission: 'view_support',
  },
]

/**
 * **Four tracks, one per role in `ROLE_NAMES`. No default and no fallback
 * (AC-617)** — a role with no track is a bug and must read as one, not quietly
 * inherit somebody else's checklist.
 *
 * **D4 is a data edit** (spec §8.6): a fifth role is one array here plus its
 * own step rows above. Nothing else in the product moves.
 */
export const ONBOARDING_TRACKS: OnboardingTracks = {
  Owner: ['common.account', 'common.mywork', 'common.audit', 'owner.team', 'owner.policy', 'owner.position', 'owner.pricing'],
  Finance: [
    'common.account',
    'common.mywork',
    'common.audit',
    'finance.ledger',
    'finance.escrow',
    'finance.reconciliation',
    'finance.goodwill',
    'finance.routing',
  ],
  'Ops Manager': [
    'common.account',
    'common.mywork',
    'common.audit',
    'ops.application',
    'ops.requests',
    'ops.assurance',
    'ops.dispatch',
    'ops.fairness',
  ],
  Support: [
    'common.account',
    'common.mywork',
    'common.audit',
    'support.ticket',
    'support.profile',
    'support.goodwill',
    'support.boundary',
  ],
}

/** The three shared ids, named once so **AC-618** and **AC-642** can point at them. */
export const COMMON_STEP_IDS: readonly string[] = [
  'common.account',
  'common.mywork',
  'common.audit',
]

/**
 * **AC-630's closed allow-list — exactly one step id.**
 *
 * Spec §19.2: an exception written as prose invites a second one. This is the
 * list, and `clients/onboarding.test.ts` asserts its length.
 */
export const OVERVIEW_DESTINATION_ALLOW_LIST: readonly string[] = ['owner.position']
