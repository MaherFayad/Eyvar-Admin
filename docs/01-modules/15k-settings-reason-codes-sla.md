# Settings Tab: Reason Codes & SLA

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`div#p-settings`, L1416) | Pane `#stab-reasons` **L1771–1822** | Tab button **L1430** (`data-tab="reasons"`, icon 🏷️, `data-i18n="stab.reasons"`) | Render fns `renderReasonCodesTable()` **L15070–15092**, `renderSlaPolicyForm()` **L15128–15139**, `renderCompPolicyTable()` **L15463–15485** — plus `renderCommitSettings()` **L17080–17115** and `renderDispatchSettings()` **L17408–17423**, which also render into this pane

---

## 1. Purpose

The contact taxonomy every ticket, complaint, refund and call is coded against, the SLA clocks derived from it, the money an agent may give away against it, and — appended to the same pane — the plan-commitment and emergency-dispatch policy.

Panel copy (L1775): *"The taxonomy every ticket, complaint, refund and contact is coded against — seeded from all 24 scenarios in the Call Center Communication Guide, plus 14 codes for events this panel already generates that the guide doesn't cover. **SLA targets live on the code, not on the priority**, because 'High' tells an agent nothing about *when*: the guide's clocks (30-minute lost-item update, 24-hour misconduct follow-up, 48-hour complaint resolution) are properties of the scenario. Blank targets inherit the tier default below."*

The registry actually holds **40** codes — 24 with a guide `ref`, **16** without — so the "plus 14" claim (L1775) and the `'Search 38 reason codes…'` placeholder (L14762) are both stale by two. See §13.

This is the widest Settings pane in the file: **six cards, five independent Save buttons, five distinct audit actions.**

## 2. Layout map

| Card | Lines | Heading | Body | Save button |
|---|---|---|---|---|
| 1 — Header | L1772–1777 | icon 🏷️ "Reason codes & SLA" | long description | — |
| 2 — SLA tiers | L1778–1782 | `⏱ SLA tiers` + `span#sla-tier-note` "Defaults inherited by any code that doesn't override them" | `tbody#sla-tier-tbody` (L1780) | **Save SLA tiers** → `saveSlaPolicy()` (L1781) |
| 3 — Reason code registry | L1783–1797 | `🏷️ Reason code registry` + `span.b.b-blue#rc-count` (initial text `—`) | scroll box `max-height:520px;overflow-y:auto` (L1785) wrapping `tbody#rc-tbody` (L1786); add-code strip L1787–1792; policy prose L1793–1795; `div.settings-meta#meta-reasons` L1796 | **Save changes** → `saveReasonCodes()` (L1784) |
| 4 — Compensation authority | L1798–1806 | `💰 Compensation authority` | `tbody#comp-tbody` (L1800); prose L1801–1803; sub-heading `🧾 Goodwill ledger` (L1804); `div#gw-ledger` (L1805) | **Save limits** → `saveCompPolicy()` (L1799) |
| 5 — On-call roster | L1807–1813 | `📟 On-call roster` + note "replaced by the weekly rota" | static prose + button "Open the on-call rota" → `switchSettingsTab('rota', document.querySelector('[data-tab=rota]'))` (L1811) | — |
| 6 — Plan commitment policy | L1814–1822 | `✅ Plan commitment policy`, then `🚨 Emergency dispatch` (L1817), then `⚠ Absence ladder` (L1819) | `tbody#commit-tbody` (L1816), `tbody#dispatch-tbody` (L1818), `div#commit-tiers` (L1820) | **Save policy** → `saveCommitPolicy()` (L1815) — saves **both** the commit and dispatch tables |

## 3. Settings fields — every field

### 3a. SLA tiers table (`renderSlaPolicyForm()`, L15128–15139) — 4 rows × 4 columns

| Field | Label | Control | Default (T1/T2/T3/T4) | Unit | Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `data-slaf="firstResponseMin"` | column "First response" | `input[type=number] min="0"`, `width:70px`, suffix " min" (L15134) | 0 / 15 / 60 / 240 | minutes | `min="0"`, no max | `parseInt(inp.value,10)||0` (L15147) — blank/NaN → 0 | `DB.slaPolicy.tiers[K].firstResponseMin` | Default first-response clock for any code with `fr:null` (`rcTargets`, L14732) |
| `data-slaf="resolveMin"` | column "Resolution" | `input[type=number] min="0"`, `width:80px`, suffix " min" (L15135) | 240 / 1440 / 2880 / 4320 | minutes | `min="0"` | `parseInt(...)||0` | `DB.slaPolicy.tiers[K].resolveMin` | Default resolution clock (`rcTargets`, L14733) |
| *(hours)* | column "Hours" | **static text**, `font-size:11px;color:var(--muted)` — renders `24/7` or `Business hours` (L15136) | `24/7` ×3, `business` for T4 | — | — | **not editable, not saved** | `DB.slaPolicy.tiers[K].hours` | **Nothing** — see §9 |
| `data-slaf="pauseOnCustomer"` | column "Pause when waiting on customer" | `input[type=checkbox].tog` (L15137) | false / true / true / true | boolean | — | `t[f]=inp.checked` (L15146) | `DB.slaPolicy.tiers[K].pauseOnCustomer` | `slaMarkStatus()` L14868 — pauses the resolution clock while status is "Waiting on customer" |

Non-tier `DB.slaPolicy` scalars (L14657–14659) have **no UI at all**: `atRiskPct:75`, `breachEscalateTo:'ops_supervisor'`, `uncodedCeilingPct:3`.

### 3b. Reason code registry table (`renderReasonCodesTable()`, L15070–15092) — 40 rows × 9 columns

| Field | Column | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| *(code + label)* | "Code" | **static** — `<strong>§ref labelEn</strong>` + `<div>code</div>` (L15076–15077) | — | — | — | not editable | — | — |
| *(Arabic label)* | "Arabic label" | **static**, `direction:rtl;text-align:right`, falls back to `—` (L15078) | — | — | — | not editable | — | display only |
| *(category)* | "Category" | **static** text (L15079) | — | — | — | not editable | — | copied onto tickets via `rcCategory()` |
| `rc-tier-<code>` | "Tier" | `customSelectHTML(...,'sm')` (L15080–15082) | `r.tier` | — | **Exactly 4: `T1 Critical`, `T2 High`, `T3 Medium`, `T4 Low`** | `if(tierEl&&tierEl.value)rc.tier=tierEl.value` (L15099–15100) | `DB.reasonCodes[i].tier` | Determines inherited SLA defaults, `pauseOnCustomer`, and `rcPriority()` (L14745–14748) |
| `data-rcf="fr"` | "First resp. (min)" | `input[type=number] min="0"`, `width:64px` (L15083) | **`tg.fr`** — the *resolved* value from `rcTargets()`, i.e. the tier default is pre-filled when the code has `fr:null` | minutes | `min="0"` | `inp.value===''?null:parseInt(inp.value,10)` (L15105) | `DB.reasonCodes[i].fr` | `rcTargets().fr` → `slaState()` first-response clock |
| `data-rcf="res"` | "Resolve (min)" | `input[type=number] min="0"`, `width:74px` (L15084) | `tg.res` (resolved) | minutes | `min="0"` | same | `DB.reasonCodes[i].res` | `rcTargets().res` → resolution clock |
| `data-rcf="upd"` | "Update every" | `input[type=number] min="0"`, `width:64px`, `placeholder="—"` (L15085) | `r.upd` raw (blank when null — **not** resolved) | minutes | `min="0"` | same; empty → `null` | `DB.reasonCodes[i].upd` | `rcTargets().upd` → recurring-update promise clock in `slaState()` (L14872–14875) |
| `data-rcf="owner"` | "Root-cause owner" | `input[type=text]`, `width:104px`, `placeholder="unassigned"` (L15086) | `r.owner \|\| ''` | — | free text | `inp.value.trim()||null` (L15104) | `DB.reasonCodes[i].owner` | **Live** — the ticket SLA detail chip (L14831) and the Contact-drivers CPT report column (L15001 → L15035); see §9 |
| `data-rcf="active"` | "Active" | `input[type=checkbox].tog` (L15087) | `r.active` | boolean | — | `rc.active=inp.checked` (L15103) | `DB.reasonCodes[i].active` | Filters the code out of every reason picker (L14756, L3970, L16097) and out of the `#rc-count` badge |

Inactive rows render with `style="opacity:.45"` (L15075).

**Not exposed in the UI at all** (present on the record, editable only by editing the source): **`target` and `comp`**. `ref` and `labelEn` *are* rendered (L15076, as `§ref labelEn`), `labelAr` at L15078 and `cat` at L15079 — all read-only, which is what the table three rows above already shows.

### 3c. Add-reason-code strip (L1787–1792)

| id | Label | Control | Default | Validation | Persisted to |
|---|---|---|---|---|---|
| `rc-new-code` (L1789) | "New code" | `input[type=text]`, placeholder `e.g. TRP_AC_NOT_WORKING`, `flex:0 0 190px` | empty | `code.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_')` (L15117); both fields required (L15118); duplicate rejected via `rcById(code)` (L15119) | `DB.reasonCodes[].code` |
| `rc-new-label` (L1790) | "Label (EN)" | `input[type=text]`, placeholder "What the customer is contacting about", `flex:1;min-width:200px` | empty | `label.trim()` non-empty | `DB.reasonCodes[].labelEn` |

New codes are created as `{code, ref:null, cat:'Other', target:'rider', tier:'T3', fr:null, res:null, upd:null, comp:0, owner:null, labelEn, labelAr:'', active:true}` (L15120–15121). **`comp:0` means goodwill is blocked on every newly added code** (see §7.4) — an unadvertised side effect.

### 3d. Compensation authority table (`renderCompPolicyTable()`, L15463–15485) — 5 rows × 4 columns

| Field | Column | Control | Default | Unit | Validation | Persisted to |
|---|---|---|---|---|---|---|
| *(role)* | "Role" | **static** `<strong>` — `default` renders as "Everyone else" (L15470) | — | — | — | key of `DB.compPolicy.roles` |
| `data-compf="perCaseSAR"` | "Max per case" | `input[type=number] min="0"`, `width:86px`, suffix " SAR" (L15471) | see §8c | SAR | `parseFloat(i.value)||0` (L15490) | `DB.compPolicy.roles[R].perCaseSAR` |
| `data-compf="dailySAR"` | "Max per day" | `input[type=number] min="0"`, `width:96px`, suffix " SAR" (L15472) | see §8c | SAR | `parseFloat(i.value)||0` | `DB.compPolicy.roles[R].dailySAR` |
| *(issued)* | "Issued to date" | **static**, `color:var(--muted)`, `"<n> SAR issued"` (L15473) | computed | SAR | — | — |

`DB.compPolicy` scalars **with no UI**: `secondApprovalAboveSAR:200`, `perRiderPer30dSAR:150`, `perRiderPer30dCount:3` (L15387–15389). All three are hardcoded into the prose at L1802 ("A credit above **200 SAR** needs a second approver, and any rider receiving more than **150 SAR** or **3 credits** in 30 days is flagged…") — a duplicated literal that will drift if the object is edited.

### 3e. Plan commitment policy table (`renderCommitSettings()`, L17080–17115) — 14 rows

Built from the `fields` array at L17084–17098 — `[key, label, hint]`:

| # | key | Label | Hint | Control | Default | Unit |
|---|---|---|---|---|---|---|
| 1 | `lateGraceMin` | Lateness grace (min) | "Logged only — never a penalty" | `input[type=number] min="0"`, `width:90px` | **10** | min |
| 2 | `lateAsAbsenceMin` | Treated as absence past (min) | "Lateness and absence are different behaviours" | number | **25** | min |
| 3 | `riderWaitMin` | Captain waits for rider (min) | "Symmetric with the captain's own grace" | number | **10** | min |
| 4 | `riderNoShowPayPct` | Rider no-show pays captain (%) | "Held capacity is still capacity" | number | **50** | % |
| 5 | `payoutDays` | Payout after final leg (days) | — | number | **3** | days |
| 6 | `backupMultiplierPct` | Backup leg multiplier (%) | "Funded from Eyvar commission, never from the absentee" | number | **125** | % |
| 7 | `counterWindowDays` | Absence counter window (days) | "Rolling, not plan lifetime" | number | **30** | days |
| 8 | `decayDays` | Clean days to erase a strike | — | number | **30** | days |
| 9 | `rehabDays` | Clean days before rehabilitation | — | number | **90** | days |
| 10 | `appealWindowDays` | Appeal window (days) | — | number | **7** | days |
| 11 | `appealResponseHours` | Appeal response promise (hours) | — | number | **24** | hours |
| 12 | `regulatorCancelLimit` | GAT cancellation limit (30d) | "Statutory ceiling — internal freeze must stay below it" | number | **5** | cancellations |
| 13 | `commitmentReservePct` | Commitment reserve (% of plan earnings) | "0 = off. Held until the final leg is delivered, forfeited on absence… Changing this changes what every captain is paid and when." | number | **0** (L17465) | % |
| 14 | `confirmDeadline` | Evening confirmation cut-off | "Fixed time, not a rolling 24h window — easier to remember, fairer to apply" | **`input[type=text]`**, `width:90px` (L17106) | **`'21:00'`** | HH:MM |

### 3f. Emergency dispatch table (`renderDispatchSettings()`, L17408–17423) — 6 rows

| # | key | Label | Hint | Default | Unit |
|---|---|---|---|---|---|
| 1 | `emergencyMultiplierPct` | Emergency replacement pay (% of leg) | "Short-notice premium, above the standing backup rate" | **150** (L17182) | % |
| 2 | `dispatchWindowSec` | Acceptance window (seconds) | "Then it escalates to the next nearest" | **45** (L17183) | s |
| 3 | `dispatchMaxCandidates` | Captains to try | "Before escalating to manual sourcing" | **5** (L17184) | captains |
| 4 | `riderCompPctPer10Min` | Rider compensation per 10 min delay (%) | "Scaled to the delay actually suffered" | **20** (L17185) | % |
| 5 | `riderCompCapPct` | Compensation cap (% of leg) | — | **100** (L17186) | % |
| 6 | `riderCompMinSAR` | Minimum compensation (SAR) | "A short delay is still a delay" | **10** (L17187) | SAR |

All six are `input[type=number] min="0"` with `data-cf="<key>"` and `width:90px` (L17420–17422). They are saved by `saveCommitPolicy()`, whose selector spans both tbodies (L17119).

### 3g. Absence ladder (`#commit-tiers`, L1820; rendered L17108–17115)

**Read-only prose**, not fields. Each tier renders as `<b>label</b> — plan pulled, <b>remaining plan earnings forfeited</b>[, N-day freeze from plans][, tier demotion][, <b style="color:var(--red)">permanent removal from the plan system</b> (ordinary rides remain)]`, followed by the fixed disclaimer at L17114 about forfeiture-vs-fine and legal wording.

## 4. Tables & lists

| Table | tbody | Columns in order | Row source | Row actions | Empty state |
|---|---|---|---|---|---|
| SLA tiers | `#sla-tier-tbody` L1780 | Tier · First response · Resolution · Hours · Pause when waiting on customer | `['T1','T2','T3','T4'].map(...)` (L15131) — **hardcoded key list**, not `Object.keys` | none | n/a (always 4 rows) |
| Reason code registry | `#rc-tbody` L1786 | Code · Arabic label · Category · Tier · First resp. (min) · Resolve (min) · Update every · Root-cause owner · Active | `(DB.reasonCodes||[]).map(...)` (L15073) — array order, no sort, no filter | none (no per-row delete — by policy, L1794) | **none** |
| Compensation authority | `#comp-tbody` L1800 | Role · Max per case · Max per day · Issued to date | `Object.keys(DB.compPolicy.roles).map(...)` (L15466) | none | n/a |
| Goodwill ledger | `#gw-ledger` L1805 | *(not a table)* — flex rows: `riderName · rcLabel` / `agentName · date` on the left, `−<amount> SAR` in red on the right (L15479–15482) | `DB.goodwillLedger.slice(0,12)` — **newest 12 only** (`logGoodwill` uses `unshift`, L15438) | none | **yes** (L15483): "No goodwill issued yet this session. Every credit will appear here, coded to a scenario — which is what makes 'what did captain no-shows cost us this month' answerable." |
| Plan commitment policy | `#commit-tbody` L1816 | Setting · Value | `fields` literal array (L17084–17098) + one appended text row (L17105–17106) | none | n/a |
| Emergency dispatch | `#dispatch-tbody` L1818 | Setting · Value | `f` literal array (L17413–17418) | none | n/a |
| Absence ladder | `#commit-tiers` L1820 | *(prose divs)* | `DB.commitPolicy.tiers` (L17109) | none | n/a |

**Add flow** exists only for reason codes (§3c). **Delete flow exists nowhere on this tab** — deliberately: L1794 states *"Codes are never deleted or renamed — deactivate and add a successor, because historical records point at them."*

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Save SLA tiers** (L1781) | `saveSlaPolicy()` L15140–15152 | Walks `#sla-tier-tbody tr[data-tier]`; per row writes `firstResponseMin`, `resolveMin` (`parseInt||0`) and `pauseOnCustomer` (checked); re-renders the form **and `renderTickets()`** (L15151); toast `✅ SLA policy saved` | `DB.slaPolicy.tiers[*]` | `requirePerm('manage_settings')` L15141 | `logAction('edit_sla_policy','settings','sla-policy','SLA tier targets updated')` L15150 — **no before/after payload** | **Yes** — `GATE_SPECS.saveSlaPolicy` (L18326–18331): title "Save SLA tiers", `danger:true`, summary "Every code that does not override these inherits them.", consequences `['Open tickets are re-evaluated immediately.','Tightening a target can put tickets straight into breach.']`, button "Save tiers" |
| **Save changes** (reason codes, L1784) | `saveReasonCodes()` L15093–15112 | Deep-clones as `before`; walks `#rc-tbody tr[data-rc]`; reads `#rc-tier-<code>` then every `[data-rcf]`; re-renders; toast `✅ Reason codes and SLA targets saved` | `DB.reasonCodes[*].tier\|fr\|res\|upd\|owner\|active` | `requirePerm('manage_settings')` L15094 | `logAction('edit_reason_codes','settings','reason-codes','Reason code / SLA targets updated',{codes:before.length},{codes:DB.reasonCodes.length})` L15108–15109 — **only the counts, not the values** | **Yes** — `GATE_SPECS.saveReasonCodes` (L18320–18325): `danger:true`, summary "These targets govern the SLA clock on every ticket.", consequences `['New targets apply to open tickets immediately — some may breach on save.','Deactivated codes stay attached to historical records.']`, button "Save" |
| **+ Add reason code** (L1791) | `addReasonCode()` L15113–15127 | Sanitises the code, validates, rejects duplicates, pushes the new record, clears both inputs, re-renders; toast `✅ <CODE> added` | `DB.reasonCodes` | `requirePerm('manage_settings')` L15114 | `logAction('add_reason_code','settings',<code>,'Reason code <code> added')` L15122 | **Yes** — `GATE_SWEEP.addReasonCode` (L20841–20842): title "Add a reason code", consequences `['Becomes selectable immediately on every ticket.','Codes are never deleted later — only deactivated.']`, button "Add code". Not `danger` |
| **Save limits** (comp, L1799) | `saveCompPolicy()` L15486–15495 | Walks `#comp-tbody tr[data-comprole]`; writes both `[data-compf]` numbers per role; re-renders; toast `✅ Compensation authority saved` | `DB.compPolicy.roles[*]` | `requirePerm('manage_settings')` L15487 | `logAction('edit_comp_policy','settings','comp-policy','Compensation authority limits updated')` L15492 — no payload | **Yes** — rich gate in `installActionGates()` (L18077–18084): title "Save compensation authority", `danger:true`, summary "This changes how much every agent can give away without approval.", consequences `['New ceilings apply immediately to all agents in those roles.','Credits already issued are unaffected.','The change is written to the activity log with your name on it.']`, button "Save limits" |
| **Save policy** (commitment, L1815) | `saveCommitPolicy()` L17117–17130 | Walks `#commit-tbody [data-cf], #dispatch-tbody [data-cf]`; writes `DB.commitPolicy[k] = (k==='confirmDeadline') ? i.value : (parseFloat(i.value)||0)` (L17121); runs the freeze-vs-statutory check (L17123–17125); re-renders commit + dispatch settings **and `renderCommitmentPage()`** (L17127); toast `✅ Commitment policy saved` | `DB.commitPolicy[*]` (20 keys across both tables) | `requirePerm('manage_settings')` L17118 | `logAction('edit_commit_policy','settings','commit-policy','Plan commitment policy updated')` L17126 — no payload | **Yes** — rich gate in `installActionGates()` (L18068–18075): title "Save commitment policy", `danger:true`, summary "These values govern penalties and pay for every captain on a plan.", consequences `['New values apply to <b>future</b> events only.','Plans already accepted keep the terms they were accepted under.','Captains must re-accept if the terms version changes.']`, button "Save policy" |
| **Open the on-call rota** (L1811) | `switchSettingsTab('rota', document.querySelector('[data-tab=rota]'))` | Switches the Settings pane to the rota tab | none | none | none | no |

## 6. Modals opened

**This pane opens no modals of its own.** All five Save/Add actions are wrapped by `guardAction()` (L17819–17840) and surface the generic `confirmAction()` dialog described in §5. The specs come from three different registries — `installActionGates()` (L18068, L18077), `GATE_SPECS`/`installUniversalGates()` (L18320, L18326, L18378), and `GATE_SWEEP`/`gateAll()` (L20841) — which is why the confirm copy varies in richness between rows.

Modals *elsewhere* that consume this tab's data are listed in §10 (wallet credit, new-ticket, bulk re-code, log-contact, mass-event).

## 7. Rules / policy logic — written out exactly

### 7.1 Target resolution — code overrides tier
```js
function rcTierObj(code){ var rc=rcById(code); return DB.slaPolicy.tiers[(rc&&rc.tier)||'T3']; }   // L14726–14729
function rcTargets(code){
  var rc=rcById(code), t=rcTierObj(code);
  return{
    fr:  (rc&&rc.fr!=null)  ? rc.fr  : t.firstResponseMin,
    res: (rc&&rc.res!=null) ? rc.res : t.resolveMin,
    upd: (rc&&rc.upd!=null) ? rc.upd : null,
    tier:(rc&&rc.tier)||'T3',
    pause:t.pauseOnCustomer
  };
}                                                                                                   // L14730–14739
```
Note the asymmetry: `fr`/`res` fall back to the tier, **`upd` has no tier default** — a blank update clock simply means "no recurring promise". `pause` **always** comes from the tier and can never be overridden per code.

Unknown / unregistered codes silently resolve to **T3** (L14728, L14735).

### 7.2 The clock (`slaState`, L14766–14790)
```js
var paused     = (obj.pausedMs||0) + (obj.pausedSinceMs ? nowMs()-obj.pausedSinceMs : 0);
var elapsedFr  = (obj.firstResponseAtMs||nowMs()) - obj.openedAtMs;
var elapsedRes = (obj.resolvedAtMs||nowMs()) - obj.openedAtMs - paused;
var frMs = tg.fr*60000, resMs = tg.res*60000;
if(tg.upd && !obj.resolvedAtMs){
  var last = obj.lastUpdateAtMs || obj.openedAtMs;
  updDue = tg.upd*60000 - (nowMs()-last);
}
```
Derived flags: `frBreached = !firstResponseAtMs && frMs>0 && elapsedFr>frMs`; `resBreached = !resolvedAtMs && elapsedRes>resMs`; `updBreached = updDue!==null && updDue<0` (L14785); `resPct = resMs ? (elapsedRes/resMs)*100 : 0` (L14786). A fourth flag, `frMissed = !!firstResponseAtMs && frMs>0 && (firstResponseAtMs-openedAtMs)>frMs` (L14783), records a *late* first response after the fact and is omitted from the pseudo-code above. Only the **resolution** clock is pausable (the `paused` term is subtracted from `elapsedRes` only) — matching the header comment at L14648 *"The first-response clock never pauses."*

### 7.3 Pause rule (`slaMarkStatus`, L14868–14872)
```js
if(status==='Waiting on customer' && rcTargets(t.reasonCode).pause){
  if(!wasPaused) t.pausedSinceMs=nowMs();
}else if(wasPaused){
  t.pausedMs=(t.pausedMs||0)+(nowMs()-t.pausedSinceMs);
  t.pausedSinceMs=null;
}
```

### 7.4 Compensation authority (`compCheck`, L15412–15435) — evaluated in this exact order
```js
var role=currentRole(), lim=compLimitsFor(role), notes=[], blocked=null, approval=false;
var rc=rcById(reasonCode)||{};

// 1. per-scenario ceiling of zero blocks entirely
if(rc.comp===0 && rc.code && rc.code!=='OTHER_UNCODED')
  blocked='No goodwill is permitted on '+rcLabel(reasonCode)+' — this scenario is resolved by fixing the underlying issue, not by paying for it.';

// 2. per-case ceiling
if(!blocked && amount>lim.perCaseSAR)
  blocked='Above your per-case ceiling ('+lim.perCaseSAR+' SAR for role “'+role+'”). Escalate to a supervisor instead of splitting it into smaller credits.';

// 3. daily ceiling (rolling 24h, this agent)
var today=goodwillToday(CURRENT_USER_ID);
if(!blocked && today+amount>lim.dailySAR)
  blocked='Above your daily ceiling — '+today.toFixed(2)+' of '+lim.dailySAR+' SAR already issued today.';

// 4. rider abuse signal (rolling 30 days) → warning + second approver
var hist=goodwillForRider(riderId);
if(!blocked && (hist.total+amount>DB.compPolicy.perRiderPer30dSAR || hist.count+1>DB.compPolicy.perRiderPer30dCount)){
  notes.push('⚠ This rider has already received '+hist.count+' credits totalling '+hist.total.toFixed(2)+' SAR in 30 days. Repeated goodwill to the same account is a signal to investigate, not to keep paying.');
  approval=true;
}

// 5. absolute second-approver threshold
if(!blocked && amount>DB.compPolicy.secondApprovalAboveSAR){
  notes.push('Above '+DB.compPolicy.secondApprovalAboveSAR+' SAR — a second approver is required.');
  approval=true;
}
return{ok:!blocked, blocked:blocked, needsApproval:approval, notes:notes, role:role, limits:lim};
```
Windows: `goodwillToday` = `nowMs()-24*3600000`, filtered by `agentId===userId` (L15399–15403). `goodwillForRider` = `nowMs()-30*24*3600000`, filtered by `riderId` (L15405–15410).
Role resolution: `currentRole()` reads `DB.teamUsers.find(u=>u.id===CURRENT_USER_ID).role` (L15393–15396); `compLimitsFor(role)` returns `DB.compPolicy.roles[role] || DB.compPolicy.roles['default']` (L15397–15399).
Header comment (L15375–15378): *"Caps are per role, and the per-reason ceiling comes from `compCapSAR` on the reason code — so the taxonomy and the money policy stay in sync."* (The field is actually named `comp`, not `compCapSAR`.)

### 7.5 Second-approval UX (`commitWalletAdjust`, L3986–3998)
```js
var chk=compCheck(amount,rcCode,riderId);
if(!chk.ok){ logAction('comp_blocked','rider',riderId,'Goodwill credit of '+amount.toFixed(2)+' SAR blocked — '+chk.blocked); toast('⛔ '+chk.blocked,'err'); return; }
if(chk.needsApproval && !window.__compApproved){
  window.__compApproved=true;
  toast('⚠ Second approval required — press Confirm again to record this as an approved exception','warn');
  return;
}
window.__compApproved=false;
logGoodwill(riderId,amount,rcCode,reason);
```
The "second approver" is **the same operator pressing the button twice** — a global boolean flag, not a second identity.

### 7.6 Ledger entry (`logGoodwill`, L15436–15444)
`DB.goodwillLedger.unshift({id:'GW-'+String(len+1).padStart(4,'0'), tsMs, date:fmtReqNowLabel(), riderId, riderName:nm2(riderId), amount, reasonCode:reasonCode||'OTHER_UNCODED', agentId:CURRENT_USER_ID, agentName, note})`.

### 7.7 Taxonomy-health rule
L1794: *"If `OTHER_UNCODED` climbs above 3% of monthly contacts the taxonomy has gone stale and needs a review."* Implemented as `DB.slaPolicy.uncodedCeilingPct` (L14659) rendered on the Contacts KPI strip at L15025 — the value turns red when `st.uncodedPct > uncodedCeilingPct`.

### 7.8 Commitment-policy save check (L17123–17125)
```js
if(DB.commitPolicy.tiers[1].freezeDays >= DB.commitPolicy.regulatorCancelLimit*0 && DB.commitPolicy.tiers[1].freezeDays > 30){
  toast('⚠ Internal freeze exceeds the statutory ceiling — reduce it','warn');
}
```
The first clause is `x >= 0`, i.e. **always true** — `regulatorCancelLimit*0` is a no-op. The effective condition is only `tiers[1].freezeDays > 30`, and it produces a warning toast that does **not** block the save.

## 8. Full enumerations

### 8a. SLA tiers — `DB.slaPolicy.tiers` (L14651–14656)

| Key | `label` | `firstResponseMin` | `resolveMin` | `hours` | `pauseOnCustomer` |
|---|---|---|---|---|---|
| **T1** | Critical | **0** | **240** (4 h) | `24/7` | **false** |
| **T2** | High | **15** | **1440** (24 h) | `24/7` | true |
| **T3** | Medium | **60** | **2880** (48 h) | `24/7` | true |
| **T4** | Low | **240** (4 h) | **4320** (72 h) | `business` | true |

Non-tier scalars (L14657–14659): `atRiskPct: 75` · `breachEscalateTo: 'ops_supervisor'` · `uncodedCeilingPct: 3`.

Design assumptions recorded in the source comment (L14643–14649): *"T1–T3 run 24/7, T4 follows business hours (night contacts on a low-priority code shouldn't manufacture breaches). The resolution clock pauses on 'waiting on customer' for T2–T4, never for T1. The first-response clock never pauses."*

### 8b. Reason code registry — `DB.reasonCodes`, L14667–14716 — **all 40 codes**

Columns: `code` · `ref` (guide §) · `cat` · `target` · `tier` · `fr` (min) · `res` (min) · `upd` (min) · `comp` (SAR ceiling) · `owner` · EN label · AR label · `active`.

**Captain — guide §1 (5 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `CAP_CANCEL_ADV` | 1.1 | rider | T2 | 10 | 240 | null | 25 | Supply | Captain cancelled in advance | إلغاء الكابتن مسبقاً |
| `CAP_LATE` | 1.2 | rider | T3 | 15 | 240 | **15** | 15 | Ops | Captain late for pickup | تأخر الكابتن عن الالتقاط |
| `CAP_NOSHOW` | 1.3 | rider | T2 | 10 | 240 | null | 50 | Supply | Captain no-show | عدم حضور الكابتن |
| `CAP_OFFPLATFORM_PAY` | 1.4 | rider | T2 | 15 | 1440 | null | **0** | Compliance | Captain requested cash / off-platform | طلب الكابتن دفعاً خارج المنصة |
| `CAP_CONDUCT` | 1.5 | rider | **T1** | 0 | 1440 | null | 50 | Supply | Captain behaved inappropriately | سلوك غير لائق من الكابتن |

**Booking — guide §2 (4 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `BKG_CANCEL_REQ` | 2.1 | rider | T4 | null | 1440 | null | 0 | **null** | Rider wants to cancel booking | طلب إلغاء الحجز |
| `BKG_WRONG_SLOT` | 2.2 | rider | T4 | null | 1440 | null | 0 | Product | Rider booked wrong date or time | حجز بتاريخ أو وقت خاطئ |
| `BKG_NO_SUPPLY` | 2.3 | rider | T3 | 60 | 1440 | null | 20 | Supply | No captain available in the area | لا يوجد كابتن متاح في المنطقة |
| `BKG_CAPTAIN_PREF` | 2.4 | rider | T4 | null | 1440 | null | 0 | Product | Rider requests a specific captain | طلب كابتن محدد |

**Payment — guide §3 (3 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `PAY_INCORRECT_CHARGE` | 3.1 | rider | T2 | 15 | 1440 | null | 0 | Payments | Rider charged incorrectly | خصم مبلغ غير صحيح |
| `PAY_DECLINED` | 3.2 | rider | T3 | 60 | 2880 | null | 0 | Payments | Payment failed or declined | فشل أو رفض الدفع |
| `PAY_REFUND_REQ` | 3.3 | rider | T2 | 15 | 1440 | null | 0 | Ops | Rider requests a refund | طلب استرداد |

**Trip — guide §4 (3 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `TRP_ROUTE_DEVIATION` | 4.1 | rider | T3 | 60 | 2880 | null | 0 | Supply | Captain took the wrong route | مسار خاطئ |
| `TRP_LOST_ITEM` | 4.2 | rider | T3 | 15 | 2880 | **30** | 0 | Ops | Rider left belongings in the vehicle | نسيان أغراض في المركبة |
| `TRP_GHOST_COMPLETE` | 4.3 | rider | **T1** | 0 | 240 | null | 0 | Supply | Trip completed but rider never boarded | إنهاء رحلة دون ركوب الراكب |

**Technical — guide §5 + 1 extra (4 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `APP_LOGIN` | 5.1 | rider | T3 | 60 | 2880 | null | 0 | Engineering | Rider cannot log into the app | تعذر تسجيل الدخول |
| `APP_CRASH` | 5.2 | rider | T3 | 60 | 2880 | null | 0 | Engineering | App crashes or is not working | تعطل التطبيق |
| `TECH_STATE_DESYNC` | **null** | rider | T2 | 15 | 240 | null | 20 | Engineering | Ride state desync — apps disagree | عدم تطابق حالة الرحلة بين التطبيقين |
| `APP_PROMO` | 5.3 | rider | T4 | null | 4320 | null | 0 | Marketing | Promo code or discount not applied | عدم تطبيق كود الخصم |

**Safety — guide §6 (3 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `SAF_RIDER_UNSAFE` | 6.1 | rider | **T1** | 0 | **60** | null | **100** | Safety | Rider feels unsafe during the trip | شعور الراكب بعدم الأمان |
| `SAF_ACCIDENT` | 6.2 | **driver** | **T1** | 0 | **60** | null | **100** | Safety | Accident or vehicle breakdown | حادث أو عطل بالمركبة |
| `SAF_THEFT` | 6.3 | rider | T2 | 15 | 1440 | null | 0 | Compliance | Lost or stolen item during the trip | فقدان أو سرقة غرض أثناء الرحلة |

**Feedback — guide §7 (3 codes)**

| code | ref | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|---|
| `FBK_COMPLAINT` | 7.1 | rider | T3 | 60 | 2880 | null | 25 | Ops | Rider wants to leave a complaint | تقديم شكوى |
| `FBK_ACCOUNT_DELETE` | 7.2 | rider | T3 | 60 | 2880 | null | 0 | Product | Rider wants to delete their account | طلب حذف الحساب |
| `FBK_INVOICE` | 7.3 | rider | T4 | null | 1440 | null | 0 | Product | Rider requests an invoice or receipt | طلب فاتورة أو إيصال |

**Subscription — not in the guide (4 codes, all `ref:null`)**

| code | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|
| `SUB_SAME_CAPTAIN_BROKEN` | rider | T2 | 15 | 1440 | null | 25 | Supply | Assigned captain changed mid-plan | تغيير الكابتن أثناء الباقة |
| `SUB_POSTPONE` | rider | T4 | null | 1440 | null | 0 | **null** | Trip postponement request | طلب تأجيل رحلة |
| `SUB_FREEZE` | rider | T4 | null | 1440 | null | 0 | Product | Plan freeze / pause request | طلب تجميد الباقة |
| `SUB_RENEWAL` | rider | T4 | null | 1440 | null | 0 | **null** | Renewal or upgrade query | استفسار تجديد أو ترقية |

**Driver — not in the guide (8 codes, all `ref:null`, all `target:'driver'`, all `comp:0`)**

| code | tier | fr | res | upd | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|
| `DRV_RIDER_NOSHOW` | T3 | 60 | 1440 | null | Ops | Driver reports rider no-show | إبلاغ الكابتن عن عدم حضور الراكب |
| `DRV_RIDER_CONDUCT` | T2 | 15 | 1440 | null | Safety | Driver reports rider behaviour | إبلاغ عن سلوك الراكب |
| `DRV_VEHICLE_DAMAGE` | T3 | 60 | 2880 | null | Ops | Vehicle damage or cleaning claim | مطالبة تلف أو تنظيف المركبة |
| `DRV_PAYOUT_ISSUE` | T2 | 15 | 1440 | null | Payments | Payout missing or incorrect | مشكلة في التحويل |
| `DRV_RATING_DISPUTE` | T3 | 60 | 2880 | null | Ops | Captain disputes an unfair rating | اعتراض الكابتن على تقييم غير عادل |
| `DRV_DEDUCTION_DISPUTE` | T2 | 15 | 1440 | null | Ops | Driver disputes a deduction | اعتراض على خصم |
| `DRV_SUSPENSION_APPEAL` | T2 | 15 | 1440 | null | Compliance | Driver appeals a suspension | تظلم من الإيقاف |
| `DRV_DOC_HELP` | T3 | 60 | 2880 | null | Compliance | Document upload or expiry help | مساعدة في المستندات |

**Corporate — not in the guide (2 codes, `target:'corp'`, `comp:0`)**

| code | tier | fr | res | upd | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|
| `CORP_BILLING` | T3 | 60 | 2880 | null | Finance | Corporate invoice or billing query | استفسار فوترة الشركات |
| `CORP_EMPLOYEE_MGMT` | T4 | null | 2880 | null | **null** | Corporate employee add or remove | إضافة أو إزالة موظف |

**Other (1 code)**

| code | target | tier | fr | res | upd | comp | owner | labelEn | labelAr |
|---|---|---|---|---|---|---|---|---|---|
| `OTHER_UNCODED` | rider | T3 | 60 | 2880 | null | 0 | Ops | Uncoded — needs taxonomy review | غير مصنّف — يحتاج مراجعة |

**Counts:** 40 total · `active:true` on all 40 · 24 with a guide ref, 16 without · by category: Captain 5, Booking 4, Payment 3, Trip 3, Technical 4, Safety 3, Feedback 3, Subscription 4, Driver 8, Corporate 2, Other 1 · by tier: **T1 4, T2 12, T3 15, T4 9** · by target: **rider 29, driver 9, corp 2** · codes with a recurring `upd` clock: **2** (`CAP_LATE` 15 min, `TRP_LOST_ITEM` 30 min) · codes with `comp>0`: **10** (100, 100, 50, 50, 25, 25, 25, 20, 20, 15) · codes with `comp:0`: **30** — of which **29 block goodwill entirely** under `compCheck` rule 1; `OTHER_UNCODED` is explicitly exempted by name (L15415). *(Re-derived mechanically over L14669–L14715; the per-code table above was already correct and is the authority — these summary figures were previously miscounted.)*

### 8c. Compensation authority — `DB.compPolicy.roles` (L15380–15386)

| Role key | Displayed as | `perCaseSAR` | `dailySAR` | Matching `DB.teamUsers` |
|---|---|---|---|---|
| `Owner` | Owner | **1000** | **10000** | USR-1 Sarah Al-Rashid (L2831) |
| `Operations` | Operations | **200** | **2000** | **none** |
| `Support` | Support | **75** | **600** | USR-3 Lina Al-Otaibi, USR-4 Noura Al-Fahad (L2835, L2837) |
| `Finance` | Finance | **500** | **5000** | USR-2 Fahad Al-Dosari (L2833) |
| `default` | **"Everyone else"** | **50** | **300** | USR-5 Yousef Al-Balawi, role `'Ops Manager'` (L2839) — falls through |

Non-role scalars (L15387–15389): `secondApprovalAboveSAR: 200` · `perRiderPer30dSAR: 150` · `perRiderPer30dCount: 3`.

`DB.goodwillLedger` seeds **empty** (`= []`, L15391).

### 8d. Absence ladder — `DB.commitPolicy.tiers` (L16556–16560)

| `n` | `label` | `freezeDays` | `forfeitRemaining` | `pullPlan` | `demoteTier` | `terminate` |
|---|---|---|---|---|---|---|
| 1 | First absence | **7** | true | true | — | false |
| 2 | Second absence | **30** | true | true | **true** | false |
| 3 | Third absence | **0** | true | true | — | **true** (permanent removal from the plan system; ordinary rides remain) |

`termsVersion: 'PLAN-TERMS-v1.0'` (L16561) — no UI on this tab.

## 9. Consumption check

### SLA policy
| Setting | Read by | Dead? |
|---|---|---|
| `tiers[K].firstResponseMin` | `rcTargets()` L14732 → `slaState()` L14770 → every ticket badge/filter | **Live** |
| `tiers[K].resolveMin` | `rcTargets()` L14733 → `slaState()` L14770 | **Live** |
| `tiers[K].pauseOnCustomer` | `rcTargets()` L14736 → `slaMarkStatus()` L14868 | **Live** |
| `tiers[K].label` | `rcPriority()` L14745–14748 (via tier key), ticket header badge L14823 | **Live (display)** |
| `tiers[K].hours` | `renderSlaPolicyForm()` L15136 **only** | **DEAD.** The `'business'` value on T4 is displayed as "Business hours" but `slaState()` (L14766–14790) does pure wall-clock arithmetic with no business-hours calendar. The stated design intent at L14645–14646 is not implemented, and the field is not editable |
| `atRiskPct` (75) | L2339 (ticket "at risk" filter), L9459 (alerts), L14799 (`slaBadge`), L14966, L15017 | **Live** |
| `uncodedCeilingPct` (3) | L15025 (Contacts KPI colour + "ceiling 3%" caption) | **Live** |
| `breachEscalateTo` (`'ops_supervisor'`) | **Nothing.** Grep returns only the definition at L14658. Breach escalation instead names `onCallName('primary')` (L14945) | **DEAD** |

### Reason codes
| Field | Read by | Dead? |
|---|---|---|
| `code` | `rcById()` L14721–14725 and ~30 call sites | **Live** |
| `tier` | `rcTierObj()` L14727, `rcPriority()` L14746 | **Live** |
| `fr` / `res` / `upd` | `rcTargets()` L14732–14734 → `slaState()` | **Live** |
| `active` | reason pickers L14756, L3970, L16097; `#rc-count` badge L15091 | **Live** |
| `cat` | `rcCategory()` L14744 → written onto tickets at L2435, L2554, L14905, L15201, L16199; contact-driver grouping L15000 | **Live** |
| `labelEn` / `ref` | `rcLabel()` L14743 — used in ~20 places (toasts, ticket rows, goodwill ledger, CSV export L15060, alerts L9464, L14945, L14947) | **Live** |
| `labelAr` | `renderReasonCodesTable()` L15077 and the bilingual picker option at L14759 | **Live (display)** |
| `comp` | `compCheck()` L15414–15416 — the per-scenario goodwill ceiling | **Live** |
| `owner` | `renderReasonCodesTable()` editor input **L15086** + write-back **L15104**; the ticket SLA detail chip **L14831** (`· root-cause owner: …`); the Contact-drivers CPT report — resolved at **L15001** (`r.owner=rc.owner||'— unassigned —'`), rendered as a column at **L15035** under the header at **L15041**, with the reading instruction at **L15044** (*“the owner column says whose backlog that fix belongs in”*) | **Live.** The description's premise — *"the field that turns a metric into somebody's backlog"* (L14666) — **is** realised, as a report column. It is still true that nothing *routes*, *filters* or *escalates* by owner |
| `target` (`rider`/`driver`/`corp`) | **Nothing.** Grep for `rc.target` / `.target===` finds no reader outside the seed | **DEAD.** Not shown in the registry table either, so it is invisible *and* inert |
| `rcCompCap(code)` helper (L14742) | **Nothing** — `compCheck` reads `rc.comp` directly (L15415) | **DEAD function** |

### Compensation policy
| Setting | Read by | Dead? |
|---|---|---|
| `roles[R].perCaseSAR` | `compLimitsFor()` L15397 → `compCheck()` L15419, `compPreview()` L15457 | **Live** |
| `roles[R].dailySAR` | `compCheck()` L15423, `compPreview()` L15457 | **Live** |
| `roles['Operations']` | matched by no team user (§8c) | **Live key, unreachable in practice** |
| `secondApprovalAboveSAR` (200) | `compCheck()` L15430–15431 | **Live** (but see §13 on what "second approval" means) |
| `perRiderPer30dSAR` (150) / `perRiderPer30dCount` (3) | `compCheck()` L15426 | **Live** |
| `DB.goodwillLedger` | `goodwillToday()` L15402, `goodwillForRider()` L15407, `renderCompPolicyTable()` L15468/L15478, finance roll-up L15729 | **Live** |

### Commitment / dispatch policy (rendered on this tab, owned by the Plan Commitment module)
**17 of the 20 keys** have at least one reader outside Settings. **Three do not — `riderWaitMin` (seed L16545, settings field L17087), `riderNoShowPayPct` (L16546 / L17088) and `payoutDays` (L16547 / L17089) are editable, saved and never read by anything.** Each returns exactly two grep hits, both of which are the seed and the settings row itself. The 17 live ones — e.g. `confirmDeadline` L16590/L16598/L16936/L16954, `counterWindowDays` L16632/L16676/L16996/L17916, `appealResponseHours` L16776/L16799/L16806/L17048/L18356, `regulatorCancelLimit` L16718/L16720/L17000/L17015, `backupMultiplierPct` L17274/L17281/L17367/L17975, `emergencyMultiplierPct` L17274/L17368, `dispatchWindowSec` L17312, `dispatchMaxCandidates` L17239/L17271, `decayDays` L16999, `lateAsAbsenceMin` L16736, `commitmentReservePct` L17563, `tiers` L16639/L17024/L17109. **`termsVersion`** is read at L17134/L17137 but has no editor.

## 10. Cross-module effects

1. **Support Center / tickets** — `slaState()` and `slaBadge()` (L14766–14805) drive every ticket badge; `renderTickets()` is re-run by `saveSlaPolicy()` (L15151). Ticket filters `atrisk` (L2339), breach alerts (L9459–9464), SLA-breach notification + audit (L14944–14947).
2. **New-ticket modal** — `reasonSelectHTML()` (L14755–14763) builds a bilingual picker from active codes only (`§ref  labelEn  —  labelAr  ·  cat`), with the search placeholder `'Search 38 reason codes…'`. New tickets copy `category:rcCategory(gvRC())` and `priority:rcPriority(gvRC())` (L2435, L2554).
3. **Re-code flows** — single (`commitChangeReason`, gate L18315) and bulk (`bulkRecode`, gate L18308, commit L16199–16205) rewrite `t.reasonCode` and `t.category`; the gate copy states "SLA targets re-derive from the new scenario. Clocks keep running from each original contact time — they are not reset."
4. **Rider wallet credit modal** (`openWalletAdjustModal`, L3962–3976) — renders a "Reason code" picker from active codes (L3970) and a live `#comp-preview` panel (`compPreview()`, L15447–15462) showing `Authority · <role> — per case N SAR · today X/Y SAR`, the rider's 30-day history, the block reason and any warnings.
5. **Goodwill enforcement** (`commitWalletAdjust`, L3982–3999) — blocks or requires re-confirmation; writes `logAction('comp_blocked','rider',…)` on a block; calls `logGoodwill()` on success.
6. **Automatic policy compensation** — `logGoodwill(d.riderId, d.riderCompensation, 'CAP_NOSHOW', 'Policy compensation — automatic, not agent discretion')` (L17339) in the emergency-dispatch path, bypassing `compCheck` entirely.
7. **Finance** — goodwill total folded into the money roll-up at L15729.
8. **Contacts / CPT page** — `rcById` for the CSV export (L15060), contact-driver grouping by code (L14998–15000), the Uncoded KPI vs `uncodedCeilingPct` (L15025), contact list rows (L15646–15655, L19140).
9. **Call center / mass events / lost & found** — `rcLabel` at L16111, L16239–16241, L16263, L20226, L20315–20318, L20355; a reason picker at L16097.
10. **Plan Commitment page** — `renderCommitmentPage()` is re-rendered by `saveCommitPolicy()` (L17127) and reads the same `DB.commitPolicy`.
11. **Rota tab** — card 5 is now only a signpost to it (L1811).
12. **Settings nav regrouping** — `SETTINGS_GROUPS` (L21270–L21277) puts `reasons` **first** in the "Daily operations" group, with the source comment at **L21258–L21269** explaining the move (quoted text at L21262–L21263): *"Reason Codes and SLA — opened weekly and the thing that governs every ticket clock — sat ninth, below Cities."*
13. **Boot order** — `slaBoot` is registered with `needs:['reasonCodes','slaPolicy','contacts']` (L21811) and `auditFixBoot` with `needs:['reasonCodes']` (L21823).

## 11. Hardcoded / mock / demo values

| Item | Line | Note |
|---|---|---|
| All 40 reason codes with their clocks and comp ceilings | L14667–14716 | In-file literals |
| The 4 SLA tiers and the 3 non-tier scalars | L14650–14660 | In-file literals; the design assumptions are prose comments (L14643–14649), not code |
| The 5 compensation roles and 3 thresholds | L15379–15388 | In-file literals |
| `200 SAR` / `150 SAR` / `3 credits` restated as literal prose in the panel | L1802 | Duplicates `DB.compPolicy` values with no binding — will silently drift |
| `'Search 38 reason codes…'` placeholder | L14762 | Stale: there are 40 |
| "all 24 scenarios … plus 14 codes" | L1775 | Stale: 24 + **16** |
| `DB.goodwillLedger = []` and the empty-state copy "…yet this session" | L15391, L15483 | The ledger is per-session only — no persistence |
| `renderCompPolicyTable` "Issued to date" is not date-bounded despite the column name | L15468–15469 | It sums the whole in-memory ledger by role |
| Goodwill ledger renders only the newest 12 entries with no "show more" | L15479 | Hardcoded slice |
| `window.__compApproved` global as the "second approver" | L3992–3997 | Same operator, same click |
| Absence ladder tiers 7/30/0 days | L16557–16559 | In-file literals |
| `DB.commitPolicy.commitmentReservePct = 0` with the source comment "Try 15 to activate." | L17465 | Ships disabled |
| `regulatorCancelLimit*0` in the save check | L17123 | Dead sub-expression, always `>= 0` |
| The three "guide clocks" quoted in the header (30-min lost item, 24-h misconduct, 48-h complaint) | L1775 | Verified against the data: `TRP_LOST_ITEM.upd=30` ✅, `CAP_CONDUCT.res=1440` ✅, `FBK_COMPLAINT.res=2880` ✅ |

## 12. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `stab.reasons` | tab button label, L1430 | "Reason Codes & SLA" | `أكواد الأسباب واتفاقية الخدمة` (L7911 — note it is defined in the **nav** block, not the `stab.*` block) |
| `stabgrp.operations` | static group header, **L1424** | "Operations" | `العمليات` (L7914) — removed at boot (**L21288**, inside `reorderSettingsTabs()` L21278–L21313) |
| `stabgrp.daily_ops` | runtime group header for this tab, created by `reorderSettingsTabs()` at L21293–L21296 | "Daily operations" | `العمليات اليومية` (L7915) |

**No `data-i18n` attribute exists anywhere inside `#stab-reasons` (L1771–1822).** All six card headings, all 22 column headers, the composer labels, the policy prose blocks (L1793–1795, L1801–1803, L1809–1812, L17114), every SLA/comp/commit field label and hint, and every toast are English-only literals.

The **only** Arabic actually rendered by this pane is the per-code `labelAr` column (L15077, `direction:rtl;text-align:right`) and the bilingual option labels in `reasonSelectHTML()` (L14759) — content data, not interface translation.

## 13. Gaps, dead code, UNVERIFIED items

1. **`owner` has no routing or filtering** — but it is **not** dead. It is displayed on the ticket SLA detail chip (L14831) and is a rendered column of the Contact-drivers CPT report (L15001 → L15035, header L15041, reading instruction L15044). What is missing is an owner *filter*, owner-based *routing* and owner-based *escalation*; the reporting half of the comment at L14666 is implemented. *(Correction: an earlier revision of this document called `owner` DEAD, contradicting `13a` and `13c`, which were right. See `docs/02-verification/corrections-applied.md` Part 2 §2.)*
2. **`target` is invisible and inert.** Not rendered in the table, not read by any code — so a `driver`-targeted code is offered in the rider wallet-credit picker (L3970) exactly like a rider code.
3. **`hours: 'business'` on T4 is not implemented.** `slaState()` uses raw wall-clock deltas, so a low-priority contact opened at 02:00 accrues breach time overnight — precisely the scenario the design comment at L14645–14646 says it wants to avoid. The field is also read-only in the UI.
4. **`breachEscalateTo:'ops_supervisor'` is dead** (L14658). Escalation names the on-call person instead (L14945).
5. **`rcCompCap()` is a dead function** (L14742).
6. **Counts are stale in two places** — "plus 14 codes" (L1775) and "Search 38 reason codes…" (L14762) against an actual 40 / 16.
7. **`#meta-reasons` never updates.** The element exists at L1796 but `renderSettingsMeta()`'s map (**L7340**, inside `renderSettingsMeta()` **L7339–L7342**) has no `meta-reasons` key, so it renders permanently empty. Every other Settings tab with a `.settings-meta` div gets a "Last updated by …" line; this one silently does not. Contributing cause: this tab's audit entries use `entityId` `'reason-codes'`/`'sla-policy'`/`'comp-policy'`/`'commit-policy'`, none of which is in the map.
8. **`renderOnCall()` is dead code.** It is still called on every settings render (L8819) but targets `#oncall-body` (L15790), an element that no longer exists — the card was replaced by the rota signpost (L1807–1813). `saveOnCall()` (L15799) and its gate `GATE_SPECS.saveOnCall` (L18332–18336) are likewise unreachable from the UI.
9. **Audit entries carry no before/after payload** for `saveSlaPolicy`, `saveCompPolicy` and `saveCommitPolicy` (L15150, L15492, L17126); `saveReasonCodes` records **only the row count** (L15108–15109). A change of every SLA clock on the platform is logged as a single summary string, so the log cannot answer "what was it before?" — unlike `saveOpsLimits`/`saveCancellationPolicy`, which snapshot both sides.
10. **The "second approver" is the same person.** `window.__compApproved` (L3992–3997) is a global boolean; pressing Confirm twice satisfies it. No second identity, no approval record, and the flag persists across modals until the next successful credit resets it.
11. **`compCheck` blocks goodwill on 29 of 40 codes** because `comp:0` is treated as a hard block (L15415). Every newly added code also gets `comp:0` (L15121) — so any code an operator adds through this tab silently forbids goodwill, and there is **no UI to set `comp`**.
12. **Automatic compensation bypasses the whole authority model** — L17339 calls `logGoodwill` directly without `compCheck`, so policy-driven credits ignore per-case, daily and per-rider ceilings.
12a. **So does every non-goodwill credit.** `compCheck` runs only inside `if(reason.indexOf('Goodwill')>=0)` (**L3985**) and `compPreview` returns early on the same test (**L15453**). A "Trip cancellation refund" or "Manual top-up" wallet credit of any size therefore never touches per-case, daily, per-rider or second-approval limits — the authority model governs one reason string, not the credit path.
13. **Role-key mismatch**: `DB.compPolicy.roles` defines `'Operations'` (200/2000) which matches no team user, while the actual role `'Ops Manager'` (USR-5, L2839) falls through to `default` (50/300). An ops manager therefore has a *lower* ceiling than Support (75/600).
14. **`saveReasonCodes` writes the resolved value back as an override.** The `fr`/`res` inputs are pre-filled with `rcTargets()` output (L15083–15084), so a code that inherited its tier default is saved with that number **pinned as an explicit override** the first time anyone presses Save. Tier inheritance is silently destroyed for all 40 codes on the first save, and afterwards changing a tier default no longer moves those codes.
15. **`saveCommitPolicy`'s statutory check is broken** — `freezeDays >= regulatorCancelLimit*0` is always true (L17123); the effective test is the unrelated `> 30`, and it only warns.
16. **`confirmDeadline` is a free-text input** (L17106) parsed nowhere — no HH:MM validation.
17. **No empty state** on the reason code registry table.
18. **Five Save buttons, no unsaved-changes indicator.** Editing the SLA tiers and then pressing "Save changes" (the reason-code button) discards the tier edits on the next `renderSlaPolicyForm()`.
19. **`renderSlaPolicyForm` iterates a hardcoded `['T1','T2','T3','T4']`** (L15131) rather than `Object.keys(DB.slaPolicy.tiers)`, so a fifth tier would be invisible.
20. **`labelEn`/`owner` are injected as raw HTML** (L15076, L15086) with no escaping.
21. **`edit_reason_codes`, `add_reason_code`, `edit_sla_policy`, `edit_comp_policy`, `edit_commit_policy` are all absent from `ACTION_LABELS`** (L2898–2909), so none of them appears with a friendly name in the Activity-log action filter (L9238).
22. **UNVERIFIED** — the "Call Center Communication Guide" referenced at L1775 is not present in this file; the 24 `ref` values cannot be checked against it.
23. **UNVERIFIED** — whether `hours:'business'` is meant to be honoured by a server-side SLA engine. Within this file it is not honoured at all.

## 14. Line-number index

| What | Lines |
|---|---|
| Tab button | 1430 |
| Pane `#stab-reasons` | 1771–1823 |
| Header card / description | 1772–1777 |
| SLA tiers card / `#sla-tier-note` / `tbody#sla-tier-tbody` / Save | 1778–1782 / 1779 / 1780 / 1781 |
| Reason registry card / `#rc-count` / scroll box / `tbody#rc-tbody` | 1783–1797 / 1784 / 1785 / 1786 |
| `#rc-new-code` / `#rc-new-label` / "+ Add reason code" | 1789 / 1790 / 1791 |
| Never-delete policy prose | 1793–1795 |
| `#meta-reasons` (never populated) | 1796 |
| Compensation card / `tbody#comp-tbody` / prose / `#gw-ledger` | 1798–1806 / 1800 / 1801–1803 / 1805 |
| On-call signpost card | 1807–1813 |
| Commitment card / `tbody#commit-tbody` / `tbody#dispatch-tbody` / `#commit-tiers` | 1814–1822 / 1816 / 1818 / 1820 |
| Ticket `atrisk` filter | 2339 |
| New-ticket create (category/priority from code) | 2435, 2554 |
| `CURRENT_USER_ID` | 2862 |
| `DB.teamUsers` (5 users, roles) | 2830–2841 |
| `ACTION_LABELS` | 2898–2909 |
| `openWalletAdjustModal()` (reason-code picker, `#comp-preview`) | 3962–3976 |
| `commitWalletAdjust()` (comp enforcement) | 3977–4005 |
| `renderSettingsMeta()` map (no `meta-reasons`) | 7339–7342 (map at 7340) |
| Arabic `stab.reasons` | 7912 |
| Settings page render fan-out | 8819 |
| Activity-log action filter | 9238 |
| SLA breach alert | 9459–9464 |
| `DB.slaPolicy` (+ design comment) | 14643–14660 |
| `DB.reasonCodes` (+ comment, 40 rows) | 14662–14716 |
| `rcById()` / `rcTierObj()` / `rcTargets()` | 14721–14739 |
| `rcCompCap()` (dead) / `rcLabel()` / `rcCategory()` / `rcPriority()` | 14742 / 14743 / 14744 / 14745–14748 |
| `gvRC()` | 14750–14754 |
| `reasonSelectHTML()` ("Search 38 reason codes…") | 14755–14763 |
| `slaState()` | 14766–14790 |
| `slaBadge()` | 14791–14802 |
| `slaMarkResponse()` / `slaMarkStatus()` | 14856–14862 / 14863–14880 |
| SLA breach notification + audit | 14944–14947 |
| Contact-driver grouping by code | 14998–15000 |
| Contacts KPI (uncoded ceiling) | 15017–15025 |
| Contacts CSV export | 15055–15064 |
| `renderReasonCodesTable()` | 15070–15092 |
| `saveReasonCodes()` | 15093–15112 |
| `addReasonCode()` | 15113–15127 |
| `renderSlaPolicyForm()` | 15128–15139 |
| `saveSlaPolicy()` | 15140–15152 |
| `DB.compPolicy` (+ comment) | 15375–15388 |
| `DB.goodwillLedger = []` | 15391 |
| `currentRole()` / `compLimitsFor()` | 15393–15399 |
| `goodwillToday()` / `goodwillForRider()` | 15400–15410 |
| `compCheck()` | 15412–15435 |
| `logGoodwill()` | 15436–15444 |
| `compPreview()` | 15447–15462 |
| `renderCompPolicyTable()` (+ goodwill ledger) | 15463–15485 |
| `saveCompPolicy()` | 15486–15495 |
| Finance goodwill roll-up | 15729 |
| `renderOnCall()` (dead — `#oncall-body` absent) / `saveOnCall()` | 15789–15798 / 15799–15805 |
| `DB.commitPolicy` (+ tiers) | 16541–16561 |
| Bulk re-code commit | 16199–16205 |
| `renderCommitSettings()` (14 fields) | 17080–17115 |
| `saveCommitPolicy()` | 17117–17130 |
| `DB.commitPolicy.emergency*` / `dispatch*` / `riderComp*` | 17182–17187 |
| Automatic goodwill (bypasses `compCheck`) | 17339 |
| `renderDispatchSettings()` (6 fields) | 17408–17423 |
| `DB.commitPolicy.commitmentReservePct = 0` | 17465 |
| `guardAction()` | 17819–17840 |
| `installActionGates()` — `saveCommitPolicy` / `saveCompPolicy` | 18068–18075 / 18077–18084 |
| `GATE_SPECS.saveReasonCodes` / `.saveSlaPolicy` / `.saveOnCall` | 18320–18325 / 18326–18331 / **18332–18336** |
| `installUniversalGates()` | 18372–18383 (declared 18372, closes 18382, invoked 18383) |
| `gateAll()` | 20755–20767 |
| `GATE_SWEEP.addReasonCode` | 20841–20842 |
| Settings reorder rationale comment | 20794–20802 |
| `SETTINGS_GROUPS` ("Daily operations", `reasons` first) | 21270–21277 (`daily_ops` row 21271) |
| `reorderSettingsTabs()` | 21278 |
| Boot: `slaBoot` needs `reasonCodes`,`slaPolicy`,`contacts` | 21811 |
