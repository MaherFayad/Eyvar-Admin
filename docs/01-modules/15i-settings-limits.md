# Settings Tab: Operational Limits

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`div#p-settings`, L1416) | Pane `#stab-limits` **L1668–1704** | Tab button **L1428** (`data-tab="limits"`, icon 🚦, `data-i18n="stab.limits"`) | Render fn `renderOpsLimitsTable()` **L7398–7404** | Data `DB.opsLimits` **L2583–L2592** (the 8 row literals are **L2584–L2591**)

---

## 1. Purpose

Caps on rider and driver behaviour, stored as a fully self-describing array so new limits can be added from the UI without code changes (comment L2578–2583). Each row declares whether it is actually wired to a live check (`enforced:true`) or merely stored for a future hook (`enforced:false`).

Panel copy (L1673): *"Caps on rider and driver behavior. **● Live** rows actually affect the system now — **● Tracked** rows are saved and ready for a future enforcement hook. Turn a row off and its value greys out immediately, so it's obvious it isn't being applied."*

This is the one Settings tab where the honesty label is verifiably correct: grep confirms exactly the three `enforced:true` keys are read outside Settings, and exactly the five `enforced:false` keys are read nowhere (§9).

## 2. Layout map

The pane is **five stacked `.card` blocks**, not one:

| Card | Lines | Contents |
|---|---|---|
| 1 — Header | L1669–1675 | icon 🚦, title "Operational limits", description with the Live/Tracked legend |
| 2 — Rider limits | L1677–1680 | `<h2>🧍 Rider limits</h2>`, table, `tbody#limits-tbody-rider` |
| 3 — Driver limits | L1682–1685 | `<h2>🚗 Driver limits</h2>`, table, `tbody#limits-tbody-driver` |
| 4 — Add a custom limit | L1687–1696 | `<h2>➕ Add a custom limit</h2>` + subtitle "Appears in the matching table above the moment you add it"; 4 inputs + Add button on `var(--bg2)` |
| 5 — Save bar | L1698–1703 | "Save all limits" button (left) + `span.settings-meta#meta-limits` (right, `padding:0;border:none;background:none`) |

Both limit tables share the same `thead` (L1679 / L1684): `Limit` (`width:34%`) · `Value` · `Unit` · `Enabled` · `Enforcement` · *(unlabelled actions column)*.

## 3. Settings fields — every field

### 3a. Add-a-custom-limit composer (card 4)

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `new-limit-label` (L1689) | "Limit name" | `input[type=text]`, placeholder "e.g. Max free cancellations", `max-width:220px` | empty | — | free text | `addCustomLimit()` L7407: `if(!label){toast('⚠ Give the new limit a name first','warn');return;}` — **the only validated field**. No duplicate check, no length cap, no HTML escaping | `DB.opsLimits[].label` | Displayed as the row's `td-name` (L7391). No behavioural effect |
| `new-limit-target` (L1690) | "Applies to" | `select`, `max-width:130px` | `rider` (first option) | — | **Exactly 2 options: `<option value="rider">Rider</option>`, `<option value="driver">Driver</option>`** (L1690) | none (always a valid value) | `DB.opsLimits[].appliesTo` | Decides which of the two tables the row renders into (L7401 / L7402) |
| `new-limit-value` (L1691) | "Value" | `input[type=number] step="0.1"`, `max-width:100px` | empty | — | no `min`/`max` — negatives and blanks accepted | `parseFloat(val('new-limit-value'))||0` (L7409) — blank/NaN silently becomes `0` | `DB.opsLimits[].value` | none (custom limits are never `enforced`) |
| `new-limit-unit` (L1692) | "Unit" | `input[type=text]`, placeholder "per day", `max-width:120px` | empty | — | free text | `val('new-limit-unit')||'—'` (L7410) — blank becomes the em-dash | `DB.opsLimits[].unit` | Display only (L7393) |

### 3b. Per-row controls (rendered by `limitRowHtml()`, L7386–7397)

| Control | Column | Line | Type | Default | Range / behaviour |
|---|---|---|---|---|---|
| Value input | Value | L7392 | `input[type=number] step="0.1"`, `width:80px`, `data-limit-field="value"` | `l.value` | **No `min` and no `max` attribute.** Rendered with the `disabled` attribute whenever `!l.enabled` |
| Enabled toggle | Enabled | L7394 | `input[type=checkbox].tog`, `data-limit-field="enabled"` | `l.enabled` | Inline `onchange` immediately toggles the sibling value input's `disabled` state: `this.closest('tr').querySelector('[data-limit-field=value]').disabled=!this.checked` — a pure DOM effect, **not** persisted until Save |
| Unit | Unit | L7393 | static text `color:var(--muted);font-size:11px` | `l.unit` | read-only |
| Enforcement badge | Enforcement | L7387 / L7395 | `<span class="b b-green">● Live</span>` when `l.enforced`, else `<span class="b b-grey" title="Saved but not yet wired to a live check">● Tracked</span>` | derived | read-only; also drives the row's `border-left:3px solid` colour — `var(--green)` when enforced, `var(--border2)` otherwise (L7388–7389) |
| Remove | actions | L7396 | `button.btn.sm.danger`, only when `l.custom` | — | `removeCustomLimit(l.id)` |
| `enforcedBy` sub-caption | Limit | L7391 | `<p class="td-sub">` — rendered **only** when `l.enforced && l.enforcedBy` | — | read-only prose |

## 4. Tables & lists

### Rider limits (`#limits-tbody-rider`, L1679) and Driver limits (`#limits-tbody-driver`, L1684)

- **Columns, in order**: `Limit` · `Value` · `Unit` · `Enabled` · `Enforcement` · *(actions)*.
- **Row source**: `DB.opsLimits.filter(l => l.appliesTo==='rider')` and `…==='driver'` respectively (L7401–7402), in array order — **no sorting**, so custom rows land at the bottom.
- **Row identity**: each `<tr>` carries `data-limit-id="<l.id>"` (L7389) so `saveOpsLimits()` can read values back regardless of row count (comment L7348–7351).
- **Empty state**: **present on both tables** — `||'<tr><td colspan="6" style="text-align:center;padding:14px;color:var(--ghost);font-size:11px">No rider limits yet.</td></tr>'` (L7401) and `…No driver limits yet.` (L7402). This is one of the few Settings tables that has one.
- **Add flow**: card 4 → `addCustomLimit()` → row appears immediately, `enabled:true, enforced:false, custom:true` → toast reminds the operator to click Save.
- **Edit flow**: inline. Value + Enabled are edited in place and committed in bulk by **Save all limits**. `label`, `unit`, `appliesTo`, `enforced` and `enforcedBy` are **not editable** after creation.
- **Delete flow**: `removeCustomLimit(id)` — custom rows only, **no confirmation**.

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Enabled toggle** (per row) | inline `onchange` (L7394) | Enables/disables the sibling value input in the DOM only | nothing | none | none | no |
| **+ Add limit** (L1694) | `addCustomLimit()` L7405–7420 | Validates label; pushes `{id:'custom_'+Date.now(), appliesTo, label, value, unit, enabled:true, enforced:false, enforcedBy:null, custom:true}` (L7411); clears the label, value and unit inputs (**not** the target select, L7413–7415); re-renders both tables + meta; toast `✅ Custom limit added — remember to click "Save all limits"` | `DB.opsLimits` | `requirePerm('manage_settings')` L7406 | `logAction('config_updated','settings','limits','Added custom <rider\|driver> limit: <label> = <value> <unit>',{},{id,label,value,unit})` L7412 | **Yes** — `GATE_SWEEP.addCustomLimit` (L20827): title "Add an operational limit", consequences `['Applies to dispatch from the moment it is saved.']`, button "Add limit". *Not `danger`. The stated consequence is false — custom limits are always `enforced:false` and affect nothing.* |
| **Remove** (per custom row) | `removeCustomLimit(id)` L7421–7429 | `DB.opsLimits = filter(x => x.id!==id)`; re-renders; toast `Limit removed` (info) | `DB.opsLimits` | `requirePerm('manage_settings')` L7422 | `logAction('config_updated','settings','limits','Removed custom limit: <label>', l, {})` L7425 — captures the whole removed object as `before` | **No confirmation** |
| **Save all limits** (L1700) | `saveOpsLimits()` L7430–7444 | Deep-clones `DB.opsLimits` as `before` (L7432); walks **every** `tr[data-limit-id]` in both tbodies; for each, looks up the record via `getLimit(id)` and writes `l.value = parseFloat(vInput.value)||0` and `l.enabled = eInput.checked` (L7438–7439); re-renders; toast `✅ Limits saved — Live rows apply immediately, Tracked rows are stored for future use` | `DB.opsLimits[*].value`, `DB.opsLimits[*].enabled` | `requirePerm('manage_settings')` L7431 | `logAction('config_updated','settings','limits','Operational limits updated', before, DB.opsLimits)` L7441 — full before/after snapshot | **Yes** — `GATE_SWEEP.saveOpsLimits` (L20774–20776): title "Save operational limits", `danger:true`, summary "Limits control what the dispatch engine will and will not do.", consequences `['A tighter limit can strand trips that were previously matched.','Existing trips are unaffected; new ones follow the new limits.']`, button "Save limits" |

Note: a **disabled** value input still reports its `.value`, so `saveOpsLimits` preserves the greyed-out number rather than zeroing it.

## 6. Modals opened

**No bespoke modals.** Only the generic `confirmAction()` dialogs produced by `guardAction()` (L17819–17840) for `addCustomLimit` and `saveOpsLimits`, using the `GATE_SWEEP` specs quoted in §5.

## 7. Rules / policy logic — written out exactly

1. **Self-describing array contract** (comment L2577–2583): *"Each row is fully self-describing — the Settings table renders whatever's in this array, so adding a new limit (built-in or via '+ Add custom limit' in the UI) needs no other code change. `enforced:true` rows are actually wired into live behavior (see the matching hook noted in `enforcedBy`); `enforced:false` rows are tracked/configurable now and ready for a future hook."*
2. **Lookup helper**: `function getLimit(id){return (DB.opsLimits||[]).find(l => l.id===id);}` (L4468).
3. **Decline-streak enforcement** (`driverDeclineOrTimeout`, L11995–12007):
   ```js
   drv.declineStreak=(drv.declineStreak||0)+1;
   var lim=getLimit('driver_max_consecutive_declines');
   if(lim&&lim.enabled&&drv.declineStreak>=lim.value){
     drv.flaggedForDeclines=true;
     logAction('driver_flagged','driver',…);
     pushOpsNotification('warn','Driver flagged — '+nm2(r.offeredTo), …);
   }
   ```
   Reset: `driverAcceptOffer()` sets `declineStreak=0; flaggedForDeclines=false` (L12478).
4. **Auto-restriction gate** (`driverAutoRestricted`, L4500–4507):
   ```js
   var declineLimit=getLimit('driver_max_consecutive_declines');
   if(declineLimit&&declineLimit.enabled&&d.flaggedForDeclines)
     return 'Flagged — '+(declineLimit.value||3)+'+ consecutive declined offers';
   var ratingLimit=getLimit('driver_min_rating_for_dispatch');
   if(ratingLimit&&ratingLimit.enabled&&d.rating>0&&d.rating<(ratingLimit.value||3.5))
     return 'Rating '+d.rating+'★ is below the '+(ratingLimit.value||3.5)+'★ minimum for new dispatch';
   return null;
   ```
   Note `d.rating>0` — an unrated (0★) driver is exempt.
5. **Subscription trust gate** (`driverTrustedForSubs`, L4487–4494):
   ```js
   if(d.trustedNewDriver)return true;                 // ops override
   var limit=getLimit('driver_min_trips_for_subs');
   if(!limit||!limit.enabled)return true;             // gate turned off entirely
   return driverCompletedTripsCount(driverId)>=(limit.value||10);
   ```
   `driverCompletedTripsCount` (L4481–4485) prefers `d.stats.totalTrips` when present, else counts `DB.trips` rows with `driver===id && status==='Done'`.
6. **Disable semantics**: every enforcement site checks `limit.enabled` before applying the value, so turning a row off is a genuine bypass, not a value of zero.
7. **Fallback constants**: `||3` for declines, `||3.5` for rating, `||10` for trips (L4504, L4506, L4493, L4497, L4129) — hardcoded defaults if `value` is falsy.

## 8. Full enumeration — every limit in `DB.opsLimits` (L2584–L2591, 8 rows)

| # | `id` | `appliesTo` | Label | `value` | `unit` | `enabled` | `enforced` | Enforcement point (verified by grep) |
|---|---|---|---|---|---|---|---|---|
| 1 | `driver_max_consecutive_declines` | driver | Max consecutive declined offers before flag | **3** | declines | ✅ | ✅ **Live** | **REAL.** Read at **L12001** (`driverDeclineOrTimeout` — sets `flaggedForDeclines` when `declineStreak>=value`) and **L4503** (`driverAutoRestricted`). The flag then blocks the driver in `nearestAvailableDrivers` (L8179) and greys them out in the subscription driver picker (L5687). Reset on accept (L12478). `enforcedBy` string: *"Instant-ride offer engine — flags the driver AND excludes them from new offers/subscriptions until they accept a ride or ops reinstates them"* |
| 2 | `driver_min_rating_for_dispatch` | driver | Minimum rating to stay eligible for new offers | **3.5** | ★ | ✅ | ✅ **Live** | **REAL.** Read at **L4505** (`driverAutoRestricted`), consumed at L8179 (`nearestAvailableDrivers` returns `null` for the driver) and L5687 (picker `disabled` reason). `enforcedBy`: *"Driver matching engine — auto-excludes from new offers/subscriptions below this rating, same as a manual suspension but self-triggered"* |
| 3 | `driver_min_trips_for_subs` | driver | Minimum completed trips before subscription eligibility | **10** | trips | ✅ | ✅ **Live** | **REAL.** Read at **L4491** (`driverTrustedForSubs`), **L4496** (`driverSubTrustReason`) and **L4121** (driver profile "Subscription settings" card). Consumed at **L5688** — the subscription driver picker disables the driver with the reason string. `enforcedBy`: *"Subscription driver picker — new drivers build a track record on Quick Rides first (which stay open to everyone approved) before being trusted with a recurring subscription; ops can fast-track a specific driver via the Trusted new driver override on their profile"*. Override: `d.trustedNewDriver`, toggled at L9143–9144 |
| 4 | `rider_max_active_requests` | rider | Max active ride requests at once | **1** | requests | ✅ | ❌ Tracked | **NONE.** `enforcedBy:null`. Grep for `rider_max_active_requests` returns **only** the seed line L2587. Nothing prevents a rider from having several open requests |
| 5 | `rider_max_cancellations_day` | rider | Max cancellations per day before flag | **3** | per day | ✅ | ❌ Tracked | **NONE.** `enforcedBy:null`. Grep returns only L2588. No cancellation path counts per-rider daily cancellations |
| 6 | `rider_request_cooldown` | rider | Cooldown between ride requests | **30** | seconds | ❌ **disabled** | ❌ Tracked | **NONE.** `enforcedBy:null`. Grep returns only L2589. The only limit shipped `enabled:false` |
| 7 | `driver_max_active_subs` | driver | Max active subscription assignments | **5** | subscriptions | ✅ | ❌ Tracked | **NONE.** `enforcedBy:null`. Grep returns only L2590. Multi-subscription policy is enforced instead by `driverCanTakeAnotherSub()` (L8161–8166) using `DB.opsConfig.allowMultiSubPerDriver` + `d.multiSubException` — a binary "one or unlimited" rule that **never consults this numeric cap**. Driver `stats.activeSubs` strings like `'4/5'` and `'6/6'` (L2618, L2624, L2630) are hardcoded display text, not derived from this limit |
| 8 | `driver_min_rating` | driver | Min rating before restriction | **3.5** | ★ | ✅ | ❌ Tracked | **NONE.** `enforcedBy:null`. Grep returns only L2591. **This is a functional duplicate of row 2** (`driver_min_rating_for_dispatch`), same value and unit, presented as a second editable row. Changing it does nothing; changing row 2 is what matters |

**Totals: 8 built-in limits — 3 enforced (all driver-side), 5 dead. All 5 dead limits are correctly badged "● Tracked" in the UI.**

### Custom limits

Any row added via card 4 is created with `enforced:false, enforcedBy:null, custom:true` (L7411). **There is no code path that can ever set `enforced:true` on a custom limit**, so every custom limit is permanently inert — contradicting the `addCustomLimit` confirm text "Applies to dispatch from the moment it is saved." (L20827).

## 9. Consumption check

| Setting | Read by (outside `#stab-limits`) | Dead? |
|---|---|---|
| `driver_max_consecutive_declines` | L12001 (`driverDeclineOrTimeout`), L4503 (`driverAutoRestricted`) → L8179, L5687 | **Live** |
| `driver_min_rating_for_dispatch` | L4505 (`driverAutoRestricted`) → L8179, L5687 | **Live** |
| `driver_min_trips_for_subs` | L4491, L4496, L4121 → L5688 | **Live** |
| `rider_max_active_requests` | — | **DEAD** |
| `rider_max_cancellations_day` | — | **DEAD** |
| `rider_request_cooldown` | — | **DEAD** (and shipped disabled) |
| `driver_max_active_subs` | — | **DEAD** (superseded by `allowMultiSubPerDriver`) |
| `driver_min_rating` | — | **DEAD** (duplicate of `driver_min_rating_for_dispatch`) |
| any `custom_*` limit | — | **DEAD by construction** |
| `l.label` / `l.unit` | render only (L7391, L7393) | Display-only |
| `l.enforced` / `l.enforcedBy` | render only (L7387, L7391, L7388) | Display-only metadata |
| `l.custom` | render only (L7396) | UI-only |

**Every rider-side limit on this tab is dead.** The "🧍 Rider limits" card (L1677–1680) contains three rows, none of which does anything — the panel is upfront about it via the ● Tracked badges, but the card as a whole is decorative.

## 10. Cross-module effects

1. **Quick-ride offer engine** — `driverDeclineOrTimeout()` (L11995–12007) increments `declineStreak`, sets `flaggedForDeclines`, writes `logAction('driver_flagged','driver',…)` and calls `pushOpsNotification('warn', 'Driver flagged — <name>', '<n> consecutive declines, over the configured limit of <value>', () => openProfile(id))`.
2. **Matching engine** — `nearestAvailableDrivers()` (L8177–8183) drops any driver where `driverAutoRestricted(id)` is truthy, alongside `!d.mapPos` and `d.suspended`. This covers **both** enforced driver limits (declines + rating) for quick rides *and* subscriptions.
3. **Subscription driver picker** — L5686–5692 builds a `disabled` reason string, checked in priority order: `suspended` → `driverAutoRestricted` → `driverTrustedForSubs` → capacity → open complaint → tier → `driverCanTakeAnotherSub`.
4. **Driver 360 profile** — the "📦 Subscription settings" card (L4118–4130) renders a red trust-gate panel `🆕 New driver — <n> of <value> completed trips needed…` with an inline "Trusted new driver — skip this requirement" toggle (`#drv-trust-<id>` → `onDriverTrustToggle`, L9143).
5. **Fast-track audit** — `onDriverTrustToggle` writes `logAction('config_updated','driver',driverId,'Fast-tracked|Un-fast-tracked <name> for subscription eligibility…',{},{trustedNewDriver:bool})` (L9144).
6. **Growth / broadcast segments** — `flagged_drivers` segment (L7682, L7719) selects `DB.drivers[id].flaggedForDeclines || driverOpenComplaints(id)>0`, so the decline limit indirectly determines who receives a flagged-driver broadcast.
7. **Coverage page** — L6386 `var flagged = driverOpenComplaints(id)>0 || d.flaggedForDeclines || d.manualFlag;`
8. **Settings meta line** — `renderSettingsMeta()` (L7341–7344) maps `meta-limits` → audit entity `'limits'`.
9. **Permissions** — `manage_settings` label (L3257) names "operational limits".
10. **Settings nav regrouping** — `SETTINGS_GROUPS` (L21271) places `limits` last in the **"Daily operations"** group (`['reasons','rota','cancelpolicy','dispatch','limits']`).

## 11. Hardcoded / mock / demo values

| Item | Line | Note |
|---|---|---|
| All 8 seed limits and their values (3, 3.5, 10, 1, 3, 30, 5, 3.5) | L2584–L2591 | In-file literals |
| Fallback constants inside the enforcement functions | L4493 (`||10`), L4497 (`||10`), L4504 (`||3`), L4506 (`||3.5`), L4129 (`||10`) | The limit's own value is defended against, so an operator setting a limit to `0` silently reverts to the hardcoded default rather than meaning "zero" |
| `enforcedBy` prose strings | L2584–2586 | Human-written descriptions, not generated from the code that actually reads the key — they can drift out of sync silently |
| Driver `stats.activeSubs` display strings `'4/5'`, `'3/5'`, `'6/6'` | L2618, L2624, L2630 | Hardcoded per-driver strings whose denominators do **not** come from `driver_max_active_subs` |
| `driverCompletedTripsCount` prefers the seeded `stats.totalTrips` (e.g. 412, 318, 286) | L4482 | Comment calls these "established drivers — real historical count", but they are seed literals |
| `addCustomLimit` confirm text "Applies to dispatch from the moment it is saved." | L20827 | False for every custom limit |
| Two rating limits with identical values | L2585 vs L2591 | Duplicate configuration surface |

## 12. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `stab.limits` | tab button label, L1428 | "Operational Limits" | `الحدود التشغيلية` (L7920) |
| `stabgrp.operations` | static group header, L1425 | "Operations" | `العمليات` (L7913) — removed at boot (L21285) |
| `stabgrp.daily_ops` | runtime group header for this tab | "Daily operations" | `العمليات اليومية` (L7914) |

**No `data-i18n` attribute exists anywhere inside `#stab-limits` (L1668–1704).** Card titles ("🧍 Rider limits", "🚗 Driver limits", "➕ Add a custom limit"), the six column headers, the four composer labels, the two select options, the "● Live"/"● Tracked" badge text, the `title="Saved but not yet wired to a live check"` tooltip, both empty-state strings and every toast are English-only literals.

## 13. Gaps, dead code, UNVERIFIED items

1. **Five of eight built-in limits are never read** — `rider_max_active_requests`, `rider_max_cancellations_day`, `rider_request_cooldown`, `driver_max_active_subs`, `driver_min_rating`. The tab labels them honestly, but the entire rider section is inert.
2. **`driver_min_rating` duplicates `driver_min_rating_for_dispatch`** with the same value (3.5) and unit (★). Two rows, one meaning, one of them dead — a genuine trap for an operator who edits the wrong one.
3. **`driver_max_active_subs:5` is contradicted by the actual policy.** `driverCanTakeAnotherSub()` (L8161–8166) implements "zero or unlimited" via `allowMultiSubPerDriver` / `multiSubException`, never reading the numeric cap. Meanwhile driver cards display `'4/5'` and `'6/6'` as though a cap of 5 (and, for one driver, 6) were in force.
4. **Custom limits can never be enforced** — `enforced` is hardcoded `false` at creation (L7411) with no UI or code path to change it.
5. **Value inputs have no `min`/`max`** (L7392) and `parseFloat(...)||0` (L7438) turns any invalid input into `0`. A rating limit of `0` then falls back to the hardcoded `3.5` at L4506, so the UI and the engine disagree about what was configured.
6. **A limit set to `0` is unrepresentable** because of the `||` fallbacks (§11) — `0` means "use the default", not "zero".
7. **`removeCustomLimit` has no confirmation** (L7421) while `addCustomLimit` is confirm-gated.
8. **Adding a custom limit does not persist it** — `addCustomLimit` pushes to `DB.opsLimits` directly (L7411), so the row *is* already in the store, yet the toast says "remember to click 'Save all limits'" (L7419). The two are inconsistent: the add is immediate, the save is a no-op for that row unless its value was subsequently edited.
9. **`new-limit-target` select is not reset** after adding (L7413–7415 clears only label/value/unit).
10. **`label` and `unit` are injected as raw HTML** into `limitRowHtml` (L7391, L7393) with no escaping — a limit named `<img onerror=…>` would execute. Same for `addCustomGateway`/`addCity` elsewhere in the file.
11. **`driverTrustedForSubs` is not checked in `nearestAvailableDrivers`.** L8180 only calls `driverCanTakeAnotherSub` for `kind==='sub'`; the trust gate is applied solely in the manual picker (L5688). Automatic subscription matching therefore bypasses `driver_min_trips_for_subs`.
12. **`config_updated` is missing from `ACTION_LABELS`** (L2898–2910), so limits audit rows have no friendly label in the Activity filter (L9238).
13. **UNVERIFIED** — whether the "future enforcement hook" for the five Tracked limits exists anywhere outside this file. Within the file it does not.

## 14. Line-number index

| What | Lines |
|---|---|
| Tab button | 1428 |
| Pane `#stab-limits` | 1668–1704 |
| Header card | 1669–1675 |
| Rider limits card / `tbody#limits-tbody-rider` | 1677–1680 / 1679 |
| Driver limits card / `tbody#limits-tbody-driver` | 1682–1685 / 1684 |
| Add-custom-limit card | 1687–1696 |
| `#new-limit-label` / `#new-limit-target` / `#new-limit-value` / `#new-limit-unit` | 1689 / 1690 / 1691 / 1692 |
| "+ Add limit" button | 1694 |
| Save bar + `#meta-limits` | 1698–1703 |
| `DB.opsLimits` (contract comment + 8 rows) | 2577–2593 |
| `ACTION_LABELS` | 2898–2910 |
| `manage_settings` permission label | 3257 |
| Driver profile subscription-trust card | 4118–4130 |
| `getLimit()` | 4468 |
| `driverCompletedTripsCount()` | 4481–4485 |
| `driverTrustedForSubs()` | 4487–4494 |
| `driverSubTrustReason()` | 4495–4499 |
| `driverAutoRestricted()` | 4500–4507 |
| Subscription driver picker disabled-reason chain | 5686–5692 |
| Coverage page flagged check | 6386 |
| `renderSettingsMeta()` | 7341–7344 |
| `limitRowHtml()` | 7386–7397 |
| `renderOpsLimitsTable()` | 7398–7404 |
| `addCustomLimit()` | 7405–7420 |
| `removeCustomLimit()` | 7421–7429 |
| `saveOpsLimits()` | 7430–7444 |
| Broadcast `flagged_drivers` segment | 7682, 7719 |
| Arabic `stab.limits` | 7920 |
| `driverCanTakeAnotherSub()` | 8161–8166 |
| `nearestAvailableDrivers()` restriction filter | 8177–8183 |
| Settings page render fan-out | 8819 |
| `onDriverTrustToggle` | 9143–9144 |
| Activity-log action filter | 9238 |
| `driverDeclineOrTimeout()` | 11995–12007 |
| `driverAcceptOffer()` streak reset | 12478 |
| `guardAction()` | 17819–17840 |
| `gateAll()` | 20755–20767 |
| `GATE_SWEEP.saveOpsLimits` | 20774–20776 |
| `GATE_SWEEP.addCustomLimit` | 20827 |
| `SETTINGS_GROUPS` ("Daily operations") | 21271 |
| `reorderSettingsTabs()` | 21278 |
