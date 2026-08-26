## 5. Feedback, Overlays & Voice

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
