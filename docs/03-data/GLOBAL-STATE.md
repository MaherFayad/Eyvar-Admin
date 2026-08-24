# Eyvar Ops Panel — Global State (non-`DB`)

> Source: `eyvar_ops_panel_v40_fixed.html` (21,857 lines) | inline script region **L2166–L21855**
> Companion to `DATA-MODEL.md`, which covers the 101 `DB.<key>` collections. This file covers everything else that lives at module scope.
> Verified on 2026-08-24. Every claim carries a line citation; anything not directly observable is marked `UNVERIFIED`.

## 0. Headline facts

* The file declares **zero `let` and zero `const`** at module scope. It is 100 % `var`. (`grep -n '^ \?\(let\|const\)[ \t]'` returns nothing.)
* **150 lines** match `^ ?var[ \t]`. One of them, **L11512**, carries two declarators (`var MAP_MODE='live';var MAP_FILT='';`) → **151 module-scope `var` names**.
* Minus `DB` itself (L2566, documented separately) and minus one false positive → **149 genuine non-`DB` globals**.
* **False positive:** `__script` at **L6261** is written flush-left but sits inside `buildTicketDetailBody(t)` (L6249–L6282, used at L6269). Because it is `var`, it is function-scoped to that function. It is *not* a global — the indentation is simply wrong.
* No comma-multi-declarator lines (`var a=1,b=2;`) exist anywhere at module scope.

### Category counts

| Category | Count | Examples |
|---|---|---|
| config-constant (never reassigned) | ~96 | `PLANS`, `PAGE_PERMISSIONS`, `DOC_TYPES`, `ACCOUNTS`, `SCRIPT_LIBRARY` |
| filter-or-sort state | 21 | `_reqFilter`, `AUDIT_PAGE`, `_driverFilter`, `_commitFilter` |
| mutable-app-state | 15 | `CURRENT_USER_ID`, `REQ_NOW_REF`, `navStack`, `__tickCount` |
| current-selection | 9 | `navCurrent`, `currentPlanKey`, `activeTrip`, `flowRider` |
| timer / interval handle | 5 | `_rrTrackInterval`, `_subTrackInterval`, `replayAnim`, `_selResizeTimer` |
| cache / DOM ref | 4 | `_lmap`, `_carMarkers`, `_routeLines`, `cityPreviewMapInstance` |
| saved-original (monkeypatch) | 8 | `__origRecordRefund`, `__origAutoHandoff`, `__origCselToggle` |
| other (debounced handlers) | 2 | `debouncedRenderRequestsSubAll`, `debouncedRenderRequestsInstantAll` |

---

## 1. The 18 named globals, in full

All eighteen names in the specification exist in the file. None is missing.

### 1.1 `MAP_MODE` — L11512

```js
var MAP_MODE='live';var MAP_FILT='';
```

| | |
|---|---|
| **Type** | string |
| **Domain** | `'live' \| 'history'` — from `setMapMode`'s tab list `['tab-live','tab-history']` (L11513) and the comparisons `MAP_MODE==='live'` (L12598), `MAP_MODE==='history'` (L12688) |
| **Category** | mutable-app-state (which map tab is showing) |
| **Initial** | `'live'` |
| **Writers (1)** | `setMapMode(mode)` L11513 — `MAP_MODE=mode;`, the only assignment |
| **Readers (3 fns, 5 sites)** | `go()` L8790 (`setMapMode(MAP_MODE\|\|'live')` on entering the Live page), `tickEngine` L12598, `selectTrip` L12688 |
| **Lifecycle** | Reset to `'live'` on reload; never persisted |
| **Duplicates `DB`?** | No |

Its line-mate **`MAP_FILT`** (L11512, `''`) is assigned once in `setMapMode` (L11522) and **read nowhere** — write-only dead state.

### 1.2 `navCurrent` — L2850

```js
var navCurrent={type:'page',id:'dashboard'};
```

| | |
|---|---|
| **Type** | object `{type:string, id:string}` |
| **Domain of `type`** | `'page' \| 'profile' \| 'applicant' \| 'ticket'` |
| **Category** | current-selection — what the toolbar Back button restores |
| **Writers (4)** | `go()` L8780 `{type:'page',id}`; `openProfile()` L8831 `{type:'profile',id:hit.data.id}`; `openApplicantDetail()` L8871 `{type:'applicant',id}`; `openTicketDetail()` L8883 `{type:'ticket',id}` |
| **Readers (7 fns, 16 sites)** | `pushHistory` L7006, `refreshNavCounts` L9408, `confirmSubDriverCommit`, `commitAutoRenewOff`, `doFreeze`, `confirmCancelSub`, `confirmPostponeTrip` |
| **Lifecycle** | Session-only |
| **Duplicates `DB`?** | No |

The comment at L2843–2848 records that `navCurrent`/`navStack` "were referenced throughout the app but never actually declared anywhere, so every Back button silently no-opped" — the `typeof` guards hid the bug.

### 1.3 `navStack` — L2849

```js
var navStack=[];
```

| | |
|---|---|
| **Type** | array of `navCurrent` snapshots |
| **Category** | mutable-app-state (navigation history) |
| **Writers** | **Never reassigned.** Mutated in place only: `pushHistory()` L7006 (`.push`, plus `.shift()` when `length>40`), `goBack()` L7014 (`.pop()`) |
| **Readers (3 fns, 9 sites)** | `updateBackBtn` L7005, `pushHistory` L7006, `goBack` L7013–7014 |
| **Bounded** | Yes — capped at 40 entries (L7006). One of only two bounded structures in the file (the other is `DB.contacts`, capped at 2000, L14933) |
| **Duplicates `DB`?** | No |

### 1.4 `PLANS` — L4389–4393

```js
var PLANS={
  weekly:{label:'Weekly',exec:5,eco:86.50,comfort:122.50},
  biweekly:{label:'Bi-weekly',exec:10,eco:164.35,comfort:232.50},
  monthly:{label:'Monthly',exec:22,eco:344.52,comfort:487.00}
};
```

| | |
|---|---|
| **Type** | object, 3 entries |
| **Category** | config-constant |
| **Writers** | `<top-level only>` |
| **Readers (9 fns, 18 sites)** | `perTripBaseRate`, `renderNewSubModal`, `finalizeNewSub`, `pickNsDriverFromMap`, `materializeSubscription`, `subReqValue`, `planVehicleType`, `renewOptionsFor`, `renderSuccess` |
| **Duplicates `DB`?** | **YES — `DB.plans` (L2889–2896).** See §3.1. |

### 1.5 `CADENCE_META` — L4520–4524

```js
var CADENCE_META={
  weekly:{discountPct:0,eyvarPct:20},
  biweekly:{discountPct:5,eyvarPct:18},
  monthly:{discountPct:10,eyvarPct:15}
};
```

Config-constant, never reassigned. **Readers (2):** `computeDynamicSubPrice`, `renderNewSubModal`.
**Duplicates `DB`?** **YES, exactly** — `DB.plans[k].discountPct` / `.eyvarPct` at L2890, L2892, L2894 carry the identical six numbers.

### 1.6 `CADENCE_DAYS` — L11231

```js
var CADENCE_DAYS={weekly:7,biweekly:14,monthly:30};
```

Config-constant, never reassigned. **Readers (6 fns, 6 sites):** `buildSubProfile`, `computeDynamicSubPrice`, `finalizeNewSub`, `materializeSubscription`, `renewOptionsFor`, `renderSuccess`.
**Duplicates `DB`?** **YES, exactly** — `DB.plans[k].duration` = 7 / 14 / 30 at L2890, L2892, L2894.

### 1.7 `DOC_TYPES` — L13277

```js
var DOC_TYPES=[
  ['license','Driving license'],
  ['vehicle_reg','Vehicle registration (Istimara)'],
  ['inspection','Periodic inspection (Fahs)'],
  ['insurance','Insurance'],
  ['operating_card','Transport authority operating card']
];
```

| | |
|---|---|
| **Type** | array of 5 `[key, label]` pairs |
| **Category** | config-constant — the **schema** for `DB.driverDocs`, declared immediately above it (L13278) |
| **Writers** | `<top-level only>` |
| **Readers (11 fns, 13 sites)** | `confirmApproveDriver`, `docExpiryViewHTML`, `docExpiryEditHTML`, `saveDocExpiry`, `openDocDateEditor`, `saveDriverDocDates`, `approveDriver`, `complianceScan`, `renderCompliancePage`, `markDocRenewed`, `driverRiskScore` |
| **Duplicates `DB`?** | **No.** L11113 (`DOC_TYPES.forEach(dt => DB.driverDocs[newId][dt[0]] = …)`) *generates* the DB shape from this list, which makes it a schema, not a copy. |

**Related conflict:** `DB.pendingDrivers[].docs` uses a **different** five-key set — `license`, `id_card`, `vehicle_reg`, `background`, `insurance` (L2718) — so an application's document checklist and an active driver's expiry tracker do not line up. `id_card` and `background` have no expiry slot; `inspection` and `operating_card` are never checked at application time.

### 1.8 `GATE_SPECS` — L18245–18371

| | |
|---|---|
| **Type** | object, **18 keys**; 17 values are factory functions returning `{title, summary, consequences:[…], confirmLabel, danger?, options?}`; 1 value is `null` |
| **Category** | config-constant (confirm-dialog registry) |
| **Writers** | `<top-level only>` |
| **Readers (1 fn, 2 sites)** | `installUniversalGates()` L18372 |

Full key list, in file order: `confirmPlanLeg`, `acceptEmergency`, `declineEmergency`, `respondBackupOffer`, `setTicketStatus`, `bulkAssignMe`, `commitBulkReason`, `commitChangeReason`, `saveReasonCodes`, `saveSlaPolicy`, `saveOnCall`, `commitRatingDispute`, `commitReportRider`, `commitDriverAppeal`, `commitEmergencyClaim`, `commitErasureRequest`, `commitLogContact`, `openLowRatingTicket` (**`null`** — the comment says the modal is the deliberate step).

Cross-dependencies on `DB`: `confirmPlanLeg` reads `ACK_SOURCE` (L18257); `respondBackupOffer` reads `DB.commitPolicy.backupMultiplierPct` (L18288); `commitEmergencyClaim` reads `DB.commitPolicy.appealResponseHours` (L18357); `commitErasureRequest` reads `ERASURE_SLA_DAYS` (L18363).

**Relationship to `GATE_SWEEP` (L20769, 47 keys):** the two registries are **disjoint** — key-set intersection is empty (verified). `GATE_SPECS` gates 18 workflow commits via `installUniversalGates`; `GATE_SWEEP` gates 47 settings-save actions via `installGateSweep`. No action is double-gated.

### 1.9 `PAGE_PERMISSIONS` — L10564–10657

Object, **22 page entries**, each `{label, icon, legacy, perms:[{key,label},…]}`. `legacy` maps the page onto one of the 13 flat permission strings (or `null`).

| page key | label | `legacy` | perm keys |
|---|---|---|---|
| `dashboard` | Dashboard | `null` | view |
| `requests` | Requests | `live_ops` | view, assign, cancel |
| `subscriptions` | Subscriptions | `manage_subscriptions` | view, change_driver, settle |
| `quickrides` | Quick Rides | `live_ops` | view |
| `trips` | All Trips | `live_ops` | view |
| `renewal` | Renewal Pipeline | `manage_subscriptions` | view |
| `readiness` | Trip Readiness | `manage_subscriptions` | view, resolve |
| `live` | Live Map | `live_ops` | view, intervene, cancel_trip |
| `drivers` | Drivers | `approve_drivers` | view, approve, contact |
| `riders` | Riders | `view_profiles` | view, contact |
| `coverage` | Coverage & Capacity | `manage_subscriptions` | view, assign_backup, promote_backup |
| `compliance` | Fleet Compliance | `approve_drivers` | view, edit_dates |
| `safety` | Safety & Incidents | `approve_drivers` | view, update_steps, suspend, close |
| `growth` | Promos & Growth | `manage_plans` | view, create_promo, pause_promo, send_message, recalc_tiers |
| `zones` | Zones | `live_ops` | view, steer |
| `predictive` | Predictive Signals | `manage_subscriptions` | view, act |
| `finance` | Finance | `view_finance` | view |
| `wallets` | Driver Wallets | `process_payouts` | view, process_payouts, release_escrow, apply_deductions, cash_review, cash_repayment |
| `plans` | Plans | `manage_plans` | view, edit |
| `support` | Support Center | `manage_tickets` | view, manage |
| `settings` | Settings & Team | `manage_team` | view, manage_team |
| `audit-log` | Activity Log | `null` | view |

**Writers:** `<top-level only>`. **Readers (6 fns, 10 sites):** `defaultPagePerms` (L10658 — derives `u.pagePerms` from `u.permissions` via `legacy`), `requirePagePerm`, `togglePagePermission`, `renderPagePermMatrix`, `toggleRolePermission`, `saveUserPermissions`.
**Duplicates `DB`?** Structurally overlapping — see §3.11.

### 1.10 `MAP_ROUTES` — L11933–11941

```js
var MAP_ROUTES={
  'TRP-7741':{pts:[[80,300],[80,260],[140,260],[200,260],[260,230],[320,190],[380,150],[440,110],[490,80],[530,60]]},
  'TRP-7738':{pts:[[60,310],[60,260],[100,260],[180,250],[240,230],[300,200],[360,170],[420,130],[480,90],[540,55]]},
  'TRP-7735':{pts:[[50,320],[80,310],[120,290],[170,260],[210,230],[270,200],[330,170],[390,140],[450,110],[510,80],[560,55]]},
  'TRP-7742':{pts:[[90,305],[140,290],[190,270],[240,245],[280,215],[320,185],[370,160],[420,140],[470,115],[520,85]]},
  'TRP-9012':{pts:[[520,320],[500,290],[470,255],[430,225],[390,195],[350,165],[320,130],[300,95],[290,60]]},
  'TRP-9008':{pts:[[130,60],[170,95],[220,125],[270,155],[330,185],[390,220],[440,255],[480,290],[510,318]]},
  'TRP-9005':{pts:[[700,300],[660,270],[615,240],[570,210],[520,185],[470,160],[430,130],[400,95],[380,60]]}
};
```

Canvas-space (not lat/lng) polylines, 7 entries keyed by trip id. **Writers:** `<top-level only>`. **Readers (8 fns, 9 sites):** `setMapMode`, `focusLiveTrip`, `initMapClicks`, `renderMapTripsTable`, `selectTrip`, `rebuildMapTripSelect`, `drawMap`, `startReplay`.
**Duplicates `DB`?** Keyed by `DB.trips` ids — see §3.14.

### 1.11 `MSG_SEGMENTS` — L13733–13739

```js
var MSG_SEGMENTS=[
  {id:'seg1',label:'Drivers in a zone',count:8},
  {id:'seg2',label:'Riders with packages expiring ≤3 days',count:8},
  {id:'seg3',label:'Exposed subscriptions (no backup captain)',count:5},
  {id:'seg4',label:'Drivers with documents expiring ≤30 days',count:3},
  {id:'seg5',label:'All active subscribers',count:142}
];
```

Array, 5 entries. **Writers:** `<top-level only>`. **Readers (2):** `renderBulkMsg`, `sendBulkMsg`.
**Duplicates `DB`?** **YES — the `count` fields are hardcoded audience sizes** that ought to be derived from `DB.drivers`, `DB.subscriptions`, `DB.subBackups` and `DB.driverDocs`. `seg5`'s `142` is the same stale figure as the `subs` page-subtitle global (§3.7) against 7 real subscriptions.

### 1.12 `CURRENT_USER_ID` — L2862

```js
var CURRENT_USER_ID='USR-1';
```

| | |
|---|---|
| **Type** | string — the id of `DB.teamUsers[0]` (Sarah Al-Rashid, L2831) |
| **Category** | mutable-app-state (acting identity) |
| **Writers (3)** | `commitUserSwitch` L3106, `impersonate` L21071, `stopImpersonating` L21082 |
| **Readers** | **many — 81 sites across 51 functions**, including the RBAC core `can()` / `requirePerm` and the audit core `logAction()`, plus `currentRole`, `currentUserName`, `meUser`, `currentUserPagePerms`, `effectivePermissions`, `logContact`, `logGoodwill`, `compCheck`, `decideFairness`, `decideEmergency`, `commitErasureRequest`, `bulkAssignMe`, `setLegAck`, `claimItem`, `myOpenClaims`, `ownershipStats`, `ownerChip`, `recordRefund`, `commitFlagAccount`, `commitSuspendAccount`, `renderMaProfile`, `renderMaSecurity`, `renderMaPermissions`, `handleAvatarUpload`, `removeAvatar`, `saveMaProfile`, `changeMaPassword`, `toggleMa2FA`, `logOutSession`, `openUserSwitch`, `renderTeamTable`, `toggleRolePermission`, `saveUserPermissions`, `tickEngine`, `heldByMe`, `suspendSurge`, `proposeRateCard`, `approveRateCard` |
| **Lifecycle** | Session-only; not persisted |
| **Duplicates `DB`?** | No — it is a *pointer into* `DB.teamUsers`, which is the correct pattern |

**Related defect:** `approveDriver` (L11114) and `rejectDriver` (L11128) hardcode `decidedBy:'Sarah Al-Rashid'` instead of resolving `CURRENT_USER_ID`, so impersonation is invisible in driver-approval records.

### 1.13 `ACTION_LABELS` — L2898–2914 (26 keys)

```js
var ACTION_LABELS={
  assign_driver:'Assign driver', change_driver:'Change driver', create_subscription:'Create subscription',
  freeze_subscription:'Freeze subscription', cancel_subscription:'Cancel subscription',
  edit_team_user:'Edit team member', invite_team_user:'Invite team member',
  toggle_role_permission:'Role permission change', edit_user_permissions:'Edit user permissions',
  approve_driver:'Approve driver', reject_driver:'Reject driver', reconsider_applicant:'Reconsider applicant',
  reassign_driver:'Reassign driver', process_all_payouts:'Process all payouts', release_escrow:'Release escrow',
  apply_deduction:'Apply deduction', pay_driver:'Pay driver', reject_document:'Reject document',
  cancel_live_trip:'Cancel live trip', manual_assign:'Manual assign', cancel_ride_request:'Cancel ride request',
  activate_plan:'Activate plan', deactivate_plan:'Deactivate plan',
  permission_denied:'Permission denied (blocked)', switch_user:'Switched acting user', export_data:'Exported data'
};
```

**Writers:** `<top-level only>`. **Readers:** `renderAuditFilterSelect` only (1 fn, 2 sites) — it builds the Activity-Log action dropdown from these keys.

**Incomplete relative to actual usage.** `logAction` is called with at least six action strings not present here: `late_pickup_logged` (L16681), `plan_terms_accepted` (L17136), `plan_leg_confirmed` (L18209), `credit_note_issued` (L15884), `ledger_rejected` (L19925), `surge_suspended` (L21537). Those entries land in `DB.auditLog` but **cannot be selected in the filter**.

### 1.14 `currentPlanKey` — L2897

```js
var currentPlanKey=null;
```

Type `null → 'weekly'|'biweekly'|'monthly'` (a `DB.plans` key). Category current-selection.
**Writer (1):** `openPlanEdit` L6062. **Readers (7 fns, 7 sites):** `createTicketFor`, `loadPlanEditForm`, `toggleVehicleActive`, `savePlan`, `archivePlan`, `doArchivePlan`, `renderPlansFormSelects`.
The inline comment (L2897) states every field on the Edit-plan page reads/writes `DB.plans[currentPlanKey]` rather than a hardcoded plan — verified correct.

### 1.15 `TIER_RANK` — L13579

```js
var TIER_RANK={new:0,standard:1,silver:2,gold:3};
```

Config-constant. **Writers:** `<top-level only>`. **Readers:** `recalcDriverTiers` only (1 fn, 2 sites).
Defines the closed set for `DB.drivers[].lvl` and `DB.riders[].lvl`. `computeDriverTier` (L13598–13602) implements the thresholds: `gold` needs rating ≥ 4.7 **and** ≥ 90 days tenure; `silver` needs ≥ 4.3 **and** ≥ 30 days; `rating===0` → `new`; else `standard`.

### 1.16 `INC_STEPS` — L13394

```js
var INC_STEPS=[
  ['contact','Contact both parties'],
  ['verify','Verify facts (GPS, timestamps, statements)'],
  ['act','Act (precautionary suspension / credit / clearance)'],
  ['document','Document outcome for the record']
];
```

Config-constant — the schema for `DB.incidents[].steps`. **Writers:** `<top-level only>`. **Readers (3 fns, 8 sites):** `renderSafetyPage`, `toggleIncStep`, `closeIncident`.

### 1.17 `REQ_NOW_REF` — L9555

```js
var REQ_NOW_REF=new Date(2026,5,25,9,14,0);   // 25 Jun 2026, 09:14:00
```

| | |
|---|---|
| **Type** | Date |
| **Category** | **mutable-app-state — the app's simulated wall clock**, not a constant |
| **Writer (1)** | `processSubReqSearchWindow` L9680 — `REQ_NOW_REF=new Date(REQ_NOW_REF.getTime()+SUBREQ_TIME_ACCEL_MIN_PER_TICK*60000)` — advances 1 simulated minute per tick |
| **Readers (13 fns, 20 sites)** | `minutesUntilTime`, `nextScheduledDayLabel`, `evaluateSubStart`, `generateUpcomingTripsForSubscription`, `reqAgeMinutes`, `fmtReqNowLabel`, `processSubReqSearchWindow`, `approveDriver`, `currentSurgeMultiplier`, `docDaysLeft`, `markDocRenewed`, `driverTenureDays`, `subHealthScore` |
| **Duplicates?** | Overlaps `EYVAR_TODAY` (L11232, `new Date(2026,5,25)`) and `SEED_EPOCH` (L14628, `Date.now()`) — **three different "now"s**, only one of which advances |

### 1.18 `REQ_MONTHS` — L9556

```js
var REQ_MONTHS={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
```

Config-constant, month abbreviation → 0-based index. **Writers:** `<top-level only>`. **Readers (3):** `parseReqTimestamp`, `parseJoinedDate`, `parseShortDate`.

---

## 2. Complete inventory — all 149 module-scope globals, in file order

Columns: **Name | L# | Type | Initial value | Category | Writers | Readers**. `<top-level only>` means never reassigned after declaration (in-place mutation is called out where it happens).

### 2.1 Notifications, tickets, ride requests — L2168–2502

| Name | L# | Type | Initial value | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `titles` | 2168 | object | 41 page-key → title entries | config-constant | `<top-level only>` | `go()` L8786 (1 site) |
| `subs` | 2169 | object | 35 page-key → subtitle entries, e.g. `subscriptions:'142 active subscriptions'` | config-constant **with stale counts** (§3.7) | `<top-level only>` | `go()` L8786, `refreshNavCounts()` L9408 — **only 2 sites**; the other 67 `subs` occurrences are locals that shadow it (L13148, L13241, L15966, L18503, L20921) |
| `NOTIF_PRIORITY_RANK` | 2188 | object | `{critical:0,high:1,medium:2,low:3}` | config-constant | `<top-level only>` | `sortNotifsByPriority` (2 sites) |
| `NOTIF_PRIORITY_LABEL` | 2189 | object | `{critical:'🔴 Critical',high:'🟠 High',medium:'🔵 Medium',low:'⚪ Low'}` | config-constant | `<top-level only>` | **DEAD — 0 reads** |
| `NOTIF_PANEL_PREVIEW` | 2228 | number | `8` | config-constant | `<top-level only>` | `renderNotifPanel` (2 sites) |
| `_notifPageFilter` | 2291 | string | `'all'` | filter state | `setNotifFilter` L2293 | `renderAllNotificationsPage` (3 sites) |
| `AUTO_REPLY_RULES` | 2379 | array | 6 × `{kw:[…],reply:'…'}` — refund/charged, late/delay, rude/behavior, cancel, payout/earnings, account/flagged | config-constant | `<top-level only>` | `runAutoReply` |
| `_rrTrackInterval` | 2501 | timer id \| null | `null` | timer handle | `openRideRequestTracking` L2509, `closeRideRequestTracking` L2512 | same 2 fns |
| `_rrTrackState` | 2502 | object \| null | `null` | mutable-app-state | `openRideRequestTracking` L2507, `closeRideRequestTracking` L2513 | `renderRideRequestTracking` |

### 2.2 Nav, identity, plans — L2849–4525

| Name | L# | Type | Initial value | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `navStack` | 2849 | array | `[]` | mutable-app-state | in-place: `pushHistory` L7006, `goBack` L7014 | 3 fns, 9 sites |
| `navCurrent` | 2850 | object | `{type:'page',id:'dashboard'}` | current-selection | `go` L8780, `openProfile` L8831, `openApplicantDetail` L8871, `openTicketDetail` L8883 | 7 fns, 16 sites |
| `CURRENT_USER_ID` | 2862 | string | `'USR-1'` | mutable-app-state | `commitUserSwitch` L3106, `impersonate` L21071, `stopImpersonating` L21082 | many (81 sites / 51 fns) |
| `currentPlanKey` | 2897 | null → string | `null` | current-selection | `openPlanEdit` L6062 | 7 fns |
| `ACTION_LABELS` | 2898 | object | 26 entries | config-constant | `<top-level only>` | `renderAuditFilterSelect` (2 sites) |
| `PERMISSION_LABELS` | 3225 | object | 13 permission-key → label entries | config-constant (RBAC vocabulary) | `<top-level only>` | 12 fns, 18 sites |
| `PERMISSION_DESC` | 3244 | object | same 13 keys → descriptive sentences | config-constant | `<top-level only>` | 4 fns, 6 sites |
| `EYVAR_COMMISSION_PCT` | 3604 | number | `20` | config-constant | `<top-level only>` | `subEconomics`, `computeSettlement` (3 sites) |
| `SETTLE_REASONS` | 3627 | object | 3 entries: `platform_fault{riderGets:'refund'}`, `force_majeure{riderGets:'credit'}`, `rider_violation{riderGets:'forfeit'}` | config-constant | `<top-level only>` | `computeSettlement`, `openSettlement` (4 sites) |
| `PLANS` | 4389 | object | 3 entries (§1.4) | config-constant | `<top-level only>` | 9 fns, 18 sites |
| `CADENCE_META` | 4520 | object | 3 entries (§1.5) | config-constant | `<top-level only>` | 2 fns |
| `WEEKDAYS` | 4525 | array | `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` | config-constant | `<top-level only>` | 7 fns |

### 2.3 Subscription dispatch, toasts, plan features — L4720–5997

| Name | L# | Type | Initial value | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `SUB_START_COMMIT_BUFFER_MIN` | 4720 | number | `5` | config-constant | `<top-level only>` | `evaluateSubStart` |
| `_subTrackInterval` | 4786 | timer id \| null | `null` | timer handle | `openSubTrackingModal` L4791, `renderSubTrackingWidget` L4808, `renderSubAcceptedTracking` L5165 (6 sites) | same 3 fns |
| `_nsDispatch` | 4947 | object \| null | `null` | mutable-app-state (in-flight new-sub dispatch) | `sendSubDispatchRequest` L4960, `cancelSubDispatch` L5024, `redispatchToNewDriver` L5068, `retrySubDispatchWithNewDriver` L5075, `finalizeNewSub` L5079 | 7 fns, 31 sites |
| `TOAST_DURATION` | 5257 | number | `6000` (ms) | config-constant | `<top-level only>` | `toast` |
| `TOAST_MAX` | 5258 | number | `1` | config-constant | `<top-level only>` | `toast` |
| `CD_REASONS` | 5574 | object | 4 entries: `inactive{compensate:true}`, `complaint{true}`, `schedule{false}`, `preference{false}` | config-constant | `<top-level only>` | `renderChangeDriverModal`, `proceedChangeDriver`, `commitDriverChange` |
| `PLAN_FEATURES` | 5992 | array | 3 × `{en,ar}` — identical to `DB.plans.weekly.features` | working buffer for the feature editor | in-place: `addPlanFeature` L6031, `removePlanFeature` L6038, `pfDrop` L6045–6046, `loadPlanEditForm` L6093–6094, inline `oninput` L6012/L6016 | 7 fns, 14 sites |
| `_pfDragIdx` | 5997 | number \| null | `null` | current-selection (drag index) | `pfDragStart` L6041, `pfDrop` L6047 | `pfDrop` |

**`PLAN_FEATURES` is safe.** `loadPlanEditForm` clears it (`PLAN_FEATURES.length=0`, L6093) and repopulates from `DB.plans[currentPlanKey].features` (L6094) on every open, and `savePlan` writes it back (L6142). It is a scratch buffer, not a stale duplicate — the initial literal is only what the buffer holds before the first plan is opened.

### 2.4 Drivers, exec trend, geometry — L6337–7262

| Name | L# | Type | Initial value | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `_driverTierFilter` | 6337 | string | `'all'` | filter state | `filterDriversByTier` L6339 | `renderDriversTable` (5 sites) |
| `_execTrendDragState` | 6884 | object | `{isDown:false,startX:0,startScroll:0,box:null}` (`.box` becomes a DOM ref) | mutable-app-state (drag) | in-place L6895, L6897 | `initExecTrendDrag` (7 sites) |
| `_execTrendWindowListenersBound` | 6885 | boolean | `false` | idempotency flag | `initExecTrendDrag` L6894 | same |
| `GEO_SCALE_KM` | 7236 | number | `0.14` | config-constant | `<top-level only>` | `geoDistanceKm` |
| `RIYADH_DISTRICTS` | 7243 | object | 16 × `'name':{x,y}` | config-constant (synthetic coords) | `<top-level only>` | 5 fns, 9 sites |
| `ROAD_CIRCUITY_FACTOR` | 7261 | number | `1.35` | config-constant | `<top-level only>` | `computeRouteKm`, `estimateEtaMin` |
| `URBAN_AVG_SPEED_KMH` | 7262 | number | `26` | config-constant | `<top-level only>` | `updateNrrFareEstimate`, `computeDynamicSubPrice`, `estimateEtaMin` |

`RIYADH_DISTRICTS` keys: Al Malaz District, King Fahd District, Al Nakheel District, Qurtubah District, Al Aqiq District, Al Yasmin District, Al Nuzha, Olaya / KAFD, Al Sahafa, Al Narjis, Diplomatic Quarter, Riyadh Park Mall, Granada Mall, King Khalid Airport, Al Malqa, Hittin.

### 2.5 Comms, cities, i18n — L7514–7938

| Name | L# | Type | Initial value | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `EMAIL_CATEGORY_LABEL` | 7514 | object | `{csat, promo, transactional, broadcast}` | config-constant | `<top-level only>` | `renderEmailOutbox`, `previewEmail` |
| `PUSH_AUDIENCE_LABEL` | 7710 | object | 11 segment keys → labels | config-constant | `<top-level only>` | `sendPushNotification` |
| `KNOWN_CITIES` | 7819 | array | 24 × `{name,lat,lng}` | config-constant | `<top-level only>` | `handleCityAutocomplete` |
| `citySelectedCoords` | 7833 | object \| null | `null` | current-selection | `handleCityAutocomplete` L7837, `selectCitySuggestion` L7859, `addCity` L7886 | `addCity` (5 sites) |
| `cityPreviewMapInstance` | 7864 | Leaflet map \| null | `null` | cache / DOM ref | `showCityMapPreview` L7869 | same (4 sites) |
| `LANG_STRINGS` | 7903 | object | `{ar:{…88 dotted i18n keys…}}` | config-constant | `<top-level only>` | `applyLanguage` |

`KNOWN_CITIES` names: Riyadh, Jeddah, Makkah, Madinah, Dammam, Al Khobar, Dhahran, Taif, Tabuk, Abha, Khamis Mushait, Jubail, Hail, Najran, Jazan, Yanbu, Buraidah, Sakaka, Dubai, Abu Dhabi, Doha, Kuwait City, Manama, Muscat.
`PUSH_AUDIENCE_LABEL` keys: `all_riders`, `gold`, `silver`, `nosub`, `high_risk_riders`, `all_drivers`, `gold_drivers`, `silver_drivers`, `economy_drivers`, `comfort_drivers`, `flagged_drivers`.

### 2.6 Activity-log page — L9225–9229

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `AUDIT_FILTER_ACTOR` | 9225 | string | `''` | filter state | `onAuditFilterChange` L9257 | `renderAuditLog` (4 sites) |
| `AUDIT_FILTER_ACTION` | 9226 | string | `''` | filter state | `onAuditFilterChange` L9258 | `renderAuditLog` (4 sites) |
| `AUDIT_SEARCH` | 9227 | string | `''` | filter state | `onAuditSearchInput` L9263 | `renderAuditLog` (4 sites) |
| `AUDIT_PAGE` | 9228 | number | `1` | pagination state | L9251, L9259, L9264, L9268, L9340 (6 assignments) | `renderAuditLog` (5 sites) |
| `AUDIT_PAGE_SIZE` | 9229 | number | `20` | filter state | `onAuditPageSizeChange` L9250 | `renderAuditFilterSelect`, `renderAuditLog` (6 sites) |

### 2.7 Interventions, simulated clock, requests page — L9440–10221

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `IV_CRITICAL_MINS` | 9440 | number | `30` | config-constant | `<top-level only>` | `buildInterventionItems` |
| `IV_WATCH_MINS` | 9441 | number | `60` | config-constant | `<top-level only>` | `buildInterventionItems` |
| `REQ_NOW_REF` | 9555 | Date | `new Date(2026,5,25,9,14,0)` | **simulated clock** | `processSubReqSearchWindow` L9680 | 13 fns, 20 sites |
| `REQ_MONTHS` | 9556 | object | 12 month abbreviations | config-constant | `<top-level only>` | 3 fns |
| `SUBREQ_SEARCH_HOURS` | 9577 | number | `2` | config-constant | `<top-level only>` | `processSubReqSearchWindow`, `subReqSlaBadge` (6 sites) |
| `SUBREQ_REMINDER_HOURS` | 9578 | number | `1` | config-constant | `<top-level only>` | same (6 sites) |
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK` | 9579 | number | `1` | config-constant | `<top-level only>` | `processSubReqSearchWindow`, `tickSteerOffers` |
| `_reqFilter` | 9883 | string | `'all'` | filter state | `setReqFilter` L10035 | `reqStatusMatch`, `renderRequestsPage` (16 sites) |
| `_reqSubSortByValue` | 9884 | boolean | `false` | sort state | `toggleSubValueSort` L10042 | `toggleSubValueSort`, `sortSubRequests` |
| `REQ_CARD_LIMIT` | 9885 | number | `20` | config-constant | `<top-level only>` | `renderRequestsPage` |
| `REQ_ALL_PAGE_SIZE` | 9886 | number | `20` | **config-constant that is mutated** | `onReqAllPageSizeChange` L10178 | 2 fns, 8 sites |
| `_reqSubAllPage` | 9887 | number | `1` | pagination state | L10145, L10171, L10179, L10174 (5 assignments) | `renderRequestsSubAll` |
| `_reqInstantAllPage` | 9888 | number | `1` | pagination state | L10180, L10191, L10218, L10221 (5 assignments) | `renderRequestsInstantAll` |
| `REQ_PLAN_LABEL` | 9976 | object | `{weekly:'Weekly',biweekly:'Bi-weekly',monthly:'Monthly'}` | config-constant | `<top-level only>` | `materializeSubscription`, `buildSubReqRow` |
| `debouncedRenderRequestsSubAll` | 10174 | function | `debounce(…,300)` | debounced handler | `<top-level only>` | **HTML only** — L2134 `oninput=` |
| `debouncedRenderRequestsInstantAll` | 10221 | function | `debounce(…,300)` | debounced handler | `<top-level only>` | **HTML only** — L2155 `oninput=` |

`REQ_PLAN_LABEL` is a **fourth** copy of the plan display names (`DB.plans[k].name` L2890, `PLANS[k].label` L4390 being the others).

### 2.8 Team, permissions, avatars, documents — L10501–10993

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `TEAM_ROLES` | 10501 | array | `['Owner','Ops Manager','Finance','Support']` | config-constant | `<top-level only>` | `editTeamUser`, `openInviteModal` |
| `PAGE_PERMISSIONS` | 10564 | object | 22 page entries (§1.9) | config-constant | `<top-level only>` | 6 fns, 10 sites |
| `_pagePermExpanded` | 10706 | object | `{}` | UI accordion state | in-place L10708 | `togglePagePermExpand`, `renderPagePermMatrix` L10718 |
| `AV_COLORS` | 10834 | array | 6 hex colours | config-constant | `<top-level only>` | `avatarHTML` (2 sites) |
| `PHOTO_GRADS` | 10835 | array | 5 CSS gradients | config-constant | `<top-level only>` | `avatarHTML` (2 sites) |
| `VEHICLE_CLASS_MAP` | 10959 | object | 30 model → class entries (15 Economy, 15 Comfort) | config-constant | `<top-level only>` | `verifyVehicleClass` |
| `_docExpiryEditing` | 10993 | object | `{}` | per-application edit-mode map | in-place L11024, L11041 | `docExpiryFormHTML` L10995, `toggleDocExpiryEdit`, `saveDocExpiry` |

### 2.9 Renewal flow, live map, tick engine — L11221–11954

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `RIDER_NAMES` | 11221 | object | `{nora:'RDR-1041',omar:'RDR-1052',sara:'RDR-1075',mohammed:'RDR-1080',khaled:'RDR-1060',reem:'RDR-1090'}` | config-constant | `<top-level only>` | `resolveFlowRider` |
| `CADENCE_DAYS` | 11231 | object | `{weekly:7,biweekly:14,monthly:30}` | config-constant | `<top-level only>` | 6 fns |
| `EYVAR_TODAY` | 11232 | Date | `new Date(2026,5,25)` | config-constant (dataset "today") | `<top-level only>` | 6 fns, 13 sites |
| `flowRider` | 11272 | string | `'RDR-1041'` | current-selection | `openRenewFlow` L11278 | 8 fns |
| `flowSelected` | 11273 | string \| null | `null` | current-selection | `openRenewFlow` L11280, `renderStep1` L11305, `pickPlan` L11335 | 5 fns, 8 sites |
| `STAGES` | 11495 | array | `['Requested','Driver assigned','En route to pickup','In trip','Completed']` | config-constant | `<top-level only>` | `stagePipelineHTML`, `interveneTrip` |
| `MAP_MODE` | 11512 | string | `'live'` | mutable-app-state | `setMapMode` L11513 | 3 fns, 5 sites |
| `MAP_FILT` | 11512 | string | `''` | filter state | `setMapMode` L11522 | **DEAD — never read** |
| `_lmap` | 11529 | Leaflet map \| null | `null` | cache / DOM ref | `initLeafletMap` L11573 | 4 fns, 19 sites |
| `_carMarkers` | 11530 | object | `{}` | cache (tripId → marker) | in-place L11599 | `updateLiveMarkers` (6 sites) |
| `_routeLines` | 11531 | object | `{}` | cache (tripId → polyline) | in-place L11592 | `updateLiveMarkers` |
| `_selectedLine` | 11532 | Leaflet layer \| null | `null` | current-selection | `showHistoryRoute` L11625 | same (3 sites) |
| `TRIP_COORDS` | 11534 | object | 7 trip ids → `{start,end,path}` real Riyadh lat/lng | config-constant | `<top-level only>` | `updateLiveMarkers`, `showHistoryRoute` |
| `TRIP_COLORS` | 11551 | object | 7 trip ids → hex colours | config-constant | `<top-level only>` | same |
| `CHAT_TEMPLATES` | 11716 | array | 7 × `{who,note}` | config-constant | `<top-level only>` | `simulateLiveChatMessage` |
| `MAP_ROUTES` | 11933 | object | 7 trip ids → canvas polylines (§1.10) | config-constant | `<top-level only>` | 8 fns, 9 sites |
| `activeTrip` | 11942 | string | `'TRP-7741'` | current-selection | `driverLiveState` L7290, `selectTrip` L12689, `rebuildMapTripSelect` L12730 | 9 fns, 17 sites |
| `replayAnim` | 11943 | interval/RAF id \| null | `null` | timer handle | `startReplay` L12977 | `selectTrip`, `startReplay` |
| `replayPct` | 11944 | number | `0` | mutable-app-state | `selectTrip` L12695, `startReplay` L12966 | `tickEngine`, `startReplay` (6 sites) |
| `TICK_ACCEL` | 11952 | number | `30` | config-constant | `<top-level only>` | `tickEngine` |
| `__tickStarted` | 11953 | boolean | `false` | idempotency flag | `startTickEngine` L11967 | same |
| `__tickCount` | 11954 | number | `0` | mutable-app-state (tick counter) | `tickEngine` L12509 | `evaluateSubStart`, `tickEngine` (11 sites) |

### 2.10 Dispatch offers & cash — L11987–12100

| Name | L# | Type | Initial | Category | Readers |
|---|---|---|---|---|---|
| `AUTO_OFFER_DELAY_SEC` | 11987 | number | `6` | config-constant | `tickEngine` |
| `OFFER_WINDOW_SEC` | 11988 | number | `12` | config-constant | `sendDriverOffer`, `tickEngine` |
| `CASH_COMMISSION_RATE` | 12076 | number | `0.20` | config-constant | `applyCashDebtImpact` |
| `CASH_TOLERANCE` | 12077 | number | `2.00` SAR | config-constant | `classifyCashReport`, `renderCashReconciliation` |
| `CASH_DEBT_CAP` | 12078 | number | `-300` SAR | config-constant | `driverCashBlocked`, `recordCashRepayment` |
| `CASH_TRIP_CHANCE` | 12079 | number | `0.35` | config-constant | `maybeGenerateCashEvent` |
| `CASH_REASONS` | 12100 | array | 3 fixed strings | config-constant | `maybeGenerateCashEvent` |

All seven are `<top-level only>` writers.

### 2.11 Coverage, compliance, safety, growth — L13145–14628

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `_coverageFilter` | 13145 | string | `'all'` | filter state | `filterCoverage` L13146 | `renderCoveragePage` |
| `DOC_TYPES` | 13277 | array | 5 `[key,label]` pairs (§1.7) | config-constant | `<top-level only>` | 11 fns, 13 sites |
| `_complianceFilter` | 13318 | string | `'all'` | filter state | `filterCompliance` L13319 | `renderCompliancePage` |
| `INC_STEPS` | 13394 | array | 4 `[key,label]` pairs (§1.16) | config-constant | `<top-level only>` | 3 fns, 8 sites |
| `_safetyFilter` | 13395 | string | `'all'` | filter state | `filterSafety` L13396 | `renderSafetyPage` |
| `TIER_RANK` | 13579 | object | `{new:0,standard:1,silver:2,gold:3}` | config-constant | `<top-level only>` | `recalcDriverTiers` (2 sites) |
| `MSG_SEGMENTS` | 13733 | array | 5 entries with hardcoded counts (§1.11) | config-constant | `<top-level only>` | `renderBulkMsg`, `sendBulkMsg` |
| `_zonesFilter` | 14129 | string | `'all'` | filter state | `filterZones` L14130 | `renderZonesPage` |
| `LF_FLOW` | 14453 | object | `{searching:['with_driver',…], with_driver:['returned',…]}` | config-constant (state machine) | `<top-level only>` | `renderLostFound`, `advanceLF`, `installActionGates` |
| `_selResizeTimer` | 14519 | timer id \| null | `null` | timer handle | `scheduleAutoSizeSelects` L14547 | same |
| `SEED_EPOCH` | 14628 | number (ms) | `Date.now()` | config-constant captured at load | `<top-level only>` | `agoMs`, `buildRiderHistory` |

### 2.12 Reason codes, PDPL, ride state — L15160–16336

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `RC_KEYWORD_MAP` | 15160 | array | 20 × `[RegExp,'CODE']` | config-constant | `<top-level only>` | `guessReasonCode` |
| `ERASURE_SLA_DAYS` | 15962 | number | `30` | config-constant | `<top-level only>` | 4 fns, 6 sites |
| `RIDE_STATE_FLOW` | 16335 | array | `['REQUESTED','MATCHING','ACCEPTED','ARRIVING','ARRIVED','IN_PROGRESS','COMPLETED']` | config-constant | `<top-level only>` | `rideStateSeed` |
| `DESYNC_THRESHOLD_MS` | 16336 | number | `20000` | config-constant | `<top-level only>` | **DEAD — 0 reads** |

`RC_KEYWORD_MAP` codes, in order: `CAP_NOSHOW`, `CAP_LATE`, `CAP_OFFPLATFORM_PAY`, `CAP_CONDUCT`, `CAP_CANCEL_ADV`, `PAY_REFUND_REQ`, `PAY_INCORRECT_CHARGE`, `DRV_PAYOUT_ISSUE`, `DRV_DEDUCTION_DISPUTE`, `APP_PROMO`, `APP_LOGIN`, `APP_CRASH`, `TRP_LOST_ITEM`, `SAF_THEFT`, `TRP_ROUTE_DEVIATION`, `FBK_INVOICE`, `FBK_ACCOUNT_DELETE`, `SAF_ACCIDENT`, `DRV_SUSPENSION_APPEAL`, `FBK_COMPLAINT` — all 20 are members of `DB.reasonCodes` (L14667), verified.

### 2.13 Commitment & confirm gates — L16834–18371

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `_commitFilter` | 16834 | string | `'all'` | filter state | `filterCommit` L16836 | 5 fns, 15 sites |
| `VERDICT_LABEL` | 17700 | object | 4 entries: `captain_performed`, `captain_absent`, `both_present_no_contact`, `inconclusive` → `[label, cssVar]` | config-constant | `<top-level only>` | `renderDisputes`, `arrivalEvidenceHTML`, `installActionGates` |
| `__confirmPending` | 17768 | object \| null | `null` | mutable-app-state (pending dialog) | `confirmAction` L17770, `cancelConfirm` L17802, `runConfirm` L17811 | `runConfirm` |
| `__guardToken` | 17817 | token \| null | `null` | re-entrancy guard | `guardAction` L17825 | same |
| `ACK_SOURCE` | 18127 | object | 4 entries: `app{weight:'strong'}`, `phone{'attested'}`, `whatsapp{'attested'}`, `assumed{'weak'}` | config-constant | `<top-level only>` | `setLegAck`, `ackChip`, `confirmPlanLeg` L18211, `autoHandoff` |
| `__origConfirmPlanLeg` | 18204 | function | pre-patch `confirmPlanLeg` | saved original | `<top-level only>` | **DEAD — 0 reads** |
| `__origAutoHandoff` | 18218 | function | pre-patch `autoHandoff` | saved original | `<top-level only>` | **DEAD — 0 reads** |
| `GATE_SPECS` | 18245 | object | 18 keys (§1.8) | config-constant | `<top-level only>` | `installUniversalGates` (2 sites) |

### 2.14 Rider-history reconstruction — L18650–18667

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `RY_PLACES` | 18650 | array | 20 Riyadh place names | config-constant | `<top-level only>` | `buildRiderHistory` (7 sites) |
| `PAY_METHODS` | 18653 | array | `['Mada ···2210','Visa ···4821','Apple Pay','STC Pay','Cash','Mastercard ···9034']` | config-constant | `<top-level only>` | `buildRiderHistory` |
| `__histSeq` | 18667 | number | `90000` | id sequence | `buildRiderHistory` L18752 via prefix `++__histSeq` | `buildRiderHistory` L18752–18753 |

`__histSeq` is the only prefix-increment global in the file. It mints `'TRP-'+(++__histSeq)` — ids from `TRP-90001` upward, which do **not** appear in `TRIP_COORDS`/`TRIP_COLORS`/`MAP_ROUTES`, so reconstructed trips can never be drawn on the map.

### 2.15 Work inbox & routing — L19085–19110

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `_inboxTab` | 19085 | string | `'mine'` (`mine\|unassigned\|all`) | filter state | `setInboxTab` L19294 | `inboxFiltered`, `renderInbox` (5 sites) |
| `_inboxRoleFilter` | 19086 | boolean | `true` | filter state | `toggleInboxRole` L19296 | same |
| `WORK_ROUTING` | 19090 | object | 12 queue → allowed-roles entries | config-constant | `<top-level only>` | `inboxFiltered` |
| `QUEUE_LABEL` | 19104 | object | same 12 keys → display labels | config-constant | `<top-level only>` | `renderInbox`, `screenPop` |
| `QUEUE_ROUTE` | 19107 | object | same 12 keys → target page | config-constant | `<top-level only>` | `inboxOpen` |

`WORK_ROUTING` full value: `ticket:['Support','Operations','Owner']`, `dispute:['Support','Finance','Owner']`, `fairness/emergency/dispatch/absence/leg/risk/coverage:['Operations','Owner']`, `incident:['Operations','Owner','Support']`, `lostfound:['Support','Operations','Owner']`, `erasure:['Owner','Operations']`.

### 2.16 Scripts, rota, ledger — L19336–20007

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `SCRIPT_LIBRARY` | 19336 | object | 24 entries keyed `'1.1'`… → `{s:script, a:[actions], e:escalation}` | config-constant | `<top-level only>` | `scriptPanelHTML`, `copyScript` |
| `DAY_KEYS` | 19594 | array | `['sun','mon','tue','wed','thu','fri','sat']` | config-constant | `<top-level only>` | 5 fns |
| `DAY_LABEL` | 19595 | object | 7 day-key → label entries | config-constant | `<top-level only>` | `setRotaSlot`, `renderRota`, `updateOnCallChip` |
| `WEEKEND` | 19596 | array | `['fri','sat']` | config-constant | `<top-level only>` | `rotaGaps`, `renderRota`, `rotaBoot` |
| `ACCOUNTS` | 19865 | object | 12-account chart of accounts | config-constant | `<top-level only>` | 5 fns, 7 sites |
| `__origRecordRefund` | 19961 | function | pre-patch `recordRefund` | saved original | `<top-level only>` | called inside the replacement (1 site) |
| `__origCreditWallet` | 19978 | function | pre-patch `creditRiderWallet` | saved original | `<top-level only>` | called inside the replacement |
| `__origDebitWallet` | 19992 | function | pre-patch `debitRiderWallet` | saved original | `<top-level only>` | called inside the replacement |
| `__origAcceptEmergency` | 20007 | function | pre-patch `acceptEmergency` | saved original | `<top-level only>` | called inside the replacement |

`ACCOUNTS`: `cash.gateway`, `ar.rider` (asset); `liability.wallet`, `liability.driver`, `liability.escrow`, `tax.vat_output` (liability); `revenue.fares` (revenue); `contra.refunds` (contra); `expense.driver_pay`, `expense.goodwill`, `expense.emergency`, `expense.compensation` (expense). This is the **only** global whose membership is enforced at runtime — `postLedger` refuses any posting naming an unknown account (L19920–19926).

### 2.17 Telephony, renewal, gates, settings, pricing — L20176–21621

| Name | L# | Type | Initial | Category | Writers | Readers |
|---|---|---|---|---|---|---|
| `_activeCall` | 20176 | object \| null | `null` | mutable-app-state | `answerCall` L20246, `commitWrapUp` L20316 | 4 fns, 11 sites |
| `_pendingRing` | 20242 | object \| null | `null` | mutable-app-state | `screenPop` L20240, `answerCall` L20245, `abandonCall` L20255 | `answerCall`, `abandonCall` |
| `__origReconcileEntity` | 20441 | function | pre-patch `reconcileEntity` | saved original | `<top-level only>` | called inside the replacement |
| `_renewalFilter` | 20560 | string | `'all'` (`all\|manual\|atrisk`) | filter state | `setRenewalFilter` L20563 | 3 fns, 6 sites |
| `__origCselToggle` | 20703 | function \| null | `(typeof cselToggle==='function')?cselToggle:null` | saved original | `<top-level only>` | **DEAD — 0 reads** |
| `GATE_SWEEP` | 20769 | object | **47 entries** action → `{t,d,s,c[],btn}` | config-constant (confirm registry #2) | `<top-level only>` | `gateAll`, `installGateSweep` (3 sites) |
| `_driverFilter` | 21221 | string | `'all'` | filter state | `setDriverFilter` L21223 | 3 fns, 8 sites |
| `SETTINGS_GROUPS` | 21270 | array | 6 groups → tab lists | config-constant | `<top-level only>` | `reorderSettingsTabs` |
| `PRESENCE_IDLE_MIN` | 21325 | number | `10` | config-constant | `<top-level only>` | `presenceList`, `renderPresence` |
| `PRICING_EXAMPLES` | 21617 | array | 3 × `{label,km,min}` — Short 5 km/12 min, Typical 10/20, Long 18/32 | config-constant | `<top-level only>` | `renderPricing` |

`SETTINGS_GROUPS`: Daily operations `[reasons, rota, cancelpolicy, dispatch, limits]`; Money `[pricing, ledger, gateways, integrity]`; People & access `[team, permissions, security]`; Customer comms `[notifications, push, emails]`; Platform `[general, cities, branding, legal]`; Records `[activity, export]`.

---

## 3. Globals that duplicate `DB` data

Duplication is the headline finding of this inventory. Each row below names a global, the `DB` key it re-encodes, how exact the copy is, and whether the two can drift apart.

> `DB.plans` is assigned at **L2889–2896**, outside the `DB` literal (which closes at L2842). `DB.cities` at L13946, `DB.zones` at L13952, `DB.teamUsers` at L2830–2842.

### 3.1 `PLANS` (L4389–4393) ↔ `DB.plans` (L2889–2896) — **most consequential**

| Correspondence | Global | `DB` |
|---|---|---|
| Display name | `PLANS.weekly.label = 'Weekly'` | `DB.plans.weekly.name = 'Weekly'` |
| Trips included | `PLANS.*.exec` = 5 / 10 / 22 | `DB.plans.*.execute` = 5 / 10 / 22 |
| Flat SAR price | `PLANS.*.eco / .comfort` = 86.50/122.50, 164.35/232.50, 344.52/487.00 | **no counterpart** — `DB.plans` stores per-min/per-km rates (`ecoMin`, `ecoKm`, `comfortMin`, `comfortKm`) instead |

**Can it drift? Yes, and it is already structurally broken.**
The Plans admin page writes only `DB.plans` — `savePlan` (L6142), `toggleVehicleActive`, `archivePlan`, `doActivatePlan` (L5961), `doDeactivatePlan` (L5982), `doArchivePlan` (L6170), all keyed off `currentPlanKey` (L2897). The pricing and subscription-creation path reads only `PLANS` — `perTripBaseRate`, `renderNewSubModal`, `finalizeNewSub`, `materializeSubscription`, `subReqValue`, `renewOptionsFor`, `renderSuccess`, `pickNsDriverFromMap`, `planVehicleType`.

Consequences:
* An operator who edits a plan's price sees the change on the Plans page but **new subscriptions are still priced from `PLANS`**.
* `DB.plans.monthly.status = 'Draft'` (L2894), yet `PLANS.monthly` is unconditionally offerable in the new-subscription modal — a draft plan can be sold.

### 3.2 `CADENCE_META` (L4520–4524) ↔ `DB.plans[k].discountPct` / `.eyvarPct`

Exact triple match: weekly `{0, 20}`, biweekly `{5, 18}`, monthly `{10, 15}` — identical to L2890, L2892, L2894.
**Drifts:** `savePlan` persists edited `eyvarPct`/`discountPct` into `DB.plans`; `computeDynamicSubPrice` and `renderNewSubModal` quote from `CADENCE_META`. Changing the commission on the Plans page silently does not change the quoted price.

### 3.3 `CADENCE_DAYS` (L11231) ↔ `DB.plans[k].duration`

Exact: `{weekly:7, biweekly:14, monthly:30}` vs `duration` 7 / 14 / 30 at L2890, L2892, L2894.
**Drifts:** six functions (`buildSubProfile`, `computeDynamicSubPrice`, `finalizeNewSub`, `materializeSubscription`, `renewOptionsFor`, `renderSuccess`) compute the cycle length from the global, never from `DB.plans.duration`.

### 3.4 `REQ_PLAN_LABEL` (L9976) ↔ `DB.plans[k].name` / `PLANS[k].label`

A **fourth** copy of the three plan display names (`'Weekly'`, `'Bi-weekly'`, `'Monthly'`). Read by `materializeSubscription` and `buildSubReqRow`. Renaming a plan requires editing four places.

### 3.5 `PLAN_FEATURES` (L5992–5996) ↔ `DB.plans.weekly.features` (L2891) — **NOT a real duplicate**

The initial literal is byte-identical to weekly's three bilingual features. But `loadPlanEditForm` clears the array (`PLAN_FEATURES.length=0`, L6093) and repopulates it from `DB.plans[currentPlanKey].features` (L6094) every time a plan is opened, and `savePlan` writes it back (L6142). It is a **scratch buffer**, not a stale copy, and it cannot leak one plan's features into another. *(An earlier pass flagged this as a drift risk; reading L6093–6094 rules that out.)*

### 3.6 Platform commission — **five** independent encodings

| Encoding | Line | Value | Consumer |
|---|---|---|---|
| `EYVAR_COMMISSION_PCT` | 3604 | `20` | `subEconomics`, `computeSettlement` |
| `CADENCE_META[k].eyvarPct` | 4521–4523 | 20 / 18 / 15 | `computeDynamicSubPrice`, `renderNewSubModal` |
| `CASH_COMMISSION_RATE` | 12076 | `0.20` | `applyCashDebtImpact` |
| `DB.plans[k].eyvarPct` | 2890–2894 | 20 / 18 / 15 | Plans admin page |
| `DB.rateCard.commission` | 21453 | `{onDemand:22, subscription:20}` | `fareFor`, `planQuote`, `renderPricing` |

`rateCard.commission.subscription = 20` and `plans.monthly.eyvarPct = 15` are in direct contradiction for the monthly plan. Changing the platform take rate requires editing five locations.

### 3.7 `subs` page subtitles (L2169) ↔ live `DB` counts — **already drifted**

`subs[pageId]` is a prose string written verbatim into the DOM by `go()` (L8786) and `refreshNavCounts()` (L9408), with **no recomputation from `DB`**.

| Subtitle claim | Real `DB` value | Line |
|---|---|---|
| `'142 active subscriptions'` | 7 (`DB.subscriptions`) | L2685 |
| `'24 active drivers'` | 6 (`DB.drivers`) | L2631 |
| `'284 registered riders'` | 10 pre-boot, ~55 post-`seedMoreRequests` | L2593 / L9820 |
| `'1,882 trips in June'` | 8 seeded trips | L2670 |
| `'63 on-demand rides today'` | 3 seeded ride requests (+53 at boot) | L2786 / L9847 |
| `'8 expiring in 3 days'` | 1 subscription with `status:'Expiring'` | L2686 |
| `'3 plan templates'` | 3 — **correct** | L2889 |
| `'5 applications'` | 5 — **correct** | L2712 |

Six of eight are wrong at load and every runtime mutation widens the gap.

### 3.8 `MSG_SEGMENTS[].count` (L13733–13739) ↔ derived `DB` counts

Hardcoded audience sizes `8, 8, 5, 3, 142` that should be computed over `DB.drivers`, `DB.subscriptions`, `DB.subBackups` and `DB.driverDocs`. `seg5` reuses the same stale `142`. Nothing recomputes them; `renderBulkMsg`/`sendBulkMsg` display and act on the literal.

### 3.9 `KNOWN_CITIES` (L7819–7832) ↔ `DB.cities` (L13946–13951)

24 records `{name, lat, lng}` vs 4 records `{name, active, launched, seed}`. All four `DB.cities` names appear in the global; only the global carries coordinates. `addCity` (L7886) pushes into `DB.cities` and `removeCity` (L7892) filters it — `KNOWN_CITIES` is never updated. **Drifts:** an operator-added city vanishes from the autocomplete source and gets no coordinates.

### 3.10 `RIDER_NAMES` (L11221) ↔ `DB.riders` (L2593–2630)

A 6-entry first-name → rider-id shortcut mirroring identity that already lives in `DB.riders`. One reader (`resolveFlowRider`). **Drifts** on rename/removal; low blast radius.

### 3.11 `PERMISSION_LABELS` (L3225) + `PERMISSION_DESC` (L3244) + `PAGE_PERMISSIONS[*].legacy` (L10564) ↔ `DB.teamUsers[*].permissions` (L2830–2842)

The globals hold the **vocabulary**; `DB` holds the **grants** — so these are not value copies. The real cost is structural: the 13 permission strings are enumerated in three places (`PERMISSION_LABELS` keys L3226–3238, `PERMISSION_DESC` keys L3245–3257, `PAGE_PERMISSIONS[*].legacy` values), and adding one means touching all three **plus** the seeded `permissions` arrays.

A second-order duplication then appears inside `DB` itself: `defaultPagePerms(u.permissions)` (L10658) derives `u.pagePerms` from `u.permissions` and writes it back onto the user object (L10671, L10695, L10792, L10828). A grant therefore lives in **two `DB` fields** that `toggleRolePermission` and `saveUserPermissions` must keep in step by hand (L10786–L10828).

### 3.12 `WORK_ROUTING` role names (L19090–19102) ↔ `DB.teamUsers[*].role` — **confirmed access-control defect**

`TEAM_ROLES` (L10501) and every seeded user use `'Ops Manager'` (L2839). `WORK_ROUTING` grants ten of its twelve queues to `'Operations'` — a role string that exists nowhere else in the file.

`inboxFiltered()` compares with no normalisation:

```js
if(_inboxRoleFilter)items=items.filter(function(i){
  var roles=WORK_ROUTING[i.type];
  return !roles||roles.indexOf(me.role)>=0;
});
```

With `me.role === 'Ops Manager'`, `roles.indexOf('Ops Manager')` is `-1` for every queue whose only non-Owner grant is `'Operations'`. **Result:** with the default `_inboxRoleFilter=true` (L19086), an Ops Manager sees none of `fairness`, `emergency`, `dispatch`, `absence`, `leg`, `risk`, `coverage`, or `erasure` in the work inbox. Confirmed by reading the function body — this is no longer `UNVERIFIED`.

The same `'Operations'` string also appears as a `DB.compPolicy.roles` key (L15381). `currentRole()` (L15393) returns the raw `u.role`, so an Ops Manager falls through to `roles.default` and gets a 50 SAR per-case goodwill limit instead of the intended 200.

### 3.13 `RIYADH_DISTRICTS` (L7243–7249) ↔ `DB.zones` (L13952–13958)

Overlapping district vocabularies that **already disagree on spelling** — `'Al Malaz District'` vs `'Al Malaz'`, `'Qurtubah District'` vs `'Qurtubah'` — so they cannot be joined by key. The global carries `{x,y}` canvas coords, `DB.zones` carries `{demand, supply, failures30d}`. A zone added to `DB.zones` has no map position.

### 3.14 `TRIP_COORDS` (L11534) / `TRIP_COLORS` (L11551) / `MAP_ROUTES` (L11933) ↔ `DB.trips` + `DB.liveTrips`

Three parallel per-trip tables, all keyed by the same hardcoded seven trip ids (`TRP-7741`, `TRP-7738`, `TRP-7735`, `TRP-7742`, `TRP-9012`, `TRP-9008`, `TRP-9005`). Any trip created at runtime — `completeTrip` mints `'TRP-'+(9100+random(900))` (L11898, L12483), `buildRiderHistory` mints `'TRP-'+(++__histSeq)` from 90 001 (L18752) — has no entry in any of the three and **cannot be drawn, coloured or replayed**.

### 3.15 Three different "now"s

| Global | Line | Value | Advances? |
|---|---|---|---|
| `REQ_NOW_REF` | 9555 | `new Date(2026,5,25,9,14,0)` | **Yes** — +1 simulated minute per tick (L9680) |
| `EYVAR_TODAY` | 11232 | `new Date(2026,5,25)` | No |
| `SEED_EPOCH` | 14628 | `Date.now()` (real wall clock at load) | No |

Date arithmetic in the file is split across all three: document expiry and driver tenure use `REQ_NOW_REF` (L13288, L13592); renewal-pipeline and corporate-invoice dates use `EYVAR_TODAY`; history reconstruction uses `SEED_EPOCH` via `agoMs`. As `REQ_NOW_REF` advances, it silently diverges from `EYVAR_TODAY`, so "days until expiry" and "days until renewal" drift apart during a long session.

### 3.16 `DOC_TYPES` (L13277) ↔ `DB.pendingDrivers[].docs` (L2718)

Not a duplication of `DB.driverDocs` (it generates that shape, §1.7) — but it **conflicts with the application-time checklist**:

| `DOC_TYPES` (active drivers) | `pendingDrivers[].docs` (applicants) |
|---|---|
| `license` | `license` |
| `vehicle_reg` | `vehicle_reg` |
| `inspection` | — |
| `insurance` | `insurance` |
| `operating_card` | — |
| — | `id_card` |
| — | `background` |

`id_card` and `background` are verified at application time and then never tracked; `inspection` and `operating_card` are tracked for expiry but never verified at application time. `approveDriver` (L11113) defaults any missing expiry to one year out (L11109–L11110), so an approved driver always has all five expiry dates regardless of what was checked.

---

## 4. Other findings

### 4.1 Dead globals (declared, zero reads)

| Name | Line | Note |
|---|---|---|
| `NOTIF_PRIORITY_LABEL` | 2189 | The only occurrence in the file is the declaration. Its sibling `NOTIF_PRIORITY_RANK` (L2188) *is* read, but no `DB.notifications` record carries a `priority` field, so the whole priority vocabulary is unused. |
| `DESYNC_THRESHOLD_MS` | 16336 | Declared next to `RIDE_STATE_FLOW`; never read. Desync detection uses `riderAcked:false` instead (L16357). |
| `__origConfirmPlanLeg` | 18204 | Saved before the L18205 monkeypatch; the replacement never calls it. |
| `__origAutoHandoff` | 18218 | Same pattern; the replacement never calls it. |
| `__origCselToggle` | 20703 | Same pattern; the L20704 replacement never calls it. |
| `MAP_FILT` | 11512 | **Write-only** — assigned in `setMapMode` (L11522), read nowhere. |

The four other `__orig*` globals (`__origRecordRefund` L19961, `__origCreditWallet` L19978, `__origDebitWallet` L19992, `__origAcceptEmergency` L20007, `__origReconcileEntity` L20441) *are* called from inside their replacements — those wrappers are functional.

### 4.2 Read only from inline HTML, not from the script

| Name | Declared | Used |
|---|---|---|
| `debouncedRenderRequestsSubAll` | L10174 | L2134 `oninput="debouncedRenderRequestsSubAll(this.value)"` |
| `debouncedRenderRequestsInstantAll` | L10221 | L2155 `oninput="debouncedRenderRequestsInstantAll(this.value)"` |

A script-only "unused global" scan will report these as dead. They are not.

### 4.3 Mutated in place, never reassigned

A naive `grep 'name='` shows zero writers for these six; all are mutated through their reference:

| Name | Line | Mutation |
|---|---|---|
| `navStack` | 2849 | `.push` / `.pop` / `.shift` (L7006, L7014) |
| `_carMarkers` | 11530 | `_carMarkers[t.id]=…` (L11599) |
| `_routeLines` | 11531 | `_routeLines[t.id]=…` (L11592) |
| `_docExpiryEditing` | 10993 | `[appId]=` (L11024, L11041) |
| `_pagePermExpanded` | 10706 | `[pageKey]=` (L10708) |
| `_execTrendDragState` | 6884 | `.isDown=` / `.box=` (L6895, L6897) |
| `PLAN_FEATURES` | 5992 | `.length=0`, `.push`, `.splice` (L6031, L6038, L6045, L6093) |

### 4.4 Shadowing hazard

The global `subs` (L2169) is shadowed by a local `var subs=` in **five** functions: `renderCoveragePage` L13148, `renderCapacityGrid` L13241, `erasureBlockers` L15966, `entityDerived` L18503, `fleetCounts` L20921. Of the 69 `subs` occurrences in the file, only 2 refer to the global. Renaming the global is safe only after checking those five.

### 4.5 Filter / sort state — 21 globals, one shape

`_notifPageFilter` (2291), `_driverTierFilter` (6337), `AUDIT_FILTER_ACTOR` / `AUDIT_FILTER_ACTION` / `AUDIT_SEARCH` / `AUDIT_PAGE` / `AUDIT_PAGE_SIZE` (9225–9229), `_reqFilter` (9883), `_reqSubSortByValue` (9884), `REQ_ALL_PAGE_SIZE` (9886), `_reqSubAllPage` (9887), `_reqInstantAllPage` (9888), `_coverageFilter` (13145), `_complianceFilter` (13318), `_safetyFilter` (13395), `_zonesFilter` (14129), `_commitFilter` (16834), `_inboxTab` (19085), `_inboxRoleFilter` (19086), `_renewalFilter` (20560), `_driverFilter` (21221), `MAP_FILT` (11512).

Every one follows the same pattern: a single `filterX()` / `setX()` setter, a single `renderX()` reader, no persistence, reset to the declared literal on reload. Seven of them default to the string `'all'`.

### 4.6 Timer and interval handles — 5

`_rrTrackInterval` (2501), `_subTrackInterval` (4786), `replayAnim` (11943), `_selResizeTimer` (14519), plus the tick engine's own guard `__tickStarted` (11953). `_pendingRing` (20242) and `_activeCall` (20176) hold call objects with associated tickers. None is cleared on page teardown — there is no teardown path in a single-file app.

### 4.7 Two disjoint confirm-dialog registries

| Registry | Line | Entries | Value shape | Installer |
|---|---|---|---|---|
| `GATE_SPECS` | 18245 | 18 | factory functions returning a spec | `installUniversalGates` L18372 |
| `GATE_SWEEP` | 20769 | 47 | plain `{t,d,s,c[],btn}` objects | `installGateSweep` |

**Key-set intersection is empty** (verified). No action is double-gated. `GATE_SPECS` covers workflow commits; `GATE_SWEEP` covers settings-save actions.

### 4.8 Lifecycle summary

Nothing on this page is persisted. There is no `localStorage`, `sessionStorage`, `IndexedDB`, cookie, or network write anywhere in the script region — every global and every `DB` collection resets to its declared literal on reload. `SEED_EPOCH = Date.now()` (L14628) is the only value that differs between two loads of the same file.

---

## 5. UNVERIFIED items

| # | Item | Why |
|---|---|---|
| 1 | Indented `let`/`const` inside function bodies | Out of scope for a module-scope inventory; only column-0/1 declarations were enumerated. The claim "zero `let`/`const`" applies to module scope only. |
| 2 | Exact reader counts for `CURRENT_USER_ID` beyond the 81 sites found | Counted by identifier-token scan; template-literal or string-embedded references would not be caught. |
| 3 | `GATE_SWEEP`'s 47 entries were not individually enumerated | Only the key set was extracted, for the intersection test against `GATE_SPECS`. |
| 4 | `LANG_STRINGS.ar` completeness against the English UI | 88 dotted keys were counted but not diffed against the set of translatable strings actually rendered. |
| 5 | `SCRIPT_LIBRARY`'s 24 script keys vs `DB.reasonCodes[].ref` | The keys look like guide section references (`'1.1'`…) matching `reasonCodes[].ref`, but the correspondence was not exhaustively checked. |
| 6 | Whether any `__orig*` wrapper is installed twice | Re-entrant monkeypatching would capture a wrapper as the "original"; not tested. |
| 7 | Whether `_lmap` / `_carMarkers` / `_routeLines` leak Leaflet layers across map re-inits | `initLeafletMap` L11573 reassigns `_lmap`, but whether the two marker caches are cleared first was not read. |
