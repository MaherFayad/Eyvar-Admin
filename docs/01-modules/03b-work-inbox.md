# Module: Work Inbox

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `inbox` · **Page div:** `#p-inbox`
> **HTML lines:** `L1392`–`L1396` (body container `#inbox-body` at `L1394`)
> **Primary render:** `renderInbox()` `L19239`–`L19293`
> **Attached helpers:** `setInboxTab()` `L19294`, `toggleInboxRole()` `L19295`, `inboxItems()` `L19120`–`L19213`, `inboxFiltered()` `L19214`–`L19229`, `wi()` `L19111`–`L19119`, `dueChip()` `L19230`–`L19238`, `inboxOpen()` `L19301`–`L19310`, `updateInboxBadge()` `L19311`–`L19319`, `inboxBoot()` `L19321`
> **Ownership layer (module A1):** `L18828`–`L19058`
> **Inbox layer (module A2) design contract:** `L19061`–`L19083`

---

## 1. Purpose

A **routing layer over twelve existing queues**, not a replacement for them. The design contract at `L19061`–`L19083` states the three rules explicitly:

1. *"The queues stay"* — the inbox routes an operator into the domain page; it never duplicates the domain actions.
2. *"Sort by DEADLINE, not by age or severity label"* — anything already breached sorts above everything (`L19075`–`L19078`).
3. *"Route by role, but never hide"* — role routing is a **checkbox the operator can switch off**, not an access control (`L19080`–`L19082`).

Page subtitle: `Every task across every queue, in one place` (`subs.inbox` `L2169`). In-page strapline: *"Every queue in one list, sorted by deadline and routed to your role — the queues stay where they are, this routes you into them"* `L1393`.

---

## 2. Entry points & routing

| Trigger | Line | Effect |
|---|---|---|
| Sidebar item `Work inbox` (`onclick="go('inbox',this)"`) with badge `#sbb-inbox` | `L496` | Navigate + set active |
| `go(...)` router branch `if(id==='inbox'){renderInbox();}` | `L8822` | Render on navigation |
| Dashboard button `Open the work inbox →` | `L682` | `go('inbox',null)` |
| Empty-state CTA `Go to the work inbox` (in the "🗝️ My permissions" / My-Account area) | `L2073` | `go('inbox',null)` |
| `refreshInbox()` — re-renders **only if the page is currently `on`** | `L19034`–`L19037` | Also calls `updateInboxBadge()` |
| Tick engine, every 20 ticks (~20 s): `if(__tickCount%20===0 && typeof refreshInbox==='function')refreshInbox()` | `L12494`-region (`tickEngine` `L12489`+) | Live badge + live page refresh |
| `refreshOwnershipSurfaces()` → `refreshInbox()` | `L19049` | Called after every claim / release / takeover / case close |
| `inboxBoot()` registered in `bootModules()` as step `work inbox`, `needs:['ownership','cases']` | `L19321`, `L21820` | Sets the sidebar badge at load; **does not render the page** |

Router metadata: title `Work Inbox` (`titles.inbox` `L2168`), subtitle `Every task across every queue, in one place` (`subs.inbox` `L2169`).

---

## 3. Layout map

Static markup is only a shell (`L1392`–`L1396`); everything below the page header is written into `#inbox-body` by `renderInbox()`.

| Order | Element | Built at | Notes |
|---|---|---|---|
| 1 | Page header `.ph` → `<h1>📥 Work inbox</h1>` + strapline `<p>` | `L1393` | static |
| 2 | `#inbox-body` | `L1394` | render target |
| 3 | KPI row `.g4` — 4 tiles | `L19254`–`L19259` | `head` |
| 4 | Card header `.ch` → `<h2>📥 Work inbox</h2>` + 3 tab buttons + role checkbox | `L19261`–`L19265` | `bar` |
| 5 | Explanatory strip (`Sorted by deadline, not by label …`) | `L19266`–`L19268` | bottom hairline border |
| 6 | Item rows (`.al-row`) or empty state | `L19270`–`L19290` | `rows` |

Final assembly: `el.innerHTML = head + bar + rows + '</div>'` `L19292` — the trailing `</div>` closes the `.card` opened inside `bar`.

The heading `📥 Work inbox` therefore appears **twice** on screen: once in the page header `L1393` and once in the card header `L19261`.

---

## 4. KPIs & metrics

Four `.kpi` tiles, hand-built (they do **not** use `dashKpi()`), `L19254`–`L19259`. Counts are computed from `all = inboxItems()` — **the unfiltered set**, so they ignore both the tab and the role checkbox (`L19242`–`L19245`).

| # | Label | Formula | Units | Sub-line | Colour rule |
|---|---|---|---|---|---|
| 1 | `Overdue right now` | `all.filter(i => i.breached).length`, where `breached = dueMs !== null && dueMs !== undefined && dueMs < 0` (`wi()` `L19115`) | items | `a promise already broken` (literal) | `overdue ? var(--red) : var(--ink)` `L19255` |
| 2 | `Held by you` | `all.filter(i => heldByMe(i.type,i.id)).length` `L19243` | items | `<me.name> · <me.role>` from `meUser()` `L18859` | default ink `L19256` |
| 3 | `Nobody owns` | `all.filter(i => !whoHolds(i.type,i.id)).length` `L19244` | items | `across every queue` (literal) | `unassigned ? var(--amber) : var(--ink)` `L19257` |
| 4 | `Total open work` | `all.length` `L19242` | items | `<Object.keys(QUEUE_LABEL).length> queues in one list` → renders **`12 queues in one list`** `L19258` | default ink |

No progress bars, no thresholds, no trend deltas. **Note:** the module's own header comment says *"Thirteen queues"* (`L19064`) but `QUEUE_LABEL` `L19104`–`L19106` defines **twelve** — the KPI sub-line renders 12. See §15.

`heldByMe(type,id)` `L18876` = `whoHolds(...)` returns a claim whose `ownerId === CURRENT_USER_ID`.
`whoHolds(type,id)` `L18865`–`L18875` returns the claim record only if `state==='claimed'` **and** it is not stale; a claim untouched for more than `DB.ownershipConfig.staleMin` (**30**, `L18853`) minutes is **auto-released as a side effect of reading it**, and `logAction('claim_expired', …)` is written at that moment (`L18869`–`L18872`). Rendering the inbox therefore mutates state and writes audit rows.

---

## 5. Data displayed

| Element | Source | Type | Notes |
|---|---|---|---|
| KPI 1–4 | `inboxItems()` | computed | §4 |
| Role-checkbox label `routed to <role>` | `meUser().role` ← `DB.teamUsers[CURRENT_USER_ID].role` `L18860`–`L18862` | lookup | `Owner` for the seeded session user `USR-1` `L2831`,`L2862` |
| Row severity dot | `i.severity` from `wi(...opts.severity)` | computed | §11 |
| Row title | per-item-type template | computed | §9 |
| Queue label pill | `QUEUE_LABEL[i.type]` `L19104`–`L19106` | lookup | `b b-grey`, 9px |
| Row id | `i.id` (the domain record's own id) | passthrough | 9.5px ghost |
| Row sub-line | per-item-type template | computed | §9 |
| Due chip | `dueChip(i)` `L19230`–`L19238` | computed | §11 |
| Case chip | `caseChip(i.type,i.id)` `L18997`–`L19005` | computed | §11 |
| Owner chip | `ownerChip(i.type,i.id)` `L18928`–`L18941` | computed | §11 |
| Action button | `i.actionLabel || 'Open'` | computed | §7 |
| Sidebar badge `#sbb-inbox` | `updateInboxBadge()` `L19311`–`L19319` | computed | §11 |
| Top-bar chip `#my-work-chip` | `updateMyWorkChip()` `L19038`–`L19044` ← `myOpenClaims()` `L18913` | computed | §11 |

---

## 6. Input fields / filters / tabs

### 6.1 Tabs (`L19247`–`L19252`)

Three `<button class="btn sm">` elements built from the literal array `[['mine','✋ Mine',mine],['unassigned','Unassigned',unassigned],['all','Everything',all.length]]`.

| Value | Label rendered | Count shown | Filter applied | Line |
|---|---|---|---|---|
| `mine` | `✋ Mine · <n>` | `mine` | `items.filter(i => heldByMe(i.type,i.id))` | `L19220` |
| `unassigned` | `Unassigned · <n>` | `unassigned` | `items.filter(i => !whoHolds(i.type,i.id))` | `L19221` |
| `all` | `Everything · <n>` | `all.length` | none (role filter still applies) | — |

- **State variable:** `var _inboxTab = 'mine'` `L19085` — **default is `mine`**, so a fresh session shows an empty inbox until the operator claims something.
- **Handler:** `setInboxTab(t)` `L19294` = `_inboxTab=t; renderInbox();` — no audit, no DB write.
- **Active styling:** inline `background:var(--blue);color:#fff;border-color:var(--blue)` when `_inboxTab===t[0]` `L19250`–`L19251`. There is no `.on` class.
- The counts on the tab labels are computed from the **unfiltered** `all` set (`L19243`–`L19245`), so they do **not** shrink when the role checkbox is on. A tab can therefore read `Everything · 9` while showing 0 rows.

### 6.2 Role-routing checkbox (`L19263`–`L19265`)

| Property | Value |
|---|---|
| Element | `<input type="checkbox" id="inbox-role" style="width:14px;height:14px">` |
| Label | `routed to <me.role>` (e.g. `routed to Owner`) |
| State variable | `var _inboxRoleFilter = true` `L19086` — **default ON** |
| Handler | `onchange="toggleInboxRole()"` → `_inboxRoleFilter = !!(document.getElementById('inbox-role')||{}).checked; renderInbox();` `L19295`–`L19298` |
| Effect | `inboxFiltered()` `L19216`–`L19219`: keeps item `i` when `WORK_ROUTING[i.type]` is undefined **or** contains `me.role` |
| Persistence | none — module-scope variable, resets on reload |
| Audit | none |

### 6.3 `WORK_ROUTING` table (`L19090`–`L19103`)

| Queue key | Roles accountable |
|---|---|
| `ticket` | Support, **Operations**, Owner |
| `dispute` | Support, Finance, Owner |
| `fairness` | **Operations**, Owner |
| `emergency` | **Operations**, Owner |
| `dispatch` | **Operations**, Owner |
| `absence` | **Operations**, Owner |
| `leg` | **Operations**, Owner |
| `risk` | **Operations**, Owner |
| `incident` | **Operations**, Owner, Support |
| `lostfound` | Support, **Operations**, Owner |
| `erasure` | Owner, **Operations** |
| `coverage` | **Operations**, Owner |

**Defect:** the string `'Operations'` is not a real role. `TEAM_ROLES = ['Owner','Ops Manager','Finance','Support']` `L10501` (declared immediately after `commitEditTeamUser`), and the seeded `DB.teamUsers` roles are `Owner`, `Finance`, `Support`, `Support`, `Ops Manager` (`L2831`–`L2840`). Consequences with the role filter ON:
- **Owner** (`USR-1`, the session user) sees **all 12 queues**.
- **Support** sees `ticket`, `dispute`, `incident`, `lostfound` — 4 queues.
- **Finance** sees `dispute` only.
- **Ops Manager** — the role the `'Operations'` entries were clearly meant for — matches **nothing** and sees an empty inbox with the message *"Nothing open in the queues routed to Ops Manager."* `L19290`.

### 6.4 Sorting (`L19222`–`L19228`)

Single sort key, no user control: `a.dueMs ?? 9e12` ascending. Comment at `L19222`–`L19224`: *"Breached first — a broken promise is not a queue position. Undated work sorts last, not first: it has no clock, so it cannot be more urgent than something that has one."* Negative `dueMs` (already overdue) sorts first; `null` maps to `9e12` and sorts last. Ties keep insertion order (`Array.prototype.sort` stability).

There is **no search box, no severity filter, no queue-type filter, no date range and no pagination.**

---

## 7. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? | Line |
|---|---|---|---|---|---|---|---|
| Tab `✋ Mine` / `Unassigned` / `Everything` | `setInboxTab(t)` | Sets `_inboxTab`, re-renders | in-memory var only | none | no | no | `L19250`,`L19294` |
| Checkbox `routed to <role>` | `toggleInboxRole()` | Sets `_inboxRoleFilter`, re-renders | in-memory var only | none | no | no | `L19264`,`L19295` |
| `✋ Claim` (unclaimed items) | `stopEv(event); claimItem(type,id)` | Creates `DB.ownership['type:id']` with `ownerId/ownerName/claimedAtMs/touchedAtMs/state:'claimed'`; toast `✋ You now hold <id>`; `refreshOwnershipSurfaces()` | `DB.ownership` | **none** | `logAction('claim_taken','ownership',key, '<name> picked up <key>')` `L18886` | no | `L18930`–`L18931`, `L18877`–`L18892` |
| `↩` (release — shown only on items you hold) | `stopEv(event); releaseItem(type,id)` | `c.state='released'`, `releasedReason='manual'`, `releasedAtMs`; toast `↩ <id> returned to the queue` (`info`) | `DB.ownership[key]` | **none** | `logAction('claim_released','ownership',key,…)` `L18901` | no | `L18936`,`L18898`–`L18905` |
| `take over` (items held by someone else) | `stopEv(event); confirmTakeover(type,id)` | Opens `confirmAction({...})` dialog; on confirm → `claimItem()`, which appends `{from,to,tsMs}` to `cur.takeovers` | `DB.ownership[key]` | **none** | `logAction('claim_taken_over','ownership',key,'<me> took over <key> from <them> (held <age>)')` `L18882` | **Yes** — title `Take over from <owner>`, 3 consequence bullets, confirm label `Take over` | `L18939`–`L18940`, `L18942`–`L18954` |
| `🔗 CASE-nnnn · +n` (case chip) | `stopEv(event); openCaseView(caseId)` | Opens the case modal | — | none | no | no | `L19003`, `L19006`–`L19031` |
| `<actionLabel>` primary button (per item type — see §9) | `inboxOpen(type,id)` `L19301` | **1)** claims the item silently if unheld (`claimItem(type,id,true)` — audit still written, toast suppressed); **2)** `touchClaim()` refreshes `touchedAtMs`; **3)** `updateMyWorkChip()`; **4)** evaluates `i.action` as JS via `new Function(item.action)`, falling back on exception to `go(QUEUE_ROUTE[type]||'dashboard',null)` | `DB.ownership` | none at this layer; the *destination* enforces its own | `claim_taken` / `claim_taken_over` via `claimItem` | no | `L19284`, `L19301`–`L19310` |

**Notes**
- The whole row carries `cursor:default` (`L19272`) — **rows are not clickable**; only the chips and the primary button are.
- **No inbox action is permission-gated.** `requirePerm()` `L3126` never appears in `L18828`–`L19321`.
- `inboxOpen` executes the item's `action` string through `new Function(...)` `L19308`. All action strings are built internally from `DB` ids (`L19129`, `L19136`, `L19143`, …), so no user text reaches the constructor — but a record id containing a quote would break out of the generated literal. Flagged in §15.
- **`inboxOpen` silently claims on open** even when the operator is only looking. Comment at `L19299`–`L19300` states this is deliberate: *"two people do not start the same case."*
- `completeItem(type,id)` `L18906`–`L18911` and `closeCase()` `L18984`–`L18996` mark claims `done`; **`renderInbox` never filters on `state==='done'`** — an item leaves the inbox only when its *domain* predicate stops matching (e.g. `ticket.resolvedAtMs` set).

---

## 8. Tables & lists

There is one list. Row template `L19270`–`L19285`, class `.al-row`, `gap:11px; padding:10px 14px; align-items:flex-start; cursor:default`.

| Slot | Content | Line |
|---|---|---|
| Severity dot | 7×7 px circle, `background` per §11, `margin-top:6px` | `L19273` |
| Line 1 | `i.title` + queue pill `QUEUE_LABEL[i.type]` (`b b-grey`, 9px) + `i.id` (9.5px ghost) | `L19275`–`L19277` |
| Line 2 | `i.sub` (10.5px ghost) | `L19278` |
| Line 3 | `dueChip(i)` then `caseChip(i.type,i.id)` | `L19279`–`L19280` |
| Right rail | `ownerChip(i.type,i.id)` then, **only when `i.action` is set**, the primary button (`btn p sm`, 10px, `padding:3px 9px`) | `L19282`–`L19284` |

Empty states — three distinct messages `L19287`–`L19290`:

| Tab | Message |
|---|---|
| `mine` | `You are not holding anything. Pick something up from <b>Unassigned</b> — claiming it stops a colleague working the same case.` |
| `unassigned` | `Every open item has an owner.` |
| `all` | `Nothing open in the queues routed to <me.role>.` |

The `all` message names the role even when the role filter is switched **off**, in which case it is misleading (nothing is being routed away).

---

## 9. Item taxonomy (`inboxItems()` `L19120`–`L19213`)

Normalised by `wi(type,id,title,sub,dueMs,opts)` `L19111`–`L19119`, producing:
`{type, id, key: ckey(type,id), title, sub, dueMs, breached: dueMs!=null && dueMs<0, severity: opts.severity||'normal', entity: opts.entity||null, action, actionLabel}`.

`dueMs` is **milliseconds remaining** (negative = overdue), not an absolute timestamp.

| # | `type` | Queue label | Route (`QUEUE_ROUTE`) | Source query | Skip condition | `dueMs` formula | `severity` | `entity` | Action string | Button label | Line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ticket` | `Support` | `support` | `DB.tickets` | `t.resolvedAtMs \|\| t.groupedUnder` | `s.frLeftMs` and `s.resLeftMs` from `slaState(t)` `L14766`: `t.firstResponseAtMs ? s.resLeftMs : Math.min(s.frLeftMs, s.resLeftMs)`; `null` if no `slaState` | `high` if `s.frBreached\|\|s.resBreached`, else `normal` | `t.entity` | `openTicketDetail('<id>')` | `Open ticket` | `L19123`–`L19131` |
| 2 | `dispute` | `Disputes` | `support` | `DB.disputes` `L14391` | `d.status !== 'open'` | **`null`** (no clock) | **`high`** (always) | `d.claimant` | `openArrivalEvidence('<d.trip \|\| d.sub>','<d.id>')` | `Evidence` | `L19132`–`L19137` |
| 3 | `fairness` | `Fairness` | `fairness` | `DB.fairnessCases` (`L15505`, seeded by `seedFairness`) | `c.status !== 'Open'` | `(c.openedAtMs + rcTargets(c.reasonCode).res*60000) - nowMs()` | `normal` | `c.driverId` | `go('fairness',null)` | `Decide` | `L19138`–`L19144` |
| 4 | `emergency` | `Emergency claim` | `commitment` | `DB.emergencyClaims` (`L16565`) | `c.status !== 'Open'` | `c.dueAtMs - nowMs()` | **`high`** | `c.driverId` | `go('commitment',null)` | `Decide` | `L19145`–`L19150` |
| 5 | `dispatch` | `Dispatch` | `commitment` | `DB.emergencyDispatches` (`L17199`) | `d.status === 'Accepted'` | **`-1`** — hardcoded so it always reads as overdue | **`critical`** | `d.riderId` | `go('commitment',null)` | `Open dispatch` | `L19151`–`L19156` |
| 6 | `absence` | `Absence` | `commitment` | `DB.absenceEvents` (`L16564`) | `e.waived \|\| e.decayed \|\| e.emergencyId` | **`null`** | `normal` | `e.driverId` | `go('commitment',null)` | `Review` | `L19157`–`L19162` |
| 7a | `leg` — *Leg uncovered — offer expired/declined* | `Plan leg` | `commitment` | `pendingConfirmations()` `L16575` × `offerState(p.subId)` `L18160` | requires `o.state ∈ {expired, declined}` | **`-1`** | **`critical`** | `p.driver` | `go('commitment',null)` | `Cover it` | `L19166`–`L19169` |
| 7b | `leg` — *Awaiting backup reply* | `Plan leg` | `commitment` | same, `o.state === 'offered'` | — | `DB.commitPolicy.offerWindowMin*60000 - (nowMs() - o.tsMs)` | `normal` | `p.driver` | `go('commitment',null)` | `Chase` | `L19170`–`L19173` |
| 7c | `leg` — *Unconfirmed leg — `<driver>`* | `Plan leg` | `commitment` | same, `!p.confirmed && !p.autoHandedOff` | — | **`null`** | `normal` | `p.driver` | `go('commitment',null)` | `Confirm` | `L19174`–`L19177` |
| 7d | `leg` — *Leg recorded as assumed* | `Plan leg` | `commitment` | same, `p.confirmed && legAck(p.subId).weight === 'weak'` | — | **`null`** | **`high`** | `p.driver` | `go('commitment',null)` | `Chase` | `L19178`–`L19182` |
| 8 | `risk` | `Departure risk` | `commitment` | `departureRisk()` `L16607`: `DB.trips` where `kind==='Subscription'` and `/Late \+\|assigned\|En route/i.test(status)` | none | `r.minsToPickup * 60000`, where `minsToPickup = 20 - ((digits of tripId) % 18)` — **a synthetic value, not a real ETA** (`L16612`) | **`critical`** | `r.driver` | `go('commitment',null)` | `Call` | `L19183`–`L19187` |
| 9 | `incident` | `Safety` | `safety` | `DB.incidents` `L13389` | `i.status !== 'open'` | `-1` if `i.severity==='critical'`, else **`null`** | `critical` if `i.severity==='critical'`, else `high` | `i.reporter` | `go('safety',null)` | `Open` | `L19188`–`L19194` |
| 10 | `lostfound` | `Lost & found` | `support` | `DB.lostFound` `L14448` | `l.status === 'returned'` | **`null`** | `normal` | `l.rider` | `go('support',null)` | `Advance` | `L19195`–`L19200` |
| 11 | `erasure` | `PDPL` | `settings` | `DB.erasureRequests` (`L15961`) | `q.status !== 'Pending'` | `q.dueAtMs - nowMs()` | `normal` | `q.riderId` | `go('settings',null)` | `Decide` | `L19201`–`L19205` |
| 12 | `coverage` | `Coverage` | `commitment` | `backupCoverage()` `L17480` | `!c.uncovered` — i.e. only rows with **no eligible registered backup AND zero eligible drivers nearby** | **`null`** | **`high`** | `c.driver` | `assignBackup('<subId>')` | `Register` | `L19206`–`L19211` |

### Title / sub-line templates

| Type | Title | Sub-line |
|---|---|---|
| `ticket` | `t.subject` | `nm2(t.entity) · rcLabel(t.reasonCode)` |
| `dispute` | `d.claim` | `Claimant <nm2(claimant)> · against <nm2(against)>` |
| `fairness` | `<c.kind> — <nm2(c.driverId)>` | `c.detail` |
| `emergency` | `Emergency claim — <nm2(c.driverId)>` | `<c.kind> · <c.doc>` or `<c.kind> · no evidence attached` |
| `dispatch` | `Stranded rider — <nm2(d.riderId)>` | `<d.status> · <d.subId> · captain absent` |
| `absence` | `Absence — <e.driverName>` | `<e.subId> · <e.forfeited.toFixed(2)> SAR forfeited` |
| `leg` 7a | `Leg uncovered — offer <expired\|declined>` | `<nm2(p.rider)> · <p.plan>` |
| `leg` 7b | `Awaiting backup reply` | `<nm2(o.driverId)> · <p.plan>` |
| `leg` 7c | `Unconfirmed leg — <nm2(p.driver)>` | `<p.plan> · rider <nm2(p.rider)>` |
| `leg` 7d | `Leg recorded as assumed` | `<nm2(p.driver)> never actually confirmed` |
| `risk` | `Not moving — <nm2(r.driver)>` | `<r.route> · pickup in <r.minsToPickup> min` |
| `incident` | `<i.type> — <i.summary>` | `Reporter <nm2(i.reporter)>` |
| `lostfound` | `<l.item> — <nm2(l.rider)>` | `captain <nm2(l.driver)> · <l.status with _ → space>` |
| `erasure` | `PDPL erasure — <q.riderName>` | `statutory deadline` (literal) |
| `coverage` | `No coverage — <c.subId>` | `<c.plan> · rider <nm2(c.rider)> · nobody eligible nearby` |

### Key-collision hazard
Ownership is keyed `ckey(type,id) = type+':'+id` `L18858`. The four `leg` variants all use `p.subId` as the id, so **only one `leg` row per subscription can exist at a time** (the `if/else if` chain guarantees that) — safe. But `type:'leg'` and `type:'coverage'` both key on a **subscription id**, meaning `leg:SUB-1041` and `coverage:SUB-1041` are separate claims for what may be the same underlying problem, with no case link between them by default.

---

## 10. Modals opened

| Trigger | Modal | Title | Body | Buttons | Commit fn | Line |
|---|---|---|---|---|---|---|
| `take over` chip | Confirmation dialog (`confirmAction`) | `Take over from <ownerName>` | Summary `<owner> has held <id> for <age>.`; three consequence bullets: *"You become the owner; they lose it without being asked."*, *"The takeover is logged with both names — this is deliberate, so duplicated work has a trail."*, *"If they are mid-call with the customer, message them first."* | Confirm label `Take over` (+ implicit cancel) | `onConfirm: claimItem(type,id)` | `L18942`–`L18954` |
| `🔗 CASE-nnnn` chip | Case view | `🔗 <caseId> — <label>` | Paragraph *"One event, N records across N queues…"*; one row per child: `<type>` pill + child id + `held by <owner>` (`b b-amber`) or `unclaimed`; footer text differs when closed | `Close`; `Close the whole case` (`btn p sm`, **hidden if `c.closedAtMs`**) → `closeModal(); closeCase(id,'closed from case view')` | `closeCase()` `L18984` — sets `closedAtMs`, marks every child claim `done`, `logAction('case_closed','ownership',caseId,'Case closed (<label>) — N linked record(s) cleared from their queues')`, `refreshOwnershipSurfaces()` | `L19006`–`L19031` |

The **primary row buttons do not open modals** — they navigate (`go(...)`) or open a domain page/detail view (`openTicketDetail`, `openArrivalEvidence`, `assignBackup`).

---

## 11. States & badges

| Badge / state | Condition | Visual | Line |
|---|---|---|---|
| Severity dot | `severity==='critical'` → `var(--red)`; `'high'` → `var(--amber)`; anything else (`'normal'`) → `var(--border2)` | 7 px circle | `L19271` |
| Due chip — *no clock* | `i.dueMs === null` | `no clock`, 10px, `var(--ghost)` | `L19231`–`L19232` |
| Due chip — *overdue* | `i.dueMs < 0` | `⚠ overdue <fmtAge(-dueMs)>`, 10px, `var(--red)`, weight 700 | `L19233`–`L19234` |
| Due chip — *soon* | `0 <= dueMs < 30*60000` (30 min) | `<fmtAge(dueMs)> left`, `var(--amber-dk)`, weight 600 | `L19235`–`L19237` |
| Due chip — *normal* | `dueMs >= 30 min` | `<fmtAge(dueMs)> left`, `var(--muted)`, weight 400 | `L19235`–`L19237` |
| Owner chip — *unclaimed* | `whoHolds()` returns `null` | `✋ Claim` button, `title="Pick this up so nobody duplicates your work"` | `L18930`–`L18931` |
| Owner chip — *yours* | `c.ownerId === CURRENT_USER_ID` | `b b-green` pill `✋ yours · <fmtAge(now - claimedAtMs)>` + `↩` button (`title="Return it to the queue"`) | `L18932`–`L18936` |
| Owner chip — *someone else* | otherwise | `b b-amber` pill `✋ <ownerName>` (`title="Held since <age> ago"`) + `take over` button (`title="Take over — recorded and visible to them"`) | `L18937`–`L18940` |
| Case chip | `caseFor(type,id)` returns a case with `children.length > 1` | `b b-purple` `🔗 <CASE-id> · +<others>`, `title="Part of one incident with N other record(s)"`; **not rendered at all when the case has no siblings** | `L18997`–`L19005` |
| Claim auto-expiry | `nowMs() - c.touchedAtMs > 30 min` (`DB.ownershipConfig.staleMin` `L18853`) | Claim silently flips to `state:'released'`, `releasedReason:'stale'`, item reappears as unclaimed | `L18867`–`L18873` |
| **Sidebar `#sbb-inbox`** | `n = count(breached) || count(unclaimed)` — JS `\|\|`, so the unclaimed count is used **only when the breached count is 0**. Class = `sb-badge a` if **any** item is breached, else `sb-badge n` | amber (`a`) vs neutral (`n`) pill; static default `0` with class `a` in markup `L496` | `L19311`–`L19319` (badge formula `L19315`–`L19316`) |
| Top-bar `#my-work-chip` | `myOpenClaims().length` — claims with `state==='claimed'`, `ownerId===CURRENT_USER_ID`, and `now - touchedAtMs <= 30 min` | `✋ <n> mine`, class `b b-green` when `n>0` else `b b-grey`; **`onclick="go('support',null)"` — it navigates to Support Center, not to the inbox** `L567` | `L18913`–`L18918`, `L19038`–`L19044` |
| Ownership warning (used by other pages' gates) | `whoHolds()` returns a claim owned by someone else | `⚠ <owner> is holding this item (picked up <age> ago). Acting now is how a customer ends up with two answers.` | `L18956`–`L18962` |

`fmtAge(ms)` `L14630`–`L14636`: `<60m` → `Nm`; `<1440m` → `Nh Mm`; else `Nd Hh`. Clamped at 0, so a negative input passed without negation would render `0m`.

---

## 12. Cross-module links

**`go(...)` destinations produced by inbox items** (`QUEUE_ROUTE` `L19107`–`L19109` and inline `action` strings): `support` (ticket, dispute, lostfound), `fairness`, `commitment` (emergency, dispatch, absence, leg, risk, coverage), `safety` (incident), `settings` (erasure), with `dashboard` as the exception fallback in `inboxOpen` `L19308`–`L19309`.

**Direct function calls into other modules:** `openTicketDetail(id)` `L8879` (Support Center), `openArrivalEvidence(tripId,dspId)` `L17749` (Disputes evidence), `assignBackup(subId)` `L13186` (Coverage).

**Data read from other modules:** `DB.tickets` `L2763`, `DB.disputes` `L14391`, `DB.fairnessCases` `L15505`, `DB.emergencyClaims` `L16565`, `DB.emergencyDispatches` `L17199`, `DB.absenceEvents` `L16564`, `DB.planConfirmations` `L16563`, `DB.backupOffers` `L18124`, `DB.legAcks` `L18123`, `DB.trips` `L2670`, `DB.incidents` `L13389`, `DB.lostFound` `L14448`, `DB.erasureRequests` `L15961`, `DB.backupRegistry` `L17198`, `DB.subscriptions` `L2685`, `DB.commitPolicy` `L16541`, `DB.slaPolicy` `L14650`, `DB.reasonCodes` `L14668`, `DB.teamUsers` `L2830`.

**Surfaces the inbox feeds:** sidebar badge `#sbb-inbox` `L496`; top-bar chip `#my-work-chip` `L567`. `refreshOwnershipSurfaces()` `L19045`–`L19058` also fans out to `renderTickets`/`renderDisputes` (Support), `renderCommitmentPage`, `renderFairnessPage` — **and to a non-existent `renderInterventions` for dashboard/interventions** (see 03a §15).

**Inbound:** dashboard "Open the work inbox →" `L682`; the permissions/onboarding CTA at `L2073`.

**The inbox does not consume `buildInterventionItems()`** (`L9450`) — the dashboard's intervention feed and the inbox are two independent builders reading overlapping data. A "no drivers" ride request appears on the dashboard but has **no** inbox item type; a lost-and-found item appears in the inbox but never on the dashboard.

---

## 13. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| Static page strapline | `L1393` | literal |
| `DB.ownershipConfig = {staleMin:30, warnTakeover:true}` | `L18853` | `warnTakeover` is **never read** anywhere in the file |
| `DB.ownership = {}` / `DB.cases = {}` seeded empty | `L18851`–`L18852` | **The inbox has no seeded claims or cases at all** — on a fresh load `mine` = 0, the default tab is `mine`, so the page opens empty with the "You are not holding anything" message |
| `_inboxTab = 'mine'` | `L19085` | default |
| `_inboxRoleFilter = true` | `L19086` | default |
| `WORK_ROUTING` role `'Operations'` | `L19091`–`L19102` | matches no real role — see §6.3 |
| Comment claims *"Thirteen queues"* | `L19064` | `QUEUE_LABEL` has 12 |
| `dueMs = -1` sentinel for `dispatch`, `leg`-uncovered, critical `incident` | `L19154`,`L19168`,`L19191` | Not a real deadline — forces "overdue 0m" |
| `departureRisk()` synthetic ETA `20 - (tripIdDigits % 18)` | `L16612` | Deterministic pseudo-value, **not** a computed ETA; drives item type 8's due chip |
| `backfillReasonCodes()` synthetic ticket ages `[190,26,1500,55,8]` minutes | `L15191` | Chosen so the seeded queue shows one healthy, one at-risk and one breached ticket |
| `DB.fairnessCases`, `DB.erasureRequests`, `DB.absenceEvents`, `DB.emergencyClaims`, `DB.emergencyDispatches` all initialised to `[]` | `L15505`,`L15961`,`L16564`,`L16565`,`L17199` | Populated (if at all) only by their module boot seeds |
| `NOTIF`-style preview caps | — | none here; the list is uncapped |
| `CURRENT_USER_ID = 'USR-1'` (Sarah Al-Rashid, `Owner`) | `L2862`,`L2831` | Single-session demo identity; determines both `heldByMe` and the role filter |
| 30-minute "soon" threshold in `dueChip` | `L19235` | literal `30*60000` |

---

## 14. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `nav.inbox` | Sidebar label `L496` | `Work inbox` | `صندوق العمل` `L7911` |
| `sec.overview` | Sidebar section header `L495` | `Overview` | `نظرة عامة` `L7912` |

**No `data-i18n` attribute exists inside `#p-inbox`**, and none of the strings produced by `renderInbox()`, `inboxItems()`, `ownerChip()`, `caseChip()` or `dueChip()` pass through `LANG_STRINGS` `L7903`. Every tab label, KPI label, queue label, empty state and item title is English-only, by the design note at `L7898`–`L7902`.

---

## 15. Gaps, dead code, UNVERIFIED items

1. **`'Operations'` is not a role.** `WORK_ROUTING` `L19091`–`L19102` routes 11 of 12 queues to `'Operations'`, but the role vocabulary is `['Owner','Ops Manager','Finance','Support']` (`TEAM_ROLES`, and the seeded `DB.teamUsers` `L2831`–`L2840`). An **Ops Manager sees an empty inbox** with the role filter on — the single most consequential defect in this module.
2. **Tab counts ignore the role filter.** `mine`/`unassigned`/`all` are computed from `inboxItems()` `L19242`–`L19245` while the rows come from `inboxFiltered()`. A tab can read `Everything · 9` and render zero rows.
3. **KPI tiles likewise ignore both filters** — they always describe the whole system, which contradicts the "Nobody owns … across every queue" sub-line only by accident.
4. **`Overdue right now` counts `dueMs === -1` sentinels.** Three item types (`dispatch`, `leg`-uncovered, critical `incident`) hardcode `-1` `L19154`,`L19168`,`L19191`, so they are permanently "overdue 0m" and permanently inflate KPI 1 and the sidebar badge.
5. **Sidebar badge uses `||`, not `+`.** `n = count(breached) || count(unclaimed)` `L19315`–`L19316` — as soon as one item is breached the badge stops reporting unclaimed work entirely, and the number changes meaning without changing appearance beyond the `a`/`n` class.
6. **`#my-work-chip` navigates to Support Center, not the inbox** `L567` (`onclick="go('support',null)"`), despite reading `✋ N mine` and being maintained by the inbox module `L19038`–`L19044`.
7. **Rendering mutates state and writes audit rows.** `whoHolds()` `L18867`–`L18873` expires stale claims as a read side-effect. `renderInbox` calls it up to 3× per item per render, and the tick engine re-renders every 20 s, so a stale claim generates its `claim_expired` audit entry from whichever render happens to touch it first.
8. **`inboxOpen` claims on open.** Merely pressing `Open ticket` to look at something takes ownership away from the unassigned pool `L19304`. Deliberate per `L19299`–`L19300`, but there is no "just view" affordance.
9. **`new Function(item.action)` string-eval** `L19308`. All inputs are internal ids today, but a record id containing `'` would produce a syntax error, silently falling through to `go(QUEUE_ROUTE[type])`. No escaping is applied when the action strings are assembled (`L19129`, `L19136`, `L19210`).
10. **`DB.ownershipConfig.warnTakeover` is dead** — declared `L18853`, never read.
11. **`completeItem()` `L18906` is effectively unreferenced by the inbox.** The list has no "done" concept; items disappear only when their domain predicate stops matching.
12. **`workChip()` `L19033` (case chip + owner chip combined) is not used by `renderInbox`** — the inbox composes the two chips separately (`L19280`, `L19283`).
13. **Comment/implementation mismatch:** *"Thirteen queues"* `L19064` vs 12 entries in `QUEUE_LABEL` `L19104`.
14. **The `all`-tab empty state names the role even when routing is off** `L19290`.
15. **Two independent work builders.** `inboxItems()` and `buildInterventionItems()` `L9450` do not share a source; instant ride requests (`DB.rideRequests`) never enter the inbox, and lost-and-found / PDPL / coverage never enter the dashboard.
16. **UNVERIFIED — `seedFairness`, `commitBoot`, `dispatchBoot`, `coverageBoot`, `gapsBoot2` seed contents.** They populate `DB.fairnessCases`, `DB.absenceEvents`, `DB.emergencyClaims`, `DB.emergencyDispatches`, `DB.erasureRequests`, `DB.backupRegistry` — which determine how many rows the inbox actually shows on load. The boot registry was read (`L21811`–`L21826`) but the individual seed bodies were not.
17. **UNVERIFIED — `confirmAction()` implementation.** `confirmTakeover` `L18944` passes `{title, summary, consequences, confirmLabel, onConfirm}`; the dialog's exact markup/behaviour was not read in this pass.
18. **UNVERIFIED — `legAck()` weight semantics.** `legAck(subId)` `L18139` returns `(DB.legAcks||{})[subId]||null`; item 7d branches on `.weight === 'weak'` `L19165`, but where `weight` is assigned was not traced.
19. **UNVERIFIED — `dispatchEligibility()` / `nearestEligibleDrivers()`**, which decide `c.uncovered` for item type 12 (`backupCoverage()` `L17480`–`L17501`).
20. **UNVERIFIED (now resolved) — exact declaration line of `TEAM_ROLES`.** It is declared immediately after `commitEditTeamUser` in the block read at `L10451`+; originally cited as "`L10480`-region" rather than an exact line. **Verification pass 2 confirmed the exact line: `var TEAM_ROLES=['Owner','Ops Manager','Finance','Support'];` at `L10501`.**

---

## 16. Line-number index

| Symbol / element | Line(s) |
|---|---|
| `#p-inbox` page markup | `L1392`–`L1396` |
| `#inbox-body` render target | `L1394` |
| Sidebar item + `#sbb-inbox` badge | `L496` |
| `#my-work-chip` (top bar) | `L567` |
| Dashboard entry button | `L682` |
| Secondary entry CTA | `L2073` |
| `titles.inbox` / `subs.inbox` | `L2168` / `L2169` |
| `DB.tickets` seed | `L2763`–`L2772` |
| `DB.teamUsers` seed (roles) | `L2830`–`L2841` |
| `CURRENT_USER_ID` | `L2862` |
| `requirePerm()` / `logAction()` | `L3126` / `L3133` |
| `nm2()` | `L3565` |
| `window.go` router (inbox branch `L8822`) | `L8774`–`L8826` |
| `window.openTicketDetail` | `L8879` |
| `buildInterventionItems()` (separate builder) | `L9450`–`L9532` |
| `tickEngine()` 20-tick `refreshInbox()` | `L12494`-region |
| `assignBackup()` | `L13186` |
| `DB.incidents` seed | `L13389`–`L13393` |
| `DB.disputes` seed | `L14391`–`L14396` |
| `DB.lostFound` seed | `L14448`–`L14452` |
| `fmtAge()` | `L14630`–`L14636` |
| `DB.slaPolicy` | `L14650`–`L14660` |
| `DB.reasonCodes` | `L14668`+ |
| `rcTargets()` / `rcLabel()` | `L14730` / `L14743` |
| `slaState()` | `L14766`–`L14790` |
| `backfillReasonCodes()` | `L15187` |
| `DB.fairnessCases` | `L15505` |
| `DB.erasureRequests` | `L15961` |
| `DB.commitPolicy` | `L16541`–`L16561` |
| `DB.planConfirmations` / `DB.absenceEvents` / `DB.emergencyClaims` | `L16563` / `L16564` / `L16565` |
| `pendingConfirmations()` | `L16575`–`L16587` |
| `departureRisk()` | `L16607`–`L16615` |
| `DB.backupRegistry` / `DB.emergencyDispatches` | `L17198` / `L17199` |
| `backupCoverage()` | `L17480`–`L17501` |
| `openArrivalEvidence()` | `L17749` |
| `DB.legAcks` / `DB.backupOffers` | `L18123` / `L18124` |
| `legAck()` | `L18139` |
| `offerState()` | `L18160`–`L18169` |
| **A1 Case ownership block** | `L18828`–`L19058` |
| `DB.ownership` / `DB.cases` / `DB.ownershipConfig` | `L18851` / `L18852` / `L18853` |
| `stopEv()` / `ckey()` / `meUser()` | `L18857` / `L18858` / `L18859`–`L18862` |
| `whoHolds()` (stale auto-release) | `L18865`–`L18875` |
| `heldByMe()` | `L18876` |
| `claimItem()` | `L18877`–`L18892` |
| `touchClaim()` | `L18893`–`L18896` |
| `releaseItem()` | `L18897`–`L18905` |
| `completeItem()` | `L18906`–`L18911` |
| `myOpenClaims()` | `L18912`–`L18917` |
| `ownershipStats()` | `L18918`–`L18926` |
| `ownerChip()` | `L18928`–`L18941` |
| `confirmTakeover()` | `L18942`–`L18954` |
| `ownershipWarning()` | `L18956`–`L18962` |
| `newCase()` / `linkToCase()` / `caseFor()` / `closeCase()` | `L18965` / `L18972` / `L18977` / `L18984` |
| `caseChip()` | `L18997`–`L19005` |
| `openCaseView()` | `L19006`–`L19031` |
| `workChip()` (unused by inbox) | `L19033` |
| `refreshInbox()` | `L19034`–`L19037` |
| `updateMyWorkChip()` | `L19038`–`L19044` |
| `refreshOwnershipSurfaces()` | `L19045`–`L19058` |
| **A2 Work inbox block** | `L19061`–`L19321` |
| Design contract comment | `L19061`–`L19083` |
| `_inboxTab` / `_inboxRoleFilter` | `L19085` / `L19086` |
| `WORK_ROUTING` | `L19090`–`L19103` |
| `QUEUE_LABEL` | `L19104`–`L19106` |
| `QUEUE_ROUTE` | `L19107`–`L19109` |
| `wi()` | `L19111`–`L19119` |
| **`inboxItems()`** | **`L19120`–`L19213`** |
| `inboxFiltered()` | `L19214`–`L19229` |
| `dueChip()` | `L19230`–`L19238` |
| **`renderInbox()`** | **`L19239`–`L19293`** |
| `setInboxTab()` | `L19294` |
| `toggleInboxRole()` | `L19295`–`L19298` |
| `inboxOpen()` | `L19301`–`L19310` |
| `updateInboxBadge()` | `L19311`–`L19319` |
| `inboxBoot()` | `L19321` |
| Boot registration (`work inbox` step) | `L21820` |
