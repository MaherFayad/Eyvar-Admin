/**
 * The onboarding layer's strings — design §10, and the **21 step titles and
 * bodies of §10.5, verbatim**.
 *
 * ## Why these are lifted from the fixture's header and not re-typed
 *
 * `src/data/fixtures/onboardingTracks.ts` reproduces all 21 pairs in its own
 * header comment, explicitly *"so frontend-engineer can lift them verbatim and
 * so **AC-618's byte-identity has one place to be diffed from**"*. **AC-618** —
 * *steps 1–3 are byte-identical across all four tracks, by step `id`* — is only
 * a meaningful check if there is one authority for the bytes. There is: the
 * design spec §10.5, copied once into the fixture's header, copied once here.
 *
 * The three `common.*` steps exist **exactly once as data** (the fixture is 21
 * rows plus four id lists, not 21 × 4 rows), so AC-618 is a property of the
 * shape rather than a four-way diff of duplicated literals — which is a test a
 * copy-paste slip passes.
 *
 * ## Two absences that are decisions, not gaps in this file
 *
 * **No `Learn more` key, for any step.** §5.6 SHOULDs one on every guide task
 * and `copy.md` rule 11 gives its exact form. **Eyvar has no help centre**, so
 * `learnMoreKey` is `null` on all 21 fixture rows and the layer renders
 * nothing. Deviation **A-7**, finding **F-2**, tracked as **Q-82** — and
 * **AC-605 now *fails* if a link renders** (spec §19.3 C-5), so the absence is
 * enforced rather than tolerated. Adding a key here would break the criterion.
 *
 * **No toast copy for auto-completion.** §10.2: when a step's `autoSignal`
 * fires because the operator did the real task, the step marks done
 * **silently**. They already got that task's own toast; a second one for a
 * checklist tick is a toast where nothing is needed. The standing signal is the
 * account-menu entry's `n / m`, which is where R10 routes a standing condition.
 * *"Stated because an engineer will otherwise add the toast"* (**AC-612**).
 */

import type { Dictionary } from '@/lib'

export const ONBOARDING_EN: Dictionary = {
  /* ───────────────────────────── chrome ───────────────────────────────── */
  'onboarding.title': 'Getting started',
  /* Present at all times, for every role (**AC-598**). Carries `{done} / {total}`
     while the track is incomplete AND undismissed; no indicator otherwise. */
  'onboarding.menuEntry': 'Getting started',
  'onboarding.menuCount': '{done} / {total}',
  'onboarding.close': 'Close',
  /* §5.6's required format, exactly. **AC-602**, **AC-681**. Two numbers in one
     sentence, so it is `t()` and **not** a plural family — `pluralCountIn`
     refuses two numerics deliberately, because there is no defensible way to
     guess which one governs the verb. */
  'onboarding.progress': '{done} of {total} completed',
  'onboarding.skipped': 'Skipped ({count})',
  'onboarding.archived': 'Completed under a previous role ({count})',
  'onboarding.restart': 'Restart onboarding',
  'onboarding.dismiss': 'Dismiss',

  /* ───────────────────────────── the intro ────────────────────────────── */
  /* §8.3 part 1 — one sentence of what the role is accountable for. Where a
     role is *deliberately* bounded, this sentence carries the boundary. */
  'onboarding.intro.owner':
    "You're accountable for the whole console — policy, people, money, and the decisions nobody else can make.",
  'onboarding.intro.opsManager':
    'You keep trips covered and captains working — applications, requests, assurance and dispatch.',
  'onboarding.intro.finance':
    "You move money and account for it — payouts, escrow, deductions and reconciliation. You can see profiles, and you cannot change a captain's status.",
  /* Support's second sentence is load-bearing (§8.5): with three permissions the
     role is not equipped for a suspension decision, and the boundary is more
     useful on day one than the capability list. */
  'onboarding.intro.support':
    "You answer riders and captains, and you're the first person to hear when something goes wrong. You can see a safety incident and you cannot decide one — an Ops Manager does.",
  /* **AC-601** — for `lina@eyvar.com` this reads 3. Two numbers, one sentence,
     `t()` not `t.plural`. */
  'onboarding.intro.dispatcher':
    'You keep the live board clear: requests, trips under way and the captains covering them. Pricing and approvals belong to the Ops Manager.',
  'onboarding.intro.trustSafety':
    'You decide on safety incidents, appeals and captain suspensions. You read the analytics and the queues; money and settings are not yours.',
  'onboarding.intro.permissions': 'You hold {held} of {total} permissions.',
  /* §8.3 part 3, with the sub-tab name as a link that opens the route and
     closes the layer.

     **The workspace prefix is not rendered, and that is a deviation I am
     naming.** §10.1's literal is `Work assigned to you arrives in Operations ›
     My Work.` Building `Operations › My Work` means concatenating two
     translated fragments, which **AC-670** forbids outright, and there is no
     single key for the pair. So the placeholder carries the SUB-TAB name from
     the route table — itself a key, per §11 — and the workspace word is
     dropped. Reported to product-designer; the alternative is a new key for
     the qualified name. */
  'onboarding.intro.myWork': 'Work assigned to you arrives in {subTab}.',
  /* C-3 — replaces the My Work line once the three shared steps are done. */
  'onboarding.intro.commonDone': 'The three steps everyone does are done. The rest is yours.',
  'onboarding.intro.welcome': 'Welcome, {name}',
  'onboarding.group.common': 'Your first three',
  'onboarding.group.role': 'For your role',

  /* The first-arrival welcome (owner override of §5.6, RULINGS.md 2026-09-05). */
  'onboarding.welcome.eyebrow': 'Eyvar Admin',
  'onboarding.welcome.title': 'Welcome, {name}',
  'onboarding.welcome.step1.body':
    'Riders subscribe, captains drive, and this console is where the team keeps both moving: trips, wallets, payouts and every queue in between.',
  'onboarding.welcome.step1.reach': 'Your role reaches {workspaces}.',
  'onboarding.welcome.step2.title': 'Your work arrives in one place',
  'onboarding.welcome.step2.body':
    'Every queue you can see lands in My Work. Claim an item to make it yours, work it on its own screen, then release it. Nothing is assigned to you silently.',
  'onboarding.welcome.step3.title': 'Jump from the keyboard',
  'onboarding.welcome.step3.body':
    'Press ⌘K, or Ctrl K on Windows, to open a queue, find a record by its ID, or run an action without leaving the page you are on.',
  'onboarding.welcome.step4.title': 'Your first {count} tasks',
  'onboarding.welcome.step4.body':
    '{count} real tasks on real screens, picked for your role. The console ticks a step the moment you do it. Come back any time from the ring in the corner or your account menu.',
  'onboarding.welcome.next': 'Next',
  'onboarding.welcome.back': 'Back',
  'onboarding.welcome.start': 'Start the checklist',
  'onboarding.welcome.later': 'Not now',
  'onboarding.welcome.progress': 'Step {current} of {total}',
  'onboarding.welcome.image.mywork': 'My Work, with claimed items and their deadlines',
  'onboarding.welcome.image.palette': 'The command palette, listing queues with waiting items',

  /* The floating progress beacon. */
  'onboarding.beacon.label': 'Getting started, {done} of {total} completed',
  'onboarding.beacon.open': 'Open the full checklist',
  'onboarding.beacon.hide': 'Hide until next sign-in',

  /* ─────────────────────────── the step row ───────────────────────────── */
  'onboarding.step.open': 'Open {subTab}',
  /* §5.6's MUST, on **every** step whether or not it auto-detects (**AC-606**). */
  'onboarding.step.markDone': 'Mark as done',
  'onboarding.step.skip': 'Skip this step',
  /* **AC-633** — un-skips, returns the row to its position, and expands it. */
  'onboarding.step.doThis': 'Do this step',
  /* **AC-609** — the destination is not built. Disabled **in place**, reason
     named, excluded from `total`. Never hidden (**AC-611**). */
  'onboarding.step.unbuilt': "{subTab} isn't built yet. This step will open when it is.",
  /* **AC-610 / AC-666** — designed, keyed, copied, and **unreachable** until
     foundation Q4 lands: every `requiredPermission` is `null`, so no step can
     enter this state. Known-failing on arrival, and it is not a regression. */
  'onboarding.step.forbidden':
    'This step needs the “{permission}” permission. An Owner can grant it in Admin › Team & Access.',
  /* §10.2 — the marker glyph is decorative; the state is carried by the row's
     accessible name. `Check the account that is now yours, completed`. */
  'onboarding.step.a11y.completed': '{title}, completed',
  'onboarding.step.a11y.skipped': '{title}, skipped',
  'onboarding.step.a11y.unavailable': '{title}, unavailable',

  /* ─────────────────────────── the states ─────────────────────────────── */
  /* **AC-631** — `no-match` empty: one grey sentence, no illustration (R8). The
     intro and the progress line are **not** rendered; there is nothing to be
     `0 of 0` about. */
  'onboarding.trackEmpty':
    'No steps are available for this role yet — an owner can check your permissions in Admin › Team & Access.',
  /* **AC-649** — card scope, inside the layer. The console behind it keeps
     working, which is the whole reason the scope is not `page`. */
  'onboarding.error': "Couldn't load your checklist. Nothing has changed.",
  'onboarding.tryAgain': 'Try again',
  /* **AC-646 / AC-647** — row-scoped, and **not a toast alone**: the condition
     outlives the toast (R10). */
  'onboarding.error.mark': "Couldn't mark this step done.",
  'onboarding.error.skip': "Couldn't skip this step.",
  'onboarding.error.dismiss': "Couldn't dismiss the checklist.",
  'onboarding.error.restart': "Couldn't restart the checklist.",
  /* **AC-648** — a two-tab race is not a page condition, so this is an inline
     12 px line in that row and never a banner. */
  'onboarding.stale': 'This step was already completed in another tab.',
  /* **AC-635** — the list collapses to a done line and `Dismiss` takes primary
     emphasis in the footer. */
  'onboarding.done': 'Every step is done',
  'onboarding.doneBody':
    "You've finished the {role} checklist. Reopen it any time from your account menu.",
  /* **AC-643** — one `shell` banner, `info`, dismissible. **The layer never
     auto-opens** — the operator may be mid-task. `{role}` is itself a key. */
  'onboarding.roleChanged': 'Your role changed to {role}.',
  'onboarding.openChecklist': 'Open checklist',

  /* ──────────────────── the 21 steps — §10.5, verbatim ────────────────── */

  /* Common — all four tracks, **byte-identical by id** (**AC-618**). */
  'onboarding.step.common.account.title': 'Check the account that is now yours',
  'onboarding.step.common.account.body':
    "Make sure the phone number your sign-in codes go to is yours, then look at the devices signed in to this account and sign out any you don't recognise. Done when every session on the list is one you started.",
  'onboarding.step.common.mywork.title': 'Claim one item, then release it',
  'onboarding.step.common.mywork.body':
    'My Work is where every queue reaches you. Pick any item under Unassigned, claim it, then release it. The checklist notices the moment you claim something.',
  'onboarding.step.common.audit.title': 'Find your own name in the activity log',
  'onboarding.step.common.audit.body':
    'Every action in the console is written to the activity log with the name of the person who took it. Find one of your own, then read the on-call rota so you know who to reach out of hours.',

  /* Owner — 3 common + 4 = 7 (**AC-619**). */
  'onboarding.step.owner.team.title': 'Read the role matrix, and decide if it still holds',
  'onboarding.step.owner.team.body':
    'Team & Access lists every operator and what each role can do. Read it once and decide whether one account should still hold every administrative permission.',
  'onboarding.step.owner.policy.title': 'Read the policy you are accountable for',
  'onboarding.step.owner.policy.body':
    'Operational Policy sets the dispatch radius, the operating limits, the SLA targets and the reason codes operators must pick from. You are accountable for these values, so read them deliberately once.',
  /* **AC-630's single named exception.** Its destination is a workspace
     Overview, and it is the only step in any track that may be — because the
     two numbers it names exist on no other sub-tab, and a `bodyKey` fixture
     string cannot carry a live trial balance. `financials/overview` **is**
     Finance's landing route and **is not** the Owner's, which is clause (b). */
  'onboarding.step.owner.position.title': 'State the current contribution margin',
  'onboarding.step.owner.position.body':
    'Financials › Overview shows the contribution margin and the trial balance. These are the two numbers you will be asked about; done when you can state both without looking.',
  'onboarding.step.owner.pricing.title': 'Settle how captains are paid',
  'onboarding.step.owner.pricing.body':
    'Pricing & Plans computes captain earnings four different ways and nobody has chosen one. Read the options; the decision is yours and it is still open.',

  /* Finance — 3 common + 5 = 8 (**AC-622**). */
  'onboarding.step.finance.ledger.title': 'Read a ledger before you post to one',
  /* **AC-623** — the body states that a posted row is reversed, never edited. */
  'onboarding.step.finance.ledger.body':
    'Revenue & Refunds is a ledger. Read the sign convention and notice that a posted row is never edited: a mistake is reversed with a new posting. Done when you could explain that to a colleague.',
  'onboarding.step.finance.escrow.title': 'Read what releasing escrow does, without releasing it',
  'onboarding.step.finance.escrow.body':
    "Open one escrow row and read what releasing it would do to the captain's balance and the rider's wallet. Do not release it. Done when you know exactly what the button moves.",
  'onboarding.step.finance.reconciliation.title': 'Work one reconciliation item end to end',
  'onboarding.step.finance.reconciliation.body':
    'The reconciliation queue is real work. Claim one cash report, decide it, and watch the row convert in place. Done when your decision is on the row.',
  'onboarding.step.finance.goodwill.title': 'Find the cap that bounds a goodwill credit',
  'onboarding.step.finance.goodwill.body':
    'Goodwill credits are capped by policy, for you and for Support. Find the cap on the Goodwill view before the day you need it.',
  'onboarding.step.finance.routing.title': 'Know which queue reaches you',
  'onboarding.step.finance.routing.body':
    'Disputes route to Finance. In My Work, turn role routing off once and see how the list changes, then turn it back on. Done when you know which queues reach you.',

  /* Ops Manager — 3 common + 5 = 8 (**AC-624**). */
  'onboarding.step.ops.application.title': 'Decide one captain application end to end',
  'onboarding.step.ops.application.body':
    'Open one captain application, read the documents, and approve or reject it. Done when the application carries a decision with your name on it.',
  /* **AC-625** — destination Operations › Requests; claim, work, dispose. */
  'onboarding.step.ops.requests.title': 'Claim, work and dispose of one request',
  'onboarding.step.ops.requests.body':
    'Claim one ride request, watch its SLA clock, and dispose of it. Read what a breach means before one happens on your watch.',
  'onboarding.step.ops.assurance.title': 'Cover one trip before it departs',
  'onboarding.step.ops.assurance.body':
    'Trip Assurance lists subscriptions with no backup captain. Register or replace a captain on one of them before the trip departs.',
  /* **AC-626** — Live Dispatch is wave 6. Renders disabled in place with its
     reason, and becomes enabled with **no fixture change** once the sub-tab
     exists, because `available` derives from the route table. */
  'onboarding.step.ops.dispatch.title': 'Tell a stale feed from a dead one',
  'onboarding.step.ops.dispatch.body':
    'Live Dispatch shows every trip in motion. Read the freshness line at the top and learn the difference between a feed that is slow and a feed that has stopped.',
  'onboarding.step.ops.fairness.title': "Read one suspension appeal from the captain's side",
  'onboarding.step.ops.fairness.body':
    "Captain Fairness holds suspension appeals. Open one and read the captain's economics view, because that is the case you will be asked to answer.",

  /* Support — 3 common + 4 = 7 (**AC-627**). */
  /* Tickets is wave 5. Disabled in place, same treatment as `ops.dispatch`. */
  'onboarding.step.support.ticket.title': 'Answer one ticket end to end',
  'onboarding.step.support.ticket.body':
    'Open one ticket, reply to it, and resolve it with a reason code. The reason code is what makes the ticket countable later.',
  'onboarding.step.support.profile.title':
    'Open a 360° profile, and know what you may not do with it',
  'onboarding.step.support.profile.body':
    'A profile holds every piece of personal data the console has about a person. Open one from any rider or captain row, and open it only when the work in front of you needs it.',
  'onboarding.step.support.goodwill.title': 'Credit a rider, inside your cap',
  'onboarding.step.support.goodwill.body':
    'A goodwill credit is the one money action you take during a call, and policy caps it. Find your cap on the Goodwill view before you need it.',
  /* **AC-628** — states that safety incidents are visible to Support and
     decided by an Ops Manager, and opens Support › Safety & Incidents. */
  'onboarding.step.support.boundary.title': 'Know what you may not decide, and who does',
  'onboarding.step.support.boundary.body':
    'You can see a safety incident and you cannot decide one; an Ops Manager does. Open Safety & Incidents once so you know what you will be looking at when a call comes in.',
}

/**
 * Re-exported, **not re-declared**. The `role.*` strings live in `AUTH_EN`
 * because the auth card renders one first (`auth.activate.subtitle`), so the
 * map that names them lives there too. Two maps from the same four roles is how
 * one surface starts calling a role something the other does not.
 */
export { ROLE_KEYS } from '@/screens/auth/copy'

/** `RoleName` → its §10.5 accountability sentence. Same rule, same reason. */
export const ROLE_INTRO_KEYS: Readonly<Record<string, string>> = {
  Owner: 'onboarding.intro.owner',
  'Ops Manager': 'onboarding.intro.opsManager',
  Finance: 'onboarding.intro.finance',
  Support: 'onboarding.intro.support',
  Dispatcher: 'onboarding.intro.dispatcher',
  'Trust & Safety': 'onboarding.intro.trustSafety',
}
