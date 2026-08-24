# Settings Tab: Branding & logo

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-branding` · **HTML lines:** L1706–1714
> **Nav button:** L1431 (`data-tab="branding"`, icon 🎨, `data-i18n="stab.branding"`)
> **Render fn:** `renderBrandingSettings()` L18401–18435 · **Mount point:** `#branding-body` (L1712)

---

## 1. Purpose

Holds the mark shown at the top of the sidebar (`.sb-logo-img`) and the wordmark next to it (`.sb-logo-text`). The pane header text (L1710) states the intent: "The mark shown at the top of the sidebar and on generated documents. Changing it affects every operator, so it sits behind a confirmation like any other shared setting."

**⚠ Correction to a common assumption:** this tab does **NOT** drive `#site-title` (L8), `#site-favicon` (L7), or `#site-meta-desc` (L6). Those three are written by `applySiteBranding()` (L7954–7960) reading `DB.opsConfig.general` — i.e. by the **General** settings tab (`renderGeneralConfig()` L7980, `saveGeneralConfig()` L7986), which is outside this tab's scope. Verified: `applyBranding()` (L18389–18399) touches only `.sb-logo-img` and `.sb-logo-text`.

Two independent logo stores therefore exist in the file:

| Store | Set by | Applied by | Renders |
|---|---|---|---|
| `DB.branding.logoUrl` | Branding tab (`saveBranding()` L18447) | `applyBranding()` L18389 | Sidebar `.sb-logo-img` (L482) |
| `DB.opsConfig.general.logoDataUrl` | General tab (`handleLogoUpload()` L7961) | `applySiteBranding()` L7954 | Browser favicon + `#logo-preview` (L1453) |

This duplication is a real defect — see §12.

---

## 2. Layout map

```
#stab-branding                                    L1706
└── .card                                         L1707
    ├── .settings-panel-head  🎨 "Branding & logo" + description   L1708–1711
    └── #branding-body   ← renderBrandingSettings() writes here    L1712
        └── div padding:13px 16px                                  L18405
            ├── flex row (gap 16, wrap)                            L18406
            │   ├── LEFT column (flex:1, min-width 240)            L18407
            │   │   ├── field "Logo image"      → #brand-file      L18408–18410
            │   │   ├── field "…or paste a URL" → #brand-logo      L18411–18412
            │   │   ├── field "Wordmark text"   → #brand-word      L18413–18414
            │   │   └── checkbox                → #brand-showword  L18415–18417
            │   └── RIGHT column (width 190, "PREVIEW" card)       L18419–18423
            │       ├── #brand-preview       (img, height 26px)    L18421
            │       └── #brand-preview-word  (text)                L18422
            ├── explanatory paragraph                              L18425–18427
            └── button row: [Save branding] [Reset to default]     L18428–18429
```

Live-preview wiring: after `innerHTML` is set, `renderBrandingSettings()` attaches both `input` and `change` listeners calling `previewBranding()` to `brand-logo`, `brand-word`, `brand-showword` (L18431–18434).

---

## 3. Settings fields — EVERY field

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `brand-file` | "Logo image" | `input type=file accept="image/*"` (L18409) | empty | file | any MIME beginning `image/` | `handleLogoFile()` L20995: rejects `f.size > DB.branding.maxUploadMB*1024*1024` → toast `⛔ N MB is over the 12 MB limit` (L20999–21001); rejects non-`^image\/` type → toast `⛔ That is not an image file` (L21003); `reader.onerror` → toast `⛔ Could not read that file` (L21014) | **Not persisted directly.** On success the data-URI is written into `#brand-logo`'s value (L21007) and `#brand-preview.src` (L21009). Only `saveBranding()` persists. | Updates `#brand-file-meta` caption to `name · KB · type — not saved yet, press Save branding` (L21011–21012); toast `🖼 Loaded <name> — preview updated` (L21013) |
| `brand-logo` | "…or paste a URL" | `input type=text` (L18412) | `DB.branding.logoUrl` — seeded `''` (L18388) | URL or `data:` URI | free text; placeholder `https://… (production should serve this from your CDN)` | **None.** Any string is accepted. A broken URL is only detected at render time by `img.onerror` in `applyBranding()` (L18393) → toast `⚠ Logo failed to load — check the URL` | `DB.branding.logoUrl` (L18448) | `.sb-logo-img.src` for every page (L18391–18392). Sidebar logo renders at `height:20px; max-width:36px`, expanding to `26px / 150px` on sidebar hover or pin (CSS L34–35) |
| `brand-word` | "Wordmark text" | `input type=text` (L18414) | `DB.branding.wordmark` — seeded `'eyvar'` (L18388) | text | free text; placeholder `eyvar` | none | `DB.branding.wordmark` (L18449) | `.sb-logo-text.textContent` (L18396) |
| `brand-showword` | "Show the wordmark next to the logo" | `input type=checkbox` 15×15px (L18416) | `DB.branding.showWordmark` — seeded `true` (L18388) | boolean | on / off | none | `DB.branding.showWordmark` (L18450) | `.sb-logo-text.style.display` — `''` when true, `'none'` when false (L18397) |

### Non-editable / display-only elements

| id | Content | Source |
|---|---|---|
| `brand-file-meta` | `PNG, JPG or SVG · up to 12 MB · a transparent PNG or SVG at roughly 2:1 works best` | L18410, interpolates `DB.branding.maxUploadMB` |
| `brand-preview` | `img` at `height:26px; max-width:120px; object-fit:contain`; `src` = `b.logoUrl` **or** the current `.sb-logo-img`'s src as fallback | L18421 |
| `brand-preview-word` | `b.showWordmark ? b.wordmark : ''` | L18422 |

### `DB.branding` record shape

Declared L18388, re-declared identically inside `resetBranding()` L18455, extended L20994:

```js
DB.branding = {
  logoUrl:      '',          // L18388
  wordmark:     'eyvar',     // L18388
  showWordmark: true,        // L18388
  accent:       '#185FA5'    // L18388  — WRITTEN BUT NEVER READ (see §12)
};
DB.branding.maxUploadMB = 12;  // L20994, comment: "above the 10 MB asked for"
```

---

## 4. Tables & lists

**None.** This tab has no table, no list, and no repeating rows. It is a four-field form plus a preview card.

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Save branding** (`.btn p sm`, L18428) | `saveBranding()` L18447–18453 | 1. `requirePerm('manage_settings')` gate (L18448). 2. Copies the three input values into `DB.branding`. 3. Calls `applyBranding()` → sidebar updates immediately. 4. `logAction`. 5. toast `✅ Branding saved` (ok) | `DB.branding.logoUrl`, `.wordmark`, `.showWordmark` | `manage_settings` — label "Manage system settings & configuration" (L3238); on failure `requirePerm` logs `permission_denied` and toasts `🔒 Your role lacks permission: …` (L3126–3132) | `logAction('edit_branding','settings','branding','Panel branding updated')` L18452 — **no before/after diff object passed**, so `auditDiffHTML` renders nothing for this entry | **Yes** — `guardAction('saveBranding', …)` L18461–18468 |
| **Reset to default** (`.btn sm`, L18429) | `resetBranding()` L18454–18459 | 1. **No permission check** (see §12). 2. Replaces the whole `DB.branding` object with the literal `{logoUrl:'',wordmark:'eyvar',showWordmark:true,accent:'#185FA5'}` (L18455) — this **drops `maxUploadMB`**. 3. `logAction`. 4. `renderBrandingSettings()` re-renders the pane. 5. toast `Branding reset — reload to restore the bundled logo` (info) | `DB.branding` (whole object replaced) | **None** | `logAction('edit_branding','settings','branding','Branding reset to default')` L18456 | **Yes** — registered in `GATE_SPECS.resetBranding` L20797–20799 and installed by `installUniversalGates()` L18372–18383 |
| *(implicit)* File picker change | `handleLogoFile(this)` L18409 → L20995–21016 | Reads the file as a data URI via `FileReader.readAsDataURL` (L21015) and stages it into `#brand-logo`. Never touches `DB`. | nothing | none | none | no |
| *(implicit)* Any input/change on the three text/checkbox fields | `previewBranding()` L18437–18445 | Live-updates `#brand-preview.src` (only if the URL field is non-empty, L18441) and `#brand-preview-word` | nothing | none | none | no |

### Confirmation gate contents

`guardAction('saveBranding')` L18461–18468:
- **title:** `Save branding`
- **summary:** `The logo and wordmark change for every user of this panel, not just you.`
- **consequences:** `['The sidebar updates immediately for all sessions.', 'A broken image URL leaves the panel with no logo at all.']`
- **confirmLabel:** `Save branding`
- `danger` not set → renders as a normal (non-red) confirmation.

`GATE_SWEEP.resetBranding` L20846–20849 (installed by `installGateSweep()` L20903, **not** by `installUniversalGates()`):
- **t:** `Reset branding to default` · **d:** `true` (danger)
- **c:** `['The uploaded logo is discarded and cannot be recovered from here.', 'Every operator sees the change.']`
- **btn:** `Reset`

Gate mechanics (`guardAction` L17819–17840): wraps `window[name]`; if `window.__skipGuards` is truthy or the internal `__guardToken` already equals the name (re-entry from a confirmed run), the original runs directly; otherwise `confirmAction(spec)` is shown and the original only runs from `spec.onConfirm`.

---

## 6. Modals opened

This tab opens **no modal of its own**. The only overlay is the generic confirmation dialog produced by `confirmAction(spec)` via `guardAction` (§5), whose fields are entirely the spec object above (title / summary / consequences list / confirm button label).

---

## 7. Rules / policy logic — written out exactly

1. **Upload size limit** (L20998–21001): `maxBytes = DB.branding.maxUploadMB * 1024 * 1024` = `12 * 1048576` = 12 582 912 bytes. Files above it are refused with the size printed to one decimal.
2. **MIME guard** (L21003): `/^image\//.test(f.type)` — anything else refused.
3. **Upload is staged, not saved** (L21011–21012): the caption is rewritten to `… — not saved yet, press Save branding`. The DB is untouched until `saveBranding()` runs.
4. **URL-over-upload rationale**, verbatim from L18426–18427: *"A URL is used rather than a file upload because this panel has no asset store — in production the logo belongs in your CDN and this field holds the path. SVG or a transparent PNG at roughly 2:1 works best; the sidebar renders it at 20 px high and it must stay legible on white."* — note this text contradicts the file-upload field that sits directly above it (both mechanisms exist; the upload was added later at L20989–20993 with its own comment: *"A URL field asks an operator to host an image first. Upload it, see it, keep it. Stored as a data URI so it survives without an asset service; in production this posts to object storage and stores the key."*).
5. **Broken-URL behaviour** (L18392–18394): `applyBranding()` sets `img.onerror` to toast an error. It does **not** fall back to the bundled base64 logo, so a bad URL leaves the sidebar with a broken image until reload.
6. **Reset does not restore the bundled logo in-session** — the toast says so explicitly: `Branding reset — reload to restore the bundled logo` (L18458). `applyBranding()` is not called by `resetBranding()`, and it only assigns `img.src` when `DB.branding.logoUrl` is truthy (L18391), so after a reset the sidebar keeps whatever URL was last applied.

---

## 8. Enumerations

There is no enumerated list (no template set, no doc types, no categories) in this tab. The complete key set of the persisted object is: `logoUrl`, `wordmark`, `showWordmark`, `accent`, `maxUploadMB`.

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| Sidebar logo image `.sb-logo-img` | `applyBranding()` sets `.src` | L18390–18392 |
| Sidebar wordmark `.sb-logo-text` | `applyBranding()` sets `.textContent` and `.style.display` | L18395–18398 |
| Activity log / Audit log page | Both actions write `edit_branding` entries into `DB.auditLog`, visible on `#p-audit-log` and in the Settings → Activity preview | L18452, L18456 |
| Settings "last updated" captions | `settingsLastUpdated('branding')` would resolve these entries — **but `renderSettingsMeta()`'s map (L7340) contains no `branding` key**, so no caption is shown for this tab | L7339–7342 |
| Navigation | `renderBrandingSettings()` is called on every navigation to `settings` | L8819 |
| `fixesBoot` module | Boot step `{name:'panel fixes', fn:fixesBoot, needs:['branding','drivers']}` — that whole module is skipped if `DB.branding` is undefined | L21823 |

Nothing else in the file reads `DB.branding.accent`.

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `''` (empty logoUrl) | L18388, L18455 | Seed default — the visible sidebar logo is a **hardcoded base64 PNG** embedded in the HTML at L482, ~7 KB of `data:image/png;base64,iVBOR…`, `alt="Eyvar"` |
| `'eyvar'` | L18388, L18455 | Default wordmark |
| `'#185FA5'` | L18388, L18455 | `accent` — **dead value, never read anywhere** |
| `12` | L20994 | `maxUploadMB`, with the comment `/* above the 10 MB asked for */` |
| `2:1` aspect guidance, `20 px` / `26 px` heights | L18410, L18427, L18421 | Copy only |
| `200*1024` (200 KB) | L7964 | The *other* logo uploader (General tab) uses a different, much smaller limit — inconsistent with the 12 MB here |

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.branding` | Nav button label span, L1431 | `Branding & logo` | **MISSING** — no `stab.branding` entry exists in `LANG_STRINGS.ar` (checked L7914–7921) |
| `stabgrp.platform` | Group header injected by `reorderSettingsTabs()` (branding is in the `Platform` group, L21275) | `Platform` | `المنصة` (L7916) |

**No `data-i18n` attribute exists anywhere inside `#stab-branding`.** The panel title, description, every field label, the explanatory paragraph and both buttons are English-only and are produced by JS string concatenation, so `applyLanguage()` (L7939–7953, which only walks `[data-i18n]` elements) cannot translate them.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **`resetBranding()` has no permission check.** `saveBranding()` calls `requirePerm('manage_settings')` (L18448); `resetBranding()` (L18454) does not. A user without `manage_settings` cannot save branding but can wipe it. Confirmed by reading both function bodies.
2. **`resetBranding()` silently deletes `DB.branding.maxUploadMB`.** L18455 replaces the entire object with a 4-key literal. After a reset, `renderBrandingSettings()` L18410 interpolates `undefined` into the caption (`"up to undefined MB"`) and `handleLogoFile()` L20998 computes `NaN` for `maxBytes`, making `f.size > NaN` always false — **the size limit is disabled for the rest of the session**.
3. **Two competing logo stores** (see §1) — `DB.branding.logoUrl` (sidebar) and `DB.opsConfig.general.logoDataUrl` (favicon + `#logo-preview`). They are never synchronised. Setting one leaves the other stale. This is the same "two copies of the truth" fault the file's own comments complain about elsewhere.
4. **`DB.branding.accent` is dead.** Assigned twice, read zero times.
5. **`applyBranding()` never clears a logo.** `if(img && DB.branding.logoUrl)` (L18391) — an empty `logoUrl` is a no-op, so clearing the field and saving does not remove the current logo until reload.
6. **`resetBranding()` does not call `applyBranding()`** (L18454–18459), so the sidebar is not updated by a reset; the toast admits this.
7. **No XSS escaping.** `renderBrandingSettings()` interpolates `b.logoUrl` and `b.wordmark` straight into an HTML attribute (L18412, L18414) and into `src=` (L18421) with no escaping. A wordmark containing `">` breaks out of the attribute. Single-session demo file, but noted.
8. **No `data-i18n` coverage** (§11) — the tab is untranslatable.
9. **`renderSettingsMeta()` has no `branding` entry** (L7340), so the "Last updated by …" caption pattern used by other tabs is absent here. There is also no `meta-branding` element in the HTML to receive it.
10. **`edit_branding` is not in `ACTION_LABELS`** (L2900–2910). The Activity-log page's action-type filter is built from `Object.keys(ACTION_LABELS)` (L9210), so branding changes **cannot be filtered by action type** on `#p-audit-log`. See `16k-audit-log.md` §12.
11. **UNVERIFIED — "and on generated documents".** The pane description (L1710) claims the logo appears on generated documents. No document/receipt/invoice generator in this file was found reading `DB.branding`. Grep for `DB.branding` returns only L18388, L18391, L18395–18397, L18410, L18448–18450, L18455, L20994, L20998, L21000. The claim appears to be aspirational copy.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| `#site-meta-desc` / `#site-favicon` / `#site-title` tags | L6, L7, L8 |
| Sidebar logo CSS (`.sb-logo-img`, hover expansion) | L33–35 |
| Sidebar logo element + bundled base64 PNG | L482 |
| Nav button `data-tab="branding"` | L1431 |
| Pane `#stab-branding` | L1706–1714 |
| `#branding-body` mount | L1712 |
| `ACTION_LABELS` (does not contain `edit_branding`) | L2900–2910 |
| `requirePerm()` | L3126–3132 |
| `logAction()` | L3133–3155 |
| `PERMISSION_LABELS.manage_settings` | L3238 |
| Permission description | L3257 |
| `renderSettingsMeta()` map (no branding key) | L7339–7342 |
| `applyLanguage()` | L7939–7953 |
| `applySiteBranding()` (General tab — NOT this tab) | L7954–7960 |
| `handleLogoUpload()` (General tab, 200 KB limit) | L7961–7973 |
| `go('settings')` render fan-out incl. `renderBrandingSettings()` | L8819 |
| `guardAction()` | L17819–17840 |
| `GATE_SWEEP` object start | L20769 |
| `installGateSweep()` / `gateAll()` | L20898–L20903 / L20756 |
| `DB.branding` seed | L18388 |
| `applyBranding()` | L18389–18399 |
| `renderBrandingSettings()` | L18401–18435 |
| `previewBranding()` | L18437–18445 |
| `saveBranding()` | L18447–18453 |
| `resetBranding()` | L18454–18459 |
| `guardAction('saveBranding')` | L18461–18468 |
| `GATE_SWEEP.resetBranding` | L20846–20849 |
| Logo-upload block comment | L20989–20993 |
| `DB.branding.maxUploadMB = 12` | L20994 |
| `handleLogoFile()` | L20995–21016 |
| `SETTINGS_GROUPS` (branding → `Platform`) | L21275 |
| `reorderSettingsTabs()` | L21278–21313 |
| Boot step `panel fixes` needs `DB.branding` | L21823 |
