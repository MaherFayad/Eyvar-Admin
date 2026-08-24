# Settings Tab: Data integrity

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-integrity` · **HTML lines:** L1750–1769
> **Nav button:** L1432 (`data-tab="integrity"`, icon 🧮, `data-i18n="stab.integrity"`)
> **Render fns:** `renderIntegrity()` L18576–18604 → `#integrity-body` (L1767); `renderWindowSettings()` L20492–20514 → `#window-body` (L1762)

---

## 1. Purpose

Surfaces every place where a **stored aggregate** disagrees with the **records behind it**, rather than resolving the disagreement silently. The design rationale is written out at length in the file (L18471–18493), and names the concrete bug that prompted it:

> *"A rider profile showed '6 trips · 750.67 SAR paid' in the header and 'no trips on record · no payments on record · lifetime value 0.00 SAR' two centimetres below it. Both numbers were rendered by the same function, from two different sources, with nothing comparing them: header KPIs → the entity's stored `stats` blob; sections → derived live from DB.trips / DB.payments."* (L18471–18481)

> *"The fix is not to delete one side. In production a lifetime total does legitimately come from a billing warehouse while the panel only holds recent operational records — so the two SHOULD differ. What is not acceptable is showing them as if they agree."* (L18488–18492)

Pane description (L1754): *"Where a stored total disagrees with the records behind it. A summary kept next to the records it summarises will always drift; what matters is that the drift is visible instead of being resolved silently in favour of whichever surface rendered last."*

The tab contains **two cards**: the operational data-window setting, and the aggregate-vs-records scan.

---

## 2. Layout map

```
#stab-integrity                                             L1750
├── .card  (header only)                                    L1751–1756
│   └── .settings-panel-head 🧮 "Data integrity" + desc     L1752–1755
├── .card  "🪟 Operational data window"                     L1757–1760
│   ├── .ch  h2 "🪟 Operational data window"                L1758
│   └── #window-body   ← renderWindowSettings()             L1759
└── .card  "🧮 Aggregate vs records"                        L1761–1768
    ├── .ch  h2 "🧮 Aggregate vs records"                   L1762
    │   ├── [Export CSV]                 exportIntegrity()  L1763
    │   ├── [Re-scan]                    renderIntegrity()  L1764
    │   └── [Rebuild missing history]    rebuildAllHistory() L1765
    └── #integrity-body  ← renderIntegrity()                L1767
```

`#window-body` output (L20497–20515):
- number field "Operational window (months)" → `#win-months`
- rule paragraph (bold `Rule: longest dispute window + one month.` + `DB.dataWindow.rationale`)
- `[Save window]` button
- two counters: "Accounts with older history in billing (expected)" / "Empty inside the window (alert)"
- closing explanatory paragraph

`#integrity-body` output (L18580–18604):
- summary strip (3 counters)
- guidance paragraph
- up to 40 divergence rows, each a clickable `.al-row`
- overflow line `…and N more.` if `rows.length > 40`
- or the all-clear line `Every stored total matches the records behind it.`

---

## 3. Settings fields — EVERY field

Exactly **one** editable field exists in this tab.

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `win-months` | "Operational window (months)" | `input type=number min="1"` (L20499), max-width 220px | `DB.dataWindow.months` = **13** (L20404) | months | `min=1`, **no max** | `saveDataWindow()` L20516: `parseInt(value,10) \|\| 13` — a blank/NaN entry silently falls back to 13; the HTML `min=1` is not enforced in JS, so a negative typed value passes `parseInt` and is stored | `DB.dataWindow.months` (L20519) | `windowStartMs()` (L20411) = `nowMs() - months*30.44*86400000`; that boundary drives `windowSplit()` (L20415), which drives `reconcileEntity().orphan` / `.expectedGap` (L20441–20443), which drives this tab's counters, `reconcileBannerHTML()` on entity profiles (L18544), `windowNoteHTML()` (L20455), and `buildRiderHistory()`'s `windowDays` (L18696) |

### `DB.dataWindow` record shape (L20403–20410)

```js
DB.dataWindow = {
  months: 13,
  rationale: '12 months for year-on-year comparison + 1 month headroom. ' +
             'Must not be shorter than the payment provider’s dispute window.'
};
```

Inline comment (L20405–20408): *"13 = twelve months for year-on-year comparison, plus a month of headroom. The binding constraint is actually the payment network's dispute window: the rule is LONGEST DISPUTE WINDOW + 1 MONTH. Confirm with the payment provider before this is treated as settled."*

`rationale` is **display-only** — rendered at L20503 but not editable from any UI.

### Read-only counters rendered by this tab

| Element | Formula | Line |
|---|---|---|
| Window card — "Accounts with older history in billing" | `Object.keys(DB.riders).filter(id => reconcileEntity(id)?.expectedGap).length` | L20496 |
| Window card — "Empty inside the window" | `Object.keys(DB.riders).filter(id => reconcileEntity(id)?.orphan).length` | L20495 |
| Scan card — "Older history in billing" | `integrityScan().rows.filter(x => !x.r.orphan).length` | L18581 |
| Scan card — "Empty inside the N-month window" | `integrityScan().orphans.length` | L18582 |
| Scan card — "Share of the book" | `Math.round(rows.length / (riders+drivers) * 100)` % | L18573, rendered L18583 |

Note the window card counts **riders only**; the scan card counts **riders + drivers**. See §12.

---

## 4. Tables & lists

### 4.1 Divergence list (`#integrity-body`, L18586–18601)

Not a `<table>` — a list of `.al-row` divs. Row source: `integrityScan().rows`, capped at the **first 40** (`s.rows.slice(0,40)`, L18587).

| Position | Content | Source |
|---|---|---|
| 1 | Entity name, blue, 11.5px | `x.name` — `DB.riders[id].name` or `DB.drivers[id].name` (L18568–18571) |
| 2 | ID chip `.b .b-grey` | `x.id` |
| 3 | Severity chip | `x.r.orphan` → `.b .b-red` **"no records"**; else `.b .b-amber` **"window gap"** (L18590) |
| 4 | Divergence detail line | `x.r.rows.map(rw => rw.label + ': ' + rw.stored + rw.unit + ' vs ' + rw.derived + rw.unit).join(' · ')` (L18592–18593) |
| 5 (right) | Kind | `x.kind` — literal string `'rider'` or `'captain'` (L18569, L18571) |

- **Row action:** entire row `onclick="openProfile('<id>')"` (L18588), cursor pointer.
- **Overflow:** `…and N more.` when `s.rows.length > 40` (L18597).
- **Empty state:** `Every stored total matches the records behind it.` (L18601).
- **Ordering:** riders first (in `Object.keys(DB.riders)` order), then drivers (L18568–18571). No sorting by severity.

### 4.2 Row-source builder — `integrityScan()` (L18566–18575)

```js
rows    = every rider then every driver where reconcileEntity(id).diverges
orphans = rows.filter(x => x.r.orphan)
total   = Object.keys(DB.riders).length + Object.keys(DB.drivers).length
pct     = total ? Math.round(rows.length / total * 100) : 0
```

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Export CSV** (`.btn sm`, L1763) | `exportIntegrity()` L18615–18628 | Builds header `['Entity ID','Name','Type','Field','Stored (billing)','Derived (panel)','Severity']`, one row per **divergent field** (not per entity), severity mapped `orphan → 'no records'`, else `'window gap'`; calls `downloadCSV('eyvar_data_integrity.csv', buildCSV(head,rows))` | nothing (read-only) | **none** | Yes, indirectly: `downloadCSV()` L7638 calls `logAction('export_data','export',filename,'Exported '+filename,{},{})` and toasts `✅ eyvar_data_integrity.csv downloaded` | **No** — explicitly excluded, comment L20894: *"exportIntegrity — reads data out, changes nothing"* |
| **Re-scan** (`.btn sm`, L1764) | `renderIntegrity()` L18576 | Re-runs `integrityScan()` and repaints `#integrity-body`. Pure recompute. | nothing | none | none | no |
| **Rebuild missing history** (`.btn p sm`, L1765) | `rebuildAllHistory()` L18606–18613 | 1. `reconstructHistory()` → iterates **every** rider, calls `buildRiderHistory(rid)`; 2. `renderIntegrity()`; 3. toast `✅ Rebuilt N trips and M payments across K accounts`; 4. `logAction`. **Creates records in `DB.trips` and `DB.payments`.** | `DB.trips[TRP-9xxxx]`, `DB.payments[PAY-1xxxxx]`, `DB.drivers[*].trips[]`, `window.__historyReport` | **none** — `rebuildAllHistory()` has **no `requirePerm` call** (see §12) | `logAction('history_rebuilt','settings','integrity','Reconstructed N trips / M payments for K accounts from billing lifetime totals')` L18610–18611 | **Yes** — `guardAction('rebuildAllHistory')` L18615–18624, `danger:true` |
| **Save window** (`.btn p sm`, L20507) | `saveDataWindow()` L20516–20524 | 1. `requirePerm('manage_settings')`; 2. `DB.dataWindow.months = parseInt(#win-months) \|\| 13`; 3. `logAction`; 4. `renderWindowSettings(); renderIntegrity();`; 5. toast `✅ Window set to N months` | `DB.dataWindow.months` | **`manage_settings`** (L20517) | `logAction('edit_data_window','settings','window','Operational data window set to N months')` L20520 | **Yes** — `guardAction('saveDataWindow')` L20525–20533, `danger:true` |
| *(row click)* Entity row | `openProfile(x.id)` L18588 | Navigates to the rider/driver 360° profile | nothing | none | none | no |

### Confirmation gate contents

**`rebuildAllHistory`** (L18615–18624), rebuilt dynamically so the count is live:
- **title:** `Rebuild missing trip history` · **danger:** `true`
- **summary:** `<orphans.length> accounts carry lifetime totals with no records behind them.`
- **consequences:**
  1. `Trip and payment records will be GENERATED to match the billing totals.`
  2. `Every generated row is flagged <b>reconstructed</b> and rendered with that provenance.`
  3. `Line items are modelled from the fare rules — the totals are authoritative, individual components are indicative.`
  4. `This is not an import from billing. If the real ledger is available, import it instead.`
- **confirmLabel:** `Rebuild history`

**`saveDataWindow`** (L20525–20533):
- **title:** `Change the operational data window` · **danger:** `true`
- **summary:** `This governs how much trip history the panel holds for every customer.`
- **consequences:**
  1. `Shortening it hides trips agents may still need for live disputes.`
  2. `It must not be shorter than the payment provider’s dispute window — a dispute you cannot evidence is a dispute you lose.`
  3. `Lifetime totals are unaffected; they always come from billing.`
- **confirmLabel:** `Save window`

The rebuild's own preamble comment (L18605–18607): *"Deliberately manual, not automatic. Generating records to make a number look consistent is a serious act — an operator should choose it knowingly, and see how many rows it created."*

---

## 6. Modals opened

The tab opens **no bespoke modal**. Two overlays can appear from it:

1. The generic `confirmAction` dialog for the two gated buttons (fields listed in §5).
2. `openProfile(id)` — full-page navigation to the entity 360°, not a modal.

A related modal exists in the same code region but is **reached from trip rows elsewhere**, not from this tab: `openTripReceipt(tripId)` (L18776–…), whose "⚠ Reconstructed record" banner (L18797) is the visible consequence of the rebuild action documented here.

---

## 7. Rules / policy logic — written out exactly

### 7.1 The window boundary

```js
windowStartMs() = nowMs() - DB.dataWindow.months * 30.44 * 86400000   // L20411
```
`30.44` is the mean days-per-month used consistently (also in `buildRiderHistory`, L18696).

### 7.2 `windowSplit(id)` — L20415–20425

Collects the entity's trip ids (`t.driver===id` for drivers, `t.rider===id` for riders), then:
- **inside** = trips where `dateMs === undefined` **or** `dateMs >= start` — i.e. a trip with **no timestamp at all counts as inside the window**.
- **older** = `total - inside`.

### 7.3 `olderInBilling(id)` — L20428–20435

`max(0, numOf(entity.stats.totalTrips) - windowSplit(id).total)`. Comment (L20426–20428): *"Older history the billing system holds but the panel does not. In the prototype this is inferred from the stored total; in production it is a count returned by the billing API."*

### 7.4 `reconcileEntity(id)` — original at L18517–18535, **monkey-patched at L20437–20452**

**Original** (`__origReconcileEntity`):
```js
cmp(label, stored, derived, unit):
  s = numOf(stored);                 // strips everything but digits and '.'
  if (s == null) return;             // no stored figure → nothing to compare
  if (Math.abs(s - derived) < 0.01) return;   // tolerance: 1 halala / 0.01 trip
  push { label, stored:s, derived, unit, severity: (derived===0 && s>0) ? 'orphan' : 'window' }

cmp('Trips',      stats.totalTrips, derived.trips)          // L18531
cmp('Total paid', stats.totalPaid,  derived.paid, ' SAR')   // L18532
returns { id, derived, rows, orphan: rows.some(r=>r.severity==='orphan'), diverges: rows.length>0 }
```

**Patched wrapper** (L20438–20452) overrides `orphan` with a *window-aware* definition and adds `expectedGap`:
```js
r.window        = windowSplit(id)
r.olderInBilling= olderInBilling(id)
stored          = numOf(entity.stats.totalTrips) || 0
r.orphan        = (stored > 0 && r.window.inside === 0)      // L20446
r.expectedGap   = (stored > 0 && r.window.inside > 0 && r.olderInBilling > 0)  // L20447
r.rows.forEach(row => row.severity = r.orphan ? 'orphan' : 'window')  // L20448-20450
```
Patch comment (L20432–20436): *"A gap is only an ALERT when the window itself is empty — that means a failed import or a duplicate profile. A total larger than the window is expected and must not shout, or the alert stops being read."*

### 7.5 `entityDerived(id)` — the "panel records" side (L18495–18506)

| Output | Formula |
|---|---|
| `trips` | count of `DB.trips[k]` where `k.driver===id` (drivers) or `k.rider===id` (riders) |
| `payments` | count of `DB.payments[k]` where `p.entity===id` |
| `paid` | Σ of `parseFloat(p.amount)` for payments with `p.status==='Paid'` only |
| `subs` | count of `DB.subscriptions[k]` matching driver/rider |

### 7.6 `numOf(v)` — L18507–18511

`parseFloat(String(v).replace(/[^\d.]/g,''))`, returns `null` for `null`/`undefined` and `NaN`. Note: this strips minus signs, so a negative stored total becomes positive.

### 7.7 The two integrity checks and their failure output

| # | Check | Rule | Severity | Failure output |
|---|---|---|---|---|
| 1 | **Trips** | `stats.totalTrips` vs live count of `DB.trips` rows for the entity, tolerance `< 0.01` | `orphan` if `window.inside === 0` and `stored > 0`; otherwise `window` | Row label `Trips`, values `stored vs derived`, chip **"no records"** (red) or **"window gap"** (amber) |
| 2 | **Total paid** | `stats.totalPaid` vs Σ of `Paid` payments, unit ` SAR`, tolerance `< 0.01` | same rule (severity is overwritten per-entity by the patch, L20449) | Row label `Total paid`, values `stored SAR vs derived SAR` |

There are only these two checks. No check exists for subscriptions, ratings, wallet balances, or driver earnings, even though `entityDerived` computes `subs` and `payments` counts.

### 7.8 `reconcileBannerHTML(id)` — L18544–18564 (rendered on entity profiles, not here)

- Returns `''` if the entity does not diverge (L18546).
- Returns `''` **also when `!r.orphan`** (L18549) — comment: *"B6: a total larger than the window is expected and is explained inline by windowNoteHTML. Only an empty window is an alert — an alert that fires on normal behaviour stops being read."*
- Orphan case renders a red-bordered card headed `⚠ The headline figures do not match the records below`, one line per divergent field, and the closing advice: *"Do not treat either number as settled. A lifetime total with zero records behind it usually means trip-level history was never ingested for this account — but it can also mean the records were attached to a duplicate profile. Check identity collisions before acting on this rider."* (L18560).

### 7.9 `provenanceChip(kind)` — L18537–18542

Two provenance labels, used on entity KPIs:
- `stored` → text `· billing aggregate`, tooltip *"This is a lifetime figure from the billing system, not a count of the records below."*
- `panel` → text `· panel records`, tooltip *"Derived live from the trips and payments held in this panel."*

### 7.10 The rebuild generator — `buildRiderHistory(rid)` L18689–18774

Two stated rules (L18638–18643):
1. *"Reconstructed trips sum EXACTLY to the stored lifetime paid."*
2. *"Every trip carries a full fare breakdown, so a fare is auditable line by line rather than being a single number to argue about."*

Mechanics:
- `targetTrips = max(0, stats.totalTrips − alreadyHeld.trips)`; `targetPaid = max(0, stats.totalPaid − alreadyHeld.paid)` rounded to 2dp (L18693–18694). Returns `null` (no-op) if `targetTrips === 0` (L18695).
- **Window split of the rebuild** (L18696–18701): `windowDays = round(months*30.44)`; unless `window.__fetchFullHistory` is set, only `max(1, round(targetTrips*0.55))` trips are generated — i.e. **55 %** of the gap is treated as inside the window and the rest is left "in billing". `targetPaid` is scaled by the same ratio.
- Deterministic pseudo-randomness: `seededRand(seed) = sin(seed)*10000 − floor(...)` (L18660), seeded from the numeric part of the rider id (`seedBase = parseInt(rid.replace(/\D/g,''),10) || 1`, L18705).
- Per-trip draws (L18707–18731): `km = 2.5 + rand*18` (1dp); `min = km*2.2 + rand*9`; `surge = rand>0.86 ? 1.2 + round(rand*6)/10 : 1`; `cancelled = rand>0.94`; route from `RY_PLACES` (20 Riyadh locations, L18649–18651), with a `+3` index shift if origin equals destination; `kind = i < stats.quickRides ? 'Quick ride' : 'Subscription'`; driver picked at random from `Object.keys(DB.drivers)`; `rating = 3.6 + rand*1.4` (1dp, `null` if cancelled); pay method from `PAY_METHODS` (6 entries, L18652).
- **Exact-sum scaling** (L18734–18752): `factor = targetPaid / Σ(non-cancelled gross)`; every numeric field of the fare breakdown except `surgeMult` is multiplied by it; the **last** non-cancelled trip's fare is then set to `targetPaid − runningPaid` so the sum matches to the halala. `report.scaled = true` when `|factor−1| > 0.001`.
- Record ids: trips `TRP-` + `++__histSeq` starting from **90000** (L18661); payments `PAY-` + `(__histSeq + 40000)`.
- Every generated trip and payment carries `reconstructed: true` (L18759, L18770).
- `driverEarn` is hardcoded at **80 %** of fare (`(fare*0.8).toFixed(2)`, L18755) — this ignores `DB.rateCard.commission` entirely.
- Payment `type` is `'Quick ride fare'` or `'Subscription charge'` per `kind` (L18767).

### 7.11 `buildFareBreakdown(km, min, surge, seed)` — L18654–18659 (the rebuild's fare model)

| Component | Value |
|---|---|
| `base` | **4.00** (hardcoded) |
| `perKm` | **1.35** (hardcoded) |
| `perMin` | **0.42** (hardcoded) |
| `distance` | `round(km * 1.35, 2)` |
| `time` | `round(min * 0.42, 2)` |
| `subtotal` | `base + distance + time` |
| `surge` | `subtotal * (surgeMult − 1)` when `surgeMult > 1`, else 0 |
| `tolls` | **5.00** when `seededRand(seed+7) > 0.9`, else 0 |
| `gross` | `round(subtotal + surge + tolls, 2)` |

These three rates **do not match `DB.rateCard.classes.economy`** (base 5.00, perKm 1.20, perMin 0.40 — L21438) or `comfort` (8.00 / 1.75 / 0.55). See §12.

### 7.12 `ensureHistory(id)` — L18684–18687

Lazy per-rider entry point. Comment (L18681–18683): *"The demo creates riders at runtime, so a boot-time pass alone would leave every later account with a lifetime total and nothing behind it — the exact fault this is meant to close."*

### 7.13 `fetchFullHistory(id)` — L20470–20482 (invoked from `windowNoteHTML`, not from this tab)

Sets `window.__fetchFullHistory = true`, re-runs `buildRiderHistory(id)` for one entity (generating trips dated `windowDays + rand*400 + 1` days ago, L18721), logs `billing_history_fetched`, reopens the profile, toasts `📥 Pulled N older trip(s) from billing`. Gated (L20484–20491, non-danger).

---

## 8. Enumerations

### 8.1 Integrity checks (complete)

| Key | Label | Stored source | Derived source | Unit |
|---|---|---|---|---|
| Trips | `Trips` | `entity.stats.totalTrips` | `entityDerived(id).trips` | — |
| Total paid | `Total paid` | `entity.stats.totalPaid` | `entityDerived(id).paid` | ` SAR` |

### 8.2 Severity values (complete)

| Value | Chip | Colour | Meaning |
|---|---|---|---|
| `orphan` | `no records` | `.b-red` | Billing says the entity exists, the window holds **zero** trips |
| `window` | `window gap` | `.b-amber` | Stored total exceeds what the window holds, but the window is non-empty — **expected** |

### 8.3 Entity kinds in the scan (complete)

`'rider'` (L18569), `'captain'` (L18571). Note the second is `captain`, not `driver`.

### 8.4 `RY_PLACES` — the 20 route endpoints used by the rebuild (L18649–18651)

`Al Olaya`, `King Fahd District`, `Al Malqa`, `Hittin`, `Al Yasmin`, `An Narjis`, `Al Sahafah`, `Al Muruj`, `KAFD`, `Al Nakheel`, `Al Wurud`, `Diplomatic Quarter`, `Al Rabwah`, `Exit 5`, `Granada Mall`, `Riyadh Park`, `KKIA Terminal 5`, `Al Bujairi`, `Qasr Al Hokm`, `Al Rawdah`

### 8.5 `PAY_METHODS` — the 6 payment methods used by the rebuild (L18652)

`Mada ···2210`, `Visa ···4821`, `Apple Pay`, `STC Pay`, `Cash`, `Mastercard ···9034`

### 8.6 CSV export columns (L18616)

`Entity ID`, `Name`, `Type`, `Field`, `Stored (billing)`, `Derived (panel)`, `Severity`

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| **Rider / Driver 360° profiles** | `reconcileBannerHTML(id)` red banner; `provenanceChip()` on KPIs; `windowNoteHTML(id)` window caption with its `[Fetch full history from billing]` button | L18544, L18537, L20455–20468 |
| **`DB.trips`** | `rebuildAllHistory()` inserts `TRP-9xxxx` records with `reconstructed:true` | L18753–18761 |
| **`DB.payments`** | inserts `PAY-1xxxxx` records with `reconstructed:true` | L18766–18772 |
| **`DB.drivers[*].trips`** | generated trips are pushed onto the assigned driver's trip list | L18762–18763 |
| **Trip receipt modal** | `openTripReceipt()` renders an amber "⚠ Reconstructed record" provenance banner for any trip with `reconstructed:true` | L18797 |
| **Fraud & risk page** | the guidance paragraph (L18585) directs the operator to cross-check orphans against **identity collisions** there; `renderIdentityCollisions()` is on `#p-fraud` | L18585, L8813 |
| **Activity / Audit log** | `history_rebuilt`, `edit_data_window`, `export_data`, `billing_history_fetched` entries | L18610, L20520, L7638, L20477 |
| **Pricing engine** | independent — the rebuild's fare model does **not** use `DB.rateCard` | see §12 |
| **Every window-sensitive surface** | changing `#win-months` moves `windowStartMs()`, which changes `windowSplit` on every entity and therefore the orphan/expected classification everywhere | L20411 |
| **Navigation** | `renderIntegrity()` and `renderWindowSettings()` are called on every `go('settings')` | L8819 |

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `13` | L20404 | Default window months. Also the literal fallback in `saveDataWindow` (L20518) and in `buildRiderHistory`'s `windowDays` default (L18696) |
| `30.44` | L20411, L18696 | Days per month |
| `40` | L18587, L18597 | Divergence list display cap |
| `0.01` | L18525 | Comparison tolerance |
| `0.55` | L18698 | **Demo split:** only 55 % of the missing history is treated as "inside the window". Comment: *"In production the importer filters by date; here the same split is modelled proportionally."* |
| `base 4.00 / perKm 1.35 / perMin 0.42` | L18655 | Rebuild fare model — **hardcoded, not from `DB.rateCard`** |
| `tolls 5.00` at `rand > 0.9` | L18657 | Fabricated tolls |
| `surge` threshold `0.86`, cancel threshold `0.94` | L18711, L18724 | Fabricated distributions |
| `rating 3.6 + rand*1.4` | L18729 | Fabricated ratings |
| `fare * 0.8` for `driverEarn` | L18755 | Hardcoded 20 % commission, ignores the rate card |
| `__histSeq = 90000` | L18661 | Id sequence base |
| `+40000` payment id offset | L18752 | |
| `RY_PLACES` (20), `PAY_METHODS` (6) | L18649–18652 | Demo fixtures |
| `SEED_EPOCH` | L18722 | Frozen demo clock used as the "now" for generated dates |
| `+ rand*400` days | L18721 | Fabricated age of "older than window" trips |
| `seededRand` = `sin(seed)*10000` fractional part | L18660 | Deterministic pseudo-RNG, not cryptographic |

The whole rebuild pathway is a **demo generator**. The gate text says so explicitly: *"This is not an import from billing. If the real ledger is available, import it instead."* (L18622).

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.integrity` | Nav button label span, L1432 | `Data integrity` | **MISSING** from `LANG_STRINGS.ar` (L7914–7921) |
| `stabgrp.money` | Group header (integrity sits in the `Money` group, L21272) | `Money` | `المال` (L7915) |

**No `data-i18n` attribute exists inside `#stab-integrity`.** All card headings (`🪟 Operational data window`, `🧮 Aggregate vs records`), all three toolbar buttons, the field label, both explanatory paragraphs, every chip label (`no records`, `window gap`), and both counter captions are hardcoded English — the first two in static HTML (L1758, L1762) and the rest generated in JS.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **`rebuildAllHistory()` has no permission gate.** L18606 goes straight to `reconstructHistory()`. It is the most destructive action in this tab — it writes hundreds of records into `DB.trips` and `DB.payments` — yet `saveDataWindow()` (which only changes a number) is the one that checks `manage_settings`. Confirmation gate ≠ permission gate.
2. **The rebuild's fare model contradicts the live rate card.** `buildFareBreakdown` uses base 4.00 / 1.35 / 0.42 (L18655) while `DB.rateCard.classes.economy` is 5.00 / 1.20 / 0.40 (L21438). Every reconstructed receipt therefore prices under rules that never existed. The gate text partially covers this (*"Line items are modelled from the fare rules — the totals are authoritative, individual components are indicative"*, L18621) but names "the fare rules" as if they were the rate card.
3. **`driverEarn = fare * 0.8`** (L18755) hardcodes a 20 % commission. The live card says on-demand commission is **22 %** (L21447), so reconstructed driver earnings are systematically 2 pp high.
4. **Counter scope mismatch.** The window card counts only `Object.keys(DB.riders)` (L20494–20496); the scan card counts riders **and** drivers (L18573). The same page therefore shows two different "empty inside the window" totals whenever a driver is an orphan.
5. **Trips with no `dateMs` are counted as inside the window** (`ms === undefined || ms >= start`, L20422). Seeded trips generally lack `dateMs`; only reconstructed ones set it (L18757). This inflates `window.inside` and suppresses the orphan alert for exactly the accounts most likely to be broken.
6. **`numOf()` strips the minus sign** (`/[^\d.]/g`, L18509), so a negative stored total is read as positive and never flagged.
7. **`min="1"` is not enforced.** `saveDataWindow` uses `parseInt(v,10) || 13` (L20518); `-5` parses to `-5` (truthy) and is stored, making `windowStartMs()` a **future** timestamp and marking every account as orphaned. There is no upper bound either.
8. **`DB.dataWindow.rationale` is not editable** and not versioned, yet is presented as policy (L20503).
9. **The 40-row cap has no "show all"** (L18587). With more than 40 divergent entities the operator can only see the rest via the CSV export.
10. **No sorting.** Orphans (the alerts) are interleaved with expected window gaps in `Object.keys` order, so a red row can sit below 39 amber ones.
11. **`history_rebuilt` and `edit_data_window` are not in `ACTION_LABELS`** (L2900–2910), so neither is selectable in the Activity-log action-type filter (built at L9210).
12. **`renderSettingsMeta()` has no `integrity` or `window` key** (L7340) and no `meta-*` element exists in this pane, so the "Last updated by …" caption is absent.
13. **Only two checks exist** (§8.1) despite `entityDerived` computing `payments` and `subs` counts (L18505) that are never compared against anything.
14. **`reconcileEntity` is monkey-patched at load** (L20437). Any code path that captured `reconcileEntity` into a local before L20437 would get the unpatched version. None was found, but the pattern is fragile — the original is retained as `__origReconcileEntity` (L20437) and is otherwise unreferenced.
15. **UNVERIFIED — `provenanceChip()` call sites.** The function is defined at L18537 and is intended for entity-profile KPIs. Its actual invocation sites were not enumerated in this pass; it does not appear inside `renderIntegrity()` or `renderWindowSettings()`.
16. **UNVERIFIED — `SEED_EPOCH`.** Referenced at L18722 as the base for generated dates. Its definition line was not read in this pass; it is assumed to be the frozen demo clock referenced elsewhere as `25 Jun`.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| Nav button `data-tab="integrity"` | L1432 |
| Pane `#stab-integrity` | L1750–1769 |
| Card 1 header | L1751–1756 |
| Card 2 "🪟 Operational data window" + `#window-body` | L1757–1760 |
| Card 3 "🧮 Aggregate vs records" + toolbar buttons | L1761–1766 |
| `#integrity-body` mount | L1767 |
| `ACTION_LABELS` | L2900–2910 |
| `requirePerm()` | L3126–3132 |
| `logAction()` | L3133–3155 |
| `renderSettingsMeta()` map | L7339–7342 |
| `downloadCSV()` (logs `export_data`) | L7632–7641 |
| `go('settings')` fan-out | L8819 |
| Reconciliation block comment | L18471–18493 |
| `entityDerived()` | L18495–18506 |
| `numOf()` | L18507–18511 |
| `reconcileEntity()` (original) | L18517–18535 |
| `provenanceChip()` | L18537–18542 |
| `reconcileBannerHTML()` | L18544–18564 |
| `integrityScan()` | L18566–18575 |
| `renderIntegrity()` | L18576–18604 |
| `rebuildAllHistory()` | L18605–18613 |
| `guardAction('rebuildAllHistory')` | L18615–18624 |
| `exportIntegrity()` | L18615–18628 |
| Backfill block comment | L18631–18647 |
| `RY_PLACES` | L18649–18651 |
| `PAY_METHODS` | L18652 |
| `seededRand()` | L18653 |
| `buildFareBreakdown()` | L18654–18659 |
| `__histSeq` | L18661 |
| `reconstructHistory()` | L18662–18672 |
| `ensureHistory()` | L18684–18687 |
| `buildRiderHistory()` | L18689–18774 |
| `openTripReceipt()` (reconstructed banner) | L18776–18797+ |
| `DB.dataWindow` seed | L20403–20410 |
| `windowStartMs()` | L20411 |
| `windowSplit()` | L20415–20425 |
| `olderInBilling()` | L20428–20435 |
| `reconcileEntity` monkey-patch | L20437–20452 |
| `windowNoteHTML()` | L20454–20468 |
| `fetchFullHistory()` | L20470–20482 |
| `guardAction('fetchFullHistory')` | L20484–20491 |
| `renderWindowSettings()` | L20492–20514 |
| `saveDataWindow()` | L20516–20524 |
| `guardAction('saveDataWindow')` | L20525–20533 |
| Gate-sweep exclusion note for `exportIntegrity` | L20894 |
| `SETTINGS_GROUPS` (integrity → `Money`) | L21272 |
| `DB.rateCard.classes` (contradicting rates) | L21438–21442 |
