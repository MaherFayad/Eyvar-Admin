# Module: Dashboard

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `dashboard` · **Page div:** `#p-dashboard`
> **HTML lines:** `L676`–`L712`
> **Primary render:** `renderDashboard()` `L10346`–`L10449`
> **Attached helpers:** `dashKpi()` `L9410`, `buildInterventionItems()` `L9450`, `kpiScrollTo()` `L14535`, `openHealthBreakdown()` `L20567`

---

## 1. Purpose

The default landing page (`#p-dashboard` carries class `on` in static markup, `L676`) and the page `navCurrent` is initialised to (`L2850`). It is an **operations shift-start surface for a single hardcoded day (25 Jun 2026)**: five counters, an urgent-intervention feed, today's two trip tables, an alert queue, and a 4-row renewal pipeline preview.

Everything on the page is derived from `DB` at render time — the page has no persistent state of its own, no filters, and no inputs. Its only editable surfaces are the two buttons in the page header.

---

## 2. Entry points & routing

| Trigger | Line | Effect |
|---|---|---|
| Sidebar item `Dashboard` (`sb-item on`, `onclick="go('dashboard',this)"`) | `L497` | Routes to page, sets sidebar active state |
| `go('dashboard', …)` router branch `if(id==='dashboard'){renderDashboard();}` | `L8787` | Renders on every navigation to page |
| Boot sequence — `renderDashboard()` called unconditionally at init | `L14586` | First paint |
| Tick engine, every 60 ticks (~60 s) `if(__tickCount%60===0){…renderDashboard()}` | `L12614` | Auto-refresh; also decrements `minutesUntil` on every `DB.upcomingSubTrips` row at `L12612` |
| Tick engine, live trip 5-min signal loss (`t.lastPing===300`) | `L12591` | Re-render after the "No signal" notification |
| `window.assignDriver` (from the nearby-drivers map) | `L8496` | Re-render after a driver is assigned |
| `commitRequestAssign()` async commit | `L11900` | Re-render after an instant request is manually assigned |
| `completeTrip()` | `L12471` | Re-render when a live trip finishes |
| `driverAcceptOffer()` | `L12486` | Re-render when a driver accepts an auto-offer |

**Router details:** `window.go` is defined at `L8774`. Title `Dashboard` from `titles.dashboard` `L2168`; subtitle `Thursday 25 Jun 2026 · 09:14 AM` from `subs.dashboard` `L2169` (hardcoded, and *never* refreshed by `refreshNavCounts()` — that function rewrites `subs.subscriptions/quickrides/trips/drivers/riders/renewal` only, `L9402`–`L9407`).

**Not re-rendered on ownership change.** `refreshOwnershipSurfaces()` `L19048` tries `if((pg==='dashboard'||pg==='interventions')&&typeof renderInterventions==='function')renderInterventions();` `L19054` — **`renderInterventions` is never defined anywhere in the file** (only `renderInterventionsPage` exists, `L10338`). The `typeof` guard swallows it silently, so claiming/releasing an inbox item does not refresh the dashboard. See §15.

---

## 3. Layout map

| Order | Element | Line | Container id / class |
|---|---|---|---|
| 1 | Page header `.ph` | `L677`–`L680` | — |
| 1a | `<h1>Dashboard</h1>` | `L678` | `.ph-l` |
| 1b | `<p>Thursday 25 Jun 2026 — Good morning, Sarah</p>` | `L678` | **hardcoded** |
| 1c | Money chip `#dash-money-line` | `L679` | pill, `onclick="go('finance',null)"`, `title="Open Finance"` |
| 1d | Button `+ New subscription` | `L679` | `btn p sm` → `openRenewModal('new')` |
| 2 | KPI strip `.g5#dash-kpis` (5 tiles) | `L681` | filled by `renderDashboard` `L10371` |
| 3 | Card `🚨 Needs intervention now` | `L682` | badge `#dash-intervene-count` (`b b-red`), button `Open the work inbox →` → `go('inbox',null)`, body `#dash-intervene.grp-scroll` |
| 4 | 2-col grid `.g2` | `L683`–`L699` | — |
| 4a | Card `📋 Subscription rides — today` | `L684`–`L691` | badge `#dash-sub-count` (`b b-blue`), button `All subscriptions` → `go('subscriptions',null)`, table `tbody#dash-sub-tbody` |
| 4b | Card `⚡ Quick rides — today` | `L692`–`L698` | badge `#dash-qr-count` (`b b-purple`), button `All quick rides` → `go('quickrides',null)`, table `tbody#dash-qr-tbody` |
| 5 | 2-col grid `.g2` | `L700`–`L710` | — |
| 5a | Card `Alert queue` | `L701`–`L704` | badge `#dash-alerts-count` (`b b-red`), button `All alerts` → `go('trips',null)`, body `#dash-alerts.grp-scroll` |
| 5b | Card `Renewal pipeline` | `L705`–`L708` | button `Full view` → `go('renewal',null)`, body `#dash-renewals.grp-scroll` (flex column, gap 6px) |

The page has **no card-level filter, search box, date picker, tab or toggle**.

---

## 4. KPIs & metrics

All five tiles are emitted by `dashKpi(lbl,val,delta,color,bar,click)` `L9410`–`L9412`. The tile renders: label, value (coloured by `color`, default inherits), delta sub-line, and a progress bar whose width is the `bar` argument as a percent and whose fill colour is `color || var(--blue)`. **There are no threshold-driven colour bands on the dashboard — each tile's colour is a fixed constant, not a function of the value.**

| # | Label | Value source | Exact formula | Units | Bar width formula | Fixed colour | Click |
|---|---|---|---|---|---|---|---|
| 1 | `Subscription trips today` | `DB.trips` | `subsT.length` where `subsT = all.filter(t => t.kind==='Subscription')`, `all = Object.values(DB.trips).filter(t => (t.date||'').indexOf('25 Jun')===0)` `L10348`,`L10350` | trips (count) | `Math.min(100, subsT.length*20)` `L10372` | default `var(--blue)` | `go('subscriptions',null)` |
| 1-delta | `<activeSubs> active subscriptions` | `DB.subscriptions` | `Object.keys(DB.subscriptions).filter(k => DB.subscriptions[k].status!=='Cancelled').length` `L10355` | count | — | — | — |
| 2 | `Quick rides today` | `DB.trips` | `qrT.length` where `qrT = all.filter(t => t.kind!=='Subscription')` `L10351` | rides (count) | `Math.min(100, qrT.length*20)` `L10373` | `var(--purple)` | `go('quickrides',null)` |
| 2-delta | `On-time today: <onTime>%` | `DB.trips` | `notC = all.filter(t => !/Cancelled/i.test(t.status))`; `lateT = notC.filter(t => /Late/.test(t.status))`; `onTime = notC.length ? Math.round((notC.length-lateT.length)/notC.length*100) : 100` `L10352`–`L10354` | percent, integer | — | — | — |
| 3 | `Pending approvals` | `DB.pendingDrivers` (`L2712`) | `(DB.pendingDrivers||[]).filter(a => (a.status||'pending')==='pending').length` `L10356` | applications (count) | `Math.min(100, pendApp*25)` `L10374` | `var(--amber)` | `go('drivers',null)` |
| 3-delta | `Awaiting review` | — | literal string `L10374` | — | — | — | — |
| 4 | `Open alerts` | computed `alerts[]` (see §8) | `alerts.length` `L10375` | alerts (count) | `Math.min(100, alerts.length*20)` `L10375` | `var(--red)` | **none — tile is not clickable** (`click` arg `null`) |
| 4-delta | `<crit> critical` | computed | `alerts.filter(a => a.sev==='r').length` `L10368` — i.e. only "Repeated lateness — deduction applied" rows count as critical | count | — | — | — |
| 5 | `Active drivers` | `DB.drivers` | `Object.keys(DB.drivers).length` `L10357`,`L10376` | drivers (count) | `drvKeys.length ? Math.round(avail/drvKeys.length*100) : 0` `L10376` | `var(--teal)` | `go('drivers',null)` |
| 5-delta | `<avail> available now` | `DB.drivers` + `DB.trips` + `DB.liveTrips` | `avail = drvKeys.filter(k => !driverLiveState(k).busy).length` `L10358`. `driverLiveState()` `L7283`: `busy = true` if any `DB.trips[*].driver===id && status==='In trip'`, **or** the driver appears in `DB.liveTrips` | count | — | — | — |

### Money chip (`#dash-money-line`)
`L10444`–`L10446`: `refToday = sum of (r.amount||0) over DB.refunds where r.date==='25 Jun'`; rendered as `'Refunds today: ' + fmtSAR(refToday)`. `fmtSAR(n)` = `n.toFixed(2)+' SAR'` `L4394`.
**Seeded `DB.refunds` (`L2881`–`L2884`) contains only `19 Jun` and `18 Jun` rows, so this chip reads `Refunds today: 0.00 SAR` on a fresh load** unless `recordRefund` adds a 25-Jun row during the session.

### Renewal health scoring (NOT rendered on this page)
`openHealthBreakdown()` `L20567` and `subHealthScore()` `L14210` are listed in this module group but are **not reachable from the dashboard itself**. Neither is exclusive to Renewal Pipeline: `openHealthBreakdown` fires from Renewal Pipeline (`L3368`, `L3372`, `L3373`), from the `renewalMenu()` context menu (`L20601`) and from the renewal-radar row renderer (`L21139`); `subHealthScore` has **seven** call sites plus one `.map` reference — `L3319`, `L14240`, `L14259`, `L14368` (`.map(subHealthScore)`), `L14372`, `L20570`, `L20597`, `L21117` — three of them inside the **Predictive Signals** module. Documented here for completeness because the function was assigned to this group:

`subHealthScore(sub)` `L14210`–`L14229` — starts at **100**, subtracts:

| Deduction | Condition | Reason string |
|---|---|---|
| −25 | `expectedPct - actualPct >= 0.30`, where `expectedPct = elapsed/totalDays` between `sub.started` and `sub.ends` measured against `REQ_NOW_REF`, and `actualPct = tripsDone/tripsTotal` from `sub.trips` (`"5/5"`) | `Behind expected pace (X% done, Y% of time elapsed)` |
| −15 | `!DB.subBackups[sub.id]` | `No backup captain — single point of failure` |
| −25 | any open `DB.disputes` with `against===sub.driver`, **or** any open `DB.incidents` with `against===sub.driver` | `Assigned driver has an open dispute/incident` |
| −10 | `DB.riders[sub.rider].complaints.length > 0` | `N prior complaint(s) on file` |
| −20 | `DB.paymentRisk[sub.rider]` truthy | `Payment risk: <value>` |
| −30 | `DB.complianceSuspensions[sub.driver]` truthy | `Assigned driver is currently suspended` |

Final score `Math.max(0, score)`. Colour bands **in `openHealthBreakdown` `L20570`**: `>=70` green, `>=40` amber-dk, else red. Colour bands in `healthBand()` `L14231` (used by Predictive page): `>=80` `Healthy`/green, `>=50` `At risk`/amber, else `Predicted churn`/red. **These two band sets disagree — 40–49 is red in the modal but "At risk" amber elsewhere; 70–79 is green in the modal but "At risk" elsewhere.**

---

## 5. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| `<p>Thursday 25 Jun 2026 — Good morning, Sarah</p>` `L678` | — | **hardcoded literal** | Name is not read from `meUser()` / `CURRENT_USER_ID` |
| Top-bar subtitle `Thursday 25 Jun 2026 · 09:14 AM` | `subs.dashboard` `L2169` | **hardcoded literal** | |
| `#dash-money-line` | `DB.refunds[].amount` where `date==='25 Jun'` | computed sum, SAR | `L10444`–`L10446` |
| 5 KPI tiles | see §4 | computed | `L10371`–`L10376` |
| `#dash-intervene-count` | `buildInterventionItems().length` | computed | `L10443` |
| `#dash-intervene` rows | `DB.tickets`, `DB.rideRequests`, `DB.upcomingSubTrips` | computed HTML | `L9450`–`L9532` |
| `#dash-sub-count` | `subsT.length` | computed | `L10382` |
| `#dash-sub-tbody` | `DB.trips` (kind `Subscription`, date `25 Jun*`) | rows | `L10383`–`L10391` |
| `#dash-qr-count` | `qrEx.length` — **exceptions only, not total quick rides** | computed | `L10399` |
| `#dash-qr-tbody` | `DB.trips` (kind ≠ `Subscription`, date `25 Jun*`, status ≠ `Done`) | rows | `L10393`–`L10407` |
| `#dash-alerts-count` | `alerts.length` | computed | `L10412` |
| `#dash-alerts` rows | `DB.trips`, `DB.deductions`, `DB.subscriptions`, `DB.plans.weekly.cap` | computed | `L10360`–`L10367` |
| `#dash-renewals` cards | `DB.subscriptions` (non-cancelled), top 4 by days-left | computed | `L10420`–`L10439` |
| Sidebar badge `#sbb-dash` | `refreshNavCounts()` `L9397`–`L9400` | computed | see §11 |
| Rider / driver display names | `nm2(id)` `L3565` = `DB.riders[id]?.name ?? DB.drivers[id]?.name ?? id` | lookup | |
| Trip / status badges | `statusBadge(s)` `L3730` | regex → colour class | see §11 |

Date/time source note: `all` is filtered by the **literal string** `'25 Jun'` (`L10348`), and the renewal pipeline uses the **literal integer** `today = 25` (`L10423`). Neither reads `REQ_NOW_REF` (`L9555`, `new Date(2026,5,25,9,14,0)`) nor the wall clock.

---

## 6. Input fields / filters / tabs

**None.** The dashboard has zero `<input>`, `<select>`, `<textarea>`, filter chip, tab, checkbox or toggle. Confirmed by reading `L676`–`L712` and the whole of `renderDashboard()` `L10346`–`L10449`.

`kpiScrollTo(elId)` `L14535`–`L14543` is in this module group but **is not called from any dashboard element**. Its call sites are the Subscriptions KPIs (`L719`–`L722`, `L3490`–`L3493`), Readiness (`L872`–`L875`), Finance (`L931`–`L932`), Wallets (`L976`–`L979`, `L1004`–`L1007`), Quick rides (`L1135`–`L1138`), Support (`L1354`–`L1357`), Predictive (`L14378`–`L14379`), and the filter helpers `filterCoverage` `L13146`, `filterCompliance` `L13319`, `filterSafety` `L13396`, `filterZones` `L14130`, plus `L6341`. Behaviour: `scrollIntoView({behavior:'smooth',block:'center'})`, then removes/re-adds class `kpi-flash-target` (forcing reflow via `void el.offsetWidth` so a double-click restarts the animation) and strips it again after **1500 ms**.

---

## 7. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| `#dash-money-line` chip (whole pill) | `L679` | `go('finance',null)` | Navigate to Finance page | — | none | no | no |
| `+ New subscription` | `L679` | `openRenewModal('new')` `L5174` → `renderNewSubModal('','')` `L4771`* | Opens the New-subscription modal (see §10) | — (modal only) | none at open; `commitNewSub()` gates on `manage_subscriptions` | logged on commit (`new_subscription`) | no |
| `Open the work inbox →` | `L682` | `go('inbox',null)` | Navigate to Work Inbox | — | none | no | no |
| `All subscriptions` | `L685` | `go('subscriptions',null)` | Navigate | — | none | no | no |
| `All quick rides` | `L693` | `go('quickrides',null)` | Navigate | — | none | no | no |
| `All alerts` | `L702` | `go('trips',null)` | Navigate to **All Trips** (label says "alerts") | — | none | no | no |
| `Full view` | `L706` | `go('renewal',null)` | Navigate | — | none | no | no |
| KPI tile 1 / 2 / 3 / 5 | `L10372`, `L10373`, `L10374`, `L10376` | `go('subscriptions'/'quickrides'/'drivers'/'drivers',null)` | Navigate | — | none | no | no |
| KPI tile 4 (`Open alerts`) | `L10375` | — | **inert** — no `onclick`, no `cursor:pointer` | — | — | — | — |
| Sub-table row `Open` | `L10390` | `openProfile(t.id)` | Opens trip 360° profile | — | `openProfile` `L8827` resolves id; toast `No record for X` if unresolved | no | no |
| Sub-table `Rider` / `Driver` cell | `L10386`–`L10387` | `rowLink()` `L3283` → `openProfile(id)` | Opens rider/driver 360° | — | none | no | no |
| QR-table row `Open` | `L10405` | `openProfile(t.id)` | Opens trip 360° | — | none | no | no |
| Alert row sub-line (blue text) | `L10415` | `openProfile(a.link)` | Opens rider or driver 360° | — | none | no | no |
| Alert `Open` (btn warn) — late trip | `L10362` | `openProfile(t.id)` | Opens trip 360° | — | none | no | no |
| Alert `Review` (btn danger) — deduction | `L10363` | `openProfile(d.driver)` | Opens driver 360° | — | none | no | no |
| Alert `Call` (btn warn) — expiring sub | `L10364` | `priorityCall(nm2(sb.rider))` `L9149` | Opens the "📞 Priority call" modal | — | none | only if the operator presses `✓ Log` → `logPriorityCall()` `L9162` writes `priority_call` | no |
| Alert `Review` — cancellation cap | `L10367` | `openProfile(r)` | Opens rider 360° | — | none | no | no |
| Intervention `Open ticket` | `L9468` | `openTicketDetail(t.id)` `L8879` | Opens ticket-detail page | — | none | no | no |
| Intervention `Assign now` | `L9485` | `assignManually(r.id)` `L11871` | Sets `r.claimedBy = currentUserName()`, `r.claimedAt='Just now'`; re-renders Requests; opens the nearby-drivers map modal. Refuses if `r._locking` (toast `info`) or if already claimed by someone else (toast `warn`) | `DB.rideRequests[i].claimedBy/.claimedAt` | none at this step; `commitRequestAssign()` `L11885` gates on `live_ops` | `manual_assign` logged on commit `L11901` | no |
| Intervention `Find driver` | `L9514` | `showNearbyDriversMap(t.rider, t.id)` `L8354` | Opens the nearby-drivers map modal for the upcoming sub-trip | — | commit path `assignDriver` `L8488` logs `assign_driver` | yes (on commit) | no |
| Renewal card rider name | `L10434` | `openProfile(x.rider)` | Opens rider 360° | — | none | no | no |
| Renewal card `Renew` | `L10436` | `openRenewFlow(x.rider)` `L11277` | Opens the 3-step renewal wizard modal (Select plan → Payment → Result) | — | — | — | — |

\* `renderNewSubModal` is defined immediately before `updateNsPricePreview` (`L4816`-region); exact declaration line is the `function renderNewSubModal(riderId,planKey,direction,selectedDays,excludeDrivers)` header found by grep — see §16.

**None of the dashboard's actions are wrapped by `guardAction(...)`.** The gate list at `L17857`–`L21603` contains no dashboard handler.

---

## 8. Tables & lists

### 8.1 `📋 Subscription rides — today` (`tbody#dash-sub-tbody`, `L10383`–`L10391`)

Row source: `subsT` = `Object.values(DB.trips)` filtered to `date` starting `'25 Jun'` **and** `kind==='Subscription'`, sorted at `L10349` by `(b.date||'').localeCompare(a.date||'')` — i.e. **descending string order on the whole `"25 Jun HH:MM"` string**, which for same-day rows is latest-time-first.

| # | Column | Content | Line |
|---|---|---|---|
| 1 | `Trip ID` | `t.id`, monospace, `var(--blue)` — **plain text, not clickable** | `L10385` |
| 2 | `Time` | `t.date.split(' ')[2]` — the `HH:MM` token | `L10385` |
| 3 | `Rider` | `rowLink(t.rider, nm2(t.rider))` → `openProfile(t.rider)` | `L10386` |
| 4 | `Driver` | `rowLink(t.driver, nm2(t.driver))` → `openProfile(t.driver)` | `L10387` |
| 5 | `Plan` | `planWord(t.rider)` `L10379` — first word of the plan on the rider's first non-cancelled subscription (`Weekly` / `Bi-weekly` / `Monthly`). Badge class `b-com` if that plan matches `/Comfort/`, else `b-eco`. Renders `—` in `var(--ghost)` when the rider has no active subscription | `L10388` |
| 6 | `Status` | `statusBadge(t.status)` `L3730` | `L10389` |
| 7 | *(unlabeled)* | `Open` button → `openProfile(t.id)` | `L10390` |

Row click: **none** (only the two name cells and the Open button are clickable).
Empty state: `<tr><td colspan="7">No subscription trips today.</td></tr>` — ghost colour, 11px `L10391`.

### 8.2 `⚡ Quick rides — today` (`tbody#dash-qr-tbody`, `L10393`–`L10407`)

Row source: `qrEx` = `qrT.filter(t => t.status !== 'Done')` `L10397`. Design note at `L10395`–`L10396` states completed rides "carry no decision" and fold into a counter.

| # | Column | Content | Line |
|---|---|---|---|
| 1 | `Trip ID` | `t.id`, monospace, `var(--purple)` — plain text | `L10401` |
| 2 | `Time` | `t.date.split(' ')[2]` | `L10401` |
| 3 | `Rider` | `rowLink(...)` → `openProfile(t.rider)` | `L10402` |
| 4 | `Driver` | `rowLink(...)` → `openProfile(t.driver)` | `L10403` |
| 5 | `Status` | `statusBadge(t.status)` | `L10404` |
| 6 | *(unlabeled)* | `Open` → `openProfile(t.id)` | `L10405` |

**Footer row (always appended, unconditionally):** `<tr><td colspan="6">✓ N completed ride(s) today — details in Quick rides</td></tr>` in `var(--green)`, where `N = qrT.length - qrEx.length` `L10398`,`L10406`. Pluralisation `'ride'+(qrDone===1?'':'s')`.
**There is no dedicated empty state** — when `qrEx` is empty the table shows only this green footer row.
Badge `#dash-qr-count` shows `qrEx.length`, **not** `qrT.length` — the card header therefore under-reports total quick rides today.

### 8.3 `Alert queue` (`#dash-alerts`; array built `L10360`–`L10368`, rendered `L10409`–`L10418`)

Built as a flat array `alerts[]` in source order (no sort applied). Row shape `{sev, title, sub, link, btn, time}`; rendered as `.al-row` with an icon block, body, right-aligned time, and the action button `L10413`–`L10416`.

| Alert type | Source query | `sev` | Icon | Title | Sub-line | Time | Button | Line |
|---|---|---|---|---|---|---|---|---|
| Trip running late | `lateT` = today's non-cancelled trips with `/Late/.test(status)` | `a` (amber) | `⚠️` / `ai-a` | `Trip running late (<n> min)` where `<n>` = `t.status.replace('Late ','')` | `nm2(rider) · Driver: nm2(driver)` | `t.date.split(' ')[2]` | `Open` (`btn sm warn`) → `openProfile(t.id)` | `L10362` |
| Repeated lateness — deduction applied | `DB.deductions` where `/Late/i.test(d.type) && d.status==='applied'` | `r` (red / **critical**) | `⛔` / `ai-r` | `Repeated lateness — deduction applied` | `nm2(d.driver) · d.type` | `—` | `Review` (`btn sm danger`) → `openProfile(d.driver)` | `L10363` |
| Renewal risk | `DB.subscriptions` where `status==='Expiring'` | `a` | `⚠️` | `Renewal risk — subscription expiring` | `nm2(rider) · plan · ends <ends>` | `—` | `Call` (`btn sm warn`) → `priorityCall(nm2(sb.rider))` | `L10364` |
| Cancellation cap reached today | per-rider count of today's trips with `/Cancelled/i.test(status)` ≥ `DB.plans.weekly.cap` (**= 1**, `L2890`) | `a` | `⚠️` | `Cancellation cap reached today` | `nm2(r) · <n>/<cap> used` | `—` | `Review` (`btn sm`) → `openProfile(r)` | `L10365`–`L10367` |

Sub-line is always clickable (`cursor:pointer; color:var(--blue)`) → `openProfile(a.link)` `L10415`.
Empty state: `No open alerts. ✓` in ghost colour `L10417`.
**Known defect (matching the audit note at `L20553`–`L20556`):** the `Call` button passes `nm2(sb.rider)` — a *name* — as `priorityCall`'s first parameter; the third parameter (`entityId`) is left undefined, so `logPriorityCall` records `entityId||name` and the audit entry is keyed by a display name rather than an id (`L9162`).

### 8.4 `Renewal pipeline` (`#dash-renewals`, `L10420`–`L10439`)

Row source: `Object.values(DB.subscriptions)` filtered `status!=='Cancelled'`, mapped to `{s, dl, used, tot, risk}`, sorted **ascending by `dl`**, then `.slice(0,4)` — a fixed top-4 preview `L10424`–`L10429`.

- `dl` (days left) = `parseInt(x.ends,10) - 25` — the leading integer of the `ends` string (`'26 Jun'` → 26) minus the hardcoded `today=25` `L10423`,`L10426`.
- `used` / `tot` = the two halves of `x.trips` (`'5/5'`), defaulting to `'0/1'` `L10426`.

Risk band `L10427`:

| Band | Condition | Badge class | Bar-fill class |
|---|---|---|---|
| `At risk` | `x.status==='Expiring'` **OR** `dl <= 1` | `b-red` | `rf-r` |
| `Likely` | else `used >= tot` | `b-green` | `rf-g` |
| `Uncertain` | otherwise | `b-amber` | `rf-a` |

Per-`dl` group header inserted whenever `dl` changes `L10432`: `Expiring in <dl> day(s)`, uppercase 9.5px, colour `var(--red)` if `dl<=1` else `var(--amber)`.
Card contents `L10434`–`L10436`: rider name (blue, `openProfile(x.rider)`) · risk badge · progress bar width `Math.round(used/tot*100)%` · `x.plan · x.trips done` · `Renew` button (class `warn` when At risk, else `p`) → `openRenewFlow(x.rider)`. Card gets `border-color:var(--red-border)` when At risk `L10434`.
Empty state: `No upcoming expirations.` `L10438`.
**No count badge exists on this card** (unlike the other three), and `dl` can be **negative** for a subscription whose `ends` day is earlier in the month — the header then reads e.g. `Expiring in -6 days`. Seeded non-cancelled subs all end 26–30 Jun, so this does not surface on a fresh load.

### 8.5 `🚨 Needs intervention now` (`#dash-intervene`, `L10441`–`L10448`)

Rendered from `buildInterventionItems()` — full taxonomy in §9. The **same array** feeds the standalone Interventions page via `renderInterventionsPage()` `L10338`, which `renderDashboard` calls at `L10447`.
Empty state: `✓ All clear — nothing needs a human right now.` in `var(--green)` `L10448`.

---

## 9. Intervention item taxonomy (`buildInterventionItems()` `L9450`–`L9532`)

Three declared tiers (design contract at `L9414`–`L9439`): **🔴 Critical now** (in list, red), **🟡 Watch** (in list, amber, below a separator), **⚪ Readiness** (deliberately *excluded* — lives on the Readiness page and the Live-map sub-trip panel).

Constants: `IV_CRITICAL_MINS = 30` `L9440`, `IV_WATCH_MINS = 60` `L9441`.

`ivUrgencyLabel(mins)` `L9443`–`L9448` (helper, distinct from the alert list):

| `mins` | Text | Colour | Weight |
|---|---|---|---|
| ≤ 15 | `in <n> min` | `var(--red)` | 700 |
| ≤ 30 | `in <n> min` | `var(--red)` | 600 |
| ≤ 60 | `in <n> min` | `var(--amber-dk)` | 600 |
| > 60 | `in ~<h>h` (`Math.round(mins/60)`) | `var(--muted)` | 400 |

| # | Item type | Source query | Tier rule | Sort key | Icon | Title | Sub-line (click) | Extra line | Action button | Lines |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **SLA breached** | `DB.tickets` → `slaState(t)`; skip if `!s`, `s.closed`, `s.paused`; `breached = s.frBreached\|\|s.resBreached\|\|s.updBreached` | always **critical** | `0` | `⏰` / `ai-r`, left border 3px red | `SLA breached — <rcLabel(t.reasonCode)>` | `t.id · t.entityName · t.subject` → `openTicketDetail(t.id)` | `slaBadge(t)` `L14791` | `Open ticket` (`danger`) | `L9455`–`L9472` |
| 2 | **SLA at risk** | same, `atRisk = !breached && s.resPct >= DB.slaPolicy.atRiskPct` (**75**, `L14657`) | **watch** | `500` | `⏱` / `ai-a` | `SLA at risk — <rcLabel>` | same | `slaBadge(t)` | `Open ticket` (`warn`) | `L9455`–`L9472` |
| 3 | **No drivers found** | `DB.rideRequests` where `status==='no_drivers'` | always **critical** | `0` | `🚫` / `ai-r`, left border 3px red | `No drivers found — <span.js-wait>waiting</span> waiting` | `nm2(r.rider) · r.pickup → r.dest` → `openProfile(r.rider)` | `SLA at risk — assign immediately` (red, 600) | `Assign now` (`danger`) → `assignManually(r.id)` | `L9475`–`L9489` |
| 4 | **Awaiting assignment** | `DB.rideRequests` where `status!=='no_drivers'` (i.e. `searching` / `offered`) | **watch** | `999` | `⏳` / `ai-a` | `Awaiting assignment — <waiting> waiting` | same | — | `Assign now` (`warn`) | `L9475`–`L9489` |
| 5 | **No driver assigned** | `DB.upcomingSubTrips` → `tripScenario(t).key === 'unassigned'` (`L8293`: no `t.driver` or driver not in `DB.drivers`) | `alwaysCritical:true` → **critical regardless of `minutesUntil`** | `mins` | `🚫` | `No driver assigned · <ivUrgencyLabel>` | `nm2(t.rider) · t.route` → `openProfile(t.rider)` | `Critical — pickup imminent` when `mins<=15` | `Find driver` (`danger`) → `showNearbyDriversMap(t.rider,t.id)` | `L9497`–`L9518` |
| 6 | **Driver unavailable** | `tripScenario(t).key === 'unavailable'` (`L8299`: `t.driverStatus==='unavailable'`) | critical if `mins<=30`; watch if `mins<=60`; **dropped entirely if `mins>60`** | `mins` | `⛔` | `Driver unavailable · <urgency>` | same | same | `Find driver` (`danger`/`warn`) | `L9497`–`L9518` |
| 7 | **Driver not moving** | `tripScenario(t).key === 'late'` (`L8305`: `t.minutesUntil<=30 && t.driverStatus==='not_started'`) | critical if `mins<=30`; watch if `mins<=60`; dropped if `mins>60` | `mins` | `⚠️` | `Driver not moving · <urgency>` | same | same | `Find driver` | `L9497`–`L9518` |

`tripScenario` keys **not** used by the intervention builder (`scCfg` at `L9492`–`L9496` covers only `unassigned`/`unavailable`/`late`): `unconfirmed` `L8310`, `watch` `L8315`, `watch_confirm` `L8320`, `ok` `L8325`. Those rows never reach the dashboard.

Ordering `L9520`–`L9531`: `critical.sort(by sort asc)` then `watch.sort(by sort asc)`; the critical block is emitted first; **if and only if there is at least one critical item**, a separator strip is inserted before the watch block:
`⏱ Watch — action needed within the hour` (9.5px uppercase, `var(--amber-dk)`, bg `var(--bg2)`, hairline borders top and bottom) `L9526`–`L9529`.

Live counter: the `.js-wait` spans inside item types 3 and 4 are refreshed **every tick (1 s)** by `L12576`–`L12579`, reading `DB.rideRequests[*].waiting` by `data-req`.

---

## 10. Modals opened

| Trigger | Modal | Title | Fields / body | Buttons | Commit fn | Lines |
|---|---|---|---|---|---|---|
| `+ New subscription` (`L679`) | New subscription | `New subscription` | `Rider*` (csel `ns-rider`, options = every `DB.riders` entry, hint `Already has N plan(s)`); `Plan tier & vehicle*` (csel `ns-plan`, cartesian of `PLANS` × `[eco, comfort]`, hint `<discountPct>% off · <eyvarPct>% commission`; replaced by a red coverage-blocked notice when `!isPlanVisibleForRider(riderId)`); `Pickup point` + `Destination` (csels over `RIYADH_DISTRICTS`); `Trip direction` radios `one-way` (default) / `round-trip`; `Departure time` `<input type=time>` default `07:00`; `Return time` `<input type=time>` default `17:00` (hidden unless round-trip); `Days of the week*` — 7 checkboxes `.ns-day-cb`, **default `[0,1,2,3,4]` (Sun–Thu)**; live price preview `#ns-price-preview`; nearest-eligible-driver list `#ns-driver-list` + map toggle | `Cancel` → `closeModal()`; `Create subscription` (**rendered only when `eligibleCount>0`**) | `commitNewSub()` — gates on `requirePerm('manage_subscriptions')`, validates rider+plan+driver selection | `renderNewSubModal(...)` and `openRenewModal` `L5174`–`L5178` |
| Alert `Call` (`L10364`) | Priority call | `📞 Priority call` | Callee name; context line `manual` + optional entity id; live "Calling — HH:MM" pill; `Note (optional)` textarea `#call-note-ta` | `✕ End` (`danger`) → `closeModal()`; `✓ Log` (`p`) | `logPriorityCall(name,ctx,entityId)` `L9162` → `logAction('priority_call','contact',…)` + toast `✅ Call logged — <name>` | `L9149`–`L9165` |
| Renewal `Renew` (`L10436`) | Renewal wizard | 3-step (`Select plan` → `Payment` → `Result`), step bar at `L11285` | Populated from `renewOptionsFor(sub)` for `resolveFlowRider(rider)` | per-step | `openRenewFlow(rider)` `L11277` | `L11277`–`L11283` |
| Intervention `Assign now` / `Find driver` | Nearby drivers map | — | `showNearbyDriversMap(riderId, ustId)` `L8354` | — | `window.assignDriver` `L8488` → `logAction('assign_driver','trip',…)` | `L8354`, `L8488`–`L8499` |
| *(not reachable from this page)* | Renewal health | `Renewal health — <subId>` | Score `/100` in band colour; `What is pulling it down` list of `h.reasons`, or `Nothing is pulling this renewal down.`; explanatory footnote | `Rider 360°` → `openProfile(sub.rider)`; `Open subscription` → `openProfile(subId)`; `Offer renewal` (`p`) → `openRenewFlow(sub.rider)` | none — read-only panel | `openHealthBreakdown()` `L20567`–`L20594` |

All modals share `#modal-content` / `#modal-overlay.open`; `closeModal()` `L5216` also calls `reqClearLocks()` `L5229` (called from `L5218`), which deletes `_locking`, `claimedBy`, `claimedAt` from **every** `DB.rideRequests` and `DB.subscriptionRequests` row.

---

## 11. States & badges

| Badge / state | Element | Exact condition | Visual |
|---|---|---|---|
| `#dash-intervene-count` | `L682` | `buildInterventionItems().length` | `b b-red`, red pill |
| `#dash-sub-count` | `L685` | `subsT.length` | `b b-blue` |
| `#dash-qr-count` | `L692` | `qrEx.length` (non-`Done` quick rides only) | `b b-purple` |
| `#dash-alerts-count` | `L701` | `alerts.length` | `b b-red` |
| Sidebar `#sbb-dash` | `L497` (static default **`4`**) | `refreshNavCounts()` `L9397`–`L9400`: `interv = DB.rideRequests.length + count(DB.upcomingSubTrips where tripScenario.key ∈ {unavailable, unassigned, late})`. **Note: this is a different formula from `#dash-intervene-count`** — it counts *all* ride requests regardless of status and applies no `minutesUntil` cut-off. | `sb-badge a` (amber class, hardcoded in markup) |
| Intervention severity | `L9455`+ | `sev==='r'` → `ai-r` icon block; else `ai-a` | red vs amber icon tile |
| Alert severity | `L10414` | `a.sev==='r'` → `⛔` + `ai-r`; else `⚠️` + `ai-a` | |
| Trip status badge | `statusBadge(s)` `L3730`–`L3736` | `/done\|resolved\|closed/i` → `b-green`; `/trip\|active/i` → `b-blue`; `/late\|expir\|pend/i` → `b-amber`; `/cancel\|risk\|refund/i` → `b-red`; else `b-grey`. **First match wins, evaluated in that order** | coloured pill |
| Plan badge (sub table) | `L10388` | `/Comfort/` on the matched subscription's plan → `b-com`; else `b-eco`; no matching sub → `—` in `var(--ghost)` | pill / dash |
| Renewal risk badge | `L10427` | see §8.4 | `b-red` / `b-green` / `b-amber` |
| Renewal card border | `L10434` | risk label `=== 'At risk'` | `border-color:var(--red-border)` |
| Renewal group header colour | `L10432` | `dl<=1` → `var(--red)`; else `var(--amber)` | uppercase 9.5px label |
| SLA badge inside interventions | `slaBadge()` `L14791`–`L14801` | closed → grey `closed[· FR missed]`; paused → `⏸ paused — waiting on customer`; `frBreached` → red `⚠ No first response — <age> over`; `updBreached` → red `⚠ Update overdue by <age>`; `resBreached` → red `⚠ SLA breached — <age> over`; `resPct>=75` → amber `⏱ <age> to breach`; no first response yet → blue `↩ respond within <age>`; else ghost `<age> left` | inline text |
| KPI progress bar | `dashKpi` `L9411` | width = `bar`%, background = `color \|\| var(--blue)` | 100%-capped fill |

---

## 12. Cross-module links

**`go(...)` targets emitted by this page:** `finance` (`L679`), `inbox` (`L682`), `subscriptions` (`L685`, `L10372`), `quickrides` (`L693`, `L10373`), `trips` (`L702`), `renewal` (`L706`), `drivers` (`L10374`, `L10376`).

**`openProfile(...)` targets:** trip ids (`L10390`, `L10362`, `L10405`), rider ids (`L10386`, `L10402`, `L10367`, `L10415`, `L10434`, `L9482`, `L9512`), driver ids (`L10387`, `L10403`, `L10363`).

**Other cross-module calls:** `openRenewModal('new')` `L679` → Subscriptions creation flow; `openRenewFlow(rider)` `L10436` → Renewal wizard; `priorityCall()` `L10364` → Contacts/audit; `openTicketDetail()` `L9468` → Support Center; `assignManually()` `L9485` → Requests; `showNearbyDriversMap()` `L9514` → Live map / Readiness; `renderInterventionsPage()` `L10447` → keeps the standalone Interventions page in sync even when it is not visible.

**Inbound:** Interventions page (`renderInterventionsPage` `L10338`) and the Work Inbox both consume `buildInterventionItems()` / `inboxItems()` respectively — they are *separate* builders, not one shared list (see 03b §15).

---

## 13. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `Thursday 25 Jun 2026 — Good morning, Sarah` | `L678` | Date **and** operator name hardcoded in markup; not derived from `REQ_NOW_REF` or `meUser()` |
| `Thursday 25 Jun 2026 · 09:14 AM` (top-bar subtitle) | `L2169` | `subs.dashboard`, never refreshed |
| Static badge values `0` on `#dash-intervene-count`, `#dash-sub-count`, `#dash-qr-count`, `#dash-alerts-count` | `L682`,`L685`,`L693`,`L702` | Pre-render placeholders |
| Static sidebar badge `4` on `#sbb-dash` | `L497` | Placeholder until `refreshNavCounts()` runs |
| Date filter literal `'25 Jun'` | `L10348` | The entire "today" concept |
| `var today=25` in the renewal pipeline | `L10423` | Independent hardcoded copy of the same date |
| Refunds "today" filter `r.date==='25 Jun'` | `L10444` | No seeded refund matches → chip always `0.00 SAR` at load |
| KPI bar multipliers `*20`, `*25` | `L10372`–`L10375` | Arbitrary scaling; not a real capacity denominator |
| Renewal preview hard limit `.slice(0,4)` | `L10429` | |
| `NOTIF_PANEL_PREVIEW`-style constants are not used here | — | |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | `L9555` | Demo clock; used by `subHealthScore` but **not** by `renderDashboard` |
| `SEED_EPOCH`/`agoMs()` synthetic ticket ages `[190,26,1500,55,8]` minutes | `L15191` | Chosen so the seeded queue shows one healthy, one at-risk and one breached SLA — directly drives what the intervention card shows on load |
| All of `DB.trips` `L2670`, `DB.subscriptions` `L2685`, `DB.pendingDrivers` `L2712`, `DB.deductions` `L2807`, `DB.refunds` `L2881`, `DB.upcomingSubTrips` `L6177`, `DB.rideRequests` `L2786` | | Seeded demo fixtures |
| `confirmModal()` = `alert('✅ Subscription confirmed and activated!')` | `L5233` | Used by the legacy `openRenewModal` renew/upgrade branches (**not** by the `'new'` branch this page uses) — a raw browser `alert`, no DB write |

---

## 14. i18n keys

| Key | Element | English source | Arabic |
|---|---|---|---|
| `nav.dashboard` | Sidebar label `L497` | `Dashboard` | `لوحة التحكم` `L7905` |
| `sec.overview` | Sidebar section header `L495` | `Overview` | `نظرة عامة` `L7912` |

**No element inside `#p-dashboard` carries a `data-i18n` attribute.** `applyLanguage()` `L7939`–`L7953` translates only elements with that attribute; the design note at `L7898`–`L7902` states explicitly that deep page content is English-only by design. In Arabic mode the page body remains English while the sidebar flips (`body.lang-ar` reorders via flexbox, `L382`).

---

## 15. Gaps, dead code, UNVERIFIED items

1. **`renderInterventions` is undefined.** `refreshOwnershipSurfaces()` `L19054` guards on `typeof renderInterventions==='function'` — grep across the whole file finds the identifier only at that one line. The dashboard therefore does **not** refresh when an operator claims, releases or takes over a work item. Dead branch; harmless but non-functional.
2. **Two divergent "interventions" counts.** `#dash-intervene-count` = `buildInterventionItems().length` (SLA + requests + filtered upcoming trips, with a 60-min cut-off) `L10443`; sidebar `#sbb-dash` = `DB.rideRequests.length + all` unassigned/unavailable/late upcoming trips, no time filter `L9397`–`L9400`. The two numbers will normally disagree.
3. **`#dash-qr-count` mislabels.** The badge next to "⚡ Quick rides — today" shows only the *exception* rides, while the card title implies the day's total `L10399`.
4. **`priorityCall(nm2(sb.rider))` passes a name into a slot the function documents as taking an entity id** `L10364` vs `L9149`; the audit entry falls back to `entityId||name` `L9162`. This is the exact defect the file's own audit note describes at `L20553`–`L20556` for the Renewal page — it survives here.
5. **KPI tile 4 (`Open alerts`) is inert** — no click target, unlike its four neighbours `L10375`. There is no `kpiScrollTo('dash-alerts')` binding.
6. **`kpiScrollTo()` is unused by this page** despite being grouped with it — its **42** call sites are all on other pages (§6). (`grep -o 'kpiScrollTo('` → 43 occurrences = 1 declaration + 42 calls.)
7. **`openHealthBreakdown()` / `subHealthScore()` are not reachable from the dashboard** — but they are *not* Renewal-Pipeline-exclusive either: `openHealthBreakdown` also fires from `renewalMenu()` `L20601` and the renewal-radar rows `L21139`, and `subHealthScore` is called from Predictive Signals (`L14240`, `L14259`, `L14368`, `L14372`) as well as `L3319`, `L20570`, `L20597`, `L21117`.
8. **Conflicting health colour bands** between `openHealthBreakdown` (70/40) `L20570` and `healthBand` (80/50) `L14231`.
9. **Renewal `dl` can go negative** for a subscription whose `ends` day-of-month is below 25, producing `Expiring in -N days` `L10426`,`L10432`. Not reachable with the seeded data.
10. **The alert list has no cap and no sort.** A large `DB.deductions` or many `Expiring` subscriptions would produce an unbounded, unordered list `L10360`–`L10367`.
11. **`Cancellation cap reached today` uses `DB.plans.weekly.cap` for every rider**, regardless of which plan that rider is actually on `L10366`. Bi-weekly (`cap:2`) and monthly caps are ignored.
12. **Quick-rides table has no true empty state** (§8.2).
13. **`All alerts` navigates to `trips`, not to an alerts view** `L702` — label/destination mismatch.
14. **No permission gate on any dashboard read or navigation.** `requirePerm` `L3126` is never invoked from `renderDashboard` or from any of the page's inline handlers; gating happens only downstream (`commitNewSub` → `manage_subscriptions`, `commitRequestAssign` → `live_ops`).
15. **UNVERIFIED — `renderNewSubModal` declaration line.** The function body was read in full, but its opening line number was located by grep rather than a direct `sed` range in this pass; the surrounding modal markup was verified at the lines cited in §10. Cited as "≈`L4771`-region" and flagged rather than asserted.
16. **UNVERIFIED — runtime values of `PLANS`, `CADENCE_META`, `RIYADH_DISTRICTS`, `WEEKDAYS`, `isPlanVisibleForRider`, `eligibleDrivers`, `computeDynamicSubPrice`.** These feed the New-subscription modal but belong to the Subscriptions/Pricing module; their definitions were not read in this pass.
17. **UNVERIFIED — `DB.subBackups`, `DB.paymentRisk`, `DB.complianceSuspensions` seed contents.** Referenced by `subHealthScore` `L14220`–`L14226`; the score arithmetic is verified, the seeded inputs are not.

---

## 16. Line-number index

| Symbol / element | Line(s) |
|---|---|
| `#p-dashboard` page markup | `L676`–`L712` |
| Page header, money chip, `+ New subscription` | `L677`–`L680` |
| `#dash-kpis` (`.g5`) | `L681` |
| `🚨 Needs intervention now` card | `L682` |
| `📋 Subscription rides — today` card | `L684`–`L691` |
| `⚡ Quick rides — today` card | `L692`–`L698` |
| `Alert queue` card | `L701`–`L704` |
| `Renewal pipeline` card | `L705`–`L708` |
| Sidebar item + `#sbb-dash` | `L497` |
| `titles` map | `L2168` |
| `subs` map | `L2169` |
| `DB.trips` seed | `L2670`–`L2683` |
| `DB.subscriptions` seed | `L2685`–`L2693` |
| `DB.pendingDrivers` seed | `L2712` |
| `DB.tickets` seed | `L2763`–`L2772` |
| `DB.rideRequests` seed | `L2786`–`L2790` |
| `DB.deductions` seed | `L2807`–`L2811` |
| `DB.teamUsers` seed | `L2830`–`L2841` |
| `CURRENT_USER_ID = 'USR-1'` | `L2862` |
| `DB.refunds` seed | `L2881`–`L2884` |
| `DB.plans` (`weekly.cap = 1`) | `L2889`–`L2893` |
| `can()` / `requirePerm()` / `logAction()` | `L3122` / `L3126` / `L3133` |
| `rowLink()` | `L3283` |
| `nm2()` | `L3565` |
| `statusBadge()` | `L3730`–`L3736` |
| `fmtSAR()` | `L4394` |
| `openRenewModal()` | `L5174`–`L5208` |
| `selOpt()` / `closeModal()` / `reqClearLocks()` / `confirmModal()` | `L5209` / `L5216` / `L5229` / `L5233` |
| `toast()` | `L5269`–`L5316` |
| `DB.upcomingSubTrips` seed | `L6177`–`L6242` |
| `driverLiveState()` | `L7283`–`L7292` |
| `LANG_STRINGS` / `applyLanguage()` | `L7903` / `L7939` |
| `tripScenario()` | `L8291`–`L8327` |
| `showNearbyDriversMap()` | `L8354` |
| `window.assignDriver` (re-renders dashboard) | `L8488`–`L8499` |
| `window.go` router | `L8774`–`L8826` (dashboard branch `L8787`) |
| `window.openProfile` | `L8827` |
| `window.openTicketDetail` | `L8879` |
| `priorityCall()` / `logPriorityCall()` | `L9149` / `L9162` |
| `refreshNavCounts()` | `L9392`–`L9408` |
| `dashKpi()` | `L9410`–`L9412` |
| Intervention triage doc-comment + `IV_CRITICAL_MINS` / `IV_WATCH_MINS` | `L9414`–`L9441` |
| `ivUrgencyLabel()` | `L9443`–`L9448` |
| `buildInterventionItems()` | `L9450`–`L9532` |
| `renderInterventionsPage()` | `L10338`–`L10345` |
| **`renderDashboard()`** | **`L10346`–`L10449`** |
| `openRenewFlow()` | `L11277`–`L11283` |
| `assignManually()` | `L11871`–`L11878` |
| `commitRequestAssign()` | `L11885`– |
| `.js-wait` tick updater | `L12576`–`L12579` |
| `tickEngine()` 60-tick dashboard refresh | `L12610`–`L12614` |
| `subHealthScore()` | `L14210`–`L14229` |
| `healthBand()` | `L14231`–`L14235` |
| `kpiScrollTo()` | `L14535`–`L14543` |
| `nowMs()` / `agoMs()` / `fmtAge()` | `L14627` / `L14629` / `L14630` |
| `DB.slaPolicy` (`atRiskPct: 75`) | `L14650`–`L14660` |
| `rcTargets()` / `rcLabel()` | `L14730` / `L14743` |
| `slaState()` / `slaBadge()` | `L14766` / `L14791` |
| `backfillReasonCodes()` (synthetic ticket ages) | `L15187`, ages array `L15191` |
| `refreshOwnershipSurfaces()` (dead dashboard branch) | `L19048`–`L19057` |
| `openHealthBreakdown()` | `L20567`–`L20594` |
| `renewalMenu()` | `L20596`–`L20618` |
| Boot `renderDashboard()` | `L14586` |
