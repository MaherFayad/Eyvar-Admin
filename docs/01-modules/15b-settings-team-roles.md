# Settings Tab: Team & Roles

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` | Pane `#stab-team` (L1519–L1531) | Tab button L1423 (`switchSettingsTab('team',this)`) | Render fn `renderTeamTable()` L10451–L10467 | Data `DB.teamUsers` (seed L2830–L2841)

---

## 1. Purpose

The roster of everyone with access to the ops panel: name, email, role, last login, account status, and the entry points for inviting, editing, impersonating, and per-user permission editing. `renderTeamTable()` is also the render trigger for **both** permission matrices — it ends by calling `renderRoleMatrix()` and `renderPagePermMatrix()` (L10465–L10466), so the Permissions tab (`15c`) never renders independently of this one.

Panel copy (L1523): title `Team users`, description *"Everyone with access to this ops panel, and what role they carry."*

---

## 2. Layout map

One `.card` (L1520):

| Element | Line |
|---------|------|
| Panel head icon 👥 | L1522 |
| Title `Team users` + description | L1523 |
| Header-right `+ Invite` button (`margin-left:auto`) | L1524 |
| Table `.dt` header row (6 columns) | L1527 |
| `tbody#team-tbody` (JS-filled) | L1528 |

There is **no** `.settings-meta` footer on this pane (unlike General, Cities, Gateways, Limits, Security, Notifications) — `renderSettingsMeta()` (L7341) has no `meta-team` entry, so team changes never show a "last updated by" line here. They are still written to the audit log.

---

## 3. Settings fields — EVERY field

This pane has **no standing configuration inputs**. Every field lives inside the Invite / Edit modals (§6). The per-user record shape is:

### `DB.teamUsers[i]` — every property (seed L2830–L2841)

| Property | Type | Set by | Editable in UI? | Meaning / effect |
|----------|------|--------|-----------------|------------------|
| `id` | string `USR-n` | seed; `commitInvite` generates `'USR-'+(DB.teamUsers.length+1)` with a uniqueness loop (L10538–L10539) | no | Identity key; compared against `CURRENT_USER_ID` (L2862, default `'USR-1'`) |
| `name` | string | seed / invite / edit | yes (Invite `#inv-name`, Edit `#et-name`) | Column 1; audit `actorName` (L3135); avatar initials |
| `email` | string | seed / invite / edit | yes (`#inv-email`, `#et-email`) | Column 2; uniqueness enforced case-insensitively |
| `phone` | string | seed only | **no** | Present on all 5 seed users (e.g. `+966 50 123 4567`); never rendered in this table and never editable here |
| `photo` | `null` on all seeds | seed only | **no** | Not read by `renderTeamTable` |
| `role` | one of `TEAM_ROLES` | seed / invite / edit | yes (custom select) | Column 3 badge `b b-blue`; drives both permission matrices (roles are derived from the distinct set of `u.role`, L10714 / L10753) |
| `lastLogin` | string | seed; `commitInvite` writes the literal `'Not yet'` (L10540) | no | Column 4, rendered raw |
| `status` | string | seed; `commitInvite` writes `'Invited'` (L10540) | no | Column 5 via `statusBadge()` (L3730) |
| `twoFA` | boolean | seed only | **no** | Only read when `DB.opsConfig.security.require2FA` is true (L10454) — then renders a green `2FA on` or red `⚠ 2FA off` chip next to the name (L10456). **There is no UI anywhere to change `twoFA`.** |
| `permissions` | array of broad permission keys | seed; `defaultPermissionsForRole` on invite; role-matrix toggles; per-user modal | yes (🔐 Permissions modal, role matrix) | The array `can()` reads (L3123) |
| `pagePerms` | object `{pageKey: [permKey,…]}` | lazily created by `defaultPagePerms(u.permissions)` (L10659) on first access | yes (page-perm matrix) | The object `canPage()` reads (L10673). **Not present on any seed user** — created on demand. |

### Seeded team (5 users, exhaustive — L2831–L2841)

| id | name | email | phone | role | lastLogin | status | twoFA | permissions (count) |
|----|------|-------|-------|------|-----------|--------|-------|---------------------|
| `USR-1` | Sarah Al-Rashid | sarah@eyvar.com | +966 50 123 4567 | **Owner** | `Today 09:00` | Active | `true` | all 13 |
| `USR-2` | Fahad Al-Dosari | fahad@eyvar.com | +966 55 222 8890 | **Finance** | `Today 08:45` | Active | `false` | 5: `process_payouts`, `release_escrow`, `apply_deductions`, `view_finance`, `view_profiles` |
| `USR-3` | Lina Al-Otaibi | lina@eyvar.com | +966 54 771 3320 | **Support** | `24 Jun` | Active | `false` | 3: `manage_tickets`, `view_profiles`, `contact_users` |
| `USR-4` | Noura Al-Fahad | noura.f@eyvar.com | +966 56 990 1145 | **Support** | `Not yet` | **Invited** | `false` | 3: `manage_tickets`, `view_profiles`, `contact_users` |
| `USR-5` | Yousef Al-Balawi | yousef@eyvar.com | +966 53 410 7762 | **Ops Manager** | `Today 08:10` | Active | `true` | 8: `approve_drivers`, `manage_subscriptions`, `live_ops`, `manage_plans`, `view_finance`, `manage_tickets`, `view_profiles`, `contact_users` |

`CURRENT_USER_ID = 'USR-1'` (L2862) — the session always starts as Sarah Al-Rashid (Owner). The source comment at L2853–L2861 explains this is the deliberate single-operator demo identity.

### The full role list

`var TEAM_ROLES=['Owner','Ops Manager','Finance','Support'];` (L10501) — **exactly 4**, hardcoded, used to build both the Invite and Edit role selects. There is no UI to add a role.

**Important mismatch:** the permission matrices do **not** use `TEAM_ROLES`. They derive columns from the distinct roles actually present on team users (`DB.teamUsers.map(u=>u.role)` deduped — L10714, L10753). All four happen to be present in the seed, so they agree today; if the last holder of a role were removed the matrix column would vanish while `TEAM_ROLES` still offered it. Separately, `DB.compPolicy.roles` (L15380, Reason Codes tab) keys on `'Operations'`, a string that is **not** in `TEAM_ROLES` — see `15k` §11.

---

## 4. Tables & lists

### Table: `#team-tbody` — `renderTeamTable()` L10451–L10467

**Row source:** `DB.teamUsers` in array order (no sort, no filter, no pagination, no search).

**Columns, in order (header L1527):**

| # | Header | Cell content | Line |
|---|--------|--------------|------|
| 1 | `Name` | `u.name` (font-weight 500) + conditional 2FA chip | L10457 |
| 2 | `Email` | `u.email`, raw | L10457 |
| 3 | `Role` | `<span class="b b-blue">u.role</span>` | L10457 |
| 4 | `Last login` | `u.lastLogin`, raw string | L10457 |
| 5 | `Status` | `statusBadge(u.status)` — see §7.2 | L10457 |
| 6 | *(blank header)* | `.ra` action group, 2–3 buttons | L10458–L10463 |

**2FA chip logic (L10454–L10456):**
```
require2FA = DB.opsConfig.security.require2FA
chip = require2FA ? (u.twoFA ? '<span class="b b-green">2FA on</span>'
                             : '<span class="b b-red" title="Security policy requires 2FA for everyone">⚠ 2FA off</span>')
                  : ''            // nothing rendered when the policy is off
```
So the chip column only appears once the Security tab's `Require two-factor authentication` toggle is on (`15e`). With the seed, turning it on immediately flags **USR-2 Fahad, USR-3 Lina and USR-4 Noura** as `⚠ 2FA off`.

**Row actions (per row):**

| Button | Condition | Handler | Line |
|--------|-----------|---------|------|
| `🔐 Permissions` (class `btn sm teal`) | always | `viewUserPermissions(u.id)` L10787 | L10458 |
| `👁 View as` (title *"See the panel exactly as they see it"*) | only when `u.id !== CURRENT_USER_ID` | `impersonate(u.id)` L21067 | L10459 |
| `Edit (in My Account)` (title *"This is you — name, email and photo are edited in My Account"*) | only when `u.id === CURRENT_USER_ID` | `go('my-account',null)` | L10461 |
| `Edit` | only when `u.id !== CURRENT_USER_ID` | `editTeamUser(u.id)` L10468 | L10462 |

**Empty state:** none. `DB.teamUsers.map(...).join('')` (L10455) yields an empty `tbody` if the array were empty — no "no users" message. Not reachable in practice (5 seeded, no delete path).

**Add flow:** `+ Invite` → invite modal → `commitInvite()` pushes to `DB.teamUsers`.
**Edit flow:** `Edit` → edit modal → `commitEditTeamUser(userId)` mutates in place.
**Delete flow: none.** There is no remove/deactivate/revoke-access action anywhere in this pane. A team user, once created, cannot be removed through the UI.

---

## 5. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|-------------|-----------|-----------|-------|-----------|
| `+ Invite` | L1524 | `openInviteModal()` L10502–L10516 | Renders the invite modal into `#modal-content`, opens `#modal-overlay` | none (UI only) | **none on open** | no | n/a |
| `Send invite` (modal) | L10515 | `commitInvite()` L10528–L10543 | Validates; generates id; **pushes a new user**; `closeModal()`; `renderTeamTable()`; `logAction`; toast `✅ Invite sent to <name> (<email>) as <role>` | `DB.teamUsers` (push) | `requirePerm('manage_team')` L10529 | **yes** — `logAction('invite_team_user','team_user',newId,'Invited <name> (<email>) as <role>',null,{name,email,role,status:'Invited'})` L10541 | no |
| `🔐 Permissions` | L10458 | `viewUserPermissions(userId)` L10787–L10800 | Opens the per-user permission modal | none | **none on open** | no | n/a |
| `Save permissions` (modal) | L10798 | `saveUserPermissions(userId)` L10801–L10820 | Replaces `u.permissions` with the checked set; re-syncs `u.pagePerms` for pages whose legacy gate changed; closes modal; re-renders both matrices | `DB.teamUsers[i].permissions`, `.pagePerms` | `requirePerm('manage_team')` L10802 | **yes** — `logAction('edit_user_permissions','team_user',userId,'Updated permissions for <name> (<n> granted)',{permissions:'<before> permissions'},{permissions:'<after> permissions'})` L10818 | no |
| `👁 View as` | L10459 | `impersonate(userId)` L21067–L21078 | **Confirmation-gated** (see below); then sets `CURRENT_USER_ID=userId`, stores the real id in `window.__realUserId`, logs, renders the impersonation bar + sidebar perms, navigates to `dashboard`, toast `👁 Viewing as <name> — you now see only their permissions` | `CURRENT_USER_ID`, `window.__realUserId` | **none** — no `requirePerm` inside `impersonate` | **yes** — `logAction('impersonation_started','permission',userId,'<realName> began viewing the panel as <name> (<role>)')` L21072 | **yes** — registered via `guardAction('impersonate',…)` L21090–L21098 |
| `Edit` | L10462 | `editTeamUser(userId)` L10468–L10484 | Opens the edit modal prefilled | none | **none on open** | no | n/a |
| `Save changes` (modal) | L10482 | `commitEditTeamUser(userId)` L10485–L10500 | Validates; writes `name`, `email`, `role`; closes modal; `renderTeamTable()`; logs; toast `✅ <name> updated` (+ ` · role changed to <role>`) | `DB.teamUsers[i]` `.name/.email/.role` | `requirePerm('manage_team')` L10486 | **yes** — `logAction('edit_team_user','team_user',userId,…,prevSnap,{name,email,role})` L10498 | no |
| `Edit (in My Account)` | L10461 | `go('my-account',null)` | Navigates away to the My Account page | none | none | no | no |
| `Back to my account` (impersonation bar) | L21046 | `stopImpersonating()` L21079–L21089 | Restores `CURRENT_USER_ID`, clears `__realUserId`, logs `impersonation_ended`, returns to `dashboard`, toast `Back to your own account` | `CURRENT_USER_ID` | none | **yes** L21083 | no |
| `What they can do` (impersonation bar) | L21045 | `showEffectivePermissions(CURRENT_USER_ID)` L21048–L21066 | Read-only modal listing Granted / Denied broad permissions | none | none | no | n/a |

### Impersonation confirmation gate (L21090–L21098)
`guardAction('impersonate', …)` wraps `window.impersonate` so the first call opens a confirm dialog instead:
- **Title:** `View the panel as <name>`
- **Summary:** `Role <role> — <granted> of <total> permissions.`
- **Consequences (verbatim, 3):**
  1. `You will see exactly what they see, and be blocked where they are blocked.`
  2. `Any action you take is recorded against <b>your</b> name, not theirs.`
  3. `A banner stays on screen until you switch back.`
- **Confirm label:** `View as them`

`guardAction` (L17819–L17838) replaces the global; on confirm it sets `__guardToken` and re-invokes the original. `window.__skipGuards` bypasses it for seed/programmatic calls.

**Note on consequence #2:** it is only *partly* true. `logAction` stamps `actorId: CURRENT_USER_ID` (L3138) which, while impersonating, **is the impersonated user's id**, not the real one. Only `impersonation_started` records the real operator (L21072–L21073). Flagged in §11.

---

## 6. Modals opened (full field list)

### 6.1 Invite team member — `openInviteModal()` L10502–L10516
- **Title:** `Invite team member` (L10504)
- **Close:** `✕` → `closeModal()`

| Field | id | Control | Required | Default / placeholder | Line |
|-------|----|---------|----------|-----------------------|------|
| `Full name` | `inv-name` | text | yes (red `*`) | placeholder `e.g. Noura Al-Fahad` | L10507 |
| `Email` | `inv-email` | text | yes (red `*`) | placeholder `name@eyvar.com` | L10508 |
| `Role` | `inv-role` (custom select `csel-inv-role`) | `customSelectHTML` (L5336) over `TEAM_ROLES` | yes (red `*`) | **`Support`** | L10510 |

- **Hint (L10512):** *"They will receive an email invite. Role determines what they can see and do — check the permission matrix below once added."* — **the email invite is not actually sent**; no `sendSystemEmail` call exists in `commitInvite`.
- **Footer buttons:** `Cancel` → `closeModal()`; `Send invite` → `commitInvite()` (L10515)

**`commitInvite()` validation order (L10530–L10537):**
1. `requirePerm('manage_team')` — else denial toast + audit entry
2. `if(!name)` → toast `Please enter a name` (err)
3. `if(!email || email.indexOf('@')<0)` → toast `Please enter a valid email` (err)
4. `if(DB.teamUsers.some(u=>u.email.toLowerCase()===email.toLowerCase()))` → toast `This email is already on the team` (err)

**New record written (L10540):** `{id:newId, name, email, role, lastLogin:'Not yet', status:'Invited', permissions:defaultPermissionsForRole(role)}`.
Note the record is created **without** `phone`, `photo`, `twoFA` or `pagePerms` — so an invited user is `twoFA: undefined`, which renders as `⚠ 2FA off` when the security policy is on (falsy).

### 6.2 Edit team member — `editTeamUser(userId)` L10468–L10484
- **Title:** `Edit team member` (L10471)

| Field | id | Control | Required | Prefill | Line |
|-------|----|---------|----------|---------|------|
| `Full name` | `et-name` | text | yes | `u.name` (quotes escaped `/"/g→&quot;`) | L10474 |
| `Email` | `et-email` | text | yes | `u.email` (quotes escaped) | L10475 |
| `Role` | `et-role` (`csel-et-role`) | custom select over `TEAM_ROLES` | yes | `u.role` | L10477 |

- **Hint (L10479):** *"Changing role does not change their current permissions automatically — use 🔐 Permissions to adjust those."* — accurate: `commitEditTeamUser` writes only `name`, `email`, `role` (L10495) and never touches `permissions` or `pagePerms`.
- **Footer:** `Cancel`; `Save changes` → `commitEditTeamUser(userId)` (L10482)
- **Validation (L10490–L10492):** name required; email must contain `@`; email must be unique **excluding this user** (`x.id!==userId`).
- Only reachable for users who are **not** the current user (L10460–L10462).

### 6.3 Permissions — `viewUserPermissions(userId)` L10787–L10800
- **Title:** `Permissions — <u.name>`
- **Sub-line (L10796):** `Role: <span class="b b-blue"><role></span> · Toggle to grant or revoke access`
- **Body:** one row per key in `PERMISSION_LABELS` (13 rows, L3225–L3239) — each row shows the label, the `PERMISSION_DESC` sentence (L3244–L3258), and a `.tog` checkbox `data-perm="<key>"` pre-checked from `u.permissions`.
- **Footer:** `Cancel`; `Save permissions` → `saveUserPermissions(userId)`
- **Self-lockout guard (L10809):** if `userId===CURRENT_USER_ID` and the user currently has `manage_team` but it is unchecked, → toast `🔒 You cannot remove your own team-management permission` (err) and **the whole save aborts** (no partial write).
- Full field list = the 13 permissions; see `15c-settings-permissions.md` §3.

### 6.4 What they can do — `showEffectivePermissions(userId)` L21048–L21066
Read-only, reachable only from the impersonation bar (not from the team table).
- **Title:** `What <name> can do`
- **Paragraph:** `Role <role> · <granted> of <total> permissions granted. This is the list the panel enforces for them — not what you can see as an owner.`
- **Two lists:** `Granted` (green heading) and `Denied` (muted, `✕` prefix). Empty granted list renders `None — this account can only read.` (L21060)
- **Footer:** `Close`

---

## 7. Rules / policy logic — written out exactly

### 7.1 `defaultPermissionsForRole(role)` (L10523–L10527)
```
existing = DB.teamUsers.filter(u => u.role === role)
if (existing.length === 0) return []            // brand-new role → zero permissions
return Object.keys(PERMISSION_LABELS).filter(p =>
         existing.every(u => (u.permissions||[]).indexOf(p) >= 0))
```
The comment at L10517–L10522 states the intent: the baseline for a role is *"permissions every current holder of that role already has in common"* — deliberately mirroring the `allHave` test the role matrix uses to decide whether a cell renders fully-checked, "so a brand-new team member starts consistent with what the matrix already displays for that role, instead of the two ever being able to disagree."

Applied to the seed:
- Invite as **Support** → intersection of USR-3 and USR-4 = `manage_tickets`, `view_profiles`, `contact_users` (3)
- Invite as **Finance** → USR-2's 5 permissions
- Invite as **Owner** → USR-1's 13 permissions (**an Owner invite grants everything, including `manage_team` and `manage_settings`, with no extra confirmation**)
- Invite as **Ops Manager** → USR-5's 8 permissions

Note L10516 also mutates a module constant as a side effect just before this function is declared:
`PERMISSION_DESC.manage_team='Add or edit team members, change roles, and grant or revoke any permission — including this one.'` — overriding the value set at L3256.

### 7.2 `statusBadge(s)` (L3730–L3736) — status column
```
/done|resolved|closed/i   → b-green
/trip|active/i            → b-blue
/late|expir|pend/i        → b-amber
/cancel|risk|refund/i     → b-red
otherwise                 → b-grey
```
So `Active` → blue, `Invited` → grey (no regex matches). There is no dedicated colour for an invited/suspended team user; the function is shared with trips and tickets.

### 7.3 Id generation (L10538–L10539)
```
newId = 'USR-' + (DB.teamUsers.length + 1)
while (any user already has newId) newId = 'USR-' + (parseInt(newId.split('-')[1],10) + 1)
```
Collision-safe by incrementing. Because there is no delete, the length-based seed is monotonic in practice.

### 7.4 Impersonation (L21067–L21089)
```
impersonate(userId):
  if (!window.__realUserId) window.__realUserId = CURRENT_USER_ID   // remember the true operator once
  CURRENT_USER_ID = userId
  logAction('impersonation_started', …)
  renderImpersonationBar(); renderSidebarPerms?(); go('dashboard', null)

stopImpersonating():
  if (!window.__realUserId) return
  CURRENT_USER_ID = window.__realUserId; window.__realUserId = null
  logAction('impersonation_ended','permission',was,'Returned to <name>’s own account')
  renderImpersonationBar(); renderSidebarPerms?(); go('dashboard', null)
```
`renderImpersonationBar()` (L21035–L21047) hides `#impersonation-bar` when `!real || real===CURRENT_USER_ID`, otherwise shows `👁 Viewing as <b>name</b> · role — <n> of <total> permissions` plus the two buttons.

Also note a **separate, unrelated** user-switch path exists (`switch_user`, L3100–L3113) that changes `CURRENT_USER_ID` directly and rejects members whose `status==='Invited'` (`That member has not logged in yet`). That path is not reachable from this pane — `openUserSwitchGuardless()` (L3114) is an **empty function**.

---

## 8. Cross-module effects

| What | Consumer | Line | Effect |
|------|----------|------|--------|
| `DB.teamUsers[i].permissions` | `can(permKey)` | L3122–L3125 | Every `requirePerm` gate in the entire panel |
| `DB.teamUsers[i].pagePerms` | `canPage()` / `requirePagePerm()` | L10671–L10686 | 19 granular action gates across Compliance, Wallets, Coverage, Safety, Growth, Zones, Predictive, Support (L11052–L14469) |
| `u.role` (distinct set) | `renderRoleMatrix()` L10750, `renderPagePermMatrix()` L10711 | — | Column set of both permission matrices |
| `u.role` | `currentRole()` L15393 | — | Selects the compensation ceiling in `DB.compPolicy.roles` (Reason Codes tab) |
| `u.role` | `renderCompPolicyTable()` L15466–L15470 | — | The "Issued to date" column sums goodwill by the issuing agent's role |
| `u.twoFA` | this table only | L10454–L10456 | 2FA compliance chips, gated by the Security tab |
| `u.name` | `logAction` `actorName` | L3139 | Every audit row's actor |
| `u.name`, `u.role` | sidebar footer `#sb-ft-name` / `#sb-ft-role`, top-bar avatar `#tb-avatar` | L3108–L3110 | Identity chrome (updated by the `switch_user` path only) |
| `CURRENT_USER_ID` | `goodwillToday()` L15400, `compCheck()` L15422 | — | Per-agent daily goodwill ceiling |
| `renderTeamTable()` | `saveSecurityConfig()` | L8030 | Saving the Security tab re-renders this table so the 2FA chips appear/disappear immediately |
| `renderTeamTable()` | `go('settings')` | L8819 | Rendered on every entry to the Settings page |
| `renderTeamTable()` | boot | L14583 | Initial render |

---

## 9. Hardcoded / mock / demo values

- **All 5 team users are seed/demo data** (L2831–L2841), including real-looking Saudi phone numbers and `@eyvar.com` addresses.
- **`lastLogin` values are literal strings**, not timestamps: `'Today 09:00'`, `'Today 08:45'`, `'24 Jun'`, `'Today 08:10'`, `'Not yet'`. Nothing ever updates them — not `impersonate`, not the `switch_user` path. They will read "Today 09:00" forever.
- **`CURRENT_USER_ID='USR-1'`** (L2862) — hardcoded session identity; there is no login.
- **`TEAM_ROLES`** (L10501) — 4 hardcoded strings.
- **`status` values** `'Active'` / `'Invited'` are free strings, not an enum; `commitInvite` hardcodes `'Invited'` (L10540). Nothing ever transitions `Invited → Active`.
- **The invite email is fictional.** The hint says *"They will receive an email invite"* (L10512) but `commitInvite` sends nothing; contrast with `sendSystemEmail(...)` used elsewhere (e.g. L12455).
- **`twoFA`** is seed-only demo data with no setter.
- **`PERMISSION_DESC.manage_team` override** at L10516 is a hardcoded reassignment of a value already defined at L3256.

---

## 10. i18n keys

| Key | Element | Line | Arabic at |
|-----|---------|------|-----------|
| `stab.team` | tab button label `Team & Roles` | L1423 | L7918 (`'الفريق والأدوار'`) |
| `stabgrp.workspace` | nav group heading | L1421 | L7916 |

**Nothing else in this pane is internationalised.** The panel title, description, all six table headers, the `+ Invite` button, every row action label, and all three modals are hardcoded English with no `data-i18n` attribute — so `applyLanguage('ar')` leaves this pane fully English.

---

## 11. Gaps, dead code, UNVERIFIED items

1. **No delete / deactivate / revoke-access.** A team user can never be removed, suspended, or have their access ended through the UI. `DB.teamUsers` is only ever pushed to (L10540) and mutated in place. This is the single largest functional gap in the pane — an offboarded employee keeps full access.
2. **`Invited` is a terminal state.** Nothing transitions a user to `Active` or refreshes `lastLogin`. Yet an invited user's permissions are live from the moment of creation (`can()` reads `permissions` with no status check, L3123) — an "Invited, never logged in" account is functionally identical to an active one for RBAC.
3. **`twoFA` has no setter.** The Security tab's `require2FA` flag (`15e`) surfaces who is non-compliant but the panel offers no way to make them compliant. `DB.teamUsers` new records don't even define the field.
4. **`phone` and `photo` are dead fields on this pane.** Seeded on every user, never rendered, never editable here. (`photo` is `null` on all 5; `avatarHTML()` at L10836 exists and takes a `hasPhoto` flag but is not used by `renderTeamTable`.)
5. **Impersonation is not permission-gated.** `impersonate()` (L21067) has no `requirePerm` — only a confirm dialog. Any operator can view as any other, including the Owner, and thereby act with the Owner's permissions. The `guardAction` gate is a UX confirmation, not authorization.
6. **Audit attribution during impersonation is misleading.** The gate promises *"Any action you take is recorded against your name, not theirs"* (L21095) but `logAction` writes `actorId: CURRENT_USER_ID` / `actorName: <that user's name>` (L3138–L3139), which during impersonation is the **impersonated** user. Only the `impersonation_started`/`impersonation_ended` pair carries the real operator. This is a direct contradiction between the stated consequence and the implementation.
7. **No `#meta-team`.** `renderSettingsMeta()` (L7341) has no entry for this pane, so unlike General/Cities/Gateways/Limits there is no "Last updated by" line, even though team edits are audit-logged.
8. **No empty state** on `#team-tbody` (L10455) — an empty roster renders an empty table body with headers and no message.
9. **No sort, filter, search or pagination** on the roster.
10. **`TEAM_ROLES` vs matrix roles can diverge** (see §3). Also `DB.compPolicy.roles` uses `'Operations'` (L15382) where `TEAM_ROLES` has `'Ops Manager'` — an Ops Manager therefore falls through to `DB.compPolicy.roles['default']` (50 SAR/case) rather than the 200 SAR row that appears designed for them. See `15k` §11.
11. **`openUserSwitchGuardless()` is an empty function** (L3114) — dead code.
12. **Self-edit is routed away but self-role-change is still possible via the Edit modal for others only.** The current user cannot open their own Edit modal (L10460), so an Owner cannot demote themselves here — but nothing prevents an Owner from being demoted by a different `manage_team` holder, which combined with gap #1 can strand the panel with no Owner. Not guarded.
13. **UNVERIFIED — real invite delivery, real login, real 2FA enrolment.** All three are absent from the file; no backend exists.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Tab button (Team & Roles) | L1423 |
| Pane `#stab-team` | L1519–L1531 |
| Panel head / title / description | L1521–L1523 |
| `+ Invite` button | L1524 |
| Table header (6 cols) | L1527 |
| `tbody#team-tbody` | L1528 |
| `DB.teamUsers` seed | L2830–L2841 |
| `CURRENT_USER_ID` | L2862 |
| `switch_user` path (not reachable here) | L3100–L3113 |
| `openUserSwitchGuardless()` (empty) | L3114 |
| `can()` | L3122–L3125 |
| `requirePerm()` | L3126–L3133 |
| `logAction()` | L3134+ |
| `PERMISSION_LABELS` | L3225–L3239 |
| `PERMISSION_DESC` | L3244–L3258 |
| `statusBadge()` | L3730–L3736 |
| `customSelectHTML()` | L5336 |
| `renderSettingsMeta()` (no team entry) | L7340–L7343 |
| `saveSecurityConfig()` → `renderTeamTable()` | L8030 |
| `go('settings')` render entry | L8819 |
| `renderTeamTable()` | L10451–L10467 |
| `editTeamUser()` | L10468–L10484 |
| `commitEditTeamUser()` | L10485–L10500 |
| `TEAM_ROLES` | L10501 |
| `openInviteModal()` | L10502–L10516 |
| `PERMISSION_DESC.manage_team` override | L10516 |
| `defaultPermissionsForRole()` | L10523–L10527 |
| `commitInvite()` | L10528–L10543 |
| `permIcon()` | L10544 |
| `defaultPagePerms()` | L10653–L10664 |
| `renderPagePermMatrix()` | L10711–L10748 |
| `renderRoleMatrix()` | L10750–L10771 |
| `viewUserPermissions()` | L10787–L10800 |
| `saveUserPermissions()` | L10801–L10820 |
| `avatarHTML()` | L10836–L10845 |
| boot `renderTeamTable()` | L14583 |
| `currentRole()` | L15393–L15396 |
| `guardAction()` | L17819–L17838 |
| `effectivePermissions()` | L21027–L21034 |
| `renderImpersonationBar()` | L21035–L21047 |
| `showEffectivePermissions()` | L21048–L21066 |
| `impersonate()` | L21067–L21078 |
| `stopImpersonating()` | L21079–L21089 |
| `guardAction('impersonate')` | L21090–L21098 |
