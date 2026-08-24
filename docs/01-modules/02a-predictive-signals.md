# Module: Predictive Signals

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `predictive` — container `<div class="page" id="p-predictive">`
> **HTML lines:** L1189–L1217 (page block); sidebar entry L490–L491
> **Sidebar group:** `Intelligence` (`sec.intelligence`, L490)
> **Primary render:** `renderPredictivePage()` L14367–L14384
> **Sub-renders:** `renderPredSubs()` L14236–L14254 · `renderPredDrivers()` L14307–L14323 · `renderPredPayment()` L14325–L14339 · `renderPredIncidents()` L14341–L14354 · `renderPredZones()` L14356–L14366
> **Scoring:** `subHealthScore()` L14210–L14230 · `healthBand()` L14231–L14235 · `driverRiskScore()` L14284–L14306 · `parseShortDate()` L14200–L14205
> **Actions:** `openRetentionAction()` L14255–L14271 · `commitRetentionAction()` L14272–L14283

---

## 1. Purpose

A single early-warning layer that flags problems **before** they land, across five independent domains: subscription churn, driver availability, renewal payment failure, repeat incident patterns, and structural zone shortages. The module banner (L14191–L14197) states the shared recipe: *historical pattern + current early signal + a threshold that fires BEFORE the failure, not after*, and says the page generalises a technique "already proven in two places (subscription search window, document expiry)".

Page header copy (L1192): `🔮 Predictive signals` / *"Pattern + early-signal + threshold — flagged before the problem lands, not after"*.

Toolbar title `Predictive Signals` (`titles` map, L2168); toolbar subtitle `Early-warning signals across the whole system` (`subs` map, L2169).

---

## 2. Entry points & routing

| Entry | Line | Effect |
|---|---|---|
| Sidebar item `onclick="go('predictive',this)"` | L491 | Navigates to page id `predictive` |
| `go()` page dispatch — `if(id==='predictive'){renderPredictivePage();}` | L8801 | Full re-render on every navigation |
| Demo tick loop (`__tickCount % 60 === 0`) | L12618–L12621 | After `complianceScan()`, re-renders **only if** `#p-predictive` carries class `on` — keeps document-expiry-driven risk current as the demo clock advances |
| Retention modal → `assignBackup(subId)` | L14267 | Cross-module jump into the Coverage module's picker |

**No view permission gate.** `window.go` (L8774–L8826) performs no `requirePagePerm('predictive','view')` check, so any signed-in operator can open the page. Only the *act* path is enforced (see §7).

Sidebar badge `#sbb-predictive` (L491, static default text `0`) is written **only** by `renderPredictivePage()` (L14382). It is not touched by `refreshNavCounts()`, so it reads `0` until the page has been visited at least once in the session.

---

## 3. Layout map

| Order | Container | id | Line | Rendered by |
|---|---|---|---|---|
| 1 | Page header `.ph` (title + strapline) | — | L1191–L1193 | Static HTML |
| 2 | KPI row `.g4` (4 cards) | `predictive-kpis` | L1194 | `renderPredictivePage()` L14378–L14381 |
| 3 | Card — `📉 Subscription health — churn risk`, caption *"Weighted score from pace, coverage, incidents, payment risk — worst first"* | `pred-subs-list` (`max-height:420px; overflow-y:auto`) | L1195–L1198 | `renderPredSubs()` |
| 4 | Card — `🚕 Driver availability risk`, caption *"Likely to become unavailable before it happens"* | `pred-drivers-list` (`max-height:420px; overflow-y:auto`) | L1199–L1202 | `renderPredDrivers()` |
| 5 | 2-column grid wrapper (`grid-template-columns:1fr 1fr; gap:14px; margin-top:14px`) | — | L1203–L1212 | — |
| 5a | Card — `💳 Renewal payment risk`, caption *"Prior declined attempt + renewal due soon"* | `pred-payment-list` (`padding:0; max-height:320px`) | L1204–L1207 | `renderPredPayment()` |
| 5b | Card — `⚠️ Repeat incident pattern`, caption *"2+ incidents/disputes — a pattern, not a one-off"* | `pred-incident-list` (`padding:0; max-height:320px`) | L1208–L1211 | `renderPredIncidents()` |
| 6 | Card — `🗺️ Structural zone patterns`, caption *"Persistently starved — needs a schedule fix, not a one-day offer"* | `pred-zone-list` (`padding:0; max-height:320px`) | L1213–L1216 | `renderPredZones()` |

---

## 4. KPIs & metrics

All four cards are produced in one `innerHTML` assignment, L14378–L14381. Every card carries classes `kpi click` plus an `onclick` and a `title`.

| # | Label | Source / Formula | Units | Colour | Sub-label | Progress bar | Click |
|---|---|---|---|---|---|---|---|
| 1 | `Open signals (all types)` | `redSubs + atRiskDrivers + Object.keys(DB.paymentRisk).length` (L14378) | count | `var(--amber)` — unconditional | `flagged before failure` | **hardcoded `width:55%`** (L14378) | `kpiScrollTo('pred-subs-list')`, title *"Scroll to subscription health"* |
| 2 | `Predicted churn (subs)` | `redSubs` = count of non-cancelled subscriptions where `subHealthScore(s).score < 50` (L14368–L14369) | count | `var(--red)` — unconditional | `score below 50` | `min(100, redSubs*20)%` (L14379) | `kpiScrollTo('pred-subs-list')` |
| 3 | `At-risk drivers` | `atRiskDrivers` = count over **all** `DB.drivers` where `driverRiskScore(d).score < 80` (L14370) | count | `var(--red)` — unconditional | `availability signal` | `min(100, atRiskDrivers*20)%` (L14380) | `kpiScrollTo('pred-drivers-list')`, title *"Scroll to driver availability risk"* |
| 4 | `Revenue at risk` | `Σ subEconomics(s).remaining` over non-cancelled subs with `subHealthScore(s).score < 50`, printed `.toFixed(0)` (L14371–L14373, L14381) | SAR (integer; no currency symbol on the numeral) | `var(--amber)` — unconditional | `SAR deferred, predicted churn` | **hardcoded `width:40%`** (L14381) | `kpiScrollTo('pred-subs-list')` |

**`subEconomics(sub).remaining`** — `subEconomics()` L3605–L3616:
`paid = parseFloat(String(sub.paid).replace(/[^\d.]/g,''))` · `perTrip = paid / total` · `consumed = min(done,total) × perTrip` · `remaining = max(0, paid − consumed)` — i.e. unearned, deferred revenue on the package.

**Sidebar badge:** `#sbb-predictive.textContent = redSubs + atRiskDrivers` (L14382). It deliberately omits payment-risk, incident and zone signals, so it does **not** match KPI 1.

**Score → band** (`healthBand()` L14231–L14235), shared by both scored tables:

| Score range | Label | Badge class |
|---|---|---|
| `>= 80` | `Healthy` | `b-green` |
| `50 – 79` | `At risk` | `b-amber` |
| `< 50` | `Predicted churn` | `b-red` |

**Score-bar fill colour** (subscription table only, L14248): `>=80` → `var(--green)`; `>=50` → `var(--amber)`; else `var(--red)`. Bar is 5 px tall, track `var(--bg2)`, fill `width:{score}%`, min-width 90 px on the cell.

**Row highlight:** `background:var(--red-lt)` on the `<tr>` when `score < 50` — subscriptions L14245, drivers L14316.

---

## 5. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| Subscription id | `DB.subscriptions[k].id` (seed L2686–L2692) | string | Monospace 11 px, `var(--blue)`, click → `openProfile(id)` (L14246) |
| Rider name | `nm2(sub.rider)` → `DB.riders[id].name` (L3565) | string | Click → `openProfile(riderId)` (L14247) |
| Health score | computed — `subHealthScore(sub).score` | int 0–100 | Bar + bold numeral (L14248) |
| Health band | computed — `healthBand(score)` | badge | L14249 |
| Signal reasons | computed — `subHealthScore(sub).reasons` | string[] | Joined with ` · `; literal fallback `No risk signals` (L14250) |
| Subscription status filter | `DB.subscriptions[k].status` | string | `!/cancel/i.test(status)` used at L14239, L14368, L14372 |
| `sub.started` / `sub.ends` | `DB.subscriptions[k]` — e.g. `'19 Jun'` / `'26 Jun'` | short-date string | Parsed by `parseShortDate()` (L14200–L14205), which **hardcodes year 2026** |
| `sub.trips` | `DB.subscriptions[k].trips` — e.g. `'5/5'` | `"done/total"` string | Split on `/`; denominator forced to ≥1 |
| `sub.paid` | `DB.subscriptions[k].paid` — e.g. `'86.50 SAR'` | string → float | Feeds `subEconomics()` |
| Backup captain presence | `DB.subBackups[subId]` (seed L13140 — `{'SUB-1052':'DRV-0105','SUB-1060':'DRV-0101'}`) | map subId→driverId | Absence is a −15 signal |
| Open disputes | `DB.disputes[]` where `against===sub.driver && status==='open'` (seed L14391–L14396) | array | |
| Open incidents | `DB.incidents[]` where `against===sub.driver && status==='open'` (seed L13389–L13393) | array | |
| Rider prior complaints | `DB.riders[sub.rider].complaints` (e.g. L2597 `complaints:[]`) | array | Count appears in the reason text |
| Payment-risk note | `DB.paymentRisk[riderId]` (L14199) | map riderId→string | **Hardcoded mock, one entry** |
| Compliance suspension reason | `DB.complianceSuspensions[driverId]` (declared empty L13285; populated by `complianceScan()` L13296+) | map driverId→reason | |
| Driver name | `nm2(driverId)` | string | Click → `openProfile(driverId)` (L14317) |
| Driver document expiry | `DB.driverDocs[drvId][docType]` (seed L13278–L13284), ISO `YYYY-MM-DD` | date string | Converted by `docDaysLeft()` L13286–L13289 |
| Driver open-issue count | `DB.disputes` + `DB.incidents` filtered `against===drvId && status==='open'` | int | L14294–L14295 |
| Backup load | count of `DB.subBackups` values `=== drvId` | int | L14297 |
| Primary load | `activeSubsList()` (L13141–L13144) filtered `s.driver===drvId` | int | L14298 |
| Cash debt | `-(DB.driverCashDebt[drvId] ‖ 0)` (`DB.driverCashDebt` starts `{}`, L12081) | SAR, stored negative | Rendered through `fmtSAR()` |
| Cash risk count | `driverCashRiskCount(drvId)` L12097–L12099 — `DB.cashLedger` rows for that driver with `classification==='under_report'` **or** `reportedAmount==null` | int | `DB.cashLedger` starts `[]` (L12080) |
| Renewal end date | `f.sub.ends` | short-date string | Badge text `{subId} · ends {ends}` (L14334) |
| Repeat-incident count | computed tally over `DB.disputes` + `DB.incidents` keyed on `against` | int | **All statuses**, L14344–L14345 |
| Zone name / demand / supply / failures30d | `DB.zones[]` (L13952–L13959) | objects | |
| Zone failure rate | `zoneFailRate(z)` L13974 = `round(z.failures30d / z.demand × 100)` | % | |
| "Now" reference | `REQ_NOW_REF` = `new Date(2026,5,25,9,14,0)` (L9555), advanced by `SUBREQ_TIME_ACCEL_MIN_PER_TICK`=1 min/tick (L9579, L9680) | Date | Demo clock |

---

## 6. Input fields

**The Predictive Signals page has no input fields of its own.** No search box, no filter chips, no `<select>`, no text input, no sort control, no date picker. Every list is fixed-scope and fixed-order. Verified across the full HTML block L1189–L1217 and every render function L14236–L14384.

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| *(none)* | — | — | — | — | — |

The only form control reachable from this module belongs to another module: the Coverage picker opened by `assignBackup()` (L13186–L13215), which presents up to six radio-free "Select" buttons rather than fields.

---

## 7. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `Retention action` — btn `sm p`, subscription table, rendered only when `score < 80` (L14251) | `openRetentionAction(subId)` L14255 | Opens the retention modal | none (read-only) | `requirePerm('manage_subscriptions')` **and** `requirePagePerm('predictive','act')` (L14256–L14257) | Denials logged as `permission_denied` (L3129, L10686) | No — the modal itself is the deliberate step |
| `Review documents` — btn `sm`, driver table (L14320) | `go('compliance',null)` | Navigates to Fleet Compliance | none | none | none | No |
| `Send renewal payment reminder early` — btn `sm p`, payment list (L14336) | `commitRetentionAction(subId,'payment-reminder')` | Audit entry + toast + ops notification **only**. No email is sent for this `kind` (see §15 item 3) | `DB.auditLog`, `DB.notifications` | `requirePagePerm('predictive','act')` (L14273) | `logAction('retention_action','subscription',subId,…)` | **Yes** — `GATE_SWEEP.commitRetentionAction` (L20862) |
| `Review` — btn `sm warn`, repeat-incident list (L14351) | `go('safety',null)` | Navigates to Safety & Incidents | none | none | none | No |
| `Open zone` — btn `sm p`, zone list (L14363) | `go('zones',null)` | Navigates to Zones (no per-zone deep link) | none | none | none | No |
| Zone name text (L14362) | `go('zones',null)` | Same as above | none | none | none | No |
| KPI cards 1, 2, 4 (L14378, L14379, L14381) | `kpiScrollTo('pred-subs-list')` | Smooth-scrolls the element into view, then applies `.kpi-flash-target` for 1500 ms (L14535–L14542) | DOM class only | none | none | No |
| KPI card 3 (L14380) | `kpiScrollTo('pred-drivers-list')` | Same | DOM class only | none | none | No |
| Any id / name link in any list | `openProfile(id)` L8827 | Switches to `p-profile`, pushes history, sets `navCurrent` | `navCurrent`, history stack | none | none | No |

### Modal buttons

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `📞 Flag for proactive call` (L14266) | `commitRetentionAction(subId,'call')` | Close modal → audit entry → success toast → ops notification | `DB.auditLog`, `DB.notifications` | `requirePagePerm('predictive','act')` | `retention_action` | Yes (gate L20862) |
| `🛡️ Assign backup captain now` (L14267) — rendered **only when** `!DB.subBackups[sub.id]` | `closeModal(); assignBackup(subId)` | Opens the Coverage backup-captain picker (≤6 candidates, sorted by distance to the rider) | `DB.subBackups` on commit | `assignBackup` requires `requirePerm('manage_subscriptions')` **and** `requirePagePerm('coverage','assign_backup')` (L13187–L13188) | `assign_backup` logged by `commitBackup()` (L13222) | `GATE_SWEEP.assignBackup` is explicitly `delete`d (L20886) — the picker is un-gated by design; `commitBackup` carries its own gate |
| `🎁 Send early-renewal loyalty offer` (L14268) | `commitRetentionAction(subId,'offer')` | Close modal → audit entry → **system email** → toast → ops notification | `DB.auditLog`, `DB.emailOutbox`, `DB.notifications` | `requirePagePerm('predictive','act')` | `retention_action` | Yes (gate L20862) |
| `✕` (L14260) | `closeModal()` | Dismiss | none | none | none | No |

### `commitRetentionAction(subId, kind)` — exact effects (L14272–L14283)

1. `requirePagePerm('predictive','act')` — aborts if denied (L14273).
2. `closeModal()` (L14274).
3. `logAction('retention_action','subscription',subId,'Proactive retention action ('+kind+') triggered for '+subId+' before renewal risk materialized',{},{})` (L14275) → appends an `AUD-nnnn` record to `DB.auditLog` carrying actor id, actor name and a `HH:MM:SS` timestamp (`logAction` L3133–L3150). `before` and `after` are both empty objects.
4. **Only when `kind === 'offer'`** (L14276–L14279): `sendSystemEmail(sub.rider, 'A little something before your renewal 🎁', <multi-line body naming the rider and subscription id>, 'promo')` → unshifts a `MAIL-nnnn` entry onto `DB.emailOutbox` and re-renders the outbox (L3578–L3584).
5. `toast('✅ Retention action logged for '+subId,'ok',null,false)` (L14281) — the fourth argument `notify=false` suppresses a bell entry from the toast itself.
6. `pushOpsNotification('alert','Retention follow-up — '+subId,'Action: '+kind+'. Check back before renewal date.', function(){openProfile(subId);})` (L14282) → unshifts onto `DB.notifications`, updates the bell badge (L9661–L9666).

**It never mutates the subscription.** Health score, band and the `Retention action` button are unchanged afterwards, and no page re-render is triggered.

### Confirmation gate wording (`GATE_SWEEP.commitRetentionAction`, L20862–L20863)

- Title: `Apply the retention action`
- `d:true` (danger); `irr` not set
- Consequences: `May issue credit or change the subscription terms.` · `Recorded against the rider and in the activity log.`
- Confirm button: `Apply`
- Installed by `installGateSweep()` → `gateAll(GATE_SWEEP)` (L20898–L20902) using the `guardAction()` wrapper (L17819–L17840), which re-invokes the original function only after `confirmAction()` resolves.

---

## 8. Tables & lists

### 8.1 Subscription health — churn risk (`#pred-subs-list`, `renderPredSubs()` L14236–L14254)

- **Markup:** `<table class="dt">` with `<thead>`/`<tbody>`.
- **Columns, in order (L14242):** `Subscription` · `Rider` · `Score` · `Band` · `Signals` · *(unlabelled action column)*.
- **Row source:** all values of `DB.subscriptions`, filtered by `!/cancel/i.test(s.status)` (L14239).
- **Sort:** ascending by health score — worst first (L14241, `a.h.score - b.h.score`).
- **Filters / search:** none.
- **Row click:** no whole-row handler. Cell level — subscription id → `openProfile(subId)` (L14246); rider name → `openProfile(riderId)` (L14247).
- **Empty state:** **none.** The `<thead>` is always emitted; if no subscription survives the filter, headers render over an empty body.
- **Conditional action cell (L14251):** `Retention action` button only when `score < 80`; otherwise an empty `<div class="ra">`.

### 8.2 Driver availability risk (`#pred-drivers-list`, `renderPredDrivers()` L14307–L14323)

- **Markup:** `<table class="dt">`.
- **Columns, in order (L14313):** `Driver` · `Score` · `Signals` · *(unlabelled action column)*.
- **Row source:** `Object.keys(DB.drivers)` (L14309), kept only when `driverRiskScore(id).reasons.length > 0` (L14310).
- **Sort:** ascending by score (L14311).
- **Filters / search:** none.
- **Row click:** driver-name cell → `openProfile(driverId)` (L14317).
- **Empty state (L14312):** `No drivers currently show an availability-risk signal.` — centred, 11 px, `var(--ghost)`, 16 px padding.
- **Score cell (L14318):** one badge, `<span class="b {band.cls}">{score} — {band.label}</span>`. Unlike table 8.1 there is no progress bar.

### 8.3 Renewal payment risk (`#pred-payment-list`, `renderPredPayment()` L14325–L14339)

- **Markup:** stacked `<div>` rows (`padding:11px 14px`, `border-bottom:.5px solid var(--border)`), not a table.
- **Row source (L14327–L14330):** `Object.keys(DB.paymentRisk)` → for each rider id, `.find()` the **first** non-cancelled subscription whose `rider` matches. Riders with no matching subscription are dropped by `.filter(Boolean)`.
- **Per row (L14333–L14337):** rider name (12 px bold, `var(--blue)`, click → `openProfile`) · badge `b-amber` reading `{sub.id} · ends {sub.ends}` · the raw string from `DB.paymentRisk[rider]` · one action button.
- **Sort:** object-key order of `DB.paymentRisk`.
- **Filters / search:** none.
- **Empty state (L14331):** `No renewal payment risks flagged.`

### 8.4 Repeat incident pattern (`#pred-incident-list`, `renderPredIncidents()` L14341–L14354)

- **Markup:** stacked `<div>` rows, flex row with `justify-content:space-between`.
- **Row source (L14344–L14346):** tally of `x.against` across **all** `DB.disputes` and **all** `DB.incidents` (status ignored; entries with a falsy `against` are skipped), keeping keys with `count >= 2`.
- **Sort:** descending by count (L14346).
- **Per row (L14349–L14351):** name (12 px bold, `var(--blue)`, click → `openProfile`) · `{count} incidents/disputes — a pattern, not a one-off` · `Review` button.
- **Filters / search:** none.
- **Empty state (L14347):** `No driver has 2+ incidents/disputes yet.`
- **Note:** the seeded incident `INC-013` has `against:null` (L13391) and is therefore skipped. Nothing constrains the tally key to be a driver id.

### 8.5 Structural zone patterns (`#pred-zone-list`, `renderPredZones()` L14356–L14366)

- **Markup:** stacked `<div>` rows, flex row with `justify-content:space-between`.
- **Row source (L14358):** `DB.zones` filtered by `z.supply > 0 && z.demand / z.supply >= 3 && zoneFailRate(z) >= 50`.
- **Sort:** none — original `DB.zones` array order.
- **Per row (L14361–L14363):** zone name (click → `go('zones',null)`) · `{demand}:{supply} demand:supply, {failRate}% failure — this is a scheduling gap, not a one-day spike` · `Open zone` button.
- **Empty state (L14359):** `No zone shows a persistent structural shortage right now.`
- **Against the seeded `DB.zones` (L13952–L13959) exactly two rows qualify:** Al Narjis (14:2 = 7.00 ratio, 11/14 = 79 % failure) and Al Sahafa (9:3 = 3.00, 6/9 = 67 %). KAFD/Olaya (1.83), Al Malaz (1.33), Qurtubah (1.20) and Al Yasmin (2.75) all fail the ratio test.

---

## 9. Signals / rules / scoring logic

### 9.1 `subHealthScore(sub)` — subscription churn risk (L14210–L14230)

Starts at **100**, subtracts weighted deductions, floors at 0 (`Math.max(0,score)`, L14229). Maximum total deduction is 125 (25 + 15 + 25 + 10 + 20 + 30), so the floor is reachable.

| # | Signal | Trigger rule | Deduction | Reason text | Line |
|---|---|---|---|---|---|
| 1 | Behind expected pace | Evaluated only when `started && ends && ends > started`. `totalDays = (ends − started)/86400000`; `elapsed = max(0, min(totalDays, (REQ_NOW_REF − started)/86400000))`; `expectedPct = elapsed/totalDays`; `actualPct = tripsDone/tripsTotal`. Fires when `expectedPct − actualPct >= 0.30`. | **−25** | `Behind expected pace (N% done, M% of time elapsed)` — both percentages rounded | L14213–L14219 |
| 2 | No backup captain | `!DB.subBackups[sub.id]` | **−15** | `No backup captain — single point of failure` | L14221 |
| 3 | Assigned driver in trouble | any `DB.disputes` with `against===sub.driver && status==='open'` **OR** any `DB.incidents` with `against===sub.driver && status==='open'` | **−25** | `Assigned driver has an open dispute/incident` | L14222–L14224 |
| 4 | Rider complaint history | `DB.riders[sub.rider].complaints` truthy and non-empty | **−10** | `{n} prior complaint(s) on file` | L14226 |
| 5 | Payment risk | `DB.paymentRisk[sub.rider]` present | **−20** | `Payment risk: {stored string}` | L14227 |
| 6 | Assigned driver suspended | `DB.complianceSuspensions[sub.driver]` present | **−30** | `Assigned driver is currently suspended` | L14228 |

Severity presentation is via `healthBand()` — see §4.

`parseShortDate(s)` (L14200–L14205) matches `/(\d{1,2})\s+([A-Za-z]{3})/`, looks the month up in `REQ_MONTHS` (L9556) and returns `new Date(2026, mon, day)`. It returns `null` on no match or unknown month, which silently disables signal 1.

**Recomputation cost:** `subHealthScore` runs two separate full passes inside `renderPredictivePage` (L14368, L14372) plus once per row in `renderPredSubs` (L14240). No memoisation.

### 9.2 `driverRiskScore(drvId)` — driver availability risk (L14284–L14306)

Starts at **100**, floors at 0 (L14305).

| # | Signal | Trigger rule | Deduction | Reason text | Line |
|---|---|---|---|---|---|
| 1a | Expired document | `worst = min(docDaysLeft(docs[t]))` across all five `DOC_TYPES`; fires when `worst < 0` | **−40** | `Has an expired document (suspended)` | L14290 |
| 1b | Document expiring soon | else when `worst <= 14` | **−20** | `Document expires in {worst} days` | L14291 |
| 2 | Currently suspended | `DB.complianceSuspensions[drvId]` present | **−30** | `Currently suspended: {reason}` | L14293 |
| 3 | Open disputes / incidents | `openIssues` = open disputes **plus** open incidents `against` this driver; fires when `> 0` | **−15 × openIssues** — unbounded multiplier | `{n} open dispute/incident against this driver` | L14294–L14296 |
| 4 | Overloaded with no relief | `primaryLoad >= 2 && backupLoad === 0` | **−10** | `Primary on {n} subscriptions with no backup relief` | L14297–L14299 |
| 5a | Cash collection suspended | `cashDebt > 0` **and** `driverCashBlocked(drvId)` true. `cashDebt = −(DB.driverCashDebt[drvId] ‖ 0)`; `driverCashBlocked` (L12082) returns `(DB.driverCashDebt[id] ‖ 0) <= CASH_DEBT_CAP` with `CASH_DEBT_CAP = −300` (L12078) | **−30** | `Cash-collection suspended — {SAR} owed, over the debt cap` | L14300–L14301 |
| 5b | Outstanding cash debt (informational) | `cashDebt > 0` but not blocked | **0 — reason only, no deduction** | `{SAR} outstanding cash debt` | L14302 |
| 6 | Repeat cash under-reporting | `driverCashRiskCount(drvId) >= 2` | **−20** | `{n} under-reported/missing cash trips — repeat pattern` | L14303–L14304 |

`DOC_TYPES` (L13277): `license` *Driving license* · `vehicle_reg` *Vehicle registration (Istimara)* · `inspection` *Periodic inspection (Fahs)* · `insurance` *Insurance* · `operating_card` *Transport authority operating card*.

`docDaysLeft(dateStr)` (L13286–L13289) = `Math.floor((new Date(dateStr+'T00:00:00') − REQ_NOW_REF) / 86400000)`.

**Signal 5b is the source of the KPI/table divergence** described in §15 item 2: it appends a reason without deducting, so a driver can appear in table 8.2 at score 100 while not being counted by KPI 3 (`score < 80`).

### 9.3 Renewal payment risk rule (L14325–L14339)

Membership is *purely* `DB.paymentRisk` key presence — there is no computed detection anywhere in the file. The card caption promises *"Prior declined attempt + renewal due soon"* (L1205) but the "renewal due soon" half is never evaluated: any non-cancelled subscription for a flagged rider qualifies, regardless of its `ends` date.

### 9.4 Repeat incident pattern rule (L14341–L14354)

Threshold `count >= 2` on combined disputes + incidents against the same entity, **all statuses counted**. Severity is flat — every row is styled identically, with no band or colour differentiation.

### 9.5 Structural zone pattern rule (L14356–L14366)

Fires when **all three** conditions hold: `supply > 0`, `demand / supply >= 3`, `zoneFailRate(z) >= 50`. Severity is flat — no bands.

---

## 10. Modals opened

### Modal — Proactive retention (`openRetentionAction()`, L14255–L14271)

| Property | Value |
|---|---|
| Title | `Proactive retention — {subId}` (L14259) |
| Opened from | `Retention action` button in the subscription-health table (L14251) |
| Gate | `requirePerm('manage_subscriptions')` (L14256) then `requirePagePerm('predictive','act')` (L14257); returns silently if `DB.subscriptions[subId]` is missing (L14258) |
| Body line 1 (L14262) | `<strong>{riderName}</strong> · Health score <strong>{score}</strong>` — score coloured `var(--amber-dk)` when `score >= 50`, else `var(--red)` |
| Body line 2 (L14263) | One `⚠ {reason}` chip per entry in `h.reasons`, 10.5 px, `var(--bg2)` background, 7 px radius |
| Fields | **none** — no input, select or textarea |
| Button 1 (L14266) | `📞 Flag for proactive call` → `commitRetentionAction(subId,'call')` — `btn sm p` |
| Button 2 (L14267) | `🛡️ Assign backup captain now` → `closeModal(); assignBackup(subId)` — `btn sm`, **conditional**: rendered only when `!DB.subBackups[sub.id]` |
| Button 3 (L14268) | `🎁 Send early-renewal loyalty offer` → `commitRetentionAction(subId,'offer')` — `btn sm` |
| Close | `✕` (`.modal-close`) → `closeModal()` (L14260) |
| Footer | **none** — no `.modal-foot`; the three actions are stacked in a column |
| Commit function | `commitRetentionAction(subId, kind)` (L14272) |
| Opened by | `document.getElementById('modal-overlay').classList.add('open')` (L14270) |

### Secondary modal — universal confirmation gate

Because `commitRetentionAction` is wrapped by `guardAction()` via `GATE_SWEEP` (L20862), all three retention paths — including `payment-reminder` from the list — first raise the generic `confirmAction` dialog described in §7.

### Cross-module modal — Assign backup captain (`assignBackup()`, L13186–L13215)

Reached from modal button 2. Title `Assign backup captain — {subId}`; body explains the backup is briefed in advance; lists up to 6 eligible drivers (excluding the current driver, `pending` drivers, busy drivers and anyone failing `dispatchEligibility`), sorted by `geoDistanceKm` to the rider, first one badged `Nearest`. Each row has a `Select` button → `commitBackup(subId, drvId)` (L13218–L13223), which writes `DB.subBackups[subId]`, re-renders Coverage, logs `assign_backup` and toasts.

---

## 11. States & badges

| State / badge | Exact condition | Visual |
|---|---|---|
| `Healthy` | `score >= 80` (L14232) | `b-green` badge |
| `At risk` | `50 <= score <= 79` (L14233) | `b-amber` badge |
| `Predicted churn` | `score < 50` (L14234) | `b-red` badge |
| Score bar green | `score >= 80` (L14248) | 5 px bar, `var(--green)` fill at `width:{score}%` |
| Score bar amber | `50 <= score < 80` (L14248) | `var(--amber)` fill |
| Score bar red | `score < 50` (L14248) | `var(--red)` fill |
| Subscription row highlighted | `score < 50` (L14245) | `background:var(--red-lt)` on `<tr>` |
| Driver row highlighted | `score < 50` (L14316) | `background:var(--red-lt)` on `<tr>` |
| Driver score badge | always, per row (L14318) | `b-green`/`b-amber`/`b-red` per `healthBand`, text `{score} — {label}` |
| `Retention action` button present | `score < 80` (L14251) | `btn sm p` |
| `Assign backup captain now` present | `!DB.subBackups[sub.id]` (L14267) | `btn sm` |
| Payment-risk badge | always, per row (L14334) | `b-amber`, text `{subId} · ends {ends}` |
| `No risk signals` | `h.reasons.length === 0` (L14250) | 10 px `var(--muted)` text in the Signals column |
| KPI 2 & 3 value red | **unconditional** — not threshold-driven (L14379, L14380) | `color:var(--red)` |
| KPI 1 & 4 value amber | **unconditional** (L14378, L14381) | `color:var(--amber)` |
| Sidebar badge | value `redSubs + atRiskDrivers` (L14382), element class `sb-badge a` (L491) | Always rendered, including when `0` |
| KPI flash after scroll | applied by `kpiScrollTo()` (L14535–L14542) | `.kpi-flash-target` class added, removed after 1500 ms |

---

## 12. Cross-module links

| From | Call | Target | Line |
|---|---|---|---|
| Subscription id cell | `openProfile(subId)` | 360° Profile — subscription branch (`window.openProfile` L8827) | L14246 |
| Rider name cell | `openProfile(riderId)` | 360° Profile — rider branch | L14247 |
| Driver name cell | `openProfile(driverId)` | 360° Profile — driver branch | L14317 |
| `Review documents` | `go('compliance',null)` | Fleet Compliance | L14320 |
| Payment-risk rider name | `openProfile(riderId)` | 360° Profile | L14334 |
| Repeat-incident entity name | `openProfile(entityId)` | 360° Profile | L14350 |
| `Review` | `go('safety',null)` | Safety & Incidents | L14351 |
| Zone name and `Open zone` | `go('zones',null)` | Zones | L14362, L14363 |
| Retention modal button 2 | `assignBackup(subId)` | Coverage & Capacity | L14267 |
| Retention notification click-through | `openProfile(subId)` | 360° Profile | L14282 |
| Sidebar | `go('predictive',this)` | this page | L491 |

Inbound: `renderPredictivePage()` from `go()` (L8801) and from the demo tick loop (L12620).

---

## 13. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `DB.paymentRisk = {'RDR-1041':'Prior renewal attempt declined once (card ···4821) before succeeding on retry'}` | L14199 | **MOCK.** The entire Renewal-payment-risk card, the −20 signal in `subHealthScore`, and one term of KPI 1 all rest on this single literal. No code path anywhere writes to `DB.paymentRisk`. |
| KPI 1 progress bar `width:55%` | L14378 | **Hardcoded**, unrelated to any metric |
| KPI 4 progress bar `width:40%` | L14381 | **Hardcoded**, unrelated to any metric |
| `parseShortDate` builds `new Date(2026, mon, day)` | L14204 | Year **2026 hardcoded** |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | L9555 | Demo "now" — 25 Jun 2026, 09:14 |
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` | L9579 | Demo clock acceleration |
| Health-band thresholds `80` / `50` | L14232–L14234 | Not exposed in Settings |
| Pace threshold `0.3`; deductions 25/15/25/10/20/30 | L14219–L14228 | Not configurable |
| Driver deductions 40/20/30/15/10/30/20; doc threshold `14` days; cash-risk threshold `2` | L14290–L14304 | Not configurable |
| Repeat-incident threshold `>= 2` | L14346 | Not configurable |
| Zone thresholds `demand/supply >= 3` and `failRate >= 50` | L14358 | Not configurable |
| KPI bar multiplier `*20` | L14379, L14380 | Arbitrary scaling constant |
| `CASH_DEBT_CAP = -300` | L12078 | |
| `EYVAR_COMMISSION_PCT = 20` | L3604 | Feeds `subEconomics()` |
| `DB.zones` demand/supply/failures30d figures | L13952–L13959 | Seed data |
| `DB.subBackups` seed (2 entries) | L13140 | Seed data |
| `DB.driverDocs` expiry dates (5 drivers × 5 documents) | L13278–L13284 | Seed data |
| `DB.subscriptions` seed (7 records, 2 cancelled) | L2686–L2692 | Seed data |
| `DB.incidents` seed (3 records) | L13389–L13393 | Seed data |
| `DB.disputes` seed (2 records, both `open`) | L14391–L14396 | Seed data |
| Loyalty-offer email subject `A little something before your renewal 🎁` and body | L14276 | Hardcoded copy |
| All page and card captions | L1192–L1214 | Hardcoded English |

---

## 14. i18n keys

| Key | Element | Line(s) | Arabic value |
|---|---|---|---|
| `nav.predictive` | Sidebar label *Predictive signals* | L491 (`data-i18n`), L7905 (`LANG_STRINGS.ar`) | `الإشارات التنبؤية` |
| `sec.intelligence` | Sidebar section heading *Intelligence* | L490 (`data-i18n`), L7912 | `الذكاء` |

**Nothing inside the page body is translated.** No `data-i18n` attribute occurs anywhere in L1189–L1217, and no rendered string in L14236–L14384 passes through a lookup. This is explicit and intentional per the localization banner at L7897–L7902: *"Deep page content — tables, forms, every dynamically-built string — stays English-only; translating thousands of generated strings throughout this file is a genuinely separate, much larger project than this toggle can honestly cover."*

Non-i18n page-name strings: `titles.predictive = 'Predictive Signals'` (L2168) and `subs.predictive = 'Early-warning signals across the whole system'` (L2169), both English-only.

---

## 15. Gaps, dead code, UNVERIFIED items

1. **Dead variable `totalSignals`** (L14374–L14375) — computed via a nested IIFE that tallies disputes + incidents, then run through `.filter(function(k){return true;})` (a literal no-op) — and **never read**. KPI 1 uses a different expression on L14378. Dead code.
2. **KPI 3 and table 8.2 describe different populations.** The KPI counts `driverRiskScore < 80` over every driver (L14370); the table lists drivers with `reasons.length > 0` (L14310). Signal 5b (L14302) pushes a reason with no deduction, so a driver can appear in the table at score 100 without being counted in the KPI. The reverse cannot happen — no driver scores below 80 without at least one reason — so the table is a strict superset.
3. **`Send renewal payment reminder early` sends nothing.** It calls `commitRetentionAction(subId,'payment-reminder')`; the email branch fires only for `kind === 'offer'` (L14276). The observable outcome is an audit line, a toast and a bell notification. The button label over-promises the effect.
4. **No empty state on the subscription-health table** (L14242) — table headers render over an empty body when every subscription is cancelled. Every other list on the page has one.
5. **"Renewal due soon" is never evaluated.** The card caption (L1205) promises *"Prior declined attempt + renewal due soon"*; the code (L14328) accepts any non-cancelled subscription for a flagged rider regardless of `ends`.
6. **`.find()` takes only the first matching subscription** per payment-risk rider (L14328) — a rider holding two active subscriptions is under-reported.
7. **Zone rows have no deep link.** Both the zone name and the `Open zone` button call `go('zones',null)` with no zone selection (L14362–L14363); the operator lands on the whole Zones page and has to find the row again.
8. **Repeat-incident tally ignores status** (L14344–L14345) — long-closed incidents keep an entity flagged permanently. There is no decay window, unlike `DB.commitPolicy.counterWindowDays` / `decayDays` used by the Plan Commitment module (L9110–L9111).
9. **Open-issue deduction is unbounded** — `score -= 15*openIssues` (L14296). Seven open issues alone zero the score, ahead of any other signal.
10. **No page-level view permission is enforced.** `PAGE_PERMISSIONS.predictive` declares both `view` and `act` (L10625–L10628) but `go()` never checks `view` (L8774–L8801). Only `act` is enforced, at L14257 and L14273.
11. **Retention actions are not idempotent and leave no mark on the record.** Nothing is written back to the subscription, so the same button can be pressed repeatedly, each press producing a fresh audit line and a fresh bell notification. There is no "already actioned" badge or cooldown.
12. **`parseShortDate` year bug** (L14204) — the year is hardcoded to 2026, so a `started`/`ends` pair crossing into 2027 yields `ends < started` and signal 1 is silently skipped (the `ends > started` guard at L14213 fails).
13. **The loyalty-offer email has no deliverable address for riders.** `sendSystemEmail` resolves `emailFor(toId)` (L3579); seeded rider records (L2594–L2630) carry **no `email` property at all** — only drivers, team users and inbound-message records do. The resulting outbox entry records `toEmail: '—'`. *(Verified: `email:'…'` occurrences in the file belong to `DB.drivers` L2632–L2668, `DB.teamUsers` L2837 ff., and `DB.inboundMessages`.)*
14. **Scores are recomputed redundantly.** `subHealthScore` executes two full passes in `renderPredictivePage` plus once per table row; `driverRiskScore` executes once per driver in the KPI pass and again per driver in the table pass. Correctness is unaffected; the cost is duplicated O(n) work on every render, including every 60th demo tick.
15. **UNVERIFIED — runtime values of the four KPIs and the row counts of tables 8.1–8.4.** They depend on `DB.disputes` / `DB.incidents` mutated by other modules, on `DB.complianceSuspensions` populated by `complianceScan()` (L13296+) against the advancing demo clock, and on `DB.driverCashDebt` / `DB.cashLedger` which start empty (L12080–L12081) and are filled by randomised trip generation (`maybeGenerateCashEvent`, L12101+, gated on `Math.random()`). No static value can be asserted without executing the page. Only the zone list (§8.5) is deterministic from seed data.
16. **UNVERIFIED — whether any subscription ever reaches the `Healthy` band in practice**, and therefore whether the `Retention action` button is ever hidden. This depends entirely on item 15.
17. **UNVERIFIED — the `.kpi.click` CSS affordance.** The class is applied (L14378–L14381) but the corresponding stylesheet rule was not read; hover/cursor treatment is inferred from the class name and the `title` attribute only.

---

## 16. Line-number index

| Symbol / element | Lines |
|---|---|
| Sidebar section heading `Intelligence` | L490 |
| Sidebar item `predictive` + badge `#sbb-predictive` | L491 |
| Page block `#p-predictive` | L1189–L1217 |
| Page header (`h1` + strapline) | L1191–L1193 |
| `#predictive-kpis` (`.g4`) | L1194 |
| Card: Subscription health / `#pred-subs-list` | L1195–L1198 |
| Card: Driver availability risk / `#pred-drivers-list` | L1199–L1202 |
| 2-column grid wrapper | L1203–L1212 |
| Card: Renewal payment risk / `#pred-payment-list` | L1204–L1207 |
| Card: Repeat incident pattern / `#pred-incident-list` | L1208–L1211 |
| Card: Structural zone patterns / `#pred-zone-list` | L1213–L1216 |
| `titles.predictive` / `subs.predictive` | L2168 / L2169 |
| `DB.riders` seed | L2594–L2630 |
| `DB.drivers` seed | L2632–L2668 |
| `DB.subscriptions` seed | L2685–L2693 |
| `requirePerm()` | L3126–L3132 |
| `logAction()` | L3133–L3150 |
| `nm2()` | L3565 |
| `sendSystemEmail()` | L3578–L3584 |
| `EYVAR_COMMISSION_PCT` | L3604 |
| `subEconomics()` | L3605–L3616 |
| `toast()` | L5269+ |
| `LANG_STRINGS` (localization banner L7897–L7902) | L7903+ |
| `nav.predictive` / `sec.intelligence` Arabic strings | L7905 / L7912 |
| `window.go` + page dispatch (`predictive` at L8801) | L8774–L8826 |
| `window.openProfile` | L8827+ |
| `REQ_NOW_REF` / `REQ_MONTHS` | L9555 / L9556 |
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK` | L9579 |
| `fmtReqNowLabel()` | L9645 |
| `pushOpsNotification()` | L9661–L9666 |
| `PAGE_PERMISSIONS.predictive` | L10625–L10628 |
| `canPage()` | L10674–L10677 |
| `requirePagePerm()` | L10680–L10688 |
| `CASH_DEBT_CAP` | L12078 |
| `DB.cashLedger` / `DB.driverCashDebt` | L12080 / L12081 |
| `driverCashBlocked()` | L12082 |
| `driverCashRiskCount()` | L12097–L12099 |
| Demo-tick re-render hook | L12618–L12621 |
| `DB.subBackups` seed | L13140 |
| `activeSubsList()` | L13141–L13144 |
| `assignBackup()` | L13186–L13215 |
| `commitBackup()` | L13218–L13223 |
| `DOC_TYPES` | L13277 |
| `DB.driverDocs` seed | L13278–L13284 |
| `DB.complianceSuspensions` | L13285 |
| `docDaysLeft()` | L13286–L13289 |
| `docState()` | L13290–L13295 |
| `DB.incidents` seed | L13389–L13393 |
| `DB.zones` seed | L13952–L13959 |
| `zoneFailRate()` | L13974 |
| Module banner comment | L14191–L14197 |
| `DB.paymentRisk` (mock) | L14199 |
| `parseShortDate()` | L14200–L14205 |
| `subHealthScore()` | L14210–L14230 |
| `healthBand()` | L14231–L14235 |
| `renderPredSubs()` | L14236–L14254 |
| `openRetentionAction()` | L14255–L14271 |
| `commitRetentionAction()` | L14272–L14283 |
| `driverRiskScore()` | L14284–L14306 |
| `renderPredDrivers()` | L14307–L14323 |
| `renderPredPayment()` | L14325–L14339 |
| `renderPredIncidents()` | L14341–L14354 |
| `renderPredZones()` | L14356–L14366 |
| `renderPredictivePage()` | L14367–L14384 |
| `DB.disputes` seed | L14391–L14396 |
| `kpiGo()` | L14534 |
| `kpiScrollTo()` | L14535–L14542 |
| `guardAction()` | L17819–L17840 |
| `GATE_SPECS` | L18245–L18371 |
| `installUniversalGates()` | L18372–L18382 |
| `gateAll()` | L20756–L20768 |
| `GATE_SWEEP` | L20769–L20885 |
| `GATE_SWEEP.commitRetentionAction` | L20862–L20863 |
| `delete GATE_SWEEP.assignBackup` | L20886 |
| `installGateSweep()` | L20898–L20902 |
