# Table sort and filter — the sweep, and what it deliberately left alone

Every `DataColumn` in the product was checked against what its client's
`QueryShape` can actually order and count. This records the result, the three
kinds of column that are correctly not sortable, and the two scripts that keep
it true.

## What makes a column sortable

Three things have to line up, and only one of them is visible in the screen:

| layer | file | says |
|---|---|---|
| the column | `src/screens/…` | `sortField: 'x'` — presence means sortable (`columns.ts` §15) |
| the shape | `src/data/clients/…` | `sortable: { x: (r) => r.x }` — how to read the value |
| the engine | `src/data/mock/query.ts` | `sortRows` looks `x` up and **throws** if it is not there |

That third line is why a sweep like this is worth doing mechanically.
`sortField` is a string; nothing type-checks it against the shape, and a
mismatch is not a silent no-op — it is `Unknown sort field "x"` thrown at the
first operator who opens that column's menu.

Filtering is the same shape one column over: `filter: { … }` on the column,
`facetable: ['x']` on the shape for a select's counts.

## The result

282 columns across 28 column sets.

**Closed by this sweep**

- **28 columns** gained `sortField`, backed by **27 new accessors** in nine
  client shapes.
- **5 columns** gained a filter — Tickets `status`, `priority` and `category`,
  Corporate Accounts `status` and `billingType`. All five had a facetable field
  and said nothing, so those two screens had no column filter at all.
- **2 latent crashes**: `SubscriptionsScreen` and `TripsScreen` both declared
  `sortField: 'id'` and `sortField: 'status'` against shapes with neither.
  Sorting by ID on either screen threw. Both shapes now carry the accessors.
- **1 inert sort**: Revenue › by plan declared six sortable columns and its
  read — `listRevenueByPlan(period)` — takes no query at all, so the menu
  opened, the caret moved and the rows did not. It sorts in the screen now;
  six rows, no pagination, nothing a query engine would add.

**Left alone, on purpose**

*47 derived or composite cells.* A column whose id names no field on the row:
an `Identity` cell that renders a name over a route, an action column, a
computed deviation. There is nothing to order by that the row carries.

*Two multi-value fields.* `ApiKey.scopes` is a permission set and
`SafetyIncident.protocol` is a checklist. A set has no order, and sorting one
means picking a rule — first element? length? — that the column does not
otherwise imply. Left undeclared rather than answered arbitrarily.

*84 columns in tables with no query behind them.* Eleven surfaces read a plain
array rather than a paged, filtered resource:

```
admin/activity/AdminActivityScreen   admin/policy/ReasonCodesCard
entity/RiderMovementsTable           financials/ledger/LedgerControlsScreen
financials/pricing/PricingScreen     financials/shared/LedgerCard
financials/revenue/RevenueScreen     reports/AlertHistoryDialog
reports/AlertsView                   reports/DashboardsView
reports/ReportLibrary
```

Two of these are ledgers, and a ledger is **not user-sortable by ruling** —
AC-48 / §8.3.3, oldest-first by posting date, and `useIndexTable`'s `ledger`
mode has no `sort` to give. The rest are card-shaped summaries. Giving them
sorting means giving them a query first; Revenue › by plan shows the cheaper
alternative where the whole result is already in memory.

## Keeping it true

```
node scratch/table-audit.mjs      # every column, its sort and its filter
node scratch/table-gaps.mjs       # the gaps, classified by what closing one costs
node scratch/sortfield-check.mjs  # every sortField resolves — exits 1 if not
```

The third is the one to wire into CI. It is the only check standing between a
one-character typo in a `sortField` and a thrown read, and it runs in under a
second.
