## 2. Layout & Navigation

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
