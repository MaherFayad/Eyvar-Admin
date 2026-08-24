# Module: Coverage & Capacity

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `coverage` · **Page div:** `#p-coverage`
> **HTML lines:** L1220–L1235 · **Sidebar item:** L516
> **Render entry point:** `renderCoveragePage()` (L13147–L13185)
> **Related:** `filterCoverage()` (L13146), `renderCapacityGrid()` (L13238–L13275), `assignBackup()` (L13186–L13217), `commitBackup()` (L13218–L13224), `promoteBackup()` (L13225–L13237), `activeSubsList()` (L13141–L13144)

---

## 1. Purpose

Module header comment (L13130–L13139):

> "COVERAGE & CAPACITY — backup captains + slot capacity. The product promise is *'same captain, same time, every day'*. A sick driver or broken-down vehicle mid-package is therefore the single biggest threat to a subscription. Every active subscription should have a PRE-ASSIGNED backup captain; this page exposes the ones that don't, and shows per-driver slot capacity so the same driver is never sold twice for the same morning slot."

Two questions, two cards:
1. **Which active subscriptions are a single point of failure?** (no eligible backup captain)
2. **Is any driver double-booked in the same morning slot?**

Page sub-header (L1223): *"Backup captains per subscription + driver time-slot capacity"*.

---

## 2. Entry points & routing

| Trigger | Line | Effect |
|---|---|---|
| Sidebar `onclick="go('coverage',this)"` | L516 | Navigate |
| `go()` router `if(id==='coverage'){renderCoveragePage();}` | L8796 | Render |
| `commitMenu('coverage',…)` → `📊 Open Coverage & capacity` → `go('coverage',null)` | L16876 | From Plan commitment row menus |
| `promoteBackup()` → `pushOpsNotification('alert',…, function(){go('coverage',null);})` | L13236 | Notification click-through |
| KPI cards → `filterCoverage('all'\|'protected'\|'exposed')` | L13154–L13157 | In-page filter + scroll |
| `commitBackup()` → `renderCoveragePage()` | L13221 | Re-render after assignment |
| `promoteBackup()` → `renderCoveragePage(); renderSubscriptionsTable();` | L13231 | Re-render |
| Title / subtitle | L2168 (`coverage:'Coverage & Capacity'`), L2169 (`coverage:'Backup captains + driver slot capacity'`) | Topbar |

**Boot:** the module's own boot step is `{name:'backup coverage', fn:coverageBoot, needs:['backupRegistry']}` (L21818) — and `coverageBoot()` (L17578–L17580) is a **deliberate no-op**: *"nothing to seed — coverage is computed live from eligibility."* The backup registry is seeded by `dispatchBoot()` instead (L17427–L17442) plus the literal at L13140.

**Permissions:** `PAGE_PERMISSIONS.coverage` (L10599–L10603):
```js
coverage:{label:'Coverage & Capacity', icon:'🛡️', legacy:'manage_subscriptions', perms:[
  {key:'view',            label:'View coverage'},
  {key:'assign_backup',   label:'Assign backup captain'},
  {key:'promote_backup',  label:'Promote backup to primary'}
]}
```

---

## 3. Layout map

HTML (L1220–L1235):

```
<div class="page" id="p-coverage">
  <div class="ph"><div class="ph-l">
    <h1>🛡️ Coverage &amp; capacity</h1>
    <p id="coverage-sub">Backup captains per subscription + driver time-slot capacity</p>
  </div></div>

  <div class="g4" id="coverage-kpis"></div>                     ← 4 KPI tiles

  <div class="card">
    <div class="ch"><h2>Backup captain coverage — every active subscription</h2>
      <span class="b b-red" id="coverage-exposed-count">0 exposed</span></div>
    <div id="coverage-list" style="max-height:420px;overflow-y:auto"></div>   ← main table
  </div>

  <div class="card" style="margin-top:14px">
    <div class="ch"><h2>Driver capacity — morning peak slots</h2>
      <span style="font-size:10px;color:var(--muted)">A driver can't hold two subscriptions in the same slot</span></div>
    <div id="capacity-grid" style="padding:12px;overflow-x:auto"></div>       ← slot grid
  </div>
</div>
```

Render order inside `renderCoveragePage()`:
1. `#coverage-kpis` ← 4 KPI tiles (L13152–L13157)
2. `#coverage-exposed-count` ← `exposed.length+' exposed'` (L13158)
3. `#sbb-coverage` ← `exposed.length` (L13159)
4. `#coverage-list` ← `<table class="dt" id="coverage-table">` or empty state (L13160–L13183)
5. `renderCapacityGrid()` → `#capacity-grid` (L13184)

> `#coverage-sub` (L1223) is a static paragraph — no code ever writes to it.

---

## 4. Rules & policy logic — written out exactly

### 4.1 The active book — `activeSubsList()` (L13141–L13144)

```js
return Object.keys(DB.subscriptions).map(k => DB.subscriptions[k])
  .filter(s => !/cancel/i.test(s.status));
```
Anything whose `status` does not match `/cancel/i` counts — `Active`, `Expiring`, and any other future status.

> **Definition mismatch:** the sibling `backupCoverage()` used by the Plan-commitment coverage card filters on `/active|expiring/i` (L17482) — a whitelist — while this page uses a blacklist. With the shipped fixture both yield the same 5 rows, but they are not the same rule.

### 4.2 Coverage definition — `subIsCovered(subId)` (L17472–L17479)

The **shared** definition, used by both this page and Plan commitment. Comment L17468–L17471: *"A registered backup who fails eligibility at the moment of need is not coverage — counting them as covered is how the two pages ended up reporting different numbers for the same book of subscriptions."*

```js
function subIsCovered(subId){
  var b = (DB.subBackups||{})[subId];
  if(!b) return false;                                  // no registered backup
  var sub = DB.subscriptions[subId];
  if(!sub) return false;
  if(typeof dispatchEligibility!=='function') return true;   // pre-boot fallback
  return dispatchEligibility(b, sub, sub.driver).ok;
}
```

`exposed = subs.filter(s => !subIsCovered(s.id))` (L13150). In-code note L13148–L13149: *"same definition as Plan commitment — registered but ineligible counts as exposed, because that is what happens in practice."*

### 4.3 Eligibility gate — `dispatchEligibility(driverId,sub,excludeId)` (L17209–L17225)

Evaluated in order; first failure wins:

| # | Condition | `why` |
|---|---|---|
| 1 | `!DB.drivers[driverId]` | `unknown captain` |
| 2 | `driverId===excludeId` (the primary captain) | `this is the absent captain` |
| 3 | `d.suspended` truthy | `account suspended` |
| 4 | `d.planAccess==='terminated'` | `removed from the plan system` |
| 5 | `d.planFreezeUntilMs && d.planFreezeUntilMs > nowMs()` | `frozen from plans` |
| 6 | `/comfort/i.test(sub.plan) && !/comfort/i.test(d.type)` | `vehicle type below plan` |
| 7 | any other `/active/i` subscription with `s.driver===driverId` **and** a recorded `DB.planConfirmations[k].confirmedAtMs` | `already committed to another leg` |
| — | otherwise | `{ok:true}` |

### 4.4 Backup-candidate selection — `assignBackup(subId)` (L13186–L13217)

```js
if(!requirePerm('manage_subscriptions'))return;
if(!requirePagePerm('coverage','assign_backup'))return;

var riderPos = DB.riders[s.rider] && DB.riders[s.rider].mapPos;

candidates = Object.keys(DB.drivers)
  .filter(d => {
     if(d===s.driver || DB.drivers[d].status==='pending' || driverLiveState(d).busy) return false;
     if(typeof dispatchEligibility==='function' && !dispatchEligibility(d,s,s.driver).ok) return false;
     return true;
  })
  .map(d => ({id:d, km:(riderPos && DB.drivers[d].mapPos) ? geoDistanceKm(riderPos, DB.drivers[d].mapPos) : null}))
  .sort((a,b) => {
     if(a.km!=null && b.km!=null) return a.km - b.km;    // nearest to the rider's route first
     return a.km!=null ? -1 : b.km!=null ? 1 : 0;        // known distances before unknown
  })
  .slice(0, 6);                                          // top 6 only
```
Three exclusions beyond `dispatchEligibility`: the primary captain, `status==='pending'` applicants, and anyone `driverLiveState(d).busy` (L7283).
`geoDistanceKm(a,b)` — L7256 ff.; formatted by `fmtKm(km)` (L7281): `null`→`—`, `<1`→`<m> m`, else `<km.toFixed(1)> km`.

Comment L13188–L13190: *"eligibility gate, shared with emergency dispatch — no point registering a backup the dispatcher will skip."*

Per-candidate **load** shown in the modal (L13205): `Object.keys(DB.subBackups).filter(k => DB.subBackups[k]===c.id).length` — how many other subscriptions already name that captain as backup. **No cap is enforced on this number.**

### 4.5 Registering a backup — `commitBackup(subId,drvId)` (L13218–L13224)

```js
DB.subBackups[subId] = drvId;                    // === DB.backupRegistry (alias, L17198)
if(typeof renderCommitmentPage==='function' && document.getElementById('coverage-body'))
  renderCommitmentPage();
closeModal(); renderCoveragePage();
logAction('assign_backup','subscription',subId,
  'Assigned '+nm2(drvId)+' as backup captain for '+subId, {}, {backup:drvId});
toast('✅ '+nm2(drvId)+' assigned as backup for '+subId,'ok');
```
> `commitBackup` itself carries **no** permission check — the gate is on `assignBackup`, which opens the modal.

### 4.6 Promoting a backup — `promoteBackup(subId)` (L13225–L13237)

```js
if(!requirePerm('manage_subscriptions'))return;
if(!requirePagePerm('coverage','promote_backup'))return;
var s = DB.subscriptions[subId]; var bak = DB.subBackups[subId];
if(!s || !bak) return;
var old = s.driver;
s.driver = bak;                                  // permanent captain change
delete DB.subBackups[subId];                     // the plan is now UNCOVERED
renderCoveragePage(); renderSubscriptionsTable();
logAction('promote_backup','subscription',subId,
  'Promoted backup '+nm2(bak)+' to primary on '+subId+' (replacing '+nm2(old)
  +') — rider continuity preserved', {driver:old}, {driver:bak});
toast('✅ '+nm2(bak)+' promoted to primary on '+subId+' — assign a new backup next','ok',
      function(){assignBackup(subId);}, false);   // toast action re-opens the picker
pushOpsNotification('alert','Backup promoted — '+subId,
  nm2(bak)+' is now primary. '+subId+' has NO backup — assign one.',
  function(){go('coverage',null);});
```
> **`driverChanges` is NOT incremented here** — unlike `recordAbsence` (L16704) and `acceptEmergency` (L17343). Promoting a backup permanently changes the rider's captain but does not register against the same-captain promise metric.

### 4.7 Slot capacity — `renderCapacityGrid()` (L13238–L13275)

Slot set (L13240): `['06:00','06:30','07:00','07:30','08:00','08:30']` — **hardcoded six morning-peak half-hour buckets.**

Bucketing rule — `slotOf(s)` (L13242–L13250):
```js
var ust = (DB.upcomingSubTrips||[]).find(t => t.rider === s.rider);     // FIRST match by rider
var tm  = ust && ust.scheduledTime
            ? String(ust.scheduledTime).replace(/ ?[AP]M/i,'')          // strips AM/PM, keeps the number
            : '07:00';                                                  // default when no upcoming trip
var hh = tm.split(':')[0]; if(hh.length<2) hh = '0'+hh;                 // zero-pad
var m  = parseInt(tm.split(':')[1],10) < 30 ? '00' : '30';              // floor to the half hour
var slot = hh+':'+m;
return slots.indexOf(slot) >= 0 ? slot : '07:00';                       // anything outside → 07:00
```

Occupancy map (L13250–L13255):
```js
byDriver[s.driver][slotOf(s)] = (existing || []).concat([s.id]);
```

Cell rendering (L13258–L13264):

| Occupancy | Cell |
|---|---|
| 0 subscriptions | `<td>` with `·` in `var(--border2)` |
| exactly 1 | `<span class="b b-blue">` showing `s.id` with `SUB-` stripped, clickable → `openProfile(subId)`, `title="<subId>"` |
| 2 or more | `<td style="background:var(--red-lt)">` with `<span class="b b-red">⚠ <n> overlap</span>`, `title` = comma-joined sub ids |

Footer note (L13268): *"⚠ red = the same driver holds two subscriptions in one slot — resolve before the conflict becomes two riders waiting for one car."*

> **There is no action on an overlap.** The grid detects and flags double-booking but offers no resolve/reassign control.

### 4.8 Exposed value — the remaining-value formula

`subEconomics(sub)` (L3605–L3618), used for both the KPI and the per-row `Remaining value`:
```js
paid          = parseFloat(String(sub.paid).replace(/[^\d.]/g,'')) || 0
[done,total]  = String(sub.trips||'0/0').split('/')
perTrip       = total>0 ? paid/total : 0
consumed      = Math.min(done,total) * perTrip
remaining     = Math.max(0, paid - consumed)
driverAccrued = consumed * (1 - EYVAR_COMMISSION_PCT/100)      // EYVAR_COMMISSION_PCT = 20 (L3604)
driverFull    = paid * (1 - EYVAR_COMMISSION_PCT/100)
pct           = total>0 ? Math.round(done/total*100) : 0
```

---

## 5. KPIs & metrics

All four rendered at L13152–L13157, every one `class="kpi click"` with an `onclick` and a `title`.

| # | Label | Source | Exact formula | Delta text | Bar | Threshold / colour | Click |
|---|---|---|---|---|---|---|---|
| 1 | **Active subscriptions** | `DB.subscriptions` | `activeSubsList().length` — `!/cancel/i.test(status)` | `contract book` (`neu`) | `kf-b`, **fixed `width:70%`** | none | `filterCoverage('all')`, title `Show all active subscriptions` |
| 2 | **With backup captain** | computed | `subs.length - exposed.length` | `protected` (`up`) | `kf-g`, `width = subs.length ? Math.round((subs.length-exposed.length)/subs.length*100) : 0` % | value colour `var(--green)` | `filterCoverage('protected')`, title `Show only subscriptions with a backup` |
| 3 | **Exposed (no backup)** | computed | `subs.filter(s => !subIsCovered(s.id)).length` | `revenue at risk` (`dn`) | `kf-a`, `width = subs.length ? Math.round(exposed.length/subs.length*100) : 0` % | value colour `var(--red)` | `filterCoverage('exposed')`, title `Show only subscriptions with no backup` |
| 4 | **Exposed value** | `subEconomics` | `exposed.reduce((a,s) => a + subEconomics(s).remaining, 0).toFixed(0)` | `SAR deferred, unprotected` (`neu`) | `kf-a`, **fixed `width:40%`** | value colour `var(--amber)` | `filterCoverage('exposed')` (same as #3) |

**Card badge** `#coverage-exposed-count` (L13158): `exposed.length + ' exposed'`, class `b b-red` (fixed red regardless of value, set in the HTML at L1227).

**Capacity metric:** per driver × slot, `occ.length` — the count of active subscriptions the driver holds in that half-hour bucket. Overlap threshold: `occ.length > 1`.

---

## 6. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| Subscription id | `s.id` ← `DB.subscriptions[k].id` | string | monospace, blue, `openProfile(s.id)` (L13172) |
| Rider name | `nm2(s.rider)` ← `DB.riders[id].name` | computed | clickable `openProfile(s.rider)` (L13173) |
| Primary captain name | `nm2(s.driver)` ← `DB.drivers[id].name` | computed | clickable `openProfile(s.driver)` (L13174) |
| Backup captain | `DB.subBackups[s.id]` → `nm2(bak)` | string / undefined | `✓ <name>` green badge or `None assigned` red badge (L13175) |
| Remaining value | `fmtSAR(subEconomics(s).remaining)` | computed | `fmtSAR` L4394: `n.toFixed(2)+' SAR'` (L13176) |
| Exposure verdict | `!!bak` | boolean | `Protected` (green) / `⚠ Single point of failure` (red) (L13177) |
| Row background | `!!bak` | boolean | `background:var(--red-lt)` when no backup (L13171) |
| Capacity: driver name | `nm2(d)` | computed | blue, `openProfile(d)` (L13258) |
| Capacity: slot occupancy | `DB.upcomingSubTrips[].scheduledTime` + `DB.subscriptions` | computed | see §4.7 |
| KPI values | computed | — | see §5 |
| Modal: candidate name / rating | `DB.drivers[c.id].name`, `.rating` | string / number | `★<rating\|—>` silver badge (L13204) |
| Modal: distance | `geoDistanceKm(riderPos, driverPos)` → `fmtKm` | computed | `<x> km away · ` prefix, omitted when `km==null` (L13206) |
| Modal: existing load | `DB.subBackups` | computed | `Backup for <n> other subscription(s)` (L13205–L13206) |
| Modal: `Nearest` badge | `i===0 && c.km!=null` | computed | `b-blue Nearest` on the first candidate only (L13204) |

**Backup-registry seed (L13140):**
```js
DB.subBackups = {'SUB-1052':'DRV-0105', 'SUB-1060':'DRV-0101'};   /* subId → backup driverId */
```
Later aliased: `DB.subBackups = DB.subBackups||{}; DB.backupRegistry = DB.subBackups;` (L17197–L17198). `dispatchBoot()` then adds **one more** eligible backup on the first active/expiring plan that has an eligible candidate (L17429–L17439).

---

## 7. Input fields / filters / config

### 7.1 `_coverageFilter` (L13145) — the only filter

`filterCoverage(f)` (L13146):
```js
function filterCoverage(f){ _coverageFilter=f; renderCoveragePage(); kpiScrollTo('coverage-list'); }
```
There is **no toggle-off behaviour** (unlike `filterCommit`, which clears on re-click) and **no visible chip or Clear button** — the only way back to `all` is KPI 1.

| Value | Set by | Predicate (L13163–L13167) |
|---|---|---|
| `'all'` (initial, L13145) | KPI 1 | `return true` |
| `'protected'` | KPI 2 | `subIsCovered(s.id)` |
| `'exposed'` | KPI 3 and KPI 4 | `!subIsCovered(s.id)` |

`kpiScrollTo('coverage-list')` (L14536–L14544) smooth-scrolls the list into view and applies the `kpi-flash-target` CSS class for 1500 ms.

> The **capacity grid is never filtered** — `renderCapacityGrid()` always uses the full `activeSubsList()` (L13241).

### 7.2 Other inputs

**None.** No search box, no sort control, no date range, no settings panel. The slot set, the candidate cap (6) and the `pending`/`busy` exclusions are all hardcoded.

---

## 8. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Assign backup** (row with no backup) | `assignBackup(s.id)` L13180 → L13186 | Opens the candidate-picker modal. No writes. | — | `requirePerm('manage_subscriptions')` **and** `requirePagePerm('coverage','assign_backup')` (L13187–L13188) | `permission_denied` on failure (L3129 / L10687) | no (modal is the step) |
| **Change backup** (row with a backup) | `assignBackup(s.id)` L13179 | Same modal | — | same | same | no |
| **Promote to primary** (row with a backup) | `promoteBackup(s.id)` L13179 | `s.driver = backup`; `delete DB.subBackups[subId]`; re-renders coverage + subscriptions table; toast with an **action callback that re-opens `assignBackup(subId)`**; ops alert notification | `DB.subscriptions[subId].driver`, `DB.subBackups` | `requirePerm('manage_subscriptions')` **and** `requirePagePerm('coverage','promote_backup')` (L13226–L13227) | `promote_backup` with before `{driver:old}` / after `{driver:bak}` (L13232–L13234) | **Yes** — `guardAction('promoteBackup',…)` L17990–L18001, `danger:true`, `irreversible:true`. Consequences: `The rider's captain changes permanently for the rest of the plan.` · `The subscription is left with no standing backup until you register a new one.` · `This breaks the same-captain promise and is counted as such.` |
| **Select** (modal, per candidate) | `commitBackup(subId,c.id)` L13208 → L13218 | `DB.subBackups[subId]=drvId`; conditional `renderCommitmentPage()`; `closeModal()`; `renderCoveragePage()`; toast `✅ <name> assigned as backup for <subId>` | `DB.subBackups` (= `DB.backupRegistry`) | **none on `commitBackup` itself** | `assign_backup` with after `{backup:drvId}` (L13222) | **Yes** — `guardAction('commitBackup',…)` L17981–L17989. Consequences: `They are offered the leg first whenever the primary captain drops out.` · `This is the single shared registry — Coverage & capacity and Plan commitment both read it.` · `Eligibility is re-checked at the moment of need; registration alone is not coverage.` |
| **✕** (modal close) | `closeModal()` | Closes | — | — | — | no |
| Subscription id cell | `openProfile(s.id)` L13172 | 360° profile | — | none | none | no |
| Rider cell | `openProfile(s.rider)` L13173 | 360° profile | — | none | none | no |
| Primary captain cell | `openProfile(s.driver)` L13174 | 360° profile | — | none | none | no |
| Capacity: driver name | `openProfile(d)` L13258 | 360° profile | — | none | none | no |
| Capacity: single-occupancy badge | `openProfile(occ[0])` L13261 | 360° profile of that subscription | — | none | none | no |
| KPI 1–4 | `filterCoverage(...)` L13154–L13157 | Filter + scroll | in-memory `_coverageFilter` | none | none | no |

**Toast with action** (L13235): `toast(msg,'ok', function(){assignBackup(subId);}, false)` — the "assign a new backup next" toast is itself a shortcut back into the picker.

---

## 9. Tables & lists

### 9.1 Backup captain coverage — `<table class="dt" id="coverage-table">` (L13168–L13183)

**Row source:** `activeSubsList()` filtered by `_coverageFilter` (L13162–L13167).

**Sort** (L13169): `shown.slice().sort((a,b) => (subIsCovered(a.id)?1:0) - (subIsCovered(b.id)?1:0))` — **uncovered first**, stable within each group. No user-controlled sort.

| # | Column header | Cell content | Interaction |
|---|---|---|---|
| 1 | `Subscription` | `s.id`, monospace 11px, `var(--blue)` | `openProfile(s.id)` |
| 2 | `Rider` | `nm2(s.rider)` | `openProfile(s.rider)` |
| 3 | `Primary captain` | `nm2(s.driver)` | `openProfile(s.driver)` |
| 4 | `Backup captain` | `<span class="b b-green">✓ <name></span>` or `<span class="b b-red">None assigned</span>` | — |
| 5 | `Remaining value` | `fmtSAR(subEconomics(s).remaining)` | — |
| 6 | `Exposure` | `<span class="b b-green">Protected</span>` or `<span class="b b-red">⚠ Single point of failure</span>` | — |
| 7 | *(actions)* | with backup: `Change backup` + `Promote to primary`; without: `Assign backup` | buttons |

- **Row background:** `var(--red-lt)` when no backup registered (L13171).
- **Row click:** none — only individual cells.
- **Empty state (L13167):** *"No subscriptions match this filter."*
- **Scroll:** `max-height:420px; overflow-y:auto` on `#coverage-list` (L1228).

> **Columns 4, 6 and 7 branch on `bak = DB.subBackups[s.id]` (raw registration), not on `subIsCovered(s.id)` (registration **plus** eligibility).** The KPIs, the card badge and the sidebar badge all use `subIsCovered`. A registered-but-ineligible backup therefore shows as `✓ <name>` / `Protected` in the table while simultaneously counting as **Exposed** in the KPI above it. Flagged in §16.

### 9.2 Driver capacity — morning peak slots (L13256–L13268)

`<table class="dt" style="min-width:640px">` inside a horizontally scrolling container (`#capacity-grid`, `overflow-x:auto`, L1233).

| Column | Content |
|---|---|
| 1 `Driver` | `nm2(d)`, blue, `openProfile(d)` |
| 2–7 | one per slot: `06:00`, `06:30`, `07:00`, `07:30`, `08:00`, `08:30`, centred headers |

- **Row source:** `Object.keys(byDriver)` — only drivers that hold ≥1 active subscription (L13257).
- **Order:** insertion order of `byDriver`, i.e. `Object.keys(DB.subscriptions)` order (L13251–L13255).
- **Empty state:** none — with no active subscriptions the `<tbody>` is simply empty (headers still render).
- **Footer note:** L13268.

---

## 10. Modals opened

### `assignBackup(subId)` — "Assign backup captain — `<subId>`" (L13196–L13216)

| Part | Content |
|---|---|
| Head | `Assign backup captain — <subId>` + `✕` (`closeModal()`) |
| Body copy (L13199) | *"Sorted by distance to `<rider>`'s route — the backup is briefed in advance and steps in automatically if `<primary captain>` becomes unavailable, the rider never feels the gap."* |
| Candidate rows (L13200–L13209) | Per candidate: **name** (bold 12px) · `★<rating\|—>` silver badge · `Nearest` blue badge (first candidate only, when `km!=null`) · second line `<fmtKm(km)> away · Backup for <n> other subscription(s)` · right-side `Select` button → `commitBackup(subId,c.id)` |
| Container | `max-height:60vh; overflow-y:auto` (L13198) |
| Foot | **none** — no Cancel button; only the `✕` |
| Opened via | `document.getElementById('modal-overlay').classList.add('open')` (L13216) |

> **No empty state.** If `candidates` is `[]` the modal renders the copy paragraph and nothing else. Nothing tells the operator that no eligible backup exists.

The `Select` button then triggers the `commitBackup` confirmation gate (L17981) on top of the modal.

---

## 11. States, severities & badges

| State | Condition | Visual | SLA |
|---|---|---|---|
| **Protected** | `DB.subBackups[s.id]` truthy | col 4 `b-green ✓ <name>`; col 6 `b-green Protected` | — |
| **Single point of failure** | `!DB.subBackups[s.id]` | col 4 `b-red None assigned`; col 6 `b-red ⚠ Single point of failure`; row background `var(--red-lt)` | — |
| **Exposed** (KPI / badges) | `!subIsCovered(s.id)` — no backup **or** backup fails `dispatchEligibility` | KPI 3 value `var(--red)`; `#coverage-exposed-count` `b b-red "<n> exposed"`; `#sbb-coverage` = `n` | — |
| **Slot free** | `occ.length===0` | `·` in `var(--border2)` | — |
| **Slot held once** | `occ.length===1` | `b-blue` badge with the sub number, clickable | — |
| **Slot double-booked** | `occ.length>1` | cell background `var(--red-lt)` + `b-red ⚠ <n> overlap`, `title` lists sub ids | — |
| **Nearest candidate** | first modal candidate with a known distance | `b-blue Nearest` | — |
| **Candidate rating** | `drv.rating` | `b-silver ★<rating>`, `—` when absent | — |

No time-based SLA exists on this page.

---

## 12. Sidebar counter formula — `#sbb-coverage`

Markup: `<span class="sb-badge a" id="sbb-coverage">0</span>` (L516).

Set inline by `renderCoveragePage()` (L13159):

```js
var sbb=document.getElementById('sbb-coverage');
if(sbb) sbb.textContent = exposed.length;
```

- **Value:** `activeSubsList().filter(s => !subIsCovered(s.id)).length` — active subscriptions whose backup is missing *or* would fail eligibility at the moment of need.
- **Class:** **never changed.** The literal `class="sb-badge a"` from L516 stands permanently — unlike `sbb-commit` / `sbb-fairness` (which toggle `a`/`n`) and `sbb-compliance` / `sbb-safety` (which also only set `textContent`). The badge therefore renders in its active style even at 0.
- **Refresh trigger:** only `renderCoveragePage()`. Because `go()` calls it on navigation to `coverage` (L8796) and `commitBackup`/`promoteBackup` call it directly, the badge is stale until the page is visited — nothing in `refreshNavCounts()` (L9392–L9409) or the tick loop updates it.

---

## 13. Cross-module links

**Shared registry:** `DB.subBackups` is defined here (L13140) and aliased as `DB.backupRegistry` by the emergency-dispatch module (L17197–L17198). Comment L17189–L17196 documents why: two registries produced two contradicting answers and the dispatcher read only the new one.

**Shared function ownership (explicit):** `assignBackup` is defined **only** in this module. Comment at L17512–L17514 in the commitment module: *"assignBackup lives on the Coverage page and is shared — this module no longer defines its own. A second definition silently overrode the original, so the Coverage page's own assign button had been rewired to write into the wrong registry."*

**Out:**
- `openProfile(<subId|riderId|driverId>)` → 360° profile (L13172–L13174, L13258, L13261).
- `renderCommitmentPage()` — called from `commitBackup` when `#coverage-body` exists in the DOM (L13220).
- `renderSubscriptionsTable()` — called from `promoteBackup` (L13231).
- `go('coverage',null)` from the promote notification (L13236).
- `subEconomics()` (L3605) → shared finance helper.
- `dispatchEligibility()` (L17209) / `subIsCovered()` (L17472) → owned by the commitment/dispatch module.
- `driverLiveState()` (L7283), `geoDistanceKm()` (L7256), `fmtKm()` (L7281) → live-map helpers.
- `logAction()` → Activity log; `pushOpsNotification()` → notification stack.

**In:**
- `go('coverage',null)` from `commitMenu('coverage',…)` on the Plan-commitment page (L16876).
- Plan commitment's `🛟 Backup coverage` card (`renderCoverage()`, L17515) reads the same `DB.subBackups` and offers `assignBackup` (L17550) and `commitMenu('coverage',…)` (L17551).
- `hasBackup(subId)` (L17241) — used by `autoHandoff` and `emergencyDispatch` — reads `DB.backupRegistry`, i.e. this registry.
- `dispatchBoot()` (L17427) writes into `DB.backupRegistry[k]` — visible immediately on this page.

---

## 14. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `DB.subBackups={'SUB-1052':'DRV-0105','SUB-1060':'DRV-0101'}` | L13140 | **Demo seed** — two hardcoded backup assignments |
| Slot set `['06:00','06:30','07:00','07:30','08:00','08:30']` | L13240 | **Hardcoded** — morning peak only; no afternoon/evening buckets, no configuration |
| Default slot `'07:00'` when no upcoming trip **and** when the computed slot is outside the set | L13244, L13249 | **Hardcoded fallback** — silently collapses out-of-range times into the 07:00 column |
| Candidate cap `.slice(0,6)` | L13195 | Hardcoded |
| KPI 1 bar `width:70%` | L13154 | **Cosmetic constant**, unrelated to data |
| KPI 4 bar `width:40%` | L13157 | **Cosmetic constant**, unrelated to data |
| Standing-backup `etaMin:6` used by dispatch for a registered backup | L17270 | Hardcoded stub (dispatch module, but it is *this* registry's backup) |
| Distance model `sqrt(dx²+dy²)*0.42`, `mapPos` grid coordinates | L7256 ff., `DB.drivers[].mapPos` L2632 ff. | Synthetic geometry |
| `DB.subscriptions` fixture — 7 rows (5 non-cancelled) | L2686–L2692 | Demo book |
| `DB.drivers` fixture — 5 captains `DRV-0101`–`DRV-0105` | L2632 ff. | Demo fleet |
| `#coverage-exposed-count` initial text `0 exposed`, class `b b-red` | L1227 | Static markup |
| Card headings, footer note, modal copy | L1226, L1231–L1232, L13199, L13268 | Hardcoded English |

---

## 15. i18n keys

| Key | English (L516) | Arabic (L7908) |
|---|---|---|
| `nav.coverage` | `Coverage & capacity` | `التغطية والسعة` |

**No other `data-i18n` attributes on this page.** `<h1>🛡️ Coverage & capacity</h1>` (L1222), `#coverage-sub` (L1223), the card headings `Backup captain coverage — every active subscription` (L1226) and `Driver capacity — morning peak slots` (L1231), the hint `A driver can't hold two subscriptions in the same slot` (L1232), all seven table headers (L13168), all KPI labels and delta strings, all badge texts, both empty states, the modal copy and every toast are **hardcoded English**.

---

## 16. Gaps, dead code, UNVERIFIED items

1. **Table columns and KPIs disagree.** Columns 4/6/7 and the row background test `bak = DB.subBackups[s.id]` (raw registration, L13170), while the KPIs, the card badge and the sidebar badge test `subIsCovered()` (registration **+** eligibility, L13150). A registered-but-ineligible backup shows `✓ <name>` / `Protected` in the row while being counted as *Exposed* directly above it — precisely the discrepancy the shared `subIsCovered` definition was introduced to eliminate (comment L17468–L17471). The Plan-commitment coverage card (`renderCoverage()`, L17536–L17539) *does* render the third state (`registered but ineligible`); this page does not.
2. **`_coverageFilter` cannot be cleared except via KPI 1.** No toggle-off, no chip, no Clear button (contrast `commitFilterChip()` L16840).
3. **KPI 3 and KPI 4 are the same filter** — clicking "Exposed value" and "Exposed (no backup)" are indistinguishable (L13156–L13157).
4. **Two decorative progress bars carry fixed widths** (70% and 40%, L13154 / L13157) that never reflect data.
5. **`slotOf()` strips AM/PM without converting.** `String(scheduledTime).replace(/ ?[AP]M/i,'')` (L13243) turns `"7:30 PM"` into `"7:30"` → slot `07:30`. Any evening trip is silently bucketed into a morning slot.
6. **`slotOf()` matches only the FIRST upcoming trip per rider** (`.find(t => t.rider === s.rider)`, L13243) — a rider with multiple upcoming legs contributes only one.
7. **Everything outside 06:00–08:30 collapses into 07:00** (L13249), inflating that column.
8. **Overlaps have no remedy.** The grid flags `⚠ n overlap` but exposes no action to resolve it (L13263).
9. **The capacity grid ignores `_coverageFilter`** (L13241) — filtering the list above leaves the grid unchanged.
10. **`promoteBackup` does not increment `driverChanges`** (L13228–L13231), so a permanent captain change made from this page never registers against the same-captain promise metric — unlike the two other places a captain changes (L16704, L17343).
11. **`commitBackup` has no permission check** (L13218) — the gate lives on `assignBackup` (L13187–L13188). Anything that calls `commitBackup` directly bypasses `coverage.assign_backup`.
12. **No cap on backup load.** The modal *displays* how many other subscriptions a candidate already backs (L13205) but nothing prevents assigning the same captain to every plan.
13. **The candidate modal has no empty state and no Cancel button** (L13196–L13216) — zero eligible candidates renders a modal with only explanatory text.
14. **`#coverage-sub` (L1223) is given an id but never written to.**
15. **`#sbb-coverage` never changes CSS class** (L13159) — permanently `sb-badge a`, so it renders "active" even when 0.
16. **The sidebar badge is only refreshed by `renderCoveragePage()`.** Nothing in `refreshNavCounts()` (L9392) or the tick loop updates it, so it is stale until the page is opened.
17. **`activeSubsList()` (`!/cancel/i`) and `backupCoverage()` (`/active|expiring/i`) define "the book" differently** (L13143 vs L17482). Same numbers on the shipped fixture; not the same rule.
18. **`coverageBoot()` is an intentional no-op** (L17578–L17580).
19. **`subEconomics().remaining` is a rider-side figure** (gross paid minus consumed, L3612) whereas the commitment module's exposure uses `paid*0.8` (driver share, L16652). "Exposed value" therefore measures rider-paid deferred revenue, not captain earnings at risk — the KPI sub-label `SAR deferred, unprotected` is accurate, but the two pages quantify "at risk" on different bases.
20. **UNVERIFIED — `driverLiveState(d).busy`** (L13188, def L7283): the live-state module was not read in full; its exact `busy` predicate is outside this module group.
21. **UNVERIFIED — `geoDistanceKm` coordinate semantics** (L7256): `mapPos` is a synthetic `{x,y}` grid, so "km" is a demo unit.
22. **UNVERIFIED — `DB.upcomingSubTrips[].scheduledTime` format guarantees** (L13243): the code defends against `AM/PM` and single-digit hours but the fixture's exact shape was not enumerated here.

---

## 17. Line-number index

| Item | Lines |
|---|---|
| Sidebar nav item + `#sbb-coverage` | L516 |
| Page HTML `#p-coverage` | L1220–L1235 |
| — `#coverage-sub` | L1223 |
| — `#coverage-kpis` | L1225 |
| — card 1 heading + `#coverage-exposed-count` | L1226–L1227 |
| — `#coverage-list` | L1228 |
| — card 2 heading + hint | L1231–L1232 |
| — `#capacity-grid` | L1233 |
| `titles.coverage` / `subs.coverage` | L2168 / L2169 |
| `DB.drivers` fixture | L2632 ff. |
| `DB.subscriptions` fixture | L2686–L2692 |
| `requirePerm()` / `logAction()` | L3126–L3132 / L3133–L3152 |
| `nm2()` | L3565 |
| `EYVAR_COMMISSION_PCT` / `subEconomics()` | L3604 / L3605–L3618 |
| `fmtSAR()` | L4394 |
| `geoDistanceKm()` / `fmtKm()` / `driverLiveState()` | L7256 / L7281 / L7283 |
| `nav.coverage` Arabic | L7908 |
| `go()` routing hook | L8796 |
| `refreshNavCounts()` (does **not** touch `sbb-coverage`) | L9392–L9409 |
| `PAGE_PERMISSIONS.coverage` | L10599–L10603 |
| `requirePagePerm()` | L10680–L10691 |
| Module header comment | L13130–L13139 |
| `DB.subBackups` seed | L13140 |
| `activeSubsList()` | L13141–L13144 |
| `_coverageFilter` / `filterCoverage()` | L13145 / L13146 |
| `renderCoveragePage()` | L13147–L13185 |
| — KPI block | L13152–L13157 |
| — card badge + sidebar badge | L13158–L13159 |
| — filter predicate | L13162–L13167 |
| — table header + sort | L13168–L13169 |
| — row template | L13170–L13182 |
| — `renderCapacityGrid()` call | L13184 |
| `assignBackup()` | L13186–L13217 |
| `commitBackup()` | L13218–L13224 |
| `promoteBackup()` | L13225–L13237 |
| `renderCapacityGrid()` | L13238–L13275 |
| — slot set | L13240 |
| — `slotOf()` | L13242–L13250 |
| — occupancy map | L13251–L13255 |
| — cell rendering | L13258–L13264 |
| — footer note | L13268 |
| `kpiScrollTo()` | L14536–L14544 |
| `commitMenu('coverage',…)` (links in) | L16869–L16877 |
| `DB.backupRegistry` alias + rationale | L17189–L17198 |
| `dispatchEligibility()` | L17209–L17225 |
| `hasBackup()` | L17241–L17246 |
| `dispatchBoot()` (seeds one more backup) | L17427–L17442 |
| `subIsCovered()` | L17472–L17479 |
| `backupCoverage()` / `coverageStats()` | L17480–L17501 / L17502–L17511 |
| "assignBackup lives on the Coverage page" comment | L17512–L17514 |
| `renderCoverage()` (commitment-page twin) | L17515–L17561 |
| `coverageBoot()` (no-op) | L17578–L17580 |
| Gate: `commitBackup` | L17981–L17989 |
| Gate: `promoteBackup` | L17990–L18001 |
| Boot step `'backup coverage'` | L21818 |
