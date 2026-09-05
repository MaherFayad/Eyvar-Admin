## 1. Foundations

> ### ⚠ D7 — this section is PROVENANCE, not authority
>
> **Nothing visual below describes what Eyvar ships.** Colour, spacing, radii, borders, the
> type scale, nav treatment, card treatment and table style are settled by the token layer,
> `src/styles/globals.css`, summarised in `docs/ref/tokens.md`.
>
> What still binds from this section is **structure** — what a page is made of, what goes in
> a header, what a state is for — and only where §6 adopts it. Every pixel figure was already
> non-binding under **R13**; under D7 it is non-binding twice over.
>
> **Claim marking.** `[observed]` = measurable in the evidence cited on that line.
> `[recalled]` = general design-system knowledge, **not** verifiable here.
> Where the two disagree, the `[observed]` value wins.
>
> **All "px" numbers below are approximations** (±2 px), converted from measured image
> pixels at a ~1460 px viewport under one calibration of ≈1.90× (R13). Where a ruling names
> a specific corrected figure, that named figure governs.

---

### 1.1 Color

#### 1.1.1 Surface / background layers

The admin is built from exactly **three** neutral layers plus one inverted layer. There is no
"white page" — the canvas is always a light grey and cards are always white on top of it.

| Token (proposed) | Value (approx.) | Where seen |
| --- | --- | --- |
| `bg-canvas` — page background `[recalled]` (name) / value `[inferred]` | `#F1F1F1` warm light grey — sampled | Behind every card on every page |
| `bg-surface` — card background `[recalled]` (name) / value `[inferred]` | `#FFFFFF` | Every card, table, popover, modal, auth card |
| `bg-nav` — sidebar `[inferred]` | **`#EBEBEB`** — one step **darker** than the canvas, not the same colour. Sampled on both sides of the x≈129 boundary: nav `#EBEBEB`, canvas `#F1F1F1`. There is still **no border, divider or shadow** between them — the step is tonal only | Left nav on all admin pages |
| `bg-nav-selected` `[inferred]` | `#FFFFFF` rounded pill + hairline/very soft shadow | "Products" / "Customers" / "Analytics" active nav item — and, contrary to §2.1's earlier claim, **nested** active items too (see §2.1) |
| `bg-surface-secondary` `[inferred]` | ~`#F7F7F7`–`#FAFAFA` | Nested sub-blocks inside cards (fulfillment line-item block, the "This app needs to" strip on the install screen) |
| `bg-inverse` — dark top bar `[recalled]` (name) / value `[inferred]` | `#1A1A1A`–`#1C1C1C` near-black | Global top bar on every admin page; contextual save bar; toasts |
| `bg-inverse-field` `[inferred]` | ~`#303030` (one step lighter than the bar) | The global search field sitting inside the dark top bar |
| `bg-backdrop` — modal scrim `[inferred]` | Black at ~40–50% opacity (canvas goes `#EBEBEB` → ~`#777777` behind a modal) | Behind confirm modals, the settings modal, the global search modal |

> **All hex values in §1.1 are sampled from compressed, downscaled WebP captures and are
> approximations, not tokens — hence `[inferred]`.** The token *names* are `[recalled]` (recalled from
> the design system, not sampled). Nothing here is a token; Eyvar's tokens are in
> `src/styles/globals.css`.

The nav is a *near*-canvas grey: one tonal step darker, with nothing drawn between the two columns.
The "panel" reads as a panel because of that step **plus** the white pill on the selected item — but
it is emphatically not a contrasting sidebar fill.

#### 1.1.2 Text colors

| Token (proposed) | Value (approx.) | Used for |
| --- | --- | --- |
| `text` `[recalled]` (name) / value `[inferred]` | `#303030` near-black (never pure `#000`) — note this is **body text only**; the primary *button* fill is a different value, `#3E3E3E` (§1.1.4) | Page titles, card headings, table cell primary values, body copy |
| `text-secondary` `[recalled]` (name) / value `[inferred]` | `#616161` medium grey | Table column headers, helper text under fields, timestamps, card subtitles, nav section labels |
| `text-disabled` `[recalled]` (name) / value `[inferred]` | `#B5B5B5` light grey | Disabled button labels ("Send invoice", "Post", greyed "Export"), disabled checkbox labels, empty-cell em-dashes |
| `text-inverse` `[inferred]` | `#FFFFFF` / ~`#E3E3E3` for secondary on dark | Top bar labels, toast text, primary-button labels |
| `text-link` `[inferred]` | Strong blue ~`#005BD3` | Inline links — "Learn more", "process of erasure requests", the customer email address on a customer row, "tax rates", the blue product title in a picked-resource row |
| `text-critical-inline` `[inferred]` | Red-brown ~`#825F62`–`#76584D` | Low-stock inventory counts in the products index — **"0 in stock" / "5 in stock" are not blue links**, they are a critical low-stock tone; the trailing qualifier ("for 24 variants") stays subdued grey |

#### 1.1.3 Borders

| Token (proposed) | Value (approx.) | Used for |
| --- | --- | --- |
| `border` `[recalled]` (name) / value `[inferred]` | `#E3E3E3` hairline | Card outlines, dividers between card sections, table row dividers, popover/menu separators |
| `border-input` `[inferred]` | ~`#CDCDCD`–`#8A8A8A` (darker than `border`) | Text input, select and textarea outlines — deliberately stronger than card borders so fields read as targets |
| `border-critical` `[inferred]` | Red ~`#D72C0D` | Invalid input outline |
| `border-focus` `[inferred]` | **Desaturated blue ~`#687B9F`–`#8493B7`, ~2 px** — not near-black | The only genuine focus state in the set: the open "Option name" combobox. was mis-cited here — it contains **no** focused field; every input on it, the quantity field included, carries the resting hairline |

All borders are **1 px**. There is no 2 px border anywhere except focus rings and the selected-state
outline on segmented/toggle controls.

#### 1.1.4 Interactive / brand

The brand accent for **actions** is not a hue — it is **near-black**. Blue is reserved for **links**.

| Role | Value (approx.) |
| --- | --- |
| Primary button fill `[inferred]` | **`#3E3E3E`** near-black, white label — sampled over the large flat fill of the auth primary. This is **not** the same value as body text (`#303030`); the document previously used one number for both |
| Secondary button `[inferred]` | White fill, `#E3E3E3`-ish border, `#303030` label |
| Tertiary / plain `[inferred]` | No fill, no border, blue or dark label |
| Link blue `[inferred]` | ~`#005BD3` |
| Save-bar primary — **green** `[inferred]` | **`#367C62`** green fill, white label — sampled; the earlier `~#2CA36A` was a recalled value, not a measured one |
| Save-bar primary — **white** `[inferred]` | White fill, dark label, on the dark bar |
| Selected radio / checked checkbox `[inferred]` | Solid near-black `#303030` |

Note the **inconsistency worth not copying**: the same "contextual save bar" component uses a green
Save in the account surface and a white Save in the store admin. Eyvar should pick one.

#### 1.1.5 Status color family

Two *distinct* expressions of status exist in these captures, and they must not be mixed up:

**A. Badges — tonal (pale fill + dark same-hue text), with either a leading dot or a leading glyph
depending on where the badge sits (see §1.5).**

| Tone | Fill / text (approx.) | Example labels |
| --- | --- | --- |
| Success `[inferred]` | Pale mint `#C3FED8`-ish fill, deep green `#0C5132` text | `Active`, `Live`, `Fulfilled (1)` on the fulfilment **card header**, `Paid` in billing history |
| Warning `[inferred]` | **The baseline ships two fills in this family**, visible side by side in one row: `Payment pending` = peach/orange **`#F4D6B1`**, `Unfulfilled` = yellow **`#F6EA98`**. Dark brown ~`#4F3812` text in both. Neither is the `#FFEFC9` this table previously claimed. **Eyvar collapses the pair into one warning tone (R7 — the palette is five tones); pick the yellow and use it for both** | `Unfulfilled`, `Payment pending` |
| Info `[inferred]` | Pale blue fill ~`#DCE8F1`, deep blue text | `Draft` (products & discounts lists) — sampled blue, **not** grey; §3.4's neutral listing was wrong. Also `Hidden` on blog posts |
| New `[inferred]` | Pale lavender/violet fill, purple text | Category chips (`Clothing`) in the bulk editor; tag chips |
| Neutral `[inferred]` | `#E3E3E3`–`#F0F0F0` fill, `#303030` text, dark dot | `Archived`, `Refunded`, `Voided`, and the **title-row** `Fulfilled` / `Paid` badges on an order detail page |
| Critical `[recalled]` | Pale red fill, deep red text — **not directly observed as a badge** in any screenshot read | — |

Two honest complications, neither of which is resolved by deleting evidence:

- **`Paid` genuinely ships in two tones.** Green in; grey
  in  and
. **R14 rules that Eyvar's `Paid` is the
  success (green) tone**, product-wide. The grey rendering is the baseline's inconsistency, not a second
  Eyvar tone.
- **`Fulfilled` likewise.** Green with a delivery-truck glyph on the fulfilment card header, grey with
  a dot in the page title row of the *same* screen, and grey in the global-search results list. The
  earlier citation of  as evidence for a
  *green* `Fulfilled` is wrong — every order badge in that file samples neutral grey
  (`#F0F0F0`–`#F1F1F1`). Eyvar takes the success tone, per the same reasoning as R14.
- **`Code` is not a badge at all.** In  it is plain text in
  the `Method` column — no pill, no fill. It belongs to §3.4's "plain text when the value is
  descriptive" rule, not to this table.

**B. Banners — solid saturated header strip + white card body.** This is the modern admin banner
and it is *not* the tonal style.

| Tone | Header strip (approx.) | Body |
| --- | --- | --- |
| Success `[inferred]` | Saturated green **`#45815D`** (sampled; the earlier `~#1F8A4C` was recalled), white text, white check icon | White, dark text |
| Critical `[inferred]` | Saturated red **`#D03822`** (sampled; the earlier `~#E02F2F` was recalled), white text, white alert icon | White, dark text |
| Warning `[inferred]` | Amber ~`#F0A93B`, **dark** text/icon (not white) | White, dark text |
| Info `[inferred]` | **Both treatments ship.** Plain white surface + hairline + blue circular leading icon in; a genuine pale blue fill (sampled **`#EDF4FF`**) in and inside form flows (§4.4) | — |

**Which of the two Eyvar ships — R1 and R16.** R1 already picks the **soft tinted card** over the
saturated split strip for every tone. R16 extends that to the info tone specifically: **all four
banner tones are pale tinted cards.** The warning surface has the same two-way split as info —
saturated amber strip on one surface, pale yellow card
in the forms surface (§4.4) — and
R1 settles it the same way.

**C. Legacy tonal banner** still exists in auth: pale green fill + green icon + dark text
. Do not reproduce this third style.

**D. Inline field error `[observed]`**: red input border + very pale red field fill (~`#FFF0F0`) +
red filled alert icon + red 12 px message below the field

**Rules**
- MUST use `bg-canvas` (`#F1F1F1`) for the app canvas and `bg-surface` (`#FFFFFF`) for every card; a card MUST NEVER sit directly on a white page.
- MUST give the left nav a **near-canvas grey one step darker** than the canvas (`#EBEBEB` against `#F1F1F1`) and express selection with a white rounded pill; MUST NOT draw a border, divider or shadow between nav and content, and MUST NOT give the nav a contrasting panel fill. *(Was: "the **same** fill as the canvas" — falsified; the nav samples `#EBEBEB` and the canvas `#F1F1F1` in all five frames checked. The no-divider half of the old rule survives; the same-colour half does not.)*
- MUST use near-black (`#3E3E3E` for the fill, `#303030` for body text — they are **not** the same value), not a saturated hue, for primary button fills; blue is reserved for links and MUST NOT be used as a button fill.
  **→ Does not bind Eyvar. Superseded by R3 + §6.2 D-1: Eyvar's primary is brand blue, and links take `--blue-dk` + underline.**
- MUST NOT use pure `#000000` or pure `#FFFFFF` for body text; primary text is `#303030`, inverse text is white only on the `bg-inverse` bar.
- MUST render status **badges** in the tonal style (pale fill + dark same-hue text) and status **banners** in one consistent family; MUST NOT mix two banner expressions in one product. *(R1 picks the soft tinted card.)*
- MUST use dark text on the warning/amber surface and white text on green/red surfaces; MUST verify ≥4.5:1 contrast for each pairing before shipping.
- ~~MUST express "info" banners as a neutral white surface with a blue leading icon, not as a blue fill.~~
  **→ Deleted under R16.** Falsified by the document's own evidence:
  ships an info banner whose fill samples `#EDF4FF`, a real blue tint. Both treatments exist in
  the baseline; under R1/R16 Eyvar's info banner is a **pale tinted card**, like the other three tones.
- MUST render `Paid` in the success tone product-wide (R14). The baseline ships it two ways; Eyvar does not reproduce that split.
- MUST collapse the baseline's two warning fills (peach `#F4D6B1`, yellow `#F6EA98`) into the **single** Eyvar warning tone required by R7; MUST NOT introduce a second amber.
- SHOULD ship exactly six badge tones (success, warning, critical, info, new, neutral) and SHOULD NOT invent a seventh.
  **→ Superseded by R7: the Eyvar palette is five tones — success, warning, info, neutral, new. There is no critical badge.**
- SHOULD pick one primary color for the contextual save bar and use it in every surface — never green in one area and white in another.

---

### 1.2 Typography

One family throughout (Inter with a system fallback stack `[recalled]`; the evidence shows
a single geometric-humanist sans everywhere `[observed]`). The ramp is unusually **small and tight** —
body text is 13 px, not 14 or 16 — which is what makes the admin feel dense and tool-like.

| Role | Size / weight (approx.) | Color | Where used |
| --- | --- | --- | --- |
| Page title `[observed]` | ~20 px / 600–650, tight leading | `text` | "Products", "Discounts", "Analytics", "Finances", "Customers", "#1003" |
| Modal / sheet title `[observed]` | ~15–16 px / 600 | `text` | "Archive 3 products?", "Edit profile", "Abandoned checkout" |
| Section / card heading `[observed]` | ~13–14 px / 600 | `text` | "Pricing", "Inventory", "Shipping", "Notes", "Customer", "Timeline", "Earnings", "Active dates" |
| Body `[observed]` | ~13 px / 400, ~20 px line-height | `text` | Card copy, table cells, menu items, nav labels, list rows |
| Small / subdued `[observed]` | ~12 px / 400 | `text-secondary` | Field helper text, timestamps ("1 minute ago"), page subtitles ("January 8, 2024 at 11:50 pm from Draft Orders"), nav section labels ("Sales channels", "Apps"), footnotes ("Only you and other staff can see comments") |
| Table column header `[observed]` | ~12–13 px / 500, sentence case (**never** uppercase, **never** letter-spaced) | `text-secondary` | "Product", "Status", "Inventory", "Payment status", "Combinations" |
| Button label `[observed]` | ~13 px / 500–600 | context | All buttons, in every size |
| Field label `[observed]` | ~12–13 px / 400–500 | `text` | "First name", "Price", "Start date" |
| Badge label `[observed]` | ~11–12 px / 500 | tone text | `Active`, `Unfulfilled` |
| Metric / KPI number `[observed]` | ~18–20 px / 600 | `text` | "$34.00", "0%", "$19.00", "$18.00" on analytics & finances cards |
| Display (marketing surfaces only) `[observed]` | ~28–32 px / 600–700 | `text` | "POS Lite" / "POS Pro" / "$79" on the plan-picker |

Observations that matter:
- There are only **two weights in practice**: regular (400) and semibold (600ish). Medium (500) shows up on button/table-header labels. No light, no black, no italics anywhere in 33 captures.
- **Card heading and body differ by ~1 px and one weight step.** Hierarchy inside a card comes from weight and spacing, not size.  is the clearest example.
- **All caps is never used.** Not for table headers, not for badges, not for nav sections.
- Numbers in tables are right-aligned; labels are left-aligned.

`[recalled]` token names for the same ramp: `--p-font-size-300` (12), `--p-font-size-325` (13),
`--p-font-size-350` (14), `--p-font-size-400` (16), `--p-font-size-500` (20); weights
`--p-font-weight-regular` / `-medium` / `-semibold` / `-bold`.

**Rules**
- MUST set body text to 13 px with a 20 px line-height and MUST NOT raise it to 14 or 16 px "for readability" — density is a deliberate property of an admin.
- MUST use exactly one type family across the entire product.
- MUST cap the ramp at six roles (page title, card heading, body, small/subdued, table header, button label) and MUST NOT add sizes ad hoc.
- MUST use only regular / medium / semibold weights; MUST NOT use light, black, or italic.
- MUST write table headers, badges, and nav section labels in **sentence case**; MUST NOT use uppercase or letter-spacing.
- MUST separate card headings from body copy by weight and spacing, not by a large size jump (≤2 px difference).
- SHOULD right-align numeric table columns and left-align everything else.
- SHOULD reserve sizes above 20 px for marketing/plan-picker surfaces only, never for functional admin pages.

---

### 1.3 Spacing & grid

**Base unit: 4 px.** Every measured gap resolves to a multiple of 4, with 8 / 12 / 16 / 20 / 24 doing
almost all the work. `[observed]` across all captures; `[recalled]` names these
`--p-space-100` = 4, `-200` = 8, `-300` = 12, `-400` = 16, `-500` = 20, `-600` = 24, `-800` = 32.

| Measurement | Value (approx.) |
| --- | --- |
| Top bar height `[observed]` | **56 px** |
| Left nav width `[observed]` | **240 px** |
| Nav item height `[observed]` | ~28–32 px, 8 px horizontal padding, 8 px icon→label gap |
| Page gutter (canvas → card) `[observed]` | **24 px** left and right |
| Page top padding (bar → title) `[observed]` | ~20–24 px |
| Title → first card `[observed]` | ~20–24 px |
| **Card padding** `[observed]` | **16 px** on all sides |
| **Gap between stacked cards** `[observed]` | **16 px** |
| Gap between side-by-side cards `[observed]` | ~16–20 px |
| Card heading → first content `[observed]` | ~12 px |
| **Form field vertical rhythm** `[observed]` | label→input **4 px**; input→helper text **4 px**; field block→next field block **16 px** |
| Two fields on one row: horizontal gap `[observed]` | **16 px**, equal widths |
| Input height `[observed]` | ~32 px, ~8–12 px horizontal padding |
| Button height `[observed]` | ~28–32 px (medium); page-header buttons ~28 px |
| Gap between adjacent buttons `[observed]` | **8 px** |
| Checkbox/radio → label gap `[observed]` | **8 px**; between stacked options **12 px** |

**Page width & layout**

| Layout | Measurement |
| --- | --- |
| Detail / form page max width `[observed]` | **~950–1000 px**, centered in the remaining space after the 240 px nav |
| Index / list page `[observed]` | **Fluid full width** — stretches to viewport minus 24 px gutters (~1150 px at 1440) |
| Settings modal content max width `[observed]` | **~1000 px**, with its own ~280 px internal settings nav |
| **Two-column detail layout (main + right sidebar)** `[observed]` | main ~640 px: sidebar ~290 px ⇒ **≈ 2: 1**, with a ~16–20 px column gap. Sidebar holds small standalone cards (Notes, Customer, Publishing, Tags, Fraud analysis) each 16 px apart |
| **Annotated form layout (label column + card)** `[observed]` | description ~310 px: content ~620 px ⇒ **1: 2**, ~20 px gap; the description column is plain text on the canvas, the content column is a card |
| Analytics metric grid `[observed]` | 3 equal columns, **~19–20 px gutters** — card edges measure 142→338, 350→546, 557→753 img px, so the gaps are 11 and 10 img px. Both the ~16 px stated here and §3.7's ~12 px were low (C10) |

**Table metrics**

| Measurement | Value (approx.) |
| --- | --- |
| Table header row height `[observed]` | ~40 px |
| Row height, text only `[observed]` | ~36–40 px |
| Row height, with a **40 px** thumbnail `[observed]` | ~52–56 px. The thumbnail is ~40×40 px, not 32 — ≈23×20 img px at 1.90× (C11; §3.1 was right) |
| Row height, two-line (title + subtitle) `[observed]` | ~56 px |
| First column left padding `[observed]` | ~12–16 px, aligned with the leading checkbox |
| Cell horizontal gap `[observed]` | ~16–24 px between columns |
| Tabs strip inside the list card `[observed]` | ~40 px tall, sits **inside** the card above the table, separated by a hairline |

**Rules**
- MUST build every spacing value from a 4 px base unit; MUST NOT ship arbitrary values like 10, 14, 18, or 22 px.
- MUST use 16 px card padding and a 16 px gap between stacked cards — the same value, so cards read as an evenly spaced stack.
- MUST use a 24 px page gutter between the canvas edge and any card.
- MUST cap detail and form pages at ~1000 px and center them; MUST let index/list pages run full width to the 24 px gutters.
- MUST use a 2:1 ratio for main-content-plus-right-sidebar detail pages, and 1:2 for annotated form sections (description text on the canvas, fields in a card).
- MUST space form fields 16 px apart vertically and 4 px between a label and its input.
- MUST NOT let a table row with a 40 px thumbnail be shorter than ~52 px, or a text-only row shorter than ~36 px.
- SHOULD place list filters/tabs inside the list card rather than above it on the canvas.
- SHOULD keep button clusters at an 8 px gap and align them to the right edge of the page header.

---

### 1.4 Shape & elevation

Corner radii step in 4 px increments and correlate with component size: the bigger the surface, the
rounder it is.

| Component class | Radius (approx.) | `[recalled]` token |
| --- | --- | --- |
| Card / panel / table container `[observed]` | **~12 px** | `--p-border-radius-300` |
| Modal / sheet `[observed]` | **~12–16 px** | `--p-border-radius-300`/`-400` |
| Button / input / select / popover / menu `[observed]` | **~8 px** | `--p-border-radius-200` |
| Badge / chip / tag `[observed]` | **~8 px** (soft rectangle, **not** a full pill). Zoomed: ~3–4 img px radius on an 11 img px badge — a stadium would need 5.5 | `--p-border-radius-200` |
| Toast `[observed]` | **~8 px** — measured ~4–5 img px radius on a 23 img px pill; a true stadium would be 11.5 | `--p-border-radius-200` |
| Avatar / initial badge `[observed]` | **~8 px rounded square** — never a circle | `--p-border-radius-200` |

**→ R15 confirms this block and overrides the sections that contradicted it.** Badges, toasts and
avatars are rounded rectangles/squares at ~8 px — never stadium pills, never circles. §3.4's "fully
rounded ends", §5.1's "rounded pill" and §3.8's "circular avatar" are corrected accordingly.
| Thumbnail (product image) `[observed]` | **~8 px** | `--p-border-radius-200` | |
| Nav item / tab `[observed]` | **~8 px** | `--p-border-radius-200` | |
| Checkbox `[observed]` | **~4 px** | `--p-border-radius-100` | |
| Radio / status dot / progress track `[observed]` | Full circle | `--p-border-radius-full` | |

**Border width is always 1 px.** The only exceptions are the focus ring (~2 px, dark) and the selected
segment on segmented controls.

**Elevation — the border-vs-shadow decision:**

| Surface | Treatment |
| --- | --- |
| **Card on the canvas** `[observed]` | 1 px `#E3E3E3` border **plus** a barely-there downward shadow (≈ `0 1px 0 rgba(0,0,0,.05)`). It is essentially a bordered surface, not a floating one. |
| **Nested block inside a card** `[observed]` | 1 px border **only**, no shadow, often on a `#F7F7F7` fill |
| **Popover / dropdown menu** `[observed]` | Clear soft shadow, minimal or no visible border — it must read as detached from the page |
| **Notification popover** `[observed]` | Same as popover: shadow, anchored under the bell, **~400 px wide** — it spans x 556→757 = ~201 **image** px, which this table previously read as CSS px. §2.6 has it right |
| **Modal** `[observed]` | Large soft shadow **plus** a page-wide dark scrim; no border |
| **Settings modal (full-screen sheet)** `[observed]` | Inset ~8 px from the left/right, top edge ~68 px down, rounded top corners, shadow + scrim; the admin remains dimly visible behind |
| **Right-side guide drawer** `[observed]` | Panel flush to the right edge, hairline left border, no scrim (the page stays interactive). **Corrected in 0.2's R-3 pass: there is no measurable shadow.** Three scanlines across the panel edge read `241,241,241,242,235,242,255` — canvas, then the hairline, then card white, with no falloff between them. This row previously said “hairline left border + soft shadow”; the shadow half is not in the pixels. *(Eyvar still gives its drawer `--ev-shadow-2`, as a **deviation** argued in `docs/05-restructure/design/00-decisions-r3.md` §1.5: Eyvar's drawer opens over full-bleed content, where a hairline on white is a 1.1:1 step.)* |
| **Floating bulk-action bar** `[observed]` | White surface, **light hairline** border + shadow, ~8 px radius, anchored bottom-center **inside** the list card. It is *not* dark-outlined (C13; §5.4 corrected). **Corrected in 0.2's R-3 pass: the shadow is not “pronounced”** — it measures peak α ≈ 0.075 over ~8 px, statistically the same as a popover's 0.07, and a full tier below the modal's 0.15. It takes the same elevation token as a popover |
| **Toast** `[observed]` | Dark near-black **rounded rectangle** (~8 px radius, not a stadium — R15), shadow, bottom-center **of the viewport** (x≈384, not the content region's x≈448 — C9), ~44 px tall, with a trailing `×` |
| **Auth card** `[observed]` | White card, ~12 px radius, moderate shadow, floating on a photographic/gradient backdrop |
| **Contextual save bar** `[observed]` | Replaces the top bar in place — dark, no radius, no shadow, full bleed |

The governing principle `[observed]`: **shadow signals "temporarily above the page and dismissible";
border signals "part of the page."** Cards are page furniture and get borders. Popovers, modals,
drawers, toasts and the bulk-action bar are transient and get shadows.

**Rules**
- MUST use a 12 px radius for cards, 8 px for buttons/inputs/badges/menus/avatars, and 4 px for checkboxes; MUST NOT introduce radii outside {4, 8, 12, 16, full}.
- MUST render avatars and initial badges as 8 px rounded squares, never circles.
- MUST render badges as soft rectangles (8 px), never as full pills.
- MUST use 1 px borders everywhere; the only wider stroke permitted is the focus ring.
- MUST give persistent surfaces (cards, nested blocks) a border and at most a hairline shadow; MUST give transient surfaces (popovers, modals, drawers, toasts, floating action bars) a shadow.
- MUST NOT give a card a large drop shadow — a card that appears to float is a bug.
- MUST pair every modal with a dark page scrim, and MUST NOT scrim a non-blocking side drawer.
- SHOULD anchor the bulk-action bar inside the list card it acts on, not to the viewport.
- SHOULD replace the top bar in place for the unsaved-changes state rather than stacking a second bar.

---

### 1.5 Iconography

| Property | Value |
| --- | --- |
| Nav icon size `[observed]` | ~16 px (rendered in a ~20 px box `[recalled]`) |
| Top bar icon size `[observed]` | ~20 px (search, bell) |
| In-card action icon `[observed]` | ~16 px (pencil, kebab `⋯`, chevron `›`, copy) |
| Inline / affix icon `[observed]` | ~14–16 px (calendar and clock inside date/time inputs, `?` help circles, `$` currency prefix) |
| Badge status dot `[observed]` | ~6–8 px filled circle — on **list-row** badges |
| Badge status glyph `[observed]` | ~16 px filled glyph — on **fulfilment card-header** badges: a package glyph on the yellow `Unfulfilled`, a delivery-truck glyph on the green `Fulfilled (1)` |
| Style `[observed]` | **Filled / solid-weight monoline**, geometric, no outline-stroke look, no two-tone. Corners are soft. Icons inherit `currentColor` — grey when subdued, near-black when primary, white on the dark bar. |
| Banner leading icon `[observed]` | ~16 px, filled, white on green/red strips, dark on the amber strip, blue-in-circle for info |

**Where icons ARE used** `[observed]`:
left nav (one per top-level item), top bar (search, bell, store avatar), card header actions
(pencil = edit, `⋯` = overflow), popover menu items ( —
Duplicate, Cancel order, Archive, Print… each with a leading 16 px icon), the quick-create menu
, banner leading icons,
input affixes, timeline composer toolbar (emoji, mention, hash, attach), disclosure carets on
buttons and selects, the back arrow `←` on every detail page, and collapse chevrons on collapsible
cards.

**Where icons are deliberately NOT used** `[observed]`:
- **Table column headers** — text only, plus a sort caret on the active column.
- **Form field labels** — never iconized.
- **Primary and secondary buttons in the page header** — "Add product", "Export", "Import" are text-only; the only glyph is a trailing disclosure caret on split/menu buttons.
- **Badges** — *partially*. **List badges** use a leading dot and no glyph
. **Fulfilment card-header badges do carry a leading
  16 px glyph** — a package on `Unfulfilled`, a delivery
  truck on the green `Fulfilled (1)`. The
  earlier "a dot, never a glyph" claim was false.
- **Card headings** — "Pricing", "Notes", "Customer" carry no leading icon.
- **Empty states** — use a full illustration, not a scaled-up icon.

**Avatar / initial-badge pattern** `[observed]`:
- ~28–30 px rounded square (8 px radius), two uppercase initials, ~11–12 px semibold, centered. The
  **timeline commenter avatar is ~30 px** (R15) — §3.8's "~32 px circular" was wrong on shape and
  close on size.
- **Two distinct treatments ship, not one.** A *pale* tint with **dark** initials — lavender "JM" on
  the login screen  — and a *saturated* tint with **white**
  initials — pink/rose "JS" in the order timeline
  (
), green for the store avatar in the top bar
, green "MS" in settings
. The palette is **not** uniformly
  pale and the text is **not** uniformly dark. Eyvar should pick one of the two and apply it
  everywhere.
- `[inferred]` The tint appears to be derived from the identity rather than randomised per render.
  This cannot be observed: it would require seeing the same identity across renders *and* a
  re-render, and neither is in the capture set. Treat it as a design decision to make, not a fact.
- When a real photo exists it replaces the initials in the same 8 px rounded square.

**Rules**
- MUST ship a single icon set in one filled monoline style at 16 px (20 px only in the top bar); MUST NOT mix outline and filled sets.
- MUST have icons inherit `currentColor` so they take the subdued/primary/inverse text color of their context.
- MUST NOT put icons on table column headers, form labels, card headings, or page-header buttons.
- ~~MUST use a dot, not a glyph, inside badges.~~ **Falsified.** Downgraded to: **MUST NOT mix dot and glyph within one badge family.** List-row badges take a dot; fulfilment card-header badges take a 16 px glyph; pick one treatment per family and hold it.
- MUST render avatars as ~28–30 px rounded squares (never circles) with two initials, and MUST pick **one** tint treatment — pale fill + dark initials, or saturated fill + white initials — rather than shipping both, as the baseline does. The tint SHOULD be deterministic per identity `[inferred]`; MUST NOT randomize per render.
- MUST use an illustration, not an enlarged icon, for empty states.
  **→ Narrowed by R8: illustrations belong to whole-page, zero-records-ever empty states only. Empty cards, sections and timelines get one grey sentence.**
- SHOULD put a leading icon on every item in a popover menu once any item has one.
- SHOULD reserve the trailing caret exclusively for controls that open a menu or select.

---

### 1.6 Motion

> **Status: SHOULD, not citable in review.** Every value in this subsection is inferred —
> motion cannot be observed in a still screenshot. R12 demotes the whole subsection. The
> motion rules that bind Eyvar are §7.6 (reduced motion) and §8.1 (ambient animation).

Static screenshots cannot show timing curves. Everything in this subsection is **`[inferred]`** from
the component's anchoring, geometry and captured state, plus general design-system behaviour — none of it
is measurable in these files. It is included so the team has a starting contract, not a verified spec.

| Element | Inferred behavior | Basis (captured evidence of the resting state) |
|---|---|---|
| **Toast** `[inferred]` | Slides up ~8–16 px from the bottom edge while fading in (~150–200 ms, ease-out); rests bottom-center ~40 px above the viewport bottom; auto-dismisses after ~4–5 s or on `×`; exits by fading + sliding down (~150 ms). Multiple toasts would stack or replace. | Resting position and dark pill captured in |
| **Popover / dropdown menu** `[inferred]` | Fades in with a small scale-up (~0.96→1) or a short slide from the trigger edge, ~100–150 ms ease-out; origin anchored to the trigger; dismiss is a faster fade (~100 ms). | Anchoring visible in (flush under "More actions") |
| **Modal** `[inferred]` | Scrim fades in (~150 ms) while the dialog fades and scales/translates a few px upward; exit reverses, slightly faster. | |
| **Settings modal (full sheet)** `[inferred]` | Larger travel than a dialog — slides up from the bottom edge into its inset position, ~200–250 ms. | |
| **Right-side drawer / guide panel** `[inferred]` | Slides in from the right edge (~200 ms, ease-out) with no scrim; page content is not blocked. | |
| **Contextual save bar** `[inferred]` | Replaces the top bar via a short cross-fade or downward slide the moment a field becomes dirty, ~150 ms; reverses on save/discard. | |
| **Global search modal** `[inferred]` | Fades/scales in from the top bar search field, ~120 ms; results list updates without re-animating the container. | |
| **Collapsible card / accordion** `[inferred]` | Height animates with the chevron rotating 180°, ~150–200 ms. | family, chevrons in |
| **Progress / task completion** `[inferred]` | Progress bar width tweens; a task's ring icon fills to a check on completion. | (1/6 completed bar, filled check on the done task) |
| **Bulk-action bar** `[inferred]` | Fades/slides up from the bottom of the list card when the first row is selected. | |
| **Hover / focus states** `[inferred]` | Instant-feeling background tint change (~50–100 ms); focus rings appear without animation. | — |

**Rules**
- MUST keep all UI transitions in the 100–250 ms range; MUST NOT exceed 300 ms for any admin interaction.
- MUST animate only `opacity` and `transform`; MUST NOT animate `width`, `height`, `top`, or `left` except for accordion height.
- MUST anchor popover entry to its trigger, and drawer entry to the edge it enters from.
- MUST respect `prefers-reduced-motion` by reducing every transition above to a plain opacity fade or no motion at all.
- MUST NOT animate hover states with more than ~100 ms of delay — an admin must feel instantaneous.
- SHOULD use ease-out for entry and a slightly faster ease-in for exit.
- SHOULD re-verify every value in this subsection against a live product before treating it as a spec — all of it is inferred, none of it is observed.

---

### 1.7 Confidence & gaps

Things this pass could **not** establish from the screenshots and that Eyvar must decide or verify
separately:
- Exact hex values. Every colour above is sampled from a compressed, downscaled capture and is an approximation; the `[recalled]` names are recalled, not sampled. **No value here is a token.** Eyvar's tokens are in `src/styles/globals.css`, each with its own measurement.
- A **critical-tone badge** never appeared in **any screenshot read (≈135 of the 159 on disk)** — only critical banners and critical inline field errors. 24 captures are cited by no section of this document, so the frequently repeated "in any of the 159 screens" was never earned; R5's *ruling* stands, the evidence claim behind it was inflated.
- **Dark mode** does not appear in any capture. The dark top bar is a fixed inverse surface, not a theme.
- **Hover, focus-visible, active, and loading states** are almost entirely absent from static captures (one disabled-button and one focused-field state were visible).
- **Responsive/mobile breakpoints** — every capture is a ~1440 px desktop viewport. Nothing here constrains tablet or mobile layout.
- The green-vs-white save-bar primary is a **live inconsistency in the source**, not a rule to copy.
