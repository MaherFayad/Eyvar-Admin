# Shopify Admin — Desktop Web Design Reference

Screenshots of the Shopify admin (desktop web) pulled from Mobbin via the Mobbin MCP
connector, organised by admin surface. Every file is a real Shopify admin screen,
named after the page **and** the specific state it captures (default, empty, error,
modal open, toast, bulk-select, etc.) so states can be compared side by side.

- Format: `.webp`, 768px wide, Mobbin watermark strip at the bottom.
- Naming: `<surface>-<page>-<state>.webp`, kebab-case.
- `manifest.tsv` is the download index (`slug`, `folder`, `name`); `download.sh`
  re-fetches anything missing and skips what is already on disk.

## Folders

### `00-auth` — 16 screens

- forgot-password-request-reset
- login-email-filled
- login-email-validation-error
- login-email-verified-banner
- login-email-with-social-providers
- login-password-reset-success-banner
- login-password-step-empty
- login-password-step-filled
- login-reset-link-sent-banner
- login-two-factor-authenticator-code
- login-two-factor-code-entered
- oauth-choose-an-account
- reset-password-new-password-form
- reset-password-strength-meter
- signup-choose-provider
- signup-create-account-email-password

### `01-home` — 7 screens

- home-get-ready-to-sell-setup-guide-accordion
- home-guide-side-panel-in-progress
- home-sales-chart-and-things-to-do-next
- home-send-feedback-and-magic-cards
- home-setup-guide-first-10-sales-expanded
- home-setup-guide-side-panel-completed
- home-setup-guide-with-trial-started-toast

### `02-orders` — 19 screens

- draft-order-add-discount-modal-empty
- draft-order-add-discount-modal-filled
- draft-order-add-notes-modal
- draft-order-create-order-page
- draft-order-validation-error-banner
- order-detail-collect-payment-dropdown
- order-detail-items-fulfilled-toast
- order-detail-mark-as-paid-modal
- order-detail-more-actions-menu
- order-detail-paid-fulfilled-gift-card
- order-detail-refunded-with-toast
- order-detail-timeline-comment-composer
- order-detail-timeline-comment-with-attachment
- order-detail-timeline-full-history
- order-detail-timeline-uploading-attachment
- order-detail-unfulfilled-payment-pending
- order-fulfill-item-page
- orders-list-search-mode-add-filter
- orders-list-with-metrics-row

### `03-products` — 36 screens

- inventory-quantities-by-variant
- product-add-new-blank-form
- product-detail-created-success-banner
- product-detail-sample-product-with-setup-guide
- product-detail-setup-guide-add-first-product
- product-detail-setup-guide-mark-as-done
- product-detail-setup-guide-sharing-details
- product-edit-bulk-edit-prices-modal
- product-edit-media-and-pricing
- product-edit-media-gallery-with-video
- product-edit-media-pricing-with-category
- product-edit-multiple-option-values
- product-edit-pricing-inventory-shipping
- product-edit-seo-listing-and-empty-variants
- product-edit-single-variant-row
- product-edit-variant-detail-modal
- product-edit-variant-option-name-dropdown
- product-edit-variant-option-values
- product-edit-variants-bulk-actions-menu
- product-edit-variants-matrix-table
- products-bulk-editor-grid
- products-bulk-editor-price-columns
- products-bulk-editor-status-dropdown
- products-list-archive-confirm-modal
- products-list-bulk-more-actions-menu-alt
- products-list-bulk-more-actions-menu
- products-list-bulk-selection-action-bar
- products-list-create-view-modal
- products-list-default
- products-list-draft-tab-create-view-tooltip
- products-list-products-imported-toast
- products-list-search-and-filters
- products-list-single-product
- products-list-sort-popover
- products-list-view-deleted-toast
- purchase-orders-list

### `04-customers` — 18 screens

- customer-detail-erasure-request-banner
- customer-detail-no-orders-yet
- customer-erase-personal-data-modal
- customer-merge-find-customer
- customer-merge-review-merged-record
- customer-new-form-address-tax-notes
- customer-new-form-empty
- customer-new-form-filled
- customer-request-data-modal
- customer-segment-delete-confirm-modal
- customer-segment-new-query-editor
- customer-segment-templates-panel
- customer-segments-deleted-toast
- customer-segments-list-default-templates
- customer-segments-list
- customer-segments-row-actions-menu
- customers-empty-state
- customers-list-single-customer

### `05-online-store` — 11 screens

- blog-posts-list
- navigation-add-menu-with-add-item-panel
- theme-editor-color-scheme-picker
- theme-editor-color-scheme-tokens
- theme-editor-home-page-section-tree
- theme-editor-live-preview-desktop
- theme-editor-product-template-mobile-preview
- theme-editor-section-selected-image-banner
- theme-editor-template-picker-products
- theme-editor-template-picker
- themes-connect-github-repository-panel

### `06-marketing` — 7 screens

- email-app-overview-campaigns-table
- email-app-overview-with-sent-toast
- marketing-automation-template-detail-modal
- marketing-automation-templates-gallery
- marketing-automations-overview
- marketing-build-campaign-activity-modal
- marketing-email-campaign-schedule-send-modal

### `07-analytics` — 6 screens

- analytics-customize-dragging-metric-card
- analytics-customize-metrics-library-sidebar
- analytics-dashboard-saved-toast-last-7-days
- analytics-dashboard-today-no-data
- analytics-date-range-picker-calendar
- analytics-live-view-globe-map

### `08-finances` — 2 screens

- finances-get-started-tasks-checklist
- finances-overview-earnings-donut-and-payouts

### `09-discounts` — 9 screens

- discount-create-combinations-and-usage-limits
- discount-create-eligibility-and-active-dates
- discount-create-shipping-empty
- discount-create-shipping-with-code
- discount-detail-promote-menu
- discount-detail-shareable-link-modal
- discount-select-type-modal
- discounts-empty-state
- discounts-list-with-code

### `10-settings` — 12 screens

- settings-billing-cycle-detail
- settings-billing-history
- settings-billing-overview-bills-and-credits
- settings-payments-cash-on-delivery-modal
- settings-payments-manual-methods-cod-activated
- settings-payments-setup-shopify-payments-modal
- settings-payments-submit-business-information
- settings-plan-review-and-subscribe
- settings-store-details-edit-profile-modal-edited
- settings-store-details-edit-profile-modal
- settings-store-details-saved-toast
- settings-subscribed-add-business-address

### `11-apps-and-channels` — 7 screens

- app-detail-permissions-and-uninstall
- app-detail-shop-channel-needs-attention
- app-install-permissions-consent
- app-uninstall-confirm-modal
- apps-and-sales-channels-installed-list
- point-of-sale-quick-start-guide
- point-of-sale-subscription-plans

### `12-notifications` — 1 screens

- alerts-popover-with-channel-issue

### `13-navigation-shortcuts` — 1 screens

- quick-create-menu-with-keyboard-shortcuts

### `14-global-search` — 3 screens

- search-modal-order-results-list
- search-modal-scoped-to-apps
- search-modal-scoped-to-orders-empty

### `15-account` — 4 screens

- account-general-unsaved-changes
- account-general-updated-banner
- account-general-verification-email-sent
- store-deactivated-reopen-page

## Coverage notes

Complete for: auth, home/setup guide, orders + draft orders, products (list, editor,
variants, bulk editor, inventory), customers + segments, discounts, marketing/email,
analytics, theme editor, settings (store details, plan, billing, payments), apps and
sales channels, account-level pages.

Not yet captured — the Mobbin connector dropped mid-sweep:
collections, gift cards, content/files + metaobjects, transfers, shipping labels,
abandoned checkouts, checkout editor, markets, domains, locations, taxes and duties,
notifications templates, custom data/metafields, policies, store activity log,
online store Pages (CMS) and Preferences.

Re-run those queries against `search_screens` (platform `web`) once the connector is
back, append rows to `manifest.tsv`, then run `bash download.sh`.
