# Settings Tab: Permissions

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` | Pane `#stab-permissions` (L1534–L1549) | Tab button L1424 (`switchSettingsTab('permissions',this)`) | Render fns `renderRoleMatrix()` L10750–L10771 and `renderPagePermMatrix()` L10711–L10748 — **both are invoked only from `renderTeamTable()`** (L10465–L10466)

---

## 1. Purpose

Two stacked matrices that define what every role can do:

1. **Role permission matrix** (`#role-matrix`, L1540) — the 13 broad, whole-feature permissions in `PERMISSION_LABELS` × the roles currently held by team users. This is the layer `can()` / `requirePerm()` enforce.
2. **Detailed page permissions** (`#page-perm-matrix`, L1547) — 22 pages broken into 52 individually-grantable actions, enforced by `canPage()` / `requirePagePerm()`.

Panel copy:
- Card 1 (L1538): title `Role permission matrix`, description *"Click a checkbox to grant or revoke that permission for everyone with that role."*
- Card 2 (L1545): title `Detailed page permissions`, description *"Every page in this panel, broken into its own grantable actions — click a page name to expand it. Layered on top of the role matrix above: a role still needs the matching broad permission there for anything not marked 'view only' here."*

**Neither matrix stores anything role-shaped.** Permissions live per-user on `DB.teamUsers[i].permissions` and `.pagePerms`; a "role row" is a derived aggregate (see §7.1). The design comment at L10772–L10777 states this explicitly: *"both read and write the same `DB.teamUsers[i].permissions` array, so there is only one real source of truth, not two competing ones."*

---

## 2. Layout map

| Element | Line |
|---------|------|
| Pane `#stab-permissions` | L1534 |
| Card 1 — head 🔐, title, description | L1535–L1539 |
| `#role-matrix` container (`padding:14px`) | L1540 |
| Card 2 — head 🗝️, title, description | L1542–L1546 |
| `#page-perm-matrix` container (`padding:8px 14px 14px`) | L1547 |

No save button, no `.settings-meta` footer. **Every checkbox commits instantly on `onchange`.**

---

## 3. Settings fields — EVERY field

There are no text/number/select inputs. The controls are:

| Control | Selector | Rendered at | Instant handler |
|---------|----------|-------------|-----------------|
| Broad permission checkbox (one per role × permission cell) | `input.rm-cb`, `width:15px`, `accent-color:var(--blue)` | L10763 | `toggleRolePermission(role, permKey, this.checked)` L10778–L10786 |
| Page-permission checkbox (one per role × action cell, inside an expanded page) | `input.pp-cb`, `width:14px` | L10739 | `togglePagePermission(role, pageKey, permKey, this.checked)` L10687–L10702 |
| Page accordion header (click to expand/collapse) | `div` with `onclick="togglePagePermExpand(pageKey)"` | L10720 | `togglePagePermExpand()` L10707–L10710 |

**Tri-state rendering (both matrices):** a cell is `checked` when **all** current holders of the role have the permission (`allHave`), and set `indeterminate = true` when **some but not all** do (`mixed`) — applied post-render via `el.querySelectorAll('input[data-mixed]')` (L10747 / L10770). Unchecked = nobody has it.

**Cell tooltips:**
- Role matrix (L10763): `<label> — <role>` + ` (mixed across current <role> users)` when mixed + `\n` + the `PERMISSION_DESC` sentence.
- Page matrix (L10739): `<action label> — <role>`.

---

## 4. Tables & lists

### 4.1 Role permission matrix — `renderRoleMatrix()` L10750–L10771

**Container:** `.tbl-scroll > table.dt` (L10755).

**Columns:** `Permission` (a two-line cell: bold `PERMISSION_LABELS[p]` + a `max-width:340px` grey `PERMISSION_DESC[p]`), then **one column per distinct role**, derived at L10753:
```
roles = DB.teamUsers.map(u => u.role).filter((r,i,arr) => arr.indexOf(r) === i)
```
With the seed roster (L2831–L2841) that is, in first-appearance order: **Owner, Finance, Support, Ops Manager**.

**Rows:** `Object.keys(PERMISSION_LABELS)` — 13 rows, in declaration order (L3225–L3239).

**Row actions:** none besides the cell checkboxes. No add/edit/delete — the permission list is a hardcoded constant.

**Empty state:** none. A role with zero users produces `allHave === false` (guarded by `usersWithRole.length>0`, L10760) so its column renders all-unchecked; a column only disappears if no user holds the role at all.

### 4.2 Detailed page permissions — `renderPagePermMatrix()` L10711–L10748

Not a single table — an accordion of 22 collapsible page blocks (`border:.5px solid var(--border2); border-radius:9px`), each rendering its own `table.dt` when expanded.

**Accordion header (L10720–L10725):** `<icon> <page label>` on the left; on the right either `requires: <PERMISSION_LABELS[pg.legacy]>` or the literal `no legacy gate`, then a `▼` chevron rotated `-90deg` when collapsed.

**Expanded table columns:** `Action` + one column per role (same derivation, L10714).
**Expanded table rows:** one per entry in `pg.perms`.

**Expansion state:** `var _pagePermExpanded={}` (L10706) — a module-level object, **not persisted**; every `renderTeamTable()` (i.e. every entry to the Settings page, L8819) re-renders the matrix but keeps `_pagePermExpanded` since it is a module global. It resets on page reload.

**Row actions / add / delete:** none. `PAGE_PERMISSIONS` is a hardcoded constant with a stated STANDING RULE at L10560–L10562: *"any new page or major new action built into this panel gets an entry added here in the same change — permissions are not an afterthought bolted on later."*

---

## 5. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|-------------|-----------|-----------|-------|-----------|
| Broad permission checkbox | L10763 | `toggleRolePermission(role,permKey,grant)` L10778–L10786 | Applies to **every current holder of that role**; also re-syncs `pagePerms` for pages whose `legacy === permKey`; re-renders both matrices; toast `✅ Granted "<label>" for <n> <role> user(s)` / `🚫 Revoked …` | `DB.teamUsers[i].permissions`, `DB.teamUsers[i].pagePerms` | `requirePerm('manage_team')` L10779 | **yes** — `logAction('toggle_role_permission','role',role,'<Granted\|Revoked> "<label>" for all <role> (<n> user(s))',{usersWithPermission:'<had> of <n>'},{usersWithPermission:'<0\|n> of <n>'})` L10784 | **no** |
| Page-permission checkbox | L10739 | `togglePagePermission(role,pageKey,permKey,grant)` L10687–L10702 | Pushes/splices `permKey` on `u.pagePerms[pageKey]` for every holder of the role; re-renders the page matrix only; toast `✅ Granted "<action>" (<page>) for <n> <role> user(s)` | `DB.teamUsers[i].pagePerms[pageKey]` | `requirePerm('manage_team')` L10688 | **yes** — `logAction('toggle_page_permission','role',role,'<Granted\|Revoked> "<action label>" on <page label> for all <role> (<n> user(s))',{},{})` L10700 | **no** |
| Page accordion header | L10720 | `togglePagePermExpand(pageKey)` L10707–L10710 | Flips `_pagePermExpanded[pageKey]`, re-renders the whole matrix | module global only | none | no | n/a |

**Self-lockout guard (role matrix only, L10781):**
```
if (!grant && permKey === 'manage_team' && affected.some(u => u.id === CURRENT_USER_ID))
    → toast('🔒 You cannot revoke your own team-management permission','err'); return;
```
Blocks revoking `manage_team` from the role you yourself hold. **There is no equivalent guard on `togglePagePermission`** — the `settings.manage_team` granular action can be revoked from your own role without objection (§11).

**Early return when a role has no users (L10780 / L10689):** `if(!affected.length) return;` — silently, with the checkbox already flipped in the DOM and no re-render, so the UI would show a state that was never written. Unreachable with the seed.

---

## 6. Modals opened

**None from this pane.** The two related modals are opened from the Team & Roles table (`15b` §6.3, §6.4):

- **`viewUserPermissions(userId)`** (L10787–L10800) — per-user override modal, `Permissions — <name>`, one toggle per broad permission; commits via `saveUserPermissions()` (L10801). This is the *individual* layer sitting on top of the role baseline.
- **`showEffectivePermissions(userId)`** (L21048–L21066) — read-only `What <name> can do`, Granted/Denied lists, reachable only from the impersonation bar.

---

## 7. Rules / policy logic — written out exactly

### 7.1 Aggregation: how a role row is computed
Role matrix (L10759–L10762) and page matrix (L10733–L10737) use identical logic:
```
usersWithRole = DB.teamUsers.filter(u => u.role === r)
allHave  = usersWithRole.length > 0 && usersWithRole.every(u => <u has p>)
someHave = usersWithRole.some(u => <u has p>)
mixed    = someHave && !allHave       // → checkbox.indeterminate = true
checkbox.checked = allHave
```
For the page matrix, `<u has p>` first lazily materialises `u.pagePerms = defaultPagePerms(u.permissions)` if absent (L10735 in the `every`; note the `some` at L10737 does **not** materialise it and reads `(u.pagePerms && u.pagePerms[pageKey] || [])`).

### 7.2 `can()` / `requirePerm()` — the broad layer (L3122–L3133)
```
function can(permKey){
  var u = DB.teamUsers.find(x => x.id === CURRENT_USER_ID);
  return !!(u && u.permissions && u.permissions.indexOf(permKey) >= 0);
}
function requirePerm(permKey){
  if (can(permKey)) return true;
  var lbl = PERMISSION_LABELS[permKey] || permKey;
  logAction('permission_denied','permission',permKey,'Blocked — tried "'+lbl+'" without permission');
  toast('🔒 Your role lacks permission: ' + lbl, 'err');
  return false;
}
```
**On denial:** (a) a red toast naming the missing permission, (b) an audit entry with `action:'permission_denied'`, `entityType:'permission'`, `entityId:<permKey>`, and (c) `false` returned so the calling commit function `return`s before mutating anything.

The architectural comment at L3117–L3121 states the placement rule: *"One choke point per action, placed on the COMMIT function (the line that actually mutates DB), never on buttons — so every UI path (dashboard card, unified picker, profile page, modal) hits the same wall. A denial is itself a real security event, so it IS audit-logged — distinct from never logging an action that didn't happen."*

Consequence: **buttons are never hidden or disabled by permission.** A user without a permission still sees and can click the control; the block happens at commit with a toast.

### 7.3 `canPage()` / `requirePagePerm()` — the granular layer (L10666–L10686)
```
function currentUserPagePerms(){
  var u = DB.teamUsers.find(x => x.id === CURRENT_USER_ID);
  if (!u) return {};
  if (!u.pagePerms) u.pagePerms = defaultPagePerms(u.permissions);   // lazy materialisation
  return u.pagePerms;
}
function canPage(pageKey, permKey){
  var grants = currentUserPagePerms()[pageKey];
  return !!grants && grants.indexOf(permKey) >= 0;
}
function requirePagePerm(pageKey, permKey){
  if (canPage(pageKey, permKey)) return true;
  var pg = PAGE_PERMISSIONS[pageKey];
  var permDef = pg ? pg.perms.find(p => p.key === permKey) : null;
  var label = (pg ? pg.label + ' — ' : '') + (permDef ? permDef.label : permKey);
  toast('🔒 Your role lacks permission: ' + label, 'err');
  logAction('permission_denied','permission', pageKey + '.' + permKey,
            'Blocked: ' + currentUserName() + ' lacks "' + label + '"', {}, {});
  return false;
}
```
Same three-part denial. Audit `entityId` is `"<pageKey>.<permKey>"` (dotted) so page denials are distinguishable from broad ones. The comment at L10677–L10678 calls it *"the same 'block + explain + log the denial' pattern as `requirePerm()`, scoped to one specific action on one specific page."*

### 7.4 `defaultPagePerms(broadPerms)` (L10653–L10664)
```
for each pageKey in PAGE_PERMISSIONS:
    unlocked = !pg.legacy || broadPerms.indexOf(pg.legacy) >= 0
    out[pageKey] = unlocked ? <all perm keys for that page> : ['view']
```
Design note L10652 (verbatim): *"Every page defaults to at least 'view' for everyone (nothing in this panel is hidden-by-default); action permissions unlock only when the matching legacy broad permission is already held."*

### 7.5 Two-way sync between the layers
**Broad → granular, on role-matrix toggle (L10789–L10796):**
```
for each affected user:
    push/splice permKey in u.permissions
    if (!u.pagePerms) u.pagePerms = defaultPagePerms(u.permissions)
    for each pageKey where PAGE_PERMISSIONS[pageKey].legacy === permKey:
        u.pagePerms[pageKey] = grant ? <all perm keys> : ['view']
```
The comment at L10792–L10794 explains the narrowing: *"Sync only the pages gated by THIS broad key — leaves any other page's independently-customized granular grants untouched instead of blindly regenerating the whole pagePerms object."*

**Broad → granular, on per-user modal save (L10812–L10817):**
```
for each pageKey with a legacy gate:
    hadBefore = prevPerms.includes(pg.legacy)
    hasNow    = granted.includes(pg.legacy)
    if (hadBefore !== hasNow) u.pagePerms[pageKey] = hasNow ? <all keys> : ['view']
```
Only pages whose gate actually *changed* are rewritten.

**Granular → broad: no sync.** Revoking `wallets.process_payouts` in the page matrix leaves `permissions` containing `process_payouts`, so `requirePerm('process_payouts')` still passes. See §11.

### 7.6 THE FULL ROLE × BROAD-PERMISSION MATRIX (seed state)

Rows in `PERMISSION_LABELS` declaration order (L3226–L3238); columns in matrix render order.
`✓` = every holder of that role has it (`allHave`, checkbox checked) · `—` = no holder has it.
No cell is `mixed` in the seed, because the two Support users (USR-3, USR-4) carry identical arrays.

| # | Permission key | Label (L3226–L3238) | Owner (USR-1) | Finance (USR-2) | Support (USR-3, USR-4) | Ops Manager (USR-5) |
|---|----------------|---------------------|:-----:|:-------:|:-------:|:-----------:|
| 1 | `approve_drivers` | Approve / reject driver applications | ✓ | — | — | ✓ |
| 2 | `manage_subscriptions` | Manage subscriptions & renewals | ✓ | — | — | ✓ |
| 3 | `live_ops` | Live map operations & intervention | ✓ | — | — | ✓ |
| 4 | `manage_plans` | Create / edit pricing plans | ✓ | — | — | ✓ |
| 5 | `view_finance` | View financial reports | ✓ | ✓ | — | ✓ |
| 6 | `process_payouts` | Process driver payouts | ✓ | ✓ | — | — |
| 7 | `release_escrow` | Release subscription escrow | ✓ | ✓ | — | — |
| 8 | `apply_deductions` | Apply / waive deductions | ✓ | ✓ | — | — |
| 9 | `manage_tickets` | Manage support tickets | ✓ | — | ✓ | ✓ |
| 10 | `view_profiles` | View rider / driver 360° profiles | ✓ | ✓ | ✓ | ✓ |
| 11 | `contact_users` | Call / message riders & drivers | ✓ | — | ✓ | ✓ |
| 12 | `manage_team` | Invite / edit team & permissions | ✓ | — | — | — |
| 13 | `manage_settings` | Manage system settings & configuration | ✓ | — | — | — |
| | **Totals** | | **13/13** | **5/13** | **3/13** | **8/13** |

**Only the Owner role holds `manage_settings`** — so with the seed, only Sarah Al-Rashid (USR-1) can save anything on the other ten Settings sub-tabs documented in this set.

### 7.7 `PERMISSION_DESC` — the full sentence per permission (L3244–L3258)

| Key | Description (verbatim) |
|-----|------------------------|
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
| `manage_team` | **Overridden at L10516 to:** Add or edit team members, change roles, and grant or revoke any permission — including this one. *(Original value at L3256: "Invite team members, change their role, and edit the role permission matrix itself.")* |
| `manage_settings` | Change system-wide configuration — cities, dispatch radius, payment gateways, operational limits, branding, and more. |

### 7.8 THE FULL PAGE × ACTION LIST — 22 pages, 52 actions (`PAGE_PERMISSIONS`, L10564–L10651)

`Default for a role` column = what `defaultPagePerms()` produces: **all** actions when the role holds the legacy permission, otherwise `['view']` only. Roles holding the legacy key are taken from §7.6.

| # | pageKey | Label | Icon | Legacy gate | Actions (key → label) | Roles that get all actions by default |
|---|---------|-------|------|-------------|-----------------------|---------------------------------------|
| 1 | `dashboard` | Dashboard | 📊 | *(none — "no legacy gate")* | `view` → View dashboard | **all roles** |
| 2 | `requests` | Requests | 📋 | `live_ops` | `view` → View requests · `assign` → Manually assign a driver · `cancel` → Cancel a request | Owner, Ops Manager |
| 3 | `subscriptions` | Subscriptions | 📦 | `manage_subscriptions` | `view` → View subscriptions · `change_driver` → Change a subscription's driver · `settle` → Early-termination settlement | Owner, Ops Manager |
| 4 | `quickrides` | Quick Rides | ⚡ | `live_ops` | `view` → View quick rides | Owner, Ops Manager |
| 5 | `trips` | All Trips | 🚕 | `live_ops` | `view` → View trip history | Owner, Ops Manager |
| 6 | `renewal` | Renewal Pipeline | ↻ | `manage_subscriptions` | `view` → View renewal pipeline | Owner, Ops Manager |
| 7 | `readiness` | Trip Readiness | ⏱️ | `manage_subscriptions` | `view` → View trip readiness · `resolve` → Reassign an unavailable driver | Owner, Ops Manager |
| 8 | `live` | Live Map | 🗺️ | `live_ops` | `view` → View live map · `intervene` → Intervene on a live trip · `cancel_trip` → Cancel a live trip | Owner, Ops Manager |
| 9 | `drivers` | Drivers | 🚗 | `approve_drivers` | `view` → View driver roster · `approve` → Approve / reject applications · `contact` → Call / message drivers | Owner, Ops Manager |
| 10 | `riders` | Riders | 👤 | `view_profiles` | `view` → View rider list · `contact` → Call / message riders | Owner, Finance, Support, Ops Manager (**all**) |
| 11 | `coverage` | Coverage & Capacity | 🛡️ | `manage_subscriptions` | `view` → View coverage · `assign_backup` → Assign backup captain · `promote_backup` → Promote backup to primary | Owner, Ops Manager |
| 12 | `compliance` | Fleet Compliance | 📑 | `approve_drivers` | `view` → View compliance · `edit_dates` → Edit document expiry dates | Owner, Ops Manager |
| 13 | `safety` | Safety & Incidents | 🚨 | `approve_drivers` | `view` → View incidents · `update_steps` → Update protocol steps · `suspend` → Precautionary suspend a driver · `close` → Close an incident | Owner, Ops Manager |
| 14 | `growth` | Promos & Growth | 📈 | `manage_plans` | `view` → View campaigns & incentives · `create_promo` → Create promo codes · `pause_promo` → Pause / resume a promo · `send_message` → Send bulk messages · `recalc_tiers` → Recalculate driver tiers | Owner, Ops Manager |
| 15 | `zones` | Zones | 🗺️ | `live_ops` | `view` → View zones · `steer` → Send a driver-steering offer | Owner, Ops Manager |
| 16 | `predictive` | Predictive Signals | 🔮 | `manage_subscriptions` | `view` → View predictive signals · `act` → Trigger a retention action | Owner, Ops Manager |
| 17 | `finance` | Finance | 💰 | `view_finance` | `view` → View financial reports | Owner, Finance, Ops Manager |
| 18 | `wallets` | Driver Wallets | 💳 | `process_payouts` | `view` → View payouts & escrow · `process_payouts` → Process driver payouts · `release_escrow` → Release subscription escrow · `apply_deductions` → Apply / waive deductions · `cash_review` → Review / escalate cash reconciliation · `cash_repayment` → Record a driver cash-debt repayment | Owner, Finance |
| 19 | `plans` | Plans | 📄 | `manage_plans` | `view` → View plans · `edit` → Create / edit plans & feature lists | Owner, Ops Manager |
| 20 | `support` | Support Center | 🎧 | `manage_tickets` | `view` → View tickets, disputes & lost-and-found · `manage` → Resolve tickets & disputes | Owner, Support, Ops Manager |
| 21 | `settings` | Settings & Team | ⚙️ | `manage_team` | `view` → View settings · `manage_team` → Manage team & this permission matrix | Owner |
| 22 | `audit-log` | Activity Log | 🕵️ | *(none — "no legacy gate")* | `view` → View activity log | **all roles** |

**Totals: 22 pages, 52 granular actions, 20 legacy-gated pages, 2 ungated (`dashboard`, `audit-log`).**

### 7.9 Where `requirePagePerm` is actually enforced — every call site

19 call sites, covering 8 of the 22 pages:

| Line | Call | Guarded action |
|------|------|----------------|
| L11052 | `requirePagePerm('compliance','edit_dates')` | Edit a document expiry date |
| L12148 | `requirePagePerm('wallets','cash_review')` | Review / escalate cash reconciliation |
| L12189 | `requirePagePerm('wallets','cash_repayment')` | Record a driver cash-debt repayment |
| L13188 | `requirePagePerm('coverage','assign_backup')` | Assign a backup captain |
| L13227 | `requirePagePerm('coverage','promote_backup')` | Promote backup to primary |
| L13449 | `requirePagePerm('safety','update_steps')` | Update protocol steps |
| L13466 | `requirePagePerm('safety','suspend')` | Precautionary suspend |
| L13476 | `requirePagePerm('safety','close')` | Close an incident |
| L13529 | `requirePagePerm('growth','pause_promo')` | `pausePromo()` |
| L13530 | `requirePagePerm('growth','pause_promo')` | `resumePromo()` |
| L13550 | `requirePagePerm('growth','create_promo')` | Create a promo code |
| L13634 | `requirePagePerm('growth','recalc_tiers')` | Recalculate driver tiers |
| L13752 | `requirePagePerm('growth','send_message')` | Send bulk messages |
| L14004 | `requirePagePerm('zones','steer')` | Driver-steering offer |
| L14024 | `requirePagePerm('zones','steer')` | Driver-steering offer (2nd path) |
| L14257 | `requirePagePerm('predictive','act')` | Trigger a retention action |
| L14273 | `requirePagePerm('predictive','act')` | Trigger a retention action (2nd path) |
| L14433 | `requirePagePerm('support','manage')` | Resolve a ticket/dispute |
| L14469 | `requirePagePerm('support','manage')` | Resolve (2nd path) |

**Never enforced anywhere:** all `view` actions (22 of the 52 keys) and the action keys on `requests`, `subscriptions`, `readiness`, `live`, `drivers`, `riders`, `wallets.process_payouts/release_escrow/apply_deductions`, `plans.edit`, `settings.manage_team`. Those surfaces are still gated by the **broad** `requirePerm(...)` layer instead. See §11.

---

## 8. Cross-module effects

| What | Consumer | Effect |
|------|----------|--------|
| `DB.teamUsers[i].permissions` | `can()` L3122 → `requirePerm()` L3126 | Every commit gate in the panel, including **all ten other Settings tabs** (each save function starts with `requirePerm('manage_settings')`) |
| `DB.teamUsers[i].pagePerms` | `canPage()` L10671 → `requirePagePerm()` L10680 | The 19 call sites in §7.9 |
| `permissions` | `effectivePermissions(userId)` L21027 | Powers the impersonation bar count and the `What they can do` modal |
| `permissions` | `renderSidebarPerms()` (called from `impersonate` L21075 / `stopImpersonating` L21086) | **UNVERIFIED** — invoked only behind `typeof … === 'function'` guards; no definition found by grep. If undefined, the sidebar is never filtered by permission. |
| `role` (distinct set) | this pane's column derivation, L10714 / L10753 | Matrix shape |
| `permission_denied` audit entries | Activity tab (`renderAuditLog`) | Denials are visible as security events |
| `renderTeamTable()` | `go('settings')` L8819; boot L14583; `saveSecurityConfig()` L8030; `commitInvite` L10540; `commitEditTeamUser` L10497 | The **only** way either matrix gets rendered |

---

## 9. Hardcoded / mock / demo values

- **`PERMISSION_LABELS`** (L3225–L3239) — 13 hardcoded keys. No UI to add, rename or remove one.
- **`PERMISSION_DESC`** (L3244–L3258) — 13 hardcoded sentences, one of which (`manage_team`) is silently overwritten at L10516.
- **`PAGE_PERMISSIONS`** (L10564–L10651) — 22 hardcoded page entries / 52 actions. No UI to add one.
- **Role columns come from seed users**, so with an empty roster the matrices would render header-only.
- The comment block at L10546–L10563 refers to *"The original 12 permissions"* while `PERMISSION_LABELS` actually contains **13** — a stale count in the documentation comment.
- Checkbox styling (`accent-color:var(--blue)`, 15px/14px) is inline-hardcoded (L10739, L10763).

---

## 10. i18n keys

| Key | Element | Line | Arabic at |
|-----|---------|------|-----------|
| `stab.permissions` | tab button label `Permissions` | L1424 | L7918 (`'الصلاحيات'`) |
| `stabgrp.workspace` | nav group heading | L1421 | L7916 |

**Nothing else is internationalised.** Both card titles/descriptions, all 13 permission labels and descriptions, all 22 page labels, all 52 action labels, the `requires: …` / `no legacy gate` chips, and both denial toasts are hardcoded English.

---

## 11. Gaps, dead code, UNVERIFIED items

1. **No permission is denied at the UI level.** By design (L3117–L3121) gates sit on commit functions, so every button remains visible and clickable to every operator; the block is a toast after the click. Combined with #2 this means a Support user sees the whole Settings page including every save button.
2. **`settings.view` is never enforced.** `requirePagePerm('settings','view')` has no call site, and `go('settings')` (L8819) has no permission check — anyone can open Settings and read every configuration value, including gateways, limits and cancellation fees.
3. **`settings.manage_team` is never enforced.** The granular key exists but every team/permission mutation checks the *broad* `manage_team` instead (`requirePerm('manage_team')` at L10529, L10486, L10688, L10779, L10802). Revoking the granular `settings.manage_team` checkbox therefore does nothing.
4. **The granular layer never feeds back into the broad layer.** Sync is one-way (§7.5). Unticking `wallets.process_payouts` in the page matrix leaves `permissions` containing `process_payouts`, and `requirePerm('process_payouts')` still passes at every wallet commit. The two layers can therefore disagree, which is exactly what the L10555–L10559 comment claims they cannot.
5. **30 of the 52 granular actions have no enforcement point** (§7.9), including every `view` key and several genuinely destructive ones — `requests.cancel`, `live.cancel_trip`, `subscriptions.settle`, `drivers.approve`, `plans.edit`. Those actions are still broad-gated, but the granular checkbox is decorative for them.
6. **Self-lockout guard is incomplete.** `toggleRolePermission` blocks self-revoking broad `manage_team` (L10781), and `saveUserPermissions` blocks it for yourself (L10809) — but `togglePagePermission` (L10687) has **no** self-guard at all, and neither guard prevents a *different* `manage_team` holder from stripping the last Owner. Combined with the absence of any delete/restore path (`15b` §11 #1), the panel can be permanently locked out of team management.
7. **Instant commit, no confirmation, no undo.** A single mis-click on a role cell rewrites every holder of that role at once — potentially all 13 permissions' worth of state for multiple users — with only a toast. No `guardAction` gate is registered for either toggle (contrast `saveCommitPolicy` / `saveCompPolicy`, L18068/L18077).
8. **Mixed-state cells are lossy.** A `mixed` cell renders indeterminate, but clicking it fires `onchange` with `this.checked === true` (browsers resolve indeterminate to checked on first click), which **grants** the permission to everyone in the role — silently flattening a deliberate per-user override. There is no warning.
9. **Silent no-op when a role has no users** (L10689, L10780) — the DOM checkbox stays flipped while nothing was written and nothing re-renders.
10. **`_pagePermExpanded` is not persisted** (L10706) and there is no expand-all / collapse-all; auditing 22 collapsed pages requires 22 clicks.
11. **The role matrix has no "role" entity.** There is no way to create a role, and `TEAM_ROLES` (L10501, used by the invite/edit selects) is a *different* list from the matrix columns (derived from users). See `15b` §3.
12. **Stale comment:** L10547 says "The original 12 permissions" but there are 13.
13. **UNVERIFIED — `renderSidebarPerms()`.** Referenced at L21075 and L21086 behind `typeof` guards; grep finds no `function renderSidebarPerms` definition. If it genuinely does not exist, the sidebar is never permission-filtered and impersonation only changes what commits succeed, not what is visible.
14. **UNVERIFIED — `currentUserName()`** used in the `requirePagePerm` denial message (L10683); not read in this pass.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Tab button (Permissions) | L1424 |
| Pane `#stab-permissions` | L1534–L1549 |
| Card 1 head / title / description | L1535–L1539 |
| `#role-matrix` | L1540 |
| Card 2 head / title / description | L1542–L1546 |
| `#page-perm-matrix` | L1547 |
| `DB.teamUsers` seed (source of both matrices) | L2830–L2841 |
| `CURRENT_USER_ID` | L2862 |
| RBAC design comment | L3117–L3121 |
| `can()` | L3122–L3125 |
| `requirePerm()` | L3126–L3133 |
| `logAction()` | L3134+ |
| `PERMISSION_LABELS` (13) | L3225–L3239 |
| `PERMISSION_DESC` (13) | L3244–L3258 |
| `go('settings')` render entry | L8819 |
| `renderTeamTable()` → renders both matrices | L10451, L10465–L10466 |
| `TEAM_ROLES` | L10501 |
| `PERMISSION_DESC.manage_team` override | L10516 |
| `defaultPermissionsForRole()` | L10523–L10527 |
| `permIcon()` | L10544 |
| `PAGE_PERMISSIONS` comment block | L10545–L10563 |
| `PAGE_PERMISSIONS` (22 pages / 52 actions) | L10564–L10651 |
| `defaultPagePerms()` | L10653–L10664 |
| `currentUserPagePerms()` | L10666–L10670 |
| `canPage()` | L10671–L10674 |
| `requirePagePerm()` | L10676–L10686 |
| `togglePagePermission()` | L10687–L10702 |
| `_pagePermExpanded` | L10706 |
| `togglePagePermExpand()` | L10707–L10710 |
| `renderPagePermMatrix()` | L10711–L10748 |
| `renderRoleMatrix()` | L10750–L10771 |
| Single-source-of-truth comment | L10772–L10777 |
| `toggleRolePermission()` | L10778–L10786 |
| `viewUserPermissions()` | L10787–L10800 |
| `saveUserPermissions()` | L10801–L10820 |
| `requirePagePerm` call sites | L11052, L12148, L12189, L13188, L13227, L13449, L13466, L13476, L13529, L13530, L13550, L13634, L13752, L14004, L14024, L14257, L14273, L14433, L14469 |
| boot `renderTeamTable()` | L14583 |
| `guardAction()` | L17819–L17838 |
| `effectivePermissions()` | L21027–L21034 |
| `showEffectivePermissions()` | L21048–L21066 |
| `impersonate()` / `stopImpersonating()` | L21067–L21089 |
