# Page Traceability Matrix

> **Purpose:** prove that all 41 current pages are accounted for in the proposed 5-tab structure. No page silently disappears.
> **Baseline:** `docs/00-index/GROUND-TRUTH-INVENTORY.md` §A — the 41 `.page` divs, in source order.
> **Proposal:** [`PROPOSED-STRUCTURE.md`](PROPOSED-STRUCTURE.md).

**Disposition vocabulary**

| Term | Meaning |
|---|---|
| **Keep** | Survives substantially intact as its own sub-tab, or as a level-3 detail screen. |
| **Merge** | Its content is folded into a sub-tab it shares with other pages, or split across more than one destination. Nothing is lost; the container changes. |
| **Retire** | Removed from the product. Reason stated. |

---

## 1. The 41-row audit

| # | Current page (`id`) | Src line | New location | Rationale | Disposition |
|---:|---|---|---|---|:---:|
| 1 | `exec-overview` | L583 | **Management › Overview** (KPI strip, financial position, subscription growth) + **Management › Performance** (trend charts, cities health, expansion-ready, rider engagement) | Today it is a read-only dead end: no tile is clickable and the page writes nothing to `DB`. As a workspace landing view it becomes the routing surface for the Owner. The trend/cities/expansion content is analysis at a different cadence and moves to Performance. ⚠ "Avg renewal rate" renders `NaN%` on shipped seed data (`01` §17.1) and "Active drivers" uses a no-op filter (`08a` §17.2) — both replaced. | Merge (split) |
| 2 | `corporate` | L634 | **Operations › Corporate Accounts** | Own sub-tab, not a view of Subscriptions, because a company is a different entity with its own detail screen. Placed in Operations on the evidence of its permission gates: 5 of 6 write actions require `manage_subscriptions` (L6518, L6640, L6652, L6716, L6752); only `commitSendCorpInvoice` requires `view_finance` (L6703). | Keep |
| 3 | `corp-detail` | L644 | **Operations › Corporate Accounts › Account detail** (level 3) | Already the detail of #2. Gains a nav entry it never had. Note it has no render branch in `go()` — it renders only because `openCorpDetail` calls `renderCorpDetail` directly (`05b` §19.12). | Keep |
| 4 | `fraud` | L650 | **Management › Risk & Signals** | Three computed signal cards (shared device/IP, referral self-abuse, unusual pairing) plus the identity-collision pre-migration audit. It has no work queue: every action is a suspend-and-navigate. Merged with Predictive into one early-warning surface. ⚠ No `PAGE_PERMISSIONS` entry exists for this page (`02b` §17.1) despite it exposing suspension power. | Merge |
| 5 | `dashboard` | L676 | **Operations › Overview** | The shift-start board becomes the Operations landing view, gaining the two ownership counters from the work inbox (`Overdue right now`, `Nobody owns`) that today live on a different page. ⚠ Two "interventions" counts currently disagree (`03a` §17.2) and must be reconciled. | Merge |
| 6 | `subscriptions` | L713 | **Operations › Subscriptions** | The master list and the four money/relationship levers (change driver, freeze, cancel & refund, settle). Renewal Pipeline folds in as a saved view. ⚠ The search box has no `id` and no handler (`05a` §19.1); `At risk` is an unreachable filter value; there is no exit from `Frozen`. | Keep |
| 7 | `live` | L768 | **Operations › Live Dispatch** (live mode + the 3-feed dispatch board) **and Operations › Trips › Route history** (history mode) | The page fuses two screens that share a canvas and nothing else: real-time dispatch, and replay of past trips. Dispatch is a live-ops job; route replay is trip forensics. The trip table is *disabled* in live mode, which is the tell. ⚠ ~120 lines of Leaflet/OSM code are dead — `renderLiveMap()` has no callers and `#map-leaflet` does not exist (`04` §17.3). | Merge (split) |
| 8 | `trips` | L848 | **Operations › Trips** | The flat ledger of every `DB.trips` record. Absorbs Quick Rides and Route History as views. ⚠ The `No-shows` KPI and its filter are dead — nothing writes a status containing "no-show" (`06a` §17.1). | Keep |
| 9 | `renewal` | L861 | **Operations › Subscriptions** — view *"Expiring ≤ 7 days"* | It **is** `DB.subscriptions` filtered to `ends` within 7 days of `EYVAR_TODAY` (L11232), scored by `subHealthScore()` (L14210). A date filter and a score column do not justify a separate page. ⚠ `renderSuccess()` writes no audit entry and no `DB.payments` record, so a completed renewal is invisible to both the Activity Log and Finance (`07a` §19.5). | Merge |
| 10 | `readiness` | L869 | **Operations › Trip Assurance** — view *"Departing next 24h"* | One of the three "will tomorrow's trip happen?" pages. Shares `DB.upcomingSubTrips` with Coverage and Commitment. ⚠ Despite the page copy, **no 24-hour filter is applied** (`07b` §7); trips never leave the board on departure (`07b` §16.9). | Merge |
| 11 | `drivers` | L887 | **Operations › People** — view *"Captains"* | The captain roster, supply KPIs and tier bands. Merged with onboarding and compliance because they write the same record. ⚠ `d.docStatus` is read in two places and **assigned nowhere**; no `DB.drivers` record has a `.status` field, so `status!=='pending'` is a no-op filter (`08a` §17.1–2). | Merge |
| 12 | `riders` | L907 | **Operations › People** — view *"Riders"* | Same screen shape as the captain roster: index + risk filter + drill-down. New sign-ups and the retention watchlist become cards within the view. ⚠ KPI tiles 2 and 3 count subscriptions, not riders (`09a` §17.5), and two page subtitles contradict each other. | Merge |
| 13 | `finance` | L928 | **Financials › Overview** (contribution margin) + **Financials › Revenue & Refunds** (revenue by plan, refunds ledger, credit notes) | The page answers four unrelated questions. Only one of its four surfaces is live: `contributionMargin()` (L15718). ⚠ **All seven KPI tiles are hardcoded strings** and contradict the table beneath them (KPI: net 9,246 / 19.2%; table: 8,752 / 18.1% — `12a` §17 R12). The tiles are retired; the card is promoted. | Merge (split) |
| 14 | `wallets` | L968 | **Financials › Payouts & Escrow** (payouts, escrow holds, deductions) + **Financials › Cash & Captain Debt** (cash reconciliation) | Four financial subsystems on one screen. The first three are one flow (earn → hold → release, minus penalties); the fourth is a collections and trust problem with its own four KPIs and an escalation path to Trust & Safety. Different work, different rhythm, arguably a different person. ⚠ `waiveDeduction` has no permission gate, no confirmation and no audit entry (`12b` §17 R1). | Merge (split) |
| 15 | `rwallets` | L1020 | **Financials › Rider Wallets** | The rider-side liability ledger. Kept whole. ⚠ No `PAGE_PERMISSIONS` entry exists for this page (`00c` §5.1) despite it being a money surface. | Keep |
| 16 | `plans` | L1030 | **Financials › Pricing & Plans** — views *"Subscription plans"* / *"Quick rides"* | Its two existing sub-tabs become views, removing a navigation level. Joined by the rate card and cancellation-fee matrix from Settings, so that **all four disjoint pricing models are visible on one screen** (`14a` §19.1) — which is the only way the contradiction gets fixed. | Merge |
| 17 | `plan-edit` | L1082 | **Financials › Pricing & Plans › Plan editor** (level 3) | The single-plan form. Gains a nav breadcrumb it never had. ⚠ The Status dropdown is a no-op; the vehicle Active checkboxes write immediately while everything else waits for Save; feature add/remove/reorder is entirely ungated (`14b` §19.1, 19.9). | Keep |
| 18 | `quickrides` | L1132 | **Operations › Trips** — view *"Quick rides"* | `DB.trips` filtered to `kind==='Quick ride'`. ⚠ **All four KPI tiles are hardcoded**, including their bar widths, and the "today" claim is false — `renderQuickRidesTable` applies no date filter (`06b` §17.1–2). The Review button writes nothing. Nothing is lost by making it a view; the fabricated tiles are lost deliberately. | Merge |
| 19 | `my-account` | L1151 | **Shell › My profile** drawer (from the avatar), administered under **Admin › Team & Access** | Profile, password, 2FA, active sessions and the 13-permission "what your role can do" summary. That summary is the only place an operator can see their own effective permissions and must survive. A per-user preferences screen is not a nav destination. | Merge |
| 20 | `notifications-all` | L1171 | **Shell › Notification centre** (expanded state of the topbar bell) | Priority-triaged, four tiers, six filter chips — the design is right. It should not compete with Subscriptions for a nav slot. ⚠ Type `alert` — the most common runtime type, 16 producers — has **no click destination**; types `renewal`/`approval`/`complaint` have full routing support and no producer; every read flag reverts on reload (`03c` §17). | Merge |
| 21 | `predictive` | L1190 | **Management › Risk & Signals** | Five early-warning domains (churn, driver availability, payment failure, repeat incidents, zone shortage). Every action button is a `go()` to another page (L14320, L14336, L14351, L14363) — it routes, it does not resolve. Merged with Fraud. | Merge |
| 22 | `coverage` | L1220 | **Operations › Trip Assurance** — view *"No backup captain"* | Structural exposure: which active subscriptions are a single point of failure. Shares `DB.subBackups` / `backupRegistry` with Commitment and `DB.upcomingSubTrips` with Readiness. **Deliberately not filed under "intelligence"** — it has two permission-gated write actions and a daily outcome. ⚠ The capacity grid is retired: `slotOf()` strips AM/PM without converting ("7:30 PM" → slot 07:30) and everything outside 06:00–08:30 collapses into 07:00 (`10c` §17.5, 17.7). | Merge |
| 23 | `compliance` | L1236 | **Operations › People** — view *"Compliance"* | Document expiry, the 30/7/0-day alert ladder and auto-suspension write to the captain record. Splitting them from the roster is what allowed `DRV-0106` to exist on the roster with **no `DB.driverDocs` entry** — invisible to `complianceScan()`, never auto-suspendable (`08a` §17.9). | Merge |
| 24 | `safety` | L1252 | **Customer Support › Safety & Incidents** | A case queue with a fixed four-step protocol and an SLA, worked 24/7 by the same people who work tickets. Its one ops side effect (precautionary suspension) is a captain-record action reachable from the 360° drawer in any workspace. ⚠ **No incident can be created**, **no closed incident reopened**, and **no precautionary suspension lifted** (`10e` §17.2–4). | Keep |
| 25 | `growth` | L1264 | **Management › Growth** (promos, referrals, captain incentives, bulk messaging) + **Management › Performance** (retention cohorts, CSAT/NPS) | Six unrelated surfaces bundled under one nav item. The four spend-to-acquire surfaces stay together; cohorts and CSAT are performance measurement stranded at the bottom of a promo page where nobody with a P&L scrolls. ⚠ **There is no promo redemption engine anywhere in the file**; `spent`/`uses`/`newSubs` are never incremented; `sendBulkMsg` sends nothing; cohorts and CSAT are hardcoded HTML (`11a` §17). | Merge (split) |
| 26 | `zones` | L1304 | **Management › Market & Zones** | Demand-vs-supply by district, momentum, hourly demand, steering offers, recruitment queue — joined by the expansion-ready list from the exec page, which is the same decision seen from the other side. ⚠ `demand`/`supply`/`failures30d` are never computed from live data and zones carry no geometry — the "map" is aspirational (`11b` §17.2–3). | Keep |
| 27 | `all-pending` | L1324 | **Operations › People** — view *"Applications"* | The full application list exists as a separate page only because the Drivers page shows the top 3. That is a view, not a page. Removes one navigation level from the KYC path. | Merge |
| 28 | `applicant-detail` | L1342 | **Operations › People › Applicant detail** (level 3) | The KYC review screen: personal data, vehicle-class cross-check, device fingerprint, bank details, per-document approve/reject, expiry capture. Genuinely a detail screen; gains a breadcrumb. ⚠ **Nothing blocks approval** — `approveDriver()` reads none of `docs`, `docNotes`, `docExpiry`, `bank.status` or the vehicle-class verdict (`08b` §17.5). ⚠ New driver ids can collide with the existing `DRV-0106`. | Keep |
| 29 | `support` | L1351 | **Customer Support › Tickets** (tickets card + `ticket-detail`) + **Customer Support › Disputes & Claims** (disputes + lost & found) + **Customer Support › Contact Centre** (support team roster) | Four independent cards on one page with two competing router branches — `support` is handled twice in `go()` (L8789 and L8806) and **both run** (`GROUND-TRUTH-INVENTORY` §D). Splitting by queue gives each an SLA view and a bulk bar. ⚠ Neither disputes nor lost-item cases can be **created** from the UI (`13b` §17.1–2). | Merge (split) |
| 30 | `ticket-detail` | L1380 | **Customer Support › Tickets › Ticket detail** (level 3) | Conversation thread, Call Center Guide script for the coded scenario, SLA strip, status actions. Correctly a full page rather than a modal. | Keep |
| 31 | `profile` | L1384 | **Shell › 360° profile drawer** — reachable identically from all five tabs | Not a page. It is the app's universal drill-down target: `openProfile` has **100 call sites**, the second-most-used handler after `closeModal`. Promoted to a detail layer over the current workspace. Must extend from 6 resolvable entity types to 11 (adding `tickets`, `pendingDrivers`, `corporateAccounts`, `newRiders`, `plans`) so global search stops returning "No record found" for ids that have perfectly good detail screens (`09b` §17.2). | Keep |
| 32 | `inbox` | L1392 | **Operations › My Work** | The deadline-ordered router over 12 queues, with claim/release/take-over. Its three design rules (the queues stay; sort by deadline not severity; route by role but never hide) are load-bearing. ⚠ `WORK_ROUTING` routes 11 of 12 queues to a role called `'Operations'` that **does not exist** in `TEAM_ROLES` (`03b` §17.1). ⚠ `#my-work-chip` in the topbar navigates to Support Center, not the inbox (`03b` §17.6). | Keep |
| 33 | `commitment` | L1397 | **Operations › Trip Assurance** — views *"Awaiting confirmation"* / *"Absences"* | Nightly captain confirmation, departure risk, the rolling absence counter and the route back. Third of the three "will tomorrow's trip happen?" pages; shares `DB.planConfirmations` and `DB.absenceEvents`. ⚠ The 21:00 confirmation deadline is **never enforced** — it exists only in display strings (`10b` §17.1). ⚠ Forfeiture is logged and never posted to any wallet, escrow or payout record (`10b` §17.7). | Merge |
| 34 | `fairness` | L1402 | **Customer Support › Captain Fairness** | Suspension appeals, rating disputes, captain-reported rider issues, plus captain economics (earnings per engaged hour). Filed under Support, not Fleet, because the source states every case is a coded ticket counting in CPT reporting (L15504, `logContact` L15516). In a subscription model one unfair report costs a captain a full week's income. ⚠ An upheld case has **zero downstream effect** beyond a status string (`10a` §17.4). | Keep |
| 35 | `contacts` | L1409 | **Customer Support › Contact Centre** | CPT by reason code with named root-cause owners, the call console, wrap-up coding and queue metrics. Today it has a sidebar entry but the page it most belongs next to (Support Center) is three rows away. ⚠ There is no CTI and no WhatsApp API; `onIncomingCall()` / `onInboundMessage()` are defined integration points with no external caller. ⚠ `DB.commLogs` is not used by this page at all (`13c` §17 G1). | Keep |
| 36 | `settings` | L1416 | **Admin** — dissolved into 6 groups + Activity Log; **4 tabs relocated to Financials** | 21 sub-tabs in one page is not configuration, it is a filing cabinet. `gateways`, `ledger`, `pricing` (rate card) and `cancelpolicy` are money objects with money owners and move to Financials. `general` + `branding` merge, deleting a real defect (two competing logo stores, never synchronised — `16a` §1). Full 21→7 mapping in §3 below. ⚠ `switchSettingsTab` renders nothing — all 21 renderers fire once on `go('settings')` (`16j` §12.5). | Merge (split) |
| 37 | `audit-log` | L2051 | **Admin › Activity Log** | The tamper record. Absorbs the 4-row Settings preview, whose description is factually wrong. ⚠ **135 of 161 distinct action keys (84%) have no label** and cannot be filtered — including `impersonation_started`, `account_suspended`, `erasure_executed`, `toggle_page_permission` (`00c` §5.3). ⚠ No export is permission-gated, so any operator can take the audit log off-platform (`00c` §5.4). | Keep |
| 38 | `interventions` | L2068 | **RETIRED.** Its one surviving card ("Live trip interventions") moves to **Operations › Live Dispatch**. | **The page retires itself.** Body copy at L2071–L2072: *"This page ran the same builder as the dashboard widget and rendered the same rows in two places — and at 59 items neither was a list anyone could work. That job now belongs to the work inbox."* No sidebar entry. **No `go('interventions')` call exists anywhere in 21,857 lines.** No URL router. Reachable only from the developer console (`13d` §2.2). The `refreshOwnershipSurfaces()` hook that names it is itself dead (guards on `renderInterventions`, a function that does not exist). | **Retire** |
| 39 | `requests` | L2079 | **Operations › Requests** | One queue for the two ways a rider asks for service: instant (auto-matched by the tick engine, ops intervenes on SLA breach) and subscription (manually matched against a payment hold). The two preview cards become one index with view tabs. | Keep |
| 40 | `requests-sub-all` | L2123 | **Operations › Requests** — view *"Subscription"* | Exists only because the parent shows a truncated card. Has its own search box, pager and "← Back to requests" button — a whole page built to escape a preview. Folding it in removes a navigation level. ⚠ Seeded `assignedSub: 'SUB-1052b'` points at a subscription that does not exist, so "View sub" opens a broken profile (`07c` §19.7). | Merge |
| 41 | `requests-instant-all` | L2144 | **Operations › Requests** — view *"Instant"* | Same as #40. ⚠ The live engine never sets `status='assigned'` on an instant request — it splices — so the `✅ Assigned` chip only ever matches fabricated seed rows (`07c` §19.10). | Merge |

---

## 2. Reverse index — new location → contributing current pages

### 2.1 Tab 1 — Management (5 sub-tabs)

| Sub-tab | Contributing current pages |
|---|---|
| Overview | `exec-overview` · `predictive` (open signals, revenue at risk) · `fraud` (open flags) · `inbox` (overdue count) · `finance` (contribution margin) · `drivers` (`fleetCounts()` eligible-captain formula) |
| Performance | `exec-overview` (trend charts, cities health, expansion-ready, rider engagement) · `growth` (retention cohorts, CSAT/NPS) |
| Risk & Signals | `predictive` · `fraud` |
| Growth | `growth` (promos, referral program, captain incentive rules, bulk messaging) |
| Market & Zones | `zones` · `exec-overview` (expansion-ready zones list) |

### 2.2 Tab 2 — Operations (9 sub-tabs)

| Sub-tab | Contributing current pages |
|---|---|
| Overview | `dashboard` · `inbox` (ownership counters) · `readiness` (counters) · `requests` (SLA breaches) · `live` (active trip count) |
| My Work | `inbox` |
| Live Dispatch | `live` (live mode + dispatch board) · `interventions` (surviving card) |
| Requests | `requests` · `requests-sub-all` · `requests-instant-all` |
| Subscriptions | `subscriptions` · `renewal` |
| Corporate Accounts | `corporate` · `corp-detail` |
| Trips | `trips` · `quickrides` · `live` (history mode / route replay) |
| Trip Assurance | `readiness` · `coverage` · `commitment` |
| People | `drivers` · `all-pending` · `applicant-detail` · `compliance` · `riders` |

### 2.3 Tab 3 — Financials (7 sub-tabs)

| Sub-tab | Contributing current pages / settings tabs |
|---|---|
| Overview | `finance` (contribution margin) · `wallets` (both KPI strips) · `rwallets` (liability KPIs) · Settings › `ledger` (trial balance) |
| Revenue & Refunds | `finance` (revenue by plan, refunds ledger, credit notes) |
| Payouts & Escrow | `wallets` (payouts, escrow holds, deductions) |
| Cash & Captain Debt | `wallets` (cash reconciliation) |
| Rider Wallets | `rwallets` (+ goodwill ledger) |
| Pricing & Plans | `plans` · `plan-edit` · Settings › `pricing` (rate card, surge suspensions) · Settings › `cancelpolicy` |
| Ledger & Payment Controls | Settings › `ledger` · Settings › `gateways` |

### 2.4 Tab 4 — Customer Support (6 sub-tabs)

| Sub-tab | Contributing current pages |
|---|---|
| Overview | `support` · `contacts` · `safety` · `fairness` |
| Tickets | `support` (tickets card) · `ticket-detail` |
| Disputes & Claims | `support` (disputes card + lost & found card) |
| Captain Fairness | `fairness` |
| Safety & Incidents | `safety` |
| Contact Centre | `contacts` · `support` (support team card) |

### 2.5 Tab 5 — Admin (7 sub-tabs)

| Sub-tab | Contributing current pages / settings tabs |
|---|---|
| Overview | `settings` (aggregate signals) · `audit-log` (config-change volume) |
| Workspace | Settings › `general` · `branding` · `legal` |
| Team & Access | Settings › `team` · `permissions` · `security` · `rota` · page `my-account` |
| Operational Policy | Settings › `dispatch` · `cities` · `limits` · `reasons` (incl. SLA, compensation authority, commitment policy) |
| Communications | Settings › `notifications` · `push` · `emails` |
| Data & Compliance | Settings › `integrity` · `export` (incl. daily snapshots, PDPL erasure, retention window) |
| Activity Log | `audit-log` · Settings › `activity` |

### 2.6 Shell (not a tab)

| Shell surface | Contributing current pages |
|---|---|
| 360° profile drawer | `profile` — plus the detail variants it must absorb: `applicant-detail`, `ticket-detail`, `corp-detail` remain level-3 pages but resolve through the same shell and the same search index |
| Notification centre | `notifications-all` |
| My profile | `my-account` |
| Global search | `globalSearch()` / `resolveId()` — extended from 6 to 11 entity types |

---

## 3. Settings sub-tab arithmetic — 21 → 7

| # | Current settings tab | Group today | New home |
|---:|---|---|---|
| 1 | `general` | Workspace | Admin › **Workspace** |
| 2 | `team` | Workspace | Admin › **Team & Access** |
| 3 | `permissions` | Workspace | Admin › **Team & Access** |
| 4 | `dispatch` | Operations | Admin › **Operational Policy** |
| 5 | `cities` | Operations | Admin › **Operational Policy** |
| 6 | `gateways` | Operations | **Financials › Ledger & Payment Controls** |
| 7 | `limits` | Operations | Admin › **Operational Policy** |
| 8 | `cancelpolicy` | Operations | **Financials › Pricing & Plans** |
| 9 | `reasons` | Operations | Admin › **Operational Policy** |
| 10 | `branding` | Operations | Admin › **Workspace** *(merged with `general` — deletes the two-logo-store defect)* |
| 11 | `integrity` | Operations | Admin › **Data & Compliance** |
| 12 | `rota` | Operations | Admin › **Team & Access** |
| 13 | `ledger` | Operations | **Financials › Ledger & Payment Controls** |
| 14 | `pricing` | Operations | **Financials › Pricing & Plans** |
| 15 | `notifications` | System | Admin › **Communications** |
| 16 | `push` | System | Admin › **Communications** |
| 17 | `emails` | System | Admin › **Communications** |
| 18 | `security` | System | Admin › **Team & Access** |
| 19 | `legal` | System | Admin › **Workspace** |
| 20 | `activity` | System | Admin › **Activity Log** |
| 21 | `export` | System | Admin › **Data & Compliance** |

**Arithmetic:**

```
21 settings sub-tabs
 −  4 relocated to Financials   (gateways, cancelpolicy, ledger, pricing)
 = 17 remaining in Admin
      Workspace ............ 3   (general + branding merged, legal)
      Team & Access ........ 4   (team, permissions, security, rota)
      Operational Policy ... 4   (dispatch, cities, limits, reasons)
      Communications ....... 3   (notifications, push, emails)
      Data & Compliance .... 2   (integrity, export)
      Activity Log ......... 1   (activity)
                          = 17  ✓

Admin sub-tabs = 6 groups + 1 new Overview = 7
```

---

## 4. Coverage arithmetic

### 4.1 Pages

```
Total current pages (GROUND-TRUTH-INVENTORY §A) ........  41

  Keep   ................................................  16
  Merge  ................................................  24
  Retire ................................................   1
                                                          ---
  Total accounted for ...................................  41   ✓
```

**Keep (16):** `corporate` · `corp-detail` · `subscriptions` · `trips` · `rwallets` · `plan-edit` · `safety` · `zones` · `applicant-detail` · `ticket-detail` · `profile` · `inbox` · `fairness` · `contacts` · `audit-log` · `requests`

**Merge (24)** — of which **7 are splits** across more than one destination (`exec-overview`, `live`, `finance`, `wallets`, `growth`, `support`, `settings`):

`exec-overview` · `fraud` · `dashboard` · `live` · `renewal` · `readiness` · `drivers` · `riders` · `finance` · `wallets` · `plans` · `quickrides` · `my-account` · `notifications-all` · `predictive` · `coverage` · `compliance` · `growth` · `all-pending` · `support` · `commitment` · `settings` · `requests-sub-all` · `requests-instant-all`

**Retire (1):** `interventions`

### 4.2 Destinations

```
Today
  .page divs .............................................  41
  Settings sub-tabs ......................................  21
                                                           ---
  Total nav destinations .................................  62
  Of which reachable from the sidebar ....................  30   (11 pages unreachable)

Proposed
  Management .............................................   5
  Operations .............................................   9
  Financials .............................................   7
  Customer Support .......................................   6
  Admin ..................................................   7
                                                           ---
  Total sub-tabs .........................................  34
  Of which reachable from the tab rail ...................  34   (0 unreachable)
  Plus level-3 detail screens ............................   5   (360° profile, applicant, ticket, corporate account, plan editor)
  Plus shell surfaces ....................................   3   (search, notifications, my profile)
```

### 4.3 Reachability check

Every one of the 41 pages appears in at least one row of the reverse index (§2), except `interventions`, which is accounted for in the retirement ledger (§1 row 38) with its surviving component named. **40 placed + 1 retired = 41.**

Every one of the 11 currently-unreachable pages gains an explicit route:

| Currently unreachable page | New route |
|---|---|
| `all-pending` | Operations › People › view *Applications* |
| `applicant-detail` | Operations › People › Applicant detail (level 3) |
| `corp-detail` | Operations › Corporate Accounts › Account detail (level 3) |
| `interventions` | **retired** — card relocated to Operations › Live Dispatch |
| `my-account` | Shell › My profile (avatar) |
| `notifications-all` | Shell › Notification centre (bell) |
| `plan-edit` | Financials › Pricing & Plans › Plan editor (level 3) |
| `profile` | Shell › 360° drawer, from all 5 tabs |
| `requests-instant-all` | Operations › Requests › view *Instant* |
| `requests-sub-all` | Operations › Requests › view *Subscription* |
| `ticket-detail` | Customer Support › Tickets › Ticket detail (level 3) |

### 4.4 Merge density

| Sub-tab | Pages absorbed |
|---|---:|
| Operations › People | 5 |
| Operations › Requests | 3 |
| Operations › Trip Assurance | 3 |
| Operations › Trips | 3 |
| Customer Support (whole tab) | 5 |
| Financials › Pricing & Plans | 2 pages + 2 settings tabs |
| Admin (whole tab) | 3 pages + 17 settings tabs |

The heaviest single merge is **Operations › People** (5 pages: `drivers`, `all-pending`, `applicant-detail`, `compliance`, `riders`). It is defensible because four of the five write to the same two collections — `drivers` (112 functions) and `riders` (112 functions) — and the fifth (`applicant-detail`) is the level-3 detail of one of the views.
