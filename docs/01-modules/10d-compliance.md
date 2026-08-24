# Module: compliance (Fleet Compliance)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `compliance` — DOM node `<div class="page" id="p-compliance">`
> **HTML markup:** `L1235`–`L1251`
> **Sidebar entry:** `L517`
> **JS module block:** `L13271`–`L13381` (header comment `L13271`–`L13276`)
> **Shared document-capture block:** `L10985`–`L11079`
> **Every claim below is line-cited. Items that could not be confirmed from the file are marked `UNVERIFIED`.**

---

## 1. Purpose

Track expiry dates of five per-driver regulatory documents, alert at 30 / 7 days, and **automatically suspend** a driver from dispatch the moment any one of them expires; plus display the (unimplemented) status of three Saudi regulatory integrations.

Stated rationale in the source header comment (`L13271`–`L13276`):
> "KYC at onboarding isn't enough: licenses, registrations, periodic inspections, insurance, and operating cards all EXPIRE. An expired document = direct legal liability in any accident. Alerts at 30/7 days; auto-suspend at 0."

---

## 2. Entry points & routing

| # | Entry point | Line | Effect |
|---|---|---|---|
| 1 | Sidebar item `onclick="go('compliance',this)"` | `L517` | Routes to page; marks sidebar item active |
| 2 | Router dispatch `if(id==='compliance'){renderCompliancePage();}` | `L8797` | Only place the page is rendered on navigation |
| 3 | Safety KPI 4 `onclick="go('compliance',null)"` | `L13404` | Cross-module: "Precautionary suspensions" tile |
| 4 | Predictive page row action `<button …onclick="go('compliance',null)">Review documents</button>` | `L14320` | Cross-module: driver availability-risk table |
| 5 | Auto-suspension notification click handler `function(){go('compliance',null);}` | `L13309` | Bell-notification action |
| 6 | Precautionary-suspend toast click handler `function(){go('compliance',null);}` | `L13473` | Toast from Safety module |
| 7 | `filterCompliance(f)` (KPI tiles) | `L13319` | Re-renders in place + `kpiScrollTo('compliance-list')` |
| 8 | Demo-clock tick, every 60 ticks | `L12611`–`L12619` | Calls `complianceScan()` always; calls `renderCompliancePage()` **only if `#p-compliance` has class `on`** |
| 9 | `saveDriverDocDates()` | `L11075`–`L11076` | Calls `complianceScan()` then `renderCompliancePage()` |

Top-bar title/subtitle come from static maps, not from the page:
- `titles.compliance = 'Fleet Compliance'` (`L2168`)
- `subs.compliance = 'Documents, expiries, and regulatory sync'` (`L2169`)

**No boot-time render.** `renderCompliancePage()` appears only at `L8797`, `L11076`, `L13319`, `L13378` (`grep` of `renderCompliancePage()`), none of which run at page load.

---

## 3. Layout map

```
#p-compliance                                            L1236
├─ .ph  (page header)                                    L1237
│   └─ .ph-l  h1 "📑 Fleet compliance"                   L1238  (static)
│       p#compliance-sub "Document expiries, auto-
│         suspension, and regulatory sync status"        L1238  (static, NEVER updated — §14)
├─ .g4 #compliance-kpis          → 4 KPI tiles           L1240  (filled L13325–L13330)
├─ .card                                                 L1241
│   ├─ .ch  h2 "Driver & vehicle documents"              L1242  (static)
│   │       span "Auto-suspend on expiry · alerts at
│   │             30 and 7 days"                         L1242  (static)
│   └─ #compliance-list  (max-height:420px; scroll-y)    L1243  (filled L13332–L13355)
│         └─ table.dt#compliance-table                   L13341
└─ .card (margin-top:14px)                               L1245
    ├─ .ch  h2 "Regulatory integrations"                 L1246  (static)
    └─ #regulatory-list (padding:12px; max-h:280px)      L1247  (filled L13356–L13366)
```

There is **no page-header button row** (`.br`) on this page — contrast the Growth page at `L1268`.

---

## 4. Rules & policy logic — written out exactly

### 4.1 The "now" reference

```js
var REQ_NOW_REF = new Date(2026,5,25,9,14,0);          // L9555  → 25 Jun 2026, 09:14 local
```
`REQ_NOW_REF` is a **mutable demo clock**. It is advanced inside `processSubReqSearchWindow()`:
```js
REQ_NOW_REF = new Date(REQ_NOW_REF.getTime() + SUBREQ_TIME_ACCEL_MIN_PER_TICK*60000);  // L9680
var SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1;                // L9579
```
`processSubReqSearchWindow()` is called from `tickEngine()` at `L12574`, and `setInterval(tickEngine,1000)` at `L11968`. **Net effect: the compliance clock advances 1 simulated minute per 1 real second (60× real time).**

### 4.2 Days-remaining rule

```js
function docDaysLeft(dateStr){                          // L13286–L13289
  var d = new Date(dateStr+'T00:00:00');
  return Math.floor((d - REQ_NOW_REF)/86400000);
}
```
Exact rule: **floor of ((midnight at the start of the expiry date) − (current demo clock)) in whole days.** Because `REQ_NOW_REF` carries a time-of-day (09:14), the result is one lower than a naive calendar difference. Worked example: expiry `2026-07-19`, now `2026-06-25 09:14` → 24 calendar days − 0.385 = 23.6 → **23**.

### 4.3 Severity / urgency banding formula (the only banding formula on the page)

```js
function docState(days){                                // L13290–L13295
  if(days <   0) return {label:'EXPIRED',      cls:'b-red',   rank:0};
  if(days <=  7) return {label:days+'d left',  cls:'b-red',   rank:1};
  if(days <= 30) return {label:days+'d left',  cls:'b-amber', rank:2};
  return              {label:days+'d',         cls:'b-green', rank:3};
}
```
Exact bands: `days < 0` → EXPIRED · `0 ≤ days ≤ 7` → red urgent · `8 ≤ days ≤ 30` → amber · `days > 30` → green. **Lower `rank` = more urgent.**

### 4.4 Per-driver rollup rule

`complianceScan()` (`L13296`–`L13317`):
```js
Object.keys(DB.driverDocs).forEach(function(d){
  var worst=3, expired=[];
  DOC_TYPES.forEach(function(dt){
    var exp = DB.driverDocs[d][dt[0]]; if(!exp) return;      // L13301 — missing date SKIPPED
    var st = docState(docDaysLeft(exp));
    if(st.rank < worst) worst = st.rank;                     // L13303
    if(st.rank === 0) expired.push(dt[1]);                   // L13304
  });
  …
  rows.push({driver:d, worst:worst, expired:expired});       // L13314
});
```
**Rule: a driver's band is the MINIMUM rank across all five documents** (i.e. the worst single document decides the whole driver). Bands are therefore **mutually exclusive per driver**, not per document — a driver with one expired and one 3-day document is counted once, under "Expired".
**A missing/blank expiry value is silently skipped and does not affect `worst`** (`L13301`) — a driver with no dates at all lands in `worst=3` (green) and is never flagged.

### 4.5 Auto-suspension rule (the module's core policy action)

```js
if(expired.length && !DB.complianceSuspensions[d]){                       // L13306
  DB.complianceSuspensions[d] = 'Expired: '+expired.join(', ');           // L13307
  logAction('auto_suspend','driver',d,
     nm2(d)+' auto-suspended — expired document(s): '+expired.join(', '),
     {status:'active'},{status:'suspended'});                             // L13308
  pushOpsNotification('alert','Auto-suspended — '+nm2(d),
     'Expired: '+expired.join(', ')+'. Driver removed from dispatch until renewed.',
     function(){go('compliance',null);});                                 // L13309
}
```
Exact rule: **the first scan in which any document of a driver has `rank === 0` and the driver is not already suspended, writes a suspension record keyed by driver id whose value is the string `"Expired: <doc label>[, <doc label>…]"`, writes an audit entry `auto_suspend`, and pushes a persistent bell notification of type `alert`.**
Guard `!DB.complianceSuspensions[d]` means: **if the driver is already suspended for ANY reason (including a Safety precautionary suspension), the automatic expiry suspension is not written and the reason string is not upgraded.**

### 4.6 Automatic un-suspension (renewal handling) rule

```js
if(!expired.length && DB.complianceSuspensions[d]
   && DB.complianceSuspensions[d].indexOf('Expired')===0){               // L13311
  delete DB.complianceSuspensions[d];   /* docs renewed — lift the automatic hold */
}
```
Exact rule: **when a driver has zero expired documents AND holds a suspension whose reason string starts with the literal `"Expired"`, the suspension is deleted.** Suspensions from Safety (`'Precautionary — pending INC-xxx investigation'`, `L13468`) do **not** match the prefix and are therefore never auto-lifted here. The un-suspension is **silent** — no `logAction`, no `pushOpsNotification`, no toast (contrast the suspend branch).

### 4.7 Document types (complete list, exactly as defined)

`var DOC_TYPES = [...]` — `L13277`:

| # | Key | Full label (`dt[1]`) | Column header shown (`dt[1].split(' (')[0]`, `L13341`) |
|---|---|---|---|
| 1 | `license` | Driving license | Driving license |
| 2 | `vehicle_reg` | Vehicle registration (Istimara) | Vehicle registration |
| 3 | `inspection` | Periodic inspection (Fahs) | Periodic inspection |
| 4 | `insurance` | Insurance | Insurance |
| 5 | `operating_card` | Transport authority operating card | Transport authority operating card |

Each type has exactly the four states of §4.3 (EXPIRED / ≤7d / ≤30d / >30d). There is **no per-document-type override**: the 0/7/30 windows are global constants inside `docState`, not configurable, not in `DB.opsConfig`. There is no separate "renewal window" concept — renewal is simply *writing a later date*.

### 4.8 Renewal handling — the two paths

**Path A (live, wired): `openDocDateEditor` → `saveDriverDocDates`** (`L11050`–`L11079`) — ops types the real dates read off each document. Detailed in §8 / §10.

**Path B (dead code): `markDocRenewed(drvId)`** (`L13370`–`L13381`):
```js
function markDocRenewed(drvId){
  if(!requirePerm('approve_drivers'))return;                       // L13371
  var docs=DB.driverDocs[drvId];if(!docs)return;                   // L13372
  var worstKey=null,worstDays=99999;
  DOC_TYPES.forEach(function(dt){var dl=docDaysLeft(docs[dt[0]]);
     if(dl<worstDays){worstDays=dl;worstKey=dt[0];}});             // L13374
  if(!worstKey)return;
  var nd=new Date(REQ_NOW_REF.getTime());nd.setFullYear(nd.getFullYear()+1);
  docs[worstKey]=nd.toISOString().slice(0,10);                     // L13376
  renderCompliancePage();                                          // L13377–L13378
  logAction('doc_renewed','driver',drvId,'Marked '+worstKey+' renewed for '+nm2(drvId)
            +' — new expiry '+docs[worstKey],{},{doc:worstKey,expiry:docs[worstKey]});
  toast('✅ '+nm2(drvId)+' — '+worstKey.replace('_',' ')+' renewed to '+docs[worstKey],'ok');
}
```
Rule: picks the single document with the fewest days left and pushes its expiry exactly **one year from the current demo clock**. **No call site exists anywhere in the file** (`grep markDocRenewed` → only `L13370`). It is superseded by `openDocDateEditor`; the superseding is documented at `L10989`–`L10991` ("auto-guessed a year out (Compliance's old 'mark renewed')") and `L11048`–`L11049` ("replacing the old 'guess a year out' shortcut"). **DEAD CODE — see §16.**

### 4.9 Coverage rule for newly-approved drivers

`approveDriver()` (`L11101`–`L11113`) guarantees every newly-approved driver enters `DB.driverDocs`:
```js
if(typeof DB.driverDocs!=='object')DB.driverDocs={};                       // L11108
var oneYearOut=new Date(REQ_NOW_REF?REQ_NOW_REF.getTime():Date.now());
oneYearOut.setFullYear(oneYearOut.getFullYear()+1);                        // L11109
var defaultExpiry=oneYearOut.toISOString().slice(0,10);                    // L11110
var enteredExpiry=a.docExpiry||{};                                         // L11111
DB.driverDocs[newId]={};                                                   // L11112
DOC_TYPES.forEach(function(dt){DB.driverDocs[newId][dt[0]]=enteredExpiry[dt[0]]||defaultExpiry;}); // L11113
```
Exact rule: **use the real date entered on the application where present; otherwise default that one document type to exactly one year from the demo clock.** Rationale comment `L11101`–`L11107`. A pre-approval warning banner counts the blanks (`L7180`–`L7182`).

### 4.9b Approval-time warning rule (upstream, feeds this page)

```js
var missingDates=DOC_TYPES.filter(function(dt){return !expiryVals[dt[0]];});      // L7180
if(missingDates.length){ warnBox += '…📅 Document expiry dates not entered yet ('
   +missingDates.length+' missing) — approving now will default them to 1 year out.
   Enter real dates below for accurate Compliance tracking.' }                    // L7181–L7182
```
Amber banner in the Confirm-approval modal. Advisory only — **does not block approval**.

### 4.10 Regulatory integrations — the honesty rule

`L13356`–`L13366`: three hardcoded rows, every one rendered with the **same fixed** `<span class="b b-amber">⚠ Not connected</span>` badge (`L13363`). No state, no data source, no toggle, no action. Disclaimer footer (`L13367`): *"These integrations require a real backend and formal registration with each authority — the statuses above are honest placeholders, not simulations. Regulatory requirements change; confirm current obligations with a local compliance advisor before launch."*

---

## 5. KPIs & metrics

All four tiles are rendered into `#compliance-kpis` at `L13325`–`L13330`. All four are `class="kpi click"` and all four are filters.

| # | Label | Source | Exact formula | Sub-label (`.kpi-dl`) | Colour | Bar width formula | Thresholds |
|---|---|---|---|---|---|---|---|
| 1 | **Drivers tracked** `L13327` | `complianceScan()` → `DB.driverDocs` | `scan.length` = `Object.keys(DB.driverDocs).length` | `DOC_TYPES.length + ' documents each'` → **"5 documents each"** | default | **`100%` — hardcoded**, class `kf-b` | none |
| 2 | **Expired — suspended** `L13328` | `complianceScan()` | `scan.filter(r => r.worst===0).length` | `off dispatch` (class `dn`) | `var(--red)` | `Math.min(100, expired*20)%`, class `kf-a` | band `days<0` |
| 3 | **Expiring ≤ 7 days** `L13329` | `complianceScan()` | `scan.filter(r => r.worst===1).length` | `urgent renewals` (class `dn`) | `var(--red)` | `Math.min(100, week*20)%`, class `kf-a` | band `0 ≤ days ≤ 7` |
| 4 | **Expiring ≤ 30 days** `L13330` | `complianceScan()` | `scan.filter(r => r.worst===2).length` | `plan renewals` (class `neu`) | `var(--amber)` | `Math.min(100, month*20)%`, class `kf-a` | band `8 ≤ days ≤ 30` |

Notes:
- The bar percentages 2–4 use an arbitrary `×20` scale (5 drivers = full bar). **Hardcoded magic number** — §14.
- KPI 4's sub-label "plan renewals" is **wrong wording** for a document-expiry tile (plans are a Pricing concept) — cosmetic defect, `L13330`.
- Tiles 2/3/4 are mutually exclusive and do **not** sum to tile 1: drivers with `worst===3` (all documents > 30 days) are in tile 1 only.

### Computed values at seed state (demo clock = 25 Jun 2026 09:14, `L9555`)

Derived from `DB.driverDocs` (`L13278`–`L13284`) through `docDaysLeft`/`docState`:

| Driver | license | vehicle_reg | inspection | insurance | operating_card | `worst` | band |
|---|---|---|---|---|---|---|---|
| DRV-0101 | 2027-03-12 (~259d) | 2026-07-19 (**23d**) | 2026-08-02 (37d) | 2026-11-30 | 2027-01-15 | **2** | ≤30 |
| DRV-0102 | 2026-07-14 (**18d**) | 2026-12-01 | 2026-09-10 | 2026-07-05 (**9d**) | 2026-10-22 | **2** | ≤30 |
| DRV-0103 | 2028-01-20 | 2026-08-15 (50d) | 2026-07-25 (**29d**) | 2027-02-28 | 2026-12-05 | **2** | ≤30 |
| DRV-0104 | 2026-09-30 | 2027-04-11 | **2026-06-20 (−6d → EXPIRED)** | 2026-08-09 | 2027-03-01 | **0** | EXPIRED → auto-suspended |
| DRV-0105 | 2027-06-18 | 2026-07-08 (**12d**) | 2026-10-14 | 2026-09-22 | 2026-11-11 | **2** | ≤30 |

→ At first render: **Drivers tracked = 5, Expired = 1, ≤7 days = 0, ≤30 days = 4.** Sidebar badge = 1 (see §12). DRV-0104 is auto-suspended with reason `"Expired: Periodic inspection (Fahs)"` on the very first `complianceScan()`.

---

## 6. Data displayed

| Element | Line | DB path / origin | Type | Notes |
|---|---|---|---|---|
| `h1` "📑 Fleet compliance" | `L1238` | hardcoded HTML | string | static |
| `p#compliance-sub` | `L1238` | hardcoded HTML | string | **never updated by any JS** — `liveSubtitles()` (`L21236`–`L21255`) covers drivers/riders/subscriptions/plans/quickrides only |
| Top-bar title | `L2168` | `titles.compliance` | string | `'Fleet Compliance'` |
| Top-bar subtitle | `L2169` | `subs.compliance` | string | `'Documents, expiries, and regulatory sync'` |
| Card sub-caption "Auto-suspend on expiry · alerts at 30 and 7 days" | `L1242` | hardcoded HTML | string | matches `docState` thresholds |
| KPI 1 value | `L13327` | computed `scan.length` ← `DB.driverDocs` | int | |
| KPI 1 sub-label "5 documents each" | `L13327` | computed `DOC_TYPES.length` | int | |
| KPI 2/3/4 values | `L13328`–`L13330` | computed from `complianceScan()` | int | |
| Table column headers | `L13341` | computed from `DOC_TYPES` | string | `dt[1].split(' (')[0]` strips the Arabic transliteration in parentheses |
| Driver name cell | `L13350` | `nm2(r.driver)` → `DB.drivers[id].name` (`L3565`) | string | falls back to the raw id if the driver is absent from `DB.drivers` |
| Document badge label | `L13345`–`L13346` | computed `docState(docDaysLeft(DB.driverDocs[driver][key]))` | string | `EXPIRED` / `Nd left` / `Nd` |
| Document badge `title` | `L13346` | `'Expires '+exp` ← `DB.driverDocs[driver][key]` | string | raw ISO date on hover |
| Dispatch cell | `L13351` | `DB.complianceSuspensions[driverId]` | string\|undefined | `⛔ Suspended` (with reason as `title`) or `Active` |
| Row background tint | `L13349` | `DB.complianceSuspensions[driverId]` truthy | CSS | `background:var(--red-lt)` |
| Regulatory row 1 name/desc | `L13358` | **hardcoded** | string | Wasl (Transport General Authority) / "Trip + driver reporting required for ride platforms" |
| Regulatory row 2 | `L13359` | **hardcoded** | string | ZATCA e-invoicing (Phase 2) / "B2C simplified invoice per payment, cleared with ZATCA" |
| Regulatory row 3 | `L13360` | **hardcoded** | string | Absher / Yakeen identity verification / "Driver identity checks at onboarding" |
| Regulatory status badge (×3) | `L13363` | **hardcoded** | string | always `⚠ Not connected` |
| Regulatory disclaimer footer | `L13367` | **hardcoded** | string | see §4.10 |

---

## 7. Input fields / filters

**On the page itself there are no `<input>`, `<select>`, or search boxes.** Filtering is entirely via the four clickable KPI tiles.

| id / control | Type | Label | Default | All options | Drives |
|---|---|---|---|---|---|
| `_complianceFilter` (module-scope var, `L13318`) | string state | — | `'all'` | `'all'` · `'expired'` · `'week'` · `'month'` | Row predicate `L13334`–`L13339` |
| KPI tile 1 `onclick="filterCompliance('all')"` `L13327` | button-like div | Drivers tracked | — | — | `_complianceFilter='all'` → all rows |
| KPI tile 2 `onclick="filterCompliance('expired')"` `L13328` | button-like div | Expired — suspended (`title="Show only suspended drivers"`) | — | — | `r.worst===0` |
| KPI tile 3 `onclick="filterCompliance('week')"` `L13329` | button-like div | Expiring ≤ 7 days (`title="Show drivers expiring within 7 days"`) | — | — | `r.worst===1` |
| KPI tile 4 `onclick="filterCompliance('month')"` `L13330` | button-like div | Expiring ≤ 30 days (`title="Show drivers expiring within 30 days"`) | — | — | `r.worst===2` |

`filterCompliance(f)` (`L13319`) = set state → `renderCompliancePage()` → `kpiScrollTo('compliance-list')` (smooth-scroll + 1500 ms flash highlight, `L14536`–`L14544`).
Filter state is **not persisted** and **not reset** on navigation — leaving and returning to the page keeps the last filter, because `go()` calls `renderCompliancePage()` without touching `_complianceFilter` (`L8797`).

**Modal inputs** (`openDocDateEditor`, `L11055`–`L11059`) — 5 fields, all `<input type="date">`:

| id | Type | Label | Default value | Options | Drives |
|---|---|---|---|---|---|
| `dde-license` | date | Driving license | `DB.driverDocs[driverId].license \|\| ''` | free date | `saveDriverDocDates` |
| `dde-vehicle_reg` | date | Vehicle registration (Istimara) | `…vehicle_reg \|\| ''` | free date | ″ |
| `dde-inspection` | date | Periodic inspection (Fahs) | `…inspection \|\| ''` | free date | ″ |
| `dde-insurance` | date | Insurance | `…insurance \|\| ''` | free date | ″ |
| `dde-operating_card` | date | Transport authority operating card | `…operating_card \|\| ''` | free date | ″ |

Layout: `display:grid;grid-template-columns:1fr 1fr;gap:10px` (`L11055`). No min/max, no validation, no "required".

---

## 8. Actions

| # | Label | Location | Handler | Real effect | Writes to | Permission gate | Audit | Confirm? |
|---|---|---|---|---|---|---|---|---|
| 1 | Driver name (blue, `cursor:pointer`) | table col 1, `L13350` | `openProfile(driverId)` | Navigates to 360° profile | none | none | none | no |
| 2 | **📅 Edit dates** | row action, `L13352` | `openDocDateEditor(driverId)` | Opens modal (§10) | none until save | **two gates**: `requirePerm('approve_drivers')` `L11051` **and** `requirePagePerm('compliance','edit_dates')` `L11052` | denial only (see below) | no |
| 3 | **Save dates** (modal footer) | `L11062` | `saveDriverDocDates(driverId)` | See below | `DB.driverDocs[driverId]`, `DB.complianceSuspensions` (indirectly), `DB.auditLog` | `requirePerm('approve_drivers')` `L11065` — **note: `requirePagePerm` is NOT re-checked here** | `logAction('update_doc_dates','driver',…)` `L11077` | no |
| 4 | **Cancel** (modal footer) | `L11062` | `closeModal()` (`L5216`) | Closes modal, discards edits | none | none | none | no |
| 5 | **✕** (modal close) | `L11054` | `closeModal()` | same as Cancel | none | none | none | no |
| 6 | KPI tiles 1–4 | `L13327`–`L13330` | `filterCompliance(...)` | Filter + scroll-flash | `_complianceFilter` (in-memory) | none | none | no |
| — | *(no call site)* `markDocRenewed(drvId)` | `L13370` | — | §4.8 | `DB.driverDocs`, `DB.auditLog` | `requirePerm('approve_drivers')` `L13371` | `logAction('doc_renewed',…)` `L13379` | no |
| — | *(implicit)* auto-suspend | `L13306`–`L13310` | `complianceScan()` | §4.5 | `DB.complianceSuspensions`, `DB.auditLog`, `DB.notifications` | **none — bypasses all permission checks** | `logAction('auto_suspend','driver',…)` `L13308` | no |
| — | *(implicit)* auto-unsuspend | `L13311`–`L13313` | `complianceScan()` | §4.6 | `DB.complianceSuspensions` | none | **none — silent** | no |

**`saveDriverDocDates(driverId)` full effect** (`L11065`–`L11079`):
1. `requirePerm('approve_drivers')` — on failure: toast `🔒 Your role lacks permission: …` + `logAction('permission_denied',…)` (`L3126`–`L3132`), abort.
2. `DB.driverDocs[driverId] = DB.driverDocs[driverId] || {}` (`L11066`) — creates the record if absent.
3. For each of the 5 `DOC_TYPES`: read `#dde-<key>`; if non-empty **and different**, push `"<Label>: <old|—> → <new>"` onto `changed[]`; if non-empty, write `docs[key]=v` (`L11068`–`L11072`). **A cleared/blank field is ignored — the old value is retained. There is no way to un-set a date from this UI.**
4. `closeModal()` (`L11073`).
5. `complianceScan()` (`L11075`) — re-evaluates suspension/un-suspension immediately with the corrected dates.
6. `renderCompliancePage()` (`L11076`).
7. `logAction('update_doc_dates','driver',driverId, 'Updated document expiry dates for '+nm2(driverId) + (changed.length ? ': '+changed.join('; ') : ' (no changes)'), {}, {})` (`L11077`) — **`before`/`after` are both empty objects; the diff lives only in the human-readable summary.**
8. `toast('✅ Document dates updated for '+nm2(driverId),'ok')` (`L11078`).

**Permission model** (`L10604`–`L10607`):
```js
compliance:{label:'Fleet Compliance',icon:'📑',legacy:'approve_drivers',perms:[
  {key:'view',        label:'View compliance'},
  {key:'edit_dates',  label:'Edit document expiry dates'}
]},
```
`defaultPagePerms()` (`L10658`–`L10667`): every role always gets at least `view`; `edit_dates` is granted by default only to roles that already hold the legacy broad permission `approve_drivers`. `requirePagePerm` (`L10680`–`L10688`) on denial: `toast('🔒 Your role lacks permission: Fleet Compliance — Edit document expiry dates','err')` + `logAction('permission_denied','permission','compliance.edit_dates',…)`.
**The `view` permission is declared but never enforced** — nothing in `go()` (`L8779`–`L8827`) or `renderCompliancePage()` checks `canPage('compliance','view')`.

---

## 9. Tables & lists

### 9.1 `table.dt#compliance-table` — Driver & vehicle documents (`L13341`–`L13354`)

**Columns, in order** (`L13341`):

| # | Header | Cell content | Source |
|---|---|---|---|
| 1 | `Driver` | `nm2(driverId)`, blue + `cursor:pointer` | `DB.drivers[id].name` |
| 2 | `Driving license` | `<span class="b {cls}" style="font-size:9px" title="Expires {ISO}">{label}</span>` | `DB.driverDocs[id].license` |
| 3 | `Vehicle registration` | ″ | `…vehicle_reg` |
| 4 | `Periodic inspection` | ″ | `…inspection` |
| 5 | `Insurance` | ″ | `…insurance` |
| 6 | `Transport authority operating card` | ″ | `…operating_card` |
| 7 | `Dispatch` | `⛔ Suspended` (b-red, `title`=reason) or `Active` (b-green) | `DB.complianceSuspensions[id]` |
| 8 | *(blank header)* | `<div class="ra"><button class="btn sm">📅 Edit dates</button></div>` | — |

- **Row source:** `complianceScan()` rows, i.e. `Object.keys(DB.driverDocs)` — **not** `DB.drivers`. A driver present in `DB.drivers` but absent from `DB.driverDocs` never appears here.
- **Filter:** `_complianceFilter` predicate (`L13334`–`L13339`).
- **Sort:** `shownScan.sort((a,b) => a.worst - b.worst)` (`L13342`) — ascending rank, so EXPIRED first, then ≤7d, then ≤30d, then healthy. Ties keep `Object.keys` insertion order. `.sort` mutates `shownScan`, which is a fresh array from `.filter`, so `scan` is unaffected — safe.
- **Row click:** none on the `<tr>`; only cell 1 is clickable.
- **Row actions:** one — 📅 Edit dates.
- **Row highlight:** `style="background:var(--red-lt)"` when suspended (`L13349`).
- **Empty state:** `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--ghost)">No drivers match this filter.</div>` (`L13340`). Note the table (and its headers) is not rendered at all in this case.
- **Container scroll:** `max-height:420px;overflow-y:auto` (`L1243`); header row is not sticky.

### 9.2 `#regulatory-list` — Regulatory integrations (`L13356`–`L13368`)

Not a table — three flex rows built from a hardcoded literal array, each `border:.5px solid var(--border2);border-radius:9px;padding:10px 12px;margin-bottom:8px`. Columns: **name (bold 12px)** / **description (10.5px muted)** / **`⚠ Not connected` amber badge (right, `flex-shrink:0`)**. No sort, no filter, no click, no action, no empty state (the array is never empty). Followed by the fixed disclaimer block (`L13367`).

---

## 10. Modals opened

**Exactly one modal originates on this page.**

### `openDocDateEditor(driverId)` (`L11050`–`L11064`)

| Property | Value |
|---|---|
| Container | `#modal-content` inside `#modal-overlay`; opened by `.classList.add('open')` (`L11063`) |
| Title | `📅 Document dates — {nm2(driverId)}` (`L11054`) |
| Close ✕ | `closeModal()` (`L11054`) |
| Body | `L11055`–`L11059` — 2-column grid of 5 `<input type="date">`, ids `dde-license`, `dde-vehicle_reg`, `dde-inspection`, `dde-insurance`, `dde-operating_card`; labels = `DOC_TYPES[i][1]` (full labels, parentheses intact); values pre-filled from `DB.driverDocs[driverId][key] \|\| ''` |
| Footer button 1 | `Cancel` → `closeModal()` (`L11062`) |
| Footer button 2 | `Save dates` (`btn p sm`) → **commit function `saveDriverDocDates(driverId)`** (`L11062`) |
| Guards before opening | `requirePerm('approve_drivers')` (`L11051`), `requirePagePerm('compliance','edit_dates')` (`L11052`) |
| Confirmation on save | none |

**Sibling (different page, same data — cross-module):** the Applicant Detail page renders an inline (non-modal) equivalent card `📅 Document expiry dates` with id `docexp-card-{appId}`, ids `docexp-<key>`, commit `saveDocExpiry(appId)` → writes `a.docExpiry` on the pending application, `logAction('save_doc_expiry','applicant',…)` (`L10994`–`L11046`, mounted at `L7151`). That data is transferred into `DB.driverDocs` only at approval (`L11113`).

---

## 11. States, severities & badges

| State | Exact trigger condition | Visual | Where | SLA |
|---|---|---|---|---|
| **EXPIRED** | `docDaysLeft(exp) < 0` | `<span class="b b-red" style="font-size:9px">EXPIRED</span>` | doc cell `L13346` | none defined |
| **≤7 days (urgent)** | `0 ≤ days ≤ 7` | `b-red`, text `"{n}d left"` | doc cell `L13346` | alert-at-7 is descriptive only — no timer, no escalation |
| **≤30 days (warning)** | `8 ≤ days ≤ 30` | `b-amber`, text `"{n}d left"` | doc cell `L13346` | alert-at-30 descriptive only |
| **Healthy** | `days > 30` | `b-green`, text `"{n}d"` (no "left") | doc cell `L13346` | — |
| **⛔ Suspended** | `DB.complianceSuspensions[driverId]` is truthy (any reason, incl. Safety's) | `<span class="b b-red" title="{reason}">⛔ Suspended</span>` + row `background:var(--red-lt)` | `L13349`, `L13351` | none |
| **Active** | `DB.complianceSuspensions[driverId]` falsy | `<span class="b b-green">Active</span>` | `L13351` | — |
| **⚠ Not connected** | unconditional — hardcoded | `<span class="b b-amber" style="flex-shrink:0">⚠ Not connected</span>` | `L13363` | — |
| **Auto-suspend notification** | first scan where `expired.length && !DB.complianceSuspensions[d]` | bell notification, `type:'alert'`, title `Auto-suspended — {name}` | `L13309` | none |

There is **no SLA / clock / due-date mechanism anywhere in this module** — no `slaSweep` hook, no `dueAtMs`, no age counter. The only time pressure is the days-remaining band itself.

---

## 12. Sidebar counter formula (+ staleness check)

**Markup** (`L517`): `<span class="sb-badge a" id="sbb-compliance">0</span>` — hardcoded initial text `0`.

**Only assignment in the entire file** (`grep sbb-compliance` → `L517`, `L13331`):
```js
var sbb=document.getElementById('sbb-compliance'); if(sbb) sbb.textContent = expired + week;   // L13331
```
**Formula:** `count(worst===0) + count(worst===1)` — i.e. **drivers with at least one already-expired document, plus drivers whose worst document expires within 7 days.** Drivers in the ≤30-day band are deliberately excluded. At seed state this is `1 + 0 = 1`.

### Staleness — CONFIRMED STALE (same bug class as `sbb-zones`)

`L13331` executes **only inside `renderCompliancePage()`**, and `renderCompliancePage()` has exactly four call sites — `L8797` (router, on navigating *to* compliance), `L11076` (after saving doc dates, itself only reachable from this page), `L13319` (the page's own KPI filter), `L13378` (dead `markDocRenewed`). **None runs at boot.**

Consequences, all verified:
1. **Before the user's first visit to Compliance, the badge shows the hardcoded `0` from `L517`, even though DRV-0104 is already expired.** The number is wrong from the first paint.
2. The 60-tick timer (`L12611`–`L12619`) calls `complianceScan()` unconditionally — so the *suspension* and the *bell notification* fire correctly in the background — but it calls `renderCompliancePage()` **only if `#p-compliance` has class `on`** (`L12617`–`L12618`). **So the badge never refreshes in the background.** A driver crossing into expiry mid-session produces a bell alert but no badge change.
3. Once visited, the badge freezes at the value from the last render of that page.

For contrast, badges that *are* refreshed centrally: `sbb-dash`, `sbb-subs`, `sbb-qr`, `sbb-renew`, `sbb-requests` via `put(...)` at `L9400`–`L9401`. `sbb-compliance` is not in that set. **Identical staleness to `sbb-zones` (`L14140`), `sbb-safety` (`L13406`), `sbb-coverage` (`L13159`), `sbb-predictive` (`L14382`).**

---

## 13. Cross-module links

**Outbound (Compliance → elsewhere)**

| From | Line | To |
|---|---|---|
| Driver-name cell → `openProfile(driverId)` | `L13350` | 360° Profile (`p-profile`) |
| 📅 Edit dates → shared `openDocDateEditor` | `L13352` → `L11050` | Onboarding/document-capture block |

**Inbound (elsewhere → Compliance)**

| From | Line | Mechanism |
|---|---|---|
| Safety KPI "Precautionary suspensions" | `L13404` | `go('compliance',null)` |
| Predictive Signals → driver risk row "Review documents" | `L14320` | `go('compliance',null)` |
| Safety `precautionSuspend` toast | `L13473` | clickable toast → `go('compliance',null)`; toast text: *"suspended pending investigation — visible in Compliance too"* |
| Auto-suspend bell notification | `L13309` | notification action → `go('compliance',null)` |
| Applicant approval flow | `L11101`–`L11113` | seeds `DB.driverDocs[newId]` |
| Applicant Detail doc-expiry card | `L7151`, `L11010` (caption "Feeds Compliance auto-suspension") | writes `a.docExpiry`, consumed at approval |

**Shared-state consumers of `DB.complianceSuspensions` (written by this module)**

| Consumer | Line | Rule |
|---|---|---|
| `steerableDrivers()` (Zones) | `L13987` | excludes suspended drivers from steering offers |
| `subHealthScore()` (Predictive) | `L14228` | `score -= 30`, reason "Assigned driver is currently suspended" |
| `driverRiskScore()` (Predictive) | `L14293` | `score -= 30`, reason `'Currently suspended: '+reason` |
| Safety KPI 4 | `L13404` | counts keys matching `/Precautionary/` |
| Safety `precautionSuspend()` | `L13468` | **writes** `'Precautionary — pending {INC-id} investigation'` |

**Shared-state consumers of `DB.driverDocs` / `DOC_TYPES`**

| Consumer | Line | Rule |
|---|---|---|
| `driverRiskScore()` (Predictive) | `L14286`–`L14290` | `worst < 0` → `score -= 40` ("Has an expired document (suspended)"); else `worst <= 14` → `score -= 20` ("Document expires in N days"). **Note the 14-day threshold exists nowhere in Compliance** — a third, undocumented band. |
| Applicant approval warning | `L7180`–`L7182` | counts missing dates |
| Applicant expiry card | `L10999`, `L11018`, `L11034` | same `DOC_TYPES` + `docState` |

**Reason codes owned by "Compliance"** (SLA/Contacts module, `L14672`, `L14695`, `L14711`, `L14712`): `CAP_OFFPLATFORM_PAY`, `SAF_THEFT`, `DRV_SUSPENSION_APPEAL`, `DRV_DOC_HELP` (`'Document upload or expiry help'`, T3, first-response 60 min, resolve 2880 min). These are routed to a Compliance owner but **do not link to or read from this page**.

---

## 14. Hardcoded / mock / demo values

| # | Value | Line | Note |
|---|---|---|---|
| 1 | Entire `DB.driverDocs` seed — 5 drivers × 5 ISO dates | `L13278`–`L13284` | **MOCK.** DRV-0101…DRV-0105 only |
| 2 | `DB.complianceSuspensions={}` initial | `L13285` | empty; populated only at runtime |
| 3 | `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | `L9555` | **DEMO CLOCK.** Every days-left figure on this page derives from it |
| 4 | `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` with `setInterval(tickEngine,1000)` | `L9579`, `L11968` | 60× time acceleration |
| 5 | Thresholds `0 / 7 / 30` inside `docState` | `L13291`–`L13293` | **hardcoded, not configurable** |
| 6 | KPI 1 bar `width:100%` | `L13327` | fixed, not a ratio |
| 7 | KPI 2/3/4 bar `Math.min(100, n*20)` | `L13328`–`L13330` | arbitrary ×20 scale |
| 8 | KPI 4 sub-label "plan renewals" | `L13330` | wrong domain wording |
| 9 | All three regulatory integration rows (names + descriptions) | `L13358`–`L13360` | **MOCK — explicitly declared as placeholders** at `L13367` |
| 10 | Regulatory status badge `⚠ Not connected` | `L13363` | **always** this value; no state exists |
| 11 | Regulatory disclaimer text | `L13367` | static |
| 12 | `p#compliance-sub` copy | `L1238` | static, never updated |
| 13 | Card caption "Auto-suspend on expiry · alerts at 30 and 7 days" | `L1242` | static (happens to match `docState`) |
| 14 | `titles.compliance` / `subs.compliance` | `L2168`, `L2169` | static maps |
| 15 | `sbb-compliance` initial text `0` | `L517` | stale until first visit — §12 |
| 16 | 1-year default expiry on approval | `L11109`–`L11113` | demo fallback for blank fields |
| 17 | `markDocRenewed` 1-year guess | `L13376` | dead code (§16) |
| 18 | `oneYearOut` fallback `Date.now()` when `REQ_NOW_REF` is falsy | `L11109` | unreachable — `REQ_NOW_REF` is always a Date |

---

## 15. i18n keys

| Key | Element | Line | Arabic value | Line |
|---|---|---|---|---|
| `nav.compliance` | sidebar label `<span class="sb-lbl" data-i18n="nav.compliance">Compliance</span>` | `L517` | `الامتثال` | `L7908` |

**That is the only i18n key touching this module.** The page body (`L1236`–`L1251`) carries **zero** `data-i18n` attributes, and every string produced by `renderCompliancePage()` is English literal. This is acknowledged in the source at `L7900`–`L7902`: *"every dynamically-built string — stays English-only; translating thousands of generated strings throughout this file is a genuinely separate, much larger project than this toggle can honestly cover."* The translator applies to `document.querySelectorAll('[data-i18n]')` only (`L7947`).

---

## 16. Gaps, dead code, UNVERIFIED items

### Confirmed defects

1. **`d.docStatus` is never assigned anywhere in the file — CONFIRMED.** `grep docStatus` returns exactly four hits:
   - `L6380` — Drivers table filter: `if(_driverFilter==='docs')return d.docStatus==='expiring'||d.docStatus==='expired';`
   - `L7093` — `var meta=docStatusMeta(statusText);` (a *different* concept: applicant document verification verdict, `'✓ Verified'` / `'✗ …'` / pending, `L10847`–`L10851`)
   - `L10847` — the `docStatusMeta` definition
   - `L20925` — `fleetCounts()`: `var docsExpiring=d.filter(function(x){return x.docStatus==='expiring'||x.docStatus==='expired';});` → `drivers.docsAtRisk`

   **There is no `docStatus:` property in any `DB.drivers` literal and no `.docStatus =` assignment.** Consequences: the Drivers page "docs" filter (`L6380`) always yields **zero rows**, and `fleetCounts().drivers.docsAtRisk` (`L20925`) is **always 0**. The real expiry truth lives exclusively in `DB.driverDocs` (`L13278`) and is reachable only through `docDaysLeft`/`docState`/`complianceScan`.
   **What this means for the Compliance page:** the page itself is unaffected — it never reads `docStatus`. But **Compliance is the only surface in the entire panel that tells the truth about document expiry.** The two other places that claim to report it are silently broken, so a `docsAtRisk: 0` on the Drivers page directly contradicts "Expired — suspended: 1" here. The fix is to derive `docStatus` from `complianceScan()` (or replace both readers with `docState`), not to add a new field.

2. **Sidebar badge stale before first visit** — §12. Also never refreshed in the background despite `complianceScan()` running every 60 s of demo time.

3. **`markDocRenewed()` (`L13370`–`L13381`) is dead code.** No call site. Superseded by `openDocDateEditor`; superseding documented at `L10989`–`L10991` and `L11048`–`L11049`.

4. **Latent `NaN` render.** `renderCompliancePage` (`L13344`–`L13346`) calls `docState(docDaysLeft(exp))` **without** the `if(!exp)return;` guard that `complianceScan` uses (`L13301`). For a missing key, `new Date('undefinedT00:00:00')` → Invalid Date → `NaN`; all three `docState` comparisons against `NaN` are false, so the cell renders **`NaNd` in a green (`b-green`) badge** — i.e. a missing document reads as *healthy*. Not reachable through today's UI (every row source has all 5 keys, seeded at `L13278` or `L11113`), but `saveDriverDocDates` can create a partial record (`L11066` + `L11071` skips blanks), and `complianceScan` deliberately ignores missing dates, so **a driver with no dates at all is silently "compliant".**

5. **`compliance.view` permission declared but never enforced** (`L10605`; no `canPage('compliance','view')` call exists).

6. **`requirePagePerm('compliance','edit_dates')` is checked only when opening the modal (`L11052`), not on commit** (`saveDriverDocDates`, `L11065`, checks only `requirePerm('approve_drivers')`). A user whose page-permission is revoked while the modal is open can still save.

7. **Auto-unsuspension is silent** (`L13311`–`L13313`) — no audit entry, no notification, asymmetric with the heavily-logged suspend branch (`L13308`–`L13309`). A driver returning to dispatch leaves no trace in the Activity log.

8. **The auto-suspend reason string is never upgraded.** Guard `!DB.complianceSuspensions[d]` (`L13306`) means a driver already precautionarily suspended by Safety who *then* has a document expire keeps the reason `'Precautionary — pending INC-xxx investigation'`; and because that string does not start with `"Expired"`, clearing the *incident* suspension is not what the un-suspend branch checks — the expiry is simply never recorded.

9. **Blank date cannot clear a value** (`L11071`: `if(v)docs[dt[0]]=v;`) — no way to mark a document as "not on file" once a date exists.

10. **`before`/`after` in the `update_doc_dates` audit entry are empty objects** (`L11077`) — the structured diff that `logAction` supports (`L3133`–`L3145`) is unused; only the prose summary carries the change.

11. **Third, undocumented urgency band elsewhere.** `driverRiskScore` uses `worst <= 14` (`L14290`) — a 14-day threshold that exists in no Compliance rule and in no UI label.

12. **KPI tiles 2–4 do not sum to tile 1** and healthy drivers (`worst===3`) have no tile — clicking nothing shows them except tile 1 / "all".

13. **Regulatory integrations section is entirely inert** — three static rows, one static badge value, no action, no data. Honest by design (`L13367`), but there is no code path that could ever change those badges.

14. **No search, no pagination, no export** on a page designed to hold the whole fleet. `max-height:420px` + `overflow-y:auto` (`L1243`) is the only concession to scale, and the table header does not stick.

### UNVERIFIED

- **Whether the intended `docStatus` values were meant to be `'expiring'`/`'expired'`/something else, and which module should own the assignment** — no writer, no schema comment, and no `DB.drivers` seed carries the field. `UNVERIFIED — no assignment site exists in the file.`
- **Real-world accuracy of the Wasl / ZATCA / Absher obligation descriptions** (`L13358`–`L13360`) — external regulatory fact, not checkable from this file. The file itself disclaims it (`L13367`). `UNVERIFIED — out of scope of the source.`
- **Whether the source comment's claim that "document expiries actually arrive during a session" (`L12616`) holds in practice** — at 1 simulated minute per real second, the nearest non-expired document (DRV-0105 `vehicle_reg`, 12 days) needs 5 simulated days = 7,200 ticks = **2 hours of real time** to fall into the ≤7-day band. Arithmetic is verifiable from `L9579` + `L11968`; whether a session ever lasts that long is `UNVERIFIED`.

---

## 17. Line-number index

| Lines | Contents |
|---|---|
| `L517` | Sidebar nav item + `sbb-compliance` badge span |
| `L1235`–`L1251` | Page markup (`p-compliance`) |
| `L2168` | `titles.compliance` |
| `L2169` | `subs.compliance` |
| `L3126`–`L3132` | `requirePerm()` |
| `L3133`–`L3150` | `logAction()` |
| `L3565` | `nm2()` |
| `L5216` | `closeModal()` |
| `L5269` | `toast()` |
| `L6380` | Drivers page `docs` filter — reads unassigned `d.docStatus` |
| `L7093` | `docCardHTML` → `docStatusMeta` (unrelated applicant-verification concept) |
| `L7151` | Applicant Detail mounts `docExpiryFormHTML` |
| `L7180`–`L7182` | Approval-modal missing-dates warning |
| `L7900`–`L7902` | i18n scope disclaimer |
| `L7908` | `nav.compliance` Arabic string |
| `L7947` | i18n applier (`[data-i18n]` only) |
| `L8797` | Router → `renderCompliancePage()` |
| `L9400`–`L9401` | Central sidebar-badge updater (**does not include compliance**) |
| `L9555` | `REQ_NOW_REF` demo clock |
| `L9579` | `SUBREQ_TIME_ACCEL_MIN_PER_TICK` |
| `L9661`–`L9666` | `pushOpsNotification()` |
| `L9680` | Demo-clock advance |
| `L10604`–`L10607` | `PAGE_PERMISSIONS.compliance` |
| `L10658`–`L10667` | `defaultPagePerms()` |
| `L10680`–`L10688` | `requirePagePerm()` |
| `L10847`–`L10851` | `docStatusMeta()` (applicant verdicts — not this page) |
| `L10985`–`L10993` | Document-expiry-capture header comment |
| `L10994`–`L11028` | `docExpiryFormHTML` / `docExpiryViewHTML` / `docExpiryEditHTML` / `toggleDocExpiryEdit` |
| `L11029`–`L11046` | `saveDocExpiry()` (applicant) |
| `L11048`–`L11049` | Comment: replaces the old "guess a year out" |
| `L11050`–`L11064` | **`openDocDateEditor()` — the page's only modal** |
| `L11065`–`L11079` | **`saveDriverDocDates()` — the commit function** |
| `L11101`–`L11113` | `approveDriver()` seeds `DB.driverDocs[newId]` |
| `L11968` | `setInterval(tickEngine,1000)` |
| `L12574` | `processSubReqSearchWindow()` call (advances the clock) |
| `L12611`–`L12619` | 60-tick `complianceScan()` + conditional re-render |
| `L13271`–`L13276` | Module header comment |
| `L13277` | **`DOC_TYPES`** |
| `L13278`–`L13284` | **`DB.driverDocs`** seed |
| `L13285` | **`DB.complianceSuspensions`** |
| `L13286`–`L13289` | **`docDaysLeft()`** |
| `L13290`–`L13295` | **`docState()` — the banding formula** |
| `L13296`–`L13317` | **`complianceScan()` — auto-suspend / auto-lift** |
| `L13318` | `_complianceFilter` |
| `L13319` | `filterCompliance()` |
| `L13320`–`L13369` | **`renderCompliancePage()`** |
| `L13325`–`L13330` | KPI tiles |
| `L13331` | `sbb-compliance` assignment |
| `L13332`–`L13355` | Document table |
| `L13356`–`L13368` | Regulatory integrations list |
| `L13370`–`L13381` | `markDocRenewed()` — **DEAD** |
| `L13404` | Safety KPI → `go('compliance')` |
| `L13468` | Safety writes `DB.complianceSuspensions` |
| `L13473` | Safety toast → Compliance |
| `L13987` | `steerableDrivers()` reads suspensions |
| `L14228` | `subHealthScore()` reads suspensions |
| `L14286`–`L14295` | `driverRiskScore()` reads `DB.driverDocs` + suspensions (14-day band) |
| `L14320` | Predictive "Review documents" → Compliance |
| `L14520`–`L14544` | `kpiGo` / `kpiScrollTo` |
| `L14672`, `L14695`, `L14711`, `L14712` | Reason codes owned by "Compliance" |
| `L20925` | `fleetCounts()` — reads unassigned `docStatus` |
| `L21236`–`L21255` | `liveSubtitles()` (does **not** cover this page) |
