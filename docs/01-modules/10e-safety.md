# Module: safety (Safety & Incidents)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `safety` — DOM node `<div class="page" id="p-safety">`
> **HTML markup:** `L1252`–`L1263`
> **Sidebar entry:** `L518`
> **JS module block:** `L13383`–`L13485` (header comment `L13383`–`L13388`)
> **Every claim below is line-cited. Items that could not be confirmed from the file are marked `UNVERIFIED`.**

---

## 1. Purpose

A single queue for every SOS alert and reported incident, each governed by a **fixed four-step protocol** (contact → verify → act → document) that must be completed in full before the incident can be closed; plus a one-click precautionary suspension that removes the accused driver from dispatch immediately.

Stated rationale in the source header comment (`L13383`–`L13388`):
> "One badly-handled incident can end a young company. Every SOS or reported incident lands here with a fixed checklist: contact → verify → act → document. Nothing closes without all four steps."

---

## 2. Entry points & routing

| # | Entry point | Line | Effect |
|---|---|---|---|
| 1 | Sidebar item `onclick="go('safety',this)"` | `L518` | Routes to page; marks sidebar item active |
| 2 | Router dispatch `if(id==='safety'){renderSafetyPage();}` | `L8798` | Only place the page is rendered on navigation |
| 3 | Work Inbox row action, label **Open** | `L19188`–`L19194` | `action:"go('safety',null)"` for every open incident |
| 4 | Predictive Signals → "Repeat incident pattern" row button **Review** | `L14350`–`L14352` | `onclick="go('safety',null)"` |
| 5 | `filterSafety(f)` (KPI tiles) | `L13396` | Re-renders in place + `kpiScrollTo('safety-list')` |
| 6 | Internal re-renders after every action | `L13462`, `L13471`, `L13481` | `toggleIncStep`, `precautionSuspend`, `closeIncident` |

Top-bar title/subtitle come from static maps, not from the page:
- `titles.safety = 'Safety & Incidents'` (`L2168`)
- `subs.safety = 'SOS alerts and incident protocol'` (`L2169`)

**No boot-time render.** `renderSafetyPage()` appears only at `L8798`, `L13396`, `L13462`, `L13471`, `L13481` (`grep` of `renderSafetyPage()`) — every one reachable only after the page has been opened, except the router itself. **The demo-clock tick engine (`L12509`–`L12624`) never touches this module** — unlike Compliance, which gets a 60-tick `complianceScan()` (`L12615`). Incidents are entirely static between user actions.

---

## 3. Layout map

```
#p-safety                                                L1253
├─ .ph  (page header)                                    L1254
│   └─ .ph-l  h1 "🚨 Safety & incidents"                 L1254  (static)
│       p#safety-sub "SOS alerts, incident protocol,
│         and precautionary actions"                     L1254  (static, NEVER updated — §14)
├─ .g4 #safety-kpis            → 4 KPI tiles             L1256  (filled L13399–L13404)
└─ .card                                                 L1257
    ├─ .ch  h2 "Incident queue"                          L1258  (static)
    │       span.b.b-red#safety-open-count "0 open"      L1258  (initial text hardcoded; set L13405)
    └─ #safety-list  (max-height:520px; overflow-y:auto) L1259  (filled L13407–L13441)
```

There is **no page-header button row** (`.br`) — no "log new incident" action exists anywhere in the module. Incidents can only arrive by editing `DB.incidents` in source (§16).

---

## 4. Rules & policy logic — written out exactly

### 4.1 Incident record shape

`DB.incidents` (`L13389`–`L13393`) — array of three seeded objects. Full field list, from the literals:

| Field | Type | Values seen | Notes |
|---|---|---|---|
| `id` | string | `INC-014`, `INC-013`, `INC-011` | rendered monospace red (`L13432`) |
| `type` | string | `'SOS'`, `'Accident'`, `'Harassment report'` | free text; rendered in a grey badge (`L13432`) |
| `severity` | string | `'critical'`, `'high'` | §4.2 |
| `status` | string | `'open'`, `'closed'` | §4.5 |
| `opened` | string | `'09:02'`, `'Yesterday 18:40'`, `'22 Jun'` | **free-text, not a timestamp** — no parsing, no aging |
| `trip` | string | `TRP-9012`, `TRP-8977`, `TRP-8720` | id only; not validated |
| `reporter` | string | `RDR-2087`, `DRV-0104`, `RDR-2031` | resolved through `nm2()` (`L3565`) |
| `against` | string \| `null` | `DRV-0102`, `null`, `DRV-0105` | `null` on INC-013 (self-reported accident) |
| `summary` | string | free text | rendered at 12px (`L13434`) |
| `steps` | object | `{contact,verify,act,document}` | each `{done:bool}` or `{done:true,by:string,at:string}` |

### 4.2 Severity scale — the complete scale as implemented

```js
var sevB = inc.severity==='critical' ? '<span class="b b-red">🆘 CRITICAL</span>'
         : inc.severity==='high'     ? '<span class="b b-amber">High</span>'
         :                             '<span class="b b-grey">Normal</span>';   // L13429
```
**Exactly three levels**, and the third is a fall-through default:

| Level | Literal value | Badge | Trigger |
|---|---|---|---|
| Critical | `'critical'` | `<span class="b b-red">🆘 CRITICAL</span>` | `severity === 'critical'` |
| High | `'high'` | `<span class="b b-amber">High</span>` | `severity === 'high'` |
| Normal | **any other value, including `undefined`** | `<span class="b b-grey">Normal</span>` | the `else` branch |

There is **no numeric severity, no severity ordering constant, no `SEV_LEVELS` array**, and no mapping from `type` to `severity` — severity is a hand-authored field on each record. `'Normal'` has no producer in the seed data (§16).

### 4.3 Incident types — the complete set

There is **no incident-type enumeration in the file.** `inc.type` is free text, rendered verbatim (`L13432`). The three values that exist:

| Type | Incident | Severity | Line |
|---|---|---|---|
| `SOS` | INC-014 — "Rider pressed SOS during trip — no answer on first callback" | critical | `L13390` |
| `Accident` | INC-013 — "Minor collision reported by driver — no injuries, vehicle drivable" | high | `L13391` |
| `Harassment report` | INC-011 — "Verbal misconduct reported — investigated, warning issued, rider credited" | high | `L13392` |

No validation, no dropdown, no constant. Any string would render.

### 4.4 The four-step protocol (the module's core rule)

```js
var INC_STEPS=[['contact','Contact both parties'],
               ['verify','Verify facts (GPS, timestamps, statements)'],
               ['act','Act (precautionary suspension / credit / clearance)'],
               ['document','Document outcome for the record']];      // L13394
```

| Order | Key | Label |
|---|---|---|
| 1 | `contact` | Contact both parties |
| 2 | `verify` | Verify facts (GPS, timestamps, statements) |
| 3 | `act` | Act (precautionary suspension / credit / clearance) |
| 4 | `document` | Document outcome for the record |

Rules that govern the protocol, exactly:
- **Progress formula** (`L13416`): `doneCount = INC_STEPS.filter(st => inc.steps[st[0]].done).length` — count of the four keys whose `.done` is truthy.
- **Progress bar** (`L13418`): `width = Math.round(doneCount / INC_STEPS.length * 100)%`; fill colour `var(--green)` when `doneCount === 4`, otherwise `var(--amber)`.
- **Progress caption** (`L13417`): `"{doneCount} of 4 steps complete"`.
- **Order is NOT enforced.** Any checkbox can be ticked in any order — there is no dependency check anywhere in `toggleIncStep` (`L13448`–`L13463`).
- **Steps of a closed incident are read-only**: checkbox gets `disabled` and the whole label gets `opacity:.6` when `inc.status==='closed'` (`L13421`, `L13423`).
- **Attribution rule** (`L13455`): ticking writes `{done:true, by:currentUserName(), at:'Just now'}`. The literal string `'Just now'` is stored — **no real timestamp is ever recorded**. Un-ticking writes `{done:false}`, which **destroys the `by`/`at` attribution permanently** (`L13459`).
- **Attribution display** (`L13422`): shown as `✓ {by} · {at}` in 9.5px ghost text beneath the step label, but only when `s.done && s.by` — so the seeded `{done:true}` shapes with no `by` would show nothing (all seeded done-steps do carry `by`/`at`).

### 4.5 Escalation rule

**There is no automatic escalation in this module.** Verified by absence: no timer, no `setTimeout`/`setInterval`, no `slaSweep` hook, no severity-promotion code, no auto-notification, no `pushOpsNotification` call anywhere in `L13383`–`L13485`. Every severity level is hand-authored and never changes at runtime.

The only escalation-shaped behaviours are **visual and manual**:
1. Critical + open incidents get a red row background (`L13431`): `inc.severity==='critical' && inc.status==='open'` → `background:var(--red-lt)`.
2. The list sorts open incidents above closed ones (`L13415`) — **but does not sort by severity** (§9).
3. The Work Inbox (`L19188`–`L19194`) maps `severity==='critical'` to an inbox priority of `critical` **and to an age value of `-1`** (a sentinel that sorts a critical incident to the top of the inbox regardless of age); non-critical open incidents map to inbox severity `'high'` with age `null`.

### 4.6 SLA

**There is no SLA in this module.** No due time, no clock, no breach state, no `res`/`fr` minutes, no colour that changes with elapsed time. The `opened` field is free text (`'Yesterday 18:40'`) and is never parsed. Contrast the Contacts/SLA module, which does define first-response and resolution minutes per reason code (`L14672` ff.) — those SLAs govern *tickets*, not the incidents on this page, and there is no link between the two.

The one time-shaped rule that touches incidents lives **outside** this module, in the Work Inbox (`L19191`): `i.severity==='critical' ? -1 : null` as the "age" argument to `wi(...)`.

### 4.7 Precautionary suspension rule

```js
function precautionSuspend(incId,drvId){                                    // L13464
  if(!requirePerm('approve_drivers'))return;                                // L13465
  if(!requirePagePerm('safety','suspend'))return;                           // L13466
  if(!confirm('Suspend '+nm2(drvId)+' pending investigation of '+incId
     +'? They will be removed from dispatch immediately — including any
      active subscriptions — until this is resolved.'))return;              // L13467
  DB.complianceSuspensions[drvId]='Precautionary — pending '+incId+' investigation'; // L13468
  var inc=DB.incidents.find(function(i){return i.id===incId;});
  if(inc)inc.steps.act={done:true,by:currentUserName(),at:'Just now'};       // L13470
  renderSafetyPage();                                                       // L13471
  logAction('precaution_suspend','driver',drvId,
            nm2(drvId)+' precautionarily suspended pending '+incId,{},{incident:incId}); // L13472
  toast('⛔ '+nm2(drvId)+' suspended pending investigation — visible in Compliance too',
        'warn',function(){go('compliance',null);});                         // L13473
}
```
Exact rules:
- **Double gate**: broad `approve_drivers` **and** page-scoped `safety.suspend`.
- **Native browser `confirm()`** — the only confirmation dialog in the module besides `closeIncident`.
- **Writes the suspension into the Compliance module's store**, `DB.complianceSuspensions`, with the exact reason string `"Precautionary — pending {INC-id} investigation"`. Because that string does not begin with `"Expired"`, Compliance's auto-lift rule (`L13311`) will **never** remove it — it can only be removed by editing state directly. **There is no "lift suspension" action anywhere in the file** (`grep` of `delete DB.complianceSuspensions` → only `L13312`, the Expired-prefix branch).
- **Side effect on the protocol**: step 3 (`act`) is force-marked done with the current user's attribution — **overwriting whatever was there, including an existing `by`/`at`**, and **without a `logAction('incident_step',…)` entry**, so the Activity log records the suspension but not the protocol-step change it caused.
- **`toast(...,'warn', onClick)`** — the toast is clickable and navigates to Compliance.
- **No reversal, no un-suspend, no undo.**

### 4.8 Close rule

```js
function closeIncident(incId){                                                    // L13475
  if(!requirePagePerm('safety','close'))return;                                   // L13476
  var inc=DB.incidents.find(function(i){return i.id===incId;});
  if(!inc)return;
  if(!INC_STEPS.every(function(st){return inc.steps[st[0]].done;})){
     toast('⚠ Complete all four protocol steps before closing','warn');return;}   // L13479
  if(!confirm('Close incident '+incId+'? This finalizes the record — reopen it
      manually if new information comes in later.'))return;                       // L13480
  inc.status='closed';                                                            // L13481
  renderSafetyPage();
  logAction('close_incident','incident',incId,
     'Incident '+incId+' closed — full protocol completed',
     {status:'open'},{status:'closed'});                                          // L13483
  toast('✅ '+incId+' closed with full documentation','ok');                       // L13484
}
```
Exact rules:
- **Single gate**: `safety.close` only — **`requirePerm('approve_drivers')` is NOT checked**, unlike `precautionSuspend`.
- **Hard gate on the protocol**: `INC_STEPS.every(st => inc.steps[st[0]].done)` must be true. Enforced twice — once by disabling the button (`L13439`) and once at the top of the function (`L13479`).
- Native `confirm()`.
- Sets `status='closed'` only. `severity` is left as-is, so a closed critical incident keeps the `🆘 CRITICAL` badge but loses the red row tint (the tint requires `status==='open'`, `L13431`).
- **`before`/`after` are properly populated here** (`{status:'open'}` → `{status:'closed'}`) — the only action in this module that fills the structured audit diff.
- **There is no "reopen" action.** The confirm text says "reopen it manually if new information comes in later", but no reopen handler exists (`grep reopen` → no incident handler).

### 4.9 Step-toggle rule

```js
function toggleIncStep(incId,step,val){                                       // L13448
  if(!requirePagePerm('safety','update_steps'))return;                        // L13449
  var inc=DB.incidents.find(function(i){return i.id===incId;});
  if(!inc)return;
  var label=(INC_STEPS.find(function(s){return s[0]===step;})||[,step])[1];    // L13452
  if(val){
    inc.steps[step]={done:true,by:currentUserName(),at:'Just now'};            // L13455
    logAction('incident_step','incident',incId,
      'Step completed on '+incId+': "'+label+'" — '+currentUserName(),{},{step:step,done:true});
    toast('✅ Marked done — '+label,'ok');                                     // L13457
  } else {
    inc.steps[step]={done:false};                                             // L13459
    logAction('incident_step','incident',incId,
      'Step un-marked on '+incId+': "'+label+'" — '+currentUserName(),{},{step:step,done:false});
    toast('Step unmarked — '+label,'info');                                    // L13461
  }
  renderSafetyPage();                                                         // L13462
}
```
Design rationale is stated in the source (`L13442`–`L13447`): *"(1) confirms with a toast every time — success on check, a plain info toast on uncheck (undoing a safety-record step is still a notable action, not silent), (2) records who did it and when for the incident's accountability trail … and (3) logs it to the Activity log — the same paper trail a real safety/compliance audit would expect to see for an SOS."*

Note the **denial toast bug** in the gate: `requirePagePerm` returns `false` and aborts, but the checkbox in the DOM has **already flipped** — the render that would revert it never runs, so the UI shows the step ticked while `DB.incidents` says otherwise, until the next re-render (§16).

---

## 5. KPIs & metrics

All four tiles are rendered into `#safety-kpis` at `L13399`–`L13404`. All are `class="kpi click"`. Tiles 1–3 are filters; tile 4 is a navigation link.

| # | Label | Source | Exact formula | Sub-label (`.kpi-dl`) | Colour | Bar width | Thresholds |
|---|---|---|---|---|---|---|---|
| 1 | **Open incidents** `L13400` | `DB.incidents` | `DB.incidents.filter(i => i.status==='open').length` | `need action now` (class `dn`) | `var(--red)` | `Math.min(100, open.length*25)%`, class `kf-a` | `status==='open'` |
| 2 | **Critical (SOS)** `L13401` | `DB.incidents` | `open.filter(i => i.severity==='critical').length` — **computed over the OPEN subset only** | `life-safety priority` (class `dn`) | `var(--red)` | **`25%` — HARDCODED**, class `kf-a` | `severity==='critical' && status==='open'` |
| 3 | **Closed this month** `L13402` | `DB.incidents` | `DB.incidents.filter(i => i.status==='closed').length` — **no month filter of any kind** | `fully documented` (class `up`) | default | **`33%` — HARDCODED**, class `kf-g` | `status==='closed'` |
| 4 | **Precautionary suspensions** `L13404` | `DB.complianceSuspensions` (**Compliance's store**) | `Object.keys(DB.complianceSuspensions).filter(k => /Precautionary/.test(DB.complianceSuspensions[k])).length` | `pending investigation` (class `neu`) | default | **`10%` — HARDCODED**, class `kf-a` | reason string matches `/Precautionary/` |

Additional non-tile metric:
- **`#safety-open-count`** (`L1258`, set at `L13405`): `open.length + ' open'`, rendered in a `b b-red` badge in the card header. Initial hardcoded text `"0 open"`.

Notes:
- **Tile 3's label is wrong**: "Closed this month" counts *all* closed incidents ever, because `DB.incidents` has no date field that could be filtered and `opened` is free text. §16.
- **Tile 2 counts open-critical but its filter (`filterSafety('critical')`) matches severity regardless of status** (`L13410`) — a mismatch that is invisible in the seed data because no closed incident is critical. §16.
- Three of four bar widths are fixed constants, not derived from data.

### Computed values at seed state

From `DB.incidents` (`L13389`–`L13393`) and `DB.complianceSuspensions` after the first `complianceScan()`:

| Tile | Value |
|---|---|
| Open incidents | **2** (INC-014, INC-013) |
| Critical (SOS) | **1** (INC-014) |
| Closed this month | **1** (INC-011) |
| Precautionary suspensions | **0** (only DRV-0104 is suspended, with reason `"Expired: …"`, which does not match `/Precautionary/`) |
| `#safety-open-count` | **"2 open"** |
| `sbb-safety` | **2** — but see §12 |

---

## 6. Data displayed

| Element | Line | DB path / origin | Type | Notes |
|---|---|---|---|---|
| `h1` "🚨 Safety & incidents" | `L1254` | hardcoded HTML | string | static |
| `p#safety-sub` | `L1254` | hardcoded HTML | string | **never updated by any JS**; `liveSubtitles()` (`L21236`) does not cover this page |
| Top-bar title | `L2168` | `titles.safety` | string | `'Safety & Incidents'` |
| Top-bar subtitle | `L2169` | `subs.safety` | string | `'SOS alerts and incident protocol'` |
| Card header "Incident queue" | `L1258` | hardcoded HTML | string | static |
| `#safety-open-count` | `L1258` / `L13405` | computed from `DB.incidents` | string | `"{n} open"` |
| KPI 1–3 values | `L13400`–`L13402` | `DB.incidents` | int | |
| KPI 4 value | `L13404` | `DB.complianceSuspensions` | int | **cross-module read** |
| Incident id | `L13432` | `inc.id` | string | `font-family:monospace;font-size:11px;color:var(--red)` |
| Severity badge | `L13429` | `inc.severity` | badge | §4.2 |
| Type badge | `L13432` | `inc.type` | badge | `b-grey`, verbatim text |
| Status badge | `L13433` | `inc.status` | badge | `Closed` (b-green) or `Open` (b-blue) |
| Summary line | `L13434` | `inc.summary` | string | 12px |
| Meta line | `L13435` | composed: `'Opened '+inc.opened+' · Trip '+inc.trip+' · Reporter '+nm2(inc.reporter)` + `(inc.against ? ' · Against '+nm2(inc.against) : '')` | string | 10px muted; **`Against` omitted entirely when `against` is null** |
| Step progress caption | `L13417` | computed `doneCount` | string | `"{n} of 4 steps complete"` |
| Step progress bar | `L13418` | computed | CSS width | `Math.round(doneCount/4*100)%` |
| Step checkbox | `L13421` | `inc.steps[key].done` | bool | `checked` / `disabled` |
| Step label | `L13422` | `INC_STEPS[i][1]` | string | |
| Step attribution | `L13422` | `inc.steps[key].by` + `.at` | string | `✓ {by} · {at}`, 9.5px ghost; only if `done && by` |
| Row background tint | `L13431` | computed | CSS | `var(--red-lt)` when critical **and** open |
| Suspend-button label | `L13437` | `nm2(inc.against)` | string | `"Precautionary suspend {name}"` |

---

## 7. Input fields / filters

**No text input, no `<select>`, no search box exists on this page.** Two input mechanisms only: the four KPI tiles, and the protocol checkboxes.

| id / control | Type | Label | Default | All options | Drives |
|---|---|---|---|---|---|
| `_safetyFilter` (module-scope var, `L13395`) | string state | — | `'all'` | `'all'` · `'open'` · `'critical'` · `'closed'` | Row predicate `L13408`–`L13413` |
| KPI tile 1 `onclick="filterSafety('open')"` `L13400` | button-like div | Open incidents (`title="Show only open incidents"`) | — | — | `i.status==='open'` |
| KPI tile 2 `onclick="filterSafety('critical')"` `L13401` | button-like div | Critical (SOS) (`title="Show only critical (SOS) incidents"`) | — | — | `i.severity==='critical'` (**status-agnostic**) |
| KPI tile 3 `onclick="filterSafety('closed')"` `L13402` | button-like div | Closed this month (`title="Show only closed incidents"`) | — | — | `i.status==='closed'` |
| KPI tile 4 `onclick="go('compliance',null)"` `L13404` | button-like div | Precautionary suspensions (`title="Open Compliance to review suspensions"`) | — | — | **navigates away — not a filter** |
| *(no control)* | — | — | — | — | **There is no way to reach `_safetyFilter='all'` from the UI once a filter is applied.** No "all" tile exists. §16 |
| 4 × `<input type="checkbox">` per incident (no `id`) | checkbox | the four `INC_STEPS` labels | `checked` iff `inc.steps[key].done` | on/off | `onchange="toggleIncStep('{incId}','{stepKey}',this.checked)"` `L13421`; `disabled` when `inc.status==='closed'` |

`filterSafety(f)` (`L13396`) = set state → `renderSafetyPage()` → `kpiScrollTo('safety-list')` (smooth scroll + 1500 ms flash highlight, `L14536`–`L14544`).
Filter state is **not persisted** and **not reset** on navigation — `go()` calls `renderSafetyPage()` without touching `_safetyFilter` (`L8798`), so a filter set in a previous visit persists.

---

## 8. Actions

| # | Label | Location | Handler | Real effect | Writes to | Permission gate | Audit | Confirms? |
|---|---|---|---|---|---|---|---|---|
| 1 | Protocol checkbox ×4 | `L13421` | `toggleIncStep(incId, stepKey, checked)` | §4.9 — sets/clears `{done,by,at}`, toast, re-render | `DB.incidents[i].steps[key]`, `DB.auditLog` | `requirePagePerm('safety','update_steps')` `L13449` | `logAction('incident_step','incident',incId,…)` `L13456` / `L13460`; `before={}`, `after={step,done}` | **no** |
| 2 | **Precautionary suspend {name}** (`btn sm danger`) | `L13437` — rendered **only if `inc.against` is truthy AND `inc.status==='open'`** | `precautionSuspend(incId, drvId)` | §4.7 | **`DB.complianceSuspensions[drvId]`** (Compliance's store), `DB.incidents[i].steps.act`, `DB.auditLog` | **two gates**: `requirePerm('approve_drivers')` `L13465` **and** `requirePagePerm('safety','suspend')` `L13466` | `logAction('precaution_suspend','driver',drvId,…)` `L13472`; `before={}`, `after={incident:incId}` | **yes — native `confirm()`** `L13467` |
| 3 | **Open trip** (`btn sm`) | `L13438` — open incidents only | `openProfile(inc.trip)` | `resolveId()` (`L3266`) looks the id up in `DB.riders/drivers/trips/subscriptions/payments/complaints`; on miss → `toast('No record for '+id,'err')` (`L8828`-ish) | none | none | none | no |
| 4 | **Close incident** (`btn sm p`) | `L13439` — open incidents only; `disabled title="All four protocol steps must be completed first"` when `doneCount < 4` | `closeIncident(incId)` | §4.8 | `DB.incidents[i].status`, `DB.auditLog` | `requirePagePerm('safety','close')` `L13476` — **`approve_drivers` NOT required** | `logAction('close_incident','incident',incId,…)` `L13483`; `before={status:'open'}`, `after={status:'closed'}` | **yes — native `confirm()`** `L13480` |
| 5 | KPI tiles 1–3 | `L13400`–`L13402` | `filterSafety(...)` | Filter + scroll-flash | `_safetyFilter` (in-memory) | none | none | no |
| 6 | KPI tile 4 | `L13404` | `go('compliance',null)` | Navigate to Compliance | none | none | none | no |

**Permission model** (`L10608`–`L10613`):
```js
safety:{label:'Safety & Incidents',icon:'🚨',legacy:'approve_drivers',perms:[
  {key:'view',         label:'View incidents'},
  {key:'update_steps', label:'Update protocol steps'},
  {key:'suspend',      label:'Precautionary suspend a driver'},
  {key:'close',        label:'Close an incident'}
]},
```
`defaultPagePerms()` (`L10658`–`L10667`): every role always gets `view`; `update_steps`/`suspend`/`close` default-granted only to roles holding the legacy broad permission `approve_drivers`. `requirePagePerm` on denial (`L10680`–`L10688`): `toast('🔒 Your role lacks permission: Safety & Incidents — <label>','err')` + `logAction('permission_denied','permission','safety.<key>',…)`.
**`safety.view` is declared but never enforced** — nothing in `go()` (`L8779`–`L8827`) or `renderSafetyPage()` checks `canPage('safety','view')`.

**Actions that do NOT exist in this module** (verified by absence): create/log a new incident, reopen a closed incident, lift a precautionary suspension, escalate severity, assign an owner, add a note or attachment, contact the reporter, export.

---

## 9. Tables & lists

### `#safety-list` — Incident queue (`L13407`–`L13441`)

**Not a `<table>`** — a stack of `<div>` cards, each `border-bottom:.5px solid var(--border);padding:13px 16px` (`L13431`).

**Card structure, in render order:**

| Region | Contents | Line |
|---|---|---|
| Header row (`flex; justify-content:space-between; flex-wrap:wrap`) — **left column** | `{id}` (monospace red) · severity badge · type badge (`b-grey`) · status badge (`Open` b-blue / `Closed` b-green) | `L13432`–`L13433` |
| | Summary (12px, `margin-top:5px`) | `L13434` |
| | Meta (10px muted): `Opened {opened} · Trip {trip} · Reporter {name}[ · Against {name}]` | `L13435` |
| Header row — **right column** (`flex-direction:column; min-width:260px`) | `"{n} of 4 steps complete"` caption | `L13417` |
| | 4px progress bar (green at 4/4, amber otherwise) | `L13418` |
| | 4 × `<label>` each with a checkbox + step label + optional `✓ {by} · {at}` attribution | `L13419`–`L13424` |
| Action row `.ra` (`margin-top:9px`) — **rendered only when `inc.status==='open'`** | `Precautionary suspend {name}` (only if `inc.against`) · `Open trip` · `Close incident` | `L13436`–`L13440` |

- **Row source:** `DB.incidents` (`L13389`), an in-memory array. Not keyed, not indexed.
- **Filter:** `_safetyFilter` predicate (`L13408`–`L13413`).
- **Sort** (`L13415`): `shownInc.slice().sort((a,b) => (a.status==='open'?0:1) - (b.status==='open'?0:1))` — **open before closed, and nothing else.** Severity is not a sort key; a `high` open incident can precede a `critical` open incident. `.slice()` protects `DB.incidents` from mutation.
- **Row click:** none — the card itself is not clickable.
- **Row actions:** up to 3, listed above; **zero for closed incidents**.
- **Row highlight:** `background:var(--red-lt)` when `severity==='critical' && status==='open'` (`L13431`).
- **Closed-incident treatment:** step labels get `opacity:.6` and checkboxes get `disabled` (`L13421`, `L13423`); the action row is omitted entirely (`L13436`).
- **Empty state:** `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--ghost)">No incidents match this filter.</div>` (`L13414`) — followed by an early `return`, so the KPIs and open-count *are* updated but nothing else renders.
- **Container scroll:** `max-height:520px;overflow-y:auto` (`L1259`).

---

## 10. Modals opened

**This module opens no modals of its own.** `grep` of `modal-content` / `modal-overlay` inside `L13383`–`L13485` → no hits.

The two confirmations are **native browser `confirm()` dialogs**, not panel modals:

| # | Trigger | Line | Exact text |
|---|---|---|---|
| 1 | `precautionSuspend` | `L13467` | `Suspend {name} pending investigation of {INC-id}? They will be removed from dispatch immediately — including any active subscriptions — until this is resolved.` |
| 2 | `closeIncident` | `L13480` | `Close incident {INC-id}? This finalizes the record — reopen it manually if new information comes in later.` |

Modals reachable *indirectly* from this page (owned by other modules): `openProfile(inc.trip)` (`L13438`) routes to the 360° Profile page — a page, not a modal.

---

## 11. States, severities & badges

| State / badge | Exact trigger condition | Visual | Line | SLA |
|---|---|---|---|---|
| **🆘 CRITICAL** | `inc.severity === 'critical'` | `<span class="b b-red">🆘 CRITICAL</span>` | `L13429` | none |
| **High** | `inc.severity === 'high'` | `<span class="b b-amber">High</span>` | `L13429` | none |
| **Normal** | any other `severity` value (fall-through, incl. `undefined`) | `<span class="b b-grey">Normal</span>` | `L13429` | none |
| **Open** | `inc.status !== 'closed'` | `<span class="b b-blue">Open</span>` | `L13433` | none |
| **Closed** | `inc.status === 'closed'` | `<span class="b b-green">Closed</span>` | `L13433` | none |
| **Type badge** | always | `<span class="b b-grey">{inc.type}</span>` | `L13432` | — |
| **Critical-open row tint** | `severity==='critical' && status==='open'` | row `background:var(--red-lt)` | `L13431` | — |
| **Progress bar amber** | `0 ≤ doneCount ≤ 3` | 4px bar, `background:var(--amber)` | `L13418` | — |
| **Progress bar green** | `doneCount === 4` | 4px bar, `background:var(--green)` | `L13418` | — |
| **Step done** | `inc.steps[key].done === true` | checkbox checked + `✓ {by} · {at}` sub-line | `L13421`–`L13422` | — |
| **Steps locked** | `inc.status === 'closed'` | `disabled` checkbox, `opacity:.6` label | `L13421`, `L13423` | — |
| **Close button disabled** | `doneCount < 4` | `disabled title="All four protocol steps must be completed first"` | `L13439` | — |
| **Open-count badge** | always | `<span class="b b-red" id="safety-open-count">{n} open</span>` | `L1258` / `L13405` | — |

**No SLA, no due time, no breach state, no age colouring exists in this module** — see §4.6.

---

## 12. Sidebar counter formula (+ staleness check)

**Markup** (`L518`): `<span class="sb-badge a" id="sbb-safety">0</span>` — hardcoded initial text `0`.

**Only assignment in the entire file** (`grep sbb-safety` → `L518`, `L13406`):
```js
var sbb=document.getElementById('sbb-safety'); if(sbb) sbb.textContent = open.length;   // L13406
```
**Formula:** `DB.incidents.filter(i => i.status==='open').length` — a plain count of open incidents, **not weighted by severity**. At seed state this is **2**.

### Staleness — CONFIRMED STALE (same bug class as `sbb-zones`)

`L13406` executes **only inside `renderSafetyPage()`**, whose complete call-site list is `L8798` (router, on navigating *to* safety), `L13396` (the page's own KPI filter), `L13462` / `L13471` / `L13481` (its own three action handlers — all reachable only from the rendered page). **None runs at boot.**

Consequences, all verified:
1. **Before the user's first visit to Safety, the badge shows the hardcoded `0` from `L518`, while two incidents are open.** The number is wrong from the first paint — and, unlike Compliance, this is the *safety* queue.
2. **There is no background refresh at all.** The tick engine (`L12509`–`L12624`) does not reference this module — no equivalent of Compliance's 60-tick `complianceScan()` (`L12615`). Even the Work Inbox refresh (`refreshInbox()` every 20 ticks, `L12513`), which *does* read `DB.incidents` (`L19188`), updates `sbb-inbox` (`L19312`) but never `sbb-safety`.
3. Once visited, the badge freezes at the last rendered value.

For contrast, badges that *are* refreshed centrally: `sbb-dash`, `sbb-subs`, `sbb-qr`, `sbb-renew`, `sbb-requests` via `put(...)` at `L9400`–`L9401`. `sbb-safety` is not in that set. **Identical staleness to `sbb-zones` (`L14140`), `sbb-compliance` (`L13331`), `sbb-coverage` (`L13159`), `sbb-predictive` (`L14382`).**

The same staleness applies to `#safety-open-count` (`L13405`), but it is inside the page so it is always fresh when visible.

---

## 13. Cross-module links

**Outbound (Safety → elsewhere)**

| From | Line | To | Mechanism |
|---|---|---|---|
| KPI 4 "Precautionary suspensions" | `L13404` | Compliance | `go('compliance',null)` |
| "Open trip" button | `L13438` | 360° Profile | `openProfile(inc.trip)` → `resolveId()` (`L3266`) |
| `precautionSuspend` toast | `L13473` | Compliance | clickable toast → `go('compliance',null)` |
| `precautionSuspend` write | `L13468` | **Compliance's `DB.complianceSuspensions`** | direct state write |

**Inbound (elsewhere → Safety)**

| From | Line | Mechanism |
|---|---|---|
| Work Inbox, one row per open incident | `L19188`–`L19194` | `wi('incident', i.id, i.type+' — '+i.summary, 'Reporter '+nm2(i.reporter), i.severity==='critical'?-1:null, {severity: i.severity==='critical'?'critical':'high', entity:i.reporter, action:"go('safety',null)", actionLabel:'Open'})` |
| Predictive Signals — "Repeat incident pattern" row **Review** button | `L14350`–`L14352` | `go('safety',null)` |

**Shared-state readers of `DB.incidents` (owned by this module)**

| Consumer | Line | Rule |
|---|---|---|
| `subHealthScore()` (Predictive) | `L14222`–`L14224` | any open dispute **or** open incident `against` the sub's driver → `score -= 25`, reason "Assigned driver has an open dispute/incident" |
| `driverRiskScore()` (Predictive) | `L14294`–`L14296` | `openIssues = open disputes against + open incidents against`; `score -= 15 * openIssues` |
| `renderPredIncidents()` (Predictive) | `L14345`–`L14346` | counts `i.against` across disputes **and** incidents; a driver with **≥ 2** combined is a "repeat pattern" row |
| `renderPredictivePage()` total-signals | `L14375` | counts distinct `against` entities across disputes + incidents (note: the trailing `.filter(function(k){return true;})` is a no-op) |
| Work Inbox | `L19188` | above |

**Shared-state writers into `DB.complianceSuspensions`** — only two in the whole file: `complianceScan()` (`L13307`, Compliance) and `precautionSuspend()` (`L13468`, **this module**). Downstream consumers of that store are listed in `10d-compliance.md` §13 — `steerableDrivers()` (`L13987`), `subHealthScore()` (`L14228`), `driverRiskScore()` (`L14293`), Safety KPI 4 (`L13404`).

**Reason codes routed to safety-adjacent owners** (SLA/Contacts module, `L14672`–`L14712`): `SAF_THEFT` ("Lost or stolen item during the trip", owner Compliance, T2, first-response 15 min, resolve 1440 min, `L14695`), `CAP_OFFPLATFORM_PAY` (`L14672`), `DRV_SUSPENSION_APPEAL` ("Driver appeals a suspension", `L14711`). **None of these link to or read from this page** — appeals against a precautionary suspension have no code path back to the incident that caused it.

---

## 14. Hardcoded / mock / demo values

| # | Value | Line | Note |
|---|---|---|---|
| 1 | Entire `DB.incidents` array — 3 incidents | `L13389`–`L13393` | **MOCK.** The only incidents that will ever exist — no creation path (§16) |
| 2 | `opened` values `'09:02'`, `'Yesterday 18:40'`, `'22 Jun'` | `L13390`–`L13392` | **free-text mock timestamps**, never parsed |
| 3 | Step attribution names `'Sarah Al-Rashid'`, `'Lina Al-Otaibi'` | `L13391`–`L13392` | **hardcoded operator names** in the seed |
| 4 | Step attribution times `'Yesterday 18:52'`, `'Yesterday 19:10'`, `'22 Jun 10:15'`, `'22 Jun 11:02'`, `'22 Jun 14:30'`, `'22 Jun 14:45'` | `L13391`–`L13392` | mock |
| 5 | `at:'Just now'` written by every runtime step-completion | `L13455`, `L13470` | **literal string, never a real timestamp** |
| 6 | Trip ids `TRP-8977`, `TRP-8720` | `L13391`–`L13392` | **dangling** — not in `DB.trips` (§16) |
| 7 | KPI 2 bar `width:25%` | `L13401` | hardcoded, not derived |
| 8 | KPI 3 bar `width:33%` | `L13402` | hardcoded |
| 9 | KPI 4 bar `width:10%` | `L13404` | hardcoded |
| 10 | KPI 1 bar `Math.min(100, open.length*25)` | `L13400` | arbitrary ×25 scale (4 incidents = full bar) |
| 11 | KPI 3 label "Closed this month" | `L13402` | **misleading** — no month filter exists |
| 12 | `#safety-open-count` initial text `"0 open"` | `L1258` | overwritten on first render only |
| 13 | `p#safety-sub` copy | `L1254` | static, never updated |
| 14 | `titles.safety` / `subs.safety` | `L2168`, `L2169` | static maps |
| 15 | `sbb-safety` initial text `0` | `L518` | stale until first visit — §12 |
| 16 | `INC_STEPS` — the four protocol steps and their labels | `L13394` | fixed, not configurable, not in `DB.opsConfig` |
| 17 | Inbox critical-age sentinel `-1` | `L19191` | magic value |
| 18 | Confirm dialog copy (both) | `L13467`, `L13480` | English literals |

---

## 15. i18n keys

| Key | Element | Line | Arabic value | Line |
|---|---|---|---|---|
| `nav.safety` | sidebar label `<span class="sb-lbl" data-i18n="nav.safety">Safety</span>` | `L518` | `السلامة` | `L7908` |

**That is the only i18n key touching this module.** The page body (`L1253`–`L1263`) carries **zero** `data-i18n` attributes; every string produced by `renderSafetyPage()`, both `confirm()` texts, all four step labels, all severity badges, and all toasts are English literals. Acknowledged in the source at `L7900`–`L7902`. The translator applies to `document.querySelectorAll('[data-i18n]')` only (`L7947`).

**Safety-relevant note:** the two `confirm()` dialogs (`L13467`, `L13480`) and the four protocol step labels are the highest-consequence strings in the panel and are untranslatable in the current design.

---

## 16. Gaps, dead code, UNVERIFIED items

### Confirmed defects

1. **Sidebar badge `sbb-safety` is stale before first visit and never refreshes in the background** — §12. Worse than the Compliance case: this module has *no* tick-engine hook at all, so an operator who never opens the page sees `0` next to "Safety" indefinitely.

2. **No way to create an incident.** `DB.incidents` is only ever `.find()`-ed (`L13450`, `L13469`, `L13477`) and `.filter()`-ed. There is no `push`, no "log incident" button, no SOS ingestion path, no API. In a live system the queue could never receive anything. The three seeded records are the entire universe.

3. **No way to reopen a closed incident**, despite the confirm text at `L13480` explicitly promising "reopen it manually if new information comes in later". No handler exists.

4. **No way to lift a precautionary suspension.** `precautionSuspend` (`L13468`) writes a reason string starting with `"Precautionary"`, and the only deletion site in the file — Compliance's auto-lift (`L13312`) — requires the string to start with `"Expired"`. **A precautionary suspension is permanent for the life of the session.** Closing the incident does not lift it (`closeIncident`, `L13475`–`L13485`, never touches `DB.complianceSuspensions`).

5. **`filterSafety('all')` is unreachable from the UI.** `_safetyFilter` defaults to `'all'` (`L13395`) and the predicate has an `'all'` fall-through (`L13412`), but no tile calls `filterSafety('all')` — tile 4 navigates to Compliance instead. Once a user clicks any of tiles 1–3, **the only way back to the unfiltered list is a full page reload** (the filter also survives navigating away and back, `L8798`).

6. **KPI 2 / filter 2 mismatch.** The tile counts `open.filter(severity==='critical')` (`L13401`) but the filter it triggers matches `i.severity==='critical'` regardless of status (`L13410`). Clicking a tile reading "1" could list more than one card as soon as any critical incident is closed. Invisible in seed data.

7. **KPI 3 "Closed this month" has no month filter** (`L13402`) — it counts every closed incident in `DB.incidents`. The data model has no closable-date field, so the label cannot be made true without a schema change.

8. **The list never sorts by severity** (`L13415`) — only open-before-closed. A `high` incident can render above a `🆘 CRITICAL` one. Today the seed order happens to put INC-014 first, masking the bug.

9. **`toggleIncStep` permission denial leaves the checkbox visually flipped.** The gate at `L13449` returns before `renderSafetyPage()` (`L13462`), so the DOM checkbox keeps the state the browser already applied while `DB.incidents` is unchanged — the UI lies until the next render.

10. **Un-ticking a step destroys its attribution irrecoverably.** `inc.steps[step]={done:false}` (`L13459`) replaces the object wholesale, discarding `by`/`at`. Re-ticking writes the *current* user and `'Just now'`, so the record of who originally performed the step is lost. This defeats the "accountability trail" the source comment claims at `L13444`–`L13446`.

11. **`precautionSuspend` force-completes protocol step `act` without an audit entry for that step.** `L13470` overwrites `inc.steps.act` (including any prior `by`/`at`) but only `logAction('precaution_suspend',…)` is written (`L13472`) — no matching `logAction('incident_step',…)`. The Activity log therefore shows a step count changing with no step event.

12. **Inconsistent permission gating between the two destructive actions.** `precautionSuspend` requires `approve_drivers` **and** `safety.suspend` (`L13465`–`L13466`); `closeIncident` requires only `safety.close` (`L13476`) — no broad-permission check. `toggleIncStep` requires only `safety.update_steps` (`L13449`).

13. **`safety.view` permission declared but never enforced** (`L10609`; no `canPage('safety','view')` call exists).

14. **`before`/`after` audit diffs are empty for two of three actions.** `incident_step` → `before={}` (`L13456`, `L13460`); `precaution_suspend` → `before={}` (`L13472`). Only `close_incident` populates both (`L13483`).

15. **Dangling trip references.** `TRP-8977` (INC-013) and `TRP-8720` (INC-011) exist only in `DB.incidents` and `DB.lostFound` (`L14450`–`L14451`) — **neither is a key in `DB.trips`**. Clicking **Open trip** on INC-013 therefore hits `resolveId()`'s null path and produces `toast('No record for TRP-8977','err')` instead of opening anything. Only `TRP-9012` (INC-014) resolves (`L2680`). INC-011 is closed so its button never renders — meaning **one of the two reachable "Open trip" buttons is broken.**

16. **`'Normal'` severity has no producer.** `L13429`'s third branch is unreachable with today's data, and there is no UI to set a severity at all.

17. **`incident` is a first-class `entityType` in the audit log** (`'incident'`, `L13456`, `L13483`) but incidents are not in `resolveId()`'s bucket list (`L3270`), so an audit row for an incident cannot be clicked through to its record.

18. **Per-card `min-width:260px` on the step column** (`L13436`) with no media query — on a narrow viewport the header row wraps (`flex-wrap:wrap`, `L13430`) but the step column cannot shrink below 260px.

### Dead code

- None found in this module. Every function defined between `L13389` and `L13485` (`filterSafety`, `renderSafetyPage`, `toggleIncStep`, `precautionSuspend`, `closeIncident`) has at least one live call site. (Contrast Compliance's `markDocRenewed`, `L13370`.)

### UNVERIFIED

- **Whether an SOS ingestion path was intended to exist elsewhere** (e.g. a driver/rider app webhook) — nothing in the file suggests one; `DB.incidents` has no writer. `UNVERIFIED — no evidence either way in the source.`
- **Whether `severity` was intended to be derived from `type`** (e.g. `SOS ⇒ critical`) — the seed data is consistent with that mapping, but no code implements it. `UNVERIFIED — no mapping exists in the file.`
- **Whether the `-1` age sentinel in the Work Inbox (`L19191`) is interpreted as "highest priority" or as a malformed value** — this depends on `wi()`'s internals, which belong to the Inbox module. `UNVERIFIED from within this module — see the Inbox module documentation.`
- **Real-world adequacy of the four-step protocol as an incident-response procedure** — a domain judgment, not a source fact. `UNVERIFIED — out of scope of the file.`

---

## 17. Line-number index

| Lines | Contents |
|---|---|
| `L518` | Sidebar nav item + `sbb-safety` badge span |
| `L1252`–`L1263` | Page markup (`p-safety`) |
| `L1258` | `#safety-open-count` badge (initial `"0 open"`) |
| `L1259` | `#safety-list` container |
| `L2168` | `titles.safety` |
| `L2169` | `subs.safety` |
| `L3126`–`L3132` | `requirePerm()` |
| `L3133`–`L3150` | `logAction()` |
| `L3266`–`L3275` | `resolveId()` — buckets used by `openProfile` (**no `incidents` bucket**) |
| `L3565` | `nm2()` |
| `L5269` | `toast()` |
| `L7900`–`L7902` | i18n scope disclaimer |
| `L7908` | `nav.safety` Arabic string |
| `L7947` | i18n applier (`[data-i18n]` only) |
| `L8798` | Router → `renderSafetyPage()` |
| `L9400`–`L9401` | Central sidebar-badge updater (**does not include safety**) |
| `L9651`–`L9654` | `currentUserName()` |
| `L10608`–`L10613` | `PAGE_PERMISSIONS.safety` (view / update_steps / suspend / close) |
| `L10658`–`L10667` | `defaultPagePerms()` |
| `L10680`–`L10688` | `requirePagePerm()` |
| `L11968` | `setInterval(tickEngine,1000)` |
| `L12509`–`L12624` | `tickEngine()` — **contains no safety hook** |
| `L12513` | `refreshInbox()` every 20 ticks (reads incidents, updates `sbb-inbox` only) |
| `L13383`–`L13388` | Module header comment |
| `L13389`–`L13393` | **`DB.incidents`** seed (INC-014, INC-013, INC-011) |
| `L13394` | **`INC_STEPS`** — the four-step protocol |
| `L13395` | `_safetyFilter` |
| `L13396` | `filterSafety()` |
| `L13397`–`L13441` | **`renderSafetyPage()`** |
| `L13399`–`L13404` | KPI tiles |
| `L13405` | `#safety-open-count` assignment |
| `L13406` | `sbb-safety` assignment |
| `L13408`–`L13413` | Filter predicate |
| `L13414` | Empty state |
| `L13415` | Sort (open before closed) |
| `L13416`–`L13424` | Step progress + checkboxes |
| `L13429` | **Severity badge scale** |
| `L13431` | Critical-open row tint |
| `L13432`–`L13435` | Card header, summary, meta |
| `L13436`–`L13440` | Action row (open incidents only) |
| `L13442`–`L13447` | Step-toggle rationale comment |
| `L13448`–`L13463` | **`toggleIncStep()`** |
| `L13464`–`L13474` | **`precautionSuspend()`** |
| `L13475`–`L13485` | **`closeIncident()`** |
| `L13311`–`L13312` | Compliance's auto-lift (never matches "Precautionary") |
| `L13404` | KPI 4 → `go('compliance')` |
| `L13468` | Write into `DB.complianceSuspensions` |
| `L13473` | Clickable toast → Compliance |
| `L14222`–`L14224` | `subHealthScore()` reads open incidents |
| `L14294`–`L14296` | `driverRiskScore()` reads open incidents |
| `L14340`–`L14353` | `renderPredIncidents()` — repeat-pattern rule (≥ 2) + **Review** → Safety |
| `L14375` | Predictive total-signals count including incidents |
| `L14450`–`L14451` | `DB.lostFound` — the other holder of `TRP-8977` / `TRP-8720` |
| `L14520`–`L14544` | `kpiGo` / `kpiScrollTo` |
| `L14672`, `L14695`, `L14711` | Safety-adjacent reason codes (Contacts/SLA module) |
| `L19188`–`L19194` | Work Inbox — one row per open incident |
| `L19312` | `sbb-inbox` assignment (not `sbb-safety`) |
| `L21236`–`L21255` | `liveSubtitles()` (does **not** cover this page) |
