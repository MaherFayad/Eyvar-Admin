# Module: Renewal Pipeline

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `renewal` · **Container div:** `#p-renewal`
> **HTML lines:** L861–L866 (section comment L860)
> **Primary render:** `renderRenewalPipeline()` L3308–L3387
> **Secondary render:** `renewalListHTML()` L21121–L21145 into `#renewal-flat`, fed by `renewalFlatList()` L21106–L21120
> **Related handlers:** `openRenewFlow()` L11277, `commitRetentionAction()` L14272, `setRenewalFilter()` L20562, `openHealthBreakdown()` L20567, `renewalMenu()` L20594, `toggleRenewalFlat()` L21146

---

## 1. Purpose

Surfaces every subscription in `DB.subscriptions` whose `ends` date falls within the next 7 days relative to the dataset's frozen "today" (`EYVAR_TODAY` = 25 Jun 2026, L11232), scores each for churn risk with `subHealthScore()` (L14210), groups them by days-to-expiry, and offers per-row renewal / retention actions.

The in-file comment at L3304–L3307 states this page was previously 100% static hardcoded HTML with fabricated names and invented "likelihood %" figures, and is now computed from real expiry dates plus `subHealthScore()`. A second commentary block at L20543–L20559 records four further problems a later rewrite addressed (KPI counted the week while columns split by day; the headline was not clickable; action buttons rendered on healthy rows; no ownership/case affordances).

---

## 2. Entry points & routing

| Entry point | Line | Effect |
|---|---|---|
| Sidebar `go('renewal',this)` | L506 | Shows `#p-renewal`; top-bar title from `titles.renewal` = `'Renewal Pipeline'` (L2168); subtitle from `subs.renewal` (L2169, seed `'8 expiring in 3 days'`, overwritten at L9407) |
| `go()` dispatch | L8810 | `if(id==='renewal'){renderRenewalPipeline();}` |
| Boot sequence | L14572 | `renderRenewalPipeline()` once at init |
| `setRenewalFilter()` | L20562–L20565 | Re-renders the page in place |
| `toggleRenewalFlat()` | L21146–L21150 | Re-renders only `#renewal-flat` |
| Cross-page → renew wizard | L4110, L4352, L6432, L10436, L20592, L20604, L20610 | `openRenewFlow()` reachable from Rider 360°, Subscription detail, Riders table, Dashboard renewal card, health-breakdown modal, and the `⋯` menu |

**No permission gate on page entry** — `renderRenewalPipeline()` (L3308–L3387) contains no `requirePerm` / `requirePagePerm` call.

---

## 3. Layout map

```
#p-renewal                                      L861
├── .ph                                         L862
│   ├── h1 "Renewal pipeline"                   L862   hardcoded
│   └── p#renewal-page-sub                      L862   seed text, replaced at L3354
├── .g3 #renewal-kpis                           L863   3 KPI tiles, injected L3346–L3353
├── #renewal-flat                               L864   flat list card, injected L3345
└── .g3 #renewal-pipeline-cols                  L865   3 day-group cards, injected L3386
```

---

## 4. Data model & fields

### 4.1 Source record — `DB.subscriptions[<SUB-id>]`

| Field | Type | Read at | Use |
|---|---|---|---|
| `id` | `SUB-nnnn` | L3368, L3370, L3372, L3373, L3378, L3380 | row link, health modal, `⋯` menu |
| `rider` | `RDR-nnnn` | L3320, L3367, L3376, L3378 | name lookup, profile link, renew target |
| `driver` | `DRV-nnnn` | L14222, L14227, L21136 | health signals, "captain" line |
| `plan` | string, e.g. `"Weekly Economy"` | L3370, L21136 | display; cadence/vehicle inference in the wizard |
| `started` | short date `"18 Jun"` | L14212 | pace calculation |
| `ends` | short date `"27 Jun"` | L3315, L21110 | days-left calculation |
| `trips` | string `"3/5"` | L3370, L14217 | display + pace calculation |
| `paid` | string `"86.50 SAR"` | L11315 (wizard only) | current-plan banner |
| `status` | `'Active'` / `'Expiring'` / `'Cancelled'` / other | L3311, L21108 | inclusion filter |
| `autoRenew` | boolean or **undefined** | L3327, L3337, L3342, L3360, L20609, L21123 | manual-renewal flag; tested strictly as `=== false` |
| `autoRenewOffReason` | `{reason, by, at}` | written L5478; never read here | — |

### 4.2 Derived entry objects

Column entry (L3320): `{ sub, rider: DB.riders[sub.rider], health: {score, reasons[]}, daysLeft }`
Flat-list entry (L21114): `{ sub, days, health }` — a different shape for the same concept.

### 4.3 Supporting data consumed by `subHealthScore()`

| Source | Defined | Read |
|---|---|---|
| `DB.subBackups` (subId → backup driverId) | L13140 `{'SUB-1052':'DRV-0105','SUB-1060':'DRV-0101'}`; re-asserted L17197 | L14220 |
| `DB.disputes` | L14391 | L14221 |
| `DB.incidents` | L13389 | L14222 |
| `DB.riders[...].complaints` | rider records | L14225 |
| `DB.paymentRisk` | L14199 | L14226 |
| `DB.complianceSuspensions` (driverId → reason) | L13285 (`{}`) | L14227 |
| `REQ_NOW_REF` | L9555 `new Date(2026,5,25,9,14,0)` | L14214 |
| `EYVAR_TODAY` | L11232 `new Date(2026,5,25)` | L3317, L21111 |

---

## 5. Stages / statuses & transition rules

### 5.1 Pipeline stages (day-group columns)

| State | Entered when | SLA / timing | Badge | Exits to | Actions |
|---|---|---|---|---|---|
| **Expiring today** | `daysLeft === 0`, where `daysLeft = Math.round((parseShortDate(sub.ends) − EYVAR_TODAY)/86400000)` (L3317, L3321) | 0 days left | `b-red` (L3386) | leaves the board when `daysLeft < 0` (L3318) or `status` leaves Active/Expiring (L3311) | §5.3 |
| **Expiring tomorrow** | `daysLeft === 1` (L3322) | 1 day | `b-amber` (L3386) | → Expiring today | §5.3 |
| **Expiring in 2–7 days** | `2 ≤ daysLeft ≤ 7` (L3318 upper bound + L3323 else branch) | 2–7 days | `b-grey` (L3386) | → Expiring tomorrow | §5.3 |
| *(excluded)* | `daysLeft < 0` or `daysLeft > 7` | — | — | silently dropped, L3318 | — |
| *(excluded)* | `sub.ends` not parseable by `parseShortDate()` (L14200) | — | — | silently dropped, L3316 | — |
| *(excluded)* | `status` neither `'Active'` nor `'Expiring'` | — | — | dropped at L3311 | — |

**There are no timers, SLA clocks or automatic transitions on this page.** `EYVAR_TODAY` is a constant with exactly one assignment (L11232) and is never advanced, so a record only changes column when `sub.ends` is rewritten elsewhere (e.g. `renderSuccess()` L11435).

### 5.2 Health / risk tiers (per row) — `cardHTML` L3361–L3363

| Tier | Rule | Label (L3362) | Badge class (L3361) | Bar class (L3363) |
|---|---|---|---|---|
| Healthy | `score >= 70` | `Likely renews` | `b-green` | `rf-g` |
| Uncertain | `40 <= score < 70` | `Uncertain` | `b-amber` | `rf-a` |
| At risk | `score < 40` | `At risk` | `b-red` | `rf-r` |

A **different** 3-band scale, `healthBand()` L14231–L14235 (`>=80 Healthy`, `>=50 At risk`, else `Predicted churn`), is used by the Predictive Signals page. The renewal page never calls it, so the same score is labelled differently on the two pages.

### 5.3 Per-row action set — L3375–L3381

`needsAction = (sub.autoRenew === false) || (health.score < 40)` (L3364); when true the card gets `border-color:var(--red-border)` (L3365).

| Condition | Buttons |
|---|---|
| `score < 40` | `Priority call` (danger, L3376) + `Renew manually`/`Offer renewal` (warn, L3378) + `⋯` (L3380) |
| `autoRenew === false` and `score >= 40` | `Renew manually` (primary, L3378) + `⋯` |
| neither | `Open subscription` (L3379) + `⋯` |

Label on L3378 is `Renew manually` when `autoRenew === false`, else `Offer renewal`; class is `warn` when `score < 40`, else `p`.

---

## 6. Scoring / prioritisation formulas — every formula written out

### 6.1 `subHealthScore(sub)` — L14210–L14229

Initial: `score = 100`, `reasons = []` (L14211).

**Signal 1 — pace behind schedule (L14212–L14219)**
```
started = parseShortDate(sub.started)
ends    = parseShortDate(sub.ends)
if (started && ends && ends > started):
    totalDays   = (ends - started) / 86400000
    elapsed     = max(0, min(totalDays, (REQ_NOW_REF - started) / 86400000))
    expectedPct = elapsed / totalDays
    tp          = String(sub.trips || '0/0').split('/')
    actualPct   = (parseInt(tp[1]) > 0) ? (parseInt(tp[0]) || 0) / (parseInt(tp[1]) || 1) : 0
    if (expectedPct - actualPct >= 0.30):
        score -= 25
        reason = "Behind expected pace (" + round(actualPct*100) + "% done, "
                                          + round(expectedPct*100) + "% of time elapsed)"
```

**Signal 2 — no backup captain (L14220)**
```
if (!DB.subBackups[sub.id]):
    score -= 15
    reason = "No backup captain — single point of failure"
```

**Signal 3 — assigned driver has an open dispute or incident (L14221–L14224)**
```
driverTrouble = DB.disputes.some(d => d.against === sub.driver && d.status === 'open')
             || DB.incidents.some(i => i.against === sub.driver && i.status === 'open')
if (driverTrouble):
    score -= 25
    reason = "Assigned driver has an open dispute/incident"
```

**Signal 4 — rider complaints on file (L14225)**
```
rdr = DB.riders[sub.rider]
if (rdr && rdr.complaints && rdr.complaints.length):
    score -= 10                      // flat, regardless of count
    reason = rdr.complaints.length + " prior complaint(s) on file"
```

**Signal 5 — payment risk (L14226)**
```
if (DB.paymentRisk[sub.rider]):
    score -= 20
    reason = "Payment risk: " + DB.paymentRisk[sub.rider]
```

**Signal 6 — assigned driver suspended (L14227)**
```
if (DB.complianceSuspensions[sub.driver]):
    score -= 30
    reason = "Assigned driver is currently suspended"
```

**Return (L14228):** `{ score: Math.max(0, score), reasons }`

Worst case before clamping: `100 − 25 − 15 − 25 − 10 − 20 − 30 = −25` → clamped to `0`. There is no upward adjustment of any kind.

### 6.2 Column sort — L3325–L3332
```
1. needsAction = (sub.autoRenew === false) || (health.score < 40)
   true sorts before false                                    (L3327–L3329)
2. tie-break: ascending health.score, worst first             (L3330)
```

### 6.3 Flat-list sort — L21119
```
ascending r.days (soonest expiry first); no secondary key
```

### 6.4 Days-left — L3317 and L21111 (deliberately identical; see comment L21107–L21108)
```
days = Math.round((parseShortDate(sub.ends) - EYVAR_TODAY) / 86400000)
```
`parseShortDate(s)` L14200–L14205: regex `/(\d{1,2})\s+([A-Za-z]{3})/`, month via `REQ_MONTHS` (L9556), **year hardcoded 2026** (L14204).

---

## 7. KPIs & metrics

Three tiles in `#renewal-kpis` (L3346–L3353), all clickable.

| # | Label | Formula | Delta line | Colour | Click |
|---|---|---|---|---|---|
| 1 | `Expiring this week` (L3347) | `today.length + tomorrow.length + week.length` (L3340) | `<today> today · <tomorrow> tomorrow` (L3347) | always `var(--ink)` (L3353) | `setRenewalFilter('all')` (`f='all'`, L3351) |
| 2 | `Manual renewal required` (L3348) | count where `sub.autoRenew === false` (L3342) | `auto-renew is off — will lapse without action` — static (L3348) | `var(--red)` when > 0 (L3353) | `setRenewalFilter('manual')` |
| 3 | `At risk (health <40)` (L3349) | count where `health.score < 40` (L3341) | `needs proactive outreach` if > 0 else `none currently` (L3349) | `var(--red)` when > 0 | `setRenewalFilter('atrisk')` |

Active-tile highlight: `on = (_renewalFilter === f && f !== 'all')` (L3352) → `border-color:var(--blue);box-shadow:0 0 0 1px var(--blue)` (L3353). Tile 1 can therefore never highlight.

**Verified quirk:** the filter is applied at L3334–L3339, *before* the KPI counts at L3340–L3342. With a filter active, all three tiles (and the page subtitle) describe only the filtered subset — "Expiring this week" stops showing the week total.

**Page subtitle metric (L3354):**
```
#renewal-page-sub = totalExpiring + ' subscriptions expiring in the next 7 days · '
                  + manualRequired + ' need manual renewal · ' + atRisk + ' at-risk'
```

**Dead metric:** `cancelledThisMonth` (L3343) counts all subscriptions whose `status` matches `/cancel/i` and is never used. The name is also inaccurate — there is no month restriction.

---

## 8. Data displayed

### 8.1 Day-group card row — `cardHTML` L3366–L3382

| Element | Source | Type | Notes |
|---|---|---|---|
| Rider name | `e.rider.name` else `e.sub.rider` (L3367) | computed from `DB.riders` | blue; click → `openProfile(sub.rider)` |
| Risk badge | `statusLbl` from score (L3362) | computed | click → `openHealthBreakdown(sub.id)` (L3368) |
| Work chip | `workChip('renewal', sub.id)` (L3369; fn L19030 → `caseChip()` L18997 + `ownerChip()` L18928) | computed | claim / case-link affordance |
| Subscription id | `rowLink(e.sub.id)` (L3370; helper L3283) | `DB.subscriptions[id].id` | monospace blue; click → `openProfile(subId)` |
| Plan | `e.sub.plan` (L3370) | DB | |
| Trips | `e.sub.trips + ' trips'` (L3370) | DB | raw `"3/5 trips"` |
| Rider rating | `★ + e.rider.rating` (L3370) | `DB.riders[..].rating` | omitted when falsy |
| Auto-renew chip | `sub.autoRenew === false` (L3371) | DB | `🔴 Manual renewal required` (`b-red`) / `🔁 Will self-renew` (`b-grey`) |
| Health bar | `width: health.score + '%'` (L3372) | computed | class per §5.2 |
| Health line | `'Health: ' + score + '/100'` + `reasons[0]` (L3373) | computed | `+N more` when `reasons.length > 1` (L3374); click → `openHealthBreakdown` |

Column empty state: `"None in this window."` (L3383). Column header badge: `entries.length` (L3357).

### 8.2 Flat list — `renewalListHTML()` L21121–L21145

| Element | Source | Line |
|---|---|---|
| Card title `📋 Everything expiring this week` | hardcoded; header is the collapse toggle | L21126 |
| Count badge (`b-grey`) | `rows.length` | L21127 |
| Chevron | rotated `-90deg` when collapsed | L21128 |
| Explainer prose | hardcoded, expanded state only | L21129–L21130 |
| Rider name | `nm2(r.sub.rider)` (fn L3565) | L21134 |
| Subscription id | `rowLink(r.sub.id)` | L21135 |
| "expires …" | `days<=0?'today':days===1?'tomorrow':'in '+days+' days'` | L21132 |
| Plan · captain | `r.sub.plan`, `nm2(r.sub.driver)` | L21136 |
| Health `N/100` | colour `>=70 green / >=40 amber-dk / else red` (L21133); click → `openHealthBreakdown` | L21137 |
| Work chip + `⋯` | `workChip('renewal', …)`, `renewalMenu(…)` | L21138–L21139 |

Empty state: `"Nothing expiring in the next 7 days."` (L21141).
**Collapsed by default:** `collapsed = window.__renewalFlatCollapsed !== false` (L21124), rationale in the same-line comment.

---

## 9. Input fields / filters / sorts

| Control | Id / selector | Type | Default | Options | Effect |
|---|---|---|---|---|---|
| KPI filter tiles | generated `.kpi.click` inside `#renewal-kpis` | click | `_renewalFilter = 'all'` (L20560) | `all`, `manual`, `atrisk` | `setRenewalFilter(f)` L20562: **toggle** — `_renewalFilter = (_renewalFilter===f) ? 'all' : f` (L20563) then `renderRenewalPipeline()` (L20564). Predicate L3336–L3337: `manual → autoRenew===false`; `atrisk → score<40`. Also applied to the flat list (L21123–L21124). |
| Flat-list collapse | generated `#renewal-flat .ch` | click | collapsed | — | `toggleRenewalFlat()` L21146–L21150 |

**No search box, no sort selector, no date-range picker, no pagination** exist on this page — verified against L861–L866 and L3308–L3387.

---

## 10. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| Rider name | `openProfile(sub.rider)` L3367 | navigate to 360° | — | none | none | no |
| Risk badge / health bar / health line | `openHealthBreakdown(sub.id)` L3368, L3372, L3373 | opens §12.1 | — | none | none | no |
| Subscription id | `openProfile(sub.id)` via L3283 | opens subscription 360° | — | none | none | no |
| `Priority call` (score<40 only) | `priorityCall(riderName,'renewal',sub.rider)` L3376 (fn L9149) | opens priority-call flow | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| `Renew manually` / `Offer renewal` | `openRenewFlow(sub.rider)` L3378 (fn L11277) | opens 3-step wizard §12.3 | ultimately `DB.subscriptions`, `DB.riders[..].subs` | **none on entry** | **none on success** (see §17) | no |
| `Open subscription` | `openProfile(sub.id)` L3379 | opens subscription 360° | — | none | none | no |
| `⋯` | `renewalMenu(sub.id)` L3380 (fn L20594) | opens §12.2 | — | deliberately ungated (L20889) | none | no |
| KPI tile | `setRenewalFilter(f)` L3353 | toggles filter, re-renders | `_renewalFilter` | none | none | no |
| Flat-list header | `toggleRenewalFlat()` L21126 | expand / collapse | `window.__renewalFlatCollapsed` | none | none | no |
| Flat-list rider / id / health / `⋯` | as above, each wrapped in `stopEv(event)` | as above | — | — | — | no |

### 10.1 `commitRetentionAction(subId, kind)` — L14272–L14283

Call sites: L14266 and L14268 (its own modal `openRetentionAction()` L14255, on the **Predictive Signals** page) and L14336 (`renderPredPayment()`). It is **not** invoked from the renewal page — verified by grep across the file.

| `kind` | Origin button | Extra effect |
|---|---|---|
| `'call'` | `📞 Flag for proactive call` (L14266) | none beyond the common chain |
| `'offer'` | `🎁 Send early-renewal loyalty offer` (L14268) | `sendSystemEmail(sub.rider, 'A little something before your renewal 🎁', …, 'promo')` (L14276–L14279) |
| `'payment-reminder'` | `Send renewal payment reminder early` (L14336) | none beyond the common chain |

Common chain:
1. `requirePagePerm('predictive','act')` (L14273) — a **Predictive-page** permission, not a renewal one.
2. `closeModal()` (L14274).
3. `logAction('retention_action','subscription',subId,'Proactive retention action (<kind>) triggered for <subId> before renewal risk materialized',{},{})` (L14275).
4. `toast('✅ Retention action logged for <subId>','ok', null, false)` (L14280).
5. `pushOpsNotification('alert','Retention follow-up — <subId>','Action: <kind>. Check back before renewal date.', → openProfile(subId))` (L14281).

**No subscription field is written — the action is log-only.**

Confirmation gate: registered in `GATE_SWEEP` at L20862–L20863 — title `'Apply the retention action'`, `d:true` (danger), consequences `['May issue credit or change the subscription terms.','Recorded against the rider and in the activity log.']`, button `'Apply'`. Installed via `gateAll()` (L20756) / `installGateSweep()` (L20898) / `guardAction()` (L17819). The first stated consequence does not match the implementation.

---

## 11. Tables & lists

This page renders **no `<table>` element**. Three card columns of `.ren-card` divs plus one flat `.al-row` list.

### 11.1 Day-group columns (`#renewal-pipeline-cols`, assembled L3386)

| Property | Value |
|---|---|
| Row source | `groups.today` / `groups.tomorrow` / `groups.week` derived from `DB.subscriptions` (L3311–L3323) |
| Ordered row content | rider name + risk badge → work chip → `subId · plan · N trips · ★rating` → auto-renew chip → health bar → health line → action row |
| Filters | KPI-tile filter only (L3334–L3339) |
| Sort | needs-action first, then ascending health (L3325–L3332) |
| Row click | none on the card; individual elements clickable |
| Row actions | §5.3 |
| Empty state | `"None in this window."` per column (L3383) |

### 11.2 Flat list (`#renewal-flat`)

| Property | Value |
|---|---|
| Row source | `renewalFlatList()` L21106 — same inclusion rule as the columns |
| Row content | rider · sub id · "expires when" / plan · captain · health |
| Filters | `_renewalFilter` (L21123–L21124) |
| Sort | ascending days (L21119) |
| Row click | `cursor:default` (L21131); children clickable via `stopEv(event)` |
| Row actions | work chip + `⋯` |
| Empty state | `"Nothing expiring in the next 7 days."` (L21141) |

---

## 12. Modals opened

### 12.1 `openHealthBreakdown(subId)` — L20567–L20593

| Part | Content | Line |
|---|---|---|
| Title | `Renewal health — <subId>` | L20574 |
| Score | 30px numeral, colour `>=70 green / >=40 amber-dk / else red` (L20572); caption `/100 · <rider> · <plan>` | L20577–L20579 |
| Reasons | heading `What is pulling it down`, one `· <reason>` row per entry | L20580–L20584 |
| No reasons | `Nothing is pulling this renewal down.` | L20585 |
| Footer prose | hardcoded note about tooltips vs. tablets | L20586–L20588 |
| Button `Rider 360°` | `closeModal(); openProfile(sub.rider)` | L20590 |
| Button `Open subscription` | `closeModal(); openProfile(subId)` | L20591 |
| Button `Offer renewal` (primary) | `closeModal(); openRenewFlow(sub.rider)` | L20592 |

No fields, no writes, no permission gate, no audit entry.

### 12.2 `renewalMenu(subId)` — L20594–L20620

Always-present entries (L20599–L20604):

| # | Label | Command |
|---|---|---|
| 1 | `📄 Open subscription` | `openProfile(subId)` |
| 2 | `🧍 Rider 360°` | `openProfile(sub.rider)` |
| 3 | `👤 Assigned captain` | `openProfile(sub.driver)` |
| 4 | `📊 Health breakdown` | `openHealthBreakdown(subId)` |
| 5 | `📞 Log a call with the rider` | `openLogContact(sub.rider)` (fn L16215) |
| 6 | `🔁 Offer renewal` | `openRenewFlow(sub.rider)` |

Conditional entries ("the reason decides the remedy", L20605):

| Condition | Line | Entry |
|---|---|---|
| `health.reasons.join(' ')` matches `/backup/i` | L20606–L20607 | `🛟 Register a backup captain` → `assignBackup(subId)` (fn L13186) |
| matches `/dispute\|incident/i` | L20607–L20608 | `⚖️ Open disputes` → `go('support',null)` |
| `sub.autoRenew === false` | L20609–L20610 | `⚠️ Auto-renew is OFF — renew manually` → `openRenewFlow(sub.rider)` |

Every entry runs `closeModal();` before its command (L20613). Footer: one `Close` button (L20617). Ungated by design (L20889).

### 12.3 Renew / Upgrade wizard — `openRenewFlow(rider)` L11277–L11283

Setup: `flowRider = resolveFlowRider(rider || 'RDR-1041')` (L11278; hardcoded fallback), `sub = riderCurrentSub(flowRider)` (L11279; fn L11226 returns `DB.subscriptions[DB.riders[id].subs[0]]`), `flowSelected = renewOptionsFor(sub)[0]` (L11280), `renderStep1()` (L11281), overlay opened (L11282).
Progress bar `stepBar(active)` L11285–L11298 — steps `['Select plan','Payment','Result']`.

#### Step 1 — `renderStep1()` L11300–L11331

| Field | Detail | Line |
|---|---|---|
| Header | `Renew / Upgrade — <rider name>` | L11321 |
| Current-plan banner | `Current: <plan> · <paid> · Ends <ends> · <statusBadge(status)>` **or** `No active subscription on file — this will create a new one` | L11314–L11316, rendered L11323 |
| Section label | `Select renewal plan` | L11325 |
| Plan radio group (`name="rf"`) | 4 options from `renewOptionsFor(sub)` L11249–L11274, rendered L11307–L11313 | |
| Option 1 `same` | `↻ Same plan — <PLANS[cadence].label> <vehicle>`; `<exec> trips · <CADENCE_DAYS> days · Same driver: <name> ★<rating>`; price `PLANS[cadence][eco\|comfort]`; no tag | L11260–L11262 |
| Option 2 `biweekly` | `⬆ Bi-weekly <vehicle>`; `10 trips · 14 days · 5% discount applied`; price `PLANS.biweekly[vKey]`; tag `Save 5%` | L11263–L11265 |
| Option 3 `vehicle` | `⬆ Weekly <otherVehicle>`; `5 trips · 7 days · <otherType> vehicle`; price `PLANS.weekly[otherVKey]`; tag `Premium` | L11266–L11268 |
| Option 4 `monthly` | `⬆ Monthly <vehicle>`; `22 trips · 30 days · Best value`; price `PLANS.monthly[vKey]`; tag `Save 10%` | L11269–L11271 |
| Driver block | with a driver: `Keep same driver? <name> (★<rating>) has a slot available.` plus a checkbox toggle; without: `No driver on file yet — the nearest eligible driver will be suggested after payment.` | L11317–L11320, rendered L11327 |
| Footer | `Cancel` → `closeModal()`; `Continue to payment →` → `renderStep2()` | L11329 |

Selection handler `pickPlan(id)` L11333–L11339 — sets `flowSelected` (L11335), moves `.selected` (L11336–L11337), checks the radio (L11338). Uses the implicit global `event` (L11337–L11338).

#### Step 2 — `renderStep2()` L11341–L11361

| Field | Detail | Line |
|---|---|---|
| Order summary | title with `↻`/`⬆` stripped, sub-line, price | L11349 |
| `Subtotal` | `<price> SAR` | L11351 |
| `VAT (15%)` | literal `included` — **never computed** | L11352 |
| `Total to charge` | `<price> SAR`, identical to subtotal | L11353 |
| Payment method | `Visa ···· 4821` / `Saved card · Expires 09/27` / `Default` badge — hardcoded, `cursor:default`, non-interactive | L11356 |
| Security note | `🔒 Charge processed securely via Eyvar Pay` | L11357 |
| Footer | `← Back` → `renderStep1()`; `Charge <price> SAR ↗` → `processCharge()` | L11359 |

#### Corporate approval hold — `processCharge()` L11363–L11390

```
rid      = resolveFlowRider(flowRider)                                   L11364
priceNum = parseFloat(o.price)                                           L11368
corp     = findCorpForRider(rid)                                         L11369
corpPol  = corp ? getCorpUsagePolicy(corp) : null                        L11370
if (corpPol && corpPol.requireApprovalAboveSAR
    && priceNum > corpPol.requireApprovalAboveSAR)
        → renderRenewalApprovalHold(rid,o,corp,corpPol,rn); return       L11371–L11374
```
`renderRenewalApprovalHold()` L11394–L11404: `⏳ Needs manager approval first` (L11400) + explanatory text naming `corp.companyName`, the threshold and `corpPol.approverName` (L11401). Buttons (L11403): `Close — I'll follow up` → `closeModal()`; `📧 Send approval request` → `sendRenewalApprovalRequest(riderId, price, title)`.

`sendRenewalApprovalRequest()` L11405–L11416 — gate `requirePerm('contact_users')` (L11406); `sendSystemEmail(corpPol.approverEmail, "Approval needed — <rider>'s renewal (<price> SAR)", …, 'transactional')` (L11411); `logAction('renewal_approval_requested','rider',riderId,…)` (L11412); toast (L11414); `closeModal()` (L11415).

#### Step 3 — processing and outcome

Processing screen L11376–L11383: spinner, `Processing payment…`, `Charging <price> SAR to Visa ···· 4821`.
Outcome L11386–L11389: `setTimeout(…, 1800)` then `success = Math.random() > 0.25` → **~75% success / 25% failure, simulated**. The comment on L11385 claims "~80% success", contradicting the threshold.

**`renderSuccess()` L11418–L11463 — the only state write in the wizard**
```
txn     = 'TXN-' + floor(100000 + random*899999)                          L11423   (fabricated)
newEnds = addDaysLabel(CADENCE_DAYS[o.cadenceKey || 'weekly'])            L11424   (fn L11233)
plan    = PLANS[o.cadenceKey || 'weekly']                                 L11425
rider   = DB.riders[rid]                                                  L11431

if (sub):                                                                 L11432–L11438
    sub.plan    = plan.label + ' ' + o.vehicleType
    sub.started = addDaysLabel(0)
    sub.ends    = newEnds
    sub.trips   = '0/' + plan.exec
    sub.paid    = o.price + ' SAR'
    sub.status  = 'Active'
else if (rider):                                                          L11439–L11445
    newSubId = unique 'SUB-' + (1100 + floor(random*900))
    DB.subscriptions[newSubId] = {id, rider: rid, driver: Object.keys(DB.drivers)[0],
                                  plan, started, ends, trips, paid, status:'Active'}
    rider.subs.unshift(newSubId)

renderSubscriptionsTable();  renderReadiness();                           L11446–L11447
```
Result screen fields: `Transaction ID` (L11457), `Amount charged` (L11458), `Plan` (L11459), `New expiry` (L11460). Footer `Done` → `closeModal(); toast('✅ Subscription renewed & activated','ok')` (L11462).

**`renderFailure()` L11465–L11481** — `Payment failed`; `Reason: Insufficient funds` (L11477); `Visa ···· 4821 was declined. No amount was charged…` (L11478) — all hardcoded, never derived. Buttons (L11480): `Cancel`, `Try another card` → `tryAnotherCard()`, `↻ Retry` → `renderStep2()`.

**`tryAnotherCard()` L11483–L11492** — fields `Card number` (L11487), `Expiry` + `CVV` (L11488), `Name on card` (L11489). **None of the four inputs has an id and none is ever read.** Footer (L11491): `← Back` → `renderStep2()`; `Save & charge` → `processCharge()` (which re-uses the same hardcoded Visa).

---

## 13. Badges & sidebar counters

| Counter | HTML line | Seed | Formula | Written |
|---|---|---|---|---|
| `sbb-renew` | L506 | `8` (in markup) | `Object.keys(DB.subscriptions).map(k=>DB.subscriptions[k]).filter(x => x.status !== 'Cancelled' && (parseInt(x.ends,10) - 25) <= 3).length` (L9396) | `put('sbb-renew', expSoon)` L9400 |
| `subs.renewal` (top-bar subtitle) | L2169 seed `'8 expiring in 3 days'` | — | `expSoon + ' expiring within 3 days'` | L9407 |
| `#renewal-page-sub` | L862 seed prose | — | §7 | L3354 |
| Column badges | — | — | `entries.length` | L3357 (classes L3386) |
| Row risk badge | — | — | §5.2 | L3362, L3368 |
| Auto-renew chip | — | — | `sub.autoRenew === false` | L3371 |
| Flat-list badge | — | — | `rows.length` | L21127 |

**`sbb-renew` does not agree with the page.** L9396 does `parseInt(x.ends, 10) − 25` — it takes the leading day-of-month out of the `ends` string and subtracts the literal `25`. Consequences: the month is ignored (a sub ending `"2 Jul"` scores `−23` and counts as expiring); there is no lower bound so already-expired subscriptions are included; and the window is 3 days while the page uses 7. Badge and page total will routinely disagree.

---

## 14. Cross-module links

| Direction | Target | Line |
|---|---|---|
| Out → 360° profiles (rider / subscription / driver) | `openProfile()` | L3367, L3370, L3379, L20590–L20591, L20599–L20601, L21134–L21135 |
| Out → Coverage & Capacity | `assignBackup(subId)` (fn L13186) | L20606 |
| Out → Support Center | `go('support',null)` | L20608 |
| Out → priority-call flow | `priorityCall()` (fn L9149) | L3376 |
| Out → contact log | `openLogContact()` (fn L16215) | L20603 |
| Out → Subscriptions table refresh | `renderSubscriptionsTable()` | L11446 |
| Out → Trip Readiness refresh | `renderReadiness()` | L11447 |
| In ← Dashboard renewal card | `openRenewFlow(x.rider)` | L10436 |
| In ← Riders table | `openRenewFlow(id)` | L6432 |
| In ← Rider 360° | `openRenewFlow(d.id)` | L4110 |
| In ← Subscription detail | `openRenewFlow(d.rider)` | L4352 |
| In ← Predictive Signals | `subHealthScore()` / `openRetentionAction()` / `commitRetentionAction()` | L14240, L14255, L14272 |
| Shared data | `DB.subBackups` shared with Coverage & Capacity and Plan Commitment | L13140, L17197 |

---

## 15. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `EYVAR_TODAY = new Date(2026,5,25)` | L11232 | frozen "today", never advanced |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | L9555 | frozen clock used by the pace signal |
| Year `2026` inside `parseShortDate()` | L14204 | every `ends` label is forced into 2026 |
| `sbb-renew` markup value `8` | L506 | overwritten on first `refreshNavCounts()` |
| `subs.renewal = '8 expiring in 3 days'` | L2169 | overwritten at L9407 |
| `#renewal-page-sub` seed prose | L862 | overwritten at L3354 |
| Static KPI delta `auto-renew is off — will lapse without action` | L3348 | never varies |
| `DB.subBackups = {'SUB-1052':'DRV-0105','SUB-1060':'DRV-0101'}` | L13140 | demo backups; directly moves health scores |
| `DB.paymentRisk = {'RDR-1041':'Prior renewal attempt declined once (card ···4821) before succeeding on retry'}` | L14199 | single fabricated record |
| `DB.complianceSuspensions = {}` | L13285 | empty at boot → signal 6 never fires initially |
| `PLANS` prices 86.50 / 122.50 / 164.35 / 232.50 / 344.52 / 487.00 | L4389–L4393 | demo pricing |
| `CADENCE_DAYS = {weekly:7, biweekly:14, monthly:30}` | L11231 | |
| `flowRider = 'RDR-1041'` default and `|| 'RDR-1041'` fallback | L11272, L11278 | silently renews the wrong rider if called with a falsy id |
| `Visa ···· 4821` / `Expires 09/27` / `Default` | L11356, L11382, L11478 | fully hardcoded payment instrument |
| `VAT (15%) — included` | L11352 | never computed; contrast real VAT maths in `getOrCreateInvoice()` L4399–L4404 |
| `success = Math.random() > 0.25` | L11387 | simulated gateway (comment L11385 says ~80%) |
| `setTimeout(…, 1800)` | L11389 | simulated latency |
| `txn = 'TXN-' + 6 random digits` | L11423 | fabricated transaction id |
| `Reason: Insufficient funds` | L11477 | the only failure reason that can appear |
| `Save 5%` / `Save 10%` / `5% discount applied` / `Best value` | L11264–L11271 | marketing copy only — the prices come straight from `PLANS`, no discount is applied |
| `has a slot available` | L11319 | asserted with no availability check |
| `fallbackDrv = Object.keys(DB.drivers)[0]` | L11442 | arbitrary first driver for a new subscription |

---

## 16. i18n keys

| Key | Element | Line | Arabic | Line |
|---|---|---|---|---|
| `nav.renewal` | sidebar label "Renewal pipeline" | L506 | `مسار التجديد` | L7907 |

**No other element in this module carries `data-i18n`.** Every page heading, KPI label, column title, badge label, modal string and button label produced by `renderRenewalPipeline()` (L3308–L3387), `renewalListHTML()` (L21121–L21145), `openHealthBreakdown()` (L20567–L20593), `renewalMenu()` (L20594–L20620) and the whole renew wizard (L11277–L11492) is an English literal built in JS and is not translatable.

---

## 17. Gaps, dead code, UNVERIFIED items

**Dead / unused**
1. `cancelledThisMonth` — computed L3343, never referenced; also mis-named (no month restriction).
2. "Keep same driver?" toggle (L11319) — no id, never read; purely decorative.
3. `tryAnotherCard()` inputs (L11487–L11489) — no ids, never read; `Save & charge` re-enters `processCharge()` with the same hardcoded Visa.
4. `flowRider = 'RDR-1041'` (L11272) and the `|| 'RDR-1041'` fallback (L11278) — demo leftovers.

**Functional gaps**
5. `renderSuccess()` (L11418–L11463) writes **no audit entry** and **no `DB.payments` record**, so a completed renewal is invisible to both the activity log and Finance. Contrast `capturePaymentHold()` (L9614–L9625), which does create a payment.
6. `renderSuccess()` does not call `renderRenewalPipeline()`, so the page the operator launched from is stale after a successful renewal.
7. A renewal that creates a brand-new subscription (L11439–L11445) skips `generateUpcomingTripsForSubscription()` — unlike `materializeSubscription()` (L9655) — so no readiness trips exist for it.
8. `sbb-renew`'s formula (L9396) disagrees with the page's own rule: 3-day vs 7-day window, no lower bound, month-blind (§13).
9. KPI counts are computed after filtering (L3334 precedes L3340), so tile values shrink when a filter is active.
10. `autoRenew` is **absent from every seeded subscription** — the only writes are L5450 (`true`) and L5477 (`false`) inside `toggleAutoRenew()` (L5442). At boot `autoRenew === false` is false everywhere, so the "Manual renewal required" KPI reads 0 and the `manual` filter yields an empty page until an operator explicitly turns auto-renew off. The comment at L20553–L20554 acknowledges a related latent bug.
11. The renewal page and Predictive Signals label identical scores differently (`>=70` vs `>=80` for the green band) — §5.2.
12. No permission gate exists anywhere on the renewal page or on the wizard's charge path. Only `sendRenewalApprovalRequest()` (`contact_users`, L11406) and `commitRetentionAction()` (`predictive.act`, L14273) are gated.
13. `GATE_SWEEP.commitRetentionAction`'s confirmation copy (L20863) claims it "may issue credit or change the subscription terms"; the implementation writes nothing to the subscription.
14. `pickPlan()` uses the implicit global `event` (L11337–L11338) — breaks under strict mode or programmatic invocation.

**UNVERIFIED**
- `priorityCall(name, context, entityId)` — called L3376, defined L9149; the 3-argument contract and full effect were not read (belongs to the contact/telephony module).
- `workChip('renewal', subId)` → `caseChip()` L18997 / `ownerChip()` L18928 — the claim/ownership state machine was not traced (Work Inbox module).
- `openLogContact()` (L16215), `openProfile()`, `statusBadge()`, `stopEv()`, `findCorpForRider()`, `getCorpUsagePolicy()`, `sendSystemEmail()` — referenced but bodies not read.
- Whether `gateAll(GATE_SWEEP)` actually wraps `commitRetentionAction` at runtime depends on `guardAction()` (L17819) and load order; this is a static reading only, the code was not executed.

---

## 18. Line-number index

| Item | Lines |
|---|---|
| Sidebar entry + `sbb-renew` | L506 |
| `titles.renewal` / `subs.renewal` | L2168 / L2169 |
| `#p-renewal` markup | L861–L866 |
| `rowLink()` | L3283 |
| Header comment (page history) | L3304–L3307 |
| `renderRenewalPipeline()` | L3308–L3387 |
| — inclusion + grouping | L3311–L3324 |
| — sort | L3325–L3332 |
| — filter | L3334–L3339 |
| — KPI computation (+ dead `cancelledThisMonth`) | L3340–L3343 |
| — flat-list injection | L3344–L3345 |
| — KPI render | L3346–L3353 |
| — page subtitle | L3354 |
| — `cardHTML()` | L3356–L3385 |
| — column assembly | L3386 |
| `nm2()` | L3565 |
| `PLANS` | L4389–L4393 |
| `toggleAutoRenew()` | L5442–L5480 |
| `go()` dispatch (`renewal`) | L8810 |
| `priorityCall()` | L9149 |
| `refreshNavCounts()` | L9392–L9409 (`expSoon` L9396, `sbb-renew` L9400, `subs.renewal` L9407) |
| `REQ_NOW_REF` / `REQ_MONTHS` | L9555 / L9556 |
| Dashboard renewal card (cross-module) | L10420–L10438 |
| `resolveFlowRider()` / `riderCurrentSub()` | L11222–L11230 |
| `CADENCE_DAYS` / `EYVAR_TODAY` / `addDaysLabel()` | L11231–L11236 |
| `planCadenceKey()` / `planVehicleType()` | L11237–L11245 |
| `renewOptionsFor()` | L11249–L11274 |
| `flowRider` / `flowSelected` / `flowRiderName()` | L11272 / L11273 / L11275 |
| `openRenewFlow()` | L11277–L11283 |
| `stepBar()` | L11285–L11298 |
| `renderStep1()` | L11300–L11331 |
| `pickPlan()` | L11333–L11339 |
| `renderStep2()` | L11341–L11361 |
| `processCharge()` | L11363–L11390 |
| `renderRenewalApprovalHold()` | L11394–L11404 |
| `sendRenewalApprovalRequest()` | L11405–L11416 |
| `renderSuccess()` | L11418–L11463 |
| `renderFailure()` | L11465–L11481 |
| `tryAnotherCard()` | L11483–L11492 |
| `DB.subBackups` seed | L13140 |
| `assignBackup()` | L13186 |
| `DB.complianceSuspensions` | L13285 |
| `DB.incidents` | L13389 |
| `DB.paymentRisk` | L14199 |
| `parseShortDate()` | L14200–L14205 |
| `subHealthScore()` | L14210–L14229 |
| `healthBand()` | L14231–L14235 |
| `renderPredSubs()` (shared consumer) | L14236–L14254 |
| `openRetentionAction()` | L14255–L14271 |
| `commitRetentionAction()` | L14272–L14283 |
| `renderPredPayment()` | L14325–L14343 |
| `DB.disputes` | L14391 |
| Boot call | L14572 |
| `openLogContact()` | L16215 |
| `guardAction()` | L17819 |
| `ownerChip()` / `caseChip()` / `workChip()` | L18928 / L18997 / L19030 |
| `_renewalFilter` | L20560 |
| `setRenewalFilter()` | L20562–L20565 |
| `openHealthBreakdown()` | L20567–L20593 |
| `renewalMenu()` | L20594–L20620 |
| `gateAll()` | L20756–L20767 |
| `GATE_SWEEP` | L20769– |
| `GATE_SWEEP.commitRetentionAction` | L20862–L20863 |
| Deliberate no-gate note (`renewalMenu`) | L20889 |
| `installGateSweep()` | L20898 |
| `renewalFlatList()` | L21106–L21120 |
| `renewalListHTML()` | L21121–L21145 |
| `toggleRenewalFlat()` | L21146–L21150 |
| i18n `nav.renewal` (AR) | L7907 |
