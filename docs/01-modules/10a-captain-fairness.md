# Module: Captain Fairness

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `fairness` · **Page div:** `#p-fairness`
> **HTML lines:** L1402–L1408 · **Sidebar item:** L514
> **Render entry points:** `renderFairnessPage()` (L15636–L15696), `renderCaptainEconomics()` (L16291–L16310)

---

## 1. Purpose

The route back for the supply side of the market. The panel could flag, deduct, auto-suspend and suspend a captain with no way for the captain to contest any of it and no record of a reason being served (comment L15499–L15504). In a subscription model a captain is locked to one rider for a week, so a single unfair report costs a full cycle's income (L15501–L15503).

Three case kinds land here — **suspension appeals**, **rating disputes**, and **captain-reported rider issues** — plus a **captain economics** table measuring earnings per engaged hour (L16274–L16279: "Tier and rating were tracked; earnings per hour was not — and that is the number a captain actually decides to stay or leave on").

Every case is a coded ticket, so it also counts in CPT / contact-driver reporting (L15504, and the `logContact` call at L15516–L15517).

---

## 2. Entry points & routing

| Trigger | Line | Effect |
|---|---|---|
| Sidebar item `onclick="go('fairness',this)"` | L514 | Navigates to page |
| `go()` router: `if(id==='fairness'){renderFairnessPage();renderCaptainEconomics();}` | L8821 | Both renderers run on every navigation |
| `refreshOwnershipSurfaces()` re-renders if page is `.on` | L19053 | `if(pg==='fairness'&&typeof renderFairnessPage==='function')renderFairnessPage();` |
| `fcNew()` → `pushOpsNotification('ticket',…,function(){go('fairness',null);})` | L15518 | Notification click-through |
| `commitRatingDispute()` → `closeModal();go('fairness',null);` | L15540 | After filing a dispute |
| `commitReportRider()` → `closeModal();go('fairness',null);` | L15565 | After filing a rider report |
| `commitDriverAppeal()` → `closeModal();go('fairness',null);` | L15586 | After filing an appeal |
| `commitMenu('driver',…)` action `⚖️ Captain fairness` → `go('fairness',null)` | L16888 | From Plan-commitment row menus |
| Work Inbox item action `"go('fairness',null)"`, label `Decide` | L19142 | From `#p-inbox` |
| Title / subtitle strings | L2168 (`fairness:'Captain Fairness'`), L2169 (`fairness:'Appeals, rating disputes and captain-reported rider issues'`) | Topbar text |

**Boot:** `seedFairness()` is registered in `bootModules()` as step `'fairness cases'` with `needs:['fairnessCases']` (L21813). Definition L15809–L15827.

**Permission gate on the page itself:** none. `PAGE_PERMISSIONS` (L10564 ff.) has **no `fairness` entry** — `requirePagePerm('fairness',…)` is never called anywhere in this module.

---

## 3. Layout map

HTML skeleton (L1402–L1408):

```
<div class="page" id="p-fairness">
  <div class="ph"><div class="ph-l">
    <h1>⚖️ Captain fairness</h1>
    <p>Appeals, rating disputes and captain-reported rider issues — the route back for the other side of the market</p>
  </div></div>
  <div id="fairness-body"></div>                     ← renderFairnessPage()
  <div class="card" style="margin-top:12px">
    <div class="ch"><h2>💵 Captain economics — earnings per engaged hour</h2></div>
    <div id="captain-econ"></div>                    ← renderCaptainEconomics()
  </div>
</div>
```

`#fairness-body` is filled with, in order (L15669–L15696):

1. **KPI strip** — `div.g4`, 4 KPI tiles (L15669–L15674). *Not clickable — no filter handlers.*
2. **Card `⚖️ Open cases`** + amber badge with the open count (L15675–L15677).
3. **Card `🚫 Suspended captains — appeal route`** (L15678–L15688).
4. **Card `📁 Decided`** (L15689–L15691).

`#captain-econ` is filled with (L16294–L16310):

5. **Explanatory band** — fleet average SAR / engaged hour + the "upper bound" caveat.
6. **Table** — captain economics (or empty state).

---

## 4. Rules & policy logic — every rule and formula written out exactly

### 4.1 Case creation — `fcNew(kind,driverId,subjectId,detail,reasonCode)` (L15507–L15521)

```js
var c={
  id:'FC-'+String(DB.fairnessCases.length+1).padStart(4,'0'),
  kind:kind, driverId:driverId, subjectId:subjectId||null,
  detail:detail, reasonCode:reasonCode,
  status:'Open', openedAtMs:nowMs(), date:fmtReqNowLabel(),
  decision:null, decidedBy:null, decidedAtMs:null, rationale:null
};
DB.fairnessCases.unshift(c);
```

Side effects on every case creation (L15516–L15519):
- `logContact({channel:'in_app',direction:'inbound',reasonCode:reasonCode,entityId:driverId,entityName:nm2(driverId),linked:{type:'fairness',id:c.id}})`
- `logAction('fairness_case_opened','driver',driverId,kind+' opened — '+detail)`
- `pushOpsNotification('ticket','⚖️ '+kind+' — '+nm2(driverId),detail,function(){go('fairness',null);})`

Ids come from `DB.fairnessCases.length+1` (L15509); cases are only ever `unshift`ed and never removed, so the counter never regresses.

### 4.2 The three case kinds

| Kind string | Reason code | Opened by | Subject | Extra fields |
|---|---|---|---|---|
| `'Rating dispute'` | `DRV_RATING_DISPUTE` | `commitRatingDispute(tripId)` L15535–L15542 | `t.rider` | `c.tripId=tripId; c.disputedRating=t.driverRatingGiven` (L15539) |
| `'Rider report'` | one of `DRV_RIDER_NOSHOW` / `DRV_RIDER_CONDUCT` / `DRV_VEHICLE_DAMAGE` | `commitReportRider(tripId)` L15559–L15567 | `t.rider` | `c.tripId=tripId` (L15564) |
| `'Suspension appeal'` | `DRV_SUSPENSION_APPEAL` | `commitDriverAppeal(driverId)` L15582–L15588 | `null` | none |

### 4.3 SLA per case — `rcTargets(c.reasonCode)` (L14730–L14742)

```js
fr : (rc && rc.fr  != null) ? rc.fr  : tier.firstResponseMin,
res: (rc && rc.res != null) ? rc.res : tier.resolveMin,
upd: (rc && rc.upd != null) ? rc.upd : null,
tier: (rc && rc.tier) || 'T3',
pause: tier.pauseOnCustomer
```

Tier defaults (`DB.slaPolicy.tiers`, L14650–L14660):

| Tier | Label | firstResponseMin | resolveMin | hours | pauseOnCustomer |
|---|---|---|---|---|---|
| T1 | Critical | 0 | 240 | 24/7 | false |
| T2 | High | 15 | 1440 | 24/7 | true |
| T3 | Medium | 60 | 2880 | 24/7 | true |
| T4 | Low | 240 | 4320 | business | true |

Also `atRiskPct:75`, `breachEscalateTo:'ops_supervisor'`, `uncodedCeilingPct:3` (L14656–L14659).

Reason-code overrides relevant to this page (`DB.reasonCodes`, L14663–L14727):

| Code | cat | target | tier | fr (min) | res (min) | comp (SAR cap) | owner | labelEn |
|---|---|---|---|---|---|---|---|---|
| `DRV_RIDER_NOSHOW` | Driver | driver | T3 | 60 | 1440 | 0 | Ops | Driver reports rider no-show (L14705) |
| `DRV_RIDER_CONDUCT` | Driver | driver | T2 | 15 | 1440 | 0 | Safety | Driver reports rider behaviour (L14706) |
| `DRV_VEHICLE_DAMAGE` | Driver | driver | T3 | 60 | 2880 | 0 | Ops | Vehicle damage or cleaning claim (L14707) |
| `DRV_RATING_DISPUTE` | Driver | driver | T3 | 60 | 2880 | 0 | Ops | Captain disputes an unfair rating (L14709) |
| `DRV_DEDUCTION_DISPUTE` | Driver | driver | T2 | 15 | 1440 | 0 | Ops | Driver disputes a deduction (L14710) |
| `DRV_SUSPENSION_APPEAL` | Driver | driver | T2 | 15 | 1440 | 0 | Compliance | Driver appeals a suspension (L14711) |

**SLA breach rule on the page** (L15653–L15654):
```js
var tg=rcTargets(c.reasonCode);
var over=(nowMs()-c.openedAtMs) > tg.res*60000 && c.status==='Open';
```
Displayed as `⚠ past <Math.round(tg.res/60)>h SLA` in red (L15654/L15659). So:
- Rating dispute / vehicle damage → **past 48h**
- Rider no-show / conduct / suspension appeal → **past 24h**

### 4.4 Decision logic — `decideFairness(caseId,uphold)` (L15591–L15635)

**Permission:** `if(!requirePerm('approve_drivers'))return;` (L15592).
**Guard:** case must exist and be `status==='Open'` (L15594).

```js
c.status = uphold ? 'Upheld' : 'Overturned';
c.decision = c.status; c.decidedBy = actor?actor.name:CURRENT_USER_ID; c.decidedAtMs = nowMs();
```

**Corrective action A — overturned rating dispute** (L15597–L15621). Conditions: `!uphold && c.kind==='Rating dispute' && c.tripId` **and** `t && drv && t.driverRatingGiven>0 && !t.ratingVoided`.

Exact recomputation formula (L15607–L15613):
```js
var n = drv.ratingCount || 0;
if(n > 1){
  var newAvg = ((drv.rating * n) - t.driverRatingGiven) / (n - 1);
  newAvg = Math.max(1, Math.min(5, newAvg));       // clamped to [1,5]
  drv.rating = Math.round(newAvg*10)/10;           // 1 decimal
  drv.ratingCount = n - 1;
  c.averageAdjusted = true;
} else {
  c.averageAdjusted = false;                       // seeded average, no denominator
}
t.ratingVoided = true;                             // always
if(typeof recalcDriverTiers==='function')recalcDriverTiers(true);
logAction('rating_voided','driver',c.driverId, …);
```
Rationale in-code (L15598–L15606): "A seeded average with no denominator cannot be un-averaged — inventing one produces impossible results (removing a 2★ from 4.5 over an assumed n=2 yields 7★)." So the score is **always** voided and excluded going forward; the historical average is recomputed only when `n>1`.

**Corrective action B — overturned suspension appeal** (L15622–L15627):
```js
var dd=DB.drivers[c.driverId];
if(dd&&dd.suspended){ delete dd.suspended;
  logAction('account_reinstated','driver',c.driverId, nm2(c.driverId)+' reinstated on appeal '+c.id);
  if(typeof renderDriversTable==='function')renderDriversTable(); }
```

**Corrective action C — overturned rider report:** none in code. Per the gate copy (L17966): *"The report is dismissed and no action is taken against the rider."*

**Upheld (any kind):** no state change beyond `status` / `decision` / `decidedBy` / `decidedAtMs`. Gate copy: "The original decision stands. The captain is notified of the outcome." (L17961).

**Always:** `logAction('fairness_decision','driver',c.driverId,c.kind+' '+c.status.toLowerCase()+' — '+c.id)` (L15628), then `renderFairnessPage()` (L15629).

Toast (L15630–L15634):
```js
var extra=(c.kind==='Rating dispute'&&!uphold&&c.averageAdjusted===false)
  ?' — score voided, but the average had no stored count to reverse against':'';
toast((uphold?'Decision recorded — upheld':'✅ Overturned — the effect has been reversed'+extra), uphold?'info':'ok');
```

### 4.5 Captain economics — `captainEconomics()` (L16280–L16290)

Per driver in `DB.drivers`:
```js
trips   = DB.trips values where t.driver===id && /done/i.test(t.status||'')
mins    = Σ (parseFloat(t.min) || 0)                       // trip duration, minutes
earn    = Σ ((parseFloat(t.driverEarn)||0) + (t.tip||0))   // driver share + tip
perHour = mins>0 ? earn/(mins/60) : 0
```
Returned row: `{id,name,tier:d.lvl,rating:d.rating,trips:trips.length,mins,earn,perHour}`.
Filter: `.filter(x=>x.trips>0)`. Sort: `.sort((a,b)=>b.perHour-a.perHour)` — descending SAR per engaged hour.

Fleet average (L16294): `avg = rows.length ? Σ(r.perHour)/rows.length : 0` — a **mean of per-captain rates**, not total earnings ÷ total hours.

**Under-earner threshold** (L16307): `r.perHour < avg*0.7` → the per-hour cell renders `var(--red)`; otherwise `var(--green)`. No action attached.

**Stated limitation** (comment L16274–L16279, restated to the user at L16296–L16297): "Engaged hour = time on trip. True online hours (including waiting) need driver-app telemetry this panel does not receive — so this is an *upper bound* on real hourly earnings, and is labelled as one rather than passed off as the real figure."

### 4.6 Seeding rule — `seedFairness()` (L15809–L15827)

```js
if(DB.fairnessCases.length)return;                 // idempotent
var lowId = lowRatedTripIds()[0];                  // L15342: trips where isLowRating(driverRatingGiven)
if(lowId){
  var t=DB.trips[lowId];
  var c=fcNew('Rating dispute',t.driver,t.rider,
    'Rider was 12 minutes late to the pickup point; captain waited and was rated down for the delay.','DRV_RATING_DISPUTE');
  c.tripId=lowId; c.disputedRating=t.driverRatingGiven;
  c.openedAtMs=agoMs(90);                          // 90 minutes before SEED_EPOCH
}
if(typeof updateContactsBadge==='function')updateContactsBadge();
```
`isLowRating(r)` = `typeof r==='number' && r>0 && r<=lowRatingThreshold()` (L15247); `lowRatingThreshold()` = `DB.opsConfig.notifications.lowRatingThreshold || 2.5` (L15243–L15246).

The trailing `updateContactsBadge()` exists because `slaBoot()` (which computes `sbb-fairness`) runs **before** this seed in the boot order and would otherwise leave the badge at 0 (comment L15819–L15824).

---

## 5. KPIs & metrics

All four KPI tiles are rendered at L15669–L15674. **None are clickable** (plain `class="kpi"`, no `onclick`).

| # | Label | Source | Exact formula | Thresholds / colour |
|---|---|---|---|---|
| 1 | **Open cases** | `DB.fairnessCases` | `DB.fairnessCases.filter(c=>c.status==='Open').length` (L15639) | value colour `var(--amber)` if `>0` else `var(--ink)` (L15670). Sub-label `appeals, disputes, reports` |
| 2 | **Overturn rate** | `DB.fairnessCases` | `decided.length ? Math.round(overturned/decided.length*100) : 0`, where `decided = cases with status!=='Open'` (L15640) and `overturned = decided.filter(c=>c.status==='Overturned').length` (L15641) | no colour rule. Sub-label `of <decided.length> decided` (L15671) |
| 3 | **Suspended captains** | `DB.drivers` | `Object.keys(DB.drivers).filter(id=>DB.drivers[id].suspended).length` (L15642) | `var(--red)` if `>0` else `var(--ink)` (L15672). Sub-label `each may appeal` |
| 4 | **Ratings voided** | `DB.trips` | `Object.keys(DB.trips).filter(k=>DB.trips[k].ratingVoided).length` (L15673) | no colour rule. Sub-label `removed from averages` |

**Captain-economics metrics** (`#captain-econ`):

| Metric | Source | Formula | Threshold |
|---|---|---|---|
| Fleet average SAR/engaged hour | computed | `Σ(r.perHour)/rows.length` over captains with ≥1 done trip (L16294) | none |
| Per-captain **Engaged** | `DB.trips[].min` | `Math.round(Σ parseFloat(t.min))` minutes (L16283, displayed L16306) | none |
| Per-captain **Earned** | `DB.trips[].driverEarn`, `.tip` | `Σ (parseFloat(t.driverEarn)||0)+(t.tip||0)` (L16284) | none |
| Per-captain **Per engaged hour** | computed | `earn/(mins/60)` (L16286) | red if `< avg*0.7` else green (L16307) |

> **Defined next to this page but not rendered by it:** `sameCaptainStats()` (L15697–L15702) — `pct = ids.length ? Math.round((ids.length-broken.length)/ids.length*100) : 100`, where `broken = subscriptions with driverChanges>0`; and `onTimeStats()` (L15703–L15709) — `pct = trips.length ? Math.round((trips.length-late.length)/trips.length*100) : 100`, where `late = /Late \+/.test(t.status)` over non-cancelled trips. Neither is called from `renderFairnessPage()`.

---

## 6. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| Case kind | `c.kind` | string | `'Rating dispute'` / `'Rider report'` / `'Suspension appeal'` — hardcoded literals at L15538 / L15563 / L15584 |
| Case captain name | `nm2(c.driverId)` → `DB.drivers[id].name` | computed | `nm2` L3565 |
| Case id badge | `c.id` | string | `FC-####` (L15509) |
| Case age | `fmtAge(nowMs()-c.openedAtMs)` | computed | L15652; `fmtAge` L14630–L14636 (`<60m`→`Nm`; `<1440m`→`Xh Ym`; else `Xd Yh`) |
| SLA breach flag | `(nowMs()-c.openedAtMs) > rcTargets(c.reasonCode).res*60000` | computed | L15653 |
| Case detail | `c.detail` | string | free text from the modal textarea |
| Reason-code label | `rcLabel(c.reasonCode)` | computed | L14743: `(rc.ref? rc.ref+' · ':'')+rc.labelEn` |
| Subject | `nm2(c.subjectId)` | computed | rendered as `· about <name>` (L15662) |
| Trip ref | `c.tripId` | string | rendered as `· TRP-####` (L15663) |
| Decider | `c.decidedBy` | string | rendered as `· decided by <name>` (L15664) |
| Average-adjusted note | `c.averageAdjusted` | boolean | `· average recomputed` vs `· score voided; historical average not recomputable` (L15665–L15667) |
| Work / ownership chip | `workChip('fairness',c.id)` | computed | L19030: `caseChip(type,id)+ownerChip(type,id)` (defs L18997 / L18928) |
| Suspended captain name | `DB.drivers[id].name` | string | L15683 |
| Suspension reason / by / at | `d.suspended.reason`, `.by`, `.at` | object | L15684 |
| Existing-appeal flag | `DB.fairnessCases.some(c=>c.driverId===id && c.kind==='Suspension appeal' && c.status==='Open')` | computed | L15681 |
| Econ: captain name | `DB.drivers[id].name` | string | L16304 |
| Econ: tier | `d.lvl` | string | `gold` / `silver` / other → badge class `b-gold` / `b-silver` / `b-grey` (L16305) |
| Econ: rating | `d.rating` | number | `★ <(r.rating||0).toFixed(1)>` (L16306) |
| Econ: trips / engaged / earned / per-hour | computed | — | L16306–L16307 |

---

## 7. Input fields / filters / config

**On-page filters: NONE.** `renderFairnessPage()` has no search box, no select and no filter state variable — unlike `coverage`, `compliance`, `safety` and `commitment`, which each have one.

Inputs exist only inside the three modals this module opens:

| id | Type | Label | Default | Options | Drives |
|---|---|---|---|---|---|
| `fc-detail` (rating dispute) | `<textarea rows="3">` | `Captain's reason`, placeholder `What the captain says happened` | empty | — | `c.detail`; fallback `'No reason given'` (L15537) |
| `fc-kind` (via `customSelectHTML('csel-fc-kind','fc-kind',…)`) | custom select | `What happened` | `DRV_RIDER_NOSHOW` | `DRV_RIDER_NOSHOW` = "Rider no-show at pickup"; `DRV_RIDER_CONDUCT` = "Rider behaviour / conduct"; `DRV_VEHICLE_DAMAGE` = "Vehicle damage or cleaning needed" (L15550–L15553) | `c.reasonCode` → SLA targets (L15561) |
| `fc-detail` (rider report) | `<textarea rows="3">` | `Detail`, placeholder `What the captain reported` | empty | — | `c.detail`; fallback `'No detail given'` (L15562) |
| `fc-detail` (driver appeal) | `<textarea rows="3">` | `Captain's statement`, placeholder `What the captain says` | empty | — | `c.detail`; fallback `'No statement given'` (L15583) |

**Gate-dialog options** injected by `guardAction` for `decideFairness`: none — the spec at L17950–L17968 defines `title` / `summary` / `consequences` / `confirmLabel` / `ownerWarn` only.

---

## 8. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit entry | Confirms? |
|---|---|---|---|---|---|---|
| **Uphold** (open case row) | `decideFairness(id,true)` L15660 → L15591 | Sets `status`/`decision`=`'Upheld'`, `decidedBy`, `decidedAtMs`. No other state change. Toast `Decision recorded — upheld` (`info`). Re-renders page. | `DB.fairnessCases[i]` | `requirePerm('approve_drivers')` (L15592) | `fairness_decision` (L15628) | **Yes** — `guardAction('decideFairness',…)` L17950. Title `Uphold — <kind>`; consequences `['The original decision stands.','The captain is notified of the outcome.']`; `irreversible:true`; `ownerWarn:ownershipWarning('fairness',caseId)` |
| **Overturn** (open case row) | `decideFairness(id,false)` L15661 | Sets `Overturned` + runs the corrective action per §4.4 (void rating and maybe recompute average + `recalcDriverTiers(true)`; or `delete driver.suspended` + `renderDriversTable()`). Toast `✅ Overturned — the effect has been reversed` (+ optional suffix when `c.averageAdjusted===false`). | `DB.fairnessCases[i]`, `DB.trips[tripId].ratingVoided`, `DB.drivers[id].rating`, `.ratingCount`, `.suspended` | `requirePerm('approve_drivers')` | `fairness_decision` + `rating_voided` (L15614) **or** `account_reinstated` (L15624) | **Yes** — same gate; consequences branch on `c.kind` (L17962–L17967) |
| **File appeal** (suspended-captain row) | `openDriverAppeal(id)` L15686 → L15568 | Opens the appeal modal. No writes. | — | none | none | no (the modal is the deliberate step) |
| Captain name (suspended list) | `openProfile(id)` L15683 | Navigates to 360° profile | — | none | none | no |
| **Open dispute** (modal foot) | `commitRatingDispute(tripId)` L15533 → L15535 | `fcNew('Rating dispute',…,'DRV_RATING_DISPUTE')` + `c.tripId` + `c.disputedRating`; `closeModal()`; `go('fairness',null)`; toast `⚖️ Dispute <id> opened — rating stays live until decided` (`info`) | `DB.fairnessCases`, `DB.contacts` (via `logContact`), `DB.auditLog`, notification stack | none | `fairness_case_opened` (L15517) + contact log | **Yes** — `GATE_SPECS.commitRatingDispute` L18337–L18341: `['The rating stays live until the case is decided.','A coded case is opened and counted in contact volume.']` |
| **Submit report** (modal foot) | `commitReportRider(tripId)` L15556 → L15559 | `fcNew('Rider report',t.driver,t.rider,detail,code)` + `c.tripId`; `go('fairness',null)`; toast `⚖️ Report <id> filed against <rider>` (`info`) | as above | none | `fairness_case_opened` + contact log | **Yes** — `GATE_SPECS.commitReportRider` L18342–L18346: `['The report goes to the fairness queue for a decision.','The rider is not penalised by the report alone.']` |
| **File appeal** (modal foot) | `commitDriverAppeal(driverId)` L15580 → L15582 | `fcNew('Suspension appeal',driverId,null,det,'DRV_SUSPENSION_APPEAL')`; `go('fairness',null)`; toast `⚖️ Appeal <id> filed — SLA clock running` (`info`) | as above | none | `fairness_case_opened` + contact log | **Yes** — `GATE_SPECS.commitDriverAppeal` L18347–L18350: `['The appeal enters the fairness queue with a decision clock.','The suspension stays in force until a decision is made.']` |
| **Cancel** (all three modals) | `closeModal()` | Closes modal | — | — | — | no |
| Captain name (economics table) | `openProfile(r.id)` L16304 | 360° profile | — | none | none | no |
| **⚖️ Captain disputes this rating** *(entry point outside this page)* | `openRatingDispute(d.id)` L15287 → L15522 | Opens the rating-dispute modal from a trip row | — | none | none | no |

`workChip('fairness',c.id)` (L15668) renders the case-grouping chip plus the ownership chip; their click handlers live in `caseChip` (L18997) / `ownerChip` (L18928), i.e. the case/ownership module, not here.

---

## 9. Tables & lists

### 9.1 Open cases (list, not `<table>`) — `row(c)` L15645–L15668, container L15675–L15677

- **Row source:** `DB.fairnessCases.filter(c=>c.status==='Open')` (L15639).
- **Order:** array order — `unshift` at L15515 means **newest first**. No sort control.
- **Fields per row (left→right):** `kind — nm2(driverId)` · `FC-####` badge · SLA/age marker · `detail` · meta line (`rcLabel` · `about <subject>` · `tripId` · `decided by` · average note) · right side: `workChip` + `Uphold` + `Overturn`.
- **Row click:** none on the row itself.
- **Empty state (L15677):** *"Nothing open. A high overturn rate on this page is not a failure — it means the appeal route is doing its job and catching bad calls before they cost you a captain."*

### 9.2 Suspended captains — appeal route (L15678–L15688)

- **Row source:** `Object.keys(DB.drivers).filter(id=>DB.drivers[id].suspended)` (L15642).
- **Order:** `Object.keys` order of `DB.drivers`.
- **Fields:** captain name (blue, `openProfile`), then `Reason served: <d.suspended.reason> · by <d.suspended.by> · <d.suspended.at>`.
- **Row action:** `<span class="b b-amber">Appeal open</span>` if an Open `Suspension appeal` already exists for that driver, else the **File appeal** button (L15687).
- **Empty state:** *"No captain is currently suspended."* (L15688).

### 9.3 Decided (L15689–L15691)

- **Row source:** `DB.fairnessCases.filter(c=>c.status!=='Open')` (L15640); same `row()` renderer — but with a status badge (`b-green` for `Overturned`, `b-grey` otherwise, L15656) and **no Uphold/Overturn buttons** (L15666–L15667).
- **Empty state:** *"No decisions recorded yet."* (L15691).

### 9.4 Captain economics `<table class="dt">` (L16301–L16309)

| # | Column | Value |
|---|---|---|
| 1 | Captain | `r.name`, blue, `openProfile(r.id)` |
| 2 | Tier | badge `b-gold` / `b-silver` / `b-grey` from `d.lvl`; `—` if falsy |
| 3 | Rating | `★ <(r.rating||0).toFixed(1)>` |
| 4 | Trips | `r.trips` (count of `/done/i` trips) |
| 5 | Engaged | `Math.round(r.mins)+' min'` |
| 6 | Earned | `r.earn.toFixed(2)`, blue |
| 7 | Per engaged hour | `r.perHour.toFixed(2)+' SAR'`, bold, red if `< avg*0.7` else green |

- **Sort:** fixed, `perHour` descending (L16289). No user control.
- **Filter:** fixed, `trips>0` (L16289). No user control.
- **Row click:** only the name cell.
- **Empty state:** *"No completed trips to measure yet."* (L16309).

---

## 10. Modals opened

| Modal | Opened by | Content | Commit button |
|---|---|---|---|
| **Rating dispute — `<tripId>`** | `openRatingDispute(tripId)` L15522–L15534 | Grey info box: `<captain> is contesting the <X.X>★ given by <rider>` + "If overturned, the score is removed from the captain's average and the average is recomputed — not just hidden." Field: `fc-detail` textarea. | `Open dispute` → `commitRatingDispute(tripId)` |
| **Captain reports rider — `<tripId>`** | `openReportRider(tripId)` L15543–L15558 | Copy: "Until now reports only ran one way; a captain had nowhere to raise a no-show, damage or conduct issue." Fields: `fc-kind` custom select (3 options), `fc-detail` textarea. | `Submit report` → `commitReportRider(tripId)` |
| **Suspension appeal — `<name>`** | `openDriverAppeal(driverId)` L15568–L15581 | If suspended: red box `Suspended by <by> on <at>` / `Reason served: <reason>`. If not suspended: grey box "This captain is not currently suspended — an appeal can still be filed against a deduction or a flag." Field: `fc-detail` textarea. | `File appeal` → `commitDriverAppeal(driverId)` |
| **Confirmation gate** (generic `confirmAction` dialog) | `guardAction` wrapper on `decideFairness`, `commitRatingDispute`, `commitReportRider`, `commitDriverAppeal` | See §8 | per-spec `confirmLabel` |

All three module modals end with `document.getElementById('modal-overlay').classList.add('open')` (L15534, L15558, L15581).

> All three reuse the same textarea id `fc-detail` (L15532, L15555, L15579). Only one modal is open at a time, so it works — but it is a shared-id pattern worth flagging.

---

## 11. States, severities & badges

| State | Condition | Visual | SLA |
|---|---|---|---|
| **Open** | `c.status==='Open'` | age text `<fmtAge> open` in `var(--ghost)` (L15655) | `rcTargets(code).res` minutes |
| **Open, past SLA** | `c.status==='Open' && nowMs()-c.openedAtMs > tg.res*60000` | `⚠ past <res/60>h SLA`, `var(--red)`, `font-weight:700` (L15654) | breach |
| **Upheld** | `c.status==='Upheld'` | `<span class="b b-grey">Upheld</span>` (L15656) | clock stops |
| **Overturned** | `c.status==='Overturned'` | `<span class="b b-green">Overturned</span>` (L15656) | clock stops |
| **Average recomputed** | `c.kind==='Rating dispute' && c.status==='Overturned' && c.averageAdjusted===true` | meta suffix `· average recomputed` (L15666) | — |
| **Average not recomputable** | as above but `c.averageAdjusted===false` | meta suffix `· score voided; historical average not recomputable` (L15666) | — |
| **Appeal open** (suspended list) | an Open `Suspension appeal` exists for that driver | `<span class="b b-amber">Appeal open</span>` (L15687) | — |
| **Open-cases card badge** | always rendered | `<span class="b b-amber">{open.length}</span>` (L15676) | — |
| **Economics tier badge** | `d.lvl` | `b-gold` / `b-silver` / `b-grey` (L16305) | — |
| **Under-earner** | `r.perHour < avg*0.7` | per-hour cell `var(--red)`; otherwise `var(--green)` (L16307) | — |

---

## 12. Sidebar counter formula — `#sbb-fairness`

Markup: `<span class="sb-badge a" id="sbb-fairness">0</span>` (L514).

Computed **only** inside `updateContactsBadge()` (L14959–L14979), block at L14974–L14978:

```js
var fb=document.getElementById('sbb-fairness');
if(fb){
  var openFc=(DB.fairnessCases||[]).filter(function(c){return c.status==='Open';}).length;
  fb.textContent=openFc; fb.className='sb-badge '+(openFc?'a':'n');
}
```

- **Value:** count of `DB.fairnessCases` with `status==='Open'`.
- **Class:** `sb-badge a` (active) when `>0`, `sb-badge n` (neutral) when `0`.
- **Refresh triggers:** any call to `updateContactsBadge()`, including the explicit call at the end of `seedFairness()` (L15825) which exists to fix the boot-order race described at L15819–L15824.
- `renderFairnessPage()` does **not** touch this badge (unlike coverage / compliance / safety, which set theirs inline).

---

## 13. Cross-module links

**Out of this page:**
- `openProfile(<driverId>)` → 360° profile (L15683, L16304).
- `workChip('fairness',c.id)` → case + ownership modules (L15668; def L19030).
- `recalcDriverTiers(true)` → driver-tier module, on an overturned rating (L15613).
- `renderDriversTable()` → Drivers page refresh on reinstatement (L15626).
- `logContact(...)` → Contact drivers & SLA module (L15516).
- `logAction(...)` → Activity log (`#p-audit-log`).
- `pushOpsNotification(...)` → notification stack; its action navigates back to `fairness` (L15518).

**Into this page:**
- Trips module: `⚖️ Captain disputes this rating` button (L15287) → `openRatingDispute`.
- Plan commitment row menu `kind==='driver'`: `⚖️ Captain fairness` → `go('fairness',null)`, and `📄 File suspension appeal` → `openDriverAppeal(id)` (L16887–L16889).
- Work Inbox: every Open fairness case is emitted as an inbox item with deadline `(c.openedAtMs + tg.res*60000) - nowMs()` and action `go('fairness',null)` labelled `Decide` (L19138–L19145).
- Rider profile: `riderNoShowCount(riderId)` counts `DB.fairnessCases` with `subjectId===riderId && reasonCode==='DRV_RIDER_NOSHOW'` in the rolling window (L19525–L19533) — captain-filed reports feed the **rider** no-show counter shown on rider profiles (L4107).
- `refreshOwnershipSurfaces()` re-renders the page when ownership changes (L19053).

---

## 14. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `DB.fairnessCases=[]` — empty at load | L15505 | All content comes from `seedFairness()` or live user actions |
| Seeded dispute text *"Rider was 12 minutes late to the pickup point; captain waited and was rated down for the delay."* | L15815 | **Demo string** |
| Seeded case aged to `agoMs(90)` — 90 minutes old | L15817 | **Demo timing** |
| `SEED_EPOCH=Date.now()` (basis for `agoMs`) | L14628–L14629 | Demo clock |
| Fallback detail strings `'No reason given'` / `'No detail given'` / `'No statement given'` | L15537, L15562, L15583 | Hardcoded |
| Under-earner factor `0.7` | L16307 | **Hardcoded magic number** — not configurable in Settings |
| Rating clamp `Math.max(1,Math.min(5,newAvg))` | L15610 | Hardcoded 1–5 star scale |
| Id format `'FC-'+…padStart(4,'0')` | L15509 | Hardcoded |
| Toast strings and emoji (`⚖️`, `✅`) | L15541, L15566, L15587, L15634 | Hardcoded, English only |
| `DB.drivers` fixture — 5 captains `DRV-0101`–`DRV-0105` | L2632 ff. | Demo fleet; `captainEconomics()` iterates exactly these |
| `DB.reasonCodes` registry | L14663–L14727 | Static array; editable at runtime via Settings › reason codes, not persisted |
| `DB.slaPolicy` tiers | L14650–L14660 | Static defaults |

---

## 15. i18n keys

| Key | English (L514) | Arabic (L7911) |
|---|---|---|
| `nav.fairness` | `Captain fairness` | `إنصاف الكباتن` |

**No other `data-i18n` attributes exist on this page.** The `<h1>⚖️ Captain fairness</h1>`, the sub-header paragraph (L1404), the card headings (`⚖️ Open cases`, `🚫 Suspended captains — appeal route`, `📁 Decided`, `💵 Captain economics — earnings per engaged hour`), every KPI label, every column header, every button label, every toast and every empty state are **hardcoded English** in JS string concatenation.

Reason-code labels are bilingual in the registry (`labelEn` + `labelAr`, L14705–L14711) but `rcLabel()` (L14743) returns **`labelEn` only** — the Arabic label never appears on this page.

---

## 16. Gaps, dead code, UNVERIFIED items

1. **No page-level permission entry.** `PAGE_PERMISSIONS` (L10564 ff.) has no `fairness` key, so `requirePagePerm('fairness',…)` is never used. Only `decideFairness` is gated, by the *global* `approve_drivers` permission (L15592). Filing cases (`commitRatingDispute`, `commitReportRider`, `commitDriverAppeal`) has **no permission check at all**.
2. **KPIs are inert.** All four tiles use `class="kpi"` without `.click` and without `onclick` (L15669–L15674) — unlike every other page in this module group, where KPIs filter. No filter, search or sort exists anywhere on the page.
3. **`c.rationale` is initialised to `null` (L15513) and never written.** No rationale is captured in `decideFairness` and none is displayed, despite the appeal-legitimacy argument made in the emergency-claim gate copy (L17958).
4. **An upheld case has zero downstream effect** beyond the status string — no strike, no note on the driver record, no captain notification (the "captain is notified" consequence at L17961 is copy only; no code sends it).
5. **Overturning a `Rider report` has no code path.** The branches at L15597 and L15622 cover only `Rating dispute` and `Suspension appeal`; a rider report is silently just marked `Overturned`.
6. **`c.disputedRating` (L15539) is stored but never rendered.**
7. **`c.date` (`fmtReqNowLabel()`, L15512) is stored but never rendered** on this page.
8. **Shared modal input id `fc-detail`** across three different modals (L15532, L15555, L15579).
9. **`sameCaptainStats()` (L15697) and `onTimeStats()` (L15703)** are defined inside this module's block but never called by either renderer here. **UNVERIFIED** whether another page consumes them — outside this module's scope.
10. **Sidebar badge is not refreshed by the page renderer.** `renderFairnessPage()` never touches `#sbb-fairness`; it only updates when `updateContactsBadge()` runs (L14974), so deciding a case from the page leaves the badge stale until the next such call. **UNVERIFIED**: the tick cadence that calls `updateContactsBadge()` is outside this module.
11. **Fleet-average is a mean-of-rates, not a weighted rate** (L16294) — a captain with one 5-minute trip weighs the same as one with 400 trips. Not flagged in the UI copy.
12. **`captainEconomics()` includes tips in `earn`** (L16284) but the caveat text (L16296) does not mention tips.
13. **No de-duplication of cases.** A captain can file unlimited rating disputes on the same `tripId`. Only suspension appeals are de-duplicated, and only in the UI (the `already` check at L15681 hides the button; `commitDriverAppeal` itself has no guard).
14. **UNVERIFIED — `ownershipWarning('fairness',caseId)`** (L17953): return shape and rendering live in the ownership module (outside this module group).
15. **UNVERIFIED — `caseChip` / `ownerChip` behaviour** (L18997 / L18928): referenced via `workChip` (L19030); their click handlers belong to the case/ownership module.

---

## 17. Line-number index

| Item | Lines |
|---|---|
| Sidebar nav item + `#sbb-fairness` | L514 |
| Page HTML `#p-fairness` | L1402–L1408 |
| `titles.fairness` / `subs.fairness` | L2168 / L2169 |
| `DB.drivers` fixture | L2632 ff. |
| `requirePerm()` | L3126–L3132 |
| `logAction()` | L3133–L3152 |
| `nm2()` | L3565 |
| Rider profile no-show card hook | L4107 |
| `go()` routing hook | L8821 |
| `PAGE_PERMISSIONS` (no `fairness` key) | L10564 ff. |
| `nowMs()` / `agoMs()` / `fmtAge()` | L14627 / L14629 / L14630–L14636 |
| `DB.slaPolicy` tiers | L14650–L14660 |
| `DB.reasonCodes` (driver codes) | L14705–L14711 |
| `rcTargets()` / `rcLabel()` | L14730–L14742 / L14743 |
| `updateContactsBadge()` (fairness badge block) | L14959–L14979 (L14974–L14978) |
| `lowRatingThreshold()` / `isLowRating()` / `lowRatedTripIds()` | L15243 / L15247 / L15342 |
| Trips-page entry button `⚖️ Captain disputes this rating` | L15287 |
| Module header comment | L15497–L15504 |
| `DB.fairnessCases` | L15505 |
| `fcNew()` | L15507–L15521 |
| `openRatingDispute()` | L15522–L15534 |
| `commitRatingDispute()` | L15535–L15542 |
| `openReportRider()` | L15543–L15558 |
| `commitReportRider()` | L15559–L15567 |
| `openDriverAppeal()` | L15568–L15581 |
| `commitDriverAppeal()` | L15582–L15588 |
| `decideFairness()` | L15591–L15635 |
| `renderFairnessPage()` | L15636–L15696 |
| — `row(c)` helper | L15645–L15668 |
| — KPI strip | L15669–L15674 |
| — Open cases card | L15675–L15677 |
| — Suspended captains card | L15678–L15688 |
| — Decided card | L15689–L15691 |
| `sameCaptainStats()` / `onTimeStats()` (defined, unused here) | L15697–L15702 / L15703–L15709 |
| `seedFairness()` | L15809–L15827 |
| Captain economics header comment | L16274–L16279 |
| `captainEconomics()` | L16280–L16290 |
| `renderCaptainEconomics()` | L16291–L16310 |
| `commitMenu` `kind==='driver'` (links into fairness) | L16885–L16890 |
| `guardAction()` | L17819–L17840 |
| Gate: `decideFairness` | L17950–L17968 |
| `ownerChip()` / `caseChip()` / `workChip()` | L18928 / L18997 / L19030 |
| `GATE_SPECS.commitRatingDispute` / `commitReportRider` / `commitDriverAppeal` | L18337–L18341 / L18342–L18346 / L18347–L18350 |
| `refreshOwnershipSurfaces()` fairness branch | L19053 |
| Work Inbox fairness items | L19138–L19145 |
| `riderNoShowCount()` (consumes fairness cases) | L19525–L19533 |
| Boot step `'fairness cases'` | L21813 |
