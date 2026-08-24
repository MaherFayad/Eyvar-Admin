# Module: Executive Overview
> Source: eyvar_ops_panel_v40_fixed.html | Page id: `exec-overview` | HTML lines: 583-633

## 1. Purpose

Company-wide read-only executive summary page. Header copy: `<h1>Executive Overview</h1>` with sub-line "Company-wide picture — revenue, growth, and where things stand right now" (`L584`).

It aggregates, from the in-memory `DB` object:
- A 6-tile KPI strip (revenue, subscriptions, drivers, new riders, promise-keeping metrics) — `L6912-6920`
- Two draggable daily-revenue bar charts built from `DB.dailySnapshots` — `L6765-6768`, `L6769-6844`
- Financial position summary — `L6922-6928`
- Subscription growth summary — `L6930-6935`
- Cities & regions health table — `L6937-6947`
- Expansion-ready zones list — `L6948-6959`
- Rider engagement / dormancy proxy — `L6960-6969`
- A textual "predictive growth signal" paragraph — `L6970-6978`

The module is **almost entirely read-only**. It writes nothing to `DB`, opens no modals, has no forms, and has no permission gates. The only interactive elements are chart pan/scroll controls, chart tooltips, and one inline link to the Settings page.

## 2. Entry points & routing

| Item | Detail | Line |
|---|---|---|
| Page container | `<div class="page" id="p-exec-overview">` | `L583` |
| Sidebar nav item | `<div class="sb-item" onclick="go('exec-overview',this)">` with icon SVG and `<span class="sb-lbl" data-i18n="nav.exec-overview">Overview</span>` | `L487` |
| Router hook | inside `window.go=function(id,el,isBack)`: `if(id==='exec-overview'){renderExecOverview();renderExecTrendChart();}` | `L8811` (fn starts `L8774`) |
| Toolbar title | `titles['exec-overview']='Executive Overview'` → written to `#tb-title` | `L2168`, `L8785` |
| Toolbar subtitle | **No `subs['exec-overview']` key exists** → `#tb-sub` is set to `''` (empty) for this page | `L2169`, `L8786` |
| `renderExecOverview()` | Defined `L6901`, ends `L6979`. Called ONLY from the router (`L8811`). | `L6901` |
| `renderExecTrendChart()` | Defined `L6765-6768`. Called from router (`L8811`), from `captureDailySnapshot()` (`L7655`), and from the boot `setTimeout` block (`L14576`, block starts `L14556`). | `L6765` |
| Boot behaviour | At boot only `renderExecTrendChart()` runs (`L14576`); `renderExecOverview()` does **not** — the KPI strip, tables and lists stay empty until the user first navigates to the page. | `L14576` |
| Permission gate | **None.** Neither the sidebar item (`L487`) nor the router branch (`L8811`) calls `can()` (`L3122`) or `requirePerm()` (`L3126`). | — |
| Nav history | `go()` calls `pushHistory()` unless `isBack` — page is part of the back stack (`navStack`) | `L8779`, `L7011` |

### Call chain
```
go('exec-overview')                       L8774 / L8811
├── renderExecOverview()                  L6901
│   ├── sameCaptainStats()                L15697
│   ├── onTimeStats()                     L15703
│   ├── cityStats(name)                   L7445
│   └── zoneFailRate(z)                   L13974
└── renderExecTrendChart()                L6765
    └── renderTrendChart(...) ×2          L6769
        ├── initExecTrendDrag(scrollId)   L6886
        ├── initTrendTooltips(elId)       L6863
        │   └── ensureTrendTooltip()      L6854
        └── (button onclick) scrollTrendChart(scrollId,dir)  L6845
```

## 3. Layout map (top→bottom, left→right)

| # | Element | Container id / class | Filled by | Line |
|---|---|---|---|---|
| 1 | Page header: `h1` "Executive Overview" + `p` sub-line | `.ph` / `.ph-l` | Static HTML | `L584` |
| 2 | KPI strip, 4-column CSS grid (`.g4`, `L101`; 2-col ≤ tablet `L418`, 1-col mobile `L442`) holding 6 tiles | `#exec-kpis` | `renderExecOverview()` `L6913` | `L586` |
| 3 | Two-up row (`.g2`, `L99`) of chart cards | — | — | `L588-597` |
| 3a | Card "🚕 Quick ride income" / header note "Daily trips" | `#exec-trend-quick` | `renderTrendChart(...,'quickRideRevenue','Quick ride')` `L6766` | `L589-592` |
| 3b | Card "📦 Subscription income" / header note "Daily packages" | `#exec-trend-sub` | `renderTrendChart(...,'subRevenue','Subscription')` `L6767` | `L593-596` |
| 4 | Static caption, right-aligned, ghost text: "From captured Daily Snapshots — Settings → Data Export → Daily Snapshots" | inline div | Static HTML | `L598` |
| 5 | Two-up row (`.g2`) | — | — | `L600-609` |
| 5a | Card "💰 Financial position" | `#exec-finance` | `renderExecOverview()` `L6923` | `L601-604` |
| 5b | Card "📦 Subscription growth" | `#exec-sub-growth` | `renderExecOverview()` `L6932` | `L605-608` |
| 6 | Card "🌍 Cities & regions health" / note "Live status of every market, active or not" + `<table class="dt">` | `#exec-cities-tbody` | `renderExecOverview()` `L6939` | `L611-614` |
| 7 | Card "📈 Expansion-ready zones", green-bordered (`border-color:#9DC0A0`), green header (`background:var(--green-lt)`) / note "High demand relative to current driver supply — worth investing in first" | `#exec-expansion-list` | `renderExecOverview()` `L6953` | `L616-619` |
| 8 | Two-up row (`.g2`) | — | — | `L621-630` |
| 8a | Card "👥 Rider engagement" | `#exec-engagement` | `renderExecOverview()` `L6965` | `L622-625` |
| 8b | Card "🔮 Predictive growth signal" | `#exec-predictive` | `renderExecOverview()` `L6975` | `L626-629` |

## 4. KPIs & metrics

### 4.1 Top KPI strip — `#exec-kpis` (`L586`, built `L6913-6920`)

Every tile is rendered with the same markup template (`L6920`):
`<div class="kpi"><div class="kpi-lbl">LABEL</div><div class="kpi-val">VALUE</div><div class="kpi-dl neu">DELTA-TEXT</div></div>`
The delta line is **always** class `neu` (grey, `.neu{color:var(--ghost)}` `L113`) — no tile on this page ever shows green/red. Tiles are **not** clickable (no `.kpi.click`, `L105`).

| # | Name (label) | Value source | Formula | Units | Thresholds / colors | Line |
|---|---|---|---|---|---|---|
| 1 | Total revenue | `DB.payments` | `Object.values(DB.payments\|\|{}).filter(p=>p.status==='Paid').reduce((s,p)=>s+(parseFloat(p.amount)\|\|0),0)` then `.toFixed(2)+' SAR'`. Note `p.amount` is a string like `'86.50 SAR'`; `parseFloat` strips the suffix. | SAR, 2 dp | none (always `neu`) | `L6908`, `L6914` |
| 1d | └ delta text | hardcoded string | `'across all recorded payments'` | — | `neu` | `L6914` |
| 2 | Active subscriptions | `DB.subscriptions` | `Object.keys(DB.subscriptions).filter(id=>DB.subscriptions[id].status==='Active').length` (exact, case-sensitive match) | count | none | `L6905`, `L6915` |
| 2d | └ delta text | computed | `activeSubs.length+' of '+subIds.length+' total'` | count | `neu` | `L6915` |
| 3 | Active drivers | `DB.drivers` | `Object.keys(DB.drivers).filter(id=>DB.drivers[id].status!=='pending').length` | count | none | `L6903`, `L6916` |
| 3d | └ delta text | hardcoded string | `'excludes pending applicants'` | — | `neu` | `L6916` |
| 4 | New riders (48h) | `DB.newRiders` array | `(DB.newRiders\|\|[]).length` — **the label says 48h but no time filter is applied**; it is the raw length of a hand-seeded array (`L2744-2748`) | count | none | `L6917` |
| 4d | └ delta text | hardcoded string | `'see Riders page for detail'` | — | `neu` | `L6917` |
| 5 | Same-captain kept | `sameCaptainStats()` `L15697-15702` | `ids=Object.keys(DB.subscriptions)`, `broken=ids.filter(id=>(DB.subscriptions[id].driverChanges\|\|0)>0)`, `pct=ids.length?Math.round((ids.length-broken.length)/ids.length*100):100` | % | none | `L6918` |
| 5d | └ delta text | `sameCaptainStats()` | `broken+' of '+total+' plans changed captain'` | count | `neu` | `L6918` |
| 6 | On-time pickup | `onTimeStats()` `L15703-15709` | `trips=Object.values(DB.trips).filter(t=>!/cancel/i.test(t.status\|\|''))`, `late=trips.filter(t=>/Late \+/.test(t.status\|\|''))`, `pct=trips.length?Math.round((trips.length-late.length)/trips.length*100):100` | % | none | `L6919` |
| 6d | └ delta text | `onTimeStats()` | `late+' late of '+total+' trips'` | count | `neu` | `L6919` |

Note: `sameCaptainStats()` is invoked **twice** and `onTimeStats()` **twice** per render (once for the value, once for the delta) — `L6918`, `L6919`.

### 4.2 Chart summary KPI tiles (2 per chart, 4 total) — built in `renderTrendChart` `L6786-6789`

Rendered inside a `.g2` grid above each chart, styled `.kpi` with `border:none;background:var(--bg2);padding:11px 13px` and `kpi-val` overridden to `font-size:18px`.

| Name | Value source | Formula | Units | Thresholds / colors |
|---|---|---|---|---|
| Latest | `DB.dailySnapshots` | `values[values.length-1].toFixed(2)` where `values=snaps.map(s=>parseFloat(s[field])\|\|0)` and `snaps=(DB.dailySnapshots\|\|[]).slice().reverse()` | SAR, 2 dp | delta line colored by `changeCls` (`L6780`): `changePct>0` → `up` (green, `L113`) with `↑`; `<0` → `dn` (red) with `↓`; `=0` → `neu` (grey) with `—`. `changePct=first>0?Math.round((last-first)/first*100):0` (`L6779`). Displayed as `Math.abs(changePct)+'%'`. |
| `<N>`-day average (label is literally `snaps.length+'-day average'`) | `DB.dailySnapshots` | `values.reduce((a,b)=>a+b,0)/values.length` then `.toFixed(2)` | SAR, 2 dp | delta line always `neu`: `'peak '+peak.toFixed(0)+' SAR'` where `peak=Math.max.apply(null,values)` (`L6778`) |

### 4.3 Financial position — `#exec-finance` (`L603`, built `L6923-6928`)

Row template (`L6928`): `<div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">LABEL</span><span style="font-weight:500">VALUE</span></div>`. No conditional coloring anywhere in this card.

| # | Label | Value source | Formula | Units | Line |
|---|---|---|---|---|---|
| 1 | Total revenue (paid) | `DB.payments` | same `totalRevenue` as KPI #1 | SAR, 2 dp | `L6908`, `L6924` |
| 2 | Total driver earnings | `DB.trips` | `Object.values(DB.trips\|\|{}).reduce((s,t)=>s+(parseFloat(t.driverEarn)\|\|0),0)` — **no status filter**, cancelled trips included | SAR, 2 dp | `L6909`, `L6925` |
| 3 | Platform net (est.) | computed | `totalRevenue - totalDriverEarn` | SAR, 2 dp | `L6926` |
| 4 | Escrow currently held | `DB.escrowHolds` | `(DB.escrowHolds\|\|[]).filter(e=>e.status==='held').reduce((s,e)=>s+(e.amount\|\|0),0)` — `'ready'` holds excluded | SAR, 2 dp | `L6910`, `L6927` |

### 4.4 Subscription growth — `#exec-sub-growth` (`L607`, built `L6932-6935`)

Same row template as 4.3 (`L6935`). No conditional coloring.

| # | Label | Value source | Formula | Units | Line |
|---|---|---|---|---|---|
| 1 | Active | `DB.subscriptions` | `.filter(status==='Active').length` | count | `L6905`, `L6933` |
| 2 | Expiring soon | `DB.subscriptions` | `.filter(status==='Expiring').length` (exact string match) | count | `L6906`, `L6933` |
| 3 | Cancelled | `DB.subscriptions` | `.filter(/cancel/i.test(status)).length` (regex, matches `Cancelled`, `Cancel requested`, etc.) | count | `L6907`, `L6933` |
| 4 | Avg renewal rate | `DB.riders[sub.rider].stats.renewalRate` | `activeSubs.length ? Math.round( activeSubs.map(id => parseInt(DB.riders[DB.subscriptions[id].rider].stats.renewalRate,10)).filter(x=>x!=null).reduce((a,b,i,arr)=>a+b/arr.length,0) ) : null`; rendered as `renewRateAvg!=null?renewRateAvg+'%':'—'` | % | `L6931`, `L6934` |

> **BUG (verified against seed data):** `renewalRate` is stored as a display string (`'100%'`, `'91%'`, or `'—'` — `L2597`, `L2602`, `L2606`, `L2610`, `L2620`, `L2629`). `parseInt('—',10)` returns `NaN`, and the guard `x!=null` does **not** filter `NaN` out, so the average becomes `NaN`, `Math.round(NaN)` is `NaN`, and `NaN != null` is true → the card renders the literal text **`NaN%`**. Active subscription `SUB-1052` maps to rider `RDR-2031` whose `renewalRate` is `'—'` (`L2687`, `L2606`), so this fires with the shipped seed data.

## 5. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| `h1` "Executive Overview" | hardcoded HTML | static | `L584` |
| Header sub-line | hardcoded HTML | static | `L584` |
| Toolbar title | `titles['exec-overview']` | static map | `L2168` |
| Toolbar subtitle | missing key → `''` | — | `L2169`, `L8786` |
| KPI 1 value | `DB.payments[*].amount` where `status==='Paid'` | computed sum | `L6908` |
| KPI 2 value | `DB.subscriptions[*].status` | computed count | `L6905` |
| KPI 3 value | `DB.drivers[*].status` | computed count | `L6903` |
| KPI 4 value | `DB.newRiders` (array, seeded `L2744-2748`, 3 entries) | array length | Label claims a 48h window; none applied |
| KPI 5 value | `DB.subscriptions[*].driverChanges` | computed % | `driverChanges` incremented at `L5835`, `L16704`, `L17345` |
| KPI 6 value | `DB.trips[*].status` | computed % | Regex `/Late \+/` |
| Chart card headers "🚕 Quick ride income" / "Daily trips" | hardcoded HTML | static | `L590` |
| Chart card headers "📦 Subscription income" / "Daily packages" | hardcoded HTML | static | `L594` |
| Chart bars, labels, tooltips | `DB.dailySnapshots[*].quickRideRevenue` and `.subRevenue`, `.date` | computed SVG | Seed array `L13802-13833` (30 rows) |
| Snapshot-source caption | hardcoded HTML | static | `L598` |
| Financial position rows 1-4 | `DB.payments`, `DB.trips`, `DB.escrowHolds` | computed | `L6924-6927` |
| Subscription growth rows 1-4 | `DB.subscriptions`, `DB.riders[*].stats.renewalRate` | computed | `L6933-6934` |
| Cities table rows | `DB.cities` (`L13946-13951`, 4 rows) | array | Only `Riyadh` has `active:true` |
| Cities table Zones/Drivers/Riders columns | `cityStats(c.name)` `L7445-7450` | computed | Returns real numbers only for `'Riyadh'`; all other cities hardcoded `{zones:0,drivers:0,riders:0}` |
| Cities table Avg zone fail rate | `DB.zones` via `zoneFailRate(z)` `L13974` | computed % | Only computed when `c.name==='Riyadh'`; else `—` |
| Expansion zone rows | `DB.zones` (`L13952-13959`, 6 rows) | array | `z.name`, `z.demand`, `z.supply` |
| Rider engagement: Total riders | `Object.keys(DB.riders).length` | count | `L6902`, `L6966` |
| Rider engagement: Dormant | `DB.riders[*].trips`, `DB.riders[*].subs` | computed count + % | `L6963-6964` |
| Rider engagement footnote | hardcoded HTML string | static | `L6968` |
| Predictive paragraph | `activeSubs.length`, `cancelledSubs.length`, `expiringSubs.length` interpolated into a hardcoded sentence | computed + static | `L6975-6978` |

## 6. Input fields

**None.** There is not a single `<input>`, `<select>`, `<textarea>`, form, search box, date-range picker, or filter control anywhere in the page HTML (`L583-631`) or in any function that renders into it (`renderExecOverview` `L6901-6979`, `renderExecTrendChart` `L6765-6768`, `renderTrendChart` `L6769-6844`).

| id | Type | Label | Default | Options/validation | Drives |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 7. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `‹` (title `"Earlier"`), `class="trend-nav-btn"` — one per chart | `scrollTrendChart('exec-trend-scroll-quick'\|'exec-trend-scroll-sub',-1)` `L6828`, defined `L6845-6849` | `box.scrollBy({left:-140,behavior:'smooth'})` — pure DOM scroll | none | none | none | no |
| `›` (title `"Later"`), `class="trend-nav-btn"` — one per chart | `scrollTrendChart(...,1)` `L6837`, defined `L6845-6849` | `box.scrollBy({left:+140,behavior:'smooth'})` | none | none | none | no |
| Chart drag surface (`.exec-trend-scroll` div, `cursor:grab`) | `box.onmousedown` / `box.ontouchstart` set in `initExecTrendDrag()` `L6886-6900` | Sets module-global `_execTrendDragState` (`L6884`); window-level `mousemove`/`touchmove` listeners (bound once via `_execTrendWindowListenersBound` `L6885`) update `box.scrollLeft`; `mouseup` resets cursor to `grab` | in-memory `_execTrendDragState` only | none | none | no |
| Chart bar hover (`path.trend-bar`) | `mouseenter`/`mousemove`/`mouseleave` listeners added in `initTrendTooltips()` `L6863-6878` | Shows/positions/hides the global `#trend-tooltip` div (created lazily by `ensureTrendTooltip()` `L6854-6862` and appended to `document.body`); content = `data-value+' SAR'` and `data-label+' · '+data-date` | none | none | none | no |
| Inline text link "Data Export → Daily Snapshots" (inside the predictive paragraph, `color:var(--blue)`) | `onclick="go('settings',findSbEl('settings'));return false"` `L6978` | Navigates to the Settings page and highlights its sidebar item; `findSbEl` `L7006-7010` finds the matching `.sb-item` | `navStack` via `pushHistory()` `L8779` | none | none | no |

**Explicitly absent on this page:** no `requirePerm()` / `can()` calls, no `logAction()` calls, no `toast()` calls, no `openModal`/`closeModal`, no `openProfile()`, no row-click drilldowns, no export/download buttons, no refresh button.

## 8. Tables & lists

### 8.1 Cities & regions health — `<table class="dt">` / `<tbody id="exec-cities-tbody">` (`L613`, rows built `L6938-6947`)

**Columns, in order** (static `<thead>`, `L613`):
1. `City`
2. `Status`
3. `Zones`
4. `Drivers`
5. `Riders`
6. `Avg zone fail rate`

**Row source:** `(DB.cities||[]).map(...)` — `DB.cities` defined `L13946-13951`:
`{name:'Riyadh',active:true,launched:'2025',seed:true}`, `{name:'Jeddah',active:false,launched:null,seed:true}`, `{name:'Dammam',active:false,launched:null,seed:true}`, `{name:'Makkah',active:false,launched:null,seed:true}`.

**Cell derivation** (`L6940-6946`):
| Column | Value |
|---|---|
| City | `c.name`, `style="font-weight:500"` |
| Status | `c.active ? '<span class="b b-green">Live</span>' : '<span class="b b-red">Not live</span>'` |
| Zones | `cityStats(c.name).zones` = `DB.zones.length` for Riyadh, else `0` |
| Drivers | `cityStats(c.name).drivers` = count of `DB.drivers` with `status!=='pending'` for Riyadh, else `0` |
| Riders | `cityStats(c.name).riders` = `Object.keys(DB.riders).length` for Riyadh, else `0` |
| Avg zone fail rate | Riyadh only: `Math.round( DB.zones.reduce((s,z)=>s+zoneFailRate(z),0) / DB.zones.length )` + `%`, wrapped in a `<span>` with inline color; all other cities render `—` |

`zoneFailRate(z)` (`L13974`) = `z.demand>0 ? Math.round(z.failures30d/z.demand*100) : 0`.

**Fail-rate color thresholds** (`L6946`): `>30` → `var(--red)`; `>15 && <=30` → `var(--amber-dk)`; `<=15` → `var(--green)`.

**Filters / sorts / search:** none. Rows render in `DB.cities` array order.
**Row actions / row-click:** none — no `onclick`, no `cursor:pointer`, no `openProfile`.
**Empty state:** none defined. If `DB.cities` were empty, `citiesTb.innerHTML` becomes `''` (a bare empty `<tbody>` with no message). `citiesTb` is also dereferenced without a null-check (`L6939`).

> Note: `zonesForCity` (`L6941`) is assigned `(DB.zones||[])` unconditionally with the inline comment "this dataset's zones are all within the seed city (Riyadh)" — there is no per-city zone mapping. The city→zone relationship is hardcoded to the string `'Riyadh'` (`L6942`, and again in `cityStats` `L7448`).

### 8.2 Expansion-ready zones — `<div id="exec-expansion-list">` (`L618`, built `L6951-6959`)

Not a `<table>` — a list of flex rows, each `padding:10px 14px;border-bottom:.5px solid #F2F1EE`.

**Row source & filter:** `(DB.zones||[]).filter(z => z.supply>0 && z.demand/z.supply >= 2)` (`L6951`). `DB.zones` seeded `L13952-13959` (6 zones).
**Sort:** descending by `demand/supply` ratio — `.sort((a,b)=>(b.demand/b.supply)-(a.demand/a.supply))` (`L6951`).
**Row content** (`L6954-6957`):
- Left: `z.name` (`font-weight:500`) + ghost text `'— '+z.demand+' demand vs '+z.supply+' drivers currently'`
- Right: `<span class="b b-green">` containing `(z.demand/z.supply).toFixed(1)+'× demand/supply'`

**Search / additional filters:** none.
**Row actions / row-click:** none.
**Empty state** (`L6959`): `<div style="padding:16px 14px;color:var(--ghost);font-size:11.5px">No zone currently shows demand meaningfully outstripping supply.</div>`

With the seed zones, the qualifying rows are: `Al Narjis` (14/2 = 7.0×), `Al Yasmin` (11/4 = 2.8×), `Al Sahafa` (9/3 = 3.0×) — sorted 7.0×, 3.0×, 2.8×.

### 8.3 Financial position / Subscription growth / Rider engagement

These are label-value flex lists, not tables — documented in §4.3, §4.4 and §5. No filters, sorts, row actions or empty states.

## 9. Charts

Two structurally identical charts, both produced by `renderTrendChart(elId,scrollId,gradId,field,label)` (`L6769-6844`) via `renderExecTrendChart()` (`L6765-6768`):

| Chart | Target el | Scroll container id | SVG gradient id | Snapshot field | Tooltip label |
|---|---|---|---|---|---|
| Quick ride income | `exec-trend-quick` (`L591`) | `exec-trend-scroll-quick` | `execBarFillQuick` | `quickRideRevenue` | `Quick ride` |
| Subscription income | `exec-trend-sub` (`L595`) | `exec-trend-scroll-sub` | `execBarFillSub` | `subRevenue` | `Subscription` |

**Type:** hand-built inline SVG vertical bar chart with rounded top corners (path with quadratic corner radii, `rad=Math.min(5,barW/2)`, `L6813-6814`). No charting library.

**Data source:** `DB.dailySnapshots` (`L13802-13833`, 30 seeded rows; new rows are `unshift`-ed by `captureDailySnapshot()` at `L7648`). `snaps=(DB.dailySnapshots||[]).slice().reverse()` → oldest first, left to right (`L6772`). `values=snaps.map(s=>parseFloat(s[field])||0)` (`L6777`).

**Series:** one series per chart. Bar fill: all bars use `url(#<gradId>)`, a vertical `linearGradient` from `var(--blue)` at `stop-opacity:0.55` to `var(--blue)` at `stop-opacity:0.28` (`L6832-6834`); the **last** bar is solid `var(--blue)` (`L6812`, `L6815`).

**Axes:**
- Y: linear, `minV=0`, `maxV=peak*1.15||1` where `peak=Math.max(...values)` (`L6797`, `L6778`). 4 horizontal dashed gridlines at 0/3, 1/3, 2/3, 3/3 of plot height (`stroke="var(--border)" stroke-dasharray="2,3"`), each with a right-aligned label `Math.round(maxV*(1-g/3))` at font-size 8.5 (`L6802-6807`). A solid baseline in `var(--border2)` at `y=h-padB` (`L6808`).
- X: categorical, one slot per snapshot day. Tick labels are the first two space-separated tokens of `s.date` (e.g. `'26 Jun'` from `'26 Jun 09:00'`), uppercased via CSS, drawn only every `everyN=Math.max(1,Math.round(snaps.length/8))` slots plus always the last (`L6820-6823`).

**Geometry** (`L6791-6800`): `dayW=26`, `h=170`, `padL=42`, `padR=18`, `padT=14`, `padB=24`, `barW=Math.max(5,dayW*0.6)` = 15.6, `w=Math.max(viewportW, padL+padR+dayW*snaps.length)`. `viewportW=el.clientWidth || el.getBoundingClientRect().width || 360`. Because per-day width is fixed rather than stretched, the SVG overflows the card and becomes horizontally scrollable/draggable.

**Last-value tag** (`L6817-6818`): a 48×16 rounded rect in `var(--blue)` with white centered text `last.toFixed(0)+' SAR'`, positioned above the final bar and clamped inside the plot area.

**Interaction:**
- Horizontal drag-to-pan (mouse + touch), `initExecTrendDrag()` `L6886-6900`; scroll position initialised to the right edge (`box.scrollLeft=box.scrollWidth`, `L6888`) so "today" is the anchor.
- `‹`/`›` buttons scroll by ±140px smoothly (`L6828`, `L6837`, `L6845-6849`).
- Custom hover tooltip `#trend-tooltip` (`L6863-6878`; CSS `L316-317`) with `data-value SAR` on line 1 and `data-label · data-date` on line 2. Bars dim to `opacity:0.72` on hover (`L313`).
- Native scrollbars are hidden (`scrollbar-width:none`, `-ms-overflow-style:none`, `L6829`; `::-webkit-scrollbar{display:none;height:0}`, `L312`).

**Footer hint** (`L6839`): centered ghost text `'← Drag, or use the arrows, to see the last '+snaps.length+' days'`.

**Empty / insufficient-data state** (`L6773-6776`): if `snaps.length < 2`, the whole element is replaced with
`Capture at least 2 daily snapshots to see a real trend — Settings → Data Export → Daily Snapshots.`

## 10. Modals opened

**None.** No `modal-overlay`, `modal-content`, `openModal`, or `closeModal` reference appears in the page HTML (`L583-631`) or in `renderExecOverview` / `renderExecTrendChart` / `renderTrendChart` / their helpers.

## 11. States & badges

| State | Condition | Visual | Line |
|---|---|---|---|
| City "Live" | `c.active === true` | `<span class="b b-green">Live</span>` — `background:var(--green-lt);color:var(--green)` (`L119`) | `L6943` |
| City "Not live" | `c.active` falsy | `<span class="b b-red">Not live</span>` — `background:var(--red-lt);color:var(--red)` (`L120`) | `L6943` |
| Fail rate — critical | `avgFail > 30` | fail-rate `%` text in `var(--red)` | `L6946` |
| Fail rate — warning | `avgFail > 15 && avgFail <= 30` | fail-rate `%` text in `var(--amber-dk)` | `L6946` |
| Fail rate — healthy | `avgFail <= 15` | fail-rate `%` text in `var(--green)` | `L6946` |
| Fail rate — not applicable | `c.name !== 'Riyadh'` OR `DB.zones` empty | literal `—`, default text color | `L6942`, `L6946` |
| Expansion ratio badge | zone passes `supply>0 && demand/supply>=2` | `<span class="b b-green">N.N× demand/supply</span>` — always green, no severity tiers | `L6956` |
| Expansion empty state | no zone passes the filter | ghost text "No zone currently shows demand meaningfully outstripping supply." | `L6959` |
| Dormancy — alarm | `dormantPct > 25` | dormant count/percent text in `var(--red)` | `L6967` |
| Dormancy — normal | `dormantPct <= 25` | dormant count/percent text in `var(--ink)` | `L6967` |
| Trend delta — up | `changePct > 0` | `.kpi-dl up` → `var(--green)` (`L113`), prefix `↑` | `L6779-6780`, `L6787` |
| Trend delta — down | `changePct < 0` | `.kpi-dl dn` → `var(--red)`, prefix `↓` | `L6779-6780`, `L6787` |
| Trend delta — flat | `changePct === 0` (incl. the `first<=0` fallback) | `.kpi-dl neu` → `var(--ghost)`, prefix `—` | `L6779-6780`, `L6787` |
| Trend "peak" sub-line | always | `.kpi-dl neu` | `L6788` |
| Trend last bar highlight | `i === values.length-1` | solid `var(--blue)` fill instead of the gradient | `L6812`, `L6815` |
| Trend insufficient data | `DB.dailySnapshots.length < 2` | ghost centered message replacing the chart | `L6773-6775` |
| Predictive — growing | `activeSubs.length - cancelledSubs.length > 0` | sentence "Net subscription base is growing." | `L6974`, `L6977` |
| Predictive — flat/shrinking | `activeSubs.length - cancelledSubs.length <= 0` | sentence "Net subscription base is flat or shrinking — worth a closer look at the cancellation reasons on the Renewal Pipeline page." (plain text — **not** a link) | `L6977` |
| Top KPI delta lines | always | `.kpi-dl neu` (grey) — never green or red on this page | `L6920` |
| Drag cursor | `mousedown` on scroll container | `cursor` flips `grab` → `grabbing`, restored to `grab` on window `mouseup` | `L6891`, `L6895` |
| Bar hover | pointer over a `.trend-bar` | `opacity:0.72` (`L313`) + `#trend-tooltip` shown | `L313`, `L6868-6871` |

## 12. Cross-module links

| From | Target | Mechanism | Line |
|---|---|---|---|
| Sidebar item → this page | `exec-overview` | `go('exec-overview',this)` | `L487` |
| Predictive paragraph inline link "Data Export → Daily Snapshots" | `settings` page | `go('settings',findSbEl('settings'));return false` | `L6978` |
| Textual reference only (no link) | Riders page | KPI 4 delta: "see Riders page for detail" | `L6917` |
| Textual reference only (no link) | Renewal Pipeline page | Predictive shrinking branch: "…cancellation reasons on the Renewal Pipeline page." | `L6977` |
| Textual reference only (no link) | Settings → Data Export → Daily Snapshots | Static caption under the charts (`L598`) and the chart empty-state message (`L6774`) | `L598`, `L6774` |
| Inbound (re-render trigger) | `captureDailySnapshot()` in the Settings module calls `renderExecTrendChart()` after adding a snapshot | `L7655` |

**No `openProfile(...)` call exists on this page.** Cities, zones, riders and drivers referenced here are all non-clickable.

## 13. Hardcoded / mock / demo values

| Item | Value | Why it matters | Line |
|---|---|---|---|
| `cityStats()` city gate | The string `'Riyadh'` is hardcoded; every other city returns `{zones:0,drivers:0,riders:0}` regardless of actual data | Adding a 5th city, or renaming Riyadh, silently yields all-zero rows | `L7445-7450` |
| Fail-rate city gate | `c.name==='Riyadh'` hardcoded again in `renderExecOverview` | duplicate of the same assumption | `L6942` |
| Zone→city mapping | `var zonesForCity=(DB.zones||[])` — all zones assumed to belong to Riyadh, with an inline comment saying so | No real per-city zone data model exists | `L6941` |
| `DB.cities` | 4 seeded rows: Riyadh (active, launched `'2025'`), Jeddah/Dammam/Makkah (inactive, `launched:null`), all `seed:true` | Demo dataset | `L13946-13951` |
| `DB.zones` | 6 seeded rows: Al Narjis 14/2/11, Al Sahafa 9/3/6, KAFD / Olaya 22/12/4, Al Malaz 8/6/2, Qurtubah 6/5/1, Al Yasmin 11/4/7 (`demand`/`supply`/`failures30d`) | Demo dataset | `L13952-13959` |
| `DB.dailySnapshots` | 30 pre-fabricated snapshots `SNAP-0001` (26 Jun) → `SNAP-0030` (25 Jul), each with invented `totalRevenue`/`quickRideRevenue`/`subRevenue` strings | **Both charts on this page are drawn entirely from fabricated history**, despite the caption claiming "From captured Daily Snapshots" | `L13802-13833` |
| `DB.newRiders` | 3 hand-written rider objects with fake names, phones, national IDs, IPs and device strings | Drives KPI "New riders (48h)" | `L2744-2748` |
| KPI 4 label "New riders (48h)" | Label asserts a 48-hour window that the code never enforces (`(DB.newRiders||[]).length`) | Misleading metric name | `L6917` |
| KPI 1 delta text | Literal `'across all recorded payments'` | static copy | `L6914` |
| KPI 3 delta text | Literal `'excludes pending applicants'` | static copy | `L6916` |
| Expansion threshold | `>= 2` demand/supply ratio, magic number, no config | Not tunable from Settings | `L6951` |
| Fail-rate thresholds | `30` and `15`, magic numbers inline | Not tunable | `L6946` |
| Dormancy threshold | `25` (%), magic number inline | Not tunable | `L6967` |
| Y-axis headroom | `peak*1.15` magic multiplier | — | `L6797` |
| Chart geometry constants | `dayW=26, h=170, padL=42, padR=18, padT=14, padB=24`, fallback width `360`, scroll step `140`, gridline count `4`, x-label density `snaps.length/8` | — | `L6791-6797`, `L6803`, `L6820`, `L6848` |
| Expansion row border color | Literal hex `#F2F1EE` instead of a CSS var | inconsistent with the token system used elsewhere | `L6955` |
| Expansion card border color | Literal hex `#9DC0A0` in the HTML | same | `L616` |
| "cancelled this month" wording | Predictive text says "cancelled **this month**", but `cancelledSubs` is an all-time, unfiltered `/cancel/i` match over `DB.subscriptions` | The sentence overstates what the number measures | `L6907`, `L6976` |
| Predictive paragraph | Entirely a templated sentence with a binary branch; the section title "🔮 Predictive growth signal" implies forecasting but no model, projection or extrapolation exists (the source comment acknowledges this: "a simple, honestly-scoped trend read rather than a fabricated ML forecast") | Title vs. behaviour mismatch | `L6970-6978` |
| Dormancy definition | "no recorded trip and no active subscription" used as a proxy; footnote in the UI states the dataset has no "last app open" timestamp | Documented proxy, not a real engagement metric | `L6960-6962`, `L6968` |

## 14. i18n keys

| Key | Element | Location | Arabic value |
|---|---|---|---|
| `nav.exec-overview` | Sidebar label `<span class="sb-lbl" data-i18n="nav.exec-overview">Overview</span>` | `L487` (outside the module's own HTML block) | `'نظرة عامة'` at `L7905` |

**Inside the module block `L583-631` there are zero `data-i18n` attributes.** Every string on the page — the `h1`, the sub-line, all six card headers, all card sub-notes, the snapshot caption, all six table column headers, all KPI labels and delta texts, all list labels, the empty states, the tooltip text, the footer drag hint, and the predictive paragraph — is hardcoded English (plus emoji) built by string concatenation in JS. The page will not translate when the panel switches to Arabic.

## 15. Gaps, dead code, UNVERIFIED items

**Confirmed bugs / gaps**

1. **`NaN%` in "Avg renewal rate"** — `parseInt` on the display string `'—'` yields `NaN`, and the `x!=null` guard does not filter `NaN`. Fires with shipped seed data (active `SUB-1052` → rider `RDR-2031`, `renewalRate:'—'`). `L6931`, `L2687`, `L2606`.
2. **KPI "New riders (48h)" applies no time filter** — it is `(DB.newRiders||[]).length`. `L6917`.
3. **Page is empty at boot** — the router (`L8811`) is the only caller of `renderExecOverview()`. The boot `setTimeout` (`L14556-…`) calls `renderExecTrendChart()` at `L14576` but not `renderExecOverview()`, so if `exec-overview` were ever the initially-visible page, KPIs/tables/lists would render blank.
4. **No resize re-render for the charts** — `renderTrendChart` reads `el.clientWidth` once (`L6791`) and bakes it into the SVG `width`/`viewBox`. `renderExecTrendChart` is not registered on the `window` resize handler (only `autoSizeAllSelects` is, `L14550`), so charts do not reflow on window resize.
5. **No null-guard on `renderExecOverview` targets** — `document.getElementById('exec-kpis').innerHTML` etc. (`L6913`, `L6923`, `L6932`, `L6938`, `L6952`, `L6965`, `L6975`) dereference directly; `renderTrendChart` by contrast does guard (`if(!el)return;` `L6771`).
6. **No empty state for the cities table** — `L6939` produces a bare empty `<tbody>` if `DB.cities` is empty.
7. **`sameCaptainStats()` / `onTimeStats()` each called twice per render** — `L6918`, `L6919`.
8. **Global tooltip element leaks across pages** — `#trend-tooltip` is appended to `document.body` (`L6857-6859`) and never removed; `initTrendTooltips()` re-attaches fresh `mouseenter`/`mousemove`/`mouseleave` listeners to newly-created bars on every render (`L6867`), so listeners accumulate only on discarded nodes (acceptable) but the tooltip node persists site-wide.
9. **Shared drag state across both charts** — `_execTrendDragState` is a single module-global (`L6884`), so the two charts share one drag state object. Functionally OK (only one can be dragged at a time) but is global mutable state.
10. **"Total driver earnings" includes cancelled trips** — `L6909` reduces over all of `DB.trips` with no status filter, unlike `totalRevenue` which filters `status==='Paid'`. "Platform net (est.)" inherits this.
11. **`escrowHeld` excludes `'ready'` holds** — only `status==='held'` counts (`L6910`); the shipped seed has two `'ready'` holds worth 329.60 + 32.98 SAR that are invisible here (`L2803-2804`).
12. **No permission gating whatsoever** — the sidebar entry and the router branch are unguarded (`L487`, `L8811`), so any role that can see the sidebar can see company-wide revenue.
13. **No i18n coverage** — see §14.
14. **Missing toolbar subtitle** — `subs` has no `exec-overview` key (`L2169`), so `#tb-sub` renders empty for this page while every other page has one.
15. **Card header "🔮 Predictive growth signal"** promises prediction; implementation is a two-branch sentence (`L6970-6978`).

**UNVERIFIED**

- **Runtime numeric values of every KPI.** All figures depend on the live mutable `DB` at render time and on other modules that write to `DB.payments`, `DB.trips`, `DB.subscriptions`, `DB.drivers`, `DB.riders`, `DB.escrowHolds` and `DB.newRiders`. Reason: static source reading only — the file was not executed.
- **Whether `DB.newRiders` is ever pruned to a real 48-hour window elsewhere.** Only the seed (`L2744`) and consumer sites were inspected; no pruning was found in the greps run, but an exhaustive audit of every `DB.newRiders` mutation site was outside this module's scope.
- **Whether any other module mutates `DB.cities` in a way that reaches this table.** `L7892` (`DB.cities=DB.cities.filter(...)` — a city-removal path) was observed but its owning module and permission gate were not traced. It would affect this table's rows at next render.
- **Exact resolved values of the CSS custom properties** (`--blue`, `--green`, `--red`, `--amber-dk`, `--ghost`, `--muted`, `--ink`, `--bg2`, `--border`, `--border2`, `--green-lt`, `--red-lt`, `--white`). Only the class-level rules (`L104-120`, `L311-317`) were read, not the `:root` token block.
- **Whether `.b` (badge base class) adds padding/radius beyond the color pairs at `L119-120`.** The base `.b` rule was not read.

**Dead / unused code adjacent to this module** — none found. `scrollTrendChart` (`L6845`), `ensureTrendTooltip` (`L6854`), `initTrendTooltips` (`L6863`) and `initExecTrendDrag` (`L6886`) are all reachable from `renderTrendChart`. `renderTrendChart` itself is called only by `renderExecTrendChart` (`L6766-6767`) — it is parameterised as if for reuse but has exactly two call sites, both on this page.

## 16. Line-number index (element → line)

### HTML block
| Line | Element |
|---|---|
| `L487` | Sidebar nav item + `data-i18n="nav.exec-overview"` |
| `L583` | `<div class="page" id="p-exec-overview">` |
| `L584` | Page header `h1` + sub-line |
| `L586` | `<div class="g4" id="exec-kpis">` |
| `L588` | `.g2` charts row opens |
| `L589-592` | Card "🚕 Quick ride income" |
| `L590` | Card header + "Daily trips" note |
| `L591` | `#exec-trend-quick` |
| `L593-596` | Card "📦 Subscription income" |
| `L594` | Card header + "Daily packages" note |
| `L595` | `#exec-trend-sub` |
| `L598` | Static "From captured Daily Snapshots…" caption |
| `L600` | `.g2` finance/growth row opens |
| `L602` | Card header "💰 Financial position" |
| `L603` | `#exec-finance` |
| `L606` | Card header "📦 Subscription growth" |
| `L607` | `#exec-sub-growth` |
| `L611` | Cities card opens |
| `L612` | Card header "🌍 Cities & regions health" + note |
| `L613` | `<table class="dt">` + 6 `<th>` + `<tbody id="exec-cities-tbody">` |
| `L616` | Expansion card opens (`border-color:#9DC0A0`) |
| `L617` | Card header "📈 Expansion-ready zones" + green note |
| `L618` | `#exec-expansion-list` |
| `L621` | `.g2` engagement/predictive row opens |
| `L623` | Card header "👥 Rider engagement" |
| `L624` | `#exec-engagement` |
| `L627` | Card header "🔮 Predictive growth signal" |
| `L628` | `#exec-predictive` |
| `L631` | Page container closes |

### JavaScript
| Line | Element |
|---|---|
| `L6765-6768` | `renderExecTrendChart()` |
| `L6766` | Quick-ride chart invocation |
| `L6767` | Subscription chart invocation |
| `L6769-6844` | `renderTrendChart(elId,scrollId,gradId,field,label)` |
| `L6772` | `snaps` (reversed `DB.dailySnapshots`) |
| `L6773-6776` | `<2 snapshots` empty state |
| `L6777-6780` | `values`, `first`, `last`, `peak`, `changePct`, `changeCls` |
| `L6786-6789` | Chart summary KPI tiles ("Latest", "N-day average") |
| `L6791-6800` | Geometry, scales, `xCenterAt`, `yAt` |
| `L6802-6807` | Gridlines + Y-axis labels |
| `L6808` | Baseline |
| `L6810-6816` | Bars (rounded-top paths, `data-date`/`data-value`/`data-label`) |
| `L6817-6818` | Last-value tag |
| `L6820-6823` | X-axis date labels |
| `L6825-6841` | Final `innerHTML` assembly (nav buttons, scroll box, `<svg>`, gradient defs, drag hint) |
| `L6828` | `‹` Earlier button |
| `L6829` | `.exec-trend-scroll` container |
| `L6832-6834` | `linearGradient` defs |
| `L6837` | `›` Later button |
| `L6839` | "← Drag, or use the arrows…" hint |
| `L6842-6843` | `initExecTrendDrag` + `initTrendTooltips` calls |
| `L6845-6849` | `scrollTrendChart(scrollId,dir)` |
| `L6854-6862` | `ensureTrendTooltip()` |
| `L6863-6878` | `initTrendTooltips(elId)` |
| `L6884-6885` | `_execTrendDragState`, `_execTrendWindowListenersBound` |
| `L6886-6900` | `initExecTrendDrag(scrollId)` |
| `L6901-6979` | `renderExecOverview()` |
| `L6902-6910` | Aggregate computations |
| `L6912-6920` | KPI strip |
| `L6922-6928` | Financial position |
| `L6930-6935` | Subscription growth (`renewRateAvg` at `L6931`) |
| `L6937-6947` | Cities & regions table rows |
| `L6948-6959` | Expansion-ready zones |
| `L6960-6969` | Rider engagement / dormancy |
| `L6970-6978` | Predictive growth signal + inline Settings link (`L6978`) |
| `L7006-7010` | `findSbEl(id)` (used by the Settings link) |
| `L7445-7450` | `cityStats(name)` |
| `L7639-7657` | `captureDailySnapshot()` (external writer; re-renders charts at `L7655`) |
| `L8774-…` | `window.go(id,el,isBack)` |
| `L8811` | Router branch for `exec-overview` |
| `L13974` | `zoneFailRate(z)` |
| `L14556` | Boot `setTimeout` block |
| `L14576` | Boot call to `renderExecTrendChart()` |
| `L15697-15702` | `sameCaptainStats()` |
| `L15703-15709` | `onTimeStats()` |

### Data & CSS
| Line | Element |
|---|---|
| `L99` | `.g2` grid |
| `L101` | `.g4` grid |
| `L104` | `.kpi` |
| `L110-112` | `.kpi-lbl`, `.kpi-val`, `.kpi-dl` |
| `L113` | `.up` / `.dn` / `.neu` |
| `L119-120` | `.b-green` / `.b-red` |
| `L311` | `.trend-bar` |
| `L312` | `.exec-trend-scroll::-webkit-scrollbar` |
| `L313` | `.trend-bar:hover` |
| `L314-315` | `.trend-nav-btn` + `:hover` |
| `L316-317` | `#trend-tooltip` + `.tt-date` |
| `L418`, `L442`, `L463` | Responsive grid / `.kpi-val` overrides |
| `L2168` | `titles['exec-overview']` |
| `L2169` | `subs` map (no `exec-overview` key) |
| `L2594-2629` | `DB.riders` seed (incl. `stats.renewalRate`) |
| `L2685-2692` | `DB.subscriptions` seed |
| `L2694-…` | `DB.payments` seed |
| `L2744-2748` | `DB.newRiders` seed (3 rows) |
| `L2801-2806` | `DB.escrowHolds` seed (4 rows, 2 `held` / 2 `ready`) |
| `L7905` | Arabic `nav.exec-overview` |
| `L13802-13833` | `DB.dailySnapshots` seed (30 rows) |
| `L13946-13951` | `DB.cities` seed (4 rows) |
| `L13952-13959` | `DB.zones` seed (6 rows) |
