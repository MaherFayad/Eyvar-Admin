# Page: Activity Log (`p-audit-log`)

> **Source file** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page id** `#p-audit-log` — HTML **L2051–2066**
> **Sidebar entry** L540 (`go('audit-log',this)`), section "Config" — last item in the sidebar
> **Render fn** `renderAuditLog()` **L9322–9353** (page branch **L9324–9346**)
> **Module** "Activity log viewer", L9224–9353
> **Writer** `logAction()` **L3133–3151**

---

## 1. Purpose

The panel-wide audit trail: every `logAction()` call in the file, newest first, with actor, human summary, before/after diff and a link to the affected record — filterable by actor, action type and free text, and paginated.

Page header (L2052): `🕵️ Activity log` / *"Every action taken in this dashboard, newest first"*.
Design note at the writer (L3119–3121): *"…is itself a real security event, so it IS audit-logged — distinct from never logging an action that didn't happen."*

---

## 2. Layout map

| Order | Element | Line | Notes |
|---|---|---|---|
| 1 | `.page#p-audit-log` | 2051 | |
| 2 | `.ph > .ph-l` — `<h1>🕵️ Activity log</h1>` + `<p>Every action taken in this dashboard, newest first</p>` | 2052 | |
| 3 | `.card` | 2053 | |
| 4 | `.ch` header — `flex-wrap:wrap; row-gap:8px` | 2054 | |
| 5 | `<h2>All actions</h2>` | 2055 | |
| 6 | Control cluster (`display:flex; gap:8px; flex-wrap:wrap`) | 2056 | |
| 6a | `<span id="audit-count">` — result count | 2057 | 10.5px, ghost, nowrap |
| 6b | Search `<input type="text" placeholder="Search…">` `oninput="onAuditSearchInput(this)"` | 2058 | 29px tall, 120px wide |
| 6c | `<span id="audit-action-filter-wrap">` | 2059 | filled by `renderAuditFilterSelect` |
| 6d | `<span id="audit-filter-wrap">` — actor filter | 2060 | filled by `renderAuditFilterSelect` |
| 6e | `<span id="audit-pagesize-wrap">` | 2061 | filled by `renderAuditFilterSelect` |
| 7 | `<div id="audit-log" style="padding:0">` | 2064 | The list + pager mount |

⚠ **The DOM order of the two filter dropdowns is action-type first, then actor** (L2059 before L2060), even though `renderAuditFilterSelect` builds the actor select first (L9231) — the wrapper ids decide placement.
⚠ `initCardToggles()` (L9368) injects a `▼` collapse control into every `.card > .ch`, including this one — so the whole list can be collapsed.

---

## 3. Settings fields — EVERY field

All four controls are transient view state. **Nothing on this page is persisted to `DB`.**

| id | Label | Control | Default | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|
| *(unnamed)* | placeholder `Search…` | `<input type="text">` (L2058) | empty | free text | none; lower-cased on input (L9263) | **`AUDIT_SEARCH`** (module global, L9227) — not `DB` | Filter predicate §7.3; resets `AUDIT_PAGE=1` (L9264) |
| `audit-action-filter` (wrapper `csel-audit-action`) | none rendered; first option acts as the label | custom select, `extraClass='sm'` (L9239) | `''` → `All action types` | `[{value:'',label:'All action types'}]` + **one option per `Object.keys(ACTION_LABELS)`** → **exactly 27 options** (1 + 26). Full list in §8.1 | none | **`AUDIT_FILTER_ACTION`** (L9226) | Filter predicate; resets `AUDIT_PAGE=1` (L9259) |
| `audit-filter` (wrapper `csel-audit-filter`) | none; first option is the label | custom select, `sm` (L9234) | `''` → `All team members` | `[{value:'',label:'All team members'}]` + one per `DB.teamUsers` → **6 options**: `All team members`, `Sarah Al-Rashid`, `Fahad Al-Dosari`, `Lina Al-Otaibi`, `Noura Al-Fahad`, `Yousef Al-Balawi` (L2831–2841). At 6 options the csel search box does **not** appear (`>6` required, L5343) | none | **`AUDIT_FILTER_ACTOR`** (L9225) | Filter predicate; resets `AUDIT_PAGE=1` |
| `audit-pagesize` (wrapper `csel-audit-pagesize`) | none | custom select, `sm` (L9244) | `'20'` | **exactly 4**: `20 per page`, `50 per page`, `100 per page`, `200 per page` (L9243) | `parseInt(...)||20` (L9250) | **`AUDIT_PAGE_SIZE`** (L9229) | Page size; **always resets `AUDIT_PAGE=1`** — comment L9251: *"changing page size always returns to page 1 — otherwise 'page 24' could point past the new end"* |

### 3a. Hidden view state (no control)
| Global | Default | Line | Set by |
|---|---|---|---|
| `AUDIT_PAGE` | `1` | 9228 | `auditGoToPage(p)` L9267; clamped in `renderAuditLog` L9340–9341 |

### 3b. ⚠ One-shot select construction
`renderAuditFilterSelect()` (L9230–9246) builds each select **only if its `csel-*` id is absent** (`if(w && !document.getElementById('csel-audit-filter'))`). Consequences:
- A team member added at runtime **never appears** in the actor filter.
- The selects survive re-renders (their DOM is outside `#audit-log`), which is why the chosen filter persists across the `innerHTML` rewrite.
- The action filter is likewise frozen to `ACTION_LABELS` as it was on first render — which is static anyway.

---

## 4. Tables & lists

### 4.1 The action table — `auditRowsHTML(pageItems, false)` L9296–9305

Wrapped in `.tbl-scroll`, `<table class="dt">`. `compact === false` on this page, so **4 columns**:

| # | Header | Content | Styling / behaviour |
|---|---|---|---|
| 1 | `Time` | `e.ts` | 11px, `var(--muted)`, `white-space:nowrap`, `vertical-align:top` |
| 2 | `Who` | `e.actorName` | 11.5px, weight 500, nowrap, top-aligned, **`cursor:pointer`, `color:var(--blue)`**, `onclick="showActorHistory('{e.actorId}')"`, `title="View everything {e.actorName} has done"` |
| 3 | `Action` | `e.summary` **+** `auditDiffHTML(e.before, e.after)` | 11.5px. The summary is injected as **raw HTML** — see §13 |
| 4 | *(no header text)* | `auditEntityLink(e)` | right-aligned, top-aligned |

**Row source:** `list.slice((AUDIT_PAGE-1)*AUDIT_PAGE_SIZE, AUDIT_PAGE*AUDIT_PAGE_SIZE)` — L9342.
**Row actions:** the actor cell → actor-history modal; the entity cell → `openProfile(entityId)` when resolvable. The row itself is not clickable.
**Add / edit / delete:** none. The log is append-only from the UI's perspective; there is no delete, no redact, no annotate.
**Empty state:** `auditEmptyHTML(ctx)` L9345 with `ctx = 'matching these filters'` when any filter is active, else `'this session'` → *"No actions logged yet {ctx}. Every assignment, approval, or permission change you make will appear here."*

### 4.2 `auditEntityLink(entry)` — L9281–9285 — the column-4 rule, exactly
```
if (!entry.entityId) return ''                              // empty cell
hit = (typeof resolveId==='function') ? resolveId(entry.entityId) : null
return hit ? rowLink(entry.entityId)
           : '<span style="font-family:monospace;font-size:10.5px;color:var(--muted)">'+entry.entityId+'</span>'
```
`resolveId(raw)` (L3266–3275) upper-cases and trims, then: **(a)** direct key hit in `DB.riders`, `DB.drivers`, `DB.trips`, `DB.subscriptions`, `DB.payments`, `DB.complaints` — in that order; **(b)** failing that, a substring **name** search across `riders` then `drivers`.
`rowLink(id)` (L3283) renders a blue monospace `<span>` with `onclick="openProfile('{id}')"`.

**Consequence:** entity ids outside those six buckets — `settings`/`general`, `USR-3`, `mon:morning:primary`, `HO-0001`, `RC-DRAFT-1`, an idempotency key, a promo code, a ticket id — render as **grey non-clickable monospace text**. Roughly speaking, only rider/driver/trip/subscription/payment/complaint rows are navigable.

⚠ The `(b)` name-search fallback makes `resolveId` non-deterministic for short ids: any `entityId` that happens to be a substring of a rider or driver **name** resolves to that person. E.g. an `entityId` of `AL` would link to the first rider whose name contains "AL".

### 4.3 `auditPagerHTML(totalItems, page, pageSize)` — L9309–9321
```
totalPages = max(1, ceil(totalItems / pageSize))
if (totalPages <= 1) return ''                     // pager hidden entirely
btns = for p in 1..totalPages: <button class="btn sm{ p===page ? ' p' : ''}" style="min-width:28px;padding:0 8px" onclick="auditGoToPage(p)">p</button>
render: [‹ Prev (disabled when page<=1)] [every page button] [Next › (disabled when page>=totalPages)]
container: display:flex; gap:5px; justify-content:center; padding:10px 14px; flex-wrap:wrap
```
⚠ **Every page gets its own button — there is no ellipsis or windowing.** At the 500-entry cap with `20 per page` that is 25 buttons; the `flex-wrap` keeps them on screen but the pager grows linearly with the log.

### 4.4 `#audit-count` — L9337–9338
`list.length + ' action' + (list.length===1 ? '' : 's') + (anyFilterActive ? ' match' : ' total')`
→ e.g. `8 actions total`, `1 action match`.

---

## 5. Actions

| Label / control | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| Search box (`oninput`) | `window.onAuditSearchInput(el)` L9262–9266 | `AUDIT_SEARCH = el.value.toLowerCase()`; `AUDIT_PAGE=1`; `renderAuditLog()` | view state | none | none | no |
| Action-type select | `window.onAuditFilterChange()` L9254–9261 | Reads **both** hidden inputs, sets `AUDIT_FILTER_ACTOR` and `AUDIT_FILTER_ACTION`, `AUDIT_PAGE=1`, `renderAuditLog()` | view state | none | none | no |
| Actor select | `window.onAuditFilterChange()` — **same handler** | as above | view state | none | none | no |
| Page-size select | `window.onAuditPageSizeChange()` L9247–9253 | `AUDIT_PAGE_SIZE = parseInt||20`; `AUDIT_PAGE=1`; `renderAuditLog()` | view state | none | none | no |
| `‹ Prev` / `N` / `Next ›` | `window.auditGoToPage(p)` L9267–9270 | `AUDIT_PAGE = p`; `renderAuditLog()` | view state | none | none | no |
| Actor name in any row | `window.showActorHistory(actorId)` L9271–9280 | Opens the actor-history modal (§6) | none | none | none | no |
| Entity id in column 4 (when resolvable) | `openProfile(entityId)` via `rowLink` L3283 | Navigates to the 360° profile | nav history | none | none | no |
| `▼` collapse (injected) | `initCardToggles` L9368–9385 | Toggles `.clpsd` on the card | none | none | none | no |

**There is no export button on this page.** `exportAuditLog()` (L7623–7626) is reachable only from **Settings → Data Export** (**L2031**; L2027 is the `exportRiders()` button on the same grid).
**There is no clear / purge / redact action** anywhere in the file.

> ⚠ `auditGoToPage(p)` performs **no bounds check of its own**; it relies on `renderAuditLog`'s clamp at L9340–9341. `auditGoToPage(0)` from the console would be corrected to 1 on render.

---

## 6. Modals opened

### `showActorHistory(actorId)` — L9271–9280 — the only modal

| Part | Content |
|---|---|
| **Title** | `{actor.name}'s activity` (typographic apostrophe `’`), falling back to the raw `actorId` when `DB.teamUsers.find()` misses |
| **Close** | `✕` → `closeModal()` |
| **Sub-header** | `{N} action(s) total` + `· {actor.role}` when resolved. 10.5px, uppercase, letter-spacing .3px, weight 600, ghost |
| **Body** | `auditRowsHTML(list, true)` — **compact**, 3 columns, no entity link. `list = DB.auditLog.filter(e => e.actorId===actorId)` (L9273). **Unpaginated and uncapped** |
| **Empty state** | `auditEmptyHTML('for this team member')` |
| **Footer** | `Close` (`btn sm`) → `closeModal()` |

**Fields:** none. **Commit function:** none — read-only.
The `Who` column inside the modal remains clickable and re-invokes `showActorHistory` for the same actor, re-rendering the modal in place.
The modal ignores `AUDIT_SEARCH`, `AUDIT_FILTER_ACTION` and pagination entirely.

---

## 7. Rules / policy logic — written out exactly

### 7.1 `logAction(actionKey, entityType, entityId, summary, before, after)` — L3133–3151, verbatim
```js
var actor = DB.teamUsers.find(u => u.id===CURRENT_USER_ID);
var entry = {
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
};
DB.auditLog.unshift(entry);
if (DB.auditLog.length > 500) DB.auditLog.length = 500;      // hard truncate from the tail
if (typeof renderAuditLog === 'function') renderAuditLog();
return entry;
```
**Five rules, exhaustively:** newest-first insert; 500-entry hard cap with silent tail loss; `before`/`after` normalised to `null` when falsy; actor resolved at write time (so a later rename does not propagate); the audit view re-renders on **every** write.

### 7.2 `auditDiffHTML(before, after)` — L3156–3171 — the COMPLETE diff rules
```js
if (!after) return '';                                        // RULE 1: no `after` → nothing
var parts = [];
if (!before) {                                                // RULE 2: creation
  Object.keys(after).forEach(k => parts.push(k + ': ' + after[k]));
  if (!parts.length) return '';
  return '<div class="aud-diff">' + parts.join(' · ') + '</div>';
}
Object.keys(after).forEach(function(k){                        // RULE 3: change
  var hadField = Object.prototype.hasOwnProperty.call(before, k);
  if (!hadField)                 parts.push(k + ': ' + after[k]);
  else if (before[k] !== after[k]) parts.push(k + ': <s>' + before[k] + '</s> → ' + after[k]);
});
if (!parts.length) return '';                                 // RULE 4: no actual change → nothing
return '<div class="aud-diff">' + parts.join(' · ') + '</div>';
```
Comment (L3152–3155): *"Renders a compact 'field: old → new' line under a log row. Handles three shapes: creation (before=null, just lists the starting fields), a normal change (only fields that actually differ are shown — no noise from fields that happened not to change), and nothing (returns '')."*

**Exhaustive rule list:**
1. `after` falsy → `''`.
2. `before` falsy, `after` truthy → list **every** key of `after` as `k: v`, joined by ` · `.
3. Both present → iterate **`after`'s keys only**:
   - key absent from `before` → `k: newValue`
   - key present and `before[k] !== after[k]` (strict, no deep compare) → `k: <s>old</s> → new`
   - key present and equal → **omitted**
4. Nothing to show → `''` (no empty `<div>`).

**Styling:** `.aud-diff { font-size:10px; color:var(--ghost); margin-top:2px }` (L324); `.aud-diff s { color:var(--red); opacity:.75; text-decoration:line-through }` (L325).

**Limitations, all verified:**
- **Deleted keys are invisible.** A key present in `before` and absent from `after` is never iterated → a removal renders nothing.
- **Strict `!==` on objects/arrays always differs.** Callers that pass whole arrays (e.g. `saveCancellationPolicy` L7383 passes `DB.cancellationPolicy` before/after; `saveOpsLimits` L7441; **`saveRideTypes` L12385** — declared L12375; `grep -c commitSurgeSchedule` → **0**, that identifier does not exist) produce `[object Object]`-style output because values are string-concatenated, not serialised. **`saveCancellationPolicy` in particular passes `before` as a deep clone and `after` as the *same live array*, so `before[k] !== after[k]` compares two different array objects and every index renders as changed.**
- **Values are interpolated raw** — no escaping, no `toFixed`, no date formatting.
- **No nesting.** A nested object renders as `[object Object]`.

### 7.3 The page filter predicate — L9328–9336, exactly
```js
DB.auditLog.filter(function(e){
  if (AUDIT_FILTER_ACTOR  && e.actorId !== AUDIT_FILTER_ACTOR)  return false;
  if (AUDIT_FILTER_ACTION && e.action  !== AUDIT_FILTER_ACTION) return false;
  if (AUDIT_SEARCH) {
    var hay = (e.summary + ' ' + e.actorName + ' ' + (e.entityId||'') + ' ' + e.id).toLowerCase();
    if (hay.indexOf(AUDIT_SEARCH) < 0) return false;
  }
  return true;
});
```
**Three predicates, ANDed.** Enumerated:
| Filter | Predicate | Match type | Searched fields |
|---|---|---|---|
| Actor | `e.actorId === AUDIT_FILTER_ACTOR` | exact | `actorId` |
| Action type | `e.action === AUDIT_FILTER_ACTION` | exact | `action` |
| Free text | `hay.indexOf(AUDIT_SEARCH) >= 0` | case-insensitive substring | `summary`, `actorName`, `entityId`, `id` |

⚠ **`entityType`, `action`, `before` and `after` are NOT searched.** Typing an action key such as `config_updated` into the search box returns nothing unless it also appears in a summary — the only way to filter by action is the dropdown, which offers 26 of 161 keys (§9).

### 7.4 Pagination — L9339–9345
```
totalPages = max(1, ceil(list.length / AUDIT_PAGE_SIZE))
if (AUDIT_PAGE > totalPages) AUDIT_PAGE = totalPages       // clamp high
if (AUDIT_PAGE < 1)          AUDIT_PAGE = 1                // clamp low
pageItems = list.slice((AUDIT_PAGE-1)*AUDIT_PAGE_SIZE, AUDIT_PAGE*AUDIT_PAGE_SIZE)
el.innerHTML = list.length ? auditRowsHTML(pageItems,false) + auditPagerHTML(list.length, AUDIT_PAGE, AUDIT_PAGE_SIZE)
                           : auditEmptyHTML(anyFilter ? 'matching these filters' : 'this session')
```
The clamp is applied to the **global** so the correction persists to the next render. Every filter change resets to page 1 explicitly (L9250, L9259, L9264).

### 7.5 `auditForEntity(entityId, limit)` — L9292–9295 — used by other pages, not this one
```js
if (!entityId) return [];
return DB.auditLog.filter(e => e.entityId===entityId).slice(0, limit||5);
```
Comment (L9286–9291): *"Recent-activity mini-lists on entity pages (e.g. a subscription profile) use this — exact entityId match only. It deliberately does not also try to fuzzy-match via rider identity the way the trip log does, since that would pull in trip-level driver assignments (keyed by UST id, not the subscription id) and risk the same unreliable-tag problem noted in commitDriverChange; an exact match stays honest about what it shows."*

### 7.6 `exportAuditLog()` — L7623–7626 (Data Export tab)
```js
rows = DB.auditLog.map(e => ({ id, time:e.ts, actor:e.actorName, action:e.action,
                               entityType:e.entityType, entityId:e.entityId, summary:e.summary }));
downloadCSV('eyvar_audit_log.csv', toCSV(rows, ['id','time','actor','action','entityType','entityId','summary']));
```
**7 of the 10 fields.** `actorId`, `before` and `after` are **dropped** — the CSV export loses every diff. It also ignores the active filters (exports everything) and, unlike `doExport()` (L9204), does **not** call `logAction('export_data',…)` — so this particular export is not itself audited. (`exportAuditLog` is invoked from **L2031** with a live count from `renderExportCounts`.)

---

## 8. Full enumerations

### 8.1 `ACTION_LABELS` — the COMPLETE map (L2898–2909) — 26 keys

| # | Action key | Label | Call sites | Line(s) |
|---|---|---|---|---|
| 1 | `assign_driver` | Assign driver | 2 | 8493, 10294 |
| 2 | `change_driver` | Change driver | 1 | 5869 |
| 3 | `create_subscription` | Create subscription | 1 | 5109 |
| 4 | `freeze_subscription` | Freeze subscription | 1 | 5514 |
| 5 | `cancel_subscription` | Cancel subscription | 1 | 5560 |
| 6 | `edit_team_user` | Edit team member | 1 | 10498 |
| 7 | `invite_team_user` | Invite team member | 1 | 10541 |
| 8 | `toggle_role_permission` | Role permission change | 1 | 10797 |
| 9 | `edit_user_permissions` | Edit user permissions | 1 | 10831 |
| 10 | `approve_driver` | Approve driver | 1 | 11118 |
| 11 | `reject_driver` | Reject driver | 1 | 11131 |
| 12 | `reconsider_applicant` | Reconsider applicant | 1 | 10915 |
| 13 | `reassign_driver` | Reassign driver | 2 | 11801, 13128 |
| 14 | `process_all_payouts` | Process all payouts | 1 | 7055 |
| 15 | `release_escrow` | Release escrow | 1 | 7069 |
| 16 | `apply_deduction` | Apply deduction | 1 | 7082 |
| 17 | `pay_driver` | Pay driver | 1 | 7034 |
| 18 | `reject_document` | Reject document | 1 | 10879 |
| 19 | `cancel_live_trip` | Cancel live trip | 1 | 11846 |
| 20 | `manual_assign` | Manual assign | 1 | 11902 |
| 21 | `cancel_ride_request` | Cancel ride request | 1 | 11924 |
| 22 | `activate_plan` | Activate plan | 1 | 5963 |
| 23 | `deactivate_plan` | Deactivate plan | 1 | 5984 |
| 24 | `permission_denied` | Permission denied (blocked) | 2 | 3129, 10686 |
| 25 | `switch_user` | Switched acting user | 1 | 3105 |
| 26 | `export_data` | Exported data | 3 | 7604, 7653, 9215 |

**Total labelled call sites: 31 of 220.**
There is **no `DB.actionLabels`** in the file — grep returns zero hits. `ACTION_LABELS` is a plain module-level `var` at L2898, declared inside the plans/data block immediately after `DB.plans` and `currentPlanKey` (L2896–2897), which is an odd home for it but functionally irrelevant.

### 8.2 Audit record shape — EVERY field (L3135–3145)

| Field | Type | Value | Rendered on this page? | In the CSV export? |
|---|---|---|---|---|
| `id` | string | `'AUD-' + String(DB.auditLog.length+1).padStart(4,'0')` | ❌ (searchable only) | ✅ |
| `ts` | string | `new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})` → e.g. `09:14:23 AM` — **time only, no date** | ✅ col 1 | ✅ as `time` |
| `actorId` | string | `CURRENT_USER_ID` | ❌ (used as the click argument) | ❌ **dropped** |
| `actorName` | string | resolved name, or the raw id when unresolvable | ✅ col 2 | ✅ as `actor` |
| `action` | string | the raw key — **the label is never applied to a row** | ❌ | ✅ |
| `entityType` | string | free-form; see §8.3 | ❌ | ✅ |
| `entityId` | string | free-form | ✅ col 4 (via `auditEntityLink`) | ✅ |
| `summary` | string | human sentence, **injected as raw HTML** | ✅ col 3 | ✅ |
| `before` | object\|null | `before \|\| null` | ✅ via `auditDiffHTML` | ❌ **dropped** |
| `after` | object\|null | `after \|\| null` | ✅ via `auditDiffHTML` | ❌ **dropped** |

⚠ **`ts` carries no date.** The 8 seeded rows use a different, incompatible format that *does* include a date — `'25 Jun, 08:14 AM'`, `'24 Jun, 04:45 PM'`, etc. (L2864–2871). Runtime entries are `'09:14:23 AM'`. The Time column therefore mixes two formats, and once the log runs past a day boundary a runtime entry cannot be dated at all.

⚠ **`id` is length-derived and collides.** `'AUD-'+(DB.auditLog.length+1)` (L3136) with a hard cap at 500 (**L3148**): once the array is full, `length` stays 500 and **every subsequent entry is `AUD-0501`**. Ids are not unique, and searching `AUD-0501` matches an unbounded number of rows.

### 8.3 `entityType` values observed (free-form, no enum)
`settings`, `plan`, `trip`, `driver`, `rider`, `team_user`, `permission`, `finance`, `ticket`, `report`, `money`, `pricing`, `ownership`, `quickrides`, `corporate`, `incentive`, `promo`, `legal`, `subscription`, `case` — plus others. **No constant defines the allowed set and nothing validates it**, and `entityType` is neither filterable nor searchable on this page (it is used only by `settingsLastUpdated`, L7336, which filters on `entityType==='settings'`).

### 8.4 Seeded audit entries (L2863–2872) — 8 rows

| id | ts | actor | action | entityType / entityId | before → after |
|---|---|---|---|---|---|
| `AUD-0008` | `25 Jun, 08:14 AM` | Sarah Al-Rashid (USR-1) | `assign_driver` | `trip` / `UST-1` | `{driver:'—'}` → `{driver:'Ahmed Salem', distance:'1.9 km'}` |
| `AUD-0007` | `24 Jun, 04:45 PM` | Fahad Al-Dosari (USR-2) | `apply_deduction` | `driver` / `DRV-0103` | `{status:'pending'}` → `{status:'applied', amount:'20.00 SAR'}` |
| `AUD-0006` | `23 Jun, 09:30 AM` | Sarah Al-Rashid | `invite_team_user` | `team_user` / `USR-4` | `null` → `{name,email,role,status}` |
| `AUD-0005` | `22 Jun, 06:15 PM` | Fahad Al-Dosari | `process_all_payouts` | `finance` / `''` | `{pendingTotal:'8,200.00 SAR'}` → `{pendingTotal:'0.00 SAR', driversProcessed:3}` |
| `AUD-0004` | `22 Jun, 05:50 PM` | Fahad Al-Dosari | `release_escrow` | `driver` / `DRV-0101` | `{escrowStatus:'held (ESC-1035)'}` → `{escrowStatus:'released', addedToPending:'86.50 SAR'}` |
| `AUD-0003` | `21 Jun, 02:15 PM` | Sarah Al-Rashid | `approve_driver` | `driver` / `DRV-0138` | `{status:'pending'}` → `{status:'approved', driverId:'DRV-0138'}` |
| `AUD-0002` | `21 Jun, 11:00 AM` | Sarah Al-Rashid | `edit_user_permissions` | `team_user` / `USR-3` | `{permissions:'0 permissions'}` → `{permissions:'3 permissions'}` |
| `AUD-0001` | `20 Jun, 03:40 PM` | Fahad Al-Dosari | `pay_driver` | `driver` / `DRV-0101` | `{pending:'2,200.00 SAR'}` → `{pending:'0.00 SAR', paidOut:'2,200.00 SAR'}` |

All 8 seeds use **labelled** keys — which is why the label gap is invisible on a fresh load and only appears once real actions accumulate. Note `AUD-0005` has `entityId:''`, so its column 4 is empty (L9282).

### 8.5 Page-size options (L9243)
`[20, 50, 100, 200]` → labels `20 per page`, `50 per page`, `100 per page`, `200 per page`. Default `'20'`. With the 500-entry cap, `200 per page` yields at most 3 pages.

---

## 9. THE CROSS-CHECK — `logAction` keys absent from `ACTION_LABELS`

**Method:** extracted every literal `logAction('<key>'` occurrence across all 21857 lines and diffed against `Object.keys(ACTION_LABELS)`.

### 9.1 Headline numbers

| Measure | Count |
|---|---|
| `logAction(` call sites with a literal key | **220** |
| Distinct action keys used | **161** |
| Keys defined in `ACTION_LABELS` | **26** |
| **Keys used with NO label** | **135** |
| Call sites using an unlabelled key | **189 (86%)** |
| Labels defined but never used | **0** |

**The brief's three flagged keys are confirmed:** `save_plan` (L6146), `archive_plan` (L6172), `toggle_vehicle_active` (L6114) — all missing. **132 further unlabelled keys were found.**

### 9.2 Impact
The action-type dropdown is built as `Object.keys(ACTION_LABELS)` (L9238). It therefore offers **26 of 161** action types. The remaining 135 — including `config_updated`, which alone accounts for **40 call sites**, more than the entire labelled set — **cannot be filtered for at all**, and free-text search does not cover the `action` field (§7.3). Roughly 86% of all audited activity is unreachable through the page's only structured filter.

### 9.3 COMPLETE list of the 135 unlabelled keys

| # | Key | Sites | Line(s) |
|---|---|---|---|
| 1 | `absence_decayed` | 1 | 16758 |
| 2 | `absence_waived` | 1 | 16821 |
| 3 | `account_flagged` | 1 | 9035 |
| 4 | `account_reinstated` | 2 | 9105, 15626 |
| 5 | `account_suspended` | 1 | 9091 |
| 6 | `account_unflagged` | 1 | 9048 |
| 7 | `add_reason_code` | 1 | 15122 |
| 8 | `add_stop` | 1 | 11706 |
| 9 | **`archive_plan`** | 1 | 6172 |
| 10 | `assign_backup` | 1 | 13222 |
| 11 | `auto_renew_toggle` | 2 | 5452, 5479 |
| 12 | `auto_suspend` | 1 | 13308 |
| 13 | `backup_offer_accepted` | 1 | 18191 |
| 14 | `backup_offer_declined` | 1 | 18194 |
| 15 | `backup_offer_expired` | 1 | 18165 |
| 16 | `backup_offer_sent` | 1 | 18181 |
| 17 | `billing_history_fetched` | 1 | 20478 |
| 18 | `bulk_message` | 1 | 13756 |
| 19 | `bulk_ticket_status` | 1 | 16169 |
| 20 | `call_wrapped` | 1 | 20314 |
| 21 | `case_closed` | 1 | 18993 |
| 22 | `cash_approved` | 1 | 12182 |
| 23 | `cash_debt_repaid` | 1 | 12208 |
| 24 | `cash_escalated` | 1 | 12178 |
| 25 | `change_password` | 1 | 3044 |
| 26 | `claim_expired` | 1 | 18870 |
| 27 | `claim_released` | 1 | 18902 |
| 28 | `claim_taken` | 1 | 18885 |
| 29 | `claim_taken_over` | 1 | 18882 |
| 30 | `close_incident` | 1 | 13483 |
| 31 | `comp_blocked` | 1 | 3988 |
| 32 | `complaint_resolved` | 1 | 4382 |
| 33 | **`config_updated`** | **40** | 3851, 3903, 6647, 6665, 6720, 6747, 6757, 7383, 7414, 7426, 7441, 7482, 7491, 7502, 7510, 7701, 7743, 7810, 7882, 7893, 7999, 8014, 8029, 8068, 8082, 8103, 8111, 8117, 8133, 9134, 9144, 12309, 12317, 12330, 12338, 12363, 12371, 12385, 13719, 13727 |
| 34 | `contact_logged` | 1 | 16239 |
| 35 | `corp_approval_declined` | 2 | 4904, 9997 |
| 36 | `corp_approval_granted` | 2 | 4889, 9985 |
| 37 | `corp_invoice_sent` | 1 | 6710 |
| 38 | `corp_policy_violation` | 1 | 12438 |
| 39 | `create_corporate_account` | 1 | 6527 |
| 40 | `create_promo` | 1 | 13559 |
| 41 | `create_ride_request` | 1 | 2491 |
| 42 | `credit_note_issued` | 1 | 15884 |
| 43 | `doc_renewed` | 1 | 13379 |
| 44 | `driver_accepted` | 1 | 12488 |
| 45 | `driver_bonus_awarded` | 1 | 13709 |
| 46 | `driver_flagged` | 1 | 12004 |
| 47 | `duplicate_suppressed` | 1 | 19898 |
| 48 | `edit_branding` | 2 | 18451, 18456 |
| 49 | `edit_commit_policy` | 1 | 17126 |
| 50 | `edit_comp_policy` | 1 | 15492 |
| 51 | `edit_data_window` | 1 | 20518 |
| 52 | `edit_oncall` | 1 | 15803 |
| 53 | `edit_reason_codes` | 1 | 15108 |
| 54 | `edit_sla_policy` | 1 | 15150 |
| 55 | `emergency_claim_filed` | 1 | 16804 |
| 56 | `emergency_dispatch_accepted` | 1 | 17346 |
| 57 | `emergency_dispatch_opened` | 1 | 17288 |
| 58 | `erasure_executed` | 1 | 16030 |
| 59 | `erasure_rejected` | 1 | 16041 |
| 60 | `erasure_requested` | 1 | 16010 |
| 61 | `fairness_case_opened` | 1 | 15518 |
| 62 | `fairness_decision` | 1 | 15629 |
| 63 | `history_rebuilt` | 1 | 18604 |
| 64 | `impersonation_ended` | 1 | 21084 |
| 65 | `impersonation_started` | 1 | 21072 |
| 66 | `incident_step` | 2 | 13455, 13459 |
| 67 | `late_pickup_logged` | 1 | 16681 |
| 68 | `ledger_rejected` | 1 | 19925 |
| 69 | `legal_version_published` | 1 | 3840 |
| 70 | `log_out_session` | 1 | 3062 |
| 71 | `lost_found` | 1 | 14474 |
| 72 | `mass_event_declared` | 1 | 16133 |
| 73 | `offer_declined` | 1 | 12008 |
| 74 | `offer_sent` | 1 | 11993 |
| 75 | `ops_chat_sent` | 1 | 11748 |
| 76 | `pause_promo` | 1 | 13529 |
| 77 | `payment_captured` | 1 | 9613 |
| 78 | `payment_hold_released` | 1 | 9603 |
| 79 | `plan_access_restored` | 1 | 19484 |
| 80 | `plan_access_terminated` | 1 | 16709 |
| 81 | `plan_earnings_forfeited` | 1 | 16699 |
| 82 | `plan_leg_confirmed` | 2 | 16590, 18210 |
| 83 | `plan_leg_handed_off` | 1 | 16597 |
| 84 | `plan_terms_accepted` | 1 | 17136 |
| 85 | `postpone_trip` | 1 | 8653 |
| 86 | `precaution_suspend` | 1 | 13472 |
| 87 | `priority_call` | 1 | 9163 |
| 88 | `promote_backup` | 1 | 13232 |
| 89 | `rate_card_approved` | 1 | 21598 |
| 90 | `rate_card_proposed` | 1 | 21562 |
| 91 | `rate_card_self_approval_blocked` | 1 | 21587 |
| 92 | `rating_voided` | 1 | 15619 |
| 93 | `receipt_sent` | 1 | 4221 |
| 94 | `recruitment_queued` | 1 | 13998 |
| 95 | `referral_processed` | 1 | 3872 |
| 96 | `renewal_approval_requested` | 1 | 11412 |
| 97 | `reopen_request` | 1 | 10309 |
| 98 | `resolve_dispute` | 1 | 14443 |
| 99 | `resume_promo` | 1 | 13530 |
| 100 | `retention_action` | 2 | 7002, 14275 |
| 101 | `ride_state_resync` | 1 | 16432 |
| 102 | `rota_updated` | 1 | 19674 |
| 103 | `save_doc_expiry` | 1 | 11044 |
| 104 | **`save_plan`** | 1 | 6146 |
| 105 | `script_step` | 1 | 19446 |
| 106 | `session_started` | 1 | 21331 |
| 107 | `settle_subscription` | 1 | 3692 |
| 108 | `shift_handover` | 1 | 19727 |
| 109 | `sla_breach` | 2 | 12549, 14947 |
| 110 | `steer_offer` | 1 | 14031 |
| 111 | `steer_offer_closed` | 1 | 14183 |
| 112 | `sub_request_timeout` | 1 | 9689 |
| 113 | `sub_start_confirmed` | 2 | 4764, 4836 |
| 114 | `sub_start_deferred` | 2 | 4756, 4845 |
| 115 | `sub_start_pending` | 1 | 4776 |
| 116 | `surge_suspended` | 1 | 21538 |
| 117 | `ticket_assigned` | 1 | 16179 |
| 118 | `ticket_closed` | 1 | 2405 |
| 119 | `ticket_reason_changed` | 2 | 14908, 16202 |
| 120 | `ticket_reopened` | 1 | 2414 |
| 121 | `tier_change` | 2 | 13616, 13654 |
| 122 | `toggle_2fa` | 1 | 3051 |
| 123 | `toggle_page_permission` | 1 | 10703 |
| 124 | **`toggle_vehicle_active`** | 1 | 6114 |
| 125 | `trip_completed` | 1 | 12465 |
| 126 | `trip_flagged` | 1 | 4229 |
| 127 | `trip_tip` | 1 | 12450 |
| 128 | `trip_tip_edited` | 1 | 4211 |
| 129 | `trip_unflagged` | 1 | 4239 |
| 130 | `update_doc_dates` | 1 | 11077 |
| 131 | `update_profile` | 1 | 2983 |
| 132 | `update_profile_photo` | 2 | 2958, 2970 |
| 133 | `wallet_credit` | 1 | 3938 |
| 134 | `wallet_debit` | 2 | 3948, 11840 |
| 135 | `welcome_offer_sent` | 1 | 11182 |

### 9.4 Notable clusters among the unlabelled
- **Security / identity (7):** `change_password` (3044), `toggle_2fa` (3051), `log_out_session` (3062), `impersonation_started` (21072), `impersonation_ended` (21084), `session_started` (21331), `toggle_page_permission` (10703). Every one is a security event, and none can be filtered for.
- **Money (13):** `wallet_credit`, `wallet_debit` ×2, `payment_captured`, `payment_hold_released`, `credit_note_issued`, `settle_subscription`, `cash_approved`, `cash_debt_repaid`, `cash_escalated`, `duplicate_suppressed`, `ledger_rejected`, `comp_blocked`, `driver_bonus_awarded`.
- **Privacy / GDPR (3):** `erasure_requested`, `erasure_rejected`, `erasure_executed`.
- **Configuration (1 key, 40 sites):** `config_updated` — the panel's single most frequent audit key, covering general settings, cities, gateways, limits, cancellation policy, search phases, plan visibility, surge windows, ride types, corporate policy, incentives and more. Because the *key* is shared, even a hypothetical label would not distinguish "changed the surge cap" from "changed the support email"; the discriminator lives only in the free-text `summary` and in `entityId` — the latter is searchable, the former is the only readable signal.

### 9.5 Also verified
- **No label is orphaned** — every one of the 26 defined labels has at least one call site.
- **No dynamic (non-literal) `logAction` key exists.** Grepping `logAction(` for calls whose first argument is not a string literal returns only the definition (L3133) and one prose comment (L2855).
- **`ACTION_LABELS` is used in exactly one place** — the filter dropdown (L9238). It is never used to render a row, a tooltip, an export column, or the actor-history modal.

---

## 10. Consumption check

| Item | Read by | Dead? |
|---|---|---|
| `DB.auditLog` | `renderAuditLog` L9328/9350, `showActorHistory` L9273, `auditForEntity` L9294, `settingsLastUpdated` L7336, `exportAuditLog` L7624, `renderExportCounts` (count for L2031) | **Heavily alive** |
| `ACTION_LABELS` | `renderAuditFilterSelect` L9238 **only** | Alive, but only 26/161 coverage |
| `AUDIT_FILTER_ACTOR` / `_ACTION` / `AUDIT_SEARCH` / `AUDIT_PAGE` / `AUDIT_PAGE_SIZE` | `renderAuditLog` L9328–9342 | Alive (page branch only — the Settings preview ignores all five) |
| `entry.actorId` | `showActorHistory` argument L9300; filter predicate L9329 | Alive |
| `entry.action` | filter predicate L9330 only | ⚠ **Never displayed and never searched** |
| `entry.entityType` | `settingsLastUpdated` L7336; CSV export | ⚠ Not displayed, not filterable, not searchable on this page |
| `entry.id` | search haystack L9332; CSV export | Not displayed |
| `entry.before` / `.after` | `auditDiffHTML` L9301 | Alive on screen; **dropped from the CSV** |
| `auditForEntity()` | entity profile pages (e.g. subscription 360°, L4360 area) | Alive, external to this page |
| `PAGE_PERMISSIONS['audit-log']` `{key:'view'}` | L10650 declaration; `defaultPagePerms` L10666; the permissions matrix UI L10718+ | ⚠ **Declared and grantable but never enforced** — `requirePagePerm('audit-log','view')` has zero call sites |
| `auditEmptyHTML` | L9345, L9351, L9277 | Alive |
| `auditPagerHTML` | L9344 only | Alive |

---

## 11. Cross-module effects

| Direction | Target | Line | Effect |
|---|---|---|---|
| ← | **Every audited action in the panel** | 220 call sites | `logAction` writes and forces a full `renderAuditLog()` |
| ← | `requirePerm()` | 3129 | A permission denial is itself logged (`permission_denied`) |
| ← | `requirePagePerm()` | 10686 | Same, granular variant |
| ← | `switchUser()` | 3105 | `switch_user` |
| ← | `go('audit-log')` | 8824 | `renderAuditLog()` |
| ← | `go('settings')` | 8819 | `renderAuditLog()` (also refreshes this page's list while hidden) |
| → | `#audit-log-preview` | 9348 | The Settings Activity tab (see `16j`) |
| → | `openProfile(entityId)` | 3283 via 9284 | Column-4 navigation into the 360° profile |
| → | Modal shell | 9276–9279 | `showActorHistory` |
| → | `settingsLastUpdated` | 7336 | "Last updated by X" lines on 11 settings sections |
| → | `auditForEntity` | 9294 | Recent-activity mini-lists on entity pages |
| → | `exportAuditLog` | 7623 | Settings → Data Export → `eyvar_audit_log.csv` |
| — | `titles['audit-log']` | 2168 | `'Activity log'` |
| — | `subs['audit-log']` | 2169 | `'Every action taken in this dashboard, newest first'` |
| — | Sidebar item | 540 | `data-i18n="nav.audit-log"` |
| — | Contextual menu | 16883 | `['🗂 Activity log','go(\'audit-log\',null)']` |
| — | Subscription profile | 4360 | `View full log →` when the sub has activity |

---

## 12. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| 8 seeded audit entries | 2863–2872 | Demo data with a **different `ts` format** than runtime entries |
| `ACTION_LABELS` (26 entries) | 2898–2909 | Hardcoded `var`, not on `DB`, not extensible at runtime |
| 500-entry cap | 3146 | Silent tail truncation |
| `'AUD-'` pad width 4 | **3136** | Overflows past 9999 and collides at the cap |
| Page-size options `[20,50,100,200]` | 9244 | |
| Default page size `20` | 9229 | |
| Fallback page size `20` | 9250 | |
| Search input width `120px`, height `29px` | 2058 | Inline literals |
| `min-width:28px; padding:0 8px` on pager buttons | 9314 | |
| `.aud-diff` 10px ghost, `<s>` red @ .75 opacity | 324–325 | |
| Empty-state copy naming only 3 action kinds | 9307 | *"Every assignment, approval, or permission change…"* — 161 kinds exist |
| CSV filename `eyvar_audit_log.csv` | 7625 | |
| `resolveId` bucket list (6 buckets) | 3270 | Hardcoded |

---

## 13. i18n keys

| Key | Element | Line | Arabic present? |
|---|---|---|---|
| `nav.audit-log` | Sidebar item label "Activity log" | 540 | ✅ L7910 `'سجل النشاط'` |
| `sec.config` | Sidebar section label above it | (sidebar) | ✅ L7913 `'الإعدادات'` |

**Zero `data-i18n` attributes inside `#p-audit-log` (L2051–2066).** Untranslatable: the `<h1>`, the sub-line, `All actions`, the `Search…` placeholder, `All team members`, `All action types`, `N per page`, all 26 action labels, `Time` / `Who` / `Action` headers, the empty-state sentence, `‹ Prev` / `Next ›`, the actor-history modal title/sub-header/`Close`, the "N action(s) total|match" chip, and **every one of the 220 `summary` strings** — which are composed in JS at the call site.

`titles` (L2168) and `subs` (L2169) also carry English-only strings for this page, applied by `go()` to the top bar.

---

## 14. Gaps, dead code, UNVERIFIED items

### Confirmed issues
1. **135 of 161 action keys have no label** (§9). The action-type filter reaches 26 keys / 31 call sites out of 220 — **14% of audited activity**. `config_updated` alone (40 sites) is unfilterable.
2. **`entry.action` is never displayed.** The raw key appears in no column and no tooltip; `ACTION_LABELS` is used only to populate the dropdown (L9238). A reader cannot see what kind of action a row was except by reading the summary prose.
3. **Free-text search does not cover `action` or `entityType`** (**L9332**). The haystack is `summary + actorName + entityId + id`.
4. **`AUD-####` ids collide at the cap.** `'AUD-'+(length+1)` with `length` pinned at 500 (**L3148**) means every entry past the 500th is `AUD-0501`.
5. **`ts` has no date** (**L3137**), and the 8 seeds use a *different, dated* format (L2864–2871). The Time column mixes `25 Jun, 08:14 AM` and `09:14:23 AM`.
6. **The 500-entry cap silently destroys history** with no warning, no indicator, and no export prompt. `settingsLastUpdated` (L7336) reverts to *"No changes recorded yet"* when a section's entry ages out.
7. **`summary` is injected as raw HTML** (L9301) and is composed from user-supplied values at many call sites (rider names, ticket subjects, free-text reasons — e.g. `suspendSurge`'s `reason` L21539, `commitHandover`'s implicit names, `openSuspendSurge`'s `ss-reason`). **No escaping is applied anywhere in `auditRowsHTML`, `auditDiffHTML` or `auditEntityLink`.** Stored-XSS shaped.
8. **`auditDiffHTML` cannot show deletions** — it iterates `Object.keys(after)` only (L3164), so a key removed between `before` and `after` renders nothing.
9. **Array/object payloads render as `[object Object]`.** Several callers pass whole arrays (`saveCancellationPolicy` L7383, `saveOpsLimits` L7441, **`saveRideTypes` L12385** — `saveSurgeSchedule` is a real function but sits at **L12321**, not L12385 — and **`saveSearchPhases` L8117**, declared L8115; `grep -c commitSearchPhases` → **0**). Worse, `saveCancellationPolicy` passes a deep clone as `before` and the **same live array** as `after`, so identity comparison marks every element changed.
10. **The CSV export drops `before`, `after` and `actorId`** (L7624) — the diff, the strongest evidence in the log, is unexportable.
11. **`exportAuditLog()` is not itself audited** (L7623–7626), unlike `doExport()` which logs `export_data` (L9215). Pulling the whole audit trail leaves no trace.
12. **`exportAuditLog()` ignores the active filters** — it always exports the full array.
13. **No permission gate on the page.** `PAGE_PERMISSIONS['audit-log'].perms=[{key:'view'}]` (L10650) is declared, defaulted (`legacy:null` → always unlocked, L10664–10666) and shown in the permissions matrix, but `requirePagePerm('audit-log','view')` has **zero call sites**. Any user can read the full log.
14. **The pager renders one button per page with no windowing** (L9313–9317).
15. **The filter dropdowns are built once and never rebuilt** (L9232, L9237, L9242) — a runtime-added team member is unfilterable.
16. **`resolveId`'s name-substring fallback** (**L3273**; L3272 is its comment) makes `auditEntityLink` non-deterministic for short entity ids.
17. **`renderAuditLog()` runs on every `logAction()`** (**L3149**), rebuilding the whole table, the pager and the preview even when neither surface is visible.
18. **`showActorHistory` is unpaginated** (L9273) — up to 500 rows in one modal.
19. **The empty-state copy is misleading** (L9307): *"No actions logged yet this session"* over a pre-seeded array, and it enumerates 3 of 161 action kinds.
20. **`entityType` is free-form with no enum and no validator**, and is neither displayed nor filterable.

### Dead / unused
| Item | Line | Status |
|---|---|---|
| `PAGE_PERMISSIONS['audit-log']` `view` | 10650 | Declared, grantable, never enforced |
| `entry.action` (as a display value) | 3140 | Never rendered |
| `entry.entityType` (on this page) | 3141 | Never rendered or filtered |
| `entry.id` (as a display value) | 3136 | Searchable only |
| `ACTION_LABELS` (beyond the dropdown) | 2898 | Single consumer |
| `auditForEntity()` | 9292–9295 | Used by other pages, not this one |
| Column-4 `<th></th>` | 9297 | Header cell with no label |

### UNVERIFIED
- **Whether any `summary` value in practice contains attacker-controlled markup.** The injection path is unescaped and several inputs are free-text, but exploitation depends on real data. `UNVERIFIED: static analysis only — the vector is present, an instance was not executed.`
- **Whether the 500 cap is ever reached in a session.** Depends on usage. `UNVERIFIED by execution.`
- **Whether `ACTION_LABELS` was intended as an allow-list rather than a display map.** Nothing validates `actionKey` against it at write time (L3140 accepts any string), so it functions purely as a partial display map. `UNVERIFIED: intent not stated in source.`

---

## 15. Line-number index

| Line(s) | What |
|---|---|
| 324–325 | `.aud-diff` / `.aud-diff s` CSS |
| 540 | Sidebar item, `data-i18n="nav.audit-log"` |
| 2013 | Settings preview's `View full activity log →` |
| 2027 | `exportAuditLog()` button (Data Export tab) |
| 2051–2066 | `#p-audit-log` page HTML |
| 2052 | `<h1>🕵️ Activity log</h1>` + sub-line |
| 2055 | `<h2>All actions</h2>` |
| 2057 | `#audit-count` |
| 2058 | Search input |
| 2059 | `#audit-action-filter-wrap` |
| 2060 | `#audit-filter-wrap` |
| 2061 | `#audit-pagesize-wrap` |
| 2064 | `<div id="audit-log">` mount point |
| 2168–2169 | `titles['audit-log']`, `subs['audit-log']` |
| 2830–2841 | `DB.teamUsers` (actor filter options) |
| 2863–2872 | `DB.auditLog` — 8 seeded entries |
| 2898–2909 | **`ACTION_LABELS`** (26 keys) |
| 3105 | `switch_user` |
| 3126–3132 | `requirePerm()` → `permission_denied` L3129 |
| 3133–3151 | **`logAction()`**; 500 cap **L3148**; forced re-render **L3149** (L3146 is `};`, L3147 the `unshift`) |
| 3152–3155 | `auditDiffHTML` doc comment |
| 3156–3172 | **`auditDiffHTML()`** |
| 3266–3275 | `resolveId()` |
| 3283 | `rowLink()` |
| 4360 | Subscription profile's `View full log →` |
| 5343 | csel search-box threshold (`options.length>6`) |
| 7623–7626 | `exportAuditLog()` |
| 7910 | Arabic `nav.audit-log` |
| 8819 | `go('settings')` → `renderAuditLog()` |
| 8824 | `go('audit-log')` → `renderAuditLog()` |
| 9204–9222 | `doExport()` → `export_data` L9215 |
| 9224 | `/* ── Activity log viewer ── */` |
| 9225–9229 | `AUDIT_FILTER_ACTOR`, `AUDIT_FILTER_ACTION`, `AUDIT_SEARCH`, `AUDIT_PAGE`, `AUDIT_PAGE_SIZE` |
| 9230–9246 | `renderAuditFilterSelect()` — one-shot construction |
| 9238 | The **only** consumer of `ACTION_LABELS` |
| 9247–9253 | `onAuditPageSizeChange()` |
| 9254–9261 | `onAuditFilterChange()` |
| 9262–9266 | `onAuditSearchInput()` |
| 9267–9270 | `auditGoToPage()` |
| 9271–9280 | `showActorHistory()` |
| 9281–9285 | `auditEntityLink()` |
| 9286–9291 | `auditForEntity` doc comment |
| 9292–9295 | `auditForEntity()` |
| 9296–9305 | `auditRowsHTML()` |
| 9306–9308 | `auditEmptyHTML()` |
| 9309–9321 | `auditPagerHTML()` |
| 9322–9353 | **`renderAuditLog()`** — page branch 9324–9346, preview branch 9347–9352 |
| 9368–9385 | `initCardToggles()` — injects the `▼` collapse control |
| 10650 | `PAGE_PERMISSIONS['audit-log']` |
| 10674–10692 | `canPage()` / `requirePagePerm()` |
| 16883 | Contextual-menu entry `🗂 Activity log` |
