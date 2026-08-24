# Module: Contact Drivers & SLA (Call Queue & Console)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `contacts` · **Page div:** `#p-contacts`
> **HTML lines:** L1409–L1414 (bodies: `#contacts-body` L1411, `#queue-metrics` L1412, `#contacts-extra` L1413)
> **Renders:** `renderContactsPage()` L15011–L15056 · `renderQueueMetrics()` L20335–L20367 · `renderContactsExtra()` L16243–L16269
> **Call flow:** `onIncomingCall()` L20193 · `onInboundMessage()` L20197 · `screenPop()` L20204 · `answerCall()` L20244 · `abandonCall()` L20254 · `renderCallBar()` L20265 · `openWrapUp()` L20277 · `commitWrapUp()` L20297 · `callTick()` L20378
> **Other call surfaces:** `priorityCall()` L9149 · `logPriorityCall()` L9161 · `callDriverUrgent()` L8547 · `logDriverCall()` L8559 · `simulateCall()` L20368 · `simulateWhatsApp()` L20373
> **Sidebar badge:** `#sbb-contacts` L534, driven by `updateContactsBadge()` L14959–L14980

---

## 1. Purpose

Two things live on one page, stated in the header (L1410):

> "📊 Contact drivers & SLA — Every contact carries a reason code — this is what riders and drivers actually call about, and whether we kept the promise we made them"

1. **Contact-driver analytics** — CPT (contacts per 1,000 trips) by reason code, with the root-cause owner named per row. The page's own reading instruction (L15043): *"Read this top-down, not left-to-right: the top row is the contact you should be trying to eliminate, and the owner column says whose backlog that fix belongs in. Support volume is a product signal, not a staffing input."*
2. **A call console** — screen-pop, a measured call timer, wrap-up coding, and contact-centre queue metrics.

Design note in the source (L20155–L20170): *"There is no CTI and no WhatsApp Business API in a browser file. The integration points are defined and named — `onIncomingCall()` and `onInboundMessage()` — so an adapter calls them and everything downstream already works. Pretending to dial would be theatre."*

**`DB.commLogs` is NOT used by this page.** See §17 G1.

---

## 2. Entry points & routing

| # | Entry point | Line | Mechanism |
|---|---|---|---|
| 1 | Sidebar item "Contact drivers" | L534 | `<div class="sb-item" onclick="go('contacts',this)">` with `data-i18n="nav.contacts"` and badge `<span class="sb-badge a" id="sbb-contacts">0</span>` |
| 2 | Router branch | L8820 | `if(id==='contacts'){renderContactsPage();renderContactsExtra();renderQueueMetrics();}` — three renders, in that order |
| 3 | Toolbar title | L2168 | `titles.contacts = 'Contact Drivers & SLA'` |
| 4 | Toolbar subtitle | L2169 | `subs.contacts = 'Why people contact us, and whether we kept our promise'` |
| 5 | Live re-render from the SLA sweep | L14955 | `slaSweep()` → `if(document.getElementById('p-contacts')&&…classList.contains('on'))renderContactsPage();` — runs every 15 ticks (15 s) |
| 6 | Re-render after wrap-up | L20315 | `commitWrapUp()` → `renderCallBar(); renderContactsExtra(); refreshInbox();` |
| 7 | Re-render after logging a contact | L16240 | `commitLogContact()` → `renderContactsPage(); renderContactsExtra();` |
| 8 | Re-render after declaring a mass event | L16135 | `commitMassEvent()` → `renderTickets(); renderContactsExtra();` |

**No page-level permission gate** on `go('contacts')`. The gates are on individual commits (§11).

**Call-bar and screen-pop are global, not page-scoped.** `#call-bar` is a `position:fixed` element in the top-bar region (L565), and `screenPop()` opens the shared `#modal-overlay` — so an incoming call pops on **any** page, and the timer bar stays visible everywhere.

---

## 3. Layout map

```
#p-contacts                                              L1409
├── .ph                                                  L1410
│   └── <h1>📊 Contact drivers &amp; SLA</h1>
│       <p>Every contact carries a reason code — …</p>
├── #contacts-body                                       L1411  ← renderContactsPage()  L15011
│   ├── .g4  (4 KPI tiles)                               L15020–L15026
│   ├── .card  "📊 Contact drivers — what riders and
│   │           drivers actually call about"             L15038
│   │   ├── .ch + <button>Export CSV</button>            L15039
│   │   ├── table.dt  (8 columns)                        L15040
│   │   └── footer prose (read top-down…)                L15042
│   └── .card  "⚠ Live SLA exposure"  (red header)       L15044
│       └── one row per breaching, then per at-risk ticket
├── .card  "📞 Call queue & console"                     L1412
│   └── #queue-metrics                                   ← renderQueueMetrics() L20335
│       ├── metric strip (6 figures)                     L20339–L20346
│       ├── explanatory prose                            L20347
│       ├── last 8 call sessions                         L20350
│       ├── 3 simulate buttons                           L20361
│       └── adapter note                                 L20365
└── #contacts-extra                                      L1413  ← renderContactsExtra() L16243
    ├── .card  "📡 Channel mix & mass events"            L16251
    │   ├── .ch + [Log a call / WhatsApp] [Declare mass event]
    │   ├── channel counters + Avg handling              L16254–L16257
    │   └── mass-event rows, or empty prose              L16258
    └── .card  "🗑 PDPL erasure requests"                 L16268
        └── #erasure-body   ← renderErasureQueue()  L16045

GLOBAL (rendered outside the page):
#call-bar   position:fixed; bottom:16px; right:16px; z-index:70   L565  ← renderCallBar() L20265
#modal-overlay  (screen-pop, wrap-up, log-contact, mass-event)
```

---

## 4. Data model & fields

### 4.1 `DB.contacts[]` — the CPT spine. Initialised empty at L14718. Written only by `logContact()` L14918–L14933.

Source comment L14914–L14917: *"One row per customer contact, even when several attach to the same ticket. Ticket count and contact count are different numbers: one outage is 200 contacts and 1 ticket, and conflating them is how a support org ends up measuring the wrong thing."*

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `'CT-'+String(DB.contacts.length+1).padStart(5,'0')` — length-based with `unshift` insertion | L14921 |
| `tsMs` | Number | ms epoch | `o.tsMs || nowMs()` — real clock unless the caller supplies a synthetic age | L14922 |
| `channel` | String enum | — | default `'in_app'`; see §7.2 | L14923 |
| `direction` | String enum | — | `'inbound'` \| `'outbound'`; default `'inbound'` | L14924 |
| `agentId` | String | — | `CURRENT_USER_ID` | L14925 |
| `agentName` | String | — | Actor name from `DB.teamUsers`, else `CURRENT_USER_ID` | L14926 |
| `reasonCode` | String | — | default `'OTHER_UNCODED'` | L14927 |
| `entityId` | String | — | Rider/captain id; default `'—'` | L14928 |
| `entityName` | String | — | default `'—'` | L14929 |
| `linked` | object \| null | — | `{type,id}` — types seen: `'ticket'` (L14851, L15203), `'complaint'` (L15211), `'dispatch'` (L17344) | L14930 |
| `outcome` | String enum | — | `'pending'` \| `'resolved'` \| `'escalated'`; default `'pending'` | L14931 |
| `handledMin` | Number | minutes | **Not written by `logContact`.** Patched onto `DB.contacts[0]` afterwards by `commitWrapUp` (L20313, `Math.round(sess.handledSec/60)`) and by `commitLogContact` (L16238, the raw `lc-mins` value). | L20313, L16238 |

**Cap:** `if(DB.contacts.length>2000)DB.contacts.length=2000;` (L14933) — hard truncation of the oldest rows.

### 4.2 `DB.callSessions[]` — initialised empty at L20175. Two shapes.

**Abandoned session** — written by `abandonCall()` L20256–L20258:

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | String | — | `'CALL-'+String(DB.callSessions.length+1).padStart(4,'0')` |
| `entityId` | String \| null | — | Matched rider/captain, or `null` |
| `channel` | String | — | `'inbound'` or `'whatsapp'` — **the raw `screenPop` channel argument, not a `DB.contacts` channel value**. See §17 G3. |
| `ringAtMs` | Number | ms | When the pop appeared |
| `answerAtMs` | `null` | — | Never answered |
| `endAtMs` | Number | ms | `nowMs()` at hang-up |
| `abandoned` | `true` | — | — |
| `waitSec` | Number | s | `Math.round((nowMs()-ring.tsMs)/1000)` |

**Answered + wrapped session** — built by `answerCall()` L20246–L20250, completed by `commitWrapUp()` L20303–L20308:

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `'CALL-'+…padStart(4,'0')` | L20245 |
| `entityId` | String \| null | — | From the pop | L20246 |
| `channel` | String | — | `channel \|\| 'phone_in'` — the `screenPop` value (`'inbound'` or `'whatsapp'`) is passed straight through | L20246 |
| `externalId` | String \| null | — | The CTI adapter's own call id | L20247 |
| `ringAtMs` | Number | ms | Pop time (or `nowMs()` if no ring record) | L20248 |
| `answerAtMs` | Number | ms | `nowMs()` at answer | L20248 |
| `phone` | String \| null | — | Caller number from the ring | L20249 |
| `endAtMs` | Number | ms | `nowMs()` at wrap-up commit | L20303 |
| `handledSec` | Number | s | `Math.round((endAtMs-answerAtMs)/1000)` | L20303 |
| `waitSec` | Number | s | `Math.round((answerAtMs-ringAtMs)/1000)` | L20304 |
| `reasonCode` | String | — | From the wrap-up picker via `gvRC()` | L20305 |
| `outcome` | String enum | — | `'resolved'` \| `'pending'` \| `'escalated'` | L20305 |
| `note` | String | — | Free text | L20305 |
| `abandoned` | `false` | — | Explicitly set | L20305 |
| `agentName` | String | — | Actor name | L20307 |

**A session only enters `DB.callSessions` when it is abandoned or wrapped up.** A live call lives solely in the module-scoped `_activeCall` (L20176).

### 4.3 `_pendingRing` (module-scoped, L20242) — created by `screenPop()` L20240

| Field | Type | Meaning |
|---|---|---|
| `tsMs` | Number | `nowMs()` at the pop. Comment L20238: *"the answer clock starts at the pop, not at the answer — that gap is the speed-to-answer figure"* |
| `entityId` | String \| null | `hit ? hit.id : null` |
| `phone` | String | Raw caller number |
| `channel` | String | `'inbound'` or `'whatsapp'` |

### 4.4 `_activeCall` (module-scoped, L20176) — the single live-call slot. `null` when idle. Only one call can be active at a time.

### 4.5 `DB.telephony` — L20174

| Field | Type | Unit | Value | Meaning |
|---|---|---|---|---|
| `targetAnswerSec` | Number | seconds | `20` | Service-level threshold |
| `wrapUpSec` | Number | seconds | `60` | **Declared but never read** — see §17 G4 |
| `adapter` | null | — | `null` | Placeholder for a CTI adapter |

### 4.6 `DB.massEvents[]` — initialised empty at L16082. Written by `commitMassEvent()` L16114–L16119.

| Field | Type | Meaning | Line |
|---|---|---|---|
| `id` | String | `'EVT-'+String(DB.massEvents.length+1).padStart(3,'0')` | L16114 |
| `title` | String | `#me-title` value, or `rcLabel(code)` if blank | L16115 |
| `reasonCode` | String | `#me-code` value, default `'APP_CRASH'` | L16115 |
| `windowMin` | Number (minutes) | `#me-win` value parsed base-10, default `60` | L16115 |
| `openedAtMs` | Number | `nowMs()` | L16115 |
| `ticketIds` | String[] | Ids of matched tickets | L16116 |
| `riderIds` | String[] | `t.entity` of each matched ticket (**not de-duplicated at write time**) | L16117 |
| `message` | String | `#me-msg` value | L16118 |
| `status` | String | Hard-coded `'Open'` — never changed anywhere | L16118 |
| `masterTicket` | String \| null | `matched[0].id`, or `null` when nothing matched | L16126 |

### 4.7 Ticket SLA fields consumed by this page (written by `backfillReasonCodes` L15187 / `slaStampNewTicket` L14839 / `slaMarkResponse` L14856)

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `reasonCode` | String | — | Taxonomy key | L15194 |
| `openedAtMs` | Number | ms | Clock origin for both FR and resolution | L15195 |
| `firstResponseAtMs` | Number \| null | ms | Set only by a **human** agent reply — comment L14853–L14855: *"Deliberately NOT called by runAutoReply: a bot acknowledgement is not a first response."* | L15199 |
| `lastUpdateAtMs` | Number \| null | ms | Origin for the recurring-update clock | L15200 |
| `resolvedAtMs` | Number \| null | ms | Closes both clocks | L15201 |
| `pausedMs` | Number | ms | Accumulated pause | L15196 |
| `pausedSinceMs` | Number \| null | ms | Start of the current pause | L15196 |
| `slaBreaches` | String[] | — | Fired breach kinds: `'first_response'`, `'update'`, `'resolution'` | L15196, L14944 |
| `reopenCount` | Number | — | Reset to 0 by the backfill; not read on this page | L15196 |
| `massEvent` | String | — | `EVT-` id when grouped | L16123 |
| `groupedUnder` | String | — | Master ticket id for non-master members | L16124 |

### 4.8 `DB.slaPolicy` — L14650–L14660

| Field | Type | Unit | Value | Line |
|---|---|---|---|---|
| `tiers.T1` | object | — | `{label:'Critical', firstResponseMin:0, resolveMin:240, hours:'24/7', pauseOnCustomer:false}` | L14652 |
| `tiers.T2` | object | — | `{label:'High', firstResponseMin:15, resolveMin:1440, hours:'24/7', pauseOnCustomer:true}` | L14653 |
| `tiers.T3` | object | — | `{label:'Medium', firstResponseMin:60, resolveMin:2880, hours:'24/7', pauseOnCustomer:true}` | L14654 |
| `tiers.T4` | object | — | `{label:'Low', firstResponseMin:240, resolveMin:4320, hours:'business', pauseOnCustomer:true}` | L14655 |
| `atRiskPct` | Number | % | `75` | L14657 |
| `breachEscalateTo` | String | — | `'ops_supervisor'` — **declared, never read** (§17 G5) | L14658 |
| `uncodedCeilingPct` | Number | % | `3` | L14659 |

Documented assumptions (comment L14641–L14649): *"T1–T3 run 24/7, T4 follows business hours (night contacts on a low-priority code shouldn't manufacture breaches). The resolution clock pauses on 'waiting on customer' for T2–T4, never for T1. The first-response clock never pauses."* **`hours` is stored but never used by `slaState`** — see §17 G6.

### 4.9 `DB.commLogs` — L2749–L2762 (seed only)

Keyed by trip id, value = array of `{type,who,time,note}` and, for `type:'call'`, `dur` (`"M:SS"`).

| Trip | Entries | Line |
|---|---|---|
| `TRP-7741` | `{type:'call', who:'Driver → Rider', dur:'0:42', time:'06:58', note:'Confirming pickup location'}`; `{type:'chat', who:'Rider', time:'06:59', note:'"I\'m at the main gate, blue jacket"'}`; `{type:'chat', who:'Driver', time:'07:00', note:'"On my way, 2 minutes"'}` | L2750–L2754 |
| `TRP-9008` | `{type:'call', who:'Rider → Driver', dur:'1:15', time:'08:38', note:'Asking about luggage space'}` | L2755–L2757 |
| `TRP-9003` | `{type:'call', who:'Driver → Rider', dur:'0:08', time:'07:53', note:'No answer'}`; `{type:'chat', who:'System', time:'07:55', note:'Auto-cancelled — rider unreachable'}` | L2758–L2761 |

**Readers:** only the trip 360° profile (`var logs=DB.commLogs[d.id]||[];` L4246). **Writers:** the live-chat simulator (L11727–L11728) and the support-message sender (L11746–L11747). **Nothing on `p-contacts` reads or writes `DB.commLogs`.** It is a per-trip conversation transcript, entirely separate from `DB.contacts`, `DB.callSessions` and the queue metrics.

---

## 5. Formulas — written out exactly

### F1 — CPT statistics (`cptStats`, L14984–L15010)
```js
trips = asList(DB.trips).length || 1;             // ||1 prevents divide-by-zero
byCode = {};

// inbound contacts only — outbound contacts are excluded from CPT entirely
(DB.contacts||[]).forEach(function(c){
  if(c.direction !== 'inbound') return;
  if(!byCode[c.reasonCode]) byCode[c.reasonCode] = {code:c.reasonCode, n:0, breached:0, linked:0};
  byCode[c.reasonCode].n++;
});

// breach + linked counters come from TICKETS, not contacts
(DB.tickets||[]).forEach(function(t){
  if(!t.reasonCode || !byCode[t.reasonCode]) return;
  if((t.slaBreaches||[]).length) byCode[t.reasonCode].breached++;
  byCode[t.reasonCode].linked++;
});

rows = Object.keys(byCode).map(function(k){
  var r = byCode[k], rc = rcById(k) || {};
  r.cpt       = (r.n / trips) * 1000;
  r.label     = rc.labelEn || k;
  r.ref       = rc.ref;
  r.cat       = rc.cat   || 'Other';
  r.owner     = rc.owner || '— unassigned —';
  r.tier      = rc.tier  || 'T3';
  r.breachPct = r.linked ? Math.round(r.breached / r.linked * 100) : 0;
  return r;
}).sort(function(a,b){ return b.n - a.n; });      // descending contact volume

total    = rows.reduce(function(s,r){ return s + r.n; }, 0);
uncoded  = (byCode.OTHER_UNCODED ? byCode.OTHER_UNCODED.n : 0);

return {
  rows:  rows,
  total: total,
  trips: trips,
  cpt:        (total / trips) * 1000,
  uncodedPct: total ? (uncoded / total) * 100 : 0
};
```

### F2 — Per-row share of contacts (L15034)
```js
st.total ? Math.round(r.n / st.total * 100) : 0    // rendered as '<n>%'
```

### F3 — SLA state (`slaState`, L14766–L14790)
```js
if(!obj || !obj.openedAtMs) return null;
tg = rcTargets(obj.reasonCode);                    // L14730

paused     = (obj.pausedMs || 0) + (obj.pausedSinceMs ? nowMs() - obj.pausedSinceMs : 0);
elapsedFr  = (obj.firstResponseAtMs || nowMs()) - obj.openedAtMs;
elapsedRes = (obj.resolvedAtMs      || nowMs()) - obj.openedAtMs - paused;
frMs  = tg.fr  * 60000;
resMs = tg.res * 60000;

updDue = null;
if(tg.upd && !obj.resolvedAtMs){
  last   = obj.lastUpdateAtMs || obj.openedAtMs;
  updDue = tg.upd * 60000 - (nowMs() - last);
}

return {
  tier:         tg.tier,
  frTargetMin:  tg.fr,  resTargetMin: tg.res,  updTargetMin: tg.upd,
  frLeftMs:     frMs  - elapsedFr,
  resLeftMs:    resMs - elapsedRes,
  updLeftMs:    updDue,
  frBreached:  !obj.firstResponseAtMs && frMs > 0 && elapsedFr > frMs,
  frMissed:    !!obj.firstResponseAtMs && frMs > 0 && (obj.firstResponseAtMs - obj.openedAtMs) > frMs,
  resBreached: !obj.resolvedAtMs && elapsedRes > resMs,
  updBreached:  updDue !== null && updDue < 0,
  resPct:       resMs ? (elapsedRes / resMs) * 100 : 0,
  closed:      !!obj.resolvedAtMs,
  paused:      !!obj.pausedSinceMs
};
```
Note the `frMs > 0` guard: a **T1 code with `firstResponseMin:0` can never register `frBreached`** (§17 G7).

### F4 — SLA target resolution (`rcTargets`, L14730–L14739)
```js
rc = rcById(code);
t  = DB.slaPolicy.tiers[(rc && rc.tier) || 'T3'];
return {
  fr:  (rc && rc.fr  != null) ? rc.fr  : t.firstResponseMin,
  res: (rc && rc.res != null) ? rc.res : t.resolveMin,
  upd: (rc && rc.upd != null) ? rc.upd : null,      // NOTE: no tier fallback — null means "no update clock"
  tier:(rc && rc.tier) || 'T3',
  pause: t.pauseOnCustomer
};
```

### F5 — Queue statistics (`queueStats`, L20322–L20334)
```js
s          = DB.callSessions || [];
answered   = s.filter(c => !c.abandoned && c.handledSec != null);
abandoned  = s.filter(c =>  c.abandoned);

aht = answered.length ? answered.reduce((a,c) => a + c.handledSec,      0) / answered.length : 0;
asa = answered.length ? answered.reduce((a,c) => a + (c.waitSec || 0),  0) / answered.length : 0;

withinTarget = answered.filter(c => (c.waitSec || 0) <= DB.telephony.targetAnswerSec).length;

return {
  total:        s.length,
  answered:     answered.length,
  abandoned:    abandoned.length,
  abandonRate:  s.length        ? Math.round(abandoned.length / s.length * 100)      : 0,
  ahtSec:       Math.round(aht),
  asaSec:       Math.round(asa),
  serviceLevel: answered.length ? Math.round(withinTarget / answered.length * 100)   : 100,
  unknownCaller: s.filter(c => !c.entityId).length
};
```
**`asa` is averaged over answered calls only** — abandoned calls' wait time is excluded from ASA but included in `abandonRate`.

### F6 — AHT display split (L20341)
```js
Math.floor(q.ahtSec / 60) + 'm ' + (q.ahtSec % 60) + 's'
```

### F7 — Live call timer (`renderCallBar`, L20269–L20270)
```js
secs = Math.round((nowMs() - _activeCall.answerAtMs) / 1000);
mm   = String(Math.floor(secs / 60)).padStart(2,'0');
ss   = String(secs % 60).padStart(2,'0');
// rendered as mm:ss in a monospace span
```
Recomputed every second by `callTick()` (L20378) from `tickEngine` (L12517), which runs on `setInterval(tickEngine,1000)` (L11968).

### F8 — Wrap-up header duration (`openWrapUp`, L20279–L20282)
```js
secs = Math.round((nowMs() - _activeCall.answerAtMs) / 1000);
// title: 'Wrap up — ' + Math.floor(secs/60) + 'm ' + (secs%60) + 's'
```

### F9 — Handled minutes patched onto the contact (`commitWrapUp`, L20313)
```js
if(DB.contacts[0]) DB.contacts[0].handledMin = Math.round(sess.handledSec / 60);
```
Relies on `logContact` having just `unshift`ed at index 0 — see §16b-equivalent note in §17 G8.

### F10 — Average handling time on the channel strip (`renderContactsExtra`, L16248–L16249)
```js
handled = cs.filter(c => c.handledMin > 0);
aht     = handled.length ? handled.reduce((s,c) => s + c.handledMin, 0) / handled.length : 0;
// displayed: aht ? aht.toFixed(1) + ' min' : '—'
```
A **different AHT from F5** — this one is in whole minutes from `DB.contacts`, F5 is in seconds from `DB.callSessions`. Both are labelled "handling".

### F11 — Sidebar badge (`updateContactsBadge`, L14959–L14980)
```js
open = (DB.tickets||[]).filter(t => !t.resolvedAtMs);

// the SUPPORT badge (#sb-ticket-badge) — open ticket count
tb.textContent = open.length;
tb.className   = 'sb-badge ' + (open.length ? 'a' : 'n');

// the CONTACTS badge (#sbb-contacts)
br = open.filter(t => { var s = slaState(t); return s && (s.frBreached || s.resBreached || s.updBreached); }).length;
ar = open.filter(t => { var s = slaState(t); return s && !s.frBreached && !s.resBreached && s.resPct >= DB.slaPolicy.atRiskPct; }).length;

el.textContent = br || ar || 0;                    // breaching wins; at-risk only when nothing breaches
el.className   = 'sb-badge ' + (br ? 'a' : 'n');   // 'a' (alert) only when something is BREACHING
```
Source comment L14957–L14958: *"Sidebar badge mirrors live SLA exposure — breaching first, at-risk only if nothing is breaching, so the number never understates."*
Note the `ar` filter omits `updBreached` from its exclusion set — an update-breached ticket can therefore be counted in `ar` as well as `br` (§17 G9).

### F12 — SLA breach sweep (`slaSweep`, L14937–L14956)
```js
(DB.tickets||[]).forEach(function(t){
  s = slaState(t);
  if(!s || s.closed || s.paused) return;
  t.slaBreaches = t.slaBreaches || [];

  function fire(kind, msg){
    if(t.slaBreaches.indexOf(kind) >= 0) return;         // fire once per kind, ever
    t.slaBreaches.push(kind);
    /* exact, L14945–L14946 — note the typeof guard, the 'unassigned'
       fallback, and the IIFE that binds t.id into the callback */
    pushOpsNotification('ticket','⚠ SLA breach — '+t.id,
      msg+' · '+rcLabel(t.reasonCode)+' · on-call: '+((typeof onCallName==='function')?onCallName('primary'):'unassigned'),
      (function(tid){return function(){openTicketDetail(tid);};})(t.id));
    logAction('sla_breach','ticket',t.id,'SLA breach ('+kind+') on '+t.id+' — '+rcLabel(t.reasonCode));
  }

  if(s.frBreached)  fire('first_response','No first response within ' + s.frTargetMin + ' min');
  if(s.updBreached) fire('update','Promised update every ' + s.updTargetMin + ' min is overdue');
  if(s.resBreached) fire('resolution','Not resolved within ' + Math.round(s.resTargetMin/60) + 'h');
});
updateContactsBadge();
```
Runs on tick 15, 30, 45… (`if(__tickCount%15===0&&typeof slaSweep==='function')slaSweep();` L12511) — i.e. every 15 seconds.

### F13 — Backfill synthetic ticket ages (`backfillReasonCodes`, L15187–L15206)
```js
ages = [190, 26, 1500, 55, 8];                    // MINUTES — hardcoded demo ages
(DB.tickets||[]).forEach(function(t,i){
  if(t.reasonCode) return;
  t.reasonCode        = guessReasonCode(t.subject + ' ' + (t.thread?.[0]?.msg || ''));
  t.openedAtMs        = agoMs(ages[i % ages.length]);
  t.pausedMs=0; t.pausedSinceMs=null; t.slaBreaches=[]; t.reopenCount=0;
  agentReply          = (t.thread||[]).filter(m => m.role === 'agent' && !m.bot)[0];
  t.firstResponseAtMs = agentReply ? t.openedAtMs + 12*60000 : null;   // exactly 12 minutes
  t.lastUpdateAtMs    = t.firstResponseAtMs;
  t.resolvedAtMs      = (t.status==='Resolved' || t.status==='Closed') ? t.openedAtMs + 40*60000 : null;
  t.category          = rcCategory(t.reasonCode);
  logContact({ tsMs:t.openedAtMs, channel:'phone_in', direction:'inbound',
               reasonCode:t.reasonCode, entityId:t.entity, entityName:t.entityName,
               linked:{type:'ticket',id:t.id},
               outcome: t.resolvedAtMs ? 'resolved' : 'pending' });
});
```
Comment L15188–L15190: *"Synthetic ages, chosen so the seeded queue demonstrates all three states on load: one comfortably inside SLA, one at risk, one already breached. Real data would carry its own timestamps."*

Complaints are backfilled the same way with a fixed `agoMs(360)` (L15209). Refunds get a `reasonCode` only, no contact row (L15213–L15216).

### F14 — Mass-event matching (`massEventAffected` L16083 + `commitMassEvent` L16111)
```js
// window filter
since    = nowMs() - windowMin * 60000;
affected = (DB.tickets||[]).filter(t => t.openedAtMs >= since && !t.resolvedAtMs);
// then, by scenario
matched  = affected.filter(t => t.reasonCode === code);
```
Grouping (L16121–L16126):
```js
matched.forEach(function(t,i){
  t.massEvent = ev.id;
  if(i > 0){ t.groupedUnder = matched[0].id; t.pausedSinceMs = t.pausedSinceMs || nowMs(); }
});
ev.masterTicket = matched.length ? matched[0].id : null;
```
Comment L16120: *"Dedupe: the first ticket stays the master and keeps its clock; the rest are grouped under it so the queue shows one problem, not many. Their clocks stop — chasing 200 identical SLAs is not service."*

Notification count (L16128–L16130):
```js
sent = 0;
ev.riderIds.filter((v,i,a) => v && a.indexOf(v) === i).forEach(function(rid){
  if(DB.riders[rid] && msg){ sendSystemEmail(rid, title, msg, 'broadcast'); sent++; }
});
```

### F15 — Phone normalisation & screen-pop lookup (`normalisePhone` L20178, `findByPhone` L20181–L20191)
```js
normalisePhone(p) = String(p||'').replace(/[^\d]/g,'').slice(-9);   // last 9 digits only

findByPhone(phone){
  n = normalisePhone(phone);
  if(!n) return null;
  hit = null;
  Object.keys(DB.riders).forEach(id => { if(!hit && normalisePhone(DB.riders[id].phone)===n) hit={id, kind:'rider',   rec:DB.riders[id]};  });
  Object.keys(DB.drivers).forEach(id => { if(!hit && normalisePhone(DB.drivers[id].phone)===n) hit={id, kind:'captain', rec:DB.drivers[id]}; });
  return hit;
}
```
Comment L20180–L20181: *"Screen-pop index. Built on demand so runtime-created accounts are findable too."* Riders are searched first, so a shared number always resolves to the rider.

### F16 — Rider-side dedupe on the mass-event card (`renderContactsExtra`, L16263)
```js
e.riderIds.filter(function(v,i,a){ return a.indexOf(v) === i; }).length + ' rider(s) notified'
```

---

## 6. States & transitions

### 6.1 Call state machine

| State | Held in | Entered by | Exited by |
|---|---|---|---|
| **Idle** | `_activeCall === null`, `_pendingRing === null` | initial; after `commitWrapUp` (L20314) or `abandonCall` | `onIncomingCall` / `onInboundMessage` |
| **Ringing (popped)** | `_pendingRing` set (L20240); screen-pop modal open | `screenPop()` L20204 | `answerCall()` → Connected; `abandonCall()` → Abandoned; **`closeModal()` via the `✕` → orphaned (see below)** |
| **Connected** | `_activeCall` set (L20245); `#call-bar` visible; timer running | `answerCall()` L20244 | `openWrapUp()` → Wrap-up |
| **Wrap-up** | `_activeCall` still set; wrap-up modal open; call bar still rendered | `openWrapUp()` L20277 | `commitWrapUp()` → Logged; `Back to call` (`closeModal()`) → Connected |
| **Logged** | Pushed to `DB.callSessions` (L20308); `_activeCall=null` (L20314) | `commitWrapUp()` L20297 | — |
| **Abandoned** | Pushed to `DB.callSessions` with `abandoned:true` (L20256) | `abandonCall()` L20254 | — |

**Orphan transition:** the screen-pop's `✕` button calls `closeModal()` directly (L20231) **without clearing `_pendingRing`**. The ring record survives and will be consumed by the *next* `answerCall` — see §17 G10.

### 6.2 Call-bar states (`renderCallBar`, L20265–L20277)

| # | State | Exact condition | Rendered |
|---|---|---|---|
| CB0 | **Hidden** | `!_activeCall` | `bar.style.display='none'; bar.innerHTML='';` (L20268) |
| CB1 | **Visible — known caller** | `_activeCall && _activeCall.entityId` | `display:flex`; `📞 <nm2(entityId)>` (bold) · `mm:ss` (monospace) · `[360°]` button (`openProfile(entityId)`) · `[End & wrap up]` button (`openWrapUp()`) |
| CB2 | **Visible — unknown caller** | `_activeCall && !_activeCall.entityId` | `display:flex`; `📞 Unknown caller` · `mm:ss` · *(no 360° button)* · `[End & wrap up]` |

Static styling from the markup (L565): `position:fixed; bottom:16px; right:16px; z-index:70; background:var(--blue); color:#fff; border-radius:12px; padding:10px 14px; gap:12px; align-items:center; box-shadow:0 4px 18px rgba(0,0,0,.18); font-size:12px`. The inline `display:none` is what CB0 restores.

### 6.3 Screen-pop states (`screenPop`, L20204–L20241)

| # | State | Condition | Body |
|---|---|---|---|
| SP1 | **Unrecognised number** | `!hit` | Amber panel: `<b>Unrecognised number</b> — <phone>`, `No rider or captain matches it.`, `Ask for a trip ID or the name on the account before giving out any detail; an unmatched number is exactly how account takeovers start.` (L20206–L20209) |
| SP2 | **Matched, with open items** | `hit && inboxItems().filter(i => i.entity===hit.id).length > 0` | Avatar (first letter of name over `var(--blue-lt)`), name + `kind` badge, `<id> · <phone> · ★ <rating>`, then a red panel `<N> open item(s) — likely why they are calling` listing up to 4 as `· <title> (<QUEUE_LABEL[type]>)` (L20221–L20226) |
| SP3 | **Matched, no open items** | `hit && open.length === 0` | Same header; `No open items on this account.` (L20227) |
| SP4 | **+ last-contact line** | `last = (DB.contacts||[]).filter(c => c.entityId===hit.id)[0]` exists | `Last contact <fmtAge(nowMs()-last.tsMs)> ago · <rcLabel(last.reasonCode)>` (L20228) |
| SP5 | **+ WhatsApp preview** | `preview` truthy (only from `onInboundMessage`) | Quoted message in a `var(--bg2)` block: `“<preview>”` (L20229) |

Modal title: `💬 Inbound WhatsApp` when `channel==='whatsapp'`, else `📞 Incoming call` (L20231).
Footer buttons (L20234–L20236): `[Open 360°]` (only when `hit`) → `closeModal(); openProfile(hit.id)`; `[Caller hung up]` → `abandonCall()`; `[Answer]` (primary) → `answerCall(hit?hit.id:'', channel, externalCallId||'')`.

### 6.4 SLA badge states (`slaBadge`, L14791–L14802) — evaluated in this exact order, first match wins

| # | Badge text | Condition |
|---|---|---|
| B0 | `''` (nothing) | `slaState()` returned `null` (no `openedAtMs`) |
| B1 | `closed` — or `closed · FR missed` | `s.closed` (and `s.frMissed`). Class `b-grey`, 9px |
| B2 | `⏸ paused — waiting on customer` | `s.paused`. Colour `var(--ghost)` |
| B3 | `⚠ No first response — <fmtAge(-frLeftMs)> over` | `s.frBreached`. Red, weight 700 |
| B4 | `⚠ Update overdue by <fmtAge(-updLeftMs)>` | `s.updBreached`. Red, 700 |
| B5 | `⚠ SLA breached — <fmtAge(-resLeftMs)> over` | `s.resBreached`. Red, 700 |
| B6 | `⏱ <fmtAge(resLeftMs)> to breach` | `s.resPct >= DB.slaPolicy.atRiskPct` (75). `var(--amber-dk)`, 600 |
| B7 | `↩ respond within <fmtAge(frLeftMs)>` | `!obj.firstResponseAtMs && s.frLeftMs < 1e12` | Blue, 600 |
| B8 | `<fmtAge(resLeftMs)> left` | fallback. `var(--ghost)` |

`fmtAge` (L14630–L14635): `<60m` → `"<n>m"`; `<1440m` → `"<h>h <m>m"`; else `"<d>d <h>h"`.

### 6.5 Ticket SLA transition triggers

| Transition | Trigger | Line |
|---|---|---|
| Clock starts | `slaStampNewTicket()` sets `openedAtMs=nowMs()` (L14843) and clears all other clocks | L14839–L14852 |
| First response recorded | `slaMarkResponse()` — human agent reply only, **never** `runAutoReply` | L14856–L14862 |
| Pause starts | `slaMarkStatus(t,'Waiting on customer')` **and** `rcTargets(t.reasonCode).pause` is true (i.e. tier ≠ T1) | L14868–L14870 |
| Pause ends | any other status while `pausedSinceMs` is set | L14871 |
| Resolution clock stops | `resolvedAtMs` set (via `slaMarkStatus` for Resolved/Closed) | L15201, L14866 |
| Breach fires (once per kind) | `slaSweep()` on the 15-second tick | F12 |
| Clock paused by grouping | `commitMassEvent()` sets `pausedSinceMs` on every non-master matched ticket | L16124 |
| Breaches cleared | Reason-code change — `t.slaBreaches=[]` in `commitChangeReason` (L14907) and `commitBulkReason` (L16201; `gvRC()` at L16194) | L14907, L16201 |

---

## 7. Reason codes / categories — full enumeration

### 7.1 Reason codes

The page's core table is driven entirely by `DB.reasonCodes` (L14667–L14716; last entry L14715) — **40 entries, all `active:true`**. Field meanings (comment L14663–L14666): *"fr/res/upd are minutes; null means 'inherit the tier default'. upd is the recurring-promise clock (lost item = update every 30 min). owner is the team that can make this contact stop existing — the field that turns a metric into somebody's backlog."*

| # | code | §ref | Category | Target | Tier | fr (min) | res (min) | upd (min) | comp (SAR) | Root-cause owner |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `CAP_CANCEL_ADV` | 1.1 | Captain | rider | T2 | 10 | 240 | — | 25 | Supply |
| 2 | `CAP_LATE` | 1.2 | Captain | rider | T3 | 15 | 240 | **15** | 15 | Ops |
| 3 | `CAP_NOSHOW` | 1.3 | Captain | rider | T2 | 10 | 240 | — | 50 | Supply |
| 4 | `CAP_OFFPLATFORM_PAY` | 1.4 | Captain | rider | T2 | 15 | 1440 | — | 0 | Compliance |
| 5 | `CAP_CONDUCT` | 1.5 | Captain | rider | T1 | 0 | 1440 | — | 50 | Supply |
| 6 | `BKG_CANCEL_REQ` | 2.1 | Booking | rider | T4 | — | 1440 | — | 0 | *(none)* |
| 7 | `BKG_WRONG_SLOT` | 2.2 | Booking | rider | T4 | — | 1440 | — | 0 | Product |
| 8 | `BKG_NO_SUPPLY` | 2.3 | Booking | rider | T3 | 60 | 1440 | — | 20 | Supply |
| 9 | `BKG_CAPTAIN_PREF` | 2.4 | Booking | rider | T4 | — | 1440 | — | 0 | Product |
| 10 | `PAY_INCORRECT_CHARGE` | 3.1 | Payment | rider | T2 | 15 | 1440 | — | 0 | Payments |
| 11 | `PAY_DECLINED` | 3.2 | Payment | rider | T3 | 60 | 2880 | — | 0 | Payments |
| 12 | `PAY_REFUND_REQ` | 3.3 | Payment | rider | T2 | 15 | 1440 | — | 0 | Ops |
| 13 | `TRP_ROUTE_DEVIATION` | 4.1 | Trip | rider | T3 | 60 | 2880 | — | 0 | Supply |
| 14 | `TRP_LOST_ITEM` | 4.2 | Trip | rider | T3 | 15 | 2880 | **30** | 0 | Ops |
| 15 | `TRP_GHOST_COMPLETE` | 4.3 | Trip | rider | T1 | 0 | 240 | — | 0 | Supply |
| 16 | `APP_LOGIN` | 5.1 | Technical | rider | T3 | 60 | 2880 | — | 0 | Engineering |
| 17 | `APP_CRASH` | 5.2 | Technical | rider | T3 | 60 | 2880 | — | 0 | Engineering |
| 18 | `TECH_STATE_DESYNC` | — | Technical | rider | T2 | 15 | 240 | — | 20 | Engineering |
| 19 | `APP_PROMO` | 5.3 | Technical | rider | T4 | — | 4320 | — | 0 | Marketing |
| 20 | `SAF_RIDER_UNSAFE` | 6.1 | Safety | rider | T1 | 0 | 60 | — | 100 | Safety |
| 21 | `SAF_ACCIDENT` | 6.2 | Safety | **driver** | T1 | 0 | 60 | — | 100 | Safety |
| 22 | `SAF_THEFT` | 6.3 | Safety | rider | T2 | 15 | 1440 | — | 0 | Compliance |
| 23 | `FBK_COMPLAINT` | 7.1 | Feedback | rider | T3 | 60 | 2880 | — | 25 | Ops |
| 24 | `FBK_ACCOUNT_DELETE` | 7.2 | Feedback | rider | T3 | 60 | 2880 | — | 0 | Product |
| 25 | `FBK_INVOICE` | 7.3 | Feedback | rider | T4 | — | 1440 | — | 0 | Product |
| 26 | `SUB_SAME_CAPTAIN_BROKEN` | — | Subscription | rider | T2 | 15 | 1440 | — | 25 | Supply |
| 27 | `SUB_POSTPONE` | — | Subscription | rider | T4 | — | 1440 | — | 0 | *(none)* |
| 28 | `SUB_FREEZE` | — | Subscription | rider | T4 | — | 1440 | — | 0 | Product |
| 29 | `SUB_RENEWAL` | — | Subscription | rider | T4 | — | 1440 | — | 0 | *(none)* |
| 30 | `DRV_RIDER_NOSHOW` | — | Driver | **driver** | T3 | 60 | 1440 | — | 0 | Ops |
| 31 | `DRV_RIDER_CONDUCT` | — | Driver | **driver** | T2 | 15 | 1440 | — | 0 | Safety |
| 32 | `DRV_VEHICLE_DAMAGE` | — | Driver | **driver** | T3 | 60 | 2880 | — | 0 | Ops |
| 33 | `DRV_PAYOUT_ISSUE` | — | Driver | **driver** | T2 | 15 | 1440 | — | 0 | Payments |
| 34 | `DRV_RATING_DISPUTE` | — | Driver | **driver** | T3 | 60 | 2880 | — | 0 | Ops |
| 35 | `DRV_DEDUCTION_DISPUTE` | — | Driver | **driver** | T2 | 15 | 1440 | — | 0 | Ops |
| 36 | `DRV_SUSPENSION_APPEAL` | — | Driver | **driver** | T2 | 15 | 1440 | — | 0 | Compliance |
| 37 | `DRV_DOC_HELP` | — | Driver | **driver** | T3 | 60 | 2880 | — | 0 | Compliance |
| 38 | `CORP_BILLING` | — | Corporate | **corp** | T3 | 60 | 2880 | — | 0 | Finance |
| 39 | `CORP_EMPLOYEE_MGMT` | — | Corporate | **corp** | T4 | — | 2880 | — | 0 | *(none)* |
| 40 | `OTHER_UNCODED` | — | Other | rider | T3 | 60 | 2880 | — | 0 | Ops |

Every entry also carries `labelAr` (Arabic). The bilingual picker is built by `reasonSelectHTML()` L14755–L14763, whose comment reads: *"Bilingual on purpose: the floor is in Riyadh and the guide is in English — an agent should not have to translate a code in their head."* Its label format is `§<ref>  <labelEn>  —  <labelAr>  ·  <cat>`.

**Categories (`cat`) — the full distinct set, 11 values:** `Captain`, `Booking`, `Payment`, `Trip`, `Technical`, `Safety`, `Feedback`, `Subscription`, `Driver`, `Corporate`, `Other`.

**Targets (`target`) — 3 values:** `rider`, `driver`, `corp`.

**Tiers — 4 values:** `T1` Critical, `T2` High, `T3` Medium, `T4` Low.

**Owners — the full distinct set, 9 named + null:** `Supply`, `Ops`, `Compliance`, `Product`, `Payments`, `Engineering`, `Marketing`, `Safety`, `Finance`, and `null` (rendered as `— unassigned —`, F1).

Runtime codes can be added at L15120: `DB.reasonCodes.push({code:code, ref:null, cat:'Other', target:'rider', tier:'T3', …})`.

### 7.2 Channels (`DB.contacts[].channel`)

Written by `logContact` (default `'in_app'`). The label map is at L16250 (`chLabel`); the log-contact picker is at L16216–L16217 (`opts`).

| value | Label (`chLabel` L16250) | Offered in `openLogContact`? (L16216) | Written programmatically by |
|---|---|---|---|
| `phone_in` | `📞 Inbound call` | ✓ (default) | `backfillReasonCodes` L15202, L15210 |
| `phone_out` | `📞 Outbound call` | ✓ | `commitLogContact` when picked (sets `direction:'outbound'`) |
| `whatsapp` | `💬 WhatsApp` | ✓ | — |
| `in_app` | `📱 In-app` (`📱 In-app chat` in the picker) | ✓ | `slaStampNewTicket` L14849 (default), `slaMarkResponse` L14860, L15516, L16008, L16802 |
| `email` | `✉️ Email` | ✓ | — |
| `system` | `⚙️ System` | ✗ **not offered in the picker** | L5836, L16599, L17343, L18230 |
| `inbound` | *(no label — falls back to the raw key)* | ✗ | **`commitWrapUp` L20310 passes `sess.channel`, which `answerCall` defaulted from `screenPop`'s `'inbound'`** — see §17 G3 |

### 7.3 Contact `direction` — 2 values

| value | Set by | Effect |
|---|---|---|
| `inbound` | default (L14924); `commitLogContact` for any channel ≠ `phone_out` (L16236); `commitWrapUp` for any channel ≠ `phone_out` (L20310) | **Counted in CPT** (F1) |
| `outbound` | `slaMarkResponse` (L14860); `commitLogContact`/`commitWrapUp` when channel is `phone_out`; `logContact` at L17343 | **Excluded from CPT** (F1) |

### 7.4 Contact / call `outcome` — 3 values

| value | Label in the pickers | Offered in |
|---|---|---|
| `resolved` | `Resolved on this call` (wrap-up L20289) / `Resolved on this contact` (log-contact L16222) | both, default |
| `pending` | `Still open — follow-up needed` (wrap-up) / `Still open` (log-contact) | both |
| `escalated` | `Escalated` | both |

### 7.5 SLA breach kinds — 3 values (`t.slaBreaches[]`)

| kind | Fired when | Notification message |
|---|---|---|
| `first_response` | `s.frBreached` | `No first response within <frTargetMin> min` |
| `update` | `s.updBreached` | `Promised update every <updTargetMin> min is overdue` |
| `resolution` | `s.resBreached` | `Not resolved within <Math.round(resTargetMin/60)>h` |

### 7.6 Mass-event window options (`#me-win`, L16101) — 4 values

| value (minutes) | Label |
|---|---|
| `30` | Last 30 minutes |
| `60` | Last hour **(default)** |
| `180` | Last 3 hours |
| `1440` | Last 24 hours |

### 7.7 Driver-response options in `callDriverUrgent` (`#drv-response`, L8556) — 3 values

| value | Label | Effect in `logDriverCall` (L8559–L8571) |
|---|---|---|
| `moving` | `Driver confirmed — now moving` **(default)** | `t.driverStatus='moving'`; toast `✅ Driver confirmed — now en route` |
| `delay` | `Driver will be 10-15 min late` | **No state change at all**; toast `⏳ Delay logged — rider will be notified` |
| `unavailable` | `Driver cannot make it — needs replacement` | `t.driverStatus='unavailable'`, `t.unavailReason='Declined trip after call'`; toast `⚠ Driver unavailable — open reassignment`; then `setTimeout(()=>resolveUnavailable(ustId),400)` |

---

## 8. KPIs & metrics

### 8.1 The `.g4` KPI row (`renderContactsPage`, L15019–L15027)

| # | Label | Value formula | Sub-label | Source | Threshold / colour |
|---|---|---|---|---|---|
| 1 | `Contacts per 1,000 trips` | `st.cpt.toFixed(1)` where `st.cpt = (total/trips)*1000` (F1) | `<st.total> contacts · <st.trips> trips` | `DB.contacts` (inbound only) ÷ `asList(DB.trips).length` | none — always default ink |
| 2 | `Breaching now` | `breaching.length` | `<atRisk.length> more at risk` | `DB.tickets` filtered `status!=='Resolved' && status!=='Closed'`, then `slaState` (L15015–L15017) | `var(--red)` when `> 0`, else `var(--ink)` |
| 3 | `Promise kept` | `resolved.length ? Math.round(kept/resolved.length*100) : 100` + `%`, where `kept = resolved.filter(t => !(t.slaBreaches||[]).length).length` | `of <resolved.length> resolved` | `DB.tickets` filtered `t.resolvedAtMs` (L15018–L15019) | none |
| 4 | `Uncoded` | `st.uncodedPct.toFixed(1)` + `%` (F1) | `ceiling <DB.slaPolicy.uncodedCeilingPct>%` (= `3%`) | `DB.contacts` share coded `OTHER_UNCODED` | `var(--red)` when `st.uncodedPct > 3`, else `var(--ink)` |

Note the **different open-ticket definitions**: KPI 2 uses `status!=='Resolved' && status!=='Closed'` (L15015) while the sidebar badge uses `!t.resolvedAtMs` (L14962). See §17 G11.

### 8.2 Queue metric strip (`renderQueueMetrics`, L20339–L20346)

| # | Label | Value | Source | Threshold / colour |
|---|---|---|---|---|
| 1 | `Calls` | `q.total` = `DB.callSessions.length` | F5 | none |
| 2 | `AHT` | `Math.floor(q.ahtSec/60)+'m '+(q.ahtSec%60)+'s'` | F5, F6 | none |
| 3 | `ASA` | `q.asaSec + 's'` | F5 | none |
| 4 | `Answered in <targetAnswerSec>s` | `q.serviceLevel + '%'` | F5 | `var(--amber-dk)` when `< 80`, else `var(--green)` — **the 80 is hardcoded inline** (L20343) |
| 5 | `Abandoned` | `q.abandonRate + '%'` | F5 | `var(--red)` when `> 5`, else `var(--ink)` — **the 5 is hardcoded inline** (L20344) |
| 6 | `<n> unrecognised caller(s)` | `q.unknownCaller` | F5 | rendered only when `> 0`; `var(--amber-dk)` |

Prose beneath (L20347–L20349): *"Handling and wait times are measured from the console clock, never entered by the agent. Abandonment is the metric that exposes understaffing: an abandoned call is a customer who gave up, and it never appears in ticket counts."*

### 8.3 Channel-mix strip (`renderContactsExtra`, L16254–L16257)

| Metric | Formula | Source |
|---|---|---|
| One counter per observed channel | `byCh[c.channel] = (byCh[c.channel]||0)+1` over **all** `DB.contacts` (both directions) | L16247 |
| `Avg handling` | F10 — `aht.toFixed(1)+' min'` or `'—'` | L16248–L16249 |

### 8.4 PDPL erasure strip (`renderErasureQueue`, L16049–L16052)

| Metric | Formula |
|---|---|
| `Pending` | `DB.erasureRequests.filter(x => x.status==='Pending').length`; `var(--amber-dk)` when `>0` |
| `Executed` | `DB.erasureRequests.filter(x => x.status==='Executed').length` |
| `Statutory window` | `ERASURE_SLA_DAYS` = `30` (L15962) |

---

## 9. Data displayed

### 9.1 Page chrome

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| `<h1>📊 Contact drivers &amp; SLA</h1>` L1410 | hard-coded HTML | String | No `data-i18n` |
| `<p>Every contact carries a reason code — …</p>` L1410 | hard-coded HTML | String | No `data-i18n` |
| `#tb-title` | `titles.contacts` L2168 → `'Contact Drivers & SLA'` | String | L8785 |
| `#tb-sub` | `subs.contacts` L2169 → `'Why people contact us, and whether we kept our promise'` | String | L8786 |
| `<h2>📞 Call queue &amp; console</h2>` L1412 | hard-coded HTML | String | — |
| Sidebar label | i18n `nav.contacts`; AR `'أسباب التواصل'` (L7911); EN literal `Contact drivers` | String | L534 |

### 9.2 KPI tiles — see §8.1.

### 9.3 Contact-drivers table rows (L15028–L15036)

| Column | Cell content | Source | Notes |
|---|---|---|---|
| Reason code | `<strong>§<ref> <label></strong>` + `<div>` with the raw `code` | `rcById(k).ref` / `.labelEn` / key | `§` prefix only when `ref` is non-null |
| Category | `r.cat` | `rcById(k).cat`, fallback `'Other'` | — |
| Tier | `r.tier` | `rcById(k).tier`, fallback `'T3'` | Raw `T1`–`T4`, not the label |
| Contacts | `r.n` | count of inbound `DB.contacts` for that code | `font-weight:500` |
| Per 1,000 trips | `r.cpt.toFixed(1)` | F1 | `var(--blue)`, `font-weight:500` |
| Share | F2 + `%` | — | — |
| Breach rate | `r.breachPct + '%'` | F1 (from **tickets**, not contacts) | `var(--red)` when `>0`, else `var(--muted)` |
| Root-cause owner | `r.owner` | `rcById(k).owner`, fallback `'— unassigned —'` | — |

### 9.4 Live SLA exposure rows (L15046–L15051)

| Element | Source | Notes |
|---|---|---|
| Card header | `⚠ Live SLA exposure` on `var(--red-lt)`; badge `<span class="b b-red"><n> breaching</span>` | L15044 |
| Row title | `t.subject` + `<span class="b b-grey">t.id</span>` | — |
| Row sub | `t.entityName + ' · ' + rcLabel(t.reasonCode)` | `rcLabel` = `(ref?ref+' · ':'')+labelEn` (L14743) |
| Row right | `slaBadge(t)` — §6.4 | — |
| Row click | whole row: `openTicketDetail(t.id)` | L15048 |

### 9.5 Call-session rows (`renderQueueMetrics`, L20351–L20359)

| Element | Source | Notes |
|---|---|---|
| Left | `nm2(c.entityId)`, or `<span style="color:var(--amber-dk)">unrecognised</span>` when `!entityId`; then `<span style="color:var(--ghost)">c.id</span>`; then ` · <rcLabel(c.reasonCode)>` when set | L20353–L20355 |
| Right | abandoned → `abandoned after <waitSec>s` (`var(--red)`); else `<handledSec>s · answered in <waitSec>s` (`var(--muted)`) | L20356–L20358 |
| Slice | `DB.callSessions.slice(0,8)` — newest 8 only, no "show more" | L20351 |
| Empty state | `No calls yet. Use “Simulate an inbound call” to see the screen-pop and the console.` | L20360 |

### 9.6 Channel-mix / mass-event card (L16251–L16266)

| Element | Source | Notes |
|---|---|---|
| Per-channel counter | `chLabel[k]||k` + bold count | Iterates `Object.keys(byCh)` — order is insertion order of first occurrence |
| `Avg handling` | F10 | — |
| Mass-event row title | `e.title` + `<span class="b b-grey">e.id</span>` | — |
| Mass-event row sub | `rcLabel(e.reasonCode) + ' · ' + e.ticketIds.length + ' ticket(s) grouped' + (e.masterTicket ? ' under '+e.masterTicket : '') + ' · ' + <deduped riderIds count> + ' rider(s) notified'` | F16 |
| Empty state | `No mass events declared. Use this when one cause is producing many contacts — the queue should show the problem once, not once per caller.` | L16264 |

### 9.7 Adapter note (L20365–L20366, hardcoded)

> "The dialler itself is not here and cannot be — there is no CTI or WhatsApp Business API in a browser. An adapter calls `onIncomingCall(phone)` or `onInboundMessage(phone,text)` and everything above works unchanged."

---

## 10. Input fields

**The `contacts` page markup itself (L1409–L1414) contains no input elements.** Every field lives in a modal.

### 10.1 `openLogContact()` modal — L16215–L16228

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| `lc-entity` | `text` | `Rider or captain ID` | `entityId` argument, or `''`; placeholder `RDR-1041 / DRV-0101` | **None.** Read as `.trim().toUpperCase()` (L16231). A non-existent id is accepted; `nm2()` echoes the raw id back (L3565). | `contact.entityId`, `contact.entityName` |
| `lc-channel` | custom select `csel-lc-ch` | `Channel` | `'phone_in'` | none | `contact.channel`; `direction` = `'outbound'` iff `phone_out` |
| hidden field `#nt-reason` inside wrapper `csel-lc-reason` (via `reasonSelectHTML('csel-lc-reason','')`) | custom select | `Reason code *` (red asterisk) | none selected | **None** — nothing rejects an unpicked code; `gvRC()` (L14750–L14752) falls back to `'OTHER_UNCODED'`. It **does** read the right element: `reasonSelectHTML` hard-codes the hidden field id as `nt-reason` (L14761) for every picker it builds. See §17 G12. | `contact.reasonCode` |
| `lc-mins` | `number` | `Handling time (minutes)` | `5` | `min="0"`; parsed `parseInt(...,10)` with `'0'` fallback (L16234). No max. | `DB.contacts[0].handledMin` (L16238) → F10 |
| `lc-outcome` | custom select `csel-lc-out` | `Outcome` | `'resolved'` | none | `contact.outcome` |

### 10.2 `openWrapUp()` modal — L20277–L20296

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| hidden field `#nt-reason` inside wrapper `csel-wrap-reason` (via `reasonSelectHTML('csel-wrap-reason','')`) | custom select | `Reason code *` | none selected | **None** — nothing rejects an unpicked code; `gvRC()` falls back to `'OTHER_UNCODED'` (§17 G12) | `sess.reasonCode`, `contact.reasonCode` |
| `wrap-out` | custom select `csel-wrap-out` | `Outcome` | `'resolved'` | none | `sess.outcome`, `contact.outcome` |
| `wrap-note` | `text` | `Note` | empty; placeholder `What was agreed` | none | `sess.note` — **stored on the session but rendered nowhere** (§17 G13) |

### 10.3 `openMassEvent()` modal — L16091–L16106

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| `me-code` | custom select `csel-me-code` | `What happened` | `'APP_CRASH'`; placeholder `Pick the scenario` | none; read fallback `'APP_CRASH'` (L16108) | `ev.reasonCode`; the ticket match filter (F14) |
| `me-win` | custom select `csel-me-win` | `Window` | `'60'`; 4 options (§7.6) | `parseInt(...,10)` with `'60'` fallback (L16109) | `ev.windowMin`; the time filter (F14) |
| `me-title` | `text` | `Title` | empty; placeholder `e.g. Payment gateway timeout` | none; falls back to `rcLabel(code)` (L16110) | `ev.title`; email subject |
| `me-msg` | `textarea rows=3` | `Message to affected riders` | empty; placeholder `What they should know, and what we are doing` | none | `ev.message`; email body. **When blank, no emails are sent at all** (`if(DB.riders[rid] && msg)`, L16130) |

### 10.4 `priorityCall()` modal — L9149–L9160

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| `call-note-ta` | `textarea` (`min-height:44px`, `resize:vertical`) | none — placeholder `Note (optional)…` | empty | none | `logPriorityCall` audit summary and `after.note` (fallback `'—'`) |

### 10.5 `callDriverUrgent()` modal — L8547–L8558

| id | Type | Label | Default | Validation | Drives |
|---|---|---|---|---|---|
| `drv-response` | custom select `csel-drv-response` | `Driver response` | `'moving'`; 3 options (§7.7) | none | `t.driverStatus`, `t.unavailReason`; the follow-up toast; the `resolveUnavailable` chain |

---

## 11. Actions

| # | Label | Where | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|---|
| A1 | `Export CSV` | contacts table header L15039 | `exportContacts()` L15056–L15064 | Builds a CSV of every `DB.contacts` row and calls `downloadCSV('eyvar_contacts.csv', …)`. Columns: `ID, Timestamp, Channel, Direction, Reason code, Reason label, Entity, Agent, Linked`. `Timestamp` is `new Date(c.tsMs).toISOString()`; `Linked` is `type+':'+id` or `''`. | — (read only) | **none** | **none** | no |
| A2 | SLA-exposure row (whole row) | L15048 | `openTicketDetail(t.id)` L8879 | Navigates to the ticket detail page | — | UNVERIFIED (body not read) | — | no |
| A3 | `Simulate an inbound call` | L20361 | `simulateCall(true)` L20368 | Picks a **random** rider (`ids[Math.floor(Math.random()*ids.length)]`) and calls `onIncomingCall(DB.riders[rid].phone)` → screen-pop SP2/SP3 | `_pendingRing` | none | none | no |
| A4 | `Simulate an unknown number` | L20362 | `simulateCall(false)` | `onIncomingCall('+966 50 000 0000')` → screen-pop SP1 | `_pendingRing` | none | none | no |
| A5 | `Simulate a WhatsApp message` | L20363 | `simulateWhatsApp()` L20373 | Random rider; `onInboundMessage(phone, 'السائق ما وصل والحين متأخر على الدوام')` — a **hardcoded Arabic string** ("the driver hasn't arrived and now I'm late for work") | `_pendingRing` | none | none | no |
| A6 | `Open 360°` | screen-pop footer L20234 | `closeModal(); openProfile(hit.id)` | Navigates. **`_pendingRing` is left set** — see §17 G10 | — | none | none | no |
| A7 | `Caller hung up` | screen-pop footer L20235 | `abandonCall()` L20254 | `DB.callSessions.unshift({… abandoned:true, waitSec})`; `closeModal(); renderCallBar(); refreshInbox();`; toast `📵 Caller hung up before answer — recorded as abandoned` (warn). Returns early if `!ring`. | `DB.callSessions` | **none** | **none** | no |
| A8 | `Answer` | screen-pop footer L20236 | `answerCall(entityId, channel, externalCallId)` L20244 | Sets `_activeCall`; `closeModal(); renderCallBar();`; toast `📞 Connected — the timer is running` (ok). **Does not write `DB.callSessions` yet.** | `_activeCall` | **none** | **none** | no |
| A9 | `360°` | call bar L20274 | `openProfile(_activeCall.entityId)` | Navigates while the call bar stays visible | — | none | none | no |
| A10 | `End & wrap up` | call bar L20275 | `openWrapUp()` L20277 | Opens the wrap-up modal. Timer keeps running. | — | none | none | no |
| A11 | `Back to call` | wrap-up footer L20294 | `closeModal()` | Returns to Connected; nothing saved | — | none | none | no |
| A12 | `Save & end` | wrap-up footer L20295 | `commitWrapUp()` L20297 | See A12-detail | `DB.callSessions`, `DB.contacts` (+`handledMin`), `DB.auditLog` | **none** | `logAction('call_wrapped','ticket',sess.id, 'Call <id> · <handledSec>s handled, <waitSec>s to answer · <rcLabel> · <outcome>')` L20314 | **no gate registered** |
| A13 | `Log a call / WhatsApp` | channel-mix card L16253 | `openLogContact('')` L16215 | Opens the log-contact modal | — | none | none | no |
| A14 | `Log contact` | log-contact footer L16227 | `commitLogContact()` L16230 | `logContact({…})`; sets `DB.contacts[0].handledMin`; `logAction('contact_logged','ticket', DB.contacts[0].id, 'Contact logged — <ch> · <rcLabel>')`; `closeModal(); renderContactsPage(); renderContactsExtra();`; toast `✅ Contact logged — <rcLabel>` (ok) | `DB.contacts`, `DB.auditLog` | **none** | ✓ `contact_logged` | **Yes** — `GATE_SPECS.commitLogContact` L18364–L18369: title `Log this contact`, summary `A coded contact will be added to the record.`, consequences `It counts toward contacts-per-trip for that scenario.` / `It appears on the customer's timeline.`, confirmLabel `Log contact` |
| A15 | `Declare mass event` | channel-mix card L16254 | `openMassEvent()` L16091 | Opens the mass-event modal | — | none | none | no |
| A16 | `Declare & group` | mass-event footer L16105 | `commitMassEvent()` L16107 | See A16-detail | `DB.massEvents`, `DB.tickets[*].massEvent/.groupedUnder/.pausedSinceMs`, `DB.emailOutbox`, `DB.auditLog` | **`requirePerm('manage_tickets')`** L16108 | `logAction('mass_event_declared','ticket', ev.id, '<title> — <n> ticket(s) grouped, <sent> rider(s) notified')` L16132 | **Yes** — `guardAction('commitMassEvent',…)` L18045–L18052 |
| A17 | `Reject` / `Execute` | erasure rows L16066–L16067 | `rejectErasure(id)` / `executeErasure(id)` | UNVERIFIED — bodies not read; `Execute` renders without the `p` class when blockers exist but is **not disabled** | `DB.erasureRequests` | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| A18 | `📞 Call` / `Priority call` (13 call sites) | see §15.1 | `priorityCall(name, context, entityId)` L9149 | Opens a **cosmetic** modal: name, context line, a green pulsing `Calling — <HH:MM>` pill, and a note textarea. **Nothing is dialled and no state changes.** | — | **none** | none | no |
| A19 | `✓ Log` | priority-call footer L9158 | `logPriorityCall(name, ctx, entityId)` L9161 | `logAction('priority_call','contact', entityId\|\|name, 'Called <name> (<ctx>)<— note>', null, {contacted, context, note})`; `closeModal()`; toast `✅ Call logged — <name>` (ok). **Writes no `DB.contacts` row — a priority call is invisible to CPT.** | `DB.auditLog` only | **none** | ✓ `priority_call` | no |
| A20 | `✕ End` | priority-call footer L9158 | `closeModal()` | Discards everything, including the typed note | — | none | none | no |
| A21 | `📞 Call now` / `Urgent — driver` / `Nudge driver` | readiness & interventions (L8337, L8396, L13046, L13047) | `callDriverUrgent(driverId, ustId)` L8547 | Opens a modal with the driver name, phone, and a response picker. **No dialling.** | — | **none** | none | no |
| A22 | `Log response` | `callDriverUrgent` footer L8557 | `logDriverCall(ustId, driverId)` L8559 | Mutates `t.driverStatus` per §7.7; `closeModal(); renderReadiness();`; toast; on `unavailable` chains to `resolveUnavailable(ustId)` after 400 ms | `DB.upcomingSubTrips[*]` | **none** | **none** | no |

### A12-detail — `commitWrapUp()` L20297–L20317

1. `if(!_activeCall)return;`
2. `code = gvRC()` — reads `#nt-reason`, which is the hidden field the wrap-up picker itself emits (§17 G12); fallback `'OTHER_UNCODED'` when nothing was picked.
3. `outcome = (#wrap-out).value || 'resolved'`; `note = (#wrap-note).value || ''`.
4. `sess = _activeCall`; `sess.endAtMs = nowMs()`; `handledSec` and `waitSec` computed (F5 inputs); `reasonCode`, `outcome`, `note`, `abandoned=false`, `agentName` set.
5. `DB.callSessions.unshift(sess)`.
6. `logContact({channel: sess.channel, direction: sess.channel==='phone_out'?'outbound':'inbound', reasonCode: code, entityId: sess.entityId||'—', entityName: sess.entityId?nm2(sess.entityId):'Unknown', outcome: outcome})`.
7. `if(DB.contacts[0])DB.contacts[0].handledMin = Math.round(sess.handledSec/60)` (F9).
8. `logAction('call_wrapped',…)`.
9. `_activeCall = null; closeModal(); renderCallBar(); renderContactsExtra(); refreshInbox();`
10. Toast `'✅ '+sess.id+' logged — '+rcLabel(code)` (ok).

### A16-detail — `commitMassEvent()` L16107–L16136

1. `if(!requirePerm('manage_tickets'))return;`
2. Read `me-code` (default `APP_CRASH`), `me-win` (default 60), `me-title` (fallback `rcLabel(code)`), `me-msg`.
3. `affected = massEventAffected(win,'tickets')` (F14); `matched = affected.filter(t => t.reasonCode === code)`.
4. Build and `unshift` the `EVT-` record.
5. Group: master keeps its clock, all others get `groupedUnder` + `pausedSinceMs` (F14).
6. Send one broadcast email per **deduplicated** rider id that exists in `DB.riders` **and only if `msg` is non-empty**; count as `sent`.
7. `logAction('mass_event_declared',…)`.
8. `closeModal(); renderTickets(); renderContactsExtra();` — **`renderContactsPage()` is not called**, so the CPT table is stale until the next 15-second sweep.
9. Toast `'📡 '+ev.id+' declared — '+matched.length+' tickets grouped, '+sent+' riders notified'` (ok).

### Confirmation gate spec for `commitMassEvent` (L18045–L18052)
```
title:        'Declare a mass event'
summary:      'Open tickets in the window matching the chosen scenario will be grouped under one incident.'
consequences: · 'One ticket becomes the master; the rest are grouped and their SLA clocks pause.'
              · 'Affected riders receive the message you wrote.'
              · 'Grouped tickets stop appearing as separate work — make sure the scenario is right.'
confirmLabel: 'Declare and group'
danger:       (not set → false)
irreversible: (not set → false)
```

---

## 12. Tables & lists

### 12.1 Contact-drivers table (L15040)

| Property | Value |
|---|---|
| Columns (ordered) | `Reason code`, `Category`, `Tier`, `Contacts`, `Per 1,000 trips`, `Share`, `Breach rate`, `Root-cause owner` |
| Row source | `cptStats().rows` — one row per **distinct reason code appearing in inbound `DB.contacts`** (codes with zero contacts never appear) |
| Sort | Descending contact count `n` (F1). Not user-changeable. |
| Filters / Search / Pagination | **None** |
| Row click | **None** — rows are inert |
| Row actions | **None** |
| Empty state | `<tr><td colspan="8" style="color:var(--ghost);padding:16px">No coded contacts yet.</td></tr>` (L15041) |
| Export | `Export CSV` in the card header → `exportContacts()` (A1) — exports **`DB.contacts` rows**, not these aggregate rows |

### 12.2 Live SLA exposure list (L15044–L15053)

| Property | Value |
|---|---|
| Row source | `breaching.concat(atRisk)` where both are filtered from `open = DB.tickets.filter(t => t.status!=='Resolved' && t.status!=='Closed')` |
| `breaching` | `slaState(t) && (frBreached \|\| resBreached \|\| updBreached)` |
| `atRisk` | `slaState(t) && !frBreached && !resBreached && resPct >= 75` — note `updBreached` is **not** excluded (§17 G9) |
| Sort | Concatenation order: all breaching first (in `DB.tickets` order), then all at-risk. **No urgency sort** — `slaUrgency()` (L14804) exists but is not used here (§17 G14). |
| Row click | whole row → `openTicketDetail(t.id)` |
| Empty state | `<div style="padding:16px;font-size:11.5px;color:var(--ghost)">Nothing breaching or at risk right now.</div>` (L15052) |
| Header badge | `<span class="b b-red"><breaching.length> breaching</span>` — **counts only breaching, while the list shows breaching + at-risk** |

### 12.3 Recent call sessions (L20351–L20359)

| Property | Value |
|---|---|
| Row source | `DB.callSessions.slice(0,8)` |
| Sort | Insertion order (`unshift`) = newest first |
| Columns | caller/id/reason (left) · duration summary (right) |
| Row click | **None** |
| Empty state | `No calls yet. Use “Simulate an inbound call” to see the screen-pop and the console.` |

### 12.4 Mass-event list (L16258–L16264)

| Property | Value |
|---|---|
| Row source | `DB.massEvents` (all, no cap) |
| Sort | Insertion order (`unshift`) = newest first |
| Row click | **None** — the master ticket id is plain text, not a link |
| Empty state | `No mass events declared. Use this when one cause is producing many contacts — the queue should show the problem once, not once per caller.` |

### 12.5 PDPL erasure queue (`renderErasureQueue`, L16053–L16071)

| Property | Value |
|---|---|
| Row source | `DB.erasureRequests` (all statuses) |
| Row content | `<riderName> <id>` + status/countdown, `Requested by <requestedBy>[· <note>]`, and when Pending a blocker line `⚠ Blocked: <labels joined by ', '>` from `erasureBlockers(riderId)` (L15964) |
| Countdown | `left = q.dueAtMs - nowMs()`; `over = left<0 && status==='Pending'` → `⚠ <fmtAge(-left)> past the statutory deadline` in red, else `<fmtAge(left)> left` |
| Row actions | Pending only: `[Reject]` → `rejectErasure(id)`, `[Execute]` → `executeErasure(id)` (loses the `p` class when blockers exist, but is **not disabled**) |
| Empty state | `No erasure requests. One is logged automatically from any §7.2 ticket, or manually from a rider profile.` |

---

## 13. Modals opened

### 13.1 Screen-pop (`screenPop`, L20204–L20241)
| Element | Content |
|---|---|
| Title | `💬 Inbound WhatsApp` \| `📞 Incoming call` |
| Close | `✕` → `closeModal()` — **leaves `_pendingRing` set** |
| Body | One of SP1–SP5 (§6.3); `max-height:60vh; overflow-y:auto` |
| Footer 1 | `Open 360°` (only when a match) → `closeModal(); openProfile(hit.id)` |
| Footer 2 | `Caller hung up` → `abandonCall()` |
| Footer 3 | `Answer` (primary) → `answerCall(hit?hit.id:'', channel, externalCallId||'')` |
| Side effect | Sets `_pendingRing = {tsMs:nowMs(), entityId, phone, channel}` **after** writing the DOM (L20240) |

### 13.2 Wrap-up (`openWrapUp`, L20277–L20296)
| Element | Content |
|---|---|
| Title | `Wrap up — <Mm> <Ss>` (F8) |
| Prose | `Handling time was measured, not estimated. Code the contact so it counts toward contacts-per-trip for the right scenario — an uncoded call is a call nobody can learn from.` |
| Field 1 | wrapper `csel-wrap-reason`, hidden value field **`#nt-reason`** (there is no `#wrap-reason` element) — `Reason code *`, bilingual reason list |
| Field 2 | `csel-wrap-out` / `#wrap-out` — `Outcome`, 3 options, default `resolved` |
| Field 3 | `#wrap-note` — `Note`, text, placeholder `What was agreed` |
| Footer 1 | `Back to call` → `closeModal()` |
| Footer 2 | `Save & end` (primary) → `commitWrapUp()` |

### 13.3 Log a contact (`openLogContact`, L16215–L16228)
| Element | Content |
|---|---|
| Title | `Log a contact` |
| Field 1 | `#lc-entity` — text, `Rider or captain ID`, value = argument |
| Field 2 | `csel-lc-ch` / `#lc-channel` — `Channel`, 5 options, default `phone_in` |
| Field 3 | wrapper `csel-lc-reason`, hidden value field **`#nt-reason`** (there is no `#lc-reason` element) — `Reason code *` |
| Field 4 | `#lc-mins` — number, `Handling time (minutes)`, default `5`, `min=0` |
| Field 5 | `csel-lc-out` / `#lc-outcome` — `Outcome`, 3 options, default `resolved` |
| Footer 1 | `Cancel` → `closeModal()` |
| Footer 2 | `Log contact` (primary) → `commitLogContact()` |

### 13.4 Declare a mass event (`openMassEvent`, L16091–L16106)
| Element | Content |
|---|---|
| Title | `Declare a mass event` |
| Prose | `One cause, many contacts. Declaring the event groups every open ticket in the window under a single incident so the queue stops showing the same problem hundreds of times — and so the post-mortem has one record to point at.` |
| Field 1 | `csel-me-code` / `#me-code` — `What happened`, active reason codes, default `APP_CRASH` |
| Field 2 | `csel-me-win` / `#me-win` — `Window`, 4 options, default `60` |
| Field 3 | `#me-title` — text, `Title` |
| Field 4 | `#me-msg` — textarea rows=3, `Message to affected riders` |
| Footer 1 | `Cancel` → `closeModal()` |
| Footer 2 | `Declare & group` (primary) → `commitMassEvent()` |

### 13.5 Priority call (`priorityCall`, L9149–L9160)
| Element | Content |
|---|---|
| Title | `📞 Priority call` |
| Body | Blue circular phone icon; `<name>` (14px, 600); `<ctx>[ · <entityId>]` (10px muted); a pill `background:#1E7B34; color:#fff; border-radius:999px` containing a `ping-dot` with `animation:ping-pulse .7s infinite` and the text `Calling — <HH:MM>` where the time is `new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})` **captured once at open** and never updated |
| Field | `#call-note-ta` — textarea, placeholder `Note (optional)…` |
| Footer 1 | `✕ End` (danger) → `closeModal()` |
| Footer 2 | `✓ Log` (primary) → `logPriorityCall(name, ctx, entityId)` |
| Default `ctx` | `context \|\| 'manual'` |

### 13.6 Contact driver — urgent (`callDriverUrgent`, L8547–L8558)
| Element | Content |
|---|---|
| Title | `📞 Contact driver — <driver.name>` |
| Body | Amber circular phone icon; `<driver.name>` (15px, 600); `<driver.phone \|\| '—'>` in `var(--blue)` |
| Field | `csel-drv-response` / `#drv-response` — `Driver response`, 3 options (§7.7), default `moving` |
| Footer 1 | `Cancel` → `closeModal()` |
| Footer 2 | `Log response` (primary) → `logDriverCall(ustId, driverId)` |

### 13.7 Confirmation dialogs
Two commits on this page are wrapped by `guardAction`/`gateAll` and therefore open `confirmAction()` (L17769) first: **A14 `commitLogContact`** (L18364) and **A16 `commitMassEvent`** (L18045). Both declare no `options` fields, so the dialog is title + summary + consequences + Cancel/Confirm.

---

## 14. States & badges

### 14.1 Sidebar badge `#sbb-contacts` (L534)

| Aspect | Value |
|---|---|
| Markup | `<span class="sb-badge a" id="sbb-contacts">0</span>` — initial class is `a`, initial text `0` |
| Value | `br \|\| ar \|\| 0` (F11) — **breaching count; if zero, the at-risk count; if that is also zero, `0`** |
| Class | `'sb-badge ' + (br ? 'a' : 'n')` — **alert styling only when something is actually breaching**, so an at-risk number renders in the neutral style |
| Updated by | `updateContactsBadge()` L14959, called from `slaSweep()` L14953 (every 15 s) and `slaBoot()` L15224 (at boot) |
| Also updated in the same function | `#sb-ticket-badge` (open-ticket count), `#sbb-commit` (unconfirmed plan confirmations), `#sbb-fairness` (open fairness cases) |

### 14.2 Other badges on this page

| Badge | Location | Trigger |
|---|---|---|
| `<n> breaching` (`b b-red`) | Live SLA exposure card header L15044 | Always rendered; value `breaching.length` |
| Ticket id chip (`b b-grey`, 9px) | SLA row L15049; mass-event row L16261 | Always |
| `hit.kind` chip (`b b-grey`, 9px) | screen-pop header L20219 | `'rider'` or `'captain'` from `findByPhone` |
| Erasure status chip | erasure row L16060 | `b-green` when `Executed`, else `b-grey`; only for non-Pending rows |
| SLA badge (B0–B8) | SLA rows | §6.4 |

### 14.3 Toasts emitted by this module

| Text | Type | Line |
|---|---|---|
| `📞 Connected — the timer is running` | ok | L20251 |
| `📵 Caller hung up before answer — recorded as abandoned` | warn | L20261 |
| `✅ <CALL-id> logged — <rcLabel>` | ok | L20316 |
| `✅ Contact logged — <rcLabel>` | ok | L16241 |
| `📡 <EVT-id> declared — <n> tickets grouped, <sent> riders notified` | ok | L16135 |
| `✅ Call logged — <name>` | ok | L9164 |
| `✅ Driver confirmed — now en route` | ok | L8569 (via `msgs.moving`) |
| `⏳ Delay logged — rider will be notified` | ok | L8569 (`msgs.delay`) |
| `⚠ Driver unavailable — open reassignment` | ok | L8569 (`msgs.unavailable`) |
| `🔒 Your role lacks permission: <label>` | err | L3130 (from `requirePerm('manage_tickets')`) |

### 14.4 Notifications pushed

| Trigger | `pushOpsNotification` call | Line |
|---|---|---|
| Any SLA breach kind firing for the first time on a ticket | `('ticket','⚠ SLA breach — <t.id>', '<msg> · <rcLabel> · on-call: <onCallName("primary")>', () => openTicketDetail(t.id))` | L14945–L14947 |

---

## 15. Cross-module links

### 15.1 `priorityCall()` call sites — 13 total

| Line | Context | Arguments passed |
|---|---|---|
| L3376 | Renewal pipeline, health score `< 40` | `(e.rider?e.rider.name:e.sub.rider, 'renewal', e.sub.rider)` |
| L4109 | 360° profile action bar | `(d.name)` — **name only, no context or entity id** |
| L6280 | Ticket detail | `(t.entityName)` |
| L7153 | Driver quick card | `(d.name)` |
| L7155 | Rejected applicant | `(d.name)` |
| L7156 | Pending applicant | `(d.name)` |
| L10364 | Dashboard alerts — expiring subscription | `(nm2(sb.rider))` |
| L11675 | Live trip row — rider | `(rn)` |
| L11676 | Live trip row — driver | `(dn)` |
| L11780 | Live trip modal — rider | `(rn, 'live_trip', id)` |
| L11781 | Live trip modal — driver | `(dn, 'live_trip', id)` |
| L11866 | Cancelled-trip row | `(rn)` |
| L13088 | Readiness row — rider | `(rn)` |

**Only 3 of 13 pass an `entityId`.** The source explicitly documents this as a bug class (L20547–L20551): *"`priorityCall(e.rider.name)` passed a NAME where the function's third parameter wants an entity id, so the call would log against nothing. It never surfaced because no seeded subscription scores below 40 — a latent bug hiding behind demo data."* The audit entry then uses `entityId||name` as the entity (L9163), so most priority calls are logged against a **person's name string**, not an id.

### 15.2 `callDriverUrgent()` call sites — 4

| Line | Context |
|---|---|
| L8337 | `scenarioBannerHTML`, when `sc.primary === 'call_current'` |
| L8396 | Departure-risk row |
| L13046 | Readiness — `driverStatus==='not_started' && minutesUntil<=30` → `📞 Urgent — driver` |
| L13047 | Readiness — `driverStatus==='not_started' && minutesUntil<=90` → `📞 Nudge driver` |

### 15.3 `openLogContact()` call sites — 7

| Line | Context | Entity passed |
|---|---|---|
| L16253 | Channel-mix card button | `''` (blank) |
| L16865 | Renewal menu | `sub.driver` |
| L16882 | Event row | `ev.driverId` |
| L16887 | Generic row | `id` |
| L16895 | Emergency dispatch | `d.riderId` |
| L16990 | Commitment row `Call captain` | `r.driver` |
| L20602 | Renewal menu `📞 Log a call with the rider` | `sub.rider` |

### 15.4 `logContact()` writers outside this module — 11

| Line | Channel | Direction | Reason code |
|---|---|---|---|
| L5836 | `system` | `inbound` | (varies) |
| L14849 | `channel\|\|'in_app'` | `inbound` | `t.reasonCode` — from `slaStampNewTicket()` |
| L14860 | `in_app` | `outbound` | `t.reasonCode` — from `slaMarkResponse()` |
| L15202 | `phone_in` | `inbound` | guessed — ticket backfill |
| L15210 | `phone_in` | `inbound` | guessed — complaint backfill |
| L15516 | `in_app` | `inbound` | (variable) |
| L16008 | `in_app` | `inbound` | `FBK_ACCOUNT_DELETE` |
| L16599 | `system` | `inbound` | `SUB_SAME_CAPTAIN_BROKEN` |
| L16802 | `in_app` | `inbound` | `DRV_DEDUCTION_DISPUTE` |
| L17343 | `system` | `outbound` | `CAP_NOSHOW` |
| L18230 | `system` | `inbound` | (variable) |

### 15.5 Other module boundaries

| Target | Mechanism | Line |
|---|---|---|
| Support Center / ticket detail | `openTicketDetail(id)` from SLA rows and breach notifications | L15048, L14946 |
| 360° Profile | `openProfile(id)` from screen-pop and call bar | L20234, L20274 |
| Work Inbox | `refreshInbox()` after answer-abandon and wrap-up; `inboxItems()` powers the screen-pop "open items" panel | L20259, L20315, L20221 |
| Settings › Reason codes & SLA | `renderReasonCodesTable()` (L15071) and `renderSlaPolicyForm()` edit the same `DB.reasonCodes` / `DB.slaPolicy` this page reads | L8819 |
| Settings › Emails | `sendSystemEmail(rid, title, msg, 'broadcast')` from `commitMassEvent` | L16130 |
| Settings › Activity log | `logAction` from `commitWrapUp`, `commitLogContact`, `commitMassEvent`, `logPriorityCall`, `slaSweep` | L20314, L16239, L16132, L9163, L14948 |
| Trip Readiness | `logDriverCall` mutates `DB.upcomingSubTrips` and calls `renderReadiness()` / `resolveUnavailable()` | L8563–L8571 |
| Captain Fairness | `#p-fairness` sits directly above `#p-contacts` in the markup and shares `renderCaptainEconomics()` (defined immediately after `renderContactsExtra`, L16292) | L1402–L1408, L16292 |
| Trip 360° profile | `DB.commLogs[d.id]` — the **only** reader of `DB.commLogs`; unrelated to this page | L4246 |

---

## 16. Hardcoded / mock / demo values

| # | Value | Line | Note |
|---|---|---|---|
| M1 | `DB.telephony = {targetAnswerSec:20, wrapUpSec:60, adapter:null}` | L20174 | `adapter:null` is the explicit "no CTI" marker |
| M2 | Service-level colour threshold `80` | L20343 | Inline literal, not in `DB.telephony` or `DB.slaPolicy` |
| M3 | Abandon-rate colour threshold `5` | L20344 | Inline literal |
| M4 | `simulateCall(false)` phone `'+966 50 000 0000'` | L20371 | Guaranteed no-match number |
| M5 | `simulateWhatsApp()` message `'السائق ما وصل والحين متأخر على الدوام'` | L20376 | Hardcoded Arabic demo text |
| M6 | Backfill ages `[190, 26, 1500, 55, 8]` minutes | L15191 | Explicitly documented as *"Synthetic ages, chosen so the seeded queue demonstrates all three states on load"* |
| M7 | Backfill first-response offset `12*60000` (12 min) | L15199 | Every backfilled ticket that had a human reply gets exactly 12 min FR |
| M8 | Backfill resolution offset `40*60000` (40 min) | L15201 | Every resolved/closed backfilled ticket |
| M9 | Complaint backfill age `agoMs(360)` (6 h) | L15209 | Fixed for all complaints |
| M10 | `DB.commLogs` seed — 3 trips, 6 entries | L2749–L2762 | Static demo transcripts; never rendered on this page |
| M11 | `DB.contacts = []` at L14718 | L14718 | **All contact data is generated at boot by `backfillReasonCodes`** — there is no seeded contact list |
| M12 | `DB.callSessions = []` | L20175 | No seeded calls — queue metrics read `0 / 0m 0s / 0s / 100% / 0%` on first load (F5 defaults) |
| M13 | `DB.massEvents = []` | L16082 | No seeded mass events |
| M14 | `ERASURE_SLA_DAYS = 30` | L15962 | Statutory window constant |
| M15 | `mass event` default reason code `'APP_CRASH'` | L16098, L16108 | Hardcoded twice |
| M16 | Ticket priority derivation `rcPriority(code)==='Critical'?'High':rcPriority(code)` | L14905, L16186 | A `T1` code becomes ticket priority `High`, never `Critical` — the panel has no `Critical` priority value |
| M17 | Adapter prose block | L20365–L20366 | Explicit statement that the dialler does not exist |
| M18 | All state is in-memory `DB.*`. **No persistence.** | — | Every contact, call session and mass event is lost on reload |

---

## 17. Gaps, dead code, UNVERIFIED items

| # | Item | Evidence |
|---|---|---|
| G1 | **`DB.commLogs` is not part of this module.** Despite being a "communication log", it is keyed by trip id, rendered only on the trip 360° profile (L4246), and written only by the live-chat simulator (L11727) and support-message sender (L11746). It contributes nothing to CPT, queue metrics, or the channel mix. | L2749, L4246, L11727, L11746 |
| G2 | **A `priorityCall` produces no contact row.** `logPriorityCall` writes only to `DB.auditLog` (L9163). Every "📞 Call" button in the panel is therefore invisible to CPT, the channel mix, and AHT. | L9161–L9165 |
| G3 | **The wrap-up writes a channel value that has no label.** `screenPop` is called with `'inbound'` (L20194) or `'whatsapp'` (L20198); `answerCall` stores that as `sess.channel`; `commitWrapUp` passes it to `logContact`. So a wrapped phone call is recorded with `channel:'inbound'`, which is absent from `chLabel` (L16250) and renders as the bare string `inbound` in the channel-mix strip. Only `whatsapp` happens to match. | L20194, L20246, L20310, L16250 |
| G4 | **`DB.telephony.wrapUpSec` is never read.** No after-call-work timer exists. | L20174; no reader found |
| G5 | **`DB.slaPolicy.breachEscalateTo` is never read.** Breach notifications use `onCallName('primary')` instead. | L14658 vs L14946 |
| G6 | **`DB.slaPolicy.tiers[*].hours` is never *acted on*.** It **is** read — for display, at **L15136** in `renderSlaPolicyForm()` (`t.hours==='24/7'?'24/7':'Business hours'`). But `slaState` (F3) contains no calendar term at all, so the documented T4 business-hours assumption (L14644–L14646) is not implemented: declared, displayed, never enforced. *(§4.8 states this correctly; an earlier revision of this row over-claimed “never read”.)* | L14655, **L15136** vs L14766–L14790 |
| G7 | **A T1 code can never register a first-response breach.** `frBreached` requires `frMs > 0`, and `T1.firstResponseMin` is `0` (L14652), as are the explicit `fr:0` values on `CAP_CONDUCT`, `TRP_GHOST_COMPLETE`, `SAF_RIDER_UNSAFE` and `SAF_ACCIDENT`. The strictest tier has the weakest FR enforcement. | L14783 vs L14652 |
| G8 | **`handledMin` is patched by array position, not by id.** Both `commitWrapUp` (L20313) and `commitLogContact` (L16238) write to `DB.contacts[0]`, assuming their own `logContact` just landed there. Any concurrent `logContact` between the two statements attaches the handling time to the wrong contact. | L20313, L16238 |
| G9 | **`atRisk` does not exclude `updBreached`.** The filter is `!s.frBreached && !s.resBreached && s.resPct>=75` (L15017, L14966) — a ticket whose *update* clock has breached but whose resolution clock is past 75% is counted in **both** `breaching` and `atRisk`, so it appears twice in the concatenated SLA-exposure list and is double-counted in the KPI sub-label. | L15016–L15017, L14965–L14966 |
| G10 | **Dismissing the screen-pop with `✕` orphans `_pendingRing`.** `closeModal()` (L20231) does not clear it, and neither does `Open 360°` (L20234). The stale ring is then consumed by the next `answerCall`, producing a falsely inflated `waitSec` on an unrelated call. Only `answerCall` (L20245) and `abandonCall` (L20255) clear it. | L20232, L20234 vs L20245, L20255 |
| G11 | **Two different definitions of "open ticket" coexist.** `renderContactsPage` uses `status!=='Resolved' && status!=='Closed'` (L15015); `updateContactsBadge` uses `!t.resolvedAtMs` (L14962). A ticket whose status text was changed without `slaMarkStatus` running will be counted by one and not the other. | L15015 vs L14962 |
| G12 | **`gvRC()` reads the open picker correctly — but every picker shares one element id, so two pickers must never be mounted together.** `gvRC()` (L14750–L14752) reads `#nt-reason`. `reasonSelectHTML(cselId, selected, onChangeExpr)` (L14755–L14763) **hard-codes** `fieldId='nt-reason'` on its `customSelectHTML` call (**L14761**), and `customSelectHTML` emits the hidden value input as `id=fieldId` (**L5352**). So all eight pickers — new-ticket (L2423, L2546), change-reason (L14894), low-rating (L15314), bulk (L16188), log-contact (L16223), desync (L16448) and wrap-up (L20286) — emit `#nt-reason`, and `gvRC()` therefore reads whichever one is currently in the DOM. The source comment at L14749 says exactly this: *“Reads the reason picker in whichever ticket modal is open.”* Wrap-up and log-contact code **correctly**; `OTHER_UNCODED` appears only when nothing was picked. **The real defect is a hidden-field id collision**: because the id is a constant rather than derived from `cselId`, two `reasonSelectHTML` pickers in the DOM at once would give `getElementById` two candidates and `gvRC()` would silently read the first. Nothing in this build mounts two at once (`#modal-content` holds one modal), so the collision is latent, not live. *(Correction note: earlier revisions of this document asserted the inverse — that `gvRC()` read the wrong element and that every wrap-up was coded `OTHER_UNCODED`. That was false; `13a` had it right. See `docs/02-verification/corrections-applied.md` Part 2 §5.)* |
| G13 | **`sess.note` is stored but never displayed.** `commitWrapUp` saves it (L20305) and it is not rendered in the call-session list (L20351–L20359) nor exported (`exportContacts` exports `DB.contacts`, not sessions). | L20305 |
| G14 | **`slaUrgency()` is defined but unused on this page.** L14804–L14810 provides a "breached first, then closest to breach" sort key; the SLA-exposure list uses raw concatenation instead. | L14804 |
| G15 | **`renderContactsPage()` is not re-run after `commitMassEvent`.** Only `renderTickets()` and `renderContactsExtra()` are called (L16134), so the CPT table and the SLA-exposure list stay stale until the next 15-second `slaSweep`. | L16134 |
| G16 | **`ev.status:'Open'` is write-only.** No code path ever closes or reads a mass event's status. | L16118 |
| G17 | **The mass-event `Execute` path has no reason-code fallback beyond `APP_CRASH`.** If an operator declares an event for a scenario with no matching open tickets, `matched` is empty, `masterTicket` is `null`, `sent` is 0, and a hollow `EVT-` record is still created and logged. | L16111, L16126 |
| G18 | **No `logDriverCall` audit entry.** The function mutates `DB.upcomingSubTrips[*].driverStatus` and `unavailReason` with **no `logAction` call and no permission check** — a trip-state change with no record of who made it. | L8559–L8571 |
| G19 | **`callDriverUrgent` `delay` option is inert.** It changes no state at all yet toasts "Delay logged — rider will be notified"; no notification is sent. | L8563–L8569 |
| G20 | **UNVERIFIED — `openTicketDetail` (L8879), `rejectErasure`, `executeErasure`, `refreshInbox` (L19033), `inboxItems` (L19120), `pushOpsNotification`, `onCallName`, `downloadCSV`, `guessReasonCode`, `agoMs`.** These are called from this module but their bodies were not read; their effects are stated only as far as the call sites establish. |
| G21 | **UNVERIFIED — `QUEUE_LABEL`** (declared L19104 as `{ticket:'Support', dispute:'Disputes', fairness:'Fairness', emergency:'Emergency claim', …}`) — the full map was not read; only the first four keys are confirmed. It is used in screen-pop SP2 (L20225). |
| G22 | **RESOLVED (was UNVERIFIED) — `customSelectHTML` internals** (L5336–L5354). The body has now been read: the hidden value input is emitted at **L5352** as `<input type="hidden" id="'+fieldId+'">`, i.e. under the **fieldId argument**, not derived from `cselId`. Combined with `reasonSelectHTML`'s hard-coded `'nt-reason'` (L14761) this settles G12 — see the corrected G12 row above. `options.length>6` also controls whether a search box is emitted (L5343). |

---

## 18. Line-number index

| Line(s) | What |
|---|---|
| L534 | Sidebar item + `#sbb-contacts` badge |
| L565 | `#call-bar` markup (fixed, `display:none`) |
| L1409–L1414 | `#p-contacts` page markup |
| L1411 | `#contacts-body` |
| L1412 | `#queue-metrics` inside the "📞 Call queue & console" card |
| L1413 | `#contacts-extra` |
| L2168 | `titles.contacts` |
| L2169 | `subs.contacts` |
| L2749–L2762 | `DB.commLogs` seed |
| L3565 | `nm2()` |
| L4246 | The only reader of `DB.commLogs` (trip 360° profile) |
| L7911 | i18n `nav.contacts` → `'أسباب التواصل'` |
| L8337, L8396 | `callDriverUrgent` call sites (banner, departure risk) |
| L8547–L8558 | `callDriverUrgent()` |
| L8559–L8571 | `logDriverCall()` |
| L8820 | Router branch for `contacts` |
| L8879 | `openTicketDetail()` |
| L9149–L9160 | `priorityCall()` |
| L9161–L9165 | `logPriorityCall()` |
| L11727–L11728, L11746–L11747 | `DB.commLogs` writers |
| L11966–L11969 | `startTickEngine()` — `setInterval(tickEngine,1000)` |
| L12508–L12517 | `tickEngine()` throttles; `callTick()` invoked every tick |
| L13046–L13047 | Readiness `callDriverUrgent` buttons |
| L14630–L14635 | `fmtAge()` |
| L14636–L14640 | `asList()` |
| L14650–L14660 | `DB.slaPolicy` |
| L14667–L14716 | `DB.reasonCodes` (40 entries; last entry L14715) |
| L14718 | `DB.contacts = []` |
| L14721–L14754 | `rcById`, `rcTierObj`, `rcTargets`, `rcCompCap`, `rcLabel`, `rcCategory`, `rcPriority`, `gvRC` |
| L14755–L14763 | `reasonSelectHTML()` |
| L14766–L14790 | `slaState()` |
| L14791–L14802 | `slaBadge()` |
| L14804–L14810 | `slaUrgency()` (unused here) |
| L14839–L14852 | `slaStampNewTicket()` |
| L14856–L14862 | `slaMarkResponse()` |
| L14863+ | `slaMarkStatus()` |
| L14899–L14911 | `commitChangeReason()` |
| L14914–L14933 | `logContact()` |
| L14937–L14956 | `slaSweep()` |
| L14957–L14980 | `updateContactsBadge()` |
| L14984–L15010 | `cptStats()` |
| L15011–L15056 | `renderContactsPage()` |
| L15056–L15064 | `exportContacts()` |
| L15071+ | `renderReasonCodesTable()` (Settings) |
| L15120 | Runtime reason-code creation |
| L15187–L15217 | `backfillReasonCodes()` |
| L15221–L15225 | `slaBoot()` |
| L15962 | `ERASURE_SLA_DAYS = 30` |
| L15964–L15977 | `erasureBlockers()` |
| L16045–L16071 | `renderErasureQueue()` |
| L16082–L16090 | `DB.massEvents`, `massEventAffected()` |
| L16091–L16106 | `openMassEvent()` |
| L16107–L16136 | `commitMassEvent()` |
| L16143–L16196 | Bulk ticket actions (`tkSelected`, `bulkStatus`, `bulkAssignMe`, `bulkReason`, `commitBulkReason`) |
| L16215–L16228 | `openLogContact()` |
| L16230–L16242 | `commitLogContact()` |
| L16243–L16269 | `renderContactsExtra()` |
| L16292+ | `captainEconomics()` / `renderCaptainEconomics()` (adjacent module) |
| L18045–L18052 | Gate spec for `commitMassEvent` |
| L18364–L18369 | Gate spec for `commitLogContact` |
| L19104 | `QUEUE_LABEL` |
| L19120 | `inboxItems()` |
| L20153–L20172 | Contact-centre layer header comment |
| L20174–L20176 | `DB.telephony`, `DB.callSessions`, `_activeCall` |
| L20178–L20191 | `normalisePhone()`, `findByPhone()` |
| L20193–L20200 | `onIncomingCall()`, `onInboundMessage()` |
| L20204–L20241 | `screenPop()`, `_pendingRing` |
| L20244–L20252 | `answerCall()` |
| L20254–L20262 | `abandonCall()` |
| L20265–L20277 | `renderCallBar()` |
| L20277–L20296 | `openWrapUp()` |
| L20297–L20317 | `commitWrapUp()` |
| L20322–L20334 | `queueStats()` |
| L20335–L20367 | `renderQueueMetrics()` |
| L20368–L20377 | `simulateCall()`, `simulateWhatsApp()` |
| L20378 | `callTick()` |
| L20547–L20551 | Source note on the `priorityCall` entity-id bug |
