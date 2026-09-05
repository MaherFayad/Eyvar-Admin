# 03 — The visual language: the token set, the anatomy, and the one recorded departure

**Status:** binding. This is `DECISIONS.md` **D7**: the token layer — colour, spacing, radii,
type and table style — as Eyvar draws it. It governs `00-shell.md` §1.2 · §1.3 · §2.1 · §2.3 ·
§3.1 · §9.1 wherever the two disagree; §10 is the exhaustive ledger, so nothing is left live
and contradicting.

**What is *not* touched.** §7 accessibility, §8 the Eyvar-only patterns, §9 bidirectionality.
Every ratio here is computed against the token that sits on it. A value that would drop a
contrast ratio is not adopted; §3 gives the four cases and the corrections (§3.4, §7).

**How the language is drawn today.** `scripts/harness/people.mjs`, `table-density.mjs` and
`chrome.mjs` render the shell, the toolbar and the table at 1280px in both languages and both
themes.

---

## 1. The token set

**This is the whole re-skin.** Every value below replaces the same-named value in
`src/styles/globals.css`. **Names are unchanged** — the point of a token namespace is that
a re-skin is one file, not a rename touching 38 primitives.

`M` = measured directly off a frame. `D` = derived, with the arithmetic given.
`X` = not evidenced by the reference; the reason is stated.

### 1.1 Surfaces and greys

| Token | Was | **Becomes** | | Evidence |
|---|---|---|---|---|
| `--ev-bg` | `#eef0f3` | **`#ffffff`** | M | The content region is **pure white, edge to edge, in all 15 frames**. `82923d3f` y=440 x=144–767 → `#FFFFFF`, n = 624 px, one colour. Same on `02b895df`, `6a08206b`, `c53f19d9`, `546b7d98`, `79a31934`. |
| `--ev-surface` | `#ffffff` | **`#ffffff`** | M | Card, tile, popover, drawer, table body. **Identical to `--ev-bg` on purpose** — see §4.2 and D-11. Both names are kept so the two can be separated again without touching a component. |
| `--ev-bg2` | `#f8f8f5` | **`#f5f7f9`** | M | **The one subdued fill**, and it does six jobs: the icon rail, the table header row, the filter-chip strip, a card's section-header strip, a promo band, an inner empty panel. Sampled flat over 4 000 px on `cfa43315` (rail), 324 px on `82923d3f` (table header), 2 640 px on `82923d3f` (chip strip), 4 000 px on `5b908c10` (promo band). All four → `#F5F7F9`. |
| `--ev-bg-nav` | `#eaecf1` | **`#f8fafb`** | M | Both nav columns. `cfa43315` x=40–130 y=300–440 → `#F8FAFB` (n = 12 600); `6a08206b` → `#F9FBFB` (n = 15 300). The two agree inside WebP chroma noise; `#F8FAFB` is the mode. **The V3 derivation is void** — see §3.2. |
| `--ev-nav-hover` | `#f2f4f7` | **`#f1f3f6`** | D | Must sit between the nav ground and the active pill so hover and active stay separable. nav `1.000` → hover `1.062 : 1` → pill `1.172 : 1`. Same hue relation (g − r = 2, b − r = 5). |
| `--ev-nav-chip` | `#dadee6` | **`#e3e6ec`** | D | The count plate on a **resting** nav row: `1.194 : 1` darker than `#f8fafb`. On an **active** row the plate becomes `--ev-surface` (white), `1.227 : 1` against the pill. One rule — *the chip always steps away from whatever it sits on* — two grounds, no new token. Digits stay `--ev-ink`. **Not evidenced:** the reference shows no nav count. |
| `--ev-hairline` | `#e4e2da` | **`#e1e4ea`** | D | Card border, control border, both nav seams, table outer edge. Recovered by deficit integration, not by eyedropper — a 1 px stroke at S = 1.875 covers 53.3 % of one destination pixel, so `255 − B = 1.875 × Σdeficit`. `04592c4f` card bottom edge: Σ = 18.33 → B ≈ 221. `cfa43315` nav seam: Σ ≈ 12.1 → B ≈ 229. **The recoverable band is Y ≈ 221–230**; `#e1e4ea` has Y = 227.8 and keeps the ramp's hue (g − r = 3, b − r = 9). |
| `--ev-hairline2` | `#dddbd3` | **`#eceef2`** | D | **Meaning flips: this is now the LIGHTER hairline**, used for rules *inside* a table (row separators and the vertical column rules). Same method: `82923d3f` row rule Σ = 9.46 → B ≈ 237; column rule Σ = 9.27 → B ≈ 238. `#eceef2` has Y = 237.9. `--ev-hairline2` has **zero call sites in `src/` today**, so the flip breaks nothing — but the comment in `globals.css` must be rewritten or the next engineer will use it as a section rule. |
| `--ev-hairline-strong` | `#8a8a85` | **`#828b99`** | D | R19's one licensed use — the resting outline of an unchecked checkbox or radio — re-derived against the new grounds. It must clear 3 : 1 on **every** surface a control can sit on: white `3.441`, `#f5f7f9` `3.205`, `#f8fafb` `3.287`. `#8c95a3` was tried first and fails on two of the three (`2.816`, `2.889`). Stays lighter than `--ev-text-2` (`3.205` vs `4.791` on the worst ground) so it cannot be read as text. |

### 1.2 Ink

| Token | Was | **Becomes** | | Evidence |
|---|---|---|---|---|
| `--ev-ink` | `#1a1a18` | **`#171a21`** | D | Cool near-black. Darkest sampled ink: `#0C1116` (primary-button fill, a large flat area, `6a08206b`) and `#202128` (the `Visitors` h1, `82923d3f`). Both are cool (b − r = 8–10). `#171a21` sits between them: **17.411 : 1 on white**, 16.212 on `#f5f7f9`, 16.630 on the nav. |
| `--ev-text-2` | `#6b6b68` | **`#6a6e71`** | D | **The reference's own value fails §7 and this is the correction the brief asked for.** Sampled resting nav label `#707477`. It passes on white (`4.715`) and on the nav (`4.504`) but measures **`4.391 : 1` on `--ev-bg2` `#f5f7f9`** — and that is exactly where the column headers live. The **nearest** same-hue compliant neighbour is `#6e7275` (`4.519`), which leaves 0.019 of headroom and would break on any 1-unit rounding. `#6a6e71` is three steps from the sample — inside a 1.875× downscale's floor for a 13 px glyph — holds the sampled hue exactly (g − r = 4, b − r = 7) and clears every ground: white `5.145`, `#f8fafb` `4.914`, `#f5f7f9` `4.791`. |
| `--ev-text-3` | `#9b9b97` | **`#9aa1ac`** | D | `2.603 : 1` — **still fails AA, still decorative only, still never a text colour.** Kept only because the token exists and deleting a name is a rename. The reference is *worse* here: its identity-cell second line samples `#A7A9AB` = **2.358 : 1** and its `Not identified` placeholder `#929496` = **3.044 : 1**. Eyvar does not copy either — §4.6. |

### 1.3 Accent and the five tones

| Token | Was | **Becomes** | | Evidence |
|---|---|---|---|---|
| `--ev-blue` | `#185fa5` | **`#2b6ef0`** | M | Sampled **exactly**, twice, over 3 550 px of flat bar fill in `04592c4f`. `4.574 : 1` on white. **Its roles are: focus ring, chart series, selection, and a link on white only.** It is *not* the primary-action fill any more (D-1 void) and it is not a text colour on any tinted ground: `4.259` on `#f5f7f9` and `4.006` on `#eaf0fe` both fail AA. |
| `--ev-blue-lt` | `#e6f1fb` | **`#eaf0fe`** | D | `#2b6ef0` at 10 % on white. Cross-check: the measured chart area fill is `#F0F5FA`/`#ECF2FB` (`5b908c10`), i.e. 8–10 %. |
| `--ev-blue-dk` | `#0c447c` | **`#1b51c4`** | D | **The link and info-label colour, and the only blue permitted on a tinted ground.** White `6.952`, `#f5f7f9` `6.474`, `#eaf0fe` `6.089`. R3's old consequence — *blue carries actions, so links need a darker blue plus an underline* — survives for a **new** reason: `--ev-blue` itself is only 4.574 on white and fails everywhere else. |
| `--ev-green` | `#27500a` | **`#15653c`** | D | Success label. `#e7f6ec` `6.351`, white `7.098`. |
| `--ev-green-lt` | `#eaf3de` | **`#e7f6ec`** | D | Success fill, re-hued out of an olive into the cool-neutral family the rest of the set uses. |
| `--ev-amber` | `#e8a33d` | **`#b45309`** | D | **This closes a real §7 defect.** The old value was `1.88 : 1` and carried a comment saying "graphic only — never a text colour", which is a way of writing down that it fails. `#b45309` measures **`4.623 : 1` on the warning fill**, so the warning *icon* — a meaningful graphic under §7.5 — finally passes on its own ground. |
| `--ev-amber-lt` | `#faeeda` | **`#fff4e6`** | M | Sampled exactly off the one semantic surface the reference contains: the `Deprecation notice` banner in `79a31934`, n = 800 px flat. |
| `--ev-amber-dk` | `#633806` | **`#7a3e12`** | D | Warning label. `#fff4e6` `7.656`, white `8.316`. The sampled label was `#633422` (`9.456` on its own fill) — a warm brown; `#7a3e12` is the same family, one step brighter, and keeps AAA. |
| `--ev-red` | `#a32d2d` | **`#b42318`** | D | R5a's four uses only. `#fef0ee` `5.921`, white `6.574`, white-on-red `6.574`, `#f5f7f9` `6.122`. Passes as a destructive-button fill *and* as the 3 px breached-row marker (3 : 1 needed, 6.574 delivered). |
| `--ev-red-lt` | `#fcebeb` | **`#fef0ee`** | D | Critical banner fill. |

**The five tones are unchanged as a set — R7 still closes it at five, and there is still no
red badge (R5).** `new` is still an outline over `--ev-blue`; its *label* must be
`--ev-blue-dk`, because `--ev-blue` is 4.259 on `#f5f7f9` and 4.006 on `#eaf0fe`.

**Banner borders.** The reference's warning banner carries a 1 px border warmer and darker
than its fill (`79a31934` y=177 and y=219). Reproduced without five new tokens:

```
border: 1px solid color-mix(in srgb, var(--tone-{x}-foreground) 12%, transparent);
```

Verified: `--ev-amber-dk` at 12 % over `#fff4e6`, downsampled at 53.3 % coverage, predicts
`#F8EADB`; the frame shows `#F8EDDF`.

### 1.4 Geometry

| Token | Was | **Becomes** | | Evidence |
|---|---|---|---|---|
| `--ev-bp-wide` | `1344px` | **`1344px`** | — | Untouched. D2/D5 own it. There is still exactly one breakpoint. |
| `--ev-rail-w` | `80px` | **`80px`** | — | Untouched. An icon-only rail fits in **53 ± 2 px**, but Eyvar's rail carries a label under each glyph by D-4 and the label sets the width. 80px is the label's figure, not the glyph's. |
| `--ev-subnav-w` | `224px` | **`224px`** | — | Untouched. Measured **214 ± 4** ((142.5 − 28.5) × 1.875). 224 is inside two destination pixels of that and is already load-bearing in D5's 1280 arithmetic (80 + 224 = 304). Changing it to buy 10 px is not worth re-deriving AC-31. |
| `--ev-topbar-h` | `48px` | **`52px`** | M | App content begins at destination y = 5 (rows 0–4 are window chrome, not product UI); the top bar's bottom border is at y = 32.5. (32.5 − 5) × 1.875 = **51.6**. 52 is on the 4 px grid. The **sidebar brand row is the same height** and the two align — `cfa43315` brand ink centre y = 18 → 24.4 px from the app top, i.e. the centre of a 52 px row. |
| `--ev-shellbar-h` | `32px` | **`32px`** | X | No impersonation/offline strip in the reference. Unchanged. |
| `--ev-navrow-h` | `28px` | **`32px`** | M | Nav item pitch = 17.33 destination px = **32.5**. Active pill height = 17.5 destination px = **32.8**. Pill and pitch coincide, so the gap is 0. The §2.3 ↔ §3.1 relationship D-10 exists to protect — *the nav row is shorter than the data row* — still holds at 32 < 40. |
| `--ev-row-h` | `32px` | **`40px`** | D | The reference's leanest table row is **41 px** (`6a08206b`, two-line member cell, no avatar: destination y = 135 → 157). 40 is the nearest grid value. See §5 for why this is a rise, not a loss. |
| `--ev-row-h-media` | `44px` | **`56px`** | D | The reference's avatar row is **62 px** (`82923d3f`/`223f15e5`/`02b895df`: separators at destination y = 187, 220, 253, 286, 319, 352 — pitch 33 exactly, ×1.875 = 61.9). Its geometry is 32 px avatar + 14/14 padding. Eyvar takes 32 px avatar + 12/12 = **56**, one 8 px step tighter — inside R13's "the relationship binds, the pixels do not". |
| `--ev-row-h-head` | *new* | **`32px`** | M | **The one added token.** Table header row: destination y = 139 → 154 = 16 px = **30**, and `6a08206b` gives y = 118 → 134 = 17 px = **32**. Declared rather than smuggled as a literal, per D15. |
| `--ev-control-h` | `28px` | **`32px`** | M | Search input `82923d3f`: border centres y = 84 → 99.5 = **29.1**. Primary button `6a08206b`: y = 50.3 → 64.5 = **26.6**. Filter chip `82923d3f`: y = 110.5 → 126.5 = **30**. Mean 28.6, spread 3.4 — **below the measurement floor**. 32 is the nearest grid value that also equals `--ev-navrow-h`, which is what the reference shows (a chip and a nav pill are the same height in `cfa43315`). |
| `--ev-control-h-lg` | `36px` | **`40px`** | D | One 8 px step above the compact control, matching the compact/data-row step. Not evidenced — the reference has no in-form control. |
| `--ev-page-pad` | *new* | **`32px`** | D | **The second added token, and the single largest deliberate departure in this document.** See D-2′ in §5. |
| `--ev-page-max` | `1120px` | **`1120px`** | — | One consumer (the full-bleed editor). Untouched. |
| `--ev-detail-rail-w` | `320px` | **`320px`** | X | Not evidenced. Untouched — AC-34's 640 + 16 + 320 = 976 arithmetic depends on it. |
| `--ev-monitor-aside-w` | `340px` | **`340px`** | X | Not evidenced. Untouched (AC-31). |
| `--ev-drawer-w` | `406px` | **`480px`** | M | `9eb629ea`/`1ef8248f`/`79a31934`: the drawer's leading edge is at destination x = 505.5, the frame ends at 767.5 → 262 × 1.875 = **491**. 480 is the nearest 16 px value and leaves 976 − 480 = 496 px of page visible at the 1280 floor. **R13's named-figure carve-out is spent here** — see §6. |
| `--ev-radius-card` | `12px` | **`8px`** | M | Stat tile `02b895df` top-left corner: horizontal inset is 1 destination px at 1 px below the top edge. A 12 px radius predicts 3 destination px there; an 8 px radius predicts 1.5; a 6 px radius predicts 0.9. **12 is falsified; the band is 6–8.** |
| `--ev-radius-control` | `8px` | **`8px`** | M | Active nav pill `cfa43315`: left edge moves 38 → 34 over five rows, an inset of 4 destination px = 7.5 px. Unchanged, and now equal to the card radius. R15's ladder survives lower down: the badge radius is 4 px (`--radius-sm`), the card 8. |
| `--ev-marker` | `3px` | **`3px`** | — | R5a's breached-row edge and the SLA track. Untouched. |
| `--ev-live-loop` | `1800ms` | **`1800ms`** | — | R18. Untouched. |

### 1.5 Elevation — all three re-derived

The set is **low-chrome, and the old, heavier elevation values do not survive it.**

| Token | **Becomes** | | Evidence |
|---|---|---|---|
| `--ev-shadow-1` | `0 1px 2px 0 rgb(16 24 40 / 0.04)` | D | **Measured value: zero.** `02b895df` stat tile and `04592c4f` card both go from border pixel to `#FFFFFF` in one row — no falloff at all. Cards in the reference are carried by border and radius alone. Specified at the faintest non-zero value rather than `none` for two reasons: a `--ev-hairline` border is only `1.274 : 1` on white, and a tier whose value is `none` invites someone to delete the tier. |
| `--ev-shadow-2` | `0 8px 24px -2px rgb(16 24 40 / 0.12), 0 2px 6px -2px rgb(16 24 40 / 0.06)` | D | Popover falloff, `6a08206b` row menu over clean white: **below** the edge the ground recovers over 10 destination px (≈ 19 px), peaking at ≈ 7 % of black; **beside** it over 7 destination px (≈ 13 px) at ≈ 3 %. Solving `spread + blur/2 = 13` and `offsetY + spread + blur/2 = 20` gives offsetY ≈ 7, blur ≈ 26; rounded to the grid, `0 8px 24px -2px` reaches 18 below and 10 beside. Nominal alpha 0.12 lands ≈ 6–7 % at the edge with a 24 px blur. **The old tier 2 (`0 2px 8px -2px`) reaches 6 px below — it is a third of what the reference shows.** |
| `--ev-shadow-3` | `0 20px 48px -12px rgb(16 24 40 / 0.24), 0 6px 12px -6px rgb(16 24 40 / 0.10)` | X | **Not evidenced — there is no modal in the 15 frames.** Derived by applying R-3's own tier-2 → tier-3 ratio (≈ 2.5× offset, 2× blur, 2× alpha) to the new tier 2. Flagged: the first modal built against this must be reviewed by eye. |

Every tier stays `offset-x: 0`, so nothing mirrors in Arabic and none of it belongs under
the `:root:lang(ar)` hook. The shadow colour moves from `rgb(0 0 0)` to **`rgb(16 24 40)`**,
the cool near-black the rest of the ramp uses.

### 1.6 Type — the scale barely moves, and that is the finding

| Token | Was | **Becomes** | | Evidence (cap/x-height in destination px, ÷ 0.727 / 0.546 for Inter-class metrics) |
|---|---|---|---|---|
| `--text-2xs` | `11px / 16` | **`11px / 16`** | X | Badge numeral. Not separably measurable at this scale. Unchanged. |
| `--text-xs` | `12px / 16` | **`12px / 16`** | M | Section heading `Analyze` (`cfa43315`): cap 4.5 destination px → 8.4 px → **11.6**. Page subtitle (`6a08206b`): x-height 3.75 → 7.0 px → **12.8**. |
| `--text-sm` | `13px / 20` | **`13px / 20`** | M | **Body. Unchanged, and this matters.** The identity-cell name, the nav label and the drawer section header all measure a cap height of ≈10.3px, which a 13px face gives. The floor here is ±1px and 13 is inside it on every sample. **13px is the body size everywhere.** |
| `--text-base` | `15px / 20` | **`15px / 20`** | M | Sidebar brand (`cfa43315`): cap 6.5 destination px → 12.2 px → **16.8**. Unchanged. |
| `--text-lg` | `17px / 24` | **`17px / 24`** | M | Card title `Step breakdown` (`04592c4f`): cap 6.5 → 12.2 → **16.8**. Stat value `20m 10s` (`79a31934`): figure height 6.75 → 12.7 → **17.4**. **Its role narrows** — it is now the card / drawer-section / stat-value size, not the page title. |
| `--text-xl` | *Tailwind default 20/28* | **`22px / 28`** | M | **The page title, and the one real change to the ramp.** `Visitors` (`82923d3f`): cap 9 destination px → 16.9 px → **23.2**; x-height 7 → 13.1 → **24.0**. `Members` (`6a08206b`): cap 8.75 → 16.4 → **22.6**. Band is 22–24; 22 chosen. This redefines an existing Tailwind name — it adds no `--ev-*` token. |

`--font-sans` / `--font-mono` are unchanged (R-5, §14). The Arabic type floors under
`:root:lang(ar)` are unchanged and still bind; the new `--text-xl` needs a floor there —
**`--text-xl: 24px; --text-xl--line-height: 32px;`** — for the same reason every other step
has one (§9.7 / §14).

### 1.7 Arabic dimension overrides

`:root:lang(ar)` currently raises seven dimensions by one step. The step survives; the base
values moved, so the overrides move with them:

| | Latin | Arabic |
|---|---|---|
| `--ev-rail-w` | 80 | **88** (unchanged) |
| `--ev-subnav-w` | 224 | **256** (unchanged) |
| `--ev-navrow-h` | 32 | **36** |
| `--ev-row-h` | 40 | **44** |
| `--ev-row-h-media` | 56 | **60** |
| `--ev-row-h-head` | 32 | **36** |
| `--ev-control-h` | 32 | **36** |
| `--ev-control-h-lg` | 40 | **44** |

Eight dimensions now, not seven. `--ev-page-pad` does **not** vary by language — it is a
gutter, not a line box, and Arabic does not need more of it.

### 1.8 shadcn slot remaps

Two slots change meaning and both are load-bearing:

```
--primary:            var(--ev-ink)      /* WAS --ev-blue. D-1 is void. */
--primary-foreground: var(--ev-surface)
--ring:               var(--ev-blue)     /* unchanged — and it still passes, §7 */
```

`--primary: var(--ev-ink)` is how the near-black primary button is expressed **without a
new token**. White on `#171a21` is `17.411 : 1`. Everything else in layer 2 keeps its
mapping; the values underneath it moved.

---

## 2. What is measured and what is derived

Flat fills, block edges and row rhythm are **measured** in the browser against the token layer
and the harness captures, and every figure below carries its measurement.

Four classes of value are **derived by rule rather than measured**, and each says so at its own
row:

- **1px strokes.** A hairline is integrated from the luminance deficit across the transition,
  never read with an eyedropper. The recoverable band is ±5 in Y and the band is given.
- **Small-text colour.** Text colours in §1.2 are anchored on the largest flat ink in the set
  (the primary-button fill) and on the ratio §7 requires, not on glyph samples.
- **Radii below 6px, and the difference between 6 and 8.** Reported as a band.
- **States and surfaces the resting page never shows** — modal, toast, tooltip, scrim,
  disabled, hover, focus ring, error, success and critical tone, the nav count, dark mode.
  Marked `X` throughout and **derived by rule, never invented by eye.**

---

## 3. The five values that needed an argument

Most of §1 is a value and its ratio. Five carried an argument, and the arguments are here so
nobody re-derives them.

### 3.1 The accent is `#2B6EF0`, and it is not the primary fill

`--ev-blue` is `#2B6EF0` exactly. It is **4.574 : 1 on white** and fails AA on every tinted
ground, which is why it is not the primary-action fill and not the link colour. Its three
roles are the focus ring, chart series and selection. See §1.3.

### 3.2 The content region is white and the nav is one step darker

The tonal ladder, darkest first:

```
icon rail  #F5F7F9   ← darkest
nav column #F8FAFB
content    #FFFFFF   ← lightest
```

The content region is **white**; `#F5F7F9` is the icon rail and the tinted strips, not a
canvas. The nav is one step **darker** than the content, which is what §2.1's tonal-step
clause asks for.

`--ev-bg-nav` is therefore `#F8FAFB` — a 1.047 : 1 step off white — and it is a measured
value, not a derived one. An earlier derivation pinned `#eaecf1` as *the darkest grey at
which `--ev-text-2` still clears 4.5 : 1*; that derivation assumed a nav materially darker
than the canvas, the assumption does not hold, and **`#eaecf1` is retired**.

### 3.3 The active nav pill is grey on a near-white nav

The pill is `#E6E8EC` on `#F8FAFB`, a ratio of **1.172 : 1**. The alternative — a white pill
on a grey nav — measures 1.182 : 1, so the two are equally visible and the choice costs
nothing. D6's finding survives with its arithmetic intact: **the pill only works once the
ground is right.**

### 3.4 Table column hairlines are lighter than the table's outer border

Vertical column rules sit at Y ≈ 237 against an outer border at Y ≈ 221–230. That is why
`--ev-hairline2` means *lighter than the frame*, not *heavier*, and why a column rule never
reads as an edge of the table.

### 3.5 Four greys are not used, because they do not clear §7

Four low-contrast greys are attractive on white and are **not adopted**, because a re-skin
that drops a ratio is a failed re-skin:

| Grey | Where it would go | On | Ratio | Instead |
|---|---|---|---|---|
| `#A7A9AB` | identity-cell second line | `#FFFFFF` | **2.358 : 1** | `--ev-text-2` (`5.145`) |
| `#929496` | `Not identified` placeholder | `#FFFFFF` | **3.044 : 1** | `--ev-text-2` |
| `#8B8C8C` | nav section heading | `#F8FAFB` | **3.221 : 1** | `--ev-text-2` (`4.914`) |
| `#707477` | resting nav label | `#F5F7F9` | **4.391 : 1** | `#6a6e71` — arithmetic in §1.2 |

D7 leaves §7 untouched, and each correction above is the smallest that clears the bar.

---

## 4. Anatomy, measured

All figures are real px (destination px × 1.875), rounded to the 4 px grid, with the raw
destination measurement in brackets where it matters.

### 4.1 The two-level nav

```
┌──────────┬──────────────────────┬───────────────────────────────────────┐
│ 80px     │ 224px                │ content region                        │
│ rail     │ sub-tab column       │                                       │
│ #F8FAFB  │ #F8FAFB              │ #FFFFFF                               │
│          │                      │                                       │
│ ┌──────┐ │  Eyvar Admin      52 │  ← brand row = --ev-topbar-h, aligns   │
│ │ ▣    │ │ ┌──────────────────┐ │    with the top bar's baseline         │
│ │ Exec │ │ │ Overview      32 │ │                                       │
│ └──────┘ │ └──────────────────┘ │                                       │
│ ┌──────┐ │                   24 │  ← space above a section heading      │
│ │ ▤    │ │   PEOPLE          32 │  ← 12px --ev-text-2, sentence case    │
│ │ Ops  │ │ ┏━━━━━━━━━━━━━━━━━━┓ │                                       │
│ └──────┘ │ ┃ Captains    ⑦   ┃ │  ← ACTIVE: #E6E8EC pill, r8, no gap   │
│    …     │ ┗━━━━━━━━━━━━━━━━━━┛ │                                       │
│          │ │ Riders           │ │                                       │
│ ┌──────┐ │ │ Compliance       │ │                                       │
│ │ Admin│ │                   24 │                                       │
│ └──────┘ │   VEHICLES        32 │                                       │
└──────────┴──────────────────────┴───────────────────────────────────────┘
     ↑ 1px --ev-hairline      ↑ 1px --ev-hairline
```

| | Value | Measured |
|---|---|---|
| Nav ground, both columns | `--ev-bg-nav` `#f8fafb` | M |
| **Both seams carry a 1 px `--ev-hairline`** | | M — a border is present at destination x = 28 **and** x = 142 in every sidebar frame |
| Item height / pitch | **32 / 32**, gap 0 | 17.5 / 17.33 destination px |
| Item radius | 8 px | inset 4 destination px over 5 rows |
| Item inline padding inside the column | 12 px | pill inset 6 destination px each side |
| Item inline padding inside the pill | 12 px | icon at destination x = 42, pill starts 35 |
| Icon → label gap | 8 px | |
| Resting label | 13 px, `--ev-text-2` | |
| Active label | 13 px **medium**, `--ev-ink` | darkest sample `#0E0F13` |
| **Section heading** | 12 px, `--ev-text-2`, **sentence case, not uppercase**, in its own 32 px row | M |
| Space above a section heading | **24 px** | last item centre → heading centre = 29.7 destination px = 55.6; heading centre → next item centre = 18.1 = 33.9. Solving: heading row ≈ 32, gap above ≈ 24. Verified on all six groups across `cfa43315` and `862c7e14`. |
| Space below a section heading | **0** | |
| List padding-block-start (no brand row) | 12 px | `862c7e14` first item centre 29 px from the app top |

**The nav section heading is Eyvar's own element, and this is its whole specification.** It is
not a button, not a disclosure, not focusable, and it is **not uppercase** — §6.3 D18 bans
uppercase labels. In Arabic it is a plain translated string; nothing about it mirrors beyond
the block direction it inherits.

**The seams carry a hairline, reversing D6.** D6 removed `border-e border-border` from both
nav columns on the strength of §2.1's *"MUST NOT draw a border, divider or shadow between nav
and content"*. With a 1.047 : 1 tonal step across the seam it has to come back — 5 units of
luminance is not a boundary an eye can find. §2.1's clause is an inherited observation that D7
replaces. **The hairlines stand on both seams.**

### 4.2 The page frame

There is **no canvas/card step.** The content region is white, the page content sits on it
directly, and where a card is needed it is white with a 1 px border and an 8 px radius.

```
 content region (#FFFFFF, edge to edge)
 ┌────────────────────────────────────────────────────────────────────┐
 │            top bar 52px, #FFFFFF, 1px --ev-hairline bottom         │
 ├────────────────────────────────────────────────────────────────────┤
 │←32→                                                          ←32→  │
 │      Captains                                    [ Export ]        │  22px/600 --ev-ink
 │      Manage drivers and their documents.                           │  13px --ev-text-2
 │                                              ← 20px                │
 │      [ Search…] [ ⚙ Filter 1 ]      [ ⇅ Sort ▾ ] [ ▤ Columns ▾ ]  │  toolbar, 32px
 │                                              ← 12px                │
 │      ▓▓ Status: Active ✕ ▓▓ + Add filter    ✕ Clear ▓▓▓▓▓▓▓▓▓▓▓▓ │  chip strip, 48px
 │                                              ← 12px                │
 │      ░░ Captain │ ID │ Documents │ SLA │ Dispatch ░░░░░░░░░░░░░░░ │  header 32px, #F5F7F9
 │      ─────────────────────────────────────────────────────────────│
 │         row                                                        │  40px (56 with avatar)
 │      ─────────────────────────────────────────────────────────────│
 │      25 ▾  rows per page              1–25 of 214  Prev   Next     │  pagination 48px
 └────────────────────────────────────────────────────────────────────┘
```

| | Value | Measured |
|---|---|---|
| Content ground | `#FFFFFF` | M |
| Page inline gutter | `--ev-page-pad` **32 px** | reference measures **68** (36 destination px, symmetric); see D-2′ |
| Page block padding-start | 24 px | h1 cap top at destination y = 52, app content at 34 → 33.75 px to the cap, ≈ 24 to the line box |
| Title | 22 px / 600, `--ev-ink` | M |
| Subtitle | 13 px, `--ev-text-2`, one line | M |
| Title → toolbar | 20 px | 11 destination px |
| Toolbar → chip strip | 12 px | 6 destination px |
| Chip strip → table | 12 px | 6.5 destination px |
| Card, where one exists | `#FFFFFF`, 1 px `--ev-hairline`, r8, **no shadow beyond tier 1** | M |
| Card padding | 16 px | reference shows 16 on a stat tile, 24 on a chart card; Eyvar takes 16 |
| Gap between cards / tiles | 12 px | 7 destination px between stat tiles |

**White on white is the deliberate part.** §6.3 D1 records "canvas and card are both white"
as a *defect*, and the ship checklist repeats it. That defect was real — the legacy app had
white on white with **no border**, so the distinction genuinely collapsed. Under D7 a card is
distinguished by a 1 px border and an 8 px radius, which is exactly how the reference does it
(`02b895df`, four stat tiles, white on white, borders only). **D1 is narrowed, not deleted:**
see the partial edit in §9.

### 4.3 The toolbar

One 32 px row, all controls the same height, on white.

| Slot | Component | Notes |
|---|---|---|
| inline-start | search `input` | 180 px collapsed, white fill, 1 px `--ev-hairline`, r8, leading 14 px search glyph in `--ev-text-2`, 10 px inline padding |
| | `Filter` `button` `variant="outline"` | carries a count chip when filters are active — measured `Filter 1` in `82923d3f` |
| spacer | | |
| inline-end | `Sort` / `Columns` `button` `variant="outline"` with a trailing `⌄` | §1.5 reserves the trailing caret for menu openers |
| inline-end | the page's single primary `button` `variant="default"` | **near-black fill now**, not blue |

### 4.4 The filter-chip strip

The second element Eyvar draws that no inherited pattern covers.

```
 ┌──────────────────────────────────────────────────────────────────┐  #F5F7F9, r8
 │ 8                                                                │  full table width
 │   ┌────────────────────────┐ ┌───────────────┐                   │
 │ 8 │ Status: Active      ✕  │ │ + Add filter  │   ✕ Clear      8  │  chips 32px
 │   └────────────────────────┘ └───────────────┘                   │
 │ 8                                                                │
 └──────────────────────────────────────────────────────────────────┘
```

| | Value | Measured |
|---|---|---|
| Strip ground | `--ev-bg2` `#f5f7f9` | M — n = 2 640 flat |
| Strip height | **48 px** | destination y = 105.5 → 129.5 = 24 px = 45 |
| Strip radius | 8 px | |
| Strip padding | 8 px all round | chip left edge 183 vs strip left edge 178 = 5 destination px |
| Strip width | the table's width, exactly | strip 178 → 731; table 179 → 731 |
| Chip | **white fill**, 1 px `--ev-hairline`, r8, 32 px, 13 px label | M — chip interior is `#FFFFFF`, not tinted |
| Chip gap | 8 px | |
| Chip dismiss | trailing `✕`, 24 × 24 hit area (§7.7) | |
| `Add filter` | a chip-shaped `button` `variant="outline"` with a leading `+` | M |
| `Clear` | **bare text button, no chip** — `--ev-text-2`, leading `✕` | M — no fill and no border in the frame |

`Clear` being unchipped is the strip's grammar: chips are *state*, `Add filter` is *a control
shaped like state*, `Clear` is *an action on the set*. Do not give it a chip.

Owner: `src/components/table/FilterChipRow.tsx`.

### 4.5 The table

```
 ░░░░░░░░░░░░░░░░░░░░░░░│░░░░░░░░░░░░│░░░░░░░░░│░░░░░░░░░░░░░░░░░░░░  ← 32px, #F5F7F9
 ░ Captain              │ ID         │ SLA     │ Dispatch          ░
 ────────────────────────┼────────────┼─────────┼────────────────────  ← --ev-hairline2
   ⬤  Yousef Al-Harbi   │ DRV-0101   │  2h 14m │ Riyadh North         ← 56px (avatar row)
      +966 5x xxx xxxx  │            │         │
 ────────────────────────┼────────────┼─────────┼────────────────────
 ←12→                  ←12→
```

| | Value | Measured |
|---|---|---|
| Header row | `--ev-row-h-head` **32 px**, ground `--ev-bg2` `#f5f7f9` | M |
| Header label | **12 px, medium, sentence case, `--ev-text-2`** — never uppercase, never letter-spaced | M |
| Header radius | 8 px on the leading corners only; the body's rules run square beneath | M |
| Row, text | `--ev-row-h` **40 px** | reference 41 |
| Row, two-line / avatar | `--ev-row-h-media` **56 px** | reference 62 |
| Row separator | 1 px `--ev-hairline2` `#eceef2` | M |
| **Vertical column rules** | 1 px `--ev-hairline2`, between every pair of columns, running from the top of the header to the bottom of the last row | M — §3.4 |
| Outer border | 1 px `--ev-hairline` | M, one step darker than the internal rules |
| Cell padding-inline | **12 px** | six independent measurements: 7, 7, 6, 6.5, 7, 8 destination px → mean 6.9 → 12.9 |
| Cell padding-block | 12 px (media rows) / 10 px (text rows) | reference is internally inconsistent here — 14 px on the Visitors table, ≈ 4 px on the Members table. One value is set. |
| Row hover | `--ev-bg2` `#f5f7f9` | X — not evidenced; taken from the strip tint so no new value enters |
| Numeric columns | inline-end, tabular figures, **and they do not flip in Arabic** | R4 / §9.2 — unchanged |

**The identity cell's two-line form**, measured on `82923d3f`:

```
 ←12→ ⬤ 32px circle  ←8→  Yousef Al-Harbi        13px / 500 / --ev-ink
                          DRV-0101 · Riyadh       12px / 400 / --ev-text-2
```

| | Value |
|---|---|
| Avatar | **32 px, a circle** — measured, see §6 on R15 |
| Avatar fill | `--ev-bg2`, 1 px `--ev-hairline` ring, glyph or initials in `--ev-text-2` |
| Avatar → text gap | 8 px |
| Line 1 | 13 px / 500 / `--ev-ink`, never wraps, truncates with an ellipsis |
| Line 2 | 12 px / 400 / **`--ev-text-2`** — *not* the reference's `#A7A9AB`, which is 2.358 : 1 |
| Line gap | 0 (line boxes 20 + 16 = 36; 36 + 12 + 12 = 60, set to 56) |

`01-people.md` decided that a driver ID gets **its own column**, not a second line, because
"an id does not qualify a name". That stands. The second line is for a value that *qualifies*
the primary one — a phone, a city, an email.

### 4.6 The pagination footer

| | Value | Measured |
|---|---|---|
| Height | **48 px** | destination y = 354 → 380 |
| Ground | `#FFFFFF`, no border above beyond the table's own last row rule | M |
| inline-start | `25 ▾` `select`, 32 px, + `rows per page` 13 px `--ev-text-2` | M |
| inline-end | `1–25 of 214` 13 px `--ev-text-2`, then `Previous` / `Next` as bare text buttons, `--ev-text-2` when disabled | M |
| Gap | 12 px | |

In Arabic the whole row mirrors; the range `1–25 of 214` keeps Western digits and does not
mirror internally (§9.2). `Previous` / `Next` are logical — inline-start is *previous* in both
directions.

### 4.7 The detail drawer

```
                                   ┌──────────────────────────────────┐  480px
                                   │ Captain                       ✕  │  52px header
   the page stays LIT — no scrim   ├──────────────────────────────────┤
   in the reference                │  ⬤  Yousef Al-Harbi              │
                                   ├──────────────────────────────────┤
                                   │ ░ Session summary ░░░░░░░░░░░░░ │  32px, #F5F7F9
                                   │   20m 10s     13      4          │
                                   ├──────────────────────────────────┤
                                   │ ░ Documents ░░░░░░░░░░░░░░░░░░░ │
```

| | Value | Measured |
|---|---|---|
| Width | `--ev-drawer-w` **480 px** | reference 491 |
| Leading edge | 1 px `--ev-hairline` **plus** `--ev-shadow-2` | M — falloff over 5 destination px, peak ≈ 2.4 % |
| Header | 52 px, title 15 px / 600, trailing `✕` | M |
| Section header strip | 32 px, `--ev-bg2`, 13 px / 500 label | M — `79a31934` |
| Section body | white, 12 px padding | |
| **Scrim** | **none in the reference** | M — the table behind the drawer is fully lit `#FFFFFF` at every sampled row |

**The scrim is a behaviour question, not a colour one, and I am not deciding it here.**
`00-shell.md` §6.1 chose "drawer, no scrim" for the three shell layers and §6.5 raised the
focus-trap conflict without resolving it. The reference agrees with the no-scrim half.
Raised for product-owner in §11.

### 4.8 Banners

The reference contains exactly **one** semantic surface — `79a31934`'s `Deprecation notice`
— and it confirms R1/R16: **a pale tinted card, not a saturated split strip.**

| | Value |
|---|---|
| Fill | the tone's `-lt` token |
| Border | 1 px `color-mix(in srgb, var(--tone-{x}-foreground) 12%, transparent)` |
| Radius | 8 px |
| Padding | 12 px |
| Icon | 16 px, in the tone's foreground, inline-start, aligned to the **first line**, not centred |
| Icon → text gap | 8 px |
| Heading | 13 px / 500, tone foreground |
| Body | 13 px / 400, tone foreground, one or two lines |
| Placement | directly under the page header, spanning the content block, **never more than one** (R10) |

Measured against the frame: fill `#FFF4E6` exactly, border one step darker and warmer,
heading `#633422` at 9.456 : 1, body one step lighter. Eyvar's `#7a3e12` heading is 7.656 : 1
on the same fill.

### 4.9 Stat tiles

`02b895df` shows four across; `5b908c10` shows six in two rows of three with a sparkline.

| | Value | Measured |
|---|---|---|
| Tile | white, 1 px `--ev-hairline`, r8, no shadow beyond tier 1 | M |
| Tile padding | 16 px | ≈ 9 destination px from the tile edge to the icon |
| Gap between tiles | 12 px | 7 destination px |
| Grid | `auto-fill minmax(268px, 1fr)`, 4 above `--ev-bp-wide`, 3 below | unchanged from V5 |
| Leading glyph | 16 px, `--ev-text-2`, above the value | M |
| Value | **17 px / 600 `--ev-ink`** — `--text-lg`, not a display size | M — `02b895df` figure height 5 destination px → 13 px; `79a31934` → 17. Band 13–17; 17 chosen so the value out-weighs its label. |
| Label | 12 px `--ev-text-2`, **below** the value | M |
| Delta | 12 px in a neutral chip, `0%` / `+3%`; the word `last period` follows in `--ev-text-2` | M |

**A delta chip does not take the success or critical tone.** `5b908c10` renders `0%` neutral
next to every metric. A number going up is not, by itself, good news — R7's tones carry
status and a delta is a quantity (this is V6's reasoning, and it survives D7 unchanged).

---

### 4.10 Five rules that apply to every surface, not one

These five govern all 41 screens. They exist because the same five faults recurred on
unrelated pages — the conversation thread, the safety record and the pricing rate cards — and
each has one cause.

1. **A dark surface earns its elevation from tone, not from a border.** In dark,
   `--ev-surface` sits at least **1.25 : 1** above `--ev-bg2`; a card drops its border and
   keeps a 1px inner shadow, and the popover / drawer tier moves one step further again. A
   card whose only edge is a hairline is a defect in dark.
2. **A chip is never a control.** Badge and button diverge in silhouette: a badge is **20px**,
   borderless, tinted ground, no uppercase; a button keeps **32px** with a border or a fill.
   A control that reads as a badge — `Mine 2`, `Online`, `On call` — is a text button with a
   leading icon, not a pill. Checkable mechanically: `role="button"` inside `[data-slot=badge]`
   is zero.
3. **12px is the floor.** Nothing an operator reads renders below 12px. `text-2xs` is licensed
   for exactly two things: the delivery word in a thread, and table meta. Muted text in dark
   sits at 68% of ink, not 55%.
4. **A numeric grid inside a card is a table, and is drawn as one.** Row rules at 8% and a
   hover ground, so rows read as rows rather than as floating numbers.
5. **A disabled secondary never competes with the primary.** In a header action cluster the
   disabled secondary renders ghost and borderless so the primary is the only full-weight
   button. Its refusal sentence stays as real text at 12px under the group, once; it collapses
   to a tooltip-plus-visually-hidden pair only when the header is compact.

---

## 5. D-2, re-based

D-2 said: *"Higher density — 13 px base text, ~30 px rows. Suspends §1.2 (type ramp), §1.3
(spacing scale), §3.1 (row height)."* It was measured against a roomier product. Here is the
same claim measured against the new one.

| | **Target** | Eyvar before D7 | Eyvar under D7 | Verdict |
|---|---|---|---|---|
| Body text | **13 px** | 13 px | 13 px | **identical — not a deviation** |
| Page title | 22–24 px | 17 px | **22 px** | Eyvar was *tighter*; it rises |
| Card / section title | 17 px | 17 px | 17 px | identical |
| Secondary line | 12 px | 12 px | 12 px | identical |
| Nav row | **32 px** | 28 px | **32 px** | Eyvar was tighter; it rises |
| Compact control | 28–30 px | 28 px | **32 px** | identical, then rises to the grid |
| Table header row | **32 px** | 32 px | 32 px | identical |
| Cell padding-inline | **12 px** | 12 px | 12 px | identical |
| Spacing scale | 4 px grid throughout | 4 px grid | 4 px grid | identical |
| Table row, text | **41 px** | 32 px | **40 px** | within one grid step |
| Table row, media | **62 px** | 44 px | **56 px** | one 8 px step tighter |
| **Page inline gutter** | **68 px** | 16 px | **32 px** | **less than half** |

**D-2 is retired.** Its type half is not a deviation — 13 px *is* the reference. Its spacing
half is not a deviation — both products are on a 4 px grid using the same values. Its row
half is inside R13's tolerance (*"the relationship binds, the pixels do not"*); Eyvar's rows
move **up** toward the target, not away from it. **Eyvar is not a high-density product. It
sits on the ordinary console rhythm, and in five places it was tighter and has been loosened.**

One measured departure survives and it gets its own narrow entry:

> **D-2′ — the page gutter is 32 px, against an ordinary console gutter of 68.**
> **Suspends:** nothing in §1–§5 (D7 replaced their visual content). This is a deliberate
> departure, recorded here so it is not mistaken for drift.
> **Why, with the arithmetic.** At D2's 1280 px floor the content region is **976 px** (D5,
> measured in the browser: `<main>` at x = 304, width = 976). A 68 px gutter spends 11.6 % of a
> 1173 px content region, which is affordable for a **six**-column table and not for Eyvar's. Eyvar's index tables run six to nine columns; `01-people.md` records that all four
> People views fit at 1280 with `scrollWidth === clientWidth` and needed `min-w`/`max-w`
> pinning on the identity column to get there. Applying 68 px would leave 840 px, which is
> **78 px less than today's effective 918** (976 − 32 gutter − 2 card border − 24 card
> padding) and would clip. At 32 px, and with the card gone from index pages, the table gets
> **912 px** — 6 px less than today, inside the noise of the identity column's `min-w`.
> **Verification is required, not assumed:** see fix-list item 9.

**Two rows of the old D-2 are void and must not be cited again:** the type-ramp suspension
(§1.2) and the spacing-scale suspension (§1.3). Nothing in Eyvar's type or spacing deviates
from anything now.

---

## 6. Rulings affected

The table is R1–R19. D7 kills one outright, amends two, spends one, and confirms three.

| # | Effect | Why |
|---|---|---|
| **R3** | **KILLED and rewritten.** | R3 read: *"Eyvar keeps brand blue for primary actions (§6.2 D-1). Consequently blue MUST NOT also carry links."* D7 voids D-1 outright. **The primary button is near-black `#0C1116`**, so §1.1.4 and §4.6's near-black MUSTs — which R3 declared non-binding — now describe Eyvar too. **The second half of R3 survives:** `--ev-blue` `#2b6ef0` is 4.574 : 1 on white and 4.259 on `#f5f7f9`, so links still take `--ev-blue-dk` **plus** an underline — no longer because blue is spoken for, but because blue cannot carry 13 px text on a tinted ground. |
| **R2** | **AMENDED.** | *"Save is the brand-blue primary."* Save is still *the same primary as every other primary*, and still never green and never white-on-white — but that primary is now **near-black**. The reasoning is untouched; one colour name changes. |
| **R15** | **Its avatar clause is KILLED; the rest stands.** | R15 read *"Avatars are ~30 px rounded squares, never circles."* The identity avatar in `82923d3f` is a **circle**, and this is measurable rather than eyeballed: the horizontal inset at one destination pixel below the top edge is 5 px, which a 9-destination-px-radius circle predicts at 4.88 and an 8 px rounded square predicts at 1.54. **Avatars are 32 px circles.** Badge and toast geometry — rounded rectangles, not stadium pills — is confirmed by the filter chip (r8) and is untouched. |
| **R13** | **CONFIRMED and its named-figure carve-out is spent for the drawer.** | R13's core — *"every px figure in §1–§5 is indicative, not binding"* — is now true twice over: those chapters describe an inherited baseline that no longer governs Eyvar. Its carve-out (*"where a figure was individually re-measured and named in a ruling — the drawer widths, the popover width, the card radius — that figure stands"*) protected the older measurements. Re-measured: **drawer 406 → 480**, **card radius 12 → 8**, popover width unchanged for want of evidence. The carve-out survives as a rule about *rescaling*; the three figures it names have moved. |
| **R11** | **SPENT, not wrong.** | It reconciled three different inherited measurements of a nav Eyvar does not use. Under D7 the conflict it settles no longer exists. Left in place — deleting a row renumbers a table other documents cite. |
| **R1 / R16** | **CONFIRMED.** | A banner is a pale tinted card with a border and an icon — not a saturated split strip. Both rulings were made against contradictory inherited evidence and D7 settles it in the direction the rulings already chose. |
| **R7 / R5 / R5a / R17** | **UNTOUCHED.** | Tone-count and red-usage rules are policy, not observation. The reference contributes one tone (warning) and contradicts nothing. |
| **R4 / R6 / R8 / R9 / R10 / R12 / R14 / R18 / R19** | **UNTOUCHED.** | Alignment, copy, empty states, toasts, motion and the control outline are §7–§9 territory or policy. R19's *value* is re-derived in §1.1; its ruling is unchanged. |

**Also void: `DECISIONS.md` D6's second consequence bullet** (*"`border-e border-border`
comes off both nav columns"*). §4.1 restores both seams on measured evidence. D6's first,
third and fourth bullets survive with new values.

---

## 7. The accessibility ledger

Every pair the product actually renders. Nothing here is inherited.

**Text on its ground — 4.5 : 1 required (§7.1)**

| Foreground | Ground | Ratio | |
|---|---|---|---|
| `--ev-ink` `#171a21` | `--ev-surface` `#ffffff` | **17.411** | AAA |
| `--ev-ink` | `--ev-bg2` `#f5f7f9` | **16.212** | AAA |
| `--ev-ink` | `--ev-bg-nav` `#f8fafb` | **16.630** | AAA |
| `--ev-text-2` `#6a6e71` | `#ffffff` | **5.145** | AA |
| `--ev-text-2` | `#f8fafb` | **4.914** | AA |
| `--ev-text-2` | `#f5f7f9` | **4.791** | AA — the binding case |
| `--ev-surface` `#ffffff` | `--primary` `#171a21` | **17.411** | AAA |
| `--ev-blue-dk` `#1b51c4` | `#ffffff` | **6.952** | AA |
| `--ev-blue-dk` | `#f5f7f9` | **6.474** | AA |
| `--ev-blue-dk` | `--ev-blue-lt` `#eaf0fe` | **6.089** | AA |
| `--ev-green` `#15653c` | `--ev-green-lt` `#e7f6ec` | **6.351** | AA |
| `--ev-amber-dk` `#7a3e12` | `--ev-amber-lt` `#fff4e6` | **7.656** | AAA |
| `--ev-red` `#b42318` | `--ev-red-lt` `#fef0ee` | **5.921** | AA |
| `--ev-red` | `#ffffff` | **6.574** | AA |
| `--ev-text-2` | `--tone-neutral` `#f5f7f9` | **4.791** | AA |
| `--ev-blue` `#2b6ef0` | `#ffffff` | **4.574** | AA — **on white only** |
| `--ev-blue` | `#f5f7f9` | **4.259** | **FAIL — banned as text on any tint** |
| `--ev-text-3` `#9aa1ac` | `#ffffff` | **2.603** | **FAIL by design — decorative only, never text** |

**Non-text — 3 : 1 required (§7, WCAG 2.2 SC 1.4.11)**

| Object | Against | Ratio | |
|---|---|---|---|
| `--ring` `#2b6ef0` (focus, 2 px at 2 px offset) | `#ffffff` | **4.574** | PASS |
| `--ring` | `#f5f7f9` | **4.259** | PASS |
| `--ring` | `#f8fafb` | **4.369** | PASS |
| `--ring` | `--primary` `#171a21` | **3.807** | PASS |
| `--ev-hairline-strong` `#828b99` (unchecked box, R19) | `#ffffff` | **3.441** | PASS |
| `--ev-hairline-strong` | `#f5f7f9` | **3.205** | PASS |
| `--ev-hairline-strong` | `#f8fafb` | **3.287** | PASS |
| `--ev-amber` `#b45309` (warning icon) | `#fff4e6` | **4.623** | PASS — **fixes a 1.88 : 1 defect** |
| `--ev-red` (breached-row 3 px marker) | `#ffffff` | **6.574** | PASS |

**Below 3 : 1 on purpose, because colour is never the only carrier (§7.5)**

| Object | Against | Ratio | The other carrier |
|---|---|---|---|
| active nav pill `#e6e8ec` | nav `#f8fafb` | 1.172 | the label goes to `--ev-ink` **and** weight 500; `aria-current="page"` |
| nav hover `#f1f3f6` | nav | 1.062 | it is a hover state, never a status |
| nav count chip `#e3e6ec` | nav | 1.194 | the digits are `--ev-ink` at 16.6 : 1 |
| nav count chip, white on active | pill | 1.227 | same |
| `--ev-hairline` `#e1e4ea` | `#ffffff` | 1.274 | a card also has radius and tier-1 elevation |
| `--ev-hairline2` `#eceef2` | `#ffffff` | 1.162 | a table row is also a row of aligned text |
| every tone fill | `#ffffff` | 1.086–1.142 | a banner also has a border, an icon and a heading |

**Unchanged and still binding:** §7.2's 2 px ring at 2 px offset on every interactive
element with no `outline: none` anywhere; §7.3's keyboard-reachable row actions; §7.5's
never-colour-alone; §7.6's `prefers-reduced-motion` global; §7.7's 24 × 24 hit target, which
**may not be argued down by any density claim** — and D-2 is retired anyway.

---

## 8. Arabic (§9), checked as I went

Nothing in this document depends on something being on the left.

- The nav columns, the drawer, the chip strip, the table and the pagination are all
  described inline-start / inline-end. The **only** physical statement in the whole spec is
  that shadows are `offset-x: 0` — deliberately, so nothing mirrors.
- **The nav section heading** is a translated string in a normal block. `Analyze` → `تحليل`.
  Nothing about it is order-dependent, which is why it is a label and not a `Label: value`
  pair.
- **The vertical column rules** are between columns and mirror with the columns. Free.
- **The table's numeric columns stay inline-end and do not flip** (R4 / §9.2). The
  pagination range `1–25 of 214` keeps Western digits and does not reverse internally.
- **`Previous` / `Next`** are logical: inline-start is *previous* in both directions. Their
  glyphs mirror at string-construction time via `mirrorGlyph`, as the editor's back arrow
  already does.
- **The identity cell's two lines** are two blocks, not an inline pair, so the avatar sits
  inline-start of the text in both directions with no special case.
- **Type floors.** The new `--text-xl` needs an Arabic floor (`24px / 32`) for the same
  reason every other step has one. Eight dimension overrides now, not seven — §1.7.
- **`--ev-page-pad` does not vary by language.** A gutter is not a line box.

---

## 9. The fix list, in order, most visible first

Work straight down. Item 1 alone changes the look of every screen.

| # | Do | File | Notes |
|---|---|---|---|
| **1** | Replace every `--ev-*` value with §1. Add `--ev-row-h-head`, `--ev-page-pad`, `--text-xl`. Remap `--primary` → `var(--ev-ink)`. Rewrite the `--ev-bg-nav`, `--ev-nav-chip`, `--ev-hairline2` and `--ev-shadow-*` comment blocks — **they currently document derivations that are void** and a stale comment is worse than none. | `src/styles/globals.css` | The whole re-skin. One file, one commit, reviewable as a diff. |
| **2** | Restore `border-e border-border` on **both** nav columns (rail→column and column→content). Set both grounds to `bg-nav`. Set the brand row to `h-topbar`. | `src/shell/AppLayout.tsx`, `src/shell/ModuleRail.tsx`, `src/shell/PageNav.tsx` | §4.1. Reverses D6's second bullet on measured evidence. |
| **3** | Nav row → `h-navrow` (32), gap 0, radius 8, active pill `bg-[--ev-nav-chip]`-family per §4.1. Add the **section heading** row: 12 px `--ev-text-2`, sentence case, 32 px tall, 24 px above the group, 0 below, not focusable, `role="presentation"` on the wrapper with the group labelled by it. | `src/shell/PageNav.tsx` | §4.1. New element — read its spec before building. |
| **4** | Top bar → `h-topbar` (52), white, 1 px bottom hairline. | `src/shell/TopBar.tsx`, `src/shell/SaveBar.tsx` | The save bar shares the token and must move with it. |
| **5** | Page title → `text-xl` (22/600). Subtitle → `text-sm text-muted-foreground`. Page block padding → `p-(--ev-page-pad)`. | `src/components/PageHeader.tsx`, `src/components/PageShell.tsx` | `PAGE_BLOCK` is the constant — change it once, not per shape. |
| **6** | Table: header row `h-(--ev-row-h-head)` on `bg-muted`, 12 px medium sentence-case labels; **add the vertical column rules** (`border-e border-[--ev-hairline2]` on every cell but the last, header and body alike); row rules → `--ev-hairline2`; outer border → `--ev-hairline`; cell padding `px-3`. | `src/components/ui/table.tsx` | §4.5. The column rules are new and are the most visible single change after the greys. |
| **7** | Row heights → 40 / 56. **Revert `01-people.md`'s `[&_td]:py-1` bridge** — it existed only because a 24 px hit target could not fit a 32 px row, and at 40 px it fits with 8 px to spare. Q2's three-way conflict (32 row + 8 padding + 20 badge + 24 target) **dissolves**: 24 + 12 + 12 = 48 ≤ 56, and 24 + 8 + 8 = 40 = the text row exactly. | `src/components/ui/table.tsx`, `src/components/DataTable.tsx` | Closes gap **G1** and answers **Q2**. |
| **8** | Card → r8, `border-border`, `shadow-1`, `--card-spacing: 16px`. Remove the card wrapper from index pages: the table sits on the white content ground with its own outer border. | `src/components/ui/card.tsx`, `src/screens/*` | §4.2. |
| **9** | **Re-measure `scrollWidth === clientWidth` on all four People views at 1280 after items 5–8.** If any clips, the identity column's `min-w-32` drops to `min-w-28` **before** `--ev-page-pad` does. | `src/components/table/columns.ts` | D-2′'s verification. Do not skip it and do not "fix" it by shrinking the gutter. |
| **10** | Primary button → `bg-primary` (now near-black). Secondary/outline → white + `--ev-hairline`. Control height → 32. Radius 8. **Audit for any component that hard-codes blue as "the action colour".** | `src/components/ui/button.tsx` | R3 is rewritten; a stale blue primary is now a defect, not a legacy. |
| **11** | Filter-chip strip: 48 px `bg-muted` band at r8, full table width, 8 px padding, white 32 px chips with a hairline, `Add filter` as an outline chip, **`Clear` as bare text with no chip**. | `src/components/table/FilterChipRow.tsx` | §4.4. New element. |
| **12** | Badge → r4, 12 px label, tones from §1.3. Delta chips are **neutral**, never success/critical. | `src/components/ui/badge.tsx`, `src/components/StatusBadge.tsx` | R7 unchanged; values moved. |
| **13** | Banner → r8, 12 px padding, tone fill, `color-mix` border, 16 px icon aligned to the first line. | `src/components/Banner.tsx`, `src/components/ui/alert.tsx` | §4.8. |
| **14** | Avatar → **32 px circle**, `bg-muted`, hairline ring, `--ev-text-2` glyph. | `src/components/ui/avatar.tsx` | R15's avatar clause is dead — see §6. |
| **15** | Drawer → 480 px, leading hairline **and** `shadow-2`, 52 px header, 32 px tinted section-header strips. | `src/shell/ShellLayer.tsx`, `src/components/ui/sheet.tsx` | §4.7. |
| **16** | Popover / dropdown / tooltip / command / toast / bulk bar → `shadow-2` (now materially larger), r8, `--ev-hairline` border. | `src/components/ui/popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `command.tsx`, `sonner.tsx` | §1.5. |
| **17** | Pagination footer → 48 px, per §4.6. | `src/components/ui/pagination.tsx`, `src/components/DataTable.tsx` | |
| **18** | Stat tiles → §4.9. Chart series/fill already resolve through `--chart-*`; no component change, the values move under them. | `src/screens/*`, `src/components/ui/chart.tsx` | |
| **19** | Run `/token-audit`. Then re-shoot the Arabic frames — `--text-xl`'s Arabic floor and the eight dimension overrides are untested. | — | |

**`components.json` is frozen. No `shadcn add` in any of the above.** Every element in this
document is built from the 38 primitives the product already carries; the two
new elements (section heading, chip strip) are composition, not primitives.

---

## 10. Supersession ledger

Nothing is left live and disagreeing.

| Document | Section | Status |
|---|---|---|
| `02-visual-refinement.md` | **V1** — density: rail 80, navrow 28, control 28 | **SUPERSEDED** by §1.4 and §5. `--ev-rail-w: 80` survives on its own reasoning (label width), the rest moves. |
| | **V2** — the plain white pill | **SUPERSEDED** by §3.3. The pill is grey now. V2's *argument* — that the pill only works once the ground is right — survives and is what §3.3 re-verifies. |
| | **V3** — `--ev-bg-nav: #eaecf1` and its derivation | **VOID.** §3.2. The derivation assumed a nav darker than the canvas; the measured nav is `#f8fafb`, a hair darker than a **white** content region. `#eaecf1` is retired. |
| | **V4** — the top bar's route trail goes | **SURVIVES.** Wayfinding, not colour. |
| | **V5** — one page width, no `width` prop | **SURVIVES**, with `--ev-page-pad` replacing its literal 16 px. |
| | **V6 / V6d** — count badges are neutral, not toned | **SURVIVES**; its `--ev-nav-chip` value is re-derived in §1.1 and its "a sum has no status" reasoning is reused for the delta chip in §4.9. |
| | **V7 / V8 / V9** | **SURVIVE.** State design, not colour. |
| | §2.1–§2.6 measurement tables | **SUPERSEDED** by §4 — they measure the inherited baseline, not Eyvar. |
| `00-shell.md` | **§1.2** geometry tokens | **SUPERSEDED** by §1.4. |
| | **§1.3** elevation tokens | **SUPERSEDED** by §1.5. |
| | **§2.1 / §2.3** rail anatomy and states | **SUPERSEDED** by §4.1 (visual only; the five tiles and the pinned `Admin` stand). |
| | **§3.1** sub-tab column | **SUPERSEDED** by §4.1. Gains the section heading. |
| | **§3.2 / §3.3** the collapsed popover | **already struck by D5.** Untouched here. |
| | **§4** top bar | **AMENDED** — 48 → 52, white, hairline. Content unchanged. |
| | **§6.1** drawer, no scrim | **CONFIRMED** by the reference; width 406 → 480. |
| | **§7** page shells | **SURVIVE**; `PAGE_BLOCK` takes `--ev-page-pad`. |
| | **§9.1** index-table anatomy | **AMENDED** by §4.5 — vertical rules, header tint, row heights, avatar shape. Column *semantics* untouched. |
| | **§11.4** banner | **AMENDED** by §4.8. |
| `01-people.md` | **D-2 measurement table** (line 154) | **SUPERSEDED** by §5. |
| | **`[&_td]:py-1` bridge** and gap **G1** | **CLOSED** by fix 7 — at a 40 px row the conflict does not arise. |
| | **Q2** (32 + 8 + 20 + 24 cannot all hold) | **ANSWERED** by fix 7. |
| | **G13** (the toast renders light, §11.5 says dark) | **STILL OPEN.** The reference contains no toast; D7 supplies no evidence either way. Unchanged, still a finding. |
| `DECISIONS.md` **D6** | bullet 2, "`border-e` comes off both nav columns" | **VOID** — §4.1. |
| | bullets 1, 3, 4 | **SURVIVE** with new values. |

---

## 11. Findings raised, not decided by me

1. **The drawer scrim.** The reference shows a **non-modal** drawer — no scrim, the page
   behind fully lit. `00-shell.md` §6.5 already raised the focus-trap conflict and did not
   resolve it. A non-modal drawer that traps focus is a lie to a screen reader; one that does
   not trap focus needs an answer for `Esc` and for tabbing out. **This is behaviour, not
   colour, and it is outside D7's remit.** → product-owner.
2. **`--ev-page-pad` at 1440.** One value serves both widths, so 1440 gets the 1280 answer
   and looks tighter than the reference. The clean fix is `wide:` — the variant already
   exists and D5 explicitly preserved it — but redefining a token inside a `@media` block
   risks emitting a second `@media (min-width:)` into `dist`, which the one-breakpoint check
   counts. **Deliberately not done.** If the owner wants the extra air at 1440, this is the
   ticket, and it needs the build check re-run, not a second breakpoint.
3. **`--ev-shadow-3` is unevidenced.** No modal in 15 frames. Derived by ratio. The first
   modal built against it needs a human eye.
4. **The reference is internally inconsistent about vertical cell padding** — 14 px on the
   Visitors table, ≈ 4 px on the Members table, in the same product. I set one value (§4.5).
   Recorded so nobody "fixes" it back toward a frame.
5. **`--ev-text-3` still fails AA at 2.603 : 1**, as it did before, and the reference is
   worse (2.358). The token survives only because deleting a name is a rename. It should be
   retired in a separate, deliberate change.
6. **No dark mode is derivable from this set.** Every value here assumes a white ground. If
   dark mode is ever scoped, none of §1 transfers and the whole exercise repeats.

---

## 12. `DESIGN.md` partial edits

Applied to `docs/06-design-reference/_partials/` and rebuilt with
`python docs/06-design-reference/build-design.py`. **`DESIGN.md` is generated and was not
hand-edited.**

| Partial | Edit |
|---|---|
| `00-header.md` | The **Source of truth** line now names both reference sets and says which governs what. A new **"What D7 changed"** block sits above the Precedence ladder. **R2**, **R3** and **R15** are rewritten in the rulings table; **R11** and **R13** gain a D7 note. The cheat sheet's Colour, Type, Surfaces and Tables lines are corrected. The ship checklist's "in brand blue" and "canvas and card are visually distinct" items are corrected. |
| `06-eyvar-mapping.md` | §6.2 gains **D-11** (one white ground, cards carried by border and radius) and **D-2′** (the 32 px gutter). **D-1 is struck**; **D-2 is struck and replaced**. §6.3 **D1** is narrowed to "white on white *without a border*". A **§6.1 D7 note** marks the legacy inventory as historical. |
| `01-foundations.md` | A D7 banner at the head of §1: the section's colour, spacing, radius, type and elevation figures are **provenance for how the rules were derived, not authority over what Eyvar ships**. Same for §2, §3, §4, §5. |

**Screenshot citations in §1–§5 are kept.** They are what makes the derivation auditable —
you can still open `products-list-default.webp` and check what the analyst saw. They are now
**provenance, not authority**, and each section says so at its head. Deleting them would
destroy the audit trail and leave §1–§5 as unsourced assertion, which is worse.
