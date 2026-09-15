# Eyvar Admin — system documentation

Eyvar Admin is the operations console for a ride-subscription business: riders, drivers
(captains), trips, plans, wallets, dispatch, fraud review, support and pricing. This folder
holds the rules the console is built to, the behaviour each screen owes, and the contracts
between the UI and its data.

Alongside it at the repository root sits `eyvar_ops_panel_v40_fixed.html`, the original
single-file prototype. It is the record of what each screen does and the citation source for
every claim about behaviour: grep the page id, read the render function, cite the line.

## Start here

| If you want to… | Read |
|---|---|
| Know which rule wins | [RULINGS.md](RULINGS.md) |
| Get a quick answer on tokens, states, copy, RTL, a11y or the table | [ref/](ref/) |
| Read a design rule in full | [06-design-reference/_partials/](06-design-reference/_partials/) |
| Know what a screen must do | [05-restructure/specs/](05-restructure/specs/) |
| Know how a screen must look | [05-restructure/design/](05-restructure/design/) |
| Look up one module of the prototype | [01-modules/](01-modules/) |
| Understand the data | [03-data/DATA-MODEL.md](03-data/DATA-MODEL.md) |
| See the structural census | [00-index/GROUND-TRUTH-INVENTORY.md](00-index/GROUND-TRUTH-INVENTORY.md) |
| Ask the analyst a question, from `/management/reports?view=analyst` or the `/analyst` terminal path | [09-analytics-v2/01-analyst-agent.md](09-analytics-v2/01-analyst-agent.md) §4 (what the operator sees), §9 (the terminal path) |
| Build analytics v2: the analyst agent, report builder v2, pages, alerting, the backend | [09-analytics-v2/00-README.md](09-analytics-v2/00-README.md) |

## Folder structure

```
docs/
├── README.md                     ← you are here
├── RULINGS.md                    the precedence index: which rule wins
├── ref/                          one-page answers per topic
├── 00-index/                     census, method, system overview
├── 01-modules/                   one document per module of the prototype
├── 03-data/                      data model, global state, structured JSON export
├── 04-relations/                 how modules and entities connect
├── 05-restructure/               specs and design specs for the console's screens
├── 06-design-reference/          the design rules, in partials; DESIGN.md concatenates them
├── 07-api/                       generated API contract
└── 08-i18n/                      generated string-key register
```

## Module documents

Each follows the same skeleton so any two are comparable: purpose, entry points, layout map,
data model, formulas, KPIs, displayed data, input fields, actions, tables, modals,
states/badges, cross-module links, hardcoded values, i18n, gaps, and a line-number index.

| Group | Documents |
|---|---|
| **Global** | `00a` navigation & routing · `00b` UI systems · `00c` identity, permissions & audit · `00d` i18n & localisation |
| **Executive** | `01` executive overview |
| **Intelligence** | `02a` predictive signals · `02b` fraud & risk |
| **Overview** | `03a` dashboard · `03b` work inbox · `03c` notifications · `04` live map |
| **Operations** | `05a` subscriptions · `05b` corporate accounts · `06a` all trips · `06b` quick rides & ride requests · `07a` renewal pipeline · `07b` trip readiness · `07c` requests |
| **Fleet** | `08a` drivers · `08b` driver onboarding · `09a` riders · `09b` 360° profile system · `10a` captain fairness · `10b` plan commitment · `10c` coverage & capacity · `10d` compliance · `10e` safety |
| **Growth** | `11a` promos & growth · `11b` zones |
| **Finance** | `12a` finance · `12b` driver wallets · `12c` rider wallets |
| **Support** | `13a` support center · `13b` disputes & lost/found · `13c` contact drivers · `13d` interventions |
| **Config** | `14a` pricing plans · `14b` plan editor · `15a-15k` settings (workspace & operations) · `16a-16k` settings (system) & audit log |

## Reading the annotations

| Marker | Meaning |
|---|---|
| `L1234` | Verified at that line of the prototype |
| `UNVERIFIED` | Not confirmable from the prototype; the reason is stated inline |
| `MOCK` | Hardcoded or seeded demo value, not real behaviour |
| `BUG` | Prototype behaviour contradicts apparent intent; reproduction given |

## Caveats

- **Static analysis.** The prototype is read, not executed. Runtime-only behaviour is
  inferred, and every inference is marked.
- **Seed data is fiction.** Formulas are real; the numbers they operate on are demo values.
  Record counts describe the seed, not production.
- **Citations are pinned to one file version.** Editing the prototype invalidates line
  numbers — re-run the census in [00-index/METHODOLOGY.md](00-index/METHODOLOGY.md).
