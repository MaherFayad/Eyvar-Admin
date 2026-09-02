# 12 — Onboarding assessment

> **Owner:** product-designer. **Assessment, read-only.** No production file was changed.
> Two temporary probe test files were written under `src/`, run, and deleted; `git status`
> is clean of them.
>
> **Question assessed, verbatim:** *"what about the onboarding is it customized per user role
> and permissions, does it give enough context for the user and give him guidence, and is it
> fun to ineract with or just corporaty one"*
>
> **Surfaces read:** `src/data/fixtures/onboardingTracks.ts` · `src/data/clients/onboarding.ts` ·
> `src/data/types/onboarding.ts` · `src/screens/onboarding/{OnboardingLayer,OnboardingStepRow,copy}.tsx|ts` ·
> `src/shell/{AppLayout,ShellContext,TopBar,AccountMenu}.tsx` · `src/shell/permissions.ts` ·
> `src/data/fixtures/routeTable.ts` · `src/data/types/session.ts` ·
> `docs/05-restructure/design/08-auth-and-onboarding.md` §10.
>
> **Run:** `npx vite --port 5321` (booted clean, Vite 6.4.3). `npx vitest run src/screens/onboarding`
> — **21/21 pass**. Two throwaway probes exercised the client directly for all six roles; their
> output is quoted below rather than paraphrased.
>
> **Reference:** the Mobbin MCP (`search_flows`, `search_screens`) is **not exposed as a tool in
> this session** — I could not call it. I used the local Mobbin-curated capture set instead
> (`docs/06-design-reference/shopify-admin-web/01-home/`, 7 captures), which is the same source
> material and is what design §10 itself cites. Files opened are named at each citation.

---

## 0. The four answers, in one screen

| # | Owner's question | Verdict |
|---|---|---|
| 1 | Customised per role and permission? | **Role: partly — 4 tracks for 6 roles, and 2 roles get a permanent error card. Permission: no, not at all — `requiredPermission` is `null` on all 21 steps.** And the product does **both** failure modes the question names: it walks Support into a Financials screen their role cannot open, *and* it walks Finance through a queue screen they cannot open. Evidence in §1.3. |
| 2 | Enough context and guidance? | **The 21 bodies are the best domain writing in the product** — they teach escrow, SLA breach, reason codes, stale-vs-dead feeds. But the guidance is a **separate track completed once**, not in the flow of work, and it is **contradicted by §5.0's own decision table**, which says a progressive setup guide belongs *on the destination*. Nothing defines halala, captain, subscription or escrow **outside** the checklist, and the checklist is behind an account menu. |
| 3 | Fun or corporate? | **Corporate — but not because it is restrained. Because it is unfinished.** The completion moment is a dead end with a false sentence in it (`Every step is done` can render at `0 of 7`). Four steps advertise auto-detection that is not wired. The room that exists is not exuberance; it is **acknowledgement, phase structure, and a track that makes the operator do one real thing.** §3. |
| 4 | Does it work? | **For 4 of 6 roles, partly.** It completes; progress does **not** persist across a page reload; it never auto-opens (dead code path); it is reachable from **exactly one** place; the role-change banner is not built; and step 8 of 8 hands the operator nothing. §4. |

**One-line severity call:** the two defects worth stopping for are **§1.3 (a track that sends an
operator to a screen their role forbids)** and **§4.3 (skip-only completion prints a false
sentence)**. Everything else is scope.

---

## 1. Role and permission customisation — the factual answer

### 1.1 The shape of the data

`src/data/fixtures/onboardingTracks.ts:449` is the whole customisation model:

```ts
export const ONBOARDING_TRACKS: OnboardingTracks = {
  Owner:        ['common.account','common.mywork','common.audit','owner.team','owner.policy','owner.position','owner.pricing'],
  Finance:      ['common.account','common.mywork','common.audit','finance.ledger','finance.escrow','finance.reconciliation','finance.goodwill','finance.routing'],
  'Ops Manager':['common.account','common.mywork','common.audit','ops.application','ops.requests','ops.assurance','ops.dispatch','ops.fairness'],
  Support:      ['common.account','common.mywork','common.audit','support.ticket','support.profile','support.goodwill','support.boundary'],
}
```

**Varied by role: yes, genuinely.** 21 step rows, 3 shared, 4 role-specific groups. Steps 1–3 are
byte-identical by id (AC-618), and a role change archives rather than deletes (AC-642). That part
is well built and I would not change it.

**Varied by permission: no. Not once.** Every one of the 21 rows carries:

```ts
requiredPermission: null,
```

Probe output, run against the shipped fixture:

```
requiredPermission non-null count = 0
learnMoreKey non-null count = 0
```

The consequence is stated in the client itself (`src/data/clients/onboarding.ts`, `isReachable`):

> *"**Collapses to `available` today**, because every `requiredPermission` is `null` (**Q4**)."*

So `reachable === available`, and `available` asks only *"is the destination sub-tab built?"*
Every sub-tab is built today (`UNBUILT_SUB_TAB_IDS` is `[]`), so **no step in the product can
currently be marked unreachable for any reason**. `AC-610` — the forbidden-step row, whose copy
is written and keyed at `onboarding.step.forbidden` — is unreachable dead copy.

### 1.2 The reason given for that null is **stale**

The fixture header justifies it:

> *"**`requiredPermission: null` × 21**, until **D4/Q4**. Every `SubTabRoute.permission` in the
> route table is `null`, so there is nothing to gate against."*

**That is no longer true.** The route table now carries a populated `viewPermission` column, and
the shell enforces it (`src/shell/permissions.ts:101` `isSubTabVisible`, `:198` `forbiddenReason`).
`src/shell/qa.copy.test.tsx:689` pins the count:

```ts
expect(table.subTabs.filter((r) => r.viewPermission !== null)).toHaveLength(34)
```

**34 of 39 sub-tab rows are permission-gated.** The blocker that justified 21 nulls has been
cleared by another agent and nobody went back to close the loop. This is not a design decision
any more; it is drift.

### 1.3 So which of the owner's two failure modes does the product do? **Both.**

I cross-checked every step destination against `routeTable.viewPermission` and against the D17
role baselines in `src/data/types/session.ts:97` (`ROLE_PERMISSIONS`). Probe output, verbatim,
trimmed to the failures:

```
### Finance — D17 baseline 7 keys
  common.mywork    -> /operations/my-work       needs=view_operations  D17ok=NO
  finance.routing  -> /operations/my-work       needs=view_operations  D17ok=NO

### Support — D17 baseline 5 keys
  support.goodwill -> /financials/rider-wallets needs=view_finance     D17ok=NO
```

Read those three lines carefully, because they are the whole answer to the owner's question.

**Failure mode A — "walked through payouts they cannot access."** `support.goodwill` is step 6 of
Support's 7. Its body reads *"This is the one money action you take mid-call, and it's bounded by
policy. Find the cap before you need it."* Its destination is `/financials/rider-wallets`, which
requires `view_finance`. The Support baseline is:

```ts
/* 5. **No `view_finance`**, so the Financials tile does not render at all and
   Rider Wallets is `○` — the compensation credit Support needs mid-call is a
   command on the rider's 360° profile under `manage_tickets` plus the
   `compPolicy` cap, not a Financials screen (D17). */
Support: ['view_operations','view_support','view_profiles','manage_tickets','contact_users'],
```

The permission model's own comment says, in as many words, that this is **not** a Financials
screen for Support. The onboarding track sends them there anyway. A Support operator on day one
presses `Open Rider Wallets` and the workspace does not exist in their rail. That is the owner's
worst case, in the data, today.

**Failure mode B — "a finance operator being shown the dispatch board."** Milder but present, and
worse than it looks. Finance's D17 baseline has no `view_operations`. Two of their eight steps —
including **step 2 of 8**, the second thing a new Finance operator is told to do — point at
`/operations/my-work`. And the **intro card itself** does too: `onboarding.intro.myWork` renders
*"Work assigned to you arrives in My Work."* with My Work as a live link
(`OnboardingLayer.tsx`, `MY_WORK_SUB_TAB = 'operations-my-work'`, hardcoded for every role). So
the first paragraph a Finance lead reads points at a screen their role cannot open.

### 1.4 Two of six roles have no track at all, and get a permanent error

`RoleName` has been six since D17 (`src/data/types/session.ts:26`). `ONBOARDING_TRACKS` has four.
Probe:

```
ROLE_NAMES = Owner, Ops Manager, Dispatcher, Trust & Safety, Finance, Support
  Owner          track=7 steps   baselinePerms=21
  Ops Manager    track=8 steps   baselinePerms=13
  Dispatcher     track=NONE      baselinePerms=4
  Trust & Safety track=NONE      baselinePerms=7
  Finance        track=8 steps   baselinePerms=7
  Support        track=7 steps   baselinePerms=5
```

`resolveSteps` throws by design (AC-617: *"no default and no fallback"*), so the layer renders the
error card — `Couldn't load your checklist. Nothing has changed.` — with a `Try again` that throws
again, forever. The type comment is honest about it:

> *"**The two new roles have no track and `getOnboardingChecklist` throws for them.** That is the
> honest state: the track content is a product decision."*

**And these roles are assignable today.** `src/screens/admin/team/AddUserModal.tsx:173` maps
`ROLE_NAMES` into the invite `Select` with no filter. An Owner can invite a Dispatcher this
afternoon, and that person's first act in the console is an error card.

**Dispatcher is the role that most needs onboarding and has none.** Four permissions, one
workspace, and the only role whose job is a live board where being wrong costs a rider a ride.

### 1.5 The permission count the intro shows is from a retired model

`src/data/clients/onboarding.ts:83`:

```ts
/** The 13 broad keys that exist today (`:3225`–`:3239`). The intro's denominator. */
const PERMISSION_TOTAL = 13
```

`PermissionKey` is now **21 members** (20 live + the retired `manage_settings` alias), and the
fixture users still carry pre-D17 13-key arrays. Probe:

```
USR-1 Owner        held=13/13     (D17 Owner baseline: 21)
USR-5 Ops Manager  held=8/13      (D17 Ops Manager baseline: 13)
USR-3 Support      held=3/13      (D17 Support baseline: 5)
```

So the intro tells the Owner *"You hold 13 of 13 permissions"* when the real answer is 21 of 21,
and tells an Ops Manager 8 of 13 when the real answer is 13 of 21. The number is the only
quantitative claim the intro makes about the operator's own authority, and it is wrong for every
role. `AC-601` pins `lina@eyvar.com` at 3 and still passes, because the criterion was written
against the same stale fixture.

### 1.6 Five of ten `?view=` destinations resolve to nothing

Probe, all steps carrying a `?view=`:

```
common.mywork          operations-my-work        ?view=unassigned         declared=yes
finance.ledger         financials-revenue        ?view=all-postings       declared=NO   declaredViews=[]
finance.escrow         financials-payouts        ?view=escrow             declared=NO   declaredViews=[]
finance.reconciliation financials-cash           ?view=reconciliation     declared=NO   declaredViews=[]
finance.goodwill       financials-rider-wallets  ?view=goodwill           declared=NO   declaredViews=[]
ops.application        operations-people         ?view=applications       declared=yes
ops.assurance          operations-assurance      ?view=no-backup-captain  declared=yes
ops.fairness           support-fairness          ?view=suspension-appeals declared=yes
support.goodwill       financials-rider-wallets  ?view=goodwill           declared=NO
support.boundary       support-safety            ?view=open               declared=yes
```

**All four of Finance's role-specific steps land on an unfiltered list.** The fixture header names
this exact failure and then ships it:

> *"a step that lands on an unfiltered list is the AC-693 failure — 'a link to an unfiltered list
> is worse than no link, because it looks like it worked'."*

The Ops Manager and Support tracks are clean here. Finance is the role whose entire onboarding is
broken links, and Finance is the role that moves money.

### 1.7 Verdict on question 1

> **Role-varied: yes, for four of six roles.**
> **Permission-varied: no, in any respect. Zero of 21 steps carry a permission.**
> **And the product commits both errors the owner named** — Support is walked into a Financials
> screen their role cannot open (§1.3 A), and Finance is walked into an Operations queue theirs
> cannot open (§1.3 B). The mechanism that would have caught both — `requiredPermission` — exists,
> is designed, is keyed, has copy, and is null on every row because of a blocker that has since
> been cleared.

---

## 2. Context and guidance

### 2.1 What it does well, and it is more than I expected

The 21 bodies are genuinely good domain writing. They do not describe the UI; they teach a fact
the operator will be wrong about otherwise:

| Term | Where it is taught | The teaching |
|---|---|---|
| Escrow | `finance.escrow` | *"Release moves money to a captain, and there is no undo — only a reversing entry."* |
| Ledger convention | `finance.ledger` | *"a posted row is never edited — it is reversed by a second row. Nothing in Financials undoes itself."* |
| SLA breach | `ops.requests` | *"a breach is a missed target, not a failure to act."* |
| Reason code | `support.ticket` | *"The reason code is what makes a ticket countable later."* |
| Stale vs dead feed | `ops.dispatch` | *"the difference between data that is late and data that has stopped, before you act on either."* |
| Role boundary | `support.boundary` | *"You can see every safety incident and you cannot decide one — an Ops Manager does."* |
| 360° profile / PDPL posture | `support.profile` | *"Open it only when the work in front of you needs it."* |

Four of the intro sentences state what the role is **accountable for**, and two of them state what
the role **may not do**. That is a better answer to "what is my job here" than most B2B consoles
manage. Whoever wrote §10.5 understood the domain.

### 2.2 What it does not explain at all

**Nothing anywhere in the console explains what the console is.** There is no "what Eyvar
Operations is for" sentence. The intro's first line is *"You keep trips covered and captains
working"* — that presumes the operator already knows there is a fleet, that captains are drivers,
and that a subscription is a recurring commute booking rather than a SaaS plan.

Terms with **zero definition anywhere in the product**:

| Term | Status |
|---|---|
| **Captain** | Used ~everywhere as the word for a driver. Never introduced. A new operator will guess. |
| **Halala** | `src/components/Money.tsx` types amounts as `Halalas` and formats them; nothing tells the operator that 1 SAR = 100 halalas, or that every money integer in the console is in halalas. |
| **Subscription** | Eyvar's core product — a recurring commute. Never distinguished from a quick ride anywhere in the UI. |
| **SLA clock / breach** | Taught in `ops.requests`' body. Nowhere else. `slaClock` renders `No clock` / `{duration} left` on rows with no explanation of what the target was. |
| **Escrow** | Taught in `finance.escrow`' body. Nowhere else. |
| **Reason code** | Partly solved, and well: `src/i18n/vocabulary/copy.ts` maps every code to a sentence (`reason.CAP_LATE` → *"Captain late for pickup"*), so operators never read `CAP_LATE`. But *why* a code is mandatory is only in the onboarding body. |
| **Trip assurance / backup captain** | Only in `ops.assurance`' body. |

`learnMoreKey` is `null` on all 21 rows and no `Learn more` renders — deviation **A-7**, finding
**F-2**, tracked as **Q-82**, on the grounds that Eyvar has no help centre. That reasoning is
sound (a dead link is worse than an omission) but the conclusion drawn from it is wrong: the
answer to "we have no help centre" is not "no definitions", it is "put the definition in the
console". See §5.5.

### 2.3 In the flow of work, or a separate track? **Separate, and DESIGN.md disagrees**

`docs/ref/surfaces.md`, condensing §5.0's decision table, has a row for exactly this:

| Situation | Use | Not |
|---|---|---|
| Progressive setup of an area | **Guide card + checklist on the destination** | Modal wizard, coach-marks |

Eyvar renders the checklist **only** in a right-hand shell layer at `?onboarding=1`, reachable
from **one** control: the account menu. It never appears on a destination. It never appears next
to the work.

The reference set shows the other half of the pattern, and design §10 cites these two files by
name while implementing only one of them.
`docs/06-design-reference/shopify-admin-web/01-home/home-guide-side-panel-in-progress.webp`
shows the guide **twice, simultaneously**: as a side panel *and* as an inline card on Home, sitting
directly under a real work item (*"2 orders to fulfil"*) in a section headed **"Things to do
next"**. The guide is not a place you go; it is a card in the place you already are.
`home-get-ready-to-sell-setup-guide-accordion.webp` goes further — the guide is the **whole page**,
with a heading (*"Get ready to sell"*), a why-sentence, and steps grouped into four named phases.

Eyvar has neither. And Eyvar has no Home — every role lands on a workspace overview
(`session.landingRoute`), which is precisely the destination a guide card belongs on.

**The one exception is real and worth protecting.** The console's `first-run` empty states are
excellent and *are* in-flow guidance:

```
'fin.empty.firstRun.heading':  'This account, posting by posting'
'overview.empty.heading':      'Captains, riders, trips and subscriptions, on one board'
'rb.library.firstRun.heading': 'Ask the business a question'
'dispatch.empty.board.body':   'Live Dispatch tracks trips in progress, requests waiting for a
                                captain, and who is on shift. It fills as the day starts.'
```

There are 26 of these and they say what a screen is **for**, exactly as `copy.md` demands. **But
they only render at zero records.** On a seeded console — and on any live one — a new operator
never sees a single one of them. The best explanatory copy in the product is behind a condition
that a working business never meets.

### 2.4 Verdict on question 2

> **The writing is strong; the placement is wrong.** The domain vocabulary an operator needs is
> taught once, inside a layer they must know to open, and never again. The console-level facts
> (what a captain is, that money is in halalas, what a subscription is) are taught nowhere. And
> the 26 screens that *do* explain themselves only do so when they are empty, which is never.

---

## 3. Fun, or corporate

### 3.1 The honest verdict

**Corporate. But the diagnosis is not "too restrained" — it is "unfinished".**

The copy law is right and I am not proposing to soften it. No exclamation marks, no "Oops", no
personality in errors — for software that releases escrow to a captain's bank account, that is
correct and it is not the problem. `Nothing has changed.` after a failed mark-done is a better
sentence than anything cheerful would be.

The problem is that four separate things that would have made it feel *made* were designed,
written down, and then not connected:

| Designed | Shipped |
|---|---|
| Auto-completion from real work — 4 steps carry `completion: 'auto'` and a named `autoSignal` | **No producer emits any of the three signals.** `grep` for `queue.item.claimed`, `application.decided`, `queue.item.disposed` outside the onboarding files returns **zero hits.** Every step is manual self-attestation. |
| Auto-open on first session (AC-593/594), with `autoOpenedAt` and `shouldAutoOpen` and `markOnboardingAutoOpened` all implemented in the client | **Zero call sites.** `AppLayout.tsx:210` still carries a long comment saying the field does not exist and the criterion is DEFERRED. The field landed; the comment did not update. The layer never opens itself. |
| Role-change banner (AC-643) with final copy — `Your role changed to {role}.` + `Open checklist` | **Not built.** `onboarding.roleChanged` and `onboarding.openChecklist` have no render site. |
| Stale-state line (AC-648) — `This step was already completed in another tab.` | **Not built.** No render site. |

So what an operator actually experiences: a flat list of 7 or 8 sentences, each with a `Mark as
done` button they press on the honour system, in a panel nobody told them exists. That is not
restraint. That is a checklist of eight steps with ticks — which is exactly the phrase the owner
used, and it is accurate.

### 3.2 The completion moment specifically

`OnboardingLayer.tsx`, the `data.isComplete` branch:

```
✓ Every step is done
You've finished the {role} checklist. Reopen it any time from your account menu.
                                                      [ Restart onboarding ]  [ Dismiss ]
```

Three things about it.

**It is a dead end.** The last thing the console says to a newly-trained operator is *"reopen it
any time"* — an offer to redo training. Compare
`home-setup-guide-side-panel-completed.webp`: Shopify's completed panel shows `✓ Done`, keeps the
finished steps visible with their ticks, and then a footer reading **`Next guide`** above a button
to the next one. It hands you forward. Eyvar hands you a Dismiss button.

**It can be false.** Probe:

```
--- skip-only completion (USR-3, Support) ---
   all skipped: done=0 of 7 isComplete=true completedAt=2026-06-25T09:14:00+03:00
```

Press `Skip this step` seven times and the layer prints **`Every step is done`** and **`You've
finished the Support checklist.`** while `doneCount` is 0. `isComplete` is
`settled === reachable.length` where settled counts skips, but the *copy* only speaks about
completion. AC-634 was written to stop a skip faking progress in the **numerator**; nobody checked
the **terminal sentence**. This is a copy-law violation — the console asserts something untrue
about the operator's own record — and it is the one defect in this document I would fix before
anything else, because it is cheap.

**It marks nothing.** No audit entry, no toast, nothing in Admin › Activity says this operator
finished their track. Their manager cannot see it. For an operations business where a new hire's
readiness is a real operational question, the completion of onboarding is the single most
audit-worthy event in the whole feature, and it is stored in a `Map` that dies on reload (§4.1).

### 3.3 Where the genuine room is

Not exuberance. Three specific things:

1. **A first success that is acknowledged.** The first time an operator claims and releases an
   item in My Work, the step should tick **by itself**, because they did the real thing. Design
   §10.2 is emphatic that this must produce **no toast** (AC-612) and it is right — but the tick
   arriving without being asked for is the moment the console proves it is watching the work and
   not the checkbox. That is the whole feeling, and it costs three event emissions.

2. **An empty state that says what a screen is for.** Already written, 26 times, unreachable
   (§2.3). Making that copy reachable is a bigger guidance win than any new writing.

3. **A track that shows the operator something real.** Right now every step *describes*. The
   owner's own example is the fix: `ops.application` should not say *"Read the documents, then
   approve or reject"* and drop them on an unfiltered list — it should open Operations › People
   filtered to one pending application and let them decide it. Four of the eight already have the
   destination right; the four Finance ones have `?view=` params that resolve to nothing (§1.6).

### 3.4 Verdict on question 3

> **Corporate, and the reason is not the copy law — it is four wired-up behaviours that were
> designed and never connected.** The completion moment is the clearest evidence: it is a dead
> end, it is unauditable, and it prints a sentence that is false whenever the operator skipped
> their way there.

---

## 4. Does it work at all?

### 4.1 Progress does not persist

`src/data/clients/onboarding.ts`:

```ts
const states = new Map<string, OnboardingState>()
```

Module-scope, in-memory. No `localStorage`, no `lib/persistence.ts` key, no rehydration. **Every
page reload wipes every completion for every operator.** The type comment argues correctly against
`localStorage`:

> *"a checklist that resets when an operator opens the console on a second machine is a checklist
> they stop trusting on day two"*

— and then the mock resets on the same machine, on F5. Under `DATA_SOURCE === 'http'` it would
persist server-side; in the shipped mock build it does not persist at all. Anyone demoing this
loses their progress the first time they refresh.

### 4.2 It completes, and the counters are right

Probe, USR-5 (Ops Manager, 8 steps):

```
   after common.account   -> 1 of 8 complete=false
   ...
   after ops.dispatch     -> 7 of 8 complete=false completedAt=null
   after ops.fairness     -> 8 of 8 complete=true  completedAt=2026-06-25T09:14:00+03:00
```

**Step 8 of 8** flips `isComplete`, stamps `completedAt`, collapses the step list to the done line,
and promotes `Dismiss` from `secondary` to `default`. The account-menu count indicator disappears
(`TopBar.tsx:203` gates on `!isComplete`). Mechanically this is correct and matches AC-635. What
happens *next* is nothing — see §3.2.

### 4.3 Skip-only completion prints a false sentence

Covered in §3.2. `done=0 of 7`, `isComplete=true`, copy says `Every step is done`. **Defect.**

### 4.4 Re-open, skip, resume, restart, dismiss

| Action | Works? | Note |
|---|---|---|
| Skip a step | Yes | Moves to `Skipped (n)` group, no confirmation, does not count toward `doneCount`. Correct. |
| Un-skip (`Do this step`) | Yes | Returns to position and expands. Correct. |
| Dismiss at any time | Yes | Probe: `dismissedAt` stamped, count indicator disappears, menu entry stays. Correct, and the AC-636 reasoning (*"a checklist they cannot close is a trap"*) is right. |
| Restart | Yes | Probe: `done=0 of 8`, `dismissedAt=null`, `archivedStepIds` and `autoOpenedAt` survive. Correct. |
| Restart another operator's (AC-641, from Team & Access) | **No** | Not built. No call site outside the layer's own footer. |
| Resume where you were | N/A by design | Opens on the first incomplete step, which §10.1 argues is better than remembering. I agree. |
| Role change → archive, banner | **Half** | `retrackFor` archives correctly. The banner (AC-643) is not built. |

### 4.5 Reachable from anywhere else? No

Two entry points exist:

1. Account menu → `Getting started` (`AccountMenu.tsx:195`). Always rendered, for every role.
2. Hand-typing `?onboarding=1` onto any route.

**No command-palette entry** — `grep` across `src/commands/` for `onboarding` or `Getting started`
returns nothing, on a console that has a command palette. **No auto-open** (§3.1). **No inline
card, anywhere.** So a new operator discovers their onboarding by opening an avatar menu they have
no reason to open, or by being told.

And on the running build there is no sign-in step at all — the app boots as `CURRENT_USER_ID`
(USR-1, Owner). "The first session of an account that has never had onboarding state" is a state
the running product cannot reach.

### 4.6 Two smaller things found while running

- **`support.profile` has no way to do what it says.** `destinationPath()` returns `null` for a
  `profile` layer (*"needs an entity the checklist does not name"*), so the step renders `Mark as
  done` and nothing else. One of Support's four role-specific steps is a sentence with a checkbox.
- **React warning on every open:** `Accordion is changing from uncontrolled to controlled` — the
  layer initialises `expanded` as `undefined` and sets it in an effect. Cosmetic in the console,
  but it fires on every open and it is one line (`useState<string>('')` plus the existing
  `'' → undefined` normalisation).
- **Arabic:** `src/i18n/dictionaries.ts:925` — `export const AR: Dictionary = {}`. Zero of the 21
  step strings are translated. This is a product-wide gap, not an onboarding one, but the
  onboarding layer is where a new Saudi operator meets it first.

### 4.7 Verdict on question 4

> **It works for four roles, errors permanently for two, forgets everything on reload, opens
> itself never, is findable in one place, and ends by offering to start again.**

---

## 5. Redesign proposal

Ordered by cost-to-value. **R1–R4 are defect fixes and should not wait for a redesign.**

### R1 — Fix the false completion sentence (one key, one condition)

Split the terminal state by *how* it was reached. Copy, final:

| Condition | Heading | Body |
|---|---|---|
| every reachable step **completed** | `Every step is done` | `You've finished the {role} checklist. Reopen it any time from your account menu.` |
| complete, but ≥1 step **skipped** | `{done} of {total} done, {skipped} skipped` | `You can come back to a skipped step from the Skipped group below.` — and **do not collapse the list**; the skipped group must stay reachable |

New keys: `onboarding.doneWithSkips`, `onboarding.doneWithSkipsBody`. Both plural-safe; `{done}`,
`{total}` and `{skipped}` are three numerics in one sentence, so this is `t()` not `t.plural`,
same as `onboarding.progress`.

### R2 — Write the two missing tracks

Dispatcher and Trust & Safety are assignable today and error today. Ids reuse existing rows where
the step is genuinely the same, so AC-642 carries completions through a promotion.

**Dispatcher — 3 common + 4 = 7.** Baseline: `view_operations`, `view_profiles`, `live_ops`,
`contact_users`.

| id | Title | Body | Destination | Completion |
|---|---|---|---|---|
| `ops.dispatch` *(reused)* | Tell a stale feed from a dead one | Live Dispatch shows a freshness line. Learn the difference between data that is late and data that has stopped, before you act on either. | `operations-dispatch` | manual |
| `dispatch.assign` | Put a captain on one waiting request | Open Pending dispatch, pick a captain who is on shift, and assign. You are choosing between real people's next hour. | `operations-dispatch?view=pending` | auto — `request.dispatched` |
| `dispatch.reach` | Reach a rider without leaving the board | A trip going wrong is a phone call, not a ticket. Find where the board lets you contact the rider and the captain. | `operations-dispatch` | manual |
| `dispatch.handover` | Know what you escalate, and to whom | You can move captains and you cannot suspend one, price a trip, or close a safety incident. Read the shift handover note, and read who is on call. | `admin-activity` | manual |

**Trust & Safety — 3 common + 5 = 8.** Baseline adds `approve_drivers`, `manage_tickets`,
`view_analytics`.

| id | Title | Body | Destination | Completion |
|---|---|---|---|---|
| `safety.protocol` | Work one incident through all four protocol steps | Contact, verify, act, document. An incident does not close until all four are done, and the console will not let you skip to the end. | `support-safety?view=open` | auto — `incident.closed` |
| `safety.severity` | Learn what Critical costs you | A critical incident has an acknowledgement deadline as well as a resolution one. Read both clocks on one incident before you are holding three. | `support-safety?view=critical-sos` | manual |
| `ops.fairness` *(reused)* | Read one suspension appeal from the captain's side | Captain Fairness shows you the economics a suspension takes away. Read one before you're asked to answer for a decision. | `support-fairness?view=suspension-appeals` | manual |
| `safety.suspend` | Suspend a captain, and say why in a code | You hold approve_drivers, so this decision is yours and no one else's. The reason code you pick is what the appeal will be argued against. | `operations-people?view=captains` | manual |
| `safety.boundary` | Know what you may not decide | You can read every ledger figure in Analytics and you cannot move money. A goodwill credit is Support's or Finance's. | `support-tickets` | manual |

**Until they are written, `ONBOARDING_TRACKS` must not throw into a permanent error card.** The
`track-empty` state already exists with correct copy and no illustration (R8). Route a role with
no track there instead of to `ErrorState` — a missing track is a content gap, not a load failure,
and `Couldn't load your checklist` is a lie about what went wrong.

### R3 — Turn `requiredPermission` on, from the route table

The blocker is cleared (§1.2). For each of the 21 rows, set `requiredPermission` to the
`viewPermission` of its destination sub-tab. This is mechanical and could be derived rather than
typed, which is better — it cannot drift:

```
requiredPermission := ROUTE_TABLE.subTabs[destination.subTabId].viewPermission
```

Three consequences, all good:

- `AC-610`'s forbidden row becomes reachable and its already-written copy renders:
  `This step needs the "view_finance" permission. An Owner can grant it in Admin › Team & Access.`
- Support stops being sent to Rider Wallets; the step renders `⊘` disabled in place with the
  reason, and drops out of `totalCount` — so Support reads `n of 6`, not `n of 7`.
- Finance stops being sent to My Work — **which then exposes the real design question**, below.

### R4 — Then fix the three steps that R3 will grey out, because greying them out is not the answer

R3 makes the console honest. It does not make the track right. Three steps become unreachable and
each needs a product answer, not a `⊘`:

| Step | Problem | Proposed |
|---|---|---|
| `support.goodwill` | Support has no `view_finance`, and D17 says the credit is a **command on the 360° profile**, not a Financials screen | Repoint the destination at the profile layer's compensation command. Retitle: `Credit a rider from their profile, inside your cap`. Body: `The credit is a command on the rider's profile, not a Financials screen. Find your cap in it before a rider asks you to go past it.` |
| `common.mywork` (Finance) | Finance has no `view_operations`, but My Work **is** where disputes route to them | **This is a permission-model question, not an onboarding one.** Either Finance gets `view_operations` (My Work is self-gating by D17's own comment, so this is defensible) or `finance.routing` is wrong and disputes do not actually reach Finance. Escalate to product-owner; do not decide it in the fixture. |
| `onboarding.intro.myWork` | Hardcoded `MY_WORK_SUB_TAB` for every role | Make the intro's third line point at **the role's own landing route**, not at My Work. Key becomes `Your work starts in {subTab}.` One key, one placeholder, still AC-670-safe. |

### R5 — Put the guide where the work is (§5.0's own rule)

Add a **guide card on the operator's landing route**, above the fold, dismissible, showing **one
step at a time** — the next incomplete one — with its title, its body, and its `Open {subTab}`
button. Below it: `2 of 8 · Getting started →` opening the full layer.

This is `docs/ref/surfaces.md`'s *"Guide card + checklist on the destination"* row, and it is
exactly what `home-guide-side-panel-in-progress.webp` shows Shopify doing: the guide as a card in
"Things to do next", *beside* a real work item, with the full panel still available. It is not a
coach mark, not a spotlight, not a modal wizard, so **AC-615 is untouched**. It is not an empty
state and does not render inside a queue's empty state, so **AC-614 is untouched**. It disappears
the moment the track is complete or dismissed.

**One card, not eight.** Showing eight steps on a workspace overview turns the operator's landing
page into a training page. Showing the next one turns training into a nudge.

### R6 — Group the track into named phases

Eight flat rows read as eight chores.
`home-get-ready-to-sell-setup-guide-accordion.webp` groups an 11-step guide into four named
phases. Apply the same to Eyvar's 7–8, using three phase headings that are the same for every
role because the shape of the job is:

```
  Your account          common.account, common.audit           (2)
  Your queue            common.mywork, + the role's queue steps
  Your authority        the role's decision and boundary steps
```

Keys: `onboarding.phase.account` / `.queue` / `.authority`. The phases are `collapsible`, the
current phase is open, and this costs no new component — the layer already imports `Collapsible`
for the Skipped and Archived groups.

### R7 — Wire the three auto-signals, and stop claiming auto-detection until they are

`queue.item.claimed`, `queue.item.disposed`, `application.decided` have no producers. Either:

- **(preferred)** emit them from the existing mutation call sites — `nextClaim` / dispose in
  `clients/workQueues.ts`, the tick/cross in `operations/people` — and have `ShellContext`
  call `completeStep(id, 'auto')` on match, silently, per AC-612; or
- set those four rows to `completion: 'manual'`, `autoSignal: null`, and record it as a finding.

What is not acceptable is data that says `auto` and a product that never does.

### R8 — Wire the auto-open that already exists

`AppLayout.tsx:210`'s comment says the field is missing. It is not: `OnboardingState.autoOpenedAt`,
`shouldAutoOpen(state)` and `markOnboardingAutoOpened()` are all implemented and exported, with
zero call sites. Six lines, as the comment itself predicted. **After the landing route's first
successful data render**, per §10.1 — *"opening a layer over a skeleton is noise"*.

### R9 — Give the completion moment somewhere to go

Replace `Reopen it any time from your account menu.` with a forward hand-off, following
`home-setup-guide-side-panel-completed.webp`'s `Next guide` footer. For Eyvar the honest next
thing is not a second guide, it is the operator's actual queue:

```
✓ Every step is done
You've finished the Ops Manager checklist.
                                              [ Open My Work ]   [ Dismiss ]
```

`Open My Work` reads the role's landing route, so it is right for every role and mirrors correctly
in Arabic. And **write an audit entry** — `Completed the {role} onboarding checklist` — so a
manager can answer "is this person trained" from Admin › Activity. That is the one place a toast
would be wrong and an audit line is right.

### R10 — A glossary the console owns, instead of a `Learn more` it does not have

Q-82 is right that a dead help-centre link is worse than nothing. It does not follow that the
definition cannot exist. Two options, and I am not deciding between them alone because one needs a
ruling:

- **(a) In-flow, no new surface.** Define each term **once, where it first appears**, in the
  copy that is already there. `Money.tsx` and the money columns already have room for a footnote;
  Trip Assurance's subtitle can carry *"subscriptions with no backup captain"*. Costs nothing
  structurally, closes maybe six of the eight terms in §2.2.
- **(b) A glossary surface.** R4-3 fixes the console at **four shell layers** and a fifth needs a
  ruling I cannot issue in an assessment. A `Popover` on a defined term is the alternative
  (`surfaces.md`: *"Naming an icon-only control → Tooltip"* is the nearest row and it is not this),
  but a popover on running text is a pattern the console does not have and I would not mint one
  for this without evidence.

**Recommendation: do (a) now.** Raise (b) as a question for product-owner if the term list grows
past ten.

### R11 — Make the good empty-state copy reachable

26 `first-run` empty states say what their screen is for, and none of them render on a seeded
console (§2.3). This is the cheapest guidance win available and it is a design question, not an
engineering one: **should a first-run empty state's *heading and body* also render, once, as a
guide card on an operator's first visit to a screen they have never opened?** That is a real
proposal and it needs an owner's answer before anyone builds it, because it changes what
`first-run` means. I am raising it, not deciding it.

---

## 6. Defect register

| # | Severity | Finding | Evidence |
|---|---|---|---|
| D-1 | **High** | Support's track sends them to `/financials/rider-wallets`, which needs `view_finance`; Support has none | §1.3, probe |
| D-2 | **High** | `Every step is done` renders at `0 of 7` when all steps are skipped | §3.2, probe |
| D-3 | **High** | Dispatcher and Trust & Safety have no track; layer shows a permanent error card; both roles are assignable from `AddUserModal` | §1.4 |
| D-4 | Medium | Finance's track and intro both point at `/operations/my-work`, needing `view_operations` Finance lacks | §1.3 |
| D-5 | Medium | All four Finance role-steps carry `?view=` params that do not exist in the route table | §1.6 |
| D-6 | Medium | `PERMISSION_TOTAL = 13` against a 21-key model; every role's intro shows a wrong denominator | §1.5 |
| D-7 | Medium | `requiredPermission: null` × 21 on stale grounds — the route table has been permission-gated since D17 | §1.2 |
| D-8 | Medium | Progress is a module-scope `Map`; every reload wipes it | §4.1 |
| D-9 | Medium | 4 steps declare `completion: 'auto'`; no producer emits any of the 3 signals | §3.1 |
| D-10 | Medium | `shouldAutoOpen` / `markOnboardingAutoOpened` implemented, zero call sites; `AppLayout.tsx:210`'s "deferred" comment is stale | §3.1 |
| D-11 | Low | AC-643 role-change banner not built; `onboarding.roleChanged` and `onboarding.openChecklist` are dead keys | §4.4 |
| D-12 | Low | AC-648 stale-state line not built; `onboarding.stale` is a dead key | §4.4 |
| D-13 | Low | AC-641 restart-another-operator not built | §4.4 |
| D-14 | Low | `support.profile` renders no destination button — a sentence with a checkbox | §4.6 |
| D-15 | Low | `Accordion is changing from uncontrolled to controlled` on every open | §4.6 |
| D-16 | Low | No command-palette entry on a console that has a command palette | §4.5 |
| D-17 | Info | `AR = {}` — no onboarding string is translated (product-wide, not onboarding-specific) | §4.6 |

## 7. Open questions for product-owner — I will not decide these

1. **Does Finance get `view_operations`?** Two of their eight steps and their intro link depend on
   it. Either the permission model is wrong or `finance.routing` is. (Blocks R4.)
2. **What are the Dispatcher and Trust & Safety tracks?** I have drafted both in R2 with final
   copy; they are proposals about what those roles are accountable for, which is product scope.
3. **Should a `first-run` empty state's copy render as a first-visit guide card?** (R11.) It
   changes what `first-run` means and needs a ruling.
4. **Is a fifth shell layer or a running-text popover acceptable for a glossary?** (R10b.) R4-3
   fixes four layers; a fifth is a deliberate amendment, not an implementation detail.
5. **Should completing onboarding write an audit entry?** (R9.) I believe yes, and it is the one
   place in this feature where an audit line beats a toast — but it is a compliance decision.

## 8. Note on the reference

Design §10 cites `home-guide-side-panel-in-progress.webp` and
`home-setup-guide-side-panel-completed.webp` and implements the **panel** from both faithfully —
the anatomy, the progress line, the collapsed done state, the accordion, the no-scrim layer are
all correct against those captures. What it did not take from the same two files is that in both
of them **the guide is also on Home**, inline, beside real work; and that the completed one
**hands the operator to the next guide**. Those are the two things §5 proposes bringing across.
