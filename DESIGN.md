# DESIGN.md — Eyvar Admin Design Rules

**Status:** binding for all new UI work in this repo.
**Source of truth:** the Shopify admin (Polaris) as it actually ships, evidenced by 159
real screenshots in [`docs/06-design-reference/shopify-admin-web/`](docs/06-design-reference/shopify-admin-web/).
**Scope:** desktop web admin surfaces of Eyvar Admin.

## Contents

- [1. Foundations](#1-foundations)
  - [1.1 Color](#11-color)
  - [1.2 Typography](#12-typography)
  - [1.3 Spacing & grid](#13-spacing--grid)
  - [1.4 Shape & elevation](#14-shape--elevation)
  - [1.5 Iconography](#15-iconography)
  - [1.6 Motion](#16-motion)
  - [1.7 Confidence & gaps](#17-confidence--gaps)
- [2. Layout & Navigation](#2-layout--navigation)
  - [2.1 The app frame](#21-the-app-frame)
  - [2.2 Page structure: header, widths, one column vs two](#22-page-structure-header-widths-one-column-vs-two)
  - [2.3 The contextual save bar](#23-the-contextual-save-bar)
  - [2.4 The Settings surface](#24-the-settings-surface)
  - [2.5 Full-bleed layouts that break the frame](#25-full-bleed-layouts-that-break-the-frame)
  - [2.6 Navigation affordances](#26-navigation-affordances)
- [3. Data Display](#3-data-display)
  - [3.1 The index table (resource list)](#31-the-index-table-resource-list)
  - [3.2 The list-page toolbar: views, search, filters](#32-the-list-page-toolbar-views-search-filters)
  - [3.3 Bulk selection and bulk actions](#33-bulk-selection-and-bulk-actions)
  - [3.4 Status communication — the badge family](#34-status-communication--the-badge-family)
  - [3.5 Cards, sections, and summary panels](#35-cards-sections-and-summary-panels)
  - [3.6 Empty states](#36-empty-states)
  - [3.7 Analytics display](#37-analytics-display)
  - [3.8 Timelines and activity feeds](#38-timelines-and-activity-feeds)
  - [3.9 Reference wireframe — index page](#39-reference-wireframe--index-page)
- [4. Forms, Inputs & Actions](#4-forms-inputs--actions)
  - [4.1 Form page architecture](#41-form-page-architecture)
  - [4.2 Text inputs](#42-text-inputs)
  - [4.3 Selects, radios, checkboxes, toggles](#43-selects-radios-checkboxes-toggles)
  - [4.4 Validation and errors](#44-validation-and-errors)
  - [4.5 Specialised inputs](#45-specialised-inputs)
  - [4.6 The button system](#46-the-button-system)
  - [4.7 Progressive disclosure in forms](#47-progressive-disclosure-in-forms)
  - [4.8 Open questions / not verifiable here](#48-open-questions--not-verifiable-here)
- [5. Feedback, Overlays & Voice](#5-feedback-overlays--voice)
  - [5.0 Choosing the surface](#50-choosing-the-surface)
  - [5.1 Toasts](#51-toasts)
  - [5.2 Banners](#52-banners)
  - [5.3 Modals and dialogs](#53-modals-and-dialogs)
  - [5.4 Popovers, menus and tooltips](#54-popovers-menus-and-tooltips)
  - [5.5 Side panels / drawers](#55-side-panels--drawers)
  - [5.6 Onboarding and guidance surfaces](#56-onboarding-and-guidance-surfaces)
  - [5.7 UX writing rules](#57-ux-writing-rules)
- [6. Applying This to Eyvar Admin](#6-applying-this-to-eyvar-admin)
  - [6.1 Current Eyvar token inventory (`eyvar_ops_panel_v40_fixed.html` L11–L21)](#61-current-eyvar-token-inventory-eyvar_ops_panel_v40_fixedhtml-l11l21)
  - [6.2 Sanctioned deviations](#62-sanctioned-deviations)
  - [6.3 Defects](#63-defects)
  - [6.4 Surface-by-surface mapping](#64-surface-by-surface-mapping)
  - [6.6 Implementation stack](#66-implementation-stack)
  - [6.5 Audit record](#65-audit-record)
- [7. Accessibility](#7-accessibility)
  - [7.1 Contrast](#71-contrast)
  - [7.2 Focus](#72-focus)
  - [7.3 Keyboard operation](#73-keyboard-operation)
  - [7.4 Semantics and names](#74-semantics-and-names)
  - [7.5 Live regions and async feedback](#75-live-regions-and-async-feedback)
  - [7.6 Motion and autoplay](#76-motion-and-autoplay)
  - [7.7 Targets and density](#77-targets-and-density)
  - [7.8 Conformance target](#78-conformance-target)
- [8. Patterns Shopify Does Not Cover](#8-patterns-shopify-does-not-cover)
  - [8.1 Real-time monitoring surfaces](#81-real-time-monitoring-surfaces)
  - [8.2 Derived and computed values](#82-derived-and-computed-values)
  - [8.3 Money and ledgers](#83-money-and-ledgers)
  - [8.4 Work queues and SLA](#84-work-queues-and-sla)
  - [8.5 Dense tables: per-column controls and column pinning](#85-dense-tables-per-column-controls-and-column-pinning)
- [9. Bidirectionality & Localisation](#9-bidirectionality--localisation)
  - [9.1 The logical-properties mandate](#91-the-logical-properties-mandate)
  - [9.2 What does NOT mirror](#92-what-does-not-mirror)
  - [9.3 Partial localisation policy](#93-partial-localisation-policy)
  - [9.4 Typography in Arabic](#94-typography-in-arabic)
  - [9.5 Icon and glyph mirroring](#95-icon-and-glyph-mirroring)
  - [9.6 Copy rules in Arabic](#96-copy-rules-in-arabic)
  - [9.7 The untokenised width](#97-the-untokenised-width)
  - [9.8 Review checklist](#98-review-checklist)

## How this document was built

Every rule in §1–§5 was derived by reading the screenshots — not by recalling Polaris
docs. Claims are tagged so you can tell them apart:

- `[observed]` — visible in a screenshot cited on the same line. Trust it.
- `[Polaris]` — knowledge of the Shopify design system that these screenshots do **not**
  prove. Useful, but verify before relying on it for anything load-bearing.
- `[inferred]` / `[standard]` — reasoned from evidence or from established practice.
  Weakest tier. Never cite one of these to win an argument.

Five independent analysts each took one layer (foundations, layout, data display, forms,
feedback) and read 25–68 screens apiece. Two auditors then attacked the result: one
re-opened the screenshots to falsify the `[observed]` claims, one checked every statement
about Eyvar's codebase against the source and hunted for rule conflicts. Three further
authors wrote §7–§9, which cover ground Shopify has no answer for. Corrections from both
audits are folded in; §6.5 records what was found wrong.

## What each section is

| § | Contains | Binding on Eyvar? |
|---|---|---|
| 1–5 | **How Shopify does it.** Descriptive, evidenced from screenshots. | Only where §6 adopts it. |
| 6 | **The translation to Eyvar** — sanctioned deviations, defects, page map. | Yes. |
| 7 | **Accessibility.** | Yes. |
| 8 | **Patterns Shopify does not cover** — real-time, computed values, money, queues. | Yes. |
| 9 | **Bidirectionality & localisation.** | Yes. |

## Precedence

When two rules collide, the winner is fixed. Do not improvise:

```
Rulings table (R1–R19)   ←  highest. Settles conflicts the sources leave open.
        ↑
§6.2 sanctioned deviations   ←  suspends a §1–§5 rule for a named reason.
        ↑
§7, §8, §9   ←  Eyvar-specific law. Overrides §1–§5 within its subject.
        ↑
§1–§5   ←  Shopify as observed. The default when nothing above speaks.
```

A MUST in §1–§5 is a description of Shopify, not an order to Eyvar, unless §6 adopts it.
Where §6.2 suspends a rule, it names the rule. Where §7–§9 override one, they say so
inline. If you find a collision this ladder does not settle, that is a defect in this
document — file it, do not guess.

## How to use it

1. **Before designing a screen** — find its row in §6.4 and read the pattern it maps to.
   Reuse the pattern; do not invent a new page shape.
2. **Before writing CSS** — check §6.1 for the token, then §1 for the rule. If the value
   you want is not a token, you are about to create drift. §6.1 also lists which token
   categories do not exist yet — those are blocked until they do.
3. **Before shipping** — run the checklist below. Every box must be tickable or have a
   written exception in §6.2.

## Ship checklist

Layout
- [ ] Page uses an approved layout: single column, main + right rail, full-bleed editor, or the monitoring shell — §2.2, §8.1
- [ ] Page header carries the title, status badge, and actions in the documented order — §2.2
- [ ] Canvas and card surfaces are visually distinct — §1.1, §6.3 D1
- [ ] Unsaved changes surface a contextual save bar, not just a footer button — §2.3

Content
- [ ] Every status uses one documented badge tone; no new tones — §3.4, R7
- [ ] Tables follow the index-table rules: alignment, row height, sortable headers — §3.1, R4
- [ ] Money follows the formatting and ledger rules — §8.3
- [ ] Copy is sentence case, buttons are verbs, no exclamation marks — §5.7
- [ ] Arabic copy follows §9.6; no physical-direction CSS — §9.1

States
- [ ] Empty state designed — §3.6, R8
- [ ] Loading / pending state designed — §8.1 for live data, §7.5 for announcement
- [ ] Error state designed — §4.4, §5.2

Interaction
- [ ] Primary action is the only filled button on the screen, in brand blue — R3, §4.6
- [ ] Destructive actions confirm, and the confirm names what will happen — §5.3
- [ ] Success feedback is a toast; page-level state is a banner — §5.1, §5.2, R10
- [ ] Every interactive element has a visible focus state — §7.2
- [ ] Row actions are reachable by keyboard, not hover-only — §7.3, §6.3 D8

## One-page cheat sheet

If you read nothing else. Every line links to the section that governs it.

**Layout.** Pick one of four page shapes: single column, main + right rail, full-bleed
editor, or the monitoring shell (§2.2, §8.1). List pages run full width; detail and form
pages are centred and capped. Page header = back arrow, title, status badge, then actions
with the primary last. No breadcrumbs beyond the top bar's `Title > Subtitle` (§6.2 D-3).

**Surfaces.** Canvas is `--bg`, cards are `--white`, and they must never be the same
colour (§6.3 D1). One card per concern. Hairlines are 1px, not `.5px` (§6.3 D17).

**Colour.** Primary action = `--blue`, and it is the only filled button on the screen
(R3). Links = `--blue-dk` + underline, never bare blue. Red appears in exactly four
places and nowhere else (R5a). Five badge tones, no red badge (R7).

**Type.** 13px body. Hierarchy comes from weight, not size. Labels are not hints - a
field label is body size at full contrast (§6.3 D22). No uppercase, no letter-spacing on
labels or table headers (§6.3 D18).

**Tables.** Numbers right-aligned with tabular figures, in every locale (R4, §9.2). Row
height uniform. Row actions visible to the keyboard, never hover-only (§6.3 D19).
Ledgers are append-only: no row actions, no bulk selection (§8.3).

**Feedback.** One event, one surface (R10): transient confirmation to a toast, standing
condition to a banner. Toast names the object exactly, one line, 60 characters (R9).
Banners are pale tinted cards in all four tones (R1, R16). Never more than one page-level
banner. Destructive actions confirm, and the confirm names what happens (§5.3).

**States.** Every screen needs four: content, empty, loading, error. Illustrations belong
to whole-page empty states only - an empty card gets one grey sentence (R8).

**Motion.** Transitions only, under 300ms. One licensed ambient loop: "this feed is
live", opacity-only, and it may never encode severity (R18).

**Accessibility.** Visible focus ring on everything interactive (§7.2). 4.5:1 on text -
`--ghost` fails and `--muted` passes (§7.1). Colour is never the only carrier (§7.5).

**Arabic.** Logical properties, never `left`/`right` (§9.1). Digits, currency and the map
do not mirror (§9.2).

**Before you write CSS:** the value must be a `:root` token. Only colours are tokenised
today; radius, spacing, shadow, font-size and duration are not, and are frozen until they
are (§6.1, §6.4).

## Rulings on contested points

The sources genuinely disagree in places — Shopify ships more than one answer, and the
analysts inherited the contradiction. Each ruling below settles one. These are decisions,
not observations; overturn them deliberately, in writing, by editing this table.

| # | Conflict | Ruling for Eyvar |
|---|---|---|
| R1 | Two banner families ship: a saturated split-strip banner in the store admin, a soft tinted card in account/auth — §5.2 | Use the **soft tinted card** everywhere. It reads better at Eyvar's smaller type sizes, survives a future dark mode, and does not lock text to white-on-colour. |
| R2 | The contextual save bar uses a green primary in account settings, a neutral one in the store admin. §2.3 additionally recommends a *light* Save, derived from Shopify's dark top bar — Eyvar's top bar is white, so a light Save would be invisible — §2.3, §4.6 | Save is the **brand-blue primary**, same as every other primary. Never green, never white-on-white. The §2.3 "light Save" recommendation does not apply to Eyvar and is void. |
| R3 | Shopify's primary action is near-black `#303030` and reserves blue strictly for links — §1.1.4, §4.6 | Eyvar keeps **brand blue `--blue` for primary actions** (§6.2 D-1). Consequently blue MUST NOT also carry links: links get `--blue-dk` **plus** underline, so the two roles stay separable. The near-black MUSTs at §1.1.4 and §4.6 describe Shopify and do not bind Eyvar. |
| R4 | Numeric columns are right-aligned on orders/discounts, left-aligned on customers — §3.1 | **Always right-align numeric, currency, and count columns**, with tabular figures. The customers index is the outlier. In Arabic this alignment does **not** flip — see §9.2. |
| R5 | No critical/red badge appears in any of the 159 screens; red is reserved for destructive buttons — §3.4, §1.7 | **No red badge for ordinary lifecycle state.** Critical page-level state is a banner; critical *row-level* state in a work queue is the documented exception — see §8.4, which defines the only sanctioned row-critical treatment. Eyvar's 49 existing `b b-red` usages are a defect (§6.3 D11), not a precedent. |
| R6 | Copy is inconsistent in one place — a missing trailing period on an empty-state line — §3.6, §5.7 | Do not copy typos. Full sentences take a period; fragments, labels and button text do not. The governing rule is §5.7. |
| R7 | The badge palette is specified three ways: six tones (§1.1.5), five tones (§3.4), and "no critical at all" (R5) | The palette is **five tones: success, warning, info, neutral, new**. There is no critical badge tone (R5). "New" is a tone; §3.4's five-item list is superseded by this one. Any sixth tone requires an edit to this row. |
| R8 | Empty states: §1.5 and §5.7 require an illustration unconditionally; §3.6 forbids one in an empty card; §3.8 forbids one in a timeline | Illustration **only** on a whole-page, zero-records-ever empty state. An empty card, section, timeline, or filtered-to-zero result gets one grey sentence and, where an action exists, one plain-button action — no illustration, no heading. §3.6's "emptiness is meaningful" exception is void: it was untestable. |
| R9 | Toast length: §5.1 caps a toast at "≤ ~5 words", while §5.1 and §5.7 both require echoing the object's exact name | The **echo wins**. A toast is one line that names the object exactly, capped at 60 characters; past that, truncate the object name with an ellipsis, never the verb. The five-word cap is void. |
| R10 | Toast vs banner: §5.0 says pair them when there is a next step; §4.4 says prefer a toast over a persistent banner; §5.2 forbids a banner where a toast would do | One event, one surface, decided by lifetime: **transient confirmation → toast; standing condition or a next step the user must act on → banner**. Pair the two only when the action both completed *and* left a standing condition, and never show more than one page-level banner. |
| R11 | The left nav is measured at 240px (§1 calibration), 256px (§2.1), and 232px (§6.1) | The Shopify figure is **~240px**, the calibration constant. §2.1's 256px and §6.1's 232px are estimation error, not disagreement about the product. This does not bind Eyvar, whose rail is 52/236px by §6.2 D-4. |
| R12 | §1.6 issues six motion MUSTs, then states that all of it is inferred and none observed | §1.6 is **demoted to SHOULD in full** and is not citable in review. Motion that actually binds Eyvar is §7.6 (reduced motion) and §8.1 (ambient/looping animation). |
| R13 | The same 768x523 captures are calibrated four different ways in four section preambles: 1.875x, 2x of a 1536px viewport, 1.93x, and 0.53x. Every pixel figure in the document inherits one of the four; the 2x reading made all of §2 about 6% high | **One calibration: the measured scale is ~1.90x.** More importantly: **every px figure in §1-§5 is indicative, not binding.** The screenshots cannot support exact measurement, so what binds is the *relationship* (nav narrower than content, card radius larger than badge radius, the 4px grid) and, for Eyvar, the token values in §6.1. Never cite a §1-§5 pixel number in review. Where a figure was individually re-measured and named in a ruling (the drawer widths, the popover width, the card radius), that figure stands as measured and is not rescaled. |
| R14 | `Paid` ships as a green badge in billing history and a grey one on orders - and §3.4 states a MUST that the same label never changes tone | **`Paid` is success (green).** The "same label, same tone" rule stands; Shopify breaks it, Eyvar does not. |
| R15 | Badge, toast and avatar geometry is stated two ways: §1.4 says rounded rectangles (~8px) and never circles; §3.4 says fully-rounded pills, §5.1 says a rounded pill, §3.8 says a circular avatar | **Rounded rectangles, ~8px.** Badges and toasts are rounded rectangles, not stadium pills. Avatars are ~30px rounded squares, never circles. §1.4 is right; the pixels confirm it. Eyvar's existing `border-radius:999px` badges (`:117`) are a defect under this ruling. |
| R16 | §1.1.5 has a MUST that info banners carry "no coloured strip at all... not as a blue fill" - falsified by the document's own evidence, which shows a `#EDF4FF` fill | **All four banner tones are pale tinted cards** (this is R1 applied consistently). The §1.1.5 MUST is void. |
| R17 | Shopify ships two warning fills - peach `#F4D6B1` for `Payment pending`, yellow `#F6EA98` for `Unfulfilled` - which §1.1.5 collapses into one tone without saying so | **Eyvar has one warning tone** (the five-tone palette of R7). Where a surface needs to separate "waiting on someone else" from "waiting on you", separate them with the *label*, not a second fill. |
| R5a | R5 sends critical state to a page-level banner, but a work queue's critical state is **per row**, and §5.2 forbids stacking banners - so the document had no legal way to render "this row is breached", which is the entire point of the screen. Raised and solved in §8.4.6 | R5 stands - no red badges. It is **amended** to enumerate the complete set of permitted red uses: (1) a destructive button, (2) one page-level critical banner, (3) a breached-row leading-edge marker (a 3px inset edge, not a pill - it cannot be mistaken for a badge tone), (4) a map marker. A breached row also carries the word `overdue`, so colour is never the only carrier. Any fifth use of red needs a row in §6.2. |
| R18 | §1.6 caps every UI transition at 300ms, which makes every ambient looping animation in the product illegal - including the "feed is live" dot, which is load-bearing on a monitoring screen. Raised and solved in §8.1.6 | §1.6 governs **transitions only**. Ambient loops are a separate class with a narrow licence: permitted **only** to signal "this feed is live", opacity-only, 1200-2500ms, never dropping below 0.4 opacity, and **never encoding severity**. This kills `live-dot` (`:342`), `ping-pulse` (`:331`) and `reqPulse` (`:145`) as currently written. |
| R19 | §6.4’s “no new colour token” rule and §7’s 3:1 non-text contrast requirement collide on the **unchecked** checkbox and radio. Their boundary is `--ev-hairline` on white, which measures below 3:1, and the token set holds no darker neutral. Raised in 0.4 as **R-4**. | **§7 wins; one neutral is licensed.** `--ev-hairline-strong`, used **only** for the resting boundary of an unchecked control — checkbox, radio, and any future control whose entire affordance *is* its outline. It is not a border token, not a divider, not a hover state, and it never appears on a surface that already carries a `--border`. The “no new colour” rule exists to stop palette drift, not to license a control the operator cannot see, and a control boundary is precisely what WCAG 2.2 non-text contrast was written for. Any second use of it needs a row in §6.2. |



---

## 1. Foundations

> **Source & method.** Everything below was derived by reading 33 screenshots in
> `docs/06-design-reference/shopify-admin-web/` spread across all 16 folders (auth, home, orders,
> products, customers, online store, marketing, analytics, finances, discounts, settings, apps,
> notifications, shortcuts, global search, account).
>
> **Measurement scale — R13, the single calibration for the whole document.** Every capture is
> exactly **768 × 523 px**, of which the bottom ~50 px is the Mobbin watermark strip; the UI area is
> 768 × ~473 px. The measured scale is **≈1.90×** (top-bar bottom edge at y≈29–30 for a 56 px bar;
> nav/content boundary at x≈129 for a ~245 px nav). §1's earlier 1.875×, §2's 2×/1536 px, §3's 1.93×
> and §4's 0.53× are all superseded by this one figure. All "px" numbers below are **CSS px at a
> ~1460 px viewport**, converted from measured image pixels, and are therefore **approximations**
> (±2 px). **Px figures in §1–§5 are indicative, not binding.** Where a finding or a contradiction
> ruling names a specific corrected figure, that named figure governs.
>
> **Claim marking.** `[observed]` = visibly measurable in a screenshot cited on that line.
> `[Polaris]` = recalled from the Polaris design system, **not** verifiable in these captures.
> Where the two disagree, the `[observed]` value wins for Eyvar Admin.
>
> The Mobbin watermark strip at the bottom of every capture is not product UI and was ignored.

---

### 1.1 Color

#### 1.1.1 Surface / background layers

The admin is built from exactly **three** neutral layers plus one inverted layer. There is no
"white page" — the canvas is always a light grey and cards are always white on top of it.

| Token (proposed) | Value (approx.) | Where seen | Evidence |
|---|---|---|---|
| `bg-canvas` — page background `[Polaris]` (name) / value `[inferred]` | `#F1F1F1` warm light grey — sampled | Behind every card on every page | `03-products/products-list-default.webp`, `08-finances/finances-overview-earnings-donut-and-payouts.webp` |
| `bg-surface` — card background `[Polaris]` (name) / value `[inferred]` | `#FFFFFF` | Every card, table, popover, modal, auth card | `02-orders/order-detail-paid-fulfilled-gift-card.webp`, `00-auth/login-password-step-empty.webp` |
| `bg-nav` — sidebar `[inferred]` | **`#EBEBEB`** — one step **darker** than the canvas, not the same colour. Sampled on both sides of the x≈129 boundary: nav `#EBEBEB`, canvas `#F1F1F1`. There is still **no border, divider or shadow** between them — the step is tonal only | Left nav on all admin pages | `03-products/products-list-default.webp`, `09-discounts/discounts-list-with-code.webp`, `02-orders/orders-list-with-metrics-row.webp`, `08-finances/finances-overview-earnings-donut-and-payouts.webp`, `04-customers/customers-list-single-customer.webp` |
| `bg-nav-selected` `[inferred]` | `#FFFFFF` rounded pill + hairline/very soft shadow | "Products" / "Customers" / "Analytics" active nav item — and, contrary to §2.1's earlier claim, **nested** active items too (see §2.1) | `03-products/products-list-default.webp`, `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`, `03-products/inventory-quantities-by-variant.webp` |
| `bg-surface-secondary` `[inferred]` | ~`#F7F7F7`–`#FAFAFA` | Nested sub-blocks inside cards (fulfillment line-item block, the "This app needs to" strip on the install screen) | `11-apps-and-channels/app-install-permissions-consent.webp` |
| `bg-inverse` — dark top bar `[Polaris]` (name) / value `[inferred]` | `#1A1A1A`–`#1C1C1C` near-black | Global top bar on every admin page; contextual save bar; toasts | `03-products/products-list-default.webp`, `15-account/account-general-unsaved-changes.webp` |
| `bg-inverse-field` `[inferred]` | ~`#303030` (one step lighter than the bar) | The global search field sitting inside the dark top bar | `02-orders/orders-list-with-metrics-row.webp` |
| `bg-backdrop` — modal scrim `[inferred]` | Black at ~40–50% opacity (canvas goes `#EBEBEB` → ~`#777777` behind a modal) | Behind confirm modals, the settings modal, the global search modal | `03-products/products-list-archive-confirm-modal.webp`, `10-settings/settings-store-details-edit-profile-modal.webp` |

> **All hex values in §1.1 are sampled from compressed, downscaled WebP captures and are
> approximations, not tokens — hence `[inferred]`.** The token *names* are `[Polaris]` (recalled from
> the design system, not visible in any capture). Sample from a live product or the Polaris token
> package before committing a value.

The nav is a *near*-canvas grey: one tonal step darker, with nothing drawn between the two columns.
The "panel" reads as a panel because of that step **plus** the white pill on the selected item — but
it is emphatically not a contrasting sidebar fill.

#### 1.1.2 Text colors

| Token (proposed) | Value (approx.) | Used for | Evidence |
|---|---|---|---|
| `text` `[Polaris]` (name) / value `[inferred]` | `#303030` near-black (never pure `#000`) — note this is **body text only**; the primary *button* fill is a different value, `#3E3E3E` (§1.1.4) | Page titles, card headings, table cell primary values, body copy | `03-products/products-list-default.webp` |
| `text-secondary` `[Polaris]` (name) / value `[inferred]` | `#616161` medium grey | Table column headers, helper text under fields, timestamps, card subtitles, nav section labels | `04-customers/customer-new-form-empty.webp` ("This customer will receive notifications…"), `02-orders/orders-list-with-metrics-row.webp` (column headers) |
| `text-disabled` `[Polaris]` (name) / value `[inferred]` | `#B5B5B5` light grey | Disabled button labels ("Send invoice", "Post", greyed "Export"), disabled checkbox labels, empty-cell em-dashes | `02-orders/draft-order-validation-error-banner.webp`, `09-discounts/discounts-empty-state.webp`, `04-customers/customer-new-form-empty.webp` |
| `text-inverse` `[inferred]` | `#FFFFFF` / ~`#E3E3E3` for secondary on dark | Top bar labels, toast text, primary-button labels | `03-products/products-list-default.webp` |
| `text-link` `[inferred]` | Strong blue ~`#005BD3` | Inline links — "Learn more", "process of erasure requests", the customer email address on a customer row, "tax rates", the blue product title in a picked-resource row | `04-customers/customer-detail-erasure-request-banner.webp`, `04-customers/customers-list-single-customer.webp`, `02-orders/order-fulfill-item-page.webp` |
| `text-critical-inline` `[inferred]` | Red-brown ~`#825F62`–`#76584D` | Low-stock inventory counts in the products index — **"0 in stock" / "5 in stock" are not blue links**, they are a critical low-stock tone; the trailing qualifier ("for 24 variants") stays subdued grey | `03-products/products-list-default.webp` |

#### 1.1.3 Borders

| Token (proposed) | Value (approx.) | Used for | Evidence |
|---|---|---|---|
| `border` `[Polaris]` (name) / value `[inferred]` | `#E3E3E3` hairline | Card outlines, dividers between card sections, table row dividers, popover/menu separators | `10-settings/settings-billing-overview-bills-and-credits.webp`, `02-orders/order-detail-more-actions-menu.webp` |
| `border-input` `[inferred]` | ~`#CDCDCD`–`#8A8A8A` (darker than `border`) | Text input, select and textarea outlines — deliberately stronger than card borders so fields read as targets | `04-customers/customer-new-form-empty.webp`, `03-products/product-edit-pricing-inventory-shipping.webp` |
| `border-critical` `[inferred]` | Red ~`#D72C0D` | Invalid input outline | `00-auth/login-email-validation-error.webp` |
| `border-focus` `[inferred]` | **Desaturated blue ~`#687B9F`–`#8493B7`, ~2 px** — not near-black | The only genuine focus state in the set: the open "Option name" combobox. `product-edit-pricing-inventory-shipping.webp` was mis-cited here — it contains **no** focused field; every input on it, the quantity field included, carries the resting hairline | `03-products/product-edit-variant-option-name-dropdown.webp` |

All borders are **1 px**. There is no 2 px border anywhere except focus rings and the selected-state
outline on segmented/toggle controls.

#### 1.1.4 Interactive / brand

The brand accent for **actions** is not a hue — it is **near-black**. Blue is reserved for **links**.

| Role | Value (approx.) | Evidence |
|---|---|---|
| Primary button fill `[inferred]` | **`#3E3E3E`** near-black, white label — sampled over the large flat fill of the auth primary. This is **not** the same value as body text (`#303030`); the document previously used one number for both | "Add product", "Create discount", "Create order", "Install app", "Turn on automation", "Log in", "Archive products" — `00-auth/login-password-step-empty.webp`, `03-products/products-list-default.webp`, `09-discounts/discounts-list-with-code.webp`, `06-marketing/marketing-automation-template-detail-modal.webp` |
| Secondary button `[inferred]` | White fill, `#E3E3E3`-ish border, `#303030` label | "Export", "Import", "More actions", "Cancel", "Refund", "Return", "Edit" — `02-orders/order-detail-paid-fulfilled-gift-card.webp` |
| Tertiary / plain `[inferred]` | No fill, no border, blue or dark label | "Add custom item", "View all sales channels", "Add customs information" — `02-orders/draft-order-validation-error-banner.webp` |
| Link blue `[inferred]` | ~`#005BD3` | See `text-link` above |
| Save-bar primary — **green** `[inferred]` | **`#367C62`** green fill, white label — sampled; the earlier `~#2CA36A` was a recalled value, not a measured one | The account-area contextual save bar — `15-account/account-general-unsaved-changes.webp` |
| Save-bar primary — **white** `[inferred]` | White fill, dark label, on the dark bar | The store-admin contextual save bar — `03-products/product-edit-pricing-inventory-shipping.webp`, `09-discounts/discount-create-eligibility-and-active-dates.webp` |
| Selected radio / checked checkbox `[inferred]` | Solid near-black `#303030` | `09-discounts/discount-create-eligibility-and-active-dates.webp`, `03-products/product-edit-pricing-inventory-shipping.webp` |

Note the **inconsistency worth not copying**: the same "contextual save bar" component uses a green
Save in the account surface and a white Save in the store admin. Eyvar should pick one.

#### 1.1.5 Status color family

Two *distinct* expressions of status exist in these captures, and they must not be mixed up:

**A. Badges — tonal (pale fill + dark same-hue text), with either a leading dot or a leading glyph
depending on where the badge sits (see §1.5).**

| Tone | Fill / text (approx.) | Example labels | Evidence |
|---|---|---|---|
| Success `[inferred]` | Pale mint `#C3FED8`-ish fill, deep green `#0C5132` text | `Active`, `Live`, `Fulfilled (1)` on the fulfilment **card header**, `Paid` in billing history | `03-products/products-list-default.webp`, `02-orders/order-fulfill-item-page.webp`, `02-orders/order-detail-paid-fulfilled-gift-card.webp` (green `Fulfilled (1)` card badge), `10-settings/settings-billing-overview-bills-and-credits.webp` |
| Warning `[inferred]` | **Shopify ships two fills in this family**, visible side by side in one row: `Payment pending` = peach/orange **`#F4D6B1`**, `Unfulfilled` = yellow **`#F6EA98`**. Dark brown ~`#4F3812` text in both. Neither is the `#FFEFC9` this table previously claimed. **Eyvar collapses the pair into one warning tone (R7 — the palette is five tones); pick the yellow and use it for both** | `Unfulfilled`, `Payment pending` | `02-orders/orders-list-with-metrics-row.webp`, `02-orders/order-fulfill-item-page.webp` |
| Info `[inferred]` | Pale blue fill ~`#DCE8F1`, deep blue text | `Draft` (products & discounts lists) — sampled blue, **not** grey; §3.4's neutral listing was wrong. Also `Hidden` on blog posts | `03-products/products-list-default.webp`, `04-customers/customer-segment-templates-panel.webp`, `05-online-store/blog-posts-list.webp` |
| New `[inferred]` | Pale lavender/violet fill, purple text | Category chips (`Clothing`) in the bulk editor; tag chips | `03-products/products-bulk-editor-grid.webp` |
| Neutral `[inferred]` | `#E3E3E3`–`#F0F0F0` fill, `#303030` text, dark dot | `Archived`, `Refunded`, `Voided`, and the **title-row** `Fulfilled` / `Paid` badges on an order detail page | `03-products/products-list-default.webp`, `14-global-search/search-modal-order-results-list.webp`, `02-orders/order-detail-paid-fulfilled-gift-card.webp` |
| Critical `[Polaris]` | Pale red fill, deep red text — **not directly observed as a badge** in any screenshot read | — | — |

Two honest complications, neither of which is resolved by deleting evidence:

- **`Paid` genuinely ships in two tones.** Green in `10-settings/settings-billing-history.webp`; grey
  in `02-orders/order-detail-paid-fulfilled-gift-card.webp` and
  `14-global-search/search-modal-order-results-list.webp`. **R14 rules that Eyvar's `Paid` is the
  success (green) tone**, product-wide. The grey rendering is Shopify's inconsistency, not a second
  Eyvar tone.
- **`Fulfilled` likewise.** Green with a delivery-truck glyph on the fulfilment card header, grey with
  a dot in the page title row of the *same* screen, and grey in the global-search results list. The
  earlier citation of `14-global-search/search-modal-order-results-list.webp` as evidence for a
  *green* `Fulfilled` is wrong — every order badge in that file samples neutral grey
  (`#F0F0F0`–`#F1F1F1`). Eyvar takes the success tone, per the same reasoning as R14.
- **`Code` is not a badge at all.** In `09-discounts/discounts-list-with-code.webp` it is plain text in
  the `Method` column — no pill, no fill. It belongs to §3.4's "plain text when the value is
  descriptive" rule, not to this table.

**B. Banners — solid saturated header strip + white card body.** This is the modern admin banner
and it is *not* the tonal style.

| Tone | Header strip (approx.) | Body | Evidence |
|---|---|---|---|
| Success `[inferred]` | Saturated green **`#45815D`** (sampled; the earlier `~#1F8A4C` was recalled), white text, white check icon | White, dark text | `03-products/product-detail-created-success-banner.webp` |
| Critical `[inferred]` | Saturated red **`#D03822`** (sampled; the earlier `~#E02F2F` was recalled), white text, white alert icon | White, dark text | `02-orders/draft-order-validation-error-banner.webp` |
| Warning `[inferred]` | Amber ~`#F0A93B`, **dark** text/icon (not white) | White, dark text | `04-customers/customer-detail-erasure-request-banner.webp`, `11-apps-and-channels/app-detail-shop-channel-needs-attention.webp` |
| Info `[inferred]` | **Both treatments ship.** Plain white surface + hairline + blue circular leading icon in `11-apps-and-channels/point-of-sale-subscription-plans.webp`; a genuine pale blue fill (sampled **`#EDF4FF`**) in `02-orders/order-fulfill-item-page.webp` and inside form flows (§4.4) | — | `11-apps-and-channels/point-of-sale-subscription-plans.webp`, `02-orders/order-fulfill-item-page.webp` |

**Which of the two Eyvar ships — R1 and R16.** R1 already picks the **soft tinted card** over the
saturated split strip for every tone. R16 extends that to the info tone specifically: **all four
banner tones are pale tinted cards.** The warning surface has the same two-way split as info —
saturated amber strip in the store admin (`customer-detail-erasure-request-banner`), pale yellow card
in the forms surface (`10-settings/settings-payments-manual-methods-cod-activated.webp`, §4.4) — and
R1 settles it the same way.

**C. Legacy tonal banner** still exists in auth: pale green fill + green icon + dark text
(`00-auth/login-email-verified-banner.webp`). Do not reproduce this third style.

**D. Inline field error `[observed]`**: red input border + very pale red field fill (~`#FFF0F0`) +
red filled alert icon + red 12 px message below the field
(`00-auth/login-email-validation-error.webp`).

**Rules**
- MUST use `bg-canvas` (`#F1F1F1`) for the app canvas and `bg-surface` (`#FFFFFF`) for every card; a card MUST NEVER sit directly on a white page.
- MUST give the left nav a **near-canvas grey one step darker** than the canvas (`#EBEBEB` against `#F1F1F1`) and express selection with a white rounded pill; MUST NOT draw a border, divider or shadow between nav and content, and MUST NOT give the nav a contrasting panel fill. *(Was: "the **same** fill as the canvas" — falsified; the nav samples `#EBEBEB` and the canvas `#F1F1F1` in all five frames checked. The no-divider half of the old rule survives; the same-colour half does not.)*
- MUST use near-black (`#3E3E3E` for the fill, `#303030` for body text — they are **not** the same value), not a saturated hue, for primary button fills; blue is reserved for links and MUST NOT be used as a button fill.
  **→ Does not bind Eyvar. Superseded by R3 + §6.2 D-1: Eyvar's primary is brand blue, and links take `--blue-dk` + underline.**
- MUST NOT use pure `#000000` or pure `#FFFFFF` for body text; primary text is `#303030`, inverse text is white only on the `bg-inverse` bar.
- MUST render status **badges** in the tonal style (pale fill + dark same-hue text) and status **banners** in one consistent family; MUST NOT mix two banner expressions in one product. *(R1 picks the soft tinted card.)*
- MUST use dark text on the warning/amber surface and white text on green/red surfaces; MUST verify ≥4.5:1 contrast for each pairing before shipping.
- ~~MUST express "info" banners as a neutral white surface with a blue leading icon, not as a blue fill.~~
  **→ Deleted under R16.** Falsified by the document's own evidence: `order-fulfill-item-page.webp`
  ships an info banner whose fill samples `#EDF4FF`, a real blue tint. Both treatments exist in
  Shopify; under R1/R16 Eyvar's info banner is a **pale tinted card**, like the other three tones.
- MUST render `Paid` in the success tone product-wide (R14). Shopify ships it green in billing and grey on order detail; Eyvar does not reproduce that split.
- MUST collapse Shopify's two warning fills (`Payment pending` peach `#F4D6B1`, `Unfulfilled` yellow `#F6EA98`) into the **single** Eyvar warning tone required by R7; MUST NOT introduce a second amber.
- SHOULD ship exactly six badge tones (success, warning, critical, info, new, neutral) and SHOULD NOT invent a seventh.
  **→ Superseded by R7: the Eyvar palette is five tones — success, warning, info, neutral, new. There is no critical badge.**
- SHOULD pick one primary color for the contextual save bar and use it in every surface — never green in one area and white in another.

---

### 1.2 Typography

One family throughout (Polaris uses Inter with a system fallback stack `[Polaris]`; the captures show
a single geometric-humanist sans everywhere `[observed]`). The ramp is unusually **small and tight** —
body text is 13 px, not 14 or 16 — which is what makes the admin feel dense and tool-like.

| Role | Size / weight (approx.) | Color | Where used | Evidence |
|---|---|---|---|---|
| Page title `[observed]` | ~20 px / 600–650, tight leading | `text` | "Products", "Discounts", "Analytics", "Finances", "Customers", "#1003" | `03-products/products-list-default.webp`, `08-finances/finances-overview-earnings-donut-and-payouts.webp` |
| Modal / sheet title `[observed]` | ~15–16 px / 600 | `text` | "Archive 3 products?", "Edit profile", "Abandoned checkout" | `03-products/products-list-archive-confirm-modal.webp`, `10-settings/settings-store-details-edit-profile-modal.webp` |
| Section / card heading `[observed]` | ~13–14 px / 600 | `text` | "Pricing", "Inventory", "Shipping", "Notes", "Customer", "Timeline", "Earnings", "Active dates" | `03-products/product-edit-pricing-inventory-shipping.webp`, `02-orders/order-detail-paid-fulfilled-gift-card.webp` |
| Body `[observed]` | ~13 px / 400, ~20 px line-height | `text` | Card copy, table cells, menu items, nav labels, list rows | `04-customers/customer-detail-erasure-request-banner.webp` |
| Small / subdued `[observed]` | ~12 px / 400 | `text-secondary` | Field helper text, timestamps ("1 minute ago"), page subtitles ("January 8, 2024 at 11:50 pm from Draft Orders"), nav section labels ("Sales channels", "Apps"), footnotes ("Only you and other staff can see comments") | `02-orders/order-detail-paid-fulfilled-gift-card.webp`, `03-products/products-list-default.webp` |
| Table column header `[observed]` | ~12–13 px / 500, sentence case (**never** uppercase, **never** letter-spaced) | `text-secondary` | "Product", "Status", "Inventory", "Payment status", "Combinations" | `03-products/products-list-default.webp`, `09-discounts/discounts-list-with-code.webp` |
| Button label `[observed]` | ~13 px / 500–600 | context | All buttons, in every size | `03-products/products-list-default.webp` |
| Field label `[observed]` | ~12–13 px / 400–500 | `text` | "First name", "Price", "Start date" | `04-customers/customer-new-form-empty.webp` |
| Badge label `[observed]` | ~11–12 px / 500 | tone text | `Active`, `Unfulfilled` | `02-orders/orders-list-with-metrics-row.webp` |
| Metric / KPI number `[observed]` | ~18–20 px / 600 | `text` | "$34.00", "0%", "$19.00", "$18.00" on analytics & finances cards | `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`, `08-finances/finances-overview-earnings-donut-and-payouts.webp` |
| Display (marketing surfaces only) `[observed]` | ~28–32 px / 600–700 | `text` | "POS Lite" / "POS Pro" / "$79" on the plan-picker | `11-apps-and-channels/point-of-sale-subscription-plans.webp` |

Observations that matter:
- There are only **two weights in practice**: regular (400) and semibold (600ish). Medium (500) shows up on button/table-header labels. No light, no black, no italics anywhere in 33 captures.
- **Card heading and body differ by ~1 px and one weight step.** Hierarchy inside a card comes from weight and spacing, not size. `03-products/product-edit-pricing-inventory-shipping.webp` is the clearest example.
- **All caps is never used.** Not for table headers, not for badges, not for nav sections.
- Numbers in tables are right-aligned; labels are left-aligned (`02-orders/orders-list-with-metrics-row.webp`, `10-settings/settings-billing-overview-bills-and-credits.webp`).

`[Polaris]` token names for the same ramp: `--p-font-size-300` (12), `--p-font-size-325` (13),
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
almost all the work. `[observed]` across all captures; `[Polaris]` names these
`--p-space-100` = 4, `-200` = 8, `-300` = 12, `-400` = 16, `-500` = 20, `-600` = 24, `-800` = 32.

| Measurement | Value (approx.) | Evidence |
|---|---|---|
| Top bar height `[observed]` | **56 px** | `03-products/products-list-default.webp` |
| Left nav width `[observed]` | **240 px** | every admin page |
| Nav item height `[observed]` | ~28–32 px, 8 px horizontal padding, 8 px icon→label gap | `03-products/products-list-default.webp` |
| Page gutter (canvas → card) `[observed]` | **24 px** left and right | `03-products/products-list-default.webp` |
| Page top padding (bar → title) `[observed]` | ~20–24 px | `09-discounts/discounts-list-with-code.webp` |
| Title → first card `[observed]` | ~20–24 px | `03-products/products-list-default.webp` |
| **Card padding** `[observed]` | **16 px** on all sides | `02-orders/order-detail-paid-fulfilled-gift-card.webp`, `03-products/product-edit-pricing-inventory-shipping.webp` |
| **Gap between stacked cards** `[observed]` | **16 px** | `03-products/product-edit-pricing-inventory-shipping.webp`, `10-settings/settings-billing-overview-bills-and-credits.webp` |
| Gap between side-by-side cards `[observed]` | ~16–20 px | `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp` (3-up metric grid) |
| Card heading → first content `[observed]` | ~12 px | `03-products/product-edit-pricing-inventory-shipping.webp` |
| **Form field vertical rhythm** `[observed]` | label→input **4 px**; input→helper text **4 px**; field block→next field block **16 px** | `04-customers/customer-new-form-empty.webp` |
| Two fields on one row: horizontal gap `[observed]` | **16 px**, equal widths | `04-customers/customer-new-form-empty.webp` ("First name" / "Last name") |
| Input height `[observed]` | ~32 px, ~8–12 px horizontal padding | `04-customers/customer-new-form-empty.webp` |
| Button height `[observed]` | ~28–32 px (medium); page-header buttons ~28 px | `03-products/products-list-default.webp` |
| Gap between adjacent buttons `[observed]` | **8 px** | `02-orders/order-detail-paid-fulfilled-gift-card.webp` (Refund / Return / Edit / More actions) |
| Checkbox/radio → label gap `[observed]` | **8 px**; between stacked options **12 px** | `09-discounts/discount-create-eligibility-and-active-dates.webp` |

**Page width & layout**

| Layout | Measurement | Evidence |
|---|---|---|
| Detail / form page max width `[observed]` | **~950–1000 px**, centered in the remaining space after the 240 px nav | `02-orders/order-detail-paid-fulfilled-gift-card.webp` (195→701 img px ⇒ ~950 px), `04-customers/customer-new-form-empty.webp` |
| Index / list page `[observed]` | **Fluid full width** — stretches to viewport minus 24 px gutters (~1150 px at 1440) | `03-products/products-list-default.webp`, `02-orders/orders-list-with-metrics-row.webp` |
| Settings modal content max width `[observed]` | **~1000 px**, with its own ~280 px internal settings nav | `10-settings/settings-store-details-edit-profile-modal.webp` |
| **Two-column detail layout (main + right sidebar)** `[observed]` | main ~640 px : sidebar ~290 px ⇒ **≈ 2 : 1**, with a ~16–20 px column gap. Sidebar holds small standalone cards (Notes, Customer, Publishing, Tags, Fraud analysis) each 16 px apart | `02-orders/order-detail-paid-fulfilled-gift-card.webp`, `03-products/product-detail-created-success-banner.webp` |
| **Annotated form layout (label column + card)** `[observed]` | description ~310 px : content ~620 px ⇒ **1 : 2**, ~20 px gap; the description column is plain text on the canvas, the content column is a card | `04-customers/customer-new-form-empty.webp`, `15-account/account-general-unsaved-changes.webp` |
| Analytics metric grid `[observed]` | 3 equal columns, **~19–20 px gutters** — card edges measure 142→338, 350→546, 557→753 img px, so the gaps are 11 and 10 img px. Both the ~16 px stated here and §3.7's ~12 px were low (C10) | `07-analytics/analytics-dashboard-today-no-data.webp`, `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp` |

**Table metrics**

| Measurement | Value (approx.) | Evidence |
|---|---|---|
| Table header row height `[observed]` | ~40 px | `03-products/products-list-default.webp` |
| Row height, text only `[observed]` | ~36–40 px | `02-orders/orders-list-with-metrics-row.webp`, `03-products/products-bulk-editor-grid.webp` |
| Row height, with a **40 px** thumbnail `[observed]` | ~52–56 px. The thumbnail is ~40×40 px, not 32 — ≈23×20 img px at 1.90× (C11; §3.1 was right) | `03-products/products-list-default.webp` |
| Row height, two-line (title + subtitle) `[observed]` | ~56 px | `14-global-search/search-modal-order-results-list.webp`, `09-discounts/discounts-list-with-code.webp` |
| First column left padding `[observed]` | ~12–16 px, aligned with the leading checkbox | `03-products/products-list-default.webp` |
| Cell horizontal gap `[observed]` | ~16–24 px between columns | `02-orders/orders-list-with-metrics-row.webp` |
| Tabs strip inside the list card `[observed]` | ~40 px tall, sits **inside** the card above the table, separated by a hairline | `03-products/products-list-default.webp` |

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

| Component class | Radius (approx.) | `[Polaris]` token | Evidence |
|---|---|---|---|
| Card / panel / table container `[observed]` | **~12 px** | `--p-border-radius-300` | `03-products/products-list-default.webp`, `08-finances/finances-overview-earnings-donut-and-payouts.webp` |
| Modal / sheet `[observed]` | **~12–16 px** | `--p-border-radius-300`/`-400` | `03-products/products-list-archive-confirm-modal.webp`, `10-settings/settings-store-details-edit-profile-modal.webp` |
| Button / input / select / popover / menu `[observed]` | **~8 px** | `--p-border-radius-200` | `04-customers/customer-new-form-empty.webp`, `02-orders/order-detail-more-actions-menu.webp` |
| Badge / chip / tag `[observed]` | **~8 px** (soft rectangle, **not** a full pill). Zoomed: ~3–4 img px radius on an 11 img px badge — a stadium would need 5.5 | `--p-border-radius-200` | `03-products/products-list-default.webp`, `03-products/products-bulk-editor-grid.webp` |
| Toast `[observed]` | **~8 px** — measured ~4–5 img px radius on a 23 img px pill; a true stadium would be 11.5 | `--p-border-radius-200` | `03-products/products-list-products-imported-toast.webp`, `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp` |
| Avatar / initial badge `[observed]` | **~8 px rounded square** — never a circle | `--p-border-radius-200` | `02-orders/order-detail-paid-fulfilled-gift-card.webp` ("JS"), `00-auth/login-password-step-empty.webp` ("JM") |

**→ R15 confirms this block and overrides the sections that contradicted it.** Badges, toasts and
avatars are rounded rectangles/squares at ~8 px — never stadium pills, never circles. §3.4's "fully
rounded ends", §5.1's "rounded pill" and §3.8's "circular avatar" are corrected accordingly.
| Thumbnail (product image) `[observed]` | **~8 px** | `--p-border-radius-200` | `03-products/products-list-default.webp` |
| Nav item / tab `[observed]` | **~8 px** | `--p-border-radius-200` | `03-products/products-list-default.webp` |
| Checkbox `[observed]` | **~4 px** | `--p-border-radius-100` | `09-discounts/discount-create-eligibility-and-active-dates.webp` |
| Radio / status dot / progress track `[observed]` | Full circle | `--p-border-radius-full` | `09-discounts/discount-create-eligibility-and-active-dates.webp` |

**Border width is always 1 px.** The only exceptions are the focus ring (~2 px, dark) and the selected
segment on segmented controls.

**Elevation — the border-vs-shadow decision:**

| Surface | Treatment | Evidence |
|---|---|---|
| **Card on the canvas** `[observed]` | 1 px `#E3E3E3` border **plus** a barely-there downward shadow (≈ `0 1px 0 rgba(0,0,0,.05)`). It is essentially a bordered surface, not a floating one. | `03-products/products-list-default.webp`, `10-settings/settings-billing-overview-bills-and-credits.webp` |
| **Nested block inside a card** `[observed]` | 1 px border **only**, no shadow, often on a `#F7F7F7` fill | `11-apps-and-channels/app-install-permissions-consent.webp` |
| **Popover / dropdown menu** `[observed]` | Clear soft shadow, minimal or no visible border — it must read as detached from the page | `02-orders/order-detail-more-actions-menu.webp`, `03-products/products-list-sort-popover.webp`, `13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp` |
| **Notification popover** `[observed]` | Same as popover: shadow, anchored under the bell, **~400 px wide** — it spans x 556→757 = ~201 **image** px, which this table previously read as CSS px. §2.6 has it right | `12-notifications/alerts-popover-with-channel-issue.webp` |
| **Modal** `[observed]` | Large soft shadow **plus** a page-wide dark scrim; no border | `03-products/products-list-archive-confirm-modal.webp`, `06-marketing/marketing-automation-template-detail-modal.webp` |
| **Settings modal (full-screen sheet)** `[observed]` | Inset ~8 px from the left/right, top edge ~68 px down, rounded top corners, shadow + scrim; the admin remains dimly visible behind | `10-settings/settings-billing-overview-bills-and-credits.webp` |
| **Right-side guide drawer** `[observed]` | Panel flush to the right edge, hairline left border, no scrim (the page stays interactive). **Corrected in 0.2's R-3 pass: there is no measurable shadow.** Three scanlines across the panel edge read `241,241,241,242,235,242,255` — canvas, then the hairline, then card white, with no falloff between them. This row previously said “hairline left border + soft shadow”; the shadow half is not in the pixels. *(Eyvar still gives its drawer `--ev-shadow-2`, as a **deviation** argued in `docs/05-restructure/design/00-decisions-r3.md` §1.5: Eyvar's drawer opens over full-bleed content, where a hairline on white is a 1.1:1 step.)* | `01-home/home-guide-side-panel-in-progress.webp` |
| **Floating bulk-action bar** `[observed]` | White surface, **light hairline** border + shadow, ~8 px radius, anchored bottom-center **inside** the list card. It is *not* dark-outlined (C13; §5.4 corrected). **Corrected in 0.2's R-3 pass: the shadow is not “pronounced”** — it measures peak α ≈ 0.075 over ~8 px, statistically the same as a popover's 0.07, and a full tier below the modal's 0.15. It takes the same elevation token as a popover | `03-products/products-list-bulk-selection-action-bar.webp` |
| **Toast** `[observed]` | Dark near-black **rounded rectangle** (~8 px radius, not a stadium — R15), shadow, bottom-center **of the viewport** (x≈384, not the content region's x≈448 — C9), ~44 px tall, with a trailing `×` | `03-products/products-list-products-imported-toast.webp` (family), `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`, `04-customers/customer-detail-erasure-request-banner.webp` |
| **Auth card** `[observed]` | White card, ~12 px radius, moderate shadow, floating on a photographic/gradient backdrop | `00-auth/login-password-step-empty.webp` |
| **Contextual save bar** `[observed]` | Replaces the top bar in place — dark, no radius, no shadow, full bleed | `15-account/account-general-unsaved-changes.webp`, `09-discounts/discount-create-eligibility-and-active-dates.webp` |

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

| Property | Value | Evidence |
|---|---|---|
| Nav icon size `[observed]` | ~16 px (rendered in a ~20 px box `[Polaris]`) | `03-products/products-list-default.webp` |
| Top bar icon size `[observed]` | ~20 px (search, bell) | `02-orders/orders-list-with-metrics-row.webp` |
| In-card action icon `[observed]` | ~16 px (pencil, kebab `⋯`, chevron `›`, copy) | `02-orders/order-detail-paid-fulfilled-gift-card.webp` |
| Inline / affix icon `[observed]` | ~14–16 px (calendar and clock inside date/time inputs, `?` help circles, `$` currency prefix) | `09-discounts/discount-create-eligibility-and-active-dates.webp`, `03-products/product-edit-pricing-inventory-shipping.webp` |
| Badge status dot `[observed]` | ~6–8 px filled circle — on **list-row** badges | `02-orders/orders-list-with-metrics-row.webp` |
| Badge status glyph `[observed]` | ~16 px filled glyph — on **fulfilment card-header** badges: a package glyph on the yellow `Unfulfilled`, a delivery-truck glyph on the green `Fulfilled (1)` | `02-orders/order-fulfill-item-page.webp`, `02-orders/order-detail-paid-fulfilled-gift-card.webp` |
| Style `[observed]` | **Filled / solid-weight monoline**, geometric, no outline-stroke look, no two-tone. Corners are soft. Icons inherit `currentColor` — grey when subdued, near-black when primary, white on the dark bar. | all captures |
| Banner leading icon `[observed]` | ~16 px, filled, white on green/red strips, dark on the amber strip, blue-in-circle for info | `03-products/product-detail-created-success-banner.webp`, `11-apps-and-channels/point-of-sale-subscription-plans.webp` |

**Where icons ARE used** `[observed]`:
left nav (one per top-level item), top bar (search, bell, store avatar), card header actions
(pencil = edit, `⋯` = overflow), popover menu items (`02-orders/order-detail-more-actions-menu.webp` —
Duplicate, Cancel order, Archive, Print… each with a leading 16 px icon), the quick-create menu
(`13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp`), banner leading icons,
input affixes, timeline composer toolbar (emoji, mention, hash, attach), disclosure carets on
buttons and selects, the back arrow `←` on every detail page, and collapse chevrons on collapsible
cards.

**Where icons are deliberately NOT used** `[observed]`:
- **Table column headers** — text only, plus a sort caret on the active column (`03-products/products-list-default.webp`).
- **Form field labels** — never iconized (`04-customers/customer-new-form-empty.webp`).
- **Primary and secondary buttons in the page header** — "Add product", "Export", "Import" are text-only; the only glyph is a trailing disclosure caret on split/menu buttons (`03-products/products-list-default.webp`).
- **Badges** — *partially*. **List badges** use a leading dot and no glyph
  (`02-orders/orders-list-with-metrics-row.webp`). **Fulfilment card-header badges do carry a leading
  16 px glyph** — a package on `Unfulfilled` (`02-orders/order-fulfill-item-page.webp`), a delivery
  truck on the green `Fulfilled (1)` (`02-orders/order-detail-paid-fulfilled-gift-card.webp`). The
  earlier "a dot, never a glyph" claim was false.
- **Card headings** — "Pricing", "Notes", "Customer" carry no leading icon (`03-products/product-edit-pricing-inventory-shipping.webp`).
- **Empty states** — use a full illustration, not a scaled-up icon (`09-discounts/discounts-empty-state.webp`, `04-customers/customers-empty-state.webp`).

**Avatar / initial-badge pattern** `[observed]`:
- ~28–30 px rounded square (8 px radius), two uppercase initials, ~11–12 px semibold, centered. The
  **timeline commenter avatar is ~30 px** (R15) — §3.8's "~32 px circular" was wrong on shape and
  close on size.
- **Two distinct treatments ship, not one.** A *pale* tint with **dark** initials — lavender "JM" on
  the login screen (`00-auth/login-password-step-empty.webp`) — and a *saturated* tint with **white**
  initials — pink/rose "JS" in the order timeline
  (`02-orders/order-detail-paid-fulfilled-gift-card.webp`,
  `02-orders/order-detail-timeline-comment-composer.webp`), green for the store avatar in the top bar
  (`03-products/products-list-default.webp`), green "MS" in settings
  (`10-settings/settings-store-details-edit-profile-modal.webp`). The palette is **not** uniformly
  pale and the text is **not** uniformly dark. Eyvar should pick one of the two and apply it
  everywhere.
- `[inferred]` The tint appears to be derived from the identity rather than randomised per render.
  This cannot be observed: it would require seeing the same identity across renders *and* a
  re-render, and neither is in the capture set. Treat it as a design decision to make, not a fact.
- When a real photo exists it replaces the initials in the same 8 px rounded square (`15-account/account-general-unsaved-changes.webp`).

**Rules**
- MUST ship a single icon set in one filled monoline style at 16 px (20 px only in the top bar); MUST NOT mix outline and filled sets.
- MUST have icons inherit `currentColor` so they take the subdued/primary/inverse text color of their context.
- MUST NOT put icons on table column headers, form labels, card headings, or page-header buttons.
- ~~MUST use a dot, not a glyph, inside badges.~~ **Falsified.** Downgraded to: **MUST NOT mix dot and glyph within one badge family.** List-row badges take a dot; fulfilment card-header badges take a 16 px glyph; pick one treatment per family and hold it.
- MUST render avatars as ~28–30 px rounded squares (never circles) with two initials, and MUST pick **one** tint treatment — pale fill + dark initials, or saturated fill + white initials — rather than shipping both as Shopify does. The tint SHOULD be deterministic per identity `[inferred]`; MUST NOT randomize per render.
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
the component's anchoring, geometry, and captured state, plus general Polaris behavior — none of it
is measurable in these files. It is included so the team has a starting contract, not a verified spec.

| Element | Inferred behavior | Basis (captured evidence of the resting state) |
|---|---|---|
| **Toast** `[inferred]` | Slides up ~8–16 px from the bottom edge while fading in (~150–200 ms, ease-out); rests bottom-center ~40 px above the viewport bottom; auto-dismisses after ~4–5 s or on `×`; exits by fading + sliding down (~150 ms). Multiple toasts would stack or replace. | Resting position and dark pill captured in `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`, `03-products/product-detail-created-success-banner.webp`, `04-customers/customer-detail-erasure-request-banner.webp` |
| **Popover / dropdown menu** `[inferred]` | Fades in with a small scale-up (~0.96→1) or a short slide from the trigger edge, ~100–150 ms ease-out; origin anchored to the trigger; dismiss is a faster fade (~100 ms). | Anchoring visible in `02-orders/order-detail-more-actions-menu.webp` (flush under "More actions"), `03-products/products-list-sort-popover.webp`, `12-notifications/alerts-popover-with-channel-issue.webp` |
| **Modal** `[inferred]` | Scrim fades in (~150 ms) while the dialog fades and scales/translates a few px upward; exit reverses, slightly faster. | `03-products/products-list-archive-confirm-modal.webp`, `06-marketing/marketing-automation-template-detail-modal.webp` |
| **Settings modal (full sheet)** `[inferred]` | Larger travel than a dialog — slides up from the bottom edge into its inset position, ~200–250 ms. | `10-settings/settings-billing-overview-bills-and-credits.webp` |
| **Right-side drawer / guide panel** `[inferred]` | Slides in from the right edge (~200 ms, ease-out) with no scrim; page content is not blocked. | `01-home/home-guide-side-panel-in-progress.webp` |
| **Contextual save bar** `[inferred]` | Replaces the top bar via a short cross-fade or downward slide the moment a field becomes dirty, ~150 ms; reverses on save/discard. | `15-account/account-general-unsaved-changes.webp`, `03-products/product-edit-pricing-inventory-shipping.webp` |
| **Global search modal** `[inferred]` | Fades/scales in from the top bar search field, ~120 ms; results list updates without re-animating the container. | `14-global-search/search-modal-order-results-list.webp` |
| **Collapsible card / accordion** `[inferred]` | Height animates with the chevron rotating 180°, ~150–200 ms. | `01-home/home-setup-guide-first-10-sales-expanded.webp` family, chevrons in `01-home/home-guide-side-panel-in-progress.webp` |
| **Progress / task completion** `[inferred]` | Progress bar width tweens; a task's ring icon fills to a check on completion. | `01-home/home-guide-side-panel-in-progress.webp` (1/6 completed bar, filled check on the done task) |
| **Bulk-action bar** `[inferred]` | Fades/slides up from the bottom of the list card when the first row is selected. | `03-products/products-list-bulk-selection-action-bar.webp` |
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
- Exact hex values. Every colour above is sampled from a compressed, downscaled WebP and is an approximation; the `[Polaris]` names are recalled, not sampled. Four of the values previously printed here were recalled Polaris tokens rather than measurements and have been replaced with sampled ones (primary fill `#3E3E3E` not `#303030`; account Save green `#367C62` not `~#2CA36A`; success strip `#45815D` not `~#1F8A4C`; critical strip `#D03822` not `~#E02F2F`). **Sample from a live product or the Polaris token package before committing tokens.**
- A **critical-tone badge** never appeared in **any screenshot read (≈135 of the 159 on disk)** — only critical banners and critical inline field errors. 24 captures are cited by no section of this document, so the frequently repeated "in any of the 159 screens" was never earned; R5's *ruling* stands, the evidence claim behind it was inflated.
- **Dark mode** does not appear in any capture. The dark top bar is a fixed inverse surface, not a theme.
- **Hover, focus-visible, active, and loading states** are almost entirely absent from static captures (one disabled-button and one focused-field state were visible).
- **Responsive/mobile breakpoints** — every capture is a ~1440 px desktop viewport. Nothing here constrains tablet or mobile layout.
- The green-vs-white save-bar primary is a **live inconsistency in the source**, not a rule to copy.

---

## 2. Layout & Navigation

> **Evidence base.** Every `[observed]` claim below comes from a screenshot in
> `docs/06-design-reference/shopify-admin-web/` that was opened and inspected for this section
> (38 images across 00-auth, 01-home, 02-orders, 03-products, 04-customers, 05-online-store,
> 06-marketing, 07-analytics, 08-finances, 09-discounts, 10-settings, 11-apps-and-channels,
> 12-notifications, 13-navigation-shortcuts, 14-global-search, 15-account).
> Claims marked `[Polaris]` come from knowledge of the Polaris design system and were **not**
> verifiable in these images — treat them as advisory, not evidence.
>
> **How the measurements were derived — R13, the single calibration.** All source images are
> 768 × 523 px, of which the bottom ~50 px is a Mobbin watermark strip that is ignored. The UI area is
> therefore 768 × ~473 px. Pixel edges were sampled programmatically (top bar bottom edge at y≈29–30,
> nav/content boundary at x≈129, card edges at x≈195/526/536/700).
>
> This section previously assumed a **2× downscale of a ~1536 CSS-px viewport**. That assumption is
> **wrong and is the outlier** among the document's four calibrations — it is what produced the 256 px
> nav that R11 had to overrule. The one calibration for the whole document is **≈1.90×**: a 56 px top
> bar at y≈29–30 implies 1.87–1.93×, and the nav boundary at x≈129 implies ~245 px, not 256.
>
> **Every figure in §2 has been rescaled by 1.90/2.00 = 0.95** and is **approximate, ±8 px**.
> **Px figures in §1–§5 are indicative, not binding** — use them as ratios and targets, not as gospel.
> Where a ruling in the header or the contradiction audit names a specific figure — the left nav at
> **~240 px** (R11), the drawer widths at **~406 px / ~648 px** (C12) — that named figure governs over
> the rescale.

---

### 2.1 The app frame

The admin is a fixed three-part shell: a dark top bar spanning the full viewport width, a left
navigation column beneath it, and a scrolling content region. Only the top bar is dark; the nav
column is a **near-canvas grey one step darker than the content canvas** — sampled at **`#EBEBEB`** on
the nav side of the x≈129 boundary and **`#F1F1F1`** on the content side. There is still **no border,
shadow or panel edge** drawn between them: the separation is tonal only. (This corrects an earlier
claim that both sides sampled `#F1F1F1`; the step is consistent across
`products-list-default`, `discounts-list-with-code`, `orders-list-with-metrics-row`,
`finances-overview-earnings-donut-and-payouts` and `customers-list-single-customer`.)
`[observed]` `docs/06-design-reference/shopify-admin-web/03-products/products-list-default.webp`,
`.../09-discounts/discounts-list-with-code.webp`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ▨ shopify        [ 🔍  Search                        ⌘K ]         🔔  ( My Store 🟢 )│ ← top bar, ~56px, dark #1A1A1A
├────────────────────┬─────────────────────────────────────────────────────────────┤
│  ⌂ Home            │                                                             │
│  ▤ Orders      (1) │   Products                          [Export][Import][⋯][+ Add]│ ← page header
│  ◇ Products        │  ┌───────────────────────────────────────────────────────┐  │
│      Collections   │  │  metrics / cards / table                               │  │
│      Inventory     │  │                                                       │  │
│      Purchase ord. │  └───────────────────────────────────────────────────────┘  │
│      Transfers     │                                                             │
│      Gift cards    │                Learn more about products.                   │
│  ○ Customers       │                                                             │
│  ▤ Content         │                                                             │
│  ◷ Finances        │                                                             │
│  ⌁ Analytics       │        ← nav ~240px →   ← content region, ~23px gutters →    │
│  ⚑ Marketing       │                                                             │
│  ％ Discounts       │                                                             │
│                    │                                                             │
│  Sales channels  › │                                                             │
│  ▣ Online Store    │                                                             │
│  ▣ Point of Sale   │                                                             │
│  ▣ Shop            │                                                             │
│                    │                                                             │
│  Apps            › │                                                             │
│  ⊕ Add apps        │                                                             │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │                                                             │
│  ⚙ Settings        │ ← pinned to the bottom of the nav column                    │
└────────────────────┴─────────────────────────────────────────────────────────────┘
```

**Top bar** — approximately 56 px tall, full-bleed dark. Three zones `[observed]`:

| Zone | Contents | Approx. geometry |
|---|---|---|
| Left | Shopify glyph + wordmark, sitting inside the nav column's width | starts ~16 px from the left edge |
| Centre | Search field: magnifier icon, placeholder "Search", `⌘K` hint right-aligned inside the field | ~514 px wide, **centred on the viewport**, not on the content region |
| Right | Notification bell (red dot when unread), then a store-switcher pill: store name + square avatar with initials | pill ends ~16 px from the right edge |

The search field being centred on the *viewport* (its centre lands on x≈384 of 768) rather than on
the content region is deliberate and consistent across every framed screenshot read. `[observed]`
`.../01-home/home-sales-chart-and-things-to-do-next.webp`,
`.../02-orders/orders-list-with-metrics-row.webp`

The bell renders a small red dot badge when alerts are pending and takes a lit/active treatment
while its popover is open. `[observed]` `.../12-notifications/alerts-popover-with-channel-issue.webp`

**Left navigation** — **~240 px** wide (R11), full height below the top bar, with the content region
starting ~23 px to the right of its edge. The 256 px figure this section used to print was an artefact
of the wrong 2× calibration; the boundary at x≈129 img px measures ~245 px at 1.90×, and R11 fixes
~240 px as the constant. §3's ~247 px is the same measurement rounded differently and is not a
disagreement about the product. `[observed]`

Anatomy, top to bottom `[observed]` across `.../03-products/products-list-default.webp`,
`.../02-orders/order-detail-unfulfilled-payment-pending.webp`, `.../08-finances/finances-overview-earnings-donut-and-payouts.webp`:

1. **Primary items**, each a 16 px leading icon + label: Home, Orders, Products, Customers,
   Content, Finances, Analytics, Marketing, Discounts.
2. **Count badge** — a small right-aligned numeral on the row (Orders shows `1`, `2`, `3` in
   different captures). Only Orders was observed carrying one.
3. **Nested secondary items** appear indented under the *one* expanded parent:
   - Products → Collections, Inventory, Purchase orders, Transfers, Gift cards
   - Orders → Drafts, Shipping labels, Abandoned checkouts
   - Customers → Segments
   - Finances → Credit, Bill Pay
   - Online Store → Themes, Blog posts, Pages, Navigation, Preferences
4. **`Sales channels` group** — a **muted sentence-case** group label, regular weight, with a
   disclosure chevron on the right, then Online Store, Point of Sale, Shop, each with a channel icon.
   ("Sales channels" and "Apps" carry no uppercasing and no letter-spacing — the earlier
   "uppercase-ish" description was wrong, and contradicted §1.2's own MUST.)
5. **`Apps` group** — same pattern; shows `⊕ Add apps` when empty, and installed apps (e.g. Email,
   with a pin affordance and its own nested Templates / Settings) when populated.
   `[observed]` `.../06-marketing/email-app-overview-campaigns-table.webp`
6. **`⚙ Settings`** pinned to the bottom of the column, separated from the scrolling list.

**Active-item treatment** `[observed]`: a top-level active item gets a filled white pill inset
~6 px from both nav edges, with a slightly heavier label weight. **A nested active item gets the same
full-width rounded white pill**, plus an elbow/connector marker running from the parent row into it
and a heavier label. The earlier claim that nested items get "a marker instead of a pill" is
contradicted by both files it cited: `.../03-products/inventory-quantities-by-variant.webp`
(Inventory active) and `.../04-customers/customer-segments-row-actions-menu.webp` (Segments active)
both render the pill. Also `.../05-online-store/blog-posts-list.webp` with Blog posts active.

**Only one section is expanded at a time** — the section that owns the current route. Every framed
capture read shows sub-items under one parent only and none under the others, but this is a universal
claim drawn from a finite set of static frames and is really a route-driven inference, not a
measurement. `[inferred]`

**Rules**
- The frame MUST be a fixed dark top bar (~56 px) plus a fixed left nav (**240 px** — R11); only the
  content region scrolls.
- The nav column MUST be a near-canvas grey **one step darker** than the content canvas (`#EBEBEB`
  against `#F1F1F1`); do NOT draw a border, shadow, or contrasting panel between them.
- The global search field MUST be horizontally centred on the viewport and MUST display its
  keyboard hint (`⌘K` / `Ctrl K`) inside the field, right-aligned.
- The top bar's right cluster MUST be exactly: notifications, then the store/account switcher. No
  other icons.
- Every primary nav item MUST have a leading icon; secondary (nested) items MUST NOT.
- Only one nav section MAY be expanded at a time, and it MUST be the section containing the current
  page.
- Active items MUST use an inset filled white pill **at both levels** — top-level and nested. A nested
  active row additionally carries an elbow connector from its parent. *(Was: "active nested items MUST
  use a lighter marker + weight change, never a second pill." Both cited screenshots show the
  opposite; the rule is inverted, not softened.)*
- Count badges MUST be right-aligned numerals on the row and MUST be reserved for actionable
  backlogs (unfulfilled orders), not for decoration.
- Settings MUST be pinned to the bottom of the nav column and MUST NOT scroll with the nav list.

---

### 2.2 Page structure: header, widths, one column vs two

**Page header** sits at the top of the content region and aligns to the content block, not to the
nav edge — its title's left edge lines up with the left edge of the first card, and its rightmost
button's right edge lines up with the right edge of the right rail. `[observed]`
`.../02-orders/order-detail-unfulfilled-payment-pending.webp`

Header slots, left to right `[observed]`:

- **Back arrow** (`←`), a bare icon button to the left of the title. Present on detail, create, and
  edit pages; **absent** on top-level list pages (`Products`, `Orders`, `Finances`,
  `Purchase orders` have no back arrow).
- **Title** (h1, ~20–24 px, semibold).
- **Status badge(s)** inline, immediately after the title, on the same baseline —
  `● Payment pending` + `⊙ Unfulfilled` on an order, `Draft` on a new segment.
  `.../04-customers/customer-segment-new-query-editor.webp`
- **Subtitle / metadata line** on a second row under the title, muted:
  "January 8, 2024 at 9:48 pm from Draft Orders";
  "New York NY, United States • Customer for less than 5 seconds"
  (`.../04-customers/customer-detail-no-orders-yet.webp`).
- **Right cluster**: secondary buttons, then a `More actions ▾` disclosure, then the primary button
  (dark fill). Disabled actions render greyed in place rather than being removed
  (`Duplicate`, `Use segment` on a draft segment). `[observed]`
- **Prev/next record pager** (`‹ ›`), rightmost of all, on record-detail pages only — observed on
  order detail and customer detail, absent on list pages and create forms. `[observed]`

**Widths** (approximate and **indicative, not binding** — rescaled from the old 2× figures by ×0.95
per R13; the *ratios* are what matter and they are unchanged):

| Element | Approx. | Evidence |
|---|---|---|
| Centred page max-width | **~955 px** (was ~1000 at 2×) | card block spans x≈195→700 of 768 (×1.90) `[observed]` |
| Main column (two-column) | **~625 px** (was ~660) | x≈196→525 `[observed]` |
| Right rail | **~310 px** (was ~320) | x≈536→700 `[observed]` |
| Column gutter | **~20 px** | x≈525→536 `[observed]` |
| Content side gutter (nav edge → card) | **~23 px** | x≈128→141 on full-width pages `[observed]` |
| Narrow single column (consent/confirmation) | **~705 px** (was ~740) | x≈263→633 `[observed]` |

The centred block is centred on the **content region** (nav excluded), not the viewport: the block
centre lands at x≈448, which is exactly `(128 + 768) / 2`. `[observed]`

**Which layout, when** `[observed]`:

| Layout | Used for | Example |
|---|---|---|
| **Full-width, left-aligned** (no max-width, ~23 px gutters) | Index/list pages and data grids | `.../03-products/products-list-default.webp`, `.../02-orders/orders-list-with-metrics-row.webp`, `.../03-products/purchase-orders-list.webp`, `.../05-online-store/blog-posts-list.webp` |
| **Centred single column (~955 px)** | Overview/dashboard pages built from cards | `.../08-finances/finances-overview-earnings-donut-and-payouts.webp`, `.../01-home/home-sales-chart-and-things-to-do-next.webp` |
| **Centred two-column, ~625 + ~310** | Every record detail and every create/edit form | order detail, customer detail, `.../03-products/product-add-new-blank-form.webp`, `.../09-discounts/discount-create-shipping-with-code.webp`, `.../02-orders/order-fulfill-item-page.webp` |
| **Centred narrow (~705 px)** | Consent / confirmation / single-decision pages | `.../11-apps-and-channels/app-install-permissions-consent.webp` |

```
        ← ~23px →│←───────────── centred block, ~955px ──────────────→│
┌─────────┬──────┴───────────────────────────────────────────────────┴──────┐
│  nav    │                                                                 │
│ ~240px  │  ←  #1001  ● Payment pending  ⊙ Unfulfilled   [Restock][Edit]   │
│         │     January 8, 2024 at 9:48 pm from Draft Orders  [⋯ More] ‹ ›  │
│         │  ┌──────────────────────────────────┐  ┌──────────────────────┐ │
│         │  │ ⊙ Unfulfilled (1)            ⋯   │  │ Notes             ✎  │ │
│         │  │  ▣ Custom Notebook  $20.00 × 1   │  └──────────────────────┘ │
│         │  │           [Fulfill item][Create…]│  ┌──────────────────────┐ │
│         │  └──────────────────────────────────┘  │ Customer          ✕  │ │
│         │  ┌──────────────────────────────────┐  │ Jane Doe             │ │
│         │  │ ⊙ Pending                        │  │ Contact information ✎│ │
│         │  │  Subtotal / Discount / Shipping   │  │ Shipping address   ✎ │ │
│         │  │  Total                    $19.00 │  │ Billing address      │ │
│         │  │        [Send invoice][Collect ▾] │  └──────────────────────┘ │
│         │  └──────────────────────────────────┘  ┌──────────────────────┐ │
│         │  Timeline                              │ Conversion summary   │ │
│         │  ┌──────────────────────────────────┐  └──────────────────────┘ │
│         │  │ [JS] Leave a comment…            │  ┌──────────────────────┐ │
│         │  │  ☺ @ # 🔗            [ Post ]     │  │ Fraud analysis       │ │
│         │  └──────────────────────────────────┘  └──────────────────────┘ │
│         │  │←───── main, ~625px ─────→│ 20px │←──── rail, ~310px ────→│   │
└─────────┴─────────────────────────────────────────────────────────────────┘
```

**What goes in the rail** `[observed]`: never primary editing content. Observed rail contents are
status/publishing controls (`Status`, `Publishing`, `Sales channels`, `Markets`,
`Product organization`), read-only summaries of the record (`Customer`, `Contact information`,
`Shipping address`, `Billing address`, `Conversion summary`, `Fraud analysis`, `Summary`), and
metadata (`Tags`, `Notes`). Rail cards frequently carry a pencil (edit) or `⋮` icon in their card
header rather than inline fields.

One important exception: on task-shaped pages the **primary action lives at the bottom of the rail
summary card, not in the page header** — `Fulfill item` is a full-width dark button inside the
`Summary` rail card while the header carries only `Print packing slip`. `[observed]`
`.../02-orders/order-fulfill-item-page.webp`

**Rules**
- Page headers MUST align to the content block: title left edge = first card left edge; last button
  right edge = rail right edge.
- A back arrow MUST appear on every detail, create, and edit page, and MUST NOT appear on a
  top-level index page.
- Status badges MUST render inline after the title, never on their own row and never inside the
  action cluster.
- The action cluster MUST order left-to-right as: secondary actions → `More actions ▾` → primary
  action → record pager. There MUST be at most one dark/primary button in a page header.
- The prev/next record pager MUST only appear on record-detail pages that belong to an ordered
  list, and MUST be the rightmost element.
- Index pages and data grids MUST be full-width; detail pages, forms, and overviews MUST be capped
  at ~955 px and centred **on the content region**, not the viewport.
- Two-column pages MUST use a **~2 : 1** main-to-rail ratio — ~625 px main + ~310 px rail with a
  ~20 px gutter at this calibration. The ratio binds; the px figures are indicative.
- The right rail MUST hold only status, publishing, summary, and metadata; primary form fields MUST
  stay in the main column.
- When a page exists to complete one task (fulfil, subscribe, pay), the confirming action SHOULD
  live at the bottom of the rail summary card as a full-width button, and the page header SHOULD
  then carry no primary button.
- Disabled actions MUST render greyed in place; do NOT hide actions that are merely unavailable.

---

### 2.3 The contextual save bar

When a form becomes dirty, the top bar is **replaced in place** by a save bar of the same height and
the same dark fill. The frame does not shift, nothing is pushed down, and the left nav stays
mounted. `[observed]`
`.../03-products/product-add-new-blank-form.webp`, `.../09-discounts/discount-create-shipping-with-code.webp`

```
  ── normal ────────────────────────────────────────────────────────────────────
 │ ▨ shopify      [ 🔍 Search              ⌘K ]        🔔   ( My Store 🟢 )      │
  ── dirty ─────────────────────────────────────────────────────────────────────
 │ ▨ shopify      ⚠ Unsaved product                    [ Discard ] [  Save  ]   │
  ── dirty, nothing valid to save ──────────────────────────────────────────────
 │ ▨ shopify      ⚠ Unsaved changes                    [ Discard ] [  Save  ]   │
                                                                   └ greyed ┘
```

Observed details:

- The logo/wordmark **stays** in the left slot; the search field and the right cluster are removed
  entirely. `[observed]`
- The message sits left-of-centre. **On store-admin surfaces it is preceded by a small warning
  glyph** (`.../03-products/product-edit-pricing-inventory-shipping.webp` shows ⚠ + "Unsaved
  product"). **The account surface is the exception: no glyph** — `.../15-account/account-general-unsaved-changes.webp`
  shows a bare "Unsaved changes". Labels are
  **entity-specific**: `Unsaved product` (`.../03-products/product-edit-pricing-inventory-shipping.webp`),
  `Unsaved discount` (`.../09-discounts/discount-create-shipping-with-code.webp`),
  and the generic `Unsaved changes`
  (`.../05-online-store/navigation-add-menu-with-add-item-panel.webp`,
  `.../07-analytics/analytics-customize-metrics-library-sidebar.webp`,
  `.../15-account/account-general-unsaved-changes.webp`).
- The right pair is `Discard` (low-contrast, dark-on-dark) + `Save` (light/white fill, dark label).
  `[observed]`
- **Disabled Save** renders as greyed label on the dark bar with no fill change to the bar itself —
  seen while the Add-menu-item sheet has an empty required field, and in the bulk editor before any
  cell is touched. `[observed]`
  `.../05-online-store/navigation-add-menu-with-add-item-panel.webp`,
  `.../03-products/products-bulk-editor-grid.webp`
- **Variants exist and should be treated as exceptions, not licence.** The account surface uses
  `Cancel` + a *green* `Save` (`.../15-account/account-general-unsaved-changes.webp`); the analytics
  customise mode uses `Cancel` + a dark `Save`
  (`.../07-analytics/analytics-customize-metrics-library-sidebar.webp`). The store-admin surfaces
  consistently use `Discard` + light `Save`.
- **The nav is not dimmed on any surface.** In `.../15-account/account-general-unsaved-changes.webp`
  the left nav column and the page canvas both sample `#F6F5F8` — identical, no dimming. (That page's
  nav is the *account* nav — General / Security — not the admin nav.) The element that *is* dimmed is
  the Shopify **wordmark** inside the save bar itself. The earlier "left nav is visibly dimmed" claim
  is deleted. `[observed]`
- **Bottom-of-form repeat**: at the end of a long form the main column ends with a single
  right-aligned `Save` button whose right edge aligns to the right edge of the *whole content
  block* (i.e. the rail's right edge, not the main column's). No `Discard` was observed paired with
  it. `[observed]` `.../03-products/product-edit-seo-listing-and-empty-variants.webp`

**Rules**
- Unsaved state MUST replace the top bar in place, at identical height, with no layout shift.
- The save bar MUST keep the product logo in the left slot and MUST remove global search and the
  right cluster.
- The label MUST be entity-specific when creating or editing a named record
  (`Unsaved product`, `Unsaved discount`) and MAY fall back to `Unsaved changes` for settings-like
  surfaces.
- The save bar MUST offer exactly two controls: a destructive-neutral `Discard` and a primary
  `Save`, in that order.
- `Save` MUST be disabled (greyed, non-interactive) while the form is invalid or nothing has
  actually changed. `Discard` MUST remain enabled.
- **→ Superseded by R2: Save is the brand-blue primary, like every other primary. The light/white
  Save recommended below is derived from Shopify's *dark* top bar; Eyvar's top bar is white (§6.2 D-3),
  so a light Save would be invisible on it.**
- The app MUST pick one save-bar button style and use it everywhere. Eyvar Admin SHOULD standardise
  on `Discard` + light `Save`; do NOT reproduce Shopify's green/`Cancel` account variant.
- Long forms (taller than ~1.5 viewports) SHOULD repeat a single right-aligned `Save` at the end of
  the main column, aligned to the right edge of the full content block.
- Navigating away with unsaved changes MUST be intercepted `[Polaris]` — not verifiable in these
  screenshots.

---

### 2.4 The Settings surface

Settings is **not a page in the frame**. It is a near-full-screen overlay card that sits on top of
the admin, dimming everything behind it, with the dark top bar still visible above it. `[observed]`
`.../10-settings/settings-billing-history.webp`, `.../10-settings/settings-store-details-saved-toast.webp`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▨ shopify        [ 🔍 Search           ⌘K ]        🔔   ( My Store 🟢 )        │ ← real top bar stays
├──┬───────────────────────────────────────────────────────────────────────┬───┤
│▒▒│ ⚙ Settings                                                          ✕ │▒▒▒│ ← overlay header ~56px
│▒▒├───────────────────────────────────────────────────────────────────────┤▒▒▒│
│▒▒│      ┌───────────────────┐   ┌───────────────────────────────────┐    │▒▒▒│
│▒▒│      │ [JM] JS Mob       │   │  ←  Billing history  [Export CSV] │    │▒▒▒│
│▒▒│      │      03afd8-3.my… │   │  ┌─────────────────────────────┐  │    │▒▒▒│
│▒▒│      ├───────────────────┤   │  │ All │Paid│Open│Failed│…     │  │    │▒▒▒│
│▒▒│      │  Store details    │   │  │ [Filter ▾]        [Sort ▾]  │  │    │▒▒▒│
│▒▒│      │  Plan             │   │  │ ▢ Billing cycle  Paid $1.00 │  │    │▒▒▒│
│▒▒│      │ ▶Billing          │   │  └─────────────────────────────┘  │    │▒▒▒│
│▒▒│      │  Users and perms  │   │      Learn more about bills.      │    │▒▒▒│
│▒▒│      │  Payments  …      │   │                                   │    │▒▒▒│
│▒▒│      └───────────────────┘   └───────────────────────────────────┘    │▒▒▒│
│▒▒│      │←── ~289px ──→│ 27 │←──────────── ~707px ───────────────→│      │▒▒▒│
│▒▒│      │←──────────── inner block ~1026px, centred ───────────────→│     │▒▒▒│
└──┴───────────────────────────────────────────────────────────────────────┴───┘
```

Shell geometry `[observed]`, sampled from `.../10-settings/settings-billing-history.webp`:

- Overlay card inset ~8 px from the left and right viewport edges (x≈4→764 of 768), top edge at
  y≈34 → roughly 12 px below the 56 px top bar, rounded corners, running to the bottom of the
  viewport. The backdrop outside it is a dark scrim.
- Overlay header ~56 px: a gear glyph + the word `Settings` on the left, a `✕` close on the right.
  There is no back arrow at this level.
- Inside, a **centred inner block ~1026 px** wide containing the nav card (~289 px) + ~27 px gutter
  + the content pane (~707 px). The block is centred on the overlay, leaving generous empty margins
  on both sides. (Rescaled ×0.95 per R13 — the audit verified these proportions to within a few px at
  the old calibration; the ratio `nav : gutter : pane` is what binds.)

Nav list `[observed]`, in order: a store identity header (square avatar + store name + `*.myshopify.com`
domain), then Store details, Plan, Billing, Users and permissions, Payments, Checkout, Customer
accounts, Shipping and delivery, Taxes and duties, Locations, Gift cards, Markets,
Apps and sales channels, Domains, Customer events, Brand, Notifications, Custom data, Languages,
Policies, Store activity log. Each row is icon + label; the active row takes a filled pill
identical in shape to the main nav's.

Behaviour notes `[observed]`:

- **The overlay body appears to scroll as one unit** — the settings nav scrolls off the top along
  with the content pane rather than being independently sticky
  (`.../10-settings/settings-payments-manual-methods-cod-activated.webp` shows the nav scrolled to
  its last items while the payments pane is scrolled). `[inferred]` — this is read off a single
  scrolled frame; a sticky nav could look identical at that scroll offset.
- **Inner sub-page navigation** replaces the pane, keeping the nav: the pane header becomes
  `← <Sub-page title>` with its own right-aligned actions —
  `← Billing cycle: Jan 12, 2024   [Download] [Export CSV file]`
  (`.../10-settings/settings-billing-cycle-detail.webp`).
- **Deep flows drop the nav entirely** and take the full overlay width as a two-column
  checkout-style layout: `← Review and subscribe` with a form column on the left (~680 px) and a
  sticky order-summary card on the right (~447 px), no settings nav visible.
  (`.../10-settings/settings-plan-review-and-subscribe.webp`)
- **Modals stack on top of the overlay**: a centred ~625 px dialog with title + `✕`, body, and a
  footer of `Cancel` + primary, dimming the settings overlay behind it.
  (`.../10-settings/settings-payments-setup-shopify-payments-modal.webp`)
- Surfaces you might expect in the main frame live here instead — **Apps and sales channels** is a
  settings page, not a frame page (`.../11-apps-and-channels/apps-and-sales-channels-installed-list.webp`).
- Settings pages use the same footer convention as frame pages:
  `Learn more about bills.` / `Learn more about apps.` / `Learn more about payments.`, centred under
  the content pane.

**Rules**
- Settings MUST open as an overlay over the current page, MUST keep the app top bar visible above
  it, and MUST be dismissible with a single `✕` in its own header.
- The overlay MUST preserve the page underneath so closing settings returns the user exactly where
  they were; settings MUST NOT be a route that destroys the previous page.
- The settings shell MUST be `nav (~289 px) + gutter (~27 px) + pane (~707 px)`, centred as one
  ~1026 px block inside the overlay. The px figures are indicative; the proportions bind.
- The settings nav MUST be headed by the store/tenant identity block (avatar, name, domain).
- The active settings nav row MUST use the same pill treatment as the main app nav.
- Sub-pages MUST navigate **inside the pane** with a `← Title` header and MUST keep the settings nav
  visible — except for multi-step transactional flows (billing, subscribe), which MAY take the full
  overlay width and hide the nav.
- Settings MUST NOT nest more than one level below a settings section; anything deeper MUST be a
  modal or a full-overlay flow.
- Any page that configures the store rather than operating it (apps, channels, domains, taxes)
  SHOULD live in settings, not in the primary nav.

---

### 2.5 Full-bleed layouts that break the frame

Four categories drop the admin frame entirely. Each substitutes its own top bar.

**A. Theme editor** `[observed]`
`.../05-online-store/theme-editor-live-preview-desktop.webp`,
`.../05-online-store/theme-editor-home-page-section-tree.webp`,
`.../05-online-store/theme-editor-color-scheme-picker.webp`,
`.../05-online-store/theme-editor-product-template-mobile-preview.webp`

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ⇤ Dawn ●Live ⋯      🇺🇸 United States ▾  ⌂ Home page ▾   [▣▤▯] ⧉ ↶ ↷  [ Save ] │ ← light bar, ~56px
├──┬────────────────────────┬───────────────────────────────────────────────────┤
│▤ │ Home page              │ ░░░░░░░░ live preview (iframe) on grey backdrop ░░│
│⚙ │ Header             ⟳   │ ░┌─────────────────────────────────────────────┐░│
│⧉ │  › Announcement bar    │ ░│  My Store   Home Catalog Contact      🔍 🛒  │░│
│  │  › Header              │ ░│                                             │░│
│56│  ⊕ Add section         │ ░│        Browse our latest products           │░│
│px│ Template               │ ░│              [ Shop all ]                   │░│
│  │  ⌄ Image banner        │ ░└─────────────────────────────────────────────┘░│
│  │      T Browse our…     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  │      ⊞ Buttons         │                                                  │
│  │  ⊕ Add block           │                                                  │
│  │ Footer                 │                                                  │
│  │←──── ~312px ──────────→│←──────── remaining width ────────────────────────→│
└──┴────────────────────────┴───────────────────────────────────────────────────┘
```

- Top bar is **light**, not dark: exit arrow, theme name (`Dawn`), a `●Live` / `Draft` badge, `⋯`
  overflow on the left; market + template/page selectors centred; device toggles
  (desktop / tablet / mobile), open-preview, undo, redo, and `Save` on the right. `Save` is greyed
  when there is nothing to save. `[observed]`
- A ~56 px **icon rail** (sections, theme settings, apps) — the same height as the bar — sits left of
  a ~312 px inspector panel.
- Selecting a panel item swaps the panel to a contextual inspector with its own
  `Editing Scheme 1  ✕` header, while the preview shows the selected region outlined and a floating
  toolbar over it. `[observed]`
- Mobile device toggle narrows the preview to a centred ~380 px frame on the same grey backdrop.
  `[observed]`
- Toasts appear over the preview (`Changes saved.`), bottom-centre of the preview area.

**B. Bulk product editor** `[observed]` `.../03-products/products-bulk-editor-grid.webp`

Full-bleed spreadsheet. Own light bar (~56 px): `⇤ Back` + `Editing 3 products` on the left;
`▥ Columns` + a disabled `Save` on the right. Below it, an edge-to-edge grid with a sticky header
row, a frozen first column (product title + thumbnail), indented variant sub-rows, inline editable
cells (chips, selects, steppers), and horizontal overflow. No nav, no page header, no max-width.

**C. Checkout-style / transactional pages** `[observed]`
`.../10-settings/settings-plan-review-and-subscribe.webp`

Form column + sticky priced summary card with a full-width primary (`Subscribe`) and a reassurance
line beneath it (`Change or cancel your plan at any time.`). Runs inside the settings overlay with
the settings nav removed.

**D. Auth pages** `[observed]`
`.../00-auth/login-email-filled.webp`, `.../00-auth/login-two-factor-authenticator-code.webp`,
`.../00-auth/oauth-choose-an-account.webp`, `.../00-auth/signup-create-account-email-password.webp`

No frame at all. A full-bleed dark gradient background (deep purple → teal) with a centred white
card, ~475 px wide, ~16 px radius, ~34 px padding, vertically centred. Card contents, in fixed
order: wordmark → h1 → one-line subtitle → field(s) → full-width dark primary button → `or` divider
→ a row of three equal social-provider buttons → a secondary link line
(`New to Shopify? Get started →`) → small legal links (`Help  Privacy  Terms`) at the card's
bottom-left.

Signup breaks the single card into a **~1206 px split card**: form panel left, marketing
image + testimonial + carousel dots right, both inside one rounded container, with a locale
selector (`I'm located in 🇺🇸 United States ⌄`) top-right of the form panel. `[observed]`

A fifth, degenerate case: the deactivated-store page keeps a **stub top bar** carrying only the
account switcher, and centres a ~874 px single column with no nav.
`[observed]` `.../15-account/store-deactivated-reopen-page.webp`

**Rules**
- Immersive editors (theme editor, bulk editor) MUST replace the whole frame — no admin nav, no
  admin top bar — and MUST provide their own exit affordance in the left slot of their own bar.
- An immersive editor's bar MUST carry, at minimum: exit, the name of the thing being edited, its
  status badge, and a `Save` that is greyed when there is nothing to save.
- Preview surfaces MUST offer device-width toggles and MUST render the preview on a neutral
  backdrop that is visually distinct from the previewed page.
- The editor inspector panel SHOULD be ~312 px, and a multi-mode editor SHOULD front it with an icon
  rail the same height as the bar (~56 px) rather than tabs.
- Bulk grids MUST be edge-to-edge with a sticky header row and a frozen identity column.
- Auth pages MUST NOT render the frame. They MUST use a centred card ~475 px wide on a full-bleed
  background, with the field order: identity → primary action → alternates → sign-up/sign-in switch
  → legal links.
- Auth cards MUST keep the primary button full-width and MUST place provider buttons in a single
  equal-width row beneath an `or` divider.
- Marketing content on auth pages MUST be confined to a second panel of a split card and MUST never
  displace the form's vertical centring.

---

### 2.6 Navigation affordances

**Global search** `[observed]`
`.../14-global-search/search-modal-order-results-list.webp`,
`.../14-global-search/search-modal-scoped-to-apps.webp`,
`.../14-global-search/search-modal-scoped-to-orders-empty.webp`

The top-bar field expands **in place** into a ~657 px panel anchored to the field's own x-position,
overlapping the top bar and floating over dimmed page content. It is an anchored popover, not a
centred command palette.

```
        ┌──────────────────────────────────────────────────────┐
        │ 🔍 [Orders ✕] 1                                ✕  ⚙  │ ← input row, scope chip inline
        ├──────────────────────────────────────────────────────┤
        │ Results (6)                                          │ ← section label
        │ ▤ #1006  ● Payment pending  ⊙ Unfulfilled            │
        │    Shiv Roy • Placed on Jan 9, 9:26 PM               │ ← two-line row: title+badges / meta
        │ ▤ #1005  ● Paid  ⊙ Unfulfilled                       │
        │    Abigail Smith • Placed on Jan 9, 3:58 AM          │
        │ …                                                    │
        ├──────────────────────────────────────────────────────┤
        │ 🔍 Search for "1" in Orders                          │ ← escape hatch, always last
        └──────────────────────────────────────────────────────┘
```

- **Scoping** is a removable chip inside the input (`Orders ✕`, `Apps ✕`) followed by the query.
  Removing the chip returns to unscoped search. `[observed]`
- Right of the input: a clear (`✕`) control, shown only when there is a query, and a filter/settings
  glyph. `[observed]`
- Result rows: leading resource icon, title, inline status badges, and a muted second line of
  metadata. Sections are labelled with a count — `Results (6)`, `Installed apps (2)`. `[observed]`
- A divider separates results from a **footer action list**: `Search for "1" in Orders` on a query,
  or navigational escapes like `All recommended apps` / `App and sales channel settings` on the
  apps scope. `[observed]`
- **Scoped-empty state**: a centred magnifier glyph over `Search for orders` inside a short panel —
  it does not collapse to zero height, and it does not show a "no results" error. `[observed]`

**Resource shortcut menu** `[observed]`
`.../13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp`

A menu anchored **above** its trigger listing resource types, each row being
`icon · label · keyboard shortcut · ›`: Orders `# O`, Draft orders `# D`, Customers `# C`,
Products `# P`, Variants `# V`, Transfers `# T`, Purchase orders `# K`. The trigger (`#` in the
timeline composer) renders in an active state while the menu is open, and each row's chevron opens
a submenu of that resource type. The shortcut is displayed as a two-token glyph pair, right-aligned
before the chevron.

**Back / breadcrumb behaviour** `[observed]`: there are no breadcrumb trails anywhere in the
material read. Hierarchy is expressed by a single `←` back arrow immediately left of the page title
— on frame pages (`← Add product`, `← Fulfill item`, `← New segment`, `← Shiv Roy`) and inside the
settings pane (`← Billing history`, `← Billing cycle: Jan 12, 2024`, `← Review and subscribe`).
Depth beyond one level is handled by overlays and modals rather than by deeper trails.

**Tabs vs sub-nav** `[observed]`:

- **Sub-nav = the sidebar.** Sibling pages of a section (Collections, Inventory, Transfers; Themes,
  Blog posts, Pages) are nested nav items, never tabs.
- **Tabs = saved views/filters of one dataset**, and they live *inside the top of the card*, not in
  the page header: `All · Active · Draft · Archived · +` on products,
  `All · Unfulfilled · Unpaid · Open · Closed · +` on orders,
  `All · Paid · Open · Failed · Processing · Refunded · Canceled` on billing history,
  `All · Campaigns · Automations` on the email app, `Installed` on apps and sales channels.
- The trailing `+` on a tab row creates a new saved view. `[observed]`
  `.../03-products/products-list-create-view-modal.webp` (by name),
  `.../03-products/products-list-default.webp`
- The tab row's right end carries the table's own controls: search, filter, view/columns, sort.
  `[observed]`
- Entering search mode replaces the tab row with a full-width query field plus filter chips
  (`Product vendor ▾`, `Tagged with ▾`, `Status ▾`, `Add filter +`, `Clear all`) and a
  `Cancel` / `Save as` pair. `[observed]` `.../03-products/products-list-search-and-filters.webp`

**"Learn more about X" footer links** `[observed]`: a single muted sentence, **centred beneath the
last card** of the content block, of the form `Learn more about <link>.` — orders
(`.../02-orders/orders-list-with-metrics-row.webp`), purchase orders, blog posts, fulfilling orders,
segments, bills, apps, payments. It is never in a page footer bar, never in the rail, and never more
than one per page.

**Contextual / secondary surfaces** `[observed]`:

| Surface | Geometry | Example |
|---|---|---|
| Alerts popover | **~400 px**, right-aligned to the bell, header `Alerts` + filter + help, footer `No more alerts` (spans x 556→757 img px; §1.4's "~200 px" read image pixels as CSS pixels) | `.../12-notifications/alerts-popover-with-channel-issue.webp` |
| Right side panel (persistent) | ~352 px, pinned below the top bar, own `Title ✕` header; the content column narrows to make room | `.../01-home/home-guide-side-panel-in-progress.webp` |
| Right sheet (transient, over content) | **~406 px** (C12 — 203 img px measured), full height, own header + sticky `Cancel` / primary footer, primary disabled until valid | `.../05-online-store/navigation-add-menu-with-add-item-panel.webp` |
| Two-column templates panel | **~648 px** (C12 — 324 img px, ~42% of the viewport). A drawer that needs internal columns is sized to them | `.../04-customers/customer-segment-templates-panel.webp` |
| Centre modal | ~625 px, title + `✕`, body, `Cancel` + primary footer. Modals are **vertically centred**, not upper-third (§5.3 corrected) | `.../10-settings/settings-payments-setup-shopify-payments-modal.webp` |
| Bulk action bar | floating **white** rounded bar — white surface, light hairline border, soft shadow (C13; it is *not* dark-outlined) — anchored bottom-centre **of the table card**, appears with a `N selected` row under the tabs | `.../03-products/products-list-bulk-selection-action-bar.webp` |
| Toast | small dark rounded rectangle (~8 px radius, not a stadium — R15), bottom-centre **of the viewport**, with a `✕`. Measured centre x≈384 = viewport centre in every sample; the content region's centre is x≈448, so the toast sits ~64 img px left of it. §5.1 was right; this section was wrong (C9) | `.../10-settings/settings-store-details-saved-toast.webp`, `.../03-products/products-list-products-imported-toast.webp` |

**Channel / embedded-app context header** `[observed]`: pages belonging to a sales channel or an
embedded app get a slim context row **above** the page header, spanning the content region:
channel/app icon + name on the left, `↗` open-external and `⋯` overflow on the right — then the
normal page header below it. `.../05-online-store/blog-posts-list.webp`,
`.../06-marketing/email-app-overview-campaigns-table.webp`

**Rules**
- Global search MUST open as a popover anchored to the top-bar field, MUST be reachable via `⌘K` /
  `Ctrl K`, and MUST NOT relocate to the centre of the screen.
- Search scope MUST be a removable chip inside the input; scope MUST never be a separate dropdown
  outside the field.
- Result sections MUST be labelled with a count, and rows MUST be two lines: title + status badges,
  then muted metadata.
- The search panel MUST always end with an escape-hatch row (`Search for "<q>" in <scope>` or the
  scope's index page). An empty scoped state MUST show a centred prompt, never a bare "no results".
- Shortcut menus MUST display their keyboard shortcut on the row, right-aligned before any submenu
  chevron.
- The app MUST NOT use breadcrumbs. Hierarchy MUST be expressed by a single back arrow left of the
  page title; anything deeper than one level MUST become an overlay, sheet, or modal.
- Sibling pages MUST be nested sidebar items. Tabs MUST be used only for filtered views of a single
  dataset, MUST live inside the top of the table card, and MUST NOT appear in the page header.
- A tab row MUST carry the dataset's own controls (search, filter, view, sort) at its right end, and
  SHOULD offer a trailing `+` to save a new view.
- Entering search mode MUST replace the tab row in place and MUST offer `Cancel` plus a way to save
  the filter set as a view.
- Every index page SHOULD end with exactly one centred `Learn more about <topic>.` link beneath the
  last card. There MUST be at most one per page, and it MUST NOT appear on record-detail pages that
  already carry contextual help.
- Bulk selection MUST surface actions in a floating bar anchored to the bottom of the table card,
  not in the page header, and MUST show a `N selected` count.
- Transient creation flows SHOULD use a **~406 px** right sheet with a sticky `Cancel` + primary
  footer, widening to **~648 px** only when the panel needs internal columns (C12); destructive
  confirmations and short setup steps MUST use a ~625 px centre modal, vertically centred.
- Pages owned by a channel or an embedded app MUST carry a slim context row above the page header
  identifying the owner, with its external-open and overflow actions.

---

## 3. Data Display

How the Shopify admin presents records: the index table, the toolbar that filters it, the
bulk-selection layer on top of it, the badges that carry state, the cards that hold
everything, and the analytics/timeline surfaces that are not tables at all.

**Measurement note — R13, the single calibration.** The screenshots are 768 × 523 px
renders (bottom ~50 px is the Mobbin watermark strip; UI area 768 × ~473 px). The dark
global bar measures ~29–30 px in the images and ships at 56 px, so all image pixels below
are scaled by **≈1.90×** to give real values. §3's earlier ≈1.93×, §1's 1.875×, §2's
2×/1536 px and §4's 0.53× are all superseded by this one figure. Every number is therefore
**approximate** — treat them as "this size, ±2 px", not as tokens. **Px figures in §1–§5
are indicative, not binding.** Where an exact value matters, measure in a live admin.

**Frame of reference** (from `03-products/products-list-default.webp`, consistent across
every index screenshot read): left nav **~240 px** (R11 — the ~247 px this section used to
print is the same x≈129 boundary rounded at a slightly different scale, not a disagreement
about the product), content column ≈1167 px wide, and on two-column detail pages a main
column ≈645 px + right rail ≈295 px with a ≈21 px gutter.

---

### 3.1 The index table (resource list)

The index table is one **card**, not a bare `<table>`. The tab bar, the search/filter row,
the header row, the rows, and the bulk action bar all live inside the same rounded white
surface on the grey canvas. `[observed]`
`docs/06-design-reference/shopify-admin-web/03-products/products-list-default.webp`

**Anatomy, left to right**

| Element | Behaviour | Evidence |
|---|---|---|
| Selection checkbox | ~14 px box, ~16 px from the card's left edge; present in the header row and every body row | `03-products/products-list-default.webp` |
| Thumbnail | **Two shapes, by resource kind.** On product-shaped resources (products, inventory, timeline product previews) it is a **~40×40 px rounded square** — ≈23×20 img px. On **editorial** resources it is a **4:3 landscape tile, ~84×60 px** — ≈42×30 img px on the blog-posts index. Present only on resources that have media; missing media renders a grey placeholder tile with an image glyph | `03-products/products-list-default.webp` (Example Hat / Example Pants — square), `05-online-store/blog-posts-list.webp` (landscape tile) |
| Primary cell | The record's name, as a link. Semibold when the record's identity is a code or number (`#1002`, `FREESHIPPING10`), regular weight when it is a title (`Custom Notebook`) | `02-orders/orders-list-with-metrics-row.webp`, `09-discounts/discounts-list-with-code.webp` |
| Secondary line | Optional grey second line inside the primary cell, e.g. variant descriptor `Brown / A5 / Grid`, or the discount's rule summary `Free shipping on all products • For all countries • One use per customer` | `03-products/inventory-quantities-by-variant.webp`, `09-discounts/discounts-list-with-code.webp` |
| Inline row icons | Small glyphs after the primary link marking "has note" / "has comment" — two orders show one and two glyphs respectively | `02-orders/orders-list-with-metrics-row.webp` |
| Status cell | A badge (see §3.4) | `03-products/products-list-default.webp` |
| Data cells | Text, numbers, or inline links | as below |
| Row overflow | Some indexes end each row with a `…` kebab opening row actions (`Use segment / Duplicate / Export / Rename / Delete`) | `04-customers/customer-segments-row-actions-menu.webp` |

**Row height and density.** Rows with a 40 px thumbnail measure ≈52–56 px; text-only rows
measure ≈38–40 px. `[observed]` (products rows ≈28 px apart in-image; segments rows ≈20 px
apart). Rows carrying a two-line primary cell grow to fit rather than truncating the
second line. `[observed]` `09-discounts/discounts-list-with-code.webp`

**Header row.** Small, subdued, non-bold column labels on the card's surface — there is no
filled grey header band. `[observed]` `04-customers/customer-segments-list.webp`

**Sorting.** Exactly one header carries a small chevron indicating the active sort column
and direction — `Product ⌃` on products, `Date ⌄` on orders, `Last activity ⌄` on
segments. Other headers show no affordance in the resting state. `[observed]`
`03-products/products-list-default.webp`, `02-orders/orders-list-with-metrics-row.webp`,
`04-customers/customer-segments-list.webp`

**Alignment — and an honest inconsistency.** Currency and count columns are right-aligned
(header and value share a right edge) on orders (`Total` → `$20.00`), purchase orders
(`Total` → `$0.00`), discounts (`Used` → `0`) and products (`Markets` → `2`). `[observed]`
But the customers index left-aligns both `Orders → 2 orders` and `Amount spent → $19.00`.
`[observed]` `04-customers/customers-list-single-customer.webp`. Shopify itself is not
consistent here; Eyvar should pick right-alignment and apply it everywhere.

**Column visibility.** Two different controls exist. Wide indexes (orders, inventory) put a
**columns icon** in the icon cluster between the filter and sort icons. `[observed]`
`02-orders/orders-list-with-metrics-row.webp`, `03-products/inventory-quantities-by-variant.webp`.
The full-screen bulk editor instead uses an explicit labelled **`Columns`** button in its
top bar. `[observed]` `03-products/products-bulk-editor-grid.webp`. Which columns are
visible and in what order is per-view state. `[Polaris]`

**Horizontal overflow.** Wide tables clip at the card's right edge (`Tags` is cut off on
the orders index). `[observed]` for the clipping. That they **scroll horizontally**, and
that the checkbox + primary cell stay pinned while they do, are both `[Polaris]` — a static
frame cannot show a scroll.

**Editable tables.** When a table's job is data entry rather than navigation, cells become
controls in place: the variants matrix renders price/available/on-hand as text inputs with
a per-row `Edit` button, and inventory renders `Available` / `On hand` as steppered number
fields. The row structure is otherwise identical. `[observed]`
`03-products/product-edit-variants-matrix-table.webp`,
`03-products/inventory-quantities-by-variant.webp`

**Hover.** Not directly observable in static screenshots. `[Polaris]` Rows take a subtle
grey hover fill and the primary link underlines; the whole row is a click target for the
primary link.

**Below the table.** Every index page — full or empty — ends with a centred
`Learn more about {resource}` link **outside** the card. `[observed]` products, orders,
customers, discounts, segments, purchase orders, apps.

**Rules**

- Index tables MUST be rendered inside a single card that also contains the view tabs, the filter row, and the bulk action bar.
- The first data cell MUST be the record's identity and MUST be a link to the record's detail page.
- A thumbnail column MUST be present only for resources with media, and MUST render a placeholder tile rather than collapsing when media is absent.
- Numeric, currency, and count columns MUST be right-aligned, header and value sharing a right edge. Do not reproduce Shopify's customers-index exception.
- Text and date columns MUST be left-aligned.
- Exactly one header MUST show the active sort indicator; the rest MUST show no resting affordance.
- Row height SHOULD be ~40 px for text rows and ~52–56 px for rows with a thumbnail, and MUST be uniform within a table.
- A secondary descriptor line SHOULD be used instead of adding a column when the value only qualifies the primary one.
- Tables with more than ~6 columns MUST offer a column-visibility control and MUST scroll horizontally rather than shrink columns below legibility.
- Every index page SHOULD end with a `Learn more about {resource}` link outside the card.

---

### 3.2 The list-page toolbar: views, search, filters

The toolbar is a two-state control strip at the top of the index card.

**Resting state — the view tab bar.** `All | Active | Draft | Archived` then a `+` button,
left-aligned. The active tab sits in a subtle rounded grey fill. The right end of the same
row holds icon-only buttons: **search** (magnifier), **filter** (sliders), optionally
**columns**, and **sort**. `[observed]`
`03-products/products-list-default.webp`, `02-orders/orders-list-with-metrics-row.webp`

Tab sets are resource-specific and mirror the resource's lifecycle:
`All / Active / Draft / Archived` (products), `All / Unfulfilled / Unpaid / Open / Closed`
(orders), `All / Draft / Ordered / Partial / Received / Closed` (purchase orders),
`All / Active / Scheduled / Expired` (discounts). `[observed]`

**Saved views.** The `+` creates a view; a `Create view` tooltip sits above it.
`[observed]` for the tooltip's existence, wording and position;
`[inferred]` that **hover** is what triggers it — a static frame shows the tooltip, not the
gesture that summoned it. `03-products/products-list-draft-tab-create-view-tooltip.webp`. A saved view,
once **selected**, grows a chevron (`Draft ⌄`) which opens its own actions menu — unselected
tabs stay plain. `[observed]` same file. A saved view created from a filter set appears as a
new tab after the built-in ones (`All Active Draft Archived Custom`). `[observed]`
`03-products/products-list-bulk-selection-action-bar.webp`

**Create-view modal.** Title `Create new view`, an `✕` close at top right, a single `Name`
field with an inline `0/40` character counter right-aligned inside the field, and
`Cancel` + a primary `Create view` that is **disabled until the name is non-empty**. Modal
width ≈620 px. `[observed]` `03-products/products-list-create-view-modal.webp`

**Search state.** Clicking the magnifier **replaces the tab row** with a full-width search
field (magnifier prefix, placeholder `Searching all orders` / `Search customers`), and
places `Cancel` + `Save as` at its right end. The sort icon remains. A second row below
holds the filter chips. `[observed]`
`02-orders/orders-list-search-mode-add-filter.webp`, `03-products/products-list-search-and-filters.webp`

**Filter chips.** Each chip is a pill button with a trailing chevron
(`Product vendor ⌄`, `Tagged with ⌄`, `Status ⌄`). The final chip is `Add filter +`. When
anything is applied, a plain-text `Clear all` button appears at the end of the chip row.
`[observed]` `03-products/products-list-search-and-filters.webp`. With nothing applied only
`Add filter +` shows. `[observed]` `02-orders/orders-list-search-mode-add-filter.webp`

**Save as.** `Save as` is disabled while the query and filters are empty and becomes
enabled as soon as either is set — compare the greyed button in the orders screenshot with
the active one in the products screenshot. `[observed]` (same two files)

**Sort popover.** Anchored right under the sort icon, ≈200 px wide: a small `Sort by`
label, a **radio group** of sort fields (`Product title, Created, Updated, Inventory,
Product type, Vendor`), a divider, then two direction rows with arrow icons — `↑ A–Z` and
`↓ Z–A` — with the active direction highlighted. `[observed]`
`03-products/products-list-sort-popover.webp`

**A legacy pattern not to copy.** Blog posts use an older toolbar: a persistent search box
plus always-visible dropdown filter buttons, a `Saved` star, and a labelled `Sort` button.
`[observed]` `05-online-store/blog-posts-list.webp`. Two toolbars in one product is drift;
Eyvar should ship one.

**Rules**

- Every index page MUST use the same toolbar: view tabs + `+` on the left, icon buttons on the right.
- View tabs MUST reflect the resource's real lifecycle states, and `All` MUST always be first and default.
- Only the **selected** view tab MAY expose a chevron/actions menu.
- Activating search MUST replace the tab row in place, not push it down; `Cancel` MUST restore the previous view untouched.
- Applied filters MUST render as chips in a row directly beneath the search field, ending with `Add filter +`.
- A `Clear all` control MUST appear whenever at least one filter or query is active, and MUST NOT appear otherwise.
- `Save as` MUST be disabled until there is something to save.
- Sort MUST be a popover with field-as-radio-group plus a separate direction pair — never a mixed "Name A–Z / Name Z–A / Date new–old" flat list.
- The create-view modal MUST validate a non-empty name by disabling its primary button, not by showing an error after submit.
- One toolbar pattern MUST be used across the whole product; do not ship a second, older variant.

---

### 3.3 Bulk selection and bulk actions

**Entering selection.** Two end states are captured: a resting header row with column
labels, and a selection header where the header checkbox is checked/indeterminate and the
column labels are replaced by the count `3 selected`, left-aligned next to the checkbox.
Column headers are absent entirely while selection is active. Both end states are
`[observed]` (`03-products/products-list-default.webp`,
`03-products/products-list-bulk-selection-action-bar.webp`); that **ticking a checkbox is
what converts** one into the other is `[inferred]` — the causation is read across two
independent screenshots, not seen.

**Floating action bar.** A white rounded bar — white surface, **light hairline border**, soft
shadow, ~8 px radius (not a stadium; R15) — floats **inside the
card**, horizontally centred, pinned near the bottom of the row area. Height ≈46 px. It
holds up to ~3 labelled secondary buttons — `Bulk edit`, `Set as active`, `Set as draft` —
followed by a `…` overflow button. `[observed]` same file.

**Overflow menu.** A popover listing every remaining bulk action, **grouped by divider**:

```
Archive products
Delete products
─────────────────────────
Include in sales channels
Exclude from sales channels
─────────────────────────
Include in markets
Exclude from markets
─────────────────────────
Add tags
Remove tags
─────────────────────────
Add to collection(s)
Remove from collection(s)
```

`[observed]` `03-products/products-list-bulk-more-actions-menu.webp`. Notably
`Delete products` is **not** rendered in red inside the menu — the destructive weight is
carried by the confirmation dialog, not the menu item. `[observed]`

**Destructive confirmation.** A centred modal, ~620 px wide, that names the **verb and the
count** in its title and explains the consequence in one short paragraph:

> **Archive 3 products?**
> Archiving products will hide them from your sales channels and Shopify admin. You'll
> find them using the status filter in your product list.
> `Cancel` · **`Archive products`**

`[observed]` `03-products/products-list-archive-confirm-modal.webp`. Archive uses the
normal dark primary button. True deletion escalates to a **red** primary: `Delete segment`
in `Delete Email subscribers?`. `[observed]`
`04-customers/customer-segment-delete-confirm-modal.webp`

**Bulk edit.** `Bulk edit` navigates away to a full-screen spreadsheet grid with its own
top bar (`‹ Back`, `Editing 3 products`, an `Unsaved changes` badge, `Columns`, `Save`),
frozen-looking column headers, and in-cell editors (tag chips with `✕`, status selects that
render the value in its badge colour, sub-rows for variants). `[observed]`
`03-products/products-bulk-editor-grid.webp`, `03-products/products-bulk-editor-status-dropdown.webp`

**Rules**

- Selecting rows MUST replace the header row with an `N selected` count, not overlay a banner above the table.
- The bulk action bar MUST float inside the table card, centred, and MUST NOT push content or cover the last row's controls.
- At most 3 bulk actions MAY be surfaced as labelled buttons; the rest MUST go into a `…` overflow.
- Overflow bulk actions MUST be grouped by divider into add/remove or scope pairs.
- Destructive items in the overflow MUST NOT be coloured red; the confirmation carries the weight.
- Every destructive or irreversible bulk action MUST confirm with a modal whose **title states the verb and the count** and whose body states the consequence in one sentence.
- Recoverable destructive actions (archive, cancel) SHOULD use the normal primary button; unrecoverable ones (delete, erase) MUST use a red/critical primary.
- The confirm modal's primary button label MUST repeat the verb (`Archive products`, `Delete segment`) — never `OK` or `Confirm`.
- Leaving selection (deselect all, `Cancel`) MUST restore the column headers and clear the bar.

---

### 3.4 Status communication — the badge family

Badges are small **rounded rectangles at ~8 px radius — flat sides, not stadium pills**
(R15; zoomed, the corner radius runs ~3–4 img px on an 11 img px badge, where a true
stadium would need 5.5). Label ~10–11 px semibold, ~2 px vertical / ~8 px horizontal
padding, tinted background + darker text of the same hue. §1.4 was right and this section's
earlier "fully rounded ends" was wrong.

Order and payment badges carry a **leading marker**, and which marker depends on where the
badge sits: **list-row and page-title badges take a status dot** whose fill indicates
progress — solid `●` for a settled state, half-filled `◐` for in-progress — while
**fulfilment card-header badges take a 16 px glyph** instead (a package on `Unfulfilled`, a
delivery truck on the green `Fulfilled (1)`). `[observed]`
`02-orders/order-detail-paid-fulfilled-gift-card.webp`,
`02-orders/orders-list-with-metrics-row.webp`,
`02-orders/order-fulfill-item-page.webp`

#### Tone mapping

| Meaning | Tone | Example labels observed | Evidence |
|---|---|---|---|
| Live / complete / money settled | **success** — light green fill, dark green text | `Active`, `Paid`, `Fulfilled` | `03-products/products-list-default.webp`, `10-settings/settings-billing-history.webp`, `09-discounts/discounts-list-with-code.webp`, `02-orders/order-detail-paid-fulfilled-gift-card.webp` (green `Fulfilled (1)`) |
| Needs attention / in progress / blocking money or fulfilment | **warning** — light amber fill, dark amber text, `◐` dot. Shopify ships **two** fills here — `Payment pending` peach `#F4D6B1`, `Unfulfilled` yellow `#F6EA98`, visible side by side in one row — and Eyvar collapses them to the single warning tone required by R7 | `Unfulfilled`, `Payment pending`, `Sending`, `Action needed` | `02-orders/orders-list-with-metrics-row.webp`, `06-marketing/email-app-overview-campaigns-table.webp`, `11-apps-and-channels/apps-and-sales-channels-installed-list.webp` |
| Not-yet-live, ended, or otherwise inert | **neutral / subdued** — light grey fill, dark grey text | `Archived`, `Closed` | `03-products/products-list-default.webp`, `03-products/purchase-orders-list.webp` |
| Not yet published / withheld from the storefront | **info** — pale blue fill `#DCE8F1`, blue text | `Draft`, `Hidden` | `03-products/products-list-default.webp` (the `Draft` badge samples `#DCE8F1` against `Archived` at `#F0F0F0`), `04-customers/customer-segment-templates-panel.webp` (`New segment  Draft`), `05-online-store/blog-posts-list.webp` (`Hidden`) |
| Terminal factual outcome (no action left) | **neutral + solid dot** | `Refunded`, `Voided` | `02-orders/order-detail-refunded-with-toast.webp`, `02-orders/orders-list-search-mode-add-filter.webp` |
| New / promotional marker on a section | **neutral** | `New` | `06-marketing/marketing-automations-overview.webp` |
| Critical / failure | **critical** — red | **Not observed as a badge** in any screenshot read; red appears only on destructive primary buttons | `04-customers/customer-segment-delete-confirm-modal.webp` |
| Informational | **info** — blue | Not observed | — `[Polaris]` |

`Fulfilled (1)` on the order-detail fulfilment card shows badges can carry a count in
parentheses. `[observed]` `02-orders/order-detail-unfulfilled-payment-pending.webp`
(`Unfulfilled (1)`).

**Where Shopify ships two tones for one label — and what Eyvar does.** `Paid` renders green
in `10-settings/settings-billing-history.webp` and grey in
`02-orders/order-detail-paid-fulfilled-gift-card.webp` and
`14-global-search/search-modal-order-results-list.webp`. `Fulfilled` renders green with a
truck glyph on the fulfilment card header and grey with a dot in the page title row of the
*same* screen. Both splits are real; neither is deleted here. **R14 rules that Eyvar's
`Paid` is the success (green) tone**, and `Fulfilled` follows it for the same reason. The
"one label, one tone" rule below therefore binds Eyvar, not Shopify — Shopify breaks it and
this document no longer pretends otherwise.

#### Badge vs. plain text

This is the sharpest rule in the whole section, and Shopify holds it consistently.

**Badge** when the value is a *lifecycle state of the record* that the user can change or
must act on: `Active / Draft / Archived`, `Paid / Payment pending / Refunded / Voided`,
`Fulfilled / Unfulfilled`, `Sending`, `Action needed`. `[observed]` across products,
orders, email campaigns, apps.

**Plain text** when the value is *derived, computed, or descriptive*: `Not subscribed`
(customers → Email subscription), `Inventory not tracked` and `No SKU` (products,
inventory), `3 of 3` received (purchase orders), `Created on Jan 8, 2024` (segments),
`Discount is not active yet` (discount summary → Performance). `[observed]`
`04-customers/customers-list-single-customer.webp`,
`03-products/inventory-quantities-by-variant.webp`,
`03-products/purchase-orders-list.webp`,
`09-discounts/discount-create-shipping-with-code.webp`

**Link** when the value is a number the user will want to drill into. Note the products
index is **not** an example of this: `0 in stock` / `5 in stock for 24 variants` sample
**red-brown** (`#825F62` / `#76584D`) — a low-stock critical tone, not a blue link — with the
qualifier ("for 24 variants") in subdued grey. `[observed]`
`03-products/products-list-default.webp`. Genuine link-styled table values are the customer
email address on a customer row and the blue product title in a picked-resource row.
`[observed]` `04-customers/customers-list-single-customer.webp`,
`02-orders/order-fulfill-item-page.webp`

**Not a badge:** graded risk. Fraud analysis renders `Low / Medium / High` as a
three-segment coloured bar with the active label emphasised — a scale, not a state.
`[observed]` `02-orders/order-detail-timeline-full-history.webp`

**Placement.** On a detail page, badges sit **inline to the right of the page title**,
before the subtitle line (`#1003  ● Paid  ● Fulfilled  Archived`). Multiple badges are
allowed and read left to right in importance order. `[observed]`
`02-orders/order-detail-paid-fulfilled-gift-card.webp`,
`03-products/product-detail-created-success-banner.webp` (`Custom Notebook  Active`)

**Rules**

- The badge palette MUST be closed: success, warning, neutral, critical, info. New tones MUST NOT be invented per feature.
  **→ Superseded by R7: the closed set is success, warning, info, neutral, new — five tones, no critical. Row-level critical in a work queue is §8.4's documented exception.**
- A value MUST be a badge only if it is a lifecycle state the user can act on or change.
- Derived, computed, or descriptive values MUST be plain text — never a badge.
- Numeric values that lead somewhere (order count, spend) SHOULD be inline links, not badges. Numeric values that carry a *risk* reading — a low stock count — SHOULD take the critical text tone instead, as Shopify's products index does.
- Every status MUST map to exactly one tone product-wide; the same label MUST NOT change tone between screens. **This binds Eyvar, not Shopify** — Shopify ships `Paid` and `Fulfilled` in two tones each. R14 settles both on **success**.
- Warning tone MUST be reserved for states that block money or fulfilment, or that require the user to act, and MUST be a **single** tone (R7) — do not reproduce Shopify's peach/yellow split.
- `Archived` MUST be neutral, not warning — it is inert, not urgent. **`Draft` MUST be the info tone, not neutral**: it samples pale blue `#DCE8F1` with blue text in `products-list-default.webp`, against `Archived` at `#F0F0F0` grey. §1.1.5 had this right; this section did not.
- Badges MUST NOT rely on colour alone; the label MUST be sufficient, and the status dot MUST be decorative only.
- Detail pages MUST place status badges inline after the page title.
- Badges MUST NOT be interactive. If a status is editable, use a select (as the bulk editor does) or a card action.

---

### 3.5 Cards, sections, and summary panels

**The card is the unit of content.** White surface, **~12 px radius** (C3 — edge-scanning the
card corner in `09-discounts/discounts-empty-state.webp` gives a curve running ~6 img px
⇒ ~12 CSS px; §1.4 was right and the ~8 px printed here was wrong), hairline border plus a
very light shadow, ~16 px internal padding, sitting on the grey page canvas. Nothing on a
content page floats free of a card except page-level headings (`Timeline`, `Variants`,
`Finances breakdown`) and the trailing `Learn more` link. `[observed]` throughout.

**Card header.** Title at top left, semibold, ~13–14 px. Header actions sit on the same
baseline at the right edge and are one of: a text link (`Edit` on Search engine listing),
an icon button (pencil on `Notes`, `Tags`, `Shipping address`; a `⋮` kebab on `Publishing`;
a `⋯` on Customer), or a small dropdown (`Sales channels ⌄` on Earnings). `[observed]`
`03-products/product-edit-seo-listing-and-empty-variants.webp`,
`02-orders/order-detail-paid-fulfilled-gift-card.webp`,
`08-finances/finances-overview-earnings-donut-and-payouts.webp`

**Sectioned cards.** One card can hold several stacked sections separated by **full-bleed
1 px dividers** that run edge to edge, not inset. The order summary card is the canonical
case: line items → divider → subtotal/discount/shipping/total → divider → paid-by-customer
+ actions. `[observed]` `02-orders/order-detail-unfulfilled-payment-pending.webp`

**Key-value rows.** Three-column pattern inside a section: label left, an optional grey
qualifier in the middle (`1 item`, `New customer`, `Free shipping (0.0 lb)`), and the value
**right-aligned**. The `Total` row bolds both label and value. `[observed]` same file.
Refunded orders extend the same pattern with `Refunded  Reason: —  -$10.00` and a bold
`Net payment`. `[observed]` `02-orders/order-detail-refunded-with-toast.webp`

**Definition-list summary panels (right rail).** The rail stacks small cards, each a
title plus label/value pairs with no dividers between pairs — `Contact information`,
`Shipping address`, `Billing address`, `Conversion summary`, `Fraud analysis`, `Tags`,
`Notes`. Empty pairs still render, with a grey placeholder sentence
(`No email provided`, `No phone number`, `No notes from customer`). `[observed]`
`02-orders/order-detail-paid-fulfilled-gift-card.webp`,
`04-customers/customer-detail-no-orders-yet.webp`

**The bulleted Summary variant.** Create/edit flows put a sticky `Summary` card in the
rail: the record's name, then sub-headings (`Type and method`, `Details`, `Performance`)
each followed by a short bulleted list of the configuration so far. `[observed]`
`09-discounts/discount-create-shipping-with-code.webp`

**The insights / metrics row at the top of list pages.** Two shapes observed:

1. **One card, N columns, internal vertical dividers.** Orders puts a `Today` date chip in
   the first column, then **6 visible metric columns, the last one clipped at the card's
   right edge** — Total orders, Ordered items over time, Returns, Fulfilled orders over
   time, Delivered orders over time, and a sixth (Time to…) cut off. There is no seventh.
   Each full column carries a label, a big value and an em-dash delta; **only some carry a
   sparkline** — the clipped column shows none, so "each … and a tiny sparkline" was
   over-general. `[observed]` `02-orders/orders-list-with-metrics-row.webp`
2. **One card, 3 equal columns.** Products shows `Products by sell-through rate` (with a
   `0% —` value) and two analysis columns that carry only the message
   `There was no data found for this date range`. `[observed]`
   `03-products/products-list-default.webp`

Either way it is a **single card above the index card**, never a row of separate cards.
The marketing Automations page and the Email app use the same idea as a plain 4-up metric
strip. `[observed]` `06-marketing/marketing-automations-overview.webp`,
`06-marketing/email-app-overview-campaigns-table.webp`

**Cards containing tables.** When a card holds a table, the table runs full-bleed to the
card edges; card padding applies to the title only. `[observed]`
`06-marketing/email-app-overview-campaigns-table.webp`

**Rules**

- All page content MUST live in a card. Only section headings and the trailing `Learn more` link may sit on the bare canvas.
- A card MUST have exactly one title and at most one header action; extra actions MUST collapse into a `⋮` / `⋯` menu.
- Sections within a card MUST be separated by full-bleed 1 px dividers, never by extra whitespace alone.
- Key-value rows MUST right-align values and left-align labels; totals MUST be bold on both sides.
- Optional qualifying text SHOULD sit between the label and the value in subdued type rather than in parentheses.
- Empty fields in a summary panel MUST render an explicit grey placeholder sentence, never be omitted or left blank.
- Right-rail summary cards MUST be read-only displays with an edit affordance, not inline forms.
- Create/edit flows longer than one card SHOULD carry a rail `Summary` card that mirrors the current configuration.
- The metrics/insights strip MUST be one card with internal dividers, MUST sit above the index card, and MUST NOT exceed one row.
- Tables inside cards MUST run full-bleed to the card edges.

---

### 3.6 Empty states

**Whole-page empty state.** The index card is retained but its entire body is a centred
block:

1. Illustration, **~170×190 px** (≈85×95 img px on `discounts-empty-state`; the width was
   right, the ~155 px height was ~23% low — read it as "~170 px wide" if only one number is
   wanted), muted brand palette, sitting on a pale circular/blob ground.
2. Heading, semibold ~15 px, sentence case, no period — and it is a **value proposition,
   not a negation**: `Everything customers-related in one place`,
   `Manage discounts and promotions`.
3. One or two lines of explanation, centred, constrained to ~380 px.
4. An action row: primary alone (`Create discount`) or secondary + primary
   (`Import customers` · `Add customer`).
5. Outside the card, the usual centred `Learn more about {resource}` link.

`[observed]` `04-customers/customers-empty-state.webp`,
`09-discounts/discounts-empty-state.webp`

Note that page-level actions in the header are **disabled but still visible** in the empty
state — `Export` is greyed on the empty discounts page. `[observed]`
`09-discounts/discounts-empty-state.webp`

**Empty card / section.** No illustration, no heading — just one grey sentence in the card
body: `There are no charges on your upcoming bill`, `There are no credits on your account
right now`, `Insights will display when the product has had recent sales`,
`This customer doesn't have notes`, `No exemptions`, `No notes from customer`. `[observed]`
`10-settings/settings-billing-overview-bills-and-credits.webp`,
`03-products/product-detail-created-success-banner.webp`,
`04-customers/customer-detail-no-orders-yet.webp`

**The middle case.** A card whose emptiness is itself the story gets a heading, a sentence,
a single secondary button, and a small decorative illustration right-aligned *inside* the
card: `Last order placed` / `This customer hasn't placed any orders yet` / `Create order`.
`[observed]` `04-customers/customer-detail-no-orders-yet.webp`

**Filtered-to-zero.** Not directly captured in the screenshots read. `[Polaris]` A search
or filter that returns nothing shows a no-illustration message with a "clear filters"
affordance — it MUST NOT show the first-run illustrated empty state, because the resource
is not actually empty.

**Empty data inside a chart.** See §3.7 — a centred grey sentence, no illustration.

**Rules**

- A resource with zero records MUST show the illustrated whole-page empty state, inside the index card.
- The empty-state heading MUST describe the value of the feature, not the absence of data. Never `No customers found` as a first-run heading.
- The explanation MUST be one sentence, at most two lines, and MUST NOT exceed ~380 px measure.
- The empty state MUST offer the primary creation action, and MAY offer one secondary import/alternative path.
- Page header actions that cannot work with zero records MUST be disabled and visible, not hidden.
- An empty **card or section** MUST NOT use an illustration or heading — one grey sentence only.
- ~~An empty section whose emptiness is meaningful (no orders, no activity) MAY add a single secondary action and a small inline illustration.~~
  **→ Void under R8. "Emptiness is meaningful" was untestable and contradicted the MUST NOT one line above. An empty card or section gets one grey sentence plus, where an action exists, one plain-button action — never an illustration.**
- A filtered/searched result of zero MUST be visually distinct from a first-run empty state and MUST offer a way to clear the filters.
- Empty-state copy MUST be sentence case with no exclamation marks.

---

### 3.7 Analytics display

**Grid.** A 3-column grid of equal-height metric cards with a **~19–20 px gutter**, filling
the content width. Card edges measure 142→338, 350→546 and 557→753 img px, so the gaps are
11 and 10 img px ⇒ ~19–21 CSS px. Both the ~12 px printed here and §1.3's ~16 px were low
(C10). `[observed]` `07-analytics/analytics-dashboard-today-no-data.webp`

**Metric tile anatomy** (top to bottom): card title small and semibold at top left; a small
**report icon** at top right that jumps to the full report; the value in large bold
(~24–28 px) with the **delta immediately to its right**; the chart; then the legend.
`[observed]` same file.

**Delta.** Rendered as an em-dash `—` when there is no meaningful comparison, and as a
coloured caret + percentage when there is (`▲100%` in green on Average order value).
`[observed]` `07-analytics/analytics-dashboard-today-no-data.webp`

**Legend.** Bottom-right of the card, two chips: a **solid** line swatch + the current
period (`Jan 2–Jan 8, 2024`) and a **dotted** line swatch + the comparison period
(`Dec 26, 2023–Jan 1, 2024`). `[observed]`
`07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`

**Chart style.** Single-hue blue line, thin, with a very pale area fill beneath it; the
comparison series is the same hue dotted; y-axis labels left with `$` formatting carried
into the axis; x-axis date labels along the bottom; no gridlines beyond the axis baseline.
`[observed]` same file.

**Non-line tiles.** The single-large-centred-value-with-the-category-name-above shape is
real, but the file previously cited for it does not show it: in
`07-analytics/analytics-dashboard-today-no-data.webp`, `Sales by channel` shows **only**
"There was no data found for this date range." — no value, no category name. The shape
appears instead on **`07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`**
("Draft Orders" over "$34.00"), which is the correct citation. Breakdown tiles
(`Online store conversion rate`) render a headline
value plus stacked funnel rows — label + grey sub-label (`Added to cart` / `0 sessions`) on
the left, percentage right-aligned, delta far right. Live View uses horizontal bar rows
(`Singapore • Singapore ▬▬▬ 4`). `[observed]`
`07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`,
`07-analytics/analytics-dashboard-today-no-data.webp`, `07-analytics/analytics-live-view-globe-map.webp`

**No-data messaging.** A single centred grey sentence occupying the chart area:
**`There was no data found for this date range.`** The card title, report icon, and card
frame all remain. `[observed]` `07-analytics/analytics-dashboard-today-no-data.webp`,
`07-analytics/analytics-customize-metrics-library-sidebar.webp`. Minor inconsistency worth
avoiding: the products index strip uses the same sentence **without** the trailing period.
`[observed]` `03-products/products-list-default.webp`

**Date range + compare control.** Two chip buttons at the top left of the dashboard: a
calendar-icon chip with the range (`Today`, `Last 7 days`) and a second chip
`Compare: Yesterday` / `Compare: Previous period`. Opening the first gives a popover with:
a left column of presets (`Today, Yesterday, Last 7 days, Last 30 days, Last 90 days,
Last 365 days, Last month, Last 12 months, Last year`) with a ✓ on the active one; a right
pane with two date inputs joined by an `→` arrow above two side-by-side month calendars
(previous + current), each with `‹ ›` navigation and out-of-range days greyed; and
`Cancel` + `Apply`, with `Apply` disabled until the selection changes. `[observed]`
`07-analytics/analytics-date-range-picker-calendar.webp`

**Dashboard chrome.** `Fullscreen` sits at the top right of the page header. An
`Auto-refresh` checkbox and a `Customize` button sit at the right of the filter row —
`Customize` carries a small dot indicator. `[observed]`
`07-analytics/analytics-dashboard-today-no-data.webp`

**Customize mode.** Entering it swaps the global bar for a contextual save bar
(`⚠ Unsaved changes` · `Cancel` · `Save`), opens a left **Metrics library** sidebar, and
puts every card into edit affordance. `[observed]`
`07-analytics/analytics-customize-metrics-library-sidebar.webp`

- The sidebar is grouped by category — `Sales`, `Acquisition`, `Orders`, `Finances`,
  `Behavior` — with a category label above each list and one leading icon per metric that
  encodes its chart type (line / bar / table). A refresh-style icon sits in the sidebar
  header. `[observed]`
- Each canvas card gains a **⠿ drag handle** to the left of its title and an **ⓧ remove**
  button at top right. `[observed]`
- While dragging, the lifted card gets a shadow and slight scale, every other card fades to
  a low-opacity grey, and the target slot shows a plain grey placeholder. `[observed]`
  `07-analytics/analytics-customize-dragging-metric-card.webp`
- Saving confirms with a toast: `Dashboard saved`. `[observed]`
  `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`

**Other metric shapes seen elsewhere.** Finances uses 3 wide tiles with a sparkline in the
lower-right corner of each, plus a donut chart card whose legend is a right-side list of
`label … value ›` rows. Home embeds a chart card whose header is a row of selectable
metric tabs (`Online store sessions`, `Total sales`, `Total orders`, `Conversion rate`),
the active one boxed. `[observed]`
`08-finances/finances-overview-earnings-donut-and-payouts.webp`,
`01-home/home-sales-chart-and-things-to-do-next.webp`

**Rules**

- Metric tiles MUST follow one anatomy: title, report link, value, delta, chart, legend — in that order.
- Every metric with a comparison period MUST show a delta; when no comparison is possible the delta MUST be an em-dash, never `0%` and never blank.
- Deltas MUST be colour-coded *and* carry a direction caret; colour alone is insufficient.
- Comparison series MUST be dotted/dashed and MUST use the same hue as the primary series, never a second colour.
- Every chart card MUST carry a legend naming both periods explicitly with dates.
- A chart with no data MUST keep its card, title, and report link, and MUST show one centred sentence — never an empty plot or a spinner.
- No-data copy MUST be identical everywhere, punctuation included.
- The date-range control MUST be a chip showing the current range, and the compare control MUST be a separate adjacent chip.
- The range popover MUST offer presets *and* explicit start/end inputs *and* two visible months, and MUST require an explicit `Apply`.
- Dashboard customisation MUST be a distinct mode with a contextual save bar; layout changes MUST NOT auto-save.
- In customise mode every card MUST expose a drag handle and a remove control, and the drop target MUST be shown as a placeholder.

---

### 3.8 Timelines and activity feeds

Order and customer detail pages share one timeline component. `[observed]`
`02-orders/order-detail-timeline-full-history.webp`,
`04-customers/customer-detail-no-orders-yet.webp`

**Heading.** `Timeline` is an h2 on the bare canvas above the composer card — not a card
title. `[observed]`

**Composer.** A card containing: a **~30 px rounded-square avatar (~8 px radius), never a
circle** (R15; §1.4 and §1.5 were right on shape, this section was right on size). The `JS`
composer avatar is a **saturated pink** tile with **white** initials — not the pale tint +
dark text §1.5 originally described. Then a
borderless growing textarea (`Leave a comment...`), and below it a toolbar row of icon-only
buttons — emoji, `@` mention, `#`, and a link/attach glyph — with a `Post` button
right-aligned and **disabled until there is content**. `[observed]`
`02-orders/order-detail-timeline-comment-composer.webp`

Immediately **below and outside** the composer card, right-aligned grey helper text:
`Only you and other staff can see comments`. `[observed]` same file.

**Attachment upload.** The pending attachment renders as a chip *inside* the composer,
above the toolbar: a leading tile (a spinner while uploading, a file icon once done), the
filename, the size (`2.04 kB`), and an `✕` to cancel. `[observed]`
`02-orders/order-detail-timeline-uploading-attachment.webp`

**Feed.** Below the composer, a left-aligned date group heading (`Today`), then entries
strung on a vertical rail with a small dot marker per entry. `[observed]`

**Event entry.** One sentence in normal body text at the left, a right-aligned relative
timestamp. Entries with more detail end in a `›` chevron
(`You added payment terms to this order. ›`). Some carry a secondary button on the line
below (`View email`). `[observed]` `02-orders/order-detail-timeline-full-history.webp`

**Comment entry.** Rendered as a card, not a bare line:

- Author name in semibold + timestamp (`John Smith  9:51 PM`), with `⋯` / `✕` at the right.
- Body text with **mention chips** — `John Smith`, `#1001` — as inline grey pills.
- An embedded **resource preview**: a bordered inset with a leading icon, a title line
  (`Order #1001 Jan 8, 2024 PM • $19.00`), a short bulleted fact list
  (`Placed by Jane Doe`, `1 item: Custom Notebook` — both linked), and the record's status
  badges (`● Paid  ● Fulfilled`, or `◐ Payment pending  ◐ Unfulfilled`).
- A **file attachment chip** beneath: file icon, filename, a small `CSV` format tag, size.

`[observed]` `02-orders/order-detail-timeline-comment-with-attachment.webp`,
`02-orders/order-detail-timeline-full-history.webp`

**Timestamps.** The same feed mixes relative (`Just now`, `1 minute ago`, `2 minutes ago`)
and absolute (`9:48 PM`, `9:51 PM`) forms — recent entries relative, older entries within
the day absolute. `[observed]` (compare the two files above, which show the same events at
`1 minute ago` and `2 minutes ago`). The crossover threshold is not determinable from the
screenshots. `[Polaris]`

**Empty timeline.** A newly created record shows the composer plus one system entry
(`You created this customer.` · `Just now`). There is no illustrated empty state for a
timeline. `[observed]` `04-customers/customer-detail-no-orders-yet.webp`

**Rules**

- The timeline MUST place the composer above the feed, newest entries first, grouped by day.
- The composer MUST disable `Post` until there is content, and MUST show the staff-visibility notice below it.
- System events MUST be single sentences in past tense with a subject (`You added…`, `Order confirmation email was sent to…`), ending in a period.
- Each entry MUST carry a timestamp, right-aligned, relative for recent entries and absolute for older ones — the rule MUST be consistent product-wide.
- Events with expandable detail MUST use a trailing chevron; events with a follow-up action MUST use a secondary button on its own line.
- User comments MUST be visually distinct from system events (card treatment, author, avatar).
- Mentions and record references inside comments MUST render as inline chips linked to the record.
- Attachments MUST show filename, format, and size, MUST show upload progress in the composer, and MUST be cancellable before posting.
- Embedded record previews SHOULD reuse the same status badges as the record's own page — never re-word them.
- Timelines MUST NOT use an illustrated empty state; the creation event is the floor.

---

### 3.9 Reference wireframe — index page

Toolbar plus table, as assembled from `03-products/products-list-default.webp`,
`03-products/products-list-search-and-filters.webp`, and
`03-products/products-list-bulk-selection-action-bar.webp`.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Products                                    [Export] [Import] [More actions ⌄]  │   page header
│                                                              [ Add product ]     │   (primary = filled)
└─────────────────────────────────────────────────────────────────────────────────┘

┌─── insights card (1 card, N cols, internal │ dividers) ─────────────────────────┐
│ Products by sell-through   │ Products by days of      │ ABC product analysis     │
│ 0%  —                      │ inventory remaining      │ There was no data found  │
│                            │ There was no data found  │ for this date range      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─── index card ──────────────────────────────────────────────────────────────────┐
│ [All][Active][Draft][Archived][+]                        (🔍) (▤ filter) (⇅ sort)│  ← resting
│ ─────────────────────────────────────────────────────────────────────────────── │
│  ~~~ search state replaces the row above ~~~                                    │
│ (🔍) custom                                       [Cancel] [Save as]     (⇅)    │
│ [Product vendor ⌄][Tagged with ⌄][Status ⌄][Add filter +]        Clear all      │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ ☐ │     │ Product ⌃         │ Status  │ Inventory        │ Channels │ Vendor    │  header ~32px
│ ─────────────────────────────────────────────────────────────────────────────── │
│ ☐ │[img]│ Custom Notebook   │(Active) │ 5 in stock ↗     │        3 │ My Store  │  row ~54px
│ ☐ │[img]│ Copy of Notebook  │(Draft)  │ 0 in stock ↗     │        3 │ My Store  │
│ ☑ │[img]│ Example Hat       │(Archivd)│ Not tracked      │        2 │ JS Mob    │
│ ☑ │[img]│ Example Pants     │(Draft)  │ Not tracked      │        2 │ JS Mob    │
│                                                                                 │
│                  ╭──────────────────────────────────────────╮                   │  floating bulk bar
│                  │ [Bulk edit][Set as active][Set as draft] [⋯]│                 │  WHITE surface,
│                  ╰──────────────────────────────────────────╯                   │  hairline + shadow,
│                                                                                 │  centred, ~46px
└─────────────────────────────────────────────────────────────────────────────────┘
                          Learn more about products                                  ← outside the card

  ── on selection, the header row becomes: ──
│ ☑ │ 3 selected                                                                  │  column labels hidden

  ── alignment ──
  ☐ ▸ 16px from card edge        text/dates ▸ left        numbers/money ▸ right
  thumbnail ▸ 40×40 (square, product-shaped resources) / 4:3 landscape tile (editorial)
  badge ▸ status col             links ▸ drill-down values   low stock ▸ critical text, not a link
```

**Rules**

- New index pages MUST be built from this wireframe; element order MUST NOT be rearranged per feature.
- The insights strip, the index card, and the `Learn more` link MUST appear in this vertical order when present.
- The page header's primary action MUST be the only filled button on the page.
- The bulk action bar MUST float over the rows, centred, inside the card — never docked to the viewport bottom.

---

## 4. Forms, Inputs & Actions

Source: 44 screenshots read from `docs/06-design-reference/shopify-admin-web/`. Every claim is tagged
`[observed]` (visible in a screenshot cited on the line) or `[Polaris]` (design-system recollection,
**not** verifiable from these screenshots — treat as a default to confirm, not a fact).

All pixel figures are **approximate**. **R13, the single calibration:** the screenshots are
768 × 523 px captures (bottom ~50 px is the Mobbin watermark strip; UI area 768 × ~473 px) and the
measured scale is **≈1.90×** — a 56 px top bar sits at y≈29–30, the nav boundary at x≈129. This
section's earlier "~0.53×" phrasing, §1's 1.875×, §2's 2×/1536 px and §3's 1.93× are all superseded by
this one figure. Treat every number as ±2 px and as a *ratio guide*, not a spec. **Px figures in
§1–§5 are indicative, not binding.**

---

### 4.1 Form page architecture

**The two page-level form layouts.** The admin uses exactly two, and never mixes them on one page.

**A. Resource editor — main column + sidebar (2/3 + 1/3).**
The editable body sits in a wide left column of stacked cards; a narrower right column holds
metadata, status and live summaries. `[observed]`
`docs/06-design-reference/shopify-admin-web/03-products/product-add-new-blank-form.webp` — left column
(Title, Description, Media, Pricing) ~620 px wide, right column (Status, Publishing, Product
organization) ~300 px, gutter ~20 px, total content ~950 px centred with the sidebar nav to the left.
Same layout in
`docs/06-design-reference/shopify-admin-web/09-discounts/discount-create-shipping-empty.webp` (form
cards left; "Summary" + "Sales channels" right) and
`docs/06-design-reference/shopify-admin-web/02-orders/draft-order-create-order-page.webp` (Products +
Payment left; Notes, Customer, Shipping address, Market, Tags right).

**B. Settings form — description column + field column.**
A left column of ~1/3 width carries only a bold section title and one line of grey explanatory prose;
the right ~2/3 column is a single card containing that section's fields. `[observed]`
`docs/06-design-reference/shopify-admin-web/04-customers/customer-new-form-empty.webp` — "Customer
overview" (title only), "Address" + "The primary address of this customer", each paired with a card
of fields; `docs/06-design-reference/shopify-admin-web/04-customers/customer-new-form-address-tax-notes.webp`
adds "Tax exemptions" and "Notes / Notes are private and won't be shared with the customer.";
`docs/06-design-reference/shopify-admin-web/15-account/account-general-unsaved-changes.webp` — "Details",
"Login service / Connect an external login service to quickly and securely access your Shopify account."
The description column is left-aligned to the card's top edge and does **not** scroll independently.

**Card-per-concern.** Each card = one concern, with a bold ~14 px title at the top-left and ~16 px
internal padding, **~12 px corner radius** (C3 — edge-scanned at ~6 img px of curve; the "~8–12 px"
range printed here was loose and §3.5's flat ~8 px was wrong), 1 px hairline border, white on a light grey page
background. `[observed]` `.../03-products/product-edit-pricing-inventory-shipping.webp` shows three
consecutive cards titled Pricing, Inventory, Shipping; gap between cards ~16–24 px. Some cards carry
a secondary right-aligned item on the title row: a muted label
(`.../09-discounts/discount-create-shipping-empty.webp` → "Shipping discount"), a link
(`.../02-orders/draft-order-create-order-page.webp` → "Add custom item"), an "Edit" link
(`.../03-products/product-edit-seo-listing-and-empty-variants.webp` → "Search engine listing … Edit"),
or a count (`.../09-discounts/discount-create-shipping-empty.webp` → "Sales channels … 0 of 1 selected").

**Field grouping inside a card.** Related short fields sit side by side on one row at 50/50; long
fields go full width. `[observed]` First name / Last name, City / State, Price / Compare-at price,
Start date / Start time; full width for Email, Address, Company, Description. Three-up is used for
computed money rows: Cost per item / Profit / Margin `[observed]`
`.../03-products/product-edit-pricing-inventory-shipping.webp`. Vertical gap between field rows
inside a card ~14–18 px; horizontal gap in a pair ~14 px.

**Helper text** sits *below* the control it explains, ~12–13 px, grey, left-aligned to the field.
`[observed]` "Customers must enter this code at checkout."
(`.../09-discounts/discount-create-shipping-with-code.webp`), "Determines US tax rates"
(`.../03-products/product-add-new-blank-form.webp`), "9 digits" and "Appears on your website."
(`.../10-settings/settings-payments-submit-business-information.webp`,
`.../10-settings/settings-store-details-edit-profile-modal.webp`), "Use your first and last name as
they appear on your government-issued ID."
(`.../15-account/account-general-unsaved-changes.webp`). Checkbox helper text is indented to align
with the checkbox *label*, not the checkbox box `[observed]`
`.../03-products/product-edit-pricing-inventory-shipping.webp` ("This won't affect Shopify POS. Staff
will see a warning…" under "Continue selling when out of stock").

**Saving.** An unsaved form swaps the whole top bar for a **contextual save bar**: warning triangle +
"Unsaved product" / "Unsaved discount" / "Unsaved changes" on the left, `Discard` (secondary) then
`Save` (primary) on the right. `[observed]`
`.../03-products/product-add-new-blank-form.webp`, `.../09-discounts/discount-create-shipping-empty.webp`,
`.../04-customers/customer-new-form-empty.webp`. Long forms *additionally* repeat the action pair at
the bottom-right of the form, right-aligned under the last card `[observed]`
`.../09-discounts/discount-create-eligibility-and-active-dates.webp` ("Discard" + "Save discount"),
`.../03-products/product-edit-seo-listing-and-empty-variants.webp` (a lone "Save").

**Rules**
- MUST use layout A (main + sidebar) for resource editors and layout B (description + field column)
  for settings and account-style forms; MUST NOT invent a third page-form layout.
- MUST put one concern per card, with a bold card title; MUST NOT stack unrelated field groups into
  one undivided card.
- SHOULD pair short related fields 50/50 on one row and keep long/free-text fields full width.
- MUST place helper text directly beneath its control in grey ~12–13 px, never above the label.
- MUST show a contextual save bar (Discard + Save) whenever a form has unsaved changes, and SHOULD
  repeat the action pair at the bottom of forms longer than one viewport.
- SHOULD keep the sidebar column for status/metadata/live summaries only — never for required inputs
  the user must complete to save.

---

### 4.2 Text inputs

**Label.** Above the field, left-aligned, ~13 px, regular weight (not bold), dark grey/near-black,
~4–6 px gap to the field. `[observed]` "Title", "Price", "Discount code", "First name", "Store name",
"Tracking number" across
`.../03-products/product-add-new-blank-form.webp`,
`.../09-discounts/discount-create-shipping-with-code.webp`,
`.../04-customers/customer-new-form-empty.webp`,
`.../02-orders/order-fulfill-item-page.webp`. Labels are sentence case. `[observed]`

**Box.** Height ~32–36 px, 1 px light grey border, ~8 px corner radius, white fill, horizontal padding
~10–12 px, value text ~13 px. `[observed]` throughout, e.g.
`.../04-customers/customer-new-form-filled.webp`. Fields stretch to the full width of their column or
half-row — they are never sized to their content. `[observed]`

**Focus.** A darker, thicker (~2 px) border replaces the hairline, with no colour change to the fill.
`[observed]` `.../03-products/product-edit-variant-option-name-dropdown.webp` — the focused "Option
name" combobox has a **desaturated blue** ~2 px border (sampled `#687B9F`/`#8493B7`) while its sibling
fields keep the hairline. This is the **only** genuine focus state in the capture set; §1.1.3's
"dark/near-black" reading and its citation of `product-edit-pricing-inventory-shipping.webp` were both
wrong — that file contains no focused field at all. `[Polaris]` Polaris additionally renders a 2 px focus ring offset outside the control for
keyboard focus; not separable from the border at this capture resolution.

**Placeholder.** Grey, same size as the value, and used only for *format examples or affordance
hints*, never as a substitute for the label. `[observed]` "$ 0.00"
(`.../03-products/product-add-new-blank-form.webp`), "Search" / "Add custom category"
(product organization card, same file), "e.g. About us" and "Search or paste a link"
(`.../05-online-store/navigation-add-menu-with-add-item-panel.webp`), "0.0" for weight, "Leave a
comment…" (`.../02-orders/order-detail-more-actions-menu.webp`). Most fields ship **empty with no
placeholder at all** — Email, Phone number, Company, ZIP code, Vendor, Collections, Tags. `[observed]`
`.../04-customers/customer-new-form-empty.webp`.

**Inset/floating label (auth surface only).** The 2FA field puts a small ~10 px grey label *inside*
the box above the value. `[observed]`
`.../00-auth/login-two-factor-authenticator-code.webp` ("Authentication code" over "000000"). This
does not appear anywhere in the admin proper.

**Prefix / suffix.**
- Currency prefix: a `$` glyph inside the field on the left, grey, with the caret starting after it.
  `[observed]` `.../03-products/product-edit-pricing-inventory-shipping.webp` (`$ 15.00`),
  `.../03-products/product-edit-bulk-edit-prices-modal.webp` (every row), and
  `.../03-products/product-edit-variant-detail-modal.webp`.
- Currency suffix: unit code sits inside the field on the right. `[observed]`
  `.../02-orders/draft-order-add-discount-modal-empty.webp` (`$ 0.00 … USD`).
- Unit as an adjacent select: weight uses a narrow `lb ⌄` select *beside* the number field, not inside
  it. `[observed]` `.../03-products/product-edit-pricing-inventory-shipping.webp`.
- Country-code prefix on phone: a flag + chevron select docked at the right edge of the phone field.
  `[observed]` `.../04-customers/customer-new-form-empty.webp`.
- Leading icon inside the field marks searching/autocomplete behaviour: magnifier on "Search
  products", "Search customers", "Address", "Harmonized System (HS) code". `[observed]`
  `.../02-orders/draft-order-create-order-page.webp`,
  `.../04-customers/customer-merge-find-customer.webp`,
  `.../04-customers/customer-new-form-address-tax-notes.webp`,
  `.../03-products/product-edit-variant-option-values.webp`.
- Trailing help icon: a small circled `?` at the field's right edge or beside the label opens a
  tooltip. `[observed]` Compare-at price, Cost per item, Country/Region of origin, Estimated tax,
  "Product organization ⓘ".
- Password reveal: an eye icon at the right edge inside the field. `[observed]`
  `.../00-auth/login-password-step-empty.webp`, `.../00-auth/reset-password-strength-meter.webp`.

**Character counter.** Right-aligned *inside* the field, grey, format `0/40`. `[observed]`
`.../03-products/products-list-create-view-modal.webp`. Only seen on short constrained-name fields.

**Multiline textarea.** Same border/radius as a text input, taller box (~90–110 px), left-aligned
top, with a resize grip at the bottom-right corner. `[observed]`
`.../10-settings/settings-payments-cash-on-delivery-modal.webp` ("Additional details", "Payment
instructions" — both ~55 px tall with visible resize corner),
`.../04-customers/customer-new-form-address-tax-notes.webp` ("Note").

**Search inputs.** A full-width field with a leading magnifier. Three flavours observed:
1. In-card resource search with a `Browse` secondary button flush to its right `[observed]`
   `.../02-orders/draft-order-create-order-page.webp`.
2. List-page search that expands the toolbar into "search mode" with `Cancel` / `Save as` on the
   right and a filter row beneath `[observed]`
   `.../02-orders/orders-list-search-mode-add-filter.webp`,
   `.../03-products/products-list-search-and-filters.webp`.
3. Global search in the top bar with a trailing `⌘ K` keyboard hint `[observed]`
   `.../02-orders/order-detail-more-actions-menu.webp`.

**Computed / read-only fields.** Rendered as normal boxes but showing a derived value or `--`.
`[observed]` Profit and Margin in `.../03-products/product-edit-pricing-inventory-shipping.webp`
(`$5.00`, `33.3%`) and their empty state `--` in `.../03-products/product-add-new-blank-form.webp`.

**Rules**
- MUST place the label above the field, sentence case, ~13 px regular weight; MUST NOT use
  placeholder-as-label anywhere in the admin.
- MUST size fields to the column/half-row, never to content; MUST use one field height (~32–36 px)
  for all single-line inputs, selects and comboboxes.
- MUST render focus as a ~2 px darker border (plus focus ring) without changing the fill.
- SHOULD leave fields with no placeholder unless a format example genuinely helps.
- MUST put currency symbols as an in-field left prefix and unit codes as an in-field right suffix;
  MUST use an adjacent select when the unit is user-changeable (lb/kg).
- MUST use a leading magnifier icon on, and only on, fields that search or autocomplete.
- SHOULD show a character counter only where a hard limit exists, right-aligned inside the field.
- MUST give textareas the same border treatment as inputs and allow vertical resize.

---

### 4.3 Selects, radios, checkboxes, toggles

**Select.** Identical box to a text input plus a stacked up/down chevron pair (`⌃⌄`) at the right
edge. `[observed]` "Status: Active", "Theme template: Default product"
(`.../03-products/product-add-new-blank-form.webp`), "Language: English [Default]", "Country/region:
United States", "State: New York" (`.../04-customers/customer-new-form-empty.webp`,
`.../04-customers/customer-new-form-address-tax-notes.webp`), "Payment terms: Due on receipt"
(`.../02-orders/draft-order-create-order-page.webp`), "Business type: Individual/sole proprietor"
(`.../10-settings/settings-payments-submit-business-information.webp`). The chevron pair (rather than
a single caret) is the reliable visual signal for *select* vs *dropdown button*. `[observed]`

**Combobox / dropdown list.** An open combobox shows the focused field with a 2 px dark border and a
white popover below, flush to the field width, ~1 px border, ~8 px radius, options ~13 px with ~10 px
vertical padding and a light grey hover row. `[observed]`
`.../03-products/product-edit-variant-option-name-dropdown.webp` (Size / Color / Material / Style).

**Checkbox.** ~14–16 px square, ~4 px radius, 1 px grey border when unchecked; checked = near-black
fill with a white check. Label ~13 px to the right, ~8 px gap, vertically centred. `[observed]`
"Charge tax on this product", "Track quantity", "This is a physical product"
(`.../03-products/product-edit-pricing-inventory-shipping.webp`), "Collect tax"
(`.../04-customers/customer-new-form-address-tax-notes.webp`), "Create this variant"
(`.../03-products/product-edit-variant-detail-modal.webp`).

**Disabled checkbox.** Box renders as flat light grey with no border contrast and the label greys
out. `[observed]` "Customer agreed to receive SMS marketing text messages." is disabled in both
`.../04-customers/customer-new-form-empty.webp` (both marketing checkboxes disabled while no
email/phone exists) and `.../04-customers/customer-new-form-filled.webp` (email checkbox becomes
enabled once an email is entered; SMS stays disabled with no phone) — a **dependency-driven** disabled
state, explained by shared helper text below the group ("You should ask your customers for permission
before you subscribe them…").

**Checkbox list.** Stacked checkboxes inside a card, card title acting as the group label, ~10–12 px
vertical rhythm, optional helper text under the individual option it qualifies. `[observed]`
`.../09-discounts/discount-create-combinations-and-usage-limits.webp` — "Maximum discount uses"
("Limit number of times…", "Limit to one use per customer") and "Combinations" ("Product discounts",
"Order discounts"), where checking "Order discounts" reveals inline helper prose *under that option*.

**Radio.** ~14–16 px circle; selected = near-black filled ring with a white centre dot. `[observed]`
`.../09-discounts/discount-create-shipping-empty.webp`.

**Radio-group-in-a-card (the canonical mutually-exclusive-rule pattern).** One card per rule, card
title = the question, radios stacked as the entire card body, first option = the permissive default.
`[observed]` `.../09-discounts/discount-create-shipping-empty.webp` — "Countries" (All countries /
Selected countries), "Minimum purchase requirements" (No minimum requirements / Minimum purchase
amount ($) / Minimum quantity of items), "Customer eligibility" (All customers / Specific customer
segments / Specific customers). Note the money/quantity hint carried in the *option label itself*
("Minimum purchase amount ($)"). Selecting a non-default option is what reveals its dependent fields.

**Radio-group-in-a-card, payment-option flavour.** Each radio is a full-width row with a right-aligned
logo strip; the selected row expands to reveal its own nested field set. `[observed]`
`.../10-settings/settings-plan-review-and-subscribe.webp` — "Credit or debit card" (selected, Visa /
Mastercard / Amex / Discover marks right-aligned) expands into First name / Last name / Card number /
Expires / CVV / Country/region / ZIP code; the unselected "PayPal" row is collapsed to a single line
with the PayPal mark. Also `.../06-marketing/marketing-email-campaign-schedule-send-modal.webp` —
"Tomorrow at 9:00 pm EST ✨Suggested" / "Now" / "Custom date and time" as a modal-body radio group.

**Segmented control.** A light grey track containing 2+ segments; the selected segment is a white
pill with a border and a soft shadow, ~28 px tall, ~13 px label. `[observed]`
`.../09-discounts/discount-create-shipping-empty.webp` — "Discount code | Automatic discount" under a
"Method" label. Used for a *mode* switch that reconfigures the rest of the card, not for a value.

**Toggle.** A pill switch ~40×20 px, grey track with a white knob when off. `[observed]`
`.../10-settings/settings-plan-review-and-subscribe.webp` — "Save with yearly billing" with a
`$1,200 off ($299/mo)` badge, toggle in the **off** state at the top-right of the card. This is the
only toggle in the read set; every in-form boolean elsewhere is a **checkbox**, including ones that
gate whole sections ("Track quantity", "This is a physical product", "Payment due later", "Set end
date"). `[Polaris]` Polaris positions the toggle (`Setting toggle`) as a setting that takes effect
immediately, and the checkbox as a value submitted with the form — which matches what is observed
here.

**Rules**
- MUST distinguish select (stacked ⌃⌄ chevrons) from dropdown button (single ⌄ caret) visually.
- MUST use a radio group inside a card, titled by the card heading, for any mutually exclusive rule;
  MUST make the permissive/no-op option first and selected by default.
- MUST use a checkbox — not a toggle — for any boolean that is saved with the form.
- SHOULD reserve toggles for settings that apply immediately or that reprice/reconfigure the page.
- MUST use a segmented control only for a mode switch that changes what the rest of the card shows.
- SHOULD disable dependent checkboxes rather than hide them, and explain the dependency in group
  helper text.
- MUST reveal dependent fields by expanding the selected radio/checkbox in place, not by navigating.

---

### 4.4 Validation and errors

**Inline field error.** Three simultaneous signals: (1) the field border turns red, (2) the field
fill turns a light pink/red tint, (3) a red message with a filled red circle-exclamation icon appears
directly below the field at ~12 px. `[observed]`
`.../00-auth/login-email-validation-error.webp` — the Email field is red-bordered and pink-filled with
"⊗ Enter a valid email address" beneath it. Note the label above stays its normal colour, and the
error text *replaces* nothing — it is inserted below the field. `[inferred]` that this **pushes the
button down**: that is a claim about layout dynamics across two states and only one frame exists.

**Page-level critical banner.** A full-bleed solid red banner across the top of the page content
region, white bold text, warning icon at the left, phrased as a count of blocking problems:
"To save this draft order, 1 change needs to be made:" — with the specific items listed immediately
below on the page background ("Activate a direct credit card gateway for this store."). `[observed]`
`.../02-orders/draft-order-validation-error-banner.webp`. Simultaneously the page's primary actions
grey out (`Duplicate`, `Share`, `Send invoice` all disabled in that shot). `[observed]`

**Non-critical banner variants** for contrast: informational banners are a pale blue/grey card with an
ⓘ icon inside the form flow `[observed]`
`.../00-auth/reset-password-strength-meter.webp`, `.../10-settings/settings-payments-submit-business-information.webp`,
`.../02-orders/order-fulfill-item-page.webp` ("Add tracking to improve customer satisfaction", with a
dismiss ✕ at the right — its fill samples `#EDF4FF`, a real blue tint). Warning banners are pale
yellow `[observed]`
`.../10-settings/settings-payments-manual-methods-cod-activated.webp` ("Complete your Paypal account
setup…"). Only the *blocking* case gets the saturated red full-width treatment. `[observed]`

**Both banner families genuinely ship, and this section is the half that was right.** §1.1.5 also
records a white-surface info banner (`point-of-sale-subscription-plans.webp`) and a saturated amber
warning strip (`customer-detail-erasure-request-banner.webp`) — those exist too. The MUST that used to
sit in §1.1.5 ("info banners have no coloured strip at all… not as a blue fill") is **deleted under
R16**, falsified by the `order-fulfill-item-page` evidence above. **Under R1 and R16, Eyvar ships the
pale tinted card for all four tones**, which is what this section describes.

**Disabled-until-valid Save.** The primary action is rendered but disabled (light grey fill, mid-grey
label, no border) until the minimum required input exists.
`[observed]` clean before/after pairs:
- `.../09-discounts/discount-create-shipping-empty.webp` (Discount code empty → `Save` disabled) vs
  `.../09-discounts/discount-create-shipping-with-code.webp` (code `FREESHIPPING10` → `Save` enabled).
- `.../10-settings/settings-store-details-edit-profile-modal.webp` (`Save` disabled) vs
  `.../10-settings/settings-store-details-edit-profile-modal-edited.webp` (store name changed to
  "JS Mob" → `Save` enabled) — here the gate is *dirty state*, not validity.
- `.../02-orders/draft-order-add-discount-modal-empty.webp` (`Apply` disabled) vs
  `.../02-orders/draft-order-add-discount-modal-filled.webp` (reason entered → `Apply` enabled).
- `.../03-products/products-list-create-view-modal.webp` (`Create view` disabled with `0/40`),
  `.../04-customers/customer-merge-find-customer.webp` (`Merge` disabled until a customer is chosen),
  `.../03-products/product-edit-bulk-edit-prices-modal.webp` (`Apply to all` disabled with an empty
  amount; `Done` also disabled),
  `.../05-online-store/navigation-add-menu-with-add-item-panel.webp` (`Add` disabled in the side panel
  footer *and* `Save` disabled in the top bar),
  `.../00-auth/signup-create-account-email-password.webp` (`Create Shopify account` disabled until the
  captcha is solved),
  `.../04-customers/customer-segment-new-query-editor.webp` (`Apply` and `Use segment` disabled with an
  empty query).

**Required vs optional labelling.** No asterisks anywhere. Fields are required by default and
**optional fields are suffixed "(optional)" in the label**. `[observed]` "Employer Identification
Number (EIN) (optional)" (`.../10-settings/settings-payments-submit-business-information.webp`),
"Phone Number (optional)" (`.../15-account/account-general-unsaved-changes.webp`).

**Positive/strength feedback.** Password strength renders as a full-width green bar directly under the
field plus a bold caption "Password strength: strong." `[observed]`
`.../00-auth/reset-password-strength-meter.webp`, `.../00-auth/signup-create-account-email-password.webp`.
Verified state uses a green check + "Verified" inline on the read-only row `[observed]`
`.../15-account/account-general-unsaved-changes.webp`.

**Success confirmation** is a dark rounded-rectangle toast (~8 px radius, not a stadium — R15),
**bottom-centre of the viewport**, white text,
with a dismiss ✕. Measured toast centres land at x≈384 = viewport centre in every sample; the content
region's centre is x≈448, so "centred at the bottom of the content area" was wrong here and §5.1's
"viewport" reading is right (C9). `[observed]` "Customer created ✕"
(`.../02-orders/draft-order-create-order-page.webp`), "Cash on Delivery (COD) activated ✕"
(`.../10-settings/settings-payments-manual-methods-cod-activated.webp`).

**Rules**
- MUST show inline field errors with all three signals (red border, tinted fill, iconed red message
  below); MUST NOT rely on colour alone.
- MUST insert the error message below the field rather than replacing the helper text position with
  an overlay or tooltip.
- MUST show a page-level critical banner when a save is blocked, stating the count and listing each
  blocking item; MUST scope the saturated red full-width banner to blocking failures only.
- MUST render blocked primary actions as disabled-but-visible; MUST NOT hide the Save button.
- MUST gate Save on dirty state in edit modals and on validity in create forms.
- MUST mark optional fields "(optional)" in the label and MUST NOT use asterisks for required.
- SHOULD confirm success with a transient toast, not a persistent banner - unless the save left a
  standing condition, in which case R10 routes it to a banner. (Eyvar's toast is not dark; see 6.3 D7.)

---

### 4.5 Specialised inputs

**Rich text description editor.** A bordered container whose top row is a toolbar strip, with a
~90–110 px editable body below and a resize grip at the bottom-right. Toolbar order observed
left→right: a formatting/undo control with caret, a block-style select `Paragraph ⌄`, `B` `I` `U`,
a text-colour `A` with caret, a list control with caret, then link / image / help icons, an overflow
`…`, and — pushed to the far right — a `</>` HTML source toggle. `[observed]`
`.../03-products/product-add-new-blank-form.webp`. The toolbar has no fill of its own and is
separated from the body by a hairline. `[observed]`

**Media upload grid.**
- Empty: a full-width drop zone card containing a centred `Upload new` secondary button, an
  `Add from URL` plain link beside it, and grey helper text "Accepts images, videos, or 3D models".
  `[observed]` `.../03-products/product-add-new-blank-form.webp`.
- Filled: an asymmetric grid — the first asset renders large (roughly 2×2), the rest as small squares,
  video tiles carrying a small play badge in the corner, and the last cell is an "Add / Add from URL"
  tile echoing the empty-state affordances. `[observed]`
  `.../03-products/product-edit-media-and-pricing.webp`,
  `.../03-products/product-edit-media-gallery-with-video.webp`.
- Attachment upload inside a comment composer shows a progress state. `[observed]` (file
  `.../02-orders/order-detail-timeline-uploading-attachment.webp`; behaviour inferred from the
  timeline composer's paperclip/link icon row in
  `.../02-orders/order-detail-timeline-comment-composer.webp` `[observed]`).

**Combobox / resource picker.** A search field with a leading magnifier plus, where browsing is
supported, a `Browse` secondary button flush right. `[observed]` "Search products … Browse"
(`.../02-orders/draft-order-create-order-page.webp`), "Search or create a customer"
(`.../02-orders/draft-order-validation-error-banner.webp` — the create affordance is folded into the
placeholder), "Search customers" (`.../04-customers/customer-merge-find-customer.webp`), "Search or
paste a link" (`.../05-online-store/navigation-add-menu-with-add-item-panel.webp`), "Search" for
product category (`.../03-products/product-add-new-blank-form.webp`). Selected resources render as a
row beneath the picker with a thumbnail, a blue title link, grey variant subtitle, price, an editable
quantity field and a trailing trash icon. `[observed]`
`.../02-orders/draft-order-create-order-page.webp`.

**Date + time.** Side-by-side half-width fields: date with a leading calendar icon and ISO-ish value
`2024-01-09`; time with a leading clock icon, value `3:01 AM`, and the timezone in the **label**
("Start time (EST)"). An end date is hidden behind a `Set end date` checkbox. `[observed]`
`.../09-discounts/discount-create-eligibility-and-active-dates.webp`,
`.../09-discounts/discount-create-combinations-and-usage-limits.webp`.

**Date range picker.** A wide popover with three parts: a left column of preset ranges (Today /
Yesterday / Last 7 days / … / Last year) with a check on the active preset; a right area holding two
editable date fields with a `→` between them above two side-by-side month calendars with `←` `→`
month steppers; and a footer with `Cancel` + `Apply`, `Apply` disabled until the range changes.
`[observed]` `.../07-analytics/analytics-date-range-picker-calendar.webp`.

**Tag input.** A bordered empty field under a "Tags" label with no chips yet; in sidebar summary cards
it is paired with a pencil icon on the card title row. `[observed]`
`.../03-products/product-add-new-blank-form.webp` (form context),
`.../02-orders/draft-order-create-order-page.webp` and
`.../02-orders/order-detail-collect-payment-dropdown.webp` (sidebar "Tags ✏"). Committed option values
render as small grey chips in the variants summary rows: `Brown` `Black` `Blue` `Red` `Yellow`
`[observed]` `.../03-products/product-edit-variants-matrix-table.webp`.

**Address block.** Fixed field order: **Country/region select first** (because it drives the rest),
then First name / Last name, Company, Address (magnifier = autocomplete), "Apartment, suite, etc.",
City / State (State is a **select** when the country has states), ZIP code, Phone (with flag select).
`[observed]` `.../04-customers/customer-new-form-address-tax-notes.webp`. The billing variant in the
subscribe flow drops to Country/region + ZIP code only. `[observed]`
`.../10-settings/settings-plan-review-and-subscribe.webp`.

**Code / query editor (customer segments).** A full-width monospace editor on a white card: a header
strip showing live result stats ("2 customers · 100% of your customer base") on the left and an icon
toolbar on the right (undo, redo, save, filter, collapse caret); a monospace body where actionable
tokens are rendered as underlined links inside prose ("To create a segment, choose a **template** or
apply a **filter**."); and a right-aligned `Apply` button in the editor's own footer, disabled while
empty. `[observed]` `.../04-customers/customer-segment-new-query-editor.webp`. Its companion
**Templates side panel** slides in from the right with a category list on the left, and cards on the
right each showing a title, description, a monospace read-only query snippet, and a
`Use this template` secondary button; the panel footer holds a single `Close`. `[observed]`
`.../04-customers/customer-segment-templates-panel.webp`.

**Bulk / grid editing.** A dedicated full-screen editor replacing the page chrome: `‹ Back` at top
left, "Editing 3 products", a `Columns` control and `Save` at top right; the body is a spreadsheet
where each cell is an inline control (status select, category combobox with clear ⊗ and confirm ⊙,
plain numeric price cells, `—` for not-applicable). `[observed]`
`.../03-products/products-bulk-editor-price-columns.webp`. A lighter variant edits one attribute
across rows in a modal with an "Apply a price to all variants" field + `Apply to all` button at the
top and per-row fields below, each with a grey computed caption ("$10.00 cost per item · Projected
margin: 33.3%"). `[observed]` `.../03-products/product-edit-bulk-edit-prices-modal.webp`. Inline
numeric cells also appear in the inventory table (Available / On hand columns as bare numeric fields
with an adjustment icon). `[observed]` `.../03-products/inventory-quantities-by-variant.webp`.

**Rules**
- MUST give the rich text editor a hairline-separated toolbar with block style, bold/italic/underline,
  colour, lists, link, image and an HTML source toggle placed at the far right.
- MUST offer both `Upload new` (secondary button) and `Add from URL` (plain link) in the media empty
  state, and repeat both in the trailing "Add" tile of a filled grid.
- MUST pair every resource picker with a leading magnifier and, where a catalogue exists, a `Browse`
  secondary button; MUST show picked resources as removable rows below the picker.
- MUST split date and time into two half-width fields, put the timezone in the time label, and hide
  optional end dates behind a checkbox.
- MUST order address fields Country → names → company → street → unit → city/state → postal → phone,
  and MUST switch State between select and text based on country.
- SHOULD provide a templates panel beside any query/code editor rather than expecting users to author
  from scratch.
- MUST move bulk editing to a dedicated grid surface with its own Back/Save chrome rather than
  overloading the list page.

---

### 4.6 The button system

**Sizes (approximate).** Two heights are in use: **compact ~28 px** for top-bar/page-header, table,
card-footer and modal-footer buttons; **regular ~36 px** for in-form and full-width primary buttons.
Horizontal padding ~12–14 px compact, ~16 px regular; corner radius ~8 px; label ~13 px medium weight.
`[observed]` compare the top bar `Save` in `.../03-products/product-add-new-blank-form.webp` with the
`Continue with email` button in `.../00-auth/login-email-filled.webp` and the full-width
`Fulfill item` in `.../02-orders/order-fulfill-item-page.webp`.

**Ordering and placement convention.** `[observed]` and consistent across every screenshot read:
- Page top bar / contextual save bar: destructive-neutral secondary on the **left**, primary on the
  **right** — `Discard` `Save` (`.../09-discounts/discount-create-shipping-with-code.webp`).
- Page header action row: lowest-priority secondaries left → dropdown → primary rightmost —
  `Export` `Import` `More actions ⌄` `Add product`
  (`.../03-products/products-list-bulk-selection-action-bar.webp`).
- Modal footer: right-aligned pair, `Cancel` left of the primary
  (`.../03-products/products-list-archive-confirm-modal.webp`,
  `.../04-customers/customer-erase-personal-data-modal.webp`,
  `.../10-settings/settings-payments-cash-on-delivery-modal.webp`).
- Card footer: right-aligned pair inside the card
  (`.../02-orders/order-detail-collect-payment-dropdown.webp` → `Resend invoice` `Collect payment ⌄`).
- Sidebar card: a single full-width primary
  (`.../02-orders/order-fulfill-item-page.webp` → `Fulfill item`).
- Bulk action bar: a floating pill bar centred at the bottom of the table with all-secondary buttons
  plus an `…` overflow (`.../03-products/products-list-bulk-selection-action-bar.webp`).

**Variant table**

| Variant | Appearance | Use for | Never use for | Evidence |
|---|---|---|---|---|
| **Primary** | Near-black fill — sampled `#3E3E3E` on the large flat auth primary, not the `#303030` this table used to print (that value is body text) — white ~13 px label, ~8 px radius, no border | The single most important action on a page, modal, card footer or sidebar card — Save, Add product, Create order, Install app, Post, Done, Apply, Schedule, Fulfill item | More than one per surface; a destructive action; navigation | `.../09-discounts/discount-create-shipping-with-code.webp`, `.../03-products/products-list-bulk-selection-action-bar.webp`, `.../11-apps-and-channels/app-install-permissions-consent.webp`, `.../02-orders/order-fulfill-item-page.webp` |
| **Primary (green)** | Green fill, white label | Legacy/account surface only — `Save` on the account settings page | Anywhere in the admin proper; do not introduce a second primary colour | `.../15-account/account-general-unsaved-changes.webp` |
| **Secondary** | White fill, 1 px light grey border, soft shadow, dark label | Every supporting action next to a primary — Discard, Cancel, Export, Import, Browse, Edit, Manage, Restock, Return, Upload new, Bulk edit, Use this template, Print packing slip | The main affirmative action; long-form navigation | `.../03-products/products-list-search-and-filters.webp`, `.../10-settings/settings-payments-manual-methods-cod-activated.webp`, `.../04-customers/customer-segment-templates-panel.webp` |
| **Plain / link** | Blue ~13 px text, no chrome, often with a leading `+` or a trailing `→` | Tertiary, additive and inline actions — Add another option, Add custom item, Generate random code, Edit discount, Learn more, Change email, Forgot password?, Get started → | Confirming a form; anything that needs a hit target in a crowded toolbar | `.../09-discounts/discount-create-shipping-empty.webp`, `.../03-products/product-edit-variant-option-values.webp`, `.../02-orders/draft-order-create-order-page.webp`, `.../00-auth/login-password-step-empty.webp` |
| **Destructive** | Red fill, white label, same geometry as primary | Irreversible data loss confirmed inside a modal — Erase personal data | The page header; the first thing a user sees; anything undoable | `.../04-customers/customer-erase-personal-data-modal.webp` |
| **Split / dropdown** | Secondary or primary body + a `⌄` caret at the right; opens a menu below aligned to the button's right edge | A default action with alternatives, or a pure action menu — `Collect payment ⌄`, `More actions ⌄`, `Draft ⌄` | Hiding the primary action of the page inside the menu | `.../02-orders/order-detail-collect-payment-dropdown.webp`, `.../02-orders/order-detail-more-actions-menu.webp`, `.../03-products/products-list-create-view-modal.webp` |
| **Icon-only** | ~28 px square, no fill/border until hover, ~16 px glyph | Repeated row/card affordances — pencil edit, trash, drag handle, copy, `⋯`/`⋮` overflow, password eye, dismiss ✕ | Any action whose meaning is not obvious from the glyph alone | `.../02-orders/draft-order-create-order-page.webp` (sidebar pencils), `.../03-products/product-edit-variant-option-values.webp` (trash + drag handle), `.../00-auth/login-password-step-empty.webp` (eye) |
| **Disabled (any variant)** | Flat light grey fill, mid-grey label, no border, no shadow | Communicating "not yet available" while keeping the action discoverable | Actions that are permanently unavailable — omit those instead | `.../09-discounts/discount-create-shipping-empty.webp`, `.../02-orders/draft-order-add-discount-modal-empty.webp`, `.../00-auth/signup-create-account-email-password.webp` |
| **Disabled menu item** | Grey label inside an open menu, still listed | An option blocked by state, kept for discoverability — "Enter credit card" greyed above "Mark as paid" | Options the account will never have | `.../02-orders/order-detail-collect-payment-dropdown.webp` |
| **Social / provider — filled tile** | Light grey fill, brand mark, no text; three equal tiles in one row | Third-party auth on the auth surface | Product actions | `.../00-auth/login-email-filled.webp` |
| **Social / provider — link row** | **No fill, no border**: a brand mark plus a plain blue text link per row ("Connect to Apple / Connect to Facebook / Connect to Google") | Connecting a login service from an account settings page | Anywhere the tile variant is used; do not mix the two on one surface | `.../15-account/account-general-unsaved-changes.webp` |

**Destructive nuance.** Red fill is rare. Bulk *archive* — a reversible hide — uses the normal dark
primary `Archive products` in its confirm modal `[observed]`
`.../03-products/products-list-archive-confirm-modal.webp`, while genuinely irreversible erasure uses
red `[observed]` `.../04-customers/customer-erase-personal-data-modal.webp`. Destructive items inside
menus stay as plain menu rows with an icon, not red text `[observed]` "Cancel order" in
`.../02-orders/order-detail-more-actions-menu.webp`.

**Menus.** Opened from a caret button: white popover, ~8 px radius, 1 px border, soft shadow, items
~13 px with a leading ~16 px icon, ~10 px row padding, right-aligned to the trigger. `[observed]`
`.../02-orders/order-detail-more-actions-menu.webp` (Duplicate / Cancel order / Archive / Print order
page / Print packing slips / View order status page). Navigation-style menus add a trailing `›` and
may show keyboard shortcuts right-aligned `[observed]`
`.../13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp` (`#` `O`, `#` `D`, …).

**Rules**
- MUST allow exactly one primary button per surface (page, modal, card, panel).
- MUST place the primary on the **right** in page top bars, page headers, modal footers and card
  footers, with secondaries to its left.
- MUST use the near-black primary; MUST NOT introduce a second primary colour in the admin.
  **→ Does not bind Eyvar. Superseded by R3 + §6.2 D-1: the Eyvar primary is brand blue `--blue`. The "one primary colour" half of this rule still binds — there is exactly one.**
- MUST reserve red destructive buttons for irreversible actions confirmed in a modal; reversible
  destructive-sounding actions (archive, deactivate) MUST use the normal primary.
- MUST render unavailable actions as disabled rather than hidden when they will become available.
- MUST give every icon-only button an accessible name and a tooltip; MUST NOT use icon-only for
  one-off or ambiguous actions.
- SHOULD use a split button when a clear default action exists, and a plain `More actions ⌄` dropdown
  when it does not.
- MUST NOT put the page's primary action inside an overflow menu.
- SHOULD use plain/link buttons for all "add another / edit / learn more" affordances inside cards.

---

### 4.7 Progressive disclosure in forms

**Collapsible sections.** Accordion rows with a bold title, one-line description, and a `⌃`/`⌄` caret
at the far right; expanding one reveals rich body content (icon + title + prose + inline action
buttons + illustration) and collapses the siblings. A progress indicator sits in the header
("1 / 11 completed" with a bar). `[observed]`
`.../01-home/home-get-ready-to-sell-setup-guide-accordion.webp`.

**"Add another" / additive links.** A left-aligned plain blue link with a leading `+`, placed at the
bottom of the card it extends. `[observed]` `+ Add another option`
(`.../03-products/product-edit-variant-option-values.webp`), `+ Add another tracking number`
(`.../02-orders/order-fulfill-item-page.webp`), `+ Add customs information`
(`.../03-products/product-edit-pricing-inventory-shipping.webp`), `+ Add options like size or color`
(`.../03-products/product-edit-seo-listing-and-empty-variants.webp`), `+ Add payment method` /
`+ Manual payment method` (`.../10-settings/settings-payments-manual-methods-cod-activated.webp`),
`+ Add menu item` (`.../05-online-store/navigation-add-menu-with-add-item-panel.webp`), `Add filter +`
(`.../02-orders/orders-list-search-mode-add-filter.webp`).

**Read-only summary card + pencil.** Sidebar cards render values as plain text with a pencil icon on
the title row; the pencil opens either a modal or an inline editor. `[observed]` Notes, Customer,
Contact information, Shipping address, Billing address, Market, Tags in
`.../02-orders/draft-order-create-order-page.webp` and
`.../02-orders/order-detail-collect-payment-dropdown.webp`; Profile in
`.../10-settings/settings-store-details-edit-profile-modal.webp` (pencil → "Edit profile" modal).
A textual `Edit` link is the alternative on wide cards `[observed]` "Search engine listing … Edit"
(`.../03-products/product-edit-seo-listing-and-empty-variants.webp`) and "Payment due when invoice is
sent … Edit" (`.../02-orders/draft-order-create-order-page.webp`).

**Inline edit → Done.** The variants option editor expands a summary row into an editing block: drag
handle, `Option name` field, `Option values` field, trash icon, and a `Done` secondary button at the
bottom-left that collapses it back to a chip summary. `[observed]`
`.../03-products/product-edit-variant-option-values.webp` (editing) vs
`.../03-products/product-edit-variants-matrix-table.webp` (collapsed: `Color` with chips
Brown/Black/Blue/Red/Yellow and an `Edit` button right-aligned).

**Row-level edit modal.** Per-row `Edit` buttons in the variants table open a focused modal scoped to
that row, titled with the row identity ("Edit Brown / A5 / Grid"), containing sub-sectioned fields
(Price group / Inventory / Customs information), a footer note explaining a limitation ("Save the
product to edit more variant details.") and `Cancel` + `Done`. `[observed]`
`.../03-products/product-edit-variant-detail-modal.webp`.

**Checkbox-gated sections.** A checkbox reveals its dependent fields in place: `Track quantity` →
Quantity table + "Continue selling when out of stock" + "This product has a SKU or barcode";
`This is a physical product` → Weight + `+ Add customs information`; `Set end date` → end date fields;
`Payment due later` → Payment terms select + explanatory prose. `[observed]`
`.../03-products/product-edit-pricing-inventory-shipping.webp`,
`.../09-discounts/discount-create-combinations-and-usage-limits.webp`,
`.../02-orders/draft-order-create-order-page.webp`.

**Side panel (sheet) as a sub-form.** A right-docked panel with its own title, close ✕, fields, and a
footer holding `Cancel` + a disabled-until-valid primary; the page behind keeps its own contextual
save bar. **The ~330 px printed here was wrong for both cited files (C12).** Measured: the Add-menu
form sheet is 203 img px ⇒ **~406 px**; the two-column segment-templates panel is 324 img px ⇒
**~648 px** (~42% of the viewport). §2.6 and §5.5 already had both right. `[observed]`
`.../05-online-store/navigation-add-menu-with-add-item-panel.webp` (~406 px),
`.../04-customers/customer-segment-templates-panel.webp` (~648 px).

**Live summary as feedback.** The discount editor mirrors every choice into a right-column "Summary"
card that grows as the form is completed — from "No discount code yet / Type and method / Details:
Can't combine with other discounts" to a nine-item bullet list. `[observed]` compare
`.../09-discounts/discount-create-shipping-empty.webp` with
`.../09-discounts/discount-create-shipping-with-code.webp`.

**Choice-first modals.** Creating a complex resource starts with a modal of choices rather than a
blank form: each row is a title + description with a right-aligned type badge and a `›` chevron, and
the only button is `Cancel`. `[observed]`
`.../09-discounts/discount-select-type-modal.webp`,
`.../06-marketing/marketing-build-campaign-activity-modal.webp` (with a filter tab row: All / Ads /
Email / Social Post / SMS / Other).

**Rules**
- MUST use `+ Add another …` plain links at the bottom of the card being extended; MUST NOT preload
  empty repeated field sets.
- MUST render saved sidebar metadata as read-only text with a pencil (or `Edit` link) affordance
  rather than as always-live inputs.
- MUST collapse an inline editor back to a summary via an explicit `Done`, and MUST NOT auto-collapse
  on blur.
- MUST reveal checkbox/radio-dependent fields in place, immediately below the control that gates them.
- SHOULD scope per-row editing to a modal titled with the row's identity when the row has more than
  three attributes.
- SHOULD provide a live summary card for multi-card rule builders so users can verify without
  scrolling.
- SHOULD open complex "create" flows with a type-choice modal instead of a blank multi-purpose form.
- MUST give side panels their own `Cancel` + primary footer and MUST NOT let a panel's primary
  double as the page's Save.

---

### 4.8 Open questions / not verifiable here

- Exact focus-ring geometry and colour (border vs offset ring) — the capture resolution cannot
  separate them. `[Polaris]`
- Hover states for any variant — no hover is captured in this set.
- Toggle **on** state appearance — only the off state was observed
  (`.../10-settings/settings-plan-review-and-subscribe.webp`).
- Error state on selects, comboboxes, checkboxes and radios — only text-field errors were observed
  (`.../00-auth/login-email-validation-error.webp`).
- Multi-error page banners (the one observed lists a single blocking change).
- Responsive collapse of the two-column layouts at narrow widths — all captures are desktop.

---

## 5. Feedback, Overlays & Voice

How the admin talks back: what it says, where it says it, and how long it stays. Derived
from 68 screenshots read across all 16 folders. Every claim is tagged `[observed]`
(visible in the cited screenshot) or `[Polaris]` (design-system knowledge these
screenshots do not prove).

All screenshot paths below are relative to `docs/06-design-reference/shopify-admin-web/`.

### 5.0 Choosing the surface

There are exactly six feedback/overlay surfaces in this system. Adding a seventh is a
design bug. Pick from the table; do not invent.

| Situation | Use | Do NOT use | Evidence |
|---|---|---|---|
| An action the user just took succeeded, and there is nothing more to do | **Toast** (dark rounded rectangle, bottom-centre of the viewport, auto-dismiss) | Banner — it would persist after it stops being true | `03-products/products-list-products-imported-toast.webp`, `10-settings/settings-store-details-saved-toast.webp`, `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp` [observed] |
| A record was created and there is an obvious *next* step | **Success banner at top of page**, with the next step as a button/links, **plus** a toast for the raw confirmation | Toast alone — the next-step offer would vanish | `09-discounts/discount-detail-shareable-link-modal.webp` (banner "FREESHIPPING10 was created successfully. What's next?" + "Get shareable link"), `03-products/product-detail-created-success-banner.webp` (green banner + "Product created" toast simultaneously) [observed] |
| A condition is true about this record until someone changes it (pending erasure, app needs attention, unverified email) | **Banner, undismissable, top of page** | Toast — the state outlives the session | `04-customers/customer-detail-erasure-request-banner.webp`, `11-apps-and-channels/app-detail-shop-channel-needs-attention.webp` [observed] |
| Save was blocked by validation | **Critical banner at top of page** naming the count and the fix; primary actions disabled | Toast; a modal; a bare red field with no page-level summary | `02-orders/draft-order-validation-error-banner.webp` ("To save this draft order, 1 change needs to be made:") [observed] |
| One field is wrong | **Inline field error** under the field, field tinted red | Page banner for a single field | `00-auth/login-email-validation-error.webp` ("Enter a valid email address") [observed] |
| Destructive or irreversible action needs confirmation | **Modal**, small, primary button restated as the verb | Toast with undo; a popover; navigating to a page | `03-products/products-list-archive-confirm-modal.webp`, `04-customers/customer-segment-delete-confirm-modal.webp`, `04-customers/customer-erase-personal-data-modal.webp` [observed] |
| A short focused form (≤ ~6 fields) that does not need page context | **Modal** | Drawer; new page | `10-settings/settings-store-details-edit-profile-modal.webp`, `03-products/products-list-create-view-modal.webp`, `10-settings/settings-payments-cash-on-delivery-modal.webp` [observed] |
| Choosing which *kind* of thing to create, before a long flow | **Picker modal** — rows, no primary button, Cancel only | Dropdown menu; a page of cards | `09-discounts/discount-select-type-modal.webp`, `06-marketing/marketing-build-campaign-activity-modal.webp` [observed] |
| A working surface the user consults *against* the page behind it | **Right side panel / drawer**, no scrim, page stays readable | Modal — it hides the thing being worked on | `01-home/home-guide-side-panel-in-progress.webp`, `04-customers/customer-segment-templates-panel.webp`, `05-online-store/navigation-add-menu-with-add-item-panel.webp`, `05-online-store/themes-connect-github-repository-panel.webp` [observed] |
| A list of commands on an object | **Popover menu** anchored to the trigger | Modal; expanding the row | `02-orders/order-detail-more-actions-menu.webp`, `04-customers/customer-segments-row-actions-menu.webp` [observed] |
| A view setting that can be changed repeatedly (sort, colour, date range) | **Popover** that stays open while the user adjusts | Modal | `03-products/products-list-sort-popover.webp`, `05-online-store/theme-editor-color-scheme-picker.webp` [observed] |
| Naming an icon-only control | **Tooltip** | Popover; permanent label | `03-products/products-list-draft-tab-create-view-tooltip.webp` ("Create view") [observed] |
| Granting permissions / legal consent / entering a long multi-section flow | **Full page** with Cancel + primary in the page header | Modal — consent must be readable and linkable | `11-apps-and-channels/app-install-permissions-consent.webp`, `04-customers/customer-merge-review-merged-record.webp` [observed] |
| Progressive setup of a whole area of the product | **Guide card with checklist** on the destination page, mirrored in a drawer while the user works | Modal wizard; a tour with coach-marks | `01-home/home-get-ready-to-sell-setup-guide-accordion.webp`, `03-products/product-detail-setup-guide-sharing-details.webp`, `08-finances/finances-get-started-tasks-checklist.webp` [observed] |
| Page has unsaved edits | **Contextual save bar** replacing the top bar | Toast; a modal on navigate-away as the *only* guard | `15-account/account-general-unsaved-changes.webp`, `03-products/product-edit-seo-listing-and-empty-variants.webp` [observed] |

**Rules**
- MUST pick a surface from this table before designing any feedback; a new surface type requires a written exception.
- MUST NOT use a toast for anything the user needs to act on — a toast is unreadable-by-then.
- MUST NOT use a modal for anything the user has to consult the page to answer.
- **-> Constrained by R10: one event, one surface, decided by lifetime. Pair the two only when the
  action completed *and* left a standing condition.**
- SHOULD pair a toast with a banner when the action both *succeeded* and *opened a next step* — Shopify ships both at once. `03-products/product-detail-created-success-banner.webp` [observed]
- MUST make the surface match the lifetime of the message: session-lifetime → toast, record-lifetime → banner.

### 5.1 Toasts

**Anatomy** [observed across 9 screens]
- A dark, near-black **rounded rectangle at ~8 px radius — not a stadium pill** (R15). Measured: ~4–5 img px of corner radius on a 23 img px tall toast, where fully rounded ends would need 11.5. §1.4 was right and the "fully rounded ends" this section used to claim was wrong. White text, no icon, no title — a single short sentence fragment.
- One trailing affordance only: a small **×** on the right inside the toast. No "Undo" button appears in any screenshot read.
- Horizontally centred **on the viewport**, pinned near the bottom of it. Measured centre lands at x≈384 of 768 — exactly 50% of viewport width — in every case: `03-products/products-list-products-imported-toast.webp`, `03-products/products-list-view-deleted-toast.webp`, `04-customers/customer-segments-deleted-toast.webp`, `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp`, `02-orders/order-detail-refunded-with-toast.webp`. The content region runs x 128→768 and centres at 448, so the toast sits ~64 img px left of the content centre — §2.6's and §4.4's "content region" readings are wrong and defer to this one (C9). [observed]
- The toast floats above everything, including the full-screen Settings overlay (`10-settings/settings-store-details-saved-toast.webp`) and above an open modal (`09-discounts/discount-detail-shareable-link-modal.webp` shows "Copied to clipboard" while the modal is open) [observed].
- Width appears to hug the content, with no wrapping to a second line in any sample [observed for the absence of wrapping]. That there is **no fixed width** is `[inferred]` — it generalises from ~5 short strings, every one of which would also fit inside a fixed width.
- `[Polaris]` Toasts auto-dismiss after ~5s (10s for the long variant) and stack vertically when several fire; not provable here — every screenshot shows exactly one toast.

**Observed strings** — all sentence case, all past-tense state-changes, none ends in a period, none has an exclamation mark:

| String | Screen |
|---|---|
| "Settings saved" | `10-settings/settings-store-details-saved-toast.webp` |
| "Products imported" | `03-products/products-list-products-imported-toast.webp` |
| "View deleted" | `03-products/products-list-view-deleted-toast.webp` |
| "Dashboard saved" | `07-analytics/analytics-dashboard-saved-toast-last-7-days.webp` |
| "Segment deleted" | `04-customers/customer-segments-deleted-toast.webp` |
| "Product created" | `03-products/product-detail-created-success-banner.webp` |
| "Items fulfilled" | `02-orders/order-detail-items-fulfilled-toast.webp` |
| "Refunded $10.00" | `02-orders/order-detail-refunded-with-toast.webp` |
| "Erasure request submitted" | `04-customers/customer-detail-erasure-request-banner.webp` |
| "Cash on Delivery (COD) activated" | `10-settings/settings-payments-manual-methods-cod-activated.webp` |
| "Copied to clipboard" | `09-discounts/discount-detail-shareable-link-modal.webp` |
| "Email sent" | `06-marketing/email-app-overview-with-sent-toast.webp` |

The wording formula is **`<object> <past-participle>`**, optionally with a value
("Refunded $10.00"). The object is the thing the user touched, named the way the UI names
it — "Cash on Delivery (COD) activated" keeps the full method name including the
parenthetical, matching the button that triggered it ("Activate Cash on Delivery (COD)")
[observed, `10-settings/settings-payments-cash-on-delivery-modal.webp`].

**Variant, bottom-right** [observed] — `01-home/home-setup-guide-with-trial-started-toast.webp`
shows a dark pill reading "Your trial just started" anchored **bottom-right** with a
chevron-up instead of an ×, i.e. an expandable persistent notice, not a toast. Treat this
as a separate component (a persistent account notice); do not mix it with toasts.

**Rules**
- MUST render toasts as a dark **rounded rectangle (~8 px radius, never a stadium pill — R15)**, bottom-centre of the **viewport**, above all overlays including modals and full-screen settings.
- ~~MUST limit a toast to one line of ≤ ~5 words plus an optional value.~~
  **→ Superseded by R9: a toast is one line that names the object exactly, capped at 60 characters.
  Past that, truncate the object name with an ellipsis — never the verb. The five-word cap could not
  coexist with the exact-echo rule below.**
- MUST write toasts as `<object> <past-participle>` in sentence case, with no terminal period and no exclamation mark.
- MUST give every toast an × dismiss, and MUST also auto-dismiss it.
- MUST NOT put a required action, a link, or an explanation in a toast.
- MUST NOT use a toast to report an error the user must fix — use an inline error or a critical banner.
- SHOULD fire a toast for every successful mutation, including ones inside modals and drawers.
- SHOULD echo the object's exact UI name in the toast, including parentheticals.

### 5.2 Banners

Two visual families ship in these screenshots. Eyvar must standardise on **one**.

**Family A — split banner (the store admin)** [observed]
A rounded rectangle with a **saturated tone-coloured header strip** carrying the status
icon + the title, and a **lighter body area** below carrying the sentence(s) and any
action buttons/links. Placed as the first element of the **content block, spanning main +
rail** — directly under the page header and above the first card. It is *not* confined to
the main column: in `02-orders/draft-order-validation-error-banner.webp` and
`09-discounts/discount-detail-shareable-link-modal.webp` the banner runs x 196→700 img px,
while the main column alone ends at 526. [observed]

- Success: solid green strip, white text, ✓ icon. "✓ Added Custom Notebook" over body "Add another product, view products with an active status, or add a package for shipping." — the body is three underlined inline links in one sentence — with an **×** at the far right of the green strip. `03-products/product-detail-created-success-banner.webp` [observed]
- Success with next step: "✓ FREESHIPPING10 was created successfully. What's next?" over body "Use a shareable link to promote your discount code via email or social media. This discount will be applied at checkout when customers use this link." plus a secondary button **"Get shareable link"**. `09-discounts/discount-detail-shareable-link-modal.webp` and `09-discounts/discount-detail-promote-menu.webp` [observed]
- Success with next step, short form: "✓ Sample product added" / "Delete at any time or edit to make it your own." / button "Preview product page" / × dismiss. `03-products/product-detail-setup-guide-sharing-details.webp` [observed]
- Warning/attention: amber strip, dark text, ⚠ icon. "⚠ Erasure request submitted" over "This customer's personal information will be erased from your store on **Jan 18, 2024**. Learn more about the process of erasure requests." plus secondary button **"Cancel request"**. **No × — this banner is state, not news.** `04-customers/customer-detail-erasure-request-banner.webp` [observed]
- Warning, app-level: "⚠ This app needs your attention" / "Shop has noticed your store doesn't meet shopping requirements." / button "Open app". No ×. `11-apps-and-channels/app-detail-shop-channel-needs-attention.webp` [observed]
- Critical: solid red strip, white text, ⓘ-in-circle icon. "To save this draft order, 1 change needs to be made:" over "Activate a direct credit card gateway for this store." No ×. The page's Duplicate/Share actions render disabled while it is up. `02-orders/draft-order-validation-error-banner.webp` [observed]

**Family B — soft banner (the account/auth surfaces)** [observed]
A single tinted rounded card, no strip: pale background of the tone, a filled circular
icon at left, bold title, optional body line under it, **×** at top-right.
- Success: "✓ Account information updated" (title only, no body). `15-account/account-general-updated-banner.webp` [observed]
- Warning: "! Verification email sent" / "Please verify your email address by following the link sent to jsmith.mobbin@gmail.com." `15-account/account-general-verification-email-sent.webp` [observed]
- Success, in-card on auth: "✓ Your email has been verified" and "✓ A link to reset your password has been emailed to you." — same soft style, rendered *inside* the login card between the heading and the first field. `00-auth/login-email-verified-banner.webp`, `00-auth/login-reset-link-sent-banner.webp` [observed]

**Banner inside a card** [observed] — banners also appear scoped to a card when the
condition is about that card only: `10-settings/settings-payments-setup-shopify-payments-modal.webp`
shows a pale-blue info banner inside the PayPal card, "ⓘ Complete your Paypal account
setup to start receiving payouts from PayPal." Scope the banner to the smallest container
the problem belongs to.

**Banner inside a modal** [observed] — `11-apps-and-channels/app-uninstall-confirm-modal.webp`
places a warning banner as the first element of the modal body, above the acknowledgement
checkbox.

**Dismiss rule, as observed**: banners announcing *news about a completed action* **usually**
carry an ×; banners describing a *standing condition* (erasure pending, app needs attention,
validation blocking save) do not. The split is not clean in the source: a counterexample sits
inside this section's own evidence — "✓ FREESHIPPING10 was created successfully. What's
next?" in `09-discounts/discount-detail-shareable-link-modal.webp` announces a completed
action and has **no ×** on its green strip.

**Rules**
- MUST place page-level banners as the first element of the **content block, spanning main + rail**, below the page header and above all cards. *(Was: "of the main column" — the measured banners span the whole block.)*
- MUST scope a banner to a card when the condition belongs to that card only.
- MUST give a banner an icon, a title, and — for anything beyond a bare confirmation — one body sentence.
- MUST omit the × on banners that describe a standing condition; SHOULD include it on banners announcing a completed action. *(Downgraded from MUST: Shopify itself ships a completed-action banner with no × — see the dismiss rule above.)*
- MUST disable the page's primary/save actions while a critical validation banner is showing, and MUST state the count and the fix ("…1 change needs to be made:").
- SHOULD give success banners a next-step affordance — either a secondary button ("Get shareable link", "Preview product page") or inline links inside the body sentence.
- MUST NOT stack more than one page-level banner; merge conditions into one banner with a count.
- MUST NOT use a banner where a toast would do (no next step, no standing condition).
- **-> Settled by R1: Family B (soft tinted card), everywhere.** Original recommendation, retained
  for its reasoning: Eyvar MUST pick one banner family and use it everywhere. **Family B (soft tinted card)** — it is the newer surface, reads better at small sizes, and survives dark mode; the saturated strip of Family A is heavy and locks white-on-colour text.

### 5.3 Modals and dialogs

**Layout, identical in all 14 modals read** [observed]
1. **Header**: title in sentence case at the left, **×** at the far right. No icon in the header. No subtitle in the header — subtitles live in the body's first line.
2. **Body**: left-aligned, padded, scrollable when tall (`03-products/product-edit-bulk-edit-prices-modal.webp` scrolls a long variant list under a fixed header/footer).
3. **Footer**: a divider, then actions **right-aligned**, secondary first, primary last. Cancel is always a plain/low-emphasis button; the primary is filled.
4. A scrim dims the page behind (the canvas goes `#EBEBEB` → ~`#777777`, i.e. ~50% black). The modal is **vertically centred** in every sample [observed]. Measuring the white-region bounding box of eight scrimmed modals — `products-list-archive-confirm`, `customer-segment-delete-confirm`, `products-list-create-view`, `order-detail-mark-as-paid`, `customer-erase-personal-data`, `settings-payments-cash-on-delivery`, `marketing-automation-template-detail`, `app-uninstall-confirm` — every one centres at y≈239–243 of the 473 px UI area, whose true centre is 236.5. The earlier "near the upper third, not centred" claim was wrong.

**Sizes** [observed, as a fraction of the 768px-wide render]
- Small ≈ 43% width — confirmations and one-field forms: `03-products/products-list-archive-confirm-modal.webp`, `04-customers/customer-segment-delete-confirm-modal.webp`, `03-products/products-list-create-view-modal.webp`, `02-orders/order-detail-mark-as-paid-modal.webp`.
- Medium ≈ 43–45% but tall, with sections — `04-customers/customer-erase-personal-data-modal.webp`, `10-settings/settings-store-details-edit-profile-modal.webp`, `10-settings/settings-payments-cash-on-delivery-modal.webp`, `11-apps-and-channels/app-uninstall-confirm-modal.webp`.
- Large ≈ 68% — content-rich informational modals: `06-marketing/marketing-automation-template-detail-modal.webp`.
- `[Polaris]` The underlying scale is small 380px / default 620px / large 980px; not measurable here.

**Destructive confirmation** [observed] — three consistent rules:
- Title is a **question naming the object and the count**: "Archive 3 products?", "Delete Email subscribers?", "Uninstall Shop?". Sentence case, question mark.
- Body states the **consequence**, not the mechanics, and says what will *not* happen where that reduces fear: "No customer profiles will be deleted, only the segment will be removed." (`04-customers/customer-segment-delete-confirm-modal.webp`); "Archiving products will hide them from your sales channels and Shopify admin. You'll find them using the status filter in your product list." (`03-products/products-list-archive-confirm-modal.webp`).
- Primary button **repeats the verb + object**: "Archive products", "Delete segment", "Erase personal data", "Uninstall". Never "OK", "Yes", or "Confirm" — not once in any screenshot.
- **Colour encodes reversibility** [observed]: irreversible → red filled primary ("Delete segment", "Erase personal data", "Uninstall"); reversible → normal dark primary ("Archive products", "Mark as paid", "Request customer data").
- **High-consequence actions add a required acknowledgement**: `11-apps-and-channels/app-uninstall-confirm-modal.webp` contains a warning banner, a checkbox "I understand the risks of uninstalling this sales channel.", a privacy sentence linking "data privacy", an optional reason `<select>`, and an optional 250-char feedback textarea — all before Cancel / Uninstall.

**Informational modal with icon-led rows** [observed] — `04-customers/customer-erase-personal-data-modal.webp`
and `04-customers/customer-request-data-modal.webp` share one shape: 2–3 rows, each an
outline icon at left + bold row title + a paragraph, one of which ends in "Learn more".
Used when a single action has several distinct consequences that each need a name
("Erase identifiable information", "Email confirmation"; "Share customer data", "Request
timeline"). Footer: Cancel + the verb.

**Picker / list modal** [observed] — `09-discounts/discount-select-type-modal.webp`:
title "Select discount type"; four full-width rows, each bold label + one-line
description, with a category badge and a **chevron** at the right; the row *is* the
action. Footer has **Cancel only** — no primary. `06-marketing/marketing-build-campaign-activity-modal.webp`
is the same shape plus a tab bar (All / Ads / Email / Social Post / SMS / Other) and a
metadata line using ` • ` separators. Selecting a row closes the modal and navigates to a
full page.

**Form modal** [observed] — fields stacked or in a 2-up grid, helper text directly under
each field, primary **disabled until valid/dirty**: "Create view" is greyed until a name
is typed (`products-list-create-view-modal.webp`, with a `0/40` character counter),
"Save" is greyed on an untouched Edit profile (`10-settings/settings-store-details-edit-profile-modal.webp`),
"Done" is greyed on an untouched Edit prices (`03-products/product-edit-bulk-edit-prices-modal.webp`).
Constraints stated as helper text, not as errors after the fact: "Displays to customers
when they're choosing a payment method." (`10-settings/settings-payments-cash-on-delivery-modal.webp`);
"Save the product to edit more variant details." sits just above the footer in
`03-products/product-edit-variant-detail-modal.webp`.

**Read-only / utility modal** [observed] — `09-discounts/discount-detail-shareable-link-modal.webp`:
title "Get a shareable link", one explanatory paragraph, a read-only URL field with an
inline "Copy link" button, and a footer with a single **"Close"** — no Cancel, no primary,
because nothing is being committed.

**Modal vs full page vs drawer** [observed]
- **Modal** when the task is short, self-contained, and needs no context from the page behind it.
- **Full page** when the task is long, multi-section, legally consequential, or the result needs a URL: app install consent (`11-apps-and-channels/app-install-permissions-consent.webp`, header carries "Cancel" + "Install app"), merge customers (`04-customers/customer-merge-review-merged-record.webp`), creating a discount after the picker modal (`09-discounts/discount-detail-promote-menu.webp`).
- **Drawer** when the user must keep reading or editing the page while the surface is open — see §5.5.

**Rules**
- MUST lay every modal out as header (title + ×) / body / right-aligned footer with secondary before primary.
- MUST title destructive confirmations as a question naming object and count, and MUST label the primary with the verb + object.
- MUST use a red primary only for irreversible actions; reversible ones use the standard primary.
- MUST require an explicit acknowledgement checkbox for actions that destroy data belonging to third parties or cannot be undone at all.
- MUST disable a form modal's primary until the form is valid and dirty.
- MUST use a single "Close" (no Cancel/primary pair) for modals that commit nothing.
- MUST NOT label a confirm button "OK", "Yes", "Confirm", or "Submit".
- MUST NOT put permission grants, legal consent, or flows longer than one screen of scrolling in a modal.
- SHOULD state what will *not* be affected when a destructive action's blast radius is ambiguous.
- SHOULD use the icon-led row layout when one action has multiple named consequences.
- SHOULD give picker modals no primary button — the row is the action, and the footer holds Cancel alone.

### 5.4 Popovers, menus and tooltips

**Action menu** [observed] — `02-orders/order-detail-more-actions-menu.webp`: triggered by
a "More actions ⌄" button in the page header; the popover is a white rounded card with a
soft shadow, right-edge-aligned to the trigger, opening downward. Rows are 16px-ish
outline icon + label, left-aligned, one line each: Duplicate / Cancel order / Archive /
Print order page / Print packing slips / View order status page. Labels are **verb-first
imperatives**, sentence case, no trailing punctuation.

**Row overflow menu** [observed] — `04-customers/customer-segments-row-actions-menu.webp`:
triggered by a "⋯" at the row's right edge; **text-only, no icons**; Use segment /
Duplicate / Export / Rename, then a gap and **"Delete" in red** as the last item. The
destructive item is always last and always separated.

**Bulk action menu** [observed] — `03-products/products-list-bulk-more-actions-menu.webp`:
opened from the "⋯" on the floating bulk-selection bar; items are **grouped by divider**
— (Archive products, Delete products) / (Include in sales channels, Exclude from sales
channels) / (Include in markets, Exclude from markets) / (Add tags, Remove tags) / (Add
to collection(s), Remove from collection(s)). Paired opposites sit adjacent. Note "Delete
products" is *not* red here [observed] — the confirmation modal carries the danger
signal instead.

**Bulk selection action bar** [observed] — a floating **white** bar: white surface, **light
hairline** border, soft shadow, ~8 px radius (C13 — the "dark-outlined pill" printed here was
wrong; §3.3 and §1.4 are right). It sits at the bottom-centre **of the list card** — bar centre
x≈445 against card centre x≈448, *not* viewport centre 384 — and holds the 2–3 most common bulk
actions inline ("Bulk edit", "Set as active", "Set as draft") plus "⋯" for the rest.
`03-products/products-list-bulk-selection-action-bar.webp`,
`03-products/products-list-bulk-more-actions-menu.webp`,
`03-products/products-list-archive-confirm-modal.webp`.

**Sort popover** [observed] — `03-products/products-list-sort-popover.webp`: small muted
section heading "Sort by", a radio group of fields (Product title / Created / Updated /
Inventory / Product type / Vendor), a divider, then a direction pair "↑ A-Z" / "↓ Z-A"
with the active one highlighted. **The popover stays open** while the user changes both
axes — no Apply button, no Cancel.

**Colour picker popover** [observed] — `05-online-store/theme-editor-color-scheme-picker.webp`:
saturation/value square + vertical hue strip, a hex field with a live swatch, then
"Recently selected" and "Currently used" swatch rows. Also stays open; changes apply live
to the preview.

**Shortcut menu** [observed] — `13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp`:
icon + label + **keyboard shortcut chips** (`#` then a letter) + chevron per row. Shortcuts
are shown as separate small keycap chips, right-aligned before the chevron.

**Tooltip** [observed] — `03-products/products-list-draft-tab-create-view-tooltip.webp`:
small light rounded rect with dark text, "Create view", positioned **above** the icon-only
trigger. Two words, sentence case, no period. `03-products/product-detail-setup-guide-mark-as-done.webp`
shows "Mark as done" on the task's circle toggle in the guide drawer — the tooltip is what
tells you the circle is clickable.

**Notification popover** [observed] — `12-notifications/alerts-popover-with-channel-issue.webp`:
anchored under the bell (which carries an unread dot), a wide card with header "Alerts" +
two icon controls (filter, settings) at the right. Each alert is: muted source + relative
time ("Apps • 2 minutes ago"), bold one-line title ("There's an issue with Shop"), then a
body sentence with the instruction ("Review an issue that may impact sales or how you
promote products. Go to the channel for more details."). A centred muted footer reads
**"No more alerts"** — the end-of-list state is stated, not left blank.

**Rules**
- MUST anchor popovers to their trigger, align to the trigger's near edge, and open downward unless clipped.
- MUST write menu items as verb-first imperatives in sentence case with no trailing punctuation.
- MUST place a destructive menu item last, visually separated, and in the critical colour — *unless* a confirmation modal follows, in which case plain styling is acceptable.
- MUST group paired opposites adjacently and separate groups with dividers in menus longer than ~5 items.
- MUST keep setting-style popovers (sort, colour, date) open across changes and apply immediately — no Apply/Cancel.
- MUST give every icon-only control a tooltip naming its action in ≤3 words.
- MUST show an explicit end-of-list line ("No more alerts") rather than an empty popover.
- SHOULD use icons in header-level action menus and omit them in row overflow menus.
- SHOULD surface keyboard shortcuts as keycap chips inside the menu that invokes the action.

### 5.5 Side panels / drawers

**Anatomy** [observed across 4 drawers]
- Right-anchored, full content height, white surface, a single vertical divider from the page. Header: title at left, **×** at right. Optional one-line subtitle under the title ("Create new segments using customizable templates." — `04-customers/customer-segment-templates-panel.webp`).
- **No scrim in three of four samples** — the page behind stays **fully legible** [observed]. That it also stays **fully interactive** is `[inferred]`: `01-home/home-guide-side-panel-in-progress.webp` shows the same checklist live in the page body *and* the drawer simultaneously, which is suggestive but is not proof that the page accepts input. Legibility alone is the drawer's reason to exist.
- Widths vary by job: **~406 px** (~26% of viewport) for the Add-menu-item form sheet and a similar figure for the guide panel; **~648 px** (~42%) for the segment templates panel, which needs two internal columns. These are the C12-ruled figures — §4.7's "~330 px" for both was wrong.
- A drawer that **commits** something pins its actions to the bottom of the drawer, right-aligned: "Cancel" + "Add" (disabled) in `05-online-store/navigation-add-menu-with-add-item-panel.webp`. A drawer that only **offers** things has a single "Close" (`customer-segment-templates-panel.webp`) or no footer at all (`home-guide-side-panel-in-progress.webp`).
- Content is ordinary page content, not a compressed form: `04-customers/customer-segment-templates-panel.webp` runs a category list (with chevrons) beside template cards that each carry an icon, title, description, a syntax-highlighted query preview, and a "Use this template" button. `05-online-store/themes-connect-github-repository-panel.webp` runs Account / Repository selects, a "Filter branches" field, then result rows each with their own "Connect" button, and a persistent account footer.

**When a drawer beats a modal** [observed]
- The user must **compare** the panel against the page (segment templates against the query editor being built).
- The user must **keep working** on the page while the panel is open (setup guide against the product being edited — `03-products/product-detail-setup-guide-sharing-details.webp`, `03-products/product-detail-setup-guide-mark-as-done.webp`).
- The panel is a **browse-and-pick catalogue** with more items than a menu can hold.
- The panel's flow may take several attempts (branch filtering, template hunting) and should not feel like an interruption.

**Rules**
- MUST anchor drawers to the right edge, full height, with title + × in the header.
- MUST omit the scrim and keep the page behind interactive when the drawer's purpose is to be consulted against the page.
- MUST pin committing actions to the drawer's bottom edge, right-aligned, primary last, disabled until valid.
- MUST use a single "Close" when the drawer commits nothing.
- SHOULD size the drawer to its content: narrow for a checklist or 2-field form, wide when the drawer needs internal columns.
- SHOULD use a drawer instead of a modal whenever the user would otherwise have to close the overlay to read the page.
- MUST NOT nest a modal inside a drawer.

### 5.6 Onboarding and guidance surfaces

**The setup-guide card** [observed] — `01-home/home-get-ready-to-sell-setup-guide-accordion.webp`
- Sits inside a page-level section headed by an h1 + subtitle ("Get ready to sell" / "Based on what you've told us, here's a guide to get started. As your business grows, you'll get fresh tips and insights here.").
- Card header: title "Setup guide", subtitle "Use this personalized guide to get your store up and running.", a **collapse chevron** and a **"⋯" overflow** at the right (`01-home/home-send-feedback-and-magic-cards.webp`).
- Progress line: **`1 / 11 completed`** in muted text, followed by a thin two-tone progress bar. The same pattern at other scales: `8 / 11 completed` (`01-home/home-guide-side-panel-in-progress.webp`), `1 / 6 completed`, `0 / 6 completed`, and `1/5 tasks complete` in Finances (`08-finances/finances-get-started-tasks-checklist.webp`).
- Body: **group accordions** — "Add products", "Set up your online store", "Store settings", "Launch your online store" — each a full-width row with a chevron. Only one group is open at a time [observed].
- Inside a group: task rows with a circular state icon at left (dashed/animated ring = not started, filled dark ✓ = done), bold task title, and — **only for the expanded task** — a description paragraph ending in a "Learn more" link, one primary button, an optional secondary button, and a small illustration at the right. `01-home/home-get-ready-to-sell-setup-guide-accordion.webp` shows "Add your first product" expanded with "Write a description, add photos, and set pricing for the products you plan to sell. Learn more" + [Add product] [Import products]; `product-detail-setup-guide-sharing-details.webp` shows "Add sharing details" with [Add sharing details] [Learn more].
- A completed guide collapses to a **"✓ Done"** line and reveals a **"Dismiss guide"** secondary button at the card's bottom-right. `01-home/home-send-feedback-and-magic-cards.webp`, `01-home/home-setup-guide-side-panel-completed.webp` [observed]
- Between the guide and the educational cards sits a centred muted **"⊘ All caught up"** divider. `01-home/home-get-ready-to-sell-setup-guide-accordion.webp` [observed]

**The guide drawer** [observed] — the same checklist mirrored into a right drawer while
the user does the work: header "Get your first 10 sales" + ×, "1 / 6 completed" +
progress bar, the task list with circle toggles, the expanded task's description + a
"Learn more" button, and at the bottom **"Next guide"** with a full-width secondary button
naming it ("Setup guide"). A tooltip reading **"Mark as done"** sits on a task's circle
[observed for the tooltip's existence and position] — so tasks are manually completable, not
only auto-detected. That **hover** is the trigger is `[inferred]`; a static frame shows the
tooltip, not the gesture.
`01-home/home-guide-side-panel-in-progress.webp`, `01-home/home-setup-guide-side-panel-completed.webp`,
`03-products/product-detail-setup-guide-mark-as-done.webp`

**Task-list variant** [observed] — `08-finances/finances-get-started-tasks-checklist.webp`
uses a hero card ("Get started with finances on Shopify" / "Start getting the most from
your store's finances by completing these tasks." + a line-chart illustration), "1/5
tasks complete", then each task as its own tinted sub-card with a coloured round icon,
bold title, one-sentence rationale, and a **→ arrow** at the right instead of buttons
(the whole row navigates). A **"Show completed tasks ⌄"** control hides finished work.

**Numbered variant** [observed] — `11-apps-and-channels/point-of-sale-quick-start-guide.webp`
uses numbered section headings ("1. Set up point of sale", "2. Store settings", "3. Get
ready to sell in person") with accordion tasks under each, plus a right-hand educational
carousel card (image, title, body, dot indicators, ‹ › arrows).

**Educational / dismissible cards** [observed]
- Standard shape: bold title, 1–2 sentence body, exactly one button, illustration at the right, and a dismiss affordance — either a "⋯" menu in the card corner (`01-home/home-send-feedback-and-magic-cards.webp`: "Write product descriptions in seconds" / "Automatically generate unique and compelling descriptions with Shopify Magic. Add a new product description or edit an existing one to get started." / [Try Shopify Magic]) or a bare × (`06-marketing/email-app-overview-with-sent-toast.webp`: "Create brand consistency across your emails" / [Customize template branding] with an × top-right).
- Titles are **outcome statements**, not feature names: "Write product descriptions in seconds", "Get inspired to launch your business", "Check out faster with easy-to-use POS", "Discover more of Shopify".

**Feedback card** [observed] — `01-home/home-send-feedback-and-magic-cards.webp`: "Send
feedback", radio pair "This is useful" / "This isn't useful", an "Additional comments"
textarea, then [Send feedback] (disabled until a radio is chosen) + a plain "Cancel".

**Rules**
- MUST show progress on any checklist as `<done> / <total> completed` plus a progress bar.
- MUST make guide tasks manually completable ("Mark as done") as well as auto-detected.
- MUST expand at most one task at a time and show the description, links, and buttons only for the expanded task.
- MUST make a completed guide dismissible ("Dismiss guide") and MUST NOT resurrect it afterwards.
- MUST give every educational card a dismiss affordance (× or overflow menu) and exactly one call to action.
- SHOULD mirror an in-page guide into a drawer when the tasks are performed on other pages.
- SHOULD title educational cards with the outcome, not the feature name.
- SHOULD end each task description with a "Learn more" link rather than lengthening the description.
- MUST NOT use modal wizards, coach-mark tours, or blocking overlays for onboarding.

### 5.7 UX writing rules

**Sentence case, everywhere** [observed] — page titles ("Store details", "Merge
customers"), card titles ("Payment capture method", "Minimum purchase requirements"),
modal titles ("Set up Cash on Delivery (COD)", "Request customer data"), buttons ("Add
product", "Create discount", "Get shareable link"), menu items, tabs, empty-state
headings, toasts, tooltips. The only capitalised-mid-sentence words are proper nouns and
product names (Shopify Payments, Shopify Magic, PayPal, POS Pro, Cash on Delivery (COD)).
No Title Case appears anywhere in the 68 screens read.

**Buttons are verbs (or verb + object)** [observed] — Add product, Create discount, Create
segment, Import products, Export, Archive products, Delete segment, Erase personal data,
Uninstall, Mark as paid, Request customer data, Activate Cash on Delivery (COD), Complete
setup, Get shareable link, Copy link, Send invoice, Collect payment, Send feedback, Try
Shopify Magic, Turn on automation, Dismiss guide, Use this template, Preview product page.
The only non-verb button labels observed are the dialogue-closing ones: Cancel, Close,
Done, Save, Discard.

**No exclamation marks in system copy** [observed] — none of the 12 toasts, none of the
banners, none of the modal bodies, and none of the empty states contains one. **Every
exclamation mark in the set is inside *user-authored* content**: the order note "First
customer and order!" (`02-orders/order-detail-items-fulfilled-toast.webp`), a timeline
comment ("This order is the first order from our brand new store!" —
`02-orders/order-detail-timeline-comment-composer.webp`), and the blog post titled "New
arrivals!" (`05-online-store/blog-posts-list.webp`). There are at least three, not one — the
rule survives, but the "single exclamation mark found in any screenshot" phrasing did not.
The system never exclaims; the merchant may.

**Empty states** [observed] — the heading states **the value of the section**, not the
absence of data:

| Screen | Heading | Body | Actions |
|---|---|---|---|
| `04-customers/customers-empty-state.webp` | "Everything customers-related in one place" | "Manage customer details, see customer order history, and group customers into segments." | [Import customers] [Add customer] |
| `09-discounts/discounts-empty-state.webp` | "Manage discounts and promotions" | "Create discount codes and automatic discounts that apply at checkout. You can also use discounts with compare at prices." | [Create discount] |

Both sit inside a page-width card with a centred illustration above the heading, and both
are followed — *outside* the card — by a centred **"Learn more about `<noun>`"** line.
Contrast with a *zero-data* state, which is not an empty state: metric cards keep their
chrome and read "There was no data found for this date range."
(`07-analytics/analytics-dashboard-today-no-data.webp`) with no illustration and no CTA.
A scoped search with no query shows only "Search for orders"
(`14-global-search/search-modal-scoped-to-orders-empty.webp`).

**"Learn more about `<noun>`" convention** [observed] — the standing help link is a
centred, muted line below the page's last card, with **only the noun hyperlinked**:
"Learn more about **customers**", "Learn more about **discounts**", "Learn more about
**segments**" (`04-customers/customer-segments-row-actions-menu.webp`), "Learn more about
**payments**" (`10-settings/settings-payments-manual-methods-cod-activated.webp`), "Learn
more about **merge customers**" (`04-customers/customer-merge-review-merged-record.webp`).
Inside banners, cards and modal rows the same link degrades to a bare **"Learn more"**
appended to the end of the sentence.

**Errors** [observed] — imperative, tells the user what to do, never blames, no "please",
no period: "Enter a valid email address" (`00-auth/login-email-validation-error.webp`).
Page-level: state the count and the required change — "To save this draft order, 1 change
needs to be made:" / "Activate a direct credit card gateway for this store."
(`02-orders/draft-order-validation-error-banner.webp`).
The one "Please" found is in an account-level warning, not a validation error: "Please
verify your email address by following the link sent to jsmith.mobbin@gmail.com."
(`15-account/account-general-verification-email-sent.webp`) — treat that as the exception,
not the pattern.

**Second person, active voice** [observed] — "You'll find them using the status filter in
your product list.", "You can share this discount link with your customers via email or
social media.", "Displays to customers when they're choosing a payment method.",
"Generally, you should respond to a request from a customer within 30 days."

**Helper text under fields, not tooltips** [observed] — "Appears on your website.",
"Receives messages about your store. For sender email, go to notification settings.",
"Customers must enter this code at checkout.", "Manually enter codes that are longer than
6 numbers."

**Copy do / don't**

| Do (real string, screen) | Don't | Why |
|---|---|---|
| "Settings saved" — `10-settings/settings-store-details-saved-toast.webp` | "Your settings have been saved successfully!" | One line naming the object exactly, ≤60 characters (R9 — the old ≤5-word cap is void); no exclamation, no "successfully" |
| "Archive 3 products?" — `03-products/products-list-archive-confirm-modal.webp` | "Are you sure?" | The title must name the object and the count |
| "Archive products" (primary) — same screen | "OK" / "Yes" / "Confirm" | The button restates the action so it reads correctly out of context |
| "No customer profiles will be deleted, only the segment will be removed." — `04-customers/customer-segment-delete-confirm-modal.webp` | "This action cannot be undone." alone | Say what survives, not just that it's scary |
| "Enter a valid email address" — `00-auth/login-email-validation-error.webp` | "Invalid email!" / "Please enter a valid email." | Imperative fix, no blame, no "please", no exclamation |
| "To save this draft order, 1 change needs to be made:" — `02-orders/draft-order-validation-error-banner.webp` | "There were errors on this page." | Count the problems and name the fix |
| "Everything customers-related in one place" — `04-customers/customers-empty-state.webp` | "No customers found" | Empty states sell the section; they don't report a null |
| "Learn more about **customers**" — same screen | "Click here for more information" | Only the noun is the link; never "click here" |
| "Write a description, add photos, and set pricing for the products you plan to sell." — `01-home/home-get-ready-to-sell-setup-guide-accordion.webp` | "Products are the items you sell." | Tell the user what to do, not what a noun means |
| "Activate Cash on Delivery (COD)" → toast "Cash on Delivery (COD) activated" — `10-settings/settings-payments-cash-on-delivery-modal.webp`, `settings-payments-manual-methods-cod-activated.webp` | Button "Activate" → toast "Payment method enabled" | The confirmation must echo the button's exact object |
| "This app needs your attention" — `11-apps-and-channels/app-detail-shop-channel-needs-attention.webp` | "Warning: configuration problem detected" | Plain second-person language, no system jargon |
| "No more alerts" — `12-notifications/alerts-popover-with-channel-issue.webp` | (blank popover) | State the end of a list explicitly |
| "Displays to customers when they're choosing a payment method." — `10-settings/settings-payments-cash-on-delivery-modal.webp` | (tooltip on an ⓘ icon) | Constraints and consequences go under the field |
| "Use this personalized guide to get your store up and running." — `01-home/home-get-ready-to-sell-setup-guide-accordion.webp` | "Welcome! Let's get you set up!! 🎉" | No exclamations, no emoji in system copy |

**Rules**
- MUST write every label, title, button, and message in sentence case; only proper nouns and product names are capitalised mid-string.
- MUST label buttons with a verb or verb + object; the only permitted non-verb labels are Cancel, Close, Done, Save, and Discard.
- MUST NOT use exclamation marks, emoji, or "successfully" in system-generated copy.
- MUST write errors as imperatives that name the fix, without "please", "invalid", "failed", or blame.
- MUST title empty states with the value of the section and give them an illustration, a one-to-two-sentence body, and at least one action.
  **→ Narrowed by R8: this applies to whole-page, zero-records-ever empty states only.**
- MUST use "Learn more about `<noun>`" with only the noun linked for page-level help, and a bare "Learn more" appended inline elsewhere.
- MUST echo the triggering button's exact object in the resulting toast or banner.
- MUST address the user as "you" and the store's data as "your".
- MUST put constraints and consequences in helper text under the field, not in a tooltip.
- MUST NOT end a toast, tooltip, badge, or menu item with a period; MUST end banner and helper *sentences* with one.
- SHOULD state what will not change alongside what will, in any destructive confirmation.
- SHOULD state end-of-list and no-data conditions in words rather than leaving a surface blank.

---

## 6. Applying This to Eyvar Admin

Eyvar Admin today is a single-file app (`eyvar_ops_panel_v40_fixed.html`, 21,857 lines,
41 `.page` divs, 21 settings sub-panes) with its own token set declared in the `:root`
block at L11–L21. This section is the bridge: what Eyvar already has, where it diverges
from §1–§5, and which divergences are **sanctioned deviations** versus **defects**.

Read the Precedence ladder in the header before this section. §1–§5 describe Shopify;
this section is what binds.

### 6.1 Current Eyvar token inventory (`eyvar_ops_panel_v40_fixed.html` L11–L21)

All 24 colour variables, verified line by line:

| Eyvar token | Value | Line | Role today |
|---|---|---|---|
| `--bg` / `--sb-bg` | `#EEF0F3` | L19, L12 | Page canvas + sidebar |
| `--bg2` | `#F8F8F5` | L19 | Subdued fills (table headers, footers, icon buttons) |
| `--white` | `#fff` | L19 | Card and page surface |
| `--border` / `--border2` | `#E4E2DA` / `#DDDBD3` | L20 | Hairlines (rendered at `.5px`) |
| `--ink` / `--muted` / `--ghost` | `#1A1A18` / `#6B6B68` / `#9B9B97` | L18 | Text ramp |
| `--blue` / `--blue-lt` / `--blue-dk` | `#185FA5` / `#E6F1FB` / `#0C447C` | L12 | Primary action + interactive |
| `--green` / `--green-lt` | `#27500A` / `#EAF3DE` | L15 | Success |
| `--amber` / `--amber-lt` / `--amber-dk` / `--amber-border` | `#E8A33D` / `#FAEEDA` / `#633806` / `#E0B368` | L14 | Warning |
| `--red` / `--red-lt` / `--red-border` | `#A32D2D` / `#FCEBEB` / `#E8A9A9` | L16 | Critical |
| `--teal` / `--teal-lt` | `#0B6B6B` / `#E1F5EE` | L13 | Extra badge tone |
| `--purple` / `--purple-lt` | `#4A2889` / `#EDE6FB` | L17 | Extra badge tone |
| `--navy` | `#3D434B` | L12 | Logo / section text |

**Token categories that do not exist.** `:root` holds colours and nothing else — no
radius, spacing, shadow, font-size, duration, or z-index token. Every such value in the
file is a literal. This is why the "use a token" rule in §6.4 is scoped to colour only
until the set is extended; see D15–D17.

Structural facts, verified:

| Property | Eyvar today | Line | Shopify equivalent |
|---|---|---|---|
| Base font size | `13px` | L22 | ~13–14px body |
| Page title | `17px / 500` | L73 | ~20px / 600 |
| Card radius | `11px` | L88 | 12px |
| Card border | `.5px solid var(--border)` | L88 | 1px hairline |
| Sidebar | `52px` collapsed → `236px` open; `268px` in Arabic | L24, L30, L31 | ~240px, always open |
| Top bar | `50px`, **white** | L59 | ~56px, **dark** |
| Table cell padding | `9px 11px`, 12px text | L150 | rows ~40px |
| Modal | `520px`, radius `14px` | L195 | small / medium / large |
| Primary button | blue fill `#185FA5`, radius `8px` | L80 | near-black fill |
| Badge | pill `999px`, `10px / 600` | L117 | pill, tone-mapped |
| Toggle | `32×18`, green when on | L185–189 | used sparingly |
| Toast | JS-injected, bottom-right, light tinted card | L5236–5320 | dark pill, bottom-centre |
| Settings | a `.page` route (`p-settings`) | L1416 | a dismissible overlay |

### 6.2 Sanctioned deviations

Each entry names the rule it suspends. A deviation that does not name its rule is not
sanctioned — it is a defect.

| # | Deviation | Suspends | Why |
|---|---|---|---|
| D-1 | **Brand blue is the primary action colour**, not near-black | §1.1.4, §4.6 (near-black primary) | Eyvar is a branded operations product, not a Shopify app. Consequence, per R3: blue stops carrying links; links take `--blue-dk` + underline. |
| D-2 | **Higher density** — 13px base text, ~30px rows | §1.2 (type ramp), §1.3 (spacing scale), §3.1 (row height) | An ops console is watched all day on one screen. Density is the product. **This sanctions smaller values on the 4px grid — it does not sanction off-grid values** (see D18). |
| D-3 | **Light top bar**, 50px, with a `Title › Subtitle` breadcrumb | §2.1 (dark frame), §2.6 (no breadcrumbs), §2.3 (logo in the save-bar left slot) | The wordmark lives in the rail, so the top bar is free for wayfinding. The §2.3 logo rule is unimplementable on this frame and does not apply. |
| D-4 | **Two-level navigation** — an 80px icon+label workspace rail (5 targets, `Admin` pinned to the bottom) plus a 224px sub-tab column listing the selected workspace's 5–9 sub-tabs, operator-collapsible below 1344px. Both columns are route-derived. The top bar spans the content region only; the two nav columns and the content canvas are all `--bg`, separated by 1px hairlines | §2.1 (fixed ~240px nav, always expanded — R11) · §2.1 (only one nav section MAY be expanded at a time, and it MUST be the one containing the current page) · §2.1 (every primary nav item MUST have a leading icon; secondary items MUST NOT) · §2.1 (active items MUST use an inset filled white pill at both levels, and a nested active row MUST additionally carry an elbow connector from its parent) · §2.1 (the nav column MUST be a near-canvas grey one step darker than the canvas; do NOT draw a border, shadow or contrasting panel between them) · §2.1 (a dark top bar spanning the full viewport width) | Five workspaces organised by the job someone is paid to do (`DECISIONS.md` **D1**) replace a flat 30-item rail over 62 destinations. The second column holds the labels the hover expansion existed to reveal, so hover expansion has no remaining purpose. Level 1 is icon **plus** label because at the 1280px minimum viewport (**D2**) the sub-tab column defaults to collapsed, making the rail the entire visible navigation — five unlabelled glyphs are then a recall test performed all day. There is no elbow connector because parent and child sit in different columns. The tonal step is unavailable because `:root` holds no neutral darker than `--bg` and §6.4 forbids inventing one, so a 1px `--border` hairline is the separator. The top bar narrows to the content region because **D-3** already moved the wordmark into the rail, which is what made the full-width bar's left slot meaningful. |
| D-5 | **Settings is a route, not an overlay** — `Admin` is one of the five workspaces and its level-2 column is its settings nav; four former panes moved to `Financials` | §2.4 (Settings MUST open as an overlay over the current page) · §2.4 (the overlay MUST preserve the page underneath; settings MUST NOT be a route that destroys the previous page) · §2.4 (the settings shell MUST be nav ~289px + gutter ~27px + pane ~707px, centred as one ~1026px block inside the overlay) · §2.4 (settings MUST be dismissible with a single `✕` in its own header) | Under **D1** Admin is a workspace, not a drawer over one, and its 21 legacy pane keys become linkable routes — which §2.4's overlay model cannot do at all. A settings surface that *is* a workspace cannot also be an overlay over a workspace. Its nav is the same level-2 column every other workspace uses, so there is no second nav pattern to maintain. This entry **supersedes §6.3 defect D3**, which described the same behaviour as a defect; it is now a decision. |
| D-6 | **Table header cells are interactive** — each header cell for a column that declares a control is a single button opening a menu that carries that column's sort, filter and pin. A resting `⌄` chevron renders on every such header, without hover. The sort indicator is an **arrow** (`↑` / `↓`), never a chevron | §3.1 (*"Exactly one header MUST show the active sort indicator; the rest MUST show no resting affordance"* — the second half only) · §3.1's `[observed]` description of the sort indicator as a **chevron** · the derived rule *"headers are not interactive anywhere in the product"* (foundation **AC-45**, second clause) | An operations console works one list all day and needs sort, filter and pin **per column**, in the component, so no screen hand-builds them (business-owner request, `01-table-controls.md`). **AC-45's indicator clause is upheld verbatim and strengthened: exactly one column carries a sort arrow, ever.** Only its inertness clause is suspended, and the guarantee it existed to make reviewable — *a ledger cannot be sorted* — moves to a stronger carrier: `LedgerTable` has no `sort`, `setSortField`, `setSortDirection` or `clearSort` **at all**, so a sort item in a ledger header does not compile (**AC-48**, unchanged). The affordance may not be hover-only: §7.2 and the AC-68 precedent make hidden-until-hovered capability nonexistent for a keyboard operator, and §7 beats §3. The glyph split is forced: §1.5 and §9.1 translation row 9 reserve the trailing caret *"exclusively for controls that open a menu or select"*, so `⌄` cannot also mean sort — and §3.2's direction pair already uses arrows `[observed]` `03-products/products-list-sort-popover.webp`. Two interactive elements in one 32px header cell are refused: §7.7 requires ≥24×24 each and **D-2 may not be cited against §7.7**. |

**D-4 replaces the former D-4 entirely; it does not supplement it.** The former entry
sanctioned an icon rail that expanded on hover (52px → 236px). That behaviour no longer
exists in the product, and leaving the entry in place would sanction something the product
does not do.

**Rules D-4 preserves, re-asserted so they are not quietly re-derived:**

- §2.1 — *"Settings MUST be pinned to the bottom of the nav column and MUST NOT scroll with
  the nav list."* `Admin` is pinned to the bottom of the rail. This is the one §2.1 nav rule
  the deviation keeps intact.
- §2.6 — *"The app MUST NOT use breadcrumbs."* Two columns are not a breadcrumb trail. The
  `Title › Subtitle` pair sanctioned by **D-3** stays, at exactly two tokens, never three.
  Level-3 details keep the single back arrow to the inline-start of the title.
- **D-1**, **D-2** and **D-3** survive untouched. Brand blue is still the primary action
  colour; 13px base and ~30px rows still bind, smaller but never off-grid; the top bar is
  still light and still carries `Title › Subtitle`.

Nothing else is sanctioned. Adding a deviation means adding a row here, naming the rule
it suspends, before the code ships.

### 6.3 Defects

Verified against the source. Each is a divergence nobody decided on.

**Structure and surfaces**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D1 | `.page` sets `background:var(--white)` while cards are also white — the canvas/surface distinction collapses. (`body` and `.sb` do it correctly; only `.page` is wrong.) | §1.1 | `eyvar_ops_panel_v40_fixed.html:70` |
| D2 | No contextual save bar, and no wired dirty indicator. `.form-footer` exists but is used **once in the entire file** (the plan editor); the other 40 pages and all 21 settings panes have no save chrome. `.settings-dirty-dot` is defined but dead — zero other occurrences. | §2.3 | `:279`, used at `:1127`; `:248` |
| D3 | **RECLASSIFIED — no longer a defect.** Settings is a route, not an overlay. Under `DECISIONS.md` **D1**, `Admin` is one of five workspaces and its level-2 column is its settings nav, so this is now a deliberate choice: see **sanctioned deviation D-5** in §6.2, which names the §2.4 rules it suspends. The number is retained rather than reused, because D1–D24 are cross-referenced from `docs/ref/defects.md` and elsewhere. | §2.4 → **§6.2 D-5** | `:1416`, `:70–71` |
| D4 | Global search is a 230px field in the right-hand cluster, not a centred command surface. | §2.1 | `:569` |

**Status and feedback**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D5 | 11 badge tones (`b-green, b-red, b-amber, b-blue, b-teal, b-purple, b-grey, b-eco, b-com, b-gold, b-silver`) with no documented meaning map. Target is five (R7). | §3.4, R7 | `:118–129` |
| D6 | Three parallel status systems with byte-identical colours: `.b-green` = `.h-green` = `.days-ok`, each repeating `10px/600`, `2px 7px`, `999px`. | §3.4 | `:118–129`, `:131–138`, `:140–142` |
| D7 | **The toast system does not conform.** A complete system exists — `toast()` at `:5269`, 352 call sites, 4 tones, auto-dismiss with hover-pause, RTL-aware stack. Six conformance failures: it is a light tinted card not a dark pill; anchored bottom-right not bottom-centre; carries emoji glyphs (§5.7 forbids); routinely exceeds the length cap (R9); injects a clickable `· view →` link into the body (§5.1 forbids); and all 12 tone hexes are off-token. | §5.1, §5.7, R9 | `:5236–5320`, `:5272–5275`, `:5290` |
| D8 | Banners exist only as ~6 divergent inline-styled implementations — `statusBanner`, `scenarioBannerHTML()`, `commitBanner`, `approvalBanner`, `postponeBanner`, `outcomeBanner`, `reconcileBannerHTML` — with no shared component, tone map, placement rule, or dismiss rule. | §5.2, R1 | `:7124`, `:8329`, `:4313–4329`, `:5139`, `:4106` |
| D9 | Empty states are pervasive (~25) and often well written, but every one is an inline `<td colspan>` or `<div>`: no shared component, padding drifts across 14/16/20/30px, none carries the illustration/heading/action a first-run state requires. | §3.6, R8 | `:2240`, `:3438`, `:4029`, `:6495`, +~20 |
| D10 | A native `alert()` serves as a confirmation: `alert('✅ Subscription confirmed and activated!')` — violates the modal rules, the no-emoji rule and the no-exclamation rule at once. | §5.3, §5.7 | `:5233` |
| D11 | 49 `b b-red` badges in use (84 `b-red` occurrences) with no justification recorded anywhere. | R5 | file-wide |

**Tokens and drift**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D12 | **36 off-token hex colours** in the CSS block alone (44 distinct hexes outside `:root`; only 8 match a token). Includes a second brand blue `#105291`, a third green `#3B6D11`, a fourth `#1E9E5A`, a fifth `#1E7B34`, and Google's blue `#1A73E8`. | §6.4 | `:22–468`; `:80`, `:116`, `:188`, `:328`, `:341` |
| D13 | **15 distinct font sizes** (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 19, 23px) against a six-role ramp. | §1.2 | `:22–468` |
| D14 | **13 distinct border radii** (2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 99, 999px); nine are outside the permitted set. | §1.4 | `:22–468` |
| D15 | Off-grid spacing throughout — `.page{padding:18px;gap:14px}`, `.ch{padding:11px 14px}`, `td{padding:9px 11px}`, `.kpi{padding:13px 15px}`. D-2 sanctions *smaller*, not *off-grid*. | §1.3, D-2 | `:70`, `:89`, `:150`, `:104` |
| D16 | No radius, spacing, shadow, font-size or duration tokens exist, so three of the four categories §6.4 governs cannot be checked. | §6.4 | `:11–21` |
| D17 | `.5px` hairlines render inconsistently across DPRs — and **262 of the 316 occurrences are inline styles inside JS template literals**, so a CSS-only fix reaches under 18% of them. | §1.4 | 54 in CSS, 316 file-wide |
| D18 | Uppercase + letter-spacing is banned for labels but used in **8 selectors**, not one: `table.dt th`, `.sb-sec-lbl`, `.kpi-lbl`, `.sec-badge`, `.settings-tab-group-lbl`, `.ptable th`, `.live-sec-hdr`, `.ms-lbl`. | §1.2 | `:149`, `:39`, `:110`, `:227`, `:233`, `:263`, `:363`, `:367` |

**Accessibility** — see §7 for the governing rules.

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D19 | Row actions are `opacity:0` until `:hover`, with no `:focus-within` fallback — unreachable by keyboard and invisible on touch. | §7.3 | `:153–154` |
| D20 | Focus is `outline:none` with only a border-colour change, in **11 places** — 5 in the stylesheet (`.field input:focus`, `.feat-row input:focus`, `.ptable td input:focus`, `select:focus`, `.csel-search`) and **6 more inline on search inputs inside JS template literals**, which no stylesheet fix can reach. | §7.2 | `:253`, `:259`, `:268`, `:290`, `:310`; see §7.2 for the inline six |
| D21 | Text contrast fails in two places, one of them everywhere: `.hint{color:#aaa}` computes to **2.32:1** (2 uses), and **`--ghost` `#9B9B97` computes to 2.79:1 across 431 uses** — it is the default colour for every secondary label in the product. `--muted` (5.35:1) passes and already exists, so the fix needs no new token. `.b-grey` (2.62:1, 100 uses) and `--amber` as a graphic (1.88–2.16:1) also fail. | §7.1 | `:254`, `:18`; §7.1 for the full table |
| D22 | `.field label` is `11px var(--muted)` — labels read as hints. (Contrast is fine at ≈5.07:1; the defect is size and hierarchy, not colour.) | §4.2 | `:250` |
| D23 | `.modal-close` and `.feat-rm` turn red on hover, signalling destruction for a neutral dismiss. | §5.3 | `:198`, `:261` |
| D24 | Three ambient animations loop indefinitely — `ping-pulse`, `live-dot`, `reqPulse` — plus a runtime-injected `spin`, none guarded by `prefers-reduced-motion`. Under R18 all three are illegal as written: a loop may only signal "this feed is live", and may never encode severity. (`kpiFlash` runs once and is not in scope.) | §7.6, §8.1.6, R18 | `:329–331`, `:341–342`, `:145` |

**Fix order.** D1, D16 and D20 first — they are cheap and everything else compounds on
them. Then D5/D6 (collapse three status systems into one), then D7/D8 (make the shipped
toast conform, extract one banner component). D12–D15 and D17 are a mechanical sweep best
done once, after the token set exists.

### 6.4 Surface-by-surface mapping

All 41 pages. A page with no row here may not be designed until it gets one.

| Eyvar page(s) | Pattern | Section |
|---|---|---|
| `drivers`, `riders`, `trips`, `subscriptions`, `corporate`, `contacts`, `quickrides`, `plans`, `zones`, `audit-log` | Index table + view tabs + filters + bulk action bar | §3.1–3.3 |
| `applicant-detail`, `corp-detail`, `ticket-detail`, `profile` | Two-column detail: main + right rail summary, with timeline | §2.2, §3.8 |
| `plan-edit` | Sectioned form + save bar + **derived-value rules** | §4.1, §2.3, §8.2 |
| `settings` (21 panes), `my-account` | Settings shell with its own nav | §2.4, **D-5** |
| `exec-overview`, `dashboard`, `predictive`, `growth`, `coverage`, `commitment`, `fairness`, **`fraud`** | Metric tile row + chart cards | §3.7 |
| `live` | **Monitoring shell** — map + synchronised side list | §8.1 |
| `finance`, `wallets`, `rwallets` | **Ledger** — append-only, money formatting | §8.3 |
| `all-pending`, `requests`, `requests-sub-all`, `requests-instant-all`, `interventions`, `readiness`, `renewal` | **Work queue** — claim, SLA, disposition, row-level critical | §8.4 |
| `support`, `compliance`, `safety` | Index table → detail with timeline | §3.1, §3.8 |
| `inbox`, `notifications-all` | Activity feed | §3.8 |

> **`fraud` moved from Work queue to Metric tiles + chart cards.** Under `DECISIONS.md`
> **D1** it folds into **Management › Risk & Signals**, which `PROPOSED-STRUCTURE.md` §4.2
> describes as *"compute a flag, then send the operator somewhere else"* — every action
> button is a `go()` to another page (`:14320`, `:14336`, `:14351`, `:14363`) — and
> `PAGE-TRACEABILITY-MATRIX.md` row 4 states it *"has no work queue."* It has no claim, no
> SLA clock and no disposition, so §8.4's apparatus is inapplicable to it. Consequence for
> the component inventory: the work-queue pattern now governs **7** legacy pages and the
> metric-tile pattern **8**. No component is added or removed by the change.

**Rules**

- MUST treat §6.2 as the complete list of sanctioned deviations. A new deviation requires
  a row there naming the rule it suspends, written before the code ships.
- MUST NOT introduce a **colour** that is not a `:root` token. Extend `:root` instead.
- MUST NOT introduce a new **radius, font size, spacing value, shadow or duration** until
  D16 is closed and those token sets exist; until then, reuse a value already present in
  the CSS block and record it in the ticket that closes D16.
- MUST map any new page to a row in §6.4 before design starts.
- SHOULD close defects in the order given at the end of §6.3.

### 6.6 Implementation stack

Decided deliberately, after weighing headless primitives against a full design system.

**React + TypeScript + Vite · Tailwind v4 · shadcn/ui · TanStack Table · Vitest + Playwright.**

shadcn components are **copied into `src/components/ui/`**, not imported from a package, so
the team owns the source and restyles it to this document rather than fighting a library.

**What this changes, and what it does not.**

- §6.1's token model is **unchanged**. Tailwind v4 is CSS-first: `--ev-*` tokens live in
  `globals.css`, map into shadcn's semantic slots, and reach utilities via `@theme inline`.
  Tokens are still CSS custom properties in `:root`.
- Tokens are **namespaced `--ev-*`**. shadcn claims `--border`, `--muted` and `--primary`
  as its own semantic slots, and two of those collide with legacy Eyvar names carrying
  different meanings — `--muted` is *secondary text* in the legacy app and a *muted
  background* in shadcn. The prefix removes the collision permanently.
- Defect **D16 is closed by adoption**: Tailwind's 4px-based scale supplies the radius,
  spacing and type tokens that never existed. The "these categories are frozen" rule in
  §6.4 is lifted; the colour rule stands.
- §6.4's `MUST NOT introduce a colour that is not a token` gains a second clause:
  **Tailwind's built-in palette is not a token set.** `bg-blue-500` and `text-gray-400`
  bypass `--ev-*` entirely while looking legitimate, and are now the primary drift risk.
  Only semantic slots are permitted.
- §9.1 gains a **mechanical enforcer**: `"rtl": true` in `components.json` converts
  physical classes to logical ones as the CLI copies a component in. It does not cover
  hand-written code — `/token-audit` does.

**What the stack does not supply.** Banners (R1/R16), empty states (R8), and the whole of
§8 — the monitoring shell, the append-only ledger, the work queue with SLA and the R5a row
marker, derived-value fields. These are built from primitives. Four patterns, expected.

**The trade that was accepted.** shadcn's default styling is discarded, because §1–§5
govern anatomy — badge geometry (R15), banner family (R1), empty states (R8), the save bar
(R2) — and shadcn disagrees with all four by construction. The value bought is velocity
across 41 pages and a component set the team does not have to write. The cost is that
every added component must be restyled on arrival, and that discipline is what
`/token-audit` and the visual-QA pass exist to enforce.

### 6.5 Audit record

Two audits ran against the assembled document.

**Corrections applied.** The first draft of §6.3 claimed Eyvar had no toast system; a
352-call-site toast system exists at `:5236–5320`, and that entry is now a *conformance*
defect (D7). Claims that banners and empty states were absent were likewise overstated —
both ship in quantity as inline implementations (D8, D9). §6.1's `.page` line reference
was wrong (L70, not L75). The defect list has grown from 14 to 24: the omissions were the
largest divergences in the file — off-token colours, font sizes, radii, and settings being
a route.

**Known limits of the evidence.** The screenshots are 768px renders of a ~1440px viewport,
so every pixel figure in §1–§5 is a scaled approximation, not a measurement. No hover,
focus, loading, or dark-mode state appears in the sample. No responsive breakpoint can be
derived from it. Exact hex values were eyeballed from compressed WebP and should be treated
as close, not exact. §1.6 (motion) is inferred end to end and is demoted to SHOULD by R12.

---

## 7. Accessibility

> **Why this section exists.** Three defect entries in §6.3 — D19, D20, D21 — and two
> lines of the Ship checklist cite "§7" as their rule source. Until now there was no §7.
> The word `aria` appears **zero** times in `eyvar_ops_panel_v40_fixed.html`, and so does
> `focus-visible`, and so does `prefers-reduced-motion`. This section is the missing law.
>
> **Precedence.** Per the Precedence ladder, §7 is Eyvar-specific law and **overrides
> §1–§5 within its subject**. Where it does, it says so inline and names the section.
> §6.2 sanctions four deviations; none of them names §7, and §6.2's own rule is that a
> deviation which does not name its rule is not sanctioned. **Nothing in §6.2 suspends
> anything in §7.**
>
> **Claim marking.** §1–§5 use `[observed]` / `[Polaris]`. §7 needs three more, because
> its subject is not visible in a screenshot:
>
> - `[observed]` — visible in a screenshot cited on the same line.
> - `[Polaris]` — recalled from the Polaris design system, not verifiable here.
> - `[source]` — read out of `eyvar_ops_panel_v40_fixed.html` at the cited line. Trust it;
>   every one was grepped, none was recalled.
> - `[computed]` — arithmetic on `[source]` values. Contrast ratios use the sRGB relative
>   luminance formula from WCAG 2.x, rounded to two decimals.
> - `[WCAG]` — the text of a WCAG 2.2 success criterion.
>
> **What the screenshots cannot do.** The 159 captures in
> `docs/06-design-reference/shopify-admin-web/` can evidence *contrast* and *resting
> focus styling*, and they are cited for exactly that in §7.1 and §7.2. They cannot
> evidence tab order, ARIA, accessible names, live-region politeness, or screen-reader
> output — a still image has no DOM. **Nothing in §7.3, §7.4 or §7.5 carries an
> `[observed]` tag, and no reviewer may cite a screenshot to close a finding in those
> subsections.**
>
> **Citation form.** `eyvar_ops_panel_v40_fixed.html:LINE`, shortened to `:LINE` inside
> tables, matching §6.3.

---

### 7.1 Contrast

#### 7.1.1 The ratios that bind

| Content | Minimum | Source |
|---|---|---|
| Body text, labels, badge labels, table headers, hints, placeholders | **4.5:1** | SC 1.4.3 `[WCAG]` |
| "Large" text — ≥24 px, or ≥18.66 px at weight ≥700 | 3:1 | SC 1.4.3 `[WCAG]` |
| Interactive component boundaries and state indicators (input borders, checkbox/radio/toggle outlines, focus rings, selected-tab underlines) | **3:1** | SC 1.4.11 `[WCAG]` |
| Graphics required to understand content (chart strokes and fills, status dots, progress-bar fills, meter tracks) | **3:1** | SC 1.4.11 `[WCAG]` |
| Purely decorative rules, dividers, and card hairlines | none | SC 1.4.11 exception `[WCAG]` |
| Disabled controls | none | SC 1.4.3 / 1.4.11 exception `[WCAG]` |

**The large-text allowance does not exist in Eyvar.** The largest type in the file is
`.kpi-val` at `23px/500` (`:111`) `[source]`; the page title `.ph-l h1` is `17px/500`
(`:73`) `[source]`. Neither reaches 24 px, and no weight-700 run reaches 18.66 px — the
heaviest are `.settings-panel-title` at `14px/700` (`:245`) and `.sb-logo-text` at
`9.5px/700` (`:36`) `[source]`. **Every text colour in this product is measured against
4.5:1. There is no 3:1 tier to fall back on.** This is a direct consequence of §6.2 D-2
(higher density), and it is the price of that deviation: Eyvar bought density and spent
its contrast headroom doing it.

#### 7.1.2 The text ramp, measured

| Token / value | Line | On | Ratio `[computed]` | 4.5:1 |
|---|---|---|---|---|
| `--ink` `#1A1A18` | `:18` | `#FFFFFF` | **17.43** | PASS |
| `--muted` `#6B6B68` | `:18` | `#FFFFFF` | **5.35** | PASS |
| `--muted` `#6B6B68` | `:18` | `--bg2` `#F8F8F5` | **5.02** | PASS |
| `--muted` `#6B6B68` | `:18` | `--bg` `#EEF0F3` | **4.68** | PASS |
| `--ghost` `#9B9B97` | `:18` | `#FFFFFF` | **2.79** | **FAIL** |
| `--ghost` `#9B9B97` | `:18` | `--bg2` `#F8F8F5` | **2.62** | **FAIL** |
| `--ghost` `#9B9B97` | `:18` | `--bg` `#EEF0F3` | **2.44** | **FAIL** |
| `.hint` `#aaa` | `:254` | `#FFFFFF` | **2.32** | **FAIL** |
| `--blue` `#185FA5` | `:12` | `#FFFFFF` | **6.52** | PASS |
| `--blue-dk` `#0C447C` | `:12` | `#FFFFFF` | **9.84** | PASS |
| `#FFFFFF` | — | `--blue` `#185FA5` | **6.52** | PASS |

**`--ghost` is the largest single accessibility defect in the file by occurrence count.**
`var(--ghost)` appears **431 times** `[source]`, and it is the declared colour of, among
others: `table.dt th` (`:149`), `.ptable th` (`:263`), `.kpi-lbl` (`:110`), `.td-sub`
(`:156`), `.al-time` (`:169`), `.tb-sub` (`:63`), `.ph-l p` (`:74`), `.sec-sub` (`:229`),
`.dc-km` (`:177`), `.ms-lbl` (`:219`, `:367`), `.settings-tab-group-lbl` (`:233`),
`.settings-meta` (`:247`), `.live-card-route` (`:354`), `.live-sec-hdr` (`:363`),
`.ex-cell` (`:269`), `.feat-rm` (`:260`), `.csel-val.placeholder` (`:305`),
`.csel-opt-hint` (`:321`), `.aud-diff` (`:324`), `.preview-strip .lbl` (`:276`),
`.ch-tgl` (`:90`), `.neu` (`:113`), `.settings-soon` (`:242`) `[source]`. Every one of
those is failing text.

§6.3 D21 flags `.hint{color:#aaa}` (`:254`) alone. **D21 is understated: it is two
occurrences of `#aaa` against 431 occurrences of a token that fails by the same
mechanism.** Both must be closed together, and the fix is the same one.

**The fix takes no new token.** `--muted` (`#6B6B68`) passes on all three Eyvar surfaces
(5.35 / 5.02 / 4.68). Substituting `--muted` for `--ghost` and for `#aaa` closes all 433
occurrences without extending `:root` — which matters, because §6.4's rules forbid
introducing a colour that is not already a token. `--ghost` survives only for genuinely
decorative fills that carry no meaning.

`.field label` at `11px var(--muted)` (`:250`) computes to **5.35:1** on white and
**5.02:1** on `--bg2` `[computed]` — both pass. This confirms §6.3 D22's parenthetical:
the label defect is size and hierarchy, not colour. §7.1 does not add to D22.

#### 7.1.3 Badge tones, measured

Badge text is `10px/600` (`.b`, `:118`) `[source]` — **not** large text, so 4.5:1 applies
to every row.

| Selector | Line | Fill | Text | Ratio `[computed]` | 4.5:1 |
|---|---|---|---|---|---|
| `.b-green` | `:119` | `--green-lt` `#EAF3DE` | `--green` `#27500A` | **8.21** | PASS |
| `.b-amber` | `:121` | `--amber-lt` `#FAEEDA` | `--amber-dk` `#633806` | **8.72** | PASS |
| `.b-red` | `:120` | `--red-lt` `#FCEBEB` | `--red` `#A32D2D` | **6.13** | PASS |
| `.b-blue` | `:122` | `--blue-lt` `#E6F1FB` | `--blue-dk` `#0C447C` | **8.60** | PASS |
| `.b-teal` | `:123` | `--teal-lt` `#E1F5EE` | `--teal` `#0B6B6B` | **5.56** | PASS |
| `.b-purple` | `:124` | `--purple-lt` `#EDE6FB` | `--purple` `#4A2889` | **8.85** | PASS |
| `.b-grey` | `:125` | `--bg2` `#F8F8F5` | `--ghost` `#9B9B97` | **2.62** | **FAIL** |

The four undocumented tones flagged by §6.3 D5 also compute, for completeness:
`.b-eco` `#2C5F8A` on `#EEF4FB` = **6.10** `[computed]`, `.b-com` = **8.85** (identical to
`.b-purple`, which is D6's point), `.b-gold` `#7A5C00` on `#FBF3E0` = **5.66**,
`.b-silver` `#555` on `#F0F0EE` = **6.53**, all at `:126–129` `[source]`. **They pass
contrast and are still defects** — D5 removes them for having no meaning map, and R7 caps
the palette at five tones. Passing §7.1 does not exempt a tone from R7.

**`.b-grey` is the only failing tone, and it is used 100 times** `[source]`. It fails for
exactly one reason: it is the only tone that pairs a fill with `--ghost` rather than a
dark same-hue text colour. Recolouring its text to `--muted` gives 5.02:1 `[computed]` and
keeps it inside the tonal-badge rule of §1.1.5.

The parallel `.health` (`:131–138`) and `.days-*` (`:140–142`) systems repeat the badge
hexes byte-for-byte, so they inherit the same ratios — `.h-green` = 8.21, `.h-amber` =
8.72, `.h-red` = 6.13 `[computed]`. All pass. That is not a reprieve: §6.3 D6 deletes both
systems.

**Rule for text on tinted fills.** A tonal badge is not exempt because its fill is pale.
The text is measured against **the badge's own fill**, never against the card behind it,
and never against the darkest fill in the family. Shopify's tonal badges are built the
same way — pale fill, deep same-hue text `[observed]`
`03-products/products-list-default.webp`, `02-orders/orders-list-with-metrics-row.webp`.

#### 7.1.4 Non-text UI, measured

| Element | Line | Foreground | Adjacent | Ratio `[computed]` | 3:1 |
|---|---|---|---|---|---|
| Input / select / `.csel-btn` boundary | `:252`, `:301` | `--border2` `#DDDBD3` | `#FFFFFF` | **1.39** | **FAIL** |
| Card / divider hairline | `:88`, `:89` | `--border` `#E4E2DA` | `#FFFFFF` | **1.30** | exempt (decorative) |
| `.tog-sl` off-state track | `:186` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |
| `.tog-sl` on-state track | `:188` | `#1E9E5A` | `#FFFFFF` | **3.45** | PASS |
| `.kf-b` KPI bar fill | `:116` | `--blue` `#185FA5` | `--bg` `#EEF0F3` | **5.71** | PASS |
| `.kf-g` KPI bar fill | `:116` | `#3B6D11` | `--bg` `#EEF0F3` | **5.44** | PASS |
| `.kf-r` KPI bar fill | `:116` | `--red` `#A32D2D` | `--bg` `#EEF0F3` | **6.19** | PASS |
| `.kf-t` KPI bar fill | `:116` | `--teal` `#0B6B6B` | `--bg` `#EEF0F3` | **5.52** | PASS |
| `.kf-a` KPI bar fill | `:116` | `--amber` `#E8A33D` | `--bg` `#EEF0F3` | **1.89** | **FAIL** |
| `.rf-a` renewal bar fill | `:182` | `--amber` `#E8A33D` | `--bg` `#EEF0F3` | **1.89** | **FAIL** |
| `.h-amber::before` status dot | `:137` | `--amber` `#E8A33D` | `--amber-lt` `#FAEEDA` | **1.88** | **FAIL** |
| `.stars` rating glyphs | `:144` | `--amber` `#E8A33D` | `#FFFFFF` | **2.16** | **FAIL** |
| `.h-green::before` status dot | `:136` | `#3B6D11` | `#EAF3DE` | **5.43** | PASS |
| `.h-red::before` status dot | `:138` | `--red` `#A32D2D` | `#FCEBEB` | **6.13** | PASS |
| `.ping-ok` dot | `:328` | `#1E7B34` | `#FFFFFF` | **5.33** | PASS |
| `.ping-warn` dot | `:329` | `#B45309` | `#FFFFFF` | **5.02** | PASS |
| `.ping-dead` dot | `:330` | `#C62828` | `#FFFFFF` | **5.62** | PASS |
| `select` chevron stroke | `:285` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |
| `.csel-arrow` | `:306` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |

Two findings deserve naming.

**`--amber` `#E8A33D` cannot carry meaning on any Eyvar surface.** It tops out at 2.16:1
on white and sits at 1.88–1.89:1 on `--bg` and `--amber-lt` `[computed]`. Wherever it is a
*fill*, *dot*, or *stroke* that a user must perceive to read the state, it fails. It is
fine as the light half of a tonal pair — `--amber-lt` behind `--amber-dk` text is 8.72:1.
This matches Shopify, which uses **dark** text and icons on amber and reserves
white-on-solid for green and red `[observed]`
`04-customers/customer-detail-erasure-request-banner.webp`,
`11-apps-and-channels/app-detail-shop-channel-needs-attention.webp`.

**Input boundaries are the only thing identifying an Eyvar field, and they are invisible
at 1.39:1.** SC 1.4.11 exempts a component boundary when the component's own fill already
differs by 3:1 from its surroundings — but Eyvar inputs are `background:var(--white)`
(`:252`) inside white cards, so the border does all the work alone. This is the one place
in §7 that requires extending `:root`, and §6.4's rule permits that ("extend `:root`
instead"): a `--border-input` token computed at ≥3:1 against `#FFFFFF`. §1.1.3 records the
same split in Shopify — `border-input` is "deliberately stronger than card borders so
fields read as targets" `[observed]` `04-customers/customer-new-form-empty.webp`.

**Rules**

- MUST render every text run at **≥4.5:1** against its own computed background. The 3:1
  large-text tier MUST NOT be claimed by any Eyvar surface — no type in the product
  reaches 24 px or 18.66 px/700 (`:111`, `:73`, `:245`).
- MUST measure badge, chip, pill and tag text against **the tinted fill it sits on**, not
  against the card or page behind it.
- MUST NOT use `--ghost` `#9B9B97` or the literal `#aaa` as a text colour, a placeholder
  colour, or an icon stroke that identifies a control. Substitute `--muted` `#6B6B68`.
  Closes §6.3 D21 and the 431 `var(--ghost)` occurrences it omits.
- MUST recolour `.b-grey` text (`:125`) from `--ghost` to `--muted`; 2.62:1 is a fail and
  it ships 100 times.
- MUST render interactive component boundaries — input, select, textarea, `.csel-btn`,
  checkbox, radio, and both toggle states — at **≥3:1** against the surface behind them.
  `--border2` at 1.39:1 and `.tog-sl` off-state at 2.79:1 do not qualify.
- MUST render every chart stroke, chart fill, progress fill, meter fill and status dot at
  **≥3:1** against its own track **and** against any adjacent series it must be
  distinguished from.
- MUST NOT use `--amber` `#E8A33D` as a fill, dot, stroke, or glyph that carries meaning
  on `#FFFFFF`, `--bg`, `--bg2` or `--amber-lt`. Use `--amber-dk` `#633806`.
- MUST NOT encode a state in hue alone. Every tone-coded row, dot, bar and badge MUST
  also carry a text label or a shape difference (SC 1.4.1). `.ping-label` (`:332`) is the
  correct pattern and MUST accompany every `.ping-dot`.
- MUST record the computed ratio, to two decimals, in the ticket that introduces any new
  colour pairing. A pairing with no recorded ratio is not reviewable and MUST be rejected.
- MUST NOT treat a disabled control's contrast as a defect (`:86`), and MUST NOT let the
  `opacity:.42` dim be the *only* signal that a control is unavailable — the disabled
  state MUST also be exposed programmatically (§7.4).
- SHOULD keep decorative hairlines (`--border`, `:88`) exactly as they are; they are
  exempt and darkening them would cost the surface calm §1.4 depends on.

---

### 7.2 Focus

#### 7.2.1 The indicator

One ring, everywhere, on every focusable element:

```css
:focus-visible {
  outline: 2px solid var(--blue);   /* #185FA5 */
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #FFFFFF;    /* separator, fills the 2px offset gap */
  border-radius: inherit;
}
```

**Why these numbers.**

| Ground the ring lands on | Ring vs ground `[computed]` | Verdict |
|---|---|---|
| `#FFFFFF` card / page | **6.52** | passes on the outer edge |
| `--bg` `#EEF0F3` canvas | **5.71** | passes on the outer edge |
| `--bg2` `#F8F8F5` (`.map-ctrl`, `.form-footer`, `.feat-row`) | **6.13** | passes on the outer edge |
| `--blue-lt` `#E6F1FB` (`.kpi.click.on`, `.settings-tab.on`, `.csel-opt.sel`) | **5.70** | passes on the outer edge |
| `--amber-lt` `#FAEEDA` (`.btn.warn`, `.settings-sensitive`) | **5.69** | passes on the outer edge |
| `--green-lt` `#EAF3DE` (`.btn.success`) | **5.71** | passes on the outer edge |
| `--red-lt` `#FCEBEB` (`.btn.danger`, `.feat-rm:hover`) | **5.66** | passes on the outer edge |
| `--blue` `#185FA5` fill (`.btn.p`, `.map-fchip.on`, `.replay-btn`) | **1.00** | **the blue ring vanishes** |
| `--ink` `#1A1A18` (`#trend-tooltip`) | **2.67** | below 3:1 |

The last two rows are why the white separator is not optional. A single blue ring is
invisible on `.btn.p` (`:79`) and marginal on `#trend-tooltip` (`:316`) `[source]`. The
2 px white shadow sits in the offset gap and reaches **6.52:1** against `--blue` and
**17.43:1** against `--ink` `[computed]`, so the two-tone ring always has one edge above
3:1 — which is what SC 1.4.11 requires of a focus indicator `[WCAG]`.

**This overrides §1.1.3, which records `border-focus` as a "dark/near-black 2px ring"
`[observed]` `03-products/product-edit-pricing-inventory-shipping.webp`.** That is a
description of Shopify, whose primary is near-black; Eyvar's primary is brand blue by
R3 and §6.2 D-1, and a near-black ring on Eyvar's blue primary would be the same
collision in a different colour. **Eyvar's focus ring is `--blue`.** The width — 2 px — is
taken from §1.4, which already carves out the focus ring as the single permitted stroke
wider than 1 px, so §7.2 does not conflict with §1.4.

**Blue now carries three roles: primary fill, focus ring, and — per R3 — *not* links.**
This does not reopen R3. R3's concern is two *persistent, text-level* uses of one hue
becoming indistinguishable. The focus ring is transient, geometric, never applied to text,
and never present without a keyboard interaction that produced it. Links remain
`--blue-dk` plus underline, as R3 requires.

#### 7.2.2 `:focus-visible` vs `:focus`

`:focus` fires on mouse clicks too, which is why the file's authors reached for
`outline:none` in the first place — a persistent ring after every click reads as a bug.
`:focus-visible` fires only when the browser judges the focus to warrant an indicator:
keyboard, programmatic focus moves, and text fields regardless of input method.

The file contains **zero** occurrences of `focus-visible` `[source]`.

`:focus` retains exactly one job: the **`:focus-within`** family, used to reveal
hover-gated content (§7.3). It MUST NOT be used to paint the ring.

#### 7.2.3 Every selector in the file that kills focus without replacing it

**Group A — `outline:none` replaced only by a `.5px` border-colour change.** These are the
five selectors §6.3 D20 names.

| # | Selector | Line | What replaces the outline |
|---|---|---|---|
| A1 | `.field input:focus, .field select:focus` | `:253` | `border-color:var(--blue)` on a `.5px` border |
| A2 | `.feat-row input:focus` | `:259` | `border-color:var(--blue)` on a `.5px` border |
| A3 | `.ptable td input[type=number]:focus` | `:268` | `border-color:var(--blue)` on a `.5px` border |
| A4 | `select:focus` | `:290` | `border-color:var(--blue)!important` on a `.5px` border |
| A5 | `.csel-search` | `:310` | **nothing** — `border:none` plus `outline:none` on the base rule, so the field has no focus indicator in any state |

A1–A4 are not "no indicator", but they are not a conforming one either: the indicator is a
hue change on a `.5px` line that is already present when unfocused, its perceived width
does not change, and at fractional-pixel rendering (§6.3 D17) it can disappear entirely on
non-integer DPRs.

**Group B — inline `outline:none` on `<input>` elements, which D20 does not list.** All six
also carry `border:none`, so they have **no** focus indicator of any kind.

| # | Element | Line |
|---|---|---|
| B1 | `#global-search` in the top bar | `:571` |
| B2 | Unnamed "Search rider, driver…" field | `:730` |
| B3 | Riders page "Search RDR-id or name…" field | `:909` |
| B4 | `#pending-search` | `:1334` |
| B5 | `#requests-sub-all-search` | `:2134` |
| B6 | `#requests-instant-all-search` | `:2155` |

**Eleven declarations in total: five CSS selectors and six inline styles.** §6.3 D20 counts
five. **D20 is understated and MUST be widened to eleven** — the six inline ones cannot be
reached by a stylesheet fix, which is the same trap §6.3 D17 documents for `.5px`
hairlines.

**Group C — focusable but visually absent, no `outline:none` involved.**

| # | Element | Line | Problem |
|---|---|---|---|
| C1 | `.tog input` | `:185` | `opacity:0;width:0;height:0` — a real, focusable tab stop with zero rendered area. Any ring drawn on it is drawn on nothing. The visible `.tog-sl` is a **sibling** and never receives focus. |
| C2 | Buttons inside `.ra` | `:153` | `opacity:0` until `tr:hover` — focusable and invisible (§7.3, §6.3 D19). |

**Group D — ancestors that clip the ring.** An `outline` is clipped by an ancestor's
`overflow:hidden`. Four containers do it: `.sb` (`:24`), `.sb-sec` (`:38`), `.sb-ft`
(`:52`), `.card` (`:88`) `[source]`. A 2 px ring at 2 px offset on the first or last child
of any of these is cropped or lost.

**What still works.** No rule in the file removes the user-agent focus ring from
`<button>` or `<a>`, so the **701 `<button onclick>`** and **5 `<a onclick>`** elements
`[source]` do get *a* ring today — the browser's, which differs per engine, is not
token-coloured, and is not guaranteed to reach 3:1 on `.btn.p`. It is a floor, not
compliance.

**Rules**

- MUST define exactly one `:focus-visible` rule for the whole product: `outline:2px solid
  var(--blue); outline-offset:2px; box-shadow:0 0 0 2px #FFFFFF`. MUST NOT define a second
  focus style for any component.
- MUST NOT write `outline:none` or `outline:0` without a replacement indicator, in the same
  rule, that meets §7.1's 3:1 non-text floor. A `border-color` change on a `.5px` border is
  **not** a replacement.
- MUST close all eleven declarations listed in §7.2.3 Groups A and B, not the five named
  in §6.3 D20.
- MUST NOT rely on a bare `:focus` selector to paint the indicator; the ring MUST be
  attached to `:focus-visible`.
- MUST make the focus target the element that is visually rendered. A zero-size focusable
  input behind a styled sibling (`:185`) MUST be replaced by a natively focusable control,
  or MUST forward the ring to the rendered element via `:has()` / `:focus-within`.
- MUST NOT let an ancestor clip the ring: any container in §7.2.3 Group D that holds
  focusable children MUST either drop `overflow:hidden` or reserve ≥4 px of inner padding
  on the clipped edge.
- MUST keep the focused element fully visible (SC 2.4.11). While `.sb.mob-open` (`:432`) or
  `#modal-overlay` (`:191`) is open, focus MUST be inside that surface; the bottom-anchored
  toast stack MUST NOT overlap a focusable control, which MUST be guaranteed by reserving
  bottom padding on the scroll container equal to the stack's maximum height.
- MUST verify the ring on all nine grounds tabulated in §7.2.1 before a component ships,
  and MUST record the two worst ratios in the ticket.
- SHOULD NOT animate the ring's appearance. It arrives at full opacity in one frame.

---

### 7.3 Keyboard operation

Nothing in this subsection can be evidenced by a screenshot. Every claim is `[source]`
or `[WCAG]`.

#### 7.3.1 Reaching everything

The file contains **zero `tabindex` attributes** `[source]`. Nothing has been added to the
tab order and nothing has been removed from it — so the tab order is exactly the document
order of the natively focusable elements, and every non-native click target is
unreachable. §7.4 counts them: **253 handlers on `<div>`, `<span>`, `<td>` and `<tr>`**.

The most visible casualty is the primary navigation. All **30 sidebar items are
`<div class="sb-item">`** (`:480` onward) `[source]` — a keyboard user cannot reach the
nav at all. `.settings-tab` (25 of them) and `.map-tab` (2) are correctly `<button>`
`[source]`; the 18 `.map-fchip` filter chips are `<span>` `[source]`.

Two things correctly *leave* the tab order and MUST be preserved: `.page` is `display:none`
unless `.on` (`:70–71`), and `.card.clpsd>*:not(.ch)` is `display:none!important` (`:92`)
`[source]`. Hidden pages and collapsed card bodies are properly excluded.

#### 7.3.2 Escape and Enter

**The file handles the Escape key nowhere.** Zero occurrences of `Escape` `[source]`.
`closeModal()` (`:5216`) is reachable only by clicking `.modal-close` or clicking the
scrim (`:475`) `[source]`. `#modal-overlay` (`:191`) has no `role="dialog"`, no
`aria-modal`, no key handler, and no focus trap, so a keyboard user who opens a modal can
tab straight out of it into the page behind the scrim and interact with content they
cannot see.

Enter is handled in exactly two places — `onkeydown="if(event.key==='Enter')globalSearch(…)"`
at `:571` and `:909` `[source]`. Everywhere else, Enter works only because the target
happens to be a `<button>`.

Escape MUST also close the four other dismissible surfaces: `.csel-menu` (`:308`),
`.notif-panel` (`:576`), `.sb.mob-open` (`:432`), and `#trend-tooltip` (`:316`).

#### 7.3.3 Trapping and restoring focus

Focus is moved after opening a surface in exactly **three** places in ~21,857 lines:
`:5379` and `:20719` (a search field, inside a `setTimeout`) and `:6035` (the first input
of the last-added section) `[source]`. Focus is **never** restored on close.

The trap rule is not uniform, and §5.5 is why:

| Surface | Behaviour | Basis |
|---|---|---|
| `#modal-overlay` (`:191`), `.sb.mob-open` (`:432`) — has a scrim | **Trap.** Tab and Shift+Tab cycle inside; the page behind is inert. | Both render a backdrop (`:191`, `:434`) and block the page |
| Non-scrimmed drawer / side panel | **Do not trap.** Tab leaves the panel and continues into the page. | §5.5: "MUST omit the scrim and keep the page behind interactive" — a trap would contradict it |
| `.csel-menu` (`:308`), `.notif-panel` (`:576`) — popovers | **Do not trap.** Arrow keys move within; Tab closes and moves on. | Popover convention `[Polaris]` |

This is not a conflict with §5.5; it is §5.5 applied. **The scrim decides the trap.** If a
surface dims the page, it owns the keyboard. If it does not, it does not.

#### 7.3.4 Skip to content

There is no skip link — zero matches for `skip` `[source]`. `<aside class="sb">` (`:480`)
precedes `.main` in document order and holds 30 nav items, so once §7.3.1 is fixed and
those become buttons, every page will cost 30 Tab presses before the first piece of
content. That is exactly the condition SC 2.4.1 exists for `[WCAG]`.

#### 7.3.5 The hover-gated row actions

```css
.ra{display:flex;gap:5px;opacity:0;transition:opacity .1s}   /* :153 */
table.dt tr:hover .ra{opacity:1}                              /* :154 */
```

`.ra` appears **26 times** `[source]`, each wrapping one to three `<button>` elements —
`Open`, `View`, `Change driver`, `Settle`, `Review` (`:3437`, `:3465`, `:3555`)
`[source]`. Those buttons are natively focusable. `opacity:0` does **not** remove them
from the tab order. So a keyboard user tabs *into* them, one row at a time, and sees
nothing move. This fails SC 2.4.7 (no visible focus indicator) and SC 2.4.11 (focus fully
hidden) simultaneously `[WCAG]`, and on touch, where `:hover` does not exist, the actions
are unreachable by anyone.

This is §6.3 D19. **The fix is two lines:**

```css
table.dt tr:hover .ra,
table.dt tr:focus-within .ra { opacity: 1 }
```

`:focus-within` matches an ancestor while any descendant holds focus, so focusing the
first `.ra` button reveals the whole group — the same reveal `:hover` produces, on the same
`.1s` transition. Row-level (`tr:focus-within`) rather than group-level
(`.ra:focus-within`) because it keeps the two selectors symmetrical and reveals the group
before the ring is painted on the first button.

**The same defect exists in the sidebar and needs the same fix.** `.sb-lbl` and
`.sb-badge` are `opacity:0` until `.sb:hover` (`:46–49`) `[source]`. Once `.sb-item`
becomes a button, a keyboard user tabbing the rail would see icons with no labels. Add
`.sb:focus-within` alongside `.sb:hover,.sb.pin` at `:30`, `:37`, `:40`, `:47`, `:49`
and `:54`.

**Rules**

- MUST make every interactive element natively focusable — `<button>`, `<a href>`,
  `<input>`, `<select>`, `<textarea>` — or MUST give it `tabindex="0"`, a `role`, and
  Enter/Space handlers. A `<div onclick>` with none of these MUST NOT ship.
- MUST convert all 30 `.sb-item` divs (`:480`+) and all 18 `.map-fchip` spans (`:345`) to
  `<button>`.
- MUST make tab order follow visual order. A control that needs `tabindex` greater than 0
  to be reachable in the right order MUST be moved in the DOM instead.
- MUST close every dismissible surface on Escape: `#modal-overlay` (`:191`), `.csel-menu`
  (`:308`), `.notif-panel` (`:576`), `.sb.mob-open` (`:432`), `#trend-tooltip` (`:316`).
- MUST activate every control on both Enter and Space when it carries a button role, and
  on Enter alone when it carries a link role.
- MUST move focus into a modal or scrimmed drawer on open — to its first focusable control,
  or to the dialog container when the first control is destructive — and MUST return focus
  to the element that opened it on close.
- MUST trap Tab and Shift+Tab inside any surface that renders a scrim, and MUST NOT trap
  inside any surface that does not (§5.5).
- MUST provide a "Skip to content" link as the first focusable element in `<body>`,
  visually hidden until focused, targeting the `<main>` element §7.4 requires.
- MUST add `tr:focus-within` beside every `tr:hover` rule that changes opacity or
  visibility — `:154` today. Closes §6.3 D19.
- MUST add `.sb:focus-within` beside `.sb:hover` at `:30`, `:37`, `:40`, `:47`, `:49` and
  `:54`.
- MUST NOT reveal an interactive control on `:hover` alone anywhere in the product. Hover
  MAY change emphasis; it MUST NOT gate reachability.
- SHOULD support Escape twice in a nested surface — innermost first — and MUST NOT nest a
  modal inside a drawer at all (§5.5).

---

### 7.4 Semantics and names

#### 7.4.1 The 992 handlers

`onclick=` appears **992 times** in the file `[source]`. Where those handlers sit:

| Host element | Count | Focusable? | Enter/Space? | Announced as |
|---|---|---|---|---|
| `<button>` | **701** | yes | yes | button |
| `<a>` | 5 | yes | Enter | link |
| `<input>` / `<label>` | 4 | yes | yes | its control |
| `<div>` | **156** | **no** | **no** | **nothing** |
| `<span>` | **64** | **no** | **no** | **nothing** |
| `<td>` | **25** | **no** | **no** | cell |
| `<tr>` | **8** | **no** | **no** | row |

**253 of 992 handlers — 25.5% — sit on an element with no role, no tab stop, and no
keyboard activation** `[computed]` from the counts above.

What that implies is precise, and it is not "the file needs some ARIA": **71% of the
interactive surface is already correct.** The authors reached for `<button>` seven times
out of ten. The defect is a *residue*, not a philosophy — which means it is a bounded,
countable, mechanically closable list, and §7.8 gives the one-line console check that
counts it.

The choice among the three is not stylistic:

- **`<button>`** — anything that changes state, opens a surface, or runs a command,
  *including* things that look like links. Default `type` inside a form is `submit`; use
  `type="button"`.
- **`<a href>`** — anything that navigates to a resource with an address. If it has no
  URL it is not a link. Eyvar's page router makes this rare, and that is fine.
- **`<div>` / `<span>`** — never interactive. Not with `role="button"`, not with
  `tabindex`, unless a native element genuinely cannot be styled to the spec — which in
  this file is never.

#### 7.4.2 Landmarks and headings

Landmark elements present: **`<aside>` × 1** (`:480`, the sidebar). `<main>`, `<nav>`,
`<header>`, `<footer>`, `<section>`: **zero** `[source]`. The top bar is
`<div class="topbar">` (`:59`), the content region is `<div class="page">` (`:70`).

Headings: **41 `<h1>`, 166 `<h2>`, 112 `<h3>`, zero `<h4>`–`<h6>`** `[source]`. The 41 h1s
are one per `.page`, and `.page` is `display:none` unless `.on` (`:70–71`), so **exactly
one h1 is exposed at any moment** — that part is correct and MUST be preserved. `.ch h2`
(`:97`) is the card heading and `.modal-head h3` (`:196`) the modal title, which is a
coherent h1 → h2 → h3 ladder.

The gap is headings rendered as non-headings: `.settings-panel-title` is a `<div>`, **24
times** (`:245`); `.sec-title` is a `<p>`, 3 times (`:228`); `.live-sec-hdr` (`:363`) and
`.settings-tab-group-lbl` (`:233`) are neither `[source]`. Each visually introduces a block
of content and is invisible to heading navigation.

#### 7.4.3 Tables

**74 `<table>` elements, 470 `<th>` elements, 0 `scope` attributes, 0 `<caption>`
elements** `[source]`. (The single `scope` match in the file, at `:20688`, is a JavaScript
local variable, not an HTML attribute.)

At 470 header cells, a screen reader announces no column or row association for any of the
74 tables. Column headers take `scope="col"`; where the first cell of a row is the record's
identity — which §3.1 requires it to be — that cell takes `<th scope="row">`. A `<caption>`
names the table; where the page title already names it, the caption MAY be visually hidden
but MUST exist.

`table.dt th` also carries `text-transform:uppercase` (`:149`), which §6.3 D18 already
flags on typographic grounds. §7.4 adds a second reason: some screen readers spell out
short all-caps strings letter by letter. The two defects share one fix.

#### 7.4.4 Icon-only buttons and accessible names

`.ic-btn` is a 30×30 box containing a bare `<svg>` and no text (`:65–66`) `[source]`.
Three instances: `#mob-menu-btn` (`:554`) and `#tb-back` (`:557`) are `<button>` with
`title="Menu"` / `title="Back"`; `#bell-btn` (`:573`) is a **`<div>` with no title and no
text at all** `[source]` — it has neither a role nor a name.

The file uses `title=` **103 times** `[source]`. **`title` is not an accessible name.** It
is not surfaced on touch, is not surfaced to keyboard users without a pointer, is announced
inconsistently across screen readers, and disappears the moment a tooltip component
replaces it. It is a supplement, never the name.

§4.6 already rules: "MUST give every icon-only button an accessible name and a tooltip."
§7.4 makes it testable — `aria-label` on the button, `aria-hidden="true"` on the decorative
`<svg>` inside it, and the tooltip separately.

The same applies to `.ch-tgl`, the collapse chevron, which is a `<span>` created in
JavaScript with `textContent='▼'` and `title='Collapse / expand'` (`:9385–9387`)
`[source]`. Its accessible name today is the glyph "▼".

#### 7.4.5 Labels

**235 `<label>` elements. Zero `for=` attributes** `[source]`. And none wraps its control:
`.field` is `display:flex;flex-direction:column` (`:232`), so the label and the input are
siblings —

```html
<div class="field"><label>Eyvar commission %</label><input type="number" id="fp3-comm" …></div>
```

— at `:1101`, with the same shape at `:1102`, `:1103` and `:1104` `[source]`. **Not one
form control in the product has a programmatically associated label.** A screen reader
announces "edit, blank" for all of them.

623 `id=` attributes already exist `[source]`, so most controls have the id a `for=` needs;
the fix is largely mechanical.

Two related cases:

- `.computed-box` (`:255`, used at `:1103`) is a **`<div>`** displaying a derived value
  under a `<label>`. It is not a form control, so `for=` cannot reach it. It MUST become
  `<output>` with `for` naming the inputs it derives from — see §7.5.
- `.tog input` (`:185`) is a zero-size checkbox whose visible surface is a sibling `<span>`.
  It MUST carry an `aria-label` or a `for=`-associated label, and the toggle's on/off state
  MUST come from the checkbox's own `checked`, not from a class.

**Rules**

- MUST put every click handler on `<button>`, `<a href>`, or a form control. The console
  check in §7.8 MUST return `0`; it returns **253** today.
- MUST NOT use `role="button"` plus `tabindex` on a `<div>` or `<span>` as a substitute for
  `<button>`.
- MUST expose exactly one `<h1>` per rendered page, and MUST NOT skip a heading level.
- MUST render `.settings-panel-title` (`:245`), `.sec-title` (`:228`), `.live-sec-hdr`
  (`:363`) and `.settings-tab-group-lbl` (`:233`) as real heading elements at the level
  their nesting implies.
- MUST wrap the content region in `<main>`, the top bar in `<header>`, and the rail's nav
  list in `<nav>`; MUST give the second `<nav>` (the settings rail) an `aria-label` that
  distinguishes it from the first.
- MUST give every `<th>` a `scope` attribute — `col` for column headers, `row` for the
  identity cell §3.1 requires. All 470 have none today.
- MUST give every `<table>` a `<caption>`, visually hidden where the page title already
  names it.
- MUST give every icon-only control an `aria-label`, and MUST mark its `<svg>`
  `aria-hidden="true"` and `focusable="false"`. Makes §4.6's icon-name rule testable.
- MUST NOT use `title=` as the accessible name of anything. It is a supplement.
- MUST associate every one of the 235 `<label>` elements with its control via `for=`/`id`
  or by wrapping it. Zero unassociated labels MUST remain.
- MUST render derived read-only values as `<output for="…">`, not `<div>` (`:255`).
- MUST expose disabled state via the `disabled` attribute or `aria-disabled`, never via
  `opacity` alone (`:86`).
- SHOULD name a control from its visible text wherever visible text exists; an
  `aria-label` that differs from the visible label breaks voice control (SC 2.5.3).

---

### 7.5 Live regions and async feedback

#### 7.5.1 The toast announces nothing

`toast()` at `:5269` builds a `<div>`, styles it inline, and appends it to `#toast-stack`
via `ensureToastStack()` `[source]`. Neither the toast nor the stack carries `role`,
`aria-live`, or `aria-atomic` — the file has **zero `aria-` attributes of any kind**
`[source]`. The toast has **352 call sites** (§6.3 D7). **Every one of them is silent to a
screen reader.**

Worse, the toast is carrying content §5.1 forbids it to carry. Validation failures are
routed to it:

| Call | Line |
|---|---|
| `toast('Please select a rider','err')` | `:2485` |
| `toast('Please select pickup and destination','err')` | `:2486` |
| `toast('⚠ Name cannot be empty','warn')` | `:2979` |
| `toast('⚠ Enter a valid email address','warn')` | `:2980` |
| `toast('⚠ Enter your current password','warn')` | `:3040` |
| `toast('⚠ New password must be at least 8 characters','warn')` | `:3041` |

§5.1 already rules "MUST NOT use a toast to report an error the user must fix — use an
inline error or a critical banner", and §4.4 requires three simultaneous inline signals.
§7.5 does not create a new rule here; it states the cost. A transient, unannounced,
auto-dismissing pill in the corner is the single worst carrier for a blocking error: the
user who most needs it is the one who cannot see it, and it is gone in seconds either way.

#### 7.5.2 Politeness, per case

| Case | Region | Politeness | Also required |
|---|---|---|---|
| Success confirmation ("Ticket TCK-4021 created") | `role="status"` | `polite` | The mutation MUST be visible in the page — the new row, the changed badge, the updated count |
| Warning that does not block | `role="status"` | `polite` | A banner if the condition persists (R10) |
| Blocking validation error | `role="alert"` | `assertive` | Inline error on the field, all three signals of §4.4 |
| Form-level validation summary | `role="alert"` | `assertive` | Focus MUST move to the summary; each item MUST link to its field |
| Async operation started | `role="status"` | `polite` | The trigger MUST become `aria-busy="true"` |
| Async operation finished | `role="status"` | `polite` | The result MUST be in the DOM before the announcement |
| Destructive action completed | `role="status"` | `polite` | Undo, where offered, MUST be a real control, not toast text |
| Derived / computed field recalculated (`.computed-box` `:255`, `.formula-box` `:271`, `.preview-strip` `:275`) | `aria-live="polite"` on the `<output>` | `polite`, debounced ≥500 ms | Only when the recalculation is a direct consequence of the user's own edit |
| Continuously ticking values — live map, dispatch counters, SLA timers | **`aria-live="off"`** | none | See §7.5.3 |

**`assertive` interrupts whatever the screen reader is currently saying.** It is reserved
for the two rows above that block the user's task. Everything else is `polite`.

#### 7.5.3 Continuously updating values MUST NOT be a live region

Five one-second re-render loops run in this file:

| Loop | Line |
|---|---|
| `setInterval(renderRideRequestTracking,1000)` | `:2509` |
| `_subTrackInterval` | `:4791` |
| `_nsDispatch.interval` | `:4962` |
| `_subTrackInterval` (second site) | `:5165` |
| `setInterval(tickEngine,1000)` | `:11968` |

A live region on any of these produces one announcement per second, forever, which makes
the page unusable and drowns the announcements that matter. **The correct treatment is the
opposite of a live region:** mark the ticking container `aria-live="off"`, and provide the
same information as a *pollable* status the user can read on demand — a labelled region
with a heading, reachable by heading navigation, plus one summary status region that
announces at most once per 30 seconds and only when a value crosses a threshold the user
has asked to be told about.

This is where §7.5 hands off to §8.1, which owns the monitoring-shell pattern.

#### 7.5.4 A toast is never the only carrier

The governing rule, and the reason it is not optional: a toast is transient, auto-dismisses,
can be pre-empted by a later toast (`TOAST_MAX`, `:5280`), and is announced to nobody
today. **Any information that exists only inside a toast is information the product did not
deliver.**

Every toast MUST have a durable counterpart:

| Toast says | Durable counterpart |
|---|---|
| A record changed | The row, badge, or field shows the new value |
| A record was created | The record is in the list, or the page navigated to it |
| A record was deleted | The row is gone, and a count decremented |
| Something failed | An inline error (§4.4) or a banner (§5.2, R10) |
| A background job started | A pending state on the affected object (§8.1) |
| A standing condition arose | A banner — per R10, standing conditions are banners, not toasts |

The notification centre already in the file (`:2277`) is the natural durable home for
anything with no on-page counterpart, and MUST be used for exactly that.

**Rules**

- MUST wrap the toast stack in a container with `role="status"` and `aria-live="polite"`,
  created once and present in the DOM before the first toast is inserted. A live region
  added at the same moment as its content is not announced.
- MUST use `role="alert"` / `aria-live="assertive"` **only** for blocking validation errors
  and form-level error summaries. Every other announcement MUST be `polite`.
- MUST NOT deliver a blocking error through a toast. Reinforces §5.1 and §4.4; §6.3 D7's
  six conformance failures MUST be widened to include the six error calls listed in §7.5.1.
- MUST move focus to a form-level error summary when a submit fails, and MUST make each
  summary item a link to the field it names.
- MUST pair every toast with a durable counterpart from the §7.5.4 table. A toast MUST NOT
  be the only place a fact appears.
- MUST set `aria-live="off"` on every container refreshed by the five interval loops at
  `:2509`, `:4791`, `:4962`, `:5165` and `:11968`.
- MUST debounce any `polite` region attached to a derived value to **≥500 ms**, and MUST
  announce the value only when it changes.
- MUST render `.computed-box` (`:255`), `.formula-box` (`:271`) and `.preview-strip`
  (`:275`) as `<output for="…">` so the derived value is associated with the inputs that
  produced it.
- MUST set `aria-busy="true"` on the region under an in-flight async operation and MUST
  clear it when the result is in the DOM.
- MUST NOT announce an ambient threshold crossing more than once per 30 seconds per region.
- SHOULD announce the count with the result — "4 drivers found" — rather than announcing
  that a search completed.

---

### 7.6 Motion and autoplay

The file contains **zero** occurrences of `prefers-reduced-motion` `[source]`.

#### 7.6.1 What loops today

**Eight `animation:` declarations carry `infinite`, across four keyframe sets:**

| Keyframes | Declared at | Duration | What it animates |
|---|---|---|---|
| `ping-pulse` (`:331`) | `:329` (`.ping-warn`), `:330` (`.ping-dead`), `:9156` (inline, calling state) | 1.4s / 0.7s / 0.7s | `opacity` 1 → .3 → 1 |
| `live-dot` (`:342`) | `:341` (`.map-tab.active .tab-dot`) | 2s | `box-shadow` spread 3px → 6px |
| `reqPulse` (`:145`) | `:2084` (inline), `:4811` (inline) | 1.4s | `opacity` 1 → .25 → 1 |
| `spin` (injected at `:8727`, `:11384`) | `:8724`, `:11380` (inline) | 0.8s | `transform:rotate` |

**Two corrections to §6.3 D24.** D24 names four looping animations as `ping-pulse`,
`live-dot`, `reqPulse` and `kpiFlash`.

1. **`kpiFlash` does not loop.** `.kpi-flash-target{animation:kpiFlash 1.4s ease-out}`
   (`:109`) declares no iteration count, so it runs **once** `[source]`. It is a one-shot
   attention flash, not ambient motion. It still needs a reduced-motion guard — a
   background flash is motion-adjacent — but it is not in the same category.
2. **`spin` is missing from D24.** Two loading spinners at `:8724` and `:11380` rotate
   indefinitely, with their keyframes injected at runtime (`:8727`, `:11384`) so a
   stylesheet-only reduced-motion block will not reach them `[source]`.

The corrected count is **four looping keyframe sets across eight declarations, one of them
runtime-injected**, plus two finite animations (`kpiFlash` `:109`, `mIn` `:193`).

#### 7.6.2 SC 2.2.2 applies before reduced motion does

`prefers-reduced-motion` is a preference. **SC 2.2.2 Pause, Stop, Hide is a requirement,
and it applies to every user regardless of preference** `[WCAG]`: content that blinks or
moves automatically, starts on load, runs longer than five seconds, and is presented
alongside other content MUST offer a mechanism to pause, stop, or hide it.

`ping-pulse`, `live-dot` and `reqPulse` satisfy every one of those conditions and none of
them offers a mechanism. **These are AA failures today, independent of any media query.**

They are not SC 2.3.1 (flash) failures: at 1.4s and 0.7s cycles the fastest is ≈1.4 flashes
per second `[computed]`, below the three-per-second threshold `[WCAG]`. The problem is
duration, not frequency.

`spin` is exempt while it genuinely represents an operation in progress — a loading
indicator is the documented exception to 2.2.2 `[WCAG]` — but it MUST stop when the
operation ends, and it MUST NOT be the only signal that something is loading.

#### 7.6.3 What must not be lost

`ping-pulse` is doing semantic work: it distinguishes `.ping-warn` from `.ping-dead` by
*rate* (1.4s vs 0.7s), on top of a hue difference (`#B45309` vs `#C62828`, `:329–330`)
`[source]`. Strip the animation naively and two states collapse into a colour difference
alone — which is an SC 1.4.1 failure (§7.1). `.ping-label` (`:332`) already exists and MUST
carry the state as text so that removing the motion removes nothing.

The guard, complete:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .ping-warn, .ping-dead, .map-tab.active .tab-dot { animation: none !important }
}
```

The universal selector is deliberate: it is the only thing that reaches the inline
`animation:` strings at `:2084`, `:4811`, `:8724`, `:9156` and `:11380` and the
runtime-injected `spin` keyframes that a component-by-component block would miss — the same
reach problem §6.3 D17 documents for `.5px` hairlines.

**Rules**

- MUST ship a `@media (prefers-reduced-motion: reduce)` block that reduces every animation
  and transition in the product to ≤0.01ms or `none`, applied via the universal selector so
  it reaches inline and runtime-injected declarations.
- MUST set `animation-iteration-count:1` or `animation:none` on all four looping keyframe
  sets — `ping-pulse` (`:329`, `:330`, `:9156`), `live-dot` (`:341`), `reqPulse` (`:2084`,
  `:4811`), `spin` (`:8724`, `:11380`) — under reduced motion. Corrects and closes §6.3
  D24.
- MUST provide a pause/stop/hide mechanism for `ping-pulse`, `live-dot` and `reqPulse` for
  **all** users, not only those who set the preference (SC 2.2.2). A single persistent
  "Pause live animation" control on the monitoring shell satisfies this for every loop on
  that surface.
- MUST NOT let a looping animation be the only carrier of a state difference. `.ping-warn`
  and `.ping-dead` MUST each render `.ping-label` (`:332`) text.
- MUST stop `spin` (`:8724`, `:11380`) when its operation completes, and MUST pair it with
  a text status announced per §7.5.
- MUST replace removed motion with an equivalent static treatment — a border, a shape, or a
  label — never with nothing.
- MUST NOT autoplay video or audio. The file contains none today; this rule is pre-emptive.
- MUST NOT introduce parallax, auto-advancing carousels, or scroll-hijacking on any admin
  surface.
- **§1.6 is demoted to SHOULD in full by R12 and is not citable in review.** Its
  reduced-motion MUST ("MUST respect `prefers-reduced-motion` by reducing every transition
  … to a plain opacity fade or no motion at all") is restated here in checkable form and is
  binding **from §7.6**, not from §1.6. §1.6's other motion MUSTs — including "MUST NOT
  animate hover states with more than ~100 ms of delay — an admin must feel instantaneous"
  — are unreviewable as written and MUST NOT be cited against a change.

---

### 7.7 Targets and density

#### 7.7.1 The requirement, stated exactly

SC 2.5.8 Target Size (Minimum), Level AA: a pointer target is at least **24 × 24 CSS px**,
**unless** one of these applies `[WCAG]`:

- **Spacing** — the target is smaller than 24 px, but a 24 px-diameter circle centred on it
  does not intersect the circle of any other target.
- **Inline** — the target sits inside a sentence or a block of text.
- **User agent** — the size is browser-determined and unmodified by the author.
- **Essential** — a legally required or information-preserving presentation demands it.
- **Equivalent** — the same function is available through another control that does meet
  24 px.

SC 2.5.5 Target Size (Enhanced) raises this to 44 × 44 px. **That is Level AAA and is out
of scope** (§7.8).

#### 7.7.2 The honest reconciliation with §6.2 D-2

The tempting answer is that density is sanctioned, so small targets are sanctioned. **That
answer is wrong on the document's own terms, twice.**

First, **§6.2 D-2 names the rules it suspends: §1.2 (type ramp), §1.3 (spacing scale),
§3.1 (row height). It does not name §7.7 or SC 2.5.8.** §6.2's own governing rule is that a
deviation which does not name its rule is not sanctioned — it is a defect. D-2 does not
reach here.

Second, and more usefully: **the two requirements are not actually in tension, because they
measure different boxes.** Density is a property of *ink* — type size, row height, padding,
the vertical rhythm an operator scans all day. SC 2.5.8 is a property of the *pointer
target* — the region that dispatches a click. In CSS these are independent. A 22 px-tall
button can carry a 24 px hit area with `padding` plus a compensating negative margin, or
with an `::after` overlay inset to −2px, and neither changes a single pixel of rendered
layout.

So the reconciliation is a rule, not a compromise: **density constrains the visible box; it
does not constrain the hit box, and the hit box is what conformance measures.** Where that
is genuinely impossible, the spacing exception is the second route — and Eyvar's layout
usually satisfies it already, because density in an ops console tends to mean *small
controls in roomy rows*, not *small controls crammed together*.

There is one honest cost, and it is worth stating rather than hiding: an invisible hit area
larger than its visible control makes mis-clicks possible near the edges of a dense table
row. That is a real trade, and the rule below resolves it in a fixed direction — expand
downward and sideways into padding the row already owns, never into a neighbouring target's
24 px circle.

#### 7.7.3 Measured against the file

Heights below are computed from the declared `font-size`, `padding` and `border`, with the
UA `normal` line-height at ≈1.2 — which is itself the reason for the first rule in this
subsection.

| Control | Line | Size `[computed]` | ≥24 px? | Spacing exception |
|---|---|---|---|---|
| `.ic-btn` | `:65` | 30 × 30 | PASS | — |
| `.avatar` | `:68` | 30 × 30 | PASS | — |
| `.modal-close` | `:197` | 28 × 28 | PASS | — |
| `.csel-btn` | `:301` | h 33 | PASS | — |
| `.csel.sm .csel-btn` | `:323` | h 29 | PASS | — |
| `.field input`, `.field select` | `:252` | h 33 | PASS | — |
| `.sb-item` | `:41` | h ≈ 33 | PASS | — |
| `.settings-tab` | `:235` | h ≈ 40 | PASS | — |
| `.map-tab` | `:337` | h ≈ 35 | PASS | — |
| `.trend-nav-btn` | `:314` | 24 × 24 | PASS (exactly) | — |
| `.btn` | `:77` | h ≈ 27 | PASS | — |
| `.btn.sm` | `:81` | h ≈ 22 | **FAIL** | **passes** — inside `.ra`, `gap:5px`, `td` padding `9px 11px` (`:150`) puts row pitch at ≈40 px and horizontal centres ≥50 px apart |
| `.map-fchip` | `:345` | h ≈ 22 | **FAIL** | `gap:6px` (`:344`) puts centres well over 24 px apart horizontally; MUST be re-verified per row |
| `.tog` | `:184` | 32 × **18** | **FAIL** | **unresolved** — MUST be verified per settings row |
| `.feat-rm` | `:260` | ≈ 30 × 19 | **FAIL** | `.feat-row` `margin-bottom:6px` (`:257`) → pitch ≈ 33 px, passes vertically |
| `.ch-tgl` | `:90` | ≈ 17 × 17 | **FAIL** | **unresolved** — `.ch-right` `gap:10px` (`:96`) → centres ≈27 px apart, marginal |
| `.toast-x` | `:5271` | ≈ 15 × 14 | **FAIL** | sole target inside the pill, passes |
| Role-matrix checkbox | `:10763` | 15 × 15 | **FAIL** | `.ptable td` padding `8px 9px` (`:265`) → vertical pitch ≈ 31 px, passes; **column pitch unresolved** |
| `.plan-option input[type=radio]` | `:202` | 14 × 14 | n/a | **Equivalent** — the whole `.plan-option` row (`:199`, padding `12px 14px`) is the target |

**The good news is real: eleven of nineteen pass outright, and most of the rest pass the
spacing exception.** The list of genuinely unresolved targets is short — `.tog`, `.ch-tgl`,
and the role-matrix checkbox's horizontal pitch. That is a closable list, not an
architectural problem.

The first rule below exists because half this table is a computed estimate. `body` sets no
`line-height` (`:22`) `[source]`, so every button height in the file depends on a UA default
that varies by font and platform. **A conformance requirement MUST NOT rest on an inherited
default.**

**Rules**

- MUST give every button, chip and icon control an explicit `min-height` in CSS. A control
  whose height is produced by an inherited `line-height` is not measurable and MUST NOT
  ship. `body` (`:22`) MUST declare a `line-height`.
- MUST give every pointer target a hit area of **≥24 × 24 CSS px**, or MUST satisfy the
  24 px spacing exception, or MUST qualify under `inline`, `essential`, or `equivalent`.
- MUST expand an undersized hit area **without changing the rendered box** — padding plus a
  compensating negative margin, or an inset `::after` overlay. MUST NOT enlarge the visible
  control to reach 24 px in a dense table.
- MUST NOT expand a hit area into a neighbouring target's 24 px circle. Where two adjacent
  targets cannot both reach 24 px without overlapping, the layout MUST change — increase
  `gap` — not the hit areas.
- MUST record, in the ticket, which of the five routes each sub-24 px control takes, and
  MUST record the measured centre-to-centre distance when the route is `spacing`.
- MUST resolve the three unresolved targets in §7.7.3: `.tog` (`:184`, 18 px tall),
  `.ch-tgl` (`:90`, ≈17 px with 10 px neighbours), and the role-matrix checkbox (`:10763`)
  column pitch.
- MUST NOT cite §6.2 D-2 against any rule in §7.7. D-2 suspends §1.2, §1.3 and §3.1 by name
  and reaches nothing else.
- SHOULD set `min-height:24px` on `.btn.sm` (`:81`) and `.map-fchip` (`:345`) rather than
  relying on the spacing exception, because the exception must be re-verified every time a
  row's contents change and `min-height` need not be.
- SHOULD target 44 px on any control a dispatcher operates under time pressure — the
  intervene, call and track actions on the monitoring shell (`:357–362`) — even though
  44 px is AAA and out of scope. Speed is the argument there, not conformance.

---

### 7.8 Conformance target

#### 7.8.1 The standard

**Eyvar Admin conforms to WCAG 2.2 Level A and Level AA**, for the desktop web admin
surfaces named in the document's scope line, in both English and Arabic (§9).

A screen conforms when every success criterion at A and AA passes for that screen. A screen
with one open finding does not "mostly conform" — the term does not exist. It has an open
finding, tracked like any other defect in §6.3.

#### 7.8.2 Explicitly out of scope

Naming these matters as much as naming the target: an unbounded standard is an
unenforceable one.

| Out of scope | Why | Lapses when |
|---|---|---|
| **Level AAA in full** — including SC 2.4.13 Focus Appearance and SC 2.5.5 Target Size (Enhanced, 44 px) | AAA is not a general conformance target for any product `[WCAG]` | never; individual AAA criteria may still be adopted per-surface, as §7.7 does for dispatcher controls |
| **SC 1.2.1–1.2.5, time-based media** | The panel ships no audio or video | the first `<video>` or `<audio>` element lands |
| **The internal DOM of Leaflet 1.9.4** (`:469–470`, loaded from unpkg) | Third-party, not authored here | Eyvar forks or wraps it |
| **The map tile canvas** (`#map-leaflet`, `:349`) | Treated as a decorative graphic | — but a **text equivalent of everything the map conveys MUST exist beside it**, which is in scope and is §8.1's |
| **Native mobile applications** | The scope line is desktop web | a native client ships |
| **Print stylesheets** | None exists | one is authored |
| **Browsers without `:focus-visible` or `:has()`** | Both are baseline in every current evergreen engine | an enterprise customer pins an older engine |

Everything Eyvar authors *over* the map — `.map-ctrl` (`:215`), `.map-tab` (`:337`),
`.map-fchip` (`:345`), `.map-stat` (`:365`), `.live-card` (`:351`) — is fully in scope.

#### 7.8.3 The five-minute screen review

Run in order. Any FAIL blocks the screen. Total ≈4:30.

**1. Tab the screen, mouse untouched. (90s)**
From the address bar, Tab to the end. Every stop shows the blue ring of §7.2.1. You reach
every nav item, every row action, every filter chip. You never land on something you cannot
see, and focus order matches reading order.
*FAIL if:* any stop is invisible; any control is unreachable; focus jumps backwards.

**2. Modal keyboard contract. (30s)**
Open the screen's modal. Escape closes it. Focus returns to the control that opened it.
Shift+Tab from the first control does not reach the page behind the scrim.
*FAIL if:* Escape does nothing; focus lands on `<body>` after close; Tab escapes the scrim.

**3. Two console one-liners. (30s)**

```js
// non-native click targets — MUST be 0 (file-wide today: 253)
$$('[onclick]').filter(e => !['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL']
  .includes(e.tagName) && !e.hasAttribute('tabindex')).length

// unassociated labels + unscoped headers — MUST be 0 (file-wide today: 235 + 470)
$$('label:not([for])').filter(l => !l.querySelector('input,select,textarea')).length
  + $$('th:not([scope])').length
```

**4. Automated pass. (45s)**
axe DevTools or Lighthouse on the rendered screen. **Zero** violations at *serious* or
*critical*. Automated tooling catches roughly a third of WCAG issues — a clean run is
necessary, never sufficient, and never closes a finding from steps 1, 2 or 5.

**5. Empty submit. (45s)**
Submit the screen's form with nothing filled in. The error appears **inline beside the
field** with all three signals of §4.4, and is announced — verify the container carries
`role="alert"` in the DOM inspector, or turn on VoiceOver/NVDA.
*FAIL if:* the only error feedback is a toast (§7.5.1).

**6. Reduced motion, then zoom. (30s)**
Enable the OS "reduce motion" setting and reload: nothing is still looping. Then zoom the
browser to 200%: no horizontal scrolling of the page body, nothing clipped, nothing
overlapping.

**What this review does not cover, and what does.** Five minutes catches the mechanical
failures, which is where all of §6.3's accessibility defects live. It does not catch a
wrong heading hierarchy, a misleading accessible name, or a live region that announces the
wrong thing. Those need one full screen-reader pass per *pattern* — not per screen — run
once against each row of §6.4's surface map and re-run when that pattern changes.

**Rules**

- MUST target **WCAG 2.2 Level AA**. A screen with an open A or AA finding MUST NOT be
  described as conforming.
- MUST treat every exclusion in §7.8.2 as closed. Adding one requires a row in that table
  naming what lapses it — the same discipline §6.2 imposes on deviations.
- MUST run the six-step review in §7.8.3 before a screen ships, and MUST record the result
  in the ticket.
- MUST NOT close an accessibility finding on the strength of an automated scan alone.
- MUST NOT cite a screenshot from `docs/06-design-reference/shopify-admin-web/` to close a
  finding in §7.3, §7.4 or §7.5. A still image cannot evidence tab order, ARIA, or
  screen-reader output.
- MUST run one full screen-reader pass per **pattern** in §6.4, not per screen, and MUST
  re-run it when that pattern changes.
- SHOULD add the two console one-liners of §7.8.3 step 3 to CI, asserting `0`, once §7.4's
  defects are closed — they are the cheapest regression guard in this document.

---

## 8. Patterns Shopify Does Not Cover

> **Why this section exists.** §1–§5 derive their rules from 159 screenshots of the Shopify
> admin, which is a merchant CRUD tool: records are created, edited, listed and archived by
> one person at a time, on their own schedule, against data that does not move while they
> look at it. Eyvar Admin is an operations console. Five of its surface types have no
> Shopify equivalent, or no *governed* Shopify equivalent, and together they are roughly
> half the product:
>
> | Surface type | Eyvar pages | Why §1–§5 does not reach it |
> |---|---|---|
> | Real-time monitoring | `p-live` | The data changes while the operator watches. Nothing in §1–§5 governs a moving surface. |
> | Derived / computed values | `p-plan-edit`, `p-plans` | §4.2 has one line on read-only fields. Eyvar has a computation lattice with a published formula. |
> | Money and ledgers | `p-wallets`, `p-rwallets`, `p-finance` | §4.2 says how to render a currency *input*. Nothing says how to render money as *output*. |
> | Work queues and SLA | `p-fraud`, `p-all-pending`, `p-requests`, `p-interventions`, `p-readiness`, `p-renewal` | §3.1 governs a list of records. A queue is a list of *work*: claimed, timed, decided, gone. |
> | Dense wide tables | every index, queue and ledger page — 23 of the 41 | §3.1 concedes that wide tables scroll and that the checkbox and identity column *"stay pinned while they do"*, and marks both `[Polaris]`. It writes no rule for either, and none at all for an operator freezing a column of their own. |
>
> **Claim marking, extended.** §1–§5 use `[observed]` (visible in a cited screenshot) and
> `[Polaris]` (recalled, unverified). This section adds a third tag:
>
> - `[code]` — verifiable in `eyvar_ops_panel_v40_fixed.html` at the line cited on the same
>   line. Every codebase claim below carries one. Trust it, and check it before changing it.
> - `[ruling]` — a decision for Eyvar where no source, screenshot or code settles the
>   question. Overturn deliberately, in writing, the same way §"Rulings on contested points"
>   works.
>
> **Standing rulings this section touches.** R4 (numeric columns are always right-aligned)
> is upheld and extended in §8.3. R5 (no red badges) is upheld as a *badge* rule and
> **explicitly amended** in §8.4 — see R5a. §1.6 (motion) is **explicitly amended** in
> §8.1 — see R18. §4.2 (computed fields render as normal input boxes) is **overridden** in
> §8.2. **§8.5 introduces no new ruling.** R1–R19 are untouched by it: its one collision
> with §1–§5 — interactive header cells — is settled where the precedence ladder already
> settles that class of collision, by a row in §6.2 (**D-6**), not by a twentieth ruling.

---

### 8.1 Real-time monitoring surfaces

**What was tried and why it does not fit.** §6.4 maps the live map onto §2.5's *full-bleed
editor* layout — the theme-editor pattern, where the page breaks the frame to give one
canvas the whole viewport. It is the closest Shopify has, and it is wrong on two counts.
First, the theme editor's canvas is a *preview of the thing being edited*; the live map's
canvas is a *view of the world*, and the operator's actual work happens in a list beside
it, not on it. Second, and fatally, the theme editor is static: it re-renders when you
change something. `p-live` re-renders because time passed. Every rule in §1–§5 assumes a
surface that only changes when the user changes it — §1.6 caps motion at 300 ms because
motion means "you did something", §3.1 sets a row height because rows sit still, §5.1
gives success a toast because success is an event the user caused. None of that survives
contact with a 1 Hz feed. Shopify's Analytics *Live View* is the only moving surface in the
159 screenshots and it is a read-only globe with bar rows — no rows to act on, no
intervention, no operator interaction to protect. So: a third page layout, and the first
motion rule in the document that governs a loop rather than a transition.

#### 8.1.1 The monitor shell — a third page layout

§2.2 documents two approved layouts (full-width index, centred detail/form) and §2.5 a
third for full-bleed editors. **This is a fourth, and the only one permitted for a surface
that updates without user input.** It is a two-pane grid: a fluid canvas pane on the left
and a fixed-width synchronised side list on the right, both starting at the same top edge,
the side list sticky. `p-live` already ships it at `grid-template-columns:1fr 340px;gap:14px;align-items:start`
`[code]` `eyvar_ops_panel_v40_fixed.html:772`, with the side list's own column carrying
`position:sticky;top:60px` `[code]` `eyvar_ops_panel_v40_fixed.html:826`.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Live map & route history                                                            │  ← .ph, §2.2 header
│  Track active trips, monitor requests, and step in when needed                       │
├───────────────────────────────────────────────────────┬──────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ ⬤ Live tracking · 3 active · updated 2s ago       │ │ │ Active trips now     (3) │ │ ← side list, 340px
│ ├───────────────────────────────────────────────────┤ │ ├──────────────────────────┤ │    sticky, top:60px
│ │  [ ⬤ Live ]   [ ⟳ History ]                       │ │ │ ⬤ TRP-4182  Nora → KFD   │ │
│ ├───────────────────────────────────────────────────┤ │ │   0:42 elapsed · ETA 6m  │ │
│ │ Filter: (All)(In trip)(Done)(Late)(Cancelled)     │ │ │   [Track][Call][Step in] │ │ ← .btn-track /
│ ├────────┬────────┬─────────┬────────┬──────────────┤ │ ├──────────────────────────┤ │   .btn-call /
│ │ ACTIVE │ LATE   │ IDLE    │ AVG ETA│ FEED         │ │ │ ◐ TRP-4190  Sara → Olaya │ │   .btn-intervene
│ │   3    │   1    │   7     │ 6.2 m  │ 2s ago       │ │ │   1:18 elapsed · Late 4m │ │   :357/:359/:361
│ ├────────┴────────┴─────────┴────────┴──────────────┤ │ │   [Track][Call][Step in] │ │
│ │ ┌───────────────────────────────────────────────┐ │ │ └──────────────────────────┘ │
│ │ │ ● start ● end ▬ actual ┄ planned │  ← legend   │ │ ┌──────────────────────────┐ │
│ │ │                                               │ │ │ Sub trip requests    (0) │ │
│ │ │            [ map canvas, ≥360px ]             │ │ ├──────────────────────────┤ │
│ │ │                                               │ │ │ No requests waiting.     │ │
│ │ │                              [+]  ← zoom      │ │ └──────────────────────────┘ │
│ │ │                              [−]              │ │ ┌──────────────────────────┐ │
│ │ └───────────────────────────────────────────────┘ │ │ Ride requests        (3) │ │
│ ├───────────────────────────────────────────────────┤ │ ├──────────────────────────┤ │
│ │ ALL TRIPS — SELECTED DATE                         │ │ │ …                        │ │
│ │ Time  Driver  Rider  Vehicle  Dist  Dur  Status   │ │ └──────────────────────────┘ │
│ └───────────────────────────────────────────────────┘ │                              │
│  ←──────────── canvas pane, fluid (1fr) ────────────→ │ ←──── side list, 340px ────→ │
└───────────────────────────────────────────────────────┴──────────────────────────────┘
     ▲ selecting a row here highlights its marker ──── and selecting a marker scrolls
       the side list to that card. One selection, two panes.
```

The two panes are **one selection model**. `selectTrip()` sets `activeTrip` and both the
table row and the canvas redraw from it `[code]` `eyvar_ops_panel_v40_fixed.html:12687`; the
selected row tints `background:var(--blue-lt)` `[code]` `eyvar_ops_panel_v40_fixed.html:11522`.
That is the pattern, and it is the reason this is a layout and not just a card grid: a
two-pane shell whose panes do not share a selection is two cards, and should use §2.2
instead.

#### 8.1.2 Update cadence

One clock. The app runs exactly one `setInterval(tickEngine,1000)`
`[code]` `eyvar_ops_panel_v40_fixed.html:11968`, and every periodic surface subscribes to a
modulo bucket off it (`%5` ETA + sub-requests `[code]` `:12602`, `%15` SLA sweep
`[code]` `:12512`, `%20` inbox `[code]` `:12513`, `%60` countdown decrement
`[code]` `:12611`). This is correct and must not be diluted by per-page intervals.

Renderers gate on visibility: `if(lp && lp.classList.contains('on'))` before redrawing the
map `[code]` `eyvar_ops_panel_v40_fixed.html:12596`, the same guard on the cash queue
`[code]` `:12141` and the work inbox `[code]` `:19035`. An off-screen page must not paint.

**Rows may not animate on change.** The established technique is an in-place text patch
against a data attribute — `.js-eta[data-trip]` `[code]` `eyvar_ops_panel_v40_fixed.html:12604`
and `.js-wait[data-req]` `[code]` `:12576` — which rewrites one `textContent` and touches
nothing else. That is the only permitted update for a value inside a mounted row. Replacing
the row's HTML, flashing it, transitioning its background, or re-ordering the list to put
the changed row somewhere else all move a click target under a moving hand.

#### 8.1.3 Stale and dead feeds

Two independent conditions, two independent signals.

**Per-entity staleness** is already modelled: `lastPing` increments each tick and crosses
two thresholds — 120 s ("weak signal — check in") and 300 s ("no signal — 5 minutes without
a ping") `[code]` `eyvar_ops_panel_v40_fixed.html:12587-12593`. The three ping classes
`.ping-ok` / `.ping-warn` / `.ping-dead` carry it
`[code]` `eyvar_ops_panel_v40_fixed.html:328-330`.

**Whole-surface staleness** is not modelled at all. `#live-last-update` exists in the markup
`[code]` `eyvar_ops_panel_v40_fixed.html:775` and its only writer sits inside a dead code
path `[code]` `:11582`, so it renders permanently empty. Worse, the same bar hard-codes
`· 3 active trips · updates every second` `[code]` `:775` — a claim about the feed that is
printed whether or not the feed exists. A surface that asserts it is live while showing
frozen data is the single worst failure mode this section is written to prevent.

#### 8.1.4 The live dot

`.map-tab.active .tab-dot` pulses `[code]` `eyvar_ops_panel_v40_fixed.html:341-342`; a
static `.tab-dot` is grey `[code]` `:340`. The dot's meaning must be exactly one thing —
**data arrived recently** — and never "this tab is selected", which is what the current
selector actually says.

#### 8.1.5 Map chrome

| Element | Ships as | Ruling |
|---|---|---|
| Legend | `.ndv-legend`, absolutely positioned `top:8px;left:10px`, translucent white, hairline border `[code]` `:211` | Mandatory whenever more than one marker tone or line style is drawn |
| Canvas height | `#map-canvas` inline `height:360px` `[code]` `:817`; orphan `#map-leaflet{height:400px}` `[code]` `:349` for an element that no longer exists | One height rule, `min-height:360px`, flexible above it |
| Stats bar | `.map-stat` declared twice — flex-gap at `:217`, then redeclared as a divided strip at `:365` (the later wins) | One declaration; the divided strip |
| Marker tones | Hard-coded `#2E7D32` / `#C62828` / `#1A73E8` / `#E8A33D` in the legend markup `[code]` `:806-810` | Tokens only, mapped to §3.4 |
| Filter chips | `.map-fchip` / `.map-fchip.on` `[code]` `:345-347`; `setMapFilter` re-renders the table but never the canvas `[code]` `:11522-11524` | A filter must apply to both panes or to neither |

**Marker tone mapping.** Markers take their tone from the §3.4 badge palette so a marker and
its row's badge cannot disagree: success/`--green` = in trip and on time; warning/`--amber` =
late, or a stale feed; neutral/`--ghost` = idle or completed; `--blue` = the selected entity;
`--red` = a breached or intervened trip. **R5 does not apply here** — R5 bans red *badges*,
and a map marker is not a badge: it has no fill-plus-text pill geometry, carries no label,
and cannot be confused with a status token. Red markers are permitted and are stated as
permitted so nobody has to guess.

#### 8.1.6 Ambient / looping animation — amending §1.6 (R18)

§1.6 governs *transitions*: a discrete state change with a start and an end, capped at
300 ms, restricted to `opacity` and `transform`. It has nothing to say about a loop, and its
300 ms ceiling makes every `infinite` keyframe currently in the file illegal:

| Keyframe | Declared as | Violates §1.6 because |
|---|---|---|
| `ping-pulse` `[code]` `:331` | `1.4s infinite` on `.ping-warn` `[code]` `:329`, `0.7s infinite` on `.ping-dead` `[code]` `:330` | Exceeds 300 ms; dips opacity to `.3` |
| `live-dot` `[code]` `:342` | `2s infinite` on the active tab dot `[code]` `:341` | Exceeds 300 ms **and animates `box-shadow`**, which §1.6 bans outright |
| `reqPulse` `[code]` `:145` | `1.4s ease-in-out infinite`, applied inline to the Requests live chip `[code]` `:2084` and a modal glyph `[code]` `:4811` | Exceeds 300 ms; dips opacity to `.25` |

**R18 [ruling].** §1.6 is amended: it governs transitions only. A separate, narrower licence
covers ambient loops, and the loops above are non-conforming as written and must be
rewritten to it. The licence exists because a monitoring surface needs one honest signal
that the feed is alive — a static dot cannot distinguish "connected" from "frozen at
09:14" — and for nothing else.

**Rules**

- The monitor shell MUST be used for, and only for, a surface whose content updates without user input; it MUST be a two-pane grid of a fluid canvas pane plus a fixed 340 px side list, sticky, both panes top-aligned (`:772`, `:826`).
- The two panes MUST share exactly one selection: selecting in either pane MUST select in the other (`:12687`), and a filter MUST apply to both panes or to neither (`:11522-11524` currently applies to one).
- A monitoring page MUST NOT create its own timer; it MUST subscribe to the single 1000 ms tick (`:11968`) and MUST NOT request a bucket faster than 1 s.
- A renderer MUST NOT paint while its page lacks the `on` class (`:12596`, `:12141`, `:19035`).
- A value inside a mounted row MUST update by in-place text patch against a `data-` attribute (`:12604`, `:12576`). A row MUST NOT be re-rendered, flashed, tinted, transitioned, or highlighted because its data changed.
- A list MUST NOT re-sort or remove rows while the pointer is inside the list's bounding box or any element inside it has focus; the reorder MUST be deferred until neither is true. A row whose menu, modal, or confirm dialog is open MUST NOT be removed until that surface closes.
- Polling MUST NOT pause during operator interaction — only painting is deferred. The one exception already in the code is replay: while `0 < replayPct < 1` the redraw is skipped (`:12595-12600`), because the operator is scrubbing the same canvas.
- Every monitoring surface MUST display a last-update timestamp in its header bar and MUST refresh it every tick (`#live-last-update`, `:775`, currently never written).
- A monitoring surface MUST NOT print a hard-coded cadence or entity count; every number in the header bar MUST be computed from the data being shown (`:775` prints `· 3 active trips · updates every second` as a literal).
- When the last update exceeds 3× the expected interval, the surface MUST enter a stale state: the live dot stops looping and goes neutral, the timestamp switches to `Last update Nm ago`, and one page-level banner (§5.2) states that the feed has stopped. It MUST NOT keep the word "Live" on screen.
- Per-entity feed freshness MUST use exactly three states with the thresholds already in the code — fresh < 120 s, stale 120–299 s, dead ≥ 300 s (`:12587-12593`) — and MUST label each in text, not colour alone (`.ping-label`, `:332`).
- A pulsing live dot MUST mean "data for this entity arrived within the freshness window" and nothing else. Its absence MUST mean "not receiving". It MUST NOT indicate selection, activation, or tab state — the current selector `.map-tab.active .tab-dot` (`:341`) does exactly that and MUST be rebound to feed state.
- Marker tones MUST come from `:root` tokens mapped to the §3.4 badge palette; MUST NOT hard-code hexes (`:806-810`).
- The map MUST render its legend whenever more than one marker tone or line style is drawn, using `.ndv-legend` (`:211`), and every tone and style drawn MUST appear in it.
- The map MUST expose zoom controls and MUST NOT rely on scroll-wheel zoom alone.
- The map MUST cluster markers when more than 25 would render inside one 40 px square, and a cluster MUST show its count and MUST expand on click.
- The map pane MUST use `min-height:360px` and MUST NOT be given a fixed pixel height (`:817` fixes 360; `:349` fixes 400 for a dead element — both MUST be replaced by one rule).
- `.map-stat` MUST be declared once (`:217` and `:365` both declare it).

**Rules — ambient animation (R18, amending §1.6)**

- An ambient loop MUST be used for exactly one purpose: signalling that a live feed is receiving data. Any other looping animation MUST NOT ship.
- An ambient loop MUST animate `opacity` only. It MUST NOT animate `box-shadow` (`live-dot`, `:342`), `width`, `height`, `background`, `color`, or `transform`.
- An ambient loop's period MUST be ≥ 1200 ms and ≤ 2500 ms. `.ping-dead`'s `0.7s` (`:330`) is out of range.
- An ambient loop's opacity MUST NOT fall below `0.4`. `ping-pulse`'s `.3` (`:331`) and `reqPulse`'s `.25` (`:145`) are out of range.
- Loop speed MUST NOT encode severity. A faster loop for a worse state (`.ping-dead` `0.7s` vs `.ping-warn` `1.4s`, `:329-330`) MUST NOT ship; severity is carried by tone and label.
- A loop MUST stop when the condition it reports stops being true. A dead feed MUST NOT pulse (`.ping-dead`, `:330`, pulses to report that nothing is arriving).
- At most one looping element MAY be visible per card, and at most three per viewport.
- Every ambient loop MUST be disabled under `prefers-reduced-motion: reduce`, replaced by the same element rendered statically. This is not optional and is not covered by §1.6's transition clause.
- An ambient loop MUST NOT be the only carrier of its meaning: the element it decorates MUST also carry a text label (`.ping-label`, `:332`) or an adjacent timestamp.

---

### 8.2 Derived and computed values

**What was tried and why it does not fit.** §4.2 has one sentence on this: "Computed /
read-only fields. Rendered as normal boxes but showing a derived value or `--`", evidenced
by Profit and Margin on the product pricing card. That pattern is two leaf values hanging
off one input, with no published formula and nothing downstream. The plan editor is a
lattice: seven inputs feed eleven outputs across four different presentation forms —
a computed box `[code]` `eyvar_ops_panel_v40_fixed.html:1103`, two echo cells in a pricing
table `[code]` `:1121`, two worked-example cells `[code]` `:1121-1122`, and a six-value
preview strip `[code]` `:1086` — governed by a four-line chained formula printed on the page
`[code]` `:1125`. Rendering all of that "as a normal box" produces a form where the operator
cannot tell what they may type in. Worse, §4.6 reserves the flat-grey, reduced-contrast
treatment (`.btn[disabled]{opacity:.42}` `[code]` `:86`) for actions that *will* become
available — and `.computed-box` `[code]` `:255` is a 33 px input-shaped box on `--bg2` with
a `--border2` hairline, which is precisely what a disabled input looks like. The two signals
collide, and the collision resolves the wrong way: an operator reads "temporarily locked,
try again later" when the truth is "this can never be typed into". And §5.7's "constraints
and consequences go under the field, not in a tooltip" removes the obvious place to put the
formula.

#### 8.2.1 Three states, three shapes

| State | Meaning | Shape |
|---|---|---|
| **Editable** | You may type here | Bordered box, `--border2` hairline, white fill, 33 px `[code]` `:252` |
| **Disabled** | You may not type here *yet* | Same bordered box, reduced contrast — the §4.6 treatment `[code]` `:86` |
| **Derived** | Nobody types here, ever | **No box.** No border, no fill. Value in `--blue`, at input size, on the same 33 px baseline so the grid does not break |

**This overrides §4.2.** The border is the affordance: §4.2 itself makes `border-input`
deliberately stronger than `border` "so fields read as targets". A derived value is not a
target, so it does not get the border. Keeping the box and merely tinting the text — what
`.computed-box` does today — asks the border to mean two opposite things.

Derived values are `--blue` but MUST NOT be underlined and MUST NOT be clickable, so they
cannot be mistaken for a link under R3 (links get underline + `--blue-dk`).

#### 8.2.2 Where the formula is disclosed

Not a tooltip — §5.7 forbids it. Not helper text under one field — the formula belongs to
the group, not to any single input. It goes in a `.formula-box`: pale `--blue-lt` panel,
`--blue-dk` body, monospace `<code>` per line, with a `--blue` `.formula-note` footnote
ruled off at the top `[code]` `eyvar_ops_panel_v40_fixed.html:271-274`. The plan editor
already ships the shape correctly `[code]` `:1125`:

```
gross      = (trip_min × price/min) + (trip_km × price/km)
discounted = gross × (1 − discount%/100)
plan_total = discounted × execute_days
driver_earns = plan_total × (1 − eyvar%/100)
─────────────────────────────────────────────────────────
Example uses 10 km / 20 min. Actual computed from real trip data at booking.
```

The defect is not the shape, it is the wiring: that block is hand-written HTML with no link
to `cr()`, the function that actually computes it `[code]` `:12986`. The two can drift
silently, and a published formula that lies is worse than no formula.

#### 8.2.3 Live recompute

`.preview-strip` is the announcement surface: a pale `--blue-lt` band with a `--border`
top rule, sitting directly under the form top bar, holding label/value pairs
`[code]` `eyvar_ops_panel_v40_fixed.html:275-277`, mounted at `:1086`. Recompute is driven
by `upd()` `[code]` `:12987-12999`, bound to seven `input` listeners `[code]` `:13000` and
called once at parse `[code]` `:13001`.

Two real defects define the rules. First, **four inputs that affect the result are not
bound** — `fp3-duration`, `fp3-cap`, `fp3-sort` and the status select are absent from the
listener list `[code]` `:13000`, so the strip can show a stale number with no indication.
Second, **the preview and the saved value disagree on an empty field**: the preview coerces
blank to `0` via `gv()` `[code]` `:12984` while save keeps the previous stored value via
`numval()` `[code]` `:6150-6155`. The operator clears a field, watches the preview drop, and
saves something else entirely.

#### 8.2.4 Worked examples as a form element

A worked example is a first-class element, not decoration: it is the operator's only check
that the formula they just read means what they think. The plan editor renders it as a
column inside the same table as the inputs — `.ptable` `[code]` `:262`, computed columns
marked by `th.ci` (blue header) `[code]` `:264`, example cells `.ex-cell` with `.ex-tot`
(green, total) and `.ex-drv` (blue, driver share) `[code]` `:269-270`, header stating its
inputs literally: `Example (10km · 20min × exec days)` `[code]` `:1119`.

That is the right placement — row-aligned with the inputs it derives from, so the operator
reads across rather than jumping between cards. The defect is again fidelity: the example
column computes 10 km / 20 min without applying surge, while the production fare path does
apply it `[code]` `:12345` vs `:12401-12405`, so the example understates during surge. An
example computed by a second code path is a second product.

#### 8.2.5 Validation and dirty state

A computed field has no input of its own, so it cannot be invalid — only its inputs can.
`fp3-comm` carries HTML `max="100"` with no JS clamp and `fp3-disc` carries no maximum at
all `[code]` `eyvar_ops_panel_v40_fixed.html:1102`, so a discount above 100 % produces a
negative plan total that renders in the preview strip with no warning and saves cleanly.
The error belongs on the discount input and in a page-level critical banner (§5.2), never
on the computed box.

Dirty state is likewise an input property. A recompute is not an edit. Conversely, an
editable control that never reaches the save payload is a lie: the status custom-select at
`[code]` `:1105` is read by nothing in `savePlan()`, so the operator can change it, see it
change, save, and lose it silently.

**Rules**

- A derived value MUST NOT be rendered in an input-shaped box. It MUST have no border and no fill, sit on the same 33 px baseline as sibling inputs (`:252`), and render in `--blue`. **This overrides §4.2's "rendered as normal boxes" clause and retires `.computed-box` (`:255`) as declared.**
- A derived value MUST NOT be focusable, MUST NOT appear in the tab order, and MUST carry `aria-readonly="true"` plus `aria-live="polite"`.
- A derived value MUST NOT be underlined and MUST NOT be clickable, so it cannot be read as a link under R3.
- The disabled treatment (`:86`) MUST NOT be applied to a derived value, and a derived value MUST NOT be styled with `--bg2` fill plus a `--border2` hairline — that combination is reserved for a disabled input.
- A derived value with no computable result MUST render an em-dash `—`, never `0`, never blank, never a spinner. (Same rule as §3.7's delta.)
- The governing formula MUST be disclosed on the page in a `.formula-box` (`:271`) placed inside the same card section as the inputs it consumes, immediately below the last of them. It MUST NOT be disclosed in a tooltip (§5.7), a modal, or helper text under a single field.
- Every line of the chain MUST appear, in `<code>`, in the order it evaluates (`:1125`), and every assumption MUST appear in the `.formula-note` (`:274`).
- The formula box MUST be generated from the same source as the computation. A hand-written formula block that duplicates a compute function (`:1125` vs `cr()` at `:12986`) MUST NOT ship.
- A surface carrying two or more derived values MUST render one `.preview-strip` (`:275`) directly beneath the form top bar (`:1086`), and it MUST carry `aria-live="polite"`.
- Every input named in the formula MUST be bound to the recompute handler. The count of bound listeners MUST equal the count of inputs the formula reads (`:13000` binds 7; the formula plus save read 11).
- Recompute MUST fire on the `input` event, not on `change` or `blur`.
- Recompute MUST NOT animate: no flash, no colour transition, no count-up. The value is replaced in place. (§8.1 and R18 apply.)
- If a recompute cannot complete within 150 ms, every affected derived value MUST be replaced by `—` for the duration. A stale number MUST NOT remain on screen while a newer one is being computed.
- Exactly one numeric coercion function MUST serve both preview and save. Two functions with different blank-field semantics (`gv()` at `:12984` returns 0; `numval()` at `:6150` returns the previous value) MUST NOT ship.
- A computed column in a table MUST be marked in its header (`th.ci`, `:264`) and MUST NOT contain an input.
- A worked example MUST live in the same table as the inputs it derives from, row-aligned (`:1117-1124`), and MUST state its literal inputs in the column header (`:1119`).
- A worked example MUST be computed by the same code path as the production value it illustrates. Two paths (`:12345` vs `:12401-12405`) MUST NOT ship.
- A derived value MUST NOT be independently validated. A result outside its legal range MUST raise the error on the input(s) that produced it, plus one page-level critical banner (§5.2) naming the input to fix.
- Every numeric input feeding a derived value MUST declare and enforce `min` and `max` in JS, not in HTML attributes alone (`:1102`).
- A recompute MUST NOT set the dirty state and MUST NOT arm the save bar. Dirty means an editable field differs from its persisted value.
- Every editable control on a form MUST be read by that form's save handler. A control the save payload ignores (`#fp3-status`, `:1105`) MUST be removed or wired.
- Derived values MUST NOT be persisted. They MUST be recomputed on read from the stored inputs.

---

### 8.3 Money and ledgers

**What was tried and why it does not fit.** Two Shopify patterns were tried and neither
covers the case. §4.2 governs money as an *input* — "currency symbols as an in-field left
prefix, unit codes as an in-field right suffix" — which says nothing about money as output.
§3.5's key-value row (label left, optional grey qualifier, value right-aligned, bold total)
governs money as *output* and is genuinely right for an order summary: one settled amount,
attached to one record, that will never change. Eyvar's money moves. A driver wallet is a
balance with a history; a cash-debt ledger accumulates negatively `[code]` `eyvar_ops_panel_v40_fixed.html:12088-12092`;
a subscription payment sits in an authorization hold before it is captured
`[code]` `:9593-9619`; escrow is held against future delivery `[code]` `:2801-2806`. Shopify
has no negative amount anywhere in 159 screenshots, no running balance, no pending state
that resolves, and no ledger. The document consequently has no rule for the most
consequential thing an ops console displays, and the codebase shows the result: 87
independent money strings, at least three formatters (`fmtSAR()` `[code]` `:4394`, an
identical `fmt()` `[code]` `:12985`, and raw `.toFixed(2)+' SAR'` inline
`[code]` `:6693`), one negative rendered as `'−'+fee.toFixed(2)+' SAR'` in `--red`
`[code]` `:5537`, and a payouts table whose amounts carry no unit at all `[code]` `:985`.

#### 8.3.1 Money formatting

| Property | Ruling | Why |
|---|---|---|
| Unit | ISO code `SAR`, never the ﷼ glyph | The glyph is absent from `system-ui` (`:15`) and ambiguous in a Latin-script UI |
| Position | Trailing, one space: `48230.00 SAR` | Already the codebase convention in all 87 sites (`:4394`, `:6693`, `:5537`) |
| Decimals | Always exactly 2. Never trimmed, never rounded to whole | `.toFixed(2)` throughout (`:4394`) |
| Thousands | `,` every three digits | Absent today: `48,230` is a hand-typed literal (`:932`) while `501.98` is computed (`:936`) — the page mixes both |
| Figures | `font-variant-numeric: tabular-nums` on every money value | Already used once, on the dispatch countdown (`:5015`); decimal points must line up under R4 |
| Alignment | Right, header and value sharing a right edge | R4, upheld and extended: R4 said "right-align"; §8.3 adds that fixed 2 dp + tabular figures are what make right-alignment actually align |
| Zero | `0.00 SAR` | `—` means "not applicable / unknown" and MUST NOT be reused for "no money" |

**Unit placement in tables.** Inside a table the unit goes in the column header once —
`Gross (SAR)` `[code]` `:951` — and MUST NOT repeat in the cells. Outside a table (KPI value,
key-value row, banner, toast, modal summary) every amount carries the code. The payouts
table today does neither: the unit appears only in a badge and a button label
`[code]` `:982`, so the cells are bare numbers.

#### 8.3.2 Negative amounts, and R5

R5 bans red badges. A negative amount is not a badge — it is a value — but the codebase
currently reaches for `--red` anyway `[code]` `eyvar_ops_panel_v40_fixed.html:3953`, `:5537`,
and in a ledger where most rows are debits that makes red mean nothing.

**[ruling]** Sign is carried typographically, never chromatically. The minus is U+2212
(`−`), not a hyphen — which the codebase already gets right `[code]` `:5537` — set
immediately before the digits with no space. The value renders in `--ink` like every other
amount. Colour MAY be added only where the sign already carries the meaning, so that
removing the colour loses nothing; it MUST NOT be the only signal. Accounting parentheses
are banned: `(6.40)` is unreadable next to footnote markers.

A negative amount MUST NOT be placed in a badge or pill of any tone. This is R5 applied
literally, and it retires the pattern at `[code]` `:3953`.

#### 8.3.3 The ledger pattern

A ledger is any table whose rows are postings against a balance. It is not an index table
and it does not get index-table furniture.

```
┌─ Wallet ledger — RDR-1041 · Nora Al-Harbi ─────────────────────────────────────────────┐
│                                                                    Balance  20.00 SAR   │
│                                                                    Pending   0.00 SAR   │
├────────────┬───────────┬─────────────────────────────────┬─────────┬─────────┬─────────┤
│ Date       │ Reference │ Description                     │   Debit │  Credit │ Balance │  ← R4: all
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     three right,
│ 18 Jul     │ —         │ Opening balance                 │       — │       — │    0.00 │  ← opening row
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     bold both sides
│ 18 Jul     │ WTX-0002  │ Referral bonus — Sara Al-Ghamdi │       — │   20.00 │   20.00 │
│ 09:30      │           │                                 │         │         │         │
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤
│ 19 Jul     │ WTX-0003  │ Trip fare — TRP-4182            │    6.40 │       — │   13.60 │
│ 08:12      │           │ ↳ TRP-4182                      │         │         │         │  ← source link,
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     the ONLY
│ 19 Jul     │ WTX-0004  │ Reverses WTX-0003 — fare dispute│       — │    6.40 │   20.00 │     per-row control
│ 11:47      │           │ ↳ WTX-0003                      │         │         │         │  ← correction is a
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     new row, never
│ 20 Jul     │ WTX-0005  │ Subscription — held, not settled│       — │  120.00 │       — │     an edit
│ 07:05      │           │ ⟨ Pending ⟩  authorised, awaiting capture      warning tone     │  ← excluded from
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     the balance
│ Closing balance                                          │    6.40 │   26.40 │   20.00 │  ← closing row
└──────────────────────────────────────────────────────────┴─────────┴─────────┴─────────┘
  No checkbox column.  No hover kebab (.ra, :153).  No bulk action bar.  Not user-sortable.
  Showing 6 of 6 postings.
```

**Debit and credit are two columns, both holding positive numbers.** The sign lives in the
column choice, which is unambiguous, survives right-alignment, and removes the negative-
colour question entirely for the surface where it matters most. The single-signed-column
form is permitted only in a rail card ≤ 320 px, where §8.3.2's U+2212 rule applies instead —
and such a card MUST omit the running balance and link to the full ledger.

**Running balance.** `balanceAfter` is already computed and persisted on every wallet
posting `[code]` `eyvar_ops_panel_v40_fixed.html:3937` (credit), `:3947` (debit), and seeded
on existing records `[code]` `:2594`, `:2599` — and is **rendered nowhere in the product**.
The ledger column is that stored value, not a value recomputed at render time, so a
correction to history cannot silently rewrite what the operator saw.

**Append-only.** A posting is a fact. `releaseEscrow` splices the hold out of the array
`[code]` `:7064` instead of transitioning it, and `payDriver` sets `pending = 0` as a hard
assignment rather than a subtraction `[code]` `:7030`; both destroy history. Corrections are
new reversing rows that reference the original, as `WTX-0004` does in the wireframe.

**Ledger rows are not index rows.** §3.1's row-overflow kebab (`.ra`, `[code]` `:153`) and
§3.3's selection checkbox plus floating bulk-action bar MUST NOT appear on a ledger. They
exist to mutate or remove the records they sit on, which is exactly what a ledger row
forbids. The only per-row control permitted is a read-only link to the source document.

**Order.** A running balance is only meaningful in posting order, so the full ledger is
oldest-first with the opening row at the top and the closing row at the bottom, and it is
not user-sortable. The truncated "recent activity" list — six rows, newest-first, in a rail
card `[code]` `:3951-3953` — is the permitted exception, and it omits the balance column.

#### 8.3.4 Pending and reconciling as lifecycle states

Money has more states than Shopify's `Paid` / `Refunded` / `Voided`, and every one of them
needs an assigned tone from the closed §3.4 palette:

| State | Where it lives | Tone | Rationale |
|---|---|---|---|
| `settled` / `captured` / `paid` | `capturePaymentHold` `[code]` `:9605-9619` | **success** | Money has moved and nothing is owed |
| `held` / `authorised` | `ensureHold` `[code]` `:9593`; `holdBadge` `[code]` `:9639-9644` | **warning** | §3.4 reserves warning for states that block money — a hold is exactly that |
| `pending` | cash queue `[code]` `:12130` | **warning** | Same reason |
| `reconciling` | cash classification `[code]` `:12083-12087` | **warning** | Same reason |
| `released` (no charge) / `reversed` / `voided` | `releasePaymentHold` `[code]` `:9599` | **neutral** | §3.4: terminal factual outcome, no action left |
| `escalated` / `failed` | `resolveCashEntry` `[code]` `:12146` | **not a badge** — R5 | Routed to §8.4's row-level critical signal |

A pending amount is not part of a balance. It is a separate labelled line beneath it, as in
the wireframe, and the running balance column includes settled postings only.

**Rules**

- Exactly one money formatter MUST exist and every money string in the product MUST come from it. Inline `.toFixed(2)+' SAR'` (`:6693`) and duplicate formatters (`fmtSAR()` `:4394`, `fmt()` `:12985`) MUST NOT ship.
- Money MUST render as `<amount> SAR`: ISO code, trailing, one space. MUST NOT use the ﷼ glyph and MUST NOT use a leading symbol. **§4.2's currency-prefix rule governs inputs only and MUST NOT be applied to output.**
- Money MUST render exactly 2 decimal places, always, including whole amounts.
- Money MUST use a `,` thousands separator (`Intl.NumberFormat('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})`). Hand-typed separators (`:932`) MUST NOT ship.
- Every money value MUST set `font-variant-numeric: tabular-nums` (`:5015`).
- Money columns MUST be right-aligned, header and value sharing a right edge (R4, upheld).
- Inside a table the unit MUST appear once, in the column header as `(SAR)` (`:951`), and MUST NOT repeat in cells. Outside a table every amount MUST carry the code. A money cell with no unit anywhere on the surface (`:985`) MUST NOT ship.
- Zero MUST render `0.00 SAR`. `—` MUST be reserved for not-applicable or unknown.
- A negative amount MUST be prefixed with U+2212 `−` (`:5537`), never a hyphen, never parentheses.
- A negative amount MUST NOT rely on colour as its only signal, and MUST NOT be rendered in a badge or pill of any tone (`:3953`). **R5 upheld and applied to values.**
- A ledger MUST use the fixed column order Date · Reference · Description · Debit · Credit · Balance, with debit and credit as two columns holding positive numbers. A single signed amount column is permitted only in a rail card ≤ 320 px wide, which MUST then omit the balance column and MUST link to the full ledger.
- A ledger MUST render a running balance as its last column, MUST source it from the persisted `balanceAfter` (`:3937`, `:3947`), and MUST NOT recompute it at render time.
- A ledger MUST open with a labelled opening-balance row and close with a labelled closing-balance row, both bold on both sides (§3.5's total convention). The closing balance MUST equal the balance displayed in the card header.
- Ledger rows MUST be append-only. A posting MUST NOT be edited or deleted; a correction MUST be a new row that names the row it reverses. Splicing a record out of a money array (`:7064`) and hard-assigning a balance to zero (`:7030`) MUST NOT ship.
- **§3.1 row actions (`.ra`, `:153`) MUST NOT appear on a ledger row, and §3.3 bulk selection — checkbox column, selection header, floating bulk-action bar — MUST NOT appear on a ledger.** The only permitted per-row control is a read-only link to the source document.
- A ledger MUST be sorted oldest-first by posting time and MUST NOT be user-sortable. The truncated rail-card variant (`:3951-3953`) MUST be newest-first, MUST omit the balance column, and MUST link to the full ledger.
- A truncated ledger MUST state its truncation in words below the last row (`Showing 150 of 412 postings`). A silent row cap (`:12250`) MUST NOT ship.
- Every money state MUST map to exactly one §3.4 tone per the table above: settled → success; held / authorised / pending / reconciling → warning; released / reversed / voided → neutral.
- A pending or held amount MUST NOT be included in a displayed balance and MUST NOT be included in the running-balance column. It MUST appear as a separate labelled line beneath the balance.
- A failed or escalated money state MUST NOT be a badge (R5); it MUST use the row-level critical signal defined in §8.4.

---

### 8.4 Work queues and SLA

**What was tried and why it does not fit.** §6.4 maps these pages onto §3.1's index table
plus §3.2's view tabs plus §3.3's bulk actions — the orders-index pattern. The mapping
survives about one screen. An index row is a *resource*: it exists before you open the page
and after you close it, it can be edited and re-edited, and its status is a property you can
change back. A queue row is a *unit of work*: it is claimed by one person, it has a deadline
running against it, it is decided once, and then it leaves. Shopify's nearest approach is
the `Unfulfilled` tab on the orders index, but a fulfilled order is still an order — it does
not exit the list, nobody claims it, and no clock runs on it. Everything a queue needs is
therefore missing: no ownership model, no countdown component, no escalation, no disposition
semantics, no rule for what a row looks like after it is decided. And the sharpest gap is at
the end: R5 routes critical state to a page-level banner, §5.2 forbids stacking banners, and
a queue's critical state is per-row and plural. As written, the document has no legal way to
render "this row is critical". §8.4.6 fixes that.

#### 8.4.1 Claim and assign

Two ownership implementations ship today and they disagree. The lightweight one sets
`_locking` then `claimedBy` / `claimedAt` directly on the request record, with no permission
check at claim time `[code]` `eyvar_ops_panel_v40_fixed.html:11876`, `:10237` — the gate
appears only at commit `[code]` `:11885`. The full one is `DB.ownership`, keyed
`type + ':' + id` `[code]` `:18858`, with `claimItem` `[code]` `:18877-18892`, `releaseItem`
`[code]` `:18897`, confirmed takeover `[code]` `:18942-18954`, a 30-minute stale expiry
`[code]` `:18853`, and audit on every transition. The second is the model; the first is a
defect.

The owner chip is three states `[code]` `:18928-18941`: unclaimed → `✋ Claim`; yours →
success tone, `✋ yours · 4m`, plus a release control; someone else's → warning tone,
`✋ Layla`, plus `take over`.

Two behaviours need naming as defects. `inboxOpen()` claims silently on open
`[code]` `:19301-19310` — deliberate, so two people do not start the same case, but it means
there is no way to *look* at a queue item. And the stale sweep runs as a side effect of
*reading* ownership `[code]` `:18865-18875`, so rendering the inbox mutates state and writes
audit rows up to three times per item every 20 seconds.

#### 8.4.2 SLA countdown display

There are at least six countdown components in the file: `.sla-bar` / `.sla-fill`
`[code]` `:333-334`, the `.days-ok` / `.days-warn` / `.days-crit` pill trio
`[code]` `:140-142`, `dueChip` `[code]` `:19230-19238`, `reqSlaBadge` `[code]` `:9921-9930`,
`subReqSlaBadge` `[code]` `:9937-9947`, and `slaBadge` `[code]` `:14791-14803`. `.days-ok` is
byte-identical to `.b-green` and `.h-green` — the D6 defect in §6.3 — and the audit records
that `.sla-bar` and the `.days-*` trio have no governing rule at all. This is that rule.

**One component.** A remaining-time pill, plus an optional 3 px `.sla-bar` track beneath it
`[code]` `:333-334` shown only when the total window is known.

Format comes from `fmtAge` `[code]` `:14630-14636`: under an hour `12m left`; under a day
`3h 20m left`; beyond that `2d 4h left`; overdue `overdue 14m`. Items with no deadline read
`no clock` in neutral and sort last — "it has no clock, so it cannot be more urgent than
something that has one" `[code]` `:19222-19224`.

**Three bands, mapped to §3.4:** ≥ 50 % of the window remaining → neutral; < 50 % → warning;
breached → critical, which under R5 cannot be a pill, and is therefore handled by §8.4.6.

The bar's denominator MUST be the item's own SLA target. Today it is the literal `90`
`[code]` `:11652`, so the bar means something different on every queue that borrows it.

#### 8.4.3 Escalation

Breach crossing is already modelled correctly once: at 180 s the instant-request engine sets
`no_drivers`, sounds an alert, toasts, pushes one ops notification and writes
`logAction('sla_breach')` `[code]` `eyvar_ops_panel_v40_fixed.html:12544-12553` — once, at
the crossing, not on every subsequent tick. Multiple crossings inside one tick are batched
into a single notification with a count, with the reasoning written into the source
`[code]` `:9674-9678`. Both behaviours are the rule.

Two are not. `playAlertBeep()` fires unconditionally with no mute
`[code]` `:9731-9749`, and `reopenSubReq()` rewrites `requestedAt` to now
`[code]` `:10302-10310`, restarting the clock and destroying the original ask time.

#### 8.4.4 Disposition

A queue's dispositions are a closed set, declared per queue, rendered as buttons in the row's
action cell. The applicant queue is the reference: `Reject` (danger) and `Approve` (success),
side by side, replaced entirely once decided `[code]` `:10925-10928`.

The gating defect is systemic: claim and disposition controls render regardless of
permission and only check at commit `[code]` `:10237`, `:11876`. An operator clicks, waits,
and is told no.

#### 8.4.5 What visibly happens to a row after a decision

The row converts in place. It does not vanish — a row that disappears on click gives the
operator no confirmation of what they just did and no route to undo it. Actions are replaced
by `decisionBadge()`, which names outcome, actor and reason
`[code]` `eyvar_ops_panel_v40_fixed.html:10905-10909`, with the timestamp beneath
`[code]` `:10925`. The same badge drives the detail page's inline status banner
`[code]` `:7124`.

Two corrections. `decisionBadge` renders rejection as `b-red` `[code]` `:10907`, which R5
bans — and §3.4 already supplies the right answer: a rejection is a *terminal factual
outcome with no action left*, which is the neutral-plus-solid-dot case, exactly like
`Refunded` and `Voided`. And the decided row is dimmed with `opacity:.7`
`[code]` `:10929`, which is §4.6's disabled treatment and therefore says "this will become
available again". Decided rows drop to `--muted` text and lose their interactive
affordances instead.

#### 8.4.6 The row-level critical signal — amending R5 (R5a)

**The problem, stated exactly.** R5 says critical state goes to a banner or a red action, not
a red pill. §5.2 says banners MUST NOT stack — merge conditions into one banner with a count.
A queue's critical state is per-row and there can be nine of them at once. So: nine banners
is illegal, one banner cannot point at nine rows, and a red pill on each row is illegal. The
document currently offers no legal rendering.

**[ruling] The solution is three parts, and all three are required.**

**(a) One aggregate banner, with a count and a filter.** §5.2's merge clause is the licence:
a single page-level critical banner reading `4 items are past their SLA.` with one secondary
button, `Show only breached`, that filters the list to them. This is the page-level half R5
demands, it satisfies §5.2's no-stacking rule by construction, and it gives the operator a
route from the banner to the rows.

**(b) A leading edge marker on the row — not a badge.** A 3 px full-height bar in `--red` on
the row's leading edge, drawn as `box-shadow: inset 3px 0 0 var(--red)`. This is legal under
R5 because it is not a badge: it has no pill geometry, no fill-plus-text pairing, no label,
and sits outside the row's content box, so it cannot be mistaken for or confused with a
status token from the §3.4 palette. The idiom is already in the product for a non-badge
state signal — the active nav item uses `box-shadow: inset 3px 0 0 var(--blue)`
`[code]` `eyvar_ops_panel_v40_fixed.html:43`.

**(c) The countdown pill must say it in words.** The marker is never the only signal. The
row's countdown pill switches to `overdue 14m` in warning tone, so the state is legible with
colour removed, at 4.5:1 contrast, and to a screen reader. Colour-only critical state is
banned here exactly as §3.4 bans colour-only badges.

**R5a [ruling], amending R5.** R5 stands: *no red badges*. It is amended to name the complete
set of places red is permitted, so this is not re-litigated per feature:

1. A destructive action (button), per §4.6.
2. A page-level critical banner, per §5.2 — at most one per page.
3. **A 3 px leading edge marker on a queue row whose SLA has breached**, always accompanied
   by the word `overdue` in that row's countdown pill.
4. A map marker, per §8.1.5 — a marker is not a badge.

Red remains banned as a pill or badge fill in every other case, including
`.b-red` `[code]` `:120`, `.days-crit` `[code]` `:142`, and `.h-red` `[code]` `:134`. All
three are non-conforming as used and are the concrete work item behind D5 and D6 in §6.3.

One further consequence: under R18 (§8.1.6) a loop must not encode severity, so a breaching
row MUST NOT pulse. `reqPulse` `[code]` `:145` is not a critical signal and MUST NOT be
applied to one.

The `.al-row` alert row already carries a second red container — the `.ai-r` icon tile
`[code]` `:158`, `:163` — which is legal for the same reason the edge marker is (an icon
container, not a pill). But a row MUST carry at most one red carrier: the edge marker or the
icon tile, never both, or red stops meaning "this one".

**Rules — claim and assign**

- Exactly one ownership model MUST exist. The `DB.ownership` model (`:18858`, `:18877`, `:18897`, `:18942`) is that model; the ad-hoc `_locking` / `claimedBy` fields on request records (`:11876`, `:10237`) MUST be migrated onto it.
- Every queue row MUST render an owner chip in a fixed position — the last cell before the action cell — in one of exactly three states: `✋ Claim` (neutral), yours (success tone, with elapsed hold time and a release control), someone else's (warning tone, with their name and a `take over` control) (`:18928-18941`).
- A claim control MUST check permission at click, not only at commit (`:10237`, `:11876` check only at commit).
- Taking over a live claim MUST open a confirm modal (§5.3) whose title names the current owner and whose body states that they lose the item without being asked (`:18942-18954`).
- A claim MUST expire after a stated idle period, that period MUST be displayed in the UI (30 min, `:18853`), and expiry MUST be evaluated on a timer — never as a side effect of a render (`:18865-18875` expires claims while reading them).
- Opening a queue item MUST NOT claim it. A row MUST expose `Open` and `Claim` as two separate controls (`:19301-19310` claims on open).
- A queue row MUST NOT carry a §3.3 selection checkbox unless every bulk action offered is a claim or assign action. Bulk disposition MUST NOT ship.

**Rules — SLA countdown**

- Exactly one countdown component MUST exist: a remaining-time pill, plus an optional 3 px `.sla-bar` track (`:333-334`) shown only when the total window is known. `.days-ok` / `.days-warn` / `.days-crit` (`:140-142`), `dueChip` (`:19230`), `reqSlaBadge` (`:9921`), `subReqSlaBadge` (`:9937`) and `slaBadge` (`:14791`) MUST collapse into it.
- The countdown label MUST use one format: `Nm left` under 60 minutes, `Nh Mm left` under 24 hours, `Nd Hh left` beyond, `overdue Nm` when breached (`:14630-14636`).
- An item with no deadline MUST read `no clock` in neutral tone and MUST sort last (`:19222-19224`). It MUST NOT render `—` and MUST NOT be given a synthetic deadline. Three queues currently hardcode `dueMs = -1` (`:19155`, `:19169`, `:19192`) and MUST NOT ship.
- The countdown MUST use exactly three tone bands: ≥ 50 % of window remaining → neutral; < 50 % → warning; breached → the §8.4.6 critical signal.
- The `.sla-fill` width MUST be computed from the item's own SLA target. A hardcoded denominator (`90` at `:11652`) MUST NOT ship.
- The countdown MUST tick from the single app clock (`:11968`), MUST update at most once per second, and MUST NOT re-sort or reflow the list while §8.1's pointer-and-focus guard is active.

**Rules — escalation**

- A breach MUST fire its escalation exactly once, at the crossing: one audit entry, one ops notification (`:12544-12553`). It MUST NOT re-fire on subsequent ticks.
- Multiple breaches inside one tick MUST be batched into one notification carrying a count (`:9674-9678`). N toasts MUST NOT ship.
- An audible alert MUST be opt-in and MUST have a visible mute control (`playAlertBeep()` at `:9731-9749` is unconditional).
- Escalation MUST NOT reassign, re-queue, or release ownership automatically.
- Re-opening a decided or expired item MUST preserve its original request timestamp and MUST record the re-open as a separate event. Rewriting `requestedAt` to now (`:10302-10310`) MUST NOT ship.

**Rules — disposition**

- Every queue MUST declare a closed, documented set of dispositions. Each MUST be labelled with a verb (§5.7) and rendered in the row's action cell (`:10925-10928`).
- At most one disposition per row MAY be a filled primary (§4.6). A destructive disposition MUST confirm (§5.3).
- A disposition control MUST check permission at click, not only at commit.
- On decision the row MUST convert in place: action controls replaced by `decisionBadge()` naming outcome, actor and reason (`:10905-10909`), with the decision timestamp beneath (`:10925`).
- A decided row MUST NOT be removed by a background refresh. It MUST remain visible until the operator navigates away or explicitly clears it.
- The queue's count badge and its sidebar badge MUST decrement immediately on decision, while the decided row is still on screen.
- A decided row MUST NOT use `opacity` to de-emphasise (`:10929` uses `.7`, which is §4.6's disabled treatment). It MUST switch its primary text to `--muted` and drop its hover and click affordances.
- A rejection badge MUST be **neutral with a solid dot**, per §3.4's terminal-factual-outcome case. `b-red` (`:10907`) MUST NOT ship. **R5, upheld.**
- A decided row MUST expose a re-open control only where re-opening is permitted, and re-opening MUST NOT restart the original clock.

**Rules — row-level critical signal (R5a, amending R5)**

- A page whose queue contains one or more breached items MUST render **exactly one** page-level critical banner stating the count (`4 items are past their SLA.`) with one secondary button that filters the list to the breached items. It MUST NOT render one banner per item (§5.2).
- A breached row MUST carry a 3 px leading edge marker, `box-shadow: inset 3px 0 0 var(--red)`, following the existing non-badge edge-marker idiom (`:43`).
- A breached row MUST also render the word `overdue` in its countdown pill. The edge marker MUST NOT be the only carrier of the state.
- A breached row MUST NOT render a red badge or pill of any kind. `.b-red` (`:120`), `.days-crit` (`:142`) and `.h-red` (`:134`) MUST NOT be used for it.
- A breached row MUST NOT pulse, blink, or loop (R18, §8.1.6). `reqPulse` (`:145`) MUST NOT be applied to a critical state.
- A row MUST carry at most one red carrier — the edge marker or an `.ai-r` icon tile (`:163`), never both.
- Red MUST appear only in the four places R5a enumerates: a destructive button, one page-level critical banner, a breached-row edge marker, and a map marker. Any fifth use requires a written entry in §6.2.

---

### 8.5 Dense tables: per-column controls and column pinning

**What was tried and why it does not fit.** §3.1 and §3.2 govern a list of records that fits.
Every control they define lives in the **toolbar**: one sort popover, one filter chip row, one
optional columns icon. That works at Shopify's ~40 px rows and six-to-eight columns on a page
someone visits. Eyvar runs 23 of its 41 pages as tables at **32 px rows** (§6.2 D-2), some
carrying twelve columns `[code]` `eyvar_ops_panel_v40_fixed.html:740-751`, in front of an
operator who works one of them all day. Two things break.

**First, the toolbar cannot reach a column.** §3.2's sort popover asks *which field*, which
means the operator must translate "I want this column sorted" into "find its name in a radio
list." §3.1's filter chips have the same indirection. The column is right there, under the
pointer, and the control is 400 px away in a popover.

**Second, §3.1 concedes horizontal scroll and then stops.** *"Wide tables clip at the card's
right edge"* `[observed]` `02-orders/orders-list-with-metrics-row.webp` — the `Tags` column is
cut off with no scrollbar in frame. The document adds: *"That they scroll horizontally, and that
the checkbox + primary cell stay pinned while they do, are both `[Polaris]` — a static frame
cannot show a scroll."* So §3.1 has **already committed to implicit column pinning** on recall,
with no rule attached, no statement of which columns, no visual treatment, and no RTL clause —
in a document whose §9 exists because directional geometry is where this product breaks.

**And §2.5 already makes it a MUST, for exactly one surface:** *"Bulk grids MUST be edge-to-edge
with a sticky header row and a **frozen identity column**."* So a frozen column is normative in
this document today — for the full-bleed bulk editor, and nowhere else, with no statement of
which column beyond "identity", no visual treatment, no cap and no RTL clause. §8.5 generalises
that MUST to every dense table rather than inventing a second rule beside it.

Nothing in §1–§5 covers an operator freezing a column of their own choosing, and Eyvar already
ships one, badly (§8.5.1).

#### 8.5.1 What already exists, and the defect in it

**Shopify does freeze a column** — in the full-screen bulk-edit grid, not the index table.
`03-products/products-bulk-editor-grid.webp` and `03-products/products-bulk-editor-price-columns.webp`
are the same grid at two horizontal scroll offsets. Diffing them with PIL `[observed]`:

```
region                              mean channel diff   max
Product title column   (x < 210)                0.13     14   <- WebP compression noise
first scrolling column (x 230+)                 8.25    220
```

The first column does not move; `Tags` scrolls away and `Status` slides up against it. The
frozen boundary, sampled at a body row in both frames:

```
x           204 ... 211   212    213    214   215
grid        247,247       241    248    255   254
scrolled    247,247       241    248    255   254
```

`[observed]` **One 1 px hairline, identical scrolled and unscrolled.** No gradient falloff, so
no shadow — a `0 ... 6px` blur would render as a ramp across four to eight pixels and there is
none.

**Eyvar already pins a column, physically.** `[code]` `eyvar_ops_panel_v40_fixed.html:751` and
`:3555`, on the twelve-column Subscriptions index:

```html
<th style="position:sticky;right:0;background:var(--bg2);
           box-shadow:-4px 0 6px -4px rgba(0,0,0,.12)">Actions</th>
```

with `.tbl-scroll{overflow-x:auto}` at `:147` as the scroll container `[code]`. Three readings,
all load-bearing:

1. **The thing operators pin is the row's action control**, not a data column. That is a real
   requirement, and §8.5.3 makes it structural rather than optional.
2. **`right:0` has no `[dir="rtl"]` counterpart anywhere in the file.** The only RTL overrides
   are `.sb` `:383-385` and `.settings-nav-col` `:401-402` `[code]`. In Arabic the pinned column
   freezes to the edge the reader's eye *leaves*, and scrolling carries it further away. Same
   family as the three defects §9.1 already lists.
3. **The shadow carries a negative x-offset.** §1.4's elevation set is `offset-x: 0` throughout,
   deliberately, so elevation never needs an RTL branch. `-4px 0 6px -4px` is exactly what that
   closure exists to prevent. It is a defect, not a precedent.

#### 8.5.2 Per-column controls

**[ruling]** A header cell contains **exactly one** interactive element — a button opening a
menu — or **none**. Never two. The menu carries only what the column declares: a sort direction
pair, a filter, a pin, a hide. This is the deviation sanctioned as **D-6**; §6.2 carries the
full argument and the three clauses it suspends.

```
+- 200px -----------------------+   start-aligned header      end-aligned header
| (*)  ^  Sort A to Z           |   +------------------+      +------------------+
| ( )  v  Sort Z to A           |   | Captain  ^  v    |      |    v  v  Trips   |
|      Clear sort               |   +------------------+      +------------------+
| ----------------------------- |     label flush to the        label flush to the
|      Filter...                |     inline-START              inline-END, so header
|      Clear filter             |                               and value share one
| ----------------------------- |                               edge — R4 upheld
|      Pin column               |
|      Hide column              |
+-------------------------------+
```

**Glyph assignment, made disjoint.** §1.5 and §9.1 translation row 9 reserve the trailing caret
*"exclusively for controls that open a menu or select."* §3.1's `[observed]` sort indicator is
also a chevron. Both cannot hold once every header is a menu, so:

| Glyph | Means |
|---|---|
| `⌄` | this opens a menu — header trigger, filter chip, saved-view tab, `More actions` |
| `↑` `↓` | sort direction — header indicator, and §3.2's direction pair, which already uses arrows `[observed]` |
| `⇅` | the toolbar sort control |

Neither mirrors in Arabic. `↑ ↓` are vertical magnitude (§9.2); `⌄` points block-end and only
its *position* moves.

**The affordance is not hover-only.** The `⌄` renders at rest, at `--muted`, on every header
with a menu, and takes `--ink` plus a `--bg2` cell fill on `:hover`, on `:focus-visible` and
while its menu is open — the same two-step §7.3 already requires of the row kebab. §7 beats §3,
and capability that is invisible without a pointer does not exist for a keyboard operator.

**Sorting stays single.** Exactly one column carries a sort arrow, ever. The header menu and
§3.2's toolbar popover are two triggers writing one value; a second sort field would need a
transport change and an ordinal glyph in a 32 px cell, and neither is warranted.

**Filtering stays one model.** A column filter is one filter specification keyed on the column's
field, rendered as a chip in §3.2's existing chip row and summarised in the header as
`Label: value` in semibold. It is not a second filter state living somewhere new. The chip row
remains the complete readout; the header summary may truncate.

**A ledger header may filter and pin. It may never sort.** §8.3.3, unchanged: a running balance
is meaningful only in posting order. Filtering selects a subset of postings and leaves each
posting's persisted `balanceAfter` intact; reordering destroys the column's meaning.

#### 8.5.3 Column pinning

**[ruling]** Three regions. Only one of them belongs to the operator.

```
+-- PINNED, inline-start --------+|~~~ scrolls ~~~~~~~~~~~~~~~~~~~+|+- PINNED, inline-end -+
| # | Captain      ^ v | City v ||| Plan v | Trips v | Earned v ||          ...          |
|---+------------------+--------|||--------+---------+----------|+-----------------------+
| # | Nora Al-Harbi    | Riyadh ||| Weekly |     412 |  4,218.00||          ...          |
| | | DRV-0106         | Dammam ||| Weekly |       0 |      0.00||          ...          |
+-^-+------------------+--------+|+--------+---------+----------++-----------------------+
  |  R5a marker rides the pinned  hairline boundary
  |  region and NEVER scrolls away
```

| Region | Contents | Decided by |
|---|---|---|
| Implicit inline-start | §8.4's row-critical marker lane · selection checkbox · column index 0, the identity | the component, always |
| Operator inline-start | any columns within the width budget, rendered in **column-declaration order** | the operator |
| Implicit inline-end | the row overflow kebab (absent on a ledger) | the component, always |

**The pinned region renders in column-declaration order, never in the order the operator
clicked.** Pinning is a freeze, not a reorder: if pinning one column moved it in front of another
merely because it was clicked first, the operator would have performed a column reorder they
never asked for, and pinning a second column would visibly shuffle the first. Column *order* is
separate per-view state (§3.1 *Column visibility*).

**Only the inline-start edge is operator-pinnable.** The inline-end is spoken for: §3.1 fixes
the kebab at the row's inline-end and `[code]` `:751` shows that the action control is what
operators freeze there. Allowing arbitrary data columns to be inserted between the scrolling
region and the row's action control puts a moving boundary around the one control that must
stay put. Shopify freezes one region, at the start `[observed]`.

**The identity column is never hideable and never unpinnable.** §3.1: the first data cell MUST
be the identity and MUST be a link to the record. You cannot hide or scroll away the only thing
that navigates.

**The row-critical marker rides the pinned region.** §8.4's 3 px leading-edge marker is drawn at
the row's inline-start. On a scrolling region it would vanish the moment the operator scrolled,
and R5a's three parts are explicit that *none substitutes for another*. The implicit block
always exists, so the marker always has a stationary host.

**One guard, measured against the floor — and therefore no resize behaviour at all.** The pinned
region may not exceed **50 %** of the table's inline size **at the narrowest width that table
will ever have**: the content region at the D2 floor, 976 px with both nav columns expanded
(`design/00-shell.md` §1). The implicit block is exempt — it is not operator state. At the floor
that leaves roughly 228 px, or one typical operator pin.

Two consequences:

- **A count cap is redundant.** Three narrow columns and one wide one are not the same risk, and
  a width budget already refuses whichever combination is too much. A second refusal reason would
  be a second sentence to write and a second disabled state to test, for no additional
  protection.
- **Pins never change on resize.** Because the budget is computed against the floor, a pin
  accepted on a wide monitor is still valid at 1280 px. The budget is **not** a live measurement,
  so no demotion-and-restoration path exists, and none may be built — it would be a code path
  nothing can reach. A full-bleed bulk grid (§2.5) has no nav columns and legitimately declares a
  larger floor; that is the only sanctioned override.

A pin that would breach the budget renders **disabled in place, with its reason on a second line
inside the menu item** — gated at render, never at commit (§4.6, §8.4.4). Not a tooltip: §5.7
keeps constraints out of tooltips. The operator is never shown a pixel figure.

**A pinnable column MUST declare an inline size.** §3.1 already requires wide tables to *"scroll
horizontally rather than shrink columns below legibility"*; a column sized `auto` additionally
has no sticky offset until layout has run, and an offset computed after layout is one frame of
visible jump on every scroll.

**Visual treatment: a hairline, and no elevation tier at all.** §1.4 gives the sticky table
header a hairline shadow once the body scrolls under it, and a pinned column is the inline-axis
analogue — but it does **not** inherit the token, for three reasons in order of force:

1. **The axis is wrong and the closed set was closed on purpose.** Every elevation tier is
   `offset-x: 0` so elevation is direction-invariant and needs no RTL branch. Applied to an
   inline edge, a block-axis shadow renders *below* the column; giving it an x-offset creates a
   token that **must** mirror — reintroducing precisely the defect `[code]` `:751` already has.
2. **The measurement says hairline.** Shopify's frozen boundary is one 1 px step, unchanged by
   scroll `[observed]` (§8.5.1).
3. **The primary signal is motion, not the line.** Content moves; the pinned block does not. The
   boundary is a supporting delimiter, which §7.1 classes as a decorative rule with no contrast
   minimum.

So: `border-inline-end: 1px solid var(--border)` on the **innermost pinned column at the
inline-start edge** — the one the scrolling body actually slides under — and
`border-inline-start` on the innermost one at the inline-end edge, **rendered only while the
table actually overflows**. The boundary belongs to a **cell**, not to a wrapper: at the
inline-end edge the innermost pinned column is the *first*-declared one, so "the last in the
array" is the wrong column. With no overflow nothing is frozen in any meaningful sense, and a
permanent vertical rule on every index table in the product would be a large visual change
bought for nothing. Pinned cells take the row's own background, including its hover fill, so
scrolling content cannot show through.

**How the operator knows a column is pinned**, in order: it does not move · the boundary hairline
groups the block · the header menu reads `Unpin column`, state in words · the columns popover
shows the pin toggle pressed. **No pin glyph in the header** — there is none in the icon
vocabulary, and emoji are banned (§5.7).

#### 8.5.4 Bidirectionality — the part most likely to ship broken

Pinning is inherently directional, and §9.1's mandate is not satisfied by good intentions.

| Never | Always |
|---|---|
| `left: 0` / `right: 0` | `position: sticky; inset-inline-start: 0` (inline-end region: `inset-inline-end: 0`) |
| `border-right` | `border-inline-end` |
| `text-align: right` on a numeric header | `text-align: end` — R4, and §9.1 row 2 |
| `box-shadow` with an x-offset | no shadow at all (§8.5.3) |
| `scrollLeft > 0` | `Math.abs(scrollLeft) > 0` — see below |

**What an operator switching to Arabic sees**, stated as a promise because this is what gets
asked after it ships:

- **Which columns are pinned, and their order within the block, do not change.** The identity is
  still first in reading order; it moves from the physical left to the physical right.
- The pinned block, the boundary hairline and the kebab region all move to the mirrored edge.
  `inset-inline-*` and `border-inline-*` do this with no branch.
- Horizontal scroll direction reverses, and **the scroll offset resets to the inline-start** on
  a direction change. An offset carried across the flip is meaningless and lands the operator
  mid-table.
- The row-critical marker stays on the row's leading edge, now physically right, because it
  rides the pinned block.
- Sort arrows do not mirror (§9.2, vertical magnitude). Numeral runs in a range filter do not
  reorder (§9.2).
- A `Label: value` header summary needs the value **bidi-isolated**: a Latin city name, an id or
  `100–500` inside an Arabic label jumps sides without it (§9.2).

**Two mechanical traps.** A right-to-left scroll container's `scrollLeft` is **negative** under
the current specification (Firefox, WebKit, current Chromium) and was positive or inverted in
older engines `[standard]`; anything testing "has this scrolled" must normalise or it is
silently wrong in Arabic. And the second and third pinned columns need an `inset-inline-start`
equal to the accumulated inline size of those before them — a measured number applied to the
**logical** property, never to `left`.

**If a pinned layout is ever persisted, each pin is stored as a column id plus a *logical* edge —
`start` or `end`, never `left` or `right`, and never a pixel offset.** A physical edge makes
every saved layout wrong for every Arabic operator on the first load. Render order is not stored
at all: it comes from the column declaration, and a stored order would be a second, silently
competing source of truth for something §3.1 already governs.

**Rules**

- A table header cell MUST contain **exactly one** interactive element — a button that opens a menu — or **none**. It MUST NOT contain two. **§6.2 D-6.**
- The header menu's affordance MUST render at rest. It MUST NOT be revealed only on `:hover` (§7.3).
- Exactly **one** column MUST carry a sort indicator at any time, in any mode. The indicator MUST be an arrow (`↑` / `↓`) and MUST NOT be a chevron; a chevron in a header MUST mean only that a menu opens (§1.5, §9.1 row 9).
- A ledger header MUST NOT offer sort or hide. It MAY offer filter and pin. This MUST be enforced by the ledger table type carrying no sort members, not by a runtime flag (§8.3.3).
- A column filter MUST produce exactly one filter specification keyed on the column's field, MUST render as a chip in §3.2's chip row, and MUST set the same filtered state that a toolbar filter sets. A column MUST NOT be able to hold two filters at once.
- A filter control MUST NOT be rendered inside a menu. The menu MUST close and a popover MUST open (menu typeahead consumes the keystrokes).
- The row-critical marker lane (§8.4), the selection checkbox and the identity column MUST be pinned to the inline-start implicitly and permanently. The identity column MUST NOT be hideable or unpinnable.
- The row overflow kebab MUST be pinned to the inline-end implicitly and permanently wherever it exists.
- A breached row's leading-edge marker MUST remain visible at every horizontal scroll offset. **R5a's three parts MUST survive scrolling.**
- The pinned region MUST render in column-declaration order. Pinning a column MUST NOT reorder any other column.
- Operator pinning MUST be offered at the inline-start edge only, and the pinned inline-start region MUST NOT exceed 50 % of the table's inline size **at that table's floor width**. There MUST NOT be a second, count-based cap.
- The pin budget MUST be computed against a fixed floor width, never against a live measurement. A pin, once accepted, MUST NOT be demoted, discarded or restored by a viewport change.
- A pinnable column MUST declare an inline size. A column sized `auto` MUST NOT be pinnable.
- A pin blocked by the budget MUST render its control **disabled in place with its reason available**, and MUST NOT be reported only after a click (§4.6, §8.4.4). The reason MUST NOT be a tooltip (§5.7) and MUST NOT state a pixel figure.
- The boundary MUST be drawn on the **innermost pinned column at each edge**, as `border-inline-end` (or `border-inline-start` at the inline-end edge) of 1 px `--border`, MUST render only while the table overflows, and **MUST NOT carry a `box-shadow` of any kind.** `box-shadow:-4px 0 6px -4px` (`:751`, `:3555`) MUST NOT ship.
- Pinned cells MUST be opaque, taking the row's own background including its hover fill.
- The toolbar, the filter chip row, the pagination and the bulk action bar MUST sit **outside** the table's horizontal scroll container.
- A pinned region MUST be positioned with `inset-inline-start` / `inset-inline-end`. `left:` and `right:` (`:751`, `:3555`) MUST NOT ship, and MUST be fixed before the next release.
- Any test for horizontal scroll offset MUST normalise the sign, because a right-to-left container's `scrollLeft` is negative.
- Changing `dir` MUST NOT change which columns are pinned or their order, and MUST reset the horizontal scroll offset to the inline-start.
- A persisted column layout MUST store each pin as a column id plus a **logical** edge (`start` / `end`). It MUST NOT store a physical edge or a pixel offset, and it MUST NOT store a render order — render order comes from the column declaration.

---

## 9. Bidirectionality & Localisation

Eyvar Admin ships one non-English locale: Arabic (`ar`), selected at
`eyvar_ops_panel_v40_fixed.html:1495–1500`, applied by `applyLanguage()` at `:7939–7953`, with an
88-key dictionary at `:7903–7938`, 86 `data-i18n` keys in markup, and a hand-written RTL
stylesheet at `:370–402` `[observed]`. Operational context is Saudi: seeded
`timezone:'Asia/Riyadh'`, `currency:'SAR'`, `language:'en'` (`:2570`) `[observed]`.

Arabic is right-to-left. Every rule in §1–§8 that names a physical direction is therefore either
wrong in Arabic or ambiguous about which edge it means. **This section binds every numbered
section of this document, present and future**, and removes that ambiguity for all of them.

---

### 9.1 The logical-properties mandate

§1–§8 are read as **logical**, not physical: *left* means **inline-start**, *right*
**inline-end**, *top* **block-start**, *bottom* **block-end** — except the cases in §9.2. In
`dir="ltr"` these resolve to the same physical edges, so **no LTR rendering changes** `[standard]`.
*Leading* / *trailing* are already logical and unchanged (leading = inline-start); where this
document uses both vocabularies for one geometry, the logical pair is authoritative.

**Complete translation table** — every normative statement in §1–§6 naming a physical direction.
Line numbers are this document's; the section reference is authoritative.

| # | Rule as written | Section (line) | Logical restatement |
|---|---|---|---|
| 1 | "Page uses an approved layout (single column, **main + right rail**, or full-bleed editor)" | Ship checklist (44) | main + **inline-end rail** |
| 2 | "**Always right-align** numeric and currency columns." | Ruling **R4** (72) → §3.1 | Align to the **inline-end**. The *column* mirrors, the *digits inside it* do not — §9.2. |
| 3 | "MUST give the **left nav** the same fill as the canvas…" | §1.1 (195) | the **inline-start nav** |
| 4 | "…blue **leading** icon" | §1.1 (200) | unchanged (inline-start) |
| 5 | "SHOULD **right-align** numeric table columns and **left-align** everything else." | §1.2 (243) | `text-align: end` / `text-align: start` |
| 6 | "MUST use a 2:1 ratio for main-content-plus-**right-sidebar** detail pages" | §1.3 (301) | **inline-end-sidebar** |
| 7 | "…align them to the **right edge** of the page header." | §1.3 (305) | **inline-end edge** |
| 8 | "SHOULD put a **leading** icon on every item in a popover menu…" | §1.5 (405) | unchanged (inline-start) |
| 9 | "SHOULD reserve the **trailing** caret exclusively for controls that open a menu or select." | §1.5 (406) | unchanged (inline-end). Caret points **down** and does not mirror; its position moves — §9.5. |
| 10 | "MUST NOT animate `width`, `height`, `top`, or **`left`**" | §1.6 (432) | `inset-block-start` / **`inset-inline-start`**. `translateX` needs a direction-aware sign — see below. |
| 11 | "…plus a fixed **left nav** (~256 px)" | §2.1 (563) | **inline-start nav** |
| 12 | "…keyboard hint inside the field, **right-aligned**." | §2.1 (568) | field's **inline-end** |
| 13 | "The top bar's **right cluster** MUST be exactly: notifications, then the store/account switcher." | §2.1 (569) | **inline-end cluster** |
| 14 | "Every primary nav item MUST have a **leading** icon" | §2.1 (571) | unchanged (inline-start) |
| 15 | "**Count badges MUST be right-aligned numerals** on the row…" | §2.1 (576) | Badge sits at the row's **inline-end**; the numeral stays Western-digit LTR — §9.2. Implemented at `eyvar_ops_panel_v40_fixed.html:385`, with a defect below. |
| 16 | "title **left edge** = first card **left edge**; last button **right edge** = rail **right edge**." | §2.2 (670–671) | **inline-start edge** = card inline-start edge; button **inline-end edge** = rail inline-end edge |
| 17 | "The action cluster MUST order **left-to-right** as: secondary → `More actions ▾` → primary" | §2.2 (676) | **inline-start → inline-end**. In Arabic the primary sits **left**. |
| 18 | "The **right rail** MUST hold only status, publishing, summary, and metadata" | §2.2 (683) | **inline-end rail** |
| 19 | "…keep the product logo in the **left slot** and MUST remove global search and the **right cluster**." | §2.3 (741–742) | **inline-start slot** … **inline-end cluster**. The logo **artwork** does not mirror — §9.5. |
| 20 | "SHOULD repeat a single **right-aligned** `Save`… aligned to the **right edge** of the full content block." | §2.3 (752–753) | **inline-end-aligned**, to the **inline-end edge** |
| 21 | "…exit affordance in the **left slot** of their own bar." | §2.5 (922) | **inline-start slot** |
| 22 | "…keyboard shortcut on the row, **right-aligned** before any submenu [chevron]" | §2.6 (1044) | **inline-end-aligned**. Keycap glyph order does **not** mirror — §9.2. |
| 23 | "Hierarchy MUST be expressed by a single **back arrow left of** the page title." | §2.6 (1046, 989) | **inline-start of** the title. The **arrow glyph mirrors** — §9.5. |
| 24 | "…controls at its **right end**, and SHOULD offer a **trailing** `+`" | §2.6 (1050) | **inline-end**; trailing `+` unchanged |
| 25 | "Transient creation flows SHOULD use a ~400 px **right sheet**" | §2.6 (1059) | **inline-end sheet** |
| 26 | "**Numeric, currency, and count columns MUST be right-aligned**, header and value sharing a **right edge**." | §3.1 (1156) | **inline-end-aligned**, sharing an **inline-end edge**. Digits stay LTR — §9.2. |
| 27 | "Text and date columns MUST be **left-aligned**." | §3.1 (1157) | **inline-start-aligned** cell; the date *string* does not reorder — §9.2. |
| 28 | "…view tabs + `+` on the **left**, icon buttons on the **right**." | §3.2 (1222) | **inline-start** / **inline-end** |
| 29 | "Only section headings and the **trailing** `Learn more` link may sit on the bare canvas." | §3.5 (1436) | unchanged (inline-end) |
| 30 | "Key-value rows MUST **right-align** values and **left-align** labels" | §3.5 (1439) | values **inline-end**, labels **inline-start** |
| 31 | "**Right-rail** summary cards MUST be read-only displays…" | §3.5 (1442) | **inline-end-rail** |
| 32 | "Each entry MUST carry a timestamp, **right-aligned**…" | §3.8 (1657) | **inline-end-aligned**; string does not reorder — §9.2 |
| 33 | "Events with expandable detail MUST use a **trailing** chevron" | §3.8 (1658) | unchanged; the chevron **glyph mirrors** — §9.5 |
| 34 | "`☐ ▸ 16px from card edge  text/dates ▸ **left**  numbers/money ▸ **right**`" | §3.9 (1709) | `card inline-start edge  text/dates ▸ start  numbers/money ▸ end` |
| 35 | "…currency symbols as an in-field **left prefix** and unit codes as an in-field **right suffix**" | §4.2 (1901) | **inline-start prefix** / **inline-end suffix**. **Overridden for Arabic** — affix position is locale data — §9.2. |
| 36 | "MUST use a **leading** magnifier icon on… fields that search or autocomplete." | §4.2 (1903) | unchanged; magnifier glyph is **non-mirroring** — §9.5 |
| 37 | "…character counter… **right-aligned** inside the field." | §4.2 (1904) | **inline-end-aligned**; `0/40` stays LTR — §9.2 |
| 38 | "…an HTML source toggle placed at the **far right**." | §4.5 (2153) | toolbar's **far inline-end** |
| 39 | "…repeat both in the **trailing** 'Add' tile of a filled grid." | §4.5 (2155) | unchanged (inline-end) |
| 40 | "MUST pair every resource picker with a **leading** magnifier…" | §4.5 (2156) | unchanged (inline-start) |
| 41 | "Page top bar / save bar: secondary on the **left**, primary on the **right**" | §4.6 (2179–2180) | secondary **inline-start**, primary **inline-end** |
| 42 | "Page header action row: secondaries **left** → dropdown → primary **rightmost**" | §4.6 (2181) | **inline-start** → dropdown → **inline-end-most** |
| 43 | "Modal footer: **right-aligned** pair, `Cancel` **left of** the primary" | §4.6 (2184) | **inline-end-aligned**, `Cancel` **inline-start of** the primary |
| 44 | "Card footer: **right-aligned** pair inside the card" | §4.6 (2188) | **inline-end-aligned** |
| 45 | "**MUST place the primary on the right** in page top bars, page headers, modal footers and card footers, with secondaries **to its left**." | §4.6 (2226–2227) | **primary at the inline-end**, secondaries **inline-start of it**. In Arabic the primary is on the **physical left**. |
| 46 | "…a `⌄` caret at the **right**; opens a menu aligned to the button's **right edge**" | §4.6 (2204) | caret **inline-end**; menu to the button's **inline-end edge** |
| 47 | "One **trailing** affordance only: a small × on the **right** inside the pill." | §5.1 (2384) | × at the pill's **inline-end** |
| 48 | "MUST render toasts as a dark pill, **bottom-centre** of the viewport" | §5.1 (2419) | **block-end, inline-centred** — direction-neutral. **Eyvar deviates** to a corner; see §9.2. |
| 49 | "…header (title + ×) / body / **right-aligned** footer with secondary before primary." | §5.3 (2534) | title **inline-start**, × **inline-end**, footer **inline-end-aligned** |
| 50 | "…**right-edge-aligned** to the trigger… Rows are **left-aligned**" | §5.4 (2550–2551) | **inline-end-edge-aligned**; rows **inline-start-aligned** |
| 51 | "…triggered by a '⋯' at the row's **right edge**" | §5.4 (2556) | row's **inline-end edge** |
| 52 | "…keycap chips, **right-aligned** before the chevron." | §5.4 (2586) | **inline-end-aligned** |
| 53 | "**MUST anchor drawers to the right edge**, full height, with title + × in the header." | §5.5 (2629) | **inline-end edge**. In Arabic the drawer docks on the **physical left**. |
| 54 | "MUST pin committing actions to the drawer's bottom edge, **right-aligned**, primary last" | §5.5 (2631) | **block-end** edge, **inline-end-aligned** |
| 55 | "MUST cap detail and form pages at ~1000 px and **center** them" | §1.3 (300) | unchanged — centring is direction-neutral |
| 56 | "Page gutter: 24 px **left and right**" | §1.3 (259) | **inline-start and inline-end** — symmetric, no visual change |
| 57 | "Settings modal … inset ~8 px from the **left/right**" | §1.4 (339) | **inline-start/inline-end** — symmetric |
| 58 | "**Right-side guide drawer** — flush to the **right edge**, hairline **left border**" | §1.4 (340), §5.5 (2616) | **inline-end** drawer, `border-inline-start` |
| 59 | "…slides in **from the right edge** (~200 ms, ease-out)" | §1.6 (422) | **from the inline-end edge** — sign flip required, below |
| 60 | "Full-width, **left-aligned**" for index pages | §2.2 (626) | **inline-start-aligned** |
| 61 | "checkbox ~16 px from the card's **left edge**" / "first column **left padding**… **leading** checkbox" | §3.1 (1095), §1.3 (292) | card's **inline-start edge**; `padding-inline-start` |
| 62 | "Wide tables clip at the card's **right edge**" | §3.1 (1132) | **inline-end edge**; overflow scrolls toward the inline-end |
| 63 | "badges sit **inline to the right of** the page title" | §3.4 (1355) | **inline-end of** the title |
| 64 | "Label… **left-aligned**" / "Helper text… **left-aligned** to the field" | §4.2 (1815), §4.1 (1778) | **inline-start-aligned** |
| 65 | "resize grip at the **bottom-right** corner" | §4.2 (1874), §4.5 (2070) | **block-end / inline-end** corner |
| 66 | "eye icon at the **right edge** inside the field" / "circled `?` at the field's **right edge**" / "flag + chevron docked at the **right edge** of the phone field" | §4.2 (1868, 1865, 1857) | field's **inline-end edge**. The phone **value** stays LTR — §9.2. |
| 67 | "banner: icon at **left**, × at **top-right**" | §5.2 (2447) | icon **inline-start**, × **block-start / inline-end** |
| 68 | "Composer: avatar at the **left**… actions **right-aligned**" | §3.8 (1607, 1610) | avatar **inline-start**, actions **inline-end-aligned** |
| 69 | "Metric tile: title at **top left**; report icon at **top right**; delta immediately **to its right**" | §3.7 (1509–1511) | block-start/inline-start; block-start/inline-end; delta **inline-end of** the value |
| 70 | "**Legend.** **Bottom-right** of the card" | §3.7 (1518) | **block-end / inline-end**. Chart internals do **not** mirror — §9.2. |

Directional prose in the anatomy paragraphs of §1–§6 inherits the same reading: physical
direction in descriptive prose describes the LTR rendering and carries no independent authority.

**The CSS-level rule.** Author every direction-sensitive declaration logically `[standard]`:

| Never write | Always write |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left:` / `right:` on positioned elements | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `border-radius: 8px 0 0 8px` | `border-start-start-radius` etc. (or the logical 4-value form) |
| `float: left` / `right` | `float: inline-start` / `inline-end` |
| `top` / `bottom`, `margin-top` / `margin-bottom` | `inset-block-*`, `margin-block-*` |
| `box-shadow: inset 3px 0 0 …` | pseudo-element at `inset-inline-start: 0` (no logical form exists) |
| `transform: translateX(28px)` | `translateX(calc(var(--flip) * 28px))`, `--flip: -1` under `[dir="rtl"]` |

Symmetric shorthands (`margin: 0 8px`, `inset: 0`) are direction-neutral. `flex-direction:
row-reverse` and `order:` are **not** substitutes: they reverse visual order without changing the
inline axis, so alignment, scroll direction, and caret behaviour inside the reversed children stay
LTR `[standard]`. The shell uses `row-reverse` (`eyvar_ops_panel_v40_fixed.html:382, 386`)
precisely because it must be a physical flip, not a directional one (§9.3) — correct there, not
the pattern for new content.

**Direction-aware transforms.** `translateX()` is direction-blind: positive X is physically
rightward regardless of `dir` `[standard]`. **Currently broken:** the toast stack anchors to
`left:18px` in Arabic and `right:18px` in English (`eyvar_ops_panel_v40_fixed.html:5254`)
`[observed]`, but its entry/exit transform is a hard-coded `translateX(28px)` (`:5288`, `:5301`)
`[observed]` — so in Arabic the toast slides in *from the right*, away from its own anchor and
across the content, then exits back across it.

**Migration.** Counted across the whole file, stylesheet and inline `style=` `[observed]`:
`margin-left` 44, `margin-right` 19, `padding-left` 3, `padding-right` 1, `border-left` 13,
`border-right` 3, `text-align:left` 9, `text-align:right` 37, `left:` 77, `right:` 40 — and
**zero** occurrences of `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`,
`text-align:start`, `text-align:end`, `margin-block`, `unicode-bidi`, `<bdi>`, `&rlm;`, `&lrm;`.
Converting all 246 at once changes nothing visible and touches nearly every line for no shipped
benefit, since 40 of 41 page shells are untranslated (§9.3). Order: (1) regions shipping Arabic
today — sidebar `:24–48`, `:382–385`; Settings shell and sub-nav `:386`, `:401–402`;
`#stab-general` `:393–396`; `#stab-security` `:397–400` — now, deleting the `[dir="rtl"]`
overrides as they become redundant; (2) any region newly claiming Arabic support, before it
ships; (3) everything else opportunistically.

Three live defects the migration fixes, all `[observed]`:

- **`.sb-sec-lbl` loses its inset in Arabic.** `:39` sets `padding:0 0 0 16px`; `:384`
  right-aligns the text but leaves the padding on the left, so all nine translated section labels
  sit flush against the Arabic sidebar's inline-start edge while the gap opens on the wrong side.
- **`.sb-badge` loses its 12 px edge gap.** `:48` sets `margin-left:auto;margin-right:12px`; the
  RTL override at `:385` sets `margin-right:auto`, overriding the `12px`.
- **`.sb-item.on` marks the wrong edge.** `:43` draws the active indicator with
  `box-shadow:inset 3px 0 0 var(--blue)` — a physical left inset with no RTL counterpart, so in
  Arabic the blue rule sits on the far side of the row from the reader's starting edge.

**Rules**

- MUST read every physical direction in §1–§8 as its logical equivalent per the table above, except the cases enumerated in §9.2.
- MUST write `margin-inline-start` / `margin-inline-end`, `padding-inline-start` / `padding-inline-end`, `border-inline-start` / `border-inline-end`, `inset-inline-start` / `inset-inline-end`, `text-align: start` / `text-align: end`, and `float: inline-start` / `float: inline-end` in all new or edited CSS.
- MUST NOT introduce a new `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, `border-right`, `text-align:left`, `text-align:right`, `float:left`, or `float:right` declaration in any region that declares Arabic support under §9.3.
- MUST NOT introduce a new positioned element using bare `left:` or `right:` in any region that declares Arabic support under §9.3.
- MUST pair every `translateX()` on an inline-edge-anchored element with a sign flip under `[dir="rtl"]` (or a `--flip` custom property), and MUST fix `eyvar_ops_panel_v40_fixed.html:5288` and `:5301` before the next release.
- MUST replace `eyvar_ops_panel_v40_fixed.html:39` (`padding:0 0 0 16px`) with `padding-inline-start:16px`, `:48` (`margin-left:auto;margin-right:12px`) with the `margin-inline-*` pair, and `:43`'s `inset 3px 0 0` shadow with an `inset-inline-start`-positioned pseudo-element.
- MUST delete each `[dir="rtl"]` override at `eyvar_ops_panel_v40_fixed.html:383–385` and `:394–:402` as the corresponding base declaration becomes logical. A logical base rule plus a surviving physical override is a defect.
- MUST NOT use `flex-direction: row-reverse` or `order:` as a substitute for `dir` on any region containing translated running text.
- SHOULD convert a physical declaration to its logical form whenever the surrounding rule is edited for any other reason.

---

### 9.2 What does NOT mirror

Mirroring is a property of **layout**, not **content**. The following are content, or diagrams
whose geometry carries meaning, and retain LTR order inside an RTL page `[standard]`.

| Content | Mirrors? | Why, and the rule it overrides |
|---|---|---|
| **Numeral runs** | No | Digits are bidi class `EN`/`AN`; the UBA lays a digit run out left-to-right inside an RTL line with no author intervention `[standard]`. `1,234.56` stays `1,234.56`. |
| **Digit system** | n/a | Saudi digital UI convention is Western `0`–`9`, not Arabic-Indic `٠`–`٩` `[standard]`. Arabic-Indic digits appear **zero times** in the file `[observed]`. |
| **Currency affix position** | Locale data | **Overrides §4.2 (1901).** `en-US` puts `$` before, `ar-SA` puts `ر.س.` after `[standard]`. Eyvar ignores both: money is `n.toFixed(2)+' SAR'` at 92 call sites, `Intl` never used (`eyvar_ops_panel_v40_fixed.html:4394`) `[observed]`. |
| **Dates and times** | No | Numeric runs. Cell aligns inline-start (§3.1 1157); the string does not reorder. See the `ar-SA` trap below. |
| **Phone numbers, IDs, IBANs, IPs, plates** | No | Single LTR tokens. A leading `+` is bidi class `ES` and moves to the wrong side without isolation `[standard]`. §4.2 (1857) docks the country select inline-end; the **value** keeps `direction: ltr` — the pattern already shipping at `eyvar_ops_panel_v40_fixed.html:396`, `:400` `[observed]`. |
| **Keyboard shortcut chips** | Position only | `⌘ K` is a chord, pressed modifier-first in every locale `[standard]`. §2.1 (568), §5.4 (2586) place the cluster inline-end; glyph order inside does not change. |
| **Map canvas, markers, headings, routes, compass** | No | Geography: north is up, east is right in every locale `[standard]`. §2.5, §6.4. A vehicle heading glyph points at its real bearing. Map **chrome** (stats bar `eyvar_ops_panel_v40_fixed.html:365–368`, live rail, filter chips, legend) does mirror. |
| **Code, query, monospace editors** | No | Syntax is LTR by specification `[standard]`. §4.5 (2130–2136). Body carries `dir="ltr"`; line numbers and caret stay physical-left. Toolbar and footer are chrome and mirror. |
| **Chart plot areas and axes** | No | §3.7 (1509–1531). A time-series x-axis MUST NOT reverse: its labels are LTR digits and dates, so reversing the axis makes axis and numbers run in opposite directions. The SVG generators at `eyvar_ops_panel_v40_fixed.html:6806, 6818, 6822` use `text-anchor="end"` and absolute `translate()` `[observed]` — correct as-is, provided they never inherit `direction: rtl`. |
| **Delta arrows `↑` `↓`** | No | A magnitude on the vertical axis, not a direction of reading. |
| **Media, brand, imagery** | No | `▶` means *forward in time*, not rightward `[standard]`. Logo `eyvar_ops_panel_v40_fixed.html:32–35`, partner and payment marks, photographs, avatars, QR codes. §2.3 (741) moves the *slot*, not the *artwork*. Full glyph inventory in §9.5. |
| **Toast / notification corner** | **Yes** | §5.1 (2419) mandates bottom-*centre*, which is direction-neutral; Eyvar deviates to a corner for a reason documented at `eyvar_ops_panel_v40_fixed.html:5245–5252` `[observed]`. Given the deviation, the corner is layout and mirrors — the JS already flips it (`:5238`, `:5254`), as does the notification panel (`:2218–2220`) `[observed]`. Both are correct in outcome and wrong in form: `dir`-blind JS reimplementations of `inset-inline-end`, duplicated, and one has already drifted from its own animation (§9.1). The deviation is absent from §6.2's closed list and must be added there. |

**The explicit answer R4 needs.** Ruling **R4** (line 72) and §3.1 (1156) split in two:

| Layer | Mirrors? | Rule |
|---|---|---|
| The **column** — where the number sits in its cell | **Yes** | `text-align: end`. In Arabic the numbers hug the cell's physical **left** edge; header and value still share one edge, now the inline-end edge. |
| The **numeral run** — digit order and separator position | **No** | Left-to-right, Western digits, `.` decimal, `,` grouping. Automatic under the UBA; do not fight it with `direction` or `unicode-bidi`. |

This is not a compromise: R4's real content is *"numbers align on their least-significant digit so
a column scans"*, and `text-align: end` preserves that in both directions where a blanket
`text-align: right` breaks it in Arabic by aligning on the side the eye leaves.

**The `ar-SA` trap.** In `Intl.DateTimeFormat`, `ar-SA` defaults to the **Islamic (Hijri)
calendar** and to **Arabic-Indic digits** `[standard]`. Switching the locale string alone silently
converts every date in the panel and contradicts the digit rule above. Both must be pinned:
`ar-SA-u-ca-gregory-nu-latn`. Today the panel does neither — dates split between a hard-coded
`'en-GB'` (8 sites) and the viewer's browser locale via an empty locale array (10 sites), so the
same panel already renders different date formats to different operators and never follows its own
language setting `[observed]`.

**Rules**

- MUST render all numerals in Arabic mode using Western digits `0`–`9`; MUST NOT emit Arabic-Indic digits (`٠`–`٩`) anywhere in the interface.
- MUST align numeric, currency, and count columns with `text-align: end` (never `text-align: right`), and MUST NOT apply `direction` or `unicode-bidi` to the numeral run inside the cell.
- MUST format every currency amount through `Intl.NumberFormat` with the active locale and `numberingSystem: 'latn'`; MUST NOT concatenate a hard-coded currency string (replacing the `n.toFixed(2)+' SAR'` pattern at `eyvar_ops_panel_v40_fixed.html:4394` and its 91 other call sites).
- MUST format every date and time through `Intl.DateTimeFormat` with an explicit calendar and numbering system (`ar-SA-u-ca-gregory-nu-latn` for Arabic); MUST NOT pass a bare `'ar'` or `'ar-SA'` locale, and MUST NOT pass an empty locale array.
- MUST set `dir="ltr"` on every phone-number, identifier, IBAN, IP, and plate field and display.
- MUST set `dir="ltr"` on every code, query, and monospace editor body, and MUST keep its line numbers and caret on the physical left in both languages.
- MUST NOT apply `dir="rtl"`, `direction: rtl`, or `transform: scaleX(-1)` to the map canvas, any map marker, any chart plot area, any SVG axis group, or any media element.
- MUST NOT reverse a time-series axis in Arabic mode.
- MUST NOT mirror the Eyvar logo, any partner or payment brand mark, any photograph, any avatar, or any QR code.
- MUST NOT reorder the glyphs inside a keyboard-shortcut chip.
- MUST anchor the toast stack and the notification panel with `inset-inline-end` in CSS rather than a JavaScript `left`/`right` ternary, replacing `eyvar_ops_panel_v40_fixed.html:5254` and `:2219–:2220`.
- MUST add the bottom-corner toast position to §6.2 as a written deviation, per §6.4's rule that any deviation requires an entry there before it ships.

---

### 9.3 Partial localisation policy

This document has no rule for a half-translated product. Eyvar is one, deliberately, and is likely
to remain one. Measured `[observed]`:

| Metric | Value |
|---|---|
| `data-i18n` keys in markup | **86** |
| Static shell elements with an id | **621** → translation ceiling **13.8%** |
| Page shells with ≥1 `data-i18n` | **1 of 41** (`p-settings`) |
| `data-i18n` emitted by any JS string builder | **0** |
| Top-bar elements translated | **0** |
| Settings panels with a translated body | **2 of 21** (`#stab-general`, `#stab-security`) |
| Translatable attributes (`placeholder`, `title`, `aria-label`) | **0 supported** |

**The scoping decision is ratified as policy.** `eyvar_ops_panel_v40_fixed.html:370–381` states it
`[observed]`: *"scoped to the sidebar shell only, which is the part actually translated… mirroring
layout without translated text would look broken, not helpful. Deliberately never sets
dir/direction on `<html>` or `<body>`: direction is inherited, so doing that leaks RTL into `.main`
and jumbles every English table/card on the page."* Direction MUST follow translation, not precede
it. The **technique** is ratified too: because `direction` inherits, RTL can only be scoped to a
subtree that is a **sibling** of untranslated content — `.sb` is a sibling of `.main`, so
`dir="rtl"` on it cannot leak (`:7944`), and `body.lang-ar` reorders the two with `row-reverse`
(`:382`), leaving `body`'s direction `ltr` so there is no double reversal `[observed]`.

**Before a surface may claim Arabic support** — a claim about a page, drawer, pane, or modal, not
about the product — all seven must hold: (1) every visible string resolves in Arabic, including
JS-concatenated strings, structurally impossible today (`data-i18n` in generated markup: **0**)
`[observed]`; (2) every translatable attribute resolves — none are supported `[observed]`;
(3) every empty state, error, validation message, and toast it can produce is translated;
(4) every dictionary key its markup references exists — five do not
(`eyvar_ops_panel_v40_fixed.html:1431–1435`), and since `applyLanguage()` falls back to cached
English on a miss (`:7951`), a missing translation is **visually indistinguishable** from a
deliberate one `[observed]`; (5) numbers, dates, money per §9.2; (6) CSS logical per §9.1;
(7) typography per §9.4. Fail one and the surface does not get `dir="rtl"`.

**An untranslated region is plain English, plain LTR, unmarked** — not mirrored, not right-aligned,
not degraded, greyed, badged, or annotated as untranslated, which would be noise on 40 of 41 pages.
Scope is disclosed **once, at the point of choice**: the selector at
`eyvar_ops_panel_v40_fixed.html:1495–1500` sits above a disclaimer at `:1502` stating that Arabic
translates the sidebar and group labels and flips the menu to RTL while the rest stays English
`[observed]`. That disclaimer is now required, not optional.

**Mixed direction and the bidi isolation rule.** The characteristic Eyvar string is an Arabic label
beside an English record name: `الرصيد: 1,240.50 SAR`. Neutral characters (space, `:`, `(`, `-`,
`+`, `.`, `/`) between an RTL and an LTR run take direction from their surroundings, not from
authorial intent `[standard]` — so `(RDR-4821)` can render as `RDR-4821)(` with nothing in the
source to predict it. Every runtime-interpolated value of unknown or opposite direction MUST be
wrapped in `<bdi>` or `unicode-bidi: isolate` `[standard]`; where markup is impossible (`title`,
`alt`, `aria-label`, `<option>` label), bracket with `U+2068 FSI` … `U+2069 PDI`. This applies
**in both languages** — the panel already fails the reverse case:
`eyvar_ops_panel_v40_fixed.html:14759` concatenates `labelEn + '  —  ' + labelAr` into every
reason-code option unconditionally and `:15078` renders an always-visible Arabic column
`[observed]`. `<bdi>`, `unicode-bidi`, `&rlm;`, `&lrm;` appear a combined **zero** times.

**Rules**

- MUST NOT set `dir` or `direction` on `<html>`, `<body>`, or any ancestor of untranslated content.
- MUST scope RTL to a subtree that is a sibling of untranslated content, and MUST reorder siblings with `flex-direction: row-reverse` or `order:` rather than by setting `direction` on their shared parent.
- MUST satisfy all seven conditions above before a surface receives `dir="rtl"` or is described as supporting Arabic.
- MUST leave untranslated regions in English and LTR, unmirrored, unaligned, and unmarked.
- MUST NOT ship a machine-translated, transliterated, or partially translated string.
- MUST display a scope disclaimer adjacent to the language selector whenever coverage is below 100%, and MUST update it when coverage changes (`eyvar_ops_panel_v40_fixed.html:1502` satisfies this today).
- MUST wrap every runtime-interpolated name, identifier, amount, phone number, email, URL, or operator-typed value in `<bdi>` (or `unicode-bidi: isolate`) in both languages.
- MUST bracket the same values with `U+2068` … `U+2069` when they appear in an attribute that cannot contain markup.
- MUST fail the build when a `data-i18n` key present in markup is absent from `LANG_STRINGS.ar`. Five such keys exist today (`eyvar_ops_panel_v40_fixed.html:1431–1435`).
- MUST NOT render an Arabic string in English mode (`eyvar_ops_panel_v40_fixed.html:14759` and `:15078` violate this today).
- MUST support `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-alt`, and `data-i18n-aria-label` before any surface containing such an attribute claims Arabic support.
- MUST assign the translated element's text with a markup-preserving mechanism; the current `el.textContent` assignment at `eyvar_ops_panel_v40_fixed.html:7951` irreversibly flattens two shipping elements (`:1502` loses a `<b>`, `:1992` loses a `<span class="settings-soon">`) `[observed]`.
- SHOULD translate a surface in whole units — a page, a drawer, a settings pane — never a fragment of one.

---

### 9.4 Typography in Arabic

**Confidence statement.** §1.2's ramp is derived from Shopify Admin screenshots, and **every one
of those captures is English**. No Arabic rendering of the reference set or of Eyvar Admin was
available. **No value in this subsection is `[observed]`** — the metrics are `[standard]` Arabic
typesetting practice; code facts about the current implementation are `[observed]` and marked.

**Why 13 px does not transfer.** §1.2's 13 px body / 20 px line-height was measured on a Latin
face. Arabic letters are distinguished by dots above and below the baseline (ب ت ث ن ي) and by
hamza, shadda, madda — marks that scale with the em, not the x-height, and merge below ~14 px at 1×
`[standard]`; ب and ت differ only by a dot count, where Latin degrades to a distinguishable
silhouette. Arabic is also cursive with deep descenders (ج ح خ ع غ), so a Latin-tuned line box
crowds. §1.2's **density intent** survives: Arabic reaches the same visual density at a larger
nominal size, because the same content occupies fewer characters.

Applied only within a `dir="rtl"` region (§9.3); floors, not targets `[standard]`. These are the
**same six roles** at different values, so §1.2's six-role cap is unaffected.

| Role (§1.2) | Latin | Arabic floor | Line-height floor |
|---|---|---|---|
| Page title | ~20 px / 600 | 20 px | 1.5 |
| Modal / sheet title | ~15–16 px / 600 | 17 px | 1.5 |
| Section / card heading | ~13–14 px / 600 | 15 px | 1.6 |
| **Body** | **13 px / 400, 20 px** | **14 px** | **1.7** |
| Small / subdued | ~12 px / 400 | 13 px | 1.7 |
| Table column header | ~12–13 px / 500 | 13 px | 1.6 |
| Button label | ~13 px / 500–600 | 14 px | 1.5 |
| Field label | ~12–13 px / 400–500 | 13 px | 1.6 |
| Badge label | ~11–12 px / 500 | 12 px | 1.5 |

**Casing, uppercase, letter-spacing.** Arabic has **no letter case** `[standard]`, so §1.2's and
§5.7's sentence-case mandates are inert there. What replaces them is a prohibition, because the CSS
implementing casing elsewhere is actively harmful: `text-transform: uppercase` is a no-op on
Arabic, and `letter-spacing` **breaks cursive joining** — it inserts gaps between joined forms and
can visually sever a word `[standard]`. Both ship today on a **translated** element `[observed]`:

| Element | Line | Declaration | Translated? |
|---|---|---|---|
| `.sb-sec-lbl` | `:39` | `text-transform:uppercase; letter-spacing:.8px` | **Yes** — all 9 sidebar section labels carry `data-i18n` |
| `.sb-logo-text` | `:36` | `text-transform:uppercase; letter-spacing:1.5px` | No |
| `table.dt th` | `:149` | `text-transform:uppercase; letter-spacing:.3px` | No (also violates §1.2 in English — defect **D7**, §6.3) |
| `.live-sec-hdr` | `:363` | `text-transform:uppercase; letter-spacing:.5px` | No |
| `.ms-lbl` | `:367` | `text-transform:uppercase; letter-spacing:.4px` | No |

**Weight.** §1.2's ban on italic becomes absolute — Arabic has no oblique tradition and synthetic
obliquing skews cursive joins `[standard]`. But **semibold (600) is often unavailable**: many
Arabic families ship 400 and 700 only, and synthesised 600 fills the counters of dense letterforms
(ص ض ط ظ). §1.2's "separate headings by weight, not a size jump (≤2 px)" depends on a weight step
existing; where 600 is missing the fallback is **700 with the ≤2 px constraint retained**, not a
larger size jump.

**Family.** Eyvar declares `font-family: system-ui, -apple-system, sans-serif`
(`eyvar_ops_panel_v40_fixed.html:22`) `[observed]` — **no Arabic face is named anywhere in the
file**, so Arabic renders in whatever the OS substitutes (Segoe UI/Tahoma, Geeza Pro/SF Arabic,
Noto Naskh Arabic), making the same screen a different density per machine. §1.2's one-family rule
is kept in spirit, relaxed in letter: a stack naming one Latin and one Arabic face is one type
system `[standard]`. The Arabic face must be **Naskh** (not Kufi, Diwani, Ruq'ah), ship ≥3 weights
including 600, cover both digit sets so a numeral does not fall back mid-string, cover `، ؛ ؟`, and
be height-matched so a `<bdi>`-isolated English name does not jump. IBM Plex Sans Arabic, Noto Sans
Arabic, Cairo, and Tajawal meet all five `[standard]`.

**Rules**

- MUST NOT claim any Arabic type value in this section as `[observed]`; no Arabic rendering of Eyvar Admin or of the Shopify reference set has been reviewed.
- MUST set Arabic body text to at least 14 px with a line-height of at least 1.7, overriding §1.2's 13 px / 20 px mandate within `dir="rtl"` regions only.
- MUST meet the per-role size and line-height floors above for every role rendered in Arabic.
- MUST NOT apply `text-transform` to any element that can render Arabic text.
- MUST NOT apply a non-zero `letter-spacing` to any element that can render Arabic text; MUST remove `letter-spacing:.8px` from `eyvar_ops_panel_v40_fixed.html:39`, which currently applies to nine translated sidebar section labels.
- MUST NOT apply `font-style: italic` or `font-synthesis` obliquing to Arabic text.
- MUST declare an explicit Arabic font family in the stack at `eyvar_ops_panel_v40_fixed.html:22`; MUST NOT rely on `system-ui` substitution for Arabic.
- MUST select an Arabic face that is Naskh-style, ships weights 400/600/700, and covers Western digits and the `، ؛ ؟` punctuation set.
- MUST keep §1.2's six-role cap and its ≤2 px heading-to-body size constraint in Arabic; where weight 600 is unavailable, MUST step to 700 rather than increase the size gap.
- SHOULD test every Arabic surface at 1× device pixel ratio, where diacritic separation fails first.

---

### 9.5 Icon and glyph mirroring

A glyph mirrors when it depicts **direction of travel through content**; it does not when it
depicts an **object**, a **fixed physical fact**, or a **brand** `[standard]`. §1.5 governs the icon
system and names none of this.

**MUST mirror**

| Glyph | Where in §1–§6 | LTR | RTL |
|---|---|---|---|
| Back arrow | §2.6 (989, 1046) | `←` | `→` |
| Forward / next arrow | §2.6, §5.6 | `→` | `←` |
| Row and menu disclosure chevron | §2.6 (1046), §4.7 (2303) | `›` | `‹` |
| Submenu chevron on a shortcut row | §5.4 (2586) | `›` | `‹` |
| "Learn more →" / CTA / additive-link arrow | §5.7, §4.6 (2202) | `→` | `←` |
| Pagination previous / next | §3.1 | `‹` `›` | `›` `‹` |
| Indentation and nesting guides in nav and settings trees | §2.1 (546, 554) | indent right | indent left |
| Progress bars and step trackers | §3.7, §5.6 | fills L→R | fills R→L |
| Undo / redo | §2.5 (876), §4.5 (2130) | `↶` `↷` | swapped |
| Text-alignment, list indent / outdent icons | §4.5 (2070–2073, 2153) | as authored | mirrored |
| Bulk-edit back (`⇤ Back`) | §2.5 (889) | `⇤` | `⇥` |
| Slide-in transform sign for drawers, sheets, panels, toasts | §1.6 (422), §5.5 (2629) | `+X` | `−X` |
| Sidebar collapse/expand chevron, where one is added | §2.1; not present in markup today `[observed]` | points inline-start | points inline-end |

**MUST NEVER mirror**

| Glyph | Why |
|---|---|
| Checkmark `✓` | A mark, not a direction; mirrored it reads as a stray tick. |
| `×` close, `+` add, `−` remove | Symmetric. §5.1 (2384), §5.2 (2447), §5.3 (2480), §5.5 (2616), §3.2 (1003, 1050). |
| Clock, calendar | Objects; clock hands turn clockwise in every locale. §4.5 (2102). |
| Magnifier / search | An object; mirroring flips the handle to the wrong quadrant. §1.5, §4.2 (1903), §4.5 (2156). |
| Media playback `▶ ⏸ ⏹ ⏭ ⏮`, volume, mic | `▶` means *forward in time*, not rightward. |
| External-link `↗` | A conventional composite mark, recognised as a unit. §2.6 (1031). |
| Eyvar logo and wordmark | Brand. `eyvar_ops_panel_v40_fixed.html:32–35`; §2.3 (741). |
| Partner, channel, app, payment-brand marks | Brand. §4.3 (1960). |
| Bell, gear, trash | Objects. §2.1 (519, 569), §2.4 (791), §4.5 (2099). |
| `⚠` `ⓘ` `⛔`, badge status dots | Symmetric marks. §1.1 (200), §5.2, §3.4 (1308). |
| `⋯` overflow, `⠿` drag handle | Symmetric. §5.4 (2556), §3.7 (1566). |
| `⌘` `⌃` `⇧` keycaps | Fixed key names. §9.2. |
| Up/down sort carets, stacked select chevrons `⌃⌄`, delta `↑` `↓` | Vertical axis. §4.3 (1911), §3.7 (1511). |
| Split-button `⌄` caret | Points down; only its *position* moves (§9.1 row 46). |
| Country flags in the phone select | Geographic artwork. §4.2 (1857). |
| Map pins, heading markers, compass; chart glyphs, donut segments, sparklines | §9.2. |
| Avatars, photographs, uploads, QR codes; currency glyphs `$` `ر.س.` | Content and characters. §9.2. |

Mirroring is per-glyph, so a blanket `[dir="rtl"] svg { transform: scaleX(-1) }` is forbidden — it
would flip every entry in the second table. Use an opt-in class:
`[dir="rtl"] .icon-mirror { transform: scaleX(-1); }`. Text glyphs used as icons (`←` `→` `›` `↗`
`⇤` `↻` `⬆`, all present in the file's string builders `[observed]`) cannot be mirrored by class
and must be swapped at construction time — which requires the builder to know the active
direction, a capability the panel lacks since `applyLanguage` reaches only static `[data-i18n]`
markup `[observed]`.

**Rules**

- MUST mirror every glyph in the first table under `dir="rtl"`.
- MUST NOT mirror any glyph in the second table under any circumstances.
- MUST NOT apply a blanket `scaleX(-1)` to `svg`, `[class*="icon"]`, or any selector broader than an explicit opt-in class.
- MUST swap directional text glyphs (`←` `→` `›` `‹` `⇤` `⇥`) at string-construction time rather than with CSS.
- MUST NOT mirror a vertical-axis glyph (`↑` `↓` `⌃` `⌄`) in any locale.
- MUST reverse the sign of the slide-in transform for every drawer, sheet, panel, and toast under `dir="rtl"` (§9.1).
- SHOULD carry the mirror decision in the icon's own definition, so a glyph added once is classified once.

---

### 9.6 Copy rules in Arabic

§5.7 is written entirely against English orthography. Two mandates — **sentence case** and the
**terminal-period rule** — need Arabic answers; the rest bind unchanged, being about stance not
orthography: verb-first buttons; no exclamation marks, emoji, or "successfully"; imperative errors
naming the fix without blame or "please"; empty states stating the section's value; second person;
constraints in helper text not tooltips; toasts echoing the button's exact object; end-of-list
stated in words; toasts ≤ ~5 words.

**Replacing sentence case.** Arabic has no letter case `[standard]`, so §5.7's casing mandate has
no operation to perform. It is replaced by: no `text-transform`, no `letter-spacing` (§9.4); Latin
proper nouns keeping English capitalisation inside an Arabic string (`Eyvar`, `SAR`, `RDR-4821`)
and `<bdi>`-isolated (§9.3); and one register — MSA, no dialect, no code-switching. The dictionary
is MSA with colloquial constructions in the long explanatory strings (`gen.disclaimer`
`eyvar_ops_panel_v40_fixed.html:7927`, `gen.logo_note` `:7929`) `[observed]`, to be normalised.

**Punctuation** `[standard]`:

| English | Arabic | Codepoint |
|---|---|---|
| `,` comma | **`،`** | U+060C |
| `;` semicolon | **`؛`** | U+061B |
| `?` question mark | **`؟`** | U+061F |
| `.` full stop | **`.`** — Arabic uses the Latin full stop; there is no separate Arabic period | U+002E |
| `:` colon, `%` percent | unchanged (`٪` U+066A exists but is rare in Saudi digital contexts) | — |
| `-` hyphen, `( )` parentheses | unchanged, but bidi-neutral — see §9.3 | — |

The dictionary already uses `،` correctly at `eyvar_ops_panel_v40_fixed.html:7922, :7927, :7929,
:7936` `[observed]`; `؛` does not yet occur in it.

**The terminal-period rule transfers unchanged**, since Arabic uses the same `.` (U+002E). One
refinement: the period MUST be the last character of the source string, never placed before a
trailing interpolated value, or the UBA moves it to the visually wrong end of the line `[standard]`.

**Button labels.** §5.7's verb-first rule is *stronger* in Arabic — MSA is verb-initial (VSO), so a
verb-first label is the natural register `[standard]`. One choice must be made and held
product-wide: **imperative** (`احفظ`) or **masdar / verbal noun** (`حفظ`). Both are idiomatic;
mixing them is not. The shipping dictionary uses the masdar (`حفظ الإعدادات العامة`
`eyvar_ops_panel_v40_fixed.html:7930`, `حفظ إعدادات الأمان` `:7934`) `[observed]`, so **masdar is
the ruling convention**. §5.7's permitted non-verb labels map to verbal nouns: `إلغاء` / `إغلاق` /
`تم`.

**Numbers, plurals, gender, length.** Digits are Western `0`–`9` (§9.2). Arabic has **six** CLDR
plural categories — `zero`, `one`, `two`, `few`, `many`, `other` — against English's two, and marks
exactly-two grammatically (`رحلتان`), so an English string handling `1` and `n` is wrong at `2`
`[standard]`. Verbs and adjectives agree with the noun's gender, so `{entity} تم تحديثه` breaks
when `{entity}` is feminine, and concatenation (`'تم تحديث ' + n + ' سجل'`) cannot be grammatical
across six categories. The panel has no plural machinery and no `Intl` usage `[observed]`. Arabic
runs ~20–25% shorter than English in character count `[standard]` — which is why the Arabic sidebar
is *wider*, not narrower (§9.7): the shortening is in characters, while rendered width grows with
the larger size (§9.4) and wider inter-word spacing.

**Rules**

- MUST use `،` (U+060C) for commas, `؛` (U+061B) for semicolons, and `؟` (U+061F) for question marks in all Arabic strings; MUST NOT use `,`, `;`, or `?`.
- MUST use `.` (U+002E) as the Arabic full stop, and MUST keep it as the final character of the source string.
- MUST NOT apply `text-transform` or `letter-spacing` to Arabic strings (restating §9.4).
- MUST write Arabic button labels as masdar (verbal-noun) forms, matching the convention already shipping at `eyvar_ops_panel_v40_fixed.html:7930` and `:7934`; MUST NOT mix masdar and imperative forms within the product.
- MUST write all Arabic UI copy in Modern Standard Arabic; MUST NOT use dialect or code-switching.
- MUST render every count-bearing Arabic string through a six-category plural selector (`zero`/`one`/`two`/`few`/`many`/`other`); MUST NOT build a count string by concatenation.
- MUST author entity-specific strings rather than templating one string across entities of differing grammatical gender.
- MUST keep §5.7's prohibitions on exclamation marks, emoji, "please", and blame in Arabic.
- MUST `<bdi>`-isolate every Latin proper noun, product name, and identifier appearing inside an Arabic string (restating §9.3).
- MUST NOT size an Arabic container from its English string length.

---

### 9.7 The untokenised width

`[observed]`, all in `eyvar_ops_panel_v40_fixed.html`:

| Line | Declaration | Meaning |
|---|---|---|
| `:24` | `.sb{width:52px}` | Collapsed rail, both languages |
| `:30` | `.sb:hover,.sb.pin{width:236px}` | Expanded rail, English |
| `:31` | `body.lang-ar .sb:hover,body.lang-ar .sb.pin{width:268px}` | Expanded rail, **Arabic** |
| `:429` | `.sb{…width:236px!important}` (≤768 px) | Mobile drawer, English |
| `:435` | `.sb[dir="rtl"]{…width:268px!important}` (≤768 px) | Mobile drawer, **Arabic** |

Arabic is **+32 px (+13.6%)**, to fit longer nav labels. The `:root` block at `:11–21` contains
**only colour tokens** — there is no `--sb-w` or any dimension custom property anywhere in the file
`[observed]`. All five widths are literals, and the two Arabic values are duplicated across two
hooks (`body.lang-ar` at `:31`, `.sb[dir="rtl"]` at `:435`) expressing the same concept.

**Does §6.4 forbid it?** Its rule reads *"MUST NOT introduce a new **colour, radius, shadow, or
font size** that is not already a token in `:root`"*. Read literally the enumeration is closed and
excludes dimensions, so `268px` does not violate the rule *as written*. Read for intent —
*"extend the token set instead of hard-coding a value"* — it plainly does. And §6.2's list of
sanctioned deviations has four entries, none a language-conditional width, while §6.4 requires
*"a written entry there before it ships"*. So: **`268px` is outside the letter of §6.4, contrary
to its intent, and an unsanctioned deviation under §6.2.**

**Ruling: tokenise, do not sanction.** (1) It is a measurement, not a decision — §6.2's four
deviations are brand and density *choices*; "Arabic labels need 32 more pixels" is a fact about a
translation, misfiled in a list of principles. (2) It is already duplicated and can drift: changing
`:31` without `:435` gives a desktop rail and a mobile drawer of different widths in one language.
(3) Every surface gaining Arabic support under §9.3 needs the same treatment — a token generalises,
a §6.2 entry does not. (4) `.main` has no `body.lang-ar` rule and absorbs the 32 px via flex
`[observed]` — correct, but currently correct by accident.

```css
:root{ --sb-w-collapsed: 52px; --sb-w-expanded: 236px; }   /* Latin */
body.lang-ar{ --sb-w-expanded: 268px; }                    /* Arabic — +32px for longer nav labels */
```

`:24`, `:30`, `:31`, `:429`, `:435` then all consume the custom properties, `:31` disappears, and
`:435` loses its width declaration — collapsing the two competing hooks into one. This is not a new
deviation and needs no §6.2 entry; it is the existing rule being followed.

§6.4's enumeration is amended: the token requirement covers **colour, radius, shadow, font size,
and any dimension that varies by language, theme, or breakpoint**. The trigger is **variance**, not
size — a one-off language-invariant dimension (a modal's `520px`) is unaffected. Also untokenised in
the RTL block: the literal `#DCE0E6` at `:383` (and `:24`, `:32`, `:36`) `[observed]` — a colour,
which §6.4 forbids as written with no ambiguity at all.

**Rules**

- MUST define `--sb-w-collapsed` and `--sb-w-expanded` in `:root` (`eyvar_ops_panel_v40_fixed.html:11–21`) and MUST redefine `--sb-w-expanded` under `body.lang-ar` rather than restating a width.
- MUST replace the literal widths at `eyvar_ops_panel_v40_fixed.html:24`, `:30`, `:31`, `:429`, and `:435` with those custom properties, and MUST delete `:31` and `:435`'s width declaration once done.
- MUST express any dimension that varies by language, theme, or breakpoint as a custom property; §6.4's token rule is extended from "colour, radius, shadow, font size" to include such dimensions.
- MUST NOT add a `268px`-style language-conditional literal to §6.2; it is not a sanctioned deviation, it is an untokenised value.
- MUST replace the literal `#DCE0E6` at `eyvar_ops_panel_v40_fixed.html:383`, `:24`, `:32`, and `:36` with a `:root` colour token, per §6.4 as already written.
- MUST use exactly one selector hook for language-conditional styling; MUST NOT maintain both `body.lang-ar` and `.sb[dir="rtl"]` as parallel expressions of the same condition.
- SHOULD leave `.main` without a language-conditional width rule; the flex layout absorbing the delta is the intended behaviour and MUST be stated in a comment rather than implemented.

---

### 9.8 Review checklist

**Setup — 30 s.** Sidebar → Settings → General → *Interface language* → **العربية** → press **Save
general settings**. Three `[observed]` traps: changing the `<select>` alone does nothing (no
`onchange` at `eyvar_ops_panel_v40_fixed.html:1496`); the path is gated by
`requirePerm('manage_settings')` (`:7987`), which only `USR-1` holds in seeded data; and the choice
is **not persisted** (`:2570` re-seeds `'en'` on every load), so a refresh loses it.

| # | Check | Time | Pass condition | Rule |
|---|---|---|---|---|
| 1 | **Does this surface claim Arabic support?** | 15 s | If no, the only valid state is unmirrored English LTR. Jump to check 9. | §9.3 |
| 2 | **Untranslated text in a mirrored region** | 30 s | Zero English strings inside any `dir="rtl"` subtree. A single English word fails. | §9.3 |
| 3 | **Missing-key silence** | 20 s | Console shows no missing-key warnings. Absent the build lint, spot-check the settings tab rail: `stab.branding`, `stab.integrity`, `stab.rota`, `stab.ledger`, `stab.pricing` (`eyvar_ops_panel_v40_fixed.html:1431–1435`) are known-missing. | §9.3 |
| 4 | **Number, money, date sanity** | 45 s | Digits `0`–`9`, never `٠`–`٩`. Dates **Gregorian**, not Hijri. Money reads `1,234.56` with the affix on the locale's side. Numeric columns hug the **physical left** edge and share it with their header. | §9.2 |
| 5 | **Bidi damage on interpolated values** | 30 s | Find a row with an English name or bracketed ID inside an Arabic string: parentheses, `+`, `-`, `:` on the intended side; `(RDR-4821)` has not become `RDR-4821)(`. | §9.3 |
| 6 | **Primary action position** | 20 s | Primary button on the **physical left** in page headers, modal footers, card footers, drawer footers, save bar. | §9.1 rows 41–45, 54 |
| 7 | **Directional glyphs** | 30 s | Back arrow `→`. Row chevrons `‹`. Checkmarks, `×`, clock, magnifier, `↗`, media controls, Eyvar logo **un**mirrored. | §9.5 |
| 8 | **Motion direction** | 20 s | Open a drawer, fire a toast: each enters **from the edge it is anchored to**, not across the page. (Known-failing: `eyvar_ops_panel_v40_fixed.html:5288`, `:5301`.) | §9.1 |
| 9 | **Non-mirroring content** | 30 s | Map north up, pins on real coordinates. Chart time axes earliest-left. Code and query editors LTR with caret physical-left. Phone numbers read `+966 …`. | §9.2 |
| 10 | **Typography** | 30 s | Arabic body ≥14 px, line-height ≥1.7. **No tracking between Arabic letters** — check sidebar section labels specifically (`eyvar_ops_panel_v40_fixed.html:39` currently fails). No uppercase attempt, no italics. | §9.4 |
| 11 | **Copy** | 30 s | Commas `،`, question marks `؟`. Buttons masdar. No exclamation marks or emoji. Count strings grammatical at 1, 2, 3, and 11. | §9.6 |
| 12 | **Layout truncation** | 20 s | No Arabic label clipped, ellipsised, or wrapping in a one-line container. Sidebar is 268 px and content has not been squeezed into a horizontal scroll. | §9.7, §9.6 |
| 13 | **Switch back to English** | 20 s | Every string returns to English **with its inline markup**. (Known-failing: `:1502` loses a `<b>`, `:1992` loses a badge `<span>`, permanently, on the first toggle — `:7951` uses `textContent`.) | §9.3 |

**Total: ~4 min 40 s.**

**Rules**

- MUST run all 13 checks against every surface that claims Arabic support, before it ships.
- MUST re-run checks 2, 3, and 13 whenever a `data-i18n` key is added, renamed, or removed.
- MUST re-run checks 4, 5, and 11 whenever a string builder that interpolates a value is edited.
- MUST log a failed check against the section it violates, not as a generic "RTL bug".
- MUST NOT sign off a surface as Arabic-supporting on check 1 alone.
- SHOULD review as `USR-1`; no other seeded operator can change the interface language (`eyvar_ops_panel_v40_fixed.html:7987`) `[observed]`.

