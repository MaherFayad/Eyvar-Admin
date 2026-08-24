# Settings Tab: General

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`#p-settings`, L1416) | Pane `#stab-general` (L1448–L1516) | Tab button L1422 (`switchSettingsTab('general',this)`) | Render fn `renderGeneralConfig()` L7980–L7985 | Commit fn `saveGeneralConfig()` L7986–L8002

---

## 1. Purpose

Company identity (name, description, logo/favicon), regional defaults (currency, timezone, interface language) and the support contact pair. It is the **default-on** pane: `go('settings')` ends with `switchSettingsTab('general')` (L8819), and the markup carries `class="settings-panel on"` (L1448), so General is what an operator sees on arrival.

Panel description (L1452, `data-i18n="gen.desc"`): *"Company identity, browser tab appearance, and regional defaults used across every page, receipt, and notification in this panel."*

---

## 2. Layout map

Single `.card` (L1449) with four labelled sections separated by `border-top` rules:

| # | Section | Label line | i18n key | Contents |
|---|---------|-----------|----------|----------|
| 1 | Brand identity | L1455 | `gen.brand` | Logo preview box `#logo-preview` (L1458) + file input (L1461) + remove link (L1462); company name + site description inputs (L1466–L1467) |
| 2 | Regional defaults | L1471 | `gen.regional` | Currency select (L1474), timezone select (L1485), language select (L1496) |
| — | Arabic disclaimer callout | L1502 | `gen.disclaimer` | Amber warning box |
| 3 | Support contact | L1504 | `gen.support` | Support email (L1506), support phone (L1507) |
| 4 | Save block | L1510–L1513 | `gen.logo_note`, `gen.save_btn` | No-backend note + Save button |
| — | Meta footer | L1514 | — | `#meta-general`, filled by `renderSettingsMeta()` L7340 |

---

## 3. Settings fields — EVERY field

All values persist to `DB.opsConfig.general` (seed L2570).

| # | id | Label | Control | Default (seed L2570) | Unit | Options / Range | Validation | Persisted to | Affects |
|---|----|-------|---------|---------|------|-----------------|------------|--------------|---------|
| 1 | `logo-preview` | *(no label — preview box)* | Read-only `div` (L1458) | Text `No logo` when empty | — | — | — | *(display only)* | Rendered by `applySiteBranding()` L7955–L7961: injects an `img` of `g.logoDataUrl` or the literal string `No logo` |
| 2 | `cfg-gen-logo-file` | `Logo (shown on the browser tab)` (L1460, `gen.logo_label`) | `input type=file` (L1461), `accept="image/png,image/jpeg,image/svg+xml,image/x-icon"`, `onchange="handleLogoUpload(this)"` | none | image file | PNG / JPEG / SVG / ICO | **Size cap 200 KB** — `if(file.size>200*1024)` → toast `⚠ Logo is over 200 KB — pick a smaller file` and `input.value=''` (L7965). No dimension check beyond the `accept` attribute. | `DB.opsConfig.general.logoDataUrl` — a base64 **data URL** written by `FileReader.readAsDataURL` (L7966–L7972) | Sets `link#site-favicon.href` (L7959) → **the browser tab icon**. Applied immediately on upload, **before** Save. Helper text L1462: "PNG/SVG recommended, square, under 200 KB". |
| 3 | *(inline link)* `remove` | `remove` (L1462) | Text link, `onclick="clearLogo()"` | — | — | — | — | Sets `logoDataUrl=''` (L7975) | Clears favicon + preview immediately; **not** audit-logged |
| 4 | `cfg-gen-name` | `Company / site name (browser tab title)` (L1466, `gen.sitename_label`) | `input type=text` | `Eyvar` | — | free text | Falsy-guard only: `g.companyName=val('cfg-gen-name')||g.companyName` (L7989) — an empty field silently keeps the old value | `DB.opsConfig.general.companyName` | `applySiteBranding()` L7957 sets `#site-title` text to `<companyName> — Operations Panel` (browser tab title) |
| 5 | `cfg-gen-desc` | `Site description` (L1467, `gen.sitedesc_label`) | `input type=text` | `Eyvar operations panel — manage subscriptions, drivers, riders, and dispatch.` | — | free text | same falsy-guard (L7990) | `DB.opsConfig.general.siteDescription` | `applySiteBranding()` L7958 sets `meta#site-meta-desc @content` |
| 6 | `cfg-gen-currency` | `Default currency` (L1473, `gen.currency_label`) | `select` (L1474) | `SAR` | currency code | **7 options, exhaustive** (L1475–L1481): `SAR` — Saudi Riyal · `AED` — UAE Dirham · `KWD` — Kuwaiti Dinar · `QAR` — Qatari Riyal · `BHD` — Bahraini Dinar · `EGP` — Egyptian Pound · `USD` — US Dollar | falsy-guard (L7992) | `DB.opsConfig.general.currency` | **Inert.** No read of `.general.currency` exists outside `renderGeneralConfig`/`saveGeneralConfig`. Money is formatted with a hardcoded `SAR` everywhere (gateway volume L7467, limit toasts, cancellation fees). |
| 7 | `cfg-gen-tz` | `Timezone` (L1484, `gen.timezone_label`) | `select` (L1485) | `Asia/Riyadh` | IANA tz | **7 options, exhaustive** (L1486–L1492): `Asia/Riyadh` (GMT+3) · `Asia/Dubai` (GMT+4) · `Asia/Kuwait` (GMT+3) · `Asia/Qatar` (GMT+3) · `Africa/Cairo` (GMT+2) · `Europe/London` (GMT+0/+1) · `UTC` | falsy-guard (L7993) | `DB.opsConfig.general.timezone` | **Inert.** No other read. Timestamps use `new Date().toLocaleTimeString([])` (`logAction` L3136) and `toLocaleDateString('en-GB',…)` (`applyCityToggle` L7807) — the browser's zone, never this setting. |
| 8 | `cfg-gen-lang` | `Interface language` (L1495, `gen.lang_label`) | `select` (L1496) | `en` | — | **2 options, exhaustive** (L1497–L1498): `en` — English · `ar` — العربية (Arabic) | falsy-guard (L7994) | `DB.opsConfig.general.language` | **Live.** `saveGeneralConfig` calls `applyLanguage(g.language)` (L7996). Also applied at boot, L14596. See §7.2. |
| 9 | `cfg-gen-email` | `Support email` (L1506, `gen.email_label`) | `input type=text` | `support@eyvar.app` | — | free text | falsy-guard only (L7991). **No `@` check** — unlike the team-invite email field (L10536) | `DB.opsConfig.general.supportEmail` | **Inert** — no other read. |
| 10 | `cfg-gen-phone` | `Support phone` (L1507, `gen.phone_label`) | `input type=text` | `+966 11 000 0000` | — | free text | falsy-guard (L7991 block) | `DB.opsConfig.general.supportPhone` | **Inert** — no other read. |

### Load behaviour
`renderGeneralConfig()` (L7980) maps the seven text/select ids from `DB.opsConfig.general` and assigns `el.value = map[id] || ''`, then calls `applySiteBranding()`. The **file input is never repopulated** (a file input cannot be), so after save + re-render the chosen filename disappears while the preview keeps the image.

---

## 4. Tables & lists

**None.** This pane contains no `table` element.

---

## 5. Actions

| Label | Line | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|--------|-----------|-----------|-------|-----------|
| *(file picker change)* | L1461 | `handleLogoUpload(this)` L7962–L7973 | Rejects >200 KB; else async `FileReader` → sets `logoDataUrl`, calls `applySiteBranding()`, toasts `✅ Logo updated — click "Save general settings" to log the change` | `DB.opsConfig.general.logoDataUrl` | **none** — no `requirePerm` | **no** | no |
| `remove` | L1462 | `clearLogo()` L7974–L7979 | `logoDataUrl=''`; clears the file input value; `applySiteBranding()`; toast `Logo removed` (info) | `DB.opsConfig.general.logoDataUrl` | **none** | **no** | no |
| `Save general settings` | L1512 | `saveGeneralConfig()` L7986–L8002 | Snapshots `before`; writes the 7 fields with falsy-guards; `applySiteBranding()`; `applyLanguage()`; `logAction`; `renderSettingsMeta()`; toast `✅ General settings saved` (+ ` — sidebar switched to Arabic` when `language==='ar'`) | `DB.opsConfig.general` (whole object logged as `after`) | `requirePerm('manage_settings')` L7987 | **yes** — `logAction('config_updated','settings','general','General settings updated',before,g)` L7997 | **yes** — `GATE_SWEEP.saveGeneralConfig` L20771, `d:true` |

**Permission-gate asymmetry (real gap):** logo upload and removal mutate `DB` with **no** permission check, while the text/select save is gated. A user without `manage_settings` can still change the panel's favicon.

---

## 6. Modals opened

**None.** No modal is opened from this pane.

---

## 7. Rules / policy logic — written out exactly

### 7.1 `applySiteBranding()` (L7955–L7961)
```
g = DB.opsConfig.general || {}
#site-title      .textContent = (g.companyName || 'Eyvar') + ' — Operations Panel'
#site-meta-desc  @content     = g.siteDescription || ''
#site-favicon    @href        = g.logoDataUrl || ''
#logo-preview    .innerHTML   = logoDataUrl ? <img …object-fit:contain> : 'No logo'
```
Fallback company name is the hardcoded string `'Eyvar'`.

### 7.2 `applyLanguage(lang)` (L7936–L7951)
```
isAr = (lang === 'ar')
<html lang>              = 'ar' | 'en'          // lang only; dir is deliberately NOT set on <html>
.sb               @dir   = 'rtl' | 'ltr'        // sidebar subtree only
.settings-nav-col @dir   = 'rtl' | 'ltr'        // Settings sub-nav only
body.classList.toggle('lang-ar', isAr)          // repositions .sb via flex order
for each [data-i18n] element:
    if (!el.dataset.i18nOriginal) el.dataset.i18nOriginal = el.textContent   // remember English source
    el.textContent = (isAr && LANG_STRINGS.ar[key]) ? LANG_STRINGS.ar[key] : el.dataset.i18nOriginal
```
Source comments at L7939–L7942 state the intent: `dir` is applied to the sidebar and the settings sub-nav **only**, never to `body` or `.main`.

The in-panel disclaimer (L1502) states the limit verbatim: *"Selecting Arabic really does translate the sidebar navigation and section labels, and flips the sidebar to RTL — try it. The rest of the panel (tables, forms, every page's own content) stays English-only for now."*

### 7.3 Persistence caveat (stated in the UI, L1511)
*"The logo and title update live in this browser tab as soon as you upload/save. Since this file has no backend server, re-opening the file fresh (or sharing it with someone else) resets to the default logo — wiring persistent storage needs a small backend."* Confirmed: nothing in this file persists `opsConfig` to storage.

### 7.4 Meta footer
`renderSettingsMeta()` (L7340–L7343) maps `'meta-general' → 'general'` and calls `settingsLastUpdated('general')` (L7336): finds the **first** `DB.auditLog` entry with `entityType==='settings' && entityId==='general'` and renders `Last updated by <actorName> · <ts>`, else `No changes recorded yet`. Because `logAction` unshifts, "first" = most recent.

---

## 8. Cross-module effects

| Setting | Consumer | Line | Effect |
|---------|----------|------|--------|
| `general.language` | boot sequence | L14596 | `applyLanguage((DB.opsConfig&&DB.opsConfig.general&&DB.opsConfig.general.language)||'en')` — restores saved language on load |
| `general.language` | sidebar + settings sub-nav + all `[data-i18n]` nodes | L7943–L7950 | Text substitution + RTL flip |
| `general.companyName` | `title#site-title` | L7957 | Browser tab title |
| `general.siteDescription` | `meta#site-meta-desc` | L7958 | Page meta description |
| `general.logoDataUrl` | `link#site-favicon` | L7959 | Browser tab icon |
| `general.currency` | — | — | **No consumer.** |
| `general.timezone` | — | — | **No consumer.** |
| `general.supportEmail` / `supportPhone` | — | — | **No consumer.** |
| audit entry `settings/general` | Activity tab (`renderAuditLog`), `#meta-general` | L7336 | Shows who last changed General |

---

## 9. Hardcoded / mock / demo values

- **Seed defaults** (L2570) are demo data: `companyName:'Eyvar'`, `siteDescription:'Eyvar operations panel — manage subscriptions, drivers, riders, and dispatch.'`, `logoDataUrl:''`, `supportEmail:'support@eyvar.app'`, `supportPhone:'+966 11 000 0000'`, `timezone:'Asia/Riyadh'`, `currency:'SAR'`, `language:'en'`.
- **Fallback literal `'Eyvar'`** in `applySiteBranding` (L7957) — independent of the seed.
- **Currency list (7)** and **timezone list (7)** are hardcoded `option` markup, not data-driven (L1475–L1492).
- **200 KB** logo cap is the hardcoded literal `200*1024` (L7965).
- **Arabic dictionary** `LANG_STRINGS.ar` (L7901–L7935) is a hand-written partial dictionary — the only non-English language; there is no `LANG_STRINGS.en` (English falls back to `dataset.i18nOriginal`).
- Disclaimer, logo-note and "no backend" copy are hardcoded English strings that **do** carry `data-i18n` keys with Arabic translations.

---

## 10. i18n keys

| Key | Element | HTML line | Arabic defined at |
|-----|---------|-----------|-------------------|
| `stab.general` | tab button label | L1422 | L7918 (`'عام'`) |
| `gen.title` | panel title | L1452 | L7921 |
| `gen.desc` | panel description | L1452 | L7921 |
| `gen.brand` | "Brand identity" | L1455 | L7922 |
| `gen.logo_label` | logo file label | L1460 | L7922 |
| `gen.sitename_label` | company name label | L1466 | L7923 |
| `gen.sitedesc_label` | site description label | L1467 | L7923 |
| `gen.regional` | "Regional defaults" | L1471 | L7924 |
| `gen.currency_label` | currency label | L1473 | L7924 |
| `gen.timezone_label` | timezone label | L1484 | L7924 |
| `gen.lang_label` | language label | L1495 | L7925 |
| `gen.disclaimer` | amber callout | L1502 | L7926 |
| `gen.support` | "Support contact" | L1504 | L7927 |
| `gen.email_label` | support email label | L1506 | L7927 |
| `gen.phone_label` | support phone label | L1507 | L7927 |
| `gen.logo_note` | no-backend note | L1511 | L7928 |
| `gen.save_btn` | Save button | L1512 | L7929 |
| `stabgrp.workspace` | nav group heading above the tab | L1421 | L7916 |

**No `data-i18n` on:** the `remove` link (L1462), the "PNG/SVG recommended…" helper text (L1462), `#meta-general`, and every `option` label in the three selects (L1475–L1498).

---

## 11. Gaps, dead code, UNVERIFIED items

1. **Currency setting is inert.** `DB.opsConfig.general.currency` has no reader. Every money string is suffixed with a literal `SAR` (L7467, L7419, L7386). Selecting `USD` changes nothing.
2. **Timezone setting is inert.** No reader. Timestamps come from the browser locale; `applyCityToggle` (L7807) is additionally hardcoded to `en-GB` regardless of the language setting.
3. **Support email / phone are inert.** No reader anywhere in the file.
4. **Logo upload and removal bypass RBAC.** `handleLogoUpload` (L7962) and `clearLogo` (L7974) contain no `requirePerm('manage_settings')` guard, unlike every other Settings mutation, and neither writes an audit entry.
5. **Empty-string saves are silently ignored.** `val(id)||g.field` (L7989–L7995): clearing "Company / site name" and pressing Save keeps the old name with no warning. There is no way to blank a field.
6. **No email format validation** on `cfg-gen-email`, though the panel validates email elsewhere (`commitInvite` L10536, `commitEditTeamUser` L10488 both require `indexOf('@')>=0`).
7. **`applyLanguage` is only invoked from two places** — `saveGeneralConfig` (L7996) and boot (L14596). Changing the select without pressing Save does nothing.
8. **Duplicate branding surface.** A separate `branding` sub-tab exists (`#stab-branding`, L1706) with `renderBrandingSettings()` / `saveBranding` (gated L18460) covering "the mark shown at the top of the sidebar". The relationship between that logo and `general.logoDataUrl` (the favicon) is **UNVERIFIED** from this pane — out of scope for this file, but operators face two separate "logo" settings.
9. **`applySiteBranding()` writes `href=''` when no logo** (L7959); an empty `href` on `link rel=icon` is browser-dependent and is not a reset to a default icon.
10. **UNVERIFIED — real persistence.** Single HTML file, no backend; nothing writes `DB.opsConfig` to storage. The UI says so at L1511. Any claim that a saved General setting survives a reload is false.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Page container `#p-settings` | L1416 |
| Tab button (General) | L1422 |
| Pane `#stab-general` | L1448–L1516 |
| Panel head / title / desc | L1450–L1453 |
| Brand identity section label | L1455 |
| `#logo-preview` | L1458 |
| `#cfg-gen-logo-file` | L1461 |
| `remove` link → `clearLogo()` | L1462 |
| `#cfg-gen-name` | L1466 |
| `#cfg-gen-desc` | L1467 |
| Regional defaults label | L1471 |
| `#cfg-gen-currency` + 7 options | L1474–L1482 |
| `#cfg-gen-tz` + 7 options | L1485–L1493 |
| `#cfg-gen-lang` + 2 options | L1496–L1499 |
| Arabic disclaimer | L1502 |
| Support contact label | L1504 |
| `#cfg-gen-email` | L1506 |
| `#cfg-gen-phone` | L1507 |
| No-backend note | L1511 |
| `Save general settings` button | L1512 |
| `#meta-general` | L1514 |
| `DB.opsConfig.general` seed | L2570 |
| `can()` | L3122–L3125 |
| `requirePerm()` | L3126–L3133 |
| `logAction()` | L3134+ |
| `switchSettingsTab()` | L7314–L7331 |
| `settingsLastUpdated()` | L7336–L7339 |
| `renderSettingsMeta()` | L7340–L7343 |
| `LANG_STRINGS` | L7899–L7935 |
| `applyLanguage()` | L7936–L7951 |
| `applySiteBranding()` | L7955–L7961 |
| `handleLogoUpload()` | L7962–L7973 |
| `clearLogo()` | L7974–L7979 |
| `renderGeneralConfig()` | L7980–L7985 |
| `saveGeneralConfig()` | L7986–L8002 |
| `val()` helper | L8034 |
| Settings page render entry (`go('settings')`) | L8819 |
| Boot `applyLanguage` | L14596 |
