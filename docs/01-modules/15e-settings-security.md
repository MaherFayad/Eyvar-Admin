# Settings Tab: Security

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` | Pane `#stab-security` (L1976–L1994) | Tab button L1442 (`switchSettingsTab('security',this)`) | Render fn `renderSecurityConfig()` L8018–L8022 | Commit fn `saveSecurityConfig()` L8023–L8033 | Data `DB.opsConfig.security` (seed L2572)

---

## 1. Purpose

Session and access controls for the ops panel itself. Panel copy (L1980, `data-i18n="sec.title"` / `sec.desc`): title `Security`, description *"Session and access controls for this panel."*

Two settings, one of which is honestly labelled as saved-but-not-enforced. This is one of only **two** panes in this half of the Settings module (with General) that carries full `data-i18n` coverage.

---

## 2. Layout map

Two `.card`s:

| Card | Element | Line |
|------|---------|------|
| 1 | Panel head 🛡️ + `sec.title` + `sec.desc` | L1977–L1981 |
| 1 | Body `display:flex;flex-direction:column;gap:12px` | L1982 |
| 1 | Number field — auto-logout timeout | L1983 |
| 1 | Grey caveat note under the timeout | L1984 |
| 1 | Checkbox — require 2FA | L1985 |
| 1 | Grey "Live:" note under the 2FA toggle | L1986 |
| 1 | `Save security settings` button | L1987 |
| 1 | `.settings-meta#meta-security` | L1989 |
| 2 | `Planned` card + `Coming soon` chip | L1991–L1993 |

---

## 3. Settings fields — EVERY field

Both persist to `DB.opsConfig.security` (seed L2572: `{sessionTimeoutMin:30, require2FA:false}`).

| # | id | Label (verbatim) | i18n key | Control | Default | Unit | Range | Validation | Persisted to | Affects |
|---|----|------------------|----------|---------|---------|------|-------|------------|--------------|---------|
| 1 | `cfg-sec-timeout` | `Auto-logout after inactivity (minutes)` (L1983) | `sec.timeout_label` | `input type="number"` `min="5" max="240" step="5"` | `30` | minutes | HTML `5`–`240`, step 5; JS clamps to the same bounds | **Clamped on save** (L8027): `Math.min(240, Math.max(5, parseInt(val('cfg-sec-timeout'),10) \|\| 30))`. A blank/NaN value falls back to `30`, then <5 → 5 and >240 → 240. `parseInt` truncates decimals; the `step="5"` is a browser hint only and non-multiples are accepted. | `DB.opsConfig.security.sessionTimeoutMin` | **Nothing.** No reader. Stated in the UI (L1984): *"Saved and ready, but not enforced here — this file has no real login session to time out. A production backend would read this value to end idle sessions."* |
| 2 | `cfg-sec-2fa` | `Require two-factor authentication for all team members` (L1985) | `sec.2fa_label` | checkbox, `width:15px;height:15px` | `false` | — | on/off | none (`chk()` L8035) | `DB.opsConfig.security.require2FA` | **Live.** Read by `renderTeamTable()` (L10454) to render per-user 2FA compliance chips. Stated in the UI (L1986): *"Live: turning this on immediately flags anyone without 2FA on the Team & Roles table, so you can see who to follow up with."* |

### Load behaviour — `renderSecurityConfig()` (L8018–L8022)
```
s = DB.opsConfig.security || {}
#cfg-sec-timeout .value   = s.sessionTimeoutMin || 30     // note: || not != null
#cfg-sec-2fa     .checked = !!s.require2FA
```

---

## 4. Tables & lists

**None in this pane.** The 2FA setting's only visible effect renders in a table on a *different* tab — `#team-tbody` on Team & Roles (`15b` §4).

---

## 5. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|-------------|-----------|-----------|-------|-----------|
| `Save security settings` (`sec.save_btn`) | L1987 | `saveSecurityConfig()` L8023–L8033 | Snapshots `before`; clamps and writes `sessionTimeoutMin`; writes `require2FA`; `logAction`; **`renderTeamTable()`**; `renderSettingsMeta()`; toast `✅ Security settings saved` (+ ` — check Team & Roles for who still needs 2FA` when `require2FA` is on) | `DB.opsConfig.security` (2 keys) | `requirePerm('manage_settings')` L8024 | **yes** — `logAction('config_updated','settings','security','Security settings updated', before, s)` L8029 | **yes** — `GATE_SWEEP.saveSecurityConfig` L20780, `d:true` |

Neither control has an `onchange` handler — nothing applies until Save.

**Notable side effect:** `saveSecurityConfig()` calls `renderTeamTable()` (L8030), which in turn calls `renderRoleMatrix()` and `renderPagePermMatrix()` (L10465–L10466). Saving Security therefore re-renders the Team and Permissions panes as well — this is what makes the 2FA chips appear the moment you save.

---

## 6. Modals opened

**None.**

---

## 7. Rules / policy logic — written out exactly

### 7.1 The one live rule — 2FA compliance chips (L10454–L10456)
Inside `renderTeamTable()`:
```
require2FA = DB.opsConfig && DB.opsConfig.security && DB.opsConfig.security.require2FA;

twoFABadge = require2FA
   ? (u.twoFA ? ' <span class="b b-green" style="font-size:8.5px">2FA on</span>'
              : ' <span class="b b-red"   style="font-size:8.5px"'
                + ' title="Security policy requires 2FA for everyone">⚠ 2FA off</span>')
   : '';                                     // policy off → no chip at all
```
The chip is appended after `u.name` in column 1 of the team table.

Applied to the seed roster (L2831–L2841), turning the policy on marks:
- ✅ `2FA on` — **USR-1 Sarah Al-Rashid** (Owner), **USR-5 Yousef Al-Balawi** (Ops Manager)
- ⚠ `2FA off` — **USR-2 Fahad Al-Dosari** (Finance), **USR-3 Lina Al-Otaibi** (Support), **USR-4 Noura Al-Fahad** (Support, Invited)

Additionally, any user created through the invite flow gets a record with **no `twoFA` key at all** (`commitInvite`, L10540), which is falsy — every newly invited member renders as `⚠ 2FA off`.

### 7.2 Clamping (L8027)
```
s.sessionTimeoutMin = Math.min(240, Math.max(5, parseInt(val('cfg-sec-timeout'), 10) || 30));
```
Order matters: `parseInt` first (so `"45abc"` → 45, `""` → NaN → 30), then floor at 5, then ceiling at 240. The clamped value is **not** written back into the input, so a user who typed `500` still sees `500` until the next `renderSecurityConfig()` (i.e. next entry to the Settings page). Contrast `saveOpsRadiusConfig()` (L8081) which *does* write the clamped values back.

### 7.3 Meta footer
`renderSettingsMeta()` (L7341) maps `'meta-security' → 'security'`; `settingsLastUpdated('security')` (L7336) renders `Last updated by <actor> · <ts>` from the newest `settings/security` audit entry, else `No changes recorded yet`.

### 7.4 The "Planned" card (L1991–L1993)
Static, no controls. Title `Planned` (`sec.planned_title`) + `<span class="settings-soon">Coming soon</span>`; description (`sec.planned_desc`, verbatim): *"SSO/SAML login, IP allow-listing for the ops panel, and per-role forced session timeout overrides."* Both strings have Arabic translations (L7933–L7934).

---

## 8. Cross-module effects

| Setting | Consumer | Line | Effect |
|---------|----------|------|--------|
| `security.require2FA` | `renderTeamTable()` | L10454–L10456 | Renders `2FA on` / `⚠ 2FA off` chips in the Team & Roles table |
| `security.sessionTimeoutMin` | — | — | **No consumer.** Explicitly acknowledged at L1984. |
| `saveSecurityConfig()` | `renderTeamTable()` → `renderRoleMatrix()` + `renderPagePermMatrix()` | L8030, L10465–L10466 | Saving Security re-renders the Team and Permissions panes |
| audit entry `settings/security` | Activity tab (`renderAuditLog`); `#meta-security` | L7336 | Last-updated line |
| `renderSecurityConfig()` | `go('settings')` | L8819 | Rendered on every entry to the Settings page |
| `u.twoFA` | this setting only | L10455 | The flag has **no setter** anywhere in the file (see §11) |

---

## 9. Hardcoded / mock / demo values

- **Seed defaults** (L2572): `sessionTimeoutMin:30`, `require2FA:false`.
- **`30`** appears as a hardcoded fallback twice — `renderSecurityConfig` (L8021) and `saveSecurityConfig` (L8027).
- **Bounds `5` and `240`** are hardcoded in both the HTML attributes (L1983) and the JS clamp (L8027).
- **`u.twoFA` values are pure seed data** (L2831–L2841): `true` for USR-1 and USR-5, `false` for USR-2/3/4. Nothing in the panel can change them.
- **The caveat note (L1984) is a hardcoded admission** that the timeout is inert.
- **The Planned card copy** (L1992) is hardcoded aspiration.
- **No real authentication exists.** `CURRENT_USER_ID` is a hardcoded global (L2862, `'USR-1'`); there is no login screen, no session, no token — so "auto-logout" has nothing to log out of.

---

## 10. i18n keys

This pane is **fully internationalised** (unlike Team, Permissions, Dispatch, Cities, Gateways, Limits, Cancellation Policy, Reason Codes and Notifications).

| Key | Element | HTML line | Arabic at |
|-----|---------|-----------|-----------|
| `stab.security` | tab button label `Security` | L1442 | L7919 (`'الأمان'`) |
| `stabgrp.system` | nav group heading `System` | L1437 | L7916 |
| `sec.title` | panel title `Security` | L1980 | L7930 (`'الأمان'`) |
| `sec.desc` | panel description | L1980 | L7930 |
| `sec.timeout_label` | timeout field label | L1983 | L7931 |
| `sec.2fa_label` | 2FA checkbox label | L1985 | L7932 |
| `sec.save_btn` | Save button | L1987 | L7933 |
| `sec.planned_title` | `Planned` | L1992 | L7934 |
| `sec.planned_desc` | Planned description | L1992 | L7934 |

**Not keyed:** the two grey caveat notes (L1984, L1986) and `#meta-security` — these stay English under `applyLanguage('ar')`.

---

## 11. Gaps, dead code, UNVERIFIED items

1. **`sessionTimeoutMin` is completely inert**, as the UI states (L1984). Grep confirms the only reads are `renderSecurityConfig` (L8021) and `saveSecurityConfig` (L8026–L8027). There is no idle timer, no `setTimeout`, no activity listener.
2. **`twoFA` has no setter — the policy is unenforceable.** `require2FA` produces a red compliance chip but the panel provides **no way** to enrol a user in 2FA, and `commitInvite` (L10540) doesn't even create the field. An operator can see the debt but never clear it.
3. **`require2FA` blocks nothing.** It is purely cosmetic: no login exists, and no commit function anywhere checks `u.twoFA` before allowing an action. A user flagged `⚠ 2FA off` retains every permission.
4. **The clamped value is not written back to the input** (L8027) — contrast `saveOpsRadiusConfig` (L8081), which does `if(q)q.value=qv`. Typing `1000` and saving stores 240 while the field keeps showing 1000 until the pane is re-rendered.
5. **`renderSecurityConfig` uses `||` where `!= null` is correct** (L8021): `s.sessionTimeoutMin || 30`. A stored `0` would display as 30 — unreachable given the min-5 clamp, but inconsistent with `renderNotificationConfig` (L8006) which handles this correctly.
6. **`step="5"` is not enforced.** `parseInt` accepts any integer; 37 minutes saves fine.
7. **No SSO/SAML, no IP allow-list, no per-role timeout overrides** — the Planned card (L1992) names all three as absent.
8. **No password/credential settings, no session list, no force-logout, no failed-login lockout, no API keys** — nothing else security-related exists in this pane.
9. **The `saveSecurityConfig` gate warns about the wrong thing.** It *is* `guardAction`-wrapped — `GATE_SWEEP.saveSecurityConfig` (L20780, `d:true`), installed by `installGateSweep()` (L20903) — but its consequence copy says *"Sessions already open are not terminated by this change"* and says nothing about `require2FA` changing what every operator sees. Contrast the richer `saveCommitPolicy` / `saveCompPolicy` gates (L18068, L18077).
10. **The audit `after` payload logs the live object** (`logAction(..., before, s)` L8029) rather than a copy — a later mutation of `DB.opsConfig.security` would retroactively change what the audit entry appears to say. Same pattern as `saveGeneralConfig` (L7997) and `saveNotificationConfig` (L8014).
11. **UNVERIFIED — any real security effect.** With no backend, no login and no session, neither setting can be enforced in this file. Every security claim here is aspirational configuration storage.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Nav group `System` heading | L1437 |
| Tab button (Security) | L1442 |
| Pane `#stab-security` | L1976–L1994 |
| Panel head / `sec.title` / `sec.desc` | L1977–L1981 |
| `#cfg-sec-timeout` (`sec.timeout_label`) | L1983 |
| "not enforced here" caveat note | L1984 |
| `#cfg-sec-2fa` (`sec.2fa_label`) | L1985 |
| "Live:" note | L1986 |
| `Save security settings` (`sec.save_btn`) | L1987 |
| `.settings-meta#meta-security` | L1989 |
| `Planned` card (`sec.planned_title` / `sec.planned_desc`) | L1991–L1993 |
| `.settings-soon` CSS | L242 |
| `DB.opsConfig.security` seed | L2572 |
| `DB.teamUsers` seed (`twoFA` values) | L2830–L2841 |
| `CURRENT_USER_ID` | L2862 |
| `requirePerm()` | L3126–L3133 |
| `settingsLastUpdated()` | L7336–L7339 |
| `renderSettingsMeta()` map | L7341 |
| `renderSecurityConfig()` | L8018–L8022 |
| `saveSecurityConfig()` | L8023–L8033 |
| `val()` / `chk()` helpers | L8034–L8035 |
| `go('settings')` render entry | L8819 |
| `renderTeamTable()` 2FA chip logic | L10454–L10456 |
| `renderTeamTable()` → matrices | L10465–L10466 |
| `commitInvite()` (creates users without `twoFA`) | L10528–L10543 |
| Arabic strings `sec.*` | L7930–L7934 |
