## 3. Data Display

> ### ⚠ D7 — this section is PROVENANCE, not authority
>
> `DECISIONS.md` **D7** replaced the **visual** reference. Navattic governs colour, spacing,
> radii, borders, the type scale, page organisation, nav treatment, card treatment and table
> style. **Everything visual below describes Shopify and no longer describes what Eyvar
> ships.**
>
> The screenshot citations are **kept on purpose**: they are what makes the derivation
> auditable — open the cited frame and you can check what the analyst saw. **They may not be
> cited to settle what Eyvar ships.** For that, read
> `docs/05-restructure/design/03-navattic-language.md`, whose §1 holds the complete token set
> with every value's measurement or derivation.
>
> What still binds from this section is **structure** — what a page is made of, what goes in
> a header, what a state is for — and only where §6 adopts it. Every pixel figure was already
> non-binding under **R13**; under D7 it is non-binding twice over.


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
