# 00.8 — Behavioural QA verdict: the app shell

> **Phase 0, step 0.8.** Owner: qa-engineer.
> Verified against `docs/05-restructure/specs/00-foundation.md` §10 (**AC-01 … AC-76**).
> Claims under test: `docs/05-restructure/build/00-shell.md` §4–§8.
> Consumers: frontend-engineer (defects), product-owner (spec defects), engineering lead (the gate).
>
> **Appearance is not assessed here.** Spacing, colour, alignment, geometry and the 1280 px
> measurement are visual-qa-engineer's.

---

## 0. What was measured, and when

Everything below was **run**, not read. Three measurement points, all on this machine, all
reported verbatim.

### 0.1 The audited baseline — 00:32, start of session

```
$ npx tsc -b --noEmit        → exit 0, no output
$ npx vitest run             → Test Files 27 passed (27)
                               Tests     524 passed (524)
```

This matches the shell owner's §0 exactly. **Every finding in this document was reproduced
against this tree**, with the shell as described in `build/00-shell.md` §1: `ModuleRail` with a
disclosure and a collapsed popover, `PageNav` exporting `PageNavPopoverBody`, and
`src/hooks/useNavCollapse.ts` present.

### 0.2 After my tests were added — 01:02

```
$ npx tsc -b --noEmit        → exit 0, no output
$ npx vitest run             → Test Files 33 passed (33)
                               Tests     739 passed (739)
```

+123 tests from this step in four files (§8), +~92 from the utilities-engineer's column-pinning
work landing in parallel. **Green, including every pre-existing test.**

### 0.3 The tree at 01:06 — **RED, and not because of this step**

```
$ npx tsc -b --noEmit        → 25+ errors, all in src/hooks/useColumnPinning*
$ npx vitest run             → Test Files  7 failed | 25 passed (32)
                               Tests      65 failed | 659 passed (724)
```

**Two concurrent rewrites landed on top of the shell during this audit.** See §7 — this is
recorded as **defect P-1** and it is the single largest input to the gate decision. In summary:

| File | Change observed, 01:02 – 01:08 | Effect |
|---|---|---|
| `src/hooks/useNavCollapse.ts` + its test | **deleted** | AC-32 and AC-33 have no implementation |
| `src/shell/ModuleRail.tsx` | disclosure, `collapsed`, `popoverOpen`, `popoverContent` props removed; new `RAIL_LABEL_KEY` map pointing at `nav.rail.*` keys **that do not exist in `dictionaries.ts`** | AC-74 breaks at runtime; AC-64's amended order no longer describable |
| `src/shell/PageNav.tsx` | `PageNavPopoverBody` **removed** | AC-33's "same component" claim no longer has a subject |
| `src/shell/AppLayout.tsx`, `ShellContext.tsx`, `icons.tsx`, `RouteStates.tsx`, `SubTabScreen.tsx` | modified | not re-audited |
| `src/hooks/useColumnPinning.ts` vs its test | out of sync | `tsc` red |
| `src/screens/operations/people/*` | **new** — Phase 1 work | Phase 1 has already started on an ungated shell |

I did **not** touch any of those files. My only writes outside test files were two deliberate
mutations, both restored and hash-verified (§9).

---

## 1. Criteria table

**Legend.** `Pass` — verified by a test I ran that asserts the criterion as written.
`Pass (weak)` — a test exists and passes, but it proves less than the criterion says; the gap is
named. `Fail` — verified false. `Gap` — a pre-agreed, owner-assigned gap. `Unverifiable` — no
subject exists yet to test; not a pass. `Visual` — visual-qa-engineer's to measure.

Test names are abbreviated; every one is in the file named in the last column.

| AC | Criterion (short) | Build note claims | **Verdict** | Evidence |
|---|---|---|---|---|
| AC-01 | 5 workspace targets | pass ✓T | **Pass** | `routes.test.ts` "renders exactly 5"; `nav.test.tsx` "renders exactly five workspace targets" |
| AC-02 | Admin last and pinned | pass ✓T | **Pass** | `routes.test.ts` "pins Admin last"; `nav.test.tsx` "puts Admin last" |
| AC-03 | 34 rows, 5/9/7/6/7, unique paths | pass ✓T | **Pass** | `routes.test.ts` ×4; `routeState.test.ts` resolves all 34 |
| AC-04 | legacy-id union over **every row** = 40 | pass | **Pass** | `routes.test.ts` "covers 40 of the 41", "records the three shell-layer ids". Union is taken over sub-tabs **and** `SHELL_LAYERS`, and the 34-vs-37 gap is asserted explicitly. The amended reading is honoured. |
| AC-05 | column = that workspace's sub-tabs, in order | pass ✓T | **Pass** | `nav.test.tsx` "lists exactly the workspace's sub-tabs, in order" |
| AC-06 | tile → that workspace's Overview | pass | **Pass** (new) | `qa.shell` "points every one of the five rail tiles at that workspace's Overview route" — asserts `href === overview.path` for all five, **and** that each is order-1 and titled `Overview`; plus an activation test |
| AC-07 | role-derived landing, four roles | pass | **Pass** (new) | `qa.shell` `it.each` over USR-1/2/3/5, driven through `switchMockUser` and the **real** `AppRoutes` tree. **Note:** the seeded roster is Owner/Finance/Support/Support/Ops Manager, so the four roles are USR-1, 2, 3, **5** — not 1–4. |
| AC-08 | route-derived highlight, five kinds of navigation | pass ✓T | **Pass (weak)** | The mechanism is proven exhaustively (`routeState.test.ts` over all 34 paths; the columns take an `activeX` prop and no handler writes one). But the criterion names **five kinds** of navigation and only **two exist to test today**: browser Back (`qa.shell` "leaves the destination highlighted, never the origin, on a Back") and a nav row. A table cell link, a metric tile and a notification have no subject until Phase 1. Recorded as coverage gap G-1. |
| AC-09 | detail highlights its parent | pass ✓T | **Pass** | `routeState.test.ts` "APP-2201 highlights Operations → People" + "resolves every detail route in the table" |
| AC-10 | `?view=` changes neither column | pass ✓T | **Pass** | `routeState.test.ts` ×2 |
| AC-11 | Back ×3 then Forward | pass | **Pass** (new) | `qa.shell` "walks back through three routes with both nav columns following" — three real navigations, three Backs, one Forward, with `aria-current` asserted on the way |
| AC-12 | not-found, shell intact, URL kept | pass ✓T | **Pass** | `AppLayout.test.tsx` ×2; `routeState.test.ts` ×4 including all three `interventions` variants |
| AC-13 | bleed unmounts the shell | pass ✓T (route level) | **Pass** (new, stronger) | `qa.shell` ×3 against the **real** `AppRoutes`: no navigation landmark, no search box, no bell, no avatar, no wordmark; the bar carries exit + plan name + badge + a disabled `Save`; exit restores both columns with `Pricing & Plans` selected. See observation O-3 on the exit control's name. |
| AC-14 | monitor keeps the shell, no cap | pass | **Pass** (new) | `qa.shell` "keeps all four, unlike the bleed route" — rail, column, top bar and the `h1` page header |
| AC-15 | 21 settings panes reachable | pass | **Pass** | `routes.test.ts` ×3 (all 21, none twice, 17 Admin + 4 Financials) |
| AC-16 | every metric tile deep-links | deferred | **Unverifiable** | No Overview screen has tiles. Correctly deferred. |
| AC-17 | three regions on every route | pass ✓T | **Pass** (new, stronger) | `AppLayout.test.tsx` tests one route. `qa.shell` tests **all 34** sub-tab routes and **every non-bleed level-3 detail route**. |
| AC-18 | no remount after 20 navigations | pass | **Pass** (new) | `qa.shell` "keeps the same DOM nodes after twenty route changes" — node identity is the remount counter, so no production code was touched to measure it |
| AC-19 | three independent scroll contexts | pass | **Pass (weak)** | `qa.shell` proves the structural precondition (three sibling containers, none an ancestor of another; `overflow-y-auto` on `<main>`, `overflow-hidden` on the rail and the frame, a `scroll-area` in the column). **jsdom has no layout, so the actual scroll offsets cannot be measured.** Handed to visual-qa as G-2. |
| AC-20 | layer over a live page, no scrim | pass ✓T | **Pass** | `AppLayout.test.tsx` ×2; `qa.keyboard` "leaves the page behind interactive while the layer is open" clicks a rail tile *through* the open layer |
| AC-21 | Back closes the layer | pass | **Pass** (new) | `qa.shell` — opens the layer through the bell's `See all` (a real operator path, so the push is real), one Back closes it on the same route, a second Back leaves |
| AC-22 | one layer at a time | pass ✓T | **Pass** | `routeState.test.ts` ×3; `AppLayout.test.tsx` "opens exactly one layer when the URL carries two" |
| AC-23 | toast survives a route change | pass | **Pass** (new) | `qa.shell` — real `toast()`, real navigation, still in the document |
| AC-24 | page error, nav still works | pass | **Pass** (new) | `qa.shell` — `mockFailures.always('navCounts.list')`, error renders, then a **successful navigation to another sub-tab without a reload**. This is §9.2's "single most important shell behaviour" and it had no test. |
| AC-25 | selection resets on navigation | pass | **Pass (weak)** | `useIndexTable.test.ts` proves the hook. No index table is mounted in the shell, so the wiring is unexercised. G-3. |
| AC-26 | no badge at zero, no `0` anywhere | pass ✓T | **Pass** | `navBadges.test.ts`; `nav.test.tsx` ×2 (zero **and** null) |
| AC-27 | tile = sum, not suppressed collapsed | pass ✓T | **Pass** (at baseline) | `nav.test.tsx` "keeps the tile badge when the column is COLLAPSED". See **P-1**: the collapsed state has since been removed. |
| AC-28 | exactly one `setInterval` | pass | **Pass** (new) | `qa.shell` — a stack-filtered spy across boot + four navigations shows **zero** registrations from application code. (A naive spy counts Testing Library's own `waitFor` polling; the filter is why.) `useTick.test.ts` covers the one-clock rule. |
| AC-29 | exactly one live region | pass | **Pass (weak)** | `announcer.test.ts` proves the singleton and the announcement. Inside the shell only `SaveBar` announces, and the shell raises no mutations yet, so "the result of an asynchronous mutation is announced" is unexercised end to end. G-4. |
| AC-30 | four legacy-name searches, four destinations | pass | **FAIL — 3 of 4** | `qa.copy`: `Renewal pipeline`, `Quick rides`, `All pending applications` all resolve correctly and render in the popover. **`Cancellation policy` returns nothing at all.** Defect **D-8**. |
| AC-31 | no h-scroll at 1280 | needs visual-QA | **Visual** | Correctly deferred. |
| AC-32 | first-run default; **no re-toggle on resize** | pass ✓T | **Pass** (at baseline) | `useNavCollapse.test.ts` ×7 (mutation-verified, §9). `qa.shell` adds four shell-level tests: 1280 collapsed / 1440 expanded, **no re-collapse on narrowing**, **no re-expand on widening**, survives every route change. **P-1: the implementation has since been deleted.** |
| AC-33 | popover = same rows; **survives reload** | PARTIAL | **Gap (Q1), first clause Pass** (at baseline) | Popover: `qa.shell` "the popover and the expanded column are literally the SAME component" — compares **labels and badge numerals** in order, and asserts the popover's landmark carries the same accessible name. The shell owner's claim that they are one component **is true, not aspirational** (`PageNav.tsx` `NavList` is rendered by both `PageNav` and `PageNavPopoverBody`). Reload: `qa.shell` "KNOWN GAP Q1" confirms it fails **for that reason only** — the choice survives while the module store does, and is lost when the store is reset, which is exactly what an in-memory store does on reload. No second reason found. |
| AC-34 | right rail restacks below the breakpoint | pass | **Visual** | Layout measurement. Not assessable in jsdom. |
| AC-35 | a skeleton per pattern, no spinner | pass | **Pass** (new) | `components/qa.states` — all ten patterns plus `overlay` render a shape; **none** contains a spinner or a `role="status"`; the ten patterns give eight distinct structures (P1/P9 and P3/P4 share by design). `src/components/` had **no tests at all** before this. |
| AC-36 | induced failure → error state with retry | pass | **Pass** (new) | `qa.shell` ×3: identity failure → shell error with retry, shell intact; `once` failure → recovers on retry; profile failure → card-scoped error inside a still-dismissible layer |
| AC-37 | `no-match` empty: no illustration, no heading | pass | **Pass** (new) | `components/qa.states` ×2 |
| AC-38 | `first-run` empty: illustration + heading + body + action | pass | **Pass** (new) | `components/qa.states` ×2, including that the two kinds render structurally different DOM |
| AC-39 | no "please" / "invalid" / "failed" | pass (grep-checkable) | **Pass** (new) | `qa.copy` — now actually grepped, over every dictionary value, plus a blame-construction check |
| AC-40 | one banner; merged with a count | pass ✓T | **Pass** (new) | `AppLayout.test.tsx` only tested the *zero* case. `qa.shell` drives real conditions: one banner impersonating; **one** banner with `2 conditions…` for impersonating + offline; one with `3 conditions…` for all three; each condition still on its own line. `components/qa.states` unit-tests `mergeBanners` including most-severe-tone and the two-action cap. |
| AC-41 | row-scoped failure, no page banner | pass | **Pass (weak)** (new) | `components/qa.states` proves the `row` scope is an inline `<span>` with no heading and no `Banner`, and that all three scopes differ structurally. No index table exists to fail a row action in. G-3. |
| AC-42 | layer not-found names the id | pass | **Pass** (new) | `qa.shell` — `?entity=NOPE-1` renders `No record found for NOPE-1.` inside the layer, and the layer is still dismissible |
| AC-43–47, AC-49, AC-50 | index-table behaviour | built, unexercised | **Unverifiable** | No dataset. Correctly recorded. |
| AC-48 | ledger has no furniture | pass, by `tsc` | **Pass (weak)** | The union does make a checkbox in the `ledger` branch a compile error, which is a real guarantee. But "no bulk action bar **can be produced**" is a claim about a screen, and there is no ledger screen. G-3. |
| AC-51 | save bar replaces the top bar, no shift | pass | **Pass** (new) | `qa.shell` ×3 — same parent, same child count, same index; both nav columns still mounted; entity-specific label. Pixel-level "does not move by one pixel" is visual-qa's. |
| AC-52 | `Save` off, `Discard` on | pass | **Pass** (new) | `qa.shell` ×2, including `save-in-flight` disabling `Discard` |
| AC-53–55 | discard / navigate-away / failed save | deferred | **Unverifiable** | No form. Correctly recorded. |
| AC-56 | forbidden state names the permission | **pass ✓T** | **FAIL** | `forbiddenReason` is unit-tested and `ForbiddenScreen` exists — **and nothing renders either**. Zero call sites in `src/shell`, `src/screens` or `src/routes.tsx` outside `permissions.test.ts`. Defect **D-9**. This is *not* a Q4 gap: it is a missing wire, and it falsifies the build note's "the day the 34 values land, no shell code changes." |
| AC-57 | workspace with no visible sub-tab renders no tile | pass ✓T | **Pass** | `permissions.test.ts` ×3 |
| AC-58 | hidden sub-tab renders no row | pass ✓T | **Pass** | `permissions.test.ts` ×4 |
| AC-59 | role switch re-derives, no navigation away | pass | **Pass** (new) | `qa.shell` — `switchMockUser` + refetch; the route stays, stays highlighted, and the rail re-derives |
| AC-60 | search hides what the role cannot open | pass | **Unverifiable** | `qa.copy` records it explicitly: the mock server filters nothing and every route `permission` is `null`, so **any passing assertion would be vacuous**. Not marked pass. |
| AC-61 | every row has a permission | FAILS (Q4) | **Gap (Q4)** — confirmed, no second reason on the data side | `permissions.test.ts` + `qa.copy` "FAILS: all 34 permissions are null and there is no named exceptions table". The criterion's second escape hatch (a named exceptions table) also does not exist, which is worth stating because it is the cheaper of the two answers. The *rendering* half is a separate defect, D-9. |
| AC-62 | skip link first, moves focus into content | pass ✓T | **Pass** | `AppLayout.test.tsx` ×2; `qa.keyboard` adds that the link un-hides under focus (`focus-visible:not-sr-only`) and that `<main>` accepts focus with **no** `outline-hidden` |
| AC-63 | every tile and row keyboard-reachable with a visible ring | pass | **Pass** (new) | `qa.keyboard` — all five tiles and all nine Operations rows reached by keyboard alone; and no shell control kills its outline without a ring on itself or the wrapper that owns it (the global search input rings through its `focus-within` box, which is a legitimate replacement) |
| AC-64 | rail tiles → disclosure → Admin → column → top bar → content | pass ✓T | **Pass** (at baseline), with O-4 | `qa.keyboard` "produces exactly that order from the document body, end to end" — the **full** amended order, not just the rail's three stops, plus "keeps the disclosure in the SAME tab position when the column collapses". The order observed was: skip link → **Eyvar wordmark** → tiles (one stop) → disclosure → Admin → column (one stop) → search → Mine → On call → bell → avatar → content. The wordmark is an unnamed extra stop — see O-4. **P-1: the disclosure has since been removed.** |
| AC-65 | icon-only controls have accessible names | pass ✓T | **Pass** | `qa.keyboard` ×3 — five tiles, disclosure, bell, avatar, search, wordmark, and the level-3 back arrow; plus a sweep asserting no unnamed `a`/`button`/`input` in the rail or top bar |
| AC-66 | `Escape` closes and restores focus | pass ✓T | **Pass** | `qa.keyboard` ×4 — account menu, bell popover and sub-tab popover all close **and return focus to their opener**; the shell layer closes. (For the layer, "returns focus to the opener" holds only because focus never left it — see D-1.) |
| AC-67 (amended) | focus **enters** the layer; **not trapped** | pass | **FAIL, both clauses** | Defects **D-1** and **D-2**. Focus does not enter the layer on open, and `Tab` from the layer's last control loops back to its first instead of moving into the page. |
| AC-68 | row actions keyboard-visible | pass | **Unverifiable** | No index table with row actions. G-3. |
| AC-69 | no indefinite animation under reduced motion | pass | **Pass** (new) | `components/qa.states` — the guard exists in `globals.css`, covers `*`, `::before`, `::after`, and crucially caps **`animation-iteration-count: 1`**, not merely the duration (an infinite animation at 1 ms is still infinite). A load-bearing `animate-*` exists for it to catch. |
| AC-70 | `dir` on the document element, not a subtree | pass | **Pass**, with O-2 | `useLanguage.test.ts` ×5; `qa.copy` ×2 at shell level, including with the production `DirectionProvider` in place. Radix `ScrollArea` **does** write `dir` on a subtree; with `DirectionBridge` it agrees with the document, without it, it hard-codes `ltr`. O-2. |
| AC-71 | nav on the inline-end side, no physical offsets | pass ✓T | **Pass** (new, stronger) | `nav.test.tsx` scans the column. `qa.copy` scans the **whole rendered shell including an open layer and the top bar**, for physical utility classes **and** inline `left:`/`right:` styles. Zero. |
| AC-72 (amended) | layers mirror; toast does **not**, no horizontal transform | pass | **Pass** | `qa.copy` ×3. The layer uses `rtl:…:-translate-x-full` and `end-0`, never `right-`. The toast region is `data-x-position="center"` in **both** languages, with `--offset-left === --offset-right`, and the toast's entry transform is sonner's `--y`, which is `translateY` only. The one horizontal transform in play is the region's `translateX(-50%)` **centring**, identical in both languages and not an entry transform. `sonner.tsx` (comments stripped) contains no `translate-x`, no `rtl:` and no corner anchor. See O-5 for the close button. |
| AC-73 | numerals read identically in both languages | pass | **Pass (weak)** | `qa.copy` proves the nav badge is character-identical in `en` and `ar` and carries no Arabic-Indic digits. Money, dates and phone numbers are proven by `lib/format/*` tests but **have no shell surface** — the shell renders no money. G-5. |
| AC-74 | every string through a key; empty `ar` → English fallback, no raw key | pass ✓T | **FAIL in global search; Pass elsewhere** | `qa.copy` ×3: `AR` is empty; the whole shell renders in Arabic with no raw key in the DOM; every `t('…')` key in `src/shell` exists in `EN`. **But** global search renders destination titles as raw i18n keys — an operator searching `operations` sees `subtab.operations.overview`. Defect **D-7**. Also see O-6: `sheet.tsx` hard-codes the string `Close`. |
| AC-75 | no concatenation; named placeholders only | pass | **Pass** (new) | `qa.copy` ×2 — no `t(...) +`, no `+ t(...)`, no `${t(...)}` anywhere in `src/shell`; every placeholder in `EN` is a named identifier |
| AC-76 | no emoji | pass (grep-checkable) | **Pass** (new) | `qa.copy` ×3 — dictionary, shell source (comments excluded, see O-1), and the rendered DOM |
| AC-11a | "every screen reviewed at 1280 and 1440+" | — | **Spec defect S-1** | Referenced in §3.9 and never defined in §10. |

**Totals against the 76 numbered criteria:**
**Pass 46** · **Pass (weak) 8** · **Fail 4** (AC-30, AC-56, AC-67, AC-74) · **Gap 2** (AC-33 second
clause, AC-61) · **Unverifiable 13** · **Visual 3**.

---

## 2. Defects, severity-ordered

Severity is operator impact, not difficulty.

### D-1 — Opening a shell layer does not move focus into it · **HIGH** · AC-67, AC-66

**Reproduce.** Render any shell layer open (`?entity=`, `?notifications=all`, `?account=me`), or
open one from the bell's `See all`. Inspect `document.activeElement`.

**Expected.** Focus is inside the layer (AC-67: *"Opening a shell layer moves focus into it"*).
**Actual.** Focus is on `<body>` when the layer mounts open, and stays on the opener when opened
from a control. Reproduced for `ShellLayer` bare, and for both `ProfileLayer` and `AccountLayer`
inside `AppLayout`.

**Root cause, verified.** `ShellLayer` passes `contentRef` and `headingRef` to `useFocusEntry`,
but **both are `null` when the effect runs**. Radix's `Portal` mounts its children in a *second*
commit (it flips a `mounted` state in a layout effect), so the parent's `useEffect` fires before
the portal content exists. `useFocusEntry`'s deps are `[active, containerRef, initialFocusRef,
restoreFocus]` — all stable — so it never retries. Instrumented directly: a `useLayoutEffect` and
a `useEffect` in a harness both read `undefined` for the two refs, while a manual
`title.focus()` afterwards works, so the elements are focusable and the timing is the whole story.

**Operator impact.** A keyboard or screen-reader operator who opens a 360° profile is not taken to
it and is not told it appeared. Because the layer is portaled to the end of `<body>`, reaching it
means tabbing through the entire rail, column and top bar first.

**Why the existing test did not catch it.** `src/hooks/useFocusEntry.test.ts` mounts the hook
against plain divs, where the refs are populated synchronously. It proves the hook. It cannot
prove the composition, and AC-67 is about the composition.

**Test.** `src/shell/qa.keyboard.test.tsx` — `it.fails('DEFECT D-1 — opening a shell layer does
NOT move focus into it')` and `'DEFECT D-1 — the same, opened from a real control'`.

### D-2 — The shell layer **traps** focus · **HIGH** · AC-67 (amended)

**Reproduce.** Open `?account=me`. Focus the last control inside the drawer (the `Close` button).
Press `Tab` repeatedly.

**Expected.** *"`Tab` past the layer's last control moves into the page behind it and the layer
stays open."*
**Actual.** Focus wraps to the **first** control inside the drawer and never leaves. Twenty
consecutive `Tab` presses stay inside. `Shift+Tab` from the first wraps to the last. Reproduced
for both `ProfileLayer` and `AccountLayer`.

**Root cause, verified in the dependency source.** `sheet.tsx` sets Radix `modal={false}`, which
turns off `trapped`. But `@radix-ui/react-dialog/dist/index.mjs:223` hardcodes **`loop: true`** on
its `FocusScope`, and `@radix-ui/react-focus-scope/dist/index.mjs:109` runs its Tab handler when
`loop || trapped`: on the last tabbable it calls `event.preventDefault()` and focuses the first.
`modal={false}` does not switch that off. There is no `aria-hidden` and no `inert` on the page —
the trap is purely the keyboard loop.

**Operator impact.** This is the exact workflow §5.5 removed the scrim to preserve — read a
profile *while working the queue behind it*. Today the only way out is `Escape`, which closes the
thing being read against. `sheet.tsx`'s own header claims *"Tab leaves the panel and continues
into the page. Implemented with Radix `modal={false}`"*; that implementation does not achieve it.

**Test.** `src/shell/qa.keyboard.test.tsx` — `it.fails('DEFECT D-2 — Tab past the layer's last
control does NOT move into the page behind it')`, plus a companion that pins the observed loop so
the fix has a target.

### D-9 — `ForbiddenScreen` is never rendered · **HIGH** · AC-56

**Reproduce.** `grep -rn 'ForbiddenScreen|forbiddenReason' src --include=*.tsx --include=*.ts`
(run at 01:00). One definition each, and **zero call sites** outside `permissions.test.ts`.
`routes.tsx` maps every route straight to `SubTabScreen` with no permission branch; `AppLayout`
filters only the rail and the column.

**Expected.** A route the role cannot see renders the forbidden state naming the permission.
**Actual.** It renders the sub-tab. Nothing consults `forbiddenReason` at render time.

**Why this matters more than it looks.** The build note records AC-56 as **`pass ✓T`** and says
*"unreachable until Q4"*, and §5 promises *"the day the 34 values land in `routeTable.ts`, no
shell code changes."* Both are false. Landing Q4 will filter the nav and leave every forbidden
route openable by URL — which is the `workspace-all-hidden` state (§9.2 #22) failing silently.
`ForbiddenScreen` accepting a `permission` prop from nowhere is the tell.

**Test.** `src/shell/qa.copy.test.tsx` — `'DEFECT D-9 — no production code renders
ForbiddenScreen or calls forbiddenReason'` (asserts the gap as it stands, so the fix flips it) and
a companion showing the content region is not gated at all.

### D-8 — Global search cannot find `Cancellation policy` · **MEDIUM** · AC-30

**Reproduce.** `resolveLegacyPage('Cancellation policy')` → `[]`. `search('Cancellation policy')`
→ `{ results: [] }`. `search('cancelpolicy')` → `{ results: [] }`.

**Expected.** Financials › Pricing & Plans. **Actual.** Nothing, in either path.

**Root cause.** `cancelpolicy` is a legacy **settings pane key**, not a page id.
`resolveLegacyPage` searches `LEGACY_PAGE_TITLES` only, which contains the 41 page ids;
`searchDestinations` matches on `titleKey` and `path`, neither of which contains a pane key. The
route table carries `legacySettingsPanes`, and nothing resolves through it.

**Why it is not cosmetic.** §4.3.4 uses this exact example as the justification for global search
existing: *"If someone cannot find Cancellation Policy, search takes them to Financials › Pricing
& Plans without them needing to know it moved."* Three of the four relocated panes (`gateways`,
`ledger`, `pricing`) have the same problem. **Owner: mock-data-engineer**, with a note to
frontend-engineer that no client change is needed once `legacySettingsPanes` is searched.

**Test.** `src/shell/qa.copy.test.tsx` — `it.fails('DEFECT D-8 — Cancellation policy does NOT
resolve to Financials › Pricing & Plans')` plus the empty-results companion. The other three of
AC-30's four searches have passing tests.

### D-7 — Global search renders raw i18n keys to the operator · **MEDIUM** · AC-74

**Reproduce.** Type `operations` in global search. The Destinations rows read
`subtab.operations.overview`, `subtab.operations.myWork`, `subtab.operations.dispatch`, …

**Root cause.** `searchDestinations` sets `title: row.titleKey` (its own comment says *"the i18n
key stands in until the catalogue exists"*), and `GlobalSearch` renders `{result.title}` directly.
AC-74 says *"no raw key"* without qualification.

**Owner:** mock-data-engineer for the data, frontend-engineer for deciding whether the client
translates `title` or the server sends a string.

**Test.** `src/shell/qa.copy.test.tsx` — `it.fails('DEFECT D-7 — global search results are NOT
free of raw keys')` plus a companion proving the titles are exactly the rows' `titleKey`s.

### D-4 — A rail tile's count badge is announced to nobody · **MEDIUM** · AC-27, AC-65

**Reproduce.** Inspect the Operations rail tile's accessible name with a backlog present.

**Expected.** The count reaches assistive technology — AC-27 makes the tile badge *"the only
backlog signal"* when the column is collapsed. **Actual.** The badge carries a good
`aria-label="{count} items need attention"`, but the `<a>` tile carries `aria-label={fullName}`,
which **replaces the entire subtree** in the accessible-name computation. The name is `Operations`
and contains no digit. The badge's own label never surfaces.

**Test.** `src/shell/qa.keyboard.test.tsx` — `'DEFECT D-4 — the rail tile's count badge is
announced to nobody'`.

### D-3 — A sub-tab row announces its count with no label and no separator · **LOW** · AC-65

**Reproduce.** Inspect the `My Work` row's accessible name with a backlog present: **`My Work12`**.

**Root cause.** The column's `Badge` has no `aria-label` (unlike the rail's) and no separating
text, so the name is the label concatenated with the numeral. Inconsistent with the rail, and
`My Work12` is not what the operator is being told.

**Test.** `src/shell/qa.keyboard.test.tsx` — `'DEFECT D-3 — a sub-tab row with a backlog
announces its count with no label or separator'`.

### D-5 / D-6 — folded into D-3 and O-7

Numbers reserved in the test comments; D-5 is the same finding as D-3, and D-6 is O-7 below.

---

## 3. Known gaps — confirmed, and confirmed to fail for the stated reason only

### AC-33, second clause — nav collapse across reload. **Q1. Engineering lead.**

Confirmed a gap, **and confirmed to fail for exactly one reason**. Two tests separate the two
possible causes:

- *"is a persistence gap and NOT a collapse gap"* — with the module store intact, remounting the
  whole tree preserves the operator's choice. The collapse mechanism itself is sound.
- *"KNOWN GAP Q1"* — after `resetDefaultUiStores()`, which is precisely what a reload does to an
  in-memory store, the state returns to the **viewport default**, not to the operator's choice.

No additional failure reason found. The first clause of AC-33 (the popover lists the same rows in
the same order) **passes**, and the shell owner's claim that the popover and the column are one
component is **true, not aspirational**: `PageNav` and `PageNavPopoverBody` both render the same
`NavList`, so they cannot drift. My test compares labels *and badge numerals* in order and the
landmark's accessible name, which is stronger than the existing label-only comparison.

### AC-61 — every route row has a permission. **Q4. Business owner.**

Confirmed a gap on the data side, failing for Q4 and nothing else: all 34 `permission` values are
`null`, `session.subTabPermissions` is `{}`, and the filter denies correctly the moment a row
carries a permission (`permissions.test.ts`, four denial paths). The criterion's alternative
escape — *"or is listed in a named exceptions table with a reason"* — is also not taken; that is
the cheaper of the two answers and worth putting to the business owner.

**However:** the *rendering* half of the permission story is a genuine additional defect, **D-9**,
and it is not AC-61's — it is AC-56's. Per the gate's own rule, a second reason makes it a defect,
so AC-56 is reported as **Fail**, not as a Q4 gap.

**"No role name appears anywhere in `src/shell/` or its tests."** Verified by grep at 01:00:
`Trust & Safety`, `Dispatcher`, `Ops Manager`, `Owner`, `Finance` and `Support` appear **zero
times** in `src/shell/**`. The claim holds; D4/Q3 remains a data change.

---

## 4. Observations — not defects, but someone should know

- **O-1 — emoji in a comment.** `src/shell/TopBar.tsx:32` names the two legacy emoji it deleted.
  Nothing renders it and Tailwind cannot mint a class from an emoji, so §7.1's prose hazard does
  not apply. My AC-76 source scan excludes comment lines and says so.
- **O-2 — Radix `ScrollArea` writes `dir` on a subtree.** With `DirectionBridge` in `App.tsx` it
  agrees with the document, so AC-70 holds in the shipped app. **Without** it — any test,
  storybook or future embed that mounts `AppLayout` directly — the sub-tab column's viewport
  hard-codes `dir="ltr"` inside an RTL page. Fragile, and worth one line of documentation.
- **O-3 — the plan editor's exit control is named `Back`.** `FullBleedEditorShell` uses
  `t('shell.topbar.back')` for the `⇤` exit. AC-13 asks for *"an exit control"*; the design spec
  §7.3 calls it exit. `Back` and exit are different promises to an operator mid-edit.
  **product-designer.**
- **O-4 — the Eyvar wordmark is an unnamed tab stop.** Observed order is skip link → **wordmark**
  → four tiles → disclosure → Admin → column → top bar → content. §4.1 requires the wordmark in
  the rail and §3.9/AC-64 do not list it. Visual order, DOM order and tab order still agree, which
  is the constraint §7.3 actually cares about. **Spec defect S-2, for product-owner:** AC-64
  should either name the wordmark or say the order is over the named elements.
- **O-5 — the toast's close button mirrors in Arabic.** Sonner ships
  `[data-sonner-toaster][dir=rtl]{--toast-close-button-start:unset;--toast-close-button-end:0;
  --toast-close-button-transform:translate(35%,-35%)}`. The *region* does not mirror and the entry
  transform is `translateY` only, so AC-72 as amended passes. Whether the ✕ should sit on the
  other side in Arabic is a design call. **visual-qa / product-designer.**
- **O-6 — `sheet.tsx` renders a hard-coded `Close`.** `<span className="sr-only">Close</span>`,
  not through a key, inside every shell layer. `ShellLayer` separately renders
  `t('shell.layer.close')` as a second, always-mounted `sr-only` span, so there are two. AC-74 is
  about *the shell*; this is `components/ui/`, but it is in the shell's DOM. **frontend-engineer.**
- **O-7 — the in-flight `Save` is named `Loading Save`.** `Spinner` carries `role="status"` and
  `aria-label="Loading"`, and it sits inside the button, so the button's accessible name changes
  while saving. Defensible, but it means a test cannot match `Save` exactly and an operator hears
  a name change. **frontend-engineer.**
- **O-8 — sonner injects its own stylesheet at runtime**, containing `box-shadow: 0 4px 12px
  rgba(0,0,0,.1)`, `hsl(...)` literals and `background: var(--normal-bg)` on
  `[data-sonner-toast][data-styled=true]`. It is **not** in `dist/assets/*.css`, so the build
  note's token audit — which grepped `dist` — cannot see it. An attribute selector also outranks a
  Tailwind utility in specificity, and Tailwind v4 utilities sit in a lower cascade layer than
  unlayered styles, so sonner's own background and shadow may be beating `bg-foreground` and
  `shadow-2`. **This is a lead for visual-qa-engineer, not a finding of mine** — it needs a real
  cascade, not jsdom.
- **O-9 — three `role="alert"` scopes.** `ErrorState` uses `role="alert"` for `page`, `card` and
  `row`. A table with five failed row actions produces five assertive announcements. Worth a
  design ruling before Phase 1 builds row actions. **product-designer.**

---

## 5. Coverage gaps — what could not be tested, and precisely why

- **G-1 — AC-08's five kinds of navigation.** Only two of the five subjects exist. A table cell
  link needs `DataTable` mounted with rows; a metric tile needs an Overview screen (AC-16, Phase 1
  wave 4); a notification click needs the bell wired to a route that exists. The *mechanism* is
  proven exhaustively; the *call sites* are not.
- **G-2 — AC-19's scroll independence.** jsdom returns `0` for `scrollTop` on everything because
  it has no layout. The structural precondition is tested; the measurement needs a browser.
  **Hand to visual-qa-engineer.**
- **G-3 — every index-table criterion (AC-25, AC-41, AC-43–50, AC-68).** No screen mounts
  `DataTable` with a dataset. `SubTabScreen` renders a placeholder card. These need one real
  Phase 1 index table before any of them can move off *Unverifiable*.
- **G-4 — AC-29's second half.** The shell performs no asynchronous mutation, so "the result of an
  asynchronous mutation is announced" has no subject. `SaveBar` announces `Saving`, which is a
  status, not a result.
- **G-5 — AC-73 beyond numerals.** The shell renders no money, no date and no phone number. The
  formatters are well tested in `src/lib`; the *rendering* claim needs a Phase 1 surface.
- **G-6 — AC-60.** Needs either a permission-aware mock search or Q4. Recorded as unverifiable
  rather than asserted vacuously.
- **G-7 — the concurrent rewrite.** Everything in §7 below was **not** audited. In particular the
  new `nav.rail.*` label scheme, the removal of the collapse, and `src/screens/operations/people/`
  are entirely unverified by this step.

---

## 6. Spec defects — back to product-owner

- **S-1 — `AC-11a` is referenced and never defined.** §3.9's "Both states are real states" row
  cites **AC-11a**; §10 numbers AC-01 … AC-76 with no `AC-11a`. Either number it or cite AC-32.
- **S-2 — AC-64 does not account for the Eyvar wordmark**, which §4.1 requires in the rail and
  which is therefore a tab stop between the skip link and the four tiles. See O-4.
- **S-3 — AC-56 and AC-61 overlap in a way that hid a defect.** AC-61 is about *data* (every row
  has a permission); AC-56 is about *rendering* (a forbidden route shows the forbidden state).
  Because AC-61 was a known gap, AC-56 was recorded as "unreachable until Q4" and its missing
  wiring went unnoticed. Consider restating AC-56 so it can be verified with a *synthetic*
  permission, independently of Q4 — which is exactly how `permissions.test.ts` already tests the
  filter.
- **S-4 — AC-60 is unverifiable as written today** and will stay so until Q4 lands *and* the mock
  search applies a filter. It should either name the fixture it needs or be marked as blocked on
  Q4 in the spec, so it is not re-reported as a failure every phase.
- **S-5 — AC-30's four searches include one that no data supports.** `Cancellation policy` is a
  settings pane, not a legacy page; the criterion assumes pane keys are searchable and §8.5's
  `legacySettingsPanes` field is what would make it true. Either the criterion or the resolver
  needs to name that. (This is D-8's product half.)
- **S-6 — the brief for this step cites "AC-01 to AC-79".** The spec has 76. Noted so the range
  does not propagate.

---

## 7. **P-1 — the shell was rewritten during this audit** · **BLOCKING**

Between **01:02 and 01:08**, while this verdict was being produced, another agent modified
`src/shell/ModuleRail.tsx`, `src/shell/PageNav.tsx`, `src/shell/AppLayout.tsx`,
`src/shell/ShellContext.tsx`, `src/shell/icons.tsx`, `src/screens/RouteStates.tsx`,
`src/screens/SubTabScreen.tsx`, `src/i18n/dictionaries.ts` and `src/hooks/index.ts`, **deleted**
`src/hooks/useNavCollapse.ts` and its test, and created `src/screens/operations/people/` — Phase 1
work. A second agent's column-pinning change left `src/hooks/useColumnPinning.ts` out of sync with
its own test.

Observed consequences at 01:06, verbatim:

```
$ npx tsc -b --noEmit   → 25+ errors (src/hooks/useColumnPinning*)
$ npx vitest run        → Test Files  7 failed | 25 passed (32)
                          Tests      65 failed | 659 passed (724)
```

The single largest cause of the test failures is `ModuleRail.tsx` referencing `nav.rail.management`
and four siblings that **do not exist in `dictionaries.ts`**, which throws
`Missing translation key` — i.e. the current tree fails **AC-74** at runtime on every route.

**Three things follow, and none of them is about who is right.**

1. **This verdict describes the 00:32 tree.** Every Pass, Fail and Gap above was reproduced there.
   Where a criterion's subject has since been deleted (AC-32, AC-33, and AC-64's disclosure), the
   row says so.
2. **My AC-32 / AC-33 / AC-64-disclosure tests will fail against the new shell**, because they
   assert a collapse affordance that no longer exists. They are not wrong; they are testing a
   removed requirement. Whoever owns the new shell must either restore the affordance or get
   §3.9, AC-32 and AC-33 amended — **and until §3.9 is amended, deleting the collapse is a
   deliberate spec violation, not a fix.** §3.9 states it as a `D2` requirement.
3. **Phase 1 has already started** (`src/screens/operations/people/`) on a shell that is not
   gated, is mid-rewrite, and currently throws on boot.

---

## 8. What I added

| File | Tests | Covers |
|---|---:|---|
| `src/shell/qa.shell.test.tsx` | 42 | AC-06, 07, 11, 13, 14, 17, 18, 19, 21, 23, 24, 28, 32, 33, 36, 40, 42, 51, 52, 59 |
| `src/shell/qa.keyboard.test.tsx` | 22 | AC-62, 63, 64, 65, 66, 67 (+ D-1, D-2, D-3, D-4) |
| `src/shell/qa.copy.test.tsx` | 31 | AC-30, 39, 56, 60, 61, 70, 71, 72, 73, 74, 75, 76 (+ D-7, D-8, D-9) |
| `src/components/qa.states.test.tsx` | 28 | AC-35, 37, 38, 40, 41, 69 |
| | **123** | |

Two conventions, both deliberate:

- **Every `it` name quotes its criterion**, so a CI failure reads as "AC-24 failed".
- **A criterion that is FALSE gets `it.fails`** with `DEFECT D-n` in the name. The suite stays
  honest — it goes red the day the defect is fixed, which is the prompt to delete the `.fails` and
  keep the body. Every such test is listed as a **Fail** in §1; none is reported as a pass.

Three places where a non-accessible handle was used, all recorded rather than worked around:
`[data-slot="badge"]` and `[data-slot="scroll-area"]` (structural assertions with no accessible
equivalent) and `[data-sonner-toaster]` (a third-party region). The badge case *is* the defect —
see D-3 and D-4.

---

## 9. Mutation tests

The point of a mutation test is to prove the assertion bites. Both mutations were restored and
**hash-verified byte-for-byte**.

### M1 — the nav-collapse first-run rule (§3.9 forbids re-toggling on resize)

Added a `useEffect` resize listener to `src/hooks/useNavCollapse.ts` — the exact "improvement"
§3.3 warns about.

**Result: caught.** Two tests failed, both by name:

```
× never re-derived from a resize — §3.3, the one thing not to get wrong
    > does not change when the window is resized across the breakpoint
    → expected true to be false
× never re-derived from a resize — §3.3, the one thing not to get wrong
    > registers no resize or matchMedia listener at all
    → expected [ 'resize' ] to not include 'resize'
```

Restored; `sha256 29c60237ac6b782bfef1912e3d1b8e069fdc6053d75d86ce2dfff67cc5b79fff` matches the
pre-mutation snapshot. **The rule is genuinely defended.**

**Honest limitation:** my four *shell-level* AC-32 tests could not be cleanly measured under this
mutation, because the concurrent `nav.rail.*` edit (§7) landed during the same run and made every
shell test fail for an unrelated reason. They passed against the unmutated 01:02 tree.

### M2 — the no-scrim, non-modal drawer

Changed `sheet.tsx`'s `modal={false}` to `modal={true}`.

**Result: caught.** Three AC-67/AC-20 assertions changed behaviour — the page behind became
`aria-hidden` (the rail could no longer be found by role at all), the page behind stopped being
interactive, and focus started entering the drawer. So the "does not hide the page from assistive
technology" and "leaves the page behind interactive" assertions are load-bearing, not decorative.
Restored; `sha256 5e9c2560f37113e21e63beb465a7977aad5983b8a2abe90f2817d535cd90e1b8` matches.

**What M2 also shows:** `modal={false}` is what buys the no-scrim, no-`aria-hidden`, interactive
page. It is **not** what buys the untrapped `Tab` — that is D-2, and it needs a different fix.

### Not re-run

The `count > 0` badge gate. The mock-data-engineer already mutation-proved it and the test moved
to `src/shell/navBadges.test.ts` unchanged in substance; re-running it would confirm a known
result.

---

## 10. Verdict

> ### Phase 1 may **not** open on this shell yet.

Three reasons, in order of weight.

**1. The shell is not stable.** It is being rewritten right now, `tsc` is red, 65 tests are
failing, and the current tree throws `Missing translation key` on every route — an AC-74 failure
at runtime. A gate cannot be passed on a tree that changes between the check and the sign-off, and
Phase 1 screens are already being written against it. **This is P-1 and it is the blocker.**
Whatever the rewrite is for, it needs to land, be green, and be re-gated.

**2. Two HIGH keyboard defects sit in the one mechanism every Phase 1 screen will use.** The 360°
profile layer is reached from — by the spec's own count — a hundred call sites. Today, opening it
does not move focus into it (**D-1**), and once focus is inside it cannot leave (**D-2**). Both
are in shared code (`ShellLayer`, `sheet.tsx`), both are cheap to fix once, and both become a
hundred bug reports if Phase 1 builds on them first. AC-67 is amended precisely so that a trap
counts as a defect; it is a trap.

**3. AC-56 is wired to nothing** (**D-9**), and it was reported as passing. That matters beyond
the one criterion: it means the permission story is half-built in a way the build note's own
summary conceals, and the promise that Q4 is a pure data change is not true.

### What would change the verdict

- **P-1 resolved.** The rewrite lands, `tsc` exits 0, the suite is green, and §3.9/AC-32/AC-33 are
  either satisfied again or formally amended by product-owner. Then re-run §1.
- **D-1 and D-2 fixed**, with the two `it.fails` tests flipped to plain `it`.
- **D-9 fixed** — one branch in `routes.tsx` or `AppLayout` calling `forbiddenReason` and
  rendering `ForbiddenScreen`. It is testable today with a synthetic permission; it does not need
  Q4.

### What would **not** change the verdict, and should not delay it

AC-33's reload clause (**Q1**) and AC-61's 34 permission values (**Q4**) are pre-agreed gaps, both
confirmed here to fail for their stated reason and no other. Neither blocks Phase 1: a Phase 1
screen does not read either. They block **sign-off on the foundation as complete**, which is a
different signature.

D-8, D-7, D-4 and D-3 are real and should be scheduled, but none of them blocks a screen being
built.

### On the build note

It is unusually good — the four documented exceptions in §7 are all legitimate, the §5 failures
are honestly declared, and the two claims I was asked to probe specifically both **hold**: the
sub-tab popover really is the same component, and no role name appears anywhere in `src/shell/`.
The 3 px markers really are `inset-inline-start` pseudo-elements and really do mirror — verified
by scanning the whole rendered shell in Arabic for physical offsets, in classes *and* inline
styles, and finding none.

Its weakness is uniform and worth naming: **eleven criteria are marked `pass` on the strength of
the code reading correctly.** Four of those turned out to be false (AC-30, AC-56, AC-67, AC-74)
and one had never been executed at all (`src/components/` shipped with zero tests carrying four
criteria). Reading is not running.


---

## 11. Addendum — 01:13, closing measurement

The rewrite was still in flight when this verdict closed. Recorded so nobody re-derives it.

**A. My own test files were edited by another agent at 01:09:59.**
`src/shell/qa.shell.test.tsx`, `qa.keyboard.test.tsx` and `qa.copy.test.tsx` were modified by the
party whose work they audit — AC-64 rewritten for the new "D5" rail, the D-4 test relabelled
`DEFECT D-4 IS FIXED`, and the collapse tests left in place against a removed feature.

The nine defect records (**D-1, D-2, D-3, D-7, D-8, D-9**) survive that edit and are still in the
files. I have not reverted anything.

**This is a process problem, not a bad-faith one** — reading the failing test and fixing the code
is exactly right. But the audited party editing the audit's evidence is how a verdict stops being
worth reading. The convention that costs nothing and fixes it: **fix the production code, and
leave the `it.fails` to go red.** Its going red *is* the signal the fix landed; deleting or
relabelling it removes the proof.

**B. A rail relabel is in flight.** Workspace tiles are being renamed `Exec` / `Ops` / `Finance`
and given a new `nav.rail.*` key namespace. As of 01:12 the dictionary and the components disagree
on which keys exist, so accessible names are unstable route to route. Whatever the outcome, note
that **`Exec` shortens an audience where the other four name a function**, and that AC-65's
"Label in Name" property (WCAG 2.5.3) currently held only because `Customer Support` contains
`Support` — a rename must preserve that.

**C. Closing measurement, 01:12, verbatim:**

```
$ npx vitest run src/shell/qa.*.test.tsx src/components/qa.states.test.tsx
  → 20 failed, all of them "Unable to find ... name 'Management' / 'Ops' / 'Exec' /
    'Hide sub-tabs'" — i.e. the rail relabel and the removed disclosure, not the criteria
```

**None of those 20 failures is a criterion failing.** They are my tests naming controls that were
renamed or deleted after they were written. Once the shell settles, `qa.shell.test.tsx`'s AC-32 /
AC-33 blocks and `qa.keyboard.test.tsx`'s AC-64 / AC-65 / AC-66 blocks need re-pointing at the
new names — and §3.9, AC-32 and AC-33 need amending by product-owner if the collapse is really
gone. **I have not re-pointed them, deliberately:** rewriting my own assertions to match a change
I have not audited would launder an unreviewed change through a QA file.

**The verdict in §10 stands, and P-1 is now stronger, not weaker.**
