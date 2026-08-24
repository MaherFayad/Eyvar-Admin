# Settings Tab: Legal & Consent

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-legal` · **HTML lines:** L1997–2005
> **Nav button:** L1441 (`data-tab="legal"`, icon 📜, `data-i18n="stab.legal"`)
> **Render fn:** `renderLegalConsent()` L3801–3820 · **Mount point:** `#legal-docs` (L2004)

---

## 1. Purpose

Tracks **which version of each legal document every rider and driver has actually agreed to, and when** — not merely whether a document exists. Pane description (L2001): *"Which version of each legal document every rider and driver has actually agreed to, and when — not just whether a document exists."*

Block comment (L13863–13866): *"Every published version of every legal document, plus who's on which one. Publishing a new version doesn't retroactively update anyone's consent — that's the whole point of tracking this."*

Consent-seeding comment (L3777–3782): *"Lazily initializes each user on the version that was live around when they joined (a fair assumption — they couldn't have agreed to a version that didn't exist yet), so compliance naturally drops for real users the moment a newer version is published without their re-consent, instead of everyone appearing falsely up to date."*

---

## 2. Layout map

```
#stab-legal                                          L1997
├── .card (header only)                              L1998–2003
│   └── .settings-panel-head 📜 "Legal & consent"    L1999–2002
└── #legal-docs  ← renderLegalConsent() writes here  L2004
    └── one .card per document type (3 total)        L3808–3818
        ├── .ch
        │   ├── h2  = doc.label                                 L3809
        │   └── .b badge = "v<currentVersion> · <pct>% current" L3809
        └── div padding:13px                                    L3810
            ├── compliance sentence                             L3811
            ├── button row                                      L3812
            │   ├── [+ Publish new version]  (always)
            │   └── [📣 Remind non-compliant users] (conditional)
            ├── "VERSION HISTORY" section label                 L3813
            └── one row per version (newest first)              L3814
                ├── "v<version> — <summary>"
                └── <publishedDate>  (right, ghost, 10px)
```

Badge colour rule (L3809): `pct >= 90 → .b-green`; `pct >= 70 → .b-amber`; otherwise `.b-red`.

The `[📣 Remind non-compliant users]` button (`.btn sm warn`) is rendered **only when `pool.length - current > 0`** (L3812).

---

## 3. Settings fields — EVERY field

**This tab has no persistent settings fields.** There is nothing to configure — the whole pane is generated read-only content plus two actions. The only inputs in scope live inside the publish modal (§6).

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `new-doc-version` | "New version number" | `input type=text`, placeholder `e.g. 2.2` (L3828) | empty | free-form string | **no format constraint** — any string is accepted as a version | `commitPublishVersion` L3835: `if(!version \|\| !summary)` → toast `⚠ Enter both a version number and a summary` (warn) and return. **No uniqueness check, no ordering check, no semver check.** | `DB.legalDocuments[docKey].currentVersion` and a new entry in `.versions[0]` (L3838–3839) | Immediately invalidates every consent whose `version !== currentVersion`, driving the compliance % and the re-consent list |
| `new-doc-summary` | "Summary of changes" | `input type=text`, placeholder `What changed in this version?` (L3829) | empty | free text | same non-empty check (L3835) | `.versions[0].summary` (L3838) | Displayed in Version history; also appears verbatim in the audit summary (L3840) |

---

## 4. Tables & lists

### 4.1 Document cards (3, one per doc type)

Row source: the hardcoded array `docTypes = ['tos','privacy','driverAgreement']` (L3802) — **not** `Object.keys(DB.legalDocuments)`.

Per card the rendered fields, in order:

| Position | Content | Source | Line |
|---|---|---|---|
| 1 | Card title | `doc.label` | L3809 |
| 2 | Version + compliance badge | `'v' + doc.currentVersion + ' · ' + pct + '% current'` | L3809 |
| 3 | Compliance sentence | `<current> of <pool.length> <drivers\|users> have accepted the current version. <pool.length-current> need to re-consent.` | L3811 |
| 4 | Action buttons | see §5 | L3812 |
| 5 | Section label | `VERSION HISTORY` (uppercase, letter-spacing .5px) | L3813 |
| 6..n | Version rows | `doc.versions.map(...)` — array order, which is **newest-first** by seed convention and by `unshift` on publish | L3814 |

**Audience pool selection** (L3807):
- `driverAgreement` → `Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending')` mapped to the driver objects — i.e. **pending applicants are excluded**.
- `tos` and `privacy` → **all** `Object.keys(DB.riders)` mapped to rider objects. Drivers are **not** counted for ToS or Privacy (see §12).

**Empty state:** none. If `DB.legalDocuments[dk]` were missing the function would throw at `doc.label`. If a pool is empty, `pct` is forced to `100` (L3810: `pool.length ? … : 100`) and the card reads `0 of 0 … 0 need to re-consent` with a green 100 % badge.

### 4.2 Version-history rows

| Column | Content | Source |
|---|---|---|
| Left | `**v**<version>` + ` — ` + `summary` | `v.version`, `v.summary` |
| Right | published date, ghost, 10px | `v.publishedDate` |

Separator: `border-bottom:.5px solid #F2F1EE`. No row actions — versions cannot be edited, reordered, rolled back, or deleted from the UI.

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **+ Publish new version** (`.btn sm`, L3812) | `openPublishVersionModal(docKey)` L3821–3832 | Opens the publish modal (§6). No state change. | nothing | none at this stage | none | no |
| **Publish** (modal footer, `.btn sm danger`, L3831) | `commitPublishVersion(docKey)` L3833–3843 | 1. `requirePerm('manage_settings')` (L3834). 2. Reads both fields via `val()` (trims). 3. Both-required check. 4. `doc.versions.unshift({version, publishedDate: fmtReqNowLabel(), summary})` (L3838). 5. `doc.currentVersion = version` (L3839). 6. `logAction`. 7. `renderLegalConsent()`. 8. toast `✅ <label> v<version> published — compliance will show who still needs to re-consent`. **The modal is not closed** (see §12). | `DB.legalDocuments[docKey].versions[]`, `.currentVersion` | **`manage_settings`** | `logAction('legal_version_published','legal',docKey,'Published <label> v<version>: <summary>', {}, {})` L3840 — note `before={}` and `after={}`, both **empty objects**, so `auditDiffHTML` returns `''` (L3160: `Object.keys(after)` is empty → `parts.length===0`) | **No gate registered.** `commitPublishVersion` appears in neither `GATE_SPECS` nor any `guardAction(...)` call. The red `danger` styling on the button is cosmetic only. |
| **Cancel** (modal footer, `.btn sm`, L3831) | `closeModal()` | Dismisses | nothing | none | none | no |
| **📣 Remind non-compliant users** (`.btn sm warn`, L3812, conditional) | `sendReconsentReminder(docKey)` L3844–3853 | 1. `requirePerm('manage_settings')` (L3845). 2. Recomputes the pool (same rule as §4.1 but returns **ids**, L3848). 3. Filters to those failing `isConsentCurrent`. 4. For each, calls `sendSystemEmail(id, subject, body, 'transactional')` (L3850). 5. `logAction`. 6. toast `✅ Reminder sent to N user(s)`. | `DB.emailOutbox` — one `MAIL-nnnn` record per non-compliant user | **`manage_settings`** | `logAction('config_updated','legal',docKey,'Re-consent reminder sent to N non-compliant user(s) for <label>', {}, {})` L3851 — note it uses the **generic** `config_updated` key, not a legal-specific one | **Yes** — `GATE_SPECS.sendReconsentReminder` L20807–20809, `d:true` |

### Re-consent email content (L3850, verbatim)

- **Subject:** `Please review our updated <doc.label>`
- **Body:**
  ```
  Hi <nm2(id)>,

  We've updated our <doc.label> to version <doc.currentVersion>. Please open the app to review and accept the new terms.

  Eyvar
  ```
- **Category:** `transactional`

### Confirmation gate contents

`GATE_SWEEP.sendReconsentReminder` (L20857–20858):
- **t:** `Send re-consent reminders` · **d:** `true` (danger)
- **c:** `['Contacts customers about legal documents — wording matters.', 'Repeat reminders to the same customer damage trust and consent quality.']`
- **btn:** `Send reminders`

Installed by `installGateSweep()` → `gateAll(GATE_SWEEP)` (L20898–L20903, L20756), which skips any function already carrying `__guarded`. (`installUniversalGates()` L18372–18383 installs the separate `GATE_SPECS` registry and plays no part here.)

---

## 6. Modals opened

### `openPublishVersionModal(docKey)` — L3821–3832

| Element | Content | Line |
|---|---|---|
| **Title** | `Publish new version — <doc.label>` | L3824 |
| Close button | `✕` → `closeModal()` | L3824 |
| Warning paragraph | `Current version: <b>v<currentVersion></b>. Publishing does not retroactively update anyone's consent — everyone not yet on the new version will show as needing to re-consent.` | L3826 |
| **Field 1** | label `New version number`, `#new-doc-version`, `type=text`, placeholder `e.g. 2.2` | L3828 |
| **Field 2** | label `Summary of changes`, `#new-doc-summary`, `type=text`, placeholder `What changed in this version?` | L3829 |
| **Footer button 1** | `Cancel` (`.btn sm`) → `closeModal()` | L3831 |
| **Footer button 2** | `Publish` (`.btn sm danger`) → `commitPublishVersion('<docKey>')` | L3831 |

Overlay opened by `document.getElementById('modal-overlay').classList.add('open')` (L3832).

No other modal is opened from this tab.

---

## 7. Rules / policy logic — written out exactly

### 7.1 Consent record shape

Stored on the **entity** (rider or driver object), not in a central table:

```js
entity.consents = {
  tos:             { version: '<v>', acceptedAt: '<date>' },
  privacy:         { version: '<v>', acceptedAt: '<date>' },
  driverAgreement: { version: '<v>', acceptedAt: '<date>' }   // drivers only
}
```

### 7.2 Lazy seeding — `getUserConsent(entity, isDrv)` L3783–3796

```js
if (!entity) return {};
if (!entity.consents) {
  entity.consents = {};
  docs = isDrv ? ['tos','privacy','driverAgreement'] : ['tos','privacy'];
  docs.forEach(docKey => {
    versions = DB.legalDocuments[docKey].versions.slice().reverse();  // oldest first
    pick     = versions[0].version;      // "default to the oldest, safest assumption"
    entity.consents[docKey] = { version: pick, acceptedAt: entity.joined || '—' };
  });
}
return entity.consents;
```

**Critical:** despite the block comment claiming the user is initialised "on the version that was live around when they joined" (L3778), the code does **not** look at `entity.joined` when picking the version — it unconditionally picks the **oldest** version in the array (`versions[0]` after reversing). `entity.joined` is only used as the `acceptedAt` display value. Every seeded entity therefore starts on **v1.0** of everything.

Consequence: because every document's current version is above 1.0 (`tos` 2.1, `privacy` 1.3, `driverAgreement` 3.0), **every seeded rider and driver is non-compliant on every document from first render**, and every card shows a red 0 % badge.

### 7.3 Currency test — `isConsentCurrent(entity, isDrv, docKey)` L3797–3800

```js
c = getUserConsent(entity, isDrv)[docKey];
return c && c.version === DB.legalDocuments[docKey].currentVersion;
```

**Strict string equality.** `'2.1'` vs `'2.10'` are different; no numeric or semver comparison; a user on a *newer* version than current would also read as non-current.

### 7.4 Compliance percentage — L3808–3810

```
current = pool.filter(isConsentCurrent).length
pct     = pool.length ? Math.round(current / pool.length * 100) : 100
```

### 7.5 Versioning model

| Property | Behaviour |
|---|---|
| Version identifier | Arbitrary string supplied by the operator. No validation, no uniqueness enforcement (L3835 only checks non-empty). |
| Ordering | Purely **array position**. New versions are `unshift`ed to index 0 (L3838), so display order is publish order, not numeric order. |
| Current pointer | `doc.currentVersion` is set to whatever string was just typed (L3839). Publishing "1.0" over "2.1" would make 1.0 current. |
| Published date | `fmtReqNowLabel()` (L9645–9650) → `DD Mon HH:MM` from `REQ_NOW_REF`, the **frozen demo clock**, not the wall clock. |
| Immutability | Past versions cannot be edited, deleted, or rolled back from any UI. |
| Document body | **Not modelled at all.** There is no field for the actual legal text — only `version`, `publishedDate`, `summary`. |
| Retroactivity | None, by design. The modal states it (L3826) and the block comment states it (L13865). |

### 7.6 Re-consent trigger

The only trigger is **publishing a new version**. There is no expiry, no periodic re-consent, no jurisdiction rule, no consent-withdrawal path. Once `currentVersion` changes, every entity whose stored `consents[docKey].version` differs is instantly counted as needing re-consent, and the `📣 Remind` button appears.

**Nothing in the file ever writes a *new* consent.** Grep for `.consents[` shows only the lazy-seeding write at L3792. There is no "record acceptance" function, no admin override, and no simulated app-side acceptance — so the compliance percentage can only ever go **down**, never up.

### 7.7 Audience rule for reminders (L3847–3849)

```js
pool = isDriverDoc
     ? Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending')
     : Object.keys(DB.riders);
nonCompliant = pool.filter(id => !isConsentCurrent(isDriverDoc ? DB.drivers[id] : DB.riders[id], isDriverDoc, docKey));
```

No de-duplication against previously sent reminders, no rate limit, no cooldown — despite the gate text warning that *"Repeat reminders to the same customer damage trust and consent quality."* (L20809).

---

## 8. Enumerations

### 8.1 Legal document types — the complete set (`DB.legalDocuments`, L13867–13884)

| Key | `label` | `currentVersion` | Audience | Versions (newest → oldest) |
|---|---|---|---|---|
| `tos` | **Terms of Service** | `2.1` | Riders (per `renderLegalConsent`) | `2.1` · 01 Jul · *Added subscription postponement policy and clarified cancellation fees.*<br>`2.0` · 15 Mar · *Major rewrite for subscription plans launch.*<br>`1.0` · 01 Jan · *Initial version.* |
| `privacy` | **Privacy Policy** | `1.3` | Riders | `1.3` · 10 Jun · *Added device/network data collection disclosure.*<br>`1.0` · 01 Jan · *Initial version.* |
| `driverAgreement` | **Driver Agreement** | `3.0` | Drivers with `status !== 'pending'` | `3.0` · 01 Jul · *Updated commission structure and incentive program terms.*<br>`2.0` · 01 Feb · *Added cash-handling and deduction policy.*<br>`1.0` · 01 Jan · *Initial version.* |

Total: **3 document types, 8 published versions.**

Note `privacy`'s newest entry is written with a quoted key — `{version:'1.3',publishedDate:'10 Jun','summary':'…'}` (L13875) — functionally identical, stylistically inconsistent.

### 8.2 Version record shape

```js
{ version: String, publishedDate: String, summary: String }
```

### 8.3 Consent record shape

```js
{ version: String, acceptedAt: String }
```

### 8.4 Badge thresholds

| Range | Class |
|---|---|
| `pct >= 90` | `.b-green` |
| `70 <= pct < 90` | `.b-amber` |
| `pct < 70` | `.b-red` |

### 8.5 Audit action keys emitted

| Key | Emitted by | In `ACTION_LABELS`? |
|---|---|---|
| `legal_version_published` | `commitPublishVersion` L3840 | **No** |
| `config_updated` | `sendReconsentReminder` L3851 | **No** |

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| **Rider / Driver 360° profile → "📱 Device & access" card** | `getUserConsent(d, isDrv)` + `isConsentCurrent(...,'tos')` / `(...,'privacy')` render two rows: `Terms of Service` and `Privacy Policy`, each as `v<x> — current` (green) or `v<x> — outdated` (amber) | L4153–4158 |
| **Email outbox (Settings → Email → Outbox)** | Every reminder produces one `MAIL-nnnn` record with `category:'transactional'`; visible in `renderEmailOutbox()` and counted in the "By category" KPI | L3850 → L3578–3583 |
| **Data Export tab** | Reminder emails increment `#export-count-emails` and appear in `exportEmailLog()` | L7668, L7644 |
| **Activity / Audit log** | `legal_version_published` and `config_updated` entries | L3840, L3851 |
| **Settings meta captions** | `renderSettingsMeta()`'s map (L7340) has **no** `legal` key → no "Last updated by …" caption for this tab | L7339–7342 |
| **Navigation** | `renderLegalConsent()` runs on every `go('settings')` | L8819 |
| **`DB.drivers[*].status`** | read-only dependency — approving a pending applicant elsewhere immediately enlarges the Driver Agreement pool and lowers its compliance % | L3807, L3848 |

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `docTypes = ['tos','privacy','driverAgreement']` | L3802 | Hardcoded list, not derived from `DB.legalDocuments`. Adding a fourth document to the DB would not render it. |
| All 8 version records incl. dates and summaries | L13868–13883 | Seed fixtures. Dates are bare `DD Mon` strings with no year. |
| `2.1` / `1.3` / `3.0` current versions | L13868, L13874, L13879 | Seed |
| Badge thresholds `90` / `70` | L3809 | |
| Email subject/body template | L3850 | Hardcoded, no i18n, no per-document customisation |
| `'transactional'` category | L3850 | |
| `fmtReqNowLabel()` → `REQ_NOW_REF` | L9645–9650 | **Frozen demo clock** — a newly published version is stamped with the demo date, not today |
| `pct = 100` when the pool is empty | L3810 | Presents "no data" as "fully compliant" |

**No real legal text exists anywhere in the file** — only labels, version strings, dates and one-line summaries.

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.legal` | Nav button label span, L1441 | `Legal & Consent` | `القانونية والموافقات` (L7921) ✅ |
| `stabgrp.platform` | Group header (legal is in the `Platform` group, L21275) | `Platform` | `المنصة` (L7916) |

**No `data-i18n` attribute exists inside `#stab-legal`.** The panel title/description (L2001), every card title, the compliance sentence, both button labels, the `VERSION HISTORY` label, the modal's title, both field labels, both placeholders, both footer buttons, and the entire reminder email are hardcoded English.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **The lazy-seed comment contradicts the code.** L3778 claims each user is seeded on "the version that was live around when they joined"; L3790 unconditionally picks `versions[0]` after reversing — the **oldest** version. `entity.joined` is only used for `acceptedAt`. Result: 0 % compliance on every document at boot, and all three badges render red.
2. **Consent can never be granted.** No code path anywhere writes `entity.consents[docKey].version` after the lazy seed (only write is L3792). There is no "mark accepted" action, no app-side simulation, no admin override. The compliance figure is monotonically non-increasing.
3. **Drivers are not tracked for ToS or Privacy.** L3807 uses `DB.riders` for both. Yet `getUserConsent(entity, true)` seeds `tos` and `privacy` for drivers (L3788), and the driver profile card renders them (L4157–4158). So driver ToS/Privacy consent is stored and displayed but **excluded from every compliance count and every reminder**.
4. **`commitPublishVersion` does not close the modal.** L3833–3843 — compare `commitSuspendSurge` (L21736) and `replyToInbound` (L7554), which both call `closeModal()`. The publish modal stays open over a re-rendered pane; pressing Publish again would create a duplicate version.
5. **`commitPublishVersion` is not gated.** It writes site-wide legal policy and invalidates every user's consent, yet has no `guardAction` and no `GATE_SPECS` entry. The lesser action (sending reminders) *is* gated. The `danger` class on the button is styling only.
6. **No version-format or ordering validation.** Publishing `"abc"` or `"1.0"` (lower than current) is accepted and becomes `currentVersion` (L3835, L3839).
7. **No duplicate-version check.** Publishing `2.1` again appends a second `2.1` row and leaves `currentVersion` unchanged in value — silently creating a duplicate history entry.
8. **`before`/`after` are empty objects** in both `logAction` calls (L3840, L3851). `auditDiffHTML` (L3156–3170) returns `''` for `after={}`, so the audit rows carry no structured diff — passing `null` would have been equivalent and clearer.
9. **`sendReconsentReminder` uses the generic `config_updated` action key** (L3851) instead of a legal-specific one, so legal reminders are indistinguishable from gateway edits, broadcasts, and push sends in the audit log.
10. **Neither `legal_version_published` nor `config_updated` is in `ACTION_LABELS`** (L2900–2910), so neither can be selected in the Activity-log action-type filter (built from `Object.keys(ACTION_LABELS)`, L9210).
11. **No reminder de-duplication or cooldown**, contradicting the gate's own warning (L20809).
12. **Reminders can be sent to an empty list.** If `nonCompliant.length === 0` the button would not render (L3812 guards on the count), but `sendReconsentReminder` itself has no guard, so a stale DOM or direct call toasts `✅ Reminder sent to 0 user(s)`.
13. **`docTypes` is hardcoded** (L3802) — a fourth document added to `DB.legalDocuments` would be invisible in this tab while still being consent-seeded by `getUserConsent` for drivers.
14. **No consent audit trail per user.** `acceptedAt` is a single string, overwritten conceptually; there is no history of which versions a user previously accepted.
15. **No document body / no link out.** Nothing to review, publish, or diff — only metadata.
16. **No XSS escaping.** `doc.label`, `v.summary`, `v.version` and the operator-typed strings are interpolated raw into `innerHTML` (L3809, L3814, L3838).
17. **UNVERIFIED — `REQ_NOW_REF`.** `fmtReqNowLabel()` reads it (L9647); its definition line was not read in this pass. It is referred to elsewhere in the file as the frozen demo clock, but the exact value is not confirmed here.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| Nav button `data-tab="legal"` | L1441 |
| Pane `#stab-legal` | L1997–2005 |
| `#legal-docs` mount | L2004 |
| `ACTION_LABELS` | L2900–2910 |
| `requirePerm()` | L3126–3132 |
| `logAction()` | L3133–3155 |
| `auditDiffHTML()` | L3156–3170 |
| `sendSystemEmail()` | L3578–3583 |
| Legal & consent block comment | L3777–3782 |
| `getUserConsent()` | L3783–3796 |
| `isConsentCurrent()` | L3797–3800 |
| `renderLegalConsent()` | L3801–3820 |
| `openPublishVersionModal()` | L3821–3832 |
| `commitPublishVersion()` | L3833–3843 |
| `sendReconsentReminder()` | L3844–3853 |
| Consent rows on entity profile | L4153–4158 |
| `renderSettingsMeta()` map (no legal key) | L7339–7342 |
| `renderEmailOutbox()` | L7557–7580 |
| `exportEmailLog()` | L7644–7647 |
| `val()` | L8034 |
| `go('settings')` fan-out | L8819 |
| `renderAuditFilterSelect()` (action filter from `ACTION_LABELS`) | L9206–9218 |
| `fmtReqNowLabel()` | L9645–9650 |
| `DB.legalDocuments` seed | L13863–13884 |
| `installUniversalGates()` | L18372–18383 |
| `GATE_SWEEP.sendReconsentReminder` | L20857–20858 |
| `SETTINGS_GROUPS` (legal → `Platform`) | L21275 |
