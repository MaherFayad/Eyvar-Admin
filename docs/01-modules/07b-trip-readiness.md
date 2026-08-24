# Module: Trip Readiness (pre-departure monitoring)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `readiness` · **Container div:** `#p-readiness`
> **HTML lines:** L869–L886 (section comment L868)
> **Primary render:** `window.renderReadiness` L13005–L13068 (final override — see §17)
> **Scoring:** `window.readinessStatus` L8702–L8709 · parallel scorer `tripScenario()` L8291–L8328
> **Related handlers:** `setReadinessSort()` L13069–L13077, `assignBackup()` L13186–L13217

---

## 1. Purpose

Pre-departure watchtower for **subscription** trips (not quick rides). It reads `DB.upcomingSubTrips`, assigns each trip a four-level readiness state from three signals (driver availability, driver movement, rider confirmation, each weighed against minutes-until-departure), groups the table by urgency, and offers per-row remediation: call the rider, call/nudge the driver, find a replacement driver, notify the rider of a change, postpone the trip, or raise a support ticket.

Page copy (L870) states the scope as "Upcoming subscription trips in the next 24 hours — confirm riders and drivers are on track before departure". **No 24-hour filter is actually applied** — see §7.

---

## 2. Entry points & routing

| Entry point | Line | Effect |
|---|---|---|
| Sidebar `go('readiness',this)` | L507 | Shows `#p-readiness`; title from `titles.readiness` = `'Trip Readiness'` (L2168); subtitle from `subs.readiness` = `'Upcoming subscription trips in the next 24 hours'` (L2169) |
| `go()` dispatch | L8817 | `if(id==='readiness'){renderReadiness();}` |
| Boot sequence | L14593 | `renderReadiness()` once at init |
| `setReadinessSort(mode)` | L13069–L13077 | Re-renders in place |

**Re-render triggers from other modules** (each calls `renderReadiness()` if defined):

| Caller | Line | Why |
|---|---|---|
| `confirmSubDriverCommit()` (subscription start) | L4853 | driver accepted / deferred |
| `generateUpcomingTripsForSubscription()` | L4878 | new UST legs were created |
| `commitDriverChange()` (subscription driver swap) | L5865 | driver replaced on a subscription |
| `assignNearestDriver()` | L8495 | driver assigned from the nearby-drivers map |
| `confirmPostponeTrip()` | L8650 | a trip was removed from the board |
| `renderSuccess()` (renewal wizard) | L11447 | plan/expiry changed |
| `logCallOutcome()` / `logDriverCall()` / `sendRiderChangeNotif()` / `finalizeReassign()` | L8541, L8567, L8595, L13127 | inline state writes |

**No permission gate on page entry** — `renderReadiness` (L13005–L13068) contains no `requirePerm` / `requirePagePerm` call.

---

## 3. Layout map

```
#p-readiness                                                   L869
├── .ph                                                        L870
│   ├── h1 "⏰ Subscription trip readiness"                    L870  hardcoded
│   └── p "Upcoming subscription trips in the next 24 hours…"  L870  hardcoded, never updated
├── .g4  (4 KPI tiles, static markup, values injected)         L871–L876
│   ├── .kpi.click  "Upcoming (24h)"        #rd-total          L872
│   ├── .kpi.click  "Rider not confirmed"   #rd-unconf         L873
│   ├── .kpi.click  "Driver not moving"     #rd-notmoving      L874
│   └── .kpi.click  "Driver unavailable"    #rd-unavail        L875
└── .card                                                      L877–L885
    ├── .ch                                                    L878–L883
    │   ├── h2 #readiness-sort-title                           L878
    │   ├── button #rd-sort-urgency  "By urgency"              L880
    │   └── button #rd-sort-time     "By departure time"       L881
    └── #readiness-list  (max-height 520px, overflow-y auto)   L884
```

---

## 4. Data model & fields

### 4.1 `DB.upcomingSubTrips[]` — seeded L6177–L6242

One record per upcoming subscription leg (a "UST"):

| Field | Type | Example | Read at | Written at |
|---|---|---|---|---|
| `id` | `UST-n` | `'UST-4'` | L13044–L13048, L13079, L13097, L13123 | L4865 (`'UST-'+(++window.__ustSeq \|\| 2000)`) |
| `sub` | `SUB-nnnn` | `'SUB-1060'` | L13050 (displayed), L13048 (ticket) | L4866 |
| `rider` | `RDR-nnnn` | `'RDR-2031'` | L13032–L13035 | L4866 |
| `driver` | `DRV-nnnn` | `'DRV-0102'` | L13032, L13038 | L4866, **L13103** (`confirmReassign`), **L8593** (`sendRiderChangeNotif`), **L8492** (`assignNearestDriver`), L5853 (`commitDriverChange`) |
| `scheduledTime` | display string | `'09:32 AM'`, `'Tomorrow 06:30 AM'` | L13050 | L4867 (`fmtTimeLabel12h`) |
| `minutesUntil` | int | `22` | L13008–L13011, L13031, L13037, L13040, L13045–L13047, L13050 | L4867 (`minutesUntilTime`), decremented L12612 |
| `riderConfirmed` | bool | `false` | L13009, L13037, L13045 | L4868 (`false`), **L8539** (`logCallOutcome`) |
| `confirmedAt` | string / null | `'08:00 AM'` | L13037 | L4868, L8539 (`'Just now'`) |
| `driverStatus` | `'moving'` \| `'not_started'` \| `'unavailable'` | `'not_started'` | L13010, L13011, L13040, L13044, L13046, L13047 | L4868 (`'not_started'`), L8563–L8565, L8593, L13103, L8492, L5853 |
| `unavailReason` | string (only when unavailable) | `'Vehicle breakdown — flat tyre reported'` | L13042 | seeds L6198, L6229; L8565 (`'Declined trip after call'`) |
| `route` | string `'A → B'` | `'KAFD → King Abdullah Financial District'` | L13051 | L4869 |
| `notes` | string | `'GPS shows driver still at home address'` | L13042 | L4869 (`'Auto-generated from subscription schedule'`) |

### 4.2 Joined records

| Lookup | Line | Fallback |
|---|---|---|
| `DB.riders[t.rider]` → `name`, `phone` | L13032–L13033 | `{}` → name falls back to the raw id, phone to `'—'` |
| `DB.drivers[t.driver]` → `name`, `phone` | L13032–L13033, L13039 | `{}` → same fallbacks |
| `DB.subscriptions[t.sub]` | L8609 (postpone), L13243 (capacity grid) | — |

### 4.3 Record creation — `generateUpcomingTripsForSubscription(subId)` L4856–L4880

```
sub = DB.subscriptions[subId]
if (!sub || !sub.days || !sub.days.length || !sub.departTime) return []          L4858
todayName = WEEKDAYS[REQ_NOW_REF.getDay()]                                       L4859
if (sub.days.indexOf(todayName) < 0) return []   // not scheduled today          L4860

pushLeg(timeStr, routeLabel):                                                    L4862–L4872
    mins = minutesUntilTime(timeStr)
    if (mins < 0) return                          // already passed today
    entry = {id:'UST-'+(++window.__ustSeq||2000), sub:subId, rider:sub.rider,
             driver:sub.driver, scheduledTime:fmtTimeLabel12h(timeStr),
             minutesUntil:mins, riderConfirmed:false, confirmedAt:null,
             driverStatus:'not_started', route:routeLabel||'—',
             notes:'Auto-generated from subscription schedule'}
    DB.upcomingSubTrips.push(entry)

pushLeg(sub.departTime, sub.route)                                               L4873
if (sub.direction === 'round-trip' && sub.returnTime):                           L4874–L4877
    reverseRoute = sub.route.split(' → ').reverse().join(' → ')
    pushLeg(sub.returnTime, reverseRoute)
if (created.length) renderReadiness()                                            L4878
```

### 4.4 Clock

`tickEngine()` L12611–L12612: every 60th tick (≈ every 60 s at `setInterval(tickEngine,1000)`, L11968) every trip with `minutesUntil > 0` is decremented by 1. This is the only mechanism that advances readiness state over time.

---

## 5. Stages / statuses & transition rules

### 5.1 Readiness levels — `readinessStatus(t)` L8702–L8709 (first match wins, strict order)

| Order | State (`level`) | Entered when | Label | Colour | Section it lands in | Actions available |
|---|---|---|---|---|---|---|
| 1 | `critical` | `t.driverStatus === 'unavailable'` (L8703) — **no time condition** | `Driver unavailable` | `red` | *Critical — immediate action required* (L13063) | Find replacement, Notify rider, (+ Call rider / driver if their own conditions also hold), Postpone, Ticket |
| 2 | `critical` | `t.minutesUntil <= 30 && t.driverStatus === 'not_started'` (L8704) | `Driver not moving` | `red` | *Critical* | Urgent — driver, Postpone, Ticket (+ Call rider if unconfirmed & ≤60) |
| 3 | `high` | `t.minutesUntil <= 60 && !t.riderConfirmed` (L8705) | `Rider not confirmed` | `red` | *High — action needed soon* (L13064) | Call rider, Postpone, Ticket |
| 4 | `watch` | `t.minutesUntil <= 90 && t.driverStatus === 'not_started'` (L8706) | `Driver not en route yet` | `amber` | *Watch — monitoring* (L13065) | Nudge driver, Postpone, Ticket |
| 5 | `watch` | `!t.riderConfirmed && t.minutesUntil <= 180` (L8707) | `Awaiting confirmation` | `amber` | *Watch* | Postpone, Ticket |
| 6 | `ok` | anything else (L8708) | `On track` | `green` | *On track* (L13066) | Postpone, Ticket |

**SLA / timing thresholds in use:** 30 min (driver must be moving), 60 min (rider must have confirmed), 90 min (driver expected en route), 180 min (confirmation watch window). There is no explicit SLA clock, breach event, escalation timer or audible alert on this page — unlike the Requests module. State changes only as `minutesUntil` decrements (L12612) or as an operator writes a field.

### 5.2 Parallel scorer — `tripScenario(t)` L8291–L8328

A second function mirrors the same ladder but returns richer copy for the nearby-drivers modal and the dashboard interventions feed. The header comment (L8281–L8290) states it "mirrors `readinessStatus()`'s exact priority order (same fields, same thresholds) so the two can never disagree" and adds one extra case checked first.

| Order | `key` | Condition | `color` | `banner` | `primary` |
|---|---|---|---|---|---|
| 0 | `unassigned` | `!t.driver \|\| !DB.drivers[t.driver]` (L8293) | red | `No driver assigned to this trip yet` | `assign` |
| 1 | `unavailable` | `driverStatus === 'unavailable'` (L8299) | red | `<driver> is unavailable — <unavailReason>` | `assign` |
| 2 | `late` | `minutesUntil <= 30 && not_started` (L8304) | red | `<driver> has not started moving — pickup in <fmtCountdown>` | `call_current` |
| 3 | `unconfirmed` | `minutesUntil <= 60 && !riderConfirmed` (L8309) | amber | `This is not a driver issue — the rider has not confirmed yet` | `call_rider` |
| 4 | `watch` | `minutesUntil <= 90 && not_started` (L8314) | amber | `<driver> has not left yet — pickup in <fmtCountdown>` | `monitor` |
| 5 | `watch_confirm` | `!riderConfirmed && minutesUntil <= 180` (L8319) | amber | `Awaiting rider confirmation — plenty of time left` | `monitor` |
| 6 | `ok` | else (L8324) | green | `<driver> is on track — no issue right now` | `view` |

**Divergence:** `readinessStatus` classifies case 3 as `high` with colour **red**, while `tripScenario` classifies the equivalent `unconfirmed` case as **amber**. `readinessStatus` has no `unassigned` case at all — a trip whose driver id is missing from `DB.drivers` falls through to `ok` unless another condition catches it. The comment's "can never disagree" claim is therefore not fully accurate.

The `unassigned` branch (L8293–L8297) never fires against seeded data — the comment at L8286–L8288 says so explicitly ("it never fires today because every seeded trip already has a driver").

### 5.3 Trip removal

The only path that removes a record from `DB.upcomingSubTrips` is `confirmPostponeTrip()` L8644 (`splice(idx,1)`). Nothing marks a trip as departed or completed — a trip whose `minutesUntil` reaches 0 simply stays at 0 (L12612 guards `> 0`) and remains permanently in the *Critical* or *High* band. Flagged as a gap.

---

## 6. Scoring / prioritisation formulas

### 6.1 Level assignment
See §5.1 — a strict-order ladder, not a numeric score. Written out exactly (L8702–L8709):

```
readinessStatus(t):
  if (t.driverStatus === 'unavailable')
      return {level:'critical', label:'Driver unavailable',      color:'red'}
  if (t.minutesUntil <= 30 && t.driverStatus === 'not_started')
      return {level:'critical', label:'Driver not moving',       color:'red'}
  if (t.minutesUntil <= 60 && !t.riderConfirmed)
      return {level:'high',     label:'Rider not confirmed',     color:'red'}
  if (t.minutesUntil <= 90 && t.driverStatus === 'not_started')
      return {level:'watch',    label:'Driver not en route yet', color:'amber'}
  if (!t.riderConfirmed && t.minutesUntil <= 180)
      return {level:'watch',    label:'Awaiting confirmation',   color:'amber'}
  return   {level:'ok',         label:'On track',                color:'green'}
```

### 6.2 Base ordering — L13008
```
trips = DB.upcomingSubTrips.slice().sort((a,b) => a.minutesUntil - b.minutesUntil)   // soonest first
```
This ordering is applied **before** bucketing, so rows inside every urgency section are also soonest-first.

### 6.3 Grouped presentation (default) — L13016–L13019, L13060–L13067
```
critical = trips.filter(t => readinessStatus(t).level === 'critical')
high     = trips.filter(t => readinessStatus(t).level === 'high')
watch    = trips.filter(t => readinessStatus(t).level === 'watch')
ok       = trips.filter(t => readinessStatus(t).level === 'ok')
render:  [Critical] [High] [Watch] [On track]   — each preceded by secH(), omitted when count = 0
```

### 6.4 Time presentation — L13054–L13059
```
if (window.__readinessSort === 'time') → one flat tbody of trips (already soonest-first), no section headers
```

### 6.5 Countdown formatting — `fmtCountdown(min)` L8710–L8715
```
min = parseInt(min,10) || 0
if (min >= 1440) return 'Tomorrow'
if (min >= 60)   return floor(min/60) + 'h ' + (min%60) + 'm'
return min + ' min'
```
Any trip ≥ 24 h out therefore renders as the literal string `Tomorrow`, regardless of how far out it really is.

### 6.6 Backup-captain candidate ranking — `assignBackup()` L13191–L13199
```
candidates = Object.keys(DB.drivers)
  .filter(d =>
      d !== s.driver                                                       L13192
   && DB.drivers[d].status !== 'pending'                                   L13192
   && !driverLiveState(d).busy                                             L13192  (fn L7283)
   && dispatchEligibility(d, s, s.driver).ok                               L13195  (fn L17209)
  )
  .map(d => ({id:d, km: (riderPos && DB.drivers[d].mapPos)
                        ? geoDistanceKm(riderPos, DB.drivers[d].mapPos)     L13198  (fn L7256)
                        : null}))
  .sort((a,b) => (a.km != null && b.km != null) ? a.km - b.km
                 : a.km != null ? -1 : b.km != null ? 1 : 0)                L13199–L13202
  .slice(0, 6)                                                             L13203
```
Per-candidate load shown: `Object.keys(DB.subBackups).filter(k => DB.subBackups[k] === id).length` (L13210).

### 6.7 Replacement-driver candidate selection — `resolveUnavailable()` L13082
```
candidates = Object.keys(DB.drivers)
  .filter(id => id !== t.driver
             && DB.drivers[id].type === (DB.drivers[t.driver] ? DB.drivers[t.driver].type : 'Economy'))
  .slice(0, 3)
```
**No availability, busy, eligibility, distance or rating check** — unlike `assignBackup` (§6.6) and `nearestAvailableDrivers()` (L8167). Purely the first three same-vehicle-type drivers in key order. Flagged.

---

## 7. KPIs & metrics

Four static tiles (L872–L875), values written by `setText()` (fn L8893) at L13012.

| Tile | Value id | Label (HTML) | Formula | Sub-label | Colour | Click |
|---|---|---|---|---|---|---|
| 1 | `rd-total` | `Upcoming (24h)` (L872) | `trips.length` — the **entire** `DB.upcomingSubTrips` array (L13008, L13012) | none | default ink | `kpiScrollTo('readiness-list')` (fn L14535) |
| 2 | `rd-unconf` | `Rider not confirmed` (L873) | `trips.filter(t => t.minutesUntil <= 60 && !t.riderConfirmed).length` (L13009) | `Within 1h of departure` (`kpi-dl dn`) | `var(--amber)` (inline, L873) | `kpiScrollTo('readiness-list')` |
| 3 | `rd-notmoving` | `Driver not moving` (L874) | `trips.filter(t => t.minutesUntil <= 30 && t.driverStatus === 'not_started').length` (L13010) | `Within 30 min of pickup` | `var(--red)` (L874) | `kpiScrollTo('readiness-list')` |
| 4 | `rd-unavail` | `Driver unavailable` (L875) | `trips.filter(t => t.driverStatus === 'unavailable').length` (L13011) | `Needs reassignment now` | `var(--red)` (L875) | `kpiScrollTo('readiness-list')` |

**Verified issues:**
- Tile 1's label promises a 24-hour window but **no time filter is applied** (L13008 sorts, never filters). Seeded records `UST-6` (`minutesUntil: 1290`) and `UST-8` (`minutesUntil: 1340`) are ~21.5 h and ~22.3 h out and are included; a record beyond 1440 min would also be counted.
- Tile colours are fixed in the markup (L873–L875) and never turn neutral at zero.
- All four tiles scroll to the same element — none of them filters the list.
- Tiles 2–4 overlap: a trip that is both `unavailable` and unconfirmed within 60 min is counted twice in the sidebar badge sum (§13).

---

## 8. Data displayed

Per row (`tripRow()` L13030–L13052), six cells:

| # | Column | Element | Source | Line |
|---|---|---|---|---|
| 1 | **Scheduled** | `t.scheduledTime` (12px/600) | DB | L13050 |
| | | `in <fmtCountdown(t.minutesUntil)>` (9px monospace) | computed L8710 | L13050 |
| | | `t.sub` (9px monospace) | DB | L13050 |
| 2 | **Route** | `t.route` (max-width 155px, wraps) | DB | L13051 |
| 3 | **Rider** | name, blue, click → `openProfile(t.rider)` | `DB.riders[t.rider].name` \|\| `t.rider` | L13033, L13035 |
| | | 📍 location button → `showEntityLocation(t.rider, t.id)` | `locBtn()` L13027–L13029 | L13035 |
| | | phone (bold) | `DB.riders[t.rider].phone` \|\| `'—'` | L13033, L13036 |
| | | confirmation badge — `✓ <confirmedAt>` (`b-green`) if `riderConfirmed`, else `⏳ Not confirmed` (`b-red` when `minutesUntil <= 60`, else `b-amber`) | computed | L13037 |
| 4 | **Driver** | name, blue, click → `openProfile(t.driver)` + 📍 `showEntityLocation(t.driver)` | `DB.drivers[t.driver].name` \|\| id | L13038 |
| | | phone | `DB.drivers[t.driver].phone` \|\| `'—'` | L13039 |
| | | status badge — `🚗 En route` (`b-green`) if `moving`; `⚠ Unavailable` (`b-red`) if `unavailable`; else `Not moving` (`b-red` when `minutesUntil <= 30`, else `b-amber`) | computed | L13040 |
| 5 | **Status** | `<span class="health h-<st.color>">st.label</span>` | `readinessStatus()` | L13041 |
| | | if `unavailable`: `t.unavailReason` in red 10px; else if `t.notes`: notes in italic ghost 10px | DB | L13042 |
| 6 | **Actions** | vertical button stack — §10 | computed | L13043–L13048 |

**Row styling (`rs`, L13034):** `critical` → `background:var(--red-lt); border-left:3px solid #EF4444`; `high` → `background:var(--amber-lt); border-left:3px solid #F59E0B`; anything else → `border-left:3px solid transparent`.

**Section header (`secH(label,col,count)` L13020–L13025):** a `<tr><td colspan="6">` band; returns `''` when `count` is 0 (L13021). Palette (L13022–L13024): red `#C62828` on `var(--red-lt)` with border `#FCA5A5`; amber `#B45309` on `var(--amber-lt)` with `#FCD34D`; green `#166534` on `var(--green-lt)` with `#86EFAC`. Text: `<LABEL> — <count>`, uppercase, letter-spacing .5px.

**Empty state (L13015):** `No subscription trips in the next 24 hours.` — centred, 20px padding, ghost colour. Returns early, so the KPI tiles keep their computed zeros.

---

## 9. Input fields / filters / sorts

| Control | Id | Type | Default | Options | Effect |
|---|---|---|---|---|---|
| Sort — by urgency | `rd-sort-urgency` (L880) | button (`btn sm p` initially) | **active** (`window.__readinessSort` is `undefined` at boot, and the branch at L13054 tests `=== 'time'`) | — | `setReadinessSort('urgency')` |
| Sort — by departure time | `rd-sort-time` (L881) | button (`btn sm`) | inactive | — | `setReadinessSort('time')` |

`setReadinessSort(mode)` L13069–L13077:
```
window.__readinessSort = mode                                                     L13070
#readiness-sort-title = 'Upcoming subscription trips — '
                      + (mode === 'time' ? 'sorted by departure' : 'grouped by urgency')   L13071–L13072
#rd-sort-urgency.className = 'btn sm' + (mode !== 'time' ? ' p' : '')             L13074
#rd-sort-time.className    = 'btn sm' + (mode === 'time' ? ' p' : '')             L13075
renderReadiness()                                                                 L13076
```

**There is no search box, no status filter, no date filter and no pagination** on this page. Verified against L869–L886 and L13005–L13068. The KPI tiles are click-targets but only scroll (§7).

---

## 10. Actions

### 10.1 Row action buttons — `tripRow()` L13043–L13048

| Condition | Label | Handler | Class | Line |
|---|---|---|---|---|
| `driverStatus === 'unavailable'` | `🚨 Find replacement` | `resolveUnavailable(t.id)` | `btn sm danger` | L13044 |
| `driverStatus === 'unavailable'` | `📲 Notify rider` | `notifyRiderChange(t.id)` | `btn sm warn` | L13044 |
| `!riderConfirmed && minutesUntil <= 60` | `📞 Call rider` | `callRiderConfirm(t.rider, phone, t.id)` | `btn sm warn` | L13045 |
| `not_started && minutesUntil <= 30` | `📞 Urgent — driver` | `callDriverUrgent(t.driver, t.id)` | `btn sm danger` | L13046 |
| `not_started && 30 < minutesUntil <= 90` | `📞 Nudge driver` | `callDriverUrgent(t.driver, t.id)` | `btn sm` | L13047 |
| always | `📅 Postpone` | `openPostponeTrip(t.id)` | `btn sm` | L13048 |
| always | `🎧 Ticket` | `openReadinessTicket(t.id, t.sub, t.rider, t.driver)` | `btn sm` | L13048 |
| always (rider/driver cells) | 📍 | `showEntityLocation(id[, t.id])` | bare button | L13027–L13028 |
| always (rider/driver names) | — | `openProfile(id)` | text link | L13035, L13038 |

### 10.2 Effects table

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `🚨 Find replacement` | `resolveUnavailable()` L13078–L13094 | opens candidate modal (§12.1) | — | none | none | no |
| — *(inside)* `Assign & notify rider` | `confirmReassign()` L13095–L13118 | **sets `t.driver = picked`, `t.driverStatus = 'moving'`** (L13103), then shows the compensation screen | `DB.upcomingSubTrips[i]` | `requirePerm('manage_subscriptions')` (L13096) | none at this step | no |
| — *(inside)* `Confirm compensation & close` | `finalizeReassign()` L13119–L13131 | `closeModal()`, `renderReadiness()`, audit, toast | nothing further | **none** | `logAction('reassign_driver','trip',ustId, 'Reassigned driver for <id>: → <newDriver> for <rider> · Compensation: <label>', {driver:prevName}, {driver:newName, compensation:label})` (L13129) | no |
| `📲 Notify rider` | `notifyRiderChange()` L8574–L8589 | opens the notify modal (§12.4) | — | none | none | no |
| — *(inside)* `Send notification now` | `sendRiderChangeNotif()` L8590–L8596 | **sets `t.driver = selected`, `t.driverStatus = 'moving'`** (L8593–L8594), `closeModal()`, `renderReadiness()`, toast | `DB.upcomingSubTrips[i]` | **none** | **none** | no |
| `📞 Call rider` | `callRiderConfirm()` L8523–L8535 | opens the call modal (§12.3) | — | none | none | no |
| — *(inside)* `Log outcome` | `logCallOutcome()` L8536–L8546 | only `confirmed` writes: `t.riderConfirmed = true; t.confirmedAt = 'Just now'` (L8539). Then `closeModal()`, `renderReadiness()`, toast | `DB.upcomingSubTrips[i]` | **none** | **none** | no |
| `📞 Urgent — driver` / `📞 Nudge driver` | `callDriverUrgent()` L8547–L8558 | opens the driver-call modal (§12.5) | — | none | none | no |
| — *(inside)* `Log response` | `logDriverCall()` L8559–L8573 | `moving` → `t.driverStatus='moving'`; `unavailable` → `t.driverStatus='unavailable'`, `t.unavailReason='Declined trip after call'`; `delay` → **no write**. Then `closeModal()`, `renderReadiness()`, toast; if `unavailable`, auto-opens `resolveUnavailable(ustId)` after 400 ms (L8571) | `DB.upcomingSubTrips[i]` | **none** | **none** | no |
| `📅 Postpone` | `openPostponeTrip()` L8606–L8633 | opens the postpone modal (§12.6) | — | none | none | no |
| — *(inside)* `Confirm postponement` | `confirmPostponeTrip()` L8634–L8656 | **removes the trip** (`splice`, L8644); appends `{originalDate:'Today', rescheduledDate, route, reason}` to `sub.postponements` (L8646–L8647); `closeModal()`, `renderReadiness()`, `refreshNavCounts()`, refreshes the open profile; audit; system email; toast | `DB.upcomingSubTrips`, `DB.subscriptions[sub].postponements` | `requirePerm('manage_subscriptions')` (L8635) | `logAction('postpone_trip','subscription',t.sub, "Postponed today's trip for <rider> (<sub>) to <date> — reason: <reason>. No trip deducted from quota.", {}, {rescheduledDate})` (L8651) | button disabled when blocked (L8631), otherwise no confirm dialog |
| `🎧 Ticket` | `openReadinessTicket()` L8657–L8685 | opens the ticket modal (§12.7) | — | none | none | no |
| — *(inside)* `Create & assign to support` | `createReadinessTicket()` L8686–L8701 | `DB.tickets.unshift({...})` (L8690–L8691) then a success modal | `DB.tickets` | **none** | **none** | no |
| 📍 location | `showEntityLocation(id[, ustId])` L8226 | opens the location canvas modal | — | UNVERIFIED | UNVERIFIED | no |
| — *(from that modal)* `🗺️ Nearby` | `showNearbyDriversMap(riderId, ustId)` L8354–L8481 | nearby-driver picker with scenario banner | — | none to open | — | no |
| — *(inside)* `✅ Assign` | `pickNearbyDriver(drvId)` L10243 → `assignNearestDriver()` L8482–L8499 | busy check (L8486); `t.driver = driverId`, `t.driverStatus = 'moving'` (L8492); audit; `closeModal()`, `renderReadiness()`, `renderDashboard()`, `refreshNavCounts()`; toast | `DB.upcomingSubTrips[i]` | `requirePerm('live_ops')` (L8483) | `logAction('assign_driver','trip',t.id,'Assigned <driver> to <rider> for <id> (<km> away)', {driver:prev}, {driver, distance})` (L8490) | no |
| — *(inside)* `📞 Call` | `quickContactDriver()` L8500–L8512 → `logNdvContact()` L8513–L8522 | **toast only — no state write of any kind**, then returns to the nearby list | nothing | none | none | no |

### 10.3 `assignBackup(subId)` — L13186–L13217

Listed in this module's brief, but **not reachable from `#p-readiness`** — verified: the readiness row builder (L13030–L13052) never emits it. Its real call sites are the Coverage & Capacity table (L13180–L13181), Plan Commitment (L17551), Contact/SLA (L19210), the profile action menus (L16866, L16876), the retention modal (L14267), the renewal `⋯` menu (L20606) and the promote-backup follow-up toast (L13233). The file comment at L17511 confirms "assignBackup lives on the Coverage page and is shared".

| Step | Line | Detail |
|---|---|---|
| Permission 1 | L13187 | `requirePerm('manage_subscriptions')` |
| Permission 2 | L13188 | `requirePagePerm('coverage','assign_backup')` |
| Candidate build | L13191–L13203 | see §6.6 |
| Modal | L13204–L13215 | title `Assign backup captain — <subId>`; explanatory paragraph naming the rider and the current captain (L13207); one row per candidate with name, `★rating` badge, a `Nearest` badge on the first candidate when a distance is known (L13209), `<km> away · Backup for N other subscription(s)` (L13210), and a `Select` button |
| Commit | L13218–L13224 (`commitBackup`) | `DB.subBackups[subId] = drvId` (L13219); re-renders Plan Commitment when present (L13220); `closeModal(); renderCoveragePage()` (L13221); `logAction('assign_backup','subscription',subId,'Assigned <name> as backup captain for <subId>',{},{backup:drvId})` (L13222); toast (L13223) |
| Gate | L20883, L20886, L20895 | `GATE_SWEEP.assignBackup` is set to `null` and then `delete`d, with the stated rationale "opens a picker; commitBackup is gated" |

**Effect on this module:** `DB.subBackups` is a `subHealthScore()` input (L14220), so assigning a backup raises the renewal health score by 15 — it does not affect readiness levels.

---

## 11. Tables & lists

One table, in `#readiness-list`, wrapped in `<div class="tbl-scroll">` inside a 520 px scroll container (L884).

| Property | Value |
|---|---|
| Header row (both modes) | `Scheduled` · `Route` · `Rider` · `Driver` · `Status` · `Actions` (L13056, L13061) |
| Row source | `DB.upcomingSubTrips` (L13008) |
| Filters | **none** |
| Sort | soonest-first always (L13008); presentation switches between grouped-by-urgency (default, L13060–L13067) and flat-by-time (L13054–L13058) |
| Section bands | 4, injected as `colspan=6` rows; suppressed at zero count (L13021) |
| Row click | none — individual cells carry their own handlers |
| Row actions | §10.1 |
| Empty state | `No subscription trips in the next 24 hours.` (L13015) |
| Row highlight | red-lt / amber-lt backgrounds with a coloured left border (L13034) |

---

## 12. Modals opened (full field list per modal)

### 12.1 `resolveUnavailable(ustId)` — L13078–L13094

| Part | Content | Line |
|---|---|---|
| Title | `🚨 Find replacement driver` | L13082 |
| Alert banner | `Rider needs a driver now` + `<rider name> · <phone> · <route>` on `var(--red-lt)` | L13084–L13085 |
| Button `🗺️ Nearby` | `showNearbyDriversMap(t.rider, ustId)` | L13086 |
| Button `📞 Call rider` (danger) | `priorityCall(riderName)` | L13086 |
| Candidate rows (max 3) | radio `name="rsn"`, `data-drv=<driverId>`, `onclick="selDriver(this)"`; first is `.selected` + `checked`; shows driver name, level badge (`b-gold` when `lvl==='gold'`, else `b-silver`), `★ <rating>` or `New`, `vehicle`, and `capacity` \|\| `'—'` | L13087 |
| Empty candidates | `No matching drivers available nearby.` | L13088 |
| Footer | `Cancel` → `closeModal()`; `Assign & notify rider` (primary) → `confirmReassign(ustId)` | L13090 |

### 12.2 `confirmReassign(ustId)` — compensation screen L13095–L13118

| Field | Detail | Line |
|---|---|---|
| Gate | `requirePerm('manage_subscriptions')` | L13096 |
| Validation | no `.plan-option.selected` → `toast('No driver selected','err')` and abort | L13100 |
| Side effect *before* the screen renders | `window._reassignPrevDriverName = <old driver name>`; `t.driver = newDrvId`; `t.driverStatus = 'moving'` | L13102–L13103 |
| Title | `Driver assigned` | L13105 |
| Confirmation copy | `<newDriver.name> assigned` / `<rider.name> will be notified with new driver details` | L13108–L13109 |
| Section label | `Compensate rider for disruption?` | L13110 |
| Option `free` | `🎁 Free next ride` — radio `name="comp"`, `data-comp="free"` | L13111 |
| Option `20off` | `20% off next renewal` — **`.selected` + `checked` by default**, `data-comp="20off"` | L13112 |
| Option `credit` | `10 SAR wallet credit` — `data-comp="credit"` | L13113 |
| Option `none` | `No compensation` — `data-comp="none"` | L13114 |
| Footer | `Confirm compensation & close` (primary) → `finalizeReassign(ustId)` | L13115 |

### 12.3 `callRiderConfirm(riderId, phone, ustId)` — L8523–L8535

| Field | Detail | Line |
|---|---|---|
| Title | `📞 Call rider — <rider.name>` | L8526 |
| Body | phone icon, rider name (16px), phone (blue), `Calling to confirm trip departure. Log the outcome below after the call.` | L8528–L8531 |
| Field `call-outcome` | `customSelectHTML('csel-call-outcome','call-outcome', …, 'confirmed')` — options: `confirmed` "Rider confirmed — will be ready" (default) · `no_answer` "No answer — will retry in 5 min" · `cancelled` "Rider wants to cancel trip" · `delay` "Rider asked for 15 min delay" | L8532 |
| Footer | `Cancel` → `closeModal()`; `Log outcome` (primary) → `logCallOutcome(ustId, riderId)` | L8533 |

Commit `logCallOutcome()` L8536–L8546 — toast map (L8544): `confirmed:'✅ Rider confirmed — trip on track'`, `no_answer:'📵 No answer logged — follow up in 5 min'`, `cancelled:'Trip cancellation noted'`, `delay:'⏳ Rider requested 15-min delay — noted'`. Only `confirmed` writes state.

### 12.4 `notifyRiderChange(ustId)` — L8574–L8589

| Field | Detail | Line |
|---|---|---|
| Title | `📲 Notify rider of driver change` | L8580 |
| Rider header | avatar + `rr.name` + `rr.phone \|\| '—'` | L8582 |
| Field `notif-new-driver` | `customSelectHTML('csel-notif-new-driver','notif-new-driver', …)`; option list = every driver except `t.driver`, labelled `<name> · <type> · ★<rating \|\| 'new'>` (L8578); default = first option | L8583 |
| Field `notif-msg` | `<textarea id="notif-msg">` prefilled `Your driver has changed. A new driver has been assigned and is on the way. We apologise for any inconvenience.` — **never read anywhere** | L8584 |
| Footer | `Cancel`; `Send notification now` (primary) → `sendRiderChangeNotif(ustId)` | L8586 |

Commit `sendRiderChangeNotif()` L8590–L8596: reads only `#notif-new-driver`; writes `t.driver`, `t.driverStatus='moving'` (L8593–L8594); `closeModal(); renderReadiness()` (L8595); `toast('✅ Rider notified · New driver assigned · ETA updated in app','ok')` (L8596). No email, no push, no audit, no permission gate.

### 12.5 `callDriverUrgent(driverId, ustId)` — L8547–L8558

| Field | Detail | Line |
|---|---|---|
| Title | `📞 Contact driver — <driver.name>` | L8550 |
| Body | amber phone icon, driver name, `dd.phone \|\| '—'` | L8552–L8554 |
| Field `drv-response` | options: `moving` "Driver confirmed — now moving" (default) · `delay` "Driver will be 10-15 min late" · `unavailable` "Driver cannot make it — needs replacement" | L8555 |
| Footer | `Cancel`; `Log response` (primary) → `logDriverCall(ustId, driverId)` | L8556 |

Commit `logDriverCall()` L8559–L8573 — writes per §10.2; toast map (L8570): `moving:'✅ Driver confirmed — now en route'`, `delay:'⏳ Delay logged — rider will be notified'`, `unavailable:'⚠ Driver unavailable — open reassignment'`; chains into `resolveUnavailable()` after 400 ms when `unavailable` (L8571).

### 12.6 `openPostponeTrip(ustId)` — L8606–L8633

| Field | Detail | Line |
|---|---|---|
| Title | `📅 Postpone trip` | L8613 |
| Policy note | blue panel: riders can't cancel their subscription themselves; the trip **does not count against the rider's trip quota**; the subscription is untouched | L8615 |
| Row `Rider` | `nm2(t.rider)` | L8616 |
| Row `Currently scheduled` | `Today, <t.scheduledTime>` | L8617 |
| Row `Route` | `t.route` | L8618 |
| Target-date computation | `targetDate = sub ? nextScheduledDayLabel(sub, true) : null` (fn L4721); `blocked = sub && !targetDate` | L8611–L8612 |
| Blocked banner | red: `⚠ Can't postpone — no scheduled day remains before this plan expires on <sub.ends>. Extend or renew the subscription first, or the rider forfeits this trip.` | L8620 |
| OK banner | green: `✓ This trip will move to <targetDate> (before the plan's <sub.ends> expiry).` | L8621 |
| Field `pt-reason` | `customSelectHTML('csel-pt-reason','pt-reason', …)` — options: `Rider requested postponement` (default) · `Rider unreachable before departure` · `Weather / external disruption` · `Other` | L8622–L8628 |
| Footer | `Back` → `closeModal()`; `Confirm postponement` (warn, `disabled` when `blocked`) → `confirmPostponeTrip(ustId, targetDate)` | L8631 |

Commit `confirmPostponeTrip()` L8634–L8656 — full chain in §10.2. Also sends `sendSystemEmail(t.rider, 'Your trip has been moved to <date>', …, 'transactional')` (L8654).

### 12.7 `openReadinessTicket(ustId, subId, riderId, driverId)` — L8657–L8685

| Field | Detail | Line |
|---|---|---|
| Title | `🎧 Open support ticket` | L8662 |
| Routing banner | `This ticket will be auto-assigned to the Support team (Lina Al-Otaibi) and flagged as urgent trip issue. Expected first response: under 10 min.` — **entirely hardcoded** | L8664–L8665 |
| Context tile `Rider` | `nm2(riderId)`, click → `closeModal(); openProfile(riderId)` | L8668 |
| Context tile `Driver` | `nm2(driverId)`, click → `openProfile(driverId)` | L8669 |
| Context tile `Sub` | `subId`, click → `openProfile(subId)` | L8670 |
| Field `rt-cat` | `customSelectHTML('csel-rt-cat','rt-cat', …)` — options: `Pre-departure — driver missing` (default) · `Pre-departure — rider unresponsive` · `Driver unavailable` · `Route change needed` · `Other` | L8673–L8679 |
| Field `rt-sub` | `<input id="rt-sub" type="text">` prefilled `Pre-departure issue: <subId> · <readinessStatus(t).label>` (L8660) | L8681 |
| Footer | `Cancel`; `Create & assign to support` (primary) → `createReadinessTicket(riderId, riderName)` | L8683 |

Commit `createReadinessTicket()` L8686–L8701:
```
newId = 'TKT-' + (505 + DB.tickets.length)                                        L8689
DB.tickets.unshift({id:newId, entity:riderId, entityName:riderName,
  subject: #rt-sub.value || 'Pre-departure issue',
  category: #rt-cat.value || 'Pre-departure',
  priority:'High', status:'Open', created:'Just now', agent:'Lina Al-Otaibi',
  thread:[{from:'Ops — Auto-assigned', role:'agent', time:'Just now',
           msg:'Ticket created from Trip Readiness dashboard. Flagged urgent. Support team notified immediately.'}]})   L8690–L8691
```
Success modal (L8694–L8700): `<TKT-id> created`, `Assigned to Lina Al-Otaibi (Support)`, `Priority: High — trip imminent`, `Lina will receive an alert on her dashboard immediately.` Footer `Close` / `Open ticket →` → `openTicketDetail(newId)`.

### 12.8 `showNearbyDriversMap(riderId, ustId)` — L8354–L8481 (reached from 📍 and from `resolveUnavailable`)

Not a readiness-owned modal, but it is the assign path for readiness trips. Relevant parts: title carries the readiness label badge (L8432, via `readinessStatus(t).label`); scenario banner from `tripScenario()` via `scenarioBannerHTML()` (L8329–L8347) with a contextual CTA (`📞 Call <driver>` for `call_current`, L8337; `📞 Call <rider>` for `call_rider`, L8341); a canvas map (L8461–L8481); per-driver rows with `📞 Call` → `quickContactDriver()` and `✅ Assign` → `pickNearbyDriver()` (L8420–L8421); and an escalation panel `🚫 No available driver nearby right now` with `🎧 Escalate to support` → `openReadinessTicket()` (L8425–L8430).

---

## 13. Badges & sidebar counters

| Counter id | HTML line | Seed | Formula | Written |
|---|---|---|---|---|
| `sb-readiness-badge` | L507 | `5` (hardcoded in markup) | `(unconf + notMoving + unavail) \|\| ''` — the sum of KPI tiles 2, 3 and 4 (§7); the `\|\| ''` blanks the badge at zero | L13013–L13014 |
| `sbb-dash` (Dashboard) | — | — | `(DB.rideRequests \|\| []).length` **plus** one for every UST whose `tripScenario().key` is `unavailable`, `unassigned` or `late` | L9397–L9398, put at L9400 |
| `rd-total` / `rd-unconf` / `rd-notmoving` / `rd-unavail` | L872–L875 | `—` | §7 | L13012 |
| Rider confirmation badge | — | — | `riderConfirmed ? b-green '✓ <confirmedAt>' : (minutesUntil<=60 ? b-red : b-amber) '⏳ Not confirmed'` | L13037 |
| Driver status badge | — | — | `moving → b-green '🚗 En route'` · `unavailable → b-red '⚠ Unavailable'` · else `(minutesUntil<=30 ? b-red : b-amber) 'Not moving'` | L13040 |
| Readiness pill | — | — | `class="health h-<red\|amber\|green>"`, text = `readinessStatus(t).label` | L13041 |
| Section-band counts | — | — | `critical.length` / `high.length` / `watch.length` / `ok.length` | L13063–L13066 |

**Double counting:** the sidebar badge sums three overlapping sets. A trip that is `unavailable` **and** has `!riderConfirmed && minutesUntil <= 60` is counted in both `unavail` and `unconf`, so the badge can exceed the number of trips needing attention. Verified from L13009–L13014.

---

## 14. Cross-module links

| Direction | Target | Line |
|---|---|---|
| Out → 360° profiles | `openProfile(rider / driver / sub / ticket)` | L13035, L13038, L8668–L8670, L8700 |
| Out → Location canvas | `showEntityLocation()` L8226 | L13028 |
| Out → Nearby-drivers dispatch | `showNearbyDriversMap()` L8354 | L13086, and from the location modal |
| Out → Support Center | `createReadinessTicket()` writes `DB.tickets` (L8690); `openTicketDetail()` | L8690, L8700 |
| Out → priority call | `priorityCall(rn)` | L13086 |
| Out → email outbox | `sendSystemEmail()` (postponement notice) | L8654 |
| Out → Subscriptions | `sub.postponements` written | L8646–L8647 |
| Out → Dashboard / nav | `renderDashboard()`, `refreshNavCounts()` | L8496–L8497, L8649 |
| In ← Subscriptions | `generateUpcomingTripsForSubscription()` creates USTs | L4856–L4880 |
| In ← Subscriptions | `commitDriverChange()` rewrites `t.driver` / `t.driverStatus` for every UST of that rider | L5853 |
| In ← Renewal wizard | `renderSuccess()` calls `renderReadiness()` | L11447 |
| In ← Dashboard interventions | consumes `tripScenario()` over `DB.upcomingSubTrips` | L9497–L9526 |
| In ← Live Ops `renderSubRequests()` | same `tripScenario()` keys | L11637–L11660 |
| In ← Coverage capacity grid | derives a driver's morning slot from the rider's UST `scheduledTime` | L13243 |
| In ← Zones demand chart | counts UST `scheduledTime` per hour per zone | L14108–L14111 |
| In ← Subscriptions table / Rider 360° | looks up a rider's next UST | L3525, L4286 |

---

## 15. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `DB.upcomingSubTrips` — 8 fully scripted scenarios | L6177–L6242 | Every field is fabricated. Comment headers name each scenario explicitly: 1 on-track, 2 rider-unconfirmed, 3 vehicle breakdown, 4 driver not moving, 5 both unconfirmed, 6 tomorrow morning, 7 driver offline, 8 tomorrow on-track |
| `unavailReason: 'Vehicle breakdown — flat tyre reported'` | L6198 | demo |
| `unavailReason: 'Driver app went offline — unreachable'` | L6229 | demo |
| `notes` strings ("GPS shows driver still at home address", "Last ping 09:02 AM — auto-alert sent", etc.) | L6183, L6190, L6200, L6207, L6214, L6222, L6231, L6239 | demo |
| Fallback seed `DB.upcomingSubTrips = DB.upcomingSubTrips \|\| [4 records]` | L6243–L6248 | **Dead** — the array is unconditionally assigned at L6177, so the `\|\|` fallback can never fire |
| `sb-readiness-badge` markup value `5` | L507 | overwritten on first `renderReadiness()` |
| Page subtitle "Upcoming subscription trips in the next 24 hours…" | L870 (page) and L2169 (`subs.readiness`) | never recomputed; contradicted by the missing 24 h filter |
| KPI sub-labels "Within 1h of departure", "Within 30 min of pickup", "Needs reassignment now" | L873–L875 | static text |
| Compensation options `🎁 Free next ride` / `20% off next renewal` / `10 SAR wallet credit` / `No compensation` | L13111–L13114 | none is actually applied — log-only |
| `labels` map in `finalizeReassign` with key `'-20off'` | L13122 | typo — see §17 |
| Default notification text "Your driver has changed…" | L8584 | never sent |
| Ticket routing: `Lina Al-Otaibi`, `Priority: High`, `under 10 min` first response | L8664, L8691, L8697–L8698 | hardcoded assignee and SLA |
| Ticket id `'TKT-' + (505 + DB.tickets.length)` | L8689 | collides if a ticket is ever deleted |
| Auto-thread message "Ticket created from Trip Readiness dashboard…" | L8691 | fixed |
| `resolveUnavailable` candidate cap `.slice(0,3)` and no availability check | L13082 | see §6.7 |
| `assignBackup` candidate cap `.slice(0,6)` | L13203 | |
| `unavailReason = 'Declined trip after call'` | L8565 | fixed string for every declining driver |
| Section palette hex values `#C62828 / #B45309 / #166534 / #FCA5A5 / #FCD34D / #86EFAC` and row borders `#EF4444 / #F59E0B` | L13022–L13024, L13034 | literal hex outside the CSS-variable system used elsewhere |

---

## 16. i18n keys

| Key | Element | Line | Arabic | Line |
|---|---|---|---|---|
| `nav.readiness` | sidebar label "Trip readiness" | L507 | `جاهزية الرحلات` | L7907 |

**No other element in this module carries `data-i18n`.** The page `<h1>`, the four KPI labels and sub-labels, both sort buttons, the sort title, every table header, every badge, every section band, the empty state and all seven modals are English literals in markup (L869–L886) or in JS (L8226–L8715, L13005–L13131). Verified: zero `data-i18n` matches in those ranges.

---

## 17. Gaps, dead code, UNVERIFIED items

**Bugs**
1. **`finalizeReassign` compensation-label typo (L13122).** The map is `{free:'Free next ride','-20off':'20% off next renewal', credit:'10 SAR credit', none:'No compensation'}`, but the option's `data-comp` value is `'20off'` (L13112). Because `'20off'` is the *default selected* option, `labels[comp]` is `undefined` for the most common case and the code falls back to the raw string (`labels[comp] || comp`, L13129–L13130) — the toast and the audit entry read `Compensation: 20off`.
2. **No compensation is ever applied.** `finalizeReassign` writes nothing to the rider wallet, no promo, no credit note — only an audit line and a toast (L13126–L13130).
3. **`finalizeReassign` has no permission gate**, even though the preceding `confirmReassign` does (L13096). An operator blocked at step 1 can never reach it, but the function is globally reachable.
4. **`sendRiderChangeNotif` reassigns the driver with no permission check and no audit entry** (L8590–L8596) — a second, ungated path to the same write `confirmReassign` gates.
5. **The `notif-msg` textarea is never read** (L8584) — the operator's edited message is discarded and no notification is actually dispatched.
6. **`logCallOutcome` ignores two of its four outcomes.** `cancelled` and `delay` produce a toast and nothing else (L8539, L8544) — a rider who asked to cancel leaves no record anywhere.
7. **`logDriverCall`'s `delay` outcome writes nothing** (L8563–L8565) despite the toast claiming "rider will be notified" (L8570).
8. **`resolveUnavailable` candidate list ignores availability.** It filters only on vehicle `type` and takes the first three (L13082) — a busy, suspended or ineligible driver can be offered as the replacement, unlike `assignBackup` (L13191–L13199) and `nearestAvailableDrivers()` (L8167).
9. **Trips never leave the board on departure.** `minutesUntil` stops decrementing at 0 (L12612 guards `> 0`) and only `confirmPostponeTrip` removes a record (L8644), so a departed trip stays pinned in Critical/High forever.
10. **`rd-total` is not a 24-hour count** (§7) — no filter exists.
11. **Sidebar badge double-counts overlapping conditions** (§13).
12. **`readinessStatus` and `tripScenario` disagree** on the unconfirmed case (`high`/red vs `unconfirmed`/amber) and `readinessStatus` has no `unassigned` case, despite the comment at L8281–L8283 asserting they cannot disagree.
13. **`createReadinessTicket` writes no audit entry and has no permission gate** (L8686–L8701), unlike most other ops writes in the file.

**Dead code**
14. The `DB.upcomingSubTrips = DB.upcomingSubTrips || [...]` fallback (L6243–L6248) can never execute — L6177 always assigns first. The "NAV SAFETY NET" comment above it (L6242) describes intent that the code does not deliver.
15. `tripScenario`'s `unassigned` branch (L8293–L8297) — acknowledged as never firing (L8286–L8288).
16. `logNdvContact` (L8513–L8522) records nothing at all — no state, no audit; the three outcome options are cosmetic.
17. `readinessStatus`'s `label`/`color` for the `high` level use colour `red` while the level name is `high`; the section header for `high` is rendered with the **amber** palette (L13064). Cosmetic inconsistency.

**Historical notes preserved in the source**
18. L8288–L8290: `tripScenario` "was called in 3 places (readiness table + late/awaiting scenario banners) but never actually defined anywhere — so page init silently died at `renderReadiness()` and everything queued after it never ran."
19. `renderReadiness` is defined as `window.renderReadiness = function(){…}` inside the "FINAL OVERRIDES — executes last, always wins" block (L13004). It is the **only** definition in the file — grep for `function renderReadiness` returns nothing but call sites — so despite the "override" framing there is no earlier version being replaced.

**UNVERIFIED**
- `showEntityLocation()` (L8226) — opened from the 📍 buttons; its body, permission behaviour and audit were not read in full. Reason: belongs to the Live Map module.
- `nextScheduledDayLabel(sub, skipToday)` (L4721) — drives the postpone target date; not read.
- `dispatchEligibility()` (L17209), `driverLiveState()` (L7283), `nearestAvailableDrivers()` (L8167), `geoDistanceKm()` (L7256) — referenced by the candidate builders; bodies not read.
- `customSelectHTML()`, `selDriver()`, `avatarHTML()`, `openTicketDetail()`, `sendSystemEmail()`, `priorityCall()`, `minutesUntilTime()`, `fmtTimeLabel12h()`, `WEEKDAYS` — referenced, bodies not read.
- Whether `kpiScrollTo('readiness-list')` (L14535) does anything visible given the list already sits in the viewport — not executed.

---

## 18. Line-number index

| Item | Lines |
|---|---|
| Sidebar entry + `sb-readiness-badge` | L507 |
| `titles.readiness` / `subs.readiness` | L2168 / L2169 |
| `#p-readiness` markup | L869–L886 |
| — KPI tiles | L871–L876 |
| — sort buttons | L880–L881 |
| — `#readiness-list` | L884 |
| `nextScheduledDayLabel()` | L4721 |
| `confirmSubDriverCommit()` → `renderReadiness()` | L4853 |
| `generateUpcomingTripsForSubscription()` | L4856–L4880 |
| `commitDriverChange()` cascade into USTs | L5846–L5865 |
| `DB.upcomingSubTrips` seed (8 scenarios) | L6177–L6242 |
| Dead fallback seed | L6243–L6248 |
| `geoDistanceKm()` / `fmtKm()` / `driverLiveState()` | L7256 / L7281 / L7283 |
| `nearestAvailableDrivers()` | L8167 |
| `showEntityLocation()` | L8226 |
| `tripScenario()` | L8291–L8328 |
| `scenarioBannerHTML()` | L8329–L8347 |
| `showNearbyDriversMap()` | L8354–L8481 |
| `assignNearestDriver()` | L8482–L8499 |
| `quickContactDriver()` | L8500–L8512 |
| `logNdvContact()` | L8513–L8522 |
| `callRiderConfirm()` | L8523–L8535 |
| `logCallOutcome()` | L8536–L8546 |
| `callDriverUrgent()` | L8547–L8558 |
| `logDriverCall()` | L8559–L8573 |
| `notifyRiderChange()` | L8574–L8589 |
| `sendRiderChangeNotif()` | L8590–L8596 |
| `openPostponeTrip()` | L8606–L8633 |
| `confirmPostponeTrip()` | L8634–L8656 |
| `openReadinessTicket()` | L8657–L8685 |
| `createReadinessTicket()` | L8686–L8701 |
| `readinessStatus()` | L8702–L8709 |
| `fmtCountdown()` | L8710–L8715 |
| `go()` dispatch (`readiness`) | L8817 |
| `setText()` | L8893 |
| `refreshNavCounts()` UST contribution | L9397–L9400 |
| Dashboard interventions over USTs | L9491–L9526 |
| `pickNearbyDriver()` | L10243–L10251 |
| `startTickEngine()` | L11966–L11969 |
| `renderSubRequests()` (Live Ops) | L11637–L11660 |
| `tickEngine()` UST countdown | L12611–L12612 |
| `renderReadiness()` | L13005–L13068 |
| — KPI computation + sidebar badge | L13008–L13014 |
| — empty state | L13015 |
| — bucketing | L13016–L13019 |
| — `secH()` | L13020–L13026 |
| — `locBtn()` | L13027–L13029 |
| — `tripRow()` | L13030–L13053 |
| — time-sorted render | L13054–L13059 |
| — grouped render | L13060–L13067 |
| `setReadinessSort()` | L13069–L13077 |
| `resolveUnavailable()` | L13078–L13094 |
| `confirmReassign()` | L13095–L13118 |
| `finalizeReassign()` | L13119–L13131 |
| `DB.subBackups` seed | L13140 |
| `assignBackup()` | L13186–L13217 |
| `commitBackup()` | L13218–L13224 |
| `promoteBackup()` | L13225–L13235 |
| Capacity grid slot lookup via USTs | L13243 |
| Zones demand chart via USTs | L14108–L14111 |
| `subHealthScore()` reads `DB.subBackups` | L14220 |
| `kpiScrollTo()` | L14535 |
| Boot call `renderReadiness()` | L14593 |
| `dispatchEligibility()` | L17209 |
| `GATE_SWEEP.assignBackup` null + delete + rationale | L20883, L20886, L20895 |
| i18n `nav.readiness` (AR) | L7907 |

---

## 19. Mount points — and a correction to a Pass 1 attribution (added in remediation)

> Added by Verification Pass 1 remediation. Pass 1 §7 listed `#xloc-wrap` (L9197) as an undocumented element id and assigned it to **this** document, reasoning that `07b-trip-readiness.md` carries the most `showEntityLocation` citations of any doc and calling it *"the entity-location modal's canvas wrapper"*.

### 19.1 The attribution is wrong — `#xloc-wrap` does not belong to this module

Verified against the source:

| Check | Result |
|---|---|
| Enclosing function of L9197 | **`exportData(btn, page)`** — declared **L9187**, the last preceding top-level `function` declaration (the two before it are `buildCSV` L9183 and `exportRows` L9175) |
| What the surrounding markup is | An **export dialog**: a CSV/JSON format picker at L9193–L9194 (`data-fmt="csv"` / `data-fmt="json"`), a *"Save location"* header at L9196, and a footer whose primary button is `onclick="doExport('<page>')"` at L9201 |
| What `xloc` abbreviates | **export location** — the two radios inside the wrapper share `name="xloc"` (L9198, L9199) and carry `data-loc="ask"` / `data-loc="dl"` |
| Any relationship to `showEntityLocation` | **None.** `showEntityLocation` renders its two-pin plot at L4982–L4987 and never references `xloc-wrap`, `xfmt`, `data-loc` or `doExport` |
| Occurrences of `xloc` in the file | 3 — L9197 (`id="xloc-wrap"`), L9198 and L9199 (the two `name="xloc"` radios). No JS reads the wrapper by id. |

`#xloc-wrap` is therefore the **save-location group of the global export modal**, and its correct owner is `00b-global-ui-systems.md`, which already documents `exportData()` as entry 50 of its modal inventory (`00b` §3, citing L9187/L9202). It has been documented there in `00b` §17.

### 19.2 What this module *does* own

For the avoidance of doubt, the entity-location modal that Pass 1 confused it with is documented in §12 of this file. Its own structure, re-verified:

| Element | Line | Note |
|---|---:|---|
| Rider pin | L4982 | emitted only `if(rider&&rider.mapPos)`; carries a name chip via `nm2(rider.id||'')` |
| Driver pin | L4983 | emitted only `if(drv&&drv.mapPos)`; 24×24 blue circle, first-name chip |
| Distance line | L4984–L4987 | drawn only when **both** pins exist; `geoDistanceKm(rider.mapPos, drv.mapPos)` at L4985, rendered as a dashed `<svg><line stroke-dasharray="4,4" opacity="0.6">` at L4987 |
| Location button that opens it | L13027–L13029 (`locBtn()`) | already documented in §8 and §10 |

**Neither the rider pin nor the driver pin has a wrapper id.** The modal's body is addressed only through `#modal-content`. So this module has **no undocumented mount point** — the id Pass 1 assigned to it belongs to a different feature entirely.

### 19.3 Line-number index for §19

| Symbol | Lines |
|---|---|
| `showEntityLocation` rider pin | 4982 |
| `showEntityLocation` driver pin | 4983 |
| `geoDistanceKm` + dashed connector | 4984–4987 |
| `exportRows(page)` | 9175 |
| `buildCSV(head,rows)` | 9183 |
| **`exportData(btn,page)`** — owner of `#xloc-wrap` | **9187** |
| format radios (`name="xfmt"`) | 9193–9194 |
| "Save location" header | 9196 |
| **`#xloc-wrap`** | **9197** |
| location radios (`name="xloc"`) | 9198–9199 |
| modal footer → `doExport(page)` | 9201 |
| `doExport(page)` | 9204–9221 |
| `locBtn()` | 13027–13029 |
