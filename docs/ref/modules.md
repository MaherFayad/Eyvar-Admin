# Module index

60 module docs in `docs/01-modules/`. Find the one that covers your feature before you
start; it is the closest thing to a product requirements document this project has.

## Cross-cutting — read these first

| Doc | Covers |
|---|---|
| `00a-global-navigation-and-routing` | The frame, nav, page routing |
| `00b-global-ui-systems` | Shared UI behaviour across pages |
| `00c-identity-permissions-and-audit` | Who may see and do what — every spec needs this |
| `00d-i18n-and-localisation` | Arabic mode, the 86 `data-i18n` keys |

## Operations

| Doc | Covers |
|---|---|
| `01-executive-overview` · `03a-dashboard` | Top-level metric surfaces |
| `02a-predictive-signals` · `02b-fraud-and-risk` | Forecasting; fraud review queue |
| `03b-work-inbox` · `03c-notifications` | Operator queues and alerts |
| `04-live-map` | Live dispatch — the monitoring shell (§8.1) |
| `10c-coverage-capacity` · `10d-compliance` · `10e-safety` | Supply and risk surfaces |
| `13d-interventions` | Operator interventions |

## Supply — drivers and riders

| Doc | Covers |
|---|---|
| `08a-drivers` · `08b-driver-onboarding-applicants` | Driver index, applicant pipeline |
| `09a-riders` · `09b-360-profile-system` | Rider index, the 360 profile |
| `10a-captain-fairness` · `10b-plan-commitment` | Allocation fairness, commitments |
| `13c-contact-drivers` | Outreach |

## Demand — trips and subscriptions

| Doc | Covers |
|---|---|
| `05a-subscriptions` · `05b-corporate-accounts` | Subscription and B2B accounts |
| `06a-all-trips` · `06b-quick-rides-and-ride-requests` | Trip records, ad-hoc rides |
| `07a-renewal-pipeline` · `07b-trip-readiness` · `07c-requests` | Renewal, readiness, request queues |

## Money

| Doc | Covers |
|---|---|
| `12a-finance` · `12b-driver-wallets` · `12c-rider-wallets` | Ledgers (§8.3) |
| `14a-pricing-plans` · `14b-plan-editor` | Plans; the editor with derived values (§8.2) |
| `11a-promos-and-growth` · `11b-zones` | Promotions, geography |

## Support

| Doc | Covers |
|---|---|
| `13a-support-center-tickets` · `13b-disputes-and-lost-found` | Tickets, disputes |

## Settings — 21 panes

`15-settings-shell` is the container. Then: `15a` general · `15b` team roles · `15c`
permissions · `15d` notifications · `15e` security · `15f` dispatch · `15g` cities · `15h`
gateways · `15i` limits · `15j` cancellation policy · `15k` reason codes & SLA · `16a`
branding · `16b` data integrity · `16c` legal consent · `16d` emails · `16e` push · `16f`
export · `16g` pricing windows · `16h` ledger · `16i` rota & on-call · `16j` activity ·
`16k` audit log.

## Also

- `docs/00-index/GROUND-TRUTH-INVENTORY.md` — 41 pages, 621 ids, 1,042 functions,
  mechanically extracted. Use it to find the page id, then grep the legacy file.
- `docs/00-index/METHODOLOGY.md` — how the module docs were produced and audited.
