# Post-remediation visual verdict

**Scope:** whole product, after the remediation programme in `design/19-execution-log.md`.
**Date:** 2026-09-02. **Auditor:** visual-qa-engineer. **Nothing in `src/` was changed.**

**Verdict: DO NOT MERGE until finding V-1 is fixed.** One line of `AccountMenu.tsx`
renders a documentation comment as visible text in the app top bar **on all 35 routes, in
both languages, at both widths**. Everything else in this report is a normal defect list.
Underneath that one line the product is in good shape and does now read as one system —
see [The verdict in full](#the-verdict-in-full).

---

## 0. Gates, re-measured on a quiescent tree

`src/` was last written at **10:14–10:18**; every measurement below was taken between
**10:19 and 11:05**, so all of it describes one tree. (Another session is writing to the
shared scratchpad, not to `src/`.)

| Gate | Result |
|---|---|
| `npx tsc -b --force` | **exit 0** |
| `npx vitest run --maxWorkers=4` | **3074 / 3075**, 120/121 files. The one failure is a wait-budget flake — see below |
| `npx vite build` | **green**, 54 chunks, entry 1,279.78 kB, PWA precache 76 entries |
| `npm run api:check` | **exit 0** — 284 endpoints, no problems |
| `npm run i18n:check` | **exit 0** — 4,694 keys, 4,563 in EN, **0 `defaultValue` at ceiling 0** |

**The one test failure is not a defect.** `src/commands/commands.test.tsx:545`
(`findByRole('dialog')` after a bulk Suspend) timed out in the full run — and I was running
`npx vite build` concurrently, which is my error, not the tree's. Re-run alone:
**29/29 passed, the slowest assertion 1,690 ms**. This is exactly the signature
`docs/ref/verify.md` records ("a test that passes alone and fails in the suite is a wait
budget, not a defect"). Recorded rather than dropped.

`i18n:check` reports 4,694 keys against the 4,665 in `verify.md`'s baseline. The check is
green and self-consistent; the ref file's figure is stale by 29 keys.

---

## 1. Pass 1 — token conformance

### 1a. `dist` hygiene, measured by me, two independent methods

The brief's instruction was to confirm the `dist` numbers independently. I did, with two
different extractors, and I ran positive **and** negative controls so a zero cannot be a
broken regex.

Artefact: `dist/assets/index-CjxBfnQl.css`, **113.6 KB**, **1,320 `{` blocks**,
1,100 selector tokens (method A) / 433 distinct class tokens (method B), **56 `--ev-*`
tokens declared**.

| Class of drift | Method A | Method B | Verdict |
|---|---:|---:|---|
| Tailwind palette classes (22 palettes × 11 stops × 18 utility prefixes) | **0** | **0** | clean |
| Physical-direction class rules | **0** | **0** | clean |
| `margin-left/right`, `padding-left/right` declarations | — | **0** | clean |
| `border-left/right…` declarations | — | **0** | clean |
| `text-align: left \| right` declarations | — | **0** | clean |
| `left: \| right:` offsets | — | **2** (`left:0`, `right:0`) | see note |
| `.animate-ping` / `.animate-bounce` | **0** | **0** | clean |
| `.animate-pulse` / `.animate-spin` | **1** / **1** | see note | licensed, load-bounded |

**Controls, so the zeros mean something.** Present in `dist`: `.ms-auto` ×1,
`.text-start` ×1, `.ps-2` ×2, `.border-s` ×1. Absent: `.mr-auto`, `.ml-auto`,
`.text-left`, `.text-right`, `.pl-2`, `.border-l`, `.rounded-l`, `.bg-blue-500`,
`.bg-rose-50`, `.text-gray-500`, `.animate-ping`, `.animate-bounce`, `.right-rail`,
`.left-0`, `.right-0`, `.float-left` — all **0**.

**So: `dist` has not drifted.** The `source(none)` + two `@source` lines + three
`@source not` exclusions are holding, and the five historical comment-mints
(`.mr-auto`, `.transition-all`, `.animate-ping`, `.bg-rose-50`, `text-[10px]`) are all
gone. I re-ran the whole thing after my own `vite build`, so this is a fresh artefact,
not a stale one.

**Correcting my own method.** My second extractor reported `.animate-pulse` / `.animate-spin`
as 0; a direct grep returns **1 each** —
`.animate-pulse{animation:var(--animate-pulse)}` and `.animate-spin{animation:var(--animate-spin)}`.
Method B's selector regex was too narrow. The direct grep is authoritative and the two
rules are real. They are **not** R18 violations: their consumers are the loading skeleton
(`skeleton.tsx:35`, `ModuleRail.tsx:292`, `PageNav.tsx:256`) and the spinner
(`spinner.tsx:51`) — load-bounded, not ambient — and the global guard at
`prefers-reduced-motion` collapses `animation-duration` to `1ms` on `*, ::before, ::after`
(present in `dist`, 2 blocks).

**The two `left:0` / `right:0` offsets** are inside a vendor rule, not Eyvar code. Not a
finding.

**Five literal hexes in `dist`, all benign and all verified:** `#3182bd`, `#eee`, `#ccc`,
`#808080`, `#fff` appear only inside **attribute selectors**
(`[data-slot=chart] .recharts-curve[stroke="#3182bd"]`) that suppress Recharts' own
defaults. Documented at `src/components/metrics/TrendChart.tsx:23`. Not off-token values.

**`.shimmer` and `@keyframes tw-shimmer` ship unused.** They come from
`node_modules/shadcn/dist/tailwind.css`, which `globals.css` imports — a vendor rule, not a
comment-mint. I checked specifically because four `src` files contain the *word* "shimmer"
in prose and this looks exactly like the mechanism the codebase keeps getting caught by.
It is not. Recorded so it is not re-filed. Dead CSS, no action.

### 1b. Source sweep — wide net, not narrow

645 `.ts`/`.tsx` files. Palettes × stops × prefixes as above.

| Check | Hits | Disposition |
|---|---:|---|
| Palette classes | **0** | clean |
| Raw hex | 40 | **all 40 are inside comments** recording measured ratios (`DataTable.tsx:1619`, `button.tsx:61-62`, `ModuleRail.tsx:35`, `nav.test.tsx:175-181`…). **Zero in a value position.** |
| Physical direction utilities in class strings | 10 | 5 in `.test.tsx` (excluded from the Tailwind scan by `@source not`), 3 are prose (`text-align: right`, `position:sticky;right:0`), 1 is `-space-x-2` — **verified logical**: Tailwind v4 emits `margin-inline-start/end` for it (checked in `dist`). **0 real.** |
| `outline-none` with no ring | 19 grep hits | **0 real** — confirmed at runtime, see §4 |
| Arbitrary values in class strings | 61 | 55 are Tailwind v4 *variant* syntax (`group-data-[state=selected]`, `has-[>svg]`), which is not an arbitrary value. **6 real:** `w-[3.5px]`, `w-[2px]`, `max-h-[85vh]`, `max-h-[420px]`, `transition-[width]`×3, `wide:grid-cols-[15rem_minmax(0,1fr)]`. One of the six is a finding — **V-6**. |

**Pass 1 verdict: clean, one finding (V-6).** This is the pass that usually produces the
most defects and here it produced almost none. The token layer is the strongest part of
the product.

---

## 2. Pass 2 — rule conformance

Measured live across **35 routes** at 1512×900, reading computed styles.

| Rule | Measured | Verdict |
|---|---|---|
| **R7** — five badge tones, no sixth | 5 tones + the nav count chip. `badge.tsx:53-73` declares exactly `success · warning · info · neutral · new` plus `nav-neutral`, which its own comment argues is "the same `neutral` meaning on a different ground", not a sixth content tone | **pass** |
| **R5 / R5a** — no red badge; red in four places | **0 red badges** across 35 routes. Saturated `#b42318` appears in exactly 3 shapes: the 6×6 map marker dot (`/management/zones`), and the breached-row leading-edge marker at 4×20 and 4×52 | **pass** |
| **R1 / R16** — banners are pale tinted cards | 15 routes carry a banner; every one is `data-variant="page"`, radius 8px, fill `#fef0ee` / `#fff4e6` / `#eaf0fe`. No saturated split-strip anywhere | **pass** |
| **R10** — never two page-level banners | **15 routes with 1, 20 with 0, 0 with 2** | **pass** |
| **One primary, in the brand colour** | Every primary measured `#0c6944`. One per route on `/operations/corporate`, `/admin/team`, `/admin/communications`, `/management/reports`. `/admin/data` has **two** — see V-9 | **pass, one observation** |
| **R15** — badge radius 4px | **8px on every badge**, 35 routes | **FAIL — V-5** |
| **R15** — toast radius 8px, avatars 32px circle / 8px rounded square | avatars `rounded-lg`; identity avatar circles present | pass |
| **R9** — toast is one line naming its object, ≤60 chars | `"25 rows exported"`, 16 chars | pass (and see the note under V-10) |
| **R2 / R3-as-amended** — the primary is not special and is not blue | `#0c6944` everywhere, `#2b6ef0` appears once in `dist` (its own declaration) | **pass** |
| **R4** — numeric columns align on one edge, tabular figures | `text-align: end`, `font-variant-numeric: tabular-nums` on every money cell | **pass** — see the doc finding V-D1 |
| **R18** — no ambient loops | 0 `animate-ping`/`bounce` in `dist`; the two survivors are load-bounded | **pass**, and see V-8 |
| **D7** — modal 440/560/800, drawer 480, card radius 8, no card shadow | modal **560×438**, radius 8px, `duration-200`; drawer **480px**, no scrim, `transition 0.2s`; palette **480px**, radius 8px, `duration-100`; card `box-shadow` resolves to `rgba(16,24,40,0) 0 0 0 0` — i.e. deliberately none | **pass** |
| **Four states** | `DataTable` owns loading/empty/error/no-match and every screen forwards `status`; `emptyKind` is a required discriminated union | pass (behaviour is qa-engineer's) |

---

## 3. Pass 3 — reference comparison

Compared the built screens against `docs/06-design-reference/shopify-admin-web/` **only
where D7 still lets Shopify bind**, which is structure — `DECISIONS.md` D7 replaced the
visual reference with Navattic and `03-navattic-language.md` §1 is the live token set.

Structural checks, all passing:

- **Index screens** put row actions in a pinned inline-end lane, the identity column
  first and pinned, filters above the table, count under the H1. Matches the reference
  shape; matches `04-index-screen-redesign.md`.
- **Identity column width is genuinely fixed.** Measured **222 px at 1512 / 200 px at
  1280** on `/operations/corporate`, against the pre-remediation audit's 38 px and 0 px.
  I re-measured because `19-execution-log.md` records an agent nearly filing the old
  number back as a regression during a `git stash` window.
- **Page header carries its status/count**, e.g. `Trips · 137 trips`.
- **Drawer** is flush to the inline-end edge, 480 px, **no scrim**, page behind fully lit
  — which is what `03-navattic-language.md` §498/§753 confirms and what
  `01-home/home-guide-side-panel-in-progress.webp` shows.
- **Metric board** is a 4-up tile grid over chart cards, delta chips carrying sign +
  arrow + word. Reads as one board.
- Eyvar is **not** denser than the reference any more — D-2 was retired outright by D7 and
  rows rose to 40/56/32. Measured single-line pitch **53 px**, media **60 px**. Nothing to
  reconcile.

Two structural divergences worth naming, neither a rule break:

- `/support/tickets` rows run **66 px** and `/admin/communications` **78 px**, both driven
  by wrapped second lines. `19-execution-log.md` already records this as an open design
  question against §9.1's "the row grows to fit; never truncates". No new finding.
- `/operations/dispatch` and `/support/fairness` still use in-page `<Tabs>` where the rest
  of the product uses sub-tabs (`14` G13, logged **open**). Confirmed still true. Not
  re-filed as new.

---

## 4. Pass 4 — accessibility (§7)

**Every ratio below is computed from two hex values read out of `getComputedStyle`, with
alpha composited down the ancestor chain.** My calculator reproduces `globals.css`'s own
recorded figures to three decimals (4.834, 4.354, 4.689, 4.931, 3.099, 6.731), which is
what licenses the rest of the table.

### The full contrast ledger

| What | Foreground | Background | Ratio | Need | |
|---|---|---|---:|---:|---|
| Body ink | `#171a21` | `#ffffff` | **17.411** | 4.5 | ✓ |
| Secondary ink | `#6b7280` | `#ffffff` | **4.834** | 4.5 | ✓ |
| Nav label | `#6b7280` | `#f6f8f9` | **4.538** | 4.5 | ✓ |
| Rail label | `#626974` | `#e9edf1` | **4.707** | 4.5 | ✓ |
| Nav count chip digits | `#171a21` | `#e5e7eb` | **14.063** | 4.5 | ✓ |
| Success badge | `#1d723c` | `#e7f6ec` | **5.332** | 4.5 | ✓ |
| Warning badge | `#7a3e12` | `#fff4e6` | **7.656** | 4.5 | ✓ |
| Info badge | `#1b51c4` | `#eaf0fe` | **6.089** | 4.5 | ✓ |
| Neutral badge | `#6b7280` | `#f6f8f9` | **4.538** | 4.5 | ✓ |
| `new` badge text | `#1b51c4` | `#ffffff` | **6.952** | 4.5 | ✓ |
| `new` badge border | `#0c6944` | `#ffffff` | **6.731** | 3.0 | ✓ |
| Critical banner text | `#b42318` | `#fef0ee` | **5.921** | 4.5 | ✓ |
| Primary button label | `#ffffff` | `#0c6944` | **6.731** | 4.5 | ✓ |
| Focus ring on white | `#0c6944` | `#ffffff` | **6.731** | 3.0 | ✓ |
| Focus ring on the nav | `#0c6944` | `#f6f8f9` | **6.319** | 3.0 | ✓ |
| Identity ink, critical row active | `#171a21` | `#fef0ee` | **15.680** | 4.5 | ✓ |
| Derived critical ink, rest | `#666d7a` | `#fff7f6` | **4.931** | 4.5 | ✓ |
| Derived critical ink, active | `#666d7a` | `#fef0ee` | **4.689** | 4.5 | ✓ |
| R19 checkbox boundary, critical active | `#828b99` | `#fef0ee` | **3.099** | 3.0 | ✓ |
| R5a marker, critical active | `#b42318` | `#fef0ee` | **5.921** | 3.0 | ✓ |
| Muted ink, critical row **rest** | `#6b7280` | `#fff7f6` | **4.578** | 4.5 | ✓ |
| **Muted ink, critical row ACTIVE** | **`#6b7280`** | **`#fef0ee`** | **4.354** | **4.5** | **✗ — V-2** |
| `--ev-text-3`, for reference | `#9ca3b0` | `#ffffff` | **2.536** | 4.5 | ✗ (correctly unused for text — 0 hits) |

**At rest the product is clean.** A sweep of every text-bearing element in view across 9
routes produced **50 distinct foreground/background/size combinations and 0 failures**, the
tightest being 4.538. The one failure only appears in the **active** critical-row state,
which is why a rest-state scan misses it — and it is precisely the trap `globals.css:748-753`
was written to warn about.

### Focus

**Tab sweep, 55 stops on each of 3 routes: 0 without a visible indicator.** The ring is
`ring-2 ring-ring ring-offset-2` composited into `box-shadow` —
`rgb(255,255,255) 0 0 0 2px, rgb(12,105,68) 0 0 0 4px` — i.e. brand green at **6.731:1** on
white with a 2 px white offset.

**I corrected myself here.** My first probe used `element.focus()` and reported the global
search field as ringless. `.focus()` does not reliably set `:focus-visible` in Chromium.
Re-run with real `Tab` presses: the search field's ring is on its **wrapper**
(`focus-within:ring-2 ring-ring ring-offset-2`) and fires correctly; the `<input>` itself
carries `outline-hidden`, which is Tailwind v4's transparent-outline forced-colors shim,
not a bare `outline: none`. **Not a finding.** Recording the correction because a narrower
check produced a false positive, which is `verify.md` failure mode 2.

Keyboard reachability, roving focus and screen-reader semantics are the
**accessibility-auditor's** verdict, not mine. Referred.

---

## 5. Pass 5 — Arabic

Every screen captured a second time with the real language toggle driven through
`AccountMenu` (seeding `eyvar.1.USR-1.ui.language`), so `dir="rtl" lang="ar"` comes from
the app's own state machine, not from a forced attribute. **35 routes × 2 directions ×
2 widths = 76 page loads, 0 console errors, 0 page errors.**

**Correct, verified, and not to be re-reported:**

- **Arabic timestamps are not reversed.** `25 يونيو 09:02` renders as a left-to-right dump
  of `09:02 يونيو 25` and is correct read right to left. Confirmed independently.
- **`vs 27 يونيو – 10 مايو` on the metric board is correct** by the same argument — the
  logical string is `vs 10 May – 27 Jun` and Arabic month names come from
  `ar-SA-u-ca-gregory-nu-latn`. I nearly filed this; it is the same reading error.
- **Money alignment flips and that is correct.** `text-align: end` puts the amount at the
  cell's physical left in Arabic. DESIGN.md §9.2's explicit R4 answer: *"The **column** —
  mirrors: Yes. The **numeral run** — mirrors: No."* Implementation matches
  (`Money.tsx:79-82`, `DataTable.tsx:99`). **`docs/ref/rulings.md` R4 contradicts this**
  — see V-D1.
- Layout, nav, rail, drawer, palette, modal and toolbars all mirror. Chart axes and plot
  areas do **not** mirror. Delta arrows do not mirror. Numeral runs do not reorder.
- `--ev-rail-w` 80→88, `--ev-subnav-w` 224→256, row heights +4 under `:root:lang(ar)` — all
  applied, all measured.
- Drawer mirrors correctly: `x=1032` in LTR, `x=0` in RTL, at 1512.

**Arabic-only findings: V-4** (money hidden under the pinned column at 1280) and
**V-10** (sentence punctuation, a consequence of the deliberate `AR = {}` state).

---

## 6. Findings

Ranked by what an operator hits.

| # | Sev | Rule | Observed | Evidence | Fix |
|---|---|---|---|---|---|
| **V-1** | **Critical** | A3 / §5.7 — no machine vocabulary on screen; also defeats §8 layout | A `/** … */` JSDoc block sits as a **JSX child** with no `{ }` braces, so React renders it as text. It paints into the app top bar's inline-end cluster — measured **376 × 880 px at y = −414** inside `<header>` — over the top-right (LTR) / top-left (RTL) of every page. It covers the **Export CSV** button on every index screen, the **first KPI tile** on `/management/overview`, and the bell + avatar. | `src/shell/AccountMenu.tsx:153–169`. DOM walk over **all 35 routes**: exactly **1** distinct doc-prose string rendered, present on **35/35**. Visible in every screenshot in this run. | Wrap as `{/** … */}` or hoist above the `return`. **The identical comment 45 lines away, `NotificationBell.tsx:109`, is already correctly braced** — copy that. |
| **V-2** | **High** | §7 — 4.5:1 for body text | The row-action **refusal sentence** keeps `text-muted-foreground` on a critical row. On the active ground it measures **`#6b7280` on `#fef0ee` = 4.354:1** (11 px, `text-2xs`). At rest it is 4.578 ✓, so it fails only in the state the operator is in while reading the row — hover, focus-within, or selected. | `src/components/table/rowActions.tsx:173` — `"line-clamp-2 text-2xs font-normal whitespace-normal text-muted-foreground"`. Measured live on `/financials/payouts` (*"Add a bank account before paying this captain"*), hover state, computed styles. | Use `--ev-text-2-row-critical` `#666d7a` → **4.689 ✓**. `DataTable.tsx:1675–1681` already does exactly this for a data cell's second line; `RefusalLine` is in another file with no `isCritical` in scope. **13 screens declare both a critical predicate and a row-action `reason`.** |
| **V-3** | **High** | `columns.ts:63–65`, the width contract | A money value **truncates and loses its currency unit**. `1,284.50 SAR` in the 112 px `Fare` column: content **94 px** into an **87 px** box → renders `1,284.50 …`. Reproduced at **1512 and 1280, `en` and `ar`** — the column is fixed-width, so widening the viewport does not help. Second site: `/support/disputes`, `Refunded in full · 25.00 SAR` clipped at 107 px, **losing 53 px (LTR) / 66 px (RTL)**. | `src/screens/operations/trips/TripsScreen.tsx:469` (`width: 112`). The rule is the codebase's own: *"A truncated id and a truncated amount are the two values a reader cannot tell are truncated."* | Size the money column to its widest formatted value, or drop the in-cell `SAR` and put it in the header (`columns.ts` already contemplates this: *"a table's header carries `(SAR)`"* — `Money.tsx:85`). |
| **V-4** | **High** (Arabic) | §8.5 / §7.5 | **At 1280 in Arabic the pinned actions column paints over the Fare column.** Hit test: `elementFromPoint` at the money cell's inline-end returns the `⋯` **actions button**, not the money. Fare cell `x 55…167`; pinned actions cell `x 33…89`, `background-color: rgb(255,255,255)`, `z-index: 10`. The operator reads **`50 SAR`** where the value is **`24.50 SAR`**. | Measured `/operations/trips` at 1280, `dir=rtl`. Scroller `870` vs content `1040`. In LTR at 1280 the covered column is `Started`, a date, where the loss is obvious. | Root cause is width, not pinning: `:root:lang(ar)` widens the rail 80→88 and the sub-nav 224→256, so the Arabic content region is **40 px narrower** (870 vs 910) and one more column slides under the pin. §8.5 forbids a shadow on a pinned column, so nothing signals the overlap. Needs a width budget that counts the pinned lane, or an inline-end fade that is not `box-shadow`. |
| **V-5** | Medium | **R15** + `03-navattic-language.md` §1 line 97 | **Badge radius is 8 px; the spec says 4 px.** Measured on every badge across 35 routes — `badge.tsx:45` sets `rounded-lg` → `--radius-lg` → `--ev-radius-control` → 8 px. The card is also 8 px, so the badge and the card are now the same radius. | The live token spec is explicit: *"R15's ladder survives lower down: the badge radius is 4 px (`--radius-sm`), the card 8."* | `rounded-sm` on `badgeVariants`. One line. |
| **V-6** | Low | §6.1 — no arbitrary value where a token exists | `RowCriticalMarker` uses **`w-[3.5px]`** while `--ev-marker: 3px` exists and is exposed as `--spacing-marker`. The arbitrary value both bypasses the token **and disagrees with it** (3.5 vs 3). Renders 4 device px. | `src/components/StatusBadge.tsx:82`; `globals.css:1014`, `:1538` | `w-marker`. If 3 px is genuinely too thin, move the token, not the call site. |
| **V-7** | Low (suggestion) | none — labelled a suggestion | The `new` badge tone is now **green-bordered with blue text**: `border-primary` `#0c6944` + `text-info-foreground` `#1b51c4`. Before the 2026-09-02 brand ruling `--primary` was in the ink/blue family and the two agreed. | `src/components/ui/badge.tsx:62`; measured on `/operations/corporate` (`Trial`) | Both are tokens, both pass contrast (6.731 and 6.952 on white). **This is a suggestion, not a defect** — no rule requires a badge's border and text to share a family. Raised because it is a downstream effect of the brand ruling that the sweep did not reach. |
| **V-8** | Low (observation) | R18 | **R18's one sanctioned loop is specified but not built.** `--ev-live-loop: 1800ms`, `--animate-live-pulse` and `@keyframes live-pulse` are declared with **zero consumers**, so Tailwind drops all three — `live-pulse` is **not in `dist`**. `chart.tsx:41` refers to a `LiveDot` component that does not exist in the tree. | `globals.css:1021, :1576, :1884`; `dist` keyframes are `accordion-down, accordion-up, enter, exit, pulse, spin, tw-shimmer` | Nothing animates that shouldn't; the licensed "this feed is live" signal simply has no carrier. Either build it or retire the tokens. |
| **V-9** | Low (observation) | none | `/admin/data` renders **two** `data-variant="default"` primaries, both *"Run all checks"*, at y=161 and y=1770, both inside a card titled *Data integrity*. | measured at 1512 | No rule forbids a card-level primary, so this is **not filed as a violation**. Confirm whether it is one card with a repeated action or two cards with one title. |
| **V-10** | Low | consequence of a documented decision | Under `dir="rtl"`, an English sentence shows its **full stop on the wrong edge** — `.Register a company account for consolidated employee ride billing`, `.A day of the month between 1 and 28`. | `modal_rtl_1280.png`, `/operations/corporate` → *New corporate account* | **Not a bidi bug.** It is the neutral-character rule acting on an LTR sentence inside an RTL paragraph, and it disappears the moment the string is translated. It exists only because `AR = {}` is a deliberate content decision (`dictionaries.ts:6–27`). Recorded so it is not re-filed as a renderer defect. |
| **V-D1** | Doc | — | **`docs/ref/rulings.md` R4 contradicts DESIGN.md §9.2.** The ref file says numeric alignment *"does not flip in Arabic"*; §9.2's explicit R4 answer says the **column** mirrors (`text-align: end`) and only the **numeral run** does not. The implementation follows §9.2 and is right. | `docs/ref/rulings.md` R4 vs `DESIGN.md:6253–6266`; `Money.tsx:79–82` | Correct the ref line in place. A reviewer reading only `rulings.md` will file a false defect against correct code — I nearly did. |

---

## 7. Verified as correct or deliberate — do not re-report

Recorded because each of these looks like a defect and is not. Several are the exact
shapes `docs/ref/verify.md` warns about.

| Claim it would generate | Why it is not a defect |
|---|---|
| "Arabic timestamps are reversed" | Settled. `09:02 يونيو 25` is an LTR dump of a correct RTL line. |
| "The metric board's comparison date range is reversed in Arabic" | Same mechanism. `vs 27 يونيو – 10 مايو` is the RTL rendering of `vs 10 May – 27 Jun`. |
| "Money alignment flips in Arabic, violating R4" | Correct behaviour per §9.2. The ref file is what is wrong (V-D1). |
| "CSV export gives no feedback — no toast" | Deliberate: `DataTable.tsx:1206` — *"§13.6 — announced, never toasted. R9/R10 spend a toast on a mutation of an object, and an export mutates nothing."* It announces via `aria-live`; the download is the visible event. |
| "Critical and High/Warning share one amber badge" | Deliberate, `src/lib/tone.ts:11`, an R7 consequence. Severity is carried by the word. |
| "`--chart-series` and `--chart-comparison` are the same colour" | Deliberate, R7 — series differ by dash, never by hue. |
| "`/operations/trips` has breached rows with no red tint" | Its own header rules the tint out. Tint/marker parity verified across 13 routes. |
| "`.shimmer` was minted from a comment" | Vendor rule from `node_modules/shadcn/dist/tailwind.css`. Unused, harmless. |
| "Recharts hexes are off-token colours in `dist`" | They are attribute **selectors** suppressing library defaults. `TrendChart.tsx:23`. |
| "`-space-x-2` is a physical utility" | Tailwind v4 emits `margin-inline-start/end` for it. Verified in `dist`. |
| "The global search field has no focus ring" | It does — on the wrapper, `focus-within:ring-2`. My first probe used `.focus()`, which does not set `:focus-visible`. |
| "`dark:` variants are dead" | Correct and deliberate; there is no dark theme. |
| "`AR: Dictionary = {}` is a bug" | A content decision, `dictionaries.ts:6–27`. |

---

## 8. Ship checklist

| Item | State |
|---|---|
| Four states present (loading / empty / error / no-match) | ✓ owned by `DataTable`, forwarded by every screen; `emptyKind` is a required union |
| One primary action, in the brand colour | ✓ `#0c6944` on every primary; one per route (observation V-9 on `/admin/data`) |
| Badge tones from the closed five | ✓ 5 + the nav chip; **0 red badges** across 35 routes |
| Badge geometry | **✗ V-5** — 8 px, spec says 4 px |
| Banners are pale tinted cards, never two | ✓ 15 routes × 1, 20 × 0, **0 × 2** |
| Toast names its object in one line | ✓ `"25 rows exported"`, 16 chars |
| Contrast — every ratio computed | ✓ 24 pairs computed from hex; **1 failure, V-2** |
| Visible focus ring on every interactive element | ✓ 0/165 tab stops without one |
| Colour never the only carrier | ✓ breached rows say `overdue 12h 14m`; deltas carry sign + arrow + word; the two dispatch map pins were de-coloured in remediation |
| Logical directions only | ✓ **0** physical rules in `dist`, **0** real in `src` |
| Arabic loads and mirrors | ✓ 38 RTL page loads, 0 errors; **V-4** and **V-10** open |
| No arbitrary value where a token exists | **✗ V-6** (`w-[3.5px]`) |
| `dist` free of palette / physical / ambient-loop drift | ✓ 0 / 0 / 0, two methods, with controls |
| Motion licensed and reduced-motion guarded | ✓ modal 200 ms, popover 100 ms, drawer 200 ms; global 1 ms guard in `dist`. **V-8** open |
| No machine vocabulary or dev text on screen | **✗ V-1** |
| Gates green | ✓ tsc 0 · 3074/3075 (1 flake, passes alone) · build green · api 284 · i18n 0 |

---

## The verdict in full

**One line blocks the merge.** `AccountMenu.tsx:153` is a missing pair of braces, and it
puts a paragraph of internal documentation on top of the interface on every route in the
product, in both languages, at every width. It is a five-second fix and until it lands
nothing else here matters.

Behind it, the answer to the question actually asked — **does the product look like one
system?** — is **yes, and convincingly.** That is not a courtesy. The evidence is that the
mechanical passes, which are the ones that catch incoherence, came back almost empty:
zero palette classes in 645 source files and zero in the shipped stylesheet; zero physical
direction rules anywhere; one arbitrary value that matters out of 61 candidates; one badge
radius wrong out of every geometric property checked; and 50 distinct text-on-ground
combinations across nine routes with **zero** contrast failures at rest. A product that
had merely been patched screen by screen does not measure like that.

The brand change landed cleanly. `#0c6944` is the primary on every primary, the focus
ring on every focusable thing, and the series colour in every chart, reached through
`--primary` and `--ring` rather than by 40 edits — which is why the one thing it did miss
(V-7, the `new` badge's border) is cosmetic and confined to one line.

The three real defects share one shape, and it is worth naming because it predicts where
the next ones will be. **V-2, V-3 and V-4 are all places where a correct rule was written
in one file and the value that had to satisfy it lives in another.** The critical-row ink
token is derived, documented and used correctly by `DataTable` — and `RefusalLine`, one
file over, never got the memo. The width contract names truncated money as the hazard a
reader cannot detect — in the same file as the type that carries the width, and the width
is 112. `:root:lang(ar)` widens the Arabic chrome by 40 px for good reasons, and the
table's width budget does not know it. None of these is drift; every one is a seam.

Two remarks on method, since this report will be read as a baseline.

**The failures that remain are all in a *state*, not at rest.** V-2 needs a hover, V-4
needs a narrow viewport in Arabic, V-3 needs a four-digit fare. A static pass finds none
of them and a rest-state screenshot finds none of them. `verify.md` already says grep
cannot see a screen; this run says a screenshot cannot see a state.

**And I got two things wrong in the course of this audit**, both recorded above rather
than quietly dropped: I read the Arabic money column as clipped when `text-align: end` was
behaving correctly, and I reported the global search field as ringless because `.focus()`
does not set `:focus-visible`. Both were caught by re-measuring with a wider net than the
claim. That is now the fifth and sixth instances in this programme of a check that did not
mean what it looked like it meant, and the count is the argument for the practice.

**Recommendation:** fix **V-1** and merge. Take **V-2**, **V-3** and **V-4** in the same
pass — they are three small edits with a shared cause and they are the ones an operator
hits. **V-5** and **V-6** are one line each. **V-D1** should be corrected in `docs/ref/`
before the next review, because it will manufacture a false defect against correct code.

---

### Evidence

Playwright captures and probe output:
`…/scratchpad/shots/` — 76 full-screen captures (`<screen>_<ltr|rtl>_<1512|1280>.png`),
plus `palette_*`, `modal_*`, `drawer_*`, `critical_hover_*`, `toast2_*`, `admin-data-top`,
`trips_stripped_*` (the same screen with the V-1 text node removed, which proves V-1 is a
paint-over and not a layout distortion — the table geometry is byte-identical either way).

Probes: `sweep.mjs` (token sweep), `distcheck.py` (independent `dist` extractor),
`capture.mjs`, `measure.mjs`, `probe-pin.mjs`, `probe-a11y.mjs`, `probe-focus.mjs`,
`probe-critical.mjs`, `probe-rules.mjs`, `probe-money.mjs`/`money2.mjs`, `prose.mjs`,
`jsxleak.mjs`.
