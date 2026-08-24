# Module: Driver Wallets

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `wallets` — sidebar route `go('wallets', this)` (`L528`)
> **Page container:** `<div class="page" id="p-wallets">` — **HTML `L968`–`L1017`**
> **Render entry:** `if(id==='wallets'){renderPayoutsTable();renderEscrow();renderDeductions();renderCashReconciliation();}` (`L8816`)
> **Sibling modules:** [12a — Finance](./12a-finance.md) · [12c — Rider Wallets](./12c-rider-wallets.md)

---

## 1. Purpose

This is the **driver-side money page** — where every riyal owed *to* a captain and every riyal owed *by* a captain is settled. It carries four distinct financial subsystems on one screen:

1. **Quick-ride payouts** — earnings payable the moment a trip completes. `DB.payouts` (`L2812`–`L2816`), rendered by `renderPayoutsTable()` (`L8748`), paid by `payDriver()` (`L7023`) / `confirmProcessAll()` (`L7049`).
2. **Subscription escrow** — subscription money **held** until the full plan is delivered, then released into the payout balance. `DB.escrowHolds` (`L2801`–`L2806`), rendered by `renderEscrow()` (`L8906`), released by `releaseEscrow()` (`L7058`).
3. **Deductions** — penalties (late pickup, no-show) subtracted from the pending payout. `DB.deductions` (`L2807`–`L2811`), rendered by `renderDeductions()` (`L8948`), applied by `confirmApplyDeduction()` (`L7072`) or dismissed by `waiveDeduction()` (`L8986`).
4. **Cash reconciliation** — the largest subsystem on the page. When a rider pays a driver in cash the platform never receives the money, so an expected-vs-reported comparison produces a **running debt** against the driver, with a hard cap that suspends cash collection. `DB.cashLedger` / `DB.driverCashDebt` (`L12080`–`L12081`), rendered by `renderCashReconciliation()` (`L12239`).

The page's own explanatory panels state the policy directly:
- `L972` — *"quick-ride fares are payable as soon as a trip completes. Subscription payments are held in escrow and only released to the driver once the full plan is delivered (all required trips completed) — protecting against mid-plan cancellations or incomplete service."*
- `L1000` — *"…the system compares the GPS-and-pricing-based expected amount against what the driver reports collecting. A match (within a small tolerance) or a reported tip needs no action. An under-report (possible revenue leakage) or a driver who never reports at all gets queued below — the commission owed (and any wallet top-up the driver collected on the platform's behalf) is tracked as a running debt against that driver, deducted automatically from their next payout."*

---

## 2. Entry points & routing

| # | Entry | Line | Mechanism |
|---|-------|------|-----------|
| 1 | Sidebar item "Driver wallets" (`sec.finance` group) | `L526`, `L528` | `onclick="go('wallets',this)"`, label `data-i18n="nav.wallets"` |
| 2 | `go('wallets', …)` router hook | `L8816` | Calls all four renderers |
| 3 | Finance KPI "Driver payouts" | `L933` | `go('wallets',null)` |
| 4 | Finance KPI "Pending payouts" | `L934` | `go('wallets',null)` |
| 5 | Finance KPI "Held in subscription escrow" | `L937` | `go('wallets',null)` |
| 6 | Finance KPI "Ready to release" | `L938` | `go('wallets',null)` |
| 7 | Finance KPI "Deductions (Jun)" | `L939` | `go('wallets',null)` |
| 8 | Driver 360° profile → "View in Wallets →" button | `L4176` | `go('wallets',null)` — rendered only when the driver has escrow holds or pending deductions |
| 9 | Cash-event toast (clickable) | `L12136` | `toast(msg, level, function(){go('wallets',null);}, false)` |
| 10 | Ops notification "Cash review needed" / "Repeat cash pattern" | `L12137` | `pushOpsNotification(…, function(){go('wallets',null);})` |
| 11 | Ops notification "Escalated — {driver}" | `L12180` | `pushOpsNotification('alert', …, function(){go('wallets',null);})` |
| 12 | Toolbar title / subtitle | `L2168` (`wallets:'Driver Wallets'`), `L2169` (`wallets:'Driver payout management'`) | Set by `go()` |

**Boot-time rendering (partial):** the boot sequence calls `renderPayoutsTable()` (`L14578`), `renderEscrow()` (`L14579`), and `renderDeductions()` (`L14580`) — but **not `renderCashReconciliation()`**. The four cash KPIs (`L1004`–`L1007`), the tolerance label (`L1010`), the cash queue (`L1011`), and the debt ledger (`L1015`) stay at their placeholder `—` until the page is first opened. See §19 G1.

**Live refresh during cash generation:** `maybeGenerateCashEvent` re-renders only if the page is currently visible — `if(document.getElementById('p-wallets')&&document.getElementById('p-wallets').classList.contains('on'))renderCashReconciliation();` (`L12141`).

**Page permissions** — `PAGE_PERMISSIONS.wallets` (`L10630`–`L10637`), `legacy:'process_payouts'`:

| key | label |
|---|---|
| `view` | View payouts & escrow |
| `process_payouts` | Process driver payouts |
| `release_escrow` | Release subscription escrow |
| `apply_deductions` | Apply / waive deductions |
| `cash_review` | Review / escalate cash reconciliation |
| `cash_repayment` | Record a driver cash-debt repayment |

Only **two of these six page-permission keys** are enforced through the page-permission layer — `requirePagePerm('wallets','cash_review')` (`L12148`) and `requirePagePerm('wallets','cash_repayment')` (`L12189`) — **but that is not the same as "only two actions are protected"**: payout, escrow and deduction are each gated through the *legacy global* layer instead (`requirePerm('process_payouts')` `L7024`, `requirePerm('release_escrow')` `L7059`, `requirePerm('apply_deductions')` `L7073`). Only `wallets.view` is genuinely unenforced — and it is inert by construction anyway, because `defaultPagePerms` (`L10664`) grants every page at least `view` to every role. See §17 R9.

---

## 3. Layout map

Top-to-bottom order of `#p-wallets` (`L968`–`L1017`):

| Order | Block | Lines | Container | Content source |
|-------|-------|-------|-----------|----------------|
| 1 | Header `.ph` — h1 "Driver wallets", sub "Quick-ride earnings, subscription escrow & deductions" + **`Process all payouts` button** | `L969` | static | hardcoded label; button → `processAllPayouts(this)` |
| 2 | Blue explainer card "How payouts work" | `L970`–`L974` | static | **hardcoded prose**, `border-color:#9DC0E5`, `background:var(--blue-lt)` |
| 3 | KPI grid `.g4` — payouts/escrow/deductions | `L975`–`L980` | 4 tiles with live ids | `renderPayoutsTable` + `renderEscrow` + `renderDeductions` |
| 4 | Card "💳 Available payouts — quick rides" + badge `#payouts-pending-badge` | `L981`–`L987` | `<tbody id="payouts-tbody">` | `renderPayoutsTable()` `L8748` |
| 5 | `.g2` two-column split | `L988`–`L997` | — | — |
| 5a | └ Card "📦 Subscription escrow holds" + count `#escrow-count` | `L989`–`L992` | `#escrow-list`, `max-height:360px;overflow-y:auto` | `renderEscrow()` `L8906` |
| 5b | └ Card "⚠ Pending deductions" + count `#deduct-count` (red-bordered, red header) | `L993`–`L996` | `#deductions-list`, `max-height:360px;overflow-y:auto` | `renderDeductions()` `L8948` |
| 6 | Amber explainer card "💵 How cash reconciliation works" | `L998`–`L1002` | static | **hardcoded prose**, `border-color:#F0C674`, `background:#FFF8EC`, `color:#7A5A0A` |
| 7 | KPI grid `.g4` — cash reconciliation | `L1003`–`L1008` | 4 tiles with live ids | `renderCashReconciliation()` `L12239` |
| 8 | Card "🧾 Cash reconciliation queue" + tolerance label `#cash-tolerance-lbl` | `L1009`–`L1012` | `#cash-ledger-list`, `max-height:460px;overflow-y:auto` | `renderCashReconciliation()` |
| 9 | Card "📒 Driver cash debt ledger" | `L1013`–`L1016` | `#cash-debt-list`, `max-height:400px;overflow-y:auto` | `renderCashReconciliation()` |
| 10 | close `#p-wallets` | `L1017` | | |

---

## 4. Data model & fields

### 4.1 `DB.payouts` — object keyed by driver id (`L2812`–`L2816`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `trips` | number | count | Trips in the cycle; from `d.stats.totalTrips` when auto-created | `L2813`, `L8897` |
| `earned` | number | **SAR** | Lifetime/cycle gross earned. Increased by escrow release (`L7067`) | `L2813` |
| `paidOut` | number | **SAR** | Cumulative amount already transferred | `L2813` |
| `pending` | number | **SAR**, always ≥ 0 | Currently payable. Increased by escrow release (`L7066`), decreased by deduction (`L7079`), zeroed by payout (`L7030`, `L7053`) | `L2813` |
| `lastPayout` | string | — | Date label; set to the literal `'Just now'` after a payout (`L7031`, `L7053`); `'—'` for auto-created entries (`L8897`) | `L2813` |
| `deductionNote` | `{amount:number, type:string}` \| null | SAR + text | Last applied deduction, shown under the Pending cell (`L8757`). **Cleared on payout** (`L7032`, `L7053`) | `L2813`, `L7080` |

Seed rows (`L2813`–`L2815`) — **only 3 drivers, all with the same `lastPayout`:**

| Driver | trips | earned | paidOut | pending | lastPayout | deductionNote |
|---|---|---|---|---|---|---|
| `DRV-0101` | 412 | 2840 | 2200 | **640** | 22 Jun | null |
| `DRV-0102` | 318 | 3620 | 2800 | **820** | 22 Jun | null |
| `DRV-0104` | 524 | 4100 | 3200 | **900** | 22 Jun | null |

Total pending = **2,360.00 SAR** (drives `#payouts-pending-badge` and `#avail-now-kpi`).

Note: `DRV-0103` and `DRV-0105` — the two drivers who carry deductions (`L2808`–`L2810`) — have **no payout entry** in the seed. `ensurePayoutEntry` (`L8894`–`L8900`) creates one lazily with all money fields at `0` the first time a deduction or escrow release touches them.

### 4.2 `DB.escrowHolds` — array (`L2801`–`L2806`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `id` | string | — | `ESC-*`, **manually assigned in the seed; no generator function exists** | `L2802` |
| `sub` | string | — | `SUB-*` this hold belongs to | `L2802` |
| `driver` | string | — | `DRV-*` recipient | `L2802` |
| `rider` | string | — | `RDR-*` payer | `L2802` |
| `amount` | number | **SAR**, positive | Amount withheld | `L2802` |
| `tripsRequired` | number | count | Trips that must complete before release | `L2802` |
| `tripsCompleted` | number | count | Trips delivered so far | `L2802` |
| `status` | string | — | `'held'` \| `'ready'` | `L2802` |

Seed rows (`L2802`–`L2805`):

| id | sub | driver | rider | amount (SAR) | trips | status |
|---|---|---|---|---|---|---|
| `ESC-1041` | SUB-1041 | DRV-0101 | RDR-1041 | **69.20** | 4/5 | `held` |
| `ESC-1052` | SUB-1052 | DRV-0103 | RDR-2031 | **329.60** | 10/10 | `ready` |
| `ESC-1060` | SUB-1060 | DRV-0102 | RDR-1080 | **32.98** | 1/1 | `ready` |
| `ESC-1075` | SUB-1075 | DRV-0101 | RDR-1075 | **69.20** | 2/5 | `held` |

**Derived relationship (observed, not coded):** each `amount` equals the subscription's `paid` × 0.80 exactly — `86.50×0.8=69.20` (SUB-1041, `L2686`), `412.00×0.8=329.60` (SUB-1052, `L2687`), `41.22×0.8=32.976→32.98` (SUB-1060, `L2688`), `86.50×0.8=69.20` (SUB-1075, `L2689`). That implies a flat 20 % Eyvar commission — but `DB.plans.biweekly.eyvarPct=18` (`L2892`) and `DB.plans.monthly.eyvarPct=15` (`L2894`), and SUB-1052 is "Bi-weekly Comfort" while SUB-1060 is "Monthly Comfort". The seed therefore applies 20 % to plans whose configured take-rate is 18 % and 15 %. See §17 R6.

### 4.3 `DB.deductions` — array (`L2807`–`L2811`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `id` | string | — | `DED-*`, **manually assigned in the seed; no generator exists** | `L2808` |
| `driver` | string | — | `DRV-*` | `L2808` |
| `type` | string | — | Free-text penalty description (see §7.2) | `L2808` |
| `trip` | string | — | `TRP-*` the penalty attaches to | `L2808` |
| `amount` | number | **SAR**, positive magnitude (displayed as `−amount`) | Penalty | `L2808` |
| `date` | string | — | e.g. `'25 Jun'` | `L2808` |
| `status` | string | — | `'pending'` \| `'applied'` \| `'waived'` | `L2808` |

Seed rows (`L2808`–`L2810`):

| id | driver | type | trip | amount | date | status |
|---|---|---|---|---|---|---|
| `DED-01` | DRV-0103 | `Late pickup (+8 min)` | TRP-7742 | **15** | 25 Jun | `pending` |
| `DED-02` | DRV-0105 | `No-show / rider unreachable` | TRP-9003 | **30** | 25 Jun | `pending` |
| `DED-03` | DRV-0103 | `Late pickup — 3rd occurrence` | TRP-7738 | **20** | 24 Jun | `applied` |

Pending sum = **45.00 SAR** (drives `#deduct-kpi`).

### 4.4 `DB.cashLedger` — array (`L12080`, entries built at `L12124`–`L12131`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `id` | string | — | `'CASH-'+(++window.__cashSeq||(window.__cashSeq=1))` | `L12125` |
| `tripId` | string | — | `TRP-*` | `L12125` |
| `driver` / `rider` | string | — | `DRV-*` / `RDR-*` | `L12125` |
| `expectedFare` | number | **SAR** | GPS+pricing expected amount, `parseFloat(base.fare)` | `L12126`, `L12107` |
| `reportedAmount` | number \| **null** | **SAR** | What the driver said they collected; `null` = never reported | `L12126` |
| `topupAmount` | number | **SAR** | Extra cash collected as a rider wallet top-up (0 when none) | `L12126` |
| `reason` | string \| null | — | Driver's explanation for a shortfall, from `CASH_REASONS` | `L12126` |
| `classification` | string | — | `'match'` \| `'over_report'` \| `'under_report'` \| `'no_report'` | `L12127`, `L12123` |
| `riderConfirmed` | boolean | — | Rider confirmed the handover; `false` whenever `reportedAmount==null` | `L12129` |
| `status` | string | — | `'pending'` \| `'resolved'` \| `'escalated'` | `L12129` |
| `createdAt` | string | — | `fmtReqNowLabel()` | `L12131` |
| `debtAdded` | number | **SAR**, positive | Commission + top-up booked against the driver; set by `applyCashDebtImpact` | `L12090` |

`DB.cashLedger` starts **empty** (`L12080`) — every row is generated at runtime by `maybeGenerateCashEvent` during trip simulation.

### 4.5 `DB.driverCashDebt` — object keyed by driver id (`L12081`)

| Field | Type | Unit/Currency | Meaning |
|---|---|---|---|
| `[driverId]` | number | **SAR, stored NEGATIVE** | Accumulated debt. `applyCashDebtImpact` *subtracts* `debtAdded` (`L12091`), so a driver owing 120 SAR is stored as `-120`. Displayed via `-DB.driverCashDebt[d]` (`L12259`). Cleared to exactly `0` by `commitCashRepayment` (`L12207`) |

Starts **empty** (`L12081`).

### 4.6 Module constants (`L12076`–`L12079`, `L12100`)

| Constant | Value | Unit | Purpose | Line |
|---|---|---|---|---|
| `CASH_COMMISSION_RATE` | `0.20` | fraction | "platform's normal commission share" | `L12076` |
| `CASH_TOLERANCE` | `2.00` | **SAR** | "inside this band, treat as a match" | `L12077` |
| `CASH_DEBT_CAP` | `-300` | **SAR (negative)** | "driver's cash-collection ability suspends past this" | `L12078` |
| `CASH_TRIP_CHANCE` | `0.35` | probability | "share of completed quick rides paid in cash, **for demo data**" | `L12079` |
| `CASH_REASONS` | 3-string array | — | Driver shortfall explanations (see §7.4) | `L12100` |

---

## 5. Money formulas — written out exactly

### 5.1 Payout table totals (`renderPayoutsTable`, `L8748`–`L8772`)
```
ids          = Object.keys(DB.payouts)                                   // L8751
totalPending = 0
for each id: totalPending += DB.payouts[id].pending                      // L8755
canPay       = p.pending > 0                                             // L8756

#payouts-pending-badge = totalPending.toFixed(2) + ' SAR pending'         // L8768
#avail-now-kpi         = totalPending.toFixed(2)                          // L8769
#avail-now-sub         = (count of ids where pending > 0) + ' driver(s) with balance due'  // L8770
```
No rounding is applied to `totalPending` before `.toFixed(2)`. Per-row cells use `p.earned.toFixed(2)`, `p.paidOut.toFixed(2)`, `p.pending.toFixed(2)` (`L8762`, `L8763`; the pending cell is emitted at `L8764` from the `pendingHTML` fragment built at `L8757`).

### 5.2 Pay one driver (`payDriver`, `L7023`–`L7036`)
```
if(!requirePerm('process_payouts')) return;              // L7024
p = DB.payouts[driverId]
if(!p || p.pending <= 0) return;                          // L7026  — guards zero/negative
amt = p.pending
p.paidOut += amt                                          // L7029
p.pending  = 0                                            // L7030   — hard zero, not a subtraction
p.lastPayout    = 'Just now'                              // L7031
p.deductionNote = null                                    // L7032
```
**No rounding.** Float accumulation on `paidOut` is unguarded. `p.earned` is **not** touched — a payout leaves `earned` unchanged, which is correct (earned is gross, paidOut is settlement).

### 5.3 Process all payouts preview (`processAllPayouts`, `L7037`–`L7048`)
```
ids   = Object.keys(DB.payouts).filter(id => DB.payouts[id].pending > 0)  // L7038
total = ids.reduce((s,id) => s + DB.payouts[id].pending, 0)               // L7039
if(!ids.length){ toast('No pending balances to process','info'); return; } // L7040
```
The modal shows `ids.length` and `total.toFixed(2)` and its confirm button is labelled `'Process ' + total.toFixed(2) + ' SAR'` (`L7046`).

### 5.4 Process all payouts commit (`confirmProcessAll`, `L7049`–`L7056`)
```
if(!requirePerm('process_payouts')) return;                               // L7050
ids   = Object.keys(DB.payouts)          // NOTE: NOT the filtered list   // L7051
total = 0
ids.forEach(id => { p = DB.payouts[id];
   if(p.pending > 0){ total += p.pending; p.paidOut += p.pending; p.pending = 0;
                      p.lastPayout='Just now'; p.deductionNote=null; } })  // L7053
logAction('process_all_payouts','finance','', ids.length + ' payouts processed — ' + total.toFixed(2) + ' SAR total',
          {pendingTotal:fmtSAR(total)}, {pendingTotal:fmtSAR(0), driversProcessed:ids.length})  // L7055
```
⚠ `ids` here is **every** payout key, not the `pending>0` subset that the preview used. `driversProcessed` in the audit record and `(ids.length)` in the summary therefore report the *total number of drivers with a payout record*, not the number actually paid. See §17 R2.

### 5.5 Escrow aggregates (`renderEscrow`, `L8909`–`L8917`)
```
held     = DB.escrowHolds.filter(e => e.status === 'held')
ready    = DB.escrowHolds.filter(e => e.status === 'ready')
heldSum  = held.reduce((s,e) => s + e.amount, 0)              // SAR, no rounding
readySum = ready.reduce((s,e) => s + e.amount, 0)

#escrow-held-kpi  = heldSum.toFixed(2)
#escrow-ready-kpi = readySum.toFixed(2)
#escrow-held-sub  = held.length + ' subscription(s) in progress'
#escrow-ready-sub = ready.length + ' plan(s) fully delivered'
#escrow-count     = DB.escrowHolds.length                      // ALL holds, both statuses
```
Seed values: `heldSum = 69.20 + 69.20 = 138.40`, `readySum = 329.60 + 32.98 = 362.58`, `#escrow-count = 4`.

### 5.6 Escrow progress bar (`renderEscrow`, `L8921`)
```
pct = Math.round(e.tripsCompleted / e.tripsRequired * 100)     // integer percent
```
**No zero-guard on `tripsRequired`** — a hold with `tripsRequired:0` yields `Infinity` or `NaN` and `width:NaN%`. See §17 R7.

### 5.7 Escrow release (`releaseEscrow`, `L7058`–`L7071`)
```
if(!requirePerm('release_escrow')) return;                    // L7059
idx = DB.escrowHolds.findIndex(x => x.id === id)
if(idx < 0) return;                                            // L7061
e = DB.escrowHolds[idx]
DB.escrowHolds.splice(idx, 1)                                  // L7064  — hold DELETED, not marked released
p = ensurePayoutEntry(e.driver)                                // L7065
p.pending += e.amount                                          // L7066
p.earned  += e.amount                                          // L7067
```
**No rounding.** The hold is destroyed rather than transitioned to a `released` state, so escrow history is unrecoverable after release. **Crucially, `releaseEscrow` does NOT check `e.status`** — a `held` (incomplete) escrow can be released by calling the function directly; only the *UI button* is gated on `status==='ready'` (`L8927`). See §17 R3.

### 5.8 Deduction aggregates (`renderDeductions`, `L8951`–`L8955`)
```
pending = DB.deductions.filter(d => d.status === 'pending')
sum     = pending.reduce((s,d) => s + d.amount, 0)             // SAR, no rounding

#deduct-kpi   = sum.toFixed(2)
#deduct-sub   = pending.length + ' awaiting review'
#deduct-count = pending.length
```
Seed values: `sum = 15 + 30 = 45.00`, `pending.length = 2`.

### 5.9 Deduction preview (`applyDeduction`, `L8971`–`L8985`)
```
p     = DB.payouts[d.driver]                                   // L8975  — direct index, NOT ensurePayoutEntry
avail = p ? p.pending : 0                                       // L8976  — 0 when no payout record exists
"Current pending balance"  = avail.toFixed(2) + ' SAR'          // L8981
"Balance after deduction"  = Math.max(0, avail - d.amount).toFixed(2) + ' SAR'   // L8981
```
The `Math.max(0, …)` clamp means the preview shows `0.00` rather than a negative balance.

### 5.10 Deduction commit (`confirmApplyDeduction`, `L7072`–`L7084`)
```
if(!requirePerm('apply_deductions')) return;                   // L7073
d = DB.deductions.find(x => x.id === id);  if(!d) return;      // L7074–7075
prevStatus = d.status
d.status = 'applied'                                           // L7077
p = ensurePayoutEntry(d.driver)                                // L7078  — CREATES a payout record if missing
p.pending = Math.max(0, p.pending - d.amount)                  // L7079  — CLAMPED at zero
p.deductionNote = {amount:d.amount, type:d.type}               // L7080  — OVERWRITES any previous note
```
⚠ Two consequences of `Math.max(0, …)`:
1. A deduction larger than the pending balance **silently loses the excess** — there is no carry-forward to the next cycle.
2. Applying a deduction to a driver with **no pending balance** marks it `applied` and moves nothing at all.

⚠ `deductionNote` is a single slot, not a list — a second deduction overwrites the first, so the payout row and the confirm modal only ever show the most recent one.

⚠ **No guard against re-applying**: `confirmApplyDeduction` does not check `d.status`. Nothing in the code prevents a second call on the same id (the UI hides the button after render, but the function is a plain global). See §17 R4.

### 5.11 Deduction waive (`waiveDeduction`, `L8986`–`L8992`)
```
d = DB.deductions.find(x => x.id === id);  if(!d) return;
d.status = 'waived'                                            // L8989
renderDeductions()
toast('Deduction waived for ' + nm2(d.driver) + ' — no amount subtracted', 'info')
```
**No permission check. No confirmation modal. No `logAction`.** This is the only status-changing money action on the page with none of the three. See §17 R1.

### 5.12 Cash classification (`classifyCashReport`, `L12083`–`L12087`)
```
dev = reportedMinusTopup - expected                            // SAR, signed
if(Math.abs(dev) <= CASH_TOLERANCE)  return 'match'            // |dev| <= 2.00
return dev > CASH_TOLERANCE ? 'over_report' : 'under_report'
```
Call site (`L12123`): `classification = reportedAmount == null ? 'no_report' : classifyCashReport(expectedFare, reportedAmount - topupAmount)` — the top-up is **subtracted before comparison**, so a legitimate wallet top-up never registers as an over-report.

### 5.13 Cash debt impact (`applyCashDebtImpact`, `L12088`–`L12092`) — **the core debt formula**
```
commissionOwed = Math.round(entry.expectedFare * CASH_COMMISSION_RATE * 100) / 100
               = Math.round(expectedFare * 0.20 * 100) / 100                       // SAR, 2 dp

entry.debtAdded = Math.round((commissionOwed + (entry.topupAmount || 0)) * 100) / 100   // SAR, 2 dp

DB.driverCashDebt[entry.driver] =
    Math.round(((DB.driverCashDebt[entry.driver] || 0) - entry.debtAdded) * 100) / 100  // NEGATIVE accumulation
```
Sign convention: `debtAdded` is **positive**; `DB.driverCashDebt[x]` accumulates **negatively**. Both are rounded to 2 dp at every step, so the debt total does not drift.

⚠ **`applyCashDebtImpact` is called unconditionally for every generated cash event** (`L12133`), including `classification === 'match'` and `'over_report'`. A driver who reports honestly still accrues the full commission as debt. That is arguably correct (the platform never received its 20 %), but it means the "Total driver debt outstanding" KPI is not a fraud metric — it is a gross cash-float metric. The page's own explainer at `L1000` frames debt as arising from under-reports, which does not match the code.

### 5.14 Cash-collection suspension (`driverCashBlocked`, `L12082`)
```
driverCashBlocked(driverId)  ===  (DB.driverCashDebt[driverId] || 0) <= CASH_DEBT_CAP
                             ===  storedValue <= -300
```
i.e. a driver is suspended once they owe **300.00 SAR or more**. Enforced at `L12103` — `maybeGenerateCashEvent` returns early for a blocked driver, so *"this trip stays card-only."*

### 5.15 Repeat-pattern counter (`driverCashRiskCount`, `L12097`–`L12099`)
```
count = DB.cashLedger.filter(e => e.driver === driverId
                              && (e.classification === 'under_report' || e.reportedAmount == null)).length
isPattern = count >= 2                                          // L12135
```
Threshold **2**. `match` and `over_report` entries are excluded, and the counter is **lifetime-in-session** — no rolling window and no decay.

### 5.16 Deviation display (`cashRowHTML` `L12216`; `resolveCashEntry` `L12150`)
```
deviation = reportedAmount != null ? (reportedAmount - topupAmount - expectedFare) : null   // SAR, SIGNED
display   = (deviation >= 0 ? '+' : '') + fmtSAR(deviation)
colour    = deviation < 0 ? var(--red) : var(--muted)
```
`fmtSAR` on a negative number produces e.g. `'-6.40 SAR'` (`L4394`), so a negative deviation renders as `-6.40 SAR` without a duplicated sign; a positive one renders `+6.40 SAR`.

### 5.17 Cash reconciliation KPIs (`renderCashReconciliation`, `L12240`–`L12246`)
```
totalDebt    = SUM over Object.keys(DB.driverCashDebt) of Math.max(0, -DB.driverCashDebt[k])   // SAR, positive
pending      = count of DB.cashLedger where status === 'pending'
escalated    = count of DB.cashLedger where status === 'escalated'
blockedCount = count of Object.keys(DB.driverCashDebt) where driverCashBlocked(k)

#cash-debt-kpi      = fmtSAR(totalDebt)
#cash-pending-kpi   = pending          (integer count)
#cash-escalated-kpi = escalated        (integer count)
#cash-blocked-kpi   = blockedCount     (integer count)
#cash-tolerance-lbl = CASH_TOLERANCE.toFixed(2)   // '2.00'
```
The `Math.max(0, …)` term means a *credit* balance (positive stored value, which nothing currently produces) would be excluded rather than netted off.

### 5.18 Cash repayment (`recordCashRepayment` `L12187`; `commitCashRepayment` `L12203`)
```
owed = -(DB.driverCashDebt[driverId] || 0)                     // SAR, positive
if(owed <= 0){ toast('No outstanding cash debt for …','info'); return; }   // L12190
…
DB.driverCashDebt[driverId] = 0                                 // L12207 — FULL clear, no partial amount accepted
```
There is **no input field** — the modal offers only "Confirm {owed} repayment" (`L12200`). Partial repayment is impossible.

### 5.19 Earnings statement per-trip commission (`openEarningsStatement`, `L7217`–`L7220`)
```
per row:  Rider paid       = t.fare                    (string, as stored)
          Driver earned    = t.driverEarn              (string, as stored)
          Eyvar commission = (parseFloat(t.fare) - parseFloat(t.driverEarn)).toFixed(2)
```
Example from the seed (`L2671`): `17.65 − 14.12 = 3.53` → an implied 20.0 % take rate. `L2678`: `41.22 − 32.98 = 8.24` → 19.99 %.

⚠ The statement has **no totals row** and the source is `d.trips` (the driver's whole trip array), not the payout cycle — so the trip list and the payout amount above it are unrelated numbers. See §17 R8.

### 5.20 Payout confirmation breakdown (`confirmPayDriver`, `L7198`–`L7200`)
```
"Net payout amount"                → p.pending.toFixed(2) + ' SAR'   (green, bold)
if(p.deductionNote):
"Includes deduction — {type}"      → '−' + p.deductionNote.amount.toFixed(2) + ' SAR'   (red, 11px)
ibanTail = d.bank ? d.bank.iban.slice(-9) : '—'                       // L7201
```
The wording *"Includes deduction"* is displayed alongside the net amount, but the deduction was already subtracted when it was applied (`L7079`) — this line is informational, not an additional subtraction.

⚠ `var rows = [['Net payout amount', …]]` at `L7198` is built and **never used** — dead code.

### 5.21 Tip handling (context, `L12042`–`L12047`)
```
/* Tips go 100% to the driver — never split with platform commission */   // L12042
simulateTip(driverRating):
   chance = rating>=4.5 ? 0.45 : rating>=4 ? 0.25 : rating>=3 ? 0.1 : 0.02
   if(Math.random() > chance) return 0
   return Math.round((2 + Math.random()*8) * 2) / 2      // 2–10 SAR, rounded to the nearest HALF riyal
```
Tips surface on the driver profile as `SUM of (t.tip||0)` over that driver's trips (`L4170`). They are **not** part of `DB.payouts.pending` — no code path adds a tip to a payout balance. See §19 G4.

---

## 6. Financial state machines

### 6.1 Payout balance (`DB.payouts[driverId]`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| **absent** | Driver has no payout record (e.g. `DRV-0103`, `DRV-0105` in the seed) | → `zero` via `ensurePayoutEntry` (`L8894`) on escrow release (`L7065`) or deduction (`L7078`) | Created with `{trips:d.stats.totalTrips||0, earned:0, paidOut:0, pending:0, lastPayout:'—', deductionNote:null}` (`L8897`) |
| **zero** (`pending === 0`) | After `payDriver`/`confirmProcessAll` (`L7030`, `L7053`), or on lazy creation | → `payable` when escrow releases (`L7066`) | Row shows a disabled `No balance due` button, `opacity:.55;cursor:default` (`L8766`) |
| **payable** (`pending > 0`) | Seed, or escrow release adds to it (`L7066`) | → `zero` on payout; stays payable after a partial deduction | Row shows an enabled `Pay {amount}` button (`L8766`) |
| **deducted** (`deductionNote !== null`) | `confirmApplyDeduction` (`L7080`) | → cleared on any payout (`L7032`, `L7053`) | Red sub-line under the Pending cell: `−{amount} deducted · {type}` (`L8757`) |

### 6.2 Escrow hold (`DB.escrowHolds[*].status`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| `held` | **Seed only** — `L2802`, `L2805`. **No code path ever creates an escrow hold or sets this status** | *(never transitions to `ready` by code)* | Counted in `heldSum` / `#escrow-held-kpi` (`L8911`, `L8913`). Amber value colour (`L8923`), `rf-a` progress fill (`L8925`), badge `Held until complete` (`L8927`) |
| `ready` | **Seed only** — `L2803`, `L2804` | → **deleted** by `releaseEscrow` | Counted in `readySum` / `#escrow-ready-kpi`. Blue value colour, `rf-g` fill, `Release to driver` button |
| *(deleted)* | `releaseEscrow` → `DB.escrowHolds.splice(idx,1)` (`L7064`) | terminal | `p.pending += amount` and `p.earned += amount` (`L7066`–`L7067`); the hold record is **destroyed**, no `released` state is retained |

⚠ **`tripsCompleted` is never incremented by any code**, and **no function transitions `held → ready`.** Grep confirms the only writes to `DB.escrowHolds` are the seed literal (`L2801`) and the `splice` at `L7064`. The escrow lifecycle described in the page's own explainer (`L972`) is not implemented — only the final release step is. See §17 R5.

### 6.3 Deduction (`DB.deductions[*].status`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| `pending` | **Seed only** — `L2808`, `L2809`. No code path creates a deduction | → `applied` or `waived` | Counted in `#deduct-kpi` / `#deduct-count` (`L8951`–`L8955`). Row renders at full opacity with two buttons (`L8963`) |
| `applied` | `confirmApplyDeduction` (`L7077`); also seeded on `DED-03` (`L2810`) | **terminal — no reversal path** | `p.pending = Math.max(0, p.pending − d.amount)` (`L7079`); `p.deductionNote` set (`L7080`). Row dims to `opacity:.6`, badge `b-red` `✓ Applied — deducted from payout` (`L8964`) |
| `waived` | `waiveDeduction` (`L8989`) | **terminal — no reversal path** | **No money moves.** Row dims to `opacity:.6`, badge `b-grey` `Waived — no deduction` (`L8964`) |

### 6.4 Cash ledger entry (`DB.cashLedger[*].status`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| `pending` | At creation when `classification` is `'under_report'` **or** `'no_report'` (`L12129`) | → `resolved` or `escalated` | Debt already applied at creation (`L12133`). Row gets `background:#FFFBF2` (`L12218`) and two action buttons (`L12232`–`L12235`). Fires a toast + ops notification (`L12136`–`L12137`) |
| `resolved` | At creation when `classification` is `'match'` or `'over_report'` (`L12129`); or via `commitCashResolve(id,'approved')` (`L12175`) | terminal | **No money moves** — the modal states explicitly *"The {debtAdded} already applied to their cash-debt ledger is unaffected either way"* (`L12166`) |
| `escalated` | `commitCashResolve(id,'escalated')` (`L12175`) | terminal | **No money moves** — *"The debt already applied ({debtAdded}) stays on their ledger regardless of the outcome"* (`L12165`). Side effects: `playAlertBeep()` (`L12177`), `logAction('cash_escalated')` (`L12178`), error toast, ops notification (`L12180`) |

### 6.5 Cash classification (`DB.cashLedger[*].classification`) — set once at creation, never changes

| Value | Condition | Badge | Line |
|---|---|---|---|
| `no_report` | `reportedAmount == null` | `<span class="b b-red">⏰ Never reported</span>` | `L12123`, `L12213` |
| `match` | `abs(reported − topup − expected) <= 2.00` | `<span class="b b-green">✓ Matches</span>` | `L12085`, `L12214` |
| `over_report` | `(reported − topup − expected) > 2.00` | `<span class="b b-blue">↑ Over-reported</span>` | `L12086`, `L12215` |
| `under_report` | `(reported − topup − expected) < −2.00` | `<span class="b b-red">↓ Under-reported</span>` | `L12086`, `L12216` |

### 6.6 Driver cash-collection eligibility (`driverCashBlocked`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| **eligible** | `DB.driverCashDebt[id] > -300` (or key absent) | → suspended when debt reaches `-300` | Cash trips may be generated for this driver (`L12103`) |
| **suspended** | `DB.driverCashDebt[id] <= CASH_DEBT_CAP` (`L12082`) | → eligible on `commitCashRepayment` setting the value to `0` (`L12207`) | `maybeGenerateCashEvent` returns early — *"suspended from cash collection — this trip stays card-only"* (`L12103`). Debt-ledger row gets `background:var(--red-lt)` and badge `🚫 Cash collection suspended` (`L12261`–`L12262`) |

---

## 7. Reason codes & categories — full enumeration

### 7.1 Payout permission keys (`PERMISSION_LABELS` `L3231`–`L3233`, `PERMISSION_DESC` `L3250`–`L3252`)

| Key | Label | Description | Effect |
|---|---|---|---|
| `process_payouts` | Process driver payouts | *"Release a driver's earned balance to their wallet and mark payouts as paid."* | Gates `payDriver` (`L7024`), `confirmProcessAll` (`L7050`), `resolveCashEntry` (`L12147`), `recordCashRepayment` (`L12188`) |
| `release_escrow` | Release subscription escrow | *"Release funds held in escrow once a subscription cycle is confirmed complete."* | Gates `releaseEscrow` (`L7059`) |
| `apply_deductions` | Apply / waive deductions | *"Apply or waive a deduction against a driver's upcoming payout, e.g. for a complaint."* | Gates `confirmApplyDeduction` (`L7073`) — **but NOT `waiveDeduction`**, despite the label saying "/ waive" |
| `view_finance` | View financial reports | *"See revenue, payout, and escrow reports. Read-only — does not move any money."* | Never enforced anywhere |

### 7.2 Deduction `type` values (free-text, seeded only)

| Value | Amount | Occurrence | Line |
|---|---|---|---|
| `Late pickup (+8 min)` | 15 SAR | DED-01, DRV-0103 | `L2808` |
| `No-show / rider unreachable` | 30 SAR | DED-02, DRV-0105 | `L2809` |
| `Late pickup — 3rd occurrence` | 20 SAR | DED-03, DRV-0103 | `L2810` |

There is **no enumerated deduction-type constant and no fee schedule** — the type is a free string on each seeded record, and no UI creates new deductions. The page header says the category is *"Late pickups, no-shows"* (`L994`) and the Finance KPI says *"Late pickups & no-shows"* (`L939`).

### 7.3 Cash classifications (`classifyCashReport`, `L12083`) — see §6.5 for the full 4-value table.

| Value | Queued for review? | Effect on debt |
|---|---|---|
| `match` | ❌ → `resolved` | **Still adds `debtAdded`** (`L12133`) |
| `over_report` | ❌ → `resolved` | **Still adds `debtAdded`** |
| `under_report` | ✅ → `pending` | Adds `debtAdded`; fires toast + ops notification |
| `no_report` | ✅ → `pending` | Adds `debtAdded`; fires toast + ops notification |

### 7.4 `CASH_REASONS` — driver shortfall explanations (`L12100`)

Exactly three strings, attached to a randomly-generated under-report with 45 % probability (`L12122`):

| # | Reason | Effect |
|---|---|---|
| 1 | `Rider disputed the fare after a route change` | Rendered as `💬 Driver note: "…"` in the row (`L12224`) and in an amber panel in the resolve modal (`L12159`). **No effect on the debt amount.** |
| 2 | `Rider only had partial cash on hand` | same |
| 3 | `Rider negotiated a lower amount before the trip started` | same |

### 7.5 Cash resolution outcomes (`resolveCashEntry(id, outcome)`, `L12146`)

| `outcome` | Modal title | Confirm button | Resulting status | Money effect |
|---|---|---|---|---|
| `'approved'` | `✓ Approve cash report — {id}` | `✓ Confirm approval` (`.btn sm p`) | `resolved` (`L12175`) | **none** — debt unaffected (`L12163`) |
| `'escalated'` | `🚨 Escalate to Trust & Safety — {id}` | `🚨 Confirm escalation` (`.btn sm danger`) | `escalated` (`L12175`) | **none** — debt stays (`L12165`); adds `playAlertBeep()` + ops notification |

### 7.6 Escrow states — see §6.2. Two values only: `'held'`, `'ready'`.

### 7.7 Audit action keys used by this module (`ACTION_LABELS`, `L2904`–`L2905`)

| Key | Label | Emitted by | Line |
|---|---|---|---|
| `process_all_payouts` | Process all payouts | `confirmProcessAll` | `L7055` |
| `release_escrow` | Release escrow | `releaseEscrow` | `L7069` |
| `apply_deduction` | Apply deduction | `confirmApplyDeduction` | `L7082` |
| `pay_driver` | Pay driver | `payDriver` | `L7034` |
| `cash_escalated` | *(no label entry)* | `commitCashResolve` | `L12178` |
| `cash_approved` | *(no label entry)* | `commitCashResolve` | `L12183` |
| `cash_debt_repaid` | *(no label entry)* | `commitCashRepayment` | `L12208` |

Seeded audit entries for this module (`L2865`–`L2871`), all by `USR-2` Fahad Al-Dosari:
- `AUD-0007` · 24 Jun 04:45 PM · `apply_deduction` · DRV-0103 · *"Deducted 20.00 SAR from Khalid Mansour's payout (Late pickup — 3rd occurrence)"* · before `{status:'pending'}` → after `{status:'applied',amount:'20.00 SAR'}`
- `AUD-0005` · 22 Jun 06:15 PM · `process_all_payouts` · entityType `finance` · *"Processed all driver payouts — 8,200.00 SAR total (3 drivers, cycle ending 22 Jun)"* · before `{pendingTotal:'8,200.00 SAR'}` → after `{pendingTotal:'0.00 SAR',driversProcessed:3}`
- `AUD-0004` · 22 Jun 05:50 PM · `release_escrow` · DRV-0101 · *"Released 86.50 SAR escrow to Ahmed Salem (ESC-1035)"* · before `{escrowStatus:'held (ESC-1035)'}` → after `{escrowStatus:'released',addedToPending:'86.50 SAR'}`
- `AUD-0001` · 20 Jun 03:40 PM · `pay_driver` · DRV-0101 · *"Paid 2,200.00 SAR to Ahmed Salem (payout cycle)"* · before `{pending:'2,200.00 SAR'}` → after `{pending:'0.00 SAR',paidOut:'2,200.00 SAR'}`

⚠ `AUD-0004` references `ESC-1035`, which does not exist in `DB.escrowHolds`. `AUD-0005` says 8,200.00 SAR while the seed's total pending is 2,360.00.

---

## 8. KPIs & metrics

### 8.1 Payout / escrow / deduction KPI strip — `.g4` (`L975`–`L980`), all four live

| # | id | Label | Formula | Unit | Colour | Sub-line | Click target |
|---|---|---|---|------|--------|----------|--------------|
| 1 | `#avail-now-kpi` | Available now (quick rides) | `SUM over DB.payouts of p.pending` → `.toFixed(2)` (`L8769`) | SAR | `var(--green)` | `#avail-now-sub` = `{count of pending>0} driver(s) with balance due` (`L8770`) | `kpiScrollTo('payouts-tbody')` |
| 2 | `#escrow-held-kpi` | Held in escrow | `SUM over holds where status==='held' of e.amount` → `.toFixed(2)` (`L8913`) | SAR | `var(--amber)` | `#escrow-held-sub` = `{n} subscription(s) in progress` (`L8915`) | `kpiScrollTo('escrow-list')` |
| 3 | `#escrow-ready-kpi` | Ready to release | `SUM over holds where status==='ready' of e.amount` → `.toFixed(2)` (`L8914`) | SAR | `var(--blue)` | `#escrow-ready-sub` = `{n} plan(s) fully delivered` (`L8916`) | `kpiScrollTo('escrow-list')` |
| 4 | `#deduct-kpi` | Pending deductions | `SUM over deductions where status==='pending' of d.amount` → `.toFixed(2)` (`L8953`) | SAR | `var(--red)` | `#deduct-sub` = `{n} awaiting review` (`L8954`) | `kpiScrollTo('deductions-list')` |

All four render `—` until their renderer runs. **No thresholds, no conditional colouring** — each tile's colour is a fixed inline style in the HTML.

### 8.2 Cash reconciliation KPI strip — `.g4` (`L1003`–`L1008`), all four live

| # | id | Label | Formula | Unit | Colour | Sub-line (hardcoded) | Click target |
|---|---|---|---|------|--------|----------------------|--------------|
| 5 | `#cash-debt-kpi` | Total driver debt outstanding | `fmtSAR(SUM over driverCashDebt of Math.max(0, -value))` (`L12240`, `L12245`) | SAR | `var(--red)` | `owed to the platform` | `kpiScrollTo('cash-debt-list')` |
| 6 | `#cash-pending-kpi` | Pending review | `count of cashLedger where status==='pending'` (`L12241`) | count | `var(--amber)` | `under-reports & no-shows` | `kpiScrollTo('cash-ledger-list')` |
| 7 | `#cash-escalated-kpi` | Escalated to Trust & Safety | `count of cashLedger where status==='escalated'` (`L12242`) | count | `var(--red)` | `repeat pattern detected` | `kpiScrollTo('cash-ledger-list')` |
| 8 | `#cash-blocked-kpi` | Drivers over debt cap | `count of Object.keys(driverCashDebt) where driverCashBlocked(k)` (`L12243`) | count | `var(--red)` | `🚫 cash collection suspended` | `kpiScrollTo('cash-debt-list')` |

⚠ KPI 7's sub-line reads *"repeat pattern detected"*, but the metric counts **all** escalations regardless of whether a repeat pattern existed. Escalation is a manual operator choice (`L12234`), independent of `driverCashRiskCount`.

### 8.3 Inline badges / counters

| id | Content | Formula | Line |
|---|---|---|---|
| `#payouts-pending-badge` | `{totalPending} SAR pending`, class `b b-amber` | `SUM of p.pending` | `L982`, `L8768` |
| `#escrow-count` | count, class `b b-amber` | `DB.escrowHolds.length` — **all statuses, not just held** | `L990`, `L8917` |
| `#deduct-count` | count, class `b b-red` | `pending.length` | `L994`, `L8955` |
| `#cash-tolerance-lbl` | `2.00` | `CASH_TOLERANCE.toFixed(2)` | `L1010`, `L12247` |

### 8.4 Per-driver metrics computed elsewhere from this module's data

| Metric | Formula | Where shown | Line |
|---|---|---|---|
| Held in escrow (per driver) | `SUM over holds where driver===d.id && status==='held' of amount` | Driver 360° "💰 Earnings breakdown" | `L4164`–`L4165`, `L4172` |
| Ready to release (per driver) | `SUM over holds where driver===d.id && status==='ready' of amount` | same | `L4166`, `L4173` |
| Pending deductions (per driver) | `SUM over deductions where driver===d.id && status==='pending' of amount` | same, rendered `−{n} SAR` | `L4167`, `L4176` |
| Tips earned | `SUM over DB.trips where t.driver===d.id of (t.tip||0)` | same, rendered `+{n} SAR` | `L4170`, `L4174` |
| Incentive bonuses | `SUM over DB.driverBonusLog where b.driverId===d.id of b.amount` | same, `+{n} SAR` + count | `L4168`–`L4169`, `L4175` |
| Cash debt in the risk score | `cashDebt = -(DB.driverCashDebt[drvId] \|\| 0)`; if `cashDebt>0 && driverCashBlocked(drvId)` → **`score -= 30`** and reason *"Cash-collection suspended — {fmtSAR(cashDebt)} owed, over the debt cap"*; else if `cashDebt>0` → reason *"{fmtSAR(cashDebt)} outstanding cash debt"* with no score change | Driver scoring | `L14300`–`L14302` |

---

## 9. Data displayed

| Element | DB path / source | Type | Unit | Notes |
|---|---|---|---|---|
| h1 "Driver wallets" / sub | literals `L969` | text | — | hardcoded |
| Blue "How payouts work" panel | literal `L972` | prose | — | **hardcoded**, 100 % static |
| KPI 1–4 values | see §8.1 | number | SAR | live |
| KPI 5–8 values | see §8.2 | number | SAR / count | live; **not rendered at boot** |
| Amber "How cash reconciliation works" panel | literal `L1000` | prose | — | **hardcoded** |
| `#cash-tolerance-lbl` | `CASH_TOLERANCE` `L12077` | number | SAR | `2.00` |
| Payout row: Driver | `DB.drivers[id].name` with fallback `{name:id,rating:0,lvl:'standard'}` | link | — | `L8754`, `L8759`; `openProfile(id)` |
| Payout row: rating chip | `dd.rating` — rendered only if truthy | badge | ★ | `b-gold` if `lvl==='gold'`, else `b-silver`; **`b-silver` even for `standard`/`new`** (`L8759`) |
| Payout row: Level | `lvlBadgeSm(dd.lvl)` | badge | — | `L8760`, `L8901`–`L8905` |
| Payout row: Trips (Jun) | `p.trips` | number | count | `L8761` — raw integer, no formatting |
| Payout row: Earned | `p.earned.toFixed(2)` | number | SAR | `color:var(--blue);font-weight:500` |
| Payout row: Paid out | `p.paidOut.toFixed(2)` | number | SAR | `color:var(--green)` |
| Payout row: Pending | `p.pending.toFixed(2)` | number | SAR | amber when `>0`, ghost when `0` (`L8757`) |
| Payout row: deduction sub-line | `p.deductionNote` | text | SAR | `−{amount} deducted · {type}`, red 9.5 px (`L8757`) |
| Payout row: Last payout | `p.lastPayout` | string | — | `L8764` |
| Escrow row: sub id | `e.sub` | link | — | `openProfile(e.sub)`, blue (`L8922`) |
| Escrow row: amount | `e.amount.toFixed(2)` | number | SAR | blue when `ready`, `var(--amber-dk)` when `held` (`L8923`) |
| Escrow row: `driver ← rider` | `nm2(e.driver)` / `nm2(e.rider)` | links | — | both `openProfile` (`L8924`) |
| Escrow row: progress bar | `Math.round(tripsCompleted/tripsRequired*100)` | number | % | `.ren-fill rf-g` (ready) or `rf-a` (held) (`L8925`) |
| Escrow row: trips label | `{tripsCompleted}/{tripsRequired} trips delivered` | text | count | `L8926` |
| Deduction row: driver name | `nm2(d.driver)` | link | — | `openProfile` (`L8960`) |
| Deduction row: amount | `−{d.amount.toFixed(2)} SAR` | number | SAR | `color:var(--red);font-weight:600` (`L8961`) |
| Deduction row: meta | `{d.type} · {rowLink(d.trip)} · {d.date}` | text + link | — | `L8962` |
| Cash row: `id · tripId` | `e.id`, `e.tripId` | text | — | `font-family:monospace` (`L12219`) |
| Cash row: classification badge | see §6.5 | badge | — | `L12213`–`L12216` |
| Cash row: status badge | see §6.4 | badge | — | `L12217` |
| Cash row: pattern chip | `driverCashRiskCount(e.driver) >= 2` | badge | count | `⚠ {n}× pattern`, `b-red`, `title="This driver has {n} under-reported/missing cash trips"` (`L12219`) |
| Cash row: driver | `nm2(e.driver)` | link | — | `openProfile` (`L12220`) |
| Cash row: rider + confirmation | `nm2(e.rider)` + `· ✓ rider confirmed handover` \| `· ⚠ rider has not confirmed` (only when `reportedAmount != null`) | text | — | `L12221` |
| Cash row: driver note | `e.reason` | text | — | `💬 Driver note: "…"`, `var(--amber-dk)` (`L12222`) |
| Cash row: Expected | `fmtSAR(e.expectedFare)` | number | SAR | `L12226` |
| Cash row: Reported | `fmtSAR(e.reportedAmount)` — row omitted entirely when null | number | SAR | `L12227` |
| Cash row: top-up sub-line | `incl. {fmtSAR(e.topupAmount)} wallet top-up` — only when `topupAmount` truthy | text | SAR | blue 10 px (`L12227`) |
| Cash row: Δ deviation | `(deviation>=0?'+':'')+fmtSAR(deviation)` | number | SAR signed | red when `<0` (`L12228`) |
| Cash row: Owed | `fmtSAR(e.debtAdded)` | number | SAR | muted 10 px (`L12229`) |
| Debt ledger: Driver | `nm2(d)` | link | — | `openProfile` (`L12260`) |
| Debt ledger: Outstanding debt | `fmtSAR(-DB.driverCashDebt[d])` | number | SAR | `font-weight:600;color:var(--red)` (`L12261`) |
| Debt ledger: Status | `driverCashBlocked(d)` | badge | — | `🚫 Cash collection suspended` (`b-red`) or `Deducted from next payout` (`b-amber`) (`L12262`) |

---

## 10. Input fields

**The `#p-wallets` page contains zero `<input>`, `<select>`, or `<textarea>` elements.** Verified across `L968`–`L1017`.

**No modal opened by this module contains an input either.** Every one of the six modals (§13) is a preview-and-confirm dialog with fixed amounts:

| Modal | Amount source | Editable? |
|---|---|---|
| Confirm payment | `p.pending` | ❌ read-only |
| Process all payouts | `SUM p.pending` | ❌ read-only |
| Release escrow | `e.amount` | ❌ read-only |
| Apply deduction | `d.amount` | ❌ read-only |
| Approve / escalate cash | `e.debtAdded` (display only) | ❌ read-only |
| Record cash repayment | `-(DB.driverCashDebt[id])` | ❌ read-only, **full balance only** |

Consequence: **partial payouts, partial escrow releases, partial deductions, and partial debt repayments are all impossible.** See §19 G3.

---

## 11. Actions

### 11.1 Page-level

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 1 | **`Process all payouts`** (`.btn p sm`, page header) | `processAllPayouts(this)` `L7037` | Opens preview only | none | **none at this stage** | none | ✅ opens the modal; the *commit* is `confirmProcessAll` |
| 2 | KPI 1 "Available now" | `kpiScrollTo('payouts-tbody')` | none | none | none | none | no |
| 3 | KPI 2 "Held in escrow" | `kpiScrollTo('escrow-list')` | none | none | none | none | no |
| 4 | KPI 3 "Ready to release" | `kpiScrollTo('escrow-list')` | none | none | none | none | no |
| 5 | KPI 4 "Pending deductions" | `kpiScrollTo('deductions-list')` | none | none | none | none | no |
| 6 | KPI 5 "Total driver debt outstanding" | `kpiScrollTo('cash-debt-list')` | none | none | none | none | no |
| 7 | KPI 6 "Pending review" | `kpiScrollTo('cash-ledger-list')` | none | none | none | none | no |
| 8 | KPI 7 "Escalated to Trust & Safety" | `kpiScrollTo('cash-ledger-list')` | none | none | none | none | no |
| 9 | KPI 8 "Drivers over debt cap" | `kpiScrollTo('cash-debt-list')` | none | none | none | none | no |

### 11.2 Payouts table

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 10 | Driver name cell | `openProfile(id)` `L8759` | none | `navStack` | none | none | no |
| 11 | **`Pay {amount}`** (`.btn sm p`, only when `pending>0`) | `confirmPayDriver(id)` `L7194` | Opens preview only | none | **none at this stage** | none | ✅ opens modal |
| 12 | `No balance due` (disabled) | — | none | none | — | — | — |
| 13 | **`Confirm — Pay {amount} SAR`** (inside modal) | `executePayout(driverId)` `L8716` | **YES → calls `payDriver` after 1100 ms** | see #14 | none of its own | none of its own | it *is* the confirmation |
| 14 | *(internal)* `payDriver(driverId)` | `L7023` | **YES — `paidOut += pending; pending = 0`** | `DB.payouts[driverId]` (4 fields), `DB.drivers[id].notifLog` (via `executePayout` `L8731`), `DB.auditLog` | ✅ `requirePerm('process_payouts')` `L7024` | ✅ `logAction('pay_driver','driver',driverId, 'Paid {amt} SAR to {name}', {pending:fmtSAR(amt)}, {pending:fmtSAR(0), paidOut:fmtSAR(p.paidOut)})` `L7034` | via #11/#13 |
| 15 | `📋 View detailed trip-by-trip earnings statement →` (borderless link inside the payment modal) | `openEarningsStatement(driverId)` `L7213` | none | none | none | none | no |
| 16 | `← Back to payment` (in the statement modal) | `confirmPayDriver(driverId)` | none | none | none | none | reopens the payment modal |
| 17 | **`Process {total} SAR`** (in the batch modal) | `confirmProcessAll()` `L7049` | **YES — zeroes every positive pending balance** | `DB.payouts[*]` (all 4 money fields for each driver with `pending>0`), `DB.auditLog` | ✅ `requirePerm('process_payouts')` `L7050` | ✅ `logAction('process_all_payouts','finance','', …)` `L7055` | it *is* the confirmation |

⚠ **`executePayout` performs no permission check of its own** (`L8716`–`L8747`). It renders a "Submitting to bank network…" spinner (`L8724`), then after `setTimeout(…, 1100)` calls `payDriver` (`L8729`), which *does* check. If the check fails, the user has already seen the spinner and the modal then reports a *success* screen anyway (`L8733`–`L8746`) — the "Payment sent" panel is rendered unconditionally after the timeout, with no check on whether `payDriver` actually moved anything. See §17 R10.

### 11.3 Escrow list

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 18 | Sub id / driver name / rider name | `openProfile(…)` `L8922`, `L8924` | none | `navStack` | none | none | no |
| 19 | **`Release to driver`** (`.btn sm p`, only when `status==='ready'`) | `confirmReleaseEscrow(e.id)` `L8935` | Opens preview only | none | **none at this stage** | none | ✅ opens modal |
| 20 | `Held until complete` (`b b-amber`, when `status==='held'`) | *(not a button)* | none | none | — | — | — |
| 21 | **`Release {amount} SAR`** (inside modal) | `releaseEscrow(id)` `L7058` | **YES — deletes the hold, `pending += amount`, `earned += amount`** | `DB.escrowHolds` (splice), `DB.payouts[driver]` (may create), `DB.auditLog` | ✅ `requirePerm('release_escrow')` `L7059` | ✅ `logAction('release_escrow','driver',e.driver, 'Released {amt} SAR escrow to {name} ({id})', {escrowStatus:'held ({id})'}, {escrowStatus:'released', addedToPending:fmtSAR(e.amount)})` `L7069` | it *is* the confirmation |

### 11.4 Deductions list

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 22 | Driver name | `openProfile(d.driver)` `L8960` | none | `navStack` | none | none | no |
| 23 | Trip id link | `openProfile(d.trip)` via `rowLink` `L8962` | none | `navStack` | none | none | no |
| 24 | **`Apply deduction`** (`.btn sm danger`, only when `status==='pending'`) | `applyDeduction(d.id)` `L8971` | Opens preview only | none | **none at this stage** | none | ✅ opens modal |
| 25 | **`Waive`** (`.btn sm`, only when `status==='pending'`) | `waiveDeduction(d.id)` `L8986` | **Sets `status='waived'` IMMEDIATELY** — no money moves, but the deduction is permanently dismissed | `DB.deductions[*].status` | ❌ **NONE** | ❌ **NONE** | ❌ **NO CONFIRMATION — single click, irreversible** |
| 26 | **`Confirm deduction`** (`.btn danger sm`, inside modal) | `confirmApplyDeduction(id)` `L7072` | **YES — `pending = max(0, pending − amount)`** | `DB.deductions[*].status='applied'`, `DB.payouts[driver].pending`, `.deductionNote`, `DB.auditLog` | ✅ `requirePerm('apply_deductions')` `L7073` | ✅ `logAction('apply_deduction','driver',d.driver, 'Deducted {amt} SAR from {name}'s payout ({type})', {status:prevStatus}, {status:'applied',amount:fmtSAR(d.amount)})` `L7082` | it *is* the confirmation |

### 11.5 Cash reconciliation queue

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 27 | Driver name | `openProfile(e.driver)` `L12220` | none | `navStack` | none | none | no |
| 28 | **`✓ Approve / accept explanation`** (`.btn sm p`, only when `status==='pending'`) | `resolveCashEntry(e.id,'approved')` `L12146` | Opens preview only | none | ✅ **double gate** — `requirePerm('process_payouts')` `L12147` **and** `requirePagePerm('wallets','cash_review')` `L12148` | permission denial is logged by both helpers (`L3129`, `L10687`) | ✅ opens modal |
| 29 | **`🚨 Escalate to Trust & Safety`** (`.btn sm danger`) | `resolveCashEntry(e.id,'escalated')` | Opens preview only | none | same double gate | same | ✅ opens modal |
| 30 | **`✓ Confirm approval`** (inside modal) | `commitCashResolve(id,'approved')` `L12171` | **none** — status only | `DB.cashLedger[*].status='resolved'`, `DB.auditLog` | ❌ **none of its own** (relies on the gate at #28) | ✅ `logAction('cash_approved','cash_ledger',e.id, …, {status:'pending'}, {status:'resolved'})` `L12183` | it *is* the confirmation |
| 31 | **`🚨 Confirm escalation`** (inside modal) | `commitCashResolve(id,'escalated')` | **none** — status only | `DB.cashLedger[*].status='escalated'`, `DB.auditLog`, ops notification | ❌ **none of its own** | ✅ `logAction('cash_escalated','cash_ledger',e.id, …, {status:'pending'}, {status:'escalated'})` `L12178` | it *is* the confirmation |

⚠ Both `commitCashResolve` and `commitCashRepayment` are plain globals with **no permission check** — the gate lives only in the *opener* (`resolveCashEntry` / `recordCashRepayment`). See §17 R11.

### 11.6 Driver cash debt ledger

| # | Label | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 32 | Driver name | `openProfile(d)` `L12260` | none | `navStack` | none | none | no |
| 33 | **`Record repayment`** (`.btn sm p`) | `recordCashRepayment(d)` `L12187` | Opens preview only | none | ✅ **double gate** — `requirePerm('process_payouts')` `L12188` **and** `requirePagePerm('wallets','cash_repayment')` `L12189` | denial logged | ✅ opens modal; early-exits with an info toast if `owed <= 0` (`L12190`) |
| 34 | **`✓ Confirm {owed} repayment`** (inside modal) | `commitCashRepayment(driverId)` `L12203` | **YES — clears the entire debt to `0`** | `DB.driverCashDebt[driverId] = 0`, `DB.auditLog` | ❌ **none of its own** | ✅ `logAction('cash_debt_repaid','driver',driverId, '{name} repaid {fmtSAR(owed)} in outstanding cash debt', {}, {})` `L12208` — **`before`/`after` are empty objects**, so the audit diff shows nothing | it *is* the confirmation |

---

## 12. Tables & lists

### 12.1 Available payouts — quick rides — `<tbody id="payouts-tbody">` (`L983`–`L986`, rendered `L8748`–`L8772`)

- **Ordered columns (8):** `Driver` · `Level` · `Trips (Jun)` · `Earned` · `Paid out` · `Pending` · `Last payout` · `Action`
- **Row source:** `Object.keys(DB.payouts).map(...)` — **object-key insertion order** (`DRV-0101`, `DRV-0102`, `DRV-0104`).
- **Sort / filter / search:** **none**.
- **Driver cell composition** (`L8759`): optional `★{rating}` chip (`b-gold` if `lvl==='gold'` else `b-silver`) + `dd.name` as a blue clickable `.td-name`, with `{id}` beneath as `.td-sub`.
- **Missing-driver fallback:** `DB.drivers[id] || {name:id, rating:0, lvl:'standard'}` (`L8754`) — so an orphan payout renders with the raw id as the name and no rating chip.
- **Row click:** none on the `<tr>`; the driver name cell calls `openProfile`.
- **Row action:** `Pay {pending}` when `pending>0`, else a disabled `No balance due`.
- **Totals/footer:** **no `<tfoot>`.** The total appears only in the card-header badge `#payouts-pending-badge` and KPI 1.
- **Empty state:** **none** — if `DB.payouts` is empty, `tbody.innerHTML` becomes `''` and the table renders with headers and no rows and no message. See §19 G2.
- **No column alignment or currency suffix** — `Earned`/`Paid out`/`Pending` show bare 2-dp numbers with no `SAR`; the unit appears only in the header badge and the action button label.

### 12.2 Subscription escrow holds — `#escrow-list` (`L991`, rendered `L8906`–`L8934`)

- **Not a `<table>`** — a card list inside `max-height:360px;overflow-y:auto`.
- **Row source:** `DB.escrowHolds.map(...)` — **array order**, i.e. `ESC-1041`, `ESC-1052`, `ESC-1060`, `ESC-1075`.
- **Sort / filter / search:** **none** — `held` and `ready` rows are interleaved in seed order rather than grouped.
- **Row layout** (`L8920`–`L8929`): sub id (blue, clickable) + amount (right) / `driver ← rider` (both clickable) / progress bar / trips label + action.
- **Row separator:** `border-bottom:.5px solid #F2F1EE`.
- **Totals/footer:** none in the list; totals live in KPI 2/3 and the `#escrow-count` badge.
- **Empty state** (`L8918`): `<div style="padding:14px;font-size:11.5px;color:var(--ghost)">No active subscription escrow.</div>`

### 12.3 Pending deductions — `#deductions-list` (`L995`, rendered `L8948`–`L8970`)

- **Not a `<table>`** — a card list inside `max-height:360px;overflow-y:auto`.
- **Row source:** `DB.deductions.map(...)` — **all statuses**, array order (`DED-01`, `DED-02`, `DED-03`).
- **Visual state:** non-pending rows get `opacity:.6` (`L8959`).
- **Sort / filter / search:** **none** — resolved deductions stay permanently in the list, dimmed.
- **Row layout** (`L8959`–`L8965`): driver name (blue) + `−{amount} SAR` (red) / `{type} · {trip link} · {date}` / then either two buttons or a status badge.
- **Totals/footer:** none; totals in KPI 4 and `#deduct-count`.
- **Empty state** (`L8956`): `<div style="padding:14px;font-size:11.5px;color:var(--ghost)">No deductions on record.</div>`

### 12.4 Cash reconciliation queue — `#cash-ledger-list` (`L1011`, rendered `L12248`–`L12252`)

- **Not a `<table>`** — a card list inside `max-height:460px;overflow-y:auto`.
- **Row source & sort** (`L12250`):
  ```
  DB.cashLedger.slice()
    .sort((a,b) => (a.status==='pending'?0:1) - (b.status==='pending'?0:1))
    .slice(0, 150)
    .map(cashRowHTML)
  ```
  A **stable partition** — all `pending` rows first, everything else after, each group keeping its original newest-first order (`unshift` at `L12132`). **Hard cap of 150 rows**, silently truncated with no "showing 150 of N" indicator.
- **Filter / search:** **none** (the card header only says *"sorted by most recent"*, which is only true within each partition).
- **Row highlight:** `background:#FFFBF2` when `status==='pending'` (`L12218`).
- **Row layout:** see §9 (cash row entries).
- **Row actions:** two buttons in a `.ra` container, **only when `status==='pending'`** (`L12232`–`L12235`).
- **Totals/footer:** none — totals in KPI 5–8.
- **Empty state** (`L12251`): `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--ghost)">No cash trips reported yet.</div>` — this is what shows on a fresh session, since `DB.cashLedger` starts empty.

### 12.5 Driver cash debt ledger — `#cash-debt-list` (`L1015`, rendered `L12253`–`L12267`)

- **A real `<table class="dt">`** inside `max-height:400px;overflow-y:auto`.
- **Ordered columns (4):** `Driver` · `Outstanding debt` · `Status` · *(unnamed action column)*
- **Row source & sort** (`L12255`):
  ```
  Object.keys(DB.driverCashDebt)
    .filter(k => DB.driverCashDebt[k] < 0)          // only drivers actually in debt
    .sort((a,b) => DB.driverCashDebt[a] - DB.driverCashDebt[b])   // most negative FIRST = largest debt first
  ```
- **Row highlight:** `background:var(--red-lt)` when `driverCashBlocked(d)` (`L12260`).
- **Row action:** `Record repayment` (`.btn sm p`) in a `.ra` container, on **every** row (`L12263`).
- **Totals/footer:** **no `<tfoot>`** — the total is only in KPI 5.
- **Empty state** (`L12265`): `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--ghost)">No drivers currently owe cash debt.</div>`

### 12.6 Earnings statement table (modal, `L7222`–`L7225`)

- **Ordered columns (5):** `Trip` · `Date` · `Rider paid` · `Driver earned` · `Eyvar commission`
- **Row source:** `(d.trips||[]).map(...)`, skipping ids missing from `DB.trips` (`L7217`–`L7218`).
- **Colours:** Rider paid `var(--green)`, Driver earned `var(--blue)`, commission `var(--ghost)` 10.5 px.
- **Totals/footer:** **none.**
- **Empty state** (`L7224`): `<tr><td colspan="5" style="text-align:center;color:var(--ghost);padding:14px">No itemized trips on record for this cycle.</td></tr>`

---

## 13. Modals opened

### 13.1 Confirm payment — `confirmPayDriver(driverId)` (`L7194`–`L7212`)

- **Guard:** `if(!p || p.pending<=0 || !d) return;` (`L7197`) — no permission check
- **Title:** `Confirm payment — {d.name}` + `.modal-close`
- **Identity block** (`L7203`–`L7204`): `avatarHTML(d.name, 42, d.hasPhoto)` + name + `{driverId} · {d.bank ? d.bank.bankName : 'No bank on file'}`
- **Breakdown box** (bordered, `L7199`–`L7200`, `L7205`):
  | Row | Value |
  |---|---|
  | Net payout amount | `{p.pending.toFixed(2)} SAR` — `var(--green)`, bold, 13 px |
  | *(conditional on `p.deductionNote`)* Includes deduction — {type} | `−{amount.toFixed(2)} SAR` — red, 11 px |
- **Link:** `📋 View detailed trip-by-trip earnings statement →` → `openEarningsStatement(driverId)` (`L7206`)
- **Footnotes:** `🏦 Destination: IBAN ···{d.bank.iban.slice(-9)}` (`L7207`, falls back to `'—'`); `📧 Confirmation will be emailed + pushed to driver's app once sent` (`L7208`)
- **Buttons:** `Cancel` → `closeModal()`; **`Confirm — Pay {p.pending.toFixed(2)} SAR`** (`.btn p sm`) → `executePayout(driverId)` (`L7209`)
- **Preview logic:** the amount is `p.pending` read at render time and baked into the button label; `executePayout` re-reads `DB.payouts[driverId].pending` (`L8720`) so a change between render and click uses the newer value for the spinner text — but `payDriver` also re-reads it (`L7025`), so the actual transfer is always the current balance.
- **Commit:** `executePayout` → `payDriver`
- **Fields:** none

### 13.2 Processing payment / Payment sent — `executePayout(driverId)` (`L8716`–`L8747`)

Two sequential screens rendered into the same modal.

**Screen A — "Processing payment"** (`L8722`–`L8727`), **no close button**:
- Spinner (34 px, `border-top-color:var(--blue)`, `animation:spin .8s linear infinite`; the `@keyframes spin` style element is injected once with id `spin-kf`, `L8728`)
- `Submitting to bank network…`
- `Routing {amt.toFixed(2)} SAR via SARIE to {d.name}'s account`

**Screen B — "Payment sent"** (after `setTimeout(…, 1100)`, `L8733`–`L8746`), **with close button**:
- Green check circle (50 px)
- `{amt.toFixed(2)} SAR sent to {d.name}` (14 px bold)
- `Submitted via SARIE bank network`
- Bordered "Driver notified via" panel: ✓ `Email sent` → `{d.email || 'no email on file'}`; ✓ `Push notification sent` → `Driver app — Eyvar`
- Italic quote box containing the notification text
- **Button:** `Done` (`.btn p sm`) → `closeModal()`

**Side effect** (`L8730`–`L8732`): `d.notifLog.unshift({date:'Just now', channel:'Email + Push', msg:'Your payment of {amt} SAR has been confirmed and will arrive within 3 business days.'})`, creating `notifLog` if absent.

⚠ Screen B renders **unconditionally**, even if `payDriver` refused for lack of permission (§17 R10).

### 13.3 Earnings statement — `openEarningsStatement(driverId)` (`L7213`–`L7229`)

- **Title:** `Earnings statement — {d.name}` + `.modal-close`
- **Body:** the 5-column table described in §12.6
- **Button:** `← Back to payment` (`.btn sm`) → `confirmPayDriver(driverId)`
- **Note:** this function only replaces `#modal-content` — it does **not** re-add `.open` to the overlay, relying on the overlay already being open from `confirmPayDriver`.
- **Fields:** none · **Commit:** none

### 13.4 Process all payouts — `processAllPayouts(btn)` (`L7037`–`L7048`)

- **Early exit:** `if(!ids.length){toast('No pending balances to process','info');return;}` (`L7040`)
- **Title:** `Process all payouts` + `.modal-close`
- **Rows:**
  | Row | Value |
  |---|---|
  | Drivers with pending | `ids.length` (bold) |
  | **Total payout** *(13 px bold)* | `{total.toFixed(2)} SAR`, `color:var(--amber)` |
- **Footnote:** `Funds will be transferred to each driver's registered bank account.` (`L7045`)
- **Buttons:** `Cancel` → `closeModal()`; **`Process {total.toFixed(2)} SAR`** (`.btn p sm`) → `confirmProcessAll()` (`L7046`)
- **Preview logic:** `total` is computed over the **filtered** `pending>0` list (`L7038`–`L7039`); `confirmProcessAll` recomputes over the **unfiltered** key list (`L7051`). The money moved is identical (the `if(p.pending>0)` guard is inside the loop), but the reported driver count differs. See §17 R2.
- **Fields:** none · **Commit:** `confirmProcessAll`
- **Unused parameter:** `btn` is accepted (`L7037`) and never referenced.

### 13.5 Release escrow — `confirmReleaseEscrow(id)` (`L8935`–`L8947`)

- **Guard:** `if(!e) return;` (`L8937`) — no permission check
- **Title:** `Release escrow — {e.sub}` + `.modal-close`
- **Green banner** (`background:var(--green-lt)`, `border:.5px solid #9DC86A`, `L8942`): *"All {e.tripsRequired} trips completed successfully. This amount will move to {driverName}'s available payout balance immediately."*
  ⚠ This sentence is **rendered unconditionally**, using `tripsRequired` rather than `tripsCompleted`. If the function is invoked on a `held` hold (4/5 trips), it still asserts "All 5 trips completed successfully."
- **Row:** `Amount to release` → `{e.amount.toFixed(2)} SAR`, `var(--blue)`, 13 px bold (`L8943`)
- **Buttons:** `Cancel` → `closeModal()`; **`Release {e.amount.toFixed(2)} SAR`** (`.btn p sm`) → `releaseEscrow(id)` (`L8945`)
- **Fields:** none · **Commit:** `releaseEscrow`

### 13.6 Apply deduction — `applyDeduction(id)` (`L8971`–`L8985`)

- **Guard:** `if(!d) return;` (`L8973`) — no permission check
- **Title:** `Apply deduction` + `.modal-close`
- **Red banner** (`background:var(--red-lt)`, `border:.5px solid var(--red-border)`, `L8980`): *"{d.amount.toFixed(2)} SAR will be subtracted from {driverName}'s pending payout for: {d.type} (trip {rowLink(d.trip)})."*
- **Rows:**
  | Row | Value | Line |
  |---|---|---|
  | Current pending balance | `{avail.toFixed(2)} SAR` | `L8981` |
  | **Balance after deduction** *(13 px bold)* | `{Math.max(0, avail - d.amount).toFixed(2)} SAR`, `color:var(--red)` | `L8981` |
- **Buttons:** `Cancel` → `closeModal()`; **`Confirm deduction`** (`.btn danger sm`) → `confirmApplyDeduction(id)` (`L8983`)
- **Fields:** none · **Commit:** `confirmApplyDeduction`
- ⚠ `avail` uses `DB.payouts[d.driver]` directly (`L8975`), so for a driver with no payout record it shows `0.00 SAR` → `0.00 SAR`, giving no indication that the deduction will lose its entire value.

### 13.7 Approve / escalate cash report — `resolveCashEntry(id, outcome)` (`L12146`–`L12170`)

- **Guards:** `requirePerm('process_payouts')` (`L12147`) **and** `requirePagePerm('wallets','cash_review')` (`L12148`), then `if(!e) return;` (`L12150`)
- **Title:** `🚨 Escalate to Trust & Safety — {e.id}` or `✓ Approve cash report — {e.id}` (`L12154`)
- **Header** (`L12156`–`L12157`): driver name (blue, clickable → `closeModal(); openProfile(e.driver)`) over `Trip {e.tripId} · Rider {nm2(e.rider)}`
- **3-column figure grid** (`L12158`):
  | Cell | Value |
  |---|---|
  | Expected | `fmtSAR(e.expectedFare)` |
  | Reported | `fmtSAR(e.reportedAmount)` or `'—'` |
  | Deviation | `(deviation>=0?'+':'')+fmtSAR(deviation)`, red when negative; `'None — never reported'` when null |
- **Driver note panel** (conditional on `e.reason`, `L12159`): amber, `💬 Driver note: "{reason}"`
- **Consequence panel** (`L12160`–`L12164`), red when escalating:
  - escalate: *"This flags {driver} for a Trust & Safety investigation and cannot be undone from here. The debt already applied ({fmtSAR(e.debtAdded)}) stays on their ledger regardless of the outcome."*
  - approve: *"This accepts the driver's report/explanation — no further action is taken. The {fmtSAR(e.debtAdded)} already applied to their cash-debt ledger is unaffected either way."*
- **Buttons:** `Cancel` → `closeModal()`; **`🚨 Confirm escalation`** (`.btn sm danger`) or **`✓ Confirm approval`** (`.btn sm p`) → `commitCashResolve(id, outcome)` (`L12166`)
- **Fields:** none · **Commit:** `commitCashResolve`

### 13.8 Record cash-debt repayment — `recordCashRepayment(driverId)` (`L12187`–`L12202`)

- **Guards:** `requirePerm('process_payouts')` (`L12188`), `requirePagePerm('wallets','cash_repayment')` (`L12189`), then `if(owed<=0){toast('No outstanding cash debt for {name}','info');return;}` (`L12190`)
- **Title:** `💵 Record cash-debt repayment` + `.modal-close`
- **Header:** driver name, blue, clickable → `closeModal(); openProfile(driverId)` (`L12195`)
- **Amount panel** (centred, `L12196`): label `Outstanding cash debt` over `{fmtSAR(owed)}` at **20 px, `font-weight:700`, `var(--red)`**
- **Consequence panel** (`L12198`): *"Recording this clears the full outstanding balance to zero"* — plus, when `driverCashBlocked(driverId)`: *", and **restores {name}'s ability to collect cash trips** — they are currently suspended for being over the {fmtSAR(-CASH_DEBT_CAP)} debt cap."* (i.e. "over the 300.00 SAR debt cap")
- **Buttons:** `Cancel` → `closeModal()`; **`✓ Confirm {fmtSAR(owed)} repayment`** (`.btn sm p`) → `commitCashRepayment(driverId)` (`L12199`)
- **Fields:** **none — no partial-amount input**
- **Commit:** `commitCashRepayment`

---

## 14. States & badges

| Badge / visual | Exact trigger | Class / colour | Line |
|---|---|---|---|
| `#payouts-pending-badge` | always | `b b-amber`, text `{total} SAR pending` | `L982`, `L8768` |
| `#escrow-count` | always | `b b-amber`, `DB.escrowHolds.length` | `L990`, `L8917` |
| `#deduct-count` | always | `b b-red`, pending count | `L994`, `L8955` |
| Payout row rating chip | `dd.rating` truthy | `b-gold` when `lvl==='gold'`, else **`b-silver`** | `L8759` |
| Level badge Gold | `lvl==='gold'` | `b-gold` "Gold" | `L8902`–`L8904` |
| Level badge Silver | `lvl==='silver'` | `b-silver` "Silver" | `L8902` |
| Level badge Standard | `lvl==='standard'` | `b-grey` "Standard" | `L8902` |
| Level badge New | `lvl==='new'` | `b-grey` "New" | `L8902` |
| Level badge fallback | any other/absent `lvl` | `b-grey` + `'—'` when falsy, else `lvl` capitalised | `L8903` |
| Pending amount amber | `p.pending > 0` | `var(--amber);font-weight:500` | `L8757` |
| Pending amount ghost | `p.pending === 0` | `var(--ghost)` | `L8757` |
| Deduction sub-line on payout row | `p.deductionNote !== null` | red 9.5 px, `−{amount} deducted · {type}` | `L8757` |
| Pay button enabled | `p.pending > 0` | `.btn sm p`, label `Pay {amount}` | `L8766` |
| Pay button disabled | `p.pending === 0` | `disabled`, `opacity:.55;cursor:default`, label `No balance due` | `L8766` |
| Escrow amount blue | `status === 'ready'` | `var(--blue)` | `L8923` |
| Escrow amount amber | `status === 'held'` | `var(--amber-dk)` | `L8923` |
| Escrow progress fill green | `status === 'ready'` | `.ren-fill rf-g` | `L8925` |
| Escrow progress fill amber | `status === 'held'` | `.ren-fill rf-a` | `L8925` |
| `Held until complete` | `status !== 'ready'` | `b b-amber`, `font-size:9.5px` | `L8927` |
| `Release to driver` button | `status === 'ready'` | `.btn sm p` | `L8927` |
| Deduction row dimmed | `status !== 'pending'` | `opacity:.6` | `L8959` |
| `✓ Applied — deducted from payout` | `status === 'applied'` | `b b-red` | `L8964` |
| `Waived — no deduction` | `status === 'waived'` | `b b-grey` | `L8964` |
| Cash: `⏰ Never reported` | `e.reportedAmount == null` | `b b-red` | `L12213` |
| Cash: `✓ Matches` | `classification === 'match'` | `b b-green` | `L12214` |
| Cash: `↑ Over-reported` | `classification === 'over_report'` | `b b-blue` | `L12215` |
| Cash: `↓ Under-reported` | `classification === 'under_report'` | `b b-red` | `L12216` |
| Cash status `Resolved` | `status === 'resolved'` | `b b-green` | `L12217` |
| Cash status `🚨 Escalated` | `status === 'escalated'` | `b b-red` | `L12217` |
| Cash status `Pending review` | anything else | `b b-amber` | `L12217` |
| Cash row highlight | `status === 'pending'` | `background:#FFFBF2` | `L12218` |
| Cash pattern chip `⚠ {n}× pattern` | `driverCashRiskCount(e.driver) >= 2` | `b b-red` + `title` tooltip | `L12219` |
| `✓ rider confirmed handover` | `reportedAmount != null && riderConfirmed` | inline text | `L12221` |
| `⚠ rider has not confirmed` | `reportedAmount != null && !riderConfirmed` | inline text | `L12221` |
| Deviation red | `deviation < 0` | `var(--red)` | `L12228` |
| Debt row highlight | `driverCashBlocked(d)` | `background:var(--red-lt)` | `L12260` |
| `🚫 Cash collection suspended` | `driverCashBlocked(d)` | `b b-red` | `L12262` |
| `Deducted from next payout` | `!driverCashBlocked(d)` | `b b-amber` | `L12262` |
| Cash toast — normal | `status==='pending'` and `riskCount < 2` | `'⚠ '+msg`, type `warn` | `L12136` |
| Cash toast — pattern | `status==='pending'` and `riskCount >= 2` | `'🚨 '+msg+' — repeat pattern'`, type `err` | `L12136` |
| Ops notification level | `isPattern ? 'alert' : 'warning'` | title `'Repeat cash pattern — '` or `'Cash review needed — '` | `L12137` |

---

## 15. Cross-module links

**Outbound:**

| From | To | Mechanism | Line |
|---|---|---|---|
| Payout row driver name | Driver 360° profile | `openProfile(id)` | `L8759` |
| Escrow row sub id | Subscription profile | `openProfile(e.sub)` | `L8922` |
| Escrow row driver / rider | Driver / rider profile | `openProfile(…)` | `L8924` |
| Deduction row driver | Driver profile | `openProfile(d.driver)` | `L8960` |
| Deduction row trip id | Trip profile | `rowLink(d.trip)` | `L8962` |
| Cash row driver | Driver profile | `openProfile(e.driver)` | `L12220` |
| Debt-ledger driver | Driver profile | `openProfile(d)` | `L12260` |
| Cash resolve modal driver name | Driver profile | `closeModal(); openProfile(e.driver)` | `L12156` |
| Repayment modal driver name | Driver profile | `closeModal(); openProfile(driverId)` | `L12195` |
| Escalation | Trust & Safety (conceptual — no page navigation) | `logAction('cash_escalated')` + ops notification | `L12178`–`L12180` |

**Inbound:**

| From | Mechanism | Line |
|---|---|---|
| Sidebar `nav.wallets` | `go('wallets',this)` | `L528` |
| Finance page — 5 KPI tiles | `go('wallets',null)` | `L933`, `L934`, `L937`, `L938`, `L939` |
| Driver 360° "💰 Earnings breakdown" → `View in Wallets →` | `go('wallets',null)` — rendered only when `myEscrow.length \|\| myDeduct` | `L4176` |
| Cash-event toast (clickable) | `toast(msg, level, ()=>go('wallets',null), false)` | `L12136` |
| Ops notifications (3 distinct) | `pushOpsNotification(…, ()=>go('wallets',null))` | `L12137`, `L12180` |
| Trip completion simulation | `maybeGenerateCashEvent(t, base)` → `DB.cashLedger`, `DB.driverCashDebt` | `L12101` |

**Shared data consumed by other modules:**

| Collection | Consumer | Line |
|---|---|---|
| `DB.escrowHolds` | Driver 360° earnings card | `L4164`–`L4166` |
| `DB.deductions` | Driver 360° earnings card | `L4167` |
| `DB.driverCashDebt` + `driverCashBlocked` | Driver risk score (**−30 points** when suspended) | `L14300`–`L14302` |
| `DB.payouts` | `applyDeduction` preview | `L8975` |
| `DB.cashLedger` | `driverCashRiskCount` → Predictive Signals (per the comment at `L12093`–`L12096`) | `L12097` |

---

## 16. Hardcoded / mock / demo values

| # | Value | Where | Line |
|---|-------|-------|------|
| 1 | h1 "Driver wallets" / sub "Quick-ride earnings, subscription escrow & deductions" | header | `L969` |
| 2 | Toolbar sub `wallets:'Driver payout management'` | `subs` map | `L2169` |
| 3 | Entire blue "How payouts work" explainer | card | `L972` |
| 4 | Entire amber "How cash reconciliation works" explainer | card | `L1000` |
| 5 | Card header text *"Late pickups, no-shows"* | deductions card | `L994` |
| 6 | Card header text *"sorted by most recent"* (only true within each status partition) | cash queue | `L1010` |
| 7 | Card header text *"Auto-deducted from the next payout · settle manually anytime"* — **no auto-deduction code exists** | debt ledger | `L1014` |
| 8 | `DB.payouts` — 3 seed rows, all `lastPayout:'22 Jun'` | seed | `L2813`–`L2815` |
| 9 | `DB.escrowHolds` — 4 seed rows with manually-assigned `ESC-*` ids | seed | `L2802`–`L2805` |
| 10 | `DB.deductions` — 3 seed rows with manually-assigned `DED-*` ids and free-text types | seed | `L2808`–`L2810` |
| 11 | `CASH_COMMISSION_RATE = 0.20` | constant | `L12076` |
| 12 | `CASH_TOLERANCE = 2.00` SAR | constant | `L12077` |
| 13 | `CASH_DEBT_CAP = -300` SAR | constant | `L12078` |
| 14 | `CASH_TRIP_CHANCE = 0.35` — comment says explicitly *"for demo data"* | constant | `L12079` |
| 15 | `CASH_REASONS` — 3 fixed strings | constant | `L12100` |
| 16 | Cash-event probability ladder: `roll<0.05` never-report · `<0.55` near-match ±1 SAR · `<0.65` top-up 15–50 SAR · `<0.85` over-report +6…+18 · else under-report −4…−14 | `maybeGenerateCashEvent` | `L12109`–`L12122` |
| 17 | `riderConfirmed` = `Math.random() < 0.85` when reported, `false` otherwise | `maybeGenerateCashEvent` | `L12129` |
| 18 | Reason attached to an under-report with `Math.random() < 0.45` | same | `L12122` |
| 19 | Payment spinner delay `setTimeout(…, 1100)` ms | `executePayout` | `L8747` |
| 20 | Bank network named **SARIE** (twice) | `executePayout` | `L8726`, `L8736` |
| 21 | `'Your payment of {amt} SAR has been confirmed and will arrive within 3 business days.'` | `executePayout` | `L8730` |
| 22 | `p.lastPayout = 'Just now'` literal | `payDriver`, `confirmProcessAll` | `L7031`, `L7053` |
| 23 | Seeded audit `AUD-0005`: *"8,200.00 SAR total (3 drivers, cycle ending 22 Jun)"* — inconsistent with the 2,360.00 seed total | `DB.auditLog` | `L2867` |
| 24 | Seeded audit `AUD-0004` references `ESC-1035`, which is not in `DB.escrowHolds` | `DB.auditLog` | `L2868` |
| 25 | Seeded audit `AUD-0001`: *"Paid 2,200.00 SAR to Ahmed Salem"* — matches `DRV-0101.paidOut` but the seed's `lastPayout` says 22 Jun while `AUD-0001` is dated 20 Jun | `DB.auditLog` | `L2871` |
| 26 | Notification seed `N5`: *"6,420 SAR awaiting processing for 3 drivers"* — the live total is 2,360.00 | `DB.notifications` | `L2764` |
| 27 | Row cap of **150** on the cash queue | `renderCashReconciliation` | `L12250` |
| 28 | `simulateTip` chance ladder (0.45 / 0.25 / 0.10 / 0.02) and 2–10 SAR range rounded to the nearest half riyal | `L12044`–`L12047` |

---

## 17. Financial risks & unguarded operations

**R1 — `waiveDeduction` is completely ungoverned.** `L8986`–`L8992`: no `requirePerm`, no `requirePagePerm`, no confirmation modal, no `logAction`. A single click on `Waive` permanently sets `d.status='waived'` with no record of who did it or why. This is the only status-changing action on the page with **none** of the four controls — and the permission that was written for it (`apply_deductions`, labelled *"Apply **/ waive** deductions"*, `L3233`) is checked on the apply path but not here.

**R2 — `confirmProcessAll` iterates the wrong list for its audit record.** The preview computes over `ids = keys.filter(pending>0)` (`L7038`), the commit over `ids = Object.keys(DB.payouts)` (`L7051`). Money moved is correct (the `if(p.pending>0)` guard is inside the loop, `L7053`), but the audit entry reports `driversProcessed: ids.length` = **every driver with a payout record**, and the summary string says `'{ids.length} payouts processed'` (`L7055`). With the seed that happens to coincide (3 = 3), but the moment one driver has a zero balance the audit trail overstates the batch.

**R3 — `releaseEscrow` never checks the hold's status.** `L7058`–`L7071` looks up by id and releases immediately. The `status==='ready'` test lives only in the *renderer* (`L8927`), which decides whether to draw the button. `window.releaseEscrow('ESC-1041')` from the console releases a 4-of-5-trips hold, and the confirmation modal that precedes it will still print *"All 5 trips completed successfully"* (`L8942`) because that banner is unconditional and uses `tripsRequired`.

**R4 — `confirmApplyDeduction` never checks whether the deduction was already applied or waived.** `L7072`–`L7084` reads `prevStatus` purely for the audit diff (`L7076`, `L7082`) and then unconditionally sets `applied` and subtracts. Re-invoking it on an already-applied id subtracts the amount a second time. The UI hides the button after the first application, but the function is a plain `window.*` global.

**R5 — The escrow lifecycle is not implemented.** No code creates an escrow hold, no code increments `tripsCompleted`, and no code transitions `held → ready`. The only mutations to `DB.escrowHolds` are the seed literal (`L2801`) and the `splice` in `releaseEscrow` (`L7064`). The page's headline promise — *"Subscription payments are held in escrow and only released to the driver once the full plan is delivered"* (`L972`) — has no runtime mechanism behind it.

**R6 — Escrow amounts embed a 20 % take rate that contradicts the plan configuration.** Every seeded hold equals `subscription.paid × 0.80` (§4.2), i.e. a flat 20 % commission. But `DB.plans.biweekly.eyvarPct = 18` (`L2892`) and `DB.plans.monthly.eyvarPct = 15` (`L2894`), and `ESC-1052`/`ESC-1060` belong to a Bi-weekly and a Monthly plan (`L2687`, `L2688`). Either the seed is wrong or the plan config is unused for escrow — and since no code computes escrow at all, the discrepancy can never be reconciled at runtime.

**R7 — Escrow progress bar has no zero-guard.** `Math.round(e.tripsCompleted / e.tripsRequired * 100)` (`L8921`). `tripsRequired === 0` produces `Infinity`/`NaN` and emits `style="width:NaN%"`. Every other percentage in this file uses a `x ? … : 0` guard (`L15738`, `L12050`); this one does not.

**R8 — The earnings statement is unrelated to the payout being confirmed.** `openEarningsStatement` iterates `d.trips` — the driver's **entire** trip array (`L7217`) — while the modal above it settles `p.pending`, a completely separate number from `DB.payouts`. Nothing links a trip to a payout cycle, there is no totals row, and the two figures can never be reconciled by the operator. The button labels this *"detailed trip-by-trip earnings statement"* (`L7206`), which implies it itemises the payout.

**R9 — Four of the six declared page permissions are never enforced.** `PAGE_PERMISSIONS.wallets` declares `view`, `process_payouts`, `release_escrow`, `apply_deductions`, `cash_review`, `cash_repayment` (`L10631`–`L10636`). Grep for `requirePagePerm('wallets'` returns exactly two hits: `cash_review` (`L12148`) and `cash_repayment` (`L12189`). The payout/escrow/deduction actions use the *global* legacy permissions instead, so a role whose page-permission matrix revokes `wallets.process_payouts` can still pay drivers as long as it retains the global `process_payouts`.

**R10 — `executePayout` shows a success screen regardless of outcome.** `L8716`–`L8747`: no permission check of its own; renders "Submitting to bank network…"; after 1100 ms calls `payDriver` (which *may* refuse via `requirePerm`, `L7024`) and then **unconditionally** renders "Payment sent — {amt} SAR sent to {name}" (`L8733`–`L8746`) and writes a driver notification claiming the money is on its way (`L8730`–`L8732`). A permission-denied payout produces a full success UI and a false driver notification.

**R11 — Every cash commit function is an unguarded global.** `commitCashResolve` (`L12171`) and `commitCashRepayment` (`L12203`) have no `requirePerm` / `requirePagePerm` of their own — the gates live only in their openers (`L12147`–`L12148`, `L12188`–`L12189`). `window.commitCashRepayment('DRV-0103')` clears that driver's entire debt with no permission check. (The same shape applies to `confirmProcessAll`, `releaseEscrow`, `confirmApplyDeduction`, and `payDriver` — but those four *do* re-check.)

**R12 — Deduction overflow is silently discarded.** `p.pending = Math.max(0, p.pending - d.amount)` (`L7079`). A 30 SAR no-show penalty against a driver with 10 SAR pending removes 10 SAR and forgets the other 20. There is no carry-forward field, no negative balance, and no warning. The preview modal shows `0.00 SAR` for "Balance after deduction" (`L8981`) without indicating that part of the penalty evaporated.

**R13 — `deductionNote` holds one slot.** `p.deductionNote = {amount, type}` (`L7080`) is an overwrite, not a push. Two deductions in one cycle leave only the second visible on the payout row (`L8757`) and in the confirmation modal (`L7200`), so the operator paying the driver sees an understated deduction summary.

**R14 — Cash debt accrues on honest reports.** `applyCashDebtImpact(entry)` is called for **every** generated cash event (`L12133`), including `match` and `over_report`. A driver who reports every riyal correctly still accumulates 20 % of every fare as debt and will eventually hit the −300 cap and be suspended from cash collection (`L12082`, `L12103`). The page's own explainer frames the debt as arising from *"an under-report … or a driver who never reports at all"* (`L1000`), which the code does not match.

**R15 — Debt repayment is all-or-nothing and self-attested.** `commitCashRepayment` sets `DB.driverCashDebt[driverId] = 0` (`L12207`) with no amount input, no reference number, no payment method, and no partial option. The audit entry passes `{}` for both `before` and `after` (`L12208`), so `auditDiffHTML` (`L3153`) renders no diff — the log line records that a repayment happened but not the balance it cleared, except inside the free-text summary.

**R16 — Cash-debt deduction from payouts is promised but not implemented.** The debt-ledger card header says *"Auto-deducted from the next payout"* (`L1014`), the row badge for a non-blocked driver says *"Deducted from next payout"* (`L12262`), and the page explainer says the debt is *"deducted automatically from their next payout"* (`L1000`). **No code path connects `DB.driverCashDebt` to `DB.payouts`.** `payDriver` (`L7023`) and `confirmProcessAll` (`L7049`) never read `driverCashDebt`. A driver with 250 SAR of cash debt is paid their full pending balance.

**R17 — Escrow and payout money never reaches the ledger.** Neither `releaseEscrow`, `payDriver`, `confirmProcessAll`, `confirmApplyDeduction`, nor any cash function calls `postLedger` (`L19918`). `ACCOUNTS['liability.escrow']` (`L19870`) is declared and never posted to; `liability.driver` is credited by `postFareCapture` (`L20047`) but never debited on payout. The trial balance (`L19948`) therefore shows a permanently growing captain-payable that no settlement ever clears.

**R18 — No idempotency on any driver-money action.** The refund and wallet paths are wrapped in `withIdempotency` (`L19962`, `L19978`, `L19994`), but `payDriver`, `confirmProcessAll`, `releaseEscrow`, `confirmApplyDeduction`, `commitCashRepayment` are not. A double-click on `Confirm — Pay` is only prevented by `p.pending` being zeroed on the first pass (`L7030`) — real protection by accident, not by design. `releaseEscrow` is likewise protected only by the `splice` making the second lookup fail (`L7061`).

**R19 — `#escrow-count` badge counts both statuses.** `setText('escrow-count', DB.escrowHolds.length)` (`L8917`) sits next to the header *"📦 Subscription escrow holds"* with class `b-amber` — the same amber used for "held". It reads as a held-count but is a total-count (4, not 2).

**R20 — Silver badge for every non-gold driver in the payouts table.** `dd.lvl==='gold' ? 'b-gold' : 'b-silver'` (`L8759`) — a `standard` or `new` driver gets a Silver-styled rating chip, contradicting the `Level` column immediately to its right, which correctly renders `b-grey` via `lvlBadgeSm` (`L8902`).

**R21 — No empty state on the payouts table.** `tbody.innerHTML = ids.map(...).join('')` (`L8753`, `L8767`) — an empty `DB.payouts` renders a headed table with zero rows and no message, unlike all four other lists on the page which have explicit empty states.

**R22 — `#cash-escalated-kpi` sub-line misstates its own metric.** The tile reads *"repeat pattern detected"* (`L1006`) but counts every escalation (`L12242`), which is an operator decision entirely independent of `driverCashRiskCount`.

---

## 18. i18n keys

| Key | English (DOM default) | Arabic | Where |
|-----|----------------------|--------|-------|
| `sec.finance` | `Finance` | `المالية` | section label `L526`; `LANG_STRINGS.ar` `L7913` |
| `nav.wallets` | `Driver wallets` | `محافظ السائقين` | sidebar item `L528`; `LANG_STRINGS.ar` `L7909` |

**Scope of translation:** `LANG_STRINGS` (`L7903`) covers only the sidebar nav and section labels — see the file's own note at `L7900`–`L7902`.

**Not translatable (English-only):** the h1 and subtitle (`L969`), both long explainer panels (`L972`, `L1000`), all eight KPI labels and sub-lines (`L976`–`L979`, `L1004`–`L1007`), all five card titles (`L982`, `L990`, `L994`, `L1010`, `L1014`), all eight payouts-table column headers (`L984`), the four debt-ledger column headers (`L12256`), every badge string in §14, every modal in §13, every toast, and every `logAction` summary.

**Arabic reason-code labels exist** (`DB.reasonCodes[*].labelAr`, `L14668`–`L14716`) — including `DRV_DEDUCTION_DISPUTE` → `اعتراض على خصم` (`L14710`) and `DRV_PAYOUT_ISSUE` → `مشكلة في التحويل` (`L14707`) — but none are surfaced on this page.

---

## 19. Gaps, dead code, UNVERIFIED items

### Gaps
| # | Gap | Evidence |
|---|-----|----------|
| G1 | `renderCashReconciliation()` is not in the boot list — half the page shows `—` until first visit | boot calls `renderPayoutsTable` `L14578`, `renderEscrow` `L14579`, `renderDeductions` `L14580`; no cash call |
| G2 | No empty state on the payouts table | `L8753`, `L8767` vs the four lists that do have one (`L8918`, `L8956`, `L12251`, `L12265`) |
| G3 | No partial amounts anywhere — payout, escrow release, deduction, and debt repayment are all all-or-nothing | §10 |
| G4 | Tips are computed and displayed (`L4170`) but never added to any payout balance | grep: no `pending +=` involving `tip` |
| G5 | No escrow creation, no `tripsCompleted` increment, no `held → ready` transition | §17 R5 |
| G6 | No deduction creation UI or generator — `DB.deductions` is seed-only | grep: only `L2807` and `.status=` writes |
| G7 | Cash debt is never actually deducted from a payout despite three UI claims | §17 R16 |
| G8 | No ledger postings for any driver-money movement | §17 R17 |
| G9 | No filter, search, sort, or date range on any of the five lists | §12 |
| G10 | No pagination on the cash queue — a silent 150-row cap instead | `L12250` |
| G11 | No totals row on the payouts table, the debt ledger, or the earnings statement | `L983`, `L12256`, `L7222` |
| G12 | No reversal path for `applied` or `waived` deductions, or for `escalated` cash entries | §6.3, §6.4 |
| G13 | Escrow release destroys the hold rather than archiving it | `L7064` |

### Dead / unreachable code
| # | Item | Evidence |
|---|------|----------|
| D1 | `var rows=[['Net payout amount', …]]` in `confirmPayDriver` — assigned, never read | `L7198` |
| D2 | `btn` parameter of `processAllPayouts` — accepted, never referenced | `L7037` |
| D3 | Comment *"final authoritative versions, override any stale duplicates"* (`L7022`) — grep finds **no** earlier definitions of `payDriver`, `processAllPayouts`, `releaseEscrow`, `confirmApplyDeduction`, or `renderPayoutsTable`; there is nothing to override | `L7022` |
| D4 | `'ready'` branch of `renderEscrow`'s status logic is reachable, but nothing can ever *enter* `'ready'` at runtime — only the seed sets it | `L8910` vs §17 R5 |
| D5 | `lvlBadgeSm` fallback `lvl.charAt(0).toUpperCase()+lvl.slice(1)` — unreachable for the four mapped values, and only reachable via an unmapped `lvl` string that the seed never produces | `L8903` |

### UNVERIFIED
| # | Item | Why unverifiable |
|---|------|------------------|
| U1 | Whether `maybeGenerateCashEvent` actually fires in a normal session | It is called from the trip-completion simulation, which is outside this module's assigned scope. `DB.cashLedger` starts empty (`L12080`), so all cash figures are `0` / empty until that simulation runs. |
| U2 | The runtime contents of `DB.cashLedger` and `DB.driverCashDebt` | Fully random — five probability branches (`L12109`–`L12122`), `Math.random()` for tip/confirmation/reason. Not statically determinable. |
| U3 | Whether `driverCashRiskCount` genuinely feeds Predictive Signals | The comment claims it does (`L12093`–`L12096`), but the Predictive Signals module is outside this module's scope and was not traced. |
| U4 | Whether `playAlertBeep()` (`L12177`) succeeds | Defined outside this module's scope; browser autoplay policy dependent. |
| U5 | Whether `DB.drivers[*].bank.iban` is always present | `confirmPayDriver` guards with `d.bank ? … : '—'` (`L7201`), and every seeded applicant has a `bank` object (`L2711`), but approved-driver records were not exhaustively checked. |
| U6 | The intended semantics of `p.earned` | `releaseEscrow` increments it (`L7067`) but `payDriver` does not decrement it (`L7029`–`L7032`). Whether `earned` is meant to be lifetime-gross or cycle-gross is not documented anywhere. |
| U7 | Whether `AUD-0004`'s `ESC-1035` was a real hold in an earlier dataset | Only its absence from the current `DB.escrowHolds` (`L2801`–`L2806`) is verifiable. |

---

## 20. Line-number index

### HTML — `#p-wallets`
| Lines | Element |
|-------|---------|
| `L968` | `<div class="page" id="p-wallets">` |
| `L969` | Header + **`Process all payouts`** button |
| `L970`–`L974` | Blue "How payouts work" explainer card |
| `L972` | Explainer prose |
| `L975`–`L980` | KPI grid `.g4` (payouts / escrow / deductions) |
| `L976` | KPI `#avail-now-kpi` / `#avail-now-sub` |
| `L977` | KPI `#escrow-held-kpi` / `#escrow-held-sub` |
| `L978` | KPI `#escrow-ready-kpi` / `#escrow-ready-sub` |
| `L979` | KPI `#deduct-kpi` / `#deduct-sub` |
| `L981`–`L987` | Card "💳 Available payouts — quick rides" |
| `L982` | Card header + `#payouts-pending-badge` |
| `L984` | Payouts `<thead>` (8 columns) |
| `L985` | `<tbody id="payouts-tbody">` |
| `L988`–`L997` | `.g2` split |
| `L989`–`L992` | Card "📦 Subscription escrow holds" + `#escrow-count` + `#escrow-list` |
| `L993`–`L996` | Card "⚠ Pending deductions" + `#deduct-count` + `#deductions-list` |
| `L998`–`L1002` | Amber "How cash reconciliation works" explainer |
| `L1000` | Explainer prose |
| `L1003`–`L1008` | KPI grid `.g4` (cash) |
| `L1004` | KPI `#cash-debt-kpi` |
| `L1005` | KPI `#cash-pending-kpi` |
| `L1006` | KPI `#cash-escalated-kpi` |
| `L1007` | KPI `#cash-blocked-kpi` |
| `L1009`–`L1012` | Card "🧾 Cash reconciliation queue" + `#cash-tolerance-lbl` + `#cash-ledger-list` |
| `L1013`–`L1016` | Card "📒 Driver cash debt ledger" + `#cash-debt-list` |
| `L1017` | close `#p-wallets` |
| `L526`, `L528` | Sidebar section + item |

### JavaScript
| Lines | Symbol |
|-------|--------|
| `L2168` | `titles.wallets = 'Driver Wallets'` |
| `L2169` | `subs.wallets = 'Driver payout management'` |
| `L2671`, `L2678` | `DB.trips` rows with `fare` / `driverEarn` (commission examples) |
| `L2686`–`L2689` | `DB.subscriptions` rows referenced by escrow holds |
| `L2764` | Notification seed `N5` payout batch |
| `L2801`–`L2806` | **`DB.escrowHolds`** seed (4 rows) |
| `L2807`–`L2811` | **`DB.deductions`** seed (3 rows) |
| `L2812`–`L2816` | **`DB.payouts`** seed (3 drivers) |
| `L2832`, `L2834` | Team-user permission arrays granting `process_payouts` / `release_escrow` / `apply_deductions` |
| `L2865`–`L2871` | Seeded audit entries for this module |
| `L2904`–`L2905` | `ACTION_LABELS` — `process_all_payouts`, `release_escrow`, `apply_deduction`, `pay_driver` |
| `L3126`–`L3132` | `requirePerm(permKey)` |
| `L3133`–`L3151` | `logAction(...)` |
| `L3153`+ | `auditDiffHTML(before,after)` |
| `L3231`–`L3233` | `PERMISSION_LABELS` for the three payout permissions |
| `L3250`–`L3252` | `PERMISSION_DESC` for the same |
| `L3283` | `rowLink(id,label)` |
| `L3565` | `nm2(id)` |
| `L4163`–`L4177` | Driver 360° "💰 Earnings breakdown" card |
| `L4394` | `fmtSAR(n)` |
| `L5269` | `toast(msg,type,onClick,notify)` |
| `L7022` | Comment: "PAYOUTS SAFETY NET — final authoritative versions" |
| `L7023`–`L7036` | **`window.payDriver(driverId)`** |
| `L7037`–`L7048` | **`window.processAllPayouts(btn)`** |
| `L7049`–`L7056` | **`window.confirmProcessAll()`** |
| `L7058`–`L7071` | **`window.releaseEscrow(id)`** |
| `L7072`–`L7084` | **`window.confirmApplyDeduction(id)`** |
| `L7194`–`L7212` | **`window.confirmPayDriver(driverId)`** |
| `L7213`–`L7229` | **`window.openEarningsStatement(driverId)`** |
| `L8716`–`L8747` | **`window.executePayout(driverId)`** |
| `L8748`–`L8772` | **`window.renderPayoutsTable()`** |
| `L8816` | `go()` hook for `wallets` |
| `L8893` | `setText(id,val)` |
| `L8894`–`L8900` | **`ensurePayoutEntry(driverId)`** |
| `L8901`–`L8905` | `lvlBadgeSm(lvl)` |
| `L8906`–`L8934` | **`renderEscrow()`** |
| `L8935`–`L8947` | **`confirmReleaseEscrow(id)`** |
| `L8948`–`L8970` | **`renderDeductions()`** |
| `L8971`–`L8985` | **`applyDeduction(id)`** |
| `L8986`–`L8992` | **`waiveDeduction(id)`** |
| `L9661` | `pushOpsNotification(type,title,desc,action)` |
| `L10630`–`L10637` | `PAGE_PERMISSIONS.wallets` (6 perms) |
| `L10680`–`L10692` | `requirePagePerm(pageKey,permKey)` |
| `L12042`–`L12047` | Tip policy comment + `simulateTip(driverRating)` |
| `L12058`–`L12075` | Cash reconciliation design comment block |
| `L12076`–`L12079` | `CASH_COMMISSION_RATE`, `CASH_TOLERANCE`, `CASH_DEBT_CAP`, `CASH_TRIP_CHANCE` |
| `L12080`–`L12081` | `DB.cashLedger`, `DB.driverCashDebt` |
| `L12082` | **`driverCashBlocked(driverId)`** |
| `L12083`–`L12087` | **`classifyCashReport(expected, reportedMinusTopup)`** |
| `L12088`–`L12092` | **`applyCashDebtImpact(entry)`** |
| `L12093`–`L12099` | **`driverCashRiskCount(driverId)`** + comment |
| `L12100` | `CASH_REASONS` |
| `L12101`–`L12143` | **`maybeGenerateCashEvent(t, base)`** |
| `L12144`–`L12146` | Type-D modal comment + `resolveCashEntry` signature |
| `L12146`–`L12170` | **`resolveCashEntry(id, outcome)`** |
| `L12171`–`L12186` | **`commitCashResolve(id, outcome)`** |
| `L12187`–`L12202` | **`recordCashRepayment(driverId)`** |
| `L12203`–`L12211` | **`commitCashRepayment(driverId)`** |
| `L12212`–`L12238` | **`cashRowHTML(e)`** |
| `L12239`–`L12268` | **`renderCashReconciliation()`** |
| `L14300`–`L14302` | Driver risk score: cash-debt penalty (**−30**) |
| `L14535`–`L14543` | `kpiScrollTo(elId)` |
| `L14578`–`L14580` | boot: `renderPayoutsTable()`, `renderEscrow()`, `renderDeductions()` |
| `L19865`–`L19878` | `ACCOUNTS` — includes the never-posted `liability.escrow` |
| `L19918`–`L19933` | `postLedger(...)` — never called by this module |
| `L20047` | `liability.driver` credit (fare accrual, never debited on payout) |
