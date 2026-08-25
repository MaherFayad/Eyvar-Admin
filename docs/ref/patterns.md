# Page patterns

All 41 Eyvar pages, mapped. Source: `DESIGN.md` §6.4. **A page with no row here may not be
designed until it gets one.**

| Pages | Pattern | Governing sections |
|---|---|---|
| `drivers` `riders` `trips` `subscriptions` `corporate` `contacts` `quickrides` `plans` `zones` `audit-log` | **Index table** + view tabs + filters + bulk action bar | §3.1–3.3 |
| `applicant-detail` `corp-detail` `ticket-detail` `profile` | **Two-column detail** — main + right rail, with timeline | §2.2, §3.8 |
| `plan-edit` | **Sectioned form** + save bar + derived values | §4.1, §2.3, §8.2 |
| `settings` (21 panes) `my-account` | **Settings shell** with its own nav | §2.4 |
| `exec-overview` `dashboard` `predictive` `growth` `coverage` `commitment` `fairness` `fraud` | **Metric tiles** + chart cards | §3.7 |
| `live` | **Monitoring shell** — map + synchronised side list | §8.1 |
| `finance` `wallets` `rwallets` | **Ledger** — append-only, money formatting | §8.3 |
| `all-pending` `requests` `requests-sub-all` `requests-instant-all` `interventions` `readiness` `renewal` | **Work queue** — claim, SLA, disposition, row-level critical | §8.4 |
| `support` `compliance` `safety` | Index table → detail with timeline | §3.1, §3.8 |
| `inbox` `notifications-all` | Activity feed | §3.8 |

## The four page shapes

| Shape | When | Width |
|---|---|---|
| Single column | Simple lists, settings panes | Full for lists |
| Main + right rail | A record with a summary — detail pages | Centred, capped |
| Full-bleed editor | Breaks the frame: plan editor, bulk edit | Full viewport |
| Monitoring shell | Live map + side list (§8.1) | Full viewport |

## Pattern-specific traps

- **Ledger ≠ index table.** Rows are append-only: no row actions, no bulk selection (§8.3).
- **Work queue ≠ index table.** Items are claimed, worked, decided, and leave. Needs SLA
  display and the R5a row-critical marker — a page banner cannot express per-row critical.
- **Monitoring shell is a third layout**, not a "full-bleed editor". §2.5's rules describe
  editors — inspector panels, device previews — and none of them apply to a live map.
- **Derived values are not disabled inputs** (§8.2). The disabled treatment is reserved for
  actions that will become available (§4.6); reusing it for computed fields collides.
