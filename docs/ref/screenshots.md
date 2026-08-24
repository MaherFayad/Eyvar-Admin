# Reference screenshots

159 real Shopify admin captures in `docs/06-design-reference/shopify-admin-web/`.
`.webp` — the Read tool renders them. **Ignore the Mobbin watermark strip** at the bottom
of every image; it is not product UI.

## Where to look

| Building | Folder | Good files to start from |
|---|---|---|
| Index table, filters, bulk actions | `03-products/` (36) | `products-list-default`, `products-list-bulk-selection-action-bar`, `products-list-search-and-filters`, `products-list-sort-popover` |
| Detail page + timeline | `02-orders/` (19) | `order-detail-paid-fulfilled-gift-card`, `order-detail-timeline-comment-composer` |
| Sectioned form | `09-discounts/` (9) | `discount-create-shipping-empty`, `discount-create-eligibility-and-active-dates` |
| Form with description column | `04-customers/` (18) | `customer-new-form-filled`, `customer-new-form-address-tax-notes` |
| Empty states | | `customers-empty-state`, `discounts-empty-state` |
| Settings shell | `10-settings/` (12) | `settings-billing-history`, `settings-store-details-edit-profile-modal` |
| Metrics + charts | `07-analytics/` (6) | `analytics-dashboard-today-no-data`, `analytics-customize-metrics-library-sidebar` |
| Auth, focus + error states | `00-auth/` (16) | `login-email-validation-error`, `login-two-factor-code-entered` |
| Full-bleed editor | `05-online-store/` (11) | `theme-editor-home-page-section-tree`, `theme-editor-color-scheme-picker` |
| Modals | any | `products-list-archive-confirm-modal`, `customer-erase-personal-data-modal`, `discount-select-type-modal` |
| Toasts | any | `products-list-products-imported-toast`, `settings-store-details-saved-toast` |
| Banners | any | `product-detail-created-success-banner`, `customer-detail-erasure-request-banner`, `draft-order-validation-error-banner` |
| Drawers | any | `customer-segment-templates-panel`, `navigation-add-menu-with-add-item-panel` |
| Popovers / menus | any | `order-detail-more-actions-menu`, `customer-segments-row-actions-menu` |
| Save bar | any | `account-general-unsaved-changes`, `product-edit-seo-listing-and-empty-variants` |

Remaining folders: `01-home` (7), `06-marketing` (7), `08-finances` (2),
`11-apps-and-channels` (7), `12-notifications` (1), `13-navigation-shortcuts` (1),
`14-global-search` (3), `15-account` (4).

Filenames say the state, not just the page — `-empty`, `-toast`, `-modal`, `-menu`,
`-error`, `-bulk-`. Grep the folder for the state you need.

## How to use them

Compare **structure**, not pixels. Eyvar is denser by sanctioned deviation D-2, and R13
voids every pixel figure derived from these images. What you are checking: where actions
sit, what the page header carries, how the card hierarchy reads, which surface a thing
opens in.

Cite the file when a design decision came from one.

## What is missing

15 areas were never captured — the Mobbin connector dropped mid-sweep: collections, gift
cards, content/files, transfers, shipping labels, abandoned checkouts, checkout editor,
markets, domains, locations, taxes, custom data, policies, activity log, CMS pages. If
your pattern is only in that list, you have no reference — say so rather than guessing.
