# Module: Subscriptions

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `subscriptions` — div `#p-subscriptions`
> **HTML lines:** L713–L767
> **Primary render:** `renderSubscriptionsTable()` (L3477–L3573)
> **Related functions:** `subEconomics()` (L3605), `computeSettlement()` (L3632), `openSettlement()` (L3639), `refreshSettlePreview()` (L3668), `commitSettlement()` (L3684), `subLocBtn()` (L3284), `buildSubProfile()` (L4279), `cancelSubDispatch()` (L5022)
> **Legacy note:** a former `p-sub-detail` page was deleted; the removal comment sits at L758–L765 and states it was hardcoded to `SUB-1041` and unreachable. Per-subscription detail is now `openProfile(subId)` → `buildSubProfile()` (L4279).

---

## 1. Purpose

Operational management of Eyvar's **prepaid recurring ride packages**. A rider pays for a whole package up front; a single assigned captain ("same captain every trip", `DB.plans.weekly.features[0]`, L2890) serves a fixed weekly day pattern. This page is the master list of every package in the system and the entry point to the four money/relationship levers ops holds: change driver, freeze, cancel & refund, and early-termination settlement.

The economics doctrine is written in-file at L3586–L3603:

> "the rider pays the full package up front, the driver is paid on successful completion, and ops needs a per-trip unit value to handle anything unexpected mid-package (driver loss, vehicle breakdown, service failure, relocation, disputes)."
> "POLICY (set by management): riders cannot cancel after payment. Settlement therefore exists only for PLATFORM-side terminations (no replacement driver, service failure, force majeure) and for rider-violation removals — never for change of mind." (L3597–L3603)

---

## 2. Entry points & routing

| Entry | Where | Line |
|---|---|---|
| Sidebar item → `go('subscriptions',this)` | Nav, badge `#sbb-subs` | L502 |
| Router hook `if(id==='subscriptions'){renderSubscriptionsTable();}` | `window.go` body (L8774+) | L8818 |
| Boot render `renderSubscriptionsTable();` | init sequence | L14594 |
| Page title `subscriptions:'Subscriptions'` | `titles` map | L2168 |
| Page subtitle `subscriptions:'142 active subscriptions'` | `subs` map (**hardcoded seed**, overwritten live at L9403) | L2169 |
| Sidebar badge value | `refreshNavCounts()` → `put('sbb-subs',activeSubs)` | L9400 |
| Any subscription id from anywhere | `openProfile(subId)` → `resolveId` bucket `subscriptions` (L3270) → `buildSubProfile()` | L3270, L4279 |

Sidebar badge formula (L9398): `activeSubs = count(DB.subscriptions where status !== 'Cancelled')` — this counts `Expiring` and `Frozen` as "active".
Sidebar subtitle rewritten at L9403: `subs.subscriptions = activeSubs + ' active subscriptions · ' + expSoon + ' expiring soon'`, where `expSoon` (L9399) = `count(status!=='Cancelled' && (parseInt(x.ends,10) - 25) <= 3)` — **day-of-month arithmetic hardcoded to the 25th** (the dataset's "today", `EYVAR_TODAY = new Date(2026,5,25)`, L11232).

---

## 3. Layout map

| Region | Element | Line |
|---|---|---|
| Page header `.ph` | `<h1>Subscriptions</h1>` + `<p id="subs-page-sub">` | L714–L718 |
| Header buttons | `Export CSV` → `exportData(this,'subscriptions')`; `+ New subscription` → `openRenewModal('new')` | L717 |
| KPI row `.g4` | `#subs-kpis` — 4 tiles, static markup in HTML, replaced by `renderSubscriptionsTable()` | L719–L724 |
| Card | `<h2>All subscriptions</h2>` + filter bar `#subs-filters-wrap` | L725–L734 |
| Filter bar | search box (no id, no handler) + 3 injected custom selects | L727–L733 |
| Table wrapper | `.tbl-scroll` | L735 |
| Table `<thead>` | 15 columns, last is `position:sticky;right:0` | L737–L753 |
| Table body | `#subs-tbody` | L755 |

---

## 4. Data model & fields

### 4.1 `DB.subscriptions` — seeded records (L2685–L2693)

7 records, all hardcoded demo data:

| Field | Type | Meaning | Source |
|---|---|---|---|
| `id` | string `SUB-####` | primary key, mirrors the object key | seed L2686 |
| `rider` | string `RDR-####` | FK → `DB.riders` | seed |
| `driver` | string `DRV-####` | FK → `DB.drivers` | seed |
| `plan` | string, e.g. `'Weekly Economy'` | `<cadence label> <vehicle tier>`; parsed by splitting on space — last token = vehicle, rest = cadence (L3520–L3522) | seed |
| `started` | string `'19 Jun'` | short date label, no year | seed |
| `ends` | string `'26 Jun'` | short date label; `parseShortDate` **hardcodes year 2026** (L14204) | seed |
| `trips` | string `'5/5'` | `done/total` as text, split in `subEconomics` (L3607) | seed |
| `paid` | string `'86.50 SAR'` | package price as text; numeric parse strips non-digits (L3606) | seed |
| `status` | string | lifecycle state — see §5 | seed |

Seed rows: `SUB-1041` (RDR-1041 / DRV-0101, Weekly Economy, 5/5, 86.50, **Expiring**), `SUB-1052` (Bi-weekly Comfort, 10/10, 412.00, Active), `SUB-1060` (Monthly Comfort, 1/1, 41.22, Active), `SUB-1075` (Weekly Economy, 2/5, 86.50, Active), `SUB-1052b` (Weekly Comfort, 3/5, 122.50, Active), `SUB-0998` (Weekly Economy, 1/5, 86.50, Cancelled), `SUB-0987` (Weekly Comfort, 2/5, 122.50, Cancelled).

### 4.2 Fields added only on records created through the UI (`finalizeNewSub`, L5097–L5101)

| Field | Type | Meaning | Set at |
|---|---|---|---|
| `direction` | `'one-way'` \| `'round-trip'` | drives `directionArrows()` (L3468) and the price multiplier | L5099 |
| `route` | string `'A → B'` or `null` | pickup → destination district label | L5099 |
| `departTime` | `'HH:MM'` 24h | outbound departure | L5099 |
| `returnTime` | `'HH:MM'` or `null` | return leg time (round-trip only) | L5099 |
| `days` | array of `'Sun'…'Sat'` | scheduled weekdays | L5100 |
| `perTripFare` | number | per-trip fare from `computeDynamicSubPrice` (includes direction multiplier) | L5100 |
| `startOutcome` | `null` \| `'confirmed'` \| `'pending'` \| `'deferred'` | today's start decision from `evaluateSubStart` | L5100, L4743–L4778 |
| `pendingDriverCommit` | bool | driver has been asked to commit and hasn't answered | L5100, L4768 |
| `pendingManagerApproval` | bool | corporate approval hold | L5101 |
| `approvalCorp` | `CORP-###` or `null` | which corporate account must approve | L5101 |
| `approvalThreshold` | number or `null` | the SAR threshold that was breached | L5101 |
| `commitDeadline` | string `'7:00 AM'` | 12h label of departure time | L4769 |
| `commitRequestedAtTick` | number | `__tickCount` when the commit request went out | L4770 |
| `commitAutoResolveAfter` | number, `8 + rand(0..9)` seconds | **simulated** driver response delay | L4771 |
| `commitResolvedBy` | `'driver'` \| `'ops'` | who answered the commit | L4831 |
| `autoRenew` | bool (absent ⇒ treated as true) | renewal preference; the truth test is `sub.autoRenew!==false` (L3552) | L5450 / L5476 |
| `autoRenewOffReason` | `{reason, by, at}` | why auto-renew was disabled | L5477 |
| `driverChanges` | number | count of captain reassignments — "every change is a break in that promise" (L5834) | L5837 |
| `postponements` | array `{originalDate, rescheduledDate, route, reason}` | rendered as a banner (L4325–L4329). **UNVERIFIED**: no function in this file writes it — see §17 |

**Schema drift (flagged):** the 7 seeded subscriptions have **none** of the §4.2 fields. `directionArrows(sub.direction)` on seeded rows falls through to the one-way arrow (L3475), `evaluateSubStart` returns immediately (L4745 `if(!sub||!sub.days||!sub.departTime)return;`), and `corpPolicyViolations`' geo check (L6557) reads `sub.route`, which is `undefined` on all seeds.

### 4.3 Related collections read by this page

| Collection | Used for | Line |
|---|---|---|
| `DB.riders[sub.rider]` | name, phone; fallback `{name:sub.rider,phone:'—'}` | L3518 |
| `DB.drivers[sub.driver]` | name, rating, level; fallback `{name:sub.driver,rating:null,lvl:'standard'}` | L3519 |
| `DB.upcomingSubTrips` | Route + Next-trip columns, matched **by rider identity**, not by `t.sub` | L3523 |
| `DB.payments` | Payment badge, matched on `p.trip === subId` | L3527 |
| `DB.complaints` | `hasOpenComplaint(driver,rider)` → Health column | L3529, L5650 |
| `DB.plans[key].eyvarPct` | commission used in `buildSubProfile` money split | L4461–L4465 |
| `DB.cancellationPolicy` id `sub_mid_cycle` | mid-cycle refund fee | L5527, L13944 |

The `t.sub` tag is explicitly declared untrustworthy at L5849–L5854: *"UST-6 tags sub:'SUB-1041' but its rider is RDR-1090, not SUB-1041's real rider RDR-1041."*

---

## 5. Lifecycle states & transitions

Statuses are free-text strings; badge colour is derived by regex in `statusBadge()` (L3730–L3736).

| State | Entered when | Exits to | Actions available |
|---|---|---|---|
| `Active` | `finalizeNewSub` with no corporate approval needed (L5098); `approveCorpSubscription` (L4886) | `Frozen`, `Cancelled` | View, Change driver, Settle, Freeze, Cancel & refund, Auto-renew toggle |
| `Expiring` | **Seed-only** (`SUB-1041`, L2686). No function ever sets `status='Expiring'`. | `Cancelled` (settle/cancel) | same as Active; Health shows `Watch` (L3530) |
| `Pending Approval` | `finalizeNewSub` when `needsApproval` is true (L5098) | `Active` via `approveCorpSubscription` (L4886); `Cancelled` via `rejectCorpSubscription` (L4901) | approval banner buttons in `buildSubProfile` (L4322) |
| `Frozen` | `doFreeze()` (L5509) | **no exit path exists** — see §17 | all row actions still render |
| `Cancelled` | `confirmCancelSub()` (L5556); `commitSettlement()` (L3689); `rejectCorpSubscription()` (L4901) | terminal | `Settle` button hidden (`isSettleable=!/cancel/i.test(sub.status)`, L3541) |
| `At risk` | **never set by any code** — offered as a filter option at L3501 only | — | — |

### 5.1 Sub-state machine: `startOutcome` (today's start decision)

`evaluateSubStart(subId)` (L4743–L4778) runs immediately after creation and after corporate approval.

| `startOutcome` | Condition | Side effects |
|---|---|---|
| `deferred` | today is not in `sub.days` (L4747) **or** `minutesUntilTime(departTime) < 0` (L4752) | `sub.started = nextScheduledDayLabel(...)`; audit `sub_start_deferred`; **no trip deducted** |
| `confirmed` | `driverEtaToRiderMin(driver,rider) + 5 <= minutesToDeparture` (L4760; buffer const `SUB_START_COMMIT_BUFFER_MIN=5`, L4720) | `sub.started = today`; `generateUpcomingTripsForSubscription()`; audit `sub_start_confirmed` |
| `pending` | ETA unknown or too tight (L4765) | `pendingDriverCommit=true`, `commitDeadline`, `commitAutoResolveAfter = 8+rand(0..9)` s (**simulated**), push queued into `drv.notifLog`, audit `sub_start_pending`, ops notification |

Resolution of `pending` → `confirmSubDriverCommit(subId, canMake, isAuto)` (L4826–L4854):
- `canMake=true` → `startOutcome='confirmed'`, `started=today`, generate upcoming trips, audit `sub_start_confirmed` (L4835).
- `canMake=false` → `startOutcome='deferred'`, `started=nextScheduledDayLabel(sub,true)`, audit `sub_start_deferred` (L4845), toast "no trip deducted from the rider".

### 5.2 Dispatch state machine (creation flow, `_nsDispatch`, L4947–L5077)

`sendSubDispatchRequest(data)` (L4948) opens a live ticking request that **simulates** the driver's app:
- `respondInSec = min(120, 5 + round(random()² × 115))` (L4956) — weighted toward fast responses, 120 s ceiling.
- `acceptChance = 0.82 + (rating>=4.7 ? +0.08 : (rating && rating<4 ? −0.10 : 0))`, clamped to `[0.55, 0.95]` (L4957–L4958).
- `willAccept = random() < acceptChance` (L4960).
- `viewingAt = 2 + random()×4` s → flips the badge from `📨 Sent` to `👀 Viewing request` (L4960, L4997).
- Poll interval 250 ms (L4962–L4972).
- Accept → `finalizeNewSub()` (L5033/L5078) → `evaluateSubStart()` → `renderSubAcceptedTracking()`.
- Decline → `renderSubReselectAfterDecline()` (L5037/L5043) with a **randomly chosen** reason from three hardcoded strings (L5035–L5036).

---

## 6. KPIs & metrics

Static HTML KPIs at L719–L724 are **hardcoded demo values** (`142`, `68`, `48`, `26`, `↑ 12 vs last week`, `48%`, `34%`, `↑ 4 this month`, bar widths `71% / 48% / 34% / 18%`). They are overwritten the first time `renderSubscriptionsTable()` runs (L3489–L3493).

| KPI | Label | Formula (live) | Delta line | Bar | Click |
|---|---|---|---|---|---|
| 1 | `Active` | `count(status==='Active')` (L3479) | `of {total} total` | `round(active/total×100)%`, class `kf-b` | `kpiScrollTo('subs-tbody')` |
| 2 | `Weekly plans` | `count(plan.indexOf('Weekly')===0)` (L3482) | `round(weekly/total×100)%` | same %, `kf-b` | idem |
| 3 | `Bi-weekly plans` | `count(plan.indexOf('Bi-weekly')===0)` (L3483) | `round(biweekly/total×100)%` | same %, `kf-t` | idem |
| 4 | `Monthly plans` | `count(plan.indexOf('Monthly')===0)` (L3484) | `round(monthly/total×100)%` | same %, `kf-g` | idem |

`__total = __all.length || 1` (L3485) — divide-by-zero guard. Note KPI 2's prefix test excludes `'Bi-weekly …'` correctly (its `indexOf('Weekly')` is 3, not 0).

Page subtitle (L3487): `{active} active · {expiring} expiring · {cancelled} cancelled`, with `expiring = count(status==='Expiring')` and `cancelled = count(status==='Cancelled')` (L3480–L3481). The static HTML subtitle (L716) reads `142 active · 8 expiring in 3 days · 3 cancelled this month` — **hardcoded**, replaced on first render.

---

## 7. Business formulas (economics / settlement)

### 7.1 Commission constant

```
EYVAR_COMMISSION_PCT = 20                                  (L3604)
```

### 7.2 `subEconomics(sub)` — L3605–L3616

```
paid          = parseFloat(String(sub.paid).replace(/[^\d.]/g,'')) || 0
[done,total]  = String(sub.trips || '0/0').split('/')  → parseInt each, || 0
perTrip       = total > 0 ? paid / total : 0
consumed      = min(done, total) × perTrip
remaining     = max(0, paid − consumed)
driverAccrued = consumed × (1 − EYVAR_COMMISSION_PCT/100)   = consumed × 0.80
driverFull    = paid     × (1 − EYVAR_COMMISSION_PCT/100)   = paid × 0.80
pct           = total > 0 ? round(done / total × 100) : 0
```

**Rounding:** none inside `subEconomics` — all values are raw floats. Rounding happens only at display time via `fmtSAR(n) = n.toFixed(2)+' SAR'` (L4394) or `.toFixed(2)`.
`driverFull` is computed (L3613) and returned (L3614–L3615) but **read nowhere in the file** — dead field (§17).

### 7.3 Settlement rules table — `SETTLE_REASONS`, L3627–L3631

| Key | Label | `riderGets` |
|---|---|---|
| `platform_fault` | `Platform fault — no replacement driver / service failure` | `refund` |
| `force_majeure` | `Force majeure — external event outside anyone's control` | `credit` |
| `rider_violation` | `Rider violation — removal per terms (abuse / fraud / no-show beyond cap)` | `forfeit` |

Doctrine comment L3617–L3626: rider change-of-mind is deliberately absent; under `rider_violation` "the driver kept the slot available and shouldn't fund the rider's violation."

### 7.4 `computeSettlement(sub, reasonKey)` — L3632–L3638

```
e     = subEconomics(sub)
rule  = SETTLE_REASONS[reasonKey] || SETTLE_REASONS.platform_fault      (default fallback, L3634)

riderBack   = (rule.riderGets === 'forfeit') ? 0 : e.remaining
riderMethod = rule.riderGets                                   ('refund' | 'credit' | 'forfeit')
driverPay   = e.driverAccrued                                  = consumed × 0.80
eyvarKeeps  = e.consumed × (EYVAR_COMMISSION_PCT/100)
              + (rule.riderGets === 'forfeit' ? e.remaining : 0)
            = consumed × 0.20  [+ remaining if forfeited]
```

Invariant: `riderBack + driverPay + eyvarKeeps = remaining + 0.80·consumed + 0.20·consumed = paid` for refund/credit, and `0 + 0.80·consumed + (0.20·consumed + remaining) = paid` for forfeit. The books balance in both branches.

### 7.5 Dynamic new-subscription pricing — `computeDynamicSubPrice`, L4535–L4556

Constants:
```
CADENCE_META = { weekly:{discountPct:0,   eyvarPct:20},
                 biweekly:{discountPct:5, eyvarPct:18},
                 monthly:{discountPct:10, eyvarPct:15} }        (L4520–L4524)
CADENCE_DAYS = { weekly:7, biweekly:14, monthly:30 }            (L11231)
PLANS        = { weekly:{label:'Weekly',    exec:5,  eco:86.50,  comfort:122.50},
                 biweekly:{label:'Bi-weekly',exec:10, eco:164.35, comfort:232.50},
                 monthly:{label:'Monthly',   exec:22, eco:344.52, comfort:487.00} }   (L4389–L4393)
WEEKDAYS             = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']   (L4525)
ROAD_CIRCUITY_FACTOR = 1.35                                      (L7261)
URBAN_AVG_SPEED_KMH  = 26                                        (L7262)
```

Formula:
```
directionMult = (direction === 'round-trip') ? 2 : 1
weeks         = (CADENCE_DAYS[cadenceKey] || 7) / 7
legsPerWeek   = selectedDaysCount × directionMult
totalTrips    = round(legsPerWeek × weeks)

if routeKm AND a DB.quickRideTypes entry matches the vehicle tier:            (L4541–L4548)
    estMin  = round(routeKm / URBAN_AVG_SPEED_KMH × 60)
    legFare = round((baseFare + routeKm×perKm + estMin×perMin) × 100) / 100
    usedRealDistance = true
else:
    legFare = perTripBaseRate(cadenceKey, vehicleType)                        (L4529–L4534)
            = (vehicleType==='Comfort' ? PLANS[k].comfort : PLANS[k].eco) / PLANS[k].exec

perTripFare = round(legFare × directionMult × 100) / 100
gross       = round(legFare × directionMult × selectedDaysCount × weeks × 100) / 100
total       = round(gross × (1 − discountPct/100) × 100) / 100
```

Rounding rule throughout: `Math.round(x*100)/100` — half-up to 2 decimals.

Route distance: `computeRouteKm(pickup,dest)` (L7250–L7255) = `round(geoDistanceKm(p,d) × 1.35 × 10)/10` — one decimal; returns `null` if either district is unknown or `pickup === dest`. `geoDistanceKm` (L7256) is Euclidean on the map's `{x,y}` percentage coordinates × `GEO_SCALE_KM`.

### 7.6 Profile money split — `buildSubProfile`, L4300–L4302

```
paidNum       = parseFloat(d.paid) || 0
driverEarnNum = round(paidNum × commissionRateForPlan(d.plan) × 100) / 100
eyvarNetNum   = round((paidNum − driverEarnNum) × 100) / 100

commissionRateForPlan(planLabel):                                (L4461–L4466)
    key  = planKeyFromLabel(label)                               (L4450–L4456)
    plan = DB.plans[key]
    if plan.eyvarPct != null  →  (100 − plan.eyvarPct) / 100
    else                      →  driverCommissionRate()          (L4467)
                                 = (DB.opsConfig.pricing.driverCommissionPct ?? 80) / 100
```
Live `DB.plans` values (L2890–L2895): weekly `eyvarPct:20` → driver 0.80; biweekly `18` → 0.82; monthly `15` → 0.85.

**Inconsistency (flagged):** the table's "Paid / Driver" column uses the flat `EYVAR_COMMISSION_PCT=20` via `subEconomics` (L3612), while the profile card uses the per-plan rate. For a bi-weekly or monthly package the two screens disagree about the driver's share. Neither is a typo — different sources.

### 7.7 Cancel & refund math — `cancelSub`, L5521–L5531

```
[used,total]   = sub.trips.split('/')        (total defaults to 1 if unparseable)
paidNum        = parseFloat(sub.paid) || 0
unusedFraction = max(0, (total − used) / total)
grossRefund    = round(paidNum × unusedFraction × 100) / 100

midCycleRule   = DB.cancellationPolicy.find(id === 'sub_mid_cycle')
                 → { feePct: 10, enabled: true }                (L13944)
feeApplies     = used > 0 AND midCycleRule.enabled AND grossRefund > 0
fee            = feeApplies ? round(grossRefund × feePct/100 × 100)/100 : 0
refund         = round((grossRefund − fee) × 100) / 100
```
Policy note stored on the rule (L13944): *"Applied to the unused-portion refund, on top of forfeiting the already-used trips (which were never refundable to begin with)."*

**Divergence (flagged):** `cancelSub` computes the refund from `unusedFraction × paid`; `computeSettlement` from `remaining = paid − consumed`. Algebraically identical, but the cancel path applies a 10 % fee and the settlement path does not.

---

## 8. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| Page subtitle `#subs-page-sub` | computed L3487 | string | overrides hardcoded L716 |
| KPI 1 value | `count(status==='Active')` L3479 | int | overrides hardcoded `142` L720 |
| KPI 2/3/4 values | plan-prefix counts L3482–L3484 | int | override hardcoded `68/48/26` |
| KPI bar widths | `round(n/total×100)` | % | |
| Rider name | `DB.riders[sub.rider].name` L3518 | string | fallback = raw rider id |
| Rider sub-line | `sub.rider + ' · ' + (rider.phone||'—')` L3545 | string | `DB.riders[id].phone` |
| Plan / cadence cell | `sub.plan` minus last token L3522 | string | computed |
| Vehicle badge | last token of `sub.plan` L3521 | string | badge `b-eco` / `b-com` |
| Route | `DB.upcomingSubTrips.find(t=>t.rider===sub.rider).route`, else `'—'` L3523–L3524 | string | **not** from `sub.route` |
| Direction arrows | `directionArrows(sub.direction)` L3548, L3468 | HTML | one-way `→` blue; round-trip stacked `→` blue + `←` teal |
| Driver name | `DB.drivers[sub.driver].name` L3519 | string | |
| Driver level badge | `drv.rating` present ⇒ `★ {rating}`, class from `drv.lvl` (`gold`/`silver`/else grey) L3531 | HTML | |
| Health | `hasOpenComplaint(driver,rider)` ⇒ `At risk` (red); else `/expir/i.test(status)` ⇒ `Watch` (amber); else `Healthy` (green) L3529–L3530 | HTML | |
| Days left | literal `'Ends ' + sub.ends` L3551 | string | **header says "Days left" but the cell shows an end date** |
| Next trip | `ust.minutesUntil < 1440` ? (`<=60` ? `'in N min'` : `ust.scheduledTime`) : `'Tomorrow+'`; `'—'` when no upcoming trip L3525 | string | |
| Consumed cell | `subEconomics` → `done/total trips`, `pct%`, progress bar, `fmtSAR(consumed) of fmtSAR(paid)` L3533–L3538 | HTML | bar green at `pct>=100`, else blue |
| Trip value | `fmtSAR(econ.perTrip)` L3550 | string | tooltip: *"Package paid ÷ total trips — the unit for refunds, disputes, and mid-package changes"* |
| Payment badge | `DB.payments` where `p.trip === subId` → `statusBadge(p.status)`; else grey `—` L3527–L3528 | HTML | |
| Auto-renew toggle | `sub.autoRenew !== false` L3552 | checkbox | absent field reads as ON |
| Paid / Driver | `econ.paid.toFixed(2)` over `drv accrued {econ.driverAccrued.toFixed(2)}` L3553 | HTML | tooltip: *"Driver has earned this so far (N completed trips) — payable on successful package completion"* |
| Status badge | `statusBadge(sub.status)` L3554 | HTML | |
| Location pin 📍 | `subLocBtn(id,label)` L3284–L3286 → `showEntityLocation(id)` | button | title `Show {label} location` |

---

## 9. Input fields

### 9.1 On-page filters (injected once by `renderSubscriptionsTable`, L3494–L3506)

Guard: `if(fw && !document.getElementById('csel-subs-plan'))` (L3495) — injected once via `insertAdjacentHTML('afterbegin', …)` (L3505).

| Hidden field id | Custom-select id | Type | Placeholder | Default | Options | Drives |
|---|---|---|---|---|---|---|
| `subs-f-plan` | `csel-subs-plan` | custom select (`sm`) | `All plans` | `''` | `''`→All plans, `Weekly`, `Bi-weekly`, `Monthly` | L3538 `plan.indexOf(fPlan)===0` |
| `subs-f-vehicle` | `csel-subs-veh` | custom select (`sm`) | `All vehicles` | `''` | `''`→All vehicles, `Economy`, `Comfort` | L3539 `plan.slice(-fVeh.length)===fVeh` (suffix test) |
| `subs-f-status` | `csel-subs-status` | custom select (`sm`) | `All statuses` | `''` | `''`, `Active`, `Expiring`, `At risk`, `Frozen`, `Cancelled` | L3540 exact `status===fStatus` |

All three pass `'renderSubscriptionsTable()'` as the `onChangeExpr` argument of `customSelectHTML` (L3497, L3499, L3501). Values are read back at L3535–L3537 — a fix documented in the in-file comment L3531–L3534: *"the plan/vehicle/status dropdowns above wrote their selection into these hidden fields correctly, but nothing ever read them back."*

| Element | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| search input (L730) | `<input placeholder="Search rider, driver…">` | none | empty | none | **nothing — no `id`, no `oninput`/`onkeyup`, never read by any function.** Dead control (§17) |

### 9.2 New-subscription modal fields — `renderNewSubModal`, L4557–L4641

| Field id | Custom-select id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|---|
| `ns-rider` | `csel-ns-rider` | custom select | `Rider *` | passed-in `riderId` or `''` | all `DB.riders`; hint `Already has N plan(s)` when `r.subs.length` (L4563–L4567) | `onNewSubChange()` (L4670) → full re-render |
| `ns-plan` | `csel-ns-plan` | custom select | `Plan tier & vehicle *` | `planKey` or `''` | 6 options `{weekly,biweekly,monthly}-{eco,comfort}`; hint `{discountPct}% off · {eyvarPct}% commission` (L4569–L4580) | `onNewSubChange()` |
| `ns-pickup` | `csel-ns-pickup` | custom select | `Pickup point` | `''` | 16 keys of `RIYADH_DISTRICTS` (L7243–L7249) | `updateNsPricePreview()` (L4642) |
| `ns-dest` | `csel-ns-dest` | custom select | `Destination` | `''` | same 16 districts | `updateNsPricePreview()` |
| `ns-direction` | — | radio pair | `Trip direction` | `one-way` | `one-way` / `round-trip` (L4614–L4615) | `updateNsPricePreview()`; toggles `#ns-return-time-field` |
| `ns-depart` | — | `<input type="time">` | `Departure time` | `07:00` | none | `sub.departTime`, `evaluateSubStart` |
| `ns-return` | — | `<input type="time">` | `Return time` | `17:00` | hidden unless round-trip (L4619) | `sub.returnTime` |
| `.ns-day-cb` ×7 | — | checkboxes, value `0..6` | `Days of the week *` | `[0,1,2,3,4]` Sun–Thu (L4559, comment: *"typical Saudi work week, freely changeable, no cap"*) | `commitNewSub` rejects an empty selection (L4926) | day count feeds the price formula |
| driver radio `ns-drv` | — | radio via `.plan-option[data-drv]` | `N nearest eligible {tier} drivers` | first non-disabled candidate pre-selected (L4744 in `driverCandidateRowsHTML`, L5727) | `commitNewSub` re-validates against `eligibleDrivers()` (L4921–L4923) | `sub.driver` |

Blocking condition: `coverageBlocked = riderId && !isPlanVisibleForRider(riderId)` (L4568) replaces the plan select with a red warning; no plan can then be chosen (L4606).
Footer `Create subscription` is rendered **only when `eligibleCount > 0`** (L4638).

Price preview `#ns-price-preview` (L4642–L4669) shows: `📍 Priced from the real route distance — {routeKm} km (road-adjusted)` when both districts are set, else a grey hint; then 4 tiles — `Per trip`, `Total trips`, `Discount`, `Eyvar commission` — and a summary line `{dayCount} day(s)/week × {weeks} week(s)[ × round-trip]` with the bold `fmtSAR(px.total)`. Zero days selected → amber `⚠ Select at least one day to see the price.` (L4658).

### 9.3–9.7 Modal fields are enumerated per modal in §12.

---

## 10. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `Export CSV` (L717) | `exportData(this,'subscriptions')` L9187 | format/location modal → `doExport('subscriptions')` L9204 → `exportRows` L9176 emits head `['ID','Rider','Driver','Plan','Started','Ends','Trips','Paid','Status']` for **all** subs (filters not applied); filename `eyvar_subscriptions_25Jun.{csv\|json}` (**date hardcoded**, L9212) | none (file download) | none | `export_data`, entity type `report` (L9216) | no |
| `+ New subscription` (L717) | `openRenewModal('new')` L5174 → `renderNewSubModal('','')` | opens the creation modal | — | none at open | — | no |
| KPI tile click ×4 | `kpiScrollTo('subs-tbody')` L14535 | smooth-scrolls to the table body and flashes it via `.kpi-flash-target` for 1500 ms | none | none | none | no |
| `View` (row) | `openProfile(subId)` L3556 | pushes history, routes to `profile`, renders `buildSubProfile()` | `navCurrent` | none | none | no |
| `Change driver` (row) | `changeDriver(subId)` L5715 | opens the change-driver modal | — | gate is on commit | — | no |
| `Settle` (row; only when status has no "cancel") | `openSettlement(subId)` L3639 | `requirePerm('manage_subscriptions')` first (L3640); opens settlement modal | — | `manage_subscriptions` | `permission_denied` on failure (L3129) | modal preview, then explicit Confirm |
| Auto-renew → ON | `toggleAutoRenew(id,cb)` L5442 | `sub.autoRenew=true`, deletes `sub.autoRenewOffReason` | `DB.subscriptions[id]` | **none** | `auto_renew_toggle` L5452 | no |
| Auto-renew → OFF | `toggleAutoRenew` reverts the checkbox then `openAutoRenewOffReason` L5455; `commitAutoRenewOff` L5472 | `autoRenew=false`, `autoRenewOffReason={reason, by:currentUserName(), at:fmtReqNowLabel()}` | `DB.subscriptions[id]` | **none** | `auto_renew_toggle` L5478 | reason mandatory (L5475) |
| `↻ Renew / Upgrade` (profile) | `openRenewFlow(d.rider)` L4348 / L11277 | 3-step renew wizard (separate module) | — | — | — | — |
| `❄️ Freeze` (profile) | `freezePlan(subId)` L5485 → `doFreeze` L5503 | `sub.status='Frozen'` | `DB.subscriptions[id]` | `manage_subscriptions` (L5504) | `freeze_subscription`, `{status:prev}→{status:'Frozen',duration}` L5514 | modal, no browser confirm |
| `Cancel & refund` (profile) | `cancelSub(subId)` L5518 → `confirmCancelSub` L5549 | `status='Cancelled'`; if `refund>0`: `recordRefund(rider,refund,reason,'Subscription cancellation',subId)` **and** `creditRiderWallet(rider,refund,…)` (L5560–L5561) | `DB.subscriptions`, refunds ledger, rider wallet | `manage_subscriptions` L5550 | `cancel_subscription` with before/after L5557 | red modal: *"This cannot be undone."* |
| `✓ Confirmed — starts today` (banner) | `confirmSubDriverCommit(id,true)` L4826 | see §5.1 | `DB.subscriptions` | `manage_subscriptions` unless `isAuto` (L4827) | `sub_start_confirmed` L4835 | no |
| `Can't make it — roll to tomorrow` | `confirmSubDriverCommit(id,false)` | rolls `started` forward, no trip deducted | `DB.subscriptions` | idem | `sub_start_deferred` L4845 | no |
| `✓ Approved — start it` (banner) | `approveCorpSubscription(id)` L4882 | `pendingManagerApproval=false`, `status='Active'`, unshift to `DB.corpApprovalLog`, then `evaluateSubStart` | `DB.subscriptions`, `DB.corpApprovalLog` | `manage_subscriptions` L4883 | `corp_approval_granted` L4889 | no |
| `✕ Declined — cancel` (banner) | `rejectCorpSubscription(id)` L4897 | `status='Cancelled'`, `Declined` log entry | idem | `manage_subscriptions` L4898 | `corp_approval_declined` L4904 | no |
| `Create subscription` (modal) | `commitNewSub()` L4913 | validates rider/plan/driver/days, re-checks eligibility, then `sendSubDispatchRequest(data)` | — | `manage_subscriptions` L4914 | audit fires later in `finalizeNewSub` (L5109) | no |
| `Cancel request` / `✕` (dispatch) | `cancelSubDispatch()` L5022–L5026 | `clearInterval`, `_nsDispatch=null`, `closeModal()` — **no subscription created, no DB write, no audit entry, no toast** | none | none | none | no |
| `Send request` (reselect) | `redispatchToNewDriver(newDrvId)` L5062 | rebuilds `data` with the declined driver appended to `excludeDrivers`, restarts dispatch | — | none | none | no |
| `Confirm settlement` | `commitSettlement(subId)` L3684 | see §12.1 | | | | |
| `Assign driver` / `Confirm & assign` | `commitDriverChange(...)` L5809 | see §12.5 | | | | |

---

## 11. Tables & lists

### 11.1 Main table `#subs-tbody` (head L737–L753, rows L3543–L3558)

| # | Header | Cell content |
|---|---|---|
| 1 | Rider | name (blue, `openProfile(sub.rider)`) + 📍 `subLocBtn` + sub-line `{riderId} · {phone}` |
| 2 | Plan | cadence label (plan minus vehicle token) |
| 3 | Vehicle | badge `Economy` (`b-eco`) / `Comfort` (`b-com`) |
| 4 | Route | direction arrows + route from `DB.upcomingSubTrips` |
| 5 | Driver | level badge `★ rating` + name (blue, `openProfile(sub.driver)`) + 📍 |
| 6 | Health | `At risk` / `Watch` / `Healthy` |
| 7 | Days left | literal `Ends {sub.ends}` |
| 8 | Next trip | relative or scheduled time |
| 9 | Consumed | `done/total trips`, `pct%`, progress bar, `SAR consumed of SAR paid` |
| 10 | Trip value | `fmtSAR(perTrip)` |
| 11 | Payment | payment status badge |
| 12 | Auto-renew | toggle switch |
| 13 | Paid / Driver | package paid over `drv accrued {n}` |
| 14 | Status | status badge |
| 15 | Actions (sticky right) | `View`, `Change driver`, `Settle` (conditional) |

- **Row source:** `Object.keys(DB.subscriptions)` in insertion order (L3507). **No sort is applied.**
- **Filters:** the three custom selects (§9.1), applied L3538–L3540.
- **Search:** none wired (§17).
- **Row click:** none — the `<tr>` has no `onclick`. Navigation only via cells/buttons.
- **Empty state (L3541), colspan 15:** filters active but no match → `No subscriptions match this filter.`; DB empty → `No subscriptions yet. Use "+ New subscription" to create one.`

### 11.2 Trip log table inside `buildSubProfile` (rows L4304–L4309, table L4356–L4357)

Columns: `Date · Route · Distance · Duration · Rider pays · Driver earns · Status`.
Row source: `Object.keys(DB.trips).filter(t.rider===d.rider && t.kind==='Subscription')` (L4292) — **matched by rider identity, not `t.sub`** (comment L4288–L4291).
Sort: `DB.trips[b].date.localeCompare(DB.trips[a].date)` (L4293) — **string comparison of `'25 Jun 07:00'`-style labels; not chronological.**
Card header badge: `{sub.trips} complete` (L4355).
Empty state: colspan 7, `No trips recorded yet for this subscription.` (L4309).

### 11.3 Recent-activity list (profile, L4358–L4360)

`auditForEntity(d.id, 5)` (L4295) → last 5 audit rows via `auditRowsHTML(subActivity,true)`. Empty state `No logged actions on {id} yet.` A `View full log →` button appears only when there is at least one entry, routing to `go('audit-log', findSbEl('audit-log'))`.

---

## 12. Modals opened

### 12.1 Settlement modal — `openSettlement(subId)` L3639–L3667 ★ core modal

- **Gate:** `requirePerm('manage_subscriptions')` (L3640) — silent return with a `🔒` toast and a `permission_denied` audit entry if denied.
- **Title:** `Early termination settlement — {subId}` (L3650).
- **Policy banner (L3652):** *"📌 Policy: riders cannot cancel a paid package — 'change of mind' is not a settlement reason. This tool is only for platform-side terminations and rider-violation removals."*
- **Context line (L3653):** `{riderName} · {sub.plan} · {sub.trips} trips`.
- **4 stat tiles (L3655–L3658):**

| Tile | Value | Colour |
|---|---|---|
| `Package paid` | `fmtSAR(e.paid)` | default |
| `Per-trip value` | `fmtSAR(e.perTrip)` | default |
| `Consumed ({done}/{total})` | `fmtSAR(e.consumed)` | `var(--blue)` |
| `Remaining (deferred)` | `fmtSAR(e.remaining)` | `var(--amber-dk)` |

- **Field `Termination reason`** (L3643–L3648): radio group `name="settle-reason"`, one label per key of `SETTLE_REASONS`, **`platform_fault` checked by default** (L3645). Each radio's `onchange` calls `refreshSettlePreview(subId)`.
- **Live preview `#settle-preview`** — `refreshSettlePreview(subId)` L3668–L3683, called once on open (L3666) and on every radio change. Rows:
  - `Rider gets back` → `fmtSAR(s.riderBack)`, green when `> 0`, red when `0` (L3677).
  - Method sub-line (L3672): `refund` → *"Refund to original payment method"*; `credit` → *"Returned as wallet credit"*; `forfeit` → *"Forfeited per T&Cs (rider violation)"*.
  - `Driver is paid (accrued, {done} completed trips)` → `fmtSAR(s.driverPay)`, blue (L3679).
  - `Eyvar keeps (commission on consumed[ + forfeited remainder])` → `fmtSAR(s.eyvarKeeps)` (L3680).
- **Buttons:** `Cancel` → `closeModal()`; `Confirm settlement` → `commitSettlement(subId)` (L3664).
- **Commit — `commitSettlement(subId)` L3684–L3695:**
  1. Re-reads the checked radio; aborts if sub or radio missing (L3686–L3687).
  2. `s = computeSettlement(sub, sel.value)` (L3688).
  3. **`sub.status = 'Cancelled'`** (L3689) — the only DB mutation.
  4. `closeModal()`, `renderSubscriptionsTable()` (L3690–L3691).
  5. Audit `logAction('settle_subscription','subscription',subId, 'Early termination settled — reason: … · rider back … (method) · driver paid … · Eyvar keeps …', {status:'Active'}, {status:'Cancelled', reason:key})` (L3692) — **the `before` block hardcodes `{status:'Active'}` regardless of the real prior status.**
  6. Toast `✅ Settlement recorded for {id} — rider … · driver …`, click-through to `openProfile(subId)` (L3693).
  7. `pushOpsNotification('payout','Settlement — {id}','Driver payout of … queued; rider …')` (L3694).
- **No money actually moves:** no wallet credit, no refund ledger entry, no payout record — only the status flip, audit line, toast and notification. Contrast `confirmCancelSub`, which calls `recordRefund` + `creditRiderWallet` (L5560–L5561). Flagged in §17.

### 12.2 Freeze modal — `freezePlan(subId)` L5485–L5502

| Field | id | Type | Default | Options |
|---|---|---|---|---|
| `Freeze duration` | `frz-dur` (`csel-frz-dur`) | custom select | `3 days` | `3 days`, `1 week`, `2 weeks`, `Until manually resumed` (L5494) |
| `Reason (optional)` | `frz-reason` | text input | empty | placeholder `e.g. rider travelling` (L5497) |

Body copy (L5491): *"Freezing pauses {rider}'s subscription and stops the countdown of remaining days. Trips will not be scheduled until you unfreeze."*
Buttons: `Cancel`, `Freeze plan` → `doFreeze(subId)` (L5499).
`doFreeze` (L5503) sets `status='Frozen'` and logs `freeze_subscription`. **`frz-reason` is read by nothing** (§17).

### 12.3 Cancel & refund modal — `cancelSub(subId)` L5518–L5547

Read-only lines (L5535–L5539): `Trips used` = `sub.trips`; `Refund before fee` = `grossRefund` with a `(fully used)` suffix when `<= 0`; `Mid-cycle cancellation fee ({feePct}%)` shown only when `feeApplies`, otherwise a grey note — `Mid-cycle fee is currently disabled in Settings.` if `used>0`, else `No trips used yet — full refund, no fee applies.`; `Net refund to wallet` = `refund` (green when `>0`).

| Field | id | Type | Default | Options |
|---|---|---|---|---|
| `Cancellation reason` | `csn-reason` (`csel-csn-reason`) | custom select | `Rider request` | `Rider request`, `Driver unavailable`, `Payment dispute`, `Other` (L5541–L5543) |

Buttons: `Keep subscription`, `Confirm cancel` → `confirmCancelSub(subId, refund, fee)` — **values baked into the onclick string at render time** (L5546).

### 12.4 Auto-renew-off reason modal — `openAutoRenewOffReason` L5455–L5471

Explainer (L5459): *"This setting represents the rider's own renewal preference — record why it's changing so it's clear later whether this came from the rider or was an ops decision."*

| Field | id | Type | Default | Options |
|---|---|---|---|---|
| `Reason *` | `arn-reason` (`csel-arn-reason`) | custom select | `''` (none) | `Rider requested — phone/support`, `Rider requested — noted in app/chat`, `Payment method issue`, `Ops decision — risk mitigation`, `Other` (L5462–L5468) |

Buttons: `Cancel`, `Turn off` → `commitAutoRenewOff(subId)`; empty reason → `⚠ Pick a reason first` toast and abort (L5475).

### 12.5 Change-driver modal — `renderChangeDriverModal(subId, reason)` L5751–L5789

- Current-driver strip: `{driverName} [{lvl} badge] · for {riderName}` (L5776).
- **Field `Reason for change`** — id `cd-reason` (`csel-cd-reason`), options from `CD_REASONS` (L5574–L5579):

| Key | Label | `compensate` |
|---|---|---|
| `inactive` | `Driver inactive / left platform` | true |
| `complaint` | `Complaint or safety concern` | true |
| `schedule` | `Schedule / route mismatch` | false |
| `preference` | `Rider preference — no specific issue` | false |

- `complaint` auto-links any open complaint for that driver/rider pair (`openComplaintFor`, L5656) and restricts candidates to verified drivers (`restrictVerified: reason==='complaint'`, L5713).
- Candidate list rendered by the shared `driverCandidateRowsHTML()` (L5727–L5750): level badge, `{vehicle} · ★{rating|new} · {capacity}`, plus tags — gender-preference match/mismatch, `👥 Drove {firstName} before (N)`, `{km} away`, `{onTime}% on-time`; disabled candidates get `opacity:.5` and a red `🚫 {reason}` line. First non-disabled candidate pre-selected.
- Footer: hidden when `eligibleCount===0`; `Continue` → `proceedChangeDriver` when the reason has `compensate:true`; otherwise `Assign driver` → `commitDriverChange(subId,null,reason,null)` (L5769–L5772).
- **Compensation step** (`proceedChangeDriver`, L5790–L5808) — radio group `cd-comp` via `.plan-option[data-comp]`: `🎁 Free next ride` (`free`), `20% off next renewal` (`20off`, **pre-selected**), `10 SAR wallet credit` (`credit`), `No compensation` (`none`) (L5803–L5806).
- **Commit** (`commitDriverChange`, L5809+): `requirePerm('manage_subscriptions')` (L5810); re-validates the pick against live `changeDriverCandidates` (L5821–L5823); increments `sub.driverChanges` (L5837); logs a `SUB_SAME_CAPTAIN_BROKEN` contact via `logContact` (L5838); sets `sub.driver=newDrvId` (L5845); cascades `DB.upcomingSubTrips` **by rider identity** setting `t.driver` and `t.driverStatus='moving'` (L5855); unshifts notification entries into both drivers' `notifLog` (L5857–L5862).

### 12.6 Dispatch modals (creation flow)

| Modal | Function | Contents |
|---|---|---|
| `New subscription — dispatch in progress` | `renderSubDispatchUI` L4992–L5021 | driver avatar + `{vehicle} · ★{rating}`; badge `📨 Sent` → `👀 Viewing request` at `viewingAt` (L4997); mini map (`subDispatchMapHTML`, L4979) with rider 📍 and driver 🚗 pins and a dashed distance line; `{km} from {rider}'s pickup` / `ETA {n} min`; `Sent at {hh:mm:ss}`; note *"Auto-reassigns after 2:00 if no response"* (L5013); elapsed `mm:ss` + `{remaining} left`; progress bar. Footer: `Cancel request` → `cancelSubDispatch()` |
| `New subscription — {driver} declined` | `renderSubReselectAfterDecline` L5043–L5061 | red reason banner; up to 5 other eligible drivers each with `Send request` → `redispatchToNewDriver(id)`; empty state `No other eligible drivers nearby right now.`; footer `Cancel — don't retry` |
| `{subId} — {driver} accepted` | `renderSubAcceptedTracking` L5133–L5173 | green accepted header; map; outcome banner keyed on `startOutcome` (confirmed / deferred / pending, L5138–L5144); `Plan` / `Route` / `Total` lines; footer `Open full profile →`. When `pending`, polls `sub.pendingDriverCommit` every 1000 ms and re-renders on resolution (L5167–L5172) |
| `{subId} — driver response` | `openSubTrackingModal` L4787 / `renderSubTrackingWidget` L4800–L4825 | ⏳ pulsing spinner *"Waiting for {driver} … Confirming they can reach {rider} by {commitDeadline}"*; on resolve ✓ *"{driver} confirmed"* or ✕ *"{driver} couldn't make it — rolled to {date} — no trip deducted"*. Footer `Keep working — I'll check later` (unresolved) or `View subscription` (resolved) |

### 12.7 Export modal — `exportData(btn,'subscriptions')` L9187–L9203

Radio group `xfmt`: `CSV` (pre-selected, *"Opens in Excel / Google Sheets"*) / `JSON` (*"For systems and APIs"*).
Radio group `xloc`: `Choose where to save…` (pre-selected **only if** `window.showSaveFilePicker` exists, else disabled/greyed with title *"Not supported in this browser"*) / `Downloads folder`.
Footer: `Cancel`, `Export` → `doExport('subscriptions')`.

---

## 13. States & badges

| Badge / indicator | Exact trigger | Line |
|---|---|---|
| `b-green` status badge | `/done\|resolved\|closed/i.test(status)` | L3731 |
| `b-blue` status badge | `/trip\|active/i.test(status)` — matches `Active` | L3732 |
| `b-amber` status badge | `/late\|expir\|pend/i.test(status)` — matches `Expiring`, `Pending Approval` | L3733 |
| `b-red` status badge | `/cancel\|risk\|refund/i.test(status)` — matches `Cancelled` | L3734 |
| `b-grey` status badge | anything else — matches `Frozen` | L3735 |
| `health h-red` "At risk" | `hasOpenComplaint(sub.driver, sub.rider)` — an open `DB.complaints` entry with `against===driver && by===rider && status==='Open'` | L3529, L5650–L5655 |
| `health h-amber` "Watch" | not at risk **and** `/expir/i.test(sub.status)` | L3530 |
| `health h-green` "Healthy" | neither of the above | L3530 |
| `b-eco` vehicle badge | last token of `sub.plan` is `Economy` | L3547 |
| `b-com` vehicle badge | otherwise (`Comfort`) | L3547 |
| `b-gold` / `b-silver` / `b-grey` driver badge | `drv.lvl === 'gold'` / `'silver'` / else; rendered only when `drv.rating` is truthy | L3531 |
| Consumed bar green | `econ.pct >= 100` | L3536 |
| Consumed bar blue | `econ.pct < 100` | L3536 |
| Payment badge grey `—` | no `DB.payments` entry with `p.trip === subId` | L3528 |
| `Settle` button present | `!/cancel/i.test(sub.status)` | L3541, L3556 |
| Auto-renew toggle checked | `sub.autoRenew !== false` | L3552 |
| `⏳ Waiting on driver commitment` banner | `d.pendingDriverCommit` truthy | L4313 |
| `⏳ Pending manager approval` banner | `d.pendingManagerApproval && DB.corporateAccounts[d.approvalCorp]` both truthy | L4318–L4319 |
| `📅 Postponed trips` banner | `d.postponements && d.postponements.length` | L4325 |
| `👀 Viewing request` (dispatch) | `elapsedSec >= _nsDispatch.viewingAt` (2–6 s) | L4997 |

---

## 14. Cross-module links

| From | Call | To |
|---|---|---|
| Rider cell / rider row in profile | `openProfile(sub.rider)` L3545 | 360° Profile → rider |
| Driver cell / driver row in profile | `openProfile(sub.driver)` L3549 | 360° Profile → driver |
| 📍 buttons | `showEntityLocation(id)` L3285 | location popup / live map |
| `View` row button | `openProfile(subId)` L3556 | 360° Profile → `buildSubProfile` |
| Profile `↻ Renew / Upgrade` | `openRenewFlow(d.rider)` L4348 → L11277 | Renewal wizard |
| Profile `View full log →` | `go('audit-log', findSbEl('audit-log'))` L4358 | Activity log page |
| Settlement toast + notification | `openProfile(subId)` L3693–L3694 | back to the settled subscription |
| Corporate approval banner buttons | `approveCorpSubscription` / `rejectCorpSubscription` L4322 | Corporate module (writes `DB.corpApprovalLog`) |
| Approval-hold toast/notification at creation | `openProfile(newSubId)` L5112–L5113 | this subscription |
| Corporate detail "Pending approvals" | `openProfile(pendingApprovalSubIds[0])` L6594 | into this module |
| Renewal-pipeline / readiness / coverage pages | call `renderSubscriptionsTable()` after their own writes | L10292, L11446, L12472, L13231 |

---

## 15. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| 7 seeded subscriptions `SUB-1041 … SUB-0987` | L2685–L2693 | entire demo dataset |
| Page subtitle `142 active · 8 expiring in 3 days · 3 cancelled this month` | L716 | replaced on first render |
| KPI values `142 / 68 / 48 / 26` and deltas `↑ 12 vs last week`, `48%`, `34%`, `↑ 4 this month` | L720–L723 | replaced on first render |
| KPI bar widths `71% / 48% / 34% / 18%` | L720–L723 | replaced on first render |
| Sidebar badge `142` | L502 | replaced by `refreshNavCounts()` |
| `subs.subscriptions = '142 active subscriptions'` | L2169 | replaced at L9403 |
| `EYVAR_COMMISSION_PCT = 20` | L3604 | platform-wide constant, not editable in the UI |
| `SUB_START_COMMIT_BUFFER_MIN = 5` | L4720 | |
| `CADENCE_META` discount/commission pairs | L4520–L4524 | duplicates `DB.plans[*].discountPct/eyvarPct` — a second source of truth |
| `PLANS` baseline prices `86.50 / 122.50 / 164.35 / 232.50 / 344.52 / 487.00`, `exec` counts `5 / 10 / 22` | L4389–L4393 | |
| `ROAD_CIRCUITY_FACTOR = 1.35`, `URBAN_AVG_SPEED_KMH = 26` | L7261–L7262 | |
| `EYVAR_TODAY = new Date(2026,5,25)` | L11232 | the dataset's internal "today" |
| `parseShortDate` hardcodes year `2026` | L14204 | |
| Export filename suffix `_25Jun` | L9212 | not derived from anything |
| `expSoon` uses `parseInt(x.ends,10) - 25 <= 3` | L9399 | 25 = hardcoded day-of-month |
| Dispatch simulation: `respondInSec` formula, `acceptChance` base `0.82` ± rating adjustment clamped `[0.55,0.95]`, `viewingAt = 2 + rand×4` | L4956–L4960 | pure simulation |
| Three decline reasons chosen at random | L5035–L5036 | mock |
| `commitAutoResolveAfter = 8 + rand(0..9)` s — comment *"driver 'checks their phone' 8–18s later"* | L4771 | mock |
| New id generator `'SUB-'+(1100+floor(random*900))` with collision retry | L5089–L5090 | range 1100–1999 |
| Compensation options `Free next ride / 20% off next renewal / 10 SAR wallet credit / No compensation` | L5803–L5806 | fixed list, not configurable |
| Default day selection `[0,1,2,3,4]` (Sun–Thu) | L4559 | |
| Default depart `07:00`, return `17:00` | L4623 | |
| `changeDriver(subId)` falls back to `'SUB-1041'` when called with no argument | L5716 | leftover from the removed hardcoded detail page |
| Dispatch note *"Auto-reassigns after 2:00 if no response"* | L5013 | display text only — no auto-reassign code exists |
| 16 `RIYADH_DISTRICTS` with `{x,y}` percentage map coordinates | L7243–L7249 | synthetic geography |

---

## 16. i18n keys

| Key | English (DOM) | Arabic | Line |
|---|---|---|---|
| `nav.subscriptions` | `Subscriptions` | `الاشتراكات` | L502 / L7906 |

**No other `data-i18n` attribute exists in the subscriptions page markup (L713–L767) or in any subscription-related JS-generated HTML.** Every heading, column header, KPI label, button label, modal title, field label, toast and empty-state string in this module is English-only literal text. `applyLanguage()` (invoked at L14596) can therefore translate only the sidebar entry, not the page.

---

## 17. Gaps, dead code, UNVERIFIED items

1. **Dead search input.** L730 renders `<input placeholder="Search rider, driver…">` with no `id`, no name and no event handler. No function reads it. Typing does nothing.
2. **`At risk` is an unreachable filter.** The status filter offers `At risk` (L3501) but no code path assigns `status='At risk'` (verified: zero occurrences of `status:'At risk'`). Selecting it always yields the empty state. "At risk" exists only as a *Health* value, which is computed, not stored, and not filterable.
3. **No exit from `Frozen`.** `doFreeze` sets `status='Frozen'` (L5509) and the modal copy promises *"until you unfreeze"* (L5491), but no unfreeze/resume function exists. A frozen subscription can only leave that state via cancel or settle.
4. **Freeze reason is discarded.** `#frz-reason` (L5497) is never read — not by `doFreeze`, not by the audit entry (L5514 records only `{status, duration}`).
5. **`Days left` column shows a date.** Header L744 says "Days left"; the cell (L3551) emits `Ends {sub.ends}`. No day count is computed for this column.
6. **Settlement moves no money.** `commitSettlement` (L3684–L3695) flips status and writes an audit line + toast + notification but never calls `recordRefund`, `creditRiderWallet` or any payout function — unlike `confirmCancelSub` (L5560–L5561). The rider refund/credit and driver payout are described but not executed.
7. **Settlement audit `before` is falsified.** L3692 hardcodes `{status:'Active'}` as the before-state even when settling an `Expiring` or `Frozen` subscription.
8. **Two different driver-commission rates in one module.** Table column 13 uses the flat `EYVAR_COMMISSION_PCT=20` (L3612); the profile card uses `commissionRateForPlan()` → `DB.plans[key].eyvarPct` (18 % biweekly, 15 % monthly, L4461). For `SUB-1052` (Bi-weekly Comfort, 412.00 SAR) the table implies 80 % to the driver and the profile 82 %.
9. **Duplicated dead branch in `finalizeNewSub`.** L5110–L5115 and L5116–L5123 are two identical `if(needsApproval){…return;}` blocks; the second is unreachable.
10. **`finalizeNewSub` signature mismatch.** Declared `function finalizeNewSub(data)` (L5078) but called as `finalizeNewSub(data,drv,rider)` (L5033). Extra arguments are ignored — misleading, not broken.
11. **`subEconomics().driverFull` is never consumed.** Computed L3613, returned L3614–L3615, read nowhere.
12. **`sub.postponements` has no writer.** `buildSubProfile` renders a full Postponed-trips banner (L4325–L4329) but no function in this file assigns `postponements`. The rendering path is unreachable with current code — **UNVERIFIED** whether an external or removed flow populated it.
13. **Filters are not applied to export.** `exportRows('subscriptions')` (L9176–L9177) always exports `Object.keys(DB.subscriptions)` in full, ignoring the active plan/vehicle/status filters. A user looking at 3 filtered rows gets all rows in the CSV.
14. **Trip-log sort is lexicographic.** L4293 sorts on `date.localeCompare` over labels like `'25 Jun 07:00'` — `'5 Jul'` sorts before `'25 Jun'`.
15. **Seeded subscriptions lack the scheduling schema.** None of the 7 seeds have `days`, `departTime`, `direction` or `route`, so `evaluateSubStart`, `generateUpcomingTripsForSubscription` and `directionArrows` all degrade for them.
16. **No permission gate on the auto-renew toggle.** Both `toggleAutoRenew` (L5442) and `commitAutoRenewOff` (L5472) mutate `DB.subscriptions` and write audit entries without any `requirePerm` call — unlike every other write in this module.
17. **Modal openers are ungated.** `freezePlan` (L5485), `cancelSub` (L5518), `changeDriver` (L5715) and `renderNewSubModal` (L4557) open freely; the gate lives only on the commit functions. A permissionless user can fill in an entire modal before being blocked. (`openSettlement` is the exception — gated at open, L3640.)
18. **`commitNewSub` gates before validating** (L4914) — a permissionless user is blocked before any field feedback.
19. **Granular permission keys are declared but unused.** L10573–L10577 declares `subscriptions.{view, change_driver, settle}` with `legacy:'manage_subscriptions'`, but every call site here checks only the legacy string `'manage_subscriptions'` (L3640, L4883, L4914, L5504, L5550, L5810). `settle` and `change_driver` are not enforced separately. **UNVERIFIED** whether `can()` internally maps granular keys — not resolvable from the call sites read.
20. **`cancelSubDispatch` is silent.** It aborts an in-flight creation with no toast, no audit entry and no record that a driver was asked and then abandoned (L5022–L5026).
21. **"Auto-reassigns after 2:00 if no response" is display-only.** The string renders at L5013, but `sendSubDispatchRequest` has no auto-reassign timeout — the interval only resolves accept/decline at `respondInSec`.
22. **Day-rollover scheduler missing (documented in-file, L4691–L4694):** `generateUpcomingTripsForSubscription` fires at creation time only and does not re-generate at each new calendar day; *"a full day-rollover scheduler is a larger, separate engine than this fix."*
23. **Filter injection is one-shot.** Guarded by `!document.getElementById('csel-subs-plan')` (L3495); if the filter bar were ever cleared the selects would be re-added but their chosen values lost.

---

## 18. Line-number index

| Item | Lines |
|---|---|
| HTML page `#p-subscriptions` | 713–767 |
| — page header + Export / New buttons | 714–718 |
| — KPI row `#subs-kpis` (static) | 719–724 |
| — card header + `#subs-filters-wrap` | 726–734 |
| — dead search input | 728–731 |
| — table head (15 columns) | 737–753 |
| — `#subs-tbody` | 755 |
| — removed legacy `p-sub-detail` comment | 758–765 |
| Sidebar nav item + `#sbb-subs` | 502 |
| `titles` / `subs` maps | 2168–2169 |
| `DB.subscriptions` seed | 2685–2693 |
| `DB.plans` seed | 2889–2896 |
| `requirePerm` | 3126–3132 |
| `logAction` | 3133–3158 |
| `PERMISSION_LABELS.manage_subscriptions` | 3227, 3246 |
| `resolveId` (bucket list incl. `subscriptions`) | 3269–3275 |
| `rowLink` | 3283 |
| `subLocBtn` | 3284–3286 |
| subscriptions-table doc comment | 3287–3292 |
| `directionArrows` | 3468–3476 |
| `renderSubscriptionsTable` | 3477–3573 |
| — KPI recompute | 3478–3493 |
| — filter select injection | 3494–3506 |
| — filter application | 3535–3540 |
| — empty state | 3541 |
| — row template | 3543–3558 |
| `kvCard` | 3560–3564 |
| `nm2` | 3565 |
| `emailFor` / `sendSystemEmail` | 3572–3585 |
| subscription-economics doctrine comment | 3586–3603 |
| `EYVAR_COMMISSION_PCT` | 3604 |
| `subEconomics` | 3605–3616 |
| settlement-rules comment | 3617–3626 |
| `SETTLE_REASONS` | 3627–3631 |
| `computeSettlement` | 3632–3638 |
| `openSettlement` | 3639–3667 |
| `refreshSettlePreview` | 3668–3683 |
| `commitSettlement` | 3684–3695 |
| `statusBadge` | 3730–3736 |
| `riderLTV` | 4031–4037 |
| `riderTenureMonths` | 4038–4046 |
| `buildTripProfile` | 4244–4278 |
| `buildSubProfile` | 4279–4362 |
| — trip-log id matching comment | 4288–4291 |
| — money split | 4300–4302 |
| — commit banner | 4312–4317 |
| — approval banner | 4318–4324 |
| — postpone banner | 4325–4329 |
| — subscription-info card | 4331–4345 |
| — action row | 4346–4352 |
| — trip log | 4354–4357 |
| — recent activity | 4358–4360 |
| `PLANS` | 4389–4393 |
| `fmtSAR` | 4394 |
| `planKeyFromLabel` | 4450–4456 |
| `commissionRateForPlan` | 4461–4466 |
| `driverCommissionRate` | 4467 |
| `getLimit` | 4468 |
| `driverCompletedTripsCount` | 4482–4486 |
| `driverTrustedForSubs` / `driverSubTrustReason` | 4487–4499 |
| `driverAutoRestricted` | 4500–4508 |
| dynamic-pricing doctrine comment | 4509–4519 |
| `CADENCE_META` | 4520–4524 |
| `WEEKDAYS` | 4525 |
| `perTripBaseRate` | 4529–4534 |
| `computeDynamicSubPrice` | 4535–4556 |
| `renderNewSubModal` | 4557–4641 |
| `updateNsPricePreview` | 4642–4669 |
| `onNewSubChange` | 4670–4676 |
| upcoming-trip-generation comment | 4677–4691 |
| `fmtTimeLabel12h` | 4692–4698 |
| `parse12hToTimeStr` | 4699–4706 |
| `minutesUntilTime` | 4707–4711 |
| `driverEtaToRiderMin` | 4714–4719 |
| `SUB_START_COMMIT_BUFFER_MIN` | 4720 |
| `nextScheduledDayLabel` | 4721–4732 |
| `evaluateSubStart` doctrine comment | 4733–4742 |
| `evaluateSubStart` | 4743–4778 |
| live-commitment-tracking comment | 4779–4786 |
| `openSubTrackingModal` | 4787–4799 |
| `renderSubTrackingWidget` | 4800–4825 |
| `confirmSubDriverCommit` | 4826–4854 |
| `generateUpcomingTripsForSubscription` | 4856–4880 |
| `approveCorpSubscription` | 4882–4896 |
| `rejectCorpSubscription` | 4897–4908 |
| `findCorpForRider` | 4909–4912 |
| `commitNewSub` | 4913–4939 |
| sub-dispatch doctrine comment | 4940–4946 |
| `_nsDispatch` | 4947 |
| `sendSubDispatchRequest` | 4948–4973 |
| `subDispatchMapHTML` | 4979–4991 |
| `renderSubDispatchUI` | 4992–5021 |
| `cancelSubDispatch` | 5022–5026 |
| `resolveSubDispatch` | 5027–5039 |
| `renderSubReselectAfterDecline` | 5043–5061 |
| `redispatchToNewDriver` | 5062–5070 |
| `retrySubDispatchWithNewDriver` | 5071–5077 |
| `finalizeNewSub` | 5078–5127 |
| — new record shape | 5097–5101 |
| — duplicated `needsApproval` branch | 5110–5123 |
| `renderSubAcceptedTracking` | 5133–5173 |
| `openRenewModal` | 5174+ |
| `toggleAutoRenew` | 5442–5454 |
| `openAutoRenewOffReason` | 5455–5471 |
| `commitAutoRenewOff` | 5472–5484 |
| `freezePlan` | 5485–5502 |
| `doFreeze` | 5503–5517 |
| `cancelSub` | 5518–5547 |
| `getCancellationRule` | 5548 |
| `confirmCancelSub` | 5549–5566 |
| `CD_REASONS` | 5574–5579 |
| `hasOpenComplaint` | 5650–5655 |
| `openComplaintFor` | 5656–5662 |
| `changeDriverCandidates` | 5709–5714 |
| `changeDriver` | 5715–5719 |
| `onChangeDriverReason` | 5720–5723 |
| `driverCandidateRowsHTML` | 5727–5750 |
| `renderChangeDriverModal` | 5751–5789 |
| `proceedChangeDriver` | 5790–5808 |
| `commitDriverChange` | 5809–5870 |
| `RIYADH_DISTRICTS` | 7243–7249 |
| `computeRouteKm` | 7250–7255 |
| `geoDistanceKm` | 7256–7260 |
| `ROAD_CIRCUITY_FACTOR` / `URBAN_AVG_SPEED_KMH` | 7261–7262 |
| i18n `nav.subscriptions` | 7906 |
| `window.go` | 8774+ |
| router hook `id==='subscriptions'` | 8818 |
| `exportRows` | 9175–9183 |
| `buildCSV` | 9184–9186 |
| `exportData` | 9187–9203 |
| `doExport` | 9204–9219 |
| `refreshNavCounts` | 9392–9410 |
| permission tree `subscriptions` | 10573–10577 |
| `CADENCE_DAYS` | 11231 |
| `EYVAR_TODAY` | 11232 |
| `addDaysLabel` | 11233–11236 |
| `planCadenceKey` / `planVehicleType` | 11237–11244 |
| `openRenewFlow` | 11277–11283 |
| `DB.cancellationPolicy` `sub_mid_cycle` | 13944 |
| `parseShortDate` | 14200–14205 |
| `subHealthScore` | 14210+ |
| `kpiScrollTo` | 14535–14543 |
| boot `renderSubscriptionsTable()` | 14594 |

---

## 19. New-Subscription nearby-driver map (added in remediation)

> Added by Verification Pass 1 remediation. Pass 1 found this sub-feature entirely undocumented — five of the 24 residual symbols (`toggleNsDriverMap`, `renderNsDriverMap`, `capacityOpen`, `#ns-map-toggle-btn`, `#ns-driver-map`) belonged to it. It is a real, user-facing control, not plumbing.

### 19.1 What it is

Inside the **New subscription** modal (`renderNewSubModal`, L4557–L4669) the driver picker has two mutually exclusive presentations of the *same* candidate set:

| View | Container | Built by | Default |
|---|---|---|---|
| **List** (rows with radio buttons) | `#ns-driver-list` (L4589) | `driverCandidateRowsHTML(cands, rider.name, 'ns-drv', vehicleType)` — L4589, function L5727–L5750 | visible |
| **Map** (pin plot on a synthetic grid) | `#ns-driver-map` (L4590, `style="display:none"`) | `renderNsDriverMap(riderId, vehicleType)` — L5887–L5907 | hidden |

The whole block only exists when **both** a rider and a plan (hence a `vehicleType`) have been chosen — `if(riderId&&vehicleType)` L4583. Otherwise `driversBlock` is the placeholder string *"Select a rider and a plan to see the nearest eligible drivers."* (L4592), and neither the toggle button nor the map container is emitted at all.

### 19.2 Controls — complete list

| Element / id | Line | Kind | Handler | Behaviour |
|---|---|---|---|---|
| `#ns-map-toggle-btn` | **L4588** | `button type="button" class="btn sm"` | `onclick="toggleNsDriverMap('<riderId>','<vehicleType>')"` | Flips list to map and back. Label starts `View on map`; becomes `View as list` while the map is up (L5881, L5883). |
| `#ns-driver-map` | **L4590** | `div style="display:none"` | — | Mount point. `renderNsDriverMap` writes its entire `innerHTML` (L5905). |
| `#ns-driver-list` | L4589 | `div` | — | Sibling the toggle hides/shows (`list.style.display` L5881/L5883). *(Already documented in §12; repeated here for the pair.)* |
| Map pin (`.ns-map-pin`) | L5900 | `div` | `onclick="pickNsDriverFromMap('<driverId>')"` — **only when the candidate is not disabled**; disabled pins get an empty `onclick=""` and `cursor:not-allowed` | Selects the matching list row and returns to list view. |

`toggleNsDriverMap` (L5877–L5886) is a `window.*` assignment, so it is reachable from the inline `onclick` attribute. It reads the three elements by id (L5878), decides direction from `map.style.display!=='none'` (L5879), and **only calls `renderNsDriverMap` on the open transition** (L5884) — the map is not redrawn when it is hidden.

`pickNsDriverFromMap` (L5908–L5913):

1. `document.querySelector('#modal-box .plan-option[data-drv="<id>"]')` — L5909. The `data-drv` attribute is emitted by `driverCandidateRowsHTML` at L5741.
2. `selDriver(row)` — L5910 / function L5872–L5876: clears `.selected` from every `.plan-option` in `#modal-box`, adds it to this one, and checks its radio.
3. `toggleNsDriverMap()` — L5911, **called with no arguments** (see defect D3).
4. `row.scrollIntoView({block:'nearest',behavior:'smooth'})` — L5912.

### 19.3 What `renderNsDriverMap` actually draws — L5887–L5907

Guard: `var wrap=document.getElementById('ns-driver-map'); if(!wrap)return;` (L5888–L5889).

Data source: **`eligibleDrivers(riderId, vehicleType, {})`** — L5891. Function at L5672–L5708 (shared with Change-driver; see §12). Positions come from `mapPos:{x,y}` — a **0–100 percentage pair**, not a coordinate (source comment L7232–L7239). All six seeded drivers carry `mapPos` (L2632, L2638, L2644, L2650, L2657, L2663).

| Layer | Line | Rule |
|---|---|---|
| Rider pin | L5893 | Emitted only `if(rider&&rider.mapPos)`. `z-index:5`, `transform:translate(-50%,-100%)` so the pin tip sits on the point. `title` = `"<rider name> (rider)"`. |
| Driver pins | L5894–L5904 | One 26×26 circle per candidate. Candidates **without `mapPos` are silently skipped** (`if(!d.mapPos)return;` L5896). |
| Pin colour | L5897 | `#9B9B97` grey if `c.disabled`; `#1E7B34` green if `c.genderMatch===true`; `#185FA5` blue otherwise. |
| Pin `z-index` | L5900 | `3` if disabled, `6` if selectable — eligible drivers always draw over unavailable ones. |
| Busy dot | L5898–L5899 | `driverLiveState(d.id)` (L7283). `busy` gives an amber `#D99A1B` dot with `title="On a trip"`; free gives green `#4E9B1E`, `title="Free now"`. |
| Name chip | L5902 | `d.name.split(' ')[0]` plus `' · '+fmtKm(c.km)` when `c.km!=null`. `fmtKm` L7281 renders under 1 km as metres. |
| Canvas | L5905 | Fixed **280 px tall**, `border-radius:10px`, background `#EAE6DF` with a 40 px white grid drawn by two `linear-gradient`s. Not a real map tile — a synthetic grid. |
| Legend | L5906 | Six static entries: `Rider`, `Eligible` (blue), `Preference match` (green), `Unavailable` (grey), `Free now`, `On a trip`. |

Pin `title` (L5900) = `"<name> — <km> away — on a trip|free now"`.

### 19.4 The capacity logic — `capacityOpen()` L5580–L5585

```js
function capacityOpen(capStr){
  if(!capStr)return 0;
  if(capStr==='Full')return 0;
  var m=capStr.match(/(\d+)/);
  return m?parseInt(m[1],10):0;
}
```

**Only two references exist in the whole file**: the declaration (L5580) and one call (L5689).

Its single consumer is the fourth hard gate inside `eligibleDrivers`:

```js
else if(capacityOpen(d.capacity)<=0)disabled='Full — no open capacity';   /* L5689 */
```

The gate ladder in `eligibleDrivers` (L5685–L5692), in evaluation order — **first match wins, later reasons are never shown**:

| # | Line | Condition | `disabled` reason string |
|---:|---|---|---|
| 1 | L5686 | `d.suspended` | `Account suspended — <reason>` |
| 2 | L5687 | `driverAutoRestricted(id)` | *(the function's own returned string)* |
| 3 | L5688 | `!driverTrustedForSubs(id)` | `driverSubTrustReason(id)` |
| 4 | **L5689** | **`capacityOpen(d.capacity)<=0`** | **`Full — no open capacity`** |
| 5 | L5690 | `hasOpenComplaint(id,riderId)` | `Rider has an open complaint against this driver` |
| 6 | L5691 | `restrictVerified && d.lvl==='standard'` | `Below required tier for a safety-related change` |
| 7 | L5692 | `!driverCanTakeAnotherSub(id)` | `Already has N active subscription(s) — multi-subscription setting is closed for this driver` |

`d.capacity` is a **display string**, not a number. Every seeded value is one of exactly four literals:

| Driver | `capacity` | `capacityOpen()` | Gate 4 fires? |
|---|---|---:|---|
| `DRV-0101` (L2632) | `'1 open'` | 1 | no |
| `DRV-0102` (L2638) | `'2 open'` | 2 | no |
| `DRV-0103` (L2644) | `'Full'` | 0 | **yes** |
| `DRV-0104` (L2650) | `'Full'` | 0 | **yes** |
| `DRV-0105` (L2657) | `'3 open'` | 3 | no |
| `DRV-0106` (L2663) | `'2 open'` | 2 | no |

`DB.drivers` is seeded with exactly these six records (L2632–L2663), so at boot **two of six drivers are capacity-gated**.

Effect on the map: a `'Full'` driver is *not removed* — it is returned by `eligibleDrivers` with `disabled` set, so it still draws a pin, but grey (L5897), at `z-index:3`, with `cursor:not-allowed` and an **empty `onclick`** (L5900). It is visible-but-unpickable, exactly matching the list convention (L5742, L5747).

`capacityOpen` also drives the sort: `list.sort` puts all `disabled` candidates last (L5700), so a `'Full'` driver is always at the bottom of the list and always under the eligible pins on the map.

**Parsing note:** the regex `/(\d+)/` takes the **first** digit run anywhere in the string. A hypothetical `'0 open'` would return `0` and gate correctly; a hypothetical `'Full (2 reserved)'` would return `2` and **wrongly pass** the gate, because the `capStr==='Full'` short-circuit at L5582 is an exact-equality test, not a prefix test. No such value is seeded, so this is latent.

### 19.5 Defects

| # | Severity | Defect | Evidence |
|---|---|---|---|
| **D1** | **High** | **The map and the list can show different candidate sets.** The list is built from `eligibleDrivers(riderId,vehicleType,{excludeList:excludeDrivers})` (L4585) but the map calls `eligibleDrivers(riderId,vehicleType,{})` (L5891) with an **empty options object** — no `excludeList`. `excludeDrivers` is non-empty whenever `retrySubDispatchWithNewDriver()` has run (L5074: `(data.excludeDrivers||[]).concat([data.drvId])`, then L5076). A driver who just declined the dispatch is therefore removed from the list but **still drawn as a clickable pin on the map**. | L4585 vs L5891; L5074–L5076; exclusion filter L5680 |
| **D2** | **High** | **Clicking an excluded pin silently does nothing.** `pickNsDriverFromMap` looks the row up by `[data-drv="<id>"]` (L5909); for an excluded driver that row was never rendered, so `row` is `null`, `selDriver` is skipped (`if(row)` L5910) and `scrollIntoView` is skipped (`if(row)` L5912) — but `toggleNsDriverMap()` still runs (L5911), so the operator is returned to the list with **no selection made and no error shown**. There is no `else` branch and no toast. | L5908–L5913 |
| **D3** | Medium | **`toggleNsDriverMap()` is invoked with no arguments at L5911.** It survives only because that call always happens while the map is showing, taking the `showingMap===true` branch (L5880–L5881) which never reads `riderId`/`vehicleType`. Any future change that makes this call reach the `else` branch would call `renderNsDriverMap(undefined,undefined)`, so `DB.riders[undefined]` yields no rider pin, and `eligibleDrivers` with `vehicleType` undefined **disables the type filter entirely** (`if(vehicleType&&…)` L5681) and would plot Comfort drivers into an Economy subscription. | L5911, L5879–L5885, L5681 |
| **D4** | Medium | **Drivers without `mapPos` vanish from the map with no notice.** `if(!d.mapPos)return;` (L5896) skips them, but the header immediately above the toggle button still reads *"N nearest eligible `<type>` drivers"* using `eligibleCount` (L4586, rendered L4588) — a count taken from the **list**. Map pin count and header count can disagree with nothing on screen explaining why. All six seeded drivers do have `mapPos`, so this is latent, not currently visible. | L4586, L4588, L5896 |
| **D5** | Medium | **The map state does not survive any field edit.** Every input in the modal calls `onNewSubChange()` (L4598, L4606, L4609, L4613, L4614, L4618, L4619), which re-invokes `renderNewSubModal` (L4674) and rebuilds `driversBlock` from scratch — `#ns-driver-map` returns to `display:none` and the button label resets to `View on map`. Changing the pickup district while looking at the map throws the operator back to the list. | L4670–L4675, L4590, L4588 |
| **D6** | Medium | **`onNewSubChange` drops `excludeDrivers`.** L4674 calls `renderNewSubModal(rider, plan, direction, days)` with only **four** arguments; the fifth parameter `excludeDrivers` (L4557) defaults to `[]` at L4560. So any field edit after a declined dispatch silently re-admits the driver who just declined — to both the list and the map. | L4557, L4560, L4674, L5074 |
| **D7** | Low | **The map is not accessible and not keyboard-reachable.** Pins are `div`s with an `onclick` (L5900) — no `role`, no `tabindex`, no `button` element. The list view's radio inputs (L5743) are reachable; the map view's equivalent control is not. There is no `data-i18n` attribute anywhere in `renderNsDriverMap` — the legend strings at L5906 and the toggle labels at L5881/L5883 are hard-coded English, consistent with §16 of this document. | L5900, L5906, L5881, L5883 |
| **D8** | Low | **The 280 px canvas height is hard-coded** (L5905) while the modal body is `max-height:70vh;overflow-y:auto` (L4604). On a short viewport the map is scrolled rather than fitted. | L5905, L4604 |

### 19.6 Cross-module notes

- `eligibleDrivers` (L5672) is shared with **Change driver** (`changeDriverCandidates` L5709–L5714). `capacityOpen`'s gate therefore governs *both* flows identically — the stated intent of the source comment at L5669–L5671 (*"so the two flows can never silently drift into different rules"*). The **map**, by passing `{}`, is the one place that breaks that guarantee (D1).
- The same visual idiom — a `mapPos`-percentage pin plot over a synthetic grid — appears three more times in the file and **none of them share code**: `showEntityLocation`'s two-pin plot with a dashed SVG connector (L4982–L4987), `showNearbyDriversMap`'s `canvas` version (L8434, documented in `04-live-map.md`), and the rider seed positions (L9812).
- `driverLiveState` (L7283) is the same helper the Live Map uses for its busy/free dot.
- `capacityOpen` is *not* a Settings-driven value. Nothing in `15f-settings-dispatch.md` writes `d.capacity`; it is a seeded literal string only (L2632–L2663).

### 19.7 Mount points (added in remediation)

| Element id | Line | Kind | Renderer / writer | What fills it |
|---|---|---|---|---|
| `#ns-map-toggle-btn` | **L4588** | `button` inside `driversBlock` | `renderNewSubModal` L4557 | Static markup; its `textContent` is then rewritten in place by `toggleNsDriverMap` (L5881, L5883). |
| `#ns-driver-map` | **L4590** | `div style="display:none"` | `renderNewSubModal` L4557 creates it empty; **`renderNsDriverMap` L5887 fills it** | Full `innerHTML` replacement at L5905–L5906: a 280 px positioned grid holding one rider pin and N `.ns-map-pin` driver pins, plus a six-item legend. |

### 19.8 Line-number index for §19

| Symbol | Lines |
|---|---|
| `#ns-map-toggle-btn` (emitted) | 4588 |
| `#ns-driver-list` (emitted) | 4589 |
| `#ns-driver-map` (emitted) | 4590 |
| `capacityOpen()` | 5580–5585 |
| `eligibleDrivers()` gate ladder | 5685–5692 |
| `capacityOpen` call site | 5689 |
| `driverCandidateRowsHTML` (`data-drv`) | 5727–5750, 5741 |
| `selDriver()` | 5872–5876 |
| **`toggleNsDriverMap()`** | **5877–5886** |
| **`renderNsDriverMap()`** | **5887–5907** |
| `pickNsDriverFromMap()` | 5908–5913 |
| `driverLiveState()` | 7283 |
| `fmtKm()` | 7281 |
| `mapPos` design note | 7232–7239 |
| `retrySubDispatchWithNewDriver()` (sets `excludeDrivers`) | 5071–5077 |

---

## 20. Additional mount points (added in remediation)

> Pass 1 §7 listed these as element ids present in the source but absent from every document. In both cases the *renderer* was already documented in this file; only the DOM anchor was missing.

| Element id | Line | Kind | Renderer | What fills it |
|---|---|---|---|---|
| `#sub-track-modal` | **L4809** | `div style="padding:28px 24px;text-align:center"` — the body wrapper of the driver-response tracking modal | `renderSubTrackingWidget` (see §12) | Written as part of the single `document.getElementById('modal-content').innerHTML=` assignment beginning at L4807. Its content is branch-dependent on `resolved=!sub.pendingDriverCommit` (L4805) and `accepted=resolved&&sub.startOutcome==='confirmed'` (L4806): while unresolved it holds the pulsing disc (`animation:reqPulse 1.4s ease-in-out infinite`, L4811) and the *"Waiting for `<driver>`"* headline (L4812). The modal's own close button clears `_subTrackInterval` before `closeModal()` (L4808), so the polling timer cannot outlive this element. |
| `#sub-tracking-outcome` | **L5155** | `div style="margin-bottom:10px"` — outcome banner slot | `renderSubAcceptedTracking` (see §12) | Seeded with the `outcomeBanner` string at render time (L5155). It sits between the distance/ETA strip (L5152–L5154: `fmtKm(map.km)` plus `ETA <n> min to pickup`) and the plan/route/total summary rows (L5156–L5160). It is a **named slot with a stable id**, so the banner can be swapped without re-rendering the surrounding widget. |

**UNVERIFIED:** whether anything ever re-writes `#sub-tracking-outcome` after first paint. A grep for the literal id returns exactly one hit in the 21,857-line file (L5155), so on the evidence available the id is currently *write-once* — the stable id buys an in-place-update capability that nothing yet uses.
