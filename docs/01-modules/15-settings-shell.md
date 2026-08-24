# 15 — Settings shell (added in remediation)

> **Created by Verification Pass 1 remediation** (Pass 1 §9.2, item P1-4). `settings` was the only one of the 41 pages with no owning document: its 21 tabs are correctly decomposed into `15a`–`16j`, but the **chrome around them** — the nav column, the tab-switching mechanism, the group model, the height fitting, and the 33-call router branch — was documented only incidentally, most deeply inside `16j-settings-activity.md`, a document about an unrelated tab. This document owns the shell. It does **not** re-document any individual tab's fields; each tab doc keeps that.
>
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines). Every claim carries a line cite.

---

## 1. Purpose

The Settings page is a **single scalable container** for 21 configuration surfaces. The source states the contract explicitly at L7293–L7296:

> *"SETTINGS TAB NAVIGATION — Single scalable container: adding a new settings category means adding one button + one `.settings-panel` + one render/save pair — nothing else in this file needs to change."*

The shell's whole job is: show exactly one `.settings-panel` at a time, keep the nav rail readable at any viewport height, and group 21 flat buttons into a sequence an operator can navigate by frequency of use rather than by build order.

There is **one page div, one nav column and 21 sibling panels** — no routing, no history, no URL state. Which tab you are on is CSS class state (`.on`) and nothing else.

---

## 2. Entry points & routing

### 2.1 Reaching the page

| Entry | Line | Call | Lands on |
|---|---|---|---|
| Sidebar nav item | **L539** | `go('settings',this)` | **General** (forced, see §2.3) |
| On-call chip in the top bar | **L568** | `go('settings',null)` | **General** — *not* On-call & handover (see G3) |
| Work Inbox — PDPL erasure item | **L19204** | `go('settings',null)` via `QUEUE_ROUTE.erasure='settings'` (L19109) | **General** — and the erasure queue is not on this page at all (see `00c` §12) |
| Reason Codes & SLA panel deep-link | **L1811** | `switchSettingsTab('rota',document.querySelector('[data-tab=rota]'))` | **On-call & handover** — the only in-panel cross-tab link in the file |

### 2.2 The page div

`<div class="page" id="p-settings">` — **L1416**. Header `.ph` at L1417 (`<h1>Settings</h1>` / `<p>System configuration</p>` — both hard-coded English, no `data-i18n`). Shell wrapper `.settings-shell` at **L1418** (`display:flex;gap:16px;align-items:flex-start`).

### 2.3 The router branch — `go('settings')`, L8819

A single line inside `window.go` (L8780–L8826). It is by a wide margin the largest branch in the router: every other page branch calls between 1 and 4 renderers (compare `L8815` finance = 3, `L8816` wallets = 4, `L8818` subscriptions = 1).

**35 calls fire on every single navigation to Settings**, in source order:

| # | Call | Declared | Serves tab |
|---:|---|---|---|
| 1 | `renderTeamTable()` | L10451 | Team & Roles (`15b`) |
| 2 | `renderAuditLog()` | L9322 | Activity (`16j`) — fills `#audit-log-preview` (L2015) *and* the standalone page's `#audit-log` (L2064) |
| 3 | `renderOpsRadiusConfig()` | L8036 | Matching & Dispatch (`15f`) |
| 4 | `renderGeneralConfig()` | L7980 | General (`15a`) |
| 5 | `renderNotificationConfig()` | L8003 | Alert Preferences (`15d`) |
| 6 | `renderSecurityConfig()` | L8018 | Security (`15e`) |
| 7 | `renderCitiesTable()` | L7764 | Cities & Regions (`15g`) |
| 8 | `renderOpsLimitsTable()` | L7398 | Operational Limits (`15i`) |
| 9 | `renderCancellationPolicy()` | L7362 | Cancellation Policy (`15j`) |
| 10 | `renderEmailOutbox()` | L7557 | Email Log (`16d`) |
| 11 | `renderLeadInbox()` | L7521 | Email Log (`16d`) — `mailsub-inbox` |
| 12 | `renderPaymentGateways()` | L7461 | Payment Gateways (`15h`) |
| 13 | `renderSearchPhasesTable()` | L8087 | Matching & Dispatch (`15f`) |
| 14 | `renderPlanVisibility()` | L8122 | Pricing & rate card (`16g`) |
| 15 | `renderExportCounts()` | L7668 | Data Export (`16f`) |
| 16 | `renderSnapshotsTable()` | L7658 | Data Export (`16f`) |
| 17 | `renderPushOutbox()` | L7748 | Push Notifications (`16e`) |
| 18 | `renderLegalConsent()` | L3801 | Legal & Consent (`16c`) |
| 19 | `renderReasonCodesTable()` | L15070 | Reason Codes & SLA (`15k`) |
| 20 | `renderSlaPolicyForm()` | L15128 | Reason Codes & SLA (`15k`) |
| 21 | `renderCompPolicyTable()` | L15463 | Reason Codes & SLA (`15k`) |
| 22 | `renderOnCall()` | L15789 | **none — dead**, targets `#oncall-body` which does not exist (`16i` §15) |
| 23 | `renderCommitSettings()` | L17080 | Plan commitment (`10b`) — surfaced under Settings |
| 24 | `renderDispatchSettings()` | L17408 | Matching & Dispatch (`15f`) |
| 25 | `renderBrandingSettings()` | L18401 | Branding & logo (`16a`) |
| 26 | `renderIntegrity()` | L18576 | Data integrity (`16b`) |
| 27 | `renderRota()` | L19744 | On-call & handover (`16i`) |
| 28 | `renderLedger()` | L20069 | Ledger & money safety (`16h`) |
| 29 | `renderWindowSettings()` | L20492 | Data integrity (`16b`) — see `16g` §15 appendix |
| 30 | `renderPricing()` | L21622 | Pricing & rate card (`16g`) |
| 31 | `updateBroadcastAudienceCount()` | L7690 | Email Log (`16d`) |
| 32 | `updatePushAudienceCount()` | L7727 | Push Notifications (`16e`) |
| 33 | `renderSettingsMeta()` | L7339 | **all tabs** — the "last updated by" strip (§6) |
| 34 | `switchSettingsTab('general')` | L7314 | forces the visible tab |
| 35 | `fitSettingsNavHeight()` | L7297 | sizes the nav rail |

**33 of the 35 are data-refresh calls** (31 `render*` + 2 `update*`); the last two are shell operations.

**What that implies for page-load cost.** The shell is **eager, not lazy**. Opening Settings to change one checkbox rebuilds every table on all 21 tabs — 20 of which are `display:none` (`.settings-panel{display:none}` L240) and invisible. Concretely, on every visit the branch:

- rebuilds at least **19 full `<tbody>` innerHTML strings** (`team-tbody`, `cities-tbody`, `limits-tbody-rider`, `limits-tbody-driver`, `cancelpolicy-qr-tbody`, `cancelpolicy-sub-tbody`, `emails-tbody`, `inbox-tbody`, `gateways-tbody`, `phases-tbody`, `snapshots-tbody`, `push-tbody`, `rc-tbody`, `sla-tier-tbody`, `comp-tbody`, `commit-tbody`, `dispatch-tbody`, `rota-body`, `ledger-body`);
- re-runs `renderAuditLog()` (L9322), which filters and paginates the **whole** `DB.auditLog` and additionally renders the standalone Activity-log page's body at L2064 — a page the operator is not looking at;
- re-runs `renderPricing()` (L21622), `renderIntegrity()` (L18576), `renderWindowSettings()` (L20492) and `renderLedger()` (L20069), the four heaviest computed panels;
- calls `renderOnCall()` (#22), which does measurable work and then writes to an element that does not exist — pure waste on every load;
- calls `renderSettingsMeta()` (#33), which does 11 `getElementById` lookups plus 11 linear scans of `DB.auditLog` via `settingsLastUpdated` (L7335–L7338) — an O(11 × |auditLog|) sweep on every visit.

No memoisation, no dirty-flag, no per-tab lazy render exists: `switchSettingsTab` (L7314–L7331) **toggles CSS classes only** and calls no renderer. The cost is paid entirely at navigation time, and it is paid again in full every time the operator returns to Settings from anywhere.

Two second-order consequences worth recording:

1. **Any tab's renderer that throws kills the other 20.** L8819 is one unguarded statement sequence with no `try`/`catch`; an exception at call *n* prevents calls *n+1*…35 — including `switchSettingsTab('general')` and `fitSettingsNavHeight()`, so the page would render with no visible panel at all.
2. **Adding a 22nd tab means editing L8819**, which contradicts the L7293–L7296 promise that "nothing else in this file needs to change". The promise holds for the *nav and panel* mechanics; it does not hold for the router.

---

## 3. Layout map

```
#p-settings                                   L1416
├── .ph  (h1 "Settings" / p "System configuration")   L1417
└── .settings-shell   display:flex; gap:16px          L1418
    ├── .settings-nav-col   width:208px; position:sticky; top:0;
    │                       max-height:100vh; overflow-y:auto     L1419
    │   ├── .settings-tab-group-lbl  "Workspace"                  L1420
    │   ├── button.settings-tab.on   data-tab="general"           L1421
    │   ├── … 2 more                                              L1422–L1423
    │   ├── .settings-tab-group-lbl  "Operations"                 L1424
    │   ├── … 11 buttons                                          L1425–L1435
    │   ├── .settings-tab-group-lbl  "System"                     L1436
    │   └── … 7 buttons                                           L1437–L1443
    └── div  flex:1; min-width:0                                  L1445
        ├── .settings-panel.on  #stab-general                     L1448
        └── … 20 more sibling panels                              L1519–L2020
```

### 3.1 The 21 panes, in DOM order

| # | Pane id | Line | Owning doc |
|---:|---|---:|---|
| 1 | `#stab-general` | **L1448** | `15a-settings-general.md` |
| 2 | `#stab-team` | L1519 | `15b-settings-team-roles.md` |
| 3 | `#stab-permissions` | L1534 | `15c-settings-permissions.md` |
| 4 | `#stab-dispatch` | L1552 | `15f-settings-dispatch.md` |
| 5 | `#stab-cities` | L1622 | `15g-settings-cities.md` |
| 6 | `#stab-gateways` | L1651 | `15h-settings-gateways.md` |
| 7 | `#stab-limits` | L1668 | `15i-settings-limits.md` |
| 8 | `#stab-branding` | L1706 | `16a-settings-branding.md` |
| 9 | `#stab-pricing` | L1717 | `16g-settings-pricing-windows.md` |
| 10 | `#stab-ledger` | L1728 | `16h-settings-ledger.md` |
| 11 | `#stab-rota` | L1739 | `16i-settings-rota-oncall.md` |
| 12 | `#stab-integrity` | L1750 | `16b-settings-data-integrity.md` |
| 13 | `#stab-reasons` | L1771 | `15k-settings-reason-codes-sla.md` |
| 14 | `#stab-cancelpolicy` | L1825 | `15j-settings-cancellation-policy.md` |
| 15 | `#stab-emails` | L1845 | `16d-settings-emails.md` |
| 16 | `#stab-notifications` | L1907 | `15d-settings-notifications.md` |
| 17 | `#stab-push` | L1929 | `16e-settings-push.md` |
| 18 | `#stab-security` | L1976 | `15e-settings-security.md` |
| 19 | `#stab-legal` | L1997 | `16c-settings-legal-consent.md` |
| 20 | `#stab-activity` | L2008 | `16j-settings-activity.md` |
| 21 | `#stab-export` | L2020 | `16f-settings-export.md` |

**DOM order is not nav order and is not group order.** All three differ (§4).

### 3.2 Shell CSS

| Selector | Line | Effect |
|---|---:|---|
| `.settings-tab-group-lbl` | L233 | 9.5 px, weight 700, `--ghost`, uppercase, letter-spacing .6px, padding `14px 12px 6px` |
| `.settings-tab-group-lbl:first-child` | L234 | `padding-top:2px` — kills the leading gap above the first group |
| `.settings-tab` | L235 | flex row, gap 9px, 12.5 px, `width:100%`, `border-radius:8px`, `transition:all .12s` |
| `.settings-tab:hover` | L236 | `background:var(--bg2)` |
| **`.settings-tab.on`** | **L237** | `background:var(--blue-lt); color:var(--blue-dk); font-weight:600` — the only visual marker of the active tab |
| `.settings-tab-ic` | L238 | 24×24 rounded icon chip, `background:var(--bg2)` |
| `.settings-tab.on .settings-tab-ic` | L239 | chip flips to `var(--white)` when active |
| **`.settings-panel`** | **L240** | `display:none` — **the entire hide mechanism** |
| **`.settings-panel.on`** | **L241** | `display:flex; flex-direction:column; gap:14px` |
| `.settings-soon` | L242 | "coming soon" pill (documented in `00b`) |
| `.settings-panel-head` / `-ic` / `-title` / `-desc` | L243–L246 | per-panel header block, shared by all 21 panes |
| `.settings-nav-col[dir="rtl"] .settings-tab` | L401 | `text-align:right` |
| `.settings-nav-col[dir="rtl"] .settings-tab-group-lbl` | L402 | `text-align:right` |
| `body.lang-ar #stab-general .settings-panel-head` | L395 | RTL header alignment (General only) |
| `body.lang-ar #stab-security .settings-panel-head` | L399 | RTL header alignment (Security only) |

### 3.3 Responsive behaviour

Inside the mobile media block (L449–L456):

| Line | Rule |
|---:|---|
| L451 | `.settings-shell{flex-direction:column;gap:10px}` — nav moves above content |
| L452–L454 | `.settings-nav-col` becomes `width:100%!important; position:static!important; flex-direction:row!important; max-height:none!important; overflow-y:visible!important; overflow-x:auto; -webkit-overflow-scrolling:touch` — a horizontally scrollable strip |
| **L455** | **`.settings-nav-col .settings-tab-group-lbl{display:none}`** — group labels are hidden entirely on mobile, with the source's own reason: *"group labels don't fit a horizontal strip"* |
| L456 | `.settings-tab{flex-shrink:0;width:auto!important;white-space:nowrap}` |

Consequence: on mobile the whole grouping model (§4) is invisible, and the 21 tabs read as one flat horizontal scroll in `SETTINGS_GROUPS` order with no separators. `max-height:none!important` (L453) also means `fitSettingsNavHeight()`'s computed value is overridden by the `!important` on mobile — the function still runs and still sets `nav.style.maxHeight`, but the media query wins.

---

## 4. The group model — 3 groups in HTML, 6 groups at runtime

This is the single most misleading thing about the shell, and the reason it needed its own document: **what is in the markup is not what the operator sees.**

### 4.1 What the HTML declares — 3 groups (L1420, L1424, L1436)

| Group label | `data-i18n` | Line | Tabs, in markup order |
|---|---|---:|---|
| Workspace | `stabgrp.workspace` | L1420 | general, team, permissions |
| Operations | `stabgrp.operations` | L1424 | dispatch, cities, gateways, limits, cancelpolicy, reasons, branding, integrity, rota, ledger, pricing |
| System | `stabgrp.system` | L1436 | notifications, push, emails, security, legal, activity, export |

3 + 11 + 7 = 21.

### 4.2 What `SETTINGS_GROUPS` declares — 6 groups (L21270–L21277)

```js
var SETTINGS_GROUPS=[
  {label:'Daily operations', i18nKey:'stabgrp.daily_ops',  tabs:['reasons','rota','cancelpolicy','dispatch','limits']},
  {label:'Money',            i18nKey:'stabgrp.money',      tabs:['pricing','ledger','gateways','integrity']},
  {label:'People & access',  i18nKey:'stabgrp.people',     tabs:['team','permissions','security']},
  {label:'Customer comms',   i18nKey:'stabgrp.comms',      tabs:['notifications','push','emails']},
  {label:'Platform',         i18nKey:'stabgrp.platform',   tabs:['general','cities','branding','legal']},
  {label:'Records',          i18nKey:'stabgrp.records',    tabs:['activity','export']}
];
```

| # | Label | `i18nKey` | Tabs | Count |
|---:|---|---|---|---:|
| 1 | Daily operations | `stabgrp.daily_ops` | reasons, rota, cancelpolicy, dispatch, limits | 5 |
| 2 | Money | `stabgrp.money` | pricing, ledger, gateways, integrity | 4 |
| 3 | People & access | `stabgrp.people` | team, permissions, security | 3 |
| 4 | Customer comms | `stabgrp.comms` | notifications, push, emails | 3 |
| 5 | Platform | `stabgrp.platform` | general, cities, branding, legal | 4 |
| 6 | Records | `stabgrp.records` | activity, export | 2 |
| | | | **total** | **21** |

Every one of the 21 tab keys appears exactly once, so the `'Other'` fallback group (L21306–L21307) is **never produced** with the current markup.

### 4.3 The stated rationale — L21258–L21269

The source explains the reorder in a block comment, quoted in full because it is the design record:

> *"SETTINGS — REORDERED BY HOW OFTEN AND HOW URGENTLY THEY ARE OPENED. Twenty tabs had accumulated in the order they were built, which is the order nobody needs them in: Reason Codes and SLA — opened weekly and the thing that governs every ticket clock — sat ninth, below Cities. Branding sat above Data integrity. Grouped by purpose, ordered by frequency of use within each group, with the destructive and rarely-touched ones last so nobody wanders into them."*

Note the comment says **"Twenty tabs"** (L21261) while the file has **21** (L1421–L1443, and 21 entries across `SETTINGS_GROUPS`). The comment is one out of date. See G6.

### 4.4 The final rendered order

After `reorderSettingsTabs()` runs, the nav reads top-to-bottom:

```
DAILY OPERATIONS
  Reason Codes & SLA · On-call & handover · Cancellation Policy · Matching & Dispatch · Operational Limits
MONEY
  Pricing & rate card · Ledger & money safety · Payment Gateways · Data integrity
PEOPLE & ACCESS
  Team & Roles · Permissions · Security
CUSTOMER COMMS
  Alert Preferences · Push Notifications · Email Log
PLATFORM
  General · Cities & Regions · Branding & logo · Legal & Consent
RECORDS
  Activity · Data Export
```

**General — the tab the router always opens (L8819) — ends up 16th of 21, in the fifth group.** The button that carries `class="settings-tab on"` in the markup (L1421) is physically moved into the middle of the rail by the reorder, while remaining the highlighted one.

---

## 5. `reorderSettingsTabs()` — L21278–L21314

Called exactly once, from `presenceBoot()` at **L21393**.

| Step | Line | What it does |
|---:|---:|---|
| 1 | L21279 | Find the nav: `document.querySelector('.settings-nav') \|\| document.querySelector('[data-tab]') && document.querySelector('[data-tab]').parentElement` |
| 2 | L21280 | `if(!nav)return 0;` — returns a count, so the caller could assert; `presenceBoot` ignores it |
| 3 | L21281–L21282 | Index every `[data-tab]` button by its key into `byTab` |
| 4 | **L21288** | **Remove the three original static group headers** (`.settings-tab-group-lbl`) |
| 5 | L21289–L21299 | Build a `DocumentFragment`: for each of the 6 groups, append a fresh `.settings-tab-group-lbl` (with `textContent` = `g.label` and `data-i18n` = `g.i18nKey`), then move each present button into it and `delete byTab[t]` |
| 6 | L21302–L21310 | Any key still left in `byTab` is appended under a generated `'Other'` header (`data-i18n="stabgrp.other"`) — *"a reorder must never hide a tab"* (L21300–L21301) |
| 7 | L21311 | Remove `.settings-tab-group-lbl` **again** (see G4) |
| 8 | L21312 | `nav.appendChild(frag)` |
| 9 | L21313 | `return placed` |

The step-4 removal has its own comment (L21283–L21287) explaining the bug it fixes:

> *"Remove the ORIGINAL static group headers (Workspace/Operations/System) up front. Without this they were left behind in their original spot — with every one of their tab buttons about to be moved out below — so they rendered as three empty, purposeless headers stacked above the real (regrouped) navigation."*

**The `.settings-nav` selector at L21279 matches nothing.** A grep for the class across the whole file returns **one hit — L21279 itself**. The class in the markup is `.settings-nav-col` (L1419; also L401, L402, L452, L455, L7298, L7942). The function therefore *always* takes the fallback branch, which resolves `document.querySelector('[data-tab]')` → the first `[data-tab]` element in the document, the General button at **L1421** → `.parentElement` → the `.settings-nav-col` div at L1419. It works, by accident of DOM order. See G1.

---

## 6. `renderSettingsMeta()` — L7339–L7342, and the orphaned `#meta-reasons`

```js
function renderSettingsMeta(){
  var map={'meta-general':'general','meta-ops-radius':'ops-radius','meta-notifications':'notifications',
           'meta-security':'security','meta-cities':'cities','meta-limits':'limits','meta-gateways':'gateways',
           'meta-phases':'phases','meta-plan-visibility':'plan-visibility','meta-cancelpolicy':'cancellation-policy',
           'meta-multi-sub':'multi-sub-policy'};
  Object.keys(map).forEach(function(elId){var el=document.getElementById(elId);if(el)el.textContent=settingsLastUpdated(map[elId]);});
}
```

It writes a *"Last updated by `<name>` · `<ts>`"* string into a set of small elements scattered across the panes. The string comes from `settingsLastUpdated(entityId)` (L7335–L7338), which does a **linear `.find()` over `DB.auditLog`** for the first entry with `entityType==='settings'` and a matching `entityId`, falling back to `'No changes recorded yet'`. Source rationale, L7332–L7334: *"pulled straight from the audit log rather than a separate tracked field, so it's always in sync with what actually happened."*

### 6.1 The map, keyed to its markup

| Map key (element id) | Audit `entityId` | Element exists at | In pane |
|---|---|---:|---|
| `meta-general` | `general` | **L1514** | `#stab-general` |
| `meta-ops-radius` | `ops-radius` | **L1578** | `#stab-dispatch` |
| `meta-multi-sub` | `multi-sub-policy` | **L1590** | `#stab-dispatch` |
| `meta-phases` | `phases` | **L1600** | `#stab-dispatch` |
| `meta-plan-visibility` | `plan-visibility` | **L1617** | `#stab-dispatch` |
| `meta-cities` | `cities` | **L1645** | `#stab-cities` |
| `meta-gateways` | `gateways` | **L1663** | `#stab-gateways` |
| `meta-limits` | `limits` | **L1700** | `#stab-limits` |
| `meta-cancelpolicy` | `cancellation-policy` | **L1840** | `#stab-cancelpolicy` |
| `meta-notifications` | `notifications` | **L1921** | `#stab-notifications` |
| `meta-security` | `security` | **L1989** | `#stab-security` |

11 map entries, 11 live elements.

### 6.2 `#meta-reasons` (L1796) — an orphan in the other direction

A grep for `id="meta-*"` returns **12** elements. The twelfth is:

| Element id | Line | Pane | In `renderSettingsMeta`'s map? |
|---|---:|---|---|
| **`#meta-reasons`** | **L1796** | `#stab-reasons` (Reason Codes & SLA) | **No** |

`#meta-reasons` exists in the markup, sits in the same visual position as its 11 siblings, and **is never written to by anything**. A grep for the literal string `meta-reasons` across the whole 21,857-line file returns exactly one hit — the `id=` declaration at L1796. It renders permanently empty.

This is the mirror image of the `renderOnCall` / `#oncall-body` orphan (`16i` §15): there a renderer exists with no element; here an element exists with no renderer. Both are single-symbol omissions in the same subsystem.

**Fix would be one map entry**: adding `'meta-reasons':'reason-codes'` to L7340 — provided that is the `entityId` the reason-codes save path actually logs. **UNVERIFIED:** the exact `entityId` string used by the Reason Codes save action; `15k-settings-reason-codes-sla.md` owns that path and should be consulted before adding the key. Adding a key that does not match a logged `entityId` would render the permanent string *"No changes recorded yet"* rather than nothing — arguably worse, since it asserts a fact.

### 6.3 Who calls it

`renderSettingsMeta()` has 8 mentions in the corpus and multiple call sites in the source. Confirmed: the router branch (**L8819**, call #33) and every settings save path that wants its stamp refreshed — e.g. `saveGeneralConfig` (**L8000**) and `saveCancellationPolicy` (**L7384**). The pattern is *save → `logAction('config_updated','settings',<entityId>,…)` → re-render own table → `renderSettingsMeta()` → toast*.

---

## 7. `switchSettingsTab(key, el)` — L7314–L7331

The entire tab mechanism. **22 `onclick` call sites** plus one programmatic call.

```js
function switchSettingsTab(key,el){
  document.querySelectorAll('.settings-panel').forEach(function(p){p.classList.remove('on');});   /* L7315 */
  var panel=document.getElementById('stab-'+key);                                                /* L7316 */
  if(panel)panel.classList.add('on');                                                            /* L7317 */
  document.querySelectorAll('.settings-tab').forEach(function(t){t.classList.remove('on');});     /* L7318 */
  var activeBtn=null;                                                                            /* L7319 */
  if(el){el.classList.add('on');activeBtn=el;}                                                   /* L7320 */
  else{var btn=document.querySelector('.settings-tab[data-tab="'+key+'"]');
       if(btn){btn.classList.add('on');activeBtn=btn;}}                                           /* L7321 */
  if(activeBtn&&typeof activeBtn.scrollIntoView==='function'){activeBtn.scrollIntoView({block:'nearest'});}  /* L7328–L7330 */
}
```

| Property | Value |
|---|---|
| Panel id convention | `'stab-'+key` (L7316) — the key **is** the id suffix |
| Panel lookup guarded? | Yes (`if(panel)` L7317). An unknown key therefore **hides all 21 panels and shows none**, silently — no toast, no fallback to General. |
| Button lookup | `el` when passed (L7320); otherwise `[data-tab="<key>"]` (L7321) |
| Renders anything? | **No.** Class toggling only. All data was already rendered by L8819. |
| Scroll sync | `activeBtn.scrollIntoView({block:'nearest'})` (L7329) |

The `scrollIntoView` has its own rationale at L7322–L7327, which is also the file's own acknowledgement of the 6-group model:

> *"The nav column scrolls independently of the content (needed so a tall 21-tab/6-group list stays fully reachable once pinned at the top). Without this, switching tabs left the nav's own scroll wherever it happened to be — you could be looking at 'Reason Codes & SLA' while the nav showed 'Records' three groups away. Keep them in sync on every switch."*

### 7.1 All 23 invocations

| Kind | Lines | Note |
|---|---|---|
| Nav buttons — 21 | L1421, L1422, L1423, L1425, L1426, L1427, L1428, L1429, L1430, L1431, L1432, L1433, L1434, L1435, L1437, L1438, L1439, L1440, L1441, L1442, L1443 | `switchSettingsTab('<key>',this)` — always passes `this`, so L7320 is taken |
| Cross-tab deep link — 1 | **L1811** | `switchSettingsTab('rota',document.querySelector('[data-tab=rota]'))` — inside `#stab-reasons`, button labelled *"Open the on-call rota"*. Note the unquoted attribute selector `[data-tab=rota]`, valid only because `rota` is a bare identifier. |
| Router — 1 | **L8819** | `switchSettingsTab('general')` — **one argument**, so `el` is `undefined` and L7321 runs the `[data-tab="general"]` lookup |

22 `onclick` sites + 1 programmatic = 23 total.

---

## 8. `fitSettingsNavHeight()` — L7297–L7310

```js
function fitSettingsNavHeight(){
  var nav=document.querySelector('.settings-nav-col');
  if(!nav)return;
  var top=nav.getBoundingClientRect().top;
  var available=window.innerHeight-top-12;   /* 12px bottom breathing room */
  nav.style.maxHeight=Math.max(120,available)+'px';
}
```

| Property | Value | Line |
|---|---|---:|
| Selector | `.settings-nav-col` — **correct**, unlike L21279 | L7298 |
| Guard | `if(!nav)return;` | L7299 |
| Formula | `maxHeight = max(120, window.innerHeight − rect.top − 12) px` | L7308–L7309 |
| Floor | **120 px** hard minimum | L7309 |
| Bottom padding | **12 px**, commented *"12px bottom breathing room"* | L7308 |
| Overrides | The markup's static `max-height:100vh` (L1419) |

The reason it exists is documented at L7300–L7306:

> *"`position:sticky` measures 'top:0' against the nearest scrolling ancestor (`#p-settings`, which has `overflow-y:auto`) — not the raw browser viewport. A guessed `max-height:100vh` overshoots by however tall the fixed top bar + this page's own header are, so the bottom of the nav still ends up below the visible screen edge with no way to scroll it into view. Measure the real remaining space instead of guessing it."*

### 8.1 Call sites — 2

| Trigger | Line | Condition |
|---|---:|---|
| Router | **L8819** | unconditional, last call in the branch |
| `resize` listener | **L7311–L7313** | `if(document.getElementById('p-settings') && …classList.contains('on')) fitSettingsNavHeight();` — only recomputes while the Settings page is actually visible |

It is **not** called on tab switch (`switchSettingsTab` L7314–L7331 does not call it) and **not** called after `reorderSettingsTabs()` (L21393 calls only the reorder). See G2.

---

## 9. Fields

The shell itself owns **no user-editable fields** — every input on the Settings page belongs to one of the 21 panes and is documented in that pane's own file. The shell's own "fields" are the read-only meta strips of §6.

| Shell element | Line | Kind | Written by | Editable |
|---|---:|---|---|---|
| `.settings-tab` × 21 | L1421–L1443 | `<button>` | static markup; **moved** by `reorderSettingsTabs` (L21298) | no |
| `.settings-tab-group-lbl` × 3 (static) | L1420, L1424, L1436 | `<div>` | static markup; **destroyed** by `reorderSettingsTabs` (L21288) | no |
| `.settings-tab-group-lbl` × 6 (runtime) | created L21293–L21296 | `<div>` | `reorderSettingsTabs` | no |
| `#meta-*` × 11 | L1514, L1578, L1590, L1600, L1617, L1645, L1663, L1700, L1840, L1921, L1989 | text slot | `renderSettingsMeta` L7341 | no |
| `#meta-reasons` | **L1796** | text slot | **nothing** (§6.2) | no |
| `.settings-panel` × 21 | L1448–L2020 | `<div>` | tab docs | n/a |

---

## 10. Actions

| Action | Trigger | Function | Line | Permission gate | Confirmation gate |
|---|---|---|---:|---|---|
| Switch tab | click on any of 21 nav buttons, or the L1811 deep link | `switchSettingsTab` | L7314 | **none** | **none** |
| Open Settings | sidebar L539, chip L568, inbox L19204 | `go('settings',…)` → L8819 | L8819 | **none** | **none** |
| Reorder nav | boot only | `reorderSettingsTabs` | L21278, called L21393 | n/a | n/a |
| Fit nav height | router L8819, window `resize` L7311 | `fitSettingsNavHeight` | L7297 | n/a | n/a |
| Refresh "last updated" strips | router L8819, every settings save (e.g. L7384, L8000) | `renderSettingsMeta` | L7339 | n/a | n/a |

**The shell has no permission gate of its own.** `requirePerm('manage_settings')` is enforced *per save action* inside each tab (e.g. `saveGeneralConfig` L7987, `saveCancellationPolicy` L7370, `executeErasure` L16015) — never at the page or tab boundary. Any signed-in operator can reach Settings and read every pane, including Ledger, Permissions and Security; only *writing* is gated. See G5.

---

## 11. Cross-module effects

| Effect | Mechanism | Lines |
|---|---|---|
| Opening Settings re-renders the **standalone Activity-log page** | `renderAuditLog()` (call #2 of L8819) writes `#audit-log` at L2064 inside `p-audit-log`, as well as `#audit-log-preview` at L2015 | L8819, L9322, L9325, L9348, L2015, L2064 |
| Opening Settings re-runs the **Plan-commitment** settings renderer | `renderCommitSettings()` (call #23) — a `10b-plan-commitment.md` surface hosted under Settings | L8819, L17080 |
| Opening Settings recomputes the **pricing rate card** | `renderPricing()` (call #30) | L8819, L21622 |
| Saving General **switches the whole panel's language** | `saveGeneralConfig` → `applyLanguage(g.language)` L7998, then `renderSettingsMeta()` L8000 | L7986–L8002 |
| Saving General **re-applies site branding** | `applySiteBranding()` at L7984 and L7997 | L7984, L7997 |
| Every settings save writes an **audit entry** that the meta strips then read back | `logAction('config_updated','settings',<entityId>,…)` → `settingsLastUpdated` | L7383, L7999, L7335–L7338 |
| The **boot order couples Settings to presence** | `reorderSettingsTabs()` is the third statement of `presenceBoot()` (after `mountUxBlocks()` L21391 and `liveSubtitles()` L21392) | L21382–L21394 |
| **Work Inbox** routes PDPL erasure to this page | `QUEUE_ROUTE.erasure='settings'` L19109, `action:"go('settings',null)"` L19204 — but no erasure queue exists here (see `00c` §12) | L19109, L19204 |

### 11.1 Relationship to the 21 tab documents

This document is the **shell only**. The division of labour:

| Concern | Owned here | Owned by the tab doc |
|---|---|---|
| Nav column, groups, ordering, reorder | ✔ | |
| `switchSettingsTab`, `.settings-panel.on` mechanism | ✔ | |
| `fitSettingsNavHeight`, responsive strip | ✔ | |
| L8819 router branch as a whole, and its cost | ✔ | |
| `renderSettingsMeta` map + `#meta-reasons` orphan | ✔ | |
| Which pane a given `#stab-*` id is, and where | ✔ (index, §3.1) | |
| Every field, table, action, formula, badge, i18n key inside a pane | | ✔ |
| The individual `render*` bodies listed in §2.3 | | ✔ |

Two tab docs already carry deliberate appendices about shell-adjacent orphans, and they remain authoritative for those:

- `16i-settings-rota-oncall.md` §15 — `renderOnCall` / `DB.onCall` / the missing `#oncall-body` (call #22 of L8819).
- `16g-settings-pricing-windows.md` §15 — `renderWindowSettings()` (call #29), correctly attributed to the Data-integrity tab rather than Pricing.

`16j-settings-activity.md` previously held the deepest incidental treatment of `switchSettingsTab` (9 mentions), `fitSettingsNavHeight` (8) and `renderSettingsMeta` (8). **Nothing in `16j` was removed**; this document supersedes it as the place to look, and `16j` remains correct about its own tab.

---

## 12. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---:|---|
| Nav column width `208px` | L1419 | overridden to `100%!important` on mobile (L452) |
| `max-height:100vh` (static) | L1419 | superseded at runtime by `fitSettingsNavHeight` (L7309) |
| `scrollbar-color:#C7CCD3 transparent` | L1419 | the one hard-coded hex in the shell markup; every other colour is a token |
| Bottom breathing room `12` px | L7308 | |
| Nav minimum height `120` px | L7309 | |
| Shell gap `16px` / panel gap `14px` / mobile gap `10px` | L1418 / L240 | L451 for mobile |
| Tab transition `.12s` | L235, L238 | |
| The 6 group labels + `'Other'` | L21271–L21276, L21306 | English literals stored **next to** their `i18nKey`, not derived from it |
| The 21 tab keys | L21271–L21276 | duplicated between `SETTINGS_GROUPS` and the `data-tab` attributes at L1421–L1443 — two lists that must be kept in sync by hand |
| The 21 tab icons (emoji) | L1421–L1443 | inside `.settings-tab-ic` spans; not tokenised |
| The 11 `renderSettingsMeta` map pairs | L7340 | third hand-maintained list of settings keys |
| `'No changes recorded yet'` | L7338 | fallback string, hard-coded English, no `data-i18n` |

---

## 13. i18n keys

The shell's translatable surface is the group labels and the tab labels. Arabic values live at L7914–L7921.

### 13.1 Group labels — 10 keys

| Key | English | Arabic | English at | Arabic at |
|---|---|---|---:|---:|
| `stabgrp.workspace` | Workspace | مساحة العمل | L1420 | L7914 |
| `stabgrp.operations` | Operations | العمليات | L1424 | L7914 |
| `stabgrp.system` | System | النظام | L1436 | L7914 |
| `stabgrp.daily_ops` | Daily operations | العمليات اليومية | L21271 | L7915 |
| `stabgrp.money` | Money | المال | L21272 | L7915 |
| `stabgrp.people` | People & access | الأشخاص والصلاحيات | L21273 | L7915 |
| `stabgrp.comms` | Customer comms | تواصل العملاء | L21274 | L7916 |
| `stabgrp.platform` | Platform | المنصة | L21275 | L7916 |
| `stabgrp.records` | Records | السجلات | L21276 | L7916 |
| `stabgrp.other` | Other | أخرى | L21307 | L7916 |

**Only 6 of the 10 are ever visible.** `stabgrp.workspace`, `.operations` and `.system` are attached to the three headers `reorderSettingsTabs` destroys at L21288, and `stabgrp.other` is attached to a header that is only built when a `data-tab` key is missing from `SETTINGS_GROUPS` — which never happens (§4.2). Four of the ten translations are dead weight the moment boot completes. They are *not* wrong to keep: they are the fallback vocabulary if the reorder ever fails to run (see G2).

### 13.2 Tab labels — 21 keys `stab.*`

Declared on the `<span>` inside each button (L1421–L1443), translated at L7911 (`stab.reasons`) and L7917–L7921. Individual tab docs own their own key; the shell's contribution is that **`reorderSettingsTabs` moves the buttons without touching their `data-i18n` spans** (it moves whole `[data-tab]` elements, L21298), so translation survives the reorder intact.

### 13.3 Not translated

`<h1>Settings</h1>` and `<p>System configuration</p>` at **L1417** carry no `data-i18n` attribute — the page's own title is English-only in an otherwise translated shell.

---

## 14. Gaps, dead code, UNVERIFIED items

| # | Severity | Finding | Evidence |
|---|---|---|---|
| **G1** | Medium | **`reorderSettingsTabs` queries a class that does not exist.** L21279 asks for `.settings-nav`; the markup's class is `.settings-nav-col` (L1419). A grep for `settings-nav` returns L21279 as the *only* hit outside `settings-nav-col`. The function survives on its fallback — `document.querySelector('[data-tab]').parentElement` — which happens to resolve to the right element only because the first `[data-tab]` in the document is the General button at L1421. Insert any element carrying a `data-tab` attribute earlier in the DOM and the reorder silently retargets. | L21279 vs L1419, L401, L402, L452, L455, L7298, L7942 |
| **G2** | Medium | **The reorder is boot-only and unguarded.** `reorderSettingsTabs()` is called once, from `presenceBoot()` L21393. If `presenceBoot` throws before that line — it runs `markPresence` (L21383), a `DB.teamUsers` filter (L21386), `mountUxBlocks()` (L21391) and `liveSubtitles()` (L21392) first — the nav stays in its 3-group markup order and no error surfaces. Nothing re-runs it, and `switchSettingsTab` does not verify group state. | L21382–L21394 |
| **G3** | Medium | **Two entry points land on the wrong tab.** L8819 unconditionally forces `switchSettingsTab('general')`, so the on-call chip (L568, `title="Who is on call right now"`) and the Work Inbox erasure item (L19204) both open Settings → **General**, 16th in the rail, in a different group from what the operator asked for. The mechanism to do better already exists and is used once at L1811. `go()` accepts no tab argument (L8780). | L568, L8819, L19204, L1811 |
| **G4** | Low | **`reorderSettingsTabs` removes `.settings-tab-group-lbl` twice.** L21288 (before building) and L21311 (after building the fragment, before `appendChild`). By L21311 the only remaining labels in `nav` are the originals already removed at L21288 — the new ones are still in the detached `DocumentFragment` and are unaffected. L21311 is a no-op in every reachable state. Harmless, but it means a future reader cannot tell which removal is load-bearing. | L21288, L21311, L21312 |
| **G5** | Low | **No permission gate on the shell.** No `requirePerm` call exists in `switchSettingsTab` (L7314–L7331), in the L8819 branch, or on any of the 21 nav buttons (L1421–L1443). Read access to Ledger, Permissions, Security and Legal is ungated; only saves are gated, per-action. | L7314–L7331, L8819, L1421–L1443, vs L7370, L7987, L16015 |
| **G6** | Low | **The reorder comment says "Twenty tabs" (L21261); there are 21.** Cosmetic, but the comment is the design record for the grouping and is now one out of date with its own array. | L21261 vs L21271–L21276, L1421–L1443 |
| **G7** | Low | **Three parallel hand-maintained lists of settings keys.** The `data-tab` attributes (L1421–L1443), `SETTINGS_GROUPS.tabs` (L21271–L21276), and `renderSettingsMeta`'s map (L7340) must all be updated together, and nothing checks them against each other. `#meta-reasons` (§6.2) is what a drift between list 1 and list 3 looks like. | L1421–L1443, L21271–L21276, L7340, L1796 |
| **G8** | Low | **`#meta-reasons` (L1796) is written by nothing** — one occurrence in the whole file. Renders permanently blank. | L1796, L7340 |
| **G9** | Low | **Unknown tab key hides everything.** `switchSettingsTab('typo')` clears `.on` from all 21 panels (L7315), finds no `#stab-typo` (L7316), and the `if(panel)` guard (L7317) means no panel is restored. The operator gets an empty right-hand column with no message. No caller currently passes a bad key. | L7315–L7317 |
| **G10** | Low | **The eager router branch has no error isolation.** L8819 is a single unguarded statement list; a throw at call *n* skips calls *n+1*…35, including `switchSettingsTab('general')` (#34) and `fitSettingsNavHeight()` (#35). | L8819 |

### 14.1 UNVERIFIED

| Item | Why |
|---|---|
| Whether adding `'meta-reasons':'reason-codes'` to L7340 would populate the strip | Requires the exact `entityId` string the Reason Codes save path passes to `logAction`. That path is owned by `15k-settings-reason-codes-sla.md`; not re-derived here. |
| Real-world cost of the 33-call branch in milliseconds | No profiling data exists and the file has no instrumentation. §2.3 states the *work performed* (counted from the source), not a measured duration. |
| Whether `.settings-nav` was ever the markup class in an earlier revision | No history is available — only `eyvar_ops_panel_v40_fixed.html` is in scope. L21279 is consistent with a renamed class, but that is inference, not evidence. |

---

## 15. Line-number index

| Symbol | Lines |
|---|---|
| `.settings-tab-group-lbl` CSS | 233–234 |
| `.settings-tab` / `:hover` / `.on` CSS | 235–237 |
| `.settings-tab-ic` / `.on .settings-tab-ic` | 238–239 |
| **`.settings-panel` / `.settings-panel.on`** | **240–241** |
| `.settings-soon` | 242 |
| `.settings-panel-head` / `-ic` / `-title` / `-desc` | 243–246 |
| `body.lang-ar` panel-head overrides | 395, 399 |
| `.settings-nav-col[dir="rtl"]` overrides | 401–402 |
| Mobile media block for the shell | 449–456 |
| Sidebar nav item `go('settings',this)` | 539 |
| On-call chip `go('settings',null)` | 568 |
| **`#p-settings`** | **1416** |
| Page header `.ph` (untranslated) | 1417 |
| `.settings-shell` | 1418 |
| **`.settings-nav-col`** | **1419** |
| Static group label "Workspace" | 1420 |
| Nav buttons — Workspace group | 1421–1423 |
| Static group label "Operations" | 1424 |
| Nav buttons — Operations group | 1425–1435 |
| Static group label "System" | 1436 |
| Nav buttons — System group | 1437–1443 |
| Content column `flex:1;min-width:0` | 1445 |
| `#stab-general` … `#stab-export` (21 panes) | 1448, 1519, 1534, 1552, 1622, 1651, 1668, 1706, 1717, 1728, 1739, 1750, 1771, 1825, 1845, 1907, 1929, 1976, 1997, 2008, 2020 |
| `#meta-general` | 1514 |
| `#meta-ops-radius` / `#meta-multi-sub` / `#meta-phases` / `#meta-plan-visibility` | 1578 / 1590 / 1600 / 1617 |
| `#meta-cities` / `#meta-gateways` / `#meta-limits` | 1645 / 1663 / 1700 |
| **`#meta-reasons` (orphan)** | **1796** |
| Cross-tab deep link → rota | **1811** |
| `#meta-cancelpolicy` / `#meta-notifications` / `#meta-security` | 1840 / 1921 / 1989 |
| `#audit-log-preview` (in `#stab-activity`) | 2015 |
| `#p-audit-log` / `#audit-log` | 2051 / 2064 |
| `renderCancellationPolicy` → `renderSettingsMeta` | 7384 |
| **`fitSettingsNavHeight()`** | **7297–7310** |
| `resize` listener (guarded) | 7311–7313 |
| **`switchSettingsTab(key,el)`** | **7314–7331** |
| `settingsLastUpdated(entityId)` | 7335–7338 |
| **`renderSettingsMeta()`** | **7339–7342** |
| `renderGeneralConfig` / `saveGeneralConfig` → `renderSettingsMeta` | 7980–7985 / 7986–8002, 8000 |
| Arabic `stabgrp.*` | 7914–7916 |
| Arabic `stab.*` | 7911, 7917–7921 |
| `window.go` | 8780–8826 |
| **The settings router branch (35 calls)** | **8819** |
| `renderAuditLog()` | 9322 |
| `QUEUE_ROUTE.erasure='settings'` | 19109 |
| Work-inbox erasure item → `go('settings')` | 19204 |
| Reorder rationale comment | 21258–21269 |
| **`SETTINGS_GROUPS`** | **21270–21277** |
| **`reorderSettingsTabs()`** | **21278–21314** |
| — nav lookup (wrong class + fallback) | 21279 |
| — original-header removal + rationale | 21283–21288 |
| — group loop | 21290–21299 |
| — leftovers / `'Other'` | 21300–21310 |
| — second (no-op) header removal | 21311 |
| `presenceBoot()` → `reorderSettingsTabs()` | 21382–21394, **21393** |
