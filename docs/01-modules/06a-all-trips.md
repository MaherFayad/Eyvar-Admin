# Module: All Trips

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `trips` — DOM node `<div class="page" id="p-trips">`
> **HTML lines:** L847–L858 (comment banner L847, page open L848, page close L858)
> **Primary render:** `renderTripsTable()` L3388–L3439
> **Companion doc:** `06b-quick-rides-and-ride-requests.md` (page `quickrides`, ride-request creation/tracking)

---

## 1. Purpose

A single flat ledger of **every** trip record held in `DB.trips` — both `kind:'Quick ride'` and `kind:'Subscription'` legs — with a 6-tile KPI strip, free-text search, a low-rating toggle, and a per-row link into the trip 360° profile (`buildTripProfile`, L4244–L4278).

Stated in-page: page header `<h1>All Trips</h1>`, subtitle `#trips-page-sub` default text *"All recorded trips — quick rides and subscription legs"* (L849), overwritten at render time to `<n> total trips recorded — quick rides and subscription legs` (L3419).

The page is **read-mostly**: the only mutation reachable from the table itself is navigation (`openProfile`). All trip-level write actions (tip edit, receipt, flag/unflag, ticket) live on the 360° profile — see §10 and §12.

---

## 2. Entry points & routing

| Entry | Line | Mechanism |
|---|---|---|
| Sidebar item "All trips" | L505 | `onclick="go('trips',this)"`, label `<span class="sb-lbl" data-i18n="nav.trips">All trips</span>`. No sidebar badge element for this page (unlike Quick rides, which has `#sbb-qr`). |
| `go()` page hook | L8809 | `if(id==='trips'){renderTripsTable();}` — the only automatic re-render trigger |
| Dashboard "All alerts" button | L701 | `onclick="go('trips',null)"` — inside the Alert-queue card header; navigates to All Trips (note: labelled "All alerts", not "All trips") |
| Top-bar title / subtitle | L2168 / L2169 | `titles.trips='All Trips'`; `subs.trips='1,882 trips in June'` (**hardcoded**, see §15) |
| Global search | L3266–L3272 | `resolveId()` bucket list includes `'trips'`, so typing a `TRP-*` id anywhere resolves to the trip 360° profile |
| Deep link into a trip | L8846–L8849 | `openProfile(id)` → `t==='trips'` branch → `buildTripProfile(d)` |
| Permission registry | L10579 | `trips:{label:'All Trips',icon:'🚕',legacy:'live_ops',perms:[{key:'view',label:'View trip history'}]}` |

There is **no route guard on the page itself** — `go('trips')` is not wrapped in `requirePerm`. The registry entry at L10579 exists but `renderTripsTable()` never calls `can()`/`requirePerm()`. UNVERIFIED whether any outer mechanism enforces it (no such call found).

---

## 3. Layout map

```
#p-trips                                        L848
├── .ph  → .ph-l                                L849
│     ├── <h1>All Trips</h1>
│     └── <p id="trips-page-sub">               (rewritten by renderTripsTable, L3419)
├── .g4 #trips-kpis                             L850   ← 6 KPI tiles injected (L3411–L3418)
└── .card                                       L851
      ├── .ch                                   L852
      │     ├── <h2>All trips</h2>
      │     ├── <input id="trips-search">       (oninput="renderTripsTable()")
      │     └── <button id="trips-low-btn">     (onclick="toggleLowRatingFilter()")
      └── .tbl-scroll > table.dt#trips-table    L853
            ├── <thead> 14 columns              L854
            └── <tbody id="trips-tbody">        L855  ← rows injected (L3420–L3438)
```

Note: `.g4` is a 4-column grid class but **six** tiles are injected into it (L3411–L3418), so the strip wraps to 4 + 2.

---

## 4. Data model & fields

### 4.1 `DB.trips` — the trip record

Seed literal: L2670–L2682 (7 records). Runtime-created records: `completeTrip()` L2421 (live dispatch, actual line L12421) and `buildRiderHistory()` L18754–L18760 (history reconstruction).

| Field | Type | Meaning | Source |
|---|---|---|---|
| `id` | string `'TRP-####'` | Primary key; also the object key in `DB.trips` | Seed L2671+; `'TRP-'+(++__histSeq)` L18752 (`__histSeq` starts 90000, L18667); live trips get `'TRP-'+(9100+rand(900))` at accept time L12482 |
| `kind` | `'Quick ride'` \| `'Subscription'` | Trip class. Drives badge class, KPI counters and the Quick Rides page filter | Seed; `subId?'Subscription':'Quick ride'` L12421 |
| `rider` | string `'RDR-####'` | FK → `DB.riders` | Seed / `t.rider` |
| `driver` | string `'DRV-####'` | FK → `DB.drivers` | Seed / `t.driver` |
| `sub` | string `'SUB-*'` \| `null` | FK → `DB.subscriptions`; `null` for quick rides | Seed; `t.sub\|\|base.sub\|\|null` L12417; always `null` for reconstructed L18754 |
| `date` | string, e.g. `'25 Jun 07:00'` | Display date/time. **Not a Date** — string compare used for sorting in `buildSubProfile` L4295 | Seed; `fmtReqNowLabel()` L9645 for live; `toLocaleDateString('en-GB')+' '+hh+':'+(daysAgo%6)+'0'` L18755 for reconstructed |
| `dateMs` | number (epoch ms) | Real sort key. **Only present on reconstructed records** (L18756). `tripsTable()` sorts on `dateMs\|\|0` (L3716) so natively-seeded trips all collapse to 0 |
| `route` | string `'A → B'` | Origin → destination text | Seed; `t.route` from the live-trip / request record |
| `km` | **string** | Distance in km (`'6.5'`); `'—'` on the cancelled seed | Seed; `(3+rand*10).toFixed(1)` L12419 |
| `min` | **string** | Duration in minutes; `'—'` on the cancelled seed | Seed; `max(6, round(km*2.3))` L12420 |
| `fare` | **string** | What the rider pays, 2dp SAR | Seed; `quickRideFare()+stopFee` L12422; `'0.00'` when `subId` (prepaid) |
| `driverEarn` | **string** | Driver's share, 2dp SAR | Seed; `fare × commissionRateForPlan(subPlan)` (sub) or `fare × driverCommissionRate()` (quick) L12421; `fare*0.8` hardcoded for reconstructed L18757 |
| `status` | string | See §5 | Seed; `'In trip'` at creation L12421, `'Done'` at L12423 |
| `pay` | `'PAY-*'` \| `null` | FK → `DB.payments` | Seed; `null` at live creation; `pid` for reconstructed L18758 |
| `tip` | number (SAR) | Rider tip, 100% to driver, never commissioned (stated L4196) | `simulateTip(driverRating)` L12437; editable via `commitEditTip` L4210 |
| `stops` | string[] | Extra waypoints; rendered as `a → b` or `'None — direct route'` | `t.stops\|\|[]` L12421 |
| `stopFee` | number | `stops.length × DB.multiStopConfig.extraStopFeeSAR` (default 3) | L12418 |
| `flagged` | bool | Row tinted red + 🚩 in the table; set by `flagTrip` L4228, or corporate-policy violation L12452 | |
| `corpPolicyViolation` | string[] | Reasons a quick ride broke the rider's corporate usage policy | L12453 |
| `driverRatingGiven` | number \| null | ⭐ the **rider gave the driver**; drives the low-rating filter | `simulateRatingGiven` L12434; backfilled deterministically L15332–L15341 |
| `riderRatingGiven` | number \| null | ⭐ the **driver gave the rider** | `simulateRatingGiven` L12435; backfill L15339 |
| `ratingVoided` | bool | Rating overturned on appeal — excluded from averages | L15294; counted L15674 |
| `fareBreakdown` | object | `{base,distance,time,surgeMult,surge,tolls,gross}` — only on reconstructed records. See §6.4 | L18759 |
| `payMethod` | string | e.g. `'Mada ···2210'` — **only on reconstructed records**; used by `tripsTable` L3726 and the receipt L18804 | L18760 |
| `reconstructed` | bool | Rebuilt from the billing lifetime total, not captured live. Renders a "rebuilt" amber chip L3722 and a provenance banner in the receipt L18795 | L18760 |

**Fields referenced by render code but never written anywhere** — see §17.

### 4.2 Quick ride vs. Subscription leg — the differences

| Aspect | Quick ride | Subscription leg |
|---|---|---|
| `kind` | `'Quick ride'` | `'Subscription'` |
| `sub` | `null` | `'SUB-*'` |
| Type badge class | `b-eco` in All Trips (L3426); `b-purple` in `tripsTable()` (L3719) — **inconsistent, see §17** | `b-com` (L3426) / `b-blue` (L3719) |
| Fare at creation | `quickRideFare(type,km,min) + stopFee` (L12422) | `'0.00'` — the package was prepaid (L12422) |
| Commission | flat `driverCommissionRate()` = `opsConfig.pricing.driverCommissionPct` / 100, default **80%** (L4467, L2573) | per-plan `commissionRateForPlan(plan)` = `(100 − DB.plans[key].eyvarPct)/100`, falling back to the flat rate (L4461–L4466) |
| Cash reconciliation | eligible — `maybeGenerateCashEvent` runs (L12101–L12105) | skipped: `if(base.sub)return;` (L12102) — prepaid |
| Corporate policy check | runs on completion (L12424–L12457) | not run in `completeTrip` |
| Subscription counter | n/a | `sub.trips` `done/total` incremented on completion L12459–L12464 |
| Appears on | All Trips + Quick Rides page | All Trips + subscription 360° trip log (`buildSubProfile` L4294) |

---

## 5. Statuses & transitions

### 5.1 Statuses that actually occur

| Status | Exact producing condition | Badge in All Trips (L3423) | Badge via `statusBadge()` (L3730) | Actions available |
|---|---|---|---|---|
| `'In trip'` | Set at trip-record materialisation in `completeTrip` L12421 before completion; seeded on TRP-7741 / TRP-9012 (L2671, L2675) | `b-blue` (falls through) | `b-blue` — matches `/trip\|active/i` | Live comm-log + "💬 Send message as Eyvar Support" appear on the 360° profile (L4275); trip counts as driver-busy (`driverLiveState` L7288) |
| `'Done'` | `base.status='Done'` at L12423; seeded on 4 records | `b-green` (`t.status==='Done'`) | `b-green` — matches `/done\|resolved\|closed/i` | Ratings captured, tip simulated, receipt/tip-edit meaningful |
| `'Cancelled'` | Seeded only (TRP-9003, L2681); also written by `buildRiderHistory` L18757 when `t.cancelled` | `b-red` — matches `/no-show\|cancel/i` | `b-red` — matches `/cancel\|risk\|refund/i` | On the Quick Rides page the row action becomes **Review** instead of **Open** (L3465) |
| `'Late +8'` | Seeded only (TRP-7742, L2674). The literal `+8` is minutes late | `b-blue` (no rule matches "Late") | `b-amber` — matches `/late\|expir\|pend/i` | **Inconsistency:** the same status renders blue on this page and amber in `tripsTable()` |

### 5.2 Statuses the code tests for but nothing produces

- `/no-show/i` — tested at L3404 (kind filter) and L3407 (KPI count), and again in `riderNoShowCount` L19532. **No code path writes a trip status containing "no-show"** (verified across all `status=` / `status:` assignments). The **No-shows KPI is therefore permanently 0** and its filter permanently yields an empty table. Flagged in §17.

### 5.3 `statusBadge(s)` — complete mapping (L3730–L3736)

Regex tests applied **in order**, first match wins:

| # | Test | Output class |
|---|---|---|
| 1 | `/done\|resolved\|closed/i` | `b-green` |
| 2 | `/trip\|active/i` | `b-blue` |
| 3 | `/late\|expir\|pend/i` | `b-amber` |
| 4 | `/cancel\|risk\|refund/i` | `b-red` |
| 5 | (fallback) | `b-grey` |

Label is always the raw status string. `statusBadge` is shared with payments (L3755), complaints (L3762) and subscriptions (L4310) — it is **not** trip-specific.

### 5.4 Ride-state machine (separate from `status`)

`RIDE_STATE_FLOW = ['REQUESTED','MATCHING','ACCEPTED','ARRIVING','ARRIVED','IN_PROGRESS','COMPLETED']` (L16335). Cancelled trips get `['REQUESTED','MATCHING','CANCELLED']`; non-Done trips are truncated to the first 4 states (`RIDE_STATE_FLOW.slice(0,4)`) — L16344–L16345. Seeded per trip by `rideStateSeed` (L16342–L16359) / `seedRideStates` (L16360–L16366); trip index 1 is deliberately seeded desynced (L16364). `DESYNC_THRESHOLD_MS = 20000` (L16336) — declared but never read, see §17.

---

## 6. Pricing / fare formulas

### 6.1 Table-level derived money (All Trips rows) — L3422

```
fare      = parseFloat(t.fare)       || 0
earn      = parseFloat(t.driverEarn) || 0
eyvarCut  = Math.max(0, fare − earn − (t.stopFee || 0))
```
All three printed with `.toFixed(2)`. No currency suffix in the cells (header says "Rider pays" / "Driver earns" / "Eyvar").

### 6.2 Quick-ride fare engine — `quickRideFare(typeName, km, min)` L12401–L12405

```
t     = DB.quickRideTypes.find(x => x.name === typeName) || DB.quickRideTypes[0]
base  = t ? (t.baseFare + km*t.perKm + min*t.perMin)
          : (2.50 + km*1.10 + min*0.35)          ← hardcoded fallback, identical to Economy
fare  = (base × currentSurgeMultiplier()).toFixed(2)      ← string, 2dp
```

Rate card `DB.quickRideTypes` (L13908–L13912):

| id | name | baseFare | perKm | perMin | active |
|---|---|---|---|---|---|
| `economy` | Economy | 2.50 | 1.10 | 0.35 | true |
| `comfort` | Comfort | 4.00 | 1.60 | 0.50 | true |
| `large` | Large | 6.00 | 2.10 | 0.65 | true |

Editable on Pricing Plan → Quick Rides (`saveRideTypes` L12377–L12388) — writes back to the same objects and logs `config_updated`.

### 6.3 Surge — `currentSurgeMultiplier()` L12389–L12400

```
if (!DB.surgeConfig || !DB.surgeConfig.enabled) return 1
now  = REQ_NOW_REF                          ← simulated clock, L9555 = 25 Jun 2026 09:14
hour = now.getHours(); day = WEEKDAYS[now.getDay()]
mult = 1
for each s in DB.surgeSchedule where s.enabled and s.days includes day:
    if (hour >= s.startHour && hour < s.endHour) mult = max(mult, s.multiplier)
return min(mult, DB.surgeConfig.capMultiplier || 2.5)
```

`DB.surgeConfig = {enabled:true, capMultiplier:2.5}` (L13861). `DB.surgeSchedule` (L13883–L13887):

| id | label | startHour | endHour | days | multiplier | enabled |
|---|---|---|---|---|---|---|
| `surge_1` | Morning rush | 7 | 9 | Sun–Thu | 1.3 | true |
| `surge_2` | Evening rush | 17 | 20 | Sun–Thu | 1.5 | true |
| `surge_3` | Weekend evening | 20 | 23 | Thu, Fri | 1.2 | **false** |

Cap clamped to 1–5 on save (`Math.min(5,Math.max(1,…))` L12337).

### 6.4 Receipt breakdown — `buildFareBreakdown(km,min,surge,seed)` L18656–L18666

**Independent, hardcoded rate card** (not `DB.quickRideTypes`):

```
base      = 4.00
perKm     = 1.35
perMin    = 0.42
distance  = round(km  × 1.35 × 100)/100
time      = round(min × 0.42 × 100)/100
subtotal  = 4.00 + distance + time
surgeAmt  = surge > 1 ? round(subtotal × (surge−1) × 100)/100 : 0
tolls     = seededRand(seed+7) > 0.9 ? 5.00 : 0        ← seededRand = frac(sin(seed)*10000), L18655
gross     = subtotal + surgeAmt + tolls
```
`openTripReceipt` (L18783–L18787) calls it with `surge=1, seed=1` when a trip has no stored `fareBreakdown`, then **overwrites `fb.gross` with `parseFloat(t.fare)`** — so line items and total can disagree for natively-captured trips. The amber "Reconstructed record" banner (L18795) is shown only when `reconstructed:true`.

### 6.5 Commission

```
driverCommissionRate() = (DB.opsConfig.pricing.driverCommissionPct ?? 80) / 100          L4467
commissionRateForPlan(planLabel):                                                        L4461
    key  = planKeyFromLabel(label)      // 'weekly' | 'biweekly' | 'monthly' | null      L4450
    plan = DB.plans[key]
    return plan && plan.eyvarPct != null ? (100 − plan.eyvarPct)/100
                                         : driverCommissionRate()
driverEarn = fare × rate                                                                 L12421
Eyvar commission (receipt) = parseFloat(t.fare) − parseFloat(t.driverEarn)               L18811
Eyvar cut (table)          = max(0, fare − driverEarn − stopFee)                         L3422
```
The two Eyvar figures differ: the receipt does **not** subtract `stopFee`.

### 6.6 Extra stops

```
stopFee = stops.length × (DB.multiStopConfig.extraStopFeeSAR || 3)     L12418
DB.multiStopConfig = {extraStopFeeSAR:3}                               L13862
```

### 6.7 Tips

```
simulateTip(driverRating):                                             L12044–L12048
    chance = rating>=4.5 ? 0.45 : rating>=4 ? 0.25 : rating>=3 ? 0.1 : 0.02
    if (random() > chance) return 0
    return round((2 + random()*8) * 2) / 2        // 2–10 SAR, nearest 0.5
```
Tips are never commissioned (comment L12042; UI text L4196).

### 6.8 Ratings math

```
simulateRatingGiven(entity):                                           L12034–L12040
    center = entity.rating > 0 ? entity.rating : 4.6
    r = center + (random()−0.5) × 1.1
    if (random() < 0.04) r = 1 + random()*2          // deliberate bad trip
    r = clamp(1, 5, round(r*2)/2)                    // whole/half stars

applyRatingUpdate(entity,newRating):                                   L12049–L12056
    newAvg = count>0 ? ((avg*count)+newRating)/(count+1) : newRating
    entity.rating = round(newAvg*10)/10 ; entity.ratingCount = count+1

backfillTripRatings() (seeded trips only):                             L15332–L15341
    if not /done/i.test(status): driverRatingGiven = riderRatingGiven = null
    h   = fold over id chars: h = (h*31 + charCode) % 97
    low = (index % 7 === 2)
    driverRatingGiven = low ? 1 + (h%3)*0.5 : 4 + (h%3)*0.5   (clamped ≤ 5)
    riderRatingGiven  = 4.5 + (h%2 ? 0.5 : 0)
```

---

## 7. KPIs & metrics — `#trips-kpis`, 6 tiles (L3411–L3418)

Tile array order is `[label, value, sublabel, filterKey]`. Value colour turns `var(--red)` when `> 0` for No-shows / Flagged / Low ratings / State desync (L3418); otherwise `var(--ink)`.

| # | Label | Value formula | Sub-label | Click | Threshold / colour |
|---|---|---|---|---|---|
| 1 | Total trips | `Object.keys(DB.trips).length` | `doneCount + ' completed'`, `doneCount = trips.filter(t=>t.status==='Done').length` (L3409) | `setTripsKindFilter(null)` → clears the kind filter | always ink |
| 2 | Quick rides | `trips.filter(t=>t.kind==='Quick ride').length` | `'vs ' + trips.filter(kind==='Subscription').length + ' subscription legs'` | `setTripsKindFilter('quick')` | always ink |
| 3 | No-shows | `noShows = trips.filter(t=>/no-show/i.test(t.status)).length` (L3407) | `total ? round(noShows/total*100)+'% rate' : '—'` | `setTripsKindFilter('noshow')` | red if > 0 — **always 0**, see §5.2 |
| 4 | Flagged for review | `disputed = trips.filter(t=>t.flagged).length` (L3408) | `disputed ? 'needs attention' : 'all clear'` | `setTripsKindFilter('flagged')` | red if > 0 |
| 5 | ⚠ Low ratings | `lowRatedTripIds().length` (L15342) | `'at or below ' + lowRatingThreshold() + '★'` | `toggleLowRatingFilter()` | red if > 0 |
| 6 | ⚠ State desync | `desyncedTripIds().length` (L16381) | `'rider app never acked a transition'` (static) | `setTripsKindFilter('desync')` | red if > 0 |

Supporting definitions:

```
lowRatingThreshold() = DB.opsConfig.notifications.lowRatingThreshold || 2.5      L15243; default 2.5 at L2571
isLowRating(r)       = typeof r === 'number' && r > 0 && r <= threshold          L15247
lowRatedTripIds()    = keys(DB.trips).filter(id => isLowRating(driverRatingGiven))  L15342
desyncedTripIds()    = keys(DB.rideStateLogs).filter(id => detectDesync(id).desynced) L16381
detectDesync(id)     = stuck = log.filter(e => !e.riderAcked)                    L16368–L16380
                       serverState = last.to ; riderState = last acked .to || 'REQUESTED'
                       lagMs = last.tsMs − firstStuck.tsMs
```

Active-tile styling: `kf(key)` (L3410) appends class `on` to the tile whose key equals `window.__tripsKindFilter`.

The KPI strip has **no progress bar** (`.kpi-bar`) — unlike the Quick Rides tiles.

---

## 8. Data displayed (Element | DB path | Type | Notes)

### 8.1 Page chrome

| Element | Source | Type | Notes |
|---|---|---|---|
| `#trips-page-sub` | computed `Object.keys(DB.trips).length` L3419 | text | Overwrites the L849 literal on every render |
| Top-bar title | `titles.trips` L2168 | hardcoded | `'All Trips'` |
| Top-bar subtitle | `subs.trips` L2169 | **hardcoded** | `'1,882 trips in June'` — never recomputed |
| Sidebar label | i18n `nav.trips` | static/i18n | Arabic `'كل الرحلات'` L7906 |

### 8.2 Table row cells — `renderTripsTable` L3420–L3438

| # | Column header (L854) | Value expression | Type | Style / notes |
|---|---|---|---|---|
| 1 | Trip ID | `id` + `(t.flagged ? ' 🚩' : '')` | string | monospace 11px, `var(--purple)`, `onclick="openProfile(id)"` |
| 2 | Date | `t.date \|\| '—'` | string | raw, unformatted |
| 3 | Rider | `nm2(t.rider)` (L3565: `DB.riders[id]\|\|DB.drivers[id]` → `.name`, else the id) | string | blue, `onclick="openProfile(t.rider)"` |
| 4 | Driver | `nm2(t.driver)` | string | blue, `onclick="openProfile(t.driver)"` |
| 5 | Type | `t.kind \|\| '—'` in `<span class="b b-com/b-eco">` | badge | `b-com` when `kind==='Subscription'`, else `b-eco` |
| 6 | km | `t.km \|\| '—'` | string | |
| 7 | min | `t.min \|\| '—'` | string | |
| 8 | Rider pays | `fare.toFixed(2)` | number | green, weight 500 |
| 9 | Driver earns | `earn.toFixed(2)` | number | blue, weight 500 |
| 10 | Eyvar | `eyvarCut.toFixed(2)` | computed | plain |
| 11 | Tip | `t.tip>0 ? '+'+t.tip.toFixed(2) : '—'` | number | green |
| 12 | ⭐ Rating | `ratingCell(t.driverRatingGiven)` L15250 | HTML | `—` in ghost when not `>0`; otherwise `★ n.n`; when `isLowRating` → red, weight 600, prefixed `⚠ `, tooltip *"Below the N★ alert threshold"*, else tooltip *"Rating given by the rider"* |
| 13 | Status | `t.status` in `<span class="b b-red/b-green/b-blue">` | badge | class per L3423 (see §5.1) — **not** `statusBadge()` |
| 14 | (blank) | `<div class="ra"><button class="btn sm" onclick="openProfile(id)">Open</button></div>` | action | |

Row-level: `<tr style="background:var(--red-lt)">` when `t.flagged` (L3424).

---

## 9. Input fields / filters

| id | Type | Label / placeholder | Default | Options | Drives |
|---|---|---|---|---|---|
| `trips-search` | `<input type="text">` L852 | placeholder `"Search rider, driver, or trip ID…"` | empty | free text | `oninput="renderTripsTable()"`. Lower-cased, matched with `indexOf>=0` against **trip id**, `nm2(rider)` and `nm2(driver)` (L3392–L3396). Does **not** search route, status or fare. Inline width 220px, height 29px |
| `trips-low-btn` | `<button class="btn sm">` L852 | `"⚠ Low ratings only"` | off | toggle | `toggleLowRatingFilter()` L15345: flips `window.__tripsLowOnly`, restyles the button (`--red-lt` bg, `#F09595` border, `--red` text when on) and re-renders. Filter: `ids.filter(id => isLowRating(driverRatingGiven))` L3397 |
| — (KPI tiles) | clickable `.kpi.click` | see §7 | `window.__tripsKindFilter = undefined` | `null` \| `'quick'` \| `'noshow'` \| `'flagged'` \| `'desync'` | `setTripsKindFilter(key)` L15355: `window.__tripsKindFilter = (current===key) ? null : key` — **toggles off when the active tile is clicked again** — then re-renders |

Kind-filter predicates (L3403–L3406):

| key | Predicate |
|---|---|
| `quick` | `DB.trips[id].kind === 'Quick ride'` |
| `noshow` | `/no-show/i.test(DB.trips[id].status)` |
| `flagged` | `!!DB.trips[id].flagged` |
| `desync` | `desyncedTripIds().indexOf(id) >= 0` |

The two filter families (`__tripsLowOnly`, `__tripsKindFilter`) and the search are **combined with AND** and applied in this order: search → low-rating → kind (L3392–L3406). Both filter flags are global `window.*` and **persist across navigation** — leaving and returning to the page keeps them applied, while the button styling is re-applied only by `toggleLowRatingFilter`.

---

## 10. Actions

| Label | Handler | Where | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| Trip ID cell / **Open** | `openProfile(id)` L3425, L3437 | table | Navigates to `#p-profile`, renders `buildTripProfile` | — | none | none | no |
| Rider cell | `openProfile(t.rider)` L3427 | table | Rider 360° | — | none | none | no |
| Driver cell | `openProfile(t.driver)` L3428 | table | Driver 360° | — | none | none | no |
| ⚠ Low ratings only | `toggleLowRatingFilter()` L15345 | card header | Client-side filter + button restyle | `window.__tripsLowOnly` | none | none | no |
| (KPI tile) | `setTripsKindFilter(key)` L15355 | KPI strip | Client-side filter | `window.__tripsKindFilter` | none | none | no |
| **edit** (tip) | `openEditTipModal(id)` L4192 → `commitEditTip(id)` L4204 | 360° Financials card | Sets `t.tip = parseFloat(#edit-tip-amount)\|\|0`, closes modal, re-opens the profile, toast `✅ Tip updated to N SAR` | `DB.trips[id].tip` | **`process_payouts`** via `requirePerm` L4205 | `logAction('trip_tip_edited','trip',id,'Tip on X updated: a → b SAR',{tip:before},{tip:newTip})` L4211 | no (modal is the gate) |
| **Send receipt** | `sendTripReceipt(id)` L4216 | 360° action bar | `sendSystemEmail(t.rider,'Your Eyvar receipt — ID', body,'transactional')` — body lists route, km, min, fare, tip (if >0), extra stops (if >0). Toast `✅ Receipt sent to <rider>` | `DB.emailOutbox` (unshift, L3581) | **`contact_users`** L4217 | `logAction('receipt_sent','trip',id,…)` L4221 | no |
| **🎧 Open ticket** | `openSupportTicket(id, t.rider, nm2(t.rider))` L2542 → `createTicketFor(entityId,entityName)` L2552 | 360° action bar | Creates `TKT-<505+len>` with reason code, subject (pre-filled `Issue with trip <id>`), `priority=rcPriority(code)`, `category=rcCategory(code)`, `status:'Open'`, `agent:'Sarah Al-Rashid'` (**hardcoded**), thread seeded with the subject; then `slaStampNewTicket(id,code,'phone_in')` and `runAutoReply(id)`; toast `✅ Ticket TKT-### created for …` | `DB.tickets` (unshift) | **none** — `createTicketFor` has no `requirePerm` | **none** (no `logAction`) | no |
| **Flag trip** | `flagTrip(id)` L4224 | 360° action bar | `t.flagged = true`, reopens profile, re-renders Quick Rides table, toast `🚩 … flagged for review` | `DB.trips[id].flagged` | **`live_ops`** L4225 | `logAction('trip_flagged','trip',id,…,{},{flagged:true})` L4229 | no |
| **✓ Unflag trip** | `unflagTrip(id)` L4234 | 360° action bar (replaces Flag when `d.flagged`) | `t.flagged = false`, reopens profile, re-renders Quick Rides, toast `✅ … unflagged` | same | **`live_ops`** L4235 | `logAction('trip_unflagged',…,{},{flagged:false})` L4239 | no |
| **🗺 View route** | `go('live',null)` L4276 | 360° action bar | Navigates to the Live Map page — **does not target this trip** | — | none | none | no |
| **💬 Send message as Eyvar Support** | `openSendChatModal(id)` L11732 → `commitSendChatMsg(id)` L11742 | 360° comm-log card, only when `status==='In trip'` | Pushes `{type:'chat', who:'Eyvar Support', time:'Just now', note:'"msg"'}` into `DB.commLogs[id]`; empty message → toast `⚠ Write a message first`; reopens profile; toast `✅ Message sent — visible to both rider and driver` | `DB.commLogs[tripId]` | **`live_ops`** L11743 | `logAction('ops_chat_sent','trip',id,…)` L11748 | no |
| **🧾 Invoice** | `openInvoiceModal(d.pay)` L4262 → L4429 | 360° Financials, only when `d.pay` | Builds/loads `DB.invoices[paymentId]` via `getOrCreateInvoice` (L4392); VAT-inclusive split | `DB.invoices`, `DB.invoiceSequence` | none | none | no |
| **Open coded ticket** (low rating) | `openLowRatingTicket(id)` L15303 → `createTicketFor(t.driver, drv.name)` | 360° ratings banner | Ticket against the **driver**, reason code pre-set `CAP_CONDUCT`, subject `Low rating (N.N★) on TRP-…` | `DB.tickets` | none | none | no |
| **Captain record →** | `openProfile(d.driver)` L15290 | 360° ratings banner | Driver 360° | — | none | none | no |
| **⚖️ Captain disputes this rating** | `openRatingDispute(id)` L15522 → `commitRatingDispute` L15535 | 360° ratings banner | `fcNew('Rating dispute', t.driver, t.rider, detail, 'DRV_RATING_DISPUTE')`, stamps `c.tripId` and `c.disputedRating`, navigates `go('fairness')`, toast `⚖️ Dispute … opened — rating stays live until decided` | fairness case store (`fcNew`) | none | via `fcNew` (UNVERIFIED) | no |
| **Captain reports the rider** | `openReportRider(id)` L15543 → `commitReportRider` L15558 | 360° ratings card footer | `fcNew('Rider report', t.driver, t.rider, detail, code)` with code ∈ `DRV_RIDER_NOSHOW` / `DRV_RIDER_CONDUCT` / `DRV_VEHICLE_DAMAGE`; `go('fairness')`; toast `⚖️ Report … filed against <rider>` | fairness case store | none | via `fcNew` | no |
| **Force resync to rider** | `forceResync(id)` L16430 | 360° ride-state banner (desync only) | Marks every log entry `riderAcked=true`, appends a synthetic `transport:'reconcile'` entry, reopens profile, toast explaining it is mitigation not a fix | `DB.rideStateLogs[id]` | **`live_ops`** L16431 | `logAction('ride_state_resync','trip',id,…)` L16439 | **yes** — `guardAction('forceResync')` L18036 (`installActionGates`) |
| **Log coded ticket** (desync) | `openDesyncTicket(id)` L16443 → `createTicketFor(t.rider, rdr.name)` | 360° ride-state banner | Ticket against the **rider** account, reason code `TECH_STATE_DESYNC`, subject `Ride state desync on … — rider stuck on …` | `DB.tickets` | none | none | no |
| **Captain record / Open trip 360 / Close** | receipt modal footer L18815–L18818 | receipt modal | navigation only | — | none | none | no |

`requirePerm(key)` (L3126): if `can(key)` fails it logs `permission_denied` and toasts `🔒 Your role lacks permission: <label>`, returning false.

---

## 11. Tables & lists

### 11.1 `#trips-table` — the page table

- **Row source:** `Object.keys(DB.trips).reverse()` (L3391) — insertion order reversed, **not** date-sorted.
- **Columns (ordered, 14):** Trip ID · Date · Rider · Driver · Type · km · min · Rider pays · Driver earns · Eyvar · Tip · ⭐ Rating · Status · (actions)
- **Search:** `#trips-search` — id / rider name / driver name (§9)
- **Filters:** low-rating toggle + kind filter (§9)
- **Sorts:** none user-controllable; fixed reverse-insertion order
- **Row click:** individual **cells** are clickable (id → trip, rider → rider, driver → driver); the `<tr>` itself has no handler
- **Row actions:** one — `Open` → `openProfile(id)`
- **Empty state** (L3438), `colspan=14`, ghost 11.5px, priority order:
  1. `__tripsLowOnly` → *"No low-rated trips — nothing at or below N★."*
  2. search text present → *"No trips match that search."*
  3. otherwise → *"No trips recorded yet."*
  (A kind filter that yields nothing falls through to one of these three — there is no filter-specific message.)
- **Pagination:** none. Scroll only, via `.tbl-scroll`.

### 11.2 `tripsTable(ids, ctxId)` — reusable trip list L3698–L3729

Used by `buildEntityProfile` for the rider/driver 360° trip history (L4186). Not used on the All Trips page.

- Header note line: `<n> trips · click any row for the itemised receipt`, plus `· <n> reconstructed from the billing total` when any `reconstructed` (L3710–L3714)
- Prepends `windowNoteHTML(ctxId)` (L20458) — the "showing last N months / N older trips held in billing" strip with a **Fetch full history from billing** button
- **Columns (9):** Trip ID · Type · Date · Route · Dist · time · Fare · Method · ⭐ · Status
- **Sort:** `dateMs` descending (L3716) — natively-seeded trips lack `dateMs`, so they sort as 0
- **Row click:** `openTripReceipt(tp.id)` (whole `<tr>`, `title="Itemised receipt"`)
- **Type badge:** `b-purple` for Quick ride, `b-blue` otherwise (L3719) — differs from the All Trips page mapping
- **Status:** `statusBadge()` (§5.3) — differs from the All Trips inline mapping
- **Empty state:** *"No trips in this panel's records."*; when `reconcileEntity(ctxId)` reports the Trips row as `severity==='orphan'`, it is replaced with a red warning naming the billing aggregate and the instruction *"Do not tell the customer they have no trips."* (L3701–L3708)
- **Max height:** 430px scroll (L3715)

### 11.3 Subscription 360° trip log (context)

`buildSubProfile` L4304–L4312: matched by **rider identity + `kind==='Subscription'`**, deliberately not by the `t.sub` tag (comment L4291–L4293 explains that some trip records carry a `sub` id belonging to a different rider). Columns: Date · Route · Distance · Duration · Rider pays · Driver earns · Status.

---

## 12. Detail / profile view sections — `buildTripProfile(d)` L4244–L4278

Rendered into `#prof-body` by `openProfile` when `resolveId` resolves to bucket `trips` (L8846–L8849). Header (L8847–L8848): `nm.innerHTML = (kind==='Quick ride' ? '⚡ ' : '📋 ') + 'Trip ' + d.id`; meta = `kind · date · status`.

Two-column `.g2` grid. **Left column:**

**A. `kvCard('Trip details')` — 8 rows (L4254–L4258)**

| Field | Value |
|---|---|
| Trip ID | `d.id` |
| Type | badge, `b-purple` if Quick ride else `b-blue` (`kc`, L4245) |
| Date / time | `d.date` |
| Route | `d.route` |
| Stops | `d.stops.join(' → ')` or `'None — direct route'` |
| Distance | `d.km + ' km'` |
| Duration | `d.min + ' min'` |
| Status | `statusBadge(d.status)` |

**B. `kvCard('Financials')` — 5 rows (L4259–L4265)**

| Field | Value |
|---|---|
| Fare | `d.fare + ' SAR'`, green |
| Driver earns | `d.driverEarn + ' SAR'`, blue |
| Extra-stop fees | `d.stopFee>0 ? '+'+stopFee.toFixed(2)+' SAR' : '—'` |
| 💰 Tip | `(d.tip\|\|0).toFixed(2)+' SAR'` + inline blue **edit** link → `openEditTipModal(d.id)` |
| Payment | `rowLink(d.pay)` + **🧾 Invoice** button → `openInvoiceModal(d.pay)`, or `'—'` |

**Right column:**

**C. `kvCard('Linked entities')` — 3 rows (L4267–L4271)**
Rider (`rowLink(d.rider, nm2(d.rider)) · d.rider`) · Driver (same shape) · Subscription (`rowLink(d.sub)` or `'— (quick ride)'`).

**D. Card "🔍 Arrival evidence — did the captain reach the rider?"** (L4272–L4273) → `arrivalEvidenceHTML(d.id)` L17706.
Contents when a trace exists (`DB.arrivalTraces[id]`, L17611; seeded for every trip by `seedArrivalTraces` L18093–L18101):
  - **Verdict box** — one of `VERDICT_LABEL` (L17701–L17705): `✅ Captain performed` (green) · `⛔ Captain did not arrive` (red) · `⚠ Both present, never met` (amber-dk) · `❓ Inconclusive — do not decide on this alone` (amber-dk); plus `· confidence N%` and a prose note.
  - **Three questions** (L17660–L17667), each YES/NO/N/A/LIKELY/UNKNOWN + detail:
    1. *Was the captain at the pickup point?* — `yes` iff `closestPing ≤ arrivalRadiusM` (120 m)
    2. *Did the captain wait long enough?* — `yes` iff `dwellMin ≥ minDwellMin` (5); `no` if on-site but short; `n/a` if never on site
    3. *Did the captain and rider actually meet?* — `unknown` when the rider device reported nothing; else `likely` iff both `closest ≤ meetRadiusM` (40 m) and `riderClosest ≤ 40 m`
  - **Position trail** — one bar row per captain ping (`HH:MM`, bar width `max(3, min(100, 100 − distanceM/25))%`, green when `≤120 m`), then rider-device rows, or the amber line *"⚠ No rider position reported — one side of this story has no data."*
  - **App events** — `[+minutes, actor, text]`, actor badge `b-blue` driver / `b-purple` rider / `b-grey` system
  - Empty state: *"No arrival trace recorded for this trip. Telemetry is captured from the moment a captain accepts — an older trip may predate it."*
  - Verdict/confidence rules (L17669–L17698): performed + no rider data → 80 · both present, no contact → 60 · performed corroborated → 92 · outside radius but within `2 × arrivalRadiusM` → **inconclusive 45** (explicit GPS-error guard) · rider at pin & captain never → absent 90 · no reading at all → absent 75 · fallback inconclusive 40
  - `DB.arrivalConfig` (L17605–L17610): `arrivalRadiusM:120`, `meetRadiusM:40`, `minDwellMin:5`, `riderGraceMin:10` (**`riderGraceMin` is never read** — §17)
  - `dwellMin = round((lastOnSite.tsMs − firstOnSite.tsMs)/60000)` when more than one on-site ping, else 0 (L17649)

**E. Card "🔄 Ride state timeline"** → `rideStateTimelineHTML(d)` L16385. Returns `''` when `DB.rideStateLogs[d.id]` is absent.
  - One row per transition: `v<n>` · `from → to` · `by <actor> · via <transport> · <latencyMs> ms` · `driver ✓ acked` · `rider ✓ acked` / `rider ✗ never acked` (red, weight 600) · `<age> ago`. Row background `--red-lt` when the rider never acked.
  - Footer banner: red desync banner naming server state, rider state and lag, with **Force resync to rider** and **Log coded ticket**; or the green *"✓ Both clients acknowledged every transition — no desync on this ride."*
  - Closing note: *"Server state is authoritative; the ack columns show what each client actually confirmed…"*
  - Header chip `<span class="b b-red">Desync</span>` when desynced.

**F. Card "⭐ Ratings"** → `tripRatingsCardHTML(d)` L15261.
  - Empty state when neither rating `>0`: *"No ratings submitted for this trip yet. Scores are captured at completion — a trip that is still running, cancelled, or a no-show never collects one."*
  - Rows: **Rider → Captain** (`<rider> rated <driver>`) · **Captain → Rider** (`<driver> rated <rider>`) · **Tip left by rider** (`+N.NN SAR` green, or `—`)
  - `✓ Overturned on appeal…` green strip when `d.ratingVoided`
  - Low-rating banner when `isLowRating(driverRatingGiven)`: `⚠ Low rating — N.N★ · at or below the N★ alert threshold`, prose *"A score on its own is not a reason…"*, and 3 buttons (Open coded ticket / Captain record → / ⚖️ Captain disputes this rating)
  - Footer row: *"Ratings run both ways — so should reports."* + **Captain reports the rider**
  - Header chip `<span class="b b-red">Low</span>` when low

**G. Card "☎️ Communication log"** (L4275)
  - Source `DB.commLogs[d.id]` (seed L2757+). Per entry: icon `📞` when `type==='call'`, `🛟` when `who==='Eyvar Support'`, else `💬`; `who` (+ ` · dur` when present); `note`; right-aligned `time`. Ops entries get a `--blue-lt` background and blue-dk name.
  - Header chip `<span class="b b-green">🟢 Live</span>` only when `d.status==='In trip'`
  - Footer button **💬 Send message as Eyvar Support** only when `d.status==='In trip'`
  - Empty state: *"No calls or messages logged for this trip."*

**H. Action bar card** (L4276–L4277)
  - **🗺 View route** (`go('live',null)`) · **Send receipt** · **🎧 Open ticket** · **Flag trip** (danger) or **✓ Unflag trip** (success)
  - When `d.flagged`: a `🚩 Flagged for review` red badge, plus `d.corpPolicyViolation.join(' · ')` when present

---

## 13. Modals opened

### 13.1 Edit tip — `openEditTipModal(tripId)` L4192

| Element | Type | Detail |
|---|---|---|
| Title | — | `💰 Edit tip — <tripId>` |
| Note | text | `Goes 100% to <driver name> — never split with platform commission.` |
| `edit-tip-amount` | `<input type="number">` | label *Tip amount (SAR)*, `min="0"`, `step="0.5"`, value `t.tip \|\| 0` |
| Footer | buttons | **Cancel** (`closeModal()`) · **Save tip** (`commitEditTip(tripId)`) |

Commit path L4204–L4215: `requirePerm('process_payouts')` → `newTip = parseFloat(val('edit-tip-amount'))||0` → assign → `logAction` with before/after → `closeModal()` → `openProfile(tripId)` → toast. **No validation beyond the numeric coercion** (the HTML `min` is not enforced by `parseFloat`).

### 13.2 Support ticket — `openSupportTicket(tripId, entityId, entityName)` L2542

| Element | Type | Detail |
|---|---|---|
| Title | — | `Open support ticket — <entityName>` |
| `csel-nt-reason2` | custom select | label *Reason code* + red `*`; options from `reasonSelectHTML(id,'')` (reason-code registry L14671+) |
| `nt-sub` | `<input type="text">` | label *Subject / description*, placeholder `Brief description`, pre-filled `Issue with trip <tripId>` when a trip id was passed |
| Footer | buttons | **Cancel** · **Create ticket** → `createTicketFor(entityId, entityName)` |

`createTicketFor` L2552–L2560 writes `DB.tickets.unshift({id:'TKT-'+(505+len), entity, entityName, subject, category:rcCategory(gvRC()), priority:rcPriority(gvRC()), status:'Open', created:'Just now', agent:'Sarah Al-Rashid', thread:[{from:entityName, role:'rider', time:'Now', msg}]})`, then `slaStampNewTicket(newId, gvRC(), 'phone_in')` and `runAutoReply(newId)`.

### 13.3 Trip receipt — `openTripReceipt(tripId)` L18779 (opened from `tripsTable` rows)

Header line: `route`; sub-line `date · km km · min min · kind · captain <name>`. Amber provenance banner when `reconstructed`. Line items (L18797–L18801): **Base fare** · **Distance · N km** · **Time · N min** · **Surge ×N.N** (only when `fb.surge>0`) · **Tolls** (only when `>0`) → bold **Rider paid** = `parseFloat(t.fare)`; then `Paid with <payMethod> · <payId>`. Grey box: **Captain earnings**, **Eyvar commission** (`fare − driverEarn`), **Rating given** (`★ N.N` or `voided`). Footer: **Captain record** / **Open trip 360** / **Close**.

### 13.4 Low-rating ticket — `openLowRatingTicket(tripId)` L15303
Context box (`<rider> rated <driver> N.N★`, route · date · km · fare), `csel-lr-reason` pre-set to `CAP_CONDUCT`, `nt-sub` pre-filled `Low rating (N.N★) on <tripId>`, footer **Cancel** / **Create ticket** → `createTicketFor(t.driver, driverName)`.

### 13.5 Desync ticket — `openDesyncTicket(tripId)` L16443
Context box (`Server: <state> · rider client: <state>`, route · captain · rider), `csel-ds-reason` pre-set `TECH_STATE_DESYNC`, `nt-sub` pre-filled `Ride state desync on <id> — rider stuck on <riderState>`, → `createTicketFor(t.rider, riderName)`.

### 13.6 Rating dispute — `openRatingDispute(tripId)` L15522
Context prose + `fc-detail` `<textarea rows="3">` (*Captain's reason*, placeholder "What the captain says happened"), footer **Cancel** / **Open dispute**.

### 13.7 Captain reports rider — `openReportRider(tripId)` L15543
`csel-fc-kind` custom select, default `DRV_RIDER_NOSHOW`, options: *Rider no-show at pickup* / *Rider behaviour / conduct* / *Vehicle damage or cleaning needed*; `fc-detail` textarea; footer **Cancel** / **Submit report**.

### 13.8 Ops chat — `openSendChatModal(tripId)` L11732
Note text, `ops-chat-msg` `<textarea rows="3">` with placeholder *"e.g. We're monitoring this trip, let us know if you need anything."*, footer **Cancel** / **Send**.

### 13.9 Tax invoice — `openInvoiceModal(paymentId)` L4429
Seller block (`DB.vatConfig.companyLegalName / companyAddress / registrationNumber`), invoice number + issue date, **Billed to**, **Description**, **Subtotal (excl. VAT)**, **VAT (N%)**, **Total**, a simplified QR-data table, and an explicit disclaimer that a real scannable ZATCA QR needs a certificate and signing server. Footer: **Close** / **⬇ Download PDF** (fires a toast only — §15). Invoice math (`getOrCreateInvoice` L4392–L4409): `subtotal = round(totalIncl/(1+vatRate)*100)/100`, `vatAmount = round((totalIncl − subtotal)*100)/100`, number `EYV-<year>-<6-digit sequence>`.

---

## 14. Cross-module links

| From | To | Line |
|---|---|---|
| Trip row (id / Open) | 360° Profile page (`p-profile`) | L3425, L3437 |
| Trip row (rider / driver) | Rider or Driver 360° | L3427–L3428 |
| Trip 360° → View route | Live Map page (`go('live')`) | L4276 |
| Trip 360° → Payment link / Invoice | Payment 360° (`buildPayProfile` L4364) and the invoice modal | L4262 |
| Trip 360° → Subscription | Subscription 360° (`buildSubProfile` L4279) | L4270 |
| Trip 360° → Open ticket / low-rating ticket / desync ticket | `DB.tickets` → Support Center page | L2552 |
| Trip 360° ratings → dispute / report | **Captain fairness** page (`go('fairness')`) | L15540, L15564 |
| Rider & Driver 360° → `tripsTable()` | back into trips + receipts | L4186 |
| Subscription 360° → trip log | `DB.trips` filtered by rider + kind | L4294 |
| Quick Rides page | shares `DB.trips` (kind filter) | L3443 |
| Dashboard "All alerts" | `go('trips')` | L701 |
| Export | `exportRows('trips')` — head `['ID','Kind','Date','Rider','Driver','Route','KM','Min','Fare','Status']`, every trip (L9180–L9182). **No Export button exists on the All Trips page** — this branch is the `exportRows` default, reachable only via other pages' `exportData(btn,page)` calls | L9180 |
| Daily snapshot | `captureDailySnapshot` counts quick trips & cancel rate from `DB.trips` | L21252–L21255 |
| Live Ops / Dashboard | `completeTrip` re-renders `renderLiveOps`, `renderDashboard`, `renderSubscriptionsTable` | L12470–L12473 |

---

## 15. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `subs.trips = '1,882 trips in June'` | L2169 | Top-bar subtitle — **never recomputed**; contradicts the 7-record seed |
| 7 seed trip records | L2670–L2682 | All dated 25 Jun; TRP-7735's rider was deliberately corrected with a 5-line comment explaining the data conflict (L2673–L2677) |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | L9555 | Frozen simulated clock (advanced 1 sim-minute per tick, L9680) — every "now" derives from it |
| `agent:'Sarah Al-Rashid'` on new tickets | L2557 | Hardcoded assignee |
| Fallback fare `2.50 + km*1.10 + min*0.35` | L12403 | Duplicate of the Economy rate card |
| Receipt rate card `base 4.00 / perKm 1.35 / perMin 0.42` | L18657 | Second, divergent rate card |
| Toll rule `seededRand(seed+7) > 0.9 → 5.00` | L18662 | Synthetic |
| Reconstructed `driverEarn = fare*0.8` | L18757 | Hardcoded 80%, ignores `driverCommissionRate()` |
| `__histSeq = 90000`, `PAY-<seq+40000>` | L18667, L18752 | Synthetic id ranges |
| `RY_PLACES` (20 districts), `PAY_METHODS` (6) | L18650–L18653 | Reconstruction fixtures |
| `simulateRatingGiven` / `simulateTip` randomness | L12034, L12044 | Explicitly labelled simulation in comments |
| `backfillTripRatings` deterministic hash; "low" whenever `index%7===2` | L15332–L15340 | Comment states two deliberately-low trips exist so the low-rating path is visible on first open |
| `seedRideStates(… i===1)` — trip index 1 always desynced | L16364 | Reproduces the reported bug |
| `seedArrivalTraces` — SUB-1075 `arrived_rider_absent`, SUB-1052b `ambiguous`, trip index 1 `never_arrived`, index 3 `ambiguous`, rest `clean` | L18094–L18100 | Synthetic telemetry; comment states real deployments feed this from app telemetry |
| Arrival ping/event tables | L17618–L17636 | Fully hardcoded coordinate/event scripts |
| Invoice **⬇ Download PDF** button | L4446 | Only fires an explanatory toast; downloads nothing |
| ZATCA QR | L4411+ | Explicitly a readable stand-in, not a scannable code (comment L4411–L4417) |
| `DESYNC_THRESHOLD_MS = 20000` | L16336 | Declared, never referenced |

---

## 16. i18n keys

The file translates **only the shell** — sidebar nav + section labels (explicit comment L7897–L7902: *"Deep page content — tables, forms, every dynamically-built string — stays English-only"*).

| Key | English | Arabic | Line |
|---|---|---|---|
| `nav.trips` | All trips | كل الرحلات | L505 / L7906 |
| `sec.operations` | Operations | العمليات | L501 / L7911 |

No `data-i18n` attribute exists anywhere inside `#p-trips` (L848–L858) — the page heading, subtitle, all 14 column headers, all 6 KPI labels, every badge, every empty state, every toast and every modal in this module are **English-only literals**.

---

## 17. Gaps, dead code, UNVERIFIED items

1. **No-shows KPI and filter are dead.** Nothing in the file writes a trip `status` containing "no-show" (verified across all `.status=` / `status:` assignments). Tile 3 is permanently `0` / `0% rate`, and `setTripsKindFilter('noshow')` always empties the table. L3404, L3407, L3414.
2. **Two different Type-badge mappings for the same field.** All Trips: `b-com` / `b-eco` (L3426). `tripsTable()`: `b-purple` / `b-blue` (L3719).
3. **Two different Status-badge mappings.** All Trips uses an inline ternary (L3423) that renders `'Late +8'` blue; `statusBadge()` (L3730) renders it amber. Same record, two colours depending on the screen.
4. **`dateMs` exists only on reconstructed trips** (L18756). `tripsTable()` sorts on `dateMs||0` (L3716), so all seed/live trips tie at 0. The All Trips page ignores dates entirely and uses reverse insertion order (L3391).
5. **`km` / `min` / `fare` / `driverEarn` are strings**, coerced ad hoc with `parseFloat` at each use site. The cancelled seed record carries `km:'—'`, `min:'—'`, `driverEarn:'—'` (L2681) — `parseFloat('—')` is `NaN`, saved only by `||0` at L3422. On the Quick Rides page the raw `'—'` is printed (L3457–L3458).
6. **Eyvar cut is computed two ways.** Table: `fare − driverEarn − stopFee` (L3422). Receipt: `fare − driverEarn` (L18811).
7. **Receipt line items can contradict the total.** For a trip without a stored `fareBreakdown`, `openTripReceipt` builds one from the 4.00/1.35/0.42 card and then overwrites only `gross` with the real fare (L18783–L18787), so base+distance+time need not sum to "Rider paid".
8. **No permission gate on the page or the table.** `PAGE_PERMS.trips` exists (L10579) but `renderTripsTable` never checks it. Read access to every trip, rider name, driver name and fare is ungated.
9. **`createTicketFor` has no `requirePerm` and no `logAction`** (L2552–L2560) — ticket creation from a trip is unaudited, unlike every other write in this module.
10. **`flagTrip` / `unflagTrip` call `renderQuickRidesTable()` but not `renderTripsTable()`** (L4231, L4241) — flagging a subscription leg from its 360° does not refresh the All Trips row styling until the page is revisited.
11. **"🗺 View route" does not carry the trip.** `go('live',null)` (L4276) opens the Live Map at its default state. `openRouteReplay` at L11761 *does* target a trip (and toasts *"No route geometry recorded for this trip yet"* when `MAP_ROUTES[tripId]` is missing) but is not wired to this button.
12. **Filter state is global and sticky.** `window.__tripsLowOnly` / `window.__tripsKindFilter` survive navigation; the low-rating button's visual state is re-applied only inside `toggleLowRatingFilter`, so returning to the page can show an active filter with an un-highlighted button.
13. **`.g4` holds 6 tiles** (L850 vs L3411–L3418) — grid class and tile count disagree.
14. **`DB.arrivalConfig.riderGraceMin` (10)** is defined (L17609) and never read.
15. **`DESYNC_THRESHOLD_MS`** (L16336) is defined and never read; `detectDesync` uses "any un-acked entry", not the 20 s threshold.
16. **`tip` is `undefined` on most seed records** (only TRP-9008 has `tip:5`, L2676) — handled by `t.tip>0` guards; `commitEditTip` reads `t.tip||0`.
17. **No Export control on this page**, although `exportRows` has a `'trips'` branch (L9180). The Quick Rides page has an Export button; All Trips does not.
18. **UNVERIFIED — `fcNew` audit behaviour.** `openRatingDispute` / `openReportRider` delegate to `fcNew(...)` (L15537, L15561); the function body was not read, so whether it writes an audit entry is unconfirmed.
19. **UNVERIFIED — `reasonSelectHTML` / `gvRC` / `rcCategory` / `rcPriority` option lists.** Referenced at L2546, L2556; the reason-code registry begins at L14671 but the full option set rendered into `csel-nt-reason2` was not enumerated.
20. **UNVERIFIED — `can(permKey)` role matrix.** `requirePerm` (L3126) delegates to `can()` (L3122); the role→permission table was not read, so which roles hold `process_payouts`, `contact_users` and `live_ops` is unconfirmed.
21. **UNVERIFIED — `reconcileEntity` / `windowNoteHTML` orphan detection.** Used by the `tripsTable` empty state (L3702) and header (L3711); `reconcileEntity` body not read.
22. **UNVERIFIED — whether `DB.plans[key].eyvarPct` is ever null in practice**, which would silently drop subscription legs onto the flat 80% quick-ride rate (L4464–L4465).

---

## 18. Line-number index

### HTML
| Lines | Content |
|---|---|
| L505 | Sidebar item `go('trips',this)`, `data-i18n="nav.trips"` |
| L701 | Dashboard "All alerts" → `go('trips',null)` |
| L847–L858 | `#p-trips` page block |
| L849 | Page header + `#trips-page-sub` |
| L850 | `.g4 #trips-kpis` |
| L852 | Card header, `#trips-search`, `#trips-low-btn` |
| L853–L856 | `#trips-table`, 14-column thead, `#trips-tbody` |

### JavaScript
| Lines | Function / data |
|---|---|
| L2168 / L2169 | `titles` / `subs` maps |
| L2542–L2551 | `openSupportTicket` |
| L2552–L2560 | `createTicketFor` |
| L2670–L2682 | `DB.trips` seed (7 records) |
| L2757+ | `DB.commLogs` seed |
| L3122 / L3126 | `can` / `requirePerm` |
| L3133+ | `logAction` |
| L3266–L3272 | `resolveId` (buckets include `trips`) |
| L3283 | `rowLink` |
| L3388–L3439 | **`renderTripsTable`** |
| L3391–L3406 | id list, search, low-rating filter, kind filter |
| L3407–L3418 | KPI computation + injection |
| L3419 | subtitle rewrite |
| L3420–L3438 | row template + empty state |
| L3440–L3467 | `renderQuickRidesTable` (see 06b) |
| L3468–L3476 | `directionArrows` |
| L3560 | `kvCard` |
| L3565 | `nm2` |
| L3578–L3584 | `sendSystemEmail` |
| L3698–L3729 | **`tripsTable`** |
| L3730–L3736 | **`statusBadge`** |
| L4192–L4203 | `openEditTipModal` |
| L4204–L4215 | `commitEditTip` |
| L4216–L4223 | `sendTripReceipt` |
| L4224–L4233 | `flagTrip` |
| L4234–L4243 | `unflagTrip` |
| L4244–L4278 | **`buildTripProfile`** |
| L4279+ | `buildSubProfile` (trip log L4294–L4312) |
| L4392–L4409 | `getOrCreateInvoice` |
| L4429–L4448 | `openInvoiceModal` |
| L4450–L4466 | `planKeyFromLabel`, `commissionRateForPlan` |
| L4467 | `driverCommissionRate` |
| L7236 / L7243–L7262 | `GEO_SCALE_KM`, `RIYADH_DISTRICTS`, `computeRouteKm`, `geoDistanceKm`, `ROAD_CIRCUITY_FACTOR`, `URBAN_AVG_SPEED_KMH` |
| L7288–L7295 | `driverLiveState` (uses trip `status==='In trip'`) |
| L7897–L7920 | `LANG_STRINGS` (`nav.trips` L7906) |
| L8034 | `val` |
| L8773–L8827 | `window.go` (trips hook L8809) |
| L8828–L8862 | `window.openProfile` (trips branch L8846–L8849) |
| L9175–L9183 | `exportRows` (`trips` default L9180) |
| L9555 | `REQ_NOW_REF` |
| L9645–L9650 | `fmtReqNowLabel` |
| L10579 | `PAGE_PERMS.trips` |
| L11732–L11753 | `openSendChatModal` / `commitSendChatMsg` |
| L12034–L12056 | `simulateRatingGiven`, `simulateTip`, `applyRatingUpdate` |
| L12101–L12130+ | `maybeGenerateCashEvent` |
| L12377–L12388 | `saveRideTypes` |
| L12389–L12400 | `currentSurgeMultiplier` |
| L12401–L12405 | `quickRideFare` |
| L12406–L12474 | **`completeTrip`** (record creation L12421, status Done L12423, corp policy L12424–L12457, ratings/tip L12434–L12443, sub counter L12459–L12464) |
| L13861–L13862 | `DB.surgeConfig`, `DB.multiStopConfig` |
| L13883–L13887 | `DB.surgeSchedule` |
| L13908–L13912 | `DB.quickRideTypes` |
| L14535–L14543 | `kpiScrollTo` |
| L15243–L15257 | `lowRatingThreshold`, `isLowRating`, `ratingCell` |
| L15261–L15300 | `tripRatingsCardHTML` |
| L15303–L15326 | `openLowRatingTicket` |
| L15332–L15344 | `backfillTripRatings`, `lowRatedTripIds` |
| L15345–L15354 | `toggleLowRatingFilter` |
| L15355–L15358 | `setTripsKindFilter` |
| L15522–L15541 | `openRatingDispute` / `commitRatingDispute` |
| L15543–L15566 | `openReportRider` / `commitReportRider` |
| L16335–L16336 | `RIDE_STATE_FLOW`, `DESYNC_THRESHOLD_MS` |
| L16337–L16366 | `DB.rideStateLogs`, `rideStateSeed`, `seedRideStates` |
| L16368–L16384 | `detectDesync`, `desyncedTripIds` |
| L16385–L16428 | `rideStateTimelineHTML` |
| L16430–L16442 | `forceResync` |
| L16443–L16457 | `openDesyncTicket` |
| L17605–L17611 | `DB.arrivalConfig`, `DB.arrivalTraces` |
| L17614–L17640 | `seedArrivalTrace` |
| L17643–L17700 | `arrivalEvidence` |
| L17701–L17705 | `VERDICT_LABEL` |
| L17706–L17754 | `arrivalEvidenceHTML` |
| L18093–L18102 | `seedArrivalTraces` |
| L18650–L18666 | `RY_PLACES`, `PAY_METHODS`, `seededRand`, `buildFareBreakdown` |
| L18667–L18775 | `reconstructHistory` / `buildRiderHistory` (trip write L18754–L18760) |
| L18779–L18820 | `openTripReceipt` |
| L20458–L20470 | `windowNoteHTML` |
| L21812–L21826 | boot registrations: `backfillTripRatings`, `historyBoot`, `pricingBoot` |
