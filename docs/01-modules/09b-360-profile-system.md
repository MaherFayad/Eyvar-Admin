# Module: 360° Profile system

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `profile` — DOM node `div.page#p-profile`
> **HTML lines:** L1384–L1390 (body container `div#prof-body` at L1389)
> **Render entry:** `window.openProfile(id, isBack)` at **L8827–L8861**
> **Resolver:** `resolveId(raw)` at **L3266–L3275**
> **Companion doc:** `09a-riders.md`

---

## 1. Purpose

`p-profile` is a **single shared shell** reused for six different entity types. It is not a rider page or a driver page — it is a slot machine: `openProfile(id)` takes any raw string, asks `resolveId()` which of six `DB` buckets owns it, sets a type-specific header (`#prof-name`) and meta line (`#prof-meta`), and hands `#prof-body` to one of five builder functions.

Because it accepts an id from anywhere in the app, it is the app's **universal drill-down target**: 40+ call sites across the file route into it (`openProfile(...)` grep, §15). The global search box on every page, every `rowLink()` (L3283), every table row-click in a linked-entity list, and every notification callback lands here.

The rider variant (`buildEntityProfile(d, false)`) is the deepest: 12–15 stacked cards including the LTV/churn `Customer value` card documented in `09a` §5.4.

---

## 2. Entry points & routing

### 2.1 The function signature

```js
window.openProfile = function(id, isBack){ … }        // L8827
```

| Step | Line | Behaviour |
|---|---|---|
| 1 | L8828 | `var hit = resolveId(id)` |
| 2 | L8829 | If no hit: `toast('No record for '+id,'err')` and **return** — the page does not change |
| 3 | L8830 | `if(!isBack) pushHistory()` — pushes the *current* `navCurrent` onto `navStack` (L7006, cap 40, `shift()` on overflow) |
| 4 | L8831 | `navCurrent = {type:'profile', id: hit.data.id}` — note it stores the **resolved** id, so a name search normalises to the record id |
| 5 | L8833 | Removes `.on` from every `.page` |
| 6 | L8834 | Adds `.on` to `#p-profile` |
| 7 | L8835 | `#tb-title` ← `'360° Profile'` (a literal, not the `titles` map) |
| 8 | L8836 | `#tb-sub` ← `d.id` |
| 9 | L8837 | `updateBackBtn()` — shows `#tb-back` iff `navStack.length` (L7005) |
| 10 | L8838 | Caches `#prof-name`, `#prof-meta`, `#prof-body` |
| 11 | L8839–L8858 | Type branch (§6) |
| 12 | L8860 | `document.querySelector('.main').scrollTo(0,0)` |

`isBack` is the only guard against history pollution: `goBack()` (L7012–L7020) calls `openProfile(prev.id, true)`, and every in-place refresh after a mutation passes `true` (e.g. L9040, L9052, L9097, L9109).

### 2.2 `resolveId(raw)` — L3266–L3275

```js
q = (raw||'').trim().toUpperCase()
if (!q) return null

// 1. direct key hit, in this fixed order:
buckets = ['riders','drivers','trips','subscriptions','payments','complaints']
for (i = 0..5)  if (DB[buckets[i]][q]) return {type: buckets[i], data: DB[buckets[i]][q]}

// 2. name substring search — ONLY buckets[0] and buckets[1] (riders, drivers):
for (b = 0..1)
  for (k in DB[bk])
    if (DB[bk][k].name && DB[bk][k].name.toUpperCase().indexOf(q) >= 0)
      return {type: bk, data: DB[bk][k]}

return null
```

Consequences:
* Ids are **case-insensitive** (`rdr-1041` works) and whitespace-trimmed.
* The bucket order is the tie-break: a hypothetical id present in two buckets resolves to the earlier one. In practice the id prefixes (`RDR-`, `DRV-`, `TRP-`, `SUB-`, `PAY-`, `CMP-`) make collisions impossible with seed data.
* **Name search is first-match-wins and unordered** (`for…in` over an object). Searching `AL` returns whichever rider happens to be first in insertion order — there is no disambiguation UI.
* Name search covers riders and drivers only. You cannot find a trip by route, a complaint by subject, or a payment by method.
* `DB.newRiders` is **not** a bucket — `RDR-3001` resolves to `null` until `openNewRiderProfile()` promotes it (L11153–L11158). Typing `RDR-3001` in the global search before that promotion produces `No record found for "RDR-3001"`.
* `DB.pendingDrivers`, `DB.tickets`, `DB.corporateAccounts` are also not buckets — they have their own detail pages (`openApplicantDetail` L8863, `openTicketDetail` L8877, `openCorpDetail`).

### 2.3 Callers

| Wrapper | Line | Note |
|---|---|---|
| `globalSearch(raw)` | L3277–L3281 | `resolveId` → `openProfile(hit.data.id)`; miss → `toast('No record found for "…"','err')` |
| `rowLink(id,label)` | L3283 | The monospace blue id link used in dozens of tables — `onclick="openProfile('<id>')"` |
| Direct `openProfile(...)` call sites | 40+ | See §15 |
| `goBack()` | L7015 | `openProfile(prev.id, true)` when `prev.type==='profile'` |
| Header `← Back` button | L1387 | `onclick="goBack()"` |
| Topbar back button `#tb-back` | L7005 | Visibility toggled by `updateBackBtn()` |

---

## 3. Layout map

```
div.page#p-profile                                    L1384
├── div.ph                                            L1385
│   ├── div.ph-l                                      L1386
│   │   ├── h1#prof-name  ("—" until openProfile runs)
│   │   └── p#prof-meta   ("—")
│   └── div.br → button.btn.sm "← Back" → goBack()    L1387
└── div#prof-body                                     L1389   ← builder output
```

Only **three** ids are addressed: `prof-name`, `prof-meta`, `prof-body` (all read at L8838). The shell has no tabs, no sub-navigation, no sticky elements, and no fixed height. Everything below the header is builder-generated HTML string.

For riders and drivers only, `initCardToggles()` (L9368) runs after the body is written (L8845) — it restructures every `.card > .ch` into `[h2][.ch-right]` and appends a `▾` collapse control. **The other four entity types never get collapsible cards** (no `initCardToggles()` call in their branches).

---

## 4. Data model & fields

The shell itself holds no data. It stores exactly one piece of state:

| Field | Type | Meaning | Line |
|---|---|---|---|
| `navCurrent` | `{type:'profile', id:'<resolved id>'}` | The currently-displayed entity. Read by `pushHistory()` and by the "refresh if I'm looking at it" guards (`navCurrent && navCurrent.id === subId`, e.g. L4852, L5482, L5513, L5559, L8652) | L8831 |
| `navStack[]` | array of `navCurrent` snapshots | Back history. Max 40 (`shift()` beyond), L7006 | L7006 |

Everything else is read live out of `DB[bucket][id]` at render time. The profile never caches, never copies, and never writes back through the shell — mutations go through the action handlers (§10), each of which then calls `openProfile(id, true)` to redraw.

For the **rider** data model, see `09a` §4.
For the other five entity types, the fields consumed by each builder are enumerated in §12.

---

## 5. Analytics formulas

The profile renders three computed analytics blocks. Two are rider-only.

### 5.1 Customer value card — riders only

`customerValueCardHTML(d)` (L4065–L4082), inserted at L4184 (`var valueCard = !isDrv ? customerValueCardHTML(d) : ''`).
Formulas — LTV (L4031), tenure (L4038), churn risk (L4048), monthly average — are written out in full in **`09a` §5**. Not repeated here.

### 5.2 Reconciliation — riders and drivers

`entityDerived(id)` — **L18495–L18506**. Derives, live, what the panel actually holds:

```js
isDrv  = !!DB.drivers[id]
trips  = keys of DB.trips  where (isDrv ? t.driver===id : t.rider===id)
pays   = keys of DB.payments where p.entity === id
paid   = Σ over pays of (p.status==='Paid' ? (parseFloat(p.amount)||0) : 0)
subs   = keys of DB.subscriptions where (isDrv ? s.driver===id : s.rider===id)
return { trips: trips.length, tripIds: trips, payments: pays.length, paid, subs: subs.length }
```

`numOf(v)` — **L18507–L18511**: `parseFloat(String(v).replace(/[^\d.]/g,''))`, returns `null` on `NaN` or `null` input. **Strips commas**, so `'1,040.00 SAR'` → `1040`.

`reconcileEntity(id)` — base at **L18515–L18531**:

```js
e = DB.riders[id] || DB.drivers[id];  if (!e) return null
st = e.stats||{}, d = entityDerived(id), out = []

cmp(label, stored, derived, unit):
    s = numOf(stored)
    if (s == null)                    return          // nothing stored → nothing to compare
    if (Math.abs(s - derived) < 0.01) return          // tolerance: 0.01
    out.push({ label, stored: s, derived, unit: unit||'',
               severity: (derived===0 && s>0) ? 'orphan' : 'window' })

cmp('Trips',      st.totalTrips, d.trips)
cmp('Total paid', st.totalPaid,  d.paid, ' SAR')

return { id, derived: d, rows: out,
         orphan:    out.some(r => r.severity==='orphan'),
         diverges:  out.length > 0 }
```

**Overridden** at **L20442–L20455** (`__origReconcileEntity` wrapper) to reclassify severity by *window* rather than by zero:

```js
r = __origReconcileEntity(id);  if (!r) return r
w  = windowSplit(id)                                   // L20415
r.window        = w
r.olderInBilling = olderInBilling(id)                  // L20429
stored = numOf((DB.riders[id]||DB.drivers[id]||{}).stats?.totalTrips) || 0
r.orphan      = (stored > 0 && w.inside === 0)         // TRUE orphan: billing says N, window holds 0
r.expectedGap = (stored > 0 && w.inside > 0 && r.olderInBilling > 0)
r.rows.forEach(row => row.severity = r.orphan ? 'orphan' : 'window')
```

Supporting:

* `DB.dataWindow = { months: 13, rationale: … }` — **L20403–L20409**. The comment states the rule: *"LONGEST DISPUTE WINDOW + 1 MONTH"*, 12 months for YoY + 1 headroom, and warns it must be confirmed with the payment provider.
* `windowStartMs() = nowMs() − 13 * 30.44 * 86400000` — **L20411**.
* `windowSplit(id)` — **L20415–L20425**: partitions the entity's trips into `inside` (`dateMs === undefined || dateMs >= start`) / `older` / `total`. **A trip with no `dateMs` counts as inside.**
* `olderInBilling(id)` — **L20429–L20436**: `Math.max(0, numOf(stats.totalTrips) − windowSplit(id).total)`.

### 5.3 Rider no-show counter — riders only

`riderNoShowCount(riderId)` — **L19525–L19534**:

```js
since   = nowMs() − DB.commitPolicy.counterWindowDays * 86400000
reports = DB.fairnessCases filtered by  c.subjectId===riderId
                                     && c.reasonCode==='DRV_RIDER_NOSHOW'
                                     && (c.tsMs!==undefined ? c.openedAtMs>=since : c.openedAtMs>=since)
trips   = keys of DB.trips where t.rider===riderId && /no-?show/i.test(t.status||'')
return { reports, trips, total: reports + trips }
```

The ternary at L19529 is degenerate — **both branches are identical** (`c.openedAtMs>=since`), so the `c.tsMs!==undefined` test has no effect. Flagged in §18.

`riderNoShowCardHTML(riderId)` — **L19535–L19547**: returns `''` when `total === 0`. Threshold `heavy = total >= 3` → red border, red `.ch` background, `b-red` pill and the escalated copy; otherwise `b-amber` and *"Monitored. A single miss is normal; a pattern is a conversation."* Pill text: `{total} in {DB.commitPolicy.counterWindowDays} days`.

---

## 6. Entity types resolved & their renderers

Exactly **six** types can be resolved (L3270); **five** distinct body builders exist, because riders and drivers share one.

| # | `hit.type` | DB bucket | Id prefix (seed) | `#prof-name` (header) | `#prof-meta` | Body builder | Lines |
|---|---|---|---|---|---|---|---|
| 1 | `riders` | `DB.riders` | `RDR-` | `avatarHTML(d.name,30,d.hasPhoto)` + `<span style="margin-left:8px">{d.name}</span>` + `lvlBadge(d.lvl)` + `<span class="b b-gold">{rstar(d.rating)}</span>`; `nm.style.cssText` forced to `display:flex;align-items:center;font-size:17px;font-weight:500` | `{d.id} · Rider · {d.phone} · Joined {d.joined}` | `buildEntityProfile(d, false)` | L8839–L8845 |
| 2 | `drivers` | `DB.drivers` | `DRV-` | identical construction to riders | `{d.id} · {d.type} · {d.vehicle} · {d.phone} · Joined {d.joined}` | `buildEntityProfile(d, true)` | L8839–L8845 |
| 3 | `trips` | `DB.trips` | `TRP-` | `{d.kind==='Quick ride' ? '⚡ ' : '📋 '}Trip {d.id}` | `{d.kind} · {d.date} · {d.status}` | `buildTripProfile(d)` | L8846–L8849 |
| 4 | `subscriptions` | `DB.subscriptions` | `SUB-` | `📦 {d.id} · {d.plan}` | `Subscription · {d.started} → {d.ends} · {d.status}` | `buildSubProfile(d)` | L8850–L8853 |
| 5 | `payments` | `DB.payments` | `PAY-` | `💳 {d.id}` | `{d.type} · {d.date} · {d.status}` | `buildPayProfile(d)` | L8854–L8856 |
| 6 | `complaints` | `DB.complaints` | `CMP-` | `⚠️ {d.id}` | `{d.subject} · {d.date} · {d.severity} severity` | `buildComplaintProfile(d)` | L8857–L8859 |

Header helpers:

| Helper | Line | Behaviour |
|---|---|---|
| `avatarHTML(name, size, hasPhoto)` | L10836–L10845 | `hasPhoto` → `size × size` div, `border-radius` `12px` if `size>30` else `8px`, background `PHOTO_GRADS[name.length % 5]` (L10835), containing a white 50%-size person SVG, `border:1px solid rgba(0,0,0,.06)`. Otherwise → initials: first letter of up to 2 space-separated parts, uppercased, on `AV_COLORS[name.length % 6]` (L10834), `font-weight:700`, `font-size: size*0.38`. Falls back to `'??'` when `name` is empty |
| `lvlBadge(lvl)` | L3260–L3263 | `{gold:['b-gold','Gold'], silver:['b-silver','Silver'], standard:['b-grey','Standard'], new:['b-grey','New']}`; unknown → `standard` |
| `rstar(r)` | L3264 | `r > 0 ? '★ '+r.toFixed(1) : '★ new'` |

**Note on the driver header:** `d.type` and `d.vehicle` exist on `DB.drivers` records (L2639 ff.) but not on riders — hence the ternary at L8842.

**Note on the rider header:** the gold `<span class="b b-gold">` wrapper is applied to `rstar(d.rating)` **unconditionally**, so a rider with `rating: 0` gets a gold `★ new` pill.

---

## 7. KPIs & metrics

### 7.1 `buildEntityProfile` stat cards — `div.g4`, four tiles (L4087–L4104)

**Driver variant** (`isDrv === true`, L4089–L4092) — all four read `d.stats` directly, no computation, no provenance chip, no sub-line:

| # | Label | Value | Fallback | Colour |
|---|---|---|---|---|
| 1 | `Total trips` | `stat.totalTrips` | `'—'` | default |
| 2 | `Month earnings` | `stat.monthEarn` | `'—'` | `var(--blue)`, `font-size:18px` |
| 3 | `On-time` | `stat.onTime` | `'—'` | `var(--green)` |
| 4 | `Active subs` | `stat.activeSubs` | `'—'` | default |

**Rider variant** (L4094–L4102) — tiles 1 and 3 carry a `provenanceChip('stored')` and a derived sub-line:

| # | Label | Value | Sub-line (`kpi-dl neu`) | Colour |
|---|---|---|---|---|
| 1 | `Total trips` + `· billing aggregate` chip | `stat.totalTrips \|\| '—'` | `{__drv.trips} in panel records` (only when `entityDerived` is available) | default |
| 2 | `Quick rides` | `stat.quickRides \|\| 0` | none | `var(--purple)` |
| 3 | `Total paid` + `· billing aggregate` chip | `stat.totalPaid \|\| '—'` | `{__drv.paid.toFixed(2)} SAR in panel records` | default, `font-size:18px` |
| 4 | `Renewal rate` | `stat.renewalRate \|\| '—'` | none | `var(--green)` |

`__drv = entityDerived(d.id)` at L4093. `provenanceChip(kind)` (L18532–L18536) emits a 9px grey `<span>` with a `title` tooltip:

| `kind` | Text | Tooltip |
|---|---|---|
| `stored` | `· billing aggregate` | `This is a lifetime figure from the billing system, not a count of the records below.` |
| `panel` | `· panel records` | `Derived live from the trips and payments held in this panel.` |

**Note:** tile 2's `stat.quickRides || 0` shows `0` where the others show `—`; tile 4 has no derived counterpart because `renewalRate` is never computed anywhere in the file.

### 7.2 Reconcile banner — `reconcileBannerHTML(id)` (L18537–…, appended at L4107)

Emitted **only** when `r.diverges && r.orphan` (L18539, L18541 — `if(!r.orphan) return''`). Design note in the source: *"a total larger than the window is expected and is explained inline by windowNoteHTML. Only an empty window is an alert — an alert that fires on normal behaviour stops being read."*

When shown: red-bordered card, `var(--red-lt)` background, headline **`⚠ The headline figures do not match the records below`**, then one line per divergent row —
`· **{label}** — billing aggregate says **{stored}{unit}**, this panel holds **{derived}{unit}** — no underlying records at all` (the trailing clause only for `severity==='orphan'`) —
then the guidance paragraph: *"Do not treat either number as settled. A lifetime total with zero records behind it usually means trip-level history was never ingested for this account — but it can also mean the records were attached to a duplicate profile. Check identity collisions before acting on this rider."*

Derived values render red (`var(--red)`) when `derived === 0`.

### 7.3 Window note — `windowNoteHTML(id)` (L20458–L20470)

Prepended inside `tripsTable()` (L3711) when `ctxId` is supplied. Three outcomes:

| Condition | Output |
|---|---|
| `r.orphan` | `''` — the red banner already covers it (L20462) |
| `!r.olderInBilling` | `Showing the last {DB.dataWindow.months} months · all {w.inside} trip(s) held here.` (grey, L20464–L20466) |
| otherwise | `Showing the last **13 months** · {w.inside} trip(s) here · **{olderInBilling}** older trip(s) held in billing. This is expected, not a fault.` + a `Fetch full history from billing` button → `fetchFullHistory(id)` (L20467–L20469) |

### 7.4 Rider earnings/no-show metrics

* `riderNoShowCardHTML(d.id)` — appended at L4108 for riders only. See §5.3.
* **Driver** `💰 Earnings breakdown` kvCard (L4165–L4172) — five computed rows:

| Row | Formula | Line |
|---|---|---|
| `Held in escrow (subscriptions in progress)` | `Σ DB.escrowHolds where e.driver===d.id && e.status==='held'` of `e.amount` | L4159, L4160 |
| `Ready to release` | same with `e.status==='ready'` | L4161 |
| `💰 Tips earned` | `Σ DB.trips where t.driver===d.id` of `(t.tip||0)` | L4164 |
| `🏆 Incentive bonuses earned` | `Σ DB.driverBonusLog where b.driverId===d.id` of `b.amount`; suffixed with `({count})` when non-empty | L4163, L4170 |
| `Pending deductions` | `Σ DB.deductions where x.driver===d.id && x.status==='pending'` of `x.amount`, rendered `−{n}` in red | L4162, L4171 |
| *(footer)* | `View in Wallets →` button if any escrow or deduction exists, else `No holds or deductions` | L4172 |

---

## 8. Data displayed

### 8.1 Shell-level

| Element | Source | Type | Notes |
|---|---|---|---|
| `#tb-title` | literal `'360° Profile'` | string | L8835 — bypasses the `titles` map (which does contain `profile:'360° Profile'` at L2168) |
| `#tb-sub` | `d.id` | string | L8836 — overrides `subs.profile = 'Unified entity view'` (L2169) |
| `#prof-name` | per-type, §6 | HTML | L8841/L8847/L8851/L8855/L8858 |
| `#prof-meta` | per-type, §6 | HTML | L8842/L8848/L8852/L8856/L8859 |
| `#tb-back` visibility | `navStack.length > 0` | bool | L7005 |

### 8.2 `buildEntityProfile` — rider body, in emission order

`return` statement at L4192–L4196. Order:

```
statCards            (g4 KPI row)                                L4087–L4104
+ reconcileBannerHTML(d.id)          [riders & drivers]          L4107
+ riderNoShowCardHTML(d.id)          [riders only]               L4108
actions              (button bar card)                           L4109–L4116
multiSubCard         ('' for riders)                             L4117–L4139
<div class="g2">  personalCard + deviceCard  </div>              L4192
valueCard            (Customer value — riders only)              L4184
walletCard           (Wallet — riders only)                      L4185
bankCard             ('' for riders)                             L4147
notifCard            ('' for riders)                             L4148
earningsCard         ('' for riders)                             L4157
locationCard         (Location history)                          L4146
subSection           (Subscriptions table — riders only)         L4179
🚕 Trip history card                                             L4193
<div class="g2">  💳 Payments  +  ⚠️ Complaints  </div>          L4194–L4196
```

| Element | DB path | Type | Notes |
|---|---|---|---|
| `👤 Personal information` — Gender | `d.gender` | string | `'—'` fallback, L4142 |
| — Registered address | `d.address` | string | Label carries the inline note `(self-reported at signup)` in 9px ghost, L4143 |
| — City | `d.city` | string | L4144 |
| `📱 Device & access` — Device | `d.device` | string | L4149 |
| — App language | `d.appLang` | string | L4149 |
| — Last known IP | `d.lastIp` + ` ({d.ipLocation})` | string | L4150 |
| — Terms of Service | `getUserConsent(d,isDrv).tos.version` vs `DB.legalDocuments.tos.currentVersion` | badge | `b-green` `v{n} — current` / `b-amber` `v{n} — outdated`, L4151 |
| — Privacy Policy | same for `privacy` | badge | L4152 |
| `📍 Location history` | `d.movementLog[]` | timeline | `{date}` (78px column) · blue dot · `{action}` · ghost `{location}`; empty → `No location history recorded yet.` L6283–L6293. Header sub-label: `Since registration` |
| `💳 Wallet` | `getRiderWallet(d)` | card | Header pill `{balance.toFixed(2)} SAR`, `b-green` if `>0` else `b-grey`. Body: `+ Add credit` / `− Deduct` (the latter `disabled` when `balance<=0`), then the **first 6** transactions (`slice(0,6)`) as `{reason} · {date}` / `{+\|−}{amount} SAR` in green/red. Empty → `No wallet activity yet.` L3951–L3960 |
| `📦 Subscriptions` | `d.subs[]` → `DB.subscriptions` | table | See §11.2 |
| `🚕 Trip history` | `d.trips[]` → `DB.trips` | table | See §11.3 |
| `💳 Payments` | `d.payments[]` → `DB.payments` | table | See §11.4 |
| `⚠️ Complaints` | `d.complaints[]` → `DB.complaints` | table | See §11.5 |

`ensureHistory(d.id)` runs **first**, at L4085, before anything is measured — the source comment says *"Build any missing history before the profile is measured, so the header and the sections below it are computed from the same records."* It delegates to `buildRiderHistory(rid)` (L18686), which synthesises the *gap* between `stats.totalTrips` and `entityDerived().trips` using a seeded PRNG (`seededRand`, seed base = the numeric part of the rider id × 97 + i × 13 + existing trip count, L18709). By default it generates only **55%** of the gap (`Math.max(1, Math.round(targetTrips*0.55))`, L18702) — the rest is "held in billing" until `fetchFullHistory()` sets `window.__fetchFullHistory = true` (L20475). It is a **no-op for drivers** (`if(!DB.riders[id]) return null`, L18681) and returns `null` when there is no gap (L18694).

### 8.3 Other entity bodies

Fields per builder are enumerated in §12.

---

## 9. Input fields / filters

The profile shell has **no filters, no search, and no sort controls**. All interactive inputs are inside cards or modals.

| # | Element | id | Type | Label | Default | Options | Effect | Line |
|---|---|---|---|---|---|---|---|---|
| 1 | Auto-renew toggle | none | checkbox `.tog` | `Auto-renew` (kv row) | `checked` unless `d.autoRenew === false` | on/off | `toggleAutoRenew(d.id, this)` | L4318 (sub profile) |
| 2 | Trusted-new-driver toggle | `drv-trust-{id}` | checkbox `.tog` | `Trusted new driver — skip this requirement` | unchecked | on/off | `onDriverTrustToggle(this, d.id)` L9136 — gated `approve_drivers`; reverts the checkbox on denial | L4128 |
| 3 | Multi-sub exception toggle | `drv-multisub-exc-{id}` | checkbox `.tog` | `Special exception — accept additional subscriptions` | `d.multiSubException` | on/off | `onDriverExceptionToggle(this, d.id)` L9112 — gated `manage_settings`; **granting opens a confirm modal** (checkbox visually reverted until confirmed, L9118), revoking applies instantly | L4134 |
| 4 | "Keep same driver?" toggle (renew wizard) | none | checkbox `.tog` | `Keep same driver?` | `checked` | — | **none — decorative, no `onchange`** | L11319 |

Modal-level inputs (wallet amount, flag reason, suspend reason, tip amount, call note, ticket subject) are listed in §13.

---

## 10. Actions

### 10.1 Rider action bar (`buildEntityProfile`, L4109–L4116)

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `📞 Call` | `priorityCall(d.name)` L9149–L9161 | Opens a "Calling — {HH:MM}" modal with an animated ping dot and an optional note textarea `#call-note-ta`. `✕ End` closes; `✓ Log` → `logPriorityCall(name, ctx, entityId)` | via `logPriorityCall` (not read) | **none on open** | **UNVERIFIED** (inside `logPriorityCall`) | no |
| `↻ Renew / Upgrade` | `openRenewFlow(d.id)` L11277 | 3-step renewal wizard | wizard commit (outside module) | none on open | none on open | wizard |
| `🎁 Send offer` | `welcomeRider(d.id)` L11159 | Welcome-offer modal — see `09a` §13.1 | `DB.auditLog`, wallet (cash10), `DB.emailOutbox` | `contact_users` at commit (L11178) | `welcome_offer_sent` | modal |
| `🎧 Open support ticket` | `openSupportTicket(null, d.id, d.name)` L2542 | Modal with a required reason-code select and a free-text subject → `createTicketFor(entityId, entityName)` L2552, which `unshift`s a ticket `TKT-{505+len}` into `DB.tickets`, calls `slaStampNewTicket(newId, rc, 'phone_in')` and `runAutoReply(newId)` | `DB.tickets`, SLA store | **none** | **none** (no `logAction`) | modal |
| `Flag account` *(when `!d.manualFlag`)* | `openFlagAccountModal(d.id, 'false')` L9007 → `commitFlagAccount` L9026 | Sets `d.manualFlag = {reason, by: actor.name, at: fmtReqNowLabel()}`; `logAction('account_flagged','rider',…)`; `openProfile(id,true)`; `renderRidersTable()`; warn toast | `DB.riders[id].manualFlag`, `DB.auditLog` | `contact_users` L9027 | `account_flagged` | modal + required reason |
| `✓ Unflag account` *(when `d.manualFlag`)* | `commitUnflagAccount(d.id, 'false')` L9042 | `delete d.manualFlag`; `logAction('account_unflagged',…)`; refresh; ok toast | same | `contact_users` L9043 | `account_unflagged` | **no confirmation** |
| `🚫 Suspend account` *(when `!d.suspended`)* | `openSuspendAccountModal(d.id,'false')` L9058 → `commitSuspendAccount` L9082 | Sets `d.suspended = {reason, by, at}`; `logAction('account_suspended',…)`; **`pushOpsNotification('alert','Account suspended — {name}', reason, → openProfile(id))`** L9093; refresh; error toast | `DB.riders[id].suspended`, `DB.auditLog`, ops notifications | **`approve_drivers`** L9083 — the source comment states *"higher-trust action than flagging — same permission tier as approving/rejecting drivers"* | `account_suspended` | modal + required reason |
| `✓ Reinstate account` *(when `d.suspended`)* | `reinstateAccount(d.id,'false')` L9099 | `delete d.suspended`; `logAction('account_reinstated',…)`; refresh; ok toast | same | `approve_drivers` L9100 | `account_reinstated` | **no confirmation** |

Below the button row, two status strips render when the corresponding field is set (L4115–L4116):

* `🚩 Flagged` (`b-red`) + `{reason} — by {by}, {at}`
* `🚫 SUSPENDED` (inline `background:var(--red);color:#fff`) + `{reason} — by {by}, {at}` + a type-specific suffix: **drivers** ` · removed from dispatch matching`, **riders** ` · cannot be assigned to new subscriptions`

### 10.2 Driver-only actions (same bar, L4110)

| Label | Handler | Effect |
|---|---|---|
| `Review driver` | `reviewDriver(d.name)` L8987–L8995 | Opens a modal whose amber banner is **hardcoded**: *"Flagged: Late 3× consecutive, on-time rate dropped to 88%."* Action select: `Send warning` (default) / `Temporary suspension` / `Reassign riders` / `Clear flag`. `Apply` → `closeModal(); toast('✅ Review action applied','ok')` — **no DB write, no audit, no permission gate**. Pure stub |
| `💰 Send incentive` | `sendDriverIncentive(d.id)` L11191 | Four hardcoded incentive options (per-trip bonus, fuel allowance, referral bonus, loyalty bonus) |
| `Wallet` | `go('wallets',null)` | Navigates to Driver Wallets |

### 10.3 Card-level actions

| Label | Location | Handler | Effect | Permission | Audit |
|---|---|---|---|---|---|
| `+ Add credit` | Wallet card, L3958 | `openWalletAdjustModal(d.id,'credit')` L3961 | See §13.1 | `contact_users` at commit L3979 | `wallet_credit` (L3938) |
| `− Deduct` | Wallet card, L3958 | `openWalletAdjustModal(d.id,'debit')` | See §13.1; `disabled` when balance ≤ 0 | `contact_users` L3979 | `wallet_debit` (L3948) |
| `View in Wallets →` | Driver earnings card, L4172 | `go('wallets',null)` | navigation | none | none |
| `Fetch full history from billing` | Window note inside Trip history, L20468 | `fetchFullHistory(id)` L20472–L20482 | Sets `window.__fetchFullHistory=true`, re-runs `buildRiderHistory(id)` in a `try/finally`, logs `billing_history_fetched` with the delta count, then `openProfile(id)` (**without** `isBack`, so it pushes a history entry) | none | `billing_history_fetched` |
| Sub-table row click | Subscriptions card, L4177 | `openProfile(s.id)` | navigate | none | none |
| Trip row click | Trip history, L3719 | `openTripReceipt(tp.id)` L18779 | Opens the itemised receipt (title attr `Itemised receipt`) — **not** `openProfile` | none | none |
| Trip id link | Trip history, L3720 | `rowLink(tp.id)` → `openProfile` | navigate | none | none |
| Payment row click | Payments card, L3751 | `openProfile(p.id)` | navigate | none | none |
| Complaint row click | Complaints card, L3760 | `openProfile(c.id)` | navigate | none | none |
| `← Back` (header) | L1387 | `goBack()` L7012 | Pops `navStack`, dispatches by `prev.type`: `page` → `go(id, findSbEl(id), true)`; `profile` → `openProfile(id,true)`; `applicant` → `openApplicantDetail(id,true)`; `ticket` → `openTicketDetail(id,true)` | none | none |

### 10.4 Trip / subscription / complaint profile actions

| Entity | Label | Handler | Effect | Permission | Audit |
|---|---|---|---|---|---|
| Trip | `🗺 View route` | `go('live',null)` | navigate | none | none |
| Trip | `Send receipt` | `sendTripReceipt(d.id)` | **UNVERIFIED** (body not read) | — | — |
| Trip | `🎧 Open ticket` | `openSupportTicket(d.id, d.rider, nm2(d.rider))` | ticket modal, subject prefilled `Issue with trip {id}` (L2547) | none | none |
| Trip | `Flag trip` / `✓ Unflag trip` | `flagTrip(d.id)` / `unflagTrip(d.id)` | **UNVERIFIED** | — | — |
| Trip | `edit` (tip) | `openEditTipModal(d.id)` L4199 → `commitEditTip` L4207 | Sets `t.tip`; `logAction('trip_tip_edited','trip',…, {tip:before},{tip:newTip})`; `openProfile(tripId)` (**no `isBack`** → pushes history); toast | **`process_payouts`** L4208 | `trip_tip_edited` |
| Trip | `🧾 Invoice` | `openInvoiceModal(d.pay)` | e-invoice modal (`getOrCreateInvoice`, L4413) | — | — |
| Trip | `💬 Send message as Eyvar Support` (only when `status==='In trip'`) | `openSendChatModal(d.id)` | **UNVERIFIED** | — | — |
| Sub | `↻ Renew / Upgrade` | `openRenewFlow(d.rider)` | wizard | — | — |
| Sub | `❄️ Freeze` | `freezePlan(d.id)` | **UNVERIFIED** | — | — |
| Sub | `Change driver` | `changeDriver(d.id)` | **UNVERIFIED** | — | — |
| Sub | `Cancel & refund` | `cancelSub(d.id)` | **UNVERIFIED** | — | — |
| Sub | `✓ Confirmed — starts today` / `Can't make it — roll to tomorrow` (commit banner) | `confirmSubDriverCommit(d.id, true\|false)` | **UNVERIFIED** | — | — |
| Sub | `✓ Approved — start it` / `✕ Declined — cancel` (corp approval banner) | `approveCorpSubscription` / `rejectCorpSubscription` | **UNVERIFIED** | — | — |
| Sub | `View full log →` | `go('audit-log', findSbEl('audit-log'))` | navigate | none | none |
| Complaint | `Mark resolved` (only when `status==='Open'`) | `resolveComplaint(d.id)` L4376–L4386 | `c.status='Resolved'`; `logAction('complaint_resolved','complaint',…, {status:'Open'},{status:'Resolved'})`; `openProfile(id,true)`; `renderDriversTable()`; toast | **`manage_tickets`** L4377 | `complaint_resolved` |
| Complaint | `Escalate` | `reviewDriver(nm2('{d.against}'))` | The stub modal in §10.2 | none | none |

---

## 11. Tables & lists

### 11.1 Shell

The shell itself renders no table.

### 11.2 `📦 Subscriptions` — rider only (L4176–L4179)

**Header:** `📦 Subscriptions` + `<span class="b b-grey">{d.subs.length}</span>`
**Row source:** `d.subs[]` mapped through `DB.subscriptions` (missing ids render `''`, silently dropped). No sort, no filter, no search.
**Row click:** whole `<tr style="cursor:pointer">` → `openProfile(s.id)` (L4177).
**Columns:** `Sub ID` (`rowLink(s.id)`) · `Plan` (`s.plan`) · `Period` (`{s.started}→{s.ends}`) · `Trips` (`s.trips`, e.g. `'5/5'`) · `Status` (`statusBadge(s.status)`).
**Empty state:** `No active subscriptions (quick-ride only rider).` (L4178).
**Guard:** the whole section is `''` when `isDrv` or when `d.subs` is falsy (L4176) — a driver never sees it.

### 11.3 `🚕 Trip history` — `tripsTable(d.trips, d.id)` (L3698–L3729, mounted L4193)

**Header:** `🚕 Trip history` + `<span class="b b-grey">{d.trips ? d.trips.length : 0}</span>`
**Preamble (L3714–L3716):** `windowNoteHTML(ctxId)` (§7.3), then a grey strip `{n} trips · click any row for the itemised receipt` plus, when any listed trip has `.reconstructed`, ` · {n} reconstructed from the billing total` in amber.
**Sort:** `ids.slice().sort((a,b) => (DB.trips[b].dateMs||0) − (DB.trips[a].dateMs||0))` — **newest first**; seed trips have no `dateMs`, so they all tie at `0` and keep array order (L3718).
**Scroll:** `max-height:430px; overflow-y:auto` (L3717).
**Row click:** `openTripReceipt(tp.id)`, `title="Itemised receipt"` (L3719).

| # | Column | Content | Line |
|---|---|---|---|
| 1 | `Trip ID` | `rowLink(tp.id)` + `<span class="b b-amber">rebuilt</span>` when `tp.reconstructed` | L3720 |
| 2 | `Type` | `tp.kind` in `b-purple` (Quick ride) or `b-blue` (Subscription) | L3721, L3719 |
| 3 | `Date` | `tp.date`, `white-space:nowrap` | L3721 |
| 4 | `Route` | `tp.route`, 10.5px muted | L3722 |
| 5 | `Dist · time` | `{tp.km \|\| '—'} km · {tp.min \|\| '—'} min` | L3723 |
| 6 | `Fare` | `tp.fare`, `var(--green)` | L3724 |
| 7 | `Method` | `tp.payMethod \|\| '—'` — **seed trips have no `payMethod`; only `buildRiderHistory`-generated trips do** | L3725 |
| 8 | `⭐` | `ratingCell(tp.driverRatingGiven)` L15250 | L3726 |
| 9 | `Status` | `statusBadge(tp.status)` | L3726 |

**Empty state** (L3699–L3709) is context-aware. Default: `No trips in this panel's records.` If `reconcileEntity(ctxId)` reports the `Trips` row with `severity==='orphan'`, the note escalates to:
> **No trips in this panel's records**, although the billing aggregate reports `{stored}`. Trip-level history for this account has not been ingested — or it is attached to a duplicate profile. **Do not tell the customer they have no trips.**

### 11.4 `💳 Payments` — `payTable(d.payments, d.id)` (L3737–L3754, mounted L4195)

**Header:** `💳 Payments` + `b-grey` count.
**Row source:** `d.payments[]` → `DB.payments`, **array order, no sort**.
**Scroll:** `max-height:380px`.
**Row click:** `openProfile(p.id)`.
**Columns:** `Payment ID` (`rowLink`) · `Type` · `Amount` (`font-weight:500`) · `Method` · `Date` · `Status` (`statusBadge`).
**Empty state:** `No payments in this panel's records.`, escalating on an orphan `Total paid` row to:
> **No payment records held here**, although the billing aggregate reports `{stored}` SAR paid. Any refund calculated from this screen would be wrong — pull the ledger from billing first.

### 11.5 `⚠️ Complaints` — `cmpTable(d.complaints)` (L3755–L3763, mounted L4196)

**Header:** `⚠️ Complaints` + a count badge that is `b-red` when `d.complaints.length > 0`, else `b-green` (L4195–L4196).
**Row source:** `d.complaints[]` → `DB.complaints`, array order.
**Row click:** `openProfile(c.id)`.
**Columns:** `Complaint ID` (`rowLink`) · `Subject` · `Severity` (badge: `High`→`b-red`, `Medium`→`b-amber`, else `b-grey`) · `Date` · `Status` (`statusBadge`).
**Empty state:** `✓ No complaints on record.` in `var(--green)` — **not** the grey ghost used elsewhere. **Takes no `ctxId`**, so it has no reconciliation escalation.

### 11.6 Sub-profile `Trip log` (L4351–L4353)

**Row source:** `Object.keys(DB.trips)` filtered by `t.rider === d.rider && t.kind === 'Subscription'` — **matched by rider identity, not by the `t.sub` tag.** The source comment explains: *"some trip records carry a sub id that belongs to a different rider — see the same note in commitDriverChange"* (L4290–L4292).
**Sort:** `DB.trips[b].date.localeCompare(DB.trips[a].date)` — descending **string** compare on `'25 Jun 07:00'` format (L4295).
**Columns:** `Date` · `Route` · `Distance` · `Duration` · `Rider pays` · `Driver earns` · `Status`.
**Header badge:** `<span class="b b-blue">{d.trips} complete</span>` — reads the subscription's own `trips` string (e.g. `'5/5'`), so it renders as `5/5 complete` (L4350).
**Empty state:** `No trips recorded yet for this subscription.` (colspan 7).

### 11.7 Driver `🔔 Notifications sent to driver` (L4148, rows L4139–L4145)

Rendered only when `isDrv && d.notifLog && d.notifLog.length`. Rows: 60px date column · `b-blue` channel pill (9px) · italic `"{msg}"`. Header sub-label `Email + push delivery log`. All six seed drivers have `notifLog: []`, so **this card never appears with seed data**.

---

## 12. Profile sections & cards (per entity type)

### 12.1 Riders — `buildEntityProfile(d, false)`

| # | Card | Condition | Contents | Line |
|---|---|---|---|---|
| 1 | KPI row `div.g4` | always | Total trips (+`billing aggregate` chip + `{n} in panel records`), Quick rides, Total paid (+chip + `{n} SAR in panel records`), Renewal rate | L4093–L4102 |
| 2 | Reconcile banner | only when `reconcileEntity(id).orphan` | §7.2 | L4107 |
| 3 | `🚷 Rider no-shows` | only when `riderNoShowCount().total > 0` | Pill `{total} in {counterWindowDays} days`; body `{trips} trip(s) recorded as a rider no-show · {reports} captain report(s).` + threshold copy | L4108, L19535 |
| 4 | Action bar | always | 5–6 buttons, §10.1; plus flag/suspend status strips | L4109–L4116 |
| 5 | `👤 Personal information` | always (`kvCard`) | Gender · Registered address *(self-reported at signup)* · City | L4141–L4145 |
| 6 | `📱 Device & access` | always (`kvCard`) | Device · App language · Last known IP (+location) · Terms of Service badge · Privacy Policy badge | L4147–L4153 |
| 7 | `💰 Customer value` | always | LTV / Avg monthly spend / Tenure + `Why this risk level` list — see `09a` §5.4 | L4184, L4065 |
| 8 | `💳 Wallet` | always | Balance pill, credit/debit buttons, last 6 transactions | L4185, L3951 |
| 9 | `📍 Location history` | always | `d.movementLog[]` timeline | L4146, L6283 |
| 10 | `📦 Subscriptions` | when `d.subs` truthy | §11.2 | L4176–L4179 |
| 11 | `🚕 Trip history` | always | §11.3 | L4193 |
| 12 | `💳 Payments` | always (in a `g2` with 13) | §11.4 | L4194–L4195 |
| 13 | `⚠️ Complaints` | always | §11.5 | L4196 |

Cards **explicitly excluded** for riders: `multiSubCard` (L4118 `if(isDrv)`), `bankCard` (L4147 `isDrv?…:''`), `notifCard` (L4148 `isDrv&&…`), `earningsCard` (L4158 `if(isDrv)`).

Fields on the rider record that **no card renders**: `dob`, `nid`, `mapPos`, `driverGenderPref`, `referredBy`, `referralCode`, `email`, `rating` (shown in the header only, not as a card row), `lvl` (header only).

### 12.2 Drivers — `buildEntityProfile(d, true)`

| # | Card | Condition | Contents | Line |
|---|---|---|---|---|
| 1 | KPI row | always | Total trips · Month earnings · On-time · Active subs — all raw `d.stats`, no chips | L4089–L4092 |
| 2 | Reconcile banner | on orphan | §7.2 | L4107 |
| 3 | Action bar | always | `📞 Call`, `Review driver`, `💰 Send incentive`, `Wallet`, `🎧 Open support ticket`, flag/unflag, suspend/reinstate | L4109–L4116 |
| 4 | `📦 Subscription settings` | driver only | Trust-gate block when `getLimit('driver_min_trips_for_subs').enabled && !driverTrustedForSubs(id)` — red panel `🆕 New driver — {completedTrips} of {limit} completed trips needed…` + `Trusted new driver — skip this requirement` toggle. Else, if `d.trustedNewDriver`, a blue confirmation `✓ Fast-tracked by ops — the usual {limit}-trip requirement was waived…`. Then a general-setting notice (amber `⚠ The general setting is currently closed…` when `!DB.opsConfig.allowMultiSubPerDriver`, else a grey "no effect right now" line), the `Special exception` toggle, and `Current active subscriptions: {driverActiveSubCount(id)}` | L4117–L4139 |
| 5 | `👤 Personal information` | always | same three rows as riders | L4141–L4145 |
| 6 | `📱 Device & access` | always | same, but `getUserConsent(d,true)` also lazily creates a `driverAgreement` consent (L3787) — **which the card never displays** | L4147–L4153 |
| 7 | `🏦 Bank account` | when `d.bank` | Status (`Active` `b-blue` + `Verified` `b-green` / other `b-amber`), Bank, IBAN (monospace). Title suffix `1 active · {n} previous` when `d.bankHistory.length` | L4147, L6294 |
| 8 | `🔔 Notifications sent to driver` | when `d.notifLog.length` | §11.7 — never appears with seed data | L4148 |
| 9 | `💰 Earnings breakdown` | always | 5 computed rows + Wallets link — §7.4 | L4157–L4172 |
| 10 | `📍 Location history` | always | timeline | L4146 |
| 11 | `🚕 Trip history` | always | §11.3, `ctxId = d.id` | L4193 |
| 12 | `💳 Payments` / `⚠️ Complaints` | always | §11.4, §11.5 | L4194–L4196 |

Cards excluded for drivers: `valueCard`, `walletCard`, `subSection` (all `!isDrv` guarded, L4176/L4184/L4185).

### 12.3 Trips — `buildTripProfile(d)` (L4244–L4278)

Two-column `div.g2`.

**Left column:**

| Card | Rows |
|---|---|
| `Trip details` (`kvCard`) | Trip ID · Type (`b-purple`/`b-blue` badge) · Date / time · Route · **Stops** (`d.stops.join(' → ')` or `None — direct route`) · Distance (`{km} km`) · Duration (`{min} min`) · Status (`statusBadge`) |
| `Financials` (`kvCard`) | Fare (green) · Driver earns (blue) · **Extra-stop fees** (`+{stopFee.toFixed(2)} SAR` when `> 0`, else `—`) · **💰 Tip** (`{(d.tip\|\|0).toFixed(2)} SAR` + a blue `edit` link → `openEditTipModal`) · Payment (`rowLink(d.pay)` + a `🧾 Invoice` button, or `—`) |

**Right column:**

| Card | Contents |
|---|---|
| `Linked entities` (`kvCard`) | Rider (`rowLink(d.rider, nm2(d.rider))` + ` · {d.rider}`) · Driver (same shape) · Subscription (`rowLink(d.sub)` or `— (quick ride)`) |
| `🔍 Arrival evidence — did the captain reach the rider?` | `arrivalEvidenceHTML(d.id)` — **UNVERIFIED**, body not read |
| *(ride-state timeline)* | `rideStateTimelineHTML(d)` — **UNVERIFIED** |
| *(ratings)* | `tripRatingsCardHTML(d)` — **UNVERIFIED** |
| `☎️ Communication log` | `DB.commLogs[d.id]` rows: icon (`📞` for `type==='call'`, `🛟` when `who==='Eyvar Support'`, else `💬`), `{who}` + ` · {dur}` when present, `{note}`, right-aligned `{time}`. Ops rows get a `var(--blue-lt)` background and blue-dark name. A `🟢 Live` pill appears in the header when `d.status==='In trip'`, along with a `💬 Send message as Eyvar Support` footer button. Empty → `No calls or messages logged for this trip.` |
| *(action bar)* | `🗺 View route` · `Send receipt` · `🎧 Open ticket` · `Flag trip` / `✓ Unflag trip`; when `d.flagged`, a `🚩 Flagged for review` strip plus `d.corpPolicyViolation.join(' · ')` when present |

### 12.4 Subscriptions — `buildSubProfile(d)` (L4279–L4363)

Three optional banners render **above** everything, in this order:

| Banner | Condition | Contents |
|---|---|---|
| `⏳ Waiting on driver commitment` (amber) | `d.pendingDriverCommit` | `{driver} needs to confirm they can reach {rider} by {d.commitDeadline \|\| 'departure time'} — otherwise this subscription rolls to the next scheduled day automatically, no trip deducted.` + two buttons |
| `⏳ Pending manager approval` (red) | `d.pendingManagerApproval && DB.corporateAccounts[d.approvalCorp]` | `{d.paid} exceeds {company}'s {d.approvalThreshold} SAR threshold — waiting on {approverName \|\| 'the company approver'} to sign off. Nothing starts until approved.` + two buttons |
| `📅 Postponed trips` | `d.postponements.length` | Per row: `**{originalDate}** → moved to **{rescheduledDate}** · {route} · {reason}` |

Then a `div.g2`:

| Card | Rows | Notes |
|---|---|---|
| `Subscription info` + `statusBadge(d.status)` in the header | Plan (`{cadenceLabel} ({CADENCE_DAYS[cadenceKey] \|\| 7} days)`) · Period · Vehicle (`b-eco`/`b-com`, derived from the **last word** of `d.plan`) · Route · Driver (`#sub-driver-cell`, name + level badge) · Driver rating (only when `drv.rating`) · **Health** · **Auto-renew toggle** · Cancelled trips · `<hr>` · Rider paid · Driver earns (est.) · Eyvar net (est.) | Route comes from `DB.upcomingSubTrips.find(t => t.rider === d.rider)`, else `'—'` (L4285–L4286) |
| `Linked entities` (`kvCard`) | Rider · Driver | L4341–L4344 |

**Health formula** (L4288): `hasOpenComplaint(d.driver, d.rider)` → `<span class="health h-red">At risk</span>`; else `/expir/i.test(d.status)` → `h-amber Watch`; else `h-green Healthy`.

**Financial split** (L4298–L4300) — the source comment stresses it uses *"this subscription's own plan commission rate (set per plan on the Plans page) — not a flat platform-wide number"*:

```
paidNum       = parseFloat(d.paid) || 0
driverEarnNum = Math.round(paidNum * commissionRateForPlan(d.plan) * 100) / 100
eyvarNetNum   = Math.round((paidNum - driverEarnNum) * 100) / 100
```

Then: action bar (`↻ Renew / Upgrade` → `openRenewFlow(d.rider)`, `❄️ Freeze`, `Change driver`, `Cancel & refund`), the `Trip log` table (§11.6), and `🕵️ Recent activity on this subscription` — `auditForEntity(d.id, 5)` rendered by `auditRowsHTML(subActivity, true)`, with a `View full log →` button when non-empty and `No logged actions on {d.id} yet.` otherwise (L4356–L4361).

### 12.5 Payments — `buildPayProfile(d)` (L4364–L4369)

The thinnest builder — one `div.g2`, two `kvCard`s, no actions, no tables, no banners.

| Card | Rows |
|---|---|
| `Payment` | Payment ID · Type · Amount (`font-weight:500`) · Method · Date · Status (`statusBadge`) |
| `Linked` | Entity (`rowLink(d.entity, nm2(d.entity))` + ` · {d.entity}`) · Trip / Sub (`rowLink(d.trip)`, or `—` when `d.trip` is falsy **or literally `'—'`**) |

No refund button, no invoice link, no audit trail — even though `getOrCreateInvoice(paymentId)` exists (L4413) and the *trip* profile links to `openInvoiceModal(d.pay)`.

### 12.6 Complaints — `buildComplaintProfile(d)` (L4370–L4375)

| Card | Rows |
|---|---|
| `Complaint` | Complaint ID · Subject · Severity (`b-red`/`b-amber`/`b-grey`) · Date · Status (`statusBadge`) |
| `Parties` | Filed against (`rowLink(d.against, nm2(d.against))` + ` · {d.against}`) · Filed by (same shape) |

Then an action card: `Mark resolved` when `d.status === 'Open'`, else a static `✓ Resolved` `b-green` pill; plus `Escalate` → `reviewDriver(nm2('{d.against}'))`.

---

## 13. Modals opened

### 13.1 Wallet adjust — `openWalletAdjustModal(riderId, kind)` L3961–L3977

* **Title:** `Add wallet credit — {name}` or `Deduct from wallet — {name}`
* **Current balance line:** `Current balance: {w.balance.toFixed(2)} SAR`
* **Inputs:**

| id | Type | Required | Attributes | Notes |
|---|---|---|---|---|
| `wallet-amount` | `number` | ✅ | `min="0.01" step="0.01"`; `max="{balance}"` **only in debit mode**; `oninput="compPreview(riderId)"` | |
| `wallet-reasoncode` | custom select (`csel-wallet-rc`) | — | **credit mode only** | Options from `DB.reasonCodes.filter(r => r.active)` → `{value:r.code, label:(r.ref?'§'+r.ref+' ':'')+r.labelEn}`; placeholder `Which scenario is this for?`; onchange `compPreview` |
| `wallet-reason` | custom select (`csel-wallet-reason`) | ✅ | placeholder `Select a reason…` | **Credit:** `Trip cancellation refund`, `Goodwill / apology credit`, `Referral bonus`, `Promo code redemption`, `Manual top-up`. **Debit:** `Correction — issued in error`, `Used toward ride payment`, `Used toward subscription` |
| `#comp-preview` | div | — | filled by `compPreview()` | |

* **Commit — `commitWalletAdjust(riderId, kind)` L3978–L4009:**
  1. `requirePerm('contact_users')` (L3979)
  2. Amount validation → `⚠ Enter a valid amount`; reason validation → `⚠ Pick a reason`
  3. **Credit + reason contains `'Goodwill'`** → `compCheck(amount, rcCode, riderId)`. On `!chk.ok`: `logAction('comp_blocked','rider',…)` and `toast('⛔ '+chk.blocked,'err')`, **return**. On `chk.needsApproval && !window.__compApproved`: sets `window.__compApproved = true` and toasts `⚠ Second approval required — press Confirm again to record this as an approved exception`, **return** — a genuine two-press second-approval gate. On the second press: resets the flag and calls `logGoodwill(riderId, amount, rcCode, reason)`
  4. `creditRiderWallet(...)` (L3932) or `debitRiderWallet(...)` (L3942, returns `false` on insufficient balance → `⚠ Insufficient wallet balance`)
  5. `closeModal()`; `openProfile(riderId)` — **without `isBack`, so this pushes a history entry** (L4007); `renderRiderWalletsList()`
* **Side effect of `creditRiderWallet`:** unless `actorNote === false`, it also fires `sendSystemEmail(riderId, 'Your Eyvar wallet was topped up 💳', …, 'transactional')` (L3940). Called from the modal without the 4th argument, so the email **is** sent; called from `confirmWelcomeOffer` with `false`, so it is **not** (L11184).

### 13.2 Flag account — `openFlagAccountModal(entityId, isDrvStr)` L9007–L9025

* Body copy: *"Marks this account for extra scrutiny — visible to the whole team on their profile and in the {Drivers|Riders} table."*
* Required select `flag-reason` (`csel-flag-reason`), default empty: `Suspicious activity`, `Payment dispute`, `Repeated complaints`, `Fraud investigation`, `Other — see note`
* Footer: `Cancel` / `🚩 Flag account` → `commitFlagAccount` (§10.1)

### 13.3 Suspend account — `openSuspendAccountModal(entityId, isDrvStr, prefillNote)` L9058–L9078

* Red warning banner, type-specific: **drivers** *"Immediately removes this driver from dispatch matching — no new rides or subscription assignments until reinstated."*; **riders** *"Blocks this rider from being assigned to new subscriptions. Existing active trips are not interrupted."*
* Optional amber `🔍 Detected: {prefillNote}` strip when called via `quickSuspendFromFraud(entityId, isDrvStr, detectedReason)` (L9079–L9081)
* Required select `suspend-reason`: `Confirmed fraud`, `Repeated policy violations`, `Safety incident`, `Under police/legal investigation`, `Other — see note`. **Default is `'Confirmed fraud'` when `prefillNote` is supplied**, otherwise empty (L9075)
* Footer: `Cancel` / `🚫 Suspend` → `commitSuspendAccount` (§10.1)

### 13.4 Priority call — `priorityCall(name, context, entityId)` L9149–L9161

Circular blue phone icon, `{name}`, `{ctx}{ · entityId}` (ctx defaults to `'manual'`), a green pulsing `Calling — {HH:MM}` pill (`toLocaleTimeString` at open, `animation:ping-pulse .7s infinite`), a `#call-note-ta` textarea (`Note (optional)…`). Footer: `✕ End` → `closeModal()`; `✓ Log` → `logPriorityCall(name, ctx, entityId)` with all three arguments `JSON.stringify`-escaped. **Called from `buildEntityProfile` with only `d.name`** (L4110), so `context` and `entityId` are both `undefined` → the modal shows `manual` with no id.

### 13.5 Support ticket — `openSupportTicket(tripId, entityId, entityName)` L2542–L2551

Required reason-code select (`reasonSelectHTML('csel-nt-reason2','')`) + `#nt-sub` free text (prefilled `Issue with trip {tripId}` when `tripId` is truthy). `Create ticket` → `createTicketFor` (L2552): `DB.tickets.unshift({id:'TKT-'+(505+DB.tickets.length), entity, entityName, subject: #nt-sub.value || 'No subject', category: rcCategory(gvRC()), priority: rcPriority(gvRC()), status:'Open', created:'Just now', agent:'Sarah Al-Rashid', thread:[{from:entityName, role:'rider', time:'Now', msg:…}]})`, then `slaStampNewTicket`, `runAutoReply`, `closeModal`, toast.

Two hardcoded values here: `agent:'Sarah Al-Rashid'` and `role:'rider'` — the latter is wrong when the ticket is opened from a **driver's** profile (L4111 passes a driver id).

### 13.6 Edit tip — `openEditTipModal(tripId)` L4199–L4206

Note *"Goes 100% to {nm2(t.driver)} — never split with platform commission."*; `#edit-tip-amount` `number min="0" step="0.5"` defaulted to `t.tip || 0`. `Save tip` → `commitEditTip` (§10.4).

### 13.7 Review driver — `reviewDriver(name)` L8987–L8995

See §10.2 — a stub with a hardcoded finding and no persistence.

### 13.8 Grant multi-sub exception — inside `onDriverExceptionToggle` L9112–L9127

Only when *granting*. Blue banner *"This driver will receive additional subscriptions even if the general setting is disabled."* → `Grant exception` → `closeModal(); commitDriverException(driverId, true)` (L9128), which sets `d.multiSubException`, logs `config_updated`, refreshes the profile and the drivers table. Revoking skips the modal entirely (L9125).

### 13.9 Others reachable from profile bodies

`openRenewFlow` (L11277), `welcomeRider` (L11159), `sendDriverIncentive` (L11191), `openInvoiceModal`, `openSendChatModal`, `freezePlan`, `changeDriver`, `cancelSub`, `openTripReceipt` (L18779), `confirmReleaseEscrow` (L8930) — most belong to other modules; the last four are **UNVERIFIED** here.

---

## 14. States & badges

### 14.1 Header

| Badge | Trigger | Line |
|---|---|---|
| `lvlBadge(d.lvl)` — `Gold`/`Silver`/`Standard`/`New` | rider & driver headers, mapped at L3260–L3263; unknown `lvl` → `Standard` `b-grey` | L8841 |
| `b-gold` star pill `★ {rating}` / `★ new` | rider & driver headers, **unconditionally gold**, even at `rating: 0` | L8841, L3264 |
| `⚡` / `📋` prefix | `d.kind === 'Quick ride'` vs otherwise | L8847 |
| `📦` / `💳` / `⚠️` prefix | subscription / payment / complaint | L8851 / L8855 / L8858 |

### 14.2 `statusBadge(s)` — L3730–L3736, **ordered regex chain, first match wins**

| Test | Class | Matches (seed) |
|---|---|---|
| `/done\|resolved\|closed/i` | `b-green` | `Done`, `Resolved` |
| `/trip\|active/i` | `b-blue` | `In trip`, `Active` |
| `/late\|expir\|pend/i` | `b-amber` | `Late +8`, `Expiring`, `Pending` |
| `/cancel\|risk\|refund/i` | `b-red` | `Cancelled`, `Refunded` |
| *(fallback)* | `b-grey` | anything else |

**Order hazard:** the `/trip/i` test precedes `/cancel/i`, so any status containing both words resolves blue, not red. `'In trip'` also matches nothing else, so it is safe with seed data.

### 14.3 Card-level badges

| Badge | Class | Trigger | Line |
|---|---|---|---|
| `{level} churn risk` | `b-red`/`b-amber`/`b-green` | `riderChurnRisk().level` | L4070–L4072 |
| Wallet balance pill | `b-green` if `> 0`, else `b-grey` | `w.balance` | L3957 |
| Complaints count | `b-red` if `length > 0`, else `b-green` | `d.complaints.length` | L4195 |
| Subs / Trips / Payments counts | `b-grey` | always | L4176, L4193, L4194 |
| `🚩 Flagged` | `b-red` | `d.manualFlag` set | L4115 |
| `🚫 SUSPENDED` | inline `background:var(--red);color:#fff` (no class) | `d.suspended` set | L4116 |
| `rebuilt` | `b-amber`, 8px | `DB.trips[tid].reconstructed` | L3720 |
| `{n} in {days} days` (no-shows) | `b-red` if `total >= 3`, else `b-amber` | `riderNoShowCount().total` | L19540 |
| `v{n} — current` / `v{n} — outdated` | `b-green` / `b-amber` | `isConsentCurrent(d, isDrv, docKey)` — compares `entity.consents[docKey].version` to `DB.legalDocuments[docKey].currentVersion` (L3797–L3800) | L4151–L4152 |
| Bank `Active` + `Verified`/other | `b-blue` + `b-green`/`b-amber` | `d.bank.status === 'Verified'` | L6300 |
| `Exception enabled` | `b-blue` | `d.multiSubException && !DB.opsConfig.allowMultiSubPerDriver` | L4126 |
| `🟢 Live` (comm log) | `b-green` | `d.status === 'In trip'` | L4274 |
| `At risk` / `Watch` / `Healthy` (sub) | `health h-red` / `h-amber` / `h-green` | `hasOpenComplaint(driver, rider)` / `/expir/i.test(status)` / else | L4288 |
| Vehicle `Economy` / `Comfort` (sub) | `b-eco` / `b-com` | last word of `d.plan` | L4283, L4310 |
| Severity `High`/`Medium`/other | `b-red`/`b-amber`/`b-grey` | `d.severity` | L3759, L4371 |
| `✓ Resolved` (complaint) | `b-green` | `d.status !== 'Open'` | L4374 |

### 14.4 Reconciliation states

| State | Definition | Visual |
|---|---|---|
| `orphan` | `stored > 0 && windowSplit(id).inside === 0` (L20450) | Red reconcile banner (§7.2); trip/payment empty states escalate to the red "do not tell the customer" copy |
| `expectedGap` | `stored > 0 && inside > 0 && olderInBilling > 0` (L20451) | No banner; the inline `windowNoteHTML` strip with the `Fetch full history from billing` button |
| `window` (row severity) | not orphan | Banner suppressed by `if(!r.orphan) return''` (L18541) |
| `diverges` | `rows.length > 0`, i.e. any `\|stored − derived\| >= 0.01` | Necessary but not sufficient for the banner |

---

## 15. Cross-module links

`openProfile` is called from **40+ sites**. Grouped by origin:

| Origin | Lines | Target |
|---|---|---|
| Riders module | L6423, L6433, L6993, L11157 | rider profiles |
| Drivers table | L6399 | driver profiles |
| Rider Wallets (`rwallets`) | L4007, L4027 | rider profiles |
| Escrow list | L8927, L8928 (driver/rider name spans), L8926 (sub id) | driver / rider / subscription |
| Deductions list | L8977 | driver |
| Trip actions (tip edit) | L4213 | trip |
| Trip flag / unflag | L4230, L4240 | trip |
| Complaint resolve | L4383 | complaint |
| Subscription mutations | L4852, L4894, L4905, L5482, L5513, L5559 | subscription — all guarded by `navCurrent && navCurrent.id === subId` so they only refresh when you are *looking at* that subscription |
| Trip-to-sub link | L8652 | subscription (same guard) |
| Flag / unflag / suspend / reinstate | L9037, L9049, L9094, L9106 | rider or driver |
| Driver exception / trust toggles | L9135, L9145 | driver |
| Quick-ride / trip lists | L11750, L11758, L16434 | trip |
| Fraud → suspend notification | L9093 (`pushOpsNotification` callback) | rider or driver |
| Corp policy violation notification | L12439 | trip |
| Corporate detail employee rows | L6580 | rider |
| Corp pending-approval link | L6598 | subscription |
| Rider no-show panel | L19555 | rider |
| `fetchFullHistory` | L20481 | rider |
| Generic id link | L3283 (`rowLink`) | any of the six |
| Global search | L3280 | any of the six |
| Miscellaneous | L20480 | (per-context) |

Outbound from the profile:

| To | Mechanism | Line |
|---|---|---|
| Driver Wallets (`wallets`) | `go('wallets',null)` — driver action bar and earnings card | L4110, L4172 |
| Live map | `go('live',null)` — trip profile | L4276 |
| Activity log | `go('audit-log', findSbEl('audit-log'))` — sub profile | L4356 |
| Support Center | `createTicketFor` → `DB.tickets` | L2552 |
| Email Log (Settings) | `sendSystemEmail` from wallet credit and offers | L3940, L11185 |
| Audit log | every `logAction` call | L3133 |
| Renewal wizard | `openRenewFlow` | L4110, L4345 |
| Trip receipt | `openTripReceipt` | L3719 |
| E-invoice | `openInvoiceModal(d.pay)` | L4262 |

---

## 16. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `#tb-title` = `'360° Profile'` | L8835 | Literal, bypasses `titles.profile` (which holds the same string, L2168) |
| `#prof-name` / `#prof-meta` initial `—` | L1386 | Placeholder before first render |
| `subs.profile = 'Unified entity view'` | L2169 | Overwritten by `d.id` on every open (L8836) — effectively dead |
| Rider meta literal `Rider` | L8842 | Riders have no `type` field, so the word is hardcoded |
| `reviewDriver` finding: *"Flagged: Late 3× consecutive, on-time rate dropped to 88%."* | L8990 | **Same text for every driver.** No DB lookup |
| `reviewDriver` `Apply` handler | L8993 | `closeModal();toast('✅ Review action applied','ok')` — **no persistence whatsoever** |
| `createTicketFor` `agent:'Sarah Al-Rashid'` | L2554 | Every ticket is assigned to the same name |
| `createTicketFor` `role:'rider'` | L2554 | Hardcoded, wrong for driver-originated tickets |
| Ticket id `'TKT-'+(505+DB.tickets.length)` | L2553 | Length-based; collides after any deletion |
| `PHOTO_GRADS` — 5 CSS gradients | L10835 | Stand-in for real photos; index = `name.length % 5` |
| `AV_COLORS` — 6 hex | L10834 | Initials background; index = `name.length % 6` |
| `avatarHTML` fallback name `'??'` | L10843 | |
| `DB.dataWindow.months = 13` | L20404 | With an explicit source comment that it is **not settled** and must be confirmed against the payment provider's dispute window |
| `30.44` days-per-month constant | L20411, L18698 | Approximation used for the window boundary |
| `buildRiderHistory` 55% split (`targetTrips*0.55`) | L18702 | *"here the same split is modelled proportionally"* — an explicit prototype stand-in for a real date-filtered importer |
| Synthetic trip generation (`seededRand` seeds `sd = seedBase*97 + i*13 + have.trips`, surge threshold `>0.86`, cancel threshold `>0.94`, km range `2.5–20.5`, min `km*2.2 + rand*9`, hour `6–20`, rating `3.6–5.0`) | L18709–L18728 | **Entire fabricated trip history** for any rider whose `stats.totalTrips` exceeds their real records |
| `EYVAR_TODAY` | L11232 | Frozen 25 Jun 2026 |
| `navStack` cap `40` | L7006 | |
| `commitEditTip` step `0.5` / min `0` | L4203 | |
| `slice(0,6)` wallet transactions | L3953 | |
| `slice(0,5)` sub audit rows (`auditForEntity(d.id,5)`) | L4296 | |
| Trip-history scroll `430px`, payments `380px` | L3717, L3749 | |
| Separator hex `#F2F1EE` | L3956, L4141, L6286, and others | Literal, not a CSS var |
| Consent default = **oldest** version | L3789–L3791 | `versions.slice().reverse()[0].version` with the comment *"default to the oldest, safest assumption"* — so every seed user starts non-compliant on any doc with more than one version |

---

## 17. i18n keys

**None.** The `p-profile` markup (L1384–L1390) carries no `data-i18n` attribute — not on the `← Back` button, not on the placeholders. Every string emitted by `openProfile`, `buildEntityProfile`, `buildTripProfile`, `buildSubProfile`, `buildPayProfile`, `buildComplaintProfile`, and every helper (`kvCard`, `statusBadge`, `lvlBadge`, `tripsTable`, `payTable`, `cmpTable`, `provenanceChip`, `reconcileBannerHTML`, `windowNoteHTML`) is a hardcoded English literal built by string concatenation.

This is structural, not an oversight of a few nodes: because the bodies are built as HTML strings and injected via `innerHTML`, the `data-i18n` sweep that translates static markup has nothing to attach to. Localising the 360° profile would require rewriting all five builders.

The only related key anywhere near this module is `nav.riders` (L513 / L7907), which belongs to the sidebar.

---

## 18. Gaps, dead code, UNVERIFIED items

**Resolver limits**

1. **`resolveId` name search is first-match-wins over an unordered `for…in`** (L3273). Ambiguous names (`'Al-Harbi'` matches both `Nora Al-Harbi` and `Bandar Al-Harbi`) silently resolve to whichever the engine enumerates first. No disambiguation UI, no "N matches" affordance.
2. **`DB.newRiders`, `DB.pendingDrivers`, `DB.tickets`, `DB.corporateAccounts`, `DB.plans` are not resolvable.** Global search on `RDR-3001`, `APP-2201`, `TKT-505` or a company id fails with `No record found`, even though three of those have dedicated detail pages.
3. **No fuzzy matching, no partial-id matching, no phone-number search.**

**Shell defects**

4. **`initCardToggles()` runs for riders and drivers only** (L8845). Trip, subscription, payment and complaint profiles get no collapse controls, and the profile is the only page that calls it at all.
5. **`#tb-title` is set to a literal instead of `titles[…]`** (L8835), so the topbar title is not translatable and does not follow the `titles` map convention every other page uses.
6. **Several refresh calls omit `isBack`**, pushing a spurious history entry each time: `commitWalletAdjust` (L4007), `commitEditTip` (L4213), `fetchFullHistory` (L20481), `openNewRiderProfile` (L11157). Pressing `← Back` after adjusting a wallet returns you to the *same* profile.
7. **`navStack` overflow drops the oldest entry** (`shift()` at L6006/L7006) with no user indication.

**Builder defects**

8. **`riderNoShowCount`'s ternary is degenerate** (L19529): `c.tsMs!==undefined ? c.openedAtMs>=since : c.openedAtMs>=since` — both branches identical. Almost certainly meant to compare `c.tsMs` in one branch. Also note operator precedence: `&&` binds tighter than `?:`, so the whole preceding conjunction is the ternary's condition — the filter evaluates to a boolean either way, so it happens to work.
9. **`buildPayProfile` has no actions at all** (L4364–L4369) — no refund, no invoice, no audit trail, despite `getOrCreateInvoice` existing (L4413) and the trip profile linking to `openInvoiceModal`.
10. **`cmpTable` takes no `ctxId`** (L3755), so complaint lists never get the reconciliation escalation that trips and payments get.
11. **`reviewDriver` is a pure stub** (L8987–L8995): hardcoded finding text, no permission gate, no DB write, no audit entry — yet it is the `Escalate` action on every complaint profile (L4374) and a primary driver action (L4110).
12. **`createTicketFor` writes no audit entry** (L2552–L2559) — every other state-changing action in this module calls `logAction`.
13. **`createTicketFor` hardcodes `role:'rider'`** even when opened from a driver profile (L4111 passes a driver id as `entityId`).
14. **Driver KPI tiles have no provenance chips and no derived sub-lines** (L4089–L4092), although `entityDerived()` works identically for drivers (L18497) and `reconcileEntity` explicitly supports `DB.drivers[id]` (L18516). The asymmetry means a driver with an orphaned record shows the red banner but no per-tile context.
15. **`getUserConsent(d, true)` lazily creates a `driverAgreement` consent** (L3787) that the Device & access card never renders (L4149–L4152 lists only `tos` and `privacy`). The driver-agreement compliance percentage is visible only in Settings → Legal (L3805).
16. **`buildRiderHistory` is a no-op for drivers** (`if(!DB.riders[id]) return null`, L18681), so a driver whose `stats.totalTrips` exceeds their linked trips stays permanently divergent with no fill-in.
17. **Sub-profile `Trip log` sorts by string `localeCompare` on `'25 Jun 07:00'`** (L4295) — lexicographic, so `'25 Jun'` sorts after `'12 Jun'` correctly by coincidence of the day being first, but any month rollover (`'01 Jul'` vs `'25 Jun'`) sorts wrong.
18. **Sub-profile header badge renders `{d.trips} complete`** where `d.trips` is the string `'5/5'` — producing `5/5 complete` (L4350). Cosmetic, but the label reads as a bug.
19. **`buildSubProfile` `Route` is looked up by rider, not by subscription** (L4285) — `DB.upcomingSubTrips.find(t => t.rider === d.rider)`. A rider with two subscriptions shows the same route on both.
20. **`tripsTable` sorts on `dateMs`, which no seed trip has** (L3718) — all seed trips tie at `0` and render in array order, so the promised "newest first" only holds for generated history.

**UNVERIFIED**

21. **Runtime rendering not executed.** All findings come from static reading of `eyvar_ops_panel_v40_fixed.html`. Load order, actual DOM output, and CSS effects were not observed.
22. **Bodies not read** (cited from call sites only): `arrivalEvidenceHTML`, `rideStateTimelineHTML`, `tripRatingsCardHTML`, `openTripReceipt`, `openInvoiceModal`, `openSendChatModal`, `sendTripReceipt`, `flagTrip`, `unflagTrip`, `freezePlan`, `changeDriver`, `cancelSub`, `confirmSubDriverCommit`, `approveCorpSubscription`, `rejectCorpSubscription`, `toggleAutoRenew`, `logPriorityCall`, `sendSystemEmail`, `compCheck`, `compPreview`, `logGoodwill`, `auditForEntity`, `auditRowsHTML`, `hasOpenComplaint`, `commissionRateForPlan`, `driverActiveSubCount`, `driverCompletedTripsCount`, `driverTrustedForSubs`, `getLimit`, `ratingCell`, `customSelectHTML`, `reasonSelectHTML`, `slaStampNewTicket`, `runAutoReply`, `rcCategory`, `rcPriority`, `gvRC`, `pushOpsNotification`, `seededRand`, `buildFareBreakdown`. Their effects as described here are inferred from the call sites and from surrounding comments. **UNVERIFIED**.
23. **`can(permKey)` / role matrix** — which roles hold `contact_users`, `approve_drivers`, `manage_tickets`, `process_payouts`, `manage_settings` was not read. **UNVERIFIED**.
24. **`DB.commitPolicy.counterWindowDays`** value not read — it appears only as an interpolation (L19541). **UNVERIFIED**.
25. **`DB.legalDocuments`** structure (`versions[]`, `currentVersion`, `label`) is inferred from `getUserConsent` (L3788–L3791) and `renderLegalConsent` (L3805–L3812); the seed object itself was not read. **UNVERIFIED**.
26. **CSS classes** (`.card`, `.ch`, `.g2`, `.g4`, `.kpi`, `.kpi-dl`, `.b-*`, `.health`, `.tog`, `.plan-option`, `.al-row`, `.ren-bar`, `.tbl-scroll`, `.dt`, `.ra`, `.td-name`, `.td-sub`, `.ch-right`, `.ch-tgl`) were not audited — only their names are reported. **UNVERIFIED**.

---

## 19. Line-number index

| Item | Lines |
|---|---|
| `p-profile` markup | 1384–1390 |
| — `.ph` / `#prof-name` / `#prof-meta` / `← Back` / `#prof-body` | 1385 / 1386 / 1386 / 1387 / 1389 |
| `titles.profile` / `subs.profile` | 2168 / 2169 |
| `openSupportTicket` / `createTicketFor` | 2542–2551 / 2552–2559 |
| `DB.riders` / `DB.drivers` / `DB.trips` / `DB.subscriptions` / `DB.payments` / `DB.complaints` seeds | 2593–2637 / 2638–2669 / 2670–2680 / 2681–2689 / 2690–2701 / 2702–2707 |
| `requirePerm` / `logAction` | 3126–3132 / 3133–3155 |
| `lvlBadge` / `rstar` | 3260–3263 / 3264 |
| **`resolveId`** | **3266–3275** |
| `globalSearch` / `rowLink` / `subLocBtn` | 3277–3281 / 3283 / 3284–3286 |
| `kvCard` / `nm2` | 3560–3565 / 3566 |
| `emailFor` | 3572–… |
| **`tripsTable`** | **3698–3729** |
| **`statusBadge`** | **3730–3736** |
| **`payTable`** | **3737–3754** |
| **`cmpTable`** | **3755–3763** |
| `getUserConsent` / `isConsentCurrent` / `renderLegalConsent` | 3783–3796 / 3797–3800 / 3801–… |
| `getReferralCode` (dead) / `processReferral` | 3854–3859 / 3860–3877 |
| `getRiderWallet` / `creditRiderWallet` / `debitRiderWallet` | 3928–3931 / 3932–3941 / 3942–3950 |
| `walletCardHTML` / `openWalletAdjustModal` / `commitWalletAdjust` | 3951–3960 / 3961–3977 / 3978–4009 |
| `riderLTV` / `riderTenureMonths` / `riderChurnRisk` / `customerValueCardHTML` | 4031–4037 / 4038–4047 / 4048–4064 / 4065–4082 |
| **`buildEntityProfile`** | **4083–4197** |
| — `ensureHistory` call | 4085 |
| — driver stat cards / rider stat cards | 4089–4092 / 4093–4102 |
| — `reconcileBannerHTML` / `riderNoShowCardHTML` calls | 4107 / 4108 |
| — action bar | 4109–4116 |
| — `multiSubCard` (driver) | 4117–4139 |
| — `personalCard` / `deviceCard` | 4141–4145 / 4147–4153 |
| — `locationCard` / `bankCard` / `notifCard` | 4146 / 4147 / 4148 |
| — `earningsCard` (driver) | 4157–4172 |
| — `subSection` (rider) | 4176–4179 |
| — `valueCard` / `walletCard` | 4184 / 4185 |
| — return / assembly | 4192–4196 |
| `openEditTipModal` / `commitEditTip` | 4199–4206 / 4207–4216 |
| **`buildTripProfile`** | **4244–4278** |
| **`buildSubProfile`** | **4279–4363** |
| **`buildPayProfile`** | **4364–4369** |
| **`buildComplaintProfile`** | **4370–4375** |
| `resolveComplaint` | 4376–4386 |
| `PLANS` / `fmtSAR` / `getOrCreateInvoice` | 4406–4410 / 4411 / 4413–… |
| `buildLocationHistoryCard` / `bankCardHTML` | 6283–6293 / 6294–… |
| `updateBackBtn` / `pushHistory` / `findSbEl` / `goBack` | 7005 / 7006 / 7007–7011 / 7012–7020 |
| **`window.openProfile`** | **8827–8861** |
| — rider/driver branch | 8839–8845 |
| — trip branch | 8846–8849 |
| — subscription branch | 8850–8853 |
| — payment branch | 8854–8856 |
| — complaint branch | 8857–8859 |
| `openApplicantDetail` / `openTicketDetail` | 8863–8876 / 8877–8888 |
| `lvlBadgeSm` | 8901–8904 |
| `renderEscrow` / `confirmReleaseEscrow` | 8907–8929 / 8930–8945 |
| `renderDeductions` / `applyDeduction` / `waiveDeduction` | 8946–8967 / 8968–8983 / 8984–8986 |
| `viewDriver` / `reviewDriver` | 8985 / 8987–8995 |
| `openFlagAccountModal` / `commitFlagAccount` / `commitUnflagAccount` | 9007–9025 / 9026–9041 / 9042–9053 |
| `openSuspendAccountModal` / `quickSuspendFromFraud` / `commitSuspendAccount` / `reinstateAccount` | 9058–9078 / 9079–9081 / 9082–9098 / 9099–9110 |
| `onDriverExceptionToggle` / `commitDriverException` / `onDriverTrustToggle` | 9112–9127 / 9128–9137 / 9138–9148 |
| `priorityCall` | 9149–9161 |
| `initCardToggles` | 9368–… |
| `AV_COLORS` / `PHOTO_GRADS` / `avatarHTML` | 10834 / 10835 / 10836–10845 |
| `openRenewFlow` / `renderStep1` | 11277–11283 / 11301–11330 |
| `welcomeRider` / `confirmWelcomeOffer` / `sendDriverIncentive` | 11159–11176 / 11177–11190 / 11191–… |
| `ratingCell` | 15250 |
| `entityDerived` / `numOf` / `reconcileEntity` (base) | 18495–18506 / 18507–18511 / 18515–18531 |
| `provenanceChip` / `reconcileBannerHTML` | 18532–18536 / 18537–… |
| `ensureHistory` / `buildRiderHistory` | 18680–18683 / 18686–… |
| `openTripReceipt` | 18779–… |
| `riderNoShowCount` / `riderNoShowCardHTML` / `riderNoShowLeaders` / `riderNoShowPanelHTML` | 19525–19534 / 19535–19547 / 19548–19553 / 19554–19566 |
| `DB.dataWindow` / `windowStartMs` | 20403–20409 / 20411 |
| `windowSplit` / `olderInBilling` | 20415–20425 / 20429–20436 |
| `reconcileEntity` (override) | 20442–20455 |
| `windowNoteHTML` / `fetchFullHistory` | 20458–20470 / 20472–20482 |
