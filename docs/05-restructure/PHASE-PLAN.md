> **Historical.** The phased build this plan sequenced is complete. The current phase and
> the parallelism rules that still apply are in `CLAUDE.md` at the repo root.

# Build plan

Rebuilding Eyvar Admin (41 pages) as React + TypeScript + Vite + Tailwind v4 + shadcn/ui.

## Phase 0 — Foundations

Nothing in Phase 1 can start until Phase 0 lands, because Phase 1 runs many agents in
parallel and they must never touch the same file.

| Step | Owner | Output |
|---|---|---|
| 0.1 | product-owner | Foundation spec: navigation model, layout shell, the component inventory the whole app needs |
| 0.2 | product-designer | Design spec: two-level navigation, page shells, table anatomy, form anatomy, the restyle rules per primitive |
| 0.3 | frontend-engineer | Vite + Tailwind v4 + `shadcn init` (`rtl: true`), `globals.css` with the `--ev-*` layer |
| 0.4 | frontend-engineer | **Add every shadcn primitive the app will ever need, in one pass**, and restyle each. **`sidebar` is not one of them** — the rail and sub-tab column are built (design spec §1.4, Q6 closed). Q5 — whether `chart` themes entirely to `--ev-*` — must close here; 8 sub-tabs depend on it |
| 0.5 | utilities-engineer | `useAsync`, `useIndexTable`, `useFilters`, `formatMoney`, `formatDate`, SLA helpers |
| 0.6 | mock-data-engineer | The client seam, `config.ts`, `Paginated<T>`, failure injection |
| 0.7 | frontend-engineer | App shell: rail + module nav + routing, `AppLayout`, `PageHeader`, `EmptyState`, `ErrorState`, `Skeleton`, `Banner`, `DataTable` |
| 0.8 | visual-qa + qa | Verdicts on the shell before a single module is built |

**0.4 is the load-bearing step.** `shadcn add` mutates `components.json` and writes into
`src/components/ui/`. If parallel agents run it in Phase 1 they will corrupt each other.
Every primitive gets added once, here, by one agent. Phase 1 agents may **never** run the
CLI.

## Phase 1 — Sub-tabs

Per **D1**, the product is 5 workspaces / 34 sub-tabs. **The unit of work is a sub-tab,
not a page** — seven sub-tabs absorb up to five legacy pages each (merge register
`specs/00-foundation.md` §3.6), so one-engineer-per-page no longer describes anything real.

Waves run in order. Inside a wave, every sub-tab runs in parallel.

| Wave | Sub-tabs | Proves | Why here |
|---:|---|---|---|
| 1 | Operations › **People**, **Trips**, **Subscriptions**, **Corporate Accounts** | Index table + two-column detail + timeline | The most reused shapes. People is also the widest merge (5 legacy pages) — build it first while the shell is still soft. |
| 2 | Operations › **Requests**, **Trip Assurance**, **My Work** · Support › **Safety & Incidents**, **Captain Fairness** | Work queue §8.4 — claim, SLA, disposition, the R5a row marker | New pattern. Get it right once, five surfaces inherit it. |
| 3 | Financials × 7 | Ledger §8.3 + derived values §8.2 | Append-only rows, money formatting, the plan editor's computed fields |
| 4 | Management × 5 · Operations › **Overview** · Support › **Overview** · Admin › **Overview** | Metric tiles + chart cards §3.7 | Read-only surfaces; safe to fan out wide |
| 5 | Support › **Tickets**, **Disputes & Claims**, **Contact Centre** | Index → detail with timeline | Reuses wave 1 shapes |
| 6 | Operations › **Live Dispatch** | Monitoring shell §8.1 | Hardest and most novel. Build it when every other pattern is settled. |
| 7 | Admin × 7 (21 panes collapsed) | Settings shell §2.4 | Repetitive and low-risk — the widest fan-out of all |

Shell layers (`profile`, `notifications-all`, `my-account`) are built in Phase 0.7, not
here — they are reachable from every workspace and belong to the shell.

## Parallelism rules

**Safe to run at the same time:**
- One frontend-engineer **per sub-tab**. Never two on one sub-tab.
- product-designer for wave N+1 while engineers build wave N.
- mock-data-engineer for wave N+1 while engineers build wave N.
- qa-engineer and visual-qa-engineer per sub-tab, after that sub-tab is built.

**Never parallel — single owner, serialized:**

| File | Owner | Rule |
|---|---|---|
| `components.json` | Phase 0 only | Frozen after 0.4. No `shadcn add` in Phase 1. |
| `src/components/ui/*` | Phase 0 only | Restyled once. A Phase 1 change is a request to the shell owner. |
| `src/styles/globals.css` | utilities-engineer | Token additions go through one agent, one at a time. |
| `src/routes.tsx` | shell owner | Engineers declare their route; the owner merges. |
| `src/hooks/*`, `src/lib/*` | utilities-engineer | Engineers request, never write. |
| `src/data/clients/*` | mock-data-engineer | One file per resource — safe in parallel *across* resources. |
| `src/shell/*` | shell owner | Built in 0.7. **Its tests live beside it**, not in another layer's suite. |

**Layering: `src/data` must never import `src/shell`.** Data does not know the shell exists — not in source, and not in tests. A shell rule gets tested in `src/shell`, importing the fixture from `src/data`; the reverse direction is a defect. *(Recorded after 0.6: with `src/shell` carrying no tests at all, the mock-data-engineer covered the Q12 badge gate from the data suite rather than leave it uncovered — the right call at the time, and moved to `src/shell/navBadges.test.ts` in 0.7.)*

**A sub-tab is the safe unit of parallel work** because it owns exactly one directory:
`src/screens/<workspace>/<sub-tab>/`. If a task needs to edit outside that directory, it
is not parallel-safe — hand it to the owner.

**A merged sub-tab carries the union of its patterns, not one of them.** Operations ›
People is an index table *and* a work queue *and* a two-column detail, on one route
(`specs/00-foundation.md` §5.1). Do not scope a merged sub-tab as though it were a single
shape.

## Handoff protocol

Every handoff is **an artifact plus a message**. The artifact is the contract; the message
is the notification.

1. Write your artifact to its documented path.
2. `SendMessage` the next role: what you finished, the artifact path, anything they must
   decide, and anything you could not resolve.
3. If you are blocked, message the owner of the blocker and say what is blocked. Do not
   work around it, and do not invent the missing decision.

A message without an artifact is not a handoff. An artifact nobody was told about is not
a handoff either.

## Closed — navigation deviation

**Done.** The two-level navigation replaced `DESIGN.md` §6.2 **D-4** outright (it names the
six §2.1 clauses it suspends), settings became sanctioned **D-5** and §6.3 defect **D3** was
reclassified to point at it, and §6.4's `fraud` row moved from Work queue to Metric tiles.
`DESIGN.md` was rebuilt from the partials — 5,761 lines, 73 internal links and 210
screenshot citations, none broken. `docs/ref/patterns.md` and `docs/ref/defects.md` follow.

## Amended after 0.2 — three acceptance criteria

The design spec found three criteria in `specs/00-foundation.md` that could not be built as
written. All three are now amended in place, each carrying its reason:

- **AC-67** — required a focus trap on the shell layers. §7.3.3 forbids a trap without a
  scrim and §5.5 forbids the scrim; §7 outranks an AC. Focus moves in, does not trap.
- **AC-72** — required toasts to enter from the mirrored edge. The toast region is
  centre-anchored (the fix for D7), so there is no horizontal direction to flip. The
  legacy `translateX(28px)` is **deleted, not negated**; shell layers still mirror.
- **AC-64** and §3.9 — required the disclosure to be both "in the rail" and "in the tab
  order in the column's place". It sits in the rail between the four tiles and Admin, where
  visual order = DOM order = tab order.
