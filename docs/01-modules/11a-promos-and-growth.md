# Module: Promos & Growth

> Source: `eyvar_ops_panel_v40_fixed.html` | Page id: `growth` (container `#p-growth`) | HTML lines: **L1263–L1301**

---

## 1. Purpose

A single scrolling page bundling six unrelated growth surfaces under one nav item (`L1263` comment: *"PAGE: GROWTH (promo codes + messaging + cohorts + CSAT + incentives)"*):

| # | Card | Container id | HTML | Renderer |
|---|---|---|---|---|
| 1 | 🎟️ Promo campaigns | `#promo-list` | `L1269-1272` | `renderPromoList()` `L13506` |
| 2 | 🎁 Referral program | (5 sub-containers) | `L1273-1288` | `renderReferralProgram()` `L3877` |
| 3 | 🏆 Driver incentive rules | `#incentive-list` | `L1289-1292` | `renderIncentives()` `L13664` |
| 4 | 📣 Bulk messaging | `#bulk-msg-body` | `L1293-1296` | `renderBulkMsg()` `L13740` |
| 5 | 📊 Retention cohorts | `#cohort-body` | `L1297-1298` | `renderCohorts()` `L13762` |
| 6 | 💬 CSAT / NPS | `#csat-body` | `L1297,1299` | `renderCsat()` `L13786` |

Page header: `<h1>📈 Promos &amp; growth</h1>` + sub-line *"Promo campaigns, driver incentives, bulk messaging, retention & satisfaction"* (`L1266`).

**Critical framing:** cards 1, 5 and 6 are display-only over static data. There is **no promo redemption engine** anywhere in the file — see §16 and §18.

---

## 2. Entry points & routing

| Item | Detail | Line |
|---|---|---|
| Page container | `<div class="page" id="p-growth">` | `L1264` |
| Sidebar section label | `<div class="sb-sec-lbl" data-i18n="sec.growth">Growth</div>` | `L521` |
| Sidebar nav item | `<div class="sb-item" onclick="go('growth',this)">` … `<span class="sb-lbl" data-i18n="nav.growth">Promos &amp; growth</span>` | `L522` |
| Sidebar badge | **None.** The growth nav item has no `sb-badge` element (contrast Zones, `L523`). | `L522` |
| Router hook | `if(id==='growth'){renderGrowthPage();renderReferralProgram();}` inside `window.go` | `L8799` (fn `L8774`) |
| Toolbar title | `titles.growth='Promos & Growth'` → `#tb-title` | `L2168`, `L8785` |
| Toolbar subtitle | `subs.growth='Promo codes, incentives, messaging, retention'` → `#tb-sub` | `L2169`, `L8786` |
| `renderGrowthPage()` | `L14386-14388`. Body: `renderPromoList();renderIncentives();renderBulkMsg();renderCohorts();renderCsat();` — note it does **not** call `renderReferralProgram()`; the router calls that separately. | `L14386` |
| Boot behaviour | Neither `renderGrowthPage()` nor `renderReferralProgram()` appears in the boot `setTimeout` block (`L14556-14600`). **All six cards are empty until the user first navigates to the page.** | `L14556-14600` |
| Page-level view gate | **None.** `go('growth',…)` performs no `can()`/`canPage()` check; the page is reachable by any operator. Gating is per-action only (§10). | `L8799` |
| Nav history | `go()` calls `pushHistory()` unless `isBack` | `L8779` |

### Call chain

```
go('growth')                                    L8774 / L8799
├── renderGrowthPage()                          L14386
│   ├── renderPromoList()                       L13506
│   │   └── promoROI(p)                         L13501
│   ├── renderIncentives()                      L13664
│   │   ├── incentiveEarnedCount(id)            L13662
│   │   └── incentiveTotalPaid(id)              L13663
│   ├── renderBulkMsg()                         L13740   (reads MSG_SEGMENTS L13733)
│   ├── renderCohorts()                         L13762   (hardcoded array, L13764-13770)
│   └── renderCsat()                            L13786   (fully hardcoded HTML)
└── renderReferralProgram()                     L3877
    ├── reads DB.referralConfig                 L13855
    ├── reads DB.referralLog                    L13888
    └── nm2(id)                                 L3565
```

Background recalculation touching this module (runs regardless of current page):

```
tick engine                                     L12622-12623
├── recalcDriverTiers()                         L13602  → renderIncentives() if defined (L13629)
└── recalcRiderTiers()                          L13645
recalcDriverTiers(true) also fired from:        L12463 (rating changed), L15618 (rating voided)
```

---

## 3. Layout map

```
#p-growth                                                        L1264
├── .ph  header                                                  L1265-1268
│   ├── .ph-l  h1 "📈 Promos & growth" + sub-line                L1266
│   └── .br    [+ New promo campaign] → openNewPromo()           L1267
├── .card  "🎟️ Promo campaigns" · note "Auto-pauses when
│           budget is exhausted"                                 L1269-1272
│   └── #promo-list  (max-height 400px, scroll-y)                L1271
├── .card  "🎁 Referral program" · [+ Process a referral]        L1273-1288
│   ├── config strip  (checkbox + 2 number fields + Save btn)    L1275-1282
│   ├── .g3 #ref-kpis  (3 KPI tiles)                             L1283
│   ├── label "Top referrers"                                    L1284
│   ├── #ref-leaderboard                                         L1285
│   ├── label "Referral log"                                     L1286
│   └── table.dt  thead static, tbody #ref-log-tbody             L1287
├── .card  "🏆 Driver incentive rules"                           L1289-1292
│   └── #incentive-list  (max-height 320px, scroll-y)            L1291
├── .card  "📣 Bulk messaging" · note "Send to a segment,
│           not one by one"                                      L1293-1296
│   └── #bulk-msg-body                                           L1295
└── grid 1fr 1fr                                                 L1297-1300
    ├── .card "📊 Retention cohorts" → #cohort-body              L1298
    └── .card "💬 CSAT / NPS" → #csat-body                       L1299
```

---

## 4. Data model & fields

### 4.1 `DB.promos` — array, seeded `L13495-13500`

| Field | Type | Meaning | Written by |
|---|---|---|---|
| `code` | string, uppercase | Campaign code, unique (uniqueness enforced only at create, `L13553`) | `commitNewPromo` `L13554` |
| `discountPct` | number | Discount percent shown in the table. **Never applied to any fare anywhere.** | `commitNewPromo` `L13554` |
| `budget` | number (SAR) | Total campaign budget | `commitNewPromo` `L13555` |
| `spent` | number (SAR) | Budget consumed. Always `0` for new campaigns and **never incremented by any code path** | `commitNewPromo` `L13555` (=0) |
| `uses` | integer | Redemption count. **Never incremented** | `L13555` (=0) |
| `newSubs` | integer | Attributed new subscriptions. **Never incremented** | `L13555` (=0) |
| `perUserLimit` | integer | Max redemptions per rider. **Never enforced** | `L13556` |
| `target` | string (enum, free text) | Eligibility label. **Never enforced** | `L13557` |
| `expires` | `YYYY-MM-DD` string | Expiry date. **Never compared to a clock** | `L13557` |
| `status` | `'active'` \| `'paused'` \| `'exhausted'` \| `'expired'` | Lifecycle state; only `active↔paused` are reachable at runtime | `L13557`, `pausePromo` `L13529`, `resumePromo` `L13530` |

Seed rows (`L13496-13499`) — all four are hardcoded demo data:

| code | discountPct | budget | spent | uses | newSubs | perUserLimit | target | expires | status |
|---|---|---|---|---|---|---|---|---|---|
| `EYVAR30` | 30 | 5000 | 4180 | 214 | 61 | 1 | New riders only | 2026-07-31 | active |
| `BACK2WORK` | 15 | 3000 | 3000 | 180 | 32 | 1 | Lapsed subscribers | 2026-07-15 | exhausted |
| `MONTHLY10` | 10 | 8000 | 1240 | 41 | 38 | 2 | Monthly plan only | 2026-09-01 | active |
| `RAMADAN25` | 25 | 6000 | 5920 | 301 | 88 | 1 | All riders | 2026-04-10 | expired |

### 4.2 `DB.referralConfig` — object, `L13855`

`{enabled:true, referrerBonus:20, refereeBonus:10}` — see §6.

### 4.3 `DB.referralLog` — array, seeded `L13888-13890`

| Field | Type | Source |
|---|---|---|
| `id` | `'REF-'+Date.now()` | `processReferral` `L3870` |
| `referrerId` | rider id | modal selection |
| `refereeId` | rider id | modal selection |
| `referrerBonus` | number (SAR) | snapshot of `cfg.referrerBonus` at processing time |
| `refereeBonus` | number (SAR) | snapshot of `cfg.refereeBonus` at processing time |
| `date` | display string `DD Mon HH:MM` | `fmtReqNowLabel()` `L9645` (demo clock `REQ_NOW_REF`, `L9555`) |

Seed row: `{id:'REF-seed-1', referrerId:'RDR-1041', refereeId:'RDR-1075', referrerBonus:20, refereeBonus:10, date:'18 Jul 09:30'}` (`L13889`) — hardcoded.

### 4.4 Rider fields written by the referral flow

| Field | Set where | Read where |
|---|---|---|
| `rider.referralCode` | `getReferralCode()` `L3857` — lazily generated, then stable | **Nowhere** — `getReferralCode` itself is never called (§18) |
| `rider.referredBy` | `processReferral()` `L3871` | **Nowhere** — dead write (§18) |
| `rider.wallet` | `creditRiderWallet()` `L3932` via referral | Rider Wallets module, profile wallet card `L3951` |

Referral code format (`L3857`): first word of the rider's name → uppercase → strip non-A-Z → first 4 chars (fallback `'RIDR'`), concatenated with the last 4 digits of the rider id.

### 4.5 `DB.incentives` — array, seeded `L13564-13569`

| Field | Type | Notes |
|---|---|---|
| `id` | `'INV-n'` seed / `'INV-'+Date.now()` runtime (`L13718`) | |
| `name` | string | free text |
| `rule` | string | **plain prose, never parsed or evaluated** |
| `reward` | string | **plain prose, not a number** — the actual paid amount is typed by the operator at award time |
| `active` | boolean | toggles the 🏆 Award button |

| id | name | rule | reward | active |
|---|---|---|---|---|
| INV-1 | Perfect package bonus | Complete a package with 0 missed trips | +40 SAR per package | true |
| INV-2 | 5-star streak | Maintain ≥4.8 rating across a full package | +25 SAR | true |
| INV-3 | Gold captain commission | Gold-tier drivers (rating ≥4.7, 90d) | Commission 20% → 17% | true |
| INV-4 | Backup readiness | Serve as backup captain for 3+ subscriptions | +15 SAR/week retainer | false |

### 4.6 `DB.driverBonusLog` — array, seeded `L13895-13898`

`{id, driverId, incentiveId, amount, note, date}` — written by `commitAwardIncentive` `L13708`. Seeds: `BON-seed-1` (DRV-0101, INV-1, 40 SAR, 10 Jul), `BON-seed-2` (DRV-0104, INV-2, 25 SAR, 12 Jul).

### 4.7 `MSG_SEGMENTS` — module-level const, `L13733-13739` (**all hardcoded, no live query**)

| id | label | count |
|---|---|---|
| seg1 | Drivers in a zone | 8 |
| seg2 | Riders with packages expiring ≤3 days | 8 |
| seg3 | Exposed subscriptions (no backup captain) | 5 |
| seg4 | Drivers with documents expiring ≤30 days | 3 |
| seg5 | All active subscribers | 142 |

### 4.8 Driver/rider tier model (`lvl`) — `L13579-13660`

`TIER_RANK={new:0,standard:1,silver:2,gold:3}` (`L13579`).

---

## 5. Business rules & reward/discount formulas — every formula written out

### 5.1 Promo ROI — `promoROI(p)` `L13501-13505`

```
revenue = p.newSubs * 86.50          // 86.50 = hardcoded "avg package ~ weekly economy" (comment L13502)
ROI     = p.spent > 0 ? revenue / p.spent : 0
```
Rendered as `roi.toFixed(1)+'×'` (`L13521`), green when `roi >= 1`, red otherwise (`L13521`). Tooltip: *"Attributed subscription revenue ÷ discount spend"*.
The `86.50` constant equals `PLANS.weekly.eco` (`L4390`) but is **duplicated as a literal**, not read from `PLANS`.

### 5.2 Promo budget burn — `renderPromoList` `L13510`

```
burn%      = p.budget > 0 ? round(p.spent / p.budget * 100) : 0
bar width  = min(100, burn)
bar colour = burn >= 100 ? red : burn >= 80 ? amber : green      (L13517)
```

### 5.3 Promo status lifecycle

| State | Badge | Trigger |
|---|---|---|
| `active` | `b-green` "Active" | set at creation (`L13557`), or `resumePromo` (`L13530`) |
| `paused` | `b-amber` "Paused" | `pausePromo` (`L13529`) — operator only |
| `exhausted` | `b-red` "Budget exhausted" | **seed data only** — no code sets it (`L13512`) |
| `expired` | `b-grey` "Expired" (else-branch) | **seed data only** — no code sets it (`L13512`) |

The card sub-line claims *"Auto-pauses when budget is exhausted"* (`L1270`) and the source comment claims the campaign *"pauses ITSELF the moment the budget is exhausted"* (`L13492`). **No such code exists.** `spent` is never incremented and `status` is never auto-changed. See §18.

### 5.4 Referral reward math — `processReferral(referrerId, refereeId)` `L3860-3876`

```
referrer wallet += DB.referralConfig.referrerBonus     (default 20 SAR)   L3868
referee  wallet += DB.referralConfig.refereeBonus      (default 10 SAR)   L3869
```
Both go through `creditRiderWallet(id, amount, reason, false)` (`L3932`), which:
- `balance = round((balance + amount) * 100) / 100` (`L3936`)
- unshifts a `{id:'WTX-'+Date.now(), type:'credit', amount, reason, date, balanceAfter}` transaction (`L3937`)
- writes an audit entry `wallet_credit` (`L3938`)
- the 4th arg `false` **suppresses** the generic wallet top-up email (`L3939`) — the referral flow sends its own two bespoke emails instead.

Flat amounts. **No tiering, no multiplier, no cap, no expiry on referral rewards.**

### 5.5 Referral qualification rule — `L3861-3867`

Qualification is **entirely manual**. There is no trip/spend threshold. The only preconditions checked, in order:

| # | Guard | Failure message | Line |
|---|---|---|---|
| 1 | `DB.referralConfig` exists **and** `.enabled` is truthy | "Referral program is currently disabled in Settings." | `L3862` |
| 2 | both ids present | "Pick both riders." | `L3863` |
| 3 | `referrerId !== refereeId` | "A rider can't refer themselves." | `L3864` |
| 4 | no existing `referralLog` entry with the same `refereeId` | "This rider has already been credited as someone's referral." | `L3865` |
| 5 | both rider records exist in `DB.riders` | "Rider not found." | `L3867` |

Note: guard 4 caps a **referee** at one referral for life, but places **no cap on how many referees one referrer may bring** — the referrer bonus is unbounded.

### 5.6 Referral fraud / abuse guard

There is **no pre-emptive fraud guard inside `processReferral`**. Abuse detection is **post-hoc and lives in the Fraud & Risk module** (`renderFraudPage` `L5592`):

```
refFlags = DB.referralLog.filter(l =>
   riders[l.referrerId] && riders[l.refereeId] &&
   (  (a.lastIp  && a.lastIp  === b.lastIp)
   || (a.device  && a.device  === b.device) )  )        L5610-5613
```
Rendered into `#fraud-referral-list` (`L663`, `L5614-5620`) with a **"Suspend referee"** button → `quickSuspendFromFraud(refereeId,'false','Referral self-abuse — shared device/IP with referrer')` (`L5618`, handler `L9079`). Fraud KPI: `['Referral self-abuse flags', refFlags.length, 'out of '+DB.referralLog.length+' referrals']` (`L5642`).

The promo table prints a similar claim as **static prose only**: *"🛡️ Fraud guard: 'new riders only' codes are checked against device ID + phone number to block duplicate-account redemption (enforced at the app/backend layer)."* (`L13527`) — no code behind it in this file.

### 5.7 Manual referral processing flow — end to end

```
[+ Process a referral]  (L1274)
  └─ openProcessReferralModal()                              L3907
       renders 2 searchable custom-selects over ALL DB.riders (L3908)
       + a note quoting the current bonus amounts             L3914
  └─ [Process referral] → commitProcessReferral()             L3919
       1. requirePerm('contact_users')                        L3920  → toast '🔒 …' + audit permission_denied on failure (L3126)
       2. read #ref-referrer / #ref-referee values            L3921-3922
       3. result = processReferral(referrer, referee)         L3923
          ├─ 5 validation guards (§5.5)                       L3862-3867
          ├─ creditRiderWallet(referrer, referrerBonus, 'Referral bonus — referred <name>', false)    L3868
          ├─ creditRiderWallet(referee,  refereeBonus,  'Welcome bonus — referred by <name>',  false) L3869
          ├─ DB.referralLog.unshift({...})                    L3870
          ├─ referee.referredBy = referrerId                  L3871  (dead write)
          ├─ logAction('referral_processed','rider',refereeId, …)                                     L3872
          ├─ sendSystemEmail(referrer,'Your referral bonus has landed 🎉', …, 'promo')                L3873
          └─ sendSystemEmail(referee, 'Welcome to Eyvar — bonus inside 🎁', …, 'promo')               L3874
       4. on !ok → toast('⚠ '+reason,'warn') and STOP (modal stays open)  L3924
       5. on ok  → closeModal(); renderReferralProgram(); toast('✅ Referral processed — both wallets credited','ok')  L3925-3926
```
Side-effects also visible in: rider profile wallet card (`L3951`), Rider Wallets page, Activity Log (`wallet_credit` ×2 + `referral_processed`), Email outbox (2 `promo`-category emails), Fraud page (recomputed on next render), Finance contribution margin (`L15726`).

### 5.8 Driver tier rules — `computeDriverTier(d)` `L13595-13601`

```
if (!d.rating || d.rating === 0)             → 'new'
tenure = driverTenureDays(d)                 // L13587
if (d.rating >= 4.7 && tenure >= 90)         → 'gold'
if (d.rating >= 4.3 && tenure >= 30)         → 'silver'
otherwise                                    → 'standard'
```
`driverTenureDays(d)` = `max(0, round((REQ_NOW_REF − parseJoinedDate(d.joined)) / 86_400_000))`, `0` when `joined` is unparseable (`L13587-13594`). `parseJoinedDate` accepts only `"Mon YYYY"` (`L13580-13586`).

`recalcDriverTiers(silent)` `L13602-13632`:
- skips drivers with `status==='pending'` (`L13606`)
- on change: writes `d.lvl`, records `{id, old, tier, up:TIER_RANK[new] > TIER_RANK[old]}`
- per change → `logAction('tier_change','driver',id, '<name> tier promoted|adjusted: old → new (rating R, Nd tenure)', {lvl:old},{lvl:new})` (`L13615`)
- if not silent: one change → toast + `pushOpsNotification('info','Tier promoted|updated — <name>', …)`; many → aggregate toast + notification (`L13617-13626`)
- always re-renders `renderDriversTable()` and `renderIncentives()` when anything changed (`L13628-13629`)

`recalcRiderTiers(silent)` `L13645-13660` reuses `computeDriverTier` verbatim on `DB.riders` (comment `L13641-13644`), writes `rider.lvl`, logs `tier_change`/`rider`, and toasts an aggregate only.

The INV-3 incentive text *"Gold-tier drivers (rating ≥4.7, 90d) → Commission 20% → 17%"* uses the same thresholds, but **no code changes any commission** based on tier — `driverCommissionRate()` (`L4467`) reads only `DB.opsConfig.pricing.driverCommissionPct` and ignores `lvl`.

### 5.9 Incentive award math

None. `commitAwardIncentive` (`L13702`) takes a **free-typed SAR amount** from the operator; the `reward` string on the rule is only displayed for reference (`L13694`). Validation: `!driverId || !amount || amount <= 0` → warn toast (`L13707`).

Derived counters:
```
incentiveEarnedCount(id) = DB.driverBonusLog.filter(b => b.incentiveId === id).length          L13662
incentiveTotalPaid(id)   = same filter, reduce (s,b) => s + b.amount                            L13663
```

### 5.10 Contribution-margin coupling (Finance module) — `contributionMargin()` `L15718-15739`

```
promo        = Σ DB.promos[].spent                              L15725
referral     = Σ DB.referralLog[](referrerBonus + refereeBonus) L15726
incentive    = Σ DB.driverBonusLog[].amount                     L15727
giveback     = promo + referral + incentive + refunds + goodwill + emergency   L15734
contribution = (gross − driverEarn) − giveback                  L15736
truePct      = gross ? (net − giveback) / gross * 100 : 0       L15738
```
Everything this module writes lands directly in the Finance contribution card (`L15755-15757`).

---

## 6. Configuration fields

### 6.1 Referral program (persisted in `DB.referralConfig`, `L13855`)

| Field (input id) | Default | Unit | Range / validation | Effect |
|---|---|---|---|---|
| `ref-enabled` (checkbox) | `true` | boolean | none | When false, `processReferral` refuses with *"Referral program is currently disabled in Settings."* (`L3862`) |
| `ref-referrer-bonus` (number) | `20` | SAR | `min="0" step="1"` in HTML (`L1278`); on save `parseFloat(...)||0` — **no upper cap; non-numeric silently becomes 0** (`L3901`) | Amount credited to the referrer on every future referral |
| `ref-referee-bonus` (number) | `10` | SAR | `min="0" step="1"` (`L1279`); `parseFloat(...)||0` (`L3902`) | Welcome credit to the referee on every future referral |

`renderReferralProgram()` reflects stored values back into the three inputs on every page entry (`L3879-3882`).
Already-processed referrals are **not** repriced — each log row stores the amounts used at the time (`L3870`); the gate copy states this explicitly (`L20791`).

### 6.2 Incentive rules (in-place edit)

| Control | Default | Effect |
|---|---|---|
| Per-row `active` toggle | from `DB.incentives[i].active` | Inline handler `DB.incentives[i].active=this.checked;toast(…)` (`L13674`). **Writes DB with no permission gate and no audit entry.** Hides/shows the 🏆 Award button on next render. |
| `new-inv-name` / `new-inv-rule` / `new-inv-reward` (text) | empty, placeholders `"e.g. Night owl bonus"`, `"e.g. 5+ trips after 10 PM this week"`, `"e.g. +15 SAR"` | `addIncentiveRule()` `L13714` — all three required (`L13716`) |

### 6.3 Not configurable here (hardcoded)

`MSG_SEGMENTS` counts, the cohort matrix, the CSAT/NPS numbers, the ROI constant `86.50`, and every tier threshold (4.7/90d, 4.3/30d) are literals in source.

---

## 7. KPIs & metrics

### 7.1 Referral KPI strip — `#ref-kpis`, built `L3883-3888`

| Tile label | Value formula | Delta line | Source |
|---|---|---|---|
| Total referrals processed | `DB.referralLog.length` | `"this session"` (neutral) | `L3884` |
| Referrer bonuses paid | `Σ log[].referrerBonus` `.toFixed(2)+' SAR'` | `"to the wallet ledger"` | `L3885` |
| Referee bonuses paid | `Σ log[].refereeBonus` `.toFixed(2)+' SAR'` | `"welcome credits"` | `L3886` |

All three render with class `kpi-dl neu` — **no thresholds, no colour coding, not clickable**.
Because the seed log has one row (`L13889`), the initial values are `1`, `20.00 SAR`, `10.00 SAR`.

### 7.2 Promo per-row metrics — `L13510-13522`

| Metric | Formula | Threshold / colour |
|---|---|---|
| Budget burn % | `round(spent/budget*100)` | bar green <80, amber 80–99, red ≥100 (`L13517`) |
| Uses | `p.uses` (raw) | none |
| New subs | `p.newSubs` (raw) | none |
| ROI | `promoROI(p)` (§5.1) | green ≥1.0×, red <1.0× (`L13521`) |

### 7.3 Incentive per-row metrics — `L13667-13671`

| Metric | Formula |
|---|---|
| Earned (real) | `incentiveEarnedCount(v.id)` + `' driver'` / `' drivers'` pluralisation |
| Total paid | `incentiveTotalPaid(v.id).toFixed(2)+' SAR'` |

### 7.4 Retention cohorts — `L13762-13785` (**hardcoded**)

| Cohort | Subs | M0 | M1 | M2 | M3 | M4 |
|---|---|---|---|---|---|---|
| Feb 2026 | 34 | 100% | 71% | 62% | 53% | 47% |
| Mar 2026 | 52 | 100% | 74% | 64% | 58% | · |
| Apr 2026 | 78 | 100% | 78% | 69% | · | · |
| May 2026 | 96 | 100% | 81% | · | · | · |
| Jun 2026 | 118 | 100% | · | · | · | · |

Cell colouring: `background: rgba(46,123,196, v/160)`, text `#fff` when `v>60` else `var(--ink)`; missing months render `·` in `var(--border2)` (`L13775-13777`). Footer prose `L13782` is hardcoded narrative.

### 7.5 CSAT / NPS — `L13786-13796` (**fully hardcoded HTML string**)

| Metric | Value | n | Source |
|---|---|---|---|
| CSAT after support tickets | `4.6/5` | 212 | literal `L13790` |
| NPS after completed packages | `+42` | 131 | literal `L13791` |

Explanatory prose (`L13793`): CSAT (1–5) fires on ticket close, NPS (0–10) on package completion, detractors (≤6) auto-open a follow-up ticket. **No code implements any of this** — see §16.

---

## 8. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| Promo table rows | `DB.promos` (`L13495`) | array, in-memory | Iterated in **array order**; new codes `unshift` to the top (`L13554`) |
| Promo `spent/budget` text | `p.spent.toFixed(0)+' / '+p.budget.toFixed(0)+' SAR'` | computed string | `L13516` |
| Promo target cell | `p.target+' · '+p.perUserLimit+'/user'` | computed string | `L13523` |
| Fraud-guard note under promo table | hardcoded string | literal | `L13527` |
| `#ref-enabled`, `#ref-referrer-bonus`, `#ref-referee-bonus` | `DB.referralConfig` | DB → input value | `L3879-3882` |
| Referral KPI tiles | computed from `DB.referralLog` | reduce | `L3883-3888` |
| Referral leaderboard rows | `DB.referralLog` grouped by `referrerId` | computed | `L3889-3893` |
| Referral log table rows | `DB.referralLog` (insertion order, newest first via `unshift`) | array | `L3894-3895` |
| Rider names in referral UI | `nm2(id)` → `DB.riders[id].name \|\| DB.drivers[id].name \|\| id` | lookup `L3565` | |
| Incentive table rows | `DB.incentives` (`L13564`) | array order | `L13666` |
| Incentive Earned / Total paid | `DB.driverBonusLog` (`L13895`) | computed | `L13662-13663` |
| Bulk-msg segment `<option>`s | `MSG_SEGMENTS` (`L13733`) | hardcoded const | `L13744` |
| Cohort table | local `cohorts` array inside `renderCohorts` | hardcoded | `L13764-13770` |
| CSAT / NPS tiles | inline literals | hardcoded | `L13790-13791` |
| Incentive footer prose | hardcoded | literal | `L13684` |

---

## 9. Input fields

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| `ref-enabled` | checkbox | "Referral program active" | from `DB.referralConfig.enabled` (`true`) | — | `saveReferralConfig` `L3900` |
| `ref-referrer-bonus` | number | "Referrer bonus (SAR)" | from config (`20`) | `min=0 step=1`; `parseFloat()\|\|0` | `saveReferralConfig` `L3901` |
| `ref-referee-bonus` | number | "Referee welcome bonus (SAR)" | from config (`10`) | `min=0 step=1`; `parseFloat()\|\|0` | `saveReferralConfig` `L3902` |
| `new-inv-name` | text | "New incentive name" | empty | placeholder `"e.g. Night owl bonus"`; required | `addIncentiveRule` `L13716` |
| `new-inv-rule` | text | "Rule" | empty | placeholder `"e.g. 5+ trips after 10 PM this week"`; required | `addIncentiveRule` |
| `new-inv-reward` | text | "Reward" | empty | placeholder `"e.g. +15 SAR"`; required | `addIncentiveRule` |
| per-row incentive checkbox | checkbox (`.tog`) | — | `v.active` | — | inline DB write `L13674` |
| `bm-seg` | `<select>` | "Segment" | first option (`seg1`) | 5 options from `MSG_SEGMENTS`, label = `"<label> (<count> recipients)"` | `sendBulkMsg` `L13753` |
| `bm-ch` | `<select>` | "Channel" | "Push notification" | `Push notification` \| `SMS` \| `In-app inbox` | audit summary only (`L13756`) — **channel has no behavioural effect** |
| `bm-txt` | `<textarea rows=3>` | "Message" | empty | placeholder `"e.g. Your package expires in 3 days — renew now and keep your captain 🚗"`; trimmed, must be non-empty (`L13755`) | `sendBulkMsg`; cleared on success `L13758` |

Modal-only inputs are listed in §13.

---

## 10. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit key | Confirm gate |
|---|---|---|---|---|---|---|
| **+ New promo campaign** (`L1267`) | `openNewPromo()` `L13531` | `requirePerm('manage_plans')` then renders the modal | — | broad `manage_plans` (`L13532`) | `permission_denied` on failure | none |
| **Launch campaign** (modal) | `commitNewPromo()` `L13549` | Validates code non-empty + unique; `DB.promos.unshift({...})`; `closeModal()`; `renderPromoList()`; toast `'🎟️ <CODE> launched — budget-capped and live'` | `DB.promos` | page `growth.create_promo` (`L13550`) | `create_promo` / entity `promo` / id `code` (`L13559`) | none |
| **Pause** (row, `status==='active'` only) | `pausePromo(i)` `L13529` | `DB.promos[i].status='paused'`; re-render; warn toast | `DB.promos[i].status` | page `growth.pause_promo` | `pause_promo` | **YES** — `GATE_SWEEP.pausePromo` (`L20877-20879`): title *"Pause the promotion"*, danger, consequences *"Riders who try the code from now on will be refused."* / *"Codes already applied to open bookings are honoured."*, button "Pause promo" |
| **Resume** (row, `status==='paused'` only) | `resumePromo(i)` `L13530` | `DB.promos[i].status='active'`; re-render; ok toast | `DB.promos[i].status` | page `growth.pause_promo` | `resume_promo` | none (**asymmetric with Pause**) |
| **+ Process a referral** (`L1274`) | `openProcessReferralModal()` `L3907` | Builds a modal with two rider pickers | — | **none** | — | none |
| **Process referral** (modal) | `commitProcessReferral()` `L3919` | See §5.7 | `DB.referralLog`, 2× rider `wallet`, `referee.referredBy`, `DB.emailOutbox` (2), audit (3 entries) | broad `contact_users` (`L3920`) | `referral_processed` + 2× `wallet_credit` | none |
| **Save referral settings** (`L1281`) | `saveReferralConfig()` `L3897` | Captures `before`, writes 3 config fields, `logAction('config_updated','settings','referral', …, before, after)`, `renderSettingsMeta()`, toast `'✅ Referral program settings saved'` | `DB.referralConfig` | broad `manage_settings` (`L3898`) | `config_updated` | **YES** — `GATE_SWEEP.saveReferralConfig` (`L20789-20791`): title *"Save referral rewards"*, danger, summary *"Both sides of every future referral are paid at these rates."*, consequences *"Referrals already earned are not repriced."* / *"This spend lands in contribution margin."*, button "Save rewards" |
| **Row toggle: incentive active** | inline `onchange` `L13674` | `DB.incentives[i].active=this.checked` + toast | `DB.incentives[i].active` | **none** | **none** | none |
| **🏆 Award** (row, `active` only) | `openAwardIncentiveModal(id)` `L13688` | Renders award modal; driver list excludes `status==='pending'` (`L13691`) | — | **none on open** | — | none |
| **Award bonus** (modal) | `commitAwardIncentive(id)` `L13702` | Validates driver + `amount>0`; `DB.driverBonusLog.unshift({...})`; audit; `sendSystemEmail(driverId,'You earned a bonus 🏆', …,'transactional')`; `closeModal()`; `renderIncentives()`; toast | `DB.driverBonusLog`, `DB.emailOutbox` | broad `process_payouts` (`L13703`) | `driver_bonus_awarded` / `driver` / driverId | none |
| **Remove** (incentive row) | `removeIncentiveRule(id)` `L13724` | Filters the rule out of `DB.incentives`; audit; re-render; info toast | `DB.incentives` | broad `manage_plans` (`L13725`) | `config_updated` / `incentive` / id | **YES** — `GATE_SWEEP.removeIncentiveRule` (`L20836-20838`): danger, consequences *"Captains currently working toward it stop qualifying immediately."* / *"Consider announcing it — silently removing an incentive is how supply trust is lost."*, button "Remove rule" |
| **+ Add incentive** | `addIncentiveRule()` `L13714` | Requires all 3 fields; pushes `{id:'INV-'+Date.now(),name,rule,reward,active:true}`; audit; clears inputs; re-render; toast | `DB.incentives` | broad `manage_plans` (`L13715`) | `config_updated` / `incentive` / `'new'` | **YES** — `GATE_SWEEP.addIncentiveRule` (`L20833-20835`): danger, summary *"This commits money to captains who meet the condition."*, button "Add rule" |
| **↻ Recalculate tiers now** | `manualRecalcTiers()` `L13633` | `recalcDriverTiers(true)`; if no changes → info toast and stop; else success toast (click → `go('drivers')`) + `pushOpsNotification` | `DB.drivers[].lvl`, audit `tier_change` per change | page `growth.recalc_tiers` (`L13634`) | `tier_change` (one per driver) | none |
| **Send to segment** | `sendBulkMsg()` `L13750` | **Two** gates: `requirePerm('contact_users')` (`L13751`) then `requirePagePerm('growth','send_message')` (`L13752`). Requires non-empty text. Then: audit + toast + clear textarea. **Sends nothing** — no push/SMS/inbox write, no `DB.pushOutbox`/`DB.emailOutbox` entry. | audit log only | broad `contact_users` **and** page `growth.send_message` | `bulk_message` / `segment` / `seg.id`, summary `'Bulk <channel> to "<label>" (<count> recipients)'` | **YES** — `GATE_SWEEP.sendBulkMsg` (`L20855-20856`): danger + **irreversible**, consequences *"Sent to every selected recipient at once."* / *"Cannot be unsent."*, button "Send" |
| Leaderboard name click | `openProfile(id)` inline `L3892` | Navigates to the 360° profile | — | none | — | none |

### Permission definitions used

`PAGE_PERMISSIONS.growth` (`L10614-10620`): label *"Promos & Growth"*, icon 📈, `legacy:'manage_plans'`, perms `view`, `create_promo`, `pause_promo`, `send_message`, `recalc_tiers`.
`defaultPagePerms` (`L10662`) grants every action perm only if the user holds the legacy broad perm `manage_plans`; otherwise only `view`.
`requirePagePerm` (`L10680`) on denial: `toast('🔒 Your role lacks permission: Promos & Growth — <label>','err')` + `logAction('permission_denied','permission','growth.<key>', …)`.
`requirePerm` (`L3126`) on denial: toast + `logAction('permission_denied','permission',<key>, …)`.

Gate mechanics: `gateAll(GATE_SWEEP)` (`L20756`) wraps each named global via `guardAction` (`L17819`), replacing it with a version that opens `confirmAction()` first; `installGateSweep()` runs at `L20903`.

---

## 11. Tables & lists

### 11.1 Promo campaigns table — `#promo-list`, `L13508-13526`

Columns, in order: **Code · Discount · Budget burn · Uses · New subs · ROI · Target · Expires · Status · (actions)**

| Aspect | Detail |
|---|---|
| Row source | `DB.promos` array order (`L13509`) |
| Sort | none — insertion order; `commitNewPromo` unshifts so newest is first |
| Filter / search | **none** |
| Row click | none |
| Row actions | `Pause` (when active) / `Resume` (when paused) / nothing for `exhausted`/`expired` (`L13524`) |
| Empty state | **none** — `DB.promos.map(...).join('')` produces an empty `<tbody>` with no placeholder row |
| Footer | static fraud-guard note (`L13527`) |
| Scroll | container `max-height:400px; overflow-y:auto` (`L1271`) |

### 11.2 Top referrers leaderboard — `#ref-leaderboard`, `L3889-3893`

| Aspect | Detail |
|---|---|
| Source | `DB.referralLog` reduced into `counts[referrerId]` (`L3890`) |
| Sort | descending by count (`L3891`) |
| Limit | `.slice(0,5)` — **top 5 only** |
| Row | name (blue, click → `openProfile(id)`) + `b-blue` badge `"<n> referral"`/`"referrals"` |
| Empty state | *"No referrals processed yet."* (`L3893`) |

### 11.3 Referral log table — `#ref-log-tbody`, `L3894-3895`

Columns (static `<thead>` at `L1287`): **Referrer · Referee · Referrer bonus · Referee bonus · Date**

| Aspect | Detail |
|---|---|
| Row source | `DB.referralLog` (newest first — `unshift` at `L3870`) |
| Sort / filter / search | **none** |
| Row click | **none** (names are plain text here, unlike the leaderboard) |
| Amounts | `.toFixed(2)+' SAR'` |
| Empty state | `<tr><td colspan="5">No referrals yet.</td></tr>` (`L3895`) |

### 11.4 Driver incentive rules table — `#incentive-list`, `L13666-13686`

Columns: **Incentive · Rule · Reward · Earned (real) · Total paid · Active · (actions)**

| Aspect | Detail |
|---|---|
| Row source | `DB.incentives` array order (`L13666`); `addIncentiveRule` **pushes** (appends to bottom, `L13718`) |
| Sort / filter | none |
| Row click | none |
| Row actions | `🏆 Award` (active rules only) + `Remove` (always) |
| Empty state | **none** |
| Footer block 1 | "add a rule" form strip (3 inputs + button), `L13678-13683` |
| Footer block 2 | purpose prose + `↻ Recalculate tiers now` button, `L13684-13686` |
| Scroll | `max-height:320px; overflow-y:auto` (`L1291`) |

### 11.5 Retention cohort matrix — `#cohort-body`, `L13771-13781`

Columns: **Cohort · Subs · M0 · M1 · M2 · M3 · M4**. Row source: hardcoded local array. No interaction of any kind.

---

## 12. Charts

| Visual | Type | Series / axes | Source | Line |
|---|---|---|---|---|
| Promo budget-burn bar | Inline horizontal progress bar (5px tall, `min-width:110px`) | single value `min(100,burn)%`; colour-banded green/amber/red | `p.spent / p.budget` | `L13516-13517` |
| Cohort retention matrix | Colour-graded heatmap table (no axes) | one row per cohort, one column per month index 0–4; opacity `v/160` on `rgba(46,123,196,·)` | hardcoded array | `L13771-13781` |
| CSAT / NPS tiles | Two big-number stat tiles (not charts) | — | hardcoded literals | `L13789-13792` |

**No canvas/SVG chart exists on this page.** (The trend-chart engine `renderTrendChart` `L6769` is used by Executive Overview, not here.)

---

## 13. Modals opened

### 13.1 "New promo campaign" — `openNewPromo()` `L13531-13548`

Title: `New promo campaign` (no emoji). Close: `✕` → `closeModal()`.

| Field id | Type | Label | Default | Constraints |
|---|---|---|---|---|
| `np-code` | text | Code | empty | placeholder `"e.g. SUMMER20"`, CSS `text-transform:uppercase`; uppercased + trimmed on commit (`L13551`); must be non-empty and not duplicate an existing `code` |
| `np-disc` | number | Discount % | `15` | `min=1 max=100`; commit `parseFloat()\|\|15` |
| `np-budget` | number | Total budget (SAR) | `3000` | `min=100`; commit `parseFloat()\|\|3000` |
| `np-limit` | number | Per-user limit | `1` | `min=1`; commit `parseInt(...,10)\|\|1` |
| `np-target` | select | Target | "New riders only" | Options: `New riders only`, `All riders`, `Lapsed subscribers`, `Monthly plan only`, `Specific zone` (`L13540`). **"Specific zone" offers no zone picker** |
| `np-exp` | date | Expires | `2026-08-31` (**hardcoded literal**, `L13541`) | native date input; no min/max |

Info block (`L13542`): *"The campaign pauses itself automatically when the budget is fully consumed — no runaway spend."*
Buttons: `Cancel` → `closeModal()` · `Launch campaign` → `commitNewPromo()` (`L13544`).

### 13.2 "🎁 Process a referral" — `openProcessReferralModal()` `L3907-3918`

| Field id | Type | Label | Default | Options |
|---|---|---|---|---|
| `ref-referrer` | custom searchable select (`customSelectHTML` `L5336`, csel id `csel-ref-referrer`) | "Referrer (existing rider)" | `''` (placeholder *"Search rider…"*) | **every** `DB.riders` key; option label `"<name> · <id>"` (`L3908`) |
| `ref-referee` | custom searchable select (csel id `csel-ref-referee`) | "Referee (new rider who used the code)" | `''` | same full rider list — **no filter excluding the referrer or already-referred riders** |

Note line (`L3914`): *"Both riders get credited to their wallet immediately — `<referrerBonus>` SAR to the referrer, `<refereeBonus>` SAR to the referee."*
Buttons: `Cancel` → `closeModal()` · `Process referral` → `commitProcessReferral()` (`L3916`).

### 13.3 "🏆 Award — `<incentive name>`" — `openAwardIncentiveModal(incentiveId)` `L13688-13701`

Header line (`L13694`): `Rule: <inv.rule> · Reward: <inv.reward>`.

| Field id | Type | Label | Default | Options / validation |
|---|---|---|---|---|
| `award-driver` | custom searchable select (csel `csel-award-driver`) | "Driver" | `''` (*"Search driver…"*) | all `DB.drivers` with `status !== 'pending'`; label `"<name> · <id>"` (`L13691`) |
| `award-amount` | number | "Bonus amount (SAR)" | empty | `min=1 step=1`, placeholder `"e.g. 40"`; commit requires `>0` (`L13707`) — **not pre-filled from the rule's `reward` string** |

Buttons: `Cancel` · `Award bonus` → `commitAwardIncentive(incentiveId)` (`L13698`).

### 13.4 Gate confirmation modals (auto-generated)

`confirmAction()` (`L17785-17800`) renders a generic modal for the gated actions listed in §10 (`saveReferralConfig`, `pausePromo`, `addIncentiveRule`, `removeIncentiveRule`, `sendBulkMsg`). Structure: `⚠ <title>` head, optional summary paragraph, a *"What happens when you confirm"* consequence list, an optional *"⚠ This cannot be undone."* line for `irr:true` (only `sendBulkMsg` here), then `Cancel` / `<confirmLabel>`.

---

## 14. States & badges

| Badge / state | Class | Exact trigger | Line |
|---|---|---|---|
| "Active" (promo) | `b b-green` | `p.status === 'active'` | `L13512` |
| "Budget exhausted" | `b b-red` | `p.status === 'exhausted'` | `L13512` |
| "Paused" | `b b-amber` | `p.status === 'paused'` | `L13512` |
| "Expired" | `b b-grey` | any other value (else-branch) | `L13512` |
| ROI green | inline `color:var(--green)` | `promoROI(p) >= 1` | `L13521` |
| ROI red | inline `color:var(--red)` | `promoROI(p) < 1` | `L13521` |
| Burn bar green / amber / red | inline background | `burn < 80` / `80 ≤ burn < 100` / `burn ≥ 100` | `L13517` |
| Referral count badge | `b b-blue` | rendered for each of the top-5 referrers | `L3892` |
| Incentive active toggle on | `.tog` checked | `DB.incentives[i].active === true` | `L13674` |
| Cohort cell tinted | `rgba(46,123,196, v/160)`, white text | value present; white when `v > 60` | `L13777` |
| Tier badge (drivers table, downstream) | `lvlBadge(lvl)` `L3260` | `d.lvl` set by `recalcDriverTiers` | `L13611` |
| Sidebar badge | **none for `growth`** — no `sb-badge` span on `L522` | — | `L522` |

Notifications raised by this module (persist in the bell centre, `pushOpsNotification` `L9661`):
- `'Tier promoted|updated — <name>'` / `'<n> driver tiers updated'` from `recalcDriverTiers` (`L13622`, `L13625`)
- `'<n> driver tier(s) updated'` from `manualRecalcTiers` (`L13638`)

---

## 15. Cross-module links

| Direction | Target | Mechanism | Line |
|---|---|---|---|
| Growth → 360° Profile | `openProfile(riderId)` from the referral leaderboard | inline onclick | `L3892` |
| Growth → Drivers page | `go('drivers',null)` from the tier-recalc toast / notification | toast + notification callbacks | `L13624-13625`, `L13637-13638` |
| Growth → Drivers table | `renderDriversTable()` after a tier change | direct call | `L13628` |
| Growth → Riders page | `go('riders',null)` from the rider-tier toast | toast callback | `L13657` |
| Growth → Settings meta | `renderSettingsMeta()` after `saveReferralConfig` | direct call | `L3904` |
| Growth → Rider wallets | `creditRiderWallet` ×2 per referral | direct call | `L3868-3869` |
| Growth → Email outbox | `sendSystemEmail` — 2 `promo` emails per referral, 1 `transactional` per incentive award | `L3578` | `L3873-3874`, `L13710` |
| Growth → Activity log | `logAction` across 9 distinct keys (§18.4) | `L3133` | many |
| Fraud & Risk → referral data | `renderFraudPage` reads `DB.referralLog` for self-abuse flags + KPI | `L5610`, `L5642` | |
| Finance → promo/referral/incentive spend | `contributionMargin()` reads `DB.promos[].spent`, `DB.referralLog[]`, `DB.driverBonusLog[]` | `L15725-15727` | |
| Driver 360° profile → incentive bonuses | "🏆 Incentive bonuses earned" row from `DB.driverBonusLog` | `L4168`, `L4175` | |
| Rider Wallets page header | copy explicitly names referral bonuses as a wallet source | `L1021` | |
| Settings → Permissions matrix | `PAGE_PERMISSIONS.growth` drives the 5 checkboxes for this page | `L10614` | |
| Tick engine → tier recalc | every N ticks (`L12622-12623`), plus on rating change (`L12463`) and rating void (`L15618`) | | |

---

## 16. Hardcoded / mock / demo values — flagged explicitly

| # | Value | Where | Note |
|---|---|---|---|
| 1 | All 4 promo campaigns and every counter on them (`spent`, `uses`, `newSubs`) | `L13496-13499` | **MOCK** — no engine produces these numbers |
| 2 | ROI revenue constant `86.50` SAR/sub | `L13503` | **HARDCODED**; duplicates `PLANS.weekly.eco` (`L4390`) instead of reading it |
| 3 | Promo modal default expiry `2026-08-31` | `L13541` | **HARDCODED** literal date |
| 4 | Promo modal defaults 15% / 3000 SAR / 1 per user | `L13536-13538` | hardcoded |
| 5 | Fraud-guard note under the promo table | `L13527` | **PROSE ONLY** — explicitly says "enforced at the app/backend layer" |
| 6 | "Auto-pauses when budget is exhausted" card note | `L1270` | **UNIMPLEMENTED CLAIM** |
| 7 | Seed referral log entry `REF-seed-1` | `L13889` | **DEMO** — inflates the "Total referrals processed" KPI to 1 at boot |
| 8 | Referral KPI delta text "this session" | `L3884` | misleading — the log is seeded, not session-scoped |
| 9 | All 4 seed incentive rules incl. the "Commission 20% → 17%" reward | `L13565-13568` | **DEMO**; the commission change is never applied |
| 10 | Seed bonus log rows `BON-seed-1`, `BON-seed-2` | `L13896-13897` | **DEMO** — makes "Earned (real)" show 1 driver for INV-1 and INV-2 |
| 11 | All 5 `MSG_SEGMENTS` labels **and recipient counts** (8 / 8 / 5 / 3 / 142) | `L13734-13738` | **HARDCODED** — never recomputed from `DB`; `142` contradicts the live sub count |
| 12 | Entire retention cohort matrix (5 cohorts × up to 5 months) | `L13764-13770` | **HARDCODED** |
| 13 | Cohort narrative paragraph ("of March's 52 new subscribers, 58%…") | `L13782` | **HARDCODED PROSE** |
| 14 | CSAT `4.6/5` (n=212) and NPS `+42` (n=131) | `L13790-13791` | **HARDCODED** |
| 15 | CSAT/NPS survey-automation description | `L13793` | **UNIMPLEMENTED CLAIM** — no survey, no auto-ticket code exists |
| 16 | Tier thresholds 4.7 / 90d and 4.3 / 30d | `L13597-13599` | hardcoded constants (intentional, documented `L13591-13593`) |
| 17 | `TIER_RANK` map | `L13579` | hardcoded |
| 18 | Incentive footer purpose prose | `L13684` | hardcoded |
| 19 | Bulk-message textarea placeholder | `L13746` | hardcoded example copy |

---

## 17. i18n keys

| Key | Element | English | Arabic | Line |
|---|---|---|---|---|
| `sec.growth` | sidebar section label | "Growth" | `النمو` | `L521`, `L7913` |
| `nav.growth` | sidebar item label | "Promos & growth" | `العروض والنمو` | `L522`, `L7908` |

**No other i18n key exists for this module.** Every string inside `#p-growth` (the `<h1>`, all card headings, every table header, every button, every toast, every modal) is an untranslated English literal — consistent with the file-level note at `L7899-7901` that dynamically-built strings stay English-only. `applyLanguage()` (`L7939`) only swaps `[data-i18n]` nodes.

---

## 18. Gaps, dead code, UNVERIFIED items

### 18.1 Unimplemented core mechanics

1. **No promo redemption engine.** A grep across the whole file for `discountPct` (`L2890`, `L2892`, `L2894`, `L4521-4523`, `L4536`, `L4554-4555`, `L4577`, `L4662`, `L5935`, `L6076`, `L6103`, `L6127`, `L6137`, `L6146`, `L13496-13499`, `L13515`, `L13554`, `L21500`) shows every hit outside `L13495-13560` belongs to the **subscription-plan cadence discount** (`CADENCE_META`, `L4521`), not promo codes. A promo's `discountPct` never touches a fare, a subscription price, or a payment.
2. **`spent`, `uses`, `newSubs` are never incremented.** Only `contributionMargin()` (`L15725`) reads `spent`. Therefore burn %, ROI and the ROI colour are frozen at their seed values for seed rows and permanently `0` / `0.0×` for any campaign created in-session.
3. **No auto-pause.** No code sets `status='exhausted'` or `'expired'`; the two states are only reachable from seed data. The card note (`L1270`), the modal note (`L13542`) and the source comment (`L13489-13493`) all assert behaviour that does not exist.
4. **`perUserLimit`, `target`, `expires` are inert.** No validation, no matching, no clock comparison anywhere.
5. **`target: 'Specific zone'`** (`L13540`) has no accompanying zone selector — choosing it stores the literal string `"Specific zone"`.
6. **`sendBulkMsg` sends nothing.** It writes an audit row and a toast; no `DB.pushOutbox` (`L13835`) / `DB.emailOutbox` (`L13834`) entry, no recipient resolution — despite `sendPushNotification` (`L7735`) and `sendBroadcast` (`L7694`) existing elsewhere and doing exactly that. The `bm-ch` channel choice affects only the audit summary string.
7. **`MSG_SEGMENTS` counts never recomputed.** Real audience-count helpers exist in Settings (`broadcastAudienceCount` `L7673`, `pushAudienceIds` `L7711`) but are not used here.
8. **CSAT / NPS is a static picture.** No survey trigger on ticket close (`setTicketStatus` `L2368`, `closeConversation` `L2398`) and no NPS trigger on package completion; the promised "detractor auto-opens a follow-up ticket" behaviour is absent.
9. **Retention cohorts are static.** `renderCohorts` never reads `DB.subscriptions`.
10. **INV-3 "Commission 20% → 17%" is not applied.** `driverCommissionRate()` (`L4467`) and `commissionRateForPlan()` (`L4461`) ignore `d.lvl` entirely.
11. **Incentive `rule` strings are never evaluated.** Confirmed by the source comment at `L13891-13894` ("awarded manually by ops … needs a full trip-history engine beyond this file's scope") — this one is honestly disclosed in the UI at `L13684`.

### 18.2 Dead code / dead writes

| Item | Line | Evidence |
|---|---|---|
| `getReferralCode(riderId)` | `L3854-3859` | **Never called.** No call site anywhere in the file; per-rider referral codes are consequently never generated or displayed. |
| `rider.referredBy = referrerId` | `L3871` | **Never read.** No other reference to `referredBy` exists. |

### 18.3 Inconsistencies & risks

| # | Issue | Line |
|---|---|---|
| 1 | `processReferral`'s disabled-message says the toggle lives **"in Settings"**, but it is on this Growth page (`L1276`) | `L3862` |
| 2 | `pausePromo` is gate-confirmed but `resumePromo` is not, despite sharing the same permission | `L13529-13530`, `L20877` |
| 3 | The incentive `active` toggle writes `DB` inline with **no permission check and no audit entry** — the only ungated DB write on the page | `L13674` |
| 4 | `openProcessReferralModal` has **no permission gate**; only the commit is gated (`contact_users`). Operators without the perm can fill the whole form before being refused | `L3907` vs `L3920` |
| 5 | `commitProcessReferral` is gated on `contact_users`, yet the action credits money — no finance-shaped permission is required | `L3920` |
| 6 | `openAwardIncentiveModal` has no gate; commit requires `process_payouts` | `L13688` vs `L13703` |
| 7 | Referral bonus inputs accept any positive value with **no upper bound**; `parseFloat(...)||0` silently coerces junk to 0 | `L3901-3902` |
| 8 | The referee picker lists **all** riders, including ones already in the log — the duplicate is only caught after submit | `L3908` vs `L3865` |
| 9 | Promo `code` uniqueness is checked on create but nothing prevents later mutation; **no delete/archive action exists for promos at all** | `L13553` |
| 10 | Promo table has **no empty state** — an empty `DB.promos` renders a header-only table | `L13509` |
| 11 | `renderGrowthPage()` omits `renderReferralProgram()`; any future caller of `renderGrowthPage()` alone would leave the referral card stale | `L14386` |
| 12 | Growth cards are blank on first load until the page is visited (not in the boot block) | `L14556-14600` |
| 13 | New incentives are **appended** to the bottom while new promos are **prepended** to the top — inconsistent insertion behaviour | `L13718` vs `L13554` |

### 18.4 Audit keys emitted by this module

`create_promo` (`L13559`) · `pause_promo` (`L13529`) · `resume_promo` (`L13530`) · `referral_processed` (`L3872`) · `wallet_credit` ×2 per referral (`L3938`) · `config_updated`/settings/`referral` (`L3903`) · `config_updated`/incentive (`L13719`, `L13727`) · `driver_bonus_awarded` (`L13709`) · `tier_change` (`L13615`, `L13652`) · `bulk_message` (`L13756`) · `permission_denied` (`L3130`, `L10686`).

### 18.5 UNVERIFIED

| Item | Reason |
|---|---|
| Whether `audit_mut.js` (referenced `L20752`) actually flags the ungated incentive toggle | The file is not present in this repository — only referenced by comment. |
| Runtime rendering of the `.g3` / `.kpi` / `.tog` / `.dt` CSS classes | Not inspected; conclusions here are drawn from markup and JS only, not from a rendered browser. |
| Whether `customSelectHTML` filters out already-selected values at runtime | `L5336-5382` builds the markup; the runtime behaviour of `positionCselMenu` / `cselSetValue` (`L5383`, `L5427`) was not traced end to end for this doc. |
| Actual delivery of `sendSystemEmail` | `L3578` writes to `DB.emailOutbox`; there is no transport in this static file — expected, but unverifiable here. |

---

## 19. Line-number index

### HTML
| Lines | Content |
|---|---|
| `L521-522` | Sidebar section label + `growth` nav item |
| `L1263` | Page comment banner |
| `L1264-1301` | `#p-growth` container |
| `L1265-1268` | Page header + `+ New promo campaign` |
| `L1269-1272` | Promo campaigns card / `#promo-list` |
| `L1273-1288` | Referral program card |
| `L1275-1282` | Referral config strip (`ref-enabled`, `ref-referrer-bonus`, `ref-referee-bonus`, Save) |
| `L1283` | `#ref-kpis` |
| `L1284-1285` | "Top referrers" + `#ref-leaderboard` |
| `L1286-1287` | "Referral log" + table / `#ref-log-tbody` |
| `L1289-1292` | Driver incentive rules card / `#incentive-list` |
| `L1293-1296` | Bulk messaging card / `#bulk-msg-body` |
| `L1297-1300` | Cohorts + CSAT grid / `#cohort-body`, `#csat-body` |

### JavaScript — referral (early block)
| Lines | Symbol |
|---|---|
| `L3773-3776` | Referral program section comment |
| `L3854-3859` | `getReferralCode(riderId)` — **dead** |
| `L3860-3876` | `processReferral(referrerId, refereeId)` |
| `L3877-3896` | `renderReferralProgram()` |
| `L3897-3906` | `saveReferralConfig()` |
| `L3907-3918` | `openProcessReferralModal()` |
| `L3919-3927` | `commitProcessReferral()` |
| `L3928-3931` | `getRiderWallet(d)` |
| `L3932-3940` | `creditRiderWallet(riderId, amount, reason, actorNote)` |

### JavaScript — promos, incentives, tiers, messaging, cohorts, CSAT
| Lines | Symbol |
|---|---|
| `L13488-13494` | Promo engine section comment |
| `L13495-13500` | `DB.promos` seed |
| `L13501-13505` | `promoROI(p)` |
| `L13506-13528` | `renderPromoList()` |
| `L13529` | `pausePromo(i)` |
| `L13530` | `resumePromo(i)` |
| `L13531-13548` | `openNewPromo()` |
| `L13549-13562` | `commitNewPromo()` |
| `L13564-13569` | `DB.incentives` seed |
| `L13570-13578` | Automatic-tier section comment |
| `L13579` | `TIER_RANK` |
| `L13580-13586` | `parseJoinedDate(s)` |
| `L13587-13594` | `driverTenureDays(d)` |
| `L13595-13601` | `computeDriverTier(d)` |
| `L13602-13632` | `recalcDriverTiers(silent)` |
| `L13633-13640` | `manualRecalcTiers()` |
| `L13645-13660` | `recalcRiderTiers(silent)` |
| `L13662-13663` | `incentiveEarnedCount`, `incentiveTotalPaid` |
| `L13664-13687` | `renderIncentives()` |
| `L13688-13701` | `openAwardIncentiveModal(incentiveId)` |
| `L13702-13713` | `commitAwardIncentive(incentiveId)` |
| `L13714-13723` | `addIncentiveRule()` |
| `L13724-13731` | `removeIncentiveRule(id)` |
| `L13733-13739` | `MSG_SEGMENTS` |
| `L13740-13749` | `renderBulkMsg()` |
| `L13750-13760` | `sendBulkMsg()` |
| `L13762-13785` | `renderCohorts()` |
| `L13786-13796` | `renderCsat()` |
| `L13851-13855` | Referral program DB comment + `DB.referralConfig` |
| `L13888-13890` | `DB.referralLog` seed |
| `L13891-13898` | Bonus-log comment + `DB.driverBonusLog` seed |
| `L14386-14388` | `renderGrowthPage()` |

### Supporting / cross-module
| Lines | Symbol |
|---|---|
| `L2168` | `titles.growth` |
| `L2169` | `subs.growth` |
| `L3122-3131` | `can(permKey)`, `requirePerm(permKey)` |
| `L3133-3155` | `logAction(...)` |
| `L3565` | `nm2(id)` |
| `L3578-3604` | `sendSystemEmail(toId, subject, body, category)` |
| `L4389-4393` | `PLANS` (source of the 86.50 constant) |
| `L5336-5382` | `customSelectHTML(...)` |
| `L5592-5646` | `renderFraudPage()` — referral self-abuse detection (`L5610-5620`, KPI `L5642`) |
| `L8034` | `val(id)` |
| `L8774-8812` | `window.go(...)`, growth branch at `L8799` |
| `L9555` | `REQ_NOW_REF` |
| `L9645-9650` | `fmtReqNowLabel()` |
| `L9661` | `pushOpsNotification(...)` |
| `L10614-10620` | `PAGE_PERMISSIONS.growth` |
| `L10662-10692` | `defaultPagePerms`, `canPage`, `requirePagePerm` |
| `L12463`, `L12622-12623`, `L15618` | Background `recalcDriverTiers` / `recalcRiderTiers` triggers |
| `L15718-15739` | `contributionMargin()` |
| `L15755-15757` | Contribution card lines for promo / referral / incentive |
| `L17785-17817` | `confirmAction`, `cancelConfirm`, `runConfirm` |
| `L17819-17840` | `guardAction(name, builder)` |
| `L20756-20767` | `gateAll(map)` |
| `L20789-20791` | `GATE_SWEEP.saveReferralConfig` |
| `L20833-20838` | `GATE_SWEEP.addIncentiveRule`, `.removeIncentiveRule` |
| `L20855-20856` | `GATE_SWEEP.sendBulkMsg` |
| `L20877-20879` | `GATE_SWEEP.pausePromo` |
| `L20898-20903` | `installGateSweep()` + invocation |
