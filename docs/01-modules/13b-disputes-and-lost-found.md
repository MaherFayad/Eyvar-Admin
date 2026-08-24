# Module: Disputes & Lost and Found

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `support` — these are the third and fourth cards of `<div class="page" id="p-support">`
> **HTML lines:** Disputes card **L1368–L1371** (`#dispute-count`, `#dispute-list`); Lost & Found card **L1372–L1375** (`#lf-list`)
> **Sibling docs:** `13a-support-center-tickets.md` (same page, tickets + team), `13c-contact-drivers.md`, `13d-interventions.md`

---

## 1. Purpose

Two separate sub-systems that share the Support Center page.

**Disputes** (`L14389–L14448`) resolve a rider's money claim against a subscription trip using an **evidence-first** model: each dispute carries a list of manually-written evidence lines plus, where telemetry exists, an automated **arrival verdict** derived from GPS pings (`arrivalEvidence()`, `L17643–L17699`). Resolution is one of three outcomes with a computed financial effect based on the subscription's per-trip value.

**Lost & Found** (`L14450–L14479`) is a three-state linear workflow for items left in a vehicle: *searching → with_driver → returned*. It is a table with a single "advance" button per row.

---

## 2. Entry points & routing

| Route in | Mechanism | Line |
|---|---|---|
| Sidebar → "Support Center" | `go('support',this)` → `L8806` calls `renderDisputes()` and `renderLostFound()` | `L533`, `L8806` |
| Work inbox → dispute row | `QUEUE_ROUTE.dispute='support'`; row action `openArrivalEvidence('<sub or trip>','<DSP-id>')` | `L19107`, `L19135–L19136` |
| Work inbox → lost-found row | `QUEUE_ROUTE.lostfound='support'`; row action `go('support',null)` with label **Advance** | `L19109`, `L19198–L19199` |
| Ownership refresh | `refreshOwnershipSurfaces()` re-runs `renderTickets()` **and** `renderDisputes()` when `#p-support` is active | `L19051` |
| Trip profile → arrival evidence | `openArrivalEvidence(tripId)` without a dispute id (read-only, no resolve buttons) | `L17749–L17760` |

There is **no dedicated page, no deep link and no back-navigation entry** for an individual dispute or lost-item record — both live only as cards on `p-support`.

---

## 3. Layout map

```
p-support
└── … tickets + support team (see 13a) …
├── card  (L1368–L1371)
│    ├── .ch  h2 "⚖️ Disputes — evidence-first resolution"
│    │        span.b.b-amber #dispute-count  (markup default "0 open")
│    └── #dispute-list   max-height 480px, overflow-y auto
│         └── per dispute (renderDisputes, L14396–L14430)
│              ├── left column (min-width 260px)
│              │    ├── DSP-id (monospace, amber) + status badge + sub-id badge
│              │    ├── claim text
│              │    ├── "Claimant X · Against Y · Per-trip value at stake: <SAR>"
│              │    ├── evidence rows (grey pills, one per [label, text] pair)
│              │    └── telemetry verdict pill (only when arrivalEvidence() returns)
│              └── right column (min-width 190px, only while status==='open')
│                   ├── workChip('dispute', id)
│                   ├── btn "🔍 Open evidence trail"
│                   ├── btn primary "Uphold — refund 1 trip (<SAR>)"
│                   ├── btn "Reject — evidence contradicts claim"
│                   └── btn warn "Goodwill credit (50%)"
└── card  (L1372–L1375)
     ├── .ch  h2 "🎒 Lost & Found"
     │        span "Item → driver confirms → returned"   ← static caption
     └── #lf-list   max-height 360px, overflow-y auto
          └── table.dt  (renderLostFound, L14454–L14468)
```

---

## 4. Data model & fields

### 4.1 `DB.disputes` — array, seeded at `L14390–L14395`

| Field | Type | Meaning | Line |
|---|---|---|---|
| `id` | string `DSP-##` | Primary key. **No creation function exists** — the array is seed-only (see §18). | `L14391` |
| `sub` | subscription id (`SUB-1075`) | Used for (a) the sub badge, (b) `DB.subscriptions[d.sub]` → `subEconomics()` for the money at stake, (c) as the fallback evidence key. | `L14391` |
| `claim` | string | Free-text claim, rendered as raw HTML. | `L14391` |
| `claimant` | rider id | Rendered via `nm2()`; the party credited on an upheld claim. | `L14391` |
| `against` | driver id | Rendered via `nm2()`. **No penalty is ever applied to this party** — the gate copy states so explicitly. | `L14391` |
| `status` | `'open'` \| `'resolved'` | Only two values exist. | `L14391`, `L14440` |
| `evidence` | array of 2-element arrays `[label, text]` | Rendered as grey pills, label in blue. Manually authored, not derived. | `L14392` |
| `trip` | *(never present on seeded data)* | Read as `d.trip \|\| d.sub` for the evidence key (`L14412`, `L14418`). Since neither seeded dispute defines `trip`, the subscription id is always used — and `seedArrivalTraces()` deliberately seeds traces under those subscription ids (`L18093–L18095`). | `L14412` |
| `outcome` | `'refund'` \| `'reject'` \| `'goodwill'` | Written by `resolveDispute()`; **never rendered anywhere**. | `L14440` |

**Seeded records:**

| id | sub | claimant | against | status | claim |
|---|---|---|---|---|---|
| `DSP-07` | `SUB-1075` | `RDR-1075` (Sara Al-Ghamdi) | `DRV-0101` | open | *"Driver never arrived on Tuesday" — rider requests one trip refunded* |
| `DSP-06` | `SUB-1052b` | `RDR-1052` | `DRV-0104` | open | *"Charged for Comfort, driver arrived in Economy vehicle"* |

**DSP-07 evidence (3 rows, `L14392`):**
1. `GPS trail` — "Driver device at pickup point 06:54–07:12 (18 min on site)"
2. `App events` — "Rider marked \"no-show\" 07:02; driver marked \"waiting\" 06:55"
3. `Contact log` — "Driver called rider twice (06:57, 07:03) — no answer"

**DSP-06 evidence (3 rows, `L14394`):**
1. `Vehicle registry` — "Assigned vehicle: Camry (Comfort class) — plate matches registration"
2. `Trip photo` — "No photo submitted by rider"
3. `History` — "No prior vehicle-class complaints against this driver"

### 4.2 `DB.lostFound` — array, seeded at `L14451–L14455`

| Field | Type | Meaning |
|---|---|---|
| `id` | string `LF-##` | Primary key. **No creation function exists.** |
| `item` | string | Item description, rendered bold. |
| `trip` | trip id | Clickable → `openProfile(trip)`, purple. |
| `rider` | rider id | Clickable → `openProfile(rider)`; displayed via `nm2()`. |
| `driver` | driver id | Clickable → `openProfile(driver)`; displayed via `nm2()`. |
| `reported` | display string (`'08:55'`, `'Yesterday'`, `'22 Jun'`) | Not machine-readable; no numeric timestamp exists. |
| `status` | `'searching'` \| `'with_driver'` \| `'returned'` | The only three values; see §5.2. |

**Seeded records:**

| id | item | trip | rider | driver | reported | status |
|---|---|---|---|---|---|---|
| `LF-09` | Black backpack | TRP-9008 | RDR-2031 | DRV-0104 | 08:55 | `with_driver` |
| `LF-08` | iPhone (blue case) | TRP-8977 | RDR-2087 | DRV-0102 | Yesterday | `returned` |
| `LF-07` | House keys | TRP-8720 | RDR-1041 | DRV-0101 | 22 Jun | `searching` |

### 4.3 `LF_FLOW` — the transition table (`L14456`)

```js
var LF_FLOW = {
  searching:   ['with_driver', 'Driver confirmed item found'],
  with_driver: ['returned',    'Item returned to rider']
};
```
`returned` has no entry ⇒ terminal state, no button rendered (`L14466`), and `advanceLF` returns early (`L14472`).

### 4.4 Arrival-evidence data (`DB.arrivalTraces`, `DB.arrivalConfig`)

`DB.arrivalConfig` (`L17605–L17610`):

| Key | Value | Meaning |
|---|---|---|
| `arrivalRadiusM` | **120** | How close counts as "at the pickup point". |
| `meetRadiusM` | **40** | How close both devices must get to count as a meeting. |
| `minDwellMin` | **5** | Minimum time on site before "waited" is credible. |
| `riderGraceMin` | **10** | Declared but **never read** — see §18. |

`DB.arrivalTraces[key]` = `{pings:[{tsMs,distanceM}], riderPings:[{tsMs,distanceM}], events:[[minOffset, actor, text]], shape}` (`L17615–L17640`). Four synthetic shapes exist: `arrived_rider_absent`, `never_arrived`, `ambiguous`, and the default *clean meeting*.

`seedArrivalTraces()` (`L18092–L18100`, invoked immediately at `L18101`):
- `seedArrivalTrace('SUB-1075','arrived_rider_absent')`
- `seedArrivalTrace('SUB-1052b','ambiguous')`
- then every trip id: index 1 → `never_arrived`, index 3 → `ambiguous`, all others → `clean`.

### 4.5 Money source — `subEconomics(sub)` (`L3605–L3616`)

```
paid      = parseFloat(sub.paid stripped of non-digits)      // '86.50 SAR' → 86.50
[done,total] = sub.trips.split('/')                          // '2/5' → 2,5
perTrip   = total>0 ? paid/total : 0
consumed  = min(done,total) * perTrip
remaining = max(0, paid - consumed)
driverAccrued = consumed * (1 - EYVAR_COMMISSION_PCT/100)    // EYVAR_COMMISSION_PCT = 20 (L3604)
```
Only `perTrip` is used by the dispute code (`L14400`, `L14436`, `L17858`).

---

## 5. Statuses & transition rules

### 5.1 Dispute status machine

| State | Entered when | Exits to | Actions available |
|---|---|---|---|
| `open` | Seed only (`L14391`) | `resolved` | Open evidence trail, Uphold (refund), Reject, Goodwill 50 %, Claim/Release/Take over |
| `resolved` | `resolveDispute(id,outcome)` (`L14440`) — for **any** of the three outcomes | *(terminal — no reopen path)* | none; the entire right-hand action column disappears (`L14415`) |

Badge: `open` → `<span class="b b-blue">Open</span>`; anything else → `<span class="b b-green">Resolved</span>` (`L14405`).

There is **no SLA clock, no priority and no reason code on a dispute.** Its inbox entry is hard-coded to `severity:'high'` with `dueMs = null` (`L19134`), so it never appears as breached.

### 5.2 Lost & Found status machine

| State | Entered when | Badge | Exits to | Action button |
|---|---|---|---|---|
| `searching` | Seed | `<span class="b b-amber">Searching</span>` | `with_driver` | **"Driver confirmed item found"** |
| `with_driver` | `advanceLF` from `searching` | `<span class="b b-blue">With driver</span>` | `returned` | **"Item returned to rider"** |
| `returned` | `advanceLF` from `with_driver` | `<span class="b b-green">✓ Returned</span>` | *(terminal)* | none |

Strictly linear and forward-only — there is no way to move an item backwards or mark it lost/unrecoverable.

---

## 6. Categories / reason codes

**Disputes carry no reason code of their own.** They are not stamped by `slaStampNewTicket` and never appear in `cptStats()`. The taxonomy touches disputes only indirectly, through the ticket codes that describe the same scenarios:

| Related reason code | Line | Relevance |
|---|---|---|
| `CAP_NOSHOW` (§1.3, T2, comp 50) | `L14672` | The DSP-07 scenario ("driver never arrived"). |
| `DRV_DEDUCTION_DISPUTE` (T2, comp 0) | `L14714` | Driver-side deduction disputes — handled elsewhere. |
| `DRV_RATING_DISPUTE` (T3, comp 0) | `L14713` | Rating disputes — routed to the **Captain fairness** page, not here. |
| `TRP_LOST_ITEM` (§4.2, T3, fr 15, res 2880, **upd 30**, owner Ops) | `L14685` | The ticket code whose 30-minute recurring update clock corresponds to the Lost & Found promise. **Nothing links an `LF-##` record to a ticket carrying this code.** |
| `SAF_THEFT` (§6.3, T2) | `L14693` | Theft, as distinct from an item left behind. |

**Dispute outcome codes — the complete set (3):** `refund`, `goodwill`, `reject` (`L14436`).

---

## 7. Automation logic

### 7.1 Arrival-evidence verdict engine — `arrivalEvidence(tripId)` (`L17643–L17699`)

Returns `null` when no trace exists for the key. Otherwise it answers **three separate questions**:

| Q | Question | `answer` computation | `detail` string |
|---|---|---|---|
| **q1** | "Was the captain at the pickup point?" | `closest <= arrivalRadiusM (120)` → `'yes'` else `'no'` | `Closest device reading <N> m from the pickup pin (threshold 120 m).` |
| **q2** | "Did the captain wait long enough?" | `dwellMin >= minDwellMin (5)` → `'yes'`; else `'no'` if q1 was yes; else `'n/a'` | `On site for <N> minutes (minimum 5).` or `Never on site long enough to measure.` |
| **q3** | "Did the captain and rider actually meet?" | `metLikely===null` → `'unknown'`; `metLikely` → `'likely'`; else `'no'`. `metLikely = riderKnown ? (closest<=40 && riderClosest<=40) : null` | Rider-device distance, or the explicit statement *"**The rider device reported no position.** Presence at the pin cannot prove a meeting — this is the limit of the data, not a finding against either party."* |

where `onSite` = pings within 120 m, `closest` = min ping distance, `dwellMin = round((lastOnSite.tsMs - firstOnSite.tsMs)/60000)` when ≥ 2 on-site pings else `0`.

**Verdict cascade (first match wins, `L17669–L17696`):**

| # | Condition | `verdict` | `confidence` | `note` |
|---|---|---|---|---|
| 1 | q1 yes ∧ q2 yes ∧ **no rider pings** | `captain_performed` | **80** | "The captain was where they said, for as long as they said. Whether the rider was there cannot be established — their device sent nothing." |
| 2 | q1 yes ∧ q2 yes ∧ `metLikely===false` | `both_present_no_contact` | **60** | "Both were near the pin but never close enough to meet. This is usually a wrong pickup spot, not bad faith by either side." |
| 3 | q1 yes ∧ q2 yes (rider met) | `captain_performed` | **92** | "Arrival and wait both corroborated." |
| 4 | q1 no ∧ `closest <= 240` (2 × radius) | `inconclusive` | **45** | "Closest reading was `<N>` m — outside the 120 m threshold but inside the margin where GPS error alone explains the gap. This does not establish absence. Call both parties before deciding." |
| 5 | q1 no ∧ rider known ∧ `riderClosest <= 120` | `captain_absent` | **90** | "The rider was at the pin; the captain never came within `<N>` m of it." |
| 6 | q1 no (otherwise) | `captain_absent` | **75** | "No captain reading near the pickup point at any time." |
| 7 | else | `inconclusive` | **40** | "Signals conflict. Do not decide on this alone — call both parties." |

**`VERDICT_LABEL`** (`L17700–L17705`) — the complete 4-value map:

| verdict | label | colour |
|---|---|---|
| `captain_performed` | ✅ Captain performed | `var(--green)` |
| `captain_absent` | ⛔ Captain did not arrive | `var(--red)` |
| `both_present_no_contact` | ⚠ Both present, never met | `var(--amber-dk)` |
| `inconclusive` | ❓ Inconclusive — do not decide on this alone | `var(--amber-dk)` |

**Verdicts the two seeded disputes actually produce** (derived from the seeded traces at `L17624–L17636`):

| Dispute | Trace shape | closest | dwell | rider pings | Verdict | Confidence |
|---|---|---|---|---|---|---|
| DSP-07 (`SUB-1075`) | `arrived_rider_absent` | 28 m | 14 min | none | `captain_performed` | 80 % |
| DSP-06 (`SUB-1052b`) | `ambiguous` | 165 m | 0 | 3 pings | `inconclusive` | 45 % |

### 7.2 The confirmation gate on `resolveDispute` — `installActionGates()` (`L17857–L17886`)

`guardAction('resolveDispute', builder)` (`L17817–L17842`) wraps the global so it cannot run until confirmed. The builder returns:

| Gate field | Value |
|---|---|
| `title` | `Resolve dispute <DSP-id>` |
| `ownerWarn` | `ownershipWarning('dispute',dspId)` — amber banner when someone else holds the item (`L18956–L18960`) |
| `danger` | `outcome !== 'reject'` (so refund and goodwill render in red) |
| `irreversible` | `true` → "⚠ This cannot be undone." (`L17795`) |
| `summary` | the claim text + `Claimant X · against Y`, plus `Evidence verdict: <label> (<n>% confidence)` in the verdict colour when a trace exists |
| `confirmLabel` | `Reject claim` or `Issue <SAR>` |

**Consequences shown, by outcome:**

*Reject:*
1. "No credit is issued to `<claimant>`."
2. "The rejection and its evidence are recorded against the claim."
3. "The rider can escalate — a rejection is not the end of the matter."

*Refund / goodwill:*
1. "`<amount>` credited to `<claimant>`."
2. "The dispute closes and cannot be reopened from this screen."
3. "A credit note is issued against the original tax invoice."
4. "`<against>`'s record is **not** marked at fault by this alone."

*Appended to either list when `verdict === 'inconclusive'`:*
5. "**The evidence is inconclusive.** Consider calling both parties before deciding."

**Gate options (`L17883–L17884`):**

| Option id | Type | Label | Default |
|---|---|---|---|
| `notify` | checkbox | "Notify the claimant of the outcome" | **checked** |
| `note` | text | "Internal note (optional)" · placeholder "Why this decision" | empty |

Both are collected into `window.__confirmValues` by `runConfirm()` (`L17803–L17812`, `L17836`) and **neither is read by `resolveDispute`** — see §18.

`window.__skipGuards` (`L17816`) bypasses the gate for programmatic/seed calls; the boot block sets it for the whole seed run (`L21833–L21845`).

### 7.3 Lost & Found — no automation

`advanceLF` is entirely manual. There is no timer, no reminder, no SLA and no notification. The `TRP_LOST_ITEM` reason code's 30-minute recurring update promise (`L14685`) is enforced only on tickets, never on `DB.lostFound` rows.

---

## 8. KPIs

| Name | Element | Source | Formula | Thresholds |
|---|---|---|---|---|
| Open disputes | `#dispute-count` (`L1369`) | `DB.disputes` | `filter(d=>d.status==='open').length + ' open'` (`L14398`) | Always `b-amber` — the class is fixed in markup and never changed |
| Per-trip value at stake | inline per dispute row (`L14408`) | `DB.subscriptions[d.sub]` | `subEconomics(sub).perTrip` = `paid / totalTrips`, rendered by `fmtSAR` (2 dp + " SAR"). `0` when the subscription is missing (`L14400`) | none |
| Uphold amount | button label (`L14419`) | same | `perTrip` | none |
| Goodwill amount | computed in `resolveDispute` (`L14436`) | same | `perTrip * 0.5` (the button label only says "50 %", not the SAR figure) | none |
| Reject amount | — | — | `0` | — |
| Telemetry confidence | inline pill (`L14414`) | `arrivalEvidence()` | see §7.1 — 40 / 45 / 60 / 75 / 80 / 92 | colour from `VERDICT_LABEL` |

**Seeded money figures** (from `DB.subscriptions`, `L2689–L2690`):

| Dispute | Subscription | paid | trips | perTrip | Uphold | Goodwill |
|---|---|---|---|---|---|---|
| DSP-07 | SUB-1075 · Weekly Economy | 86.50 SAR | 2/5 | **17.30 SAR** | 17.30 | 8.65 |
| DSP-06 | SUB-1052b · Weekly Comfort | 122.50 SAR | 3/5 | **24.50 SAR** | 24.50 | 12.25 |

**Lost & Found has no KPI at all** — no count, no badge, no header figure. Only the static caption "Item → driver confirms → returned" (`L1373`).

---

## 9. Data displayed

### 9.1 Dispute row — `renderDisputes()` (`L14396–L14430`)

| Element | Source | Type | Notes |
|---|---|---|---|
| `DSP-##` | `d.id` | monospace, `var(--amber-dk)` | `L14406` |
| Status badge | `d.status` | blue "Open" / green "Resolved" | `L14405` |
| Subscription badge | `d.sub` | grey badge | `L14406` |
| Claim | `d.claim` | raw HTML, 12 px | `L14407` |
| Parties + money | `nm2(d.claimant)`, `nm2(d.against)`, `fmtSAR(perTrip)` | 10 px muted, value bold | `L14408` |
| Evidence pills | `d.evidence[i][0]` (blue bold) + `[1]` | grey rounded pills | `L14410` |
| Telemetry verdict pill | `arrivalEvidence(d.trip \|\| d.sub)` | pill with a 3 px left border in the verdict colour: `Telemetry verdict: <label> · <n>% — <note>` | `L14411–L14416`; renders `''` when no trace exists |
| Ownership chip | `workChip('dispute', d.id)` | Claim / yours / held-by chips | `L14417` |

Row is **not** clickable as a whole; only the four buttons and the ownership chips are interactive.

### 9.2 Lost & Found table — `renderLostFound()` (`L14454–L14468`)

| # | Column | Source | Rendering |
|---|---|---|---|
| 1 | ID | `l.id` | monospace 11 px |
| 2 | Item | `l.item` | bold |
| 3 | Trip | `l.trip` | purple, `cursor:pointer` → `openProfile(l.trip)` |
| 4 | Rider | `nm2(l.rider)` | `cursor:pointer` → `openProfile(l.rider)` |
| 5 | Driver | `nm2(l.driver)` | `cursor:pointer` → `openProfile(l.driver)` |
| 6 | Reported | `l.reported` | 10.5 px muted |
| 7 | Status | derived badge | see §5.2 |
| 8 | *(blank header)* | `LF_FLOW[l.status]` | `<div class="ra">` with a primary button labelled `next[1]`, or empty on `returned` |

### 9.3 Arrival-evidence modal body — `arrivalEvidenceHTML(tripId)` (`L17706–L17748`)

| Block | Content |
|---|---|
| Verdict card | `VERDICT_LABEL[verdict][0]` in the verdict colour + `· confidence <n>%` + the `note` paragraph |
| Three question rows | `YES` / `NO` / `LIKELY` / `UNKNOWN` / `N/A` in green (yes/likely), red (no) or ghost, then the question and its `detail` |
| "Position trail — distance from the pickup pin" | One row per captain ping: `HH:MM` (en-GB), a bar whose width is `max(3, min(100, 100 - distanceM/25))` %, coloured green when ≤ 120 m else red, the metre figure, and the word "captain" |
| Rider pings | One row per rider ping (`rider device <N> m from pin`), **or** the amber line "⚠ No rider position reported — one side of this story has no data." |
| "App events" | One row per `events` entry: an actor badge (`driver` blue / `rider` purple / `system` grey), the text, and `· +<n> min` |
| Empty state | *"No arrival trace recorded for this trip. Telemetry is captured from the moment a captain accepts — an older trip may predate it."* (`L17708`) |

---

## 10. Input fields

**Neither card has a filter, a search box, a sort control, a select or a text input of its own.**

The only inputs anywhere in these flows are the two gate options injected by `confirmAction` when resolving a dispute:

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| `cfa-notify` | checkbox | "Notify the claimant of the outcome" | **checked** | none | `window.__confirmValues.notify` — **never read** (§18) |
| `cfa-note` | text | "Internal note (optional)" · placeholder "Why this decision" | empty | none | `window.__confirmValues.note` — **never read** (§18) |

---

## 11. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **🔍 Open evidence trail** | `openArrivalEvidence(d.trip\|\|d.sub, d.id)` `L17749–L17760` | Opens the evidence modal (§13.1) with three resolve buttons in its footer | — | none | none | no |
| **Uphold — refund 1 trip (`<SAR>`)** | `resolveDispute(id,'refund')` `L14431–L14446` | `d.status='resolved'`, `d.outcome='refund'`; `renderDisputes()`; audit; toast `✅ <id> resolved — <SAR> credited`. **`amount = perTrip`** | `DB.disputes`, `DB.auditLog` | `manage_subscriptions` **and** page-perm `support.manage` | `resolve_dispute` with before `{status:'open'}` / after `{status:'resolved',outcome}` | **yes** — full consequence gate (§7.2) |
| **Reject — evidence contradicts claim** | `resolveDispute(id,'reject')` | Same, `outcome='reject'`, **`amount = 0`**; toast `📋 <id> rejected — decision recorded with evidence` | same | same | `resolve_dispute` | yes (non-danger styling) |
| **Goodwill credit (50 %)** | `resolveDispute(id,'goodwill')` | Same, `outcome='goodwill'`, **`amount = perTrip * 0.5`**; toast `✅ <id> resolved — <SAR> credited` | same | same | `resolve_dispute` | yes |
| **✋ Claim / ↩ / take over** (dispute) | `claimItem`/`releaseItem`/`confirmTakeover` on type `'dispute'` `L14417` | Ownership claim on `dispute:<DSP-id>`; stale after 30 idle minutes | `DB.ownership`, `DB.auditLog` | none | `claim_taken` / `claim_taken_over` / `claim_released` / `claim_expired` | takeover only |
| **"Driver confirmed item found"** / **"Item returned to rider"** | `advanceLF(lfId)` `L14469–L14478` | `l.status = LF_FLOW[l.status][0]`; `renderLostFound()`; `logAction('lost_found','lf',lfId, '<item> — <transition label>', {}, {status:next})`; toast `✅ <item>: <label>` | `DB.lostFound`, `DB.auditLog` | page-perm `support.manage` only (`L14469`) | `lost_found` | **yes** — `guardAction('advanceLF')` `L18054` (`installActionGates`) |
| Trip / Rider / Driver cell click | `openProfile(id)` `L14463–L14465` | Navigates to the 360° profile | history | none | none | no |

### 11.1 Financial and operational effect of each dispute outcome

| Outcome | `amount` formula | What the code **actually** does | What the gate **claims** happens |
|---|---|---|---|
| `refund` | `perTrip` | Sets `status='resolved'`, `outcome='refund'`; writes an audit line containing the SAR figure and the claimant name | "`<amount>` credited to `<claimant>`" · "A credit note is issued against the original tax invoice" |
| `goodwill` | `perTrip * 0.5` | identical | same as refund |
| `reject` | `0` | identical, audit line reads "no credit; evidence contradicted the claim" | "No credit is issued" · "The rider can escalate" |

**No money actually moves.** `resolveDispute` never calls `recordRefund`, `commitWalletAdjust`, a credit-note function or `sendSystemEmail` — the ledger, the rider wallet and the outbox are untouched. The amount exists only in the button label, the gate copy and the audit description. See §18.

Neither outcome touches the driver's record, rating, deductions or payout — consistent with the gate's own statement *"`<against>`'s record is **not** marked at fault by this alone."*

---

## 12. Tables & lists

### 12.1 Dispute list (`#dispute-list`)

- **Not a `<table>`** — a stack of bordered flex blocks, one per dispute.
- **Source:** `DB.disputes` in array order (`L14399`) — **no sort, no filter, no search**. Resolved disputes remain in the list permanently, above or below open ones depending purely on array position.
- **Row click:** none; only the buttons are interactive.
- **Empty state:** none. `DB.disputes.map(...).join('')` produces an empty string when the array is empty, leaving a blank 480 px card.
- **Scroll:** `max-height:480px; overflow-y:auto` (`L1370`).

### 12.2 Lost & Found table (`#lf-list`)

- `<table class="dt">` with the 8 columns listed in §9.2.
- **Source:** `DB.lostFound` in array order (`L14456`) — **no sort, no filter, no search**; `returned` items stay in the table forever.
- **Row click:** none at row level; three individual cells navigate to profiles.
- **Empty state:** none — the header row would render alone.
- **Scroll:** `max-height:360px; overflow-y:auto` (`L1374`).

---

## 13. Modals opened

### 13.1 Arrival evidence — `openArrivalEvidence(tripId, dspId)` (`L17749–L17760`)

| Element | Detail |
|---|---|
| Title | `🔍 Arrival evidence — <tripId>` (for the seeded disputes this is the **subscription** id, since `d.trip` is undefined) |
| Body | `arrivalEvidenceHTML(tripId)` inside a `max-height:66vh` scroller — see §9.3 |
| Footer (only when `dspId` is passed) | **Reject claim** → `closeModal(); resolveDispute(dspId,'reject')` · **Goodwill 50%** → `…'goodwill'` · **Uphold — full refund** (primary) → `…'refund'` |
| Footer (always) | **Close** → `closeModal()` |

Note the footer label says "Uphold — **full** refund" whereas the card button says "Uphold — refund **1 trip**"; both call the identical `refund` path worth `perTrip`.

### 13.2 Resolve-dispute confirmation gate — `confirmAction(spec)` (`L17767–L17801`)

| Element | Detail |
|---|---|
| Title | `⚠ Resolve dispute <DSP-id>` (the `⚠` prefix appears only when `danger` is true, i.e. refund/goodwill) |
| Owner warning banner | amber, only when another user holds the item: *"⚠ `<owner>` is holding this item (picked up `<age>` ago). Acting now is how a customer ends up with two answers."* |
| Summary | claim text, `Claimant X · against Y`, and the evidence verdict line |
| "What happens when you confirm" | red-tinted box for refund/goodwill, grey for reject; the bulleted consequences from §7.2 |
| Irreversibility line | "⚠ This cannot be undone." |
| `cfa-notify` | checkbox, default checked |
| `cfa-note` | text input |
| Footer | **Cancel** → `cancelConfirm()` · **`<confirmLabel>`** → `runConfirm()` (red button for refund/goodwill, primary for reject) |

### 13.3 Takeover confirmation (dispute) — `confirmTakeover('dispute',id)` (`L18941–L18952`)

Summary `<owner> has held <DSP-id> for <age>.` Consequences: "You become the owner; they lose it without being asked." / "The takeover is logged with both names — this is deliberate, so duplicated work has a trail." / "If they are mid-call with the customer, message them first." Confirm label **Take over**.

### 13.4 Case view (when a dispute is correlated) — `openCaseView(caseId)` (`L19003–L19027`)

Reached from the purple `🔗 CASE-#### · +n` chip. Lists every linked record with its type badge and current holder, plus the closing note *"Closing the case clears all `<n>` records from their queues at once."* and a **Close the whole case** button when still open.

**Lost & Found opens no *bespoke* modal** — but `advanceLF` is wrapped by `guardAction('advanceLF')` (`L18054`, in `installActionGates()`), so a click raises the generic `confirmAction` dialog, titled with the next `LF_FLOW` stage label, before the status advances.

---

## 14. States & badges

| Badge | Trigger | Class / colour | Line |
|---|---|---|---|
| `<n> open` | `DB.disputes.filter(status==='open').length` | `b-amber` (fixed in markup) | `L1369`, `L14398` |
| `Open` | `d.status==='open'` | `b-blue` | `L14405` |
| `Resolved` | any other status | `b-green` | `L14405` |
| Subscription id | always | `b-grey` | `L14406` |
| Telemetry verdict pill | `arrivalEvidence()` returns non-null | left border + label colour from `VERDICT_LABEL` (green / red / amber-dk / amber-dk) | `L14413–L14415` |
| `✓ Returned` | `l.status==='returned'` | `b-green` | `L14458` |
| `With driver` | `l.status==='with_driver'` | `b-blue` | `L14458` |
| `Searching` | anything else | `b-amber` | `L14458` |
| `✋ Claim` / `✋ yours · <age>` / `✋ <owner>` | `whoHolds('dispute',id)` | button / `b-green` / `b-amber` | `L18928–L18939` |
| `🔗 CASE-#### · +n` | `caseFor('dispute',id)` with > 1 child | `b-purple` | `L18997–L19002` |
| Question answers in the evidence modal | `q.answer` | green (`yes`/`likely`), red (`no`), ghost (`unknown`/`n/a`) | `L17717` |
| Ping bar colour | `p.distanceM <= 120` | green / red | `L17724–L17729` |

**Neither card contributes to any sidebar badge.** `#sb-ticket-badge` and `#sbb-contacts` are computed from `DB.tickets` only (`L14958–L14968`). Disputes and lost items surface only through the **work inbox** badge (`updateInboxBadge`, via `refreshInbox()`).

---

## 15. Cross-module links

| From here → | Target | Line |
|---|---|---|
| `DB.subscriptions[d.sub]` → `subEconomics()` | Subscriptions module (per-trip value, 20 % commission constant) | `L14400`, `L3605` |
| `nm2(d.claimant)` / `nm2(d.against)` | Riders / Drivers registries | `L14408` |
| `openProfile(l.trip \| l.rider \| l.driver)` | 360° profile pages | `L14463–L14465` |
| `arrivalEvidence()` / `openArrivalEvidence()` | Shared telemetry engine, also used by the absence-recording gate (`recordAbsence`) and trip profiles | `L17643`, `L17910` |
| `workChip('dispute',…)` | Ownership + case-correlation layer | `L14417` |
| `inboxItems()` dispute + lostfound branches | Work inbox | `L19133–L19137`, `L19195–L19200` |
| `requirePerm('manage_subscriptions')` | Subscriptions permission | `L14432` |
| `requirePagePerm('support','manage')` | Page-permission matrix (`PAGE_PERMISSIONS.support`) | `L14433`, `L14469`, `L10642–L10645` |

**Into here from elsewhere:** the work inbox dispute row calls `openArrivalEvidence` directly (`L19136`); the lost-found row routes to `go('support',null)` (`L19199`); `refreshOwnershipSurfaces()` re-renders disputes whenever any claim changes anywhere (`L19051`).

---

## 16. Hardcoded / mock / demo values

| Value | Location | Note |
|---|---|---|
| `#dispute-count` = "0 open" in markup | `L1370` | Overwritten on first render. |
| Lost & Found caption "Item → driver confirms → returned" | `L1373` | Static; describes the flow but is not data-driven. |
| Two seeded disputes DSP-07 / DSP-06 with 3 hand-written evidence lines each | `L14390–L14395` | Entirely fictional; the "GPS trail" line for DSP-07 (*"06:54–07:12 (18 min on site)"*) does **not** match the seeded telemetry, which yields 14 minutes on site. |
| Three seeded lost items LF-07 / LF-08 / LF-09 | `L14451–L14455` | |
| `DB.arrivalConfig` thresholds 120 m / 40 m / 5 min / 10 min | `L17605–L17610` | Chosen constants, editable only by editing the file. |
| Four synthetic trace shapes and their exact ping arrays | `L17615–L17640` | Comment states: *"Synthetic traces for the demo. Real deployment feeds these from driver and rider app telemetry."* |
| `seedArrivalTrace(…, agoMs(600))` — every trace starts 600 minutes before load | `L17616` | |
| Trace assignment: SUB-1075 → `arrived_rider_absent`, SUB-1052b → `ambiguous`, trip index 1 → `never_arrived`, index 3 → `ambiguous`, rest → `clean` | `L18092–L18100` | Demo staging so all verdict branches are visible on first load. |
| `EYVAR_COMMISSION_PCT = 20` | `L3604` | Used by `subEconomics`, though disputes only read `perTrip`. |
| Confidence figures 40 / 45 / 60 / 75 / 80 / 92 | `L17669–L17696` | Hand-assigned constants, not statistical. |
| GPS-error margin = `arrivalRadiusM * 2` (240 m) | `L17679` | Justified in the comment as "urban GPS error routinely runs 50–150 m". |
| Ping-bar width formula `100 - distanceM/25` | `L17727` | Purely cosmetic scaling. |

---

## 17. i18n keys

**None.** Neither card carries a `data-i18n` attribute (`L1368–L1375`), and every string — card titles, badges, button labels, evidence text, verdict labels, gate copy — is hard-coded English, generated inside JS template strings. The only translated strings on the whole page are the sidebar entries `sec.support` and `nav.support` (see `13a` §17).

---

## 18. Gaps, dead code, UNVERIFIED items

1. **No dispute can be created.** `DB.disputes` is seeded at `L14390` and only ever read; there is no `newDispute`, no `openDispute` and no push/unshift anywhere. Real rider claims cannot enter the system.
2. **No lost-item can be created.** Same: `DB.lostFound` is seed-only (`L14451`). The `TRP_LOST_ITEM` reason code and its 30-minute update clock exist on tickets, but nothing creates the corresponding `LF-##` record.
3. **`resolveDispute` moves no money.** Despite computing `amount` (`L14436`) and the gate promising a credit and a credit note (`L17878–L17881`), the function only flips `status`/`outcome` and writes an audit line (`L14440–L14444`). No `recordRefund`, no wallet adjustment, no credit note, no email.
4. **Gate options are collected and discarded.** `notify` and `note` land in `window.__confirmValues` (`L17836`) and `resolveDispute` never reads them (`L14431–L14446`) — so "Notify the claimant" does nothing and the internal note is lost.
5. **`d.outcome` is never rendered.** After resolution the card shows only a green "Resolved" badge; whether it was upheld, rejected or a goodwill credit is visible only in the audit log.
6. **No reopen path for disputes.** The gate says "cannot be reopened from this screen" and indeed nothing sets `status` back to `open`.
7. **Resolved disputes never leave the list.** `renderDisputes` maps the whole array (`L14399`), so the card grows monotonically with no filter or archive.
8. **`DB.arrivalConfig.riderGraceMin = 10`** (`L17609`) is defined and never read anywhere.
9. **Evidence key mismatch is latent.** `d.trip || d.sub` (`L14412`, `L14418`) works today only because `seedArrivalTraces` deliberately seeds traces under the two subscription ids (`L18093–L18094`). Any real dispute carrying a `trip` field would need a trace under the trip id, and any new subscription dispute without a hand-seeded trace renders no verdict pill at all.
10. **Seeded evidence contradicts seeded telemetry.** DSP-07's hand-written "GPS trail" line claims 18 minutes on site (`L14392`); the trace yields a 14-minute dwell (pings at +8 and +22 min, `L17624`). Both are shown in the same card.
11. **Lost & Found has no reversal.** `advanceLF` (`L14469–L14478`) *is* confirm-gated (`guardAction('advanceLF')`, `L18054`), but once confirmed there is no undo, no "item not found / unrecoverable" terminal state, and no way to correct a mis-click.
12. **Lost & Found has no timestamps.** `reported` is a display string; there is no `openedAtMs`, so no age, SLA or ordering by recency is possible.
13. **Permission inconsistency.** `resolveDispute` requires **both** `manage_subscriptions` (a Subscriptions permission, `L14432`) and `support.manage` (`L14433`), while `advanceLF` requires only `support.manage` (`L14469`). A support agent without `manage_subscriptions` can advance a lost item but cannot resolve a dispute.
14. **Neither card has an empty state.** Both renderers `.join('')` into a fixed-height container.
15. **Neither card has a filter, sort or search**, unlike the ticket queue on the same page.
16. **`claim` and `evidence` text are injected as raw HTML** (`L14407`, `L14410`) — an XSS surface if the data ever became user-supplied.
17. **The dispute inbox entry has `dueMs: null`** (`L19134`), so a dispute is permanently `severity:'high'` yet never "breached" and never sorts by deadline in the work inbox.
18. **UNVERIFIED — `updateInboxBadge`.** Referenced via `refreshInbox()` (`L19034`); its definition was not read for this document, so the exact contribution of disputes and lost items to the inbox badge count is unconfirmed.
19. **UNVERIFIED — persistence.** All writes target in-memory `DB.*`; no backend call was found.
20. **UNVERIFIED — `subEconomics` behaviour for a missing subscription.** `renderDisputes` guards with `sub ? … : 0` (`L14400`), but a dispute whose `sub` key does not exist would show "0.00 SAR at stake" and a 0.00 SAR uphold button with no warning.

---

## 19. Line-number index

| Item | Lines |
|---|---|
| Disputes card markup (`#dispute-count`, `#dispute-list`) | `L1368–L1371` |
| Lost & Found card markup (`#lf-list`) | `L1372–L1375` |
| `EYVAR_COMMISSION_PCT` | `L3604` |
| `subEconomics()` | `L3605–L3616` |
| `fmtSAR()` | `L4394` |
| `go('support')` render dispatch | `L8806` |
| `PAGE_PERMISSIONS.support` (`view` / `manage`) | `L10642–L10645` |
| `requirePagePerm()` | `L10680–L10691` |
| `DB.disputes` seed | `L14390–L14395` |
| `renderDisputes()` | `L14396–L14430` |
| `resolveDispute()` | `L14431–L14446` |
| `DB.lostFound` seed | `L14450–L14455` |
| `LF_FLOW` | `L14456` |
| `renderLostFound()` | `L14454–L14468` |
| `advanceLF()` | `L14469–L14478` |
| `DB.subscriptions['SUB-1075'/'SUB-1052b']` | `L2689–L2690` |
| `DB.arrivalConfig` | `L17605–L17610` |
| `DB.arrivalTraces` | `L17611` |
| `seedArrivalTrace()` (4 shapes) | `L17615–L17640` |
| `arrivalEvidence()` | `L17643–L17699` |
| `VERDICT_LABEL` | `L17700–L17705` |
| `arrivalEvidenceHTML()` | `L17706–L17748` |
| `openArrivalEvidence()` | `L17749–L17760` |
| `confirmAction()` / `cancelConfirm()` / `runConfirm()` | `L17767–L17812` |
| `guardAction()` / `window.__skipGuards` | `L17814–L17842` |
| `installActionGates()` — `resolveDispute` gate | `L17853–L17886` |
| `seedArrivalTraces()` + immediate invocation | `L18092–L18101` |
| `whoHolds` / `claimItem` / `releaseItem` | `L18865–L18905` |
| `ownerChip()` / `confirmTakeover()` / `ownershipWarning()` | `L18928–L18960` |
| `caseChip()` / `openCaseView()` | `L18997–L19028` |
| `workChip()` / `refreshOwnershipSurfaces()` (disputes re-render) | `L19030`, `L19048–L19056` |
| `QUEUE_LABEL` / `QUEUE_ROUTE` (dispute, lostfound) | `L19104–L19109` |
| `inboxItems()` dispute branch | `L19133–L19137` |
| `inboxItems()` lostfound branch | `L19195–L19200` |
| Boot `__skipGuards` window | `L21833–L21845` |
