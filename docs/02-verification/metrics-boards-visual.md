# Visual QA — the eight metric boards (R4-4: breakdowns, captions, notices)

**Verifies:** `build/08-breakdowns-and-notices.md` · `design/07-rulings-r4.md` **R4-4** §4.1/§4.2/§4.3,
**R4-5**, **R4-12** · `specs/05-metrics-content.md` AC-600–697
**Screens:** `/management/{overview,performance,risk,growth,zones}` · `/operations/overview` ·
`/support/overview` · `/admin/overview`
**Role:** visual-qa-engineer. Read-only on `src/`. Nothing committed.

---

## 0. What was actually run

All captures and every number below were **retaken by me**, not read from the builder's pass.

| | |
|---|---|
| Server | `vite --port 5433` off the working tree, started for this audit |
| Captures | 8 boards × {en, ar} × {1280, 1440} = **32 full-page**, plus 20 list close-ups, 2 state captures, 1 bidi probe |
| Console / page errors | **zero**, across all 32 |
| Files | `scratch/shots/vqa-*.png`, `scratch/shots/vqa-report.json`, `vqa-grid.json`, `vqa-c.json` |
| Scripts | `scratch/vqa-r4{,b,c,d,e,f,g,h,i,j}.mjs` |
| **Tree audited** | working tree at **2026-08-27 09:52–09:58**, on `HEAD` = `8a65130`, with four agents live in `src/`. **Absence findings below are claims about that moment** — see §1.1.3 |
| **Re-verification pass** | 2026-08-27 ~10:40, after V-1 and the notice keys landed: `scratch/vqa-r4{k,l}.mjs`, `scratch/shots/vqa-fix-ops-*.png` |
| Built CSS inspected | `npx vite build` to a scratch dir (skips `tsc`, so the other agents' mid-edit files did not block it) |

**One conclusion in the original report was wrong and is corrected in §1.1**: `Operations ›
Overview` declares two notices, not zero. The captures were clean; the tree moved under them.

**Not run, and why.** The **board-level empty state** (`isBoardEmpty` → R8 first-run illustration)
was not captured: no fixture produces an empty board, and I do not edit `src/` to manufacture
one. It is asserted in `board.test.ts`; it is **unverified visually**. The *section*-level empty
(`breakdown.empty`) was captured and is correct.

`tsc` errors in `src/data/fixtures/riders.ts` and `src/screens/queues/**` were treated as
out-of-scope per the brief and are not findings.

---

## 1. The three straight answers

### 1.1 R4-4 §4.3's notice tie-break — **CORRECTED. The tone clause is now verified on real data.**

> **This section replaces an incorrect finding.** The original text concluded that *"the maximum
> number of `BoardNotice`s any board declares is one"* and that all three clauses of the
> selection rule were unexercised. **The first half is wrong about the product as it stands
> today.** `Operations › Overview` declares **two** — `notice.operations.applicationsPastWindow`
> (`warning`, severity 70) and `notice.operations.complianceExpired` (`critical`, severity 95),
> `fixtures/metrics.ts:2508`–`:2539`. Corrected below, re-verified in a browser, and the
> post-mortem is in §1.1.3 because the way this was missed is worth more than the finding.

#### 1.1.1 What is true now, verified by rendering

Re-run after the correction landed, `/operations/overview`, EN and AR, 1280 and 1440:

| Check | Result |
|---|---|
| Board paints | ✅ 8 tiles, 1 ranked list, all four combinations |
| Console / page errors | ✅ none |
| Banners rendered | **exactly 1** in `<main>`, **1** in the document, all four combinations |
| Which one won | **`critical`** — `2 captains have lapsed documents and cannot be dispatched.` |
| Which one was suppressed | the `warning` at severity 70 |
| Suppressed condition still visible | ✅ on its own tile — `2 / Applications past their window / The window is 48 hours.` |
| Banner geometry | `rgb(254,240,238)`, 8 px radius, **no dismiss** ✓ R1/R16/§11.4 |

**So R4-4 §4.3's tone clause is exercised by real fixture data, and I have watched it choose.**
The `critical` beat the `warning` on a board that shows a number for both. That last row matters
independently: §4.3's admission test — *"the suppressed conditions are not lost — each is
independently visible in the tile or breakdown it came from"* — was previously verifiable only
in the abstract, because nothing had ever been suppressed. It has now been checked against a
**real** suppression and it holds.

Evidence: `scratch/shots/vqa-fix-ops-{en,ar}-{1280,1440}.png`, `scratch/vqa-r4k.mjs`.

#### 1.1.2 What is still genuinely unverified — narrower, and the sharp part survives

Two of the three clauses remain unexercised by real data, and neither should be recorded as
verified:

- **The `severity` tie-break.** It breaks ties *within* a tone, and no board declares two
  notices of the same tone. Operations' two differ in tone, so they resolve on the tone clause
  and never reach `severity`. `board.test.ts`'s severity cases stay `SYNTHETIC` and should stay
  labelled as such.
- **Declaration order.** Still unreached, and **it may be unreachable by construction.** This is
  the part of the original section that survives intact and it is the one to act on: declaration
  order can only decide anything when two notices share **both** a tone **and** a `severity`
  value. If `severity` is intended to be unique within a tone — which is what every seeded notice
  does, and what a tie-break field usually means — then the clause is **dead text in the ruling**,
  and the right response is to delete it from R4-4 §4.3 rather than to manufacture a fixture that
  makes it fire. **That is a ruling question, not a fixture question**, and it should go to
  product-designer as one.

The smallest honest fixture for the `severity` clause, if the answer to the above is that it
should stay: a second `critical` on Admin at a lower severity than the erasure clock, corroborated
by a tile Admin already renders. Operations cannot supply it — its two notices are deliberately
declared warning-first, in tile order, precisely so that dropping the tone comparison fails loudly.

#### 1.1.3 Why two consecutive passes concluded "no board declares two" — and what the check should have been

This is the transferable part, and the two passes failed for **different** reasons.

**The builder's pass, and any pass run while the keys were missing.** `fixtures/metrics.ts:2477`–`:2486`
handed six copy keys to `src/screens/metrics/copy.ts` in a comment block naming every string
exactly, and the handoff was never picked up. `createTranslator` throws on a missing key in dev,
so `t('notice.operations.complianceExpired.many')` threw and **the board crashed before painting**
for any operator whose data raised the condition. It surfaced as one failing shell test —
`qa.shell.test.tsx`, USR-5 landing on `/operations/overview` — which is a board-level crash
wearing a routing test's name. **`"no fixture exercises this"` and `"the fixture that exercises
this throws"` look identical from the outside, and only the second is a bug.**

**My pass failed differently, and the distinction changes the lesson.** My captures did not hide
a crash — there was nothing to hide yet. Timestamps, from the tree I audited:

| | |
|---|---|
| My `/operations/overview` capture | **09:54:28** — board painted, 8 tiles, 1 list, **0 banners**, no page error logged |
| `src/data/fixtures/metrics.ts` written | **10:15:07** — 21 minutes later |
| `src/screens/metrics/copy.ts` written (the six keys) | **10:25:09** |

and the committed fixture at `HEAD` contains **zero** occurrences of `notice.operations`, against
six in the working tree — so the two Operations notices are part of an **uncommitted change that
landed after my run**. A thrown translator does not render eight tiles and a ranked list; an empty
`notices` array does, which is exactly what I recorded. **At 09:54 the board genuinely declared no
notices, and my conclusion was accurate for the tree I audited and stale by 10:15.**

So there are two lessons, not one, and the second is mine:

1. **A conclusion of absence has to be checked against a rendering page, not against a search.**
   The coordinator's lesson, and it is correct — it is what would have caught the builder's pass.
2. **A conclusion of absence is scoped to the tree it was taken from, and on a repo with four
   agents live in `src/` that scope has a clock on it.** A finding that says *"nothing does X"* is
   a claim about a moment. Mine did not carry one. **Every future absence finding in a report of
   mine will name the tree it was true of** — the `HEAD` sha plus the capture time — so the next
   reader can tell a wrong conclusion from an expired one. They need different responses: a wrong
   one is corrected, an expired one is re-run.

The check that would have caught it in my pass is cheap and I did not do it: **re-verify absence
findings against the tree at hand-off time, not at capture time.** Fifteen seconds of
`git diff --stat` on the fixtures I was reasoning about would have shown the file moving under me.

### 1.2 AC-605 and the two-factor tile — **the builder's reading is correct.** One gap beside it.

I read AC-605 rather than accepting the summary. `specs/05-metrics-content.md:752`:

> **AC-605** A tile whose comparison is `none` shows an em-dash and one of exactly three reason
> strings. It never shows `0 %` and never shows a blank where a delta would be.

The subject of the criterion is scoped in its first four words — *"A tile whose comparison is
`none`"* — and the second sentence's `It` refers back to that same tile. `admin.overview.operatorsWithoutTwoFactor`
carries `comparison: { kind: 'target', value: 0 }`, not `none`. **AC-605 does not reach it.
The wording supports the split, and the split is right.**

Verified rendered, `/admin/overview`, 1440 EN and 1280/1440 AR:

```
3
Operators without two-factor
—  vs 0 target
```

and in Arabic the same line mirrors correctly to `vs 0 target  —` (evidence:
`scratch/shots/vqa-admin-overview-ar-1280.png`, tile 1 of row 1). The `none` path still renders
its reason string on the other 20 em-dash comparisons I counted. No AC-605 regression.

**The gap, and it is a finding rather than a quibble.** Moving the tile out of AC-605 moved it
out of *every* acceptance criterion. AC-617 governs targets that **do** have a statable
percentage (*"each show a delta against a 95 % target"*); AC-605 governs `none`. **A `target`
comparison with `deltaPercent === null` is governed by no AC at all** — it is covered only by
§3.7's general em-dash rule, which it satisfies. The branch is correct and unasserted. See
**V-8** for the one behaviour inside it that is wrong.

### 1.3 The stretched `<bdi>` — **fixed, and I verified it visually, not by grep.**

I did not re-sweep for `<bdi>` sites. I measured the rendered geometry, which is the only thing
that can confirm this class of defect.

Method: for every `.truncate` label and every isolated run in a breakdown row, on six boards, in
Arabic, at both widths, I took the **text ink box** (a `Range` over the node's contents, not the
element box) and compared it to the element box.

| Under `dir="rtl"` | Expected | Measured |
|---|---|---|
| Row label ink, right edge | flush to the box's right edge (inline-start) | **`inkR === boxR` on 100 % of rows measured** — admin ×7, risk ×10, ops ×5, zones ×4, perf ×5 |
| Tile value ink | flush right, same edge as its own label | flush right on all 7 admin tiles, all 7 management tiles |
| Tile caption ink | flush right | flush right on every caption |
| Under `dir="ltr"` | flush left | `inkL === boxL` on every row |

Visual confirmation: `scratch/shots/vqa-mgmt-overview-ar-1280.png` — `47`, `8,075.70 SAR` and
`11 %` all sit hard right above labels that also sit hard right. `vqa-admin-overview-ar-1280.png`
— `Friday` at the right edge with `6  6` at the left. The inside-out row is gone at 1280 and at
1440, on all six boards that carry a list.

**The fix holds. Confirmed by capture, on both widths, in Arabic.**

It did not, however, fix everything the `<bdi>`/`truncate` pairing does under RTL — see **V-4**,
which is a different defect in the same construction and is the one that survives real Arabic.

---

## 2. Findings

Ranked: structural and legibility first, then contrast and colour, then documentation.

| # | Sev | Rule | Observed | Evidence | Suggested fix | Owner |
|---|---|---|---|---|---|---|
| **V-1** ✅ **CLOSED** | ~~High~~ | D7 §4.9 (the tile grid); R20's principle, extended once already by R4-4 §4.1 | **The tile grid is ragged on all eight boards, both widths, both languages.** A tile carrying a caption is **142 px**; one without is **120 px**. The `<li>` stretches to the grid row but the card does not, so the shorter cards stop 22 px short and their 1 px bottom hairline sits above their neighbours'. Worst measured case: `management/risk` AR 1280, **46 px** of dead space under two of three cards. The code's own intent proves it is a bug: `Card` carries `h-full`, and it works — the **unlinked** card on `management/risk` measures `gapBelow = 0`. The `<Link>` wrapper in `MetricTile` is a bare `block` with no `h-full`, so the percentage height resolves against an auto-height parent and collapses. | `scratch/shots/vqa-mgmt-overview-en-1280.png` (row 1: 142 / 120 / 120), `vqa-ops-overview-en-1440.png` (both rows), `vqa-grid.json` — 16 of 16 board×lang×width combinations ragged | **Fixed** — `h-full` added to the `<Link>` in `MetricTile.tsx`. **Re-measured 2026-08-27 ~10:40: 16 of 16 board×width combinations now uniform**, where 16 of 16 were ragged (`scratch/vqa-r4l.mjs`). | frontend-engineer |
| **V-2** | **High** | **AC-601**; R4-4 §4.2 (which forbids the caption from carrying the reason) | **Eight tiles across three boards render an em-dash value with no visible reason.** AC-601: *"A metric marked `NEW DATA` renders an em-dash where its value would be **and a visible reason**."* `admin.overview.impersonationSessions` (`fixtures/metrics.ts:1533`, `value: null`, comment `NEW DATA`) renders `— / Impersonation sessions / — No comparison period yet`. The only sentence on the tile explains the **delta**, not the **value**, and an operator will read it as explaining the em dash above it. There is no slot that can carry the real reason: §4.2 scopes the caption to a scope limit or a denominator, so the caption cannot be used. Support 4 tiles, Admin 3, Performance 1. | `vqa-support-overview-en-1440.png` (4 of 8 tiles), `vqa-admin-overview-en-1280.png`, `vqa-r4i.mjs` output | Needs a contract decision, not a component fix: a value-level absence reason on `Metric`, rendered where the delta line is when `value === null`. **Do not** widen the caption's scope to absorb it. | product-designer + mock-data-engineer + product-owner |
| **V-3** | **High** | R4-4 §4.1 (the anatomy is a card, and the diagram puts the value beside the label); reference `07-analytics/analytics-dashboard-today-no-data.webp` | **A board with one ranked list renders it at full page width, putting up to 958 px of white between a row's label and its number.** `MetricBoardScreen` uses `grid-cols-1` for a lone breakdown and `grid-cols-2` for two. Measured at 1440: `management/zones`, `Riyadh` label at x = 368, its value `6` at x = 1326. The eye cannot carry a name across that. The barred lists (`ops`, `admin`, `risk`-left) partly bridge the gap with the bar; the **un-barred** lists (`zones`, `performance`, `risk`-right) have nothing in between at all. The product contains its own counter-example: `management/risk` renders two lists side by side at half width and reads correctly — label to value is ~140 px. The reference puts its breakdown (`Online store conversion rate` / `Added to cart` / `0.00 %`) in a **third**-width card. The builder's own file comment argues the opposite conclusion — *"a ranked list gains nothing from a full page width"* — and then takes the full width. | `vqa-mgmt-zones-en-1440.png` vs `vqa-mgmt-risk-en-1440.png` (same page, both shapes, side by side); `docs/06-design-reference/shopify-admin-web/07-analytics/analytics-dashboard-today-no-data.webp` | Cap a lone breakdown at half the page and let the other half be page ground, or right-pack the numeric columns against a narrower measure. This is a design decision — the ruling does not state a width. | product-designer (decide) → frontend-engineer |
| **V-4** | **Med** | §9.2; the same construction §5.4 fixed | **Under `dir="rtl"` an overflowing Latin row label is ellipsised at its HEAD, destroying the identifying part of the name.** The truncating span carries the page's `direction: rtl`; the `<bdi>` inside it carries `ltr`. `text-overflow` puts the ellipsis at the *box's* inline-end, so the LTR run loses its beginning. Proven by browser probe (no source change — the label box was narrowed at runtime): `Abdulaziz Al-Suwailem` rendered **`…uwailem`**, `High churn risk` rendered **`…hurn risk`**. **This is the class of defect that survives the AR dictionary landing**, and it is not B-4: `breakdown.row.entity` is a pass-through key whose whole string is `{name}` (the builder's own **B-8**), so rider, captain and city names are **data**, never translated, and a Latin name in an Arabic console is the shipping case. Latent at 1280/1440 today — no row label overflows with current fixtures — but certain to fire on the first long name or narrower column. The same mechanism **is live today** on the caption slot: `management/overview` AR renders `…er promos, bonuses, refunds and cover.` (measured: ink starts 5.5 px outside the box). That instance *is* B-4 and will vanish; the label instance will not. | `scratch/shots/vqa-trunc-probe-ar.png`, `scratch/vqa-r4d.mjs` output, `vqa-c.json` → `trunc:mgmt-ar` | The truncating box must take the isolated run's direction. **The naive fix — moving `truncate` onto the `<bdi>` — reintroduces §5.4's stretched-`<bdi>` defect**, so it needs care: keep the outer span for layout and give the truncating box `unicode-bidi: plaintext` / `dir="auto"`, or verify any alternative against the §5.4 measurement above. | frontend-engineer |
| **V-5** | **Med** | R4-4 §4.2 (*"One line, ≤60 characters, truncates and never wraps"*) | **§4.2's 60-character caption budget is ~50 % more than the tile can display, and the one caption whose content matters is the one that gets cut.** Measured caption box: **270 px at 3-up (1280), 225 px at 4-up (1440)** → ~46 and ~38 characters at 12 px Inter. `caption.overturnIsNotFailure` (*"Of decided appeals. Higher is better here."*, 42 ch) needs 237 px and **clips at 1440 on Support**, rendering `Of decided appeals. Higher is better …`. It fits at 1280. **A caption that survives the narrow viewport and dies on the wide one** is the inversion, and it happens because an 8-tile board goes 4-across above `--ev-bp-wide`. `05-metrics-content.md` §11.1 tile 8 says *"the tile must say so"* — the tile does not say so. This is the live rendering half of the builder's **B-3**, which I second on both grounds. | `vqa-support-overview-en-1440.png`, `scratch/vqa-r4g.mjs` output (`42ch needs 237px in 225px`) | Two things, and they are separable: (a) lower §4.2's stated budget to ~38 characters, which is what the grid actually holds; (b) resolve B-3 — §4.2 permits only a scope limit or a denominator, and *"Higher is better here."* is a valence, so one of the two documents has to move. | product-designer |
| **V-6** | **Med** | **AC-612**; `MetricTileRow`'s own stated rule | **`Management › Overview` renders seven tiles against AC-612's six**, and the seventh (`Active captains`) is not in AC-612's enumerated list. I found no amendment in `specs/`, `design/` or `DECISIONS.md`. Visual consequence: 7 % 3 = 1 and 7 % 4 ≠ 0, so **four boards** (management overview, growth, zones, admin) render **3 + 3 + 1** — a trailing row of **one**, with two thirds of the last row empty. `MetricTileRow`'s own doc argues against exactly this, for a milder case: *"A trailing row of two under a row of four reads as a layout that ran out."* This is a direct contributor to the owner's "these pages look empty". | `vqa-mgmt-overview-en-1280.png` (lone `On-time pickups`), `vqa-mgmt-overview-en-1440.png` (identical at 1440), `specs/05-metrics-content.md:771` | Either amend AC-612 to seven and accept 3+3+1, or drop/relocate one tile to reach six and get the reference's clean 3+3. It is a content decision, not a layout one. | product-owner + mock-data-engineer |
| **V-7** | **Low** | §9.1 (logical utilities only); the exact hazard §5.6 of the handoff documents | **A physical-direction rule is emitted into the built stylesheet from a comment in this pass's own file.** `MetricTileRow.tsx:5` writes *"the detail right-rail drop"* in prose; Tailwind v4 scans comments as plain text and mints `.right-rail{right:var(--ev-rail-w)}`. It is the **only** physical inset or margin rule in the entire 108 kB stylesheet. The hazard is already documented — `globals.css:84-85` names this exact rule and `build/00-shell.md:510` lists it as a fix item — and `src/lib/breakpoint.ts:5` and `:39` still carry it, so this pass **added a third source** for a defect the wave already knew about, in the same handoff that wrote §5.6 about it. Dead CSS; no rendered pixel is affected. | `npx vite build` → `assets/index-*.css`, `grep -oE '\.right-rail\{[^}]*\}'` | Rewrite as *"the detail right rail drop"* (no hyphen) in `MetricTileRow.tsx:5`. `breakpoint.ts` and `globals.css` are other owners' — ask them. | frontend-engineer (own line) · utilities-engineer (`breakpoint.ts`) |
| **V-8** | **Low** | §7.5; §3.7 | **In the new `target` branch the em dash is `aria-hidden` with nothing replacing it.** Both comparison branches hide the `—`. In the `none` branch that is correct — the reason string carries the meaning. In the `target` branch there is no reason string and no `.sr-only`, so a screen reader hears *"3, Operators without two-factor, vs 0 target"* and is never told the delta is unstatable. Verified: `aria-hidden text: ["—"]  sr-only: []` on all seven admin tiles. | `scratch/vqa-r4i.mjs` output, tile 2 | Add the `.sr-only` sentence this branch is missing (the `none` branch's pattern, worded for a target). | frontend-engineer |
| **V-9** | **Low** | §9.2; `BreakdownList`'s own stated rule | **The sub-label is the one slot in a breakdown row with no `<bdi>`.** Label, primary, secondary and cut-off are all isolated; `subLabelKey` renders bare. It renders correctly today because every sub-label is a pure strong-LTR run, and it will render correctly once translated. It is wrong the moment a sub-label leads with a numeral — which is exactly what **B-6** removed (`{secondary} past their SLA`), so the hazard is proven and was only sidestepped. An inconsistency the next person will read as intentional. | `BreakdownList.tsx`, the `row.subLabelKey` span; `vqa-c.json` → `trunc:ops-ar` | One `<bdi>`, inside the box, matching the other four slots. | frontend-engineer |
| **V-10** | **Low** | **R15** as refined in `07-rulings-r4.md:1321`: *"the **badge radius is 4px** and the **toast radius 8px**"* | **The delta chip renders an 8 px radius.** Measured `border-radius: 8px` on every delta badge on all eight boards. `badge.tsx:13` cites R15 for `rounded-lg` (8 px) — it followed `docs/ref/rulings.md`, which says only *"~8px"* for all three classes. Affects every badge in the product, not just these boards. | `scratch/vqa-r4h.mjs` output; `src/components/ui/badge.tsx:45` | `rounded-sm`. Not this pass's file and `badge.tsx` is currently modified in the working tree — route it, do not edit it. | owner of `src/components/ui/` |
| **V-11** | **Low** | **§7.5**; seconds the builder's **B-2**, with a correction | **The bar measures 1.142 : 1, not 1.153 : 1.** (Correction accepted by the coordinator; conclusion unchanged.) Browser-measured `rgb(234,240,254)` on `rgb(255,255,255)` = **1.142 : 1** (my independent sRGB calculation of the same pair agrees to three decimals). The builder's figure is 0.011 high; the conclusion is unchanged. **Ruling: it clears §7 and it does not do its job.** It clears because it is redundant — every bar sits beside its own number in text (§7.5), it is `aria-hidden`, and I verified the fills are truthful (share-of-total; two rows valued `5` render identical 186.3 px fills). It does not do its job because a ranked bar exists to make the ranking readable *without* reading the digits, and a 21/15/1 RGB delta over a 6 px band does not survive that: adjacent bars are comparable by edge, a **single** bar is a smudge. **The cost, stated plainly: the bar buys 20 px of row height (`h-row-media` 60 vs `h-row` 40) and returns nothing the number beside it did not already give.** If a bar is ever meant to be read alone, it needs a token that does not exist. I did not observe the `--muted` case — the track is deliberately unpainted, so that pair never renders; my calculation gives 1.072 : 1, unverified in a browser. | `vqa-c.json` → `contrast:*`; `scratch/vqa-r4e.mjs`; `vqa-list-ops-en-1440.png` | A new fill token, or drop the bar where it earns nothing (**V-13**). Raised, not substituted. | product-designer |
| **V-12** | **Doc** | — | **`docs/ref/rulings.md` is stale in two places that agents are actively following.** (a) **R3** still reads *"Primary action is `--blue`"*; D7 rewrote it to `--ev-ink` and `globals.css:904` and the DESIGN.md Ship checklist both say near-black. The built `Try again` button is correctly near-black, so the build is right and the ref file is wrong. (b) **R15** says *"rounded rectangles (~8px)"* for all three classes; `07-rulings-r4.md:1321` refines it to badge **4 px**, toast 8 px. `badge.tsx` followed the ref file and shipped 8 px (**V-10**). The ref file is the file every role is told to read instead of DESIGN.md; a stale line in it produces build defects, and this one already has. | `docs/ref/rulings.md` R3, R15 vs `07-rulings-r4.md:1321`, `globals.css:904` | Regenerate or hand-correct those two rows. | product-designer |
| **V-13** | Sugg. | — (not a rule violation) | **`admin.rotaGapsByDay` draws seven identical bars.** All seven days have value 6, so every `barFraction` is 0.143 and every fill is 143.7 px. A ranked list where nothing is ranked, paying 20 px per row for it. Legal under R4-4 §4.1 (one unit, one denominator — it is not a lie), and pointless. | `scratch/vqa-r4e.mjs` output, `/admin/overview` | `bar: false` on that breakdown while the values are flat. Fixture decision. | mock-data-engineer |
| **V-14** | Sugg. | — | **`Market & Zones` contradicts itself on one screen.** The tile reads `31 / Unserved requests`; its own chart, directly below, reads `Every value in this range is zero.` Both are honest against their own windows, and an operator reading top to bottom sees a number and then a denial of it. This is the one thing on Zones that reads as broken rather than as awaiting data. | `vqa-mgmt-zones-en-1440.png` | Either the tile's window or the series' window is wrong for the board, or the pairing needs to be broken. | mock-data-engineer + product-owner |
| **V-15** | Spec | R4-4 §4.1 vs the DESIGN.md cheat sheet | **A two-line breakdown row has 1 px of clearance.** Measured, `management/zones` at 1440: `h-row` = 40 px containing a 20 px label + 2 px gap + 16 px sub-label = 38 px, **`topPad = 1`, `botPad = 1`**. The barred rows are comfortable (60 px, 7 px each side). The DESIGN.md cheat sheet says *"Rows 40px (56px with an avatar or **a second line**)"*; R4-4 §4.1 names `--ev-row-h` for any row without a bar. **The build followed R4-4 verbatim and is not at fault** — R4-4 is later and specific. But two documents disagree about what a second line costs, and the 1 px result is the visible consequence on three lists. Arabic is marginally better (44 px box, 3 px clearance). | `scratch/vqa-r4j.mjs` output; `vqa-list-zones-en-1440.png` | Decide whether R4-4 §4.1's row-height table intends to override the cheat sheet's second-line rule, and annotate whichever loses. | product-designer |

**Seconded from the builder's own list, with evidence:** **B-1** (`Friday … 6  6` on Admin,
`884.00 SAR  63` on Risk — two numeric columns, neither named; confirmed rendered at both
widths) and **B-3** (see V-5, which upgrades it from a spec conflict to a live truncation).
**B-4 honoured** — the empty-`AR` period-at-the-start condition is not re-reported as a bug; it
appears in this document only where I had to separate it from V-4.

---

## 3. Pass results

**Pass 1 — token conformance. CLEAN, with V-7.**
Zero Tailwind palette classes, zero arbitrary values, zero raw hex outside a comment describing
recharts' default, zero physical-direction *utilities* (all `right-`/`left-` hits are English
prose). Every `outline-none` is paired with a `focus-visible:ring` — three sites, all correct.
Built stylesheet: **no arbitrary-value rules, no palette rules, no `content-` rules** — §5.6's
`content-['…']` leak is genuinely gone. One rule minted from prose: `.right-rail` (**V-7**).

**Pass 2 — rule conformance. Mostly clean.**
Four states: content ✓, loading ✓ (P5 tile skeleton, 25 skeleton nodes, not a spinner — AC-35),
error ✓ (page-scope card, shell intact, one primary — AC-24), section-empty ✓, **board-empty not
captured** (§0). One primary button per screen ✓. Delta chips neutral on all 12 badges measured
(`rgb(246,248,249)` / `rgb(107,114,128)`) — **R4-5 / D7 §4.9 held**, no coloured delta anywhere.
Five badge tones, no red badge ✓ R7. Red appears in exactly one place per page — inside the one
critical banner, on Support and Admin only, and nowhere else on any board ✓ **R5a use #2**. Never
two banners ✓ **R10**; no banner outside `<main>` ✓. Banner is a pale tinted card, `rgb(254,240,238)`,
8 px radius, **no dismiss** ✓ R1/R16/§11.4. Notice corroborated by a tile on both boards ✓ §4.3's
admission test. `ratio` renders `7.0×` ✓ R4-12. Cut-off sentence takes its period and names its
dimension ✓ AC-696; headings are fragments with no period ✓ R6/AC-690. Fewer rows than the cut-off
renders all of them with no `and 0 more` ✓ AC-691 (zones 4, ops 5, admin 7). No mutating control
on any row ✓ AC-694. Unlinked rows are plain text and not focus stops ✓ AC-693. Genuine zero
renders `0` not an em dash ✓ AC-606 (`Rider and captain accounts sharing a number`). **Failures:
V-2 (AC-601), V-6 (AC-612), V-15.**

**Pass 3 — reference comparison. One structural divergence: V-3.**
`07-analytics/analytics-dashboard-today-no-data.webp` — every card in a reference row shares its
top **and bottom** edge, including `Sales by channel`, which holds nothing but a centred grey
sentence. Ours did not (**V-1**, since fixed). The reference puts its breakdown rows in a third-width card with
~200 px between label and value; ours puts a lone list at full width with up to 958 px
(**V-3**). Everything else maps: tiles then charts then breakdowns, the funnel/label row's
label-over-sub-label with a right-aligned value, the empty-chart card retaining its title and
sentence, and the no-data string byte-identical to the reference's. Density is denser and that is
sanctioned (D-2 retired; Eyvar matches the reference).

**Pass 4 — accessibility. CLEAN except V-8.**
Contrast **computed in the browser, not eyeballed**, on 8 pairs across 8 board/language
combinations:

| Pair | Measured | Verdict |
|---|---:|---|
| Row label `#171a21` on card white | **17.411 : 1** | AAA |
| Tile value, 17 px / 600 | **17.411 : 1** | AAA |
| Sub-label / secondary / caption / cut-off `#6b7280` on white, 12 px | **4.834 : 1** | AA ✓ |
| Same, Arabic 13 px | **4.834 : 1** | AA ✓ |
| Banner text `#b42318` on `#fef0ee` | **5.921 : 1** | AA ✓ |
| Delta chip `#6b7280` on `#f6f8f9` | **4.539 : 1** | AA ✓ — 0.039 of margin |
| Card border / row divider `#f0f2f4` on white | **1.122 : 1** | decorative, not a control boundary — R19 does not reach it |
| `--chart-fill` on card white | **1.142 : 1** | **V-11** |

**`--ghost` / `--ev-text-3` (2.79 : 1) is used for text nowhere in these components** — confirmed
by grep and by measurement: every secondary string measured is `#6b7280`. Focus: both the tile
link and the breakdown-row link take `0 0 0 2px #fff, 0 0 0 4px #2b6ef0` — a visible offset ring
tracing the card's own 8 px radius, ring colour **4.573 : 1** on white ✓ §7.2. Tab order walks
tile → tile and reaches every linked row; unlinked rows are correctly not stops ✓ §7.3. Colour is
never the sole carrier: the delta caret and the `.sr-only` valence phrase both carry direction ✓
§7.5. **V-8** is the one gap.

**Pass 5 — Arabic. The §5.4 fix holds; V-4 is the defect it did not cover.**
`dir="rtl"` and `lang="ar"` set correctly on all 16 AR captures. Layout mirrors: rail, sub-tab
column, page header, tile grid order, banner icon and action, row label at inline-start, numeric
columns at inline-end, bar growing from the inline-start (`inlineSize`, not `width`). Numerals
and currency do **not** mirror ✓ §9.2 / R4 — `8,075.70 SAR`, `+46.9 %`, `45 %`, `7.0×` all render
LTR inside an RTL page. Arabic row heights rise to 44 / 64 px, the sanctioned §15.1 variant,
uniform within every list. No emoji-fallback glyphs. Findings: **V-4** (real, survives the
dictionary), **V-9** (latent). Everything else Arabic on these boards is **B-4** and is not
re-reported.

**Row rhythm — verified by measurement, and uniform.** The content box is **exactly `h-row` (40)
without a bar and `h-row-media` (60) with one, on every row of every list**, both languages
(44 / 64 in Arabic). The `<li>` boxes measure 40/41 and 60/61 — the 1 px is `divide-y`'s hairline
on every row but the first, not a row growing to fit. **R20's defect is not present here.**

---

## 4. Ship checklist

| Item | | Note |
|---|---|---|
| Approved layout — §2.2, §8.1 | ✅ | Single column, `SingleColumnPage`, one page width on all eight |
| Page header: title, status badge, actions in order — §2.2 | ✅ | Title + data-derived meta line; no status badge and no page action, correct for a read surface (§8 slot 4c) |
| Card separable from its ground: 1 px border, 8 px radius, both white — §6.2 D-11 | ✅ | Correct on every card (`#f0f2f4`, 8 px). It is what made **V-1** visible — the ragged bottom hairline was the thing the eye caught — and the edges are now flush |
| Contextual save bar for unsaved changes — §2.3 | n/a | No mutating control on a board (AC-608, AC-694) — verified, zero found |
| One documented badge tone, no new tones — §3.4, R7 | ⚠ | Tone correct (neutral, R4-5 held). **Radius 8 px against R15's 4 px — V-10**, in another owner's file |
| Index-table rules: alignment, row height, sortable headers — §3.1, R4 | ✅ | Not a table, but R4 applies and holds: values right-aligned, `tabular-nums`, does not flip in Arabic; row height uniform and measured |
| Money formatting and ledger rules — §8.3 | ✅ | `884.00 SAR`, `8,075.70 SAR`; isolated, does not reorder under RTL |
| Sentence case, verb buttons, no exclamation marks — §5.7 | ✅ | `Open Data`, `Open Safety & Incidents`, `Try again`. Sentences take periods, fragments do not (R6) |
| Arabic copy §9.6; no physical-direction CSS — §9.1 | ⚠ | No physical utilities in the source. **One physical rule reaches `dist` from prose — V-7.** Arabic copy itself is `{}` — **B-4**, out of scope |
| Empty state designed — §3.6, R8 | ⚠ | **Section**-level empty verified: `Nothing to rank for this period.`, one grey sentence, **illustration confirmed absent** (`[data-empty-kind="first-run"]` = 0 on every capture), card and heading retained, board still reads as a board around it ✓ AC-692. **Board**-level empty **not visually verified** — no fixture reaches it (§0) |
| Loading / pending designed — §8.1, §7.5 | ✅ | P5 tile skeleton, `aria-busy` + `aria-label`. Skeleton draws 4 tiles where boards carry 6–8 — cosmetic, `LoadingSkeleton` is not this pass's file |
| Error state designed — §4.4, §5.2 | ✅ | Page-scope card, shell and navigation intact, one primary `Try again` ✓ AC-24 |
| Primary action is the only filled button, near-black `--ev-ink` — R3 (rewritten by D7) | ✅ | Boards carry no primary; the error state's `Try again` is near-black and alone. **`docs/ref/rulings.md` R3 still says blue — V-12** |
| Destructive actions confirm — §5.3 | n/a | None on a board |
| Toast for success, banner for page state — §5.1, §5.2, R10 | ✅ | Banner only, standing conditions only, **never two**, no dismiss. Verified on all 16 |
| Visible focus on everything interactive — §7.2 | ✅ | Measured ring on both link types, tracing the card radius |
| Row actions keyboard-reachable, not hover-only — §7.3 | ✅ | Row links reachable; unlinked rows correctly not stops |

---

## 5. Verdict

### 5.1 Do the boards still read as broken, or as legitimately awaiting data?

I formed this independently of the builder's §10 and I reach a different answer on one board.

**Market & Zones — awaiting data, and it reads that way. The builder is right about the em
dashes and wrong about the board.** Three of four cities show `0` in the primary column and an
em dash in the secondary, and the sub-label directly beneath each one says **`Not launched`**.
That is an em dash with its reason standing next to it, and it reads exactly as "no reading
here yet". The list is the best-behaved thing on the board. What actually reads as broken on
Zones is **V-14** — a tile saying `31 / Unserved requests` sitting immediately above its own
chart saying `Every value in this range is zero.` That is one contradiction, it is a fixture
issue, and it is fixable without touching layout.

**Support › Overview — I disagree that the fixtures are right to leave it as it is, and the
disagreement is narrow but it matters.** The builder's claim is that the emptiness is honest and
no layout fixes it. The first half is true; the second half is not the whole story. Four of eight
tiles render a bare em dash with **no reason at all** (**V-2**) — not "awaiting data", not
"no contact log yet", just a dash and a label. The only sentence on those tiles is
`No comparison period yet`, which explains the delta and which an operator will read as
explaining the dash above it. **That is an em dash that reads as broken, and it is the single
biggest reason Support looks like a failed page rather than an empty one.** It is not fixed by
layout and it is not fixed by fixtures either — it needs the contract to be able to say *why* a
value is absent, which is a decision no one has made. Everything else on Support is right: the
banner is corroborated, the chart card keeps its title and its sentence (AC-611), and
`Nothing to rank for this period.` is exactly AC-692's second kind with no illustration.

**Admin › Overview — the transformation the builder claims, and I agree.** Banner, seven tiles
with three captions, a chart, a seven-row barred list. It reads as a board. It carries three of
the eight unexplained em dashes (**V-2**), and they are less damaging here because four tiles
around them carry real numbers.

**Operations › Overview and Risk & Signals — the two best boards in the set.** Risk is the one
to copy: two half-width ranked lists side by side, five named riders with money against them, a
chart, six tiles. Nothing on it reads as empty. **Its list layout is the argument for V-3.**

**Management › Overview, Growth, Performance — sparse because the spec made them sparse**, and
the sparseness is legible rather than broken. But four of the eight boards end in a **lone tile
with two thirds of a row of white beside it** (**V-6**), and that shape is read as "the page ran
out" whatever the tile says. Fixing the tile count would do more for the "these pages look empty"
complaint than any further content would.

**Summary of the answer to the owner's question:** the boards no longer look empty because of
missing UI — the builder closed that, and closed it well. What is left reading as *broken* rather
than as *awaiting data* is **three specific, small, fixable things**, in this order: the
unexplained em dash (**V-2**), the ragged tile bottoms (**V-1**, now fixed), and the lone
trailing tile (**V-6**). None of them is a content problem and none needs more fixtures — which
is why closing V-1 alone already moves every board.

### 5.2 May it merge?

**Status at the 2026-08-27 ~10:40 re-verification: one blocker left, and it is one hyphen.**

| | |
|---|---|
| **V-1** ragged tile grid | ✅ **CLOSED** — `h-full` on the `<Link>`. Re-measured: 16 of 16 board×width combinations uniform |
| **V-7** `.right-rail` minted from prose | ❌ **still open** — `MetricTileRow.tsx:5` is unchanged, and the rule is still the only physical inset in the built stylesheet |
| Notice keys / Operations board | ✅ **CLOSED** — six keys written, board paints, one banner, tone clause verified (§1.1.1) |

**Merge once V-7 is fixed.** It is one hyphen — *"the detail right rail drop"* — in a file this
pass created, for a defect the same handoff wrote a section warning about. `src/lib/breakpoint.ts:5`
and `:39` still carry it too; that is utilities-engineer's file and it should not hold this up.

The work is good. Four of five passes come back clean or near-clean, the token audit is spotless,
the accessibility measurements all pass, the §5.4 `<bdi>` fix is confirmed by capture on every
board in both languages, and V-1 — the one blocker this pass introduced — was diagnosed from a
single measurement and closed cleanly.

**V-2, V-3, V-5, V-6, V-14 are not frontend-engineer's to fix and must not block the merge on
them** — they need product-designer, product-owner and mock-data-engineer decisions, and V-2 in
particular should not be absorbed by widening the caption's scope. **V-4, V-8, V-9** should follow
in the next pass on these files; V-4 is the one to schedule deliberately, because the obvious fix
reintroduces the defect §5.4 just closed.

**What is signed off, and what is not.**

| | |
|---|---|
| R4-4 §4.3 **tone** clause | ✅ **verified on real fixture data** — watched `critical` beat `warning` on Operations, with the suppressed condition still visible on its own tile (§1.1.1) |
| R4-4 §4.3 **`severity`** clause | ❌ **not verified** — no board declares two notices of one tone. `board.test.ts`'s cases stay `SYNTHETIC` |
| R4-4 §4.3 **declaration-order** clause | ❌ **not verified, and possibly unreachable by construction** — see §1.1.2. This is a ruling question before it is a fixture question |
| Board-level empty state (R8 first-run) | ❌ **not visually verified** — no fixture reaches it (§0) |

No downstream document should record the last three as verified.
