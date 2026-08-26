# 02 — Visual refinement: the measured diff, nine rulings, and the four states drawn

> ## ⚠ PARTIALLY SUPERSEDED by `03-navattic-language.md` — `DECISIONS.md` D7
>
> D7 replaced the **visual** reference. Everything in this document was measured against
> Shopify, so its colour and density work no longer governs. **Read `03-navattic-language.md`
> §10 for the clause-by-clause ledger.** In short:
>
> | | |
> |---|---|
> | **V1** density (rail 80 · navrow 28 · control 28) | **SUPERSEDED.** `--ev-rail-w: 80` survives on its own label-width reasoning; navrow → 32, control → 32. |
> | **V2** the plain **white** pill | **SUPERSEDED.** The pill is **grey `#e6e8ec` on a near-white nav**. V2's *argument* — the pill only works once the ground is right — survives and was re-verified: 1.172 : 1 against Shopify's 1.192 and V3's 1.182. |
> | **V3** `--ev-bg-nav: #eaecf1` and its derivation | **VOID.** The derivation assumed a nav darker than a grey canvas. The canvas is **white**; the nav is a measured `#f8fafb`. `#eaecf1` is retired. |
> | **V4** the top bar's route trail goes | **SURVIVES** — wayfinding, not colour. |
> | **V5** one page width, no `width` prop | **SURVIVES**, with `--ev-page-pad` replacing its literal 16px. |
> | **V6 / V6d** a count is a quantity, so its chip is neutral | **SURVIVES**; `--ev-nav-chip` is re-derived, and the reasoning is reused for the stat-tile delta chip. |
> | **V7 / V8 / V9** and §4's four states | **SURVIVE** — state design, not colour. |
> | §2.1–§2.6 measurement tables | **SUPERSEDED** — they measure Shopify. |
>
> Nothing below is deleted; the measurements are still the audit trail for how the shell got
> where it is. But **do not build from this document's colours or pixel figures.**

> **Owner:** product-designer. **Consumers:** frontend-engineer (shell + components),
> utilities-engineer (nothing new required — see §7.4).
>
> **Trigger.** The business owner rejected the built shell: *"the page ui isn't clean and
> doesn't resemble or look like shopify by any means"* and *"this also looks off so much."*
> That judgement is correct. This document measures why, rules on it, and supersedes the
> parts of `00-shell.md` that produced it.
>
> **Supersedes** `00-shell.md` §2.1, §2.2, §2.3, §2.4, §3.1, §4 slot 2, §7.1, §8, §11.1,
> §11.2, §12.1. Every superseded clause is restated in §6 below and edited in place.
>
> **Binding decisions received mid-audit** (business owner, via coordinator) and applied
> throughout: **(1)** the sub-tab collapse is removed entirely; **(2)** the active nav state
> is a plain white pill, no marker, no hairline; **(3)** rail labels become
> `Exec · Ops · Finance · Support · Admin`; **(4)** page layout must be consistent across
> routes.
>
> **Rulings applied:** R3 R5a R6 R7 R8 R9 R13 R15 R17 R19 · **§6.2 D-2** · §7.7
>
> **Reference measured** (all under `docs/06-design-reference/shopify-admin-web/`):
> `03-products/products-list-default.webp` ·
> `04-customers/customers-list-single-customer.webp` ·
> `04-customers/customers-empty-state.webp` ·
> `04-customers/customer-detail-no-orders-yet.webp`
>
> **Build measured:** `http://localhost:5199` at 1280 / 1440 / 1920, Playwright computed
> styles + `getBoundingClientRect`. Scripts: `scratch/measure.mjs`, `measure2.mjs`,
> `measure3.mjs`, `measure4.mjs`.

---

## 1. Method, and the scale factor everything depends on

The Mobbin captures are **768 × 523 px**, which is a downscale, so no measurement is valid
until the scale is fixed. It is fixed by two independently-known Shopify values, and they
agree:

| Known value | Measured in the frame | Implied scale |
|---|---:|---:|
| Polaris nav column = 240 CSS px | 128 img px (`#EBEBEB` run, x 0–127) | 1.875 |
| Shopify top bar = 56 CSS px | 30 img px (`#1A1A1A` run, y 0–29) | 1.875 |
| Viewport = 1440 CSS px | 768 img px | 1.875 |

**S = 1.875.** Every "Shopify" number below is `image px × 1.875`, rounded to the nearest
whole px, and I say when a value is at the edge of what the downscale can resolve.

**What the downscale can and cannot resolve.** Flat fills ≥ 4 px wide survive exactly —
`#EBEBEB`, `#F1F1F1`, `#DDDDDD`, `#2F2F2F` are read straight off. Heights of filled blocks
resolve to ±1 CSS px. **1 px strokes and text colours do not survive** — a 1 px stem
becomes 0.53 img px and blends with its ground, so every measured text grey reads lighter
than truth. I therefore use the frames for *geometry and fills*, and for text I use only the
ordering (which grey is darker), never a hex. Our own values are computed styles and are
exact.

---

## 2. The measurement table

Shopify at 1440 × 900. Eyvar at 1440 × 900, `/operations/trips` and `/management/overview`.
**Verdict column reads against §6.2 D-2**, which sanctions values *smaller* than Shopify's on
the 4 px grid and sanctions nothing larger.

### 2.1 The level-2 nav column

| Property | Shopify | Eyvar now | Δ | Verdict |
|---|---:|---:|---:|---|
| Column width | 240 | 224 | −16 | **OK** — denser, on grid |
| Row height | **28** | **32** | **+4** | **FAIL** — D-2 violated in the wrong direction |
| Row gap | **0** | **2** | **+2** | **FAIL** |
| **Row pitch** | **28** | **34** | **+6 (+21 %)** | **FAIL** — this is the single biggest cause |
| Gap between nav groups (extra over pitch) | 8 | 13 | +5 | **FAIL**, and off the 4 px grid |
| Column inline padding (pill inset) | 12 | 4 | −8 | **FAIL** — too tight; pill reads as a full-width band |
| Row padding-inline | 8 | 10 | +2 | **FAIL** (marginal) |
| Label inline-start, from column edge | 48 (icon column) / 48 (sub-item) | 14 | — | not comparable — we have no icon at level 2 |
| Label size | 13 | 13 | 0 | **OK** |
| Label line-height | ~20 | 20 | 0 | **OK** |
| Column header height | n/a | 40 | — | **FAIL** — see 2.5, it misaligns with the 48 px top bar |

Row pitch derivation, from the frame: nav text-run tops at y = 43, 58, 73, 88, 103, 118, 133,
148 → **15 img px, exactly, eight times** → 28.1 CSS. The active pill measured 67.7 → 82.5 =
14.8 img → 27.8 CSS. Pill height ≡ pitch, therefore **gap 0**.
Ours, from `getBoundingClientRect`: rows at y = 89, 123, 157, 191, 225, 259, 293 → **34, seven
times**, with `height: 32px`.

### 2.2 The level-1 rail (no Shopify equivalent — measured against D-2 only)

**The build and `00-shell.md` have already diverged here**, so this table has three columns.
Where they differ, the build is what the business owner saw and is what I measured.

| Property | `00-shell.md` §1.2 / §2.1 says | Build actually renders | **Ruled** |
|---|---:|---:|---:|
| Rail width | 80 | **88** (`globals.css`) | **80** |
| Tile size | 72 × 56 | **79 × 48** | 72 × **44** |
| Tile gap | 4 | 4 | 4 |
| **Tile pitch** | 60 | **52** | **48** |
| Five-tile block | 300 | 260 | **236** |
| Glyph | 20, stroke 1.5 | 20, stroke 1.5 | unchanged |
| Glyph → label gap | — | 4 | 4 |
| Label | 12 / 500 | **11 / 600 / lh 11** | 11 / 600 / **lh 12** |
| Rail block padding | 4 | 8 / 4 | 8 / 4 |
| Internal sum | — | 6.5 + 20 + 4 + 11 + 6.5 = 48 (**off-grid**) | 4 + 20 + 4 + 12 + 4 = **44** (on grid) |

Two things follow.

**The tile is off the 4 px grid by construction.** `h-12` with `justify-center` produces 6.5 px
of padding above and below, which D-2 explicitly does not sanction (*"smaller values on the 4px
grid — it does not sanction off-grid values"*, D18 precedent). Fixing the internals to sum to 44
puts it back on grid **and** makes it denser. The build's 11 px/600 label is better than the
spec's 12 px/500 and is kept; §2.1's ASCII is corrected to match.

**Rail width returns to 80, which is what the spec said all along.** `00-shell.md` §0.2 and
§1.2 both specify 80. `globals.css` widened it to 88 during the build with the comment
*"88, not 80: at 80 the usable [label width is too small]"* — a reasonable call for
`Management` / `Operations` / `Financials` / `Customer Support`. Business-owner decision 3
replaces those with `Exec · Ops · Finance · Support · Admin`. The longest is `Finance` ≈ 42 px
at 11 px/600; usable width at rail 80 is 80 − 8 (rail padding) − 8 (tile padding) = **64 px**.
The reason for 88 is gone, so 88 is now just slack, and the token returns to its specified
value rather than taking a new one.

### 2.3 Type actually rendered (computed, not tokens)

| Where | Shopify | Eyvar now | Verdict |
|---|---:|---:|---|
| Body / base | 13 | **13** | **OK** — parity, D-2's headline number is met |
| Nav row label | 13 | 13 / 400 (600 when active) | **OK** |
| Rail tile label | n/a | 11 / 600 | **OK** |
| Top bar route trail | n/a (Shopify has none) | 13 / 600 + 13 / 400 | **FAIL** — see V4, it is deleted |
| Top bar search placeholder | 13 | 13 | **OK** |
| Page `<h1>` | **20 / 600 / lh 28** | **17 / 600 / lh 24** | **OK** — denser, D-2 |
| Page subtitle | **does not exist** | 12 / 400 `--ev-text-2` | **FAIL** — see V4 |
| Count badge digits | ~11 | 11 / 600 | **OK** |
| Status badge | 12 | 12 (`--ev-badge`) | **OK** |

### 2.4 Every grey in the nav

Contrast ratios computed by WCAG relative luminance. Shopify fills are read directly off flat
runs and are exact; Shopify *text* colours are omitted for the reason in §1.

| Role | Shopify | Eyvar now | Ratio (Shopify) | Ratio (ours) | Verdict |
|---|---|---|---:|---:|---|
| Nav ground | `#EBEBEB` | `#eef0f3` | — | — | — |
| Page canvas | `#F1F1F1` | `#eef0f3` | — | — | — |
| **Nav vs canvas** | darker by a step | **identical** | **1.055 : 1** | **1.000 : 1** | **FAIL** |
| Active pill on nav | `#FFFFFF` | `#ffffff` | 1.192 : 1 | 1.142 : 1 | **FAIL** — pill under-reads |
| Active pill border | **none** | 1 px, transparent | — | — | OK (decision 2) |
| Active leading marker | **none** | 3 px `--ev-blue` | — | — | **removed** (decision 2) |
| Count chip fill | `#DDDDDD` (**darker than nav**) | `#f8f8f5` (**lighter than nav**) | **1.139 : 1** | **1.073 : 1** | **FAIL** — wrong direction |
| Warning chip fill on nav | n/a — Shopify does not tone nav counts | `#faeeda` | — | **1.005 : 1** | **FAIL** — see below |
| Inactive label | mid grey | `#6b6b68` | — | 4.683 : 1 | OK |
| Active label | near-black | `#1a1a18` | — | 15.4 : 1 | OK |

**The `1.005 : 1` is the finding of this whole audit.** Our warning chip has *the same
luminance as the nav it sits on*. It has no edge, no shape and no weight — it is pure hue on
a grey field, which the eye reads as a **stain**, not as a chip. Meanwhile our neutral chip is
*lighter* than its ground (1.073 : 1 in the wrong direction), so it reads as a smudge of
glare. Shopify's chip is `#DDDDDD` on `#EBEBEB` — **darker** than its ground by a measurable
1.139 : 1, so it reads as a plate with a number on it.

That is the mechanism behind *"the colour has stopped meaning anything"*: the neutral chip is
invisible, so everything got promoted to `attention` to become visible at all, and the
promoted chip has no luminance contrast either, so the result is a column of coloured haze.
**Fix the neutral chip and the pressure to tone disappears.** See V3.

It is also the mechanism behind the 3 px marker and the hairline. The white pill on
`#eef0f3` is 1.142 : 1 — too weak to read as a shape, so a border and a marker were added to
prop it up. **Shopify needs neither because its nav ground is darker.** Darken the ground and
the pill carries itself, which is exactly what decision 2 assumes.

### 2.5 Top bar, search field, count badge

| Property | Shopify | Eyvar now | Verdict |
|---|---:|---:|---|
| Top bar height | 56 | **48** | **OK** — denser, D-2, and D-3 fixed 48 |
| Top bar span | full viewport | content region only (x 312 → 1440) | **OK** — deliberate, D-3; the nav columns carry their own headers |
| Search field inline size | **480** | **400** | **OK** — denser |
| Search field height | 32 | **28** | **OK** — `--ev-control-h` |
| Search field centring | on the **viewport** (centre 719 of 1440) | on the **content region** (centre 876 of 312–1440) | **OK** — follows from the span difference |
| Search field fill | `#2F2F2F` on `#1A1A1A` (dark bar) | `#ffffff` on `#eef0f3` | **OK** — D-3 chose a light bar |
| Count badge height | 20 | **16** | **OK** — denser |
| Count badge min-width | ~24 | 16 | **OK** |
| Count badge radius | pill (stadium) | **8 px** | **OK** — **R15** binds, badges are rounded rectangles |
| Count badge fill | `#DDDDDD` | `#f8f8f5` / `#faeeda` | **FAIL** — see 2.4 |
| Count badge text | mid grey | `#6b6b68` / `#633806` | **FAIL** — see V3 |
| **Horizontal rules near the top** | one, at y = 56 | **two, at y = 40 and y = 48** | **FAIL** |

The last row is a defect nobody has named yet and it is very visible. The sub-tab column
header is `h-10` (**40 px**) with a `border-b`; the top bar is `h-topbar` (**48 px**) with a
`border-b`. They are the same rule doing the same job at two different heights, 8 px apart,
running the full width of the shell. The first sub-tab row then starts at y = 44 — between
them. Three horizontal events in 8 px is why the top of the screen looks unresolved.

### 2.6 The page header block, and the layout inconsistency

| Property | Shopify | Eyvar now | Verdict |
|---|---:|---:|---|
| Content inline padding | 24 | **16** | **OK** — denser |
| Top bar → title box | 24 | 16 | **OK** — denser |
| Title | 20 / 600 / lh 28 | 17 / 600 / lh 24 | **OK** |
| Subtitle | **none** | 12 / lh 16, + 4 gap | **FAIL** — V4 |
| Title block → first card | **24** | 12 (`pb-3`) | **too tight once the subtitle goes** — ruled to 16 |
| Header block total height | 28 | 56 | **FAIL** — 2× for no information |
| Top bar → first card | 76 | 72 | OK |

**The inconsistency, measured.** `SingleColumnPage`'s `width: 'full' | 'capped'` moves the
`<h1>`:

| Viewport | `full` route `<h1>` x | `capped` route `<h1>` x | Jump |
|---:|---:|---:|---:|
| 1440 | 328 | 332 | 4 px |
| **1920** | **328** | **572** | **244 px** |

At 1920 the title of `Operations › Trips` and the title of `Operations › Overview` are 244 px
apart. Clicking between two sibling sub-tabs slides the whole page sideways. That is the
business owner's *"see how layout isn't consistent in the pages"*, and it is caused by my own
§7.1. See V5.

---

## 3. The rulings

### V1 — Density: the corrected numbers

`--ev-navrow-h` is not governed by D-2's §3.1 clause at all. D-2 suspends §1.2 (type ramp),
§1.3 (spacing scale) and **§3.1 (table row height)** by name; the nav row lives in §2.3. So
the binding constraint is not a pixel figure — R13 voids those — it is **the relationship**
§2.3 and §3.1 describe together, which the frames confirm: **the nav row is shorter than the
data row.** Shopify: nav 28, text table row ~40. Ours: nav 32, table row 32. The relationship
is broken, and a nav row as tall as a data row is precisely why the nav reads as a stack of
cards rather than a list of links.

| Token / value | Was | **Is** | Justification |
|---|---:|---:|---|
| `--ev-navrow-h` | 32 | **28** | One 4 px step below `--ev-row-h: 32`, restoring the §2.3 ↔ §3.1 relationship. Equals the measured Shopify 28. |
| sub-tab row gap | 2 | **0** | Measured Shopify 0. Pitch 28. |
| sub-tab group separator (extra) | 13 | **8** | Measured Shopify 8. Back on the 4 px grid. |
| sub-tab column inline padding | 4 | **8** | Denser than Shopify's 12, on grid. At 4 the pill touches both edges and stops reading as a pill. |
| sub-tab row padding-inline | 10 | **8** | On grid; label lands 16 px from the column edge. |
| sub-tab list padding-block-start | 4 | **8** | First row clears the header rule cleanly. |
| column header height | 40 | **48** | **One rule at y = 48 across the whole shell.** Ends the 40/48 double-rule. |
| `--ev-rail-w` | 88 (build) | **80** (spec's own value) | The build's reason for widening to 88 is void under decision 3. |
| rail tile height | 48 | **44** | 4 + 20 + 4 + 12 + 4, every term on the 4 px grid. |
| rail tile gap | 4 | 4 | unchanged; pitch 48. |
| rail tile label line-height | 11 | **12** | Makes the tile sum to 44 on grid. |
| page inline padding | 16 | 16 | unchanged — already denser than Shopify's 24. |
| page-header padding-block-start | 16 | 16 | unchanged. |
| page-header → first card | 12 | **16** | The subtitle is leaving (V4); 12 was only tolerable because a second line sat above it. Shopify uses 24; 16 is denser and on grid. |

**Why 28 and not 24.** 24 would be denser still, and I considered it. §7.7 forbids citing D-2
against an accessibility minimum, and at 24 the 20 px line box leaves 2 px of padding with no
room for a visible focus indicator inside the row. 28 keeps the indicator inside the pill.
**Consequence:** because the gap is now 0, the nav's focus ring must be `ring-2 ring-inset`,
not `ring-2 ring-offset-2` — an offset ring would overlap the neighbouring row. This applies
to the nav only; the rest of the product keeps the offset ring.

**Net effect:** ten sub-tab rows go from 340 px to 280 px, the five-tile rail block from 260
to 236, the page header from 56 to 40, and the double rule at the top becomes one.

### V2 — The active nav treatment: a plain white pill, and *why* it now works

Decision 2 already removed the 3 px marker and the hairline. This ruling records the reason,
because the reason determines a second change that is not optional.

Measured on `products-list-default.webp`, active row "Products": across x = 2–15 at the pill's
leading edge, `|R − B| = 0` at every pixel — **there is no chroma anywhere**, so no blue
marker. Around the pill's top and bottom edges the minimum luminance over x = 30–110 is
229–248 against a `#EBEBEB` ground — **no darker stroke**, so no border. The pill is
`#FFFFFF`, 28 px tall, 216 px wide, inset 12 px, radius ~8, and that is the entire treatment.

**It works there and did not work here because of the ground, not the pill.** White on
`#EBEBEB` is 1.192 : 1. White on our `#eef0f3` is 1.142 : 1 — 4 % weaker, which is the
difference between a shape and a smudge. The marker and the hairline were compensation for a
ground that was too light. **Removing them without darkening the ground makes the active state
weaker than what was rejected.** So V3's `--ev-bg-nav` is a dependency of decision 2, not a
separate nicety.

**The ruled treatment, both levels:**

| | Resting | Hover | Active | Focus |
|---|---|---|---|---|
| Sub-tab row | no fill; label `--ev-text-2` | fill `#f2f4f7`; label `--ev-ink` | fill `--ev-surface` `#ffffff`; label `--ev-ink`; weight **600** | `ring-2 ring-inset ring-ring` |
| Rail tile | no fill; glyph + label `--ev-text-2` | fill `#f2f4f7` | fill `--ev-surface`; glyph `--ev-blue`; label `--ev-ink`; weight 600 | `ring-2 ring-inset ring-ring` |

No border in any cell. No marker in any cell. No shadow — the pill is inset into the nav, not
raised off it, and R-3's three-tier scale has no tier for "slightly". Weight 600 on the active
label is the second signal that makes the state legible to anyone who cannot see the 1.2 : 1
fill, which is what makes the fill-only treatment acceptable at all.

### V3 — The nav's greys: two new tokens, each pinned by a measurement

| Token | Value | What pins it to exactly this value |
|---|---|---|
| **`--ev-bg-nav`** | **`#eaecf1`** | The darkest grey in the `--ev-bg` hue family at which `--ev-text-2` (`#6b6b68`, the inactive nav label, 13 px) still clears **4.5 : 1**. Measured: `#eaecf1` → **4.523 : 1** ✓; `#e9ebf0` → 4.482 ✗; `#e7e9ee` → 4.401 ✗. One shade darker fails AA, so this is not a taste value, it is the boundary. |
| **`--ev-nav-chip`** | **`#dadee6`** | Chosen so the chip's contrast *against the nav* matches Shopify's measured chip: `#dadee6` on `#eaecf1` = **1.141 : 1**; Shopify `#DDDDDD` on `#EBEBEB` = **1.139 : 1**. Parity to three decimals. |

Resulting palette, all verified:

| Pair | Ratio | Against |
|---|---:|---|
| white pill on `--ev-bg-nav` | **1.182 : 1** | Shopify 1.192 — parity |
| `--ev-bg-nav` on `--ev-bg` (canvas) | **1.035 : 1** | Shopify 1.055 — the nav is now a distinct region |
| `--ev-nav-chip` on `--ev-bg-nav` | **1.141 : 1** | Shopify 1.139 — parity |
| `--ev-ink` on `--ev-nav-chip` | **12.92 : 1** | chip digits are ink, not grey — see below |
| `--ev-text-2` on `--ev-bg-nav` | **4.523 : 1** | AA ✓ |
| `--ev-ink` on `--ev-bg-nav` | **14.75 : 1** | AAA ✓ |

**Chip digits are `--ev-ink`, not `--ev-text-2`.** `--ev-text-2` on any chip fill dark enough
to read as a plate lands at 3.8–4.2 : 1, which fails AA for 11 px text. Shopify's own chip
digits fail here too (~2.2 : 1 measured); we do not copy that. Ink digits on a quiet plate is
the resolution: **the plate is quiet, the number is legible.** It also reads correctly — a
count is data, and data is ink.

Hover fill `#f2f4f7` sits between the nav ground and the active white, so hover and active
remain distinguishable when adjacent.

**Both tokens go in `globals.css`, which I do not own.** They are handed to the frontend
engineer in §7.1 with their derivations, so the values can be checked rather than trusted.

### V4 — The duplicated header: the top bar's route trail goes, and so does the subtitle

The screen currently says the same thing three times:

```
top bar          Overview  ›  Where the shift stands right now
page header      Overview
                 Where the shift stands right now
```

**The top bar's route trail is deleted.** `00-shell.md` §4 slot 2 justified it as wayfinding
and aligned it deliberately to the `<h1>` beneath. That justification rested on a state that
no longer exists: at 1280 the sub-tab column was collapsed on first run, so the trail was the
only place the sub-tab's name appeared. **Business-owner decision 1 removes the collapse, so
the column is always visible, and it already renders the workspace name in its header and the
sub-tab name in the active pill.** The trail now restates the two things immediately to its
inline-start. Shopify's top bar carries no route echo either — measured on
`products-list-default.webp`, the bar holds the store mark, a centred search field, a bell and
an account chip, and nothing else.

**The page subtitle is deleted from index routes.** `routeTable.subtitleKey` stops being
rendered by `SubTabScreen`. §7.1's own wireframe shows the subtitle as
`4 218 captains · 611 riders` — **a metadata line, derived from the record set**. The route
table supplies a *static description* instead, and the build faithfully rendered the static
description. Those are different things and only one of them earns 20 px on every page,
forever, on all 34 routes.

**The ruled contract:** `PageHeader`'s second row is a **metadata line, never a description.**
It carries only content derived from the data on screen — counts, a record's identifiers, a
timestamp. If it cannot change when the data changes, it does not belong there. A sub-tab that
genuinely needs explaining gets that explanation in its **first-run empty state**, where the
operator is actually stuck, and nowhere else.

**What the `<h1>` keeps.** It stays. It is the accessible page name, §8 requires it, and it
scrolls with the content while the top bar does not. It will look thin on the placeholder
screens because `SubTabScreen` passes no actions — **do not "fix" that.** Shopify's header
gets its weight from the action cluster on the same line (`Export` `Import` `Add customer`,
measured on `customers-list-single-customer.webp`), and ours will too once real screens pass
`primaryAction` and `secondaryActions`.

**The top bar after this ruling** (slots renumbered in §6.4):

```
├─────────────────────────────────────────────────────────────────────────────┤
│ ←        [🔍  Search customers, trips, tickets           ⌘ K]                │
│                                    Mine 4 · On call: Layla   🔔²  ▣          │
├─────────────────────────────────────────────────────────────────────────────┤
   ▲                    ▲                                ▲       ▲   ▲   ▲
   1 back (detail only) 2 search                         3a      3b  3c  3d
```

The inline-start is left empty on index routes. It is not filled with anything.

### V5 — One page width. `SingleColumnPage`'s `width` prop is deleted

**`width: 'full' | 'capped'` is removed. Every single-column page is `full`.**

The 244 px title jump at 1920 (§2.6) is not a tuning problem, it is the prop working as
designed. Two sibling sub-tabs in the same workspace cannot put their `<h1>` in two different
places; nothing else about them differs, so the operator reads the movement as breakage.

**Why `full` and not `capped` everywhere.** Capping the *page* centres the whole block and
moves the header with it — that is what causes the jump. Shopify keeps alignment fixed by
running index pages full-bleed with a uniform page padding (measured: content starts at
x = 264 on both `products-list-default.webp` and `customers-empty-state.webp`, which are a
dense table and an empty state respectively). The page frame is the constant; what varies is
what sits inside it.

**Measure is not abandoned, it is moved down one level.** The problem `capped` existed to
solve — a settings form or a paragraph running to 1600 px — is real. It is solved where it
occurs:

| Content | Constraint | Where it lives |
|---|---|---|
| Page frame, all 34 routes | full width, 16 px inline padding | `SingleColumnPage` |
| Metric tile row (P5) | `repeat(auto-fill, minmax(268px, 1fr))`, capped at 4 columns above `--ev-bp-wide`, 3 below | the tile grid |
| Form field column (P3 / P4) | `max-width: 640px` inside its card, inline-start aligned | §10.1 layout B |
| Prose, empty-state body | `max-width: 384px` | `EmptyState` |

`--ev-page-max: 1120px` survives as a token and keeps its one remaining consumer,
`FullBleedEditorShell` (§7.3), which is outside the layout and has no sibling to be
inconsistent with.

**This changes `00-shell.md` §7.1** and it is my error: §7.1 wrote the two modes and the build
implemented them exactly. The spec is what failed.

### V6 — Badge tone: a count is a quantity, and a sum has no status

Measured on the running build at 1440, `/operations/trips`: **8 of 11 visible nav badges are
`warning` peach**, including **4 of the 5 rail tiles**.

```
WARN     6  Management        WARN    12  My Work
WARN    35  Operations        WARN     3  Requests
neut     2  Financials        neut     8  Subscriptions
WARN    10  Support           neut     1  Corporate Accounts
WARN   99+  Admin             WARN     4  Trip Assurance
                              WARN     7  People
```

Three separate things are wrong, and the brief was right that one of them is the fixture.

**(a) The roll-up amplifies.** Q12 is sound as an invariant — *any tone on a tile must be
explained by a visible row with the same tone and a non-zero count* — but a workspace tile
sums ~7 rows, so **one** toned row in seven turns the whole tile amber. With 9 of 34 sub-tabs
marked `attention`, four of five workspaces contain at least one and the rail is permanently
amber. The invariant is satisfied at every step and the result is still meaningless.

**Ruling: the rail tile badge is `neutral`, always.** Its count remains the sum of visible
rows (**AC-27's count clause survives verbatim**); it loses its tone. The justification is not
expedience: a workspace tile's number is a **sum of heterogeneous queues** — three
applications, four expiring documents and one dispute — and a sum of different kinds of thing
has no single status to report. Only the row knows what its number means. AC-27's tone
assertion is superseded; `workspaceBadge` returns `tone: 'neutral'` unconditionally.

**(b) The fixture is lying.** 9 of 34 rows carry `attention`. `attention` is currently being
used to mean *"this queue has items in it"*, which is what the **count** already says. It must
mean **"this queue is past the point where it is still fine"** — breached SLA, expired
document, unclaimed beyond threshold. On a healthy shift that is 0–2 rows out of 34, not 9.
Specifically: `operations-subscriptions` (8) and `operations-corporate` (1) are correctly
`neutral` today and prove the distinction already exists in the data — it is simply not being
applied.

**The reviewable invariant:** *if more than two of the 34 sub-tabs are toned at once in a
normal-shift fixture, the fixture is wrong.* That is checkable in a test, and it belongs in
one — handed to mock-data-engineer in §7.3.

**(c) Shopify tones nothing.** Measured on `customers-list-single-customer.webp`, the `Orders`
row's count badge: fill `#DDDDDD`, mid-grey digits, 20 px tall, pill radius. Achromatic. I am
**not** ruling us to zero tone — a dispatch console genuinely needs "this queue is breaching"
in peripheral vision, and that is a real difference from a storefront admin. But the licence
is now narrow: **one tone (`warning`, R17 — there is only one), on a sub-tab row only, meaning
breached, rarely.** Never on a tile. Never red (R5a). Never a sixth tone (R7).

**(d) And it only worked at all because neutral was invisible.** §2.4: the neutral chip is
1.073 : 1 *lighter* than its ground. V3's `--ev-nav-chip` at 1.141 : 1 *darker* gives the
neutral chip a shape, which is what removes the incentive to reach for colour.

### V7 — The 1280 collapsed state: **withdrawn**

Question 6 of the brief is answered by business-owner decision 1 and I am not re-opening it.
Recorded for the file: at 1280 the geometry is rail **80** + column 224 = **304 px** of nav
and **976 px** of content (was 88 + 224 = 312 / 1128 — V1 returns 8 px to the content region).
976 px still fits a 2 : 1 detail exactly (640 + 16 + 320), which is the arithmetic §0.1 already
recorded as the honest cost of the single breakpoint. `--ev-bp-wide: 1344px` survives and keeps
its two remaining consumers: the detail right rail and the metric-tile grid.

### V8 — The states are not unstyled; three specific things are wrong

The brief reports the error state rendering as *"a bare white bar reading `Couldn't load
Overview.`"*. **That bar is not the error state.** `SubTabScreen`'s `else` branch — the
**content** branch, reached when the fetch *succeeds* — renders a bare card containing
`t('state.cardError.message')`. A success path is displaying an error string. `ErrorState`
itself is built correctly and has heading, body and `Try again`; it is simply never reached
on a healthy load.

Three real defects remain, and §4 draws the fix:

1. **No surface.** All four states render directly on the grey canvas with `py-8`/`py-16` and
   no card. On `--ev-bg` a centred grey paragraph with no ground reads as broken chrome, not
   as a designed state. Measured on `customers-empty-state.webp`: Shopify's empty state is
   **inside a card**, full content width, **442 px tall**, with the `Learn more about
   customers.` line **outside and beneath it** — which is exactly V-11 as our own §11.1
   already says, but the card is the part we dropped.
2. **No page header on the route states.** `NotFoundScreen` and `ForbiddenScreen` render a
   bare `ErrorState` with no `<h1>` at all, so the page has no accessible name.
3. **The `card` scope has no retry by default** and the callers pass none, so a failed card is
   a dead end.

### V9 — No icon on the error state

The brief asks for an icon. **Ruled against**, and I want the reason on the record so it is not
re-litigated:

- The icon that wants to be there is a warning triangle, and it wants to be red or amber. Red
  is enumerated to four uses by **R5a** and a page error is not among them. Amber is **R17**'s
  single warning tone, and a failed fetch is not a warning — it is a failure, a different
  thing with a different action.
- A grey triangle is decoration, and `ErrorState`'s own header already commits to §7.5: *"an
  error is never carried by colour: it is carried by words."*
- **R8** licenses an illustration only on a whole-page zero-records-ever empty. An error is not
  an empty; drawing one implies the data does not exist, which is a lie the operator will act
  on. The same logic that bars the illustration bars its miniature.

What the error state gets instead is what actually helps: **a card to sit on, a heading, a
body that names the next move, and a retry.**

---

## 4. The four states, drawn

All four render **inside a card** on `--ev-bg`, at the content region's full width, beneath a
real page header. Card is `--ev-surface`, `--ev-radius-card` 12 px, 1 px `--ev-hairline`,
`--ev-shadow-1`.

### 4.1 Loading

`LoadingSkeleton` (B-04) is correct as built and needs no change — ten pattern-shaped variants,
no centred spinner, `aria-busy` once, killed by `prefers-reduced-motion` (AC-35, AC-69). Two
additions only:

```
┌─ page header ──────────────────────────────────────────────────────────┐
│ Trips                                            [ Export ] [ ▾ ]      │  ← renders IMMEDIATELY,
└────────────────────────────────────────────────────────────────────────┘    never a skeleton
┌─ card ─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓                      │  toolbar
│ ───────────────────────────────────────────────────────────────────────│
│  ▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓                            │  header row
│  ▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓  ▓▓▓▓  ▓▓▓▓▓▓▓▓                       │  × 8 rows,
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓  ▓▓▓▓▓▓▓  ▓▓▓                          │  --ev-row-h pitch
└────────────────────────────────────────────────────────────────────────┘
```

1. **The page header renders in full during loading** — title, badges and the action cluster,
   with actions **disabled in place**, never absent. The title comes from the route table and
   is known before the fetch starts. A header that appears after the data is a layout shift on
   every navigation.
2. **Nav count badges are the only shell skeleton** (§11.3). With V3's chip they skeletonise as
   a `--ev-nav-chip` plate at the chip's exact size, so nothing moves when the number lands.

Announcement: one `LiveRegionAnnouncer` call, polite — `Loading {resource}` — not eight bars.

### 4.2 Empty — kind 1, `first-run` (whole page, zero records ever)

The only state that gets an illustration (**R8**).

```
┌─ page header ──────────────────────────────────────────────────────────┐
│ Captains                                                               │  ← actions that the
└────────────────────────────────────────────────────────────────────────┘    empty state repeats
┌─ card ─────────────────────────────────────────────────────────────────┐    are OMITTED here
│                                                                        │
│                          ┌──────────────┐                              │  ↕ 64 above
│                          │              │                              │
│                          │  144 × 144   │                              │  illustration 144²
│                          │              │                              │  (Shopify measured 146²)
│                          └──────────────┘                              │
│                                                                        │  ↕ 20
│              Every captain, their documents and their pay              │  15 / 600 --ev-ink
│                                                                        │  ↕ 8
│         Approve applications, track expiring licences and see          │  13 / --ev-text-2
│              who is on the road right now. Start by inviting           │  max-width 384
│                        your first captain.                             │
│                                                                        │  ↕ 16
│              [ Import captains ]  [ Invite captain ]                   │  secondary + primary
│                                                                        │  ↕ 64 below
└────────────────────────────────────────────────────────────────────────┘
                    Learn more about captains.                              ↕ 16, OUTSIDE the card
```

**Copy, final:**

| Slot | String |
|---|---|
| Heading | `Every captain, their documents and their pay` |
| Body | `Approve applications, track expiring licences and see who is on the road right now. Start by inviting your first captain.` |
| Secondary | `Import captains` |
| Primary | `Invite captain` |
| Below card | `Learn more about captains.` |

The heading names **what the section is for**, never the absence of data — never `No captains
yet`. Full sentences take a period; the heading is a phrase and does not (**R6**). Buttons are
verbs. No exclamation marks.

**New rule, from the reference.** On `customers-empty-state.webp` Shopify **omits**
`Export` / `Import` / `Add customer` from the page header, though they are present on the
populated list (`customers-list-single-customer.webp`). §11.1 currently says unavailable
actions render *disabled and visible*. That rule is about actions that **cannot work**;
`Invite captain` works fine with zero records — it has **moved**. So: **on a `first-run` empty,
a header action that the empty state's own action row repeats is omitted from the header, not
disabled.** Actions that are genuinely impossible with zero records (`Export`) stay, disabled.
One action, one place.

Illustration: `--ev-blue` / `--ev-hairline` on `currentColor`, abstract records, **not** a
mascot. 144 px, on the 4 px grid, denser than Shopify's measured 146 (D-2). Does not mirror
in Arabic (§9.5 — it is an object, it has no reading direction).

### 4.3 Empty — kind 2, `no-match` (filtered to zero, or an empty card)

**One grey sentence.** No illustration, no heading (**R8**, **AC-37**).

```
┌─ card ─────────────────────────────────────────────────────────────────┐
│  [Search…]  [Status ▾]  [Zone ▾]  [Documents ▾]        [Sort ⇅]        │  ← toolbar STAYS,
│ ───────────────────────────────────────────────────────────────────────│    so the query that
│                                                                        │    returned nothing
│              No captains match these filters.                          │    can be changed
│                                                                        │
│                        [ Clear filters ]                               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

Padding-block 40 (`py-10`). Sentence `--ev-text-2`, 13 px, centred, takes a period (**R6**).
Action is a plain button and appears **only when one genuinely exists** — `Clear filters` when
`table.isFiltered`, nothing otherwise.

Copy: `No {resource} match these filters.` — the existing `table.noMatch` key is correct.
For a genuinely empty card that is not filtered (an empty timeline, a record with no notes):
one sentence naming the fact, no action. `This captain has no documents on file.`

**Never `first-run` here.** `useIndexTable`'s `isFiltered` decides mechanically. The
illustration says *this does not exist*; a filter result saying that is a lie the operator will
act on.

### 4.4 Error — `page` scope

```
┌─ page header ──────────────────────────────────────────────────────────┐
│ Trips                                       [ Export ] [ Add trip ]    │  ← header renders,
└────────────────────────────────────────────────────────────────────────┘    actions DISABLED
┌─ card ─────────────────────────────────────────────────────────────────┐    in place
│                                                                        │
│                                                                        │  ↕ 48
│                     Couldn't load Trips                                │  15 / 600 --ev-ink
│                                                                        │  ↕ 8
│          The data didn't arrive. Try again, or pick another            │  13 / --ev-text-2
│                        sub-tab from the list.                          │  max-width 384
│                                                                        │  ↕ 16
│                        [ Try again ]                                   │  variant="default" (R3)
│                                                                        │  ↕ 48
└────────────────────────────────────────────────────────────────────────┘
```

**No icon (V9). No illustration (R8). No red, no amber, no colour of any kind (R5a, §7.5).**

**The shell stays alive.** Rail, sub-tab column and top bar keep working; the operator
navigates away without a reload (**AC-24**, §9.2's *"single most important shell behaviour"*).

`Try again` is `variant="default"` — the one primary on a screen showing nothing else (**R3**),
and the header's own primary is disabled, so there is no collision.

**Copy, final:**

| Key | String |
|---|---|
| `state.pageError.title` | `Couldn't load {resource}` — phrase, no period (**R6**) |
| `state.pageError.body` | `The data didn't arrive. Try again, or pick another sub-tab from the list.` |
| `state.pageError.action` | `Try again` |

Existing strings are correct; the body gains `from the list` so it points at something the
operator can see. No `please`, no `failed`, no `invalid`, no blame (**AC-39**).

Focus moves to the heading on render; `role="alert"` on the container.

### 4.5 Error — `card` scope

```
┌─ card ─────────────────────────────────────────────────────────────────┐
│  [Search…]  [Status ▾]  [Zone ▾]                       [Sort ⇅]        │  ← toolbar STAYS
│ ───────────────────────────────────────────────────────────────────────│
│                                                                        │
│              Couldn't load trips. The filters are unchanged.           │
│                                                                        │
│                        [ Try again ]                                   │  variant="ghost"
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

`py-8`. **`action` becomes required in this scope** — a failed card with no retry is a dead
end, and every current caller omits it. Copy:
`state.cardError.message` → `Couldn't load {resource}. The filters are unchanged.` The second
clause exists because the first question an operator asks is whether their query survived.

### 4.6 Error — `row` scope

Replaces that row's **action cell only**. Every other row stays interactive and **no
page-level banner appears** (**AC-41**).

```
│ ▸ TRP-4471   Layla A.    Riyadh    12:04   SAR 38.00   Couldn't cancel this trip. [Try again] │
```

11 px, `--ev-text-2`, inline. Copy `state.rowError.message` → `Couldn't {verb} this {object}.`
Correct as built.

### 4.7 Forbidden

```
┌─ page header ──────────────────────────────────────────────────────────┐
│ Cash & Reconciliation                                                  │  ← the <h1> RENDERS.
└────────────────────────────────────────────────────────────────────────┘    A page with no
┌─ card ─────────────────────────────────────────────────────────────────┐    name is not a page
│                                                                        │
│                                                                        │  ↕ 48
│              You don't have access to this page                        │  15 / 600
│                                                                        │  ↕ 8
│      This page needs the "finance.reconcile" permission. An owner      │  13 / --ev-text-2
│         can grant it in Admin › Team & Access.                         │  max-width 384
│                                                                        │  ↕ 16
│                      [ Go to overview ]                                │  variant="default"
│                                                                        │  ↕ 48
└────────────────────────────────────────────────────────────────────────┘
```

Same shape as 4.4 — a forbidden page is an error the operator cannot retry, so the only
difference is the action. **The route's title still renders as the `<h1>`**: the operator
typed or clicked something and is owed the name of what they asked for. That is not a
disclosure risk — the route table's titles are not secret, only its data is.

**Copy is correct as built and stays.** It names the permission, names who can grant it, and
names where — three facts, each of which the operator needs to go ask for access. The action
goes to `session.landingRoute` (**AC-07**), which is an overview for every role, so the label
is true for every role.

**`NotFoundScreen` takes the same shape**, with `This page doesn't exist` /
`Check the address, or pick a sub-tab from the list.` / `Go to overview`, and — the one
difference — **no `<h1>`**, because there is no route and therefore no name. Its card is
preceded by an empty page-header block so the card lands at the same y as every other state.

### 4.8 The state matrix, so nothing is missed

| | Page header | Card | Illustration | Heading | Body | Action |
|---|---|---|---|---|---|---|
| Loading | ✔ actions disabled | ✔ (skeleton outline) | — | — | — | — |
| Content | ✔ | ✔ | — | — | — | ✔ |
| Empty `first-run` | ✔ repeated actions omitted | ✔ | **✔ 144²** | ✔ | ✔ | ✔ ≥ 1 |
| Empty `no-match` | ✔ | ✔ + toolbar | — | — | ✔ one sentence | only if real |
| Error `page` | ✔ actions disabled | ✔ | — | ✔ | ✔ | ✔ `Try again` |
| Error `card` | ✔ | ✔ + toolbar | — | — | ✔ | ✔ **required** |
| Error `row` | ✔ | ✔ | — | — | ✔ inline | ✔ |
| Forbidden | ✔ title only | ✔ | — | ✔ | ✔ | ✔ `Go to overview` |
| Not found | **✗ no title** | ✔ | — | ✔ | ✔ | ✔ `Go to overview` |

---

## 5. The fix list, in order, most visible first

Work straight down. Each item is independently shippable.

| # | Fix | Files | Ruling |
|---:|---|---|---|
| **1** | Add `--ev-bg-nav: #eaecf1` and `--ev-nav-chip: #dadee6`. Apply `--ev-bg-nav` to the rail and the sub-tab column (they currently use `bg-background`). | `globals.css`, `ModuleRail`, `PageNav` | V3 |
| **2** | `--ev-navrow-h: 32px` → **`28px`**. Sub-tab row gap → **0**. Group separator → **8**. Column inline padding 4 → **8**. Row padding-inline 10 → **8**. List padding-block-start → **8**. | `globals.css`, `PageNav` | V1 |
| **3** | Sub-tab column header `h-10` → **`h-topbar`** (48). One rule at y = 48 across the shell. | `PageNav` | V1, §2.5 |
| **4** | Delete the top bar's route trail (slot 2) entirely. Inline-start is empty on index routes. | `TopBar` | V4 |
| **5** | Delete the subtitle from `SubTabScreen`; stop passing `row.subtitleKey`. Page-header `pb-3` → **`pb-4`**. | `SubTabScreen`, `PageHeader` | V4 |
| **6** | Delete `SingleColumnPage`'s `width` prop; every page is full width. Update all call sites (`SubTabScreen`, `RouteStates`). | `PageShell`, `SubTabScreen`, `RouteStates` | V5 |
| **7** | `workspaceBadge` returns `tone: 'neutral'` unconditionally. Nav chip uses `--ev-nav-chip` + `--ev-ink`; the rare `warning` row keeps `--ev-amber-lt` + `--ev-amber-dk`. | `navBadges.ts`, `ModuleRail`, `PageNav` | V6 |
| **8** | Re-tone the fixture: `attention` only where a queue is **breached**. Expect 0–2 of 34, not 9. | `navCounts.ts` (mock-data-engineer) | V6 |
| **9** | **Fix the content branch**: `SubTabScreen`'s `else` renders `state.cardError.message` on a *successful* load. Replace with a real content placeholder. | `SubTabScreen` | V8 |
| **10** | Put all four states **inside a card**. Add `card?: boolean` (default `true`) to `EmptyState` and `ErrorState`, or wrap at the call site — engineer's choice, but the default must be carded. | `EmptyState`, `ErrorState` | V8, §4 |
| **11** | `NotFoundScreen` / `ForbiddenScreen`: render a `PageHeader`. Forbidden gets the route's title as `<h1>`; not-found gets an empty header block. | `RouteStates` | V8, §4.7 |
| **12** | `ErrorState` `card` scope: make `action` required in the type. | `ErrorState` | V8 |
| **13** | Rail: tile 48 → **44** (4 + 20 + 4 + 12 + 4), label line-height 11 → **12**, `--ev-rail-w` 88 → **80** (RTL override 96 → **88**). | `globals.css`, `ModuleRail` | V1, V2 |
| **14** | Nav focus ring → `ring-2 ring-inset` (nav only; the rest of the product keeps `ring-offset-2`). Forced by row gap 0. | `ModuleRail`, `PageNav` | V1 |
| **15** | `EmptyState` `first-run`: illustration `w-40` (160) → **`w-36`** (144). Padding-block 40 → **64**. `learnMore` gap `pt-3` → **`pt-4`**. | `EmptyState`, `PageShell` | §4.2 |
| **16** | Copy: `state.pageError.body` gains `from the list`; `state.cardError.message` gains `The filters are unchanged.` | `dictionaries.ts` | §4.4, §4.5 |
| **17** | `PageHeader`: rename `subtitle` → `meta` and document it as data-derived only. | `PageHeader` | V4 |

Items 1–5 are the ones the business owner will see. Item 1 is a prerequisite for decision 2
not making the active state *worse* than what was rejected (V2), so it goes first.

---

## 6. Amendments to `00-shell.md`

Applied in place. Each entry names the clause and what replaced it.

| §  | Was | Is |
|---|---|---|
| **§0.1** | 1344 governs the sub-tab collapse, the detail rail and the tile grid | The collapse clause is struck (decision 1). Two consumers remain. |
| **§0.2** | Rail 80 px rejected; 88 chosen for label width | Rail **80**; labels `Exec · Ops · Finance · Support · Admin` (decision 3). The short label is the tile's **visible and accessible** name — the WCAG 2.5.3 argument that justified a short visible label with a long `aria-label` **breaks**, because "Operations" does not contain "Ops". Full name survives as the sub-tab column header. |
| **§1.2** | `--ev-navrow-h: 32`, `--ev-rail-w: 88` | 28 / 80. Adds `--ev-bg-nav`, `--ev-nav-chip`. |
| **§2.1 / §2.3** | Active tile = white pill **+ 3 px `--ev-marker`** | Plain white pill. No marker, no border, no shadow. Weight 600 label. (decision 2, V2) |
| **§2.2** | Five tiles, full workspace names | Five tiles, short names; tile 44 px, pitch 48. |
| **§2.4** | Tile tone rolls up from visible rows (Q12) | **Count** rolls up; **tone does not**. Tile is always neutral. (V6) |
| **§2.5** | The sub-tab disclosure (rail popover) | **Struck entirely.** No collapse, no popover, no `useNavCollapse`. AC-32 and AC-33 are void. |
| **§3.1** | Row 32, gap 2, inset 4, active pill + hairline + marker | Row 28, gap 0, inset 8, plain white pill. Column header 48. |
| **§3.2 / §3.3** | Collapsed popover; the collapse rule restated | **Struck entirely.** |
| **§4 slot 2** | `Title › Subtitle` route trail in the top bar | **Struck.** Slots renumber 1, 2, 3a–3d. (V4) |
| **§7.1** | `width: 'full' \| 'capped'`, cap 1120 centred | **One width.** Prop deleted. Measure moves to the tile grid, the form column and the prose block. (V5) |
| **§8** | `subtitle` — second row, 12 px | **`meta`** — data-derived only. A static description is not a subtitle. (V4) |
| **§11.1** | Illustration ~160 px; unavailable header actions disabled and visible | 144 px. Adds: a header action **repeated** by the empty state's action row is **omitted**, not disabled. (§4.2) |
| **§11.2** | Three scopes; `card` action optional | `card` action **required**. All scopes render **inside a card**. (V8) |
| **§12.1** | Badge palette, five tones | Unchanged for content badges. Nav count badges get their own two fills (V3) and are not the content badge. |
| **§15** | Deviations | Adds V1 (nav row 28 ≠ §2.3's observed figure — R13 makes that non-binding), V5 (one page width), V6 (tile tone suppressed against Q12), V9 (no icon on error). |

---

## 7. Handoff

### 7.1 To **frontend-engineer** (shell + components)

Fix list §5, in order. Two things need saying explicitly:

- **`globals.css` is yours, not mine.** Items 1, 2 and 13 change it. Every value is derived in
  §2.4 and V3 with the arithmetic shown, so check them rather than trusting them. In
  particular `--ev-bg-nav: #eaecf1` is not a taste value — it is the darkest grey at which
  `--ev-text-2` clears 4.5 : 1 (4.523; one shade darker is 4.482 and fails).
- **Item 1 before decision 2 ships.** Removing the marker and the hairline from a pill sitting
  at 1.142 : 1 makes the active state weaker than the version that was rejected. The darker
  ground is what carries it (1.182 : 1, Shopify parity).

**Decision left to you:** item 10 — whether the card comes from a `card` prop on `EmptyState` /
`ErrorState` or from a wrapper at the call site. Either is fine; the default must be carded, and
`ErrorState scope="row"` must never be.

### 7.2 To **utilities-engineer**

**Nothing new is required, and that is deliberate.** No new hook falls out of this: the row
gap, the ground colour and the chip fill are all CSS, and `workspaceBadge` (item 7) is a
one-line change inside an existing pure function with existing tests. If item 10 lands as a
wrapper rather than a prop, that wrapper is a component, not a helper. Please confirm you agree
rather than building ahead of it.

### 7.3 To **mock-data-engineer**

Item 8, and the test that keeps it honest: **`navCounts` fixtures must not tone more than two
of the 34 sub-tabs at once.** `attention` means *breached*, not *non-empty*. Nine is currently
a lie, and it is the lie that made the rail permanently amber.

### 7.4 Findings raised, not decided by me

1. **`--ev-page-max: 1120px` now has one consumer** (`FullBleedEditorShell`). It survives, but
   if the editor later caps its own form column the token becomes dead. Flagging early.
2. **`routeTable.subtitleKey` becomes unrendered** by V4. I have not deleted the field or its
   34 strings — a route table field is product data and its removal is product-owner scope.
   It should either be deleted or repurposed as the `meta` line's source. **Raising to
   product-owner.**
3. **AC-27's tone clause and AC-32 / AC-33 are void** (V6, decision 1). Someone owns updating
   the acceptance criteria; it is not me.
4. **§11.1's "disabled and visible" rule has an exception now** (§4.2, from
   `customers-empty-state.webp`). I have written it into §11.1 as a carve-out rather than
   weakening the rule, because the rule is right for actions that *cannot work* and this is
   about actions that have *moved*.
