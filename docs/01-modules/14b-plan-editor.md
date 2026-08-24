# Module: Plan Editor
> Source: `eyvar_ops_panel_v40_fixed.html` | Page id: `plan-edit` (`<div class="page" id="p-plan-edit">`) | HTML lines: **L1082–L1129**
> Companion doc: `14a-pricing-plans.md` (page id `plans`, L1030–L1079) — plan schema, seeded values, lifecycle, ride types and surge live there and are referenced, not repeated.

---

## 1. Purpose

A single-plan edit form. It reads and writes **exactly one** object: `DB.plans[currentPlanKey]` (`L2897`, `L6066`, `L6119`). The page comment at `L2897` states the contract explicitly:

> "which plan the Edit-plan page is currently showing — every field on that page reads/writes `DB.plans[currentPlanKey]`, never a hardcoded plan"

The form is organised into three declared sections (badges "Section 1 of 3" / "2 of 3" / "3 of 3"):

| Section | Title | Lines | Contents |
|---|---|---|---|
| Top bar (outside sections) | — | `L1085–L1086` | Plan name display, commission/discount pill, **Archive** button, live preview strip |
| 1 | **Plan core data** | `L1087–L1106` | Name EN/AR, duration, execute days, cancel cap, status, Eyvar commission %, discount %, computed driver share, sort order |
| 2 | **Rider-facing feature list** | `L1107–L1114` | Bilingual bullet-point editor (`plan_features`) |
| 3 | **Vehicle pricing** | `L1115–L1126` | Economy / Comfort per-min + per-km rates, per-vehicle Active toggles, worked example cells, formula box |
| Footer | — | `L1127` | Cancel / Save plan |

Header (`L1083`): `<h1>Edit plan</h1>` with `<p id="plan-edit-sub">Weekly plan · plan_id: 1</p>` (static markup, overwritten at `L6084`) and a right-hand button row: `← Plans` and `Save`.

**Everything in the form is a live preview until Save.** Typing recomputes the preview strip and example cells through `upd()` (`L12987–L12999`), but `DB` is not touched until `savePlan()` runs — with two exceptions: the **vehicle Active checkboxes** write immediately (`L6113`), and **feature-point text** mutates the `PLAN_FEATURES` buffer on every keystroke (`L6012`, `L6016`) though it is only committed to the plan on save (`L6142`).

---

## 2. Entry points & routing

| Item | Detail | Line |
|---|---|---|
| Page container | `<div class="page" id="p-plan-edit">` | `L1082` |
| Sidebar nav item | **None** — this page is not in the sidebar and can only be reached programmatically | — |
| Router hook | `if(id==='plan-edit'){loadPlanEditForm();renderPlanFeatures();}` | `L8795` |
| Toolbar title | `titles['plan-edit']='Edit Plan'` | `L2168` |
| Toolbar subtitle | `subs['plan-edit']='Weekly plan · plan_id: 1'` — hardcoded, but immediately **overwritten** by `loadPlanEditForm()` which writes the real value into `#tb-sub` (`L6085`) after `go()` sets it (`L8786`) | `L2169`, `L6085` |
| Entry A — Edit an existing plan | Plans table row button `L5939` → `openPlanEdit(key)` `L6061–L6064` → sets `currentPlanKey`, `go('plan-edit',null)` | `L5939`, `L6062–L6063` |
| Entry B — Create a plan | `#plans-new-btn` `L1031` → `newPlan()` `L6098` → inserts a Draft plan, toast, `setTimeout(400ms)` → `openPlanEdit(key)` | `L6098–L6108` |
| Exit — `← Plans` | `go('plans',null)` | `L1083` |
| Exit — `Cancel` (footer) | `go('plans',null)` | `L1127` |
| Exit — after Archive | `doArchivePlan()` ends with `go('plans',null)` | `L6174` |
| Boot render | **None.** `loadPlanEditForm()` is called only from the router (`L8795`). At boot the page holds its static "Weekly plan" placeholder markup. | — |
| Permission gate on entry | **None.** `openPlanEdit()` (`L6061`) has no `requirePerm()`. A user without `manage_plans` can open, view and type into the whole form; they are refused only at Save (`L6118`), Archive-commit (`L6166`) and vehicle toggle (`L6110`). | — |
| Guard against no plan | If `currentPlanKey` is `null` (page reached before any plan was chosen), `loadPlanEditForm()` returns early at `L6067` and the static placeholder values stay on screen. `savePlan()` then toasts `⚠ No plan is open — go back to Plans and pick one` (`err`) `L6120`. | `L6067`, `L6120` |

### Call chain
```
go('plan-edit')                         L8774 / L8795
├── loadPlanEditForm()                  L6065
│   ├── (13 direct field writes)        L6069–L6082
│   ├── #plan-edit-name-display         L6083
│   ├── #plan-edit-sub, #tb-sub         L6084–L6085
│   ├── renderPlansFormSelects()        L12796  → customSelectHTML() L5336 / cselSetValue() L5427
│   ├── PLAN_FEATURES ← p.features      L6093–L6094
│   ├── renderPlanFeatures()            L6095
│   └── upd()                           L6096 → L12987  → gv() L12984, fmt() L12985, cr() L12986
└── renderPlanFeatures()                L5998   (called a second time, redundantly)
```

---

## 3. Sub-tabs

**None.** The page is a single scrolling form. The "Section 1/2/3 of 3" badges (`L1087`, `L1107`, `L1115`) are static labels inside `.sec-head` blocks, not tabs — there is no JS that hides or shows a section.

---

## 4. Plan schema — EVERY field

Full field-by-field schema (types, units, defaults, controls, writers and readers) is in **`14a-pricing-plans.md` §4**. Restated here as an editor-coverage map:

| Field | Editable here? | Control | Loaded by | Saved by |
|---|---|---|---|---|
| `key` | No | shown as `plan_id: <key>` in the sub-line | `L6084–L6085` | — (immutable) |
| `name` | Yes | `#fp3-name-en` `L1090` | `L6069` | `L6131` |
| `nameAr` | Yes | `#fp3-name-ar` `L1091` | `L6070` | `L6131` |
| `duration` | Yes | `#fp3-duration` `L1094` | `L6071` | `L6132` |
| `execute` | Yes | `#fp3-exec` `L1095` | `L6072` | `L6133` |
| `cap` | Yes | `#fp3-cap` `L1096` | `L6073` | `L6134` |
| `eyvarPct` | Yes | `#fp3-comm` `L1101` | `L6075` | `L6136` |
| `discountPct` | Yes | `#fp3-disc` `L1102` | `L6076` | `L6137` |
| `ecoMin` | Yes | `#fp3-emin` `L1121` | `L6077` | `L6138` |
| `ecoKm` | Yes | `#fp3-ekm` `L1121` | `L6078` | `L6139` |
| `comfortMin` | Yes | `#fp3-cmin` `L1122` | `L6079` | `L6140` |
| `comfortKm` | Yes | `#fp3-ckm` `L1122` | `L6080` | `L6141` |
| `sortOrder` | Yes | `#fp3-sort` `L1104` | `L6074` | `L6135` |
| `ecoActive` | Yes — **immediate write** | `#fp3-eco-active` `L1121` | `L6081` | `toggleVehicleActive()` `L6113`, **not** `savePlan()` |
| `comfortActive` | Yes — **immediate write** | `#fp3-comfort-active` `L1122` | `L6082` | `toggleVehicleActive()` `L6113`, **not** `savePlan()` |
| `status` | **Displayed but NOT saved** | `#fp3-status-wrap` custom select `L1097` | `renderPlansFormSelects()` `L12799–L12806` | **nothing** — `savePlan()` never reads `#fp3-status` (`L6117–L6149`). See §19. |
| `features` | Yes | `#pf-list` `L1111` | `L6092–L6094` | `L6142` |

**Derived / read-only displays** (not schema fields):

| Display | Element | Formula | Line |
|---|---|---|---|
| Driver share | `#fp3-ds` `L1103` | `(100 − eyvarPct).toFixed(1) + '%'` | `L12989` |
| Commission echo (Economy row) | `#fp3-rc` `L1121` | `eyvarPct.toFixed(1) + '%'` | `L12990` |
| Discount echo (Economy row) | `#fp3-rd` `L1121` | `discountPct.toFixed(1) + '%'` | `L12991` |
| Header pill | `#fp3-pill` `L1085` | `'Eyvar <c>%  ·  Discount <d>%'` | `L12992` |
| Comfort row commission/discount | plain text `↑ plan` | static — Comfort inherits the plan-level rates | `L1122` |

---

## 5. Seeded plan values

Full 3-plan × 17-field table in **`14a-pricing-plans.md` §5** (`DB.plans` seed `L2889–L2896`).

### Static placeholder values baked into the editor markup
These are what the page shows **before** `loadPlanEditForm()` runs (i.e. at boot, or if `currentPlanKey` is `null`). They match the seeded `weekly` plan (`L2890`) exactly, except `#fp3-name-en` which reads `"Weekly plan"` while the data says `"Weekly"`:

| Element | Static value | Line | Matches `DB.plans.weekly`? |
|---|---|---|---|
| `#plan-edit-sub` | `Weekly plan · plan_id: 1` | `L1083` | ✗ — real key is `weekly`, not `1` |
| `#plan-edit-name-display` | `Weekly plan` | `L1085` | ✗ — `name` is `Weekly`; the renderer appends `' plan'` (`L6083`) |
| `#fp3-pill` | `Eyvar 20% · Discount 0%` | `L1085` | ✓ |
| `#fp3-name-en` | `Weekly plan` | `L1090` | ✗ — `name` is `Weekly` |
| `#fp3-name-ar` | `الباقة الأسبوعية` | `L1091` | ✓ |
| `#fp3-duration` | `7` | `L1094` | ✓ |
| `#fp3-exec` | `5` | `L1095` | ✓ |
| `#fp3-cap` | `1` | `L1096` | ✓ |
| `#fp3-comm` | `20` | `L1101` | ✓ |
| `#fp3-disc` | `0` | `L1102` | ✓ |
| `#fp3-ds` | `80.0%` | `L1103` | ✓ (derived) |
| `#fp3-sort` | `1` | `L1104` | ✓ |
| `#fp3-emin` | `0.95` | `L1121` | ✓ |
| `#fp3-ekm` | `1.10` | `L1121` | ✓ |
| `#fp3-rc` | `20%` | `L1121` | ✓ |
| `#fp3-rd` | `0%` | `L1121` | ✓ |
| `#fp3-eco-active` | `checked` | `L1121` | ✓ |
| `#fp3-cmin` | `1.35` | `L1122` | ✓ |
| `#fp3-ckm` | `1.60` | `L1122` | ✓ |
| `#fp3-comfort-active` | `checked` | `L1122` | ✓ |
| Preview strip cells (`#fp3-eg`…`#fp3-cd`) | `—` | `L1086` | placeholder em-dashes, filled by `upd()` |
| Example cells (`#fp3-eex`, `#fp3-cex`) | `—` | `L1121–L1122` | placeholder em-dashes |

### `newPlan()` template (`L6103–L6105`)
`{key:'new<n>', name:'New plan', nameAr:'', duration:7, execute:5, cap:1, eyvarPct:20, discountPct:0, ecoMin:0.95, ecoKm:1.10, comfortMin:1.35, comfortKm:1.60, sortOrder:<count+1>, ecoActive:true, comfortActive:true, status:'Draft', features:[]}` — i.e. **a copy of the weekly rate card with an empty Arabic name and no features**, forcing the operator to supply `nameAr` (blocked at `L6125`) and at least a valid feature set.

---

## 6. Pricing formulas — written out exactly

### 6.1 The editor's live calculator — `cr()` `L12986`
Verbatim:
```js
function cr(pm,pk,d,c,ex){var g=(20*pm)+(10*pk),dc=g*(1-d/100),t=dc*ex,dr=t*(1-c/100);return{g:g,t:t,dr:dr};}
```
Expanded (`pm` = SAR/min, `pk` = SAR/km, `d` = discount %, `c` = Eyvar commission %, `ex` = execute days):
```
g   gross          = (20 × pm) + (10 × pk)          // 20 min + 10 km, HARDCODED
dc  discounted     = g  × (1 − d / 100)
t   plan_total     = dc × ex
dr  driver_earns   = t  × (1 − c / 100)
```

### 6.2 The on-page formula box (`L1125`)
Rendered verbatim inside `.formula-box`:
```
gross        = (trip_min × price/min) + (trip_km × price/km)
discounted   = gross × (1 − discount%/100)
plan_total   = discounted × execute_days
driver_earns = plan_total × (1 − eyvar%/100)
```
Followed by `<p class="formula-note">`: "Example uses 10 km / 20 min. Actual computed from real trip data at booking."

### 6.3 `upd()` — what each formula drives (`L12987–L12999`)
```
c  = gv('fp3-comm')      // eyvarPct               L12988
d  = gv('fp3-disc')      // discountPct            L12988
ex = gv('fp3-exec')      // execute days           L12988

#fp3-ds   = (100 − c).toFixed(1) + '%'                                     L12989
#fp3-rc   = c.toFixed(1) + '%'                                             L12990
#fp3-rd   = d.toFixed(1) + '%'                                             L12991
#fp3-pill = 'Eyvar ' + c.toFixed(1) + '%  ·  Discount ' + d.toFixed(1) + '%'  L12992

e  = cr(gv('fp3-emin'), gv('fp3-ekm'), d, c, ex)     // Economy            L12993
cm = cr(gv('fp3-cmin'), gv('fp3-ckm'), d, c, ex)     // Comfort            L12994

#fp3-eex = 'gross <e.g>/trip' / 'pays <e.t>'  / 'driver <e.dr>'            L12995
#fp3-cex = 'gross <cm.g>/trip' / 'pays <cm.t>' / 'driver <cm.dr>'          L12996
#fp3-eg,#fp3-et,#fp3-ed = fmt(e.g),  fmt(e.t),  fmt(e.dr)                  L12997
#fp3-cg,#fp3-ct,#fp3-cd = fmt(cm.g), fmt(cm.t), fmt(cm.dr)                 L12998
```
Helpers: `gv(id)` = `parseFloat(el.value) || 0` (`L12984`) — **a blank or non-numeric field is treated as 0 in the preview**; `fmt(n)` = `n.toFixed(2) + ' SAR'` (`L12985`).

Note the label mismatch: the example cell prints `gross <g>/trip` (`L12995`) but `g` is the *per-trip* gross while `t` ("pays") is the *whole-plan* total after `× ex` — the cell header says "Example (10km · 20min × exec days)" (`L1119`), so `pays` and `driver` are plan totals while `gross` is a single trip.

### 6.4 Worked examples (seeded plans, using `cr()`)

| Plan | Vehicle | gross `g` = 20·pm + 10·pk | discounted `dc` | plan_total `t` = dc × exec | driver_earns `dr` |
|---|---|---|---|---|---|
| Weekly (`d=0, c=20, ex=5`) | Economy (0.95 / 1.10) | 19.00 + 11.00 = **30.00** | 30.00 | **150.00** | **120.00** |
| Weekly | Comfort (1.35 / 1.60) | 27.00 + 16.00 = **43.00** | 43.00 | **215.00** | **172.00** |
| Bi-weekly (`d=5, c=18, ex=10`) | Economy (0.85 / 0.98) | 17.00 + 9.80 = **26.80** | 25.46 | **254.60** | **208.772** |
| Bi-weekly | Comfort (1.20 / 1.42) | 24.00 + 14.20 = **38.20** | 36.29 | **362.90** | **297.578** |
| Monthly (`d=10, c=15, ex=22`) | Economy (0.72 / 0.85) | 14.40 + 8.50 = **22.90** | 20.61 | **453.42** | **385.407** |
| Monthly | Comfort (1.05 / 1.25) | 21.00 + 12.50 = **33.50** | 30.15 | **663.30** | **563.805** |

All figures are displayed via `.toFixed(2)` (`L12985`), so the trailing thousandths above are rounded on screen. There is **no rounding in the stored data** — `cr()` returns raw floats and nothing is persisted from it.

### 6.5 Formulas NOT used by this editor
`quickRideFare()` (`L12401`), `currentSurgeMultiplier()` (`L12389`), `computeDynamicSubPrice()` (`L4535`), `fareFor()`/`planQuote()` (`L21466`, `L21484`) never touch the editor. See `14a` §6 and §19.

---

## 7. Ride types & rates

Not configured here. Section 3 of the editor exposes exactly **two fixed vehicle rows**, hardcoded in the markup:

| Row | Vehicle label | SAR/min input | SAR/km input | Commission cell | Discount cell | Active checkbox | Example cell | Line |
|---|---|---|---|---|---|---|---|---|
| 1 | `Economy` | `#fp3-emin` | `#fp3-ekm` | `#fp3-rc` (live, `L12990`) | `#fp3-rd` (live, `L12991`) | `#fp3-eco-active` | `#fp3-eex` | `L1121` |
| 2 | `Comfort` | `#fp3-cmin` | `#fp3-ckm` | static text `↑ plan` | static text `↑ plan` | `#fp3-comfort-active` | `#fp3-cex` | `L1122` |

- There is **no way to add a third vehicle row** — the `<tbody>` (`L1120–L1123`) is static HTML, not rendered by JS.
- The `Large` type that exists in `DB.quickRideTypes` (`L13911`) has **no counterpart here**, so it can never be part of a subscription plan.
- Commission and discount are **plan-level, not per-vehicle**: both rows resolve to the same `eyvarPct` / `discountPct`; the Economy row echoes them numerically, the Comfort row just says `↑ plan`.
- Column widths are pinned by a `<colgroup>` (`L1118`): 12% / 16% / 16% / 10% / 10% / 8% / 28%.
- Header row (`L1119`): `Vehicle | SAR/min * | SAR/km * | Commission | Discount | Active | Example (10km · 20min × exec days)`. The `*` on the two rate columns marks them required, but **no validation enforces it** — see §19.

Quick-ride types and surge are documented in `14a` §7 and §8.

---

## 8. Surge schedule matrix

**Not present on this page.** No surge control, no surge display, no surge term in any editor formula. The full matrix is in `14a` §8.

Relevant cross-fact: the rate-card model declares `DB.rateCard.surge.appliesToPlanLegs = false` with the comment `/* never. not a toggle. */` (`L21460`), and `fareFor()` forces `mult = 1` when `opts.isPlanLeg` (`L21473`). The editor's own `cr()` has no surge input at all (`L12986`), so a plan price is surge-free by construction here too.

---

## 9. Plan lifecycle & visibility

Full lifecycle table in **`14a` §9.2**. The editor's role in it:

| Element | Effect | Line |
|---|---|---|
| Status custom-select `#fp3-status-wrap` | **Read-only in practice.** `renderPlansFormSelects()` builds it once per DOM lifetime with options `Active` / `Draft` / `Archived` and syncs it to `p.status` on every plan open (`L12799–L12806`). Picking a different option updates the hidden input `#fp3-status` via `cselPick` → but **`savePlan()` never reads it** (`L6117–L6149`), so the choice is discarded. | `L1097`, `L12796–L12806` |
| **Archive** button (top bar) | `archivePlan()` `L6156` opens a confirmation modal; `doArchivePlan()` `L6165` gates on `manage_plans`, sets `p.status='Archived'`, logs `archive_plan` with the real `before` status, toasts (`err` styling), then `go('plans',null)` | `L1085`, `L6156–L6175` |
| Activate / Deactivate | **Not available here** — those buttons live only in the plans table (`L5940`) | — |
| Effect on existing subscriptions | **None.** No lifecycle handler in this module iterates `DB.subscriptions`. The Archive modal's copy "Existing subscribers keep their plan until it expires." (`L6161`) is accurate by omission — nothing happens to them. | `L6165–L6175` |
| Plan visibility | Configured in Settings, not here — `14a` §9.4 | `L1603–L1618`, `L8122–L8146` |

### Status → `renderPlansFormSelects()` mechanics (`L12796–L12806`)
```js
var w = document.getElementById('fp3-status-wrap');          L12797
if (!w) return;                                              L12798
var p = DB.plans[currentPlanKey];                            L12799
var status = p ? p.status : 'Active';                        L12800   // fallback when no plan open
if (!document.getElementById('csel-fp3-status'))             L12801
    w.innerHTML = customSelectHTML('csel-fp3-status','fp3-status',
        [{Active},{Draft},{Archived}], status);              L12802–L12805
else
    cselSetValue('csel-fp3-status','fp3-status',status);     L12806
```
`customSelectHTML()` (`L5336–L5354`) emits a `.csel` wrapper with a `.csel-btn` display button, a `.csel-menu` option list, and a **hidden `<input id="fp3-status">`** carrying the value (`L5352`). With only 3 options the search box is suppressed (`L5343` requires `options.length > 6`). `cselSetValue()` (`L5427–L5438`) rewrites the hidden input plus the `.sel` class and the visible label.

---

## 10. Plan features

Section 2, `L1107–L1114`. Backed by the module-level buffer `var PLAN_FEATURES` (`L5992–L5996`) and persisted to `DB.plans[key].features` (`L6142`).

### Declared data model (from the UI copy at `L1108`)
> Table `plan_features` (FK `plan_id`) — one row per bullet point. Replaces the long rich-text description field. Renders as a scannable bullet list on the rider's plan card in the app. Both EN and AR required. Max ~60 characters per point for clean display on mobile.

Code comment (`L5987–L5991`) adds: "on a real backend each row maps to a `plan_features` record with `(plan_id, sort_order, text_en, text_ar)`".

### Feature object schema
| Field | Type | Required | Notes |
|---|---|---|---|
| `en` | string | **Yes** — `validatePlanFeatures()` `L6053` | `maxlength="80"` on the input (`L6011`); amber warning above 60 chars (`L6006`, `L6014`) |
| `ar` | string | **Yes** — `L6053` | `maxlength="80"`, `dir="rtl"`, `text-align:right` (`L6015`, `L6017`); amber warning above 60 chars (`L6018`) |

There is **no `id`, no `sortOrder` and no enabled/disabled flag** on a feature object — order is array position (`L6045–L6046`), and a feature is either present or deleted. **There is no per-feature toggle anywhere in this file.**

### Feature list — every operation

| Operation | Trigger | Handler | Effect | Re-renders? |
|---|---|---|---|---|
| Load for a plan | opening the page | `loadPlanEditForm()` `L6092–L6095` | Empties `PLAN_FEATURES` in place (`PLAN_FEATURES.length=0`) then pushes a **shallow copy** of each `p.features` entry (`L6093–L6094`), so editing does not mutate `DB` until save | Yes `L6095` |
| Render | — | `renderPlanFeatures()` `L5998–L6022` | Builds one `.pf-row` per entry: drag handle `⠿`, EN input, AR input, `✕` remove button | — |
| Edit EN text | `oninput` on the EN input `L6012` | inline `PLAN_FEATURES[i].en = this.value; pfCharHint(this,i,'en')` | Mutates the buffer **per keystroke**; no re-render (deliberate — comment `L6023–L6026`: "typing mutates `PLAN_FEATURES` directly so focus never jumps mid-word") | No |
| Edit AR text | `oninput` on the AR input `L6016` | inline `PLAN_FEATURES[i].ar = this.value; pfCharHint(this,i,'ar')` | same | No |
| Character hint | on every keystroke | `pfCharHint(inp,i,lang)` `L6027–L6029` | Sets the input border to `var(--amber)` above 60 chars, `var(--border2)` otherwise. The explanatory text under the field appears only on the **next** re-render (`L6014`, `L6018`) — stated in the comment `L6025–L6026` | No |
| Add | `+ Add feature point` button `L1112` | `addPlanFeature()` `L6030–L6036` | Pushes `{en:'',ar:''}`, re-renders, then focuses the new row's **first input** (the EN field) | Yes |
| Remove | `✕` button per row `L6019` (title "Remove this point") | `removePlanFeature(i)` `L6037–L6040` | `splice(i,1)`, re-render. **No permission check and no audit entry** — but it *is* confirm-gated (`GATE_SWEEP.removePlanFeature` `L20839`). | Yes |
| Reorder | drag `⠿` `L6010` (`draggable="true"` on the row, `L6007`) | `pfDragStart(e,i)` `L6041` stores `_pfDragIdx` (`L5997`), `pfDrop(e,i)` `L6042–L6049` splices the moved item to the new index | No-ops when `_pfDragIdx` is null or equal to the target (`L6044`). `ondragover="event.preventDefault()"` on each row enables the drop (`L6008`). | Yes `L6048` |
| Validate | on Save | `validatePlanFeatures()` `L6050–L6056` | Returns `'Feature point <n> is missing its English/Arabic text — both languages are required.'` for the first offender, else `null`. Whitespace-only counts as missing (`.trim()`, `L6053`) | — |
| Persist | Save | `savePlan()` `L6142` | `p.features = PLAN_FEATURES.map(f => ({en:f.en, ar:f.ar}))` — a fresh shallow copy | — |

### Empty state
`renderPlanFeatures()` `L6001–L6004`: when `PLAN_FEATURES.length === 0` it renders a dashed-border placeholder reading *"No feature points yet — add at least one so the rider's plan card isn't empty."* **This is advisory only** — `validatePlanFeatures()` (`L6050`) iterates the array and returns `null` for an empty list, so **a plan can be saved with zero feature points** despite the copy.

### Helper text on the page
- `L1113`: "Drag ⠿ to reorder. Changes are saved together with the rest of the plan when you click \"Save plan\"."
- `L1111`: the list is inside a `max-height:300px; overflow-y:auto` scroller.

### Seeded feature values
`PLAN_FEATURES` ships with the weekly plan's three points as its module-level default (`L5992–L5996`) — identical to `DB.plans.weekly.features` (`L2891`). This default is only visible if `renderPlanFeatures()` runs before `loadPlanEditForm()` swaps the buffer; per-plan lists are in `14a` §5.

---

## 11. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| `#plan-edit-sub` `L1083` | `p.name + ' plan · plan_id: ' + p.key` | string | Written `L6084`; re-written after save `L6144` |
| `#tb-sub` (toolbar) | same string | string | Written `L6085` — the editor deliberately overwrites the router's `subs['plan-edit']` value |
| `#plan-edit-name-display` `L1085` | `p.name + ' plan'` | string | `L6083`, re-written `L6143` |
| `#fp3-pill` `L1085` | computed from `#fp3-comm` / `#fp3-disc` | string | `L12992` — reads the **inputs**, not `DB` |
| `#fp3-eg` / `#fp3-et` / `#fp3-ed` `L1086` | `cr()` Economy `g` / `t` / `dr` | SAR strings | `L12997` |
| `#fp3-cg` / `#fp3-ct` / `#fp3-cd` `L1086` | `cr()` Comfort `g` / `t` / `dr` | SAR strings | `L12998` |
| `#fp3-ds` `L1103` | `100 − eyvarPct` | percent | `L12989` |
| `#fp3-rc` / `#fp3-rd` `L1121` | `eyvarPct` / `discountPct` | percent | `L12990–L12991` |
| `#fp3-eex` / `#fp3-cex` `L1121–L1122` | `cr()` three-line HTML | HTML | `L12995–L12996` |
| `#fp3-status-wrap` `L1097` | `DB.plans[key].status` | custom select | `L12799–L12806` |
| `#pf-list` `L1111` | `PLAN_FEATURES` ← `DB.plans[key].features` | list | `L5998–L6022` |
| All 13 core inputs | `DB.plans[currentPlanKey].*` | see §12 | `L6069–L6082` |

**Nothing on this page displays live subscription counts, revenue, or any cross-entity aggregate.** The page reads exactly one plan object.

---

## 12. Input fields — every one

### Section 1 — Plan core data (`L1088–L1106`)

| id | Type | Label | Default (static markup) | Unit | HTML constraints | JS validation | Loaded from | Writes to |
|---|---|---|---|---|---|---|---|---|
| `fp3-name-en` | `text` | `Name (EN) *` `L1090` | `Weekly plan` | — | none | **Required**: trimmed, blank → toast `⚠ Both English and Arabic names are required` (`warn`) and abort `L6123–L6125` | `p.name` `L6069` | `p.name` `L6131` |
| `fp3-name-ar` | `text`, `style="direction:rtl;text-align:right"` | `Name (AR) *` `L1091` | `الباقة الأسبوعية` | — | none | **Required** — same combined check `L6125` | `p.nameAr \|\| ''` `L6070` | `p.nameAr` `L6131` |
| `fp3-duration` | `number` | `Duration (days)` `L1094` | `7` | days | `min="1"` | `numval()` `L6150–L6155`: `parseFloat`; `NaN` → keeps the **previous stored value** (no error) | `p.duration` `L6071` | `p.duration` `L6132` |
| `fp3-exec` | `number` | `Execute days` `L1095` | `5` | days/trips | `min="1"` | `numval()` fallback | `p.execute` `L6072` | `p.execute` `L6133` |
| `fp3-cap` | `number` | `Cancel cap` `L1096` | `1` | count | `min="0"` | `numval()` fallback | `p.cap` `L6073` | `p.cap` `L6134` |
| `fp3-status` (hidden, inside `#fp3-status-wrap`) | hidden input behind a `.csel` custom select | `Status` `L1097` | built at runtime | enum `Active`/`Draft`/`Archived` | — | none | `p.status` `L12800` | **NOTHING** — never read by `savePlan()` |
| `fp3-comm` | `number` | `Eyvar commission %` `L1101` | `20` | % | `min="0" max="100" step="0.1"` | `numval()` fallback; **no JS range clamp** | `p.eyvarPct` `L6075` | `p.eyvarPct` `L6136` |
| `fp3-disc` | `number` | `Discount %` `L1102` | `0` | % | `min="0" step="0.1"` — **no `max`** | `numval()` fallback; **no JS clamp** | `p.discountPct` `L6076` | `p.discountPct` `L6137` |
| `fp3-ds` | *(not an input)* `<div class="computed-box">` | `Driver share (computed)` `L1103` | `80.0%` | % | — | — | derived `L12989` | — |
| `fp3-sort` | `number` | `Sort order` `L1104` | `1` | rank | **no min/max/step** | `numval()` fallback | `p.sortOrder \|\| 1` `L6074` | `p.sortOrder` `L6135` |

### Section 2 — Feature list (`L1110–L1114`)

| id / selector | Type | Label | Default | Constraints | Validation | Writes to |
|---|---|---|---|---|---|---|
| EN input (per row, no id) `L6011` | `text`, `placeholder="Feature point (EN)"` | — | current `f.en` | `maxlength="80"`; border turns amber >60 chars (`L6006`, `L6013`, `L6028`) | `validatePlanFeatures()` `L6053` — non-blank after trim | `PLAN_FEATURES[i].en` on `input` `L6012`, then `p.features` on save `L6142` |
| AR input (per row, no id) `L6015` | `text`, `dir="rtl"`, `placeholder="نقطة الميزة (AR)"` | — | current `f.ar` | `maxlength="80"`; amber >60 chars (`L6006`, `L6017`, `L6028`) | `validatePlanFeatures()` `L6053` | `PLAN_FEATURES[i].ar` on `input` `L6016`, then `p.features` `L6142` |

Values are HTML-escaped on render via `String(f.en\|\|'').replace(/"/g,'&quot;')` (`L6011`, `L6015`) — quotes only, **not** `<`, `>` or `&`.

### Section 3 — Vehicle pricing (`L1116–L1126`)

| id | Type | Label | Default | Unit | HTML constraints | Validation | Loaded from | Writes to |
|---|---|---|---|---|---|---|---|---|
| `fp3-emin` | `number` | Economy `SAR/min *` `L1119`/`L1121` | `0.95` | SAR/min | `step="0.01" min="0"` | `numval()` fallback; the `*` "required" marker is **not enforced** | `p.ecoMin` `L6077` | `p.ecoMin` `L6138` |
| `fp3-ekm` | `number` | Economy `SAR/km *` `L1121` | `1.10` | SAR/km | `step="0.01" min="0"` | `numval()` fallback | `p.ecoKm` `L6078` | `p.ecoKm` `L6139` |
| `fp3-eco-active` | `checkbox`, `checked` | Economy `Active` `L1121` | checked | — | — | `onchange="toggleVehicleActive('Economy',this.checked)"` — **writes immediately**, gated on `manage_plans` `L6110` | `p.ecoActive !== false` `L6081` | `p.ecoActive` `L6113` |
| `fp3-cmin` | `number` | Comfort `SAR/min *` `L1122` | `1.35` | SAR/min | `step="0.01" min="0"` | `numval()` fallback | `p.comfortMin` `L6079` | `p.comfortMin` `L6140` |
| `fp3-ckm` | `number` | Comfort `SAR/km *` `L1122` | `1.60` | SAR/km | `step="0.01" min="0"` | `numval()` fallback | `p.comfortKm` `L6080` | `p.comfortKm` `L6141` |
| `fp3-comfort-active` | `checkbox`, `checked` | Comfort `Active` `L1122` | checked | — | — | `onchange="toggleVehicleActive('Comfort',this.checked)"` — immediate write, gated `L6110` | `p.comfortActive !== false` `L6082` | `p.comfortActive` `L6113` |

### Live-recalculation binding
```js
['fp3-comm','fp3-disc','fp3-exec','fp3-emin','fp3-ekm','fp3-cmin','fp3-ckm']
  .forEach(id => { var el = document.getElementById(id); if (el) el.addEventListener('input', upd); });
upd();
```
— `L13000–L13001`. Seven fields drive the live preview; `fp3-duration`, `fp3-cap`, `fp3-sort`, both name fields and the status select are **not** bound (they do not affect any displayed formula). The trailing bare `upd()` call runs once at script parse time against the static placeholder markup.

### `numval()` — the shared number reader (`L6150–L6155`)
```js
function numval(id,fallback){
  var el=document.getElementById(id);
  if(!el)return fallback;
  var v=parseFloat(el.value);
  return isNaN(v)?fallback:v;
}
```
`fallback` is always the plan's **current stored value** (`L6132–L6141`), so clearing a numeric field and saving silently reverts that field rather than writing `0` or raising an error.

---

## 13. Actions

| Label | Element | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| **← Plans** | header `L1083` | `go('plans',null)` `L8774` | Navigate away. **No unsaved-changes warning** — typed edits are lost, but `toggleVehicleActive` writes and `PLAN_FEATURES` buffer edits already happened | — | none | none | No |
| **Save** (header) | `L1083` | `savePlan(this)` `L6117` | Identical to the footer Save | see below | see below | see below | see below |
| **Archive** (top bar, danger) | `L1085` | `archivePlan()` `L6156–L6164` | Opens a bespoke modal: title `Archive <name> plan`, red box "Archiving hides this plan from new subscriptions. Existing subscribers keep their plan until it expires.", `Cancel` / `Archive plan` (danger) | modal DOM only | **None on the opener** — the gate is on `doArchivePlan()` `L6166` | none until commit | **Yes** — bespoke modal `L6159–L6162` |
| — commit | modal button | `doArchivePlan()` `L6165–L6175` | `p.status='Archived'` `L6170`, `closeModal()` `L6171`, `logAction('archive_plan','plan',p.key,'Archived <name> plan',{status:<real prior>},{status:'Archived'})` `L6172`, toast `<name> plan archived` with `err` styling `L6173`, `go('plans',null)` `L6174`. **Does not call `renderPlansTable()`** — the router's `plans` branch (`L8807`) re-renders it on arrival. | `DB.plans[key].status`, `DB.auditLog` | `requirePerm('manage_plans')` `L6166` | `archive_plan` — **missing from `ACTION_LABELS`** (`L2899–L2913`), so the activity log shows the raw key | — |
| **+ Add feature point** | `L1112` | `addPlanFeature()` `L6030–L6036` | Push blank `{en:'',ar:''}`, re-render, focus the new EN input | `PLAN_FEATURES` (buffer only) | **none** | **none** | **Yes** — `GATE_SWEEP.addPlanFeature` `L20838` |
| **✕** (per feature row) | `L6019` | `removePlanFeature(i)` `L6037–L6040` | `splice(i,1)`, re-render | `PLAN_FEATURES` (buffer only) | **none** | **none** | **Yes** — `GATE_SWEEP.removePlanFeature` `L20839` |
| Drag `⠿` | `L6010` / row `L6007` | `pfDragStart` `L6041` + `pfDrop` `L6042` | Reorder in the buffer, re-render | `PLAN_FEATURES` (buffer only) | none | none | No |
| **Active** checkbox (Economy) | `L1121` | `toggleVehicleActive('Economy',checked)` `L6109–L6116` | Immediate `p.ecoActive = checked` `L6113`, audit `L6114`, toast `✅ Economy enabled — riders will see it on this plan` / `🚫 Economy disabled — hidden from this plan until re-enabled` `L6115` | `DB.plans[key].ecoActive`, `DB.auditLog` | `requirePerm('manage_plans')` `L6110` — **but the checkbox has already flipped visually** when the permission is denied, leaving the UI out of sync with `DB` | `toggle_vehicle_active` — **missing from `ACTION_LABELS`** `L2899–L2913` | **No** |
| **Active** checkbox (Comfort) | `L1122` | `toggleVehicleActive('Comfort',checked)` | same, writes `p.comfortActive` `L6113` | `DB.plans[key].comfortActive`, `DB.auditLog` | `manage_plans` `L6110` | `toggle_vehicle_active` | No |
| **Cancel** (footer) | `L1127` | `go('plans',null)` | Navigate away, no warning | — | none | none | No |
| **Save plan** (footer) | `L1127` | `savePlan(this)` `L6117–L6149` | See detailed sequence below | `DB.plans[currentPlanKey]` (12 fields + `features`), `DB.auditLog` | `requirePerm('manage_plans')` `L6118` | `save_plan` — **missing from `ACTION_LABELS`** `L2899–L2913` | **Yes** — `GATE_SWEEP.savePlan` `L20804–L20806` |

### `savePlan(btn)` — exact sequence (`L6117–L6149`)

1. `requirePerm('manage_plans')` — abort on failure (`L6118`).
2. `p = DB.plans[currentPlanKey]`; if absent → toast `⚠ No plan is open — go back to Plans and pick one` (`err`), abort (`L6119–L6120`).
3. `validatePlanFeatures()` — on error, toast `⚠ <message>` (`warn`) and abort (`L6121–L6122`).
4. Read and trim `#fp3-name-en` and `#fp3-name-ar`; if **either** is blank → toast `⚠ Both English and Arabic names are required` (`warn`) and abort (`L6125`).
5. Capture `before` snapshot of **12 fields**: `name, nameAr, duration, execute, cap, sortOrder, eyvarPct, discountPct, ecoMin, ecoKm, comfortMin, comfortKm` (`L6126–L6127`). **`status`, `ecoActive`, `comfortActive` and `features` are excluded from the diff.**
6. Set button text to `Saving…` and `disabled = true` (`L6127`).
7. `setTimeout(…, 700)` — **simulated 700 ms latency** (`L6128`, `L6148`). Inside:
   - Restore the button label and enabled state (`L6130`).
   - Write `name`, `nameAr` (`L6131`), then the nine numeric fields via `numval()` (`L6132–L6141`).
   - `p.features = PLAN_FEATURES.map(f => ({en:f.en, ar:f.ar}))` (`L6142`).
   - Refresh `#plan-edit-name-display` (`L6143`) and `#plan-edit-sub` (`L6144`). **`#tb-sub` is NOT refreshed** — it keeps the pre-save name until the page is re-entered.
   - `renderPlansTable()` (`L6145`) — the list behind this page updates even though it is hidden.
   - `logAction('save_plan','plan',p.key,'Saved <name> plan — core data, <n> feature points, vehicle pricing', before, after)` (`L6146`) — `after` mirrors the same 12 fields.
   - Toast `✅ <name> plan saved — including <n> rider-facing feature points` (`ok`) (`L6147`).
8. `upd()` is **not** called after save, so the preview strip keeps whatever the inputs already produced (consistent, since the inputs are the source).

**Gate spec** — `GATE_SWEEP.savePlan` `L20804–L20806`, `d:true` (danger):
- Title: `Save the plan`
- Summary: `Plan pricing and rules apply to new subscriptions.`
- Consequences: `Subscriptions already sold keep the terms they were sold under.` / `An active plan appears on the rider app immediately.`
- Confirm label: `Save plan`

Installed by `gateAll(GATE_SWEEP)` (`L20756–L20767`) via `guardAction()` (`L17819–L17840`); rendered by `confirmAction()` (`L17769–L17801`), committed by `runConfirm()` (`L17803–L17815`).

---

## 14. Tables & lists

### 14.1 Vehicle pricing table (`L1117–L1124`)
Static HTML, class `ptable`, `<colgroup>` at `L1118`.

| # | Column | Width | Content | Editable |
|---|---|---|---|---|
| 1 | `Vehicle` | 12% | `<strong>Economy</strong>` / `<strong>Comfort</strong>` | No — hardcoded |
| 2 | `SAR/min *` (`class="ci"`) | 16% | `#fp3-emin` / `#fp3-cmin` | Yes |
| 3 | `SAR/km *` (`class="ci"`) | 16% | `#fp3-ekm` / `#fp3-ckm` | Yes |
| 4 | `Commission` | 10% | `#fp3-rc` (live %) / static `↑ plan` | No |
| 5 | `Discount` | 10% | `#fp3-rd` (live %) / static `↑ plan` | No |
| 6 | `Active` | 8% | `#fp3-eco-active` / `#fp3-comfort-active` | Yes — immediate write |
| 7 | `Example (10km · 20min × exec days)` | 28% | `#fp3-eex` / `#fp3-cex` (`class="ex-cell"`) | No |

Row source: **hardcoded markup**, not a render loop. No sorting, no filtering, no row click, no row actions, no empty state (two fixed rows always exist).

### 14.2 Feature-point list — `#pf-list` (`L1111`)
Rendered by `renderPlanFeatures()` `L5998–L6022`. Not a `<table>` — a scrollable stack of `.pf-row` flex rows inside a `max-height:300px; overflow-y:auto` container.

| Position | Element | Source | Interaction |
|---|---|---|---|
| 1 | `⠿` drag handle, `title="Drag to reorder"`, `cursor:grab` | static glyph `L6010` | drag source (`L6007–L6008`) |
| 2 | EN text input, `flex:1` | `f.en` `L6011` | `oninput` mutates buffer `L6012` |
| 2b | amber hint `"<n> chars — may wrap on mobile (aim for ≤60)"` | conditional, `enLong` `L6006`/`L6014` | — |
| 3 | AR text input, `flex:1`, RTL | `f.ar` `L6015` | `oninput` mutates buffer `L6016` |
| 3b | amber hint `"<n> حرف — قد يلتف على الجوال (الأفضل ≤60)"` | conditional, `arLong` `L6018` | — |
| 4 | `✕` button, `title="Remove this point"`, 26×26px | `L6019` | `removePlanFeature(i)` |

Row source: `PLAN_FEATURES` array order (`L6005`), index carried as `data-idx` (`L6007`).
Sorting/filtering: none — order is manual via drag only.
Row click: none (only the child controls are interactive).
**Empty state:** dashed-border card, `L6002` — *"No feature points yet — add at least one so the rider's plan card isn't empty."*

---

## 15. Modals opened

| Modal | Opened by | Header | Body | Footer |
|---|---|---|---|---|
| **Archive plan** | `archivePlan()` `L6156–L6164` | `Archive <name> plan` + `✕` → `closeModal()` | Red box (`var(--red-lt)`, `var(--red-border)`): "Archiving hides this plan from new subscriptions. Existing subscribers keep their plan until it expires." **No active-subscription count** (unlike the Deactivate modal, `14a` §15) | `Cancel` → `closeModal()`; `Archive plan` (danger) → `doArchivePlan()` |
| **Save-plan confirmation gate** | `guardAction`-wrapped `savePlan` `L20804`, rendered by `confirmAction()` `L17769` | `⚠ Save the plan` (danger prefix `L17787`) + `✕` → `cancelConfirm()` `L17802` | Summary paragraph "Plan pricing and rules apply to new subscriptions." then a red-tinted "What happens when you confirm" box with the two consequence bullets. No `options` fields, no `irreversible` warning. | `Cancel` → `cancelConfirm()`; `Save plan` (danger) → `runConfirm()` `L17803` → `savePlan()` re-entry |

Both use the shared `#modal-content` / `#modal-overlay` pair (`.classList.add('open')`, `L6163`, `L17801`).

**No other modal originates on this page** — no unsaved-changes prompt, no feature-delete confirmation, no vehicle-toggle confirmation.

---

## 16. Cross-module links

| Direction | From | To | Line |
|---|---|---|---|
| In | Plans table `Edit` button | `openPlanEdit(key)` → `go('plan-edit')` | `L5939`, `L6061–L6063` |
| In | Plans page `+ New plan` | `newPlan()` → 400 ms delay → `openPlanEdit()` | `L1031`, `L6098–L6107` |
| Out | `← Plans` / `Cancel` | `go('plans',null)` | `L1083`, `L1127` |
| Out | Archive commit | `go('plans',null)` | `L6174` |
| Side-effect out | `savePlan()` re-renders the (hidden) plans list | `renderPlansTable()` `L5927` | `L6145` |
| Side-effect out | Status select rebuild | `renderPlansFormSelects()` `L12796` | `L6089` |
| Data-out | Saved `eyvarPct` → driver payout rate for subscription trips | `commissionRateForPlan()` `L4461–L4466` | `L4463` |
| Data-out | Saved `cap` on the **weekly** plan → Dashboard "Cancellation cap reached today" alert | `L10366–L10367` |
| Data-out | Saved `name` → the prefix used by `activeSubsForPlanCadence()` for the "Active subs" column | `L5921–L5926` |
| Data-out | Saved `status` (via Archive) → plans-table badge, `liveSubtitles()` counter | `L5938`, `L21252` |
| Audit-out | `save_plan`, `archive_plan`, `toggle_vehicle_active` entries → Activity log page | `L3133`, `L6146`, `L6172`, `L6114` |
| Toolbar | `#tb-title` / `#tb-sub` written by `go()` then partially overwritten by the editor | `L8785–L8786`, `L6085` |
| Not linked | `nameAr`, `features`, `ecoActive`, `comfortActive`, `sortOrder`, `duration` have **no downstream consumer** anywhere in the file (`14a` §19) | — |

---

## 17. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| Entire static form state (`Weekly plan`, `الباقة الأسبوعية`, `7`, `5`, `1`, `20`, `0`, `80.0%`, `1`, `0.95`, `1.10`, `1.35`, `1.60`, both checkboxes checked) | `L1083–L1122` | See §5 — shipped in markup, visible at boot before any plan is loaded |
| `plan_id: 1` in the static sub-line | `L1083` | Real plan ids are string keys (`weekly`, `biweekly`, `monthly`, `new1`…), never `1` |
| `subs['plan-edit'] = 'Weekly plan · plan_id: 1'` | `L2169` | Same fiction, in the router's subtitle map |
| `Eyvar 20% · Discount 0%` pill | `L1085` | Static until `upd()` runs |
| `Section 1 of 3` / `2 of 3` / `3 of 3` badges | `L1087`, `L1107`, `L1115` | Static text, no logic behind the count |
| `20` min and `10` km hardcoded in `cr()` | `L12986` | The only place the example trip is defined; not configurable |
| `Example (10km · 20min × exec days)` column header, `Economy 10km/20min →` / `Comfort 10km/20min →` preview labels | `L1119`, `L1086` | Must be edited by hand if `cr()` changes |
| `↑ plan` in the Comfort commission/discount cells | `L1122` | Static string standing in for "inherits plan-level rate" |
| `maxlength="80"` on feature inputs vs. the "~60 characters" guidance | `L1108`, `L6011`, `L6015` | Two different limits: 60 = soft warning, 80 = hard cap |
| `PLAN_FEATURES` module default (the weekly plan's 3 points) | `L5992–L5996` | Duplicates `DB.plans.weekly.features` (`L2891`) |
| 700 ms fake save latency | `L6128`, `L6148` | Simulated network round-trip |
| 400 ms delay before `newPlan()` opens the editor | `L6107` | Simulated |
| `'New plan'` / `''` Arabic name / weekly rate card as the new-plan template | `L6103–L6105` | |
| `status` fallback `'Active'` when no plan is open | `L12800` | Would show the wrong badge on an unloaded form |
| Formula box text | `L1125` | Hand-written HTML, not generated from `cr()` — the two can drift |

---

## 18. i18n / localisation

| Item | Detail | Line |
|---|---|---|
| `data-i18n` attributes on this page | **None.** No `data-i18n` appears between `L1082` and `L1129`. Every label, heading, section title, table header, helper paragraph, toast and modal string is a hardcoded English literal. | — |
| Toolbar title | `titles['plan-edit'] = 'Edit Plan'` — plain string, not keyed for translation | `L2168` |
| RTL page support | `body.lang-ar` CSS exists only for `#stab-general` and `#stab-security` (`L394`, `L398`) — **the plan editor has no RTL layout rules at all** | `L394`, `L398` |
| Arabic **data** field — plan name | `#fp3-name-ar` `L1091`, inline `style="direction:rtl;text-align:right"`. Loaded `L6070`, saved `L6131`, **required** `L6125`. Stored as `p.nameAr`. | — |
| Arabic **data** field — feature text | AR input per row, `dir="rtl"` + `text-align:right` `L6015`/`L6017`. Loaded `L6094`, saved `L6142`, **required** `L6053`. Placeholder is localised: `نقطة الميزة (AR)` `L6015`. | — |
| Localised helper string | The Arabic over-length hint is translated: `'<n> حرف — قد يلتف على الجوال (الأفضل ≤60)'` `L6018`, right-aligned. Its English twin is `'<n> chars — may wrap on mobile (aim for ≤60)'` `L6014`. **These are the only two Arabic UI strings on the page.** | — |
| Bilingual enforcement | Both name fields and both feature-text fields are mandatory in both languages — `L6125` (names) and `L6053` (features). The section-2 helper text states it: "Both EN and AR required." `L1108` | — |
| Validation message language | The bilingual-requirement errors are themselves **English only** (`L6053`, `L6125`) | — |
| Currency / number formatting | `fmt(n) = n.toFixed(2) + ' SAR'` `L12985`; percentages `toFixed(1)` `L12989–L12992`. No `Intl.NumberFormat`, no locale-aware digits (Arabic-Indic numerals are never used). | — |
| Seeded Arabic plan names | `الباقة الأسبوعية` / `الباقة نصف الشهرية` / `الباقة الشهرية` — `L2890`, `L2892`, `L2894` | — |
| Seeded Arabic feature strings | 4 distinct strings, listed in `14a` §5 | `L2891`, `L2893`, `L2895` |

---

## 19. Gaps, dead code, UNVERIFIED items

1. **The Status dropdown is a no-op.** `#fp3-status-wrap` (`L1097`) renders a fully functional three-option custom select and `cselPick` writes the chosen value into the hidden `#fp3-status` input — but `savePlan()` (`L6117–L6149`) never reads it, and `status` is absent from both the `before` snapshot (`L6126–L6127`) and the write block (`L6131–L6142`). Changing a plan's status from the editor is impossible; only the plans-table Activate/Deactivate buttons and the Archive button work.
2. **`renderPlansFormSelects()` builds the select only once per DOM lifetime.** The `if(!document.getElementById('csel-fp3-status'))` branch (`L12801`) means the option list is never rebuilt; subsequent opens only call `cselSetValue()` (`L12806`). Correct here (the three statuses are fixed), but it means a plan whose status is not one of the three would leave the visible label stale — `cselSetValue()` silently does nothing when no `.csel-opt[data-value=…]` matches (`L5433–L5437`).
3. **No unsaved-changes guard.** `← Plans` (`L1083`) and `Cancel` (`L1127`) navigate away immediately. Typed values are discarded — but `toggleVehicleActive()` has already written to `DB` (`L6113`) and `PLAN_FEATURES` has already been mutated (`L6012`, `L6016`), so "Cancel" is only partially a cancel: reopening the plan reloads `p.features` from `DB` (`L6092–L6094`), discarding feature edits, while the vehicle-active flags persist.
4. **`toggleVehicleActive()` desyncs the checkbox on permission failure.** The checkbox flips visually before `requirePerm('manage_plans')` (`L6110`) refuses; nothing reverts `this.checked`, so the UI shows a state `DB` does not have until the page is reloaded.
5. **`toggleVehicleActive()` writes to a plan the user may not be viewing** — it reads `DB.plans[currentPlanKey]` (`L6111`), not a key passed by the handler. Correct in normal flow, but if `currentPlanKey` is null the function silently returns after already flipping the box (`L6112`).
6. **`ecoActive` / `comfortActive` are dead data.** Written and audited (`L6113–L6114`), but no consumer exists. The toast copy "riders will see it on this plan" / "hidden from this plan until re-enabled" (`L6115`) describes behaviour that does not exist.
7. **Three audit action keys are missing from `ACTION_LABELS`** (`L2899–L2913`): `save_plan` (`L6146`), `archive_plan` (`L6172`), `toggle_vehicle_active` (`L6114`). Only `activate_plan` / `deactivate_plan` are registered (`L2911`), so this page's three most common actions render with raw snake_case keys in the activity log.
8. **The save diff omits four fields.** `before`/`after` cover 12 fields (`L6126–L6127`, `L6146`) but not `status`, `ecoActive`, `comfortActive` or `features` — the audit summary mentions the feature count but the diff cannot show what changed in the list.
9. **Feature add / remove / reorder carry no permission check and no audit entry** (`L6030`, `L6037`, `L6042`). A user without `manage_plans` can delete every feature point and only discovers the refusal at Save. Add and remove *are* confirm-gated (`GATE_SWEEP.addPlanFeature` `L20838`, `GATE_SWEEP.removePlanFeature` `L20839`); **reorder (`pfDrop` `L6042`) is gated by nothing at all** — a drag silently rewrites the order.
10. **The empty-feature-list copy is a lie.** `L6002` says "add at least one so the rider's plan card isn't empty", but `validatePlanFeatures()` (`L6050–L6056`) returns `null` for an empty array, so a plan saves fine with zero features.
11. **The `*` required markers on the rate columns are not enforced.** `SAR/min *` and `SAR/km *` (`L1119`) have no validation; `numval()` (`L6150`) silently restores the previous value when the field is blank, so a "cleared" rate is not an error and not a zero.
12. **No range validation on percentages.** `#fp3-comm` carries `max="100"` in HTML (`L1101`) but nothing clamps in JS; `#fp3-disc` has **no `max` at all** (`L1102`), so a discount above 100% would make `dc = g × (1 − d/100)` negative (`L12986`) and produce a negative plan total, with no warning anywhere.
13. **No floor / break-even check.** The rate-card model defines `planFloorCheck()` (`L21512`) and describes it as "the check that blocks a publish" (`L21511`), but this editor never calls it and no floor is enforced on any plan price. (`planFloorCheck` has no call site anywhere — grep confirms only its definition.)
14. **`#tb-sub` goes stale after a rename.** `savePlan()` updates `#plan-edit-name-display` and `#plan-edit-sub` (`L6143–L6144`) but not `#tb-sub`, which `loadPlanEditForm()` set on entry (`L6085`).
15. **`renderPlanFeatures()` is called twice on entry** — once inside `loadPlanEditForm()` (`L6095`) and again by the router (`L8795`). Harmless, but the second call re-renders a list that was just built.
16. **Feature HTML escaping is incomplete.** `String(f.en||'').replace(/"/g,'&quot;')` (`L6011`, `L6015`) escapes double quotes only. `<`, `>` and `&` pass through into the `value="…"` attribute; the amber hint blocks (`L6014`, `L6018`) interpolate `f.en.length` (a number, safe) but the row is otherwise built by string concatenation.
17. **Duplicate Save buttons with no differentiation.** The header `Save` (`L1083`) and the footer `Save plan` (`L1127`) both call `savePlan(this)`; both are wrapped by the same gate, so confirming from either shows the identical modal.
18. **`archivePlan()` (the opener) has no permission check** (`L6156`) — the gate is only on `doArchivePlan()` (`L6166`), so an unauthorised user gets the full confirmation modal before being refused.
19. **Archive does not remove the plan from the list.** `doArchivePlan()` only sets `status='Archived'` (`L6170`); `renderPlansTable()` still renders it with an "Activate" button (`L5934`, `L5940`) that flips it straight back to Active. Archived is behaviourally identical to Draft.
20. **`upd()` runs once at parse time** against the static markup (`L13001`) and binds its seven listeners then (`L13000`). Since the form markup is static (not re-created), the bindings survive — but any future move to a rendered form would silently lose them.
21. **`gv()` treats blank as 0** (`L12984`) while `numval()` treats blank as "keep previous" (`L6150–L6155`). The live preview and the saved value therefore disagree for an empty field: the preview shows the 0-based result, the save keeps the old number.
22. **The formula box is hand-written HTML** (`L1125`) with no link to `cr()` (`L12986`). The two currently agree, but nothing keeps them in sync.
23. **UNVERIFIED — drag-and-drop across the scroll boundary.** `#pf-list` is a `max-height:300px` scroller (`L1111`); the drag handlers (`L6041–L6049`) implement no auto-scroll, so reordering an item past the visible window may not be reachable. Behaviour depends on browser native drag scrolling and cannot be confirmed from source.
24. **`cselPick()` is wired but its result is thrown away.** Defined at `L5394` (`window.cselPick=function(cselId,fieldId,value,label,onChangeExpr)`), invoked from each option's `onclick` (`L5346`). `renderPlansFormSelects()` passes **no `onChangeExpr`** (`L12802–L12805`), so picking a status updates only the hidden `#fp3-status` input and the visible label — nothing else reacts, and `savePlan()` never reads that input. Reinforces #1.
25. **UNVERIFIED — whether any backend/export path consumes `plan_features`.** The UI documents a `plan_features` table with `(plan_id, sort_order, text_en, text_ar)` (`L1108`, `L5990–L5991`), but this file is a single-page demo with no persistence layer; nothing exports or serialises `DB.plans`.

---

## 20. Line-number index

### HTML — `p-plan-edit` (`L1082–L1129`)
| Line | Content |
|---|---|
| `L1081` | `<!-- PAGE: PLAN EDIT -->` |
| `L1082` | `<div class="page" id="p-plan-edit">` |
| `L1083` | Page header — `<h1>Edit plan</h1>`, `#plan-edit-sub`, `← Plans` (`go('plans',null)`), `Save` (`savePlan(this)`) |
| `L1084` | `<div class="card">` |
| `L1085` | Form top bar — `#plan-edit-name-display`, `#fp3-pill`, **Archive** (`archivePlan()`) |
| `L1086` | `.preview-strip` — `#fp3-eg`, `#fp3-et`, `#fp3-ed`, `#fp3-cg`, `#fp3-ct`, `#fp3-cd` |
| `L1087` | `.sec-head` — "Section 1 of 3 · Plan core data" |
| `L1088–L1106` | Section 1 `.sec-body` |
| `L1089–L1092` | `.g2` — `#fp3-name-en`, `#fp3-name-ar` |
| `L1093–L1098` | `.g4` — `#fp3-duration`, `#fp3-exec`, `#fp3-cap`, `#fp3-status-wrap` |
| `L1099` | `<hr class="fdiv">` |
| `L1100–L1105` | `.g4` — `#fp3-comm`, `#fp3-disc`, `#fp3-ds`, `#fp3-sort` |
| `L1107–L1109` | `.sec-head` — "Section 2 of 3 · Rider-facing feature list" + `plan_features` explainer |
| `L1110–L1114` | Section 2 `.sec-body` — `#pf-list`, `+ Add feature point`, drag hint |
| `L1115` | `.sec-head` — "Section 3 of 3 · Vehicle pricing" |
| `L1116–L1126` | Section 3 `.sec-body` |
| `L1117–L1124` | `.ptable` — `<colgroup>` `L1118`, `<thead>` `L1119`, Economy row `L1121`, Comfort row `L1122` |
| `L1125` | `.formula-box` — four-line formula + note |
| `L1127` | `.form-footer` — `Cancel`, `Save plan` |
| `L1128–L1129` | closing `</div>` × 2 |

### JavaScript — data & constants
| Line | Content |
|---|---|
| `L2168–L2169` | `titles['plan-edit']`, `subs['plan-edit']` |
| `L2889–L2896` | `DB.plans` seed |
| `L2897` | `var currentPlanKey=null` |
| `L2899–L2913` | `ACTION_LABELS` |
| `L3229`, `L3248` | `manage_plans` permission labels |
| `L5992–L5996` | `PLAN_FEATURES` buffer + default 3 points |
| `L5997` | `var _pfDragIdx=null` |
| `L20804–L20806` | `GATE_SWEEP.savePlan` |

### JavaScript — functions
| Line | Function | Role here |
|---|---|---|
| `L3122` | `can()` | permission lookup |
| `L3126` | `requirePerm()` | gate + denial audit + toast |
| `L3133` | `logAction()` | audit writer |
| `L5269` | `toast()` | all feedback messages |
| `L5336` | `customSelectHTML()` | builds the Status select |
| `L5427` | `cselSetValue()` | resyncs the Status select |
| `L5927` | `renderPlansTable()` | called after save `L6145` |
| `L5998` | `renderPlanFeatures()` | Section 2 renderer |
| `L6027` | `pfCharHint()` | live >60-char border |
| `L6030` | `addPlanFeature()` | |
| `L6037` | `removePlanFeature()` | |
| `L6041` / `L6042` | `pfDragStart()` / `pfDrop()` | reorder |
| `L6050` | `validatePlanFeatures()` | bilingual required check |
| `L6061` | `openPlanEdit()` | entry point |
| `L6065–L6096` | `loadPlanEditForm()` | populates all 13 fields + name displays + status + features + `upd()` |
| `L6098` | `newPlan()` | creates a Draft and routes here |
| `L6109` | `toggleVehicleActive()` | immediate `ecoActive`/`comfortActive` write |
| `L6117–L6149` | `savePlan()` | the commit path |
| `L6150` | `numval()` | numeric reader with previous-value fallback |
| `L6156` | `archivePlan()` | opens the archive modal |
| `L6165` | `doArchivePlan()` | commits `status='Archived'` |
| `L8774` | `window.go` router | `plan-edit` branch `L8795` |
| `L12796–L12806` | `renderPlansFormSelects()` | Status select |
| `L12984` | `gv()` | `parseFloat \|\| 0` |
| `L12985` | `fmt()` | `toFixed(2)+' SAR'` |
| `L12986` | `cr()` | **the plan-price formula** |
| `L12987–L12999` | `upd()` | live preview writer |
| `L13000–L13001` | listener binding + initial `upd()` | |
| `L17769` | `confirmAction()` | gate modal renderer |
| `L17802` / `L17803` | `cancelConfirm()` / `runConfirm()` | |
| `L17819` | `guardAction()` | wraps `savePlan` |
| `L20756` | `gateAll()` | installs `GATE_SWEEP` |
