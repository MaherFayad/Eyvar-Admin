# Module: Pricing & Plans (Plans list page)
> Source: `eyvar_ops_panel_v40_fixed.html` | Page id: `plans` (`<div class="page" id="p-plans">`) | HTML lines: **L1030–L1079**
> Sub-tab panes: `#pricingtab-plans` **L1038–L1046**, `#pricingtab-quickrides` **L1048–L1078**
> Companion doc: `14b-plan-editor.md` (page id `plan-edit`, L1082–L1129)

---

## 1. Purpose

`p-plans` is the single admin surface for **what riders can buy and what it costs**. It carries two independent pricing systems behind one page under two sub-tabs (`L1033–L1036`):

| Sub-tab | Pane | What it configures | Backing state |
|---|---|---|---|
| 📦 **Subscription Plans** | `#pricingtab-plans` `L1038` | Recurring subscription plan templates (Weekly / Bi-weekly / Monthly) — duration, execute days, cancel cap, Eyvar take-rate %, discount %, per-minute + per-km rates for Economy and Comfort | `DB.plans` `L2889–L2896` |
| 🚕 **Quick Rides** | `#pricingtab-quickrides` `L1048` | On-demand single-trip ride types (base + per-km + per-min) **and** the surge-pricing schedule | `DB.quickRideTypes` `L13908–L13912`, `DB.surgeConfig` `L13861`, `DB.surgeSchedule` `L13883–L13887` |

Header (`L1031`): `<h1>Pricing Plan</h1>`, sub-line `<p id="plans-page-sub">3 plan templates · 2 active · 1 draft</p>` (static markup, overwritten at runtime by `renderPlansTable()` `L5944` and by `liveSubtitles()` `L21253`).

The page **writes real state**. Every mutating handler is behind `requirePerm('manage_plans')` and most are additionally wrapped by the confirmation-gate registry (§13).

Two pieces of the "Pricing & Plans" domain live **outside** this page and are documented here for completeness:
- **Plan visibility rule** — Settings → Dispatch card, `L1603–L1618`, `renderPlanVisibility()` `L8122`, `savePlanVisibility()` `L8128` (§9.4).
- **Rate card / commercial pricing model** — Settings, `renderPricing()` `L21622`, `DB.rateCard` `L21431` (§6.4, §16). This is a *separate, parallel* pricing engine from `DB.plans` — see §19.

---

## 2. Entry points & routing

| Item | Detail | Line |
|---|---|---|
| Page container | `<div class="page" id="p-plans">` | `L1030` |
| Sidebar nav item | `<div class="sb-item" onclick="go('plans',this)">` … `<span class="sb-lbl" data-i18n="nav.plans">Pricing Plan</span>` | `L538` |
| Router hook | `if(id==='plans'){renderPlansFormSelects();renderPlansTable();renderRideTypesTable();renderSurgeSchedule();switchPricingSubTab('plans');}` | `L8807` (inside `window.go` starting `L8774`) |
| Toolbar title | `titles.plans='Pricing Plan'` → `#tb-title` | `L2168`, `L8785` |
| Toolbar subtitle | `subs.plans='3 plan templates'` → `#tb-sub` — **hardcoded, never recomputed** | `L2169`, `L8786` |
| Boot render | Boot block calls `renderPlansFormSelects()` `L14568`, `renderPlansTable()` `L14569`, `renderSurgeSchedule()` `L14573`. **`renderRideTypesTable()` is NOT in the boot block** — the ride-type table is empty until the user navigates to `plans` at least once. | `L14568–L14573` |
| Page sub-line recompute | `renderPlansTable()` sets `#plans-page-sub` `L5943–L5945`; `liveSubtitles()` independently sets `#p-plans .ph-l p` to `"N plan templates · N active · N not live"` `L21251–L21253` — two writers, different wording ("draft" vs "not live"). | `L5944`, `L21253` |
| Inbound cross-links | Quick Rides page `L1140` and Settings → Plan visibility `L1605` both link `go('plans',findSbEl('plans'))` | `L1140`, `L1605` |
| Outbound | `openPlanEdit(key)` → `go('plan-edit',null)` | `L6061–L6064` |
| Permission gate on entry | **None.** Neither the sidebar item (`L538`) nor the router branch (`L8807`) checks `can()`/`requirePerm()`. Gating is per-action only. | — |

### Call chain
```
go('plans')                             L8774 / L8807
├── renderPlansFormSelects()            L12796   → customSelectHTML() L5336 / cselSetValue() L5427
├── renderPlansTable()                  L5927
│   ├── activeSubsForPlanCadence()      L5921
│   └── statusBadge()                   L3730
├── renderRideTypesTable()              L12342
├── renderSurgeSchedule()               L12283
│   └── currentSurgeMultiplier()        L12389   → REQ_NOW_REF L9555, WEEKDAYS L4525
└── switchPricingSubTab('plans')        L12274
```

---

## 3. Sub-tabs

`switchPricingSubTab(which)` — `L12274–L12281`.

| Line | Effect |
|---|---|
| `L12275` | `#pricingtab-plans.style.display = which==='plans' ? 'block' : 'none'` |
| `L12276` | `#pricingtab-quickrides.style.display = which==='quickrides' ? 'block' : 'none'` |
| `L12277` | `#pricingsub-plans` gets/loses CSS class `on` |
| `L12278` | `#pricingsub-quickrides` gets/loses CSS class `on` |
| `L12279–L12280` | `#plans-new-btn` (the "+ New plan" button, `L1031`) is **hidden** (`display:none`) on the Quick Rides tab and restored (`''`) on the Plans tab |

Default state: `#pricingsub-plans` ships with class `on` and `#pricingtab-quickrides` ships with inline `display:none` (`L1034`, `L1048`); the router forces `switchPricingSubTab('plans')` on every entry (`L8807`), so the Quick Rides tab **never survives navigating away and back**.

No permission gate, no state write, no audit entry, no URL/hash persistence.

---

## 4. Plan schema — EVERY field

Source of truth: the `DB.plans` seed `L2889–L2896` and the `newPlan()` template `L6103–L6105`. Both objects define exactly the same 17 keys.

| Field | Type | Unit | Default (`newPlan()` L6103–L6105) | Controls / meaning | Written by | Read by |
|---|---|---|---|---|---|---|
| `key` | string | — | `'new'+n` (`L6101–L6102`) | Object key + `plan_id` shown in the editor sub-line; used as `entityId` in every audit entry | `newPlan()` `L6103` | `loadPlanEditForm()` `L6086–L6088`, `savePlan()` `L6146`, `doArchivePlan()` `L6172` |
| `name` | string | — | `'New plan'` | English plan name. Also the **cadence-matching prefix** for counting active subscriptions (`s.plan.indexOf(name)===0`, `L5924`) | `savePlan()` `L6131` | `renderPlansTable()` `L5936`, all modals/toasts, `activeSubsForPlanCadence()` `L5924` |
| `nameAr` | string | — | `''` | Arabic plan name (RTL). Required on save (`L6125`). | `savePlan()` `L6131` | `loadPlanEditForm()` `L6070` only — **no rider-facing or i18n consumer in this file** |
| `duration` | number | days | `7` | Length of the commitment window | `savePlan()` `L6132` | `renderPlansTable()` `L5936` (display), `loadPlanEditForm()` `L6071`. **No pricing consumer** — see §19 |
| `execute` | number | trips/days | `5` | "Execute days" — number of trip-days billed in one plan period; the multiplier in the editor's plan-total formula (`L6133`, `L12986`, `L12989`) | `savePlan()` `L6133` | `renderPlansTable()` `L5936`, `upd()`→`cr()` `L12986` |
| `cap` | number | count | `1` | Cancel/cancellation cap — how many trips a rider may cancel per period | `savePlan()` `L6134` | `renderPlansTable()` `L5936`; dashboard alert "Cancellation cap reached today" uses **`DB.plans.weekly.cap` only** `L10366–L10367` |
| `eyvarPct` | number | % (0–100) | `20` | Eyvar/platform take rate. Driver share = `100 − eyvarPct`. | `savePlan()` `L6136` | `renderPlansTable()` `L5936`, `commissionRateForPlan()` `L4463–L4465`, `upd()` `L12989–L12992` |
| `discountPct` | number | % | `0` | Discount applied to gross before the execute-days multiply | `savePlan()` `L6137` | `renderPlansTable()` `L5936`, `upd()`/`cr()` `L12986` |
| `ecoMin` | number | SAR / minute | `0.95` | Economy per-minute rate | `savePlan()` `L6138` | `renderPlansTable()` `L5936` (`toFixed(2)`), `loadPlanEditForm()` `L6077` |
| `ecoKm` | number | SAR / km | `1.10` | Economy per-km rate | `savePlan()` `L6139` | `loadPlanEditForm()` `L6078`. **Not shown in the plans table** |
| `comfortMin` | number | SAR / minute | `1.35` | Comfort per-minute rate | `savePlan()` `L6140` | `renderPlansTable()` `L5936`, `loadPlanEditForm()` `L6079` |
| `comfortKm` | number | SAR / km | `1.60` | Comfort per-km rate | `savePlan()` `L6141` | `loadPlanEditForm()` `L6080`. **Not shown in the plans table** |
| `sortOrder` | number | rank | `Object.keys(DB.plans).length+1` (`L6104`) | Intended display order of plans | `savePlan()` `L6135` | `loadPlanEditForm()` `L6074` only — **never used to sort anything**; `renderPlansTable()` iterates raw `Object.keys(DB.plans)` `L5930` |
| `ecoActive` | boolean | — | `true` | Whether Economy is offered on this plan | `toggleVehicleActive()` `L6113` | `loadPlanEditForm()` `L6081` only — **no downstream consumer** |
| `comfortActive` | boolean | — | `true` | Whether Comfort is offered on this plan | `toggleVehicleActive()` `L6113` | `loadPlanEditForm()` `L6082` only — **no downstream consumer** |
| `status` | string enum | — | `'Draft'` (`L6105`) | Lifecycle state. Values reachable: `'Active'`, `'Draft'`, `'Archived'` (`L12801–L12805`) | `doActivatePlan()` `L5960`, `doDeactivatePlan()` `L5981`, `doArchivePlan()` `L6170` | `renderPlansTable()` `L5934`, `L5942`; `liveSubtitles()` `L21252`; `renderPlansFormSelects()` `L12799–L12800` |
| `features` | array of `{en,ar}` | — | `[]` (`L6105`) | Rider-facing bullet list on the plan card. Persisted per plan. | `savePlan()` `L6142` | `loadPlanEditForm()` `L6093–L6094` → `PLAN_FEATURES` `L5992` |

**`status` is not writable from the editor's own Status dropdown** — see §12 / §19.

---

## 5. Seeded plan values (all plans × all fields)

`DB.plans` — `L2889–L2896`.

| Field | `weekly` (L2890–L2891) | `biweekly` (L2892–L2893) | `monthly` (L2894–L2895) |
|---|---|---|---|
| `key` | `weekly` | `biweekly` | `monthly` |
| `name` | `Weekly` | `Bi-weekly` | `Monthly` |
| `nameAr` | `الباقة الأسبوعية` | `الباقة نصف الشهرية` | `الباقة الشهرية` |
| `duration` (days) | `7` | `14` | `30` |
| `execute` | `5` | `10` | `22` |
| `cap` | `1` | `2` | `5` |
| `eyvarPct` | `20` | `18` | `15` |
| `discountPct` | `0` | `5` | `10` |
| `ecoMin` (SAR/min) | `0.95` | `0.85` | `0.72` |
| `ecoKm` (SAR/km) | `1.10` | `0.98` | `0.85` |
| `comfortMin` (SAR/min) | `1.35` | `1.20` | `1.05` |
| `comfortKm` (SAR/km) | `1.60` | `1.42` | `1.25` |
| `sortOrder` | `1` | `2` | `3` |
| `ecoActive` | `true` | `true` | `true` |
| `comfortActive` | `true` | `true` | `true` |
| `status` | `Active` | `Active` | `Draft` |
| `features` count | 3 | 2 | 3 |

Derived driver share (`100 − eyvarPct`): weekly **80%**, biweekly **82%**, monthly **85%**.

Seed comment (`L2885–L2888`) states the page previously had **no data behind it at all** — the list was static HTML and Activate/Deactivate only edited a table cell's text; `DB.plans` was added to back it with real state.

### Feature seeds (`L2891`, `L2893`, `L2895`)
| Plan | # | EN | AR |
|---|---|---|---|
| weekly | 1 | Same captain every trip | نفس السائق في كل رحلة |
| weekly | 2 | No waiting at pickup time | بلا انتظار في وقت الالتقاط |
| weekly | 3 | Save up to 30% vs single rides | وفر حتى 30% مقارنة بالرحلات الفردية |
| biweekly | 1 | Same captain every trip | نفس السائق في كل رحلة |
| biweekly | 2 | Save up to 35% vs single rides | وفر حتى 35% مقارنة بالرحلات الفردية |
| monthly | 1 | Same captain every trip | نفس السائق في كل رحلة |
| monthly | 2 | Save up to 40% vs single rides | وفر حتى 40% مقارنة بالرحلات الفردية |
| monthly | 3 | Priority support | دعم ذو أولوية |

---

## 6. Pricing formulas — written out exactly

### 6.1 Subscription plan price (the editor's model) — `cr()` `L12986`, `upd()` `L12987–L12999`

Verbatim source (`L12986`):
```js
function cr(pm,pk,d,c,ex){var g=(20*pm)+(10*pk),dc=g*(1-d/100),t=dc*ex,dr=t*(1-c/100);return{g:g,t:t,dr:dr};}
```
Written out, where `pm` = SAR/min, `pk` = SAR/km, `d` = `discountPct`, `c` = `eyvarPct`, `ex` = `execute`:

```
gross      g  = (20 × price_per_min) + (10 × price_per_km)      // 20 min, 10 km — HARDCODED example trip
discounted dc = g  × (1 − discountPct / 100)
plan_total t  = dc × execute_days
driver_earns dr = t × (1 − eyvarPct / 100)
driver_share_pct = 100 − eyvarPct                                // L12989
```

The on-page formula box (`L1125`) states the same in generic form:
```
gross        = (trip_min × price/min) + (trip_km × price/km)
discounted   = gross × (1 − discount%/100)
plan_total   = discounted × execute_days
driver_earns = plan_total × (1 − eyvar%/100)
```
with the note "Example uses 10 km / 20 min. Actual computed from real trip data at booking." (`L1125`).

**The 10 km / 20 min figures are hardcoded inside `cr()` (`L12986`) — they are not read from any config.**

Worked example, seeded `weekly` Economy (`ecoMin 0.95`, `ecoKm 1.10`, `discountPct 0`, `eyvarPct 20`, `execute 5`):
```
g  = 20×0.95 + 10×1.10 = 19.00 + 11.00 = 30.00 SAR
dc = 30.00 × (1 − 0)    = 30.00 SAR
t  = 30.00 × 5          = 150.00 SAR
dr = 150.00 × (1 − 0.20) = 120.00 SAR
```

### 6.2 Quick-ride fare — `quickRideFare()` `L12401–L12405`
```
base_fare_for_type = t.baseFare + (km × t.perKm) + (min × t.perMin)
final              = base_fare_for_type × currentSurgeMultiplier()
                     → returned as a string, .toFixed(2)
```
Fallback when the named type is not found (`L12402–L12403`): first entry of `DB.quickRideTypes`; if the array itself is empty, the **hardcoded literal** `2.50 + km×1.10 + min×0.35`.

Header note on the page (`L1050`): "Fare = base + (km × per-km rate) + (min × per-min rate) — applied live when a trip completes".

The example column in the ride-types table (`L12345`) uses:
```
example = (t.baseFare + 10×t.perKm + 20×t.perMin).toFixed(2)     // 10 km / 20 min, hardcoded
```
**The table's example column does NOT apply surge** (`L12345`), while `quickRideFare()` does (`L12404`).

### 6.3 Surge multiplier — `currentSurgeMultiplier()` `L12389–L12400`
```
if (!DB.surgeConfig || !DB.surgeConfig.enabled) return 1                       // L12391
now  = REQ_NOW_REF                                                             // L12392 (simulated clock, L9555)
hour = now.getHours()
day  = WEEKDAYS[now.getDay()]                                                  // L4525
mult = 1
for each window s in DB.surgeSchedule:
    if (!s.enabled)                     skip                                   // L12395
    if (s.days.indexOf(day) < 0)        skip                                   // L12396
    if (hour >= s.startHour && hour < s.endHour)  mult = max(mult, s.multiplier) // L12397
return min(mult, DB.surgeConfig.capMultiplier || 2.5)                          // L12399
```
Composition rule: overlapping windows do **not** multiply — the **maximum** enabled matching multiplier wins (`L12397`), then a hard ceiling `capMultiplier` is applied (`L12399`). Start hour is inclusive, end hour exclusive.

Where it composes with base pricing: surge multiplies the whole quick-ride fare (`L12404`), i.e. **including the base fare**, not just the distance/time part. It is applied at trip completion in `completeTrip()` `L12419`, and in the new-ride-request estimate `L2476–L2477`.

Subscription trips get `fare = '0.00'` at completion (`L12419`, `subId ? '0.00' : …`) — **surge never touches a subscription leg through this path**.

Multi-stop surcharge is added *after* surge, not multiplied by it (`L12418–L12419`): `stopFee = stops.length × DB.multiStopConfig.extraStopFeeSAR` (`L13862`, value `3`).

### 6.4 The parallel rate-card model (`DB.rateCard`, Settings page)
A second, structurally different pricing engine exists at `L21431–L21462` with its own formulas. It does **not** read `DB.plans` and `DB.plans` does not read it. Recorded here because it is the other half of "pricing" in this app.

`fareFor(cls,km,min,opts)` `L21466–L21480`:
```
raw   = c.base + (km × c.perKm) + (min × c.perMin)          // L21470
fare  = max(raw, c.minFare)                                  // L21471
mult  = opts.surge || 1 ; if (opts.isPlanLeg) mult = 1       // L21472–L21473  (structurally excluded)
total = round2(fare × mult)                                  // L21478
surge_component = round2(fare × (mult − 1))                  // L21477
```
`planQuote(cls,km,min,cadence,roundTrip)` `L21484–L21510`:
```
legs        = {weekly:5, biweekly:10, monthly:22}[cadence] || 22      // L21485
one         = planLegPrice(cls,km,min) = fareFor(...,{isPlanLeg:true}).total   // L21481
perDay      = roundTrip ? round2(one + one × DB.rateCard.returnLegFactor) : one  // L21487
listPrice   = round2(perDay × legs)                                   // L21488
disc        = DB.rateCard.planDiscountPct[cadence] || 0               // L21489
price       = round2(listPrice × (1 − disc/100))                      // L21490
legCount    = legs × (roundTrip ? 2 : 1)                              // L21491
driverShare = (100 − DB.rateCard.commission.subscription)/100         // L21493
captainCost = round2(price × driverShare)                             // L21494
platformCost= round2(price × paymentFeePct/100
                     + supportCostPerSubscriber
                     + price × emergencyReservePct/100)               // L21495–L21496
breakEven   = round2(captainCost + platformCost)                      // L21497
floor       = round2(breakEven × (1 + targetMarginPct/100))            // L21498
marginSar   = round2(price − breakEven)                               // L21503
marginPct   = price ? round2((price − breakEven)/price × 100) : 0     // L21504
belowFloor  = price < floor                                           // L21505
captainPerEngagedHour = min ? round2((captainCost/legCount)/(min/60)) : 0  // L21506
```
`planFloorCheck()` `L21512–L21518` returns `{ok: price >= floor, shortfall: max(0, floor−price)}` — described in the comment `L21511` as "the check that blocks a publish". **UNVERIFIED**: no call site for `planFloorCheck()` or `planLegPrice()` was found in this file — grep for `planFloorCheck(` returns only its definition. It appears to be defined but never invoked.

`effectiveSurge(cityCode,zoneId,requested)` `L21523–L21532`:
```
if an unexpired suspension exists for zoneId → {multiplier:1, suppressed:true}   // L21524–L21528
cap = DB.rateCard.surge.capByCity[cityCode||'RUH'] || 2.0                        // L21520–L21522
return {multiplier: min(requested||1, cap), capped: (requested||1) > cap}        // L21530–L21531
```

### 6.5 The third pricing path — dynamic subscription price
`computeDynamicSubPrice()` `L4535–L4556` (used by the New Subscription modal) is a **third** formula set, reading `CADENCE_META` (`L4519–L4523`) and `PLANS` (`L4389–L4393`), *not* `DB.plans`:
```
directionMult = (direction === 'round-trip') ? 2 : 1                    // L4537
weeks         = (CADENCE_DAYS[cadenceKey] || 7) / 7                     // L4538  (L11231)
totalTrips    = round(selectedDaysCount × directionMult × weeks)        // L4539–L4540
if routeKm and a matching DB.quickRideTypes entry exists:               // L4543–L4549
    estMin  = round(routeKm / URBAN_AVG_SPEED_KMH × 60)                 // L4546  (26 km/h, L7262)
    legFare = round2(rideType.baseFare + routeKm×perKm + estMin×perMin) // L4547
else:
    legFare = perTripBaseRate(cadenceKey,vehicleType)
            = PLANS[cadence][eco|comfort] / PLANS[cadence].exec         // L4529–L4533
perTripFare = round2(legFare × directionMult)                           // L4551
gross       = round2(legFare × directionMult × selectedDaysCount × weeks) // L4552
total       = round2(gross × (1 − CADENCE_META[cadence].discountPct/100)) // L4553
```
**Surge is not applied here**, and the discount comes from the hardcoded `CADENCE_META`, not from `DB.plans[key].discountPct`. See §19.

---

## 7. Ride types & rates

`DB.quickRideTypes` seed — `L13908–L13912` (comment `L13904–L13907`).

| id | name | `baseFare` (SAR) | `perKm` (SAR) | `perMin` (SAR) | `active` | `custom` | Example 10km/20min (`L12345`) |
|---|---|---|---|---|---|---|---|
| `economy` | Economy | `2.50` | `1.10` | `0.35` | `true` | *absent* (falsy) | 2.50 + 11.00 + 7.00 = **20.50 SAR** |
| `comfort` | Comfort | `4.00` | `1.60` | `0.50` | `true` | *absent* (falsy) | 4.00 + 16.00 + 10.00 = **30.00 SAR** |
| `large` | Large | `6.00` | `2.10` | `0.65` | `true` | *absent* (falsy) | 6.00 + 21.00 + 13.00 = **40.00 SAR** |

Types added at runtime get `{id:'custom_'+Date.now(), active:true, custom:true}` (`L12361`).

**Ride-type schema (6 fields):** `id` (string), `name` (string), `baseFare` (number, SAR), `perKm` (number, SAR/km), `perMin` (number, SAR/min), `active` (boolean), plus `custom` (boolean) on runtime-added rows only.

**`active` is display/state only** — `quickRideFare()` (`L12401–L12405`) does **not** filter on `t.active`; an inactive type still prices normally if referenced. No other consumer of `t.active` exists.

### Per-plan activation flags
The subscription plan schema carries its **own, separate** vehicle activation pair, not linked to `DB.quickRideTypes`:

| Plan field | Vehicle | Toggle | Handler |
|---|---|---|---|
| `ecoActive` | Economy | `#fp3-eco-active` checkbox `L1121` | `toggleVehicleActive('Economy',checked)` `L6109–L6116` |
| `comfortActive` | Comfort | `#fp3-comfort-active` checkbox `L1122` | `toggleVehicleActive('Comfort',checked)` `L6109–L6116` |

Only Economy and Comfort exist per-plan (`L1121–L1122`); **`Large` has no per-plan row** — a Large ride type can never be attached to a subscription plan.

---

## 8. Surge schedule matrix

`DB.surgeConfig` — `L13861`: `{enabled:true, capMultiplier:2.5}`.
`DB.surgeSchedule` — `L13883–L13887`.

| id | `label` | `startHour` | `endHour` | `days` | `multiplier` | `enabled` |
|---|---|---|---|---|---|---|
| `surge_1` | Morning rush | `7` | `9` | Sun, Mon, Tue, Wed, Thu | `1.3` | `true` |
| `surge_2` | Evening rush | `17` | `20` | Sun, Mon, Tue, Wed, Thu | `1.5` | `true` |
| `surge_3` | Weekend evening | `20` | `23` | Thu, Fri | `1.2` | **`false`** |

Seed comment (`L13857–L13860`): "Real Riyadh commute pattern by default: weekday morning + evening rush. capMultiplier is a hard ceiling no combination of rules can exceed."

### Resolved hour × day matrix (as seeded, with `surge_3` disabled)

| Hours | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|---|
| 00:00–06:59 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 |
| 07:00–08:59 | ×1.3 | ×1.3 | ×1.3 | ×1.3 | ×1.3 | ×1.0 | ×1.0 |
| 09:00–16:59 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 |
| 17:00–19:59 | ×1.5 | ×1.5 | ×1.5 | ×1.5 | ×1.5 | ×1.0 | ×1.0 |
| 20:00–22:59 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 *(×1.2 if `surge_3` enabled)* | ×1.0 *(×1.2 if enabled)* | ×1.0 |
| 23:00–23:59 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | ×1.0 |

Ceiling: `min(mult, 2.5)` (`L12399`) — no seeded combination reaches it.

**There is no zone dimension in `DB.surgeSchedule`.** Windows are time × weekday only. A separate, unconnected per-city surge cap and per-zone suspension mechanism lives on the rate card: `DB.rateCard.surge.capByCity = {RUH:2.0, JED:2.0}` `L21459`, `DB.surgeSuspensions` `L21464`, `suspendSurge()` `L21534–L21543` (max 12 h, `L21535`). See §16.

`DB.rateCard.surge.appliesToPlanLegs = false` with the inline comment `/* never. not a toggle. */` (`L21460`).

**Live badge**: `#surge-live-badge` (`L1062`) is set by `renderSurgeSchedule()` `L12290–L12292` to either `'×N.NN surge active'` or `'No surge right now (×1.0)'`. It reads `REQ_NOW_REF` (`L9555`, seeded `new Date(2026,5,25,9,14,0)` = Thu 25 Jun 2026 09:14) — a **simulated clock**, advanced by `SUBREQ_TIME_ACCEL_MIN_PER_TICK` at `L9680`. At the seeded time (hour 9, Thu) no window matches → badge reads "No surge right now (×1.0)". The badge is only recomputed when `renderSurgeSchedule()` runs; it does **not** tick live.

### New-window defaults (`addSurgeWindow()` `L12308`)
`days` is always seeded to `WEEKDAYS.slice()` = **all 7 days**; the toast says so explicitly: "applies to all 7 days by default, edit days directly in the data if you need fewer" (`L12312`). **The days column is read-only in the UI** (`L12296`, plain text, no input) — there is no way to edit `days` from the panel.

---

## 9. Plan lifecycle & visibility

### 9.1 Statuses

| Status | Set by | Badge rendering (`statusBadge()` `L3730–L3736`) |
|---|---|---|
| `Active` | seed `L2890`, `L2892`; `doActivatePlan()` `L5960` | matches `/trip\|active/i` → `<span class="b b-blue">Active</span>` (`L3732`) |
| `Draft` | seed `L2894`; `newPlan()` `L6105`; `doDeactivatePlan()` `L5981` | no regex match → `<span class="b b-grey">Draft</span>` (`L3735`) |
| `Archived` | `doArchivePlan()` `L6170` | no regex match → `<span class="b b-grey">Archived</span>` (`L3735`) |

The status dropdown offers exactly these three (`L12801–L12805`).

### 9.2 Transitions

| From → To | Trigger | Confirmation | Permission | Writes | Audit | Toast | Side effects on existing subscriptions |
|---|---|---|---|---|---|---|---|
| `Draft`/`Archived` → `Active` | **Activate** button, plans table `L5940` → `confirmActivatePlan(key)` `L5947` → `doActivatePlan(key)` `L5957` | Custom modal `L5950–L5954`; body: "Activating this plan makes it available for new subscriptions and renewals. Riders will be able to select it immediately." + green note "Once active, the plan appears in the renewal flow and new-subscription form." | `requirePerm('manage_plans')` `L5958` | `p.status='Active'` `L5960` | `logAction('activate_plan','plan',key,'Activated <name> plan',{status:'Draft'},{status:'Active'})` `L5962` — **`before` is hardcoded to `Draft`** regardless of the real prior status | `✅ <name> plan activated` (`ok`) `L5963` | **None.** Nothing iterates `DB.subscriptions`. |
| `Active` → `Draft` | **Deactivate** button `L5940` → `confirmDeactivatePlan(key)` `L5966` → `doDeactivatePlan(key)` `L5978` | Custom modal `L5971–L5975`; red note "Deactivating hides this plan from new subscriptions. Existing subscribers keep their plan until it expires." Shows the live count from `activeSubsForPlanCadence()` (`L5968`, `L5973`) with "they will not be affected", or "No active subscriptions currently on this plan." | `requirePerm('manage_plans')` `L5979` | `p.status='Draft'` `L5981` | `logAction('deactivate_plan','plan',key,'Deactivated <name> plan (set to draft)',{status:'Active'},{status:'Draft'})` `L5983` | `<name> plan deactivated (set to draft)` (`warn`) `L5984` | **None** — modal's claim is accurate: existing subs are untouched. |
| any → `Archived` | **Archive** button in the editor top bar `L1085` → `archivePlan()` `L6156` → `doArchivePlan()` `L6165` | Custom modal `L6159–L6162`; red note "Archiving hides this plan from new subscriptions. Existing subscribers keep their plan until it expires." **No active-subscription count is shown here** (unlike Deactivate). | `requirePerm('manage_plans')` `L6166` — note the gate is on `doArchivePlan`, **not** on `archivePlan`, so a user without the permission still sees the modal | `p.status='Archived'` `L6170` | `logAction('archive_plan','plan',p.key,'Archived <name> plan',{status:<real prior>},{status:'Archived'})` `L6172` — this one records the real `before` | `<name> plan archived` (`err` styling) `L6173` | **None.** The plan object is **not deleted** — it stays in `DB.plans` and keeps appearing in the plans table with an "Activate" button (`L5940`), because `isActive` is `p.status==='Active'`. |

**Archived is not a terminal state in practice**: an archived plan still renders in the table and its "Activate" button will flip it straight back to `Active` (`L5934`, `L5940`, `L5960`).

### 9.3 Active-subscription counting
`activeSubsForPlanCadence(name)` `L5921–L5926`:
```js
Object.keys(DB.subscriptions).filter(sid =>
  DB.subscriptions[sid].status !== 'Cancelled' && DB.subscriptions[sid].plan.indexOf(name) === 0
).length
```
Prefix-matched on the plan **name** (`L5924`), not on `key`. Renaming a plan therefore silently breaks its subscription count. `'Weekly'` is a prefix of nothing else; but a plan renamed to e.g. `'Week'` would match `'Weekly …'` subscriptions.

### 9.4 Plan visibility rules
Lives on **Settings**, not on this page. HTML `L1603–L1618`; card header "👁️ Plan visibility" with sub-note "Uses the Subscription radius above to check live coverage" (`L1603`).

| Option | Input id | Value | Copy | Config written |
|---|---|---|---|---|
| Always show all active plans | `#plan-vis-radio-a` `L1608` | `false` | "A rider can subscribe even with no driver nearby right now — they start once coverage catches up. Safer default for growing cities." `L1609` | `hideIfNoCoverage = false` |
| Hide plans with no nearby driver coverage | `#plan-vis-radio-b` `L1612` | `true` | "Checks live driver availability within the subscription radius above before offering a plan — prevents a rider from paying for something that can't start." `L1613` | `hideIfNoCoverage = true` |

- Config: `DB.opsConfig.planVisibility = {hideIfNoCoverage:false}` — `L2574` (**default: show all**).
- `renderPlanVisibility()` `L8122–L8127` — sets the radios from config; called only from the `settings` router branch `L8819`.
- `savePlanVisibility()` `L8128–L8139` — `requirePerm('manage_settings')` (`L8129`, **not** `manage_plans`), writes `L8132`, `logAction('config_updated','settings','plan-visibility', …)` `L8133`, `renderSettingsMeta()` `L8137`, toast `✅ Plan visibility rule saved` `L8138`. Gated by `GATE_SWEEP.savePlanVisibility` (`L20807–L20809`): title "Change plan visibility", summary "Controls whether riders can see and buy this plan.", consequences "Hiding a plan does not cancel existing subscriptions." / "Riders mid-purchase may see it disappear.", button "Save visibility". Not marked `danger`.
- Enforcement: `isPlanVisibleForRider(riderId)` `L8141–L8146`:
  ```js
  if (!cfg || !cfg.hideIfNoCoverage) return true;
  var nearby = nearestAvailableDrivers(riderId,1,'sub');
  return nearby.length>0 && !nearby.expandedBeyondRadius;
  ```
  Single call site: `renderNewSubModal()` `L4569` → `var coverageBlocked = riderId && !isPlanVisibleForRider(riderId)`; when blocked, the whole `planOptions` array is left empty (`L4570–L4580`), so **no plan at all is offered**, not just uncovered ones.
- Meta strip: `#meta-plan-visibility` `L1617`, keyed `'plan-visibility'` in `renderSettingsMeta()`'s map `L7340`.

**Status is not part of visibility.** `renderNewSubModal()` builds its plan list from the hardcoded `PLANS` constant (`L4571–L4579`), so a plan set to `Draft` or `Archived` **still appears in the New Subscription modal**. See §19.

---

## 10. Plan features

The rider-facing feature list is edited on the plan-editor page — see `14b-plan-editor.md` §10 for the full mechanics. Summary of its data contract as it affects this module:

| Aspect | Detail | Line |
|---|---|---|
| Storage | `DB.plans[key].features` = array of `{en, ar}` | `L2891`, `L6142` |
| Working buffer | module-level `var PLAN_FEATURES` | `L5992–L5996` |
| Backing table (documented in the UI) | `plan_features` with FK `plan_id`, one row per bullet, columns `(plan_id, sort_order, text_en, text_ar)` | `L1108`, `L5987–L5991` |
| Rendered as | "a scannable bullet list on the rider's plan card in the app" | `L1108` |
| Constraint | Both EN and AR required; soft max ~60 characters per point | `L1108`, `L6050–L6056`, `L6006` |

There is **no per-feature toggle** — a feature point is present or removed, there is no enabled/disabled flag anywhere in the schema (`L2891`, `L6142`).

---

## 11. Data displayed

### Sub-tab: Subscription Plans

| Element | Source | Type | Notes |
|---|---|---|---|
| `#plans-page-sub` `L1031` | `Object.keys(DB.plans).length`, active/draft split | string | Written by `renderPlansTable()` `L5943–L5945`; **also** by `liveSubtitles()` `L21253` with different wording ("not live" instead of "draft") |
| `#plans-tbody` rows `L1043` | `DB.plans` (`Object.keys` order, `L5930`) | table | See §14 |
| Active subs cell | `activeSubsForPlanCadence(p.name)` `L5933` | number | Blue when `>0`, ghost grey when `0` (`L5937`) |
| Status badge | `statusBadge(p.status)` `L5938` | HTML | §9.1 |

### Sub-tab: Quick Rides

| Element | Source | Type | Notes |
|---|---|---|---|
| Formula note `L1050` | static text | string | Hardcoded copy |
| `#ridetypes-tbody` `L1051` | `DB.quickRideTypes` `L12344` | table | See §14 |
| Example column | computed `L12345` | string SAR | 10 km / 20 min hardcoded; **surge not applied** |
| `#surge-live-badge` `L1062` | `currentSurgeMultiplier()` `L12290` | string | Simulated clock `REQ_NOW_REF` `L9555` |
| `#surge-enabled` `L1064` | `DB.surgeConfig.enabled` `L12288` | checkbox | |
| `#surge-cap` `L1065` | `DB.surgeConfig.capMultiplier` `L12289` | number | |
| `#surge-tbody` `L1068` | `DB.surgeSchedule` `L12293` | table | See §14 |

**Empty states:** none of the three tables (`plans-tbody`, `ridetypes-tbody`, `surge-tbody`) has an empty-state branch — `.map().join('')` on an empty array yields `''` and the tbody renders blank with only the header row (`L5931`, `L12344`, `L12293`).

---

## 12. Input fields (this page only — editor fields are in `14b`)

### Ride-type creation row (`L1052–L1058`)

| id | Type | Label | Default | Unit | Validation | Writes to |
|---|---|---|---|---|---|---|
| `new-ridetype-name` | `text`, placeholder `e.g. XL / Van` | New type name | empty | — | Required: `if(!name){toast('⚠ Give the ride type a name first','warn');return;}` `L12359` | `DB.quickRideTypes[].name` `L12361` |
| `new-ridetype-base` | `number`, `min=0`, `step=0.1` | Base fare | empty | SAR | `parseFloat(...) \|\| 0` — blank/NaN silently becomes `0` `L12360` | `.baseFare` `L12361` |
| `new-ridetype-km` | `number`, `min=0`, `step=0.1` | Per km | empty | SAR/km | `parseFloat(...) \|\| 0` `L12360` | `.perKm` `L12361` |
| `new-ridetype-min` | `number`, `min=0`, `step=0.1` | Per min | empty | SAR/min | `parseFloat(...) \|\| 0` `L12360` | `.perMin` `L12361` |

All four are cleared after a successful add (`L12363`).

### Surge config (`L1063–L1067`)

| id | Type | Label | Default | Unit | Validation | Writes to |
|---|---|---|---|---|---|---|
| `surge-enabled` | `checkbox` | "Surge pricing active" `L1064` | from `DB.surgeConfig.enabled` (`true`) `L12288` | — | none | `DB.surgeConfig.enabled` `L12335` |
| `surge-cap` | `number`, `min=1`, `max=5`, `step=0.1` | Maximum surge cap (×) `L1065` | from `DB.surgeConfig.capMultiplier` (`2.5`) `L12289` | multiplier | **Clamped in JS**: `Math.min(5, Math.max(1, parseFloat(val)||2.5))` `L12336` — HTML min/max are also enforced by the browser | `DB.surgeConfig.capMultiplier` `L12336` |

### Surge window creation row (`L1069–L1075`)

| id | Type | Label | Default | Unit | Validation | Writes to |
|---|---|---|---|---|---|---|
| `new-surge-label` | `text`, placeholder `e.g. Weekend rush` | Window name | empty | — | Required (combined check `L12306`) | `.label` `L12308` |
| `new-surge-start` | `number`, `min=0`, `max=23` | Start hour | empty | hour-of-day (inclusive) | `parseInt(...,10)`; combined `isNaN` check `L12305–L12306` | `.startHour` `L12308` |
| `new-surge-end` | `number`, `min=1`, `max=24` | End hour | empty | hour-of-day (exclusive) | same `L12305–L12306`. **No check that end > start** | `.endHour` `L12308` |
| `new-surge-mult` | `number`, `min=1`, `max=5`, `step=0.1` | Multiplier (×) | empty | multiplier | `parseFloat`; `isNaN` check only — **no JS clamp to 1–5 on add** (unlike `surge-cap`) `L12305–L12308` | `.multiplier` `L12308` |

Combined failure toast: `⚠ Fill in all fields first` (`warn`) `L12306`. All four cleared on success `L12310`.

### In-table editable inputs

Ride types (`renderRideTypesTable()` `L12346–L12349`): per row, `data-type-field="baseFare" | "perKm" | "perMin"` (`number`, `step=0.1`, no min/max) and `"active"` (checkbox styled `.tog`). `name` is **not** editable in-table (`L12345`, rendered as `<p class="td-name">`). Committed only by `saveRideTypes()` `L12375–L12388` with `parseFloat(v)||0`.

Surge windows (`renderSurgeSchedule()` `L12294–L12299`): `data-surge-field="label"` (text), `"startHour"` (number 0–23), `"endHour"` (number 1–24), `"multiplier"` (number 1–5 step 0.1), `"enabled"` (checkbox). `days` is rendered as **plain text**, not editable (`L12296`). Committed only by `saveSurgeSchedule()` `L12321–L12333` with `parseInt(v,10)||0` / `parseFloat(v)||1`.

---

## 13. Actions

| Label | Element | Handler | Real effect | Writes to | Permission | Audit action key | Confirms? |
|---|---|---|---|---|---|---|---|
| **+ New plan** | `#plans-new-btn` `L1031` | `newPlan()` `L6098–L6108` | Finds first free key `new1/new2/…` (`L6100–L6102`), inserts a full default plan object with `status:'Draft'`, `sortOrder = count+1`, `features:[]`, toasts `Opening new plan template…` (`info`), then after **400 ms** `setTimeout` calls `openPlanEdit(key)` → `go('plan-edit')` | `DB.plans[key]` `L6103–L6105` | `requirePerm('manage_plans')` `L6099` | **none** — `newPlan()` never calls `logAction()` | **No** — not in `GATE_SWEEP`, no modal |
| **📦 Subscription Plans** | `#pricingsub-plans` `L1034` | `switchPricingSubTab('plans')` `L12274` | Show/hide panes, toggle `on`, show `#plans-new-btn` | nothing | none | none | No |
| **🚕 Quick Rides** | `#pricingsub-quickrides` `L1035` | `switchPricingSubTab('quickrides')` `L12274` | Show/hide panes, toggle `on`, hide `#plans-new-btn` | nothing | none | none | No |
| **Edit** (per row) | `L5939` | `openPlanEdit(key)` `L6061–L6064` | Sets `currentPlanKey = key` (`L6062`), navigates `go('plan-edit',null)` | `currentPlanKey` (`L2897`) | none | none | No |
| **Activate** (per row, when not Active) | `L5940` | `confirmActivatePlan(key)` `L5947` → `doActivatePlan(key)` `L5957` | §9.2 | `DB.plans[key].status`, `DB.auditLog` | `manage_plans` `L5958` | `activate_plan` (label "Activate plan" `L2911`) | **Yes** — bespoke modal `L5950–L5954` |
| **Deactivate** (per row, when Active) | `L5940` | `confirmDeactivatePlan(key)` `L5966` → `doDeactivatePlan(key)` `L5978` | §9.2 | `DB.plans[key].status`, `DB.auditLog` | `manage_plans` `L5979` | `deactivate_plan` (label "Deactivate plan" `L2911`) | **Yes** — bespoke modal `L5969–L5976`, shows live active-sub count |
| **+ Add type** | `L1057` | `addRideType()` `L12356–L12367` | Validates name, pushes `{id:'custom_'+Date.now(), …, active:true, custom:true}`, logs, clears form, re-renders, toast `✅ <name> added` | `DB.quickRideTypes`, `DB.auditLog` | `manage_plans` `L12357` | `config_updated` / entity `quickrides` / id `ridetypes` `L12362` | **Yes** — `GATE_SWEEP.addRideType` `L20819`: "Add a ride type", consequence "Becomes bookable once the plan or pricing referencing it is saved.", button "Add type"; **not** danger |
| **Remove** (ride type, custom only) | `L12350` | `removeRideType(id)` `L12368–L12374` | Filters the type out of `DB.quickRideTypes`, logs `Removed a ride type`, re-renders, toast `Ride type removed` (`info`) | `DB.quickRideTypes`, `DB.auditLog` | `manage_plans` `L12369` | `config_updated` `L12371` | **No** — `removeRideType` has **no** `GATE_SWEEP` entry and no modal; a single click deletes it. Only shown for `t.custom` rows (`L12350`), so the three seeded types cannot be removed. |
| **Save ride type pricing** | `L1059` | `saveRideTypes()` `L12375–L12388` | Deep-clones `DB.quickRideTypes` as `before` (`L12376`), reads every `[data-type-field]` input back into the matching object (`L12377–L12384`), logs with full before/after, re-renders, toast `✅ Ride type pricing saved — applies to new completed trips immediately` | `DB.quickRideTypes[*]`, `DB.auditLog` | `manage_plans` `L12376` | `config_updated` `L12385` | **Yes** — `GATE_SWEEP.saveRideTypes` `L20798–L20800`, `d:true` (**danger**): "Save ride types" / "Ride types define what riders can book and what captains are matched to." / "Removing a type can orphan trips that reference it." / "Pricing attached to a type changes with it." / button "Save ride types" |
| **Save surge settings** | `L1066` | `saveSurgeConfig()` `L12334–L12341` | Writes `enabled` from the checkbox, writes clamped `capMultiplier`, logs, re-renders, toast `✅ Surge settings saved` | `DB.surgeConfig`, `DB.auditLog` | `manage_plans` `L12335` | `config_updated` `L12337` | **Yes** — `GATE_SWEEP.saveSurgeConfig` `L20792–L20794`, `d:true`: "Save surge settings" / "Surge multiplies what every rider pays in the affected zones." / "Takes effect on the next fare calculation." / "Riders see the multiplier before they book — a mistake here is visible to customers immediately." / button "Save surge" |
| **+ Add window** | `L1074` | `addSurgeWindow()` `L12302–L12313` | Validates all four inputs, pushes `{id:'surge_'+Date.now(), days:WEEKDAYS.slice(), enabled:true}`, logs, clears form, re-renders, toast about the 7-day default | `DB.surgeSchedule`, `DB.auditLog` | `manage_plans` `L12303` | `config_updated` `L12309` | **Yes** — `GATE_SWEEP.addSurgeWindow` `L20823–L20824`, `d:true`: "Add a surge window" / "Riders in this window will be charged the multiplier automatically." / button "Add window" |
| **Remove** (surge window) | `L12298` | `removeSurgeWindow(id)` `L12314–L12320` | Filters the window out, logs `Removed a surge window`, re-renders, toast `Surge window removed` (`info`) | `DB.surgeSchedule`, `DB.auditLog` | `manage_plans` `L12315` | `config_updated` `L12317` | **Yes** — `GATE_SWEEP.removeSurgeWindow` `L20825–L20826`, `d:true`: "Remove a surge window" / "Pricing in that window returns to standard immediately." / button "Remove" |
| **Save surge schedule** | `L1076` | `saveSurgeSchedule()` `L12321–L12333` | Reads every `[data-surge-field]` back into the matching window (`L12322–L12330`), logs `Surge schedule updated` with **empty** before/after objects (`L12331`), re-renders, toast `✅ Surge schedule saved — applies to new completed trips immediately` | `DB.surgeSchedule[*]`, `DB.auditLog` | `manage_plans` `L12322` | `config_updated` `L12331` | **Yes** — `GATE_SWEEP.saveSurgeSchedule` `L20795–L20797`, `d:true`: "Save the surge schedule" / "Scheduled multipliers apply automatically without anyone approving them at the time." / "Windows fire unattended, including overnight." / "Check the schedule against the on-call rota before saving." / button "Save schedule" |

### Gating mechanics
- `requirePerm(permKey)` `L3126–L3132`: on failure it writes an audit entry `logAction('permission_denied','permission',permKey,'Blocked — tried "<label>" without permission')` and toasts `🔒 Your role lacks permission: <label>` (`err`), returning `false`.
- `manage_plans` label: `'Create / edit pricing plans'` (`L3229`), long description `'Create, edit, or archive subscription pricing plans and their trip allowances.'` (`L3248`).
- Roles holding `manage_plans` in the seed: the role at `L2832` (full list incl. `manage_settings`) and the role at `L2840`. Permission-matrix module `plans` (`L10638–L10641`): `legacy:'manage_plans'`, perms `view` ("View plans") and `edit` ("Create / edit plans & feature lists").
- `guardAction(name,builder)` `L17819–L17840` wraps `window[name]`; `gateAll(GATE_SWEEP)` `L20756–L20767` installs the specs. Confirmed actions bypass the modal when `window.__skipGuards` is set or the re-entry token matches (`L17824–L17827`).
- `logAction()` `L3133–L3157`: unshifts onto `DB.auditLog`, id `AUD-####`, timestamp `new Date().toLocaleTimeString()` (real clock, unlike surge's `REQ_NOW_REF`), actor `CURRENT_USER_ID` (`L2865`, `'USR-1'`), caps the log at 500 entries, re-renders the audit log.

---

## 14. Tables & lists

### 14.1 All plans — `#plans-tbody` (`L1041–L1044`), rendered by `renderPlansTable()` `L5927–L5946`

| # | Column header (`L1042`) | Cell source (`L5936–L5940`) | Format |
|---|---|---|---|
| 1 | Name | `p.name` | `<p class="td-name">` |
| 2 | Duration | `p.duration` | `"N days"` |
| 3 | Execute | `p.execute` | raw number |
| 4 | Cap | `p.cap` | raw number |
| 5 | Eyvar % | `p.eyvarPct` | `"N%"` |
| 6 | Discount | `p.discountPct` | `"N%"` |
| 7 | Eco/min | `p.ecoMin` | `.toFixed(2)` |
| 8 | Comfort/min | `p.comfortMin` | `.toFixed(2)` |
| 9 | Active subs | `activeSubsForPlanCadence(p.name)` | number; `var(--blue)` if `>0`, else `var(--ghost)` (`L5937`) |
| 10 | Status | `statusBadge(p.status)` | badge (`L5938`) |
| 11 | *(unlabelled)* | action buttons | `<div class="ra">` — **Edit** always; **Deactivate** (danger) if Active, else **Activate** (primary) (`L5939–L5940`) |

- Row source: `Object.keys(DB.plans)` `L5930` — **insertion order, not `sortOrder`**.
- Filters/sorts: **none**.
- Row click: **none** — only the buttons are clickable.
- Empty state: **none** (blank tbody).
- `ecoKm` / `comfortKm` / `nameAr` / `sortOrder` / `ecoActive` / `comfortActive` / `features` are **not surfaced** in this table.

### 14.2 Ride types & pricing — `#ridetypes-tbody` (`L1051`), rendered by `renderRideTypesTable()` `L12342–L12355`

| # | Column header (`L1051`) | Cell source (`L12345–L12350`) | Editable? |
|---|---|---|---|
| 1 | Type | `t.name` | No |
| 2 | Base fare (SAR) | `t.baseFare` | Yes — `data-type-field="baseFare"` |
| 3 | Per km (SAR) | `t.perKm` | Yes |
| 4 | Per min (SAR) | `t.perMin` | Yes |
| 5 | Example — 10km/20min | `(baseFare + 10×perKm + 20×perMin).toFixed(2)` + `" SAR"` | No — **static until re-render**; editing the inputs does not update it |
| 6 | Active | `t.active` toggle checkbox | Yes |
| 7 | *(unlabelled)* | **Remove** (danger) **only if `t.custom`** | — |

Row source `DB.quickRideTypes` `L12344`, `data-type-id` attribute per row. No sort, no filter, no row click, no empty state.

### 14.3 Surge windows — `#surge-tbody` (`L1068`), rendered by `renderSurgeSchedule()` `L12283–L12301`

| # | Column header (`L1068`) | Cell source (`L12294–L12298`) | Editable? |
|---|---|---|---|
| 1 | Window | `s.label` | Yes — text input |
| 2 | Hours | `s.startHour` – `s.endHour` (two inputs joined by `" – "`) | Yes |
| 3 | Days | `s.days.join(', ')` | **No — read-only text** |
| 4 | Multiplier (×) | `s.multiplier` | Yes |
| 5 | Enabled | `s.enabled` toggle | Yes |
| 6 | *(unlabelled)* | **Remove** (danger) — on every row, including the three seeded ones | — |

Row source `(DB.surgeSchedule||[])` `L12293`, `data-surge-id` per row. No sort, no filter, no row click, no empty state.

### 14.4 Plan features list — `#pf-list`
On the editor page — see `14b-plan-editor.md` §14.

---

## 15. Modals opened

All modals on this page write directly into `#modal-content` and open by adding class `open` to `#modal-overlay`.

| Modal | Opened by | Header | Body | Footer buttons |
|---|---|---|---|---|
| Activate plan | `confirmActivatePlan(key)` `L5947–L5956` | `Activate <name> plan` + `✕` `closeModal()` | Explainer paragraph + green info box "Once active, the plan appears in the renewal flow and new-subscription form." | `Cancel` (`closeModal()`), `Activate plan` (primary → `doActivatePlan(key)`) |
| Deactivate plan | `confirmDeactivatePlan(key)` `L5966–L5977` | `Deactivate <name> plan` + `✕` | Red warning box + a live active-subscription line or a "No active subscriptions currently on this plan." ghost line | `Cancel`, `Deactivate plan` (danger → `doDeactivatePlan(key)`) |
| Archive plan | `archivePlan()` `L6156–L6164` (fired from the **editor** page, `L1085`) | `Archive <name> plan` + `✕` | Red warning box only | `Cancel`, `Archive plan` (danger → `doArchivePlan()`) |
| Confirmation gate | `guardAction` wrapper `L17819` → `confirmAction(spec)` (defined `L17769–L17801`) | `(danger ? '⚠ ' : '') + spec.title`, close `✕` → `cancelConfirm()` `L17802` | optional `ownerWarn` amber box, `summary` paragraph, a "What happens when you confirm" box listing `consequences` (red-tinted when `danger`), optional "⚠ This cannot be undone." when `irreversible`, plus any `options` fields (checkbox/select/number/text) | `Cancel` (`cancelConfirm()`), `spec.confirmLabel` (danger or primary) → `runConfirm()` `L17803–L17815` which collects `values` and calls `spec.onConfirm(values)` |
| Permission denied | *(no modal)* — `requirePerm()` `L3126` produces only a toast + audit entry | — | — | — |

---

## 16. Cross-module links

| Direction | From | To | Line |
|---|---|---|---|
| In | Sidebar → Plans | `go('plans',this)` | `L538` |
| In | Quick Rides page hint: "Looking for ride type pricing (Economy/Comfort/Large)? It's moved to **Pricing Plan → Quick Rides**." | `go('plans',findSbEl('plans'))` | `L1140` |
| In | Settings → Plan visibility hint: "Subscription commission is set per plan on the **Plans page** — each cadence prices differently, so a single toggle here wouldn't fit." | `go('plans',findSbEl('plans'))` | `L1605` |
| Out | Plans table Edit / + New plan | `go('plan-edit')` | `L6063`, `L6106` |
| Out | Archive completes | `go('plans',null)` | `L6174` |
| Data-out | `DB.plans[key].eyvarPct` → driver payout rate for subscription trips | `commissionRateForPlan(planLabel)` `L4461–L4466`, via `planKeyFromLabel()` `L4450–L4456`; falls back to `driverCommissionRate()` `L4467` (`DB.opsConfig.pricing.driverCommissionPct`, default 80) for quick rides | `L4457–L4466` |
| Data-out | `DB.plans.weekly.cap` → Dashboard "Cancellation cap reached today" alert | `L10366–L10367` |
| Data-out | `DB.plans` count/status → `liveSubtitles()` page sub-line | `L21251–L21253` |
| Data-out | `DB.quickRideTypes` → `quickRideFare()` → `completeTrip()` fare materialisation | `L12401`, `L12419` |
| Data-out | `DB.quickRideTypes` → New-ride-request estimate strip | `L2476–L2477` |
| Data-out | `DB.quickRideTypes` → `computeDynamicSubPrice()` route-based leg fare | `L4544–L4548` |
| Data-out | `DB.surgeConfig` + `DB.surgeSchedule` → `currentSurgeMultiplier()` | `L12389` |
| Data-out | `DB.opsConfig.planVisibility` → `isPlanVisibleForRider()` → New Subscription modal | `L8141`, `L4569` |
| Audit | All handlers → `DB.auditLog` → Activity log page (`audit-log`) and Settings | `L3133`, `L8807`/`L8829` |
| Adjacent (separate engine) | Settings → `renderPricing()` rate-card card `#pricing-body`, `openRateCardChange()` `L21740`, `approveRateCard()` `L21603`, `openSuspendSurge()` `L21720` / `commitSuspendSurge()` `L21736` / `suspendSurge()` `L21534` | `L21622`, `L8819` |

---

## 17. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `3 plan templates · 2 active · 1 draft` | `#plans-page-sub` static markup `L1031` | Overwritten on first render, but ships baked in |
| `subs.plans = '3 plan templates'` | `L2169` | Toolbar sub-line — **never recomputed**, stays "3" no matter how many plans exist |
| `10 km` and `20 min` example trip | `cr()` `L12986` (`(20*pm)+(10*pk)`), ride-type example `L12345`, preview strip labels `L1086`, editor table header `L1119`, formula note `L1125` | Not configurable anywhere |
| Quick-ride fallback fare `2.50 + km×1.10 + min×0.35` | `L12403` | Only reached if `DB.quickRideTypes` is empty |
| `capMultiplier` fallback `2.5` | `L12336`, `L12399` | Duplicated literal |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | `L9555` | Simulated "now" used by the surge live badge — the page never uses the real clock for surge |
| `WEEKDAYS` `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` | `L4525` | |
| New surge windows always get **all 7 days** | `L12308` | No UI to change it — toast admits this `L12312` |
| `PLANS` constant (`weekly/biweekly/monthly` with `exec`, `eco`, `comfort` flat totals `86.50 / 122.50`, `164.35 / 232.50`, `344.52 / 487.00`) | `L4389–L4393` | A **second, frozen** plan table that the New Subscription and Renewal flows use instead of `DB.plans` |
| `CADENCE_META` (`weekly {0%,20%}`, `biweekly {5%,18%}`, `monthly {10%,15%}`) | `L4519–L4523` | Duplicates `discountPct`/`eyvarPct` from `DB.plans`, read independently |
| `CADENCE_DAYS = {weekly:7, biweekly:14, monthly:30}` | `L11231` | Duplicates `DB.plans[*].duration` |
| `{weekly:5, biweekly:10, monthly:22}` leg counts | `L21485` | Duplicates `DB.plans[*].execute` — third copy |
| `URBAN_AVG_SPEED_KMH = 26` | `L7262` | Used to synthesise trip minutes from km |
| `DB.multiStopConfig = {extraStopFeeSAR:3}` | `L13862` | |
| Whole `DB.rateCard` seed (`RC-2026-08-01`, Economy base 5.00 / 1.20 / 0.40 / min 12.00, Comfort 8.00 / 1.75 / 0.55 / min 18.00, commission 22/20, `returnLegFactor 0.90`, `planDiscountPct {12,16,20}`, `surge.capByCity {RUH:2.0,JED:2.0}`, `floors {targetMarginPct:12, supportCostPerSubscriber:9.00, paymentFeePct:2.2, emergencyReservePct:3.5}`) | `L21431–L21462` | Yet another rate set, disjoint from `DB.plans` |
| `PRICING_EXAMPLES` (`5 km/12 min`, `10 km/20 min`, `18 km/32 min`) | `L21617–L21621` | Demo rows in the Settings pricing card |
| "SAR 1,350–1,850 a month" car-ownership comparison | `L21673` | Editorial copy in `renderPricing()` |
| Payment simulation in the renewal flow: `Math.random() > 0.25` ≈ 75% success (comment says ~80%) | `L11386–L11388` | Demo behaviour, cross-module |
| `savePlan()` 700 ms fake latency; `newPlan()` 400 ms | `L6129`/`L6148`, `L6107` | Simulated network delay |

---

## 18. i18n / localisation

| Item | Detail | Line |
|---|---|---|
| Sidebar label | `<span class="sb-lbl" data-i18n="nav.plans">Pricing Plan</span>` | `L538` |
| Arabic translation | `'nav.plans':'خطة التسعير'` | `L7910` |
| RTL CSS scoping | `body.lang-ar` rules exist only for `#stab-general` and `#stab-security` (`L394`, `L398`) — **no RTL styling for `#p-plans` or `#p-plan-edit`** | `L394`, `L398` |
| Page content i18n | **None.** No `data-i18n` attribute appears anywhere between `L1030` and `L1129`. All headings, column headers, labels, toasts and modal copy are English-only string literals. | — |
| Arabic **data** fields | `plan.nameAr` (seed `L2890`, `L2892`, `L2894`) and `feature.ar` (seed `L2891`, `L2893`, `L2895`). Both are edited on the plan-editor page (`14b` §12) and are **required on save** (`L6125`, `L6050–L6056`) | — |
| Arabic rendering | `#fp3-name-ar` carries `style="direction:rtl;text-align:right"` `L1091`; feature AR inputs carry `dir="rtl"` + `text-align:right` `L6015–L6017` | — |
| Arabic char-limit hint | Localised: `'<n> حرف — قد يلتف على الجوال (الأفضل ≤60)'` `L6017` | |
| Currency | All amounts are SAR, formatted by `fmt(n)` = `n.toFixed(2)+' SAR'` `L12985` and `fmtSAR()` `L4394`. No locale-aware number formatting. | |
| Consumption of `nameAr` | **None anywhere except the editor form** — no renderer, table, badge or export reads it | — |

---

## 19. Gaps, dead code, UNVERIFIED items

1. **Four disjoint pricing models coexist.** `DB.plans` (this page), `PLANS` + `CADENCE_META` + `CADENCE_DAYS` (new-sub / renewal flows, `L4389`, `L4519`, `L11231`), `DB.quickRideTypes` + surge (quick rides, `L13908`), and `DB.rateCard` (Settings, `L21431`). Editing a plan on this page changes **only** `commissionRateForPlan()` (`L4463`) and the dashboard cancel-cap alert (`L10366`). Prices, discounts and durations shown to a rider in the New Subscription modal come from the frozen `PLANS`/`CADENCE_META` constants.
2. **Plan `status` has no effect on what riders can buy.** `renderNewSubModal()` iterates `Object.keys(PLANS)` (`L4571`), never `DB.plans`, and never checks `status`. Deactivating or archiving a plan therefore does **not** remove it from the new-subscription form — contradicting the Activate modal's copy "the plan appears in the renewal flow and new-subscription form" (`L5952`) and the Deactivate copy "hides this plan from new subscriptions" (`L5972`).
3. **`sortOrder` is dead.** Stored, edited, saved, logged — but `renderPlansTable()` uses raw key order (`L5930`) and nothing else sorts by it.
4. **`ecoActive` / `comfortActive` are dead.** Toggled, persisted and audited (`L6109–L6116`), but no renderer or pricing function reads them. The toast claims "riders will see it on this plan" / "hidden from this plan until re-enabled" (`L6115`) — unsupported by any code path.
5. **`ecoKm` and `comfortKm` never appear in the plans table** (`L1042`) even though they are half of the per-plan rate card.
6. **`duration` has no pricing consumer.** `CADENCE_DAYS` (`L11231`) is used instead.
7. **`nameAr` has no consumer** outside the editor form (§18).
8. **`activate_plan` audit `before` is hardcoded** to `{status:'Draft'}` (`L5962`) — activating an `Archived` plan logs a false prior state. `deactivate_plan` hardcodes `{status:'Active'}` (`L5983`) but that one is guaranteed correct because the button only renders when Active.
9. **Audit action labels missing.** `ACTION_LABELS` (`L2899–L2913`) defines `activate_plan` and `deactivate_plan` (`L2911`) but **not** `save_plan` (`L6146`), `archive_plan` (`L6172`), or `toggle_vehicle_active` (`L6114`). Those three render with a raw key in the activity log.
10. **`removeRideType()` is ungated** (`L12368`) — no `GATE_SWEEP` entry, no confirmation modal, one click deletes. Every other destructive action in this module is gated. Mitigated only by the Remove button rendering solely for `t.custom` rows (`L12350`).
11. **`newPlan()` writes to `DB.plans` with no audit entry** (`L6098–L6108`) and no confirmation gate — the only unlogged `DB` write in the module.
12. **`archivePlan()` (the modal opener) is ungated on permission** — `requirePerm('manage_plans')` sits on `doArchivePlan()` (`L6166`) but not on `archivePlan()` (`L6156`), so an unauthorised user sees the confirmation before being refused.
13. **Archived plans are not removed from the list** and can be re-activated with one click (`L5934`, `L5940`) — "Archived" is functionally identical to "Draft" apart from the badge text.
14. **`saveSurgeSchedule()` logs empty before/after** (`L12331`, `{},{} `) so the activity log records that the schedule changed but not what changed. `saveRideTypes()` does it properly (`L12376`, `L12385`).
15. **Surge windows have no zone dimension**, while the rate card's surge model does (`capByCity` `L21459`, `surgeSuspensions` `L21464`). The two never meet: `currentSurgeMultiplier()` (`L12389`) ignores `capByCity` and ignores active suspensions.
16. **`t.active` on a ride type is inert** — `quickRideFare()` (`L12401`) does not filter by it.
17. **The ride-type "Example" column does not include surge** (`L12345`) while the actual fare does (`L12404`) — the displayed example understates the charged fare during a surge window.
18. **`new-surge-mult` is not clamped in JS** (`L12305–L12308`), unlike `surge-cap` (`L12336`). A multiplier above 5 can be written to `DB.surgeSchedule` programmatically or by defeating the HTML `max`; `currentSurgeMultiplier()`'s `min(mult, capMultiplier)` (`L12399`) is the only real backstop.
19. **`addSurgeWindow()` does not validate `endHour > startHour`** (`L12305–L12306`). A window `20 → 4` silently never matches (`L12397` requires `hour >= start && hour < end`).
20. **`renderRideTypesTable()` is missing from the boot block** (`L14568–L14573`) — the Quick Rides ride-type table is blank until the user visits the Plans page once.
21. **Two writers for `#plans-page-sub` / `#p-plans .ph-l p`** with different wording (`L5944` "draft" vs `L21253` "not live"); whichever ran last wins.
22. **`planFloorCheck()` (`L21512`) and `planLegPrice()` (`L21481`) have no call sites** in this file — the "check that blocks a publish" (`L21511`) is never invoked, so no floor is ever enforced against a plan price. **UNVERIFIED beyond grep**: searched for `planFloorCheck(` and `planLegPrice(`; the only hit for `planLegPrice` is inside `planQuote()` `L21486`, and `planFloorCheck` has only its definition.
23. **UNVERIFIED — surge live badge staleness.** `renderSurgeSchedule()` is called on nav and on every surge mutation (`L12311`, `L12318`, `L12331`, `L12339`) and at boot (`L14573`). `REQ_NOW_REF` advances at `L9680` inside the request tick loop, but no tick handler re-renders the surge table, so the badge can drift from the simulated clock. Not directly observable from source alone.
24. **No `GATE_SWEEP` spec in this module declares `options` or `irr`** (`L20792–L20826`), so every gate modal here is title + summary + consequences + Cancel/Confirm only — no inline choices at the point of decision, and none is marked irreversible (`confirmAction()` `L17769–L17801`).
25. **`can()` reads a flat per-user permission array, not the role matrix.** `can(permKey)` `L3122–L3125` looks up `DB.teamUsers[CURRENT_USER_ID].permissions.indexOf(permKey) >= 0`. The granular `plans.view` / `plans.edit` matrix (`L10638–L10641`) declares `legacy:'manage_plans'` but **UNVERIFIED** whether anything reconciles the granular keys back into `u.permissions` — no such reconciliation was found from the call sites in this module, all of which check the legacy `'manage_plans'` string only.

---

## 20. Line-number index

### HTML
| Lines | Content |
|---|---|
| `L394`, `L398` | `body.lang-ar` RTL rules (settings tabs only) |
| `L459` | CSS `div[id^="pricingsub-"]{flex-shrink:0}` |
| `L538` | Sidebar nav item for `plans`, `data-i18n="nav.plans"` |
| `L1029` | `<!-- PAGE: PLANS -->` |
| `L1030` | `<div class="page" id="p-plans">` |
| `L1031` | Page header, `#plans-page-sub`, `#plans-new-btn` → `newPlan()` |
| `L1033–L1036` | Sub-tab bar; `#pricingsub-plans`, `#pricingsub-quickrides` |
| `L1038–L1046` | `#pricingtab-plans` pane — "All plans" card |
| `L1042` | Plans table `<thead>` (11 columns) |
| `L1043` | `#plans-tbody` |
| `L1048–L1078` | `#pricingtab-quickrides` pane |
| `L1050` | "🚕 Ride types & pricing" header + fare-formula note |
| `L1051` | Ride-types table head + `#ridetypes-tbody` |
| `L1052–L1058` | New-ride-type form row + `+ Add type` |
| `L1059` | `Save ride type pricing` |
| `L1061–L1077` | "⚡ Surge pricing" card |
| `L1062` | `#surge-live-badge` |
| `L1064–L1066` | `#surge-enabled`, `#surge-cap`, `Save surge settings` |
| `L1068` | Surge table head + `#surge-tbody` |
| `L1069–L1075` | New-surge-window form row + `+ Add window` |
| `L1076` | `Save surge schedule` |
| `L1079` | `</div>` closing `p-plans` |
| `L1082–L1129` | `p-plan-edit` page (see `14b`) |
| `L1140` | Quick Rides page → Plans cross-link |
| `L1603–L1618` | Settings → Plan visibility card |

### JavaScript — data
| Lines | Content |
|---|---|
| `L2168–L2169` | `titles.plans`, `subs.plans` |
| `L2574` | `DB.opsConfig.planVisibility = {hideIfNoCoverage:false}` |
| `L2832`, `L2840` | Seeded roles holding `manage_plans` |
| `L2885–L2888` | `DB.plans` seed comment |
| `L2889–L2896` | `DB.plans` seed |
| `L2897` | `var currentPlanKey=null` |
| `L2899–L2913` | `ACTION_LABELS` (incl. `activate_plan`, `deactivate_plan` at `L2911`) |
| `L3229`, `L3248` | `manage_plans` permission labels |
| `L4389–L4393` | `PLANS` constant |
| `L4519–L4523` | `CADENCE_META` |
| `L4525` | `WEEKDAYS` |
| `L5992–L5996` | `PLAN_FEATURES` working array |
| `L7262` | `URBAN_AVG_SPEED_KMH = 26` |
| `L7910` | `'nav.plans':'خطة التسعير'` |
| `L9555` | `REQ_NOW_REF` simulated clock |
| `L10638–L10641` | Permission-matrix `plans` module |
| `L11231` | `CADENCE_DAYS` |
| `L13861` | `DB.surgeConfig` |
| `L13862` | `DB.multiStopConfig` |
| `L13883–L13887` | `DB.surgeSchedule` |
| `L13904–L13912` | `DB.quickRideTypes` (+ comment) |
| `L21431–L21462` | `DB.rateCard` |
| `L21464` | `DB.surgeSuspensions` |
| `L21617–L21621` | `PRICING_EXAMPLES` |

### JavaScript — functions
| Line | Function |
|---|---|
| `L3126` | `requirePerm()` |
| `L3133` | `logAction()` |
| `L3730` | `statusBadge()` |
| `L4450` | `planKeyFromLabel()` |
| `L4461` | `commissionRateForPlan()` |
| `L4467` | `driverCommissionRate()` |
| `L4529` | `perTripBaseRate()` |
| `L4535` | `computeDynamicSubPrice()` |
| `L4557` | `renderNewSubModal()` (plan options `L4568–L4580`) |
| `L5336` / `L5427` | `customSelectHTML()` / `cselSetValue()` |
| `L5921` | `activeSubsForPlanCadence()` |
| `L5927` | `renderPlansTable()` |
| `L5947` | `confirmActivatePlan()` |
| `L5957` | `doActivatePlan()` |
| `L5966` | `confirmDeactivatePlan()` |
| `L5978` | `doDeactivatePlan()` |
| `L5998` | `renderPlanFeatures()` |
| `L6030` / `L6037` / `L6050` | `addPlanFeature()` / `removePlanFeature()` / `validatePlanFeatures()` |
| `L6061` | `openPlanEdit()` |
| `L6065` | `loadPlanEditForm()` |
| `L6098` | `newPlan()` |
| `L6109` | `toggleVehicleActive()` |
| `L6117` | `savePlan()` |
| `L6150` | `numval()` |
| `L6156` / `L6165` | `archivePlan()` / `doArchivePlan()` |
| `L8034` | `val()` |
| `L8122` / `L8128` / `L8141` | `renderPlanVisibility()` / `savePlanVisibility()` / `isPlanVisibleForRider()` |
| `L8774` | `window.go` router (plans branch `L8807`, plan-edit branch `L8795`, settings branch `L8819`) |
| `L12274` | `switchPricingSubTab()` |
| `L12283` | `renderSurgeSchedule()` |
| `L12302` / `L12314` / `L12321` / `L12334` | `addSurgeWindow()` / `removeSurgeWindow()` / `saveSurgeSchedule()` / `saveSurgeConfig()` |
| `L12342` / `L12356` / `L12368` / `L12375` | `renderRideTypesTable()` / `addRideType()` / `removeRideType()` / `saveRideTypes()` |
| `L12389` | `currentSurgeMultiplier()` |
| `L12401` | `quickRideFare()` |
| `L12406` | `completeTrip()` (fare materialisation `L12419`) |
| `L12796` | `renderPlansFormSelects()` |
| `L12985–L12999` | `fmt()`, `cr()`, `upd()` + input listener binding |
| `L14568–L14573` | Boot render calls |
| `L17819` | `guardAction()` |
| `L20756` | `gateAll()` |
| `L20792–L20826` | `GATE_SWEEP` entries for this module |
| `L21212` / `L21235` | `riderKpiHTML()` / `liveSubtitles()` (plans sub-line `L21251–L21253`) |
| `L21466` / `L21481` / `L21484` / `L21512` | `fareFor()` / `planLegPrice()` / `planQuote()` / `planFloorCheck()` |
| `L21520` / `L21523` / `L21534` | `surgeCapFor()` / `effectiveSurge()` / `suspendSurge()` |
| `L21622` | `renderPricing()` |
| `L21720` / `L21736` | `openSuspendSurge()` / `commitSuspendSurge()` |
| `L21772` | `pricingBoot()` |
