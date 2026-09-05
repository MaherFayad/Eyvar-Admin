# 00 — Shell: two-level navigation, page shells, table and form anatomy, the four state components

> ## What in this document still governs
>
> The **visual** language is `03-visual-language.md` (D7). Read it first; its §10 is the
> clause-by-clause ledger. This document keeps the page shells, the column semantics, the four
> state components, the component inventory, the interaction rules and the Arabic rules.
>
> | Section | Status |
> |---|---|
> | **§1.2** geometry tokens | **SUPERSEDED** — `03` §1.4. Top bar 48 → **52**, nav row 28 → **32**, row 32 → **40**, media row 44 → **56**, control 28 → **32**, drawer 406 → **480**, card radius 12 → **8**; `--ev-row-h-head` and `--ev-page-pad` added. |
> | **§1.3** elevation tokens | **SUPERSEDED** — `03` §1.5. All three tiers re-derived; tier 2 is roughly three times its old reach. |
> | **§2.1 / §2.3** rail anatomy and states | **SUPERSEDED visually** — `03` §4.1. The five tiles and the pinned `Admin` stand. |
> | **§3.1** sub-tab column | **SUPERSEDED** — `03` §4.1, and it **gains a section-heading row**, which is Eyvar's own element. |
> | **§3.2 / §3.3** the collapsed popover | **Struck** by **D5** and by V7 below. There is no collapse and no popover. |
> | **§4** top bar | **AMENDED** — 52px, white, 1px bottom hairline. Content unchanged. |
> | **§6.1** drawer, no scrim | **CONFIRMED**; width → 480. §6.5's focus-trap conflict is still open. |
> | **§7** page shells | **SURVIVE.** `PAGE_BLOCK` takes `--ev-page-pad`. |
> | **§9.1** index-table anatomy | **AMENDED** — `03` §4.5: vertical column hairlines, tinted 32px header, new row heights, circular avatar. Column *semantics* untouched. |
> | **§11.4** banner | **AMENDED** — `03` §4.8. |
>
> **Both nav seams carry a 1px hairline**, reversing D6's second consequence bullet — the
> measured tonal step is 1.047 : 1 and cannot carry a boundary alone.
>
> ### The V rulings, which are the owner's own corrections to this document
>
> The shell built from the first draft of this document was rejected by the business owner on
> visual grounds, and the audit that followed found the build had followed the spec faithfully.
> **Where the build looked bad and matched the spec, the spec was what failed.** Seven rulings
> came out of that, and they are in force:
>
> | # | Ruling |
> |---|---|
> | **V1** | Density. `--ev-rail-w` stays **80px**, on its own reasoning: the rail carries a label under each glyph (D-4), and the label sets the width. The rail's short labels are the tile's real name, never an abbreviation. The nav row and the compact control moved to **32px** under D7. |
> | **V2** | The active nav tile loses the **3px marker** and the **1px hairline**. The pill carries the state by itself. |
> | **V3** | **VOID under D7.** Its premise was that Eyvar had no neutral darker than `--ev-bg`; the nav's ground is now a measured `#F8FAFB` and the derived `#eaecf1` is retired. `03` §3.2. |
> | **V4** | The **route trail is deleted** — the screen said the same thing three times. The subtitle row is renamed the **meta row** and narrowed: it carries only content derived from the data on screen, and null renders nothing. Carve-out: on a `first-run` empty state a header action the empty state's own action row repeats is **omitted** from the header rather than disabled — it has moved, not gone. |
> | **V5** | **One page width.** `SingleColumnPage` has no `capped` mode and the `width` prop is deleted. `capped` moved the `<h1>` 244px between two sibling sub-tabs at 1920. Measure belongs to the tile grid, the form column and the prose block, where it cannot move the page frame. |
> | **V6** | **A workspace tile's badge is never toned.** The tile rolls up the **count**, not the tone: a tile's number is a sum of heterogeneous queues, and a sum has no status. The old rule left four of five tiles permanently amber. |
> | **V7** | **There is no sub-tab collapse and no popover. The level-2 column is always visible.** AC-32 and AC-33 are void with it. The wide breakpoint survives on its other two consumers — the detail rail and the tile grid — and its number later moved to **1280** under **O1** (`DECISIONS.md` D21b). |
>
> **V9** (no icon on the error state) is **superseded** by `04-index-screen-redesign.md`.

---

## 0. The three decisions that gate other people

### 0.1 The breakpoint — **1344 px**

**One number. `--ev-bp-wide: 1344px`. It governs everything D2 says it governs and nothing else.**

```
        1280 ────────────────────── 1344 ──────────────────────► ∞
        │  base                     │  wide
        │  ~~sub-tab list: COLLAPSED~~  ← STRUCK, decision 1. The column is ALWAYS visible.
        │  detail right rail:       │  detail right rail:
        │    RESTACKED below main   │    beside main, ~2 : 1
        │  metric tiles: 3-up       │  metric tiles: 4-up
```

> **The first consumer is struck** (**V7**).
> **AC-32 and AC-33 are void.** 1344 survives with two consumers, and the number does not change
> — reason (2) below, keeping 1366-class laptops on the wide side, still governs the detail rail
> and the tile grid.
>
> At 1280 the geometry is now rail **80** + column 224 = **304 px** of nav and **976 px** of
> content — which is the same 976 the "honest cost" paragraph below already computed, and it
> still fits a 2 : 1 detail exactly (640 + 16 + 320). Reason (1) below cites AC-32, which is
> void; the breakpoint's justification now rests on reasons (2), (3) and (4), which are
> independently sufficient.

Media query: `@media (min-width: 1344px)` is the *wide* branch. Everything below it is *base*.
There is no second breakpoint anywhere in the product. If a screen needs one, that is a finding
against this document, not a local decision.

**Why 1344 and not 1440.**

1. **AC-32 fixes the legal window.** It requires collapsed at 1280 and expanded at 1440, so the
   breakpoint must satisfy `1280 < bp ≤ 1440`.
2. **1366-class laptops must land on the wide side.** 1366 × 768 is the commonest desktop width
   above the D2 floor. With a classic 15–17 px scrollbar a 1366 device reports 1349–1351 CSS px of
   viewport. A breakpoint at 1360 would push that machine onto the base branch; 1344 does not.
   1440 would have worked here too, but see (3).
3. **1440 wastes the rail unnecessarily.** At 1439 px with the sub-tab column collapsed the content
   region is 1359 px — comfortably enough for a 2 : 1 detail. Dropping the rail there is a
   regression for a lot of real machines. 1344 is the lowest number that keeps 1366-class machines
   whole while still satisfying AC-32.
4. **It is on the 4 px grid** (1344 = 4 × 336) and on the 8 px and 16 px grids, so it composes with
   D-2's density scale.

**The honest cost, recorded rather than hidden.** The rail drop is not forced by geometry. At
1280 px with *both* nav columns expanded the content region is 976 px, and a 2 : 1 detail fits it
exactly (640 main + 16 gutter + 320 rail). D2 requires **one** number used everywhere, and AC-32
pins that number above 1280, so the rail restacks in a band (1280–1343) where it would physically
fit. That is the price of the single-number rule and it is accepted, not disputed. **Do not
introduce a second breakpoint to "fix" it.**

### 0.2 Rail treatment — **icon + label, built, `sidebar` not added**

**Icon + label.** Level 1 is an 80 px column of five tiles, each a 20 px glyph with a 12 px label
beneath it. Not icon-only, not hover-expanding.

The decisive argument is the D2 default. At 1280 px the sub-tab column is collapsed on first run,
so **the rail is the entire visible navigation**. Five unlabelled glyphs, four of which are
abstract (`Management` vs `Operations` vs `Financials` vs `Customer Support`), are a recall test
performed all day. §5.7 permits a tooltip to name an icon-only control, but `a11y.md` is explicit
that hover may change emphasis and must never gate reachability — and knowing where you are is
reachability. The spec's own §1 names the problem: today "the operator cannot trust the rail to say
where they are."

The inherited capture set is the closest real precedent for the
whole two-level shape — a ~56 px icon rail beside a ~312 px labelled panel — and it is icon-only.
It is also a three-item rail in a mode-switching editor, not a five-workspace console someone works
in for eight hours. Structure adopted; label decision reversed, deliberately.

**Built, from primitives already in the 0.4 inventory. `sidebar` is NOT added — Q6 is closed.**

Four reasons, each independently sufficient:

1. **The collapse semantics are not `sidebar`'s.** §3.9 requires: seeded from viewport *at first
   run only*, **never re-toggled by a resize**, persisted, and — critically — *collapsed means the
   column is not rendered and a rail-anchored popover takes over*. `sidebar`'s `collapsible="icon"`
   and `collapsible="offcanvas"` both keep the same component and change its rendering; neither is
   "replace with a popover". Its `useIsMobile` hook re-derives state from a resize listener, which
   is the one behaviour §3.9 forbids by name.
2. **Level 2 is a sibling column, not a nested menu.** `sidebar` models depth as
   `SidebarMenu` → `SidebarMenuSub`. Adopting that re-imports exactly the nested-pill and
   elbow-connector semantics that the new D-4 suspends, and it gives level 2 no independent scroll
   context, no heading and no width token of its own (**AC-19** tests the scroll contexts).
3. **Persistence is Q1, and `sidebar` pre-empts it.** It hard-codes a cookie. Which store
   `ui.subTabNavCollapsed` lives in is the engineering lead's call, not a component's.
4. **`components.md`:** *"do not import shadcn blocks/templates wholesale — they encode someone
   else's page shapes; ours are in `patterns.md`."*

Nothing new needs adding in 0.4. `ModuleRail` (S-01) and `PageNav` (S-02) are composed from
`button`, `badge`, `tooltip`, `popover`, `scroll-area` and `separator` — items 1, 2, 10, 11, 20 and
27 of spec §5.2, all already on the list. `components.json`'s "deliberately not added" row for
`sidebar` stands, and its reason changes from *"an open decision"* to *"decided in 0.2: built"*.

### 0.3 The three `DESIGN.md` amendments

Written into `docs/06-design-reference/_partials/06-eyvar-mapping.md` as part of this step. See
§12 for the exact text and §13 for what still has to happen (the rebuild, and `docs/ref/patterns.md`,
which I am not permitted to edit).

---

## 1. The frame

### 1.1 Page shape

The shell is **four regions plus five singleton roots**. Three of the regions run full height from
the top of the viewport; the top bar spans only the content region.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ You are acting as Layla Al-Qahtani.                            [Stop impersonating] │ 32  shell banner
├──────┬───────────────┬───────────────────────────────────────────────────────────── │     (0 or 1)
│      │               │                                                              │
│  ▨   │ Operations    │  ←   People › Captains        [🔍 Search        ⌘ K]          │ 48  top bar
│      │               │                        Mine 4 · On call: Layla   🔔²  ▣      │
│ ┌──┐ ├───────────────┼──────────────────────────────────────────────────────────────┤
│ │▤ │ │  Overview     │                                                              │
│ │Mg│ ├───────────────┤   People                          [Export] [More ▾] [Invite] │     page header
│ └──┘ │  My Work    7 │   4 218 captains · 611 riders                                │
│ ┌──┐ │  Live Dispatch│  ┌────────────────────────────────────────────────────────┐  │
│ │◎ │ │  Requests  12 │  │ [Captains][Applications][Compliance][Riders][+]  🔍▤▥⇅ │  │
│ │Op│ │  Subscriptions│  ├────────────────────────────────────────────────────────┤  │
│ └──┘ │  Corporate    │  │ ☐ │     │ Captain ⌃    │ Status  │ City   │ Trips  │ ⋯ │  │
│ ┌──┐ │  Trips        │  ├────────────────────────────────────────────────────────┤  │
│ │₣ │ │  Trip Assur. 3│  │ ☐ │ ▣  │ Nora Al-Harbi│(Active) │ Riyadh │    412 │ ⋯ │  │
│ │Fi│ │ ▸People       │  │ ☐ │ ▣  │ Sara Al-Gha… │(Active) │ Jeddah │    288 │ ⋯ │  │
│ └──┘ │               │  └────────────────────────────────────────────────────────┘  │
│ ┌──┐ │               │              Learn more about captains.                      │
│ │◔ │ │               │                                                              │
│ │Su│ │               │                                                              │
│ └──┘ │               │                                                              │
│ ┌──┐ │               │                                                              │
│ │▥ │ │               │                     ┌──────────────────────┐                 │
│ └──┘ │               │                     │  Captain updated  ✕  │                 │ toast region
│ ┈┈┈┈ │               │                     └──────────────────────┘                 │ bottom-centre
│ ┌──┐ │               │                                                              │ of the VIEWPORT
│ │⚙ │ │               │                                                              │
│ │Ad│ │               │                                                              │
│ └──┘ │               │                                                              │
└──────┴───────────────┴──────────────────────────────────────────────────────────────┘
  80px      224px                        content region, fluid
  rail    sub-tab list
```

| Region | Width | Scrolls | Mounted on |
|---|---|---|---|
| Shell banner strip | full viewport | no | any route, 0 or 1 banner |
| Workspace rail (level 1) | `--ev-rail-w` **80 px** | **never** — 5 items | every route except `bleed` |
| Sub-tab list (level 2) | `--ev-subnav-w` **224 px**, or not rendered | independently | every route except `bleed` |
| Top bar | content region only | no | every route except `bleed` |
| Content region | fluid | independently | always |

**Three independent scroll contexts** — rail (never scrolls), sub-tab list, content region.
Scrolling one leaves the other two untouched (**AC-19**).

**Why the top bar does not span the viewport.** §2.1 describes a full-width dark bar whose left
slot holds the wordmark inside the nav column's width. **D-3 already moved Eyvar's wordmark into
the rail**, which is what made that slot meaningful; with the wordmark gone the left slot would be
empty and the rail's own mark would sit *below* a bar that claims it. Spanning the content region
instead lines the top bar's `Title › Subtitle` up with the page header title beneath it, which is
§2.2's own alignment rule. Named as suspended in the new D-4.

**Surfaces.** Rail, sub-tab column and content canvas are all `--ev-bg` (#EEF0F3); cards are
`--ev-surface` (white); the three regions are separated by 1 px `--ev-hairline` vertical rules.
§2.1 says the nav must be a near-canvas grey *one step darker* than the canvas with **no** border —
Eyvar's token set has no neutral darker than `--ev-bg`, and §6.4 forbids inventing one, so the
hairline is the available separator. Named as suspended in the new D-4. This also closes legacy
defect **D1**: the page canvas is `--ev-bg`, not white, so canvas and card are finally distinct.

### 1.2 Geometry tokens

Every value below is on the 4 px grid (D-2 sanctions *smaller*, never *off-grid* — see D15). The
Arabic column exists because §9.4 sets per-role type floors and §9.7 rules that any dimension
varying by language is a custom property, not a §6.2 deviation.

| Token | Latin | Arabic | What it is |
|---|---:|---:|---|
| `--ev-bp-wide` | 1344 px | — | **the** breakpoint (§0.1) |
| `--ev-rail-w` | 80 px | 96 px | level-1 rail |
| `--ev-subnav-w` | 224 px | 256 px | level-2 column, expanded |
| `--ev-topbar-h` | 48 px | 48 px | top bar and save bar — identical, always |
| `--ev-shellbar-h` | 32 px | 32 px | impersonation / call / offline strip |
| `--ev-navrow-h` | ~~32 px~~ **28 px** | ~~36 px~~ **32 px** | sub-tab row — **V1**. Gap between rows is **0**, so pitch ≡ height |
| **`--ev-bg-nav`** | `#eaecf1` | `#eaecf1` | **V3** — ground for the rail and the sub-tab column. The darkest grey at which `--ev-text-2` clears 4.5 : 1 (4.523; `#e9ebf0` = 4.482 fails) |
| **`--ev-nav-chip`** | `#dadee6` | `#dadee6` | **V3** — nav count-badge plate. 1.141 : 1 against `--ev-bg-nav`; an ordinary console chip measures 1.139 : 1 |
| `--ev-row-h` | 32 px | 36 px | table row (text) |
| `--ev-row-h-media` | 44 px | 48 px | table row with a thumbnail |
| `--ev-control-h` | 28 px | 32 px | input, select, compact button |
| `--ev-control-h-lg` | 36 px | 40 px | in-form and full-width primary |
| `--ev-page-max` | 1120 px | 1120 px | capped single column |
| `--ev-detail-rail-w` | 320 px | 320 px | detail right rail |
| `--ev-monitor-aside-w` | 340 px | 340 px | monitoring side list (spec §3.10) |
| `--ev-drawer-w` | 406 px | 406 px | shell layers (C12, named figure — R13 preserves it) |
| `--ev-radius-card` | 12 px | 12 px | card (C3, re-measured — R13 preserves it) |
| `--ev-radius-control` | 8 px | 8 px | button, input, badge, toast, avatar, nav pill (R15) |

`--ev-topbar-h` is **48 px**, not D-3's 50 px. 50 is off-grid; D-2 sanctions smaller values *on the
grid*, and D15 records off-grid literals as a defect. This is D-2 applied, not a new deviation.

All of these belong in `src/styles/globals.css`, owned by **utilities-engineer**. I do not write
that file; §13 lists them as a request.

### 1.3 Elevation tokens

**Three tiers, closed set.** A fourth needs a §6.2 entry, exactly the way §1.4's radius rule works.
Full derivation, the pixel measurements behind them, and an honest account of what a compressed
768 px WebP cannot tell you: **`docs/05-restructure/design/00-decisions-r3.md` §1** (decision **R-3**).

```css
--ev-shadow-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);

--ev-shadow-2:
  0 2px 8px -2px rgb(0 0 0 / 0.12),
  0 1px 2px 0 rgb(0 0 0 / 0.06);

--ev-shadow-3:
  0 8px 24px -8px rgb(0 0 0 / 0.24),
  0 2px 6px -2px rgb(0 0 0 / 0.12);
```

| Token | Surfaces |
|---|---|
| **none** | rail · sub-tab column · top bar · **save bar** · shell banner strip · nested blocks inside a card · table rows · the page canvas · the scrim itself. Frame, not layer — and a shadow appearing when the save bar swaps in would be a visible layout event where **AC-51** requires none |
| **`--ev-shadow-1`** | card · metric tile · chart card · form card · the sticky table header **once the body has scrolled under it**. §1.4: persistent surfaces get a border and *at most a hairline shadow*; a card that appears to float is a bug |
| **`--ev-shadow-2`** | `popover` · `dropdown-menu` · `tooltip` · `command` / combobox list · sort, filter and date-range popovers · global search popover (480) · bell popover (360) · sub-tab popover (224) · toast · bulk-action bar · **the three shell drawers (`--ev-drawer-w` 406)** |
| **`--ev-shadow-3`** | `dialog` and `alert-dialog` at **440 / 560 / 800** — every scrimmed surface, and nothing else. §5.0 forbids a modal inside a drawer, so tier 3 never composites over tier 2 |

**The shell drawers take `--ev-shadow-2` *and* a 1 px `--ev-hairline` on their inline-start edge.**
Both. The reference  shows a hairline and **no**
measurable shadow, but §1.4's rule names drawers in a MUST, and Eyvar's drawer — unlike the inherited one
page-bound guide panel — opens over full-bleed content that reaches the viewport edge, where a
`#E4E2DA` hairline on white is a 1.1 : 1 step. Argued in `00-decisions-r3.md` §1.5.

Three implementation constraints, in order of how easy they are to get wrong:

1. **`box-shadow` is one property and the focus ring already uses it.** §7.2's ring is
   `outline: 2px solid var(--ev-blue); outline-offset: 2px; box-shadow: 0 0 0 2px #FFFFFF`. Anything
   that can hold **both** an elevation and focus must compose them into one comma-separated
   `box-shadow` list, or move the elevation to a wrapper. Dropping the white separator re-opens
   **D20**.
2. **Nothing mirrors.** All three have `offset-x: 0`, deliberately, so elevation is
   direction-invariant and needs no RTL branch (§9.5). Contrast `--ev-marker`'s `inset 3px 0 0`,
   which is physical and **does** need the `inset-inline-start` pseudo-element.
3. **These are elevation only.** The focus ring and the `--ev-marker` leading edge also use
   `box-shadow` and are **not** elevation. Never express either in terms of `--ev-shadow-*`.

After this lands, `grep -rn "box-shadow" src/` should return `globals.css`, the focus-ring utility
and the `--ev-marker` pseudo-element, and nothing else. A `shadow-sm` / `shadow-md` / `shadow-lg`
Tailwind class anywhere is a `/token-audit` failure.

---

## 2. Level 1 — the workspace rail

### 2.1 Anatomy

```
┌────────┐  ← 80px (96 in Arabic), full height, never scrolls
│   ▨    │  wordmark      32px block, mark only, 24px glyph
├────────┤
│ ┌────┐ │
│ │ ▤  │ │  tile          72 × 56, inset 4px, radius 8px
│ │Mgmt│ │                icon 20px centred in the top 28px
│ └────┘ │                label 12px/500 centred beneath (13px in Arabic)
│ ┌────┐ │                4px between tiles
│ │ ◎ ⁷│ │  ← badge       absolutely positioned, block-start / inline-end,
│ │Oper│ │                inset 6px, 16px tall, 11px/600 numeral
│ └────┘ │
│ ┌────┐ │
│ │ ₣  │ │
│ │Fin │ │
│ └────┘ │
│ ┌────┐ │
│ │ ◔  │ │
│ │Supp│ │
│ └────┘ │
│ ┌────┐ │
│ │ ▥  │ │  sub-tab disclosure   72 × 28, icon only
│ └────┘ │
│        │  flexible spacer
│ ┈┈┈┈┈┈ │  1px --ev-hairline, 8px above and below
│ ┌────┐ │
│ │ ⚙  │ │  Admin — PINNED to the bottom, never scrolls with the list (§2.1, preserved)
│ │Admn│ │
│ └────┘ │
└────────┘
```

### 2.2 The five tiles

Rail order is display order. `Admin` is pinned to the bottom; the other four are one group above it.
This is the **one §2.1 nav rule the deviation preserves intact** (§3.1).

| # | Workspace | **Rail label = the tile's real name** | Full name (level-2 column heading, search) | Glyph concept | Legacy |
|---:|---|---|---|---|---|
| 1 | Management | **`Exec`** | Management | rising line over an axis | `:487` |
| 2 | Operations | **`Ops`** | Operations | concentric circles with a centre dot | `:498` |
| 3 | Financials | **`Finance`** | Financials | currency stroke through a vertical line | `:527` |
| 4 | Customer Support | `Support` | Customer Support | speech bubble with a headset arc | `:533` |
| 5 | Admin *(pinned)* | `Admin` | Admin | gear | `:539` |

> **SUPERSEDED by V1** (business-owner decision 3: *"fix spacing and
> maybe choose shorter words for every one of them"*).
>
> **The accessibility consequence is not obvious and it inverts the old rule.** The paragraph
> below justified a short *visible* label with a long `aria-label` under WCAG 2.5.3 (label in
> name), which holds only because "Customer Support" **contains** "Support". **"Operations"
> does not contain "Ops"**, and "Management" does not contain "Exec". A visible `Ops` with an
> accessible name of `Operations` would be a 2.5.3 failure: a speech user saying "click Ops"
> would not match.
>
> **So the short word becomes the tile's actual name — visible and accessible alike.** The
> tile's `aria-label` is `Ops`, not `Operations`. The full name survives as the **level-2
> column header** and in global search, where it is a heading rather than a control and 2.5.3
> does not apply.
>
> All five are now separate i18n keys (`nav.workspace.<id>.rail`), not runtime truncations.

~~**`Customer Support` shortens to `Support` in the rail only.** A 16-character label does not fit
72 px at 12 px on one line, and truncating a nav label is not acceptable. The short form is a
separate i18n key (`nav.workspace.support.short`), not a runtime truncation. The full name is
what the level-2 heading, the tile's accessible name, the top-bar pair and global search all use.
No other workspace needs a short form; the four others fit with margin.~~

**Glyphs.** 20 px, 1.5 px stroke, `currentColor`, all from one icon family (§1.5). **None of the
five mirrors** — all are objects, marks or characters (§9.5). The currency glyph in particular is a
character and must not be flipped.

### 2.3 States

| State | Treatment |
|---|---|
| Rest | icon `--ev-text-2`, label 12px/500 `--ev-text-2`, no fill |
| Hover | fill `--ev-bg2`, icon and label `--ev-ink` |
| Focus-visible | 2 px `--ev-blue` ring at 2 px offset, fill unchanged. **Never `outline: none`** (§7.2, D20) |
| **Active** | ~~filled white pill inset 4 px, radius 8 px, 1 px `--ev-hairline` … plus a 3 px inset leading-edge bar in `--ev-blue`~~ **→ V2:** filled **white** (`--ev-surface`) pill inset 4 px, radius 8 px. **No border. No leading-edge marker. No shadow.** Icon `--ev-blue`; label 11px/**600** `--ev-ink` |
| Disabled | does not exist. A workspace the role cannot see is **not rendered** (**AC-57**) |

> **SUPERSEDED by V2** (business-owner decision: *"this active state
> looks ugly"*, *"remove the bluish line on the left"*). The paragraph below argued the marker
> from a three-signal-redundancy premise. That premise was sound but the conclusion was wrong,
> and the measurement says why: the inherited baseline's active
> row has **no chroma anywhere** at its leading edge (`|R − B| = 0` across x = 2–15) and **no
> darker stroke** at its border. It is a plain white pill and nothing else.
>
> The marker and the hairline were **compensation for a ground that was too light**. White on
> our `--ev-bg` is 1.142 : 1; white on a `#EBEBEB` nav is 1.192 : 1. **V3's `--ev-bg-nav`
> (`#eaecf1`, 1.182 : 1) is what carries the pill instead**, and it is a hard dependency of
> this change — removing the marker without darkening the ground makes the active state weaker
> than the version that was rejected.
>
> Redundancy is still satisfied without the marker: **fill + weight 600 + ink label** are three
> carriers, and the two that survive greyscale (weight, ink) are the two that mattered.

~~The active treatment carries three signals — fill, weight, edge bar — so it survives greyscale and
low vision (§7.5, colour is never the only carrier). The inset-edge idiom is Eyvar's own
(`:43`) and is legal because the bar is `--ev-blue`, not red; R5a governs red only.~~

**The active tile is derived from `route.workspaceId`, never from a click.** This is the whole
mechanical point of the rebuild (spec §3.1, **AC-08**). No handler ever sets it.

### 2.4 Count badges

| Where | Value | Tone | Zero |
|---|---|---|---|
| Sub-tab row | that sub-tab's own backlog count | `attention` → **warning**; `neutral` → **neutral**. **V6:** `attention` now means **breached**, not *non-empty* | **renders nothing** |
| Workspace tile | the **sum** of its sub-tabs' counts | ~~**warning** if any sub-tab has `badgeTone: 'attention'` and a count above zero~~ **→ V6: always `neutral`.** The count rolls up; the tone does not | **renders nothing** |

> **SUPERSEDED IN PART by V6.** Q12's invariant — *any tone on a tile
> must be explained by a visible row with the same tone and a non-zero count* — is sound and is
> satisfied at every step. It still produced a permanently amber rail, measured at 1440 on
> `/operations/trips`: **8 of 11 visible badges warning, including 4 of the 5 tiles.**
>
> The roll-up **amplifies**. A tile sums ~7 rows, so one toned row in seven turns the whole tile
> amber, and with 9 of 34 sub-tabs marked `attention` four of five workspaces contain one.
>
> **The tile is therefore always neutral, and the justification is not expedience:** a tile's
> number is a **sum of heterogeneous queues** — three applications, four expiring documents and
> one dispute — and a sum of different kinds of thing has no single status to report. Only the
> row knows what its number means. **AC-27's count clause survives verbatim; its tone assertion
> is void.**
>
> The second half of the problem was the greys, not the rule. Measured, our neutral chip is
> `1.073 : 1` **lighter** than its ground — invisible — so everything was promoted to
> `attention` just to be seen, and the warning chip is `1.005 : 1`, the *same luminance* as the
> nav, so it reads as a **stain** rather than a chip. V3's `--ev-nav-chip` (`#dadee6`,
> `1.141 : 1` **darker**, matching the `1.139 : 1` an ordinary console runs) gives the neutral chip a
> shape, which removes the incentive to reach for colour at all. **Nav chip digits are
> `--ev-ink`**, because `--ev-text-2` on any plate dark enough to read fails AA at 11 px.
>
> Reviewable invariant, for the fixture: **more than two of the 34 sub-tabs toned at once means
> the fixture is wrong.**

**The roll-up, in full (decision Q12 — `00-decisions-r3.md` §4).** Evaluated in this order, over
**only the sub-tabs the role can see** (**AC-57**, **AC-58**):

```
workspaceCount = Σ subTabCount
workspaceTone  = warning   if ∃ sub-tab where subTabCount > 0 AND badgeTone === 'attention'
                 neutral   otherwise
render         = nothing   if workspaceCount === 0
```

`99+` is applied **once**, to the sum, at render — never per child.

**Escalation is deliberate.** At 1280 px the sub-tab column is collapsed on first run, so the tile's
badge is the only backlog signal on screen (**AC-27**). A neutral roll-up over an `attention` child
would render the one condition needing action in the same tone as a catalogue count.

**The `count > 0` gate is equally deliberate.** `nav.badgeTone` describes what *kind* of backlog a
sub-tab is, not what its number currently is, so it stays `attention` when the queue empties. Since a
zero count renders nothing (**AC-26**), an ungated escalation would produce a warning tile whose only
cause is a row that shows nothing when the column is expanded. The test:

> Any tone on a workspace tile must be explained by at least one **visible** sub-tab row carrying the
> same tone and a non-zero count. Expanding the column must always show the operator what the tile
> was telling them.

**Computed in the shell, never stored.** 0.6's route table supplies `nav.subTabCount` and
`nav.badgeTone` per sub-tab; there is no `nav.workspaceBadgeTone` field. Two sources for one answer
is how they drift apart.

- Geometry: rounded rectangle, radius 8 px (R15), 16 px tall, 11 px/600 numeral (12 px/18 px in
  Arabic), min-width 16 px, 4 px inline padding. Never a stadium, never a circle.
- **Never a `0`, never a `—`, never an empty chip** (**AC-26**). The legacy app renders `0` on
  eleven rail badges at boot (`:491`, `:492`, `:496`, `:508`, `:514`–`:518`, `:523`, `:533`) and
  that is precisely what teaches operators to stop reading badges.
- Above 99 the badge reads `99+`.
- **Never red.** R5a enumerates the four permitted uses of red and a nav badge is not among them.
  The most urgent backlog is warning tone; the row's own SLA marker carries criticality (§7.4).
- **The workspace badge is never suppressed when the sub-tab column is collapsed** (**AC-27**) —
  that is the only state in which it is the sole backlog signal.
- Loading: the labels render immediately from the route table; only the **badges** are skeletons
  (spec §9.1). The nav is never a skeleton.

### 2.5 The sub-tab disclosure — ~~**STRUCK ENTIRELY**~~

> **STRUCK by business-owner decision 1** (*"remove this, no need to collapse it"*), recorded
> by **V7**. **The level-2 column is always visible.** There is no
> disclosure control, no rail-anchored popover, no `useNavCollapse`, no persisted
> `ui.subTabNavCollapsed`. **AC-32 and AC-33 are void.** §3.2 and §3.3 go with it.
>
> `--ev-bp-wide: 1344px` survives with two consumers instead of three — the detail right rail
> and the metric-tile grid. At 1280 the geometry is rail **80** + column 224 = **304 px** of
> nav and **976 px** of content, which still fits a 2 : 1 detail exactly (640 + 16 + 320).
>
> Everything below this line in §2.5, §3.2 and §3.3 is retained for provenance only and must
> not be built.

~~**One control, one fixed position, two states.** It sits in the rail between the four workspace
tiles and the pinned `Admin` tile — 72 × 28, icon-only, radius 8 px.~~

| Column state | Glyph | Accessible name / tooltip | Activating it |
|---|---|---|---|
| Expanded | filled two-panel icon | `Hide sub-tabs` | collapses the column |
| Collapsed | outline two-panel icon | `Show sub-tabs` | opens the **sub-tab popover** |

Re-expanding is the popover's **pin** control (`Keep sub-tabs open`), not a second rail button.
The level-2 heading row carries **no** collapse control — one affordance, one place, so the legacy
two-entry-points-for-one-thing drift (**D-L10**) is not recreated.

**Deliberately, clicking a workspace tile always navigates to that workspace's Overview**
(**AC-06**). It never opens the popover. Two entry points to one surface is how D-L10 started.

> **Refinement of spec §3.9 that must be accepted or corrected.** §3.9's keyboard row reads
> "rail (4 + pinned Admin) → sub-tab list → content", and its collapse row says the disclosure "is
> in the tab order in the column's place". Those two cannot both hold if the disclosure lives in
> the rail, which §3.9 also requires. **This design puts it between the four tiles and Admin**, so
> tab order is: rail group → disclosure → Admin → sub-tab list → top bar → content. Visual order,
> DOM order and tab order stay identical (§7.3), which is the constraint that actually matters.
> Recorded as **finding F-3**.

---

## 3. Level 2 — the sub-tab column

### 3.1 Expanded — **rewritten by V1 and V2**

> The column is now **always** in this state (decision 1), so "expanded" is just "the column".

```
┌──────────────────────────┐  224px (256 Arabic), full height, independent scroll context
│ Operations               │  heading 48px — MATCHES --ev-topbar-h, 13px/600, 12px inline padding
├──────────────────────────┤  1px --ev-hairline — ONE rule across the shell at y=48
│                          │  8px
│ ┌───────────────────────┐│
│ │ Overview              ││  row 28px, inset 8px, radius 8px, 8px inline padding, GAP 0
│ └───────────────────────┘│  label 13px/400
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  1px hairline, 4px above and below — Overview reads, it never acts
│ ┌───────────────────────┐│
│ │ My Work            7  ││  ← count badge, inline-end
│ │ Live Dispatch         ││
│ │ Requests          12  ││
│ │ Subscriptions         ││
│ │ Corporate Accounts    ││
│ │ Trips                 ││
│ │ Trip Assurance     3  ││
│ │███████████████████████││  ← ACTIVE: plain white pill. No border. No marker.
│ │ People                ││                Label --ev-ink, weight 600.
│ └───────────────────────┘│
└──────────────────────────┘
   ground = --ev-bg-nav #eaecf1, NOT --ev-bg. The column is a distinct region (V3).
```

| Element | Spec |
|---|---|
| Ground | **`--ev-bg-nav` `#eaecf1`** (V3), not `--ev-bg`. An ordinary console runs its nav a step darker than its canvas (1.055 : 1); ours ran them **identical** (1.000 : 1), which is why three regions read as one flat sheet |
| Heading | the workspace's **full** name, 13 px/600 `--ev-ink`, **48 px row** (was 40), 1 px hairline below. No control in this row. **48 because `--ev-topbar-h` is 48** — at 40 the shell drew two full-width horizontal rules 8 px apart, with the first nav row starting between them |
| Row | **28 px** (`--ev-navrow-h`, was 32), inset **8 px** from the column edges (was 4), radius 8 px, **8 px** inline padding (was 10), **0 px between rows** (was 2). Pitch **28**, parity with the 28 an ordinary console runs; ours was 34 |
| Group separator | **8 px** of extra space (was 13, which was also off the 4 px grid) |
| List padding-block-start | 8 px, so the first row clears the header rule |
| Label | 13 px/400 `--ev-text-2`; active 13 px/**600** `--ev-ink`. Never truncated — the longest label, `Ledger & Payment Controls`, measures ≈160 px at 13 px, and 224 px accommodates it plus a 3-digit badge with 12 px of slack |
| Overview separator | 1 px `--ev-hairline` between the `Overview` row and the rest, 4 px above and below. Overview is a different kind of destination — it reads, it never acts (`PROPOSED-STRUCTURE.md` §2.1 P4) |
| Hover | fill **`#f2f4f7`** (between the nav ground and the active white, so hover and active stay distinguishable when adjacent). ~~`--ev-bg2`~~ — that value is *lighter* than the new ground and would glow |
| Focus-visible | 2 px `--ev-blue` ring, **`ring-inset`, no offset**. Forced by row gap 0 — an offset ring would overlap the neighbouring row. **Nav only**; the rest of the product keeps `ring-offset-2` |
| Active | ~~white pill, 1 px hairline, weight 600, 3 px `--ev-blue` inset leading-edge bar~~ **→ V2:** white (`--ev-surface`) pill, weight 600, `--ev-ink`. **No border, no marker, no shadow.** See §2.3's superseding note for the measurement |
| Badge | §2.4, with V6's tone rule and V3's fills |
| Scroll | `scroll-area`, independent. Nine rows at **28 px** pitch plus a 48 px heading is ~308 px, so it will not scroll in practice — but it is its own scroll context regardless (**AC-19**) |
| Width | never changes with content. A workspace filtered by permission to one visible sub-tab still renders the column at full width with that one row selected (spec §3.9) |

**No elbow connector.** §2.1 requires a nested active row to carry a connector from its parent —
meaningless when parent and child sit in different columns. Suspended by name in the new D-4.

**Both columns are route-derived.** Active row = `route.subTabId`. A level-3 detail highlights its
parent sub-tab (**AC-09**). A view (`?view=…`) changes neither column's highlight (**AC-10**).

### 3.2 Collapsed — the popover

At base width (< 1344 px) the column is **not rendered**. The content region gains its 224 px back.

```
┌──────┐┌──────────────────────────┐
│  ▨   ││ Operations            📌 │  ← pin: "Keep sub-tabs open"
│┌────┐│├──────────────────────────┤
││ ▤  │││  Overview                │  same rows, same order, same badges (AC-33)
│└────┘│├┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┤
│┌────┐││  My Work               7 │
││ ◎ ⁷│││  Live Dispatch           │
│└────┘││  Requests             12 │
│┌────┐││  Subscriptions           │
││ ₣  │││  Corporate Accounts      │
│└────┘││  Trips                   │
│┌────┐││  Trip Assurance        3 │
││ ◔  │││ ▌People                  │
│└────┘│└──────────────────────────┘
│┌────┐│   224px, anchored to the disclosure's inline-end,
││▥ ◀─┼┼── top edge aligned to the disclosure, 8px offset
│└────┘│
```

- Same width (224 px), same rows, same order, same badges, same active treatment (**AC-33**).
- Selecting a row **navigates and closes** the popover.
- The pin control (`Keep sub-tabs open`) sets `ui.subTabNavCollapsed = false`, renders the column,
  and closes the popover. That is the only way back to expanded.
- `Escape` closes it and returns focus to the disclosure (**AC-66**).
- No scrim. Popovers do not trap focus; `Tab` closes and moves on (§7.3.3).
- In this state the **workspace tile's count badge is the only backlog signal**, so §2.4's
  no-suppression rule is load-bearing here, not decorative.

### 3.3 The collapse rule, restated so nobody re-opens it

Spec §3.9 has already ruled on this and **this design implements it, it does not revisit it**:

- Default is derived from viewport **at first run only** — collapsed below 1344 px, expanded at or
  above it.
- **Never auto-toggled by a resize afterwards.** Collapsing a nav out from under an operator
  mid-task is worse than a narrow column.
- The state persists across every route and across reload (**AC-32**, **AC-33**).
- Persistence mechanism is **Q1** and is not mine. Until Q1 lands, the shell holds the flag in
  memory and **fails AC-33 explicitly**, as a recorded gap (spec §12.2).

---

## 4. The top bar

D-3: light, 48 px, spanning the content region. Slots run inline-start → inline-end.

```
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ←  People › Captains          [🔍  Search                    ⌘ K]                     │
│                                                    Mine 4 · On call: Layla   🔔²  ▣  │
├──────────────────────────────────────────────────────────────────────────────────────┤
   ▲   ▲                                ▲                          ▲     ▲   ▲   ▲
   1   2                                3                          4a    4b  4c  4d
```

| # | Slot | Spec |
|---:|---|---|
| 1 | Back arrow | 28 × 28 icon button, present when `route.shape` is `detail` or `bleed`, absent on sub-tab index routes (§2.2). Accessible name `Back`. **Mirrors** in Arabic (`←` → `→`, §9.5). Derived from the route's shape, never from a stack depth — this retires `navStack.length` (`:7005`, **D-L5**) |
| ~~2~~ | ~~`Title › Subtitle`~~ | **DELETED — V4.** The screen said the same thing three times: the trail, the `<h1>`, and the subtitle beneath it. This slot's justification was wayfinding while the level-2 column was collapsed at 1280 — **decision 1 removes the collapse, so the column always shows the workspace name in its header and the sub-tab name in its active pill.** The trail now restates the two things immediately to its inline-start. An ordinary console's top bar carries no route echo either (measured on the inherited capture: store mark, centred search, bell, account chip — nothing else). **The inline-start of the top bar is left empty on index routes and is not filled with anything.** Remaining slots renumber to 1, 2, 3a–3d |
| 3 | Global search | §5. 400 px field, 28 px tall, **centred on the viewport** (§2.1), leading magnifier, trailing `⌘ K` / `Ctrl K` keycap chip. Expands in place into a 480 px anchored popover |
| 4a | `Mine` chip | Secondary chip, 24 px, label `Mine` + count badge. Routes to `/operations/my-work` — **this fixes D-L1**, which routes it to Support Center. Renders nothing at zero. Accessible name from one key with a placeholder: `Work assigned to you: {count} items` |
| 4b | `On call` chip | Secondary chip, 24 px, `On call: {name}`. Routes to `/admin/team`. When the rota has a gap it reads `On call: unassigned` in **warning** tone — that gap is the entire reason the chip exists |
| 4c | Bell | 28 × 28 icon button, accessible name `Notifications`. Count badge only when unread > 0 (**AC-26**, `notif-unread-zero`). Tone **neutral**, or **warning** when at least one unread notification is in the critical tier. **Never red** (R5a). Opens the preview popover (§6.2) |
| 4d | Avatar | 28 px **rounded square**, radius 8 px — never a circle (R15). Opens the account menu |

**The rail footer identity block is deleted.** Legacy has two entry points to `my-account` in two
chrome regions (`:544` and `:577`) — **D-L10**. The avatar menu is the single entry.

**Account menu** (`dropdown-menu`, right-aligned to the avatar):

```
  Layla Al-Qahtani
  Ops Manager
  ─────────────────────
  My profile
  Switch user
  ─────────────────────
  Sign out
```

Items are verb-first where they are actions; `My profile` opens the shell layer at `?account=me`.

### 4.1 The save bar

Replaces the top bar **in place, at identical height, with no layout shift** (§2.3, **AC-51**).
Both nav columns stay mounted and are **not** dimmed (§4.1). The content below does not move by one
pixel.

```
  ── clean ─────────────────────────────────────────────────────────────────────────
 │ ←  Pricing & Plans › Weekly — Riyadh North   [🔍 Search  ⌘K]   Mine 4  🔔  ▣     │
  ── dirty ─────────────────────────────────────────────────────────────────────────
 │ Unsaved plan                                            [ Discard ] [  Save  ]   │
  ── dirty, nothing valid to save ──────────────────────────────────────────────────
 │ Unsaved plan                                            [ Discard ] [  Save  ]   │
                                                                        └ greyed ┘
  ── saving ────────────────────────────────────────────────────────────────────────
 │ Unsaved plan                                            [ Discard ] [ ◌ Save ]   │
                                                             └ greyed ┘  └ not re-triggerable
```

| Slot | Spec |
|---|---|
| inline-start | The dirty label, 13 px/600 `--ev-ink`. **Entity-specific** when editing a named record (`Unsaved plan`), `Unsaved changes` otherwise (§2.3). **No warning glyph** — the word carries it, and an amber glyph here would read as a banner |
| inline-end | `Discard` (secondary) then `Save` (**brand-blue primary — R2**, never green, never white-on-white) |
| removed for the duration | back arrow, title pair, search, both chips, bell, avatar |

`Save` is disabled while `dirty-invalid`; `Discard` stays enabled (**AC-52**). While `saving`,
`Save` shows an inline progress indicator, is not re-triggerable, and `Discard` is disabled.

**The logo does not go in the left slot.** §2.3 requires it; §6.2 D-3 already voids that rule for
Eyvar because the wordmark lives in the rail. Restated here so nobody "restores" it.

### 4.2 The shell banner strip

Full viewport width, above everything including the rail. **At most one, ever** (R10, §5.2,
**AC-40**). 32 px, no radius (it spans the viewport, so a card radius is wrong), 1 px hairline at
the bottom, pale tinted fill from the four-tone set (R1/R16), one line of copy at inline-start,
zero to two secondary buttons at inline-end.

This is a **variant** of `Banner` (`variant="shell"`), not a second banner family. Same tones, same
component, same tone-to-token map.

| Condition | Tone | Copy | Actions | Dismissable |
|---|---|---|---|---|
| `impersonating` | warning | `You are acting as {name}.` | `Stop impersonating` | no |
| `call-active` | info | `On a call with {name} · {duration}` | `End call` | no |
| `offline` | warning | `You are offline. Changes can't be saved until the connection returns.` | — | no |
| two or more true | warning | `2 conditions need your attention.` then each on its own line | the actions of each, up to two | no |

**Merged, never stacked.** Impersonating *and* offline renders **one** banner carrying a count, not
two (**AC-40**). This is §5.2's merge clause and it is the only legal rendering.

`call-active` is a `Banner`, not a bespoke "call bar". Spec §4.2 describes it as a persistent strip;
R10 says a standing condition is a banner. Same component, `info` tone, undismissable while the
call runs. One fewer component to build and one fewer thing to drift.

---

## 5. Global search

§4.3.4 is explicit that this is part of the shell contract, not a convenience: four settings panes
changed workspace and seven merges moved familiar pages, and search is what makes that survivable.

an anchored popover on the
field, not a centred command palette (§2.6 forbids relocating it), a removable scope chip inside the
input, two-line result rows with inline badges, and an escape-hatch row always last.

```
                    ┌──────────────────────────────────────────────────┐  480px
                    │ 🔍 [Trips ✕] TRP-41                        ✕  ⚙  │  input row, 28px
                    ├──────────────────────────────────────────────────┤
                    │ Destinations (2)                                 │  12px/500 --ev-text-2
                    │ ▤ Trips                                          │
                    │    Operations                                    │
                    │ ▤ Route history                                  │
                    │    Operations · Trips                            │
                    │ Records (3)                                      │
                    │ ▤ TRP-4182            (In trip)                  │
                    │    Nora Al-Harbi → King Fahd · 19 Jul 08:12      │
                    │ Actions (1)                                      │
                    │ ▤ Export trips                                   │
                    ├──────────────────────────────────────────────────┤
                    │ 🔍 Search for "TRP-41" in Trips                  │  escape hatch, ALWAYS last
                    └──────────────────────────────────────────────────┘
```

| Aspect | Spec |
|---|---|
| Trigger | the top-bar field, or `⌘ K` / `Ctrl K` from anywhere. Expands **in place**; never relocates to the centre (§2.6) |
| Width | 480 px, anchored to the field's inline-start edge |
| Scope | a removable chip **inside** the input, followed by the query. Removing it returns to unscoped. Never a separate dropdown outside the field (§2.6) |
| Sections | fixed order **Destinations · Records · Actions**, each labelled with a count. Destinations first, because §4.3.4's stated job is finding where a page moved |
| Destination row | title + a muted second line giving its path (`Operations · Trips`). **This is result metadata, not a breadcrumb** — it names where a result lives, it is not a navigation trail, and §2.6's ban is untouched. The separator is `·`, not `›`, so it cannot be mistaken for the top-bar pair |
| Record row | identity + inline status badges, then a muted metadata line (§2.6). Opens the 360° profile layer |
| Action row | the named operation. Rendered only where the role holds the permission |
| Escape hatch | always the last row: `Search for "{query}" in {scope}`, or the scope's index route when unscoped |
| Scoped, no query | one centred prompt, `Search trips` — **never** a "no results" error (§2.6) |
| Query, no matches | one grey sentence, `No matches for "TRP-99".` No illustration, no heading (R8 `no-match`), plus the escape-hatch row |
| Permission | results the role cannot open **never appear** (**AC-60**). This is where `view_profiles` finally becomes a real gate |
| Legacy names | resolved through the route table's `legacyPageIds`, so `Renewal pipeline` returns *Operations › Subscriptions — Expiring ≤ 7 days* (**AC-30**) |
| Two legacy defects not carried | `resolveId`'s unordered `for…in` name search over riders and drivers only, which silently picks one of two people called "Al-Harbi" (`09b` §17.1); and the absence of phone-number and partial-id matching |
| RTL | the chip's **position** mirrors; the `⌘ K` glyph order does **not** (§9.2). The magnifier does not mirror (§9.5) |

**Keyboard.** `⌘K`/`Ctrl K` opens and focuses · `↑` `↓` move through results across section
boundaries · `Enter` opens the focused result · `Backspace` on an empty query removes the scope chip
· `Escape` closes and returns focus to the field.

---

## 6. The three shell layers

### 6.1 Surface decision — **drawer, no scrim**, for all three

Against §5.0's decision table, row by row:

| §5.0 row | Verdict |
|---|---|
| *"A working surface the user consults **against** the page behind it → right side panel / drawer, no scrim. **Not** a modal — it hides the thing being worked on."* | **This is the 360° profile exactly.** An operator opens a rider's profile *from a ticket* in order to decide what to do about the ticket. A modal hides the ticket, which is the one thing they need. Decisive |
| *"Permissions, consent, long multi-section flow → full page. Not a modal."* | Would send **my profile** to a page. But that row is about *granting* permissions and consent that must be linkable and legally readable. My profile is *reading your own effective permissions* and editing your own account. Not consent, not a grant — and D1 already ruled it a shell layer |
| *"A list of commands on an object → popover menu"* | The **bell preview** is this. The expanded notification centre is not — it is a browse-and-triage surface with four tiers and six filter chips, which §5.5 explicitly calls a drawer case ("browse-and-pick catalogue with more items than a menu can hold") |

**Decision: one mechanism, three layers, all `sheet` per §5.5 — right-anchored, no scrim,
`--ev-drawer-w` 406 px.** The inherited capture shows the
no-scrim drawer with the page fully legible behind it.

**Why 406 px and not 648 px.** §5.5 permits ~648 px when a panel needs internal columns, and the
profile's card stack could use them. But at 1280 px a 648 px drawer leaves 552 px of content
visible — narrower than a detail page's main column — which destroys the *only* reason a drawer
beat a modal. 406 px leaves 794 px of content region readable behind it. Where genuine width is
needed, the profile has a **full-page escape** at `/entity/:entityId` using the main + rail shape
(spec §3.5 row 31). Width is solved by the escape hatch, not by eating the page.

**Anatomy, identical for all three:**

```
                                   ┌──────────────────────────────────┐ 406px
                                   │ Nora Al-Harbi               ✕    │ 48px header, hairline below
                                   │ RDR-1041 · Rider since Mar 2024  │ optional subtitle, 12px muted
                                   ├──────────────────────────────────┤
                                   │ ┌──────────────────────────────┐ │ scroll-area
                                   │ │ Wallet                    ⌄  │ │ collapsible — EVERY entity
                                   │ │ Balance          20.00 SAR   │ │ type, not just riders and
                                   │ └──────────────────────────────┘ │ drivers (`09b` §17.4)
                                   │ ┌──────────────────────────────┐ │
                                   │ │ Trips                     ⌄  │ │
                                   │ └──────────────────────────────┘ │
                                   │ ┌──────────────────────────────┐ │
                                   │ │ Tickets                   ⌄  │ │
                                   │ └──────────────────────────────┘ │
                                   ├──────────────────────────────────┤
                                   │  Open full profile   [Cancel][…] │ footer — only when the
                                   └──────────────────────────────────┘ layer commits something
```

| Rule | Spec |
|---|---|
| Anchor | inline-**end**, starting below the shell banner and the top bar, running to the bottom of the viewport. Leaving the top bar reachable matters: a layer can be open while a form is dirty and the save bar is up |
| Scrim | **none** (§5.5, §4.1). The workspace behind stays legible and interactive (**AC-20**) |
| Focus | moves into the layer on open; **does not trap** — see §6.5 |
| Escape | closes, restores focus to the opener (**AC-66**) |
| Enter transform | `+X` in LTR, `−X` in RTL (§9.5). ≤ 300 ms |
| One at a time | opening a second closes the first; at most one of `?entity`, `?notifications`, `?account` in the URL (**AC-22**) |
| Route | an overlay **param** on the current route, never a route of its own. Browser Back closes the layer and stays on the underlying route; a second Back leaves it (**AC-21**) |
| Rail highlight | the workspace the operator is **in** stays highlighted. A layer is not a destination (**AC-20**) |
| Nested modal | **forbidden** (§5.5). See §6.4 for how my profile handles that |
| Footer | present only when the layer commits: `Cancel` + a primary disabled until valid, pinned to the bottom edge, inline-end aligned. A layer that only offers gets a single `Close` |

### 6.2 360° profile — `?entity=<id>`

Reached from global search, any id or name link in any table, any KPI drill-down, any notification,
any work-inbox row. `openProfile` already has **100 call sites** — the second-most-used handler in
the legacy file — which is why this is the highest-value single component in the rebuild.

| Aspect | Spec |
|---|---|
| Header | entity name (13 px/600) + identity code and one-line context as the subtitle; inline status badges after the name on the same baseline |
| Body | a stack of **collapsible cards contributed by workspaces as a declared contract** — Financials contributes wallet and payment cards, Customer Support contributes tickets / disputes / fairness, Operations contributes trips / subscriptions / compliance / commitment. Not one 600-line builder |
| Collapse | **every** entity type gets card toggles, not just riders and drivers (`09b` §17.4) |
| Entity types | **11**, not 6: `riders`, `drivers`, `trips`, `subscriptions`, `payments`, `complaints` (today) plus `newRiders`, `pendingDrivers`, `tickets`, `corporateAccounts`, `plans` |
| Money inside it | a rail-card-sized ledger: six rows, newest-first, **balance column omitted**, linking to the full ledger (§8.3.3's one permitted exception) |
| Footer | `Open full profile` as a plain link at inline-start; no primary — the layer commits nothing |
| Full-page escape | `/entity/:entityId`, **main + right rail** shape, for deep review |
| Permission | gated on `view_profiles` (**AC-60**) |
| Back-stack | scoped to the workspace, so switching workspaces does not lose the operator's place |

### 6.3 Notification centre — `?notifications=all`

Two sizes, one model.

**Bell popover (the preview)** — anchored under the bell, 360 px, top 8 by **priority, never
recency alone**. 

```
                                          ┌────────────────────────────────┐ 360px
                                          │ Notifications              ▤ ⚙ │
                                          ├────────────────────────────────┤
                                          │ Requests · 2 minutes ago       │ 12px --ev-text-2
                                          │ Request REQ-2214 has no driver │ 13px/600
                                          │ It has been waiting 4 minutes. │ 13px/400
                                          │ ─────────────────────────────  │
                                          │ …7 more                        │
                                          ├────────────────────────────────┤
                                          │            See all             │ footer
                                          └────────────────────────────────┘
```

- End-of-list is stated in words: `No more notifications` (§5.4). Never a blank popover.
- Zero unread: `No unread notifications.` — one grey sentence, `no-match` empty (R8).
- `See all` opens the layer.

**The layer** — the former `notifications-all` page in full: four priority tiers as section
headings, six filter chips beneath the header, then rows. Same row anatomy as the preview.

Three defects fixed on the way in (`03c` §17):

1. Type `alert` — the most common runtime type, 16 producers — has **no click destination**. Every
   type gets a route in the new table.
2. Types `renewal`, `approval` and `complaint` have full routing support and **no runtime
   producer**. Either they get one or they leave the type set.
3. Every read flag reverts on reload, so the badge returns to 3. Read state persists (**Q1**).

A notification routing to a **forbidden** destination renders **without** its navigation affordance
rather than being hidden — the operator should know the event happened (§11.2).

### 6.4 My profile — `?account=me`

Profile · password · 2FA · active sessions · the 13-permission *"exactly what your role can do"*
summary. It is the only place an operator can see their own effective permissions.

**No nested modal** — §5.5 forbids it outright and §7.3.3 explains why (the scrim decides the trap;
a no-scrim drawer that spawned a scrimmed modal would own the keyboard twice). Password change and
2FA enrolment are therefore **inline sections that expand in place** inside the drawer (§4.7's
checkbox-gated / inline-edit → `Done` pattern). While a section is in edit mode the drawer's own
footer carries `Cancel` + the committing primary, disabled until valid.

Administering *other* users is Admin › Team & Access under `manage_team`. Different job, different
permission, different surface.

### 6.5 Focus trap — a conflict I am raising, not resolving alone

**AC-67** requires that opening a shell layer "moves focus into it **and traps focus there** until
it closes."

**§7.3.3 forbids that**, in a table whose basis is §5.5: *"Non-scrimmed drawer / side panel → **Do
not trap.** Tab leaves the panel and continues into the page… §5.5: 'MUST omit the scrim and keep
the page behind interactive' — a trap would contradict it."* And: *"**The scrim decides the trap.**
If a surface dims the page, it owns the keyboard. If it does not, it does not."*

The precedence ladder puts §7 above §1–§5, and AC-67 sits below `DESIGN.md` entirely.

**This design implements §7.3.3: focus moves in, focus does not trap.** `Escape` closes and restores
focus to the opener.

**AC-67 must be amended** to "moves focus into it" with the trap clause removed, or the shell layers
must gain a scrim — which would void the entire drawer-over-modal argument in §6.1. Recorded as
**finding F-1**, owner: product-owner, with QA blocked on it.

---

## 7. Page shells

Four shapes, from `patterns.md` and spec §3.10. Every destination resolves to exactly one.

### 7.1 Single column — 32 of the 34 sub-tabs

```
┌─ content region ────────────────────────────────────────────────────────────────────┐
│ 16px                                                                          16px  │
│ ┌─ page header ───────────────────────────────────────────────────────────────────┐ │
│ │ People                                        [Export] [More ▾] [Invite captain]│ │
│ │ 4 218 captains · 611 riders                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ banner (0 or 1, spans the whole content block) ────────────────────────────────┐ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ card ──────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                        Learn more about captains.                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

~~Two width modes:~~ **ONE width mode. The `width` prop is deleted — V5.**

| ~~Mode~~ | ~~Width~~ | ~~Used by~~ |
|---|---|---|
| ~~`full`~~ | ~~content region minus 16 px inline padding, no cap~~ | ~~index tables, ledgers, work queues, activity log~~ |
| ~~`capped`~~ | ~~`max-width: 1120px`, centred on the content region~~ | ~~every Overview, every settings sub-tab~~ |

> **This clause is my error and the build implemented it exactly.** Business-owner decision 4:
> *"see how layout isn't consistent in the pages."* Measured cause:
>
> | Viewport | `full` route `<h1>` x | `capped` route `<h1>` x | Jump |
> |---:|---:|---:|---:|
> | 1440 | 328 | 332 | 4 px |
> | **1920** | **328** | **572** | **244 px** |
>
> Two sibling sub-tabs in the same workspace cannot put their `<h1>` in two different places.
> Nothing else about them differs, so the operator reads the movement as breakage.
>
> **Every single-column page is full width, 16 px inline padding.** The inherited baseline keeps alignment
> fixed the same way — content starts at x = 264 on both the inherited capture
> (a dense table) and the inherited capture (an empty state). The page frame
> is the constant; what varies is what sits inside it.
>
> **Measure is not abandoned, it moves down one level** — to the thing that actually needs it,
> where it cannot move the page header:
>
> | Content | Constraint | Where it lives |
> |---|---|---|
> | Page frame, all 34 routes | full width, 16 px inline padding | `SingleColumnPage` |
> | Metric tile row (P5) | `minmax(268px, 1fr)`, 4 columns above `--ev-bp-wide`, 3 below | the tile grid |
> | Form field column (P3 / P4) | `max-width: 640px` in its card, inline-start aligned | §10.1 layout B |
> | Prose, empty-state body | `max-width: 384px` | `EmptyState` |
>
> `--ev-page-max: 1120px` survives as a token with one consumer, `FullBleedEditorShell` (§7.3),
> which sits outside the layout and has no sibling to be inconsistent with.

~~**Why 1120.** Four metric tiles at 268 px plus three 16 px gutters. the inherited ~955 px is indicative
only (R13) and Eyvar's tiles are denser and more numerous.~~ *(The arithmetic survives — it is now
the tile grid's 4-column cap, not a page width.)*

### 7.2 Main + right rail — the 4 level-3 details and the profile's full-page escape

Reference: the inherited capture.

**Wide (≥ 1344 px):**

```
┌─ content region ────────────────────────────────────────────────────────────────────┐
│ ┌─ page header ───────────────────────────────────────────────────────────────────┐ │
│ │ ←  Faisal Al-Otaibi  (Pending)              [Reject] [More ▾] [Approve]    ‹ ›  │ │
│ │    Applied 19 Jul · Riyadh · APP-2201                                           │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────┐  ┌────────────────────────────┐  │
│ │ Documents                                      │  │ Status                     │  │
│ └────────────────────────────────────────────────┘  └────────────────────────────┘  │
│ ┌────────────────────────────────────────────────┐  ┌────────────────────────────┐  │
│ │ Vehicle                                        │  │ Summary                    │  │
│ └────────────────────────────────────────────────┘  └────────────────────────────┘  │
│ Timeline                                            ┌────────────────────────────┐  │
│ ┌────────────────────────────────────────────────┐  │ Metadata                   │  │
│ │ composer + feed                                │  └────────────────────────────┘  │
│ └────────────────────────────────────────────────┘                                  │
│ │←────── main, minmax(0,1fr) ──────→│ 16 │←──── rail, 320px fixed ────→│            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- `grid-template-columns: minmax(0, 1fr) 320px`, 16 px gutter. At 1344 px with the column expanded
  the content region is 1040 px → main 704 + 16 + 320. The **2 : 1 ratio binds; the px are
  indicative** (§2.2, R13).
- The rail holds **only** status, publishing, summary and metadata (§2.2). Primary form fields stay
  in the main column. Rail cards are read-only displays with an edit affordance, never inline forms.
- Empty pairs in a rail card render an explicit grey placeholder sentence, never blank (§3.5).

**Base (< 1344 px) — the rail restacks:**

```
┌─ content region ────────────────────────────────────────────────────────────────────┐
│ ┌─ page header ───────────────────────────────────────────────────────────────────┐ │
│ │ ←  Faisal Al-Otaibi  (Pending)              [Reject] [More ▾] [Approve]    ‹ ›  │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Documents                                              main column, full width  │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Vehicle                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Timeline                                                                        │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Status              ← rail cards, in their original order, beneath the main col │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Summary                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Metadata                                                                        │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Three rules, all testable (**AC-34**):

1. Rail cards restack **beneath** the main column, in their original order, at the full width of
   the content region. **No card is dropped, collapsed by default, or reordered.**
2. The page loses its max-width cap and runs full width.
3. **A task-shaped page's confirming action returns to the page header as the single primary.**
   §2.2 moves it to the bottom of the rail summary card *because the rail exists*; with no rail it
   would land beneath everything. The header is a fixed, findable place. This is the only
   layout-dependent action move in the product.

### 7.3 Full-bleed editor — `/financials/pricing/plans/:planId/edit`, and nothing else

The shell **unmounts entirely**: no rail, no sub-tab column, no app top bar (**AC-13**).


```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ⇤  Weekly — Riyadh North   (Active)                                    [  Save  ]   │ 48px, light,
├─────────────────────────────────────────────────────────────────────────────────────┤ its own bar
│                                                                                     │
│                   ┌─ capped 1120px, centred ─────────────────────┐                  │
│                   │ preview strip: pale --ev-blue-lt band        │                  │ §8.2.3
│                   ├─────────────────────────────────────────────┤                  │
│                   │ card: Inputs + derived columns + formula box │                  │
│                   └─────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Its bar carries, at minimum: exit (`⇤`, **mirrors** in Arabic to `⇥`), the plan name, its status
badge, and a `Save` greyed when there is nothing to save (§2.5). Exit returns to
`/financials/pricing` with both nav columns restored and `Pricing & Plans` selected.

No inspector panel. §2.5 recommends one for multi-mode editors; the plan editor has one mode.

### 7.4 Monitoring shell — Operations › Live Dispatch, and nothing else

**The shell stays** (spec §3.10, **AC-14**). §8.1 explicitly rejects §2.5's full-bleed mapping for
the live map. Only the content region goes full width with **no max-width cap** and the standard
page header remains.

```
┌─ content region, FULL WIDTH, no cap ───────────────────────────────────────────────┐
│ ┌─ page header ──────────────────────────────────────────────────────────────────┐ │
│ │ Live dispatch                                                                  │ │
│ │ Track active trips, watch requests, and step in when needed                    │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ ⬤ Live · 3 active · updated 2s ago           │  │ Active trips now         (3) │ │ sticky
│ ├──────────────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ [ Live ] [ History ]                         │  │ ⬤ TRP-4182  Nora → KFD       │ │
│ ├──────────────────────────────────────────────┤  │   0:42 elapsed · ETA 6m      │ │
│ │ ACTIVE │ LATE │ IDLE │ AVG ETA │ FEED        │  │   [Track][Call][Step in]     │ │
│ ├──────────────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ ● start ● end ▬ actual ┄ planned   (legend)  │  │ ◐ TRP-4190  Sara → Olaya     │ │
│ │                                              │  │   1:18 elapsed · Late 4m     │ │
│ │            map canvas, min-height 360px      │  └──────────────────────────────┘ │
│ │                                        [+]   │  ┌──────────────────────────────┐ │
│ │                                        [−]   │  │ Ride requests            (3) │ │
│ └──────────────────────────────────────────────┘  └──────────────────────────────┘ │
│ │←────────── canvas pane, minmax(0,1fr) ──────→│16│←──── side list, 340px ──────→│ │
└────────────────────────────────────────────────────────────────────────────────────┘
   ▲ selecting a row highlights its marker — and selecting a marker scrolls the side
     list to that card. ONE selection model, two panes. Two panes that do not share a
     selection are two cards and must use §7.2 instead.
```

At 1280 px with the sub-tab column expanded the content region is 976 px → canvas 620 + 16 + 340.
Fits with the column open; **AC-31** holds.

---

## 8. The page header

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ←  Faisal Al-Otaibi  (Pending) (Docs expiring)     [Reject] [More ▾] [Approve]  ‹ › │
│    Applied 19 Jul · Riyadh · APP-2201                                               │
└─────────────────────────────────────────────────────────────────────────────────────┘
  1   2               3                              4a       4b       4c        5
```

| # | Slot | Spec |
|---:|---|---|
| 1 | Back arrow | detail / create / edit only; **absent on index routes** (§2.2). A single `←`, never a trail (§2.6). Mirrors in Arabic |
| 2 | Title | 17 px/600. Required. Always translatable |
| 3 | Inline status badges | zero or more, immediately after the title **on the same baseline**. Never on their own row, never inside the action cluster (§3.4). Read inline-start → inline-end in importance order |
| 4 | Action cluster | secondaries → `More actions ▾` → **at most one primary** → record pager |
| 4a | Secondary actions | **cap: 2.** Beyond two, everything after the first two collapses into `More actions ▾`. This is the "designer's cap" §6.2 leaves open |
| 4b | Overflow | `More actions ▾`, a `dropdown-menu`. Verb-first imperatives, sentence case, no trailing punctuation. Destructive item last and separated, but **not red** where a confirmation follows (§5.4) |
| 4c | Primary | **at most one per header**, brand blue (R3, D-1). On a task-shaped page it moves to the bottom of the rail summary card and the header carries none — **except at base width**, where §7.2's rule returns it here |
| 5 | Record pager | `‹ ›`, rightmost of all, **record-detail pages in an ordered list only**. Chevrons mirror in Arabic (§9.5) |
| — | ~~Subtitle row~~ → **Meta row** | **RENAMED AND NARROWED — V4.** Second row, 12 px `--ev-text-2`, null renders nothing. **It carries only content derived from the data on screen** — counts, a record's identifiers, a timestamp. `Applied 19 Jul · Riyadh · APP-2201` (the example above) and `4 218 captains · 611 riders` (§7.1's example) are both correct; **`Where the shift stands right now` is not.** If it cannot change when the data changes, it does not belong here. `PageHeader`'s prop is renamed `subtitle` → `meta` so the wrong content is harder to pass by accident. **`routeTable.subtitleKey` stops being rendered on index routes** — a sub-tab that genuinely needs explaining gets that in its **first-run empty state**, where the operator is actually stuck, and nowhere else |
| — | Unavailable actions | render **greyed in place**, never removed (§2.2). **Carve-out added by V4:** on a `first-run` empty state, a header action that the empty state's own action row **repeats** is **omitted** from the header, not disabled — it has *moved*, not become unavailable. Actions that are genuinely impossible with zero records (`Export`) stay, disabled. The inherited baseline does the same: it drops `Export` / `Import` / `Add customer` from the header that the inherited capture shows populated |
| — | Header during loading and error | **the header renders in full**, with its actions **disabled in place**. The title comes from the route table and is known before the fetch starts; a header that appears after the data is a layout shift on every navigation (V4) |
| — | Alignment | title's inline-start edge = first card's inline-start edge; last control's inline-end edge = the rail's inline-end edge (§2.2) |
| — | Scroll | the page header **scrolls with the content**. The top bar is the fixed wayfinding; two sticky bars is one too many at 13 px |

---

## 9. Table anatomy

### 9.1 The index table every list inherits

One **card** holds the view tabs, the filter row, the header row, the rows and the bulk action bar.
Never a bare `<table>` (§3.1). Reference: the inherited capture,
the inherited capture,
the inherited capture, the inherited capture.

```
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ [All][Active][Expiring ≤ 7 d][At risk][Frozen][+]              (🔍) (▤) (▥) (⇅)    │ toolbar 40px
│ ─────────────────────────────────────────────────────────────────────────────────── │
│   ~~~ search mode REPLACES the row above, in place, no vertical shift ~~~           │
│ (🔍) nora                                              [Cancel] [Save as]    (⇅)    │
│ [City ⌄][Status ⌄][Plan ⌄][Add filter +]                            Clear all       │ chip row 36px
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ☐ │      │ Captain ⌃         │ Status  │ City   │  Trips │  Earned (SAR) │      ⋯   │ header 32px
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ☐ │ [▣]  │ Nora Al-Harbi     │(Active) │ Riyadh │    412 │      4,218.00 │      ⋯   │ row 32px
│ ☐ │ [▣]  │ Sara Al-Ghamdi    │(Active) │ Jeddah │    288 │      2,904.50 │      ⋯   │
│ ☑ │ [▣]  │ DRV-0106          │(Paused) │ Dammam │      0 │          0.00 │      ⋯   │ ← code identity
│   │      │ No documents on file                                                     │ ← secondary line,
│ ─────────────────────────────────────────────────────────────────────────────────── │   row grows to 44
│                    ╭────────────────────────────────────────╮                       │ bulk bar, WHITE,
│                    │ [Message] [Pause] [Assign zone]   [ ⋯ ]│                       │ inside the card,
│                    ╰────────────────────────────────────────╯                       │ centred, 32px
└─────────────────────────────────────────────────────────────────────────────────────┘
   Showing 1–50 of 4 218                                            [‹ Previous][Next ›]
                        Learn more about captains.
```

**Columns, inline-start → inline-end**

| # | Column | Spec |
|---:|---|---|
| 1 | Selection checkbox | 40 px wide, 14 px box, 12 px from the card's inline-start edge. Present in the header row and every body row |
| 2 | Thumbnail | 32 × 32 rounded square, radius 8 px (R15). **Only for resources with media**; a missing image renders a grey placeholder tile, never a collapsed column. Row grows to `--ev-row-h-media` |
| 3 | Identity | the record's identity, **a link to its detail route or to the profile layer** (**AC-43**). **Semibold (600)** when the identity is a code or number (`TRP-4182`, `APP-2201`), **regular (400)** when it is a name (`Nora Al-Harbi`) |
| — | Secondary line | a 12 px `--ev-text-2` second line **inside** the identity cell when a value only qualifies the primary one — never a new column. The row grows to fit; it never truncates |
| 4 | Status | one `StatusBadge`, five tones, **no red** (R7, R5a) |
| 5.. | Data cells | text and dates **inline-start**; numeric, currency and count **inline-end** |
| n | Row actions | a `⋯` kebab at the row's inline-end |

**Alignment — R4, and the Arabic clause.** Numeric, currency and count columns use
`text-align: end` (**never** `text-align: right` — §9.2), with header and value sharing one edge and
`font-variant-numeric: tabular-nums` on every one. **Eyvar inline-end-aligns every numeric column,
on every screen**; do not reproduce the inherited customers-index exception (§3.1). In Arabic the *column* mirrors — the numbers
hug the physical left edge — and the *numeral run* does not (**AC-73**).

**Row and header**

| Aspect | Spec |
|---|---|
| Header row | 32 px, 12 px/500 `--ev-text-2` on the card surface. **No filled grey band. No uppercase, no letter-spacing** (D18, and §9.4 forbids both on anything that can render Arabic) |
| Row height | 32 px text, 44 px with a thumbnail or a second identity line. **Uniform within a table** |
| Cell padding | 8 px block / 12 px inline — all on the 4 px grid |
| Hover | row fill `--ev-bg2`; the identity link underlines. **The whole row is not a click target** — only the identity link is. A whole-row target collides with the checkbox and the kebab |
| Focus-visible | 2 px `--ev-blue` ring on the focused control, never `outline: none` |
| Row actions | the kebab **always renders**, at `--ev-text-2` with no fill. On row `:hover` **or `:focus-within`** it takes `--ev-ink` and an `--ev-bg2` fill. Visible without a pointer, reachable by keyboard (**AC-68**). This closes **D19**: `opacity:0` until `:hover` with no `:focus-within` (`:153`–`:154`) |
| Sorting | **exactly one** header shows the active caret; no other header shows any resting affordance (**AC-45**). **Headers are not interactive anywhere in the product** — the caret is an indicator and the control is the sort popover. That makes AC-45 and AC-48 mechanically checkable with one rule |
| Sort popover | `Sort by` label, a **radio group** of fields, a divider, then a direction pair. Stays open across changes; no Apply, no Cancel (§3.2, §5.4) |
| Columns | more than ~6 columns ⇒ a column-visibility control in the icon cluster and **horizontal scroll**, never shrinking a column below legibility. Visible columns and their order are per-view state |
| Hit targets | a 32 px row exceeds 24 × 24; the kebab and checkbox get a `≥24 px` hit area via padding plus a compensating negative margin, **without changing the rendered box** (§7.7). **§6.2 D-2 may not be cited against §7.7** — D-2 names §1.2, §1.3 and §3.1 and reaches nothing else |

**Toolbar**

- Resting: view tabs at inline-start, `All` first and always default, trailing `+` to create a
  saved view; icon cluster at inline-end — search, filter, columns (only where >6 columns), sort.
- **Only the selected tab exposes a chevron** and its actions menu; unselected tabs stay plain.
- Search mode **replaces the tab row in place** with no vertical shift (**AC-47**), placing
  `Cancel` + `Save as` at the inline-end. `Cancel` restores the previous view with its filters
  intact. `Save as` is disabled until there is something to save.
- Filter chips: a row beneath the search field, each a chip with a trailing chevron, ending
  `Add filter +`. `Clear all` appears **only** when at least one filter or query is active.
- Create-view modal: one `Name` field with a `0/40` counter inside it; the primary is disabled
  until the name is non-empty — never an error after submit.

**Selection and bulk actions**

- Ticking any checkbox **replaces the header row** with `N selected` next to the header checkbox;
  the column labels are absent while selection is active (**AC-46**). Never a banner above the
  table.
- Floating **white** bar — white surface, 1 px hairline, soft shadow, radius 8 px (**not** a
  stadium — R15) — inside the card, horizontally centred, near the bottom of the row area, 32 px
  tall. At most **3** labelled secondary buttons, then `…`.
- Overflow items grouped by divider into add/remove or scope pairs. **Destructive overflow items are
  not red** — the confirmation carries the weight (§3.3, §5.4).
- Deselecting all restores the column headers and clears the bar. Selection resets on any route
  change and on any view or filter change (**AC-25**).

**Destructive confirmation** — a modal (440 px), vertically centred, title stating **the verb and
the count** (`Pause 3 captains?`), body stating the consequence in one sentence **and what will not
change**, primary repeating the verb (`Pause captains`) — never `OK`, `Yes`, `Confirm` or `Submit`.
Red primary **only** when unrecoverable (§5.3, R5a use #1).

**Below the card** — pagination, then exactly one centred `Learn more about {resource}.` outside
the card, at most one per page, never on a record-detail page.

**Pagination** — `Showing 1–50 of 4 218` at 12 px `--ev-text-2` at the inline-start, `‹ Previous` /
`Next ›` at the inline-end. **A truncated list states its truncation in words**; a silent row cap
(`:12250`) must not ship. Chevrons mirror in Arabic.

### 9.2 Where a **ledger** differs — §8.3.3, rules not preferences

```
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ Wallet ledger — RDR-1041 · Nora Al-Harbi                        Balance   20.00 SAR │
│                                                                 Pending  120.00 SAR │ separate line
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ Date       │ Reference │ Description                  │ Debit(SAR)│Credit(SAR)│Balance│
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ 18 Jul     │ —         │ Opening balance              │        — │        — │   0.00│ bold both sides
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ 18 Jul     │ WTX-0002  │ Referral bonus — Sara Al-Gh… │        — │    20.00 │  20.00│
│ 09:30      │           │                              │          │          │       │
│ 19 Jul     │ WTX-0003  │ Trip fare — TRP-4182         │     6.40 │        — │  13.60│
│ 08:12      │           │ ↳ TRP-4182                   │          │          │       │ ← ONLY per-row
│ 19 Jul     │ WTX-0004  │ Reverses WTX-0003 — dispute  │        — │     6.40 │  20.00│   control: a
│ 11:47      │           │ ↳ WTX-0003                   │          │          │       │   read-only link
│ 20 Jul     │ WTX-0005  │ Subscription — held          │        — │   120.00 │      —│   to the source
│ 07:05      │           │ (Pending) authorised, awaiting capture              warning │ ← excluded from
│ ─────────────────────────────────────────────────────────────────────────────────── │   the balance
│ Closing balance                                       │     6.40 │    26.40 │  20.00│ bold both sides
└─────────────────────────────────────────────────────────────────────────────────────┘
  Showing 6 of 6 postings.
  No checkbox column. No row kebab. No bulk bar. No sortable header.
```

| Index table has | A ledger **MUST** |
|---|---|
| A selection checkbox column | **Not have one.** No selection header, no floating bulk bar. They exist to mutate or remove the records they sit on, which is exactly what a ledger row forbids (**AC-48**) |
| A row kebab | **Not have one.** The only permitted per-row control is a **read-only link to the source document**, rendered as a `↳ REF` second line inside the Description cell |
| User-controlled sorting | **Not be user-sortable.** No caret on any header, no popover. Oldest-first by posting time, always. A running balance is meaningful only in posting order (**AC-48**) |
| Freely chosen columns | Use the **fixed order** `Date · Reference · Description · Debit · Credit · Balance`. Debit and credit are **two columns holding positive numbers** — the sign lives in the column choice. A single signed column is permitted **only** in a rail card ≤ 320 px, which must then omit the balance column and link to the full ledger |
| Editable rows | Be **append-only**. A posting is a fact; a correction is a **new reversing row that names the row it reverses** (`WTX-0004` above). Splicing a record out of a money array (`:7064`) and hard-assigning a balance to zero (`:7030`) must not ship |
| A computed total | Render the running balance from the **persisted `balanceAfter`** (`:3937`, `:3947`), never recomputed at render time |
| Free first and last rows | Open with a labelled **`Opening balance`** row and close with a labelled **`Closing balance`** row, bold on both sides. **The closing balance equals the balance in the card header** (**AC-49**) |
| Any status in a badge | Map every money state to exactly one tone: settled / captured / paid → **success**; held / authorised / pending / reconciling → **warning**; released / reversed / voided → **neutral**; failed / escalated → **not a badge at all**, routed to §9.3's row-critical marker |
| Totals including everything | **Exclude pending and held amounts** from the displayed balance and from the running-balance column. A pending amount is a separate labelled line beneath the balance |
| A silent truncation | State it in words below the last row: `Showing 150 of 412 postings.` |
| Two kinds of empty | A ledger is **never `first-run` empty** — a wallet with no postings still has an opening-balance row. Filtered to zero uses the `no-match` sentence |

**Money output — one formatter, `formatMoney`, from utilities-engineer (0.5).**
`<amount> SAR`: ISO code **trailing**, one space, never the ﷼ glyph, never a leading symbol.
Exactly 2 decimals, always. `,` thousands. `tabular-nums` on every value. Inline-end aligned.
Zero renders `0.00 SAR`; `—` is reserved for not-applicable or unknown. Negative uses **U+2212**
`−`, never a hyphen, never parentheses, never colour alone, and **never inside a badge or pill**.
**Inside a table the unit appears once, in the column header as `(SAR)`, and never repeats in cells.**

**The trap, stated loudly:** §4.2's currency-prefix rule governs **inputs only** and must never be
applied to output. A money *input* carries `SAR` as an in-field inline-start prefix; a money
*output* carries it trailing. Two different rules, one field type.

### 9.3 Where a **work queue** differs — §8.4, also rules

```
┌─ banner, critical, ONE per page ────────────────────────────────────────────────────┐
│ ⓘ  4 items are past their SLA.                                 [Show only breached] │
└─────────────────────────────────────────────────────────────────────────────────────┘
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ [Departing next 24 h][No backup captain][Awaiting confirmation][Absences]  🔍 ▤ ⇅   │
│ ─────────────────────────────────────────────────────────────────────────────────── │
│    │ Trip           │ Rider          │ Departs │ SLA          │ Owner      │ Action │
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ▌  │ SUB-1052       │ Nora Al-Harbi  │ 07:30   │ (overdue 14m)│ (Claim)    │[Assign]│ ← R5a (b): 3px
│ ▌  │                │                │         │ ▬▬▬▬▬▬▬▬▬▬▬  │            │        │   --ev-red inset
│    │ SUB-1061       │ Sara Al-Ghamdi │ 08:00   │ (12m left)   │ (Yours 4m) │[Assign]│   leading edge
│    │                │                │         │ ▬▬▬▬▭▭▭▭▭▭▭  │  Release   │        │
│    │ SUB-1073       │ Faisal Al-Ota… │ 08:30   │ (3h 20m left)│ (Layla)    │[Assign]│
│    │                │                │         │ ▬▬▭▭▭▭▭▭▭▭▭  │  Take over │        │
│    │ SUB-1090       │ Huda Al-Rashid │ —       │ (No clock)   │ (Claim)    │[Assign]│ ← sorts LAST
│    │ SUB-1044       │ Omar Al-Zahra… │ 06:45   │ Approved by Layla · document expired │ ← decided,
│    │                │                │         │ 19 Jul 09:14                        │   converted
└─────────────────────────────────────────────────────────────────────────────────────┘   IN PLACE
```

| Index table has | A work queue **MUST additionally** |
|---|---|
| No ownership model | Carry an **owner chip** in a fixed position — the last cell before the action cell — in exactly three states: unclaimed → `Claim` (a neutral button); yours → **success** tone, `Yours · 4m`, plus `Release`; someone else's → **warning** tone, `Layla`, plus `Take over`. Backed by `DB.ownership` (`:18858`), with a **30-minute stale expiry evaluated on a timer, never as a side effect of a render** (`:18865`–`:18875` is **D-L12**). **No emoji** — the legacy `✋` is dropped (**AC-76**) |
| — | **Opening a queue item must not claim it.** `Open` and `Claim` are two separate controls (`:19301`–`:19310` claims silently on open) |
| — | Confirmed takeover: a modal naming the current owner and stating that they lose the item without being asked |
| No clock | Carry **one** SLA countdown — a pill plus an optional 3 px track shown only when the total window is known. Formats: `12m left` · `3h 20m left` · `2d 4h left` · `overdue 14m`. **No deadline ⇒ `No clock`, neutral tone, sorts last.** Never `—`, never a synthetic deadline. **The track's denominator is the item's own SLA target** — the hardcoded `90` at `:11652` must not ship. Three bands: ≥ 50 % → neutral; < 50 % → warning; breached → the row-critical signal |
| A page banner for critical state | Carry **all three parts of R5a. None substitutes for another** (**AC-50**): |
| — | **(a)** exactly **one** page-level critical banner stating the count, `4 items are past their SLA.`, with one secondary button `Show only breached` that filters the list |
| — | **(b)** a 3 px full-height `--ev-red` marker on each breached row's **leading edge**, `box-shadow: inset 3px 0 0`. Legal because it is not a badge: no pill geometry, no fill-plus-text pairing, no label, outside the row's content box |
| — | **(c)** the countdown pill reading **`overdue 14m` in words**, so the state survives colour being removed. Rendering the queue in greyscale still shows which rows are breached |
| — | **At most one red carrier per row.** The edge marker **or** an icon tile, never both, or red stops meaning "this one" |
| — | **A breached row must not pulse, blink or loop.** R18: a loop may only signal "this feed is live" and may **never** encode severity |
| Editable status | A **closed set of dispositions declared per queue**, each labelled with a verb, rendered as buttons in the row's action cell, and **replaced entirely once decided**. At most one may be a filled primary. Bulk disposition **must not ship** |
| Rows that persist | **Convert the decided row in place.** It does not vanish. Actions are replaced by a `DecisionBadge` naming **outcome, actor and reason**, with the timestamp beneath. A rejection is **neutral with a solid dot** — a terminal factual outcome, like `Refunded` — never `b-red` (`:10907`) |
| — | **Never `opacity` to de-emphasise a decided row** (`:10929` uses `.7`). That is §4.6's disabled treatment and it says "this will come back". A decided row switches its primary text to `--ev-text-2` and drops its hover and click affordances |
| — | A decided row must not be removed by a background refresh, and the queue's nav count badge decrements **immediately on decision, while the decided row is still on screen** |
| Selection checkbox | **Only if every bulk action offered is a claim or assign action.** Otherwise no checkbox column |
| Controls checked on commit | **Gate at render, not at commit.** A control the role cannot use renders **disabled in place** with its reason available (§11.2). The systemic defect (`:10237`, `:11876`) is that the operator clicks, waits, and is told no |
| Any order | Order: **breached first**, then by remaining time ascending, `No clock` last. The list must **not re-sort or remove rows while the pointer is inside it or anything inside it has focus** (§8.1) |
| Escalation on every tick | Fire the breach event **once, at the crossing** (`:12544`–`:12553`). Multiple crossings in one tick batch into **one** notification with a count (`:9674`–`:9678`). An audible alert is opt-in with a visible mute |

### 9.4 The union problem — Operations › People

Spec §5.1 is explicit: *"A merged sub-tab carries the union of its patterns,
not one of them."* Operations › People is an index table **and** a work queue **and** a two-column
detail on one route. The anatomy above survives it because of one rule:

> **`DataTable` takes a `mode` prop — `index | ledger | queue` — and the mode, not the route,
> decides which furniture renders. A route may mount more than one mode over its lifetime. It may
> never mount two at once.**

Applied to People:

| View | Mode | Furniture |
|---|---|---|
| `Captains` | `index` | checkbox column, kebab, sort popover, bulk bar |
| `Applications` | `queue` | **no** checkbox column (no bulk claim is offered), owner chip, SLA countdown, dispositions, R5a's three parts, breached-first ordering |
| `Compliance` | `index` | checkbox column, kebab, sort popover, bulk bar |
| `Riders` | `index` | checkbox column, kebab, sort popover, bulk bar |

- Switching views **replaces the whole card body, including the header row**. Selection clears; the
  toolbar (tabs, search, filters) persists (§4.4).
- The critical banner belongs to the **view**, not the route: it renders on `Applications` when
  something is breached and is absent on the other three. There is still never more than one
  page-level banner (R10).
- The level-3 detail (`/operations/people/applications/:applicantId`) is a separate route with the
  **main + right rail** shape (§7.2).
- Financials › Cash & Captain Debt uses the same mechanism: a `ledger`-mode table with a
  `queue`-mode table for escalations, on two views of one route.

---

## 10. Form anatomy

### 10.1 The two layouts, and never a third

Two layouts, A and B, are drawn below.

**A. Resource editor** — main column of cards + right rail (status / summary / metadata only).
Used by the plan editor and every create/edit surface. The rail holds a live `Summary` card that
mirrors the configuration so far.

**B. Settings form** — a description column (bold section title + one line of grey prose) beside a
field-column card. Used by Admin's six configuration sub-tabs and Financials › Ledger & Payment
Controls.

```
   layout B
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Dispatch radius              ┌──────────────────────────────────────────────────┐   │
│  How far a request may        │  Maximum radius (km)                             │   │
│  travel before it stops       │  ┌──────────┐                                    │   │
│  matching.                    │  │ 12       │                                    │   │
│                               │  └──────────┘                                    │   │
│                               │  Between 1 and 40. Applies to instant requests    │   │
│                               │  only.                                           │   │
│                               │                                                  │   │
│                               │  Surge multiplier         1.4×    ← DERIVED:      │   │
│                               │                                    no box, no     │   │
│                               │                                    border, --ev-blue│ │
│                               └──────────────────────────────────────────────────┘   │
│  │←──── ~1/3 ────→│ 16 │←──────────────── ~2/3 ──────────────────────────────→│      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

One concern per card, bold card title, 12 px internal padding, 12 px between cards. Short related
fields sit 50/50 on one row; long and free-text fields go full width.

### 10.2 Field vocabulary

Measured from the census in spec §7.4 — 225 inputs, 19 selects, 12 textareas.

| Element | Spec |
|---|---|
| **Label** | **above** the field, inline-start, **13 px/400 `--ev-ink`**, 4 px gap. Sentence case. `(optional)` as a suffix; **no asterisks**. This closes **D22**, where labels are 11 px `--ev-text-2` and read as hints. **A placeholder is never a label** (§7.4.5) |
| **Field** | `--ev-control-h` 28 px, radius 8 px, 1 px `--ev-hairline`, white fill, 10 px inline padding, 13 px value. **One height** for input, select and combobox. Sized to the column or half-row, never to content |
| **Focus** | 2 px `--ev-blue` ring at 2 px offset; the fill does not change. **`outline: none` with no replacement is a defect** (§7.2) — this closes **D20**, 11 occurrences, six of them inline inside JS templates |
| **Placeholder** | grey, same size as the value, only for a genuine format example. Most fields ship with none |
| **Helper text** | **below** the control, 12 px `--ev-text-2`. **Constraints and consequences live here, never in a tooltip** (§5.7). Checkbox helper text indents to the checkbox's **label**, not its box |
| **Select** | stacked `⌃⌄` chevron pair at the inline-end — the reliable signal distinguishing a select from a dropdown button's single `⌄` caret |
| **Combobox** | `command` in a `popover`, leading magnifier, plus a `Browse` secondary where a catalogue exists. **Upgrade a select to a combobox above ~10 options.** Picked resources render as removable rows beneath the picker |
| **Checkbox** | 14 px square, radius 4 px, `--ev-blue` fill with a white check when checked. **Any boolean saved with the form is a checkbox**, not a switch |
| **Radio group** | inside a card, the card title is the question, the permissive/no-op option first and selected. Selecting a non-default option **reveals its dependent fields in place** |
| **Switch** | **instant-effect settings only.** If it needs a Save, it is a checkbox |
| **Date + time** | two half-width fields. Date = `calendar` in a `popover` with a leading calendar glyph; time = input + select. **The timezone goes in the time field's label** — `Start time (AST)` — never beside the value |
| **Date range** | a popover: preset column (with a check on the active preset) + two editable date fields joined by `→` + two side-by-side months + `Cancel` / `Apply`, `Apply` disabled until the range changes |
| **Tag input** | chips inside a bordered field, each with a trailing `✕`; `Enter` commits; `Backspace` on an empty query removes the last chip. New — the legacy app has no equivalent |
| **Money input** | `SAR` as an in-field **inline-start prefix** in `--ev-text-2`, right-aligned value, `tabular-nums`. See §9.2's trap: input prefix, output suffix |
| **Phone** | `dir="ltr"` on the value with bidi isolation; a country-code select docked at the inline-**end** of the field. A leading `+` jumps sides in RTL without it (§9.2) |
| **Textarea** | same border treatment as an input, ~72 px tall, vertical resize only |
| **Character counter** | right-aligned **inside** the field, `0/40`, only where a hard limit exists |

### 10.3 Derived values — and the collision the PO asked about

**§8.2.1 overrides §4.2 here.** Three states, three shapes, and the distinguishing signal is the
**border**, not the colour:

| State | Meaning | Shape |
|---|---|---|
| **Editable** | you may type here | bordered box, 1 px `--ev-hairline`, white fill, `--ev-control-h` |
| **Disabled** | you may not type here **yet** | the same bordered box, `--ev-bg2` fill, `--ev-text-2` label, 1 px `--ev-hairline` — §4.6's treatment |
| **Derived** | **nobody types here, ever** | **no box. No border, no fill.** Value in `--ev-blue`, at input size, on the same `--ev-control-h` baseline so the grid does not break |

The border is the affordance: §4.2 makes the input border deliberately stronger *so fields read as
targets*. A derived value is not a target, so it does not get the border. Keeping the box and merely
tinting the text — which is what `.computed-box` (`:255`) does — asks the border to mean two
opposite things, and the collision resolves the wrong way: the operator reads "temporarily locked,
try again later" when the truth is "this can never be typed into."

Additional rules, all from §8.2:

- A derived value is **not focusable**, is **not in the tab order**, carries `aria-readonly="true"`
  and `aria-live="polite"`.
- It is **not underlined and not clickable**, so it cannot be read as a link under R3.
- The disabled treatment (`--ev-bg2` fill + hairline) **must not** be applied to it.
- No computable result renders an **em-dash `—`**, never `0`, never blank, never a spinner.
- **Derived values are never persisted.** They are recomputed on read from the stored inputs.
- **A recompute is not an edit.** It must not set the dirty state or arm the save bar.
- A derived value is **never independently validated**. A result outside its legal range raises the
  error on the **input(s) that produced it**, plus one page-level critical banner naming the input
  to fix.
- If a recompute cannot complete within 150 ms, every affected derived value is replaced by `—`
  for the duration. A stale number must not sit on screen while a newer one is computed.
- No animation: no flash, no colour transition, no count-up. The value is replaced in place.

**Formula disclosure** — a `FormulaDisclosure` panel: pale `--ev-blue-lt` fill, `--ev-blue-dk` body,
one monospace `<code>` line per step **in evaluation order**, with a `--ev-blue` footnote ruled off
at the top carrying every assumption. It lives **inside the same card section as the inputs it
consumes, immediately below the last of them**. Never a tooltip (§5.7 forbids it), never a modal,
never helper text under a single field — the formula belongs to the group.

**Preview strip** — a surface carrying two or more derived values renders one pale `--ev-blue-lt`
band with a `--ev-hairline` top rule, directly beneath the form's top bar, holding label/value
pairs, with `aria-live="polite"`.

### 10.4 Validation — three layers, all required

```
┌─ page-level critical banner, PALE tinted card (R1/R16) ─────────────────────────────┐
│ ⓘ  To save this plan, 2 changes need to be made:                                    │
│    · Enter a discount between 0 and 100.                                            │
│    · Enter a commission between 0 and 100.                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                                        ▲ page primary actions disabled
   ┌──────────────────────┐
   │ Discount (%)         │
   │ ┌──────────────────┐ │  1px --ev-red border
   │ │ 140              │ │  --ev-red-lt fill
   │ └──────────────────┘ │
   │ ⊗ Enter a discount   │  12px --ev-red + a filled circle-exclamation glyph
   │   between 0 and 100. │  INSERTED below the field, replacing nothing
   └──────────────────────┘
```

1. **Inline field error.** Three simultaneous signals — 1 px `--ev-red` border, `--ev-red-lt` fill,
   and a 12 px `--ev-red` message with a leading filled circle-exclamation glyph inserted **below**
   the field. Never colour alone. The label above keeps its normal colour.
2. **Page-level critical banner.** **One**, first element of the content block spanning main + rail,
   stating the **count** and listing each blocking item. **A pale tinted card, not the saturated red
   strip** in the inherited capture — that is banner Family A and
   **R1 kills it**. The page's primary and save actions render **disabled but visible** while it is
   up.
3. **Disabled-until-valid.** `Save` greyed in the save bar; `Discard` always enabled (**AC-52**).

Never two page-level banners: two or more conditions merge into one carrying a count (R10,
**AC-40**).

---

## 11. The four state components, and every shell state's final copy

### 11.1 `EmptyState` — two kinds, and the kind is the load-bearing prop (R8)

> **AMENDED by the visual-refinement rulings.** The two kinds are right and stay. Three
> geometry / behaviour corrections, all from measuring
> the inherited capture against the build:
>
> 1. **The state renders inside a card.** The inherited empty state is a **442 px tall card** at the
>    content region's full width, with `Learn more about customers.` **outside and 16 px beneath
>    it**. Ours rendered directly on `--ev-bg` with no ground, which reads as broken chrome
>    rather than a designed state. This applies to **all four states**, not just this one.
> 2. **Illustration is 144 px, not ~160.** The inherited one measures **146 × 146** CSS px; 144 is the
>    nearest 4 px-grid value below it (D-2). Padding-block inside the card is 64.
> 3. **The header carve-out** — see §8's `Unavailable actions` row. A header action the empty
>    state repeats is *omitted*, not disabled.

| Kind | Treatment |
|---|---|
| **`first-run`** — whole page, **zero records ever** | Illustration **144 px** (was ~160), muted brand palette, inside the index card; heading 15 px/600 naming **the value of the section, never the absence of data**; a 1–2 sentence body constrained to **384 px**; an action row with at least one action. Outside the card, 16 px beneath it, the centred `Learn more about {resource}.` Page-header actions that cannot work with zero records render **disabled and visible**; actions the empty state **repeats** are **omitted** (§8) |
| **`no-match`** — empty card, section, timeline, or filtered-to-zero | **One grey sentence**, 13 px `--ev-text-2`, centred, `py-10`, **with the card's toolbar still rendered above it** so the query that returned nothing can be changed. No illustration, no heading. One plain-button action only where one genuinely exists (`Clear filters` when `table.isFiltered`, nothing otherwise) |

**Choosing wrongly is a defect.** Filtered-to-zero is never `first-run` — the illustration implies
the data does not exist (**AC-37**, **AC-38**).

Exemplar copy (Operations › People, `Captains` view):

- `first-run` — heading `Every captain, from application to compliance` / body `Add a captain to
  start reviewing documents, tracking readiness, and assigning trips.` / actions
  `[Import captains]` `[Add captain]`
- `no-match` — `No captains match these filters.` + plain button `Clear all filters`

**shadcn `empty` is not added** (decision R-1 — `00-decisions-r3.md` §2). It is a slot composition
(`EmptyHeader` / `EmptyMedia` / `EmptyTitle` / …) with no `kind`, which makes putting an illustration
on a filtered-to-zero state one import away — the exact defect **AC-37** and **AC-38** test for.
Neither of our two shapes is its shape either: `no-match` is a `<td colspan>` sentence aligned to the
content, and `first-run` puts the illustration inside the index card with `Learn more about
{resource}.` outside it. `EmptyState` is a switch on two values. **`kind` stays the load-bearing
prop, and `components.json` stays frozen.**

### 11.2 `ErrorState` — three scopes

> **AMENDED by the visual-refinement rulings, V9 among them.** The three scopes are right and stay.
> Four corrections:
>
> 1. **`page` and `card` render inside a card**, not bare on `--ev-bg`. `row` does not — it is
>    inline in a cell.
> 2. **`card`'s `action` becomes required in the type.** A failed card with no retry is a dead
>    end, and every current call site omits it.
> 3. **No icon on the error state (V9).** The icon that wants to be there is a warning triangle,
>    and it wants to be red or amber. Red is enumerated to four uses by **R5a** and this is not
>    one; amber is **R17**'s single warning tone and a failed fetch is a *failure*, not a
>    warning. A grey triangle is decoration, and §7.5 already binds this component: *an error is
>    never carried by colour, it is carried by words.* **R8**'s reasoning bars the illustration
>    and the same reasoning bars its miniature.
> 4. **Forbidden and not-found get a page header.** They currently render a bare `ErrorState`
>    with no `<h1>`, so the page has no accessible name. Forbidden shows the route's title —
>    the operator asked for it by name and is owed the name back; route titles are not secret,
>    only their data is. Not-found shows an **empty** header block (there is no route, so there
>    is no name) so its card still lands at the same y as every other state.

| Scope | Shape | Copy |
|---|---|---|
| `page` | heading + body + primary, centred **inside a card**, **shell intact** (**AC-24**). Focus moves to the heading; `role="alert"` | heading `Couldn't load captains` / body `The data didn't arrive. Try again, or pick another sub-tab from the list.` / primary `Try again` |
| `card` | one grey sentence inside the card, **with the toolbar still rendered** so the operator can change the query that failed. **`action` required** | `Couldn't load captains. The filters are unchanged.` + plain button `Try again` — the second clause exists because the first thing an operator wants to know is whether their query survived |
| `row` | replaces that row's action cell only; every other row stays interactive; **no page-level banner** (**AC-41**) | `Couldn't approve this application.` + plain button `Try again` |
| **forbidden** | §4.7 — same shape as `page`, `<h1>` = the route's title, action `Go to overview` → `session.landingRoute` (**AC-07**) | `You don't have access to this page` / `This page needs the "{permission}" permission. An owner can grant it in Admin › Team & Access.` |
| **not found** | §4.7 — same shape as `page`, **no `<h1>`** | `This page doesn't exist` / `Check the address, or pick a sub-tab from the list.` / `Go to overview` |

No `please`, no `invalid`, no `failed`, no blame (**AC-39**, `copy.md` rule 4). Errors are
imperatives that name the fix. Headings are phrases and take no period; bodies are sentences and
do (**R6**).

### 11.3 `Skeleton` — one variant per pattern, never a centred spinner

| Pattern | Shape |
|---|---|
| `SH` shell | Workspace and sub-tab **labels render immediately** from the route table — the nav is never a skeleton. Only the **count badges** are skeletons |
| P1 / P9 index | toolbar bar, header row, 8 row bars matching the real column widths |
| P2 detail | main column of 3 card outlines + rail of 3 shorter card outlines |
| P3 / P4 form | description-column bar + field column with 5 label/field pairs |
| P5 metric tiles | 4 tile outlines, each with a title bar, a value bar and a chart block |
| P6 monitor | canvas block + 3 side-list card outlines |
| P7 ledger | header row + 6 rows + an opening/closing bar |
| P8 queue | P1's shape plus an owner-chip block and an SLA-pill block per row |
| P10 feed | rounded-square avatar + two text bars, ×6 |
| Overlay | identity header block + 4 card outlines, shaped like the profile's card stack |

**AC-35**: every pattern has one, and none renders a centred spinner.

### 11.4 `Banner` — pale tinted card, four tones (R1 / R16)

| Tone | Fill | Text | Glyph | Use |
|---|---|---|---|---|
| `info` | `--ev-blue-lt` | `--ev-blue-dk` | ⓘ | a standing informational condition |
| `success` | `--ev-green-lt` | `--ev-green` | ✓ | a completed action that **left a next step** |
| `warning` | `--ev-amber-lt` | `--ev-amber-dk` | ⚠ | a standing condition needing attention |
| `critical` | `--ev-red-lt` | `--ev-red` | ⓘ-in-circle | blocking. **One per page** (R5a use #2) |

**One warning tone** (R17). Separate "waiting on them" from "waiting on you" with the **label**,
never a second fill.

Anatomy: 16 px glyph at inline-start · title 13 px/600 · optional body sentence 13 px/400 · zero to
two secondary buttons beneath the body, inline-start aligned · optional `✕`.

| Rule | Spec |
|---|---|
| Placement | first element of the **content block, spanning main + rail**, below the page header and above every card |
| Scope | scoped **to a card** when the condition belongs to that card only |
| Dismiss | `✕` present when it announces a completed action; **absent** when it names a standing condition |
| Never | more than one page-level banner. Two or more true conditions merge into one carrying a **count** (**AC-40**) |
| Never | a banner where a toast would do — no next step, no standing condition (R10) |
| `shell` variant | full-bleed above the top bar, 32 px, no radius, bottom hairline, one line + actions (§4.2) |

Full sentences take a period; fragments, titles and button labels do not (R6).

### 11.5 Toast

Dark `--ev-ink` fill, white label, **rounded rectangle radius 8 px — never a stadium** (R15),
32 px tall, one trailing `✕`. **Bottom-centre of the viewport** (§5.1, C9) — not bottom-right, which
is **D7**. Newest nearest the bottom edge; older ones push up; at most 3 visible.

- One line, **names the object exactly**, ≤ 60 characters. Truncate the object with an ellipsis,
  never the verb (R9).
- Formula: `<object> <past-participle>`, sentence case. **No period, no exclamation mark, no emoji,
  no action link, no "successfully"** (§5.1, §5.7).
- Auto-dismisses after 5 s; hover pauses; `✕` dismisses.
- **Survives a route change** within its window (**AC-23**).
- Floats above everything, including modals and shell layers.
- Announced through the **single** live region (**AC-29**) — and a toast is never the only carrier
  of information (§7.5.4).
- **RTL:** the region is centre-anchored, so there is no corner to flip, and the entry transform is
  `translateY` only. The legacy `translateX(28px)` defect (`:5288`, `:5254`) is unreproducible by
  construction. See **finding F-2** — AC-72 needs rewording because of this.

Examples, all ≤ 60 characters: `Captain updated` · `3 applications approved` ·
`Plan "Weekly — Riyadh North…" saved` · `Interface language set to Arabic` ·
`Now acting as Ops Manager` · `Sub-tabs pinned open`

### 11.6 Every shell state in spec §9.2 — final copy

No `TODO` anywhere. Every string below is final and every interpolation is a **named placeholder
inside a single key** — no concatenation (**AC-75**).

| # | State | Surface | Copy — final |
|---:|---|---|---|
| 1 | `route-not-found` | `ErrorState`, `page` scope, in the content region. Shell intact, last valid workspace still selected, **URL not rewritten** (**AC-12**) | heading `This page doesn't exist` · body `Check the address, or pick a sub-tab from the list.` · primary `Go to overview` |
| 2 | `route-forbidden` | Forbidden state in the content region. **Not a redirect, not a toast** (§11.2, **AC-56**) | heading `You don't have access to this page` · body `This page needs the "{permission}" permission. An owner can grant it in Admin › Team & Access.` · secondary `Go to overview` |
| 3 | `page-error` | The sub-tab's own `ErrorState`. **Rail, sub-tab list and top bar keep working**; the operator can navigate away without a reload (**AC-24**) | heading `Couldn't load {resource}` · body `The data didn't arrive. Try again, or pick another sub-tab.` · primary `Try again` |
| 4 | `page-partial-failure` | Row-scoped `ErrorState`. **Not a page banner. Not a toast alone** (**AC-41**) | `Couldn't {verb} this {object}.` + plain button `Try again` |
| 5 | `dirty` | Save bar replaces the top bar in place, same height, no layout shift. Nav columns stay mounted and **undimmed** | label `Unsaved plan` (entity-specific) or `Unsaved changes` · `Discard` · `Save` |
| 6 | `dirty-invalid` | Same bar, `Save` greyed, `Discard` enabled (**AC-52**) | unchanged |
| 7 | `save-in-flight` | `Save` shows progress and is not re-triggerable; `Discard` disabled | live region announces `Saving` |
| 8 | `save-failed` — validation | Form stays dirty, save bar stays up, **page-level critical banner naming the count**. A toast alone is insufficient (R10, **AC-55**) | title `To save this plan, 2 changes need to be made:` then each blocking item on its own line |
| 9 | `save-failed` — rejected | Same, when the rejection is not a field problem | title `Couldn't save this plan` · body `Nothing was changed. Try again.` · secondary `Try again` |
| 10 | `navigate-away-dirty` | Modal, 440 px, vertically centred. **Never a silent discard; never a toast as the only guard** (**AC-54**) | title `Leave without saving?` · body `Your changes to this plan will be lost. Anything you saved earlier is unaffected.` · `Cancel` · primary `Discard changes` (**blue, not red** — §5.3 restricts red, it does not mandate it, and spending red here would train operators to ignore it) |
| 11 | `nav-collapsed` | Rail disclosure + popover (§3.2). The workspace tile's badge is the only backlog signal | disclosure `Show sub-tabs` / `Hide sub-tabs` · popover pin `Keep sub-tabs open` |
| 12 | `overlay-open` | Drawer, **no scrim**. The workspace behind stays visible and readable; the rail keeps highlighting the workspace the operator is in (**AC-20**) | — |
| 13 | `overlay-loading` | Skeleton shaped like the profile's card stack. Never a spinner | — |
| 14 | `overlay-error` | Card-scoped `ErrorState` inside the layer; the layer stays dismissible | `Couldn't load this profile.` + plain button `Try again` |
| 15 | `overlay-not-found` | `no-match` empty inside the layer — one grey sentence, no illustration, no heading. Layer stays dismissible (**AC-42**) | `No record found for {id}.` |
| 16 | `impersonating` | `Banner`, `shell` variant, **warning**, full-width, undismissable, above the top bar | `You are acting as {name}.` · `Stop impersonating` |
| 17 | `call-active` | `Banner`, `shell` variant, **info**, undismissable while the call runs | `On a call with {name} · {duration}` · `End call` |
| 18 | `feed-stale` | Monitoring shell: the live dot **stops looping and goes neutral**, the freshness line switches to `Last update {duration} ago`, and the word **Live** is removed. Plus one page-level banner, **warning** | banner `Live data stopped arriving {duration} ago.` · `Reconnect` |
| 19 | `feed-dead` | The dot is **removed entirely**; the header reads `Not receiving`. The surface stops claiming to be live. One page-level banner, **critical** (R5a use #2) | banner `Live data has stopped. What you see is from {time}.` · `Reconnect` |
| 20 | `offline` | One `Banner`, `shell` variant, **warning**, merged per §5.2. Mutations disabled **with the reason named**, never silently failing | `You are offline. Changes can't be saved until the connection returns.` |
| 21 | `role-switched` | Rail, sub-tab list and every count re-derive **in the same render pass** (**AC-59**). A route now forbidden shows `route-forbidden`, **never** a silent redirect | toast `Now acting as {role}` |
| 22 | `workspace-all-hidden` | The workspace tile is **not rendered** (**AC-57**). A deep link into it shows `route-forbidden` | — |
| 23 | `language-switching` | `dir` flips on the **document element** (**AC-70**); the layout mirrors; the operator stays on the same route, same view, **same scroll position** | toast `Interface language set to Arabic` |
| 24 | `notif-unread-zero` | **No badge. Not a `0`** (**AC-26**) | popover body `No unread notifications.` · popover footer `No more notifications` |

Two shared strings the shell owns:

- Skip link: **`Skip to content`** — first focusable element in the document, visually hidden until
  focused, targeting the content region's `<main>` landmark (**AC-62**).
- Truncated list, everywhere: **`Showing {shown} of {total} {plural-noun}.`** — end-of-list and
  no-data stated in words, never a blank surface (`copy.md` rule 10).

---

## 12. Components

Every entry names its variant and its tone.

| Component | Built from | Variant | Tone | Governing rule |
|---|---|---|---|---|
| `ModuleRail` (S-01) | `button`, `badge`, `tooltip` | icon + label, 80 px | active = white pill + `--ev-blue` edge | new **D-4**, §2.1 (Admin pinned) |
| `PageNav` (S-02) | `scroll-area`, `button`, `badge`, `separator`, `popover` | expanded 224 px \| popover 224 px | active = white pill + `--ev-blue` edge | new **D-4**, spec §3.9 |
| `TopBar` (S-03) | `avatar`, `dropdown-menu`, `popover`, `input` | light, 48 px | — | **D-3** |
| `SaveBar` (S-04) | `button` | replaces `TopBar` in place | `Save` = **brand-blue primary** | §2.3 + **R2** |
| `GlobalSearch` (S-05) | `command`, `popover`, `badge` | anchored popover, 480 px | scope chip = neutral | §2.6 |
| `NotificationPanel` (S-06) | `popover`, `scroll-area`, `badge` | preview 360 px \| layer 406 px | bell badge neutral, or warning at critical | §3.8, §5.4 |
| `AccountMenu` (S-07) | `dropdown-menu`, `avatar`, `separator` | right-aligned to the avatar | — | §2.1 |
| `LiveRegionAnnouncer` (S-08) | — | one per document | — | §7.5, **AC-29** |
| `SkipToContent` (S-09) | — | visually hidden until focused | — | §7.3.4 |
| `Banner` (B-01) | `alert` | `page` \| `card` \| `shell` | info \| success \| warning \| critical — **four, pale tinted** | R1 / R16 |
| `EmptyState` (B-02) | `button` | **`first-run` \| `no-match`** | — | **R8** |
| `ErrorState` (B-03) | `button` | `page` \| `card` \| `row` | — | `copy.md`, `states.md` |
| `LoadingSkeleton` (B-04) | `skeleton` | one per §6.4 pattern row | — | `states.md`, **AC-35** |
| `AppLayout` (L-01) | S-01…S-09 | `full` \| `bleed` | — | spec §4 |
| `PageHeader` (L-02) | `button`, `badge`, `dropdown-menu` | index \| detail \| task | badges from the five-tone set | §2.2 |
| `SingleColumnPage` (L-03) | — | `full` \| `capped` (1120 px) | — | §2.2 |
| `DetailPage` (L-04) | `card`, `separator` | wide (2 : 1) \| base (restacked) | — | §2.2, §0.1 |
| `FullBleedEditorShell` (L-05) | `button`, `badge` | one only | — | §2.5 |
| `MonitorShell` (L-06) | `scroll-area`, `card` | one only, 340 px aside | — | §8.1.1 |
| `DataTable` (D-01) | `table` + TanStack, `checkbox`, `dropdown-menu`, `pagination` | **`index` \| `ledger` \| `queue`** | — | §3.1, §8.3.3, §8.4, §9.4 above |
| `IndexToolbar` (D-02) | `tabs`, `popover`, `command`, `input`, `button` | `tabs` \| `search` (replaces in place) | — | §3.2, **AC-47** |
| `FilterChipRow` (D-03) | `button`, `popover`, `badge` | — | chips neutral | §3.2 |
| `BulkActionBar` (D-04) | `button`, `dropdown-menu` | floating, inside the card | white surface | §3.3, R15 |
| `SavedViewTabs` (D-05) | `tabs`, `dialog`, `dropdown-menu` | selected tab exposes a chevron | — | §3.2 |
| `LedgerTable` (D-06) | `table`, `card` | fixed columns, no furniture | money states → success/warning/neutral | §8.3.3 |
| `WorkQueueTable` (D-07) | `table`, `card` | — | see V-04…V-07 | §8.4 |
| `MetricTile` (D-08) | `card`, `badge` | **every tile deep-links** (**AC-16**) | delta caret + colour, never colour alone | §3.7 |
| `ChartCard` (D-09) | `card`, `chart` | — | single-hue, comparison series **dotted, same hue** | §3.7; plot areas and axes **do not mirror** |
| `Timeline` (D-10) | `avatar`, `separator`, `scroll-area` | — | — | §3.8 |
| `ActivityFeed` (D-11) | `avatar`, `badge`, `scroll-area` | — | — | §3.8 |
| `StatusBadge` (V-01) | `badge` | filled \| **outline (`new`)** | **five tones, no red** | **R7, R5a, R15** |
| `Money` (V-02) | — | table cell \| standalone | `--ev-ink` always; negative is U+2212, never colour-only | §8.3.1, **R4** |
| `DerivedValue` (V-03) | — | **no box** | `--ev-blue`, not underlined, not clickable | §8.2.1 |
| `SlaCountdown` (V-04) | `progress` | pill \| pill + 3 px track | ≥50 % neutral · <50 % warning · breached → V-05 | §8.4.2 |
| `RowCriticalMarker` (V-05) | — | 3 px inset leading edge | **`--ev-red`** — R5a use #3 | **R5a** |
| `OwnerChip` (V-06) | `badge`, `button` | `Claim` \| yours \| someone else's | neutral \| success \| warning | §8.4.1 |
| `DecisionBadge` (V-07) | `badge` | outcome · actor · reason | **rejection is NEUTRAL**, never red | §8.4.5, **R5** |
| `LiveDot` (V-08) | — | opacity loop, 1200–2500 ms, never below 0.4 | **may never encode severity** | **R18** |
| `MapCanvas` (V-09) | — | — | markers from the badge palette; **red markers legal** (R5a use #4) | §8.1.5; **does not mirror** |
| `RecordPager` (V-10) | `button` | `‹ ›`, rightmost | — | §2.2 |
| `LearnMoreLink` (V-11) | — | one centred line, outside the card | — | §2.6 |
| `FormulaDisclosure` (V-12) | `popover` / inline panel | inline, in the same card section | `--ev-blue-lt` / `--ev-blue-dk` | §8.2.2 |

### 12.1 The badge palette — R7's five tones, with the `new` tone resolved

| Tone | Fill | Label | Meaning |
|---|---|---|---|
| `success` | `--ev-green-lt` | `--ev-green` | live · complete · money settled. **`Paid` is always success** (R14) |
| `warning` | `--ev-amber-lt` | `--ev-amber-dk` | needs attention · blocks money or fulfilment. **One tone** (R17) |
| `info` | `--ev-blue-lt` | `--ev-blue-dk` | not yet live · withheld — `Draft`, `Hidden` |
| `neutral` | `--ev-bg2` | `--ev-text-2` | inert · terminal factual outcome — `Archived`, `Refunded`, `Rejected` |
| `new` | **none — 1 px `--ev-blue` outline** | `--ev-blue-dk` | a new or promotional marker |

**`new` is an outline, not a fifth fill.** The rebuilt token set (`tokens.md`) has no fifth pale
tint — teal and purple are dropped — and §6.4 forbids introducing a colour that is not a token.
An outline is a **treatment**, not a sixth tone, so R7's closed set of five is intact and no
deviation is needed. Recorded here so nobody adds `--ev-teal-lt` to solve it.

Geometry: rounded rectangle, radius 8 px, 20 px tall, 11 px/600 label (12 px / 22 px in Arabic),
6 px inline padding. **Never a stadium** (R15) — this retires `border-radius:999px` (`:117`).
Badges are **never interactive**; an editable status uses a select or a card action.
**There is no red badge** (R5a). The legacy 49 `b b-red` usages are **D11**, not a precedent.

### 12.2 Restyle notes for 0.4

Every shadcn primitive arrives **non-compliant**. On the way in: strip Tailwind palette classes and
arbitrary values, **replace every Tailwind shadow class with an `--ev-shadow-*` token (§1.3)**, apply
the geometry (R15) and tone set (R7), verify the focus ring survives (§7.2) **and still composes with
the elevation in one `box-shadow` list**, verify row actions are not hover-only (§7.3), run
`/token-audit`, and record the rules applied in the component file header.

The five that most commonly ship wrong:

| Primitive | What arrives | What must ship |
|---|---|---|
| `badge` | stadium pill, `bg-slate-*`, a `destructive` variant | radius 8 px, five tones from `--ev-*`, **`destructive` variant deleted** |
| `sonner` | light card, bottom-right, action slot | dark `--ev-ink`, bottom-**centre of the viewport**, **no action slot**, `✕` only |
| `alert` | left border strip, `destructive` variant | pale tinted card, four tones, glyph + title + body + ≤2 secondary actions |
| `sheet` | scrim + focus trap | **no scrim, no trap** (§5.5, §7.3.3), 406 px, inline-end anchored, `--ev-shadow-2` **plus** a 1 px `--ev-hairline` inline-start edge (§1.3) |
| `avatar` | circle | **rounded square**, radius 8 px, 28 px in the top bar (R15) |

`components.json` must have `"rtl": true` before anything is added. If it was ever off, every
component added since is suspect.

---

## 13. Interaction and keyboard

### 13.1 What opens where — §5.0 applied

| Trigger | Result | Surface | Confirm? |
|---|---|---|---|
| Workspace tile | navigate to that workspace's Overview (**AC-06**) | page | no |
| Sub-tab row | navigate to that sub-tab | page | no |
| Sub-tab disclosure (collapsed) | sub-tab list | **popover**, rail-anchored | no |
| Popover pin | re-render the column, persist | — | no |
| Identity link in any table | detail route, **or** the 360° profile | page **or** drawer (`?entity=`) | no |
| Any id / name / KPI / notification | 360° profile | **drawer, no scrim** (`?entity=`) | no |
| Bell | top 8 by priority | **popover**, 360 px | no |
| Bell → `See all` | notification centre | **drawer, no scrim** (`?notifications=all`) | no |
| Avatar | account menu | **dropdown-menu** | no |
| Account menu → `My profile` | my profile | **drawer, no scrim** (`?account=me`) | no |
| Top-bar search / `⌘ K` | global search | **anchored popover**, 480 px | no |
| Row kebab | row actions | **dropdown-menu** | per action |
| Sort icon | field radio group + direction pair | **popover**, stays open, no Apply | no |
| Filter chip | value picker | **popover**, stays open | no |
| Date range | preset column + 2 months | **popover**, `Cancel` / `Apply` | no |
| Bulk action, destructive | — | **modal**, 440 px, verb + count in the title | **yes** |
| Bulk action, recoverable | — | **modal**, normal blue primary | yes |
| Short focused form (≤6 fields) | — | **modal**, 560 px | — |
| Choosing which *kind* to create | rows, `Cancel` only, **no primary** | **picker modal** | — |
| Take over someone's claim | — | **modal** naming the current owner | **yes** |
| Navigate away while dirty | — | **modal**, `Cancel` / `Discard changes` | **yes** |
| Long multi-section flow, consent | — | **full page** | — |
| Any successful mutation | — | **toast**, one line, ≤60 chars | — |
| A condition true until someone changes it | — | **banner**, undismissable | — |

Modal sizes: **440 px** confirmations and one-field forms · **560 px** default · **800 px**
content-rich. Always vertically centred (§5.3, C-corrected). `Cancel` left of the primary. A modal
that commits nothing gets a single `Close`. **All three sizes take `--ev-shadow-3` and a scrim**
(§1.3); every **popover** and **drawer** in the table above takes `--ev-shadow-2` and no scrim.

**Never:** a modal nested inside a drawer (§5.5) · a toast carrying an action the operator must take
· a banner where a toast would do · two page-level banners.

### 13.2 Keyboard model

Tab order = DOM order = visual order (§7.3.1). The two nav columns each use a **roving tabindex**,
so each is **one** tab stop, not five or nine.

```
1  Skip to content            (visible on first Tab, AC-62)
2  Shell banner actions       (0–2)
3  Workspace rail             ONE stop — ↑ ↓ move between tiles
4  Sub-tab disclosure
5  Admin tile
6  Sub-tab list               ONE stop — ↑ ↓ move between rows   (absent when collapsed)
7  Top bar: back · search · Mine · On call · bell · avatar
8  Content region  <main>
9  Toast region · modal root · layer root · live-region announcer
```

| Key | Where | Behaviour |
|---|---|---|
| `Tab` | anywhere | move between regions, in the order above (**AC-64**) |
| `↑` `↓` | rail, sub-tab list, search results, menus | move within the group |
| `Home` `End` | rail, sub-tab list | first / last item |
| `Enter` | nav item, link, search result | activate |
| `Enter` / `Space` | any button-role control | activate |
| `⌘ K` / `Ctrl K` | anywhere | open global search and focus it |
| `Backspace` | search, empty query | remove the scope chip |
| `Escape` | popover · menu · sheet · modal · shell layer | close the **innermost**, restore focus to the control that opened it (**AC-66**) |
| — | scrimmed surfaces (modal, alert dialog) | **trap** Tab and Shift+Tab |
| — | non-scrimmed surfaces (shell layers, popovers) | **do not trap** — §7.3.3, see finding F-1 |

**Focus is visible on everything interactive** (**AC-63**). `outline: none` without a
`focus-visible` ring is a defect, not a style choice. Focus moves into a layer on open and returns
to the opener on close.

**Accessible names for every icon-only control** (**AC-65**): the 5 rail tiles (full workspace
name), the sub-tab disclosure, the back arrow, the bell, the avatar, every row kebab, every
toolbar icon.

**Under `prefers-reduced-motion: reduce`, no element in the shell animates indefinitely**
(**AC-69**). The live dot renders statically; every drawer, toast and popover transition is
suppressed or reduced to an instant state change.

---

## 14. Arabic (§9)

Every layout rule in this document is stated in **inline-start / inline-end** terms. Nothing depends
on "left" or "right".

| Thing | Mirrors? |
|---|---|
| Both nav columns, top bar, save bar, shell banners, page header, card layout, toolbars, drawers, popovers, menus | **Yes.** The nav renders on the inline-end physical side in Arabic (**AC-71**) |
| Back arrow `←` → `→`, top-bar `›` → `‹`, pagination `‹ ›`, disclosure chevrons, `⇤` editor exit, indentation | **Yes** — swapped at **string-construction time**, never with CSS (§9.5) |
| Drawer / sheet / popover slide-in transform sign | **Yes** — `+X` becomes `−X` |
| Toast region | **No corner to flip** — it is centre-anchored and its transform is `translateY` only. See finding F-2 |
| Numeral runs (`1,234.56`), money, dates, times, ids, plates, IBANs, phone numbers | **No.** Western digits `0`–`9`, never Arabic-Indic. The **cell** aligns inline-end; the **string** does not reorder (**AC-73**) |
| Numeric column alignment | `text-align: end` — **never** `text-align: right`, which in Arabic aligns on the side the eye leaves and breaks R4's actual content |
| `⌘ K` chip | position mirrors; **glyph order does not** |
| Map canvas, markers, routes, compass | **No.** Map *chrome* mirrors |
| Chart plot areas, axes, delta arrows `↑ ↓` | **No.** A time-series axis must never reverse |
| Eyvar wordmark, the five workspace glyphs, bell, gear, magnifier, `✓`, `×`, `+`, clock, `⋯` | **No** — objects, marks and brand (§9.5) |

**Mechanics.**

- `dir="rtl"` on the **document element**, not on a subtree (**AC-70**). §9.3's ratified `.sb`-only
  scoping was a policy for a *half-translated* product; the rebuild translates everything, so its
  precondition is gone. Stated so nobody re-derives the legacy approach.
- **No blanket `scaleX(-1)` on `svg` or any broad selector.** Mirroring is per-glyph, via an opt-in
  `.icon-mirror` class, and the decision is carried in each icon's own definition.
- **Type floors** (§9.4): rail label 12 → 13 px, sub-tab row 13 → 14 px, table body 13 → 14 px,
  badge label 11 → 12 px, table header 12 → 13 px, button 13 → 14 px, line-height ≥ 1.7 for body.
  Row heights grow accordingly, which is why `--ev-navrow-h` and `--ev-row-h` have Arabic values.
- **No `text-transform`, no non-zero `letter-spacing`, no italic** on anything that can render
  Arabic — this is also §1.2's own rule in English and is currently broken in 8 selectors (**D18**).
- The Arabic face must be **Naskh**, ship 400/600/700, and cover Western digits and `، ؛ ؟`.
  `system-ui` alone is not acceptable.
- **Widths widen by token, not by a second selector** (§9.7): `--ev-rail-w` and `--ev-subnav-w`
  are redefined under the language hook. **One hook only** — never both `body.lang-ar` and
  `[dir="rtl"]` as parallel expressions of the same condition.
- **Every string resolves through a key** (**AC-74**), namespaced `nav.workspace.*` (5 + 1 short
  form) · `nav.subtab.*` (34) · `nav.view.*` · `shell.*` · `layer.*` · `state.*` · `table.*` ·
  `form.*`. Rendering with an empty Arabic dictionary must show the English fallback for every
  string and **no raw key**.
- **No concatenation.** Every interpolation is a named placeholder inside a single key
  (**AC-75**). `'🔒 Your role lacks permission: ' + label` (`:3130`) becomes one key.
- **No emoji anywhere** (**AC-76**). This removes the legacy `✋` from the owner chip, the `📟` from
  the on-call chip, and every emoji in a page title, toast, badge or nav label. Glyphs are icons,
  not emoji characters.
- Money and dates go through `Intl` with an explicit calendar and numbering system —
  `ar-SA-u-ca-gregory-nu-latn`. A bare `'ar-SA'` silently switches to the Hijri calendar and
  Arabic-Indic digits.

---

## 15. Deviations

Each names the rule it suspends. A deviation that does not name its rule is not sanctioned — it is
a defect.

| # | What | Rule suspended | Why |
|---:|---|---|---|
| 1 | **Two-level navigation** — 80 px icon+label workspace rail + 224 px sub-tab column, ~~operator-collapsible~~ **always visible** | **New §6.2 D-4** — see §16.1 for the full text and the five §2.1 clauses it names | Replaces the hover-expanding icon rail. Written into the partial as part of this step. **The collapse clause is struck** (business-owner decision 1, the visual-refinement rulings V7) |
| 2 | **Settings is a route** — Admin is a workspace and its level-2 column is its settings nav | **New §6.2 D-5**, suspending §2.4's overlay and `nav 289 + gutter 27 + pane 707` rules | Reclassified from defect **D3**. See §16.2 |
| ~~3~~ | ~~**Nav / canvas separated by a 1 px hairline, not a tonal step**~~ **→ WITHDRAWN, V3** | ~~§2.1~~ — nothing is suspended any more; §2.1 is now **honoured** | The premise was *"Eyvar's token set has no neutral darker than `--ev-bg`"*. It now has one: **`--ev-bg-nav` `#eaecf1`**, 1.035 : 1 against the canvas (the inherited step measures 1.055 : 1). The deviation existed because the token was missing, not because the rule was wrong — and the measurement showed the cost: with nav ≡ canvas at **1.000 : 1**, the white active pill fell to 1.142 : 1 and had to be propped up with a border and a 3 px marker, which is what the business owner rejected. **Withdrawing this deviation is what let V2 delete them.** The hairline stays as well; a step *and* a rule is what the reference does |
| 4 | **The top bar spans the content region; both nav columns run full height** | §2.1 — *"a dark top bar spanning the full viewport width"* | D-3 already moved the wordmark to the rail, which is what made the full-width bar's left slot meaningful. Named inside the new D-4 |
| 5 | **The save bar's inline-start slot carries the dirty label, not a logo** | §2.3 — *"MUST keep the product logo in the left slot"* | Already void for Eyvar under **D-3**; restated so nobody restores it |
| 6 | **`--ev-topbar-h` is 48 px, not D-3's 50 px** | none — this is **D-2** applied | 50 px is off-grid. D-2 sanctions smaller values **on the 4 px grid**; D15 records off-grid literals as a defect |
| 7 | **The `new` badge tone is an outline, not a fill** | none — **R7's five tones are intact** | The token set has no fifth pale tint and §6.4 forbids adding a colour. An outline is a treatment, not a sixth tone |
| 8 | **The toast is dark** | none — this **closes D7** | Recorded because the legacy toast is a light tinted card and someone will "restore" it as a regression fix |
| 9 | **Sub-tab nav row is 28 px, matching the ordinary console rhythm rather than undercutting it** | none — **R13** voids §2.3's pixel figure; **D-2** sanctions smaller, it does not *require* smaller | Recorded because it looks like D-2 is unhonoured. It is not: the binding thing is the §2.3 ↔ §3.1 **relationship** (nav row shorter than data row), which 32 broke and 28 restores. 24 would be denser still and was rejected under **§7.7** — at 24 a 20 px line box leaves no room for a focus indicator inside the row, and §7.7 may not be traded against D-2 |
| 10 | **One page width. `SingleColumnPage` has no `capped` mode** | §7.1's own two-mode rule (now struck) | Measured: `capped` moved the `<h1>` **244 px** between two sibling sub-tabs at 1920. Measure moves to the tile grid, the form column and the prose block, where it cannot move the page frame. the visual-refinement rulings V5 |
| 11 | **A workspace tile's badge is never toned** | **Q12**'s tone roll-up (`00-decisions-r3.md` §4) and **AC-27**'s tone assertion. AC-27's *count* clause is untouched | A tile's number is a sum of heterogeneous queues and a sum has no status. Measured: the old rule left **4 of 5 tiles permanently amber**. the visual-refinement rulings V6 |
| 12 | **The nav count badge does not use the badge component's fills** | none — **R7**'s five tones and **R15**'s 8 px radius both hold | The badge palette is tuned for `--ev-surface`. On `--ev-bg-nav` the neutral fill lands *lighter* than its ground (1.073 : 1, invisible) and the warning fill lands at **1.005 : 1** — literally the same luminance as the nav, so it reads as a stain rather than a chip. The nav gets `--ev-nav-chip` with `--ev-ink` digits. the visual-refinement rulings V3 |
| 13 | **No icon on the error state** | none — this is **R5a**, **R17**, **R8** and §7.5 *applied*, and is listed only because it will be requested again | See §11.2's note. Red is enumerated to four uses; amber is the one warning tone and a failure is not a warning; a grey triangle is decoration |
| 14 | **The nav's focus ring is `ring-inset`, the rest of the product's is `ring-offset-2`** | none — §7.2 requires a **visible** indicator, not a particular one | Forced by deviation 9: with row gap 0, an offset ring overlaps the neighbouring row. Inset keeps it visible and inside the pill |
| 9 | **Shell layers move focus in but do not trap it** | **AC-67** (foundation spec), **not** a `DESIGN.md` rule — §7.3.3 requires it | See finding **F-1**. The AC must change, not the design |

**The R-3 / R-1 / F-9 / Q12 decision pass adds no tenth.** The elevation scale (§1.3) creates the
token category §6.4 requires and legacy defect **D16** records as missing — that is compliance with
§6.4, not an exception to it, and it introduces no colour, so no R19-style ruling applies.
`--ev-shadow-3`'s shorter reach than the inherited figure is **R13 plus D-2 applied**, the same
way `--ev-topbar-h: 48px` was. Reasoning in `00-decisions-r3.md` §5.

---

## 16. The `DESIGN.md` amendments — written into the partial

Three edits to `docs/06-design-reference/_partials/06-eyvar-mapping.md`, made as part of this step.
**`DESIGN.md` is generated and is never hand-edited**; the rebuild
(`python docs/06-design-reference/build-design.py`) is the coordinator's, before 0.7 ships.

### 16.1 D-4 rewritten

The old entry — *"Icon rail that expands on hover — 52 px → 236 px"* — is **replaced, not
supplemented**. There is no hover expansion, because the second column holds the labels the hover
expansion existed to reveal. Leaving it would sanction a behaviour the product no longer has.

The new entry names five §2.1 clauses as suspended: the fixed ~240 px always-expanded nav; the
one-expanded-section rule; the leading-icon / no-icon-on-nested-items rule; the inset-white-pill +
elbow-connector rule; and the tonal-separation-with-no-border rule. It also names the full-width
dark top bar.

**Preserved and re-asserted, not quietly re-derived:** §2.1's *"Settings MUST be pinned to the bottom
of the nav column and MUST NOT scroll with the nav list"* — the one §2.1 nav rule this deviation
keeps intact — and §2.6's *"The app MUST NOT use breadcrumbs."* Two columns are not a breadcrumb
trail; the `Title › Subtitle` pair sanctioned by **D-3** stays at exactly two tokens; level-3
details keep the single back arrow left of the title. **D-1**, **D-2** and **D-3** survive
untouched.

### 16.2 D3 reclassified

§6.3's **D3** — *"Settings is a route, not an overlay"* — was a defect. Under **D1**, Admin is one
of five workspaces with seven sub-tabs, four former settings panes moved to Financials, and all 21
pane keys became linkable routes. A settings surface that **is** a workspace cannot also be an
overlay over a workspace. It is now a decision.

The defect row is **not deleted** — the D1–D24 numbering is cross-referenced from
`docs/ref/defects.md` and elsewhere — it is replaced with a pointer to the new sanctioned
deviation **D-5**, which names the §2.4 rules it suspends.

### 16.3 The §6.4 `fraud` row

`fraud` moves from the **Work queue (§8.4)** row to the **Metric tile row + chart cards (§3.7)**
row. Under D1 it folds into **Management › Risk & Signals**, which `PROPOSED-STRUCTURE.md` §4.2
describes as *"compute a flag, then send the operator somewhere else"* — every action button is a
`go()` to another page (`:14320`, `:14336`, `:14351`, `:14363`) — and `PAGE-TRACEABILITY-MATRIX.md`
row 4 states it *"has no work queue."* It has no claim, no SLA clock and no disposition, so
§8.4's entire apparatus is inapplicable.

Consequence for the inventory: **P8 now governs 7 legacy pages and P5 governs 8.** No component is
added or removed by the change.

---

## 17. Findings — raised, not decided by me

| # | Finding | Owner | Blocks |
|---:|---|---|---|
| **F-1** | **AC-67 contradicts §7.3.3.** AC-67 requires a focus trap on the shell layers; §7.3.3 forbids a trap on any surface without a scrim, and §5.5 forbids the scrim. §7 overrides §1–§5 and sits above an AC entirely. **Recommend: amend AC-67 to "moves focus into it", dropping the trap clause.** The alternative — adding a scrim — voids the whole drawer-over-modal argument in §6.1 | product-owner | **AC-67**, visual-QA and QA sign-off on 0.8 |
| **F-2** | **AC-72 is unsatisfiable as written.** *"In Arabic, toasts and shell layers enter from the mirrored edge."* The toast region is **centre-anchored** (§5.1, R9, and the fix for **D7**), so it has no edge to mirror; its transform is `translateY` only. **Recommend: reword to "shell layers enter from the mirrored edge; the toast region is centre-anchored and does not mirror."** | product-owner | **AC-72** |
| **F-3** | **Spec §3.9's two keyboard clauses cannot both hold.** The disclosure is required to live *in the rail* and to be *in the tab order in the column's place*. §2.5 above places it between the four workspace tiles and Admin, keeping visual order = DOM order = tab order (§7.3). §3.9's stated order ("rail (4 + pinned Admin) → sub-tab list") therefore becomes "rail (4) → disclosure → Admin → sub-tab list". **Confirm or correct** | product-owner | **AC-64** wording |
| **F-4** | **The single-breakpoint rule over-drops the right rail.** Geometry shows a 2 : 1 detail fits at 1280 px with both nav columns expanded (976 px content = 640 + 16 + 320). D2's one-number requirement plus AC-32's window forces the rail to restack in a band where it would fit. **Accepted, recorded, not to be "fixed" with a second breakpoint** | — | nothing; recorded |
| **F-5** | **`docs/ref/patterns.md` will be a lie** the moment `DESIGN.md` is rebuilt. Its §6.4 mirror still lists `fraud` under **Work queue**. `docs/ref/README.md`: *"When `DESIGN.md` changes, the matching ref file is updated in the same commit or it becomes a lie."* **I am not permitted to edit it.** It needs one line changed in the same commit as the rebuild | coordinator | consistency of `docs/ref/` |
| **F-6** | **D4 (role model) is still open, and this design does not depend on it.** Workspace-tile and sub-tab-row visibility are a **filter over the route table**, not a layout branch: a tile renders when the role can see ≥1 sub-tab in it (**AC-57**), a row renders when the role holds its view permission (**AC-58**). Adding `Trust & Safety` and `Dispatcher` is a **data change**. Neither role is assumed anywhere above | business owner | **AC-61**, not this spec |
| **F-7** | **Q1 (persistence) blocks AC-33.** `ui.subTabNavCollapsed`, `ui.language` and per-table view state have nowhere to live. The shell ships in-memory and **fails AC-33 explicitly, as a recorded gap** | engineering lead | **AC-33** |
| **F-9** | **CLOSED — §18 said "six" Arabic overrides; §1.2's table lists seven.** The table is normative and 0.4 implemented seven. `--ev-control-h-lg` is the one the prose dropped; it must move with `--ev-control-h` or the in-form primary stops matching the field beside it at exactly the language where the type floor rose. §18 corrected in this pass. The §14 type floors also vary by language but are **not** part of the seven — geometry and type are different rules (§9.7 vs §9.4) | — | closed |
| **R-3** | **CLOSED — the elevation scale.** `--ev-shadow-1/2/3` in §1.3, derived in `00-decisions-r3.md` §1 from five reference frames sampled pixel by pixel. Blur and offset compress under **D-2**; alpha does not, because alpha is contrast, not a dimension. Two honest corrections to `DESIGN.md` §1.4's `[observed]` table are recorded there: the no-scrim drawer shows **no** measurable shadow, and the bulk-action bar's "pronounced" shadow measures the same as a popover's | — | closed |
| **R-1** | **CLOSED — shadcn `empty` is not added, `components.json` stays frozen.** A slot API has no `kind`, which makes an R8 violation one import away; and neither of our two shapes is its shape. §11.1 | — | closed |
| **Q12** | **CLOSED — the roll-up escalates, gated on `count > 0`.** §2.4 carries the full three-clause rule and the reveal test. One fixture is needed from 0.6 to make the gate testable: an `attention` sub-tab with a zero count whose tile must still read **neutral** | — | closed |
| **F-8** | **Q5 (charts) must close inside 0.4.** `ChartCard` (D-09) requires a chart primitive that themes entirely to `--ev-*` and ships **no built-in palette**. If shadcn `chart` / Recharts fails that, a chart primitive is a Phase-0-sized task nobody has budgeted | frontend-engineer | Management × 3, and 5 Overview sub-tabs |

---

## 18. Handoff

### To **frontend-engineer** (0.3, 0.4, 0.7)

- **Do not run `shadcn add sidebar`.** Q6 is closed: the rail is **built** (§0.2). Every primitive
  `ModuleRail` and `PageNav` need is already on spec §5.2's list.
- **The breakpoint is `1344px`.** One token, one media query, used for the nav default (§3.3), the
  right-rail drop (§7.2) and the metric-tile grid. There is no second breakpoint.
- **Both nav columns are route-derived.** No handler ever sets an active state (**AC-08**).
- **`DataTable` takes a `mode` prop** — `index | ledger | queue` — and the mode, not the route,
  decides the furniture (§9.4). This is what makes Operations › People buildable.
- **The elevation scale is `--ev-shadow-1/2/3`** (§1.3). Three tiers, closed set. Cards take 1,
  everything transient-and-unscrimmed takes 2, modals take 3, and the frame takes none. Drop the
  provisional values and the Tailwind `rgb(0 0 0 / .1)`. Watch the focus-ring collision: `box-shadow`
  is one property and §7.2's ring already occupies it.
- **Do not run `shadcn add empty`.** R-1 is closed (§11.1): `EmptyState`'s `kind` prop is what keeps
  R8 enforceable, and a slot API would make the wrong empty one import away.
- **Restyle every primitive on arrival** (§12.2). The five listed there are the ones that ship
  wrongest.
- Answer, in 0.4, what a built rail costs versus `sidebar`. If the four objections in §0.2 are
  cheaper to override than I think, bring evidence — but the default is built and
  `components.json` freezes after 0.4.

### To **utilities-engineer** (0.5)

Token requests for `src/styles/globals.css` — **I do not write that file.** All values in §1.2.

- `--ev-bp-wide: 1344px` and its Arabic-invariant use.
- `--ev-rail-w`, `--ev-subnav-w`, `--ev-navrow-h`, `--ev-row-h`, `--ev-row-h-media`,
  `--ev-control-h`, `--ev-control-h-lg`, `--ev-topbar-h`, `--ev-shellbar-h`, `--ev-page-max`,
  `--ev-detail-rail-w`, `--ev-monitor-aside-w`, `--ev-drawer-w`, `--ev-radius-card`,
  `--ev-radius-control`.
- **`--ev-shadow-1`, `--ev-shadow-2`, `--ev-shadow-3`** — exact values in **§1.3**. Language- and
  direction-invariant (`offset-x: 0` in all three), so they are **not** redefined under the language
  hook. Closed set of three; a fourth needs a §6.2 entry. This closes the last category still
  resolving to a non-Eyvar value.
- **Arabic overrides for the seven that vary by language** — `--ev-rail-w`, `--ev-subnav-w`,
  `--ev-navrow-h`, `--ev-row-h`, `--ev-row-h-media`, `--ev-control-h` **and `--ev-control-h-lg`**.
  §9.7 rules that a dimension varying by language is a custom property redefined under **one**
  language hook, never a second selector and never a §6.2 entry. The §14 type floors live under the
  same hook and also vary, but they are type, not geometry, and are counted separately — "seven
  dimensions plus the type floors" is the accurate phrasing. (This corrects the earlier "six";
  finding **F-9**.)
- **`--ev-marker: 3px` is confirmed** — name and value both. 0.4 added it and asked me to confirm.
  It is the SLA countdown track (§8.4.2 / V-04) and the R5a row-critical leading edge, and one token
  in three places is the right call. It is **not** elevation: never express it in terms of
  `--ev-shadow-*`, and its `inset 3px 0 0` still needs the `inset-inline-start` pseudo-element in RTL.
- **No new colour token.** `new` badges are an outline (§12.1). If anyone asks for `--ev-teal-lt`,
  the answer is in §12.1.

Helper requests:

- `formatMoney` — **exactly one formatter.** `<amount> SAR`, trailing ISO code, exactly 2 decimals
  always, `,` thousands, `tabular-nums`, U+2212 for negative, `0.00 SAR` for zero, `—` reserved for
  not-applicable. Via `Intl.NumberFormat` with `numberingSystem: 'latn'`.
- `formatDate` — via `Intl.DateTimeFormat` with an **explicit calendar and numbering system**
  (`ar-SA-u-ca-gregory-nu-latn`). Never a bare `'ar-SA'`, never an empty locale array.
- SLA helpers — one duration formatter producing exactly `Nm left` / `Nh Mm left` / `Nd Hh left` /
  `overdue Nm`, plus a band function returning `neutral | warning | breached` from the item's **own**
  SLA target. `No clock` is a distinct return value and it **sorts last**.
- `useIndexTable` — must express the three modes (`index | ledger | queue`) and must make
  `ledger` structurally unable to produce a selection, a kebab or a sort.
- One `useNavCollapse` — seeded from viewport **at first run only**, never re-derived from a resize
  listener. This is the single most important thing not to get wrong (§3.3).
- One clock: a single `setInterval(…, 1000)` with modulo buckets, exposed as shell state
  (**AC-28**). **Per-page intervals are forbidden.** Renderers gate on visibility.
- One live-region announcer (**AC-29**).

### To **mock-data-engineer** (0.6)

The route table (§8.5 of the spec) is a **data artifact**. It needs `nav.subTabCount`,
`nav.workspaceCount` (the sum), and `nav.badgeTone` (`attention | neutral`) so §2.4 renders. Fixtures
must include a zero count on at least one sub-tab so **AC-26** is testable, and a role for whom a
whole workspace is hidden so **AC-57** is testable. Inducible failure on **every** shell read
(**AC-36**).

**Q12 is answered in §2.4 and the answer constrains 0.6 twice.** First: there is **no
`nav.workspaceBadgeTone` field** — the tile's tone is computed in the shell from the sub-tab data,
because two sources for one answer is how they drift apart. Second, one more fixture: a workspace
containing a sub-tab with `badgeTone: 'attention'` **and `subTabCount: 0`**, alongside siblings with
non-zero neutral counts. That tile must render a **neutral** badge. Without that fixture the
`count > 0` gate is untested and will be lost in the first refactor.

### To **product-owner**

Findings **F-1**, **F-2** and **F-3** need a decision before QA can sign 0.8. F-1 is the one with
teeth: AC-67 and `DESIGN.md` §7.3.3 cannot both be satisfied.

### To the **coordinator**

The partial is edited (§16). `DESIGN.md` still needs rebuilding, and `docs/ref/patterns.md` needs
its `fraud` row moved in the same commit (**F-5**) — I am not permitted to edit it.
