# Settings Tab: Activity (in-settings preview)

> **Source file** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page** `settings` (`#p-settings`, L1416–2048)
> **Pane id** `#stab-activity` — HTML **L2008–2017**
> **Tab button** L1442 (`switchSettingsTab('activity',this)`), group "System" (L1436)
> **Render fn** none of its own — the **second half of `renderAuditLog()`**, L9347–9352
> **Support fns** `renderSettingsMeta()` L7339–7342, `settingsLastUpdated()` L7335–7338, `fitSettingsNavHeight()` L7297–7310, `switchSettingsTab()` L7314–7331

---

## 1. Purpose

A **four-row, filterless preview** of the audit log embedded in the Settings page, with a link out to the full Activity-log page.

Pane description, verbatim (L2012): *"Every configuration change made in Settings, newest first."*

⚠ **The description is inaccurate.** The preview is `DB.auditLog.slice(0,4)` (L9350) — the four newest entries of the **global** audit log, unfiltered. It shows driver approvals, payouts, refunds, claim take-overs and everything else, not only Settings changes. There is no `entityType==='settings'` predicate anywhere in the preview path.

---

## 2. Layout map

| Order | Element | Line | Notes |
|---|---|---|---|
| 1 | `.settings-panel#stab-activity` | 2008 | Not `.on` by default — `switchSettingsTab('general')` runs at the end of `go('settings')` (L8819) |
| 2 | `.card` wrapper | 2009 | |
| 3 | `.settings-panel-head` | 2010 | |
| 4 | `.settings-panel-ic` = `🕵️` | 2011 | |
| 5 | `.settings-panel-title` = "Recent activity" + `.settings-panel-desc` | 2012 | |
| 6 | `<button class="btn sm" onclick="go('audit-log',findSbEl('audit-log'))">View full activity log →</button>` in a `margin-left:auto` wrapper | 2013 | |
| 7 | `<div id="audit-log-preview" style="padding:0">` | 2015 | The single mount point |

The whole pane is 10 lines of static HTML with one injected `<div>`. There is no header card / body card split (unlike the Pricing, Ledger and Rota panes) — head and body share one `.card`.

---

## 3. Settings fields — EVERY field

**Zero.** `#stab-activity` contains no `<input>`, `<select>`, `<textarea>`, toggle or any other control. Nothing is configurable and nothing is persisted from this pane.

The variables that govern the preview are module-level globals shared with the full page (§9):

| Global | Value | Line | Affects the preview? |
|---|---|---|---|
| `AUDIT_FILTER_ACTOR` | `''` | 9225 | ❌ ignored by the preview branch |
| `AUDIT_FILTER_ACTION` | `''` | 9226 | ❌ ignored |
| `AUDIT_SEARCH` | `''` | 9227 | ❌ ignored |
| `AUDIT_PAGE` | `1` | 9228 | ❌ ignored |
| `AUDIT_PAGE_SIZE` | `20` | 9229 | ❌ ignored |
| Preview row count | hardcoded `4` | 9350 | ✅ — not configurable |

---

## 4. Tables & lists

### 4.1 Preview table — built by `auditRowsHTML(recent, true)` L9296–9305

Wrapped in `.tbl-scroll`, `<table class="dt">`.

**Columns — `compact === true`, so only 3:**

| # | Header | Content | Styling |
|---|---|---|---|
| 1 | `Time` | `e.ts` | 11px, `var(--muted)`, `white-space:nowrap`, `vertical-align:top` |
| 2 | `Who` | `e.actorName` | 11.5px, weight 500, nowrap, **`cursor:pointer`, `color:var(--blue)`**, `onclick="showActorHistory('{e.actorId}')"`, `title="View everything {actorName} has done"` |
| 3 | `Action` | `e.summary` + `auditDiffHTML(e.before,e.after)` | 11.5px |

The 4th column (the entity link, `auditEntityLink(e)`) is **suppressed** in compact mode — the preview offers no way to jump to the affected record.

**Row source:** `DB.auditLog.slice(0,4)` — L9350. Newest first (`logAction` uses `unshift`, L3145).
**Row actions:** clicking the actor name opens the actor-history modal (§6). Nothing else is clickable.
**Empty state:** `auditEmptyHTML('this session')` L9351 → *"No actions logged yet this session. Every assignment, approval, or permission change you make will appear here."* — 20px padding, centred, ghost.

> ⚠ The preview is **never empty in practice**: `DB.auditLog` ships with 8 seeded rows (L2863–2872), and boot-time modules add more.

### 4.2 There is no second table, list, or empty-state variant in this pane.

---

## 5. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `View full activity log →` (L2013, `btn sm`) | `go('audit-log', findSbEl('audit-log'))` | Navigates to `#p-audit-log`; `findSbEl()` (L7007) locates the matching sidebar item so the nav highlight follows. `go()` pushes history, then `if(id==='audit-log'){renderAuditLog();}` (L8824) | `navCurrent`, nav history | **none** — `PAGE_PERMISSIONS['audit-log'].perms=[{key:'view'}]` exists (L10650) but `requirePagePerm('audit-log','view')` is **never called** anywhere | none | no |
| *(actor name in any preview row)* | `showActorHistory(e.actorId)` L9271–9280 | Opens the actor-history modal (§6) | none | none | none | no |

That is the complete set — two interactive affordances.

---

## 6. Modals opened

### `showActorHistory(actorId)` — L9271–9280 — reachable from the preview's `Who` column

| Part | Content |
|---|---|
| **Title** | `{actor.name}'s activity` — falls back to the raw `actorId` when `DB.teamUsers.find()` misses (e.g. a system/seed actor) |
| **Close** | `✕` → `closeModal()` |
| **Sub-header** | `{N} action(s) total` + `· {actor.role}` when the actor resolves. Styled 10.5px, uppercase, letter-spacing .3px, weight 600, ghost |
| **Body** | `auditRowsHTML(list, true)` — **compact mode again**, so Time / Who / Action, no entity link. `list = DB.auditLog.filter(e => e.actorId===actorId)` (L9273) — **unpaginated and uncapped**: a busy actor renders every one of their entries (up to the global 500 cap) in one modal |
| **Empty state** | `auditEmptyHTML('for this team member')` → *"No actions logged yet for this team member. Every assignment, approval, or permission change you make will appear here."* |
| **Footer** | `Close` (`btn sm`) → `closeModal()` |

**Fields:** none — the modal is read-only. **Commit function:** none.
Inside the modal the `Who` column is still clickable and still calls `showActorHistory(sameId)` — clicking it re-renders the same modal in place.

No other modal is reachable from this pane.

---

## 7. Rules / policy logic — written out exactly

### 7.1 The preview branch of `renderAuditLog()` — L9347–9352, verbatim
```js
/* Compact preview — inside Settings — no filter, last 4 only. */
var prev=document.getElementById('audit-log-preview');
if(prev){
  var recent=DB.auditLog.slice(0,4);
  prev.innerHTML=recent.length?auditRowsHTML(recent,true):auditEmptyHTML('this session');
}
```
Three rules, exhaustively: **(1)** always the newest 4, **(2)** never filtered, **(3)** always compact (3 columns).

### 7.2 When the preview refreshes
- `go('settings')` → `renderAuditLog()` L8819
- `go('audit-log')` → `renderAuditLog()` L8824 (the preview `<div>` is not in the DOM path but *is* in the document, so `getElementById` finds it and it refreshes even while hidden)
- **Every single `logAction()` call** → `if(typeof renderAuditLog==='function')renderAuditLog();` L3149

⚠ **Rule 3 means the preview is re-rendered on every audited action anywhere in the panel** — 220 call sites (§9.4 of `16k`). `renderAuditLog()` also rebuilds the full-page list and its three custom selects on the same call.

### 7.3 `switchSettingsTab(key, el)` — L7314–7331 — exactly
```
remove .on from every .settings-panel
add    .on to  #stab-{key}                       (if it exists)
remove .on from every .settings-tab
if (el)  el.classList.add('on');  activeBtn = el
else     btn = querySelector('.settings-tab[data-tab="{key}"]'); if (btn) { btn.classList.add('on'); activeBtn = btn }
if (activeBtn && typeof activeBtn.scrollIntoView === 'function')
     activeBtn.scrollIntoView({block:'nearest'})
```
Inline rationale (L7322–7327): *"The nav column scrolls independently of the content (needed so a tall 21-tab/6-group list stays fully reachable once pinned at the top). Without this, switching tabs left the nav's own scroll wherever it happened to be — you could be looking at 'Reason Codes & SLA' while the nav showed 'Records' three groups away. Keep them in sync on every switch."*

⚠ `scrollIntoView({block:'nearest'})` scrolls **the nearest scrollable ancestor chain**, which includes `#p-settings` itself (`overflow-y:auto`) — so switching tabs can also nudge the page's own scroll position, not just the nav column's.
⚠ The function does **not** call any renderer. Every settings renderer runs once, up front, in `go('settings')` (L8819); switching tabs only toggles CSS classes. A tab's data is therefore as stale as the last `go('settings')` — except the Activity preview, which `logAction` keeps live.
✓ **The comment's "21-tab/6-group" is correct, and describes the nav the user actually sees.** The *static markup* has 21 tabs in 3 groups (`stabgrp.workspace` **L1420**, `stabgrp.operations` **L1424**, `stabgrp.system` **L1436**), but `reorderSettingsTabs()` (L21278–L21313) rewrites the nav at boot: it removes all three static `.settings-tab-group-lbl` headers (**L21288**), then appends **six** new ones from `SETTINGS_GROUPS` (L21270–L21277), stamping each with `data-i18n` from its `i18nKey` (**L21296**). 5+4+3+3+4+2 = **21** tabs across **6** groups. It runs once, from `presenceBoot()` (L21393), registered in `bootModules()` at L21825. The seven `stabgrp.*` Arabic keys at L7915–7916 are therefore **consumed at runtime**, not orphaned — with the single exception of `stabgrp.other` (L21307), whose `leftovers` branch is unreachable because the six groups cover all 21 tabs. *(An earlier revision of this document asserted the inverse. `03c` L546 already had it right. See `docs/02-verification/corrections-applied.md` Part 2 §6.)*

### 7.4 `fitSettingsNavHeight()` — L7297–7311 — exactly
```
nav = document.querySelector('.settings-nav-col');  if (!nav) return
top       = nav.getBoundingClientRect().top
available = window.innerHeight - top - 12          /* 12px bottom breathing room */
nav.style.maxHeight = Math.max(120, available) + 'px'
```
Inline rationale (L7300–7306): *"position:sticky measures 'top:0' against the nearest scrolling ancestor (#p-settings, which has overflow-y:auto) — not the raw browser viewport. A guessed max-height:100vh overshoots by however tall the fixed top bar + this page's own header are, so the bottom of the nav still ends up below the visible screen edge with no way to scroll it into view. Measure the real remaining space instead of guessing it."*

**Triggers:** `go('settings')` L8819 (last statement) and a `window.resize` listener L7311–7313 that fires only when `#p-settings` currently has class `on`.
⚠ It is **not** re-run on `switchSettingsTab`, so a tab change that alters the page header height leaves the computed `maxHeight` stale.
⚠ The static markup already sets `max-height:100vh` inline (L1419); this function overwrites it at runtime.
Floor: `120px`.

### 7.5 `settingsLastUpdated(entityId)` — L7335–7338 — exactly
```
e = (DB.auditLog||[]).find(x => x.entityType==='settings' && x.entityId===entityId)
return e ? ('Last updated by '+e.actorName+' · '+e.ts) : 'No changes recorded yet'
```
`.find()` on a newest-first array returns the **most recent** matching entry. Comment (L7332–7334): *"Shows who last changed each settings section, and when — pulled straight from the audit log rather than a separate tracked field, so it's always in sync with what actually happened."*

⚠ The 500-entry cap in `logAction` (L3148) means a section's "last updated" line silently reverts to *"No changes recorded yet"* once its entry ages out of the log.

### 7.6 `renderSettingsMeta()` — L7339–7342 — exactly
```
map = { 'meta-general':'general', 'meta-ops-radius':'ops-radius',
        'meta-notifications':'notifications', 'meta-security':'security',
        'meta-cities':'cities', 'meta-limits':'limits', 'meta-gateways':'gateways',
        'meta-phases':'phases', 'meta-plan-visibility':'plan-visibility',
        'meta-cancelpolicy':'cancellation-policy', 'meta-multi-sub':'multi-sub-policy' }
for each elId in map: el = getElementById(elId); if (el) el.textContent = settingsLastUpdated(map[elId])
```
Called once per `go('settings')` (L8819). **Not** re-run after a save — each save handler calls it explicitly (e.g. `saveCancellationPolicy` L7384, `saveDataWindow` does not).

---

## 8. Full enumerations

### 8.1 The complete `renderSettingsMeta` map — 11 entries (L7340)

| DOM id | `entityId` looked up | Element exists? | Line of element |
|---|---|---|---|
| `meta-general` | `general` | ✅ | 1514 |
| `meta-ops-radius` | `ops-radius` | ✅ | 1578 |
| `meta-notifications` | `notifications` | ✅ | 1921 |
| `meta-security` | `security` | ✅ | 1989 |
| `meta-cities` | `cities` | ✅ | 1645 |
| `meta-limits` | `limits` | ✅ | 1700 |
| `meta-gateways` | `gateways` | ✅ | 1663 |
| `meta-phases` | `phases` | ✅ | 1600 |
| `meta-plan-visibility` | `plan-visibility` | ✅ | 1617 |
| `meta-cancelpolicy` | `cancellation-policy` | ✅ | 1840 |
| `meta-multi-sub` | `multi-sub-policy` | ✅ | 1590 |

**Orphan found:** `id="meta-reasons"` exists at **L1796** (Reason Codes & SLA tab) but is **absent from the map** — it is never populated and renders as an empty element forever.

**Not covered at all** (no `meta-*` element and no map entry) — **12 tabs**: pricing, ledger, rota, activity, export, team, permissions, branding, integrity, emails, push, legal.

⚠ **`dispatch` is *not* on that list.** `#stab-dispatch` (L1552–L1621) holds **four** populated meta elements — `meta-ops-radius` L1578, `meta-multi-sub` L1590, `meta-phases` L1600, `meta-plan-visibility` L1617 — all four of which are in the map.

**So `8` of 21 settings tabs show a "last updated by" line; `13` do not.** The 11 is the count of *map entries*, not of tabs: four of the eleven entries live inside the single `dispatch` panel. The eight are general, dispatch, cities, gateways, limits, cancelpolicy, notifications, security; and one further tab (reasons) has the markup at L1796 but no wiring.

### 8.2 The complete settings nav **as authored in static markup** — 21 tabs in 3 groups (L1420–1443)

⚠ **This is the parse-time DOM, not what the user sees.** `reorderSettingsTabs()` (L21278–L21313) deletes these three group headers at boot (L21288) and re-emits the same 21 buttons under **six** runtime headers in the order **Daily ops → Money → People & access → Customer comms → Platform → Records** (L21270–L21277). Use the table below to locate markup; do **not** use it to describe the rendered order. See §7.3.

| Group (`data-i18n`) | # | `data-tab` | Icon | Label | Line |
|---|---|---|---|---|---|
| `stabgrp.workspace` (L1420) | 1 | `general` | ⚙️ | General | 1421 |
| | 2 | `team` | 👥 | Team & Roles | 1422 |
| | 3 | `permissions` | 🔐 | Permissions | 1423 |
| `stabgrp.operations` (L1424) | 4 | `dispatch` | 📍 | Matching & Dispatch | 1425 |
| | 5 | `cities` | 🌍 | Cities & Regions | 1426 |
| | 6 | `gateways` | 💳 | Payment Gateways | 1427 |
| | 7 | `limits` | 🚦 | Operational Limits | 1428 |
| | 8 | `cancelpolicy` | 🚫 | Cancellation Policy | 1429 |
| | 9 | `reasons` | 🏷️ | Reason Codes & SLA | 1430 |
| | 10 | `branding` | 🎨 | Branding & logo | 1431 |
| | 11 | `integrity` | 🧮 | Data integrity | 1432 |
| | 12 | `rota` | 📟 | On-call & handover | 1433 |
| | 13 | `ledger` | 📒 | Ledger & money safety | 1434 |
| | 14 | `pricing` | 💰 | Pricing & rate card | 1435 |
| `stabgrp.system` (L1436) | 15 | `notifications` | 🔔 | Alert Preferences | 1437 |
| | 16 | `push` | 📲 | Push Notifications | 1438 |
| | 17 | `emails` | 📧 | Email Log | 1439 |
| | 18 | `security` | 🛡️ | Security | 1440 |
| | 19 | `legal` | 📜 | Legal & Consent | 1441 |
| | 20 | **`activity`** | 🕵️ | **Activity** | **1442** |
| | 21 | `export` | 📤 | Data Export | 1443 |

*(Each of the 21 buttons occupies one line of its own: `branding` L1431, `integrity` L1432, `rota` L1433 — there is no shared or ambiguous line. The ordering above follows the **parse-time** DOM order only; see the ⚠ under the heading for the order the user sees.)*

### 8.3 Preview record fields actually rendered

Of the 10 fields on an audit entry (§8.2 of `16k`), the preview renders **three**: `ts`, `actorName`, `summary` — plus `before`/`after` via `auditDiffHTML`. Not rendered: `id`, `action`, `entityType`, `entityId`. `actorId` is used only as the click argument.

⚠ **The `action` key is never shown in the preview** — the reader sees the human summary but not the machine key, so an unlabelled key (§9 of `16k`) is invisible here in either form.

---

## 9. Activity (in-settings) vs Activity Log (page) — the explicit comparison

| Dimension | `#stab-activity` (this doc) | `#p-audit-log` (see `16k`) |
|---|---|---|
| **Renderer** | **Same function** — `renderAuditLog()` L9322. Two independent `if` blocks in one call: the page branch L9324–9346, the preview branch L9347–9352 | **Same function** |
| **Mount id** | `audit-log-preview` (L2015) | `audit-log` (L2064) |
| **Data source** | `DB.auditLog` — **identical array** | `DB.auditLog` — identical array |
| **Filtering** | **None.** `AUDIT_FILTER_ACTOR` / `AUDIT_FILTER_ACTION` / `AUDIT_SEARCH` are ignored entirely | Actor + action-type + free-text search, all three ANDed (L9328–9336) |
| **Row count** | Hardcoded **4** (L9350) | `AUDIT_PAGE_SIZE` — 20 / 50 / 100 / 200 (L9243) |
| **Pagination** | none | full pager, `auditPagerHTML` L9309–9321 |
| **Columns** | 3 — `compact=true` (L9351) | 4 — `compact=false` (L9344): adds the entity-link column |
| **Entity link** | ❌ suppressed | ✅ `auditEntityLink(e)` L9281 → `rowLink(entityId)` when `resolveId()` resolves |
| **Result count chip** | none | `#audit-count` L2057, `"N action(s) total|match"` |
| **Search box** | none | `#p-audit-log` header, `oninput="onAuditSearchInput(this)"` L2058 |
| **Actor-history modal** | ✅ same handler | ✅ same handler |
| **Diff rendering** | ✅ same `auditDiffHTML` | ✅ same |
| **Refresh triggers** | `go('settings')`, `go('audit-log')`, **every `logAction()`** | identical — the same three |
| **Header/labelling** | "Recent activity" / *"Every configuration change made in Settings, newest first."* ⚠ **inaccurate** | "🕵️ Activity log" / *"Every action taken in this dashboard, newest first"* ✅ accurate |
| **Permission gate** | none | none (`audit-log:view` declared L10650, never enforced) |
| **Export** | none | not from the page itself — `exportAuditLog()` L7623 lives on the **Data Export** tab (**L2031**; L2027 is the `exportRiders()` button) |

**Summary: same renderer, same data, no filters vs three filters, 4 rows vs paginated, 3 columns vs 4.** They cannot diverge in content — only in how much of the same array each shows.

---

## 10. Consumption check

| Item | Read by | Dead? |
|---|---|---|
| `#audit-log-preview` | `renderAuditLog` L9348 only | Alive |
| Preview row cap `4` | L9350 | Hardcoded, not configurable |
| `showActorHistory` | preview rows L9300, full-page rows L9300 (same fn) | Alive |
| `settingsLastUpdated` | `renderSettingsMeta` L7341 only | Alive |
| `renderSettingsMeta` | `go('settings')` L8819; `saveCancellationPolicy` L7384; several other save handlers | Alive |
| **`#meta-reasons`** | nothing — absent from the map (L7340) | ⚠ **Dead element**, L1796 |
| `fitSettingsNavHeight` | `go('settings')` L8819; `window.resize` L7311 | Alive |
| `switchSettingsTab` | 21 tab buttons L1421–1443; `go('settings')` L8819 (`'general'`) | Alive |
| `DB.auditLog` (from this pane) | read-only | Alive |
| Arabic group keys `stabgrp.daily_ops`, `.money`, `.people`, `.comms`, `.platform`, `.records` | `SETTINGS_GROUPS[].i18nKey` L21271–L21276 → `setAttribute('data-i18n', …)` L21296 in `reorderSettingsTabs()` | ✅ **Alive** — these six are the rendered nav's group labels |
| Arabic group key `stabgrp.other` | `reorderSettingsTabs()` L21307, `leftovers` branch only | ⚠ **1 dead i18n key** — the branch cannot fire because `SETTINGS_GROUPS` covers all 21 tabs |

**Nothing in this pane writes any state.** It is purely a read surface plus one navigation button.

---

## 11. Cross-module effects

| Direction | Target | Line | Effect |
|---|---|---|---|
| → | `#p-audit-log` | 2013 | `go('audit-log', findSbEl('audit-log'))` — navigation + sidebar highlight |
| → | modal shell | 9271–9280 | `showActorHistory` writes `#modal-content` and opens `#modal-overlay` |
| ← | `logAction()` | 3149 | Re-renders this preview on **every** audited action panel-wide |
| ← | `go('settings')` | 8819 | `renderAuditLog()` … `renderSettingsMeta()` … `switchSettingsTab('general')` … `fitSettingsNavHeight()` |
| ← | `go('audit-log')` | 8824 | `renderAuditLog()` — also refreshes this hidden preview |
| ← | `DB.auditLog` | 2863 | 8 seeded entries; capped at 500 (L3148) |
| ← | `DB.teamUsers` | 2830 | actor-name resolution in `showActorHistory` |
| ↔ | `AUDIT_*` globals | 9225–9229 | Shared with the full page but **not read** by the preview |
| — | `exportAuditLog()` | 7623 | Exports `DB.auditLog` to CSV — button lives on the **Data Export** tab (**L2031**), not here |
| — | `PAGE_PERMISSIONS['audit-log']` | 10650 | `{label:'Activity Log', icon:'🕵️', legacy:null, perms:[{key:'view',label:'View activity log'}]}` — declared, never enforced |

---

## 12. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| Preview row cap `4` | 9350 | Hardcoded; the comment at L9347 documents it as intentional |
| `compact = true` | 9351 | Hardcoded — drops the entity-link column |
| Empty-state context string `'this session'` | 9351 | Misleading: `DB.auditLog` carries 8 pre-seeded rows dated 20–25 Jun (L2863–2872), which are not "this session" |
| Pane description "Every configuration change made in Settings" | 2012 | **Inaccurate** — the preview is unfiltered |
| Panel icon `🕵️` | 2011 | |
| `fitSettingsNavHeight` bottom gap `12` | 7308 | |
| `fitSettingsNavHeight` floor `120` | 7309 | |
| Nav column inline `width:208px`, `max-height:100vh`, `scrollbar-color:#C7CCD3 transparent` | 1419 | Inline literals, overwritten at runtime |
| Comment "21-tab/6-group list" | 7323 | Actual markup is 21 tabs, **3** groups |

---

## 13. i18n keys

| Key | Element | Line | Arabic present? |
|---|---|---|---|
| `stabgrp.system` | Nav group label above the tab **in static markup only — removed at boot (L21288)** | 1436 | ✅ L7914 `'النظام'` |
| `stabgrp.records` | The group label this tab actually renders under, created at L21293–L21296 | 21276 | ✅ L7916 `'السجلات'` |
| `stab.activity` | Tab button "Activity" | 1442 | ✅ L7921 `'سجل النشاط'` |

**Zero `data-i18n` attributes inside `#stab-activity` (L2008–2017).** The panel title "Recent activity", the description, and the button label "View full activity log →" are English-only. Every string emitted by `auditRowsHTML`, `auditEmptyHTML` and `showActorHistory` is likewise an untranslatable JS literal.

`stab.activity` maps to the **same Arabic string** as `nav.audit-log` (L7910, `'سجل النشاط'`) — the two surfaces are indistinguishable in Arabic.

**Dead i18n keys: one, not seven.** `stabgrp.daily_ops`, `.money`, `.people`, `.comms`, `.platform` and `.records` (L7915–7916) are attached to runtime-created group headers by `SETTINGS_GROUPS` (L21271–L21276) → `setAttribute('data-i18n', g.i18nKey)` (L21296). Only **`stabgrp.other`** (L21307) is dead, and its `leftovers` branch is unreachable. Conversely, the three keys that *do* appear in static markup — `stabgrp.workspace` L1420, `stabgrp.operations` L1424, `stabgrp.system` L1436 — are removed from the DOM at boot (L21288) and never render.

---

## 14. Gaps, dead code, UNVERIFIED items

### Confirmed issues
1. **The pane description is wrong** (L2012). *"Every configuration change made in Settings"* — the preview applies no `entityType==='settings'` filter and shows the newest 4 entries of any kind.
2. **The empty-state text is wrong** (L9351, L9306–9308). It says *"No actions logged yet this session"*, but the array is pre-seeded with 8 dated entries; and the sentence *"Every assignment, approval, or permission change you make will appear here"* enumerates 3 of 161 action kinds.
3. **`#meta-reasons` (L1796) is orphaned** — present in markup, absent from `renderSettingsMeta`'s map (L7340), so it is never populated.
4. **The preview is re-rendered on every `logAction()`** (L3149) even when the Settings page is not open — as is the full-page list and its three custom selects. 220 audited call sites exist.
5. **`switchSettingsTab` renders nothing.** All 21 renderers fire once in `go('settings')` (L8819); switching tabs only toggles classes. A tab opened long after navigation shows stale data — the Activity preview is the exception only because `logAction` keeps it fresh.
6. **`fitSettingsNavHeight` is not re-run on tab switch**, so the nav's computed `maxHeight` goes stale if the content height changes.
7. **`scrollIntoView({block:'nearest'})` (L7329) can scroll `#p-settings` itself**, not just the nav column, because both are scrollable ancestors.
8. **No permission gate** on the "View full activity log" button, and `requirePagePerm('audit-log','view')` is never called anywhere despite the permission being declared (L10650).
9. **The preview drops the `action` key and the entity link**, so an entry whose `summary` is terse is untraceable from here.
10. **`showActorHistory` is unpaginated** (L9273) — up to 500 rows in one modal.
11. **The comment at L7323 says "6-group" and is correct.** The static markup has 3 groups, but `reorderSettingsTabs()` (L21278–L21313) removes those at boot (L21288) and renders **6** (L21270–L21277 → L21296). Six of the seven `stabgrp.*` Arabic keys are consumed there; only `stabgrp.other` is dead. §7.3.
12. **`settingsLastUpdated` silently reverts to "No changes recorded yet"** once an entry falls past the 500-row cap (L3148).

### Dead code / dead markup
| Item | Line | Status |
|---|---|---|
| `#meta-reasons` | 1796 | Element with no map entry |
| `stabgrp.other` | 7916 (emitted L21307) | The only dead Arabic key — the `leftovers` branch never fires |
| `stabgrp.daily_ops` / `.money` / `.people` / `.comms` / `.platform` / `.records` | 7915–7916 (emitted L21296) | **Alive** — the six rendered nav group labels |
| `AUDIT_*` globals, as seen from this pane | 9225–9229 | Present but ignored by the preview branch |
| `auditForEntity()` | 9292–9295 | Used by entity profile pages, **not** by this pane |

### UNVERIFIED
- **Whether the "Settings changes only" description reflects an earlier implementation.** No filtered variant exists in the current source. `UNVERIFIED: no historical version available in the artifact.`
- **Rendering cost of `renderAuditLog()` firing 220× per session-equivalent.** Static analysis only. `UNVERIFIED by execution.`

---

## 15. Line-number index

| Line(s) | What |
|---|---|
| 1419 | `.settings-nav-col` inline styles (`width:208px`, `max-height:100vh`) |
| 1420 / 1424 / 1436 | The 3 **static** nav group labels — all removed at boot (L21288) |
| 21270–21277 / 21278–21313 | `SETTINGS_GROUPS` / `reorderSettingsTabs()` — the 6 group labels actually rendered |
| 1442 | Tab button, `data-i18n="stab.activity"` |
| 1590 / 1600 / 1514 / 1578 / 1617 / 1645 / 1663 / 1700 / 1796 / 1840 / 1921 / 1989 | The 12 `meta-*` elements (11 mapped, `meta-reasons` L1796 orphaned) |
| 2008–2017 | `#stab-activity` pane HTML |
| 2013 | `View full activity log →` button |
| 2015 | `<div id="audit-log-preview">` mount point |
| 2027 | `exportAuditLog()` button (Data Export tab) |
| 2064 | `<div id="audit-log">` — the full page's mount |
| 2863–2872 | `DB.auditLog` — 8 seeded entries |
| 3133–3151 | `logAction()`; **L3148** the 500 cap; **L3149** the unconditional re-render (L3146 is `};`, L3147 is the `unshift`) |
| 3156–3171 | `auditDiffHTML()` |
| 7007 | `findSbEl()` |
| 7297–7311 | `fitSettingsNavHeight()` |
| 7312–7314 | `window.resize` listener |
| 7314–7331 | `switchSettingsTab()` |
| 7335–7338 | `settingsLastUpdated()` |
| 7339–7342 | `renderSettingsMeta()` |
| 7623–7626 | `exportAuditLog()` |
| 7910 / 7915–7916 / 7921 | Arabic keys `nav.audit-log`, the `stabgrp.*` set, `stab.activity` |
| 8819 | `go('settings')` — the full renderer chain |
| 8824 | `go('audit-log')` → `renderAuditLog()` |
| 9225–9229 | `AUDIT_*` globals (ignored by the preview) |
| 9271–9280 | `showActorHistory()` |
| 9296–9305 | `auditRowsHTML()` |
| 9306–9308 | `auditEmptyHTML()` |
| 9322–9353 | `renderAuditLog()` — page branch 9324–9346, **preview branch 9347–9352** |
| 10650 | `PAGE_PERMISSIONS['audit-log']` — declared, never enforced |
