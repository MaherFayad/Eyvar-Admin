# Settings Tab: Pricing & rate card (+ Operational data window)

> **Source file** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page** `settings` (`#p-settings`, L1416–2048)
> **Pane id** `#stab-pricing` — HTML **L1717–1725**
> **Tab button** L1435 (`switchSettingsTab('pricing',this)`), group "Operations" (L1425)
> **Render fns** `renderPricing()` **L21622–21719**; `pricingBoot()` **L21772–21775**
> **Data module** "PRICING ENGINE — LAUNCH RATE CARD FOR THE SAUDI MARKET", L21413–21775

> ⚠ **Scope correction (verified).** The brief pairs `renderWindowSettings()` with this tab. It is **not** in this pane. `renderWindowSettings()` (L20492–20513) writes into `#window-body`, which lives at **L1759 inside `#stab-integrity`** (Data integrity tab, pane L1750–1768). It is documented in §15 of this file for completeness, but it belongs to the Data-integrity tab, not to Pricing. `#stab-pricing` contains exactly **one** mount point: `#pricing-body` (L1724).

---

## 1. Purpose

Presents the versioned, effective-dated rate card (`DB.rateCard`) as a **read-mostly control surface**: the live card's numbers, a worked commuter cost table, the commitment-discount ladder, the margin floors, the version history with a propose/approve workflow, and the list of active surge suspensions.

Stated design intent, verbatim from the pane description (L1721):
> "Versioned, effective-dated, simulated before approval and never edited in place. Operations can suspend surge but cannot raise a price — the asymmetry is deliberate: an ops intervention is a safety action, and safety actions only ever reduce what a customer pays."

**Verified reality:** the tab is *display + workflow theatre*. Nothing outside the pricing module reads `DB.rateCard`; no live trip, quote or invoice in the panel is priced from it. See §9.

---

## 2. Layout map

| Order | Element | Built at | Container |
|---|---|---|---|
| 1 | Panel head card — 💰 icon, title "Pricing & rate card", description | L1718–1723 (static HTML) | `.card` |
| 2 | `<div id="pricing-body">` — everything below is injected | L1724 (static), filled L21718 | `.card` |
| 2a | **Live card summary block** — version badge, effective date, VAT note, class table, commission/return-leg/surge-cap strip, rationale prose | L21626–21653 | `#pricing-body` |
| 2b | **"💰 What this actually costs a commuter"** — 6-row example table + prose | L21654–21680 | `#pricing-body` |
| 2c | **"📶 Commitment ladder"** — discount strip + prose | L21682–21689 | `#pricing-body` |
| 2d | **"🛡 Floors and guardrails"** — 5 static bullet rules | L21691–21701 | `#pricing-body` |
| 2e | **"🗂 Versions"** — header + `Propose a change` button, live row + up to 6 history rows with per-draft `Approve` button | L21703–21711 | `#pricing-body` |
| 2f | **"🛑 Surge suspensions"** — header + `Suspend a zone` button, active suspension rows or empty state | L21712–21717 | `#pricing-body` |

`renderPricing()` writes the whole pane in one `innerHTML` assignment at **L21718**.

---

## 3. Settings fields — EVERY field

**There are ZERO persistent editable fields rendered in `#stab-pricing`.** Every number on the pane is read-only text. All input happens inside the two modals (§6).

### 3a. Fields in the "Propose a rate card change" modal — `openRateCardChange()` L21743–21761

| id | Label | Control | Default | Unit | Range / step | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `rc-base` | Economy base | `<input type=number>` | `DB.rateCard.classes.economy.base` = **5.00** (L21438) | SAR | `step=0.25`, no min/max | `parseFloat(...)||cls.economy.base` — L21765. Blank/NaN/**0** silently reverts to current value (`0` is falsy) | `draft.classes.economy.base` in `DB.rateCardHistory[0]` (L21561) | Only the draft's own `simulation` (L21560) and the Versions list text. Reaches `DB.rateCard` only via `approveRateCard()` |
| `rc-km` | Economy per km | number | `.perKm` = **1.20** | SAR/km | `step=0.05` | same falsy-revert bug (L21766) | draft `classes.economy.perKm` | same |
| `rc-min` | Economy per min | number | `.perMin` = **0.40** | SAR/min | `step=0.05` | same (L21767) | draft `classes.economy.perMin` | same |
| `rc-minfare` | Minimum fare | number | `.minFare` = **12.00** | SAR | `step=0.5` | same (L21768) | draft `classes.economy.minFare` | same |
| `rc-note` | Why | `<input type=text>`, placeholder "Cost shock, competitive response, margin correction…" | empty | — | free text | **none** — empty note accepted | `draft.note` (L21560) | Stored only; **never rendered anywhere.** See §13 |

> **Comfort class is not editable.** The modal exposes only `economy`. `comfort` values can never be changed through the UI.

### 3b. Fields in the "Suspend surge" modal — `openSuspendSurge()` L21720–21735

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `ss-zone` | Zone | `customSelectHTML` custom dropdown (`csel-ss-zone`) | `zones[0]` | — | `Object.keys(DB.zones||{}).slice(0,8)` — **see §13 bug**; fallback list `['RUH-CENTRAL','RUH-NORTH']` | `||'RUH-CENTRAL'` on commit (L21737) | `DB.surgeSuspensions[0].zoneId` (L21536) | Display list only — see §9 |
| `ss-reason` | Reason (recorded) | text, placeholder "e.g. stadium event, flooding, incident" | empty | — | free text | none; empty → `'ops intervention'` (L21536) | `.reason` | Suspension row text + audit summary |
| `ss-hours` | Hours (max 12) | number | **6** | hours | `min=1 max=12` (attribute only) | `parseInt(...)||6` (L21739) then **hard clamp** `Math.min(hours||6,12)` in `suspendSurge()` L21535. Negative/zero → `6`. Values >12 clamped to 12 | `.expiresAtMs = nowMs()+h*3600000` (L21537) | Row's "expires in" text; `effectiveSurge()` predicate (never called) |

---

## 4. Tables & lists

### 4.1 Live rate card table — L21632–21641
Row source: `['economy','comfort'].map(k => rc.classes[k])`. Fixed 2 rows. No add/edit/delete. No empty state (keys are hardcoded).

| # | Column | Value expression |
|---|---|---|
| 1 | Class | `x.label` (bold) |
| 2 | Base | `x.base.toFixed(2)` |
| 3 | Per km | `x.perKm.toFixed(2)` |
| 4 | Per min | `x.perMin.toFixed(2)` |
| 5 | Minimum | `x.minFare.toFixed(2)` |
| 6 | Cancellation | `x.cancelFee.toFixed(2)` + `"after N min free"` from `x.freeWaitMin` |
| 7 | Waiting | `x.waitPerMin.toFixed(2)` + `"/min"` |

### 4.2 Commuter cost examples — L21654–21673
Row source: nested loop `PRICING_EXAMPLES × ['economy','comfort']` → **6 rows, always**. Read-only, no actions, no empty state.

| # | Column | Value |
|---|---|---|
| 1 | Journey | `ex.label` + `"<km> km · <min> min"` |
| 2 | Class | `rc.classes[cls].label` |
| 3 | On-demand / leg | `fareFor(cls,km,min).total` |
| 4 | Weekly plan | `planQuote(cls,km,min,'weekly',true).price` |
| 5 | Monthly plan | `planQuote(...,'monthly',true).price` (bold) |
| 6 | Monthly saving | `m.saving.toFixed(0)` + `" saved"`, green |
| 7 | Margin | `m.marginPct.toFixed(1)+'%'`; red + `" ⛔ below floor"` when `m.belowFloor` |
| 8 | Captain | `m.captainPerEngagedHour.toFixed(0)+'/hr'` |

### 4.3 Commitment ladder strip — L21683–21686
`Object.keys(rc.planDiscountPct)` → `weekly −12%`, `biweekly −16%`, `monthly −20%`. Not a table; no interaction.

### 4.4 Versions list — L21702–21711

| Row | Source | Content | Action |
|---|---|---|---|
| Live row | `DB.rateCard` | `version · live · from <effectiveFrom>` + `· simulated <deltaPct>% rider impact on <trips> trips` when `rc.simulation` truthy | none |
| History rows | `DB.rateCardHistory.slice(0,6)` | `version · status` + `· <deltaPct>% on <trips> trips` **or** `· no simulation` | `Approve` button (`btn p sm`) **only when `h.status==='draft'`** → `approveRateCard(h.version)` |
| Empty state | — | `"No other versions."` (ghost) | — |

`DB.rateCardHistory` is initialised **empty** (L21463) and is never seeded — on first load the list shows the empty state. No delete, no edit, no pagination; hard cap of 6 shown with **no "…and N more" affordance** (contrast the rota gap list, which does have one).

### 4.5 Surge suspensions list — L21712–21717
Row source: `DB.surgeSuspensions.filter(s => s.expiresAtMs > nowMs())` — the filter runs **twice** (once for the length check, once to map).
Row content: `<b>zoneId</b> — reason · expires in <fmtAge(expiresAtMs-nowMs())>`.
Empty state: `"No active suspensions — surge is running to cap."`
**No cancel/lift action.** Once suspended, the only way out is expiry — deliberate per the module comment L21531–21533, but it also means a mistaken suspension cannot be undone.

---

## 5. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit key | Confirms? |
|---|---|---|---|---|---|---|
| `Propose a change` (L21704) | `openRateCardChange()` L21743 | Opens modal, pre-fills the 4 economy fields from `DB.rateCard.classes.economy` | none | **none** | none | no |
| `Simulate & propose` (modal foot, L21759) | `commitRateCardChange()` L21762 | Deep-copies `DB.rateCard.classes`, overwrites 4 economy values, calls `proposeRateCard()`, closes modal, re-renders, toasts `📊 <version> proposed — rider impact <n>% on <n> trips. A second person must approve.` | `DB.rateCardHistory.unshift(draft)` (L21561) | **none** — `requirePerm` never called | `rate_card_proposed` (L21562) — **no label in ACTION_LABELS** | no |
| `Approve` (per draft row, L21707) | `approveRateCard(version)` L21582, **wrapped by `guardAction`** L21601–21615 | Guard modal first. Then: (a) refuses if `draft.proposedBy===CURRENT_USER_ID` → toast `⛔ You proposed this card — a second person must approve it` + logs `rate_card_self_approval_blocked`, returns; (b) refuses if `!draft.simulation||!draft.simulation.trips` → toast `⛔ No simulation attached…`, returns (**no audit entry**); (c) marks the outgoing card `status='superseded'`, sets `effectiveTo=fmtReqNowLabel()`, unshifts a deep copy into history, sets `draft.status='live'`, `approvedBy=CURRENT_USER_ID`, `effectiveFrom=fmtReqNowLabel()`, assigns `DB.rateCard=draft`, re-renders, toasts `✅ <version> is live` | `DB.rateCard`, `DB.rateCardHistory` | **none** | `rate_card_approved` **or** `rate_card_self_approval_blocked` — **neither labelled** | **yes** — `guardAction` dialog, `danger:true` |
| `Suspend a zone` (L21713, `btn sm danger`) | `openSuspendSurge()` L21720 | Opens modal | none | **none** | none | no |
| `Suspend` (modal foot, L21734, `btn danger sm`) | `commitSuspendSurge()` L21736 → `suspendSurge(z,r,h)` L21534, **wrapped by `guardAction`** L21543–21553 | Guard modal, then unshifts a suspension record, logs, re-renders, toasts `🛑 Surge suspended in <zone> for <h> hours` | `DB.surgeSuspensions` | **none** | `surge_suspended` (L21538) — **no label** | **yes** — guard dialog |
| `Cancel` (both modals) | `closeModal()` | closes | none | — | — | — |

### 5a. Guard dialog contents — verbatim

**`suspendSurge` guard** (L21545–21553):
- title: `Suspend surge in <zoneId>`
- summary: `Riders in this zone pay standard fares immediately.`
- consequences: 1. `Takes effect at once — no approval needed, this is a safety lever.` 2. `Expires automatically after at most 12 hours so it cannot quietly become permanent policy.` 3. `Supply may thin out while it is suspended; watch the unmatched-request rate.` 4. `If the same zone keeps needing this, it is a base-fare problem for Pricing, not an ops one.`
- confirmLabel: `Suspend surge`

**`approveRateCard` guard** (L21601–21615):
- title: `Approve rate card <version>`, `danger:true`
- summary: `Simulated on <n> real trips: rider cost moves <deltaPct>%.` — or, when no simulation, `<b style="color:var(--red)">No simulation attached.</b>`
- consequences: 1. `Every new trip prices under this card from the moment it goes live.` 2. `Trips already booked keep the version they were priced under — nothing is repriced retroactively.` 3. `The previous card is retained as superseded, not deleted.` 4. `You cannot approve a card you proposed yourself.`
- confirmLabel: `Approve and publish`

> Consequence #1 is **factually false in this build** — see §9/§13.

---

## 6. Modals opened

### 6.1 `openRateCardChange()` — L21743–21761
- **Title:** `Propose a rate card change`
- **Close:** `✕` → `closeModal()`
- **Intro prose (L21747–21749):** "The proposal is simulated against real trips before anyone can approve it, and a second person must approve. Nothing already booked is repriced."
- **Fields:** `rc-base`, `rc-km`, `rc-min`, `rc-minfare` in a `.g2` grid; `rc-note` below (§3a)
- **Footer:** `Cancel` → `closeModal()`; `Simulate & propose` (`btn p sm`) → `commitRateCardChange()`

### 6.2 `openSuspendSurge()` — L21720–21735
- **Title:** `Suspend surge`
- **Close:** `✕` → `closeModal()`
- **Fields:** `ss-zone` (custom select), `ss-reason`, `ss-hours` (§3b)
- **Footer:** `Cancel`; `Suspend` (`btn danger sm`) → `commitSuspendSurge()`

Both use the shared `#modal-content` / `#modal-overlay` shell.

---

## 7. Rules / policy logic — written out exactly

### 7.1 `fareFor(cls,km,min,opts)` — L21467–21480
```
c    = DB.rateCard.classes[cls] || DB.rateCard.classes.economy
raw  = c.base + km*c.perKm + min*c.perMin
fare = max(raw, c.minFare)
mult = opts.surge || 1
if (opts.isPlanLeg) mult = 1          // structurally excluded
returns { base, distance:r2(km*perKm), time:r2(min*perMin),
          beforeMin:r2(raw), minApplied:(raw<minFare),
          surgeMult:mult, surge:r2(fare*(mult-1)), total:r2(fare*mult) }
```
Surge is applied to the **post-minimum** fare, so the minimum fare is also multiplied.

### 7.2 `planLegPrice(cls,km,min)` — L21481
`fareFor(cls,km,min,{isPlanLeg:true}).total` — surge can never apply.

### 7.3 `planQuote(cls,km,min,cadence,roundTrip)` — L21484–21510
```
legs        = {weekly:5, biweekly:10, monthly:22}[cadence] || 22
one         = planLegPrice(...)
perDay      = roundTrip ? r2(one + one*returnLegFactor) : one       // 0.90
listPrice   = r2(perDay * legs)
disc        = planDiscountPct[cadence] || 0                          // 12/16/20
price       = r2(listPrice * (1 - disc/100))
legCount    = legs * (roundTrip ? 2 : 1)
driverShare = (100 - commission.subscription)/100                    // 0.80
captainCost = r2(price * driverShare)
platformCost= r2(price*(paymentFeePct/100) + supportCostPerSubscriber + price*(emergencyReservePct/100))
breakEven   = r2(captainCost + platformCost)
floor       = r2(breakEven * (1 + targetMarginPct/100))
marginSar   = r2(price - breakEven)
marginPct   = price ? r2((price-breakEven)/price*100) : 0
belowFloor  = price < floor
captainPerEngagedHour = min ? r2((captainCost/legCount)/(min/60)) : 0
onDemandEquivalent    = r2(fareFor(cls,km,min).total * legCount)
saving                = r2(onDemandEquivalent - price)
```

### 7.4 `planFloorCheck(cls,km,min,cadence,roundTrip,proposedPrice)` — L21512–21518
```
q     = planQuote(...)
price = proposedPrice || q.price
returns { ok: price >= q.floor, price, floor:q.floor, breakEven:q.breakEven,
          shortfall: r2(max(0, q.floor - price)), quote:q }
```
Comment above it (L21511): *"The check that blocks a publish. A warning gets clicked through; a block does not."*
**It blocks nothing — the function has zero call sites (§13).**

### 7.5 `surgeCapFor(cityCode)` — L21520–21522
`(DB.rateCard.surge.capByCity || {})[cityCode || 'RUH'] || 2.0`

### 7.6 `effectiveSurge(cityCode,zoneId,requested)` — L21523–21530
```
sus = DB.surgeSuspensions.filter(s => s.zoneId===zoneId && s.expiresAtMs>nowMs())
if (sus.length) return { multiplier:1, suppressed:true, reason:sus[0].reason,
                         expiresIn: fmtAge(sus[0].expiresAtMs - nowMs()) }
cap = surgeCapFor(cityCode)
return { multiplier: min(requested||1, cap), capped:(requested||1)>cap, cap }
```
**Zero call sites (§13).** This is the ONLY function that would connect `surgeSuspensions` or `capByCity` to a price.

### 7.7 `suspendSurge(zoneId,reason,hours)` — L21534–21542
```
h = min(hours || 6, 12)
DB.surgeSuspensions.unshift({ zoneId, reason: reason||'ops intervention',
    setBy: CURRENT_USER_ID, startedAtMs: nowMs(), expiresAtMs: nowMs()+h*3600000 })
logAction('surge_suspended','pricing',zoneId,
  'Surge suspended in '+zoneId+' for '+h+'h — '+(reason||'no reason given')
  +'. Expires automatically; a standing suspension must go to Pricing as a base-fare question.')
renderPricing(); toast(...)
```
Policy comment L21531–21533: *"Operations can only ever make a price lower, and only temporarily. A suspension that never expires is an unapproved permanent price change wearing a safety badge."*
There is **no sweeper** that deletes expired records — they accumulate forever and are merely filtered out of the view.

### 7.8 `proposeRateCard(changes,note)` — L21555–21565
```
draft = deep copy of DB.rateCard
for each key in changes: draft[key] = changes[key]     // shallow, top-level only
draft.version = 'RC-DRAFT-' + (DB.rateCardHistory.length + 1)
draft.status='draft'; draft.proposedBy=CURRENT_USER_ID; draft.approvedBy=null
draft.note = note||''; draft.simulation = simulateRateCard(draft)
DB.rateCardHistory.unshift(draft)
logAction('rate_card_proposed','pricing',draft.version,'Rate card <v> proposed — simulation attached')
```
⚠ **Version-id collision:** `'RC-DRAFT-'+(length+1)` is derived from array length. Approving unshifts the superseded live card into the same array, so the counter can repeat a name already in use. Two drafts with the same `version` make `approveRateCard`'s `.find()` pick the first match, not necessarily the one clicked.

### 7.9 `simulateRateCard(card)` — L21567–21581
```
trips = values(DB.trips).filter(t => /done/i.test(t.status||'') && t.km && t.min).slice(0,300)
if (!trips.length) return { trips:0 }
for each trip:
   cls = /comfort/i.test(t.kind||'') ? 'comfort' : 'economy'
   km  = parseFloat(t.km)||0 ; mn = parseFloat(t.min)||0
   before += parseFloat(t.fare)||0
   after  += max(c.base + km*c.perKm + mn*c.perMin, c.minFare)
return { trips:n, riderBefore:r2(before), riderAfter:r2(after),
         deltaPct: before ? r2((after-before)/before*100) : 0 }
```
Notes: `t.kind` for a subscription trip is `'Subscription'` (L2671), so **every subscription trip is simulated as `economy`** regardless of actual class. Historic `t.fare` came from an entirely different pricing model (§10), so `deltaPct` measures the gap between two unrelated models, not the impact of the proposed change.

### 7.10 `approveRateCard(version)` — L21582–21600
Rules in order, exactly:
1. `draft` not found → silent `return` (no toast, no log).
2. `draft.proposedBy === CURRENT_USER_ID` → **four-eyes block**, toast `⛔ You proposed this card — a second person must approve it`, `logAction('rate_card_self_approval_blocked',…)`, return.
3. `!draft.simulation || !draft.simulation.trips` → toast `⛔ No simulation attached — a price nobody modelled cannot be approved`, return. **No audit entry.**
4. Otherwise: supersede + publish as described in §5.

> The four-eyes check is trivially defeated by `switch_user` (the panel's acting-user switcher, `ACTION_LABELS` L2912). `CURRENT_USER_ID` is client state.

### 7.11 The 5 "Floors and guardrails" bullets — L21692–21700, verbatim
1. **Break-even floor blocks publishing.** Captain cost + payment fees + support cost + emergency-cover reserve, plus a **12%** target margin. A plan below it cannot go live — a warning would just be clicked through.
2. **Emergency-cover reserve (3.5%)** is in the cost basis because the same-captain promise has a real recurring price: the replacement premium that is not recovered from the absent captain.
3. **Surge is capped at 2.0×** and is structurally excluded from plan legs — not a toggle an operator can reach.
4. **Ops can suspend surge, never raise it**, and the suspension expires within 12 hours.
5. **Four eyes and a simulation** are required to publish a new card. You cannot approve your own proposal.

Bullets 1 and 3 are **prose only**: nothing enforces the floor (`planFloorCheck` uncalled) and nothing applies the cap (`effectiveSurge` uncalled). Bullets 4 and 5 are real code.

---

## 8. Full enumerations

### 8.1 `DB.rateCard` — COMPLETE shape and every value (L21431–21462)

| Path | Value | Notes |
|---|---|---|
| `version` | `'RC-2026-08-01'` | |
| `effectiveFrom` | `'2026-08-01'` | |
| `status` | `'live'` | |
| `currency` | `'SAR'` | **never read anywhere** |
| `vatIncluded` | `true` | **never read anywhere** |
| `approvedBy` | `null` | set only by `approveRateCard` |
| `proposedBy` | `null` | set only by `proposeRateCard` |
| `classes.economy.label` | `'Economy'` | |
| `classes.economy.base` | `5.00` | SAR |
| `classes.economy.perKm` | `1.20` | SAR/km |
| `classes.economy.perMin` | `0.40` | SAR/min |
| `classes.economy.minFare` | `12.00` | SAR |
| `classes.economy.cancelFee` | `8.00` | SAR — **display only**; real policy is `DB.cancellationPolicy` (`renderCancellationPolicy` L7381) |
| `classes.economy.freeWaitMin` | `5` | minutes — display only |
| `classes.economy.waitPerMin` | `0.50` | SAR/min — display only |
| `classes.comfort.label` | `'Comfort'` | |
| `classes.comfort.base` | `8.00` | |
| `classes.comfort.perKm` | `1.75` | |
| `classes.comfort.perMin` | `0.55` | |
| `classes.comfort.minFare` | `18.00` | |
| `classes.comfort.cancelFee` | `12.00` | display only |
| `classes.comfort.freeWaitMin` | `5` | display only |
| `classes.comfort.waitPerMin` | `0.75` | display only |
| `commission.onDemand` | `22` | % — **display only**, used in no calculation |
| `commission.subscription` | `20` | % — used by `planQuote` only |
| `returnLegFactor` | `0.90` | `planQuote` only |
| `planDiscountPct.weekly` | `12` | % |
| `planDiscountPct.biweekly` | `16` | % |
| `planDiscountPct.monthly` | `20` | % |
| `surge.capByCity.RUH` | `2.0` | |
| `surge.capByCity.JED` | `2.0` | **never read** — `surgeCapFor` is always called with `'RUH'` |
| `surge.minMultiplier` | `1.0` | **never read anywhere** |
| `surge.appliesToPlanLegs` | `false` | comment `/* never. not a toggle. */`. Read only at L21646 to colour a label; the exclusion itself is hardcoded in `fareFor` L21472 |
| `floors.targetMarginPct` | `12` | % |
| `floors.supportCostPerSubscriber` | `9.00` | SAR flat per plan period |
| `floors.paymentFeePct` | `2.2` | % |
| `floors.emergencyReservePct` | `3.5` | % |
| `simulation` | added at boot by `pricingBoot()` L21773 | `simulateRateCard(DB.rateCard)` — simulates the live card **against itself**, so `deltaPct` measures the live card vs the historic `t.fare` values |

Inline design commentary: L21442–21446 (commission), L21447–21449 (return leg), L21450–21452 (ladder). On the 20% subscription commission: *"18% left the plan margin at 11.2%, under the 12% target, because captain cost is a percentage of price and therefore caps the margin arithmetically."*

### 8.2 Companion state
- `DB.rateCardHistory = []` — L21463. Empty at boot, never seeded.
- `DB.surgeSuspensions = []` — L21464. Empty at boot, never seeded.
- `PRICING_EXAMPLES` — L21617–21621: `{label:'Short commute',km:5,min:12}`, `{label:'Typical commute',km:10,min:20}`, `{label:'Long commute',km:18,min:32}`.

### 8.3 Surge suspension record shape (L21536–21537)
| Field | Value |
|---|---|
| `zoneId` | from modal |
| `reason` | string, defaults `'ops intervention'` |
| `setBy` | `CURRENT_USER_ID` |
| `startedAtMs` | `nowMs()` |
| `expiresAtMs` | `nowMs() + h*3600000` |

No `id` field. Records are not addressable, which is why there is no lift/cancel action.

### 8.4 Rate-card draft record shape (adds to the copied card, L21558–21560)
`version` (`RC-DRAFT-n`), `status` (`draft`→`live`), `proposedBy`, `approvedBy`, `note`, `simulation` (`{trips,riderBefore,riderAfter,deltaPct}` or `{trips:0}`). On supersession the outgoing card also gains `effectiveTo` (L21593).

### 8.5 Audit keys emitted by this tab
| Key | Line | In `ACTION_LABELS`? |
|---|---|---|
| `rate_card_proposed` | 21562 | ❌ |
| `rate_card_approved` | 21597 | ❌ |
| `rate_card_self_approval_blocked` | 21587 | ❌ |
| `surge_suspended` | 21538 | ❌ |

All four use `entityType:'pricing'` — a type used nowhere else in the file.

---

## 9. Consumption check — is each setting actually read anywhere?

**Method:** grepped every consumer of `DB.rateCard`, `fareFor`, `planLegPrice`, `planQuote`, `planFloorCheck`, `surgeCapFor`, `effectiveSurge`, `DB.surgeSuspensions`, `capByCity` across all 21857 lines.

| Setting / function | Read by | Dead? |
|---|---|---|
| `DB.rateCard.classes.*` (base/perKm/perMin/minFare) | `fareFor` L21469 → only `renderPricing` L21656 + `planQuote` L21486/21501/21502; `simulateRateCard` L21577; `openRateCardChange` L21744; `commitRateCardChange` L21763 | **Dead outside the Pricing tab.** No live trip, quote, invoice or request uses it |
| `classes.*.cancelFee`, `.freeWaitMin`, `.waitPerMin` | `renderPricing` L21636–21638 only | **Dead** — display strings |
| `commission.onDemand` | `renderPricing` L21643 only | **Dead** |
| `commission.subscription` | `planQuote` L21493 + `renderPricing` L21643 | Alive only inside the tab |
| `returnLegFactor` | `planQuote` L21487 + `renderPricing` L21644 | Alive only inside the tab |
| `planDiscountPct` | `planQuote` L21489 + `renderPricing` L21684–21685 | Alive only inside the tab |
| `floors.*` | `planQuote` L21492 + `renderPricing` L21695/21697 | Alive only inside the tab |
| `surge.capByCity` | **only** `surgeCapFor()` L21521 | `surgeCapFor` is called **only** at L21645 and L21693 — both `renderPricing` display strings, both hardcoding `'RUH'`. Its only other potential consumer, `effectiveSurge`, has no call sites |
| `surge.minMultiplier` | nothing | **Fully dead** |
| `surge.appliesToPlanLegs` | `renderPricing` L21646 (colour + label only) | **Dead as a control** |
| `currency`, `vatIncluded` | nothing | **Fully dead** |
| `DB.surgeSuspensions` | `effectiveSurge` L21524 (uncalled) + `renderPricing` L21712–21713 (display) | **Dead as a price control.** The record is written and displayed and changes no price |
| `planFloorCheck()` | nothing | **Fully dead** — zero call sites |
| `effectiveSurge()` | nothing | **Fully dead** — zero call sites |
| `planLegPrice()` | `planQuote` L21486 only | Internal |
| `PRICING_EXAMPLES` | `renderPricing` L21654 only | Internal |
| `DB.rateCardHistory` | `proposeRateCard`, `approveRateCard`, `renderPricing`, the `approveRateCard` guard builder L21604 | Internal |

### 9.1 The claim, independently verified

> **CONFIRMED: `capByCity` and `surgeSuspensions` never reach `currentSurgeMultiplier()`.**

`currentSurgeMultiplier()` lives at **L12389–12399**, in the *Quick Rides* module, and reads a completely different pair of keys:
```js
function currentSurgeMultiplier(){
  var cfg=DB.surgeConfig;                              // L13861 {enabled:true,capMultiplier:2.5}
  if(!cfg||!cfg.enabled)return 1;
  var now=REQ_NOW_REF,hour=now.getHours(),day=WEEKDAYS[now.getDay()];
  var mult=1;
  (DB.surgeSchedule||[]).forEach(function(s){          // L13883 three time-window rules
    if(!s.enabled)return;
    if(s.days.indexOf(day)<0)return;
    if(hour>=s.startHour&&hour<s.endHour)mult=Math.max(mult,s.multiplier);
  });
  return Math.min(mult,cfg.capMultiplier||2.5);
}
```
No reference to `DB.rateCard`, `capByCity`, `surgeSuspensions`, `surgeCapFor` or `effectiveSurge`. Its callers are `quickRideFare()` L12404 and the new-request fare preview L2477. **Suspending surge in the Pricing tab has zero effect on the multiplier any live quote uses.** The real cap is `DB.surgeConfig.capMultiplier = 2.5`, edited on the **Pricing Plan** page (`#surge-cap`, `renderSurgeSchedule` L12283) — not the 2.0 the Pricing tab advertises.

> **CONFIRMED: `DB.rateCard` has no consumers outside the pricing module (L21413–21775).**

---

## 10. Cross-module effects

### 10.1 FOUR disjoint pricing models — independently verified

| # | Model | Data | Entry point | Actually prices |
|---|---|---|---|---|
| 1 | **Rate card** (this tab) | `DB.rateCard` L21431 | `fareFor` / `planQuote` L21467/21484 | **Nothing.** Display only |
| 2 | **Quick-ride types + schedule surge** | `DB.quickRideTypes` L13908–13912 (`economy` 2.50/1.10/0.35, `comfort` 4.00/1.60/0.50, `large` 6.00/2.10/0.65) × `DB.surgeConfig` L13861 + `DB.surgeSchedule` L13883 | `quickRideFare()` L12401–12405 via `currentSurgeMultiplier()` L12389 | Live ride-request fare preview (L2477), new-request commit, and the subscription quote's real-distance branch (L4547) |
| 3 | **Plan template rates** | `DB.plans` L2889–2896: `ecoMin`/`ecoKm`/`comfortMin`/`comfortKm` + `eyvarPct`/`discountPct` per cadence | `perTripBaseRate(cadenceKey,vehicleType)` fallback at L4551 | Subscription quote when no route is picked |
| 4 | **Hardcoded history reconstructor** | literals `base=4.00, perKm=1.35, perMin=0.42` L18657 | `buildFareBreakdown(km,min,surge,seed)` L18656–18665 | Every reconstructed historical trip/payment (`reconstructHistory`, `historyBoot`) |

Four different Economy per-km rates coexist: **1.20** (rate card), **1.10** (quick-ride type), **1.10** (plan `ecoKm` weekly) and **1.35** (history reconstructor). The Pricing tab's "What this actually costs a commuter" table therefore does not describe what any rider in this panel is charged.

### 10.2 Other cross-module touch points
- `DB.vatConfig.ratePct` (L13971 = `15`) read at L21632 for the "all prices include 15% VAT" string; falls back to a literal `15`.
- `DB.trips` — `simulateRateCard` L21568 (≤300 `Done` trips).
- `DB.zones` (L13952) — `openSuspendSurge` L21721 (**incorrectly**, §13).
- `CURRENT_USER_ID` — `proposedBy` / `approvedBy` / `setBy`.
- `logAction()` L3133 — 4 keys, all unlabelled.
- `guardAction()` L17819 — 2 registrations (L21543, L21601).
- `renderPricing()` is invoked from `go('settings')` L8819 and from `pricingBoot()` (boot step L21823).

---

## 11. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| Entire `DB.rateCard` seed | 21431–21462 | Demo seed; no persistence layer — reload restores it |
| `PRICING_EXAMPLES` 3 journeys | 21617–21621 | Hardcoded |
| `['economy','comfort']` class list | 21634, 21655 | Hardcoded; a third class in `classes` would not render |
| `surgeCapFor('RUH')` | 21645, 21693 | City hardcoded — a JED operator sees the RUH cap |
| Fallback VAT `15` | 21632 | |
| Fallback zone list `['RUH-CENTRAL','RUH-NORTH']` | 21723 | Placeholder ids matching no real zone |
| Default suspension reason `'ops intervention'` | 21536 | |
| Default hours `6`, hard max `12` | 21535, 21739 | |
| `surgeCapFor` fallback `2.0` | 21521 | |
| `planQuote` legs fallback `22` | 21485 | |
| "Monthly = 22 working days, round trip" | 21675 | Prose |
| "SAR 1,350–1,850 a month" car-ownership anchor | 21676; module header 21422–21424 | Marketing figure, no source |
| `.slice(0,6)` history cap | 21703 | |
| `.slice(0,300)` simulation cap | 21568 | |
| `.slice(0,8)` zone cap | 21721 | |
| Colour literal `#F2F1EE` | 21705, 21715 | Bypasses the CSS-var system used elsewhere |

---

## 12. i18n keys

| Key | Element | Line | Arabic translation present? |
|---|---|---|---|
| `stabgrp.operations` | Nav group label above the tab | 1425 | ✅ L7914 `'العمليات'` |
| `stab.pricing` | Tab button label "Pricing & rate card" | 1435 | ❌ **MISSING** from the `ar` dictionary (L7917–7921) |

**Zero `data-i18n` attributes exist inside `#stab-pricing` (L1717–1725).** The panel title, description and every string produced by `renderPricing()` are English-only, hardcoded in JS template strings — untranslatable without rewriting the renderer.

Missing `stab.*` Arabic keys across the whole settings nav: `stab.pricing`, `stab.ledger`, `stab.rota`, `stab.integrity`, `stab.branding` (5 of 21 tabs).

---

## 13. Gaps, dead code, UNVERIFIED items

### Confirmed bugs
1. **`openSuspendSurge()` zone list is wrong (L21721).** `DB.zones` is an **array** (L13952–13959) of `{name,demand,supply,failures30d}`. `Object.keys(DB.zones||{}).slice(0,8)` on an array returns the index strings `["0","1","2","3","4","5"]`. The dropdown offers `0 … 5`, and a suspension is recorded against `zoneId:"0"`. The fallback branch never fires because `zones.length === 6`. Correct expression: `DB.zones.map(z=>z.name)`.
2. **Falsy-zero reverts in `commitRateCardChange` (L21765–21768).** `parseFloat(val('rc-base'))||cls.economy.base` — entering `0` silently keeps the old value with no feedback. All four numeric fields.
3. **`proposeRateCard` version collision (L21558).** Length-derived draft names can repeat after an approval unshifts two entries.
4. **`draft.note` is write-only (L21560).** Captured from `rc-note`, stored, rendered nowhere. The "Why" behind every proposal is unreachable in the UI.
5. **`proposeRateCard` merges shallowly (L21557).** `draft[k]=changes[k]` replaces whole top-level objects; a partial change object would wipe sibling keys.
6. **No permission gate on any pricing action.** `proposeRateCard`, `approveRateCard`, `suspendSurge` never call `requirePerm()` / `requirePagePerm()`. Compare `setRotaSlot` (L19671) and `saveDataWindow` (L20515), which do gate on `manage_settings`.
7. **Four-eyes is defeatable.** `approveRateCard` compares `draft.proposedBy` to `CURRENT_USER_ID`, which any operator can change via the acting-user switcher.
8. **Guard consequence #1 is false** (L21609) — no trip is priced from `DB.rateCard`.
9. **Expired suspensions are never purged.** `DB.surgeSuspensions` grows unbounded; only the render filters.
10. **Every `comfort` subscription trip simulates as `economy`** (L21571) because `t.kind` is `'Subscription'`.
11. **`.slice(0,6)` on versions has no overflow indicator** (L21703). Drafts 7+ become invisible and therefore unapprovable.

### Dead code
| Item | Line | Status |
|---|---|---|
| `planFloorCheck()` | 21512–21518 | **0 call sites.** The documented "block a publish" rule is unimplemented |
| `effectiveSurge()` | 21523–21530 | **0 call sites.** The only path from `capByCity`/`surgeSuspensions` to a price |
| `DB.rateCard.surge.minMultiplier` | 21458 | Never read |
| `DB.rateCard.currency`, `.vatIncluded` | 21434–21435 | Never read |
| `DB.rateCard.commission.onDemand` | 21446 | Display string only |
| `capByCity.JED` | 21458 | Never read |
| `classes.*.cancelFee` / `.freeWaitMin` / `.waitPerMin` | 21438–21441 | Display only |
| `q.shortfall`, `q.onDemandEquivalent`, `q.listPrice`, `q.perLeg`, `q.legs`, `q.captainCost`, `q.platformCost`, `q.breakEven`, `q.floor`, `q.marginSar` | 21497–21509 | Computed; only `price`, `saving`, `marginPct`, `belowFloor`, `captainPerEngagedHour` are rendered |
| `fareFor` fields `base`,`distance`,`time`,`beforeMin`,`minApplied`,`surgeMult`,`surge` | 21475–21478 | Only `.total` is ever consumed |

### UNVERIFIED
- **Whether a real backend honours `DB.rateCard`.** This is a self-contained HTML file with no network layer for pricing (`DB` is an in-memory object). `UNVERIFIED: no backend present in the artifact.`
- **Whether the tab is intended as a specification rather than a control.** The ledger module states that intent explicitly for itself (L19859–19861). The pricing module makes **no such disclaimer**, and its copy ("live", guard consequence "Every new trip prices under this card") reads as operative. `UNVERIFIED: intent not stated in source; behaviour is display-only as written.`

---

## 14. Line-number index

| Line(s) | What |
|---|---|
| 1425 | Nav group label `stabgrp.operations` |
| 1435 | Tab button, `data-i18n="stab.pricing"` |
| 1717–1725 | `#stab-pricing` pane HTML |
| 1724 | `<div id="pricing-body">` mount point |
| 2477 | Fare preview using `quickRideFare` + `currentSurgeMultiplier` (model #2) |
| 2889–2896 | `DB.plans` — pricing model #3 |
| 4547, 4551 | Subscription quote — models #2 / #3 |
| 7907–7921 | Arabic i18n dictionary (`stab.pricing` absent) |
| 8819 | `go('settings')` calls `renderPricing()` |
| 12283–12320 | `renderSurgeSchedule()` — the *other* surge UI |
| 12389–12399 | `currentSurgeMultiplier()` — model #2's multiplier |
| 12401–12405 | `quickRideFare()` |
| 13861 | `DB.surgeConfig={enabled:true,capMultiplier:2.5}` |
| 13883–13887 | `DB.surgeSchedule` (3 windows) |
| 13908–13912 | `DB.quickRideTypes` |
| 13952–13959 | `DB.zones` — **array**, breaks `openSuspendSurge` |
| 13971 | `DB.vatConfig` |
| 18656–18665 | `buildFareBreakdown()` — pricing model #4 |
| 21413–21429 | Pricing-engine module header comment |
| 21431–21462 | `DB.rateCard` |
| 21463 | `DB.rateCardHistory=[]` |
| 21464 | `DB.surgeSuspensions=[]` |
| 21467–21480 | `fareFor()` |
| 21481 | `planLegPrice()` |
| 21484–21510 | `planQuote()` |
| 21512–21518 | `planFloorCheck()` — dead |
| 21520–21522 | `surgeCapFor()` |
| 21523–21530 | `effectiveSurge()` — dead |
| 21534–21542 | `suspendSurge()` |
| 21543–21553 | `guardAction('suspendSurge')` |
| 21555–21565 | `proposeRateCard()` |
| 21567–21581 | `simulateRateCard()` |
| 21582–21600 | `approveRateCard()` |
| 21601–21615 | `guardAction('approveRateCard')` |
| 21617–21621 | `PRICING_EXAMPLES` |
| 21622–21719 | `renderPricing()` |
| 21720–21735 | `openSuspendSurge()` |
| 21736–21742 | `commitSuspendSurge()` |
| 21743–21761 | `openRateCardChange()` |
| 21762–21771 | `commitRateCardChange()` |
| 21772–21775 | `pricingBoot()` |
| 21823 | Boot registration `{name:'pricing engine',fn:pricingBoot,needs:['rateCard','trips']}` |

---

## 15. Appendix — `renderWindowSettings()` (belongs to the **Data integrity** tab)

> Documented here only because the brief attached it to Pricing. **Pane: `#stab-integrity` L1750–1768; mount `#window-body` L1759.**

**Render fn** `renderWindowSettings()` L20492–20513. **Data** `DB.dataWindow` L20403–20410.

### Field
| id | Label | Control | Default | Unit | Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `win-months` | Operational window (months) | `<input type=number>` | `DB.dataWindow.months` = **13** (L20404) | months | `min=1`, no max | `parseInt(...,10)||13` (L20516) — `0` and NaN fall back to 13 | `DB.dataWindow.months` | `windowStartMs()` L20411, `windowSplit()` L20413+, integrity summary L18582, retention math L18699, per-account labels L20465/20467/20485 |

### Action
| Label | Handler | Effect | Writes | Permission | Audit | Confirms |
|---|---|---|---|---|---|---|
| `Save window` (L20504) | `saveDataWindow()` L20514–20521, **guarded** L20522–20530 | Sets months, logs, re-renders `renderWindowSettings()` + `renderIntegrity()`, toast `✅ Window set to N months` | `DB.dataWindow.months` | ✅ `requirePerm('manage_settings')` L20515 | `edit_data_window` (L20518) — **no label in ACTION_LABELS** | ✅ guard: title *"Change the operational data window"*, `danger:true`, summary *"This governs how much trip history the panel holds for every customer."*, consequences *"Shortening it hides trips agents may still need for live disputes." / "It must not be shorter than the payment provider's dispute window — a dispute you cannot evidence is a dispute you lose." / "Lifetime totals are unaffected; they always come from billing."*, confirmLabel `Save window` |

### Derived read-outs beside the field (L20506–20512)
- `Accounts with older history in billing <n> (expected)` — `Object.keys(DB.riders).filter(id => reconcileEntity(id).expectedGap)`
- `Empty inside the window <n> (alert)` — `.filter(id => reconcileEntity(id).orphan)`, red when non-zero
- Prose: *"Only the second number is a fault: a customer billing knows about with nothing at all inside the window means a failed import or a duplicate profile. The first is how the design is meant to work."*
- Rule prose: *"Rule: longest dispute window + one month."* + `DB.dataWindow.rationale` (L20409): *"12 months for year-on-year comparison + 1 month headroom. Must not be shorter than the payment provider's dispute window."*

### Notes
- `DB.dataWindow.rationale` is displayed but not editable.
- No `max` on the input: `9999` months is accepted.
- `renderWindowSettings()` calls `reconcileEntity()` once per rider **twice** (L20496 and L20497) — O(2n) full reconciliation on every settings-page open.
