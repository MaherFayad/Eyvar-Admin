# Settings Tab: Cities & Regions

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`div#p-settings`, L1416) | Pane `#stab-cities` **L1622–1646** | Tab button **L1426** (`data-tab="cities"`, icon 🌍, `data-i18n="stab.cities"`) | Render fn `renderCitiesTable()` **L7764–7780**

---

## 1. Purpose

Controls the list of operating cities and which of them are **live**. Per the panel copy (L1625): *"**Active** = riders in that city can search for and match with drivers instead of seeing 'not available here'. Driver applications are **never** blocked … the toggle only controls what riders can do."* Districts / driver coverage inside a live city are managed on the Zones page, linked inline at L1625 (`go('zones',findSbEl('zones'))`).

The claim is accurate in code: the only consumer of the active flag is `isCityActive()` (L8153–8156) called from `nearestAvailableDrivers()` (L8170) — see §9/§10. Nothing in the driver-application path reads `DB.cities`.

## 2. Layout map

| Region | Lines | Contents |
|---|---|---|
| Card wrapper | L1623 | single `.card` |
| Panel head | L1624–1626 | icon 🌍, title "Cities & regions", long description with Zones link |
| Table | L1627–1630 | `table.dt`, `thead` L1628, `tbody#cities-tbody` L1629 |
| Add-city strip | L1631–1643 | autocomplete input, suggestion dropdown, map preview, Add button |
| Meta line | L1644 | `div.settings-meta#meta-cities` |

## 3. Settings fields — every field

There are **no persisted scalar settings** on this tab. All state lives in the `DB.cities` array rows. The only inputs are the add-city composer.

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `new-city-name` (L1634) | "New city — type to search" | `input[type=text]`, `autocomplete="off"`, placeholder "Type at least 2 letters…" | empty | — | Free typing, but only values chosen from `KNOWN_CITIES` (L7822–7835, 24 entries) are accepted | `oninput`/`onfocus` → `handleCityAutocomplete(this.value)` (L7834); `onblur` hides the dropdown after 180 ms (L1634). Add button stays `disabled` until `selectCitySuggestion()` sets `citySelectedCoords` (L7855–7861). `addCity()` re-checks `!name||!citySelectedCoords` (L7878) and rejects duplicates case-insensitively (L7880) | Not persisted directly — feeds `DB.cities.push({name,active:false,launched:null,custom:true,lat,lng})` (L7881) | Adds a row to the cities table; nothing else until the Active toggle is flipped |
| `city-suggestions` (L1635) | — (dropdown container) | `div`, `display:none` by default | hidden | — | Max **6** matches (`.slice(0,6)`, L7843) | Substring, case-insensitive match on city name (L7843). Empty state: "No matching city found in the list." (L7845). Cities already in `DB.cities` render greyed with " — already on the list" and no click handler (L7849–7851) | — | Sets `citySelectedCoords` and enables the Add button |
| `city-map-preview` (L1639) | — | `div` 200×110, `display:none` | hidden | — | — | `showCityMapPreview()` (L7865–L7875) returns early if `typeof L==='undefined'` (Leaflet not loaded / offline) — L7871 | — | Purely visual; Leaflet map at zoom 10, OSM tiles `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, `maxZoom:12`, single marker |
| `add-city-btn` (L1639) | "+ Add city" | `button.btn.sm`, starts `disabled` | disabled | — | — | Enabled only by `selectCitySuggestion()` (L7859–7860) | — | Calls `addCity()` |
| per-row Active toggle (L7777) | (column "Active") | `input[type=checkbox].tog` | `c.active` | boolean | on/off | `toggleCityActive(name, cb, hasActivity)` (L7781–7791) | `DB.cities[i].active` | **The only field with real downstream effect** — see §10 |

### Per-city record fields (`DB.cities` element shape)

| Field | Type | Seeded value | Set by | Read by |
|---|---|---|---|---|
| `name` | string | see §8 | seed L13946–13951 / `addCity()` L7881 | `renderCitiesTable()` L7771, `cityStats()` L7451, `isCityActive()` L8154, exec overview L6939 |
| `active` | boolean | Riyadh `true`, rest `false` | seed / `applyCityToggle()` L7805–7807 | `renderCitiesTable()` L7776–7777, `isCityActive()` L8155, exec overview L6943 |
| `launched` | string \| null | Riyadh `'2025'`, rest `null` | seed / auto-stamped on first activation, `new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'})` (L7807) | `renderCitiesTable()` L7773 ("Live since" column, `—` when null) |
| `seed` | boolean | `true` on all 4 seeded cities | seed only | `renderCitiesTable()` L7770 — renders the grey badge "seed data city" |
| `custom` | boolean | absent on seeds, `true` on added | `addCity()` L7881 | `renderCitiesTable()` L7778 — gates the Remove button |
| `lat` / `lng` | number | **absent on all 4 seeded cities** | `addCity()` L7881 only | **Nothing.** No reader anywhere — see §9 |

## 4. Tables & lists

### Cities table (`#cities-tbody`, L1629; rendered L7764–7780)

**Columns, in order** (thead L1628): `City` · `Zones` · `Drivers` · `Riders` · `Live since` · `Status` · `Active` · *(unlabelled actions column)*

- **Row source**: `(DB.cities||[]).slice().sort((a,b)=>(b.active?1:0)-(a.active?1:0))` — active cities first, otherwise seed order (L7767).
- **City cell** (L7770): name + `<span class="b b-grey">seed data city</span>` when `c.seed`.
- **Zones / Drivers / Riders** (L7771–7773) come from `cityStats(name)` (L7448–7454). This function is explicitly hardcoded: only `'Riyadh'` returns real numbers — `zones = DB.zones.length`, `drivers = count of DB.drivers with status!=='pending'`, `riders = Object.keys(DB.riders).length`. **Every other city returns `{zones:0,drivers:0,riders:0}`** (L7453). The in-code comment at L7449–7450 admits this.
- **Live since** (L7773): `c.launched || '—'`.
- **Status** (L7775): `<span class="health h-green">Live</span>` or `<span class="health h-red">Not live</span>`.
- **Active** (L7777): toggle wired to `toggleCityActive(name, this, hasActivity)` where `hasActivity = st.drivers>0 || st.riders>0` (L7769) — evaluated at render time and baked into the inline handler string.
- **Actions** (L7778): `Remove` button only when `c.custom` — seeded cities cannot be removed.
- **Empty state**: **none**. `.map().join('')` on an empty array writes `''`, producing a table with a header and no body message (L7768/L7779). If `DB.cities` were emptied the table would render blank with no explanation. (Contrast `renderOpsLimitsTable()` L7401–7402 which does have `||'<tr>…No rider limits yet.</tr>'`.)

**Add flow**: type ≥2 letters → pick a suggestion → optional map preview → `+ Add city` → row appended with `active:false`.
**Edit flow**: none. There is no way to rename a city, edit its coordinates, or edit `launched`. The only editable per-row field is the Active toggle.
**Delete flow**: `removeCity(name)` (L7890–7896) — custom cities only, **no confirmation dialog**.

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| *(typing)* | `handleCityAutocomplete(q)` L7834–7853 | Resets `citySelectedCoords=null`, disables Add btn, hides map preview, filters `KNOWN_CITIES`, renders ≤6 suggestions | none | none | none | no |
| *(suggestion click)* | `selectCitySuggestion(name,lat,lng)` L7855–7862 | Fills input, hides dropdown, stores coords, enables Add btn, shows map | `citySelectedCoords` (module var, L7833) | none | none | no |
| **+ Add city** (L1639) | `addCity()` L7876–7889 | Validates, pushes new city (`active:false`), clears form, re-renders, toast `✅ <name> added — currently off, turn it on when ready` | `DB.cities` | `requirePerm('manage_settings')` L7877 | `logAction('config_updated','settings','cities','Added city: <name> (<lat>, <lng>)',{},{name,active:false})` L7882 | **Yes** — gated via `GATE_SWEEP.addCity` (L20817–20818): title "Add a city", summary "A new operating city becomes available for assignment.", consequences `['Operators must be scoped to it before they can see its data.','Pricing and policy for the city start from defaults.']`, button "Add city". Not marked `danger`. Wrapped by `gateAll()`/`guardAction()` (L20755–20766, L17819–17840). *Note: both stated consequences are aspirational — this panel has no per-city operator scoping and no per-city pricing.* |
| **Active toggle** (L7777) | `toggleCityActive(name,cb,hasActivity)` L7781–7791 | Turning **on**, or turning **off an empty city** → applies immediately via `applyCityToggle`. Turning **off a city with drivers/riders** → reverts the checkbox (`cb.checked=true`, L7788) and opens the confirm modal | via `applyCityToggle` | `requirePerm('manage_settings')` L7782 — on denial the checkbox is reverted (`cb.checked=!cb.checked`) | via `applyCityToggle` | Conditional bespoke modal (§6). **Not** registered in `GATE_SWEEP` |
| *(commit)* | `applyCityToggle(name,active)` L7803–7813 | Sets `c.active`; if turning on and `!c.launched`, stamps `launched` with current "Mon YYYY"; re-renders table + meta; toast `✅ <name> is now live` / `⚠ <name> turned off` with "sign-ups and ride requests there are now accepted/blocked" | `DB.cities[i].active`, `DB.cities[i].launched` | none of its own (checked by caller) | `logAction('config_updated','settings','cities','Launched\|Deactivated <name>',{active:before},{active:now})` L7808 | — |
| **Remove** (L7778, custom rows only) | `removeCity(name)` L7890–7896 | Filters the city out of `DB.cities`, re-renders, toast `City removed` (info) | `DB.cities` | `requirePerm('manage_settings')` L7891 | `logAction('config_updated','settings','cities','Removed city: <name>',{name},{})` L7893 | **No confirmation** — single click destroys the record |
| Zones link (L1625) | `go('zones',findSbEl('zones'))` | Navigates to the Zones & Coverage page | none | (page-level) | none | no |

## 6. Modals opened

**`openCityDeactivateConfirm(name, cb)`** — L7792–7802. Bespoke HTML injected into `#modal-content`; overlay opened with `document.getElementById('modal-overlay').classList.add('open')` (L7801).

| Element | Value |
|---|---|
| Title | `⚠ Turn off <name>?` (L7795) |
| Close | `✕` → `closeModal()` |
| Body | "This city currently has **N driver(s)** and **N rider(s)** on the platform. Turning it off immediately blocks new sign-ups and ride requests there — existing users are not removed, but can't start anything new until it's re-enabled." Counts from `cityStats(name)` (L7793), with correct singular/plural handling (L7798) |
| Fields | **none** |
| Buttons | `Cancel` → `closeModal()`; `Turn off <name>` (`btn sm danger`) → `applyCityToggle('<name>',false); closeModal()` (L7800) |
| Commit fn | `applyCityToggle` |

Because `cityStats()` only returns non-zero for Riyadh, **this modal can only ever appear for Riyadh** in the seeded dataset.

## 7. Rules / policy logic — written out exactly

1. **Add-guard**: `if(!name||!citySelectedCoords){toast('⚠ Pick a city from the suggestions first','warn');return;}` (L7878). Free text alone is never accepted.
2. **Duplicate guard**: `if((DB.cities||[]).some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('⚠ That city is already on the list','warn');return;}` (L7880).
3. **New cities are always inactive**: pushed with `active:false, launched:null` (L7881). UI copy at L1640: "Added inactive by default — turn it on when ready."
4. **Launch stamping**: `if(c.active&&!c.launched)c.launched=new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'})` (L7807). Once stamped it is never cleared on deactivation, and never re-stamped on re-activation.
5. **High-impact deactivation guard**: `if(!cb.checked&&hasActivity){cb.checked=true; openCityDeactivateConfirm(name,cb); return;}` (L7787–7790). Comment L7783–7786 states the reasoning.
6. **Matching gate** (`nearestAvailableDrivers`, L8170–8172):
   ```js
   if(!isCityActive(r.city)){
     var blocked=[]; blocked.cityInactive=true; blocked.riderCity=r.city;
     return blocked;
   }
   ```
   An empty array is returned with two expando properties. `isCityActive` returns `false` for an unknown city name — L8155 comment: *"unknown city defaults to not-live rather than silently allowed"*. This means a rider whose `city` string does not exactly match a `DB.cities[].name` can never be matched.
7. **Sorting rule**: active-first, stable within group (L7767).

## 8. Full enumerations

### 8a. Seeded cities — `DB.cities`, L13946–13951 (4 rows)

| # | name | active | launched | seed | custom | lat/lng |
|---|---|---|---|---|---|---|
| 1 | Riyadh | `true` | `'2025'` | `true` | — | absent |
| 2 | Jeddah | `false` | `null` | `true` | — | absent |
| 3 | Dammam | `false` | `null` | `true` | — | absent |
| 4 | Makkah | `false` | `null` | `true` | — | absent |

### 8b. `KNOWN_CITIES` picker list — L7822–7835 (24 entries, name + lat + lng)

Saudi Arabia (18): Riyadh 24.7136/46.6753 · Jeddah 21.4858/39.1925 · Makkah 21.3891/39.8579 · Madinah 24.5247/39.5692 · Dammam 26.4207/50.0888 · Al Khobar 26.2172/50.1971 · Dhahran 26.2361/50.0393 · Taif 21.2703/40.4158 · Tabuk 28.3835/36.5662 · Abha 18.2164/42.5053 · Khamis Mushait 18.3060/42.7297 · Jubail 27.0046/49.6600 · Hail 27.5114/41.7208 · Najran 17.4924/44.1277 · Jazan 16.8892/42.5611 · Yanbu 24.0895/38.0618 · Buraidah 26.3260/43.9750 · Sakaka 29.9697/40.2064

GCC (6): Dubai 25.2048/55.2708 · Abu Dhabi 24.4539/54.3773 · Doha 25.2854/51.5310 · Kuwait City 29.3759/47.9774 · Manama 26.2285/50.5860 · Muscat 23.5859/58.4059

### 8c. Per-city config available

**None beyond the six record fields in §3.** There is no per-city pricing, per-city radius, per-city currency, per-city gateway, per-city plan visibility or per-city operator scoping anywhere in the file, despite the `addCity` confirm text at L20818 claiming both scoping and per-city pricing exist.

## 9. Consumption check

| Setting / field | Read by | Dead? |
|---|---|---|
| `DB.cities[].active` | `isCityActive()` L8154–8155 → `nearestAvailableDrivers()` L8170 → the entire quick-ride and subscription matching path; `renderCitiesTable()` L7776; exec overview `#exec-cities-tbody` L6943 | **Live** — the one real setting on this tab |
| `DB.cities[].name` | L7770, L7451 (`cityStats`), L8154, L6939, L7842 (duplicate check) | Live |
| `DB.cities[].launched` | `renderCitiesTable()` L7773 only | **Display-only** |
| `DB.cities[].seed` | `renderCitiesTable()` L7770 badge only | **Display-only** |
| `DB.cities[].custom` | `renderCitiesTable()` L7778 (Remove button visibility) only | **UI-only** |
| `DB.cities[].lat` / `.lng` | Nothing. Grep of `DB.cities` returns L6939, 7767, 7805, 7842, 7880, 7881, 7892, 13946 — no property access to `lat`/`lng` outside the push at L7881 and the audit summary string at L7882 | **DEAD.** Coordinates are captured, justified in a comment ("makes sure coordinates are accurate", L1636 / L7818–7821), stored, and never used by any distance/matching/geo code. `nearestAvailableDrivers` uses `mapPos:{x,y}` percentages (L2593 etc.), not lat/lng |
| `citySelectedCoords` | `addCity()` L7878/L7881, `handleCityAutocomplete` L7838, `selectCitySuggestion` L7858 | Live (transient) |
| `cityStats()` zones/drivers/riders | `renderCitiesTable()` L7769–7773, `openCityDeactivateConfirm()` L7793, exec overview L6940 | Live but hardcoded to Riyadh (§11) |

## 10. Cross-module effects

1. **Dispatch / matching (`nearestAvailableDrivers`, L8167–8172)** — the sole enforcement point. A rider in an inactive city gets an empty candidate list flagged `cityInactive`.
2. **Manual-assign UI (L8374)** — renders `⛔ Eyvar isn't live in <city> yet — turn it on in Settings → Cities & Regions to allow matching there.` reading `nearby.cityInactive` / `nearby.riderCity`.
3. **Executive Overview (L6938–6947)** — `#exec-cities-tbody` renders `name · Live/Not live · zones · drivers · riders · avg failure %`. The failure % is computed only for Riyadh (`c.name==='Riyadh'`, L6942) as the mean of `zoneFailRate(z)` across all `DB.zones`, colour-banded >30 red / >15 amber / else green.
4. **Zones & Coverage page** — linked from the panel description (L1625) but reads `DB.zones`, not `DB.cities`; there is no city→zone foreign key. Comment at L6941 concedes: *"this dataset's zones are all within the seed city (Riyadh)"*.
5. **Settings meta line** — `renderSettingsMeta()` (L7341–7344) maps `meta-cities` → audit entity `'cities'`, so the footer reads "Last updated by <actor> · <ts>" from the newest matching `DB.auditLog` entry (`settingsLastUpdated`, L7337–7340).
6. **Permissions** — `manage_settings` label text at L3257 explicitly names cities: *"Change system-wide configuration — cities, dispatch radius, payment gateways, operational limits, branding, and more."*
7. **Settings nav regrouping** — `SETTINGS_GROUPS` (L21270–21276) moves `cities` out of the static "Operations" group in the HTML into the **"Platform"** group (`['general','cities','branding','legal']`) at boot via `reorderSettingsTabs()` (L21278, called L21393). The HTML group label at L1425 is therefore not what the user sees.

## 11. Hardcoded / mock / demo values

| Item | Line | Note |
|---|---|---|
| `cityStats()` short-circuits on the literal string `'Riyadh'` | L7451–7453 | Every non-Riyadh city reports 0/0/0 regardless of actual data. Comment at L7449–7450 flags it |
| `KNOWN_CITIES` is a static 24-entry array | L7822–7835 | Presented in UI copy as "a real city list" (L1636); it is an in-file literal, not a geocoding service |
| Seeded 4-city list with Riyadh live since the literal string `'2025'` | L13947 | `launched` is a free string, not a date |
| Exec-overview failure-rate branch keyed to `'Riyadh'` | L6942 | Same hardcoding as `cityStats` |
| Leaflet + OpenStreetMap tiles loaded from the public OSM CDN | L7873 | External network dependency; guarded by `typeof L==='undefined'` (L7871) |
| `addCity` confirm consequences reference operator scoping and per-city pricing | L20818 | Neither feature exists in this file |
| Seeded cities have no `lat`/`lng` | L13947–13950 | Only cities added through the UI get coordinates — an inconsistent record shape |

## 12. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `stab.cities` | tab button label, L1426 | "Cities & Regions" | `المدن والمناطق` (L7919) |
| `stabgrp.operations` | static group header, L1425 | "Operations" | `العمليات` (L7913) — **removed at boot** by `reorderSettingsTabs()` (L21285) |
| `stabgrp.platform` | runtime group header for this tab | "Platform" | `المنصة` (L7915) |

**No `data-i18n` attribute exists anywhere inside `#stab-cities` (L1622–1646).** The panel title, description, all eight table headers, the field labels, the helper text and the Add button are English-only string literals. `applyLanguage()` (L7939–7950) only rewrites `[data-i18n]` nodes, so switching to Arabic leaves this entire pane in English — consistent with the disclaimer at L7906–7910.

## 13. Gaps, dead code, UNVERIFIED items

1. **`lat`/`lng` are written and never read** (see §9). The stated justification for the whole autocomplete mechanism ("makes sure coordinates are accurate", L1636) is not realised anywhere.
2. **No empty state** on the cities table (L7768/L7779).
3. **`removeCity()` has no confirmation** (L7890) despite being irreversible and despite `addCity` — the *less* destructive action — being confirm-gated.
4. **`toggleCityActive` / `applyCityToggle` are not in `GATE_SWEEP`**, so activating a city (which unblocks matching platform-wide) fires on a single click. Only *de*activation of a city with activity is confirmed, and only via the bespoke modal.
5. **`cityStats` is not city-aware.** Drivers and riders carry a `city` field (e.g. `city:'Riyadh'` on every seeded rider, L2593+) that `cityStats` ignores in favour of a string comparison. A correct implementation would filter on `d.city===name`.
6. **No edit path** for any city field. A wrong `launched` value or a typo'd seed name cannot be corrected from the UI.
7. **Toast text overstates the effect**: `applyCityToggle` says "sign-ups and ride requests there are now blocked" (L7810) and the modal says "blocks new sign-ups" (L7798), but no sign-up code path reads `DB.cities` — only ride matching does. The panel description at L1625 states the accurate version.
8. **`hasActivity` is stale-baked** into the inline `onchange` string at render time (L7777). If drivers/riders change without a table re-render, the confirm gate uses the old value.
9. **`config_updated` is absent from `ACTION_LABELS`** (L2898–2910), so every cities audit entry falls back to the raw key in the Activity-log action filter (built from `Object.keys(ACTION_LABELS)`, L9238).
10. **UNVERIFIED** — whether the OSM tile fetch succeeds in the user's environment; it is an external network call that cannot be checked by reading the file.
11. **UNVERIFIED** — real-world accuracy of the 24 `KNOWN_CITIES` coordinate pairs; they are plausible but not cross-checked against an authoritative source.

## 14. Line-number index

| What | Lines |
|---|---|
| Tab button | 1426 |
| Pane `#stab-cities` | 1622–1646 |
| Panel head / description | 1624–1626 |
| Table head | 1628 |
| `tbody#cities-tbody` | 1629 |
| Add-city strip | 1631–1643 |
| `#new-city-name` | 1634 |
| `#city-suggestions` | 1635 |
| `#city-map-preview` | 1637 |
| `#add-city-btn` | 1639 |
| `#meta-cities` | 1644 |
| `switchSettingsTab()` | 7314–7331 |
| `settingsLastUpdated()` | 7337–7340 |
| `renderSettingsMeta()` (map incl. `meta-cities`) | 7341–7344 |
| `cityStats()` | 7448–7454 |
| `renderCitiesTable()` | 7764–7780 |
| `toggleCityActive()` | 7781–7791 |
| `openCityDeactivateConfirm()` | 7792–7802 |
| `applyCityToggle()` | 7803–7813 |
| `KNOWN_CITIES` | 7822–7835 |
| `citySelectedCoords` | 7833 |
| `handleCityAutocomplete()` | 7834–7853 |
| `selectCitySuggestion()` | 7855–7862 |
| `showCityMapPreview()` | 7864–7874 |
| `addCity()` | 7876–7889 |
| `removeCity()` | 7890–7896 |
| `applyLanguage()` | 7939–7950 |
| `isCityActive()` | 8153–8156 |
| `nearestAvailableDrivers()` city gate | 8167–8172 |
| Manual-assign "not live" notice | 8374 |
| Settings page render fan-out (`renderCitiesTable()` call) | 8819 |
| Exec-overview cities table | 6938–6947 |
| `DB.cities` seed | 13946–13951 |
| `guardAction()` | 17819–17840 |
| `gateAll()` | 20755–20767 |
| `GATE_SWEEP.addCity` | 20817–20818 |
| `SETTINGS_GROUPS` / `reorderSettingsTabs()` | 21270–21276 / 21278 |
