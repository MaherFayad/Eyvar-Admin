# Module: Zones — demand vs supply

> Source: `eyvar_ops_panel_v40_fixed.html` | Page id: `zones` (container `#p-zones`) | HTML lines: **L1303–L1321**

---

## 1. Purpose

A supply/demand map of Riyadh districts, framed by the source comment (`L13797`) as *"ZONES — demand vs supply, steering offers, and momentum"* and by the page header as *"Where requests fail to match — the recruitment map"* (`L1306`).

Three questions the page answers, each as its own card:

| # | Card | Container | HTML | Renderer |
|---|---|---|---|---|
| 0 | KPI strip (4 clickable filter tiles) | `#zones-kpis` | `L1308` | inline in `renderZonesPage()` `L14135-14139` |
| 1 | 📈 Subscription demand momentum | `#zone-momentum` | `L1309-1312` | `renderZoneMomentum()` `L14058` |
| 2 | Zone health (worst-first) | `#zones-list` | `L1313-1316` | inline in `renderZonesPage()` `L14147-14171` |
| 3 | ⏰ Known demand by hour (hidden until a zone is clicked) | `#zone-hourly-card` / `#zone-hourly-body` | `L1317-1320` | `showZoneHourly(zoneName)` `L14091` |

Two operator levers exist: **Steer drivers** (short-term paid incentive to reposition) and **Queue recruitment** (long-term acquisition list). The design rationale is stated in-source (`L13990-13993`): *"Voluntary incentive, Uber-style: we can't order independent drivers to a zone, so we pay them to want to go. One active offer per zone to avoid stacking spend."*

---

## 2. Entry points & routing

| Item | Detail | Line |
|---|---|---|
| Page container | `<div class="page" id="p-zones">` | `L1304` |
| Sidebar section | under `sec.growth` "Growth" | `L521` |
| Sidebar nav item | `<div class="sb-item" onclick="go('zones',this)">` … `<span class="sb-lbl" data-i18n="nav.zones">Zones</span><span class="sb-badge a" id="sbb-zones">0</span>` | `L523` |
| Router hook | `if(id==='zones'){renderZonesPage();}` inside `window.go` | `L8800` (fn `L8774`) |
| Toolbar title | `titles.zones='Zones'` → `#tb-title` | `L2168`, `L8785` |
| Toolbar subtitle | `subs.zones='Demand vs supply by district'` → `#tb-sub` | `L2169`, `L8786` |
| Boot behaviour | `renderZonesPage()` is **not** in the boot `setTimeout` block (`L14556-14600`) — the page and its sidebar badge stay at their static HTML values until the user first visits. | `L14556-14600` |
| Tick re-render | `tickSteerOffers()` runs every 5th tick (`L12575`) and re-renders the page **only if it is currently visible** (`L14186-14188`) | `L12575`, `L14186` |
| Page-level view gate | **None.** `go('zones',…)` performs no permission check. | `L8800` |
| Nav history | `go()` calls `pushHistory()` unless `isBack` | `L8779` |

### Inbound navigation from other modules

| From | Trigger | Line |
|---|---|---|
| Predictive Signals → structural zone patterns | zone name click and `Open zone` button → `go('zones',null)` | `L14362-14363` |
| Steering-offer toast (any page) | toast click callback → `go('zones',null)` | `L14184` |
| Steering-offer notification | `pushOpsNotification(...,function(){go('zones',null);})` | `L14034` |

### Call chain

```
go('zones')                                        L8774 / L8800
└── renderZonesPage()                              L14131
    ├── DB.zones.slice().sort(byFailRateDesc)      L14132
    │   └── zoneFailRate(z)                        L13974
    ├── starved count                              L14133
    ├── #zones-kpis innerHTML (4 tiles)            L14135-14139
    ├── #sbb-zones textContent = starved           L14140
    ├── renderZoneMomentum()                       L14058
    │   ├── zoneSubMomentum()                      L14041
    │   │   ├── zoneOfPickup(r.pickup)             L13976
    │   │   └── subReqValue(r)                     L9750  (reads PLANS L4389)
    │   ├── fmtSAR(n)                              L4394
    │   └── showZoneHourly / openSteerOffer links
    └── #zones-list innerHTML (health table)       L14147-14171

showZoneHourly(zoneName)                           L14091
├── reads DB.subscriptionRequests                  L14105-14107
├── reads DB.upcomingSubTrips                      L14108-14111
└── card.scrollIntoView(...)                       L14127

filterZones(f)                                     L14130
└── renderZonesPage(); kpiScrollTo('zones-list')   L14535

tickSteerOffers()                                  L14175   (from tickEngine L12575)
```

---

## 3. Layout map

```
#p-zones                                                          L1304
├── .ph  header                                                   L1305-1307
│   └── .ph-l  h1 "🗺️ Zones — demand vs supply"
│              + <p id="zones-sub"> "Where requests fail to
│                match — the recruitment map"                     L1306
├── .g4 #zones-kpis   (4 clickable KPI tiles)                     L1308
├── .card  "📈 Subscription demand momentum" · note "Rising
│           sign-up requests by zone — recurring contracts,
│           not one-off rides"                                    L1309-1312
│   └── #zone-momentum                                            L1311
├── .card  "Zone health" · note "Sorted by match-failure rate —
│           worst first · click a zone for its hourly demand"     L1313-1316
│   └── #zones-list  (max-height 460px, scroll-y)                 L1315
└── .card #zone-hourly-card  style="display:none" initially       L1317-1320
    ├── .ch  h2 #zone-hourly-title "⏰ Known demand by hour"
    │        · note "From the subscription schedule — this is
    │          KNOWN demand, not a forecast"                      L1318
    └── #zone-hourly-body                                         L1319
```

---

## 4. Data model & fields

### 4.1 `DB.zones` — array of zone records, `L13952-13959`

| Attribute | Type | Meaning | Mutated at runtime? |
|---|---|---|---|
| `name` | string | District label; may contain `' / '` as an alias separator (`'KAFD / Olaya'`) — split on that token by `zoneOfPickup` (`L13979`) | **No** |
| `demand` | integer | "Active demand" — count of open requests attributed to the zone | **No — static seed** |
| `supply` | integer | "Available drivers" in the zone | **No — static seed** |
| `failures30d` | integer | Failed matches in the last 30 days | **No — static seed** |

There is **no** `id`, `city`, `lat/lng`, `polygon`, `active` flag, or timestamp. The zone list is fixed at 6 rows and cannot be added to, edited, or removed from anywhere in the UI (§18).

Seed data (**all hardcoded**, `L13953-13958`), with derived values:

| name | demand | supply | failures30d | ratio `demand/supply` | failRate `round(failures30d/demand*100)` | needed `max(0, ceil(demand/3) − supply)` | priority |
|---|---|---|---|---|---|---|---|
| Al Narjis | 14 | 2 | 11 | 7.0 | 79% | 3 | 🔴 Recruit now |
| Al Sahafa | 9 | 3 | 6 | 3.0 | 67% | 0 | 🔴 Recruit now |
| KAFD / Olaya | 22 | 12 | 4 | 1.83 | 18% | 0 | 🟢 Healthy |
| Al Malaz | 8 | 6 | 2 | 1.33 | 25% | 0 | 🟠 Watch (fr = 25) |
| Qurtubah | 6 | 5 | 1 | 1.2 | 17% | 0 | 🟢 Healthy |
| Al Yasmin | 11 | 4 | 7 | 2.75 | 64% | 0 | 🔴 Recruit now (fr ≥ 50) |

Resulting page-load values: **6 zones tracked**, **2 supply-starved** (Al Narjis 7.0, Al Sahafa 3.0), **31 failed matches (30d)**, **0 active steering offers**, sidebar badge **`2`** (once the page has been visited).

### 4.2 `DB.steerOffers` — array, initialised empty `L13960`

Created only by `commitSteerOffer` (`L14029`):

| Field | Type | Source | Notes |
|---|---|---|---|
| `zone` | string | `zoneName` argument | matches `DB.zones[].name` |
| `amount` | number (SAR) | `#st-amt`, `parseFloat()\|\|12` | bonus per completed trip in the zone |
| `cap` | number (SAR) | `#st-cap`, `parseFloat()\|\|300` | total budget ceiling |
| `spent` | number (SAR) | starts `0` | incremented by `tickSteerOffers` |
| `accepted` | integer | starts `0` | incremented by `tickSteerOffers` |
| `sentTo` | integer | `steerableDrivers().length` at creation | **display/audit only, never re-read after creation** |
| `minutesLeft` | integer | `#st-dur`, `parseInt()\|\|120` | decremented by `tickSteerOffers` |
| `status` | `'active'` \| `'closed'` | starts `'active'` | set to `'closed'` by `tickSteerOffers` |

### 4.3 `DB.recruitmentQueue` — array, initialised empty `L13961`

Created only by `queueRecruitment` (`L13997`): `{zone, queuedAt: fmtReqNowLabel(), status: 'Queued'}`.
`status` is written once as `'Queued'` and **never changed** — there is no dequeue, complete, or cancel action anywhere (§18).

### 4.4 Inputs to the derived views (read-only from other modules)

| Source | Fields used | Where |
|---|---|---|
| `DB.subscriptionRequests` (`L2794`) | `pickup`, `requestedAt`, `status`, `preferredTime` | `zoneSubMomentum` `L14043-14049`, `showZoneHourly` `L14105-14107` |
| `DB.upcomingSubTrips` (`L6177`) | `route`, `scheduledTime`, `rider` | `showZoneHourly` `L14108-14111` |
| `DB.drivers` | `status`, id | `steerableDrivers` `L13986-13989` |
| `DB.complianceSuspensions` | keyed by driver id | `steerableDrivers` `L13987` |
| `driverLiveState(id).busy` (`L7283`) | | `steerableDrivers` `L13987` |
| `PLANS` (`L4389`) | `.eco` / `.comfort` per cadence | `subReqValue` `L9750-9754` |

---

## 5. Business rules & formulas — every formula written out

### 5.1 Zone failure rate — `zoneFailRate(z)` `L13974`

```
failRate% = z.demand > 0 ? round(z.failures30d / z.demand * 100) : 0
```
Colour bands (`L14158`): red when `fr >= 50`, `--amber-dk` when `25 <= fr < 50`, green when `fr < 25`.

### 5.2 Demand : supply ratio — `renderZonesPage` `L14151`, `L14156`

```
ratio = z.supply > 0 ? z.demand / z.supply : Infinity
display = z.supply > 0 ? ratio.toFixed(1)+' : 1' : '∞'
```
Row background is tinted `var(--red-lt)` when `ratio >= 3` (`L14153`).

### 5.3 Supply-starved definition (used in **four** places)

```
starved(z) = z.supply > 0 && z.demand / z.supply >= 3
```
- KPI tile 2 count + sidebar badge — `L14133`, `L14140`
- `_zonesFilter === 'starved'` table filter — `L14144`
- Momentum "starved" signal component — `L14065`
- Predictive Signals structural-shortage list (**plus** `zoneFailRate >= 50`) — `L14358`

Note the `supply > 0` guard means a zone with **zero** drivers is **not** counted as starved (a divide-by-zero avoidance that inverts the intent). No seed zone has `supply === 0`, so this is latent.

### 5.4 Recruitment priority badge — `L14153`

```
if (ratio >= 3 || failRate >= 50)   → 🔴 "Recruit now"   (b-red)
else if (ratio >= 2 || failRate >= 25) → 🟠 "Watch"      (b-amber)
else                                → 🟢 "Healthy"       (b-green)
```

### 5.5 Drivers needed — `L14154`

```
needed = max(0, ceil(z.demand / 3) − z.supply)      // comment: "healthy target: ≤3 demand per driver"
```
Rendered as a sub-line `"needs +N driver(s)"` only when `needed > 0` (`L14159`).

### 5.6 Subscription demand momentum — `zoneSubMomentum()` `L14041-14057`

```
for each r in DB.subscriptionRequests:
    z = zoneOfPickup(r.pickup)                       // L14044
    if z is null: skip                               // requests outside a tracked zone are dropped
    day = parseInt(r.requestedAt.split(' ')[0], 10)  // e.g. "25 Jun 07:45" → 25
    if day >= 25:  byZone[z].today++
    else:          byZone[z].prior++
    if r.status === 'pending':
        byZone[z].pendingNow++
        byZone[z].valueNow += subReqValue(r)

priorAvg   = m.prior / 2            // comment L14053: "seeded data spans ~2 prior days"
growthPct  = priorAvg > 0 ? round((m.today − priorAvg) / priorAvg * 100)
                          : (m.today > 0 ? 100 : 0)
sort: descending by growthPct                        // L14056
```
`subReqValue(r)` (`L9750`): `PLANS[r.plan]` → `r.vehicle === 'Comfort' ? p.comfort : p.eco`; `0` when the plan key is unknown.
`PLANS` values (`L4390-4392`): weekly 86.50 / 122.50, biweekly 164.35 / 232.50, monthly 344.52 / 487.00.

**The `day >= 25` cut-off is a hardcoded magic number** matching the demo clock date (25 Jun 2026, `REQ_NOW_REF` `L9555`); it does not follow the clock as the tick engine advances it (`L9680`).

### 5.7 Momentum signal badge — `L14065-14069`

```
starved = zone && zone.supply > 0 && zone.demand / zone.supply >= 3
hot     = m.growthPct >= 50 && m.today >= 3

hot && starved            → b-red   "🔥 Growing + starved — act now"
hot                       → b-amber "🔥 Growing demand"
m.growthPct <= −30        → b-grey  "Cooling"
otherwise                 → b-green "Steady"
```
Row background `#FFF9F0` when `hot` (`L14070`). The "Steer drivers here" button gets `btn p` (primary styling) instead of plain `btn` when `hot` (`L14079`).

### 5.8 Zone congestion multiplier (consumed by ETA, not shown on this page) — `zoneCongestionMultiplier(zoneName)` `L7263-7269`

```
if (!zoneName || !DB.zones)  → 1
z = DB.zones.find(x => x.name === zoneName)
if (!z || !z.supply)         → 1
ratio = z.demand / z.supply
return clamp(0.85 + ratio * 0.18, 0.9, 1.6)
```
Used by `estimateEtaMin(straightKm, driverAddr, riderAddr)` (`L7273-7280`):
```
roadKm  = straightKm * ROAD_CIRCUITY_FACTOR
zone    = zoneOfAddress(riderAddr) || zoneOfAddress(driverAddr)     // L7276
minutes = (roadKm / URBAN_AVG_SPEED_KMH) * 60 * zoneCongestionMultiplier(zone)
return max(1, round(minutes))
```
With the seed data this yields: Al Narjis ×1.6 (capped from 0.85 + 7.0×0.18 = 2.11), Al Sahafa ×1.39, KAFD/Olaya ×1.18, Al Malaz ×1.09, Qurtubah ×1.07, Al Yasmin ×1.345.

### 5.9 Zone lookup from free text — `zoneOfPickup(pickup)` `L13976-13982`

```
p = String(pickup||'').toLowerCase()
hit = DB.zones.find(z =>
        z.name.toLowerCase().split(' / ').some(part => p.indexOf(part) >= 0))
return hit ? hit.name : null
```
Substring match on the lowercased address, aliasing on `' / '`. `zoneOfAddress(addr)` (`L7272`) is a thin delegate to the same function.

With the 5 seeded subscription requests (`L2795-2799`): `Al Yasmin District` → Al Yasmin, `Al Narjis District` → Al Narjis, `Al Malaz` → Al Malaz, and **`Al Rabwah District` (×2) matches nothing and is silently dropped** from momentum and hourly views.

### 5.10 Steerable driver eligibility — `steerableDrivers()` `L13985-13989`

```
Object.keys(DB.drivers).filter(d =>
      DB.drivers[d].status !== 'pending'
   && !DB.complianceSuspensions[d]
   && !driverLiveState(d).busy )
```
Comment (`L13983-13984`): *"Drivers we can legally invite (never order) to reposition: available (not on a trip), not suspended."*
**Note: this is a platform-wide list — it is NOT filtered by zone proximity.** Every eligible driver anywhere receives every zone's offer.

### 5.11 Steering offer lifecycle — `tickSteerOffers()` `L14175-14189`

Runs every 5th engine tick (`L12575`). For each offer with `status === 'active'`:

```
1.  o.minutesLeft −= SUBREQ_TIME_ACCEL_MIN_PER_TICK        // = 1 (L9579)
2.  if (Math.random() < 0.25 && o.spent + o.amount <= o.cap):
        o.accepted++
        o.spent += o.amount                                 // SIMULATED acceptance — L14180
3.  if (o.minutesLeft <= 0 || o.spent >= o.cap):
        o.status = 'closed'
        logAction('steer_offer_closed','zone',o.zone,
          'Steering offer for <zone> closed — <accepted> trips incentivized,
           <spent> of <cap> spent', {}, {})                  // L14183
        toast('📣 <zone> offer ended — <accepted> incentivized trips,
               <spent> spent','info', → go('zones'))         // L14184
4.  if (#p-zones has class 'on') renderZonesPage()           // L14186-14188
```
Step 2 is an explicit demo simulation — a **25% chance per tick** that one driver accepts. Comment `L14172-14174`: *"Steering offers wind down with the demo clock … the same auto-pause discipline as promo campaigns, so steering spend can never run away either."* (Unlike promos, this auto-close **is** actually implemented.)

### 5.12 One-offer-per-zone rule — `L14005-14007`

```
if (DB.steerOffers.some(o => o.zone === zoneName && o.status === 'active'))
    toast('An offer is already live for <zone> — let it run before stacking another','warn')
    return    // modal never opens
```

### 5.13 One-queue-per-zone rule — `L13996`

```
if (DB.recruitmentQueue.some(r => r.zone === zoneName && r.status === 'Queued'))
    toast('⚠ <zone> is already queued','warn')
    return
```

### 5.14 Known demand by hour — `showZoneHourly(zoneName)` `L14091-14128`

```
hours = { 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0 }        // fixed window 05:00–11:00, L14099

addTime(t):
    m = /(\d{1,2}):/.exec(String(t||''))               // first "H:" or "HH:" in the string
    if (!m) return
    h = parseInt(m[1],10)
    if (hours[h] != null) hours[h]++                   // out-of-window hours silently dropped

source A — subscription requests:                       L14105-14107
    for r in DB.subscriptionRequests:
        if zoneOfPickup(r.pickup) === zoneName && r.status !== 'expired':
            addTime(r.preferredTime)

source B — upcoming subscription trips:                 L14108-14111
    for t in DB.upcomingSubTrips:
        if t.route && zoneOfPickup(t.route.split('→')[0]) === zoneName:
            addTime(t.scheduledTime)

max        = max(all hour counts, 1)                    // L14112
barHeight% = max(4, round(v / max * 100))               // L14118
overloaded = zone && v > zone.supply                    // L14117
```
Bars render red (`var(--red)`) when `overloaded`, blue (`var(--blue)`) otherwise, at `opacity:.85`, `max-width:44px`, in a 130px-tall flex row (`L14114-14122`). The count label above each bar turns red when overloaded (`L14119`).

**Bug (`L14109`):** the line `var sub = Object.keys(DB.subscriptions).map(...).find(s => s.rider === t.rider);` computes `sub` and then never uses it — dead code inside the loop.

**AM/PM bug:** `addTime` matches only the numeric hour, so `'07:00 AM'` and a hypothetical `'07:00 PM'` both land in bucket 7. With the 05–11 window and the seeded morning-commute data this is currently harmless, but it is not correct.

### 5.15 Expansion-ready zones (Executive Overview) — `L6951`

```
expansionZones = DB.zones.filter(z => z.supply > 0 && z.demand / z.supply >= 2)
                          .sort((a,b) => (b.demand/b.supply) − (a.demand/a.supply))
```
A **different, looser threshold (≥2)** than this page's starved definition (≥3).

### 5.16 City average failure rate (Executive Overview) — `L6942`

```
avgFail = (c.name === 'Riyadh' && DB.zones.length)
        ? round( Σ zoneFailRate(z) / DB.zones.length )
        : null
```
Hardcoded to the string `'Riyadh'` — every other city shows `—`. Comment (`L6941`): *"this dataset's zones are all within the seed city (Riyadh)"*. Seed value: `round((79+67+18+25+17+64)/6)` = **45%**.

### 5.17 Structural zone pattern (Predictive Signals) — `L14358`

```
structural = DB.zones.filter(z => z.supply > 0 && z.demand/z.supply >= 3 && zoneFailRate(z) >= 50)
```
Seed result: Al Narjis (7.0, 79%) and Al Sahafa (3.0, 67%).

---

## 6. Configuration fields

There are **no persisted configuration fields for this module.** `DB.zones` is a static literal and is never written to. The only "config"-shaped inputs are the three transient fields inside the steering-offer modal:

| Field | Default | Unit | Range | Effect |
|---|---|---|---|---|
| `st-amt` — Bonus per completed trip in zone | `12` | SAR | `min=1 step=1`; commit `parseFloat()\|\|12` | Written to `offer.amount`; drives `spent += amount` per simulated acceptance (`L14180`) |
| `st-dur` — Offer valid for | `120` (option "2 hours", `selected`) | minutes | select: `60` (1 hour), `120` (2 hours), `240` (4 hours) | Written to `offer.minutesLeft`; drives the expiry branch |
| `st-cap` — Budget cap for this offer | `300` | SAR | `min=10 step=10`; commit `parseFloat()\|\|300` | Hard ceiling — offer auto-closes at `spent >= cap` (`L14181`) |

Module-level constants that behave as configuration:

| Constant | Value | Where | Effect |
|---|---|---|---|
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK` | `1` | `L9579` | Minutes deducted from `minutesLeft` per steering tick |
| Steering tick cadence | every 5th engine tick | `L12575` | How often offers age |
| Simulated acceptance probability | `0.25` | `L14180` | Chance one driver accepts per tick |
| Healthy demand-per-driver target | `3` | `L14154` | Drives the "needs +N drivers" figure |
| Hourly window | `5`–`11` | `L14099` | Fixed bucket range for the hourly chart |
| `_zonesFilter` | `'all'` | `L14129` | Module-level filter state; **not reset on navigation** (§18) |

---

## 7. KPIs & metrics

### 7.1 KPI strip — `#zones-kpis`, `L14135-14139` (all four are `.kpi click`)

| # | Label | Value formula | Delta line | Bar width | Colour | onClick | Tooltip |
|---|---|---|---|---|---|---|---|
| 1 | Zones tracked | `DB.zones.length` | "Riyadh districts" (`neu`) | fixed `60%` (**hardcoded**) | default ink | `filterZones('all')` | "Show all zones" |
| 2 | Supply-starved zones | `worst.filter(z => z.supply>0 && z.demand/z.supply>=3).length` | "demand ≥3× supply" (`dn`) | `starved*16` % (**arbitrary factor**) | `var(--red)` | `filterZones('starved')` | "Show only supply-starved zones" |
| 3 | Failed matches (30d) | `DB.zones.reduce((a,z) => a + z.failures30d, 0)` | "lost demand" (`dn`) | fixed `31%` (**hardcoded**) | `var(--amber)` | `filterZones('all')` | "Sorted worst-first below" |
| 4 | Active steering offers | `DB.steerOffers.filter(o => o.status==='active').length` | "incentives live now" (`neu`) | fixed `25%` (**hardcoded**) | `var(--blue)` | `filterZones('offers')` | "Show only zones with a live steering offer" |

`filterZones(f)` (`L14130`) sets `_zonesFilter`, re-renders, then `kpiScrollTo('zones-list')` (`L14535`) — smooth-scrolls the zone-health table into view and flashes it with the `kpi-flash-target` class for 1.5 s.

### 7.2 Per-zone metrics (Zone health table)

| Metric | Formula | Threshold |
|---|---|---|
| Active demand | `z.demand` (raw) | — |
| Available drivers | `z.supply` (raw) | — |
| Demand : supply | §5.2 | row tinted red-lt at `ratio >= 3` |
| Failed matches (30d) | `z.failures30d` (raw) | — |
| Failure rate | §5.1 | red ≥50, amber-dk 25–49, green <25 |
| Recruitment priority | §5.4 | 🔴 / 🟠 / 🟢 |
| Drivers needed | §5.5 | shown only when `> 0` |

### 7.3 Per-zone metrics (Momentum table)

| Metric | Formula | Threshold |
|---|---|---|
| Sub requests today | `m.today` (`requestedAt` day ≥ 25) | — |
| Daily avg before | `(m.prior / 2).toFixed(1)` | — |
| Momentum | `growthPct` (§5.6), prefixed `↑ +` / `↓ ` / none | green >0, red <0, muted =0 (`L14074`) |
| Pending now | `m.pendingNow` | — |
| Pipeline value | `fmtSAR(m.valueNow)` → `N.NN SAR` (`L4394`) | title: *"Estimated SAR value of pending sign-ups here"* |
| Signal | §5.7 | 4 bands |

### 7.4 Hourly-demand metrics

| Metric | Formula |
|---|---|
| Trips scheduled at hour H | `hours[H]` (§5.14) |
| Bar height | `max(4, round(v/max*100))` % of a 130px column |
| Overload flag | `v > zone.supply` |

Footer prose (`L14125`): *"🔴 red bars exceed the zone's `<supply>` available drivers — these exact hours need pre-positioned or newly recruited captains. This is **known** scheduled demand from the subscription book, not a prediction."*

---

## 8. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| KPI tiles 1–3 | `DB.zones` (`L13952`) | static seed | never mutated |
| KPI tile 4 | `DB.steerOffers` (`L13960`) | runtime array | starts empty → renders `0` |
| Sidebar badge `#sbb-zones` | `starved` count | computed | written **only** by `renderZonesPage` (`L14140`) — see §14 |
| Momentum rows | `DB.subscriptionRequests` (`L2794`) via `zoneSubMomentum` | computed | requests outside a tracked zone are dropped |
| Momentum "Pipeline value" | `subReqValue(r)` → `PLANS` (`L4389`) | computed | pending requests only |
| Momentum "Offer live (Nm)" badge | `DB.steerOffers` | runtime | title attr shows `<accepted> accepted so far` (`L14079`) |
| Zone health rows | `DB.zones` sorted by failRate desc | computed sort | `worst` array `L14132` |
| "📣 Recruitment queued" badge | `DB.recruitmentQueue` (`L13961`) | runtime | replaces the Queue button once queued |
| Hourly bars | `DB.subscriptionRequests` + `DB.upcomingSubTrips` (`L6177`) | computed | fixed 05:00–11:00 window |
| Hourly card title | `'⏰ Known demand by hour — ' + zoneName` | computed | `L14097` |
| Hourly footer supply figure | `zone.supply` or `'—'` if the zone is not found | computed | `L14125` |
| `#zones-sub` header sub-line | static HTML | **hardcoded, never updated by JS** | `L1306` |
| Card sub-notes (both cards) | static HTML | hardcoded | `L1310`, `L1314`, `L1318` |
| Momentum footer tip | hardcoded string | literal | `L14086` |
| Steer-offer modal eligible count | `steerableDrivers().length` | computed | `L14009`, `L14019` |

---

## 9. Input fields

No input element exists in the `#p-zones` markup (`L1304-1321`). All inputs belong to the steering-offer modal:

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| `st-amt` | number | "Bonus per completed trip in zone" (suffix span "SAR") | `12` | `min=1 step=1`; `parseFloat()\|\|12` (`L14025`) | `offer.amount` |
| `st-dur` | `<select>` | "Offer valid for" | `120` (option "2 hours" carries `selected`) | `60` = 1 hour, `120` = 2 hours, `240` = 4 hours (`L14016`) | `offer.minutesLeft` |
| `st-cap` | number | "Budget cap for this offer" (suffix span "SAR — offer auto-closes when spent") | `300` | `min=10 step=10`; `parseFloat()\|\|300` (`L14026`) | `offer.cap` |
| `#st-preview` | `<div>` | — | empty | **placeholder element that is never populated** — no code writes to it (§18) | — |

---

## 10. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirm gate |
|---|---|---|---|---|---|---|
| **KPI tile 1 "Zones tracked"** | `filterZones('all')` `L14130` | Sets `_zonesFilter='all'`, re-renders, scroll+flash `#zones-list` | `_zonesFilter` (module var) | none | none | none |
| **KPI tile 2 "Supply-starved zones"** | `filterZones('starved')` | Filters table to `supply>0 && demand/supply>=3` | `_zonesFilter` | none | none | none |
| **KPI tile 3 "Failed matches (30d)"** | `filterZones('all')` | Same as tile 1 | `_zonesFilter` | none | none | none |
| **KPI tile 4 "Active steering offers"** | `filterZones('offers')` | Filters table to zones with an active offer | `_zonesFilter` | none | none | none |
| **Zone name click** (health table, `L14155`) | `showZoneHourly(z.name)` `L14091` | Un-hides `#zone-hourly-card`, sets its title, renders the hour bars, `scrollIntoView({behavior:'smooth',block:'nearest'})` | DOM only | none | none | none |
| **Zone name click** (momentum table, `L14072`) | `showZoneHourly(m.zone)` | Identical | DOM only | none | none | none |
| **Steer drivers** (health table) / **Steer drivers here** (momentum table) | `openSteerOffer(zoneName)` `L14002` | Two gates: `requirePerm('live_ops')` (`L14003`) **and** `requirePagePerm('zones','steer')` (`L14004`); then the one-offer-per-zone check (`L14005`); then renders the modal, computing `steerableDrivers()` for the count | — | broad `live_ops` **and** page `zones.steer` | `permission_denied` on failure | none |
| **Send offer to N drivers** (modal) | `commitSteerOffer(zoneName)` `L14023` | Re-checks `requirePagePerm('zones','steer')` (`L14024`); reads the 3 fields; `DB.steerOffers.push({...})`; `closeModal()`; `renderZonesPage()`; audit; toast (non-notifying, `notify=false`); `pushOpsNotification('alert','Steering offer live — <zone>','+<amt>/trip · cap <cap> · <dur> min', → go('zones'))` | `DB.steerOffers`, notification centre | page `zones.steer` | `steer_offer` / entity `zone` / id `zoneName`; summary `'Steering offer sent: +<amt>/trip in <zone> for <dur> min, cap <cap>, to <n> drivers'` (`L14032`) | none |
| **Queue recruitment** (health table) | `queueRecruitment(zoneName)` `L13994` | `requirePerm('manage_settings')` (`L13995`); duplicate-queue check (`L13996`); `DB.recruitmentQueue.push({zone,queuedAt,status:'Queued'})`; audit; `renderZonesPage()`; toast | `DB.recruitmentQueue` | broad `manage_settings` (**not** a `zones.*` page perm) | `recruitment_queued` / `zone` / zoneName; summary `'Recruitment drive queued for <zone> — added to acquisition campaign list'` (`L13998`) | **YES** — `GATE_SWEEP.queueRecruitment` (`L20875-20876`): title *"Queue for recruitment"*, **not** danger, consequences *"Adds this area to the supply recruitment plan."* / *"Budget is committed by the recruitment team, not here."*, button "Queue" |
| **Cancel** (modal) | `closeModal()` `L5216` | Closes without writing | — | none | none | — |
| *(automatic)* **Offer closes** | `tickSteerOffers()` `L14175` | Sets `status='closed'`, audits, toasts (click → `go('zones')`), re-renders if visible | `DB.steerOffers[].status/spent/accepted/minutesLeft` | none (system) | `steer_offer_closed` / `zone` / zone (`L14183`) | — |

### Permission definitions used

`PAGE_PERMISSIONS.zones` (`L10621-10624`): label *"Zones"*, icon 🗺️, `legacy:'live_ops'`, perms `view`, `steer`.
`defaultPagePerms` (`L10662`) grants `steer` only when the user already holds the broad `live_ops` perm; otherwise only `view`.
`requirePagePerm` (`L10680`) on denial → `toast('🔒 Your role lacks permission: Zones — Send a driver-steering offer','err')` + `logAction('permission_denied','permission','zones.steer', …)`.

**Note:** "Queue recruitment" is gated on the unrelated broad perm `manage_settings` rather than `zones.*` — a role granted `live_ops` (and therefore `zones.steer`) still cannot queue recruitment (§18).

---

## 11. Tables & lists

### 11.1 Subscription demand momentum — `#zone-momentum`, `L14060-14086`

Columns, in order: **Zone · Sub requests today · Daily avg before · Momentum · Pending now · Pipeline value · Signal · (actions)**

| Aspect | Detail |
|---|---|
| Row source | `zoneSubMomentum()` (`L14041`) — derived from `DB.subscriptionRequests` |
| Sort | descending by `growthPct` (`L14056`) |
| Filter / search | **none** (the KPI filters affect only the Zone-health table, not this one) |
| Row click | zone name cell → `showZoneHourly(m.zone)` (`L14072`) |
| Row highlight | `background:#FFF9F0` when `hot` (`L14070`) |
| Row action | `Steer drivers here` button (primary style when `hot`), **or** a `b-blue` "📣 Offer live (Nm)" badge when an active offer exists (`L14078-14079`) |
| Empty state | *"No subscription requests mapped to tracked zones yet."* — replaces the whole table (`L14061`) |
| Footer | hardcoded tip: *"💡 A growing-subscriptions zone matters more than a busy-rides zone…"* (`L14086`) |

With seed data this renders 3 rows: **Al Yasmin** (today 1, prior avg 0.0, +100%, pending 1, 86.50 SAR, Steady), **Al Narjis** (today 1, 0.0, +100%, pending 0, 0.00 SAR, Steady), **Al Malaz** (today 0, 0.5, −100%, pending 0, 0.00 SAR, Cooling). None reach `hot` (requires `today >= 3`).

### 11.2 Zone health — `#zones-list`, `L14147-14171`

Columns, in order: **Zone · Active demand · Available drivers · Demand : supply · Failed matches (30d) · Failure rate · Recruitment priority · (actions)**

| Aspect | Detail |
|---|---|
| Table id | `#zones-table` (`L14149`) |
| Row source | `DB.zones.slice()` sorted by `zoneFailRate` **descending** (worst first, `L14132`) |
| Filters | `_zonesFilter` (`L14129`), applied at `L14143-14146`: `'all'` (default, no filter) · `'starved'` (`supply>0 && demand/supply>=3`) · `'offers'` (has an active steering offer) |
| Filter entry points | the 4 KPI tiles only — **no filter chips or search box exist** |
| Sort control | **none** — the sort is fixed |
| Row click | zone name cell → `showZoneHourly(z.name)` (`L14155`) |
| Row highlight | `background:var(--red-lt)` when `ratio >= 3` (`L14153`) |
| Row actions | (a) `Steer drivers` button (primary when `ratio>=3`) **or** `📣 Offer live (Nm)` badge; (b) `Queue recruitment` button **or** `📣 Recruitment queued` grey badge (`L14163-14166`) |
| Empty state | *"No zones match this filter."* — replaces the table and **returns early**, so the KPI strip stays but the list is a single message (`L14146`) |
| Scroll | container `max-height:460px; overflow-y:auto` (`L1315`) |

### 11.3 Recruitment queue

`DB.recruitmentQueue` (`L13961`) is written by `queueRecruitment` but **has no list view anywhere in the file** — it surfaces only as the per-row "📣 Recruitment queued" badge (`L14166`). `queuedAt` is stored and never displayed.

---

## 12. Charts

| Visual | Type | Series / axes | Source | Line |
|---|---|---|---|---|
| **Known demand by hour** | Vertical bar chart, pure CSS flex (no SVG/canvas) | X: 7 fixed hour buckets `05:00`–`11:00` labelled `HH:00` (zero-padded); Y: implicit, bars scaled to `v/max*100` % of a 130 px column, floor 4% | `DB.subscriptionRequests[].preferredTime` + `DB.upcomingSubTrips[].scheduledTime`, filtered by `zoneOfPickup` | `L14113-14123` |
| Bar colour / label colour | conditional | red when `v > zone.supply`, blue otherwise; count label above each bar mirrors the colour | `zone.supply` | `L14117-14120` |
| Bar tooltip | `title` attribute | `"<v> scheduled trips at <h>:00"` + `" — exceeds the <supply> drivers available here"` when overloaded | | `L14120` |
| KPI mini-bars (`.kpi-bar > .kf`) | 4 thin progress bars | tile 1 `60%`, tile 2 `starved*16` %, tile 3 `31%`, tile 4 `25%` — **only tile 2 is data-driven** | | `L14136-14139` |

There is **no map visualisation** on this page despite the 🗺️ icon and the "recruitment map" copy — zones carry no geometry (§4.1).

---

## 13. Modals opened

### 13.1 "📣 Steer drivers to `<zone>`" — `openSteerOffer(zoneName)` `L14002-14022`

Opened only after both permission checks and the one-offer-per-zone check pass. Close: `✕` → `closeModal()`.

Info banner (`L14009`): *"Drivers are independent — we invite, never order. The offer goes to **`<N>` available drivers** as a push notification; each can accept or ignore it."* where `N = steerableDrivers().length`.

| Field id | Type | Label | Default | Options / validation |
|---|---|---|---|---|
| `st-amt` | number | "Bonus per completed trip in zone" + inline "SAR" | `12` | `min=1 step=1` |
| `st-dur` | select | "Offer valid for" | `120` ("2 hours", `selected`) | `60` 1 hour · `120` 2 hours · `240` 4 hours |
| `st-cap` | number | "Budget cap for this offer" + inline "SAR — offer auto-closes when spent" | `300` | `min=10 step=10` |
| `st-preview` | div | — | empty | **never populated** (§18) |

Buttons: `Cancel` → `closeModal()` · `Send offer to <N> drivers` → `commitSteerOffer('<zone>')` (`L14020`). The zone name is interpolated into the `onclick` string — a zone name containing an apostrophe would break the handler (latent, no seed zone contains one).

### 13.2 Gate confirmation modal — `queueRecruitment`

`GATE_SWEEP.queueRecruitment` (`L20875-20876`) wraps the function via `gateAll`/`guardAction` (`L20756`, `L17819`), so the click first opens the generic `confirmAction()` modal (`L17785-17800`): head *"Queue for recruitment"* (no ⚠ prefix — `d` is not set), no summary, consequence list *"Adds this area to the supply recruitment plan."* / *"Budget is committed by the recruitment team, not here."*, buttons `Cancel` / `Queue`.

**No other modal is opened by this module.** There is no zone-detail modal, no add/edit-zone modal, and no recruitment-queue management modal.

---

## 14. States & badges

| Badge / state | Class | Exact trigger | Line |
|---|---|---|---|
| **Sidebar badge `#sbb-zones`** | `sb-badge a` | `textContent = starved` where `starved = DB.zones.filter(z => z.supply>0 && z.demand/z.supply>=3).length`. **Set only inside `renderZonesPage()`**, which runs only on `go('zones')` (`L8800`) or a visible-page steering tick (`L14188`). Until the page is first opened it displays its hardcoded HTML value `0`; `refreshNavCounts()` (`L9392`) does **not** touch it. Seed value once rendered: **2**. | `L523`, `L14140` |
| 🔴 "Recruit now" | `b b-red` | `ratio >= 3 \|\| failRate >= 50` | `L14153` |
| 🟠 "Watch" | `b b-amber` | `ratio >= 2 \|\| failRate >= 25` (and not the above) | `L14153` |
| 🟢 "Healthy" | `b b-green` | neither of the above | `L14153` |
| "needs +N driver(s)" sub-line | plain muted text | `needed > 0` (§5.5) | `L14159` |
| Row tint red-lt (health table) | inline style | `ratio >= 3` | `L14153` |
| Failure-rate colour | inline | red ≥50 · amber-dk 25–49 · green <25 | `L14158` |
| `📣 Offer live (Nm)` | `b b-blue` | an offer exists for the zone with `status==='active'`; `N = offer.minutesLeft` | `L14163` (health), `L14078` (momentum, with `title="<accepted> accepted so far"`) |
| `📣 Recruitment queued` | `b b-grey` | `DB.recruitmentQueue.some(r => r.zone===name && r.status==='Queued')` | `L14166` |
| 🔥 "Growing + starved — act now" | `b b-red` | `hot && starved` (§5.7) | `L14067` |
| 🔥 "Growing demand" | `b b-amber` | `hot && !starved` | `L14068` |
| "Cooling" | `b b-grey` | `growthPct <= −30` | `L14068` |
| "Steady" | `b b-green` | fallback | `L14069` |
| Momentum row tint `#FFF9F0` | inline | `hot` | `L14070` |
| Momentum % colour | inline | green >0 · red <0 · muted =0 | `L14074` |
| Hourly bar red / count red | inline | `v > zone.supply` | `L14117-14119` |
| `#zone-hourly-card` visibility | inline `display` | starts `none` (`L1317`); set to `''` on the first `showZoneHourly` call and **never hidden again** for the session (`L14096`) | `L14096` |
| Zone-health empty message | plain | `shownZones.length === 0` under the current filter | `L14146` |
| Momentum empty message | plain | `zoneSubMomentum()` returns `[]` | `L14061` |

Notifications raised: `pushOpsNotification('alert','Steering offer live — <zone>', …)` on commit (`L14034`). Toasts: offer live (`L14033`), offer already live warning (`L14006`), zone already queued warning (`L13996`), recruitment queued (`L14000`), offer ended (`L14184`).

---

## 15. Cross-module links

| Direction | Target | Mechanism | Line |
|---|---|---|---|
| Zones → Drivers (implicitly) | `steerableDrivers()` reads `DB.drivers`, `DB.complianceSuspensions`, `driverLiveState()` | direct reads | `L13985-13989`, `L7283` |
| Zones → Requests | `zoneSubMomentum` and `showZoneHourly` read `DB.subscriptionRequests` | direct reads | `L14043`, `L14105` |
| Zones → Readiness / upcoming trips | `showZoneHourly` reads `DB.upcomingSubTrips` | direct read | `L14108` |
| Zones → Plans/pricing | `subReqValue` reads `PLANS` for pipeline value | `L9750` | `L14048` |
| Zones → Activity log | `recruitment_queued`, `steer_offer`, `steer_offer_closed`, `permission_denied` | `logAction` `L3133` | `L13998`, `L14032`, `L14183` |
| Zones → Notification centre | steering-offer-live alert | `pushOpsNotification` `L9661` | `L14034` |
| Zones ← Predictive Signals | `renderPredZones()` filters `DB.zones` (ratio ≥3 **and** failRate ≥50) and links back with `go('zones',null)` | | `L14356-14366` |
| Zones ← Executive Overview (cities table) | `cityStats(name).zones` = `DB.zones.length` for Riyadh; "Avg zone fail rate" column = mean `zoneFailRate` | `L7448`, `L6942` | |
| Zones ← Executive Overview (expansion list) | `#exec-expansion-list` filters `DB.zones` at ratio ≥2, sorted descending | | `L6951-6959`, HTML `L618` |
| Zones → ETA engine | `zoneCongestionMultiplier` / `zoneOfAddress` feed `estimateEtaMin`, used by `fmtEtaMin` and dispatch UIs | | `L7263-7282` |
| Zones → Growth | promo modal target option "Specific zone" exists but **is not wired to `DB.zones`** | | `L13540` |
| Surge module (Pricing) | `openSuspendSurge()` builds its zone picker with `Object.keys(DB.zones\|\|{}).slice(0,8)` — `DB.zones` is an **array**, so `Object.keys` yields `'0'..'5'` (index strings), and the fallback `['RUH-CENTRAL','RUH-NORTH']` never fires. **Bug — surge suspensions are recorded against `"0"`…`"5"`, not zone names.** | | `L21721-21725` |
| Settings → Permissions matrix | `PAGE_PERMISSIONS.zones` drives the 2 checkboxes for this page | | `L10621` |

Related-but-separate surge data lives in `DB.surgeConfig` (`L13860`) and `DB.surgeSchedule` (`L13882-13886`); neither is zone-scoped (they are time/day windows), and **neither is rendered on this page** — they belong to the Pricing Plan module.

---

## 16. Hardcoded / mock / demo values — flagged explicitly

| # | Value | Where | Note |
|---|---|---|---|
| 1 | All 6 zones and every `demand` / `supply` / `failures30d` figure | `L13953-13958` | **MOCK** — never recomputed from `DB.rideRequests`, `DB.subscriptionRequests`, or driver locations |
| 2 | KPI bar widths `60%`, `31%`, `25%` (tiles 1, 3, 4) | `L14136`, `L14138`, `L14139` | **HARDCODED** — cosmetic, unrelated to the values above them |
| 3 | KPI tile 2 bar width factor `starved*16` | `L14137` | arbitrary scaling constant |
| 4 | KPI delta line "Riyadh districts" | `L14136` | hardcoded — assumes a single city |
| 5 | Momentum "today" cut-off `day >= 25` | `L14045` | **HARDCODED MAGIC DATE** matching the demo clock; does not advance with `REQ_NOW_REF` |
| 6 | Momentum prior-window divisor `/ 2` | `L14053` | hardcoded, justified in-comment as *"seeded data spans ~2 prior days"* |
| 7 | Simulated steering acceptance `Math.random() < 0.25` per tick | `L14180` | **DEMO SIMULATION** — no real driver accepts anything |
| 8 | Hourly window fixed to hours 5–11 | `L14099` | **HARDCODED** — any demand outside 05:00–11:00 is silently discarded |
| 9 | Healthy-target divisor `3` in "needs +N drivers" | `L14154` | hardcoded |
| 10 | Steering modal defaults 12 SAR / 2 hours / 300 SAR cap | `L14015-14017` | hardcoded |
| 11 | Congestion multiplier constants `0.85`, `0.18`, clamp `[0.9, 1.6]` | `L7268` | hardcoded |
| 12 | `'Riyadh'` string comparison for the city avg-fail-rate column | `L6942` | hardcoded city name |
| 13 | Expansion-zone threshold `>= 2` (Exec Overview) vs starved `>= 3` (here) | `L6951` vs `L14133` | two different hardcoded thresholds for the same concept |
| 14 | `#zones-sub` header text | `L1306` | static; the id implies it was meant to be dynamic (§18) |
| 15 | All three card sub-notes and the momentum footer tip | `L1310`, `L1314`, `L1318`, `L14086` | hardcoded prose |
| 16 | `zoneCongestionMultiplier` demo note — no real traffic feed | `L7263` | the multiplier is derived from mock demand/supply, so ETAs inherit the mock |

---

## 17. i18n keys

| Key | Element | English | Arabic | Line |
|---|---|---|---|---|
| `nav.zones` | sidebar item label | "Zones" | `المناطق` | `L523`, `L7908` |
| `sec.growth` | parent sidebar section label | "Growth" | `النمو` | `L521`, `L7913` |

**No other i18n key exists for this module.** Every string in `#p-zones` and in every zone renderer — headings, sub-notes, all 8 + 8 table column headers, badge labels, empty states, tooltips, toasts, the modal — is an untranslated English literal, consistent with the file-level note at `L7899-7901`. `applyLanguage()` (`L7939`) only swaps `[data-i18n]` nodes.

---

## 18. Gaps, dead code, UNVERIFIED items

### 18.1 Missing capability

1. **Zones cannot be created, edited, or deleted.** `DB.zones` (`L13952`) is a hardcoded array with no CRUD UI anywhere in the file — despite Settings having a "Cities & zones" tab label (`stab.cities` → *"المدن والمناطق"*, `L7918`) whose zone half is unimplemented. Adding a district requires editing the HTML source.
2. **`demand`, `supply`, `failures30d` are never computed.** No code updates them from `DB.rideRequests`, `DB.subscriptionRequests`, driver availability, or a failure log. Every KPI, badge, ratio and priority on the page — and the ETA multiplier in §5.8 — derives from these three frozen numbers.
3. **No map.** Zones carry no geometry (no lat/lng, no polygon); the 🗺️ icon and "the recruitment map" copy (`L1306`) are aspirational.
4. **`DB.recruitmentQueue` has no view and no lifecycle.** Entries are written (`L13997`) and surface only as a per-row badge. `status` is only ever `'Queued'`; `queuedAt` is stored but never rendered. There is no dequeue, complete, or cancel action.
5. **`offer.sentTo` is written and never read** after creation (`L14029`) — the modal recomputes `steerableDrivers().length` each time it opens.
6. **`#st-preview`** (`L14018`) is an empty div that no code ever populates — a stub for a cost preview that was never built.
7. **Steering offers are not zone-scoped in their audience.** `steerableDrivers()` (`L13985`) returns every non-pending, non-suspended, non-busy driver platform-wide; nothing filters by proximity to `zoneName`.
8. **No offer cancel/edit.** Once live, a steering offer can only end by expiry or budget exhaustion (`L14181`).
9. **`_zonesFilter` persists across navigation** (`L14129`, module-level, never reset by `go()`): leaving the page with the "starved" filter active and returning later shows a filtered list with no visible filter indicator.

### 18.2 Dead code / bugs

| Item | Line | Detail |
|---|---|---|
| Unused `sub` lookup in `showZoneHourly` | `L14109` | `var sub = Object.keys(DB.subscriptions).map(...).find(s => s.rider === t.rider);` — computed on every upcoming trip and never referenced. |
| `#zones-sub` never updated | `L1306` | The `<p>` carries an id (implying a dynamic subtitle, matching the pattern of `#all-pending-sub` `L1326`) but no JS writes to it. |
| AM/PM collision in `addTime` | `L14101-14104` | The regex `/(\d{1,2}):/` captures the hour only; `'07:00 AM'` and `'07:00 PM'` both bucket to 7. Harmless with the 05–11 window and morning-commute seed data, but incorrect. |
| Out-of-window hours silently dropped | `L14104` | `if(hours[h] != null) hours[h]++` — any trip scheduled outside 05:00–11:00 vanishes from the "known demand" view with no indication. |
| Unmatched pickups silently dropped | `L14045` | `zoneOfPickup` returning `null` skips the request entirely; with seed data `Al Rabwah District` (2 of 5 requests) is invisible to both the momentum table and the hourly chart. |
| `supply > 0` guard inverts the starved intent | `L14133`, `L14144`, `L14065`, `L14358` | A zone with **zero** available drivers is excluded from "supply-starved" — the worst possible case is filtered out. Latent (no seed zone has `supply === 0`). |
| Surge zone picker treats the array as an object | `L21721` | `Object.keys(DB.zones\|\|{}).slice(0,8)` on an **array** yields `['0','1','2','3','4','5']`; the intended `['RUH-CENTRAL','RUH-NORTH']` fallback never fires because the array is non-empty. Surge suspensions are therefore recorded against numeric index strings, not zone names. **Cross-module bug.** |
| Zone name interpolated into `onclick` strings | `L14072`, `L14079`, `L14155`, `L14163`, `L14166`, `L14020` | A zone name containing an apostrophe would break the generated handler. Latent. |

### 18.3 Inconsistencies

| # | Issue | Line |
|---|---|---|
| 1 | `queueRecruitment` is gated on broad `manage_settings`, while `openSteerOffer`/`commitSteerOffer` use `live_ops` + `zones.steer`. A `live_ops` role can spend money on a steering offer but cannot add a zone to a free recruitment list. | `L13995` vs `L14003-14004` |
| 2 | `queueRecruitment` is confirm-gated; the money-spending `commitSteerOffer` is **not**. | `L20875` vs `L14023` |
| 3 | The KPI filters apply to the Zone-health table only, not to the Momentum table above it — clicking "Supply-starved zones" leaves the momentum list unfiltered with no explanation. | `L14143` |
| 4 | Two thresholds for "demand outstrips supply": ≥3 here and in Predictive, ≥2 in Executive Overview's expansion list. | `L14133` vs `L6951` |
| 5 | Sidebar badge is stale until the page is first opened — `refreshNavCounts()` (`L9392`) updates 5 other badges but not `sbb-zones`. | `L9400-9401` vs `L14140` |
| 6 | `openSteerOffer` re-checks nothing about budget/availability at commit time other than the permission — the one-offer-per-zone check lives only in the opener, so two rapid commits from a stale modal could stack offers. | `L14005` vs `L14023-14029` |
| 7 | The hourly card, once opened, stays visible showing a previously-selected zone even after `filterZones` hides that zone from the table. | `L14096`, `L14143` |

### 18.4 Audit keys emitted by this module

`recruitment_queued` (`L13998`) · `steer_offer` (`L14032`) · `steer_offer_closed` (`L14183`) · `permission_denied` (`L3130` via `requirePerm`, `L10686` via `requirePagePerm`).

### 18.5 UNVERIFIED

| Item | Reason |
|---|---|
| Whether `zoneOfPickup` correctly resolves every pickup string used in production data | Only the 5 seeded `subscriptionRequests` (`L2795-2799`) and the `upcomingSubTrips` `route` fields (`L6177+`) were traced; the matching is a naive lowercase substring test with no test suite present. |
| Exact `DB.upcomingSubTrips` contribution to the hourly chart per zone | Requires evaluating `zoneOfPickup(t.route.split('→')[0])` across all seeded trips; only the mechanism (`L14108-14111`) was verified, not every row's outcome. |
| Runtime appearance of `.g4`, `.kpi click`, `.kpi-flash-target`, `.b-*` CSS | Not inspected; conclusions drawn from markup and JS only, not from a rendered browser. |
| Whether the tick engine's 5-tick cadence produces the intended wall-clock offer duration | `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` (`L9579`) and the modulo-5 gate (`L12575`) were read, but the tick interval itself (`startTickEngine`) was not traced for this doc. |
| `driverLiveState(id).busy` semantics | Function located at `L7283`; its full body was not read for this doc, so the precise definition of "busy" is taken from the call-site comment (`L13983-13984`). |

---

## 19. Line-number index

### HTML
| Lines | Content |
|---|---|
| `L521` | Sidebar section label `sec.growth` |
| `L523` | Sidebar `zones` nav item + `#sbb-zones` badge |
| `L1303` | Page comment banner |
| `L1304-1321` | `#p-zones` container |
| `L1305-1307` | Page header + `#zones-sub` |
| `L1308` | `#zones-kpis` (`.g4`) |
| `L1309-1312` | Momentum card / `#zone-momentum` |
| `L1313-1316` | Zone health card / `#zones-list` |
| `L1317-1320` | `#zone-hourly-card` (initially `display:none`), `#zone-hourly-title`, `#zone-hourly-body` |

### JavaScript — zone module
| Lines | Symbol |
|---|---|
| `L13797-13801` | Zones section comment |
| `L13952-13959` | `DB.zones` seed |
| `L13960` | `DB.steerOffers` |
| `L13961` | `DB.recruitmentQueue` |
| `L13974` | `zoneFailRate(z)` |
| `L13975-13982` | `zoneOfPickup(pickup)` + comment |
| `L13983-13989` | `steerableDrivers()` + comment |
| `L13990-13993` | Steering-offer flow comment |
| `L13994-14001` | `queueRecruitment(zoneName)` |
| `L14002-14022` | `openSteerOffer(zoneName)` |
| `L14023-14035` | `commitSteerOffer(zoneName)` |
| `L14036-14040` | Momentum section comment |
| `L14041-14057` | `zoneSubMomentum()` |
| `L14058-14090` | `renderZoneMomentum()` |
| `L14087-14090` | "Known demand by hour" section comment |
| `L14091-14128` | `showZoneHourly(zoneName)` |
| `L14129` | `var _zonesFilter='all'` |
| `L14130` | `filterZones(f)` |
| `L14131-14171` | `renderZonesPage()` |
| `L14132-14134` | `worst` sort + `starved` count |
| `L14135-14139` | KPI strip |
| `L14140` | `#sbb-zones` badge write |
| `L14143-14146` | Filter application + empty state |
| `L14147-14171` | Zone health table |
| `L14172-14174` | `tickSteerOffers` comment |
| `L14175-14189` | `tickSteerOffers()` |

### Supporting / cross-module
| Lines | Symbol |
|---|---|
| `L2168` | `titles.zones` |
| `L2169` | `subs.zones` |
| `L2794-2800` | `DB.subscriptionRequests` seed |
| `L3126-3131` | `requirePerm(permKey)` |
| `L3133-3155` | `logAction(...)` |
| `L4389-4393` | `PLANS` |
| `L4394` | `fmtSAR(n)` |
| `L5216` | `closeModal()` |
| `L6177+` | `DB.upcomingSubTrips` seed |
| `L6938-6947` | Exec Overview cities table (avg zone fail rate `L6942`) |
| `L6948-6959` | Exec Overview expansion-ready zones |
| `L7263-7269` | `zoneCongestionMultiplier(zoneName)` |
| `L7272` | `zoneOfAddress(addr)` |
| `L7273-7280` | `estimateEtaMin(...)` |
| `L7283` | `driverLiveState(driverId)` |
| `L7448` | `cityStats(name)` — `zones: DB.zones.length` |
| `L7908` | `LANG_STRINGS.ar['nav.zones']` |
| `L8774-8812` | `window.go(...)`, zones branch at `L8800` |
| `L9392-9409` | `refreshNavCounts()` — does **not** touch `#sbb-zones` |
| `L9555` | `REQ_NOW_REF` |
| `L9579` | `SUBREQ_TIME_ACCEL_MIN_PER_TICK` |
| `L9645-9650` | `fmtReqNowLabel()` |
| `L9661` | `pushOpsNotification(...)` |
| `L9750-9754` | `subReqValue(r)` |
| `L10621-10624` | `PAGE_PERMISSIONS.zones` |
| `L10662-10692` | `defaultPagePerms`, `canPage`, `requirePagePerm` |
| `L12575` | `tickSteerOffers` invocation (`__tickCount % 5 === 0`) |
| `L14356-14366` | `renderPredZones()` (Predictive Signals) |
| `L14535-14543` | `kpiScrollTo(elId)` |
| `L14556-14600` | Boot block (zones **absent**) |
| `L17785-17817` | `confirmAction`, `runConfirm` |
| `L17819-17840` | `guardAction(name, builder)` |
| `L20756-20767` | `gateAll(map)` |
| `L20875-20876` | `GATE_SWEEP.queueRecruitment` |
| `L20898-20903` | `installGateSweep()` + invocation |
| `L21721-21725` | `openSuspendSurge()` — misuses `DB.zones` as an object |
