# Settings Tab: Matching & Dispatch

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` | Pane `#stab-dispatch` (L1552–L1619) | Tab button L1426 (`switchSettingsTab('dispatch',this)`, label `Matching & Dispatch`) | Render fns `renderOpsRadiusConfig()` L8036–L8045, `renderSearchPhasesTable()` L8087–L8095, `renderPlanVisibility()` L8121–L8126 | Commit fns `saveOpsRadiusConfig()` L8073–L8086, `saveSearchPhases()` L8115–L8120, `commitMultiSubChange()` L8064–L8072, `savePlanVisibility()` L8128–L8136

> ⚠ **`renderDispatchSettings()` (L17408–L17423) does NOT belong to this pane.** Despite the name, it fills `#dispatch-tbody`, which lives inside the **Reason Codes & SLA** pane (L1818). Its six emergency-dispatch parameters are documented in `15k-settings-reason-codes-sla.md` §4.5 and cross-referenced in §3.6 below.

---

## 1. Purpose

Every parameter that decides **which driver a request is offered to**. Panel description (L1556, verbatim):

> *"Grouped by trip type — Quick Rides and Subscriptions are matched differently, so their settings live together instead of split across unrelated cards. Both are sorted by estimated arrival time within radius, not straight-line distance."*

Four independent concerns in five cards: Quick Ride radius + the search-phase ladder, the multi-subscription policy, the Subscription radius, and the plan-visibility coverage rule.

---

## 2. Layout map

| Card | Heading | Line(s) | Contents |
|------|---------|---------|----------|
| 1 | Panel head 📍 `Matching & dispatch` | L1553–L1558 | Description only, no controls |
| 2 | `🚕 Quick Rides` + sub-caption `Live, second-by-second dispatch` | L1560–L1579 | Starting radius (L1563), auto-expand checkbox (L1565), `Save Quick Ride radius` (L1568), search-phase section label (L1570), phases table (L1571), add-phase form (L1572–L1576), `Save search phases` (L1577), `.settings-meta#meta-ops-radius` (L1578) |
| 3 | `👥 Multi-subscription policy` | L1581–L1591 | `.tog` toggle `#cfg-multi-sub` (L1585), explanation (L1588), `.settings-meta#meta-multi-sub` (L1590). **No save button — the toggle commits itself.** |
| 4 | `📦 Subscriptions` + sub-caption `Assigned once per cycle, not re-searched every second` | L1593–L1601 | Max radius (L1596), note (L1597), `Save Subscription radius` (L1598), `.settings-meta#meta-phases` (L1600) |
| 5 | `👁️ Plan visibility` + sub-caption `Uses the Subscription radius above to check live coverage` | L1603–L1618 | Cross-link to the Plans page (L1605), two radio cards (L1607–L1614), `Save plan visibility rule` (L1615), `.settings-meta#meta-plan-visibility` (L1617) |

**Meta-footer id mismatch (real bug):** `#meta-ops-radius` sits in the **Quick Rides** card while `#meta-phases` sits in the **Subscriptions** card (L1578, L1600) — but `saveSearchPhases()` logs to entity `phases` (L8117) and `saveOpsRadiusConfig()` logs to entity `ops-radius` (L8082). The result: adding a search phase updates the "Last updated" line under the *Subscriptions* card, and changing either radius updates the line under the *Quick Rides* card. The two footers are swapped relative to their cards.

---

## 3. Settings fields — EVERY field

### 3.1 Quick Ride matching

| # | id | Label | Control | Default | Unit | Range | Validation | Persisted to | Affects |
|---|----|-------|---------|---------|------|-------|------------|--------------|---------|
| 1 | `cfg-quick-radius` | `Starting max radius (km)` (L1563) | `input type="number"` `min="1" max="50" step="0.5"`, **hardcoded `value="6"` in the markup** | `6` (seed L2568) | km | HTML 1–50 step 0.5; JS clamps 1–50 | `Math.min(50, Math.max(1, parseFloat(q.value) \|\| 6))` (L8076). Clamped value **is** written back to the input (L8081). | `DB.opsConfig.quickRideRadiusKm` | `nearestAvailableDrivers(..., kind!=='sub')` base radius (L8175) → every quick-ride offer |
| 2 | `cfg-auto-expand` | `Auto-expand beyond the radius as a last resort if still no driver (avoids "no drivers available" when one exists further out)` (L1566) | checkbox, **hardcoded `checked` in markup** | `true` (seed L2568) | — | on/off | none | `DB.opsConfig.autoExpandRadius` | Progressive-widening fallback in `nearestAvailableDrivers` (L8199–L8201); also gates `isPlanVisibleForRider` via `expandedBeyondRadius` (L8145) |

### 3.2 Search phases (the radius ladder)

| # | id | Label | Control | Default | Unit | Range | Validation | Persisted to |
|---|----|-------|---------|---------|------|-------|------------|--------------|
| 3 | `new-phase-sec` | `After (seconds)` (L1573) | `input type="number"` `min="0" step="1"` | *(blank)* | seconds | `>= 0` integer | `sec=parseInt(...)`; rejected if `isNaN(sec) \|\| sec<0` (L8100) | `DB.searchPhases[].afterSec` |
| 4 | `new-phase-mult` | `Radius multiplier (×)` (L1574) | `input type="number"` `min="1" step="0.1"` | *(blank)* | × (multiplier) | `>= 1` | `mult=parseFloat(...)`; rejected if `isNaN(mult) \|\| mult<1` (L8100) | `DB.searchPhases[].multiplier` |

Combined failure toast: `⚠ Enter a valid second (≥0) and multiplier (≥1)` (L8100). **No duplicate-`afterSec` check and no upper bound on either value.**

### 3.3 Multi-subscription policy

| # | id | Label | Control | Default | Persisted to | Affects |
|---|----|-------|---------|---------|--------------|---------|
| 5 | `cfg-multi-sub` | `Allow drivers to hold multiple active subscriptions` (L1586) | `.tog` toggle checkbox with `onchange="onMultiSubToggle(this)"` (L1585) — **commits immediately, no Save button** | `false` (seed L2569, comment: *"general setting: can a driver hold more than one active subscription at once? Closed by default."*) | `DB.opsConfig.allowMultiSubPerDriver` | `driverCanTakeAnotherSub()` L8160 → subscription matching, driver picker, driver profile card |

Explanatory copy (L1588, verbatim): *"When enabled — any driver can receive a new subscription regardless of how many they already have. When disabled — new subscriptions go only to drivers with zero active subscriptions ('new' drivers), unless a driver has a personal exception (set on their own profile)."*

### 3.4 Subscription matching

| # | id | Label | Control | Default | Unit | Range | Validation | Persisted to | Affects |
|---|----|-------|---------|---------|------|-------|------------|--------------|---------|
| 6 | `cfg-sub-radius` | `Max radius (km)` (L1596) | `input type="number"` `min="1" max="50" step="0.5"`, **hardcoded `value="8"`** | `8` (seed L2568) | km | HTML 1–50 step 0.5; JS clamps 1–50 | `Math.min(50, Math.max(1, parseFloat(s.value) \|\| 8))` (L8077); written back (L8081) | `DB.opsConfig.subRadiusKm` | `nearestAvailableDrivers(..., kind==='sub')` base radius (L8175); also the radius the plan-visibility coverage check uses |

Note under the field (L1597, verbatim): *"No search-phase widening here — subscription trips are assigned once at creation/renewal, not re-offered second by second like Quick Rides, so a single fixed radius is enough. Applies to 'Find replacement / Nearby drivers' tools too."*

### 3.5 Plan visibility

| # | id | Label | Control | Value | Default | Persisted to | Affects |
|---|----|-------|---------|-------|---------|--------------|---------|
| 7 | `plan-vis-radio-a` | `Always show all active plans` (L1609) — sub-copy: *"A rider can subscribe even with no driver nearby right now — they start once coverage catches up. Safer default for growing cities."* | `input type="radio" name="plan-vis"` | `"false"` | **selected** (`hideIfNoCoverage:false`, seed L2575) | `DB.opsConfig.planVisibility.hideIfNoCoverage = false` | `isPlanVisibleForRider()` returns `true` unconditionally (L8143) |
| 8 | `plan-vis-radio-b` | `Hide plans with no nearby driver coverage` (L1613) — sub-copy: *"Checks live driver availability within the subscription radius above before offering a plan — prevents a rider from paying for something that can't start."* | `input type="radio" name="plan-vis"` | `"true"` | not selected | `DB.opsConfig.planVisibility.hideIfNoCoverage = true` | Runs a live `nearestAvailableDrivers(riderId,1,'sub')` check (L8144) |

The two radio labels carry an `onclick` that force-sets the matching radio (L1607, L1611) — a redundancy so clicking anywhere on the bordered card selects it.

### 3.6 Parameters that are NOT on this pane despite the name

`renderDispatchSettings()` (L17408) writes six numeric fields into `#dispatch-tbody`, which is markup inside `#stab-reasons` (L1818), under the heading `🚨 Emergency dispatch`. They persist to `DB.commitPolicy` and save via `saveCommitPolicy()` (L17117). Listed here for completeness — full documentation in `15k` §4.5:

| Key | Label (L17412–L17417) | Sub-label | Seed (L16541–L16560) | Unit |
|-----|-----------------------|-----------|----------------------|------|
| `emergencyMultiplierPct` | `Emergency replacement pay (% of leg)` | `Short-notice premium, above the standing backup rate` | *(not in the `DB.commitPolicy` seed — see `15k` §11)* | % |
| `dispatchWindowSec` | `Acceptance window (seconds)` | `Then it escalates to the next nearest` | *(not in the seed)* | seconds |
| `dispatchMaxCandidates` | `Captains to try` | `Before escalating to manual sourcing` | *(not in the seed)* | count |
| `riderCompPctPer10Min` | `Rider compensation per 10 min delay (%)` | `Scaled to the delay actually suffered` | *(not in the seed)* | % |
| `riderCompCapPct` | `Compensation cap (% of leg)` | — | *(not in the seed)* | % |
| `riderCompMinSAR` | `Minimum compensation (SAR)` | `A short delay is still a delay` | *(not in the seed)* | SAR |

---

## 4. Tables & lists

### Search phases table — `renderSearchPhasesTable()` L8087–L8095

**Header (L1571):** `After (seconds)` | `Radius multiplier` | *(blank — actions)*
**Row source:** `DB.searchPhases`, **sorted ascending by `afterSec`** on every render (`.slice().sort((a,b)=>a.afterSec-b.afterSec)`, L8090). The underlying array is *not* re-sorted — only the display copy.

| Column | Cell content | Line |
|--------|--------------|------|
| After (seconds) | `p.afterSec + 's'` — **read-only text, not an input** | L8092 |
| Radius multiplier | `'×' + p.multiplier` — **read-only text** | L8092 |
| *(actions)* | `Remove` (`btn sm danger`) → `removeSearchPhase(p.id)` — **rendered only when `phases.length > 1`** | L8093 |

**Row identity:** `<tr data-phase-id="<p.id>">` (L8092). The attribute is set but never read back — unlike the limits and cancellation tables, phases have no in-row editing.

**Empty state (L8094, verbatim):** `No phases — radius stays fixed the whole search.` (colspan 3, centred, `var(--ghost)`)

**Add flow:** the form at L1572–L1576 (`#new-phase-sec`, `#new-phase-mult`, `+ Add phase`) → `addSearchPhase()` (L8096–L8107). Generates `id = 'phase_' + Date.now()`, pushes, logs, clears both inputs, re-renders, toasts `✅ Phase added`.
**Edit flow: none.** A phase cannot be edited — only removed and re-added.
**Delete flow:** `removeSearchPhase(id)` (L8108–L8114) filters the array, logs, re-renders, toasts `Phase removed` (info). **Confirm-gated** — `GATE_SWEEP.removeSearchPhase` (L20821, `d:true`), installed by `installGateSweep()` (L20903). The last remaining phase cannot be removed because its `Remove` button is not rendered.

### Seeded search phases — the full ladder (L13925–L13929)

Preceded by the comment at L13921–L13924: *"Quick-ride dispatch search phases — how far the radius set in Matching & Dispatch is multiplied by, the longer a request has been searching with no accepted driver. Sorted and applied by tickEngine via nextOfferCandidate → nearestAvailableDrivers."*

| id | After (sec) | Multiplier | Effective radius at the default 6 km | Criteria applied at this phase |
|----|-------------|-----------|--------------------------------------|--------------------------------|
| `phase_1` | `0` | `×1` | **6.0 km** | Same for every phase — the multiplier is the *only* thing that changes. Candidate filter (L8177–L8183): driver must have `mapPos`, must not be `suspended`, must not be `driverAutoRestricted()`; ranked by `live.busy` (idle first) then `eta` ascending. `nextOfferCandidate` additionally excludes drivers who already declined this request and any driver currently offered a *different* request (L12497–L12503). |
| `phase_2` | `8` | `×1.5` | **9.0 km** | identical |
| `phase_3` | `18` | `×3` | **18.0 km** | identical |

**There are exactly 3 seeded phases and no per-phase "wait" or per-phase criteria field** — `afterSec` *is* the wait, and the criteria are global. The tab description's promise of phases is fully expressed by these two numbers per row.

---

## 5. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|-------------|-----------|-----------|-------|-----------|
| `Save Quick Ride radius` | L1568 | `saveOpsRadiusConfig()` L8073–L8086 | Reads **both** radius fields + auto-expand, clamps, writes all three, writes clamped values back to the inputs, logs, `renderSettingsMeta()`, toast `✅ Radius settings saved — applies to new matches immediately` | `DB.opsConfig.quickRideRadiusKm`, `.subRadiusKm`, `.autoExpandRadius` | `requirePerm('manage_settings')` L8074 | **yes** — `logAction('config_updated','settings','ops-radius','Matching radius updated — quick rides <q> km, subscriptions <s> km, auto-expand <on\|off>', before, {…})` L8082 | **yes** — `GATE_SWEEP.saveOpsRadiusConfig` L20777, `d:true` |
| `Save Subscription radius` | L1598 | `saveOpsRadiusConfig()` — **the identical function** | Same as above | same | same | same | **yes** — same gate, `GATE_SWEEP.saveOpsRadiusConfig` L20777 |
| `+ Add phase` | L1575 | `addSearchPhase()` L8096–L8107 | Validates, pushes `{id:'phase_'+Date.now(), afterSec, multiplier}`, logs, clears inputs, re-renders, toast `✅ Phase added` | `DB.searchPhases` (push) | `requirePerm('manage_settings')` L8097 | **yes** — `logAction('config_updated','settings','phases','Added search phase: after <s>s → ×<m> radius',{},{afterSec,multiplier})` L8103 | **yes** — `GATE_SWEEP.addSearchPhase` L20820 |
| `Remove` (per phase row) | L8093 | `removeSearchPhase(id)` L8108–L8114 | Filters the array, logs, re-renders, toast `Phase removed` | `DB.searchPhases` (filter) | `requirePerm('manage_settings')` L8109 | **yes** — `logAction('config_updated','settings','phases','Removed a search phase',{},{})` L8111 — **note: does not record which phase** | **yes** — `GATE_SWEEP.removeSearchPhase` L20821, `d:true` |
| `Save search phases` | L1577 | `saveSearchPhases()` L8115–L8120 | **Writes nothing.** Logs a confirmation entry and toasts `✅ Search phases saved — applies to new ride requests immediately` | *(nothing — adds/removes already committed)* | `requirePerm('manage_settings')` L8116 | **yes** — `logAction('config_updated','settings','phases','Search phases confirmed — <n> phase(s) active',{},DB.searchPhases)` L8117 | **yes** — `GATE_SWEEP.saveSearchPhases` L20801, `d:true` |
| Multi-sub toggle **ON** | L1585 | `onMultiSubToggle(cb)` L8049–L8063 → `commitMultiSubChange(true)` L8064–L8072 | **Applies immediately, no confirmation.** Sets the flag, syncs the checkbox, logs, `renderSettingsMeta()`, `renderDriversTable()` if present, toast `✅ Multi-subscription enabled — applies to new requests immediately` | `DB.opsConfig.allowMultiSubPerDriver` | `requirePerm('manage_settings')` L8050 — on denial the checkbox is **reverted** (`checkbox.checked=!checkbox.checked`) | **yes** L8068 | **no** |
| Multi-sub toggle **OFF** | L1585 | `onMultiSubToggle(cb)` → confirmation modal → `commitMultiSubChange(false)` | Reverts the checkbox visually, opens a confirm modal; on `Disable` closes the modal then commits | same | same | **yes** L8068 | **yes** — see §6.1 |
| `Save plan visibility rule` | L1615 | `savePlanVisibility()` L8128–L8136 | Reads `#plan-vis-radio-b.checked`, writes it, logs, `renderSettingsMeta()`, toast `✅ Plan visibility rule saved` | `DB.opsConfig.planVisibility.hideIfNoCoverage` | `requirePerm('manage_settings')` L8129 | **yes** — `logAction('config_updated','settings','plan-visibility','Plan visibility rule set to: <hide plans with no nearby coverage \| always show all active plans>', before, {hideIfNoCoverage})` L8133 | **yes** — `GATE_SWEEP.savePlanVisibility` L20807 |
| `Plans page` link | L1605 | `go('plans', findSbEl('plans'))` | Navigates away | none | none | no | no |

**Both radius buttons run the same function.** Pressing "Save Quick Ride radius" also commits whatever is currently typed in the Subscription radius field, and vice versa. The audit summary always names both values.

---

## 6. Modals opened (full field list)

### 6.1 `Disable multi-subscription?` — built inline in `onMultiSubToggle()` L8053–L8061

Opened **only when turning the toggle OFF**. The comment at L8046–L8048 explains: *"Multi-subscription policy — Enable applies immediately (no confirmation, matches the flow spec exactly). Disable shows a confirmation first since it changes matching behavior for every driver who currently has an active subscription."*

- **Title:** `Disable multi-subscription?` (L8054)
- **Close:** `✕` → `closeModal()`
- **Fields:** none — a single amber callout box (L8056, verbatim): *"New subscriptions will only go to new drivers (zero active subscriptions). Drivers with a personal exception are not affected. Existing subscriptions are never touched."*
- **Footer buttons (L8058):**
  - `Cancel` (`btn sm`) → `closeModal()` — the toggle stays **on** because it was already reverted at L8053
  - `Disable` (`btn sm danger`) → `closeModal(); commitMultiSubChange(false)`

No other modal is opened from this pane.

---

## 7. Rules / policy logic — written out exactly

### 7.1 `currentRadiusMultiplier(elapsedSec)` — the phase ladder (L8147–L8152)
```
phases = DB.searchPhases.slice().sort((a,b) => a.afterSec - b.afterSec)
mult = 1
phases.forEach(p => { if ((elapsedSec || 0) >= p.afterSec) mult = p.multiplier })
return mult
```
Last-match-wins over a sorted list, so the multiplier is that of the **highest** `afterSec` already passed. With the seed: 0–7 s → ×1, 8–17 s → ×1.5, 18 s+ → ×3. A missing `phase_1` at 0 s would still default to `mult = 1`.

### 7.2 `nearestAvailableDrivers(riderId, limit, kind, elapsedSec)` — the matcher (L8167–L8204)
```
r = DB.riders[riderId];  if (!r || !r.mapPos) return []

if (!isCityActive(r.city)) {                    // Cities & Regions gate — see 15g
    blocked = []; blocked.cityInactive = true; blocked.riderCity = r.city;
    return blocked
}

baseKm = (kind === 'sub') ? (cfg.subRadiusKm || 8) : (cfg.quickRideRadiusKm || 6)
maxKm  = (kind === 'sub') ? baseKm                 : baseKm * currentRadiusMultiplier(elapsedSec)
                                                   // ← subscriptions never widen

list = every driver, dropping any with: no mapPos | d.suspended | driverAutoRestricted(id)
       and, when kind==='sub', any failing driverCanTakeAnotherSub(id)
     mapped to {id, d, km: geoDistanceKm(r.mapPos,d.mapPos), eta: estimateEtaMin(km, d.address, r.address), live: driverLiveState(id)}

list.sort((a,b) => a.live.busy !== b.live.busy ? (a.live.busy ? 1 : -1)   // idle drivers first
                                               : a.eta - b.eta)          // then soonest ETA

within      = list.filter(x => x.km <= maxKm)
outOfRadius = (within.length === 0 && list.length > 0)
if (outOfRadius && cfg.autoExpandRadius !== false) within = list          // progressive widening

out = within.slice(0, limit || 5)
out.expandedBeyondRadius = outOfRadius && cfg.autoExpandRadius !== false
out.matchRadiusKm        = maxKm
return out
```
Source comment L8186–L8190 states the ranking rationale verbatim: *"Ranked by estimated arrival time (road-adjusted), not straight-line distance — two drivers at the same km can have different real ETAs once road circuity + local congestion are factored in. Straight-line km is still used for the radius cutoff below since that's a spatial search-area concept, same as most dispatch systems."*

Note the auto-expand fallback is **all-or-nothing**: when it fires, the radius cap is dropped entirely (`within = list`), not widened by a step.

### 7.3 `driverCanTakeAnotherSub(driverId)` — the multi-sub rule (L8160–L8166)
```
d = DB.drivers[driverId];  if (!d) return false
if (DB.opsConfig.allowMultiSubPerDriver) return true    // general setting open → no restriction
if (d.multiSubException)                 return true    // per-driver exception overrides the closed setting
return driverActiveSubCount(driverId) === 0             // closed + no exception → new drivers only
```
`driverActiveSubCount` (L8157) counts `DB.subscriptions` entries with `s.driver === driverId && s.status === 'Active'` — **exactly the string `'Active'`**, so `'Expiring'` subscriptions do not count against a driver.

Precedence is explicit: **general setting → per-driver exception → zero-subs test.**

### 7.4 `isPlanVisibleForRider(riderId)` (L8141–L8146)
```
cfg = DB.opsConfig.planVisibility
if (!cfg || !cfg.hideIfNoCoverage) return true                    // rule off → always visible
nearby = nearestAvailableDrivers(riderId, 1, 'sub')               // note: no elapsedSec → no widening
return nearby.length > 0 && !nearby.expandedBeyondRadius
```
Comment L8137–L8140: *"Real coverage check: does this rider have at least one available driver within the subscription-matching radius right now? Reuses the same nearestAvailableDrivers engine driving live dispatch, so this reflects true current supply, not a guess."*

The `!nearby.expandedBeyondRadius` clause makes the check **strict**: a driver found only by the auto-expand fallback does *not* count as coverage, even though a real quick-ride offer would go to them.

### 7.5 Where the phase ladder actually runs — `nextOfferCandidate(r)` (L12496–L12506)
```
declined         = r.declinedBy || []
offeredElsewhere = every other ride request with status 'offered' → its offeredTo
exclude          = declined.concat(offeredElsewhere)

wParts     = (r.waiting || '0:00').split(':')
elapsedSec = minutes*60 + seconds                       // parsed from the request's own waiting clock
effectiveElapsed = r.vip ? 999 : elapsedSec             // VIP: max radius immediately

pool = nearestAvailableDrivers(r.rider, exclude.length + 6, 'quick', effectiveElapsed)
         .filter(n => !n.live.busy && exclude.indexOf(n.id) < 0)

if (!r.vip) return pool[0]                                                       // nearest-ETA idle driver
return pool.sort((a,b) => (b.d.rating||0) - (a.d.rating||0) || a.km - b.km)[0]   // VIP: best-rated first
```
`effectiveElapsed = 999` for VIP requests means `currentRadiusMultiplier(999)` returns the **highest** configured multiplier immediately (×3 with the seed) — comment at L12502: *"VIP: search at max radius immediately instead of waiting through the normal expansion phases."*

`nextOfferCandidate` is driven by `tickEngine()` (L12508), the panel's per-second simulation loop.

### 7.6 Radius notice surfaced to operators (L8374)
The driver-picker UI renders one of three banners from the `nearestAvailableDrivers` return:
- `cityInactive` → red: `⛔ Eyvar isn't live in <city> yet — turn it on in Settings → Cities & Regions to allow matching there.`
- `expandedBeyondRadius` → amber: `⚠ No driver within the configured <matchRadiusKm> km radius — showing the closest available driver(s) beyond it.`
- otherwise → no banner.

---

## 8. Cross-module effects

| Setting | Consumer | Line | Effect |
|---------|----------|------|--------|
| `quickRideRadiusKm` | `nearestAvailableDrivers` | L8175 | Base radius for every quick-ride match, live-map picker and `nextOfferCandidate` |
| `subRadiusKm` | `nearestAvailableDrivers` | L8175 | Base radius for subscription assignment, "Find replacement / Nearby drivers", and the plan-visibility coverage test |
| `autoExpandRadius` | `nearestAvailableDrivers` | L8199–L8201 | Fallback to the unbounded list; sets `expandedBeyondRadius` which drives the amber operator banner (L8374) **and** blocks plan visibility (L8145) |
| `DB.searchPhases` | `currentRadiusMultiplier` → `nearestAvailableDrivers` → `nextOfferCandidate` → `tickEngine` | L8147, L8176, L12503 | Progressive widening of live quick-ride offers |
| `allowMultiSubPerDriver` | `driverCanTakeAnotherSub` | L8163 | Filters the subscription candidate pool (L8180) |
| `allowMultiSubPerDriver` | driver profile "📦 Subscription settings" card | L4118 | Shows the amber *"general setting is currently closed"* box, or the *"has no effect right now"* grey note |
| `allowMultiSubPerDriver` | driver roster badge | L6390 | `Exception enabled` chip shows only when the general setting is **closed** and the driver has `multiSubException` |
| `allowMultiSubPerDriver` | subscription driver picker option hint | L5692 | Disabled reason: `Already has <n> active subscription(s) — multi-subscription setting is closed for this driver` |
| `commitMultiSubChange` | `renderDriversTable()` | L8070 | Re-renders the driver roster so the exception chips update immediately |
| `planVisibility.hideIfNoCoverage` | `isPlanVisibleForRider` | L8142 | — |
| `isPlanVisibleForRider` | new-subscription modal plan list | L4569 | When `coverageBlocked`, `planOptions` is left **empty** — the rider is offered no plans at all |
| Cities & Regions `active` flag | `nearestAvailableDrivers` | L8170 | An inactive rider city short-circuits **all** matching regardless of any dispatch setting — see `15g` |
| `opsLimits` (`driver_max_consecutive_declines`, `driver_min_rating_for_dispatch`) | `driverAutoRestricted()` → `nearestAvailableDrivers` | L8178, L4501 | Auto-excludes flagged/low-rated drivers before radius is even considered — see `15i` |
| `opsLimits` (`driver_min_trips_for_subs`) | `driverTrustedForSubs()` | L4487 | Separate subscription-eligibility gate — see `15i` |
| audit entities `ops-radius`, `phases`, `multi-sub-policy`, `plan-visibility` | Activity tab; the four `.settings-meta` footers | L7341 | Last-updated lines |

---

## 9. Hardcoded / mock / demo values

- **Seed radii** (L2568): `quickRideRadiusKm:6`, `subRadiusKm:8`, `autoExpandRadius:true`.
- **`allowMultiSubPerDriver:false`** (L2569) with the inline comment *"Closed by default."*
- **`planVisibility:{hideIfNoCoverage:false}`** (L2575).
- **The HTML `value` attributes duplicate the seed**: `value="6"` (L1563) and `value="8"` (L1596) are hardcoded in markup *and* in `DB`. If the seed changed, the pre-render markup would disagree until `renderOpsRadiusConfig()` runs. `#cfg-auto-expand` is likewise hardcoded `checked` (L1565).
- **`DB.searchPhases`** (L13925–L13929) — 3 hardcoded phases: `0s ×1`, `8s ×1.5`, `18s ×3`.
- **Fallback literals `6` and `8`** repeat inside `renderOpsRadiusConfig` (L8039–L8040), `saveOpsRadiusConfig` (L8076–L8077) and `nearestAvailableDrivers` (L8175).
- **Clamp bounds 1 and 50** are hardcoded in both markup and JS.
- **VIP sentinel `999`** seconds (L12502) — a magic number standing in for "max phase".
- **`exclude.length + 6`** candidate over-fetch (L12503) — magic constant.
- **`limit || 5`** default candidate count (L8200).
- **Driver `mapPos` coordinates are demo data** (e.g. `{x:60,y:55}` L2650) — a synthetic 0–100 grid, not real lat/lng; `geoDistanceKm` operates on it.
- **`multiSubException:true` is seeded on `DRV-0101` Ahmed Salem only** (L2650) — the demo's one exception driver.
- The `dispatch-tbody` parameters (§3.6) are **not present in the `DB.commitPolicy` seed** (L16541–L16560) at all — `renderDispatchSettings` reads `p[key]` for six keys that do not exist, rendering `value="undefined"`.

---

## 10. i18n keys

| Key | Element | Line | Arabic at |
|-----|---------|------|-----------|
| `stab.dispatch` | tab button label `Matching & Dispatch` | L1426 | L7919 (`'المطابقة والتوزيع'`) |
| `stabgrp.operations` | nav group heading `Operations` | L1425 | L7916 |

**Nothing inside the pane is internationalised.** All five card headings, every field label, the auto-expand sentence, the multi-subscription explanation, both plan-visibility radio descriptions, all four save buttons, the phases table headers, the empty state, and the confirmation modal are hardcoded English with no `data-i18n`.

---

## 11. Gaps, dead code, UNVERIFIED items

1. **`Save search phases` writes nothing** (L8115–L8120). Adds and removes already commit to `DB.searchPhases` on click. The button only appends an audit entry `Search phases confirmed — <n> phase(s) active`. Its toast — *"applies to new ride requests immediately"* — describes something that already happened.
2. **Both radius buttons are the same function.** `Save Quick Ride radius` (L1568) and `Save Subscription radius` (L1598) both call `saveOpsRadiusConfig()` and both commit *both* fields plus the auto-expand checkbox. The card-level framing implies independent saves; they are not.
3. **The two `.settings-meta` footers are swapped** (§2). `#meta-ops-radius` (Quick Rides card) tracks the radius entity, `#meta-phases` (Subscriptions card) tracks the phases entity — so phase changes appear to belong to the Subscriptions card.
4. **Phases cannot be edited.** No in-row inputs; `data-phase-id` (L8092) is written but never read back. Changing `8s ×1.5` to `10s ×1.5` requires remove + re-add.
5. **`removeSearchPhase` records nothing identifying.** `logAction(..., 'Removed a search phase', {}, {})` (L8111) — the audit cannot say *which* phase was removed.
6. **No duplicate-`afterSec` guard and no upper bounds.** `addSearchPhase` (L8100) accepts a second phase at 8 s (last-match-wins silently decides), a multiplier of 1000, or `afterSec: 99999`.
7. **Deleting a phase does not record which phase was deleted.** The action *is* confirm-gated (`GATE_SWEEP.removeSearchPhase` L20821, `d:true`), but its audit entry is the bare string `Removed a search phase` with empty `before`/`after` objects (L8111), so the change is unreconstructable from the log.
8. **Auto-expand is all-or-nothing.** When it fires, the radius cap is discarded entirely (L8199), so a "last resort" can match a driver arbitrarily far away. Only the amber banner (L8374) tells the operator.
9. **`allowMultiSubPerDriver` counts only `status==='Active'`** (L8158). A driver with several `Expiring` subscriptions reads as having zero and is treated as a "new driver".
10. **`onMultiSubToggle` denial reverts the checkbox but the modal path can desync.** On `Cancel` the toggle correctly stays on (it was pre-reverted at L8053), but no re-render occurs — if the underlying flag were changed elsewhere in the meantime, the DOM would drift. Minor.
11. **Plan-visibility strictness is undocumented in the UI.** `isPlanVisibleForRider` rejects coverage that only exists via auto-expand (L8145), so a rider can be shown *no plans at all* while the same rider's quick ride would still be matched. The radio's sub-copy does not mention this interaction.
12. **When coverage is blocked, the plan list is silently empty** (L4569–L4570) — `planOptions` stays `[]`. **UNVERIFIED** whether any explanatory message is rendered to the operator; that markup was not read in this pass.
13. **`renderDispatchSettings()` is misnamed and mis-scoped** (L17408) — it belongs to the Reason Codes pane. Worse, its six keys are absent from the `DB.commitPolicy` seed (L16541–L16560), so the inputs render `value="undefined"` until saved once. See `15k` §11.
14. **`renderPlanVisibility()` is not in the pane's obvious render set** — it is called from `go('settings')` (L8819) but has no in-pane trigger; nothing re-selects the radios after `savePlanVisibility()`, which is harmless only because the user's own click already set them.
15. **No per-city or per-zone radius override.** One global quick-ride radius and one global subscription radius for every city in `DB.cities`.
16. **No maximum wait / give-up rule.** Nothing on this pane defines when a searching request stops searching.
17. **UNVERIFIED — `geoDistanceKm`, `estimateEtaMin`, `driverLiveState`, `driverAutoRestricted` internals** were not read in this pass beyond their call signatures at L8178–L8182 and their definition line for `driverAutoRestricted` (L4500).
18. **UNVERIFIED — real dispatch.** `mapPos` is a synthetic grid and `tickEngine` is a simulation loop; no real driver locations or offers exist.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Nav group `Operations` heading | L1425 |
| Tab button (Matching & Dispatch) | L1426 |
| Pane `#stab-dispatch` | L1552–L1619 |
| Panel head + description | L1553–L1558 |
| Card `🚕 Quick Rides` | L1560–L1579 |
| `#cfg-quick-radius` | L1563 |
| `#cfg-auto-expand` | L1565 |
| `Save Quick Ride radius` | L1568 |
| Search-phases section label | L1570 |
| Phases table header + `#phases-tbody` | L1571 |
| `#new-phase-sec` / `#new-phase-mult` / `+ Add phase` | L1573–L1575 |
| `Save search phases` | L1577 |
| `.settings-meta#meta-ops-radius` | L1578 |
| Card `👥 Multi-subscription policy` | L1581–L1591 |
| `#cfg-multi-sub` toggle | L1585 |
| Multi-sub explanation | L1588 |
| `.settings-meta#meta-multi-sub` | L1590 |
| Card `📦 Subscriptions` | L1593–L1601 |
| `#cfg-sub-radius` | L1596 |
| `Save Subscription radius` | L1598 |
| `.settings-meta#meta-phases` | L1600 |
| Card `👁️ Plan visibility` | L1603–L1618 |
| Plans-page cross-link | L1605 |
| `#plan-vis-radio-a` | L1608 |
| `#plan-vis-radio-b` | L1612 |
| `Save plan visibility rule` | L1615 |
| `.settings-meta#meta-plan-visibility` | L1617 |
| `DB.opsConfig` radius/multi-sub seed | L2567–L2569 |
| `DB.opsConfig.planVisibility` seed | L2575 |
| `requirePerm()` | L3126–L3133 |
| Driver profile multi-sub card | L4112–L4130 |
| `isPlanVisibleForRider` consumer (plan list) | L4569 |
| `getLimit()` | L4468 |
| `driverTrustedForSubs()` | L4487–L4494 |
| `driverAutoRestricted()` | L4500–L4508 |
| Subscription driver-picker hint | L5692 |
| Driver roster `Exception enabled` chip | L6390 |
| `renderSettingsMeta()` map | L7341 |
| `renderOpsRadiusConfig()` | L8036–L8045 |
| Multi-sub comment | L8046–L8048 |
| `onMultiSubToggle()` + confirm modal | L8049–L8063 |
| `commitMultiSubChange()` | L8064–L8072 |
| `saveOpsRadiusConfig()` | L8073–L8086 |
| `renderSearchPhasesTable()` | L8087–L8095 |
| `addSearchPhase()` | L8096–L8107 |
| `removeSearchPhase()` | L8108–L8114 |
| `saveSearchPhases()` | L8115–L8120 |
| `renderPlanVisibility()` | L8121–L8126 |
| `savePlanVisibility()` | L8128–L8136 |
| `isPlanVisibleForRider()` | L8141–L8146 |
| `currentRadiusMultiplier()` | L8147–L8152 |
| `isCityActive()` | L8153–L8156 |
| `driverActiveSubCount()` | L8157–L8159 |
| `driverCanTakeAnotherSub()` | L8160–L8166 |
| `nearestAvailableDrivers()` | L8167–L8204 |
| Radius / city-inactive operator banner | L8374 |
| `go('settings')` render entry | L8819 |
| `DB.searchPhases` seed + comment | L13921–L13929 |
| `nextOfferCandidate()` | L12496–L12506 |
| `tickEngine()` | L12508+ |
| `DB.commitPolicy` seed | L16541–L16561 |
| `renderDispatchSettings()` (belongs to Reason Codes pane) | L17408–L17423 |
| `saveCommitPolicy()` | L17117–L17130 |
