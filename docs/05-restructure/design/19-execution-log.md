# 19 — Execution log

Live record of carrying out the sequencing in [`17-reconciled-findings.md`](17-reconciled-findings.md) §4.
Every row moves to **done** only with evidence attached. Started 2026-09-02.

---

## The environment this runs in

**The tree is under concurrent edit by another session.** This is not incidental — it is
the reason two of the findings below were mis-reported by earlier audits, and it changes
how anything here should be read.

Measured during this run:

| Run | Result |
|---|---|
| `tsc -b --force` #1 | 40+ errors, all `Cannot find name 'CURRENT_USER_ID'` |
| `tsc -b --force` #2 | **0 errors** |
| `tsc -b --force` #3 | **0 errors** |
| `npm test` #1 | 5 failed / 2931 passed (110 files) |
| `npm test` #2 | 3 failed, **a disjoint set from #1** |

`CURRENT_USER_ID` is exported at `src/data/fixtures/teamUsers.ts:135` and imported
correctly by all 25 consumers. Run #1 caught a mid-write state.

**Consequence for the record:** a single red run proves nothing here, and neither does a
single green one. This is exactly what audit B's "12 build errors" claim ran into, and
it is why Day 0's deliverable is the gate rather than the fix.

---

## Day 0 — the build gate · **done**

The build was already green on a settled tree, so the work was making that durable.

`.github/workflows/ci.yml` — there was **no CI at all** and no git hooks. The workflow
runs on every PR and on `main`:

| Step | Guards |
|---|---|
| `npx tsc -b --force` | `--force` is load-bearing: `tsc -b` is incremental and reports success from a stale `.tsbuildinfo` |
| `npm test` | 2,936 tests |
| `npm run api:check` | the backend handover cannot silently drift from `src/data/clients/` |
| `npm run build` | the real artefact |

---

## In flight

Six agents, partitioned by file ownership so none can collide. Boundaries were stated to
each agent explicitly, because the concurrent-edit problem above makes an accidental
overlap expensive to untangle.

| # | Work | Owns | Source |
|---|---|---|---|
| 1 | Row-click contract (P0-2) + identity column width (P0-3) | `DataTable.tsx`, `table/pinning.ts` | Day 1 |
| 2 | `api:check` to zero — 52 problems | `src/data/clients/**` | contract |
| 3 | Error boundary (P1-8) + dangling `aria-controls` (P1-6) | new files, shell, `ui/tabs` | Day 4 |
| 4 | Reason-code and permission labels (A3) | `src/screens/support/**`, `copy.ts` | i18n |
| 5 | Critical-row ground + derived ink (P1-4), brand green (G1) | `src/styles/globals.css` only | Day 2, Day 5 |
| 6 | `ZonesMapView` on-system + unlicensed tile fetch | zones component | P3-14 |

### Rulings taken during execution

Two decisions were made rather than escalated, on instruction not to stop for questions.
Both are recorded so they can be reversed as decisions rather than discovered as drift.

**R-A. Brand green replaces near-black as `--primary`.** Doc 17 Day 5 marked this
"pending the `--primary` ruling" and doc 13 notes it amends **D7 §1.2**. Ruled in favour:
it is the largest perceived change per hour available, and every other visual item in
`13`–`16` sits downstream of it. Reversible by reverting the ramp. The ~6° collision
between semantic *success* green and brand *primary* green must be resolved deliberately
and commented in `globals.css`, not left to chance.

**R-B. The unlicensed Google tile fetch is removed regardless of what replaces it.**
`ZonesMapView` fetches `mt1.google.com/vt/` with no key and no billing account. No
outcome of that task may leave it in place, and swapping in a different unlicensed
provider is not an outcome.

---

## Queued — blocked on agent 1 finishing in `DataTable.tsx`

| Work | Source | Note |
|---|---|---|
| Consume the critical-row tokens agent 5 derives | Day 2 | mechanical once both land |
| `checkRowCritical` to an explicit per-screen predicate | Day 2 | duck-types `flagged`, `starved`, `unlinked`, `refundId` |
| Row height 60 to 40, and wire the unused `ui.density` preference | Day 3 | fully plumbed, **zero consumers** |
| `<bdi>` on identity, name and every `formatDate` in a cell | Day 3 | every Arabic timestamp is currently reversed |
| Row keyboard: roving focus, arrows, Enter, Space | Day 4 | ~125 tab stops to cross one table today |
| `Column.emphasis` tier | `15` H1 | replaces `columnIndex === 0` |
| CSV export on `DataTable` | P3-12 | `downloadCsv` already exists |

## Baseline — 2026-09-02 02:40. **Trustworthy for the first time.**

Taken on a quiescent tree with no agents running, and every number reproduced.

| Gate | Result |
|---|---|
| `npx tsc -b --force` | **exit 0** |
| `npm test` | **3061 / 3061**, two consecutive full runs |
| `npx vite build` | **green**, PWA precaching 78 entries |
| `npm run api:check` | **exit 0** — 284 endpoints, no problems |
| `npm run i18n:check` | **exit 0** — 4,665 keys, **0 `defaultValue` at ceiling 0** |

Every earlier figure in this file was taken while up to eleven agents were writing. This
one was not.

### Recovering it took five fixes, and four were caused by the way the work was run

1. **`vitest` could not collect at all — 119 suites dead before a test ran.** `team.ts`
   seeded `invites` at module load from a fixture that is now late-bound, so
   `seedInvites()` read `undefined`. Moved into the `onFixturesLoaded` callback beside
   `roster`, which was already doing it correctly.
2. **`Label` import dropped from three `admin/policy` files** by the forms agent mid-
   migration. Restored rather than guessing at the unfinished `FieldLabel` work.
3. **`trips.flag.categoryPlaceholder` used but never declared** — a `defaultValue` removed
   without its key being added. It threw, the new error boundary caught it, and the crash
   cascaded into ten unrelated shell assertions.
4. **Ten shell assertions read a half-filled rail.** Fixtures behind a dynamic `import()`
   add a tick, and `visibleWorkspaces` with unresolved permissions returns only the
   permission-free workspaces. Fixed by warming the chunk once in test setup — routed
   through `@/data/clients`, not `data/mock/*`, so `seam.test.ts`'s rule still holds.
5. **`self.__WB_MANIFEST` written as `sw.__WB_MANIFEST`.** Workbox does a literal string
   search on the *bundled* output; the typed alias does not survive as that token, so the
   build failed and the worker precached nothing.

### And one defect the recovery itself introduced

`asyncUtilTimeout` went 5s → 8s. **Route-level code splitting made every screen a
`React.lazy` chunk**, so a screen-level assertion now waits on a Suspense resolution that
used to be a static import — *"a component suspended inside an `act` scope"*. Measured:
`trips.test.tsx`'s slowest assertion takes 2.9s alone and exceeded 5s under 12-way
parallelism, while the same five suites pass **122/122 sequentially**.

I tried to remove the cause rather than raise the budget, by preloading the route chunks in
setup. **It traded one intermittent failure for eight deterministic ones** — importing
`@/routes` at setup time instantiates modules before a test file's own mocks are hoisted,
which broke every AC-56 forbidden-state assertion. Reverted. The budget is the honest fix,
and it is written into `setup.ts` with the measurement.

---

## Completion matrix — verified 2026-09-02 04:30, by inspection not recall

| Item | Source | State |
|---|---|---|
| Build gate, CI | Day 0 | **done** |
| Row-click contract | Day 1, P0-2 | **done** — explicit `onRowClick`, no label regex |
| Identity column width | Day 1, P0-3 | **done** — 200px @1280, was 38px |
| Critical row: ground + derived ink | Day 2, P1-4 | **done** — the only AA failure, closed |
| `checkRowCritical` → declared predicate | Day 2, P3-10 | **done** — deleted; 15 screens declare one, 4 stopped tinting against their own rule |
| Row height + `ui.density` | Day 3, P2-9 | **done** — 53px comfortable, 45px compact |
| `<bdi>` in tables | Day 3, A2 | **done** — and **the premise was wrong**; see below |
| Row keyboard | Day 4, P1-5 | **done** — roving focus, 1 tab stop |
| Error boundary + `retryable` | Day 4, P1-8 | **done** |
| Brand green as `--primary` | Day 5, G1 | **done** |
| ⌘K registry population | `14` G12 | **done** — 10 domains |
| One confirm dialog | `14` G5 | **done** — 0 duplicates |
| `Column.emphasis` | `15` H1 | **done** — 98 columns, 23 files |
| KPI numeral, ramp, badge budget | `15` H2/H3/H4/H7 | **done** |
| Modal scale | `14` G6 | **done** |
| `cacheKey` | P3-13 | **done** — 117 of 138, 21 uncached with a stated reason |
| CSV export | P3-12 | **done** |
| Code splitting | P3-11 | **done** — entry 2.71 MB → 1.25 MB |
| Zones off Google tiles | P3-14 | **done** — only a comment remains |
| Dispatch on-system | `14` G11 | **done** |
| API contract | — | **done** — 52 problems → 0 |
| `defaultValue` | A1 | **done** — 216 → 0, CI ceiling 0 |
| Reason codes, permission names, refusal grammar | A3, voice | **done** |
| PWA P1/P2 | `18` | **done** — P3/P4 deferred, P3 blocked on OPEN-QUESTIONS Q3 |
| Arabic infrastructure | `18` | **done** — glossary, pseudo-locale, inventory, ratchet |
| Motion | `13` Phase 4 | **done** — licensed set only; doc 13's six tokens **refused** |
| Peek | `14` G8 | **ruled: not a new surface** — the drawer already is it |
| G13 navigation coherence | `14` G13 | **open** — `DispatchScreen` and `FairnessScreen` still use in-page `<Tabs>` |
| Visual QA / a11y | — | **running now**, on a settled tree |
| D-11 focus hand-off | `02-shell-fixes` §13 | **ruled and fixed** — the layer wins |
| Dark theme | `13` P8 | **deliberately not built** — needs a dark table surface derived as a §6.2 entry |
| Arabic translation itself | `18` | **deliberately not started** — `AR = {}` is a content decision |

### Stale caching · **done** — P3-13

117 of 138 `useAsync` sites now carry a `cacheKey`; **21 are deliberately uncached with the
reason written above each one**, which is the right shape — the hook's contract makes a
wrong key worse than no key.

**My "88 already done" was wrong; it was 84.** My grep counted call sites whose *comments*
contain the word `cacheKey`. Sixth instance in this programme of a grep that did not mean
what it looked like it meant.

**Two live collisions were found and closed, and they are the argument for the whole task.**
`RequestsScreen` keys a one-row breach count on `requests.list::[]`; Dispatch's pending feed
is a *different* constant query on the same operation, so a bare `deps: []` there would have
painted the dispatch board's pending column **from a one-row envelope**. `SafetyScreen` reads
`safety.list` three times — table, breach count, corpus probe — and all three would have
claimed one key and served each other's answers. The convention adopted, with precedent
already in the tree: **where a fetcher's arguments are all constants, restate the constants
in `deps`, so the key names the request rather than the operation.**

**And one shape disagreement, now settled.** `AlertRuleDialog` unwrapped `reports.list` to
`SavedReport[]` while `DashboardDetailScreen` stored the `Paginated` envelope under the same
id. The cache is untyped, so that is a `.find is not a function` waiting for the two keys to
meet. Correctly left uncached rather than hidden behind a distinguishing dep — a dep would
have concealed the collision, not removed it. Normalised onto the client's native envelope,
unwrapping at the consumer; both callers now genuinely share an entry.

**And the sweep found the bug it was warned about.** `DashboardTile` closed over `today`
without listing it in `deps`. Today that means the tile fails to re-run; **add a `cacheKey`
to that site unchanged and it serves the wrong rows** — a dashboard left open across
midnight keeps resolving `Today` against yesterday. That is exactly the failure
`useAsync.ts:69–72` documents, and it is the reason this was specified as a deps audit
rather than a find-and-replace.

Measured: on Safety, Fairness, Tickets, Contact Centre and the 360° profile drawer, a cold
load paints 68–70 skeleton nodes and the return trip paints **0**, showing its own rows and
never the sibling tab's.

### A2 · **the Arabic timestamps were never reversed**, and I repeated that claim all session

Audit C reported `09:39 25 يونيو` where the string is `25 يونيو 09:39`, and I carried it into
`docs/ref/i18n.md`, `docs/ref/table.md`, three agent briefs and several status reports as
*"every timestamp in every table, in Arabic."* Measured in Chromium at `dir="rtl" lang="ar"`:

```
no isolation      => 09:39 يونيو 25
<bdi>             => 09:39 يونيو 25     identical
<bdi dir="ltr">   => 25 09:39 يونيو     the month orphaned
```

**`09:39 يونيو 25` is a left-to-right dump of an RTL line.** Read right to left — which is how
it is read — it is `25 يونيو 09:39`. The string was always correct. **Audit C read an Arabic
line in English reading order, and I never checked.**

Two real findings came out of checking:

**`src/lib/i18n/isolate.ts`'s `date` member is wrong.** It instructs callers to pin
`dir="ltr"`, and that is the *one* rendering that breaks: UBA rule W2 turns digits following
an Arabic letter into Arabic Numbers two embedding levels up, and they jump the month. The
bare `<bdi>` already in `queues/cells.tsx` and `people/cells.tsx` was right all along.

**The real bidi defect is the opposite one, and it is on the LTR page everyone looks at** —
Arabic *data* followed by a numeral run inside one cell:

```
LTR, no isolation  => (3) الملقا حي        | 1,234.00 العتيبي الجوهرة SAR
LTR, <bdi> on it   => الملقا حي (3)        | العتيبي الجوهرة 1,234.00 SAR
```

That needs the `<bdi>` around the sub-run *inside* the cell, so it is a call-site fix rather
than a cell-renderer one. One live instance today, in `EmailLogCard`.

So A2 shipped as a **contract, not a repair**: 22 index routes swept under `dir="rtl"`, every
isolated cell unwrapped and re-measured, **zero cells reorder anywhere**, row counts identical
at 1280 and 1152, zero text-position deltas across 100 cells. It stops a cell renderer written
tomorrow from regressing, and it gives plate and phone a declaration. `id` is deliberately
**not** isolated: an identifier starts strong-Latin so the UBA already keeps it contiguous, and
isolating it moved the Trips avatar from x=816 to x=709 under RTL, off the inline-start edge.

### P3-10 · four tables were tinting against their own screen's written rule

`checkRowCritical` is deleted. **Two of its branches were dead** — no type in the product has
a `clock` field, and `'refundId' in r` matched nothing. Fifteen screens now declare a
predicate, and the rule applied is that **the tint takes the same expression as the R5a
leading-edge marker the screen already renders**, so §8.4.6's two carriers cannot disagree.

The finding is the four that now declare *nothing*:

- **`/operations/trips`** — its own header says *"R5a — no red badge and **no red row**. A
  flagged trip is `warning`."* **This is audit C's symptom** (`TRP-8001` tinted, `TRP-9003`
  not), and it closes by **removing the tint**, not by adding a predicate. The duck-type was
  painting something the screen had explicitly ruled out.
- **`EmailLogCard`** and **`WebhookDeliveryLogCard`** — both headers say no red; a bounce is a
  fact to work through, not an alarm.
- **Trial balance** — the clearest false positive: `balanceHalalas` is signed *on the
  account's normal side*, so `< 0` tinted **every credit-normal account in a perfectly healthy
  ledger**.

Two tables gained a tint they could never have had: `LedgerCard` postings, because the
duck-type read `r.status` and a posting's state is `settlement` — so the one thing the ledger
*does* call critical was the only thing it never tinted; and Refunds, via the dead clause.
Verified at 1280: tint/marker parity across 13 routes, **zero mismatches**.

### Motion · **done**, and doc 13's proposal was refused

Doc 13 Phase 4.2 asks for six motion tokens. **Implementing it would have been the defect** —
`globals.css` already rules that Tailwind's duration scale *is* the token set and a second
source drifts. `--ev-live-loop` remains the only motion token. `dist` now emits exactly
`.duration-100` and `.duration-200` and nothing else.

**The finding nobody was looking for.** Three components carried a blanket property
transition, and `--font-sans` leads with **Inter Variable declared `font-weight: 100 900`** —
so the weight axis interpolated. Measured in the shipped build, a 500 → 600 change ran
`511, 534.5, 557.25, 573.75, 585, 592.25` over 150ms: **every tab selection and every toggle
press was physically thickening its own label**, in both languages. It also transitioned the
focus ring, which rides on `box-shadow` — and a ring that fades in is a ring that is not
there yet.

**The sanctioned loop does not exist and was deliberately not built.** `--ev-live-loop`,
`@keyframes live-pulse` and `--animate-live-pulse` are all declared with **zero consumers**;
`live-pulse` is tree-shaken out of `dist` entirely. §7.6 makes a pause/stop/hide control a
MUST for any loop under SC 2.2.2 — and explicitly rules an opacity loop of this exact shape
an AA failure without one. Where that control lives is a shell decision. Live Dispatch
already says "Live connected" in words, so the static signal exists and the dot would be
decoration on top of it.

**One known deviation, recorded rather than chased.** Sonner injects a 400ms toast transition
into `<head>` at runtime, after our stylesheet. Overriding it cleanly needs specificity
≥ 0,2,0 against an exit path at 0,5,0 — encoding six of a dependency's private selectors that
rot on the next bump. `!important` is worse: it would outrank our own universal
reduced-motion guard. It breaches the 200ms layer value, not R18, and Sonner ships its own
reduced-motion block.

### Peek · **ruled: it is the drawer**

`surfaces.md` already carries the row verbatim — *"a surface consulted against the page
behind it → drawer, no scrim."* Verified against the built app rather than the source: no
scrim, Escape closes, Tab from the last control leaves while the drawer stays open, focus
restores to the opener, 200ms direction-aware slide. **Peek and drawer are the same object
under two names**, and adopting both gives six names to five surfaces — after which the first
argument about which to use is unresolvable.

G8's real content is a **routing** defect, not a missing component: My Work's *Open* and the
Conversations thread navigate away where they should consult.

Two proposed modes refused. `side` plus a persisted per-operator preference makes the surface
a variable, so no spec can state what an operator sees and every bug report starts by asking
which mode they were in. `full` is component reuse on a route — welcome — but a page is
already its own row in `surfaces.md`.

### D-11 · **ruled: the layer wins**

`02-shell-fixes.md` §13 raised *"who owns focus when a popover hands off to a layer"* and left
it open; the test carried it as `it.fails`. Measured in the production build: opening *My
profile* puts focus on the sheet title at t=0, on `body` at ~50ms, and **back on the dropdown
trigger at ~150ms while the drawer is still open**. The menu's async focus-restore writes last
and wins, and the operator then tabs through the page behind the thing they just opened.

**A menu that hands off does not take focus back** — on lifetime grounds (R10): a menu's
restore exists so dismissing it costs nothing, and a layer is a destination. Implemented as a
conditional `preventDefault()` in `onCloseAutoFocus`, set only by an item that opens a layer.
**Blanket suppression would break Escape and every in-place item**, which is why the ref
exists. Test inverted from `it.fails` to `it`.

### The comment-harvest mechanism, five times — the fifth was mine

Tailwind v4 scans comments as plain text and mints the classes it finds. This session it
shipped `.mr-auto`, `.transition-all`, `.animate-ping` and `.bg-rose-50` into `dist` **from
comments warning against them** — and then a fifth time, out of the comment I wrote citing
`.mr-auto` as the cautionary example. A rule that documents itself by name documents itself
into the stylesheet.

**Name the parts, never the class. Verify in `dist`, not `src`.**

## The two audits · what they found, and what is left

Both ran on a quiescent tree and wrote their verdicts to `docs/02-verification/`.

### Fixed from the audits

**V-1, critical, and mine.** A `/** … */` block sat in JSX **child** position in
`AccountMenu.tsx`, so React rendered the comment as text — a **376×880px slab of prose in
`<header>` on 35 of 35 routes**, covering `Export CSV` on every index screen and the first
KPI tile on the management board. `tsc` was clean, 3,075 tests passed, the build was green;
the same file gets it right eleven lines away. Fixed, and guarded by
`src/components/jsxComments.test.ts`, which carries its own self-test — a detector that
silently stops matching reports a clean tree forever.

**V-2 / the a11y contrast pair.** `rowActions.tsx` and `queues/cells.tsx` hard-code
`text-muted-foreground` **inside** a cell, so `DataTable`'s per-cell derived ink (scoped to
`tier === 'meta'`) never reaches them: `#6b7280` on the active critical ground measures
**4.354**. At rest it is 4.578 and passes — so it fails only in the state the operator is in
while reading it, which is invisible to a screenshot. Fixed at the root with **Defence 3** in
`globals.css`, scoped to a `data-row-critical` row rather than to the two call sites, because
the next component to hard-code muted ink in a cell will not know to ask. Verified in a
browser: **`#666d7a` on `#fef0ee` = 4.689** at 12px and 14px.

**B5.** My own D-11 fix was incomplete — I closed `See all` and missed the notification rows
themselves, which are the path an operator actually uses.

**V-3.** `1,284.50 SAR` needed ~94px in 88px of inner width and truncated to `1,284.50 …`.
Fare is 128px, funded by 16px of *measured* slack on `startedAt`, so the row budget is
unchanged. **A money column must never ellipsis** — a clipped name is visibly clipped, but
`1,284.50 …` reads as a complete and different number.

**B7.** `document.title` was the literal `Eyvar Admin` on all 34 routes with **zero writers**
in `src/`. Thirty-four routes announcing one string gives a screen-reader user nothing on
every navigation, and an operator working a queue against a ledger in two tabs cannot tell
them apart. Now `Payouts · Financials · Eyvar Admin` — most specific first, because a tab
strip truncates the end — and a shell layer deliberately does **not** rename the page (AC-10:
a layer is not a navigation).

### Three defects I nearly filed, all killed by measuring

Every fare rendering `0.00 SAR` — correct; the fixture's own comment says *assigned but not
started, no fare yet*. `There is no record on file for this reference` appearing in every
identity cell — an `sr-only` description that Playwright's `innerText` includes. And my own
column probe reporting zero truncation everywhere, because it measured the cell box rather
than the text.

### Escalated, not decided

**`--input` `#dde0e4` is 1.324:1 on white against WCAG 1.4.11's 3:1 for a control boundary.**
The a11y audit is right about the number and its proposed fix computes correctly
(`--ev-hairline-strong` clears 3.099–3.441 on all five grounds, no new token). **I did not
apply it.** `globals.css` already *states* 1.324 and builds a deliberate two-weight hairline
system on it, and R19 assigns the stronger weight to *"the unchecked checkbox / radio
outline, and nothing else."* This is a documented decision colliding with a success
criterion, not an oversight — which makes it an owner's ruling, not a fix.

**Five of the seven a11y blockers are one root cause: closing a layer drops focus on
`<body>`.** Two bespoke drawers bypass `ShellLayer`; 22 of 24 dialogs have no
`DialogTrigger`; `useFocusEntry.ts:64` declines a detached opener. `ShellLayer` +
`useFocusEntry` already solve this correctly — the defect is everything that does not go
through them. That is a shell refactor with a real blast radius, and it wants its own pass
rather than the tail of this one.

Also open: the bulk bar at 124 tab presses, the command palette's missing
`combobox`/`aria-activedescendant`, and the live region that does not exist until the first
announcement.

---

## ⚠ THE WORK IS NOT COMMITTED, and another session keeps stashing this tree

`HEAD` is `129a21e`. **None of this programme is in it.** `git show HEAD:src/components/DataTable.tsx`
contains neither `primaryRowAction` nor `emphasisOf` — the P0 row-click contract, the P0
column-width fix, the critical-row tokens, density, emphasis, CSV and the keyboard layer all
live **only in the working tree**.

Another session `git stash`-ed and re-applied this tree **three times** (03:04, ~03:20,
03:50). Each time every tracked file snapped back to `HEAD` for 30–60 seconds. During one of
those windows the identity column measured **38 / 46 / 32px at 1280** — the original T2
collapse — because the fix was momentarily not in the file. An agent nearly recorded that as
a regression.

A full patch is held outside the repo at
`…/scratchpad/tree-backup/working-tree-*.patch` (26,180 lines). **That is a backup, not a
substitute for a commit**, and committing is the owner's call.

---

## Round 2 · what landed after the baseline

### The table layer

**`Column.emphasis`** replaces `columnIndex === 0`. **23 screen files, 98 columns** declare a
tier. The fallback is anchored to the *declared* column array, not the visible one, so hiding
the identity column removes the row's ink rather than lending it to whatever slides into
position 0. It is also load-bearing for AA: the critical-row derived ink is scoped to
`tier === 'meta'`, and keying it off the index would have pushed a `data` column at position
4 back down to muted ink on the critical ground.

**`ui.density` has consumers at last.** Compact takes the block padding, `py-2` → `py-1`,
and the height floor with it — 8px a row and nothing else. `h-auto` is needed on both `<tr>`
and `<td>`, because `ui/table.tsx` declares `h-row` on the cell independently and overriding
one leaves a 40px floor the 8px can never get under.

| Route | Comfortable → compact | Rows visible @1280 |
|---|---|---|
| Corporate, Trips | 53 → **45px** | 8 → **10** |
| People (media) | 60 → **45px** | 7 → **10** |
| Payouts, Tickets | 77 → **69px** | 6 → **7** |

**CSV export** on every index table, exporting what the operator is looking at — current
filters, sort and visible columns. Money stays integer halalas. It carries two honesty
fields, `omitted_column` and `empty_column`, and the second caught a real bug in
verification: the first export wrote `" — gold"` for every captain because the identity cell
is a component with no flattenable children.

### Three corrections, two of them to numbers I wrote here

**Single-line pitch is 53px, not 49px.** I recorded 49px earlier today. The type ramp work
landed in `globals.css` between the two measurements and moved it. Verified deliberately:
stripping the new `font-medium` / `text-foreground` off a live row leaves it at 53.

**The support queue's 93px was only partly the subject column.** I attributed it entirely to
the subject wrapping. **16px of it was the disabled-action refusal sentence**, rendering into
a 64px-wide lane and running to 96px tall. Clamped, the queue is **77px**. On
`/admin/communications` rows ran **141px** with 205 / 105 / 73 among them — R20's uniformity
broken by whether a row happened to be refused at all.

**The keyboard win is one tab stop, not 124 fewer.** Rows now contribute **1** stop instead
of one per row, and arrows, Home/End and Enter all work. But the "125 tab stops per table"
figure was always the *in-row controls* — checkbox, identity link, kebab — and those are
untouched. Removing them needs `role="grid"`, and two written criteria in
`screens/financials/keyboard.test.tsx` assert the opposite today. That is an owner's ruling,
not a refactor, and it was correctly left alone.

### The string layer

**Zero colliding keys, and there is now a gate.** `action.saving` carried `Saving…`,
`Assigning` and `Reassigning…` across three dictionaries and was called from three modals for
three different verbs; `action.goBack` and `sub.selectDriver` were the same shape. Screen
dictionaries spread into `EN`, so **the last spread wins and silently relabels whichever
screen lost** — invisible until the losing dictionary is registered, which is exactly when
nobody is looking. Each call site now has its own key, the generics are deleted, and
`npm run i18n:check` fails on any new collision. Proven by introducing one and watching it
fire.

**13 copy defects in a block I moved myself.** The `applicant.*` strings were relocated out
of JSX verbatim — Title Case, `Failed to approve application`, and `Needs the
approve_drivers permission` came with them. A mechanical extraction moves the defects too;
it does not clean them. This is the clearest evidence yet for the claim in `docs/ref/i18n.md`
that `defaultValue` was an *unaudited copy surface*, not merely an untranslatable one.

**One refusal grammar, replacing four.** 41 refusal strings across four competing patterns,
with D17's ratified grammar obeyed in exactly one place. Now uniformly *what was refused ·
the named permission · a named person to ask* — a person and not a route, because an operator
without a permission usually also lacks `view_admin` and cannot reach the page you would send
them to.

---

## Density · measured in a browser, and it corrects two of my own claims

`rowMedia` now defaults to **false**: media pitch is opt-in, declared by the four People
views that actually render an avatar. Eighteen tables stop paying 20px a row for a picture
they do not show.

| Table | Pitch | Identity column @1512 / @1280 |
|---|---|---|
| Corporate — single line | **49px** | 222 / 200 |
| Trips — second line | **53px** | 238 / 168 |
| People — media, correctly | **60px** | 478 / 278 |
| Tickets — second line | **93px** | 240 / 240 |

**Correction 1: "60 → 40" was never achievable.** `--ev-row-h` is 40px, but a row's height
is set by its content, and `h-row` is a floor. The real single-line pitch is **49px**. The
win is 60 → 49 — about 18% more rows, not the 33% doc `13` and `15` both assumed.

**Correction 2: the identity column collapse is genuinely fixed.** Measured **200px at
1280** against the audit's **38px**, and **222–238px at 1512**. At 1152 it was 0px; it is
not any more.

**Open, and it is a design question rather than a width tweak.** The support queue runs at
**93px a row** — nearly double a single-line table. Its height is set by the *subject*
column wrapping, not by the new reason sentence. I widened the reason column 150 → 230 on
the assumption it was the cause, measured **93px at both widths**, and reverted: it spends
80px of a 1280px viewport and buys nothing. The real finding is that §9.1's *"the row grows
to fit; never truncates"* was written for a short second line — an id, a route — and does
not survive sentence-length content.

---

## ⚠ Historical — the tree was broken here, 2026-09-02 ~01:40. **Now recovered; see above.**

**The session hit its rate limit and all eleven background agents were terminated
mid-write, simultaneously.** Not one of them got to finish, revert, or leave a clean edge.
Do not trust any file's state; do not run a "baseline" and believe it.

Known broken, from the last agent able to report:

| Symptom | Traced to |
|---|---|
| `vitest` **cannot collect at all** — 118 files fail before a test runs | `src/data/clients/zones.ts`, `src/data/fixtures/financials.ts` |
| `tsc -b --force` — 9 files red | half-applied ConfirmDialog consolidation: missing `./ConfirmDialog` and `./IntegrationsConfirm` modules, `ConfirmRequest` no longer exported from `@/screens/queues` |
| 1 more | `src/data/clients/auth.ts:721` |

The ConfirmDialog agent's last words were *"my screen edits were reverted by a concurrent
agent, re-applying them now"* — and then it died. **That migration is the most likely place
for genuine inconsistency**, because it was deleting three modules and rewriting their
importers when it stopped.

### Recovery order

1. **Get `vitest` collecting.** Two files, and nothing else can be measured until they parse.
2. **Finish or fully revert the ConfirmDialog consolidation.** Half-applied is the worst of
   the three states. Reverting it is legitimate — the finding is recorded below and the work
   is a day.
3. `auth.ts:721`.
4. Only then take a baseline, and treat every earlier number in this file as provisional.

### The real lesson, and it is mine

Eleven concurrent agents was too many. Territory partitioning stopped them overwriting each
other's *files*, and it did nothing about the two failure modes that actually hurt:
**every measurement taken while others were writing was untrustworthy**, and **a shared
budget means they all die at once, at the least convenient moment, in the middle of whatever
they were doing.** Fewer agents, serialised through the files that everything depends on,
would have finished more.

---

## Landed

### The API contract · **done**
`npm run api:check` **52 problems → 0**, 284 endpoints across 46 clients.

Two things worth keeping:
- **None of the 7 double-slash paths was a live bug.** `http.ts:57` normalises the prefix,
  so `/api/v1//drivers/facets` only ever existed in the docblock. The generated index was
  lying about a route that was correct on the wire.
- **The checker had a blind spot, and cross-checking found it.** Registration was verified
  against *use* — every `mock(X.y)` call site against the constants actually registered —
  rather than against the checker's own report. That surfaced `audit.ts` and
  `financialsOverview.ts`, which declare operations on one line
  (`export const AUDIT_OPERATIONS = { list: 'audit.list' } as const`) and so never matched
  the line-oriented regex. **They had the real defect while reporting clean.** The regex now
  matches the declaration name, which cannot be written on more or fewer lines.

### Code splitting · **done** — P3-11

| | Before | After |
|---|---|---|
| JS chunks | **1** | **54** |
| Entry chunk | **2.71 MB** | **1.54 MB** |
| Total JS | 2.71 MB | 2.74 MB |

Doc `17` said 2.19 MB; the real baseline was 2.71 MB. Total grows slightly — that is chunk
overhead, and it is the right trade: what an operator waits for on first paint is the entry.

Barrels were kept on purpose. `import('@/screens/financials')` chunks all seven financials
screens together, matching how an operator moves — into a workspace, and then around inside
it. `SubTabScreen` and `RouteStates` stay eager: they are the fallback for unmapped routes
and the catch-all, and a fallback that can fail to load is not a fallback.

`REPORTS_SUB_TAB_ID` moved to `screens/reports/ids.ts`. The router keys its Reports branch
on it, so importing it from `ReportsScreen` would have dragged the whole Report Builder back
into the entry chunk. An id is data; it belongs in a module with no React in it.

**Suspense sits below `AppLayout`, never above it** — a boundary above the layout blanks the
rail, sub-tab column and top bar on the first visit to every route. Credit to the error-
boundary agent, which flagged this unprompted before I placed it.

**One change reverted for want of evidence.** Importing `getRouteTable` and
`METRIC_BOARD_SUB_TABS` from their owning modules instead of the `@/data/clients` barrel
looked obviously right. Measured: **1543 KB vs 1542 KB — no effect.** Reverted rather than
ship a comment claiming a win the build disproves.

### Machine vocabulary off the screen · **done** — A3

**8 raw-identifier sites, not the 2 the audit named.** Beyond the two ticket screens:
`AdminActivityScreen` showed `PAY_REFUND_REQ` in the audit log, `RevenueScreen` showed
`BKG_NO_SUPPLY` on refund rows, and the 360° profile rail and drawer showed both. 47 keys,
enumerated from the policy registry and the fixtures rather than invented — including the six
`dispute_*` codes that `clients/disputes.ts:370` builds from a union **at runtime**, which no
extractor could ever have seen.

Two labels are not the literal reading of their code, which is the argument for doing this by
reading fixtures rather than prettifying identifiers: `payout_blocked` is a payout run that
*refused the bank details on file*, not a late payout; `captain_absence` is a **scheduled**
departure, distinct from the on-demand `CAP_NOSHOW`.

**The raw code is kept on exactly two surfaces** — ticket detail and the activity log — as a
secondary mono line under the sentence, wrapped in `<bdi>`. Both are handoff surfaces: a
support operator escalating quotes the code, and `ReasonCodesCard`'s entire never-rename rule
exists so it stays quotable. It is never the primary label and never repeats down a queue;
fifty rows of mono identifier is the defect, not the handoff.

**`reasonLabel()` returns an unlabelled code unchanged rather than calling `t()`.** An
operator with `manage_ops_policy` can mint a code tomorrow, and that must degrade to the
pre-A3 behaviour, not to the AC-74 dev guard throwing.

**My `perm.*` finding was wrong — the fifth.** I reported "zero `perm.*` keys against 20+
permission keys". There are **23 `account.permission.*` keys, complete against every member
of the `PermissionKey` union**, rendered by `AdminTeamScreen` and `AccountLayer`. Verified
independently. The gap was true only of the namespace *name* I had guessed at, and creating
`perm.*` would have minted a duplicate vocabulary — the one thing a closed vocabulary must
not have. `docs/ref/i18n.md` corrected in place. **Same failure mode as the other four: I
grepped for the shape I expected instead of for the thing itself.**

### A comment that closed itself, and blanked every page

`globals.css` picked up a comment reading ``grep over `src/**/*.{ts,tsx}` ``. **The `*/`
inside `**/*` closes a CSS comment**, so `.{ts,tsx}` parsed as raw CSS: the build died with
`Invalid declaration: 'ts,tsx'` and dev served a white page behind an HMR overlay.

Worth recording for what it nearly cost. Several agents were doing Playwright verification at
the time and would have been **measuring a blank page** — reporting a token as broken, or a
layout as wrong, with a screenshot to prove it. The rule now sits in the file: never write
`*/`, or a `**/*` glob, inside a CSS comment. And `tsc` cannot see CSS, so a typecheck is not
a substitute for a build.

### The token layer · **done** — P1-4 and G1

**The critical row now has a ground and its own ink.** What pins the ground turned out not to
be the text at all: R19 requires an unchecked checkbox boundary (`--ev-hairline-strong`
`#828b99`) to clear 3:1, and walking the red tint down gives `#fef0ee` at **3.099 PASS** and
`#feebe9` at **2.995 FAIL**. So the darkest defensible red tint in the product is
`--ev-red-lt` — the row's active ground and the critical banner's fill arrive at the same
value from two independent derivations.

| Token | Value | Role |
|---|---|---|
| `--ev-row-critical` | `#fff7f6` | rest. The rest→active step **equals the product's own accepted hover step** (1.0515 vs 1.0535) |
| `--ev-row-critical-emphasis` | `#fef0ee` | hover / focus-within / selected. The R19 boundary |
| `--ev-text-2-row-critical` | `#666d7a` | **4.931 / 4.689** — the fix the ground alone could not make |

`--ev-text-2` `#6b7280` measures **4.354 on the active ground**, so swapping the ground and
stopping would have left the defect in place wearing a token. Visual weight is parity with
what shipped (1.0560 vs 1.0690) — this changes whether the text is legal, not how the table
looks.

**Dark was refused, and the refusal is right.** `.dark` is never applied anywhere in the
product, so a `.dark` row-critical block would be the *only* dark values that exist and would
paint a dark red row inside a still-white table. Deriving one honestly needs a dark table
surface, which is a §6.2 entry and doc 13 P8's owner decision. The correct disposition of
`dark:bg-rose-950/*` is **deletion, not tokenisation**.

**Brand green is `--primary`** (ruling R-A). `--ring`, `--chart-series`, `--chart-comparison`
and `--chart-fill` moved onto the ramp; `#2b6ef0` now appears **once** in the built CSS, its
own declaration. Verified in a browser, not asserted: a real focused `<input>` reports
`outlineColor rgb(12,105,68)` with zero component edits, and live Recharts dots measure
`rgb(12,105,68)`.

**Doc 13 §1.2 was wrong, and it was my error.** It claimed white on `#0C6944` is **8.42:1**
and "clears AAA". Recomputed: **6.731:1** — clears AA with margin, does not clear AAA.
Corrected in place. The `--primary-foreground` spend from 17.411 to 6.731 is real and is now
written at the token rather than left to be discovered.

**The hue collision needed all three axes, not the one doc 13 proposed.** Measured first:
success `#15653c` vs brand were **6.8° of hue apart, dE76 3.33** — "same colour, other
monitor". Doc 13 said to push success to `hsl(150 …)`; it was already at 149.3, and hue alone
at `hsl(142 …)` still only reached dE76 5.9. `--ev-green` is now `#1d723c` — **14.2° of hue,
5.1pp lighter, 20.1pp less saturated, dE76 10.09**. The direction is the semantically right
one: success is the lighter, softer, yellower green and the brand action is the darker,
deeper one, so weight reads as authority.

A **wide-net sweep across all 22 Tailwind palettes × 11 stops** — the net that catches `rose`
— found **44 palette-class hits in 7 files**, where the narrow greps behind `17` §3 found
three. That is failure mode 2 in `verify.md`, measured one more time.

### Dispatch back on-system · **done** — `14` G11, and more than G11 asked for

All three audits flagged Dispatch. Three findings, only one of which was on the list.

**The palette classes are gone** — ten of them, replaced by the closed five-tone set
(`bg-warning`, `text-warning-foreground`, `text-success-foreground`), and `text-[11px]` /
`text-[10px]` are `text-2xs`. `--tone-warning-graphic` was **not** used: `globals.css`
documents it as licensed to exactly one consumer and explicitly not for badges or text, and
a token with a stated scope is not a token to borrow.

**The pickup and destination pins were a colour-only distinction.** Both rendered `MapPin`,
green and red, with colour the *only* thing telling them apart — invisible to a colour-blind
operator, and reading as good-versus-bad, which the two ends of a route are not. Destination
is now `Navigation` and both are muted ink. **No audit found this**; it only surfaced when
the palette classes were being replaced and each one had to be given a *meaning*.

**42 `defaultValue` literals, and 16 copy defects hiding behind them.** Dispatch had no
`copy.ts` and bypassed the copy law entirely — its strings lived in JSX. They are now a real
dictionary reached through `withFallback`, the same arrangement Trips and Subscriptions
already use, needing no edit to `dictionaries.ts`. Consolidating them made the copy
reviewable for the first time, and it was not clean:

| Was | Now | Rule |
|---|---|---|
| `Fleet Utilization` | `Fleet utilisation` | **US spelling** — §5.7 |
| `Auto-Match Rate`, `Avg Match Time`, `Active Trips`, `Fleet Online`, `Pending Dispatch`, `Dispatch Velocity`, `Live Operational Interventions`, `Manual Captain Assignment`, `Select Available Captain`, `Dispatch Captain` ×2 | sentence case | §5.7 |
| `Assigning...`, `Choose an active captain...` | no trailing dots | §5.7 |
| `All live trips operating within nominal SLAs.` | `Every live trip is within its SLA.` | machine register |

**This is the finding that matters most about the copy law.** Round 18 measured zero
violations across all 26 `copy.ts` files and concluded the law was obeyed. It is — *in the
files the law can see*. Dispatch was compliant by being invisible: `defaultValue` put its
English in the JSX, where no copy test looks. **The 216 `defaultValue` sites are not only a
translation problem; they are an unaudited copy surface.** A `defaultValue` ratchet is now
assigned to CI.

### What the entry chunk actually holds — a bigger finding

Grepping the minified entry: **`USR-1` 104 times, `halalas` 14, `mock_injected_failure` 2.**
All 26,615 lines of mock fixtures and the whole failure-injection machinery ship to every
operator in the first chunk — *including in a `VITE_DATA_SOURCE=http` build where not one of
them can ever be read.* Each client statically imports both branches and `DATA_SOURCE` is a
runtime constant, so the bundler cannot drop the mock side. Now assigned.

---

## Corrections found while executing

**G12 "⌘K executes" was already built.** Doc `14` G12 said the registry "is simply not
plugged in". Verified in source and it is: `GlobalSearch.tsx:85` imports the palette,
mounts it at `:334`, binds ⌘K at `:145–146`, and `usePalette.ts:525` calls `runCommand`.
The command layer is now ~3,300 lines across nine files, not the 539-line registry the
claim measured. **What produced it:** the claim was written against an older tree and
carried into the sequencing table without re-checking.

The surviving finding is narrower: `src/commands/index.ts` exports exactly one domain
registry, `CAPTAIN_COMMANDS`, and says so in its own header. **⌘K executes; it has almost
nothing to execute — one screen of 22.** Doc `14` corrected in place.

This is the fourth stale-or-wrong claim in this programme (see `17` §3), and the second
of mine. It is the reason `docs/ref/verify.md` exists.

---

## Queued — free of `DataTable`

| Work | Source |
|---|---|
| ~~Command centre: make ⌘K execute~~ **done already** — populate the registry instead | `14` G12, corrected |
| One confirm dialog, replacing the divergent duplicates | `14` G5 |
| `cacheKey` on index screens — 2 of ~250 call sites use it | P3-13 |
| Code-splitting: 2.19 MB single chunk, zero `React.lazy` | P3-11 |
| Modal scale and toasts | `14` G6/G9 |
| Dispatch back on-system | `14` G11 |
| Motion | `13` Phase 4 — note the no-duration-token ruling in `docs/ref/motion.md` |
| Peek | `14` G8 |
