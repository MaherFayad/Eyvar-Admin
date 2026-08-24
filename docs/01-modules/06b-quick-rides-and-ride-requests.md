# Module: Quick Rides & Ride Requests

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `quickrides` — DOM node `<div class="page" id="p-quickrides">`
> **HTML lines:** L1131–L1148 (comment banner L1131, page open L1132, page close L1148)
> **Primary render:** `renderQuickRidesTable()` L3440–L3467
> **Ride-request flow (modal-only, no page of its own):** `openNewRideRequestModal` L2449 · `updateNrrFareEstimate` L2468 · `commitNewRideRequest` L2479 · `openRideRequestTracking` L2503 · `closeRideRequestTracking` L2511 · `renderRideRequestTracking` L2516
> **Companion doc:** `06a-all-trips.md` (full trip data model, statuses, fare math, trip 360° profile)

---

## 1. Purpose

Two things live here:

1. **The Quick Rides page** — a today-scoped view of `DB.trips` filtered to `kind==='Quick ride'`, with a 4-tile static KPI strip, a 12-column table showing rider/driver tier badges, route with a direction glyph, payment method and status, plus a CSV export. Header prose (L1133): *"On-demand single trips · 63 today · 1,204 this month"*.
2. **The ops-initiated ride-request flow** — a modal that creates a **real** `DB.rideRequests` record and hands it to the same automatic dispatch engine (`tickEngine`) that every other request goes through, plus a 1-second-polling tracking modal. The source comment (L2441–L2448) is explicit: *"Previously there was no way to create a ride request from the ops panel at all — every request was pre-seeded or simulated… VIP just flags it for priority handling within that same real engine."*

The Quick Rides table itself has **no create/edit action** — its only row actions are `openProfile` (Open) or `resolveAlert` (Review, on cancelled rides).

---

## 2. Entry points & routing

| Entry | Line | Mechanism |
|---|---|---|
| Sidebar item "Quick rides" | L504 | `onclick="go('quickrides',this)"`, `data-i18n="nav.quickrides"`, badge `<span class="sb-badge n" id="sbb-qr">63</span>` |
| Sidebar badge refresh | L9400 | `put('sbb-qr', qr)` inside `refreshNavCounts` — replaces the hardcoded `63` at runtime |
| `go()` page hook | L8808 | `if(id==='quickrides'){renderQuickRidesTable();}` |
| Dashboard card button "All quick rides" | L692 | `onclick="go('quickrides',null)"` (card `⚡ Quick rides — today`, badge `#dash-qr-count`) |
| Dashboard KPI tile "Quick rides today" | L10373 | `dashKpi('Quick rides today', qrT.length, …, "go('quickrides',null)")` |
| Top-bar title / subtitle | L2168 / L2169 | `titles.quickrides='Quick Rides'`; `subs.quickrides='63 on-demand rides today'` (**hardcoded**) |
| Page subtitle live rewrite | L21254–L21255 | `liveSubtitles()` sets `#p-quickrides .ph-l p` to `'On-demand single trips · <n> on record in the current window'`, where `n = keys(DB.trips).filter(kind==='Quick ride').length`. Called from `tickEngine` every 45 ticks (`__tickCount%45===0`) |
| In-page link to pricing | L1140 | `go('plans', findSbEl('plans'))` — *"Looking for ride type pricing (Economy/Comfort/Large)? It's moved to Pricing Plan → Quick Rides."* |
| Permission registry | L10578 | `quickrides:{label:'Quick Rides',icon:'⚡',legacy:'live_ops',perms:[{key:'view',label:'View quick rides'}]}` |
| **New ride request modal** | L1133 | `onclick="openNewRideRequestModal()"` — the **only** entry point to the ride-request creation flow in the whole file |
| **Ride request tracking modal** | L2501 | Opened only by `commitNewRideRequest()` at the end of its own commit. There is no other caller — see §17 |

`go('quickrides')` has **no permission guard**; `renderQuickRidesTable` never calls `can()`/`requirePerm()`. `openNewRideRequestModal` **does** gate on `live_ops` (L2450).

---

## 3. Layout map

```
#p-quickrides                                         L1132
├── .ph                                               L1133
│    ├── .ph-l → <h1>⚡ Quick rides</h1>
│    │           <p>On-demand single trips · 63 today · 1,204 this month</p>
│    └── .br  → [📞 New ride request]  (btn p sm → openNewRideRequestModal())
│               [Export CSV]           (btn sm    → exportData(this,'quickrides'))
├── .g4                                               L1134–L1139   ← 4 STATIC KPI tiles
│    ├── Quick rides today   63     ↑ 9% vs avg      bar 63% purple
│    ├── Avg fare            26.40  SAR / ride       bar 52% kf-b
│    ├── Cancel rate         6.3%   4 cancelled      bar  6% kf-a
│    └── Eyvar net today     332    20% avg          bar 20% kf-b
├── <div> pricing-moved note + link → Pricing Plan    L1140
└── .card                                             L1141
     ├── .ch → <h2>All quick rides — today</h2>       L1142   (no search / no filter)
     └── .tbl-scroll > table.dt#quickrides-table      L1143
          ├── <thead> 12 columns                      L1144
          └── <tbody id="quickrides-tbody">           L1145  ← rows injected (L3445–L3466)
```

All four KPI tiles carry `onclick="kpiScrollTo('quickrides-table')"` (L1135–L1138) — they scroll to the table and flash it (`kpiScrollTo` L14535: `scrollIntoView({behavior:'smooth',block:'center'})` + `kpi-flash-target` class for 1500 ms). **They do not filter anything.**

---

## 4. Data model & fields

### 4.1 Quick-ride trips

The page reads the **same `DB.trips` record documented in full in `06a-all-trips.md` §4.1**. Quick rides are the subset where `kind === 'Quick ride'`, which implies:

| Field | Value for a quick ride | Line |
|---|---|---|
| `kind` | `'Quick ride'` | L12421 |
| `sub` | `null` | L2675–L2681, L12417 |
| `fare` | `(quickRideFare(type,km,min) + stopFee).toFixed(2)` — a real per-trip fare, never `'0.00'` unless cancelled | L12422 |
| `driverEarn` | `fare × driverCommissionRate()` (flat platform rate, default 80%) | L12421, L4467 |
| Cash reconciliation | eligible — `maybeGenerateCashEvent(t, base)` runs (skips subs) | L12101–L12102 |
| Corporate policy check | runs at completion; can set `flagged` + `corpPolicyViolation` | L12424–L12457 |

Seeded quick rides (4 of the 7 seed trips, L2675–L2681):

| id | rider | driver | date | route | km | min | fare | driverEarn | tip | status | pay |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRP-9012 | RDR-2087 | DRV-0102 | 25 Jun 09:02 | Olaya → Granada Mall | 9.1 | 21 | 24.50 | 19.60 | — | In trip | PAY-6001 |
| TRP-9008 | RDR-2031 | DRV-0104 | 25 Jun 08:41 | KAFD → Airport T5 | 14.2 | 27 | 38.00 | 30.40 | **5** | Done | PAY-6008 |
| TRP-9005 | RDR-2090 | DRV-0101 | 25 Jun 08:20 | Al Malaz → Qurtubah | 5.4 | 14 | 15.75 | 12.60 | — | Done | PAY-6010 |
| TRP-9003 | RDR-2055 | DRV-0105 | 25 Jun 07:55 | Al Aqiq → cancelled | `'—'` | `'—'` | 0.00 | `'—'` | — | Cancelled | `null` |

### 4.2 Rider / driver fields consumed by this table

`renderQuickRidesTable` reads `DB.riders[t.rider]` and `DB.drivers[t.driver]` with the fallback `{name:t.rider, rating:null, lvl:'grey'}` (L3447–L3448):

| Field | Type | Used for |
|---|---|---|
| `name` | string | cell text (note: **not** `nm2()`, unlike All Trips) |
| `rating` | number \| null | `★<rating>` inside the tier chip, or `★new` |
| `lvl` | `'gold'` \| `'silver'` \| `'new'` \| other | chip class via `lvlCls` (L3450): gold→`b-gold`, silver→`b-silver`, new→`b-grey`, **anything else→`b-silver`** |

### 4.3 Payment lookup

`pay = Object.keys(DB.payments).map(k=>DB.payments[k]).find(p => p.trip === id)` (L3449) — a linear scan of `DB.payments` matched on the payment's `trip` field, **not** on `t.pay`.

### 4.4 `DB.rideRequests` — the ride-request record

Seed literal L2786–L2790 (3 records); array, not a keyed map.

| Field | Type | Meaning | Written by |
|---|---|---|---|
| `id` | `'REQ-###'` | Primary key | seed; `'REQ-'+(500 + count + rand(400))` L2488 |
| `rider` | `'RDR-####'` | FK → `DB.riders` | seed / `#nrr-rider` |
| `pickup` | string | District name | seed / `#nrr-pickup` |
| `dest` | string | District name | seed / `#nrr-dest` |
| `type` | `'Economy'` \| `'Comfort'` | Vehicle class | seed / `#nrr-type` |
| `waiting` | `'m:ss'` string | Elapsed wait, incremented by `bumpWait` each tick (L12554) | `'0:00'` at creation L2489 |
| `status` | `'searching'` \| `'offered'` \| `'no_drivers'` (+ `'expired'`, `'assigned'`, `'declined'` elsewhere) | See §5 | `'searching'` at creation L2489 |
| `requestedAt` | string | `fmtReqNowLabel()` = `DD Mon HH:MM` from `REQ_NOW_REF` | L2489, L9645 |
| `vip` | bool | Priority flag from `#nrr-vip` | L2489 |
| `offeredTo` | `'DRV-####'` | Driver currently holding the offer | `sendDriverOffer` L11991 |
| `offerSecondsLeft` | number | Countdown of the driver's response window | L11992, decremented L12555 |
| `declinedBy` | string[] | Drivers who declined/timed out on **this** request | L11997 |
| `_alerted` | bool | Guards the one-time SLA alert | L12569 |

Seeded requests (L2787–L2789):

| id | rider | pickup | dest | type | waiting | status | requestedAt |
|---|---|---|---|---|---|---|---|
| REQ-501 | RDR-2090 | Al Sahafa District | King Saud University | Economy | 0:38 | searching | 25 Jun 08:36 |
| REQ-502 | RDR-1060 | Al Wurud District | Kingdom Tower | Comfort | 1:12 | searching | 25 Jun 08:02 |
| REQ-503 | RDR-2031 | KAFD | Airport T5 | Comfort | 2:40 | **no_drivers** | 25 Jun 07:34 |

Note the seed `pickup`/`dest` values are **not** all members of `RIYADH_DISTRICTS` (e.g. `'King Saud University'`, `'Kingdom Tower'`, `'Airport T5'`), so `computeRouteKm` would return `null` for them — but the seed records never pass through the fare estimator.

### 4.5 Live-trip record created on acceptance (`driverAcceptOffer` L12476–L12494)

```
DB.rideRequests.splice(idx,1)                       ← the request record is removed
DB.liveTrips.push({
  id:      'TRP-'+(9100+Math.floor(Math.random()*900)),
  rider:   r.rider,
  driver:  drvId,
  type:    r.type,
  stage:   2,
  eta:     '3 min to pickup',                        ← hardcoded
  route:   r.pickup+' → '+r.dest,
  mapTrip: null
})
```

---

## 5. Statuses & transitions

### 5.1 Quick-ride trip statuses (table cell, L3451)

| Status | Condition | Badge class | Row tint | Row action |
|---|---|---|---|---|
| `Cancelled` (any `/cancel/i`) | seeded `'Cancelled'`; `buildRiderHistory` L18757 | `b-red` | `background:var(--red-lt)` (L3452) | **Review** → `resolveAlert(this,'Cancelled ride')` |
| `Done` (exact string match) | `completeTrip` L12423 | `b-green` | none | **Open** → `openProfile(id)` |
| anything else (`In trip`, `Late +N`, …) | | `b-blue` | none | **Open** |

Fare cell colour also switches on cancellation: `/cancel/i` → `var(--red)`, else `var(--green)` (L3459).

This is a **third**, narrower status mapping than the two documented in `06a` §5.1/§5.3 — it has no amber branch and no `/no-show/` test.

### 5.2 Payment-method badge (L3449–L3450)

| Condition | Rendered |
|---|---|
| a payment row exists **and** `p.method` contains `'Cash'` | `<span class="b b-amber">Cash</span>` |
| a payment row exists, any other method | `<span class="b b-green">Card</span>` — Mada, Visa, Apple Pay, STC Pay and Bank transfer all collapse to "Card" |
| no payment row found | `<span class="b b-grey">—</span>` |

### 5.3 Ride-request statuses (tracking modal + dispatch engine)

| Status | Exact producing condition | Tracking-modal rendering (L2526–L2531) | Actions offered |
|---|---|---|---|
| `searching` | Set at creation (L2489); also restored after a decline (L12008) | Blue `--blue-lt` box: `🔍 Searching for the nearest available driver` + ` — ⭐ VIP priority active` when `st.vip` + `…` | Close only |
| `offered` | `sendDriverOffer(r,drvId)` L11991–L11993 — fires once `waiting ≥ AUTO_OFFER_DELAY_SEC` (6 s), or `≥1 s` for VIP (L12535) | Amber `--amber-lt` box: `📨 Offer sent to <driver> — waiting for their response (<offerSecondsLeft>s left)` | Close only |
| `no_drivers` | `waiting ≥ 180 s` with no match → `r.status='no_drivers'` + `playAlertBeep()` + error toast + ops notification + `logAction('sla_breach',…)` (L12544–L12552) | Red `--red-lt` box: `⚠ No driver found within 3 minutes — needs manual attention` | **Handle manually →** (`closeRideRequestTracking(); go('requests',null)`) |
| *(accepted)* | `driverAcceptOffer` splices the request out of `DB.rideRequests` and pushes a `DB.liveTrips` row (L12476–L12494). The modal detects it via `DB.liveTrips.find(t => t.rider === st.rider)` (L2521) | Green `--green-lt` box: `✓ <driver> accepted — <liveTrip.eta \|\| 'on the way to pickup'>` | **Open trip →** (`openProfile(liveTrip.id)`) |
| *(gone)* | No matching request **and** no matching live trip | Grey `--bg2` box: `Request no longer active.` | Close only |
| *(any other)* | fallback | Grey box: `Status: <r.status>` | Close only |

Transition rules in `tickEngine` (L12530–L12570), evaluated once per tick per request:

```
searching:
    waiting = bumpWait(waiting)
    if secs >= (vip ? 1 : AUTO_OFFER_DELAY_SEC=6):
        candidate = nextOfferCandidate(r) ; if candidate → sendDriverOffer(r, candidate.id) ; return
    if secs >= 180 → status = 'no_drivers'  (+beep, toast, notification, audit)

offered:
    waiting = bumpWait(waiting)
    offerSecondsLeft = (offerSecondsLeft ?? OFFER_WINDOW_SEC=12) − 1
    acceptChance = 0.30 + ((driver.rating ?? 4) − 3) × 0.08          ← per-SECOND probability
    if random() < acceptChance → driverAcceptOffer(r) ; return
    if offerSecondsLeft <= 0  → driverDeclineOrTimeout(r)

no_drivers:
    retryCandidate = nextOfferCandidate(r)
    if retryCandidate → declinedBy = [] ; sendDriverOffer(r, retryCandidate.id)   ← self-heals
```

`nextOfferCandidate(r)` (L12497–L12507): excludes drivers in `r.declinedBy` **and** drivers currently `offered` on another request; `effectiveElapsed = vip ? 999 : elapsedSec` (VIP searches at max radius immediately); pool = `nearestAvailableDrivers(rider, exclude.length+6, 'quick', effectiveElapsed)` filtered to `!busy`; **non-VIP takes `pool[0]` (nearest); VIP re-sorts by `rating` desc, then `km` asc.**

`driverDeclineOrTimeout(r)` (L11996–L12011): pushes `offeredTo` into `declinedBy`, increments the driver's `declineStreak` (flagging them past the configured limit, L12004–L12005), logs `offer_declined`, deletes `offeredTo`/`offerSecondsLeft` and returns the request to `searching`.

Constants: `AUTO_OFFER_DELAY_SEC = 6` (L11987), `OFFER_WINDOW_SEC = 12` (L11988), SLA breach at **180 s** (L12544), `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` (L9579) — `REQ_NOW_REF` advances 1 simulated minute per tick (L9680).

---

## 6. Pricing / fare formulas

### 6.1 Fare estimate in the New-ride-request modal — `updateNrrFareEstimate()` L2468–L2478

```
pickup = #nrr-pickup.value ; dest = #nrr-dest.value
type   = #nrr-type.value || 'Economy'

km = computeRouteKm(pickup, dest)                                     L7250
     └─ p = RIYADH_DISTRICTS[pickup] ; d = RIYADH_DISTRICTS[dest]
        if (!p || !d || pickup === dest) return null                  ← same district ⇒ null
        straight = geoDistanceKm(p,d) = sqrt(dx² + dy²) × GEO_SCALE_KM
                                        GEO_SCALE_KM = 0.14           L7236
        return round(straight × ROAD_CIRCUITY_FACTOR × 10) / 10
                                        ROAD_CIRCUITY_FACTOR = 1.35   L7261

if (!km) → "Pick a pickup and destination to see an estimated fare."

min  = Math.round(km / URBAN_AVG_SPEED_KMH × 60)                      URBAN_AVG_SPEED_KMH = 26   L7262
fare = quickRideFare(type, km, min)                                   L12401
     = ((baseFare + km×perKm + min×perMin) × currentSurgeMultiplier()).toFixed(2)

output: "📍 <km> km · ~<min> min · estimated fare <b><fare> SAR</b>"
        + (surge > 1 ? " (surge ×<surge.toFixed(2)> active)" : "")
```

Rate card used (`DB.quickRideTypes`, L13908–L13912) — note the modal only offers **Economy** and **Comfort**, while the card also defines **Large**:

| name | baseFare | perKm | perMin |
|---|---|---|---|
| Economy | 2.50 | 1.10 | 0.35 |
| Comfort | 4.00 | 1.60 | 0.50 |
| Large | 6.00 | 2.10 | 0.65 |

Surge (`currentSurgeMultiplier()` L12389–L12400) — full schedule and cap documented in `06a` §6.3. With the frozen clock `REQ_NOW_REF = 25 Jun 2026 09:14` (L9555), hour 9 falls **outside** the 7–9 morning window (`hour >= 7 && hour < 9` is false at 9), so the estimator shows **×1 / no surge** on first open.

Note: `updateNrrFareEstimate` uses `zoneCongestionMultiplier`-free timing (plain `km/26×60`), whereas `estimateEtaMin` (L7273–L7280) — used by the tracking map — **does** apply `zoneCongestionMultiplier(zone)`:

```
estimateEtaMin(straightKm, driverAddr, riderAddr):
    roadKm  = straightKm × 1.35
    zone    = zoneOfAddress(riderAddr) || zoneOfAddress(driverAddr)
    mult    = zoneCongestionMultiplier(zone)                          L7263–L7269
            = clamp(0.9, 1.6, 0.85 + (zone.demand / zone.supply) × 0.18)   (1 when unknown)
    return max(1, round(roadKm / 26 × 60 × mult))
```

### 6.2 What the estimate is **not**

The fare shown in the modal is **display-only**. `commitNewRideRequest` (L2479–L2502) never stores `km`, `min` or a fare on the request record. The final fare is recomputed from scratch in `completeTrip` (L12419–L12422) with **randomly generated** distance and duration:

```
km  = (3 + Math.random()*10).toFixed(1)            ← 3.0–13.0 km, unrelated to the chosen districts
min = String(max(6, round(parseFloat(km) × 2.3)))
stopFee = stops.length × (DB.multiStopConfig.extraStopFeeSAR || 3)
fare = subId ? '0.00' : (parseFloat(quickRideFare(t.type, km, min)) + stopFee).toFixed(2)
driverEarn = (parseFloat(fare) × driverCommissionRate()).toFixed(2)
```

### 6.3 Table money columns (L3457–L3461)

| Column | Expression | Notes |
|---|---|---|
| Fare | `t.fare \|\| '0.00'` | **raw string, not re-formatted**; green, or red when cancelled |
| Driver earns | `t.driverEarn \|\| '—'` | raw string; blue |
| Tip | `t.tip>0 ? '+'+t.tip.toFixed(2) : '—'` | green, weight 500 |

There is **no Eyvar-cut column** on this page (unlike All Trips).

---

## 7. KPIs & metrics — 4 tiles, `.g4` L1134–L1139

**Every value, delta and bar width on this strip is a hardcoded HTML literal.** No render function writes into these tiles (verified: no `#quickrides-kpis` element exists and nothing targets `#p-quickrides .g4`).

| # | Label | Value | Colour | Delta line | Delta class | Bar | Click |
|---|---|---|---|---|---|---|---|
| 1 | Quick rides today | `63` | `var(--purple)` | `↑ 9% vs avg` | `up` | `width:63%` `background:var(--purple)` | `kpiScrollTo('quickrides-table')` |
| 2 | Avg fare | `26.40` | default ink | `SAR / ride` | `neu` | `.kf.kf-b width:52%` | same |
| 3 | Cancel rate | `6.3%` | `var(--amber)` | `4 cancelled` | `dn` | `.kf.kf-a width:6%` | same |
| 4 | Eyvar net today | `332` | `var(--blue)` | `20% avg` | `up` | `.kf.kf-b width:20%` | same |

**Live equivalents exist elsewhere and disagree with these numbers:**

| Real metric | Formula | Line |
|---|---|---|
| Quick-ride count (sidebar badge, page subtitle, snapshots) | `Object.keys(DB.trips).filter(k => DB.trips[k].kind==='Quick ride').length` | L21254, L9400, L21252 |
| Cancel rate (daily snapshot) | `quickTrips.length ? round(cancelled / quickTrips.length × 100) : 0`, where `cancelled = quickTrips.filter(status==='Cancelled')` | L21253, L21260 |
| Quick-ride revenue (daily snapshot) | `sum(parseFloat(p.amount))` over `DB.payments` where `status==='Paid' && type==='Quick ride fare'` | L21256 |
| Dashboard "Quick rides today" | `qrT.length` where `qrT` = trips whose `date` starts with `'25 Jun'` (L10348) | L10373 |

The page's own header prose *"63 today · 1,204 this month"* (L1133) is likewise hardcoded, and is overwritten by `liveSubtitles()` (L21254) to `On-demand single trips · <n> on record in the current window`.

---

## 8. Data displayed (Element | DB path | Type | Notes)

### 8.1 Page chrome

| Element | Source | Type | Notes |
|---|---|---|---|
| `<h1>⚡ Quick rides</h1>` | literal L1133 | static | |
| `.ph-l p` | literal L1133, replaced by `liveSubtitles()` L21254 | computed | until the first `%45` tick it shows `63 today · 1,204 this month` |
| Sidebar badge `#sbb-qr` | literal `63` L504, replaced by `refreshNavCounts` L9400 | computed | |
| Top-bar subtitle | `subs.quickrides` L2169 | **hardcoded** | `'63 on-demand rides today'` |
| 4 KPI tiles | literals L1135–L1138 | **hardcoded** | see §7 |
| Pricing note | literal L1140 | static | link → `go('plans', findSbEl('plans'))`; `findSbEl` (L7007) locates the sidebar element whose `onclick` contains `'plans'` so the nav highlight follows |
| `<h2>All quick rides — today</h2>` | literal L1142 | static | Says "today", but the table is **not** date-filtered (§11) |

### 8.2 Table row cells — `renderQuickRidesTable` L3445–L3466

| # | Column (L1144) | Value expression | Type | Style / behaviour |
|---|---|---|---|---|
| 1 | Trip ID | `id` | string | monospace 11px, `var(--purple)`, `onclick="openProfile(id)"`. **No 🚩 flag glyph here** even though `flagged` exists |
| 2 | Time | `t.date \|\| '—'` | string | header says "Time" but the field is the full `'25 Jun 09:02'` date string |
| 3 | Rider | `<span class="b <lvlCls>" style="font-size:8px">★<rating\|\|'new'</span> ' ' + rider.name` | HTML | `onclick="openProfile(t.rider)"`; falls back to `{name:t.rider, rating:null, lvl:'grey'}` |
| 4 | Driver | same shape from `DB.drivers[t.driver]` | HTML | `onclick="openProfile(t.driver)"` |
| 5 | Route | `directionArrows('one-way') + '<span>' + (t.route \|\| '—') + '</span>'` | HTML | 10.5px muted, flex row. **`'one-way'` is hardcoded** (§15) |
| 6 | km | `t.km \|\| '—'` | string | |
| 7 | Fare | `t.fare \|\| '0.00'` | string | green, or red when `/cancel/i` |
| 8 | Driver earns | `t.driverEarn \|\| '—'` | string | blue |
| 9 | Tip | `t.tip>0 ? '+'+t.tip.toFixed(2) : '—'` | number | green, weight 500 |
| 10 | Pay | `payCell` (§5.2) | badge | `b-amber` Cash / `b-green` Card / `b-grey` — |
| 11 | Status | `t.status` in `b-red`/`b-green`/`b-blue` | badge | §5.1 |
| 12 | (blank) | `Review` (cancelled) or `Open` | action | §10 |

### 8.3 `directionArrows(direction)` L3468–L3476

| Argument | Output |
|---|---|
| `'round-trip'` | stacked column: blue `→` (`title="Outbound (go)"`, 10px, weight 700) above teal `←` (`title="Return"`), `margin-right:6px` |
| anything else | single blue `→`, 11px, weight 700, `title="One-way"`, `margin-right:6px` |

Called from exactly one place — `renderQuickRidesTable` L3456, always with the literal `'one-way'`. The round-trip branch is unreachable from this module.

---

## 9. Input fields / filters

### 9.1 Quick Rides page

**There are none.** The page has no search box, no kind filter, no status filter, no date picker and no sort control. The only interactive controls are the two header buttons, the four scroll-only KPI tiles and the pricing link.

### 9.2 New ride request modal (`openNewRideRequestModal` L2449–L2467)

| id | Type | Label | Default | Options | Drives |
|---|---|---|---|---|---|
| `nrr-rider` (widget `csel-nrr-rider`) | custom select (`customSelectHTML` L5336) | **Rider** | none (placeholder `Search rider…`) | one entry per `Object.keys(DB.riders)`: `{value:id, label:'<name> · <id>', search:'<phone> <id> <name>', hint:'<phone>'}` (L2451) | `commitNewRideRequest` reads `#nrr-rider`. Because the list exceeds 6 options the widget renders an inline search input (L5343) matching against the `search` blob. **No `onChange` expression** — picking a rider does not refresh the estimate |
| `nrr-vip` | `<input type="checkbox">` inside `<label class="tog">` | **⭐ VIP priority — skip queue, best-rated driver offered first** | unchecked | on/off | `req.vip`; changes dispatch (max radius immediately + best-rated-first ordering, L12503–L12506), the 1 s vs 6 s offer delay (L12535), and the modal title prefix `⭐ VIP — ` (L2533). Styled on an `--amber-lt` pill |
| `nrr-pickup` (widget `csel-nrr-pickup`) | custom select | **Pickup** | none (placeholder `Select district…`) | the 16 `RIYADH_DISTRICTS` keys (§9.3) | `onChange="updateNrrFareEstimate()"` |
| `nrr-dest` (widget `csel-nrr-dest`) | custom select | **Destination** | none (placeholder `Select district…`) | same 16 | `onChange="updateNrrFareEstimate()"` |
| `nrr-type` | native `<select>` | **Vehicle type** | `Economy` (first option) | `Economy`, `Comfort` — **`Large` is missing** although `DB.quickRideTypes` defines it (L13911) | `onchange="updateNrrFareEstimate()"`; passed to `quickRideFare` and stored as `req.type` |
| `nrr-fare-preview` | output `<div>` | — | `"Pick a pickup and destination to see an estimated fare."` | — | rewritten by `updateNrrFareEstimate` |

### 9.3 `RIYADH_DISTRICTS` — the full pickup/destination option list (L7243–L7249)

Each entry is a `{x,y}` percentage coordinate on the schematic map:

| District | x | y | | District | x | y |
|---|---|---|---|---|---|---|
| Al Malaz District | 48 | 50 | | Al Nuzha | 52 | 35 |
| King Fahd District | 55 | 42 | | Olaya / KAFD | 58 | 38 |
| Al Nakheel District | 25 | 30 | | Al Sahafa | 35 | 24 |
| Qurtubah District | 76 | 46 | | Al Narjis | 38 | 15 |
| Al Aqiq District | 29 | 26 | | Diplomatic Quarter | 44 | 44 |
| Al Yasmin District | 31 | 18 | | Riyadh Park Mall | 60 | 44 |
| Granada Mall | 78 | 48 | | King Khalid Airport | 50 | 5 |
| Al Malqa | 33 | 20 | | Hittin | 28 | 22 |

16 options, offered identically in both the Pickup and Destination selects. Selecting the **same** district for both makes `computeRouteKm` return `null` (L7252), which resets the preview to the placeholder text rather than showing an error.

---

## 10. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **📞 New ride request** | `openNewRideRequestModal()` L2449 | Opens the creation modal | — | **`live_ops`** (L2450 — returns silently after the `requirePerm` toast) | `permission_denied` on failure only | no |
| **Export CSV** | `exportData(this,'quickrides')` L9187 | Opens the export modal (format CSV/JSON + save location), then `doExport('quickrides')` L9204 builds the file from `exportRows('quickrides')` and downloads it as `eyvar_quick_rides_25Jun.csv` (or `.json`) | file system (download / `showSaveFilePicker`) | none | `logAction('export_data','report','quickrides','Exported N quick_rides rows as CSV (…)')` L9215 | modal acts as the gate |
| Trip ID cell / **Open** | `openProfile(id)` L3454, L3465 | Trip 360° (`buildTripProfile`) | — | none | none | no |
| Rider cell | `openProfile(t.rider)` L3455 | Rider 360° | — | none | none | no |
| Driver cell | `openProfile(t.driver)` L3456 | Driver 360° | — | none | none | no |
| **Review** (cancelled rows only) | `resolveAlert(this,'Cancelled ride')` L10576 | **Cosmetic only.** Sets the button to `Resolving…`, disables it, and after 600 ms fades the row to `opacity:.45`, sets the button to `✓ Done` and toasts `✅ Resolved: Cancelled ride` | **nothing** — no DB write | none | none | no |
| KPI tile (×4) | `kpiScrollTo('quickrides-table')` L14535 | Smooth-scrolls to the table and flashes it for 1500 ms | — | none | none | no |
| Pricing link | `go('plans', findSbEl('plans')); return false` L1140 | Navigates to Pricing Plan with the sidebar highlight moved | — | none | none | no |
| **Send request** (modal) | `commitNewRideRequest()` L2479 | See §13.1 | `DB.rideRequests` | none of its own — the gate was on opening the modal | `logAction('create_ride_request','ride_request',newId, '⭐ VIP '?+'Manual ride request created for <rider> — <pickup> → <dest>', {}, {})` L2492 | no |
| **Cancel** (modal) | `closeModal()` | Discards | — | none | none | no |
| **Handle manually →** (tracking) | `closeRideRequestTracking(); go('requests',null)` L2539 | Stops the 1 s poll, closes the modal, navigates to the Requests page | — | none | none | no |
| **Open trip →** (tracking) | `closeRideRequestTracking(); openProfile(liveTrip.id)` L2539 | Stops the poll and opens the live trip's 360° | — | none | none | no |
| **Close — keep tracking in background** (tracking) | `closeRideRequestTracking()` L2539 | Clears `_rrTrackInterval`, nulls `_rrTrackState`, `closeModal()`. Dispatch continues in `tickEngine` — the *modal* stops polling; the label refers to the engine, not to any background UI | `_rrTrackInterval`, `_rrTrackState` | none | none | no |

`exportRows('quickrides')` (L9178–L9179):

```
name: 'quick_rides'
head: ['ID','Date','Rider','Driver','Route','KM','Min','Fare','Status']
rows: Object.keys(DB.trips)
        .filter(k => DB.trips[k].kind !== 'Subscription')      ← note: NOT === 'Quick ride'
        .map(t => [id, date, nm2(rider), nm2(driver), route, km, min, fare||'0.00', status])
```
The filter is `!== 'Subscription'`, so any future `kind` value would also be exported. The export carries **no tip, no driver-earn and no payment-method column**, although all three are shown in the table.

---

## 11. Tables & lists

### `#quickrides-table` — the page table

- **Row source:** `Object.keys(DB.trips).filter(k => DB.trips[k].kind==='Quick ride').reverse()` (L3443) — reverse insertion order.
- **Columns (ordered, 12):** Trip ID · Time · Rider · Driver · Route · km · Fare · Driver earns · Tip · Pay · Status · (actions)
- **Filters / search / sort:** none (§9.1)
- **Date scope:** despite the card title *"All quick rides — today"* and the page prose *"63 today"*, **no date filter is applied** — every quick ride in `DB.trips`, of any date, is listed. (The Dashboard's quick-ride card *does* filter on `(t.date||'').indexOf('25 Jun')===0`, L10348 — this page does not.)
- **Row click:** per-cell only (id / rider / driver). The `<tr>` has no handler.
- **Row tint:** `background:var(--red-lt)` when `/cancel/i.test(t.status)` (L3452)
- **Row actions:** exactly one, conditional — `Review` (`btn sm danger`) on cancelled rows, otherwise `Open` (`btn sm`)
- **Empty state** (L3444), `colspan=12`, ghost 11.5px, single fixed message: *"No quick rides recorded yet today."* — early-returned before any row work
- **Pagination:** none. Scroll only, via `.tbl-scroll`.
- **Re-render triggers:** `go('quickrides')` L8808; `flagTrip` L4231; `unflagTrip` L4241. **Not** re-rendered by `completeTrip`, so a quick ride finishing while the page is open does not appear until navigation.

---

## 12. Detail / profile view sections

The Quick Rides page has no detail view of its own — `openProfile(tripId)` routes into the shared **trip 360° profile**, `buildTripProfile(d)` L4244–L4278, documented section-by-section in `06a-all-trips.md` §12. Quick-ride-specific behaviour there:

| Section | Quick-ride difference | Line |
|---|---|---|
| Profile header | `⚡ ` prefix instead of `📋 ` | L8847 |
| Trip details → Type badge | `b-purple` (vs `b-blue` for subscriptions) | L4245 |
| Linked entities → Subscription | renders `'— (quick ride)'` | L4270 |
| Financials | shows a real fare (subscription legs show `0.00`) | L4260 |
| Action bar | identical: 🗺 View route · Send receipt · 🎧 Open ticket · Flag / Unflag | L4276 |
| Corporate-policy banner | quick-ride-only — `corpPolicyViolation` is only set on quick rides (`if(!subId)` guard) | L12424, L4277 |

---

## 13. Modals opened

### 13.1 New ride request — `openNewRideRequestModal()` L2449–L2467

| Element | Type | Detail |
|---|---|---|
| Title | — | `📞 New ride request` + `✕` (`closeModal()`) |
| Intro | text 11px muted | *"For a rider calling in directly — creates a real request and sends it through normal dispatch."* |
| `nrr-rider` | custom select | label **Rider**; every `DB.riders` entry; searchable by phone / id / name; option hint = phone |
| `nrr-vip` | toggle checkbox | **⭐ VIP priority — skip queue, best-rated driver offered first**, on an `--amber-lt` pill |
| `nrr-pickup` | custom select | label **Pickup**, 16 districts, `onChange=updateNrrFareEstimate()` |
| `nrr-dest` | custom select | label **Destination**, 16 districts, `onChange=updateNrrFareEstimate()` |
| `nrr-type` | native select | label **Vehicle type**, options `Economy` / `Comfort`, `onchange=updateNrrFareEstimate()` |
| `nrr-fare-preview` | output div | `--blue-lt` panel; placeholder or `📍 <km> km · ~<min> min · estimated fare <fare> SAR (surge ×N.NN active)` |
| Footer | buttons | **Cancel** (`closeModal()`) · **Send request** (`commitNewRideRequest()`) |

**Commit path — `commitNewRideRequest()` L2479–L2502, in order:**

1. Read `#nrr-rider`, `#nrr-pickup`, `#nrr-dest`, `#nrr-type` (default `'Economy'`), `#nrr-vip.checked`.
2. Validation — `if(!riderId)` → `toast('Please select a rider','err')` and return (L2485); `if(!pickup||!dest)` → `toast('Please select pickup and destination','err')` and return (L2486). **No check that pickup ≠ dest**, and no permission check at commit time.
3. `newId = 'REQ-' + (500 + Object.keys(DB.rideRequests||{}).length + Math.floor(Math.random()*400))` (L2488) — `Object.keys` on an **array** yields its indices, so this is `500 + length + rand(400)`. Collisions are possible and unchecked.
4. Build `req = {id, rider, pickup, dest, type, waiting:'0:00', status:'searching', requestedAt: fmtReqNowLabel(), vip}` (L2489).
5. `if(!DB.rideRequests) DB.rideRequests=[]` then `DB.rideRequests.push(req)` (L2490–L2491).
6. `logAction('create_ride_request','ride_request', newId, (vip?'⭐ VIP ':'') + 'Manual ride request created for ' + nm2(riderId) + ' — ' + pickup + ' → ' + dest, {}, {})` (L2492).
7. `closeModal()` (L2493).
8. `if(typeof renderRequestsPage==='function') renderRequestsPage()` (L2494).
9. `openRideRequestTracking(newId)` (L2495) — the tracking modal replaces the creation modal immediately.

No toast is shown on success — the tracking modal is the confirmation.

### 13.2 Ride-request tracking — `openRideRequestTracking(reqId)` L2503–L2510 / `renderRideRequestTracking()` L2516–L2541

**Open:** clears any existing `_rrTrackInterval`, finds the request (returns silently if absent), snapshots `_rrTrackState = {reqId, rider, pickup, dest, vip}` — the inline comment (L2507) states this *"survives the request being spliced out of `DB.rideRequests` on acceptance"* — renders once, then `setInterval(renderRideRequestTracking, 1000)`.

**Refresh mechanism:** a **1 000 ms `setInterval`** that re-reads live state and rewrites `#modal-content` wholesale each tick. It is not event-driven; it polls the same records `tickEngine` mutates. Module-level state: `var _rrTrackInterval = null; var _rrTrackState = null;` (L2497–L2498).

**Each render resolves (L2518–L2522):**
```
rider       = DB.riders[st.rider]
r           = DB.rideRequests.find(x => x.id === st.reqId)          // undefined once accepted
liveTrip    = DB.liveTrips.find(t => t.rider === st.rider)          // matched on RIDER, not request id
offeredDrv  = r && r.offeredTo ? DB.drivers[r.offeredTo] : null
acceptedDrv = liveTrip ? DB.drivers[liveTrip.driver] : null
map         = subDispatchMapHTML(offeredDrv || acceptedDrv, rider, 160)
```

**Rendered structure:**

| Region | Content |
|---|---|
| Head | `<h3>` = `(vip ? '⭐ VIP — ' : '') + reqId + ' — ' + nm2(rider)`; `✕` → `closeRideRequestTracking()` |
| Map | `subDispatchMapHTML(drv, rider, 160)` L4979 — a 160 px schematic grid: rider `📍` pin with a name chip at `rider.mapPos`, driver `🚗` blue circle with a first-name chip at `drv.mapPos`, and a dashed blue SVG line between them when both have `mapPos`. Also returns `km = geoDistanceKm(rider.mapPos, drv.mapPos)` and `eta = estimateEtaMin(km, drv.address, rider.address)` — **neither is displayed by this modal** |
| Meta row | left `<pickup> → <dest>`; right `Waiting <r.waiting>` (blank once accepted) |
| Status box | one of the six states in §5.3 |
| Footer | conditional **Handle manually →** (`no_drivers`) · conditional **Open trip →** (accepted) · always **Close — keep tracking in background** |

**Close — `closeRideRequestTracking()` L2511–L2515:** `clearInterval(_rrTrackInterval)`, `_rrTrackInterval=null`, `_rrTrackState=null`, `closeModal()`.

### 13.3 Export — `exportData(btn,'quickrides')` L9187–L9203

| Group | Options |
|---|---|
| **File type** | `CSV` — *"Opens in Excel / Google Sheets"* (selected by default) · `JSON` — *"For systems and APIs"* |
| **Save location** | `Choose where to save…` — *"Browser save dialog"*, enabled and pre-selected only when `typeof window.showSaveFilePicker === 'function'`; otherwise dimmed with `title="Not supported in this browser"` · `Downloads folder` — *"Instant download"*, pre-selected when the picker is unavailable |
| Footer | **Cancel** · **Export** → `doExport('quickrides')` |

`doExport` (L9204–L9221): filename `eyvar_quick_rides_25Jun.<csv\|json>` (**the `25Jun` date is hardcoded**, L9212); MIME `text/csv` / `application/json`; CSV escaping via `buildCSV`/`esc` (L9184–L9186, doubles `"` and wraps every cell); on `AbortError` from the picker it silently returns, on any other picker error it toasts `Save dialog unavailable — using Downloads instead` and falls back to an anchor download; then `closeModal()`, `logAction('export_data',…)` and `toast('✅ N rows exported — <fname>','ok')`.

### 13.4 Support ticket from a quick ride

`openSupportTicket(tripId, entityId, entityName)` L2542 — reachable only from the trip 360° action bar, documented in `06a` §13.2.

---

## 14. Cross-module links

| From | To | Line |
|---|---|---|
| Quick ride row (id / Open / Review-adjacent) | Trip 360° (`buildTripProfile`) | L3454, L3465 |
| Quick ride row (rider / driver) | Rider / Driver 360° | L3455–L3456 |
| Pricing note link | **Pricing Plan** page, Quick Rides sub-tab (`switchPricingSubTab('quickrides')` L12276) | L1140 |
| Export CSV | export modal → file download + audit log | L9187 |
| New ride request | `DB.rideRequests` → **Requests** page (`renderRequestsPage`) and the `tickEngine` dispatch loop | L2494, L12530 |
| Tracking → Handle manually | **Requests** page (`go('requests',null)`) | L2539 |
| Tracking → Open trip | Trip 360° of the newly created `DB.liveTrips` row | L2539 |
| Tracking map | `subDispatchMapHTML` — shared with the subscription dispatch flow (`renderSubDispatchUI` L4991) | L4979 |
| SLA breach | ops notification centre + toast + audit `sla_breach` | L12546–L12549 |
| Accepted request | **Live Ops** (`renderLiveOps`), **Requests**, **Dashboard**, nav counts | L12484–L12487 |
| `completeTrip` | back into `DB.trips` (All Trips page), cash reconciliation, corporate policy, driver tiers | L12406–L12474 |
| Daily snapshot | `quickRides`, `cancelRatePct`, `quickRideRevenue` fields | L21252–L21261 |
| `flagTrip` / `unflagTrip` | re-render this table | L4231, L4241 |

---

## 15. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| **All four KPI tiles** — 63 / 26.40 / 6.3% / 332, their deltas (`↑ 9% vs avg`, `SAR / ride`, `4 cancelled`, `20% avg`) and all four bar widths | L1135–L1138 | Pure HTML literals; **no code path updates them** |
| Page prose `On-demand single trips · 63 today · 1,204 this month` | L1133 | Overwritten by `liveSubtitles()` only after the first `%45` tick |
| `subs.quickrides = '63 on-demand rides today'` | L2169 | Top-bar subtitle, never recomputed |
| Sidebar badge literal `63` | L504 | Replaced at runtime by `refreshNavCounts` L9400 |
| Card title *"All quick rides — today"* | L1142 | The table is not date-filtered |
| `directionArrows('one-way')` — literal argument | L3456 | Every route renders as one-way; the round-trip branch is dead here |
| Export filename suffix `_25Jun` | L9212 | Hardcoded date in every export from every page |
| `eta:'3 min to pickup'` on accepted trips | L12483 | Hardcoded, shown by the tracking modal's green box |
| `'TRP-'+(9100+rand(900))` live-trip id | L12482 | Synthetic id range, no collision check |
| `'REQ-'+(500+len+rand(400))` request id | L2488 | Synthetic, no collision check |
| 3 seeded `DB.rideRequests` (REQ-501/502/503) | L2787–L2789 | One pre-breached (`no_drivers`) so the escalation path is visible on first load |
| Per-second accept chance `0.30 + (rating−3)×0.08` | L12561 | Explicitly labelled a simulation of the driver's own app (comment L12556–L12559) |
| `AUTO_OFFER_DELAY_SEC=6`, `OFFER_WINDOW_SEC=12`, SLA 180 s | L11987, L11988, L12544 | Demo-tuned constants |
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK=1` | L9579 | Comment: *"keeps the demo watchable rather than instant"* |
| `REQ_NOW_REF = 25 Jun 2026 09:14` | L9555 | Frozen clock feeding `requestedAt`, surge windows and every relative time |
| `RIYADH_DISTRICTS` coordinates | L7243–L7249 | Schematic `{x,y}` percentages, not geographic |
| `GEO_SCALE_KM=0.14`, `ROAD_CIRCUITY_FACTOR=1.35`, `URBAN_AVG_SPEED_KMH=26` | L7236, L7261, L7262 | Tuning constants (documented in-line as urban-grid approximations) |
| `completeTrip` random `km = 3 + rand()*10` | L12419 | The actual trip distance is unrelated to the districts the operator chose |
| Fallback fare `2.50 + km*1.10 + min*0.35` | L12403 | Duplicate of the Economy rate |
| `resolveAlert` 600 ms fake resolve | L10576–L10589 | No persistence whatsoever |
| `subDispatchMapHTML` grid background | L4988 | CSS gradient "map", not a real basemap |

---

## 16. i18n keys

| Key | English | Arabic | Line |
|---|---|---|---|
| `nav.quickrides` | Quick rides | الرحلات السريعة | L504 / L7906 |
| `sec.operations` | Operations | العمليات | L501 / L7911 |

No `data-i18n` attribute exists anywhere inside `#p-quickrides` (L1132–L1148). The page heading, KPI labels, all 12 column headers, the pricing note, every badge, the empty state, every modal field label, every validation toast and every tracking status string are **English-only literals** — consistent with the explicit scope note at L7897–L7902 (*"Deep page content … stays English-only"*).

RTL: `body.lang-ar` rules exist only for `#stab-general` and `#stab-security` (L394, L398) — nothing in this module.

---

## 17. Gaps, dead code, UNVERIFIED items

1. **The entire KPI strip is fake.** Four tiles with hardcoded numbers, deltas and bar widths (L1135–L1138) sitting above a live table. Real equivalents for three of the four exist elsewhere in the file (L21252–L21256, L9400) but are never wired in. The `↑ 9% vs avg` / `4 cancelled` / `20% avg` deltas have no computable source at all.
2. **"today" is a lie in two places.** The card title (L1142) and the page prose (L1133) claim today-only, but `renderQuickRidesTable` applies **no date filter** (L3443).
3. **`renderQuickRidesTable` is not called by `completeTrip`.** A quick ride finishing while the page is open leaves the table stale until re-navigation (`completeTrip` re-renders Live Ops, Dashboard and Subscriptions, L12470–L12473, but not this table).
4. **The Review button does nothing.** `resolveAlert` (L10576) fades a row and toasts; no DB field is written, no audit entry is made, and the row returns on the next render.
5. **`directionArrows`'s round-trip branch is unreachable from this page** — the only call site passes the literal `'one-way'` (L3456). `DB.trips` records carry no `direction` field.
6. **The Trip ID cell omits the flag glyph.** All Trips shows `🚩` and a red row tint for `flagged` (L3424–L3425); this table tints only on `/cancel/i` and never shows the flag — a corporate-policy-violating quick ride is invisible here even though `flagTrip` explicitly re-renders this table (L4231).
7. **`nm2()` is bypassed.** Rows use `rider.name` / `drv.name` from the fallback object (L3447–L3448, L3455–L3456) instead of `nm2()`, so an unknown id renders as the raw id in a chip alongside `★new`.
8. **`lvlCls` maps `'standard'` to `b-silver`** (L3450) — the `lvlBadge` helper (L3260) maps `standard` to `b-grey`. Same tier, two colours.
9. **Fare / driver-earn cells are unformatted strings** (`t.fare||'0.00'`, `t.driverEarn||'—'`, L3459–L3460) — no `toFixed`, unlike All Trips.
10. **The export omits three visible columns** (Tip, Driver earns, Pay) and filters on `kind !== 'Subscription'` rather than `kind === 'Quick ride'` (L9178–L9179).
11. **The estimated fare is never persisted or honoured.** `commitNewRideRequest` stores no `km`/`min`/`fare` (L2489); `completeTrip` regenerates distance randomly (L12419). The number the operator quotes to a caller has no relationship to what is charged.
12. **`Large` is missing from the vehicle-type select** (L2459) although `DB.quickRideTypes` defines it and the pricing page can edit it (L13911). A `Large` request cannot be created from the ops panel.
13. **Same-district pickup and destination is not blocked.** `computeRouteKm` returns `null` (L7252), the preview silently reverts to the placeholder, and `commitNewRideRequest` still accepts the request (its only checks are non-empty, L2486).
14. **Request-id collisions are possible.** `500 + length + rand(400)` (L2488) has no uniqueness check, and `DB.rideRequests` is an array with no index.
15. **The rider select has no `onChange`** (L2454) — selecting a rider does not refresh the estimate; only pickup/dest/type do.
16. **`openRideRequestTracking` has exactly one caller** (L2495). There is no way to reopen tracking for an existing request from the Requests page or anywhere else; once closed, the modal is gone for that request.
17. **The tracking modal matches the live trip by rider, not by request id** (L2521). A rider with a second concurrent live trip would resolve to the wrong record.
18. **The tracking interval is not cleared on `closeModal()`.** Only `closeRideRequestTracking` clears it (L2512). Any other path that closes the modal (e.g. an overlay click or `closeModal()` from elsewhere) leaves a 1 s interval rewriting `#modal-content` forever. UNVERIFIED — `closeModal()` body was not read, so whether it clears intervals is unconfirmed.
19. **`subDispatchMapHTML` computes `km` and `eta` that this modal discards** (L4989–L4990 vs L2534–L2537) — the subscription dispatch UI displays them (L5019), the ride-request tracker does not.
20. **The map is blank when `mapPos` is missing.** `subDispatchMapHTML` emits pins only for entities with a `mapPos` (L4981–L4982); during `searching` there is no driver at all, so a 160 px empty grid is rendered with no placeholder or explanation.
21. **`commitNewRideRequest` has no permission check.** The gate is on `openNewRideRequestModal` (L2450); the commit function itself (L2479) is directly callable.
22. **No page-level permission guard.** `PAGE_PERMS.quickrides` exists (L10578) but nothing consults it.
23. **Seeded request pickup/dest values are not `RIYADH_DISTRICTS` members** (`King Saud University`, `Kingdom Tower`, `Airport T5`, `KAFD`, `Al Sahafa District`, `Al Wurud District` — L2787–L2789), so any code path computing a route from them yields `null`.
24. **UNVERIFIED — `nearestAvailableDrivers(riderId, count, 'quick', elapsedSec)`.** Referenced at L12504; the body and the `DB.searchPhases` radius-expansion table (L13920+) were not read, so the exact radius progression behind VIP's `effectiveElapsed=999` is unconfirmed.
25. **UNVERIFIED — `bumpWait`, `playAlertBeep`, `openInstantReqFromToast`, `renderRequestsPage`, `refreshNavCounts` internals.** Called from the dispatch loop (L12533, L12546–L12548, L2494) but not read.
26. **UNVERIFIED — `zoneOfPickup` / `DB.zones`.** `zoneCongestionMultiplier` (L7263) depends on `z.demand` / `z.supply`; the zone store was not read, so whether any zone actually alters the tracking ETA is unconfirmed.
27. **UNVERIFIED — `closeModal()` and `selDriver()` behaviour** (used by the export modal's radio cards, L9192).

---

## 18. Line-number index

### HTML
| Lines | Content |
|---|---|
| L504 | Sidebar item `go('quickrides',this)`, `data-i18n="nav.quickrides"`, badge `#sbb-qr` |
| L692 | Dashboard card "⚡ Quick rides — today" + "All quick rides" button |
| L1131–L1148 | `#p-quickrides` page block |
| L1133 | Header, prose, **📞 New ride request**, **Export CSV** |
| L1134–L1139 | `.g4` — 4 hardcoded KPI tiles |
| L1140 | Pricing-moved note → `go('plans', findSbEl('plans'))` |
| L1141–L1147 | Card, `#quickrides-table`, 12-column thead, `#quickrides-tbody` |

### JavaScript
| Lines | Function / data |
|---|---|
| L2168 / L2169 | `titles.quickrides` / `subs.quickrides` |
| L2441–L2448 | Design comment for the manual ride-request flow |
| L2449–L2467 | **`openNewRideRequestModal`** |
| L2468–L2478 | **`updateNrrFareEstimate`** |
| L2479–L2502 | **`commitNewRideRequest`** |
| L2496–L2498 | Tracking design comment, `_rrTrackInterval`, `_rrTrackState` |
| L2503–L2510 | **`openRideRequestTracking`** |
| L2511–L2515 | **`closeRideRequestTracking`** |
| L2516–L2541 | **`renderRideRequestTracking`** |
| L2542–L2551 | `openSupportTicket` |
| L2552–L2560 | `createTicketFor` |
| L2675–L2681 | Seeded quick-ride trips |
| L2786–L2790 | `DB.rideRequests` seed |
| L3126 | `requirePerm` |
| L3260 | `lvlBadge` (compare `lvlCls` L3450) |
| L3440–L3467 | **`renderQuickRidesTable`** |
| L3443–L3444 | id list + empty state |
| L3445–L3466 | row template |
| L3468–L3476 | **`directionArrows`** |
| L4192–L4243 | Trip-level actions (tip / receipt / flag / unflag) — see `06a` |
| L4244–L4278 | `buildTripProfile` |
| L4467 | `driverCommissionRate` |
| L4979–L4990 | **`subDispatchMapHTML`** |
| L4991+ | `renderSubDispatchUI` (the other consumer of the map) |
| L5336–L5354 | `customSelectHTML` (hidden `<input id=fieldId>` at L5352) |
| L7007–L7011 | `findSbEl` |
| L7236 | `GEO_SCALE_KM` |
| L7243–L7249 | **`RIYADH_DISTRICTS`** |
| L7250–L7256 | **`computeRouteKm`** |
| L7257–L7261 | `geoDistanceKm`, `ROAD_CIRCUITY_FACTOR` |
| L7262 | `URBAN_AVG_SPEED_KMH` |
| L7263–L7269 | `zoneCongestionMultiplier` |
| L7273–L7280 | `estimateEtaMin` |
| L7897–L7920 | `LANG_STRINGS` (`nav.quickrides` L7906) |
| L8808 | `go()` hook → `renderQuickRidesTable()` |
| L9175–L9183 | `exportRows` (`quickrides` branch L9178–L9179) |
| L9184–L9186 | `buildCSV` / `esc` |
| L9187–L9203 | `exportData` modal |
| L9204–L9221 | `doExport` |
| L9393–L9401 | `refreshNavCounts` (`sbb-qr` L9400) |
| L9555 | `REQ_NOW_REF` |
| L9579 | `SUBREQ_TIME_ACCEL_MIN_PER_TICK` |
| L9645–L9650 | `fmtReqNowLabel` |
| L10348–L10375 | Dashboard quick-ride KPI (`'25 Jun'` date filter) |
| L10576–L10589 | `resolveAlert` |
| L10578 | `PAGE_PERMS.quickrides` |
| L11987–L11988 | `AUTO_OFFER_DELAY_SEC`, `OFFER_WINDOW_SEC` |
| L11989–L11995 | `sendDriverOffer` |
| L11996–L12011 | `driverDeclineOrTimeout` |
| L12101–L12130 | `maybeGenerateCashEvent` (quick rides only) |
| L12276–L12280 | `switchPricingSubTab('quickrides')` |
| L12286–L12340 | Surge config UI + `saveSurgeConfig` |
| L12345–L12388 | Ride-type table UI + `saveRideTypes` |
| L12389–L12400 | `currentSurgeMultiplier` |
| L12401–L12405 | **`quickRideFare`** |
| L12406–L12474 | `completeTrip` |
| L12476–L12494 | **`driverAcceptOffer`** |
| L12497–L12507 | **`nextOfferCandidate`** (VIP ordering L12503–L12506) |
| L12509–L12580 | **`tickEngine`** ride-request loop (searching L12533–L12552, offered L12553–L12564, no_drivers L12565–L12570) |
| L13861–L13862 | `DB.surgeConfig`, `DB.multiStopConfig` |
| L13883–L13887 | `DB.surgeSchedule` |
| L13908–L13912 | **`DB.quickRideTypes`** |
| L14535–L14543 | `kpiScrollTo` |
| L21236–L21256 | `liveSubtitles` (quick-rides subtitle L21254–L21255) |
| L21249–L21266 | `captureDailySnapshot` (quick-ride counts, cancel rate, revenue) |

---

## 19. Seed generator `pushRide()` (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6.1, item P2-8). §15 of this document already records seeded ride-request counts; this section names the loop that produces them — **and corrects the count Pass 1 stated.**

`pushRide(status, waitRange, dayOffset)` — **L9837–L9845**, an inner function of `seedMoreRequests()` (**L9787**), which runs from the deferred boot `setTimeout` at **L14557**.

### 19.1 Correction to Pass 1

Pass 1 §6.1 records that `pushRide` *"seeds 40 ride requests across `searching` (14, L9846), `no_drivers` (13, L9847), `assigned` (13, L9848)"*.

**There are four loops, not three, and the total is 53, not 40.** Pass 1 stopped at L9848 and missed the `expired` loop at L9849.

| Line | Loop | `status` | `waitRange` | `dayOffset` | Count |
|---:|---|---|---|---:|---:|
| **L9846** | `for(var s1=0;s1<14;s1++)pushRide('searching',[10,150],0)` | `searching` | 10–150 s | 0 | 14 |
| **L9847** | `for(var s2=0;s2<13;s2++)pushRide('no_drivers',[180,420],0)` | `no_drivers` | 180–420 s | 0 | 13 |
| **L9848** | `for(var s3=0;s3<13;s3++)pushRide('assigned',[0,0],1)` | `assigned` | `[0,0]` | 1 | 13 |
| **L9849** | `for(var s4=0;s4<13;s4++)pushRide('expired',[0,0],1)` | `expired` | `[0,0]` | 1 | **13** |
| | | | | **total pushed to `DB.rideRequests`** | **53** |

The `pushSub` figure Pass 1 gives for `07c` (40 across three loops, L9866–L9868) **is** correct; only the `pushRide` count was short.

### 19.2 The record it builds — L9840–L9844

| Field | Source | Line |
|---|---|---:|
| `id` | `'REQ-'+reqSeq` where `reqSeq` starts at **600** (L9836) and pre-increments (L9839) → **REQ-601 … REQ-653** | L9836, L9839, L9841 |
| `rider` | `randRider()` → `pick(newRiderIds)` (L9829) — always one of the **45** generated riders (`09a-riders.md` §20), never one of the ten authored ones | L9829, L9841 |
| `pickup` | `randRoute()[0]` = `pick(districts)+' District'` | L9830–L9833, L9838, L9841 |
| `dest` | `randRoute()[1]` = `pick(landmarks)`, re-drawn once if it collides with the pickup | L9830–L9833, L9841 |
| `type` | `pick(['Economy','Comfort'])` — `typeCycle` L9835 | L9835, L9842 |
| `waiting` | `randWaiting(waitRange[0], waitRange[1])` → `'<m>:<ss>'` | L9825–L9828, L9842 |
| `status` | the loop's argument | L9842 |
| `requestedAt` | `ts(dayOffset, 7+floor(random()*3), floor(random()*60))` → hours **07–09**, any minute | L9821–L9824, L9843 |

### 19.3 `randWaiting(minSec,maxSec)` — L9825–L9828

```js
function randWaiting(minSec,maxSec){
  var s=Math.floor(minSec+Math.random()*(maxSec-minSec));
  return Math.floor(s/60)+':'+pad(s%60);
}
```

It returns a **`m:ss` display string**, not a number of seconds. The three distinct ranges are what make the seeded board look plausible:

| `status` | Range | Rendered span | Reading |
|---|---|---|---|
| `searching` | `[10,150]` | `0:10` – `2:29` | fresh requests, still hunting |
| `no_drivers` | `[180,420]` | `3:00` – `6:59` | waited long enough to have failed |
| `assigned` / `expired` | `[0,0]` | **always `0:00`** | the wait is over, so the field is zeroed |

With `[0,0]`, `maxSec-minSec` is 0, so `Math.random()` is multiplied by zero and `s` is always 0 — deterministic, not merely likely.

**Consequence:** `waiting` cannot be sorted or thresholded numerically without parsing. `'10:00'` and `'2:29'` compare in the wrong order as strings.

### 19.4 The demo clock

`ts(dayOffset,h,m)` — **L9821–L9824** — computes `day = 25 - dayOffset` and formats `'<dd> Jun <hh>:<mm>'`. The source states the anchor at L9822: *"'today' in the demo clock is 25 Jun 2026"*.

| `dayOffset` | Date | Used by |
|---:|---|---|
| 0 | **25 Jun** | `searching` (L9846), `no_drivers` (L9847) |
| 1 | **24 Jun** | `assigned` (L9848), `expired` (L9849) |

So all 27 live-ish requests are dated today and all 26 resolved ones are dated yesterday — a clean split that makes the "current window" framing on this page hold without any filtering logic.

### 19.5 Consequences for anything reading these records

- **`reqSeq` starts at 600** (L9836) with no collision check against ids already present in `DB.rideRequests`. `seedMoreRequests` is invoked once (L14557), so no collision occurs; a second invocation would re-issue REQ-601 onward.
- **`waiting` is a display string** (L9842, L9827) — see §19.3.
- **Nothing is seeded deterministically.** `Math.random()` is used directly, so the 53 records differ on every page load: different riders, routes, vehicle types, wait times and minutes. Only the counts, the statuses and the day split are stable.
- Every `rider` id resolves, because `randRider()` draws only from `newRiderIds` (L9816, L9829) — riders that `makeRider` has already written into `DB.riders` (L9808).
- `pushRide` has **5 references**: the declaration (L9837) and the four loop call sites (L9846–L9849).

### 19.6 Sibling generators

`makeRider` (L9800–L9818, the 45-rider pool) is documented in `09a-riders.md` §20; `pushSub` (L9854–L9865, 40 subscription requests) in `07c-requests.md` §20. All three share `pick` (L9796), `pad` (L9797), `ts` (L9821), `randRider` (L9829) and `randRoute` (L9830) inside the one `seedMoreRequests()` closure.

### 19.7 Line-number index for §19

| Symbol | Lines |
|---|---|
| `seedMoreRequests()` | 9787–9869 |
| `pick(arr)` / `pad(n)` | 9796 / 9797 |
| `makeRider()` (see `09a` §20) | 9800–9818 |
| 45-rider loop | 9819 |
| **`ts(dayOffset,h,m)`** + demo-clock comment | **9821–9824** |
| **`randWaiting(minSec,maxSec)`** | **9825–9828** |
| `randRider()` | 9829 |
| `randRoute()` | 9830–9833 |
| `typeCycle` | 9835 |
| `reqSeq = 600` | 9836 |
| **`pushRide(status,waitRange,dayOffset)`** | **9837–9845** |
| — `reqSeq` pre-increment | 9839 |
| — record literal | 9840–9844 |
| **`searching` loop (14)** | **9846** |
| **`no_drivers` loop (13)** | **9847** |
| **`assigned` loop (13)** | **9848** |
| **`expired` loop (13) — missed by Pass 1** | **9849** |
| `pushSub()` (see `07c` §20) | 9854–9865 |
| Boot `seedMoreRequests()` | 14557 |
