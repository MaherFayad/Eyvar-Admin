# Corrections applied — `audit-evidence.md` → §1–§5 partials

Scope: `01-foundations.md`, `02-layout-navigation.md`, `03-data-display.md`, `04-forms-inputs.md`,
`05-feedback-overlays.md`. No other file was touched.

**Note on counts.** The audit's §6 says "23 in the findings table", but the table as written contains
**26 rows**; all 26 are dispositioned below as F1–F26. With 11 mislabels and 15 contradictions that is
**52 items**, covering the 49 required.

**Independent re-verification.** Before writing, 12 of the audit's claims were re-sampled from the
`.webp` files directly (PIL: dominant-colour histograms, white-region bounding boxes, edge scans).
Every one matched the audit: nav `#EBEBEB` vs canvas `#F1F1F1`; primary fill `#3E3E3E`; account Save
green `#367C62`; success strip `#45815D`; critical strip `#D03822`; warning fills `#F4D6B1` /
`#F6EA98`; `Draft` badge pale blue; "5 in stock" red-brown; nested nav pill + elbow; card-header badge
glyphs; toast centre x≈383.5 and ~4–5 px radius on a 23 px pill; 8 modals centred at y≈239–243;
analytics gutters 10–11 img px; timeline avatar a pink rounded square with white initials.

---

## §2 Findings

| # | Finding | File(s) | What changed | Disposition |
|---|---|---|---|---|
| F1 | Nav is the same `#F1F1F1` as the canvas (+ MUST) | `01-foundations.md`, `02-layout-navigation.md` | `bg-nav` row rewritten to `#EBEBEB`, one step darker than the canvas, with the *no-divider* half kept; §2.1 opening paragraph rewritten with both sampled values and the five corroborating files; the §1.1 MUST rewritten to "near-canvas grey one step darker… no border/shadow between them", the §2.1 rule likewise | **Applied** |
| F2 | Nested active nav item gets a marker, not a pill (+ MUST) | `02-layout-navigation.md` | Inverted: nested active items get the **same full-width white pill** plus an elbow connector. Citation swapped to `inventory-quantities-by-variant` + `customer-segments-row-actions-menu` (the audit's files). MUST inverted, not softened | **Applied** |
| F3 | "Badges — a dot, never a glyph" (+ MUST) | `01-foundations.md` | Split into list-row dot vs. fulfilment card-header 16 px glyph; new "Badge status glyph" row added to the icon table; the MUST struck through and downgraded to "MUST NOT mix dot and glyph within one badge family" | **Applied** |
| F4 | "~32 px **circular** avatar" in the timeline composer | `03-data-display.md` | Rewritten to "~30 px rounded-square avatar (~8 px radius), never a circle" per R15, with the saturated-pink/white-initials detail | **Applied** |
| F5 | Avatar tint uniformly pale with dark text | `01-foundations.md` | Rewritten as **two** treatments (pale + dark initials; saturated + white initials) with both cited; Eyvar told to pick one. Rule updated to match | **Applied** |
| F6 | Modals "near the upper third, not centred" | `05-feedback-overlays.md` | Replaced with "vertically centred in every sample", naming all eight measured modals and y≈239–243 vs true centre 236.5. Width fractions (43%/68%) left alone — the audit confirms them | **Applied** |
| F7 | Notification popover "~200 px wide" | `01-foundations.md` | → **~400 px**, with the note that the old figure read image pixels as CSS pixels. §2.6's `~404` aligned to `~400` in the same pass | **Applied** |
| F8 | `Draft` listed as neutral | `03-data-display.md` | `Draft` moved out of the neutral row into a new **info** row (`#DCE8F1`, blue text) alongside `Hidden`; the "`Draft` and `Archived` MUST be neutral" rule rewritten so only `Archived` stays neutral | **Applied** |
| F9 | `Code` listed as a neutral badge | `01-foundations.md` | Removed from the badge table; an explicit note says it is plain text in the `Method` column and belongs to §3.4's "plain text when descriptive" rule | **Applied** |
| F10 | `Fulfilled` cited to `search-modal-order-results-list` as green | `01-foundations.md` | Citation swapped to `order-fulfill-item-page` / `order-detail-paid-fulfilled-gift-card`; a note records that the *title-row* `Fulfilled` on the same page is grey — Shopify ships both, Eyvar takes success | **Applied** |
| F11 | `border-focus` = near-black, cited to a file with no focused field | `01-foundations.md`, `04-forms-inputs.md` | Value → desaturated blue `#687B9F`–`#8493B7` ~2 px; citation swapped to `product-edit-variant-option-name-dropdown`; §4.2 tightened from "dark blue/near-black" to the sampled blue and flagged as the only real focus state in the set | **Applied** |
| F12 | Orders metrics strip has "7 metric columns", each with a sparkline | `03-data-display.md` | → **6 visible columns, the last clipped**, all six named; the sparkline claim scoped ("only some carry one — the clipped column shows none") | **Applied** |
| F13 | Side panel "~330 px" | `04-forms-inputs.md` | → **~406 px** form sheet / **~648 px** templates panel, split by file, with the measured img-px figures | **Applied** |
| F14 | Toast centred on the **content region** | `02-layout-navigation.md`, `04-forms-inputs.md` | Both changed to **bottom-centre of the viewport**, with x≈384 vs content centre x≈448 spelled out and deference to §5.1 stated | **Applied** |
| F15 | Save-bar message always preceded by a warning glyph | `02-layout-navigation.md` | Scoped to the store admin; the account bar named as the glyph-less exception, citing `account-general-unsaved-changes` | **Applied** |
| F16 | "On the account surface the left nav is visibly dimmed" | `02-layout-navigation.md` | Claim deleted and replaced with the truth: nav and canvas both sample `#F6F5F8`; the dimmed element is the **wordmark** in the bar; that page's nav is the account nav | **Applied** |
| F17 | Social/provider buttons cited to two files that differ | `04-forms-inputs.md` | Split into two variants — filled provider **tile** (`login-email-filled`) and provider **link row** (`account-general-unsaved-changes`, no fill, no border, blue text) | **Applied** |
| F18 | Bulk bar "floating dark-outlined pill" | `05-feedback-overlays.md` | → white surface, light hairline border, soft shadow, ~8 px radius; anchored to the **card** (bar centre 445 vs card centre 448), not the viewport | **Applied** |
| F19 | `Sales by channel` non-line tile mis-cited | `03-data-display.md` | Re-cited to `analytics-dashboard-saved-toast-last-7-days.webp`, with an explicit note that the previously cited file shows only the no-data sentence | **Applied** |
| F20 | "`Sales channels` — an **uppercase-ish** muted group label" | `02-layout-navigation.md` | → "muted **sentence-case** group label, regular weight", noting the old wording also contradicted §1.2's MUST | **Applied** |
| F21 | "The **single** exclamation mark found in any screenshot" | `05-feedback-overlays.md` | → "Every exclamation mark in the set is inside user-authored content", listing all three (order note, timeline comment, "New arrivals!" blog title). Rule survives; the count claim did not | **Applied** |
| F22 | "banners announcing news of a completed action carry an ×" (PLAUSIBLE) | `05-feedback-overlays.md` | Softened to "**usually** carry an ×" with the in-evidence counterexample named; the corresponding MUST downgraded to SHOULD | **Applied** |
| F23 | "no critical badge in any of the **159** screens" (PLAUSIBLE) | `01-foundations.md` | §1.7 now says "any screenshot read (≈135 of the 159 on disk)" and records that 24 captures are cited by no section. R5's ruling left standing; only the evidence claim corrected. *(R5 itself lives in `00-header.md` — out of scope, not edited.)* | **Applied** (§1.7 only) |
| F24 | Thumbnail "~40×40 rounded square" wrong for blog posts | `03-data-display.md` | → two shapes named precisely: ~40×40 square on product-shaped resources, **~84×60 4:3 landscape tile** on editorial ones. Wireframe legend in §3.9 updated to match | **Applied** |
| F25 | Empty-state illustration "~170×155 px" (PLAUSIBLE) | `03-data-display.md` | → **~170×190 px**, with "read it as ~170 px wide if only one number is wanted" | **Applied** |
| F26 | §3.4 "inventory counts render as inline links" (knock-on of M2) | `03-data-display.md` | Rewritten: "0 in stock"/"5 in stock" sample red-brown `#825F62`/`#76584D`, a low-stock critical tone, not a link. Genuine link examples substituted; the "numeric values → links" rule qualified | **Applied** |

## §3 Mislabel audit

| # | Mislabel | File(s) | What changed | Disposition |
|---|---|---|---|---|
| M1 | Every §1.1 hex tagged `[observed]` | `01-foundations.md` | All four §1.1 tables retagged: token **names** `[Polaris]`, **values** `[inferred]`. Four recalled values replaced with sampled ones — primary fill `#3E3E3E`, account Save `#367C62`, success strip `#45815D`, critical strip `#D03822`. A note under the §1.1.1 table states the values are sampled from compressed WebP and are approximations. The `#303030`-for-both-text-and-fill collision resolved in both directions | **Applied** |
| M2 | "0 in stock" as a blue `text-link` | `01-foundations.md` | Retagged `[inferred]`; a new `text-critical-inline` row records the red-brown sample; the `text-link` row re-cited to genuinely blue examples (customer email, picked-resource title) | **Applied** |
| M3 | "…and scroll horizontally" tagged `[observed]` | `03-data-display.md` | Clipping stays `[observed]`; scrolling **and** pinning both moved into `[Polaris]`, with "a static frame cannot show a scroll" stated | **Applied** |
| M4 | "**Hovering** it shows a tooltip" (§3.2 and §5.6) | `03-data-display.md`, `05-feedback-overlays.md` | Both split: tooltip existence/wording/position `[observed]`, the hover **trigger** `[inferred]` | **Applied** |
| M5 | Error text "pushing the button down" | `04-forms-inputs.md` | Insertion below the field stays `[observed]`; the layout-shift consequence tagged `[inferred]` (one frame only) | **Applied** |
| M6 | Settings overlay "scrolls as one unit… not independently sticky" | `02-layout-navigation.md` | Retagged `[inferred]`, with the reason spelled out (a sticky nav would look identical at that scroll offset) | **Applied** |
| M7 | "**Exactly one** section is expanded at a time" | `02-layout-navigation.md` | Softened to "Only one…" and retagged `[inferred]` — a universal claim from N static frames, route-driven | **Applied** |
| M8 | Page behind the drawer "fully legible **and** fully interactive" | `05-feedback-overlays.md` | Tag split: legibility `[observed]`, interactivity `[inferred]` | **Applied** |
| M9 | Avatar tint "derived from the identity… not random per render" | `01-foundations.md` | Retagged `[inferred]` with the reason (needs the same identity across renders *and* a re-render); the rule now says SHOULD be deterministic `[inferred]` | **Applied** |
| M10 | Toast "no fixed width… in any sample" | `05-feedback-overlays.md` | Absence of wrapping stays `[observed]`; "no fixed width" retagged `[inferred]` — five short strings would fit a fixed width anyway | **Applied** |
| M11 | "**Ticking** any row checkbox **converts** the header row" | `03-data-display.md` | Rewritten as two `[observed]` end states with the **causation** tagged `[inferred]` | **Applied** |

## §4 Contradiction audit

| # | Conflict | File(s) | What changed | Disposition |
|---|---|---|---|---|
| C1 | Four incompatible calibrations | all five | **R13 written into all four preambles**: one calibration, ≈1.90×, 768×523 renders, UI area 473 px. Every preamble names the superseded figures explicitly. "**Px figures in §1–§5 are indicative, not binding**" added to each. §2's figures recomputed ×0.95 throughout (widths, settings shell, theme editor, auth cards, search panel) | **Applied** |
| C2 | Nav 240 / 256 / 247 | `02-layout-navigation.md`, `03-data-display.md` | Both non-conforming figures replaced with **~240 px** and cited to R11; §3's ~247 px — which R11 omitted — explicitly reconciled as the same x≈129 boundary rounded differently, not a disagreement | **Applied** |
| C3 | Card radius 12 / 8 / 8–12 | `03-data-display.md`, `04-forms-inputs.md` | Both changed to **~12 px** with the edge-scan evidence; §1.4 confirmed as the right side | **Applied** |
| C4 | Badge geometry: MUST 8 px rect vs "fully rounded ends" | `03-data-display.md` | §3.4 rewritten to rounded rectangle ~8 px with the measured radii (3–4 img px on an 11 img px badge vs 5.5 for a stadium); §1.4 named as right. **R15** | **Applied** |
| C5 | Toast geometry: 8 px vs "rounded pill" | `05-feedback-overlays.md`, `01-foundations.md` | §5.1 rewritten to rounded rectangle ~8 px with measured radii (4–5 img px on a 23 img px toast); §1.4 annotated with the same measurement. **R15** | **Applied** |
| C6 | Avatar shape/size: 8 px square ~28 px vs "~32 px circular" | `01-foundations.md`, `03-data-display.md` | §3.8 → **~30 px rounded square** (R15); §1.5 widened to ~28–30 px and points at the timeline case. §1.4/§1.5 right on shape, §3.8 right on size — both halves kept | **Applied** |
| C7 | Info banner: "no coloured strip at all" MUST vs "pale blue/grey card" | `01-foundations.md`, `04-forms-inputs.md` | Both treatments recorded with both citations (`point-of-sale-subscription-plans` white; `order-fulfill-item-page` `#EDF4FF`). The falsified MUST **struck through and deleted under R16**; R1/R16 named as what Eyvar ships (pale tinted card, all four tones) | **Applied** |
| C8 | Warning banner: saturated amber strip vs pale yellow | `01-foundations.md`, `04-forms-inputs.md` | Same treatment as C7: both recorded, R1 named as the resolution | **Applied** |
| C9 | Toast anchor: content region vs viewport | `02-layout-navigation.md`, `04-forms-inputs.md`, `05-feedback-overlays.md` | §5.1 confirmed as right; §2.6 and §4.4 corrected to **viewport** with x≈384 vs 448 stated in each | **Applied** |
| C10 | Analytics gutter 16 vs 12 px | `01-foundations.md`, `03-data-display.md` | Both replaced with **~19–20 px**, with the measured card edges (142→338, 350→546, 557→753) in both places | **Applied** |
| C11 | Thumbnail 32 vs 40 px | `01-foundations.md` | §1.3's "32 px thumbnail" → **40 px** in both the metrics table and the MUST; §3.1 named as right | **Applied** |
| C12 | Drawer widths 330 / 370 / 406 / 24% / 42% | `02-layout-navigation.md`, `04-forms-inputs.md`, `05-feedback-overlays.md` | All three sections now say **~406 px** (form sheet) and **~648 px** (two-column templates panel). §2.6 gained a dedicated row for the templates panel; §2's rule updated. These named figures are exempted from the ×0.95 rescale, and the §2 preamble says so explicitly | **Applied** |
| C13 | Bulk bar dark-outlined vs white | `01-foundations.md`, `02-layout-navigation.md`, `03-data-display.md`, `05-feedback-overlays.md` | All four now say **white surface, light hairline border, soft shadow, ~8 px radius**, anchored inside the card; the §3.9 wireframe legend annotated | **Applied** |
| C14 | `Paid` in both success and neutral | `01-foundations.md`, `03-data-display.md` | Both tones kept on record with their files (green in billing; grey on order detail and in global search), then **R14** applied: Eyvar's `Paid` is success. §3.4's "one label, one tone" MUST re-scoped to bind Eyvar, not Shopify. `Fulfilled` handled the same way | **Applied** |
| C15 | Warning collapsed into one tone | `01-foundations.md`, `03-data-display.md` | **R17** written in: the two shipped fills named with their sampled hexes (`Payment pending` `#F4D6B1`, `Unfulfilled` `#F6EA98`), the bogus `#FFEFC9` removed, and the collapse to one Eyvar tone stated openly and tied to R7 — no longer silent. A MUST added to §1.1.5 | **Applied** |

---

## Notes and judgement calls

1. **R13 vs C12 (the one genuine tension in the brief).** R13 says recompute §2's figures ×0.95;
   C12 names ~406 px / ~648 px, which were themselves derived at 2×. Resolution taken: the ×0.95
   rescale applies to §2's general figures, and a **ruling that names a specific figure overrides the
   rescale** (nav ~240 px per R11; drawers ~406/~648 per C12). This is stated in the §2 preamble and
   in §1's, so the exemption is visible rather than an inconsistency.
2. **`Hidden` badge.** While verifying F8 the `Hidden` badge on `blog-posts-list.webp` was also seen
   to be pale blue, not grey. It has been moved into the info row alongside `Draft`. This goes one
   label beyond what the audit named, and is flagged here for that reason.
3. **Out of scope, deliberately untouched.** R5's "159 screens" phrasing in `00-header.md`; the
   ~~struck~~/superseded pointer lines inserted by an earlier editor (all left byte-for-byte); §6–§9;
   both audit files. Section numbers and heading text are unchanged throughout.
