# Findings Register

> Consolidated from 60 module documents in `docs/01-modules/` | **188 distinct findings after dedup** (from ~470 raw reports)
> Source of truth for every line citation: `eyvar_ops_panel_v40_fixed.html` (21,857 lines, 1.58 MB, single file)
> Companion: `docs/02-verification/pass-1-coverage-review.md`

---

## 1. How to read this

### 1.1 Severity rubric

The rubric below is applied literally. It is deliberately narrow at the top so that "critical" stays meaningful.

| Severity | Definition | What does **not** qualify |
|---|---|---|
| **critical** | Moves money incorrectly, **loses data**, or **bypasses a permission / security control**. | A dead function. A wrong label. A stale badge. |
| **high** | A **displayed number is wrong**, or a **user-facing action silently does nothing** (the button appears to work; nothing happens). | Cosmetic colour mismatch. Missing empty state. |
| **medium** | Dead code, a missing audit entry, or **inconsistent behaviour between two surfaces** showing the same thing. | Anything already absorbed by a critical/high finding above it. |
| **low** | Cosmetic, i18n, demo-data / seed artefact, or a missing affordance (no sort, no search, no pagination). | - |

Deliberate de-escalations applied while merging:

- A **dead function is medium**, not high - even a security-sounding one (`planFloorCheck`, `reserveState`, `effectiveSurge`).
- A **missing audit entry is medium** - unless the same action also has no permission gate, in which case it rolls into the relevant critical access-control finding.
- **Zero persistence** is counted once (F-001) and is *not* re-charged against every module that observed it.
- "No confirmation dialog" is **medium** unless the action moves money or deletes a record, in which case it folds into F-007.

### 1.2 VERIFIED vs REPORTED

| Tag | Meaning |
|---|---|
| **VERIFIED** | Re-checked directly against `eyvar_ops_panel_v40_fixed.html` during this consolidation pass - the cited lines were read, or the cited grep was re-run. 34 findings carry this tag. |
| **REPORTED** | Carried forward from a module document without independent re-checking in this pass. The module doc's evidence and citations are reproduced as given. |

Nothing here was observed in a running browser. Every finding is static analysis. Where a module document itself flagged an item `UNVERIFIED`, that qualification is preserved in the finding text.

### 1.3 Identifiers

Ids are stable: `F-001` to `F-188`. They are grouped by severity (F-001-F-016 critical, F-017-F-064 high, F-065-F-140 medium, F-141-F-188 low) but the number carries no meaning beyond identity. Re-severity a finding without renumbering it.

---

## 2. Summary counts

### 2.1 Severity x verification

| Severity | VERIFIED | REPORTED | **Total** | Share |
|---|---:|---:|---:|---:|
| **critical** | 12 | 4 | **16** | 8.5% |
| **high** | 14 | 34 | **48** | 25.5% |
| **medium** | 7 | 69 | **76** | 40.4% |
| **low** | 1 | 47 | **48** | 25.5% |
| **Total** | **34** | **154** | **188** | 100% |

Verification effort was concentrated where it matters: **75% of critical findings and 29% of high findings were independently re-checked against source**, against 9% of medium and 2% of low. The 34 verified findings cover every claim in this register that asserts a permission bypass, a money movement, or a count.

### 2.2 By theme

Each finding is counted under exactly one **primary** theme, so the columns reconcile to 188. Section 7 lists ids by theme and additionally cross-references findings whose primary theme is elsewhere, so the id lists there are longer than these counts.

| # | Theme | Findings | Crit | High | Med | Low |
|---|---|---:|---:|---:|---:|---:|
| **T1** | No persistence, no network, no backend | 1 | 1 | 0 | 0 | 0 |
| **T2** | Access control declared but not enforced | 17 | 10 | 0 | 7 | 0 |
| **T3** | Money that does not move, or moves twice | 10 | 2 | 6 | 2 | 0 |
| **T4** | Displayed numbers that are wrong | 25 | 0 | 16 | 4 | 5 |
| **T5** | Actions that silently do nothing | 16 | 0 | 11 | 4 | 1 |
| **T6** | Audit trail gaps and integrity | 17 | 1 | 1 | 15 | 0 |
| **T7** | Dead code and dead data | 30 | 0 | 3 | 19 | 8 |
| **T8** | Configuration stored but never enforced | 6 | 0 | 2 | 4 | 0 |
| **T9** | Duplicate / disjoint models of one truth | 20 | 0 | 5 | 12 | 3 |
| **T10** | Staleness: render, refresh and boot order | 8 | 0 | 2 | 2 | 4 |
| **T11** | Injection, escaping and id hygiene | 1 | 0 | 0 | 1 | 0 |
| **T12** | i18n and localisation | 20 | 0 | 2 | 0 | 18 |
| **T13** | Data integrity: collisions, dangling refs, caps | 17 | 2 | 0 | 6 | 9 |
| | **Total** | **188** | **16** | **48** | **76** | **48** |

Two notes on this table. **T11 carries only one register id** (F-071) because the eleven separate raw-HTML-escaping reports were collapsed into a single theme entry rather than enumerated as findings - see section 7 (T11) and section 10.2. **T1 likewise carries one id** (F-001) because it is the frame rather than a defect class; the findings it causes are counted under T3 and T6.

### 2.3 Modules contributing the most distinct findings

| Module doc | Distinct findings |
|---|---:|
| `00c-identity-permissions-and-audit` | 21 |
| `00b-global-ui-systems` | 14 |
| `16k-audit-log` | 12 |
| `15k-settings-reason-codes-sla` | 11 |
| `08b-driver-onboarding-applicants` | 11 |
| `14a-pricing-plans` + `14b-plan-editor` (heavily merged) | 11 |
| `16h-settings-ledger` | 10 |
| `05b-corporate-accounts` | 10 |
| `00d-i18n-and-localisation` | 9 |

---

## 3. Critical findings

**16 findings. 12 VERIFIED, 4 REPORTED.** Each moves money incorrectly, loses data, or bypasses a permission or security control.

---

### F-001 - Zero persistence and zero network: every write is discarded on refresh

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T1
- **Modules:** all 60. Called out explicitly in `00b` 9.1/12.25, `13a` #17, `15a` #10, `15e` #11, `16f` #17, `16g`, `16h`, `12b` U1, `00d` F4.
- **Evidence:** `grep -c` over the source returns **0** for every one of `localStorage`, `sessionStorage`, `indexedDB`, `fetch(`, `XMLHttpRequest`. There is no `document.cookie`, no WebSocket, no `<form action>`. The whole application state is the in-memory `DB` object literal seeded around L2160-L2900 and mutated in place.
- **Impact:** Every approval, suspension, wallet adjustment, payout, permission grant, audit entry, settings change and captured snapshot is lost on reload. The panel's own gate copy repeatedly promises durability - *"Recorded in the activity log under your name"*, *"Applies to every operator immediately"* - and none of it survives a refresh. This is also why 40+ other findings exist: idempotency, reconciliation, trial balance and "audit trail" are all modelled client-side because there is nothing behind them.
- **Fix direction:** This is the **root-cause finding**. It is not fixable inside the artifact; it defines the boundary between "specification demo" and "product". Read every T1/T3/T6 finding as *"this is what the client-side model gets wrong, which a real backend would have to get right."* Until then, add a persistent visible banner stating nothing is saved - the file discloses this only for the logo (`gen.logo_note`, L1511) and never for language, permissions, or money.

---

### F-002 - `commitUserSwitch()` is a total RBAC bypass with no indicator and no way back

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2
- **Modules:** `00c` F3/F4/F8, `15b` #5/#11
- **Evidence:** `commitUserSwitch()` **L3098-L3114**, read in full. The function contains **no `can()` and no `requirePerm()`**. Its only guard is `if(nu.status==='Invited'){toast(...);return;}` (L3103). It then assigns `CURRENT_USER_ID=nu.id` (L3106) and repaints three DOM labels (L3107-L3109). It never sets `window.__realUserId`, never calls `renderImpersonationBar()`, and never calls `renderSidebarPerms()` (which does not exist - see F-100). The topbar avatar at **L578** is the trigger and is visible to every operator. `openUserSwitchGuardless(){}` at **L3114** is an empty stub with zero callers - a symbol whose name implies a deliberate guard bypass that was never wired up.
- **Impact:** Any operator - including a Support user holding 3 of 13 permissions - clicks the avatar and **becomes the Owner**, acquiring all 13 permissions including `manage_settings`, which guards 39 of the 131 permission checks in the file and is otherwise held only by `USR-1`. Because `__realUserId` is never set, the amber impersonation banner does **not** appear and there is **no "Back to my account" affordance**: the operator is silently someone else, with no visible indicator, and the only way back is a page reload - which under F-001 destroys all state. `logAction('switch_user',...)` records the switch, but nothing prevents it.
- **Fix direction:** Gate on `manage_team` at minimum. Route it through the same `__realUserId` + banner machinery `impersonate()` uses (L21067) so the state is visible and reversible. Delete `openUserSwitchGuardless`.

---

### F-003 - `impersonate()` is not permission-gated, and its audit promise is inverted

- **Severity:** critical | **Verification:** **REPORTED** (the `logAction` half VERIFIED at L3138) | **Theme:** T2/T6
- **Modules:** `00c` F5/F6, `15b` #5/#6
- **Evidence:** `impersonate()` **L21067** has no `requirePerm` - only a `guardAction` confirmation, which is UX friction, not authorization. That dialog's copy at **L21095** promises *"Any action you take is recorded against **your** name, not theirs."* But `logAction` reads the already-reassigned `CURRENT_USER_ID` (**L3138**, verified this pass), so every action taken while impersonating is attributed to the **impersonated** user. Only the `impersonation_started` / `impersonation_ended` pair carries the real operator - and both keys are among the 135 unlabelled action keys (F-017), so an auditor cannot filter for them. `nm2()` (L3565) searches only `DB.riders` and `DB.drivers`, so both impersonation summaries print the raw `USR-*` id instead of a name.
- **Impact:** Any operator can act as any other, including the Owner, and the audit trail names the victim rather than the actor. The single stated safety property of the feature is implemented backwards.
- **Fix direction:** `requirePerm('manage_team')` on `impersonate`. Make `logAction` write `actorId = __realUserId || CURRENT_USER_ID` plus an `onBehalfOf` field. Add `teamUsers` to `nm2()`'s search buckets.

---

### F-004 - 19 of 41 pages have no entry in the permission matrix at all

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2
- **Modules:** `00c` 5.1/F1, `02b` #1, `10a` #1, `13d` G14, `16k` #13, `12c`, `09b`
- **Evidence:** Re-counted this pass. `grep -oE 'id="p-[a-z0-9-]+"' | sort -u | wc -l` gives **41** page shells. `PAGE_PERMISSIONS` (L10564-L10655) declares **22** keys: `dashboard requests subscriptions quickrides trips renewal readiness live drivers riders coverage compliance safety growth zones predictive finance wallets plans support settings audit-log`. The **19 with no entry**: `exec-overview`, `corporate`, `corp-detail`, `fraud`, `rwallets`, `plan-edit`, `my-account`, `notifications-all`, `all-pending`, `applicant-detail`, `ticket-detail`, `profile`, `inbox`, `commitment`, `fairness`, `contacts`, `interventions`, `requests-sub-all`, `requests-instant-all`.
- **Impact:** `canPage('fraud', anything)` is always `false` and `defaultPagePerms()` never generates grants for it, so these pages are invisible in the permission-matrix UI at `#page-perm-matrix` (L1547) - an administrator cannot even see they exist. Materially sensitive members: **Rider Wallets** (money), **Fraud & Risk**, **Corporate Account detail** (billing), **360 Profile** (full PII for every rider and driver), **Applicant Detail** (KYC documents and bank details), **Contact Drivers** (phone numbers and SLA). This violates the file's own standing rule at **L10556-L10559**: *"any new page or major new action built into this panel gets an entry added here in the same change - permissions are not an afterthought bolted on later."*
- **Fix direction:** Add all 19. Make `go()` refuse to route to a page id absent from `PAGE_PERMISSIONS`, so the omission fails loudly at development time rather than silently at runtime.

---

### F-005 - 37 of 52 granular permission keys are never enforced, and the granular layer never feeds the broad layer

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2
- **Modules:** `00c` 5.2, `15c` #2/#3/#4/#5, `05a` #19, `10d` #5, `10e` #13, `14a` #25, `16k` #13
- **Evidence:** Re-counted this pass. `PAGE_PERMISSIONS` declares **52** granular `key:'...'` entries. `requirePagePerm(...)` resolves to exactly **15 distinct (page, action) pairs** file-wide: `compliance.edit_dates`, `coverage.assign_backup`, `coverage.promote_backup`, `growth.create_promo`, `growth.pause_promo`, `growth.recalc_tiers`, `growth.send_message`, `predictive.act`, `safety.close`, `safety.suspend`, `safety.update_steps`, `support.manage`, `wallets.cash_repayment`, `wallets.cash_review`, `zones.steer`. **37 keys have no enforcement point**, including *every* `view` key and several destructive ones: `requests.cancel`, `live.cancel_trip`, `subscriptions.settle`, `subscriptions.change_driver`, `drivers.approve`, `plans.edit`, `audit-log.view`. Separately, the broad key `view_profiles` is granted to all 5 seeded users and enforced at **zero** call sites, and `can()` has exactly one functional call site (L3084, deciding whether a button renders).
- **Impact:** Sync between the two layers is **one-way**. Unticking `wallets.process_payouts` in the matrix leaves the broad `process_payouts` in `u.permissions`, and `requirePerm('process_payouts')` still passes at every wallet commit. An administrator revokes a permission in the UI and it has no effect - precisely what the L10555-L10559 comment claims cannot happen.
- **Fix direction:** Make `can()` the single resolver, reading granular first and falling back to legacy. Then either add enforcement at the 37 open points, or delete the keys so the matrix stops advertising controls that do not exist.

---

### F-006 - No export is permission-gated; the audit log itself can be taken off-platform untraced

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2/T6
- **Modules:** `00c` 5.4/F10, `16f` #1/#5/#11, `07c` #19, `12a` G2
- **Evidence:** 13 export entry points contain **no `requirePerm` and no `requirePagePerm`**: `exportRiders` L7607, `exportDrivers` L7611, `exportSubscriptions` L7615, `exportPayments` L7619, `exportAuditLog` L7623, `exportInbox` L7627, `exportPushLog` L7631, `exportEmailLog` L7634, `exportSnapshots` L7665, `exportContacts` L15056, `exportIntegrity` L18617, `exportRequestsSnapshot` L9766, `doExport` L9204. The one action in that pane that *is* gated on `manage_settings` is `captureDailySnapshot` (L7646) - which merely appends a summary row. `exportRequestsSnapshot` (L9766-L9775) additionally calls **no `logAction`**, making it the only bulk data export in the panel that leaves no trace at all. `exportAuditLog()` is not itself audited (L7623-L7626) and ignores all active filters, always exporting the full array.
- **Impact:** A Support user holding 3 permissions and no `view_finance` can download the full payments ledger, the rider and driver roster with phone numbers and national IDs, and the complete tamper record. The pane's own footnote (L2035) promises accountability via the log; the log does not receive the event.
- **Fix direction:** Route every export through one gated helper. Require the page's own view permission plus a distinct `export_data` permission; log row counts (as `doExport` already does at L9145); never let `exportAuditLog` bypass its own record.

---

### F-007 - `guardAction` fails **open**: a builder exception runs the action ungated, and `__skipGuards` is a public global

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2
- **Modules:** `00b` 12.8-12.15, `07a` and `07c` UNVERIFIED notes
- **Evidence:** Read at **L17828-L17838**: `var spec; try{spec=builder.apply(null,args);}catch(e){spec=null;} if(!spec)return orig.apply(null,args);`. A thrown exception inside any of the 88 gate builders sets `spec=null`, and `if(!spec)` **executes the original, unguarded action**. Compounding, all from `00b` 12: (a) `window.__skipGuards` is a plain global that anything - a console line, injected HTML - can set to disable all 88 gates at once; (b) `guardAction` monkey-patches `window[name]` at load, so any code holding a reference captured *before* installation bypasses the gate entirely, and install order is spread over 5,000 lines; (c) the `__guardToken` re-entrancy window means a nested call to the same action during `onConfirm` also passes ungated; (d) the registry's own audit script `audit_mut.js` - named at **L20751** as *"the deliverable"* that *"will fail the moment somebody adds an ungated action"* - **does not exist in this repository**, so the invariant is unenforced.
- **Impact:** The confirmation-gate system is the panel's primary defence for money movement, penalties and deletions, and it degrades silently to no protection whenever a builder throws. Seven destructive actions are already ungated outright and fire on a single click: `removeCity`, `removeRideType`, `removeGateway`, `removeCustomLimit`, `removeEmployeeFromCorp`, `removeAvatar`, `commitUnflagAccount`.
- **Fix direction:** Re-throw, or at minimum refuse the action and surface an error - never fall through to `orig`. Make `__skipGuards` a closure variable. Write `audit_mut.js` or delete the comment claiming it exists.

---

### F-008 - Approving an applicant's document has no permission gate and writes no audit entry

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2/T6
- **Modules:** `08b` #2
- **Evidence:** `setDocStatus(appId,key,verdict)` **L10852-L10868**, read in full. The `verdict==='ok'` branch is four statements: `a.docs[key]='OK Verified'`, delete the note, toast, re-render. **No `requirePerm`. No `logAction`.** Its mirror `confirmDocReject` (L10869-L10882) has **both** - `requirePerm('approve_drivers')` on line 1 and a full `logAction('reject_document',...)` with populated `before`/`after`.
- **Impact:** An operator with no `approve_drivers` permission can mark every KYC document on every applicant verified, and the activity log records nothing. Combined with F-009 - approval reads none of these verdicts anyway - the document-verification workflow provides no control in either direction: the verdicts can be forged without permission, and the verdicts do not gate approval.
- **Fix direction:** Mirror the reject branch exactly: same gate, same audit entry, same `before`/`after` shape.

---

### F-009 - Driver approval reads none of the verification signals it displays

- **Severity:** critical | **Verification:** **REPORTED** | **Theme:** T2
- **Modules:** `08b` #3/#4/#5/#11/#16
- **Evidence:** `approveDriver()` **L11094-L11121** reads **none** of `a.docs`, `a.docNotes`, `a.docExpiry`, `a.bank.status`, or the vehicle-class verdict. Supporting defects make the display itself misleading: `applicantRowHTML` tests only `indexOf('OK')===0` and falls back to `b-amber` (**L10920**), so a **Rejected document renders identically to a pending one**; `confirmApproveDriver`'s warning counts rejected documents as *"pending automated verification"* using the same test (**L7168-L7170**), producing the soft *"you can still approve"* copy for a document explicitly refused as a suspected forgery. `saveDocExpiry` writes empty strings for blank inputs (L11035-L11038) and `approveDriver`'s `enteredExpiry[key] || defaultExpiry` (L11113) silently substitutes today+1 year for them.
- **Impact:** A mismatched vehicle class, an explicitly rejected licence, an unverified bank account and a fabricated one-year expiry can all be approved into `DB.drivers` with two clicks. The onboarding control surface exists entirely for display.
- **Fix direction:** Make `approveDriver` a hard block on any rejected doc, on `bank.status !== 'verified'`, and on a vehicle-class mismatch. Give rejected documents their own red badge so triage can distinguish "waiting on a scan" from "we refused this scan".

---

### F-010 - Record-id generators collide and silently overwrite live records

- **Severity:** critical | **Verification:** **REPORTED** (ranges re-derived from source) | **Theme:** T13
- **Modules:** `08a` #6, `08b` #6, `05b` #1, `07c` #4, `06b` #14, `16d` #5, `16e` #5, `16f` #13, `16g` #3
- **Evidence:** Five families, none with a uniqueness check:

| Generator | Line | Failure mode |
|---|---|---|
| `'DRV-0'+(106+floor(random()*90))` | L11098 / L11099 | Range `DRV-0106`-`DRV-0195`; **`DRV-0106` already exists** (L2666). A collision overwrites a live driver record and takes its trips, payments, complaints and stats with it. |
| `'CORP-'+String(len+1).padStart(3,'0')` | L6521 | Delete `CORP-001`, create a new account, and it regenerates `CORP-002`, overwriting the existing one. Contrast `finalizeNewSub` L5090, which *does* retry on collision. |
| `'SUB-'+(1200+rand(800))` | L9621 (`materializeSubscription`) | No collision check, unlike the renewal wizard's loop at L11441. |
| `500 + length + rand(400)` | L2488 (ride requests) | `DB.rideRequests` is an array with no index and no uniqueness check. |
| `'MAIL-'/'PUSH-'/'SNAP-'/'AUD-' + (length+1)` | L3579, L7742, L7648, L3136 | Non-monotonic; safe only while nothing is deleted. `AUD-` additionally collides permanently past the 500 cap - see F-015. |

- **Impact:** Data loss. The driver case is worst: a silent overwrite of an active captain's entire record with an applicant's, with no error, no toast, and no audit entry describing it as a replacement.
- **Fix direction:** One `newId(prefix, collection)` helper that loops until the key is free. Never derive an id from `length`.

---

### F-011 - Wallet credit and debit idempotency keys embed a 1-second timestamp, so a slower double-click pays twice

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T3
- **Modules:** `16h` #5
- **Evidence:** Read at **L19963** against **L19980 / L19994**. The refund path is deterministic and correct: `idemKey('refund',riderId,r2(amount),relatedId||reason||'')`. Both wallet paths are not: `idemKey('wallet_credit',riderId,r2(amount),reason||'',Math.floor(nowMs()/1000))` and the identical `wallet_debit` form. Including `Math.floor(nowMs()/1000)` makes the key **change every second**, so `withIdempotency` deduplicates only inside a single wall-clock second.
- **Impact:** A double-click 1.01 seconds apart issues **two wallet credits** and posts two `expense.goodwill -> liability.wallet` journal pairs. The module header cites a duplicate-refund incident as the motivation for the entire idempotency layer; the refund path was fixed and the two wallet paths were not. Real money out, twice, with a correct-looking ledger behind it.
- **Fix direction:** Drop the timestamp component. If a genuine repeat credit must be possible, key it on an explicit operator-supplied reference - as `refund` does with `relatedId` - never on the clock.

---

### F-012 - Rider money is gated behind a *contact* permission

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T2/T3
- **Modules:** `12c`, `09a` #19, `11a` 18.3 #5
- **Evidence:** `commitWalletAdjust(riderId,kind)` at **L3978** opens with `if(!requirePerm('contact_users'))return;` - read in full this pass. `contact_users` is described at L3255 as *"Call or message a rider or driver directly from their profile"* and is held by **Owner, Ops Manager and Support**. The function then credits or debits a rider wallet. The same permission gates `commitProcessReferral` (L3920), which pays a referral bonus to two parties. Meanwhile the finance-shaped permissions - `process_payouts`, `release_escrow`, `apply_deductions` - are held only by Owner and Finance and guard 6, 1 and 1 call sites respectively.
- **Impact:** A Support agent, whose role exists to answer tickets, can move arbitrary amounts into and out of rider wallets and pay referral bonuses. There is no amount ceiling on the modal beyond `compCheck`, which the automatic compensation path bypasses entirely (F-085). No finance-shaped permission is required anywhere in the rider-money flow.
- **Fix direction:** Gate `commitWalletAdjust` and `commitProcessReferral` on a money permission (`process_payouts`, or a new `adjust_wallet`), and keep `contact_users` for the messaging surfaces it was named for.

---

### F-013 - `demoDoubleRefund()` issues a real SAR 25 refund with no gate and no visual distinction

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T3
- **Modules:** `16h` #1
- **Evidence:** Read in full at **L20131-L20141**. No `requirePerm`, no `guardAction`, no confirmation. It calls `recordRefund(rid, 25, 'Duplicate-click test', 'demo', 'DEMO-1')` **twice** against `Object.keys(DB.riders)[0]` - a real rider record. `recordRefund` writes to `DB.refunds`, issues a credit note, and posts to the ledger. The result is visible on the Finance page as a genuine refund. Its trigger button (**L20104**) is styled identically to the safe diagnostic buttons beside it.
- **Impact:** A real SAR 25 refund and credit note against a real rider, issued by anyone who clicks a button that looks like a test harness. It is the only money-moving action in the file with neither a permission check nor a confirmation.
- **Fix direction:** Remove it from the shipped artifact, or gate it on `manage_settings` plus confirmation and mark the resulting refund `source:'demo'` so Finance can exclude it.

---

### F-014 - `saveReasonCodes()` destroys tier inheritance for all 40 reason codes on the first save

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T13
- **Modules:** `15k` #14
- **Evidence:** Read at **L15082-L15085** and **L15093-L15109**. The `fr` and `res` inputs are pre-filled with `tg.fr` / `tg.res`, which is `rcTargets()` output - i.e. the **resolved** value, inherited from the code's SLA tier when the code carries no explicit override. `saveReasonCodes` then writes every visible row back unconditionally: `else rc[f]=inp.value===''?null:parseInt(inp.value,10);`. Every inherited value is therefore **pinned as an explicit per-code override**.
- **Impact:** Structural data loss. The first time any operator presses Save on this tab - even to change one owner field, even to change nothing - all 40 codes stop inheriting. Afterwards, editing an SLA tier default (`T1.firstResponseMin`, and so on) silently moves nothing, because every code now carries a hardcoded copy of the old value. The inheritance model is destroyed irrecoverably, with no warning and no way to reset a code back to "inherit".
- **Fix direction:** Compare each input against `rcTargets()` output and write `null` when it still matches the tier default; or render a distinct "inherited" placeholder rather than a pre-filled number.

---

### F-015 - The 500-entry audit cap silently destroys history, and every entry past it collides on `AUD-0501`

- **Severity:** critical | **Verification:** **VERIFIED** | **Theme:** T6/T13
- **Modules:** `00c` F17/F18, `16k` #4/#6, `16j` #12
- **Evidence:** `logAction` read in full at **L3133-L3151**. Ids come from `'AUD-'+String(DB.auditLog.length+1).padStart(4,'0')` (L3136), and the array is truncated by `if(DB.auditLog.length>500)DB.auditLog.length=500;` (L3146). Once pinned at 500, `length+1` is always 501, so **every subsequent entry is `AUD-0501`**. The free-text search (L9330) includes `e.id` in its haystack, so searching an id after truncation returns an unbounded result set. There is no warning, no archive, no export prompt, and no UI indication that truncation occurred. `settingsLastUpdated` (L7336) silently reverts to *"No changes recorded yet"* when a section's entry ages out.
- **Impact:** The tamper record is the evidence of last resort for every other finding in this register, and it is a 500-slot ring buffer that overwrites itself without saying so. `config_updated` alone fires at **40 call sites**, so a single settings-heavy session can push genuine security events - `account_suspended`, `impersonation_started`, `toggle_page_permission`, `erasure_executed` - off the end. After truncation, ids stop identifying entries.
- **Fix direction:** Monotonic counter for ids (`DB.__auditSeq++`), never `length`. Warn at 80% of the cap, offer an export before truncating, and never truncate security-relevant keys.

---

### F-016 - Team members can never be offboarded, and the last `manage_team` holder can be stripped

- **Severity:** critical | **Verification:** **REPORTED** | **Theme:** T2
- **Modules:** `15b` #1/#2/#3/#12, `15c` #6, `00c` F12/F16/F26/F27
- **Evidence:** `DB.teamUsers` is only ever `push`ed to (L10540) and mutated in place - **no function removes, suspends, or ends access for a team user**. `Invited` is a terminal state nothing transitions out of, yet `can()` reads `permissions` with no status check (L3123), so an "Invited, never logged in" account is functionally identical to an active one for RBAC. The self-lockout guards are incomplete: `toggleRolePermission` (L10780) and `saveUserPermissions` (L10820) block a user revoking their **own** `manage_team` (and log nothing when they do), but `togglePagePermission` (L10687) has **no self-guard at all**, and neither guard prevents a *different* `manage_team` holder from stripping the last Owner. `manage_settings` guards 39 of 131 permission checks and is held by `USR-1` alone. `renderRoleMatrix` / `renderPagePermMatrix` derive their columns from live user data (L10718, L10753), so a role whose last holder is edited away disappears from the matrix entirely and its permission set becomes unreachable.
- **Impact:** An offboarded employee retains full panel access permanently. Conversely, two clicks by a second `manage_team` holder can strip the sole `manage_settings` holder, after which **no city, gateway, dispatch radius, security policy, branding, legal version, retention window, SLA policy, on-call rota or GDPR erasure can ever be changed by anyone** - and there is no delete/restore path to recover.
- **Fix direction:** Add deactivate/revoke. Treat `Invited` as permission-less until first login. Add a global invariant that refuses any write leaving zero holders of `manage_team` or `manage_settings`. Audit both self-lockout refusals.

---

## 4. High findings

**48 findings. 14 VERIFIED, 34 REPORTED.** Each either makes a displayed number wrong, or makes a user-facing action silently do nothing.

---

### F-017 - 135 of 161 audit action keys have no label, so 84% of audited activity is unfilterable

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T6
- **Modules:** `00c` 5.3/F2, `16k` #1, restated per-tab in `14a` #9, `14b` #7, `15g` #9, `15h` #9, `15i` #12, `15j` #13, `15k` #21, `16a` #10, `16b` #11, `16c` #10, `16d` #13, `16e` #11, `00d` F15
- **Evidence:** `var ACTION_LABELS` at **L2898-L2913** contains exactly **26** keys (read this pass). There are **161 distinct `actionKey` literals** across **220 real `logAction()` call sites**. `DB.actionLabels` occurs **0** times file-wide, so `ACTION_LABELS` is the only source. The Activity Log "All action types" filter is built from `Object.keys(ACTION_LABELS)` (L9238), so the 135 unlabelled keys cannot be selected. Among them: `impersonation_started`, `impersonation_ended`, `toggle_page_permission`, `change_password`, `toggle_2fa`, `log_out_session`, `erasure_executed`, `account_suspended`, `auto_suspend`, `precaution_suspend`, `rate_card_self_approval_blocked`, `edit_data_window`, `legal_version_published`, `history_rebuilt`, and `config_updated` - the highest-volume key in the file at 40 call sites.
- **Impact:** The filter reaches 26 keys covering roughly 31 of 220 call sites, i.e. **14% of audited activity**. An auditor investigating a privilege change, an impersonation, or a settings edit cannot filter for it. Note the asymmetry: `toggle_role_permission` **is** labelled (L2903) while its granular twin `toggle_page_permission` is not - the two halves of one screen are filterable and unfilterable respectively.
- **Fix direction:** Generate `ACTION_LABELS` from the key set, or validate `actionKey` against the map at write time so a new unlabelled key fails loudly. `entry.action` is also never displayed anywhere (F-101); fixing both together is one change.

---

### F-018 - `d.docStatus` is never assigned, so "Documents at risk" is permanently 0 and contradicts Compliance

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T4/T9
- **Modules:** `08a` #1, `10d` #1, `08b`
- **Evidence:** `grep docStatus` returns exactly four hits, re-run this pass: **L6380** (Drivers table filter `d.docStatus==='expiring'||d.docStatus==='expired'`), **L7093** and **L10847** (the unrelated `docStatusMeta`, an applicant-verification verdict), and **L20925** (`fleetCounts()` computing `drivers.docsAtRisk`). There is **no `docStatus:` property in any `DB.drivers` literal and no `.docStatus =` assignment anywhere in 21,857 lines.** The real expiry truth lives only in `DB.driverDocs` (L13278) and is reachable only through `docDaysLeft` / `docState` / `complianceScan`.
- **Impact:** The Drivers page "docs" filter always yields **zero rows**, and the "Documents at risk" KPI is **permanently 0** with its "will auto-suspend on expiry" copy never shown - while the Compliance page, the only surface reading the real data, simultaneously reports "Expired - suspended: 1". Two pages state contradictory facts about the same fleet.
- **Fix direction:** Derive `docStatus` from `complianceScan()`, or replace both readers with `docState(docDaysLeft(...))`. Do not add a new field with a third writer.

---

### F-019 - No driver record has a `.status`, so "Pending approval" is structurally 0 above a card showing 5

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T9
- **Modules:** `08a` #2, `08b` #20
- **Evidence:** All six seeded drivers (L2632-L2667) omit `status`, and `approveDriver()` (L11098) does not set it. So `status!=='pending'` (L6346) is a no-op filter, and `fleetCounts().drivers.pending` (L20930) is always **0**. The amber pending card immediately above reads its count from `DB.pendingDrivers[*].status` (L10898) and shows 5.
- **Impact:** Two "pending" numbers on the same screen, from different collections, that can never agree. The register KPI is not merely wrong - it is structurally incapable of being right.
- **Fix direction:** Point `fleetCounts().drivers.pending` at `DB.pendingDrivers`, or delete the tile.

---

### F-020 - Literal `NaN%` renders in the Executive Overview "Avg renewal rate"

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T4
- **Modules:** `01` #1
- **Evidence:** **L6931**, read this pass: `parseInt(st.renewalRate,10)` is applied to the rider's display string, and the guard that follows is `.filter(function(x){return x!=null;})` - which does **not** filter `NaN`. `NaN` then propagates through the `reduce`. It fires with shipped seed data: active `SUB-1052` maps to rider `RDR-2031`, whose `stats.renewalRate` is the em-dash string (L2687, L2606).
- **Impact:** The company-wide renewal-rate figure on the executive page renders as `NaN%` out of the box.
- **Fix direction:** `Number.isFinite` in the filter; store `renewalRate` as a number with a separate display formatter.

---

### F-021 - The Work Inbox routes 11 of 12 queues to a role that does not exist

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T5
- **Modules:** `03b` #1, `15b` #10, `15k` #13
- **Evidence:** `WORK_ROUTING` **L19091-L19102** routes 11 of 12 queues to `'Operations'`. The role vocabulary is `['Owner','Ops Manager','Finance','Support']` - `TEAM_ROLES` (L10501) and the seeded `DB.teamUsers` (L2831-L2840). `'Operations'` matches no user. The same mismatch recurs in `DB.compPolicy.roles` (L15382), where `'Operations'` carries a 200 SAR/case ceiling while the real `Ops Manager` falls through to `default` at 50 SAR - a *lower* ceiling than Support's 75.
- **Impact:** An **Ops Manager sees an empty inbox** with the role filter on. Every item in the queue is invisible to the role that owns it.
- **Fix direction:** One canonical role list referenced by `WORK_ROUTING`, `TEAM_ROLES`, `DB.compPolicy.roles` and the matrix columns.

---

### F-022 - `reviewDriver()` is a pure stub reachable as the primary Escalate action

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T5
- **Modules:** `08a` #4, `09b` #11
- **Evidence:** **L8995-L9003**, read in full. The modal renders hardcoded finding text ("Late 3x consecutive, on-time rate dropped to 88%") and a four-option select (`warning` / `suspend` / `reassign` / `clear`). The Apply button is `onclick="closeModal();toast('Review action applied','ok')"`. The selected value is **never read**. No `requirePerm`, no `logAction`, no DB write.
- **Impact:** It is the `Escalate` action on every complaint profile (L4374) and a primary driver action (L4110), and it offers "Temporary suspension" on a button styled `danger`. An operator suspends a driver, sees a success toast, and nothing happened - to the driver, to dispatch, or to the audit log.
- **Fix direction:** Implement it against `commitSuspendAccount`, or remove the modal and route Escalate to the real suspension flow.

---

### F-023 - `sendBulkMsg()` sends nothing

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T5
- **Modules:** `11a` 18.1 #6/#7
- **Evidence:** Read in full. The function validates the textarea and then does exactly two things: `logAction('bulk_message',...)` and `toast('Sent to N recipients ...')`. There is **no `DB.pushOutbox` write, no `DB.emailOutbox` write, and no recipient resolution** - despite `sendPushNotification` (L7735) and `sendBroadcast` (L7694) existing in the same file and doing exactly that. The `bm-ch` channel choice affects only the audit summary string. `MSG_SEGMENTS` counts are static and never recomputed, though `broadcastAudienceCount` (L7673) and `pushAudienceIds` (L7711) exist.
- **Impact:** A growth operator composes and "sends" a campaign to a named segment, sees a success toast quoting a recipient count, and no message is created anywhere.
- **Fix direction:** Route it through `sendSystemEmail` / `sendPushNotification` per channel; resolve recipients through the existing audience helpers.

---

### F-024 - There is no promo redemption engine; a promo's `discountPct` never touches a fare

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5/T4
- **Modules:** `11a` 18.1 #1-#5
- **Evidence:** Every `discountPct` reference outside L13495-L13560 belongs to the subscription-plan cadence discount (`CADENCE_META`, L4521), not to promo codes. Nothing matches a code against a fare, a subscription price, or a payment. `spent`, `uses` and `newSubs` are **never incremented** - only `contributionMargin()` (L15725) reads `spent`. No code sets `status='exhausted'` or `'expired'`; both exist only in seed data. `perUserLimit`, `target` and `expires` are inert - no validation, no matching, no clock comparison. `target:'Specific zone'` (L13540) has no zone selector and stores the literal string.
- **Impact:** Burn %, ROI and the ROI colour are frozen at seed values for seeded promos and permanently `0` / `0.0x` for anything created in-session. The card note (L1270), the modal note (L13542) and the source comment (L13489-L13493) all assert auto-pause behaviour that does not exist.
- **Fix direction:** A missing subsystem, not a bug. Either build redemption, or relabel the page as a campaign registry and remove the ROI columns.

---

### F-025 - `commitSettlement()` moves no money and falsifies its own audit `before`

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T3/T6
- **Modules:** `05a` #6/#7
- **Evidence:** **L3684-L3695**, read in full. It computes `computeSettlement(...)`, sets `sub.status='Cancelled'`, writes an audit line whose summary quotes exact rider-back and driver-pay amounts, toasts, and pushes a notification claiming *"Driver payout ... queued"*. It calls **no `recordRefund`, no `creditRiderWallet`, and no payout function** - unlike `confirmCancelSub` (L5560-L5561), which does. Its audit `before` is hardcoded `{status:'Active'}` (L3692) even when settling an `Expiring` or `Frozen` subscription.
- **Impact:** The rider refund and the driver payout described in the toast, the notification and the audit summary never happen. The audit entry additionally records a prior state that may be false.
- **Fix direction:** Call the same money paths `confirmCancelSub` uses; snapshot the real `sub.status` for `before`.

---

### F-026 - `resolveDispute()` moves no money and discards the options its own gate collected

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T3/T5
- **Modules:** `13b` #3/#4/#5
- **Evidence:** `resolveDispute` (**L14431-L14446**) computes `amount` (L14436) then only flips `status`/`outcome` and writes an audit line (L14440-L14444). No `recordRefund`, no wallet adjustment, no credit note, no email - despite the gate copy at L17878-L17881 promising a credit *and* a credit note. The gate's `notify` and `note` values land in `window.__confirmValues` (L17836) and are **never read**, so "Notify the claimant" does nothing and the internal note is lost. `d.outcome` is never rendered afterwards - upheld, rejected and goodwill all show the same green "Resolved" badge.
- **Impact:** A dispute is resolved in a rider's favour, the operator sees the amount on screen, and no money moves and no one is notified.
- **Fix direction:** Wire `resolveDispute` to `recordRefund` / `creditRiderWallet`, read `__confirmValues`, and render `outcome`.

---

### F-027 - `finalizeReassign()` applies no compensation and mislabels the one it did not apply

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T3/T5
- **Modules:** `07b` #1/#2/#3, `08a` #7/#8
- **Evidence:** The label map at **L13122** is keyed `{free, '-20off', credit, none}` while the option's `data-comp` value at **L13112/L13114** is `'20off'` - and `'20off'` is the *default selected* option. `labels[comp]` is therefore `undefined` for the most common case, and `labels[comp] || comp` (L13129-L13130) falls through to the raw string, so the toast and the audit entry read `Compensation: 20off`. More importantly the function writes **nothing** to the rider wallet, no promo, no credit note - only an audit line and a toast (L13126-L13130). It also has **no permission gate**, unlike the `confirmReassign` step preceding it (L13096).
- **Impact:** The operator selects "20% off next renewal", is told it was applied, and nothing is applied - to the rider, to the subscription, or to any ledger.
- **Fix direction:** Fix the key, apply the compensation through the wallet/promo paths, and gate `finalizeReassign` as `commitLiveReassign` is gated.

---

### F-028 - Live reassign and live cancel write `DB.liveTrips` and never `DB.trips`

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T9/T4
- **Modules:** `04` #6, `06a`
- **Evidence:** `commitLiveReassign` (**L11795-L11803**) and `confirmCancelLiveTrip` (**L11825-L11845**), both read in full. The first sets `t.driver=drvId` on a record found in `DB.liveTrips`; the second `splice`s the record out of `DB.liveTrips`. Neither touches `DB.trips[id]`. The historical record therefore keeps its old driver and its `In trip` status.
- **Impact:** After either action the Live-Map history table and the All Trips page disagree with the live board about who drove the trip and whether it happened. `commitLiveReassign` additionally toasts *"rider notified"* (L11802) with no send anywhere in the function.
- **Fix direction:** Mirror every live mutation into `DB.trips`, or make the history views read from a single derived source.

---

### F-029 - The Quick Rides KPI strip is four hardcoded numbers sitting above a live table

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `06b` #1/#2
- **Evidence:** **L1135-L1138**: four tiles with hardcoded values, hardcoded deltas (`up 9% vs avg`, `4 cancelled`, `20% avg`) and hardcoded bar widths. Real equivalents for three of the four exist elsewhere in the file (L21252-L21256, L9400) and are never wired in; the deltas have no computable source at all. Compounding: the card title (L1142) and the page prose (L1133) both claim "today", but `renderQuickRidesTable` applies **no date filter** (L3443).
- **Impact:** The most prominent numbers on the page are fiction, presented in the same visual language as the live table beneath them, and scoped to a day the table does not filter by.
- **Fix direction:** Bind the three computable tiles to their existing sources; delete the fourth and the deltas; either apply a date filter or drop "today" from the copy.

---

### F-030 - The Finance page headline KPIs are hardcoded and mutually inconsistent

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `12a` U1/U2, R12
- **Evidence:** The KPI figures (`48,230`, `9,246`, `38,984`, `6,420`, `501.98`, `362.58`, `65.00`) have no computation anywhere in the file and no source comment; the module doc could verify only their mutual inconsistency. The *Revenue by plan* percentages (20 / 18 / 15 / 18.1) coincide with `DB.plans[*].eyvarPct` at L2890/L2892/L2894 but the table is static HTML with no binding. Separately `DB.payments` has **no runtime writer** at all - it is seed literals plus per-entity id arrays.
- **Impact:** The company's revenue, commission and net figures on the Finance page are static text that does not respond to any transaction in the panel, and the numbers do not reconcile with each other.
- **Fix direction:** Compute from `DB.payments` / `DB.refunds` / the ledger, or mark the tiles explicitly as illustrative.

---

### F-031 - Plan `status` has no effect on what riders can buy

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T8/T5
- **Modules:** `14a` #2/#13, `14b` #1/#19
- **Evidence:** `renderNewSubModal()` iterates `Object.keys(PLANS)` (**L4571**) - the frozen constant - never `DB.plans`, and never checks `status`. The Activate modal promises *"the plan appears in the renewal flow and new-subscription form"* (L5952) and the Deactivate modal promises *"hides this plan from new subscriptions"* (L5972). Neither is true. `doArchivePlan()` only sets `status='Archived'` (L6170) and `renderPlansTable()` still renders the plan with an Activate button (L5934, L5940) that flips it straight back. The plan editor's Status dropdown is a complete no-op: `savePlan()` (L6117-L6149) never reads `#fp3-status`, and `status` appears in neither the `before` snapshot nor the write block.
- **Impact:** Deactivating or archiving a plan changes nothing that a rider can see. "Archived" is behaviourally identical to "Draft", and the editor's Status control cannot change a plan's status at all.
- **Fix direction:** Make the new-subscription and renewal flows read `DB.plans` and filter on `status==='Active'`; make `savePlan` read the status field; remove archived plans from the Activate path.

---

### F-032 - Four disjoint pricing models coexist, with four different Economy per-km rates

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T9
- **Modules:** `14a` #1, `12a` U2, `16b` #2/#3, `16g`, `06b` #11, `05a` #8
- **Evidence:** Four independent models, confirmed by grep this pass:

| Model | Where | Economy per-km |
|---|---|---|
| `DB.plans[*].ecoKm` (Pricing & Plans page) | L2890 | **1.10** |
| `DB.quickRideTypes.economy.perKm` (quick rides) | L13909 | **1.10** |
| `DB.rateCard.classes.economy.perKm` (Settings > Pricing) | L21439 | **1.20** |
| `buildFareBreakdown` inside `reconstructHistory` | L18657 | **1.35** |

Plus `PLANS` + `CADENCE_META` + `CADENCE_DAYS` (L4389, L4519, L11231) as a fifth frozen constant driving the new-subscription and renewal flows. Editing a plan on the Pricing page changes **only** `commissionRateForPlan()` (L4463) and the dashboard cancel-cap alert (L10366). Commission is equally split: the All-Trips table uses a flat `EYVAR_COMMISSION_PCT=20` (L3612) while the subscription profile uses `DB.plans[key].eyvarPct` (18% biweekly, 15% monthly, L4461); `reconstructHistory` hardcodes `driverEarn = fare * 0.8` (L18755) against the rate card's stated 22% on-demand commission (L21447).

- **Impact:** The same Economy trip is priced four different ways depending on which surface computes it, and reconstructed history is systematically 2 percentage points high on driver earnings. For `SUB-1052` the table implies 80% to the driver and the profile implies 82%. No screen agrees with the "live" rate card, which prices nothing (`effectiveSurge()` and `planFloorCheck()` both have zero call sites - F-095).
- **Fix direction:** Elect one model - `DB.rateCard` is the most complete - and make every other surface a reader of it. This is the largest single consistency debt in the file.

---

### F-033 - `renderDriverCircuit()`'s mount point is unreachable, so the circuit feature and `DB.circuits` never render

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T7/T5
- **Modules:** `08a`, `04`
- **Evidence:** `grep -n circuit-driver-select-wrap` returns exactly **one** hit, at **L6316** - which is `var wrap=document.getElementById('circuit-driver-select-wrap');` inside `renderDriverCircuit()`'s own body. The element is never created in markup and never injected by any renderer. `DB.circuits` is read only at L6315 and L6318, both inside the same unreachable function.
- **Impact:** The driver-circuit view can never draw. `DB.circuits` is dead data with a full renderer behind it.
- **Fix direction:** Add the mount element to the Drivers or Live page, or delete the function and the data.

---

### F-034 - `renderOnCall()` targets `#oncall-body`, which does not exist, killing the whole simple-rota feature

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T7/T5
- **Modules:** `16i` #1, `15k` #8
- **Evidence:** `grep -c oncall-body` returns **1** - the `getElementById` at **L15790** inside `renderOnCall()` itself. The card was replaced by the rota signpost at L1807-L1813 and the element removed. `renderOnCall()` is nevertheless still called on every settings open (**L8819**). Consequently `saveOnCall()` (L15799), `onCallNameSimple()` (L15785) and the entire `DB.onCall` object (L15776) are unreachable, and `GATE_SPECS.saveOnCall` (L18334-L18338) can never fire.
- **Impact:** An entire Primary/Secondary on-call roster feature - data, renderer, save path and confirmation gate - is dead, while its render function runs on every settings page load.
- **Fix direction:** Delete `DB.onCall`, `renderOnCall`, `saveOnCall`, `onCallNameSimple` and the gate spec; the rota system at L19605+ supersedes them.

---

### F-035 - The entire Leaflet/OSM map layer is dead, while two render-blocking CDN resources load on every page view

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T7/T1
- **Modules:** `04` #2/#3, `00b` 8.1/12.22/12.23
- **Evidence:** `grep -n map-leaflet` returns four hits and **none of them is a markup id**: L349 (an orphan CSS rule), L11514 (a comment), L11571 and L11573 (`getElementById` / `L.map(...)` inside `initLeafletMap`). `grep -n 'renderLiveMap|initLeafletMap'` shows `renderLiveMap()` at L11632 with **zero callers**, and `initLeafletMap()` called only from it. Meanwhile **L469-L470** load `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` and `.../leaflet.js` synchronously in `<head>` - no `defer`, no `SRI`, no `crossorigin`, no local fallback. About 120 lines of dead map code remain (L11526-L11635), including a second OSM tile URL that is never fetched. `#live-last-update` (L775) is permanently empty because its only writer, `updateLiveMarkers()` (L11582), returns on line 1 while `_lmap` is null.
- **Impact:** Two third-party render-blocking requests on every single page view, plus a CSP that cannot be tightened, for a feature that cannot execute. The panel's real map is a hand-drawn canvas.
- **Fix direction:** Delete L469-L470, L349, and L11526-L11635.

---

### F-036 - `#new-riders-count` is a hardcoded `3` with no JS writer

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T4
- **Modules:** `09a`, `00a` 14
- **Evidence:** `grep -n new-riders-count` returns exactly **one** hit: **L911**, the static markup `<span class="b b-blue" id="new-riders-count">3</span>` beside the "New sign-ups" card header captioned *"Registered in the last 24-48 hours"*. No renderer writes it.
- **Impact:** The new-signup count is a literal that never changes, even as riders are promoted out of `DB.newRiders` (which `openNewRiderProfile` never does anyway - F-089).
- **Fix direction:** Write it from `DB.newRiders.length` in `renderRidersTable()`.

---

### F-037 - Notification types `'warn'` and `'ok'` are emitted by 11 producers and declared nowhere

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T4/T9
- **Modules:** `03c` #1
- **Evidence:** `notifIcon`'s map at **L2172** is `{alert, ticket, renewal, approval, payout, complaint, success, warning, error, info}` - re-read this pass. Neither `warn` nor `ok` is present, and neither appears in `notifPriority` (L2191-L2199). Yet 11 producers emit them: L4777, L4838, L4847, L5112, L5120, L10277, L12005, L12439, L12453, L15887, L16719. The correct spellings (`warning`, `success`) exist and are used by the toast bridge at L5293.
- **Impact:** Those 11 notifications silently degrade to the generic bell glyph and `low` priority, sinking to the bottom of the notifications page. Several are operational warnings that were meant to surface first.
- **Fix direction:** Alias `warn -> warning` and `ok -> success` in both maps, then fix the 11 call sites.

---

### F-038 - Legal consent can never be granted; compliance is 0% at boot and monotonically non-increasing

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5/T4
- **Modules:** `16c` #1/#2/#3
- **Evidence:** The lazy-seed comment at **L3778** claims each user is seeded on *"the version that was live around when they joined"*; **L3790** unconditionally picks `versions[0]` after reversing - the **oldest** version. `entity.joined` is used only for `acceptedAt`. No code path anywhere writes `entity.consents[docKey].version` after that lazy seed (the only write is L3792) - there is no "mark accepted" action, no app-side simulation, no admin override. Additionally `renderLegalConsent` counts only `DB.riders` (L3807) for both ToS and Privacy, although `getUserConsent(entity, true)` seeds both for drivers (L3788) and the driver profile renders them (L4157-L4158).
- **Impact:** All three legal-compliance badges render red at 0% out of the box and can never improve. Driver ToS/Privacy consent is stored and displayed but excluded from every compliance count and every reminder.
- **Fix direction:** Seed against the version live at `joined`; add an acceptance path; include drivers in the count.

---

### F-039 - The Quick Rides "Review" button does nothing

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5
- **Modules:** `06b` #4
- **Evidence:** `resolveAlert` (**L10576**) fades the row and toasts. No DB field is written, no audit entry is made. The row returns on the next render.
- **Impact:** An operator reviews an exception ride, the row disappears, and it comes back - with no record that anyone looked at it.
- **Fix direction:** Write a `reviewedBy`/`reviewedAt` pair and filter on it, or remove the button.

---

### F-040 - Applicant rejection promises a notification that is never sent

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5
- **Modules:** `08b` #7
- **Evidence:** The rejection modal says *"This applicant will be notified"* (**L11089**), but `rejectDriver()` (**L11122-L11134**) calls no `sendSystemEmail` and no `pushOpsNotification`. Only the approval path sends mail.
- **Impact:** A rejected applicant is never told. The operator believes they were.
- **Fix direction:** Send the rejection email, or remove the promise from the modal copy.

---

### F-041 - Two incompatible applicant document sets, so half the documents can never be inspected and half can never expire

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T9
- **Modules:** `08b` #1
- **Evidence:** `a.docs` (**L2717**) uses `license, id_card, vehicle_reg, background, insurance`. `DOC_TYPES` (**L13277**) uses `license, vehicle_reg, inspection, insurance, operating_card`. `id_card` and `background` are visually verifiable but never get an expiry date; `inspection` and `operating_card` get an expiry date but can never be visually inspected, approved, or rejected.
- **Impact:** The compliance engine and the onboarding screen are auditing two different document sets, and neither covers the whole of the other. `DRV-0106` additionally has no `DB.driverDocs` entry at all, so it is invisible to `complianceScan()` and can never be auto-suspended.
- **Fix direction:** One document vocabulary shared by onboarding and compliance.

---

### F-042 - `openSuspendSurge()` offers array indices as zone names, and suspensions are recorded against them

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T13
- **Modules:** `16g` #1, `11b` 18.2
- **Evidence:** `DB.zones` (**L13952-L13959**) is an **array** of `{name, demand, supply, failures30d}`. **L21721** does `Object.keys(DB.zones||{}).slice(0,8)`, which on an array yields the index strings `["0","1","2","3","4","5"]`. The intended `['RUH-CENTRAL','RUH-NORTH']` fallback never fires because the array is non-empty. The correct expression is `DB.zones.map(z=>z.name)`.
- **Impact:** The surge-suspension dropdown offers `0` through `5`, and every suspension is stored with `zoneId:"0"` etc. Suspensions can never be matched back to a real zone - and `effectiveSurge()`, the only function that would read them, has zero call sites anyway (F-095).
- **Fix direction:** `DB.zones.map(z => z.name)`; add a shape assertion so an array/object mix-up fails loudly.

---

### F-043 - A precautionary suspension can never be lifted

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5
- **Modules:** `10e` #4, `10d` #8
- **Evidence:** `precautionSuspend` (**L13468**) writes a reason string beginning `"Precautionary"`. The **only** deletion site for `DB.complianceSuspensions` in the entire file is Compliance's auto-lift at **L13312**, which requires the reason string to start with `"Expired"`. `closeIncident` (L13475-L13485) never touches `DB.complianceSuspensions`. The reverse also breaks: a driver already precautionarily suspended who *then* has a document expire keeps the precautionary reason (guard `!DB.complianceSuspensions[d]` at L13306), so the expiry is never recorded and the auto-lift never matches.
- **Impact:** A driver suspended pending an investigation is cut out of dispatch **permanently for the life of the session**, with their income stopped, and no operator has any control to reinstate them. Closing the incident does not help.
- **Fix direction:** Store a structured `{kind, reason, incidentId}` instead of a prefix-matched string; lift on `closeIncident`; allow multiple concurrent suspension reasons.

---

### F-044 - Nothing can create an incident, a dispute, or a lost-and-found record

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5
- **Modules:** `10e` #2/#3, `13b` #1/#2/#6
- **Evidence:** `DB.incidents` is only ever `.find()`-ed (L13450, L13469, L13477) and `.filter()`-ed - there is no `push`, no "log incident" button, no SOS ingestion path. The three seeded records are the entire universe, and there is no way to reopen a closed one despite the confirm text at L13480 explicitly promising *"reopen it manually if new information comes in later"*. Identically, `DB.disputes` is seeded at L14390 and only read - no `newDispute`, no push - and `DB.lostFound` is seed-only (L14451) despite the `TRP_LOST_ITEM` reason code existing on tickets.
- **Impact:** Three operational queues - safety incidents, rider disputes, lost property - can receive nothing. In a live system they would be permanently empty. The `resolveDispute` and `advanceLF` machinery below them can only ever operate on demo seeds.
- **Fix direction:** Add creation paths, or mark the three cards explicitly as read-only demonstrations.

---

### F-045 - `resolveUnavailable` offers busy, suspended and ineligible drivers as replacements

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T5
- **Modules:** `07b` #8
- **Evidence:** **L13082** filters candidates only on vehicle `type` and takes the first three. It does not consult availability, suspension state, or eligibility - unlike `assignBackup` (L13191-L13199) and `nearestAvailableDrivers()` (L8167), which both do.
- **Impact:** The replacement-driver picker on the trip-readiness page routinely presents drivers who cannot take the trip, with no indication.
- **Fix direction:** Reuse `nearestAvailableDrivers()`; do not re-implement candidate selection per surface (see also F-118).

---

### F-046 - The corporate invoice re-bills the entire payment history and burns a VAT sequence number on preview

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T3/T13
- **Modules:** `05b` #5/#6/#27
- **Evidence:** `DB.invoiceSequence++` fires at **L6685** when the preview **opens**, not when the invoice is sent - so repeatedly opening and closing the preview permanently advances the counter and creates gaps in a numbered VAT sequence. The card promises *"every linked employee's payments this cycle"* (L6626) but `lineItems` includes each employee's **entire payment history** with no date filter (L6672-L6678). The invoice year comes from `new Date().getFullYear()` (L6686) - the real system clock - rather than `EYVAR_TODAY` (2026), so the invoice number's year contradicts every date printed beside it.
- **Impact:** Every corporate invoice re-bills everything the account has ever paid, is numbered out of a sequence with unexplained gaps, and carries a year that disagrees with its own line items.
- **Fix direction:** Allocate the sequence number on send, filter line items to the billing cycle, and use `EYVAR_TODAY`.

---

### F-047 - Four of five operators cannot change the interface language at all

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T12/T2
- **Modules:** `00d` F6
- **Evidence:** The only path to Arabic is Sidebar > Settings > General > *Interface language* > **Save general settings**. There is no language toggle anywhere in the chrome, and changing the `<select>` alone does nothing (**L1496** has no `onchange`); `applyLanguage` is invoked only from `saveGeneralConfig` (L7996) and boot (L14596). `saveGeneralConfig` is gated on `requirePerm('manage_settings')` (**L7987**), which in the seeded data only `USR-1` holds.
- **Impact:** An Arabic-speaking Support or Finance operator fills in the entire General form, presses Save, and is refused - and there is no other way to switch language. The failure surfaces only after the attempt.
- **Fix direction:** Make language a per-user preference with its own control in the topbar, outside `manage_settings`.

---

### F-048 - `applyLanguage` uses `textContent` and irreversibly flattens inline markup

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T12
- **Modules:** `00d` F3
- **Evidence:** **L7951** assigns `el.textContent`, and **L7949** caches `el.textContent` as the "English original". Any translated element containing child markup is flattened on the **first** Arabic toggle and can never be restored, because the cache captured the already-flattened text. Two confirmed victims: `sec.planned_title` (L1992), whose English source is `Planned <span class="settings-soon">Coming soon</span>` - after one toggle the badge is gone permanently; and `gen.disclaimer` (L1502), which contains `<b>really does translate</b>` - the element explaining the translation feature is broken by the translation feature.
- **Impact:** Toggling to Arabic once and back permanently degrades the English UI. It is not recoverable without a reload, which under F-001 destroys all state.
- **Fix direction:** Cache and restore `innerHTML`, or store translations as HTML and assign `innerHTML` with escaping.

---

### F-049 - "New riders (48h)" applies no time filter, and several exec KPIs count the wrong population

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `01` #2/#10/#11, `09a` #5
- **Evidence:** The KPI is `(DB.newRiders||[]).length` (**L6917**) with no window at all - the "48h" is label only, and nothing prunes `DB.newRiders`. "Total driver earnings" (**L6909**) reduces over **all** of `DB.trips` with no status filter, unlike `totalRevenue` which filters `status==='Paid'`; "Platform net (est.)" inherits the error. `escrowHeld` (**L6910**) counts only `status==='held'`, so the two shipped `'ready'` holds worth 329.60 and 32.98 SAR (L2803-L2804) are invisible.
- **Impact:** Three of the executive page's headline figures are wrong by construction: a signup count with no window, driver earnings inflated by cancelled trips, and escrow understated by SAR 362.58.
- **Fix direction:** Filter `newRiders` on a real timestamp; add `status==='Paid'` to the earnings reduce; include `'ready'` in the escrow sum.

---

### F-050 - `fleetCounts().riders.withSub` counts subscriptions, not riders, so `quickOnly` can go negative

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `09a` #5/#6
- **Evidence:** **L20937** counts *subscriptions* matching `/active|expiring/i` and labels the result "riders with a subscription"; **L20938** then computes `quickOnly` by subtracting that subscription count from the rider count. A rider holding two active subscriptions is double-counted, and `quickOnly` can go **negative**. Compounding, the page has two contradictory subtitles: `renderRidersTable()` uses `subs[].length > 0` while `liveSubtitles()` (L21403) uses the active/expiring subscription count, and which one survives depends on render order.
- **Impact:** Two of the three Riders KPI tiles are wrong whenever any rider holds more than one subscription, and the page subtitle changes meaning depending on which action last re-rendered it.
- **Fix direction:** Count distinct riders; make both subtitle writers call one helper.

---

### F-051 - The estimated fare quoted to a caller is never persisted or honoured

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T3/T5
- **Modules:** `06b` #11
- **Evidence:** `commitNewRideRequest` stores no `km`, `min` or `fare` (**L2489**); `completeTrip` regenerates the distance randomly (**L12419**).
- **Impact:** The number an operator reads to a rider on the phone has no relationship to what is eventually charged, and there is no record of what was quoted.
- **Fix direction:** Persist the estimate on the request and carry it through to `completeTrip` as the quoted price.

---

### F-052 - `slotOf()` strips AM/PM without converting, so every evening trip lands in a morning slot

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `10c` #5/#6/#7
- **Evidence:** **L13243**: `String(scheduledTime).replace(/ ?[AP]M/i,'')` turns `"7:30 PM"` into `"7:30"`, which buckets to slot `07:30`. The same line uses `.find(t => t.rider === s.rider)`, so a rider with multiple upcoming legs contributes only one. Everything outside 06:00-08:30 then collapses into the 07:00 column (**L13249**). The identical AM/PM defect recurs in `addTime` on the Zones page (L14101-L14104).
- **Impact:** The capacity grid systematically misreports when demand occurs, inflating the morning peak with evening trips and dropping the rest.
- **Fix direction:** Parse to 24h before bucketing; iterate all upcoming legs; add real slots beyond the 06:00-08:30 window.

---

### F-053 - The coverage table and the coverage KPIs use different definitions of "covered"

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T9/T4
- **Modules:** `10c` #1/#17/#19
- **Evidence:** Table columns 4/6/7 and the row background test raw registration, `bak = DB.subBackups[s.id]` (**L13170**), while the KPIs, the card badge and the sidebar badge test `subIsCovered()` - registration **plus** eligibility (**L13150**). A registered-but-ineligible backup therefore shows a green captain name and "Protected" in the row while being counted as *Exposed* in the tile directly above it. This is exactly the discrepancy the shared `subIsCovered` definition was introduced to eliminate (comment L17468-L17471); the Plan-Commitment coverage card does render the third state (L17536-L17539), this page does not. Separately `activeSubsList()` uses `!/cancel/i` while `backupCoverage()` uses `/active|expiring/i` (L13143 vs L17482) - the same numbers on the shipped fixture, but not the same rule.
- **Impact:** One screen simultaneously says a subscription is protected and unprotected.
- **Fix direction:** Make the row read `subIsCovered()` and render the three states the commitment card already renders.

---

### F-054 - Sidebar badges are stale before first visit and never refresh in the background

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T10/T4
- **Modules:** `00a` 15 #4/#5/#6, `10c` #15/#16, `10d` #2, `10e` #1, `11b` 18.3 #5, `10a` #10, `03b` #5, `07c` #11, `13d` G4/G5
- **Evidence:** This is **one pattern with many instances**, merged here. `refreshNavCounts()` (L9392) maintains only five badges; **ten of fifteen are owned by page renderers** and therefore update only when that page is visited or during the one-shot boot render at L14556. Confirmed instances: `sbb-zones` (L14140, never in `refreshNavCounts`), `sbb-compliance` (never refreshed despite `complianceScan()` running every 60 simulated seconds), `sbb-safety` (no tick hook at all - permanently `0` for an operator who never opens the page), `sbb-coverage` (L13159, only `renderCoveragePage()` touches it), `sbb-fairness` (only `updateContactsBadge()`). Three badges write `|| ''` on zero (`sbb-fraud` L5645, `sbb-corporate` L6496, `sb-readiness-badge` L13014) while the rest write a literal `0`. Badge **class** is maintained for only five badges, so `sbb-subs` and `sbb-qr` are permanently grey and every other badge is permanently red even at zero (`sbb-coverage` L13159 never changes class; the Interventions count badge L2075 is hardcoded `b b-red` and renders `0` in alert red above an "All clear" message).
- **Impact:** The sidebar - the panel's only always-visible triage surface - reports numbers that are wrong until the corresponding page is opened, and reports them in a colour that does not track their value. A subscription cancelled from the Subscriptions page does not change `sbb-coverage` until Coverage is opened.
- **Fix direction:** Move every badge formula into `refreshNavCounts()`, call it from the tick engine, and derive the badge class from the value in one helper.

---

### F-055 - The 21:00 plan-confirmation deadline is never enforced

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T8/T5
- **Modules:** `10b` #1/#12/#13
- **Evidence:** `confirmDeadline` appears only in display strings (L16590, L16598, L16936, L16954, L17110). No scheduler auto-hands-off unconfirmed legs at the cut-off. It is also a free-text input parsed nowhere (L17106) with no HH:MM validation. The same pattern applies to `dispatchWindowSec` (45s, display-only at L17312 - nothing expires an offer) and `appealWindowDays` (7, never checked by `openEmergencyClaim`).
- **Impact:** The commitment product's central promise - "confirm by 21:00 or the leg is handed off" - is entirely manual. Nothing happens at 21:00.
- **Fix direction:** Add the scheduler, or remove the deadline from every user-facing string.

---

### F-056 - `renderSuccess()` completes a renewal with no audit entry and no payment record

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T3/T6
- **Modules:** `07a` #5/#6/#7
- **Evidence:** `renderSuccess()` (**L11418-L11463**) writes **no `logAction`** and **no `DB.payments` record**, so a completed renewal is invisible to both the activity log and Finance - unlike `capturePaymentHold()` (L9614-L9625), which does create a payment. It also does not call `renderRenewalPipeline()`, leaving the launching page stale, and a renewal that creates a brand-new subscription (L11439-L11445) skips `generateUpcomingTripsForSubscription()`, so the new subscription has no readiness trips.
- **Impact:** Money is taken in the renewal wizard and no payment record, no audit entry and no upcoming trips result. Finance never sees the revenue.
- **Fix direction:** Reuse `capturePaymentHold` / `materializeSubscription`; log the renewal.

---

### F-057 - `rebuildAllHistory()` prices reconstructed trips under a fare model that never existed

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T9/T4
- **Modules:** `16b` #2/#3/#5/#6
- **Evidence:** `buildFareBreakdown` uses base 4.00 / per-km 1.35 / per-min 0.42 (**L18657**) while `DB.rateCard.classes.economy` is 5.00 / 1.20 / 0.40 (**L21439**). `driverEarn = fare * 0.8` (**L18755**) hardcodes 20% commission against the rate card's stated 22% on-demand (L21447). `numOf()` strips the minus sign (`/[^\d.]/g`, L18509), so a negative stored total reads as positive and is never flagged. Trips with no `dateMs` count as inside the window (`ms === undefined || ms >= start`, L20422), and seeded trips generally lack `dateMs` - inflating `window.inside` and suppressing the orphan alert for exactly the accounts most likely to be broken.
- **Impact:** Every reconstructed receipt is priced under rules that never existed, driver earnings on reconstructed history are systematically 2 percentage points high, and the integrity scanner's own window count is biased toward "healthy".
- **Fix direction:** Read `DB.rateCard`; stamp `dateMs` on seeded trips; keep the sign in `numOf`.

---

### F-058 - The dashboard cancellation-cap alert uses the weekly plan cap for every rider

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4
- **Modules:** `03a` #11
- **Evidence:** **L10366** reads `DB.plans.weekly.cap` for every rider regardless of which plan they are actually on. Bi-weekly (`cap:2`) and monthly caps are ignored.
- **Impact:** "Cancellation cap reached today" fires for riders who have not reached their cap and misses riders who have.
- **Fix direction:** Resolve the rider's own plan key before reading `cap`.

---

### F-059 - `sendRiderChangeNotif` reassigns the driver ungated and unaudited, and sends no notification

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5/T2
- **Modules:** `07b` #4/#5, `04` #7
- **Evidence:** **L8590-L8596**: a second, independent path to the same write that `confirmReassign` gates - with **no permission check and no audit entry**. The `notif-msg` textarea (**L8584**) that the operator edits is **never read**, and no notification is dispatched anywhere; the function toasts *"Rider notified"* (L8594) regardless. `commitLiveReassign` does the same at L11802. (`commitAddStop` at L11706 *does* call `sendSystemEmail`, so the capability exists.)
- **Impact:** The operator writes a message to the rider, sends it, is told it was delivered, and the message is discarded. The driver change itself bypasses the permission gate and leaves no audit record.
- **Fix direction:** Gate and audit `sendRiderChangeNotif`; read the textarea and route through `sendSystemEmail`.

---

### F-060 - Call-outcome loggers record nothing for most of their outcomes

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5/T6
- **Modules:** `07b` #6/#7/#16, `13c` G2/G18/G19
- **Evidence:** `logCallOutcome` ignores two of its four outcomes - `cancelled` and `delay` produce a toast and nothing else (**L8539**, **L8544**), so a rider who asked to cancel leaves no record anywhere. `logDriverCall`'s `delay` outcome writes nothing (**L8563-L8565**) despite toasting *"rider will be notified"* (L8570), and the whole function mutates `driverStatus` and `unavailReason` with **no `logAction` and no permission check** (`13c` G18). `logNdvContact` (**L8513-L8522**) records nothing at all - all three of its outcome options are cosmetic. Separately, `logPriorityCall` writes only to `DB.auditLog` (L9162), so every "Call" button in the panel is invisible to the contacts module's cost-per-contact, channel-mix and AHT metrics.
- **Impact:** The contact-centre metrics measure a subset of contacts that excludes every priority call and every driver call, and three outcome paths leave no trace at all.
- **Fix direction:** Route every outcome through `logContact`; gate and audit `logDriverCall`.

---

### F-061 - The "No-shows" KPI and filter are permanently zero and permanently empty

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T7
- **Modules:** `06a` #1
- **Evidence:** Nothing in the file writes a trip `status` containing "no-show" - verified across all `.status=` and `status:` assignments in the module pass. Tile 3 (**L3404**, **L3407**, **L3414**) is permanently `0` / `0% rate`, and `setTripsKindFilter('noshow')` always empties the table.
- **Impact:** A headline operational metric on the All Trips page reads zero forever, and its filter is a dead end.
- **Fix direction:** Write the status where no-shows are detected (`qr_rider_noshow` already exists as a cancellation rule), or remove the tile.

---

### F-062 - `renderInterventions` does not exist, so ownership and claim changes never refresh the dashboard or Interventions page

- **Severity:** high | **Verification:** **VERIFIED** | **Theme:** T10/T7
- **Modules:** `03a` #1, `13d` G2
- **Evidence:** `grep -n renderInterventions` re-run this pass returns five lines; the only bare `renderInterventions` (no `Page` suffix) is **L19054**: `if((pg==='dashboard'||pg==='interventions')&&typeof renderInterventions==='function')renderInterventions();`. The defined function is `renderInterventionsPage` (L10338). The `typeof` guard makes the branch a permanent silent no-op.
- **Impact:** `refreshOwnershipSurfaces()` never refreshes either surface, so claiming, releasing or taking over a work item leaves both the dashboard widget and the Interventions page showing stale ownership for up to 60 seconds. `assignManually` has the same gap (L11877) - it re-renders Requests but never Interventions.
- **Fix direction:** One-character-class fix: call `renderInterventionsPage`. Then remove the `typeof` guards, which exist only to hide this class of typo.

---

### F-063 - Work Inbox tab counts, KPI tiles and the sidebar badge each measure a different population

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T4/T9
- **Modules:** `03b` #2/#3/#4/#5/#15, `13d` G3/G4
- **Evidence:** Tab counts (`mine`/`unassigned`/`all`) come from `inboxItems()` (**L19242-L19245**) while the rows come from `inboxFiltered()` - so a tab can read "Everything 9" and render zero rows. The KPI tiles ignore both filters and always describe the whole system. "Overdue right now" counts `dueMs === -1` sentinels, which three item types hardcode (**L19155**, **L19169**, **L19192**), so those are permanently "overdue 0m" and permanently inflate both KPI 1 and the badge. The sidebar badge uses `||` rather than `+`: `n = count(breached) || count(unclaimed)` (**L19315-L19316**), so as soon as one item breaches the badge stops reporting unclaimed work entirely and silently changes meaning. And `#iv-page-count` (L10343) counts the watch-separator `<div>` as an item, over-counting by one whenever both tiers are populated.
- **Impact:** Five counters over the same work queue, none of which agrees with any other or with the list beneath it.
- **Fix direction:** One `inboxFiltered()` source for rows, tabs and KPIs; `+` not `||` in the badge; a real sentinel for "no deadline".

---

### F-064 - `#my-work-chip` navigates to Support Center, not to the inbox it counts

- **Severity:** high | **Verification:** **REPORTED** | **Theme:** T5
- **Modules:** `03b` #6, `16i` #10, `06a` #11, `02a` #7
- **Evidence:** **L567**: `onclick="go('support',null)"` on a chip that reads "N mine" and is maintained by the inbox module (L19038-L19044). The same class of mis-wiring recurs three more times: the `#oncall-chip` calls `go('settings',null)`, which ends with `switchSettingsTab('general')` (L8819) and lands on the wrong tab; "View route" on a trip calls `go('live',null)` (**L4276**) and opens the Live Map at its default state rather than the trip, although `openRouteReplay` (L11761) exists and does target a trip; and Predictive's zone rows call `go('zones',null)` with no zone selection (L14362-L14363).
- **Impact:** Four navigation affordances take the operator to a page that does not contain what they clicked on, requiring them to find the record again by hand.
- **Fix direction:** Pass the target id through `go()` in all four cases; `openRouteReplay` already accepts one.

---

## 5. Medium findings

**76 findings. 7 VERIFIED, 69 REPORTED.** Dead code, missing audit entries, and inconsistent behaviour between two surfaces showing the same thing.

| ID | Finding | Evidence | Modules | Theme | V |
|---|---|---|---|---|---|
| F-065 | `closeModal()` calls `reqClearLocks()`, which wipes `claimedBy`/`claimedAt`/`_locking` on **every** ride and subscription request whenever **any** modal closes - including modals unrelated to request claiming | L5216-L5219 calls L5229-L5232 | `00b` 12.3, `06b` #18 | T13 | **VERIFIED** |
| F-066 | `getReferralCode(riderId)` is dead: `grep -c` returns exactly 1, its own definition. Per-rider referral codes are never generated or displayed; `processReferral` works off ids picked in the UI | L3854-L3859 | `09a` #1, `11a` 18.2 | T7 | **VERIFIED** |
| F-067 | `planFloorCheck()` and `effectiveSurge()` each occur exactly once file-wide - their own definitions. The documented "check that blocks a publish" is never invoked, so no price floor is ever enforced, and the only path from `capByCity`/`surgeSuspensions` to a price does not exist | L21512, L21523; comment L21511 | `14a` #22, `14b` #13, `16g` | T7 | **VERIFIED** |
| F-068 | `DB.paymentRisk` has one hardcoded assignment and five readers; nothing ever rewrites it, so payment-risk signals are frozen at one seeded rider | L14199 write; L14227, L14327, L14335, L14374, L14378 reads | `02a`, `03a` #17 | T7 | **VERIFIED** |
| F-069 | `markDocRenewed()` is dead code, superseded by `openDocDateEditor`; the supersession is documented but the function was not removed | L13370-L13381; notes L10989-L10991, L11048-L11049 | `10d` #3 | T7 | REPORTED |
| F-070 | 5 of 8 built-in operational limits carry `enforced:false` and are never read (`rider_max_active_requests`, `rider_max_cancellations_day`, `rider_request_cooldown`, `driver_max_active_subs`, `driver_min_rating`); `addCustomLimit` hardcodes `enforced:false` with no path to change it, so a custom limit can never be enforced | L2587-L2591, L7413 | `15i` #1/#4, `08a` #10/#11 | T8 | **VERIFIED** |
| F-071 | `reasonSelectHTML(cselId,...)` hardcodes the emitted field id as `nt-reason` regardless of `cselId`, for all four pickers (`csel-nt-reason`, `csel-nt-reason2`, `csel-lc-reason`, `csel-wrap-reason`). `gvRC()` therefore resolves correctly **by accident**, but any two pickers mounted at once create duplicate ids and `getElementById` returns the first - the wrong one. *(Corrects `13c` G12, which reported this as always-broken)* | L14748-L14752, L14763; call sites L2423, L2546, L16223, L20286 | `13a` #4, `13c` G12, `06a` #19 | T11 | **VERIFIED** |
| F-072 | `confirmModal()` is a legacy stub that fires a native `alert()` and is still the confirm button of `openRenewModal` | L5234 | `00b` 12.7 | T7 | **VERIFIED** |
| F-073 | `createTicketFor` writes no audit entry and hardcodes `role:'rider'` even when opened from a driver profile, so the bubble renders as a rider message; it also never calls `renderTickets()`, so the queue does not refresh | L2552-L2560, L4111, L15318 | `06a` #9, `09b` #12/#13, `13a` #12/#13 | T6 | REPORTED |
| F-074 | `removePlanFeature(i)` and `pfDrop(e,i)` mutate `PLAN_FEATURES` with no confirmation, no permission check and no audit entry; the change is only recorded when `savePlan()` later logs a feature *count* | L6037-L6048, L6118 | `00c` 5.4/F25, `14b` #9 | T6 | REPORTED |
| F-075 | Ticket creation, replies, and status changes to Resolved / In progress produce no audit entry; only close, reopen, reason change, bulk status, bulk assign, mass event and SLA breaches are logged | L2368, L2398, L2433 | `13a` #10 | T6 | REPORTED |
| F-076 | The entire notifications module writes no `logAction` anywhere (L2171-L2327), so dismissing a critical alert is untracked; `markAllRead` mutates `DB` on one click and is absent from the `gateAll` registry whose header claims every mutating action was registered | L2171-L2327, L2258, L3123-L3138 | `03c` #3/#4 | T6 | REPORTED |
| F-077 | `createReadinessTicket` writes no audit entry and has no permission gate | L8686-L8701 | `07b` #13 | T6 | REPORTED |
| F-078 | `commitAddEmployee` has no permission gate at all while its sibling `removeEmployeeFromCorp` requires `manage_subscriptions`; it mutates both `DB.corporateAccounts` and `DB.riders` | L6738-L6750 vs L6752 | `05b` #9 | T2 | REPORTED |
| F-079 | `commitSendCorpInvoice` gates on `view_finance` while every other write in the corporate module gates on `manage_subscriptions` - a corporate-ops role that can rewrite billing contacts may be unable to send the invoice, and vice versa | L6703 vs L6518, L6640, L6652, L6716, L6752 | `05b` #8 | T2 | REPORTED |
| F-080 | `commitBackup` has no permission check; the `coverage.assign_backup` gate lives only on `assignBackup`, so anything calling `commitBackup` directly bypasses it | L13218 vs L13187-L13188 | `10c` #11 | T2 | REPORTED |
| F-081 | Compliance auto-unsuspension is silent - no audit entry, no notification - asymmetric with the heavily-logged suspend branch. A driver returning to dispatch leaves no trace | L13311-L13313 vs L13308-L13309 | `10d` #7 | T6 | REPORTED |
| F-082 | `precautionSuspend` force-completes protocol step `act`, overwriting any prior `by`/`at`, but writes only `logAction('precaution_suspend',...)` - no matching `incident_step` entry. The activity log shows a step count changing with no step event | L13470, L13472 | `10e` #11 | T6 | REPORTED |
| F-083 | Un-ticking an incident protocol step replaces the object wholesale (`inc.steps[step]={done:false}`), discarding `by`/`at`. Re-ticking writes the current user and "Just now", so the original performer is lost - defeating the accountability trail the source comment claims | L13459; comment L13444-L13446 | `10e` #10 | T6 | REPORTED |
| F-084 | `handleLogoUpload`, `clearLogo` and `resetBranding` have no `requirePerm('manage_settings')` and write no audit entry, unlike every other Settings mutation. A user who cannot save branding can still wipe it | L7962, L7974, L18454 vs L18448 | `15a` #4, `16a` #1 | T2 | REPORTED |
| F-085 | Automatic compensation bypasses the whole authority model - `logGoodwill` is called directly with no `compCheck`, so policy-driven credits ignore per-case, daily and per-rider ceilings | L17339 vs L15415 | `15k` #12 | T2 | REPORTED |
| F-086 | `DB.compPolicy.roles` defines `'Operations'` (200/2000) which matches no team user, so the real `Ops Manager` (USR-5) falls through to `default` (50/300) - a **lower** goodwill ceiling than Support (75/600) | L15382, L2839 | `15k` #13, `15b` #10 | T9 | REPORTED |
| F-087 | The "second approver" for a large goodwill credit is `window.__compApproved`, a global boolean: pressing Confirm twice satisfies it. No second identity, no approval record, and the flag persists across modals | L3992-L3997 | `15k` #10 | T2 | REPORTED |
| F-088 | `commitPublishVersion` writes site-wide legal policy and invalidates every user's consent with **no `guardAction` and no `GATE_SPECS` entry**; it also never closes its modal (so Publish can be pressed twice), accepts any version string including a lower one, and does not de-duplicate versions. The lesser action - sending reminders - *is* gated | L3833-L3843; contrast L21736, L7554 | `16c` #4/#5/#6/#7 | T2 | REPORTED |
| F-089 | `openNewRiderProfile()` copies only 7 fields on promotion, dropping `gender`, `hasPhoto`, `device`, `appLang`, `lastIp`, `ipLocation`, `movementLog` - all of which `buildEntityProfile` renders. It also never removes the entry from `DB.newRiders`, so the rider is permanently double-counted | L11156-L11157 | `09a` #12 | T13 | REPORTED |
| F-090 | `commitInvite` pushes a user with no `phone`, `photo`, `twoFA` or `pagePerms`, so `renderTeamTable` shows a red "2FA off" badge for a field that was never created and granular grants are computed from a possibly-empty intersection | L10538, L10456, L2940 | `00c` F15, `15b` #3 | T13 | REPORTED |
| F-091 | `changeMaPassword()` never validates the current password and never stores the new one - it clears the inputs, writes `logAction('change_password',...)` and toasts success. The audit log carries a durable assertion that a credential changed when it did not | L3036 | `00c` F13 | T6 | REPORTED |
| F-092 | `toggleMa2FA` writes `u.twoFA` and toasts but never calls `renderMaSecurity()`, so the "Enabled"/"Disabled" label disagrees with state for the rest of the page visit | L3047-L3053 vs L3022 | `00c` F14 | T10 | REPORTED |
| F-093 | `approveDriver` and `rejectDriver` hardcode `decidedBy:'Sarah Al-Rashid'` while `logAction` resolves the real `CURRENT_USER_ID` - the applicant record and the audit log can name two different people for the same decision | L11113, L11114, L11128 vs L3134 | `08a` #24, `08b` #9 | T6 | REPORTED |
| F-094 | `auditDiffHTML` iterates `Object.keys(after)` only, so a field present in `before` and absent from `after` - a deletion - produces no diff line. A wholesale permission wipe renders as one count line and nothing more. Array/object payloads render as `[object Object]`, and `saveCancellationPolicy` passes the same live array as both `before` and `after` | L3163-L3169, L10833, L7383, L7441, L12385, L8117 | `00c` F19, `16k` #8/#9 | T6 | REPORTED |
| F-095 | Nine ledger fields are declared and never used: `ACCOUNTS['ar.rider']`, `ACCOUNTS['liability.escrow']`, `idemStats().operations`, `idemStats().duplicated`, `trialBalance().rows[].account`, `moneyRejects[].ref/.tsMs/.postings`, `DB.ledger[].meta/.tsMs/.ref`, `withIdempotency` `seen.lastAttemptMs`. Two of twelve trial-balance rows are permanent zeros, and a journal entry cannot be traced back to its trip or rider from the UI | L19867, L19870, L19912, L19926, L19929, L19950, L19897 | `16h` | T7 | REPORTED |
| F-096 | The Refunds reconciliation row is permanently wrong by roughly 13% - `ops` is gross while `ledger` is net of VAT, and the intended correction is multiplied by zero: `accountBalance('tax.vat_output')*0` | L20064-L20065 | `16h` #4, `12a` D2 | T4 | REPORTED |
| F-097 | The `OUT OF BALANCE` indicator - the most prominent safety signal on the ledger pane - is unreachable, because `postLedger` refuses every unbalanced posting, so `trialBalance().balanced` is always `true` | L20077-L20078 | `16h` #3 | T7 | REPORTED |
| F-098 | `postFareCapture` returns `true` even when both postings were refused, so `backfillFareLedger`'s success count is wrong; and a rejected capture is not retryable because `withIdempotency` records the key regardless of the inner result | L20036-L20051 | `16h` #8/#9 | T3 | REPORTED |
| F-099 | `liability.driver` never clears: payouts, escrow release and deductions do not post to the ledger at all, so captain earnings payable is a monotonically increasing accrual | ledger 9.3; `12b` G8 | `16h` #6, `12b` G8 | T3 | REPORTED |
| F-100 | `renderSidebarPerms()` is called behind `typeof` guards at two sites and **does not exist** anywhere in the file, so the sidebar is never permission-filtered and impersonation changes only what commits succeed, not what is visible | L21075, L21086 | `00c` F7, `15c` #13 | T7 | REPORTED |
| F-101 | `entry.action` and `entry.entityType` are never displayed in any column or tooltip. `ACTION_LABELS` is used only to populate the filter dropdown, so a reader cannot tell what kind of action a row was except by reading the summary prose | L3140, L3141, L9238 | `16k` #2/#20 | T6 | REPORTED |
| F-102 | The audit free-text search haystack is `summary + actorName + entityId + id` - it does not cover `action` or `entityType` | L9331 | `16k` #3 | T6 | REPORTED |
| F-103 | Runtime and seeded audit timestamps use incompatible formats: seeds carry `25 Jun, 08:14 AM` while `logAction` produces time-only via `toLocaleTimeString([],...)` with no locale. A log spanning both is unsortable and ambiguous after midnight, and the format varies by browser | L2863-L2871 vs L3137 | `00c` F20, `16k` #5 | T9 | REPORTED |
| F-104 | `entityType:'team_user'` and `'incident'` audit rows can never be clicked through: `resolveId` searches only riders, drivers, trips, subscriptions, payments and complaints. `USR-*` and `INC-*` ids render as inert monospace text. `process_all_payouts`'s seeded row additionally has `entityId:''`, so the cell is blank | L3262, L3270, L9281, L9283, L2867 | `00c` F23/F24, `10e` #17 | T13 | REPORTED |
| F-105 | Denial entity-id formats are inconsistent: `requirePerm` logs the bare key (`manage_team`), `requirePagePerm` logs a dotted pair (`growth.create_promo`), both under `entityType:'permission'`. Any consumer grouping by `entityId` sees two incompatible key spaces under one type | L3129 vs L10685 | `00c` F22 | T9 | REPORTED |
| F-106 | The two self-lockout guards toast only and write no audit entry - an attempted privilege self-destruction leaves no record, unlike every other denial | L10780, L10820 | `00c` F12 | T6 | REPORTED |
| F-107 | `PERMISSION_DESC.manage_team` is assigned twice - in the object literal and again by a bare statement 7,000 lines later. Only the second survives; a reader of the literal sees text that never renders | L3255, L10520 | `00c` F21 | T7 | REPORTED |
| F-108 | `finalizeNewSub` contains two identical `if(needsApproval){...return;}` blocks, the second unreachable, and is declared `function finalizeNewSub(data)` but called as `finalizeNewSub(data,drv,rider)` | L5110-L5123, L5078 vs L5033 | `05a` #9/#10 | T7 | REPORTED |
| F-109 | `subEconomics().driverFull` is computed and returned and read nowhere | L3613-L3615 | `05a` #11 | T7 | REPORTED |
| F-110 | `sub.postponements` has a full Postponed-trips banner render path and **no writer anywhere in the file** - the branch is unreachable with current code | L4325-L4329 | `05a` #12 | T7 | REPORTED |
| F-111 | Badge mappings are duplicated and disagree: All Trips uses `b-com`/`b-eco` while `tripsTable()` uses `b-purple`/`b-blue` for the same Type field; All Trips uses an inline status ternary rendering `Late +8` blue while `statusBadge()` renders it amber; and there are three parallel tier-badge implementations (`lvlBadge` L3260, inline `lvlCls` L6388, `lvlBadgeSm` L8901) with `lvlCls` mapping `standard` to silver where `lvlBadge` maps it to grey | L3426 vs L3719; L3423 vs L3730; L3260, L6388, L8901, L3450 | `06a` #2/#3, `08a` #15, `06b` #8 | T9 | REPORTED |
| F-112 | `renderMapTripsTable()` and `renderMapTripsTableFiltered()` are near-duplicate implementations that differ subtly: the filtered variant labels the vehicle fallback `Eco` where the other uses `Economy`, and its replay button label differs | L12660 vs L11522-L11524, L12679 | `04` #10 | T9 | REPORTED |
| F-113 | `broadcastAudienceIds()` and `pushAudienceIds()` are ~90% identical, must be maintained in lockstep by hand, and have already diverged: 9 options against 11, a different "all riders" key (`all` vs `all_riders`), and `economy_drivers`/`comfort_drivers` existing only in Push | L7674 vs L7711 | `16d` #7, `16e` #16 | T9 | REPORTED |
| F-114 | Two incompatible CSV encoders are live (`toCSV` quotes conditionally, `buildCSV` quotes everything), and a strictly better export modal - CSV **or** JSON, a native save-location picker, row-count logging - exists but is unreachable from the Export tab. `exportRows(page)` additionally knows only three page keys | L7595 vs L9183; L9130, L9188, L9175 | `16f` #3/#6 | T9 | REPORTED |
| F-115 | Two competing logo stores that are never synchronised: `DB.branding.logoUrl` (sidebar) and `DB.opsConfig.general.logoDataUrl` (favicon and `#logo-preview`). Setting one leaves the other stale, and the operator faces two separate "logo" settings in two tabs | L18391 vs L7959 | `16a` #3, `15a` #8 | T9 | REPORTED |
| F-116 | `resetBranding()` replaces the whole object with a 4-key literal, silently deleting `DB.branding.maxUploadMB`. Afterwards `handleLogoFile()` computes `NaN` for `maxBytes`, so `f.size > NaN` is always false and **the upload size limit is disabled for the rest of the session**; the caption also renders "up to undefined MB" | L18455, L18410, L20998 | `16a` #2 | T13 | REPORTED |
| F-117 | `applyBranding()` guards on `if(img && DB.branding.logoUrl)`, so an empty `logoUrl` is a no-op: clearing the field and saving does not remove the logo until reload. `resetBranding()` does not call `applyBranding()` at all | L18391, L18454-L18459 | `16a` #5/#6 | T5 | REPORTED |
| F-118 | `nearestAvailableDrivers` calls only `driverCanTakeAnotherSub` for `kind==='sub'`; the `driverTrustedForSubs` gate is applied solely in the manual picker, so **automatic** subscription matching bypasses `driver_min_trips_for_subs` entirely | L8180 vs L5688 | `15i` #11 | T8 | REPORTED |
| F-119 | `driverCanTakeAnotherSub()` implements "zero or unlimited" via `allowMultiSubPerDriver` / `multiSubException` and never reads the numeric cap - while driver cards display `4/5` and `6/6` as though a cap of 5 were in force. `DRV-0103` displays `6/6`, above the configured 5 | L8161-L8166, L2589, L2648, L6394 | `15i` #3, `08a` #11 | T8 | REPORTED |
| F-120 | `allowMultiSubPerDriver` counts only `status==='Active'`, so a driver holding several `Expiring` subscriptions reads as having zero and is treated as a new driver | L8158 | `15f` #9 | T4 | REPORTED |
| F-121 | `Save Quick Ride radius` and `Save Subscription radius` are the same function committing both fields plus the auto-expand checkbox, though the card framing implies independent saves; and the two `.settings-meta` footers are swapped, so phase changes appear to belong to the Subscriptions card | L1568, L1598, L8074; `#meta-ops-radius` / `#meta-phases` | `15f` #2/#3 | T5 | REPORTED |
| F-122 | `Save search phases` writes nothing - adds and removes already commit to `DB.searchPhases` on click. The button only appends an audit line, and its toast ("applies to new ride requests immediately") describes something that already happened | L8115-L8120 | `15f` #1 | T5 | REPORTED |
| F-123 | `removeSearchPhase` logs `'Removed a search phase'` with empty `before`/`after`, so the audit cannot say **which** phase was removed. Deleting a phase also has no confirmation despite immediately changing live dispatch behaviour | L8111, L8109 | `15f` #5/#7 | T6 | REPORTED |
| F-124 | `DB.slaPolicy.breachEscalateTo = 'ops_supervisor'` is written and never read anywhere; breach notifications name `onCallName('primary')` instead | L14658 vs L14946 | `13a` #5, `13c` G5, `15k` #4 | T7 | REPORTED |
| F-125 | `DB.slaPolicy.tiers[*].hours` (`24/7` vs `business`) is rendered as a label only; `slaState()` uses raw wall-clock deltas, so a low-priority T4 contact opened at 02:00 accrues breach time overnight - the exact scenario the design comment says it wants to avoid | L14655, L15136 vs L14766-L14790; comment L14645-L14646 | `13a` #6, `13c` G6, `15k` #3 | T8 | REPORTED |
| F-126 | A T1 reason code can never register a first-response breach: `frBreached` requires `frMs > 0`, and `T1.firstResponseMin` is 0, as are the explicit `fr:0` values on all five T1 codes. The strictest tier has the weakest first-response enforcement | L14782-L14783 vs L14652 | `13a` #2, `13c` G7 | T4 | REPORTED |
| F-127 | `Waiting on customer` exists as a filter option and is the sole trigger for the SLA pause branch, but **no button, modal or bulk action ever writes it** - the pause path is unreachable through the UI | L12787, L14868 | `13a` #1 | T7 | REPORTED |
| F-128 | `slaMarkReopen` does not clear `pausedSinceMs`, so a reopened ticket that was paused stays paused indefinitely | L14881-L14885 | `13a` #15 | T5 | REPORTED |
| F-129 | `ticket.assignee` is written by `bulkAssignMe()` and never displayed; the detail card shows `t.agent`, which bulk-assign does not touch | L16177 vs L6271 | `13a` #8 | T9 | REPORTED |
| F-130 | `handledMin` is patched by array position, not by id: both `commitWrapUp` and `commitLogContact` write to `DB.contacts[0]`, assuming their own `logContact` just landed there. Any concurrent `logContact` attaches the handling time to the wrong contact | L20313, L16238 | `13c` G8 | T13 | REPORTED |
| F-131 | `atRisk` does not exclude `updBreached`, so a ticket whose update clock has breached but whose resolution clock is past 75% is counted in **both** `breaching` and `atRisk` - appearing twice in the concatenated exposure list and double-counted in the KPI | L15016-L15017, L14965-L14966 | `13c` G9 | T4 | REPORTED |
| F-132 | Two different definitions of "open ticket" coexist in one module: `renderContactsPage` uses `status!=='Resolved' && status!=='Closed'`, `updateContactsBadge` uses `!t.resolvedAtMs` | L15015 vs L14962 | `13c` G11 | T9 | REPORTED |
| F-133 | `slaUrgency()` provides a "breached first, then closest to breach" sort key and is unused - the SLA-exposure list uses raw concatenation instead | L14804-L14812 | `13c` G14 | T7 | REPORTED |
| F-134 | Four module-scoped filter variables cannot be cleared and survive navigation: `_coverageFilter` (no toggle-off, no chip, no Clear), `_safetyFilter` (`filterSafety('all')` is unreachable from the UI - only a page reload clears it), `_zonesFilter`, `_driverTierFilter` (`filterDriversByTier` assigns without toggling and no tile maps to `'all'`). `window.__tripsLowOnly` / `__tripsKindFilter` are worse: they survive navigation while their button highlight does not | L13156, L13395/L13412, L14129, L6338-L6342, L21219 | `10c` #2, `10e` #5, `11b` 18.1 #9, `08a` #3, `06a` #12 | T10 | REPORTED |
| F-135 | The `DB.upcomingSubTrips = DB.upcomingSubTrips || [...]` "NAV SAFETY NET" fallback can never execute because L6177 always assigns first. Four `UST-` records with different data are inert | L6177 vs L6243-L6248 | `07b` #14, `13d` G11 | T7 | REPORTED |
| F-136 | Two unreachable branches in the scenario engine: `tripScenario`'s `unassigned` branch (acknowledged in the source as never firing) and the 31-60 minute `watch` band, which no `not_started` driver can ever reach because branch 3 requires `minutesUntil <= 30` while branch 5 claims up to 90 and is absent from `scCfg` | L8293-L8297, L8286-L8288; L8303 vs L8309, L9491-L9495 | `07b` #15, `13d` G6 | T7 | REPORTED |
| F-137 | `readinessStatus` and `tripScenario` disagree on the unconfirmed case (`high`/red versus `unconfirmed`/amber) and `readinessStatus` has no `unassigned` case at all, despite the comment at L8281-L8283 asserting they cannot disagree | L8281-L8297 | `07b` #12 | T9 | REPORTED |
| F-138 | Nine functions are defined and never referenced anywhere: `rcCompCap()` L14742, `reserveState()` L17570, `acceptPlanTerms()` L17133, `priorTripsWithRider()` L5647, `hasOpenComplaint()` L5650, `openComplaintFor()` L5656, `workChip()` L19033, `completeItem()` L18906, `viewDriver()` L8994. `priorTripsWithRider` computes exactly the statistic the Fraud page needs, which that page re-implements inline at L5628 | as cited | `15k` #5, `10b` #9/#10, `02b` #15, `03b` #11/#12, `08a` #14 | T7 | REPORTED |
| F-139 | Ten dead configuration fields: `DB.rateCard.surge.minMultiplier`, `.currency`, `.vatIncluded`, `.commission.onDemand`, `capByCity.JED`, `classes.*.cancelFee`/`.freeWaitMin`/`.waitPerMin`; `DB.branding.accent`; `DB.telephony.wrapUpSec`; `DB.arrivalConfig.riderGraceMin`; `DESYNC_THRESHOLD_MS`; `DB.ownershipConfig.warnTakeover`; `NOTIF_PRIORITY_LABEL`; `DB.opsConfig.notifications.smsAlerts`/`.notifyOnDispute`; `reasonCode.target` and `reasonCode.owner`; `tier.forfeitRemaining`; `ev.reserveForfeited`; `ev.appealId`; `offer.sentTo`; `r._alerted`; `rider.referredBy`; `corpAccountId`; `balanceAfter`; `draft.note` | L21434-L21458, L18396, L20174, L17609, L16336, L18853, L2189, L2571, L14666, L16691, L16694, L14029, L12571, L3871, L6746, L3937, L21560 | 14 modules | T7 | REPORTED |
| F-140 | `promoteBackup` does not increment `driverChanges`, so a permanent captain change made from the Coverage page never registers against the same-captain promise metric - unlike the two other places a captain changes (L16704, L17343) | L13228-L13231 | `10c` #10 | T9 | REPORTED |

---

## 6. Low findings

**48 findings. 1 VERIFIED (F-169, re-read at L14762 this pass), 47 REPORTED.** Cosmetic, i18n, demo-seed artefacts, and missing affordances. This table has no verification column; the single verified row is marked inline.

| ID | Finding | Evidence | Modules | Theme |
|---|---|---|---|---|
| F-141 | `subs.dashboard` is the fixed string `Thursday 25 Jun 2026 - 09:14 AM` and is never recomputed, so the dashboard subtitle is permanently that date. `subs['plan-edit']` is likewise permanently `Weekly plan - plan_id: 1` regardless of which plan is open | L2169 | `00a` 14 | T12 |
| F-142 | `refreshNavCounts()` counts "today's" trips by string-matching the literal `25 Jun`, and "today" is hardcoded as day-of-month 25 (`parseInt(x.ends,10) - 25 <= 3`) | L9393, L9395 | `00a` 14 | T13 |
| F-143 | `selectTrip('TRP-7741')` at boot - the Live Map always opens on a fixed demo trip, and `updateMapStats()` runs in Live mode too, so the stats bar shows that history trip while the header claims live tracking | L14562, L11521 | `00a` 14, `04` #13 | T10 |
| F-144 | Four pages have no `subs` entry, so `#tb-sub` renders empty while every other page has a subtitle: `exec-overview`, `fraud`, `rwallets`, `corp-detail` (which also has a `titles` entry, making the omission asymmetric) | L2169 vs L2168 | `01` #14, `02b` #11, `12c` G1, `05b` #13 | T10 |
| F-145 | Four ids exist in markup that nothing ever writes to: `#zones-sub` (L1306), `#coverage-sub` (L1223), `#st-preview` (L14018), `#meta-reasons` (L1796 - present in markup, absent from `renderSettingsMeta`'s map) | as cited | `11b`, `10c` #14, `16j` #3 | T7 |
| F-146 | `.sb.pin` has 8 CSS rules with no markup and no JS to activate them; `.sb-logo-text` is styled and has no element | L31-L435 region | `00a` 15 #7/#8 | T7 |
| F-147 | The topbar `Owner - settings` chevron advertises a dropdown that does not exist | L545 | `00a` 15 #11 | T7 |
| F-148 | `#impersonation-bar` and `#call-bar` are `position:fixed` children of `.topbar`; the impersonation bar sits at `top:0` and covers the topbar itself, obscuring the title, back button and search while impersonating | L564-L565 | `00a` 15 #14 | T10 |
| F-149 | `.map-stat`, `.ms-item`, `.ms-lbl`, `.ms-val` are each defined twice with conflicting layout rules; the second block wins and the first is dead. `.sm` is overloaded for both `.btn` and `.csel` | L217-L220 vs L365-L368; L81, L323 | `00b` 12.20, `04` #11 | T7 |
| F-150 | ~40 untokenised colours, including two different blues in use for "live" affordances (`--blue #185FA5` vs `rgba(26,115,232,...)`), and duplicate token values (`--sb-bg` and `--bg` are both `#EEF0F3`) | L341, L347 | `00b` 12.18/12.19 | T12 |
| F-151 | 22 structural `!important` declarations in the responsive layer, including `.mob-only{display:flex!important}` which exists solely to beat an inline `display:none` on the hamburger | L554 | `00b` 12.21 | T7 |
| F-152 | Toast colours bypass the token system - eight hardcoded hex values that near-miss the `--*-lt` tokens | `00b` 5.2 | `00b` 12.17 | T12 |
| F-153 | `TOAST_MAX = 1` drops bursts: when several alerts fire in one tick, all but the last are removed synchronously and never seen. 19 of 349 `toast()` calls pass `notify=false` and rely on the caller pushing its own notification | L5258 | `00b` 12.16 | T10 |
| F-154 | No ESC handling and no focus management on any of the 99 modals: zero `Escape`/`keyCode 27` handlers, no `role="dialog"`, no `aria-modal`, no focus trap, no focus restore. Keyboard-only users are trapped, and tab order leaks behind the scrim | `00b` 2 | `00b` 12.1/12.2 | T12 |
| F-155 | `.g4` grid class holds 6 tiles | L850 vs L3411-L3418 | `06a` #13 | T12 |
| F-156 | `Trial` corporate status is styled and never assigned; `Prepaid balance` billing type and `expectedEmployees` have no downstream behaviour, and nothing warns when linked headcount exceeds `expectedEmployees` | L6487, L6490, L6593 | `05b` #3/#21 | T7 |
| F-157 | `At risk` is an unreachable subscription filter - zero occurrences of `status:'At risk'`. "At risk" exists only as a computed Health value, which is not stored and not filterable | L3501 | `05a` #2 | T7 |
| F-158 | `Normal` incident severity has no producer and there is no UI to set a severity at all, so the third badge branch is unreachable | L13429 | `10e` #16 | T7 |
| F-159 | `Large` is missing from the ride-request vehicle select although `DB.quickRideTypes` defines it and the Pricing page can edit it - a `Large` request cannot be created from the ops panel | L2459 vs L13911 | `06b` #12 | T5 |
| F-160 | The `Days left` column header sits above a cell that emits `Ends {sub.ends}` - a date, not a day count. No day count is computed for that column | L744 vs L3551 | `05a` #5 | T4 |
| F-161 | The sub-profile header renders `{d.trips} complete` where `d.trips` is the string `5/5`, producing `5/5 complete` | L4350 | `09b` #18 | T4 |
| F-162 | A missing capacity value renders **green**, reading as "has room" when the value is actually unknown | L6395 | `08a` #21 | T4 |
| F-163 | Two different "low rating" thresholds coexist: the `limited` tier tile hardcodes `<3.5` while `lowRatingThreshold()` returns 2.5. There is also no low-rating filter on the drivers roster at all | L6349 vs L15243 | `08a` #16 | T9 |
| F-164 | Tier tile sub-labels are literal strings (`rating >=4.7, 90d+`) duplicated from `computeDriverTier()` with no shared constant | L6366-L6368 vs L13597-L13599 | `08a` #12 | T9 |
| F-165 | Trip logs sort lexicographically via `date.localeCompare` on labels like `25 Jun 07:00`, so `01 Jul` sorts before `25 Jun` at any month rollover | L4293, L4295 | `05a` #14, `09b` #17 | T4 |
| F-166 | `dateMs` exists only on reconstructed trips, so `tripsTable()`'s `dateMs||0` sort ties every seed and live trip at 0 and renders in array order - the promised "newest first" holds only for generated history | L18756, L3716-L3718 | `06a` #4, `09b` #20 | T4 |
| F-167 | `km`, `min`, `fare` and `driverEarn` are stored as strings and coerced ad hoc with `parseFloat` at each use site. The cancelled seed record carries em-dashes, so `parseFloat` yields `NaN`, saved only by `||0` on All Trips - and printed raw on Quick Rides | L2681, L3422, L3457-L3458 | `06a` #5 | T13 |
| F-168 | Fare and driver-earn cells are unformatted strings on Quick Rides (`t.fare||'0.00'`) while All Trips applies `toFixed`; and the Quick Rides export omits three visible columns and filters on `kind !== 'Subscription'` rather than `kind === 'Quick ride'` | L3459-L3460, L9178-L9179 | `06b` #9/#10 | T9 |
| F-169 | **VERIFIED.** Four stale counts in user-facing copy: `Search 38 reason codes...` against 40 actual codes, `plus 14 codes` against 16, `Thirteen queues` against 12 entries in `QUEUE_LABEL`, and a `6-group` comment above 3 groups of markup | L14762 vs L14667-L14722; L1775; L19064 vs L19104; L7323 | `13a` #11, `15k` #6, `03b` #13, `16j` #11 | T12 |
| F-170 | `#bc-audience-count`'s static default says "rider(s)" while the JS writes "recipient(s)" | L1893 vs L7688 | `16d` #9 | T12 |
| F-171 | Three push audience label mismatches between the `<option>` text the operator picks and the label stored on the record - so the sent log and the "By audience" chips show wording the operator never saw | L7742 | `16e` #2/#3 | T12 |
| F-172 | The disable-gateway toast uses severity `ok` for both directions, so turning a gateway **off** renders as a success toast | L7484 | `15h` #8 | T12 |
| F-173 | Fourteen lists and tables have no empty state and render bare headers over an empty body: cities (L7768), gateways (L7464), reason codes, cancellation-policy tables, subscription-health (L14242), corporate list, payouts (L8753), disputes, lost and found (L14399), promos (L13509), exec cities (L6939), quick rides, drivers, team roster (L10455) | as cited | 12 modules | T12 |
| F-174 | Eleven surfaces have no search, sort, filter or pagination: All-drivers (L899-L905), Riders, Corporate list (L6486), Compliance (whole fleet, `max-height:420px` only), All-Pending (decided and open interleaved), team roster, refunds ledger (L3213), credit notes (L15934), the five driver-wallet lists, the ticket queue (no search box), and the audit pager (one button per page, no windowing, L9313-L9317) | as cited | 11 modules | T12 |
| F-175 | No totals row on any money table: `payTable` (L3749-L3753), payouts (L983), the debt ledger (L12256), the earnings statement (L7222) | as cited | `12a` G4, `12b` G11 | T12 |
| F-176 | Seeded `assignedSub:'SUB-1052b'` on two subscription requests points at a subscription id that does not exist, so the `View sub` button opens a broken profile | L2796, L2799 | `07c` #7 | T13 |
| F-177 | Dangling trip references: `TRP-8977` (INC-013) and `TRP-8720` (INC-011) exist only in `DB.incidents` and `DB.lostFound` and are not keys in `DB.trips`. INC-013's **Open trip** button therefore hits `resolveId()`'s null path and toasts "No record for TRP-8977" - one of the two reachable Open-trip buttons in the module is broken | L14450-L14451, L2680 | `10e` #15 | T13 |
| F-178 | Seeded request pickup and destination values (`King Saud University`, `Kingdom Tower`, `Airport T5`, `KAFD`, `Al Sahafa District`, `Al Wurud District`) are not `RIYADH_DISTRICTS` members, so any code path computing a route from them yields `null` | L2787-L2789 | `06b` #23 | T13 |
| F-179 | None of the 7 seeded subscriptions carries `days`, `departTime`, `direction` or `route`, so `evaluateSubStart`, `generateUpcomingTripsForSubscription`, `directionArrows` and the corporate geo-radius rule all degrade or silently never fire for them | L2560 region, L6560 | `05a` #15, `05b` #15 | T13 |
| F-180 | `autoRenew` is absent from every seeded subscription; the only writes are inside `toggleAutoRenew()`. At boot `autoRenew === false` is false everywhere, so the "Manual renewal required" KPI reads 0 and the `manual` filter yields an empty page until an operator explicitly turns auto-renew off | L5450, L5477 | `07a` #10 | T13 |
| F-181 | Demo leftovers in the renewal wizard: `flowRider = 'RDR-1041'` and a `|| 'RDR-1041'` fallback; a "Keep same driver?" toggle with no id that is never read; and `tryAnotherCard()` inputs with no ids, so "Save & charge" re-enters `processCharge()` with the same hardcoded Visa | L11272, L11278, L11319, L11487-L11489 | `07a` #1-#4 | T13 |
| F-182 | Seeded evidence contradicts seeded telemetry in the same card: DSP-07's hand-written GPS-trail line claims 18 minutes on site while the seeded trace yields a 14-minute dwell | L14392 vs L17624 | `13b` #10 | T13 |
| F-183 | Seven orphan `stabgrp.*` Arabic dictionary keys describe a 7-group settings taxonomy the markup does not use - the rail has 3 groups. Dead data that will mislead the next translator | L7915-L7916 vs L1420, L1424, L1436 | `00d` F5, `16j` | T12 |
| F-184 | Five settings tabs silently stay English in Arabic mode because their keys are missing from `LANG_STRINGS.ar` (`stab.branding`, `stab.integrity`, `stab.rota`, `stab.ledger`, `stab.pricing`). The fallback to `dataset.i18nOriginal` makes a missing key indistinguishable from a deliberately untranslated one - no warning, no marker | L1431-L1435, L7951 | `00d` F2 | T12 |
| F-185 | Arabic reason-code labels render unconditionally in English mode (`labelEn + ' - ' + labelAr` in every dropdown option, plus an always-visible Arabic column), while codes added through the UI get `labelAr:''` permanently with no Arabic input in the add form | L14759, L15078, L15121 | `00d` F11/F12 | T12 |
| F-186 | Nothing is number-, date- or currency-localised. `Intl` is never used; money is `n.toFixed(2)+' SAR'` at 92 call sites; dates split between `en-GB` (8 sites) and the viewer's browser locale via `[]` (10 sites); `toFixed` appears 248 times and is locale-blind. Arabic-Indic digits appear 0 times. The currency and timezone selects are write-only - 7 options each, saved and audited, changing nothing | L4394, L7982, L7989, L19760 | `00d` F13/F14, `15a` #1/#2 | T12 |
| F-187 | `<html>` receives `lang` but never `dir`, so assistive technology is told the document is Arabic while its base direction stays LTR and 40 untranslated pages are announced under an `ar` tag. No attribute is translatable either - zero support for `data-i18n-placeholder`/`-title`/`-alt`/`-aria`, so every tooltip, placeholder and accessible name stays English | L7943, L571, L481 | `00d` F7/F8 | T12 |
| F-188 | Arabic widens the expanded sidebar from 236px to 268px with no corresponding `.main` adjustment, and RTL never reaches page content by design - the result is a right-hand RTL rail bolted to a full LTR English body. The RTL implementation also uses two parallel hooks for one idea (`body.lang-ar` for desktop width, `.sb[dir="rtl"]` for the mobile drawer) | L31, L435, L370-L381 | `00d` F16/F17/F9 | T12 |

---

## 7. Findings by theme - the pattern view

This is the section to plan work from. 188 individual bugs are unactionable; 13 patterns are. Themes are ordered by remediation leverage, not by count.

---

### T2 - Access control declared but not enforced (17 by primary theme: 10 critical, 7 medium; 7 more cross-referenced below)

**The pattern.** The panel has *three* permission systems - a 13-key broad list (`can`/`requirePerm`), a 52-key granular page matrix (`canPage`/`requirePagePerm`), and an 88-entry confirmation-gate registry (`guardAction`) - and none of them is authoritative. The broad list is enforced at 131 sites but leaves `view_profiles` at zero. The granular matrix is enforced at 15 of 52 keys, covers 22 of 41 pages, and syncs one-way into the broad list. The gate registry fails open on exception and is disableable by a public global. Every gate sits on the *commit* function by deliberate design (L3117-L3121), so every modal opens freely and the refusal arrives on the last click.

**Findings:** F-002, F-003, F-004, F-005, F-006, F-007, F-008, F-009, F-012, F-016 (critical) - F-021, F-047, F-059 (high) - F-078, F-079, F-080, F-084, F-085, F-087, F-088, F-100, F-106 (medium) - F-146, F-147 (low).

**One change with the widest blast radius:** make `can()` the single resolver over a merged broad+granular model, then add the 19 missing pages and enforce the 37 open keys. That closes or downgrades 14 of the 24.

---

### T4 - Displayed numbers that are wrong (25 by primary theme: 16 high, 4 medium, 5 low)

**The pattern.** Almost every wrong number has the same shape: a KPI reads a field that no writer ever populates (`docStatus`, `d.status`, `autoRenew`, `promo.spent`), or two counters over the same data apply different predicates (`subIsCovered` vs raw registration, `inboxItems` vs `inboxFiltered`, `activeSubsList` vs `backupCoverage`). Four counters are simply hardcoded HTML sitting above live tables.

**Findings:** F-018, F-019, F-020, F-029, F-030, F-036, F-042, F-045, F-049, F-050, F-052, F-053, F-054, F-058, F-061, F-063, F-120 (high) - F-096, F-126, F-131, F-160, F-161, F-162, F-166 (medium/low overlap) - F-155, F-165.

**Diagnostic worth running once:** for every field read by a KPI formula, grep for an assignment. Four of the six systemic cases in this register (`docStatus`, `d.status`, `autoRenew`, `promo.spent`) would have been caught by that single sweep.

---

### T5 - Actions that silently do nothing (16 by primary theme: 11 high, 4 medium, 1 low; 7 more cross-referenced below)

**The pattern.** A modal collects input, the commit function writes an audit line and a toast, and the actual effect - a message sent, money moved, a state changed - is absent. In eleven cases the toast text explicitly asserts the missing effect ("rider notified", "Sent to N recipients", "Review action applied", "Compensation: 20% off"). The audit entry then makes the fiction durable.

**Findings:** F-022, F-023, F-024, F-025, F-026, F-027, F-031, F-038, F-039, F-040, F-043, F-044, F-055, F-056 (high) - F-060, F-117, F-121, F-122, F-127, F-128, F-159 (medium) - plus F-034 and F-033, where the action's mount point does not exist.

**Rule to adopt:** a toast may only assert what the function actually did. Every "notified" / "sent" / "applied" string in the file should be traceable to a call in the same function body.

---

### T7 - Dead code and dead data (30 by primary theme: 3 high, 19 medium, 8 low)

**The pattern.** Three sub-shapes. (a) *Orphan mount* - a full renderer whose target element does not exist (`renderOnCall` -> `#oncall-body`, `renderDriverCircuit` -> `#circuit-driver-select-wrap`, four write-only ids). (b) *Superseded but not deleted* - `markDocRenewed`, `confirmModal`, the Leaflet layer, the second `DB.upcomingSubTrips` seed, `openUserSwitchGuardless`. (c) *Declared, never read* - roughly 30 configuration fields plus nine defined-and-unreferenced functions.

**Findings:** F-066, F-067, F-069, F-072, F-095, F-097, F-100, F-107, F-108, F-109, F-110, F-124, F-127, F-133, F-135, F-136, F-138, F-139 (medium) - F-145, F-146, F-147, F-149, F-151, F-156, F-157, F-158 (low) - F-033, F-034, F-035 escalate to high because a user-visible feature is missing as a result.

**Cheap win:** deleting the Leaflet layer (F-035) removes two render-blocking third-party requests from every page view and ~120 lines of code.

---

### T3 - Money that does not move, or moves twice (10 by primary theme: 2 critical, 6 high, 2 medium; 9 more cross-referenced below)

**The pattern.** Settlement, dispute resolution, compensation, absence forfeiture, cancellation fees and renewal all compute an amount, display it, log it, and never post it. Conversely the two paths that *do* post - wallet credit and wallet debit - have an idempotency key that expires after one second. And the ledger that would catch either problem is fed by only three of the eight money paths.

**Findings:** F-011, F-012, F-013 (critical) - F-024, F-025, F-026, F-027, F-030, F-046, F-051, F-056 (high) - F-098, F-099 (medium) - plus the absence-forfeiture and emergency-claim halves recorded under `10b` #7 and the escrow/deduction gaps under `12b` G4/G7/G8.

**Structural cause:** there is no single "post a money movement" primitive. `recordRefund`, `creditRiderWallet`, `debitRiderWallet`, `payDriver`, `releaseEscrow`, `confirmApplyDeduction` and `logGoodwill` are seven independent entry points with three different idempotency behaviours and two different ledger-posting behaviours.

---

### T9 - Duplicate or disjoint models of one truth (20 by primary theme: 5 high, 12 medium, 3 low)

**The pattern.** The same concept is modelled two to five times with no reconciliation: five pricing models, three tier-badge implementations, two status-badge maps, two logo stores, two CSV encoders, two audience resolvers, two "open ticket" definitions, two "covered" definitions, two "low rating" thresholds, two document vocabularies, two role vocabularies, two timestamp formats.

**Findings:** F-032, F-041, F-053, F-057, F-063 (high) - F-086, F-103, F-105, F-111, F-112, F-113, F-114, F-115, F-129, F-132, F-137, F-140, F-164, F-168 (medium/low).

**Highest-value single merge:** the pricing models (F-032). Five sources, four different Economy per-km rates, and the one that is labelled "live" prices nothing.

---

### T6 - Audit trail gaps and integrity (17 by primary theme: 1 critical, 1 high, 15 medium; 3 more cross-referenced below)

**The pattern.** The audit log is the file's stated accountability mechanism and it fails at four levels: **coverage** (135 of 161 keys unlabelled, so 86% of activity is unfilterable), **content** (`before`/`after` empty or falsified at a dozen sites; deletions never diffed; arrays rendered as `[object Object]`), **integrity** (500-entry ring buffer, colliding ids past the cap, raw-HTML summaries, actor misattributed during impersonation), and **completeness** (document approval, ticket creation, notifications, plan-feature edits, snapshot exports and several call outcomes write nothing).

**Findings:** F-015 (critical) - F-017, F-056 (high) - F-073, F-074, F-075, F-076, F-077, F-081, F-082, F-083, F-091, F-093, F-094, F-101, F-102, F-106, F-123 (medium) - F-103, F-105.

**Note the asymmetry that recurs:** in five separate modules the *destructive* half of a pair is audited and the *constructive* half is not (reject vs approve a document, suspend vs auto-unsuspend, pause vs resume a promo, add vs remove a gateway/limit/city).

---

### T8 - Configuration stored but never enforced (6 by primary theme: 2 high, 4 medium; the remaining inert settings are enumerated in the finding text below)

**The pattern.** A settings tab renders a control, `save*` writes it to `DB`, `logAction` records the change - and no reader exists. This is a stronger failure than a missing feature: the setting *appears* to work and is *logged* as changed. Confirmed inert: currency, timezone, support email/phone, session timeout, `require2FA`, 5 of 8 operational limits, all custom limits, gateway `enabled`/`isDefault`, `graceMin`, `qr_after_arrival`, `sub_before_first_trip`, `workHoursOnly`, `sortOrder`, `ecoActive`/`comfortActive`, `duration`, `breachEscalateTo`, `tiers[].hours`, `confirmDeadline`, `dispatchWindowSec`, `appealWindowDays`, `forfeitRemaining`, `demoteTier`, `planProbation`, `riderWaitMin`, `riderNoShowPayPct`, `payoutDays`, `lat`/`lng` on cities.

**Findings:** F-031, F-055, F-070 (high/medium) - F-118, F-119, F-124, F-125, F-139 and the per-tab entries in `15a`, `15e`, `15h`, `15i`, `15j`, `16g` - F-186 (low, currency/timezone).

**Cheap mitigation already half-present:** `DB.opsLimits` carries an honest `enforced` / `enforcedBy` pair (L2580-L2591). Extend that convention to every settings field and render it in the UI, so an operator can see which controls are live.

---

### T10 - Staleness: render, refresh and boot order (8 by primary theme: 2 high, 2 medium, 4 low; the boot-omission list below is collapsed into F-054 and F-062)

**The pattern.** Fifteen surfaces are blank or stale until their page is first visited, because the 45-call boot block at L14556-L14600 is a hand-maintained list that has drifted from the renderer set. A second shape: an action mutates `DB` and re-renders *some* of the surfaces that read it. A third: `switchSettingsTab` renders nothing - all 21 settings renderers fire once in `go('settings')`, so a tab opened later shows stale data.

**Findings:** F-054, F-062 (high) - F-092, F-117, F-121, F-134 (medium) - F-141, F-143, F-144, F-148, F-153, and the boot-omission list: contribution card and credit notes (`12a` G1), cash reconciliation (`12b` G1), ride-types table (`14a` #20), growth cards (`11a` #12), identity collisions (`02b` #8), notification chip counts (`03c` #11), exec overview (`01` #3).

**Structural fix:** derive the boot list from a renderer registry instead of maintaining 45 call lines, and make the 1 Hz tick engine (which already re-renders visible pages) responsible for badge refresh.

---

### T13 - Data integrity: collisions, dangling refs, caps (17 by primary theme: 2 critical, 6 medium, 9 low)

**Findings:** F-010, F-014 (critical) - F-042, F-046, F-052 (high) - F-065, F-089, F-090, F-104, F-116, F-130 (medium) - F-142, F-167, F-176 to F-182 (seed artefacts, counted under low).

**The pattern.** Ids derived from `length`, references that point at records which do not exist, arrays with no cap (`DB.notifications`, `DB.surgeSuspensions`, `DB.contacts` at 2000, `DB.auditLog` at 500 with collisions), and writes that clobber structure (`resetBranding` deleting `maxUploadMB`, `saveReasonCodes` pinning inherited values, `openNewRiderProfile` dropping seven fields).

---

### T11 - Injection, escaping and id hygiene (1 register id + a collapsed cluster of 11 reports)

**The pattern.** Every one of the 99 modals, 349 toasts and every table render interpolates `DB` values into `innerHTML` with **no escaping anywhere in the file**. `toast()` strips tags only for the `title=` attribute (L5290), not the visible message. Confirmed unescaped surfaces: `audit.summary` (L9301) - which is composed from operator free text at many call sites - notification `title`/`desc` (L2254-L2255), ticket `msg`/`subject` (L6258, L2349), dispute `claim`/`evidence` (L14407, L14410), limit `label`/`unit` (L7391, L7393), reason-code `labelEn`/`owner` (L15075, L15085), branding `logoUrl`/`wordmark` (L18412-L18421), legal `doc.label`/`v.summary` (L3809-L3838), email and push bodies (L7529-L7588, L7762). Adjacent: `new Function(item.action)` string-eval in the Work Inbox (L19308) and `new Function(onChangeExpr)` in the custom select (L5411), plus zone and entity names interpolated directly into `onclick` strings at seven sites - an apostrophe in a zone name breaks the handler.

**Findings:** F-071 (id collision, VERIFIED) plus the escaping cluster; individually low-severity today because all data is local and mock, collectively the reason a CSP is impossible (`00b` 12.24: the panel needs `unsafe-inline` for hundreds of `onclick=` attributes and `unsafe-eval` for `new Function`).

**Do this once:** one `esc()` helper applied at every interpolation site. It is mechanical and it retires the whole class.

---

### T12 - i18n and localisation (20 by primary theme: 2 high, 18 low)

**The pattern.** Coverage is 86 of 621 static elements (13.8%) and effectively 0% of the running application - 40 of 41 page shells carry no key and no JS string builder emits the attribute. What exists is fragile: `textContent` assignment destroys inline markup permanently on the first toggle, five tabs silently fall back to English, seven dictionary keys are orphans, and the language choice is not persisted and is gated behind a permission four of five operators lack.

**Findings:** F-047, F-048 (high) - F-169, F-183, F-184, F-185, F-186, F-187, F-188 (medium/low) - F-150, F-152, F-154, F-155, F-170 to F-175 (presentation and affordance gaps counted here).

---

### T1 - No persistence, no network, no backend (1 register id; the frame for T3 and T6)

**Findings:** F-001 (critical), F-035 (the only two network requests in the file are for a dead feature), F-095/F-099 (the ledger models a backend that does not exist), F-001's disclosure gap.

**This is the frame, not a bug.** Every T3 and T6 finding is downstream of it. The register's practical recommendation is to make the boundary explicit in the UI rather than to remediate it in the artifact.

---

## 8. Findings by module (index)

Every one of the 60 module documents, with the register ids its reports contributed to. A finding appears under every module that observed it - this is the reverse of the dedup log in section 10.

| Module doc | Finding ids |
|---|---|
| `00a-global-navigation-and-routing` | F-001, F-054, F-064, F-141, F-142, F-143, F-144, F-146, F-147, F-148 |
| `00b-global-ui-systems` | F-001, F-007, F-035, F-065, F-072, F-149, F-150, F-151, F-152, F-153, F-154, and the T11 escaping cluster |
| `00c-identity-permissions-and-audit` | F-002, F-003, F-004, F-005, F-006, F-008, F-015, F-016, F-017, F-074, F-090, F-091, F-092, F-093, F-094, F-100, F-101, F-103, F-104, F-105, F-106, F-107 |
| `00d-i18n-and-localisation` | F-001, F-017, F-047, F-048, F-169, F-183, F-184, F-185, F-186, F-187, F-188 |
| `01-executive-overview` | F-004, F-020, F-049, F-144, F-173 |
| `02a-predictive-signals` | F-005, F-064, F-068, F-173 |
| `02b-fraud-and-risk` | F-004, F-054, F-138, F-144 |
| `03a-dashboard` | F-058, F-062, F-063, F-068 |
| `03b-work-inbox` | F-021, F-054, F-063, F-138, F-169, and the `new Function` half of T11 |
| `03c-notifications` | F-037, F-076, F-139 |
| `04-live-map` | F-028, F-033, F-035, F-059, F-112, F-143, F-149 |
| `05a-subscriptions` | F-005, F-025, F-032, F-108, F-109, F-110, F-157, F-160, F-165, F-179 |
| `05b-corporate-accounts` | F-004, F-010, F-046, F-078, F-079, F-144, F-156, F-174, F-179 |
| `06a-all-trips` | F-005, F-061, F-064, F-071, F-073, F-111, F-139, F-155, F-166, F-167 |
| `06b-quick-rides-and-ride-requests` | F-005, F-010, F-029, F-039, F-051, F-065, F-111, F-159, F-168, F-178 |
| `07a-renewal-pipeline` | F-007, F-054, F-056, F-181 |
| `07b-trip-readiness` | F-027, F-045, F-059, F-060, F-077, F-135, F-136, F-137 |
| `07c-requests` | F-006, F-007, F-010, F-054, F-176 |
| `08a-drivers` | F-010, F-018, F-019, F-022, F-027, F-070, F-093, F-111, F-134, F-162, F-163, F-164 |
| `08b-driver-onboarding-applicants` | F-008, F-009, F-010, F-019, F-040, F-041, F-093, F-174 |
| `09a-riders` | F-050, F-066, F-089, F-139, F-174 |
| `09b-360-profile-system` | F-004, F-022, F-073, F-165, F-166 |
| `10a-captain-fairness` | F-004, F-054 |
| `10b-plan-commitment` | F-055, F-138, F-139, and the forfeiture half of T3 |
| `10c-coverage-capacity` | F-052, F-053, F-054, F-080, F-134, F-140, F-145 |
| `10d-compliance` | F-005, F-018, F-043, F-054, F-069, F-081 |
| `10e-safety` | F-005, F-043, F-044, F-054, F-082, F-083, F-104, F-158, F-177 |
| `11a-promos-and-growth` | F-012, F-023, F-024, F-066 |
| `11b-zones` | F-042, F-052, F-054, F-134, F-139, F-145 |
| `12a-finance` | F-030, F-032, F-096, F-139, F-174, F-175 |
| `12b-driver-wallets` | F-001, F-099, F-173, F-174, F-175 |
| `12c-rider-wallets` | F-004, F-012, F-139, F-144 |
| `13a-support-center-tickets` | F-001, F-071, F-073, F-075, F-124, F-125, F-126, F-127, F-128, F-129, F-169, F-174 |
| `13b-disputes-and-lost-found` | F-026, F-044, F-139, F-173, F-182 |
| `13c-contact-drivers` | F-060, F-071, F-124, F-125, F-126, F-130, F-131, F-132, F-133 |
| `13d-interventions` | F-004, F-054, F-062, F-063, F-135, F-136 |
| `14a-pricing-plans` | F-017, F-031, F-032, F-067 |
| `14b-plan-editor` | F-017, F-031, F-067, F-074 |
| `15a-settings-general` | F-001, F-084, F-115, F-186 |
| `15b-settings-team-roles` | F-002, F-003, F-016, F-021, F-086, F-090, F-173, F-174 |
| `15c-settings-permissions` | F-005, F-016, F-100 |
| `15d-settings-notifications` | F-037, F-139, and the single-trigger gap under T8 |
| `15e-settings-security` | F-001, F-016 (2FA half), T8 |
| `15f-settings-dispatch` | F-118, F-120, F-121, F-122, F-123 |
| `15g-settings-cities` | F-017, F-173, T8 (`lat`/`lng`) |
| `15h-settings-gateways` | F-007, F-017, F-172, F-173, T8 |
| `15i-settings-limits` | F-017, F-070, F-118, F-119, and the T11 escaping cluster |
| `15j-settings-cancellation-policy` | F-017, T8 (`graceMin`, `qr_after_arrival`, `sub_before_first_trip`) |
| `15k-settings-reason-codes-sla` | F-014, F-017, F-021, F-034, F-085, F-086, F-087, F-124, F-125, F-138, F-169 |
| `16a-settings-branding` | F-017, F-084, F-115, F-116, F-117, F-139 |
| `16b-settings-data-integrity` | F-017, F-032, F-057 |
| `16c-settings-legal-consent` | F-017, F-038, F-088 |
| `16d-settings-emails` | F-010, F-017, F-113, F-170 |
| `16e-settings-push` | F-010, F-017, F-113, F-171 |
| `16f-settings-export` | F-001, F-006, F-010, F-114 |
| `16g-settings-pricing-windows` | F-032, F-042, F-067, F-139 |
| `16h-settings-ledger` | F-011, F-013, F-095, F-096, F-097, F-098, F-099 |
| `16i-settings-rota-oncall` | F-034, F-064, and the rota dead-code cluster under T7 |
| `16j-settings-activity` | F-015, F-101, F-145, F-169, F-183 |
| `16k-audit-log` | F-006, F-015, F-017, F-094, F-101, F-102, F-103, F-174, and the `summary` half of T11 |

---

## 9. Systemic root causes

Five causes explain the large majority of the 188 findings. Fixing a root cause retires or downgrades a block of findings; fixing findings one at a time does not touch the cause.

---

### RC-1 - There is no backend, so every guarantee is simulated in the browser

**Explains:** F-001 directly, and is the upstream cause of the whole of T3 (10 primary + 9 cross-referenced) and most of T6 (17) - 30 to 35 findings once overlap is removed.

`localStorage`, `sessionStorage`, `indexedDB`, `fetch` and `XMLHttpRequest` all return 0 occurrences. Idempotency (`withIdempotency`), double-entry accounting (`postLedger`, `trialBalance`), reconciliation (`reconcileEntity`), consent versioning, request claim locks and the audit ring buffer are all client-side models of server-side guarantees. They fail in the specific ways client-side models fail: the idempotency window is a wall-clock second (F-011), the trial balance can never be out of balance because the poster refuses unbalanced entries (F-097), claims are wiped whenever any modal closes (F-065), and the audit log is a 500-slot buffer with colliding ids (F-015). The file is honest about this in comments (L19860-L19863, L5225-L5228) and dishonest about it in UI copy (every gate consequence promising durability).

**Consequence for planning:** do not remediate T3/T6 findings inside the artifact. Record them as the specification for the server that has to exist, which is what the ledger module already says it is.

---

### RC-2 - Permissions were bolted on three times and never unified

**Explains:** all 17 primary-T2 findings and the 7 cross-referenced, plus F-017 and much of T6's coverage problem - about 28 findings.

Three systems, added in three passes, each with its own vocabulary: 13 broad keys enforced at 131 sites; 52 granular `(page, action)` keys enforced at 15; 88 confirmation gates. The file's own comment at L10555-L10559 declares a standing rule that new pages get matrix entries "in the same change" - and 19 of 41 pages violate it. The granular layer syncs into the broad layer one-way, so revoking a granular key changes nothing. `can()` has one functional call site. The result is that the permissions UI is the least reliable description of what a role can actually do, which is the opposite of its stated purpose (L1165: *"Enforced everywhere in this panel, not just shown here"*).

**Consequence for planning:** one resolver, one vocabulary, one enforcement point per action. This is the single highest-leverage change in the register.

---

### RC-3 - Fields are written by one surface and read by another that was never updated

**Explains:** most of T4 (25) and T9 (20), plus F-018, F-019, F-031, F-070 - about 35 findings.

The recurring failure is a *reader without a writer* or a *writer without a reader*. `docStatus` has two readers and no writer. `d.status` has one reader and no writer. `promo.spent` has one reader and no writer. `autoRenew` has readers and only conditional writers. Conversely roughly 30 configuration fields (T8) have writers and no readers. The panel has no mechanism - no schema, no type, no test - that would notice.

**Consequence for planning:** a one-off static sweep pairing every `DB.*` property read against its assignment sites would surface the entire class. Four of the six worst instances in this register were found independently by four different module agents, which is evidence the sweep is worth automating rather than repeating by hand.

---

### RC-4 - Effects are asserted in copy rather than implemented in code

**Explains:** all 16 primary-T5 findings, the 7 cross-referenced, and most of T8 - about 33 findings.

Toasts, gate consequences and card captions describe behaviour the adjacent function does not perform. Sampled instances: *"rider notified"* with no send; *"Sent to N recipients"* with no outbox write; *"Review action applied"* with no DB write; *"Compensation: 20% off"* with no credit; *"hides this plan from new subscriptions"* with no filter; *"Capturing twice in one day overwrites the earlier snapshot"* with no de-duplication; *"Any action you take is recorded against your name"* with the opposite implemented; *"the plan appears in the renewal flow"* against a hardcoded `PLANS` constant; *"applies to new ride requests immediately"* on a button that writes nothing. The pattern is consistent enough to be a process artefact: copy was written against the intended design and the implementation diverged without the copy being revisited.

**Consequence for planning:** treat every user-facing assertion of an effect as a claim to be verified against the function body. The gate registry (`GATE_SPECS`, `GATE_SWEEP`) is the densest concentration of these claims and the best place to start.

---

### RC-5 - Render is imperative and hand-wired, so surfaces drift out of sync

**Explains:** all 8 primary-T10 findings and the boot-omission list, F-054's many instances, and the "action re-renders some surfaces" half of a dozen others - about 20 findings.

There is no reactive layer. State changes and then the mutating function names, by hand, the renderers it thinks are affected. Boot is a hand-maintained list of 45 sequential calls with no `try`/`catch` (one throw kills everything after it, including `startTickEngine()` at position 42). Badges are owned by whichever page renderer happened to compute them. `switchSettingsTab` renders nothing at all. A `MutationObserver` watches the entire document body purely to auto-size `<select>` elements. Fifteen surfaces are consequently blank until first visit, and every mutation is a chance to forget a renderer - which `renderInterventions` (F-062) shows can happen even to a `typeof`-guarded call.

**Consequence for planning:** a renderer registry keyed by the `DB` collections each renderer reads would make boot, tick refresh and post-mutation refresh derivable instead of hand-maintained.

---

## 10. Deduplication log

Roughly 470 raw reports across 60 documents reduced to 188 findings. The merges below are the ones where independent agents found the same root defect from different angles, or where one pattern produced many instances. Merges of the "same item, same wording, two modules" kind are not listed individually - only the ones a reader might otherwise mistake for distinct problems.

### 10.1 Same root defect, found independently by different agents

| Register id | Merged from | Why they are one defect |
|---|---|---|
| **F-018** | `08a` #1 (Drivers: "docsAtRisk permanently 0") + `10d` #1 (Compliance: "`docStatus` never assigned - CONFIRMED") + the contradiction half of `08b` #20 | Drivers found the KPI reading zero; Compliance found the field having no writer; both are the same missing bridge between `DB.driverDocs` and `DB.drivers`. Compliance additionally supplied the contradiction (Drivers says 0, Compliance says 1) that makes it user-visible. |
| **F-032** | `14a` #1 (four pricing models) + `12a` U2 (revenue-by-plan percentages unbound) + `16b` #2/#3 (rebuild fare model contradicts the rate card) + `16g` (the rate card prices nothing) + `06b` #11 + `05a` #8 (two commission rates in one module) | Six documents each found one edge of the same five-model tangle. Merged, the finding is "one concept, five sources, four different Economy per-km rates". |
| **F-027** | `07b` #1/#2/#3 (Trip Readiness) + `08a` #7/#8 (Drivers) | Both traced `finalizeReassign`; Readiness found the `'-20off'`/`'20off'` key mismatch, Drivers found the missing permission gate. Same function, same call path. |
| **F-066** | `09a` #1 + `11a` 18.2 | Riders and Growth independently grepped `getReferralCode(` and both got exactly one hit. |
| **F-067** | `14a` #22 + `14b` #13 + `16g` dead-code table | Three documents independently confirmed `planFloorCheck` has zero call sites. `16g` added `effectiveSurge`, which fails identically. |
| **F-034** | `16i` #1 (Rota) + `15k` #8 (Reason Codes tab) | Both found `renderOnCall` orphaned; Rota supplied the full dead-code inventory behind it (`saveOnCall`, `onCallNameSimple`, `DB.onCall`, the gate spec). |
| **F-071** | `13a` #4 ("two pickers would collide") + `13c` G12 ("`gvRC` reads the wrong element") + `06a` #19 | The two reports contradict each other. Re-verified this pass: `reasonSelectHTML` hardcodes the emitted field id as `nt-reason` for **all four** pickers, so `13a` is right (duplicate ids) and `13c` is wrong (it is not always broken - it works by accident). The merged finding states the verified behaviour. |
| **F-021** | `03b` #1 (inbox routes to `'Operations'`) + `15b` #10 + `15k` #13 (`compPolicy.roles` uses `'Operations'`) | Three documents found the same phantom role in three data structures. |
| **F-124 / F-125 / F-126** | `13a` #2/#5/#6 + `13c` G5/G6/G7 + `15k` #3/#4 | Support Center, Contact Drivers and the Reason Codes settings tab each documented the same three SLA-policy defects from their own side. |
| **F-091** | `00c` F13 alone, but cross-checked against `15b` #3 and `15e` #2 | The 2FA-has-no-setter finding appears in three documents; it is folded into F-016 (offboarding/lockout) rather than kept separate, because the remediation is the same team-lifecycle work. |
| **F-062** | `03a` #1 + `13d` G2 | Dashboard and Interventions each found `renderInterventions` undefined behind the same `typeof` guard at L19054. |
| **F-065** | `00b` 12.3 + `06b` #18 (which flagged it `UNVERIFIED - closeModal body not read`) | Verified this pass: `closeModal` does call `reqClearLocks`. `06b`'s UNVERIFIED qualification is discharged. |

### 10.2 One pattern, many instances - collapsed into a single finding

| Register id | Instances collapsed |
|---|---|
| **F-054** (sidebar badge staleness) | 11 separate reports: `sbb-zones` (`11b` #5), `sbb-compliance` (`10d` #2), `sbb-safety` (`10e` #1), `sbb-coverage` (`10c` #15/#16), `sbb-fairness` (`10a` #10), `sbb-dash` / `sbb-inbox` (`03b` #5, `13d` G4), `sbb-requests` (`07c` #11), plus the three `\|\| ''`-on-zero badges and the six never-reclassed badges from `00a` 15 #4/#5/#6. **One pattern, eleven instances.** |
| **F-010** (id collisions) | 9 reports across drivers, corporate accounts, subscriptions, ride requests, emails, pushes, snapshots, audit entries and rate-card drafts. All are `length + 1` or `random()` with no uniqueness check. |
| **F-017** (unlabelled audit keys) | 15 reports. `00c` and `16k` documented the systemic 135/161 figure; thirteen settings-tab documents each independently noted that their own key (`config_updated`, `edit_branding`, `save_plan`, `archive_plan`, `history_rebuilt`, `edit_data_window`, `legal_version_published`, `edit_reason_codes`, and five more) is missing from `ACTION_LABELS`. |
| **F-138** | 9 defined-and-unreferenced functions reported across 7 documents. |
| **F-139** | ~30 dead configuration fields reported across 14 documents. |
| **F-173 / F-174 / F-175** | 14 missing empty states, 11 missing search/sort/filter/pagination surfaces, and 4 missing totals rows, each reported per-module. Collapsed because the remediation is one shared component in each case. |
| **T11 escaping cluster** | 11 documents independently reported raw `innerHTML` interpolation on their own surface. Collapsed into one theme entry plus F-071, because the fix - one `esc()` helper - is single. |
| **F-134** (uncleatable sticky filters) | 5 reports: `_coverageFilter`, `_safetyFilter`, `_zonesFilter`, `_driverTierFilter`, `window.__tripsLowOnly`. |
| **F-064** (mis-wired navigation) | 4 reports: `#my-work-chip`, `#oncall-chip`, "View route", Predictive zone rows. |
| **F-094** (audit diff defects) | 3 reports across `00c` F19, `16k` #8 and `16k` #9, plus the seven "empty before/after" per-module reports folded into the same entry. |

### 10.3 Reports deliberately **not** merged

- `F-004` (19 unmatrixed pages) and `F-005` (37 unenforced keys) look like one finding and are not: the first is a *missing* declaration, the second is a *present but unenforced* declaration. They have different fixes and different owners.
- `F-002` (`commitUserSwitch`) and `F-003` (`impersonate`) are two different code paths to the same outcome, with different defects - one has no gate at all, the other has a gate but inverted audit semantics. Merging them would hide that the second is closer to correct.
- `F-025` (settlement), `F-026` (dispute) and `F-027` (compensation) share the shape "computes an amount, never posts it" but are three separate functions in three modules; they are cross-referenced under T3 rather than merged.

---

## 11. Explicitly NOT findings

Items that were reported in the module documents, or that a reader of this register would reasonably expect to see, and that are **not** defects. They are listed so nobody spends time chasing them.

### 11.1 Intentional behaviour, documented in the source

| Item | Why it is not a finding |
|---|---|
| `TICK_ACCEL = 30` and the 1 Hz tick engine (L11952, L11968) | Deliberate demo-time acceleration so document expiries and SLA breaches arrive within a session. The arithmetic is documented at L9579. |
| `coverageBoot()` is a no-op (L17578-L17580) | Explicitly intentional; the comment says so. |
| `renderReadiness` declared inside a "FINAL OVERRIDES - executes last, always wins" block (L13004) | Despite the framing there is no earlier version being replaced, and the placement is deliberate boot-order management. The `07b` document already resolves this. |
| RTL not applied to `.main` or page shells (L370-L381) | Documented as a deliberate choice: with 13.8% translation coverage, flipping the body would produce a worse result than a hybrid layout. Reported honestly at L1502. |
| `dir` deliberately kept off `<html>` (L7943 comment) | Same reasoning. The **accessibility** consequence is a finding (F-187); the layout decision is not. |
| Gates placed on commit functions rather than buttons (L3117-L3121) | An explicit design choice with a stated rationale (one choke point per action, so every UI path is covered). The *consequence* - modals opening freely before refusal - is a finding (part of F-005/T2); the placement policy is not. |
| `inboxOpen` claims an item on open (L19299-L19300) | Deliberate and commented. The missing "just view" affordance is a UX gap, not a defect. |
| The Regulatory-integrations section being entirely inert (L13367) | The source explicitly disclaims it as illustrative. |
| The ledger module framing itself as a specification for a backend (L19859-L19863) | Stated intent. Contrast the Pricing tab, which makes **no** such disclaimer while behaving identically - that asymmetry *is* recorded, under F-032. |
| `reqClearLocks`'s single-browser limitation (L5225-L5228) | The comment is accurate about what a client-side lock can do. The finding (F-065) is that it fires on *unrelated* modals, not that it is client-side. |
| Historical notes preserved in source (L11907-L11911, L9616-L9619, L9581-L9592, L8288-L8290) | These describe bugs that were **fixed**. They are evidence of remediation, not open defects. Four module documents correctly flagged them as history. |

### 11.2 Demo-seed artefacts, not code defects

| Item | Why it is not a finding |
|---|---|
| Only three seeded incidents, two seeded disputes, one seeded corporate account, six drivers | Demo scale. The finding is that nothing can **create** more (F-044), not that there are few. |
| `Mismatch` and `unknown` branches of `vehicleVerifyBadge` never firing | All seeded applicants happen to have matching classes. A test-coverage note, not a defect - the branches are correct. |
| `'No refunds issued this session.'` empty state unreachable | Only because two refunds are seeded. Correct code. |
| The pairing-rule "3+ shared trips" flag possibly firing on reconstructed history | `02b` #7 is right that provenance is not surfaced, and that half **is** recorded under F-057's family. The RNG itself is seeded and deterministic by design. |
| `DB.cashLedger` and `DB.driverCashDebt` starting empty | They are filled by the trip simulation. Every "cash figures are 0" report is an artefact of not running the simulation. |
| `parseShortDate` hardcoding 2026 (L14204) | Real defect in principle, but unreachable while the entire fixture is pinned to 25 Jun 2026. Recorded as low-priority within F-142's family rather than as its own finding. |

### 11.3 Reported as defects but verified correct

| Reported as | Verified reality |
|---|---|
| `13c` G12: *"`gvRC()` reads the wrong element, so every wrap-up and every logged contact is coded `OTHER_UNCODED`"* | **Not true.** `reasonSelectHTML` hardcodes the emitted field id as `nt-reason` for all four pickers (L14763), so `gvRC()` reads the right element. The real defect is the duplicate-id risk, recorded as F-071. The module document itself flagged this as "Partly UNVERIFIED" pending the `customSelectHTML` body. |
| `04` #3: *"`#map-leaflet` does not exist"* | **Correct, and now verified precisely:** `grep -n map-leaflet` returns four hits, none of them a markup id - an orphan CSS rule, a comment, and two JS references inside the dead function. Recorded as F-035. |
| `09b` #8: `riderNoShowCount`'s degenerate ternary | The ternary **is** degenerate (both branches identical), but the module document correctly notes the expression still evaluates to the right boolean. Cosmetic; folded into T7 rather than raised as a behavioural defect. |
| `12b` D3: comment claiming *"final authoritative versions, override any stale duplicates"* | Grep confirms there are no earlier definitions to override. A stale comment, not a shadowing bug. |
| `00b` 12.13: `GATE_SWEEP.assignBackup` / `.autoHandoff` declared then deleted two lines later | Real, but cosmetic - it makes the registry count misleading and nothing more. |

### 11.4 Out of scope for this register

- **Real-world regulatory accuracy** of the Wasl / ZATCA / Absher obligation text (L13358-L13360). Not checkable from the source; the file disclaims it at L13367.
- **Real-world accuracy** of the 24 `KNOWN_CITIES` coordinate pairs.
- **Colour-contrast compliance** of any token pair - not measured by any module document.
- **Runtime values** of every KPI and row count. All 60 documents were static reads; nothing was executed in a browser. Where a module asserted a runtime value it is reproduced with its `UNVERIFIED` tag intact.
- **Browser-specific rendering** of the malformed `renderActiveTrips` row (`04` #1 - the `pingBorderStyle` string-concatenation bug). The source defect is certain and recorded under T5; how a given browser recovers from the stray attribute text was not tested.

---

*End of register. 188 findings: 16 critical, 48 high, 76 medium, 48 low. 34 independently verified against `eyvar_ops_panel_v40_fixed.html`; 154 carried from the module documents.*
