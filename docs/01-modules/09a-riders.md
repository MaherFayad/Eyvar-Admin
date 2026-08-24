# Module: Riders

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `riders` — DOM node `div.page#p-riders`
> **HTML lines:** L907–L925 (comment banner L906)
> **Render entry:** `go('riders', …)` → `renderSupplyKpis(); renderRidersTable(); renderNewRiders();` (L8792)
> **Companion doc:** `09b-360-profile-system.md` (the `p-profile` shell this page links into)

---

## 1. Purpose

The Riders page is the demand-side roster. It answers three questions in one screen, top to bottom:

1. **Who just arrived?** — `✨ New sign-ups` card, the 24–48h intake queue with a one-click welcome offer (L910–L913).
2. **Who is about to leave and is worth keeping?** — `⚠ Retention watchlist`, the intersection of high lifetime value and non-Low churn risk (L914–L917).
3. **Everyone else** — `All riders` table, one row per `DB.riders` key, with computed LTV and churn risk per row and a risk-level filter (L918–L924).

The page header KPI strip (`riderKpiHTML()`, L21212–L21221) is *not* in the static HTML — it is injected at boot into an empty anchor div (L908) by `mountUxBlocks()` (L21397–L21400). See §7.

Every number on this page is computed live from `DB` at render time. There are no stored "rider analytics" fields — LTV, tenure and churn risk are all derived (L4031–L4064). Two exceptions are flagged in §16.

---

## 2. Entry points & routing

| Entry | Line | Effect |
|---|---|---|
| Sidebar item `Riders` | L513 | `go('riders', this)`; label carries `data-i18n="nav.riders"` |
| `go()` page hook | L8792 | `if(id==='riders'){renderSupplyKpis();renderRidersTable();renderNewRiders();}` |
| Topbar title / subtitle | L2168 / L2169 | `titles.riders = 'Riders'`; `subs.riders = '284 registered riders'` — **hardcoded string, does not match live data** (see §16) |
| Boot render | L14564 (`renderNewRiders()`), L14582 (`renderRidersTable()`) | Both called once inside the deferred boot `setTimeout` block starting L14556 |
| KPI mount | L21397–L21400, called from `mountUxBlocks()` at L21409 | Creates `div#rider-kpis` inside `div#rider-kpis-anchor` (L908) if absent, then `renderSupplyKpis()` |
| Auto-tier toast | L13658 | `toast(… , function(){go('riders',null);} )` — clicking the "N rider tiers updated automatically" toast navigates here |
| Re-render triggers | L9039, L9051, L9096, L9108 | flag / unflag / suspend / reinstate all call `renderRidersTable()` |
| Re-render trigger | L16033 | `executeErasure()` calls `renderRidersTable()` after a PDPL scrub |
| Header `← Back` | — | **Not present on this page.** `p-riders` has no back button (contrast `p-profile`, L1387) |

The page's own subtitle `<p>` (L909, literal `—`) is overwritten by two different functions, whichever runs last:

* `renderRidersTable()` L6436 → `"{N} total · {N} with active subscription · {N} quick-ride only · {N} new (24h)"`
* `liveSubtitles()` L21246–L21247 → `"{N} registered · {N} with an active subscription · {N} quick-ride only"`

These two strings disagree in wording and in the `withSub` definition (see §18).

---

## 3. Layout map

```
div.page#p-riders                                     L907
├── div#rider-kpis-anchor                             L908   (empty in HTML; filled at boot)
│   └── div#rider-kpis  ← injected L21399
│       └── div.g4 ×4 KPI tiles  ← riderKpiHTML()     L21212
├── div.ph                                            L909
│   ├── div.ph-l  →  h1 "Riders" · p (live subtitle)
│   └── div.br    →  inline search box (no id)        L909
├── div.card [border #9DC0E5]                         L910
│   ├── div.ch [bg var(--blue-lt)]                    L911
│   │   ├── h2 "✨ New sign-ups" + span.b.b-blue#new-riders-count ("3")
│   │   └── span "Registered in the last 24–48 hours"
│   └── div#new-riders-list [max-height:320px;overflow-y:auto]  L912  ← renderNewRiders()
├── div.card [border #E0A0A0]                         L914
│   ├── div.ch [bg var(--red-lt)]                     L915
│   │   ├── h2 "⚠ Retention watchlist"
│   │   └── span "High lifetime value + high churn risk — worth a proactive save before they leave"
│   └── div#retention-watchlist [padding:0]           L916  ← renderRetentionWatchlist()
└── div.card                                          L918
    ├── div.ch  →  h2 "All riders" + select#riders-risk-filter   L919
    └── div.tbl-scroll > table.dt                     L920
        ├── thead (10 columns)                        L921
        └── tbody#riders-tbody                        L922  ← renderRidersTable()
```

`initCardToggles()` (L9368) is **not** called on this page (only from `openProfile`, L8845), so the collapse chevrons that appear on profile cards do not appear here.

---

## 4. Data model & fields

### 4.1 `DB.riders[<RDR-id>]` — seeded at L2593–L2637 (10 riders)

| Field | Type | Meaning | Source |
|---|---|---|---|
| `id` | string `'RDR-####'` | Primary key; duplicated as the object key | seed L2594 |
| `name` | string | Display name; also the name-search target in `resolveId()` (L3273) | seed |
| `phone` | string `'+966 …'` | Table sub-line (L6423) and profile meta (L8842) | seed |
| `rating` | number 0–5 | Rider's own star rating. `0` = new. Feeds `riderHealth()` and `riderChurnRisk()` | seed |
| `lvl` | `'gold' \| 'silver' \| 'new'` (riders); `'standard'` also supported by `lvlBadge` L3260 | Loyalty tier → badge class in the table (L6420) and `lvlBadge()` on the profile | seed |
| `joined` | string `'Mon YYYY'` e.g. `'Mar 2026'` | Sign-up month. **Sole input to `riderTenureMonths()`** (L4038) | seed |
| `hasPhoto` | boolean | Chooses gradient-with-silhouette vs coloured initials in `avatarHTML()` (L10836) | seed |
| `gender` | `'Male' \| 'Female'` | Profile Personal-information card (L4142) | seed |
| `driverGenderPref` | `'female'` (only `RDR-1041`, L2594) | Rider's driver-gender preference; consumed by dispatch (L4587, L5676), **never shown on the Riders page or in `buildEntityProfile`** | seed |
| `wallet` | `{balance:number, transactions:[]}` | Prepaid balance. Lazily created by `getRiderWallet()` (L3928) if absent | seed (2 riders) / lazy |
| `wallet.transactions[]` | `{id, type:'credit'\|'debit', amount, reason, date, balanceAfter}` | Ledger, newest first (`unshift`, L3937) | runtime |
| `address` | string | Self-reported at signup (the label says so, L4143) | seed |
| `city` | string `'Riyadh'` | All 10 seed riders are Riyadh | seed |
| `device` | string `'iPhone 14 Pro · iOS 17.4'` | Device & access card (L4149) | seed |
| `appLang` | `'Arabic' \| 'English'` | Device & access card (L4149) | seed |
| `lastIp` | string | Device & access card (L4150) | seed |
| `ipLocation` | string `'Riyadh, SA'` | Rendered in parentheses after the IP (L4150) | seed |
| `mapPos` | `{x:number, y:number}` | Percentage coords for the Live map. Not used by this module | seed |
| `movementLog[]` | `{date, action, location}` | Location-history timeline (`buildLocationHistoryCard()`, L6283) | seed |
| `subs[]` | array of `SUB-` ids | Drives `Current plan`, `Vehicle`, `Subs total`, `Status` columns and the whole `hasLiveSub` branch of churn risk | seed |
| `trips[]` | array of `TRP-` ids | Trip-history table on the profile | seed + `buildRiderHistory()` |
| `payments[]` | array of `PAY-` ids | **Sole input to `riderLTV()`** (L4032) | seed + `buildRiderHistory()` |
| `complaints[]` | array of `CMP-` ids | Feeds `riderHealth()` (L6402) and adds `complaintCount` to the churn score (L4057) | seed |
| `stats` | object, see 4.2 | Stored "billing aggregate" figures — deliberately allowed to diverge from derived ones | seed |
| `referralCode` | string, lazily written | `getReferralCode()` L3854 writes it on first call — **but nothing calls it** (§18) | lazy / dead |
| `referredBy` | `'RDR-####'` | Written by `processReferral()` (L3871). Never rendered anywhere | runtime |
| `consents` | `{tos:{version,acceptedAt}, privacy:{…}}` | Lazily created by `getUserConsent()` (L3785–L3793); riders get `['tos','privacy']` only | lazy |
| `manualFlag` | `{reason, by, at}` | Set by `commitFlagAccount()` (L9034); deleted by `commitUnflagAccount()` (L9047) | runtime |
| `suspended` | `{reason, by, at}` | Set by `commitSuspendAccount()` (L9091); deleted by `reinstateAccount()` (L9104) | runtime |
| `erased` | boolean | Set by `executeErasure()` (L16022) with `name`→`'Erased rider RDR-…'`, phone/email/address/device/lastIp/ipLocation→`'[erased]'`, `photo=null`, `hasPhoto=false`, `movementLog=[]`. Counted by the `Erased (PDPL)` KPI | runtime |
| `email` | string | Not on any seed rider; `emailFor()` (L3572) falls back when absent. Scrubbed to `'[erased]'` on erasure (L16021) | runtime |
| `photo` | string/null | Only nulled by erasure; riders use `hasPhoto`, not `photo`. (`photo` is the *team-user* field, used by `avatarOrInitials()` L2917) | runtime |

### 4.2 `rider.stats` — the "billing aggregate" block

| Field | Type | Meaning | Used by |
|---|---|---|---|
| `totalTrips` | number | Lifetime trip count from billing | Profile KPI 1 (L4098); `reconcileEntity` "Trips" row (L18527); `buildRiderHistory` target (L18691) |
| `totalPaid` | string `'259.50 SAR'` / `'1,040.00 SAR'` | Lifetime paid, **string with a thousands separator** | Profile KPI 3 (L4101); `reconcileEntity` "Total paid" row (L18528). Parsed by `numOf()` (L18507) which strips non-digits |
| `renewalRate` | string `'100%'` / `'—'` | Renewal rate. **Never computed — display-only seed string** | Riders table col 6 (L6428); profile KPI 4 (L4102) |
| `quickRides` | number | Count of quick rides | Profile KPI 2 (L4100); `buildRiderHistory` kind-split (L18708) |

### 4.3 `DB.newRiders[]` — seeded at L2744–L2748 (3 entries)

A **separate array**, not a `DB.riders` subset. Its ids (`RDR-3001…3003`) do not exist in `DB.riders` until `openNewRiderProfile()` promotes them (L11153–L11158).

| Field | Type | Meaning |
|---|---|---|
| `id` | `'RDR-3001'…` | |
| `name` | string | |
| `phone` | string | |
| `joined` | `'25 Jun · today'` / `'24 Jun · yesterday'` | **Human-readable, not parseable by `riderTenureMonths()`** — see §18 |
| `firstAction` | `'No trips yet'` / `'1 quick ride completed'` / `'Browsing — no trips yet'` | Card sub-line (L11145) |
| `dob` | `'11 May 1995'` | Copied into `DB.riders` on promotion (L11156); **never rendered** by `buildEntityProfile` |
| `nid` | `'1093456712'` | National ID. Copied on promotion; **never rendered** |
| `address`, `city` | string | Copied on promotion; rendered in the Personal-information card |
| `hasPhoto` | boolean | Avatar mode (used by the card itself, L11142) |
| `gender` | `'Male' \| 'Female'` | On the newRiders record only — **not** copied on promotion (L11156) |
| `device`, `appLang`, `lastIp`, `ipLocation` | string | On the newRiders record only — not copied on promotion |
| `movementLog[]` | `{date,action,location}` | On the newRiders record only — not copied on promotion |

---

## 5. Analytics formulas

All three live in the block commented *"CUSTOMER LIFETIME VALUE & CHURN RISK — Computed from what's actually on the rider's record … not a separate fabricated score"* (L3765–L3775).

### 5.1 `riderLTV(d)` — L4031–L4037

```js
riderLTV(d) = Σ over pid in (d.payments || []) of:
                let p = DB.payments[pid]
                if (!p || p.status !== 'Paid') → contribute 0
                else                          → contribute (parseFloat(p.amount) || 0)
```

* **Only `status === 'Paid'` counts.** `'Refunded'` and `'Pending'` contribute nothing (L4034).
* `p.amount` is the string `'86.50 SAR'`; `parseFloat` reads `86.50` and stops at the space. A comma-formatted amount would truncate (`parseFloat('1,040.00 SAR') === 1`) — no seed payment currently has a comma, so this is latent, not live.
* Unit: SAR. Rendered `.toFixed(2)+' SAR'`.
* Only `d.payments[]` is walked — payments whose `entity` is this rider but which are not listed in `d.payments` are invisible to LTV (contrast `entityDerived()` L18499, which scans `DB.payments` by `entity`).

### 5.2 `riderTenureMonths(d)` — L4038–L4047

```js
if (!d.joined)                          return 1
parts      = d.joined.split(' ')                     // 'Mar 2026' → ['Mar','2026']
monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
mi         = monthNames.indexOf(parts[0])
if (mi < 0 || !parts[1])                return 1
joinedDate = new Date(parseInt(parts[1],10), mi, 1)
months     = (EYVAR_TODAY.getFullYear() - joinedDate.getFullYear()) * 12
           + (EYVAR_TODAY.getMonth()    - joinedDate.getMonth())
return Math.max(1, months)
```

* `EYVAR_TODAY = new Date(2026, 5, 25)` — **25 Jun 2026, hardcoded** (L11232).
* Floor of 1 month, so `monthlyAvg` never divides by zero.
* Day-of-month is ignored on both sides (joined is pinned to the 1st).
* Worked example, `RDR-1080` `joined:'Dec 2025'`: `(2026−2025)*12 + (5−11) = 12 − 6 = 6` months.

### 5.3 `riderChurnRisk(d)` — L4048–L4064

Inputs (L4050–L4055):

```js
activeSubs      = (d.subs||[]).map(sid => DB.subscriptions[sid]).filter(Boolean)   // NB: ALL subs, not only active
hasLiveSub      = activeSubs.some(s => s.status === 'Active')                      // exact string match
hasAutoRenewOff = activeSubs.some(s => s.autoRenew === false)                      // strict false; undefined does NOT count
hasCancelled    = activeSubs.some(s => /cancel/i.test(s.status))
complaintCount  = (d.complaints||[]).length
```

Scoring — every rule that fires adds to `score` **and** pushes one reason string:

| # | Condition (exact) | Points | Reason string pushed | Line |
|---|---|---|---|---|
| 1 | `!hasLiveSub && activeSubs.length === 0` | **+1** | `No subscription — quick-ride only, less predictable revenue` | L4057 |
| 2 | `hasAutoRenewOff` | **+2** | `Auto-renew turned off on an active subscription` | L4058 |
| 3 | `hasCancelled` | **+2** | `Has a cancelled subscription on record` | L4059 |
| 4 | `complaintCount > 0` | **+complaintCount** (variable) | `{n} complaint` / `{n} complaints` + ` filed` | L4060 |
| 5 | `(d.rating \|\| 5) < 4` | **+1** | `Rating below 4★` | L4061 |

Note rule 5's default: a rider with **no** `rating` field is treated as `5` and does not score. But a seeded rider with `rating: 0` (e.g. `RDR-2090`, L2606) **does** score +1.

Banding — L4062:

| `score` | `level` |
|---|---|
| `score >= 4` | **High** |
| `score >= 2` and `< 4` | **Medium** |
| `score < 2` (0 or 1) | **Low** |

If no rule fired, the single reason `No negative signals on record` is pushed (L4063).

Return shape: `{ level, score, reasons[] }` (L4064).

### 5.4 `customerValueCardHTML(d)` — L4065–L4082

```js
ltv        = riderLTV(d)                  // L4066
months     = riderTenureMonths(d)         // L4067
monthlyAvg = ltv / months                 // L4068 — no rounding, formatted .toFixed(2)
risk       = riderChurnRisk(d)            // L4069
```

Colour/badge mapping (L4070–L4071):

| `risk.level` | `riskColor` (reason text) | `riskBadge` (header pill) |
|---|---|---|
| `High` | `var(--red)` | `b-red` |
| `Medium` | `var(--amber-dk)` | `b-amber` |
| `Low` | `var(--green)` | `b-green` |

Card contents (L4072–L4081): header `💰 Customer value` + `{level} churn risk` pill; a three-column flex row of **Lifetime value** (with `provenanceChip('panel')` → hover title *"Derived live from the trips and payments held in this panel."*, L18533–L18534, plus the caption `from linked payments only`), **Avg monthly spend**, **Tenure** (`{months} mo`); then a `Why this risk level` list rendering every `risk.reasons[]` entry as a `• `-prefixed line in `riskColor`.

### 5.5 `riderHealth(rr)` — L6401–L6405 (table column only, not part of churn risk)

```
if (rr.complaints && rr.complaints.length)  → <span class="health h-red">{n} complaint(s)</span>
else if (rr.rating && rr.rating < 4)        → <span class="health h-amber">Watch</span>
else                                        → <span class="health h-green">Healthy</span>
```

Note `rr.rating && …`: `rating: 0` is falsy, so a brand-new zero-rated rider is reported **Healthy**, not Watch.

### 5.6 Downstream consumers of these formulas (outside this module)

| Consumer | Line | Use |
|---|---|---|
| `corpTotalSpend()` | L6451 | `Σ riderLTV(r)` over a corporate account's linked riders |
| `corpPolicyViolations()` | L6552 | `riderLTV(r)/riderTenureMonths(r)` vs `pol.monthlyCapSAR` |
| Corp employee table | L6582 | `riderLTV(r)` per employee row |
| Quick-ride creation | L12432 | Same monthly-spend check; flags the trip on violation |
| Broadcast audience `high_risk_riders` | L7687, L7724 | `riderChurnRisk(...).level === 'High'` |
| `renderRetentionWatchlist()` | L6985–L6986 | Both LTV and churn risk |

---

## 6. Entity types resolved & their renderers

*Not applicable to this doc — see `09b-360-profile-system.md` §6.*

---

## 7. KPIs & metrics

### 7.1 Header KPI strip — `riderKpiHTML()` (L21212–L21221)

Injected into `#rider-kpis` inside `#rider-kpis-anchor` (L908) by `mountUxBlocks()` (L21397–L21400) and refreshed by `renderSupplyKpis()` (L21228–L21233). All four tiles read one call to `fleetCounts()` (L20918–L20942).

| # | Label | Value | Formula (from `fleetCounts()`) | Sub-line | Colour | Threshold |
|---|---|---|---|---|---|---|
| 1 | `Registered` | `c.riders.total` | `Object.keys(DB.riders).length` (L20935) | `rider accounts` | default `--ink` | none |
| 2 | `On a subscription` | `c.riders.withSub` | `DB.subscriptions` filtered by `/active\|expiring/i.test(s.status)` — **counts subscriptions, not riders** (L20937) | `predictable revenue` | `var(--blue)` | none |
| 3 | `Quick-ride only` | `c.riders.quickOnly` | `riders.length − (that same subscription count)` (L20938) | `conversion opportunity` | default | none |
| 4 | `Erased (PDPL)` | `c.riders.erased` | `riders.filter(x => x.erased).length` (L20936) | `identity scrubbed, books retained` | default | none |

**None of the four tiles is clickable** — `riderKpiHTML` emits plain `div.kpi`, not `div.kpi.click` (contrast `supplyKpiHTML()` L21191, whose tiles carry `onclick`). See §18 for the counting defect in tiles 2 and 3.

`renderSupplyKpis()` also fills `#supply-kpis` with `supplyKpiHTML()` — that element lives on the **Drivers** page; the function is shared between the two pages (L8791, L8792).

### 7.2 Live subtitle metrics (the `<p>` under the `Riders` H1, L909)

Written by two different functions, whichever ran last:

**A — `renderRidersTable()` L6436** (runs on every table render):
`"{ids.length} total · {N with subs.length>0} with active subscription · {N without} quick-ride only · {DB.newRiders.length} new (24h)"`
Here `withSub` = riders whose `subs[]` array is non-empty, **regardless of subscription status**.

**B — `liveSubtitles()` L21246–L21247** (runs once at boot, after `mountUxBlocks`):
`"{c.riders.total} registered · {c.riders.withSub} with an active subscription · {c.riders.quickOnly} quick-ride only"`
Here `withSub` = count of active/expiring **subscriptions**.

### 7.3 Card-level counters

| Element | Line | Source |
|---|---|---|
| `span#new-riders-count` | L911 | **Hardcoded `3` in HTML; no JS ever writes this id** (grep returns exactly one hit) — see §16 |
| Retention watchlist count | — | No counter rendered |
| All-riders row count | — | No counter rendered; total appears only in the page subtitle |

---

## 8. Data displayed

### 8.1 KPI strip

| Element | DB path / computation | Type | Notes |
|---|---|---|---|
| Registered | `Object.keys(DB.riders).length` | int | L20935 |
| On a subscription | `DB.subscriptions[*].status` matched `/active\|expiring/i` | int | L20937 — subscription count |
| Quick-ride only | `riders.length − withSub` | int | L20938; can go negative |
| Erased (PDPL) | `DB.riders[*].erased` | int | L20936 |

### 8.2 New sign-ups card (`renderNewRiders()` L11136–L11152)

| Element | DB path | Type | Notes |
|---|---|---|---|
| Avatar | `avatarHTML(r.name, 38, r.hasPhoto)` | HTML | L11143; gradient+silhouette if `hasPhoto`, else initials on `AV_COLORS[name.length % 6]` (L10834) |
| Name (blue, clickable) | `DB.newRiders[i].name` | string | L11144 → `openNewRiderProfile(id)` |
| Id pill | `.id` | string | `span.b.b-grey`, 9px |
| `New` pill | — | **hardcoded** | `span.b.b-blue` on every row, L11144 |
| Sub-line | `` `${r.phone} · Joined ${r.joined} · ${r.firstAction}` `` | string | L11145 |
| Empty state | — | — | `No new sign-ups in the last 48 hours.` (L11139) when `DB.newRiders.length === 0` |

### 8.3 Retention watchlist (`renderRetentionWatchlist()` L6980–L6998)

| Element | Computation | Line |
|---|---|---|
| Selection | all `DB.riders` → `{id, rr, risk, ltv}` → filter `risk.level !== 'Low' && ltv > 0` → sort `ltv` **descending** → `slice(0,5)` | L6982–L6989. Hard cap of **5** rows |
| Risk pill | `b-red` if `High`, else `b-amber` (Medium only, by the filter) | L6991 |
| Name (blue) | `x.rr.name` → `openProfile(x.id)` | L6993 |
| Meta | `` `${x.id} · ${x.ltv.toFixed(2)} SAR lifetime` `` | L6993 |
| Reason line | `x.risk.reasons[0]` — **first reason only** | L6994 |
| Action | `🎁 Send retention offer` → `sendRetentionOfferToRider(x.id)` | L6995 |
| Empty state | `No high-value riders currently at risk — nothing needs proactive outreach right now.` | L6996 |

### 8.4 All riders table

See §11.1.

---

## 9. Input fields / filters

| # | Element | id | Type | Label / placeholder | Default | Options | Effect |
|---|---|---|---|---|---|---|---|
| 1 | Header search box | **none** | `<input>` text, inline, `border:none`, width 140px, inside a bordered pill with a magnifier SVG | placeholder `Search RDR-id or name…` | empty | free text | `onkeydown="if(event.key==='Enter')globalSearch(this.value)"` (L909). `globalSearch()` (L3277) → `resolveId()` → on hit `openProfile(hit.data.id)`; on miss `toast('No record found for "…"','err')`. **Searches all six buckets, not just riders** — typing `TRP-9008` here opens a trip profile |
| 2 | Risk filter | `riders-risk-filter` | `<select>` | no `<label>`; sits beside the `All riders` heading | `""` = *All risk levels* | `""` → `All risk levels`; `High` → `High risk only`; `Medium` → `Medium risk only`; `Low` → `Low risk only` | `onchange="renderRidersTable()"` (L919). Read at L6410; filters `ids` by `riderChurnRisk(DB.riders[id]).level === filter` (L6411). No state variable — the live DOM value is re-read on every render, so the filter survives re-renders triggered elsewhere; there is no "clear" affordance beyond re-selecting the blank option |

There is **no** text search over the table body, no column sorting control, no pagination, no date range, and no status filter.

---

## 10. Actions

Actions reachable directly from `p-riders`. (Actions inside the 360° profile are documented in `09b` §10.)

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| *(Enter in search box)* L909 | `globalSearch(value)` L3277 | `resolveId` → `openProfile`, or error toast | none | none | none | no |
| `View` (new sign-up) L11147 | `openNewRiderProfile(id)` L11153 | **Creates a `DB.riders` record** if missing, with `rating:0, lvl:'new', subs/trips/payments/complaints:[], stats:{totalTrips:0,totalPaid:'0.00 SAR',renewalRate:'—',quickRides:0}` (L11156), then `openProfile(id)` | `DB.riders[id]` | **none** — explicitly excluded from `GATE_SWEEP` with the note *"openNewRiderProfile — opens a form; the save is gated"* (L20893) | **none** | no |
| *(name click, new sign-up)* L11144 | same as above | same | same | none | none | no |
| `Send welcome offer` L11148 | `welcomeRider(id)` L11159 | Opens the offer modal (§13.1) | none yet | none on open | none on open | the modal is the confirm step |
| ↳ `Send offer` (in modal) L11175 | `confirmWelcomeOffer(riderId, riderName)` L11177 | Closes modal; `logAction('welcome_offer_sent','rider',…)` L11182; **if `offerId==='cash10'` → `creditRiderWallet(riderId, 10, 'Welcome offer — instant cashback', false)`** (real balance mutation, L11184); `sendSystemEmail(riderId, offerTitle, …, 'promo')` L11185; success toast after a 120 ms `setTimeout` L11186–L11188 | `DB.auditLog`; `DB.riders[id].wallet` (cash10 only); `DB.emailOutbox` | **`requirePerm('contact_users')`** L11178 | yes — `welcome_offer_sent` | no extra confirm |
| *(name click, watchlist)* L6993 | `openProfile(id)` L8827 | Navigates to `p-profile` | `navStack` (push) | none | none | no |
| `🎁 Send retention offer` L6995 | `sendRetentionOfferToRider(riderId)` L6999 | `sendSystemEmail(riderId,'A little something before you go 🎁', …,'promo')` L7001; `logAction('retention_action','rider',…)` L7002; toast `✅ Retention offer sent to {name} — check Settings → Email Log` L7003 | `DB.emailOutbox`; `DB.auditLog` | **none** | yes — `retention_action` | **yes** — `GATE_SWEEP.sendRetentionOfferToRider` L20859, `d:true` (permission is still **none**) |
| *(risk filter change)* L919 | `renderRidersTable()` | Re-renders tbody + subtitle + watchlist | none | none | none | no |
| *(rider name click, table)* L6423 | `openProfile(id)` | Navigates to `p-profile` | `navStack` | none | none | no |
| `View 360°` L6433 | `openProfile(id)` | Same | `navStack` | none | none | no |
| `↻ Renew` (only when `hasSub`) L6433 | `openRenewFlow(id)` L11277 | `flowRider = resolveFlowRider(id)`; `flowSelected = renewOptionsFor(riderCurrentSub(id))[0]`; `renderStep1()`; opens `#modal-overlay`. 3-step wizard: Select plan → Payment → Result | `flowRider`, `flowSelected` globals; DB writes happen at the wizard's commit step (outside this module) | none on open | none on open | the wizard is the confirm path |

**Row click:** `<tr>` elements in `#riders-tbody` carry **no** `onclick` — only the name `<p class="td-name">` and the two action buttons are clickable (L6423, L6433).

---

## 11. Tables & lists

### 11.1 `All riders` — `table.dt` > `tbody#riders-tbody` (L920–L923, rendered L6406–L6438)

**Row source:** `Object.keys(DB.riders)` (L6409), in object-insertion order. **No sort is applied.**
**Filter:** `#riders-risk-filter` value, matched against `riderChurnRisk(rr).level` (L6410–L6411).
**Search:** none over the table.
**Row click:** none (see §10).
**Empty state:** `<tr><td colspan="10">No riders match that risk filter.</td></tr>` (L6435) — emitted when the joined row string is falsy. `colspan` 10 matches the 10 `<th>` in `<thead>` (L921, last one empty).

| # | Header (L921) | Cell content | Source | Line |
|---|---|---|---|---|
| 1 | `Rider ★` | Level pill `★ {rating}` or `★ new` (class from `rr.lvl`); blue clickable name; then `{id} · {phone}` | `rr.lvl`, `rr.rating`, `rr.name`, `id`, `rr.phone` | L6423 |
| 2 | `Current plan` | If `subs[]` non-empty: `DB.subscriptions[subs[0]].plan.split(' ')[0]` — **first word only**, e.g. `Weekly`. Else `<span class="b b-purple">Quick-ride only</span>` | `DB.subscriptions` | L6416, L6424 |
| 3 | `Vehicle` | `Comfort` if `subRec.plan` contains `'Comfort'`, else `Economy`; badge `b-com` / `b-eco`. **Riders with no sub are shown `Economy`** (a default, not a real value) | `DB.subscriptions[…].plan` | L6417–L6418, L6425 |
| 4 | `Health` | `riderHealth(rr)` — see §5.5 | `rr.complaints`, `rr.rating` | L6426 |
| 5 | `Subs total` | `rr.subs ? rr.subs.length : 0` | `rr.subs` | L6427 |
| 6 | `Renewal rate` | `st.renewalRate \|\| '—'`; `var(--green)` when present and not `'—'`, else `var(--ghost)` | `rr.stats.renewalRate` — **stored string, never computed** | L6428 |
| 7 | `LTV` | `riderLTV(rr).toFixed(2)+' SAR'` | computed from `rr.payments` | L6429 |
| 8 | `Churn risk` | `risk.level` in badge `b-red`/`b-amber`/`b-green` | computed | L6421–L6422, L6430 |
| 9 | `Status` | `hasSub ? Active (b-green) : On-demand (b-purple)` — **based purely on `subs[]` being non-empty, ignoring the subscription's real status and ignoring `rr.suspended`** | `rr.subs` | L6431 |
| 10 | *(blank)* | `div.ra` with `View 360°` (always) and `↻ Renew` (only when `hasSub`) | — | L6433 |

**Level-pill class map (L6420):** `gold`→`b-gold`, `silver`→`b-silver`, `new`→`b-grey`, **anything else → `b-red`**. (`lvlBadge()` at L3260 maps unknowns to `b-grey`/`Standard` instead — the two disagree.)

Side effects of `renderRidersTable()`: rewrites the page subtitle (L6436) and calls `renderRetentionWatchlist()` (L6437).

### 11.2 `✨ New sign-ups` — `div#new-riders-list` (L912, rendered L11136–L11152)

Not a `<table>` — a stack of flex rows, scroll-capped at `max-height:320px` (L912).
**Row source:** `DB.newRiders` array order (no sort, no filter, no cap).
**Row click:** name only → `openNewRiderProfile`.
**Row actions:** `View`, `Send welcome offer`.
**Empty state:** L11139.
**Separator:** `border-bottom:.5px solid #F2F1EE` on every row including the last (L11141).

### 11.3 `⚠ Retention watchlist` — `div#retention-watchlist` (L916, rendered L6980–L6998)

Flex rows, top-5 by LTV descending among non-Low-risk riders with `ltv > 0`. See §8.3.

---

## 12. Profile sections & cards

*Not applicable to this doc — see `09b-360-profile-system.md` §12.*

---

## 13. Modals opened

### 13.1 Welcome offer — `welcomeRider(id)` L11159–L11176

* **Lookup:** `DB.newRiders.find(x => x.id === id) || DB.riders[id]` (L11160) — the same modal serves both the sign-ups card and the profile's `🎁 Send offer` button (L4110).
* **Title:** `Send welcome offer — {r.name}` (L11170)
* **Body:** four `div.plan-option` radio cards, first pre-selected (`selected` class + `checked`), each `onclick="selDriver(this)"` (L11168):

| `data-offer-id` | Title | Sub | Cost column |
|---|---|---|---|
| `free1` | `🎁 Free first ride` | `Up to 25 SAR off — single use` | `~25 SAR` |
| `pct20` | `20% off first 3 rides` | `Capped at 15 SAR per ride` | `~45 SAR` |
| `cash10` | `10 SAR instant cashback` | `Credited to wallet now` | `10 SAR` |
| `sub50` | `50% off first subscription` | `Weekly or bi-weekly plan` | `~43 SAR` |

  All four rows are **hardcoded literals** (L11162–L11167) — not read from `DB.plans`, `DB.promos` or any config.
* **Footer:** `Cancel` → `closeModal()`; `Send offer` → `confirmWelcomeOffer(r.id, r.name)` (L11175).
* **Commit behaviour:** see §10. Only `cash10` has a real financial effect.

### 13.2 Renew / Upgrade wizard — `openRenewFlow(riderId)` L11277–L11283

Opened from the table's `↻ Renew` button (L6433) and from the profile's `↻ Renew / Upgrade` (L4110). Step 1 (`renderStep1()`, L11301) builds four options from `renewOptionsFor(sub)` (L11249–L11275) using real `PLANS` pricing (L4406–L4410) and the rider's current cadence/vehicle: `same`, `biweekly` (`Save 5%`), `vehicle` (opposite tier, `Premium`), `monthly` (`Save 10%`). The "Keep same driver?" toggle at L11319 is **decorative** — no `onchange`, no id. The full wizard belongs to the Subscriptions/Renewal module.

### 13.3 Modals reachable only via the profile

`openWalletAdjustModal` (L3961), `openFlagAccountModal` (L9007), `openSuspendAccountModal` (L9058), `openSupportTicket` (L2542), `priorityCall` (L9149) — documented in `09b` §13.

---

## 14. States & badges

| Badge / marker | Class | Exact trigger | Line |
|---|---|---|---|
| `★ {rating}` gold pill | `b-gold` | `rr.lvl === 'gold'` | L6420, L6423 |
| `★ {rating}` silver pill | `b-silver` | `rr.lvl === 'silver'` | L6420 |
| `★ new` grey pill | `b-grey` | `rr.lvl === 'new'`; text becomes `★ new` whenever `rr.rating` is falsy (incl. `0`) | L6420, L6423 |
| red level pill | `b-red` | `rr.lvl` is anything else (e.g. `'standard'`) — **fallback, likely unintended** | L6420 |
| `Quick-ride only` | `b-purple` | `!rr.subs \|\| !rr.subs.length` | L6424 |
| `Comfort` | `b-com` | `subRec.plan.indexOf('Comfort') >= 0` | L6417–L6418 |
| `Economy` | `b-eco` | otherwise (**including no subscription at all**) | L6417–L6418 |
| `{n} complaint(s)` | `health h-red` | `rr.complaints && rr.complaints.length` | L6402 |
| `Watch` | `health h-amber` | `rr.rating && rr.rating < 4` | L6403 |
| `Healthy` | `health h-green` | neither of the above (incl. `rating === 0`) | L6404 |
| `High` churn | `b-red` | `riderChurnRisk().score >= 4` | L4062, L6422 |
| `Medium` churn | `b-amber` | `score >= 2 && score < 4` | L4062, L6422 |
| `Low` churn | `b-green` | `score < 2` | L4062, L6422 |
| `Active` status | `b-green` | `rr.subs.length > 0` (any status) | L6431 |
| `On-demand` status | `b-purple` | `rr.subs` empty | L6431 |
| `New` (sign-ups card) | `b-blue` | unconditional on every `DB.newRiders` row | L11144 |
| Watchlist `High` | `b-red` | `risk.level === 'High'` | L6991 |
| Watchlist `Medium` | `b-amber` | `risk.level !== 'High'` (Low is filtered out) | L6991 |
| `#new-riders-count` | `b-blue` | **static `3`** | L911 |

Notably **absent** from the riders table: no `🚩 Flagged` badge and no `🚫 Suspended` badge, even though `commitFlagAccount`/`commitSuspendAccount` call `renderRidersTable()` afterwards (L9039, L9096) and the flag modal's own copy promises the flag is *"visible to the whole team on their profile and in the Riders table"* (L9013). The drivers table renders both (L6397). See §18.

---

## 15. Cross-module links

| From | To | Mechanism | Line |
|---|---|---|---|
| Riders table / watchlist / sign-ups | 360° Profile (`p-profile`) | `openProfile(id)` | L6423, L6433, L6993, L11157 |
| Header search | any of 6 entity profiles | `globalSearch` → `resolveId` → `openProfile` | L909, L3277 |
| Riders table | Renewal wizard (Subscriptions) | `openRenewFlow(id)` | L6433 |
| Welcome offer `cash10` | Rider Wallets (`rwallets`) | `creditRiderWallet` → visible in `renderRiderWalletsList()` | L11184, L4010 |
| Welcome / retention offers | Settings → Email Log | `sendSystemEmail(..., 'promo')` → `DB.emailOutbox` | L11185, L7001 |
| All gated actions | Activity log (`audit-log`) | `logAction` → `DB.auditLog` | L3133 |
| Corporate Accounts | Riders analytics | `corpTotalSpend` / `corpPolicyViolations` reuse `riderLTV`, `riderTenureMonths` | L6451, L6552 |
| Push/broadcast segments | Riders analytics | segment `high_risk_riders` = `riderChurnRisk().level==='High'`; label `High churn-risk riders` (L7710) | L7687, L7724 |
| PDPL erasure queue | Riders table + `Erased (PDPL)` KPI | `executeErasure` sets `r.erased` then `renderRidersTable()` | L16022, L16033 |
| Rider tier automation | Riders page | toast action `go('riders',null)` | L13658 |
| Drivers page | shares `renderSupplyKpis()` | same function fills `#supply-kpis` there | L8791 |

---

## 16. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `span#new-riders-count` = `3` | L911 | **Static HTML; no JS writes this id.** Will read `3` forever, even if `DB.newRiders` changes |
| `subs.riders = '284 registered riders'` | L2169 | Topbar subtitle. The seed DB has **10** riders. Pure demo copy |
| `subs.profile = 'Unified entity view'` | L2169 | Static (overwritten by `openProfile` to the entity id, L8835) |
| Search placeholder `Search RDR-id or name…` | L909 | Implies rider-only; the handler searches all six buckets |
| Card sub-copy `Registered in the last 24–48 hours` | L911 | Not derived from any date |
| Empty state `No new sign-ups in the last 48 hours.` | L11139 | Same |
| `EYVAR_TODAY = new Date(2026,5,25)` | L11232 | Frozen "today" for the whole dataset; drives tenure |
| All 10 `DB.riders` records | L2593–L2637 | Seed fixtures |
| All 3 `DB.newRiders` records | L2744–L2748 | Seed fixtures; ids `RDR-3001…3003` |
| `stats.renewalRate` strings (`'100%'`, `'—'`, `'30%'`, `'91%'`, `'25%'`, `'93%'`, `'85%'`) | L2597 ff. | **Never computed anywhere in the file.** Display-only |
| `stats.totalTrips` / `stats.totalPaid` | L2597 ff. | Deliberately divergent "billing aggregate"; `reconcileEntity` exists to surface the divergence |
| Four welcome-offer definitions | L11162–L11167 | Titles, sub-copy and cost estimates are literals |
| `cash10` credit amount `10` | L11184 | Hardcoded, not read from the offer's `cost` field |
| Retention email subject/body | L7001 | Literal string |
| Watchlist `slice(0,5)` cap | L6989 | Magic number |
| `AV_COLORS` (6 hex) / `PHOTO_GRADS` (5 gradients) | L10834 / L10835 | Avatar palettes, indexed by `name.length % n` |
| `RIDER_NAMES` alias map | L11221 | `{nora, omar, sara, mohammed, khaled, reem}` → ids; demo shortcut for `openRenewFlow` |
| `flowRider = 'RDR-1041'` default; `openRenewFlow(rider \|\| 'RDR-1041')` | L11276, L11278 | Falls back to a specific seed rider |
| `PLANS` price table | L4406–L4410 | `weekly {5 trips, eco 86.50, comfort 122.50}`, `biweekly {10, 164.35, 232.50}`, `monthly {22, 344.52, 487.00}` |
| Card border colours `#9DC0E5`, `#E0A0A0` | L910, L914 | Literal hex, not CSS vars |
| Row separator `#F2F1EE` | L6992, L11141 | Literal hex |

---

## 17. i18n keys

| Key | Element | Line | Arabic value |
|---|---|---|---|
| `nav.riders` | sidebar label | L513 | `الركاب` (L7907) |

**That is the only i18n key in this module.** Nothing inside `p-riders` carries `data-i18n`: the `Riders` H1, the search placeholder, both card headings, the risk-filter options, all 10 table headers, the KPI labels, every badge string, both empty states, and all button labels are untranslated English literals. Confirmed by inspecting L907–L925 and the render functions L6406–L6438, L11136–L11152, L6980–L6998, L21212–L21221.

---

## 18. Gaps, dead code, UNVERIFIED items

**Dead code**

1. **`getReferralCode(riderId)` (L3854–L3859) is never called.** Grep for `getReferralCode(` returns exactly one hit — the definition. The lazily-generated `r.referralCode` (first 4 alpha chars of the first name, uppercased, + last 4 digits of the id; fallback prefix `'RIDR'`) is therefore never produced or displayed anywhere. `processReferral()` (L3860) works entirely off explicit rider ids picked in the UI, not off a code.
2. **`avatarOrInitials(u,size)` (L2915–L2919) is not used by the Riders module.** Its only caller is `renderMaProfile()` (L2929, My Account). It reads `u.photo`; riders use `hasPhoto`. The Riders module uses `avatarHTML(name,size,hasPhoto)` (L10836) instead.
3. **`rider.referredBy` (L3871) is written but never read or rendered.**
4. **`rider.driverGenderPref`** is read by dispatch (L4587, L5676) but never surfaced on the Riders page or in `buildEntityProfile`.

**Counting / correctness defects**

5. **KPI tiles 2 and 3 count the wrong thing.** `fleetCounts().riders.withSub` (L20937) counts *subscriptions* matching `/active|expiring/i`, not riders. `quickOnly` (L20938) then subtracts that subscription count from the rider count. A rider with two active subs would be double-counted, and `quickOnly` can go negative.
6. **Two contradictory page subtitles** (§7.2). `renderRidersTable()` uses `subs[].length > 0`; `liveSubtitles()` uses the active/expiring subscription count. At boot `liveSubtitles()` (L21403) runs after `renderRidersTable()` (L14582), so the `fleetCounts` version normally survives — until any flag/suspend/erasure action re-renders the table and swaps it back.
7. **`Status` column ignores suspension and subscription status** (L6431): a rider whose only subscription is `Cancelled` still reads `Active`; a suspended rider shows no indication.
8. **No flag/suspend badge in the riders table**, despite `commitFlagAccount`'s own modal copy promising one (L9013) and despite the re-render calls at L9039/L9096. The Drivers table renders both (L6397).
9. **`Vehicle` column defaults to `Economy` for subscription-less riders** (L6417) — a fabricated value presented identically to a real one.
10. **`riderLTV`'s `parseFloat(p.amount)` (L4035) does not strip thousands separators.** A payment amount of `'1,040.00 SAR'` would contribute `1`. (`numOf()` at L18507 *does* strip them, so the two paths would disagree.) No seed payment has a comma, so the bug is latent.
11. **`riderTenureMonths` cannot parse `DB.newRiders[].joined`** (`'25 Jun · today'`): `parts[0] === '25'`, `monthNames.indexOf('25') === -1` → returns `1`. Promoted new riders (L11156 copies `joined:r.joined`) therefore always show `Tenure 1 mo`.
12. **`openNewRiderProfile()` drops fields on promotion** (L11156): it copies `id, name, phone, dob, nid, address, city` but omits `gender`, `hasPhoto`, `device`, `appLang`, `lastIp`, `ipLocation`, `movementLog` — all of which exist on the `DB.newRiders` record and are all rendered by `buildEntityProfile` (as `—`, `No location history recorded yet.`, etc.). It also never removes the entry from `DB.newRiders`, so the rider stays in the "new sign-ups" card permanently and is double-counted (once in `DB.newRiders.length` for the `new (24h)` subtitle segment, once in `Object.keys(DB.riders).length`).
13. **`dob` and `nid` are stored on riders but rendered nowhere.** The rider Personal-information card (L4141–L4145) shows only Gender, Registered address, City.
14. **`riderHealth` treats `rating: 0` as healthy** (L6403, `rr.rating &&`), while `riderChurnRisk` treats it as `< 4` and scores +1 (L4061). The two disagree on the same rider.
15. **`riderChurnRisk`'s variable named `activeSubs` holds *all* subs**, not active ones (L4051). A rider whose only sub is `Cancelled` gets +2 from rule 3 but **not** +1 from rule 1, because `activeSubs.length !== 0`.
16. **`riderLTV` walks `d.payments[]` only**, while `entityDerived()` (L18499) scans `DB.payments` by `entity`. A payment recorded against a rider but not appended to their `payments[]` array is counted by the profile's "in panel records" sub-line but not by LTV.

**Missing affordances**

17. No column sorting, no table search, no pagination, no bulk action, no CSV export on this page.
18. Rider KPI tiles are not clickable (contrast the Drivers page's `supplyKpiHTML`, L21191).
19. `Send retention offer` (L6995) fires a real email with **no permission gate**, unlike `confirmWelcomeOffer` which requires `contact_users` (L11178). It *is* confirm-gated (`GATE_SWEEP.sendRetentionOfferToRider` L20859, `d:true`) — but a confirmation dialog is a UX control, not an authorisation check, so any signed-in operator can still send it.
20. `initCardToggles()` is never called for this page, so the three cards cannot be collapsed.

**UNVERIFIED**

21. **Runtime rendering not executed.** All findings come from static reading of `eyvar_ops_panel_v40_fixed.html`; the page was not loaded in a browser. Any behaviour depending on load order beyond what is written at L14556–L14600 and L21390–L21410 is inferred from source order, not observed.
22. **`selDriver(this)`** — the click handler on each welcome-offer row (L11168) was not read in this pass; its exact selection mechanics (which element receives `.selected`) are inferred from `confirmWelcomeOffer`'s selector `#modal-box .plan-option.selected` (L11179). **UNVERIFIED**.
23. **`sendSystemEmail` / `logGoodwill` / `compCheck`** bodies were not fully read; their effects are cited from call sites and from `creditRiderWallet` (L3932–L3941). **Partially UNVERIFIED**.
24. **`can(permKey)`** (used by `requirePerm`, L3127) — the permission-resolution logic and which roles hold `contact_users` were not read. The `contact_users` description is *"Call or message a rider or driver directly from their profile."* (L3255). **UNVERIFIED** which roles pass.
25. Whether any **CSS rule** hides or restyles elements on this page (e.g. `.health`, `.b-com`, `.ra`) was not audited — only class names are reported. **UNVERIFIED**.

---

## 19. Line-number index

| Item | Lines |
|---|---|
| Sidebar entry (`nav.riders`) | 513 |
| `p-riders` page markup | 907–925 |
| — `#rider-kpis-anchor` | 908 |
| — page header + search input | 909 |
| — New sign-ups card / `#new-riders-list` | 910–913 / 912 |
| — Retention watchlist card / `#retention-watchlist` | 914–917 / 916 |
| — All riders card / `#riders-risk-filter` / thead / `#riders-tbody` | 918–924 / 919 / 921 / 922 |
| `titles` / `subs` maps | 2168 / 2169 |
| `openSupportTicket` / `createTicketFor` | 2542–2551 / 2552–2559 |
| `DB.riders` seed | 2593–2637 |
| `DB.newRiders` seed | 2744–2748 |
| `avatarOrInitials` | 2915–2919 |
| `requirePerm` / `logAction` | 3126–3132 / 3133–3155 |
| `PERMISSION_LABELS.contact_users` | 3255 |
| `lvlBadge` / `rstar` | 3260–3263 / 3264 |
| `resolveId` / `globalSearch` / `rowLink` | 3266–3275 / 3277–3281 / 3283 |
| `kvCard` / `nm2` | 3560–3565 / 3566 |
| `tripsTable` / `statusBadge` / `payTable` / `cmpTable` | 3698–3729 / 3730–3736 / 3737–3754 / 3755–3763 |
| LTV/churn section comment | 3765–3775 |
| `getUserConsent` / `isConsentCurrent` | 3783–3796 / 3797–3800 |
| `getReferralCode` (**dead**) / `processReferral` | 3854–3859 / 3860–3877 |
| `getRiderWallet` / `creditRiderWallet` / `debitRiderWallet` | 3928–3931 / 3932–3941 / 3942–3950 |
| `walletCardHTML` / `openWalletAdjustModal` / `commitWalletAdjust` | 3951–3960 / 3961–3977 / 3978–4009 |
| `renderRiderWalletsList` | 4010–4030 |
| **`riderLTV`** | **4031–4037** |
| **`riderTenureMonths`** | **4038–4047** |
| **`riderChurnRisk`** | **4048–4064** |
| **`customerValueCardHTML`** | **4065–4082** |
| **`buildEntityProfile`** | **4083–4197** |
| `PLANS` price table | 4406–4410 |
| `buildLocationHistoryCard` / `bankCardHTML` | 6283–6293 / 6294–… |
| `riderVehicleTier` / `corpPolicyViolations` | 6542–6546 / 6547–6569 |
| **`riderHealth`** | **6401–6405** |
| **`renderRidersTable`** | **6406–6438** |
| `corpTotalSpend` | 6450–6452 |
| **`renderRetentionWatchlist`** | **6980–6998** |
| `sendRetentionOfferToRider` | 6999–7004 |
| `updateBackBtn` / `pushHistory` / `goBack` | 7005 / 7006 / 7012–7020 |
| `broadcastAudience` (`high_risk_riders`) | 7679–7688 |
| `PUSH_AUDIENCE_LABEL` | 7710 |
| Arabic `nav.riders` | 7907 |
| `go()` riders hook | 8792 |
| `openProfile` | 8827–8861 |
| flag / unflag / suspend / reinstate | 9007–9041 / 9042–9053 / 9058–9098 / 9099–9110 |
| `priorityCall` | 9149–9161 |
| `initCardToggles` | 9368 |
| `AV_COLORS` / `PHOTO_GRADS` / `avatarHTML` | 10834 / 10835 / 10836–10845 |
| **`renderNewRiders`** | **11136–11152** |
| `openNewRiderProfile` | 11153–11158 |
| **`welcomeRider`** | **11159–11176** |
| `confirmWelcomeOffer` | 11177–11190 |
| `RIDER_NAMES` / `resolveFlowRider` / `riderCurrentSub` | 11221 / 11222–11225 / 11226–11230 |
| `CADENCE_DAYS` / `EYVAR_TODAY` | 11231 / 11232 |
| `renewOptionsFor` / `openRenewFlow` / `renderStep1` | 11249–11275 / 11277–11283 / 11301–11330 |
| Corp policy quick-ride check | 12425–12441 |
| Tier-automation toast → `go('riders')` | 13658 |
| Boot: `renderNewRiders()` / `renderRidersTable()` | 14564 / 14582 |
| `executeErasure` | 16014–16035 |
| `entityDerived` / `numOf` / `reconcileEntity` (base) | 18495–18506 / 18507–18511 / 18515–18531 |
| `provenanceChip` / `reconcileBannerHTML` | 18532–18536 / 18537–… |
| `ensureHistory` / `buildRiderHistory` | 18680–18683 / 18686–… |
| `riderNoShowCount` / `riderNoShowCardHTML` | 19525–19534 / 19535–19547 |
| `DB.dataWindow` / `windowStartMs` / `windowSplit` / `olderInBilling` / `reconcileEntity` (override) / `windowNoteHTML` / `fetchFullHistory` | 20403–20410 / 20411 / 20415–20425 / 20429–20436 / 20442–20455 / 20458–20470 / 20472–20482 |
| `GATE_SWEEP` exclusion note | 20889–20897 |
| `fleetCounts` | 20918–20942 |
| `supplyKpiHTML` | 21188–21211 |
| **`riderKpiHTML`** | **21212–21221** |
| `setDriverFilter` / `renderSupplyKpis` | 21223–21227 / 21228–21233 |
| `liveSubtitles` (riders subtitle at 21246–21247) | 21236–21255 |
| `mountUxBlocks` (mounts `#rider-kpis`) | 21396–21410 |

---

## 20. Seed generator `makeRider()` (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6.1, item P2-8). §16 of this document already records the resulting rider counts; this section names the loop that produces them and states exactly which fields are random.

`makeRider(i)` — **L9800–L9818**, an inner function of `seedMoreRequests()` (**L9787**), which runs from the deferred boot `setTimeout` at **L14557**.

**The loop: `for(var i=0;i<45;i++)makeRider(i);` — L9819. Exactly 45 riders.**

These are *in addition to* the ten hand-authored narrative riders seeded in the `DB` literal (`RDR-1041` L2594, `RDR-2087` L2598, `RDR-2031` L2603, `RDR-2090` L2607, `RDR-2055` L2611, `RDR-1052` L2615, `RDR-1060` L2618, `RDR-1075` L2621, `RDR-1080` L2624, `RDR-1090` L2627). So `DB.riders` holds **55 records** after boot: 10 authored + 45 generated.

### 20.1 The id block

`var id='RDR-'+(4100+i);` — **L9803**. With `i` running 0–44 this yields **`RDR-4100` … `RDR-4144`**, a contiguous block that cannot collide with any of the ten authored ids (all in the 1041–2090 range). Generated ids are also collected into `newRiderIds` (L9799, pushed L9816), which is the pool `randRider()` draws from (L9829) when `pushRide` and `pushSub` attach a rider to a seeded request.

**Consequence:** every seeded ride request and subscription request points at a *generated* rider, never at one of the ten narrative riders. A demo walkthrough that opens a request and follows it to a rider profile always lands on an `RDR-41xx` record.

### 20.2 Every field, and whether it is random

| Field | Value | Random? | Line |
|---|---|---|---:|
| `id` | `'RDR-'+(4100+i)` | deterministic | L9803 |
| `name` | `pick(isF?firstF:firstM)+' '+pick(last)` where `isF=Math.random()<0.42` | **yes** — ~42 % female | L9801–L9802 |
| `phone` | `'+966 5'+d+' '+ddd+' '+dddd` — three independent random runs | **yes** | L9808 |
| `rating` | `isNew?0:Math.round((3.4+Math.random()*1.6)*10)/10` → **0, or 3.4–5.0 to one decimal** | **yes** | L9805 |
| `lvl` | derived: `isNew?'new':(rating>=4.7?'gold':rating>=4?'silver':'standard')` | derived | L9806 |
| `joined` | `pick(['Jan'…'Jun'])+' 2026'` | **yes** | L9795, L9807, L9809 |
| `hasPhoto` | `Math.random()<0.55` — ~55 % | **yes** | L9809 |
| `gender` | `isF?'Female':'Male'` — consistent with the name | derived | L9809 |
| `address` | `pick(districts)+' District, Riyadh'` | **yes** | L9810 |
| `city` | `'Riyadh'` | constant | L9810 |
| `device` | `pick(devices)` | **yes** | L9810 |
| `appLang` | `'Arabic'` | **constant — every generated rider is Arabic** | L9810 |
| `lastIp` | four random octets, first in **37–186** | **yes** | L9811 |
| `mapPos` | `{x: 15–84, y: 10–79}` (floored) | **yes** | L9812 |
| `ipLocation` | `'Riyadh, SA'` | constant | L9812 |
| `movementLog` | one entry: `{date:'<joinMonth> 2026', action:'Account registered', location:'Riyadh, SA'}` | derived | L9813 |
| `subs` / `trips` / `payments` / `complaints` | `[]` — **all empty** | constant | L9814 |
| `stats.totalTrips` | `floor(random()*40)` → 0–39 | **yes** | L9815 |
| `stats.totalPaid` | `(random()*1800).toFixed(2)+' SAR'` — **a string with a unit**, not a number | **yes** | L9815 |
| `stats.renewalRate` | `isNew?'—':floor(random()*100)+'%'` — **a string** | **yes** | L9815 |
| `stats.quickRides` | `floor(random()*20)` → 0–19 | **yes** | L9815 |

`isNew=Math.random()<0.18` (**L9804**) is the master switch: roughly **18 %** of generated riders get `rating:0`, `lvl:'new'` and `renewalRate:'—'`.

The `pick(arr)` helper is `arr[Math.floor(Math.random()*arr.length)]` (**L9796**), used nine times per rider.

### 20.3 Fields the ten authored riders have that generated riders do not

| Field | Authored example | Generated |
|---|---|---|
| `driverGenderPref` | `'female'` on `RDR-1041` (L2594) | **absent** — so `eligibleDrivers` never applies a gender preference to a generated rider (`genderPref` resolves to `null`, L5676) |
| `wallet` | seeded object on `RDR-1041` (L2594) | **absent** — materialised lazily on first `getRiderWallet()` read (see `12c-rider-wallets.md` §4.1) |
| `email` | absent on both | — |
| `suspended` | absent on both | — |

The missing `driverGenderPref` is the one with visible consequences: the *"🙋 This rider prefers a **female** driver"* banner in the New-subscription modal (L4587) and the green *"✓ Matches rider's driver-gender preference"* tag (L5734) can only ever appear for the authored riders.

### 20.4 Consequences for anything reading these records

- **`stats.totalPaid` and `stats.renewalRate` are strings, not numbers** (L9815). Any aggregate that sums `totalPaid` across riders must strip `' SAR'` first. `stats.totalTrips` and `stats.quickRides` *are* numbers.
- **`subs`, `trips`, `payments` and `complaints` are all empty** (L9814), while `stats.totalTrips` claims up to 39 trips. The summary and the detail contradict each other by construction: a generated rider's profile shows a trip count with no trips behind it.
- **`movementLog` has exactly one entry** (L9813), so the movement timeline on a generated rider's 360° profile is always a single "Account registered" row.
- **Every generated rider is `appLang:'Arabic'`** (L9810). Any language-mix statistic computed over `DB.riders` is skewed by 45 records to one value.
- **Nothing is seeded**: `Math.random()` is used directly with no PRNG seed, so **every page load produces different riders**. Names, ratings, IPs, map positions and stats all change on refresh. Two screenshots of the same screen taken minutes apart will not match, and no test can assert on a specific generated rider.
- `makeRider` has **2 references**: the declaration (L9800) and the loop (L9819).

### 20.5 Sibling generators

`pushRide` (L9837–L9845) and `pushSub` (L9854–L9865) live in the same function and consume `newRiderIds` via `randRider()` (L9829). They are documented in `06b-quick-rides-and-ride-requests.md` §19 and `07c-requests.md` §20 respectively.

### 20.6 Line-number index for §20

| Symbol | Lines |
|---|---|
| Authored riders `RDR-1041` … `RDR-1090` | 2594, 2598, 2603, 2607, 2611, 2615, 2618, 2621, 2624, 2627 |
| `seedMoreRequests()` | 9787–9869 |
| `months` array | 9795 |
| `pick(arr)` | 9796 |
| `pad(n)` | 9797 |
| `newRiderIds` | 9799 |
| **`makeRider(i)`** | **9800–9818** |
| — `isF` (42 % female) | 9801 |
| — id block `RDR-4100…4144` | 9803 |
| — `isNew` (18 %) | 9804 |
| — rating | 9805 |
| — `lvl` derivation | 9806 |
| — phone / photo / gender | 9808–9809 |
| — address / device / `appLang` | 9810 |
| — `lastIp` | 9811 |
| — `mapPos` | 9812 |
| — `movementLog` | 9813 |
| — empty relation arrays | 9814 |
| — `stats` | 9815 |
| — push to `newRiderIds` | 9816 |
| **45-rider loop** | **9819** |
| `randRider()` | 9829 |
| `pushRide()` (see `06b` §19) | 9837–9845 |
| `pushSub()` (see `07c` §20) | 9854–9865 |
| Boot `seedMoreRequests()` | 14557 |
