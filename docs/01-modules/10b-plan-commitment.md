# Module: Plan Commitment

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `commitment` · **Page div:** `#p-commitment`
> **HTML lines:** L1397–L1401 · **Sidebar item:** L515
> **Render entry point:** `renderCommitmentPage()` (L16912–L17078)
> **Settings renderers:** `renderCommitSettings()` (L17080–L17116), `renderDispatchSettings()` (L17408–L17426) — both write into the Settings page (`#commit-tbody` L1816, `#dispatch-tbody` L1818, `#commit-tiers` L1820)

---

## 1. Purpose

Stated in the module header comment (L16520–L16538):

> "Two layers, deliberately in this order. **PREVENTION** comes first because deterrence only works at a moment of decision, and most absences are not decisions — they are oversleeping, traffic that was never calculated, a conflict booked two weeks ago. A captain who slept through a pickup was not awake to be deterred. **ENFORCEMENT** comes second, and is severe precisely because by then the captain has ignored a confirmation, a departure alert and a call.
> No cash fines anywhere in this layer. Forfeiting the undelivered remainder of a plan is withholding consideration for service not rendered — the same financial weight as a fine, materially less regulatory exposure than a punitive charge on an independent contractor."

The page subtitle (L1398): *"Prevent the absence first, penalise it second — nightly confirmation, departure risk, the rolling counter, and the route back."*

---

## 2. Entry points & routing

| Trigger | Line | Effect |
|---|---|---|
| Sidebar `onclick="go('commitment',this)"` | L515 | Navigate |
| `go()` router `if(id==='commitment'){renderCommitmentPage();}` | L8823 | Render |
| `refreshOwnershipSurfaces()` re-render when `.on` | L19052 | Ownership changes |
| `pushOpsNotification(...,function(){go('commitment',null);})` — regulator threshold | L16720 | Notification |
| `pushOpsNotification(...)` — absence recorded | L16723 | Notification |
| `pushOpsNotification(...)` — no captain available | L16297 area / L17293–L17295 | Notification |
| `pushOpsNotification(...)` — dispatch exhausted | L17306–L17308 | Notification |
| Work Inbox actions `go('commitment',null)` for emergency claims / dispatches / absences / legs / risk | L19150, L19157, L19163, L19168–L19187 | Inbox routing |
| `commitMenu('coverage',…)` → `📊 Open Coverage & capacity` → `go('coverage',null)` | L16876 | Cross-link out |
| Title / subtitle | L2168 (`commitment:'Plan Commitment'`), L2169 (`commitment:'Who is holding to their plan, and who is drifting'`) | Topbar |

**Boot steps** (L21816–L21818):
- `{name:'plan commitment', fn:commitBoot, needs:['commitPolicy','planConfirmations','absenceEvents']}` → `commitBoot()` L17140–L17155
- `{name:'emergency dispatch', fn:dispatchBoot, needs:['emergencyDispatches','backupRegistry']}` → `dispatchBoot()` L17427–L17442
- `{name:'backup coverage', fn:coverageBoot, needs:['backupRegistry']}` → `coverageBoot()` L17578–L17580 (no-op)

**Permission gate on the page itself:** none. `PAGE_PERMISSIONS` (L10564 ff.) has **no `commitment` entry**.

---

## 3. Layout map

HTML skeleton (L1397–L1401):

```
<div class="page" id="p-commitment">
  <div class="ph"><div class="ph-l">
    <h1>✅ Plan commitment</h1>
    <p>Prevent the absence first, penalise it second — nightly confirmation, departure risk, the rolling counter, and the route back</p>
  </div></div>
  <div id="commitment-body"></div>     ← renderCommitmentPage()
</div>
```

`#commitment-body` innerHTML assembly order (L17073–L17074):

```js
el.innerHTML = kpis + confirmCard + covCard + riskCard + dispatchCard
             + previewCard + counterCard + evCard + claimCard
             + ((typeof rehabCardHTML==='function') ? rehabCardHTML() : '');
```

| # | Block | Var | Lines | Container id |
|---|---|---|---|---|
| 1 | KPI strip (`div.g4`) + filter chip | `kpis` | L16935–L16948 | — |
| 2 | 🌙 Nightly confirmation — tomorrow's legs | `confirmCard` | L16952–L16979 | `#commit-confirm-card` |
| 3 | 🛟 Backup coverage — registered vs actually eligible | `covCard` | L17068–L17072 | `#commit-cov-card` → inner `#coverage-body` filled by `renderCoverage()` (L17515–L17561) |
| 4 | 🚨 Departure risk — call now, warm the backup | `riskCard` | L16981–L16994 | `#commit-risk-card` |
| 5 | 🚨 Emergency dispatch — nearest captain to the rider | `dispatchCard` | L17064–L17067 | inner `#dispatch-body` filled by `renderEmergencyDispatch()` (L17360–L17407) |
| 6 | 👁 What the captain sees before deciding | `previewCard` | L17059–L17063 | — |
| 7 | 📊 Absence counter — rolling N days | `counterCard` | L16996–L17019 | `#commit-counter-card` |
| 8 | ⚠ Absence events | `evCard` | L17020–L17039 | `#commit-ev-card` |
| 9 | 📄 Emergency claims & appeals | `claimCard` | L17040–L17058 | `#commit-claim-card` |
| 10 | 🔄 Return route — removed captains | `rehabCardHTML()` | L19499–L19524 | — (returns `''` when no terminated captains) |

Post-innerHTML calls (L17075–L17077):
```js
if(typeof renderEmergencyDispatch==='function')renderEmergencyDispatch();
if(cov && typeof renderCoverage==='function')renderCoverage();
```

`applyDecay()` runs first, before anything is computed (L16915).

---

## 4. Rules & policy logic — written out exactly

### 4.1 `DB.commitPolicy` — the full policy object (L16541–L16561, extended at L17182–L17187, L17465, L18125)

| Key | Value | Comment in source |
|---|---|---|
| `lateGraceMin` | `10` | "logged, affects reliability — never a penalty" |
| `lateAsAbsenceMin` | `25` | "beyond this it is treated as an absence" |
| `confirmDeadline` | `'21:00'` | "fixed evening cut-off, not a rolling 24h window" |
| `riderWaitMin` | `10` | "symmetric with the captain's own grace" |
| `riderNoShowPayPct` | `50` | "captain is paid for held capacity" |
| `payoutDays` | `3` | — |
| `backupMultiplierPct` | `125` | "funded from Eyvar commission, never from the absentee" |
| `counterWindowDays` | `30` | "rolling, not plan-lifetime" |
| `decayDays` | `30` | "clean days that erase one strike" |
| `rehabDays` | `90` | — |
| `appealWindowDays` | `7` | — |
| `appealResponseHours` | `24` | — |
| `regulatorCancelLimit` | `5` | "GAT: 30-day suspension past 5 post-acceptance cancels" |
| `termsVersion` | `'PLAN-TERMS-v1.0'` | — |
| `emergencyMultiplierPct` | `150` (L17182) | "short-notice premium, above the 125% standing backup" |
| `dispatchWindowSec` | `45` (L17183) | "per-captain acceptance window before escalating" |
| `dispatchMaxCandidates` | `5` (L17184) | — |
| `riderCompPctPer10Min` | `20` (L17185) | "delay compensation, scaled" |
| `riderCompCapPct` | `100` (L17186) | — |
| `riderCompMinSAR` | `10` (L17187) | — |
| `commitmentReservePct` | `0` (L17465) | "0 = off. Try 15 to activate." |
| `offerWindowMin` | `20` (L18125) | "how long a backup has to answer" |

### 4.2 The absence ladder — `commitPolicy.tiers` (L16556–L16560)

```js
tiers:[
  {n:1,label:'First absence',  freezeDays:7,  forfeitRemaining:true, pullPlan:true,  terminate:false},
  {n:2,label:'Second absence', freezeDays:30, forfeitRemaining:true, pullPlan:true,  terminate:false, demoteTier:true},
  {n:3,label:'Third absence',  freezeDays:0,  forfeitRemaining:true, pullPlan:true,  terminate:true}
]
```

Rendered in Settings by `renderCommitSettings()` (L17107–L17115) as:
`<b>{label}</b> — plan pulled, <b>remaining plan earnings forfeited</b>` + `, {freezeDays}-day freeze from plans` (if non-zero) + `, tier demotion` (if `demoteTier`) + `, permanent removal from the plan system (ordinary rides remain)` (if `terminate`), followed by the "no cash fines anywhere in this ladder" paragraph (L17115).

> **`forfeitRemaining` is declared on every tier but never read anywhere.** `recordAbsence()` forfeits unconditionally (L16700–L16705). `demoteTier` is read only for display (`exposureLineHTML` L16671, settings L17111) — **no code demotes a tier.**

### 4.3 Commitment rules — PREVENTION

**Nightly confirmation set — `pendingConfirmations()` (L16575–L16587):**
```js
Object.keys(DB.subscriptions)
  .filter(k => /active|expiring/i.test(DB.subscriptions[k].status))
  .map(k => {
    var c = (DB.planConfirmations||{})[k] || {};
    return {subId:k, driver:s.driver, rider:s.rider, plan:s.plan,
            confirmed:!!c.confirmedAtMs, autoHandedOff:!!c.autoHandedOff,
            confirmedAtMs:c.confirmedAtMs||null};
  });
```
Rule: unconfirmed by `confirmDeadline` (**21:00**) → handed to backup, **NO penalty**. In-code rationale (L16569–L16574): "It converts a would-be absence into a managed withdrawal 12 hours early, and the rider never feels it."

> **The 21:00 deadline is never evaluated by code.** There is no timer that auto-runs `autoHandoff()` at the cut-off; `confirmDeadline` is a display string only (L16590, L16598, L16936, L16954, L17110–L17111). Handing off is a manual button.

**Acknowledgement model — `ACK_SOURCE` (L18127–L18138):**

| Source | Label | Weight | Note |
|---|---|---|---|
| `app` | Captain confirmed in the app | `strong` | "The captain acted themselves — the strongest form of confirmation." |
| `phone` | Ops spoke to the captain by phone | `attested` | "An operator attests to a verbal confirmation. Recorded under that operator's name." |
| `whatsapp` | Captain replied on WhatsApp | `attested` | "A written reply exists but outside the app. Attach the thread if it is ever disputed." |
| `assumed` | No response — recorded as assumed | `weak` | "⚠ Not a confirmation. Use only when the leg must proceed and somebody has decided to carry the risk." |

Chip colours (`ackChip()` L18147–L18158): `strong`→`b-green` `✓ captain confirmed`; `attested`→`b-blue` `✓ attested by <by>`; `weak`→`b-amber` `⚠ assumed — not confirmed`; no record→`b-grey` `no acknowledgement`.

**Backup offer lifecycle — `offerState(subId)` (L18160–L18169):**
```js
if(o.state==='offered' && nowMs()-o.tsMs > DB.commitPolicy.offerWindowMin*60000){
  o.state='expired';
  logAction('backup_offer_expired','subscription',subId,
    'Backup offer to '+nm2(o.driverId)+' expired unanswered after '+offerWindowMin+' min — the leg is NOT covered');
}
```
States and chips (`offerChip()` L18170–L18178): `accepted`→`b-green ✓ <name> accepted`; `declined`→`b-red ✕ <name> declined`; `expired`→`b-red ⏱ offer expired — leg uncovered`; `offered`→`b-amber ⏳ offered to <name> — awaiting reply (<fmtAge(left)>)` where `left = offerWindowMin*60000 - (nowMs()-o.tsMs)`.

**Departure risk — `departureRisk()` (L16607–L16616):**
```js
Object.keys(DB.trips).map(k=>DB.trips[k])
  .filter(t => t.kind==='Subscription' && /Late \+|assigned|En route/i.test(t.status||''))
  .map(t => ({tripId:t.id, driver:t.driver, rider:t.rider, route:t.route,
              minsToPickup: 20 - ((parseInt(t.id.replace(/\D/g,''),10)||0) % 18),
              status:t.status}));
```
> **`minsToPickup` is a deterministic pseudo-value derived from the trip-id digits — a demo stand-in, not a real countdown.** Range: `20-17` … `20-0` → **3 to 20 minutes**.
Page filter: `.filter(r => r.minsToPickup <= 20)` (L16926) — which, given the formula, never excludes anything.

### 4.4 Commitment rules — ENFORCEMENT

**Delay classification — `classifyDelay(minutesLate)` (L16620–L16630):**
```js
if(minutesLate <= 10)  return {kind:'on_time', penalty:false};
if(minutesLate <  25)  return {kind:'late',    penalty:false,
        note:'Logged against reliability. No financial effect — lateness is not absence.'};
return {kind:'absence', penalty:true,
        note:'Past 25 minutes the rider has effectively been stood up.'};
```
(Thresholds read live from `p.lateGraceMin` = 10 and `p.lateAsAbsenceMin` = 25.)

**Rolling counter — `absenceCount(driverId)` (L16631–L16636):**
```js
var since = nowMs() - counterWindowDays*86400000;          // 30 days
var live = DB.absenceEvents.filter(e =>
      e.driverId===driverId && e.tsMs>=since && !e.waived && !e.decayed);
return live.length;
```

**Next tier — `nextTier(driverId)` (L16637–L16642):**
```js
var n = absenceCount(driverId) + 1;
return tiers[Math.min(n, tiers.length) - 1];   // caps at tier 3
```

**Exposure — `absenceExposure(driverId,subId)` (L16644–L16664):**
```js
tier = nextTier(driverId)
sub  = subId ? DB.subscriptions[subId]
             : first subscription where s.driver===driverId && /active|expiring/i.test(s.status)
paid        = parseFloat(String(sub.paid).replace(/[^\d.]/g,'')) || 0
[done,total]= String(sub.trips||'0/0').split('/')   // total defaults to 1
driverShare = paid * 0.8                            // ← hardcoded 0.8, NOT EYVAR_COMMISSION_PCT
remaining   = Math.max(0, driverShare * ((total-done)/total))
reserve     = commitmentReserve(sub.id)
return {tier, remainingSAR: Math.round(remaining*100)/100,
        reserveSAR: reserve,
        totalAtRisk: Math.round((remaining+reserve)*100)/100,
        subId: sub.id, strikes: absenceCount(driverId)};
```

**Commitment reserve — `commitmentReserve(subId)` (L17562–L17569):**
```js
var pct = DB.commitPolicy.commitmentReservePct || 0;   // ships as 0 = OFF
if(!pct) return 0;
var paid = parseFloat(String(sub.paid).replace(/[^\d.]/g,'')) || 0;
return Math.round(paid * 0.8 * (pct/100) * 100) / 100;
```
`reserveState(subId)` (L17570–L17577) → `{amount, released: done>=total, done, total}`. **`reserveState` is never called anywhere.**

Design note (L17452–L17463): "A captain who misses the final leg of a nearly-complete plan forfeits almost nothing… A minimum forfeiture floor would close it, but a floor untied to undelivered work is a fine in all but name… The reserve is the alternative: hold a slice of every plan's earnings until the last leg is delivered… It ships DISABLED (0%)."

**The deterrence string — `exposureLineHTML(driverId,subId)` (L16665–L16677):**
```js
bits = []
if(remainingSAR>0) bits.push('loss of the '+remainingSAR.toFixed(2)+' SAR still owed on '+subId)
if(reserveSAR>0)   bits.push('loss of the '+reserveSAR.toFixed(2)+' SAR commitment reserve')
if(tier.freezeDays) bits.push(tier.freezeDays+'-day freeze from plans')
if(tier.terminate)  bits.push('<b>permanent removal from the plan system</b>')
if(tier.demoteTier) bits.push('tier demotion')
→ "One absence = " + bits.join(' + ')
→ sub-line: tier.label + ' · ' + strikes + ' strike(s) live in the last 30 days.'
```

### 4.5 `recordAbsence(driverId,subId,minutesLate)` — the enforcement engine (L16678–L16740)

Step by step:

1. `cls = classifyDelay(minutesLate==null ? 99 : minutesLate)` (L16679).
2. **If not an absence** (L16680–L16685): `logAction('late_pickup_logged','driver',driverId,'Late by '+minutesLate+' min on '+subId+' — reliability only, no penalty ('+cls.note+')')`; toast `Logged as lateness, not absence — no financial effect` (`info`); **return null**. No counter entry.
3. `exp = absenceExposure(driverId,subId)` (L16686).
4. Create the event (L16687–L16694):
```js
ev = {id:'ABS-'+String(DB.absenceEvents.length+1).padStart(4,'0'),
      driverId, driverName:nm2(driverId), subId, tsMs:nowMs(),
      date:fmtReqNowLabel(), tier:exp.tier.n,
      forfeited:(exp.totalAtRisk!=null ? exp.totalAtRisk : exp.remainingSAR),
      reserveForfeited:exp.reserveSAR||0,
      freezeDays:exp.tier.freezeDays, terminated:!!exp.tier.terminate,
      waived:false, decayed:false, appealId:null, emergencyId:null};
DB.absenceEvents.unshift(ev);
```
5. **Forfeiture** (L16698–L16702) — logging only, no balance mutation:
```js
if(exp.remainingSAR>0)
  logAction('plan_earnings_forfeited','driver',driverId,
    exp.remainingSAR.toFixed(2)+' SAR of undelivered plan earnings forfeited on '+subId
    +' — withdrawable balance from ordinary rides untouched');
```
6. **Plan pulled** (L16703–L16705): `if(exp.tier.pullPlan && DB.subscriptions[subId]) DB.subscriptions[subId].driverChanges = (…||0)+1;` — increments the same-captain-promise breach counter.
7. **Terminate** (L16706–L16711): `DB.drivers[driverId].planAccess='terminated'` + `logAction('plan_access_terminated',…, 'Third absence in 30 days — removed from the plan system. Ordinary rides remain available.')`.
8. **Else freeze** (L16712–L16715): `DB.drivers[driverId].planFreezeUntilMs = nowMs() + exp.tier.freezeDays*86400000`.
9. **Regulator warning** (L16716–L16722):
```js
var reg = regulatorCount(driverId);
if(reg >= regulatorCancelLimit - 1)      // i.e. >= 4
  pushOpsNotification('warn','Regulator threshold approaching — '+nm2(driverId),
    reg+' post-acceptance cancellations in 30 days. GAT suspension triggers at 5.',
    function(){go('commitment',null);});
```
10. **Ops alert** (L16723–L16724): `pushOpsNotification('alert','Absence recorded — '+nm2(driverId), exp.tier.label+' · '+exp.remainingSAR.toFixed(2)+' SAR forfeited', → go('commitment'))`.
11. **Case linkage** (L16731–L16734): `newCase('absence','absence',ev.id,'Absence — '+nm2(driverId)+' on '+subId)` and `linkToCase(caseId,'leg',subId)`.
12. **Emergency dispatch** (L16735–L16736): `emergencyDispatch(subId, ev.id, minutesLate==null ? lateAsAbsenceMin : minutesLate)` — guarded on `DB.emergencyDispatches && DB.subscriptions[subId]`.
13. `renderCommitmentPage()`; toast `⚠ <ABS-id> — <tier.label> applied` (`warn`). Returns `ev`.

**Regulator counter — `regulatorCount(driverId)` (L16741–L16747):**
```js
var since = nowMs() - 30*86400000;          // hardcoded 30 days, NOT counterWindowDays
return DB.absenceEvents.filter(e =>
   e.driverId===driverId && e.tsMs>=since && !e.waived).length;    // NOTE: ignores .decayed
```
Displayed as `<reg>/<regulatorCancelLimit>`, red when `reg >= regulatorCancelLimit-1` (L17015).

**Decay — `applyDecay()` (L16748–L16766):**
```js
DB.absenceEvents.forEach(e => {
  if(e.waived || e.decayed) return;
  var later = DB.absenceEvents.some(x =>
        x.driverId===e.driverId && x.tsMs>e.tsMs && !x.waived && !x.decayed);
  if(!later && nowMs()-e.tsMs > decayDays*86400000){       // 30 days
    e.decayed = true;
    logAction('absence_decayed','driver',e.driverId,
      e.id+' expired after 30 clean days — strike removed from the rolling counter');
  }
});
```
Comment (L16752–L16754): "only a LIVE later absence blocks decay — otherwise a strike that has already expired would keep older ones alive forever."
Called once per render, at the top of `renderCommitmentPage()` (L16915).

### 4.6 Emergency claims (the appeal path)

**Filing — `commitEmergencyClaim(absId)` (L16790–L16807):**
```js
c = {id:'EMG-'+String(DB.emergencyClaims.length+1).padStart(4,'0'),
     absenceId:absId, driverId:ev.driverId,
     kind:  <#em-kind>  || 'accident',
     doc:   <#em-doc>   || '',
     detail:<#em-detail>|| '',
     status:'Open', openedAtMs:nowMs(),
     dueAtMs: nowMs() + appealResponseHours*3600000};        // +24h
DB.emergencyClaims.unshift(c);
ev.emergencyId = c.id;
logContact({channel:'in_app',direction:'inbound',reasonCode:'DRV_DEDUCTION_DISPUTE', entityId:ev.driverId, …, linked:{type:'emergency',id:c.id}});
logAction('emergency_claim_filed','driver',ev.driverId,'Emergency claim '+c.id+' filed against '+absId);
toast('📄 '+c.id+' filed — decision due within 24h','info');
```
Stated policy in the modal (L16776): *"An upheld claim reverses the forfeiture **and** removes the strike from the rolling counter. Decision due within 24 hours."*
Appeal window: `appealWindowDays = 7` — displayed in the `recordAbsence` gate (L17923: "The captain may file an emergency claim within 7 days, which reverses all of this if upheld"). **The 7-day window is never enforced in code** — `openEmergencyClaim` has no age check.

**Deciding — `decideEmergency(claimId,uphold)` (L16808–L16833):**
```js
if(!requirePerm('approve_drivers'))return;
if(!c || c.status!=='Open')return;
c.status = uphold ? 'Upheld' : 'Rejected';
c.decidedBy = actor?actor.name:CURRENT_USER_ID; c.decidedAtMs = nowMs();
if(uphold){
  ev.waived = true;                                  // strike removed from the counter
  var d = DB.drivers[ev.driverId];
  if(d){ delete d.planFreezeUntilMs;                 // freeze lifted
         if(ev.terminated) delete d.planAccess; }    // termination reversed
  logAction('absence_waived','driver',ev.driverId,
    ev.id+' waived on emergency evidence — '+ev.forfeited.toFixed(2)
    +' SAR restored, strike removed, freeze lifted');
}
toast(uphold ? '✅ Upheld — forfeiture reversed and the strike removed'
             : 'Rejected — grounds must be served to the captain', uphold?'ok':'info');
```
> **A rejection writes only `status`/`decidedBy`/`decidedAtMs`** — the "grounds" the toast demands are never captured.

Overdue rule on the row (L17042): `left = c.dueAtMs - nowMs(); over = left<0 && c.status==='Open'` → `⚠ past the 24h promise` in red; otherwise `<fmtAge(left)> to decide`.

### 4.7 Emergency dispatch (money mechanics)

**Eligibility gate — `dispatchEligibility(driverId,sub,excludeId)` (L17209–L17225), shared with Coverage:**
```js
if(!d)                                       return {ok:false, why:'unknown captain'};
if(driverId===excludeId)                     return {ok:false, why:'this is the absent captain'};
if(d.suspended)                              return {ok:false, why:'account suspended'};
if(d.planAccess==='terminated')              return {ok:false, why:'removed from the plan system'};
if(d.planFreezeUntilMs && d.planFreezeUntilMs>nowMs())
                                             return {ok:false, why:'frozen from plans'};
var wantComfort = /comfort/i.test(sub.plan||'');
if(wantComfort && !/comfort/i.test(d.type||''))
                                             return {ok:false, why:'vehicle type below plan'};
var conflict = Object.keys(DB.subscriptions).some(k => {
    var s = DB.subscriptions[k];
    return s.driver===driverId && k!==sub.id && /active/i.test(s.status)
        && (DB.planConfirmations[k]||{}).confirmedAtMs; });
if(conflict)                                 return {ok:false, why:'already committed to another leg'};
return {ok:true};
```

**Candidate list — `nearestEligibleDrivers(subId,excludeId)` (L17226–L17240):**
```js
per driver: km = gridDistanceKm(rider.mapPos, d.mapPos)         // L17204–L17208
            etaMin = Math.max(2, Math.round(km*2.4))
sort: eligible first, then ascending km
slice(0, dispatchMaxCandidates + 3)                              // 5+3 = 8
```
`gridDistanceKm(a,b)` (L17204–L17208): `Math.round(Math.sqrt(dx*dx+dy*dy)*0.42*10)/10`, returns `99` if either position missing.

**Rider delay compensation — `riderDelayCompensation(fare,delayMin)` (L17252–L17257):**
```js
pct = Math.min(riderCompCapPct,               // 100
                Math.ceil(delayMin/10) * riderCompPctPer10Min);   // 20 per 10 min
return Math.max(riderCompMinSAR,              // 10 SAR floor
                Math.round(fare*(pct/100)*100)/100);
```

**`emergencyDispatch(subId,absenceId,delayMin)` (L17258–L17298):**
```js
backup     = hasBackup(subId)                       // registered AND eligible (L17241–L17246)
candidates = nearestEligibleDrivers(subId, sub.driver).filter(c=>c.eligible)
fare       = Math.round(( paid / totalTrips ) * 100) / 100          // per-leg fare
d.queue    = (backup ? [{id:backup,name,km:0,etaMin:6,eligible:true,standing:true}] : [])
             .concat(candidates.slice(0, dispatchMaxCandidates))     // 5
d.multiplierPct   = backup ? backupMultiplierPct(125) : emergencyMultiplierPct(150)
d.replacementPay  = Math.round(fare * (multiplierPct/100) * 100)/100
d.riderCompensation = riderDelayCompensation(fare, delayMin||0)
d.status = 'Searching'; d.offerIndex = 0; d.recovered = 0; d.eyvarNet = 0;
```
If `d.queue.length` → `offerEmergency(d.id)`; else `d.status='No captain available'` + alert notification (L17292–L17296).
Audit: `logAction('emergency_dispatch_opened','subscription',subId, 'Emergency dispatch '+d.id+' — '+(backup?'backup':'nearest-captain search')+' for stranded rider '+nm2(sub.rider))` (L17287–L17288).

**`offerEmergency(dispatchId)` (L17299–L17314):** if no candidate at `offerIndex` → `status='Exhausted'` + log + alert notification; else `status='Offered'` + log line `Auto-offer sent to <name> — <km> km away, ETA <eta> min, <mult>% of fare. 45s to respond.`

**`acceptEmergency(dispatchId)` — the money order (L17315–L17351):**
```js
d.status='Accepted'; d.acceptedBy=c.id; d.acceptedAtMs=nowMs();
d.recovered = Math.min(d.replacementPay, ev ? ev.forfeited : 0);
d.eyvarNet  = Math.round((d.replacementPay - d.recovered + d.riderCompensation)*100)/100;
```
Then: rider credited via `creditRiderWallet(d.riderId, d.riderCompensation, 'Delay compensation — captain absence')` and `logGoodwill(d.riderId, d.riderCompensation, 'CAP_NOSHOW', 'Policy compensation — automatic, not agent discretion')` (L17334–L17337); `logContact({channel:'system',direction:'outbound',reasonCode:'CAP_NOSHOW',…,outcome:'resolved'})` (L17341–L17342); `DB.subscriptions[d.subId].driverChanges++` (L17343); `logAction('emergency_dispatch_accepted',…)` (L17344–L17347).

Design departure documented at L17172–L17180: the replacement is paid by Eyvar immediately and the absent captain's forfeiture is booked as a **recovery** against that cost — *not* captain-to-captain — because (1) the forfeited remainder is often smaller than the replacement cost, (2) an upheld claim would otherwise require a clawback from the replacement, (3) "a captain whose earnings come directly out of a colleague's penalty has an interest in that colleague failing."

**`declineEmergency(dispatchId)` (L17352–L17359):** logs `<name> declined — no penalty, this is an unplanned offer. Escalating to the next nearest.`, `d.offerIndex++`, re-calls `offerEmergency`.

Stated rule (L17368): **"Declining costs a captain nothing** — it is an unplanned offer, and penalising it would empty the pool exactly when it is needed."

### 4.8 Rehabilitation — `rehabCandidates()` (L19465–L19477) / `reinstateProbationary()` (L19478–L19489)

```js
days = rehabDays;                                   // 90
candidates = drivers where planAccess==='terminated'
last     = max tsMs over that driver's non-waived absence events (0 if none)
cleanMs  = last ? nowMs()-last : 0
eligible = cleanMs >= days*86400000
remainingDays = Math.max(0, days - Math.floor(cleanMs/86400000))
```
Reinstate (L19478–L19489):
```js
delete d.planAccess;
d.planProbationUntilMs = nowMs() + 30*86400000;     // hardcoded 30-day probation
d.planProbation = true;
logAction('plan_access_restored','driver',driverId,
  nm2(driverId)+' restored to the plan system on a 30-day probationary basis after 90 clean days.'
  +' One absence during probation removes access again.');
```
> **The probation itself is never enforced.** `planProbation` / `planProbationUntilMs` are written here and read nowhere; `recordAbsence` has no probation branch.

### 4.9 Terms acceptance — `acceptPlanTerms(driverId)` (L17133–L17139)
```js
DB.termsAcceptances.unshift({driverId, version:DB.commitPolicy.termsVersion,
                             tsMs:nowMs(), date:fmtReqNowLabel()});
logAction('plan_terms_accepted','driver',driverId,
  'Accepted PLAN-TERMS-v1.0 — a new version requires fresh acceptance and does not apply retroactively');
```
> **`acceptPlanTerms` is never called from any UI, and `DB.termsAcceptances` is never rendered.**

---

## 5. KPIs & metrics

All rendered via `kpiCard(label,value,sub,colour,filter,anchor)` (L16848–L16857). Every card is `class="kpi click"` with `onclick="filterCommit('<filter>','<anchor>')"`, `title="Click to filter · click again to clear"`, and gets a blue outline when `_commitFilter===filter`.

| # | Label | Source | Exact formula | Threshold / colour | Filter key | Scroll anchor |
|---|---|---|---|---|---|---|
| 1 | **Awaiting confirmation** | `pendingConfirmations()` | `pend.filter(p => !p.confirmed && !p.autoHandedOff).length` (L16917) | `var(--amber)` if `>0` else `var(--ink)` | `unconfirmed` | `commit-confirm-card` |
| 2 | **Awaiting captain reply** | offers + acks | `pend.filter(p => (o=offerState(p.subId)) && (o.state==='offered'\|\|'expired'\|\|'declined') \|\| (p.confirmed && legAck(p.subId).weight==='weak')).length` (L16921–L16925) | `var(--red)` if `>0` | `awaiting` | `commit-confirm-card` |
| 3 | **Departure risk** | `departureRisk()` | `departureRisk().filter(r => r.minsToPickup<=20).length` (L16926) | `var(--red)` if `>0` | `risk` | `commit-risk-card` |
| 4 | **Live absences (30d)** | `DB.absenceEvents` | `DB.absenceEvents.filter(e => !e.waived && !e.decayed).length` (L16927) — sub-label `<Σ e.forfeited>.toFixed(2) SAR forfeited` (L16928) | `var(--red)` if `>0` | `absences` | `commit-ev-card` |
| 5 | **Real backup coverage** *(only when `coverageStats` + `DB.backupRegistry` exist)* | `coverageStats()` | `cov.eligiblePct + '%'`; sub-label `<cov.registeredPct>% registered on paper` (L16944–L16945) | `var(--red)` if `cov.eligiblePct < 70` | `coverage` | `commit-cov-card` |
| 6 | **Emergency claims** | `DB.emergencyClaims` | `DB.emergencyClaims.filter(c => c.status==='Open').length` (L16929) — sub-label `decide within 24h` | `var(--amber)` if `>0` | `claims` | `commit-claim-card` |

**Coverage sub-metrics — `coverageStats()` (L17502–L17511):**
```js
rows          = backupCoverage()
eligible      = rows.filter(r=>r.eligible).length
registered    = rows.filter(r=>r.registered).length
uncovered     = rows.filter(r=>r.uncovered).length
registeredPct = rows.length ? Math.round(registered/rows.length*100) : 0
eligiblePct   = rows.length ? Math.round(eligible  /rows.length*100) : 0
```

**Dispatch money metrics** (rendered per dispatch row, L17389–L17395):

| Metric | Formula |
|---|---|
| Leg | `d.baseFare` = `round((paid / totalTrips)*100)/100` (L17262–L17263) |
| Replacement paid | `round(fare * multiplierPct/100 * 100)/100`, `multiplierPct` = 125 (standing backup) or 150 (nearest search) |
| Recovered from absentee | `Math.min(d.replacementPay, ev ? ev.forfeited : 0)` (L17324) |
| Rider compensated | `riderDelayCompensation(fare, delayMin)` (§4.7) |
| Eyvar net cost | `round((replacementPay − recovered + riderCompensation)*100)/100` (L17325); red when `>0` |

**Absence-counter row metrics** (L17001–L17018): `Strikes` = `absenceCount(id)`; `Next tier` = `absenceExposure(id).tier.label`; `Exposure now` = `absenceExposure(id).remainingSAR.toFixed(2)+' SAR'` or `—`; `Regulator` = `regulatorCount(id)+'/'+regulatorCancelLimit`.

---

## 6. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| Leg captain name | `nm2(p.driver)` ← `DB.subscriptions[k].driver` | computed | L16963 |
| Leg sub id | `rowLink(p.subId)` | link | `rowLink` L3283 → `openProfile` |
| Leg plan | `DB.subscriptions[k].plan` | string | L16964 |
| Leg rider | `nm2(p.rider)` | computed | L16964–L16965 |
| Ack chip | `DB.legAcks[subId]` | object | L18147 |
| Offer chip | `DB.backupOffers[subId]` | object | L18170 |
| Risk row: route / mins / status | `DB.trips[k].route`, computed `minsToPickup`, `t.status` | mixed | L16986 |
| Counter row: name | `DB.drivers[id].name` | string | L17011 |
| Counter row: status | `d.planAccess`, `d.planFreezeUntilMs` | mixed | `removed from plans` / `frozen <fmtAge>` / `eligible` (L17007–L17009) |
| Absence row: name, id, tier badge | `e.driverName`, `e.id`, `tiers[e.tier-1].label` | mixed | L17024–L17029 |
| Absence row: sub / date / forfeited / freeze / terminated | `e.subId`, `e.date`, `e.forfeited`, `e.freezeDays`, `e.terminated` | mixed | L17030–L17031 |
| Claim row: captain, kind, id, due | `c.driverId`, `c.kind`, `c.id`, `c.dueAtMs` | mixed | L17044–L17048 |
| Claim row: evidence / detail | `c.doc` (fallback `no evidence attached`), `c.detail` | string | L17050 |
| Coverage row: badge / backup / fallback / nearest | `backupCoverage()` row fields | computed | L17532–L17549 |
| Dispatch row: rider, id, status, backup flag, absent captain, delay | `d.*` | mixed | L17372–L17381 |
| Dispatch log lines | `d.log[].msg` | array | L17396–L17397 |
| Dispatch queue | `d.queue[].name`, `.km` | array | L17399–L17404 |
| Rehab row: name, clean days, last absence | `DB.drivers[id].name`, computed | mixed | L19516–L19518 |
| Preview card exposure line | `exposureLineHTML(Object.keys(DB.drivers)[0])` | computed | **L17059 — hardcoded to the FIRST driver in the fixture** |

---

## 7. Input fields / filters / config

### 7.1 On-page filter — `_commitFilter` (L16834)

`filterCommit(f,anchor)` (L16835–L16839):
```js
_commitFilter = (_commitFilter===f) ? 'all' : f;    // click again to clear
renderCommitmentPage();
if(anchor) setTimeout(()=>kpiScrollTo(anchor), 60);
```

| Key | Set by | Filters |
|---|---|---|
| `all` (default) | `Clear filter` button / re-click of active KPI | nothing |
| `unconfirmed` | KPI 1 | `pendShown = unconf` (L16950) |
| `awaiting` | KPI 2 | `pendShown = awaitingAck` (L16951) |
| `risk` | KPI 3 | **no list filter** — the risk card always shows `risk` (see §16) |
| `absences` | KPI 4 | `evShown = live` (L17020) **and** counter rows with `n===0` are dropped (L17010) |
| `coverage` | KPI 5 | inside `renderCoverage()`: `st.rows.filter(r=>!r.eligible)` (L17533–L17534) |
| `claims` | KPI 6 | `claimsShown = claims` (L17040) |

Filter chip — `commitFilterChip()` (L16840–L16847): shows `Filtered · <label>` badge plus a `Clear filter` button when `_commitFilter!=='all'`. Labels map (L16842–L16843): `unconfirmed`→"awaiting confirmation only", `risk`→"departure risk only", `absences`→"live strikes only", `coverage`→"uncovered plans only", `claims`→"open claims only". **`awaiting` has no label entry** — the raw key is shown.

### 7.2 Modal inputs

| id | Type | Label | Default | Options | Drives |
|---|---|---|---|---|---|
| `em-kind` (`customSelectHTML('csel-em-kind','em-kind',…)`) | custom select | `Nature of the emergency` | `accident` | `accident`="Traffic accident", `breakdown`="Vehicle breakdown", `medical`="Medical / health", `family`="Family emergency" (L16781–L16785) | `c.kind` |
| `em-doc` | `<input type="text">` | `Evidence provided`, placeholder `Police report no. / medical note / workshop invoice` | empty | — | `c.doc` |
| `em-detail` | `<textarea rows="3">` | `Detail` | empty | — | `c.detail` |
| `source` (gate option on `confirmPlanLeg`) | select | `How was this confirmed?` | `phone` | all four `ACK_SOURCE` keys (L18256–L18257) | `setLegAck(subId,src)` |
| `note` (gate option on `confirmPlanLeg`) | text | `Note (optional)`, placeholder `e.g. spoke to him at 20:40` | empty | — | `DB.legAcks[subId].note` |
| `reason` (gate option on `recordAbsence`) | select | `What was established` | `no_contact` | `no_contact`="Captain unreachable, never arrived", `refused`="Captain declined on the spot", `late_beyond`="Arrived past the absence threshold" (L17926–L17929) | **captured into `window.__confirmValues` but never read by `recordAbsence`** |
| `evidence` (gate option on `recordAbsence`) | checkbox | `I checked the arrival evidence trail first` | `false` | — | **never read** |

### 7.3 Settings › Plan commitment policy — `renderCommitSettings()` (L17080–L17116)

Rendered into `#commit-tbody` (L1816). Every row is `<input type="number" min="0" value="{p[key]}" data-cf="{key}" style="width:90px">`:

| # | `data-cf` | Label | Helper text | Default |
|---|---|---|---|---|
| 1 | `lateGraceMin` | Lateness grace (min) | Logged only — never a penalty | 10 |
| 2 | `lateAsAbsenceMin` | Treated as absence past (min) | Lateness and absence are different behaviours | 25 |
| 3 | `riderWaitMin` | Captain waits for rider (min) | Symmetric with the captain's own grace | 10 |
| 4 | `riderNoShowPayPct` | Rider no-show pays captain (%) | Held capacity is still capacity | 50 |
| 5 | `payoutDays` | Payout after final leg (days) | — | 3 |
| 6 | `backupMultiplierPct` | Backup leg multiplier (%) | Funded from Eyvar commission, never from the absentee | 125 |
| 7 | `counterWindowDays` | Absence counter window (days) | Rolling, not plan lifetime | 30 |
| 8 | `decayDays` | Clean days to erase a strike | — | 30 |
| 9 | `rehabDays` | Clean days before rehabilitation | — | 90 |
| 10 | `appealWindowDays` | Appeal window (days) | — | 7 |
| 11 | `appealResponseHours` | Appeal response promise (hours) | — | 24 |
| 12 | `regulatorCancelLimit` | GAT cancellation limit (30d) | Statutory ceiling — internal freeze must stay below it | 5 |
| 13 | `commitmentReservePct` | Commitment reserve (% of plan earnings) | "0 = off. Held until the final leg is delivered, forfeited on absence. Closes the 'absent on the last leg costs nothing' gap without becoming a fine — it stays a withholding for incomplete service. Changing this changes what every captain is paid and when." | 0 |
| 14 | `confirmDeadline` | Evening confirmation cut-off | "Fixed time, not a rolling 24h window — easier to remember, fairer to apply" | `21:00` — **`<input type="text">`**, L17110–L17111 |

### 7.4 Settings › Emergency dispatch — `renderDispatchSettings()` (L17408–L17426)

Rendered into `#dispatch-tbody` (L1818). All `<input type="number" min="0" … data-cf>`:

| `data-cf` | Label | Helper | Default |
|---|---|---|---|
| `emergencyMultiplierPct` | Emergency replacement pay (% of leg) | Short-notice premium, above the standing backup rate | 150 |
| `dispatchWindowSec` | Acceptance window (seconds) | Then it escalates to the next nearest | 45 |
| `dispatchMaxCandidates` | Captains to try | Before escalating to manual sourcing | 5 |
| `riderCompPctPer10Min` | Rider compensation per 10 min delay (%) | Scaled to the delay actually suffered | 20 |
| `riderCompCapPct` | Compensation cap (% of leg) | — | 100 |
| `riderCompMinSAR` | Minimum compensation (SAR) | A short delay is still a delay | 10 |

### 7.5 Saving — `saveCommitPolicy()` (L17117–L17132)

```js
if(!requirePerm('manage_settings'))return;
document.querySelectorAll('#commit-tbody [data-cf],#dispatch-tbody [data-cf]').forEach(i=>{
  var k = i.getAttribute('data-cf');
  DB.commitPolicy[k] = (k==='confirmDeadline') ? i.value : (parseFloat(i.value)||0);
});
if(DB.commitPolicy.tiers[1].freezeDays >= DB.commitPolicy.regulatorCancelLimit*0
   && DB.commitPolicy.tiers[1].freezeDays > 30){
  toast('⚠ Internal freeze exceeds the statutory ceiling — reduce it','warn');
}
logAction('edit_commit_policy','settings','commit-policy','Plan commitment policy updated');
renderCommitSettings(); renderDispatchSettings(); renderCommitmentPage();
toast('✅ Commitment policy saved','ok');
```
> The validation condition contains `regulatorCancelLimit*0`, which is always `0`, so the left-hand comparison is always true — the check reduces to `tiers[1].freezeDays > 30`. Flagged as a likely bug (L17123).

**The absence ladder itself (`tiers`) is not editable** — `#commit-tiers` renders read-only text (L17106–L17115).

---

## 8. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Mark confirmed** (leg row) | `confirmPlanLeg(subId)` — **overridden** at L18205–L18217 | `setLegAck(subId,src,note)`; `DB.planConfirmations[subId]={confirmedAtMs:nowMs(),autoHandedOff:false,ackSource:src}`; re-render; toast varies by source (`✅ Captain confirmed in the app` / `⚠ Recorded as assumed — the captain has not confirmed` / `✅ Confirmation attested and recorded`) | `DB.legAcks`, `DB.planConfirmations` | none | `plan_leg_confirmed` with the ACK label + `(NOT a confirmation; risk accepted by ops)` when `assumed` (L18210–L18212) | **Yes** — `GATE_SPECS.confirmPlanLeg` L18247–L18259, with the `source` select + `note` text |
| **Hand to backup** (leg row) | `autoHandoff(subId)` — **overridden** at L18219–L18234 | `DB.planConfirmations[subId]={confirmedAtMs:null,autoHandedOff:true}`; if an eligible backup exists → `createBackupOffer(subId,bk)` + toast `📨 Offered to <name> — the leg is NOT covered until they accept`; else `emergencyDispatch(subId,null,0)` + toast `↪ No eligible backup — nearest-captain search opened` (`warn`); always `logContact(SUB_SAME_CAPTAIN_BROKEN, outcome:'resolved')` | `DB.planConfirmations`, `DB.backupOffers`, `DB.emergencyDispatches`, `DB.contacts` | none | `backup_offer_sent` (L18180–L18182) or via `emergencyDispatch` | **Yes** — `guardAction('autoHandoff',…)` L17969–L17980 |
| **Accepted** / **Declined** (offer buttons on leg row) | `respondBackupOffer(subId,true/false)` L18185–L18203 | Sets `o.state`, `o.respondedAtMs`. On decline: `emergencyDispatch(subId,null,0)` + toast `↪ Declined — escalated to nearest-captain search` (`warn`). On accept: toast `✅ <name> accepted — the leg is covered` | `DB.backupOffers`, `DB.emergencyDispatches` | none | `backup_offer_accepted` / `backup_offer_declined` | **Yes** — `GATE_SPECS.respondBackupOffer` L18279–L18290 |
| **⋯** (any row) | `menuBtn(kind,id,title)` → `commitMenu(kind,id,extra)` L16858–L16906 | Opens an action-list modal (see §10) | — | none | none | no |
| **Call captain** (risk row) | `openLogContact(r.driver)` L16989 | Opens the contact-logging modal (Contacts module) | `DB.contacts` on commit | none | via that module | contacts module gate |
| **Record absence** (risk row, `btn sm danger`) | `recordAbsence(r.driver, r.tripId, 99)` L16990 | Full enforcement chain, §4.5 | `DB.absenceEvents`, `DB.drivers[].planAccess`/`.planFreezeUntilMs`, `DB.subscriptions[].driverChanges`, `DB.emergencyDispatches`, cases, notifications | none | `late_pickup_logged` **or** `plan_earnings_forfeited` + `plan_access_terminated` + `emergency_dispatch_opened` | **Yes** — `guardAction('recordAbsence',…)` L17911–L17930, `danger:true`, with `reason` select + `evidence` checkbox. Returns `null` (no gate) when the delay is not an absence |
| **File emergency claim** (absence row, shown when `!e.waived && !e.emergencyId`) | `openEmergencyClaim(e.id)` L17034 → L16768 | Opens the claim modal | — | none | none | no (modal is the step) |
| **File claim** (modal foot) | `commitEmergencyClaim(absId)` L16788 → L16790 | §4.6 | `DB.emergencyClaims`, `ev.emergencyId`, `DB.contacts`, `DB.auditLog` | none | `emergency_claim_filed` | **Yes** — `GATE_SPECS.commitEmergencyClaim` L18352–L18356 |
| **Uphold** (claim row) | `decideEmergency(id,true)` L17055 → L16808 | §4.6 — waives strike, restores forfeiture, lifts freeze/termination | `DB.emergencyClaims`, `DB.absenceEvents[].waived`, `DB.drivers[].planFreezeUntilMs`/`.planAccess` | `requirePerm('approve_drivers')` (L16809) | `absence_waived` (L16821) | **Yes** — `guardAction('decideEmergency',…)` L17932–L17948, `irreversible:true`, `ownerWarn` |
| **Reject** (claim row) | `decideEmergency(id,false)` L17054 | Sets `Rejected`; penalty stands | `DB.emergencyClaims` | `requirePerm('approve_drivers')` | none beyond page state | **Yes** — same gate, `danger:true` |
| **Simulate accept** (dispatch row, only when `status==='Offered'`) | `acceptEmergency(d.id)` L17385 → L17315 | §4.7 — money settlement, rider credit, `driverChanges++` | `DB.emergencyDispatches`, rider wallet, goodwill ledger, `DB.contacts`, `DB.subscriptions` | none | `emergency_dispatch_accepted` (L17344) | **Yes** — `GATE_SPECS.acceptEmergency` L18260–L18269 |
| **Simulate decline** (dispatch row) | `declineEmergency(d.id)` L17384 → L17352 | `offerIndex++`, re-offers | `DB.emergencyDispatches` | none | none | **Yes** — `GATE_SPECS.declineEmergency` L18270–L18278 |
| **Register** / **Replace** (coverage row) | `assignBackup(r.subId)` L17550 → L13186 | Opens the backup-picker modal (Coverage module) | — | `requirePerm('manage_subscriptions')` + `requirePagePerm('coverage','assign_backup')` (L13187–L13188) | none | no |
| **Select** (backup-picker modal) | `commitBackup(subId,drvId)` L13218 | `DB.subBackups[subId]=drvId` (alias of `DB.backupRegistry`); re-render; toast `✅ <name> assigned as backup for <subId>` | `DB.subBackups` | none in `commitBackup` itself | `assign_backup` (L13222) | **Yes** — `guardAction('commitBackup',…)` L17981–L17989 |
| **Reinstate on probation** (rehab row, only when eligible) | `reinstateProbationary(id)` L19520 → L19478 | `delete d.planAccess`; `d.planProbationUntilMs=nowMs()+30d`; `d.planProbation=true`; toast `✅ <name> reinstated on probation` | `DB.drivers[id]` | none | `plan_access_restored` (L19483) | **Yes** — `guardAction('reinstateProbationary',…)` L19490–L19498 |
| **Clear filter** (filter chip) | `filterCommit('all')` L16846 | Resets `_commitFilter` | in-memory | none | none | no |
| KPI card (any) | `filterCommit(key,anchor)` L16850 | Filter + smooth-scroll to anchor via `kpiScrollTo` (L14536–L14544) | in-memory | none | none | no |
| **Save policy** (Settings) | `saveCommitPolicy()` L17117 | §7.5 | `DB.commitPolicy` | `requirePerm('manage_settings')` | `edit_commit_policy` | **Yes** — `guardAction('saveCommitPolicy',…)` L18068–L18075, `danger:true` |
| Every id / name in every row | `openProfile(<id>)` | 360° profile | — | none | none | no |

**`commitMenu` action lists** (L16858–L16906) — modal rows, each `closeModal(); <expr>`:

| kind | Actions |
|---|---|
| `leg` (L16860–L16868) | 👤 Open captain record · 🧍 Open rider record · 📄 Open subscription · 📞 Log a call with the captain · 🛟 Register / replace backup (`assignBackup`) · ✓ Mark confirmed (`confirmPlanLeg`) · ↪ Hand to backup (no penalty) (`autoHandoff`) |
| `coverage` (L16869–L16877) | 📄 Open subscription · 👤 Primary captain · 🧍 Rider · 🛟 Backup captain *(only if registered)* · 🔁 Register / replace backup · 📊 Open Coverage & capacity (`go('coverage',null)`) |
| `absence` (L16878–L16884) | 👤 Open captain record · 📄 Open subscription · 📞 Log a call · 🗂 Activity log (`go('audit-log',null)`) · 📄 File emergency claim *(only when `!ev.waived && !ev.emergencyId`)* |
| `driver` (L16885–L16890) | 👤 Open captain record · 📞 Log a call · ⚖️ Captain fairness (`go('fairness',null)`) · 📄 File suspension appeal (`openDriverAppeal`) |
| `dispatch` (L16891–L16896) | 🧍 Rider · 👤 Absent captain · 📄 Subscription · 📞 Log a call with the rider |

---

## 9. Tables & lists

### 9.1 🌙 Nightly confirmation — tomorrow's legs (L16952–L16979)

- **Row source:** `pendShown` — `unconf` / `awaitingAck` / `pend` per filter (L16950–L16951).
- **Order:** `Object.keys(DB.subscriptions)` order, filtered to `/active|expiring/i` (L16576–L16577). No sort control.
- **Header:** `<span class="b b-grey">{pendShown.length}</span>` + `Unconfirmed by 21:00 → backup, no penalty`.
- **Intro band (L16955–L16956):** "The highest-leverage control here. A leg the captain quietly cannot make becomes a managed withdrawal twelve hours early instead of an absence at 07:00 — the rider never feels it, and nobody is penalised for being honest in time."
- **Fields:** captain name (blue, `openProfile`) / `rowLink(subId) · plan · rider <name>`.
- **Right side:** if `p.confirmed` → `ackChip(subId)`; else if `p.autoHandedOff` → `offerChip(subId)` or fallback `<span class="b b-blue">↪ handed off — no penalty</span>`; else → `Hand to backup` + `Mark confirmed` buttons. Plus `Declined`/`Accepted` buttons when an offer is in `offered` state, then `workChip('leg',subId)` and `⋯`.
- **Empty state (L16977–L16978):** filter `unconfirmed` → *"Every leg is confirmed — nothing awaiting."*; otherwise *"No active plan legs scheduled."*

### 9.2 🛟 Backup coverage — registered vs actually eligible (`renderCoverage()` L17515–L17561, into `#coverage-body`)

- **Stat band (L17520–L17524):** `Registered <registeredPct>%` · `Actually eligible <eligiblePct>%` (red when `eligiblePct < registeredPct`, else green) · `Uncovered plans <uncovered>` (red when `>0`).
- **Copy band (L17525–L17531):** "The gap between those first two numbers is the one that matters… A registered backup whose vehicle sits below the plan tier, who is frozen, or who is already committed elsewhere will be skipped at the moment of need." Then, dynamically: `Right now <registeredPct − eligiblePct> percentage points of your coverage is nominal, not real.` (red) or `Registered and eligible currently match.`
- **Row source:** `backupCoverage()` (L17480–L17501) — subscriptions with `/active|expiring/i` status.
- **Row badge (L17536–L17539):** `covered` (green) / `registered but ineligible` (red) / `no backup · <n> nearby` (amber) / `uncovered` (red).
- **Row body:** `rowLink(subId)` · plan · rider link; second line: `Backup: <name> — <why>` or `No standing backup` · `fallback pool <n>` · `nearest <name> <km> km`.
- **Row background:** `var(--red-lt)` when `r.uncovered`.
- **Actions:** `Register` / `Replace` button (`assignBackup`) + `⋯` (`commitMenu('coverage',…)`).
- **Empty state (L17554–L17555):** filter `coverage` → *"Every plan has an eligible backup."*; else *"No active plans."*

`backupCoverage()` row fields (L17484–L17499): `subId, plan, rider, driver, registered, registeredName, eligible, why, fallbackCount, nearestKm, nearestId, uncovered` where
```js
uncovered = !(regOk && regOk.ok) && fallback.length===0
```

### 9.3 🚨 Departure risk (L16981–L16994)

- **Row source:** `departureRisk().filter(r=>r.minsToPickup<=20)` (L16926).
- **Card header background:** `var(--red-lt)` (L16981); badge `b-red` when `risk.length>0`, else `b-grey`.
- **Fields:** captain name (blue) + `rowLink(tripId)`; second line `route · pickup in <n> min · <status> · rider <name>`.
- **Actions:** `Call captain` (`openLogContact`), `Record absence` (`btn sm danger`), `⋯` (`commitMenu('driver',…)`).
- **Empty state:** *"Nobody at risk right now."* (L16993).

### 9.4 🚨 Emergency dispatch (`renderEmergencyDispatch()` L17360–L17407, into `#dispatch-body`)

- **Card badge:** count of dispatches with `status!=='Accepted'` (L17066).
- **Intro band (L17365–L17369):** "Search runs outward from the **rider**, not from the office. Standing backup is offered first at 125%; with no backup the nearest eligible captain is auto-offered the leg at 150% and each decline escalates to the next. **Declining costs a captain nothing** — it is an unplanned offer, and penalising it would empty the pool exactly when it is needed."
- **Row source:** `DB.emergencyDispatches` (all, `unshift`ed → newest first). No filter, no sort.
- **Per-row money strip (L17389–L17395):** Leg / Replacement paid (`+ %`) / Recovered from absentee / Rider compensated / Eyvar net cost.
- **Per-row log** — every `d.log[].msg` line (L17396–L17397).
- **Per-row queue chain** (L17399–L17404, hidden once Accepted): `name (km)` joined with ` → `, current candidate in bold blue.
- **Empty state:** *"No emergency dispatches. One opens automatically the moment an absence is recorded with no eligible standing backup."* (L17406).

### 9.5 👁 What the captain sees before deciding (L17059–L17063)

Renders `exposureLineHTML(Object.keys(DB.drivers)[0])` — **always the first driver in the fixture** — plus: "This exact line renders on the captain's plan card in the driver app, next to the expected earnings. Deterrence buried in terms accepted two months ago changes nothing; deterrence works when it is on screen at the moment the captain is deciding whether to go."

### 9.6 📊 Absence counter `<table class="dt">` (L17000–L17019)

| # | Column | Value |
|---|---|---|
| 1 | Captain | `d.name`, blue, `openProfile(id)` |
| 2 | Strikes | `absenceCount(id)`, bold, red when `>0` |
| 3 | Next tier | `absenceExposure(id).tier.label` |
| 4 | Exposure now | `remainingSAR.toFixed(2)+' SAR'` or `—`, red |
| 5 | Regulator | `<regulatorCount(id)>/<regulatorCancelLimit>`, red when `reg >= limit-1` |
| 6 | Status | `removed from plans` (b-red) / `frozen <fmtAge(planFreezeUntilMs-nowMs())>` (b-amber) / `eligible` (b-green) |
| 7 | *(actions)* | `⋯` → `commitMenu('driver',id,d.name)` |

- **Row source:** `Object.keys(DB.drivers)` — every driver, not only offenders.
- **Row background:** `var(--red-lt)` when `n>0`.
- **Filter:** when `_commitFilter==='absences'`, rows with `n===0` return `''` (L17010).
- **Intro band (L16997–L17000):** "Rolling window, not plan lifetime — otherwise a long plan carries a lighter penalty than a short one for the same behaviour. 30 clean days erase one strike. This counter also feeds the GAT statutory counter (5 post-acceptance cancellations in 30 days), so a captain is never blindsided by a suspension they could not see coming."
- **Empty state:** none — the `<tbody>` simply renders empty.

### 9.7 ⚠ Absence events (L17020–L17039)

- **Row source:** `evShown` = `live` (filter `absences`) or `DB.absenceEvents` (all).
- **Order:** `unshift` → newest first.
- **Badge:** `<span class="b b-red|b-grey">{evShown.length}</span>` — colour keyed on `live.length`, count on `evShown.length`.
- **Status badge per row:** `waived` (b-green) / `decayed` (b-grey) / `<tier.label>` (b-red).
- **Meta:** `rowLink(subId) · date · <forfeited>.toFixed(2) SAR forfeited` + ` · <freezeDays>-day freeze` + ` · plan access removed`.
- **Actions:** `File emergency claim` (when `!waived && !emergencyId`), `workChip('absence',e.id)`, `⋯`.
- **Empty state:** *"No absences recorded."* (L17037).

### 9.8 📄 Emergency claims & appeals (L17040–L17058)

- **Row source:** `claimsShown` = `claims` (filter `claims`) or `DB.emergencyClaims`.
- **Header badge:** `<span class="b b-amber">{claims.length} open</span>` (always the open count).
- **Row:** captain link — `c.kind` — `EMG-####` badge — clock (`⚠ past the 24h promise` red / `<fmtAge(left)> to decide`) or status badge (`Upheld` green / `Rejected` grey).
- **Second line:** `c.doc || 'no evidence attached'` · `c.detail`.
- **Actions:** `workChip('emergency',c.id)`, then `Reject` + `Uphold` when Open, then `⋯` (`commitMenu('driver',…)`).
- **Empty state:** *"No claims filed."* (L17056).

### 9.9 🔄 Return route — removed captains (`rehabCardHTML()` L19499–L19524)

- Returns `''` entirely when `rehabCandidates()` is empty (L19501).
- **Badge:** `<n> eligible`, `b-green` if any eligible else `b-grey`.
- **Intro (L19506):** "90 clean days earn a probationary return. Deterrence without a way back produces withdrawal, not compliance — and captains who come back through probation are among the most reliable, because they know precisely what it cost."
- **Row:** name (blue, `openProfile`) / `<cleanDays> clean days · last absence <fmtAge> ago` or `no recorded absence`.
- **Action:** `Reinstate on probation` button when eligible, else `<span class="b b-grey">{remainingDays} days to go</span>`.

---

## 10. Modals opened

| Modal | Opened by | Content | Commit |
|---|---|---|---|
| **Emergency claim — `<ABS-id>`** | `openEmergencyClaim(absId)` L16768–L16789 | Header line: `<captain> · <subId> · <forfeited> SAR forfeited` + "An upheld claim reverses the forfeiture **and** removes the strike from the rolling counter. Decision due within 24 hours." Fields: `em-kind` select (4 options), `em-doc` text, `em-detail` textarea. | `File claim` → `commitEmergencyClaim(absId)` |
| **Actions** (row `⋯` menu) | `commitMenu(kind,id,extra)` L16858–L16906 | List of `<div onclick="closeModal();<expr>">` rows per kind (see §8) + `Close` in the foot | per-action |
| **Assign backup captain — `<subId>`** | `assignBackup(subId)` L13186–L13217 *(Coverage module — see 10c)* | Up to 6 eligible candidates sorted by distance to the rider | `Select` → `commitBackup` |
| **Confirmation gates** | `guardAction` on `recordAbsence`, `decideEmergency`, `autoHandoff`, `commitBackup`, `promoteBackup`, `saveCommitPolicy`, `reinstateProbationary`; `GATE_SPECS` on `confirmPlanLeg`, `acceptEmergency`, `declineEmergency`, `respondBackupOffer`, `commitEmergencyClaim` | See §8 | per-spec |

Gate copy worth recording verbatim:
- **`recordAbsence`** (L17915–L17923): summary `This is strike <n+1> in the rolling 30-day window — <tier.label>.` Consequences: `<totalAtRisk> SAR of undelivered plan earnings forfeited.` (or `No undelivered earnings remain on this plan to forfeit.`) · `The plan is pulled from this captain.` · `<freezeDays>-day freeze from all plans.` · `Permanent removal from the plan system. Ordinary rides remain available.` · `The strike also feeds the GAT statutory counter.` · `Emergency dispatch opens immediately — the rider is waiting.` · `The captain may file an emergency claim within 7 days, which reverses all of this if upheld.`
- **`decideEmergency` reject** (L17943–L17946): `The penalty stands in full.` · `The captain keeps the strike.` · `**The grounds for refusal must be served to the captain** — a rejection with no reason is how appeal processes lose their legitimacy.`
- **`confirmPlanLeg`** (L18249–L18253): "Recording this locks the leg in and stops it going to a backup. **Only the first option is the captain's own confirmation** — the others record that you are vouching for it." Consequences: `The leg is treated as covered and will not be offered to a backup.` · `If the captain then fails to appear, it counts as an absence with the full penalty.` · `Your name is attached to the attestation.`
- **`saveCommitPolicy`** (L18068–L18075): `New values apply to future events only.` · `Plans already accepted keep the terms they were accepted under.` · `Captains must re-accept if the terms version changes.`

---

## 11. States, severities & badges

| State | Condition | Visual | SLA |
|---|---|---|---|
| Leg — no acknowledgement | `!DB.legAcks[subId]` | `b-grey` `no acknowledgement` (L18149) | — |
| Leg — captain confirmed | `ack.weight==='strong'` (`source==='app'`) | `b-green` `✓ captain confirmed` (L18152–L18155) | — |
| Leg — attested | `ack.weight==='attested'` (`phone`/`whatsapp`) | `b-blue` `✓ attested by <name>` | — |
| Leg — assumed | `ack.weight==='weak'` (`assumed`) | `b-amber` `⚠ assumed — not confirmed` | — |
| Leg — handed off, no offer | `autoHandedOff && !offerState` | `b-blue` `↪ handed off — no penalty` (L16970) | — |
| Offer — awaiting | `o.state==='offered'` | `b-amber` `⏳ offered to <name> — awaiting reply (<time left>)` | **20 min** (`offerWindowMin`) |
| Offer — expired | `nowMs()-o.tsMs > 20 min` | `b-red` `⏱ offer expired — leg uncovered` | breach |
| Offer — accepted / declined | `o.state` | `b-green ✓ … accepted` / `b-red ✕ … declined` | — |
| Absence — live strike | `!waived && !decayed` | `b-red` `<tier.label>`; row background `var(--red-lt)` in the counter table | 30-day rolling window |
| Absence — waived | `e.waived` | `b-green` `waived` | — |
| Absence — decayed | `e.decayed` | `b-grey` `decayed` | 30 clean days |
| Captain — eligible | no freeze, no termination | `b-green` `eligible` (L17009) | — |
| Captain — frozen | `planFreezeUntilMs > nowMs()` | `b-amber` `frozen <fmtAge>` (L17008) | 7 d (tier 1) / 30 d (tier 2) |
| Captain — removed from plans | `planAccess==='terminated'` | `b-red` `removed from plans` (L17007) | 90 clean days to rehab |
| Regulator near limit | `regulatorCount >= 4` | counter cell `var(--red)` + `warn` notification | GAT: suspension at 5 in 30 d |
| Claim — open, within promise | `c.status==='Open' && dueAtMs>nowMs()` | `<fmtAge(left)> to decide`, `var(--muted)` | **24 h** |
| Claim — open, overdue | `dueAtMs - nowMs() < 0` | `⚠ past the 24h promise`, `var(--red)`, bold | breach |
| Claim — Upheld / Rejected | `c.status` | `b-green Upheld` / `b-grey Rejected` (L17049) | — |
| Dispatch — Searching / Offered / Accepted / other | `d.status` | `b-blue` / `b-amber` / `b-green` / `b-red` (L17370) | offer window **45 s** (`dispatchWindowSec`, display-only) |
| Dispatch — standing backup vs nearest search | `d.usedBackup` | `b-blue standing backup` / `b-purple nearest search` (L17376) | — |
| Dispatch — Eyvar net cost | `d.eyvarNet > 0` | `var(--red)` else `var(--ink)` (L17394) | — |
| Coverage — covered / registered-but-ineligible / no backup + nearby / uncovered | see §9.2 | `b-green` / `b-red` / `b-amber` / `b-red` | — |
| Coverage KPI at risk | `cov.eligiblePct < 70` | KPI value `var(--red)` (L16945) | — |
| Rehab — eligible / waiting | `cleanMs >= 90 d` | button vs `b-grey <n> days to go` | 90 d |

---

## 12. Sidebar counter formula — `#sbb-commit`

Markup: `<span class="sb-badge a" id="sbb-commit">0</span>` (L515).

Computed **only** inside `updateContactsBadge()` (L14969–L14973):

```js
var cb=document.getElementById('sbb-commit');
if(cb && typeof pendingConfirmations==='function' && DB.commitPolicy){
  var un = pendingConfirmations().filter(function(x){return !x.confirmed && !x.autoHandedOff;}).length;
  cb.textContent = un; cb.className='sb-badge '+(un?'a':'n');
}
```

- **Value:** count of active/expiring subscriptions with **neither** a confirmation **nor** an auto-handoff recorded — i.e. exactly KPI 1 ("Awaiting confirmation").
- **Class:** `sb-badge a` when `>0`, `sb-badge n` when `0`.
- **Guard:** the `DB.commitPolicy` check exists because `pendingConfirmations` is hoisted and callable before this module's `var` data is assigned (comment L16571–L16572, L14970).
- `renderCommitmentPage()` never updates this badge — it goes stale after confirming a leg from the page until the next `updateContactsBadge()`.

---

## 13. Cross-module links

**Shared state (single source of truth):** `DB.backupRegistry = DB.subBackups` — an **alias, not a copy** (L17197–L17198). Comment L17189–L17196: "Coverage & capacity already owned a backup registry (`DB.subBackups`) before this module existed. Declaring a second one created two contradicting answers to the same question — and worse, the emergency dispatcher read only the new one, so a backup registered on the Coverage page would never have been called during a real failure."

**Shared functions with Coverage & capacity (10c):** `subIsCovered()` (L17472–L17479), `dispatchEligibility()` (L17209), `assignBackup()` (defined in the Coverage module at L13186 and *deliberately* not redefined here — comment L17512–L17514: "A second definition silently overrode the original, so the Coverage page's own assign button had been rewired to write into the wrong registry").

**Out:**
- `go('coverage',null)` from `commitMenu('coverage',…)` (L16876).
- `go('fairness',null)` and `openDriverAppeal(id)` from `commitMenu('driver',…)` (L16888–L16889).
- `go('audit-log',null)` from `commitMenu('absence',…)` (L16882).
- `openLogContact(<id>)` → Contacts module (L16866, L16881, L16889, L16895, L16989).
- `creditRiderWallet()` → rider wallets; `logGoodwill()` → goodwill ledger (L17334–L17337).
- `logContact()` with `SUB_SAME_CAPTAIN_BROKEN` (L16600, L18229) and `CAP_NOSHOW` (L17341) and `DRV_DEDUCTION_DISPUTE` (L16800) → Contacts/CPT.
- `newCase()` / `linkToCase()` / `caseFor()` → case module (L16731–L16734, L17284–L17286).
- `DB.subscriptions[].driverChanges++` → feeds `sameCaptainStats()` (L15697) and the same-captain promise metric.
- `subEconomics()` / `EYVAR_COMMISSION_PCT` are **not** used by this module (it uses its own `paid*0.8`).

**In:**
- Coverage page `commitBackup()` calls `renderCommitmentPage()` when `#coverage-body` exists (L13220).
- Work Inbox emits leg / risk / absence / claim / dispatch items, all routing to `go('commitment',null)` (L19147–L19187).
- `refreshOwnershipSurfaces()` (L19052).
- Driver-list filters read `planAccess` / `planFreezeUntilMs` (L6378–L6379) and fleet counts aggregate `terminated` / `frozen` (L20923–L20932).

---

## 14. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `minsToPickup = 20 - (tripIdDigits % 18)` | L16613 | **Fabricated countdown** — derived from the trip id, not from real ETA data |
| Driver share `paid * 0.8` in `absenceExposure` | L16652 | **Hardcoded 80%** — duplicates but does not reference `EYVAR_COMMISSION_PCT=20` (L3604) |
| Driver share `paid * 0.8` in `commitmentReserve` | L17568 | same |
| `regulatorCount` window `30*86400000` | L16742 | **Hardcoded 30 days**, ignores `counterWindowDays` |
| Probation length `30*86400000` | L19480 | Hardcoded; no setting |
| Preview card uses `Object.keys(DB.drivers)[0]` | L17059 | **Demo** — always the first fixture driver |
| Standing-backup queue entry `{km:0, etaMin:6}` | L17270 | **Hardcoded stub ETA** for the standing backup |
| ETA model `Math.max(2, Math.round(km*2.4))` | L17235 | Hardcoded |
| Distance model `sqrt(dx²+dy²)*0.42` on map-grid coords | L17204–L17207 | Synthetic geometry, returns `99` for missing positions |
| `commitBoot()` — marks the first 2 subscriptions confirmed at `agoMs(400)` | L17143–L17145 | **Demo seed** |
| `commitBoot()` — records one absence (`recordAbsence(driver, sub, 99)`) on the first active plan with undelivered legs | L17146–L17154 | **Demo seed**; comment: "a fully delivered plan has nothing left to forfeit, which is correct but demonstrates nothing" |
| `dispatchBoot()` — registers one eligible backup and opens one dispatch with `delayMin=22` | L17427–L17442 | **Demo seed** |
| `SEED_EPOCH` / `agoMs()` | L14628–L14629 | Demo clock |
| `DB.subscriptions` fixture — 7 rows, 5 non-cancelled | L2686–L2692 | Demo book |
| `DB.drivers` fixture — 5 captains | L2632 ff. | Demo fleet |
| Button labels `Simulate accept` / `Simulate decline` | L17384–L17385 | **Explicitly demo controls** standing in for real captain responses |
| `d.log` messages | L17280–L17283, L17303, L17311, L17328–L17333, L17338, L17355 | Hardcoded English narration |
| `termsVersion:'PLAN-TERMS-v1.0'` | L16561 | Hardcoded |
| Case id prefixes `ABS-`, `EMG-`, `DSP-` | L16688, L16792, L17265 | Hardcoded, `length+1` based |

---

## 15. i18n keys

| Key | English (L515) | Arabic (L7911) |
|---|---|---|
| `nav.commitment` | `Plan commitment` | `التزام الباقات` |

**No other `data-i18n` attributes on this page.** Every heading (`✅ Plan commitment`, `🌙 Nightly confirmation — tomorrow's legs`, `🚨 Departure risk — call now, warm the backup`, `📊 Absence counter — rolling 30 days`, `⚠ Absence events`, `📄 Emergency claims & appeals`, `👁 What the captain sees before deciding`, `🚨 Emergency dispatch — nearest captain to the rider`, `🛟 Backup coverage — registered vs actually eligible`, `🔄 Return route — removed captains`), every KPI label, every settings label, every gate spec, every toast and every audit summary is **hardcoded English**.

---

## 16. Gaps, dead code, UNVERIFIED items

1. **The 21:00 confirmation deadline is never enforced.** `confirmDeadline` appears only in display strings (L16590, L16598, L16936, L16954, L17110). No scheduler auto-hands-off unconfirmed legs at the cut-off; an operator must click.
2. **`_commitFilter==='risk'` does nothing.** KPI 3 sets the filter and scrolls to `#commit-risk-card`, but the risk card always renders the full `risk` array (L16982) — there is no `riskShown` variable.
3. **`awaiting` has no chip label.** `commitFilterChip()`'s label map (L16842–L16843) omits `awaiting`, so the chip shows the raw key.
4. **`saveCommitPolicy` validation is a no-op condition.** `DB.commitPolicy.tiers[1].freezeDays >= DB.commitPolicy.regulatorCancelLimit*0` is always true (`*0`), reducing the guard to `freezeDays > 30` (L17123). Almost certainly a bug.
5. **`tier.forfeitRemaining` is declared on all three tiers but never read.** `recordAbsence` forfeits unconditionally (L16698).
6. **`tier.demoteTier` is display-only.** No code demotes `d.lvl` (referenced at L16671 and L17111 only).
7. **Forfeiture is logged, never posted.** `recordAbsence` writes an audit line (L16700–L16702) but does not debit any wallet, escrow or payout record. Likewise, upholding a claim "restores" money only in the audit summary (L16821).
8. **Probation is written but never enforced.** `planProbation` / `planProbationUntilMs` (L19480–L19481) are read nowhere; a probation-period absence has no special path.
9. **`acceptPlanTerms()` (L17133) is never called**, and `DB.termsAcceptances` (L16566) is never rendered — despite `saveCommitPolicy`'s gate promising "Captains must re-accept if the terms version changes" (L18072).
10. **`reserveState()` (L17570) is never called.**
11. **`riderWaitMin` (10), `riderNoShowPayPct` (50) and `payoutDays` (3) are configurable but read nowhere in this module** — they appear only in the settings form (L17083–L17087). **UNVERIFIED** whether another module consumes them.
12. **`dispatchWindowSec` (45 s) is display-only.** It appears in the offer log line (L17312) and settings, but nothing expires an offer after 45 s; the only real timeout is the 20-minute `offerWindowMin` on *backup* offers (L18163).
13. **`appealWindowDays` (7) is never enforced.** `openEmergencyClaim` has no age check on the absence.
14. **`regulatorCount` ignores `.decayed`** (L16743) while `absenceCount` honours it (L16634) — the two counters diverge by design or by oversight; the source does not say which.
15. **`regulatorCount` hardcodes 30 days** rather than reading `counterWindowDays` (L16742), so changing the window in settings silently desynchronises the two counters.
16. **A rejected emergency claim captures no grounds**, though the gate copy (L17946) and the toast (L16832) both insist grounds must be served.
17. **`ev.reserveForfeited` (L16691) is stored and never displayed.**
18. **`ev.appealId` (L16694) is initialised to `null` and never written** — only `emergencyId` is used.
19. **Dispatch acceptance/decline are labelled "Simulate"** (L17384–L17385) — there is no real captain-response channel.
20. **The absence ladder is not editable from Settings** (read-only render at L17106–L17115) even though every scalar policy value is.
21. **`renderCoverage()` reads `_commitFilter` via `typeof _commitFilter!=='undefined'`** (L17533) — a cross-module coupling from the coverage sub-card back into this page's filter state.
22. **Boot-order fragility is explicit in the source.** `renderCommitmentPage()` guards `coverageStats`/`DB.backupRegistry` (L16931) and `renderEmergencyDispatch` (L17075) because the page is built by an earlier module's boot; `pendingConfirmations()` guards `DB.planConfirmations` (L16581–L16582). The `bootModules()` block carries a "MUST REMAIN THE LAST THING IN THE SCRIPT" warning (L21801–L21805).
23. **UNVERIFIED — `newCase` / `linkToCase` / `caseFor` semantics** (L16731–L16734, L17284–L17286): the case module is outside this group.
24. **UNVERIFIED — `creditRiderWallet` / `logGoodwill` posting behaviour** (L17334–L17337): rider-wallet and goodwill modules are outside this group.
25. **UNVERIFIED — `ownershipWarning('emergency',claimId)`** (L17934): ownership module.

---

## 17. Line-number index

| Item | Lines |
|---|---|
| Sidebar nav item + `#sbb-commit` | L515 |
| Page HTML `#p-commitment` | L1397–L1401 |
| Settings HTML: `#commit-tbody` / `#dispatch-tbody` / `#commit-tiers` | L1816 / L1818 / L1820 |
| `titles.commitment` / `subs.commitment` | L2168 / L2169 |
| `DB.subscriptions` fixture | L2686–L2692 |
| `rowLink()` | L3283 |
| `EYVAR_COMMISSION_PCT` / `subEconomics()` (not used here) | L3604 / L3605–L3618 |
| `go()` routing hook | L8823 |
| `PAGE_PERMISSIONS` (no `commitment` key) | L10564 ff. |
| `kpiScrollTo()` | L14536–L14544 |
| `updateContactsBadge()` — commit badge block | L14969–L14973 |
| Module header comment | L16520–L16538 |
| `DB.commitPolicy` (core) | L16541–L16561 |
| — `tiers` | L16556–L16560 |
| `DB.planConfirmations` / `absenceEvents` / `emergencyClaims` / `termsAcceptances` | L16563–L16566 |
| `pendingConfirmations()` | L16575–L16587 |
| `confirmPlanLeg()` (original) | L16588–L16593 |
| `autoHandoff()` (original) | L16594–L16606 |
| `departureRisk()` | L16607–L16616 |
| `classifyDelay()` | L16620–L16630 |
| `absenceCount()` | L16631–L16636 |
| `nextTier()` | L16637–L16642 |
| `absenceExposure()` | L16644–L16664 |
| `exposureLineHTML()` | L16665–L16677 |
| `recordAbsence()` | L16678–L16740 |
| `regulatorCount()` | L16741–L16747 |
| `applyDecay()` | L16748–L16766 |
| `openEmergencyClaim()` | L16768–L16789 |
| `commitEmergencyClaim()` | L16790–L16807 |
| `decideEmergency()` | L16808–L16833 |
| `_commitFilter` / `filterCommit()` / `commitFilterChip()` / `kpiCard()` | L16834 / L16835–L16839 / L16840–L16847 / L16848–L16857 |
| `commitMenu()` / `menuBtn()` | L16858–L16906 / L16907–L16911 |
| `renderCommitmentPage()` | L16912–L17078 |
| — `applyDecay()` call | L16915 |
| — KPI block | L16935–L16948 |
| — `confirmCard` | L16952–L16979 |
| — `riskCard` | L16981–L16994 |
| — `counterCard` | L16996–L17019 |
| — `evCard` | L17020–L17039 |
| — `claimCard` | L17040–L17058 |
| — `previewCard` | L17059–L17063 |
| — `dispatchCard` | L17064–L17067 |
| — `covCard` | L17068–L17072 |
| — assembly + post-calls | L17073–L17077 |
| `renderCommitSettings()` | L17080–L17116 |
| `saveCommitPolicy()` | L17117–L17132 |
| `acceptPlanTerms()` (unused) | L17133–L17139 |
| `commitBoot()` | L17140–L17155 |
| Emergency-dispatch header comment | L17158–L17180 |
| Dispatch policy extras | L17182–L17187 |
| `DB.backupRegistry` alias | L17197–L17198 |
| `gridDistanceKm()` | L17204–L17208 |
| `dispatchEligibility()` | L17209–L17225 |
| `nearestEligibleDrivers()` | L17226–L17240 |
| `hasBackup()` | L17241–L17246 |
| `riderDelayCompensation()` | L17252–L17257 |
| `emergencyDispatch()` | L17258–L17298 |
| `offerEmergency()` | L17299–L17314 |
| `acceptEmergency()` | L17315–L17351 |
| `declineEmergency()` | L17352–L17359 |
| `renderEmergencyDispatch()` | L17360–L17407 |
| `renderDispatchSettings()` | L17408–L17426 |
| `dispatchBoot()` | L17427–L17442 |
| Coverage + reserve header comment | L17445–L17463 |
| `commitmentReservePct` | L17465 |
| `subIsCovered()` | L17472–L17479 |
| `backupCoverage()` | L17480–L17501 |
| `coverageStats()` | L17502–L17511 |
| `renderCoverage()` | L17515–L17561 |
| `commitmentReserve()` / `reserveState()` / `coverageBoot()` | L17562–L17569 / L17570–L17577 / L17578–L17580 |
| `guardAction()` | L17819–L17840 |
| Gate: `recordAbsence` | L17911–L17930 |
| Gate: `decideEmergency` | L17932–L17948 |
| Gate: `autoHandoff` | L17969–L17980 |
| Gate: `commitBackup` | L17981–L17989 |
| Gate: `promoteBackup` | L17990–L18001 |
| Gate: `saveCommitPolicy` | L18068–L18075 |
| Ack-model header comment | L18104–L18121 |
| `DB.legAcks` / `DB.backupOffers` / `offerWindowMin` | L18123–L18125 |
| `ACK_SOURCE` | L18127–L18138 |
| `legAck()` / `setLegAck()` / `ackChip()` | L18139 / L18140–L18146 / L18147–L18158 |
| `backupOffer()` / `offerState()` / `offerChip()` / `createBackupOffer()` / `respondBackupOffer()` | L18159 / L18160–L18169 / L18170–L18178 / L18179–L18184 / L18185–L18203 |
| `confirmPlanLeg` override | L18204–L18217 |
| `autoHandoff` override | L18218–L18234 |
| `GATE_SPECS.confirmPlanLeg` | L18247–L18259 |
| `GATE_SPECS.acceptEmergency` / `declineEmergency` / `respondBackupOffer` | L18260–L18269 / L18270–L18278 / L18279–L18290 |
| `GATE_SPECS.commitEmergencyClaim` | L18352–L18356 |
| `refreshOwnershipSurfaces()` commitment branch | L19052 |
| Work Inbox commitment items | L19147–L19187 |
| `rehabCandidates()` / `reinstateProbationary()` / rehab gate / `rehabCardHTML()` | L19465–L19477 / L19478–L19489 / L19490–L19498 / L19499–L19524 |
| Boot steps (commitment, dispatch, coverage) | L21816–L21818 |
