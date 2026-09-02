/**
 * Role-based onboarding — the guided checklist.
 *
 * Spec `docs/05-restructure/specs/04-auth-and-onboarding.md` §8.9 gives the
 * fields; design `docs/05-restructure/design/08-auth-and-onboarding.md` §10.5
 * gives the 21 rows and every string. Pattern row minted by **R4-2 §2.2**;
 * scoped to one of four shell layers by **R4-3**.
 *
 * ## One shape that is NOT the spec's, and the reason
 *
 * §8.9 types `OnboardingStep` with a **`trackRole: RoleName`** field and calls
 * the fixture *"one row per step per track"*. That shape cannot satisfy the two
 * criteria written against it:
 *
 *   - **AC-618** — *steps 1–3 are byte-identical across all four tracks, **by
 *     step `id`***. With `trackRole` on the step, `common.account` exists four
 *     times, once per role, and "byte-identical by id" has four rows to
 *     reconcile rather than one row to point at. The criterion becomes a
 *     four-way diff of duplicated literals, which is a test that a copy-paste
 *     slip passes.
 *   - **AC-642** — *step ids present in both tracks and already completed stay
 *     completed across a role change*. `OnboardingState.completedStepIds` holds
 *     ids. If the id is scoped to a track, an id in the old track is not the
 *     same id in the new one and the criterion cannot even be stated.
 *
 * Both criteria are about **shared identity**, and identity is what `trackRole`
 * destroys. So:
 *
 * > **21 step rows, each with one id, plus a track that lists the ids it
 * > includes, in order.** The three common ids appear in all four tracks and
 * > exist exactly once as data. `ONBOARDING_TRACKS` is a `Record<RoleName,
 * > string[]>`, so **D4 stays a data edit** (spec §8.6) — a fifth role is one
 * > array.
 *
 * Everything else in §8.9 is kept verbatim, `order` included: the three common
 * steps are 1, 2 and 3 in every track, so a single `order` on the step is
 * well-defined and no track can reorder them. Reported as a finding rather than
 * absorbed silently.
 *
 * ## Two nulls that look like omissions and are neither
 *
 *   - **`learnMoreKey` is `null` on all 21 rows.** §5.6's SHOULD, unmet: Eyvar
 *     has no help centre and a dead link is worse than an omission. Tracked as
 *     **Q-82** with a named content owner. Design §10.2 renders nothing, and
 *     **AC-605 now *fails* if a link is rendered** (spec §19.3 C-5). Not to be
 *     filled in by guessing.
 *   - **`requiredPermission` is `null` on all 21 rows**, blocked on foundation
 *     **Q4**. Every `SubTabRoute.permission` in the route table is `null`, so
 *     there is nothing to gate against and a value here would be an answer
 *     nobody gave. Consequence, stated so it is not read as a bug: `reachable`
 *     collapses to `available`, so **AC-631** (`track-empty`) passes —
 *     `newrole@eyvar.com` reaches it through holding zero permissions — while
 *     **AC-610** (the *forbidden* step row) cannot, because no step can be
 *     forbidden. Both are recorded as known-failing in spec §16.
 */

import type { IsoDateTime } from './common'
import type { PermissionKey } from './navigation'
import type { RoleName } from './session'

/* ─────────────────────────── the step ───────────────────────── */

/**
 * Where a step sends the operator. `null` on a step with no destination — none
 * of the 21 has one today, and the field is nullable because §5.6 permits a
 * "state a fact" step and **AC-629** requires every step to be an action or a
 * statable fact, not "look at this screen".
 *
 * `subTabId` **must exist in `routeTable.ts`** — **AC-608** is a diff against
 * it, asserted in `clients/onboarding.test.ts`.
 */
export interface OnboardingDestination {
  /**
   * `null` **iff** `layer` is set. §8.9 types this `string` and requires it,
   * which two of the 21 steps cannot satisfy: `common.account` opens the
   * `my-account` layer and `support.profile` opens the `profile` layer, and a
   * layer rides as an overlay param over *whatever route the operator is on* —
   * it has no sub-tab of its own. Nominating an arbitrary sub-tab to fill the
   * field would put a route in the data that the step does not go to.
   *
   * **AC-608's diff still holds**, and against the same file: a non-null
   * `subTabId` must exist in `ROUTE_TABLE.subTabs`, a non-null `layer` must
   * exist in `ROUTE_TABLE.shellLayers`. Both are asserted in
   * `clients/onboarding.test.ts`.
   */
  subTabId: string | null
  /** The `?view=` control, where the step means a particular tab of the sub-tab. */
  view: string | null
  /** A shell layer instead of a sub-tab route. `profile` and `account` are the two used. */
  layer: 'profile' | 'account' | null
}

/**
 * How a step becomes done.
 *
 * `manual` does **not** mean "no button" — **AC-606**: `Mark as done` renders on
 * *every* step whether or not it auto-detects. It means there is no domain event
 * that could tick it, so manual is the only path.
 */
export type OnboardingCompletion = 'auto' | 'manual'

/**
 * One step. **21 of these exist and their ids are the contract** — see the file
 * header on AC-618 and AC-642.
 */
export interface OnboardingStep {
  /** `common.account`, `ops.dispatch`, `finance.escrow`. Stable, shared across tracks. */
  id: string
  /** 1-based, within the track. The three common steps are 1–3 in all four. */
  order: number
  titleKey: string
  bodyKey: string
  /** **`null` on all 21 — Q-82.** See the file header. */
  learnMoreKey: string | null
  destination: OnboardingDestination | null
  completion: OnboardingCompletion
  /** A named domain event id — `queue.item.claimed`. `null` on a `manual` step. */
  autoSignal: string | null
  /**
   * The permission the step's DESTINATION requires, so a track never sends an
   * operator somewhere their role forbids. Derived from the route table, not
   * hand-written — `fixtures/onboardingGates.test.ts` keeps the two equal.
   *
   * `null` only where the destination genuinely has no permission: a shell
   * layer, or `admin-activity`, which every authenticated operator may open.
   */
  requiredPermission: PermissionKey | null

  /* ── derived server-side; a component never recomputes either ── */

  /**
   * The destination's sub-tab exists **and is built**. Derived from the route
   * table and the build registry (`BUILT_SUB_TAB_IDS`).
   *
   * **False on exactly two of the 21 today** — `ops.dispatch` (Live Dispatch,
   * wave 6) and `support.ticket` (Tickets, wave 5). Both render **disabled in
   * place** with the reason named (**AC-609**, **AC-626**), never hidden
   * (**AC-611**), and both are **excluded from `totalCount`** (**AC-603**).
   */
  available: boolean
  /**
   * `available` **and** the operator holds `requiredPermission`.
   *
   * Identical to `available` today because every `requiredPermission` is
   * `null` (Q4). The field exists separately anyway: the day Q4 lands, a
   * screen written against `reachable` is already correct and one written
   * against `available` is silently wrong.
   */
  reachable: boolean
}

/**
 * One role's track: the ordered step ids it includes. D4 is a new entry here and
 * nothing else.
 *
 * **`Partial` since D17**, which minted `Dispatcher` and `Trust & Safety`. The
 * map is *meant* to be total and `resolveSteps` still throws `notFound` on a
 * missing track (**AC-617 — no default and no fallback**: a role with no track
 * is a bug and must read as one). But an exhaustive `Record` makes the fixture
 * itself a compile error the moment a role is added, which converts a data gap
 * into a build break for whoever adds the role, and the gap is not theirs.
 *
 * **The two new roles have no track and `getOnboardingChecklist` throws for
 * them.** That is the honest state: the track content is a product decision, not
 * something the role model may invent. Owner: `fixtures/onboardingTracks.ts`.
 */
export type OnboardingTracks = Readonly<Partial<Record<RoleName, readonly string[]>>>

/* ─────────────────────────── the state ──────────────────────── */

/**
 * Per operator, **server-backed** (§8.4). Deliberately not `localStorage`: Q1
 * is open for shell preferences and onboarding does not wait on it, because a
 * checklist that resets when an operator opens the console on a second machine
 * is a checklist they stop trusting on day two.
 */
export interface OnboardingState {
  userId: string
  /** From the account's **current** role. A role change recomputes the track. */
  trackRole: RoleName
  startedAt: IsoDateTime
  completedStepIds: string[]
  /** Recorded **distinctly** from done — a skip does not fake progress (**AC-634**). */
  skippedStepIds: string[]
  /** Completed, then made unreachable by a role change. **Archived, not deleted** (**AC-644**). */
  archivedStepIds: string[]
  /** `null` until dismissed. Dismissal is available at **any** time (**AC-636**). */
  dismissedAt: IsoDateTime | null
  completedAt: IsoDateTime | null
  /**
   * **When the layer last opened itself, and `null` if it never has** —
   * **AC-593**, **AC-594**.
   *
   * ## Why a second field was unavoidable
   *
   * AC-594 is two sentences and they pull against each other: *"the layer opens
   * automatically **exactly once**, on the first session of an account that has
   * never had onboarding state"* — and *"a second sign-in does not auto-open
   * it."* Answering the first needs the question **"has this operator ever had
   * onboarding state?"**, and `getOnboarding` **creates** the state on its first
   * read. After the first read the answer is *yes* forever, including for the
   * read that created it. The question is unaskable, not merely unanswered.
   *
   * The heuristic that suggests itself — *auto-open while nothing is completed
   * and nothing is dismissed* — re-opens the layer on **every** sign-in for any
   * operator who closed it with `Escape` without ticking anything, which is
   * AC-594's second sentence failing outright. An earlier draft carrying it
   * broke 15 shell tests, which is how it was caught rather than shipped.
   *
   * ## `autoOpenedAt`, and not `startedAt: null`
   *
   * Both were on the table. `autoOpenedAt` was chosen for three reasons:
   *
   *   1. **It names the event it records.** `startedAt: null` would overload one
   *      field with two facts — *when this track began* and *whether the layer
   *      has ever shown itself* — and the two diverge immediately:
   *      `restartOnboarding` resets `startedAt` **by design** (**AC-640**), which
   *      under the overloaded reading would re-arm the auto-open and resurrect a
   *      layer §5.6 says must never come back.
   *   2. **It is additive.** `startedAt` is non-null today and every consumer
   *      reads it; making it nullable is a change at every call site to encode a
   *      fact none of them are asking about.
   *   3. **It distinguishes three states, not two.** `autoOpenedAt === null`
   *      → never seen. `autoOpenedAt !== null && dismissedAt === null` → seen and
   *      left open. `dismissedAt !== null` → seen and dismissed. The middle one
   *      is the operator who closed the layer with `Escape`, and it is the state
   *      the heuristic could not tell from the first.
   *
   * **Stamped by a mutation, never by a read.** `markOnboardingAutoOpened` is
   * its only writer. A read that stamped would be the create-on-read flaw
   * again, one field along: the act of *asking* whether the layer should open
   * would answer *no* for every subsequent asker, including the one that never
   * opened it because the operator's session died first.
   *
   * **A restart does not clear it** — see `restartOnboarding`.
   */
  autoOpenedAt: IsoDateTime | null
}

/**
 * What the layer reads in one request: the track, the state, and the two
 * derived counts. One call rather than three, for the same reason
 * `getMetricBoard` is one call — the layer lays out as a unit and a panel that
 * resolves in three stages reflows twice before it settles.
 */
export interface OnboardingChecklist {
  userId: string
  role: RoleName
  /** The role's steps, in track order, **including the unreachable ones** (AC-611). */
  steps: OnboardingStep[]
  state: OnboardingState
  /**
   * The intro's part 2 — `You hold {held} of {total} permissions.`
   * **AC-601**: `lina@eyvar.com` reads **3**. Server-computed, because a count
   * of an array is exactly the kind of thing two screens compute differently.
   */
  permissionsHeld: number
  permissionsTotal: number
  /** Completed **only**. `{done} of {total} completed` (**AC-602**, **AC-634**). */
  doneCount: number
  /** **Reachable steps only** (**AC-603**). The two unbuilt destinations are out of it. */
  totalCount: number
  /** Every reachable step is done **or** skipped (**AC-635**). `0 of 0` is `true`. */
  isComplete: boolean
}
