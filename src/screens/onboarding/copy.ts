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
    "Confirm the number your codes go to, then review your active sessions and end anything you don't recognise.",
  'onboarding.step.common.mywork.title': 'Claim one item, then release it',
  'onboarding.step.common.mywork.body':
    "Operations › My Work is where every queue reaches you. Claim something from Unassigned and release it again, so you learn what a claim is before you're holding six.",
  'onboarding.step.common.audit.title': 'Find your own name in the activity log',
  'onboarding.step.common.audit.body':
    'Everything you do here is recorded with your name on it. Read the log once, and read who is on call, so you know who to reach at 2am.',

  /* Owner — 3 common + 4 = 7 (**AC-619**). */
  'onboarding.step.owner.team.title': 'Read the role matrix, and decide if it still holds',
  'onboarding.step.owner.team.body':
    "One account holds manage_settings, and that key gates 39 of the console's 131 permission checks. Decide whether that is still acceptable.",
  'onboarding.step.owner.policy.title': 'Read the policy you are accountable for',
  'onboarding.step.owner.policy.body':
    'Dispatch radius, operating limits, SLA targets and reason codes. Read them once, deliberately, rather than the first time one is disputed.',
  /* **AC-630's single named exception.** Its destination is a workspace
     Overview, and it is the only step in any track that may be — because the
     two numbers it names exist on no other sub-tab, and a `bodyKey` fixture
     string cannot carry a live trial balance. `financials/overview` **is**
     Finance's landing route and **is not** the Owner's, which is clause (b). */
  'onboarding.step.owner.position.title': 'State the current contribution margin',
  'onboarding.step.owner.position.body':
    "The trial balance and the contribution margin are the two numbers you'll be asked about. This is where they live, and this step is done when you can say them out loud.",
  'onboarding.step.owner.pricing.title': 'Settle how captains are paid',
  'onboarding.step.owner.pricing.body':
    'The console computes captain earnings four different ways and nobody has chosen one. That decision is outstanding, and it is yours.',

  /* Finance — 3 common + 5 = 8 (**AC-622**). */
  'onboarding.step.finance.ledger.title': 'Read a ledger before you post to one',
  /* **AC-623** — the body states that a posted row is reversed, never edited. */
  'onboarding.step.finance.ledger.body':
    'Learn the sign convention, and learn that a posted row is never edited — it is reversed by a second row. Nothing in Financials undoes itself.',
  'onboarding.step.finance.escrow.title': 'Read what releasing escrow does, without releasing it',
  'onboarding.step.finance.escrow.body':
    'Open one escrow row and read it through. Release moves money to a captain, and there is no undo — only a reversing entry.',
  'onboarding.step.finance.reconciliation.title': 'Work one reconciliation item end to end',
  'onboarding.step.finance.reconciliation.body':
    'Claim it, decide it, and watch the row convert in place. This queue is how cash and captain debt stay true to each other.',
  'onboarding.step.finance.goodwill.title': 'Find the cap that bounds a goodwill credit',
  'onboarding.step.finance.goodwill.body':
    'You and Support share one compensation cap. Find the number before a rider asks you to go past it.',
  'onboarding.step.finance.routing.title': 'Know which queue reaches you',
  'onboarding.step.finance.routing.body':
    "Disputes route to Finance. Turn role routing off once in My Work and see what changes, so you know what you're filtering out.",

  /* Ops Manager — 3 common + 5 = 8 (**AC-624**). */
  'onboarding.step.ops.application.title': 'Decide one captain application end to end',
  'onboarding.step.ops.application.body':
    'Read the documents, then approve or reject. The row gives you a tick, a cross and View — there is no menu to open.',
  /* **AC-625** — destination Operations › Requests; claim, work, dispose. */
  'onboarding.step.ops.requests.title': 'Claim, work and dispose of one request',
  'onboarding.step.ops.requests.body':
    'Watch the SLA clock while you hold it. Read what a breach means — a breach is a missed target, not a failure to act.',
  'onboarding.step.ops.assurance.title': 'Cover one trip before it departs',
  'onboarding.step.ops.assurance.body':
    'Trip Assurance lists subscriptions with no backup captain. Register or replace a captain on one of them.',
  /* **AC-626** — Live Dispatch is wave 6. Renders disabled in place with its
     reason, and becomes enabled with **no fixture change** once the sub-tab
     exists, because `available` derives from the route table. */
  'onboarding.step.ops.dispatch.title': 'Tell a stale feed from a dead one',
  'onboarding.step.ops.dispatch.body':
    'Live Dispatch shows a freshness line. Learn the difference between data that is late and data that has stopped, before you act on either.',
  'onboarding.step.ops.fairness.title': "Read one suspension appeal from the captain's side",
  'onboarding.step.ops.fairness.body':
    "Captain Fairness shows you the economics a suspension takes away. Read one before you're asked to answer for a decision.",

  /* Support — 3 common + 4 = 7 (**AC-627**). */
  /* Tickets is wave 5. Disabled in place, same treatment as `ops.dispatch`. */
  'onboarding.step.support.ticket.title': 'Answer one ticket end to end',
  'onboarding.step.support.ticket.body':
    'Open it, respond, and resolve it with a reason code. The reason code is what makes a ticket countable later.',
  'onboarding.step.support.profile.title':
    'Open a 360° profile, and know what you may not do with it',
  'onboarding.step.support.profile.body':
    'One profile carries every piece of personal data the console holds about a person, across 11 record types. Open it only when the work in front of you needs it.',
  'onboarding.step.support.goodwill.title': 'Credit a rider, inside your cap',
  'onboarding.step.support.goodwill.body':
    "This is the one money action you take mid-call, and it's bounded by policy. Find the cap before you need it.",
  /* **AC-628** — states that safety incidents are visible to Support and
     decided by an Ops Manager, and opens Support › Safety & Incidents. */
  'onboarding.step.support.boundary.title': 'Know what you may not decide, and who does',
  'onboarding.step.support.boundary.body':
    'You can see every safety incident and you cannot decide one — an Ops Manager does. Read one incident, and stop there.',
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
}
