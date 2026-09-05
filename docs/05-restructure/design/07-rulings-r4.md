> **Archived round record.** Rulings here stay binding unless a later entry in
> `docs/05-restructure/DECISIONS.md` or `docs/RULINGS.md` supersedes them. Check
> `docs/RULINGS.md` before citing one.

# 07 — Round 4 rulings: twelve questions from four agents, settled in one pass

> **Owner:** product-designer. **Ruling pass, not a screen spec.**
> Consumers: **frontend-engineer** (R4-5, R4-7, R4-8, R4-9 change built code) ·
> **mock-data-engineer** (R4-4, R4-6, R4-10 change types and fixtures) ·
> **utilities-engineer** (R4-8's token, if signed) · **product-owner** (R4-2's rows unblock
> three specs) · **business owner** (§12 — three signatures, and only three).
>
> **Answers, in the order the coordinator ranked them:**
> **R4-1** Q-RB-4 (the series palette) · **R4-2** three §6.4 pattern rows + a fifth page shape
> (Q-RB-2, auth F-1, onboarding F-2) · **R4-3** the shell layer count and where
> re-authentication goes · **R4-4** the `MetricBoard` contract (metrics F-1/F-2/F-3, F-12) ·
> **R4-5** W4-F2 (the delta chip) · **R4-6** W4-F1 (Market & Zones) · **R4-7** R15, the stadium
> and the avatar · **R4-8** the elevation gap · **R4-9** D-11 (focus on hand-off) ·
> **R4-10** severity resolution and the nav `attention` cap · **R4-11** Q-114 (Performance) ·
> **R4-12** the metrics `ratio` unit (W4-F7), cleared in passing.
>
> **Register read in full:** `DECISIONS.md` **D1–D14**. Four of the rulings below are
> amendments to it and each says so.
>
> >
> **Rulings applied:** R5a · R6 · R7 · R8 · R9 · R10 · R13 · R15 · R16 · R17 · R19 ·
> sanctioned deviations **D-9**, **D-11**. **D-2 is retired** (D7) and is cited nowhere.
>
> **Three §6.2 entries need the business owner's signature** and are written out verbatim in
> **§12** so the signature is a yes/no on a concrete thing. **Nothing else in this document
> needs one**, and every other ruling takes effect on merge.

---

## 0. The docket, ranked by what is blocked

| # | Question | From | Ruling in one line | Signature? | Unblocks |
|---|---|---|---|---|---|
| **R4-1** | Q-RB-4 — two measures need two hues | `06-report-builder.md` | **Small multiples ship. No palette is minted.** The measured case against a palette is stronger than the case for it. | **Yes** — §12 **D-12**, to *decline or defer*, not to approve by default | AC-828, AC-835; Layer 2 of the builder, this month |
| **R4-2** | Three surfaces map to no §6.4 row | report builder, auth ×2 | **Three rows minted, one new page shape.** Partial edit + rebuild. | No | AC-801 · every screen in `04-auth` §4.1 · design start on both specs |
| **R4-3** | The shell has three layers, auth wants five | `04-auth-and-onboarding.md` | **Four, not five. Re-authentication is a modal, not a layer** — §7.3.3's own rule forces it. | No | `route.overlay`, `src/shell/`, AC-593–616 |
| **R4-4** | `MetricBoard` cannot express breakdowns, captions or a banner | `05-metrics-content.md` | **All three granted.** The breakdown shape already exists in §3.7; only the contract is missing. | No | AC-690–697, AC-641, AC-674, AC-675, AC-351 |
| **R4-5** | §3.7 requires a coloured delta, D7 §4.9 forbids one | the metric-board build | **D7 wins, and R5a ends the argument** — a red delta is a fifth use of red nobody authorised. | No | Wave 4 sign-off |
| **R4-6** | Market & Zones: table or board? | the metric-board build | **Both, table primary.** The KPI tiles are filters into the table, exactly as legacy has them. | No | Wave 4 sign-off |
| **R4-6b** | *Added this pass.* Zones by failure rate has no surface | coordinator | **It does not die and does not move.** It lives in the zone-health table; what is missing is a fixture and a build slot, and §6.6 names an owner for each. | No | `management-zones`; `05-metrics-content.md` AC-652, F-8 |
| **R4-7** | R15 says never a stadium; one ships | `IndexToolbar`, D12 | **Amend R15 to state its scope.** It never governed the bulk bar. Avatars: already amended — flip the primitive. | **Yes** — D12 reserved this to the owner | D12's open item; `ui/avatar.tsx`; five stale code comments |
| **R4-8** | R-3 has no tier for a 28px raised pill | D12 | **The gap is real. Tier 0.5, scoped to a part inside a control.** Today's build is the interim state, so nothing is blocked. | **Yes** — §12 **D-13** | D12's open measurement |
| **R4-9** | Who owns focus when a popover opens a layer | `00-shell-qa.md` D-11 | **The layer. A traversal is not a dismissal.** | No | AC-67, two of three routes to a shell layer |
| **R4-10** | `critical` and `high` collapse to one badge | wave 2 | **Confirmed, and the resolution moves to the row marker.** `safety` is filed under the wrong §6.4 row and that is the actual defect. | No | Safety & Incidents |
| **R4-10b** | The nav `attention` tie-break rule | `navCounts.ts` | **Confirmed, tightened to two falsifiable clauses. Cap 2 → 3.** | No | `navCounts.test.ts` |
| **R4-11** | Q-114 — Performance survives on one number | `05-metrics-content.md` | **I set the bar and apply it. The merge itself is a D1 amendment and the owner's.** | **Owner, for the merge only** | `05-metrics-content.md` §6 |

**Note on citations.** `06-report-builder.md` has been renumbered **AC-800–899**. Every
reference below uses the 800s.

---

## 1. R4-1 · Q-RB-4 — the series palette. **Small multiples. Do not mint the palette.**

### 1.1 The ruling

> **Everything multi-series renders as small multiples: one panel per series, each with its
> own y-axis, all sharing one window, one grain, one bucket set and one x-extent, all in
> `--chart-series`. No second hue is minted. `--chart-1…5` stays deleted.**
>
> This covers **both** multi-series cases, not just the one the spec raised: a second measure
> **and** any group-by producing more than one series.

I am **not** recommending the owner approve a palette later and I am not deferring the
question to buy time. I looked for the palette, specified it, measured it, and it does not
work. §12's **D-12** is written so the owner can see the working and decline it knowingly —
or overrule me, which is their right.

### 1.2 The evidence, in the order that decided it

**(a) There is no categorical chart in any reference set examined. 174 frames, zero.** One set's
analytics dashboard draws six chart cards and every one is a single blue line with a pale
area fill; the only second mark on any of them is the dotted comparison period. The other's analytics board
draws six sparklines, all one blue. The one chart in either set
that *structurally* needs categorical colour — the Finances earnings donut — resolves to a
**single teal segment** because there is one channel. Live View's `Top locations`
draws ranked horizontal bars, all one hue, distinguished by their **labels**. Neither reference has ever had to solve
this, so neither can be cited for it, and `globals.css:959` deleting the ramp is not an
oversight to correct — it is the reference restated.

**(b) The palette our own §7 floor permits is three hues, and it is three hues that are
separable only by hue.** I specified a four-hue set and measured it, including a Viénot 1999
dichromat simulation. Every candidate must clear 4.5:1 against `--ev-surface` `#ffffff`
(§7.1.1, and a 2px stroke carrying meaning is non-text content at minimum 3:1 — I held the
higher bar because these strokes cross each other, not just the ground). That constraint pins
every hue into one narrow luminance band:

| Candidate | Hex | vs `#ffffff` | vs `--ev-bg2` | deuteranope | protanope |
|---|---|---:|---:|---|---|
| S1 `--ev-blue` | `#2b6ef0` | **4.574** | 4.294 | `#6060f0` | `#6969f0` |
| S2 amber | `#b45309` | **5.022** | 4.714 | `#7a7a00` | `#64640e` |
| S3 teal | `#0f766e` | **5.473** | 5.138 | `#65656f` | `#70706e` |
| S4 violet | `#7c3aed` | **5.699** | 5.349 | `#5454ed` | `#4545ed` |

And then the pairwise numbers, which are the ones that matter, because two lines on one plot
are read against **each other**, not against the ground:

| Pair | normal | deuteranope | protanope |
|---|---:|---:|---:|
| blue × amber | 1.098 | 1.041 | 1.447 |
| blue × teal | 1.197 | 1.215 | 1.153 |
| blue × violet | 1.246 | **1.145** | 1.467 |
| amber × teal | 1.090 | 1.265 | 1.255 |
| amber × violet | 1.135 | 1.192 | 1.013 |
| teal × violet | 1.041 | 1.061 | **1.272** |

**Every pair sits between 1.04 and 1.25:1.** There is no luminance difference to fall back
on — by construction, because clearing 4.5:1 against white forces them all to the same
darkness. So **hue is the sole carrier of series identity**, which is WCAG 1.4.1 (use of
colour) failing, not passing. And blue simulates to `#6060f0` while violet simulates to
`#5454ed` — 1.145:1 apart and the same hue family — so the fourth series is gone for a
deuteranope before it is drawn. Teal simulates to a **grey**, which is what an axis and a
gridline already are.

The escape from 1.4.1 is a second carrier, and **there is none available**: dash is spent on
the period comparison (§3.7, AC-831, and the spec is right that it cannot also carry measure
identity), and marker glyphs on a 13px-dense chart with 90 daily buckets are noise.

**(c) The owner's own headline example fails on scale, not on hue, and a palette does not fix
that.** `drivers vs passengers` is stock/stock, count/count, so §6.2 of the spec lets it onto
one axis. But in a ride-hailing marketplace the two differ by roughly an order of magnitude
by construction — riders vastly outnumber captains — so the drivers line is a flat trace along
the axis and its trend, which is the thing the owner asked to see, is invisible. **Two hues
would make it a *coloured* flat trace.** Two panels make both trends readable. The spec's own
stock-vs-flow section (§6.2) already established the principle that a chart can be
confidently wrong; this is the same failure one step down, on the very example that was named.

**(d) The palette would not have covered the group-by case anyway.** §7.1's legality matrix
permits `line` for a split-by at up to eight series, and §7.4 folds the rest into `Other` —
nine series. Three hues do not cover nine. So even with a signature, a split-by would still
have to render as something other than an overlay, and the product would then have **two**
multi-series renderings to maintain, chosen by a rule nobody can hold in their head.

### 1.3 What the builder's UI does, exactly

The panel order in `06-report-builder.md` §5.3 is unchanged. Control 2 changes:

| Control | Label | Behaviour |
|---|---|---|
| 2 | `Second measure` | Disabled until a first measure is chosen, with the reason `Choose a measure first.` Once enabled, it lists only measures with the same `temporality` and the same `unit` (§6.2, AC-822–824). |
| — | (below control 2, once a second measure is chosen) | One grey sentence, `--text-xs` `--ev-text-2`: **`Two measures are drawn as two panels so their scales stay honest.`** |

**There is no `Compare separately` control.** The spec offered it as an escape hatch from a
one-axis overlay; with no overlay there is nothing to escape from, and a checkbox whose only
setting is its default is a control that teaches the operator a mode exists when it does not.
**AC-826 is amended**: `Compare separately` is deleted as a control and its rendering
requirement — two panels sharing one window, one grain and one x-extent, each with its own
y-axis and its own measure name — becomes the *unconditional* rendering of any multi-series
result. Nothing else in AC-826 changes.

**When the second-measure list comes back empty** (nothing shares the first measure's unit and
temporality) the picker is disabled in place, and the reason is one grey sentence:
**`No measure shares this one's unit and period type.`**

**When a hand-edited URL asks for an overlay** (AC-825), the canvas keeps the previous result
and states, inline in the canvas, not as a banner and not as a toast:
**`This link pairs two measures that cannot share an axis. Choose a second measure from the panel.`**
Two sentences: what happened, what to do next.

### 1.4 The rendering, so a frontend engineer can build it without asking

- **Geometry is borrowed, not invented.** Panels lay out on the **metric-tile grid already in
  the product** — `auto-fill minmax(268px, 1fr)`, four above `--ev-bp-wide`, three below (D7
  §4.9). No new grid, no new breakpoint, no new token.
- Each panel is a **chart card** under §3.7: title (the measure name, or `measure — group` for
  a split), value, delta, chart, legend. §3.7's no-data sentence, frame-retention and legend
  rules apply per panel, unchanged.
- **One hue: `--chart-series`.** The period comparison stays dotted in the same hue *within
  its own panel* (AC-831 unchanged), which now works cleanly, because each panel holds exactly
  one measure and dash means one thing again.
- **Y-axes are independent and each is labelled with its own unit.** They are never forced to
  a shared scale — that would reintroduce (c) with extra steps.
- **X is shared and locked.** Same buckets, same extent, same tick labels, same partial-bucket
  marks. Panels that do not share an x-extent are not small multiples, they are two charts.
- **Order is the order the measures were chosen**, then group rank descending, `Other` last
  (AC-842 unchanged).
- **Arabic:** the panel grid mirrors; each plot area, its axes and its axis labels do **not**
  (§9.2, AC-897). The reading order of panels is inline-start-first in both languages, which
  is what mirroring the grid gives for free.

### 1.5 The consequences for `06-report-builder.md`, stated so they are not discovered

**§7.1's legality matrix changes in two rows.** A `line` never overlays.

| Query shape | line | bar | pie | table |
|---|---|---|---|---|
| 2 measures · same unit + temporality · grain ≠ none | **default, as two panels** | legal (grouped, one hue, labelled) | illegal | legal |
| 1 measure · split by a dimension · grain ≠ none | **legal as panels, ≤ 9 including `Other`** | legal | illegal | legal |

Every other row is unchanged. AC-828 and AC-835 lose their `(gated on F-P2)` qualifier and
become testable today.

**§6.5's finding F-P2 is closed.** Its three-row cost table was right and its recommendation —
*"small multiples now, single-axis overlay when the palette exists"* — is upheld on the first
half and **rejected on the second**: there is no "when". If the owner signs §12 **D-12**
against my recommendation, the overlay becomes legal for **two series only** and the split-by
case still renders as panels.

**A grouped bar is not affected.** Bars at `grain: 'none'` are separated by **position**, which
is a second carrier colour does not have to supply, so a grouped or stacked bar may carry more
than one series in one hue with per-group axis labels. That is why `bar` stays legal in both
changed rows.

### 1.6 What would change my mind

One thing, and it is specific: **evidence that Eyvar operators need to read two series against
each other at a shared origin**, rather than read two trends. If someone brings a real
question of the form *"did A cross B"* — not *"how are A and B each moving"* — panels genuinely
cannot answer it and the palette's cost becomes worth paying for that one chart type. Nobody
has brought one yet, and the owner's own example is not one.

---

## 2. R4-2 · Three §6.4 rows, and one new page shape

`docs/ref/patterns.md`: *"A page with no row here may not be designed until it gets one."*
Three specs are stopped at that sentence. Ruling on them together, because the set has to stay
coherent — the question in all three is *what governs this surface*, and answering it three
times separately is how a mapping table grows a row for every screen.

### 2.1 Auth (F-1) — **mint the row, and mint the fifth page shape**

**The row:**

| Eyvar page(s) | Pattern | Section |
|---|---|---|
| `signin`, `signin-verify`, `signin-enroll`, `forgot-password`, `reset-password`, `set-password` | **Auth card** — a centred card on a bare ground, outside the frame | §2.5 D (structure only — **D14**), §4.2–4.4, §5.2 |

**The fifth page shape.** The four shapes in `patterns.md` are all *inside* the app frame —
even the full-bleed editor, which drops the nav but substitutes its own bar and is a working
surface with an exit, a status badge and a `Save` (§2.5's own MUSTs). Auth has **no bar at
all**, no exit, no record, and no authenticated session to exit to. It is not shape 3 narrowed;
it is a fifth thing.

| Shape | When | Width |
|---|---|---|
| **Centred card, no frame** | Unauthenticated surfaces only. No rail, no sub-tab column, no top bar. | Card **400px**, fixed; vertically and horizontally centred in the viewport |

**400px, and why that number.** D-9 leaves the product with one page width and moves measure
down a level, naming *"the 640px form column and the 384px prose block"*. A one-to-two-field
card at 640 is a form pretending to be a page; at 384 the six-box code input has no room. 400
is on the 4px grid, sits between the two measures the product already has, and fits the
verification input with air: 400 − 2×32 padding = 336 content; six 40px boxes with 8px gaps =
280. At the 1280px floor (D2) a 400px card is 31% of the viewport, which reads as a card
rather than as a panel.

**The §2.5 D split under D14 — checked, and I change three lines.** The spec's §3.4 table is
right and I am not redoing it. Three corrections:

| §2.5 D clause | The spec said | My ruling |
|---|---|---|
| `~475px wide, ~16px radius, ~34px padding` | *"Not kept as numbers"* | **Numbers are required or nobody can build it.** Width **400**, radius **`--ev-radius-card` (8px)**, padding **32px**. All on the grid; 34 is not, and D15 records an off-grid literal as a defect regardless of which deviation is in force. |
| `full-bleed dark gradient (deep purple → teal)` | *"Not kept. The ground is the designer's."* | **The ground is `--ev-bg2` `#f6f8f9`**, flat. It is an existing token, it is the one subdued fill D-11 leaves alive, and it gives the card a ground to sit on. **No gradient, no image, no second skin.** |
| — (the spec did not reach it) | — | **The card is `--ev-surface` white, `--ev-hairline` border, `--ev-radius-card`, and `--ev-shadow-2`.** Tier 2, not tier 1, and this is **not a new decision**: `00-decisions-r3.md` §1.2 already pre-assigned the auth card tier 2 and gave the reason (*"a card floating on a backdrop, with no canvas relationship to anchor a border"*). Under D7 it is also forced — tier 1 paints nothing (`--ev-shadow-1` is fully transparent) and `--ev-hairline` `#f0f2f4` on `#f6f8f9` is a step nobody can see, so border and tier 1 together would render an invisible card. |

Everything else in the spec's split stands: content order kept, field order kept minus the
sign-up switch, full-width primary kept, legal-links slot kept, social providers dropped
(Eyvar has one identity source).

**One clause of §2.5's Rules block is void for Eyvar and must be recorded as such**, because it
is a MUST that names a thing we do not have: *"Auth cards MUST keep the primary button
full-width and MUST place provider buttons in a single equal-width row beneath an `or`
divider."* The first half is kept. **The second half has no referent** — no providers exist —
and a MUST with no referent is how a future engineer justifies adding one. Struck, with the
reason, in the same partial edit.

### 2.2 The guided checklist (F-2) — **mint the row. No new shape.**

| Eyvar page(s) | Pattern | Section |
|---|---|---|
| `onboarding` | **Guided checklist** — progress line, one-open-at-a-time task accordion, manual completion, dismiss-without-resurrection | §5.6, rendered in a shell layer (§5.5, no scrim) |

**No page shape is added**, because a shell layer is not a page — it has no route of its own,
it does not replace the content region, and `patterns.md`'s shape table is about page layout.

§5.6 is already specified to a level a screen can be built from — the `n / m completed` line
and bar, the group accordion with one group open, description + `Learn more` + one primary per
expanded task, `Mark as done`, `Dismiss guide` that does not resurrect, the six MUSTs. **D7
leaves all of it standing**: those are interaction rules, not visual ones, and D7 scoped itself
to the visual content of §1–§5. So this row does not need a design pass to become useful; it
needs the row so the spec can cite something.

**The spec's §8.2 position is upheld in full** — not a tour (§5.6's last MUST), not an empty
state (R8's first-run means *nothing has ever existed here*, and wave 2's E1 `queue clear`
prohibition is exactly right: a checklist at the moment an operator clears their queue is the
opposite signal). The layer, and the reason given — one surface, one owner, and the landing
page differs by role — is correct.

### 2.3 The report builder (Q-RB-2 / F-P1) — **mint the row. Do not stretch §3.7 customise mode.**

| Eyvar page(s) | Pattern | Section |
|---|---|---|
| `management-reports` (the builder) | **Query builder** — a persistent composition panel at the inline-start beside a result canvas that re-renders on an explicit `Run` | §3.7 (the canvas), §4.1 (the panel), §2.2 (the shape), §7.3 (the order) |

**Why not §3.7's customise mode**, which the spec recommends and which is genuinely close:

| | Customise mode | The builder |
|---|---|---|
| What it is | a **mode** on an existing board — enter, edit, save, exit | a **destination**: a sub-tab you go to and come back from |
| The side panel | a **library you pick from**, grouped by category | a **form you fill in**, nine controls with dependency — six disabled until a measure is chosen (AC-807) |
| What it changes | **layout** — which tiles show, in what order | **the question** — what is measured, over what, at what grain |
| Its commit | **`Save`**, in a contextual save bar; §3.7 MUSTs that layout changes never auto-save | **`Run`**, and `Save` is a *later, separate* thing that needs Q1 (AC-856) |
| Its document | the board's stored layout | **the URL** (AC-853–855) |

Filing the builder under §3.7 would import §3.7's MUST — *"Dashboard customisation MUST be a
distinct mode with a contextual save bar"* — onto a surface whose commit is `Run`. That is not
a stretch, it is a wrong rule made binding. **The geometry is what looked similar; the
semantics are opposite.**

**Why not full-bleed (AC-13's plan-editor sibling), which the coordinator flagged.** The spec's
§5.1 argument is right and I am ratifying it, with one addition. §2.5's rules for full-bleed
are written for **editors**: they MUST substitute their own bar, MUST carry an exit affordance,
MUST name the thing being edited, MUST show a status badge, MUST grey `Save` when there is
nothing to save. The builder has no record to name, no status, and no `Save` in its core layer
at all — five MUSTs with no referent. `patterns.md`'s own trap list already warns that the
monitoring shell was wrongly filed there for exactly this reason. **A second wrong filing under
the same row is the pattern the trap list exists to stop.**

**The page shape is shape 2 with the rail leading.** Not a sixth shape. Shape 2 is a fluid main
column beside a fixed-width column; the builder is that with the fixed column at the
**inline-start**. Shape 2's *"centred, capped"* width note is already void under **D-9** (one
page width, full width of the content region), so the only remaining difference is which side
the fixed column sits on. `patterns.md`'s shape table gains a `leading` note on shape 2 rather
than a new row.

Panel width: **`--ev-detail-rail-w`**, the token shape 2 already uses. At the 1280 floor
(D5: 976px of content) that leaves the canvas the majority of the region, and it drops nothing
at `--ev-bp-wide` — **the builder's panel is never dropped**, because a canvas with no panel is
a chart you cannot change. D2's rail-drop rule is a detail-page rule; this page opts out and
that is recorded here rather than discovered at 1280.

**AC-801 is unblocked** and reads against this row.

### 2.4 What this costs, and why it is worth paying three times at once

`_partials/06-eyvar-mapping.md` §6.4 gains three rows and one struck clause; `patterns.md`
gains a fifth shape and a note on shape 2; `python docs/06-design-reference/build-design.py`
regenerates `DESIGN.md`. **One edit, one rebuild, three specs unblocked.** This is the `fraud`
row's precedent exactly — a mapping change with its reasoning recorded in a `>` block beneath
the table — and doing all three in one edit is what keeps the table from accreting a row per
screen. Full text in §14.

---

## 3. R4-3 · The shell has **four** layers, not five. Re-authentication is a modal.

### 3.1 The ruling

> **`route.overlay` gains exactly one value: `onboarding`.** Three layers become four —
> `entity` · `notifications` · `account` · `onboarding`.
>
> **`reauth` is not a layer.** Re-authentication renders the auth card's content in a
> **modal** at 440px with `alert-dialog` semantics: no `Escape`, no outside-click, no close
> control, `--ev-shadow-3` over the scrim.
>
> **Exactly one shell layer is open at a time.** Opening a second closes the first. The stack
> does not grow, and this is the clause that keeps the fourth layer from being expensive.

### 3.2 Why the modal, and it is not a preference

§7.3.3 states the product's focus law in one sentence: **"The scrim decides the trap. If a
surface dims the page, it owns the keyboard. If it does not, it does not."** And §5.5 requires
a shell layer to omit the scrim and keep the page behind interactive.

Run re-authentication through that:

- If it is a **layer**, it does not trap. `Tab` leaves the sign-in form and walks into a console
  where — per the spec's own §7.3 rule 2 — *every mutating control is disabled in place*. The
  operator can tab away from the only control on screen that does anything, into a field of
  disabled controls, with no way to know they have left. That is a §7 failure, and it is the
  precise failure §7.3.3 was written to prevent.
- If it **traps**, it must have a scrim. A scrimmed, non-dismissible, single-task surface is a
  **modal** by every row of §5.0's decision table and `surfaces.md`'s condensation of it.

The spec's own reason for wanting a layer — *"the workspace behind stays visible and
readable"* — is met better by a modal than by a layer, because **that is what a scrim is**: a
translucent dim, not a curtain. The Finance lead sees their half-finished payout adjustment
behind the card, dimmed, exactly as intact as it was. The scrim is the reassurance, not the
obstacle.

And the load-bearing half of §7.3 is untouched: the screen is not unmounted, the form is not
cleared, the `SaveBar` is still up, the route does not change. **The guarantee is about the
mount tree, not about which overlay renders over it.** The engineer's two-mount-point cost
(§7.3's boxed note) is unchanged by this ruling — I am not resolving it by dropping the
guarantee, and nobody else may either.

**One consequence, stated so it is not discovered.** `00-decisions-r3.md` §1.2 records that
tier 3 never composites over tier 2 because §5.0 forbids a modal nested in a drawer. A session
can expire with a drawer open. **Resolution: entering `session-expired` closes every open shell
layer first.** A layer is a transient consultation surface; the session ending ends the
consultation. **Form state is preserved; overlay state is not**, and those are different
things.

### 3.3 Why the union may grow but the stack may not

*"Add a layer level"* is only expensive if the layers stack. They do not, and they must not:

- **The mechanism is already N-ary.** `useFocusEntry`, no-scrim, `Escape`-closes, the URL
  param, the return-focus contract — one implementation serving a union. A fourth value is a
  data change.
- **Stacking is what costs.** Two open layers means a focus order between them, a z-order, a
  double `Escape`, and a question — *which one does `Escape` close?* — with no good answer.
  Radix will not decide it and neither will a review.
- **Nothing needs it.** Onboarding is dismissible and the operator opens the profile *from* a
  step; the step's job is to send them there. Closing the checklist to open the profile is
  correct behaviour, not a limitation: **the checklist told them to go somewhere, and they
  went.** The entry point in the account menu carries `n / m` so returning is one click.

So the rule to write down, once, in `00-shell.md`:

> **One shell layer at a time. Opening a second closes the first, and `Escape` closes the one
> that is open. A fifth value in the union is a data change; a second simultaneous layer is a
> shell-contract change and needs a ruling.**

### 3.4 What changes, and whose file it is

| Change | File | Owner |
|---|---|---|
| `route.overlay` gains `onboarding` — and **not** `reauth` | `src/data/types/navigation.ts`, `routeTable.ts` | mock-data-engineer |
| `ShellContext` gains the session lifecycle and the one-at-a-time rule | `src/shell/` | frontend-engineer |
| Foundation §4.3 goes from three layers to **four**, with the one-at-a-time clause | `specs/00-foundation.md` | product-owner |
| `reauthenticate` moves from §4.1 row 7 (shell layer) to a modal | `specs/04-auth-and-onboarding.md` §4.1, §7.3 | product-owner |

---

## 4. R4-4 · The `MetricBoard` contract — breakdowns, captions, notices

`MetricBoard` is `{ subTabId, asOf, metrics[], charts[] }`. Three specs, arriving from three
directions, all hit the same wall. All three are granted. **None is a deviation and none needs
a signature** — a type that cannot express content the design already specifies is a gap in the
type, not a departure from a rule.

**One correction to the brief.** There is no `BreakdownList` in `src/components/metrics/` — it
holds `ChartCard`, `MetricTile`, `MetricTileRow`, `TrendChart`, `formatMetric`. Nothing in
`src/` contains a breakdown of any kind. The shape has to be built. What *does* already exist
is the **specification** of the shape, in `DESIGN.md` §3.7, twice — and that is why this is a
contract ruling rather than a design one.

### 4.1 F-1 — the breakdown. **Granted. One shape, not three.**

> ⚠ **The anatomy table and the row contract below are SUPERSEDED by
> [`09-rulings-r5.md`](09-rulings-r5.md) §9.1.** Four slots changed: the **secondary numeric
> column is withdrawn** (R5-5 — a second number is a noun phrase in the sub-label, which is the
> reference's own construction); the **bar takes `--chart-series` at 4px**, share-of-max, and is
> legal only when `max > min` (R5-6 — `--chart-fill` is an area fill for a line to delimit, and I
> cited it for a mark); the **row label becomes a discriminated union** so a translated label and
> a person's name differ in the type (R5-7); and a **breakdown never exceeds half the content
> width** (R5-8, §4.5). The reasoning below stands. **Read §9.1 of R5 for the current text.**

**§3.7 already describes it, `[observed]`, in two variants**, and I looked at both this pass:

- **Funnel/label rows** — `Online store conversion rate` renders `Added to cart` over a grey
  sub-label `0 sessions`, a right-aligned `0.00%`, and a delta at the far right
  .
- **Ranked bar rows** — Live View's `Top locations` renders `Singapore • Singapore` above a
  horizontal bar with the value `4` at its end, then `Boardman • United States` / `2` below it.
  `Top products` renders a thumbnail, a linked title, and a right-aligned amount
.

**Eyvar takes one construction, not two**, and it is the union of the two:

```
┌─ Card title                                          [report icon] ─┐
│  Top 5 zones by failure rate                                        │  ← §3.7 card header
├─────────────────────────────────────────────────────────────────────┤
│  Al Narjis                                              42%    +8   │  ← row: label / value / secondary
│  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                   │  ← optional bar
│  Supply gap · captains needed                                       │  ← optional sub-label
│  ─────────────────────────────────────────────────────────────────  │
│  Al Yasmin                                              31%    +5   │
│  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                            │
│  ─────────────────────────────────────────────────────────────────  │
│  …                                                                  │
│  Showing the top 5 of 14 zones.                                     │  ← AC-696
└─────────────────────────────────────────────────────────────────────┘
```

**Anatomy, normative:**

| Slot | Rule |
|---|---|
| **Heading** | A fragment above the rows stating dimension, ranking and cut-off (AC-690). No period — R6. `Top 5 zones by failure rate`. |
| **Label** | `--text-sm` / 500 / `--ev-ink`, truncates, never wraps. **A link only if its destination is already filtered to that row** (AC-693). Where no such destination exists it is plain text — never a link to an unfiltered list (`05-metrics-content.md` AC-653, F-8). |
| **Sub-label** | Optional. `--text-xs` / `--ev-text-2`, one line, truncates. Carries the second *categorical* fact — a root-cause owner, a tier, a block. |
| **Primary value** | Right-aligned, tabular figures (**R4**, and it does **not** flip in Arabic). Formatted from the row's own `unit` through `formatMoney` / `formatPercent` / `formatCount`. |
| **Secondary value** | Optional, right-aligned, `--ev-text-2`, after the primary. Carries a second *numeric* fact — captains needed, count behind a rate. |
| **Bar** | **Optional, and legal only when every row of the breakdown shares one unit and one denominator.** `--chart-fill`, full-width track, no label inside. Where rows are counts of different things, the bar is a lie about a shared scale — omit it. |
| **Cut-off line** | Last row, `--text-xs` `--ev-text-2`: `Showing the top {n} of {total} {dimension}.` A full sentence, so it takes a period (R6). Rendered only when `total > n` (AC-696). |
| **Row height** | `--ev-row-h` without the bar, `--ev-row-h-media` with it. Uniform within a breakdown — a row that grows to fit is R20's defect in a new place. |

**Four rules that close the ACs and are worth stating as rules, not as ACs:**

- **A breakdown carries no mutating control, ever** (AC-694). It is a reading surface on a
  board. A row that can be acted on is a **work queue row** and belongs on a queue.
- **A breakdown with fewer rows than its cut-off renders all of them** — no padding, no
  `and 0 more` (AC-691).
- **A breakdown with zero rows is R8's second kind**: one grey sentence, never the
  illustration, because the section is empty and the page is not (AC-692). Copy:
  **`Nothing to rank for this period.`**
- **A breakdown's total agrees with the tile above it when both measure the same set**
  (AC-695). If they disagree, one of them is wrong and the board is worse than having neither.

**The contract:**

```ts
MetricBoard {
  subTabId:    string
  asOf:        IsoDateTime
  metrics:     Metric[]
  charts:      TimeSeries[]
  breakdowns:  MetricBreakdown[]      // NEW
  notices:     BoardNotice[]          // NEW — §4.3
}

MetricBreakdown {
  key:            string              // stable; the translation-key root for its heading
  dimension:      string              // 'zone' | 'reason-code' | 'rota-slot' | …
  rowsShown:      number              // the cut-off, n
  rowsTotal:      number              // so AC-696 does not need a second request
  bar:            boolean             // false unless one unit and one denominator
  rows:           MetricBreakdownRow[]
}

MetricBreakdownRow {
  id:             string
  labelKey:       string              // a key, never a string — AC-697
  labelParams:    Record<string, string | number> | null
  subLabelKey:    string | null
  value:          number
  unit:           MetricUnit
  currency:       CurrencyCode | null
  secondaryValue: number | null
  secondaryUnit:  MetricUnit | null
  barFraction:    number | null       // 0..1, null when `bar` is false
  drilldownRoute: string | null       // null renders plain text, never a link
}
```

**`DESIGN.md` §3.7's Rules block gains one line** so this is citable rather than re-derived:

> - A breakdown MUST state its dimension, its ranking and its cut-off above its rows, MUST NOT
>   carry a mutating control, and MUST link a row only to a destination already filtered to
>   that row.

### 4.2 F-2 — `Metric.caption`. **Granted, with a hard scope so it does not become a slop field.**

Legacy carries a sub-line on tiles that need one — *"excludes pending applicants"* (`:10374`),
*"5 of 12 total"* (`:6916`), *"ceiling 3 %"* (`:15025`) — and three tiles in
`05-metrics-content.md` cannot ship without one (AC-641, AC-674, AC-675). A number whose
scope is not stated is a number that gets quoted wrong.

```ts
Metric { …, caption: string | null }   // a translation key, never a string
```

**The scope, and it is the whole of the ruling:**

> ⚠ **SUPERSEDED by [`09-rulings-r5.md`](09-rulings-r5.md) §9.2.** Two errors, both mine. The
> positive list below is **two instances I had on the desk, mistaken for a definition** — the
> four prohibitions were always the rule, and a valence note (`Higher is better.`) breaks none of
> them. And **≤60 characters was a guess**, made by analogy with R9's toast budget without
> measuring the box a caption gets: the measured box holds ~38 at 4-up. The budget is now 38 and
> the rule is that it fits its box in both languages. **Read §9.2 of R5 for the current text.**

> A caption states a **scope limit or a denominator**. It never states a value, never states a
> status, never carries a call to action, and never carries a link. One line, ≤60 characters,
> truncates and never wraps. It is a translation key with parameters, never a concatenation.

Legal: `Excludes pending applicants.` · `1 of 4 cities live.` · `Ceiling is 3%.`
Illegal: `Up 8% on last week.` (that is the delta) · `Needs attention.` (that is a status, and
R7 owns those) · `Review the queue →` (that is an action, and a tile is not a banner).

**Placement.** Below the label, third text line: glyph → value → label → **caption** → delta
chip. `--text-xs` / `--ev-text-2`, the same ink as the label.

**§3.7's tile-anatomy MUST** — *"title, report link, value, delta, chart, legend — in that
order"* — was already superseded for stat tiles by **D7 §4.9**, which measured the order as
glyph / value / label / delta. The caption inserts into D7's order, not §3.7's, and the §3.7
line is annotated accordingly in the same partial edit rather than being left to contradict
the built product.

### 4.3 F-3 — the board banner. **Granted, and it is not the board's banner.**

Two specs arrived at this independently — `03-financials.md` **AC-351** (*the trial balance
does not balance*) and `05-metrics-content.md` (an unacknowledged SOS on Support, a statutory
overdue on Admin). Two specs finding the same gap from different directions is evidence the
gap is real.

**But a board must not own a banner**, because a banner is a **page-level** surface and R10
forbids two page-level banners on one page. If `MetricBoard` renders one and the shell renders
one, the product has two, and the second one is the one nobody reads.

> **A board *declares conditions*; the page renders at most one banner.**
>
> ```ts
> BoardNotice {
>   key:       string                          // translation-key root
>   params:    Record<string, string | number> | null
>   tone:      'critical' | 'warning' | 'info' | 'success'
>   action:    { labelKey: string; route: string } | null
>   severity:  number                          // tie-break within a tone
> }
> ```
>
> ⚠ **"then declaration order" is DELETED — [`09-rulings-r5.md`](09-rulings-r5.md) §9.3.** It was
> mine and it was wrong: a tie-break decided by the order somebody typed an array is a coin flip
> with a stable seed, and it made a real editorial ambiguity invisible. `severity` is **unique
> among a board's notices of the same tone**, the selection is therefore total, and a collision
> is a fixture defect caught by a test over real fixtures. The rest of this block stands.

> The screen renders **exactly one** notice, in the page banner slot between the page header
> and the tile grid: the highest tone, then the highest `severity`, then declaration order. A
> board declares **at most three**. The suppressed conditions are not lost — each is
> independently visible in the tile or breakdown it came from, and that is the test: **a
> notice may only exist for a condition the board already shows a number for.** A banner
> saying something no tile on the page can corroborate is a banner the operator cannot act on.

**Tone and geometry are already ruled and nothing is invented.** R1 and R16: all four tones are
pale tinted cards, `--tone-*` fills, never a saturated strip. R5a use #2 permits **one**
page-level critical banner — and the "one" in R5a is exactly why the render-at-most-one rule
is mandatory rather than tidy.

**The three known notices, with final copy:**

| Board | Condition | Tone | Copy | Action |
|---|---|---|---|---|
| Financials › Overview (AC-351) | trial balance does not balance | `critical` | `The trial balance does not balance.` | `Open the ledger` |
| Support › Overview | unacknowledged SOS incidents | `critical` | one: `An SOS incident is unacknowledged.` · many: `{count} SOS incidents are unacknowledged.` | `Open Safety & Incidents` |
| Admin › Overview | PDPL erasure requests past the statutory deadline (`ERASURE_SLA_DAYS = 30`, `:15962`) | `critical` | one: `An erasure request is past its statutory deadline.` · many: `{count} erasure requests are past their statutory deadline.` | `Open Data` |

Full sentences, so they take periods (R6). Actions are verb-first fragments, so they do not
(R6, §5.7). Two keys per count, never a pluralisation built by concatenation (AC-713's rule
applied).

**On-call rota gaps are a tile, not a notice**, even though all 42 slots are currently empty.
It is severe, it is visible, and it is **recoverable** — somebody can be assigned at any
moment. A notice is for a condition where the delay itself does the damage. Same test as
R4-10b, applied one level up, and it is worth saying out loud that the two rules agree.

### 4.4 F-12 — the hourly bucket. **The contract does not grow an hourly grain.**

`SeriesPoint.at` stays an `IsoDate`. Two reasons and the second is the one that decides it:

1. **An hourly series is not a board tile.** A 30-day window at hourly grain is 720 points in a
   268px card. §3.7's boards answer fixed questions at a fixed grain; a grain the operator
   would immediately want to change is a **query**, and queries have a home (R4-1's builder).
2. **The question is not a time series.** *"Zone demand by hour"* (`showZoneHourly`) and
   *"requests by hour of day"* are **profiles**, not trends — 24 buckets that repeat, where the
   answer is *"the 07:00 block is starved"*, not *"demand rose on the 14th"*. That is a
   **breakdown with `dimension: 'hour-of-day'`**, which R4-1's shape above already delivers,
   with 24 rows and a bar (one unit, one denominator — the bar is legal).

**So F-12 is closed by F-1 and costs nothing.** The genuine hourly *trend* — same measure,
consecutive hours, across days — moves to the report builder, where grain is a first-class
control. **Finding for `06-report-builder.md` §3.2:** `ReportQuery.grain` is
`'day' | 'week' | 'month' | 'none'` and needs `'hour'`, gated by the catalogue's `minGrain`
(F-4) exactly as the other grains are. That is one union member and one row in §3.5's
window/grain table — a 90-day window at hourly grain is 2,160 buckets, so it trips the
existing 400-bucket rule and is disabled in place with a stated reason. **No new machinery.**

---

## 5. R4-5 · W4-F2 — the delta chip is **neutral**. §3.7's colour MUST is void.

### 5.1 The ruling

> **The delta chip takes `tone="neutral"`, always.** The caret is the visual carrier of
> direction. `Metric.higherIsBetter` carries valence to the screen reader only. **§3.7's
> *"Deltas MUST be colour-coded"* is void for Eyvar.**

The build shipped this and its reasoning was right. I am confirming it and adding the argument
that ends the question, because a ruling that rests only on "D7 is later" invites the next
engineer to reopen it.

### 5.2 R5a ends it, and nobody had noticed

§3.7's MUST, applied literally, produces a **red delta chip** on a falling revenue tile.
**R5a enumerates red's four permitted uses**: a destructive button, one page-level critical
banner, a breached-row leading-edge marker, a map marker. A delta chip is none of them.

So **§3.7's MUST cannot be obeyed without a §6.2 entry that nobody has written** — it silently
authorises a fifth use of red. R5a is a ruling; §3.7 is a §3 MUST; the precedence ladder puts
rulings above sections. **The MUST loses, on the ladder, without needing D7 at all.**

The half-obedient alternative — green for good, neutral for bad — is worse than neutral: a
board that can only ever deliver good news in colour is a board whose colour means nothing.

### 5.3 And D7 wins on precedence anyway, which makes this belt and braces

D7 replaces *"the **visual** content of §1–§5"*. A rule about what colour a chip takes is the
visual content of §3 by any reading. D7 §4.9 measured the replacement — `5b908c10` renders `0%`
in a neutral chip beside every one of six metrics — and it is later and narrower. Two
independent grounds, same answer.

### 5.4 The substantive reason, which is the one to remember

`higherIsBetter` exists in the data contract **because up is not always good**. A rising
cancellation rate is not a win. So a colour-coded delta must encode *goodness*, not direction —
and then the caret encodes direction while the colour encodes goodness, two orthogonal
meanings inside one 12px chip, on a board where the two disagree on some tiles and agree on
others. **The operator has to learn which is which per tile.** Neutral removes the second
encoding rather than making it correct.

### 5.5 The asymmetry, defended rather than smoothed over

A screen-reader user hears `up, which is worse`. A sighted user sees only `▲ 8%`. That is not
an inconsistency to fix — it is a **substitution**. A sighted operator reads the tile's
sparkline, its label and its caption (R4-4's `caption`, now available) and knows what a rise
in *this* metric means. A screen-reader user has none of that. §7 is a floor, not a ceiling,
and giving the assistive path the fact the visual path gets from context is correct
compensation.

**The phrases, final** — one key each, parameterised, never concatenated:

| Case | Phrase |
|---|---|
| rise, `higherIsBetter: true` | `up, which is better` |
| rise, `higherIsBetter: false` | `up, which is worse` |
| fall, `higherIsBetter: true` | `down, which is worse` |
| fall, `higherIsBetter: false` | `down, which is better` |
| no change | `no change` |
| no comparison possible | `no comparison` — rendered visually as an em-dash (§3.7, unchanged) |

### 5.6 What changes

| Change | File | Owner |
|---|---|---|
| `Metric.higherIsBetter`'s doc comment says *"Drives the delta's colour"*. **It does not, and has not since D7.** Rewrite: *"Drives the delta's screen-reader valence phrase. It does NOT drive colour — the chip is neutral (D7 §4.9, R5a). See `design/07-rulings-r4.md` R4-5."* | `src/data/types/metrics.ts` | mock-data-engineer |
| §3.7's Rules block: the colour-coding MUST is annotated **void**, with R5a and D7 §4.9 named | `_partials/03-data-display.md` | product-designer (§14) |
| **W4-F2 closed.** | the metric-board build | qa |

---

## 6. R4-6 · W4-F1 — Market & Zones is **both**, and the table is primary

### 6.1 The ruling

> **Market & Zones is an Index table (§3.1–3.3) with a metric strip (§3.7) above it, and the
> strip's tiles are *filters into the table*, not links away from it.**
>
> `specs/00-foundation.md` §3.4 row 5 is **not stale** — it is **incomplete**, in exactly the
> way the Growth row two lines above it is complete. The wave 4 board is **not wrong** — it is
> **half**, and the half that shipped is the half that was in scope.

Nobody has to undo anything. **Wave 4 signs off.**

### 6.2 The evidence, from the legacy page rather than from the fixtures

`docs/01-modules/11b-zones.md` and the source it cites:

- The page is four cards: a **KPI strip of four tiles**, a momentum chart, a **zone health
  table, worst-first**, and a drill-in hourly card.
- **The KPI tiles are filter controls.** `filterZones(f)` re-renders the page and then
  `kpiScrollTo('zones-list')` (`:14130`, `:14535`). They do not navigate. They **narrow the
  table and scroll to it.** That is decisive: in the page as built by the people who ran the
  business, the tiles exist to operate the list. The list is the destination.
- **The rows carry actions.** `Steer drivers` and `Queue recruitment` — with a permission key
  of their own, `zones.steer` (`:14004`, `:14024`,
  `docs/01-modules/00c-identity-permissions-and-audit.md`). A §3.7 metric board has no row
  actions and no per-row permission. **A surface with a per-row permission key is a table.**
- **The nav badge counts starved zones** — `DB.zones.filter(z => z.supply > 0 && z.demand /
  z.supply >= 3).length` (`:14133`). A backlog count over rows is a table's signal.
- The fixtures already agree without anyone having decided to: **all four zone tiles carry
  `drilldownRoute: null`** (`src/data/fixtures/metrics.ts:426`–`:490`). They have no
  destination because they were never meant to have one.

### 6.3 The amended row

`specs/00-foundation.md` §3.4, Management row 5 — the Growth row's construction, verbatim:

| # | Sub-tab | Route | Contributing legacy pages | Pattern (§6.4) |
|---:|---|---|---|---|
| 5 | **Market & Zones** | `/management/zones` | `zones` + `exec-overview` (expansion-ready list) | Index table (§3.1–3.3); the zone-health strip is Metric tiles (§3.7) |

`routeTable.ts` keeps `patterns: ['P1']` and gains `'P5'` — `['P1','P5']`, table first, the
same shape `management-growth` already carries. That also closes **`05-metrics-content.md`
F-9**'s first half ("`management-zones` is `P1` and serves a board") — the row was right, the
array was short.

### 6.4 What that means for the built board

Three changes, none large:

1. **The four tiles are filter controls, not `<a>` wrappers.** The metric-board build
   made a tile an anchor around the card; a zone tile is a **toggle** that filters the table
   below it. Same card, same anatomy, `aria-pressed`, and the focus ring traces the card
   exactly as it does today. The generic `MetricTile` keeps the anchor form for the seven
   other boards; the zone strip passes a filter handler instead of a route.
2. **The zone-health table is built**, at `/management/zones`, with `Steer drivers` and
   `Queue recruitment` as row actions under **D8** — two actions is not a kebab.
   `Queue recruitment` is not a decision pair, so under D8's table this is *"3 or more"*
   territory only if a third arrives; at two, both render as direct controls with visible
   labels, plus `View`, keyboard-operable and visible without hover (**AC-68**).
3. **The breakdown from R4-4 is what §9.3 of `05-metrics-content.md` wanted** and it is now
   available — but on this sub-tab the ranked list and the table are the **same rows**, so the
   board renders the strip and the table, and **no breakdown**. A ranked top-5 above a full
   table of the same rows is the same data twice.

### 6.5 A fixture defect found on the way, raised not fixed

`navCounts.ts` seeds `{ subTabId: 'management-zones', count: 0 }` with the comment *"the zone
watchlist exists and is currently empty."* But the badge's legacy definition is the **starved**
count, and `management.zones.worstDemandSupplyRatio` is seeded **7** (Al Narjis, 14 demand
against 2 captains) — which is over the `>= 3` threshold, so `starved >= 1`. **The count and
the ratio tile contradict each other.** Either the badge is not the starved count, or the count
is wrong. **mock-data-engineer**, and it wants deciding before the table is built, because the
table's default sort is worst-first and the badge should agree with its first row.

---


### 6.6 R4-6b — "Zones by failure rate" does not die, and it does not move

**Raised by the coordinator:** the two most valuable lists on Market & Zones — *zones by
failure rate* and *zones by subscription-demand momentum* — have no surface.
`05-metrics-content.md` **AC-652** declares them as board breakdowns; **§6.4 clause 3 above**
redirected them into the zone-health table; and the breakdowns build then
records that they *"do not ship, because R4-6 assigns them to a `P1` table that is not built and
zones are not yet a resource in `src/data`."* **They were not dropped by a decision. They fell
between two documents.** Ruling on it, because §6.4 is mine and this is my sentence's
consequence.

#### The ruling

> **R4-6 stands. Both lists live in the zone-health table at `/management/zones`, exactly where
> §6.4 clause 3 put them. Neither ships as a board breakdown, now or later.**
>
> **What is missing is not a decision — it is an owner and a fixture, and both are named in
> §6.6.3.** *"Zones by failure rate"* is **not** dropped, and any document that currently reads
> as though it were is corrected by this ruling.

#### 6.6.1 Why the redirect was right, re-checked rather than defended

The premise of §6.4 clause 3 was *"the ranked list and the table are the same rows."* Checked
against `05-metrics-content.md` §9.3 rather than recalled:

| | The breakdown, as specified | The zone-health table |
|---|---|---|
| Rows | **all 6 zones** | all zones |
| Sort | worst first (`:14132`) | worst first |
| Columns | demand : supply · failure rate · recruitment priority · captains needed | the same, plus row actions |

**Same rows, same sort, same columns, differing only by two row actions.** The premise holds, so
the ruling holds. Shipping both would put the same six rows on one page twice, and the copy
would have to explain why the top five differ from the top five immediately below them.

#### 6.6.2 Why it does not ship on the board as an interim

The tempting fix is to render the breakdown now and delete it when the table lands. **No**, and
the reason is not tidiness:

- **R4-6's objection does not weaken because one copy is late.** *Same data twice* is a
  statement about the page, not about the schedule.
- **A component built to be deleted is deleted twice** — once from the screen, and once from
  the operator's habits. An ops operator who learns to read the top five on the board will keep
  looking there after the table arrives, and the board is the copy without the row actions,
  which is the half that cannot act.
- **Market & Zones looking thin is the honest signal.** §10 of the build doc already reached
  that conclusion for Support › Overview and was right: *"they look sparse because they are
  sparse."* A list shipped to fill space converts a scheduling gap into a design claim.

#### 6.6.3 What is actually blocked, with an owner each

| # | Gap | Owner | Size |
|---:|---|---|---|
| 1 | **`zones` is not a resource in `src/data`.** There is no fixture, no client, no type — `grep -rln zone src/data/` returns only metrics, pricing, navCounts and legacyPages, none of which holds a zone row | **mock-data-engineer** | Small — the shape is §6.6.5, and `DB.zones` is already seeded in the legacy file |
| 2 | **The zone-health table has no build slot.** §6.4 clause 2 says *"the zone-health table **is built**"* and never said **when**. It is not in any wave of the original build plan, because D1's wave 4 scoped Market & Zones as a board and R4-6 changed that after the wave was written | **coordinator** | A sequencing decision, not a design one |

**Gap 2 is the real one, and it is mine to have caused.** R4-6 amended a sub-tab's pattern after
its wave had been planned, and I wrote *"nobody has to undo anything"* without noticing that
nobody had been told to **do** anything either. Recorded plainly so the same shape is caught
next time a ruling re-patterns a built screen.

#### 6.6.4 One design ruling I make now, because it is cheap and prevents a real bug

> **When the table lands, Market & Zones' ~~four~~ FIVE metric tiles MUST be derived from the
> table's own rows. They may not remain literals.** — `captainsNeeded`, `starvedZones`,
> `unservedRequests30d`, `avgFailureRate`, `worstDemandSupplyRatio`.

> **Corrected 2026-08-27 ([`09-rulings-r5.md`](09-rulings-r5.md) §13.1). I wrote "four" by
> counting the tiles I happened to be looking at, and `management.zones.captainsNeeded` — which
> `05-metrics-content.md` §9.1 ranks FIRST on the board — is zone-derived like the rest.**
> Worth correcting loudly, because deriving four and leaving the fifth a literal is precisely the
> drift this ruling exists to prevent, arriving one tile to the left: the ruling as written would
> have licensed it. Built as five; all five hit the literal they replaced exactly (3, 2, 31, 45,
> 7), so the derivation changed no published number and removed the possibility of one drifting.

Today `management.zones.worstDemandSupplyRatio` is `value: 7` — a **literal** in
`src/data/fixtures/metrics.ts:977`–`:980`, not `max(demand ÷ supply)` over anything. All five
zone tiles are the same. **The strip and its table cannot contradict each other today only
because the table does not exist.** The moment it does, a hand-seeded `7` sits above a list
whose worst row says something else, and the operator has no way to know which is lying.

This is **§6.5's `navCounts` defect at page scale** — there I found the badge and the ratio tile
disagreeing; this is the same failure waiting for five more tiles. The two should be fixed in
one pass: **the nav badge, the five tiles and the table's first row all derive from one zone
array, or they will drift.**

#### 6.6.5 The fixture shape, so gap 1 is a job and not a question

One row per zone, six rows, from `DB.zones` and `docs/01-modules/11b-zones.md` §5:

| Field | Type | Note |
|---|---|---|
| `id` | string | |
| `name` | string | `Al Narjis` |
| `city` | string | Every seeded zone is in Riyadh — which is **L-6**'s cause, and the fixture should keep it rather than hide it |
| `demand` | integer | 30-day request count |
| `supply` | integer | captains active in the zone |
| `failures30d` | integer | |
| `failureRate` | integer, **derived** | `round(failures30d ÷ demand × 100)` — `zoneFailRate` `:13974`. Derived, never stored (§8.2) |
| `demandSupplyRatio` | number, **derived** | `demand ÷ supply`. `>= 3` is *starved* (`:14133`) |
| `captainsNeeded` | integer, **derived** | |
| `subMomentum` | number, **derived** | `zoneSubMomentum()` `:14041`–`:14056`, today against the trailing average |

`supply` of `0` must be representable, and `demandSupplyRatio` must state what it renders when
`supply === 0` rather than emitting `Infinity` into a `ratio`-unit tile — **R4-12** ruled that
unit and this is its first real consumer.

#### 6.6.6 What this changes in other documents

| Document | Change |
|---|---|
| `05-metrics-content.md` **AC-652** | *"Zones renders three breakdowns"* → **"Zones renders no breakdown. Its three declared breakdowns are columns of the zone-health table (R4-6, R4-6b); a board breakdown duplicating the table below it is a defect."* Its **F-8** — *"nothing today"* — is answered: the destination is the table, and the table needs gap 1 and gap 2 |
| the breakdowns build's contact-log finding | Correct as written and stays. *"Do not ship"* was the right call; it now has a reason with an owner instead of reading as an unexplained absence |
| `specs/00-foundation.md` §3.4 Management row 5 | Already amended by §6.3 above. Unchanged |

**Nothing in wave 4 is reopened and nothing built is undone.** Market & Zones ships its strip
today, exactly as it does now, and gains its table when gaps 1 and 2 close.

## 7. R4-7 · R15, the stadium, and the avatar

### 7.1 The ruling, both halves

> **(a) R15 is amended to state its scope, and the D12 exception is withdrawn as unnecessary.**
> R15 never governed the bulk-action bar. Five code comments over-extended it and they are the
> reason the rule reads as advisory.
>
> **(b) R15 is already amended for avatars — by D7, in the shipped document.** *"Avatars are
> 32px circles."* `ui/avatar.tsx` is stale, not scoped. Flip the primitive; delete the
> People-local class.

**(a) needs the business owner's signature**, because D12 reserved it to them in writing:
*"Whether R15 should be amended rather than excepted is a finding for the frontend engineer to
argue and the owner to settle; nobody amends R15 unilaterally."* It is **not** a §6.2 entry —
no rule is suspended — it is an edit to the Rulings table, and the replacement row is in §12.

### 7.2 The engineer's objection is right about the symptom and wrong about the cause

*"A rule that says 'never' with one live exception is a rule people will read as advisory."*
Correct. But R15 does not say never. **Read what it actually governs:**

> *"R15 — Badge, toast and **avatar** geometry is stated two ways… **Badges and toasts** are
> rounded rectangles, not stadium pills — the badge radius is 4px, the card and control radius
> 8px."*

Three object classes: **badge, toast, avatar.** The bulk-action bar is none of them. Nor is a
popover, a button, or a segmented control. The product already knows this — `switch.tsx`
carries the correct reading in its own header: *"a switch is a stadium BY DEFINITION — R15
governs badges, buttons, toasts, avatars and nav pills, not a track-and-thumb control.
`rounded-full` is correct here and only here."*

So the bulk bar's `r8, NOT a stadium — R15` comment is a **mis-citation**, and so are the
"never a stadium" lines in `badge.tsx`, `button.tsx`, `popover.tsx` and `sonner.tsx` — three of
those four are about surfaces R15 has never mentioned. The bulk bar's 8px is still **correct**,
for its own reason: it is a floating **surface**, and surfaces take the card/control radius
from the token ladder. It just was not R15 that said so.

**D12's "one narrow exception" was therefore never needed.** Nothing was being excepted from.
Converting it into a scope statement removes the live counter-example without weakening
anything, which is the outcome the engineer was actually asking for.

### 7.3 The amended R15, with a principle rather than a list of exceptions

The full replacement row is in §12.2. The principle it turns on:

> **A stadium is legal where the shape is the mechanism, and illegal where it is a style.**

That is a closed test, not an open list. It admits exactly three controls today — a **switch
track and thumb**, a **segmented-control track and its active pill**, and a **progress or meter
track** — because in each of those the radius *is* the affordance: the fully-rounded end is
what says "a thing travels along here" or "this fills". It admits nothing decorative, ever,
and a fourth candidate has to argue that its geometry is load-bearing rather than that it looks
better. **D12's segmented control is covered by the principle rather than exempted from the
rule**, which is exactly the difference between a rule and a rule with a hole in it.

### 7.4 The avatar half — already decided, and the build is behind the document

R15's current text, in the shipped `DESIGN.md`:

> *"**THE AVATAR CLAUSE IS KILLED BY D7.** '~30px rounded squares, never circles' is
> falsified: the identity avatar is a **32px circle**, and this is measured rather than
> eyeballed — the horizontal inset one destination pixel below the top edge is 5px, which a
> 9-destination-px-radius **circle** predicts at 4.88 and an 8px rounded square predicts at
> 1.54. **Avatars are 32px circles.**"*

So `04-index-screen-redesign.md` §14.1's *"Avatar — 32px circle — R15 as amended"* is simply
**correct**, and the People cell's local class is a **deferral**, not a deviation. The build's
stated reason — *"the top bar still depends on the rounded square"* — is a fact about today's
code, not a rule, and `AccountMenu.tsx` contradicts itself about it in two places (line 11:
*"circle (R15). `avatar.tsx` was restyled on arrival for this"*; line 83: *"R15 — a rounded
square"*).

**Ruling: flip the primitive. One qualification, and it is a real design distinction:**

> **A person is a circle. A non-person identity is a rounded square.**
>
> `ui/avatar.tsx` gains `shape?: 'person' | 'entity'`, defaulting to **`person`**
> (`rounded-full`). `entity` is `rounded-lg` at 8px and is for a **corporate account, a
> workspace, an app, or a plan** — anything whose avatar is a logo rather than a face. This is
> not a hedge: a circle crops a wordmark badly and reads as a person, and the inherited baseline separates the
> two for the same reason.

Consequences: `AccountMenu`'s 28px avatar becomes a circle and its two contradictory comments
collapse into one; `cells.tsx`'s local circle class is deleted and the finding it recorded
(*"the primitive's default is the right place for it once the top bar lands"*) is closed;
`LoadingSkeleton.tsx`'s P10 feed skeleton flips with it, since it skeletons a person.

**One rule survives the flip and must not be lost:** the avatar fallback renders initials in
`--ev-text-2` on `--ev-bg2` at 5.35:1 and is **never blank** (§7.5, AC-76 — no emoji, including
in a fallback).

---

## 8. R4-8 · The elevation gap. **Real. Tier 0.5, and today's build is the interim.**

### 8.1 The ruling

> **The gap is real and it is worse than D12 stated.** Under D7, tier 1 is
> `0 0 0 0 rgb(16 24 40 / 0)` — it paints **nothing**. So the ladder is not
> *"hairline → popover → modal"*, it is *"nothing → popover → modal"*, and tier 2 reaches 18px
> below at 12% alpha, which on a 28px pill is a smudge the height of two thirds of the control.
>
> **The answer is a fourth value, minted through §6.2, and scoped by a categorical boundary
> that cannot be argued outward: tier 0.5 is elevation of a *part inside a control*. Tiers 1–3
> are elevation of a *surface on the page*.** Nothing else can ever qualify, because anything
> else is a surface.
>
> **Interim, until the owner signs: today's build ships unchanged.** The pill keeps its
> hairline. Nothing is blocked by the signature.

§12.3 carries the entry.

### 8.2 Why "tier 1 is correct and the reference is just heavier" is not the answer

It was the answer I expected to reach. It fails on a measurement:

- The track is `--ev-bg2` `#f6f8f9`. The active pill is `--ev-surface` `#ffffff`. **That step
  is 1.04:1.** There is essentially no tonal separation, and D12 already established that the
  track cannot be darkened — `#eceef1` drops the inactive label `--ev-text-2` to 4.16:1, under
  the 4.5 floor, and fixing that would need a second new token to repair the damage the first
  one did.
- So the pill is carried by its **hairline** and by its **label** (`--ev-ink` at 600 against
  `--ev-text-2` at 400). That is legible — I am not claiming the built control fails.
- But the hairline sits **2px inside the track's own hairline** (`p-0.5` on a `border`ed
  track). **Two 1px strokes 2px apart, running the full height of the control.** That is a
  moiré artifact, not a separator, and it is the visible reason the built control does not
  read the way the owner's reference does.

**And the two obvious escapes both fail.** Dropping the *track's* border leaves a `#f6f8f9`
track on a `#ffffff` ground at 1.03:1 — under D-11's one-white-ground rule the track's border
is the only thing that makes it exist. Dropping the *pill's* border leaves white-on-near-white
at 1.04:1 with the label as the sole carrier of the selected state. **Of the four combinations,
"hairline and no shadow" is the second-best and "no hairline and no shadow" is the worst** —
which is why the interim is the built state and not a subtraction.

Tier 0.5 is the only combination that gives one separator instead of two: **the shadow goes on
and the pill's hairline comes off.**

### 8.3 The value, and how it was derived

```css
--ev-shadow-0-5: 0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 1px 0 rgb(16 24 40 / 0.04);
```

- **Colour** `rgb(16 24 40)`, matching all three existing tiers under D7. Not black.
- **`offset-x: 0`**, like every other tier, so nothing mirrors in Arabic (§9.5) and it does not
  belong under the `:root:lang(ar)` hook.
- **Reach ~2px below, ~0 lateral.** A 28px pill inside a 32px track has 2px of clearance on
  each side; a shadow that reaches further paints on the track's opposite edge and reads as
  dirt. The reach is bounded by the geometry, not chosen.
- **Alpha 0.06/0.04.** Below tier 2's 0.12/0.06 by half, above visibility floor (≈0.015). It
  is the smallest shadow that resolves inside the clearance.
- **Two layers**, for the reason `00-decisions-r3.md` §1.6 gives: a single low-alpha shadow at
  this density reads as nothing or as a halo. Tight layer draws the edge, wide layer carries
  the lift.
- **On the 2px grid**, like the other three, so the set still composes.

**No pixel figure from §1–§5 is cited here** (R13). What is borrowed is the *relationship*:
part-inside-control ≪ card ≪ popover < modal.

### 8.4 What ships when

| | Pill border | Shadow | Track border |
|---|---|---|---|
| **Today, and until signature** | `--ev-hairline-control` | none | `--ev-hairline-control` |
| **If §12.3 is signed** | **none** | `--ev-shadow-0-5` | `--ev-hairline-control` |
| **If declined** | unchanged from today | none | unchanged |

**D12's open measurement is closed either way**, and its second open item — §5.4's width budget
against a stadium track with an inset pill — is unaffected by this ruling, because neither
state changes the control's box. D12 already re-measured the Arabic slack at 9px, not 49, and
that number stands.

---

## 9. R4-9 · D-11 — who owns focus when a popover hands off to a layer

### 9.1 The ruling

> **The layer owns it. A traversal is not a dismissal.**
>
> When a control inside a transient surface (popover, dropdown-menu) opens another surface, the
> transient surface **closes without restoring focus**, and the opened surface **takes focus**.
> Focus returns to the *original* trigger only when the opened surface is itself dismissed.

Bell → popover → `See all` → the notification centre takes focus. `Escape` on the centre →
focus to the **bell**, because the popover no longer exists and the bell is the nearest
surviving trigger. Same for the account menu → `My profile`.

### 9.2 Why

Focus restoration exists so that **dismissing** an overlay returns you where you were. `See all`
does not dismiss the popover — it **spends** it. The operator's intent in activating a control
labelled `See all` is *take me there*, not *put me back*. Radix's `onCloseAutoFocus` cannot
tell the two apart, so it applies the dismissal rule to both, wins the race against
`useFocusEntry`, and leaves the operator on the bell staring at a drawer they asked for.

**It is also the only reading consistent with §7.3.3.** The notification centre is a
non-scrimmed layer: it does not trap, `Tab` leaves it and continues into the page. If focus
never entered it, `Tab` from the bell walks past the entire drawer into the page behind — the
operator's next keystroke goes somewhere that has nothing to do with what they just opened.
The no-trap rule is only safe **because** focus enters; the two clauses are one mechanism and
the bug breaks half of it.

**And AC-67 already requires it.** This is not a new rule; it is the rule the popover path
silently exempts itself from.

### 9.3 What frontend does with it

Not a patch I am writing, but the shape, so nobody guesses:

- The popover's `onCloseAutoFocus` calls `event.preventDefault()` **when the close was caused
  by a hand-off** — i.e. when the activated item opens a layer — and not otherwise. A popover
  dismissed by `Escape` or by an outside click must still restore, because that *is* a
  dismissal.
- With nothing competing, `useFocusEntry` wins by default rather than by timing. **Do not fix
  this with a `setTimeout`** — a race won by a delay is a race, and it will be lost on a slow
  machine in front of the owner.
- The layer's own restore target on `Escape` is the surviving trigger (the bell, the account
  avatar), which it already has.
- The `it.fails` in `AppLayout.test.tsx` goes green on the day this lands, which is what it was
  written for.

**Generalise it once, in `00-shell.md` §4, rather than fixing two call sites**, because the
shape applies to every future hand-off and there will be more.

---

## 10. R4-10 · Severity resolution, and the nav `attention` cap

### 10.1 The badge tone: **confirmed. `critical` and `high` are both `warning`.**

R7 closes the palette at five and there is no sixth. R5a permits no red badge. Neither moves.
**But the loss of resolution the data engineer reported is real, and the answer is not a tone.**

> **The label carries the distinction; the row marker carries the escalation; the clock carries
> the order.**
>
> - **Label.** The badge reads `Critical` / `High` / `Normal`. R17's principle exactly:
>   *"separate them with the label, not a second fill."* Sentence case, no emoji — legacy's
>   `🆘 CRITICAL` violates §5.7 and AC-76 at once.
> - **Marker.** An unacknowledged critical incident is a **breached row** and takes R5a use #3,
>   the 3px `--ev-marker` leading edge, plus the word `Overdue`. That is red, it is permitted,
>   and it is not a badge.
> - **Order.** `types/work.ts` already rules it: sort by deadline, never by severity label —
>   *"a 'critical' incident with four hours left is less urgent than a High ticket breaching in
>   ninety seconds"* (`:19074`). So the SOS floats to the top by clock.
>
> Three carriers where legacy had one red badge. **The resolution goes up, not down.**

### 10.2 The actual defect: `safety` is filed under the wrong §6.4 row

`DESIGN.md` §6.4 files `support`, `compliance`, `safety` under *"Index table → detail with
timeline (§3.1, §3.8)"*. **`safety` does not belong there**, and that is why the marker was not
available to it:

- It has an **SLA clock**: `DB.slaPolicy.tiers.T1.firstResponseMin` is `0` (`:14652`).
- It has a **breach**: both `INC-014` and `INC-015` carry `firstResponseBreachedAt` equal to
  their own `openedAt`, and the legacy inbox already treats every open critical incident as
  past due (`dueMs: -1`, `:19188`).
- It has a **disposition**: acknowledge, protocol steps, close.
- **D8 already treats it as one** — *"the five wave-2 sub-tabs"*, of which this is one.

Claim, SLA, disposition, row-level critical. That is **§8.4** by its own definition.

> **`safety` moves from the index-table row to the work-queue row in §6.4.** Same act as the
> `fraud` move, same evidence standard, opposite direction — and `fraud` moved *out* of §8.4
> precisely because it had no claim, no SLA clock and no disposition. **`safety` has all three.**
> Consequence for the inventory: the work-queue pattern governs **8** legacy pages and the
> index-table→detail pattern **2**. No component is added or removed.

`support` and `compliance` stay where they are — a ticket has an SLA but wave 2 files it
elsewhere, and `compliance` is a filtered view of People. Only `safety` moves.

### 10.3 R4-10b · The nav `attention` tie-break. **Confirmed, tightened, cap 2 → 3.**

The data engineer's rule — *"a breach whose harm is irreversible or statutory"* — is right and
I am adopting it. It has one weakness: **"irreversible" is arguable.** A rider who waits five
days may churn; churn is irreversible; therefore Requests is `attention`. The rule needs a
clause that a fixture can be checked against.

> **`attention` requires both clauses. Neither alone is sufficient.**
>
> 1. **The harm lands on a person, on money that cannot be recovered, or on a legal
>    obligation** — never on a metric, a rating, a conversion or a queue length.
> 2. **The deadline that makes it irreversible is not one we set.** If the number can be
>    changed in Admin › Operational Policy and the harm changes with it, the queue is
>    `neutral`. If the harm accrues whether or not we have a policy, it is `attention`.

Clause 2 is the falsifiable one, and it is checkable from data the fixtures already carry
(`slaSource`, and whether a policy row exists). Applied:

| Sub-tab | Clause 1 | Clause 2 | Tone |
|---|---|---|---|
| `support-safety` | an SOS in progress — a person | `firstResponseMin` is **0**; there is no dial to turn | **attention** |
| `financials-cash` | money past routine collection | the debt becomes uncollectable because the captain stops driving, not because our policy says so | **attention** |
| `admin-data` | PDPL erasure past deadline | statutory. The board spec says it in the same words: *"a statutory clock is the one deadline that is not ours to move"* | **attention** when breached |
| `operations-requests` | a rider's bad week — recoverable | the two-hour promise is **ours**; widen it and the breach vanishes | neutral |
| `operations-people` | an applicant waiting | 48h is `slaSource: 'unset'` — **a number nobody set** | neutral |
| `support-fairness` | an appeal unanswered | the 24-hour window is ours | neutral |

**The cap moves from 2 to 3, and changes job.** The fixture's own comment shows the cap
producing a wrong answer: *"Toning it up means retiring one of the two above, and
`support-safety` would not be the one to go."* Three queues qualify under a rule everybody
agrees with, and a cap of two forces one genuine statutory breach to be silent. **The cap was
never the rule — the definition is.** It stays as a **tripwire**, at 3, so that a fourth is a
deliberate act with a reason attached, which is what the original comment says it is for.

`navCounts.test.ts` changes its ceiling to 3 and its failure message to point at the two
clauses above rather than at a number.

**Everything downstream still holds.** Q12's roll-up is unaffected — two inputs, two outputs,
gated on `count > 0`, and `financials-cash` is still its proving fixture. D13's rule that
**alerts never touch nav tone** is *reinforced*: a threshold an operator typed into a form last
Tuesday fails clause 2 by construction, because the deadline is one they set.

---

## 11. R4-11 · Q-114 — the bar a board must clear, applied to Performance

### 11.1 What I will and will not rule

**I will set the bar and apply it.** That is a design ruling and it is mine.

**I will not merge the sub-tabs.** The 34 sub-tabs are **D1**, an owner decision, and
`DECISIONS.md`'s own preamble says a decision is not re-litigated in a spec or a review — *"if
it is wrong, change it here."* Merging five Management boards into three is a **D1 amendment**
and it needs the owner's name on it, exactly as the Report Builder's 35th sub-tab does
(Q-RB-1). I would rather hand the owner a recommendation with the working shown than ship an
IA change nobody signed.

### 11.2 The bar

> **A sub-tab earns its place when it carries at least one number that is (a) computed from a
> store rather than written as a literal, and (b) not already the headline of another sub-tab.**
>
> Two failure modes follow, and they render differently:
>
> - **A measure that exists and has no current value** → the tile renders with an **em-dash**
>   (AC-698). We measure it; today there is nothing.
> - **A measure with no store at all** → **the tile does not render.** Not an em-dash, not a
>   skeleton, not a "coming soon". An em-dash is a claim that the number exists somewhere, and
>   a tile backed by a hardcoded literal is a stronger claim than that: it is a wrong number
>   presented as a right one.

That distinction is the ruling, and it is worth more than the merge. It is also general — it
applies to every `NEW DATA` tile in `05-metrics-content.md`, not just Performance's.

### 11.3 Applied

Performance's two distinctive pieces are retention cohorts (`:13762`) and CSAT/NPS
(`:13786`–`:13791`). Both are **hardcoded literals with no backing store** (F-6). Under the bar
above, **both tiles are absent, not em-dashed.** What remains is cancellation rate, which is
real.

**A sub-tab whose entire rendered content is one tile is a page an operator opens once.** That
is the audit's own conclusion and I agree with it. My recommendation to the owner, for **D15**:

> **Management collapses from five sub-tabs to three: Overview · Risk & Signals · Market &
> Zones.** Performance's surviving content (cancellation rate, the trend charts) merges into
> **Overview**. Growth's promo, referral and incentive tables move to a **`Growth` view on
> Operations › Subscriptions** or keep their own sub-tab — the owner's call, and the tables are
> real content either way (`05-metrics-content.md` F-11 records that the board half shipped and
> the table half did not).

**Until the owner rules, Performance ships as a board with cancellation rate and its charts,
with the two literal-backed tiles absent.** That is honest and it is not embarrassing — it is a
short board, not a fake one. **And it is the state that makes the merge argument visible to the
owner**, which is worth more than padding it.

**Recorded as a D1 amendment request, not as a decision. Routed to the business owner via
product-owner.**

---

## 12. The three signatures. Nothing else needs one.

Each of these is written so the owner can read it, decide, and be done. **Two are §6.2
entries; one is a Rulings-table edit.** None of them blocks any work today — §1's ruling
ships, §7's build ships, §8's build ships — so a decision can take as long as it takes.

### 12.1 §6.2 **D-12** — a categorical chart palette. **My recommendation: DECLINE.**

> | # | Deviation | Suspends | Why |
> |---|---|---|---|
> | **D-12** | **A three-hue categorical chart palette** — `--chart-series-2`, `--chart-series-3` — used **only** for a two-measure single-axis overlay in the Report Builder, never for a group-by, never outside a chart's plot area, never in a badge, a chip, a fill or an icon | §3.7's *"comparison series MUST use the same hue as the primary series, never a second colour"* (for the **series** case only; the **period** case is unchanged and still dotted, same hue) · §6.4's *"MUST NOT introduce a colour that is not a `:root` token"* is **met**, not suspended, because these would be tokens | Two measures on one axis need two hues; dash is spent on the period comparison and cannot also carry measure identity |
>
> **If signed, this is what ships:** `--chart-series` `#2b6ef0` (unchanged) · `--chart-series-2`
> `#b45309` · `--chart-series-3` `#0f766e`. Each clears 4.5:1 on `--ev-surface` (4.574 / 5.022 /
> 5.473). Order of use is fixed and never rotates: series 1 blue, series 2 amber, series 3 teal.
> **At series 4 the chart falls back to small multiples** — there is no fourth hue and there
> will not be one. Every overlaid chart additionally carries **direct end-of-line labels**,
> because the hues are 1.04–1.25:1 apart from each other and colour alone would fail WCAG 1.4.1.
> **`--ev-red` is not in the set and never will be (R5a).**
>
> **What it costs, so the signature is informed:** three new tokens, a §7 pass, direct-label
> layout logic on every chart, and — measured this pass — a fourth series that a deuteranope
> cannot separate from the first (`#5454ed` against `#6060f0`, 1.145:1). **It buys exactly one
> thing: a two-measure overlay.** It does not cover the group-by case, which renders as panels
> either way.
>
> **My recommendation is to decline it**, and §1 explains why in full: the owner's own headline
> example — drivers against passengers — fails on *scale* before it fails on hue, and two
> panels answer it where two colours do not.

### 12.2 R15, amended. **The replacement row, ready to paste.**

> | # | Conflict | Ruling for Eyvar |
> |---|---|---|
> | R15 | Badge, toast and avatar geometry is stated two ways: §1.4 says rounded rectangles (~8px) and never circles; §3.4 says fully-rounded pills, §5.1 says a rounded pill, §3.8 says a circular avatar | **Rounded rectangles, and R15 governs three object classes and no others: badges, toasts and avatars.** The **badge radius is 4px** and the **toast radius 8px** — neither is a stadium pill, and Eyvar's existing `border-radius:999px` badges (`:117`) are a defect under this ruling. **Avatars are 32px circles for a person and 8px rounded squares for a non-person identity** (a corporate account, a workspace, an app): the circle is measured, not eyeballed — the identity avatar's horizontal inset one destination pixel below the top edge is 5px, which a 9-destination-px-radius circle predicts at 4.88 and an 8px rounded square predicts at 1.54 (D7; `design/03-visual-language.md` §4.5, §6). **Everything else takes its radius from the token ladder** — `--radius-sm` 4, `--ev-radius-control` 8, `--ev-radius-card` 8 — and R15 has nothing to say about it. **`rounded-full` is legal outside those three classes only where the shape is the mechanism rather than a style:** a switch's track and thumb, a segmented control's track and its active pill, and a progress or meter track. In each the fully-rounded end is what states that something travels or fills. **A fourth candidate must argue that its geometry is load-bearing, in a ruling, not in a component file.** `DECISIONS.md` **D12**'s narrow exception is withdrawn as unnecessary — the segmented control is covered by the principle, not exempted from the rule. |
>
> **Nothing about the built product changes when this is signed** except five stale code
> comments and one component default (§14). The bulk-action bar stays at 8px; it always
> should have, for its own reason.

### 12.3 §6.2 **D-13** — elevation tier 0.5. **My recommendation: SIGN.**

> | # | Deviation | Suspends | Why |
> |---|---|---|---|
> | **D-13** | **A fourth elevation value, `--ev-shadow-0-5`**, for a **part that is raised inside a control** — not for a surface on the page | **R-3**'s closed set of three tiers (`globals.css`: *"THREE TIERS, A CLOSED SET, a fourth needs a §6.2 entry"*) | Under D7 tier 1 measured to **zero** and now paints nothing, so the ladder runs *nothing → popover → modal*. Tier 2 reaches 18px below at 12% alpha, which on a 28px pill is a smudge two thirds the height of the control. There is no value between them and one is needed |
>
> **Value:** `0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 1px 0 rgb(16 24 40 / 0.04)`. Reach ~2px
> below, ~0 lateral — bounded by the 2px clearance a 28px pill has inside a 32px track, not
> chosen. `offset-x: 0`, so nothing mirrors in Arabic.
>
> **Scope, and it is a categorical boundary rather than a list:** tiers 1–3 elevate a **surface
> on the page**; tier 0.5 elevates a **part inside a control**. Nothing else can qualify,
> because anything else is a surface. **Today it has exactly one consumer:** the segmented
> control's active pill.
>
> **When it is applied the pill's hairline comes off** — one separator, not two. That is the
> point: the built control currently carries two 1px strokes 2px apart, which is the visible
> reason it does not read like your reference.
>
> **My recommendation is to sign it.** It closes the one open item D12 left, it is the smallest
> possible shadow rather than a taste value, and declining it costs nothing today — the control
> keeps shipping as it is.

---

## 13. Deviations

**Two**, and both are in §12 awaiting the owner. **Every other ruling in this document suspends
no `DESIGN.md` rule.**

For the record, six that look like deviations and are not:

| Ruling | Looks like a deviation because | Why it is not |
|---|---|---|
| R4-1 — no palette | it declines to implement §3.7's implied need | §3.7's *"never a second colour"* rule is **upheld**, not suspended. Declining to deviate is not a deviation |
| R4-2 — three §6.4 rows and a fifth page shape | §6.4 is a closed mapping | §6.4's own Rules say *"MUST map any new page to a row in §6.4 before design starts."* **Adding the row is compliance.** The `fraud` row is the worked precedent |
| R4-4 — three new fields on `MetricBoard` | §6.4 forbids introducing new values | §6.4's rule is about **colour, radius, font size, spacing, shadow, duration**. A data field is none of them, and the shapes are already specified in §3.7 |
| R4-5 — the neutral delta | it voids a §3.7 MUST | **R5a** is a ruling and outranks a §3 MUST on the ladder; §3.7's MUST, obeyed literally, produces a **fifth use of red** nobody authorised. And **D7** already replaced §1–§5's visual content. Two independent grounds |
| R4-7 — avatars are circles | R15 says never a circle | **R15 no longer says that.** D7 killed the avatar clause in the shipped document; the code is stale, not deviating |
| R4-10 — `safety` moves to §8.4 | it edits a §6.4 row | A mapping correction on evidence, the `fraud` move's exact precedent and direction reversed |

---

## 14. Edits, file by file

**Mine to make** (`_partials/` + rebuild — `DESIGN.md` is generated and never hand-edited):

| File | Change | Ruling |
|---|---|---|
| `_partials/06-eyvar-mapping.md` §6.4 | **Three rows added**: the auth-card row · the guided-checklist row · the query-builder row. **One row edited**: `safety` moves from the index-table→detail row to the work-queue row, with a `>` note carrying the evidence, in the `fraud` note's form | R4-2, R4-10 |
| `_partials/02-layout-navigation.md` §2.5 | The Rules block's provider-button MUST is struck with its reason (no providers exist — §2.2 of the auth spec); §2.5 D gains the D14 split as a table | R4-2 |
| `_partials/03-data-display.md` §3.7 | The delta colour-coding MUST is annotated **void** (R5a + D7 §4.9). The tile-anatomy order MUST is annotated as superseded by D7 §4.9 and gains the caption slot. **One new Rule** for breakdowns | R4-4, R4-5 |
| `_partials/00-header.md` | R15's row is replaced with §12.2's text — **only after the owner signs** | R4-7 |
| `docs/ref/patterns.md` | Three rows; the fifth page shape; a `leading` note on shape 2; a trap-list line — *"a query builder is not §3.7 customise mode: one commits with `Save`, the other with `Run`"* | R4-2 |
| `docs/ref/rulings.md` | R15's one-line summary follows §12.2 — **after signature** | R4-7 |
| `docs/ref/states.md` | The breakdown's zero-row case added as a worked example of R8's second kind | R4-4 |
| `python docs/06-design-reference/build-design.py` | Run once, after the partial edits | — |

**Not mine — requested, with the ruling to cite:**

| Owner | Change | Ruling |
|---|---|---|
| **utilities-engineer** (`globals.css`) | `--ev-shadow-0-5` + a `shadow-0-5` utility — **only if §12.3 is signed**. `--chart-series-2/3` — **only if §12.1 is signed** | R4-8, R4-1 |
| **frontend-engineer** (`src/components/ui/`) | `avatar.tsx`: default `rounded-full`, add `shape?: 'person' \| 'entity'`, rewrite the R15 header · `badge.tsx`, `button.tsx`, `popover.tsx`, `sonner.tsx`: the four "never a stadium — R15" comments are **mis-citations**; restate each as the token ladder · `tabs.tsx` segmented: pill hairline comes off **when** D-13 lands, not before | R4-7, R4-8 |
| **frontend-engineer** (`src/shell/`) | The hand-off focus rule, generalised — not two call sites · `AccountMenu.tsx`'s two contradictory avatar comments collapse to one · one-shell-layer-at-a-time · `session-expired` closes open layers | R4-9, R4-7, R4-3 |
| **frontend-engineer** (`src/screens/`) | `people/cells.tsx`: delete the local circle class, the primitive carries it now · `metrics/`: build `BreakdownCard` to §4.1's anatomy; `MetricTile` gains the caption line; the page banner slot renders at most one `BoardNotice` · the zone strip's tiles become filter toggles, not anchors | R4-7, R4-4, R4-6 |
| **mock-data-engineer** | `MetricBoard.breakdowns` + `.notices`; `MetricBreakdown`, `MetricBreakdownRow`, `BoardNotice`; `Metric.caption` · `Metric.higherIsBetter`'s doc comment corrected · `route.overlay` gains `onboarding` **only** · `routeTable`: `management-zones` → `['P1','P5']` · `navCounts.ts` starved-count contradiction (§6.5) · `navCounts.test.ts` ceiling 2 → 3 with the two-clause message | R4-4, R4-5, R4-3, R4-6, R4-10 |
| **product-owner** | `00-foundation.md` §3.4 row 5 (§6.3's text) and §4.3 (three layers → four, one at a time) · `04-auth-and-onboarding.md` §4.1 row 7 and §7.3 (`reauth` is a modal) · `06-report-builder.md` §6.5, §7.1, AC-826, AC-828, AC-835, and `grain` gains `'hour'` · `05-metrics-content.md` §6 (Performance's two literal tiles absent, not em-dashed) · **D15 request to the owner** (the Management merge) | R4-2, R4-3, R4-1, R4-4, R4-11 |

---

## 15. What I could not rule, and what would settle it

| # | Open | What would settle it |
|---|---|---|
| **1** | **The Management merge (Q-114 / D15).** I set the bar and applied it; the merge is a **D1 amendment** and D1 is the owner's. | The owner's answer, in `DECISIONS.md`. Nothing is blocked meanwhile — Performance ships short. |
| **2** | **The owner's segmented-control reference image is not in the repo.** I ruled R4-8 from the built control, D12's written description, and measurement. I never saw the image. | Put it in `docs/06-design-reference/` with a filename. Every other visual claim in this project cites a file; this one cannot. |
| **3** | **The Admin › Overview notice's grace period.** I wrote copy for the PDPL erasure notice because that condition is fully computable (`ERASURE_SLA_DAYS = 30`). The legal-documents condition needs a grace-period field that does not exist (`05-metrics-content.md` §12.1 tile 6, `NEW DATA`) — I did **not** write copy against a threshold nobody has set. | product-owner decides whether a grace period exists. Until then that condition is a tile, not a notice. |
| **4** | **`05-metrics-content.md` F-7 (no board-level period).** It touches all eight boards and `03-financials.md` AC-353 depends on it. Not in this docket and I am not ruling on it in passing — it interacts with the report builder's window model and deserves its own pass. | A ruling pass on F-7 + F-13 (staleness) together. They are the same question: *what period is this board, and when is it too old?* |
| **5** | **Whether `Queue recruitment` is a third row action on Zones.** D8's table branches at two versus three, and the legacy page has two levers plus an implicit view. | Confirm the zone row's full action set with product-owner before the table is built. Two → direct controls; three → kebab. |

### R4-12 — one small thing cleared in passing

**W4-F7** — *"the `ratio` unit renders as a bare decimal; `7.0` for 'worst demand-to-supply
ratio' is ambiguous."* It is, and legacy writes `2.4× demand/supply` (`:6953`).

> **Ruling: a `ratio` unit renders as `{value}×`, with the multiplication sign U+00D7, and the
> tile's label carries what it is a ratio of.** So the tile reads **`7.0×`** over the label
> `Worst demand-to-supply ratio`. The `×` is in the value; the operands are in the label; the
> value never carries the operands, because a value that reads `2.4× demand/supply` cannot be
> right-aligned against another number (**R4**) and cannot be translated (**AC-713**).
>
> **In Arabic the `×` stays trailing the number inside a `<bdi>`**, with the numeral run
> isolated — the same fix already applied to four numeral runs on the metric boards.
> `formatRatio` belongs in `src/lib/format/number.ts` beside `formatCount`, which is
> **W4-F5**'s request and this is its fifth call site.
