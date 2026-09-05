# 00 — Foundation: navigation model, application shell, shared vocabulary

> **Phase 0, step 0.1.** Owner: product-owner. Consumers: product-designer (0.2),
> frontend-engineer (0.3, 0.4, 0.7), utilities-engineer (0.5), mock-data-engineer (0.6),
> qa + visual-qa (0.8).
>
> **Revision 2** — rewritten against `docs/05-restructure/DECISIONS.md` **D1** (5 workspaces,
> 34 sub-tabs) and **D2** (1280 px minimum viewport). Revision 1's 10-module / 41-page taxonomy
> is superseded and must not be cited. §5, §6, §7 and §13 are unchanged from revision 1.
>
> This is not a screen spec. It is the contract every one of the 34 sub-tab specs inherits.
> Where a later spec disagrees with this document, this document wins until it is amended here.
>
> **Line citations** are `eyvar_ops_panel_v40_fixed.html:<line>` unless another file is named.

---

## 1. Problem

An Eyvar operator today opens a console whose entire structure is a single scrolling rail of
**30 nav items in 9 sections** (`:486`–`:546`), sitting above **41 pages** — so **11 pages have no
nav entry at all** (`GROUND-TRUTH-INVENTORY.md` §B.1), one of which (`interventions`) is reachable
only from the developer console because no `go('interventions')` call exists in 21,857 lines. One of
those 30 items, `settings`, opens a page containing **21 further panes** (`GROUND-TRUTH-INVENTORY.md`
§Q), giving **62 destinations behind one flat list**. The list is organised by how the software was
built, not by the job anyone is paid to do: four sidebar sections are worked by the same person in
the same shift, while Finance's three pages and 21 config panes are opened by a different person
once a week.

There is no URL. `location.hash`, `history.pushState` and `popstate` return **zero matches** across
the whole file, so no screen can be linked, bookmarked, reloaded or opened in a second tab, and the
browser Back button leaves the app. What stands in for history is an in-memory array, `navStack`,
capped at 40 and silently shifting its oldest entry (`:7006`). Because `go(id, el)` drives the
active-item highlight from *the DOM element that was clicked* rather than from the page id
(`:8783`), the **80 programmatic calls of the form `go('x', null)`** navigate the page while leaving
the rail highlighting the page the operator was on a moment ago.

Underneath all of this there is no shell in the engineering sense: 41 `.page` divs toggled by a
class, ~25 inline empty states (`DESIGN.md` D9), ~6 divergent banner implementations (D8), at least
six countdown components (§8.4.2), and **`aria-` appearing zero times in the file**. The operator
cannot navigate to a quarter of the product, cannot share where they are, cannot trust the rail to
say where they are, and cannot reach a row action from the keyboard (D19). Nothing in Phase 1 can be
built until the frame, the route table and the shared vocabulary exist and are owned by one agent.

---

## 2. Scope

### 2.1 In

1. **The workspace taxonomy** — 5 workspaces, 34 sub-tabs, display order, icon concepts, and each
   workspace's default landing sub-tab. §3.3, §3.4.
2. **The coverage proof** — all 41 legacy pages reachable through 34 destinations plus 3 shell
   layers, with one retirement, and **no page lost without a named merge**. §3.5.
3. **The merge register** — the seven page merges, each with its contributing pages and its merged
   scope, so the five re-scoped page specs can be written. §3.6.
4. **Settings** — the four panes that leave for Financials and the 21 → 7 collapse in Admin. §3.7.
5. **The route table** and how a deep link resolves to a workspace and sub-tab. §3.8.
6. **Level-2 behaviour at 1280 px**, including the collapse affordance D2 requires. §3.9.
7. **The new sanctioned deviation** replacing `DESIGN.md` §6.2 **D-4**, stated as a requirement.
   product-designer writes the wording. §3.12.
8. **The application shell** — what is mounted regardless of route, the three shell layers, what
   persists, what resets. §4.
9. **The component inventory** — one deduplicated table of every shadcn primitive and every build-it
   component the whole app needs, so step 0.4 adds them in one pass. §5.
10. **The shared layouts** — `AppLayout`, the four page shapes, `PageHeader`, the four state
    components. §6.
11. **Index-table shared behaviour** and the **form-field vocabulary**, with the rules where a ledger
    (§8.3) and a work queue (§8.4) must differ. §7.
12. **Shell data contract** (§8), **shell states** (§9), **acceptance criteria** (§10),
    **permissions** (§11).

### 2.2 Out

| Out of scope | Reason |
|---|---|
| Layout, spacing, colour, geometry, component anatomy | product-designer owns it (0.2). This spec names the `DESIGN.md` pattern; the designer specifies it. |
| The 34 sub-tab specs | One spec per feature, later. This document is what they inherit. §3.6 gives the seven merged ones their scope so they can be written. |
| Re-litigating the IA | **D1 is binding.** `PROPOSED-STRUCTURE.md` is adopted as written. Disagreements go into `DECISIONS.md`, not into a spec. |
| Anything below 1280 px | **D2.** One breakpoint governs the right-rail drop and it is the designer's to set. |
| Authentication, login, 2FA entry, session establishment | No auth surface exists among the 41 pages. `DB.loginSessions` is a settings display only. **Q2**. |
| Persistence and the backend | `localStorage` / `sessionStorage` / `indexedDB` / `fetch` / `XMLHttpRequest` are all **zero matches** in the legacy file. The client seam is 0.6. **Q1**. |
| Fixing the 24 known legacy defects | `docs/ref/defects.md`. This spec says which the shell **must not reproduce** (§13). |
| Choosing between shadcn `sidebar` and a hand-built rail | Technical approach. §5.4 states the requirement; the engineer responds. **Q6**. |
| Charting library selection | Same. §5.3 states the constraint; the engineer responds. **Q5**. |

---

## 3. The navigation model

### 3.1 The decision

Two levels, Slack-style.

- **Level 1 — workspace rail.** Five targets. Picks the *workspace*. `Admin` is pinned to the bottom
  — `DESIGN.md` §2.1: *"Settings MUST be pinned to the bottom of the nav column and MUST NOT scroll
  with the nav list."* That is the one §2.1 nav rule this deviation preserves intact.
- **Level 2 — sub-tab list.** A second column listing the 5–9 sub-tabs of the selected workspace.
  Selecting a row is the navigation event; the row is the tab the operator lands on.

Both columns are **route-derived, never click-derived**. This is the single most important mechanical
difference from the legacy app: the active workspace and active sub-tab are computed from the current
route, never from the element that was clicked. It kills the `go('x', null)` class of defect
(`:8783`, 80 call sites) by construction, and **AC-08** tests it.

**Depth ceiling: three.** Workspace → sub-tab → detail. A filter, a saved view or an index view tab
is a *control on a screen*, not a navigation level (`PROPOSED-STRUCTURE.md` §2.1 P3). The 360°
profile is an overlay on level 3, not a fourth level (§4.3). Every path is proved ≤ 3 in
`PROPOSED-STRUCTURE.md` §11.2.

### 3.2 What this supersedes

| Superseded | By | Where recorded |
|---|---|---|
| Revision 1's 10 modules / 41 one-to-one pages | 5 workspaces, 34 sub-tabs | **D1** |
| `PHASE-PLAN.md` Phase 1's 8-module page list | The same | **D1**. `PHASE-PLAN.md` needs a matching revision before Phase 1 starts — flagged in §14. |
| `DESIGN.md` §6.2 **D-4** (hover-expanding icon rail) | The two-level rail | §3.12 — product-designer writes the replacement |
| `DESIGN.md` §6.3 **D3** as a *defect* (settings is a route, not an overlay) | Settings is a route, deliberately | §3.12 — reclassify to sanctioned |
| §6.4's **work-queue** row for `fraud` | Metric tiles + chart cards (§3.7) | §3.4, resolved — see the note under Management |

Two corrections from revision 1 that the coordinator has already applied upstream and that this
revision therefore states as fact rather than as findings: `zones` was missing from `PHASE-PLAN.md`'s
Phase 1 table, and `live` is **not** a full-bleed screen — §8.1 explicitly rejects the §2.5 mapping
for it, and only `plan-edit` unmounts the shell (§3.10).

### 3.3 The five workspaces

Rail order is top to bottom. `Admin` is pinned to the bottom.

| # | Workspace | Route prefix | Icon concept | Sub-tabs | Default landing | Cadence · primary role |
|---:|---|---|---|---:|---|---|
| 1 | **Management** | `/management` | Chart axis with a rising line — legacy `exec-overview` glyph (`:487`) | 5 | Overview | Weekly · Owner |
| 2 | **Operations** | `/operations` | Concentric circles with a centre dot — legacy `live` glyph (`:498`) | 9 | Overview | Shift · Ops Manager |
| 3 | **Financials** | `/financials` | Currency stroke through a vertical line — legacy `finance` glyph (`:527`) | 7 | Overview | Daily–weekly · Finance |
| 4 | **Customer Support** | `/support` | Speech bubble with a headset arc — legacy `support` glyph (`:533`) | 6 | Overview | 24/7 · Support |
| 5 | **Admin** *(pinned)* | `/admin` | Gear — legacy `settings` glyph (`:539`) | 7 | Overview | Rare · Owner |
| | | | | **34** | | |

**Icon concepts are concepts.** The rail is icon-first, so each icon carries its workspace's entire
name at that size and must survive being the only label. All five candidates already exist in the
legacy rail and should be evaluated before new ones are drawn. product-designer specifies the glyphs,
sizes and states.

**Every workspace's first sub-tab is `Overview`, and it is the default landing.** That is not a
convention I invented — it is `PROPOSED-STRUCTURE.md` §2.1 **P4**: *"Overview sub-tabs read; they
never act. An Overview is where you decide which sub-tab to open. Every tile deep-links into the
sub-tab that owns the work."* The consequence is a shell rule: **a metric tile with no click target
is a defect**, and the legacy exec page — whose tiles are explicitly *not* clickable — is the
counter-example.

**Role-based landing.** The workspace the operator lands on at sign-in is role-derived
(`PROPOSED-STRUCTURE.md` §10.2), not fixed:

| Role | Lands on | Why it changes |
|---|---|---|
| Owner | `/management/overview` | The only role whose job is the whole business |
| Ops Manager | `/operations/overview` | Replaces `dashboard` as the shift-start screen |
| Finance | `/financials/overview` | Today Finance lands on the dashboard, which contains nothing they can act on |
| Support | `/support/overview` | Today Support lands on the dashboard and hunts for Support Center in a 30-item rail |

The application default, absent a role match, is `/operations/overview` — the legacy boot page
(`p-dashboard` carries `class="page on"` at `:676`; `navCurrent` is seeded
`{type:'page', id:'dashboard'}` at `:2850`) in its new home.

### 3.4 The 34 sub-tabs, in display order

"Views" are index view tabs on one dataset — **controls, not levels** (§2.6). "Pattern" quotes the
`DESIGN.md` §6.4 row that governs the sub-tab's main surface; a merged sub-tab may carry more than
one, and where it does, both are named.

#### 1. Management — 5 sub-tabs

| # | Sub-tab | Route | Contributing legacy pages | Pattern (§6.4) |
|---:|---|---|---|---|
| 1 | **Overview** | `/management/overview` | `exec-overview` (KPI strip, financial position, subscription growth); counters sourced from `predictive`, `fraud`, `inbox`, `finance`, `drivers` | Metric tiles + chart cards (§3.7) |
| 2 | **Performance** | `/management/performance` | `exec-overview` (trend charts, cities health, expansion-ready, rider engagement) + `growth` (retention cohorts, CSAT/NPS) | Metric tiles + chart cards (§3.7) |
| 3 | **Risk & Signals** | `/management/risk` | `predictive` + `fraud` | Metric tiles + chart cards (§3.7) |
| 4 | **Growth** | `/management/growth` | `growth` (promos, referral program, captain incentive rules, bulk messaging) | Metric tiles + chart cards (§3.7); the promo list is an Index table (§3.1–3.3) |
| 5 | **Market & Zones** | `/management/zones` | `zones` + `exec-overview` (expansion-ready list) | Index table (§3.1–3.3) |

> **§6.4 pattern change, recorded — this closes revision 1's Q3.** `fraud` was mapped to
> **Work queue (§8.4)**, which requires claim, SLA, disposition and the R5a row marker. Under D1 it
> folds into **Risk & Signals**, which `PROPOSED-STRUCTURE.md` §4.2 describes as *"compute a flag,
> then send the operator somewhere else"* — every action button is a `go()` to another page
> (`:14320`, `:14336`, `:14351`, `:14363`), and `PAGE-TRACEABILITY-MATRIX.md` row 4 states it
> *"has no work queue."* Risk & Signals is therefore **Metric tiles + chart cards (§3.7)**.
> `docs/06-design-reference/_partials/06-eyvar-mapping.md` §6.4 must be updated and `DESIGN.md`
> rebuilt; product-designer owns that edit, alongside the D-4 rewrite (§3.12).

#### 2. Operations — 9 sub-tabs

| # | Sub-tab | Route | Contributing legacy pages | Views (controls, not levels) | Pattern (§6.4) |
|---:|---|---|---|---|---|
| 1 | **Overview** | `/operations/overview` | `dashboard` + `inbox` (the two ownership counters) | — | Metric tiles + chart cards (§3.7) |
| 2 | **My Work** | `/operations/my-work` | `inbox` | Mine · Unassigned · Everything | Activity feed (§3.8) over Work-queue rows (§8.4) |
| 3 | **Live Dispatch** | `/operations/dispatch` | `live` (live mode) + `interventions` (the surviving "Live trip interventions" card, `:2075`) | — | **Monitoring shell (§8.1)** |
| 4 | **Requests** | `/operations/requests` | `requests` + `requests-sub-all` + `requests-instant-all` | All · Instant · Subscription · Pending · Assigned · Expired | Work queue (§8.4) |
| 5 | **Subscriptions** | `/operations/subscriptions` | `subscriptions` + `renewal` | All · Active · Expiring ≤ 7 d · At risk · Frozen | Index table (§3.1–3.3) |
| 6 | **Corporate Accounts** | `/operations/corporate` · detail `/operations/corporate/:corpId` | `corporate` + `corp-detail` | — | Index table (§3.1–3.3) → Two-column detail (§2.2, §3.8) |
| 7 | **Trips** | `/operations/trips` | `trips` + `quickrides` + `live` (history mode) | All · Quick rides · Subscription legs · Flagged · Low rating · Route history | Index table (§3.1–3.3) |
| 8 | **Trip Assurance** | `/operations/assurance` | `readiness` + `coverage` + `commitment` | Departing next 24 h · No backup captain · Awaiting confirmation · Absences | Work queue (§8.4) |
| 9 | **People** | `/operations/people` · detail `/operations/people/applications/:applicantId` | `drivers` + `all-pending` + `applicant-detail` + `compliance` + `riders` | Captains · Applications · Compliance · Riders | Index table (§3.1–3.3) + Work queue (§8.4) → Two-column detail (§2.2, §3.8) |

> **Recorded risk, from `PROPOSED-STRUCTURE.md` §13.1 R1:** Operations holds 9 of the 34 sub-tabs and
> 21 of the 41 legacy pages. Nine is the author's own ceiling. The pre-drawn split, if it grows, is
> Operations (dispatch, requests, trips) vs Supply (people, trip assurance). Not proposed now,
> because the same one or two people work both — but the line exists and the shell must not make
> splitting it expensive. **Consequence for 0.7:** a sub-tab's route must not encode its workspace in
> anything except the route table, so moving one is a data change.

#### 3. Financials — 7 sub-tabs

| # | Sub-tab | Route | Contributing legacy pages / settings panes | Views | Pattern (§6.4) |
|---:|---|---|---|---|---|
| 1 | **Overview** | `/financials/overview` | `finance` (contribution margin) + `wallets` KPIs + `rwallets` KPIs + pane `ledger` (trial balance) | — | Metric tiles + chart cards (§3.7) |
| 2 | **Revenue & Refunds** | `/financials/revenue` | `finance` (revenue by plan, refunds ledger, credit notes, contribution-margin detail) | — | **Ledger (§8.3)** |
| 3 | **Payouts & Escrow** | `/financials/payouts` | `wallets` (quick-ride payouts, subscription escrow, deductions) | — | **Ledger (§8.3)** |
| 4 | **Cash & Captain Debt** | `/financials/cash` | `wallets` (cash reconciliation) | — | **Ledger (§8.3)**; escalations are a Work queue (§8.4) |
| 5 | **Rider Wallets** | `/financials/rider-wallets` | `rwallets` + the goodwill ledger | — | **Ledger (§8.3)** |
| 6 | **Pricing & Plans** | `/financials/pricing` · editor `/financials/pricing/plans/:planId/edit` | `plans` + `plan-edit` + pane `pricing` (rate card, surge suspensions) + pane `cancelpolicy` | Subscription plans · Quick rides · Rate card · Cancellation fees | Index table (§3.1–3.3) → **Sectioned form + save bar + derived values (§4.1, §2.3, §8.2)** |
| 7 | **Ledger & Payment Controls** | `/financials/ledger` | pane `ledger` + pane `gateways` + VAT / invoice config | — | **Ledger (§8.3)** + Settings shell (§2.4) |

#### 4. Customer Support — 6 sub-tabs

| # | Sub-tab | Route | Contributing legacy pages | Views | Pattern (§6.4) |
|---:|---|---|---|---|---|
| 1 | **Overview** | `/support/overview` | assembled from `support`, `contacts`, `safety`, `fairness` | — | Metric tiles + chart cards (§3.7) |
| 2 | **Tickets** | `/support/tickets` · detail `/support/tickets/:ticketId` | `support` (tickets card) + `ticket-detail` | Open · In progress · Waiting · Resolved · By reason code | Index table → detail with timeline (§3.1, §3.8) |
| 3 | **Disputes & Claims** | `/support/disputes` | `support` (disputes card + lost & found card) | Disputes · Lost & found | Index table → detail with timeline (§3.1, §3.8) |
| 4 | **Captain Fairness** | `/support/fairness` | `fairness` | Suspension appeals · Rating disputes · Rider reports · Captain economics | Metric tiles + chart cards (§3.7); cases are a Work queue (§8.4) |
| 5 | **Safety & Incidents** | `/support/safety` | `safety` | Open · Critical SOS · Closed | Index table → detail with timeline (§3.1, §3.8) |
| 6 | **Contact Centre** | `/support/contact-centre` | `contacts` + `support` (support team card) | — | Index table (§3.1–3.3) |

#### 5. Admin — 7 sub-tabs

| # | Sub-tab | Route | Absorbs (settings pane keys / pages) | Views | Pattern (§6.4) |
|---:|---|---|---|---|---|
| 1 | **Overview** | `/admin/overview` | New. Built from `auditLog`, `teamUsers`, `integrity`, `rotaGaps()`, `legalDocuments`, the erasure queue, `dataWindow`, export audit entries | — | Metric tiles + chart cards (§3.7) |
| 2 | **Workspace** | `/admin/workspace` | `general` + `branding` + `legal` | — | Settings shell (§2.4) |
| 3 | **Team & Access** | `/admin/team` | `team` + `permissions` + `security` + `rota` | — | Settings shell (§2.4) |
| 4 | **Operational Policy** | `/admin/policy` | `dispatch` + `cities` + `limits` + `reasons` (incl. SLA, compensation authority, commitment policy) | — | Settings shell (§2.4) |
| 5 | **Communications** | `/admin/communications` | `notifications` + `push` + `emails` | On Email: Inbox · Outbox | Settings shell (§2.4) |
| 6 | **Data & Compliance** | `/admin/data` | `integrity` + `export` (incl. daily snapshots) + the PDPL erasure queue + the retention window | — | Settings shell (§2.4) |
| 7 | **Activity Log** | `/admin/activity` | page `audit-log` + pane `activity` | Filter by actor · action · entity | Index table (§3.1–3.3) |

### 3.5 Coverage — all 41 legacy pages, none lost

The proof this revision has to carry is harder than revision 1's. It is no longer "41 pages placed
once"; it is **"every legacy page's content arrives somewhere named."** A page that vanishes without
a merge row is a lost feature, so every row below states a destination or a retirement reason.

Ordered by `GROUND-TRUTH-INVENTORY.md` §A. Disposition vocabulary is
`PAGE-TRACEABILITY-MATRIX.md`'s: **Keep** (survives as its own sub-tab or level-3 detail),
**Merge** (folded into a shared sub-tab), **Split** (content divided across more than one
destination), **Shell** (becomes a shell layer, §4.3), **Retire**.

| # | Legacy page | §A line | Destination(s) | Disp. |
|---:|---|---|---|---|
| 1 | `exec-overview` | L583 | Management › **Overview** (KPI strip, financial position, subscription growth) · **Performance** (trend charts, cities health, rider engagement) · **Market & Zones** (expansion-ready list) | Split |
| 2 | `corporate` | L634 | Operations › **Corporate Accounts** | Keep |
| 3 | `corp-detail` | L644 | Operations › Corporate Accounts › **Account detail** (level 3) | Keep |
| 4 | `fraud` | L650 | Management › **Risk & Signals** | Merge |
| 5 | `dashboard` | L676 | Operations › **Overview** | Merge |
| 6 | `subscriptions` | L713 | Operations › **Subscriptions** | Keep |
| 7 | `live` | L768 | Operations › **Live Dispatch** (live mode) · **Trips** — view *Route history* (history mode) | Split |
| 8 | `trips` | L848 | Operations › **Trips** | Keep |
| 9 | `renewal` | L861 | Operations › Subscriptions — view *Expiring ≤ 7 days* | Merge |
| 10 | `readiness` | L869 | Operations › Trip Assurance — view *Departing next 24 h* | Merge |
| 11 | `drivers` | L887 | Operations › People — view *Captains* | Merge |
| 12 | `riders` | L907 | Operations › People — view *Riders* | Merge |
| 13 | `finance` | L928 | Financials › **Overview** (contribution margin) · **Revenue & Refunds** (revenue by plan, refunds ledger, credit notes) | Split |
| 14 | `wallets` | L968 | Financials › **Payouts & Escrow** (payouts, escrow, deductions) · **Cash & Captain Debt** (cash reconciliation) · **Overview** (KPIs) | Split |
| 15 | `rwallets` | L1020 | Financials › **Rider Wallets** | Keep |
| 16 | `plans` | L1030 | Financials › Pricing & Plans — views *Subscription plans* / *Quick rides* | Merge |
| 17 | `plan-edit` | L1082 | Financials › Pricing & Plans › **Plan editor** (level 3) | Keep |
| 18 | `quickrides` | L1132 | Operations › Trips — view *Quick rides* | Merge |
| 19 | `my-account` | L1151 | **Shell › My profile** drawer (from the avatar). Administration of *other* users is Admin › Team & Access | Shell |
| 20 | `notifications-all` | L1171 | **Shell › Notification centre** (the expanded state of the bell panel) | Shell |
| 21 | `predictive` | L1190 | Management › **Risk & Signals** | Merge |
| 22 | `coverage` | L1220 | Operations › Trip Assurance — view *No backup captain* | Merge |
| 23 | `compliance` | L1236 | Operations › People — view *Compliance* | Merge |
| 24 | `safety` | L1252 | Customer Support › **Safety & Incidents** | Keep |
| 25 | `growth` | L1264 | Management › **Growth** (promos, referrals, incentives, bulk messaging) · **Performance** (retention cohorts, CSAT/NPS) | Split |
| 26 | `zones` | L1304 | Management › **Market & Zones** | Keep |
| 27 | `all-pending` | L1324 | Operations › People — view *Applications* | Merge |
| 28 | `applicant-detail` | L1342 | Operations › People › **Applicant detail** (level 3) | Keep |
| 29 | `support` | L1351 | Customer Support › **Tickets** (tickets card) · **Disputes & Claims** (disputes + lost & found) · **Contact Centre** (support-team roster) · **Overview** (KPIs) | Split |
| 30 | `ticket-detail` | L1380 | Customer Support › Tickets › **Ticket detail** (level 3) | Keep |
| 31 | `profile` | L1384 | **Shell › 360° profile** overlay, reachable identically from all five workspaces | Shell |
| 32 | `inbox` | L1392 | Operations › **My Work**; its two ownership counters also surface on Operations › Overview | Keep |
| 33 | `commitment` | L1397 | Operations › Trip Assurance — views *Awaiting confirmation* / *Absences* | Merge |
| 34 | `fairness` | L1402 | Customer Support › **Captain Fairness** | Keep |
| 35 | `contacts` | L1409 | Customer Support › **Contact Centre** | Keep |
| 36 | `settings` | L1416 | Dissolved: 17 panes across Admin's 6 config sub-tabs + Activity Log; **4 panes to Financials** (§3.7) | Split |
| 37 | `audit-log` | L2051 | Admin › **Activity Log** (absorbs the 4-row settings preview) | Merge |
| 38 | `interventions` | L2068 | **RETIRED.** Its one surviving card moves to Operations › Live Dispatch | Retire |
| 39 | `requests` | L2079 | Operations › **Requests** | Keep |
| 40 | `requests-sub-all` | L2123 | Operations › Requests — view *Subscription* | Merge |
| 41 | `requests-instant-all` | L2144 | Operations › Requests — view *Instant* | Merge |

**Totals.** 41 legacy pages → **34 sub-tabs** + **5 level-3 detail routes** (`corp-detail`,
`applicant-detail`, `ticket-detail`, `plan-edit`, and the 360° profile's full-page escape) +
**3 shell layers** + **1 retirement**. Dispositions: 13 Keep · 14 Merge · 7 Split · 3 Shell ·
1 Retire · 3 level-3 details counted under Keep. **Zero pages with no destination.**

**The eleven pages that had no nav entry all gain one** (`GROUND-TRUTH-INVENTORY.md` §B.1):
`all-pending`, `requests-sub-all`, `requests-instant-all` and `plan-edit` become views or a level-3
route inside a nav-reachable sub-tab; `applicant-detail`, `corp-detail` and `ticket-detail` become
explicit level-3 details of a listed sub-tab; `profile`, `notifications-all` and `my-account` become
shell layers reachable from everywhere; `interventions` is retired.

### 3.6 The merge register — the seven page merges

`DECISIONS.md` D1: *"Seven page merges are real product work, not renames. Each needs its scope
specified before its sub-tab can be built."* This is that specification. Each row is what the
sub-tab spec must cover; anything not listed here is out of that sub-tab's scope.

**M1 — Management › Risk & Signals** ← `predictive` + `fraud`

- **Scope:** eight signal domains on one early-warning surface — five from predictive (churn, driver
  availability, payment failure, repeat incidents, zone shortage) and three from fraud (shared
  device/IP, referral self-abuse, unusual pairing) — plus the identity-collision pre-migration audit.
- **Shape:** read-and-route. Every signal row terminates in a navigation to the sub-tab that owns the
  work; no signal is resolved here. There is no claim, no SLA clock and no disposition.
- **Carried defects the spec must resolve:** `fraud` has no `PAGE_PERMISSIONS` entry despite exposing
  suspension power (`00c` §5.1).

**M2 — Operations › Live Dispatch** ← `live` (live mode) + `interventions` (surviving card)

- **Scope:** the §8.1.1 monitoring shell — map canvas plus the three-feed side list (active trips,
  sub-trip requests, ride requests) — plus the "Live trip interventions" card, which is trip-level
  and belongs beside the map.
- **Excluded:** history mode. Route replay is trip forensics and goes to Trips (M5). The tell is
  that the legacy trip table is *disabled* in live mode.
- **Carried defects:** ~120 lines of Leaflet/OSM code are dead — `renderLiveMap()` has no callers and
  `#map-leaflet` does not exist (`04` §17.3).

**M3 — Operations › Requests** ← `requests` + `requests-sub-all` + `requests-instant-all`

- **Scope:** one work queue for the two ways a rider asks for service — instant (auto-matched by the
  tick engine, ops intervenes on SLA breach) and subscription (manually matched against a payment
  hold). The two truncated preview cards and their two overflow pages become one index with six
  views.
- **Removes:** one navigation level, two duplicate search boxes, two pagers and two "← Back to
  requests" buttons.
- **Carried defects:** seeded `assignedSub: 'SUB-1052b'` points at a subscription that does not exist
  (`07c` §19.7); the live engine never sets `status='assigned'` on an instant request — it splices —
  so the `✅ Assigned` chip only ever matches fabricated seed rows (`07c` §19.10).

**M4 — Operations › Subscriptions** ← `subscriptions` + `renewal`

- **Scope:** the master subscription list, its four money/relationship levers (change driver, freeze,
  cancel & refund, settle), and the renewal pipeline as the *Expiring ≤ 7 days* view with a health
  score column. Renewal is `DB.subscriptions` filtered to `ends` within 7 days of `EYVAR_TODAY`
  (`:11232`), scored by `subHealthScore()` (`:14210`) — a date filter and a column, not a page.
- **Carried defects:** the legacy search box has no `id` and no handler (`05a` §19.1); `At risk` is an
  unreachable filter value; there is no exit from `Frozen`; `renderSuccess()` writes no audit entry
  and no `DB.payments` record, so a completed renewal is invisible to both the Activity Log and
  Finance (`07a` §19.5).

**M5 — Operations › Trips** ← `trips` + `quickrides` + `live` (history mode)

- **Scope:** the flat ledger of every `DB.trips` record, with quick rides as a view
  (`kind === 'Quick ride'`) and route replay as a view over the same records.
- **Deliberately lost:** all four `quickrides` KPI tiles, which are hardcoded strings including their
  bar widths, and whose "today" claim is false — `renderQuickRidesTable` applies no date filter
  (`06b` §17.1–2). Losing them is the point, per `PROPOSED-STRUCTURE.md` §2.1 **P7**.
- **Carried defects:** the `No-shows` KPI and its filter are dead — nothing writes a status containing
  "no-show" (`06a` §17.1).

**M6 — Operations › Trip Assurance** ← `readiness` + `coverage` + `commitment`

- **Scope:** one question — *will tomorrow's subscription trip actually happen?* — answered at three
  horizons. Readiness watches the next hours (driver available, moving, rider confirmed); Coverage
  watches structural exposure (does this subscription have a backup captain); Commitment watches the
  captain's nightly confirmation and the rolling absence counter. Shared data:
  `DB.upcomingSubTrips` (27 functions), `DB.subBackups` / `backupRegistry`, `DB.planConfirmations`,
  `DB.absenceEvents` (16 functions).
- **Default view:** *Departing next 24 h* — what an ops manager opens it for.
- **Deliberately lost:** the capacity grid. `slotOf()` strips AM/PM without converting ("7:30 PM" →
  slot 07:30) and everything outside 06:00–08:30 collapses into 07:00 (`10c` §17.5, 17.7).
- **Carried defects:** no 24-hour filter is actually applied despite the page copy (`07b` §7); trips
  never leave the board on departure (`07b` §16.9); the 21:00 confirmation deadline exists only in
  display strings and is never enforced (`10b` §17.1); forfeiture is logged and never posted to any
  wallet, escrow or payout record (`10b` §17.7).
- **Named risk** (`PROPOSED-STRUCTURE.md` §13.1 R4): three pages into one screen is dense. The
  mitigation is **views, not stacked cards**, and it binds.

**M7 — Operations › People** ← `drivers` + `all-pending` + `applicant-detail` + `compliance` + `riders`

- **Scope:** the captain lifecycle end to end plus the rider roster, as four views over two entity
  types, with the KYC review screen as the one level-3 detail. Onboarding is the front of the captain
  lifecycle and compliance is the back of it; both write the same record.
- **Why the merge is load-bearing:** `DRV-0106` exists on the roster with **no `DB.driverDocs`
  entry**, so it is invisible to `complianceScan()` and can never be auto-suspended for an expired
  document (`08a` §17.9). Two pages, two data sets, one entity, one gap nobody sees.
- **Carried defects:** `d.docStatus` is read in two places and assigned nowhere; no `DB.drivers`
  record has a `.status` field, so `status !== 'pending'` is a no-op filter (`08a` §17.1–2); rider KPI
  tiles 2 and 3 count subscriptions, not riders (`09a` §17.5); **nothing blocks approval** —
  `approveDriver()` reads none of `docs`, `docNotes`, `docExpiry`, `bank.status` or the vehicle-class
  verdict (`08b` §17.5); new driver ids can collide with the existing `DRV-0106`.

**The five re-scoped page specs, now unblocked.** `requests` → M3 · `subscriptions` → M4 ·
`readiness` → M6 · `drivers` → M7 · `trips` → M5. Their scope is the merged sub-tab, not the legacy
page. Each spec must open with its merge row above and must state what it *excludes* from its
contributing pages.

### 3.7 Settings — the four relocations and the 21 → 7 collapse

**Four panes leave Admin for Financials** (D1; `PROPOSED-STRUCTURE.md` §2.1 **P5** — *"policy lives
where it is enforced, not in a settings drawer"*):

| Pane key | Legacy label | New home | Why |
|---|---|---|---|
| `gateways` | Payment Gateways | Financials › Ledger & Payment Controls | Six payment methods with live transaction counts. A finance report wearing a config label. |
| `ledger` | Ledger & money safety | Financials › Ledger & Payment Controls | Double-entry postings, trial balance, idempotency keys. A finance control. |
| `pricing` | Pricing & rate card | Financials › Pricing & Plans | The rate card with a propose/approve workflow is pricing, and it is one of **four disjoint pricing models** that only become visible on one screen (`14a` §19.1). |
| `cancelpolicy` | Cancellation Policy | Financials › Pricing & Plans | Cancellation fees are money objects with money owners. |

**The remaining 17 panes collapse into Admin's six configuration sub-tabs plus Activity Log:**

| Admin sub-tab | Panes absorbed | Count |
|---|---|---:|
| Workspace | `general` · `branding` · `legal` | 3 |
| Team & Access | `team` · `permissions` · `security` · `rota` | 4 |
| Operational Policy | `dispatch` · `cities` · `limits` · `reasons` | 4 |
| Communications | `notifications` · `push` · `emails` | 3 |
| Data & Compliance | `integrity` · `export` | 2 |
| Activity Log | `activity` | 1 |
| | **17** + 4 relocated = **21, no leftovers** | |

Three merges inside that collapse are defect closures, not filing:

- **`general` + `branding`** are the same feature implemented twice — two independent logo stores
  never synchronised: `DB.branding.logoUrl` drives the sidebar, `DB.opsConfig.general.logoDataUrl`
  drives the favicon (`16a` §1). Merging them deletes the defect.
- **`team` + `permissions`** never render independently: `renderTeamTable()` already calls both
  permission matrices (`:10465`–`:10466`). One screen pretending to be two.
- **`activity` pane + `audit-log` page** — the pane's description claims to show configuration
  changes and actually shows the four newest entries of the *global* log with no filter
  (`16j` §12.1). One audit surface, not a wrong preview plus a page. **This closes revision 1's Q5.**

**Nested sub-tabs stay inside their sub-tab.** Email Log's Inbox/Outbox (`:1854`–`:1855`) becomes two
views on one index — which removes the product's only four-deep path — and Pricing Plan's
Plans/Quick-rides (`:1034`–`:1035`) becomes two of the four Pricing & Plans views. Neither is a nav
level (§2.6).

**Each sub-tab route mounts only its own screens.** Legacy fires all 33 settings renderers in one
`go('settings')` branch (`:8819`) and `switchSettingsTab` then only toggles visibility. Deliberate
behaviour change — **suspected legacy defect D-L6, §13**.

### 3.8 Deep linking — how a route resolves

Every destination has exactly one canonical route. The first path segment is the workspace id; the
second is the sub-tab id. That is the whole resolution rule, and it holds for all 34 sub-tabs and all
5 level-3 details.

1. **The route is the source of truth for both nav columns.** Level 1's active workspace = first path
   segment. Level 2's active row = second path segment. Neither is ever set from a click handler.
2. **A level-3 detail highlights its parent sub-tab.** `/operations/people/applications/APP-2201` →
   **Operations → People**. `/financials/pricing/plans/1/edit` → **Financials → Pricing & Plans**
   (except while the editor has unmounted the shell — §3.10).
3. **A view is a search param, not a path segment.** `/operations/requests?view=instant`. Views are
   controls; putting them in the path would make them look like levels and would break the
   three-level ceiling by appearance if not by fact.
4. **A shell layer is an overlay param on the current route** (§4.3), so the workspace behind it is
   preserved, shareable and restorable: `/support/tickets/TKT-505?entity=RDR-1041`.
5. **An unknown route renders the not-found state inside the content region**, shell intact, last
   valid workspace still selected. No silent redirect, no URL rewrite.
6. **A route the current role cannot see renders the forbidden state**, not a redirect (§11).
7. **There is no legacy URL surface to preserve.** `location.hash`, `history.pushState`, `popstate`
   and `window.location` are **zero matches, file-wide**. There is no redirect map to write — but
   because 41 legacy page ids appear throughout the module docs, the route table (§8.5) carries a
   `legacyPageIds` field so a doc reference can be resolved to a destination mechanically.
8. **Browser Back and Forward MUST move between routes.** `navStack` (`:7006`, cap 40, oldest silently
   dropped) does not carry over.

### 3.9 Level-2 behaviour at 1280 px

> ### AMENDED — `DECISIONS.md` **D5**. The sub-tab list does not collapse.
>
> The business owner's words, looking at the running app: *"remove this, no need to collapse
> it."* **The level-2 column is always visible.** This reverses **D2**'s first consequence
> bullet and the Collapse / Default state / breakpoint-first-use rows below.
>
> Deleted with it: the rail's disclosure and its popover, `PageNavPopoverBody`,
> `useNavCollapse` and its test, and `ui.subTabNavCollapsed`. **AC-32 and AC-33 are void** —
> see their entries in §10.
>
> **The 1280 px question this section exists to answer is still answered, and better.**
> Measured in the browser at 1280: rail **80** + column **224** = **304 px** of navigation and
> **976 px** of content. A 2 : 1 detail fits 976 exactly (640 + 16 + 320). The rail narrowed
> from 88 to 80 because the labels shortened to `Exec · Ops · Finance · Support · Admin`, so
> the column costs the content region less than it did when it was collapsible.
>
> `--ev-bp-wide: 1344px` **survives** with its other two consumers, the detail right-rail drop
> and the metric-tile grid. It loses its first use only.

**D2 governs this section.** The console must work at 1280 px.

| Question | Requirement |
|---|---|
| ~~**Collapse**~~ | **VOID (D5).** The sub-tab list is not collapsible. The column is always rendered; there is no disclosure, no popover, no pin and no persisted flag. |
| ~~**Default state**~~ | **VOID (D5).** There is one state, so there is no first-run default to derive and nothing a resize could re-toggle. |
| **The breakpoint** | One number, set by product-designer, **now used for two things rather than three**: the detail-page right-rail drop (§3.10) and the metric-tile grid. `--ev-bp-wide: 1344px`. Still one number used everywhere. |
| **Both states are real states** | Every screen is reviewed at 1280 and at 1440+ (**D2**). That is a visual-QA requirement, not a nice-to-have. *(This row used to cite **AC-11a**, which §10 never defines — it numbers AC-01 … AC-76 with no `AC-11a`. Raised by the 0.8 QA verdict. The citation is **struck** rather than renumbered: the requirement it names is D2's own review rule, which needs no separate criterion, and the two states it referred to were the collapsed and expanded column — which no longer exist. The surviving pair of widths is 1280 / 1440, already covered by **AC-34**.)* |
| **Content width** | The content region's width is a function of the collapsed state and the viewport, and of nothing else. Moving between workspaces or sub-tabs never changes it. |
| **A workspace with one visible sub-tab** | Cannot happen by design — the smallest workspace has five. It *can* happen by permission filtering, and then the column still renders with its one row, selected. The column is never conditionally removed by content. |
| **Scrolling** | Three independent scroll contexts: rail (5 items, never scrolls), sub-tab list (max 9 rows, rarely scrolls, scrolls independently when it must), content region. The top bar is fixed above all three. |
| **Keyboard** | **AMENDED (D5).** Skip link → rail's 4 workspace tiles → pinned Admin → sub-tab list → top bar → content, in DOM order. Arrow keys move within a column; `Tab` moves between columns. **The disclosure is no longer in the order because it no longer exists**, and design finding **F-3** — which decided *where* in the rail to put it — goes with it. *(This row has now been amended twice. After 0.2 it said the disclosure lived "in the column's place", which contradicted "in the rail"; D5 removes the control altogether. See **AC-64**.)* |
| **Badges** | A count belongs on the **sub-tab row** that owns the work; the **workspace tile** shows the sum of its sub-tabs' counts. §2.1: count badges are right-aligned numerals reserved for actionable backlogs, never decoration. **A count of zero renders no badge, not a `0`** — legacy renders `0` on eleven rail badges at boot (`:491`, `:492`, `:496`, `:508`, `:514`–`:518`, `:523`, `:533`), training operators to stop reading them. ~~When the list is collapsed, the workspace tile's badge is the only signal, so it must never be suppressed.~~ **VOID (D5)** — the list is never collapsed. **Amended (V6):** the tile's **count** rolls up; its **tone does not.** A tile sums about seven rows, so one toned row in seven turned the whole tile amber — measured at 8 of 11 visible badges warning, including 4 of 5 tiles. A tile's number is a sum of heterogeneous queues and a sum of different kinds of thing has no single status to report. Tone lives on the sub-tab row only, and means **breached**. |

### 3.10 Page shapes and the one full-bleed screen

From `patterns.md` §"The four page shapes". Every destination resolves to exactly one.

| Shape | Destinations | Shell treatment |
|---|---|---|
| **Single column** — full width for lists, capped for overviews | 33 of the 34 sub-tabs | Rail + sub-tab list + top bar + `PageHeader` + content |
| **Main + right rail** — centred, ~2 : 1 | The 4 level-3 details (`corp-detail`, `applicant-detail`, `ticket-detail`) and the 360° profile's full-page escape | Same shell; content splits per §2.2. **The rail drops below the D2 breakpoint** and its cards restack beneath the main column. |
| **Full-bleed editor** — full viewport, own bar | **`/financials/pricing/plans/:planId/edit` only** | Shell unmounts entirely (§2.5): no rail, no sub-tab list, no app top bar. Its own bar carries exit, the plan name, its status badge, and a `Save` greyed when there is nothing to save. Exiting returns to `/financials/pricing` with both columns restored and `Pricing & Plans` selected. |
| **Monitoring shell** — canvas + synchronised side list | **Operations › Live Dispatch** | **Shell stays.** §8.1 explicitly rejects the §2.5 mapping for the live map, and §8.1.1's wireframe keeps the standard `.ph` page header. Only the content region goes full width with no max-width cap. Legacy already ships the grid: `grid-template-columns:1fr 340px;gap:14px;align-items:start` (`:772`) with the side list `position:sticky;top:60px` (`:826`). |

### 3.11 `interventions` is retired

Per **D1** and `PROPOSED-STRUCTURE.md` §12.1. Revision 1's conditional route-only workaround is
dropped — it existed only while Q1 was open.

- **No route exists.** `/queues/interventions` and every variant of it resolve to not-found.
- **Its one surviving card**, "Live trip interventions" (`:2075`), moves to Operations › Live
  Dispatch, where trip-level actions belong.
- **Evidence for the retirement:** the page's own body copy retires it (`:2071`–`:2072`) — *"That job
  now belongs to the work inbox"*; it has no sidebar entry; **`go('interventions')` appears nowhere in
  21,857 lines**; and the `refreshOwnershipSurfaces()` hook that names it is itself dead, guarding on
  `renderInterventions`, a function that does not exist.
- **What must not be lost with it:** `buildInterventionItems()` (`:9450`–`:9533`) is the builder
  behind both the retired page and the dashboard's "needs intervention now" feed. It survives, in
  Operations › Overview and Live Dispatch. **Two counters currently disagree** —
  `#dash-intervene-count` applies a 60-minute cut-off, the standalone page used the unfiltered builder
  (`03a` §17.2) — and they must be reconciled in the Operations › Overview spec, not here.

### 3.12 The deviation this creates — replacing D-4

**A requirement on product-designer (0.2), not a proposal.** `DESIGN.md` §6.2 D-4 currently reads:

> | D-4 | **Icon rail that expands on hover** — 52px → 236px | §2.1 (fixed ~240px nav, always expanded) | Screen width is worth more to the live map and wide tables than a permanently open nav. |

The two-level model **replaces** D-4; it does not supplement it. There is no hover expansion, because
the second column holds the labels the hover expansion existed to reveal. Leaving D-4 in place would
sanction a behaviour the product no longer has.

`PHASE-PLAN.md` §"Open item — navigation deviation" names the process: product-designer proposes the
wording in 0.2, it is recorded in `docs/06-design-reference/_partials/06-eyvar-mapping.md`, and
`DESIGN.md` is rebuilt with `python docs/06-design-reference/build-design.py` **before 0.7 ships**.
`DESIGN.md` is generated and is never hand-edited (`TEAM-BRIEF.md`).

**Rules the new D-4 entry must name as suspended.** §6.2's standing rule: *"A deviation that does not
name its rule is not sanctioned — it is a defect."*

| Rule | What the two-level model does to it |
|---|---|
| §2.1 — *"a fixed left nav (240 px — R11)"* | Replaced by two columns whose combined width varies with collapse state. The single-240px-column rule no longer describes the product. |
| §2.1 — *"Only one nav section MAY be expanded at a time, and it MUST be the section containing the current page"* | There are no expandable sections. Level 1 selects; level 2 lists. The intent is preserved by construction; the rule as written does not apply. |
| §2.1 — *"Every primary nav item MUST have a leading icon; secondary (nested) items MUST NOT"* | Level 1 is icon-only; level 2 is label-only. Compatible in spirit; must be restated for two columns. |
| §2.1 — *"Active items MUST use an inset filled white pill at both levels. A nested active row additionally carries an elbow connector from its parent"* | An elbow connector is meaningless when parent and child sit in different columns. Suspend this clause explicitly. |
| §2.4 — *"Settings MUST open as an overlay over the current page"* and *"MUST be nav (~289 px) + gutter + pane (~707 px)"* | Admin is a workspace whose level-2 column is its nav (§3.7). This also **supersedes defect D3** — *"Settings is a route, not an overlay"* — which must be reclassified from defect to sanctioned. It is now a decision. |
| §2.6 — *"The app MUST NOT use breadcrumbs"* | **Unchanged, and worth re-asserting**: two columns are not a breadcrumb trail. The `Title › Subtitle` top-bar pair sanctioned by **D-3** stays. Level-3 details keep the single back arrow left of the title. |
| §6.4 — the `fraud` row | Changes from Work queue (§8.4) to Metric tiles + chart cards (§3.7). Same edit, same partial, same rebuild — see the note in §3.4. |

**Sanctioned deviations that survive untouched and must be re-asserted, not quietly re-derived:**
**D-1** (brand blue is the primary action colour), **D-2** (13 px base, ~30 px rows — smaller, never
off-grid), **D-3** (light 50 px top bar with `Title › Subtitle`).

---

## 4. The application shell

### 4.1 What is always mounted

Regardless of route — except on the plan editor (§3.10) — the following are mounted exactly once for
the lifetime of the session and are never remounted by navigation.

| Region | Contents | Notes |
|---|---|---|
| **Workspace rail** (level 1) | Eyvar wordmark · 4 workspace tiles · `Admin` pinned to the bottom | The wordmark links to the role's default landing route (§3.3). The wordmark living in the rail is *why* D-3 frees the top bar for wayfinding. |
| **Sub-tab list** (level 2) | Workspace name as a heading · sub-tab rows in display order, with count badges | Independent scroll context. Operator-collapsible, persisted (§3.9). |
| **Top bar** | Back arrow (conditional) · `Title › Subtitle` · global search · notification bell + panel · avatar → account menu | **Light, ~50 px**, per **D-3**. A sanctioned deviation from §2.1's dark bar; not to be "fixed". |
| **Toast region** | One region, one stack | Bottom-**centre of the viewport** per §2.6 and R9. Legacy anchors bottom-right (`:5272`–`:5275`) — **defect D7**, do not reproduce. In RTL the corner and the entry translate both mirror; legacy's `translateX(28px)` never got the flip (`:5288`, `:5254`). |
| **Save-bar slot** | Empty until the active route reports dirty state | **Replaces the top bar in place, at identical height, with no layout shift** (§2.3). Both nav columns stay mounted and are **not** dimmed. |
| **Shell-layer root** | One root hosting the 360° profile, the notification centre and my-profile — one open at a time (§4.3) | A `sheet` per §5.5: **no scrim**, because the workspace behind it is the context the operator is reading it against. |
| **Modal / dialog root** | One root; one open surface at a time | Legacy uses a single shared container, `#modal-content` inside `#modal-box` (`:476`), with 311 `closeModal()` call sites. One root is right; sharing one `innerHTML` across 99 modal openers is not. |
| **Live-region announcer** | One `aria-live` region for async results | **`aria-` appears zero times in 21,857 lines.** §7.5.1: *"the toast announces nothing."* Politeness per §7.5.2; continuously updating values MUST NOT be a live region (§7.5.3). |
| **Skip-to-content link** | First focusable element in the document | §7.3.4. Target is the content region's landmark. |

### 4.2 The top bar, slot by slot

Grounded in the legacy markup at `:557`–`:578`, corrected where `DESIGN.md` says it is wrong.

| Slot | Requirement | Legacy | Verdict |
|---|---|---|---|
| Back arrow | Present on level-3 detail routes and the editor; absent on sub-tab routes (§2.2) | `#tb-back`, shown when `navStack.length` (`:7005`) | **Rebuild.** Visibility derives from the route's shape, not from a stack depth. |
| Title › Subtitle | From the route (**D-3**) | `#tb-title` / `#tb-sub` from the `titles` and `subs` maps (`:2168`, `:2169`) | Keep the pattern. Every sub-tab needs a title key; a missing subtitle renders nothing — not an empty separator. Legacy has 41 titles and only **31** subtitles. |
| Global search | Anchored popover on the field, `⌘K` / `Ctrl K`, scope as a removable chip inside the input, two-line result rows, escape-hatch row always last (§2.6) | A bare 230 px input with an `Enter` handler calling `globalSearch()` (`:569`) | **Rebuild — defect D4.** Under D1 search is load-bearing, not convenience: it is what makes a 5-workspace structure survivable when someone cannot find where Cancellation Policy went. See §4.3.4. |
| Notification bell | Count badge only when unread > 0; the popover is the preview, the expanded panel is the shell layer (§4.3.2) | `#bell-btn`, `#bell-count`, `#notif-panel` (`:571`), `NOTIF_PANEL_PREVIEW = 8` (`:2197`) | Keep the model. Priority-sorted, never recency-only (`:2175`–`:2187`) — that design is right and must survive. |
| Avatar → account menu | Opens the account menu; `My profile` opens the shell layer (§4.3.3) | `#tb-avatar` → `openUserSwitch()` (`:577`); a **second** entry on the rail footer (`:544`) | **Consolidate to one.** Two entry points to one screen in two chrome regions is drift — **D-L10**. |
| `✋ N mine` chip | Count of items this operator is holding; routes to `/operations/my-work` | `#my-work-chip` (`:566`) routes to `support` | **Suspected legacy defect D-L1 (§13):** the chip counts inbox items and navigates to Support Center. |
| `📟 on-call` chip | Who is reachable this shift; routes to `/admin/team` | `#oncall-chip` (`:567`) routes to `settings` | Keep; retarget, now that the rota is an addressable sub-tab. |
| Impersonation bar | A standing condition → **banner**, full-width, undismissable, above the top bar | An inline-styled `position:fixed` div (`:563`) | Rebuild as the shared `Banner`. Never a toast (R10). |
| Call bar | An in-progress call — persistent, dismissible only by ending the call | An inline-styled fixed pill (`:564`) | Rebuild. Not a toast: a call outlives any transient confirmation. |

### 4.3 The three shell layers

**D1:** *"`profile` (360°) and `notifications-all` stop being tabs and become shell layers reachable
from every workspace."* `my-account` joins them per `PROPOSED-STRUCTURE.md` §9.5.

**One mechanism for all three.** A shell layer is an **overlay parameter on the current route**, not
a route of its own. `/support/tickets/TKT-505?entity=RDR-1041` opens the rider's profile over the
ticket. The workspace stays visible behind it, the URL is shareable and restorable, browser Back
closes the layer rather than leaving the page, and the layer does not consume a navigation level —
which is what keeps the three-level ceiling true (`PROPOSED-STRUCTURE.md` §11.2: *"Opening a rider
from a ticket does not push a fourth level — it overlays the third"*). **One layer is open at a
time**; opening a second closes the first.

#### 4.3.1 360° profile — `?entity=<id>`

| Aspect | Requirement |
|---|---|
| Reached from | Global search · any id or name link in any table (`rowLink(id,label)`, `:3283`) · any KPI row drill-down · any notification (`handleNotifClick`, `:2273`) · any work-inbox row (`inboxOpen`, `:19301`). **`openProfile` already has 100 call sites — the second-most-used handler in the file after `closeModal`.** |
| Surface | A side panel per §5.5, **no scrim**, with a full-page escape at `/entity/:entityId` for deep review |
| Composition | **Sections contributed by workspaces, as a declared contract** — Financials contributes wallet and payment cards, Customer Support contributes tickets / disputes / fairness, Operations contributes trips / subscriptions / compliance / commitment. Not one 600-line builder. |
| Entity types | **Must extend from 6 to 11.** `resolveId()` (`:3266`) covers `riders`, `drivers`, `trips`, `subscriptions`, `payments`, `complaints`. It does **not** cover `newRiders`, `pendingDrivers`, `tickets`, `corporateAccounts` or `plans` — so `TKT-505`, `APP-2201` and `CORP-001` return "No record found" while having perfectly good detail screens (`09b` §17.2). |
| Rail highlight | **The workspace the operator is in stays highlighted.** The profile is an overlay, not a destination — which is what closes revision 1's Q2 outright. |
| Collapse controls | Every entity type, not two. `initCardToggles()` runs for riders and drivers only (`09b` §17.4); the other types get an uncollapsible wall. |
| Permission | Gated on `view_profiles` — the permission granted to all 5 seeded users and enforced at **zero** call sites today (`00c` §5.2). This is where it becomes real. |
| Back-stack | Scoped to the workspace, so switching workspaces does not lose the operator's place. |

#### 4.3.2 Notification centre — `?notifications=all`

| Aspect | Requirement |
|---|---|
| Two sizes | The bell popover is the **preview** — top 8 by priority (`NOTIF_PANEL_PREVIEW = 8`, `:2197`). "See all" expands to the shell layer, which is the former `notifications-all` page in full: four priority tiers, six filter chips. |
| Sorting | **Priority first, never recency alone** (`:2175`–`:2187`). That design is right and must survive the move. |
| Three defects to fix on the way | Type `alert` — the most common runtime type, 16 producers — has **no click destination** in `handleNotifClick`, so the most frequent notification does nothing when clicked. Types `renewal`, `approval` and `complaint` have full icon / priority / routing support and **no runtime producer**. Every read flag reverts on reload, so the badge returns to 3 (`03c` §17). |
| Routing | A notification's click destination is a route in the new table. One routing to a forbidden destination renders without its navigation affordance rather than being hidden — the operator should know the event happened (§11). |

#### 4.3.3 My profile — `?account=me`

| Aspect | Requirement |
|---|---|
| Contents | Profile, password, 2FA, active sessions, and the 13-permission *"exactly what your role can do"* summary (`renderMaPermissions()`, `:3065`) |
| Why it survives as a layer | It is the **only place an operator can see their own effective permissions**, and a per-user preferences screen is not a nav destination |
| Administering *other* users | Admin › Team & Access. Editing yourself and editing the team are different jobs with different permissions (`manage_team`). |

#### 4.3.4 Global search is part of the shell contract, not a convenience

Under D1, four settings panes changed workspace and seven merges moved familiar pages. Search is what
makes that survivable: *"if someone cannot find Cancellation Policy, search takes them to Financials
› Pricing & Plans without them needing to know it moved"* (`PROPOSED-STRUCTURE.md` §9.3). So the
search index covers **three kinds of target**, not one:

1. **Entities** — the 11 resolvable types, opening the profile layer.
2. **Destinations** — all 34 sub-tabs and their views, by current name **and by legacy name**. The
   route table's `legacyPageIds` field (§8.5) is what makes "Renewal pipeline" resolve to
   *Operations › Subscriptions — Expiring ≤ 7 days*.
3. **Actions** — named operations, where the operator has permission for them.

Results the operator cannot open must not appear (§11). Two legacy defects must not carry:
`resolveId`'s name search is an unordered `for…in` returning the first substring hit over riders and
drivers only, so searching "Al-Harbi" silently picks one of two people (`09b` §17.1); and there is no
phone-number or partial-id matching.

### 4.4 What persists across navigation, and what resets

| State | Persists across | Resets on |
|---|---|---|
| Selected workspace, selected sub-tab | — | Route change (they *are* the route) |
| Sub-tab list collapsed / expanded | Every route, and reload | Explicit operator toggle only. **Never auto-toggled by a resize** (§3.9) |
| Language and `dir` | Every route, and reload | Explicit change in Admin › Workspace |
| Acting user / role | Every route | Sign-out, user switch |
| Open shell layer | — | Route change closes it; browser Back closes it without leaving the page |
| Toast stack | Route change — a toast naming a completed action outlives the page that raised it | Its own timer, or dismiss |
| Modal | — | Route change closes it |
| Per-table state: view, filters, sort, column visibility, page number | Navigating away and back **within the session** | Reload, until **Q1** resolves persistence. Never shared between two tables. |
| Table row selection | — | Any route change; any view or filter change (§3.3: *"Leaving selection MUST restore the column headers and clear the bar"*) |
| Unsaved form state | **Nothing.** Navigating away while dirty MUST be intercepted (§2.3) | Save, discard, or confirmed abandon |
| Content-region scroll position | — | Route change resets to top; browser Back restores |
| Sub-tab list scroll position | Route change within a workspace | Workspace change |
| Live map mode and map filters | Leaving and returning to Live Dispatch within the session | Reload |
| Claim / ownership on a queue item | Everything — it is server state, not UI state | Release, take-over, or the 30-minute stale expiry (`:18853`) |

**One clock.** §8.1.2: the app runs exactly one `setInterval(tickEngine, 1000)` (`:11968`) and every
periodic surface subscribes to a modulo bucket off it (`%5` ETA and sub-requests `:12602`, `%15` SLA
sweep `:12512`, `%20` inbox `:12513`, `%60` countdown decrement `:12611`). That clock is **shell
state**, owned here, not per-page. Renderers gate on visibility — an off-screen surface must not paint
(`:12596`, `:12141`, `:19035`). Per-page intervals are forbidden.

## 5. Component inventory

The point of this section: **step 0.4 adds every primitive in one pass and `components.json` is
frozen afterwards.** A primitive missed here blocks a Phase 1 agent who is forbidden from running
the CLI (`PHASE-PLAN.md` §"Parallelism rules"). Err toward adding.

### 5.1 Pattern keys

| Key | Pattern (`patterns.md`) | Legacy pages |
|---|---|---:|
| **P1** | Index table + view tabs + filters + bulk action bar (§3.1–3.3) | 10 |
| **P2** | Two-column detail — main + right rail, with timeline (§2.2, §3.8) | 4 |
| **P3** | Sectioned form + save bar + derived values (§4.1, §2.3, §8.2) | 1 |
| **P4** | Settings shell with its own nav (§2.4) | 21 panes + `my-account` |
| **P5** | Metric tiles + chart cards (§3.7) | 7 |
| **P6** | Monitoring shell (§8.1) | 1 |
| **P7** | Ledger — append-only, money formatting (§8.3) | 3 |
| **P8** | Work queue — claim, SLA, disposition, row-level critical (§8.4) | 8 |
| **P9** | Index table → detail with timeline (§3.1, §3.8) | 3 |
| **P10** | Activity feed (§3.8) | 2 |
| **SH** | The shell itself (§4) | — |

> **Counts are of legacy pages, and they are unchanged by D1** — the §6.4 pattern rows describe page
> *shapes*, not nav placement, so merging pages into a sub-tab does not delete a shape. Two
> consequences for 0.4, both of which make the inventory below *more* necessary rather than less:
>
> 1. **A merged sub-tab may carry two patterns at once.** Operations › People is an Index table (§3.1)
>    for Captains and Riders, a Work queue (§8.4) for Applications, and a Two-column detail (§2.2) for
>    the applicant — on one route. Financials › Cash & Captain Debt is a Ledger (§8.3) whose
>    escalations are a Work queue (§8.4). The component set a single sub-tab needs is therefore the
>    *union* of its patterns, and no primitive can be deferred on the argument that "this screen is
>    just a table".
> 2. **One pattern row changed.** `fraud` moves from **P8** to **P5** (§3.4), so P8 governs 7 legacy
>    pages and P5 governs 8. No component is added or removed by that change — but P8's claim, SLA and
>    R5a components are now needed by one fewer surface, and nothing in this table depends on the
>    count.

### 5.2 shadcn primitives to add in 0.4

Every one arrives **non-compliant** and is restyled on the way in — `docs/ref/components.md`
§"Restyle on arrival". Verify `"rtl": true` is still set in `components.json` before adding
anything; if it was ever off, every component added since is suspect.

| # | Component | shadcn primitive | Needed by | Priority | Restyle notes |
|---:|---|---|---|:--:|---|
| 1 | Button | `button` | all | **P0** | R3 — primary is `bg-primary` (brand blue, **D-1**), at most one per page header (§2.2). Two heights: compact ~28 px, regular ~36 px (§4.6). |
| 2 | Badge | `badge` | all | **P0** | R7 five tones, R15 **rounded rectangle, not a stadium pill**, **no red variant** (R5a). Legacy ships 11 tones (D5) across three byte-identical systems (D6) — collapse to five. |
| 3 | Card | `card` | all | **P0** | The index table is *one card* containing tabs, filter row, header, rows and the bulk bar (§3.1). |
| 4 | Table | `table` + `@tanstack/react-table` | P1 P5 P7 P8 P9 | **P0** | §3.1. **Ledger disables row actions and selection** (§8.3). §7.4.3 semantics. |
| 5 | Tabs | `tabs` | P1 P4 P8 P9 | **P0** | §3.2 — tabs live **inside the table card**, never in the page header (§2.6). |
| 6 | Dialog | `dialog` | all | **P0** | §5.3 — question title naming object + count, consequence body, primary restates the verb. Vertically centred, ~625 px. |
| 7 | Alert dialog | `alert-dialog` | P1 P3 P4 P7 P8 | **P0** | Destructive and irreversible confirmations. `GATE_SWEEP` alone declares **47** gated actions (`:20769`); `00b` records 88 across four mechanisms. Red primary **only** when unrecoverable (§3.3). |
| 8 | Sheet | `sheet` | P1 P2 SH | **P0** | §5.5 — **no scrim**; the page behind stays readable. ~406 px, widening to ~648 px only when the panel needs internal columns. |
| 9 | Dropdown menu | `dropdown-menu` | P1 P2 P8 SH | **P0** | §5.4. Row actions, `More actions ▾`, the account menu. |
| 10 | Popover | `popover` | P1 P8 SH | **P0** | §5.4 — stays open while adjusting. Sort popover, filter value pickers, the notification panel, date range. |
| 11 | Tooltip | `tooltip` | all | **P0** | §5.7 — **naming icon-only controls only**. Never constraints, never help text. |
| 12 | Input | `input` | P1 P3 P4 SH | **P0** | §4.2. Labels are ~13 px regular above the field — legacy labels are 11 px `--muted` and read as hints (D22). |
| 13 | Label | `label` | P3 P4 | **P0** | §4.2, §7.4.5. |
| 14 | Form | `form` | P3 P4 | **P0** | §4.4 — inline field error + page-level critical banner naming the count, primary disabled until valid. |
| 15 | Textarea | `textarea` | P2 P3 P4 | **P0** | 12 in the legacy app. |
| 16 | Select | `select` | P1 P3 P4 P6 | **P0** | §4.3. 19 in the legacy app. |
| 17 | Checkbox | `checkbox` | P1 P3 P4 | **P0** | §4.3. 39 in the legacy app. Also the index selection column (§3.3). |
| 18 | Radio group | `radio-group` | P1 P3 P4 | **P0** | §4.3. 32 in the legacy app. **The sort popover is a radio group** plus a direction pair (§3.2). |
| 19 | Switch | `switch` | P3 P4 | **P0** | §4.3 — **instant-effect settings only**. If it needs a Save, it is a checkbox. |
| 20 | Separator | `separator` | all | **P0** | Card sections, menu group dividers (§3.3 overflow grouping). |
| 21 | Skeleton | `skeleton` | all | **P0** | Shaped like the content. **Never a centred spinner** (`states.md`). |
| 22 | Toast | `sonner` | SH | **P0** | R9 — one line, names the object, ≤ 60 chars, no action link, no emoji, no period. Bottom-centre of the **viewport**. Legacy fails six conformance rules (D7). |
| 23 | Alert *(as the Banner base)* | `alert` | all | **P0** | `components.md`: *"Banner — none, build it. shadcn `alert` is close; restyle."* R1/R16 pale tinted card, four tones. See §5.3 B-01. |
| 24 | Avatar | `avatar` | SH P2 P4 P9 P10 | **P0** | Top bar, team roster, profile header, timeline entries. |
| 25 | Command | `command` | SH P1 P3 | **P0** | Global search (`⌘K` / `Ctrl K`, §2.6) and every combobox / resource picker (§4.5). |
| 26 | Pagination | `pagination` | P1 P7 P8 | **P0** | §3.1. A ledger's pager must not imply re-ordering (§7.4). |
| 27 | Scroll area | `scroll-area` | SH P2 P6 P10 | **P0** | The level-2 page list, the §8.1.1 side list, timelines, and the ~20 legacy `max-height + overflow-y:auto` regions. |
| 28 | Accordion | `accordion` | P4 P2 | **P1** | The permissions matrix expands **inline** — expansion is not navigation (`PROPOSED-STRUCTURE.md` §11.1 row 7). |
| 29 | Collapsible | `collapsible` | P2 P4 P5 | **P1** | Legacy `initCardToggles()` gives collapsible cards to riders and drivers only; every detail type needs them. |
| 30 | Progress | `progress` | P8 P5 P1 | **P1** | The §8.4.2 3 px SLA track. **Its denominator MUST be the item's own SLA target** — legacy hardcodes `90` (`:11652`), so the bar means something different on every queue that borrows it. |
| 31 | Calendar | `calendar` | P1 P3 P4 P6 | **P1** | 3 `type="date"` + 2 `type="time"` in legacy; §4.5 date + time split, and the §4.5 date-range popover for P5. |
| 32 | Toggle group | `toggle-group` | P6 P1 P5 | **P1** | The `live` / `history` mode switch (`setMapMode`), map filter chips, table density. A segmented control, not tabs — it does not filter one dataset into views. |
| 33 | Chart | `chart` | P5 P6 | **P1** | 7 metric-tile pages plus 3 legacy `<canvas>` charts (`:817`, `:8255`, `:8434`). **Constraint, not a choice:** it must theme entirely to `--ev-*` and ship no built-in palette (`components.md` §"Do not import"). Engineer confirms shadcn `chart` / Recharts satisfies that before 0.4 closes. |

**Deliberately not added, with the reason** — so nobody re-adds them in Phase 1:

| Not added | Reason |
|---|---|
| `breadcrumb` | §2.6: *"The app MUST NOT use breadcrumbs."* D-3's `Title › Subtitle` is a title pair, not a trail. |
| `drawer` | Vaul's mobile bottom sheet. §5.5 wants a right side panel — that is `sheet`. |
| `sidebar` | See §5.4 — an open decision, not a silent omission. |
| `navigation-menu`, `menubar`, `context-menu` | No horizontal nav, no menu bar; §5.4 routes all object commands through `dropdown-menu`. |
| `slider` | Zero `type="range"` in the legacy app. |
| `hover-card` | §5.7 permits tooltips for naming only; a hover card is an undiscoverable surface for an all-day tool. |
| `carousel`, `aspect-ratio`, `resizable` | No use in any of the 10 patterns. The §8.1.1 side list is a fixed 340 px, not resizable. |
| `input-otp` | No 2FA entry surface among the 41 pages. Revisit if **Q7** brings auth into scope. |

### 5.3 Build-it components

No shadcn equivalent, or the equivalent encodes a design decision `DESIGN.md` overrides. §6.6:
*"Banners (R1/R16), empty states (R8), and the whole of §8 — the monitoring shell, the append-only
ledger, the work queue with SLA and the R5a row marker, derived-value fields. Four patterns,
expected."*

| # | Component | Composed from | Needed by | Priority | Governing rule |
|---|---|---|---|:--:|---|
| **Shell** |
| S-01 | `ModuleRail` | button, tooltip, badge | SH | **P0** | §3.1, §3.3, new D-4 |
| S-02 | `PageNav` | scroll-area, button, badge, separator | SH | **P0** | §3.7, §3.9 |
| S-03 | `TopBar` | avatar, dropdown-menu, popover, input | SH | **P0** | **D-3** |
| S-04 | `SaveBar` | button | SH P3 P4 | **P0** | §2.3 + **R2** (Save is the brand-blue primary; the light Save is derived from Shopify's dark bar and would be invisible on Eyvar's white one) |
| S-05 | `GlobalSearch` | command, popover, badge | SH | **P0** | §2.6 — anchored popover, scope chip inside the input, escape-hatch row always last |
| S-06 | `NotificationPanel` | popover, scroll-area, badge | SH | **P0** | §3.8, §5.4 |
| S-07 | `AccountMenu` | dropdown-menu, avatar, separator | SH | **P0** | §2.1 |
| S-08 | `LiveRegionAnnouncer` | — | SH | **P0** | §7.5 — currently absent from the product entirely |
| S-09 | `SkipToContent` | — | SH | **P0** | §7.3.4 |
| **The four states** |
| B-01 | `Banner` | `alert`, button | all | **P0** | R1/R16 four tones, undismissable when it names a standing condition. Never two page-level banners — merge with a count (§5.2). Replaces the ~6 divergent inline implementations (D8). |
| B-02 | `EmptyState` | button | all | **P0** | **R8, two kinds.** Whole-page first-run: illustration + heading + 1–2 sentences + ≥ 1 action. Card / section / timeline / filtered-to-zero: **one grey sentence**, no illustration, no heading. Replaces ~25 inline empties (D9). |
| B-03 | `ErrorState` | button | all | **P0** | Names what happened and how to retry, as an imperative. No "please", "invalid", "failed", or blame (`copy.md`). |
| B-04 | `LoadingSkeleton` variants — one per pattern | skeleton | all | **P0** | Shaped like the content it replaces. One variant per §6.4 row, not one generic block. |
| **Page shells** |
| L-01 | `AppLayout` | S-01…S-09 | all | **P0** | §4 |
| L-02 | `PageHeader` | button, badge, dropdown-menu | all but P3 | **P0** | §2.2 slot order: back arrow · title · inline status badges · subtitle row · secondary actions → `More actions ▾` → primary → record pager |
| L-03 | `SingleColumnPage` | — | 35 pages | **P0** | §2.2 |
| L-04 | `DetailPage` (main + right rail) | card, separator | P2 | **P0** | §2.2 — ~2 : 1 ratio binds; px figures are indicative. The rail holds **only** status, publishing, summary and metadata. |
| L-05 | `FullBleedEditorShell` | button, badge | P3 | **P0** | §2.5 |
| L-06 | `MonitorShell` | scroll-area, card | P6 | **P0** | §8.1.1 — a two-pane grid whose panes share **one selection model**. Panes that do not share a selection are two cards and must use §2.2 instead. |
| **Data surfaces** |
| D-01 | `DataTable` | table + tanstack, checkbox, dropdown-menu, pagination | P1 P9 | **P0** | §3.1 |
| D-02 | `IndexToolbar` | tabs, popover, command, input, button | P1 P9 | **P0** | §3.2 — two states: view tabs, and search mode which **replaces the tab row in place** |
| D-03 | `FilterChipRow` | button, popover, badge | P1 P8 P9 | **P0** | §3.2 — chips end with `Add filter +`; `Clear all` appears only when something is applied |
| D-04 | `BulkActionBar` | button, dropdown-menu | P1 P9 | **P0** | §3.3 — floats **inside** the card, centred, `N selected`, ≤ 3 labelled actions then `…` |
| D-05 | `SavedViewTabs` | tabs, dialog, dropdown-menu | P1 P9 | **P1** | §3.2 — only the **selected** tab exposes a chevron; the create-view modal disables its primary until the name is non-empty |
| D-06 | `LedgerTable` | table, card | P7 | **P1** | §8.3.3 — fixed column order, no checkbox column, no row kebab, no bulk bar, not user-sortable |
| D-07 | `WorkQueueTable` | table, card | P8 | **P1** | §8.4 |
| D-08 | `MetricTile` | card, badge | P5 P6 | **P1** | §3.7. Every tile deep-links to the surface that owns the number — the legacy exec page's tiles are *not clickable* at all. |
| D-09 | `ChartCard` | card, `chart` | P5 | **P1** | §3.7. Plot areas and axes **do not mirror** in RTL (`rtl.md`). |
| D-10 | `Timeline` | avatar, separator, scroll-area | P2 P9 | **P1** | §3.8 |
| D-11 | `ActivityFeed` | avatar, badge, scroll-area | P10 | **P1** | §3.8 |
| **Domain vocabulary** |
| V-01 | `StatusBadge` | `badge` | all | **P0** | R7 five tones, closed set. **There is no red badge** (R5a). Legacy ships 49 `b b-red` badges (D11). |
| V-02 | `Money` | — | P1 P2 P5 P7 | **P0** | §8.3.1 — `<amount> SAR`, ISO code trailing, exactly 2 decimals, `,` thousands, `font-variant-numeric: tabular-nums`, right-aligned (R4). Negative uses U+2212, never a hyphen, never parentheses, never colour alone, never a badge. **Exactly one formatter exists** — `formatMoney` from utilities-engineer (0.5). |
| V-03 | `DerivedValue` | — | P3 P5 | **P1** | §8.2.1 three states, three shapes. **A derived value is not a disabled input** — the disabled treatment is reserved for actions that will become available (§4.6). |
| V-04 | `SlaCountdown` | `progress` | P8 | **P1** | §8.4.2 — **one component replacing six** (`.sla-bar`, the `.days-*` trio, `dueChip`, `reqSlaBadge`, `subReqSlaBadge`, `slaBadge`). Format from `fmtAge` (`:14630`–`:14636`): `12m left` · `3h 20m left` · `2d 4h left` · `overdue 14m`. No deadline reads `no clock`, neutral tone, **sorts last**. |
| V-05 | `RowCriticalMarker` | — | P8 P7 | **P1** | **R5a** — a 3 px full-height bar in `--red` on the row's **leading edge**, `box-shadow: inset 3px 0 0`. Legal because it is not a badge: no pill geometry, no fill-plus-text pairing, no label, outside the row's content box. Never the only signal — the countdown pill must also say `overdue 14m` in words. |
| V-06 | `OwnerChip` | badge, button | P8 P10 | **P1** | §8.4.1 three states: unclaimed → `✋ Claim`; yours → success tone, `✋ yours · 4m`, plus release; someone else's → warning tone, `✋ Layla`, plus `take over`. |
| V-07 | `DecisionBadge` | badge | P8 | **P1** | §8.4.5 — names outcome, actor and reason, with the timestamp beneath. A rejection is a **neutral** terminal outcome, not `b-red` (`:10907`). A decided row drops to `--muted` and loses its affordances; it must **not** be dimmed with `opacity:.7` (`:10929`), which is §4.6's disabled treatment and says "this will come back". |
| V-08 | `LiveDot` | — | P6 | **P2** | §8.1.4 + **R18** — a loop may only signal "this feed is live" and may never encode severity. Guarded by `prefers-reduced-motion`. Three legacy loops are unguarded (D24). |
| V-09 | `MapCanvas` | — | P6 | **P2** | §8.1.5. The map canvas, markers, routes and compass **do not mirror** in RTL; the map *chrome* does (`rtl.md`). |
| V-10 | `RecordPager` | button | P2 | **P2** | §2.2 — record-detail pages only, rightmost element, only where the record belongs to an ordered list |
| V-11 | `LearnMoreLink` | — | P1 P9 | **P2** | §2.6 — one centred `Learn more about <topic>.` beneath the last card. At most one per page; never on a record-detail page. |
| V-12 | `FormulaDisclosure` | popover | P3 P5 | **P2** | §8.2.2 |

### 5.4 One open technical decision, not a gap

shadcn ships a `sidebar` block that would supply collapse state, keyboard handling, off-canvas
behaviour and a provider. `components.md` says *"do not import shadcn blocks/templates wholesale —
they encode someone else's page shapes; ours are in `patterns.md`."* A two-level rail is not a shape
`sidebar` was written for.

**I state the requirement, not the answer.** The requirement is §3.7 and §10 AC-01…AC-14.
product-designer decides in 0.2 whether the rail is built or adopted; frontend-engineer responds in
0.4 with what it costs either way. Whichever is chosen, it is added in 0.4 — `components.json` is
frozen after that step.

---

## 6. Shared layouts

Props described conceptually — what varies, not TypeScript. frontend-engineer owns the signatures.

### 6.1 `AppLayout`

Wraps everything. Reads the route; renders rail, page list, top bar, content region, and the
singleton roots (toast, modal, sheet, live region).

| Varies | Values |
|---|---|
| Chrome mode | `full` (default) · `bleed` (`plan-edit` — unmounts rail, page list and top bar) |
| Save-bar state | `clean` · `dirty` · `dirty-invalid` (Save greyed, Discard always enabled) |
| Page-list state | `expanded` · `collapsed` — operator-controlled, persisted |
| Standing conditions | Zero or more shell-level banners, **merged into one with a count** if more than one is true (§5.2) |

### 6.2 `PageHeader`

| Varies | Notes |
|---|---|
| Back affordance | Present on detail / create / edit; **absent on index pages** (§2.2). A single `←`, never a breadcrumb trail. |
| Title | Required. Always translatable. |
| Inline status badges | Zero or more, immediately after the title on the same baseline — never on their own row, never inside the action cluster |
| Subtitle / metadata line | Optional, muted, second row. 31 of 41 legacy pages have one; a missing subtitle renders nothing. |
| Secondary actions | Zero or more |
| Overflow | `More actions ▾` when secondary actions exceed the designer's cap |
| Primary action | **At most one** per header. On a task-shaped page it moves to the bottom of the rail summary card and the header carries none (§2.2). |
| Record pager | `‹ ›`, rightmost, record-detail pages in an ordered list only |
| Unavailable actions | Rendered **greyed in place**, never removed (§2.2) |

### 6.3 The four page shapes

| Shell | Varies |
|---|---|
| `SingleColumnPage` | Width mode: `full` (index tables, data grids) · `capped` (overviews, centred on the **content region**, not the viewport) |
| `DetailPage` | Main content · rail cards (status / publishing / summary / metadata **only**) · whether the confirming action lives at the bottom of the rail summary card |
| `FullBleedEditorShell` | Exit target · name of the thing being edited · its status badge · dirty state driving `Save` · optional inspector panel |
| `MonitorShell` | Canvas pane content · side-list sections with counts · **the shared selection** (selecting in either pane selects in both) · feed freshness · stale / dead feed state (§8.1.3) |

### 6.4 The four state components

Every screen renders all four. Build them in the order **content → empty → loading → error**;
writing them in order makes omitting one visible (`states.md`).

| Component | Varies |
|---|---|
| `EmptyState` | **Kind: `first-run` or `no-match`** — this is the load-bearing prop, not a style flag. `first-run`: illustration, heading naming the section's value, 1–2 sentence body, ≥ 1 action. `no-match`: one grey sentence plus an optional plain-button action (usually clear-filters). **Filtered-to-zero is never `first-run`** — the illustration implies the data does not exist. Copy is final in the design spec, never written by the engineer at build time. |
| `ErrorState` | Scope: `page` · `card` · `row`. What happened, and the retry as an imperative. A **row**-scoped error is the partial-failure case: the list loaded, one row's action failed. |
| `LoadingSkeleton` | Shape: one variant per §6.4 pattern row. Row count where the shape is a list. Never a centred spinner. |
| `Banner` | Tone (four, R1/R16) · dismissable or not · title · body · zero to two actions · **count**, when several conditions merged into one. Placement is a designer decision; the count-merge rule is not. |

---

## 7. Tables and inputs

### 7.1 Shared index-table behaviour

Every P1 and P9 page gets all of this from `DataTable` + `IndexToolbar`. Deviations are per-page
spec items with a reason, not silent.

| Aspect | Rule | Source |
|---|---|---|
| **Container** | One card holds the view tabs, the filter row, the header row, the rows, and the bulk action bar. Never a bare `<table>`. | §3.1 |
| **Identity cell** | First data cell is the record's identity and is a **link to its detail route**. Semibold when the identity is a code or number (`TRP-4182`), regular when it is a name. | §3.1 |
| **Secondary line** | A grey second line inside the identity cell instead of a new column, when the value only qualifies the primary one. | §3.1 |
| **Alignment** | Numeric, currency and count columns right-aligned, header and value sharing a right edge (**R4**). Text and dates left-aligned. **Eyvar picks right-alignment everywhere** — do not reproduce Shopify's customers-index exception. | §3.1, R4 |
| **Sorting** | **Exactly one** header shows the active sort indicator; the rest show no resting affordance. Sort is a popover: field as a **radio group**, then a separate direction pair. Never a flat "Name A–Z / Date new–old" list. | §3.1, §3.2 |
| **Filtering** | Chips in a row beneath the search field, each a pill with a trailing chevron, ending with `Add filter +`. `Clear all` appears **only** when at least one filter or query is active. | §3.2 |
| **Search mode** | Activating search **replaces the tab row in place**, does not push it down. `Cancel` restores the previous view untouched. | §3.2 |
| **Saved views** | View tabs reflect the resource's real lifecycle. `All` is always first and always default. Only the **selected** tab exposes a chevron / actions menu. Trailing `+` creates a view; `Save as` is disabled until there is something to save; the create-view modal disables its primary until the name is non-empty. | §3.2 |
| **Selection** | Checkbox in the header row and every body row. Selecting **replaces** the header row with `N selected` — it does not overlay a banner above the table. Deselecting restores the column headers and clears the bar. Selection resets on route change and on any view or filter change. | §3.3 |
| **Bulk actions** | A floating white rounded bar **inside** the card, centred, ~8 px radius (not a stadium). At most 3 labelled actions, then `…`. Overflow items grouped by divider into add/remove or scope pairs. Destructive overflow items are **not** red — the confirmation carries the weight. | §3.3, R15 |
| **Destructive confirmation** | A modal whose title states **the verb and the count** (`Archive 3 products?`) and whose body states the consequence in one sentence. The primary repeats the verb — never `OK` or `Confirm`. Recoverable actions use the normal primary; unrecoverable ones use the red primary. | §3.3 |
| **Row actions** | A `…` kebab at the row's end. **Must be reachable by keyboard and visible without hover.** Legacy sets `opacity:0` until `:hover` with no `:focus-within` (D19, `:153`–`:154`) — unreachable by keyboard, invisible on touch. | §3.1, §7.3.5, D19 |
| **Columns** | Tables with more than ~6 columns offer a column-visibility control and **scroll horizontally** rather than shrinking columns below legibility. Visible columns and their order are per-view state. | §3.1 |
| **Density** | One density, applied uniformly: **D-2**, ~13 px base text and ~30 px rows. Row height is uniform within a table. Rows with a two-line identity cell grow to fit rather than truncating. | §3.1, **D-2** |
| **Pagination** | Below the card. A truncated list states its truncation in words. **A silent row cap must not ship** (`:12250`). | §3.1, §8.3 |
| **Empty** | Two kinds, and choosing wrongly is a defect: first-run (illustration + action) vs filtered-to-zero (`No drivers match these filters` + clear-filters). | R8 |
| **Loading** | A skeleton with the table's own column structure and a plausible row count. | `states.md` |
| **Error** | Card-scoped `ErrorState` inside the card, with the toolbar still rendered so the operator can change the query that failed. | `states.md` |
| **Below the card** | One centred `Learn more about <resource>.` link, outside the card. At most one per page. | §2.6, §3.1 |

### 7.2 Where a **ledger** must differ — these are rules, not preferences

`finance`, `wallets`, `rwallets`. §8.3.3: *"A ledger is any table whose rows are postings against a
balance. It is not an index table and it does not get index-table furniture."*

| Index table has | A ledger MUST |
|---|---|
| A selection checkbox column | **Not have one.** Nor a selection header, nor the floating bulk-action bar. They exist to mutate or remove the records they sit on, which is exactly what a ledger row forbids. |
| A row kebab with row actions | **Not have one** (`.ra`, `:153`). The **only** permitted per-row control is a read-only link to the source document. |
| User-controlled sorting | **Not be user-sortable.** A running balance is meaningful only in posting order. Oldest-first, opening row at the top, closing row at the bottom. |
| Freely chosen columns | Use the **fixed order** `Date · Reference · Description · Debit · Credit · Balance`. Debit and credit are **two columns holding positive numbers** — the sign lives in the column choice. A single signed column is permitted only in a rail card ≤ 320 px, which must then omit the balance column and link to the full ledger. |
| Editable rows | **Be append-only.** A posting is a fact. A correction is a **new reversing row that names the row it reverses**. Splicing a record out of a money array (`:7064`) and hard-assigning a balance to zero (`:7030`) must not ship. |
| A computed total | Render the running balance from the **persisted `balanceAfter`** (`:3937`, `:3947`), never recomputed at render time, so a correction to history cannot silently rewrite what the operator saw. Open and close with labelled balance rows, bold on both sides; the closing balance equals the header balance. |
| Any status in a badge | Map every money state to exactly one §3.4 tone: settled/captured/paid → **success**; held/authorised/pending/reconciling → **warning**; released/reversed/voided → **neutral**; failed/escalated → **not a badge at all** (R5), routed to the §8.4.6 row-level critical signal. |
| Totals that include everything | **Exclude pending and held amounts from the displayed balance and from the running-balance column.** A pending amount is a separate labelled line beneath the balance. |
| A silent truncation | State the truncation in words below the last row: `Showing 150 of 412 postings`. |

The one permitted exception: the truncated "recent activity" rail card (`:3951`–`:3953`) — six rows,
newest-first, **omits the balance column**, links to the full ledger.

### 7.3 Where a **work queue** must differ — also rules

`fraud`, `all-pending`, `requests`, `requests-sub-all`, `requests-instant-all`, `interventions`,
`readiness`, `renewal`. §8.4: *"An index row is a resource… A queue row is a unit of work: it is
claimed by one person, it has a deadline running against it, it is decided once, and then it
leaves."*

| Index table has | A work queue MUST additionally |
|---|---|
| No ownership model | Carry an **owner chip** with three states (§8.4.1, V-06), backed by the `DB.ownership` model — keyed `type + ':' + id` (`:18858`), with claim (`:18877`), release (`:18897`), **confirmed** takeover (`:18942`), a 30-minute stale expiry (`:18853`) and audit on every transition. The lightweight `_locking` / `claimedBy` implementation (`:11876`, `:10237`) is a defect, not an alternative. |
| No clock | Carry **one** SLA countdown component (V-04), three bands mapped to §3.4: ≥ 50 % of window → neutral; < 50 % → warning; breached → critical, which under R5 cannot be a pill and is handled below. |
| A page banner for critical state | Carry **all three parts of R5a**: (a) one aggregate page banner with a count and a `Show only breached` filter; (b) a leading-edge 3 px `--red` marker on each breached row (V-05); (c) the countdown pill reading `overdue 14m` **in words**, so the state survives colour being removed. All three are required — none substitutes for another. |
| Editable status | Carry a **closed set of dispositions declared per queue**, rendered as buttons in the row's action cell, and **replaced entirely once decided**. |
| Rows that persist | Convert the decided row **in place**. It does not vanish — a row that disappears on click gives the operator no confirmation of what they just did and no route to undo it. |
| Controls that check permission on commit | **Gate at render, not at commit.** The systemic defect (`:10237`, `:11876`) is that claim and disposition controls render regardless of permission and only check when clicked: the operator clicks, waits, and is told no. |
| Escalation on every tick | Fire the breach event **once, at the crossing** — the reference implementation is the instant-request engine at `:12544`–`:12553`. Multiple crossings within one tick batch into **one** notification with a count (`:9674`–`:9678`). |

Two legacy behaviours the rebuild must **not** carry: `inboxOpen()` claims silently on open
(`:19301`–`:19310`), so there is no way to *look* at a queue item; and the stale sweep runs as a side
effect of *reading* ownership (`:18865`–`:18875`), so rendering the inbox mutates state and writes
audit rows up to three times per item every 20 seconds.

### 7.4 The form-field vocabulary

Measured, not guessed. `GROUND-TRUTH-INVENTORY.md` §"File facts" records 225 `<input>`, 19
`<select>`, 12 `<textarea>`. Of the 225 inputs, **218 carry an explicit `type`** and 7 carry none
(defaulting to text). The 6 `type="button"` occurrences in the file are on `<button>` elements, not
inputs.

| Type | Count | What it is for in this product | Component |
|---|---:|---|---|
| `text` | **75** (68 explicit + 7 untyped) | Names, ids, plate numbers, reason-code labels, promo codes, city names, search boxes, note fields | `input` |
| `number` | **65** | Money amounts, trip allowances, commission %, radii, caps, thresholds, SLA minutes, capacity | `input`, right-aligned, tabular-nums. §4.2's **currency-prefix rule governs inputs only and MUST NOT be applied to output** (§8.3). |
| `checkbox` | **39** | Permission-matrix cells, feature toggles that wait for Save, table row selection, `Set end date` reveals | `checkbox` |
| `radio` | **32** | Mutually exclusive policy choices, sort field selection, disposition pickers | `radio-group` |
| `password` | 3 | My-account password change | `input` |
| `file` | 3 | Avatar upload, logo upload, document upload | build on `input` + §4.5 media rules |
| `date` | 3 | Document expiry, route-history date, effective-from | `calendar` in a `popover`; §4.5 date + time are **two half-width fields** |
| `time` | 2 | On-call shift boundaries, surge windows | `input` + `select`; **the timezone goes in the label**, not beside the value (§4.5) |
| `tel` | 1 | Phone on the team-member form | `input` with bidi isolation — a phone number does not mirror, and a leading `+` jumps sides in RTL (`rtl.md`) |
| `email` | 1 | Invite / team-member email | `input` |
| `hidden` | 1 | — | Not a UI component |
| `<select>` | **19** | Currency, timezone, language, gateway type, limit target, broadcast audience, push audience, ride type, corporate billing / tier / office, promo target, message segment and channel, ticket duration, rider-risk filter | `select`; upgrade to `command` combobox where the option list exceeds ~10 or needs search (§4.3) |
| `<textarea>` | **12** | Ticket replies, internal notes, rejection reasons, broadcast bodies, legal document text | `textarea` |
| `placeholder` | 76 | — | **A placeholder is not a label** (§7.4.5). Every field carries a visible label. |

**Field types the 41 pages need that the legacy app fakes or lacks:**

| Need | Where | Today |
|---|---|---|
| **Combobox / resource picker** | Assign a driver, pick a rider, link a trip, choose a plan | Hand-rolled `csel*` search widgets with `outline:none` on focus (D20, 6 of the 11 inline in JS templates) |
| **Date-range picker** | Every P5 metric page, `trips`, `audit-log`, `finance` | Does not exist. §4.5 specifies the popover: preset column + two editable fields + two months + `Cancel` / `Apply` disabled until the range changes. |
| **Tag input** | Reason codes, zones, ticket labels | Does not exist |
| **Derived-value field** | `plan-edit`, `plans` | Rendered as ordinary text or as a disabled input. §8.2 overrides §4.2 for these, and §8.2.1's three states must not reuse §4.6's disabled treatment. |
| **Money input** | Refunds, goodwill credits, deductions, plan pricing | A bare `type="number"`. Needs the §4.2 currency prefix on input and the §8.3 formatter on output — and they are **different rules**, which is the trap. |

### 7.5 Copy and Arabic — not a phase two

Every operator-facing string in the shell needs a key. Today the product has **86 `data-i18n` keys
in markup** (`GROUND-TRUTH-INVENTORY.md` §G) plus **7 set at runtime** by `reorderSettingsTabs()`
(`:21296`, `:21307`) that the §G grep misses — the six runtime settings-group headings plus `Other`,
all of which do have Arabic strings at `:7914`–`:7915`. Coverage is shell-only and the author says
so (`:7897`–`:7902`).

**Requirements for the shell.**

1. Every string in §4.1, §4.2 and §4.3 has a key. Namespaces: `nav.workspace.*` (5) ·
   `nav.subtab.*` (34) · `nav.view.*` (the index view tabs in §3.4) · `shell.*` · `layer.*` ·
   `state.*` · `table.*` · `form.*`. The six `stabgrp.*` keys that survive the 21 → 7 collapse are
   reused rather than reminted.
2. **No concatenation and no interpolated fragments.** `'🔒 Your role lacks permission: ' + label`
   (`:3130`) cannot be translated cleanly — Arabic will not put the noun where English does. It
   becomes one key with one named placeholder. Same for `'Blocked: ' + currentUserName() + ' lacks "' + label + '"'` (`:10686`).
3. **No emoji in operator-facing copy** (§5.7). The legacy app carries emoji in page titles, toasts,
   badges and nav labels. Emoji do not translate, do not read on a screen reader, and are part of
   defect D7.
4. **`dir` goes on the document, not on a subtree.** Legacy scopes `dir` to `.sb` and
   `.settings-nav-col` only (`:7944`–`:7945`), deliberately, because page content was never
   translated. The rebuild mirrors the whole app.
5. `applyLanguage` uses `textContent`, which **irreversibly flattens** any translated element that
   contains child markup on the first Arabic toggle (`:7947`–`:7952`). React removes the mechanism;
   the lesson is that a translatable string is a string, never a fragment of markup.
6. Counts, dates, times, ids, plates, IBANs and money **do not reorder** in RTL. Numeric runs need
   bidi isolation. The *cell* aligns inline-start; the string does not reverse (`rtl.md`).
7. **The language choice must persist.** Today it lives in `DB.opsConfig.general.language`, reseeded
   to `'en'` on every load (`:2570`) — choosing Arabic and saving survives until the next refresh.

---


## 8. Data — every field the shell reads or writes

Sub-tab data belongs in the sub-tab specs. This is the shell's own contract, and it is what
mock-data-engineer (0.6) and utilities-engineer (0.5) build against.

**Derived** = computed by the app, never stored, never editable. Under §8.2 a derived value is not a
disabled input.

### 8.1 Route state

| Field | Type | Source | Derived | Notes |
|---|---|---|:--:|---|
| `route.path` | string | Browser URL | — | The single source of truth for both nav columns |
| `route.workspaceId` | `management` \| `operations` \| `financials` \| `support` \| `admin` | First path segment | ● | §3.8 rule 1 |
| `route.subTabId` | one of 34 | Second path segment | ● | §3.4 |
| `route.detailKind` | `corporate` \| `applicant` \| `ticket` \| `plan-editor` \| `entity` \| null | Third+ segments | ● | The 5 level-3 routes |
| `route.params` | record of string | Path params (`:corpId`, `:applicantId`, `:ticketId`, `:planId`, `:entityId`) | — | |
| `route.view` | string \| null | `?view=` search param | — | **A view is a control, not a level** (§3.8 rule 3) |
| `route.overlay` | `entity` \| `notifications` \| `account` \| null | `?entity=` / `?notifications=` / `?account=` | ● | The shell layers, §4.3. One at a time |
| `route.isBleed` | boolean | `detailKind === 'plan-editor'` | ● | The only screen that unmounts the shell (§3.10) |
| `route.shape` | `single` \| `detail` \| `bleed` \| `monitor` | Route table | ● | §3.10 |
| `route.showsBackArrow` | boolean | `shape` is `detail` or `bleed` | ● | Replaces the legacy `navStack.length` test (`:7005`) |

### 8.2 Identity and session

| Field | Type | Source | Derived | Notes |
|---|---|---|:--:|---|
| `session.userId` | string | Auth (**Q2**); legacy `CURRENT_USER_ID` | — | 5 seeded operators, `USR-1`…`USR-5` (`:2830`–`:2841`) |
| `session.name` | string | `teamUsers` client | — | Avatar, account menu, audit actor |
| `session.role` | `Owner` \| `Ops Manager` \| `Finance` \| `Support` | `teamUsers` | — | `TEAM_ROLES` (`:10501`). Two further roles proposed — **Q3** |
| `session.landingRoute` | string | Role → default workspace map (§3.3) | ● | Falls back to `/operations/overview` |
| `session.permissions` | string[] | `teamUsers[].permissions` | — | 13 broad keys (`:3225`–`:3239`) |
| `session.subTabPerms` | record of subTabId → string[] | Derived from broad permissions | ● | **34 entries required** (§11.3). Today `PAGE_PERMISSIONS` has 22 of 41 pages |
| `session.isImpersonating` | boolean | Impersonation state | — | Drives the shell banner (§4.2) |
| `session.claimedCount` | integer | `DB.ownership` rows where `claimedBy === userId` and not expired | ● | The `✋ N mine` chip |

### 8.3 Shell UI state

| Field | Type | Source | Derived | Notes |
|---|---|---|:--:|---|
| `ui.subTabNavCollapsed` | boolean | Operator, persisted; seeded from viewport at first run only | — | §3.9. Persistence mechanism is **Q1** |
| `ui.breakpoint` | `1280` \| `1440+` | Viewport | ● | **D2.** One number, designer-set, used for the nav default and the right-rail drop |
| `ui.language` | `en` \| `ar` | `opsConfig.general.language` | — | Reseeded to `en` on every load today (`:2570`) — **must persist** |
| `ui.dir` | `ltr` \| `rtl` | `language === 'ar'` | ● | Set on the document, not on a subtree |
| `ui.saveBar` | `clean` \| `dirty` \| `dirty-invalid` \| `saving` | Active route reports it | ● | §2.3 |
| `ui.saveBarLabel` | string | Entity-specific (`Unsaved plan`) or `Unsaved changes` | ● | §2.3 |
| `ui.toasts` | queue | `toast()` calls | — | 357 call sites today |
| `ui.banners` | list, **merged to one with a count** | Standing conditions | ● | §5.2 |
| `ui.notifUnread` | integer | Count of unread notifications | ● | Bell badge; **no badge at zero** |
| `ui.feedAge` | seconds | The one tick engine (`:11968`) | ● | Drives the §8.1.3 stale / dead feed states |

### 8.4 Navigation counts

| Field | Type | Source | Derived | Notes |
|---|---|---|:--:|---|
| `nav.subTabCount[subTabId]` | integer \| null | One count per sub-tab that owns a backlog | ● | 17 exist today across 30 rail items (§B) |
| `nav.workspaceCount[workspaceId]` | integer \| null | Sum of its sub-tabs' counts | ● | §3.9. **Must not be suppressed when the sub-tab list is collapsed** — it is then the only signal |
| `nav.badgeTone[subTabId]` | `attention` \| `neutral` | Whether the backlog is actionable | ● | Legacy `.sb-badge a` / `.sb-badge n` (`:491` vs `:502`) |

### 8.5 Route-table shape — the contract 0.7 implements

One row per destination. This is **data, not code**: QA diffs it against §3.4 and §3.5.

| Field | Type | Notes |
|---|---|---|
| `subTabId` | string | Unique. 34 of them |
| `workspaceId` | enum of 5 | Exactly one |
| `path` | string | Canonical route; unique |
| `order` | integer | Display order within the workspace |
| `views` | string[] | Index view tabs. **Controls, not levels** |
| `detailRoutes` | route[] | Zero or more level-3 routes; each names its parent `subTabId` |
| `legacyPageIds` | string[] | **The merge register as data.** Every one of the 41 census ids appears in **at least one** row's array, except `interventions`, which appears in none. This is what AC-04 checks and what global search uses to resolve a legacy name (§4.3.4). *(Corrected after 0.6: this said “exactly one”, which the merge register itself makes impossible — seven census pages are* Split *across 2–3 rows in §3.6. **AC-04**'s “at least one” is the binding wording.)* |
| `legacySettingsPanes` | string[] | The 21 legacy settings pane keys, on the rows that own them — 17 under Admin, 4 under Financials. **AC-15** walks the route table looking for all 21, which is unsatisfiable without this field. *(Added in 0.6; §8.5 did not list it.)* |
| `titleKey` / `subtitleKey` | i18n key / nullable | Every sub-tab has a title key |
| `pattern` | enum of 10, one or more | The §6.4 row(s) — a merged sub-tab may carry two |
| `shape` | enum of 4 | §3.10 |
| `permission` | `{ key, level }` \| null | §11. Every one of the 34 needs one — **Q4** |

---

## 9. States

### 9.1 The four base states, at shell scope

| State | Trigger | What the operator sees |
|---|---|---|
| **Content** | A route resolved and its screen mounted | Rail, sub-tab list, top bar, content |
| **Empty** | Not applicable to the shell itself — 5 workspaces always exist and the smallest has 5 sub-tabs | The one real case is permission filtering: see `workspace-all-hidden` below |
| **Loading** | Shell booting: identity, permissions and nav counts unresolved | Rail and sub-tab list render with their **structure** and skeleton count badges. Workspace and sub-tab **labels are static** and render immediately — they come from the route table, not the network, so the nav is never a skeleton. The content region shows the route's own skeleton. |
| **Error** | Identity or permissions could not be loaded | Page-scoped `ErrorState` in the content region, **shell intact**, retry as an imperative. The operator can still see where they are. The shell never renders a blank screen. |

### 9.2 Shell domain states

Each needs a design and fixture data.

| State | Trigger | What the operator sees |
|---|---|---|
| `route-not-found` | Unknown path — including every `interventions` variant (§3.11) | `ErrorState` in the content region. Shell intact, last valid workspace still selected. Not a redirect, no URL rewrite. |
| `route-forbidden` | Route resolves, role lacks the permission | Forbidden state naming the permission required and who can grant it. **Not** a redirect and **not** a toast (§11). |
| `page-error` | A sub-tab's own data load failed | The sub-tab renders its `ErrorState`; **rail, sub-tab list and top bar keep working**, and the operator can navigate away without reloading. The single most important shell behaviour — **AC-24**. |
| `page-partial-failure` | The list loaded; one row's action failed | Row-scoped error. Not a page banner, not a toast alone. |
| `dirty` | Active route reports unsaved changes | Top bar **replaced in place** by the save bar, same height, no layout shift. Nav columns stay mounted and are **not** dimmed. |
| `dirty-invalid` | Dirty, but nothing valid to save | Same bar; `Save` greyed, `Discard` enabled. |
| `save-in-flight` | Save submitted, unresolved | `Save` shows progress and is not re-triggerable; `Discard` disabled for the duration. |
| `save-failed` | Save rejected | Form stays dirty, save bar stays up, page-level critical banner names the count and the fix (§4.4). A toast alone is insufficient — R10, the condition outlives the toast. |
| `navigate-away-dirty` | Route change attempted while dirty | Intercepted, with a modal naming what is lost. Never a silent discard; never a toast as the only guard. |
| `nav-collapsed` | Sub-tab list collapsed (**D2**) | The rail's disclosure is the only route to sibling sub-tabs, and the workspace tile's count badge is the only backlog signal. Both must remain legible and keyboard-reachable. |
| `overlay-open` | A shell layer is open (§4.3) | The workspace behind stays visible and readable — **no scrim** (§5.5). The rail keeps highlighting the workspace the operator is in. |
| `overlay-loading` / `overlay-error` / `overlay-not-found` | The layer's entity is loading, failed, or does not resolve | Skeleton shaped like the profile's card stack · error with retry · `No record found` naming the id that was searched. The **not-found** case is live today for 5 of the 11 entity types (§4.3.1). |
| `impersonating` | Acting as another user | Full-width undismissable banner above the top bar, naming who is being impersonated and offering exit. |
| `call-active` | A call is in progress | Persistent call bar. Survives every route change. Dismissible only by ending the call. |
| `feed-stale` | The one clock has not ticked within its window | §8.1.3. The live dot stops; the freshness line says how old the data is, in words. |
| `feed-dead` | Feed lost entirely | §8.1.3. The monitoring surface stops claiming to be live. |
| `offline` | No connectivity | One shell banner (§5.2 merge rule). Mutations disabled with the reason named, not silently failing. |
| `role-switched` | Acting user changed mid-session | Rail, sub-tab list and every count re-derive. A route now forbidden shows `route-forbidden`, **not** a silent redirect that loses the operator's place. |
| `workspace-all-hidden` | Every sub-tab in a workspace is hidden for this role | The workspace tile is not rendered in the rail. A deep link into it shows `route-forbidden`. |
| `language-switching` | `en` ⇄ `ar` | `dir` flips on the document; layout mirrors; the operator stays on the same route, same view, same scroll position. |
| `notif-unread-zero` | No unread notifications | **No badge.** Not a `0`. |

---

## 10. Acceptance criteria

Numbered, independently checkable, phrased so QA can pass or fail each without asking me. Verified in
step 0.8, before any sub-tab is built.

### Navigation and routing

**AC-01** — The rail renders exactly 5 workspace targets: Management, Operations, Financials,
Customer Support, Admin.

**AC-02** — `Admin` is the last rail item and stays fixed at the bottom of the rail; the other four
sit as one group above it.

**AC-03** — The route table contains exactly **34** sub-tab rows, distributed 5 / 9 / 7 / 6 / 7 across
the five workspaces, and every `path` is unique.

**AC-04** — The union of every route-table row's `legacyPageIds` equals the 41 page ids in
`GROUND-TRUTH-INVENTORY.md` §A **minus `interventions`** — 40 ids, each appearing in at least one row.
No census id is absent. `interventions` appears in no row, and no route resolves to it.

> **Read “row” strictly (clarified in 0.6).** The route table has more rows than it has sub-tabs.
> The **34 sub-tabs cover 37** of the 40; `profile`, `notifications-all` and `my-account` are shell
> layers, not sub-tabs, and they carry the remaining three. Anything that counts only sub-tab rows
> and expects 40 is testing the wrong set. `clients/routes.test.ts` asserts **both** numbers so the
> gap stays visible.

**AC-05** — Selecting each of the 5 workspaces in turn shows a sub-tab column whose rows are exactly
the sub-tabs listed for it in §3.4, in the order given.

**AC-06** — Every workspace's first sub-tab is `Overview`, and selecting the workspace tile navigates
to it.

**AC-07** — Signing in as each of the four roles lands on that role's workspace per §3.3: Owner →
`/management/overview`, Ops Manager → `/operations/overview`, Finance → `/financials/overview`,
Support → `/support/overview`.

**AC-08** — Navigating by any means other than clicking a nav row — a link in a table cell, a metric
tile, a notification, the global search, browser Back — leaves the rail and sub-tab list highlighting
the **destination** route, never the origin. Verified on at least one navigation of each of those
five kinds. *(This is the `go(id, el)` / 80-null-call-sites defect, D-L2; the route-derived model must
make it unreproducible.)*

**AC-09** — Loading `/operations/people/applications/APP-2201` directly in a fresh tab highlights the
**Operations** tile and the **People** row.

**AC-10** — Loading `/operations/requests?view=instant` in a fresh tab highlights **Operations →
Requests** and opens the *Instant* view. Changing the view changes the URL and does not change either
nav column's highlight.

**AC-11** — Browser Back after three navigations returns through the three previous routes in order,
with both nav columns following. Browser Forward returns to the deepest route.

**AC-12** — Loading `/nonsense/route` renders the not-found state inside the content region with the
rail, sub-tab list and top bar all present and interactive. The URL is not rewritten.

**AC-13** — On `/financials/pricing/plans/1/edit`, neither the rail, the sub-tab list, nor the app top
bar is in the DOM. A bar carrying an exit control, the plan name, its status badge and a `Save` is
present. Activating exit returns to `/financials/pricing` with both columns restored and
`Pricing & Plans` selected.

**AC-14** — On `/operations/dispatch` the rail, the sub-tab list, the app top bar and the page header
are all present, and the content region occupies the full remaining width with no max-width cap.

**AC-15** — Every one of the 21 legacy settings pane keys is reachable: 17 through one of Admin's
seven sub-tabs and 4 through a Financials sub-tab, per §3.7. A test that walks the route table finds
all 21 and none twice.

**AC-16** — Every metric tile on every `Overview` sub-tab has a click target that navigates to a
route in the route table. Zero tiles are inert. *(Baseline: the legacy exec page's tiles are
explicitly not clickable.)*

### The shell

**AC-17** — The top bar, rail and sub-tab list are present on every route except
`/financials/pricing/plans/:planId/edit`.

**AC-18** — The rail, sub-tab list and top bar are not remounted by navigation: a counter incremented
in each region's mount effect reads 1 after twenty route changes.

**AC-19** — The rail, the sub-tab list and the content region scroll independently: scrolling the
content region to the bottom leaves the other two scroll offsets unchanged.

**AC-20** — Opening the 360° profile layer from a table link on `/support/tickets/TKT-505` adds
`?entity=<id>` to the URL, leaves `/support/tickets/TKT-505` visible behind it with no scrim, and
keeps the **Customer Support** tile highlighted.

**AC-21** — Browser Back with a shell layer open closes the layer and stays on the same underlying
route. A second Back leaves the route.

**AC-22** — Opening a second shell layer closes the first. At most one of `?entity`, `?notifications`
and `?account` is present in the URL at any time.

**AC-23** — A toast raised on `/operations/people` is still visible after navigating to
`/financials/revenue` within its dismiss window.

**AC-24** — When a sub-tab's data load fails, it renders its error state **and** the rail, sub-tab
list and top bar remain interactive: clicking another sub-tab navigates successfully without a
reload.

**AC-25** — Selecting rows in an index table, then navigating away and back, shows zero rows selected
and the column headers restored.

**AC-26** — A nav count badge renders when the count is ≥ 1 and renders nothing at all when the count
is 0 or null. No badge anywhere in the shell displays the character `0`.

**AC-27** — A workspace tile's count equals the sum of the counts on that workspace's sub-tab rows,
~~and the tile's badge is still rendered when the sub-tab list is collapsed.~~
**The count clause stands verbatim.** The second clause is **void — D5**: the list is never
collapsed, so there is no state in which the tile badge is the only signal.

**Amended (V6):** the tile's count rolls up; **its tone does not.** `workspaceBadge` returns
`neutral` unconditionally. A tile sums about seven rows, so one toned row in seven turned the
whole tile amber — measured on the running build at 1440, 8 of 11 visible nav badges were
warning, including 4 of the 5 rail tiles. A tile's number is a **sum of heterogeneous
queues** (three applications, four expiring documents, one dispute) and a sum of different
kinds of thing has no single status to report. Only the row knows what its number means.
This **supersedes Q12**, whose invariant was sound and still amplified.

**AC-28** — Exactly one `setInterval` is registered by the application. A surface that is not on the
current route performs no render work when the clock ticks.

**AC-29** — Exactly one live region exists in the document, and the result of an asynchronous
mutation is announced through it. *(Baseline: `aria-` appears zero times in the legacy file.)*

**AC-30** — Global search for a legacy destination name — `Renewal pipeline`, `Quick rides`,
`Cancellation policy`, `All pending applications` — returns the destination it moved to, resolved
through `legacyPageIds`. Four searches, four correct destinations.

### Viewport — D2

**AC-31** — At 1280 px wide the shell renders with no horizontal scrollbar on any of the 34 sub-tabs,
and the content region is at least as wide as the widest index table's minimum legible width.

**AC-32** — ~~At 1280 px the sub-tab list defaults to collapsed; at 1440 px it defaults to expanded.~~
**VOID — `DECISIONS.md` D5.** The sub-tab list does not collapse, so there is no default to
derive and nothing a resize could re-toggle. What replaces it: **the column is present on
every route at every width**, which `AppLayout.test.tsx` asserts directly. The four
shell-level tests that covered this in `qa.shell.test.tsx` are qa-engineer's to re-cut or
delete. ~~Resizing the window between the two after first run does not change the state the
operator last chose.~~

**AC-33** — **VOID — `DECISIONS.md` D5**, and this is the one deletion that is a net gain
rather than a trade. AC-33's second clause was the shell's **only failing criterion**, and it
failed on the unanswered **Q1** (what persists across a reload). Removing the collapse removes
the gap rather than hiding it: **no criterion in the shell now waits on Q1.** Original text
follows, struck.

~~Collapsing the sub-tab list, navigating to three different routes, and reloading leaves it
collapsed. Expanding and reloading leaves it expanded. With it collapsed, the rail's disclosure opens
a popover listing the same sub-tabs in the same order.~~

**AC-34** — On a level-3 detail route below the designer's breakpoint, the right rail's cards restack
beneath the main column and no content is clipped or lost. ~~The same breakpoint value governs
**AC-32**.~~ AC-32 is void (D5); `--ev-bp-wide` now has two consumers, this one and the
metric-tile grid, and it is still one number used everywhere.

### The four states

**AC-35** — Every one of the ten §5.1 patterns has a loading skeleton whose column or card structure
matches its content, and none renders a centred spinner.

**AC-36** — With the mock client forced to fail, every shell region that reads data renders an error
state naming a retry action. The failure is induced without editing source (0.6 failure injection).

**AC-37** — An index table filtered to zero results shows the `no-match` empty state with a
clear-filters action, and shows no illustration and no heading.

**AC-38** — An index table with zero records ever shows the `first-run` empty state with an
illustration, a heading, a body and at least one action.

**AC-39** — No error message in the shell contains the words "please", "invalid" or "failed", and none
assigns blame to the operator.

**AC-40** — Rendering the shell while impersonating shows exactly one full-width banner. Rendering it
while impersonating **and** offline shows exactly one banner carrying a count, not two banners.

**AC-41** — A row action that fails renders an error scoped to that row; the other rows remain
interactive and no page-level banner appears.

**AC-42** — Opening the profile layer for an id that does not resolve shows a `No record found` state
naming the id searched, inside the layer, with the layer still dismissible.

### Tables

**AC-43** — In every index table, the first data cell is a link that navigates to that record's
detail route or opens its profile layer.

**AC-44** — In every index table, currency, numeric and count columns are right-aligned and their
header shares the value's right edge.

**AC-45** — In every index table, exactly one column header shows a sort indicator, and no other
header shows a sort affordance at rest.

**AC-46** — Selecting a row replaces the column header row with an `N selected` count and shows the
bulk action bar inside the table card. Deselecting all restores the column headers and removes the
bar.

**AC-47** — Activating search on an index table replaces the view-tab row in place with no vertical
shift of the rows beneath it. `Cancel` restores the previous view with its filters intact.

**AC-48** — On the four ledger sub-tabs (Revenue & Refunds, Payouts & Escrow, Cash & Captain Debt,
Rider Wallets): no selection checkbox column exists, no row kebab exists, no bulk action bar can be
produced, and no column header is clickable to sort.

**AC-49** — On those four sub-tabs, the first row is a labelled opening balance, the last is a
labelled closing balance, and the closing balance equals the balance shown in the card header.

**AC-50** — On a work-queue sub-tab with at least one breached item: one page-level banner states the
count and offers `Show only breached`; each breached row carries a leading-edge marker; and each
breached row's countdown reads `overdue <duration>` as text. Rendering the sub-tab in greyscale still
communicates which rows are breached.

### Forms and the save bar

**AC-51** — Making any change in the plan editor replaces the bar with the save bar at the same
height. The content below does not move by even one pixel.

**AC-52** — With the form dirty and invalid, `Save` is disabled and `Discard` is enabled.

**AC-53** — `Discard` returns every field to its last saved value and removes the save bar.

**AC-54** — Attempting to navigate away while dirty is intercepted with a modal that names what will
be lost. Cancelling the modal leaves the operator on the screen with changes intact.

**AC-55** — A failed save leaves the form dirty, the save bar up, and shows a page-level critical
banner naming the number of problems. A toast alone does not appear.

### Permissions

**AC-56** — Loading a route the current role cannot see renders the forbidden state naming the
permission required. The URL is not rewritten and no redirect occurs.

**AC-57** — A workspace in which the role can see no sub-tab does not render a rail tile.

**AC-58** — A sub-tab the role cannot see does not render a row in the sub-tab list.

**AC-59** — Switching the acting user re-derives the rail and sub-tab list within the same render
pass, and does not navigate the operator away from a route that remains permitted.

**AC-60** — Global search returns no result the current role cannot open — verified for a Support-role
search that would match a Financials destination and a Financials entity.

**AC-61** — Every one of the 34 route-table rows has a non-null `permission`, or is listed in a named
exceptions table with a reason. *(Baseline: 19 of 41 legacy pages have no permission entry at all.)*

### Keyboard and accessibility

**AC-62** — The first `Tab` from the document body focuses a visible "Skip to content" link;
activating it moves focus into the content region.

**AC-63** — Every rail tile and every sub-tab row is reachable by keyboard and shows a visible focus
indicator. No focusable element in the shell sets `outline: none` without a `focus-visible` ring.

**AC-64** — Arrow keys move focus within the rail and within the sub-tab list; `Tab` moves between the
two columns and then into the content region. The order is: the rail's four workspace tiles → the
pinned Admin tile → the sub-tab list → top bar → content.

*(Amended twice. After 0.2, because §3.9 required the disclosure to be both "in the rail" and
"in the tab order in the column's place" and those cannot both hold. **Amended again by
`DECISIONS.md` D5: the disclosure is deleted, so it is not in the order, and design finding
F-3 — which decided where in the rail to put it — goes with it.** The constraint that
actually matters is unchanged and still holds: visual order, DOM order and tab order stay
identical (§7.3). The Eyvar wordmark in the rail is a real tab stop between the skip link and
the first tile; AC-64 does not enumerate it, which remains a recorded spec gap rather than a
defect.)*

**AC-65** — Every icon-only control in the shell has an accessible name: the 5 rail tiles, the back
arrow, the bell, the avatar, and the sub-tab list's collapse control.

**AC-66** — `Escape` closes the open shell layer, any menu, any sheet and any modal, and returns focus
to the control that opened it.

**AC-67** — Opening a shell layer moves focus into it, and closing it returns focus to the control
that opened it. Focus is **not** trapped: `Tab` past the layer's last control moves into the page
behind it and the layer stays open. *(Amended after 0.2. `DESIGN.md` §7.3.3 forbids a focus trap on
any surface without a scrim, and §5.5 forbids the scrim on these layers; §7 outranks an acceptance
criterion, so the original wording — "traps focus there until it closes" — is withdrawn rather than
implemented. The layers are deliberately non-modal: an operator reads a 360° profile while working
the queue behind it. If a future layer genuinely needs a trap, it needs a scrim first, and that is a
change to §5.5, not to this criterion.)*

**AC-68** — Row actions in every index table are operable by keyboard and visible without a pointer
hovering the row.

**AC-69** — With `prefers-reduced-motion: reduce` set, no element in the shell animates indefinitely.

### Arabic

**AC-70** — With the language set to Arabic, `dir="rtl"` is set on the document element, not on a
subtree.

**AC-71** — In Arabic, the rail and sub-tab list render on the inline-end side, the list's icons and
chevrons mirror, and no shell element retains a physical `left` or `right` offset.

**AC-72** — In Arabic, shell layers enter from the mirrored edge — inline-end, computed logically,
never a physical `right`. **The toast is exempt and must not mirror:** its region is centre-anchored
to the viewport, which is the fix for D7, so it has no horizontal direction to flip and its entry
transform is `translateY` only. *(Amended after 0.2 — the original wording was unsatisfiable once the
toast became centre-anchored. Baseline defect: the legacy toast's `translateX(28px)` was never
flipped, so Arabic toasts slid in away from their anchor. The fix is to **delete** that transform,
not to negate it — a toast that slides sideways is a defect in either language.)*

**AC-73** — In Arabic, money values, dates, ids and phone numbers read in the same character order as
in English; only their cell alignment changes.

**AC-74** — Every operator-facing string in the shell resolves through a key. Rendering the shell with
an empty Arabic dictionary shows the English fallback for every string and no raw key.

**AC-75** — No operator-facing string in the shell is assembled by concatenating a translated fragment
with a value. Interpolation is by named placeholder inside a single key.

**AC-76** — No operator-facing string in the shell contains an emoji character.

---

## 11. Permissions

Cross-reference: `docs/01-modules/00c-identity-permissions-and-audit.md`. The role × sub-tab
visibility matrix adopted under **D1** is `PROPOSED-STRUCTURE.md` §10.3 — 34 rows, four roles,
`● full · ◐ read-only · ○ hidden by default (grantable)`.

### 11.1 What exists

- **4 roles** — `Owner`, `Ops Manager`, `Finance`, `Support` (`TEAM_ROLES`, `:10501`), 5 seeded
  operators (`:2830`–`:2841`).
- **13 broad permission keys** (`PERMISSION_LABELS`, `:3225`–`:3239`), enforced by `requirePerm(key)`
  (`:3126`–`:3132`) at **131 call sites**. `can(key)` (`:3122`) is the pure predicate and has exactly
  **one** functional call site (`:3084`).
- **52 granular page permissions across 22 pages** (`PAGE_PERMISSIONS`, `:10564`–`:10651`), enforced
  by `requirePagePerm(pageKey, permKey)` (`:10680`–`:10688`).
- Every denial writes `logAction('permission_denied', …)` and raises a toast.

### 11.2 Who may see and do the shell

| Surface | Rule |
|---|---|
| The shell itself — rail, sub-tab list, top bar | Every authenticated operator. There is no role without a console. |
| A **workspace tile** | Rendered when the role can see **≥ 1** sub-tab in it. Otherwise not rendered at all (**AC-57**). |
| A **sub-tab row** | Rendered when the role holds the sub-tab's view permission. Otherwise not rendered (**AC-58**). Read-only (`◐`) sub-tabs **are** rendered, with their write actions disabled in place. |
| A **route** | Resolving to a sub-tab the role cannot see renders the forbidden state, names the permission and says who can grant it. **Never** a silent redirect: a redirect teaches the operator that the URL they were given is wrong, when the truth is that their role is. |
| **Global search** | Filtered to destinations and entities the role can open. A result the operator cannot open must not appear (**AC-60**). This is what finally makes `view_profiles` a real gate. |
| **The 360° profile layer** | Gated on `view_profiles`. It carries every PII surface in the product across all 11 entity types. |
| **Notification rows** | A notification routing to a forbidden destination renders **without** its navigation affordance rather than being hidden — the operator should know the event happened. |
| **My profile layer** | Every operator, for their own record only. Administering other users is Admin › Team & Access under `manage_team`. |
| **Action gating** | **Gate at render, not at commit.** A control the role cannot use renders **disabled in place** with its reason available (§2.2: *"Disabled actions MUST render greyed in place; do NOT hide actions that are merely unavailable"*), never enabled-then-refused. |
| **Compensation authority** | Support may write rider-wallet credits **only within their `compPolicy` cap** (`:15379`, 5 roles) — the one money action a support agent legitimately needs mid-call, and already policy-bounded. |

### 11.3 What D1 fixed, and what it did not

**Fixed by the structure.** `PROPOSED-STRUCTURE.md` §10.5 Problem 2 states the rule this spec adopts:
*"the new structure has 34 sub-tabs; every one gets an entry, and `view_profiles` becomes a real gate
on the profile drawer."* That closes revision 1's Q10 as a **rule**. The route table's `permission`
field (§8.5) is where it lives, and **AC-61** enforces it.

**Not fixed — still needs a human.**

1. **Which permission gates which of the 34 sub-tabs.** The rule is decided; the 34 values are not.
   19 of the 41 legacy pages had no entry to inherit from — including `fraud`, `rwallets`,
   `corp-detail`, `profile`, `applicant-detail` and `contacts` (`00c` §5.1). **Q4.**
2. **`manage_settings` is a bus factor of one.** 39 of 131 guards resolve to it and only `USR-1` holds
   it — dispatch radius, cities, security policy, the retention window, PDPL erasure execution.
   D1's own structure sharpens this: Admin › Operational Policy exists specifically so an Ops Manager
   can tune dispatch during a supply shortage without the founder, and that is impossible under one
   key. `PROPOSED-STRUCTURE.md` §10.5 proposes splitting it into `manage_ops_policy`,
   `manage_workspace` and `manage_data_governance`. **Q3.**
3. **Two roles the matrix assumes but the product does not have** — `Trust & Safety` and `Dispatcher`
   (`PROPOSED-STRUCTURE.md` §10.4). §13.1 R5 already flags the consequence: with 3 permissions, the
   Support role is not equipped for a suspension decision, so Safety & Incidents write actions stay
   Ops-Manager-gated and Support sees them read-only until the role exists. **Q3.**

Until Q3 and Q4 resolve, the shell **must** be built so that adding or changing a permission on a
route is a data change in the route table, not a code change in a screen.

---

## 12. Open questions

Revision 1 carried twelve. **D1 and D2 closed seven of them.** What follows is what genuinely still
needs a human.

### 12.1 Closed by D1 / D2 — recorded so nobody reopens them

| Was | Answer |
|---|---|
| Q1 — 41 pages or 34 sub-tabs? | **D1** — 34 sub-tabs, `PROPOSED-STRUCTURE.md` as written |
| Q2 — how does the rail highlight when `profile` is open? | The profile is a **shell layer**, not a destination; the rail keeps highlighting the workspace the operator is in (§4.3.1) |
| Q3 — is `fraud` a work queue? | **No.** It folds into Management › Risk & Signals, a read-and-route surface with no queue. Its §6.4 row changes to Metric tiles + chart cards (§3.4) |
| Q4 — where do `coverage`, `commitment`, `fairness` go? | Coverage and Commitment → Operations › Trip Assurance (M6). Fairness → Customer Support › Captain Fairness |
| Q5 — `audit-log` page vs the `activity` pane? | One surface: Admin › Activity Log absorbs both (§3.7) |
| Q8 — minimum viewport? | **D2** — 1280 px, with the collapse affordance and one designer-set breakpoint |
| Q10 — the 19 pages with no permission entry? | **Rule** decided: all 34 sub-tabs get an entry (§11.3). The 34 **values** are still open — now **Q4** below |

### 12.2 Still open

| # | Question | Who answers | Blocked until answered |
|---|---|---|---|
| **Q1** | **What persists across a reload, and in what?** `localStorage`, `sessionStorage`, `indexedDB` and `document.cookie` are **zero matches** in the legacy file. `ui.subTabNavCollapsed`, `ui.language` and per-table view state all need somewhere to live. Real API, or a persisted client store as a stopgap? *(Same question as `PROPOSED-STRUCTURE.md` §13.2 item 1, which D1 adopted without answering.)* | Engineering lead, with mock-data-engineer (0.6) | **AC-33** and the `ui.language` persistence requirement. The shell can ship in-memory and fail AC-33 explicitly, but that must be a recorded gap, not a surprise. |
| **Q2** | **Is authentication in scope?** No auth surface exists among the 41 pages; `DB.loginSessions` is a settings display. `session.userId` and `session.role` have no source — and under D1 the role now determines the **landing workspace** (§3.3), so a mocked role is no longer cosmetic. §2.5 D specifies auth-page anatomy, so `DESIGN.md` anticipates it. | Business owner, with the engineering lead | **AC-07**. The shell can read a mocked session; a real one changes the boot sequence and adds a route outside `AppLayout`. |
| **Q3** | **Does adopting `PROPOSED-STRUCTURE.md` "as written" adopt its §10.4 and §10.5 *recommendations* too?** Those sections propose two new roles (`Trust & Safety`, `Dispatcher`) and splitting `manage_settings` into three keys. They read as recommendations inside the adopted document, not as part of the IA — but §10.3's visibility matrix and §13.1 R5's mitigation both assume they exist. | Business owner | §11.2's visibility rules are written against 4 roles. Adding roles changes which workspace tiles render for whom, which is a **shell-level** change — so this one touches 0.7, not just a sub-tab spec. |
| **Q4** | **Which permission gates each of the 34 sub-tabs?** The rule is settled (§11.3); the 34 values are not, and 19 legacy pages had nothing to inherit. | Business owner, with whoever owns identity | **AC-61**, and the `permission` field on 34 route-table rows. The shell must ship the unresolved ones as `null` with a recorded gap — today every one of those surfaces is visible to every role. |
| **Q5** | **Does shadcn `chart` satisfy the "no imported design language" rule?** `components.md` forbids charting libraries with built-in themes. shadcn `chart` wraps Recharts and is CSS-variable driven, which looks compliant but must be verified before 0.4 freezes `components.json`. | frontend-engineer (0.4) | Five `Overview` sub-tabs plus Performance and Risk & Signals. If it fails, a chart primitive must be built — a Phase-0-sized task nobody has budgeted. |
| **Q6** | **Is the rail built, or adopted from shadcn `sidebar`?** §5.4. | product-designer (0.2) proposes, frontend-engineer (0.4) responds | Nothing blocks, but the answer must land **inside 0.4** — `components.json` is frozen afterwards and Phase 1 may not run the CLI. |
| **Q7** | **Which of the four pricing models is the real one?** `DB.plans`, the `PLANS` / `CADENCE_META` constants used by the new-sub and renewal flows, `DB.quickRideTypes` + surge, and `DB.rateCard`. They disagree on commission: escrow embeds a flat 20 %, the history builder hardcodes 20 %, the rate card says 22 % on-demand, and per-plan `commission` is editable per plan. **We are computing captain earnings four different ways.** *(`PROPOSED-STRUCTURE.md` §13.2 item 2.)* | Finance lead, with the business owner | **Financials › Pricing & Plans** — the one sub-tab that exists *specifically* to put all four models on one screen (§3.7). Until Finance names one, that sub-tab is a museum of options and its spec cannot be written. This is the only one of the seven merges with a blocker of its own. |

### Raised in 0.6, when the data layer had to produce real values

These are not architecture. Each is a product rule that the fixtures had to guess at, and a guess in
a fixture becomes a guess on screen.

| # | Question | Owner | Blocks |
|---|---|---|---|
| **Q8** | **What is `all-pending`'s SLA target?** The work-queue pattern (§8.4) requires a clock, and `all-pending` has none in the legacy app. `Applicant.slaDueAt` is nullable and the fixtures use **48 h** as a placeholder. The window is a product commitment, not a fixture detail. **0.5 raised the same gap independently (U-3) and refused to synthesise a denominator** — that is precisely the legacy `/90` bug at `:11652`. Concretely: callers pass `startedAt: applicant.appliedAt`, and any queue with no natural start needs its own `targetMinutes` on the row. With neither, the SLA band stays `neutral` and no track renders. | product-owner, with mock-data-engineer | Wave 2 — the SLA column on Operations › Requests |
| **Q13** | **What is the ledger's sign convention?** Is a debit a negative `amount`, or a positive amount with a `direction` field? No wallet or posting type exists in `src/data/types` yet, so 0.5 **declined** to build the debit/credit splitter rather than guess — correctly, since the guess would be invisible until money rendered backwards. One hour's work once the type lands. | mock-data-engineer, then utilities-engineer | Wave 3 — all seven Financials sub-tabs |
| **Q9** | **Can a rider with a negative wallet still book?** `RDR-4001` sits at −41.50 SAR after a chargeback. Nothing in the census says whether that blocks a ride, warns, or does nothing. | product-owner, with Finance | Wave 1 — the rider detail's wallet card and its badge tone |
| **Q10** | **Subscriptions: does the operator read `status` or the date?** *Expiring ≤ 7 days* filters on `endsOn`, but `status` is stored separately, so `SUB-1052` appears in that view wearing an `Active` badge. Both are true; only one is what the operator should act on. | product-owner | Wave 1 — Operations › Subscriptions views |
| **Q11** | **What makes a subscription `At risk`?** The filter offers the value; nothing in the legacy app produces it. | product-owner | Wave 1 — same view set |
| ~~**Q12**~~ | **ANSWERED, then SUPERSEDED by V6** (`design/00-shell.md`). A **workspace tile is never toned** — `workspaceBadge` returns `neutral` unconditionally, and the tile's number is a **sum**, which is a quantity with no status. Q12's invariant was sound (*any tone on a tile must be explained by a visible row with the same tone and a non-zero count*) but it **amplifies**: a tile sums ~7 rows, so one toned row in seven turns the whole tile amber — measured at 8 of 11 visible badges warning, including 4 of the 5 rail tiles. **Tone now lives only on the sub-tab row, and only for a breach.** The fixture is re-toned to match: 9 of 34 → 2 of 34, with `src/data/fixtures/navCounts.test.ts` failing the build if a third appears. The `count > 0` gate survives where it still applies. | — | Closed — see `design/02-visual-refinement.md` V6 |

---

## 13. Findings — current behaviour, suspected defects

Recorded so nobody spec's them as correct and nobody "fixes" them by accident. **`docs/ref/defects.md`
already carries D1–D24**; these are additional, found while writing this spec, and are numbered
`D-L*` to avoid colliding with that list.

| # | Current behaviour | Why it looks wrong | Evidence |
|---|---|---|---|
| **D-L1** | The top bar's `✋ N mine` chip counts items the operator is holding across the work queues and navigates to **Support Center**. | The count comes from the ownership model that drives the work inbox; the destination is a different page in a different workspace (Customer Support, not Operations). | `:566` — `onclick="go('support',null)"` on `#my-work-chip`. Independently recorded at `03b` §17.6. |
| **D-L2** | `go(id, el)` sets the active nav item from the **clicked element**. **80 call sites pass `null`.** | After any programmatic navigation the rail highlights the previous page. The operator's only wayfinding signal is wrong, silently, most of the time. | `:8783`; `grep -c "go('[a-z-]*',null)"` → 80 |
| **D-L3** | `findSbEl(id)` recovers the nav element by **string-matching the `onclick` attribute** for `'<id>'`. | It is a substring match over an attribute, so it depends on quoting style and would match any handler mentioning the id. Back navigation's highlight rests on it. | `:7007`–`:7011`, used by `goBack()` at `:7016` |
| **D-L4** | There is no URL. `location.hash`, `history.pushState`, `popstate` and `window.location`: **zero matches file-wide.** | No screen can be linked, bookmarked, reloaded or opened in a second tab, and the browser Back button leaves the application. Reported here as scope, not blame — but it means "migrate the existing routes" is not a task that exists. | direct grep |
| **D-L5** | `navStack` is capped at 40 and **silently `shift()`s its oldest entry**. | Back stops working after 40 navigations with no signal to the operator. | `:7006` |
| **D-L6** | `go('settings')` fires **33 render functions in one branch**, and `switchSettingsTab` then only toggles visibility. | Opening any settings pane pays the cost of rendering all 21. The route model in §3.9 changes this deliberately. | `:8819`; recorded independently at `16j` §12.5 |
| **D-L7** | `support` has **two router branches and both run**: `:8789` calls `renderSupportTeam()` and `:8806` calls four more renderers. | A page rendered twice per navigation. Already flagged in `GROUND-TRUTH-INVENTORY.md` §D. | `:8789`, `:8806` |
| **D-L8** | Eleven rail badges render the literal `0` at boot. | A badge that is always present carries no information. §2.1 reserves count badges for actionable backlogs. | `:491`, `:492`, `:496`, `:508`, `:514`–`:518`, `:523`, `:533` |
| **D-L9** | **`aria-` appears zero times in 21,857 lines.** | No landmarks, no live regions, no accessible names on 355 distinct click handlers, no table semantics. §7.4 and §7.5 are unimplemented in their entirety. | direct grep; §7.4.1, §7.5.1 |
| **D-L10** | `my-account` has **two entry points in two different chrome regions**: the rail footer identity block and the top-bar avatar. | Two routes to one screen from two nav surfaces is drift, and it is the kind that multiplies. | `:544` and `:577` |
| **D-L11** | The six settings group headings visible at runtime are created by JS with `data-i18n` keys the census's markup grep never sees. | The census's 86-key count is 7 short. Any i18n coverage audit built by grepping markup will report those seven as absent and the three dead markup-group keys as live. | `:21296`, `:21307`; keys exist at `:7914`–`:7915`; `GROUND-TRUTH-INVENTORY.md` §G |
| **D-L12** | Rendering the work inbox **mutates state**: the ownership stale sweep runs as a side effect of *reading* ownership, writing audit rows up to three times per item every 20 seconds. | A read that writes. Already named in §8.4.1; repeated here because the shell owns the clock that drives it. | `:18865`–`:18875` |

**Deviation-status change requested, not a defect:** `DESIGN.md` §6.3 **D3** — *"Settings is a route,
not an overlay"* — must be reclassified from defect to sanctioned when the new D-4 entry is written
(§3.11). It is now a decision.

---


**Status of these findings under D1.** All twelve stand. `interventions` being retired (§3.11) does
not close any of them — none was about that page. Two are closed *by construction* if the shell is
built as specified and are therefore acceptance criteria rather than open bugs: **D-L2** (the
`go(id, el)` highlight, killed by the route-derived model, **AC-08**) and **D-L3** (`findSbEl`'s
`onclick` substring match, which has no equivalent once nav state comes from the route). The rest are
inherited behaviour that the sub-tab specs must each address.

**Deviation-status changes requested, not defects:** `DESIGN.md` §6.3 **D3** — *"Settings is a route,
not an overlay"* — must be reclassified from defect to sanctioned when the new D-4 entry is written
(§3.12). And §6.4's `fraud` row changes pattern (§3.4). Both are decisions now.

---

## 14. Handoff

**Artifact:** this file, revision 2. Supersedes revision 1 in full; revision 1's §3 must not be cited.

**Next:** product-designer, step 0.2 — design spec for the two-level navigation, the page shells,
table anatomy, form anatomy, and the restyle rules per primitive.

### Decisions product-designer must make and record

1. **The replacement D-4 entry**, naming every rule in §3.12 that it suspends, plus the
   reclassification of **D3** and the `fraud` **§6.4 pattern change**. All three are edits to
   `docs/06-design-reference/_partials/06-eyvar-mapping.md`, followed by
   `python docs/06-design-reference/build-design.py`. `DESIGN.md` is generated and never hand-edited.
   Must land **before 0.7 ships**.
2. **The one breakpoint** (**D2**). It governs both the sub-tab list's first-run default (§3.9) and
   the detail-page right-rail drop (§3.10). One number, used everywhere. **AC-32** and **AC-34** both
   test against it.
3. **Two-column geometry at 1280 px**, expanded and collapsed, and whether the rail is icon-only or
   icon-plus-micro-label. Five rail items instead of ten changes the calculus here.
4. **The five workspace glyphs.** All five candidates exist in the legacy rail: `:487`, `:498`,
   `:527`, `:533`, `:539`.
5. **The collapsed-state affordance** — the rail disclosure and its popover (§3.9), including how the
   workspace count badge reads when it is the only backlog signal.
6. **The shell-layer surface.** One overlay mechanism for three layers (§4.3), `sheet` per §5.5 with
   **no scrim**, plus the full-page escape for the profile. This is the highest-value single component
   in the rebuild — `openProfile` already has 100 call sites.
7. **Whether the rail is built or adopted from shadcn `sidebar`** (§5.4, **Q6**) — the answer must land
   inside 0.4, because `components.json` freezes there.
8. **Empty, error, forbidden and not-found copy** for every shell state in §9.2 — final in the design
   spec, never written by the engineer at build time.
9. **Banner tones**, and how the merged multi-condition banner renders its count (§5.2).

### Also for mock-data-engineer (0.6)

The route table (§8.5) is a **data artifact**, and its `legacyPageIds` field is the merge register in
machine-readable form. **AC-04** and **AC-30** both read it. It needs fixtures for: 4 roles × 34
sub-tab visibility (`PROPOSED-STRUCTURE.md` §10.3), the 11 profile entity types (§4.3.1 — five of
which have no resolver today), and inducible failure on every shell read (**AC-36**).

### What is blocked, and on whom

| Blocked | On | Who |
|---|---|---|
| `PHASE-PLAN.md` Phase 1 module table | Rewriting against 5 workspaces / 34 sub-tabs — it still lists 8 modules and 41 pages | Coordinator |
| The **Financials › Pricing & Plans** spec | **Q7** — which of the four pricing models is real | Finance lead |
| The **role → landing workspace** behaviour (**AC-07**) | **Q2** — is auth in scope | Business owner |
| **AC-33** (nav collapse persists across reload) | **Q1** — what persists, and in what | Engineering lead |
| **AC-61** (every sub-tab has a permission) | **Q4** — the 34 values | Business owner |
| Whether Admin › Operational Policy is usable by an Ops Manager at all | **Q3** — the `manage_settings` split | Business owner |

**Nothing above blocks 0.2.** product-designer can start on the strength of §3, §4, §6 and §7 today;
Q7 blocks one sub-tab spec, and Q1–Q4 block acceptance criteria rather than design.
