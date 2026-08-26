# DESIGN.md — Eyvar Admin Design Rules

**Status:** binding for all new UI work in this repo.
**Source of truth — two sets, and they govern different things (`DECISIONS.md` D7):**

| Set | Governs | Where |
|---|---|---|
| **Navattic** — 15 frames | **Everything visual.** Colour, spacing, radii, borders, type scale, page organisation, nav treatment, card treatment, table style and the spacing inside it. | [`docs/06-design-reference/navattic-web/`](docs/06-design-reference/navattic-web/) |
| **Shopify admin (Polaris)** — 159 screenshots | **Structure only**, and the derivation trail behind §1–§5. It no longer governs a single visual value. | [`docs/06-design-reference/shopify-admin-web/`](docs/06-design-reference/shopify-admin-web/) |

**Scope:** desktop web admin surfaces of Eyvar Admin.

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

## What D7 changed, and what it did not

The business owner replaced the **visual** reference. `DECISIONS.md` **D7** is the decision;
`docs/05-restructure/design/03-navattic-language.md` is the specification that implements it,
and **it holds the token set** — read that before you read §1's colour or §6.1's inventory.

**Replaced.** The visual content of §1–§5 — colour, spacing, radii, borders, type scale,
page organisation, nav treatment, card treatment, table style — and §6.1's token values.

**Untouched, and this is not negotiable.** §7 accessibility, §8 the patterns Shopify never
covered, §9 bidirectionality. None of the three was ever Shopify-specific. Every contrast
ratio, focus ring, logical property and required state still binds. **A re-skin that drops a
ratio is a failed re-skin** — where a sampled Navattic colour fails §7, the design spec gives
the nearest compliant value with its arithmetic rather than shipping the sample.

**The precedence ladder below is unchanged.**

**§1–§5's screenshot citations are provenance, not authority.** They are kept so the
derivation stays auditable — you can still open the cited frame and check what the analyst
saw. You may not cite one to settle what Eyvar ships. Each of §1–§5 says so at its head.

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
- [ ] A card is separable from the ground it sits on. **Under D7 that is a 1px border and an 8px radius, not a fill step** — both grounds are white — §6.2 D-11, §6.3 D1
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
- [ ] Primary action is the only filled button on the screen, in **near-black `--ev-ink`** — R3 (rewritten by D7), §4.6
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

**Surfaces (D7).** **The content region is white and so is a card** — a card is carried by
its 1px `--ev-hairline` border and its 8px radius, not by a fill step. The only greys are
the two nav columns (`--ev-bg-nav`) and the one subdued fill `--ev-bg2` `#f5f7f9`, which
does six jobs: table header row, filter-chip strip, card section header, promo band, inner
empty panel, avatar fill. One card per concern. Hairlines are 1px, not `.5px` (§6.3 D17).

**Colour (D7).** Primary action = **near-black `--ev-ink`**, and it is the only filled
button on the screen (R3, rewritten). Accent blue `--ev-blue` `#2b6ef0` is the focus ring,
the chart series and selection — **never a text colour on a tinted ground** (4.259:1 on
`--ev-bg2`). Links = `--ev-blue-dk` + underline, never bare blue. Red appears in exactly four
places and nowhere else (R5a). Five badge tones, no red badge (R7).

**Type (D7).** 13px body — Navattic's body size, so this is no longer a deviation. Page
title **22px**. Card title 17px. Secondary 12px. Hierarchy comes from weight, not size.
Labels are not hints - a field label is body size at full contrast (§6.3 D22). No uppercase,
no letter-spacing on labels, nav section headings or table headers (§6.3 D18).

**Tables (D7).** **Columns carry vertical 1px hairlines** — Navattic rules its columns and
Shopify does not. Header row 32px on `--ev-bg2` with 12px sentence-case labels. Rows 40px
(56px with an avatar or a second line). Cell padding 12px inline. Numbers right-aligned with
tabular figures, in every locale (R4, §9.2). Row height uniform. Row actions visible to the
keyboard, never hover-only (§6.3 D19). Ledgers are append-only: no row actions, no bulk
selection (§8.3).

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

**Before you write CSS:** the value must be a `--ev-*` token in `src/styles/globals.css`,
and **the complete post-D7 token set — every value, with its measurement or its derivation —
is `docs/05-restructure/design/03-navattic-language.md` §1.** §6.1's legacy inventory is
historical; §6.6 closed the "these categories are frozen" rule when the stack was adopted.
Tailwind's own palette is **not** a token set: `bg-blue-500` bypasses `--ev-*` while looking
legitimate (§6.6).

## Rulings on contested points

The sources genuinely disagree in places — Shopify ships more than one answer, and the
analysts inherited the contradiction. Each ruling below settles one. These are decisions,
not observations; overturn them deliberately, in writing, by editing this table.

| # | Conflict | Ruling for Eyvar |
|---|---|---|
| R1 | Two banner families ship: a saturated split-strip banner in the store admin, a soft tinted card in account/auth — §5.2 | Use the **soft tinted card** everywhere. It reads better at Eyvar's smaller type sizes, survives a future dark mode, and does not lock text to white-on-colour. |
| R2 | The contextual save bar uses a green primary in account settings, a neutral one in the store admin. §2.3 additionally recommends a *light* Save, derived from Shopify's dark top bar — Eyvar's top bar is white, so a light Save would be invisible — §2.3, §4.6 | **AMENDED BY D7.** Save is **the same primary as every other primary**, and under D7 that primary is **near-black `--ev-ink`**, not brand blue. Never green, never white-on-white. The reasoning is untouched; one colour name changed. The §2.3 "light Save" recommendation does not apply to Eyvar and is void. |
| R3 | Shopify's primary action is near-black `#303030` and reserves blue strictly for links — §1.1.4, §4.6 | **REWRITTEN BY D7 — the old ruling is void, do not cite it.** D7 kills §6.2 **D-1**, so brand blue is no longer the primary action colour. Navattic's primary button measures **`#0C1116`**, a cool near-black, so §1.1.4 and §4.6's near-black MUSTs — which the old R3 declared non-binding — now describe Eyvar too: **the primary action is `--ev-ink`.** The old ruling's *second* half survives on new evidence: `--ev-blue` `#2b6ef0` is **4.574 : 1** on white and **4.259 : 1** on `--ev-bg2`, so it cannot carry 13px text on a tinted ground. Links still take **`--ev-blue-dk` plus an underline** — no longer because blue is spoken for, but because blue is not a compliant text colour. Blue's remaining roles: focus ring, chart series, selection. Measurements: `design/03-navattic-language.md` §1.3, §7. |
| R4 | Numeric columns are right-aligned on orders/discounts, left-aligned on customers — §3.1 | **Always right-align numeric, currency, and count columns**, with tabular figures. The customers index is the outlier. In Arabic this alignment does **not** flip — see §9.2. |
| R5 | No critical/red badge appears in any of the 159 screens; red is reserved for destructive buttons — §3.4, §1.7 | **No red badge for ordinary lifecycle state.** Critical page-level state is a banner; critical *row-level* state in a work queue is the documented exception — see §8.4, which defines the only sanctioned row-critical treatment. Eyvar's 49 existing `b b-red` usages are a defect (§6.3 D11), not a precedent. |
| R6 | Copy is inconsistent in one place — a missing trailing period on an empty-state line — §3.6, §5.7 | Do not copy typos. Full sentences take a period; fragments, labels and button text do not. The governing rule is §5.7. |
| R7 | The badge palette is specified three ways: six tones (§1.1.5), five tones (§3.4), and "no critical at all" (R5) | The palette is **five tones: success, warning, info, neutral, new**. There is no critical badge tone (R5). "New" is a tone; §3.4's five-item list is superseded by this one. Any sixth tone requires an edit to this row. |
| R8 | Empty states: §1.5 and §5.7 require an illustration unconditionally; §3.6 forbids one in an empty card; §3.8 forbids one in a timeline | Illustration **only** on a whole-page, zero-records-ever empty state. An empty card, section, timeline, or filtered-to-zero result gets one grey sentence and, where an action exists, one plain-button action — no illustration, no heading. §3.6's "emptiness is meaningful" exception is void: it was untestable. |
| R9 | Toast length: §5.1 caps a toast at "≤ ~5 words", while §5.1 and §5.7 both require echoing the object's exact name | The **echo wins**. A toast is one line that names the object exactly, capped at 60 characters; past that, truncate the object name with an ellipsis, never the verb. The five-word cap is void. |
| R10 | Toast vs banner: §5.0 says pair them when there is a next step; §4.4 says prefer a toast over a persistent banner; §5.2 forbids a banner where a toast would do | One event, one surface, decided by lifetime: **transient confirmation → toast; standing condition or a next step the user must act on → banner**. Pair the two only when the action both completed *and* left a standing condition, and never show more than one page-level banner. |
| R11 | The left nav is measured at 240px (§1 calibration), 256px (§2.1), and 232px (§6.1) | The Shopify figure is **~240px**, the calibration constant. §2.1's 256px and §6.1's 232px are estimation error, not disagreement about the product. This does not bind Eyvar, whose rail is 52/236px by §6.2 D-4. **SPENT UNDER D7:** it reconciles three measurements of a nav that no longer governs anything. Kept, not deleted — renumbering this table would break every citation of it. |
| R12 | §1.6 issues six motion MUSTs, then states that all of it is inferred and none observed | §1.6 is **demoted to SHOULD in full** and is not citable in review. Motion that actually binds Eyvar is §7.6 (reduced motion) and §8.1 (ambient/looping animation). |
| R13 | The same 768x523 captures are calibrated four different ways in four section preambles: 1.875x, 2x of a 1536px viewport, 1.93x, and 0.53x. Every pixel figure in the document inherits one of the four; the 2x reading made all of §2 about 6% high | **One calibration: the measured scale is ~1.90x.** More importantly: **every px figure in §1-§5 is indicative, not binding.** The screenshots cannot support exact measurement, so what binds is the *relationship* (nav narrower than content, card radius larger than badge radius, the 4px grid) and, for Eyvar, the token values in §6.1. Never cite a §1-§5 pixel number in review. Where a figure was individually re-measured and named in a ruling (the drawer widths, the popover width, the card radius), that figure stands as measured and is not rescaled. **STRENGTHENED BY D7:** §1-§5's px figures now describe a product that does not govern Eyvar at all, so they are doubly non-binding. The carve-out survives as a rule about *rescaling*, but **the three figures it names were re-measured against Navattic and two of them moved** - drawer **406 -> 480**, card radius **12 -> 8**; the popover width is not evidenced in the new set and is unchanged. `design/03-navattic-language.md` §1.4. |
| R14 | `Paid` ships as a green badge in billing history and a grey one on orders - and §3.4 states a MUST that the same label never changes tone | **`Paid` is success (green).** The "same label, same tone" rule stands; Shopify breaks it, Eyvar does not. |
| R15 | Badge, toast and avatar geometry is stated two ways: §1.4 says rounded rectangles (~8px) and never circles; §3.4 says fully-rounded pills, §5.1 says a rounded pill, §3.8 says a circular avatar | **Rounded rectangles.** Badges and toasts are rounded rectangles, not stadium pills — the badge radius is **4px**, the card and control radius **8px**, so the ladder §1.4 asserts survives. Eyvar's existing `border-radius:999px` badges (`:117`) are a defect under this ruling. **THE AVATAR CLAUSE IS KILLED BY D7.** "~30px rounded squares, never circles" is falsified: Navattic's identity avatar is a **32px circle**, and this is measured rather than eyeballed — the horizontal inset one destination pixel below the top edge is 5px, which a 9-destination-px-radius **circle** predicts at 4.88 and an 8px rounded square predicts at 1.54. **Avatars are 32px circles.** `design/03-navattic-language.md` §4.5, §6. |
| R16 | §1.1.5 has a MUST that info banners carry "no coloured strip at all... not as a blue fill" - falsified by the document's own evidence, which shows a `#EDF4FF` fill | **All four banner tones are pale tinted cards** (this is R1 applied consistently). The §1.1.5 MUST is void. |
| R17 | Shopify ships two warning fills - peach `#F4D6B1` for `Payment pending`, yellow `#F6EA98` for `Unfulfilled` - which §1.1.5 collapses into one tone without saying so | **Eyvar has one warning tone** (the five-tone palette of R7). Where a surface needs to separate "waiting on someone else" from "waiting on you", separate them with the *label*, not a second fill. |
| R5a | R5 sends critical state to a page-level banner, but a work queue's critical state is **per row**, and §5.2 forbids stacking banners - so the document had no legal way to render "this row is breached", which is the entire point of the screen. Raised and solved in §8.4.6 | R5 stands - no red badges. It is **amended** to enumerate the complete set of permitted red uses: (1) a destructive button, (2) one page-level critical banner, (3) a breached-row leading-edge marker (a 3px inset edge, not a pill - it cannot be mistaken for a badge tone), (4) a map marker. A breached row also carries the word `overdue`, so colour is never the only carrier. Any fifth use of red needs a row in §6.2. |
| R18 | §1.6 caps every UI transition at 300ms, which makes every ambient looping animation in the product illegal - including the "feed is live" dot, which is load-bearing on a monitoring screen. Raised and solved in §8.1.6 | §1.6 governs **transitions only**. Ambient loops are a separate class with a narrow licence: permitted **only** to signal "this feed is live", opacity-only, 1200-2500ms, never dropping below 0.4 opacity, and **never encoding severity**. This kills `live-dot` (`:342`), `ping-pulse` (`:331`) and `reqPulse` (`:145`) as currently written. |
| R19 | §6.4’s “no new colour token” rule and §7’s 3:1 non-text contrast requirement collide on the **unchecked** checkbox and radio. Their boundary is `--ev-hairline` on white, which measures below 3:1, and the token set holds no darker neutral. Raised in 0.4 as **R-4**. | **§7 wins; one neutral is licensed.** `--ev-hairline-strong`, used **only** for the resting boundary of an unchecked control — checkbox, radio, and any future control whose entire affordance *is* its outline. It is not a border token, not a divider, not a hover state, and it never appears on a surface that already carries a `--border`. The “no new colour” rule exists to stop palette drift, not to license a control the operator cannot see, and a control boundary is precisely what WCAG 2.2 non-text contrast was written for. Any second use of it needs a row in §6.2. |

