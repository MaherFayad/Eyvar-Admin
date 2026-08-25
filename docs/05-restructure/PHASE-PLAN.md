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
| 0.4 | frontend-engineer | **Add every shadcn primitive the app will ever need, in one pass**, and restyle each |
| 0.5 | utilities-engineer | `useAsync`, `useIndexTable`, `useFilters`, `formatMoney`, `formatDate`, SLA helpers |
| 0.6 | mock-data-engineer | The client seam, `config.ts`, `Paginated<T>`, failure injection |
| 0.7 | frontend-engineer | App shell: rail + module nav + routing, `AppLayout`, `PageHeader`, `EmptyState`, `ErrorState`, `Skeleton`, `Banner`, `DataTable` |
| 0.8 | visual-qa + qa | Verdicts on the shell before a single module is built |

**0.4 is the load-bearing step.** `shadcn add` mutates `components.json` and writes into
`src/components/ui/`. If parallel agents run it in Phase 1 they will corrupt each other.
Every primitive gets added once, here, by one agent. Phase 1 agents may **never** run the
CLI.

## Phase 1 — Modules

One module at a time. Inside a module, pages run in parallel.

Order (dependency and risk first):

| # | Module | Pages | Why here |
|---|---|---|---|
| 1 | Supply | `drivers` `riders` `applicant-detail` `profile` | Proves index + detail + timeline. The most reused shapes. |
| 2 | Demand | `trips` `quickrides` `subscriptions` `corporate` `corp-detail` | Same shapes, wider data |
| 3 | Queues | `fraud` `all-pending` `requests` ×2 `interventions` `readiness` `renewal` | §8.4 — new pattern, needs the R5a marker |
| 4 | Money | `finance` `wallets` `rwallets` `plans` `plan-edit` | §8.3 ledger + §8.2 derived values |
| 5 | Overview | `exec-overview` `dashboard` `predictive` `growth` `coverage` `commitment` `fairness` | §3.7 metric tiles |
| 6 | Live | `live` | §8.1 monitoring shell — hardest, most novel |
| 7 | Support | `support` `ticket-detail` `compliance` `safety` `contacts` `inbox` `notifications-all` | Index → detail → feed |
| 8 | Settings | 21 panes + `my-account` + `audit-log` | Repetitive, safe to fan out widest |

## Parallelism rules

**Safe to run at the same time:**
- One frontend-engineer **per page**. Never two on one page.
- product-designer for module N+1 while engineers build module N.
- mock-data-engineer for module N+1 while engineers build module N.
- qa-engineer and visual-qa-engineer per page, after that page is built.

**Never parallel — single owner, serialized:**

| File | Owner | Rule |
|---|---|---|
| `components.json` | Phase 0 only | Frozen after 0.4. No `shadcn add` in Phase 1. |
| `src/components/ui/*` | Phase 0 only | Restyled once. A Phase 1 change is a request to the shell owner. |
| `src/styles/globals.css` | utilities-engineer | Token additions go through one agent, one at a time. |
| `src/routes.tsx` | shell owner | Engineers declare their route; the owner merges. |
| `src/hooks/*`, `src/lib/*` | utilities-engineer | Engineers request, never write. |
| `src/data/clients/*` | mock-data-engineer | One file per resource — safe in parallel *across* resources. |

**A page is a safe unit of parallel work** because it owns exactly one directory:
`src/screens/<Module>/<Screen>/`. If a task needs to edit outside that directory, it is
not parallel-safe — hand it to the owner instead.

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

## Open item — navigation deviation

The two-level navigation (module rail + page list) **replaces** `DESIGN.md` §6.2 D-4
(hover-expanding icon rail). D-4 must be rewritten, not merely supplemented, and the new
entry must name the rules it suspends (§2.1 fixed nav, §2.6 no breadcrumbs interaction).
product-designer proposes the wording in 0.2; it is recorded in the partial and
`DESIGN.md` is rebuilt before 0.7 ships.
