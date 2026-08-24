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
