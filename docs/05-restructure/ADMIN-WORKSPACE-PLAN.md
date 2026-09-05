# The Admin workspace: team, access, policy and the everyday of running a team. Audit and plan, 2026-09-05

> **Scope: the seven Admin sub-tabs only.** Overview · Workspace · Team & Access · Operational
> Policy · Communications · Data & Compliance · Activity Log. Team management, roles and
> permissions, inviting, sessions, the on-call rota, the audit trail, and how the person who
> administers all of that experiences the workspace. Nothing here changes a screen outside
> `/admin/*` except the shell pieces Admin owns (the role model in `src/shell/permissions.ts`,
> the account layer's permission summary, the on-call chip).
>
> **Companion to** [`OPERATOR-EXPERIENCE-PLAN.md`](OPERATOR-EXPERIENCE-PLAN.md) (its Phase 6b is
> superseded by this document, see §6), [`MANAGEMENT-OPERATIONS-PLAN.md`](MANAGEMENT-OPERATIONS-PLAN.md)
> and [`FINANCIALS-UX-PLAN.md`](FINANCIALS-UX-PLAN.md).
>
> **Precedence.** `docs/RULINGS.md` governs. D17 (six roles, twenty keys, a view key and a write
> key per row, a signed per-user delta) and D20 (nineteen Admin panes across the seven sub-tabs,
> no eighth sub-tab, feature flags and impersonation out) are decided and are not reopened here.
> Where this plan needs the owner it says so in §4 and proceeds under a stated assumption.

---

## 0. Scope, method and evidence

**Read in full:** `src/routes.tsx`, `src/shell/permissions.ts`, `src/shell/AppLayout.tsx`,
`src/shell/TopBar.tsx`, `src/shell/AccountMenu.tsx`, `src/shell/layers/AccountLayer.tsx`,
`src/screens/onboarding/OnboardingLayer.tsx`, `src/screens/admin/team/*` (screen, invite modal,
sessions dialog, copy), the entry file of each of the other five Admin screens,
`src/data/types/{session,team,navigation,audit,onboarding}.ts`,
`src/data/clients/{team,session,securityPolicy,integrations}.ts`,
`src/data/fixtures/{teamUsers,routeTable}.ts`, `docs/RULINGS.md`, DECISIONS.md D4, D17, D19,
D20, the three companion plans, `design/14-system-wide-ux-plan.md` §0 and Part C,
`PROPOSED-STRUCTURE.md` §8 and §10, and the legacy team, permissions and act-as code at
`eyvar_ops_panel_v40_fixed.html:3060-3135`, `:3225-3260`, `:10495-10530`.

**Rendered in Chromium** against the dev server at 1280 × 800, signed in as the seeded Owner,
then switched through the account menu to the seeded Support operator and the seeded Ops
Manager and navigated **in-app**. A `page.goto` after the switch reloads the bundle and resets
the mock session to the Owner; a first pass was invalidated by exactly that, and the harness in
T9.2 encodes the lesson. Captures: all seven Admin sub-tabs, the account layer, the onboarding
layer, and the forbidden state on `/admin/team` and `/financials/payouts` as Support.

**Measured on those captures:**

| Route | Page height | Buttons | Cards | `text-xs text-muted-foreground` nodes |
|---|---:|---:|---:|---:|
| `/admin/overview` | 1017 | 5 | 2 | 18 |
| `/admin/workspace` | 800 (fits) | 57 | 3 | 86 |
| `/admin/team` | 800 (fits) | 13 | 4 | 39 |
| `/admin/policy` | **6182** | **163** | 5 | 85 |
| `/admin/communications` | 800 | 62 | 4 | **145** |
| `/admin/data` | 800 | 28 | 3 | 57 |
| `/admin/activity` | 800 | 8 | 0 | 1 |

The tree has 177 test files. The team client declares 13 operations (`clients/team.ts:92-106`).
The seed roster holds 5 operators (`fixtures/teamUsers.ts`). The Arabic team dictionary is 139
lines (`i18n/ar/adminTeam.ts`).

**Line numbers** cite the working tree on `feat/remediation-and-ux-phase1` at `2fd59de`.
**Another session modified `FINANCIALS-UX-PLAN.md` while this scan ran** (52 inserted lines,
uncommitted, not this author's). Nothing here depends on that file.

---

## 1. What is already right. Do not re-fix

- **The role model is real and enforced at one choke point.** `RouteGuard` (`routes.tsx`) calls
  `forbiddenReason` on every sub-tab and level-3 route; `visibleWorkspaces` and `visibleSubTabs`
  filter the rail and the sub-tab column; `canWriteSubTab` answers `false` for a `null` write key.
  Captured as Support: the Financials and Management tiles are absent, and `/admin/team` and
  `/financials/payouts` render the forbidden state with D17's two sentences and no redirect
  (AC-56, AC-918). Captured as Ops Manager: `/admin/workspace` renders read-only with one banner
  naming the permission and the granter, and Team & Access is not in the sub-tab list.
- **F-016 is an invariant in the client**, and the screen disables in place with the same
  predicate (`types/team.ts` `manageTeamGuard`, `clients/team.ts` `transitionRefusal`).
- **Six lifecycle transitions are real**, each with an audit entry: invite, resend, revoke,
  suspend, reinstate, offboard. Offboarding also clears the rota slots the person held.
- **Security policy is wired to the shell.** `useSessionLifecycle` resolves
  `idleTimeoutMinutes` from the policy (`shell/session.ts:172`); `AppLayout` reads the rota for
  the on-call chip. Both were `useState` theatre a month ago.
- **Workspace, Communications, Data & Compliance and Activity Log read clients and persist
  writes**, with four states each. Integrations (API keys, webhooks, delivery log with replay) is
  built per D20. Reason codes and SLA have the F-014 round-trip test (`policy.test.tsx`).
- **The account layer and the onboarding layer are finished surfaces.**
- **Refusal grammar is one grammar.** Route, control and menu item all say
  `You need the “{permission}” permission. {granter} can grant it.`
- **`switchMockUser` in the account menu** makes every role reachable for QA without a second
  browser. Keep it; T9.2 depends on it.

---

## 2. Findings

Each is one defect appearing in several places. The fix is named once.

### Y1 · Admin is card stacks, not the D20 settings shell

D20 rules that Admin is nineteen **panes** inside a `P4` settings shell (§2.4: a pane list with
its own nav). What ships is one long single column per sub-tab. Operational Policy is
**6182 px tall with 163 buttons** and no way to reach Reason codes without scrolling past
Dispatch, Cities and Limits. Team & Access stacks four cards (roster, matrix, security, rota)
with no anchor. Communications puts five cards behind one `Inbox | Outbox` switch. An operator
told "set the SLA for tier 2" has no address to type and no link to send.

**Fix:** T1.1 to T1.4. A pane nav (sticky, inline-start, one row per pane, `?pane=` in the URL
so a pane is linkable) on the five Admin sub-tabs that carry more than one pane.

### Y2 · The role model stops at the screen edge

D17 is implemented in the shell and in `types/session.ts`; the Team screen surfaces a fraction
of it.

| D17 / D20 says | What ships | Where |
|---|---|---|
| Roles & permissions pane: the matrix, editable; custom roles | A read-only matrix whose footnote says editing is **blocked on D4 / Q4**, decisions closed on 2026-09-01 | `team/copy.ts` `admin.team.matrix.blocked`; the same sentence at `i18n/ar/adminTeam.ts:97` |
| A per-user override is a **signed delta** against a named role, displayed as a delta (AC-921) | `setOperatorPermissions(userId, permissions[])` writes a **flat array** onto the deprecated `TeamUser.permissions`; `permissionDelta` is read by **zero** `.tsx` files; no UI calls the operation | `clients/team.ts:626-656`, `docs/07-api/ENDPOINTS.md:499` |
| A role change is a guarded, audited transition naming both states (AC-923) | There is no way to change an existing operator's role. `TeamTransition` has no `role` member; the kebab offers six items and none is *Change role* | `types/team.ts`, `AdminTeamScreen.tsx` `actionsFor` |
| An effective-permission preview computed from the router's own predicate (AC-924) | `permissions.test.ts:467` proves the function; no screen renders it | |
| Every role has a seeded holder | Dispatcher and Trust & Safety have **none**; the roster is Owner, Finance, Support ×2, Ops Manager | `fixtures/teamUsers.ts` |
| `manage_settings` is retired (AC-925) | Still in `PERMISSION_KEYS`, so the account layer reads **“21 of 21 granted”** and the onboarding intro *You hold 21 of 21 permissions*, for a model D17 describes as twenty | `types/navigation.ts:218-240`, capture `account-layer` |

**Fix:** Phase 2: one client (`clients/rbac.ts`), two panes, one transition, one preview.

### Y3 · Inviting someone is a form, not a flow

- The role `Select` renders the raw `RoleName` (`AddUserModal.tsx`, `{option}`), while every
  other role on the screen goes through `roleLabel`. In Arabic the invite dialog is the one
  English list on the page.
- Nothing shows what the chosen role **will see**. The admin has to hold D17's 35-row table in
  their head; the matrix that would answer it is three cards down.
- The compensation cap defaults to `100` regardless of role; `capForRole` in the client already
  knows the per-role answer and the modal ignores it.
- No expiry or link in the dialog; the roster row says *Invited N days ago · M resends* and the
  row menu carries the rest. Fine for one invite, slow for five.
- No invite email exists in Communications: `fixtures/emails.ts` has no invite row and Templates
  has no `team.invite`, so the dialog's *“They receive a link”* describes something the product
  cannot show happening.
- Activation (`/activate?token=`) and the onboarding track exist and are good; the gap is between
  *Send invitation* and *Getting started*.

**Fix:** Phase 3.

### Y4 · Administering another operator's sessions is refused by a sentence that is no longer true

`listOperatorSessions` returns `canRevoke: false, refusal: 'cross_operator_session'` for any
operator but yourself (`clients/team.ts:729-746`), and the dialog renders *“Ending another
operator’s session is not built yet.”* Twenty lines below, `revokeOperatorSession` calls
`revokeDevice(deviceId, userId)` and its own comment says the refusal *“would be false”*. P6-T8's
write landed; its read did not follow. An admin who suspects a stolen laptop cannot end that
session.

**Fix:** T0.4.

### Y5 · Three operator-facing sentences describe defects that were fixed

| Key | Says | Truth |
|---|---|---|
| `admin.team.matrix.blocked` | the role model is an open decision (D4 / Q4) | D17 closed both |
| `admin.team.security.notWired` | the shell still expires against a 30-minute constant; *“a change to `src/shell/session.ts`”* | `shell/session.ts:172` reads the policy |
| `admin.team.rota.notWired` | the on-call chip is hardcoded to nobody; *“one line in AppLayout”* | `AppLayout.tsx` reads `getOnCallRota` and the chip shows *On call: Yousef Al-Balawi* |

All three exist in English and Arabic and quote file paths at an operator. They are the inverse
of §11.2: a working control that says it is broken.

**Fix:** T0.1.

### Y6 · Two on-call models on consecutive screens

Admin › Overview's third lead tile reads **“42 on-call slots with nobody assigned”**
(7 days × 3 blocks × 2 tiers, `fixtures/metrics.ts:2683-2722`) and drills to `/admin/team`,
where the rota is **two names**, both filled, and the top bar says someone is on call. The tile is
a legacy schedule (`DB.onCallSchedule`) the rebuild never modelled; the rota the shell reads is a
primary and a secondary. One is wrong and the admin sees both within one click.

**Fix:** T6.1, under decision **O-T4**.

### Y7 · There is no view of an operator

The roster row is name, role, second factor, status, last seen, cap. Nothing says what this
person **holds right now** (the `Mine` chip knows their claim count; the roster does not), what
they **did today** (Activity Log has a `by-actor` view but no `?actor=` deep link from the roster;
the legacy had *“audit for this team member”* at `:9277`), how far through **onboarding** they are
(`GET /me/onboarding?userId=` exists and needs `manage_team`, `ENDPOINTS.md:310`), or which
**devices** they are on without opening a dialog. Six facts about one person live on five
surfaces.

**Fix:** Phase 5, one layer.

### Y8 · Roles are the only team structure

No groups, no shifts, no presence on the roster, no city or zone scoping. D16 rules *one
workspace, one roster* and this plan does not reopen it. Two everyday consequences are visible
from Admin: the roster cannot answer *who is on shift now*, and suspending or offboarding someone
leaves whatever they were holding claimed by a person who cannot sign in until the 30-minute
stale-claim rule frees it (`OWNERSHIP_STALE_MINUTES`). Presence already exists for the
conversation console (`PRESENCE_TOPIC`, `AgentPresence`, `clients/conversations.ts:152, 1176`).

**Fix:** T6.2 to T6.4 for presence, holdings and handover; scoping is **O-T2** and is not built.

### Y9 · The words and the pixels

- **Communications › Outbox:** the mono `Template` value overprints the `Subject` cell on five of
  seven visible rows (`trip.receipt` over *Your Eyvar receipt for trip TRP-…*), and every row
  carries a truncated *“This message…”* line under `Resend`. 145 small grey nodes on one screen,
  the most of any route measured.
- **Team & Access:** the 2FA column repeats *Enrolment pending* in warning ink on three of five
  rows while Admin › Overview already states the count once. The roster is a hand-rolled
  `<table>`, so it has none of `DataTable`'s sort, columns, CSV, `j`/`k` or row focus.
- **Admin › Overview:** the chapter titled **Captains** holds one figure, *Active operators*;
  *3 operators without two-factor* carries *vs 0 target* and no delta; the *Service* chapter's
  `4.8×` and `1.4×` carry no unit an operator can read at a glance.
- **Every Admin card carries a subtitle restating its title** (the X15 pattern from the
  companion plan); none uses `InfoHint`.
- **Activity Log** opens on a first-run empty state in the seed. Correct by design (append-only),
  but the admin who opens it to learn what the log looks like learns nothing.

**Fix:** Phase 7.

### Y10 · Audit coverage is uneven where a team needs it most

`types/audit.ts` records that Communications and Data & Compliance writes shipped **without**
`appendAudit` calls (*“the members exist, the `appendAudit` calls do not”*), and names
`senderIdentity.setDefault` as the most consequential of them. Team writes are audited. There is
no *who can do X* answer anywhere: the matrix says what a role can do, not who holds it.

**Fix:** Phase 8.

### Y11 · Compensation authority is set in two places

The invite modal sets a per-operator cap; D20's Limits pane owns `compPolicy` per role. Today the
invite wins and the role table is decorative. The hierarchy should be *role default, per-operator
override shown as an override*, the same shape as the permission delta.

**Fix:** T2.6 with **O-T5**.

---

## 3. Data hierarchy, stated once

The console has one authority chain and every Admin surface renders a slice of it.

```
Workspace (5)  →  Sub-tab (35)  →  View (?view=)  →  Record  →  360° layer
      view key         write key        (no gate)      command gate (registry)

Operator  =  Role baseline (6 roles × 20 keys)  ±  Delta (granted, revoked)  →  Effective set
             compPolicy per role                 ± cap override               →  Effective cap
```

- **A role is data** (`ROLE_PERMISSIONS`); a custom role is a row in the same table.
- **A delta is signed against a role**; separated from it, it is void (`effectivePermissions`).
- **The preview is the gate.** Anything that shows *what can this person do* calls
  `forbiddenReason` and `canWriteSubTab` over the route table. Nothing hand-writes a second list.
- **The invite is a role plus an optional delta**, never a bare permission set.
- **The on-call rota is a pair of operator ids**; Admin › Overview reads it and keeps no second
  schedule.
- **Admin's own IA is two levels under the sub-tab:** sub-tab → pane → control. A pane has an
  address. Nothing sits in a fourth level.

---

## 4. Decisions needed from the owner, and the assumption each task proceeds under

| # | Question | Recommendation | Built as |
|---|---|---|---|
| **O-T1** | Custom roles now (D17 says *yes, a named role like any other*) or hold? | Ship, with the six built-ins locked and *Duplicate as custom* the only way to start one. | Built (T2.3) |
| **O-T2** | Scoping a role to cities or zones (Y8)? | Not now. D16 stands. Record the demand; a `cityIds` column on the delta is the cheapest future shape. | Not built |
| **O-T3** | Impersonation / *Act as*: the legacy had it (`:3085`); D20 rules it out unless asked. | Keep it out. `switchMockUser` covers QA. | Not built |
| **O-T4** | On-call: the two-name rota or a day × block × tier schedule (Y6)? | The rota. The 42-slot tile's literal goes; the tile computes from the rota. | Built (T6.1) |
| **O-T5** | Compensation cap: role default plus per-operator override, or per operator only (Y11)? | Role default plus override, displayed as an override. | Built (T2.6) |
| **O-T6** | Invite transport: the console sends the email itself (Communications template + sender identity), or hands the admin a link? | Both. A template so the product can show the email; *Copy link* because email is not always where a new hire looks. | Built (T3.3, T3.1) |
| **O-T7** | Bulk invite (CSV of name, email, role)? | Later. Five operators do not need it; a second city might. | Not built |

---

## 5. The plan

Task ids are `T<phase>.<n>`. **Evidence** is what the task must produce before it is reported
done, per `CLAUDE.md`: a typecheck, `test:changed`, and a harness run for anything drawn.
Proposed acceptance criteria are numbered **TA-n**; `product-owner` assigns `AC-` numbers when
they enter a spec.

### Phase 0 · Sentences and small truths (one day)

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T0.1** | Delete the three stale sentences (Y5) in EN and AR. The matrix footnote becomes *Built-in roles are fixed. Duplicate one to change it.* until T2.3 lands, then goes. | `admin/team/copy.ts`, `i18n/ar/adminTeam.ts`, `AdminTeamScreen.tsx` | `npm run i18n:keys`; grep for `notWired` and `matrix.blocked` = 0 |
| **T0.2** | The invite dialog's role list renders `roleLabel`, not the raw name (Y3). | `AddUserModal.tsx` | test: the Arabic dictionary's role label appears in the open dialog |
| **T0.3** | The invite cap prefills from the role and re-fills when the role changes; the field stays editable. | `AddUserModal.tsx`, `clients/team.ts` (export `capForRole`) | test: choosing Finance fills `500` |
| **T0.4** | `listOperatorSessions` answers `canRevoke` from `manage_team`, not from *is it me*; the `cross_operator_session` code and its sentences go (Y4). | `clients/team.ts:729-746`, `types/team.ts`, copy EN + AR | test: the Owner ends the Ops Manager's session and one `team.sessionRevoke` audit entry appears |
| **T0.5** | Seed a Dispatcher and a Trust & Safety operator (D17: *every role gets a seeded holder*), both `Active`. The baseline assertion in the fixtures test covers them. | `fixtures/teamUsers.ts` | the account-menu switch reaches both; AC-914 and AC-916 become runnable against a seed |
| **T0.6** | Drop `manage_settings` from `PERMISSION_KEYS` and the Owner baseline once the readers named in `navigation.ts` are moved to the four successors (AC-925). *21 of 21* becomes *20 of 20*. | `types/navigation.ts`, `types/session.ts`, `shell/permissions.ts`, the remaining readers | grep `manage_settings` outside a retirement comment = 0 |
| **T0.7** | Communications › Outbox: `Template` is a fixed mono column that truncates with a `title`; the per-row *“This message…”* note becomes the action's `title` or an `InfoHint` (Y9). | `admin/communications/EmailLogCard.tsx` | capture: no overprint; rows ≤ 64px |

### Phase 1 · The settings shell

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T1.1** | `SettingsShell` in `components/PageShell.tsx`: a sticky inline-start pane nav (one `<a>` per pane, `aria-current`), `?pane=` through `routeState`, the active pane scrolled into view on load, panes as `<section id>` with an `<h2>`. The pane nav is one tab stop with roving focus, like the rail. Width from a token; the content column keeps `max-w-5xl`. | `components/PageShell.tsx`, `shell/routeState.ts`, `styles/globals.css` if a width token is missing | keyboard test; capture at 1280 |
| **T1.2** | Team & Access adopts it with D20's five panes plus the rota: **Operators · Roles & permissions · Overrides · Sessions & devices · Security policy · On-call**. | `AdminTeamScreen.tsx` split into `panes/*.tsx` | every pane reachable by `?pane=`; `adminTeam.test.tsx` per pane |
| **T1.3** | Operational Policy adopts it: **Dispatch · Cities · Limits · Reason codes & SLA**. The 6182px page becomes four addresses. | `AdminPolicyScreen.tsx` | harness: the first viewport shows the pane nav and the selected pane's `<h2>` |
| **T1.4** | Workspace (**General · Branding · Legal · Integrations**), Communications (**Sender identities · Templates · Push · Delivery log**) and Data & Compliance (**Integrity · Retention · Exports**) adopt it. | the three screens | AC-949's *reachable from its sub-tab's pane navigation* clause becomes testable |

### Phase 2 · Roles, overrides and the preview

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T2.1** | `clients/rbac.ts`: `listRoles()` (six built-ins from `ROLE_PERMISSIONS` plus custom rows), `createRole`, `updateRole` (custom only), `deleteRole` (refused with `role_has_holders` while held), `setPermissionDelta(userId, delta)`, `changeRole(userId, role, reason)`. `changeRole` re-signs the delta against the new role or clears it, and `role` joins `TeamTransition` so `manageTeamGuard` covers it. Every write audits **both states** (AC-923). `setOperatorPermissions` is deleted; `TeamUser.permissions` stops being written. | `clients/rbac.ts` (new), `clients/team.ts`, `types/team.ts`, `types/session.ts`, `types/audit.ts` (`team.roleChange`, `role.create`, `role.update`, `role.delete`) | `npm run api:contract`; `rbac.test.ts`: AC-922 and AC-923 on `changeRole`; the guard refuses a role change that drops the last `manage_team` |
| **T2.2** | `effectivePermissions` accepts a custom role's baseline; `granterRoleFor` finds any role holding `manage_team`; `buildSession` reads the delta (it already does). | `types/session.ts`, `clients/session.ts` | `permissions.test.ts` AC-921 unchanged and green |
| **T2.3** | **Roles & permissions pane.** The matrix becomes a grid with sticky role headers and a *Holders* row. Built-in cells are fixed with the reason in place. **Duplicate as custom** opens a dialog: name, based on, then an editable column. Delete is disabled in place while holders > 0 with the count in the sentence. | `admin/team/panes/RolesPane.tsx`, `RoleEditorDialog.tsx`, copy EN + AR | test: create *Night dispatcher* from Dispatcher, grant `manage_subscriptions`, invite an operator into it, the invite lands with that set |
| **T2.4** | **Overrides pane.** One row per operator with a non-empty delta, displayed `Support + release_escrow − contact_users` (AC-921), never flattened. **Edit override**: the role baseline as a locked list, each key a three-state control (*Inherited · Granted · Revoked*), the effective set updated live. Saving writes the delta and one audit entry. | `panes/OverridesPane.tsx`, `OverrideDialog.tsx` | test AC-921 end to end: grant `release_escrow` to Lina, switch to Lina, Ledger's escrow control is enabled |
| **T2.5** | **The preview.** `AccessPreview` renders D17's 35 rows as the operator will meet them: five workspace tiles, each sub-tab `●` view + write, `◐` view, or absent, computed by `visibleWorkspaces`, `visibleSubTabs` and `canWriteSubTab` over a `PermissionContext` built from the candidate set. Used in the role editor, the override dialog and the invite dialog (T3.1). AC-924 becomes a rendered claim. | `components/access/AccessPreview.tsx` | test: the preview for Support shows no Financials tile and Safety as `◐`, asserted through the router's own functions |
| **T2.6** | Compensation cap becomes *role default* (the Limits pane's `compPolicy`) *plus per-operator override*, shown in the roster as `500.00 SAR` or `500.00 SAR (role default 250.00)`, edited from the override dialog (O-T5). | `types/team.ts`, `clients/team.ts`, `panes/OperatorsPane.tsx`, the Limits card | test: changing the Finance default moves every Finance operator without an override |
| **T2.7** | **Change role** joins the row menu with a reason field and a confirm that names both states. | `panes/OperatorsPane.tsx`, `components/ConfirmDialog.tsx` | test: demote Yousef to Dispatcher and the rail he sees loses four tiles |

### Phase 3 · The invite lifecycle

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T3.1** | **Invite dialog v2**, two steps in one dialog: *Who* (name, email, mobile) and *Access* (role, an optional override revealing T2.4's control, the cap from T2.6, the T2.5 preview live under the role). The primary is *Send invitation*; *Copy invite link* appears after the send (O-T6). | `AddUserModal.tsx` → `InviteDialog.tsx` | test: the preview changes when the role changes; the link reaches the clipboard mock |
| **T3.2** | **Invite state on the roster.** An `Invited` row shows *Expires in N days* or *Expired*; an expired invite offers *Resend* only and activation is refused with the expiry named. `TeamInvite.expiresAt` already exists. | `panes/OperatorsPane.tsx`, `clients/team.ts`, `clients/auth.ts` (`activateInvite` checks expiry) | test: an invite past expiry cannot activate; resend renews it |
| **T3.3** | **Invite template** in Communications › Templates (`team.invite`, EN and AR bodies, placeholders `{name} {role} {link} {expiresAt}`), sent from the default sender identity, one delivery-log row per send and resend. | `fixtures/emails.ts`, `clients/emails.ts`, Communications | test: an invite writes one outbox row with template `team.invite` |
| **T3.4** | Post-activation: the first session auto-opens the onboarding layer (`autoOpenedAt` exists). Verify rather than build; record the result in §7. | `clients/onboarding.ts` | a test exists or is written |
| **T3.5** | Copy pass on every sentence in the invite and activation flow: the word budget in `docs/ref/copy.md`, no em dash, no file path, Arabic mirrored. | `admin/team/copy.ts`, `auth/copy.ts`, `i18n/ar/*` | generator reports 0 over budget |

### Phase 4 · Sessions, devices and security

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T4.1** | **Sessions & devices pane**: one row per live session across the roster (operator, device, city, last active, trusted until), sortable, with *End session* per row and *End all of {name}'s sessions*. Reuses `DeviceList` cells; the per-operator dialog stays reachable from the row menu. | `panes/SessionsPane.tsx`, `clients/team.ts` (`listAllSessions`) | test: ending a session as Owner writes `team.sessionRevoke` |
| **T4.2** | **Security policy pane** carries the fields the types have or D20 names: second-factor requirement, idle timeout, absolute expiry, **re-auth window** for money actions, read by `ReauthModal`. `manage_security_policy` gates the pane; the sub-tab stays `manage_team` (AC-957 as written). | `panes/SecurityPane.tsx`, `types/team.ts`, `components/auth/ReauthModal.tsx` | test: an Ops Manager with `manage_team` granted reaches the panes but Security is disabled in place with the reason |
| **T4.3** | 2FA posture as one fact: the roster's *Second factor* column becomes neutral text; the Operators pane header carries one line *3 operators have not enrolled* with a filter chip; Admin › Overview's tile computes from the roster. | `panes/OperatorsPane.tsx`, `clients/metrics.ts` | capture: no warning ink in the column; the tile moves when a seed enrols |

### Phase 5 · The operator layer

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T5.1** | An **operator** joins `ProfileEntityType`, so `?entity=USR-3` opens the 360° layer for a colleague (`manage_team` for the full layer; `view_profiles` gives name, role and presence only). Sections: identity band; **Access** (role, delta as a delta, effective count, *Open preview*); **Holding now** (claims by queue, *Release* where the viewer may); **Today** (last 20 audit entries by this actor, *Open in Activity Log*); **Sessions**; **Onboarding** (N of M, *Restart* under `manage_team`, AC-641); **On-call**. | `components/profile/operator/*`, `clients/profile.ts`, `shell/layers/ProfileLayer.tsx` | one test per section; Support opening a colleague sees the read-only card |
| **T5.2** | Roster rows open the layer on click; the row menu keeps the transitions. Global search resolves an operator by name. | `panes/OperatorsPane.tsx`, `commands/`, `lib/search` | test: ⌘K *Lina* offers *Lina Al-Otaibi · Support* |
| **T5.3** | Activity Log gains `?actor=` and `?subject=` from the layer and from every audit row's actor cell. | `admin/activity/AdminActivityScreen.tsx`, `routeState` | test |

### Phase 6 · Running a team, as seen from Admin

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T6.1** | One on-call model (O-T4): the Overview tile becomes *On call now* reading the rota (`Yousef · Lina` or *Nobody*); the rota gains an optional `until` so a handover is a fact. The 42-slot literal goes. | `fixtures/metrics.ts:2683-2722`, `clients/metrics.ts`, `types/team.ts` | test: clearing the primary flips the tile and the top-bar chip together |
| **T6.2** | **Presence on the roster.** `AgentPresence` (`online · away · offline`) moves to `clients/presence.ts` with the conversation console importing from there; the roster shows a dot and a word beside each name; the Operators pane header reads *4 online*. | `clients/presence.ts` (new), `clients/conversations.ts`, `panes/OperatorsPane.tsx` | test with the mock realtime driver |
| **T6.3** | **Holdings.** The Operators pane gains a *Holding* column (open claims, from the claims fixture the `Mine` chip already reads) and the operator layer's *Release* / *Reassign* go through the command registry. | `clients/myWork.ts` or `clients/claims`, `panes/OperatorsPane.tsx`, `commands/` | test: reassigning writes a `ClaimTakeover` and the counts move |
| **T6.4** | **Handover.** Suspend and offboard release the person's claims to *Unassigned* in the same mutation, and the confirm names how many. | `clients/team.ts`, `ConfirmDialog` copy | test: suspending an operator with 3 claims leaves 3 unassigned rows and one audit entry naming the count |
| **T6.5** | **Team notifications**: `team.inviteAccepted`, `team.enrolledSecondFactor`, `team.suspended`, `team.roleChanged` as `NotificationType`s, to `manage_team` holders and to the subject where it is theirs. | `types/notifications.ts`, `clients/notifications.ts` | test: activating as Noura puts one row in Sarah's bell |

### Phase 7 · Hierarchy and visuals on Admin

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T7.1** | The roster becomes a `DataTable` (index mode): sort, columns, CSV, `j`/`k`/`.`, row focus, the kebab as the table's row menu. Column budget measured in both languages so *Operator* never truncates at 1280. | `panes/OperatorsPane.tsx` | `table-density.mjs` run; identity clipped = 0 |
| **T7.2** | Card subtitles on all seven Admin sub-tabs become `InfoHint` on the card title (the X15 rule); the count of `text-xs text-muted-foreground` nodes on Communications falls from 145 to under 40 and on Policy from 85 to under 30. | the Admin screens | T9.2 prints the numbers before and after |
| **T7.3** | Badge budget on the roster: a role badge only for Owner and custom roles, the rest text; status is the one remaining fill. | `panes/OperatorsPane.tsx` | capture: ≤ 2 fills per row |
| **T7.4** | Admin › Overview: the chapter is **Operators**, not *Captains*; the 2FA tile gets a real comparison or no delta line; the *Service* figures carry their unit word from `measures.ts`. | `fixtures/metrics.ts`, `metrics/copy.ts` | capture |
| **T7.5** | The matrix grid: sticky first column and role header row; a filled marker for granted and nothing for withheld (S9 kept); custom-role columns identical to built-ins with the word *Custom* under the name, never a colour. | `panes/RolesPane.tsx` | Arabic and dark captures |
| **T7.6** | Activity Log's seed: the fixtures carry the audit entries the seeded roster implies (the Owner's invite of USR-4, the last policy save), so the first open shows the table and the first-run empty state is reached by a test, not by every operator. | `fixtures/audit` or `clients/audit.ts` seed | capture shows rows; the empty test still passes via reset |

### Phase 8 · Compliance and business posture

| Task | Work | Files | Evidence |
|---|---|---|---|
| **T8.1** | Close the audit gap `types/audit.ts` names: every Communications and Data & Compliance write calls `appendAudit`. `auditCoverage.test.ts` widens to assert one entry per mutating operation id in those clients. | `clients/emails.ts`, `clients/notifications.ts`, `clients/integrity.ts`, `clients/retention.ts` | the widened test is green |
| **T8.2** | **Who can do this?** A *Holders* facet on the Roles pane: pick a key, see every operator whose effective set holds it and the delta that gives or takes it. CSV export. This is the access review a PDPL audit asks for. | `panes/RolesPane.tsx`, `clients/rbac.ts` (`holdersOf(key)`) | test: `release_escrow` lists Owner, Finance and Lina after T2.4 |
| **T8.3** | Admin › Overview leads compute from the roster and the sessions: operators without a second factor, invites older than seven days, sessions on untrusted devices. Each drills to the pane with the matching filter. | `clients/metrics.ts`, `fixtures/metrics.ts` | test: enrolling a seed moves the tile |
| **T8.4** | `docs/07-api/` regenerated after Phases 2 to 6; the handover names the `rbac`, `presence` and session endpoints and the `permissionDelta` payload. | `npm run api:contract` | contract check green |

### Phase 9 · Tests and harnesses

| Task | Work | Evidence |
|---|---|---|
| **T9.1** | One behavioural test per D17 and D20 criterion this plan touches: AC-914 to AC-917, AC-921 to AC-925, AC-949, AC-950, AC-954, AC-957, and TA-1 to TA-10. Each refusal test constructs its refusal from state it controls and proves the positive twin. | `test:changed` green; criteria in test titles |
| **T9.2** | `scripts/harness/admin-access.mjs`: switches roles through the account menu and navigates **in-app** (never `page.goto` after the switch); prints per role the rail tiles, the Admin sub-tab rows and the forbidden state on `/admin/team`; and per Admin sub-tab the pane nav, the first-viewport `<h2>`, page height, tallest row and `text-xs.text-muted-foreground` count at 1280, in English and Arabic. | README row; the numbers for all seven sub-tabs before and after |

### Proposed acceptance criteria

- **TA-1** Every Admin sub-tab with more than one pane renders a pane navigation; `?pane=` opens
  that pane in the first viewport at 1280 × 800.
- **TA-2** The invite dialog shows, under the chosen role, the workspaces and sub-tabs the invitee
  will see, computed by the same functions the router uses.
- **TA-3** Changing an operator's role writes one audit entry naming the previous and the new role
  and re-signs or clears their override; the last `manage_team` holder cannot be moved off it.
- **TA-4** A custom role can be created from a built-in, granted a key, given a holder, and cannot
  be deleted while it has one; the refusal names the count.
- **TA-5** An Owner ends another operator's session from Team & Access and one audit entry records it.
- **TA-6** The roster shows each operator's presence and the number of items they hold; suspending
  an operator releases every item they hold and the confirm names the number.
- **TA-7** Admin › Overview's on-call reading and the top bar's on-call chip read the same rota and
  change together.
- **TA-8** No operator-facing string under `admin/` names a file path, a decision id or a defect id.
- **TA-9** Every mutating operation id in the Communications and Data & Compliance clients writes
  one audit entry, asserted by one test over the operation registry.
- **TA-10** Opening `?entity=USR-3` as an Owner shows the operator layer with access, holdings,
  activity, sessions and onboarding; as Support it shows name, role and presence only.

---

## 6. Lanes, collisions and order

| Lane | Tasks | Why it is safe |
|---|---|---|
| **A — words and truths** | T0.1 … T0.7 | seven files; `copy.ts` and its Arabic twin have one owner |
| **B — shell** | T1.1, then T1.2 … T1.4 per screen | `PageShell.tsx` once, then one screen each |
| **C — rbac data** | T2.1, T2.2, T2.6 (data half), T6.1 (data half), T8.1, T8.3 | `src/data` only |
| **D — rbac panes** | T2.3 … T2.7 after C and T1.2 | `admin/team/panes/*` |
| **E — invite** | T3.1 … T3.5 after T2.5 | dialog + Communications fixtures |
| **F — sessions** | T4.1 … T4.3 after T1.2 | one pane |
| **G — operator layer** | T5.1 … T5.3 | `components/profile/operator`, independent of D |
| **H — team** | T6.2 … T6.5 after T5.1 | clients + roster |
| **I — visuals** | T7.1 … T7.6 after D lands on the roster | table-density-engineer first on T7.1 |
| **J — tests** | T9.1 alongside each lane; T9.2 first, so the before-numbers exist | |

**Collisions with the companion plans, resolved:**

| Collision | Resolution |
|---|---|
| OPERATOR-EXPERIENCE P6-T5 … P6-T9 | P6-T5 and P6-T9 are done. **P6-T6 = T2.3 + T2.5, P6-T7 = T2.4, P6-T8 = T0.4 + T4.1.** This plan is where they land; do not schedule them twice. |
| MANAGEMENT-OPERATIONS T9.5 (`InfoHint` to `src/components`) and T9.12 (word budget) | Both precede T7.2 and T3.5. If they have not landed, T7.2 moves `InfoHint` itself and says so in §7. |
| MANAGEMENT-OPERATIONS T9.10 (lucide glyphs) and T7.1 | T9.10 first; T7.1 inherits the drawn icons. |
| `design/14` G5 (one confirm dialog) and T2.7 / T6.4 | Use `components/ConfirmDialog.tsx`, which Team already imports. Do not add a fifth. |
| `design/14` G8 (one detail paradigm) and T5.1 | The operator is a 360° **layer**, the same shape as rider and captain; no new paradigm. |
| D19 presence and T6.2 | The topic and the type move to `clients/presence.ts`; the console imports from there. One presence, two readers. |
| `types/session.ts` `RoleName` and T2.1 custom roles | `RoleName` stays the six literals for baselines; `Role.name: string` is the runtime shape and a custom role's baseline is its own row. Tests that enumerate `ROLE_NAMES` are unaffected. |

**Order.**
1. **Day 1** — Lane A whole. T9.2 so the before-numbers exist.
2. **Days 2–3** — T1.1, then T1.2 and T1.3 (the two tallest pages). T2.1 and T2.2 in `src/data`.
3. **Days 4–6** — Lane D. T1.4. T5.1 begins in parallel.
4. **Days 7–8** — Lane E. Lane F. T6.1.
5. **Days 9–11** — Lanes G and H. T8.1, T8.2.
6. **Days 12–13** — Lane I. T8.3, T8.4. T9.1 closes.

**If cut from the bottom**, five tasks pay for themselves regardless: **T0.1** (three sentences
telling operators the product is broken), **T0.4** (an admin who cannot end a stolen session),
**T1.3** (a 6182px settings page), **T2.4 + T2.5** (the ruling everyone signed, finally on a
screen), **T3.1** (the invite that shows what it grants).

---

## 7. Execution log

Updated by whoever is executing. One line per task: id, status, evidence, date.

| Task | Status | Evidence | Date |
|---|---|---|---|
| T0.1 | done | the three keys deleted in EN and AR; `admin.team.matrix.fixed` replaces the footnote; `i18n:keys` regenerated | 2026-09-05 |
| T0.2 | done | `AddUserModal` renders `roleLabel`; test *names roles by their label* in `adminTeam.test.tsx` | 2026-09-05 |
| T0.3 | done | `capForRole` exported from the client and the barrel; the cap follows the role; same test asserts 100 then 500 | 2026-09-05 |
| T0.4 | done | `listOperatorSessions` answers from `manage_team`; `cross_operator_session` deleted, `no_manage_team` added; two tests in `team.test.ts` (Owner revokes and audits, Support refused, own allowed) | 2026-09-05 |
| T0.5 | done | `USR-6` Dispatcher and `USR-7` Trust & Safety seeded with identities, device sessions, landing routes and onboarding tracks composed from existing steps (no new step copy; AC-630 honoured); `auth.test.ts` AC-617 now asserts every role has a track | 2026-09-05 |
| T0.6 | done | `manage_settings` removed from the union, the runtime list, the Owner baseline, the two fixtures, two dictionaries and four tests; the three Admin readers moved to `manage_workspace` / `manage_data_governance`; the onboarding sentence rewritten | 2026-09-05 |
| T0.7 | done in code, capture pending | subject cell is `block truncate` with a `title`; the dev server is down on another session's missing `RoleFinanceArt` import, so the 1280 capture is owed | 2026-09-05 |
| T1.1 | done, revised | No new `SettingsShell`. D-5 makes the sub-tab column Admin's settings nav, so a pane is a **`?view=`** through the existing `useScreenViews`, drawn by a shared stadium `ViewTabs` (`src/components/ViewTabs.tsx`, the toolbar's own look, D12). `TA-1` reads `?view=` not `?pane=`. Declared in `routeTable.ts` and mirrored in each screen. | 2026-09-05 |
| T1.2 | done | Team & Access: `operators · roles · security · oncall` (overrides and sessions arrive with T2.4 and T4.1); tests *TA-1 — a pane has an address* ×2 | 2026-09-05 |
| T1.3 | done | Operational Policy: `dispatch · cities · limits · reasons`; the four-states test now mounts each pane | 2026-09-05 |
| T1.4 | done | Workspace `general · branding · legal · integrations`; Communications `inbox · outbox · senders · templates · push` (the log card takes its half from the pane, its own tab strip is gone); Data `integrity · retention · exports`. 16 view keys in EN and AR; 226 Admin tests green | 2026-09-05 |
| T2.1 | done | `clients/rbac.ts` (roles CRUD, `setPermissionDelta`, `changeRole`, `holdersOf`) over a shared `clients/rosterStore.ts` that `session.ts` and `auth.ts` now read too, so a change on Team & Access is what the next session resolves. `setOperatorPermissions` deleted. `role` joined `TeamTransition` under the F-016 guard. Four audit actions. `rbac.test.ts`: 14 tests (AC-921 to AC-924, TA-3, TA-4, T8.2). API contract regenerated, 0 problems | 2026-09-05 |
| T2.2 | done | `RoleId` widens `TeamUser.role`; `effectivePermissions` takes the baseline; `trackRoleFor` gives a custom role its built-in's landing and track | 2026-09-05 |
| T2.3 | done | `panes/RolesPane.tsx`: grid with sticky capability column, holders row, *Duplicate as custom*, edit and delete refused in place with the count; `RoleEditorDialog` with live preview; screen test *TA-4* | 2026-09-05 |
| T2.4 | done | `panes/OverridesPane.tsx` and `OverrideDialog.tsx`: delta rows as role plus `+`/`−` chips, three-state control per key, live effective count and preview; screen test *AC-921* end to end | 2026-09-05 |
| T2.5 | done | `components/access/AccessPreview.tsx` over `visibleWorkspaces` / `visibleSubTabs` / `canWriteSubTab`; used by the role editor, the override dialog and the role-change dialog | 2026-09-05 |
| T2.6 | done | `SafetyLimits.compensationCapHalalasByRole` on the Limits pane (six fields under *Compensation cap by role, SAR*, blank is no cap); `roleCapDefault` in `clients/policy.ts` is what `capForRole` answers, so the invite and the roster follow a saved change; `setCompensationCap` on the override dialog with audit `team.cap`; the roster's cap column shows *Role default …* beneath an operator's own cap when they differ. Test *T2.6* in `team.test.ts`; `admin-roster.mjs` prints the six fields | 2026-09-05 |
| T2.7 | done | *Change role* in the row menu; `ChangeRoleDialog` names both states, takes the reason, previews the new role, refuses F-016 in place; screen tests *TA-3* ×2 | 2026-09-05 |
| T3.1 | done, one part deferred | `AddUserModal` (name kept): the role list is the roles table, the preview under it is the router's answer (TA-2), and after the send the dialog hands over the activation link with *Copy invite link* (O-T6). The optional override at invite time is not in the dialog: the Overrides pane is one click away and the dialog stays at `default` size. Screen test *TA-2 / O-T6* | 2026-09-05 |
| T3.2 | done | `TeamInvite.token`; invites live in `rosterStore`; the roster's *Last seen* cell says *Invite expires in N days* or *Invite expired*; `validateResetToken`, `deadToken` and `activateInvite` judge a minted token by its own expiry, and activation turns the row `Active`. Client tests: mint, activate, renew on resend, refuse expired | 2026-09-05 |
| T3.3 | done | `team.invite` template family (EN and AR, `TPL-011`, `TPL-012`), a seeded send for the seeded invitation, and `recordEmailDelivery` in the email client so invite and resend each land a `queued` row on the outbox | 2026-09-05 |
| T3.4 | verified, not touched | `AppLayout` already opens the layer on the first session through `shouldAutoOpen` and `markAutoOpened`; that file is the other session's and was not edited beyond one prop (T5.1) | 2026-09-05 |
| T3.5 | partial | New strings in this plan were written to the X18 budget (no em dash, no file path, no decision id). The pre-existing invite and activation strings were not rewritten; `i18n:keys` still reports the product-wide overages it did before | 2026-09-05 |
| T4.1 | done | `panes/SessionsPane.tsx` over `listAllSessions()`; per-row *End session* with the confirmation in the row; screen test *TA-5* | 2026-09-05 |
| T4.2 | done, one part refused | The Security pane states its `manage_security_policy` refusal once and points every control at it; screen test *AC-957*. The re-auth window field is **not** added: nothing in the shell reads such a value, and a saved number nothing enforces is the defect this pane was repaired for | 2026-09-05 |
| T4.3 | done | The second-factor column is words in neutral ink; the roster header states *N without a second factor* once, as a filter toggle; the Overview tile counts the live roster. Screen test *T4.3* | 2026-09-05 |
| T5.1 | done | `operator` joins `ProfileEntityType`; `?entity=USR-n` opens the colleague's arrangement (`components/profile/operator/`) under `manage_team`: access as role plus delta with the router's preview, holdings, recent audit entries, sessions, onboarding, on-call. Everyone else gets the identity card. One prop added to `AppLayout` | 2026-09-05 |
| T5.2 | done | Roster names open the layer; global search resolves an operator by name or id | 2026-09-05 |
| T5.3 | done | Activity Log honours `?actor=`, states the filter once with *Show everyone*, and every actor cell narrows to that operator; `listAuditEntries` gained `actorId` and names actors from the live roster | 2026-09-05 |
| T6.1 | done | The on-call tile derives from the two-name rota (`currentRota()`), reads 0 with the seed, targets 0, and its seven-day literal breakdown is gone; a new `team` metric category makes the Admin chapter read *Operators*, not *Captains* (also closes T7.4's first row). Tests *TA-7* and the snapshot refreshed | 2026-09-05 |
| T6.2 | done in part | The roster shows presence as a dot and a word from `listAgentPresence`. Moving the presence code into `clients/presence.ts` is not done: `conversations.ts` is in the other session's uncommitted change set | 2026-09-05 |
| T6.3 | done in part | The roster's *Holding* column counts claimed work items per operator from `listWorkItems`; the operator layer lists them. *Reassign* through the registry is not built | 2026-09-05 |
| T6.4 | done, one caveat | `releaseHoldingsOf` in `clients/team.ts` walks `listWorkItems` and calls each queue's own release; suspend and offboard await it before writing, the suspend audit entry names the count, and the confirm adds *They hold N items. Those return to Unassigned.* Tests *T6.4* ×2. Caveat: the mock release for applications, requests, assurance, incidents and fairness cases returns a copy and persists nothing (their claim does not persist either), so only tickets and disputes visibly drop off the roster's *Holding* count in the mock; the http path is complete | 2026-09-05 |
| T6.5 | done | `Notification.titleText` / `bodyText` as `LocalisedText`; `pushNotification` and `notifyTeam` in `clients/notifications.ts`; a `team` type with its own filter chip; the bell and the drawer render the keyed text and use it for the mark-read label. Producers: role change, suspend, invite accepted. No `enrolledSecondFactor` producer: nothing in the mock enrols a second factor. Test *T6.5* in `rbac.test.ts` | 2026-09-05 |
| T8.1 | done in part | `saveRetentionPolicy` now writes `retention.save`; the stale comment in `types/audit.ts` is gone (the two Communications writes were already audited). `integrity.ts` is the other session's and was not touched | 2026-09-05 |
| T8.2 | done | *Who holds a permission* on the Roles pane, via `holdersOf`; CSV export not added | 2026-09-05 |
| T7.1 | done | The roster is `DataTable` in index mode (`tableId` `admin-team-roster`, `?roster.q=` search narrowing in place, columns menu, CSV, the shared kebab with the seven actions and their refusals in place). Identity column on a 210 floor, the other six declare widths; presence became the second line of the Status cell so the seven columns fit 910 px at 1280 without a header breaking mid-word. `RefusableMenuItem` deleted. All 25 screen tests pass unchanged except the kebab's shared label; `admin-roster.mjs`: identity clipped 0, kebabs 7/7, overflow 0, English and Arabic | 2026-09-05 |
| T7.2 | done | 18 card subtitles across the seven Admin sub-tabs became `InfoHint` on the card title. Small grey nodes on Communications fell from 145 (all cards) to 61 on the outbox pane and 58 on templates; Policy from 85 to 4 on the default pane | 2026-09-05 |
| T7.3 | done | Roster role badge only for the Owner and a custom role; the second-factor column is text | 2026-09-05 |
| T7.4 | done in part | The Admin chapter reads *Operators* (new `team` category). The *Service* figures' unit words were not changed | 2026-09-05 |
| T7.5 | done | The roles grid has a sticky capability column, a *Custom* word under a custom role, no colour difference | 2026-09-05 |
| T7.6 | done | `fixtures/audit.ts` seeds four entries (the invite of USR-4, the rota, the security policy save, a reinstatement) through `onFixturesLoaded`; `resetAudit` still empties for tests and `resetAuditToSeed` restores the boot state. Activity test *opens on the seeded history*; the first-run test still passes via reset | 2026-09-05 |
| T8.3 | done in part | The two-factor and active-operator tiles compute from the live roster; the invites-older-than-seven-days and untrusted-sessions leads were not added | 2026-09-05 |
| T8.4 | done | `docs/07-api/` regenerated after every phase; 320 endpoints, 0 problems | 2026-09-05 |
| T9.1 | done for what landed | One behavioural test per criterion touched: AC-921 to AC-924 (client and screen), AC-957, TA-1 to TA-5, TA-7, TA-10, T4.3, T5.3, and the invite lifecycle | 2026-09-05 |
| T9.2 | done | `scripts/harness/admin-access.mjs` and its README row. Run against `HARNESS_BASE=http://localhost:4331`: every role's rail as D17 draws it, `/admin/team` forbidden for the five non-Owner roles, Arabic panes rendering `dir="rtl"` with no horizontal overflow; the reasons pane at 5361px is the one pane still taller than a screen, and carries 8 em dashes from the reason-code content (X14, not this plan's) | 2026-09-05 |
| — | closing | Full suite 2026-09-05: 177 files pass, 3 tests fail. `localisedKeys` (mine, fixed since), `inventory.test` on two committed `label:` lines in `clients/metrics.ts` this plan did not write, and `commands.test` CM-3 which passes alone and timed out under full-suite load. Typecheck clean outside the other session's `onboarding/illustrations`. Nothing is committed; the other session shares this tree | 2026-09-05 |
| — | note | `onboarding.test.tsx` and `qa.shell.test.tsx` fail at collection on that same missing import, not on an assertion; both ran green on this plan's changes before it appeared. Re-run when the tree is whole. Typecheck is clean outside `onboarding/illustrations` and `AppLayout.tsx`, both the other session's. | 2026-09-05 |
