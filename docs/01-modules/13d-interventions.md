# Module: Interventions

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `interventions` · **Page div:** `#p-interventions`
> **HTML lines:** L2068–L2076
> **Primary render:** `renderInterventionsPage()` L10338–L10345
> **Router branch:** L8788 — `if(id==='interventions'){renderInterventionsPage();}`
> **Shared builder:** `buildInterventionItems()` L9450–L9533 (also drives the dashboard widget `#dash-intervene`, L682)
> **⚠ This page has NO sidebar entry and no navigation link anywhere in the panel.** See §2.

---

## 1. Purpose

A **deprecated, mostly-decommissioned page**. Its own body copy explains why (L2071–L2072, hardcoded prose):

> "This page ran the same builder as the dashboard widget and rendered the same rows in two places — and at 59 items neither was a list anyone could work. That job now belongs to the **work inbox**, where every queue is sorted by deadline and carries an owner."

The page header repeats it (L2069): *"🚨 Interventions — Merged into the work inbox — one list, deadline-ordered, routed to your role"*.

What survives is one card, "Live trip interventions", justified in its own header note (L2075): *"kept here because these are trip-level actions, not queue items"*.

**Critically, the card still renders the full `buildInterventionItems()` output — including the SLA-ticket rows that the copy says were moved to the inbox.** The builder was never narrowed to trip-level items. See §17 G1.

---

## 2. Entry points & routing — how the page is reached

### 2.1 There is no UI path to this page

Grep of `intervention` across all 21,857 lines. ⚠ **Not exhaustive as scoped**: case-sensitive `grep -c "intervention"` returns **15** (this table omits L19054, which G2 discusses separately), and case-insensitive returns **24** (adding the capitalised page title and prose occurrences). The table below is the set of hits that *route to or render* this page:

| Line | Occurrence | Is it a navigation path? |
|---|---|---|
| L682 | Dashboard card `🚨 Needs intervention now` — its only button is `onclick="go('inbox',null)"` | **No** — it navigates to the **work inbox**, not here |
| L1721 | Unrelated prose in Settings › Pricing | No |
| L2068 | `<div class="page" id="p-interventions">` | Page markup |
| L2075 | `Live trip interventions` card | Page markup |
| L2168 | `titles.interventions = 'Interventions'` | Title map only |
| L2169 | `subs.interventions = 'Live requests + red-readiness upcoming trips'` | Subtitle map only |
| L3228 | `PERMISSION_LABELS.live_ops = 'Live map operations & intervention'` | Unrelated label |
| L8788 | `if(id==='interventions'){renderInterventionsPage();}` | Router branch — **reachable only if `go('interventions', …)` is called** |
| L10441 | Comment `/* needs intervention now — the two genuinely urgent live feeds */` inside `renderDashboard` | No |
| L11510 | Comment referencing the dashboard intervention card | No |
| L18041 | A `forceResync` gate consequence string | No |
| L18832 | Comment mentioning "the interventions page" | No |
| L19048 | `['support','commitment','fairness','dashboard','interventions'].forEach(…)` in `refreshOwnershipSurfaces` (L19045–L19057) | Refresh only — and it is **dead**, see G2 |
| L21536 | `'ops intervention'` surge-suspension reason string | No |

**No `<div class="sb-item" onclick="go('interventions',…)">` exists.** The sidebar (L487–L540) has entries for `wallets`, `rwallets`, `support`, `contacts`, `inbox` (**L496**) etc., but none for `interventions`.
**No `go('interventions', …)` call exists anywhere in the file.**

### 2.2 The only ways to reach it

| # | Path | Mechanism |
|---|---|---|
| 1 | **Developer console / bookmarklet** — `go('interventions', null)` | `window.go` is global (L8774). This is the only realistic route. |
| 2 | **The Back button, after arriving via route 1** | `goBack()` (L7012) pops `navStack`; `pushHistory()` (L7006) pushes `navCurrent` on every `go()` that is not `isBack`. So once route 1 is used, the page becomes a legitimate history entry. |
| 3 | **Never via URL** | There is no hash router, no `location.hash` handling, and no deep-link parser anywhere in the file. |

### 2.3 It still renders even though it is unreachable

| Trigger | Line | Effect |
|---|---|---|
| Boot | L14587 | `renderInterventionsPage()` is called in the boot sequence, filling `#iv-page-list` and `#iv-page-count` in a hidden page |
| Every `renderDashboard()` | L10447 | `if(typeof renderInterventionsPage==='function')renderInterventionsPage();` — runs unconditionally, whichever page is on screen |
| Every 60 ticks (≈60 s) | L12614 | `tickEngine` → `renderDashboard()` → L10447. The same block first decrements `minutesUntil` on every `DB.upcomingSubTrips` entry (L12612), so intervention urgency shifts once a minute. |
| Trip completion | L12471 | `completeTrip` → `renderDashboard()` → L10447 |
| Driver accepts an offer | L12486 | `driverAcceptOffer` → `renderDashboard()` |
| Manual request assignment | L11900 | `commitRequestAssign` → `renderDashboard()` |
| L8496 | (assignment flow) | → `renderDashboard()` |

So the page's DOM is kept perpetually current for a page nobody can open.

### 2.4 Toolbar strings if it *is* opened

| Element | Value | Line |
|---|---|---|
| `#tb-title` | `Interventions` | L2168 |
| `#tb-sub` | `Live requests + red-readiness upcoming trips` | L2169 — **stale**: the builder now also emits SLA-ticket rows, which are neither requests nor readiness items |

**No page-level permission gate.**

---

## 3. Layout map

```
#p-interventions                                                  L2068
├── .ph                                                           L2069
│   └── .ph-l → <h1>🚨 Interventions</h1>
│              <p>Merged into the work inbox — one list,
│                 deadline-ordered, routed to your role</p>
├── .card   (deprecation notice — static, no id)                  L2070
│   └── <div style="padding:20px;font-size:12px;color:var(--muted);line-height:1.85">
│       ├── prose paragraph                                       L2071–L2072
│       └── <button class="btn p sm" onclick="go('inbox',null)">
│              Go to the work inbox</button>                      L2073
└── .card   "Live trip interventions"                             L2075
    ├── .ch → <h2>Live trip interventions</h2>
    │         <span class="b b-red" id="iv-page-count">0</span>
    │         <span …>kept here because these are trip-level
    │                 actions, not queue items</span>
    └── #iv-page-list   style="max-height:360px;overflow-y:auto"
        ← renderInterventionsPage() L10338
```

The page has **two cards, one button of its own, one badge, and one list.** No KPI row, no table, no filters, no search, no export.

---

## 4. Data model & fields

`buildInterventionItems()` reads from three collections and writes to none. It is a **pure read + HTML string builder** (L9450–L9533).

### 4.1 `DB.tickets[]` — SLA source (branch 0)

| Field consumed | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `reasonCode` | String | — | Drives `rcLabel()` in the row title and `rcTargets()` inside `slaState` | L9464 |
| `openedAtMs` | Number | ms epoch | Clock origin. `slaState` returns `null` without it → the ticket is skipped | L14767 |
| `firstResponseAtMs` | Number \| null | ms | Human first reply | L14770 |
| `lastUpdateAtMs` | Number \| null | ms | Recurring-update clock origin | L14774 |
| `resolvedAtMs` | Number \| null | ms | Closes the item (`s.closed` → skipped) | L14771 |
| `pausedMs` / `pausedSinceMs` | Number / Number\|null | ms | Paused items are skipped entirely (L9457) | L14769 |
| `id` | String | — | Row sub-line and `openTicketDetail()` argument | L9463 |
| `entityName` | String | — | Row sub-line | L9463 |
| `subject` | String | — | Row sub-line | L9463 |

### 4.2 `DB.rideRequests[]` — instant-request source (branch 1)

| Field consumed | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `data-req` attribute on the live-updating waiting span; `assignManually()` argument | L9481, L9485 |
| `status` | String enum | — | `'searching'` \| `'no_drivers'` \| (`'assigned'` never persists — assigned requests are spliced out, L11897) | L9477 |
| `waiting` | String `"M:SS"` | mm:ss | Elapsed wait, rendered inside `<span class="js-wait" data-req="…">` and **updated in place every tick** by L12576–L12579 without re-rendering the row | L9481 |
| `rider` | String | — | `nm2()` for the display name; `openProfile()` target | L9482 |
| `pickup` / `dest` | String | — | Route line, joined with ` → ` (U+2192) | L9482 |

Seeded values (L2787–L2789):

| id | rider | pickup → dest | type | waiting | status | requestedAt |
|---|---|---|---|---|---|---|
| `REQ-501` | `RDR-2090` | Al Sahafa District → King Saud University | Economy | `0:38` | `searching` | 25 Jun 08:36 |
| `REQ-502` | `RDR-1060` | Al Wurud District → Kingdom Tower | Comfort | `1:12` | `searching` | 25 Jun 08:02 |
| `REQ-503` | `RDR-2031` | KAFD → Airport T5 | Comfort | `2:40` | `no_drivers` | 25 Jun 07:34 |

### 4.3 `DB.upcomingSubTrips[]` — subscription-trip source (branch 2)

| Field consumed | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `showNearbyDriversMap()` context id (`UST-*`) | L9514 |
| `driver` | String \| falsy | — | Missing or not in `DB.drivers` → scenario `unassigned` | L8293 |
| `driverStatus` | String enum | — | `'moving'` \| `'not_started'` \| `'unavailable'` | L8299, L8304, L8314 |
| `unavailReason` | String | — | Appended to the scenario banner (not shown on this page's rows) | L8301 |
| `minutesUntil` | Number | minutes | Urgency driver. **Decremented by 1 every 60 ticks** (L12612). Defaults to `999` in the builder when not a number (L9501) | L9501 |
| `riderConfirmed` | Boolean | — | Feeds `unconfirmed` / `watch_confirm` scenarios — **neither of which this page renders** | L8309, L8319 |
| `rider` | String | — | `nm2()` display + `openProfile()` + `showNearbyDriversMap()` first argument | L9509, L9511 |
| `route` | String | — | Row sub-line | L9509 |

### 4.4 Derived objects

**`ivUrgencyLabel(mins)` return** (L9443–L9448): `{txt: String, color: CSS var, weight: String}`.

**`tripScenario(t)` return** (L8291–L8328): `{key, color, banner, sub, primary}` — see §6.2.

**Sort record** pushed into `critical[]` / `watch[]`: `{html: String, sort: Number}` (L9470–L9471, L9487–L9488, L9516–L9517).

### 4.5 Module constants

| Constant | Value | Unit | Line |
|---|---|---|---|
| `IV_CRITICAL_MINS` | `30` | minutes | L9440 |
| `IV_WATCH_MINS` | `60` | minutes | L9441 |

---

## 5. Formulas — written out exactly

### F1 — Urgency label (`ivUrgencyLabel`, L9443–L9448)
```js
function ivUrgencyLabel(mins){
  if(mins<=15) return {txt:'in '+mins+' min',                    color:'var(--red)',      weight:'700'};
  if(mins<=30) return {txt:'in '+mins+' min',                    color:'var(--red)',      weight:'600'};
  if(mins<=60) return {txt:'in '+mins+' min',                    color:'var(--amber-dk)', weight:'600'};
  return         {txt:'in ~'+Math.round(mins/60)+'h',            color:'var(--muted)',    weight:'400'};
}
```
Four bands. Note the first two produce **identical text** and differ only in font weight (700 vs 600).

### F2 — SLA branch classification (L9452–L9474)
```js
s        = slaState(t);                       // L14766
if(!s || s.closed || s.paused) return;        // skipped entirely
breached = s.frBreached || s.resBreached || s.updBreached;
atRisk   = !breached && s.resPct >= DB.slaPolicy.atRiskPct;   // atRiskPct = 75  (L14657)
if(!breached && !atRisk) return;

if(breached) critical.push({html:html, sort:0});
else         watch.push   ({html:html, sort:500});
```
**Every breached ticket gets `sort:0` and every at-risk ticket gets `sort:500`** — no differentiation within either group.

### F3 — Instant-request classification (L9476–L9488)
```js
nd = (r.status === 'no_drivers');
if(nd) critical.push({html:html, sort:0});
else   watch.push   ({html:html, sort:999});
```
**No filter at all** — every entry in `DB.rideRequests` becomes a row, `searching` or not, regardless of how long it has waited.

### F4 — Subscription-trip classification (L9490–L9517)
```js
scCfg = {
  unassigned:  {icon:'🚫',  label:'No driver assigned', alwaysCritical:true },
  unavailable: {icon:'⛔',  label:'Driver unavailable',  alwaysCritical:false},
  late:        {icon:'⚠️', label:'Driver not moving',   alwaysCritical:false}
};

sc = tripScenario(t);
if(!sc || !scCfg[sc.key]) return;             // ok / unconfirmed / watch / watch_confirm are DROPPED
cfg  = scCfg[sc.key];
mins = (typeof t.minutesUntil === 'number') ? t.minutesUntil : 999;
ul   = ivUrgencyLabel(mins);

isCritical = cfg.alwaysCritical || (mins <= IV_CRITICAL_MINS);   // 30
isWatch    = !isCritical && (mins <= IV_WATCH_MINS);             // 60
if(!isCritical && !isWatch) return;                              // > 60 min → Readiness page's problem

if(isCritical) critical.push({html:html, sort:mins});
else           watch.push   ({html:html, sort:mins});
```

### F5 — Sort and assembly (L9519–L9532)
```js
critical.sort(function(a,b){ return a.sort - b.sort; });
watch   .sort(function(a,b){ return a.sort - b.sort; });

result = [];
if(critical.length) result = result.concat(critical.map(x => x.html));
if(watch.length){
  if(critical.length) result.push(
    '<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:var(--bg2);'
   +'border-top:.5px solid var(--border);border-bottom:.5px solid var(--border)">'
   +'<span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;'
   +'color:var(--amber-dk)">⏱ Watch — action needed within the hour</span></div>'
  );
  result = result.concat(watch.map(x => x.html));
}
return result;
```
Ascending `sort`. The "⏱ Watch — action needed within the hour" separator is **only inserted when the critical list is non-empty** — a watch-only list renders with no header at all.

**Sort-key collision:** breached SLA tickets (`sort:0`) and `no_drivers` requests (`sort:0`) tie with each other and with any subscription trip whose `minutesUntil` is `0`. `Array.prototype.sort` stability then decides, i.e. push order: SLA → requests → sub-trips.

**Scale mismatch:** in the `watch` bucket, at-risk SLA tickets carry `sort:500` and searching requests `sort:999`, while sub-trips carry raw `minutesUntil` (≤ 60). So every watch-tier sub-trip always sorts above every watch-tier ticket and request, irrespective of real urgency.

### F6 — Page count (`renderInterventionsPage`, L10342–L10343)
```js
iv = buildInterventionItems();
c  = document.getElementById('iv-page-count');
if(c) c.textContent = iv.length;
```
**`iv.length` counts HTML strings, not items** — when both tiers are populated, the separator `<div>` is included, so the badge over-reports by exactly 1 (see §17 G3).

### F7 — Dashboard count (identical builder, `renderDashboard` L10442–L10443)
```js
iv = buildInterventionItems();
document.getElementById('dash-intervene-count').textContent = iv.length;
```
Same off-by-one.

### F8 — Sidebar dashboard badge (`refreshNavCounts`, L9397–L9398) — **a third, different count**
```js
interv = (DB.rideRequests || []).length;
(DB.upcomingSubTrips || []).forEach(function(t){
  var sc = tripScenario(t);
  if(sc && (sc.key === 'unavailable' || sc.key === 'unassigned' || sc.key === 'late')) interv++;
});
put('sbb-dash', interv);
```
This omits SLA tickets, ignores the 60-minute window, and counts every ride request — so `#sbb-dash` and `#iv-page-count` routinely disagree (§17 G4).

### F9 — Countdown text inside the scenario banner (`tripScenario`, L8306, L8317)
```js
'pickup in ' + fmtCountdown(t.minutesUntil)
```
Used in `sc.banner`, which **this page never renders** — only the `scCfg` label and `ivUrgencyLabel` text appear on intervention rows.

### F10 — Waiting-timer live update (`tickEngine`, L12576–L12579)
```js
document.querySelectorAll('.js-wait').forEach(function(el){
  var r = (DB.rideRequests||[]).find(x => x.id === el.getAttribute('data-req'));
  if(r) el.textContent = r.waiting;
});
```
Runs **every tick (1 s)** and patches the text node in place — so the waiting counter on an intervention row ticks live while the rest of the row stays as last rendered.

### F11 — `minutesUntil` decrement (`tickEngine`, L12611–L12612)
```js
if(__tickCount % 60 === 0){
  (DB.upcomingSubTrips||[]).forEach(function(t){
    if(typeof t.minutesUntil === 'number' && t.minutesUntil > 0) t.minutesUntil--;
  });
  …
  if(typeof renderDashboard === 'function') renderDashboard();   // → renderInterventionsPage()
}
```
One simulated minute per real minute; floors at 0.

---

## 6. States & transitions

### 6.1 Page-level states (`renderInterventionsPage`, L10338–L10345)

| # | State | Condition | Rendered |
|---|---|---|---|
| P0 | **No-op** | `!document.getElementById('iv-page-list')` | `return;` — nothing happens (L10340) |
| P1 | **Populated** | `iv.length > 0` | `el.innerHTML = iv.join('')`; badge = `iv.length` |
| P2 | **All clear** | `iv.length === 0` | `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--green)">✓ All clear — nothing needs a human right now.</div>` (**L10344**); badge = `0` (L10343) |

The badge `#iv-page-count` keeps class `b b-red` in **every** state, including P2 — a green "all clear" list sits under a red `0` badge (§17 G5).

### 6.2 `tripScenario()` — the full 7-state machine (L8291–L8328)

Evaluated top-down; the first matching branch returns.

| # | `key` | Exact trigger condition | `color` | `primary` | Banner text | On this page? |
|---|---|---|---|---|---|---|
| 1 | `unassigned` | `!t.driver \|\| !DB.drivers[t.driver]` | `red` | `assign` | `No driver assigned to this trip yet` / sub: `Every driver below is a candidate — assign the best match now.` | **YES** — always critical |
| 2 | `unavailable` | `t.driverStatus === 'unavailable'` | `red` | `assign` | `<name> is unavailable[ — <unavailReason>]` / sub: `The assigned driver cannot make it. Assign a replacement now.` | **YES** — critical if `minutesUntil ≤ 30`, watch if `≤ 60` |
| 3 | `late` | `t.minutesUntil <= 30 && t.driverStatus === 'not_started'` | `red` | `call_current` | `<name> has not started moving — pickup in <fmtCountdown>` / sub: `Call the assigned driver first. Only reassign if they do not respond.` | **YES** — always critical (its own condition forces `mins ≤ 30`) |
| 4 | `unconfirmed` | `t.minutesUntil <= 60 && !t.riderConfirmed` | `amber` | `call_rider` | `This is not a driver issue — the rider has not confirmed yet` / sub: `<name> is already assigned and expected to move normally.` | **NO** — not in `scCfg`, silently dropped (L9500) |
| 5 | `watch` | `t.minutesUntil <= 90 && t.driverStatus === 'not_started'` | `amber` | `monitor` | `<name> has not left yet — pickup in <fmtCountdown>` / sub: `No action needed yet. These are backup options only.` | **NO** — dropped |
| 6 | `watch_confirm` | `!t.riderConfirmed && t.minutesUntil <= 180` | `amber` | `monitor` | `Awaiting rider confirmation — plenty of time left` / sub: `<name> is assigned and on track.` | **NO** — dropped |
| 7 | `ok` | fallback | `green` | `view` | `<name> is on track — no issue right now` / sub: `This trip is healthy. Only reassign if there is a real reason to.` | **NO** — dropped |

**Consequence of ordering:** a trip with `driverStatus:'not_started'` and `minutesUntil` between 31 and 90 resolves to `watch` (branch 5) — never `late` — and is therefore invisible to this page. Between 61 and 90 that is intentional (§ the builder's own comment). Between 31 and 60 it is a genuine gap: the builder's `IV_WATCH_MINS=60` band can never fire for a not-started driver, because branch 5 has already claimed the key (§17 G6).

### 6.3 Intervention tier states (the builder's own doc-comment, L9413–L9438)

Transcribed verbatim from the source:

> **🔴 CRITICAL NOW (in list, red)**
> - `no_drivers`: rider has been waiting with zero supply — every extra second is a failed SLA. Always critical.
> - no driver assigned (unassigned): same — trip is in <30 min and we have nobody yet.
> - driver unavailable / not moving: critical ONLY when pickup < 30 min away. Beyond that it's a Readiness concern, not a war-room emergency.
>
> **🟡 WATCH (in list, amber, lower in list)**
> - searching requests: SLA ticking but supply may appear.
> - driver issues with 30–60 min window: time to act before it becomes red.
>
> **⚪ READINESS (NOT in this list — they live in the Readiness page and the sub-trip requests panel on the Live map).**
> - driver unavailable / not moving with > 60 min to pickup. Showing these here would dilute the list with noise that doesn't need action in the next 15 minutes.
>
> Items within each tier are sorted by urgency (minutesUntil asc, waiting-timer desc for requests).

**The last sentence is not what the code does.** Requests are sorted by a constant (`0` or `999`), never by the waiting timer (F3, F5).

### 6.4 Row visual states

| Element | Critical | Watch |
|---|---|---|
| Row wrapper | `border-left:3px solid var(--red); padding-left:11px` (SLA/request rows apply it only when actually breached/`no_drivers`, L9461/L9478; sub-trip rows always apply a border, red or amber, L9507) | `border-left:3px solid var(--amber-dk)` (sub-trips only) |
| Icon class | `ai-r` | `ai-a` |
| Action button class | `btn sm danger` | `btn sm warn` |

### 6.5 Icons by source

| Source | Condition | Icon | Line |
|---|---|---|---|
| SLA ticket | breached | `⏰` | L9458 |
| SLA ticket | at risk | `⏱` | L9458 |
| Ride request | `no_drivers` | `🚫` | L9479 |
| Ride request | otherwise | `⏳` | L9479 |
| Sub-trip | `unassigned` | `🚫` | L9492 |
| Sub-trip | `unavailable` | `⛔` | L9493 |
| Sub-trip | `late` | `⚠️` | L9494 |

---

## 7. Reason codes / categories — full enumeration

This page has **no reason-code picker and writes no coded record.** Reason codes appear only as read-through display text.

### 7.1 The three intervention *sources* (the page's own taxonomy)

| # | Source branch | Collection | Builder lines | Comment header |
|---|---|---|---|---|
| 0 | SLA breaches | `DB.tickets` | L9452–L9474 | `/* ── 0) SLA breaches ── A promise we already broke outranks a trip we might still save. */` (L9451) |
| 1 | Instant ride requests | `DB.rideRequests` | L9476–L9488 | `/* ── 1) Instant ride requests ── */` |
| 2 | Upcoming subscription trips | `DB.upcomingSubTrips` | L9490–L9517 | `/* ── 2) Upcoming subscription trips ── */` |

### 7.2 Intervention types — the complete set of 8 row variants

| # | Type | Trigger (exact) | Tier | Icon | Title | Sub-line | Action button | Handler |
|---|---|---|---|---|---|---|---|---|
| **T1** | **SLA breached** | `slaState(t)` non-null, `!closed`, `!paused`, and (`frBreached \|\| resBreached \|\| updBreached`) | **Critical**, `sort:0` | `⏰` | `SLA breached — <rcLabel(t.reasonCode)>` | `<t.id> · <t.entityName> · <t.subject>` (blue, clickable) + `slaBadge(t)` on a third line | `Open ticket` (`danger`) | `openTicketDetail(t.id)` |
| **T2** | **SLA at risk** | same, plus `!breached && s.resPct >= 75` | **Watch**, `sort:500` | `⏱` | `SLA at risk — <rcLabel(t.reasonCode)>` | same | `Open ticket` (`warn`) | `openTicketDetail(t.id)` |
| **T3** | **No drivers found** | `r.status === 'no_drivers'` | **Critical**, `sort:0` | `🚫` | `No drivers found — <span class="js-wait"><r.waiting></span> waiting` | `<nm2(r.rider)> · <r.pickup> → <r.dest>` + red line `SLA at risk — assign immediately` | `Assign now` (`danger`) | `assignManually(r.id)` |
| **T4** | **Awaiting assignment** | any other `DB.rideRequests` entry (in practice `status === 'searching'`) | **Watch**, `sort:999` | `⏳` | `Awaiting assignment — <span class="js-wait"><r.waiting></span> waiting` | `<nm2(r.rider)> · <r.pickup> → <r.dest>` | `Assign now` (`warn`) | `assignManually(r.id)` |
| **T5** | **No driver assigned** | `tripScenario(t).key === 'unassigned'` (i.e. `!t.driver \|\| !DB.drivers[t.driver]`) | **Critical always** (`alwaysCritical:true`), `sort:minutesUntil` | `🚫` | `No driver assigned <span>· <ivUrgencyLabel(mins).txt></span>` | `<nm2(t.rider)> · <t.route>` | `Find driver` (`danger`) | `showNearbyDriversMap(t.rider, t.id)` |
| **T6** | **Driver unavailable — critical** | `driverStatus === 'unavailable'` **and** `minutesUntil <= 30` | **Critical**, `sort:minutesUntil` | `⛔` | `Driver unavailable <span>· <ul.txt></span>` | `<nm2(t.rider)> · <t.route>`; plus `Critical — pickup imminent` when `mins <= 15` | `Find driver` (`danger`) | `showNearbyDriversMap(t.rider, t.id)` |
| **T7** | **Driver unavailable — watch** | `driverStatus === 'unavailable'` **and** `30 < minutesUntil <= 60` | **Watch**, `sort:minutesUntil` | `⛔` | `Driver unavailable <span>· <ul.txt></span>` | `<nm2(t.rider)> · <t.route>` | `Find driver` (`warn`) | `showNearbyDriversMap(t.rider, t.id)` |
| **T8** | **Driver not moving** | `tripScenario(t).key === 'late'`, i.e. `minutesUntil <= 30 && driverStatus === 'not_started'` | **Critical always** (its own trigger caps `mins` at 30), `sort:minutesUntil` | `⚠️` | `Driver not moving <span>· <ul.txt></span>` | `<nm2(t.rider)> · <t.route>`; plus `Critical — pickup imminent` when `mins <= 15` | `Find driver` (`danger`) | `showNearbyDriversMap(t.rider, t.id)` |

**T8 has no watch variant** — the `late` scenario key cannot exist above 30 minutes (§6.2).

### 7.3 Scenarios explicitly **excluded** from this page — 4

| `tripScenario` key | Why excluded | Where it surfaces instead |
|---|---|---|
| `unconfirmed` | not a key in `scCfg` (L9492–L9496) | Trip Readiness page; `scenarioBannerHTML` CTA `callRiderConfirm` (L8341) |
| `watch` | not in `scCfg` | Trip Readiness |
| `watch_confirm` | not in `scCfg` | Trip Readiness |
| `ok` | not in `scCfg` | nowhere — healthy trips need no row |

Plus the **> 60-minute cut-off** (L9504): any `unavailable` trip more than an hour out is dropped by design.

### 7.4 SLA badge states shown on T1/T2 rows (`slaBadge`, L14791–L14802)

Only the non-closed, non-paused variants can appear here (closed and paused tickets are filtered out at L9457):

| Badge | Condition |
|---|---|
| `⚠ No first response — <fmtAge> over` (red, 700) | `s.frBreached` |
| `⚠ Update overdue by <fmtAge>` (red, 700) | `s.updBreached` |
| `⚠ SLA breached — <fmtAge> over` (red, 700) | `s.resBreached` |
| `⏱ <fmtAge> to breach` (`var(--amber-dk)`, 600) | `s.resPct >= 75` |
| `↩ respond within <fmtAge>` (blue, 600) | `!firstResponseAtMs && frLeftMs < 1e12` (L14800) — ⚠ **unreachable on this page.** `slaBadge` returns one line earlier at **L14799** on `s.resPct >= DB.slaPolicy.atRiskPct`, which is exactly the condition that puts a ticket in the T2 *at-risk* row in the first place. A T1 (breached) row is caught earlier still. So of the five states listed here only **four** can appear. `L14801`'s fallback `<fmtAge> left` is unreachable here for the same reason. |

### 7.5 Reason-code vocabulary reached through `rcLabel()`

T1/T2 titles render `rcLabel(t.reasonCode)` = `(ref ? ref+' · ' : '') + labelEn` (L14743) drawn from the 40-entry `DB.reasonCodes` registry (L14667–L14716; last entry L14715). The full enumeration is documented in `13c-contact-drivers.md` §7.1 and `12c-rider-wallets.md` §7.3; this page consumes it read-only and cannot change it.

---

## 8. KPIs & metrics

**The page has no KPI row.** Its only numeric output is one badge.

| # | Element | Formula | Source | Threshold / colour |
|---|---|---|---|---|
| 1 | `#iv-page-count` | `buildInterventionItems().length` (F6) — **HTML-string count, including the watch separator** | `DB.tickets` + `DB.rideRequests` + `DB.upcomingSubTrips` | Class `b b-red`, hardcoded in the markup (L2075); **never changes**, even at `0` |

### Related counters elsewhere that use the same data but different maths

| Element | Where | Formula | Line |
|---|---|---|---|
| `#dash-intervene-count` | Dashboard card | Identical to F6 — `iv.length` | L10442 |
| `#sbb-dash` | Sidebar Dashboard badge | F8 — ride-request count + red-scenario sub-trips; **no SLA tickets, no time window** | L9397–L9399 |
| `#dash-alerts-count` | Dashboard alerts card | Separate `alerts[]` array built in `renderDashboard` | L10412 |

---

## 9. Data displayed

### 9.1 Page chrome (all hardcoded HTML)

| Element | Source | Type | Line |
|---|---|---|---|
| `<h1>🚨 Interventions</h1>` | hardcoded | String | L2069 |
| `<p>Merged into the work inbox — one list, deadline-ordered, routed to your role</p>` | hardcoded | String | L2069 |
| Deprecation paragraph (`This page ran the same builder as the dashboard widget…`) | hardcoded | String | L2071–L2072 |
| `<h2>Live trip interventions</h2>` | hardcoded | String | L2075 |
| `kept here because these are trip-level actions, not queue items` | hardcoded | String | L2075 |
| `#tb-title` | `titles.interventions` | String | L2168 |
| `#tb-sub` | `subs.interventions` | String | L2169 |
| **No `data-i18n` attribute anywhere on this page** | — | — | L2068–L2076 |

### 9.2 Row content by type

| Element | DB path / computed | Type | Notes |
|---|---|---|---|
| T1/T2 title | `rcLabel(DB.tickets[i].reasonCode)` | String | Prefixed `SLA breached — ` / `SLA at risk — ` |
| T1/T2 sub | `t.id`, `t.entityName`, `t.subject` joined by ` · ` | String | `cursor:pointer; color:var(--blue)`, clicking opens the ticket |
| T1/T2 third line | `slaBadge(t)` — §7.4 | HTML | 10px |
| T3/T4 title | `'No drivers found'` \| `'Awaiting assignment'` + ` — ` + `r.waiting` + `' waiting'` | String | `r.waiting` lives in `<span class="js-wait" data-req="<id>">` and is patched every second (F10) |
| T3/T4 sub | `nm2(r.rider)` + `' · '` + `r.pickup` + `' → '` + `r.dest` | String | Blue, `openProfile(r.rider)` |
| T3 extra line | `'SLA at risk — assign immediately'` | String | Hardcoded, `var(--red)`, weight 600 |
| T5–T8 title | `scCfg[key].label` + `<span>· <ivUrgencyLabel(mins).txt></span>` | String | Span styled with the label's own `color` and `weight` |
| T5–T8 sub | `nm2(t.rider)` + `' · '` + `t.route` | String | Blue, `openProfile(t.rider)` |
| T6/T8 extra line | `'Critical — pickup imminent'` | String | Only when `isCritical && mins <= 15`; hardcoded, red, 600 |
| Watch separator | `'⏱ Watch — action needed within the hour'` | String | Hardcoded, uppercase, `var(--amber-dk)`, weight 700, background `var(--bg2)` |
| Empty state | `'✓ All clear — nothing needs a human right now.'` | String | Hardcoded, `var(--green)`, centred, 18px padding |

**Fields deliberately not shown on any row:** `sc.banner`, `sc.sub`, `t.unavailReason`, `r.type`, `r.requestedAt`, `t.scheduledTime`, `t.notes`, `t.sub`, `t.driver`.

---

## 10. Input fields

**This page has zero input fields.** No `<input>`, `<textarea>`, `<select>` or custom select appears between L2068 and L2076, and `buildInterventionItems()` (L9450–L9533) emits none.

All fields reachable *from* the page belong to the modals its action buttons open (§13), which are owned by other modules.

---

## 11. Actions

| # | Label | Location | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|---|
| A1 | `Go to the work inbox` | deprecation card L2073 | `go('inbox',null)` | Navigates to the Work Inbox page; `pushHistory()` records the departure | — | **none** | none | no |
| A2 | `Open ticket` (T1/T2) | L9469 | `openTicketDetail(t.id)` L8879 | Navigates to the ticket-detail page | — | UNVERIFIED (body not read) | — | no |
| A3 | T1/T2 sub-line (blue text) | L9463 | `openTicketDetail(t.id)` | Same as A2 | — | UNVERIFIED | — | no |
| A4 | `Assign now` (T3/T4) | L9485 | `assignManually(r.id)` L11871 | See A4-detail | `DB.rideRequests[i].claimedBy`, `.claimedAt`; then opens the driver picker | **none on `assignManually` itself** — `requirePerm('live_ops')` is only on the downstream `commitRequestAssign` (L11884) | none at this step; `logAction('manual_assign',…)` fires later on commit (L11902) | no at this step |
| A5 | T3/T4 sub-line (blue text) | L9482 | `openProfile(r.rider)` | Navigates to the rider 360° profile | — | none | none | no |
| A6 | `Find driver` (T5–T8) | L9513 | `showNearbyDriversMap(t.rider, t.id)` L8354 | Opens the unified nearby-driver picker in a modal, with `window._ndvCtx = {kind:'ust', id:t.id, riderId:t.rider}` | `window._ndvCtx` | **none** | none | no |
| A7 | T5–T8 sub-line (blue text) | L9509 | `openProfile(t.rider)` | Navigates to the rider profile | — | none | none | no |

### A4-detail — `assignManually(id)` L11871–L11879
```js
r = DB.rideRequests.find(x => x.id === id);
if(!r) return;
if(r._locking){ toast('Already assigning a driver to this request…','info'); return; }
if(r.claimedBy && r.claimedBy !== currentUserName()){
  toast('🔒 ' + r.claimedBy + ' is already handling this request — check with them before acting on it.','warn');
  return;
}
r.claimedBy = currentUserName();
r.claimedAt = 'Just now';
renderRequestsPage(); renderRideRequests();
showNearbyDriversMap(r.rider, id);
```
Two soft locks: an in-flight `_locking` flag and a `claimedBy` ownership claim. Neither is audit-logged. **Note it calls `renderRequestsPage()` and `renderRideRequests()` but not `renderInterventionsPage()`**, so the row the operator just clicked is not refreshed on this page (§17 G7).

### A6-detail — `showNearbyDriversMap(riderId, ustId)` L8354+
Context is inferred from the id prefix (comment L8357–L8360): *"ustId doubles as a context id — UST-* (upcoming subscription trip), REQ-* (instant ride request), TRP-* (live trip reassign). Commit is dispatched per kind by `pickNearbyDriver()`."*
```js
req   = /^REQ-/ .test(ctxId) ? DB.rideRequests.find(…)          : null;
liveT = /^TRP-/ .test(ctxId) ? DB.liveTrips.find(…)             : null;
t     = /^UST-/ .test(ctxId) ? DB.upcomingSubTrips.find(…)      : null;
sreq  = /^SREQ-/.test(ctxId) ? DB.subscriptionRequests.find(…)  : null;
window._ndvCtx = {kind: req?'request': liveT?'live': t?'ust': sreq?'sreq':'', id: ctxId, riderId: riderId};
sc                 = tripScenario(t);
canAssign          = !!(t || req || liveT || sreq);
deprioritizeAssign = !!(sc && (sc.key==='watch' || sc.key==='watch_confirm' || sc.key==='unconfirmed' || sc.key==='ok'));
pinCurrent         = !!(sc && sc.key==='late' && t.driver && DB.drivers[t.driver]);
matchKind          = (t || sreq) ? 'sub' : 'quick';
nearby             = nearestAvailableDrivers(riderId, (t||liveT) ? 6 : 5, matchKind);
```
From this page `ustId` is always a `UST-` id, so `kind` is always `'ust'` and `matchKind` is always `'sub'`.

**Escalation state:** `urgentKey = sc && (unavailable || unassigned || late)`; `availableCount = nearby.filter(n => !n.live.busy).length`; `showEscalation = urgentKey && availableCount === 0` (L8378–L8380) — i.e. all three of this page's sub-trip types trigger the escalation panel when nothing is free.

**Pinned row (`late` only):** shows the currently assigned driver on an amber background with badge `📌 Assigned — not moving yet` and a `📞 Call now` button → `callDriverUrgent(t.driver, t.id)` (L8396). This is the page's indirect route into the call flow documented in `13c-contact-drivers.md`.

**Radius warnings** (L8374): `⛔ Eyvar isn't live in <city> yet — turn it on in Settings → Cities & Regions to allow matching there.` when `nearby.cityInactive`; `⚠ No driver within the configured <N> km radius — showing the closest available driver(s) beyond it.` when `nearby.expandedBeyondRadius`.

### Actions this page does **not** have

No dismiss, no snooze, no claim, no bulk action, no assign-to-me, no filter, no sort control, no export, no refresh button. Every row offers exactly one action button and two navigation links.

### Gate registry

`buildInterventionItems`, `renderInterventionsPage`, `assignManually` and `showNearbyDriversMap` do **not** appear in `installActionGates()` (L17853+) or `GATE_SWEEP` (L20769+). **Two** gated functions sit downstream, and one of them is on the page's *primary* action path:

| Downstream commit | Reached from | Gate |
|---|---|---|
| `assignNearestDriver(drvId, riderId, ustId)` **L8482** | T5–T8 sub-trip rows → `Find driver` → `showNearbyDriversMap` → `pickNearbyDriver` → `if(c.kind==='ust')` **L10246** | `requirePerm('live_ops')` **L8483** |
| `commitRequestAssign(reqId, drvId)` **L11884** | T3/T4 request rows → `Assign now` → `assignManually` → driver picker → `pickNearbyDriver` **L10247** | `requirePerm('live_ops')` **L11885** |

So the page's most-used action *is* permission-checked, two clicks away — the same distance as the request path. What remains true is that nothing on the page itself is gated, and no `confirmAction` dialog is raised anywhere in either chain.

---

## 12. Tables & lists

### 12.1 `#iv-page-list` — the only list on the page (L2075 / L10339)

| Property | Value |
|---|---|
| Markup | `<div id="iv-page-list" style="max-height:360px;overflow-y:auto"></div>` — scrolling div, **not a `<table>`** |
| Row source | `buildInterventionItems()` — a flat array of pre-built HTML strings from three collections |
| Row template | `.al-row` (the shared alert-row class also used by the dashboard alerts list, L10414) |
| Row structure | `.al-icon` (`ai-r` \| `ai-a`) · `.al-body` (`.al-title` + `.al-sub` + optional third line) · action `<button>` |
| Sort | Critical block (ascending `sort`), then the separator, then the watch block (ascending `sort`) — F5 |
| Grouping | One separator only: `⏱ Watch — action needed within the hour`, and **only if the critical block is non-empty** |
| Filters | **None** |
| Search | **None** |
| Pagination | **None** — `max-height:360px` + `overflow-y:auto` is the only containment |
| Row click | ⚠ **No whole-row handler — yet the row presents as clickable.** `.al-row` carries `cursor:pointer` and a `:hover{background:var(--bg2)}` rule (**L158–L160**), so the whole row invites a click that does nothing. Only the `.al-sub` text and the action button are independently clickable. This is a defect, not a layout fact. |
| Row actions | Exactly one per row: `Open ticket` (T1/T2), `Assign now` (T3/T4), `Find driver` (T5–T8) |
| Empty state | `<div style="padding:18px;text-align:center;font-size:11.5px;color:var(--green)">✓ All clear — nothing needs a human right now.</div>` (**L10344**) |
| Header badge | `#iv-page-count`, class `b b-red` (L2075) |

### 12.2 The dashboard twin — `#dash-intervene` (L682)

| Property | Value |
|---|---|
| Card title | `🚨 Needs intervention now` |
| Badge | `#dash-intervene-count`, class `b b-red` |
| Extra button | `Open the work inbox →` → `go('inbox',null)` |
| Container class | `grp-scroll` (vs the page's inline `max-height:360px`) |
| Row source | **Identical** — the same `buildInterventionItems()` call |
| Empty state | `<div style="padding:16px;text-align:center;font-size:11.5px;color:var(--green)">✓ All clear — nothing needs a human right now.</div>` (L10448) — same text, `16px` padding instead of `18px` |

This duplication is exactly what the page's own deprecation copy complains about (L2071), and it **still exists**: `renderDashboard()` renders the widget at L10448 *and* calls `renderInterventionsPage()` at L10447 in the same pass.

---

## 13. Modals opened

The page opens no modal directly. Its buttons hand off to modals owned by other modules.

### 13.1 Nearby-driver picker — `showNearbyDriversMap(riderId, ustId)` L8354
Reached from `Find driver` (A6) and, one hop later, from `Assign now` (A4 → `assignManually` → `showNearbyDriversMap`).

| Element | Content |
|---|---|
| Context | `window._ndvCtx = {kind, id, riderId}` |
| Radius notice | `⛔ Eyvar isn't live in <city> yet…` \| `⚠ No driver within the configured <N> km radius…` \| none (L8374) |
| Pinned row | `late` scenario only — `Currently assigned` label, driver avatar, name + tier badge (`gold`/`silver`), `★ <rating> · <vehicle> · <phone>`, badge `📌 Assigned — not moving yet`, button `📞 Call now` → `callDriverUrgent(t.driver, t.id)` (L8383–L8397) |
| Section label | `Backup options nearby` when a row is pinned (L8399) |
| Driver list | `nearestAvailableDrivers(riderId, 6, 'sub')` minus the currently assigned driver, sliced to 5 (L8373) |
| Assign button class | `btn sm` when `deprioritizeAssign`, else `btn p sm` (L8382) |
| Escalation panel | Shown when `urgentKey && availableCount === 0` (L8380) |
| Commit | Dispatched by `pickNearbyDriver()` per `_ndvCtx.kind`. Source note L11910–L11914: *"pickNearbyDriver is defined once, earlier in this file, and handles all four assign contexts — ust / request / live / sreq. A duplicate definition used to live here and silently overrode that one at load time, which is why 'Assign driver' on subscription requests never actually worked; removed as part of this stability pass."* |
| **UNVERIFIED** | The full modal body (fields, footer buttons) and `pickNearbyDriver`'s commit paths were not read end-to-end. |

### 13.2 Ticket detail — `openTicketDetail(id)` L8879
Reached from `Open ticket` (A2) and the T1/T2 sub-line (A3). A **page navigation**, not a modal (`titles['ticket-detail'] = 'Ticket Detail'`, L2168). **UNVERIFIED** — body not read.

### 13.3 Contact driver — `callDriverUrgent(driverId, ustId)` L8547
Reached only via the pinned row inside 13.1. Fully documented in `13c-contact-drivers.md` §13.6.

### 13.4 360° profile — `openProfile(id)` L8827
Reached from every row's sub-line. A page navigation.

---

## 14. States & badges

| Badge / indicator | Location | Exact trigger |
|---|---|---|
| `#iv-page-count` | Card header L2075 | `textContent = buildInterventionItems().length` (F6). Class `b b-red` is **static in the markup and never reassigned** — red even at `0` |
| `.al-icon.ai-r` (red icon chip) | every critical row | `breached` (T1) / `nd` (T3) / `isCritical` (T5–T8) |
| `.al-icon.ai-a` (amber icon chip) | every watch row | the negation of the above |
| Red left border `3px solid var(--red)` | T1 rows | `breached` only — an at-risk T2 row has **no** left border (L9461) |
| Red left border | T3 rows | `nd` only — a T4 row has no border (L9478) |
| Left border (always present) | T5–T8 rows | `var(--red)` when `isCritical`, `var(--amber-dk)` when watch (L9504–L9505) |
| `SLA at risk — assign immediately` | T3 rows | `r.status === 'no_drivers'` (L9483) |
| `Critical — pickup imminent` | T6/T8 rows | `isCritical && mins <= 15` (L9510) |
| `⏱ Watch — action needed within the hour` separator | between blocks | `watch.length > 0 && critical.length > 0` (L9524) |
| `slaBadge(t)` | T1/T2 rows | §7.4 |
| `📌 Assigned — not moving yet` | inside modal 13.1 | `sc.key === 'late'` and the driver exists (L8393) |
| **No sidebar badge** | — | The page has no sidebar item at all (§2.1) |

### Toasts emitted from this page's own actions

| Text | Type | Source | Line |
|---|---|---|---|
| `Already assigning a driver to this request…` | info | `assignManually` when `r._locking` | L11874 |
| `🔒 <claimant> is already handling this request — check with them before acting on it.` | warn | `assignManually` ownership guard | L11875 |

Everything else (`Assigning <name>…`, `✅ <name> assigned to <REQ-id>`, `❌ Could not assign…`) comes from `commitRequestAssign` (L11893, L11903, L11907), two clicks downstream.

---

## 15. Cross-module links

### 15.1 Outbound

| Target module | Trigger | Line |
|---|---|---|
| **Work Inbox** (`inbox`) | `Go to the work inbox` button | L2073 |
| **Support Center / Ticket detail** | `Open ticket` and the T1/T2 sub-line | L9463, L9469 |
| **360° Profile** | every row's sub-line | L9482, L9509 |
| **Live map / driver picker** | `Find driver`, and `Assign now` → `assignManually` → `showNearbyDriversMap` | L9513, L11878 |
| **Contact drivers (call flow)** | `📞 Call now` on the pinned row inside the picker | L8396 |
| **Requests page** | `assignManually` calls `renderRequestsPage()` and `renderRideRequests()` | L11877 |
| **Settings › Cities & Regions** | referenced by the picker's `cityInactive` notice text | L8374 |

### 15.2 Inbound — who renders this page

| Caller | Line | Frequency |
|---|---|---|
| Router branch | L8788 | on `go('interventions',…)` |
| Boot sequence | L14587 | once |
| `renderDashboard()` | L10447 | every dashboard render |
| `tickEngine` 60-tick block → `renderDashboard()` | L12614 | every ~60 s |
| `tickEngine` no-signal branch (`t.lastPing===300`) → `renderDashboard()` | L12591 | per stalled live trip |
| `completeTrip` → `renderDashboard()` | L12471 | per completed trip |
| `driverAcceptOffer` → `renderDashboard()` | L12486 | per accepted offer |
| `commitRequestAssign` → `renderDashboard()` | L11900 | per manual assignment |
| L8496 (assignment flow) → `renderDashboard()` | L8496 | per assignment |
| `refreshOwnershipSurfaces()` | L19054 | **never — dead** (§17 G2) |

### 15.3 Shared state with other modules

| Collection | Also owned / written by |
|---|---|
| `DB.tickets` | Support Center (`13a`), Contact Drivers (`13c` — `slaSweep`, `slaStampNewTicket`, mass events) |
| `DB.rideRequests` | Requests page (`07c`), Quick Rides (`06b`), the dispatch engine in `tickEngine` (L12560–L12572) |
| `DB.upcomingSubTrips` | Trip Readiness (`07b`), Subscriptions (`05a` — driver change cascade L5853), `logDriverCall` (L8563) |
| `DB.slaPolicy` | Settings › Reason codes & SLA |
| `DB.reasonCodes` | Settings › Reason codes & SLA |

---

## 16. Hardcoded / mock / demo values

| # | Value | Line | Note |
|---|---|---|---|
| M1 | `IV_CRITICAL_MINS = 30` | L9440 | Not configurable from Settings |
| M2 | `IV_WATCH_MINS = 60` | L9441 | Not configurable |
| M3 | `ivUrgencyLabel` bands `15 / 30 / 60` | L9444–L9447 | Inline literals |
| M4 | Watch sort key `500` for at-risk SLA tickets | L9471 | Magic number |
| M5 | Watch sort key `999` for searching requests | L9487 | Magic number |
| M6 | `mins` fallback `999` when `minutesUntil` is not a number | **L9501** | Pushes the row past the 60-minute cut-off — but **only for `unavailable`**. `unassigned` carries `alwaysCritical:true` (L9493), so `isCritical` at L9503 is true regardless of `mins` and the row is **kept**; `late` requires `minutesUntil<=30` to be classified at all (L8304) and so can never reach a `999` fallback. The silent drop is real for exactly one of the three scenarios. |
| M7 | `scCfg` icons `🚫 ⛔ ⚠️` and labels `No driver assigned` / `Driver unavailable` / `Driver not moving` | L9492–L9496 | Hardcoded |
| M8 | `'SLA at risk — assign immediately'` | L9483 | Hardcoded |
| M9 | `'Critical — pickup imminent'` | L9510 | Hardcoded |
| M10 | `'⏱ Watch — action needed within the hour'` | L9528 | Hardcoded |
| M11 | `'✓ All clear — nothing needs a human right now.'` | **L10344** and L10448 | **Duplicated string** in two renderers |
| M12 | Deprecation prose, including the figure **"59 items"** | L2071 | A snapshot from a past state of the demo data, not computed |
| M13 | `subs.interventions = 'Live requests + red-readiness upcoming trips'` | L2169 | Stale — omits SLA tickets |
| M14 | `#iv-page-count` class `b b-red` | L2075 | Static in markup |
| M15 | `DB.rideRequests` seed — 3 requests (`REQ-501/502/503`) | L2787–L2789 | Demo |
| M16 | `DB.upcomingSubTrips` seed — **`UST-1`…`UST-8`**, eight records, each preceded by its own `SCENARIO n` comment (`SCENARIO 1: Fully on track`, `SCENARIO 2: Rider NOT confirmed…`, `SCENARIO 3: Driver UNAVAILABLE — vehicle breakdown…`, and five more) | **L6177–L6241** (array opens L6177, closes L6241; `id:'UST-1'` L6179 … `id:'UST-8'` L6235) | Demo, explicitly authored to exercise each scenario |
| M17 | **A second, dead `DB.upcomingSubTrips` seed** | L6243–L6248 | `DB.upcomingSubTrips = DB.upcomingSubTrips \|\| [ … ]` — the array assigned at L6177 is already truthy, so this literal (4 different `UST-1`…`UST-4` records with different riders, times and statuses) **never executes**. Dead code. |
| M18 | `TICK_ACCEL` demo clock — `minutesUntil` decrements 1 per 60 real seconds | L12611–L12612 | Simulated time |
| M19 | All state is in-memory `DB.*`. **No persistence.** | — | Every intervention list is rebuilt from scratch on reload |

---

## 17. Gaps, dead code, UNVERIFIED items

| # | Item | Evidence |
|---|---|---|
| **G1** | **The page's copy contradicts its behaviour.** The card is titled "Live trip interventions" and justified as *"kept here because these are trip-level actions, not queue items"* (L2075), yet it renders the **unmodified** `buildInterventionItems()` output — branch 0 of which is SLA tickets, the archetypal queue item. Nothing narrows the builder for this page. | L2075 vs L9452–L9474, L10341 |
| **G2** | **`refreshOwnershipSurfaces` calls a function that does not exist.** L19054: `if((pg==='dashboard'\|\|pg==='interventions')&&typeof renderInterventions==='function')renderInterventions();` — grep for `renderInterventions` returns only `renderInterventionsPage`. The `typeof` guard makes it a silent no-op, so ownership/claim changes never refresh either the dashboard widget or this page. | L19054; `grep -n "renderInterventions\b"` finds no definition |
| **G3** | **`#iv-page-count` over-counts by one whenever both tiers are populated.** `iv.length` counts the watch-separator `<div>` as an item. | F5 L9524 vs F6 L10343 |
| **G4** | **Three counters over the same data disagree.** `#iv-page-count` (F6) and `#dash-intervene-count` (F7) include SLA tickets and apply the 60-minute window; `#sbb-dash` (F8) counts **all** ride requests plus red-scenario sub-trips with **no** window and **no** tickets. | L10343, L10442, L9397–L9399 |
| **G5** | **The count badge is permanently red.** `class="b b-red"` is written into the markup and never reassigned, so `0` renders in alert red directly above a green "All clear" message. | L2075, L10343 |
| **G6** | **The 31–60-minute watch band is unreachable for a not-moving driver.** `tripScenario` branch 3 (`late`) requires `minutesUntil <= 30`; branch 5 (`watch`) claims everything up to 90 and is **not** in `scCfg`. So a `not_started` driver 45 minutes out produces `key:'watch'` and is dropped — even though the builder's own doc-comment says *"driver issues with 30–60 min window: time to act before it becomes red"* (L9427). Only `unavailable` trips can ever occupy the watch tier. | L8304 vs L8314, L9492–L9496, L9427 |
| **G7** | **The clicked row is not refreshed.** `assignManually` calls `renderRequestsPage()` and `renderRideRequests()` but never `renderInterventionsPage()`, so the claim lock it just set is invisible here until the next dashboard render (up to 60 s later). | L11877 |
| **G8** | **The builder's documented request sort is not implemented.** The comment says *"Items within each tier are sorted by urgency (minutesUntil asc, waiting-timer desc for requests)"* (L9436), but requests are pushed with constant keys `0` and `999` and `r.waiting` is never parsed. | L9436 vs L9480, L9486 |
| **G9** | **Watch-tier sort keys are on incompatible scales.** SLA `500`, requests `999`, sub-trips `minutesUntil` (0–60). Every watch sub-trip therefore outranks every watch ticket and request regardless of actual urgency. | L9473, L9487, L9516 |
| **G10** | **Sort ties are resolved by push order, not urgency.** Breached SLA rows and `no_drivers` requests all carry `sort:0`. | F5 |
| **G11** | **Dead second seed of `DB.upcomingSubTrips`.** L6243's `DB.upcomingSubTrips = DB.upcomingSubTrips \|\| [ … ]` can never run because L6177 already assigned a non-empty array. Four `UST-` records with different data are inert. | L6177, L6243 |
| **G12** | **No dismiss, snooze, claim, or bulk action.** An operator cannot mark an intervention handled from this page; the item disappears only when the underlying record changes state elsewhere. | L2068–L2076, L9450–L9533 |
| **G13** | **No i18n.** No `data-i18n` attribute exists on the page markup, and no `nav.interventions` key is present in the Arabic map (L7909–L7911). The page would remain entirely English under `applyLanguage('ar')`. | L2068–L2076, L7909–L7911 |
| **G14** | **No permission gate anywhere on the page.** Neither the router branch nor any of the three action handlers checks a permission; the first `requirePerm` is on `commitRequestAssign` (`live_ops`, L11884), two clicks away. `showNearbyDriversMap` has none at all. | L8788, L9485, L9513, L11884 |
| **G15** | **`t.unavailReason` is captured but never surfaced here.** It is built into `sc.banner` (L8301), which this page discards in favour of the terse `scCfg` label. An operator sees "Driver unavailable" without "Vehicle breakdown — flat tyre reported". | L8301 vs L9506 |
| **G16** | **The row DOM and the waiting timer update at different rates.** `.js-wait` text is patched every second (F10) while the surrounding row is rebuilt at most once a minute — so a row can show a live counter next to a stale status. | L12576 vs L12614 |
| **G17** | **UNVERIFIED — `openTicketDetail` (L8879), `nearestAvailableDrivers`, `pickNearbyDriver`, `avatarHTML`, `fmtCountdown`, `resolveUnavailable`, `renderRideRequests`, `currentUserName` (L9651).** Called from or adjacent to this module; bodies not read. |
| **G18** | **UNVERIFIED — the full body of `showNearbyDriversMap`.** L8354–L8400 was read; the modal footer, the driver-row template beyond the pinned row, and the escalation panel's contents were not. |
| **G19** | **UNVERIFIED — whether `DB.rideRequests` can hold a `status` other than `'searching'` / `'no_drivers'` at render time.** `'assigned'` requests are spliced out of the array (L11897, L12482), and `'offered'` appears in an audit `before` object (L11902), so an `offered` request may transiently render as T4 "Awaiting assignment". The full set of statuses written by the dispatch engine (L12560–L12572) was not exhaustively read. |

---

## 18. Line-number index

| Line(s) | What |
|---|---|
| L682 | Dashboard card `🚨 Needs intervention now` (`#dash-intervene`, `#dash-intervene-count`) |
| L2068–L2076 | `#p-interventions` page markup |
| L2069 | Page header + sub-copy |
| L2070–L2074 | Deprecation card + `Go to the work inbox` button |
| L2075 | `Live trip interventions` card, `#iv-page-count`, `#iv-page-list` |
| L2168 | `titles.interventions` |
| L2169 | `subs.interventions` |
| L2787–L2789 | `DB.rideRequests` seed (3 requests) |
| L3228 | `PERMISSION_LABELS.live_ops` |
| L6177–L6242 | `DB.upcomingSubTrips` seed (live) |
| L6243–L6248 | **Dead** second `DB.upcomingSubTrips` seed |
| L7006 | `pushHistory()` |
| L7012 | `goBack()` |
| L8291–L8328 | `tripScenario()` — the 7-state machine |
| L8329–L8347 | `scenarioBannerHTML()` |
| L8337 | `callDriverUrgent` CTA for `primary === 'call_current'` |
| L8341 | `callRiderConfirm` CTA for `primary === 'call_rider'` |
| L8354–L8400+ | `showNearbyDriversMap()` |
| L8375 | Radius / inactive-city notices |
| L8383–L8397 | Pinned "currently assigned" row + `📞 Call now` |
| L8496 | `renderDashboard()` call site |
| L8774–L8828 | `window.go()` router |
| L8788 | Router branch for `interventions` |
| L8827 | `window.openProfile()` |
| L8879 | `window.openTicketDetail()` |
| L9392–L9409 | `refreshNavCounts()` |
| L9397–L9399 | `#sbb-dash` intervention count (F8) |
| L9410–L9412 | `dashKpi()` |
| L9413–L9438 | Intervention-triage doc-comment (three tiers) |
| L9440–L9441 | `IV_CRITICAL_MINS`, `IV_WATCH_MINS` |
| L9443–L9448 | `ivUrgencyLabel()` |
| L9450–L9533 | `buildInterventionItems()` |
| L9451–L9474 | Branch 0 — SLA breaches |
| L9476–L9488 | Branch 1 — instant ride requests |
| L9490–L9517 | Branch 2 — upcoming subscription trips |
| L9492–L9496 | `scCfg` map |
| L9519–L9532 | Sort + assembly + watch separator |
| L10338–L10344 | `renderInterventionsPage()` |
| L10346 | `renderDashboard()` |
| L10441–L10449 | Dashboard "needs intervention now" block; L10447 calls `renderInterventionsPage()` |
| L11871–L11879 | `assignManually()` |
| L11884–L11912 | `commitRequestAssign()` |
| L11913–L11917 | Comment on the removed duplicate `pickNearbyDriver` |
| L11966–L11969 | `startTickEngine()` |
| L12471 | `completeTrip` → `renderDashboard()` |
| L12486 | `driverAcceptOffer` → `renderDashboard()` |
| L12560–L12572 | Dispatch retry loop for `no_drivers` requests |
| L12576–L12579 | `.js-wait` live timer patch |
| L12611–L12614 | 60-tick block: `minutesUntil--` then `renderDashboard()` |
| L14587 | Boot call to `renderInterventionsPage()` |
| L14650–L14660 | `DB.slaPolicy` (`atRiskPct:75`) |
| L14667–L14713 | `DB.reasonCodes` |
| L14743 | `rcLabel()` |
| L14766–L14790 | `slaState()` |
| L14791–L14803 | `slaBadge()` |
| L17853+ | `installActionGates()` — contains no intervention entry |
| L19048–L19056 | `refreshOwnershipSurfaces()` — the dead `renderInterventions` call at L19054 |
| L20769+ | `GATE_SWEEP` — contains no intervention entry |
