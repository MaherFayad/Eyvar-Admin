# Module: Support Center — Tickets & Ticket Detail

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page ids:** `support` (`<div class="page" id="p-support">`) · `ticket-detail` (`<div class="page" id="p-ticket-detail">`)
> **HTML lines:** support **L1350–L1378**; ticket-detail **L1380–L1383**
> **Sibling docs:** `13b-disputes-and-lost-found.md` (same page, lower cards), `13c-contact-drivers.md`, `13d-interventions.md`

---

## 1. Purpose

The Support Center is the ticket queue for "internal team assistance for drivers & riders" (`L1352`). It hosts four independent cards on one page: **Tickets** (`L1360–L1362`), **Support team** (`L1364–L1366`), **Disputes** (`L1368–L1371`) and **Lost & Found** (`L1372–L1375`). Disputes and Lost & Found are documented separately in `13b`.

The ticket layer is not a plain status list — every ticket is stamped with a **reason code** from a 40-entry taxonomy (`DB.reasonCodes`, `L14667–L14722`), which derives its category, priority and its **SLA clocks** (first response / resolution / recurring update) from `DB.slaPolicy` (`L14650–L14660`). The queue is sorted by SLA urgency, not by date (`L2341`).

`ticket-detail` is a full page (not a modal) showing the conversation thread, the Call Center Guide script for the coded scenario, an SLA strip, and the status actions.

---

## 2. Entry points & routing

| Route in | Mechanism | Line |
|---|---|---|
| Sidebar → "Support Center" | `onclick="go('support',this)"`, section label `sec.support` | `L532–L533` |
| Toolbar "✋ N mine" chip | `onclick="go('support',null)"` | `L567` |
| Notification of type `ticket` | `else if(n.type==='ticket')go('support',null)` | `L2273` |
| Work-inbox routing table | `QUEUE_ROUTE={ticket:'support',dispute:'support',…,lostfound:'support',…}` | `L19107–L19109` |
| Work-inbox row action (ticket) | `action:"openTicketDetail('"+t.id+"')"` | `L19130` |
| SLA-breach ops notification | `pushOpsNotification('ticket','⚠ SLA breach — '+t.id, …, openTicketDetail(t.id))` | `L14944–L14946` |
| Interventions / dashboard alert row | `onclick="openTicketDetail('…')"` (SLA breach + at-risk rows) | `L9465`, `L9468` |
| Contacts page "Live SLA exposure" rows | `onclick="openTicketDetail('…')"` | `L15048` |
| Ticket created from a result modal | `closeModal();openTicketDetail(newId)` | `L8699` |
| Back-navigation restore | `else if(prev.type==='ticket')openTicketDetail(prev.id,true)` | `L7019` |

**Render dispatch on `go('support')`** (two separate `if` blocks in the same router):
- `L8789` → `renderSupportTeam()`
- `L8806` → `renderTkFilterSelect(); renderTickets(); renderDisputes(); renderLostFound();`

**Toolbar strings:** `titles.support='Support Center'` (`L2168`), `subs.support='Internal team assistance for drivers & riders'` (`L2169`); `titles['ticket-detail']='Ticket Detail'` (`L2168`, no `subs` entry — the sub-title is overwritten with the ticket subject at `L8887`).

**`openTicketDetail(id,isBack)`** (`L8879–L8890`): finds the ticket in `DB.tickets`; returns silently if not found; `pushHistory()` unless `isBack`; sets `navCurrent={type:'ticket',id}`; removes `.on` from every `.page`, adds it to `p-ticket-detail`; sets `tb-title='Ticket '+t.id` and `tb-sub=t.subject`; `updateBackBtn()`; `buildTicketDetailBody(t)`.

**Boot:** `slaBoot()` (registered at `L21811`, defined `L21221`-region → actual body `L15220–L15225`) runs `backfillReasonCodes()`, then `renderTickets()` if `#ticket-list` exists, then `updateContactsBadge()`. Requires `DB.reasonCodes`, `DB.slaPolicy`, `DB.contacts` or the step is skipped and reported (`L21830–L21841`).

**Live refresh:** `tickEngine()` calls `slaSweep()` every 15 ticks (`L12512`), which re-renders `renderTickets()` only when `#p-support` has class `on` (`L14954`).

---

## 3. Layout map

```
p-support  (L1351)
├── .ph  header (L1352)
│    ├── h1 "🎧 Support Center" / p "Internal team assistance for drivers & riders"
│    └── button "+ New ticket"  → newTicket()
├── .g4  KPI row (L1353–L1358)
│    ├── #tk-open   "Open tickets"       (red)    markup default 2
│    ├── #tk-prog   "In progress"        (amber)  markup default 1
│    ├── #tk-res    "Resolved (Jun)"     (green)  static 38     ← HARDCODED
│    └── (no id)    "Avg response time"           static "14 min" ← HARDCODED
├── .g3 (L1359)
│    ├── card span-2  "Tickets"   (L1360–L1363)
│    │     ├── #tk-filter-wrap   (custom select, injected)
│    │     ├── #tk-bulkbar       (bulk action bar, injected)
│    │     └── #ticket-list      max-height 560px, scroll
│    └── card         "Support team" (L1364–L1367)
│          ├── #support-team-count
│          └── #support-team-list  max-height 400px, scroll
├── card "⚖️ Disputes — evidence-first resolution" (L1368–L1371)  → doc 13b
└── card "🎒 Lost & Found"                          (L1372–L1375)  → doc 13b

p-ticket-detail (L1380–L1383)
├── .ph  #tkd-title (h1) / #tkd-meta (p) / "← Back" → goBack()
└── #tkd-body   ← buildTicketDetailBody(t)  (L6249–L6280)
      ├── card "🎧 What to say — and what must be done"  #script-panel   (L6260–L6261)
      ├── .g3
      │   ├── card span-2 "Conversation" + priority badge
      │   │     ├── thread bubbles
      │   │     └── composer (#tkd-reply + Send)  OR  closed-lock strip
      │   └── column
      │         ├── kvCard "Ticket info"
      │         └── card: action buttons
```

---

## 4. Data model & fields

### 4.1 `DB.tickets` — array, seeded at `L2763–L2772`

| Field | Type | Set at | Meaning |
|---|---|---|---|
| `id` | string `TKT-###` | seed `L2764`; new = `'TKT-'+(505+DB.tickets.length)` `L2432`, `L2554` | Ticket key. Length-based, not guaranteed collision-free. |
| `entity` | entity id (`RDR-…`/`DRV-…`) or `'—'` | `L2764`, `L2433` | The rider/driver the ticket is filed for. |
| `entityName` | string | `L2764`, `L2433` | From `resolveId(eid).data.name`, else the raw ID, else `'Unknown'` (`L2431`). |
| `subject` | string | `L2764`, `L2433` (`'No subject'` fallback) | Free text, rendered as raw HTML. |
| `category` | string | seed literal; derived = `rcCategory(gvRC())` (`L2433`) | Mirrors the reason code's `cat`; re-derived on re-code (`L14914`, `L16195`). |
| `priority` | `'High'`/`'Medium'`/`'Low'` (+`'Critical'` on creation only) | seed literal; `rcPriority(gvRC())` (`L2433`) | `rcPriority` maps T1→Critical, T2→High, T3→Medium, T4→Low (`L14745–L14748`); coerced Critical→High on re-code (`L14915`, `L16196`). |
| `status` | see §5 | `L2764`; new = `'Open'` (`L2433`) | |
| `created` | display string (`'25 Jun · 08:10'`, `'Just now'`) | `L2764`, `L2433` | Not machine-readable; the numeric clock is `openedAtMs`. |
| `agent` | string name or `'—'` | seed `L2764`; new = `'Sarah Al-Rashid'` **hardcoded** (`L2433`, `L2554`) | Shown as "Assigned agent". |
| `thread` | array of message objects | `L2765`, `L2433` | See 4.2. |
| `reasonCode` | code from `DB.reasonCodes` | `slaStampNewTicket` (`L14841`); backfill (`L15195`) | Drives category, priority, SLA and the script. |
| `openedAtMs` | epoch ms | `L14842`; backfill synthetic (`L15196`) | SLA t0. |
| `firstResponseAtMs` | ms \| null | `L14843`; `slaMarkResponse` (`L14858`) | First **human** agent reply; bot replies deliberately excluded (`L14853–L14856`). |
| `lastUpdateAtMs` | ms \| null | `L14844`, `L14859` | Anchor for the recurring `upd` clock. |
| `resolvedAtMs` | ms \| null | `L14845`; `slaMarkStatus` (`L14874`) | Stops the resolution clock. |
| `pausedMs` | number | `L14846`, `L14871` | Accumulated paused duration. |
| `pausedSinceMs` | ms \| null | `L14846`, `L14869` | Currently-paused-since marker. |
| `slaBreaches` | `['first_response'\|'update'\|'resolution']` | `L14847`; appended by `slaSweep` (`L14943`) | De-dupes breach alerts; cleared on re-code (`L14916`) and reopen (`L14885`). |
| `reopenCount` | number | `L14847`, `L14883` | |
| `assignee` | string name | `bulkAssignMe` only (`L16177`) | **Distinct from `agent`, never rendered** — see §18. |
| `massEvent` | `EVT-###` | `commitMassEvent` (`L16125`) | Mass-event membership. |
| `groupedUnder` | ticket id | `commitMassEvent` (`L16126`) | Non-master tickets; excluded from the work inbox (`L19123`). |

### 4.2 Thread message object

| Field | Type | Meaning | Line |
|---|---|---|---|
| `from` | string | Display name; initials drive the avatar (`L6255`). | `L2765` |
| `role` | `'rider'` \| `'driver'` \| `'agent'` | `'agent'` renders right-aligned in blue (`L6253`). | `L2765` |
| `time` | display string (`'08:10'`, `'Now'`, `'Just now'`) | Not machine-readable. | `L2765`, `L2362` |
| `msg` | string | Body — injected as **raw HTML** (`L6258`). | `L2765` |
| `bot` | boolean (optional) | `true` ⇒ grey 🤖 avatar + "🤖 Auto-reply" badge (`L6254`, `L6256`). | `L2394` |

New agent reply object: `{from:'Sarah Al-Rashid',role:'agent',time:'Now',msg:<input>}` (`L2362`) — the agent name is hardcoded, not `meUser()`.

### 4.3 `DB.slaPolicy` (`L14650–L14660`)

```
tiers.T1 = {label:'Critical', firstResponseMin:0,   resolveMin:240,  hours:'24/7',     pauseOnCustomer:false}
tiers.T2 = {label:'High',     firstResponseMin:15,  resolveMin:1440, hours:'24/7',     pauseOnCustomer:true}
tiers.T3 = {label:'Medium',   firstResponseMin:60,  resolveMin:2880, hours:'24/7',     pauseOnCustomer:true}
tiers.T4 = {label:'Low',      firstResponseMin:240, resolveMin:4320, hours:'business', pauseOnCustomer:true}
atRiskPct           = 75
breachEscalateTo    = 'ops_supervisor'
uncodedCeilingPct   = 3
```
Editable in Settings via `renderSlaPolicyForm()` / `saveSlaPolicy()` (`L15130–L15155`), gated on `manage_settings`. `hours` is display-only (`L15136`); `breachEscalateTo` is never read. See §18.

### 4.4 Reason-code record (`DB.reasonCodes[i]`, `L14667–L14722`)

| Field | Type | Meaning |
|---|---|---|
| `code` | string | Primary key, e.g. `CAP_LATE`. |
| `ref` | `'1.1'`-style \| `null` | Call Center Guide section; also the `SCRIPT_LIBRARY` key (`L19413`). |
| `cat` | string | Category copied onto `ticket.category`. |
| `target` | `'rider'`/`'driver'`/`'corp'` | Never read by any renderer — see §18. |
| `tier` | `T1`–`T4` | Default SLA tier and source of `priority`. |
| `fr` | minutes \| null | First-response override; `null` inherits the tier (`L14732`). |
| `res` | minutes \| null | Resolution override. |
| `upd` | minutes \| null | Recurring "next update" promise clock. |
| `comp` | SAR | Per-scenario compensation ceiling, read by `rcCompCap()` (`L14742`). |
| `owner` | team string \| null | Root-cause owner shown in the CPT table (see `13c`). |
| `labelEn` / `labelAr` | string | Bilingual picker labels (`L14758`). |
| `active` | boolean | Inactive codes filtered out of the picker (`L14756`). |

### 4.5 Auxiliary stores

| Store | Shape | Line |
|---|---|---|
| `DB.scriptProgress` | `{ticketId: [checkedStepIndices]}` | `L19410` |
| `DB.massEvents` | `{id,title,reasonCode,windowMin,openedAtMs,ticketIds[],riderIds[],message,status,masterTicket}` | `L16081`, `L16117–L16122` |
| `DB.ownership` | `{'ticket:TKT-503': claimRecord}` | `L18851` |
| `DB.contacts` | contact-log spine (see `13c`) | `L14724` |

---

## 5. Statuses, priorities & SLA rules

### 5.1 Ticket status machine

| State | Entered when | SLA effect | Exits to | Actions |
|---|---|---|---|---|
| **Open** | Creation (`L2433`, `L2554`); `reopenTicket()` (`L2411`) | Clocks run; `resolvedAtMs` cleared (`L14877`) | In progress / Waiting on customer / Resolved / Closed | Reply, Mark resolved, In progress, Close conversation, Call |
| **In progress** | `setTicketStatus(id,'In progress')` from the detail button (`L6273`) or bulk bar (`L16158`) | Clocks continue | any | same as Open |
| **Waiting on customer** | **Only** a filter value (`L12787`) — no button sets it. See §18. | If the tier's `pauseOnCustomer` is true → `pausedSinceMs=now` (`L14868–L14869`); resolution clock pauses, first-response clock never does (`L14776`) | any | — |
| **Resolved** | Detail "✓ Mark resolved" (`L6272`); bulk "Resolve" (`L16159`) | `resolvedAtMs=now`; `firstResponseAtMs` back-filled to now if null (`L14874–L14875`); `completeItem('ticket',id)` releases the claim and closes the case (`L14865`) | Open (reopen) | Reply still allowed (composer only locks on Closed) |
| **Closed** | `closeConversation()` (`L2401`) | Same as Resolved + CSAT email + audit entry | Open (reopen) | Reopen only — composer replaced by "🔒 This conversation is closed. Reopen" (`L6262`) |

All transitions run through `slaMarkStatus(t,status)` (`L14863–L14879`):
1. `touchClaim('ticket',id)` keeps the ownership claim alive.
2. Resolved/Closed → `completeItem('ticket',id)`.
3. Pause bookkeeping on enter/exit of `Waiting on customer`.
4. Resolve bookkeeping; **any non-terminal status sets `resolvedAtMs=null`** — i.e. it un-resolves.

`slaMarkReopen(t)` (`L14881–L14885`): `reopenCount++`, `resolvedAtMs=null`, `slaBreaches=[]`. It does **not** clear `pausedSinceMs`.

### 5.2 Priority

`rcPriority(code)` (`L14745–L14748`): `T1→'Critical'`, `T2→'High'`, `T3→'Medium'`, `T4→'Low'`; unknown code defaults to `T3`.
Badge colour (`L2343`, `L6250`): `High→b-red`, `Medium→b-amber`, everything else **including `Critical`** → `b-grey`.
Re-coding coerces `Critical`→`High` (`L14915`, `L16196`), so `Critical` survives only on freshly created T1 tickets.

### 5.3 SLA computation — `slaState(obj)` (`L14766–L14790`)

```
tg          = rcTargets(reasonCode)                     // L14727-L14740
paused      = pausedMs + (pausedSinceMs ? now-pausedSinceMs : 0)
elapsedFr   = (firstResponseAtMs || now) - openedAtMs
elapsedRes  = (resolvedAtMs      || now) - openedAtMs - paused
frMs        = tg.fr*60000        resMs = tg.res*60000
updDue      = tg.upd && !resolvedAtMs
              ? tg.upd*60000 - (now - (lastUpdateAtMs||openedAtMs)) : null

frLeftMs    = frMs  - elapsedFr
resLeftMs   = resMs - elapsedRes
frBreached  = !firstResponseAtMs && frMs>0 && elapsedFr>frMs
frMissed    =  firstResponseAtMs && frMs>0 && (firstResponseAtMs-openedAtMs)>frMs
resBreached = !resolvedAtMs && elapsedRes>resMs
updBreached = updDue!==null && updDue<0
resPct      = resMs ? elapsedRes/resMs*100 : 0
closed      = !!resolvedAtMs      paused = !!pausedSinceMs
```
Returns `null` when `openedAtMs` is missing (all badges then render empty).
Note `frMs>0`: a **T1 code with `fr:0` can never breach first response** (`L14782`). See §18.

`rcTargets(code)` (`L14727–L14740`): `fr`/`res` fall back to the tier default when the code's value is `null`; `upd` is `null` unless the code sets it; `pause` comes from the tier.

### 5.4 Queue ordering — `slaUrgency(obj)` (`L14804–L14810`)

| Condition | Sort key |
|---|---|
| no SLA state | `9e9` (last) |
| closed | `8e9` |
| any breach (fr/upd/res) | `-1e9 + resLeftMs` (first) |
| otherwise | `resLeftMs` (closest to breach first) |

Applied at `L2341`.

### 5.5 SLA badge cascade — `slaBadge(obj)` (`L14791–L14803`)

Top-down, first match wins:

| # | Condition | Badge |
|---|---|---|
| 0 | no state | `''` |
| 1 | `closed` | `closed` (+ ` · FR missed` when `frMissed`) — grey |
| 2 | `paused` | `⏸ paused — waiting on customer` — ghost |
| 3 | `frBreached` | `⚠ No first response — <age> over` — red bold |
| 4 | `updBreached` | `⚠ Update overdue by <age>` — red bold |
| 5 | `resBreached` | `⚠ SLA breached — <age> over` — red bold |
| 6 | `resPct >= 75` | `⏱ <age> to breach` — amber |
| 7 | `!firstResponseAtMs && frLeftMs<1e12` | `↩ respond within <age>` — blue |
| 8 | else | `<age> left` — ghost |

### 5.6 Breach sweep — `slaSweep()` (`L14937–L14956`)

Runs every 15 engine ticks (`L12512`). For each ticket that is not closed and not paused, fires **once per breach kind** (guarded by `slaBreaches`):

| Kind | Condition | Notification text | Audit action |
|---|---|---|---|
| `first_response` | `s.frBreached` | `No first response within <frTargetMin> min` | `sla_breach` |
| `update` | `s.updBreached` | `Promised update every <updTargetMin> min is overdue` | `sla_breach` |
| `resolution` | `s.resBreached` | `Not resolved within <round(resTargetMin/60)>h` | `sla_breach` |

Notification title `⚠ SLA breach — <ticketId>`; desc appends `· <rcLabel> · on-call: <onCallName('primary') or 'unassigned'>`; click opens the ticket (`L14944–L14946`). Then `updateContactsBadge()` and conditional re-render of `#p-support` / `#p-contacts` (`L14953–L14955`).

---

## 6. Categories / reason codes — full enumeration

`DB.reasonCodes` holds **40 entries** (`L14667–L14722`). `fr`/`res`/`upd` in minutes (`null`/`—` = inherit tier), `comp` in SAR.

### Captain (guide §1)
| Code | ref | tier | fr | res | upd | comp | owner | Label (EN) |
|---|---|---|---|---|---|---|---|---|
| `CAP_CANCEL_ADV` | 1.1 | T2 | 10 | 240 | — | 25 | Supply | Captain cancelled in advance |
| `CAP_LATE` | 1.2 | T3 | 15 | 240 | **15** | 15 | Ops | Captain late for pickup |
| `CAP_NOSHOW` | 1.3 | T2 | 10 | 240 | — | 50 | Supply | Captain no-show |
| `CAP_OFFPLATFORM_PAY` | 1.4 | T2 | 15 | 1440 | — | 0 | Compliance | Captain requested cash / off-platform |
| `CAP_CONDUCT` | 1.5 | T1 | 0 | 1440 | — | 50 | Supply | Captain behaved inappropriately |

### Booking (guide §2)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `BKG_CANCEL_REQ` | 2.1 | T4 | null | 1440 | — | 0 | *(none)* | Rider wants to cancel booking |
| `BKG_WRONG_SLOT` | 2.2 | T4 | null | 1440 | — | 0 | Product | Rider booked wrong date or time |
| `BKG_NO_SUPPLY` | 2.3 | T3 | 60 | 1440 | — | 20 | Supply | No captain available in the area |
| `BKG_CAPTAIN_PREF` | 2.4 | T4 | null | 1440 | — | 0 | Product | Rider requests a specific captain |

### Payment (guide §3)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `PAY_INCORRECT_CHARGE` | 3.1 | T2 | 15 | 1440 | — | 0 | Payments | Rider charged incorrectly |
| `PAY_DECLINED` | 3.2 | T3 | 60 | 2880 | — | 0 | Payments | Payment failed or declined |
| `PAY_REFUND_REQ` | 3.3 | T2 | 15 | 1440 | — | 0 | Ops | Rider requests a refund |

### Trip (guide §4)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `TRP_ROUTE_DEVIATION` | 4.1 | T3 | 60 | 2880 | — | 0 | Supply | Captain took the wrong route |
| `TRP_LOST_ITEM` | 4.2 | T3 | 15 | 2880 | **30** | 0 | Ops | Rider left belongings in the vehicle |
| `TRP_GHOST_COMPLETE` | 4.3 | T1 | 0 | 240 | — | 0 | Supply | Trip completed but rider never boarded |

### Technical (guide §5)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `APP_LOGIN` | 5.1 | T3 | 60 | 2880 | — | 0 | Engineering | Rider cannot log into the app |
| `APP_CRASH` | 5.2 | T3 | 60 | 2880 | — | 0 | Engineering | App crashes or is not working |
| `TECH_STATE_DESYNC` | — | T2 | 15 | 240 | — | 20 | Engineering | Ride state desync — apps disagree |
| `APP_PROMO` | 5.3 | T4 | null | 4320 | — | 0 | Marketing | Promo code or discount not applied |

### Safety (guide §6)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `SAF_RIDER_UNSAFE` | 6.1 | T1 | 0 | 60 | — | 100 | Safety | Rider feels unsafe during the trip |
| `SAF_ACCIDENT` | 6.2 | T1 | 0 | 60 | — | 100 | Safety | Accident or vehicle breakdown *(target: driver)* |
| `SAF_THEFT` | 6.3 | T2 | 15 | 1440 | — | 0 | Compliance | Lost or stolen item during the trip |

### Feedback (guide §7)
| Code | ref | tier | fr | res | upd | comp | owner | Label |
|---|---|---|---|---|---|---|---|---|
| `FBK_COMPLAINT` | 7.1 | T3 | 60 | 2880 | — | 25 | Ops | Rider wants to leave a complaint |
| `FBK_ACCOUNT_DELETE` | 7.2 | T3 | 60 | 2880 | — | 0 | Product | Rider wants to delete their account |
| `FBK_INVOICE` | 7.3 | T4 | null | 1440 | — | 0 | Product | Rider requests an invoice or receipt |

### Subscription (not in the guide)
| Code | tier | fr | res | comp | owner | Label |
|---|---|---|---|---|---|---|
| `SUB_SAME_CAPTAIN_BROKEN` | T2 | 15 | 1440 | 25 | Supply | Assigned captain changed mid-plan |
| `SUB_POSTPONE` | T4 | null | 1440 | 0 | *(none)* | Trip postponement request |
| `SUB_FREEZE` | T4 | null | 1440 | 0 | Product | Plan freeze / pause request |
| `SUB_RENEWAL` | T4 | null | 1440 | 0 | *(none)* | Renewal or upgrade query |

### Driver / captain-side
| Code | tier | fr | res | comp | owner | Label |
|---|---|---|---|---|---|---|
| `DRV_RIDER_NOSHOW` | T3 | 60 | 1440 | 0 | Ops | Driver reports rider no-show |
| `DRV_RIDER_CONDUCT` | T2 | 15 | 1440 | 0 | Safety | Driver reports rider behaviour |
| `DRV_VEHICLE_DAMAGE` | T3 | 60 | 2880 | 0 | Ops | Vehicle damage or cleaning claim |
| `DRV_PAYOUT_ISSUE` | T2 | 15 | 1440 | 0 | Payments | Payout missing or incorrect |
| `DRV_RATING_DISPUTE` | T3 | 60 | 2880 | 0 | Ops | Captain disputes an unfair rating |
| `DRV_DEDUCTION_DISPUTE` | T2 | 15 | 1440 | 0 | Ops | Driver disputes a deduction |
| `DRV_SUSPENSION_APPEAL` | T2 | 15 | 1440 | 0 | Compliance | Driver appeals a suspension |
| `DRV_DOC_HELP` | T3 | 60 | 2880 | 0 | Compliance | Document upload or expiry help |

### Corporate & catch-all
| Code | tier | fr | res | comp | owner | Label |
|---|---|---|---|---|---|---|
| `CORP_BILLING` | T3 | 60 | 2880 | 0 | Finance | Corporate invoice or billing query |
| `CORP_EMPLOYEE_MGMT` | T4 | null | 2880 | 0 | *(none)* | Corporate employee add or remove |
| `OTHER_UNCODED` | T3 | 60 | 2880 | 0 | Ops | Uncoded — needs taxonomy review |

**Categories (`cat`), full list — 11 values:** Captain, Booking, Payment, Trip, Technical, Safety, Feedback, Subscription, Driver, Corporate, Other. `rcCategory()` returns `'Other'` for an unknown code (`L14744`).

**Runtime additions:** `addReasonCode()` (`L15117–L15129`) appends `{code,ref:null,cat:'Other',target:'rider',tier:'T3',fr:null,res:null,upd:null,comp:0,owner:null,labelEn,labelAr:'',active:true}` — gated on `manage_settings`; code is upper-cased with non-`[A-Z0-9_]` replaced by `_`; duplicates rejected; both code and label required.

---

## 7. Automation logic

### 7.1 Auto-reply — `AUTO_REPLY_RULES` (`L2378–L2385`) + `runAutoReply(ticketId)` (`L2387–L2396`)

**Trigger conditions (all must hold):**
1. `runAutoReply(newId)` is called explicitly — only from `createTicket()` (`L2436`) and `createTicketFor()` (`L2557`). It never fires for seeded tickets.
2. Ticket exists and `t.thread` is non-empty (`L2389`).
3. `t.thread[0].role !== 'agent'` (`L2391`) — the opener must be from the customer.

**Matching:** lower-cases `thread[0].msg`, then `AUTO_REPLY_RULES.find(r => r.kw.some(k => text.indexOf(k)>=0))` — **first rule in array order with any keyword as a substring** (`L2393`).

**Appended message:** `{from:'Eyvar Assistant', role:'agent', bot:true, time:'Just now', msg:<reply>}` (`L2395`). It does **not** call `slaMarkResponse` — a bot ack is explicitly not a first response (`L14853–L14856`).

| # | Keywords (substring, lower-cased) | Reply template |
|---|---|---|
| 1 | `refund`, `charged`, `overcharged`, `double charge` | "Thanks for reaching out. I can see this is a payment concern — our billing team is reviewing your recent transaction now and will confirm any refund within 24 hours." |
| 2 | `late`, `delay`, `not moving`, `waiting` | "Sorry for the wait. We've flagged this trip for priority review and are checking your driver's live status right now." |
| 3 | `rude`, `behavior`, `unsafe`, `complaint` | "We take this seriously. Your report has been logged against the driver's record and a member of our safety team will follow up shortly." |
| 4 | `cancel`, `cancelled`, `cancellation` | "I can help with that. I've noted the cancellation request — an agent will confirm any applicable refund or penalty waiver shortly." |
| 5 | `payout`, `earnings`, `wallet`, `withdraw` | "Thanks for flagging this. Your payout record is being checked against our finance ledger now — we'll update you as soon as it's confirmed." |
| 6 | `account`, `flagged`, `suspended`, `blocked` | "I understand how urgent this is. Your account status is being reviewed now and we'll get back to you with a resolution shortly." |
| — | **no match (fallback)** | "Thanks for contacting Eyvar support. Your message has been received and a support agent will be with you shortly." |

### 7.2 CSAT on close — `closeConversation(id)` (`L2398–L2408`)

1. `status='Closed'`; `slaMarkStatus(t,'Closed')`.
2. Appends a bot thread message: *"This conversation has been closed. A satisfaction survey has been sent to `<entityName>` — thanks for reaching out!"*
3. `sendSystemEmail(t.entity, 'How did we do? — '+t.id, <body>, 'csat')` (`L2404`; function `L3578–L3584`). Body:
   `Hi <entityName>,\n\nYour support ticket "<subject>" (<id>) has been marked resolved and closed.\n\nWe'd love to know how it went — please rate your experience from 1 to 5 stars.\n\nThanks for reaching out,\nEyvar Support`
   Lands in `DB.emailOutbox` as `MAIL-####` and re-renders the Settings email log.
4. `logAction('ticket_closed','ticket',id,'Ticket <id> closed and CSAT survey requested from <entityName>',{},{status:'Closed'})`.
5. `openTicketDetail(id); renderTickets();` + toast `✅ Conversation closed — CSAT survey sent to <entityName>`.

### 7.3 Reason-code backfill — `backfillReasonCodes()` (`L15188–L15218`)

Runs at boot for any ticket without a `reasonCode`:
- `reasonCode = guessReasonCode(subject + ' ' + thread[0].msg)` (`L15195`) using **20 regex rules** in `RC_KEYWORD_MAP` (`L15161–L15182`), first match wins, else `OTHER_UNCODED`:

| # | Regex | → code |
|---|---|---|
| 1 | `/no.?show|didn.?t (show|arrive)/i` | `CAP_NOSHOW` |
| 2 | `/late|delay|not moving/i` | `CAP_LATE` |
| 3 | `/cash|off.?platform|outside the app/i` | `CAP_OFFPLATFORM_PAY` |
| 4 | `/rude|behav|aggress|conduct|unsafe/i` | `CAP_CONDUCT` |
| 5 | `/cancel(led)? after arrival|cancelled/i` | `CAP_CANCEL_ADV` |
| 6 | `/refund/i` | `PAY_REFUND_REQ` |
| 7 | `/overcharg|charged|double charge|wrong fare/i` | `PAY_INCORRECT_CHARGE` |
| 8 | `/payout|earnings|withdraw/i` | `DRV_PAYOUT_ISSUE` |
| 9 | `/deduction/i` | `DRV_DEDUCTION_DISPUTE` |
| 10 | `/promo|discount code/i` | `APP_PROMO` |
| 11 | `/login|log in|password|access.*account/i` | `APP_LOGIN` |
| 12 | `/crash|app.*(not working|freez)/i` | `APP_CRASH` |
| 13 | `/lost|left (my|a)? ?(bag|phone|wallet|item)/i` | `TRP_LOST_ITEM` |
| 14 | `/stolen|theft/i` | `SAF_THEFT` |
| 15 | `/route|deviat|longer way/i` | `TRP_ROUTE_DEVIATION` |
| 16 | `/invoice|receipt/i` | `FBK_INVOICE` |
| 17 | `/delete.*account|close.*account/i` | `FBK_ACCOUNT_DELETE` |
| 18 | `/accident|breakdown/i` | `SAF_ACCIDENT` |
| 19 | `/suspend|blocked|flagged/i` | `DRV_SUSPENSION_APPEAL` |
| 20 | `/complain/i` | `FBK_COMPLAINT` |

- **Synthetic ages** `var ages=[190,26,1500,55,8]` minutes, applied by index modulo (`L15191`, `L15196`) — the code comment states these exist so the seeded queue demonstrates in-SLA, at-risk and breached simultaneously. **Demo device.**
- `firstResponseAtMs = openedAtMs + 12 min` when a non-bot agent message exists, else `null` (`L15198–L15199`).
- `resolvedAtMs = openedAtMs + 40 min` when status is Resolved/Closed (`L15200`).
- `category` re-derived; one `phone_in` inbound contact logged per ticket (`L15202–L15204`).
- Also backfills `DB.complaints` (age 360 min, `L15206–L15213`) and `DB.refunds` reason codes (`L15214–L15217`).

### 7.4 Mass-event grouping — `commitMassEvent()` (`L16107–L16136`)

Gated on `requirePerm('manage_tickets')`. Selects `massEventAffected(win,'tickets')` = open tickets with `openedAtMs >= now - win*60000` (`L16083–L16086`), then filters to those matching the chosen reason code. Effects:
- Creates `EVT-###` in `DB.massEvents` with `status:'Open'`.
- Ticket `[0]` becomes the master and keeps its clock; `[1..]` get `groupedUnder=master.id` and **`pausedSinceMs = pausedSinceMs || now`** — their SLA clocks stop (`L16124–L16127`).
- Broadcast: for each unique rider id in `DB.riders`, and only if a message was typed, `sendSystemEmail(rid,title,msg,'broadcast')` (`L16130–L16132`).
- `logAction('mass_event_declared','ticket',ev.id, …)`, then `renderTickets(); renderContactsExtra();` + toast.

### 7.5 Guide script & required-actions checklist — `scriptPanelHTML(t)` (`L19412–L19438`)

Keyed on `rcById(t.reasonCode).ref` into `SCRIPT_LIBRARY` (`L19336–L19405`) — **25 scripts**: §1.1–1.5, 2.1–2.4, 3.1–3.3, 4.1–4.3, 5.1–5.3, 6.1–6.3, 7.1–7.3. Each has `s` (script text), `a` (required-action array), `e` (escalation rule).

If the code has no `ref` or no matching script: *"No guide script for **&lt;label&gt;** — this scenario is not in the Call Center Guide. If it recurs, it belongs in the guide rather than being improvised each time."* (`L19414–L19417`).

Rendered: guide-section caption `Call Center Guide §<ref> · <labelEn>`, italic script box, **Copy script** button, a checkbox list of required actions (struck-through when ticked), the escalation line, and `✓ All required actions recorded` when all steps are ticked (`L19436`).

`toggleScriptStep(ticketId,i)` (`L19439–L19445`): toggles the index in `DB.scriptProgress[ticketId]`, calls `touchClaim('ticket',id)`, writes `logAction('script_step', <reasonCode used as entity type>, ticketId, 'Completed|Un-ticked required action N on <id>')`, and re-renders `#script-panel` only.

`copyScript(ref)` (`L19446–L19450`): `navigator.clipboard.writeText(sc.s)` when available, then toast `📋 Script §<ref> copied` — the toast fires even when the clipboard API is missing.

---

## 8. KPIs

| Name | Element | Source | Formula | Thresholds |
|---|---|---|---|---|
| Open tickets | `#tk-open` (`L1354`) | `DB.tickets` | `filter(t=>t.status==='Open').length` (`L2342`) | always red (`var(--red)`), static style |
| In progress | `#tk-prog` (`L1355`) | `DB.tickets` | `filter(t=>t.status==='In progress').length` (`L2343`) | always amber |
| Resolved (Jun) | `#tk-res` (`L1356`) | **none** | literal `38`, never written by JS | **HARDCODED** |
| Avg response time | *(no id)* (`L1357`) | **none** | literal `14 min` | **HARDCODED** |
| Support team count | `#support-team-count` (`L1365`) | `DB.teamUsers` | `DB.teamUsers.length + ' members'` (`L10317`) | — |
| Sidebar open count | `#sb-ticket-badge` (`L533`) | `DB.tickets` | `filter(t=>!t.resolvedAtMs).length` (`L14962–L14964`) | class `a` when > 0 else `n` |

All four KPI tiles are `class="kpi click"` → `kpiScrollTo('ticket-list')` (`L14535–L14543`): smooth-scrolls the list into view and flashes it with `kpi-flash-target` for 1500 ms.

---

## 9. Data displayed

### 9.1 Ticket queue row — `renderTickets()` (`L2330–L2357`)

| Element | Source | Type | Notes |
|---|---|---|---|
| Row checkbox `.tksel[data-tk]` | ticket id | input | `onclick="stopEv(event);renderBulkBar()"` (`L2347`) |
| Ownership / case chip | `workChip('ticket',t.id)` (`L19030`) | HTML | `caseChip` + `ownerChip`, see §14 |
| Subject | `t.subject` | raw HTML | |
| Ticket id badge | `t.id` | grey badge | |
| SLA badge | `slaBadge(t)` | HTML | §5.5 |
| "grouped under X" | `t.groupedUnder` | blue badge | only when set (`L2350`) |
| "EVT-### master" | `t.massEvent && !t.groupedUnder` | purple badge | `L2351` |
| Sub-line | `t.entityName + ' · ' + t.category + ' · ' + t.created` | string | `L2352` |
| Priority badge | `t.priority` | red/amber/grey | `L2353` |
| Status badge | `statusBadge(t.status)` (`L3730–L3736`) | badge | regex-driven, §14 |

Row click → `openTicketDetail(t.id)` (`L2346`).
`renderTickets()` also calls `updateContactsBadge()` at its top (`L2331`) and `renderBulkBar()` at its end (`L2356`).

### 9.2 Ticket detail — `buildTicketDetailBody(t)` (`L6249–L6280`)

| Element | Source | Notes |
|---|---|---|
| `#tkd-title` | `t.subject` | `L6259` |
| `#tkd-meta` | `t.id + ' · ' + t.category + ' · Filed by ' + rowLink(t.entity,t.entityName) + ' · ' + t.created + slaDetailStrip(t)` | `L6260` |
| SLA detail strip | `slaDetailStrip(t)` (`L14818–L14837`) | blue badge `§ref labelEn`, grey badge `T2 · High`, live clock chips, `· root-cause owner: <owner>`, **Change reason code** button, and for `FBK_ACCOUNT_DELETE` a **🗑 Start PDPL erasure** button → `openErasureRequest(t.entity)` |
| Clock chips | `slaClockChip(label,leftMs,targetMin)` (`L14811–L14817`) | `First response` (only while unanswered) / `Resolution` / `Next update` (only when `upd` set). Red when over, amber when < 25 % of the target remains, muted otherwise. Once closed the chips are replaced by `resolved in <age>` in green |
| Thread bubbles | `t.thread` | agent = right-aligned blue; bot = grey 🤖 avatar + "🤖 Auto-reply" badge; avatar initials = first letters of the first two words of `from` (`L6255`) |
| kvCard "Ticket info" | `statusBadge(t.status)`, priority badge, `t.category`, `t.agent`, `rowLink(t.entity,t.entityName)` | `L6271` |
| Script panel | `scriptPanelHTML(t)` if the function exists | `L6260–L6261` |
| Composer | `#tkd-reply` + **Send**, or the closed-lock strip | `L6262–L6266` |

---

## 10. Input fields

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| `tk-filter` (hidden input inside `#csel-tk-filter`) | custom select, size `sm` | *(no label — sits in the card header)* | `all` | `all`, `mine`, `unclaimed`, `breaching`, `atrisk`, `Open`, `In progress`, `Waiting on customer`, `Resolved` | `onChange → renderTickets()` (`L12775–L12791`). Injected once, guarded by `if(w && !document.getElementById('csel-tk-filter'))` |
| `.tksel` (per row, `data-tk`) | checkbox 15×15 | — | unchecked | — | `tkSelected()` (`L16140`) → `renderBulkBar()` |
| `tkd-reply` | text input, 36 px | placeholder "Type a reply…" | empty | `sendTicketReply` returns early when `!inp.value.trim()` (`L2361`) | Appends to `t.thread`; marks first response |
| `nt-id` | text | "Entity ID (rider/driver)" | empty | placeholder `RDR-xxxx or DRV-xxxx`; **no validation** — trimmed + upper-cased; unresolved IDs become `entityName='Unknown'` and `entity='—'` | `createTicket()` |
| `nt-reason` (hidden input inside `csel-nt-reason`) | custom select, searchable | "Reason code *" (red asterisk) | empty → `gvRC()` returns `OTHER_UNCODED` | 40 active codes; label `§ref  labelEn  —  labelAr  ·  cat`; search placeholder **"Search 38 reason codes…"** (`L14762`) | category, priority, SLA targets, script |
| `nt-sub` | text | "Subject / description" | empty (or `Issue with trip <TRP>` from `openSupportTicket`, `L2547`) | falls back to `'No subject'` | `subject` + the first thread message |
| `#csel-chg-reason` → `nt-reason` | custom select | *(no label)* | current `t.reasonCode` | 40 codes | `commitChangeReason()` |
| `#csel-bulk-reason` → `nt-reason` | custom select | *(no label)* | empty | 40 codes | `commitBulkReason()` |
| `me-code` | custom select | "What happened" | `APP_CRASH` | active codes, label `§ref labelEn` | mass-event grouping |
| `me-win` | custom select | "Window" | `60` | `30` / `60` / `180` / `1440` → Last 30 minutes / hour / 3 hours / 24 hours | `massEventAffected()` |
| `me-title` | text | "Title" | empty → `rcLabel(code)` | placeholder "e.g. Payment gateway timeout" | `ev.title`, email subject |
| `me-msg` | textarea rows 3 | "Message to affected riders" | empty | if empty, **no broadcast e-mail is sent** (`L16131`) | `ev.message`, email body |
| `call-note-ta` | textarea, min-height 44 px | placeholder "Note (optional)…" | empty | — | `logPriorityCall()` audit note |

**Reason-picker hidden-field collision:** `reasonSelectHTML(cselId,selected,onChangeExpr)` (`L14755–L14764`) always emits the hidden field id **`nt-reason`** regardless of the wrapper id, and `gvRC()` (`L14750–L14754`) reads that one id. Only one reason picker may exist in the DOM at a time. See §18.

---

## 11. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **+ New ticket** (`L1352`) | `newTicket()` `L2418–L2429` | Opens the New-ticket modal | — | none | none | no |
| **Create ticket** (modal) | `createTicket()` `L2430–L2439` | `DB.tickets.unshift({…})`; `slaStampNewTicket(newId,gvRC(),'phone_in')`; `runAutoReply(newId)`; `closeModal()`; `renderTickets()`; toast `✅ Ticket <id> created · <rcLabel>` | `DB.tickets`, `DB.contacts` | **none** | **none** (only the contact row) | no |
| **Create ticket** (from `openSupportTicket`) | `createTicketFor(entityId,entityName)` `L2552–L2559` | Same, but `role:'rider'` is hardcoded on the opener and `renderTickets()` is not called | `DB.tickets`, `DB.contacts` | none | none | no |
| Row click | `openTicketDetail(id)` | Navigates to `p-ticket-detail` | `navCurrent`, history | none | none | no |
| **Send** (reply) | `sendTicketReply(id)` `L2358–L2367` | Pushes `{from:'Sarah Al-Rashid',role:'agent',time:'Now',msg}`; `slaMarkResponse(t)` sets `firstResponseAtMs`/`lastUpdateAtMs` and logs an **outbound `in_app` contact**; clears the input; re-opens detail; toast `Reply sent` | `t.thread`, SLA fields, `DB.contacts` | none | none | no |
| **✓ Mark resolved** | `setTicketStatus(id,'Resolved')` `L2368–L2376` | status → Resolved; `slaMarkStatus`; re-render detail + queue; toast `Ticket <id> marked Resolved` (`ok`) | `t.status`, SLA fields, `DB.ownership` | none | **none** | **yes** — `GATE_SPECS.setTicketStatus` L18292 (the builder returns a spec only for `Resolved`/`Closed`) |
| **In progress** | `setTicketStatus(id,'In progress')` | status → In progress; **clears `resolvedAtMs`** (`L14877`); toast (`info`) | same | none | none | no |
| **🔒 Close conversation** | `closeConversation(id)` `L2398–L2408` | §7.2 — Closed + bot message + CSAT email + audit + toast | `t.status`, `t.thread`, `DB.emailOutbox`, `DB.auditLog` | none | `ticket_closed` | no |
| **Reopen** (closed banner) | `reopenTicket(id)` `L2409–L2417` | status → Open; `slaMarkReopen`; audit; toast `Ticket <id> reopened` | `t.status`, SLA fields, `DB.auditLog` | none | `ticket_reopened` | no |
| **📞 Call &lt;entityName&gt;** | `priorityCall(t.entityName)` `L9149–L9161` | Opens the Priority-call modal (§13.4) — **no telephony**, pure UI | — | none | only on Log | no |
| **✓ Log** (call modal) | `logPriorityCall(name,ctx,entityId)` `L9162–L9166` | `logAction('priority_call','contact',entityId\|\|name,'Called <name> (<ctx>) — <note>')`; closes modal; toast `✅ Call logged — <name>` | `DB.auditLog` | none | `priority_call` | no |
| **Change reason code** (SLA strip) | `openChangeReason(id)` `L14886–L14898` → `commitChangeReason(id)` `L14899–L14911` | Re-derives `category` and `priority` (Critical→High); clears `slaBreaches`; **keeps `openedAtMs`**; before/after audit; `buildTicketDetailBody` + `renderTickets`; toast | `t.reasonCode/.category/.priority/.slaBreaches`, `DB.auditLog` | none | `ticket_reason_changed` | modal only |
| **🗑 Start PDPL erasure** (only when `reasonCode==='FBK_ACCOUNT_DELETE'`) | `openErasureRequest(t.entity)` `L15978–L15995` | Cross-module: logs `ERA-####` with a 30-day statutory clock (`ERASURE_SLA_DAYS=30`, `L15962`); duplicate pending requests rejected | `DB.erasureRequests`, `DB.contacts`, `DB.auditLog` | `manage_settings` on execute/reject, not on log | `erasure_requested` | no |
| **Copy script** | `copyScript(ref)` `L19446–L19450` | Clipboard write + toast | clipboard | none | none | no |
| Required-action checkbox | `toggleScriptStep(id,i)` `L19439–L19445` | Toggles `DB.scriptProgress`; `touchClaim`; audit; re-renders `#script-panel` | `DB.scriptProgress`, `DB.auditLog` | none | `script_step` | no |
| **✋ Claim** / **↩** / **take over** | `claimItem` `L18877` / `releaseItem` `L18898` / `confirmTakeover` `L18941` | Ownership claim, release, or a **confirmed** takeover; claims auto-expire after `DB.ownershipConfig.staleMin = 30` idle minutes (`L18853`, `L18865–L18875`) | `DB.ownership`, `DB.auditLog` | none | `claim_taken` / `claim_taken_over` / `claim_released` / `claim_expired` | takeover only |
| **🔗 CASE-####** chip | `openCaseView(caseId)` `L19003` | Modal listing every linked record and its holder | — | none | none | no |
| Team member row | `showTeamMemberProfile(u.id)` `L10324–L10337` | Modal with avatar, role, status badge, email, last login, permission chips, "🕵 Activity (n)" | — | none | none | no |

### 11.1 Bulk actions — `renderBulkBar()` (`L16146–L16163`)

Renders only when ≥ 1 checkbox is ticked; shows `<n> selected` plus the note *"Bulk actions are audit-logged individually, not as one entry."*

| Button | Handler | Effect | Permission | Audit |
|---|---|---|---|---|
| **Assign to me** | `bulkAssignMe()` `L16173–L16183` | Sets `t.assignee = <current user name>` on each selected ticket | `manage_tickets` | `ticket_assigned` per ticket |
| **Mark in progress** | `bulkStatus('In progress')` `L16166–L16172` | `setTicketStatus` per id | `manage_tickets` | `bulk_ticket_status` (one entry) |
| **Resolve** | `bulkStatus('Resolved')` | same | `manage_tickets` | `bulk_ticket_status` |
| **Change reason code** | `bulkReason()` `L16184–L16193` → `commitBulkReason()` `L16194–L16206` | Re-codes every selected ticket; clears breaches; per-ticket audit | **none** — see §18 | `ticket_reason_changed` per ticket |
| **Clear** | `tkSelectAll(false)` `L16144` | Unchecks all | none | none |

---

## 12. Tables & lists

### 12.1 Ticket list (`#ticket-list`) — a flex-row list, not a `<table>`

| Column (left → right) | Content |
|---|---|
| 1 | selection checkbox |
| 2 | `workChip` (case chip + owner chip / Claim button) |
| 3 | subject · id badge · SLA badge · [grouped-under badge] · [mass-event master badge]; below: `entityName · category · created` |
| 4 | priority badge |
| 5 | status badge |

- **Source:** `DB.tickets` (`L2335`).
- **Filter** (`#tk-filter`, 9 options, 7 distinct behaviours):
  - `all` → everything
  - `mine` → `heldByMe('ticket',t.id)` (`L2336`)
  - `unclaimed` → `!whoHolds('ticket',t.id) && status!=='Resolved' && status!=='Closed'` (`L2337`)
  - `breaching` → state exists, not closed, and fr/res/upd breached (`L2338`)
  - `atrisk` → not closed, not fr/res breached, `resPct >= DB.slaPolicy.atRiskPct` (75) (`L2339`)
  - `Open` / `In progress` / `Waiting on customer` / `Resolved` → `t.status === f` (`L2340`)
- **Sort:** `slaUrgency` ascending (§5.4). No secondary sort. **No search box.**
- **Row click:** `openTicketDetail`.
- **Empty state:** *"No tickets match this filter."* (`L2355`).

### 12.2 Support team list (`#support-team-list`) — `renderSupportTeam()` (`L10313–L10323`)

- **Source:** `DB.teamUsers` (`L2830–L2841`) — **the whole team**, not filtered to Support roles.
- Row: 32 px avatar, `u.name` (blue), `u.role + ' · ' + u.status`, `▸` chevron; whole row `cursor:pointer` with `title="Open profile"`.
- Row click → `showTeamMemberProfile(u.id)`.
- Header count: `DB.teamUsers.length + ' members'`.
- **No empty state** (renders `''` when the array is empty).
- Seeded members: USR-1 Sarah Al-Rashid (Owner, Active), USR-2 Fahad Al-Dosari (Finance, Active), USR-3 Lina Al-Otaibi (Support, Active), USR-4 Noura Al-Fahad (Support, **Invited**), USR-5 Yousef Al-Balawi (Ops Manager, Active).

### 12.3 Ticket detail thread

Chronological bubble list. No pagination, no scroll cap, no empty state (a ticket always has ≥ 1 opener).

---

## 13. Modals opened

### 13.1 New support ticket — `newTicket()` (`L2418–L2429`)
| Element | Type | Detail |
|---|---|---|
| Title | — | "New support ticket" |
| `nt-id` | text | Label "Entity ID (rider/driver)", placeholder `RDR-xxxx or DRV-xxxx` |
| `csel-nt-reason` → `nt-reason` | searchable select | Label "Reason code *"; helper: *"Category, priority and the SLA clock are all derived from this — pick the scenario, not the severity."* |
| `nt-sub` | text | Label "Subject / description", placeholder "Brief description" |
| Footer | buttons | **Cancel** → `closeModal()` · **Create ticket** → `createTicket()` |

### 13.2 Open support ticket (from a trip/entity) — `openSupportTicket(tripId,entityId,entityName)` (`L2542–L2551`)
| Element | Detail |
|---|---|
| Title | `Open support ticket — <entityName>` |
| `csel-nt-reason2` → `nt-reason` | select, "Reason code *" |
| `nt-sub` | text, pre-filled `Issue with trip <tripId>` when a trip id is passed |
| Footer | **Cancel** · **Create ticket** → `createTicketFor(entityId,entityName)` |

### 13.3 Change reason code — `openChangeReason(id)` (`L14886–L14898`)
| Element | Detail |
|---|---|
| Title | `Change reason code — <ticketId>` |
| Copy | *"Changing the code re-derives the SLA targets from the new scenario. The clock keeps running from the original contact time — it is not reset, because the customer has been waiting since then either way."* |
| `csel-chg-reason` → `nt-reason` | select, pre-selected to the current code |
| Footer | **Cancel** · **Apply** → `commitChangeReason(id)` (silently closes if unchanged, `L14903`) |

### 13.4 Priority call — `priorityCall(name,context,entityId)` (`L9149–L9161`)
| Element | Detail |
|---|---|
| Title | "📞 Priority call" |
| Body | Phone glyph, `name`, `<context or 'manual'> · <entityId>`, and a green pulsing pill `Calling — <HH:MM local>` |
| `call-note-ta` | textarea, "Note (optional)…" |
| Footer | **✕ End** → `closeModal()` (nothing logged) · **✓ Log** → `logPriorityCall(name,ctx,entityId)` |

### 13.5 Declare a mass event — `openMassEvent()` (`L16089–L16106`)
| Element | Detail |
|---|---|
| Title | "Declare a mass event" |
| Copy | *"One cause, many contacts. Declaring the event groups every open ticket in the window under a single incident so the queue stops showing the same problem hundreds of times — and so the post-mortem has one record to point at."* |
| `me-code` | select "What happened", default `APP_CRASH`, placeholder "Pick the scenario" |
| `me-win` | select "Window", default `60` |
| `me-title` | text "Title" |
| `me-msg` | textarea rows 3 "Message to affected riders" |
| Footer | **Cancel** · **Declare & group** → `commitMassEvent()` (`manage_tickets`) |

### 13.6 Bulk change reason code — `bulkReason()` (`L16184–L16193`)
| Element | Detail |
|---|---|
| Title | `Change reason code — <n> tickets` |
| Copy | *"Re-coding in bulk is how a mis-triaged batch gets corrected. SLA targets re-derive; the clocks keep running from each original contact time."* |
| `csel-bulk-reason` → `nt-reason` | select, no default |
| Footer | **Cancel** · **Apply to &lt;n&gt;** → `commitBulkReason()` |

### 13.7 Team member — `showTeamMemberProfile(id)` (`L10324–L10337`)
| Element | Detail |
|---|---|
| Title | "Team member" |
| Body | 58 px avatar, name, `role · statusBadge(status)`, `email · Last login: <lastLogin>`, "Permissions (n)" chip list via `PERMISSION_LABELS` |
| Footer | **🕵 Activity (n)** → `showActorHistory(u.id)` where n = `DB.auditLog.filter(e=>e.actorId===id).length` · **Close** |

### 13.8 Takeover confirmation — `confirmTakeover(type,id)` (`L18941–L18952`)
Generic `confirmAction` gate. Summary `<owner> has held <id> for <age>.` Consequences: *"You become the owner; they lose it without being asked." / "The takeover is logged with both names — this is deliberate, so duplicated work has a trail." / "If they are mid-call with the customer, message them first."* Confirm label **Take over**.

### 13.9 Low-rating ticket (cross-module entry) — `openLowRatingTicket(tripId)` (`L15304–L15325`)
Opened from a trip profile's ratings card. Fields: read-only context block (rider rated captain N★; route · date · km · fare), `csel-lr-reason` → `nt-reason` pre-selected **`CAP_CONDUCT`**, `nt-sub` pre-filled `Low rating (N★) on <tripId>`. Footer **Cancel** · **Create ticket** → `createTicketFor(t.driver, driverName)`.

### 13.10 Desync ticket (cross-module) — `openDesyncTicket(tripId)` (`L16437–L16455`)
Fields: server-vs-rider-state block, `csel-ds-reason` → `nt-reason` pre-selected **`TECH_STATE_DESYNC`**, `nt-sub` pre-filled `Ride state desync on <tripId> — rider stuck on <riderState>`. Footer **Cancel** · **Create ticket** → `createTicketFor(t.rider, riderName)`.

---

## 14. States & badges

### 14.1 `statusBadge(s)` — regex-driven (`L3730–L3736`)
| Test (case-insensitive) | Class |
|---|---|
| `/done\|resolved\|closed/` | `b-green` |
| `/trip\|active/` | `b-blue` |
| `/late\|expir\|pend/` | `b-amber` |
| `/cancel\|risk\|refund/` | `b-red` |
| else | `b-grey` |

Effect on ticket statuses: **Resolved / Closed → green**; **Open, In progress, Waiting on customer → grey** (none match a regex). Team statuses: `Active` → blue (matches `/active/`), `Invited` → grey.

### 14.2 Priority badge
`High → b-red`, `Medium → b-amber`, `Low` and `Critical` → `b-grey` (`L2343`, `L6250`).

### 14.3 SLA badges
§5.5 (8 states); `slaClockChip` colours at `L14811–L14817`.

### 14.4 Ownership chips — `ownerChip(type,id)` (`L18928–L18939`)
| Condition | Rendering |
|---|---|
| unclaimed | `✋ Claim` button, title "Pick this up so nobody duplicates your work" |
| held by me | green badge `✋ yours · <age>` + `↩` release button |
| held by another | amber badge `✋ <ownerName>` (title "Held since <age> ago") + `take over` button |

`caseChip(type,id)` (`L18997–L19002`) renders a purple `🔗 CASE-#### · +n` badge **only when the case has more than one child**.

### 14.5 Group badges
- `grouped under <id>` — blue, when `t.groupedUnder` is set (`L2350`).
- `<EVT-###> master` — purple, when `t.massEvent` is set and `t.groupedUnder` is not (`L2351`).

### 14.6 Sidebar badge `#sb-ticket-badge` (`L533`) — `updateContactsBadge()` (`L14958–L14980`)
```
open  = DB.tickets.filter(t => !t.resolvedAtMs)
badge.textContent = open.length
badge.className   = 'sb-badge ' + (open.length ? 'a' : 'n')
```
Written **only when `#sbb-contacts` also exists** — the function returns early at `L14961` if that element is absent.

### 14.7 Toolbar chip `#my-work-chip` (`L567`) — `updateMyWorkChip()` (`L19038–L19044`)
`✋ <n> mine`, where `n = myOpenClaims().length` (claims by the current user touched within the 30-minute stale window, `L18912–L18916`); class `b-green` when > 0 else `b-grey`; click → `go('support',null)`.

---

## 15. Cross-module links

| From here → | Target | Line |
|---|---|---|
| `rowLink(t.entity,t.entityName)` in the meta line and kvCard | 360° profile (`openProfile`) | `L6260`, `L6271` |
| **🗑 Start PDPL erasure** | Settings → PDPL erasure queue | `L14834` |
| **📞 Call &lt;name&gt;** | Priority-call modal (audit only) | `L6276` |
| `workChip` → case chip | Case view modal spanning multiple queues | `L18997` |
| `logContact()` on every stamp / response | Contact drivers page CPT table (`13c`) | `L14848`, `L14860` |
| `slaSweep` breach | Ops notification panel + `#sbb-contacts` badge + Interventions list (`13d`) | `L14944`, `L9450` |
| `completeItem` on Resolve/Close | Work inbox, ownership, case closure | `L14865` |
| `commitMassEvent` | `DB.emailOutbox` (Settings email log) and the Contacts extra card | `L16131`, `L16135` |
| `closeConversation` | `DB.emailOutbox` (`csat` category) | `L2404` |

**Into here from elsewhere:** trip-profile ratings card (`openLowRatingTicket`, `L15318`), ride-state desync card (`openDesyncTicket`, `L16452`), work inbox (`L19130`), interventions (`L9465`, `L9468`), contacts SLA-exposure list (`L15048`), notification panel (`L2273`).

---

## 16. Hardcoded / mock / demo values

| Value | Location | Note |
|---|---|---|
| `#tk-res` = **38** ("Resolved (Jun)") | `L1356` | Never computed; static HTML. |
| "Avg response time" = **14 min** | `L1357` | Never computed; static HTML, no id. |
| `#tk-open` = 2, `#tk-prog` = 1 in markup | `L1354–L1355` | Overwritten by `renderTickets()` on first render. |
| `#dispute-count` = "0 open" in markup | `L1370` | See `13b`. |
| 4 seeded tickets TKT-501…504 | `L2763–L2772` | Fictional names, subjects, threads. |
| Id formula `'TKT-'+(505+DB.tickets.length)` | `L2432`, `L2554` | Demo-grade; not collision-safe. |
| Agent name **`'Sarah Al-Rashid'`** hardcoded on every created ticket and every agent reply | `L2362`, `L2433`, `L2554` | Not `meUser()` / `CURRENT_USER_ID`. |
| Backfill synthetic ages `[190,26,1500,55,8]` minutes | `L15191` | Comment states these exist so the queue shows all three SLA states on load. |
| Backfill offsets: first response = +12 min, resolution = +40 min | `L15198`, `L15200` | |
| Complaint backfill age = 360 min | `L15209` | |
| Reason-picker placeholder **"Search 38 reason codes…"** | `L14762` | The array holds **40** codes. |
| Auto-reply bot identity `'Eyvar Assistant'` | `L2395`, `L2403` | |
| `SCRIPT_LIBRARY` — 25 scripts containing `[X]` / `[3–5]` placeholder tokens | `L19336–L19405` | e.g. "within `[X]` minutes", "SAR `[X]`" — agents fill these by hand. |
| CSAT email body template | `L2404` | Fixed wording, no template store. |
| `SEED_EPOCH = Date.now()` at load | `L14628` | All `agoMs()` ages are relative to page load — demo ages reset on refresh. |
| Toolbar sub-title `'Thursday 25 Jun 2026 · 09:14 AM'` | `L563`, `L2169` | Fixed demo clock. |

---

## 17. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `sec.support` | Sidebar section label (`L532`) | "Support" | `الدعم` (`L7913`) |
| `nav.support` | Sidebar item (`L533`) | "Support Center" | `مركز الدعم` (`L7909`) |
| `nav.contacts` | Sidebar item (`L534`) | "Contact drivers" | `أسباب التواصل` (`L7911`) |
| `stab.reasons` | Settings tab for reason codes + SLA | *(EN source outside this block)* | `أكواد الأسباب واتفاقية الخدمة` (`L7911`) |

**No other string on either page is translated.** The header comment at `L7897–L7902` states explicitly that only the sidebar nav + section labels and basic RTL are translated; page content, tables, forms and dynamically-built strings are English-only by design. Reason-code labels are bilingual in the picker itself (`labelEn` + `labelAr` concatenated, `L14758`), but that is data, not i18n.

---

## 18. Gaps, dead code, UNVERIFIED items

1. **`Waiting on customer` has no setter.** It exists as a filter option (`L12787`) and is the sole trigger for the SLA pause branch (`L14868`), but no button, modal or bulk action ever writes it. The pause path is unreachable through the UI.
2. **T1 first-response SLA can never breach.** `frBreached` requires `frMs>0` (`L14782`), and all five T1 codes set `fr:0`. A "Critical" ticket left unanswered raises no first-response breach — only the resolution breach.
3. **`Critical` priority renders grey.** `rcPriority` can return `'Critical'` (`L14746`) and `createTicket` writes it verbatim (`L2433`), but neither badge map handles it (`L2343`, `L6250`) — the most severe tickets look like the least severe. Re-coding coerces it to `High` (`L14915`), so the value is also inconsistent between the create and edit paths.
4. **Reason-picker hidden-field collision.** `reasonSelectHTML` hard-codes the field id `nt-reason` (`L14763`) and `gvRC()` reads that single id (`L14751`). Two pickers in the DOM simultaneously would read the wrong value; every call site works only because exactly one modal is open at a time.
5. **`DB.slaPolicy.breachEscalateTo = 'ops_supervisor'`** (`L14658`) is written and never read anywhere in the file.
6. **`tiers[].hours`** (`'24/7'` / `'business'`) is only rendered as a label (`L15136`); no business-hours calendar or arithmetic exists, so T4's "business hours" promise is not enforced.
7. **`reasonCode.target`** (`rider`/`driver`/`corp`) is defined on all 40 codes and never read.
8. **`ticket.assignee`** is written by `bulkAssignMe()` (`L16177`) but never displayed; the detail card shows `t.agent` (`L6271`), which bulk-assign does not touch.
9. **Permission asymmetry.** `createTicket`, `createTicketFor`, `sendTicketReply`, `setTicketStatus`, `closeConversation`, `reopenTicket`, `commitChangeReason` and `commitBulkReason` have **no permission gate**, while `bulkStatus`/`bulkAssignMe`/`commitMassEvent` require `manage_tickets` (`L16108`, `L16166`, `L16173`) and `PAGE_PERMISSIONS.support` defines a `manage` grant (`L10642–L10645`) that only Disputes and Lost & Found actually enforce (`L14433`, `L14469`).
10. **Audit gaps.** Ticket creation, replies, and status changes to Resolved/In progress produce no audit entry; only close, reopen, reason change, bulk status, bulk assign, mass event and SLA breaches do.
11. **Placeholder count mismatch:** "Search 38 reason codes…" vs 40 actual codes (`L14762` vs `L14667–L14722`).
12. **`createTicketFor` hardcodes `role:'rider'`** on the opener (`L2554`) even when called for a driver (e.g. `openLowRatingTicket` passes `t.driver`, `L15318`) — the bubble then renders as a rider message.
13. **`createTicketFor` never calls `renderTickets()`** (`L2558`) — the queue does not refresh after a ticket is created from a trip / rating / desync flow.
14. **Thread `msg` and `subject` are injected as raw HTML** (`L6258`, `L2349`) with no escaping — an XSS surface in a real deployment.
15. **`slaMarkReopen` does not clear `pausedSinceMs`** (`L14881–L14885`), so a reopened ticket that was paused stays paused indefinitely.
16. **No search box** on the ticket queue — only the status/SLA filter — and no pagination inside the 560 px scroll container.
17. **UNVERIFIED — persistence.** Every write targets in-memory `DB.*`; no `fetch`, `XMLHttpRequest`, `localStorage` or backend call for tickets was found. "DB path" in this document means the in-page object graph, not a server.
18. **UNVERIFIED — `showActorHistory`** (referenced at `L10336`): its definition was not read for this document.
19. **UNVERIFIED — the full `PERMISSION_LABELS` map** used in the team modal (`L10334`, defined near `L3234`) was not enumerated here.

---

## 19. Line-number index

| Item | Lines |
|---|---|
| Sidebar section + Support Center item + `#sb-ticket-badge` | `L531–L533` |
| `#my-work-chip` toolbar chip | `L567` |
| `p-support` markup | `L1350–L1378` |
| KPI row (`#tk-open`, `#tk-prog`, `#tk-res`, avg response) | `L1353–L1358` |
| Tickets card (`#tk-filter-wrap`, `#tk-bulkbar`, `#ticket-list`) | `L1360–L1363` |
| Support team card (`#support-team-count`, `#support-team-list`) | `L1364–L1367` |
| `p-ticket-detail` markup (`#tkd-title`, `#tkd-meta`, `#tkd-body`) | `L1380–L1383` |
| `titles` / `subs` maps | `L2168–L2169` |
| Notification → support routing | `L2273` |
| `renderTickets()` | `L2330–L2357` |
| `sendTicketReply()` | `L2358–L2367` |
| `setTicketStatus()` | `L2368–L2376` |
| `AUTO_REPLY_RULES` | `L2378–L2385` |
| `runAutoReply()` | `L2387–L2396` |
| `closeConversation()` | `L2398–L2408` |
| `reopenTicket()` | `L2409–L2417` |
| `newTicket()` | `L2418–L2429` |
| `createTicket()` | `L2430–L2439` |
| `openSupportTicket()` | `L2542–L2551` |
| `createTicketFor()` | `L2552–L2559` |
| `DB.tickets` seed | `L2763–L2772` |
| `DB.teamUsers` seed | `L2830–L2841` |
| `requirePerm()` | `L3126` |
| `sendSystemEmail()` | `L3578–L3584` |
| `statusBadge()` | `L3730–L3736` |
| `customSelectHTML()` | `L5336–L5355` |
| `buildTicketDetailBody()` | `L6249–L6280` |
| Back-nav restore for tickets | `L7019` |
| `LANG_STRINGS.ar` nav keys | `L7909–L7913` |
| `go()` router — support / interventions dispatch | `L8788–L8789`, `L8806` |
| `openTicketDetail()` | `L8879–L8890` |
| `priorityCall()` / `logPriorityCall()` | `L9149–L9166` |
| `buildInterventionItems()` SLA block | `L9450–L9472` |
| `pushOpsNotification()` | `L9661` |
| `renderSupportTeam()` | `L10313–L10323` |
| `showTeamMemberProfile()` | `L10324–L10337` |
| `PAGE_PERMISSIONS.support` | `L10642–L10645` |
| `requirePagePerm()` | `L10680–L10691` |
| `tickEngine()` SLA sweep hook | `L12508–L12517` |
| `renderTkFilterSelect()` | `L12775–L12791` |
| `kpiScrollTo()` | `L14535–L14543` |
| `nowMs` / `SEED_EPOCH` / `agoMs` / `fmtAge` | `L14626–L14634` |
| `DB.slaPolicy` | `L14650–L14660` |
| `DB.reasonCodes` (40 entries) | `L14667–L14722` |
| `rcById` … `gvRC` | `L14726–L14754` |
| `reasonSelectHTML()` | `L14755–L14764` |
| `slaState()` | `L14766–L14790` |
| `slaBadge()` | `L14791–L14803` |
| `slaUrgency()` | `L14804–L14810` |
| `slaClockChip()` | `L14811–L14817` |
| `slaDetailStrip()` | `L14818–L14837` |
| `slaStampNewTicket()` | `L14839–L14851` |
| `slaMarkResponse()` | `L14856–L14862` |
| `slaMarkStatus()` | `L14863–L14879` |
| `slaMarkReopen()` | `L14881–L14885` |
| `openChangeReason()` / `commitChangeReason()` | `L14886–L14911` |
| `logContact()` | `L14918–L14936` |
| `slaSweep()` | `L14937–L14956` |
| `updateContactsBadge()` | `L14958–L14980` |
| `renderReasonCodesTable()` / `saveReasonCodes()` / `addReasonCode()` | `L15069–L15129` |
| `renderSlaPolicyForm()` / `saveSlaPolicy()` | `L15130–L15155` |
| `RC_KEYWORD_MAP` / `guessReasonCode()` / `backfillReasonCodes()` | `L15161–L15218` |
| `slaBoot()` | `L15220–L15225` |
| `openLowRatingTicket()` | `L15304–L15325` |
| `ERASURE_SLA_DAYS` / `openErasureRequest()` | `L15962`, `L15978–L15995` |
| `DB.massEvents` / `massEventAffected()` / `openMassEvent()` / `commitMassEvent()` | `L16081–L16136` |
| `tkSelected()` / `tkSelectAll()` / `renderBulkBar()` | `L16140–L16163` |
| `bulkStatus()` / `bulkAssignMe()` / `bulkReason()` / `commitBulkReason()` | `L16166–L16206` |
| `openDesyncTicket()` | `L16437–L16455` |
| `installActionGates()` | `L17853+` |
| `DB.ownership` / `whoHolds` / `heldByMe` / `claimItem` / `touchClaim` / `releaseItem` / `completeItem` / `myOpenClaims` | `L18851–L18917` |
| `ownerChip()` / `confirmTakeover()` / `ownershipWarning()` | `L18928–L18960` |
| `caseChip()` / `openCaseView()` | `L18997–L19028` |
| `workChip()` / `refreshInbox()` / `updateMyWorkChip()` / `refreshOwnershipSurfaces()` | `L19030–L19058` |
| `QUEUE_LABEL` / `QUEUE_ROUTE` | `L19104–L19109` |
| `inboxItems()` ticket branch | `L19122–L19131` |
| `SCRIPT_LIBRARY` (25 scripts) | `L19336–L19405` |
| `DB.scriptProgress` | `L19410` |
| `scriptPanelHTML()` / `toggleScriptStep()` / `copyScript()` | `L19412–L19450` |
| `bootModules()` — `slaBoot` step | `L21807–L21811` |
