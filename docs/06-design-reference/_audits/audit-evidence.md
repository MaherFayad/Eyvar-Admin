# Adversarial evidence audit — DESIGN.md vs. the 159 screenshots

**Scope.** Path audit of every screenshot citation; strict re-check of ~55 substantive
`[observed]` claims across all six sections; mislabel audit; contradiction audit.

**Method.** Every finding below was checked by opening the cited `.webp` and, where a number or
colour was at stake, by sampling pixels directly (PIL: dominant-colour histograms over the exact
region, edge scans for boundaries, white-region bounding boxes for modal geometry). "CONFIRMED"
means the screenshot shows something different from what the document says. "PLAUSIBLE" means the
claim is unsupported or overstated but I could not fully falsify it.

> **Note on line numbers.** `DESIGN.md` grew from 2,891 to 3,070 lines *while this audit was
> running* (another editor added §7–§9 and rulings R7–R12). All line numbers below are against the
> **3,070-line version** as of 2026-08-24 19:11. Rulings R7, R8 and R11 now paper over three of the
> contradictions found here; the underlying `[observed]` errors are untouched and are still listed.

---

## 1. Path audit

**Clean. Zero broken citations.**

- 714 `.webp` mentions → 709 fully-qualified `NN-folder/name.webp` paths + 5 bare basenames.
- 135 distinct paths cited; **all 135 resolve to a real file on disk**. No wrong-folder pairings,
  no typos, no stale names (checked both full-path and basename-only).
- 24 of the 159 screenshots are never cited by any section:
  `00-auth/forgot-password-request-reset`, `00-auth/login-email-with-social-providers`,
  `00-auth/login-password-reset-success-banner`, `00-auth/login-password-step-filled`,
  `00-auth/login-two-factor-code-entered`, `00-auth/reset-password-new-password-form`,
  `00-auth/signup-choose-provider`, `02-orders/draft-order-add-notes-modal`,
  `03-products/product-detail-sample-product-with-setup-guide`,
  `03-products/product-detail-setup-guide-add-first-product`,
  `03-products/product-edit-media-pricing-with-category`,
  `03-products/product-edit-multiple-option-values`, `03-products/product-edit-single-variant-row`,
  `03-products/product-edit-variants-bulk-actions-menu`,
  `03-products/products-list-bulk-more-actions-menu-alt`, `03-products/products-list-single-product`,
  `04-customers/customer-segments-list-default-templates`,
  `05-online-store/theme-editor-color-scheme-tokens`,
  `05-online-store/theme-editor-section-selected-image-banner`,
  `05-online-store/theme-editor-template-picker-products`, `05-online-store/theme-editor-template-picker`,
  `06-marketing/marketing-automation-templates-gallery`,
  `10-settings/settings-subscribed-add-business-address`,
  `11-apps-and-channels/app-detail-permissions-and-uninstall`.
  This matters for one claim: R5 and §1.7 assert "no critical/red badge appears in **any of the 159
  screens**", but the document only demonstrably read ~135. See F23.

---

## 2. Findings

| Line | Section | Claim as written | What the screenshot actually shows | Verdict | Suggested correction |
|---|---|---|---|---|---|
| **201**, **285**, **575** | §1.1.1, §1.1 Rules, §2.1 | "`bg-nav` — Same `#F1F1F1` as the canvas — the nav is **not** a distinct color"; MUST rule "MUST give the left nav the **same** fill as the canvas… MUST NOT give the nav its own background color"; "nav column and the content region share the **same light grey canvas** — sampled at `#F1F1F1` on both sides of the x≈128 boundary — so there is no visible divider" | The nav column samples **`#EBEBEB`**, the content canvas **`#F1F1F1`** — a consistent, visible tonal step at x≈129. Verified in all five cited/spot-checked frames: `products-list-default`, `discounts-list-with-code`, `orders-list-with-metrics-row`, `finances-overview-earnings-donut-and-payouts`, `customers-list-single-customer` | **CONFIRMED** | Nav is one step darker than the canvas (`#EBEBEB` vs `#F1F1F1`). Rewrite the MUST as "nav MUST be a near-canvas grey one step darker, with no border/shadow between them" — the *no-divider* half of the claim is correct; the *same-colour* half is not |
| **650** | §2.1 | "A nested active item does **not** get a pill — it gets a small left-edge caret/marker and a heavier label" (+ derived MUST: "active nested items MUST use a lighter marker + weight change, never a second pill") | Both cited files show the opposite. `inventory-quantities-by-variant` (Inventory active) and `customer-segments-row-actions-menu` (Segments active) render a **full-width rounded white pill** on the nested row, *plus* an elbow connector marker | **CONFIRMED** | Nested active items get the same pill as top-level ones, plus a connector elbow. Delete the MUST or invert it |
| **480**, **494** | §1.5 | "**Badges** — a dot, never a glyph (`orders-list-with-metrics-row.webp`)"; MUST rule "MUST use a dot, not a glyph, inside badges" | `order-fulfill-item-page.webp` — the `Unfulfilled` badge carries a **package glyph**, not a dot. `order-detail-paid-fulfilled-gift-card.webp` — the green `Fulfilled (1)` badge carries a **delivery-truck glyph**. Dots appear on *list-row* order badges; *card-header* order badges use glyphs | **CONFIRMED** | "List badges use a leading dot; fulfilment card-header badges use a leading 16px glyph." Downgrade the MUST to "MUST NOT mix dot and glyph within one badge family" |
| **1710** | §3.8 | "A card containing: a ~32 px **circular** avatar with initials at the left" | The `JS` composer avatar in `order-detail-timeline-comment-composer` / `-paid-fulfilled-gift-card` is a **rounded square** (~16 img px ⇒ ~30 CSS px), saturated pink, **white** initials | **CONFIRMED** | "~30 px rounded square." Contradicts §1.4 L444 / §1.5 L495, which are right |
| **495** | §1.5 | Avatar tint is "a **pale** tint from a rotating pastel palette, with a **matching dark text** color… pink/rose for the timeline commenter 'JS'" | Two different treatments in the two cited files: `login-password-step-empty` "JM" = pale lavender + **dark** initials; `order-detail-paid-fulfilled-gift-card` "JS" = **saturated** pink + **white** initials | **CONFIRMED** | The palette is not uniformly pale, and the text is not uniformly dark. Also "the tint is derived from the identity… not random per render" cannot be shown from static frames — see mislabels |
| **2594** | §5.3 | "The modal is vertically positioned near the **upper third, not centred**, in every sample `[observed]`" | Measured the white-region bounding box of 8 scrimmed modals (`products-list-archive-confirm`, `customer-segment-delete-confirm`, `products-list-create-view`, `order-detail-mark-as-paid`, `customer-erase-personal-data`, `settings-payments-cash-on-delivery`, `marketing-automation-template-detail`, `app-uninstall-confirm`). Every one centres at **y≈239–240** of a 473 px UI area (true centre 236.5). All are vertically centred | **CONFIRMED** | "Vertically centred in every sample." The width fractions in the same block (43% small/medium, 68% large) are correct — all measured 328 and 520 image px |
| **429** | §1.4 | "**Notification popover** … ~**200 px** wide" | `alerts-popover-with-channel-issue`: popover spans x 556→757 = **201 image px ⇒ ~400 CSS px**. §2.6 L1123 says ~404 px and is right | **CONFIRMED** | §1.4 read image pixels as CSS pixels. Change to ~400 px |
| **1420** | §3.4 | "`Draft`, `Archived`, `Hidden`, `Closed` → **neutral / subdued** — light grey fill, dark grey text" (evidence: `products-list-default.webp`) | In the cited file the `Draft` badge fill samples **`#DCE8F1`** (pale blue) with blue text, against `Archived` at `#F0F0F0` grey. Also blue on `customer-segment-templates-panel` (`New segment  Draft`) | **CONFIRMED** | `Draft` is the **info** tone, not neutral. §1.1.5 L261 has it right; §3.4 and its "`Draft` and `Archived` MUST be neutral, not warning" rule need correcting |
| **263** | §1.1.5 | Neutral badge examples include "`Code`" (evidence: `discounts-list-with-code.webp`) | In that file `Code` sits in the **Method** column as **plain text** — no pill, no fill. (Zoomed and confirmed against the adjacent green `Active` pill) | **CONFIRMED** | Remove `Code` from the badge list. It is a good example for §3.4's "plain text when the value is descriptive" rule instead |
| **259** | §1.1.5 | Success (green) badge examples include "`Fulfilled`" (evidence: `search-modal-order-results-list.webp`) | In that file every order badge — `Paid`, `Fulfilled`, `Refunded`, `Voided` — samples neutral grey (`#F0F0F0`–`#F1F1F1`). No green anywhere in the results list | **CONFIRMED** | Cite `order-fulfill-item-page` / `order-detail-paid-fulfilled-gift-card` (green `Fulfilled (1)` card badge) instead, and note that the *title-row* `Fulfilled` badge on the same page is grey — Shopify ships both |
| **229** | §1.1.3 | "`border-focus` `[observed]` — Dark/near-black 2px ring — Focused text field… `product-edit-pricing-inventory-shipping.webp`" | That screenshot contains **no focused field at all** — every input, including the quantity field, carries the resting hairline. The only real focus state in the set (`product-edit-variant-option-name-dropdown`, the "Option name" combobox) samples **`#687B9F`/`#8493B7` — desaturated blue**, not near-black | **CONFIRMED** | Re-cite to `product-edit-variant-option-name-dropdown` and change the value to a blue ~2 px border. §4.2's "dark blue/near-black" is the closer reading |
| **1520** | §3.5 | Orders metrics strip: "a `Today` date chip in the first column, then **7 metric columns**" | `orders-list-with-metrics-row`: Today chip + **6** metric columns (Total orders, Ordered items over time, Returns, Fulfilled orders over time, Delivered orders over time, Time to… — the 6th clipped at the card edge). No 7th is visible | **CONFIRMED** | "…then 6 visible metric columns, the last one clipped." Also the clipped column shows no sparkline, so "each … and a tiny sparkline" is over-general |
| **2395** | §4.7 | "**Side panel (sheet) as a sub-form.** A right-docked panel **~330 px** wide… `navigation-add-menu-with-add-item-panel.webp`, `customer-segment-templates-panel.webp`" | Measured: Add-menu panel = 203 img px ⇒ **~406 CSS px**; templates panel = 324 img px ⇒ **~648 CSS px** (42% of viewport). Neither is ~330 | **CONFIRMED** | ~406 px for the form sheet, ~648 px for the two-column templates panel. §2.6 L1123–1125 and §5.5 already have both right |
| **1128**, **2151** | §2.6, §4.4 | "Toast — small dark pill, bottom-centre **of the content region**"; "a dark pill toast, centred at the bottom of the **content area**" | Toast centre lands at **x≈384 = viewport centre** in every sample checked (`products-list-products-imported-toast`, `products-list-view-deleted-toast`, `analytics-dashboard-saved-toast-last-7-days`). The content region runs 128→768, centre x=448 — the toast is 64 px left of that | **CONFIRMED** | "bottom-centre of the **viewport**." §5.1 L2492 is right; §2.6 and §4.4 should defer to it |
| **811** | §2.3 | "The message sits left-of-centre, **preceded by a small warning glyph**" | True on store-admin bars (`product-edit-pricing-inventory-shipping` shows ⚠ + "Unsaved product"). **False on the account bar**: `account-general-unsaved-changes` shows bare "Unsaved changes" with **no glyph** — zoomed and verified | **CONFIRMED (partial)** | Scope the glyph claim to the store admin, or list the account bar as the exception it already is elsewhere in §2.3 |
| **830** | §2.3 | "On the account surface the **left nav is visibly dimmed** while the save bar is active" | In `account-general-unsaved-changes` the left nav column and the page canvas both sample **`#F6F5F8`** — identical, no dimming. (The dimmed element is the Shopify *wordmark* in the bar itself.) That page's nav is also the account nav (General/Security), not the admin nav | **CONFIRMED** | Delete the claim, or restate it as "the wordmark is dimmed in the save-bar state" |
| **2312** | §4.6 | "**Social / provider** — Light grey fill, brand mark, no text… `login-email-filled.webp`, `account-general-unsaved-changes.webp`" | Correct for `login-email-filled` (three equal grey-filled tiles). **Wrong for the second citation**: `account-general-unsaved-changes` renders "Connect to Apple / Connect to Facebook / Connect to Google" as **plain blue text links** with a brand mark, no fill, no border | **CONFIRMED** | Drop the second citation, or split into two variants (filled provider tile vs. provider link row) |
| **2679** | §5.4 | "Bulk selection action bar — a floating **dark-outlined** pill" | `products-list-bulk-selection-action-bar`: white surface, **light hairline** border, soft shadow. §3.3 L1344 ("white rounded pill with a soft shadow") and §1.4 L433 are right | **CONFIRMED** | "white pill, hairline border, soft shadow" |
| **1631** | §3.7 | "**Non-line tiles.** `Sales by channel` renders a single large centred value with the category name above it. `[observed]` `analytics-dashboard-today-no-data.webp`" | In the cited file `Sales by channel` shows **only** "There was no data found for this date range." — no value, no category name. The described shape appears in `analytics-dashboard-saved-toast-last-7-days.webp` ("Draft Orders" over "$34.00"), which is *not* cited for this claim | **CONFIRMED (mis-citation)** | Re-cite to `analytics-dashboard-saved-toast-last-7-days.webp` |
| **642** | §2.1 | "`Sales channels` group — an **uppercase-ish** muted group label" | "Sales channels" and "Apps" render in ordinary **sentence case**, muted, regular weight — no uppercase, no letter-spacing. This also contradicts §1.2's MUST ("nav section labels in sentence case; MUST NOT use uppercase or letter-spacing") | **CONFIRMED** | Delete "uppercase-ish". Say "muted sentence-case group label" |
| **2819** | §5.7 | "The **single** exclamation mark found in any screenshot is inside user-authored content: the order note 'First customer and order!' … and a timeline comment" | `blog-posts-list.webp` shows a third instance — the blog post titled "**New arrivals!**" (also user-authored, so the *rule* survives, but "the single… " is false as stated) | **CONFIRMED** | "Every exclamation mark in the set is inside user-authored content (order note, timeline comment, blog post title)" |
| **2545**, **2577** | §5.2 | "Placed full-width at the top of the **page's main column**"; MUST rule "MUST place page-level banners as the first element of the **main column**" | In `draft-order-validation-error-banner` and `discount-detail-shareable-link-modal` the banner spans **the whole content block** (x 196→700 — main **and** rail), not the main column (196→526) | **CONFIRMED** | "…first element of the content block, spanning main + rail" |
| **2572** | §5.2 | "banners announcing *news about a completed action* carry an **×**" | Counterexample inside its own evidence: `discount-detail-shareable-link-modal` — "✓ FREESHIPPING10 was created successfully. What's next?" has **no ×** on the green strip (zoomed and verified) | **PLAUSIBLE** | Soften to "usually carry an ×"; the dismissible/standing split is not clean in the source |
| **156** (R5), **~530** (§1.7) | Rulings, §1.7 | "No critical/red badge appears **in any of the 159 screens**" | Only **135** of the 159 screenshots are cited anywhere in the document; §1.7 itself says "the 33 captures read", §4 says 44, §5 says 68. The 159 figure was never earned | **PLAUSIBLE** | "No critical badge appears in any screenshot read (≈135 of 159)." The *ruling* stands; the evidence claim is inflated |
| **1197** | §3.1 | "Thumbnail — ~**40×40 px rounded square** … `blog-posts-list.webp`" | Correct on products (≈23×20 img px ⇒ ~44×38 CSS). **Wrong for the second citation**: the blog-post thumbnail is a **landscape 4:3 tile** (≈42×30 img px ⇒ ~84×60 CSS), not a square | **CONFIRMED (partial)** | "40×40 square on product-shaped resources; a 4:3 landscape tile on editorial resources" |
| **1556** | §3.6 | "Illustration, ~**170×155 px**" | `discounts-empty-state`: illustration measures ≈85×95 img px ⇒ **~170×190 CSS px**. Width right, height ~23% low | **PLAUSIBLE** | "~170×190 px" or just "~170 px wide" |

---

## 3. Mislabel audit — `[observed]` that the cited screenshot cannot establish

These should be `[Polaris]` or `[inferred]`. §1.7 and §4.8 already confess most of the *category*
("exact hex values … eyeball estimate"; "hover states … no hover is captured") — but the claims
themselves are still tagged `[observed]` in the body, which is what a reviewer will read.

| Line | Section | Mislabelled claim | Why the screenshot can't show it | Suggested tag |
|---|---|---|---|---|
| **196–276** (whole §1.1 tables) | §1.1 | Every hex value tagged `[observed]` | Sampled from the actual WebPs: primary button fill is **`#3E3E3E`** (large flat area, `login-password-step-empty`), not `#303030`; account Save green is **`#367C62`**, not `~#2CA36A` (L244); success banner strip is **`#45815D`**, not `~#1F8A4C` (L271); critical strip is **`#D03822`**, not `~#E02F2F` (L272). The ones that *do* match (`#1A1A1A` bar, `#303030` search field, `#F1F1F1` canvas, `#E3E3E3` neutral badge, `#C3FED8` success badge) match because they are Polaris tokens recalled, not measured | `[Polaris]` for the token names, `[inferred]` for the values. Contradicts §1.1.2, which uses `#303030` for *both* body text and the primary fill — the pixels say those are different values |
| **220** | §1.1.2 | "`text-link` … Strong blue ~`#005BD3` … link-styled table values (**"0 in stock"**)" citing `products-list-default.webp` | "0 in stock" / "5 in stock" sample as **red-brown** (`#825F62` / `#76584D`) — a low-stock critical tone, not a blue link. §3.4 repeats the error ("inventory counts render as inline links") | `[inferred]`, and pick a genuinely blue example (customer email, "Learn more") |
| **1264** | §3.1 | "Wide tables clip at the card's right edge … **and scroll horizontally**" — the split tags scoping only *pinning* to `[Polaris]` | The clipping is observable; the scrolling is not. A static frame cannot show scroll | Move "scroll horizontally" into the `[Polaris]` half |
| **~1290** | §3.2 | "The `+` creates a view; **hovering it** shows a `Create view` tooltip" | The tooltip is visible; the hover *trigger* is not. Same for §5.6's "**Hovering** a task's circle shows the tooltip 'Mark as done'" | `[inferred]` for the trigger, `[observed]` for the tooltip's existence and position |
| **~2050** | §4.4 | "the error text … is inserted, **pushing the button down**" | Layout dynamics across two states; only one frame exists | `[inferred]` |
| **~790** | §2.4 | "The overlay body **scrolls as one unit** — the settings nav scrolls off the top … it is **not independently sticky**" | Inferred from one scrolled frame; a sticky nav could look identical at that scroll offset | `[inferred]` |
| **~660** | §2.1 | "**Exactly one section is expanded at a time**" | A universal claim from N static frames, and really a route-driven inference | `[inferred]` |
| **~2700** | §5.5 | "the page behind stays fully legible **and, in the guide panel, fully interactive**" | Legibility is observable; interactivity is not | Split the tag |
| **495** | §1.5 | "The tint is **derived from the identity** (same person = same colour across screens), **not random per render**" | Requires seeing the same identity across renders *and* a re-render; neither is in the set | `[inferred]` |
| **~2495** | §5.1 | "Width hugs the content; there is **no fixed width** and no wrapping to a second line **in any sample**" | "No fixed width" is a generalisation from ~5 short strings that would all fit a fixed width anyway | `[inferred]` |
| **1338** | §3.3 | "**Ticking** any row checkbox **converts** the header row into a selection header" | A transition inferred from two independent screenshots | `[inferred]` for the causation; the two end states are `[observed]` |

---

## 4. Contradiction audit

Rulings **R7** (badge palette), **R8** (empty-state illustration) and **R11** (nav width) now settle
three of these. The rest are still live and unruled.

| # | Sections | The conflict | What the pixels say | Verdict |
|---|---|---|---|---|
| C1 | §1 header vs §2 header vs §3 L1176 vs §4 L1821 | **Four incompatible calibrations of the same 768×523 captures**: §1 "~768 px render of a ~1440 px viewport, scale ≈1.875×"; §2 "2× downscale of a ~1536 CSS-px viewport"; §3 "≈1.93×"; §4 "taken at ~0.53× [≈1.89×] of a 1440 px viewport". Every px figure in the document inherits one of the four | All 159 files are exactly 768×523. Top-bar bottom edge measures y≈29–30, so a 56 px bar implies **≈1.87–1.93×** — §2's 2×/1536 px assumption is the outlier and it is the one that produced the 256 px nav | **CONFIRMED.** R11 patches the *symptom* (nav width) and calls §2 "estimation error", but leaves the 2× calibration in place at L~465, so every §2 figure is still ~6% high. Fix the calibration, not the one number |
| C2 | §1 L349 (240 px) vs §2.1 L626 (256 px) vs §3 L1180 (**247 px**) | Nav width stated three ways in the body | Boundary at x≈129 img px ⇒ 245 px at the measured 1.9× scale | **CONFIRMED, partly ruled.** R11 arbitrates 240 vs 256 vs 232 but **omits §3's 247 px**, which is still in the text and is arguably the most accurate figure |
| C3 | §1.4 L408/L443 ("~**12 px**", MUST) vs §3.5 L1480 ("~**8 px**") vs §4.1 ("~8–12 px") | Card corner radius | Edge-scanned the card corner in `discounts-empty-state`: the curve runs ~6 img px ⇒ **~12 CSS px**. §1.4 is right | **CONFIRMED.** §3.5 should say ~12 px; §4.1's range should be tightened |
| C4 | §1.4 L445 ("MUST render badges as **soft rectangles** (8 px), **never as full pills**") vs §3.4 L1407 ("Badges are small **pills: fully rounded ends**") | Badge geometry — and this one is a MUST vs. a flat contradiction of it | Zoomed `products-list-default` badges: flat sides with ~3–4 img px corner radius on an 11 img px pill ⇒ a **rounded rectangle**, not a stadium. §1.4 is right | **CONFIRMED.** Unruled |
| C5 | §1.4 L~430 ("Toast … ~**8 px** radius") vs §5.1 L2490 ("rounded **pill (fully rounded ends)**") | Toast geometry | Zoomed `products-list-products-imported-toast`: ~5 img px radius on a 22 img px pill — a rounded rect. A true stadium would be 11 img px. §1.4 is right | **CONFIRMED.** Unruled |
| C6 | §1.4 L444 + §1.5 L495 ("8 px rounded squares, **never circles**", "~28 px") vs §3.8 L1710 ("~32 px **circular**") | Avatar shape — MUST vs. contradiction | Rounded square, ~30 CSS px. §1.4/§1.5 right on shape, §3.8 right on size | **CONFIRMED.** Unruled — and §3.8 is the section a reviewer building a timeline will read |
| C7 | §1.1.5 L274 + MUST L291 ("info banners: **no coloured strip at all** — plain white surface… **not as a blue fill**") vs §4.4 L2111 ("informational banners are a **pale blue/grey card** with an ⓘ icon") | Info-banner surface — a MUST directly contradicted by another section's `[observed]` | Both ship. `point-of-sale-subscription-plans` = white + hairline + blue icon (§1 right). `order-fulfill-item-page` = fill samples **`#EDF4FF`**, a real blue tint (§4 right). The **MUST at L291 is falsified by the document's own evidence** | **CONFIRMED.** Unruled. R1 covers the *strip-vs-tinted-card* split but not the info tone specifically |
| C8 | §1.1.5 L273 ("Warning: **Amber `#F0A93B` saturated header strip**, dark text") vs §4.4 L2115 ("Warning banners are **pale yellow**") | Warning-banner surface | Same split as C7 | **CONFIRMED.** Unruled |
| C9 | §2.6 L1128 + §4.4 L2151 ("**content region** / content area") vs §5.1 L2492 ("**viewport**… 50% of viewport width in every case") | Toast horizontal anchor | Viewport centre (x=384), not content-region centre (x=448) — see F14 | **CONFIRMED.** §5.1 is right |
| C10 | §1.3 L374 ("3 equal columns, ~**16 px** gutters") vs §3.7 L1609 ("~**12 px** gutter") | Analytics grid gutter | `analytics-dashboard-today-no-data`: cards at 141→339 and 349→547 ⇒ 10 img px ⇒ **~19–20 CSS px**. Both figures are low; §1.3 is closer | **CONFIRMED (both wrong)** |
| C11 | §1.3 L382 ("Row height, with **32 px** thumbnail") vs §3.1 L1197 ("~**40×40 px**") | Thumbnail size | ≈23×20 img px ⇒ ~40 CSS px. §3.1 right, §1.3 wrong | **CONFIRMED** |
| C12 | §4.7 L2395 (~330 px) vs §2.6 L1124–1125 (~370 / ~406 px) vs §5.5 (~24% / ~42%) | Drawer widths, same files | 406 px and 648 px measured — see F13. §2.6 and §5.5 agree with the pixels; §4.7 does not | **CONFIRMED** |
| C13 | §5.4 L2679 ("**dark-outlined** pill") vs §3.3 L1344 / §1.4 L433 ("**white** surface, border + shadow") | Bulk action bar | White. §3.3/§1.4 right | **CONFIRMED** |
| C14 | §1.1.5 L259/L263 (`Paid` listed under **both** success and neutral) vs §3.4 L~1418 (`Paid` = success only) vs §3.4's rule "the same label MUST NOT change tone between screens" | `Paid` tone | Genuinely both: **green** in `settings-billing-history`, **grey** in `order-detail-paid-fulfilled-gift-card` and `search-modal-order-results-list`. §1.1.5's dual listing is the honest one; §3.4 states a MUST that its own evidence breaks | **CONFIRMED.** Needs a ruling: pick one tone for `Paid` and say so |
| C15 | §1.1.5 L~262 (Warning = one amber tone, `#FFEFC9`-ish, covering both `Unfulfilled` and `Payment pending`) vs the pixels | Warning is treated as a single tone | Two visibly different fills in the same row of `orders-list-with-metrics-row`: `Payment pending` = **`#F4D6B1`** (peach/orange), `Unfulfilled` = **`#F6EA98`** (yellow). Neither is `#FFEFC9` | **CONFIRMED.** Shopify ships two warning-family tones; the doc collapses them into one |

---

## 5. Clean areas

These were checked hard and held up. No corrections needed.

- **Path integrity** — 714 citations, 135 distinct files, zero broken.
- **§2.2 page geometry** — every figure verified against `order-detail-paid-fulfilled-gift-card`,
  `order-fulfill-item-page`, `discounts-empty-state`: content block 196→700 img ⇒ **~1008 CSS px**;
  main 196→526 ⇒ **~658**; rail 537→700 ⇒ **~326**; column gutter **~22**; side gutter 128→141 ⇒
  **~26**; and the block centre lands at **x=448 = (128+768)/2**, exactly as claimed. The header
  slot order, back-arrow presence/absence, inline title badges, subtitle line, pager placement and
  the `Fulfill item`-in-the-rail exception all check out.
- **§2.4 the Settings surface** — the best-evidenced section in the document. Overlay inset
  (x≈4→764, top y≈34), header height, and the `nav ~300 + gutter ~26 + pane ~744 = ~1070 px centred
  block` all measure within a few px of the stated values. The 21-item settings nav order is
  reproduced **exactly**, in order, from `settings-billing-history`.
- **§3.2 the list-page toolbar** — every specific verified: tab sets per resource, the `Custom` tab
  appearing after the built-ins, search-mode replacing the tab row, the chip row ending in
  `Add filter +` with `Clear all`, `Save as` greyed vs. enabled across the two cited files, and the
  sort popover's radio-group-plus-direction-pair structure with `↓ Z–A` active.
- **§3.3 bulk selection** — header row → `3 selected` with column labels gone; bar centred **inside
  the card** (bar centre x=445 vs card centre x=448, *not* viewport centre 384); three labelled
  actions + `…`; the divider-grouped overflow; `Delete products` not red in the menu.
- **§3.6 empty states** — anatomy, the value-proposition heading, the ~372 px body measure, the
  single primary, the greyed-but-visible `Export`, and the `Learn more` link outside the card.
- **§4.3 selects, radios, checkboxes, toggles** — every cited example verified, including the
  dependency-disabled marketing checkboxes, the segmented `Discount code | Automatic discount`, the
  three radio-in-a-card rules on the discount form, the expanding payment-method radio, and the
  off-state toggle at the top right of the yearly-billing card.
- **§4.4 validation** — the disabled-until-valid before/after pairs, `(optional)` in the label with
  no asterisks anywhere, the green check + `Verified` row, and the blocking red banner disabling
  `Duplicate`/`Share`. (The modal scrim is real too — canvas goes `#EBEBEB` → `#777777`, ~50% black,
  so §1.1.1's backdrop claim holds.)
- **§5.3 modals** — header/body/right-aligned-footer anatomy, question-form destructive titles with
  object + count, verb-restating primaries, red-for-irreversible, the acknowledgement checkbox on
  uninstall, the icon-led-row informational modal, the picker modal with Cancel only, and the
  single-`Close` utility modal. Width fractions (43% / 68%) measured correct. Only the
  vertical-position sentence is wrong.
- **§5.4 popovers and menus** — the row overflow menu (text-only, `Delete` red, last, separated),
  the sort popover, the alerts popover content down to `No more alerts`, and the quick-create menu
  (7 rows, `#`+letter keycaps, chevrons, anchored **above** its trigger) are all exact.
- **§5.6 onboarding** — `1 / 11 completed` + bar, one group accordion open, expanded-task-only
  description/buttons/illustration, and the `⊘ All caught up` divider.
- **§6.1 / §6.3 Eyvar inventory** — verified line-by-line against `eyvar_ops_panel_v40_fixed.html`:
  21,857 lines, 41 `.page` divs, `:root` at L11–L21 with every token value matching;
  `.page{…background:var(--white)}` L70 (D1), `.topbar{height:50px;background:var(--white)}` L59,
  `.ph-l h1{font-size:17px;font-weight:500}` L73, `.card{border-radius:11px;border:.5px}` L88,
  `.hint{font-size:10px;color:#aaa}` L254 (D12), `table.dt th{…10px…uppercase…var(--bg2)}` L149
  (D7). Accurate throughout.

---

## 6. Coverage

**Claims checked: 55** (23 in the findings table, 11 in the mislabel table, 15 contradiction pairs,
plus 6 spot-checks that passed and are recorded under "Clean areas"). Spread: §1 — 14, §2 — 11,
§3 — 12, §4 — 8, §5 — 8, §6 — 2.

**Screenshots opened (35), all read at full size; 22 of them additionally pixel-sampled or
zoomed 4–8× on the specific region under test:**

`00-auth/login-email-filled` · `00-auth/login-password-step-empty` ·
`01-home/home-get-ready-to-sell-setup-guide-accordion` · `01-home/home-guide-side-panel-in-progress`\* ·
`02-orders/draft-order-validation-error-banner` · `02-orders/order-detail-mark-as-paid-modal`\* ·
`02-orders/order-detail-paid-fulfilled-gift-card` · `02-orders/order-detail-refunded-with-toast`\* ·
`02-orders/order-fulfill-item-page` · `02-orders/orders-list-with-metrics-row` ·
`03-products/inventory-quantities-by-variant`\* · `03-products/product-detail-created-success-banner`\* ·
`03-products/product-edit-pricing-inventory-shipping` ·
`03-products/product-edit-variant-option-name-dropdown` · `03-products/products-list-archive-confirm-modal` ·
`03-products/products-list-bulk-selection-action-bar` · `03-products/products-list-create-view-modal`\* ·
`03-products/products-list-default` · `03-products/products-list-products-imported-toast` ·
`03-products/products-list-search-and-filters` · `03-products/products-list-sort-popover` ·
`03-products/products-list-view-deleted-toast`\* ·
`04-customers/customer-erase-personal-data-modal` · `04-customers/customer-new-form-empty` ·
`04-customers/customer-segment-delete-confirm-modal`\* · `04-customers/customer-segment-templates-panel` ·
`04-customers/customer-segments-deleted-toast`\* · `04-customers/customer-segments-row-actions-menu` ·
`04-customers/customers-list-single-customer` · `05-online-store/blog-posts-list` ·
`05-online-store/navigation-add-menu-with-add-item-panel`\* ·
`06-marketing/email-app-overview-with-sent-toast`\* ·
`06-marketing/marketing-automation-template-detail-modal`\* ·
`07-analytics/analytics-dashboard-saved-toast-last-7-days` · `07-analytics/analytics-dashboard-today-no-data` ·
`08-finances/finances-overview-earnings-donut-and-payouts`\* · `09-discounts/discount-create-shipping-empty` ·
`09-discounts/discount-detail-shareable-link-modal` · `09-discounts/discounts-empty-state` ·
`09-discounts/discounts-list-with-code` · `10-settings/settings-billing-history` ·
`10-settings/settings-payments-cash-on-delivery-modal`\* ·
`10-settings/settings-plan-review-and-subscribe` · `10-settings/settings-store-details-edit-profile-modal`\* ·
`11-apps-and-channels/app-uninstall-confirm-modal`\* · `11-apps-and-channels/point-of-sale-subscription-plans` ·
`12-notifications/alerts-popover-with-channel-issue` ·
`13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts` ·
`14-global-search/search-modal-order-results-list` · `15-account/account-general-unsaved-changes`

(\* = measured/sampled programmatically rather than viewed in full, e.g. modal bounding boxes,
drawer edges, toast crops, canvas colour probes.)

**Not covered.** §7–§9 (added to the document mid-audit), the theme-editor claims in §2.5 A, the
marketing/finances/POS guidance surfaces in §5.6, and the §5.7 copy do/don't table beyond the two
strings spot-checked. A second pass should target §2.5 A and §7–§9.
