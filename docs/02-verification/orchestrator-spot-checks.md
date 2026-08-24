# Orchestrator Spot-Checks

Claims I verified **personally against the source**, independently of the agent
that reported them. Everything here was re-derived by running the check shown,
not accepted on report.

This file exists to separate *verified* from *reported*. A finding in a module
document is a claim; a finding here has been executed against
`eyvar_ops_panel_v40_fixed.html` a second time by a different party.

## Method

Each row gives the exact command or line range used. Every one is reproducible.

---

## 1. Architecture-level (highest impact)

### 1.1 Zero persistence, zero network — CONFIRMED

```
localStorage: 0    sessionStorage: 0    indexedDB: 0
fetch(): 0         XMLHttpRequest: 0
```
`grep -c` for each term over the whole file. **Every state mutation in the panel
is in-memory and lost on reload; nothing is ever transmitted.** This is the
systemic root cause behind a large share of every other finding — approvals,
payouts, suspensions and settlements all "succeed" and then evaporate.

### 1.2 Leaflet loaded but unused — CONFIRMED

`id="map-leaflet"` → **0 occurrences**, while `L469`–`L470` load Leaflet CSS and
JS render-blocking from unpkg. The map is canvas-rendered. Two external
requests on every page view for a dependency the live map does not use.

---

## 2. Access control

### 2.1 `commitUserSwitch()` — privilege escalation — CONFIRMED  `L3098-3114`

Read in full. Contains **no `can()` and no `requirePerm()`**. The only guard is:

```js
if(nu.status==='Invited'){toast('That member has not logged in yet','err');return;}
CURRENT_USER_ID=nu.id;
```

Any operator — including Support — becomes Owner from the top-bar avatar. It
never sets `__realUserId`, so no impersonation banner renders and there is no
documented way back.

### 2.2 Rider money gated by the wrong permission — CONFIRMED  `L3978`

```js
function openWalletAdjustModal(...){ if(!requirePerm('contact_users'))return;
```

`contact_users` is labelled *"Call/message riders & drivers."* Moving money out
of a rider wallet is gated behind the phone-the-customer permission: Support can
adjust balances, Finance cannot.

---

## 3. Money safety

### 3.1 `wallet_credit` idempotency allows double-payment — CONFIRMED

```js
L19963: var key=idemKey('refund',       riderId, r2(amount), relatedId||reason||'');
L19980: var key=idemKey('wallet_credit',riderId, r2(amount), reason||'', Math.floor(nowMs()/1000));
```

`refund` is correctly idempotent. `wallet_credit`, seventeen lines later, folds a
**one-second time bucket** into the key, so the same credit repeated 1.1 s apart
is a distinct operation and pays twice. The adjacent correct implementation
shows this is unintentional — and the Ledger tab (`L1732`) advertises idempotency
keys as one of "the two things that stop money being paid twice."

### 3.2 `commitSettlement()` moves no money — CONFIRMED  `L3684-3695`

Computes `s.riderBack`, `s.driverPay`, `s.eyvarKeeps`; sets `sub.status='Cancelled'`;
writes an audit entry quoting all three amounts; toasts "Settlement recorded";
pushes a notification reading *"Driver payout of X queued"*. Calls to
`recordRefund` / `creditRiderWallet` / `debitRiderWallet` / `postLedger` /
`payDriver` inside the function: **0**.

The money never moves, and the audit trail asserts that it did. Of everything
verified here this is the most damaging, because the record of the failure
claims success.

---

## 4. Data model

### 4.1 Four core support entities are read-only — CONFIRMED

| Collection | Total refs | `.push(` writes |
|---|---:|---:|
| `DB.complaints` | 9 | **0** |
| `DB.disputes` | 10 | **0** |
| `DB.incidents` | 12 | **0** |
| `DB.lostFound` | 5 | **0** |

Nothing in the UI can create a complaint, dispute, safety incident or lost-item
record. These surfaces can only ever display their seed rows.

### 4.2 `backupRegistry` is an alias, not a copy — CONFIRMED  `L17198`

`DB.backupRegistry=DB.subBackups;` — same object reference. Writes through
either name mutate both.

### 4.3 Collection census — CONFIRMED

101 distinct `DB.<key>` collections referenced; **every one is defined**. 24 in
the `var DB={…}` literal, ~80 assigned later via `DB.x=`.

---

## 5. Dead code

| Claim | Check | Result |
|---|---|---|
| `getReferralCode()` never called | `grep -c 'getReferralCode'` | **1** — its own definition only |
| `renderDriverCircuit()` can never mount | `grep -c 'circuit-driver-select-wrap'` | **1** — inside its own body (`L6316`) |
| `DB.paymentRisk` never rewritten | `grep -n 'paymentRisk'` | 6 refs: 1 hardcoded assignment (`L14199`), 5 readers |
| `new-riders-count` has no JS writer | `grep -n 'new-riders-count'` | 1 ref — hardcoded `3` in markup (`L911`) |
| `interventions` page unreachable | `grep -c "go('interventions'"` | **0** — page body itself says "Merged into the work inbox" |

---

## 6. Corrections to my own census

Found by review agents, verified by me, and recorded in
`docs/00-index/GROUND-TRUTH-INVENTORY.md` rather than silently patched.

| # | My error | Correct | Check |
|---|---|---|---|
| 1 | "`DB.actionLabels`" | `var ACTION_LABELS` at `L2898` | `grep -c 'DB\.actionLabels'` → **0** |
| 2 | "621 element ids" | **605**; 16 are JS template artifacts (`id="'+cselId+'"`) | `grep -o 'id="[^"]*"' \| sort -u \| grep -c "'+"` → 16 |
| 3 | "27 nav items / 14 unreachable pages" | **30 / 11**. My table listed all 30 correctly; the prose summary was miscounted. | `grep -c 'class="sb-item'` → 30 |

Three separate agents caught these independently. Recording them visibly matters
more than fixing them quietly: this census is the baseline every coverage
percentage in `pass-1-coverage-review.md` is measured against, and a baseline
adjusted after the fact to agree with its own results proves nothing.

---

## 7. What this file does not cover

Roughly 30 claims were spot-checked out of several hundred across 60 documents.
Absence from this file means **not independently re-verified by me** — not
false. `pass-2-accuracy-review.md` samples far more broadly; the module
documents' own `UNVERIFIED` markers stand where they were placed.

---

## 8. Late additions — verified after the JSON extraction pass

Two critical defects that the module documents missed entirely, surfaced during
structured extraction and re-verified here by reading the full function bodies.

### 8.1 `executePayout` reports success after a denial — CONFIRMED  `L8729-8736`, `L7023-7026`

`executePayout` calls the payout function and discards its return value:

```js
L8729:  payDriver(driverId);
L8730:  var msg='Your payment of '+amt.toFixed(2)+' SAR has been confirmed and will arrive within 3 business days.';
L8732:  d.notifLog.unshift({date:'Just now',channel:'Email + Push',msg:msg});
L8733:  // modal replaced with "Payment sent" + green checkmark
```

`payDriver` has **two** guards, both bare `return` (yielding `undefined`):

```js
L7023: window.payDriver=function(driverId){
L7024:   if(!requirePerm('process_payouts'))return;   // permission denied
L7026:   if(!p||p.pending<=0)return;                  // nothing owed
```

So the driver is told "your payment has been confirmed and will arrive within 3
business days" in **two** distinct failure cases: the operator lacked
`process_payouts`, or there was no pending balance. In the first case the
operator simultaneously sees a permission-denied toast and a green "Payment
sent" success modal.

This is the second instance of the most dangerous pattern in the file — the same
shape as `commitSettlement` (§3.2): **a failed operation that records and
announces itself as successful.** Here it additionally reaches the driver.

**Severity: critical** — it does not misplace money, but it destroys the
reliability of the payment record and sends a false financial statement to a
third party.

### 8.2 `recordRefund` has neither permission gate nor audit entry — REPORTED, partially verified  `L3176-3202`

Reported by the extraction pass: `recordRefund` unshifts a `REF-` record with
status `Processed` and calls `issueCreditNote()` to reverse VAT — money leaves
the platform and a tax document is reversed, with no `requirePerm` and no
`logAction`. Only a confirmation gate stands in front of it.

I verified the function exists at that range and that `docs/01-modules/12a-finance.md`
documents it; I did **not** re-read the full body line by line. Marked REPORTED
rather than VERIFIED. It also contradicts an existing claim in `00c` that no
DB-mutating function is unaudited — that scan looked only for *removals*.

### 8.3 Note on a claim I did NOT accept

The extraction pass reviewed the "seven ungated destructive actions" listed in
`00b-global-ui-systems.md` §4.8 and found that six of them **do** check a broad
permission and write an audit entry — they lack *confirmation*, not
*authorization*. It downgraded them from security bypasses to medium-severity
UX findings with the real permission keys attached.

That correction is recorded here because it runs in the safe direction: a
reviewer reducing the severity of its own side's finding is more trustworthy
than one that only escalates.

---

## 9. Findings I REJECTED on verification

Claims raised by analysis agents that did **not** survive independent checking.
Recorded because a review process that only ever confirms is not a review.

### 9.1 REJECTED — "`window.__skipGuards` disables the confirm gate globally"

**Claim (frag-09, offered in support of a `critical` rating on `recordRefund`):**
`window.__skipGuards` is set `true` for the whole boot run at `L21833`, so the
confirmation gate — the only control in front of `recordRefund` — is disabled
globally.

**Verdict: OVERSTATED, rejected as stated.** Read in full, the flag is scoped
and defensively implemented:

```js
L17818  window.__skipGuards=false;              // default off
L21832  var __prevSkip=window.__skipGuards;     // previous value saved
L21833  window.__skipGuards=true;               // boot block only
L21841    try{step.fn();}                       // every step individually
L21842    catch(e){ failed.push(...) }          //   wrapped — cannot escape
L21846  });
L21847  window.__skipGuards=__prevSkip;         // restored
```

The per-step `try/catch` at `L21841-21845` means no boot step can throw out of
the `forEach` and strand the flag at `true`. The restore at `L21847` is
therefore always reached. A comment at `L21830-21831` states the intent: gates
are installed before the boot block runs, and seed calls must not trigger UI
confirmation modals.

This is correct engineering, not a vulnerability. **It does not weaken the
88-action gate registry, and it must not be cited as support for any severity
rating.**

*Residual observation, medium at most:* it is a mutable global rather than a
parameter, so any code executing during the boot window bypasses gates. Nothing
currently exploits this, and the exception handling closes the obvious failure
mode. Worth a note in a rebuild; not a finding here.

**Why this mattered enough to check.** Taken at face value the claim would have
invalidated the single largest piece of safety engineering in the file. A
critical rating resting on it would have been wrong, and would have discredited
the genuinely critical findings alongside it.

### 9.2 Accepted with severity reduced — "seven ungated destructive actions"

`00b-global-ui-systems.md` §4.8 listed seven destructive actions as ungated. The
JSON extraction pass re-read them and found six **do** check a broad permission
and write an audit entry (all but `removeAvatar`) — they lack *confirmation*,
not *authorization*. Downgraded from security bypass to medium UX finding, with
the real permission keys attached.

Noted here because the correction ran in the safe direction: a reviewer reducing
the severity of a finding on its own side is more trustworthy than one that only
escalates.

### 9.3 Standing caution

Two of the ~40 claims I checked closely were overstated in the direction of
higher severity, and both concerned access control — the area where an
overstatement is most costly, because it is the area a reader is most likely to
act on immediately. The findings register's `critical` tier should be read with
that in mind: the ones re-verified in §1-3 and §8 of this file are sound; the
remainder carry their originating document's confidence, not mine.

### 9.1a Amendment — narrowing the §9.1 rejection

On reviewing how `__skipGuards` is stated across the deliverables (13 files
mention it), the blanket rejection in §9.1 was itself too broad. Two distinct
claims travel under the same name and they need separating:

| Claim | Verdict | Where stated |
|---|---|---|
| `__skipGuards` is a **public mutable global** that anything — a console line, injected HTML — could set to disable all 88 gates at once | **TRUE.** Legitimate design weakness. | `FINDINGS-REGISTER.md` F-007, `MIGRATION-NOTES.md` §0.3, `PROPOSED-STRUCTURE.md` — all worded correctly as *"can be set"* |
| `__skipGuards` **is set** `true` for the boot run, therefore the confirmation gate is disabled in practice / "kills every money confirmation globally" | **OVERSTATED — rejected.** It is saved (`L21832`), set (`L21833`), and restored (`L21847`) behind per-step `try/catch` (`L21841-45`), so no boot step can strand it. | asserted in two extraction fragments as support for `critical` severity |

**What this means for readers.** F-007 in the findings register is **sound and
should stand** — both its primary claim (`guardAction` swallows a builder
exception and falls through to the unguarded action at `L17828-17838`) and its
characterisation of `__skipGuards` as an exposed global. My §9.1 rejection
applies **only** to using the boot-time assignment as evidence that gates are
already bypassed at runtime. It is not, and no severity rating should rest on it.

**Why I am correcting my own correction.** §9.1 as first written risked the
opposite error to the one it was fixing — discrediting a real finding by
over-rejecting an adjacent overstatement. The distinction between *"this could
be set"* and *"this is set"* is the whole finding, and collapsing it in either
direction loses the truth.

---

## 10. Further verified findings

### 10.1 `resolveDispute` logs a credit that never happens — CONFIRMED  `L14436-14444`

```js
L14436  var perTrip=sub?subEconomics(sub).perTrip:0;
L14437  var amount=outcome==='refund'?perTrip:outcome==='goodwill'?perTrip*0.5:0;
L14441  d.status='resolved';d.outcome=outcome;
L14443  logAction('resolve_dispute','dispute',dspId,'Dispute '+dspId+' resolved: '+outcome
                  +(amount?' — '+fmtSAR(amount)+' credited to '+nm2(d.claimant):...
L14444  toast('✅ '+dspId+' resolved — '+fmtSAR(amount)+' credited','ok');
```

Calls to `recordRefund` / `creditRiderWallet` / `postLedger` / `payDriver` in
the function: **0**. The dispute is marked resolved, the operator is told
"X SAR credited", and the audit trail records a credit to a named claimant. No
money moves.

**This is the fourth confirmed instance of the same pattern**, after
`commitSettlement` (§3.2), `executePayout` (§8.1) and impersonation
misattribution. See §11.

### 10.2 Two more ungated mutations in Settings — CONFIRMED

| Function | Line | `requirePerm` in body | Gated sibling |
|---|---|---:|---|
| `resetBranding` | `L18454` | **0** | `saveBranding` `L18445` — **1** |
| `rebuildAllHistory` | `L18600` | **0** | `saveDataWindow` `L20514` — **1** |

Checked by counting `requirePerm`/`requirePagePerm` in the first 25 lines of
each. `rebuildAllHistory` generates records into `DB.trips` and `DB.payments`.
In both pairs the *more* consequential action is the ungated one. A confirmation
gate is not an authorization gate.

---

## 11. The pattern that matters most

Four independently verified instances, in four unrelated modules, of one failure
mode: **an operation that does not happen, but records and announces that it
did.**

| # | Function | Line | Announces | Actually does |
|---|---|---|---|---|
| 1 | `commitSettlement` | `L3684` | audit entry + "payout queued" notification with exact amounts | sets `status='Cancelled'`; moves no money |
| 2 | `executePayout` | `L8729` | emails driver "your payment has been confirmed" | discards `payDriver`'s return; fires on permission-denied **and** zero-balance |
| 3 | `resolveDispute` | `L14436` | audit line "X SAR credited to <claimant>" | sets `status='resolved'`; moves no money |
| 4 | impersonation | `L21071` | gate copy: "recorded against **your** name, not theirs" | reassigns `CURRENT_USER_ID` *before* `logAction` — records the opposite |

These are more damaging than crashes. A crash is visible and self-correcting; an
operation that certifies its own success corrupts the record that would
otherwise reveal it, and in cases 2 and 3 the false statement reaches a driver
or a customer.

They are also not four bugs. They are one missing convention — *verify the
operation succeeded before reporting it* — absent at four sites, which means it
is likely absent at others not yet examined. A rebuild should treat this as a
structural rule enforced at the boundary, not as four independent fixes.

### 10.3 Bulk data export is ungated and unaudited — CONFIRMED (claim narrowed)  `L7607-7639`, `L9766`

**Claim as reported:** "all nine CSV exporters ungated — riders' phones,
drivers, full payment ledger, audit log."

**Verified, with a correction.** Counting `requirePerm`/`requirePagePerm` and
`logAction` in the first 12 lines of each:

| Exporter | Line | Permission | Audit |
|---|---:|:---:|:---:|
| `exportRiders` | 7607 | **none** | **none** |
| `exportDrivers` | 7611 | **none** | **none** |
| `exportAuditLog` | 7623 | **none** | **none** |
| `exportInbox` | 7627 | **none** | **none** |
| `exportRequestsSnapshot` | 9766 | **none** | **none** |
| `exportPushLog` | 7631 | ✓ | **none** |
| `exportEmailLog` | 7634 | ✓ | **none** |

So **5 of 7, not 9 of 9** — the count was overstated. The substance is worse
than the correction suggests, for two reasons:

1. **The gating is inverted.** The two exporters that *are* gated handle the
   least sensitive data — push and email logs. The five that are not include
   rider PII (names, phone numbers), the driver roster, and **the audit log
   itself**. The same inversion appears in `resetBranding` vs `saveBranding`
   (§10.2): in both pairs the more consequential action is the ungated one.

2. **Not one of the seven writes an audit entry.** A bulk export of customer
   personal data leaves no trace in the record that exists specifically to show
   who did what — and `exportAuditLog` lets anyone take that record itself,
   ungated and unlogged.

**Severity: critical** — bulk PII egress with no authorization and no
attribution. This is the finding with the clearest regulatory exposure in the
set, given the panel's own `DB.erasureRequests` and `legalDocuments` collections
show GDPR-style obligations were contemplated.

*Recorded as narrowed rather than accepted-as-stated: the "nine" figure does not
survive checking, and a register entry carrying an inflated count is easy for a
reader to dismiss wholesale once they find the error.*

---

## 12. Pass 2d outcome — the corpus over-reported "ungated" by more than half

Pass 2d found that confirmation gates live in **four** mechanisms totalling 88
actions, and that most analysis agents checked only one or two of them:

| Mechanism | Declared | Installed | Active |
|---|---|---|---:|
| `installActionGates()` | L17853 | L18089 | 17 |
| `GATE_SPECS` | L18245 | L18383 | 17 (18 keys, 1 `null`) |
| standalone `guardAction(...)` | L18460-L21603 | in place | 9 |
| `GATE_SWEEP` | L20769 | L20903 | 45 (47 keys, 2 deleted) |
| | | | **88** |

**Result: 30 false "ungated" claims across 13 documents, plus 17 wrong-registry
citations in 6 more.** Genuinely ungated actions fall from the ~53 the corpus
asserted to **23**.

This is the most important accuracy correction in the cycle. Every one of those
30 claims read as a security or safety gap and was not one.

### 12.1 The asymmetry that survived — CONFIRMED

With the false positives removed, one finding becomes provable rather than
anecdotal. Checking `GATE_SWEEP` membership directly:

| Pair | `add` gated | `remove` gated |
|---|:---:|:---:|
| `addCity` / `removeCity` | ✅ | **✗** |
| `addCustomLimit` / `removeCustomLimit` | ✅ | **✗** |
| `addCustomGateway` / `removeGateway` | ✅ | **✗** |

Three for three: **creating a record is confirmed, deleting one is not** — and
in each pair the two functions sit within a line or two of each other. The same
shape appears in `commitSuspendAccount` (permanent, ungated) versus
`precautionSuspend` (reversible, `danger:true` gated at L20866): the *less*
reversible action is the *less* protected one, consistently.

That is a design-level finding about how the gate list was assembled — someone
worked down a list of "actions that create things" — and it is far more useful
than the 53 scattered claims it replaces.

### 12.2 The invariant that would have caught all of this does not exist — CONFIRMED

`L20751` names `audit_mut.js` as *"the deliverable"* that *"will fail the moment
somebody adds an ungated action."*

```
find . -name 'audit_mut.js'  →  0 files
```

The script is absent. So the same drift ran in both directions: **ungated
actions accumulated in the code, and false "ungated" claims accumulated in the
documentation about it** — because in both cases the check that was supposed to
be automatic was never written. Pass 2d is the manual substitute, run once.

### 12.3 Permission findings preserved

All four critical permission findings survive intact and were re-verified in
source: `resetBranding` (L18454), `rebuildAllHistory` (L18600), `approveRateCard`
(L21582), `commitUserSwitch` (L3098). Pass 2d improved the framing of the last
one: `commitUserSwitch` is behind a bespoke modal (`openUserSwitch`, L3088) and
is in **no** registry at all — which is worse than being registry-gated, not
better. Seven further permission-ungated actions were added to the same class.

**The distinction that had to hold, and did:** a *confirmation* gate is not an
*authorization* gate. Removing 30 false confirmation claims must not soften a
single permission finding, and it did not — where a correction removed the
confirmation half of a compound finding, the permission/audit/reversibility half
was rewritten to stand alone. One finding (`09a` #19) was strengthened.

---

## 13. A false "dead code" claim with a destructive consequence — CONFIRMED, count corrected

`16j-settings-activity.md` §10/§13 states the `stabgrp.*` Arabic translation
keys are dead. **They are not.** Acting on that document — deleting them as
unused — would remove live translations.

### The mechanism the document missed

`reorderSettingsTabs()` builds the settings group headers at runtime and binds
each one's translation key programmatically:

```js
L21290  SETTINGS_GROUPS.forEach(function(g){
L21293    var h=document.createElement('div');
L21294    h.className='settings-tab-group-lbl';
L21295    h.textContent=g.label;
L21296    h.setAttribute('data-i18n',g.i18nKey);   // ← key bound here, not in markup
```

A `grep` for `data-i18n="stabgrp.…"` in the HTML finds only the static three and
misses the five bound at runtime. That is exactly the blind spot: **this file's
translation keys are not all discoverable from markup.**

### Exact status of all 9 keys

| Key | Status | Evidence |
|---|---|---|
| `stabgrp.workspace` | **live** — static markup | `L1420` |
| `stabgrp.operations` | **live** — static markup | `L1424` |
| `stabgrp.system` | **live** — static markup | `L1436` |
| `stabgrp.comms` | **live** — runtime bind | `SETTINGS_GROUPS.i18nKey` → `L21296` |
| `stabgrp.money` | **live** — runtime bind | ″ |
| `stabgrp.people` | **live** — runtime bind | ″ |
| `stabgrp.platform` | **live** — runtime bind | ″ |
| `stabgrp.records` | **live** — runtime bind | ″ |
| `stabgrp.other` | **dead** — in `LANG_STRINGS`, in neither markup nor `SETTINGS_GROUPS` | — |

**8 of 9 live; exactly 1 dead.**

### Correction to the report that raised this

The extraction fragment described "six live translations" at risk. The accurate
figure is **five bound at runtime, three in static markup — eight live in total,
one genuinely dead (`stabgrp.other`)**. The fragment's conclusion was right and
important; its count was not, and a count is the whole basis on which someone
would decide what to delete.

### Why this is the most dangerous finding class in the corpus

Pass 2b found the first false negatives (7 of 107). This is another, and it
shows the asymmetry clearly: a false *positive* finding wastes an engineer's
afternoon; a false *negative* — "this is dead, remove it" — causes them to break
working behaviour with a confident citation in hand.

Everything in these documents asserting that something is dead, unused, never
called or never read should be re-verified before anything is deleted on its
authority — particularly where the consumer could be built at runtime rather
than declared in markup.

### 13.1 CORRECTION to §13 — my own table was wrong

The table in §13 is **incorrect and superseded by the one below.** Two errors,
both mine, found when a second extraction agent reached the same conclusion by a
different route and reported a detail I had missed.

**Error 1 — my regex silently truncated the key set.** I matched
`'stabgrp\.[a-z]*'`, which excludes underscores, so `stabgrp.daily_ops` never
appeared in my results. I counted 5 runtime keys; there are **6**. There are
**10** keys in total, not 9.

**Error 2 — I had the live/dead assignment backwards.** I marked the three
static-markup keys "live". They are not. `reorderSettingsTabs()` **deletes every
static group header before rebuilding**:

```js
L21286  /* …they rendered as three empty, purposeless headers stacked above
L21287     the real (regrouped) navigation. */
L21288  nav.querySelectorAll('.settings-tab-group-lbl').forEach(function(e){e.remove();});
L21290  SETTINGS_GROUPS.forEach(function(g){ … h.setAttribute('data-i18n',g.i18nKey); …
```

So the markup headers are destroyed at runtime and replaced by six built from
`SETTINGS_GROUPS` (L21270-21277). The source comment says so explicitly.

### Corrected status of all 10 `stabgrp.*` keys

| Key | Status | Evidence |
|---|---|---|
| `stabgrp.daily_ops` | **live** — runtime | `SETTINGS_GROUPS` L21271 → bind L21296 |
| `stabgrp.money` | **live** — runtime | L21272 |
| `stabgrp.people` | **live** — runtime | L21273 |
| `stabgrp.comms` | **live** — runtime | L21274 |
| `stabgrp.platform` | **live** — runtime | L21275 |
| `stabgrp.records` | **live** — runtime | L21276 |
| `stabgrp.workspace` | **dead** — markup header removed at L21288 | L1420 |
| `stabgrp.operations` | **dead** — removed at L21288 | L1424 |
| `stabgrp.system` | **dead** — removed at L21288 | L1436 |
| `stabgrp.other` | **dead** — in dictionary, in neither markup nor `SETTINGS_GROUPS` | — |

**6 live, 4 dead.** My §13 said "8 live, 1 dead" and identified the wrong three
as live.

### What survives from §13, and what does not

**Survives:** `16j`'s claim that the `stabgrp.*` keys are dead is still wrong —
six are live and would break if deleted. The standing caution about false
"dead code" claims stands, and is now better evidenced.

**Does not survive:** my specific table, and my correction of the fragment's
"six live" figure. **The fragment said six; six is right; I was wrong to
correct it.** My correction was based on a truncated grep and I asserted it with
a confidence the evidence did not support.

### The lesson, since I made the same class of error I had just warned about

§13 warns that dead-code claims must be re-verified because a consumer may be
built at runtime rather than declared in markup. I then produced a table that
missed exactly that — while checking a claim about exactly that — because my
character class excluded one character.

Two concrete practices follow, and they apply to every extraction in this
corpus:

1. **A regex is a claim about the data and needs its own verification.** Cross-
   check any pattern-derived count against a differently-derived total. Had I
   compared my 9 keys against the dictionary's own entry count, the gap would
   have surfaced immediately.
2. **Correcting a subagent's number requires more evidence than accepting it**,
   not less. The fragment had read `SETTINGS_GROUPS` directly; I had run a grep.
   I overrode a stronger method with a weaker one because mine was mine.

---

## 14. Security controls that are configurable but inert — CONFIRMED

Both settings in `#stab-security` can be set, are persisted, and are written to
the audit log. Neither has any enforcement path.

### 14.1 `sessionTimeoutMin` — 4 references, none of them a timer

```
L2572  security:{sessionTimeoutMin:30,require2FA:false}   ← seed
L8021  if(t)t.value=s.sessionTimeoutMin||30;              ← form load
L8026  var before={sessionTimeoutMin:s.sessionTimeoutMin, …}  ← audit snapshot
L8027  s.sessionTimeoutMin=Math.min(240,Math.max(5, …));  ← form save
```

No `setTimeout`, no `setInterval`, no activity listener, no session expiry
anywhere in the file. The value is clamped to 5-240 minutes with evident care and
then never consulted. **Setting it changes nothing.**

### 14.2 `require2FA` / `twoFA` — display only

`toggleMa2FA(val)` (`L3047`) sets `u.twoFA` and audits it. The value is read at
`L3022-3023` (the My Account toggle's own label) and by `renderTeamTable`
(`L10454-10456`), which paints a compliance chip. **No `can()` or `requirePerm()`
path consults it**, and no login or elevation flow exists to enforce it against.
A user shown as non-compliant retains every permission.

`toggleMa2FA` is also not `requirePerm`-gated and acts only on `CURRENT_USER_ID`
— and since `commitUserSwitch` (§2.1) lets anyone become anyone, "only your own
account" is not a boundary here.

Related: `commitInvite` (`L10538`) creates users with **no `twoFA` key at all**,
so every invited member is permanently rendered non-compliant.

### 14.3 Why this is its own finding class

These are not bugs in the sense of code misbehaving — the code does exactly what
it says. They are **controls that exist as configuration and not as behaviour**:
a settings screen that reports a security posture the system does not implement.

That is worse than the setting being absent. An operator who sets a 30-minute
session timeout and enables a 2FA requirement will believe both are in force, and
an auditor reading the activity log will find entries confirming they were
configured. The audit trail attests to a control that never existed.

This is the same shape as the four operations in §11 that announce success
without acting — the system's reporting layer is decoupled from its behaviour
layer, in both directions. It belongs in the same theme, and in a rebuild the
same rule closes both: **nothing may report a state it has not verified.**
