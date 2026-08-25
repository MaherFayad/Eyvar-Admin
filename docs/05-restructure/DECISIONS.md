# Decisions

Binding choices made by the business owner. Each supersedes any earlier proposal in the
repo. Do not re-litigate one in a spec or a review — if it is wrong, change it here.

---

## D1 — Information architecture: 5 workspaces, 34 sub-tabs

**Decided.** The rail adopts `PROPOSED-STRUCTURE.md` as written: five workspaces —
Management · Operations · Financials · Customer Support · Admin — with 34 sub-tabs
beneath them.

Supersedes the 10-module / 41-page taxonomy in the first draft of
`specs/00-foundation.md` §3, which is being revised.

**Consequences accepted:**
- Seven page merges are real product work, not renames. Each needs its scope specified
  before its sub-tab can be built.
- Five page specs change scope substantially: `requests`, `subscriptions`, `readiness`,
  `drivers`, `trips`.
- `interventions` is retired, per the proposal. Its surviving card moves to Live Dispatch.
- Four settings tabs — Payment Gateways, Ledger, Pricing & rate card, Cancellation
  Policy — move out of Admin into Financials.
- `profile` (360°) and `notifications-all` stop being tabs and become shell layers
  reachable from every workspace.
- The 11 pages that currently have no nav entry all gain one. Zero unreachable pages.

**Scope of this decision — read this before citing D1.** D1 adopts the
`PROPOSED-STRUCTURE.md` **information architecture**: the five workspaces, the 34
sub-tabs, the merges, the retirement, the shell layers. It does **not** adopt that
document's organisational recommendations. Its §10.4 (two new roles, `Trust & Safety` and
`Dispatcher`) and §10.5 (splitting `manage_settings` into three permission keys) are a
separate decision — see **D4**.

**Why:** five rail items is a switcher; ten is a list. The proposal was authored by the
business owner against the same census this rebuild uses, and it organises the product by
the job someone is paid to do rather than by how the software was built.

---

## D2 — Minimum viewport: 1280px

**Decided.** The console must work at 1280px wide. Below that is out of scope.

**Consequences accepted:**
- The level-2 page list needs a collapse affordance; it cannot be permanently open at
  1280.
- Detail pages may drop the right rail below a breakpoint — the breakpoint is the
  designer's to set, and it must be one number used everywhere.
  **Set in 0.2: `--ev-bp-wide: 1344px`.** One token, one media query, three uses — the
  sub-tab list's first-run default, the detail right-rail drop, and the metric-tile grid.
  Chosen because a 1366-class laptop reports 1349–1351 CSS px once a scrollbar is
  subtracted, so 1344 keeps it on the wide side where 1360 would not; and it sits on the
  4/8/16 px grids. Recorded honestly (design spec F-4): geometry does **not** force the
  rail drop — a 2:1 detail fits at 1280 with both nav columns open — so the rail restacks
  in a band where it would still fit. That is the price of one number. **Nobody adds a
  second breakpoint to soften it.**
- Both states are real states: every screen is reviewed at 1280 and at 1440+.

---

## D3 — Stack

**Decided** earlier, recorded here for completeness. React + TypeScript + Vite ·
Tailwind v4 · shadcn/ui · TanStack Table · Vitest + Testing Library · Playwright.
Rationale and the trade accepted are in `DESIGN.md` §6.6.

---

## D4 — Role model — **OPEN, needed before 0.7**

`PROPOSED-STRUCTURE.md` §10.4 proposes two roles that do not exist today —
`Trust & Safety` and `Dispatcher` — and §10.5 proposes splitting `manage_settings` into
three permission keys. Its own §10.3 visibility matrix and §13.1 R5 both assume all of
this exists.

**This touches the shell, not one screen:** role membership decides which workspace tiles
render at all. The shell (0.7) cannot be finished without an answer.

It also has teeth beyond navigation. Admin › Operational Policy exists so an Ops Manager
can widen the dispatch radius during a supply shortage without waking the founder — and
that is impossible while a single key gates 39 of 131 permission guards and one person
holds it.

**Options:**
1. Adopt the recommendations — two new roles, three settings keys.
2. Keep today's roles; the visibility matrix collapses to what today's roles can express.
3. Adopt the settings split only, defer the new roles.

Until answered, the shell renders workspace tiles from today's role set and the two
proposed roles are absent.
