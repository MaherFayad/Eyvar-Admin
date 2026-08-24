# Verification Pass 1 — Coverage

> Question: is anything missing? | Audited: **60** documents (`docs/01-modules/*.md`, 3.0 MB) against the machine census
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines) · Baseline: `docs/00-index/GROUND-TRUTH-INVENTORY.md`
> Method: mechanical set-difference (extract universe from source → grep every member against the concatenated doc corpus). No impressions.
> **Directory listing was taken twice, as instructed.** At start of pass: **53** docs. At end of pass: **60** docs. Seven documents landed *during* the audit (see §9.3). Nothing was absent at both listings.

---

## 1. Verdict

Coverage is **materially complete but not total**. Every one of the 41 pages, all 21 settings sub-tabs, all 27 nav items, all 38 router branches, all 101 `DB.*` collections, all 86 `data-i18n` keys, all 49 `GATE_SWEEP` confirmation-gate entries and all 158 interactive element ids (`input`/`select`/`textarea`) now have at least one owning document. The residue is **24 distinct source symbols across 4 clusters** that no document mentions at all: 1 click handler, 1 non-click inline handler, 14 declared functions (2 of them `render*`), and 8 element ids. Three of those clusters are the *same feature* — the **new-subscription nearby-driver map** (`renderNsDriverMap` / `toggleNsDriverMap` / `ns-driver-map` / `ns-map-toggle-btn`) — which is a genuine, self-contained undocumented sub-feature, not a rounding error. A fourth, `renderDriverCircuit()` + `DB.circuits`, turns out to be **dead code with an orphaned collection** that no document identifies as dead. Separately, and more seriously for future audits, **the machine census itself is incomplete**: `GROUND-TRUTH-INVENTORY.md` censuses only `onclick` handlers and `render*` functions, and omits four whole dimensions this pass had to construct from scratch — DB collections (101), non-click inline handlers (35), the confirmation-gate registry (49), and the other 903 declared functions. Its element-id list also contains 16 non-ids (JS template artifacts such as `'+cselId+'`), and every entry in its render-function table carries a stray trailing `)`, so the baseline is not directly greppable. A coverage pass run against that baseline alone would have declared victory and missed all 24 items below.

| Coverage dimension | Verdict |
|---|---|
| Page coverage (41 `.page` divs) | **PASS** — 41/41 owned |
| Settings sub-tab coverage (21 `#stab-*`) | **PASS** — 21/21 owned |
| Nav-item coverage (27 sidebar items) | **PASS** — 27/27 |
| Router-branch coverage (38 `go()` branches) | **PASS** — 38/38 |
| Click-handler coverage (355 `onclick`) | **PASS with 1 gap** — 354/355 |
| Non-click inline handlers (35) | **PASS with 1 gap** — 34/35 *(dimension absent from census)* |
| `render*()` coverage (136) | **PASS with 2 gaps** — 134/136 |
| All declared functions (1,039) | **PASS with 14 gaps** — 1,025/1,039 *(dimension absent from census)* |
| Element-id coverage (605 literal ids) | **PASS with 8 gaps** — 597/605 |
| Interactive ids (158 input/select/textarea) | **PASS** — 158/158 |
| DB collection coverage (101) | **PASS** — 101/101 *(dimension absent from census)* |
| `data-i18n` key coverage (86) | **PASS** — 86/86 |
| `GATE_SWEEP` gate coverage (49) | **PASS** — 49/49 *(dimension absent from census)* |
| Structural completeness (60 docs) | **PASS** — every doc terminates in a line-number index |
| Empty / placeholder sections | **PASS** — zero empty sections across 60 docs |
| **Census baseline integrity** | **FAIL** — 4 dimensions missing, 16 phantom ids, unusable render-fn strings |

---

## 2. Coverage scorecard

| Dimension | Universe | Covered | Missing | % |
|---|---:|---:|---:|---:|
| Pages (`.page` divs) | 41 | 41 | 0 | 100.0 % |
| Settings sub-tabs (`#stab-*`) | 21 | 21 | 0 | 100.0 % |
| Sidebar nav items | 27 | 27 | 0 | 100.0 % |
| Router branches in `go()` | 38 | 38 | 0 | 100.0 % |
| `onclick` handlers | 355 | 354 | 1 | 99.7 % |
| Other inline handlers (`onchange`/`oninput`/`onkeyup`/…) | 35 | 34 | 1 | 97.1 % |
| `render*()` functions (declared) | 136 | 134 | 2 | 98.5 % |
| All declared functions (distinct names) | 1,039 | 1,025 | 14 | 98.7 % |
| Element ids (literal `id="…"`) | 605 | 597 | 8 | 98.7 % |
| …of which interactive (`input`/`select`/`textarea`) | 158 | 158 | 0 | 100.0 % |
| `DB.<collection>` keys | 101 | 101 | 0 | 100.0 % |
| `data-i18n` keys | 86 | 86 | 0 | 100.0 % |
| `GATE_SWEEP` gated actions | 49 | 49 | 0 | 100.0 % |
| Docs ending in a line-number index | 60 | 60 | 0 | 100.0 % |
| Sections with zero content lines | 60 docs | 0 found | — | clean |
| **Total distinct symbols audited** | **2,470** | **2,446** | **24** | **99.0 %** |

### 2.1 Universe reconciliation against the census

| Census claim | This pass measured | Note |
|---|---|---|
| 41 `.page` divs | 41 | confirmed |
| 21 settings panes | 21 | confirmed |
| 355 distinct `onclick` | 355 | confirmed |
| 136 distinct `render*()` | 136 | confirmed |
| 86 `data-i18n` keys | 86 | confirmed |
| 1,042 `function` declarations | **1,039 distinct names** | 3 names declared twice |
| **621 distinct element ids** | **605 literal ids** | ⚠️ census includes **16 JS template artifacts** — `'+cselId+'`, `'+fieldId+'`, `'+gradId+'`, `'+l.id+'`, `'+o.id+'`, `'+p.id+'`, `'+rule.id+'`, `'+s.id+'`, `'+scrollId+'`, `'+t.id+'`, `cfa-'+f.id+'`, `dde-'+dt[0]+'`, `docexp-'+dt[0]+'`, `docexp-card-'+a.id+'`, `drv-multisub-exc-'+d.id+'`, `drv-trust-'+d.id+'` — which are not ids |
| — | 101 `DB.*` collections | ❌ **dimension missing from census** |
| — | 35 non-click inline handlers | ❌ **dimension missing from census** |
| — | 49 `GATE_SWEEP` entries | ❌ **dimension missing from census** |
| — | 903 non-`render` functions | ❌ **dimension missing from census** |

---

## 3. Page coverage map

All 41 pages are owned. "Owning document" = the doc with the most `p-<id>` citations; ties broken by filename match.

| # | Page id | Owning document | Status |
|---:|---|---|---|
| 1 | `exec-overview` | `01-executive-overview.md` | ok |
| 2 | `corporate` | `05b-corporate-accounts.md` | ok |
| 3 | `corp-detail` | `05b-corporate-accounts.md` | ok |
| 4 | `fraud` | `02b-fraud-and-risk.md` | ok |
| 5 | `dashboard` | `03a-dashboard.md` | ok |
| 6 | `subscriptions` | `05a-subscriptions.md` | ok |
| 7 | `live` | `04-live-map.md` | ok |
| 8 | `trips` | `06a-all-trips.md` (also `04`) | ok |
| 9 | `renewal` | `07a-renewal-pipeline.md` | ok |
| 10 | `readiness` | `07b-trip-readiness.md` | ok |
| 11 | `drivers` | `08a-drivers.md` | ok |
| 12 | `riders` | `09a-riders.md` | ok |
| 13 | `finance` | `12a-finance.md` | ok |
| 14 | `wallets` | `12b-driver-wallets.md` | ok |
| 15 | `rwallets` | `12c-rider-wallets.md` | ok |
| 16 | `plans` | `14a-pricing-plans.md` | ok |
| 17 | `plan-edit` | `14b-plan-editor.md` | ok |
| 18 | `quickrides` | `06b-quick-rides-and-ride-requests.md` | ok |
| 19 | `my-account` | `00c-identity-permissions-and-audit.md` | ok — no `19-my-account.md` exists, but 00c owns it deliberately (`renderMaProfile`, `renderMaSecurity`, `renderMaPermissions`, and all 6 `ma-*` inputs are documented there) |
| 20 | `notifications-all` | `03c-notifications.md` | ok |
| 21 | `predictive` | `02a-predictive-signals.md` | ok |
| 22 | `coverage` | `10c-coverage-capacity.md` | ok |
| 23 | `compliance` | `10d-compliance.md` | ok |
| 24 | `safety` | `10e-safety.md` | ok |
| 25 | `growth` | `11a-promos-and-growth.md` | ok |
| 26 | `zones` | `11b-zones.md` | ok |
| 27 | `all-pending` | `08a-drivers.md` / `08b-driver-onboarding-applicants.md` | ok |
| 28 | `applicant-detail` | `08b-driver-onboarding-applicants.md` | ok |
| 29 | `support` | `13a-support-center-tickets.md` | ok — the duplicate router dispatch (`L8789` + `L8806`) **is** documented: `00a` §L290 and §L532, `13a` L36–37 |
| 30 | `ticket-detail` | `13a-support-center-tickets.md` | ok |
| 31 | `profile` | `09b-360-profile-system.md` | ok |
| 32 | `inbox` | `03b-work-inbox.md` | ok |
| 33 | `commitment` | `10b-plan-commitment.md` | ok |
| 34 | `fairness` | `10a-captain-fairness.md` | ok |
| 35 | `contacts` | `13c-contact-drivers.md` | ok — **was orphaned at start of pass** |
| 36 | `settings` | *split across* `15a`–`16j` | ⚠️ see §9.2 — no doc owns the settings **shell** |
| 37 | `audit-log` | `16k-audit-log.md` | ok — **was orphaned at start of pass** |
| 38 | `interventions` | `13d-interventions.md` | ok — **was orphaned at start of pass** |
| 39 | `requests` | `07c-requests.md` | ok |
| 40 | `requests-sub-all` | `07c-requests.md` | ok |
| 41 | `requests-instant-all` | `07c-requests.md` | ok |

**Page gaps: 0.** At the start of the pass there were 3 orphans — `contacts` (L1409), `interventions` (L2068), `audit-log` (L2051).

---

## 4. Settings tab coverage

All 21 `#stab-*` panes are owned. Verified by grepping the literal pane id across all 60 docs.

| Group | Tab key | Pane id | Owning document | Status |
|---|---|---|---|---|
| Workspace | `general` | `#stab-general` | `15a-settings-general.md` | ok |
| Workspace | `team` | `#stab-team` | `15b-settings-team-roles.md` | ok |
| Workspace | `permissions` | `#stab-permissions` | `15c-settings-permissions.md` | ok |
| Operations | `dispatch` | `#stab-dispatch` | `15f-settings-dispatch.md` | ok |
| Operations | `cities` | `#stab-cities` | `15g-settings-cities.md` | ok |
| Operations | `gateways` | `#stab-gateways` | `15h-settings-gateways.md` | ok |
| Operations | `limits` | `#stab-limits` | `15i-settings-limits.md` | ok |
| Operations | `cancelpolicy` | `#stab-cancelpolicy` | `15j-settings-cancellation-policy.md` | ok |
| Operations | `reasons` | `#stab-reasons` | `15k-settings-reason-codes-sla.md` | ok — **was orphaned at start** |
| Operations | `branding` | `#stab-branding` | `16a-settings-branding.md` | ok |
| Operations | `integrity` | `#stab-integrity` | `16b-settings-data-integrity.md` | ok |
| Operations | `rota` | `#stab-rota` | `16i-settings-rota-oncall.md` | ok — **was orphaned at start** |
| Operations | `ledger` | `#stab-ledger` | `16h-settings-ledger.md` | ok |
| Operations | `pricing` | `#stab-pricing` | `16g-settings-pricing-windows.md` | ok |
| System | `notifications` | `#stab-notifications` | `15d-settings-notifications.md` | ok |
| System | `push` | `#stab-push` | `16e-settings-push.md` | ok |
| System | `emails` | `#stab-emails` | `16d-settings-emails.md` | ok |
| System | `security` | `#stab-security` | `15e-settings-security.md` | ok |
| System | `legal` | `#stab-legal` | `16c-settings-legal-consent.md` | ok |
| System | `activity` | `#stab-activity` | `16j-settings-activity.md` | ok — **was orphaned at start** |
| System | `export` | `#stab-export` | `16f-settings-export.md` | ok |

Nested (non-Settings) sub-tabs from census §C.1 — all four covered: `pricingsub-plans` / `pricingsub-quickrides` (`14a`), `mailsub-inbox` / `mailsub-outbox` (`16d`).

**Settings tab gaps: 0.** Three orphans at the start of the pass (`reasons`, `rota`, `activity`).

---

## 5. Undocumented click handlers

Universe: 355 distinct `onclick="fn("` names. **354 documented, 1 missing.**

| Handler | Source line | Should be owned by | Evidence |
|---|---|---|---|
| `toggleNsDriverMap` | **L5877** (`window.toggleNsDriverMap=function(riderId,vehicleType)`); bound at **L4588** on `#ns-map-toggle-btn`; self-call at **L5911** | `05a-subscriptions.md` §Modals (New-subscription modal) | Zero occurrences across all 60 docs. Toggles the New-Subscription modal's driver picker between list view and map view. |

### 5.1 Handlers with a global-registry entry but no *module*-level owner

These appear only in `00a`/`00b`/`00c` (registries and inventories, not behavioural module docs). Not omissions in the strict sense, but each lacks an in-situ explanation.

| Handler | Only appears in | Should also be explained in |
|---|---|---|
| `cselToggle` (L5368) | `00a` — 1 mention | `00b-global-ui-systems.md` §7. The custom-select widget belongs there; its sibling `cselPick` sits in `14b` and `cselFilterOptions` is nowhere (§5.2). The three halves of one widget live in three different places. |
| `commitErasureRequest` | `00b` modal inventory only | `16c-settings-legal-consent.md`. `openErasureRequest` is in `13a`, `executeErasure`/`rejectErasure` in `09a`/`00c`, `renderErasureQueue` in `13c`. The GDPR-erasure flow is split across 5 docs with no owner. |
| `changeMaPassword`, `logOutSession`, `removeAvatar`, `saveMaProfile`, `commitUserSwitch` | `00b` + `00c` | Correctly owned by `00c` (My Account). No action needed. |

### 5.2 Undocumented non-click inline handlers *(dimension the census omits entirely)*

Universe: 35 distinct handlers bound via `onchange` / `oninput` / `onkeyup` / `onkeydown` / `onsubmit` / `onblur` / `onfocus` / `onerror` / `onload`. **34 documented, 1 missing.**

| Handler | Source line | Should be owned by |
|---|---|---|
| `cselFilterOptions` | declared **L5355** (`window.cselFilterOptions=function(input)`); bound **L5343** as `oninput=` on `.csel-search`, which is rendered only when `options.length>6`; re-invoked **L5378** | `00b-global-ui-systems.md` §7 (custom-select vocabulary) |

---

## 6. Undocumented render functions

Universe: 136 declared `render*()`. **134 documented, 2 missing.**

| Render function | Source line | Should be owned by | Notes |
|---|---|---|---|
| `renderNsDriverMap` | **L5887**, called from **L5884** | `05a-subscriptions.md` | Draws the nearby-driver canvas inside the New-Subscription modal. Mount point `#ns-driver-map` (L4590). Same cluster as `toggleNsDriverMap` (§5). |
| `renderDriverCircuit` | **L6313** | `08a-drivers.md` §Gaps/dead code | ⚠️ **This function is dead.** Its mount point `circuit-driver-select-wrap` occurs **exactly once in the whole 21,857-line file — inside its own body at L6316** (`document.getElementById('circuit-driver-select-wrap')`), so it always returns early at L6317. No call site exists anywhere except its own self-referential `customSelectHTML` callback at L6322. Its only data source `DB.circuits` (seeded L2810–L2822) has just 2 references in the file: the seed and L6315. `08a-drivers.md:131` lists `DB.circuits` in the data-model table **without flagging that its sole consumer is unreachable**. Highest-value single finding of this pass. |

### 6.1 Undocumented non-render functions *(dimension the census omits entirely)*

Universe: 1,039 distinct declared function names. **1,025 documented, 14 missing** — the 2 above plus these 12.

| Function | Source line | Refs | Should be owned by |
|---|---:|---:|---|
| `startTimer` | L5305 | 2 | `00b-global-ui-systems.md` §5 — toast auto-dismiss timer |
| `stopTimer` | L5306 | 3 | `00b-global-ui-systems.md` §5 — toast pause on close-click (L5311) and body-click (L5313) |
| `jsAttrStr` | L5332 | 2 | `00b-global-ui-systems.md` §7 — escapes strings for the `onclick=` attributes emitted by `customSelectHTML` |
| `capacityOpen` | L5580 | 2 | `05a-subscriptions.md` / `15f-settings-dispatch.md` — parses a driver capacity string; gates the *"Full — no open capacity"* disable at L5689 |
| `assignBtnClass` | L8382 | 2 | `04-live-map.md` — nearby-driver map; switches Assign button prominence via `deprioritizeAssign`, used at L8421 |
| `pinnedRowHTML` | L8384 | 2 | `04-live-map.md` — nearby-driver map pinned row, emitted at L8440 |
| `sectionLabel` | L8399 | 2 | `04-live-map.md` — nearby-driver map section header, emitted at L8441 |
| `makeRider` | L9800 | 2 | `03-data/DATA-MODEL.md` or `09a-riders.md` §Hardcoded — generates the 45 seed riders (loop at L9819) |
| `pushRide` | L9837 | 5 | `06b-quick-rides-and-ride-requests.md` §Hardcoded — seeds 40 ride requests across `searching` (14, L9846), `no_drivers` (13, L9847), `assigned` (13, L9848) |
| `pushSub` | L9854 | 4 | `07c-requests.md` §Hardcoded — seeds 40 subscription requests across `pending` (14, L9866), `assigned` (13, L9867), `expired` (13, L9868) |
| `autoSizeSelect` | L14494 | 2 | `00b-global-ui-systems.md` §7 — the global `change` delegate at L14549 that resizes every native `<select>` in the panel |
| `explainAt` | L20646 | 2 | `00b-global-ui-systems.md` — the explain/tooltip popover, invoked from the delegated click handler at L20678 |

---

## 7. Undocumented interactive element ids

**Interactive ids (`<input>` / `<select>` / `<textarea>` with a literal id): 158/158 covered — 0 gaps.** Every field the docs must capture as user-editable state is captured. This is the strongest dimension in the set.

Across all 605 literal element ids, **8 are absent from every document**:

| Element id | Source line | Kind | Should be owned by |
|---|---|---|---|
| `ns-map-toggle-btn` | **L4588** | button | `05a-subscriptions.md` — New-Subscription driver picker, list/map toggle |
| `ns-driver-map` | **L4590** | container (`display:none`) | `05a-subscriptions.md` — canvas host for `renderNsDriverMap` |
| `sub-track-modal` | **L4809** | modal body wrapper | `05a-subscriptions.md` — `renderSubTrackingWidget` shell (the function *is* documented; its root id is not) |
| `sub-tracking-outcome` | **L5155** | outcome banner slot | `05a-subscriptions.md` — `renderSubAcceptedTracking` outcome banner |
| `xloc-wrap` | **L9197** | modal body | `07b-trip-readiness.md` (7 `showEntityLocation` citations, the most of any doc) — the entity-location modal's canvas wrapper |
| `requests-sub-all-pager` | **L10167** | pagination host | `07c-requests.md` — `renderRequestsSubAll` pager mount |
| `requests-instant-all-pager` | **L10214** | pagination host | `07c-requests.md` — `renderRequestsInstantAll` pager mount |
| `presence-body` | **L21406** | table host | `16i-settings-rota-oncall.md` — `renderPresence` mount (function documented at `16i:463`; its mount id is not) |

**Pattern worth noting:** six of the eight are **render mount points** whose *renderer* is documented but whose *DOM anchor* is not. For a rebuild this matters — the docs describe what draws, not where it lands.

At the start of the pass this list was 31 ids long. The 23 that closed were the `contacts` cluster (`contacts-body`, `contacts-extra`, `queue-metrics`, `lc-entity`, `lc-mins`, `wrap-note`), the reason-codes cluster (`rc-count`, `rc-tbody`, `rc-new-code`, `rc-new-label`, `sla-tier-note`, `sla-tier-tbody`, `comp-tbody`, `meta-reasons`), the rota cluster (`stab-rota`, `rota-body`, `ho-notes`, `ho-transfer`), the erasure pair (`erasure-body`, `er-note`), the interventions pair (`iv-page-count`, `iv-page-list`), and `stab-activity`.

---

## 8. Undocumented DB collections

Universe: 101 distinct `DB.<key>` references extracted from the source. **101/101 mentioned — 0 gaps.**

One qualitative finding survives the mechanical test:

| Collection | Source line | Issue |
|---|---|---|
| `DB.circuits` | seeded **L2810–L2822**, read only at **L6315** | Documented as a row in `08a-drivers.md:131` and `08a:725`, but **only 2 references exist in the entire file** and its single consumer `renderDriverCircuit()` is unreachable (§6). The collection is effectively orphaned data and no document says so. |

Two collections were undocumented at the **start** of the pass and have since been covered: `DB.callSessions` (now `13c-contact-drivers.md`) and `DB.onCall` (now `16i-settings-rota-oncall.md`, which correctly flags the orphaned simple roster in its §15 appendix).

---

## 9. Truncated / structurally incomplete documents

**None.** All 60 documents terminate cleanly.

| Check | Result |
|---|---|
| Docs ending in `## N. Line-number index` | 58/60 |
| Docs ending in a deliberate appendix *after* the index | 2/60 — `16g-settings-pricing-windows.md` (§15 Appendix — `renderWindowSettings()`, correctly attributed to the Data-integrity tab) and `16i-settings-rota-oncall.md` (§15 Appendix — the orphaned `renderOnCall`/`DB.onCall` roster). Both intentional, not truncation. |
| Docs whose last line is a dangling table row or cut sentence | 0 |
| Docs missing a line-number index entirely | 0 |
| Docs with a heading and no content beneath it | 0 |

### 9.1 Section-numbering defect

| Document | Defect |
|---|---|
| `12c-rider-wallets.md` | 19 `##` headings but the numbering runs 1–18 — section **`## 16b. Financial risks & unguarded operations`** (L764) is inserted between §16 and §17 rather than renumbered. Cosmetic, but it breaks the "any two are comparable" promise in `docs/README.md` and any cross-doc §-number citation. |

### 9.2 Structural gap: the Settings shell has no owner

The `settings` page (`p-settings`, L1416) is the only one of the 41 pages with no single owning document — it is split across 21 tab docs, which is the right decomposition for the *tabs*. But the **shell** itself has no home: `SETTINGS_GROUPS` (L21270–21276), `switchSettingsTab` (22 `onclick` call sites), `fitSettingsNavHeight`, `reorderSettingsTabs` (L21278), `renderSettingsMeta` (L7339), the 3-group nav (L1419–1443), and the router's 33-call `settings` branch at **L8819** are documented only *incidentally*. The deepest treatment of `switchSettingsTab` (9 mentions), `fitSettingsNavHeight` (8) and `renderSettingsMeta` (8) is buried inside `16j-settings-activity.md` — a document about an unrelated tab. Everything is technically present; nothing is findable.

### 9.3 Documents that landed mid-audit

Seven documents did not exist at the opening directory listing and did exist at the closing one. Per the brief these are **not** counted as gaps, but each was verified to be substantive rather than a stub:

| Document | Bytes | `##` sections | Closes which gap |
|---|---:|---:|---|
| `00d-i18n-and-localisation.md` | 66,047 | 11 | i18n / localisation (declared in `docs/README.md`, previously unowned) |
| `13c-contact-drivers.md` | 87,295 | 18 | page `contacts` (L1409); `renderContactsPage`, `renderContactsExtra`, `renderQueueMetrics`, `renderCallBar`, `renderErasureQueue`; `DB.callSessions`; ids `contacts-body`, `contacts-extra`, `queue-metrics`, `lc-entity`, `lc-mins`, `wrap-note` |
| `13d-interventions.md` | 55,469 | 18 | page `interventions` (L2068); ids `iv-page-count`, `iv-page-list` |
| `15k-settings-reason-codes-sla.md` | 55,981 | 14 | `#stab-reasons` (L1430); ids `rc-count`, `rc-tbody`, `rc-new-code`, `rc-new-label`, `sla-tier-note`, `sla-tier-tbody`, `comp-tbody`, `meta-reasons` |
| `16i-settings-rota-oncall.md` | 40,824 | 15 | `#stab-rota` (L1739); `renderRota`, `renderOnCall`, `renderPresence`; `DB.onCall`; ids `rota-body`, `ho-notes`, `ho-transfer` |
| `16j-settings-activity.md` | 25,892 | 15 | `#stab-activity` (L2008) |
| `16k-audit-log.md` | 45,792 | 15 | page `audit-log` (L2051) |

For the record, the gap set as it stood at the **opening** listing (53 docs): 3 orphaned pages, 3 orphaned settings tabs, 5 undocumented `render*` functions, 3 undocumented click handlers, 2 undocumented DB collections and 31 undocumented element ids. Twenty-three of the 31 ids and all but the residue in §5–§7 were closed during the pass.

---

## 10. Empty or placeholder sections

**Zero empty sections across all 60 documents.** A heading-followed-immediately-by-heading sweep returned no hits.

A wider sweep for *thin* sections (≤2 non-blank content lines) returned 19 hits. **All 19 were opened and read individually, and all are legitimate explicit negative findings with line citations, not placeholders.** Representative samples:

| Document | Section | Content |
|---|---|---|
| `01-executive-overview.md` | §10 Modals opened | *"**None.** No `modal-overlay`, `modal-content`, `openModal`, or `closeModal` reference appears in the page HTML (`L583-631`) or in `renderExecOverview` / `renderExecTrendChart` / `renderTrendChart` / their helpers."* |
| `13b-disputes-and-lost-found.md` | §17 i18n keys | *"**None.** Neither card carries a `data-i18n` attribute (`L1368–L1375`), and every string … is hard-coded English."* |
| `14b-plan-editor.md` | §3 Sub-tabs | *"**None.** … The 'Section 1/2/3 of 3' badges (`L1087`, `L1107`, `L1115`) are static labels inside `.sec-head` blocks, not tabs — there is no JS that hides or shows a section."* |
| `09a-riders.md` | §6, §12 | *"Not applicable to this doc — see `09b-360-profile-system.md` §6/§12."* — explicit cross-reference; correct skeleton discipline |
| `15h`, `15i`, `15j`, `16e`-`settings-*.md` | §6 Modals opened | *"**No bespoke modals.** The only dialogs are the generic `confirmAction()` gates injected by `guardAction()` (L17819–17840)…"* |
| `16a-settings-branding.md` | §8 Enumerations | *"There is no enumerated list … The complete key set of the persisted object is: `logoUrl`, `wordmark`, `showWordmark`, `accent`, `maxUploadMB`."* |

A sweep for `TODO` / `TBD` / `FIXME` / *"coming soon"* / *"to be written"* / *"placeholder"* found **no authoring placeholders**. Every one of the ~40 hits was substantive prose quoting an HTML `placeholder=` attribute, or the source's own `.settings-soon` CSS class (documented in `00b`).

---

## 11. Prioritised remediation list

| # | Priority | Fix | Owning document |
|---:|---|---|---|
| 1 | **P0** | Document `renderDriverCircuit()` (L6313) **as dead code**: its mount `circuit-driver-select-wrap` exists nowhere in the file (1 occurrence, self-referential at L6316), so the function always returns early; and mark `DB.circuits` (L2810–L2822, 2 total references) as an orphaned collection whose only consumer is unreachable. | `08a-drivers.md` §Gaps/dead code + the data-model row at L131 |
| 2 | **P0** | Document the **New-Subscription nearby-driver map** as a unit — `toggleNsDriverMap` (L5877, bound L4588, self-call L5911), `renderNsDriverMap` (L5887, called L5884), `#ns-map-toggle-btn` (L4588), `#ns-driver-map` (L4590), and `capacityOpen` (L5580, which gates the *"Full — no open capacity"* disable at L5689). This is 5 of the 24 residual symbols and the only entirely undocumented user-facing feature found. | `05a-subscriptions.md` §Modals |
| 3 | **P1** | Regenerate `GROUND-TRUTH-INVENTORY.md`: add the four missing dimensions — **101 `DB.*` collections, 35 non-click inline handlers, 49 `GATE_SWEEP` entries, 903 non-`render` functions** — strip the **16 JS template artifacts** from the element-id list (621 → 605), and remove the stray trailing `)` from every entry in the render-function table so the baseline is greppable. Until this is done, any future coverage pass run against the baseline is blind to roughly 1,000 symbols. | `docs/00-index/GROUND-TRUTH-INVENTORY.md` + `METHODOLOGY.md` |
| 4 | **P1** | Add a **Settings shell** document (or an explicit §"Settings shell" in `15a`) owning `SETTINGS_GROUPS` (L21270–21276), `switchSettingsTab` (22 call sites), `fitSettingsNavHeight`, `reorderSettingsTabs` (L21278), `renderSettingsMeta` (L7339), and the 33-call `settings` router branch at **L8819**. Today the deepest coverage of the shell sits inside `16j-settings-activity.md`. | new `15-settings-shell.md`, or `15a-settings-general.md` |
| 5 | **P1** | Document the 8 missing **render mount points**: `#sub-track-modal` (L4809), `#sub-tracking-outcome` (L5155) → `05a`; `#xloc-wrap` (L9197) → `07b`; `#requests-sub-all-pager` (L10167), `#requests-instant-all-pager` (L10214) → `07c`; `#presence-body` (L21406) → `16i`; plus the two `ns-*` ids from item 2. | as listed |
| 6 | **P2** | Add the undocumented **global UI helpers** to `00b` §5/§7: `startTimer` (L5305), `stopTimer` (L5306), `jsAttrStr` (L5332), `cselFilterOptions` (L5355, bound L5343), `autoSizeSelect` (L14494, delegate L14549), `explainAt` (L20646, delegate L20678); and pull `cselToggle` (L5368) in alongside the already-documented `cselPick` so the custom-select widget is described in one place instead of three. | `00b-global-ui-systems.md` |
| 7 | **P2** | Document the 3 nearby-driver-map helpers `assignBtnClass` (L8382), `pinnedRowHTML` (L8384), `sectionLabel` (L8399) — the `deprioritizeAssign` behaviour they encode is a real UX rule, not plumbing. | `04-live-map.md` |
| 8 | **P2** | Document the 3 seed generators `makeRider` (L9800 → 45 riders at L9819), `pushRide` (L9837 → 40 ride requests), `pushSub` (L9854 → 40 subscription requests) in the Hardcoded/mock sections — the record counts the docs currently state are produced by these loops. | `09a` / `06b` / `07c` §Hardcoded, or `03-data/DATA-MODEL.md` |
| 9 | **P3** | Give the **GDPR erasure flow** a single owner. It is currently split across 5 documents: `openErasureRequest` (13a), `commitErasureRequest` (00b only), `executeErasure` / `rejectErasure` (09a, 00c), `renderErasureQueue` + `#erasure-body` + `#er-note` (13c). | `16c-settings-legal-consent.md` |
| 10 | **P3** | Renumber `12c-rider-wallets.md` — `## 16b.` at L764 breaks the shared skeleton's sequential numbering; sections should run 1–19. | `12c-rider-wallets.md` |

---

## Appendix — reproduction commands

```bash
S=eyvar_ops_panel_v40_fixed.html
cat docs/01-modules/*.md > corpus.txt

# click handlers (355)
grep -o 'onclick="[a-zA-Z_$][a-zA-Z0-9_$]*(' $S | sed 's/onclick="//' | tr -d '(' | sort -u

# non-click inline handlers (35) — dimension absent from the census
grep -oE 'on(change|input|keyup|keydown|submit|blur|focus|error|load)="[a-zA-Z_$][a-zA-Z0-9_$]*\(' $S \
  | sed -E 's/^on[a-z]+="//' | tr -d '(' | sort -u

# all declared functions (1,039 distinct) — dimension absent from the census
grep -oE 'function[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*' $S | awk '{print $2}' | sort -u

# literal element ids (605, vs the census's 621)
grep -oE 'id="[a-zA-Z][-a-zA-Z0-9_]*"' $S | sed 's/id="//;s/"//' | sort -u

# interactive ids only (158)
grep -oE '<(input|select|textarea)[^>]*id="[^"+]*"' $S | grep -oE 'id="[^"]*"' \
  | sed 's/id="//;s/"//' | sort -u

# DB collections (101) — dimension absent from the census
grep -oE 'DB\.[a-zA-Z_][a-zA-Z0-9_]*' $S | sed 's/DB\.//' | sort -u

# GATE_SWEEP entries (49) — dimension absent from the census
sed -n '20769,20890p' $S | grep -oE '^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*:' | tr -d ' :' | sort -u

# set-difference of any universe against the corpus
while read x; do grep -qF -- "$x" corpus.txt || echo "MISSING: $x"; done < universe.txt

# empty-section sweep
for f in docs/01-modules/*.md; do
  awk -v F="$f" '/^## /{if(h!=""&&c==0)printf "EMPTY: %s :: %s\n",F,h; h=$0; c=0; next}
                 {if($0 !~ /^[[:space:]]*$/)c++}
                 END{if(h!=""&&c==0)printf "EMPTY: %s :: %s\n",F,h}' "$f"
done
```
