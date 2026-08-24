# Global: Identity, Permissions & Audit

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Primary line ranges:** identity & My Account `L2830–L3131`; RBAC core `L3122–L3131`; audit core `L3133–L3178`; action labels `L2898–L2913`; permission vocabulary `L3225–L3257`; granular page permissions `L10540–L10745`; role matrix + team management `L10451–L10835`; audit-log viewer `L9224–L9352`; impersonation `L21020–L21100`; markup `L545`, `L564`, `L578`, `L1151–L1170`, `L1533–L1549`, `L2051–L2065`

---

## 1. Purpose

Three interlocking global systems that together answer "who is acting, what may they do, and what did they do":

1. **Identity / acting user** — a single module-scope variable `CURRENT_USER_ID` (`L2862`) names the operator whose permissions every guard consults. Two independent mechanisms change it (see §2.2).
2. **Permissions (RBAC)** — two layers: a flat 13-key **broad** permission vocabulary (`PERMISSION_LABELS`, `L3225`) enforced by `can()`/`requirePerm()`, and a 52-key **granular page-action** layer (`PAGE_PERMISSIONS`, `L10564`) enforced by `canPage()`/`requirePagePerm()`.
3. **Audit log** — `logAction()` (`L3133`) appends an entry to `DB.auditLog`, rendered by the Activity Log page (`p-audit-log`, `L2051`) and a 4-row preview inside Settings (`L2015`).

The file states the design intent explicitly at `L3117–L3121`:
> "One choke point per action, placed on the COMMIT function (the line that actually mutates DB), never on buttons — so every UI path (dashboard card, unified picker, profile page, modal) hits the same wall. A denial is itself a real security event, so it IS audit-logged."

---

## 2. Mechanism / how it works

### 2.1 The acting-user variable

| Item | Line | Detail |
|---|---|---|
| `var CURRENT_USER_ID='USR-1'` | `L2862` | Module-scope `var`, not persisted. Every reload resets to Sarah Al-Rashid (Owner). |
| `DB.teamUsers` | `L2830–L2841` | Array of 5 operator records — the only identity store. |
| `currentUserName()` | `L9651–L9654` | `DB.teamUsers.find(id===CURRENT_USER_ID)` → `.name`, else literal `'Ops'`. |
| `avatarOrInitials(u,size)` | `L2915–L2919` | If `u.photo` → `<img>` at `size`px, `border-radius:50%`, `object-fit:cover`. Else a `var(--navy)` circle with up to 2 uppercase initials from `u.name.split(' ')`, font-size `Math.round(size*0.33)`. |
| `nm2(id)` | `L3565` | Resolves **rider/driver** ids only (`DB.riders[id]||DB.drivers[id]`) — see §9 F6. |
| `window.__realUserId` | `L21070`, `L21082`, `L21083` | Set by `impersonate()`, cleared by `stopImpersonating()`. Undeclared until first impersonation. |

Reads of `CURRENT_USER_ID` appear in `can()` (`L3123`), `logAction()` (`L3134`, `L3138`), `renderMaProfile()` (`L2924`), `renderMaSecurity()` (`L3005`), `renderMaPermissions()` (`L3066`), `handleAvatarUpload()` (`L2954`), `removeAvatar()` (`L2965`), `saveMaProfile()` (`L2974`), `changeMaPassword()` (`L3043`), `toggleMa2FA()` (`L3048`), `logOutSession()` (`L3057`, `L3061`), `openUserSwitch()` (`L3091`), `commitUserSwitch()` (`L3101`, `L3103`, `L3106`), `currentUserPagePerms()` (`L10669`), `toggleRolePermission()` (`L10780`), `saveUserPermissions()` (`L10819`), `renderTeamTable()` (`L10459`, `L10460`), `renderImpersonationBar()` (`L21039`, `L21040`, `L21046`, `L21047`), `impersonate()` (`L21070`, `L21073`), `stopImpersonating()` (`L21081`, `L21082`, `L21086`).

### 2.2 Two parallel, non-cooperating switch mechanisms

**Mechanism A — "Act as team member" (avatar / My Account).**

| Function | Line | Behaviour |
|---|---|---|
| `openUserSwitch()` | `L3088–L3097` | Builds the modal into `#modal-content`, opens `#modal-overlay`. Lists **all** `DB.teamUsers` as `.plan-option` rows carrying `data-usr="<id>"`. The current user's row gets `selected` + a `<span class="b b-blue">current</span>` badge. Rows with `status==='Invited'` get `style="opacity:.5"`, a `<span class="b b-grey">invited — no login yet</span>` badge, a **disabled** radio, and **no** `onclick`. Sub-line: `u.role + ' · ' + (u.permissions||[]).length + ' permissions'`. |
| `commitUserSwitch()` | `L3098–L3113` | Reads `#modal-box .plan-option.selected` → `data-usr`. No-ops (closes modal) if unresolvable or unchanged. Rejects `status==='Invited'` with toast `'That member has not logged in yet'` (`err`). Otherwise: `logAction('switch_user','team_user',nu.id, 'Now acting as '+name+' ('+role+')', {actingAs:oldName}, {actingAs:newName})`, then `CURRENT_USER_ID=nu.id`, updates `#sb-ft-name` (name), `#sb-ft-role` (`role + ' · settings ▾'`), `#tb-avatar` (initials as **textContent**), closes the modal, re-renders the audit log if present, toasts `'👁 Now acting as … — <role>'` (`info`). |
| `openUserSwitchGuardless()` | `L3114` | **VERIFIED: an entirely empty function body — `function openUserSwitchGuardless(){}`.** Zero call sites anywhere in the file (only the declaration matches on grep). Dead code. |

Entry points to Mechanism A: top-bar avatar `<div class="avatar" id="tb-avatar" … onclick="openUserSwitch()">SA</div>` (`L578`), and the My Account permissions panel button `👁 Act as another team member` (`L3085`).

**Mechanism B — "View as" impersonation (Settings → Team table).**

| Function | Line | Behaviour |
|---|---|---|
| `effectivePermissions(userId)` | `L21027–L21034` | Returns `{user, granted[], denied[], total}` computed against `Object.keys(PERMISSION_LABELS)` (13). Returns `null` for unknown id. |
| `renderImpersonationBar()` | `L21035–L21048` | Targets `#impersonation-bar`. If `!window.__realUserId \|\| __realUserId===CURRENT_USER_ID` → `display:none`. Else `display:flex` and injects: `👁 Viewing as <b>NAME</b> · ROLE — N of 13 permissions`, plus buttons `What they can do` → `showEffectivePermissions(CURRENT_USER_ID)` and `Back to my account` → `stopImpersonating()`. |
| `showEffectivePermissions(userId)` | `L21049–L21068` | Modal listing every granted permission with `✓` and every denied one with `✕`, both via `PERMISSION_LABELS[k]\|\|k`. Empty-granted copy: *"None — this account can only read."* |
| `impersonate(userId)` | `L21069–L21079` | Stashes `window.__realUserId` (first time only), sets `CURRENT_USER_ID=userId`, logs `impersonation_started` (entityType `'permission'`), re-renders the bar, calls `renderSidebarPerms()` **behind a `typeof` guard**, navigates `go('dashboard',null)`, toasts. |
| `stopImpersonating()` | `L21080–L21090` | Returns to `__realUserId`, nulls it, logs `impersonation_ended`, re-renders bar, `go('dashboard',null)`, toast `'Back to your own account'` (`ok`). |
| `guardAction('impersonate', …)` | `L21090–L21098` | Registers the confirm-gate copy: title *"View the panel as NAME"*, consequences list of 3 (see §6.2). |
| `fixesBoot()` | `L21156–L21159` | Calls `renderImpersonationBar()` on boot (bar starts hidden). |

The bar markup: `L564` — `<div id="impersonation-bar" style="display:none;position:fixed;top:0;left:0;right:0;z-index:80;background:var(--amber);color:#1A1A18;padding:7px 16px;gap:12px;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,.12)"></div>`.

### 2.3 Broad permission enforcement

```js
can(permKey)                                            // L3122–L3125
  var u = DB.teamUsers.find(x => x.id === CURRENT_USER_ID);
  return !!(u && u.permissions && u.permissions.indexOf(permKey) >= 0);

requirePerm(permKey)                                    // L3126–L3132
  if (can(permKey)) return true;
  var lbl = PERMISSION_LABELS[permKey] || permKey;
  logAction('permission_denied','permission',permKey,
            'Blocked — tried "'+lbl+'" without permission');
  toast('🔒 Your role lacks permission: '+lbl,'err');
  return false;
```

`can()` is a pure predicate with no side effects. `requirePerm()` is the enforcing wrapper: it **blocks, explains, and audits**. Note it passes only 4 arguments, so `before`/`after` are `undefined` → normalised to `null` at `L3145–L3146`, and `auditDiffHTML(null,null)` returns `''` (`L3158`).

### 2.4 Granular page-permission enforcement

```js
defaultPagePerms(broadPerms)   // L10659–L10668
  for each pageKey in PAGE_PERMISSIONS:
    unlocked = !pg.legacy || broadPerms.includes(pg.legacy)
    out[pageKey] = unlocked ? all perm keys : ['view']

currentUserPagePerms()         // L10669–L10673   lazily materialises u.pagePerms
canPage(pageKey,permKey)       // L10674–L10677   grants.indexOf(permKey) >= 0
requirePagePerm(pageKey,perm)  // L10680–L10688   block + toast + logAction('permission_denied', …)
```

`requirePagePerm` denial detail (`L10682–L10686`): label is composed as `pg.label + ' — ' + permDef.label`; toast is `'🔒 Your role lacks permission: '+label` (`err`); audit summary is `'Blocked: '+currentUserName()+' lacks "'+label+'"'`; `entityType` is `'permission'` and `entityId` is `pageKey+'.'+permKey` (dot-joined — different from `requirePerm`, which uses the bare key).

### 2.5 Audit record creation

```js
logAction(actionKey, entityType, entityId, summary, before, after)   // L3133–L3155
  actor = DB.teamUsers.find(u => u.id === CURRENT_USER_ID)
  entry = {
    id:         'AUD-' + String(DB.auditLog.length+1).padStart(4,'0'),
    ts:         new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    actorId:    CURRENT_USER_ID,
    actorName:  actor ? actor.name : CURRENT_USER_ID,
    action:     actionKey,
    entityType: entityType,
    entityId:   entityId,
    summary:    summary,
    before:     before || null,
    after:      after  || null
  }
  DB.auditLog.unshift(entry)
  if (DB.auditLog.length > 500) DB.auditLog.length = 500     // hard cap, oldest dropped
  if (typeof renderAuditLog === 'function') renderAuditLog()
  return entry
```

`auditDiffHTML(before,after)` (`L3156–L3172`) — three branches:
- `!after` → `''`.
- `!before` (creation) → `key: value` for every key of `after`, joined ` · `.
- both present → for each key of `after`: if `before` lacks the key, `key: value`; else if values differ, `key: <s>old</s> → new`. Keys present in `before` but absent from `after` are **never shown**. If nothing differs → `''`.

Output wrapper: `<div class="aud-diff">…</div>`.

---

## 3. Complete enumerations

### 3.1 `DB.teamUsers` — all 5 operator records (`L2830–L2841`)

| id | name | email | phone | photo | role | lastLogin | status | twoFA | perms |
|---|---|---|---|---|---|---|---|---|---|
| `USR-1` | Sarah Al-Rashid | sarah@eyvar.com | +966 50 123 4567 | `null` | Owner | Today 09:00 | Active | `true` | 13 |
| `USR-2` | Fahad Al-Dosari | fahad@eyvar.com | +966 55 222 8890 | `null` | Finance | Today 08:45 | Active | `false` | 5 |
| `USR-3` | Lina Al-Otaibi | lina@eyvar.com | +966 54 771 3320 | `null` | Support | 24 Jun | Active | `false` | 3 |
| `USR-4` | Noura Al-Fahad | noura.f@eyvar.com | +966 56 990 1145 | `null` | Support | Not yet | **Invited** | `false` | 3 |
| `USR-5` | Yousef Al-Balawi | yousef@eyvar.com | +966 53 410 7762 | `null` | Ops Manager | Today 08:10 | Active | `true` | 8 |

Exact permission arrays:
- `USR-1`: `approve_drivers, manage_subscriptions, live_ops, manage_plans, view_finance, process_payouts, release_escrow, apply_deductions, manage_tickets, view_profiles, contact_users, manage_team, manage_settings`
- `USR-2`: `process_payouts, release_escrow, apply_deductions, view_finance, view_profiles`
- `USR-3`: `manage_tickets, view_profiles, contact_users`
- `USR-4`: `manage_tickets, view_profiles, contact_users`
- `USR-5`: `approve_drivers, manage_subscriptions, live_ops, manage_plans, view_finance, manage_tickets, view_profiles, contact_users`

`var TEAM_ROLES=['Owner','Ops Manager','Finance','Support']` (`L10501`) — the four selectable roles in the invite/edit modals.

### 3.2 `PERMISSION_LABELS` — all 13 broad keys (`L3225–L3239`)

| # | Key | Label |
|---|---|---|
| 1 | `approve_drivers` | Approve / reject driver applications |
| 2 | `manage_subscriptions` | Manage subscriptions & renewals |
| 3 | `live_ops` | Live map operations & intervention |
| 4 | `manage_plans` | Create / edit pricing plans |
| 5 | `view_finance` | View financial reports |
| 6 | `process_payouts` | Process driver payouts |
| 7 | `release_escrow` | Release subscription escrow |
| 8 | `apply_deductions` | Apply / waive deductions |
| 9 | `manage_tickets` | Manage support tickets |
| 10 | `view_profiles` | View rider / driver 360° profiles |
| 11 | `contact_users` | Call / message riders & drivers |
| 12 | `manage_team` | Invite / edit team & permissions |
| 13 | `manage_settings` | Manage system settings & configuration |

### 3.3 `PERMISSION_DESC` — all 13 descriptions (`L3244–L3257`, one overwritten at `L10520`)

| Key | Description |
|---|---|
| `approve_drivers` | Review submitted documents and bank details, then approve or reject driver applications. |
| `manage_subscriptions` | Create new subscriptions, change the assigned driver, freeze a plan, or cancel & refund. |
| `live_ops` | Open the live map and step into an active trip — reroute, flag, or cancel it while it is happening. |
| `manage_plans` | Create, edit, or archive subscription pricing plans and their trip allowances. |
| `view_finance` | See revenue, payout, and escrow reports. Read-only — does not move any money. |
| `process_payouts` | Release a driver's earned balance to their wallet and mark payouts as paid. |
| `release_escrow` | Release funds held in escrow once a subscription cycle is confirmed complete. |
| `apply_deductions` | Apply or waive a deduction against a driver's upcoming payout, e.g. for a complaint. |
| `manage_tickets` | Open, assign, and resolve support tickets raised by riders or drivers. |
| `view_profiles` | Open any rider or driver's full 360° profile — trip history, documents, payments. |
| `contact_users` | Call or message a rider or driver directly from their profile. |
| `manage_team` | *(initial, `L3255`)* Invite team members, change their role, and edit the role permission matrix itself. — **reassigned at `L10520`** to: `Add or edit team members, change roles, and grant or revoke any permission — including this one.` |
| `manage_settings` | Change system-wide configuration — cities, dispatch radius, payment gateways, operational limits, branding, and more. |

`PERMISSION_DESC.manage_team` is mutated at module-evaluation time by a bare statement at `L10520`, so only the second string is ever displayed.

### 3.4 `PAGE_PERMISSIONS` — all 22 pages, all 52 granular keys (`L10564–L10651`)

| Page key | Label | Icon | `legacy` gate | Granular perms (`key` — label) |
|---|---|---|---|---|
| `dashboard` | Dashboard | 📊 | `null` | `view` — View dashboard |
| `requests` | Requests | 📋 | `live_ops` | `view` — View requests · `assign` — Manually assign a driver · `cancel` — Cancel a request |
| `subscriptions` | Subscriptions | 📦 | `manage_subscriptions` | `view` — View subscriptions · `change_driver` — Change a subscription's driver · `settle` — Early-termination settlement |
| `quickrides` | Quick Rides | ⚡ | `live_ops` | `view` — View quick rides |
| `trips` | All Trips | 🚕 | `live_ops` | `view` — View trip history |
| `renewal` | Renewal Pipeline | ↻ | `manage_subscriptions` | `view` — View renewal pipeline |
| `readiness` | Trip Readiness | ⏱️ | `manage_subscriptions` | `view` — View trip readiness · `resolve` — Reassign an unavailable driver |
| `live` | Live Map | 🗺️ | `live_ops` | `view` — View live map · `intervene` — Intervene on a live trip · `cancel_trip` — Cancel a live trip |
| `drivers` | Drivers | 🚗 | `approve_drivers` | `view` — View driver roster · `approve` — Approve / reject applications · `contact` — Call / message drivers |
| `riders` | Riders | 👤 | `view_profiles` | `view` — View rider list · `contact` — Call / message riders |
| `coverage` | Coverage & Capacity | 🛡️ | `manage_subscriptions` | `view` — View coverage · `assign_backup` — Assign backup captain · `promote_backup` — Promote backup to primary |
| `compliance` | Fleet Compliance | 📑 | `approve_drivers` | `view` — View compliance · `edit_dates` — Edit document expiry dates |
| `safety` | Safety & Incidents | 🚨 | `approve_drivers` | `view` — View incidents · `update_steps` — Update protocol steps · `suspend` — Precautionary suspend a driver · `close` — Close an incident |
| `growth` | Promos & Growth | 📈 | `manage_plans` | `view` — View campaigns & incentives · `create_promo` — Create promo codes · `pause_promo` — Pause / resume a promo · `send_message` — Send bulk messages · `recalc_tiers` — Recalculate driver tiers |
| `zones` | Zones | 🗺️ | `live_ops` | `view` — View zones · `steer` — Send a driver-steering offer |
| `predictive` | Predictive Signals | 🔮 | `manage_subscriptions` | `view` — View predictive signals · `act` — Trigger a retention action |
| `finance` | Finance | 💰 | `view_finance` | `view` — View financial reports |
| `wallets` | Driver Wallets | 💳 | `process_payouts` | `view` — View payouts & escrow · `process_payouts` — Process driver payouts · `release_escrow` — Release subscription escrow · `apply_deductions` — Apply / waive deductions · `cash_review` — Review / escalate cash reconciliation · `cash_repayment` — Record a driver cash-debt repayment |
| `plans` | Plans | 📄 | `manage_plans` | `view` — View plans · `edit` — Create / edit plans & feature lists |
| `support` | Support Center | 🎧 | `manage_tickets` | `view` — View tickets, disputes & lost-and-found · `manage` — Resolve tickets & disputes |
| `settings` | Settings & Team | ⚙️ | `manage_team` | `view` — View settings · `manage_team` — Manage team & this permission matrix |
| `audit-log` | Activity Log | 🕵️ | `null` | `view` — View activity log |

**Totals: 22 pages · 52 granular permission keys · 2 pages with no legacy gate (`dashboard`, `audit-log`).**

### 3.5 `ACTION_LABELS` — the complete map, all 26 entries (`L2898–L2913`)

> The task brief names this `DB.actionLabels`. **There is no `DB.actionLabels`.** The map is a module-scope `var ACTION_LABELS` at `L2898`. Grep for `actionLabels` returns nothing.

| # | Action key | Label |
|---|---|---|
| 1 | `assign_driver` | Assign driver |
| 2 | `change_driver` | Change driver |
| 3 | `create_subscription` | Create subscription |
| 4 | `freeze_subscription` | Freeze subscription |
| 5 | `cancel_subscription` | Cancel subscription |
| 6 | `edit_team_user` | Edit team member |
| 7 | `invite_team_user` | Invite team member |
| 8 | `toggle_role_permission` | Role permission change |
| 9 | `edit_user_permissions` | Edit user permissions |
| 10 | `approve_driver` | Approve driver |
| 11 | `reject_driver` | Reject driver |
| 12 | `reconsider_applicant` | Reconsider applicant |
| 13 | `reassign_driver` | Reassign driver |
| 14 | `process_all_payouts` | Process all payouts |
| 15 | `release_escrow` | Release escrow |
| 16 | `apply_deduction` | Apply deduction |
| 17 | `pay_driver` | Pay driver |
| 18 | `reject_document` | Reject document |
| 19 | `cancel_live_trip` | Cancel live trip |
| 20 | `manual_assign` | Manual assign |
| 21 | `cancel_ride_request` | Cancel ride request |
| 22 | `activate_plan` | Activate plan |
| 23 | `deactivate_plan` | Deactivate plan |
| 24 | `permission_denied` | Permission denied (blocked) |
| 25 | `switch_user` | Switched acting user |
| 26 | `export_data` | Exported data |

**The only consumer of `ACTION_LABELS` anywhere in the file is `L9238`**, which builds the *"All action types"* filter dropdown on the Activity Log page:

```js
var aopts=[{value:'',label:'All action types'}].concat(
  Object.keys(ACTION_LABELS).map(a => ({value:a,label:ACTION_LABELS[a]})));
```

Audit **rows** never render the label — `auditRowsHTML()` (`L9295–L9305`) prints `e.summary` verbatim. So a missing label does not break rendering; it makes the action **invisible to the filter**.

### 3.6 Seeded `DB.auditLog` — all 8 rows (`L2863–L2872`)

| id | ts | actorId / actorName | action | entityType | entityId | before → after |
|---|---|---|---|---|---|---|
| `AUD-0008` | 25 Jun, 08:14 AM | USR-1 Sarah Al-Rashid | `assign_driver` | trip | `UST-1` | `{driver:'—'}` → `{driver:'Ahmed Salem',distance:'1.9 km'}` |
| `AUD-0007` | 24 Jun, 04:45 PM | USR-2 Fahad Al-Dosari | `apply_deduction` | driver | `DRV-0103` | `{status:'pending'}` → `{status:'applied',amount:'20.00 SAR'}` |
| `AUD-0006` | 23 Jun, 09:30 AM | USR-1 Sarah Al-Rashid | `invite_team_user` | team_user | `USR-4` | `null` → `{name,email,role:'Support',status:'Invited'}` |
| `AUD-0005` | 22 Jun, 06:15 PM | USR-2 Fahad Al-Dosari | `process_all_payouts` | finance | `''` | `{pendingTotal:'8,200.00 SAR'}` → `{pendingTotal:'0.00 SAR',driversProcessed:3}` |
| `AUD-0004` | 22 Jun, 05:50 PM | USR-2 Fahad Al-Dosari | `release_escrow` | driver | `DRV-0101` | `{escrowStatus:'held (ESC-1035)'}` → `{escrowStatus:'released',addedToPending:'86.50 SAR'}` |
| `AUD-0003` | 21 Jun, 02:15 PM | USR-1 Sarah Al-Rashid | `approve_driver` | driver | `DRV-0138` | `{status:'pending'}` → `{status:'approved',driverId:'DRV-0138'}` |
| `AUD-0002` | 21 Jun, 11:00 AM | USR-1 Sarah Al-Rashid | `edit_user_permissions` | team_user | `USR-3` | `{permissions:'0 permissions'}` → `{permissions:'3 permissions'}` |
| `AUD-0001` | 20 Jun, 03:40 PM | USR-2 Fahad Al-Dosari | `pay_driver` | driver | `DRV-0101` | `{pending:'2,200.00 SAR'}` → `{pending:'0.00 SAR',paidOut:'2,200.00 SAR'}` |

Seeded `ts` values are full date-and-time strings (`'25 Jun, 08:14 AM'`); runtime `ts` values are **time-only** (`toLocaleTimeString`, `L3137`). The two formats never reconcile.

### 3.7 `DB.loginSessions` — all 5 seeded sessions (`L2996–L3003`)

| Owner | id | device | location | ip | lastActive | current |
|---|---|---|---|---|---|---|
| USR-1 | `SESS-1` | Chrome on macOS | Riyadh, SA | 92.96.7.40 | Active now | `true` |
| USR-1 | `SESS-2` | Claude Ops app · iPhone | Riyadh, SA | 92.96.14.201 | 2 hours ago | `false` |
| USR-1 | `SESS-3` | Chrome on Windows | Jeddah, SA | 185.45.30.7 | 3 days ago | `false` |
| USR-2 | `SESS-4` | Chrome on Windows | Riyadh, SA | 92.96.18.92 | Active now | `true` |
| USR-3 | `SESS-5` | Safari on macOS | Riyadh, SA | 46.31.20.18 | Active now | `true` |
| USR-4 | *(empty array)* | — | — | — | — | — |

`USR-5` (Yousef, Ops Manager) has **no key at all** in `DB.loginSessions` — `DB.loginSessions[u.id]||[]` (`L3007`) falls back to `[]`, so his Security panel shows *"No other sessions."* despite `lastLogin:'Today 08:10'`.

---

## 4. Matrices

### 4.1 Role × broad permission (derived from `DB.teamUsers`, `L2830–L2841`)

Roles are **not** first-class objects — `renderRoleMatrix()` (`L10750`) and `renderPagePermMatrix()` (`L10715`) derive the role list at render time from `DB.teamUsers.map(u=>u.role)` deduped. A cell is checked only when **every** current holder of that role has the key (`allHave`, `L10761`); mixed holders render an `indeterminate` checkbox via `data-mixed="1"` (`L10763`, `L10771`).

| Permission | Owner (USR-1) | Ops Manager (USR-5) | Finance (USR-2) | Support (USR-3, USR-4) |
|---|:---:|:---:|:---:|:---:|
| `approve_drivers` | ✅ | ✅ | ✕ | ✕ |
| `manage_subscriptions` | ✅ | ✅ | ✕ | ✕ |
| `live_ops` | ✅ | ✅ | ✕ | ✕ |
| `manage_plans` | ✅ | ✅ | ✕ | ✕ |
| `view_finance` | ✅ | ✅ | ✅ | ✕ |
| `process_payouts` | ✅ | ✕ | ✅ | ✕ |
| `release_escrow` | ✅ | ✕ | ✅ | ✕ |
| `apply_deductions` | ✅ | ✕ | ✅ | ✕ |
| `manage_tickets` | ✅ | ✅ | ✕ | ✅ |
| `view_profiles` | ✅ | ✅ | ✅ | ✅ |
| `contact_users` | ✅ | ✅ | ✕ | ✅ |
| `manage_team` | ✅ | ✕ | ✕ | ✕ |
| `manage_settings` | ✅ | ✕ | ✕ | ✕ |
| **Total granted** | **13 / 13** | **8 / 13** | **5 / 13** | **3 / 13** |

No role has *mixed* holders in the seed data (USR-3 and USR-4 have identical arrays), so every Support cell renders fully checked or fully unchecked, never indeterminate.

### 4.2 Role × granular page permission (computed by `defaultPagePerms()`, `L10659`)

`u.pagePerms` is **absent from every seeded user** and is materialised lazily on first read (`L10671`, `L10692`, `L10727`, `L10763`). Under `defaultPagePerms`, a page's full action set unlocks iff `!pg.legacy || broadPerms.includes(pg.legacy)`; otherwise the user gets exactly `['view']`.

| Page (legacy gate) | Owner | Ops Manager | Finance | Support |
|---|---|---|---|---|
| `dashboard` (—) | all (1) | all (1) | all (1) | all (1) |
| `audit-log` (—) | all (1) | all (1) | all (1) | all (1) |
| `requests` (`live_ops`) | all (3) | all (3) | view only | view only |
| `quickrides` (`live_ops`) | all (1) | all (1) | view only | view only |
| `trips` (`live_ops`) | all (1) | all (1) | view only | view only |
| `live` (`live_ops`) | all (3) | all (3) | view only | view only |
| `zones` (`live_ops`) | all (2) | all (2) | view only | view only |
| `subscriptions` (`manage_subscriptions`) | all (3) | all (3) | view only | view only |
| `renewal` (`manage_subscriptions`) | all (1) | all (1) | view only | view only |
| `readiness` (`manage_subscriptions`) | all (2) | all (2) | view only | view only |
| `coverage` (`manage_subscriptions`) | all (3) | all (3) | view only | view only |
| `predictive` (`manage_subscriptions`) | all (2) | all (2) | view only | view only |
| `drivers` (`approve_drivers`) | all (3) | all (3) | view only | view only |
| `compliance` (`approve_drivers`) | all (2) | all (2) | view only | view only |
| `safety` (`approve_drivers`) | all (4) | all (4) | view only | view only |
| `growth` (`manage_plans`) | all (5) | all (5) | view only | view only |
| `plans` (`manage_plans`) | all (2) | all (2) | view only | view only |
| `riders` (`view_profiles`) | all (2) | all (2) | all (2) | all (2) |
| `finance` (`view_finance`) | all (1) | all (1) | all (1) | view only |
| `wallets` (`process_payouts`) | all (6) | view only | all (6) | view only |
| `support` (`manage_tickets`) | all (2) | all (2) | view only | all (2) |
| `settings` (`manage_team`) | all (2) | view only | view only | view only |

Because **`view` is granted to everyone on every page unconditionally** (`L10653–L10658`: *"Every page defaults to at least 'view' for everyone (nothing in this panel is hidden-by-default)"*), all 22 `view` keys are granted to all 4 roles.

### 4.3 Enforced vs. declared granular permissions

All 20 `requirePagePerm()` call sites (`L11052`, `L12148`, `L12189`, `L13188`, `L13227`, `L13449`, `L13466`, `L13476`, `L13529`, `L13530`, `L13550`, `L13634`, `L13752`, `L14004`, `L14024`, `L14257`, `L14273`, `L14433`, `L14469`) cover **15 distinct** page.perm pairs:

| Enforced pair | Call site line(s) | Guarded function |
|---|---|---|
| `compliance.edit_dates` | `L11052` | `openDocDateEditor` |
| `wallets.cash_review` | `L12148` | `resolveCashEntry` |
| `wallets.cash_repayment` | `L12189` | `recordCashRepayment` |
| `coverage.assign_backup` | `L13188` | `assignBackup` |
| `coverage.promote_backup` | `L13227` | `promoteBackup` |
| `safety.update_steps` | `L13449` | *(incident step handler)* |
| `safety.suspend` | `L13466` | `precautionSuspend` |
| `safety.close` | `L13476` | *(close-incident handler)* |
| `growth.pause_promo` | `L13529`, `L13530` | `pausePromo`, `resumePromo` |
| `growth.create_promo` | `L13550` | *(new-promo commit)* |
| `growth.recalc_tiers` | `L13634` | *(tier recalculation)* |
| `growth.send_message` | `L13752` | `sendBulkMsg` |
| `zones.steer` | `L14004`, `L14024` | `openSteerOffer` + commit |
| `predictive.act` | `L14257`, `L14273` | `openRetentionAction` + commit |
| `support.manage` | `L14433`, `L14469` | `resolveDispute` + one other |

**37 of the 52 declared granular keys (71%) are never enforced anywhere.** The full unenforced list:

*All 22 `view` keys* — `dashboard.view`, `requests.view`, `subscriptions.view`, `quickrides.view`, `trips.view`, `renewal.view`, `readiness.view`, `live.view`, `drivers.view`, `riders.view`, `coverage.view`, `compliance.view`, `safety.view`, `growth.view`, `zones.view`, `predictive.view`, `finance.view`, `wallets.view`, `plans.view`, `support.view`, `settings.view`, `audit-log.view`

*Plus 15 action keys* — `requests.assign`, `requests.cancel`, `subscriptions.change_driver`, `subscriptions.settle`, `readiness.resolve`, `live.intervene`, `live.cancel_trip`, `drivers.approve`, `drivers.contact`, `riders.contact`, `wallets.process_payouts`, `wallets.release_escrow`, `wallets.apply_deductions`, `plans.edit`, `settings.manage_team`

The 15 unenforced *action* keys are not entirely unguarded — the equivalent operations are gated by the **broad** layer instead (e.g. `subscriptions.change_driver` is unenforced but `commitDriverChange` calls `requirePerm('manage_subscriptions')` at `L5810`). The 22 `view` keys, however, are enforced **nowhere at all**: `canPage()` has exactly two call sites (its own declaration `L10674` and `requirePagePerm` `L10681`), and no navigation, sidebar, or `go()` path consults it.

---

## 5. Coverage analysis / gaps in the matrix

### 5.1 Pages with NO entry in `PAGE_PERMISSIONS`

The panel contains **41 page shells** — 40 matching `class="page" id="p-…"` plus `p-dashboard` at `L676` which carries `class="page on"`. `PAGE_PERMISSIONS` covers 22 of them. **19 pages have no entry in the permission matrix at all:**

| # | Page id | Markup line | Title (`titles` map, `L2168`) |
|---|---|---|---|
| 1 | `p-exec-overview` | `L583` | Executive Overview |
| 2 | `p-corporate` | `L634` | Corporate Accounts |
| 3 | `p-corp-detail` | `L644` | Corporate Account |
| 4 | `p-fraud` | `L650` | Fraud & Risk |
| 5 | `p-rwallets` | `L1020` | Rider Wallets |
| 6 | `p-plan-edit` | `L1082` | Edit Plan |
| 7 | `p-my-account` | `L1151` | My Account |
| 8 | `p-notifications-all` | `L1171` | Notifications |
| 9 | `p-all-pending` | `L1324` | All Pending Applications |
| 10 | `p-applicant-detail` | `L1342` | Applicant Detail |
| 11 | `p-ticket-detail` | `L1380` | Ticket Detail |
| 12 | `p-profile` | `L1384` | 360° Profile |
| 13 | `p-inbox` | `L1392` | Work Inbox |
| 14 | `p-commitment` | `L1397` | Plan Commitment |
| 15 | `p-fairness` | `L1402` | Captain Fairness |
| 16 | `p-contacts` | `L1409` | Contact Drivers & SLA |
| 17 | `p-interventions` | `L2068` | Interventions |
| 18 | `p-requests-sub-all` | `L2123` | All Subscription Requests |
| 19 | `p-requests-instant-all` | `L2144` | All Instant Ride Requests |

This directly violates the file's own standing rule (`L10556–L10559`):
> "STANDING RULE for future work: any new page or major new action built into this panel gets an entry added here in the same change — permissions are not an afterthought bolted on later."

Several are materially sensitive: `p-fraud` (Fraud & Risk), `p-rwallets` (Rider Wallets — money), `p-corp-detail` (corporate billing), `p-profile` (360° PII), `p-contacts` (driver contact + SLA), `p-applicant-detail` (KYC documents). None of them appear in the granular matrix UI at `#page-perm-matrix` (`L1547`), so an administrator reading that screen cannot even see that they exist.

### 5.2 Broad permissions declared but never enforced

`requirePerm()` is called at **131 sites** covering 12 of the 13 broad keys. **`view_profiles` is granted to all 5 seeded users and enforced at zero call sites.** `can()` has exactly **one** functional call site: `L3084`, deciding whether the *"Edit role permission matrix"* button appears on My Account.

Enforcement volume per key:

| Permission | `requirePerm()` sites | Roles that hold it |
|---|---:|---|
| `manage_settings` | 39 | Owner only |
| `manage_subscriptions` | 23 | Owner, Ops Manager |
| `manage_plans` | 16 | Owner, Ops Manager |
| `approve_drivers` | 14 | Owner, Ops Manager |
| `live_ops` | 13 | Owner, Ops Manager |
| `contact_users` | 8 | Owner, Ops Manager, Support |
| `process_payouts` | 6 | Owner, Finance |
| `manage_team` | 5 | Owner only |
| `manage_tickets` | 4 | Owner, Ops Manager, Support |
| `view_finance` | 1 (`L6703`, `commitSendCorpInvoice`) | Owner, Ops Manager, Finance |
| `release_escrow` | 1 (`L7059`, `releaseEscrow`) | Owner, Finance |
| `apply_deductions` | 1 (`L7073`, `confirmApplyDeduction`) | Owner, Finance |
| `view_profiles` | **0** | all 4 roles |

Full call-site inventory by key:

- **`manage_settings` (39)** — `commitPublishVersion` L3834, `sendReconsentReminder` L3845, `saveReferralConfig` L3898, `saveCancellationPolicy` L7370, `addCustomLimit` L7406, `removeCustomLimit` L7422, `saveOpsLimits` L7431, `toggleGatewayEnabled` L7476, `setDefaultGateway` L7487, `addCustomGateway` L7496, `removeGateway` L7508, `captureDailySnapshot` L7640, `sendBroadcast` L7695, `sendPushNotification` L7736, `toggleCityActive` L7782, `addCity` L7877, `removeCity` L7891, `saveGeneralConfig` L7987, `saveNotificationConfig` L8009, `saveSecurityConfig` L8024, `onMultiSubToggle` L8050, `saveOpsRadiusConfig` L8074, `addSearchPhase` L8097, `removeSearchPhase` L8109, `saveSearchPhases` L8116, `savePlanVisibility` L8129, `onDriverExceptionToggle` L9116, `queueRecruitment` L13995, `saveReasonCodes` L15094, `addReasonCode` L15114, `saveSlaPolicy` L15141, `saveCompPolicy` L15487, `saveOnCall` L15800, `executeErasure` L16015, `rejectErasure` L16037, `saveCommitPolicy` L17118, `saveBranding` L18446, `setRotaSlot` L19671, `saveDataWindow` L20515
- **`manage_subscriptions` (23)** — `openSettlement` L3640, `confirmSubDriverCommit` L4827, `approveCorpSubscription` L4883, `rejectCorpSubscription` L4898, `commitNewSub` L4914, `doFreeze` L5504, `confirmCancelSub` L5550, `commitDriverChange` L5810, `commitNewCorp` L6518, `saveCorpBillingContact` L6640, `saveCorpUsagePolicy` L6652, `setCorpStatus` L6716, `removeEmployeeFromCorp` L6752, `confirmPostponeTrip` L8635, `approveSubReqCorp` L9978, `rejectSubReqCorp` L9990, `commitSubReqAssign` L10267, `reopenSubReq` L10303, `confirmReassign` L13096, `assignBackup` L13187, `promoteBackup` L13226, `openRetentionAction` L14256, `resolveDispute` L14432
- **`manage_plans` (16)** — `doActivatePlan` L5958, `doDeactivatePlan` L5979, `newPlan` L6099, `toggleVehicleActive` L6110, `savePlan` L6118, `doArchivePlan` L6166, `addSurgeWindow` L12303, `removeSurgeWindow` L12315, `saveSurgeSchedule` L12322, `saveSurgeConfig` L12335, `addRideType` L12357, `removeRideType` L12369, `saveRideTypes` L12376, `openNewPromo` L13532, `addIncentiveRule` L13715, `removeIncentiveRule` L13725
- **`approve_drivers` (14)** — `commitSuspendAccount` L9083, `reinstateAccount` L9100, `onDriverTrustToggle` L9140, `confirmDocReject` L10869, `reconsiderApplicant` L10911, `saveDocExpiry` L11030, `openDocDateEditor` L11051, `saveDriverDocDates` L11065, `approveDriver` L11095, `rejectDriver` L11123, `markDocRenewed` L13371, `precautionSuspend` L13465, `decideFairness` L15592, `decideEmergency` L16809
- **`live_ops` (13)** — `openNewRideRequestModal` L2450, `flagTrip` L4225, `unflagTrip` L4235, `assignNearestDriver` L8483, `commitAddStop` L11698, `commitSendChatMsg` L11743, `commitLiveReassign` L11795, `cancelLiveTrip` L11805, `confirmCancelLiveTrip` L11825, `commitRequestAssign` L11885, `cancelRequest` L11916, `openSteerOffer` L14003, `forceResync` L16425
- **`contact_users` (8)** — `commitProcessReferral` L3920, `commitWalletAdjust` L3978, `sendTripReceipt` L4217, `commitFlagAccount` L9027, `commitUnflagAccount` L9043, `confirmWelcomeOffer` L11177, `sendRenewalApprovalRequest` L11406, `sendBulkMsg` L13751
- **`process_payouts` (6)** — `commitEditTip` L4205, `payDriver` L7024, `confirmProcessAll` L7050, `resolveCashEntry` L12147, `recordCashRepayment` L12188, `commitAwardIncentive` L13703
- **`manage_team` (5)** — `commitEditTeamUser` L10485, `commitInvite` L10530, `togglePagePermission` L10690, `toggleRolePermission` L10777, `saveUserPermissions` L10814
- **`manage_tickets` (4)** — `resolveComplaint` L4378, `commitMassEvent` L16108, `bulkStatus` L16166, `bulkAssignMe` L16173

**Concentration risk:** 39 of 131 guards (30%) resolve to `manage_settings`, held only by `USR-1`. The entire Settings surface — cities, gateways, dispatch radius, security policy, branding, legal versions, data-retention window, reason codes, SLA policy, on-call rota, GDPR erasure execution — is a single-operator capability with no second holder.

### 5.3 Audit label coverage

- **161 distinct `actionKey` literals** appear across **220 real `logAction()` call sites** (grep returns 222 hits; 2 are the declaration at `L3133` and a prose comment at `L2855`). All 220 pass a **string literal** — there are zero dynamic/computed action keys.
- `ACTION_LABELS` contains **26** keys.
- **All 26 labelled keys are actually used** — no orphan labels.
- **135 of 161 distinct keys (84%) have no label.** They are therefore absent from the Activity Log's *"All action types"* filter (`L9238`), and cannot be filtered for at all.

Complete list of the **135 unlabelled action keys**:

`absence_decayed`, `absence_waived`, `account_flagged`, `account_reinstated`, `account_suspended`, `account_unflagged`, `add_reason_code`, `add_stop`, `archive_plan`, `assign_backup`, `auto_renew_toggle`, `auto_suspend`, `backup_offer_accepted`, `backup_offer_declined`, `backup_offer_expired`, `backup_offer_sent`, `billing_history_fetched`, `bulk_message`, `bulk_ticket_status`, `call_wrapped`, `case_closed`, `cash_approved`, `cash_debt_repaid`, `cash_escalated`, `change_password`, `claim_expired`, `claim_released`, `claim_taken`, `claim_taken_over`, `close_incident`, `comp_blocked`, `complaint_resolved`, `config_updated`, `contact_logged`, `corp_approval_declined`, `corp_approval_granted`, `corp_invoice_sent`, `corp_policy_violation`, `create_corporate_account`, `create_promo`, `create_ride_request`, `credit_note_issued`, `doc_renewed`, `driver_accepted`, `driver_bonus_awarded`, `driver_flagged`, `duplicate_suppressed`, `edit_branding`, `edit_commit_policy`, `edit_comp_policy`, `edit_data_window`, `edit_oncall`, `edit_reason_codes`, `edit_sla_policy`, `emergency_claim_filed`, `emergency_dispatch_accepted`, `emergency_dispatch_opened`, `erasure_executed`, `erasure_rejected`, `erasure_requested`, `fairness_case_opened`, `fairness_decision`, `history_rebuilt`, `impersonation_ended`, `impersonation_started`, `incident_step`, `late_pickup_logged`, `ledger_rejected`, `legal_version_published`, `log_out_session`, `lost_found`, `mass_event_declared`, `offer_declined`, `offer_sent`, `ops_chat_sent`, `pause_promo`, `payment_captured`, `payment_hold_released`, `plan_access_restored`, `plan_access_terminated`, `plan_earnings_forfeited`, `plan_leg_confirmed`, `plan_leg_handed_off`, `plan_terms_accepted`, `postpone_trip`, `precaution_suspend`, `priority_call`, `promote_backup`, `rate_card_approved`, `rate_card_proposed`, `rate_card_self_approval_blocked`, `rating_voided`, `receipt_sent`, `recruitment_queued`, `referral_processed`, `renewal_approval_requested`, `reopen_request`, `resolve_dispute`, `resume_promo`, `retention_action`, `ride_state_resync`, `rota_updated`, `save_doc_expiry`, `save_plan`, `script_step`, `session_started`, `settle_subscription`, `shift_handover`, `sla_breach`, `steer_offer`, `steer_offer_closed`, `sub_request_timeout`, `sub_start_confirmed`, `sub_start_deferred`, `sub_start_pending`, `surge_suspended`, `ticket_assigned`, `ticket_closed`, `ticket_reason_changed`, `ticket_reopened`, `tier_change`, `toggle_2fa`, `toggle_page_permission`, `toggle_vehicle_active`, `trip_completed`, `trip_flagged`, `trip_tip`, `trip_tip_edited`, `trip_unflagged`, `update_doc_dates`, `update_profile`, `update_profile_photo`, `wallet_credit`, `wallet_debit`, `welcome_offer_sent`

**Security-relevant keys among the unlabelled 135** (an auditor cannot filter for these): `impersonation_started`, `impersonation_ended`, `toggle_page_permission`, `change_password`, `toggle_2fa`, `log_out_session`, `erasure_executed`, `erasure_rejected`, `erasure_requested`, `account_suspended`, `auto_suspend`, `precaution_suspend`, `rate_card_self_approval_blocked`, `comp_blocked`, `edit_data_window`, `legal_version_published`, `history_rebuilt`, `config_updated` (40 call sites — the single highest-volume key in the file).

Note the asymmetry: `toggle_role_permission` **is** labelled (`L2903`) but its granular twin `toggle_page_permission` (`L10704`) is **not** — the two halves of the same permission-editing screen are filterable and unfilterable respectively.

Action keys used more than once (all others are single-site): `config_updated` ×40, `export_data` ×3, then ×2 each — `wallet_debit`, `update_profile_photo`, `tier_change`, `ticket_reason_changed`, `sub_start_deferred`, `sub_start_confirmed`, `sla_breach`, `retention_action`, `reassign_driver`, `plan_leg_confirmed`, `permission_denied`, `incident_step`, `edit_branding`, `corp_approval_granted`, `corp_approval_declined`, `auto_renew_toggle`, `assign_driver`, `account_reinstated`.

### 5.4 Destructive actions that never call `logAction()`

A scan of all 1,028 top-level `function` declarations found **zero** functions that remove records from `DB` (`DB.*.splice(…)` or `delete DB.*`) without also calling `logAction()`. Confirmed unaudited gaps are narrower and specific:

| Function | Line | What it mutates | Why it matters |
|---|---|---|---|
| `exportRequestsSnapshot()` | `L9766–L9775` | Writes a JSON blob of **all** `DB.rideRequests` + `DB.subscriptionRequests` to disk | **The only bulk data export in the panel that does not call `logAction`.** Every other export routes through `downloadCSV()` (`L7598`), which logs `export_data` at `L7604`, or through `doExport()`, which logs at `L9215`. This one only toasts. |
| `removePlanFeature(i)` | `L6037–L6040` | `PLAN_FEATURES.splice(i,1)` | Deletes a plan feature bullet with no audit entry of its own. It **is** confirm-gated (`GATE_SWEEP.removePlanFeature`, `L20839`). The deletion is only persisted when `savePlan()` (`L6118`, gated on `manage_plans`) subsequently logs `save_plan` — the individual removal itself is invisible. |
| `pfDrop(e,i)` | `L6042–L6048` | Reorders `PLAN_FEATURES` via two `splice` calls | Same: reordering is unaudited until `savePlan()` runs. |
| `maybeGenerateCashEvent()` | `L12101` | Mutates DB behind a `confirm()` | The only `confirm()`-gated function in the file with no `logAction`. It is a simulation generator, not an operator action. |

Additionally, **no export function is permission-gated.** `exportRiders` (`L7607`), `exportDrivers` (`L7611`), `exportSubscriptions` (`L7615`), `exportPayments` (`L7619`), `exportAuditLog` (`L7623`), `exportInbox` (`L7627`), `exportPushLog` (`L7631`), `exportEmailLog` (`L7634`), `exportSnapshots` (`L7665`), `exportContacts` (`L15056`), `exportIntegrity` (`L18617`), `exportRequestsSnapshot` (`L9766`) and `doExport` (`L9204`) contain **no `requirePerm` / `requirePagePerm` call**. A Support user (3 permissions, no `view_finance`) can export the full payments table and the entire audit log. `exportAuditLog` in particular lets any operator take the tamper record off-platform.

### 5.5 Denial-path coverage

Two denial producers, both logging the same action key `permission_denied`:

| Guard | Line | `entityType` | `entityId` | Summary format |
|---|---|---|---|---|
| `requirePerm` | `L3129` | `'permission'` | bare perm key, e.g. `manage_team` | `Blocked — tried "<label>" without permission` |
| `requirePagePerm` | `L10685` | `'permission'` | dotted, e.g. `growth.create_promo` | `Blocked: <currentUserName()> lacks "<Page> — <action label>"` |

Both toast `'🔒 Your role lacks permission: …'` with severity `err` and return `false`; every call site is written as `if(!requirePerm(...))return;` so the guarded function aborts before any mutation. `requirePerm` passes no `before`/`after` (so no diff line renders); `requirePagePerm` passes `{}` / `{}` — and `auditDiffHTML({}, {})` also returns `''` because `Object.keys({})` is empty (`L3164–L3169`). Both denial rows therefore render summary-only.

`permission_denied` **is** in `ACTION_LABELS` (`L2912`), so denials are filterable in the Activity Log — one of the few security keys that is.

Two guards return early *without* logging a denial (they are policy blocks, not permission blocks):
- `toggleRolePermission` `L10780` — refusing to let a user revoke their own `manage_team`: toast only, no audit entry.
- `saveUserPermissions` `L10820` — same self-lockout guard: toast only, no audit entry.

---

## 6. Actions

### 6.1 My Account page (`p-my-account`, `L1151–L1170`)

Page shell: header `⚙️ My account` / *"Profile, security, and exactly what your role can do"* (`L1152`). Three `.card` blocks with empty bodies filled by JS:

| Card | Header markup | Body container id | Renderer |
|---|---|---|---|
| 👤 Profile | `L1155` | `ma-profile-body` (`L1156`) | `renderMaProfile()` `L2923` |
| 🔐 Security | `L1160` | `ma-security-body` (`L1161`) | `renderMaSecurity()` `L3004` |
| 🗝️ My permissions | `L1165` (+ note *"Enforced everywhere in this panel, not just shown here"*) | `ma-permissions-body` (`L1166`) | `renderMaPermissions()` `L3065` |

Entry: sidebar footer `onclick="go('my-account',null)"` (`L545`); Settings team table self-row button `Edit (in My Account)` (`L10461`). Routing hook: `if(id==='my-account'){renderMyAccountPage();}` (`L8803`). `renderMyAccountPage()` (`L2920–L2922`) calls all three renderers in order.

**Every field and control:**

| Section | Control | Element id | Type | Seeded value | Handler | Effect | Permission | Audit |
|---|---|---|---|---|---|---|---|---|
| Profile | Avatar | *(none)* | `avatarOrInitials(u,84)` | `u.photo` / initials | — | display only | none | — |
| Profile | Change photo | `ma-photo-input` (`L2932`) | hidden `<input type="file" accept="image/*">`, triggered by button `L2933` | — | `handleAvatarUpload(this)` `L2945` | Validates `/^image\//` (else toast `'⚠ Please choose an image file'` warn) and `size ≤ 2MB` (else `'⚠ Image too large — please choose one under 2MB'` warn). Reads as data URL into `u.photo`, re-renders profile, replaces `#tb-avatar` inner HTML with an `<img>` | **none** | `update_profile_photo` (`L2957`) — *unlabelled*, `before={} after={}` |
| Profile | Remove | *(conditional, `L2934`)* | button, rendered only when `u.photo` | — | `removeAvatar()` `L2963` | Sets `u.photo=null`, re-renders, resets `#tb-avatar` to initials via `textContent` | **none** | `update_profile_photo` (`L2969`) — same key for add **and** remove |
| Profile | Full name | `ma-name` (`L2937`) | `text` | `u.name`, `"`→`&quot;` escaped | — | — | — | — |
| Profile | Email | `ma-email` (`L2939`) | `email` | `u.email` escaped | — | — | — | — |
| Profile | Phone number | `ma-phone` (`L2940`) | `tel`, placeholder `+966 5X XXX XXXX` | `u.phone\|\|''` escaped | — | — | — | — |
| Profile | Role + last-login line | *(none)* | static text `L2942` | `Role: <b b-blue>u.role</b> · Last login u.lastLogin — role and login history are not self-editable` | — | display only | — | — |
| Profile | **Save profile** | — | button `L2943` | — | `saveMaProfile()` `L2973` | Trims all three. Empty name → `'⚠ Name cannot be empty'` (warn), abort. Email failing `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → `'⚠ Enter a valid email address'` (warn), abort. Else writes `u.name/email/phone`, updates `#sb-ft-name`, toasts `'✅ Profile saved'` | **none** | `update_profile` (`L2983`) — *unlabelled*, `before={name,email,phone}` → `after={name,email,phone}` |
| Security | Current password | `ma-pw-current` (`L3013`) | `password`, placeholder *Current password* | empty | — | — | — | — |
| Security | New password | `ma-pw-new` (`L3014`) | `password`, placeholder *New password (min. 8 characters)* | empty | — | — | — | — |
| Security | Confirm new password | `ma-pw-confirm` (`L3015`) | `password`, placeholder *Confirm new password* | empty | — | — | — | — |
| Security | **Update password** | — | button `L3016` | — | `changeMaPassword()` `L3036` | `!cur` → `'⚠ Enter your current password'` (warn). `nw.length<8` → `'⚠ New password must be at least 8 characters'` (warn). `nw!==conf` → `"⚠ New password and confirmation don't match"` (warn). On success clears all three inputs and toasts `'✅ Password updated'`. **The current password is never verified against anything and the new password is never stored.** | **none** | `change_password` (`L3044`) — *unlabelled*, `entityId=CURRENT_USER_ID`, `{}`/`{}` |
| Security | 2FA toggle | *(unnamed)* | `<input type="checkbox">` inside `label.tog` `L3023` | `u.twoFA` | `toggleMa2FA(this.checked)` `L3047` | Writes `u.twoFA=val`, toasts `'✅ Two-factor authentication enabled'` / `'Two-factor authentication disabled'` (both severity `ok`). Panel text does **not** re-render — `renderMaSecurity()` is not called, so the "Enabled"/"Disabled" label at `L3022` stays stale until navigation | **none** | `toggle_2fa` (`L3051`) — *unlabelled*, `before={twoFA:!val}` → `after={twoFA:val}` |
| Security | Active sessions list | *(none)* | rows from `DB.loginSessions[u.id]` `L3007` | see §3.7 | — | Each row shows `device` (+ `<span class="b b-green">This device</span>` when `current`), then `location · ip · lastActive`. Empty → *"No other sessions."* | — | — |
| Security | **Log out** (per non-current session) | — | button `.btn sm danger` `L3032` | — | `logOutSession(sessId)` `L3054` | Native `confirm('Log out this session? That device will need to sign in again.')`; on OK splices the session out of `DB.loginSessions[CURRENT_USER_ID]`, re-renders, toasts `'Session logged out: <device>'` (info) | **none** | `log_out_session` (`L3062`) — *unlabelled*, summary `'Logged out session: '+device` |
| Permissions | Summary line | — | `L3070` | `N of 13 permissions granted — role: <b b-blue>role</b>` | — | display only | — | — |
| Permissions | Permission rows (13) | — | `L3073–L3080` | one row per `Object.keys(PERMISSION_LABELS)` | — | Granted rows: `✅`, background `#F0F9F0`, label in `var(--ink)`. Denied: `🔒`, background `var(--bg2)`, label in `var(--ghost)`. Second line is `PERMISSION_DESC[p]\|\|''` | — | — |
| Permissions | Explainer box | — | `L3082` | *"🔐 These are enforced everywhere in this panel… any blocked action shows '🔒 Your role lacks permission' and is logged in the Activity log as a denial."* | — | display only | — | — |
| Permissions | Edit role permission matrix | — | button `L3084`, **conditional on `can('manage_team')`** | — | `go('settings',null)` | Navigates to Settings (lands on the default tab, not the permissions tab) | `manage_team` — *hides* the button | — |
| Permissions | 👁 Act as another team member | — | button `L3085` | — | `openUserSwitch()` | Opens the acting-user modal | **none** | — |

### 6.2 Identity / switching actions

| Label | Handler | Line | Effect | Permission | Audit |
|---|---|---|---|---|---|
| Top-bar avatar click | `openUserSwitch()` | `L578` → `L3088` | Opens acting-user modal | **none** | — |
| 👁 Act as another team member | `openUserSwitch()` | `L3085` → `L3088` | Opens acting-user modal | **none** | — |
| Switch (modal footer) | `commitUserSwitch()` | `L3096` → `L3098` | Reassigns `CURRENT_USER_ID`, updates 3 DOM nodes, re-renders audit log | **none — any user can become any user** | `switch_user` (`L3102`) — labelled ✅ |
| Cancel (modal footer) | `closeModal()` | `L3096` | Dismiss | — | — |
| 👁 View as *(Settings → Team row)* | `impersonate(userId)` | `L10459` → `L21069` | Stashes `__realUserId`, switches, shows amber bar, navigates to dashboard | **none** (behind `guardAction` confirm only) | `impersonation_started` (`L21072`) — *unlabelled* |
| What they can do *(amber bar)* | `showEffectivePermissions(CURRENT_USER_ID)` | `L21042` → `L21049` | Modal listing granted ✓ / denied ✕ | none | — |
| Back to my account *(amber bar)* | `stopImpersonating()` | `L21043` → `L21080` | Restores `__realUserId`, hides bar, navigates to dashboard | none | `impersonation_ended` (`L21084`) — *unlabelled* |
| *(dead)* | `openUserSwitchGuardless()` | `L3114` | **Empty body. No callers.** | — | — |

`guardAction('impersonate', …)` (`L21090–L21098`) supplies the confirmation copy:
- title: `'View the panel as '+eff.user.name`
- summary: `'Role '+role+' — '+granted.length+' of '+total+' permissions.'`
- consequences (3): *"You will see exactly what they see, and be blocked where they are blocked."* / *"Any action you take is recorded against **your** name, not theirs."* / *"A banner stays on screen until you switch back."*
- confirmLabel: `'View as them'`

> The second consequence is **false as written**. `logAction()` reads `CURRENT_USER_ID` (`L3138–L3139`), which `impersonate()` has already reassigned (`L21071`) *before* any action is taken. Actions performed while impersonating are recorded against the **impersonated** user's name and id, not the real operator's. Only the `impersonation_started` entry itself names the real operator, via `nm2(window.__realUserId)` — and `nm2` (`L3565`) resolves only `DB.riders`/`DB.drivers`, never `DB.teamUsers`, so it falls through and prints the raw id string `USR-1`.

### 6.3 Team & permission administration (Settings → Permissions tab, `#stab-permissions` `L1534`)

| Label | Handler | Line | Effect | Permission | Audit |
|---|---|---|---|---|---|
| Role-matrix checkbox | `toggleRolePermission(role,permKey,grant)` | `L10776` | Grants/revokes on **every user holding that role**; also syncs `u.pagePerms` for every page whose `legacy===permKey` (full set on grant, `['view']` on revoke, `L10789–L10792`); re-renders both matrices | `manage_team` (`L10777`) + self-lockout guard (`L10780`) | `toggle_role_permission` (`L10797`) — labelled ✅, diff `{usersWithPermission:'X of N'}` |
| Page-matrix expander | `togglePagePermExpand(pageKey)` | `L10711` | Toggles `_pagePermExpanded[pageKey]`, re-renders | none | — |
| Page-matrix checkbox | `togglePagePermission(role,pageKey,permKey,grant)` | `L10689` | Push/splice the key on `u.pagePerms[pageKey]` for every user with that role | `manage_team` (`L10690`) | `toggle_page_permission` (`L10704`) — **unlabelled** ❌ |
| 🔐 Permissions *(team row)* | `viewUserPermissions(userId)` | `L10801` | Modal with 13 `.tog` checkboxes carrying `data-perm` | **none — read-modal opens for anyone** | — |
| Save permissions *(modal)* | `saveUserPermissions(userId)` | `L10813` | Replaces `u.permissions` wholesale from checked boxes; re-syncs `pagePerms` only for pages whose legacy gate flipped (`L10825–L10830`) | `manage_team` (`L10814`) + self-lockout guard (`L10820`) | `edit_user_permissions` (`L10833`) — labelled ✅ |
| Edit *(team row)* | `editTeamUser(userId)` | `L10468` | Modal: `et-name`, `et-email`, `et-role` (from `TEAM_ROLES`) | **none — opens for anyone** | — |
| Save changes *(edit modal)* | `commitEditTeamUser(userId)` | `L10484` | Validates non-empty name, `@` in email, email uniqueness across other users; writes name/email/role | `manage_team` (`L10485`) | `edit_team_user` (`L10498`) — labelled ✅, diff `{name,email,role}` |
| Invite team member | `openInviteModal()` | `L10502` | Modal: `inv-name`, `inv-email`, `inv-role` (default `Support`) | **none — opens for anyone** | — |
| Send invite | `commitInvite()` | `L10529` | Same validations + duplicate-email check; id = `'USR-'+(length+1)` with a collision-avoiding `while` loop (`L10537`); pushes the record | `manage_team` (`L10530`) | `invite_team_user` (`L10542`) — labelled ✅, `before=null` |

`defaultPermissionsForRole(role)` (`L10521–L10527`) computes the new member's starting permissions as the **intersection** of every current holder of that role. For a role with zero current holders it returns `[]`.

### 6.4 Activity Log page (`p-audit-log`, `L2051–L2065`)

| Control | Element id | Line | Handler | Effect |
|---|---|---|---|---|
| Match count | `audit-count` | `L2057` | set in `renderAuditLog` `L9337` | `N action(s)` + `' match'` when any filter is active, else `' total'` |
| Free-text search | *(inline)* | `L2058` | `onAuditSearchInput(this)` `L9262` | Lowercases into `AUDIT_SEARCH`; haystack is `summary + actorName + entityId + id` (`L9332`); resets `AUDIT_PAGE=1` |
| Action-type filter | `audit-action-filter-wrap` → `csel-audit-action` | `L2059`, `L9236–L9240` | `onAuditFilterChange()` `L9255` | Options: *All action types* + the 26 `ACTION_LABELS` entries |
| Actor filter | `audit-filter-wrap` → `csel-audit-filter` | `L2060`, `L9231–L9235` | `onAuditFilterChange()` | Options: *All team members* + one per `DB.teamUsers` |
| Page size | `audit-pagesize-wrap` → `csel-audit-pagesize` | `L2061`, `L9241–L9245` | `onAuditPageSizeChange()` `L9248` | `[20, 50, 100, 200]`, default `AUDIT_PAGE_SIZE=20` (`L9229`); always resets to page 1 |
| Row list | `audit-log` | `L2064` | `renderAuditLog()` `L9322` | `auditRowsHTML(pageItems,false)` + `auditPagerHTML(...)`, or `auditEmptyHTML(...)` |
| Actor name cell | — | `L9298` | `showActorHistory(actorId)` `L9269` | Modal listing every entry for that actor, compact mode |
| Entity link cell | — | `L9300`, `L9280–L9284` | `auditEntityLink(entry)` | `rowLink(entityId)` if `resolveId()` matches, else a plain monospace span |
| Pager | — | `L9308–L9321` | `auditGoToPage(p)` `L9266` | `‹ Prev`, numbered buttons, `Next ›`; hidden when `totalPages<=1` |

**The Activity Log page itself is not permission-gated.** `audit-log.view` exists in `PAGE_PERMISSIONS` (`L10650`) but is never checked, and the page carries `legacy:null`. Any operator can read every action every other operator has taken, and export it (§5.4).

Settings preview: `#audit-log-preview` (`L2015`) renders `DB.auditLog.slice(0,4)` in compact mode (no entity column, `L9349`).

---

## 7. Cross-module dependencies

| Depends on | Where | Nature |
|---|---|---|
| `DB.teamUsers` | `L2830` | The sole identity store. Read by `can`, `logAction`, `currentUserName`, `effectivePermissions`, all My Account renderers, `renderTeamTable`, `renderRoleMatrix`, `renderPagePermMatrix`, `openUserSwitch`, `defaultPermissionsForRole`. |
| `toast(msg,severity)` | `L5269` | Every denial and every confirmation. Severities used here: `ok`, `err`, `warn`, `info`. |
| `closeModal()` / `#modal-overlay` / `#modal-content` / `#modal-box` | global UI | `openUserSwitch`, `viewUserPermissions`, `editTeamUser`, `openInviteModal`, `showEffectivePermissions`, `showActorHistory`, `doExport` all write into `#modal-content` and read selections back out of `#modal-box`. |
| `selDriver(el)` | global UI | Radio-row selection inside `openUserSwitch` (`L3092`) and the export format/location pickers (`L9191–L9200`). |
| `customSelectHTML(...)` | global UI | Builds the three audit filter selects (`L9233`, `L9239`, `L9244`) and the role selects in invite/edit (`L10476`, `L10509`). |
| `go(page, arg)` | routing | `impersonate`/`stopImpersonating` force `go('dashboard',null)`; My Account button goes to `settings`; sidebar footer goes to `my-account`. |
| `resolveId(raw)` | `L3262` | `auditEntityLink` uses it to decide whether an `entityId` is linkable. Searches `riders, drivers, trips, subscriptions, payments, complaints` — **not** `teamUsers`, so every `entityType:'team_user'` row renders as plain text. |
| `rowLink(id)` | global UI | Renders the clickable entity chip in audit rows. |
| `guardAction(name, builder)` | `L17819` | Consequence-confirm registry; `impersonate` is registered at `L21090`. 26 registered actions total: `resolveDispute` L17857, `commitWalletAdjust` L17889, `recordRefund` L17901, `recordAbsence` L17911, `decideEmergency` L17932, `decideFairness` L17950, `autoHandoff` L17969, `commitBackup` L17981, `promoteBackup` L17990, `executeErasure` L18002, `rejectErasure` L18014, `bulkStatus` L18024, `forceResync` L18036, `commitMassEvent` L18045, `advanceLF` L18054, `saveCommitPolicy` L18068, `saveCompPolicy` L18077, `saveBranding` L18460, `rebuildAllHistory` L18607, `reinstateProbationary` L19490, `commitHandover` L19733, `fetchFullHistory` L20483, `saveDataWindow` L20522, `impersonate` L21090, `suspendSurge` L21544, `approveRateCard` L21603. |
| `statusBadge(status)` | global UI | Team table status column (`L10457`). |
| `DB.opsConfig.security.require2FA` | settings | `renderTeamTable` `L10455` — controls whether the 2FA badge column appears at all. |
| `renderAuditLog` | `L9322` | Called opportunistically by `logAction` (`L3152`) and `commitUserSwitch` (`L3109`), both behind `typeof … === 'function'` guards. |
| `renderSidebarPerms` | — | **Referenced twice (`L21075`, `L21086`) but never defined anywhere in the file.** Both call sites are `typeof`-guarded, so impersonation silently skips whatever sidebar refresh was intended. |
| `PLAN_FEATURES` | plan editor | `removePlanFeature`/`pfDrop` mutate it; `validatePlanFeatures` (`L6050`) requires both `en` and `ar` text for every bullet. |

---

## 8. Hardcoded / mock values

| Value | Line | Note |
|---|---|---|
| `CURRENT_USER_ID='USR-1'` | `L2862` | Hardcoded session identity. No login, no token, no persistence. |
| Top-bar avatar literal `SA` | `L578` | Static initials in markup; only corrected once JS reassigns `#tb-avatar`. |
| Sidebar footer `Sarah Al-Rashid` / `Owner · settings ▾` | `L545` | Static markup, patched at runtime by `commitUserSwitch` (`L3104–L3105`). |
| All 5 `DB.teamUsers` records incl. Saudi phone numbers and `@eyvar.com` emails | `L2830–L2841` | Fixture data. |
| All `lastLogin` strings (`'Today 09:00'`, `'24 Jun'`, `'Not yet'`…) | `L2831–L2839` | Static strings, never recomputed. |
| All 8 seeded `DB.auditLog` rows | `L2863–L2872` | Fixture data with a `ts` format the runtime never produces. |
| All 5 `DB.loginSessions` records incl. IPs `92.96.7.40`, `92.96.14.201`, `185.45.30.7`, `92.96.18.92`, `46.31.20.18` | `L2996–L3003` | Fixture data. `'Claude Ops app · iPhone'` is a placeholder product name. |
| `AUDIT_PAGE_SIZE=20`, options `[20,50,100,200]` | `L9229`, `L9243` | — |
| Audit log hard cap `500` | `L3148` | `DB.auditLog.length=500` silently truncates the oldest entries. |
| Avatar upload cap `2*1024*1024` (2 MB) | `L2949` | — |
| Password minimum `8` | `L3041` | Client-side only; nothing is stored. |
| `AV_COLORS` (6 hex values) / `PHOTO_GRADS` (5 gradients) | `L10834–L10835` | Deterministic pick by `name.length % array.length`. |
| Granted-permission row background `#F0F9F0` | `L3075` | Literal hex, not a CSS variable — will not respond to a dark theme. |
| Permission-row border `#F2F1EE` | `L10805` | Same. |
| Impersonation bar `background:var(--amber);color:#1A1A18` | `L564` | Foreground colour is a literal. |
| Export filenames `eyvar_riders.csv`, `eyvar_drivers.csv`, `eyvar_subscriptions.csv`, `eyvar_payments.csv`, `eyvar_audit_log.csv`, `eyvar_inbox.csv`, `eyvar_push_log.csv`, `eyvar_contacts.csv`, `eyvar_data_integrity.csv` | `L7609`, `L7613`, `L7617`, `L7621`, `L7625`, `L7629`, `L7632`, `L15063`, `L18626` | — |
| Export filename date suffix `'_25Jun.'` | `L9212` | Hardcoded date in `doExport` — every export is stamped 25 Jun regardless of when it runs. |
| `p-my-account` header copy | `L1152` | — |

---

## 9. Risks & findings

**F1 — 19 of 41 pages have no permission entry.** See §5.1. Includes Fraud & Risk, Rider Wallets, Corporate Account detail, 360° Profile, Applicant Detail (KYC). Directly contradicts the file's own standing rule at `L10556`.

**F2 — 135 of 161 audit action keys (84%) have no label**, so they are unreachable from the Activity Log's action-type filter (`L9238`). Among them: `impersonation_started`, `impersonation_ended`, `toggle_page_permission`, `change_password`, `toggle_2fa`, `erasure_executed`, `config_updated` (40 sites). See §5.3.

**F3 — `commitUserSwitch()` is completely unguarded** (`L3098`). No `requirePerm`, no `guardAction` confirm. Any operator — including Support with 3 permissions — can click the top-bar avatar (`L578`) and become the Owner, acquiring all 13 permissions. This is a total RBAC bypass; the audit entry `switch_user` records it, but nothing prevents it.

**F4 — The two identity mechanisms do not cooperate.** `commitUserSwitch` never sets `window.__realUserId` and never calls `renderImpersonationBar()`. A switch via the avatar therefore produces **no amber banner and no "Back to my account" affordance** — the operator is silently someone else with no visible indicator and no return path except a page reload. Conversely, using the avatar switch *while* impersonating leaves `__realUserId` pointing at a third party and the banner stale (the guard at `L21039` only checks `__realUserId !== CURRENT_USER_ID`, so it stays visible but describes the wrong return target).

**F5 — Impersonation misattributes actions.** `guardAction('impersonate')` promises *"Any action you take is recorded against **your** name, not theirs"* (`L21095`), but `logAction` reads the already-reassigned `CURRENT_USER_ID` (`L3138`). Actions during impersonation are attributed to the impersonated user. The stated safety property is inverted.

**F6 — `nm2()` cannot resolve team users.** `nm2` (`L3565`) searches only `DB.riders` and `DB.drivers`. Both impersonation audit summaries (`L21073`, `L21084`) call it on a `USR-*` id, so they print the raw id (`"USR-1 began viewing the panel as …"`) instead of a name.

**F7 — `renderSidebarPerms` does not exist.** Called at `L21075` and `L21086` behind `typeof` guards. Whatever sidebar permission refresh impersonation was meant to trigger never runs, so the sidebar keeps showing the pre-impersonation state.

**F8 — `openUserSwitchGuardless()` is an empty stub with no callers** (`L3114`). Verified: `function openUserSwitchGuardless(){}` with zero references. Dead code whose name implies a deliberate guard bypass that was never wired up (or was removed without deleting the symbol).

**F9 — `view_profiles` is enforced nowhere.** All 5 users hold it; 0 `requirePerm` sites reference it. The 360° profile page (`p-profile`, `L1384`) is also absent from `PAGE_PERMISSIONS`. PII access is entirely ungoverned.

**F10 — No export is permission-gated, and `exportAuditLog` is among them.** 13 export entry points, zero permission checks (§5.4). Any operator can download the full payments table, the rider/driver roster with phone numbers, and the complete tamper log. `exportRequestsSnapshot` (`L9766`) additionally never calls `logAction`, so that particular exfiltration leaves no trace at all.

**F11 — Read-modals for privileged screens open without a check.** `viewUserPermissions` (`L10801`), `editTeamUser` (`L10468`), `openInviteModal` (`L10502`) have no guard; only their commit functions do. A Support user can open the invite modal, fill it in, click *Send invite*, and only then be told they lack `manage_team` — the permission model is invisible until the last click.

**F12 — Self-lockout guards are unaudited.** `L10780` and `L10820` block a user from revoking their own `manage_team`, toasting only. An attempted privilege self-destruction leaves no audit record, unlike every other denial.

**F13 — Password change is theatre with a real-looking success path.** `changeMaPassword()` (`L3036`) never validates the current password against anything and never stores the new one — it clears the inputs, logs `change_password`, and toasts `'✅ Password updated'`. The audit log will contain an entry asserting a credential change that did not occur. The file's own comment at `L2989–L2994` acknowledges the local-state pattern, but the audit entry makes the fiction durable.

**F14 — `toggleMa2FA` mutates without re-rendering.** `L3047–L3053` writes `u.twoFA` and toasts but never calls `renderMaSecurity()`. The "Enabled"/"Disabled" text at `L3022` stays stale for the rest of the page visit, so the toggle and the label disagree.

**F15 — `commitInvite` creates structurally incomplete users.** `L10538` pushes `{id,name,email,role,lastLogin,status,permissions}` — **no `phone`, no `photo`, no `twoFA`, no `pagePerms`**. Consequences: `renderTeamTable` (`L10456`) reads `u.twoFA` as `undefined` and shows the red `⚠ 2FA off` badge; `renderMaProfile` (`L2940`) falls back to `(u.phone||'')`; `avatarOrInitials` (`L2917`) handles `undefined` photo correctly; `pagePerms` is lazily built from the derived permissions, which is correct but means the new user's granular grants are computed from an intersection that may be `[]`.

**F16 — `renderRoleMatrix` / `renderPagePermMatrix` derive roles from live data, so a role with zero holders vanishes.** `L10753`, `L10718` dedupe `DB.teamUsers.map(u=>u.role)`. `TEAM_ROLES` (`L10501`) declares 4 roles, but if the last holder of a role is edited away, that role's column silently disappears from both matrices and its permission set becomes unreachable. Conversely `allHave` requires `usersWithRole.length>0` (`L10761`), so an empty role would render as fully unchecked if it were shown.

**F17 — The audit log is capped at 500 entries and silently drops the oldest** (`L3148`). With `config_updated` alone firing at 40 call sites, a single settings-heavy session can push genuine security events off the end. There is no warning, no archive, and no indication in the UI that truncation occurred.

**F18 — Audit IDs collide after truncation.** `id:'AUD-'+String(DB.auditLog.length+1).padStart(4,'0')` (`L3136`). Once the array is pinned at 500, every subsequent entry receives `AUD-0501`. The free-text search (`L9332`) includes `e.id` in its haystack, so searching an id after truncation returns an unbounded set.

**F19 — `auditDiffHTML` never reports removals.** It iterates `Object.keys(after)` only (`L3163`). A field present in `before` and absent from `after` — i.e. something that was deleted — produces no diff line. `L10833` (`edit_user_permissions`) passes only counts, so a wholesale permission wipe renders as `permissions: 13 permissions → 0 permissions` and nothing more.

**F20 — Runtime and seeded timestamps use incompatible formats.** Seeded rows carry `'25 Jun, 08:14 AM'` (`L2863`); `logAction` produces time-only via `toLocaleTimeString` (`L3137`). A log spanning both is unsortable and, after midnight, ambiguous. No locale is passed (`[]`), so format follows the browser.

**F21 — `PERMISSION_DESC.manage_team` is assigned twice.** Object literal `L3255`, then overwritten by a bare statement at `L10520`. Only the second survives. A reader of the literal sees text that never renders.

**F22 — Denial entity-id formats are inconsistent.** `requirePerm` logs the bare key (`manage_team`); `requirePagePerm` logs a dotted pair (`growth.create_promo`). Both use `entityType:'permission'`. Any downstream consumer grouping by `entityId` sees two incompatible key spaces under one type.

**F23 — `entityType:'team_user'` rows are never linkable.** `resolveId` (`L3262`) searches `riders, drivers, trips, subscriptions, payments, complaints` — not `teamUsers`. Every permission/team audit row renders its `USR-*` id as inert monospace text (`L9283`).

**F24 — `process_all_payouts` seeded row has `entityId:''`** (`L2867`). `auditEntityLink` returns `''` for falsy ids (`L9281`), so the cell is blank rather than showing a placeholder.

**F25 — Plan-feature deletion and reordering are unaudited** (`removePlanFeature` `L6037`, `pfDrop` `L6042`). Removal *is* confirm-gated (`GATE_SWEEP.removePlanFeature`, `L20839`); reordering is gated by nothing at all. See §5.4.

**F26 — Granular permission grants are stored per-user but edited per-role.** `togglePagePermission` (`L10689`) and `toggleRolePermission` (`L10776`) write to every user holding a role. A user whose role is later changed via `commitEditTeamUser` (`L10484`) keeps their old `permissions` array and old `pagePerms` — the hint text at `L10479` admits this (*"Changing role does not change their current permissions automatically"*), but the role matrix will then show that user under their new role's column, making the `allHave`/`mixed` computation report a state no one deliberately configured.

**F27 — `manage_settings` is a single point of failure.** 39 of 131 broad guards require it, and only `USR-1` holds it. If that account is unavailable, no city, gateway, dispatch, security, branding, legal, retention, SLA, on-call, or GDPR-erasure setting can be changed by anyone.

**F28 — Every "granted" state is unauthenticated in-memory data.** `u.permissions` is a plain array on a plain object with no integrity check; `can()` is a client-side `indexOf`. Anyone with a console can grant themselves anything. This is expected for a demo, but the My Account copy at `L3082` (*"These are enforced everywhere in this panel"*) and at `L1165` (*"Enforced everywhere in this panel, not just shown here"*) overstates it, and §5.2/§5.3 show the claim is also untrue in-panel.

---

## 10. UNVERIFIED items

| Item | Reason |
|---|---|
| Whether `logAction` is reached from inline `onclick` handlers that call anonymous/arrow functions, or from functions assigned via patterns other than `function X(` / `X=function` | The function-boundary scan in §5.4 used those two declaration forms. Nested closures and IIFE-wrapped handlers could contain unaudited mutations not surfaced by that scan. All 220 literal `logAction(` sites were counted regardless of enclosing form, so the *labels* analysis (§5.3) is complete; only the *absence* analysis carries this caveat. |
| The exact function names enclosing `requirePagePerm` at `L13449`, `L13476`, `L13550`, `L13634`, `L14469` | These call sites sit inside handlers whose declaration form the scan did not attribute. Line numbers and the page.perm pair are verified; the owning function name is inferred from surrounding context only. |
| Whether `renderSidebarPerms` is defined outside this file or injected at runtime | Grep over the single source file finds only the two guarded call sites. The panel is a single self-contained HTML file, so absence is near-certain — but "defined elsewhere" cannot be disproven from this file alone. |
| Whether `guardAction('impersonate')` actually intercepts `impersonate()` at runtime | `guardAction(name, builder)` (`L17819`) registers consequence copy under a name. Whether the registry wraps the same-named global function or is consulted by a separate dispatcher was not traced end to end. The registered copy is verified; the interception path is not. |
| Behaviour of `#tb-avatar` after `handleAvatarUpload` when the user later switches identity | `handleAvatarUpload` replaces `#tb-avatar`'s children with an `<img>` (`L2955`); `commitUserSwitch` sets `av.textContent` (`L3107`), which would clear the `<img>`. Deducible from the code but not executed. |
| Whether any of the 19 unmatrixed pages are unreachable in practice | Reachability depends on the routing/sidebar module (documented in `00a-global-navigation-and-routing.md`), not on this module. |
| The exact rendered format of `ts` | `toLocaleTimeString([], {...})` (`L3137`) passes an empty locale array, deferring to the browser. Output differs per environment. |

---

## 11. Line-number index

| Symbol / element | Line |
|---|---|
| Sidebar footer identity block (`#sb-ft-name`, `#sb-ft-role`) | `L545` |
| `#impersonation-bar` markup | `L564` |
| `#tb-avatar` (top-bar avatar, `onclick="openUserSwitch()"`) | `L578` |
| `p-dashboard` (`class="page on"`) | `L676` |
| `p-my-account` page shell | `L1151` |
| `#ma-profile-body` | `L1156` |
| `#ma-security-body` | `L1161` |
| `#ma-permissions-body` | `L1166` |
| `#stab-permissions` settings panel | `L1534` |
| `#role-matrix` | `L1540` |
| `#page-perm-matrix` | `L1547` |
| `#audit-log-preview` (Settings) | `L2015` |
| `p-audit-log` page shell | `L2051` |
| `#audit-count` | `L2057` |
| `#audit-action-filter-wrap` | `L2059` |
| `#audit-filter-wrap` | `L2060` |
| `#audit-pagesize-wrap` | `L2061` |
| `#audit-log` | `L2064` |
| `titles` map (page → title) | `L2168` |
| `subs` map (page → subtitle) | `L2169` |
| `DB.teamUsers` | `L2830–L2841` |
| Audit-log design comment | `L2848–L2861` |
| `var CURRENT_USER_ID='USR-1'` | `L2862` |
| `DB.auditLog` seed (8 rows) | `L2863–L2872` |
| `var ACTION_LABELS` (26 keys) | `L2898–L2913` |
| My Account design comment | `L2914` |
| `avatarOrInitials(u,size)` | `L2915` |
| `renderMyAccountPage()` | `L2920` |
| `renderMaProfile()` | `L2923` |
| `handleAvatarUpload(input)` | `L2945` |
| `removeAvatar()` | `L2963` |
| `saveMaProfile()` | `L2973` |
| Security-section design comment | `L2989–L2995` |
| `DB.loginSessions` | `L2996–L3003` |
| `renderMaSecurity()` | `L3004` |
| `changeMaPassword()` | `L3036` |
| `toggleMa2FA(val)` | `L3047` |
| `logOutSession(sessId)` | `L3054` |
| `renderMaPermissions()` | `L3065` |
| `can('manage_team')` gate on matrix button | `L3084` |
| `openUserSwitch()` | `L3088` |
| `commitUserSwitch()` | `L3098` |
| `openUserSwitchGuardless()` — **empty, no callers** | `L3114` |
| RBAC enforcement comment | `L3116–L3121` |
| `can(permKey)` | `L3122` |
| `requirePerm(permKey)` | `L3126` |
| `permission_denied` log (broad) | `L3129` |
| `logAction(...)` | `L3133` |
| Audit id generation | `L3136` |
| Audit `ts` generation | `L3137` |
| Audit 500-entry cap | `L3148` |
| `auditDiffHTML(before,after)` | `L3156` |
| `recordRefund(...)` | `L3175` |
| `PERMISSION_LABELS` (13) | `L3225` |
| `PERMISSION_DESC` (13) | `L3244` |
| `resolveId(raw)` | `L3262` |
| `nm2(id)` | `L3565` |
| `removePlanFeature(i)` | `L6037` |
| `pfDrop(e,i)` | `L6042` |
| `validatePlanFeatures()` | `L6050` |
| `downloadCSV(filename,csv)` → logs `export_data` | `L7598`, `L7604` |
| `exportRiders` / `exportDrivers` / `exportSubscriptions` / `exportPayments` / `exportAuditLog` / `exportInbox` / `exportPushLog` / `exportEmailLog` | `L7607`–`L7634` |
| `exportSnapshots()` | `L7665` |
| `exportRows(page)` | `L9175` |
| `buildCSV(head,rows)` | `L9184` |
| `exportData(btn,page)` | `L9187` |
| `doExport(page)` (logs `export_data` at `L9215`) | `L9204` |
| Audit filter state vars | `L9225–L9229` |
| `renderAuditFilterSelect()` | `L9230` |
| Action-type dropdown built from `ACTION_LABELS` | `L9238` |
| `onAuditPageSizeChange` | `L9248` |
| `onAuditFilterChange` | `L9255` |
| `onAuditSearchInput` | `L9262` |
| `auditGoToPage` | `L9266` |
| `showActorHistory(actorId)` | `L9269` |
| `auditEntityLink(entry)` | `L9280` |
| `auditForEntity(entityId,limit)` | `L9292` |
| `auditRowsHTML(list,compact)` | `L9295` |
| `auditEmptyHTML(ctx)` | `L9306` |
| `auditPagerHTML(...)` | `L9308` |
| `renderAuditLog()` | `L9322` |
| `currentUserName()` | `L9651` |
| `exportRequestsSnapshot()` — **no audit** | `L9766` |
| `renderTeamTable()` | `L10451` |
| `editTeamUser(userId)` | `L10468` |
| `commitEditTeamUser(userId)` | `L10484` |
| `TEAM_ROLES` | `L10501` |
| `openInviteModal()` | `L10502` |
| `PERMISSION_DESC.manage_team` overwrite | `L10520` |
| `defaultPermissionsForRole(role)` | `L10521` |
| `commitInvite()` | `L10529` |
| `permIcon(has)` | `L10545` |
| Granular-permissions design comment + standing rule | `L10546–L10563` |
| `PAGE_PERMISSIONS` (22 pages, 52 keys) | `L10564–L10651` |
| `defaultPagePerms(broadPerms)` | `L10659` |
| `currentUserPagePerms()` | `L10669` |
| `canPage(pageKey,permKey)` | `L10674` |
| `requirePagePerm(pageKey,permKey)` | `L10680` |
| `permission_denied` log (granular) | `L10685` |
| `togglePagePermission(...)` | `L10689` |
| `toggle_page_permission` log | `L10704` |
| `_pagePermExpanded` / `togglePagePermExpand` | `L10709`–`L10714` |
| `renderPagePermMatrix()` | `L10715` |
| `renderRoleMatrix()` | `L10750` |
| `toggleRolePermission(role,permKey,grant)` | `L10776` |
| Self-lockout guard (role matrix) | `L10780` |
| `toggle_role_permission` log | `L10797` |
| `viewUserPermissions(userId)` | `L10801` |
| `saveUserPermissions(userId)` | `L10813` |
| Self-lockout guard (user modal) | `L10820` |
| `edit_user_permissions` log | `L10833` |
| `AV_COLORS` / `PHOTO_GRADS` | `L10834`–`L10835` |
| `avatarHTML(name,size,hasPhoto)` | `L10836`–`L10845` |
| `maybeGenerateCashEvent()` | `L12101` |
| `exportContacts()` | `L15056` |
| `guardAction(name,builder)` | `L17819` |
| `exportIntegrity()` | `L18617` |
| `effectivePermissions(userId)` | `L21027` |
| `renderImpersonationBar()` | `L21035` |
| `showEffectivePermissions(userId)` | `L21049` |
| `impersonate(userId)` | `L21069` |
| `impersonation_started` log | `L21072` |
| `stopImpersonating()` | `L21080` |
| `impersonation_ended` log | `L21084` |
| `guardAction('impersonate', …)` | `L21090` |
| `fixesBoot()` → `renderImpersonationBar()` | `L21156`, `L21157` |

---

## 12. GDPR / PDPL erasure flow (consolidated) (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §5.1, item P3-9). Pass 1's finding: *"The GDPR-erasure flow is split across 5 docs with no owner."* This section traces the whole flow end to end and assigns it a home. Nothing in the five other documents is changed; each remains correct about its own fragment.
>
> The panel's own name for the regime is **PDPL** — Saudi Arabia's Personal Data Protection Law — not GDPR. Every user-facing string and log message in the source says "PDPL" (L15986, L16010, L16031, L16041, L19203). This section uses PDPL to match the source and keeps "GDPR" only in the heading, because that is the term Pass 1 used.

### 12.1 Why it lives here

The flow is an **identity operation with an audit obligation**: it destroys a person's identifying data, writes three distinct audit actions, and is gated by `requirePerm('manage_settings')` and by two of the file's most severe confirmation gates. That is this document's subject matter. The five documents Pass 1 named each own one *fragment* of it:

| Document | Fragment it owns | Lines |
|---|---|---|
| `13a-support-center-tickets.md` | `openErasureRequest` — the **only** UI entry point, a button on the ticket detail | L14834 |
| `00b-global-ui-systems.md` | `commitErasureRequest` — modal-inventory entry only | L15997 |
| `09a-riders.md` | `executeErasure` / `rejectErasure` — the rider-side effect of scrubbing | L16014, L16036 |
| `00c-identity-permissions-and-audit.md` *(this file)* | `executeErasure` / `rejectErasure` — the permission and audit side | L16015, L16030, L16037, L16041 |
| `13c-contact-drivers.md` | `renderErasureQueue`, `#erasure-body`, `#er-note` — the queue UI, because it mounts on the **Contacts** page | L16045, L16268, L15992 |

None of the five states the flow as a whole, and none records the two navigation defects in §12.7.

### 12.2 Why the feature exists — the source's own statement, L15953–L15959

> *"7) PDPL ERASURE. Guide §7.2 promises account deletion. The panel had consent capture but no erasure: no request, no clock, no execution, no record. Saudi PDPL gives the data subject a right to erasure with a response deadline — and financial records must still be retained for tax, so this is anonymisation of the person, not deletion of the books."*

**That last distinction is the design.** It is restated in the modal copy (L15987), in the execute gate's consequence list (L18008) and in the execution log line (L16031). Erasure scrubs the *person*; trips, invoices and payments survive.

### 12.3 Data model

| Symbol | Line | Value |
|---|---:|---|
| `DB.erasureRequests` | **L15961** | `[]` — **seeded empty**. There are no demo erasure requests; the queue is blank until an operator logs one. |
| `ERASURE_SLA_DAYS` | **L15962** | `30` — the statutory response clock, in days |

Record shape, built at **L16002–L16006**:

| Field | Source | Line |
|---|---|---:|
| `id` | `'ERA-'+String(DB.erasureRequests.length+1).padStart(4,'0')` → `ERA-0001`, `ERA-0002`, … | L16002 |
| `riderId` / `riderName` | the subject | L16003 |
| `status` | `'Pending'` at creation; later `'Executed'` (L16029) or `'Rejected'` (L16040) | L16003 |
| `openedAtMs` | `nowMs()` | L16004 |
| `dueAtMs` | `nowMs() + ERASURE_SLA_DAYS*86400000` — **30 days in ms** | L16004 |
| `note` | `(document.getElementById('er-note')||{}).value||''` — the free-text field from the request modal | L16005, field at L15992 |
| `requestedBy` | resolved `DB.teamUsers` name for `CURRENT_USER_ID`, falling back to the raw id | L16001, L16006 |
| `executedAtMs` | `null` at creation; `nowMs()` on execution | L16006, L16029 |

**Id-collision risk:** `padStart` on `length+1` means the id is derived from the array's current length, and the array is **never spliced** — only `unshift` (L16007) and in-place status mutation. So ids are stable in practice, but a future delete would make `ERA-` ids collide.

### 12.4 The five blockers — `erasureBlockers(riderId)` L15964–L15977

The gatekeeper. Returns an array of `{label, detail}`; an empty array means the request can execute.

| # | Blocker | Test | `detail` | Line |
|---:|---|---|---|---:|
| 1 | **Active subscription** | any `DB.subscriptions` entry with `s.rider===riderId` and `/active\|expiring/i.test(s.status)` | `'<ids> — must be cancelled or run to expiry first'` | L15966–L15969 |
| 2 | **Wallet balance** | `getRiderWallet(r).balance > 0` (typeof-guarded) | `'<n> SAR must be refunded or spent before closure'` | L15970–L15971 |
| 3 | **Open fairness case** | any `DB.fairnessCases` with `c.subjectId===riderId && c.status==='Open'` | `'A captain report about this rider is still under decision'` | L15972–L15973 |
| 4 | **Open support ticket** | any `DB.tickets` with `t.entity===riderId && !t.resolvedAtMs` | `'Close or resolve outstanding tickets first'` | L15974–L15975 |

Four blockers, not five. Note the status test at L15968 is a **case-insensitive regex on a display string** (`/active|expiring/i`), so it also matches a status such as `'Inactive'` — the substring `active` is present. **UNVERIFIED:** whether any `DB.subscriptions` status string containing `active` as a substring but not meaning "active" exists; `05a-subscriptions.md` §5 owns the status enumeration and should be consulted.

`erasureBlockers` is evaluated **twice** — once when the modal opens, to show the warning (L15981), and again at execution time, to enforce it (L16018). The second evaluation is the real gate; the first is advisory, and the modal says so.

### 12.5 The flow, end to end

```
ticket detail  ──(reasonCode === 'FBK_ACCOUNT_DELETE')──►  openErasureRequest(riderId)
   L14834                                                        L15978
                                                                   │
                                                       erasureBlockers()  L15981
                                                       modal + #er-note   L15982–L15995
                                                                   │
                                                   [ GATE_SPECS.commitErasureRequest ]  L18358
                                                                   │
                                                          commitErasureRequest(riderId)  L15997
                                                            ├─ duplicate-Pending guard    L15999
                                                            ├─ build ERA- record          L16002
                                                            ├─ DB.erasureRequests.unshift L16007
                                                            ├─ logContact(FBK_ACCOUNT_DELETE, linked) L16008
                                                            ├─ logAction('erasure_requested')  L16010
                                                            └─ renderErasureQueue()       L16011
                                                                   │
                          ┌────────────────────────────────────────┴───────────────────────────┐
                 [ guardAction('executeErasure') ]                              [ guardAction('rejectErasure') ]
                            L18002                                                        L18014
                              │                                                              │
                  executeErasure(reqId)  L16014                              rejectErasure(reqId)  L16036
                    ├─ requirePerm('manage_settings')  L16015                   ├─ requirePerm('manage_settings')  L16037
                    ├─ status must be 'Pending'        L16017                   ├─ status must be 'Pending'        L16039
                    ├─ erasureBlockers() must be empty L16018–L16019            ├─ status = 'Rejected'             L16040
                    ├─ scrub 8 rider fields            L16021–L16028            ├─ logAction('erasure_rejected')   L16041
                    ├─ status='Executed', executedAtMs L16029                   └─ renderErasureQueue()            L16042
                    ├─ logAction('erasure_executed')   L16030
                    ├─ renderErasureQueue()            L16032
                    └─ renderRidersTable()             L16033
```

### 12.6 What execution actually destroys — L16021–L16028

```js
if(r){
  r.erased=true;                                            /* L16022 — the tombstone flag */
  r.name='Erased rider '+req.riderId;                        /* L16023 */
  r.phone='[erased]'; r.email='[erased]';                    /* L16024 */
  r.address='[erased]'; r.device='[erased]'; r.lastIp='[erased]';  /* L16025 */
  r.ipLocation='[erased]'; r.photo=null; r.hasPhoto=false;    /* L16026 */
  if(r.movementLog)r.movementLog=[];                         /* L16027 */
}
```

| Destroyed | Retained |
|---|---|
| `name` (replaced by `'Erased rider <id>'`), `phone`, `email`, `address`, `device`, `lastIp`, `ipLocation`, `photo`, `hasPhoto`, `movementLog` | the rider **record itself** (still keyed by `riderId`), `subs`, `trips`, `payments`, `complaints`, `stats`, `wallet`, `rating`, `lvl`, `joined`, `gender`, `city`, `appLang`, `mapPos` |

The rider object is **not deleted from `DB.riders`** — it is tombstoned with `erased:true` (L16022) so every foreign key pointing at it (subscriptions, trips, tickets, audit entries) still resolves. That is what makes "anonymisation of the person, not deletion of the books" (L15959) actually work.

**Fields the scrub does not touch that arguably identify the person:** `gender`, `city`, `appLang`, `mapPos` (a home-area position, L2594 etc.), and `stats`. **UNVERIFIED** whether that is deliberate minimisation or an omission — the source offers no comment either way. `mapPos` in particular survives, and it is a location.

### 12.7 Defects

| # | Severity | Defect | Evidence |
|---|---|---|---|
| **E1** | **High** | **The queue mounts on the wrong page.** `#erasure-body` is emitted by **`renderContactsExtra()`** (L16243–L16270) into `#contacts-extra` — the **Contacts** page (`p-contacts`, L1409). The card is the last fragment of that renderer's output, `'<div class="card"…><h2>🗑 PDPL erasure requests</h2></div><div id="erasure-body"></div>'` at L16268, immediately followed by `renderErasureQueue()` at L16269. Nothing on the Settings page renders it. | L16243–L16244, L16268–L16269, L16046 |
| **E2** | **High** | **The Work Inbox routes the operator to a page that has no erasure queue.** `QUEUE_ROUTE.erasure='settings'` (**L19109**) and the inbox item's action is `"go('settings',null)"` with `actionLabel:'Decide'` (**L19204**). `go('settings')` (L8819) forces `switchSettingsTab('general')`, so clicking *Decide* on a statutory-deadline item lands on **Settings → General** — a tab with no erasure UI at all. The queue is two pages away, on Contacts. | L19109, L19204, L8819, L16268 |
| **E3** | Medium | **The empty state advertises an entry point that does not exist.** L16072 reads *"No erasure requests. One is logged automatically from any §7.2 ticket, or manually from a rider profile."* A grep for `openErasureRequest` returns exactly **two** occurrences in the file: the declaration (L15978) and the ticket-detail button (L14834). **There is no rider-profile entry point.** `buildEntityProfile` (L4083–L4189) never calls it. | L16072 vs L14834, L15978 |
| **E4** | Medium | **The only entry point is conditional on a single reason code.** The button at L14834 renders only when `t.reasonCode==='FBK_ACCOUNT_DELETE'`. A rider who asks for erasure by phone, email or in person cannot have a request logged unless an operator first creates a ticket and codes it exactly that way. Combined with E3, the feature has one narrow door and the UI claims two. | L14834 |
| **E5** | Low | **"logged automatically" is not what happens.** L16072 says a request is *"logged automatically from any §7.2 ticket"*. It is not automatic: an operator must open the ticket, see the conditional button (L14834), open the modal, and confirm through the gate (L18358). Nothing polls tickets for `FBK_ACCOUNT_DELETE`. | L16072 vs L14834, L15978, L18358 |
| **E6** | Low | **Blocker detail is truncated on refusal.** `executeErasure` reports only `blk[0]` — *"⛔ Cannot execute — `<label>`: `<detail>`"* (L16019) — even when several blockers apply. The operator clears one, retries, and meets the next. The modal (L15989–L15990) lists all of them, but the modal is only shown at *request* time, not at *execute* time. | L16019 vs L15989–L15990 |
| **E7** | Low | **The rejection grounds are collected but not stored.** The reject gate demands `options:[{id:'grounds',type:'text',label:'Legal grounds for refusal',placeholder:'Required — will be served to the rider'}]` (L18020), and `rejectErasure` writes an audit line saying the grounds *"must be served to the data subject"* (L16041) plus a toast repeating it (L16043) — but the function sets only `req.status='Rejected'` (L16040). **No `rejectionGrounds` field is written to the record.** The text the operator typed is not persisted on the request. | L18020, L16040–L16043 |
| **E8** | Low | **No SLA breach behaviour.** `dueAtMs` (L16004) is surfaced in the Work Inbox as a countdown (L19203–L19204) but nothing acts when it passes: no escalation, no status change, no alert. A `Pending` request 40 days old is indistinguishable in `DB` from one logged this morning. | L16004, L19203–L19204 |
| **E9** | Low | **`ERASURE_SLA_DAYS` is a code constant, not a setting.** 30 days is hard-coded at L15962 and is not exposed on any Settings tab, despite the panel having a Legal & Consent tab (`#stab-legal`, L1997) and an Operational Limits tab (`#stab-limits`, L1668) that exist for exactly this kind of value. | L15962, L1997, L1668 |

### 12.8 Permissions and confirmation gates

| Operation | `requirePerm` | Gate | Gate severity | Lines |
|---|---|---|---|---|
| `openErasureRequest` | **none** | none | — | L15978 |
| `commitErasureRequest` | **none** | `GATE_SPECS.commitErasureRequest` | plain confirm — *"A statutory clock of 30 days starts now. Nothing is deleted yet — execution is a separate, gated step."*, confirm label **"Log request"** | L15997, **L18358–L18363** |
| `executeErasure` | **`manage_settings`** | `guardAction('executeErasure')` | **`danger:true, irreversible:true`** + a required acknowledgement checkbox `'I have verified there are no remaining blockers'`; confirm label **"Erase permanently"** | L16015, **L18002–L18012** |
| `rejectErasure` | **`manage_settings`** | `guardAction('rejectErasure')` | `danger:true` + a required free-text `grounds` field; confirm label **"Reject request"** | L16037, **L18014–L18021** |

The execute gate's three consequence lines (L18007–L18009) are the clearest statement of the retention model anywhere in the file:

> *"Name, phone, email, device and IP are permanently erased." · "Trips, invoices and payments are **retained** — tax law requires them." · "The account cannot be recovered and the person cannot be re-identified."*

Both gates are `installActionGates()` entries (`L18002`, `L18014`), **not** `GATE_SWEEP` ones — `GATE_SWEEP` (`L20769`; 47 keys declared, 45 installed) contains neither, and `commitErasureRequest` above is a `GATE_SPECS` entry. `executeErasure` is one of only a handful carrying `irreversible:true`.

**Note the asymmetry:** logging a request needs no permission at all (L15997 has no `requirePerm`), while executing or rejecting one needs `manage_settings`. That is defensible — logging starts a clock, it does not destroy anything — but it means any signed-in operator can start a statutory obligation the platform then has 30 days to answer.

### 12.9 Audit and contact trail

Three distinct `logAction` actions, all with `entityType:'rider'`:

| Action | Summary written | Line |
|---|---|---:|
| `erasure_requested` | `'PDPL erasure requested — due within 30 days'` | **L16010** |
| `erasure_executed` | `'PDPL erasure executed — personal identifiers scrubbed; trips, invoices and payments retained under tax-record obligations'` | **L16030–L16031** |
| `erasure_rejected` | `'PDPL erasure request rejected — reason must be served to the data subject'` | **L16041** |

Additionally, `commitErasureRequest` writes a **contact record** (L16008–L16009):

```js
logContact({channel:'in_app', direction:'inbound', reasonCode:'FBK_ACCOUNT_DELETE',
            entityId:riderId, entityName:r.name, linked:{type:'erasure', id:req.id}});
```

The `linked:{type:'erasure',id:req.id}` back-reference is what ties the contact log to the ERA record — and it is also the reason the queue UI ended up on the Contacts page (E1): the flow is modelled as a *contact* first and a *compliance action* second.

Note that `entityName:r.name` captures the rider's name **into the contact log at request time**, before the scrub. After execution the audit trail therefore still carries the real name via that contact entry, while the rider record shows `'Erased rider <id>'`. **UNVERIFIED:** whether the contact log is itself in scope for erasure under PDPL; the source does not address it.

### 12.10 Queue rendering — `renderErasureQueue()` L16045+

| Element | Line | Detail |
|---|---:|---|
| Guard | L16046–L16047 | `var el=document.getElementById('erasure-body'); if(!el)return;` — returns silently on every page except Contacts |
| Pending count | L16048, L16050 | `filter(status==='Pending')`; the number turns `var(--amber-dk)` when non-zero |
| Executed count | L16051 | `filter(status==='Executed')` |
| Per-request rows | L16053–L16071 | blockers re-computed per row, but **only for `Pending`** (`q.status==='Pending'?erasureBlockers(q.riderId):[]`, L16056) |
| Actions | L16067–L16068 | `Reject` (plain) and `Execute`; the Execute button is primary (`btn sm p`) **only when there are no blockers** — `'btn sm '+(blk.length?'':'p')` |
| Empty state | L16072 | the string containing the two claims disproved in E3 and E5 |

The `blk.length?'':'p'` styling at L16068 is a nice touch worth recording: a blocked request's Execute button is visually de-emphasised rather than disabled, so an operator can still press it and receive the specific reason (L16019).

### 12.11 Work Inbox integration

| Symbol | Line | Value |
|---|---:|---|
| `QUEUE_ROLE.erasure` | **L19101** | `['Owner','Operations']` — only these two roles see the item |
| `QUEUE_LABEL.erasure` | **L19106** | `'PDPL'` |
| `QUEUE_ROUTE.erasure` | **L19109** | `'settings'` — **wrong destination, see E2** |
| Item builder | **L19201–L19205** | iterates `DB.erasureRequests`, skips anything not `Pending`, emits `wi('erasure', q.id, 'PDPL erasure — '+q.riderName, 'statutory deadline', q.dueAtMs-nowMs(), {entity:q.riderId, action:"go('settings',null)", actionLabel:'Decide'})` |

The due value passed to `wi()` is `q.dueAtMs-nowMs()` — a **remaining-milliseconds delta**, so the inbox sorts erasure items by urgency alongside tickets and disputes. Note the item **title carries `q.riderName`** (L19203), the name captured at request time; after execution the request is no longer `Pending` and drops out of the inbox, so an erased rider's real name cannot linger there.

### 12.12 Boot dependency

`DB.erasureRequests` is one of the three collections the `credit notes` boot module declares as prerequisites — `{name:'credit notes', fn:gapsBoot2, needs:['creditNotes','erasureRequests','massEvents']}` at **L21814**. So the erasure feature is initialised as part of the same late boot module as credit notes and mass events, not as part of the identity/permissions boot.

### 12.13 Line-number index for §12

| Symbol | Lines |
|---|---|
| `#p-contacts` (host page for the queue) | 1409 |
| `#stab-limits` / `#stab-legal` (where the SLA constant arguably belongs) | 1668 / 1997 |
| `buildEntityProfile` (no erasure entry point) | 4083–4189 |
| `go('settings')` router branch | 8819 |
| **`openErasureRequest` entry button** (ticket detail, conditional) | **14834** |
| PDPL section comment | 15953–15959 |
| **`DB.erasureRequests`** | **15961** |
| **`ERASURE_SLA_DAYS = 30`** | **15962** |
| **`erasureBlockers(riderId)`** | **15964–15977** |
| — active-subscription blocker | 15966–15969 |
| — wallet-balance blocker | 15970–15971 |
| — fairness-case blocker | 15972–15973 |
| — open-ticket blocker | 15974–15975 |
| **`openErasureRequest(riderId)`** | **15978–15996** |
| — retention explainer copy | 15987 |
| — blocker warning / all-clear banners | 15988–15991 |
| — **`#er-note`** | **15992** |
| — footer → `commitErasureRequest` | 15994 |
| **`commitErasureRequest(riderId)`** | **15997–16013** |
| — duplicate-Pending guard | 15999–16000 |
| — ERA record | 16002–16006 |
| — `unshift` | 16007 |
| — `logContact` + `linked` | 16008–16009 |
| — `logAction('erasure_requested')` | 16010 |
| **`executeErasure(reqId)`** | **16014–16035** |
| — `requirePerm('manage_settings')` | 16015 |
| — blocker enforcement | 16018–16019 |
| — **field scrub** | **16021–16028** |
| — status / `executedAtMs` | 16029 |
| — `logAction('erasure_executed')` | 16030–16031 |
| — `renderRidersTable()` cascade | 16033 |
| **`rejectErasure(reqId)`** | **16036–16044** |
| — `logAction('erasure_rejected')` | 16041 |
| **`renderErasureQueue()`** | **16045–16073** |
| — `#erasure-body` guard | 16046–16047 |
| — per-row blockers | 16056 |
| — Reject / Execute buttons | 16067–16068 |
| — empty state (E3, E5) | 16072 |
| `renderContactsExtra()` | 16243–16270 |
| — **`#erasure-body` emitted (E1)** | **16268** |
| — `renderErasureQueue()` call | 16269 |
| **`guardAction('executeErasure')`** | **18002–18012** |
| **`guardAction('rejectErasure')`** | **18014–18021** |
| **`GATE_SPECS.commitErasureRequest`** | **18358–18363** |
| `QUEUE_ROLE.erasure` | 19101 |
| `QUEUE_LABEL.erasure` | 19106 |
| **`QUEUE_ROUTE.erasure` (E2)** | **19109** |
| `wi()` builder | 19111+ |
| **inbox item emitter (E2)** | **19201–19205** |
| boot module `needs:['creditNotes','erasureRequests','massEvents']` | 21814 |
