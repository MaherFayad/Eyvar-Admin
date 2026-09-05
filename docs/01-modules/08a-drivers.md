# Module: Drivers (Fleet roster)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `drivers` — DOM node `div#p-drivers`
> **HTML lines:** L887–L906
> **Render entry:** `go('drivers', el)` → `renderSupplyKpis(); renderDriversTable(); renderPendingDrivers(); renderFleetCounts();` (L8791)
> **Companion doc:** `08b-driver-onboarding-applicants.md` (the pending-approvals card embedded on this page, the All-Pending page and the Applicant Detail page)

---

## 1. Purpose

The Drivers page is the fleet roster and the supply-health screen. It answers three questions in one scroll:

1. **How many captains do we actually have, and how many can legally receive work right now?** — `fleetCountsHTML()` (L20944) and `supplyKpiHTML()` (L21186).
2. **Who is waiting to be let in?** — the amber "Pending driver approvals" card (L890–L894), rendered by `renderPendingDrivers()` (L10894). Full detail in doc 08b.
3. **Who is on the roster, at what tier, with what capacity and what standing?** — the "All drivers" table (L899–L905), rendered by `renderDriversTable()` (L6343).

The source carries an explicit design rationale comment (L21162–L21184) explaining that a headline "registered" count conceals supply crises, and that **eligible** is the number that decides whether tomorrow's plans can be covered.

---

## 2. Entry points & routing

| # | Entry | Line | Notes |
|---|---|---|---|
| 1 | Sidebar → Fleet section → "Drivers" | L512 | `onclick="go('drivers',this)"`, `data-i18n="nav.drivers"`, SVG people icon. No badge element on this nav item. |
| 2 | `go('drivers', null)` from All-Pending page "← Back to drivers" | L1327 | |
| 3 | `go('drivers', null)` from `buildApplicantDetailBody` fallback when a record is not found | L7117 | Fires `toast('Record not found','err')` first. |
| 4 | Notification click, `n.type==='approval'` | L2274 | Approval-type notifications route here (e.g. seed notification `N4`, L2769). |
| 5 | Dashboard KPI "Pending approvals" | L10374 | `dashKpi(...,"go('drivers',null)")`. |
| 6 | Dashboard KPI "Active drivers" | L10376 | `dashKpi(...,"go('drivers',null)")`. |
| 7 | Tier-recalculation toast / ops notification (multi-driver case) | L13624, L13625, L13637, L13638 | Clicking the toast navigates to this page. |
| 8 | `buildEntityProfile` → "Wallet" button uses `go('wallets')`, not this page | L4111 | (Counter-example — listed to be exact.) |

**Routing mechanics** (`window.go`, L8774–L8800):
- Removes `.on` from every `.page`, adds `.on` to `#p-drivers`.
- `pushHistory()` unless `isBack` (L8779) — enables the toolbar Back button and `goBack()` (L7012).
- Toolbar title ← `titles['drivers'] = 'Drivers'` (L2168).
- Toolbar subtitle ← `subs['drivers']`, seeded as the **hardcoded string `'24 active drivers'`** (L2169), then overwritten by `refreshNavCounts()` to `Object.keys(DB.drivers).length+' active drivers'` (L9405). See §17.
- Page header `<p>` under the H1 is overwritten by `liveSubtitles()` (L21235–L21238) — see §8.
- `markPresence()` records the page for the "who is working now" panel (L21322 region).

**Exit points:** every driver name / "View 360°" button → `openProfile(id)` → page `profile` (`#p-profile`), not a separate driver page.

---

## 3. Layout map

Top-to-bottom order inside `div#p-drivers` (L887–L906):

| Order | Element | Anchor id | Line | Rendered by |
|---|---|---|---|---|
| 1 | Page header `.ph` — H1 "Drivers", subtitle `<p>—</p>` (placeholder), right-side button "+ Onboard driver" | — | L888 | Static HTML; subtitle overwritten by `liveSubtitles()` L21235 |
| 2 | Register panel (collapsible, 11 tiles, two audiences) | `#fleet-counts` | L889 | `renderFleetCounts()` L21152 → `fleetCountsHTML()` L20944 |
| 3 | Pending driver approvals card (amber-bordered) with count badge, list, and "View all pending" footer | `#pending-drivers-list`, `#pending-count`, `#pending-drivers-footer` | L890–L894 | `renderPendingDrivers()` L10894 — **documented in 08b** |
| 4 | Supply KPI grid (4 tiles) | `#supply-kpis` | L895 | `renderSupplyKpis()` L21228 → `supplyKpiHTML()` L21186 |
| 5 | Driver tier KPI grid (4 tiles) | `#driver-tier-kpis` | L896 | Built inline inside `renderDriversTable()` L6355–L6368 |
| 6 | "All drivers" card + 9-column table | `#drivers-tbody` | L899–L905 | `renderDriversTable()` L6343 |

Note the ordering quirk: the collapsible Register panel (`#fleet-counts`) sits **above** the pending card, but the comment at L20947 says it is collapsed by default precisely so the pending card is the first actionable thing seen.

---

## 4. Data model & fields

### 4.1 `DB.drivers` — keyed by driver id (L2631–L2668)

Six seeded records: `DRV-0101` … `DRV-0106`.

| Field | Type | Meaning | Example (DRV-0101, L2632) |
|---|---|---|---|
| `id` | string `DRV-####` | Primary key; duplicated as map key | `'DRV-0101'` |
| `name` | string | Full display name | `'Ahmed Salem'` |
| `phone` | string | E.164-ish with spaces | `'+966 53 001 0101'` |
| `email` | string | Contact email (auto-generated for approved applicants, L11100) | `'ahmed.salem86@gmail.com'` |
| `rating` | number 0–5, one decimal | Star rating; `0` means "New" | `4.9` |
| `lvl` | enum `gold` \| `silver` \| `standard` \| `new` | Tier — recomputed by `recalcDriverTiers()` L13601 | `'gold'` |
| `vehicle` | string `"<Model> <Year> · <Colour>"` | Free text; model token is parsed for class verification | `'Corolla 2022 · White'` |
| `type` | enum `Economy` \| `Comfort` | Vehicle class | `'Economy'` |
| `joined` | string `"<Mon> <YYYY>"` | Join month; parsed by `parseJoinedDate()` L13581 for tenure | `'Feb 2025'` |
| `hasPhoto` | boolean | Drives `avatarHTML()` gradient-photo vs initials (L10836) | `true` |
| `gender` | `Male` \| `Female` | Shown on profile; used by gender-preference matching elsewhere | `'Male'` |
| `multiSubException` | boolean (optional) | Per-driver override of the closed multi-subscription policy (L8163) | `true` |
| `address` | string | **Self-reported at signup** (label states this, L4152) | `'Al Malaz District, Riyadh'` |
| `city` | string | City | `'Riyadh'` |
| `device` | string `"<model> · <OS>"` | Last known device | `'iPhone 14 · iOS 17.4'` |
| `appLang` | `Arabic` \| `English` | App language | `'Arabic'` |
| `lastIp` | string | Last known IP | `'92.96.7.40'` |
| `mapPos` | `{x,y}` percentages | Position on the simulated map canvas | `{x:60,y:55}` |
| `ipLocation` | string | Geolocated IP label | `'Riyadh, SA'` |
| `capacity` | string, free text | Slot capacity label — `'Full'`, `'1 open'`, `'2 open'`, `'3 open'`. **Hardcoded string, never recomputed** | `'1 open'` |
| `movementLog` | array of `{date,action,location}` | Location/activity history → `buildLocationHistoryCard()` L6283 | 2 entries |
| `bank` | `{bankName, iban, holder, status}` | Active payout account; `status` ∈ `Verified` \| `Pending verification` | Al Rajhi / SA44… / Verified |
| `bankHistory` | array of `{bankName,iban,holder,replacedDate,reason}` (optional) | Previous accounts, audit-only. Present only on `DRV-0104` (L2652) | — |
| `notifLog` | array of `{date,channel,msg}` | Email/push delivery log; **all six seeds are `[]`** | `[]` |
| `trips` | array of trip ids | FK into `DB.trips` | `['TRP-7741','TRP-9005','TRP-7720']` |
| `payments` | array of payment ids | FK into `DB.payments` | `['PAY-W640']` |
| `complaints` | array of complaint ids | FK into `DB.complaints` | `[]` |
| `stats.totalTrips` | number | Lifetime trips | `412` |
| `stats.monthEarn` | string `"n,nnn SAR"` | Current-month earnings | `'2,840 SAR'` |
| `stats.onTime` | string `"nn%"` | On-time rate | `'96%'` |
| `stats.activeSubs` | string `"used/limit"` | Active subscriptions vs slot limit | `'4/5'` |

### 4.2 Fields written at runtime (not present in the seed)

| Field | Type | Written by | Line | Meaning |
|---|---|---|---|---|
| `status` | `'pending'` (only value tested) | *never written for `DB.drivers`* | filters at L6346, L20923–L20930 | Filter guard. **No driver record ever has it** — see §19. |
| `suspended` | `{reason, by, at}` | `commitSuspendAccount()` | L9090 | Account suspension; removes from dispatch |
| `manualFlag` | `{reason, by, at}` | `commitFlagAccount()` | L9034 | Manual scrutiny flag; cleared by `commitUnflagAccount()` L9047 |
| `trustedNewDriver` | boolean | `onDriverTrustToggle()` | L9143 | Waives the min-trips subscription gate |
| `multiSubException` | boolean | `commitDriverException()` | L9133 | Grants/withdraws multi-sub exception |
| `flaggedForDeclines` | boolean | instant-ride offer engine | L12003 (set), L12478 (reset) | 3+ consecutive declines |
| `declineStreak` | number | offer engine | L12478 | Reset to 0 on acceptance |
| `planAccess` | `'terminated'` | plan-commitment enforcement | L16708; deleted L16820, L19481 | Removed from plan system |
| `planFreezeUntilMs` | epoch ms | plan-commitment enforcement | L16713; deleted L16820 | Temporary plan freeze |
| `docStatus` | `'expiring'` \| `'expired'` | **never written anywhere** | read at L6380, L20925 | See §19 — dead field |
| `acceptedTrips` / `cancelledTrips` | number | set to `0` on approval | L11100 | Applicant-detail stat cards |

### 4.3 Related collections referenced by this page

| Collection | Line | Used for |
|---|---|---|
| `DB.complaints` | L2706–L2711 | `driverOpenComplaints(id)` (L6336) → "Under review" badge |
| `DB.subscriptions` | L2679–L2687 | `driverActiveSubCount()` L8157; fleet subs counts |
| `DB.opsConfig.allowMultiSubPerDriver` | L2569 (`false`) | Whether the "Exception enabled" chip shows |
| `DB.opsLimits` | L2583–L2592 | Dispatch/rating/trip gates |
| `DB.driverDocs` | L13278–L13284 | Compliance expiry dates (5 of 6 drivers; `DRV-0106` absent) |
| `DB.escrowHolds`, `DB.deductions`, `DB.payouts`, `DB.driverBonusLog` | L2793–L2809 | Earnings breakdown card on the 360° profile |
| `DB.circuits` | L2810–L2822 | Daily circuit (only `DRV-0101`, `DRV-0103`) |

---

## 5. Levels / tiers / ratings

### 5.1 Tier ladder — `computeDriverTier(d)` (L13595–L13601)

| Tier | `lvl` value | Entry criteria (exact) | Badge class | Rank (`TIER_RANK` L13579) |
|---|---|---|---|---|
| New | `new` | `!d.rating \|\| d.rating===0` — i.e. no rating yet | `b-grey` | 0 |
| Standard | `standard` | Has a rating but fails both bars below | `b-grey` | 1 |
| Silver | `silver` | `rating >= 4.3` **AND** `tenureDays >= 30` | `b-silver` | 2 |
| Gold | `gold` | `rating >= 4.7` **AND** `tenureDays >= 90` | `b-gold` | 3 |

- **Tenure**: `driverTenureDays(d)` (L13588) = `round((REQ_NOW_REF − parseJoinedDate(d.joined)) / 86400000)`, floored at 0. `parseJoinedDate` (L13581) accepts only `"Mon YYYY"` and returns the **1st of that month**; anything else returns `null` → tenure `0`.
- **Recalculation**: `recalcDriverTiers(silent)` (L13602) skips `d.status==='pending'`, writes `d.lvl`, and for every change emits `logAction('tier_change','driver',id, …)` (L13617) recording rating and tenure days in the summary, with `before {lvl}` / `after {lvl}`. Runs on the tick cadence (per the comment L13577) and on demand.
- **Manual trigger**: `manualRecalcTiers()` (L13634) — gated by `requirePagePerm('growth','recalc_tiers')`; reached from Growth → Incentives, not from this page.
- **Riders reuse the same function** (`recalcRiderTiers`, L13645) because it reads only `.rating` and `.joined`.

### 5.2 What a tier unlocks

| Tier | Unlock | Source |
|---|---|---|
| Gold | Incentive `INV-3` "Gold captain commission" — commission **20% → 17%** for "Gold-tier drivers (rating ≥4.7, 90d)" | L13567 |
| Gold / Silver | Push-campaign audience segments `gold_drivers`, `silver_drivers` | L7680–L7681, L7715–L7716, labels L7710 |
| All | `lvlBadge(lvl)` (L3260) and `lvlBadgeSm(lvl)` (L8901) render the chip; both map unknown values to Standard/grey | L3260, L8901 |

`lvlBadge` map (L3261): `gold→['b-gold','Gold']`, `silver→['b-silver','Silver']`, `standard→['b-grey','Standard']`, `new→['b-grey','New']`; default = Standard.
`lvlBadgeSm` map (L8902): same four keys → class only, label = capitalised `lvl`, `'—'` when falsy.

### 5.3 Ratings

| Aspect | Rule | Line |
|---|---|---|
| Scale | 0–5, one decimal | data L2632 |
| Display helper | `rstar(r)` → `r>0 ? '★ '+r.toFixed(1) : '★ new'` | L3264 |
| Table chip | `d.rating` truthy → `<span class="b {lvlCls}">★{rating}</span>`; else `<span class="b b-grey">New</span>` | L6390 |
| Profile header | `lvlBadge(d.lvl)` + `<span class="b b-gold">{rstar(d.rating)}</span>` | L8842 |
| "Limited" tier bucket | `d.rating > 0 && d.rating < 3.5` — checked **before** gold/silver in the counter, so a low-rated Gold is counted Limited, not Gold | L6350 |
| Dispatch minimum | `driver_min_rating_for_dispatch` = **3.5★**, `enabled:true, enforced:true` → `driverAutoRestricted()` excludes from new offers/subscriptions | L2585, L4506 |
| Second (unenforced) limit | `driver_min_rating` = 3.5★, `enabled:true`, **`enforced:false`** — duplicate of the above with no hook | L2591 |
| Low-rating threshold (trips) | `lowRatingThreshold()` = `DB.opsConfig.notifications.lowRatingThreshold` (default **2.5**) | L15243, config L2571 |
| Low-rating predicate | `isLowRating(r)` = `typeof r==='number' && r>0 && r<=threshold` | L15247 |

### 5.4 `toggleLowRatingFilter()` (L15345) — cross-module

This toggle belongs to the **All Trips** table (`renderTripsTable`), not the Drivers page. It flips `window.__tripsLowOnly`, restyles button `#trips-low-btn` (red background `var(--red-lt)`, border `#F09595`, text `var(--red)` when on; cleared when off), then calls `renderTripsTable()`. It filters trips whose `driverRatingGiven` satisfies `isLowRating()` (`lowRatedTripIds()`, L15342). It is listed here because it is the only "low rating filter" in the file and is *not* wired to the Drivers page — see §19.

---

## 6. Documents & compliance items

Document **capture** happens at the applicant stage (doc 08b). On the Drivers side the roster carries `DB.driverDocs` expiry dates that drive the separate **Fleet Compliance** page.

`DOC_TYPES` (L13277) — the canonical five, in order:

| # | Key | Label | States | Expiry rule | Rejection flow |
|---|---|---|---|---|---|
| 1 | `license` | Driving license | Application: `✓ Verified` / `⏳ Pending` / `✗ Rejected`. Roster: an ISO date in `DB.driverDocs[id].license` | `docDaysLeft()` L13286 = `floor((date − REQ_NOW_REF)/86400000)`; `docState()` L13290: `<0` → **EXPIRED** (`b-red`, rank 0); `≤7` → `Nd left` (`b-red`, rank 1); `≤30` → `Nd left` (`b-amber`, rank 2); else `Nd` (`b-green`, rank 3) | Applicant-stage only — `setDocStatus(appId,key,'rej')` → reason modal → `confirmDocReject()` (doc 08b) |
| 2 | `vehicle_reg` | Vehicle registration (Istimara) | same | same | same |
| 3 | `inspection` | Periodic inspection (Fahs) | same — **but not part of the applicant `docs` object** (see §19) | same | n/a at applicant stage |
| 4 | `insurance` | Insurance | same | same | same |
| 5 | `operating_card` | Transport authority operating card | same — **not in applicant `docs`** | same | n/a at applicant stage |

- **Alert cadence / enforcement** (comment L13271–L13276): alerts at **30 / 7 days**, **auto-suspend at 0**. Implemented by `complianceScan()` (L13297) writing `DB.complianceSuspensions` (L13285, `driverId → reason`).
- **Seed coverage**: `DB.driverDocs` has entries for `DRV-0101`–`DRV-0105` only (L13279–L13283). `DRV-0106` (Reem Al-Otaibi) has **no document record at all** — invisible to compliance.
- **Roster-side date editing**: `openDocDateEditor(driverId)` (L11050) — modal with five `<input type="date">` (`#dde-{key}`), gated by `requirePerm('approve_drivers')` **and** `requirePagePerm('compliance','edit_dates')`. Save → `saveDriverDocDates()` (L11064): writes only non-empty values, calls `complianceScan()` and `renderCompliancePage()`, logs `update_doc_dates` with a `"Label: old → new"` change list, toasts `✅ Document dates updated for {name}`. Reached from Compliance, not from this page.

---

## 7. Lifecycle states & transitions (roster driver)

| State | Entered when | Detected by | Exits to | Actions available |
|---|---|---|---|---|
| **Active** (implicit default) | Record exists and none of the flags below are set. `fleetCounts().drivers.active` counts `status==='active' \|\| !status` (L20929) — in practice every seeded driver | absence of `suspended`, `manualFlag`, complaints | Under review, Suspended, Frozen, Terminated | View 360°, Call, Review driver, Send incentive, Flag, Suspend |
| **Under review** | `driverOpenComplaints(id) > 0` **OR** `d.flaggedForDeclines` **OR** `d.manualFlag` (L6386) | table row computation | Active (complaint resolved / unflag / accepted ride) | Row action button gets `.danger` styling (L6396); amber "Under review" badge |
| **Manually flagged** | `commitFlagAccount()` (L9034) | `d.manualFlag` object | Active via `commitUnflagAccount()` (L9046) | Both re-render the drivers table (L9038, L9050) |
| **Suspended** | `commitSuspendAccount()` (L9090) | `d.suspended` object | Active via `reinstateAccount()` (L9099) | Removed from dispatch matching; red `🚫 Suspended` badge in table |
| **Auto-restricted** | `flaggedForDeclines` (3+ declines, L12003) or rating `< 3.5` (L4506) | `driverAutoRestricted(id)` returns a reason string | Cleared by accepting a ride (L12478) or rating recovery | Excluded from new offers/subscriptions — **no dedicated badge on this page** |
| **Frozen from plans** | `d.planFreezeUntilMs > nowMs()` — set at L16713 to `nowMs()+freezeDays*86400000` | fleetCounts / filter | Auto on expiry, or `delete d.planFreezeUntilMs` (L16820) | Counted in "Not available" KPI |
| **Removed from plans** | `d.planAccess='terminated'` (L16708) | fleetCounts / filter | `delete d.planAccess` (L16820, L19481) | Counted in "Not available" KPI |
| **Not trusted for subs** | `driverCompletedTripsCount(id) < 10` and `!trustedNewDriver` (L4487) | profile Subscription-settings card | Trip count reaches limit, or ops toggles Trusted | Quick Rides remain open |

**Entry into the roster** is exclusively via `approveDriver()` from the applicant funnel (L11094) — see doc 08b §7. There is **no** UI on this page that creates a driver: the "+ Onboard driver" button is a toast stub (L888).

---

## 8. KPIs & metrics

### 8.1 Supply KPIs — `supplyKpiHTML()` (L21186–L21212), container `#supply-kpis`

Layout: `<div class="g4">` — 4 tiles. All read `fleetCounts().drivers` (L20918). `pct = total ? round(eligible/total*100) : 0` (L21188).

| # | Label | Value | Sub-label | Colour rule | Click → |
|---|---|---|---|---|---|
| 1 | **Eligible for work** | `c.eligible` | `of {c.total} registered · {pct}%` | `pct<60 ? var(--red) : var(--green)` | `setDriverFilter('eligible')` |
| 2 | **Pending approval** | `c.pending` | `c.pending ? 'blocking supply today' : 'nothing waiting'` | `c.pending ? var(--amber) : var(--ink)` | `kpiScrollTo('pending-drivers-list')` (special-cased, L21190) |
| 3 | **Not available** | `c.suspended + c.frozen + c.terminated` | `{suspended} suspended · {frozen} frozen · {terminated} removed` | non-zero → `var(--amber-dk)`, else `var(--ink)` | `setDriverFilter('unavailable')` |
| 4 | **Documents at risk** | `c.docsAtRisk` | `c.docsAtRisk ? 'will auto-suspend on expiry' : 'all current'` | non-zero → `var(--red)`, else `var(--ink)` | `setDriverFilter('docs')` |

Active tile gets `border-color:var(--blue);box-shadow:0 2px 10px rgba(0,0,0,.08)` when `_driverFilter===filter` (L21192). `title` attribute: `'Jump to pending applications above'` for tile 2, `'Click to filter the list below'` otherwise.

`renderSupplyKpis()` (L21228) also fills `#rider-kpis` with `riderKpiHTML()` if that node exists — the Riders page anchor is `#rider-kpis-anchor` (L1354 region), so on the Drivers page this second write is a no-op.

### 8.2 `fleetCounts()` — exact formulas (L20918–L20943)

Inputs: `d = values(DB.drivers)`, `r = values(DB.riders)`, `subs = values(DB.subscriptions)`.

| Key | Formula | Line |
|---|---|---|
| `drivers.total` | `d.length` | L20927 |
| `drivers.active` | count of `x.status==='active' \|\| !x.status` | L20929 |
| `drivers.pending` | count of `x.status==='pending'` | L20930 |
| `drivers.suspended` | count of `!!x.suspended` | L20931 (index order: suspended L20930? see note) |
| `drivers.terminated` | count of `x.planAccess==='terminated'` | L20931 |
| `drivers.frozen` | count of `x.planFreezeUntilMs && x.planFreezeUntilMs > nowMs()` | L20932 |
| `drivers.eligible` | `!x.suspended && x.planAccess!=='terminated' && !(x.planFreezeUntilMs>nowMs()) && x.status!=='pending'` | L20922–L20924 |
| `drivers.docsAtRisk` | count of `x.docStatus==='expiring' \|\| x.docStatus==='expired'` | L20925 |
| `riders.total` | `r.length` | L20935 |
| `riders.erased` | count of `x.erased` | L20936 |
| `riders.withSub` | count of **subscriptions** matching `/active\|expiring/i` — note this counts subs, not riders | L20937 |
| `riders.quickOnly` | `r.length − riders.withSub` | L20938 |
| `subs.total` / `subs.active` / `subs.expiring` | `subs.length`; `/active/i`; `/expiring/i` on `s.status` | L20939–L20941 |

### 8.3 Register panel — `fleetCountsHTML()` (L20944–L20984), container `#fleet-counts`

Collapsible card, header `👥 Register — who is actually on the platform`, click → `toggleFleetCounts()` (L20985). **Collapsed by default** (`window.__fleetCountsCollapsed !== false`, L20947). Header right side shows `<span class="b b-red|b-green">{eligPct}% of captains eligible</span>` (red when `<60`) plus a chevron rotated `-90deg` when collapsed.

Expanded body — 11 tiles in three groups:

**Captains** (`g4`, L20956–L20960):
| Label | Value | Sub | Colour |
|---|---|---|---|
| Registered | `drivers.total` | `total on file` | default |
| Eligible for work | `drivers.eligible` | `{eligPct}% of registered` | `<60` red else green |
| Pending approval | `drivers.pending` | `blocking supply today` / `nothing waiting` | amber-dk when >0 |
| Documents at risk | `drivers.docsAtRisk` | `will auto-suspend on expiry` / `all current` | red when >0 |

**Captains, second row** (`g3`, L20962–L20965): Suspended (`account action`, amber-dk), Frozen from plans (`plan-level freeze`, amber-dk), Removed from plans (`plan-level termination`, red).

**Riders** (`g4`, L20967–L20972): Registered (`rider accounts`), On a subscription (`{subs.active} active · {subs.expiring} expiring`, blue), Quick-ride only (`conversion opportunity`), Erased (PDPL) (`identity scrubbed, books retained`).

Footer prose (L20973–L20975): *"The registered total is a vanity number; **eligible** is the one that decides whether tomorrow's plans can be covered…"*

### 8.4 Driver tier KPIs — inline in `renderDriversTable()` (L6355–L6368), container `#driver-tier-kpis`

Counts loop (L6347–L6353) over `allIds` (non-pending drivers), **mutually exclusive, evaluated in this order**:

```
if (d.rating>0 && d.rating<3.5)  counts.limited++
else if (d.lvl==='gold')          counts.gold++
else if (d.lvl==='silver')        counts.silver++
else                              counts.standard++
```
`total = allIds.length || 1` (L6354) — the `|| 1` guards division by zero.

| Tile | Label | Colour | Sub-label (hardcoded text) | Bar class | Bar width |
|---|---|---|---|---|---|
| `gold` | Gold | `#7A5C00` | `rating ≥4.7, 90d+` | `kf kf-a` | `round(counts.gold/total*100)%` |
| `silver` | Silver | `var(--muted)` | `rating ≥4.3, 30d+` | `kf kf-b` | idem |
| `standard` | Standard | `var(--ink)` | `everyone else` | `kf kf-g` | idem |
| `limited` | Limited | `var(--red)` | `below 3.5 rating` | `kf kf-r` | idem |

Each tile: `onclick="filterDriversByTier('{key}',this)"`, `title="Click to filter the table below to {label} drivers"`, active border highlight when `_driverTierFilter===key`.

### 8.5 Page subtitle metrics — `liveSubtitles()` (L21232–L21252)

Writes `#p-drivers .ph-l p` (L21235) to:
```
{drivers.total} registered · {drivers.eligible} eligible · {eco} Economy · {com} Comfort[ · {pending} pending approval]
```
- `eco` = count of `DB.drivers` where `/economy/i.test(type)` (L21233)
- `com` = count where `/comfort/i.test(type)` (L21234)
- The pending clause is appended only when `drivers.pending` is truthy.

Comment L21167–L21180 explains this replaced nine hardcoded subtitles with invented numbers: *"A number that lies is worse than a number that is missing — it gets quoted in meetings."*

---

## 9. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| H1 "Drivers" | static | text | L888 |
| Page subtitle | computed, `liveSubtitles()` L21235 | text | Placeholder `—` in HTML |
| Toolbar title | `titles['drivers']` L2168 | text | `'Drivers'` |
| Toolbar subtitle | `subs['drivers']` L2169 → overwritten L9405 | text | Seed `'24 active drivers'` is **mock**; runtime value = `Object.keys(DB.drivers).length + ' active drivers'` (counts all 6, no pending filter) |
| Register panel, 11 tiles | `fleetCounts()` L20918 | numbers | See §8.3 |
| Eligible % chip | computed L20946 | % | |
| Pending count badge `#pending-count` | `DB.pendingDrivers.filter(status==='pending').length` L10898 | number | HTML default `3` (L891) is **mock**; real value 5 |
| Pending list rows | `DB.pendingDrivers` L2712 | objects | doc 08b |
| Supply KPI tiles ×4 | `fleetCounts().drivers` | numbers | §8.1 |
| Tier KPI tiles ×4 | derived from `DB.drivers[*].lvl` + `.rating` | numbers | §8.4 |
| Table: Driver cell | `d.rating`, `d.lvl`, `d.name`, `d.multiSubException`, `DB.opsConfig.allowMultiSubPerDriver`, `id`, `d.vehicle` | mixed | L6390 |
| Table: Vehicle type | `d.type`, fallback `'—'` | badge | class `b-com` for Comfort else `b-eco` (L6389) |
| Table: Level | `d.lvl` capitalised, fallback `'—'` | badge | class from `lvlCls` (L6388) |
| Table: Active subs | `d.stats.activeSubs`, fallback `'0/0'` | text | L6394 |
| Table: Capacity | `d.capacity`, fallback `'—'` | text | Colour `var(--red)` when exactly `'Full'`, else `var(--green)` — so `'—'` renders green (L6395) |
| Table: On-time | `d.stats.onTime`, fallback `'—'` | text | L6396 |
| Table: Month (SAR) | `d.stats.monthEarn`, fallback `'0 SAR'` | text | blue, weight 500 |
| Table: Status | derived — see §15 | badge | L6398 |
| Table: action button | `openProfile(id)` | button | Label always `View 360°` |

---

## 10. Input fields / filters / toggles

| id / selector | Type | Label | Default | Options / values | Drives |
|---|---|---|---|---|---|
| `#fleet-counts .ch` (no id) | click target | `👥 Register — who is actually on the platform` | collapsed | expanded / collapsed | `toggleFleetCounts()` L20985 flips `window.__fleetCountsCollapsed` and re-renders `#fleet-counts` |
| Supply tile 1 | KPI click | `Eligible for work` | inactive | — | `setDriverFilter('eligible')` |
| Supply tile 2 | KPI click | `Pending approval` | — | — | `kpiScrollTo('pending-drivers-list')` — scrolls + flashes, **does not filter** |
| Supply tile 3 | KPI click | `Not available` | inactive | — | `setDriverFilter('unavailable')` |
| Supply tile 4 | KPI click | `Documents at risk` | inactive | — | `setDriverFilter('docs')` |
| Tier tile ×4 | KPI click | `Gold` / `Silver` / `Standard` / `Limited` | `_driverTierFilter='all'` (L6337) | `gold`\|`silver`\|`standard`\|`limited` | `filterDriversByTier(tier)` L6338 |
| — | *no search box on this page* | — | — | — | Global search lives on the Riders page (L1352) |

### 10.1 `setDriverFilter(f)` (L21219–L21226)

```
_driverFilter = (_driverFilter===f) ? 'all' : f;   // click-to-toggle
renderDriversTable(); renderSupplyKpis();
toast(_driverFilter==='all' ? 'Filter cleared' : 'Filtered to '+f, 'info');
```
Module-scope var `_driverFilter='all'` declared L21218. The toast prints the raw key (`eligible` / `unavailable` / `docs`), not a friendly label.

### 10.2 `filterDriversByTier(tier, chip)` (L6338–L6342)

```
_driverTierFilter = tier;        // NOT a toggle — re-clicking the same tile does nothing
renderDriversTable();
kpiScrollTo('drivers-tbody');
```
The `chip` parameter is accepted and never used. Because it is not a toggle and no tile maps to `'all'`, **there is no in-page way to clear a tier filter** once set except reloading or navigating away and back (`go('drivers')` does not reset it either — the var is module-scope). See §19.

### 10.3 Filter predicates in `renderDriversTable()` (L6370–L6382)

Applied in sequence to `allIds` (already `status!=='pending'`, L6346):

**Tier filter** (L6371–L6375):
- `limited` → keep only `d.rating>0 && d.rating<3.5`
- any other tier → drop if `d.lvl!==_driverTierFilter` **or** `d.rating>0 && d.rating<3.5` (a low-rated Gold is hidden from the Gold view)

**Status filter** (L6378–L6381):
- `eligible` → `!d.suspended && d.planAccess!=='terminated' && !(d.planFreezeUntilMs>nowMs())`
- `unavailable` → `!!d.suspended || d.planAccess==='terminated' || !!(d.planFreezeUntilMs>nowMs())`
- `docs` → `d.docStatus==='expiring' || d.docStatus==='expired'`
- otherwise → `true`

Source comment at L6376–L6377 records the bug that was fixed here: *"`_driverFilter` used to be set by these tiles' onclick and then never read anywhere — every one of the 4 'Register' status tiles showed a 'Filtered to X' toast while the table silently ignored it."*

---

## 11. Actions

| Label | Handler | Line | Real effect | Writes | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| **+ Onboard driver** (page header) | inline | L888 | `toast('Driver onboarding form would open here','info')` — **stub, does nothing** | none | none | none | no |
| Register header (whole `.ch`) | `toggleFleetCounts()` | L20985 | Expand/collapse the 11-tile panel | `window.__fleetCountsCollapsed` | none | none | no |
| Supply tile 1/3/4 | `setDriverFilter()` | L21219 | Filter table + re-render KPIs + toast | `_driverFilter` | none | none | no |
| Supply tile 2 | `kpiScrollTo('pending-drivers-list')` | L14535 | `scrollIntoView({behavior:'smooth',block:'center'})` + `kpi-flash-target` class for 1500 ms | none | none | none | no |
| Tier tile ×4 | `filterDriversByTier()` | L6338 | Filter table + scroll to `#drivers-tbody` | `_driverTierFilter` | none | none | no |
| Driver **name** (table cell) | `openProfile(id)` | L6390 | Navigate to `#p-profile`, render `buildEntityProfile(d,true)` | `navStack` via `pushHistory()` | none | none | no |
| **View 360°** (row action) | `openProfile(id)` | L6396 | Same as above; button gets `.danger` class when the row is flagged | `navStack` | none | none | no |
| **View all pending applications →** | `go('all-pending',null)` | L893 | Navigate to `#p-all-pending` | `navStack` | none | none | no |
| Pending row Approve / Reject | see doc 08b | L10927–L10928 | — | — | `approve_drivers` | yes | yes |

### 11.1 Actions reachable from the driver 360° profile (`buildEntityProfile`, isDrv=true)

| Label | Handler | Line | Effect | Writes | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 📞 Call | `priorityCall(d.name)` | L4109 / L9147 | Simulated priority-call modal | none | none | none | modal |
| **Review driver** | `reviewDriver(d.name)` | L4111 / L8995 | Opens "Review driver" modal | **nothing** — Apply just closes the modal and toasts `✅ Review action applied` | none | none | modal, but no-op |
| 💰 Send incentive | `sendDriverIncentive(d.id)` | L4111 / L11191 | 4-offer radio modal → `confirmDriverIncentive()` L11209 → toast only | **nothing persisted** | none | none | modal, no-op |
| Wallet | `go('wallets',null)` | L4111 | Navigate to Driver Wallets | `navStack` | none | none | no |
| 🎧 Open support ticket | `openSupportTicket(null,d.id,d.name)` | L4113 | Opens ticket composer | ticket record | (see Support module) | — | modal |
| **Flag account** | `openFlagAccountModal(id,'true')` | L4112 / L9010 | Reason modal → `commitFlagAccount()` L9028 | `d.manualFlag={reason,by,at}` | `contact_users` (L9029) | `account_flagged`, after `{flagged:true}` | yes |
| ✓ Unflag account | `commitUnflagAccount(id,'true')` | L4112 / L9044 | `delete d.manualFlag` | driver record | `contact_users` | `account_unflagged`, after `{flagged:false}` | **no** |
| 🚫 **Suspend account** | `openSuspendAccountModal(id,'true')` | L4113 / L9058 | Reason modal → `commitSuspendAccount()` L9082 | `d.suspended={reason,by,at}`; `pushOpsNotification('alert',…)` L9091 | `approve_drivers` (L9083) | `account_suspended`, after `{suspended:true}` | yes; **reason is mandatory** — empty → `toast('⚠ Pick a reason first','warn')` |
| ✓ Reinstate account | `reinstateAccount(id,'true')` | L4113 / L9099 | `delete d.suspended` | driver record | `approve_drivers` | `account_reinstated`, after `{suspended:false}` | **no** |
| Subscription exception toggle | `onDriverExceptionToggle()` | L4137 / L9115 | Grant shows confirm modal (checkbox reverted until confirmed, L9120); revoke is instant | `d.multiSubException` via `commitDriverException()` L9130 | `manage_settings` (L9116) — checkbox reverts on denial | `config_updated`, after `{multiSubException}` | grant: yes / revoke: no |
| Trusted new driver toggle | `onDriverTrustToggle()` | L4128 / L9139 | Waive/restore the min-trips subscription gate | `d.trustedNewDriver` | `approve_drivers` (L9140) — checkbox reverts on denial | `config_updated`, after `{trustedNewDriver}` | no |
| View in Wallets → | `go('wallets',null)` | L4174 | Shown only when the driver has escrow holds or pending deductions | `navStack` | none | none | no |

### 11.2 `reviewDriver(name)` — full contents (L8995–L9003)

Modal `Review driver — {name}`:
- Amber warning box, **hardcoded text**: `Flagged: Late 3× consecutive, on-time rate dropped to 88%.` — identical for every driver regardless of their actual data.
- Field **Action** — `customSelectHTML('csel-review-action','review-action', …)`, default `warning`:
  | value | label |
  |---|---|
  | `warning` | Send warning |
  | `suspend` | Temporary suspension |
  | `reassign` | Reassign riders |
  | `clear` | Clear flag |
- Footer: `Cancel` → `closeModal()`; `Apply` → `closeModal(); toast('✅ Review action applied','ok')`.
- **The selected action is never read.** No state write, no audit entry, no permission gate. Pure stub — see §19.

### 11.3 `selDriver(el)` (L5872–L5876)

Generic radio-card selector used by modals that present `.plan-option` cards:
```
querySelectorAll('#modal-box .plan-option') → remove .selected
el.classList.add('selected')
el.querySelector('input[type=radio]').checked = true
```
Callers: `sendDriverIncentive()` offer cards (L11204), the reassign-compensation cards (L13113–L13116). Despite the name it is **not** a driver picker.

### 11.4 `reassign_driver` audit action — two distinct producers (both outside this page)

| Producer | Line | Context | Permission | Audit summary |
|---|---|---|---|---|
| `commitLiveReassign(id, drvId)` | L11794–L11802 | Live Map — swap the driver on an in-progress trip. Entered from `reassignLiveDriver()` L11789 → `showNearbyDriversMap()` | `live_ops` (L11795) | `Reassigned live trip {id}: {oldName} → {newName}`, before `{driver:old}`, after `{driver:new}` |
| `finalizeReassign(ustId)` | L13119–L13129 | Trip Readiness — swap the driver on an upcoming subscription trip, then pick rider compensation | **none** (no `requirePerm` call) | `Reassigned driver for {ustId}: → {newDriver} for {rider} · Compensation: {label}`, before `{driver:prev}`, after `{driver,compensation}` |

Compensation options offered by `finalizeReassign` (L13113–L13116): `free` 🎁 Free next ride · `20off` 20% off next renewal (**pre-selected**) · `credit` 10 SAR wallet credit · `none` No compensation. See §19 for the label-lookup bug.

---

## 12. Tables & lists

### 12.1 "All drivers" table (`table.dt`, `tbody#drivers-tbody`)

**Static header** (L903): `Driver | Vehicle type | Level | Active subs | Capacity | On-time | Month (SAR) | Status | (blank)` — 9 columns. Wrapped in `div.tbl-scroll` (L902).

**Row source**: `Object.keys(DB.drivers).filter(id => DB.drivers[id].status!=='pending')` (L6346), then the tier + status filters of §10.3. **No sort is applied** — rows appear in `Object.keys` insertion order (`DRV-0101` → `DRV-0106`, then any approved applicants appended).

| Col | Header | Content | Line |
|---|---|---|---|
| 1 | Driver | `p.td-name` (blue, cursor pointer, `onclick=openProfile(id)`): rating chip (`★{rating}` in tier colour) **or** grey `New` chip · name · optional blue `Exception enabled` chip. Then `p.td-sub`: `{id} · {vehicle\|'—'}` | L6390 |
| 2 | Vehicle type | `<span class="b b-com\|b-eco">{type\|'—'}</span>` | L6392 |
| 3 | Level | `<span class="b {lvlCls}">{Capitalised lvl\|'—'}</span>` | L6393 |
| 4 | Active subs | `stats.activeSubs \|\| '0/0'` | L6394 |
| 5 | Capacity | `stats`-free — `d.capacity \|\| '—'`, coloured red iff `=== 'Full'` else green | L6395 |
| 6 | On-time | `stats.onTime \|\| '—'` | L6396 |
| 7 | Month (SAR) | `stats.monthEarn \|\| '0 SAR'`, blue, weight 500 | L6397 |
| 8 | Status | Suspended → red `🚫 Suspended`; else flagged → `b-amber` `Under review`; else `b-green` `Active` | L6398 |
| 9 | *(blank)* | `div.ra` > `button.btn.sm[.danger]` `View 360°` → `openProfile(id)` | L6399 |

**Row click**: none on `<tr>`. Only the name cell and the action button are clickable.

**Empty state** (L6383): a single row, `colspan="9"`, centred, `var(--ghost)`, 11.5 px:
- `'No drivers match this filter.'` when `_driverFilter!=='all' || _driverTierFilter!=='all'`
- `'No drivers in this tier right now.'` otherwise

### 12.2 Pending driver approvals list (`#pending-drivers-list`)

Embedded on this page; `max-height:320px; overflow-y:auto` (L892). Fully documented in **08b §12**. Summary: shows the **first 3** open applicants (`open.slice(0,3)`, L10900); footer `#pending-drivers-footer` is shown when `DB.pendingDrivers.length > 3` (L10901) — note the footer condition uses the **total** array length while the list uses only *open* applicants.

### 12.3 Tier / supply KPI grids

Not tables — `div.g4` grids of `div.kpi` (`div.kpi.click` when clickable). Tier tiles additionally carry a `div.kpi-bar > div.kf.kf-*` progress bar.

---

## 13. 360° profile sections — `buildEntityProfile(d, isDrv=true)` (L4083–L4189)

Rendered into `#prof-body` on page `profile` by `openProfile()` (L8827). Header (`#prof-name`, L8842): `avatarHTML(name,30,hasPhoto)` + name + `lvlBadge(d.lvl)` + `<span class="b b-gold">{rstar(d.rating)}</span>`. Meta (`#prof-meta`, L8844): `{id} · {type} · {vehicle} · {phone} · Joined {joined}`.

Output order (return statement L4185–L4189):

**1. Stat cards** — `div.g4` (L4087–L4092), driver branch only:
| Tile | Value | Fallback | Colour |
|---|---|---|---|
| Total trips | `stats.totalTrips` | `'—'` | default |
| Month earnings | `stats.monthEarn` | `'—'` | `var(--blue)`, font-size 18px |
| On-time | `stats.onTime` | `'—'` | `var(--green)` |
| Active subs | `stats.activeSubs` | `'—'` | default |

Followed by `reconcileBannerHTML(d.id)` if that function exists (L4104). `riderNoShowCardHTML` is rider-only (L4105).

**2. Actions card** (L4106–L4115) — see §11.1. Below the buttons, two conditional strips:
- `d.manualFlag` → `🚩 Flagged` badge + `{reason} — by {by}, {at}` (L4114)
- `d.suspended` → `🚫 SUSPENDED` badge + `{reason} — by {by}, {at} · removed from dispatch matching` (driver wording; riders get `cannot be assigned to new subscriptions`) (L4115)

**3. 📦 Subscription settings card** (driver-only, L4116–L4141). Header carries `<span class="b b-blue">Exception enabled</span>` when `exceptionOn && !generalOpen`. Body, in order:
- **Trust gate** (shown when `trustLimit.enabled && !driverTrustedForSubs(id)`), red box: `🆕 New driver — {completedTrips} of {trustLimit.value} completed trips needed before this driver is eligible for subscription assignment. Quick Rides are still open normally — that's how the track record builds.` + toggle `#drv-trust-{id}` labelled **"Trusted new driver — skip this requirement"**.
- Else if `d.trustedNewDriver`, blue box: `✓ Fast-tracked by ops — the usual {value||10}-trip requirement was waived for this driver.`
- **General-policy notice**: when `!generalOpen`, amber box `⚠ The general setting is currently closed — new subscriptions go to new drivers only. You can grant this driver a personal exception below.`; when open, grey line `The general setting is currently open — any driver can receive new subscriptions, so this exception has no effect right now.`
- **Toggle `#drv-multisub-exc-{id}`** labelled **"Special exception — accept additional subscriptions"**, checked from `d.multiSubException`.
- Footnote: `Allows this driver to receive new subscriptions even if the general setting is closed. Current active subscriptions: {driverActiveSubCount(id)}.`

**4. `g2` two-column block** (L4186):
- **👤 Personal information** (`kvCard`, L4150–L4154): Gender · Registered address *(self-reported at signup)* · City. **Only 3 rows** — name/phone/DOB/national ID are *not* on the driver 360; they appear only on the Applicant Detail page (08b).
- **📱 Device & access** (`kvCard`, L4157–L4162): Device · App language · Last known IP `{ip} ({ipLocation})` · Terms of Service `v{version} — current|outdated` · Privacy Policy `v{version} — current|outdated` (green when `isConsentCurrent()`, amber otherwise).

**5. Customer value card / wallet card** — rider-only, empty string for drivers (L4183–L4184).

**6. 🏦 Bank account** — `bankCardHTML(d)` (L4142 / L6294). Title suffix `1 active · {n} previous` when `bankHistory` exists. Rows: Status (`Active` chip + `Verified` green / other amber) · Bank · IBAN (monospace) · Account holder. Then, if `bankHistory`: a divider, the heading `PREVIOUS ACCOUNTS (INACTIVE — FOR AUDIT ONLY)`, and one grey box per historical account showing `{bankName} · {iban}`, a `Replaced` chip, and `Replaced {replacedDate} · {reason}`. Returns `''` when `d.bank` is absent.

**7. 🔔 Notifications sent to driver** (L4143–L4149) — rendered only when `d.notifLog.length`. Sub-caption `Email + push delivery log`. Row = `{date}` (60 px column) · `<span class="b b-blue">{channel}</span>` · italic `"{msg}"`. **All six seeded drivers have `notifLog: []`, so this card never appears on seed data.**

**8. 💰 Earnings breakdown** (driver-only `kvCard`, L4164–L4176):
| Row | Formula | Line |
|---|---|---|
| Held in escrow (subscriptions in progress) | Σ `DB.escrowHolds[driver===id && status==='held'].amount`, amber-dk | L4166/L4170 |
| Ready to release | Σ same with `status==='ready'`, blue | L4167/L4171 |
| 💰 Tips earned | `+` Σ `DB.trips[*].tip` where `t.driver===id`, green | L4169/L4172 |
| 🏆 Incentive bonuses earned | `+` Σ `DB.driverBonusLog[driverId===id].amount`, green, with `({count})` suffix when non-empty | L4168/L4173 |
| Pending deductions | `−` Σ `DB.deductions[driver===id && status==='pending'].amount`, red | L4169/L4174 |
| *(blank label)* | `View in Wallets →` button if any escrow or deduction, else `No holds or deductions` | L4174 |

**9. 📍 Location history** — `buildLocationHistoryCard(d)` (L6283). Sub-caption `Since registration`. One row per `movementLog` entry: date (78 px) · blue dot · `{action} · {location}`. Empty state: `No location history recorded yet.`

**10. Subscriptions section** — rider-only, `''` for drivers (L4179).

**11. 🚕 Trip history** (L4186) — card header with `<span class="b b-grey">{d.trips.length}</span>`, body `tripsTable(d.trips, d.id)`.

**12. `g2` final row** (L4187–L4188):
- **💳 Payments** — count chip `b-grey`, body `payTable(d.payments, d.id)`
- **⚠️ Complaints** — count chip `b-red` when `complaints.length`, else `b-green`; body `cmpTable(d.complaints)`

Rider-only sections deliberately **absent** for drivers: Quick rides / Total paid / Renewal rate stat tiles, `riderNoShowCardHTML`, `customerValueCardHTML`, `walletCardHTML`, the Subscriptions table.

---

## 14. Modals opened from this page

| Modal | Opened by | Line | Fields | Footer buttons |
|---|---|---|---|---|
| **Review driver — {name}** | `reviewDriver()` | L8995 | Amber box (hardcoded flag text); Field **Action** — custom select `#review-action` (`csel-review-action`), default `warning`, options: Send warning / Temporary suspension / Reassign riders / Clear flag | `Cancel` → close · `Apply` → close + toast (no effect) |
| **🚩 Flag account — {name}** | `openFlagAccountModal()` | L9010 | Explanatory line naming the table (`Drivers`/`Riders`); Field **Reason \*** — `#flag-reason`, **default empty**, options: Suspicious activity / Payment dispute / Repeated complaints / Fraud investigation / Other — see note | `Cancel` · `🚩 Flag account` → `commitFlagAccount()` (empty reason → `⚠ Pick a reason first`) |
| **🚫 Suspend account — {name}** | `openSuspendAccountModal()` | L9058 | Red box: *"Immediately removes this driver from dispatch matching — no new rides or subscription assignments until reinstated."*; optional amber `🔍 Detected: {prefillNote}` box; Field **Reason \*** — `#suspend-reason`, default `''` (or `'Confirmed fraud'` when a prefillNote is supplied), options: Confirmed fraud / Repeated policy violations / Safety incident / Under police/legal investigation / Other — see note | `Cancel` · `🚫 Suspend` → `commitSuspendAccount()` |
| **Grant exception — {name}** | `onDriverExceptionToggle()` (checked path) | L9122 | Blue info box: *"This driver will receive additional subscriptions even if the general setting is disabled."* No inputs | `Cancel` (checkbox stays off) · `Grant exception` → `commitDriverException(id,true)` |
| **Send incentive — {name}** | `sendDriverIncentive()` | L11191 | Four `.plan-option` radio cards (`name="dof"`), first pre-selected: 💰 Per-trip bonus (*+5 SAR for next 20 trips this week*) · ⛽ Fuel allowance (*150 SAR monthly fuel credit*) · 🤝 Referral bonus (*200 SAR per new driver referred*) · ⭐ Loyalty bonus (*300 SAR — 6 months active + 4.8+ rating*) | `Cancel` · `Send incentive` → `confirmDriverIncentive()` → toast only |
| **📞 Priority call** | `priorityCall(name, context, entityId)` | L9147 | Phone glyph, name, `{context}{ · entityId}` line | (call-simulation modal) |
| **📅 Document dates — {name}** | `openDocDateEditor(driverId)` | L11050 | Five `<input type="date">` `#dde-license`, `#dde-vehicle_reg`, `#dde-inspection`, `#dde-insurance`, `#dde-operating_card`, pre-filled from `DB.driverDocs[id]` | `Cancel` · `Save dates` → `saveDriverDocDates()` |

---

## 15. States & badges

| Badge / chip | Exact trigger | Classes / style | Line |
|---|---|---|---|
| `★{rating}` | `d.rating` truthy | `b {lvlCls}`, font-size 8px | L6390 |
| `New` | `d.rating` falsy (0 / undefined) | `b b-grey`, font-size 8px | L6390 |
| `Exception enabled` (table) | `d.multiSubException && !DB.opsConfig.allowMultiSubPerDriver` | `b b-blue`, 8px | L6390 |
| `Economy` | `d.type!=='Comfort'` | `b b-eco` | L6392 |
| `Comfort` | `d.type==='Comfort'` | `b b-com` | L6392 |
| `Gold` | `d.lvl==='gold'` | `b b-gold` | L6388/L6393 |
| `Silver` | `d.lvl==='silver'` | `b b-silver` | L6388/L6393 |
| `Standard` / `New` / `—` | any other `lvl`, or falsy | `b b-grey` | L6388/L6393 |
| `🚫 Suspended` | `d.suspended` truthy | inline `background:var(--red);color:#fff` | L6398 |
| `Under review` | `driverOpenComplaints(id)>0 \|\| d.flaggedForDeclines \|\| d.manualFlag` | `b b-amber` | L6398 |
| `Active` | none of the above | `b b-green` | L6398 |
| Row action `.danger` | same `flagged` predicate | `btn sm danger` | L6396 |
| Capacity red | `d.capacity === 'Full'` exactly | `color:var(--red)` | L6395 |
| Capacity green | any other value **including `'—'`** | `color:var(--green)` | L6395 |
| `{pct}% of captains eligible` red | `eligPct < 60` | `b b-red` | L20977 |
| …green | `eligPct >= 60` | `b b-green` | L20977 |
| KPI tile active outline | `_driverFilter===filter` / `_driverTierFilter===key` | `border-color:var(--blue);box-shadow:0 2px 10px rgba(0,0,0,.08)` | L21192, L6359 |
| Profile `🚩 Flagged` | `d.manualFlag` | `b b-red` | L4114 |
| Profile `🚫 SUSPENDED` | `d.suspended` | `background:var(--red);color:#fff` | L4115 |
| Profile `Exception enabled` | `exceptionOn && !generalOpen` | `b b-blue` | L4123 |
| Bank `Active` + `Verified`/`{status}` | `d.bank.status==='Verified'` → `b-green`, else `b-amber` | `b b-blue` + status chip | L6297 |
| Bank `Replaced` | each `bankHistory` entry | `b b-grey`, 8.5px | L6306 |
| ToS / Privacy `v{n} — current` / `— outdated` | `isConsentCurrent(d,isDrv,'tos'\|'privacy')` | `b b-green` / `b b-amber` | L4160–L4161 |
| Complaints count chip | `d.complaints.length>0` → `b-red`, else `b-green` | | L4188 |

---

## 16. Cross-module links

| Direction | Target | Mechanism | Line |
|---|---|---|---|
| Out | **360° Profile** (`#p-profile`) | `openProfile(id)` from name cell and View 360° | L6390, L6396 |
| Out | **All Pending Applications** (`#p-all-pending`) | `go('all-pending',null)` footer button | L893 |
| Out | **Driver Wallets** (`wallets`) | `go('wallets',null)` — profile "Wallet" and "View in Wallets →" | L4111, L4174 |
| Out | **Support Center** | `openSupportTicket(null,id,name)` | L4113 |
| Out | **Fleet Compliance** | `DB.driverDocs` + `complianceScan()`; `openDocDateEditor()` writes back and calls `renderCompliancePage()` | L11050, L11064 |
| In | **Dashboard** | Two KPI tiles route here (Pending approvals, Active drivers) | L10374, L10376 |
| In | **Notifications** | `n.type==='approval'` → `go('drivers')` | L2274 |
| In | **Growth → Incentives** | Tier-recalculation toast/notification click | L13624–L13638 |
| In | **Applicant approval** | `approveDriver()` inserts into `DB.drivers` and `DB.driverDocs` | L11098–L11112 |
| Shared | **Live Map** | `d.mapPos` pins; `commitLiveReassign()` writes `t.driver` | L11794 |
| Shared | **Trip Readiness** | `finalizeReassign()` | L13119 |
| Shared | **Coverage & Capacity**, **Zones**, **Exports**, **Push segments** | All filter `DB.drivers` by `status!=='pending'` | L6903, L7448, L7612, L7678 |
| Shared | **Settings → Limits** | `driver_max_consecutive_declines`, `driver_min_rating_for_dispatch`, `driver_min_trips_for_subs`, `driver_max_active_subs`, `driver_min_rating` | L2583–L2592 |
| Shared | **Settings → Subscriptions** | `DB.opsConfig.allowMultiSubPerDriver` toggle (L8065) drives the profile card and table chip | L2569 |
| Shared | **Activity log** | Every audited action listed in §11 | L2898–L2909 |

---

## 17. Hardcoded / mock / demo values

| # | Value | Where | Line | Note |
|---|---|---|---|---|
| 1 | `+ Onboard driver` → `toast('Driver onboarding form would open here','info')` | page header | L888 | Explicit stub |
| 2 | Page subtitle placeholder `—` | `.ph-l p` | L888 | Replaced at runtime by `liveSubtitles()` |
| 3 | `subs.drivers = '24 active drivers'` | seed subtitle map | L2169 | Contradicts the 6 seeded drivers; the source comment at L21174 calls out exactly this class of bug. Overwritten by `refreshNavCounts()` to `6 active drivers` |
| 4 | `#pending-count` default text `3` | HTML | L891 | Real value is 5 |
| 5 | `subs['all-pending'] = '5 applications'` | seed | L2169 | Happens to match today, but static |
| 6 | Tier tile sub-labels `rating ≥4.7, 90d+`, `rating ≥4.3, 30d+`, `everyone else`, `below 3.5 rating` | `renderDriversTable` | L6366–L6368 | Literal strings, not derived from `computeDriverTier()`; they will silently drift if the thresholds change |
| 7 | `d.capacity` strings (`'Full'`, `'1 open'`, `'2 open'`, `'3 open'`) | seed data | L2632–L2667 | Never recomputed from `driverActiveSubCount()`; contradicts `stats.activeSubs` in places (e.g. DRV-0106 `capacity:'2 open'` vs `activeSubs:'0/2'` — consistent, but DRV-0101 `'1 open'` vs `'4/5'` also consistent by luck only) |
| 8 | `stats.*` (totalTrips, monthEarn, onTime, activeSubs) | seed data | L2638 etc. | Static; `driverCompletedTripsCount()` explicitly prefers them over real trip records (L4484) |
| 9 | `reviewDriver` amber box: `Flagged: Late 3× consecutive, on-time rate dropped to 88%.` | modal | L8998 | Same text for every driver |
| 10 | `sendDriverIncentive` four offers and their amounts | modal | L11194–L11199 | Not sourced from `DB.incentives` |
| 11 | `DB.incentives` INV-1…INV-4 rule/reward strings | seed | L13565–L13568 | Only INV-3's threshold is actually implemented (in `computeDriverTier`) |
| 12 | `approveDriver` new id `'DRV-0'+(106+floor(random()*90))` | L11099 | **Random, uncollision-checked** — can overwrite `DRV-0106` |
| 13 | `approveDriver` generated email `{name}.{dots}{0-89}@gmail.com` | L11100 | Fabricated |
| 14 | `approveDriver` `joined:'Jun 2026'` | L11101 | Hardcoded month, not derived from `REQ_NOW_REF` |
| 15 | `approveDriver` `decidedBy:'Sarah Al-Rashid'`, `decidedAt:'Just now'` | L11113 | Hardcoded actor — ignores `CURRENT_USER_ID` |
| 16 | `rejectDriver` same two fields | L11126 | idem |
| 17 | `EYVAR_TODAY = new Date(2026,5,25)` | L11235 | Dataset "today" |
| 18 | `AUD-0003` seed audit entry describing an `approve_driver` of `APP-2178 → DRV-0138` | L2869 | Demo history; neither id exists in `DB` |
| 19 | Notification `N4` "New driver application — Mona Al-Tamimi submitted documents" | L2769 | Demo |
| 20 | `zoomDoc()` preview: striped CSS gradient + caption `Simulated scan preview — full document viewer would render the uploaded file here.` | L10889 | Explicit simulation |
| 21 | `docCardHTML` thumbnail label `scan.jpg` | L7098 | Fake filename on every document |
| 22 | `AV_COLORS`, `PHOTO_GRADS` avatar palettes | L10834–L10835 | Deterministic on `name.length` |

---

## 18. i18n keys

Total `data-i18n` attributes in the file: **89**. Relevant to this module:

| Key | English | Arabic | Line |
|---|---|---|---|
| `sec.fleet` | Fleet | `الأسطول` | L511 / L7909 |
| `nav.drivers` | Drivers | `السائقون` | L512 / L7907 |
| `nav.riders` | Riders | `الركاب` | L513 / L7907 |
| `nav.compliance` | Compliance | `الامتثال` | L517 / L7908 |
| `nav.fairness` | Captain fairness | `إنصاف الكباتن` | L514 / L7910 |
| `nav.coverage` | Coverage & capacity | `التغطية والسعة` | L516 / L7908 |

**No `data-i18n` attribute exists anywhere inside `#p-drivers`, `#p-all-pending`, or `#p-applicant-detail`.** The file states this explicitly at L7900–L7902: *"every dynamically-built string — stays English-only; translating thousands of generated strings throughout this file is a genuinely separate, much larger project than this toggle can honestly cover."* Consequently every label documented above (KPI labels, table headers, badges, modal copy, toasts) is untranslatable.

`titles['drivers']='Drivers'` (L2168) and `subs['drivers']` (L2169) are **not** i18n-keyed either.

---

## 19. Gaps, dead code, UNVERIFIED items

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **`d.docStatus` is never written.** It is read in exactly two places — the `docs` table filter (L6380) and `fleetCounts().docsAtRisk` (L20925) — and assigned nowhere in 21,857 lines. The "Documents at risk" KPI is therefore permanently **0**, its "will auto-suspend on expiry" copy never shows, and clicking that tile always empties the table. The real expiry data lives in `DB.driverDocs` + `docDaysLeft()`/`docState()` (L13286–L13295) and is never bridged. | grep for `docStatus` returns only L6380, L20925, plus the unrelated `docStatusMeta` (L10847) | **High — broken KPI** |
| 2 | **No `DB.drivers` record ever has `.status`.** All six seeds omit it; `approveDriver()` (L11098) does not set it. So `status!=='pending'` (L6346) is a no-op filter, and `fleetCounts().drivers.pending` (L20930) is always **0**, while the amber pending card right above it shows 5. The two "pending" numbers on the same screen come from different sources and disagree. | L2632–L2667 vs L11098 | **High — contradictory KPI** |
| 3 | **Tier filter cannot be cleared.** `filterDriversByTier()` (L6339) assigns without toggling and no tile maps to `'all'`; `_driverTierFilter` is module-scope and survives navigation. Once a tier is picked the roster stays filtered for the session. | L6338–L6342 vs `setDriverFilter` L21219 which *does* toggle | **Medium — UX trap** |
| 4 | **`reviewDriver()` is a pure stub.** The selected action (`warning`/`suspend`/`reassign`/`clear`) is never read; Apply only closes and toasts. No permission gate, no audit entry, despite being labelled `danger` and offering "Temporary suspension". | L8995–L9003 | **High — action appears to work but doesn't** |
| 5 | **`sendDriverIncentive` / `confirmDriverIncentive` persist nothing.** No `DB.driverBonusLog` write, no audit entry, no permission gate — yet the profile's Earnings breakdown reads `DB.driverBonusLog` (L4168) and will always show `+0.00 SAR`. | L11191–L11215 vs L4168 | **High** |
| 6 | **`approveDriver` id generation can collide.** `'DRV-0'+(106+floor(random()*90))` yields `DRV-0106`…`DRV-0195` with no uniqueness check, and `DRV-0106` already exists (L2666). A collision silently overwrites a live driver record. | L11099 | **High** |
| 7 | **`finalizeReassign` compensation label lookup is wrong.** The map key is `'-20off'` (L13122) but the DOM `data-comp` value is `20off` (L13114). The pre-selected default therefore falls through `labels[comp]||comp` and logs/toasts the raw string `20off`. | L13113 vs L13122 | **Medium — wrong audit text** |
| 8 | **`finalizeReassign` has no permission gate**, unlike its sibling `commitLiveReassign` which requires `live_ops`. | L13119 vs L11795 | **Medium** |
| 9 | **`DRV-0106` has no `DB.driverDocs` entry**, so it is invisible to `complianceScan()` and can never be auto-suspended for an expired document. | L13279–L13283 | **Medium** |
| 10 | **Duplicate, conflicting rating limits.** `driver_min_rating_for_dispatch` (3.5★, `enforced:true`) and `driver_min_rating` (3.5★, `enforced:false`) both exist; the second has no hook and no `enforcedBy`. Editing it in Settings changes nothing. | L2585 vs L2591 | **Medium — misleading setting** |
| 11 | **`driver_max_active_subs` (5) is `enforced:false`** yet `stats.activeSubs` is displayed as `used/limit` in the table, implying enforcement. `DRV-0103` shows `6/6` — above the configured 5. | L2589, L2648, L6394 | **Medium** |
| 12 | **Tier tile sub-labels are literal strings** (`rating ≥4.7, 90d+` etc., L6366–L6368) duplicated from `computeDriverTier()` (L13597–L13599) with no shared constant. | | Low |
| 13 | **`filterDriversByTier(tier, chip)` — `chip` parameter unused.** | L6338 | Low (dead param) |
| 14 | **`viewDriver(name)` (L8994) is dead code** — `toast('Opening profile — '+name,'info')`, no caller anywhere in the file. | L8994 | Low |
| 15 | **`lvlBadge()` (L3260) is used only by `openProfile`** (L8842); the drivers table builds its own `lvlCls` inline (L6388) rather than calling it, so the two can drift. `lvlBadgeSm()` (L8901) is a third parallel implementation used by the payouts table (L8760). | | Low |
| 16 | **`toggleLowRatingFilter()` (L15345) is not on this page.** It is the All-Trips low-rating toggle. There is **no low-rating filter for the drivers roster** — the closest thing is the `limited` tier tile, which uses a different threshold (`<3.5` hardcoded, L6350) from `lowRatingThreshold()` (2.5, L15243). Two different "low rating" definitions coexist. | L6350 vs L15243 | **Medium — inconsistent threshold** |
| 17 | **`riderKpiHTML()` writes to `#rider-kpis`** but the Riders page declares `#rider-kpis-anchor` (L1352 region). Whether the anchor is renamed at runtime is **UNVERIFIED** — not confirmed within the lines read. | L21231 vs L1352 | UNVERIFIED |
| 18 | **`d.notifLog` card never renders on seed data** — all six drivers have `notifLog: []` and no code path in the lines read appends to a *driver's* `notifLog`. Whether `sendSystemEmail()` (L3578) writes it is **UNVERIFIED** (function body not read in full). | L2635 etc., L4143 | UNVERIFIED |
| 19 | **Pending footer condition mismatch**: footer shows when `DB.pendingDrivers.length > 3` (total incl. decided) while the list slices `open` applicants. With 4 decided + 2 open the footer would show under a 2-row list. | L10900–L10901 | Low |
| 20 | **`capacity` is never recomputed**; `driverActiveSubCount()` (L8157) exists and is used on the profile, but the table's Capacity column reads the static string. | L6395 vs L8157 | Medium |
| 21 | **Capacity colour logic**: `'—'` (missing capacity) renders **green**, reading as "has room" when the value is actually unknown. | L6395 | Low |
| 22 | **No sort and no search on the All-drivers table.** Order is `Object.keys` order; there is no column-header sort handler and no search input in `#p-drivers`. | L899–L905, L6384 | Low |
| 23 | **`_driverFilter` and `_driverTierFilter` are declared in two different regions** (L21218 and L6337) and mutate each other's rendering; `setDriverFilter` re-renders the supply KPIs, `filterDriversByTier` does not, so the supply tile highlight can go stale relative to the tier filter. | L21219–L21226 vs L6338–L6342 | Low |
| 24 | **`approveDriver` hardcodes the acting user** as `'Sarah Al-Rashid'` while `logAction()` correctly resolves `CURRENT_USER_ID` — the applicant record and the audit log can name two different people for the same decision. | L11113 vs L3134 | **Medium — audit integrity** |

---

## 20. Line-number index

### HTML
| Lines | Content |
|---|---|
| L511–L518 | Sidebar "Fleet" section (Drivers, Riders, Fairness, Commitment, Coverage, Compliance, Safety) |
| L512 | Sidebar Drivers item, `data-i18n="nav.drivers"` |
| L887–L906 | `div#p-drivers` |
| L888 | Page header, H1, subtitle placeholder, `+ Onboard driver` |
| L889 | `div#fleet-counts` |
| L890–L894 | Pending driver approvals card (`#pending-count`, `#pending-drivers-list`, `#pending-drivers-footer`) |
| L895 | `div#supply-kpis` |
| L896 | `div.g4#driver-tier-kpis` |
| L899–L905 | All drivers card, `table.dt`, `tbody#drivers-tbody` |
| L1324–L1341 | `div#p-all-pending` (doc 08b) |
| L1342–L1350 | `div#p-applicant-detail` (doc 08b) |

### Data
| Lines | Content |
|---|---|
| L2168 | `titles` map |
| L2169 | `subs` map (seed subtitles) |
| L2569 | `DB.opsConfig.allowMultiSubPerDriver = false` |
| L2571 | `DB.opsConfig.notifications` incl. `lowRatingThreshold: 2.5` |
| L2583–L2592 | `DB.opsLimits` (5 driver limits) |
| L2631–L2668 | `DB.drivers` (6 records) |
| L2669–L2678 | `DB.trips` |
| L2679–L2687 | `DB.subscriptions` |
| L2706–L2711 | `DB.complaints` |
| L2712–L2743 | `DB.pendingDrivers` (doc 08b) |
| L2793–L2809 | `DB.escrowHolds`, `DB.deductions`, `DB.payouts` |
| L2810–L2822 | `DB.circuits` |
| L2869 | Seed audit entry `AUD-0003` (`approve_driver`) |
| L2898–L2909 | `ACTION_LABELS` |
| L3226, L3245 | `approve_drivers` permission label + description |
| L10590–L10594 | `PAGE_PERMISSIONS.drivers` |
| L13277 | `DOC_TYPES` |
| L13278–L13284 | `DB.driverDocs` |
| L13565–L13568 | `DB.incentives` |
| L13579 | `TIER_RANK` |
| L7900–L7915 | `LANG_STRINGS.ar` |

### Functions
| Line | Function |
|---|---|
| L3122 | `can(permKey)` |
| L3126 | `requirePerm(permKey)` |
| L3133 | `logAction(...)` |
| L3260 | `lvlBadge(lvl)` |
| L3264 | `rstar(r)` |
| L3266 | `resolveId(raw)` |
| L3560 | `kvCard(title, rows)` |
| L3565 | `nm2(id)` |
| L3578 | `sendSystemEmail(...)` |
| L4083 | **`buildEntityProfile(d, isDrv)`** |
| L4474 | `getLimit(id)` |
| L4482 | `driverCompletedTripsCount(driverId)` |
| L4487 | `driverTrustedForSubs(driverId)` |
| L4494 | `driverSubTrustReason(driverId)` |
| L4501 | `driverAutoRestricted(driverId)` |
| L5872 | **`selDriver(el)`** |
| L6283 | `buildLocationHistoryCard(d)` |
| L6294 | `bankCardHTML(d, compact)` |
| L6336 | `driverOpenComplaints(id)` |
| L6337 | `var _driverTierFilter='all'` |
| L6338 | **`filterDriversByTier(tier, chip)`** |
| L6343 | **`renderDriversTable()`** (tier KPIs inline L6355–L6368) |
| L7006 | `pushHistory()` |
| L7012 | `goBack()` |
| L8157 | `driverActiveSubCount(driverId)` |
| L8160 | `driverCanTakeAnotherSub(driverId)` |
| L8774 | `window.go(id, el, isBack)` — dispatch L8791/L8793 |
| L8827 | `window.openProfile(id, isBack)` |
| L8894 | `setText(id,val)` / L8895 `ensurePayoutEntry` |
| L8901 | `lvlBadgeSm(lvl)` |
| L8994 | `viewDriver(name)` — dead |
| L8995 | **`reviewDriver(name)`** |
| L9010 | `openFlagAccountModal(entityId, isDrvStr)` |
| L9028 | `commitFlagAccount(...)` |
| L9044 | `commitUnflagAccount(...)` |
| L9058 | `openSuspendAccountModal(...)` |
| L9080 | `quickSuspendFromFraud(...)` |
| L9082 | `commitSuspendAccount(...)` |
| L9099 | `reinstateAccount(...)` |
| L9115 | `onDriverExceptionToggle(checkbox, driverId)` |
| L9130 | `commitDriverException(driverId, granted)` |
| L9139 | `onDriverTrustToggle(checkbox, driverId)` |
| L9147 | `priorityCall(name, context, entityId)` |
| L9392 | `refreshNavCounts()` |
| L10680 | `requirePagePerm(pageKey, permKey)` |
| L10836 | `avatarHTML(name, size, hasPhoto)` |
| L10847 | `docStatusMeta(statusText)` |
| L7092 | `window.docCardHTML(appId,key,statusText,note)` |
| L10883 | `zoomDoc(key)` |
| L11050 | `openDocDateEditor(driverId)` |
| L11064 | `saveDriverDocDates(driverId)` |
| L11094 | `approveDriver(id)` |
| L11122 | `rejectDriver(id)` |
| L11191 | `sendDriverIncentive(id)` |
| L11209 | `confirmDriverIncentive(driverId, driverName)` |
| L11789 | `reassignLiveDriver(id)` |
| L11794 | `commitLiveReassign(id, drvId)` |
| L13119 | `window.finalizeReassign(ustId)` |
| L13286 | `docDaysLeft(dateStr)` |
| L13290 | `docState(days)` |
| L13297 | `complianceScan()` |
| L13581 | `parseJoinedDate(s)` |
| L13588 | `driverTenureDays(d)` |
| L13595 | **`computeDriverTier(d)`** |
| L13602 | `recalcDriverTiers(silent)` |
| L13634 | `manualRecalcTiers()` |
| L14535 | `kpiScrollTo(elId)` |
| L15243 | `lowRatingThreshold()` |
| L15247 | `isLowRating(r)` |
| L15251 | `ratingCell(r)` |
| L15342 | `lowRatedTripIds()` |
| L15345 | **`toggleLowRatingFilter()`** |
| L20918 | **`fleetCounts()`** |
| L20944 | **`fleetCountsHTML()`** |
| L20985 | `toggleFleetCounts()` |
| L21152 | **`renderFleetCounts()`** |
| L21186 | `supplyKpiHTML()` |
| L21213 | `riderKpiHTML()` |
| L21218 | `var _driverFilter='all'` |
| L21219 | `setDriverFilter(f)` |
| L21228 | **`renderSupplyKpis()`** |
| L21232 | `liveSubtitles()` |

---

## 21. Dead code: `renderDriverCircuit` / `DB.circuits` (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6, §8, item P0-1). §4 of this document lists `DB.circuits` in the data-model table **without flagging that its only consumer is unreachable**. That row is left as it stands; this section supplies the missing verdict.

### 21.1 Verdict

**`renderDriverCircuit(driverId)` (L6313–L6333) is unreachable dead code, and `DB.circuits` (seeded L2817–L2829) is an orphaned collection with no reachable consumer.** Neither the function nor the data can affect anything a user sees.

This was re-verified independently for this remediation, and the finding is **stronger than Pass 1 reported** — see §21.4 for the correction.

### 21.2 Evidence

Three independent greps over the whole 21,857-line source, each returning its complete result set:

**(a) `renderDriverCircuit` — 2 occurrences, both inside the feature itself:**

| Line | Occurrence |
|---:|---|
| **L6313** | `function renderDriverCircuit(driverId){` — the declaration |
| **L6322** | `…customSelectHTML('csel-circuit-driver','circuit-driver-select',opts,driverId,'Select a driver…',"renderDriverCircuit(document.getElementById('circuit-driver-select').value)")` — the `onChangeExpr` string passed to `customSelectHTML`, i.e. **the function naming itself inside its own body** |

There is **no external call site anywhere**: not in `go()` (L8780–L8826), not in any `boot*` function, not in an `onclick`, not in `buildEntityProfile` (L4083–L4189, see §13).

**(b) `circuit-driver-select-wrap` — 1 occurrence in the entire file:**

| Line | Occurrence |
|---:|---|
| **L6316** | `var wrap=document.getElementById('circuit-driver-select-wrap');` |

The lookup exists; **the element does not**. No `id="circuit-driver-select-wrap"` appears in any of the 41 `.page` divs, in any modal template, or in any `innerHTML` string.

**(c) `circuit-riders-list` — also exactly 1 occurrence in the entire file:**

| Line | Occurrence |
|---:|---|
| **L6324** | `var lbl=document.getElementById('circuit-riders-list');` |

Same result: the lookup exists, the element does not.

**(d) `DB.circuits` — 3 occurrences total:**

| Line | Occurrence |
|---:|---|
| **L2817–L2829** | the seed literal — `circuits:{ 'DRV-0101':[…4 stops…], 'DRV-0103':[…3 stops…] }` |
| **L6315** | `var stops=DB.circuits[driverId]||[];` — inside `renderDriverCircuit` |
| **L6318** | `Object.keys(DB.circuits).map(…)` — inside `renderDriverCircuit` |

Both reads are inside the unreachable function. Nothing else in the file — no KPI, no table, no export, no profile card, no audit entry — touches the collection.

### 21.3 Why it can never do anything, line by line

```js
function renderDriverCircuit(driverId){          /* L6313 — never called from outside */
  var d=DB.drivers[driverId];                    /* L6314 */
  var stops=DB.circuits[driverId]||[];           /* L6315 */
  var wrap=document.getElementById('circuit-driver-select-wrap');  /* L6316 — always null */
  if(wrap){                                      /* L6317 — never entered */
    …                                            /* L6318–L6322 driver picker, never built */
  }
  var lbl=document.getElementById('circuit-riders-list');          /* L6324 — always null */
  if(!lbl)return;                                /* L6325 — ALWAYS returns here */
  …                                              /* L6326–L6332 unreachable */
}
```

Two independent reasons, either one sufficient:

1. **No entry point.** The only reference to the name outside the declaration is the self-referential `onChangeExpr` string at L6322 — and that string is only ever *evaluated* (via `new Function(onChangeExpr)` in `cselPick`, L5411) if the widget at L6322 was rendered, which requires L6317 to have been entered, which requires the function to already be running. The feature can only be started by itself.
2. **No mount points.** Even if something did call it, `#circuit-driver-select-wrap` is missing so the picker at L6318–L6322 is skipped, and `#circuit-riders-list` is missing so **L6325 returns unconditionally** before any of the rendering at L6326–L6332 executes.

**Collateral dead CSS.** The five class names the unreachable branch emits are defined once each and used nowhere else in the file:

| Class | CSS | Only emitter |
|---|---|---|
| `.dc-slot` (+ `:hover`) | L171, L172 | L6331 |
| `.dc-dot` | L173 | L6331 |
| `.dc-done` / `.dc-active` / `.dc-late` / `.dc-pending` | L174 | L6328 (chosen), L6331 (emitted) |
| `.dc-time` | L175 | L6331 |
| `.dc-name` | L176 | L6331 |
| `.dc-km` | L177 | L6331 |

So the dead surface is **21 lines of JS (L6313–L6333) + 13 rows of seed data (L2817–L2829) + 7 CSS rules (L171–L177)**.

### 21.4 How the function actually exits

- **L6317 is `if(wrap){` — a guard, not a return.** It skips the driver-picker block; it does not exit the function.
- **The unconditional early return is L6325** (`if(!lbl)return;`), reached because `#circuit-riders-list` is absent.
- **Both** mount points are missing, not one: `circuit-driver-select-wrap` and `circuit-riders-list`. Restoring the picker container alone would still render nothing.
- `DB.circuits` carries **3** references: the seed, L6315 and L6318.

Dead code over an orphaned collection.

### 21.5 What the feature was evidently meant to do

The intent is legible from the data shape and the render code, both of which are complete and internally consistent — this is an abandoned feature, not a stub.

**Data contract** (`DB.circuits[driverId]` → array of stop objects, L2818–L2828):

| Field | Type | Seeded values |
|---|---|---|
| `time` | `'HH:MM'` string | `'06:15'`, `'07:00'`, `'07:45'`, `'08:30'` (DRV-0101); `'06:30'`, `'07:15'`, `'08:00'` (DRV-0103) |
| `rider` | rider id | `RDR-1080`, `RDR-1041`, `RDR-2055`, `RDR-1075` (DRV-0101); `RDR-1060`, `RDR-1090`, `RDR-1052` (DRV-0103) |
| `km` | display string | `'8.2 km'`, `'6.5 km'`, `'11.0 km'`, `'9.3 km'`, `'7.1 km'`, `'5.4 km'`, `'9.8 km'` |
| `status` | display string | `'Done'`, `'Active'`, `'+8 min'`, `'Pending'` |

Only **2 of the 6 seeded drivers** have a circuit — `DRV-0101` (4 stops, L2818–L2823) and `DRV-0103` (3 stops, L2824–L2828). `DRV-0102`, `DRV-0104`, `DRV-0105` and `DRV-0106` have none, and L6326 has the matching empty state: *"No circuit data for this driver today."*

**Evident purpose: a driver's shared-ride "circuit" for the day** — the ordered chain of subscription pickups one driver runs in a single morning, with per-stop lateness. Concretely the screen would have been:

1. A **driver chooser** at the top (`customSelectHTML('csel-circuit-driver','circuit-driver-select', …)`, L6322) listing only drivers that *have* a circuit (`Object.keys(DB.circuits)`, L6318), labelled `<name> · <type> · <Tier> ★<rating>` (L6320). Picking one re-invokes the renderer with the new id (the `onChangeExpr` at L6322).
2. A **timeline of stops** (L6327–L6332), one `.dc-slot` row each: a coloured status dot, the pickup time, the rider's resolved name via `nm2(s.rider)` (L6330), the leg distance, and a status badge. Each row is `cursor:pointer` and opens the rider's 360° profile — `onclick="openProfile('<riderId>')"` (L6331).

**The status vocabulary is a four-state lateness model** (L6328 chooses the dot class, L6329 the badge class):

| `status` value | Dot class | Dot colour | Badge class | Meaning |
|---|---|---|---|---|
| `'Done'` | `dc-done` | `var(--ghost)` grey | `b-grey` | stop completed |
| `'Active'` | `dc-active` | `#3B6D11` green | `b-blue` | driver is on this leg now |
| anything containing `'min'` (e.g. `'+8 min'`) | `dc-late` | `var(--red)` red | `b-red` | running late by that many minutes |
| anything else (e.g. `'Pending'`) | `dc-pending` | `var(--border2)` | `b-grey` | not started |

Note the lateness test is `s.status.indexOf('min')>=0` — a **substring match on a display string**, not a numeric field. The delay is encoded in prose (`'+8 min'`) rather than as data, so nothing could have aggregated or thresholded it.

**Where it belongs, and why it is redundant.** The living panel answers the same operational question through three shipped features, all of which post-date this one in evident design terms because they read live `DB` state rather than a static per-driver array:

- **Trip Readiness** (`07b-trip-readiness.md`) — per-upcoming-trip lateness and driver assignment, computed from `DB.upcomingSubTrips`.
- **Live Map** (`04-live-map.md`) — where the driver is now, and `driverLiveState()` (L7283) for busy/free.
- The driver's own **360° profile** (§13 of this document, `buildEntityProfile` L4083–L4189) — trip history per driver.

`DB.circuits` duplicates a slice of that in a frozen, hand-written form. Restoring it would mean re-deriving the stop list from `DB.upcomingSubTrips` rather than reviving the seed.

### 21.6 Recommendation

Either delete all three fragments together (L2817–L2829, L6313–L6333, L171–L177), or restore both mount points **and** add a real call site. Deleting the function while leaving `DB.circuits` seeded, or vice versa, would reproduce exactly the orphan this section documents. Any future coverage audit should treat `DB.circuits` as **covered-but-dead**, not as a live collection.

### 21.7 Line-number index for §21

| Symbol | Lines |
|---|---|
| `.dc-*` CSS (7 rules, all dead) | 171–177 |
| `DB.circuits` seed | 2817–2829 |
| — `DRV-0101` stops (4) | 2818–2823 |
| — `DRV-0103` stops (3) | 2824–2828 |
| **`renderDriverCircuit()`** (dead) | **6313–6333** |
| `DB.circuits` read (stops) | 6315 |
| `#circuit-driver-select-wrap` lookup — element absent | 6316 |
| driver-picker branch (never entered) | 6317–6323 |
| `DB.circuits` read (`Object.keys`) | 6318 |
| self-referential `onChangeExpr` | 6322 |
| `#circuit-riders-list` lookup — element absent | 6324 |
| **unconditional early return** | **6325** |
| empty state string | 6326 |
| stop-row template | 6327–6332 |
| `cselPick` `new Function(onChangeExpr)` evaluator | 5411 |
