# Eyvar Ops Panel — System Documentation

Complete reverse-engineered specification of `eyvar_ops_panel_v40_fixed.html`,
a 21,857-line single-file operations panel for a ride-subscription business.

Everything here was derived from the source file itself. No behaviour is
assumed; every claim carries a line citation, and anything that could not be
confirmed is marked `UNVERIFIED` rather than guessed.

## Start here

| If you want to… | Read |
|---|---|
| Understand how this was produced | [00-index/METHODOLOGY.md](00-index/METHODOLOGY.md) |
| See the raw structural census | [00-index/GROUND-TRUTH-INVENTORY.md](00-index/GROUND-TRUTH-INVENTORY.md) |
| Understand the data | [03-data/DATA-MODEL.md](03-data/DATA-MODEL.md) |
| Look up one screen | [01-modules/](01-modules/) |
| See what's broken | [02-verification/](02-verification/) |
| See the proposed rebuild | [05-restructure/](05-restructure/) |

## What the system is

| | |
|---|---|
| Form | One HTML file. No build step, no framework, no backend. |
| State | A single global `DB` object literal at `L2566`, plus collections assigned later |
| Rendering | String concatenation into `innerHTML`, ~136 `render*()` functions |
| Navigation | `window.go(id, el, isBack)` at `L8774` — show/hide `.page` divs |
| Scale | 41 pages · 21 settings sub-tabs · 1,042 functions · 355 click handlers |
| Domain | Ride subscriptions: riders, drivers (captains), trips, plans, wallets, dispatch, support |

Because all state and all logic live in one file, **the file is the complete
specification** — there is no hidden API. That is what made exhaustive
documentation possible, and it is also the system's central architectural
problem.

## Folder structure

```
docs/
├── README.md                     ← you are here
├── 00-index/
│   ├── METHODOLOGY.md            how the docs were produced & verified
│   └── GROUND-TRUTH-INVENTORY.md machine-extracted census (the audit baseline)
├── 01-modules/                   one document per module/tab — the bulk of the work
├── 02-verification/              two independent review passes + findings register
├── 03-data/                      data model, global state, structured JSON export
├── 04-relations/                 how modules and entities connect
└── 05-restructure/               proposed 5-tab information architecture
```

## Module documents

Each follows the same skeleton so any two are comparable: purpose, entry points,
layout map, data model, formulas, KPIs, displayed data, input fields, actions,
tables, modals, states/badges, cross-module links, hardcoded values, i18n, gaps,
and a line-number index.

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
| `L1234` | Verified at that line of the source file |
| `UNVERIFIED` | Not confirmable from source; the reason is stated inline |
| `MOCK` | Hardcoded / seeded demo value, not real behaviour |
| `BUG` | Source behaviour contradicts apparent intent; reproduction given |

## Caveats

- **Static analysis.** The panel was read, not executed. Runtime-only behaviour
  is inferred and marked where inference was needed.
- **Seed data is fiction.** Formulas are real; the numbers they operate on are
  demo values. Record counts describe the seed, not production.
- **Citations are pinned to this file version.** Editing the source invalidates
  line numbers — re-run the census in `METHODOLOGY.md` after changes.
