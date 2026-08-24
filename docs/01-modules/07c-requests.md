# Module: Requests (subscription sign-ups + instant rides)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Pages:** `requests` → `#p-requests` **L2079–L2120** · `requests-sub-all` → `#p-requests-sub-all` **L2123–L2142** · `requests-instant-all` → `#p-requests-instant-all` **L2144–L2165**
> **Renders:** `renderRequestsPage()` L10071–L10123 · `renderRequestsSubAll(filter, gotoPage)` L10137–L10169 · `renderRequestsInstantAll(filter, gotoPage)` L10183–L10216
> **Module header comment:** L9871–L9882 (two sources, shared chips, status colour coding)
> **Related handlers:** `setReqFilter()` L10034, `toggleSubValueSort()` L10041, `exportRequestsSnapshot()` L9766

---

## 1. Purpose

One queue for the two ways a rider can ask for service:

| Source array | Meaning | Seeded | Generated |
|---|---|---|---|
| `DB.rideRequests` | **Instant ride requests** — on-demand, one trip, SLA measured in seconds | L2786–L2790 (3 records) | +53 by `seedMoreRequests()` L9846–L9849 |
| `DB.subscriptionRequests` | **Subscription sign-ups** — a rider asking for a recurring package; ops must match a driver | L2794–L2800 (5 records) | +40 by `seedMoreRequests()` L9866–L9868 |

Instant requests are matched **automatically** by `tickEngine()` (offer → driver accepts on their own device), with ops intervening only on SLA breach. Subscription requests are matched **manually** by ops, against a payment authorization hold that is captured on assignment or released on timeout.

The card comment at L9871–L9882 documents the status colour coding: `searching → amber (SLA ticking)`, `no_drivers → red (SLA breached)`, `assigned → green (resolved)`, `expired → grey (timed out)`, `pending → blue (subscription awaiting ops)`.

---

## 2. Entry points & routing

| Entry | Line | Effect |
|---|---|---|
| Sidebar `go('requests',this)` | L508 | Title `titles.requests` = `'Requests'` (L2168); subtitle `subs.requests` = `'Instant ride requests + subscription requests — all statuses'` (L2169) |
| `go()` dispatch — `requests` | L8794 | `renderRequestsPage()` |
| `go()` dispatch — `requests-sub-all` | L8804 | `renderRequestsSubAll(<current search box value>)` |
| `go()` dispatch — `requests-instant-all` | L8805 | `renderRequestsInstantAll(<current search box value>)` |
| Card title `📋 Subscription requests` | L2103 | `go('requests-sub-all', null)` — title has `cursor:pointer` and `title="Open full list"` |
| Card title `⚡ Instant ride requests` | L2115 | `go('requests-instant-all', null)` |
| `← Back to requests` (both full-list pages) | L2127, L2148 | `go('requests', null)` |
| Boot | L14588–L14590 | `renderRequestsPage(); renderRequestsSubAll(''); renderRequestsInstantAll('');` |
| Boot seeding | L14557 | `seedMoreRequests()` |
| Deep link from toast — sub | `openSubReqFromToast(sreqId)` L9668–L9673 | `go('requests-sub-all')`, sets the search box to the id, re-renders |
| Deep link from toast — instant | `openInstantReqFromToast(reqId)` L10225–L10230 | `go('requests-instant-all')`, sets the search box, re-renders |
| Live refresh (page visible only) | L12550, L12564, L12609, L9724 | `renderRequestsPage()` on SLA breach, on offer tick, every 5 ticks, and after a sub-window event |
| Cross-module | L2493 (`commitNewRideRequest`), L11877/L11906 (`commitRequestAssign`), L11922 (`cancelRequest`), L12485 (`driverAcceptOffer`) | force a re-render |

**No permission gate on any of the three pages** — none of the three render functions calls `requirePerm` / `requirePagePerm`.

---

## 3. Layout map

```
#p-requests                                                        L2079
├── .ph                                                            L2080–L2088
│   ├── h1 "Requests" + p#requests-page-sub                        L2081  (hardcoded, never updated)
│   └── .br                                                        L2082
│       ├── "Live (local)" pulse chip (title= disclaimer)          L2083–L2085
│       └── button "💾 Export snapshot" → exportRequestsSnapshot() L2086
├── filter chip row                                                L2091–L2098
│   ├── #rfilt-all      "All <span#rfilt-all-cnt>"                 L2092  (.on by default)
│   ├── #rfilt-sub      "📋 Subscription <span#rfilt-sub-cnt>"     L2093
│   ├── #rfilt-instant  "⚡ Instant rides <span#rfilt-instant-cnt>"L2094
│   ├── #rfilt-pending  "⏳ Pending"                                L2095
│   ├── #rfilt-assigned "✅ Assigned"                               L2096
│   └── #rfilt-expired  "⛔ Expired / No drivers"                   L2097
├── .card #req-sub-card                                            L2101–L2110
│   ├── .ch  h2 → go('requests-sub-all')                           L2103
│   │       #rsort-value "💰 Highest value first"                  L2105
│   │       #req-sub-count (b b-blue)                              L2106
│   └── #req-sub-list  (max-height 420px, scroll)                  L2109
└── .card #req-instant-card                                        L2113–L2119
    ├── .ch  h2 → go('requests-instant-all')                       L2115
    │       #req-instant-count (b b-amber)                         L2116
    └── #req-instant-list (max-height 420px, scroll)               L2118

#p-requests-sub-all                                                L2123
├── .ph  h1 "📋 All subscription requests" + p#requests-sub-all-sub L2126
│         button "← Back to requests"                              L2127
└── .card
    ├── .ch  h2 "Subscription requests"                            L2132
    │       input#requests-sub-all-search  (magnifier icon)        L2134
    │       span#requests-sub-all-pagesize-wrap                    L2136
    └── #requests-sub-all-list (max-height 640px, scroll)          L2139

#p-requests-instant-all                                            L2144
├── .ph  h1 "⚡ All instant ride requests" + p#requests-instant-all-sub L2147
│         button "← Back to requests"                              L2148
└── .card
    ├── .ch  h2 "Instant ride requests"                            L2153
    │       input#requests-instant-all-search                      L2155
    │       span#requests-instant-all-pagesize-wrap                L2157
    └── #requests-instant-all-list (max-height 640px, scroll)      L2160
```

---

## 4. Data model & fields

### 4.1 Instant ride request — `DB.rideRequests[]`

| Field | Type | Origin | Read at |
|---|---|---|---|
| `id` | `REQ-nnn` | seed L2787–L2789; `'REQ-'+reqSeq` L9840; manual `'REQ-'+(500+len+rand(400))` L2487 | L9964, L10058, L10143 |
| `rider` | `RDR-nnnn` | seed / `randRider()` L9832 / `#nrr-rider` L2480 | L9966 (`reqRiderCell`), L10146 |
| `pickup` | district string | seed / `randRoute()` L9833 / `#nrr-pickup` | L9967, L10147 |
| `dest` | landmark string | same | L9968, L10148 |
| `type` | `'Economy'` \| `'Comfort'` | seed / `pick(typeCycle)` L9843 / `#nrr-type` | L9969 |
| `waiting` | `'m:ss'` | seed / `randWaiting()` L9843 / `'0:00'` L2488 | L9970, L10058, incremented L12528, L12554 |
| `status` | see §5.1 | seed / loop arg L9846–L9849 / `'searching'` L2488 | everywhere |
| `requestedAt` | `'25 Jun 08:36'` | seed / `ts()` L9844 / `fmtReqNowLabel()` L2488 | L9965 |
| `vip` | bool | `#nrr-vip` L2484 only | L12535, L12503 |
| `offeredTo` | driver id | `sendDriverOffer()` L11991 | L9923, L12560 |
| `offerSecondsLeft` | int | L11992 (`OFFER_WINDOW_SEC`), decremented L12555 | L9923 |
| `declinedBy` | array | `driverDeclineOrTimeout()` L11996–L11997; reset L12570 | L12497 |
| `_locking` | bool | `commitRequestAssign()` L11892 | L9952, L9956, L10009 |
| `claimedBy` / `claimedAt` | string | `assignManually()` L11876, `commitRequestAssign()` L11892 | L9953, L9958 |
| `_alerted` | bool | L12571 | never read after being set — dead |

### 4.2 Subscription request — `DB.subscriptionRequests[]`

| Field | Type | Origin | Read at |
|---|---|---|---|
| `id` | `SREQ-nnn` | seed L2795–L2799; `'SREQ-'+sreqSeq` L9858 | L10003, L10143 |
| `rider` | `RDR-nnnn` | seed / `randRider()` L9858 | L10005, L10145–L10147 |
| `plan` | `'weekly'` \| `'biweekly'` \| `'monthly'` | seed / `pick(planCycle)` L9858 | L10006, L9751 |
| `vehicle` | `'Economy'` \| `'Comfort'` | seed / `pick(vehicleCycle)` L9858 | L10008, L9753 |
| `pickup` / `dest` | strings | seed / `randRoute()` L9859 | L10009, L10148 |
| `preferredTime` | `'07:00 AM'` | seed / generated L9859 | L10010 |
| `requestedAt` | `'25 Jun 07:45'` | seed / `ts()` L9860; rewritten by `reopenSubReq()` L10306 | L10004, L9565 |
| `status` | see §5.2 | seed / loop arg L9866–L9868 | everywhere |
| `notes` | string | seed only (generated rows set `''` L9860) | **never rendered anywhere** — dead field |
| `assignedSub` | `SUB-nnnn` | `materializeSubscription()` L9634 | L10012, L10029 |
| `assignedBy` | operator name | seed / L10288 | never rendered |
| `assignedAt` | string | seed / `'Now'` L10288 | never rendered |
| `expiredAt` | string | seed / L9686; deleted L10305 | never rendered |
| `hold` | `{amount, status, authRef, heldAt, releasedAt?, capturedAt?, paymentId?}` | `ensureHold()` L9593–L9598 | L9639–L9643, L10013 |
| `_reminderSent` | bool | L9691 | L9690 |
| `_locking` / `claimedBy` / `claimedAt` | as above | L10236, L10284 | L10005–L10009 |
| `pendingCorpApproval` | `{corpId, drvId, amount}` | `commitSubReqAssign()` L10277 | L10007, L9979, L9991 |
| `corpApproved` | bool | `approveSubReqCorp()` L9983 | L10272 |

### 4.3 Payment authorization hold

Rationale block L9581–L9592: the original flow charged the rider before a driver was confirmed; the fix is a hotel-style authorization — **hold**, then **capture** on match or **release** on timeout, so no refund is ever needed.

| Function | Line | Behaviour |
|---|---|---|
| `ensureHold(r)` | L9593–L9598 | lazily creates `r.hold = {amount: subReqValue(r), status:'held', authRef:'AUTH-'+seq, heldAt: r.requestedAt}` |
| `releasePaymentHold(r)` | L9599–L9604 | no-op unless `status === 'held'`; sets `released` + `releasedAt`; `logAction('payment_hold_released','subscription_request', …, {status:'held'}, {status:'released'})` |
| `capturePaymentHold(r)` | L9605–L9619 | idempotent (returns existing `paymentId` when already captured); sets `captured` + `capturedAt`; creates `DB.payments['PAY-'+(6000+rand(3900))] = {id, entity: r.rider, type:'Subscription charge', amount, method: rider.payMethod \|\| 'Visa ···'+rand, date: fmtReqNowLabel(), status:'Paid', trip:null}`; `logAction('payment_captured', …)` |
| `holdBadge(r)` | L9639–L9644 | `✓ Captured` (`b-green`) · `Released — no charge` (`b-grey`) · `🔒 Held <SAR>` (`b-blue`), each with an `authRef` tooltip |

### 4.4 Time base

| Constant | Line | Value |
|---|---|---|
| `REQ_NOW_REF` | L9555 | `new Date(2026,5,25,9,14,0)` — matches the dashboard clock; **mutated** by `processSubReqSearchWindow()` L9680 |
| `REQ_MONTHS` | L9556 | `{Jan:0 … Dec:11}` |
| `parseReqTimestamp(s)` | L9557–L9563 | regex `/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{1,2}):(\d{2})/`, **year hardcoded 2026** (L9562) |
| `reqAgeMinutes(requestedAt)` | L9564–L9568 | `Math.max(0, Math.round((REQ_NOW_REF − ts)/60000))`, `null` when unparseable |
| `fmtReqNowLabel()` | L9645–L9650 | `DD Mon HH:MM` from `REQ_NOW_REF` |

---

## 5. Statuses & transition rules

### 5.1 Instant ride requests

| State | Entered when | SLA / timing | Badge (`reqStatusBadge` L9890–L9899) | SLA badge (`reqSlaBadge` L9921–L9930) | Exits to | Actions |
|---|---|---|---|---|---|---|
| `searching` | created (seed L2787, generator L9846, manual L2488) | `waiting` increments 1 s per tick (L12528); offer fires at `waiting >= AUTO_OFFER_DELAY_SEC` (6 s) or `>= 1 s` for VIP (L12535) | `Searching` `b-amber` | `⏱ Approaching SLA` (amber) once `waiting >= 90 s` (L9925–L9927) | → `offered` (L12537) · → `no_drivers` at 180 s (L12544) · removed on manual assign (L11895) | `Assign driver` (L9957), `Cancel` (L9973) |
| `offered` | `sendDriverOffer(r, drvId)` L11989–L11994 | `offerSecondsLeft = OFFER_WINDOW_SEC` (12 s, L11988), decremented per tick (L12555) | `📤 Offered to driver` `b-blue` | `📤 Awaiting <driver>'s response (~Ns)` (blue) (L9923) | → removed + live trip on accept (`driverAcceptOffer` L12476–L12491, chance `0.30 + (rating−3)*0.08` per second, L12561–L12562) · → back to `searching` on decline/timeout (`driverDeclineOrTimeout` L11995–L12010) | assign cell shows `📤 Awaiting driver` (non-actionable, L9954); `Cancel` still available |
| `no_drivers` | `waiting >= 180 s` while `searching` (L12544) | breach is announced once: beep (L12546), toast (L12547), ops notification (L12548), audit `sla_breach` (L12549) | `No drivers` `b-red`; row background `var(--red-lt)` (L9962) | `⚠ SLA breached` (red) (L9922) | self-heals → `offered` whenever a candidate appears; `declinedBy` is cleared first (L12569–L12570) | `Assign driver`, `Cancel` |
| `assigned` | **only** on seeded/generated rows (L9848) | — | `✓ Assigned` `b-green` | none | terminal | only `Rider` (assign cell and Cancel both suppressed, L9951, L9973) |
| `expired` | **only** on generated rows (L9849) | — | `Expired` `b-grey` | none | terminal | `Assign driver`, `Cancel`, `Rider` |

**Note:** the live engine never sets `status='assigned'` — both `driverAcceptOffer()` (L12482) and `commitRequestAssign()` (L11895) **splice the record out** of `DB.rideRequests` and push a record into `DB.liveTrips`. The `assigned`/`expired` rows visible in the UI exist only because `seedMoreRequests()` fabricated them (L9848–L9849).

**Driver-decline side effect** (`driverDeclineOrTimeout` L11995–L12010): appends `offeredTo` to `declinedBy`; increments `drv.declineStreak`; when `getLimit('driver_max_consecutive_declines')` is enabled and the streak reaches it, sets `drv.flaggedForDeclines = true`, writes `logAction('driver_flagged', …)` and pushes an ops notification (L12000–L12006). `driverAcceptOffer()` resets both (L12478).

**Offer candidate rule** — `nextOfferCandidate(r)` L12496–L12507:
```
declined         = r.declinedBy || []
offeredElsewhere = other requests with status 'offered' → their offeredTo    L12498
exclude          = declined ∪ offeredElsewhere        // one driver weighs one offer at a time
elapsedSec       = seconds parsed from r.waiting
effectiveElapsed = r.vip ? 999 : elapsedSec           // VIP searches at max radius immediately
pool = nearestAvailableDrivers(r.rider, exclude.length+6, 'quick', effectiveElapsed)
         .filter(n => !n.live.busy && exclude.indexOf(n.id) < 0)
return r.vip ? pool.sort(by rating desc, then km asc)[0] : pool[0]
```

### 5.2 Subscription requests

| State | Entered when | SLA / timing | Badge | SLA badge (`subReqSlaBadge` L9937–L9947) | Exits to | Actions |
|---|---|---|---|---|---|---|
| `pending` | created (seed L2795, generator L9866); or `reopenSubReq()` L10305 | search window `SUBREQ_SEARCH_HOURS = 2 h` (L9577); reminder at `SUBREQ_REMINDER_HOURS = 1 h` (L9578); demo clock advances `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` min per tick (L9579, applied L9680) | `Pending` `b-blue`; row background `var(--blue-lt)` (L10002) | `🔍 Searching — <h>h <m>m left` (muted) before 1 h; `⏳ Still searching — <h>h <m>m left` (amber) from 1 h; `⚠ Search window ended` (red) at/after 2 h | → `assigned` (`commitSubReqAssign` L10288) · → `expired` at 2 h (L9685–L9688) · → `declined` (`rejectSubReqCorp` L9995) · → held on `pendingCorpApproval` (L10277) | `Assign driver` / `🔒 <claimant>` / `Assigning…` / `✓ Approved`+`✕ Declined`; `Rider` |
| *pending + `pendingCorpApproval`* | package value exceeds the corporate approval threshold (L10272) | none | still `Pending` | as above | → `assigned` via `approveSubReqCorp()` L9977–L9988 · → `declined` via `rejectSubReqCorp()` L9989–L10000 | `✓ Approved`, `✕ Declined` (L10007) |
| `assigned` | `commitSubReqAssign()` succeeds (L10288) | — | `✓ Assigned` `b-green` + `→ <assignedSub>` line (L10012) | none | terminal | `View sub` (L10029), `Rider` |
| `expired` | `reqAgeMinutes >= SUBREQ_SEARCH_HOURS*60` while pending (L9685) — sets `expiredAt`, calls `releasePaymentHold()`, writes `logAction('sub_request_timeout', …)` | auto | `Expired` `b-grey` | none | → `pending` via `reopenSubReq()` (L10302–L10310) | `Reopen` (L10028), `Rider` |
| `declined` | manager declined (`rejectSubReqCorp` L9995) | — | falls through to the generic branch: `<span class="b b-grey">declined</span>` (L9898) | none | terminal | `Rider` only |

**Search-window engine — `processSubReqSearchWindow()` L9679–L9730** (called every tick, L12574):
```
REQ_NOW_REF += SUBREQ_TIME_ACCEL_MIN_PER_TICK minutes                         L9680
for each pending request:
    age = reqAgeMinutes(r.requestedAt);  skip if null                         L9684
    if age >= SUBREQ_SEARCH_HOURS*60:                                         L9685
        r.status = 'expired';  r.expiredAt = fmtReqNowLabel()                 L9686
        releasePaymentHold(r)                                                 L9687
        logAction('sub_request_timeout','subscription_request', …,
                  {status:'pending'}, {status:'expired'})                     L9688
        → justExpired
    else if age >= SUBREQ_REMINDER_HOURS*60 && !r._reminderSent:              L9690
        r._reminderSent = true  → justReminded                                L9691
```
Batched alerts (rationale in the comment at L9674–L9678: multiple crossings in one tick are batched instead of flooding the stack):

| Bucket | Count | Toast | Ops notification |
|---|---|---|---|
| reminders | 1 | `⏳ Still searching for <rider>'s preferred driver (<id>) — 1h in, 1h left before the search closes`, `info`, click → `openSubReqFromToast` (L9697) | `Still searching — <rider>` (L9698) |
| reminders | >1 | `⏳ N subscription requests hit the 1h mark — still searching for preferred drivers` → `go('requests-sub-all')` (L9700–L9701) | `N requests at the 1h mark` (L9702) |
| expiries | any | `playAlertBeep()` first (L9706) | |
| expiries | 1 | `🔴 No driver found for <rider>'s subscription request (<id>) after 2h — search closed, <SAR> hold released, no charge made`, `err` (L9709) | `Search closed — <rider>` (L9710) |
| expiries | >1 | `🔴 N subscription requests auto-closed — no driver found within 2h, <total SAR> in holds released, no charges made` (L9713–L9714) | `N requests auto-closed` (L9715) |

Then, if anything changed: re-render `#p-requests` when visible, `refreshNavCounts()` (L9722–L9726).

`playAlertBeep()` L9731–L9749 — 880 Hz sine via WebAudio, gain ramped 0.0001 → 0.16 → 0.0001 over 0.42 s; wrapped in `try/catch` because browsers block audio before first interaction (comment L9727–L9730).

---

## 6. Scoring / prioritisation formulas

### 6.1 Instant-request urgency — `reqUrgencyScore(r)` L10057–L10061
```
parts = (r.waiting || '0:00').split(':')
secs  = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
score = (r.status === 'no_drivers' ? 100000 : 0) + secs
```
`sortInstantByUrgency(list)` L10062–L10064 sorts **descending** by that score — every breached request outranks every unbreached one (100 000 s ≈ 27.8 h of waiting), then longest-waiting first. Rationale: comment L10054–L10056.

### 6.2 Subscription-request value — `subReqValue(r)` L9750–L9754
```
p = PLANS[r.plan]                       // PLANS at L4389–L4393
if (!p) return 0
return r.vehicle === 'Comfort' ? p.comfort : p.eco
```
Resulting matrix (SAR): weekly 86.50 / 122.50 · biweekly 164.35 / 232.50 · monthly 344.52 / 487.00.
This value is also the authorization-hold amount (L9595) and the price shown under the plan badge (L10007).

### 6.3 Subscription-request order — `sortSubRequests(list)` L10065–L10070
```
if (_reqSubSortByValue) → sort descending subReqValue(b) − subReqValue(a)          L10066
else                    → sort descending (reqAgeMinutes(b) − reqAgeMinutes(a))    L10068
                           // "oldest pending first, so the longest-waiting sign-up bubbles up"
```

### 6.4 Driver acceptance probability (instant offers) — L12561
```
acceptChance = 0.30 + ((drv && drv.rating ? drv.rating : 4) − 3) * 0.08     // evaluated once per second
```
A 5.0★ driver: `0.30 + 2*0.08 = 0.46`/s. A 4.0★ driver: `0.38`/s. Over the 12-second offer window the cumulative accept probability exceeds 99% for any rated driver. This models the driver's own app (comment L12556–L12559), not an ops decision.

### 6.5 Simulated commit failure — `simulateAsyncCommit()` L10260–L10264
```
setTimeout(() => { if (Math.random() < 0.08) onFail(); else onSuccess(); }, 550)
```
An 8% failure rate on every assign, with a 550 ms latency. Rationale at L10252–L10259: to prove the row unlocks, an error toast fires and the button reappears.

### 6.6 Corporate approval threshold — `commitSubReqAssign()` L10272
```
reqCorp    = findCorpForRider(r.rider)                    // fn L4909
reqCorpPol = reqCorp ? getCorpUsagePolicy(reqCorp) : null // fn L6533
if (reqCorpPol && reqCorpPol.requireApprovalAboveSAR
    && r.hold && r.hold.amount > reqCorpPol.requireApprovalAboveSAR
    && !r.corpApproved)  → park as pendingCorpApproval, do not assign
```

---

## 7. KPIs & metrics

There is no KPI tile row on any of the three pages. The counters are chip counts and card badges.

| Element | Id | Formula | Line |
|---|---|---|---|
| All chip count | `rfilt-all-cnt` | `'(' + (allRide.length + allSub.length) + ')'` — **unfiltered totals** | L10081 |
| Instant chip count | `rfilt-instant-cnt` | `'(' + allRide.length + ')'` | L10082 |
| Subscription chip count | `rfilt-sub-cnt` | `'(' + allSub.length + ')'` | L10083 |
| Instant card badge | `req-instant-count` | `filtRide.length` — **after** the status filter | L10084 |
| Subscription card badge | `req-sub-count` | `filtSub.length` — after filter | L10085 |
| Sub full-list subtitle | `#requests-sub-all-sub` | `<all.length> subscription requests total` + (when searching) ` · <rows.length> match "<query>"` | L10152 |
| Instant full-list subtitle | `#requests-instant-all-sub` | `<all.length> instant ride requests total` + ` · <rows.length> match "<query>"` | L10198 |
| Sidebar badge | `sbb-requests` | see §13 | L10119, L9401 |
| Per-row waiting clock | `.js-wait[data-req]` | live-patched from `r.waiting` every tick | L9970, L12576–L12579 |
| Hold amount | — | `subReqValue(r)` (§6.2) | L9595, L9641–L9643 |

**Verified quirks:**
- The `⏳ Pending`, `✅ Assigned` and `⛔ Expired / No drivers` chips have **no count spans** in the markup (L2095–L2097) and no code writes counts to them.
- The `All` chip's count never changes when a status filter is applied — it always shows the full corpus (L10081).
- No page shows a total value, average wait, breach rate or conversion metric.

---

## 8. Data displayed

### 8.1 Instant-request row — `buildInstantReqRow(r)` L9949–L9975

| # | Column | Content | Source | Line |
|---|---|---|---|---|
| 1 | `ID` | `r.id`, monospace, `var(--amber-dk)` | DB | L9964 |
| 2 | `Requested at` | `r.requestedAt` | DB (string) | L9965 |
| 3 | `Rider` | `reqRiderCell(r.rider)` — see below | computed | L9966 |
| 4 | `From` | `r.pickup` | DB | L9967 |
| 5 | `To` | `r.dest` | DB | L9968 |
| 6 | `Type` | `r.type` badge, `b-com` for Comfort else `b-eco` | DB | L9969 |
| 7 | `Waiting` | `<span class="js-wait" data-req="<id>">r.waiting</span>`, red when `no_drivers` else `amber-dk` | DB + live tick | L9970 |
| 8 | `Status` | `reqStatusBadge(r.status)` + `<br>` + `reqSlaBadge(r)` | computed | L9971 |
| 9 | *(actions)* | see §10.1 | | L9972–L9974 |

Row background: `var(--red-lt)` when `no_drivers`, `var(--blue-lt)` when `offered`, else none (L9962).

### 8.2 Subscription-request row — `buildSubReqRow(r)` L10001–L10033

| # | Column | Content | Source | Line |
|---|---|---|---|---|
| 1 | `ID` | `r.id`, monospace, `var(--blue)` | DB | L10003 |
| 2 | `Requested at` | `r.requestedAt` | DB | L10004 |
| 3 | `Rider` | `reqRiderCell(r.rider)` | computed | L10005 |
| 4 | `Plan` | `REQ_PLAN_LABEL[r.plan]` badge (L9976: `weekly→Weekly`, `biweekly→Bi-weekly`, `monthly→Monthly`); badge class `b-com` for monthly, `b-eco` otherwise; second line `~<fmtSAR(subReqValue(r))>` | DB + computed | L10006–L10007 |
| 5 | `Vehicle` | `r.vehicle` badge, `b-com` / `b-eco` | DB | L10008 |
| 6 | `Pickup area` | `r.pickup` | DB | L10009 |
| 7 | `Time` | `r.preferredTime` | DB | L10010 |
| 8 | `Status` | `reqStatusBadge(r.status)`; if assigned + `assignedSub`: `→ <assignedSub>`; then `holdBadge(r)`; then `subReqSlaBadge(r)` when non-empty | computed | L10011–L10014 |
| 9 | *(actions)* | see §10.2 | | L10026–L10031 |

Row background: `var(--blue-lt)` when `pending` (L10002).

### 8.3 Shared rider cell — `reqRiderCell(riderId)` L9904–L9919

Rationale comment L9900–L9903. Structure (a `<td>` whose whole area opens `openProfile(riderId)`, L9914):
1. Rating badge **above** the name: `★<rating>` (`b-silver`) when rated, else `★ new` (`b-grey`) (L9906–L9908).
2. `nm2(riderId)` plus a 📍 pin button → `stopEv(event); showEntityLocation(riderId)` with tooltip `Show rider location — check driver coverage nearby` (L9911, L9916).
3. `🔁 Existing subscriber` tag when `riderHasPriorSub(riderId)` — `Object.keys(DB.subscriptions).some(k => DB.subscriptions[k].rider === riderId)` (L9759–L9761, rendered L9909). Rationale L9755–L9758: a "new" request from an existing subscriber should be read as a renewal/upsell conversation.

### 8.4 Status badges — `reqStatusBadge(st)` L9890–L9899

| `st` | Markup |
|---|---|
| `searching` | `<span class="b b-amber">Searching</span>` |
| `offered` | `<span class="b b-blue">📤 Offered to driver</span>` |
| `no_drivers` | `<span class="b b-red">No drivers</span>` |
| `assigned` | `<span class="b b-green">✓ Assigned</span>` |
| `expired` | `<span class="b b-grey">Expired</span>` |
| `pending` | `<span class="b b-blue">Pending</span>` |
| anything else (e.g. `declined`) | `<span class="b b-grey"><st raw></span>` (L9898) |

---

## 9. Input fields / filters / sorts

| Control | Id | Type | Default | Options | Effect |
|---|---|---|---|---|---|
| Filter chips | `rfilt-all` / `-sub` / `-instant` / `-pending` / `-assigned` / `-expired` (L2092–L2097) | `.map-fchip` click | `_reqFilter = 'all'` (L9883); `#rfilt-all` has class `on` in markup | 6 | `setReqFilter(type, chip)` L10034–L10039: set `_reqFilter`, strip `on` from every `#p-requests .map-fchip`, add `on` to the clicked chip, `renderRequestsPage()`. **Not a toggle** — clicking the active chip re-applies it. |
| Value sort | `rsort-value` (L2105) | `.map-fchip` toggle, `title="Sort the highest-value subscription sign-ups to the top"` | `_reqSubSortByValue = false` (L9884) | on / off | `toggleSubValueSort(chip)` L10041–L10045: flips the flag, `chip.classList.toggle('on', flag)`, re-render. Affects the main page **and** the sub full list (both go through `sortSubRequests`). |
| Sub search | `requests-sub-all-search` (L2134) | `<input>`, placeholder `Search rider, ID, area…` | empty | free text | `oninput → debouncedRenderRequestsSubAll(this.value)` (L10174, 300 ms debounce via `debounce()` L9544–L9551); resets to page 1. Matches (case-insensitive `indexOf`, L10145–L10149): rider **name**, request **id**, rider **id**, **pickup** |
| Instant search | `requests-instant-all-search` (L2155) | `<input>`, placeholder `Search rider, ID, pickup…` | empty | free text | `debouncedRenderRequestsInstantAll` (L10221). Matches (L10192–L10197): rider name, request id, rider id, **pickup**, **dest** — one field more than the sub search, despite the placeholder naming only pickup |
| Sub page size | `csel-reqsuball-pagesize` / `reqsuball-pagesize` (L2136 wrapper, built L10141) | custom select | `String(REQ_ALL_PAGE_SIZE)` = `'20'` | `20`, `50`, `100`, `200` per page | `onReqAllPageSizeChange('sub')` L10175–L10182 |
| Instant page size | `csel-reqinstantall-pagesize` / `reqinstantall-pagesize` (L2157 wrapper, built L10187) | custom select | `'20'` | same | `onReqAllPageSizeChange('instant')` |
| Pager `← Prev` / `Next →` | generated | buttons | page 1 | — | `gotoReqSubAllPage(p)` L10170–L10173 / `gotoReqInstantAllPage(p)` L10217–L10220 |

**Page-size selector is global, not per-page:** `REQ_ALL_PAGE_SIZE` is a single module variable (L9886) reassigned at L10178, so changing it on one full-list page silently changes the other. The selector is only built once (`if(w && !document.getElementById('csel-…'))`, L10140, L10186) so the two selects can drift out of sync visually.

**Status-filter coverage gap:** `reqStatusMatch(st)` L10047–L10055 returns `true` for `all`/`instant`/`sub` and otherwise matches only `pending|searching|offered`, `assigned`, `expired|no_drivers`. A subscription request with `status === 'declined'` matches none of the three status chips — it is visible only under `All` and `Subscription`.

---

## 10. Actions

### 10.1 Instant-request row actions — L9951–L9974

| Condition | Label | Handler | Line |
|---|---|---|---|
| `status === 'assigned'` | *(assign cell empty)* | — | L9951 |
| `status === 'offered'` | `📤 Awaiting driver` badge, tooltip `Sent to the driver's own app — waiting on their response, not ops` | none (non-clickable) | L9954 |
| `_locking` | `Assigning…` (disabled) | — | L9956 |
| `claimedBy` | `🔒 <claimedBy>` badge, tooltip `Being handled — click Assign to check in`, clickable | `assignManually(r.id)` | L9958 |
| otherwise | `Assign driver` (primary) | `assignManually(r.id)` | L9960 |
| `status !== 'assigned'` | `Cancel` (danger, disabled while `_locking`) | `if(confirm('Cancel request <id>? The rider will be notified.')) cancelRequest(id)` — **native `confirm()`** | L9973 |
| always | `Rider` | `openProfile(r.rider)` | L9974 |

| Handler | Line | Effect | Writes | Permission | Audit | Confirms |
|---|---|---|---|---|---|---|
| `assignManually(id)` | L11871–L11883 | rejects if `_locking` (toast `info`, L11874) or claimed by someone else (toast `warn` `🔒 <name> is already handling this request…`, L11875); otherwise claims it (`claimedBy = currentUserName()`, `claimedAt='Just now'`, L11876), re-renders both surfaces, opens `showNearbyDriversMap(r.rider, id)` | `r.claimedBy`, `r.claimedAt` | none | none | no |
| `pickNearbyDriver(drvId)` | L10243–L10251 | dispatches by `window._ndvCtx.kind`: `ust` → `assignNearestDriver`, `request` → `commitRequestAssign`, `live` → `commitLiveReassign`, `sreq` → `commitSubReqAssign`; rejects busy drivers (L10245) | — | none | none | no |
| `commitRequestAssign(reqId, drvId)` | L11884–L11912 | gate; `closeModal()` (which clears the lock, hence the re-apply at L11892); `simulateAsyncCommit`: **on success** re-find the row, `splice` it out of `DB.rideRequests` (L11895), push `{id:'TRP-'+(9100+rand(900)), rider, driver, type, stage:2, eta:'3 min to pickup', route:'<pickup> → <dest>', mapTrip:null}` into `DB.liveTrips` (L11896), re-render Live Ops / Requests / Dashboard / nav, audit, success toast (click → rider profile); **on failure** clear `_locking`/`claimedBy`/`claimedAt`, re-render, error toast whose click re-opens `assignManually` (L11908–L11911) | `DB.rideRequests`, `DB.liveTrips` | `requirePerm('live_ops')` (L11885) | `logAction('manual_assign','ride_request',reqId,'Manually assigned <driver> to request <id> (<rider>)', {status:…, driver:'—'}, {status:'assigned', driver})` (L11902) | no |
| `cancelRequest(id)` | L11915–L11925 | `splice` from `DB.rideRequests` (L11919); re-render Live Ops / Requests / nav; audit; `toast('Request <id> cancelled','warn')` | `DB.rideRequests` | `requirePerm('live_ops')` (L11916) | `logAction('cancel_ride_request','ride_request',id,'Cancelled pending ride request <id> (<rider>)', {status:'pending'}, {status:'cancelled'})` (L11923) | **yes** — native `confirm()` at the call site (L9973) **and** `GATE_SWEEP.cancelRequest` (L20871–L20872: `d:true`, consequences `['The rider is told no captain is coming.','Cancellation policy decides whether anything is charged.']`, button `Cancel request`) |

### 10.2 Subscription-request row actions — L10005–L10031

| Condition | Label | Handler | Line |
|---|---|---|---|
| `status !== 'pending'` | *(assign cell empty)* | — | L10005 |
| `pendingCorpApproval` | `✓ Approved` (success) + `✕ Declined` (danger) | `approveSubReqCorp(id)` / `rejectSubReqCorp(id)` | L10007 |
| `_locking` | `Assigning…` (disabled) | — | L10008 |
| `claimedBy` | `🔒 <claimedBy>` badge, clickable | `openSubReqAssign(id)` | L10009 |
| otherwise | `Assign driver` (primary) | `openSubReqAssign(id)` | L10010 |
| `status === 'expired'` | `Reopen` (warn) | `reopenSubReq(id)` | L10028 |
| `assigned && assignedSub` | `View sub` | `openProfile(r.assignedSub)` | L10029 |
| always | `Rider` | `openProfile(r.rider)` | L10030 |

| Handler | Line | Effect | Writes | Permission | Audit | Confirms |
|---|---|---|---|---|---|---|
| `openSubReqAssign(sreqId)` | L10232–L10241 | rejects when `_locking` (L10235) or claimed by another operator (L10236); claims it (L10237); re-render; sets `window._ndvCtx = {kind:'sreq', id, riderId}` (L10240) and opens `showNearbyDriversMap(r.rider, sreqId)` (L10241) | `r.claimedBy`, `r.claimedAt` | none | none | no |
| `commitSubReqAssign(sreqId, drvId)` | L10266–L10301 | **A. Corporate hold path** (L10272–L10281): `closeModal()`; if the policy has an `approverEmail`, `sendSystemEmail(approverEmail, "Approval needed — <rider>'s ride package (<SAR>)", …, 'transactional')` (L10275); set `r.pendingCorpApproval = {corpId, drvId, amount}` (L10277); ops notification `warn` (L10278); toast `⏳ <SAR> exceeds <company>'s approval threshold — driver not assigned until a manager signs off` (L10279); re-render; **return without assigning**. **B. Normal path** (L10283–L10300): `closeModal()`, re-apply `_locking`/claim (L10284), toast `Assigning <driver>…`; then `simulateAsyncCommit` — on success `capturePaymentHold(r)` (L10286), `materializeSubscription(r, drvId)` (L10287), `r.status='assigned'`, `r.assignedBy = <current user name>`, `r.assignedAt='Now'` (L10288), clear the lock/claim (L10289), re-render Requests + Subscriptions + nav, audit, success toast (click → the new subscription); on failure clear the lock/claim, re-render, error toast whose click re-opens `openSubReqAssign` (L10297–L10300) | `r.status`, `r.assignedBy`, `r.assignedAt`, `r.hold`, `DB.payments`, `DB.subscriptions`, `DB.riders[..].subs`, `DB.upcomingSubTrips` | `requirePerm('manage_subscriptions')` (L10267) | `payment_captured` (L9617) + `logAction('assign_driver','subscription_request',sreqId,'Assigned <driver> to subscription request <id> (<rider>) — <SUB-id> created, <SAR> captured', {status:'pending'}, {status:'assigned', driver, subscription})` (L10292) | no |
| `approveSubReqCorp(sreqId)` | L9977–L9988 | pushes `{corpId, subId:sreqId, riderId, amount, decision:'Approved', context:'Subscription request', decidedAt}` onto `DB.corpApprovalLog` (L9982, array declared L13962); sets `r.corpApproved = true`; deletes `pendingCorpApproval`; audit; toast; **calls `commitSubReqAssign(sreqId, pend.drvId)`** (L9987) which now passes the threshold check | `DB.corpApprovalLog`, `r.corpApproved` | `requirePerm('manage_subscriptions')` (L9978) | `logAction('corp_approval_granted','subscription_request',sreqId,'<id> approved by manager — proceeding with driver assignment',{},{})` (L9985) | no |
| `rejectSubReqCorp(sreqId)` | L9989–L10000 | logs a `Declined` decision on `DB.corpApprovalLog` (L9994); `r.status = 'declined'` (L9995); deletes `pendingCorpApproval`; audit; re-render; toast `✕ Declined — <id> cancelled, nothing charged` | `DB.corpApprovalLog`, `r.status` | `requirePerm('manage_subscriptions')` (L9990) | `logAction('corp_approval_declined', …)` (L9997) | no |
| `reopenSubReq(sreqId)` | L10302–L10310 | `r.status='pending'`, `delete r.expiredAt`, `r.requestedAt = fmtReqNowLabel()` (L10305) — **restarting the SLA clock**; issues a **fresh** hold `{amount: subReqValue(r), status:'held', authRef:'AUTH-'+seq, heldAt}` (L10306, comment: the old authorization was already released); re-render; audit; toast | `r.status`, `r.requestedAt`, `r.hold` | `requirePerm('manage_subscriptions')` (L10303) | `logAction('reopen_request','subscription_request',sreqId,'Reopened expired subscription request <id> (<rider>) — <SAR> re-authorized (held, not charged)', {status:'expired'}, {status:'pending'})` (L10308) | **yes** — `GATE_SWEEP.reopenSubReq` L20873–L20874 (`t:'Reopen the request'`, consequences `['Returns to the matching queue and starts searching again.','SLA clocks resume.']`, button `Reopen`) |

**`materializeSubscription(r, driverId)` L9620–L9638** — the request becomes a real subscription (rationale comment L9616–L9619: assigning previously only changed a status label):
```
newSubId   = 'SUB-' + (1200 + floor(random*800))                      L9621   // no uniqueness check
cadenceKey = r.plan;  planDef = PLANS[cadenceKey]                     L9622–L9623
totalTrips = planDef.exec || 5                                        L9624
planLabel  = REQ_PLAN_LABEL[cadenceKey] + ' ' + r.vehicle             L9625
routeLabel = r.pickup && r.dest ? r.pickup+' → '+r.dest : (r.pickup || r.dest || null)   L9626
DB.subscriptions[newSubId] = {
    id, rider: r.rider, driver: driverId, plan: planLabel,
    started: fmtReqNowLabel(),
    ends:    addDaysLabel(CADENCE_DAYS[cadenceKey] || 7),
    trips:   '0/' + totalTrips,
    paid:    fmtSAR(ensureHold(r).amount),
    status:  'Active',
    direction: 'one-way', route: routeLabel,
    departTime: parse12hToTimeStr(r.preferredTime), returnTime: null,
    days: ['Sun','Mon','Tue','Wed','Thu']    // standard work week — this pipeline collects no day choices
}                                                                      L9627–L9635
r.assignedSub = newSubId                                               L9634
DB.riders[r.rider].subs.push(newSubId)                                 L9635
generateUpcomingTripsForSubscription(newSubId)                         L9636
return newSubId
```
Note `started` is a **date-time** label (`"25 Jun 09:14"`) whereas every other subscription's `started` is a bare date; `parseShortDate()` (L14200) tolerates it, but the field format is inconsistent.

### 10.3 Page-level actions

| Label | Id / line | Handler | Effect |
|---|---|---|---|
| `💾 Export snapshot` | L2086 | `exportRequestsSnapshot()` L9766–L9776 | Builds `{exportedAt: new Date().toISOString(), rideRequests, subscriptionRequests}`, serialises with 2-space indent, creates a Blob (`application/json`), triggers a download named `eyvar-requests-snapshot-<Date.now()>.json`, revokes the object URL after 1 s, toasts `📦 Snapshot downloaded — N requests`. Rationale L9762–L9765: the panel is in-memory only, so this is a manual safety net against refresh-loss. **No import counterpart exists.** No permission gate, no audit entry. |
| "Live (local)" pulse chip | L2083–L2085 | none | Non-interactive. Green dot with `animation: reqPulse 1.4s`; the `title` attribute explicitly warns: *"This panel refreshes itself from local demo data every few seconds — it is not yet wired to a real backend, so this reflects simulated activity, not other teammates' actions."* |
| Card titles | L2103, L2115 | `go('requests-sub-all'\|'requests-instant-all', null)` | Navigate to the full list |
| `← Back to requests` | L2127, L2148 | `go('requests', null)` | |

### 10.4 Ancillary — manual ride creation (cross-module, feeds this queue)

`openNewRideRequestModal()` L2449–L2477 → `commitNewRideRequest()` L2479–L2495. Gate `requirePerm('live_ops')` (L2450). Fields: `#nrr-rider` (searchable custom select over every rider, L2456), `#nrr-vip` checkbox (`⭐ VIP priority — skip queue, best-rated driver offered first`, L2457), `#nrr-pickup` / `#nrr-dest` (Riyadh district selects, L2459–L2460), `#nrr-type` (`Economy` / `Comfort`, L2462), and a live fare preview `#nrr-fare-preview` recalculated by `updateNrrFareEstimate()` L2470–L2478. Commit validates rider (L2485) and both endpoints (L2486), pushes `{id:'REQ-'+(500+len+rand(400)), rider, pickup, dest, type, waiting:'0:00', status:'searching', requestedAt: fmtReqNowLabel(), vip}` (L2488–L2490), audits `create_ride_request` (L2491), re-renders the Requests page (L2493) and opens live tracking (L2494, `openRideRequestTracking()` L2503–L2510, a 1 s `setInterval`).

---

## 11. Tables & lists

Four tables, two row builders. All four use `class="dt"`.

### 11.1 `#req-instant-list` (main page) — L10098–L10101

| Property | Value |
|---|---|
| Columns | `ID` · `Requested at` · `Rider` · `From` · `To` · `Type` · `Waiting` · `Status` · *(blank)* |
| Row source | `DB.rideRequests` |
| Filter | `reqStatusMatch(r.status)` (L10079) |
| Sort | `sortInstantByUrgency` (L10079) |
| Cap | `.slice(0, REQ_CARD_LIMIT)` = 20 (L10100, const L9885); the container scrolls at 420 px (L2118) |
| Row click | none; cells carry their own handlers |
| Empty state | `No instant ride requests match this filter.` (L10096) |
| Card hidden when | `_reqFilter === 'sub'` (L10077, applied L10093) |

### 11.2 `#req-sub-list` (main page) — L10111–L10114

| Property | Value |
|---|---|
| Columns | `ID` · `Requested at` · `Rider` · `Plan` · `Vehicle` · `Pickup area` · `Time` · `Status` · *(blank)* |
| Row source | `DB.subscriptionRequests` |
| Filter | `reqStatusMatch` (L10080) |
| Sort | `sortSubRequests` (L10080) |
| Cap | `.slice(0, 20)` (L10113) |
| Empty state | `No subscription requests match this filter.` (L10109) |
| Card hidden when | `_reqFilter === 'instant'` (L10078, applied L10106) |

### 11.3 `#requests-sub-all-list` — `renderRequestsSubAll()` L10137–L10169

| Property | Value |
|---|---|
| Columns | identical to §11.2 (L10160) |
| Row source | `sortSubRequests(DB.subscriptionRequests)` — **the chip filter does not apply here**, only the search box (L10143–L10150) |
| Search | rider name / request id / rider id / pickup (L10145–L10149) |
| Pagination | `start = (_reqSubAllPage−1) * REQ_ALL_PAGE_SIZE`, `slice(start, start+size)` (L10158–L10159); pager via `reqRenderPager()` (L10163) |
| Page reset | any new search resets `_reqSubAllPage = 1` (L10142, and in the debounce wrapper L10174) |
| Empty state | `No subscription requests match.` (L10154) — **returns before the pager renders**, so the pager disappears entirely on an empty result |

### 11.4 `#requests-instant-all-list` — `renderRequestsInstantAll()` L10183–L10216

Same shape as §11.3 with the instant columns (L10206), `sortInstantByUrgency` (L10190), search over rider name / id / rider id / pickup / dest (L10192–L10197), empty state `No instant ride requests match.` (L10200).

### 11.5 Pager — `reqRenderPager(containerEl, total, page, pageSize, onGoto)` L10125–L10136
```
pages = max(1, ceil(total / pageSize))                                       L10126
page  = min(max(1, page), pages)                                             L10127
if (pages <= 1) → containerEl.innerHTML = '' ; return                        L10128
render: [← Prev]  "Page P of N"  [Next →]     // buttons disabled at the ends
```
The handler is injected as a string and invoked as `('<onGoto>')(<n>)` (L10130, L10132).

---

## 12. Modals opened

The Requests module does not build its own picker — it reuses the shared nearby-drivers modal (comment L10238–L10239: "reuse the unified nearby-driver picker"). It does build three inline confirmation/notice screens.

### 12.1 Nearby-driver picker — `showNearbyDriversMap(riderId, ctxId)` L8354–L8481

Opened by `assignManually()` (L11878) and `openSubReqAssign()` (L10241). Contents relevant to requests: a canvas map (L8355–L8360 region, drawn L8461–L8481); a section label reading `<N> nearest drivers · <pickup> → <dest>` for a request context (L8402); one `.ndv-row` per candidate showing avatar, name, level badge (`gold`/`silver`), `Nearest` tag on the first non-busy candidate, `★rating · vehicle · phone`, `🟢 Available now` / `🚗 On a trip`, distance `fmtKm`, `~N min` ETA, and two buttons — `📞 Call` → `quickContactDriver()` and `✅ Assign` → `pickNearbyDriver(<driverId>)` (disabled with tooltip `Driver is on a trip right now` when busy) (L8406–L8423). Footer: `Close` and `Open full ops map` → `go('live')` when no trip context (L8443–L8446).

### 12.2 Manager-approval notice (subscription requests)

Not a modal — `commitSubReqAssign()` closes the modal (L10273) and communicates entirely through a `warn` toast (L10279) plus an ops notification (L10278). The approve/decline controls then appear **inline in the row's assign cell** (L10007).

### 12.3 Async-commit feedback

Also toast-only:

| Moment | Toast | Line |
|---|---|---|
| assign started (instant) | `Assigning <driver>…` `info` | L11893 |
| assign started (sub) | `Assigning <driver>…` `info` | L10285 |
| assign succeeded (instant) | `✅ <driver> assigned to <REQ-id>` `ok`, click → rider profile | L11903 |
| assign succeeded (sub) | `✅ <driver> assigned — <SAR> captured, <SUB-id> is now active` `ok`, click → `openProfile(newSubId)` | L10293 |
| assign failed (instant) | `❌ Could not assign <driver> to <id> — connection issue. Please try again.` `err`, click → `assignManually(reqId)` | L11910 |
| assign failed (sub) | `❌ Could not assign <driver> — connection issue. Please try again.` `err`, click → `openSubReqAssign(sreqId)` | L10299 |
| claimed by another operator | `🔒 <name> is already handling this request — check with them before acting on it.` `warn` | L10236, L11875 |
| already assigning | `Already assigning a driver to this request…` `info` | L10235, L11874 |

### 12.4 New-ride-request modal
See §10.4 — `openNewRideRequestModal()` L2449–L2477, with the live tracking modal `renderRideRequestTracking()` (opened L2494) that polls the real record every second and shows `📨 Offer sent to <driver> — waiting for their response (<N>s left)` (L2529) or `⚠ No driver found within 3 minutes — needs manual attention` with a `Handle manually →` button that navigates to `go('requests')` (L2530, L2539).

---

## 13. Badges & sidebar counters

| Counter | HTML line | Seed | Formula | Written |
|---|---|---|---|---|
| `sbb-requests` | L508 | `0` (markup) | `DB.rideRequests.filter(r => r.status !== 'assigned').length + DB.subscriptionRequests.filter(r => r.status === 'pending').length` | **twice**, identically: `renderRequestsPage()` L10118–L10119 and `refreshNavCounts()` L9401 |
| `sbb-dash` (Dashboard) | — | — | `(DB.rideRequests \|\| []).length` + urgent USTs | L9397–L9400 |
| `#req-instant-count` | L2116 | `0` | `filtRide.length` | L10084 |
| `#req-sub-count` | L2106 | `0` | `filtSub.length` | L10085 |
| `#rfilt-all-cnt` / `-sub-cnt` / `-instant-cnt` | L2092–L2094 | empty | unfiltered totals | L10081–L10083 |
| Status badge | — | — | `reqStatusBadge(st)` | L9890–L9899 |
| SLA badge (instant) | — | — | `reqSlaBadge(r)` | L9921–L9930 |
| SLA badge (sub) | — | — | `subReqSlaBadge(r)` | L9937–L9947 |
| Hold badge | — | — | `holdBadge(r)` | L9639–L9644 |
| Rider rating badge | — | — | `★<rating>` `b-silver` / `★ new` `b-grey` | L9906–L9908 |
| `🔁 Existing subscriber` | — | — | `riderHasPriorSub(riderId)` | L9759, L9909 |
| Claim lock badge | — | — | `🔒 <claimedBy>` `b-grey` | L9958, L10009 |

**Badge semantics differ between the two arrays:** an instant request counts toward the badge in every state except `assigned` (so `expired` rows inflate it), while a subscription request counts only when `pending`.

---

## 14. Cross-module links

| Direction | Target | Line |
|---|---|---|
| Out → Rider / subscription 360° | `openProfile()` | L9914, L9974, L10029–L10030, L10293 |
| Out → Live Map location | `showEntityLocation(riderId)` | L9911 |
| Out → nearby-driver dispatch | `showNearbyDriversMap()` L8354 | L10241, L11878 |
| Out → Live Ops | `DB.liveTrips.push(...)`, `renderLiveOps()` | L11896, L11899, L12482–L12484 |
| Out → Subscriptions | `materializeSubscription()` creates `DB.subscriptions[...]`; `renderSubscriptionsTable()` | L9620–L9638, L10290 |
| Out → Trip Readiness | `generateUpcomingTripsForSubscription(newSubId)` | L9636 |
| Out → Finance | `DB.payments[payId]` created by `capturePaymentHold()` | L9612 |
| Out → Corporate | `DB.corpApprovalLog` (L13962), `findCorpForRider()` L4909, `getCorpUsagePolicy()` L6533, `sendSystemEmail()` | L9982, L9994, L10274–L10275 |
| Out → Notification Center | `pushOpsNotification()` L9661–L9667 | L9698, L9702, L9710, L9715, L10278, L12548, L12489, L12005 |
| Out → Activity log | `logAction()` for `sla_breach`, `offer_sent`, `offer_declined`, `driver_accepted`, `driver_flagged`, `manual_assign`, `cancel_ride_request`, `assign_driver`, `sub_request_timeout`, `reopen_request`, `payment_hold_released`, `payment_captured`, `corp_approval_granted`, `corp_approval_declined`, `create_ride_request` | L12549, L11993, L12008, L12488, L12002, L11902, L11923, L10292, L9688, L10308, L9603, L9617, L9985, L9997, L2491 |
| Out → Zones | `DB.subscriptionRequests` feeds the per-zone demand-by-hour chart | L14105–L14106 |
| In ← `tickEngine()` | drives every instant-request transition + the sub search window | L12526–L12574 |
| In ← Live Ops sidebar | `renderRideRequests()` renders the same `DB.rideRequests` in a compact card | L11850–L11870 |
| In ← manual creation | `commitNewRideRequest()` | L2479–L2495 |
| In ← ops radius / dispatch settings | `nearestAvailableDrivers()` respects the configured search phases | L8167, L12503 |

---

## 15. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `DB.rideRequests` seed — 3 records (REQ-501/502/503) | L2786–L2790 | fabricated riders, routes, wait times |
| `DB.subscriptionRequests` seed — 5 records (SREQ-001…005) | L2794–L2800 | includes hand-written `notes` such as *"First subscription — wants female driver if available"* and *"Wants the same driver daily if possible"* — **never rendered anywhere** |
| SREQ-002 and SREQ-005 both claim `assignedSub:'SUB-1052b'` | L2796, L2799 | the same fabricated subscription id, which does not exist in `DB.subscriptions` |
| `seedMoreRequests()` — 45 synthetic riders | L9787–L9819 | random names from three fixed arrays (L9789–L9791), random ratings, phones, IPs, devices, districts, `mapPos`, `stats.totalPaid`, etc. Guarded by `window.__reqSeeded` (L9788) |
| District / landmark / device name pools | L9792–L9794 | 16 districts, 10 landmarks, 6 devices |
| 14 `searching` + 13 `no_drivers` + 13 `assigned` + 13 `expired` instant requests | L9846–L9849 | wait ranges `[10,150] s` for searching and `[180,420] s` for breached, hardcoded |
| 14 `pending` + 13 `assigned` + 13 `expired` subscription requests | L9866–L9868 | `assignedBy` picked from `['Sarah Al-Rashid','Fahad Al-Dosari','Ops']` (L9862) |
| Rationale for the volume | L9778–L9786 | "so every status … has more than 10 entries, the same way a live weekday morning would" |
| `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | L9555 | frozen start; **advanced 1 min per tick** by L9680 |
| Year `2026` hardcoded in `parseReqTimestamp()` | L9562 | |
| `SUBREQ_SEARCH_HOURS = 2` | L9577 | comment records it "was 24" |
| `SUBREQ_REMINDER_HOURS = 1` | L9578 | |
| `SUBREQ_TIME_ACCEL_MIN_PER_TICK = 1` | L9579 | demo clock acceleration |
| `AUTO_OFFER_DELAY_SEC = 6` / `OFFER_WINDOW_SEC = 12` | L11987–L11988 | |
| SLA breach threshold `secs >= 180` | L12544 | 3 minutes, inline literal — not a configurable limit |
| "Approaching SLA" threshold `secs >= 90` | L9925 | inline literal |
| `acceptChance = 0.30 + (rating−3)*0.08` | L12561 | simulated driver behaviour |
| `Math.random() < 0.08` commit-failure rate | L10261 | simulated network failure |
| `550 ms` simulated latency | L10263 | |
| `REQ_CARD_LIMIT = 20` / `REQ_ALL_PAGE_SIZE = 20` | L9885–L9886 | |
| Live-trip id `'TRP-'+(9100+rand(900))` | L11896, L12483 | no collision check |
| Payment id `'PAY-'+(6000+rand(3900))` | L9611 | no collision check |
| Subscription id `'SUB-'+(1200+rand(800))` | L9621 | **no uniqueness check** (contrast the renewal wizard's `while` loop at L11441) |
| Fallback card `'Visa ···'+(1000+rand(8999))` when the rider has no `payMethod` | L9612 | |
| `days: ['Sun','Mon','Tue','Wed','Thu']` on every materialised subscription | L9633 | the comment concedes "this pipeline doesn't collect explicit day choices yet" |
| `eta: '3 min to pickup'`, `stage: 2` on every created live trip | L11896, L12483 | |
| Beep frequency 880 Hz, gain 0.16, 0.42 s | L9737–L9745 | |
| "Live (local)" chip and its disclaimer tooltip | L2083–L2084 | explicitly says the panel is not backend-wired |
| `#requests-page-sub` seed text | L2081 | never recomputed |

---

## 16. i18n keys

| Key | Element | Line | Arabic | Line |
|---|---|---|---|---|
| `nav.requests` | sidebar label "Requests" | L508 | `الطلبات` | L7907 |

**No other element in this module carries `data-i18n`.** Page headings (L2081, L2126, L2147), all six filter-chip labels (L2092–L2097), the value-sort chip (L2105), both search placeholders (L2134, L2155), both card titles (L2103, L2115), the export button (L2086), every table header, every status/SLA/hold badge, every toast and every empty state are English literals in markup or in JS. Verified: zero `data-i18n` matches in L2079–L2165 and L9544–L10310.

---

## 17. Gaps, dead code, UNVERIFIED items

**Data-model / correctness**
1. `r.notes` on subscription requests is populated (seeds L2795–L2799) but **rendered nowhere** — the rider's stated preference ("wants female driver if available") is invisible to the operator making the assignment.
2. `r.assignedBy`, `r.assignedAt` and `r.expiredAt` are written (L10288, L9686) but never displayed.
3. `r._alerted` is set at L12571 and never read — dead flag.
4. `materializeSubscription()` generates `'SUB-'+(1200+rand(800))` with **no collision check** (L9621), unlike `renderSuccess()` in the renewal wizard which loops until unique (L11441).
5. `materializeSubscription()` sets `started: fmtReqNowLabel()` — a date **and time** string (L9628), whereas every other subscription uses a bare date. `parseShortDate()` tolerates it, but the inconsistency is real.
6. Every materialised subscription gets the hardcoded weekday set `['Sun','Mon','Tue','Wed','Thu']` (L9633) regardless of what the rider asked for.
7. Seeded `assignedSub: 'SUB-1052b'` (L2796, L2799) points at a subscription id that does not exist — the `View sub` button on those rows opens a broken profile.
8. `status === 'declined'` (set by `rejectSubReqCorp`, L9995) is not handled by `reqStatusBadge` (falls to the generic grey branch, L9898) and matches **none** of the Pending/Assigned/Expired chips (`reqStatusMatch` L10047–L10055).
9. `reopenSubReq()` rewrites `requestedAt` to *now* (L10305), which resets the SLA clock and destroys the record of when the rider originally asked.
10. The live engine never sets `status='assigned'` on an instant request (it splices, L11895/L12482), so the `✅ Assigned` chip only ever matches fabricated seed rows.
11. `sbb-requests` counts `expired` instant requests as outstanding (`status !== 'assigned'`, L10118) while counting only `pending` subscription requests — inconsistent semantics between the two halves of the same badge.
12. The `⏳ Pending` / `✅ Assigned` / `⛔ Expired` chips have no count spans (L2095–L2097) while the other three do.
13. `#rfilt-all-cnt` always shows the unfiltered total (L10081), so it stops describing what the page is showing as soon as a status filter is applied.
14. The chip filter applies **only** to the main page — both full-list pages ignore `_reqFilter` entirely (L10143, L10190).
15. `REQ_ALL_PAGE_SIZE` is a single shared variable (L9886, reassigned L10178), so changing the page size on one full-list page silently changes the other; the two selects are each built only once (L10140, L10186) so their displayed values can disagree with the value in force.
16. On an empty search result both full lists `return` before rendering the pager (L10154, L10200), so the pager vanishes instead of showing "Page 1 of 1".
17. The instant search matches `dest` (L10196) but its placeholder only mentions "pickup" (L2155).
18. `openSubReqAssign()` and `assignManually()` claim a request with **no permission check** (L10237, L11876) — the gate only appears at commit time.
19. `exportRequestsSnapshot()` has no permission gate and writes no audit entry (L9766–L9776) despite exporting the full rider-linked request corpus. There is no import counterpart, so the stated "safety net" is one-way only.
20. The SLA thresholds (180 s breach, 90 s warning) are inline literals (L12544, L9925) rather than entries in the configurable ops-limits system that `driver_max_consecutive_declines` uses (L11999).

**Historical notes preserved in the source**
21. L11907–L11911: a duplicate `pickNearbyDriver` definition used to live in the Live Ops block and silently overrode the canonical one at load time, "which is why 'Assign driver' on subscription requests never actually worked; removed as part of this stability pass."
22. L9616–L9619: assigning a driver to a subscription request "never actually created a real subscription record — it just changed a status label."
23. L9581–L9592: the original flow charged the rider's full package value **before** a driver was confirmed, with no automated way back on failure; the hold/capture/release model replaced it.

**UNVERIFIED**
- `nearestAvailableDrivers(riderId, limit, kind, elapsedSec)` (L8167) — governs which drivers are offered and how the search radius expands with elapsed time. Body not read; belongs to the dispatch/ops-radius module.
- `showNearbyDriversMap()` (L8354–L8481) — read in outline only for the request-context branches; the canvas rendering and radius-notice logic were not traced in full.
- `findCorpForRider()` (L4909), `getCorpUsagePolicy()` (L6533), `sendSystemEmail()`, `getLimit()`, `driverLiveState()`, `customSelectHTML()`, `openProfile()`, `showEntityLocation()`, `stopEv()`, `parse12hToTimeStr()`, `addDaysLabel()`, `fmtSAR()`, `toast()` — referenced, bodies not read.
- `renderRideRequestTracking()` (called L2508) — the polling tracker's full render was not read.
- Whether `gateAll(GATE_SWEEP)` (L20756, installed L20898) actually wraps `cancelRequest` and `reopenSubReq` at runtime depends on `guardAction()` (L17819) and load order; this is a static reading only.
- The interaction between the native `confirm()` at L9973 and the `GATE_SWEEP.cancelRequest` guard (L20871) — whether the operator sees one dialog or two — was not observed.

---

## 18. Line-number index

| Item | Lines |
|---|---|
| Sidebar entry + `sbb-requests` | L508 |
| `titles` / `subs` for all three pages | L2168 / L2169 |
| `openNewRideRequestModal()` | L2449–L2477 |
| `updateNrrFareEstimate()` | L2470–L2478 |
| `commitNewRideRequest()` | L2479–L2495 |
| `openRideRequestTracking()` / `closeRideRequestTracking()` | L2503–L2510 / L2511– |
| Ride-request tracking status strings | L2529–L2539 |
| `DB.rideRequests` seed | L2786–L2790 |
| `DB.subscriptionRequests` seed (+ comment L2791–L2793) | L2794–L2800 |
| `#p-requests` markup | L2079–L2120 |
| — filter chips | L2091–L2098 |
| — subscription card | L2101–L2110 |
| — instant card | L2113–L2119 |
| `#p-requests-sub-all` markup | L2123–L2142 |
| `#p-requests-instant-all` markup | L2144–L2165 |
| `PLANS` | L4389–L4393 |
| `findCorpForRider()` | L4909 |
| `getCorpUsagePolicy()` | L6533 |
| `go()` dispatch — requests / sub-all / instant-all | L8794 / L8804 / L8805 |
| `nearestAvailableDrivers()` | L8167 |
| `showNearbyDriversMap()` | L8354–L8481 |
| Shared-helpers header comment | L9537–L9543 |
| `debounce()` | L9544–L9551 |
| `REQ_NOW_REF` / `REQ_MONTHS` | L9555 / L9556 |
| `parseReqTimestamp()` | L9557–L9563 |
| `reqAgeMinutes()` | L9564–L9568 |
| Search-window comment | L9569–L9576 |
| `SUBREQ_SEARCH_HOURS` / `_REMINDER_HOURS` / `_TIME_ACCEL_MIN_PER_TICK` | L9577 / L9578 / L9579 |
| Payment-hold rationale comment | L9581–L9592 |
| `ensureHold()` | L9593–L9598 |
| `releasePaymentHold()` | L9599–L9604 |
| `capturePaymentHold()` | L9605–L9619 |
| `materializeSubscription()` | L9620–L9638 |
| `holdBadge()` | L9639–L9644 |
| `fmtReqNowLabel()` | L9645–L9650 |
| `currentUserName()` | L9651–L9654 |
| `pushOpsNotification()` | L9661–L9667 |
| `openSubReqFromToast()` | L9668–L9673 |
| `processSubReqSearchWindow()` | L9679–L9730 |
| `playAlertBeep()` | L9731–L9749 |
| `subReqValue()` | L9750–L9754 |
| `riderHasPriorSub()` | L9759–L9761 |
| `exportRequestsSnapshot()` | L9766–L9776 |
| `seedMoreRequests()` | L9787–L9869 |
| — 45 riders | L9800–L9819 |
| — instant-request loops | L9846–L9849 |
| — subscription-request loops | L9866–L9868 |
| Requests-page header comment | L9871–L9882 |
| `_reqFilter` / `_reqSubSortByValue` / `REQ_CARD_LIMIT` / `REQ_ALL_PAGE_SIZE` / `_reqSubAllPage` / `_reqInstantAllPage` | L9883–L9888 |
| `reqStatusBadge()` | L9890–L9899 |
| `reqRiderCell()` | L9904–L9919 |
| `reqSlaBadge()` | L9921–L9930 |
| `subReqSlaBadge()` | L9937–L9947 |
| `buildInstantReqRow()` | L9949–L9975 |
| `REQ_PLAN_LABEL` | L9976 |
| `approveSubReqCorp()` | L9977–L9988 |
| `rejectSubReqCorp()` | L9989–L10000 |
| `buildSubReqRow()` | L10001–L10033 |
| `setReqFilter()` | L10034–L10039 |
| `toggleSubValueSort()` | L10041–L10045 |
| `reqStatusMatch()` | L10047–L10055 |
| `reqUrgencyScore()` | L10057–L10061 |
| `sortInstantByUrgency()` | L10062–L10064 |
| `sortSubRequests()` | L10065–L10070 |
| `renderRequestsPage()` | L10071–L10123 |
| — chip counts | L10081–L10085 |
| — instant list | L10093–L10104 |
| — subscription list | L10106–L10116 |
| — sidebar badge | L10118–L10119 |
| `reqRenderPager()` | L10125–L10136 |
| `renderRequestsSubAll()` | L10137–L10169 |
| `gotoReqSubAllPage()` | L10170–L10173 |
| `debouncedRenderRequestsSubAll` | L10174 |
| `onReqAllPageSizeChange()` | L10175–L10182 |
| `renderRequestsInstantAll()` | L10183–L10216 |
| `gotoReqInstantAllPage()` | L10217–L10220 |
| `debouncedRenderRequestsInstantAll` | L10221 |
| `openInstantReqFromToast()` | L10225–L10230 |
| `openSubReqAssign()` | L10232–L10241 |
| `pickNearbyDriver()` | L10243–L10251 |
| `simulateAsyncCommit()` (+ rationale L10252–L10259) | L10260–L10264 |
| `commitSubReqAssign()` | L10266–L10301 |
| `reopenSubReq()` | L10302–L10310 |
| `renderRideRequests()` (Live Ops card) | L11850–L11870 |
| `assignManually()` | L11871–L11883 |
| `commitRequestAssign()` | L11884–L11912 |
| `cancelRequest()` | L11915–L11925 |
| `bumpWait()` | L11955–L11959 |
| `startTickEngine()` | L11966–L11969 |
| Auto-dispatch rationale comment | L11970–L11986 |
| `AUTO_OFFER_DELAY_SEC` / `OFFER_WINDOW_SEC` | L11987 / L11988 |
| `sendDriverOffer()` | L11989–L11994 |
| `driverDeclineOrTimeout()` | L11995–L12010 |
| `driverAcceptOffer()` | L12476–L12491 |
| `nextOfferCandidate()` | L12496–L12507 |
| `tickEngine()` | L12508– |
| — instant-request loop | L12526–L12573 |
| — offer dispatch | L12535–L12538 |
| — SLA breach | L12544–L12552 |
| — offered branch | L12553–L12564 |
| — no_drivers retry | L12565–L12572 |
| — `processSubReqSearchWindow()` call | L12574 |
| — `.js-wait` clock patch | L12576–L12579 |
| — 5-tick Requests refresh | L12605–L12610 |
| `DB.corpApprovalLog` | L13962 |
| Zones demand chart over subscription requests | L14105–L14106 |
| `seedMoreRequests()` boot call | L14557 |
| Boot renders | L14588–L14590 |
| `guardAction()` | L17819 |
| `gateAll()` | L20756–L20767 |
| `GATE_SWEEP.cancelRequest` | L20871–L20872 |
| `GATE_SWEEP.reopenSubReq` | L20873–L20874 |
| `installGateSweep()` | L20898 |
| i18n `nav.requests` (AR) | L7907 |

---

## 19. Mount points (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §7, item P1-5). Both renderers were already documented in §11; only their DOM anchors were missing. Pass 1's note applies exactly here — *"the docs describe what draws, not where it lands."*

| Element id | Line | Kind | Renderer | What fills it |
|---|---:|---|---|---|
| **`#requests-sub-all-pager`** | **L10167** | `div`, pagination host | `renderRequestsSubAll(filter, gotoPage)` — L10137 | Created empty as the **last fragment of the table's own `innerHTML` string** (L10164–L10167), then immediately re-looked-up and filled by `reqRenderPager(document.getElementById('requests-sub-all-pager'), rows.length, _reqSubAllPage, REQ_ALL_PAGE_SIZE, 'gotoReqSubAllPage')` at **L10168**. |
| **`#requests-instant-all-pager`** | **L10214** | `div`, pagination host | `renderRequestsInstantAll(filter, gotoPage)` — L10183 | Identical pattern: emitted at L10211–L10214, filled by `reqRenderPager(…, rows.length, _reqInstantAllPage, REQ_ALL_PAGE_SIZE, 'gotoReqInstantAllPage')` at **L10215**. |

### 19.1 The create-then-fill pattern

Both ids are **created and consumed inside the same function call**, one statement apart. The renderer does not append to an anchor that already exists in the page markup — it writes the anchor as part of its own output and then reaches back into the DOM for it:

```js
el.innerHTML='<table class="dt">…</table>'
  +'<div id="requests-sub-all-pager"></div>';                                   /* L10164–L10167 */
reqRenderPager(document.getElementById('requests-sub-all-pager'),
               rows.length,_reqSubAllPage,REQ_ALL_PAGE_SIZE,'gotoReqSubAllPage'); /* L10168 */
```

Consequences worth recording for a rebuild:

- Neither id appears anywhere in the page markup — a search of the `.page` divs for `requests-sub-all-pager` finds nothing. They exist only after their renderer has run.
- **Neither pager survives an empty result set.** When `rows.length===0` the function writes the *"No subscription requests match."* / *"No instant ride requests match."* empty state and **returns before L10164** (L10158–L10161 for sub, L10205–L10208 for instant). The pager div is never created in that path, which is correct — but it means the ids are conditionally present, not merely conditionally filled.
- The div exists but is **left blank** whenever there is only one page: `reqRenderPager` short-circuits with `if(pages<=1){containerEl.innerHTML='';return;}` at **L10128**. With the seeded 40 subscription requests and `REQ_ALL_PAGE_SIZE=20` (L9886), two pages exist at boot, so the sub pager is populated; the instant list's page count depends on how many records `pushRide` seeded plus any already in `DB.rideRequests` (see `06b-quick-rides-and-ride-requests.md` §19).

### 19.2 What `reqRenderPager` puts in them — L10125–L10135

| Element | Line | Detail |
|---|---:|---|
| Container | L10129 | centred flex row, `gap:10px`, `padding:12px`, `border-top:.5px solid var(--border)` |
| `← Prev` | L10130 | `disabled` when `page<=1`; `onclick="(<onGoto>)(<page-1>)"` |
| Page counter | L10131 | literal `'Page ' + page + ' of ' + pages`, 11 px, `var(--muted)` — hard-coded English, no `data-i18n` |
| `Next →` | L10132 | `disabled` when `page>=pages`; `onclick="(<onGoto>)(<page+1>)"` |

`pages=Math.max(1,Math.ceil(total/pageSize))` (L10126) and `page` is clamped into `[1,pages]` (L10127), so an out-of-range `_reqSubAllPage` cannot produce an empty table — it silently snaps to the nearest valid page.

The `onGoto` argument is a **function name passed as a string** and interpolated into the `onclick` attribute as `'('+onGoto+')('+n+')'` (L10130, L10132). The two callbacks are `gotoReqSubAllPage(p)` (**L10170–L10173**) and `gotoReqInstantAllPage(p)` (**L10217–L10220**); each sets the page variable and re-invokes its renderer with the current search box value, which re-creates the pager div from scratch on every page turn.

`REQ_ALL_PAGE_SIZE` is a **mutable global** — declared `var REQ_ALL_PAGE_SIZE=20` at **L9886** with the comment *"rows per page on the dedicated 'View all' pages — adjustable via the per-page selector"*, and reassigned at **L10178** (`REQ_ALL_PAGE_SIZE=n||20`) by the per-page custom select (`csel-reqsuball-pagesize`, options 20/50/100/200, built at L10142–L10143). It is shared by **both** lists, so changing the page size on the subscription list also changes it on the instant list.

---

## 20. Seed generator `pushSub()` (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6.1, item P2-8). §15 of this document already states the seeded record counts; this section names the loop that produces them.

`pushSub(status, dayOffset)` — **L9854–L9865**, declared inside `seedMoreRequests()` (**L9787**), which is invoked from the deferred boot `setTimeout` at **L14557**.

### 20.1 The three loops — 40 records

| Line | Loop | `status` | `dayOffset` | Count |
|---:|---|---|---|---:|
| **L9866** | `for(var p1=0;p1<14;p1++)pushSub('pending',Math.random()<0.3?1:0)` | `pending` | **1 with 30 % probability, else 0** | 14 |
| **L9867** | `for(var p2=0;p2<13;p2++)pushSub('assigned',1)` | `assigned` | 1 | 13 |
| **L9868** | `for(var p3=0;p3<13;p3++)pushSub('expired',2)` | `expired` | 2 | 13 |
| | | | **total pushed to `DB.subscriptionRequests`** | **40** |

Note the `pending` loop is the only one with a randomised day: each of its 14 records independently lands on "today" or "yesterday". The other two are deterministic.

### 20.2 The record it builds — L9857–L9864

| Field | Source | Line |
|---|---|---:|
| `id` | `'SREQ-'+sreqSeq` where `sreqSeq` starts at **100** (L9853) and pre-increments (L9856) → **SREQ-101 … SREQ-140** | L9853, L9856, L9858 |
| `rider` | `randRider()` → `pick(newRiderIds)` (L9829) — one of the **45** riders `makeRider` created (L9819), never one of the 10 hand-seeded riders | L9829, L9858 |
| `plan` | `pick(['weekly','biweekly','monthly'])` — `planCycle` L9851 | L9851, L9858 |
| `vehicle` | `pick(['Economy','Comfort'])` — `vehicleCycle` L9852 | L9852, L9858 |
| `pickup` / `dest` | `randRoute()` (L9830–L9833): pickup is `pick(districts)+' District'`, destination is `pick(landmarks)`, re-drawn once if they collide | L9830–L9833, L9855, L9859 |
| `preferredTime` | `pad(6+floor(random()*3))+':'+pick(['00','15','30','45'])+' AM'` → **06:00–08:45 AM in quarter-hour steps only** | L9859 |
| `requestedAt` | `ts(dayOffset, 6+floor(random()*10), floor(random()*60))` → hours **06–15**, any minute | L9821–L9824, L9860 |
| `status` | the loop's argument | L9860 |
| `notes` | `''` — always empty at seed time | L9860 |
| `assignedBy` | **only when `status==='assigned'`**: `pick(['Sarah Al-Rashid','Fahad Al-Dosari','Ops'])` | L9862 |
| `assignedAt` | **only when `status==='assigned'`**: the literal string `'Earlier today'` | L9862 |
| `expiredAt` | **only when `status==='expired'`**: `ts(dayOffset-1,9,0)` → `dayOffset` 2 becomes 1, i.e. **always `'24 Jun 09:00'`** for all 13 expired records | L9863 |

`ts(dayOffset,h,m)` (L9821–L9824) computes `day = 25 - dayOffset` against the demo clock — the source comment at L9822 states *"'today' in the demo clock is 25 Jun 2026"*. So `dayOffset` 0 → `25 Jun`, 1 → `24 Jun`, 2 → `23 Jun`.

### 20.3 Consequences for anything reading these records

- **`assignedAt` is not a timestamp.** All 13 assigned records carry the literal string `'Earlier today'` (L9862), not a parseable date. Any sort or age calculation on that field is meaningless.
- **All 13 expired records share one `expiredAt`** — `'24 Jun 09:00'` (L9863) — because `dayOffset` is the constant `2` for that loop.
- **`sreqSeq` is a plain counter starting at 100** (L9853) with no collision check against ids already in `DB.subscriptionRequests`. `seedMoreRequests` is called once (L14557), so no collision occurs today; a second call would re-issue SREQ-101 onward.
- Every seeded request points at a **generated** rider (`newRiderIds`, L9816/L9829), so a rider named in a seeded request always exists in `DB.riders` — but never one of the ten narrative riders (`RDR-1041`, `RDR-1075`, …).
- `pushSub` has **4 references** in the file: the declaration (L9854) and the three loop call sites (L9866, L9867, L9868).

### 20.4 Sibling generator

`pushRide` (L9837–L9845), the instant-ride equivalent in the same function, is documented in `06b-quick-rides-and-ride-requests.md` §19. `makeRider` (L9800–L9818), which produces the rider pool both of them draw from, is documented in `09a-riders.md` §20.

### 20.5 Line-number index for §§19–20

| Symbol | Lines |
|---|---|
| `seedMoreRequests()` | 9787–9869 |
| `makeRider()` (see `09a` §20) | 9800–9818 |
| 45-rider loop | 9819 |
| `ts(dayOffset,h,m)` + demo-clock comment | 9821–9824 |
| `randRider()` | 9829 |
| `randRoute()` | 9830–9833 |
| `pushRide()` (see `06b` §19) | 9837–9845 |
| `planCycle` / `vehicleCycle` / `sreqSeq` | 9851 / 9852 / 9853 |
| **`pushSub(status,dayOffset)`** | **9854–9865** |
| `pending` loop (14) | 9866 |
| `assigned` loop (13) | 9867 |
| `expired` loop (13) | 9868 |
| `REQ_ALL_PAGE_SIZE` declaration | 9886 |
| **`reqRenderPager()`** | **10125–10135** |
| — single-page short circuit | 10128 |
| `renderRequestsSubAll()` | 10137–10169 |
| — empty-state early return | 10158–10161 |
| — **`#requests-sub-all-pager` emitted** | **10167** |
| — `reqRenderPager` call | 10168 |
| `gotoReqSubAllPage(p)` | 10170–10173 |
| `REQ_ALL_PAGE_SIZE` reassignment | 10178 |
| `renderRequestsInstantAll()` | 10183–10216 |
| — **`#requests-instant-all-pager` emitted** | **10214** |
| — `reqRenderPager` call | 10215 |
| `gotoReqInstantAllPage(p)` | 10217–10220 |
| Boot `seedMoreRequests()` | 14557 |
