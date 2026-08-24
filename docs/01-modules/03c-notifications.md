# Module: Notifications
> Source file: `eyvar_ops_panel_v40_fixed.html` (21,857 lines) | Page id `notifications-all` (div `#p-notifications-all`) | HTML lines 1171–1189 | + global bell/panel in topbar (L573–577)

---

## 1. Purpose

Two surfaces over one array (`DB.notifications`):

1. **Global bell + dropdown panel** (topbar, L573–577) — a persistent alert centre that survives the disappearance of transient toasts. Shows the top 8 notifications by priority (`NOTIF_PANEL_PREVIEW=8`, L2228).
2. **Full page `notifications-all`** (L1171–L1187) — every notification, grouped into four priority tiers (critical → high → medium → low), with six filter chips.

The design intent is stated in the source comment block at L2175–2187: notifications are **triaged by priority, never sorted by recency alone** — "the most urgent thing is always what's seen first — never just 'most recent first'".

Page header copy (L1173): `🔔 Notifications` / *"Grouped by priority — critical first, so nothing urgent waits behind routine confirmations"*.
Topbar subtitle for the page (`subs['notifications-all']`, L2169): *"Every alert, sorted by priority"*.
Topbar title (`titles['notifications-all']`, L2168): `Notifications`.

---

## 2. Entry points & routing

| # | Entry point | Line | Mechanism |
|---|---|---|---|
| 1 | Bell icon `#bell-btn` in topbar | L573 | `onclick="toggleNotifPanel(event)"` → opens/closes `#notif-panel` |
| 2 | Panel header word "Notifications" (clickable `<strong>`) | L2234 | `onclick="openAllNotifications()"` |
| 3 | Panel header "See all →" button | L2237 | `onclick="openAllNotifications()"` |
| 4 | Panel footer "See all N notifications →" button (only when `sorted.length > 8`) | L2244 | `onclick="openAllNotifications()"` |
| 5 | `openAllNotifications()` | L2282–2285 | hides panel, then `go('notifications-all',null)` |
| 6 | Router hook | L8802 | inside `window.go` (L8774): `if(id==='notifications-all'){renderAllNotificationsPage();}` |
| 7 | Outside-click dismissal | L2224–L2227 | document-level `click` listener hides the panel if the click target is not inside `#bell-btn` |

**There is NO sidebar nav item for `notifications-all`.** Grep over the whole file finds `go('notifications-all'` only at L2284. The page is reachable *only* through the bell dropdown (or by a direct `go()` call).

**Routing side effects** (`window.go`, L8774–8790): clears `.mob-open` on the sidebar, `refreshNavCounts()`, `pushHistory()` (unless `isBack`), sets `navCurrent={type:'page',id:'notifications-all'}`, removes `.on` from all `.page`, adds `.on` to `#p-notifications-all`, sets `#tb-title` (L8785) and `#tb-sub` (L8786). Because `openAllNotifications` passes `el=null` (L2284), **no sidebar item is highlighted** — whatever was highlighted before stays highlighted (L8783 `if(el){…}`).

**No permission gate on entry.** `go()` has no RBAC check for this id, and none of the twelve notification functions appear in the `gateAll` registry (`gateAll()` L20756; the map it sweeps is `GATE_SWEEP` L20769, its only caller being `installGateSweep()` L20899; `GATE_SPECS` is installed separately by `installUniversalGates()` L18383, and the twelve functions are absent from that too). Verified by grep: `markAllRead`, `handleNotifClick`, `setNotifFilter`, `openAllNotifications`, `toggleNotifPanel` appear only at their definitions and their `onclick` sites (L573, L1174, L1177–1182, L2234–2244, L2252).

---

## 3. Layout map (panel and full page)

### 3a. Bell + dropdown panel (topbar, L573–577)

```
.ic-btn#bell-btn  (position:relative, onclick=toggleNotifPanel(event))          L573
├── <svg> bell glyph                                                            L574
├── span#bell-count   — red pill badge, absolute top:2 right:2,                 L575
│                       min-width 15px, height 15px, bg var(--red), #fff text,
│                       1.5px var(--white) border, border-radius 99px,
│                       font-size 9px / weight 700 / line-height 15px,
│                       default text "0", default style display:none
└── div#notif-panel .notif-panel                                                L576
        position:absolute; top:38px; right:0; width:400px;
        max-height:560px; overflow-y:auto; background var(--white);
        border .5px var(--border); radius 11px;
        box-shadow 0 14px 36px rgba(0,0,0,.16); z-index:500;
        text-align:left; default display:none
```

Responsive overrides (CSS): `.notif-panel{width:360px!important}` at L421; `.notif-panel{width:92vw!important;right:-8px!important}` at L446.

Panel body, built by `renderNotifPanel()` (L2229–2248):
```
┌ header (padding 11px 15px, border-bottom .5px var(--border), flex space-between)  L2233
│   <strong>Notifications</strong>  (cursor:pointer → openAllNotifications)         L2234
│   [ Mark all read ]  ← rendered ONLY when unread>0                               L2236
│   [ See all → ]                                                                   L2237
├ EITHER "No notifications yet." (padding 30px 15px, centred, var(--ghost))        L2240
├ OR up to 8 rows from notifRowHtml()                                              L2242
└ AND, if total > 8: centred [ See all N notifications → ] btn.sm                  L2244
```

### 3b. Full page `#p-notifications-all` (L1171–L1187)

```
div.page#p-notifications-all                                            L1171
├── div.ph                                                              L1172
│   ├── div.ph-l : <h1>🔔 Notifications</h1>                            L1173
│   │              <p>Grouped by priority — critical first, so nothing
│   │                 urgent waits behind routine confirmations</p>
│   └── div.br  : <button class="btn sm" onclick="markAllRead()">       L1174
│                    Mark all read</button>
├── div (flex, gap 6px, margin-bottom 12px, flex-wrap wrap)             L1176
│   ├── span.map-fchip.on  "All <span id=nf-cnt-all>"                   L1177
│   ├── span.map-fchip     "Unread <span id=nf-cnt-unread>"             L1178
│   ├── span.map-fchip     "🔴 Critical <span id=nf-cnt-critical>"      L1179
│   ├── span.map-fchip     "🟠 High <span id=nf-cnt-high>"              L1180
│   ├── span.map-fchip     "🔵 Medium <span id=nf-cnt-medium>"          L1181
│   └── span.map-fchip     "⚪ Low <span id=nf-cnt-low>"                 L1182
└── div.card                                                            L1184
    └── div#notifications-all-list (max-height 680px; overflow-y auto)  L1185
```

`#notifications-all-list` content, built by `renderAllNotificationsPage()` (L2298–2327):
- If no rows match: `"No notifications match this filter."` (padding 40px, centred, 12px, var(--ghost)) — L2315.
- Otherwise, for each of the four groups **in fixed order** (L2318) that has ≥1 row: a group header bar (padding 10px 18px, background `var(--bg2)`, border-top .5px `var(--border)`, 10.5px, weight 700, `var(--muted)`, uppercase, letter-spacing .4px) reading `<label> · <count>` (L2323), followed by that group's rows via `notifRowHtml` (L2324).

Group header labels (L2318, exact strings):
| key | header text |
|---|---|
| `critical` | `🔴 Critical — needs a decision now` |
| `high` | `🟠 High — attention needed soon` |
| `medium` | `🔵 Medium — routine workflow` |
| `low` | `⚪ Low — informational` |

### 3c. Shared row renderer `notifRowHtml(n)` (L2249–2257)

Identical markup in **both** surfaces. Structure:
- Outer `div`: flex, gap 10px, padding 11px 15px, `border-bottom:.5px solid #F2F1EE` (**hardcoded hex, not a CSS var** — L2252), `border-left:3px solid <barColor>`, `cursor:pointer`, `background: n.read ? 'transparent' : 'var(--blue-lt)'`, `onclick="handleNotifClick('<n.id>')"`.
- Left `span` 16px: `notifIcon(n.type)` (L2253).
- Middle `div` (flex:1, min-width:0): title at 12px with `font-weight: n.read ? 400 : 600` (L2254); then, **only if `n.desc` is truthy**, a 10.5px `var(--muted)` sub-line with 2px top margin (L2255).
- Right `span`: `n.time`, 9.5px, `var(--ghost)`, `white-space:nowrap` (L2256).

`barColor` (L2251): `critical → var(--red)`, `high → var(--amber)`, `medium → var(--blue)`, `low → var(--border2)`.

---

## 4. Notification record shape

Seed literal at L2773–2780 (`DB.notifications` inside the `DB` object literal that starts at L2566); runtime records created at L9663.

| Field | Type | Required | Meaning | Source |
|---|---|---|---|---|
| `id` | string | yes | Unique key. Seed uses `'N1'`…`'N6'` (L2774–2779). Runtime uses `'N-AUTO-'+(++window.__notifSeq \|\| (window.__notifSeq=1))` (L9662). | L2774, L9662 |
| `type` | string | yes | Taxonomy key. Drives icon (`notifIcon`, L2171), priority (`notifPriority`, L2190) and fallback click destination (`handleNotifClick`, L2273–L2276). Full taxonomy in §5. | L2774, L9663 |
| `title` | string | yes | Primary line. **Also scanned by `notifPriority` for urgent keywords when `type==='alert'`** (L2191, L2194). Injected raw into `innerHTML` (L2254). | L2774, L9663 |
| `desc` | string | no | Secondary line. Row omits the sub-line entirely when falsy (L2255). Toast-sourced entries always pass `''` (L5296). | L2774, L9663 |
| `time` | string | yes | **Display-only free text**, never a Date. Seed values: `'07:55'`, `'08:02'`, `'08:05'`, `'09:00'`, `'Yesterday'`, `'2 days ago'`. Every runtime record is hardcoded to `'Just now'` and never re-computed (L9663). | L2774, L9663 |
| `read` | boolean | yes | Unread = `false`. Drives badge count (L2260), row background/weight (L2252, L2254), the `unread` filter (L2302), and the secondary sort key (L2206). | L2774, L9663 |
| `action` | function \| undefined | no | Optional click handler. Only ever set by `pushOpsNotification`'s 4th argument (L9661, L9663). **Never present on the six seed records.** When present it fully overrides the type-based routing (L2271–2275). | L9661–9663 |

No other fields are written anywhere. No `entityId`, no `priority` field (priority is always **derived**, never stored), no real timestamp, no `dismissed` flag.

### Seed data (6 records, all mock — L2773–2780)

| id | type | title | desc | time | read |
|---|---|---|---|---|---|
| `N1` | `alert` | No-show — TRP-9003 | Bandar Al-Harbi · ride auto-cancelled | `07:55` | `false` |
| `N2` | `ticket` | New support ticket TKT-503 | Billing complaint from Bandar Al-Harbi | `08:02` | `false` |
| `N3` | `renewal` | Subscription expiring — Sara Al-Ghamdi | SUB ends tomorrow, renewal likelihood 25% | `08:05` | `false` |
| `N4` | `approval` | New driver application | Mona Al-Tamimi submitted documents | `09:00` | `true` |
| `N5` | `payout` | Payout batch pending | 6,420 SAR awaiting processing for 3 drivers | `Yesterday` | `true` |
| `N6` | `complaint` | Driver complaint filed | CMP-330 against Ahmed Salem | `2 days ago` | `true` |

Initial bell badge is therefore **3** (N1, N2, N3 unread).

---

## 5. Type taxonomy

`notifIcon` map (L2172) — 10 keys, fallback `'🔔'` (L2173). `notifPriority` (L2190–2201). Click destinations from `handleNotifClick` (L2267–2281).

| `type` | Icon (L2172) | Priority (L2190–2200) | Type-based click destination (L2273–L2276) | Producer |
|---|---|---|---|---|
| `alert` | ⚠️ | **`critical`** if lowercased `title` matches `/sos\|suspend\|breach\|safety\|incident\|overdue\|closed —\|auto-closed/`, else **`high`** (L2193–L2196) | *(none — falls through, only marked read)* | Seed `N1`; suspension L9092; sub-request search window L9701/9705/9714/9719; cash escalation L12180; instant-ride SLA L12548; no-ping L12590; backup promotion L13234; auto-suspend on doc expiry L13309; zone steering L14033; retention follow-up L14281; absence L16723; emergency dispatch L17293/L17306; repeat cash pattern L12139 (when `isPattern`) |
| `ticket` | 🎧 | `medium` (L2199) | `go('support',null)` (L2273) | Seed `N2`; SLA breach sweep L14945; fairness case opened L15519 |
| `renewal` | ↻ | `medium` (L2199) | `go('renewal',null)` (L2275) | **Seed `N3` only** — no runtime producer |
| `approval` | 🕓 | `medium` (L2199) | `go('drivers',null)` (L2274) | **Seed `N4` only** — no runtime producer |
| `payout` | 💳 | **`high`** (L2198, commented *"money movement — always worth a close look"*) | `go('wallets',null)` (L2276) | Seed `N5`; settlement commit L3694 |
| `complaint` | 🚩 | `high` (L2197) | *(none — falls through)* | **Seed `N6` only** — no runtime producer |
| `success` | ✅ | `low` (L2200) | *(none)* | Toast bridge `ok→success` L5296; driver accepted offer L12490 |
| `warning` | ⚠️ | `high` (L2197) | *(none)* | Toast bridge `warn→warning` L5296; low-rating fallback L12468; cash review L12139 (non-pattern branch) |
| `error` | ⛔ | **`critical`** (L2192 — first check, unconditional) | *(none)* | Toast bridge `err→error` L5296 |
| `info` | ℹ️ | `low` (L2200) | *(none)* | Toast bridge `info→info` L5296; driver tier recalc L13622/L13625/L13638 |
| **`warn`** ⚠ *(undeclared)* | **🔔 fallback** (L2173) | **`low`** (falls to L2200) | *(none)* | **10 producers**: L4777, L4847, L5112, L5120, L10277, L12005, L12439, L12453, L15887, L16719 |
| **`ok`** ⚠ *(undeclared)* | **🔔 fallback** (L2173) | **`low`** (falls to L2200) | *(none)* | **1 producer**: L4838 |
| anything else | 🔔 (L2173) | `low` (L2200) | *(none)* | — |

> **BUG — confirmed by grep.** `'warn'` and `'ok'` are not keys of the `notifIcon` map (L2172) and are not matched by any branch in `notifPriority` (L2191–2200). Eleven producers emit them. Result: manager-approval requests (L5112/5120/10277), driver-commitment prompts (L4777/4847), driver decline-streak flags (L12005), corporate policy violations (L12439), low-rating alerts (L12453), orphan credit notes (L15887) and regulator-threshold warnings (L16719) all render with a generic 🔔 icon, a grey `var(--border2)` left bar, and land in the **⚪ Low — informational** bucket at the *bottom* of the page. The toast bridge at L5295 maps `warn→'warning'` correctly, so these direct calls are inconsistent with the bridge.

---

## 6. Priority & sort algorithm

### `notifPriority(n)` — exact, L2190–2201

```js
function notifPriority(n){
  var t=(n.title||'').toLowerCase();                                   // L2191
  if(n.type==='error')return 'critical';                               // L2192
  if(n.type==='alert'){
    if(/sos|suspend|breach|safety|incident|overdue|closed —|auto-closed/.test(t))
      return 'critical';                                               // L2194
    return 'high';                                                     // L2195
  }
  if(n.type==='warning'||n.type==='complaint')return 'high';           // L2197
  if(n.type==='payout')return 'high';                                  // L2198
  if(n.type==='ticket'||n.type==='approval'||n.type==='renewal')
    return 'medium';                                                   // L2199
  return 'low';                                                        // L2200
}
```

Evaluation order matters: `error` wins first; the keyword regex applies **only** inside the `alert` branch. The keyword list is exactly 8 alternatives — `sos`, `suspend`, `breach`, `safety`, `incident`, `overdue`, `closed —` (em-dash, leading space), `auto-closed` — matched against `title` only (never `desc`), after `.toLowerCase()`.

Escalating `alert` producers that DO hit the regex: L9092 `'Account suspended — …'` (`suspend`); L9714 `'Search closed — …'` (`closed —`); L9719 `'N requests auto-closed'` (`auto-closed`); L12548 `'SLA breached — …'` (`breach`); L13309 `'Auto-suspended — …'` (`suspend`). Seed `N1` `'No-show — TRP-9003'` does **not** match → `high`.

### `NOTIF_PRIORITY_RANK` (L2188)
`{critical:0, high:1, medium:2, low:3}` — lower number sorts first.

### `NOTIF_PRIORITY_LABEL` (L2189)
`{critical:'🔴 Critical', high:'🟠 High', medium:'🔵 Medium', low:'⚪ Low'}` — **defined but never referenced anywhere else in the file** (grep confirms: only L2189). Dead code; the page uses the longer literals at L2318 and the chips use their own hardcoded labels at L1179–1182.

### `sortNotifsByPriority(list)` — exact, L2202–2209

```js
return list.slice().sort(function(a,b){
  var pr = NOTIF_PRIORITY_RANK[notifPriority(a)] - NOTIF_PRIORITY_RANK[notifPriority(b)];
  if(pr!==0) return pr;                       // 1. priority rank ascending
  if(a.read!==b.read) return a.read?1:-1;     // 2. unread before read
  return 0;                                   // 3. preserve input order
});
```
- Non-mutating (`.slice()` first) — `DB.notifications` order is never changed by rendering.
- Tie-break 3 relies on `Array.prototype.sort` stability, which the source comment (L2207) documents as *"preserves existing recency order (newest already unshifted first)"* — correct because `pushOpsNotification` uses `unshift` (L9663).
- `notifPriority` is re-evaluated inside the comparator on every comparison — O(n log n) regex tests. Not a correctness issue at demo scale.

---

## 7. Filters

State variable `_notifPageFilter`, module-global, **default `'all'`** (L2291). Handler `setNotifFilter(f, chip)` (L2292–2297):
1. `_notifPageFilter=f`
2. removes `.on` from every `#p-notifications-all .map-fchip` (L2294)
3. adds `.on` to the clicked chip if passed (L2295)
4. `renderAllNotificationsPage()` (L2296)

Predicates, from the `all.filter` at L2300–2304:

| Chip count id | Label (L1177–1182) | Value | Predicate | Default |
|---|---|---|---|---|
| `nf-cnt-all` | `All (n)` | `'all'` | `return true` (L2301) | ✅ `.on` in markup (L1177) **and** `_notifPageFilter='all'` (L2291) |
| `nf-cnt-unread` | `Unread (n)` | `'unread'` | `!n.read` (L2302) | — |
| `nf-cnt-critical` | `🔴 Critical (n)` | `'critical'` | `notifPriority(n)==='critical'` (L2303) | — |
| `nf-cnt-high` | `🟠 High (n)` | `'high'` | `notifPriority(n)==='high'` (L2303) | — |
| `nf-cnt-medium` | `🔵 Medium (n)` | `'medium'` | `notifPriority(n)==='medium'` (L2303) | — |
| `nf-cnt-low` | `⚪ Low (n)` | `'low'` | `notifPriority(n)==='low'` (L2303) | — |

The fall-through at L2303 means **any unrecognised filter value is treated as a priority key** and would match nothing. Only the six chips can set it.

### Count badges (L2306–2311)

Counts are computed over **`all` (the unfiltered array), never the filtered set** — so chip counts stay constant as you switch filters:
```js
var counts={critical:0,high:0,medium:0,low:0,unread:0};                            // L2306
all.forEach(function(n){counts[notifPriority(n)]++; if(!n.read)counts.unread++;});  // L2307
['all','unread','critical','high','medium','low'].forEach(function(f){             // L2308
  var el=document.getElementById('nf-cnt-'+f);
  if(el)el.textContent='('+(f==='all'?all.length:counts[f])+')';                    // L2310
});
```
Rendered format is `(N)` with literal parentheses. The count spans are **empty until `renderAllNotificationsPage()` runs at least once** — i.e. until the page is first visited; nothing populates them at boot.

Note that `unread` is **not** mutually exclusive with the four priority counts — critical+high+medium+low always equals `all.length`, while `unread` overlaps them all.

---

## 8. Bell badge formula

`updateBellBadge()` — exact, L2259–2266:

```js
var unread = DB.notifications.filter(function(n){return !n.read;}).length;   // L2260
var cnt = document.getElementById('bell-count');                            // L2261
if(cnt){
  cnt.textContent = unread>99 ? '99+' : unread;                             // L2263
  cnt.style.display = unread>0 ? '' : 'none';                               // L2264
}
```

- **Counts every unread record regardless of priority.** A run of `low` toast-derived entries inflates the badge exactly as much as a critical SOS would.
- Cap display at `99+`; `unread` is assigned as a **Number** at L2263 (implicit coercion by the DOM).
- `display=''` (empty string, not `'block'`/`'inline'`) removes the inline declaration, letting the `<span>` fall back to its default `inline` rendering. The markup at L575 ships with `display:none` inline, so the badge is hidden until the first `updateBellBadge()` call.

**Call sites (only 4, grep-verified):**
| Line | Caller | When |
|---|---|---|
| L14565 | boot `setTimeout` block (L14556+) | once at startup — sets the badge to 3 |
| L9664 | `pushOpsNotification` | every produced notification |
| L2258 | `markAllRead` | after flipping all to read |
| L2270 | `handleNotifClick` | after flipping the clicked one to read |

Not called by `setNotifFilter` or `renderAllNotificationsPage` — neither changes `read` state, so no drift.

---

## 9. Producers — every module that emits notifications

### 9a. The single write point

```js
function pushOpsNotification(type,title,desc,action){                            // L9661
  var id='N-AUTO-'+(++window.__notifSeq||(window.__notifSeq=1));                 // L9662
  DB.notifications.unshift({id:id,type:type,title:title,desc:desc,
                            time:'Just now',read:false,action:action});          // L9663
  if(typeof updateBellBadge==='function')updateBellBadge();                      // L9664
  if(document.getElementById('notif-panel') &&
     document.getElementById('notif-panel').style.display==='block')
    renderNotifPanel();                                                          // L9665
}
```
Grep confirms **`DB.notifications.unshift` / `.push` appears at exactly one line in the whole file: L9663.** Every producer below goes through `pushOpsNotification`. Its rationale comment sits at L9654–9660.

L9665 refreshes the dropdown only if it is currently open; it does **not** refresh the full page if that page is open — see §18.

### 9b. Complete producer inventory (36 call sites, 29 distinct enclosing functions)

| # | Line | Enclosing function (def line) | Module | `type` | Title pattern | Click action |
|---|---|---|---|---|---|---|
| 1 | L3694 | `commitSettlement` (L3684) | Subscriptions / Finance — settlement | `payout` | `Settlement — <subId>` | `openProfile(subId)` |
| 2 | L4777 | `evaluateSubStart` (L4743) | Subscriptions — start evaluation | `warn` ⚠ | `Driver commitment needed — <subId>` | `openProfile(subId)` |
| 3 | L4838 | `confirmSubDriverCommit` (L4826) | Subscriptions — driver commit | `ok` ⚠ | `Driver accepted — <subId>` | `openProfile(subId)` |
| 4 | L4847 | `confirmSubDriverCommit` (L4826) | Subscriptions — driver commit | `warn` ⚠ | `Driver declined — <subId>` | `openProfile(subId)` |
| 5 | L5112 | `finalizeNewSub` (L5078) | Subscriptions — new sub / Corporate | `warn` ⚠ | `Manager approval needed — <newSubId>` | `openProfile(newSubId)` |
| 6 | L5120 | `finalizeNewSub` (L5078) | Subscriptions — new sub / Corporate | `warn` ⚠ | `Manager approval needed — <newSubId>` | `openProfile(newSubId)` |
| 7 | **L5296** | **`toast` (L5269)** | **Global UI — every toast in the app** | `success`/`warning`/`error`/`info` | *the toast message verbatim* | the toast's own `onClick` |
| 8 | L9092 | `commitSuspendAccount` (L9082) | Drivers / Riders — suspension | `alert` → **critical** | `Account suspended — <name>` | `openProfile(entityId)` |
| 9 | L9701 | `processSubReqSearchWindow` (L9679) | Requests — subscription requests | `alert` → high | `Still searching — <rider>` | `openSubReqFromToast(id)` |
| 10 | L9705 | `processSubReqSearchWindow` (L9679) | Requests — batched reminder | `alert` → high | `<n> requests at the <N>h mark` | `go('requests-sub-all')` |
| 11 | L9714 | `processSubReqSearchWindow` (L9679) | Requests — auto-expiry | `alert` → **critical** (`closed —`) | `Search closed — <rider>` | `openSubReqFromToast(id)` |
| 12 | L9719 | `processSubReqSearchWindow` (L9679) | Requests — batched expiry | `alert` → **critical** (`auto-closed`) | `<n> requests auto-closed` | `go('requests-sub-all')` |
| 13 | L10277 | `commitSubReqAssign` (L10266) | Requests — assignment / Corporate | `warn` ⚠ | `Manager approval needed — <sreqId>` | `go('requests')` |
| 14 | L12005 | `driverDeclineOrTimeout` (L11995) | Dispatch engine — decline streak | `warn` ⚠ | `Driver flagged — <driver>` | `openProfile(offeredTo)` |
| 15 | L12139 | `maybeGenerateCashEvent` (L12101) | Driver Wallets — cash reconciliation | `alert` (pattern) / `warning` | `Repeat cash pattern — …` / `Cash review needed — …` | `go('wallets')` |
| 16 | L12180 | `commitCashResolve` (L12171) | Driver Wallets — Trust & Safety escalation | `alert` → high | `Escalated — <driver>` | `go('wallets')` |
| 17 | L12439 | `completeTrip` (L12406) | Trips / Corporate policy | `warn` ⚠ | `Policy violation — <rider>` | `openProfile(t.id)` |
| 18 | L12453 | `completeTrip` (L12406) | Trips — low rating (config-gated) | `warn` ⚠ | `Low rating — <driver>` | `openProfile(t.driver)` |
| 19 | L12468 | `completeTrip` (L12406) | Trips — low rating fallback | `warning` → high | `Low rating — <driver>` | `openProfile(t.driver)` |
| 20 | L12490 | `driverAcceptOffer` (L12476) | Dispatch engine — acceptance | `success` → low | `Driver accepted — <r.id>` | `openProfile(r.rider)` |
| 21 | L12548 | `tickEngine` (L12508) | Ride requests — instant SLA | `alert` → **critical** (`breach`) | `SLA breached — <rider>` | `openInstantReqFromToast(r.id)` |
| 22 | L12590 | `tickEngine` (L12508) | Live map — GPS ping loss | `alert` → high | `No signal — <driver>` | `openProfile(t.id)` |
| 23 | L13234 | `promoteBackup` (L13225) | Coverage & Capacity — backup promotion | `alert` → high | `Backup promoted — <subId>` | `go('coverage')` |
| 24 | L13309 | `complianceScan` (L13296) | Fleet Compliance — document expiry | `alert` → **critical** (`suspend`) | `Auto-suspended — <driver>` | `go('compliance')` |
| 25 | L13622 | `recalcDriverTiers` (L13602) | Promos & Growth — tier engine | `info` → low | `Tier promoted/updated — <driver>` | `openProfile(c.id)` |
| 26 | L13625 | `recalcDriverTiers` (L13602) | Promos & Growth — batched tier engine | `info` → low | `<n> driver tiers updated` | `go('drivers')` |
| 27 | L13638 | `manualRecalcTiers` (L13633) | Promos & Growth — manual recalc | `info` → low | `<n> driver tier(s) updated` | `go('drivers')` |
| 28 | L14033 | `commitSteerOffer` (L14023) | Zones — steering offer | `alert` → high | `Steering offer live — <zoneName>` | `go('zones')` |
| 29 | L14281 | `commitRetentionAction` (L14272) | Renewal / Growth — retention | `alert` → high | `Retention follow-up — <subId>` | `openProfile(subId)` |
| 30 | L14945 | `fire` inside `slaSweep` (L14937) | Support Center — SLA breach sweep | `ticket` → medium | `⚠ SLA breach — <ticketId>` | `openTicketDetail(t.id)` (L14946) |
| 31 | L15519 | `fcNew` (L15507) | Captain Fairness — case opened | `ticket` → medium | `⚖️ <kind> — <driver>` | `go('fairness')` |
| 32 | L15887 | `issueCreditNote` (L15862) | Finance — credit notes | `warn` ⚠ | `Credit note without an invoice — <noteNumber>` | UNVERIFIED |
| 33 | L16719 | `recordAbsence` (L16678) | Compliance / Absence — regulator threshold | `warn` ⚠ | `Regulator threshold approaching — <driver>` | UNVERIFIED |
| 34 | L16723 | `recordAbsence` (L16678) | Compliance / Absence | `alert` → high | `Absence recorded — <driver>` | UNVERIFIED |
| 35 | L17293 | `emergencyDispatch` (L17258) | Coverage — emergency dispatch | `alert` → high | `⚠ No captain available — <rider>` | UNVERIFIED |
| 36 | L17306 | `offerEmergency` (L17299) | Coverage — emergency dispatch | `alert` → high | `⚠ Emergency dispatch exhausted — <d.id>` | UNVERIFIED |

> Note on #35/#36: neither `No captain available` nor `exhausted` is in the keyword regex (L2194), so both resolve to `high`, **not** `critical`, despite carrying the ⚠ prefix.

> UNVERIFIED in the last column (rows 32–36): those five call sites span multiple source lines and the `action` argument was not on the grepped line. `type` and `title` are verified from grep output; the click closures were not read.

### 9c. The toast bridge (L5294–L5296) — the highest-volume producer

```js
if(notify!==false && typeof pushOpsNotification==='function'){                 // L5294
  var toastTypeToNotif={ok:'success',warn:'warning',err:'error',info:'info'};  // L5295
  pushOpsNotification(toastTypeToNotif[type]||'info', msg, '', onClick);       // L5296
}
```
**Every `toast()` call in the entire panel** (default `type='ok'` → `success`, L5270) mirrors into `DB.notifications` unless the caller passes `notify===false`. The rationale comment (L5264–5268) states: *"nothing shown only as a transient toast can be missed once it fades. Pass `notify=false` when the caller already pushes a richer, separate entry itself."*

Consequences:
- The `desc` field is always `''` for toast-derived entries → single-line rows.
- `msg` may contain **HTML markup** (toasts render `msg` into `innerHTML` at L5290), which is then re-injected raw into the notification title at L2254.
- `toast(...,'err')` becomes `type:'error'` → **`critical`**, jumping to the very top of the page — including trivial validation errors.
- `toast(...,'ok')` becomes `type:'success'` → `low`, flooding the Low tier.

---

## 10. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| `#bell-count` text | `DB.notifications.filter(!read).length` | number → string | `99+` cap (L2263). Markup ships with literal `0` (L575) |
| `#bell-count` visibility | same count `>0` | — | L2264 |
| Panel header "Notifications" | hardcoded | — | L2234 |
| Panel "Mark all read" button | conditional on `unread>0` | — | L2236 |
| Panel "See all →" | hardcoded | — | L2237 |
| Panel footer `See all N notifications →` | `sortNotifsByPriority(DB.notifications).length` | number | Only when `>8` (L2243–2244) |
| Panel empty state | hardcoded `"No notifications yet."` | — | L2240 |
| Row icon | `notifIcon(n.type)` | emoji | L2253 / map L2172 |
| Row left bar colour | `notifPriority(n)` → CSS var | — | L2251 |
| Row background | `n.read ? transparent : var(--blue-lt)` | — | L2252 |
| Row title | `n.title` | string (raw HTML) | L2254 |
| Row title weight | `n.read ? 400 : 600` | — | L2254 |
| Row description | `n.desc` | string (raw HTML) | Omitted when falsy — L2255 |
| Row timestamp | `n.time` | free-text string | L2256 — never a real date |
| Page `<h1>` + subtitle | hardcoded | — | L1173 |
| `#tb-title` | `titles['notifications-all']` = `'Notifications'` | — | L2168 → L8785 |
| `#tb-sub` | `subs['notifications-all']` = `'Every alert, sorted by priority'` | — | L2169 → L8786 |
| Chip counts `#nf-cnt-*` | derived over the **unfiltered** array | `(N)` | L2306–2311 |
| Group header text | hardcoded labels (L2318) + `rows.length` | — | L2323 |
| Page empty state | hardcoded `"No notifications match this filter."` | — | L2315 |

---

## 11. Input fields / chips

There are **no text inputs, selects, checkboxes, or search boxes** in this module — L1171–L1187 contains only six `<span class="map-fchip">` and one `<button>`.

| Control | Element / count id | Label | Default | Effect |
|---|---|---|---|---|
| Filter chip | `span.map-fchip.on` + `#nf-cnt-all` | `All (n)` | **selected** (L1177) | `setNotifFilter('all', this)` |
| Filter chip | `span.map-fchip` + `#nf-cnt-unread` | `Unread (n)` | — | `setNotifFilter('unread', this)` |
| Filter chip | `span.map-fchip` + `#nf-cnt-critical` | `🔴 Critical (n)` | — | `setNotifFilter('critical', this)` |
| Filter chip | `span.map-fchip` + `#nf-cnt-high` | `🟠 High (n)` | — | `setNotifFilter('high', this)` |
| Filter chip | `span.map-fchip` + `#nf-cnt-medium` | `🔵 Medium (n)` | — | `setNotifFilter('medium', this)` |
| Filter chip | `span.map-fchip` + `#nf-cnt-low` | `⚪ Low (n)` | — | `setNotifFilter('low', this)` |

Chip CSS (L345–347): `.map-fchip` = pill, 4px 12px padding, 999px radius, 11px/500, `var(--white)` bg, `var(--muted)` text, `.5px var(--border2)` border; `:hover` → blue border+text; `.on` → `var(--blue)` background, `#fff` text, blue border, `0 1px 4px rgba(26,115,232,.3)` shadow. The class is shared with the Requests page (`#p-requests .map-fchip`, L10036) — both use scoped `querySelectorAll`, so their `.on` states do not collide.

**Filter state is NOT reset on navigation.** `_notifPageFilter` (L2291) is a module global; leaving the page and returning re-renders with the last filter, and the `.on` chip class is DOM state that also persists — so the two stay in sync.

---

## 12. Actions

| # | Label / trigger | Handler (line) | Real effect | Writes to | Permission | Audit |
|---|---|---|---|---|---|---|
| 1 | Bell icon | `toggleNotifPanel(e)` (L2214–2222) | `e.stopPropagation()`; reads current `display`; sets `left`/`right` per `body.lang-ar` (RTL flip, L2216–2219); toggles `display` between `'block'`/`'none'`; `renderNotifPanel()` only when opening (L2222) | DOM only | none | none |
| 2 | Click anywhere outside `#bell-btn` | anonymous document listener (L2224–L2227) | Hides the panel if open and `!bell-btn.contains(e.target)` | DOM only | none | none |
| 3 | Panel "Mark all read" (only if unread>0) | `markAllRead()` (L2258) | see #4 | `DB.notifications[*].read` | none | **none** |
| 4 | Page header "Mark all read" `btn.sm` (L1174) | `markAllRead()` (L2258) | `DB.notifications.forEach(n=>n.read=true)`; `renderNotifPanel()`; `updateBellBadge()`; if `#p-notifications-all` has `.on`, `renderAllNotificationsPage()` | `DB.notifications[*].read` — **in-memory only** | **none — not in the `gateAll` registry** | **none — no `logAction` call** |
| 5 | Click any notification row (panel or page) | `handleNotifClick(id)` (L2267–2281) | Find by `id` (L2268); bail if missing (L2269); `n.read=true`; `renderNotifPanel()`; `updateBellBadge()` (L2270); hide panel (L2271); then **either** `n.action()` if it is a function (L2272) **or** the type fallback (`ticket→support`, `approval→drivers`, `renewal→renewal`, `payout→wallets`, L2273–L2276); finally re-render the full page if it is `.on` (L2280) | `DB.notifications[id].read`; navigation via `go()`/`openProfile()`/`openTicketDetail()` inside `n.action` | **none** | none directly (the target page's own handlers may log) |
| 6 | Panel header word "Notifications" | `openAllNotifications()` (L2282–2285) | hide panel; `go('notifications-all',null)` | DOM + `navCurrent` + history stack (`pushHistory`, L8779) | none | none |
| 7 | Panel "See all →" / "See all N notifications →" | `openAllNotifications()` (L2282) | as #6 | same | none | none |
| 8 | Any filter chip | `setNotifFilter(f, chip)` (L2292–2297) | sets `_notifPageFilter`; clears `.on` from all chips scoped to `#p-notifications-all`; adds `.on` to clicked; re-renders | DOM + module global | none | none |

> **No action in this module writes to the audit log.** Grep for `logAction` within L2171–2327 returns nothing. Marking a critical safety alert as read leaves no trace of who dismissed it or when.

Types with **no** click destination and **no** `action` (the seed entries) simply get marked read and nothing else happens. The source comment at L2277–L2279 explains this is deliberate for toast-derived entries: *"re-showing them as a toast would auto-push a new notification and recreate the exact entry the person just cleared"* — an acknowledged feedback-loop hazard.

---

## 13. Read/unread state & persistence

### Representation
A single boolean `read` per record. There is **no per-user read state** — `CURRENT_USER_ID` is never consulted by any notification function (grep-verified across L2171–2327 and L9661–9666). Switching acting user via `openUserSwitch` (L3105–3113) does **not** change what the bell shows.

### Transitions to `read:true`
1. `markAllRead()` — all records at once (L2258).
2. `handleNotifClick(id)` — one record (L2270).

### Transitions to `read:false`
Only creation: `pushOpsNotification` hardcodes `read:false` (L9663). **There is no "mark as unread" anywhere.**

### Persistence — NONE
Grep for `localStorage`, `sessionStorage`, `indexedDB` across the entire 21,857-line file returns **zero matches**. `DB` is a plain in-memory JS object literal (L2566+). Therefore:
- Every `read` flag reverts on reload; the badge returns to **3** (N1/N2/N3).
- Every runtime-generated `N-AUTO-*` notification is lost on reload; `window.__notifSeq` restarts at 1.
- The six seed records reappear verbatim.
- This matches the panel's own disclaimers about the missing backend — Settings › General (`gen.logo_note`, L7929) and the Push Notifications panel description (L1933: *"This file has no real APNs/FCM push server…"*).

### Growth / cleanup
`DB.notifications` has **no size cap and no eviction**. Contrast `DB.contacts`, trimmed at L14933 (`if(DB.contacts.length>2000)DB.contacts.length=2000;`). Since `tickEngine` runs every 1000 ms (L11968) and drives producers #21/#22, and every `toast()` mirrors in, a long-running session accumulates entries indefinitely. The dropdown is capped at 8 rows, but the full page renders **every** record into one `innerHTML` string (L2326).

---

## 14. States & badges

| Badge / state | Trigger condition | Visual | Line |
|---|---|---|---|
| Bell red pill | `unread > 0` | red circle, white number, `99+` cap | L2263–2264 / markup L575 |
| Bell hidden | `unread === 0` | `display:none` | L2264 |
| Unread row | `n.read === false` | background `var(--blue-lt)`, title `font-weight:600` | L2252, L2254 |
| Read row | `n.read === true` | background `transparent`, title `font-weight:400` | L2252, L2254 |
| Critical left bar | `notifPriority(n)==='critical'` | `3px solid var(--red)` | L2251 |
| High left bar | `…==='high'` | `3px solid var(--amber)` | L2251 |
| Medium left bar | `…==='medium'` | `3px solid var(--blue)` | L2251 |
| Low left bar | `…==='low'` | `3px solid var(--border2)` | L2251 |
| Group header | group has ≥1 row after filtering | uppercase `var(--bg2)` bar with `· count` | L2321–2323 |
| Group hidden | group has 0 rows | `return` before emitting header | L2322 |
| Panel empty state | `sorted.length === 0` | "No notifications yet." | L2240 |
| Page empty state | `sorted.length === 0` after filtering | "No notifications match this filter." | L2315 |
| Panel "Mark all read" hidden | `unread === 0` | button omitted from the header HTML | L2236 |
| Panel footer button hidden | `sorted.length <= 8` | omitted | L2243 |
| Panel RTL position | `document.body.classList.contains('lang-ar')` | `left:0; right:auto` instead of `left:auto; right:0` | L2216–2219 |

There is **no** priority text badge on the row itself (only the coloured left bar and the type emoji), and **no** notification count badge anywhere in the sidebar.

---

## 15. Cross-module links

**Outbound — where clicking a notification takes you:**

| From | To (page id / function) | Line |
|---|---|---|
| type `ticket` (fallback) | `go('support')` — Support Center | L2273 |
| type `approval` (fallback) | `go('drivers')` — Drivers | L2274 |
| type `renewal` (fallback) | `go('renewal')` — Renewal Pipeline | L2275 |
| type `payout` (fallback) | `go('wallets')` — Driver Wallets | L2276 |
| `n.action` → `openProfile(id)` | 360° Profile system | producers #1–6, 8, 14, 17–20, 22, 25, 29 |
| `n.action` → `openSubReqFromToast` / `go('requests-sub-all')` | Requests (subscription) | L9701, L9705, L9714, L9719 — helper at L9668–9673 |
| `n.action` → `go('requests')` | Requests | L10277 |
| `n.action` → `go('wallets')` | Driver Wallets | L12139, L12180 |
| `n.action` → `openInstantReqFromToast` | Requests (instant) | L12548 |
| `n.action` → `go('coverage')` | Coverage & Capacity | L13234 |
| `n.action` → `go('compliance')` | Fleet Compliance | L13309 |
| `n.action` → `go('drivers')` | Drivers | L13625, L13638 |
| `n.action` → `go('zones')` | Zones | L14033 |
| `n.action` → `openTicketDetail(id)` | Ticket Detail | L14946 |
| `n.action` → `go('fairness')` | Captain Fairness | L15519 |

**Inbound — modules that write here:** see the 36-row table in §9b. In short: Subscriptions, Finance/Settlement, Corporate Accounts, Drivers, Riders, Requests (both kinds), Dispatch engine, Trips, Driver Wallets, Live Map, Coverage & Capacity, Fleet Compliance, Promos & Growth, Zones, Renewal, Support Center (SLA), Captain Fairness, Credit Notes, Absence/Regulator — **plus the global `toast()` helper, which makes effectively every module in the panel a producer.**

**Related but separate — Settings:**
- `DB.opsConfig.notifications` (L2571) = `{emailAlerts:true, smsAlerts:false, lowRatingThreshold:2.5, notifyOnDispute:true}` — the **Alert Preferences** settings tab (`#stab-notifications`, L1907; tab button L1437, i18n key `stab.notifications`). Loaded at L8004–8006, saved at L8010–8014, which **does** audit-log (`logAction('config_updated','settings','notifications',…)`, L8014). Different concern from `DB.notifications` despite the name collision.
  - `lowRatingThreshold` is read by `lowRatingThreshold()` (L15243–15246) and by producer #18 (L12452).
  - `emailAlerts` acts as an on/off gate for producer #18 (`emailAlerts!==false`, L12452) — a misnamed reuse, since it gates an **in-panel** notification, not email.
  - **`smsAlerts` and `notifyOnDispute` are never read anywhere** (grep: only L2571, L8006, L8011, L8012 — set/restore only). Dead config.
- **Push Notifications** tab (`#stab-push`, tab button L1438) and `DB.pushOutbox` (L7757–7762) are a completely separate rider/driver-facing system. The panel copy at L1911 states it explicitly: *"What the ops team itself gets alerted about internally, and how — not the same as sending push notifications to riders/drivers."*

---

## 16. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| All 6 seed notifications (`N1`–`N6`) | L2774–2779 | Fictional entities: TRP-9003, TKT-503, Bandar Al-Harbi, Sara Al-Ghamdi, Mona Al-Tamimi, CMP-330, Ahmed Salem, "6,420 SAR" |
| `time:'Just now'` for every runtime record | L9663 | **Never recomputed** — an hour-old notification still reads "Just now" |
| Seed `time` values `'07:55'`, `'08:02'`, `'08:05'`, `'09:00'`, `'Yesterday'`, `'2 days ago'` | L2774–2779 | Free text, not parsed; pinned to the fictional demo clock "Thursday 25 Jun 2026 · 09:14 AM" (L2169) |
| `NOTIF_PANEL_PREVIEW = 8` | L2228 | Magic number, not configurable from Settings |
| `99` badge cap | L2263 | Magic number |
| Urgent-keyword regex (8 alternatives) | L2194 | Hardcoded English-only keyword list; would never match an Arabic title |
| `#F2F1EE` row separator | L2252 | Raw hex instead of a CSS var (every other colour in the row uses `var(--…)`) |
| Group header labels | L2318 | English-only literals, triplicated with the chip labels (L1179–1182) and the unused `NOTIF_PRIORITY_LABEL` (L2189) |
| Chip labels `🔴 Critical` etc. | L1179–1182 | English-only, hardcoded in markup |
| Empty-state strings | L2240, L2315 | English-only |
| `top:38px` panel offset, `width:400px`, `max-height:560px` | L576 | Inline magic numbers |
| `max-height:680px` list scroll | L1185 | Inline magic number |
| ID prefix `'N-AUTO-'` + `window.__notifSeq` | L9662 | Global on `window`, resets to 1 on reload |
| `DB.opsConfig.notifications` defaults | L2571 | `emailAlerts:true, smsAlerts:false, lowRatingThreshold:2.5, notifyOnDispute:true` |

---

## 17. i18n keys

**This module has none.** Grep for `data-i18n` inside L1171–L1187 and L573–577: **zero matches**. Every string in the bell, the panel, and the full page is a hardcoded English literal.

The only i18n touchpoints anywhere near this module belong to **Settings**, not the notification centre:
| Key | English | Arabic | Where |
|---|---|---|---|
| `stab.notifications` | `Alert Preferences` | `تفضيلات التنبيه` (L7919) | Settings tab button, L1437 |
| `stab.push` | `Push Notifications` | `الإشعارات الفورية` (L7920) | Settings tab button, L1438 |
| `stabgrp.comms` | `Customer comms` | `تواصل العملاء` (L7916) | Settings tab group holding `notifications`, `push`, `emails` — L21274 |

Also: `titles['notifications-all']` and `subs['notifications-all']` (L2168–2169) are English-only maps with **no Arabic counterpart** — grep finds no `AR_TITLES`/`titlesAr` equivalent, and the language applier (L7947) only rewrites elements carrying `data-i18n`. Switching to Arabic therefore leaves the whole page in English — consistent with the explicit disclaimer at L7927 (`gen.disclaimer`), which says only the sidebar and group labels are translated.

**The one RTL accommodation** in the module: `toggleNotifPanel` flips the dropdown's `left`/`right` anchoring based on `body.lang-ar` (L2216–2219).

---

## 18. Gaps, dead code, UNVERIFIED items

### Confirmed bugs / inconsistencies
1. **Undeclared types `'warn'` and `'ok'`** — 11 producers (L4777, L4838, L4847, L5112, L5120, L10277, L12005, L12439, L12453, L15887, L16719) emit types absent from both `notifIcon` (L2172) and `notifPriority` (L2191–2199). They silently degrade to 🔔 + `low` and sink to the bottom of the page. The correct spellings (`warning`, `success`) exist and are used by the toast bridge at L5295.
2. **The full page does not live-update.** `pushOpsNotification` refreshes the dropdown when open (L9665) but never calls `renderAllNotificationsPage()`. A user sitting on `notifications-all` sees nothing new until they click a filter chip or re-enter the page — even though `tickEngine` (1 s, L11968) is actively producing. Note that `markAllRead` (L2258) and `handleNotifClick` (L2280) *do* include the `.classList.contains('on')` re-render guard; the producer simply omits the same check.
3. **No audit trail.** No `logAction` anywhere in L2171–2327. Dismissing a critical alert is untracked.
4. **No permission gate.** `markAllRead` mutates `DB` on a single click and is absent from every gate registry — `GATE_SWEEP` (L20769, swept by `gateAll()` L20756 from `installGateSweep()` L20899), `GATE_SPECS` (L18245), `installActionGates()` (L17853) and the standalone `guardAction` calls — whose header comment (L20740–L20755) claims *"every function reachable from an onclick was extracted, its body scanned for writes to DB"* and that 45 mutating actions were registered.
5. **Raw HTML injection.** `n.title` and `n.desc` are interpolated into `innerHTML` un-escaped (L2254–2255). Toast-derived titles carry the toast's `msg`, which is itself HTML (L5290). With all data local and mock this is inert, but it is a real XSS surface once any of these strings become user-supplied.
6. **Unbounded array.** No cap or eviction on `DB.notifications` (contrast `DB.contacts`, capped at 2000, L14933). The full page renders every record in one `innerHTML` assignment (L2326).
7. **`time` never ages.** Every runtime record reads `'Just now'` forever (L9663). No relative-time recomputation exists.
8. **No dedupe.** Repeated identical toasts create separate records; only the SLA sweep guards itself (`t.slaBreaches.indexOf(kind)>=0`, L14943).
9. **Badge is priority-blind.** `updateBellBadge` counts all unread equally (L2260), so the triage logic the module is built around never reaches the badge — a stack of `low` toast confirmations reads identically to a stack of criticals.
10. **`markAllRead` has no null guard** on `document.getElementById('p-notifications-all')` (L2258), unlike `handleNotifClick` (L2280) which does guard. Harmless because the element is static markup, but asymmetric.
11. **Chip counts blank at boot.** Nothing calls `renderAllNotificationsPage()` in the init `setTimeout` block (L14556+) — only `updateBellBadge()` at L14565. The `#nf-cnt-*` spans stay empty until the page is opened.

### Dead code
- **`NOTIF_PRIORITY_LABEL`** (L2189) — declared, never referenced. Grep returns only L2189.
- **`DB.opsConfig.notifications.smsAlerts`** and **`.notifyOnDispute`** (L2571) — written and restored (L8006, L8011–8012) but never read by any logic.
- **Types `renewal`, `approval`, `complaint`** — full icon + priority + routing support exists (L2172, L2197, L2199, L2274–L2275) but **no runtime producer emits them**. They exist only as seed records N3, N4, N6.
- **Types `alert` and `complaint` have no click destination** in `handleNotifClick`. `alert` is by far the most common runtime type (16 producers), so every one of them depends entirely on its `action` closure; the two seed `alert`/`complaint` records (N1, N6) have no `action` and are therefore **click-dead** — they mark read and nothing else happens.

### UNVERIFIED
| Item | Reason |
|---|---|
| Click `action` argument for producers at L15887, L16719, L16723, L17293, L17306 | These five call sites span multiple source lines; only the first line was captured by grep. `type` and `title` are verified; the action closures were not read. |
| Whether `markAllRead`'s absence from `gateAll` is an intentional exemption | The `gateAll` header comment (L20740–L20755) mentions "seven genuinely trivial" ungated actions "listed at the bottom with the reason they stay ungated", but that list was not read. |
| Runtime behaviour of `display=''` on `#bell-count` given the inline `display:none` at L575 | Reasoned from DOM semantics (assigning `''` removes that style declaration, letting the `<span>` default to `inline`); not executed in a browser. |
| Exact values of `--blue-lt`, `--red`, `--amber`, `--blue`, `--border2`, `--bg2`, `--ghost`, `--muted`, `--white`, `--border` | Defined in the `:root` block above L345; not read for this module. |
| The exact expression at L12139 that selects `'alert'` vs `'warning'` (`isPattern`) | Only the single grepped line was read; the surrounding `maybeGenerateCashEvent` body (L12101–12140) was not. |

---

## 19. Line-number index

### HTML
| Lines | What |
|---|---|
| L345–347 | `.map-fchip` / `:hover` / `.on` CSS |
| L421 | `.notif-panel{width:360px!important}` (tablet breakpoint) |
| L446 | `.notif-panel{width:92vw!important;right:-8px!important}` (mobile breakpoint) |
| L573 | `#bell-btn` — `onclick="toggleNotifPanel(event)"` |
| L574 | bell SVG |
| L575 | `#bell-count` badge span |
| L576 | `#notif-panel` container |
| L1171 | `div.page#p-notifications-all` opens |
| L1172–1175 | page header `.ph` + "Mark all read" button (L1174) |
| L1176–1183 | filter chip row |
| L1177 | All chip (default `.on`) |
| L1178 | Unread chip |
| L1179 | 🔴 Critical chip |
| L1180 | 🟠 High chip |
| L1181 | 🔵 Medium chip |
| L1182 | ⚪ Low chip |
| L1184–1186 | `.card` + `#notifications-all-list` |
| L1187 | page closes |
| L1437 | Settings tab button — Alert Preferences (`stab.notifications`) |
| L1438 | Settings tab button — Push Notifications (`stab.push`) |
| L1907–1921 | Settings `#stab-notifications` panel |
| L1933 | Push Notifications panel description (separate system) |

### JS — core module
| Lines | What |
|---|---|
| L2168 | `titles['notifications-all']='Notifications'` |
| L2169 | `subs['notifications-all']='Every alert, sorted by priority'` |
| L2170 | `/* ════ NOTIFICATIONS ════ */` section marker |
| L2171–2174 | `notifIcon(t)` — 10-key map + 🔔 fallback |
| L2175–2187 | priority design-rationale comment block |
| L2188 | `NOTIF_PRIORITY_RANK` |
| L2189 | `NOTIF_PRIORITY_LABEL` (**unused**) |
| L2190–2201 | `notifPriority(n)` |
| L2202–2209 | `sortNotifsByPriority(list)` |
| L2210–2213 | `toggleMobileSidebar()` (adjacent, not part of this module) |
| L2214–2222 | `toggleNotifPanel(e)` |
| L2224–L2227 | document-level outside-click dismissal |
| L2228 | `NOTIF_PANEL_PREVIEW = 8` |
| L2229–2248 | `renderNotifPanel()` |
| L2249–2257 | `notifRowHtml(n)` (shared by panel + page) |
| L2258 | `markAllRead()` |
| L2259–2266 | `updateBellBadge()` |
| L2267–2281 | `handleNotifClick(id)` |
| L2282–2285 | `openAllNotifications()` |
| L2286–2290 | full-page design-rationale comment |
| L2291 | `_notifPageFilter='all'` |
| L2292–2297 | `setNotifFilter(f, chip)` |
| L2298–2327 | `renderAllNotificationsPage()` |
| L2300–2304 | filter predicates |
| L2306–2311 | chip count computation |
| L2313–2316 | empty state |
| L2318 | group definitions + labels |
| L2320–2325 | group loop |

### JS — data & plumbing
| Lines | What |
|---|---|
| L2566 | `DB` object literal opens |
| L2571 | `DB.opsConfig.notifications` (Settings — different concern) |
| L2773–2780 | `DB.notifications` seed (6 records) |
| L5264–5268 | toast→notification bridge rationale comment |
| L5269 | `function toast(msg,type,onClick,notify)` |
| L5294–L5296 | the bridge itself (`toastTypeToNotif` at L5295) |
| L8004–8014 | Settings alert-preferences load/save (**audited**, L8014) |
| L8774 | `window.go` authoritative definition |
| L8802 | router hook → `renderAllNotificationsPage()` |
| L9654–9660 | `pushOpsNotification` rationale comment |
| L9661–9666 | `pushOpsNotification(type,title,desc,action)` — **the only writer** |
| L9663 | `DB.notifications.unshift(...)` — the single mutation point |
| L9668–9673 | `openSubReqFromToast(sreqId)` helper (used as an `action`) |
| L11968 | `setInterval(tickEngine,1000)` — drives producers #21/#22 |
| L14556+ | boot `setTimeout` block |
| L14565 | `updateBellBadge()` at boot |
| L14933 | `DB.contacts` 2000-record cap (contrast: notifications have none) |
| L14937–14950 | `slaSweep()` / inner `fire()` — producer #30 |
| L15243–15247 | `lowRatingThreshold()` / `isLowRating()` |
| L15507–15521 | `fcNew()` — producer #31 |
| L21274 | Settings tab group `stabgrp.comms` |

### JS — the 36 producer call sites
L3694 · L4777 · L4838 · L4847 · L5112 · L5120 · **L5296 (toast bridge)** · L9092 · L9701 · L9705 · L9714 · L9719 · L10277 · L12005 · L12139 · L12180 · L12439 · L12453 · L12468 · L12490 · L12548 · L12590 · L13234 · L13309 · L13622 · L13625 · L13638 · L14033 · L14281 · L14945 · L15519 · L15887 · L16719 · L16723 · L17293 · L17306
