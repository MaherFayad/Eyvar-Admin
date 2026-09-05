# Global: UI Systems

> Source: `eyvar_ops_panel_v40_fixed.html` (21,857 lines — single file, one `<style>` block `L9–468`, one `<script>` block `L2166–21855`)
>
> Anchors: CSS custom properties `L11–21` · external assets `L469–470` · modal markup `L475–477` · modal CSS `L191–207` · `closeModal()` `L5216–5219` · `toast()` `L5269–5315` · `confirmAction()` `L17769–17801` · `guardAction()` `L17819–17840` · `installActionGates()` `L17853–18089` · `GATE_SPECS` `L18245–18370` · `GATE_SWEEP` `L20769–20887` · one-shot init `L14556–14600` · tick engine `L11968` / `L12508–12625` · boot sequence `L21807–21855`

---

## 1. Purpose

Seven cross-cutting systems that every business module in this panel depends on. All of them are hand-written in the single file — there is no framework, no build step, no module system, and no persistence layer.

| System | What it is | Scale |
|---|---|---|
| Modal | One reusable overlay/box/content triplet driven by direct `innerHTML` assignment | 99 opening sites, 311 `closeModal(` references |
| Confirmation gate | `confirmAction()` modal + `guardAction()` monkey-patch wrapper + 3 registries | 88 gated actions |
| Toast | Bottom-corner transient stack that mirrors into the notification centre | 349 call sites, 4 variants |
| Design tokens | 26 CSS custom properties on `:root` | `L11–21` |
| Class vocabulary | 219 hand-written class names | `L24–466` |
| External deps | Leaflet CSS + JS from unpkg, OSM tiles | 2 `<link>`/`<script>`, 2 tile URLs |
| Init & lifecycle | One 100 ms one-shot render pass, one 1 Hz tick engine, one guarded boot IIFE | 0 bytes of persisted state |

---

## 2. Modal system (mechanics)

### 2.1 Structure

```html
<div id="modal-overlay" onclick="if(event.target===this)closeModal()">     <!-- L475 -->
  <div id="modal-box"><div id="modal-content"></div></div>                 <!-- L476 -->
</div>                                                                     <!-- L477 -->
```

There is exactly one instance of this markup in the file, immediately after `<body>` (`L472–477`). Every modal in the app reuses it.

| Element | CSS line | Properties |
|---|---|---|
| `#modal-overlay` | `L191–192` | `display:none` → `.open{display:flex}`; `position:fixed; inset:0; background:rgba(11,43,74,.45); z-index:900; align-items:center; justify-content:center` |
| `#modal-box` | `L193` | `background:var(--white); border-radius:14px; width:520px; max-height:88vh; overflow-y:auto; box-shadow:0 24px 70px rgba(0,0,0,.22); animation:mIn .15s ease` |
| `@keyframes mIn` | `L194` | `scale(.95) translateY(10px)` + `opacity:0` → `scale(1) translateY(0)` + `opacity:1` |
| `.modal-head` | `L195` | flex row, `padding:14px 18px`, bottom hairline |
| `.modal-head h3` | `L196` | `font-size:14px; font-weight:500` |
| `.modal-close` | `L197–198` | 28×28 rounded `✕` button; hover → `--red-lt`/`--red` |
| `.modal-foot` | `L207` | `padding:12px 18px`, top hairline, `justify-content:flex-end; gap:7px; background:var(--bg2)` |
| Responsive | `L420`, `L445` | `≤1024px`: `width:92vw; max-width:520px`. `≤768px`: `width:94vw; max-width:94vw; border-radius:12px` |

### 2.2 There is no `openModal()`

**Verified: no function named `openModal` exists anywhere in the file.** Every one of the 99 modal sites performs the same two steps inline:

```js
document.getElementById('modal-content').innerHTML = '<div class="modal-head">…</div>…';
document.getElementById('modal-overlay').classList.add('open');
```

`modal-content` is referenced 112 times in total (`grep -c modal-content` = 112): 99 open sites plus re-renders of an already-open modal (e.g. `renderSubTrackingWidget` `L4807`, `renderStep1/2/3` in the renew flow `L11321`, `L11345`).

### 2.3 Close paths

```js
function closeModal(){                                    // L5216–5219
  document.getElementById('modal-overlay').classList.remove('open');
  reqClearLocks();
}
```

- **Overlay click-to-dismiss** — `L475`, inline `onclick="if(event.target===this)closeModal()"`. Fires only when the click target is the overlay itself, so clicks inside `#modal-box` do not close it.
- **`.modal-close` ✕ button** — written into `.modal-head` by each opener; almost always `onclick="closeModal()"`. Two openers override it: `renderSubTrackingWidget` (`L4808`) and its footer button (`L4824`) clear `_subTrackInterval` first; `confirmAction` (`L17785`) uses `cancelConfirm()`.
- **ESC key — NOT handled.** Verified: the only `keydown` handlers in the file are two `Enter`-to-search inputs (`L571`, `L909`). There is no `keyup`, no `Escape`, no `keyCode===27`, no `which===27` anywhere. **A modal cannot be dismissed with the keyboard.**

`reqClearLocks()` (`L5230–5233`) deletes `_locking`, `claimedBy` and `claimedAt` from **every** entry in `DB.rideRequests` and `DB.subscriptionRequests`. This runs on *every* modal close, not just the assign-driver flow. The source comment (`L5220–5229`) states this is a client-side UX safety net, not a real server lock.

`confirmModal()` (`L5234`) is a legacy stub: `alert('✅ Subscription confirmed and activated!'); closeModal();` — still wired as the confirm button of `openRenewModal()` (row 17 below).

### 2.4 Shared modal helpers

| Helper | Line | Role |
|---|---|---|
| `selOpt(el)` | `L5211–5215` | Clears `.selected` from every `.plan-option` inside `#modal-box`, sets it on the clicked one, checks its radio |
| `customSelectHTML(...)` | used at `L17776` | Builds a `.csel` custom dropdown for gate modals (native `<select>` popups cannot be restyled — see comment `L292–299`) |
| `.plan-option` / `.po-*` | `L199–206` | The selectable-card vocabulary used by plan/renew/upgrade modals |

### 2.5 Modal-scoped intervals (leak)

Four modals start `setInterval`s that `closeModal()` does **not** clear:

| Modal | Interval var | Period | Cleared by |
|---|---|---|---|
| `renderRideRequestTracking` (`L2509`) | `_rrTrackInterval` | 1000 ms | `closeRideRequestTracking()` `L2512` only |
| `openSubTrackingModal` (`L4791`) | `_subTrackInterval` | 1000 ms | its own ✕/footer handlers `L4808`, `L4824`, or self-clear `L4794` |
| `renderSubDispatchUI` flow (`L4962`) | `_nsDispatch.interval` | 250 ms | `cancelSubDispatch` `L5023`, self-clear `L4967` |
| `renderSubAcceptedTracking` (`L5165`) | `_subTrackInterval` | 1000 ms | self-clear `L5168` |

Dismissing any of these by **clicking the overlay** (`L475`) leaves the interval running against a closed modal.

---

## 3. Complete modal inventory (99 sites)

`Opener` = the enclosing function containing `.classList.add('open')`. `Fn L` = the opener's `function` line. `Open L` = the line that adds `.open`. `Title` = the `<h3>` inside `.modal-head`, concatenation syntax preserved verbatim. `Commit` = non-`closeModal` handlers in the last `.modal-foot` (or the modal body where the modal has no footer buttons). `Gated?` = whether the commit function is in a gate registry (§4).

| # | Opener | Fn L | Open L | Title (`<h3>`) | Commit fn | Gated? |
|---|---|---|---|---|---|---|
| 1 | `newTicket()` | L2418 | L2428 | New support ticket | `createTicket()` | no |
| 2 | `openNewRideRequestModal()` | L2449 | L2466 | 📞 New ride request | `commitNewRideRequest()` | no |
| 3 | `renderRideRequestTracking()` | L2516 | L2540 | `'+(st.vip?'⭐ VIP — ':'')+st.reqId+' — '+nm2(st.rider)+'` | `closeRideRequestTracking()`, `go()`, `openProfile()` | n/a |
| 4 | `openSupportTicket()` | L2542 | L2550 | `Open support ticket — '+entityName+'` | `createTicketFor()` | no |
| 5 | `openUserSwitch()` | L3088 | L3096 | 👁 Act as team member | `commitUserSwitch()` | no |
| 6 | `openSettlement()` | L3639 | L3665 | `Early termination settlement — '+subId+'` | `commitSettlement()` | no |
| 7 | `openPublishVersionModal()` | L3821 | L3831 | `Publish new version — '+doc.label+'` | `commitPublishVersion()` | no |
| 8 | `openProcessReferralModal()` | L3907 | L3917 | 🎁 Process a referral | `commitProcessReferral()` | no |
| 9 | `openWalletAdjustModal()` | L3962 | L3975 | `'+(kind==='credit'?'Add wallet credit':'Deduct from wallet')+' — '+r.name+'` | `commitWalletAdjust()` | **yes** (rich, L17889) |
| 10 | `openEditTipModal()` | L4192 | L4202 | `💰 Edit tip — '+tripId+'` | `commitEditTip()` | no |
| 11 | `openInvoiceModal()` | L4429 | L4448 | `🧾 Tax invoice — '+inv.invoiceNumber+'` | `toast()` (print stub, L4447) | n/a |
| 12 | `renderNewSubModal()` | L4557 | L4635 | New subscription | `commitNewSub()` | no |
| 13 | `openSubTrackingModal()` | L4787 | L4790 | *(no `<h3>` in opener — written by `renderSubTrackingWidget` L4808:* `'+subId+' — driver response'`*)* | — | n/a |
| 14 | `renderSubDispatchUI()` | L4992 | L5020 | New subscription — dispatch in progress | `cancelSubDispatch()` | no |
| 15 | `renderSubReselectAfterDecline()` | L5043 | L5060 | `New subscription — '+drv.name+' declined` | `cancelSubDispatch()` | no |
| 16 | `renderSubAcceptedTracking()` | L5133 | L5162 | `'+subId+' — '+drv.name+' accepted` | `openProfile()` | n/a |
| 17 | `openRenewModal()` | L5174 | L5209 | two branches: `Upgrade plan — '+rName+'` (L5183) / `Renew subscription — '+rn+'` (L5197); `ctx==='new'` delegates to `renderNewSubModal()` (L5177) | `confirmModal()` — legacy `alert()` stub | no |
| 18 | `openAutoRenewOffReason()` | L5455 | L5470 | `Turn off auto-renew — '+subId+'` | `commitAutoRenewOff()` | no |
| 19 | `freezePlan()` | L5485 | L5501 | `Freeze subscription — '+subId+'` | `doFreeze()` | no (modal is the gate) |
| 20 | `cancelSub()` | L5518 | L5546 | `Cancel & refund — '+subId+'` | `confirmCancelSub()` | no (modal is the gate) |
| 21 | `renderChangeDriverModal()` | L5751 | L5788 | `Change driver — '+subId+'` | `proceedChangeDriver()` or `commitDriverChange()` (via `footBtn`, L5769–5771) | no |
| 22 | `confirmActivatePlan()` | L5947 | L5955 | `Activate '+p.name+' plan` | `doActivatePlan()` | no (modal is the gate) |
| 23 | `confirmDeactivatePlan()` | L5966 | L5976 | `Deactivate '+p.name+' plan` | `doDeactivatePlan()` | no (modal is the gate) |
| 24 | `archivePlan()` | L6156 | L6163 | `Archive '+p.name+' plan` | `doArchivePlan()` | no (modal is the gate) |
| 25 | `openNewCorpModal()` | L6498 | L6515 | New corporate account | `commitNewCorp()` | no |
| 26 | `openCorpInvoiceModal()` | L6669 | L6700 | `🧾 Consolidated invoice — '+c.companyName+'` | `commitSendCorpInvoice()` | no |
| 27 | `openAddEmployeeModal()` | L6724 | L6736 | Add employee | `commitAddEmployee()` | no |
| 28 | `processAllPayouts()` | L7037 | L7047 | Process all payouts | `confirmProcessAll()` | no (modal is the gate) |
| 29 | `confirmApproveDriver()` | L7165 | L7190 | Confirm approval | `approveDriver()` | no (modal is the gate) |
| 30 | `confirmPayDriver()` | L7194 | L7211 | `Confirm payment — '+d.name+'` | `executePayout()` | no (modal is the gate) |
| 31 | `previewInboundMessage()` | L7536 | L7547 | `'+m.subject+'` | `replyToInbound()` | no |
| 32 | `previewEmail()` | L7578 | L7586 | `'+e.subject+'` | `openProfile()` | n/a |
| 33 | `openCityDeactivateConfirm()` | L7794 | L7802 | `⚠ Turn off '+name+'?` | `applyCityToggle()` | no (modal is the gate) |
| 34 | `onMultiSubToggle()` | L8049 | L8061 | Disable multi-subscription? | `commitMultiSubChange()` | no (modal is the gate) |
| 35 | `showEntityLocation()` | L8226 | L8264 | `📍 '+(isDrv?'Driver':'Rider')+' location — '+d.name+'` | dynamic `footBtn` (L8249) | n/a |
| 36 | `ndvRow()` | L8404 | L8453 | `🗺️ Nearby drivers — '+r.name+(sc?' <span class="b b-'+…` | `resolveUnavailable()`, `showEntityLocation()`, `go()` | n/a |
| 37 | `callRiderConfirm()` | L8523 | L8534 | `📞 Call rider — '+rr.name+'` | `logCallOutcome()` | no |
| 38 | `callDriverUrgent()` | L8547 | L8557 | `📞 Contact driver — '+dd.name+'` | `logDriverCall()` | no |
| 39 | `notifyRiderChange()` | L8574 | L8588 | 📲 Notify rider of driver change | `sendRiderChangeNotif()` | no |
| 40 | `openPostponeTrip()` | L8606 | L8632 | 📅 Postpone trip | `confirmPostponeTrip()` | no |
| 41 | `openReadinessTicket()` | L8657 | L8684 | 🎧 Open support ticket | `createReadinessTicket()` | no |
| 42 | `createReadinessTicket()` | L8686 | L8700 | Ticket created | `openTicketDetail()` | n/a |
| 43 | `confirmReleaseEscrow()` | L8935 | L8946 | `Release escrow — '+e.sub+'` | `releaseEscrow()` | no (modal is the gate) |
| 44 | `applyDeduction()` | L8971 | L8984 | Apply deduction | `confirmApplyDeduction()` | no (modal is the gate) |
| 45 | `reviewDriver()` | L8995 | L9001 | `Review driver — '+name+'` | `toast()` (stub) | n/a |
| 46 | `openFlagAccountModal()` | L9006 | L9024 | `🚩 Flag account — '+d.name+'` | `commitFlagAccount()` | no (modal is the gate) |
| 47 | `openSuspendAccountModal()` | L9058 | L9077 | `🚫 Suspend account — '+d.name+'` | `commitSuspendAccount()` | no (modal is the gate) |
| 48 | `onDriverExceptionToggle()` | L9115 | L9125 | `Grant exception — '+d.name+'` | `commitDriverException()` | no (modal is the gate) |
| 49 | `priorityCall()` | L9149 | L9159 | 📞 Priority call | `logPriorityCall()` | no |
| 50 | `exportData()` | L9187 | L9202 | `Export — '+page+'` | `doExport()` | no (deliberate — reads only) |
| 51 | `showActorHistory()` | L9271 | L9279 | `'+(actor?actor.name:actorId)+'’s activity` | — | n/a |
| 52 | `showTeamMemberProfile()` | L10325 | L10336 | Team member | `showActorHistory()` | n/a |
| 53 | `editTeamUser()` | L10468 | L10482 | Edit team member | `commitEditTeamUser()` | no |
| 54 | `openInviteModal()` | L10502 | L10514 | Invite team member | `commitInvite()` | no |
| 55 | `viewUserPermissions()` | L10800 | L10811 | `Permissions — '+u.name+'` | `saveUserPermissions()` | no |
| 56 | `setDocStatus()` | L10852 | L10865 | Reject document | `confirmDocReject()` | no (modal is the gate) |
| 57 | `zoomDoc()` | L10883 | L10891 | `'+label+' — document preview` | — | n/a |
| 58 | `openDocDateEditor()` | L11050 | L11062 | `📅 Document dates — '+nm2(driverId)+'` | `saveDriverDocDates()` | no |
| 59 | `confirmRejectDriver()` | L11081 | L11092 | Confirm rejection | `rejectDriver()` | no (modal is the gate) |
| 60 | `welcomeRider()` | L11159 | L11174 | `Send welcome offer — '+r.name+'` | `confirmWelcomeOffer()` | no |
| 61 | `sendDriverIncentive()` | L11191 | L11206 | `Send incentive — '+d.name+'` | `confirmDriverIncentive()` | no |
| 62 | `openRenewFlow()` | L11277 | L11282 | *(no `<h3>` in opener — written by `renderStep1()` L11321:* `Renew / Upgrade — '+rn+'`*; same title in `renderStep2/3`)* | `renderStep2()` | n/a |
| 63 | `openAddStopModal()` | L11683 | L11695 | `➕ Add a stop — '+tripId+'` | `commitAddStop()` | no |
| 64 | `openSendChatModal()` | L11732 | L11740 | `💬 Send message — '+tripId+'` | `commitSendChatMsg()` | no |
| 65 | `interveneTrip()` | L11765 | L11787 | `Intervene — '+id+'` | — (body buttons) | n/a |
| 66 | `cancelLiveTrip()` | L11804 | L11822 | `Cancel live trip — '+id+'` | `confirmCancelLiveTrip()` | no (modal is the gate) |
| 67 | `resolveCashEntry()` | L12146 | L12169 | `'+(isEscalate?'🚨 Escalate to Trust & Safety':'✓ Approve cash report')+' — '+e.id+'` | `commitCashResolve()` | no (modal is the gate) |
| 68 | `recordCashRepayment()` | L12187 | L12201 | 💵 Record cash-debt repayment | `commitCashRepayment()` | no (modal is the gate) |
| 69 | `resolveUnavailable()` | L13078 | L13093 | 🚨 Find replacement driver | `confirmReassign()` | no |
| 70 | `assignBackup()` | L13186 | L13216 | `Assign backup captain — '+subId+'` | `commitBackup()` (body button L13213) | **yes** — `commitBackup` gated at L17981; `assignBackup` itself deliberately ungated (L20883, L20886) |
| 71 | `openNewPromo()` | L13531 | L13547 | New promo campaign | `commitNewPromo()` | no |
| 72 | `openAwardIncentiveModal()` | L13688 | L13700 | `🏆 Award — '+inv.name+'` | `commitAwardIncentive()` | no |
| 73 | `openSteerOffer()` | L14002 | L14021 | `📣 Steer drivers to '+zoneName+'` | `commitSteerOffer()` | no |
| 74 | `openRetentionAction()` | L14255 | L14270 | `Proactive retention — '+subId+'` | `commitRetentionAction()` (body button L14266) | **yes** (`GATE_SWEEP` L20862) |
| 75 | `openChangeReason()` | L14887 | L14897 | `Change reason code — '+t.id+'` | `commitChangeReason()` | **yes** (`GATE_SPECS` L18316) |
| 76 | `openLowRatingTicket()` | L15302 | L15320 | `Ticket from low rating — '+tripId+'` | `createTicketFor()` | explicitly `null` in `GATE_SPECS` (L18369) — "opens a modal, the modal is the deliberate step" |
| 77 | `openRatingDispute()` | L15522 | L15533 | `Rating dispute — '+tripId+'` | `commitRatingDispute()` | **yes** (`GATE_SPECS` L18334) |
| 78 | `openReportRider()` | L15543 | L15557 | `Captain reports rider — '+tripId+'` | `commitReportRider()` | **yes** (`GATE_SPECS` L18339) |
| 79 | `openDriverAppeal()` | L15568 | L15580 | `Suspension appeal — '+d.name+'` | `commitDriverAppeal()` | **yes** (`GATE_SPECS` L18345) |
| 80 | `openCreditNoteModal()` | L15892 | L15919 | `🧾 Credit note — '+cn.noteNumber+'` | — | n/a |
| 81 | `openErasureRequest()` | L15978 | L15995 | `Account erasure request — '+r.name+'` | `commitErasureRequest()` | **yes** (`GATE_SPECS` L18355) |
| 82 | `openMassEvent()` | L16091 | L16105 | Declare a mass event | `commitMassEvent()` | **yes** (rich, L18045) |
| 83 | `bulkReason()` | L16183 | L16191 | `Change reason code — '+ids.length+' tickets` | `commitBulkReason()` | **yes** (`GATE_SPECS` L18308) |
| 84 | `openLogContact()` | L16215 | L16228 | Log a contact | `commitLogContact()` | **yes** (`GATE_SPECS` L18361) |
| 85 | `openDesyncTicket()` | L16437 | L16452 | `Ticket from state desync — '+tripId+'` | `createTicketFor()` | no |
| 86 | `openEmergencyClaim()` | L16768 | L16788 | `Emergency claim — '+absId+'` | `commitEmergencyClaim()` | **yes** (`GATE_SPECS` L18350) |
| 87 | `commitMenu()` | L16858 | L16905 | `'+(extra\|\|'Actions')+'` | — (action menu) | deliberately ungated (L20890) |
| 88 | `openArrivalEvidence()` | L17749 | L17758 | `🔍 Arrival evidence — '+tripId+'` | `resolveDispute()` ×3 outcomes (L17754–17756) | **yes** (rich, L17857) |
| 89 | `confirmAction()` | L17769 | L17800 | `'+(o.danger?'⚠ ':'')+o.title+'` | `cancelConfirm()`, `runConfirm()` | *is* the gate |
| 90 | `openTripReceipt()` | L18779 | L18819 | `🧾 Trip receipt — '+tripId+'` | `openProfile()` | n/a |
| 91 | `openCaseView()` | L19005 | L19026 | `🔗 '+c.id+' — '+c.label+'` | `closeCase()` | no |
| 92 | `openHandover()` | L19680 | L19706 | 🔁 Hand over your shift | `commitHandover()` | **yes** (L19733) |
| 93 | `screenPop()` | L20204 | L20237 | `'+(channel==='whatsapp'?'💬 Inbound WhatsApp':'📞 Incoming call')+'` | `abandonCall()`, `answerCall()`, `openProfile()` | no |
| 94 | `openWrapUp()` | L20277 | L20295 | `Wrap up — '+Math.floor(secs/60)+'m '+(secs%60)+'s` | `commitWrapUp()` | no |
| 95 | `openHealthBreakdown()` | L20567 | L20591 | `Renewal health — '+subId+'` | `openProfile()`, `openRenewFlow()` | n/a |
| 96 | `renewalMenu()` | L20594 | L20619 | `'+subId+' — '+nm2(sub.rider)+'` | — (action menu) | deliberately ungated (L20890) |
| 97 | `showEffectivePermissions()` | L21048 | L21065 | `What '+eff.user.name+' can do` | — | n/a |
| 98 | `openSuspendSurge()` | L21720 | L21734 | Suspend surge | `commitSuspendSurge()` | no — but the underlying `suspendSurge()` **is** gated (L21544) |
| 99 | `openRateCardChange()` | L21743 | L21760 | Propose a rate card change | `commitRateCardChange()` | no |

**Counts:** 99 openers · 97 with an `<h3>` title in the opener itself · 2 that delegate the head to a renderer (#13, #62) · 18 functions matching `function open*Modal(` · 20 openers whose commit path is gate-registered.

---

## 4. Confirmation-gate registry

### 4.1 Mechanics

| Piece | Line | Behaviour |
|---|---|---|
| `__confirmPending` | L17768 | Module-global holding the pending spec — **only one gate can be pending at a time** |
| `confirmAction(o)` | L17769–17801 | Renders the gate into `#modal-content`: `⚠ ` prefix when `o.danger`, optional `o.ownerWarn` amber block, `o.summary` paragraph, a "What happens when you confirm" consequence list (`--red-lt` when danger, `--bg2` otherwise), an "⚠ This cannot be undone." line when `o.irreversible`, then the `o.options[]` fields, then a footer with Cancel + `o.confirmLabel` |
| Option field types | L17771–17783 | `checkbox`, `select` (rendered via `customSelectHTML`), `number`, and a text fallback. All ids are prefixed `cfa-` |
| `cancelConfirm()` | L17802 | Clears `__confirmPending`, calls `closeModal()` |
| `runConfirm()` | L17803–17813 | Reads every `cfa-*` field into `values`, clears pending, closes, then calls `o.onConfirm(values)` |
| `__guardToken` | L17817 | Re-entrancy token: set to the action name just before the original function is invoked, so the wrapper lets it through once |
| `window.__skipGuards` | L17818 | Global bypass flag. Set `true` around the boot seeds (L21836, L21851) so programmatic seeding does not open 45 gates |
| `guardAction(name,builder)` | L17819–17840 | Monkey-patches `window[name]`. Calls `builder(...args)`; if it returns `null` the original runs unguarded; otherwise `confirmAction(spec)` runs and `spec.onConfirm` re-invokes the original with `window.__confirmValues` set. Marks `window[name].__guarded = true`. Returns `false` if `window[name]` is not a function |
| `gateAll(map)` | L20756–20767 | Bulk installer. Skips names that are not functions or already `__guarded`. Accepts either a builder function or a terse `{t,d,irr,s,c,btn}` object |
| `installActionGates()` | L17853–18089 | 17 rich gates. Sets `window.__gateCount = n` |
| `installUniversalGates()` | L18373–18382 | Installs `GATE_SPECS`; skips `null` entries and already-guarded names; **adds** to `window.__gateCount` |
| `installGateSweep()` | L20898–20902 | Installs `GATE_SWEEP` via `gateAll`; **adds** to `window.__gateCount` |

Install order at load: `installActionGates()` `L18089` → `installUniversalGates()` `L18383` → 9 standalone `guardAction()` calls interleaved through the file → `installGateSweep()` `L20903`.

**Total gated actions: 88.** 90 distinct names are registered across the two bulk registries, `installActionGates()` and the 9 standalone `guardAction()` calls; `openLowRatingTicket` is `null` (never installed) and `assignBackup` is `delete`d (L20886). `autoHandoff` is registered twice (rich gate L17969 and `GATE_SWEEP` L20884) — the sweep entry is `delete`d at L20887, so it installs once. Verified: **all 90 registered names have a matching function definition in the file** — none of them silently no-op.

### 4.2 Rich gates — `installActionGates()` (17)

| Action | L | Title | danger | irreversible | Options |
|---|---|---|---|---|---|
| `resolveDispute` | L17857 | `Resolve dispute '+dspId` | when `outcome!=='reject'` | yes | `notify` checkbox (checked), `note` text |
| `commitWalletAdjust` | L17889 | `Credit`/`Debit rider wallet` | on debit | yes | — |
| `recordRefund` | L17901 | Issue refund | yes | yes | — |
| `recordAbsence` | L17911 | `Record an absence against '+nm2(driverId)` | yes | no | `reason` select (3 choices), `evidence` checkbox (unchecked) |
| `decideEmergency` | L17932 | `Uphold`/`Reject emergency claim '+claimId` | when rejecting | yes | — (carries `ownerWarn`) |
| `decideFairness` | L17950 | `Uphold`/`Overturn — '+c.kind` | no | yes | — (carries `ownerWarn`) |
| `autoHandoff` | L17969 | Hand tomorrow's leg to a backup | no | no | — |
| `commitBackup` | L17981 | Register standing backup | no | no | — |
| `promoteBackup` | L17990 | Promote backup to primary captain | yes | yes | — |
| `executeErasure` | L18002 | Execute PDPL erasure | yes | yes | `ack` checkbox (unchecked) |
| `rejectErasure` | L18014 | Reject erasure request | yes | no | `grounds` text (required copy) |
| `bulkStatus` | L18024 | `Change N tickets to "status"` | when `Resolved` | no | — |
| `forceResync` | L18036 | Force state resync to the rider | no | no | — |
| `commitMassEvent` | L18045 | Declare a mass event | no | no | — |
| `advanceLF` | L18054 | `next[1]` (lost-&-found flow label) | no | no | — |
| `saveCommitPolicy` | L18068 | Save commitment policy | yes | no | — |
| `saveCompPolicy` | L18077 | Save compensation authority | yes | no | — |

Gate copy is written as consequence bullets. Representative examples, verbatim:

- `recordRefund` (L18903–18905): "Money leaves Eyvar and returns to the rider's payment method." · "A sequential credit note is issued against the original tax invoice, reversing the VAT." · "The amount appears in contribution margin as a giveback."
- `executeErasure` (L18007–18009): "Name, phone, email, device and IP are permanently erased." · "Trips, invoices and payments are **retained** — tax law requires them." · "The account cannot be recovered and the person cannot be re-identified."
- `rejectErasure` (L18018): "**The refusal and its legal grounds must be communicated to the data subject** — a silent refusal is itself a compliance failure."

### 4.3 `GATE_SPECS` — builder registry (L18245–18370, 18 keys, 17 installed)

| Key | L | Title | Notes |
|---|---|---|---|
| `confirmPlanLeg` | L18246 | Record confirmation for tomorrow's leg | `source` select from `ACK_SOURCE`, `note` text |
| `acceptEmergency` | L18261 | `Record acceptance — '+(c.name\|\|'captain')` | quotes `fmtSAR(d.replacementPay)` and `fmtSAR(d.riderCompensation)` |
| `declineEmergency` | L18271 | `Record decline — '+(c.name\|\|'captain')` | last-candidate branch escalates copy |
| `respondBackupOffer` | L18281 | `Backup accepted`/`Backup declined — '+subId` | reads `DB.commitPolicy.backupMultiplierPct` |
| `setTicketStatus` | L18293 | `Mark ticket resolved`/`closed` | returns `null` unless status is `Resolved` or `Closed` |
| `bulkAssignMe` | L18300 | `Assign N tickets to yourself` | `null` when nothing selected |
| `commitBulkReason` | L18308 | `Re-code N tickets` | — |
| `commitChangeReason` | L18316 | Change reason code | — |
| `saveReasonCodes` | L18321 | Save reason codes | `danger:true` |
| `saveSlaPolicy` | L18327 | Save SLA tiers | `danger:true` |
| `saveOnCall` | L18333 | Change the on-call roster | — |
| `commitRatingDispute` | L18338 | Open a rating dispute | — |
| `commitReportRider` | L18343 | File a report against the rider | — |
| `commitDriverAppeal` | L18348 | File a suspension appeal | — |
| `commitEmergencyClaim` | L18353 | File an emergency claim | quotes `DB.commitPolicy.appealResponseHours` |
| `commitErasureRequest` | L18358 | Log a PDPL erasure request | quotes `ERASURE_SLA_DAYS` |
| `commitLogContact` | L18364 | Log this contact | — |
| `openLowRatingTicket` | L18369 | — | **`null`** — comment: "opens a modal — the modal is the deliberate step" |

### 4.4 `GATE_SWEEP` — terse registry (L20769–20887, 47 keys, 45 installed)

Header comment (L20738–20754) states the method: every function reachable from an `onclick` was extracted, its body scanned for `DB` writes, and compared against the registry; **52 mutating actions were firing on a single click**, 7 were judged trivial, the other 45 registered here. The comment names `audit_mut.js` as the re-runnable audit script — **that file is not present in this repository** (`UNVERIFIED`, §13).

**Settings that change platform behaviour (15):**

| Key | L | Title | danger |
|---|---|---|---|
| `saveGeneralConfig` | L20771 | Save platform settings | yes |
| `saveOpsLimits` | L20774 | Save operational limits | yes |
| `saveOpsRadiusConfig` | L20777 | Save search radius | yes |
| `saveSecurityConfig` | L20780 | Save security settings | yes |
| `saveNotificationConfig` | L20783 | Save alert thresholds | no |
| `saveCancellationPolicy` | L20786 | Save cancellation policy | yes |
| `saveReferralConfig` | L20789 | Save referral rewards | yes |
| `saveSurgeConfig` | L20792 | Save surge settings | yes |
| `saveSurgeSchedule` | L20795 | Save the surge schedule | yes |
| `saveRideTypes` | L20798 | Save ride types | yes |
| `saveSearchPhases` | L20801 | Save dispatch search phases | yes |
| `savePlan` | L20804 | Save the plan | yes |
| `savePlanVisibility` | L20807 | Change plan visibility | no |
| `saveMaProfile` | L20810 | Save your profile | no |
| `changeMaPassword` | L20812 | Change your password | yes |

**Configuration rows — additions and removals (16):**

| Key | L | Title | danger |
|---|---|---|---|
| `addCity` | L20817 | Add a city | no |
| `addRideType` | L20819 | Add a ride type | no |
| `addSearchPhase` | L20820 | Add a search phase | no |
| `removeSearchPhase` | L20821 | Remove a search phase | yes |
| `addSurgeWindow` | L20823 | Add a surge window | yes |
| `removeSurgeWindow` | L20825 | Remove a surge window | yes |
| `addCustomLimit` | L20827 | Add an operational limit | no |
| `addCustomGateway` | L20828 | Add a payment gateway | yes |
| `setDefaultGateway` | L20830 | Change the default payment gateway | yes |
| `addIncentiveRule` | L20833 | Add an incentive rule | yes |
| `removeIncentiveRule` | L20836 | Remove an incentive rule | yes |
| `addPlanFeature` | L20838 | Add a feature bullet | no |
| `removePlanFeature` | L20839 | Remove a feature bullet | no |
| `addReasonCode` | L20841 | Add a reason code | no |
| `setRotaSlot` | L20843 | Change the on-call rota | no |
| `resetBranding` | L20846 | Reset branding to default | yes |

**Outbound communication (6):**

| Key | L | Title | danger | irreversible |
|---|---|---|---|---|
| `sendBroadcast` | L20850 | Send a broadcast | yes | yes |
| `sendPushNotification` | L20853 | Send a push notification | yes | yes |
| `sendBulkMsg` | L20855 | Send a bulk message | yes | yes |
| `sendReconsentReminder` | L20857 | Send re-consent reminders | yes | no |
| `sendRetentionOfferToRider` | L20859 | Send a retention offer | yes | no |
| `commitRetentionAction` | L20862 | Apply the retention action | yes | no |

**Operational actions with consequences (8):**

| Key | L | Title | danger |
|---|---|---|---|
| `precautionSuspend` | L20866 | Precautionary suspension | yes |
| `closeIncident` | L20869 | Close the incident | yes |
| `cancelRequest` | L20871 | Cancel this request | yes |
| `reopenSubReq` | L20873 | Reopen the request | no |
| `queueRecruitment` | L20875 | Queue for recruitment | no |
| `pausePromo` | L20877 | Pause the promotion | yes |
| `logOutSession` | L20879 | Sign out this session | yes |
| `captureDailySnapshot` | L20881 | Capture a daily snapshot | no |

**Registered then deleted (2):** `assignBackup` (L20883, deleted L20886 — "opens a picker; `commitBackup` is already gated"), `autoHandoff` (L20884, deleted L20887 — "already gated").

### 4.5 Standalone `guardAction()` calls (9)

| Action | L | Title | danger |
|---|---|---|---|
| `saveBranding` | L18460 | Save branding | no |
| `rebuildAllHistory` | L18607 | Rebuild missing trip history | yes |
| `reinstateProbationary` | L19490 | `Reinstate '+nm2(driverId)+' on probation` | no |
| `commitHandover` | L19733 | Complete shift handover | no |
| `fetchFullHistory` | L20483 | Fetch full history from billing | no |
| `saveDataWindow` | L20522 | Change the operational data window | yes |
| `impersonate` | L21090 | `View the panel as '+(eff?eff.user.name:userId)` | no |
| `suspendSurge` | L21544 | `Suspend surge in '+zoneId` | no |
| `approveRateCard` | L21603 | `Approve rate card '+version` | yes |

### 4.6 Direct `confirmAction()` call (not via `guardAction`)

`confirmTakeover(type,id)` — `L18940–18952`. Title `Take over from '+c.ownerName`. Consequences: "You become the owner; they lose it without being asked." · "The takeover is logged with both names…" · "If they are mid-call with the customer, message them first." Confirm label "Take over". `onConfirm` → `claimItem(type,id)`.

`ownershipWarning(type,id)` (`L18955–18960`) supplies the `ownerWarn` amber block to `resolveDispute`, `decideEmergency` and `decideFairness`.

### 4.7 Deliberately NOT gated (documented, L20889–20897)

| Action | Stated reason |
|---|---|
| `claimItem` / `releaseItem` | "picking work up is reversible in one tap; a gate here would be pure friction" |
| `commitMenu` / `renewalMenu` | "open a menu, change nothing" |
| `openNewRiderProfile` | "opens a form; the save is gated" |
| `exportIntegrity` | "reads data out, changes nothing" |
| `assignBackup` | "opens a picker; `commitBackup` is gated" |

Closing rationale, verbatim (L20896): *"A gate on every click becomes noise that gets clicked through, which is worse than no gate at all."*

### 4.8 Destructive and ungated (not in any registry, no bespoke confirm modal)

Verified by cross-referencing every `function (remove|delete|commit|apply|release|reject|approve|cancel|do|confirm|execute|save|send|suspend|freeze|archive)[A-Z]*` definition (143 candidates) against the 90-name gate set, then checking each ungated hit for an `onclick=` call site with no preceding modal:

| Action | Defined | Called from | Consequence |
|---|---|---|---|
| `removeCity(name)` | L7890 | `onclick` L7778 (`.btn sm danger` "Remove") | Deletes an operating city row outright |
| `removeRideType(id)` | L12368 | `onclick` L12353 | Deletes a ride type; the gated `saveRideTypes` warns removal "can orphan trips that reference it" |
| `removeGateway(id)` | L7507 | `onclick` L7472 | Deletes a payment gateway; adding one **is** gated (`addCustomGateway`) |
| `removeCustomLimit(id)` | L7421 | `onclick` L7396 | Deletes an operational limit; adding one **is** gated (`addCustomLimit`) |
| `removeEmployeeFromCorp(corpId,rid)` | L6751 | `onclick` L6585 | Removes an employee from a corporate account |
| `removeAvatar()` | L2963 | `onclick` L2932 | Discards the uploaded profile photo |
| `commitUnflagAccount(entityId,isDrvStr)` | L9042 | `onclick` L4112 | Clears a fraud/risk flag in one click; **flagging** goes through a modal (`openFlagAccountModal` #46) |

Asymmetries worth naming: **add is gated, remove is not** for gateways and limits; **flag is modal-gated, unflag is not**. `removeSearchPhase`, `removeSurgeWindow`, `removeIncentiveRule` and `removePlanFeature` *are* gated — so the remove-side coverage is inconsistent rather than absent by design.

---

## 5. Toast system

### 5.1 Signature and infrastructure

```js
function toast(msg, type, onClick, notify)   // L5269–5315
```

| Element | Line | Detail |
|---|---|---|
| `ensureToastStack()` | L5236–5256 | Lazily creates `<div id="toast-stack">` on `document.body`. Restyles it on **every** call so a mid-session language switch moves the stack. Position: `fixed; bottom:18px; right:18px` (`left:18px` when `body.lang-ar`), `z-index:1400`, `flex-direction:column-reverse`, `gap:8px`, `max-width:360px`, `pointer-events:none` |
| `TOAST_DURATION` | L5257 | `6000` ms |
| `TOAST_MAX` | L5258 | `1` — comment records it was 3; three stacked toasts still covered real buttons |
| Overflow policy | L5279–5285 | While `stack.children.length >= TOAST_MAX`, the oldest child's timer is stopped and the node is `.remove()`d **synchronously** (comment: an async fade would never shrink the count and would loop forever) |

### 5.2 Variants (L5271–5276)

| `type` | bg | fg | border | icon |
|---|---|---|---|---|
| `ok` (default) | `#EAF3DE` | `#1F4006` | `#4E9B1E` | ✅ |
| `warn` | `#FAEEDA` | `#4E2D04` | `#D99A1B` | ⚠️ |
| `err` | `#FCEBEB` | `#7A1F1F` | `#D64545` | ⛔ |
| `info` | `#E6F1FB` | `#0B355E` | `#2E7BC4` | ℹ️ |

An unknown `type` falls back to `ok` (`var c = cfg[type] || cfg.ok`, L5277). **These eight colours are hardcoded hex, not design tokens** — they are near-neighbours of `--green-lt`/`--amber-lt`/`--red-lt`/`--blue-lt` but not identical.

### 5.3 Styling and behaviour

- Node style (L5288): flex row, `border:1px solid <c.border>`, `border-left:4px solid <c.border>`, `border-radius:9px`, `padding:9px 10px 9px 12px`, `font-size:12px; font-weight:600`, `box-shadow:0 8px 26px rgba(0,0,0,.18)`, `max-width:360px`, `pointer-events:auto`, `cursor:pointer` only when `onClick` is a function.
- Entrance (L5293): starts `opacity:0; transform:translateX(28px)`, animated to `opacity:1; translateX(0)` inside `requestAnimationFrame`, transition `.22s ease`.
- Body (L5289–5291): icon span, message span with `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` and a `title=` carrying the tag-stripped, quote-escaped message, plus a `· view →` affordance when clickable, then a `.toast-x` dismiss button.
- Dismiss (L5300–5303): fades out, `setTimeout(remove, 250)`.
- Timer (L5305–5310): `setTimeout(dismiss, TOAST_DURATION)`; `mouseenter` stops it, `mouseleave` restarts it — "pause the clock while it's being read".
- Click (L5312–5314): stops the timer, dismisses, then runs `onClick()`.
- Notification mirror (L5294–5297): unless `notify === false`, calls `pushOpsNotification(map[type], msg, '', onClick)` where the map is `{ok:'success', warn:'warning', err:'error', info:'info'}`. `pushOpsNotification` is defined at `L9661`.

### 5.4 Call sites

352 textual matches for `toast(`; subtract the definition (L5269) and two doc-comment mentions (L5259, L5263) → **349 invocations**.

| Second argument | Count |
|---|---|
| `'ok'` | 146 |
| `'warn'` | 72 |
| `'err'` | 67 |
| `'info'` | 52 |
| conditional expressions (`grant?'ok':'warn'`, `status==='Resolved'?'ok':'info'`, `checked?'ok':'warn'`, `c.active?'ok':'warn'`, `isPattern?'err':'warn'`, `uphold?'info':'ok'`, `uphold?'ok':'info'`) | 8 |
| not resolvable by static parse (calls embedded inside escaped `onclick=` HTML strings: L4447, L9000, L11462, L13674) | 4 |

30 calls pass an `onClick` deep-link. 19 pass `notify=false` — always because the caller pushes its own richer `pushOpsNotification` immediately after (e.g. the SLA-breach pair at L12547–12548).

`typeof toast === 'function'` is guarded at 3 sites, including the boot-failure toast at L21852.

---

## 6. Design tokens (L11–21)

All 26 custom properties, in source order.

| Token | Value | Role | L |
|---|---|---|---|
| `--navy` | `#3D434B` | Wordmark / sidebar logo text colour | L12 |
| `--sb-bg` | `#EEF0F3` | Sidebar rail background (identical value to `--bg`) | L12 |
| `--blue` | `#185FA5` | Primary brand / primary button / active nav / links | L12 |
| `--blue-lt` | `#E6F1FB` | Primary tint: selected rows, `.b-blue`, `.formula-box`, `.preview-strip` | L12 |
| `--blue-dk` | `#0C447C` | Primary text on blue tint (`.b-blue`, `.settings-tab.on`) | L12 |
| `--teal` | `#0B6B6B` | Secondary accent: `.btn.teal`, `.b-teal`, `.kf-t`, discount prices | L13 |
| `--teal-lt` | `#E1F5EE` | Teal tint background | L13 |
| `--amber` | `#E8A33D` | Warning accent: stars, `.kf-a`, `.rf-a`, `.h-amber::before` | L14 |
| `--amber-lt` | `#FAEEDA` | Warning tint: `.b-amber`, `.btn.warn`, `.ai-a`, gate `ownerWarn` block | L14 |
| `--amber-dk` | `#633806` | Warning text on amber tint | L14 |
| `--amber-border` | `#E0B368` | Warning border (`.btn.warn`, `.settings-sensitive`) | L14 |
| `--green` | `#27500A` | Success text: `.up`, `.b-green`, `.btn.success`, `.ex-tot` | L15 |
| `--green-lt` | `#EAF3DE` | Success tint | L15 |
| `--red` | `#A32D2D` | Danger: `.dn`, `.b-red`, `.btn.danger`, `.kf-r`, `.rf-r`, `.req`, alert dots | L16 |
| `--red-lt` | `#FCEBEB` | Danger tint: `.b-red`, `.btn.danger`, `.ai-r`, `.modal-close:hover`, danger gate box | L16 |
| `--red-border` | `#E8A9A9` | Danger border | L16 |
| `--purple` | `#4A2889` | Comfort-tier accent: `.b-purple`, `.b-com`, monospace trip ids | L17 |
| `--purple-lt` | `#EDE6FB` | Purple tint | L17 |
| `--ink` | `#1A1A18` | Default body text; `#trend-tooltip` background | L18 |
| `--muted` | `#6B6B68` | Secondary text: field labels, `.al-sub`, `.po-sub`, consequence bullets | L18 |
| `--ghost` | `#9B9B97` | Tertiary text: table headers, `.kpi-lbl`, `.tb-sub`, placeholders, `.b-grey` | L18 |
| `--bg` | `#EEF0F3` | App background (`body`), `.kpi-bar` track, `.ren-bar` track | L19 |
| `--bg2` | `#F8F8F5` | Surface tint: `.modal-foot`, `.ic-btn`, table `th`, `.sec-head`, `.form-footer` | L19 |
| `--white` | `#fff` | Card / page / modal surface | L19 |
| `--border` | `#E4E2DA` | Standard hairline (`.5px` everywhere) | L20 |
| `--border2` | `#DDDBD3` | Slightly stronger hairline: inputs, buttons, `.plan-option`, scrollbar thumb | L20 |

**Notes.**
- `--sb-bg` and `--bg` are the same colour (`#EEF0F3`) — two names, one value.
- `DB.branding.accent` is hardcoded `'#185FA5'` (L18388), duplicating `--blue` in JS rather than reading the token.
- Roughly 40 colours in the stylesheet are **not** tokenised, including `#DCE0E6` (sidebar borders, 6 uses), `#C7CCD3`/`#AEB4BC` (scrollbar thumbs), `#3B6D11` (`.kf-g`, `.dc-active`, `.h-green::before`), `#1E9E5A` (toggle on), `#105291` (primary hover), `#F2F1EE` (table row rule), `#EEECEA`, `#FAFAF8`, `#C8DCF0`, `#C8C5BC`, `#8ACFCF`, `#9DC86A`, `#7A5C00`, `#FBF3E0`, `#F0F0EE`, `#EEF4FB`, `#2C5F8A`, `#1E7B34`, `#B45309`, `#C62828`, `#E8F5E9`/`#1B5E20`/`#A5D6A7`/`#C8E6C9` (call button), `#FDDCDC`, `#7B828C`, `#585F68`, `#5B6169`, `#DEE2E8`, `#889099`, `rgba(11,43,74,.45)` (modal scrim), `rgba(26,115,232,…)` (live-dot glow — a *different* blue from `--blue`).
- `.h-green`/`.h-amber`/`.h-red` (L132–134) and `.days-ok`/`.days-warn`/`.days-crit` (L140–142) restate the token hex values literally instead of using `var()`.

---

## 7. Class vocabulary (L24–466)

219 distinct class names. (`.w3` and `.org` also appear at L285 but are fragments of the inline `data:image/svg+xml` URI for the select chevron, **not** classes.)

### 7.1 Sidebar (L24–56)

| Class | Role | L |
|---|---|---|
| `.sb` | Sidebar rail; 52 px collapsed, expands to 236 px on hover/pin | L24 |
| `.sb-nav` | Scrollable nav region, thin custom scrollbar | L25 |
| `.pin` | On `.sb`: keep expanded without hover | L30 |
| `.lang-ar` | On `body`: Arabic mode; reverses shell flex direction, widens rail to 268 px | L31 |
| `.sb-logo` | Logo block at rail top, white background | L32 |
| `.sb-logo-img-wrap` | Centring wrapper for the logo image | L33 |
| `.sb-logo-img` | Logo `<img>`, 20 px tall collapsed → 26 px expanded | L34 |
| `.sb-logo-text` | Wordmark, fades in on expand | L36 |
| `.sb-sec` | Nav section group | L38 |
| `.sb-sec-lbl` | Uppercase section label, opacity 0 until expanded | L39 |
| `.sb-item` | Nav row (icon + label + badge) | L41 |
| `.on` | Shared active-state modifier (`.sb-item`, `.page`, `.kpi.click`, `.settings-tab`, `.settings-panel`, `.map-fchip`) | L43 |
| `.sb-ic` | 52 px icon column inside a nav row | L44 |
| `.sb-lbl` | Nav row label, fades in on expand | L46 |
| `.sb-badge` | Right-aligned count pill on a nav row | L48 |
| `.a` | On `.sb-badge`: alert variant, red fill | L50 |
| `.n` | On `.sb-badge`: neutral variant, grey fill | L51 |
| `.sb-ft` | Sidebar footer (current user) | L52 |
| `.sb-ft-txt` | Footer text block, fades in on expand | L53 |
| `.sb-ft-name` | Footer user name | L55 |
| `.sb-ft-role` | Footer user role line | L56 |

### 7.2 Shell and topbar (L58–68)

| Class | Role | L |
|---|---|---|
| `.main` | Flex column right of the sidebar | L58 |
| `.topbar` | 50 px sticky header bar | L59 |
| `.tb-left` | Topbar left cluster | L60 |
| `.tb-title` | Current page title | L61 |
| `.tb-sep` | Breadcrumb separator glyph | L62 |
| `.tb-sub` | Topbar subtitle (hidden ≤768 px) | L63 |
| `.tb-right` | Topbar right cluster | L64 |
| `.ic-btn` | 30×30 square icon button | L65 |
| `.has-dot` | On `.ic-btn`: red unread dot via `::after` | L67 |
| `.avatar` | 30×30 blue initials tile | L68 |

### 7.3 Page frame (L70–75)

| Class | Role | L |
|---|---|---|
| `.page` | Page container, `display:none` until `.on` | L70 |
| `.ph` | Page header row (title left, actions right) | L72 |
| `.ph-l` | Page-header left column (`h1` + `p`) | L73 |
| `.br` | Button row, wraps | L75 |

### 7.4 Buttons (L77–86)

| Class | Role | L |
|---|---|---|
| `.btn` | Base button: 6/13 px padding, 8 px radius, white | L77 |
| `.p` | Primary variant — blue fill, white text | L79 |
| `.sm` | Small variant — 4/10 px, 11 px text | L81 |
| `.danger` | Red tint + red border | L82 |
| `.warn` | Amber tint + amber border | L83 |
| `.teal` | Teal tint + `#8ACFCF` border | L84 |
| `.success` | Green tint + `#9DC86A` border | L85 |

`.btn[disabled]` (L86) sets `opacity:.42; cursor:not-allowed; pointer-events:none`.

### 7.5 Cards (L88–97)

| Class | Role | L |
|---|---|---|
| `.card` | White rounded panel, 11 px radius, hairline border | L88 |
| `.ch` | Card header: title left, controls right, bottom hairline | L89 |
| `.ch-tgl` | Collapse chevron inside a card header | L90 |
| `.clpsd` | On `.card`: hides every child except `.ch`, rotates the chevron −90°, drops the header rule | L92 |
| `.grp-scroll` | Scroll box capped at 318 px | L95 |
| `.ch-right` | Right-aligned control cluster in a card header | L96 |

`.ch h2` (L97) is the card title: 13 px / 500.

### 7.6 Grid (L99–102)

| Class | Role | L |
|---|---|---|
| `.g2` | 2-column grid, 12 px gap | L99 |
| `.g3` | 3-column grid | L100 |
| `.g4` | 4-column grid | L101 |
| `.g5` | 5-column grid (`repeat(5,1fr)`) | L102 |

### 7.7 KPI tiles (L104–116)

| Class | Role | L |
|---|---|---|
| `.kpi` | Metric tile: white, 11 px radius, relative for the bottom bar | L104 |
| `.click` | On `.kpi`: clickable — pointer cursor, blue hover border, blue-tint `.on` state | L105 |
| `.kpi-flash-target` | Runs the 1.4 s `kpiFlash` attention animation (added/removed by JS, L14541–14543) | L109 |
| `.kpi-lbl` | Uppercase 10 px metric label | L110 |
| `.kpi-val` | 23 px metric value (19 px ≤480 px) | L111 |
| `.kpi-dl` | Delta line under the value | L112 |
| `.up` | Positive delta — green | L113 |
| `.dn` | Negative delta — red | L113 |
| `.neu` | Neutral delta — ghost | L113 |
| `.kpi-bar` | 3 px progress track pinned to the tile bottom | L114 |
| `.kf` | Fill inside `.kpi-bar` | L115 |
| `.kf-b` | Fill blue | L116 |
| `.kf-g` | Fill green (`#3B6D11`) | L116 |
| `.kf-r` | Fill red | L116 |
| `.kf-a` | Fill amber | L116 |
| `.kf-t` | Fill teal | L116 |

### 7.8 Badges (L118–129)

| Class | Role | L |
|---|---|---|
| `.b` | Base pill: inline-flex, 10 px / 600, `2px 7px`, fully rounded | L118 |
| `.b-green` | Success pill | L119 |
| `.b-red` | Danger pill | L120 |
| `.b-amber` | Warning pill | L121 |
| `.b-blue` | Info pill | L122 |
| `.b-teal` | Teal pill | L123 |
| `.b-purple` | Purple pill | L124 |
| `.b-grey` | Neutral / disabled pill | L125 |
| `.b-eco` | Economy vehicle tier (`#EEF4FB`/`#2C5F8A`) | L126 |
| `.b-com` | Comfort vehicle tier (purple tint) | L127 |
| `.b-gold` | Gold loyalty tier (`#FBF3E0`/`#7A5C00`) | L128 |
| `.b-silver` | Silver loyalty tier (`#F0F0EE`/`#555`) | L129 |

### 7.9 Health and days (L131–142)

| Class | Role | L |
|---|---|---|
| `.health` | Pill with a leading status dot rendered by `::before` | L131 |
| `.h-green` | Healthy — green fill, `#3B6D11` dot | L132 |
| `.h-amber` | At-risk — amber fill and dot | L133 |
| `.h-red` | Critical — red fill and dot | L134 |
| `.days-ok` | Days-remaining pill, comfortable | L140 |
| `.days-warn` | Days-remaining pill, approaching | L141 |
| `.days-crit` | Days-remaining pill, critical | L142 |

### 7.10 Stars, tables (L144–156)

| Class | Role | L |
|---|---|---|
| `.stars` | Amber star run, tightened letter-spacing | L144 |
| `.tbl-scroll` | Horizontal scroll wrapper for a wide table | L147 |
| `.dt` | Data table: full width, collapsed borders, 12 px, `white-space:nowrap` | L148 |
| `.ra` | Row-action cluster — `opacity:0` until the row is hovered | L153 |
| `.td-name` | Primary cell text (500 weight) | L155 |
| `.td-sub` | Secondary cell text under the name | L156 |

`table.dt th` (L149) is a `--bg2` uppercase 10 px header; `table.dt tr:hover td` (L152) tints `#FAFAF8`.

### 7.11 Alert rows (L158–169)

| Class | Role | L |
|---|---|---|
| `.al-row` | Clickable alert row with hairline separator | L158 |
| `.al-icon` | 30×30 rounded icon tile | L161 |
| `.ai-r` | Alert icon, red | L163 |
| `.ai-a` | Alert icon, amber | L164 |
| `.ai-b` | Alert icon, blue | L165 |
| `.al-body` | Flexible text column | L166 |
| `.al-title` | Alert headline | L167 |
| `.al-sub` | Alert detail line | L168 |
| `.al-time` | Right-aligned timestamp | L169 |

### 7.12 Driver circle / renewal bar / toggle (L171–189)

| Class | Role | L |
|---|---|---|
| `.dc-slot` | Driver-circle schedule slot row | L171 |
| `.dc-dot` | 7 px status dot | L173 |
| `.dc-done` | Slot completed — ghost | L174 |
| `.dc-active` | Slot in progress — green | L174 |
| `.dc-late` | Slot late — red | L174 |
| `.dc-pending` | Slot upcoming — border grey | L174 |
| `.dc-time` | Slot time, blue, 44 px min width | L175 |
| `.dc-name` | Slot name, flexes | L176 |
| `.dc-km` | Slot distance, right-aligned | L177 |
| `.ren-card` | Renewal mini-card | L179 |
| `.ren-bar` | 5 px renewal progress track | L180 |
| `.ren-fill` | Renewal progress fill | L181 |
| `.rf-g` | Renewal fill, on-track (blue) | L182 |
| `.rf-a` | Renewal fill, warning (amber) | L182 |
| `.rf-r` | Renewal fill, critical (red) | L182 |
| `.tog` | 32×18 toggle switch wrapper | L184 |
| `.tog-sl` | Toggle track + knob (`::before`); green `#1E9E5A` when checked | L186 |

### 7.13 Modal (L191–207)

| Class | Role | L |
|---|---|---|
| `.open` | On `#modal-overlay`: `display:flex` (also used on `.csel` and `.mob-sb-backdrop`) | L192 |
| `.modal-head` | Modal title bar | L195 |
| `.modal-close` | 28×28 ✕ button, red on hover | L197 |
| `.plan-option` | Selectable plan/option card with radio | L199 |
| `.selected` | On `.plan-option`: blue border + blue tint | L201 |
| `.po-body` | Option card text column | L203 |
| `.po-title` | Option card title | L204 |
| `.po-sub` | Option card subtitle | L205 |
| `.po-price` | Option card price, blue, nowrap | L206 |
| `.modal-foot` | Right-aligned footer strip on `--bg2` | L207 |

### 7.14 Nearby drivers and map chrome (L209–224)

| Class | Role | L |
|---|---|---|
| `.ndv-row` | Nearby-driver candidate row | L209 |
| `.ndv-legend` | Absolutely-positioned map legend chip | L211 |
| `.dot` | 8 px inline dot inside `.ndv-legend` | L212 |
| `.map-ctrl` | Map control strip (selects/inputs) | L215 |
| `.map-stat` | Map statistics bar (**redefined** at L365 — see §12) | L217 |
| `.ms-item` | Stat item (**redefined** at L366) | L218 |
| `.ms-lbl` | Stat label (**redefined** at L367) | L219 |
| `.ms-val` | Stat value (**redefined** at L368) | L220 |
| `.replay-btn` | Blue replay play button | L221 |
| `.replay-progress` | Replay scrub track | L223 |
| `.rp-fill` | Replay progress fill, width driven by JS | L224 |

### 7.15 Forms and settings (L226–279)

| Class | Role | L |
|---|---|---|
| `.sec-head` | Form section header band on `--bg2` | L226 |
| `.sec-badge` | Uppercase blue section eyebrow | L227 |
| `.sec-title` | Section title | L228 |
| `.sec-sub` | Section description (inline `code` styling at L230) | L229 |
| `.sec-body` | Section content padding box | L231 |
| `.field` | Label-over-input column, 4 px gap | L232 |
| `.settings-tab-group-lbl` | Uppercase group label in the settings rail | L233 |
| `.settings-tab` | Settings rail tab button | L235 |
| `.settings-tab-ic` | 24×24 emoji tile inside a tab | L238 |
| `.settings-panel` | Settings content panel, hidden until `.on` | L240 |
| `.settings-soon` | "Coming soon" grey pill | L242 |
| `.settings-panel-head` | Panel header (icon + title + description) | L243 |
| `.settings-panel-ic` | 34×34 blue-tint panel icon | L244 |
| `.settings-panel-title` | Panel title, 14 px / 700 | L245 |
| `.settings-panel-desc` | Panel description | L246 |
| `.settings-meta` | Panel footer meta strip | L247 |
| `.settings-dirty-dot` | 7 px amber unsaved-changes dot (`display:none` by default) | L248 |
| `.settings-sensitive` | Amber-outlined sensitive field (`!important` overrides) | L249 |
| `.req` | Red required asterisk | L251 |
| `.hint` | 10 px `#aaa` helper text | L254 |
| `.computed-box` | Read-only computed-value box, blue text on `--bg2` | L255 |
| `.fdiv` | Hairline form divider (`<hr>`) | L256 |
| `.feat-row` | Editable feature-bullet row | L257 |
| `.feat-rm` | Remove button on a feature row, red on hover | L260 |
| `.ptable` | Pricing table, `table-layout:fixed` | L262 |
| `.ci` | On `.ptable th`: computed-input column, blue header | L264 |
| `.ex-cell` | Worked-example cell, 10.5 px ghost | L269 |
| `.ex-tot` | Example total — green | L270 |
| `.ex-drv` | Example driver share — blue | L270 |
| `.formula-box` | Blue-tint formula explainer block | L271 |
| `.formula-note` | Footnote inside the formula box, top-ruled | L274 |
| `.preview-strip` | Blue-tint live-preview strip under a form | L275 |
| `.lbl` | Label inside `.preview-strip` | L276 |
| `.val` | Value inside `.preview-strip` | L277 |
| `.form-topbar` | Form header bar | L278 |
| `.form-footer` | Right-aligned form action bar on `--bg2` | L279 |

### 7.16 Custom select `csel` (L300–323)

| Class | Role | L |
|---|---|---|
| `.csel` | Custom-dropdown wrapper (`position:relative`) | L300 |
| `.csel-btn` | Trigger button, mirrors `.field input` geometry (33 px) | L301 |
| `.csel-val` | Selected-value text, ellipsised | L304 |
| `.placeholder` | On `.csel-val`: ghost colour when nothing chosen | L305 |
| `.csel-arrow` | Chevron, rotates 180° when open | L306 |
| `.csel-menu` | `position:fixed` popup (top/left set from `getBoundingClientRect` in JS — comment L292–299 explains that `absolute` would be clipped by `#modal-box`'s own scroll box); `z-index:1300`, max 230 px tall | L308 |
| `.csel-search` | In-menu filter input | L310 |
| `.csel-opt` | Menu option row | L318 |
| `.sel` | On `.csel-opt`: currently selected | L320 |
| `.csel-opt-hint` | Secondary hint line inside an option | L321 |
| `.sm` (`.csel.sm`) | Compact 29 px variant | L323 |

### 7.17 Trends and tooltip (L311–325)

| Class | Role | L |
|---|---|---|
| `.trend-bar` | Clickable bar in the exec trend chart, dims on hover | L311 |
| `.exec-trend-scroll` | Horizontal trend scroller with the scrollbar hidden | L312 |
| `.trend-nav-btn` | 24 px round prev/next button | L314 |
| `.tt-date` | Date sub-line inside `#trend-tooltip` | L317 |
| `.aud-diff` | Audit-log before/after diff line | L324 |
| *(`.aud-diff s`)* | Struck-through old value in red, L325 | L325 |

### 7.18 Live map page (L327–368)

| Class | Role | L |
|---|---|---|
| `.ping-dot` | 7 px GPS-freshness dot | L327 |
| `.ping-ok` | Ping healthy (`#1E7B34`) | L328 |
| `.ping-warn` | Ping stale — pulses at 1.4 s | L329 |
| `.ping-dead` | Ping lost — pulses at 0.7 s | L330 |
| `.ping-label` | 9 px label beside a ping dot | L332 |
| `.sla-bar` | 3 px SLA progress track | L333 |
| `.sla-fill` | SLA progress fill | L334 |
| `.tab-row` | Tab strip container with bottom hairline | L336 |
| `.map-tab` | Live/History tab button | L337 |
| `.active` | On `.map-tab`: blue text + blue underline | L339 |
| `.tab-dot` | 8 px dot inside a tab; animates `live-dot` when active | L340 |
| `.map-filter-row` | Filter-chip row on `--bg2` | L344 |
| `.map-fchip` | Filter chip; blue fill when `.on` | L345 |
| `.live-card` | Live-trip card row | L351 |
| `.live-card-id` | Trip id, blue, clickable | L353 |
| `.live-card-route` | Route line under the id | L354 |
| `.live-card-actions` | Wrapping action-button row (buttons shrunk to 10.5 px at L356) | L355 |
| `.btn-track` | Track button — grey | L357 |
| `.btn-call` | Call button — green (`#E8F5E9`/`#1B5E20`) | L359 |
| `.btn-intervene` | Intervene button — red, 700 weight | L361 |
| `.live-sec-hdr` | Uppercase section header inside the live list | L363 |

### 7.19 RTL and responsive helpers (L382–443)

| Class | Role | L |
|---|---|---|
| `.settings-shell` | Settings two-column shell; `row-reverse` under `body.lang-ar` | L386 |
| `.settings-nav-col` | Settings tab rail; RTL text-align + custom scrollbar | L401 |
| `.mob-only` | Hidden by default; `display:flex!important` at ≤768 px | L414 |
| `.mob-sb-backdrop` | Off-canvas sidebar scrim; `display:none` until `.open` at ≤768 px | L415 |
| `.notif-panel` | Notification dropdown; width overridden to 360 px ≤1024 px and 92 vw ≤768 px (base geometry is inline at L576, not in the stylesheet) | L421 |
| `.mob-open` | On `.sb`: slides the drawer in (`translateX(0)`) with a shadow | L432 |
| `.tb-search` | Topbar search box; narrowed to 150 px ≤768 px, hidden ≤480 px (base geometry is inline at L568–571) | L443 |

### 7.20 Keyframes and element-level rules (not classes)

| Name | L | Role |
|---|---|---|
| `@keyframes kpiFlash` | L108 | KPI attention flash, 1.4 s |
| `@keyframes reqPulse` | L145 | Opacity pulse used by the sub-tracking spinner (L4811) |
| `@keyframes mIn` | L194 | Modal entrance |
| `@keyframes ping-pulse` | L331 | GPS ping pulse |
| `@keyframes live-dot` | L342 | Expanding glow on the active live tab |
| `select { … }` | L283–291 | Site-wide native-select restyle: `appearance:none` + inline SVG chevron data-URI |
| `::-webkit-scrollbar` | L280–281 | 4 px global scrollbar |
| `#modal-overlay` / `#modal-box` | L191–193 | See §2 |
| `#map-canvas` | L214 | 2-D canvas map surface |
| `#map-leaflet` | L349 | 400 px Leaflet container — **the element never exists** (see §8) |
| `#trend-tooltip` | L316 | Fixed dark tooltip, `z-index:2000` |

---

## 8. External dependencies

| Asset | Line | Loaded by | Actually used? | Risk |
|---|---|---|---|---|
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` | L469 | `<link rel="stylesheet">` in `<head>` | **Partially.** Needed only by the city-picker preview map (`showCityMapPreview`, L7865–7875). Not needed by the live-ops map, which uses `<canvas>` | Blocking stylesheet from a third-party CDN. No SRI hash, no `crossorigin`. Offline → unstyled/broken tile pane. Any CSP without `style-src unpkg.com` blocks it |
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` | L470 | `<script src>` in `<head>` (render-blocking, not `defer`/`async`) | **Partially** — see below | Same CDN/SRI/CSP exposure. Blocks first paint. The code guards with `typeof L === 'undefined'` at L7871, L11572, L11580, so a failed load degrades rather than throwing |
| `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | L7873 | `L.tileLayer` in `showCityMapPreview` | **Yes** — the only live Leaflet consumer | Runtime network dependency per tile; OSM tile-usage policy applies; `maxZoom:12` |
| `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | L11574 | `L.tileLayer` in `initLeafletMap` | **No** — unreachable (see below) | Dead |
| Fonts | — | none | n/a | **No web fonts.** `body` uses `system-ui, -apple-system, sans-serif` (L22). No `@font-face`, no `fonts.googleapis.com`. Zero font risk |
| Favicon | L7 | `<link rel="icon" id="site-favicon" href="">` | Set at runtime by `applySiteBranding()` (L7954), called from init L14595 | Empty `href` on load; if branding sets a remote URL that becomes a third dependency |
| Audio | L—, `playAlertBeep` | Web Audio `OscillatorNode`, generated in-page | Yes | None — no audio file is fetched |
| SVG chevron | L285 | inline `data:image/svg+xml` URI in the `select` rule | Yes | None — inlined |

### 8.1 `#map-leaflet` — verified 0 occurrences in markup

`grep -c "map-leaflet"` returns **4**, all outside the DOM:

| L | Context |
|---|---|
| L349 | CSS rule `#map-leaflet{width:100%;height:400px;display:block;z-index:1}` |
| L11514 | A code comment explaining the removal |
| L11571 | `var el = document.getElementById('map-leaflet');` inside `initLeafletMap()` |
| L11573 | `_lmap = L.map('map-leaflet', …)` |

**There is no `id="map-leaflet"` element anywhere in the HTML body.** The source itself documents this at L11514–11520:

> *"Was: hide the canvas and switch to a Leaflet map bound to `#map-leaflet` — an element that does not exist anywhere in this page's markup, so every switch to Live silently failed to render anything, leaving a blank void where the map used to be. The canvas renderer already works with no external dependency (no CDN, no network, nothing to fail) — keep it visible and just redraw with it instead."*

**Implications:**

1. `initLeafletMap()` (L11569–11578) returns at L11572 (`if(!el||typeof L==='undefined')return;`) — `_lmap` stays `null` forever.
2. `updateLiveMarkers()` (L11579) returns immediately at L11580 (`if(!_lmap…)return;`) — the tick engine calls it every second at L12598 to no effect.
3. `renderLiveMap()` (L11632–11635) is inert.
4. Consequently dead: `TRIP_COORDS` (7 route arrays, L11527–11544), `TRIP_COLORS` (L11546–11547), `carIcon()` (L11549–11556), `mapBearing()`, `lerpPath()`, `_carMarkers`, `_routeLines`, `_selectedLine`, and the `flyToBounds` selection code at L11625–11631 — roughly 120 lines.
5. The **live map the user actually sees** is the `<canvas id="map-canvas">` renderer (CSS L214, click wiring `initMapClicks()` L12626–12647, geometry from `MAP_ROUTES` L11933–11941). It has zero network dependencies.
6. Therefore Leaflet's *only* live consumer is the 200×110 px city-picker preview in Settings (`#city-map-preview`, markup L1639). A ~150 KB render-blocking CSS+JS pair from a third-party CDN is loaded on every page view to serve one optional thumbnail.

---

## 9. Init & lifecycle

### 9.1 Storage — none

`grep -n "localStorage\|sessionStorage"` returns **zero matches** across all 21,857 lines.

There is no `localStorage`, no `sessionStorage`, no IndexedDB, no cookies, no `fetch`/`XHR`, and no service worker. **All state lives in the in-memory `DB` object and is destroyed on refresh.** Every "save" gate in §4 warns about permanence ("Recorded in the activity log under your name", "Applies to every operator immediately") for changes that do not survive a page reload.

### 9.2 Load-time sequence

1. `<head>` parses; **Leaflet CSS (L469) and Leaflet JS (L470) block** rendering.
2. Body markup parses (L472–2165) — includes the modal overlay, sidebar, backdrop, topbar and every page shell.
3. `<script>` at L2166 executes top to bottom: all `var` data literals and `function` declarations, plus these top-level statements:

| Statement | L | Effect |
|---|---|---|
| `document.addEventListener('click', …)` | L2224 | Closes `#notif-panel` on any outside click |
| `document.addEventListener('click', …)` | L5414 | Closes any open `.csel` on outside click |
| `document.addEventListener('scroll', …, true)` | L5420 | Closes any open `.csel` on any scroll (capture phase) — comment L5417–5419 explains a `position:fixed` menu would otherwise drift |
| `window.addEventListener('resize', …)` | L7311 | Re-fits `.settings-nav-col` height when the settings page is on |
| `window.addEventListener('mouseup'/'mousemove'/'touchend'/'touchmove', …)` | L6895–6898 | Drag-to-scroll for the exec trend chart (installed inside `initExecTrendDrag`) |
| `document.addEventListener('change', …)` | L14549 | Auto-sizes any `<select>` whose value changed |
| `window.addEventListener('resize', debounce(…,200))` | L14550 | Re-runs `autoSizeAllSelects(document)` |
| `new MutationObserver(…).observe(document.body,{childList:true,subtree:true})` | L14551–14553 | **Fires on every DOM mutation anywhere**; calls `scheduleAutoSizeSelects()`, which debounces to one 60 ms `setTimeout` (L14546–14548) |
| `scheduleAutoSizeSelects()` | L14554 | First select-sizing pass |
| `setTimeout(…, 100)` | L14556–14600 | **The one-shot render pass** — see §9.3 |
| `installActionGates()` | L18089 | Installs the 17 rich gates |
| `seedArrivalTraces()` | L18102 | Seeds arrival-evidence demo data |
| `installUniversalGates()` | L18383 | Installs `GATE_SPECS` |
| 9 standalone `guardAction(…)` calls | L18460, L18607, L19490, L19733, L20483, L20522, L21090, L21544, L21603 | Install the remaining rich gates as the file is parsed |
| `installGateSweep()` | L20903 | Installs the 45 `GATE_SWEEP` gates |
| `(function bootModules(){…})()` | L21807–21855 | **The boot IIFE** — see §9.4 |

**There is no `DOMContentLoaded` handler and no `window.onload` handler.** Verified: `grep -n "DOMContentLoaded\|window.onload"` returns zero matches. The script relies on being the last element in `<body>`, plus the 100 ms `setTimeout` for anything that needs a settled layout.

### 9.3 The 100 ms one-shot pass (L14556–14600)

A single `setTimeout(fn, 100)` running 45 statements in order:

`seedMoreRequests()` · `renderMapFilterSelects()` · conditional `drawMap()` (only if `#p-live` is `.on`) · `updateMapStats()` · `renderMapTripsTable()` · `selectTrip('TRP-7741')` · `renderPendingDrivers()` · `renderNewRiders()` · `updateBellBadge()` · `renderTkFilterSelect()` · `renderTickets()` · `renderPlansFormSelects()` · `renderPlansTable()` · `renderQuickRidesTable()` · `renderTripsTable()` · `renderRenewalPipeline()` · `renderSurgeSchedule()` · `renderCorporateList()` · `renderFraudPage()` · `renderExecTrendChart()` · `renderLiveOps()` · `renderPayoutsTable()` · `renderEscrow()` · `renderDeductions()` · `renderDriversTable()` · `renderRidersTable()` · `renderTeamTable()` · `renderAuditLog()` · `renderRefundsTable()` · `renderDashboard()` · `renderInterventionsPage()` · `renderRequestsPage()` · `renderRequestsSubAll('')` · `renderRequestsInstantAll('')` · `renderSupportTeam()` · `refreshNavCounts()` · `renderReadiness()` · `renderSubscriptionsTable()` · `applySiteBranding()` · `applyLanguage(DB.opsConfig?.general?.language || 'en')` · `initCardToggles()` · **`startTickEngine()`** · `initMapClicks()` · `updateBackBtn()`.

Every page in the app is rendered eagerly here, including the 30-odd pages that are `display:none`. There is no `try`/`catch` — a throw in any one of the 45 calls silently aborts the rest, including `startTickEngine()`.

### 9.4 The boot IIFE (L21807–21855)

Header comment (L21780–21806) states three invariants: seeds run after all data exists; each step is isolated; **this block must remain the last thing in the script** (a module appended after it would have its `var` initialisers unassigned when the seeds run, since function declarations hoist and initialisers do not).

16 steps, each with a `needs` list of `DB` keys checked before it runs:

| # | Name | Fn | Needs |
|---|---|---|---|
| 1 | reason codes + SLA | `slaBoot` | `reasonCodes`, `slaPolicy`, `contacts` |
| 2 | per-trip ratings | `backfillTripRatings` | `trips` |
| 3 | fairness cases | `seedFairness` | `fairnessCases` |
| 4 | credit notes | `gapsBoot2` | `creditNotes`, `erasureRequests`, `massEvents` |
| 5 | ride state logs | `desyncBoot` | `rideStateLogs` |
| 6 | plan commitment | `commitBoot` | `commitPolicy`, `planConfirmations`, `absenceEvents` |
| 7 | emergency dispatch | `dispatchBoot` | `emergencyDispatches`, `backupRegistry` |
| 8 | backup coverage | `coverageBoot` | `backupRegistry` |
| 9 | history reconstruction | `historyBoot` | `trips`, `payments`, `riders` |
| 10 | work inbox | `inboxBoot` | `ownership`, `cases` |
| 11 | on-call rota | `rotaBoot` | `onCallSchedule`, `handovers` |
| 12 | ledger | `ledgerBoot` | `ledger`, `idempotency` |
| 13 | audit fixes | `auditFixBoot` | `reasonCodes` |
| 14 | panel fixes | `fixesBoot` | `branding`, `drivers` |
| 15 | ux restructure | `presenceBoot` | `presence`, `teamUsers` |
| 16 | pricing engine | `pricingBoot` | `rateCard`, `trips` |

Guard handling (L21834–21851): `window.__skipGuards` is saved, set `true` for the whole loop, and restored afterwards — so the 88 confirmation gates do not intercept seeding. Missing keys and thrown errors are collected into `failed[]` and `console.error`d; `window.__bootReport = {ok, total, failed}` is published; if anything failed a `setTimeout(…, 1600)` fires an `err` toast: `'⚠ N of 16 modules failed to initialise — see console'`.

`auditFixBoot` (step 13) also installs the explain layer: `explainSweep()` → `installExplainLayer()` (L20668–20685) adds a third document-level `click` listener that intercepts clicks on elements carrying a `data-explain` or `title` longer than 45 characters, and wraps `window.go` so `markExplainables(document)` re-runs 30 ms after every navigation (L20726–20733).

### 9.5 Continuous timers

| Timer | L | Period | Started by | Stopped by | Mutates |
|---|---|---|---|---|---|
| **`tickEngine`** | L11968 | **1000 ms, never cleared** | `startTickEngine()` (L11966–11969, guarded by `__tickStarted`), called from init L14597 | nothing | See §9.6 |
| `_rrTrackInterval` | L2509 | 1000 ms | `openRideRequestTracking` flow | `closeRideRequestTracking()` L2512 | Re-renders the ride-request tracking modal |
| `_subTrackInterval` | L4791 | 1000 ms | `openSubTrackingModal()` | self-clear L4794, ✕ L4808, footer L4824 | Re-renders the sub-tracking widget |
| `_nsDispatch.interval` | L4962 | 250 ms | new-subscription dispatch flow | self-clear L4967, `cancelSubDispatch` L5023 | Re-renders the dispatch progress UI, resolves the simulated driver response |
| `_subTrackInterval` | L5165 | 1000 ms | `renderSubAcceptedTracking()` when `outcome==='pending'` | self-clear L5168 | Re-renders the accepted-tracking modal |

`setTimeout` is used ~40 times for one-shot deferrals (animation restarts, `URL.revokeObjectURL` cleanup at L7603/L9773, `initCardToggles` after navigation at L8778, the 300 ms Leaflet `invalidateSize` at L11577, the 1600 ms boot-failure toast at L21852). None of them repeat.

### 9.6 What `tickEngine()` does every second (L12508–12625)

`__tickCount` increments once per tick (L12509). Work is spread across modulo buckets:

| Cadence | Line | Action |
|---|---|---|
| every tick | L12517 | `callTick()` → re-renders the active-call bar if `_activeCall` |
| every tick | L12518–12525 | For each subscription with `pendingDriverCommit`, after `commitAutoResolveAfter` (default 10) ticks: `confirmSubDriverCommit(subId, Math.random()<0.8, true)` |
| every tick | L12526–12573 | For each `DB.rideRequests` entry: `searching` → increment `waiting`, send an auto-offer after `AUTO_OFFER_DELAY_SEC` (VIP after 1 s), and at 180 s flip to `no_drivers` + `playAlertBeep()` (L12546) + `err` toast (L12547) + `pushOpsNotification` (L12548) + `logAction('sla_breach',…)` (L12549). `offered` → decrement `offerSecondsLeft`, roll `0.30 + (rating−3)×0.08` per second for acceptance, else time out. `no_drivers` → keep retrying an offer |
| every tick | L12574 | `processSubReqSearchWindow()` |
| every tick | L12576–12579 | Writes `r.waiting` into every `.js-wait` element |
| every tick | L12580–12594 | For each `DB.liveTrips`: advance `t.prog` by `TICK_ACCEL/totalSec` (×30 accelerated), `completeTrip()` at 1.0, increment `t.lastPing`, fire a `warn` toast at 120 and an `err` toast + notification at 300, and `simulateLiveChatMessage(t)` with 2 % probability |
| every tick | L12595–12600 | Redraws the live map if `#p-live` is `.on` and no replay is running |
| `%5` | L12575 | `tickSteerOffers()` |
| `%5` | L12601–12610 | Decrement live-trip ETAs, update `.js-eta` nodes, `renderSubRequests()`, and `renderRequestsPage()` if visible |
| `%15` | L12512 | `slaSweep()` |
| `%20` | L12513 | `refreshInbox()` |
| `%30` | L12515 | `markPresence(CURRENT_USER_ID, CURRENT_PAGE)` |
| `%45` | L12516 | `liveSubtitles()` |
| `%60` | L12514 | `updateOnCallChip()` |
| `%60` | L12611–12624 | Decrement `minutesUntil` on upcoming sub trips; `renderSubRequests()`; `renderDashboard()`; `complianceScan()` (+ re-render compliance/predictive pages if visible); `recalcDriverTiers()`; `recalcRiderTiers()` |

`TICK_ACCEL = 30` (L11952) — the demo clock advances ~30× real time. `__tickStarted` (L11953) makes `startTickEngine()` idempotent. `__tickCount` (L11954) is the modulo source.

---

## 10. Responsive & mobile behaviour

### 10.1 Breakpoints

Three, all in the "RESPONSIVE LAYER" block (L408–467). The header comment (L409–413) describes the intent: tablet tightens grids, mobile collapses the sidebar into a drawer and stacks side-by-side layouts.

**`@media (max-width:1024px)` — L417–422**

| Rule | Effect |
|---|---|
| `.g4{grid-template-columns:1fr 1fr}` | 4-up → 2-up |
| `.g3{grid-template-columns:1fr 1fr}` | 3-up → 2-up |
| `#modal-box{width:92vw;max-width:520px}` | Modal becomes viewport-relative |
| `.notif-panel{width:360px!important}` | Narrows the notification dropdown |

`.g5` is **not** adjusted at any breakpoint — a 5-column grid stays 5 columns down to 769 px, then collapses only because `.g4,.g3,.g2` are re-declared at 768 px (`.g5` is still excluded there too).

**`@media (max-width:768px)` — L424–460**

| Rule | Effect |
|---|---|
| `.mob-only{display:flex!important}` | Reveals the hamburger button, whose inline `style="display:none"` (L554) is beaten by `!important` |
| `.sb{position:fixed;left:0;top:0;width:236px!important;height:100vh;transform:translateX(-100%);transition:transform .18s ease;z-index:600}` | Rail becomes an off-canvas drawer (comment L426–428: hover does not exist on touch) |
| `.sb.mob-open{transform:translateX(0);box-shadow:8px 0 28px rgba(0,0,0,.18)}` | Drawer slides in |
| `.sb .sb-lbl,.sb .sb-logo-text{opacity:1!important}` | Labels always visible once open |
| `.mob-sb-backdrop.open{display:block;position:fixed;inset:0;background:rgba(11,43,74,.4);z-index:590}` | Dim scrim under the drawer |
| `.sb[dir="rtl"]{left:auto;right:0;transform:translateX(100%);width:268px!important}` + `.sb[dir="rtl"].mob-open` | Drawer mirrors to the right in Arabic |
| `.main{width:100%}` | Main column takes the full width |
| `.page{padding:12px}` | Tighter page padding (from 18 px) |
| `.ph{flex-wrap:wrap;gap:8px}` / `.ph-l h1{font-size:15px}` | Page header wraps and shrinks |
| `.g4,.g3,.g2{grid-template-columns:1fr}` | All grids single-column |
| `.tb-search{width:150px!important}` | Topbar search narrows |
| `.tb-sub{display:none}` | Comment: "date/time subtitle — first thing to drop for space" |
| `#modal-box{width:94vw;max-width:94vw;border-radius:12px}` | Near-full-width modal |
| `.notif-panel{width:92vw!important;right:-8px!important}` | Near-full-width dropdown |
| `table.dt th,table.dt td{padding:7px 8px;font-size:11px}` | Denser tables |
| `.settings-shell{flex-direction:column;gap:10px}` | Settings stack vertically |
| `.settings-nav-col{width:100%!important;position:static!important;flex-direction:row!important;max-height:none!important;overflow-y:visible!important;overflow-x:auto;-webkit-overflow-scrolling:touch}` | Tab rail becomes a horizontal scroll strip |
| `.settings-nav-col .settings-tab-group-lbl{display:none}` | Comment: "group labels don't fit a horizontal strip" |
| `.settings-tab{flex-shrink:0;width:auto!important;white-space:nowrap}` | Tabs sized to content |
| `div[id^="mailsub-"],div[id^="pricingsub-"]{flex-shrink:0}` | Same treatment for email/pricing sub-tabs |

**`@media (max-width:480px)` — L462–467**

| Rule | Effect |
|---|---|
| `.kpi-val{font-size:19px}` | KPI numbers shrink from 23 px |
| `.ph-l p{font-size:10px}` | Page subtitle shrinks |
| `.tb-search{display:none!important}` | Search removed entirely |
| `table.dt th,table.dt td{padding:6px 7px;font-size:10.5px}` | Densest table setting |

### 10.2 Mobile sidebar mechanics

| Piece | L | Detail |
|---|---|---|
| Hamburger button | L554–556 | `<button id="mob-menu-btn" class="ic-btn mob-only" onclick="toggleMobileSidebar()" title="Menu" style="display:none">` with a 3-line SVG. Revealed only by `.mob-only{display:flex!important}` at ≤768 px |
| Backdrop | L548 | `<div id="mob-sb-backdrop" class="mob-sb-backdrop" onclick="toggleMobileSidebar()">` — sits between `</aside>` and `.main` |
| Toggle | L2210–2213 | `toggleMobileSidebar()` toggles `.mob-open` on `.sb` and `.open` on `#mob-sb-backdrop` |
| Auto-close on navigate | L8775–8776 | `window.go()` removes `.mob-open` and `.open` on every page change |

There is no swipe gesture, no focus trap on the drawer, and no `aria-expanded`.

### 10.3 Other mobile-relevant behaviour

- **Touch drag-scroll** for the exec trend chart: `ontouchstart` (L6892) plus `touchmove` with `{passive:true}` and `touchend` (L6897–6898).
- **RTL** (L370–406): deliberately never sets `dir`/`direction` on `<html>` or `<body>` — the comment (L372–381) explains that direction is inherited and would jumble every untranslated English table. Instead `.sb` carries its own `dir="rtl"` attribute and `body.lang-ar` only reorders via `flex-direction:row-reverse`. Content-level RTL is scoped to `#stab-general` (L393–396) and `#stab-security` (L397–400) — the only translated panels. The toast stack also flips to `left:18px` under `body.lang-ar` (L5253).
- **Viewport meta**: `width=device-width, initial-scale=1.0` (L5).
- **`body{height:100vh;overflow:hidden}`** (L22) — the app never scrolls at the document level; `.page` owns the scroll. On mobile browsers with dynamic toolbars, `100vh` overshoots the visible area.
- No `matchMedia`, no `window.innerWidth` breakpoint checks in JS. The only `innerWidth` reads are for select-width capping (L14508) and popup positioning (L20658). All responsive behaviour is CSS-driven except the drawer toggle.

---

## 11. Hardcoded / mock values

| Value | L | Note |
|---|---|---|
| `TICK_ACCEL = 30` | L11952 | Demo time runs 30× real time |
| `TOAST_DURATION = 6000` | L5257 | ms |
| `TOAST_MAX = 1` | L5258 | Comment records the change from 3 |
| `NOTIF_PANEL_PREVIEW = 8` | L2228 | Notification dropdown shows the top 8 |
| `CURRENT_USER_ID = 'USR-1'` | L2862 | No authentication anywhere |
| `"Sarah Al-Rashid"` / `"Owner · settings ▾"` | L545 | Sidebar footer identity baked into markup |
| Riyadh centre `24.7136, 46.6753` | L11573 | Leaflet `setView` (dead code) |
| `MAP_ROUTES` | L11933–11941 | 7 hand-plotted **pixel** polylines for the canvas map |
| `TRIP_COORDS` | L11527–11544 | 7 hand-plotted **lat/lng** paths (dead code) |
| `TRIP_COLORS` | L11546–11547 | 7 hex colours, none tokenised (dead code) |
| `activeTrip = 'TRP-7741'` | L11942 | Plus `selectTrip('TRP-7741')` hardcoded in init (L14561) |
| `mapDateLabel()` → `'24 Jun'` / `'23 Jun'` / `'25 Jun'` | L12643–12647 | Fixed calendar dates |
| `openRenewModal` name maps | L5181, L5195 | `{nora, mohammed, reem, sara, omar, khaled}` → display names, hardcoded in the modal |
| `openRenewModal` prices | L5185–5190 | `86.50` / `164.35` / `344.52` / `122.50` / `232.50` SAR, "Ends 26 Jun", "⭐4.9 Ahmed Salem" |
| `confirmModal()` → `alert('✅ Subscription confirmed and activated!')` | L5234 | Legacy stub still wired to modal #17 |
| `DB.branding = {logoUrl:'', wordmark:'eyvar', showWordmark:true, accent:'#185FA5'}` | L18388 | `accent` duplicates `--blue` in JS |
| `DB.dataWindow.months = 13` | L20403 | Comment marks the payment-network dispute window as unconfirmed |
| Acceptance probabilities | L12523 (`0.8`), L12561 (`0.30 + (rating−3)×0.08`), L4958 (`clamp 0.55–0.95`) | Simulated driver behaviour |
| Chat-message probability `0.02` | L12593 | Per live trip per tick |
| Ping thresholds `120` / `300` | L12587, L12588 | Ticks until weak-signal / no-signal alerts |
| SLA breach `180` s | L12544 | Ride-request auto-escalation |
| `AUTO_OFFER_DELAY_SEC = 6` | L11987 | Seconds of search before the first driver offer (VIP: 1 s, L12535) |
| `OFFER_WINDOW_SEC = 12` | L11988 | Seconds the offered driver's app has to respond |
| Toast palette hex ×8 | L5272–5275 | Not tokenised |

---

## 12. Risks & gaps

**Modal system**

1. **No ESC handling.** Verified zero `Escape`/`keyCode 27` handlers. A modal is dismissable only by mouse (overlay click, ✕, or a footer button). Keyboard-only users are trapped.
2. **No focus management.** No `role="dialog"`, no `aria-modal`, no focus trap, no focus restore. Tab order leaks into the page behind the scrim.
3. **`closeModal()` has a global side effect.** `reqClearLocks()` (L5230) wipes `claimedBy`/`claimedAt` on **every** ride and subscription request whenever **any** modal closes — including a modal that has nothing to do with request claiming.
4. **Interval leak on overlay dismiss.** Four modal-scoped intervals (§2.5) are cleared only by their own bespoke buttons. Clicking the scrim leaves a 250 ms or 1000 ms timer running against a removed DOM subtree.
5. **`innerHTML` everywhere.** All 99 modals, all 349 toasts, and every table render interpolate `DB` values into HTML strings with no escaping. `toast()` strips tags only for the `title=` attribute (L5290), not for the visible message. Any operator-entered or rider-entered string (names, notes, ticket subjects, refusal grounds) is an injection vector the moment this panel is fed real data.
6. **Single-instance gate state.** `__confirmPending` (L17768) is one global. A second `confirmAction()` while one is pending silently overwrites the first.
7. **Legacy stub in production path.** `confirmModal()` (L5234) fires a native `alert()` and is still the confirm button of `openRenewModal` (#17).

**Gate system**

8. **`guardAction` monkey-patches globals.** `window[name]` is replaced at load. Any code holding a *reference* to the original (captured before installation) bypasses the gate. Install order matters and is spread over 5,000 lines.
9. **`window.__skipGuards` is a public global.** Anything — including a pasted console line or injected HTML — can set it and disable all 88 gates.
10. **`__guardToken` re-entrancy window.** During `onConfirm`, `__guardToken===name` lets the original through once; a nested call to the same action inside that window also passes ungated.
11. **`builder` exceptions are swallowed** (L17832: `try{spec=builder(...)}catch(e){spec=null;}`) — and `spec=null` means **the action runs unguarded**. A bug in a gate builder silently removes the gate.
12. **Ungated destructive actions** (§4.8): `removeCity`, `removeRideType`, `removeGateway`, `removeCustomLimit`, `removeEmployeeFromCorp`, `removeAvatar`, `commitUnflagAccount` all fire on a single click. The add-side counterparts of gateways and limits *are* gated; flag *is* modal-gated but unflag is not.
13. **Dead registry entries.** `GATE_SPECS.openLowRatingTicket` is `null`; `GATE_SWEEP.assignBackup` and `.autoHandoff` are declared then `delete`d two lines later (L20883–20887). Cosmetic, but they make the registry count misleading.
14. **The audit script is missing.** L20751 names `audit_mut.js` as "the deliverable" that "will fail the moment somebody adds an ungated action". No such file exists in this repository, so the invariant is unenforced.
15. **Gates promise durability the app does not have.** With zero persistence (§9.1), every "Recorded in the activity log under your name" / "Applies to every operator immediately" consequence is discarded on refresh.

**Toast**

16. **`TOAST_MAX = 1` drops bursts.** When several alerts fire in the same tick, all but the last are removed synchronously and never seen on screen. Mitigated for 330 of 349 calls by the notification-centre mirror — but the 19 calls passing `notify=false` rely on the caller pushing its own notification, and that pairing is manual and unverifiable statically.
17. **Toast colours bypass the token system** (§5.2) — eight hardcoded hex values that near-miss the `--*-lt` tokens.

**Design system**

18. **~40 untokenised colours** (§6), including two different blues in use for "live" affordances (`--blue #185FA5` vs `rgba(26,115,232,…)` at L341/347).
19. **Duplicate token values** — `--sb-bg` and `--bg` are both `#EEF0F3`.
20. **Duplicate class definitions** — `.map-stat`, `.ms-item`, `.ms-lbl`, `.ms-val` are each defined twice (L217–220 and L365–368) with conflicting layout rules; the second block wins. `.sm` is overloaded for both `.btn` (L81) and `.csel` (L323).
21. **`!important` used structurally** — 22 occurrences in the responsive layer, including `.mob-only{display:flex!important}` which exists solely to beat an inline `display:none` on the hamburger (L554). Removing the inline style would remove the need.

**External deps**

22. **Two render-blocking third-party requests** (L469–470) with no SRI, no `crossorigin`, no `defer`, and no local fallback — for a feature (§8.1) that is one optional 200×110 px thumbnail.
23. **A ~110-line Leaflet region (L11526–L11635) whose output never reaches the screen** (§8.1), including a second OSM tile-layer URL that is never fetched. Strictly, only `renderLiveMap()`/`initLeafletMap()` are unreachable; `updateLiveMarkers()` and `showHistoryRoute()` *are* called (L12598, L12688) but return immediately because `_lmap` is permanently `null`.
24. **CSP incompatibility.** The panel cannot run under any reasonable CSP: it needs `unsafe-inline` for hundreds of `onclick=` attributes, `unsafe-eval` for `new Function(onChangeExpr)` (L5411), plus `unpkg.com` in `script-src`/`style-src` and `*.tile.openstreetmap.org` in `img-src`.

**Lifecycle**

25. **Zero persistence** (§9.1) — refresh destroys everything.
26. **The 1 Hz tick engine is never cleared** and has no visibility/idle pause. It runs `Math.random()` simulations, re-renders visible pages, and mutates `DB` forever, including in a backgrounded tab.
27. **The 100 ms init pass is unguarded.** 45 sequential calls with no `try`/`catch`; one throw kills everything after it — including `startTickEngine()` at position 42.
28. **A `MutationObserver` watches the entire `document.body` subtree** (L14551) purely to auto-size `<select>` elements. Every table render, every toast, and every modal write re-triggers it (debounced to 60 ms).
29. **Ordering fragility is documented but unenforced.** L21802–21806 warns in capitals that the boot IIFE must remain last; nothing checks it.
30. **Three separate document-level `click` listeners** (L2224, L5414, L20671) plus two `window` `resize` listeners (L7311, L14550) — none removable, none coordinated.

---

## 13. UNVERIFIED items

| Item | Why it cannot be verified |
|---|---|
| Runtime behaviour of any of the above | This is a static read of the source. Nothing was executed in a browser. Every claim about *what renders* is inferred from the code, not observed. |
| `audit_mut.js` (referenced L20751 as the gate-sweep deliverable) | The file is not present anywhere in this repository. Whether it ever existed, and whether the "52 mutating actions / 45 registered / 7 exempt" figures in the comment are current, cannot be confirmed. |
| Whether the 7 ungated destructive actions in §4.8 are the *complete* set | Determined by pattern-matching function names against the 90-name gate set, then confirming a direct `onclick` call site. A destructive action named outside the `remove/delete/commit/…` prefix set, or invoked indirectly, would be missed. The source's own audit claims a stricter method (scan every `onclick`-reachable body for `DB` writes) but its script is absent. |
| Effective `window.__gateCount` at runtime | `installActionGates()` **assigns** `window.__gateCount = n` (L18085) while the other two installers **add** to it (L18381, L20900). Since `installActionGates()` runs first the arithmetic works out, but any reordering would silently reset the count. The final value depends on how many `guardAction` calls return `true` at runtime. |
| Whether all 45 `GATE_SWEEP` targets are defined *before* `installGateSweep()` runs at L20903 | All 90 registered names have a definition somewhere in the file, but `gateAll` skips names that are not yet functions. Function declarations hoist within the single script block, so this should hold — confirming it requires execution. |
| Whether the 4 statically unparseable `toast()` calls (L4447, L9000, L11462, L13674) pass a type | They are embedded inside escaped `onclick=` HTML strings; the argument parser cannot resolve them. Manual reading suggests all four do pass a type, but the type-distribution table in §5.4 marks them separately rather than guessing. |
| Colour-contrast compliance of any token pair | Not measured. |
| Whether `#modal-box` is ever styled by a `.modal-box` class | `selOpt` (L5212) queries `'.modal-box, #modal-box'` — a `.modal-box` class selector that is **not defined in the stylesheet** and does not appear in any markup. Harmless, but the intent behind the dual selector is unknown. |

---

## 14. Line-number index

| Subject | Lines |
|---|---|
| `<head>`, meta, favicon, title | L3–8 |
| `<style>` block | L9–468 |
| CSS reset | L10 |
| **Design tokens (`:root`)** | **L11–21** |
| `body` | L22 |
| Sidebar | L24–56 |
| Shell / topbar | L58–68 |
| Pages | L70–75 |
| Buttons | L77–86 |
| Cards | L88–97 |
| Grids | L99–102 |
| KPI | L104–116 |
| Badges | L118–129 |
| Health / days | L131–142 |
| Stars | L144–145 |
| Tables | L147–156 |
| Alert rows | L158–169 |
| Driver circle | L171–177 |
| Renewal bar | L179–182 |
| Toggle | L184–189 |
| **Modal CSS** | **L191–207** |
| Nearby-drivers | L209–212 |
| Map chrome | L213–224 |
| Plan form / settings | L226–279 |
| Global scrollbar | L280–281 |
| Native-select restyle | L283–291 |
| `csel` custom dropdown | L292–323 |
| Audit diff | L324–325 |
| Live-map page styles | L326–368 |
| `#map-leaflet` CSS (orphan) | L349 |
| RTL layer | L370–406 |
| **Responsive layer** | **L408–467** |
| — helpers | L414–415 |
| — `≤1024px` | L417–422 |
| — `≤768px` | L424–460 |
| — `≤480px` | L462–467 |
| **Leaflet CSS** | **L469** |
| **Leaflet JS** | **L470** |
| **Modal overlay markup** | **L474–477** |
| Sidebar markup | L479–547 |
| Mobile sidebar backdrop | L548 |
| Topbar markup / hamburger | L551–556 |
| Topbar search | L568–571 |
| Notification panel markup | L576 |
| City map preview container | L1639 |
| `<script>` opens | L2166 |
| `toggleMobileSidebar()` | L2210–2213 |
| `toggleNotifPanel()` + outside-click | L2214–2227 |
| `NOTIF_PANEL_PREVIEW` | L2228 |
| `CURRENT_USER_ID` | L2862 |
| `selOpt()` | L5211–5215 |
| **`closeModal()`** | **L5216–5219** |
| `reqClearLocks()` | L5220–5233 |
| `confirmModal()` legacy stub | L5234 |
| `ensureToastStack()` | L5236–5256 |
| `TOAST_DURATION` / `TOAST_MAX` | L5257–5258 |
| **`toast()`** | **L5269–5315** |
| `csel` outside-click / scroll close | L5414–5423 |
| Settings-nav resize listener | L7311–7313 |
| `showCityMapPreview()` (only live Leaflet use) | L7864–7875 |
| `pushOpsNotification()` | L9661 |
| `MAP_ROUTES` (canvas geometry) | L11933–11941 |
| `TICK_ACCEL` / `__tickStarted` / `__tickCount` | L11952–11954 |
| `startTickEngine()` | L11966–11969 |
| Leaflet dead-code region | L11510–11640 |
| `TRIP_COORDS` / `TRIP_COLORS` | L11527–11547 |
| `initLeafletMap()` | L11569–11578 |
| `updateLiveMarkers()` | L11579–11631 |
| **`tickEngine()`** | **L12508–12625** |
| `initMapClicks()` | L12626–12647 |
| KPI flash helper | L14540–14543 |
| `scheduleAutoSizeSelects()` | L14545–14548 |
| select `change` listener | L14549 |
| `resize` → `autoSizeAllSelects` | L14550 |
| `MutationObserver` on `document.body` | L14551–14553 |
| **One-shot init `setTimeout(…,100)`** | **L14556–14600** |
| Confirmation-gate header comment | L17760–17766 |
| **`confirmAction()`** | **L17769–17801** |
| `cancelConfirm()` / `runConfirm()` | L17802–17813 |
| **`guardAction()`** | **L17819–17840** |
| Gate-registry header comment | L17842–17852 |
| **`installActionGates()` (17 rich gates)** | **L17853–18089** |
| `seedArrivalTraces()` | L18093–18102 |
| **`GATE_SPECS`** | **L18245–18370** |
| `installUniversalGates()` | L18373–18383 |
| `DB.branding` / `applyBranding()` | L18388–18400 |
| `guardAction('saveBranding')` | L18460 |
| `guardAction('rebuildAllHistory')` | L18607 |
| `confirmTakeover()` (direct `confirmAction`) | L18940–18952 |
| `ownershipWarning()` | L18955–18960 |
| `guardAction('reinstateProbationary')` | L19490 |
| `guardAction('commitHandover')` | L19733 |
| `callTick()` | L20378 |
| `DB.dataWindow` | L20403 |
| `guardAction('fetchFullHistory')` | L20483 |
| `guardAction('saveDataWindow')` | L20522 |
| `installExplainLayer()` | L20668–20685 |
| `explainSweep()` | L20700 |
| `auditFixBoot()` | L20724–20735 |
| Gate-sweep header comment | L20738–20754 |
| `gateAll()` | L20756–20767 |
| **`GATE_SWEEP`** | **L20769–20887** |
| Deliberately-ungated list | L20889–20897 |
| `installGateSweep()` | L20898–20903 |
| `guardAction('impersonate')` | L21090 |
| `presenceBoot()` | L21382–21394 |
| `guardAction('suspendSurge')` | L21544 |
| `guardAction('approveRateCard')` | L21603 |
| **Boot IIFE `bootModules()`** | **L21807–21855** |
| `</script></body></html>` | L21855–21857 |

---

## 15. Custom-select widget (consolidated) (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §5.1, §5.2, item P2-6). Pass 1's finding: *"The three halves of one widget live in three different places"* — `cselToggle` had a single registry mention in `00a`, `cselPick` was explained in `14b-plan-editor.md`, and `cselFilterOptions` appeared in **no document at all**. This section documents the widget as one component. §7 of this file already owns the `.csel-*` **class** vocabulary; nothing there is changed or repeated — this is the behavioural half.

### 15.1 What it is and why it exists

`csel` is a drop-in replacement for `<select>`. Its design contract is stated at L5317–L5324:

> *"Drop-in replacement for `<select>` that keeps the exact same contract: a hidden input with the same id holds the value, so every existing `document.getElementById('x').value` read elsewhere keeps working unchanged — only the visual layer changes. options: `[{value,label,hint?}]`. onChangeFn: name of a global function to call (by string, since it's wired through an inline onclick) after a pick, mirroring what a native onchange would have triggered."*

That contract is the whole point: **`csel` is invisible to every consumer.** A save handler reads `document.getElementById('ns-plan').value` and cannot tell whether that id belongs to a native `<select>` or to the hidden `<input type="hidden">` the widget emits at L5352.

**59 call sites** to `customSelectHTML(` exist in the file (60 occurrences of the name, one of them the declaration at L5336) — it is one of the most-reused helpers in the panel.

### 15.2 The complete function set — 7 functions, 2 listeners

| Function | Line | Exported as | Refs | Role |
|---|---:|---|---:|---|
| `jsAttrStr(s)` | **L5332–L5335** | plain | 4 (decl + 3× at L5347) | Escapes a string for embedding in an `onclick="…"` attribute |
| `customSelectHTML(cselId,fieldId,options,selectedValue,placeholder,onChangeExpr,extraClass)` | **L5336–L5354** | plain | 60 (decl + **59 call sites**) | Builds the whole widget's HTML |
| `cselFilterOptions(input)` | **L5355–L5367** | `window.*` | 5, across L5343 / L5355 / L5378 / L20718 | Live search filter |
| `cselToggle(cselId)` | **L5368–L5382** | `window.*` | L5340 binding; **redefined L20704** | Opens / closes the menu |
| `positionCselMenu(wrap)` | **L5383–L5393** | plain | 4, across L5374 / L5383 / L20714 | Fixed-position placement, flips up when short of room |
| `cselPick(...)` | **L5394–L5413** | `window.*` | L5347 binding only | Commits a selection |
| `cselSetValue(cselId,fieldId,value)` | **L5427–L5439** | plain | 3 (decl + L12690 + L12808) | Programmatic set without a user click |
| document `click` listener | L5414–L5416 | — | — | Closes every open menu on an outside click |
| document `scroll` listener (capture) | L5420–L5423 | — | — | Closes the open menu on any scroll |
| **`cselToggle` override** | **L20703–L20722** | global reassignment | — | Null-safe replacement (§15.6) |

### 15.3 `jsAttrStr(s)` — L5332–L5335

```js
function jsAttrStr(s){
  var v=String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return "'"+v.replace(/"/g,'&quot;')+"'";
}
```

Two escape layers, in a required order, with the reason spelled out at L5325–L5331:

> *"Builds a properly-escaped single-quoted JS string literal for embedding inside a double-quoted HTML attribute. Two layers are required: JS-escape first (backslash, then single quote), then HTML-escape any literal double quote — otherwise the HTML parser itself truncates the attribute before the browser ever gets to parse it as JS. `JSON.stringify()` alone is NOT safe here: it emits double quotes, which breaks out of the surrounding `onclick="..."` attribute."*

| Step | Transform | Why |
|---:|---|---|
| 1 | `\` → `\\` | must run first, or step 2's inserted backslashes would be doubled |
| 2 | `'` → `\'` | the emitted literal is single-quoted |
| 3 | wrap in `'…'` | produces the literal |
| 4 | `"` → `&quot;` | applied to the *wrapped* string; keeps the HTML attribute from terminating early |

Its four occurrences are the declaration (L5332) and three uses on a single line, **L5347**, where it escapes three arguments in a row inside the option template — `jsAttrStr(o.value)`, `jsAttrStr(o.label)` and `jsAttrStr(onChangeExpr)`. Any option label containing an apostrophe (a rider named *O'Brien*, a reason code phrased *"Driver's fault"*) reaches the DOM through this function.

### 15.4 `customSelectHTML(...)` — L5336–L5354, the emitted structure

| Fragment | Line | Notes |
|---|---:|---|
| `div.csel#<cselId>` (+ optional `extraClass`, e.g. `'sm'`) | L5339 | outer wrapper; `.csel.sm .csel-btn` shrinks to 29 px (L323) |
| `button.csel-btn` with `onclick="cselToggle('<cselId>')"` | L5340 | contains `span.csel-val`, which gets the extra class `placeholder` when nothing is selected |
| chevron `svg.csel-arrow` | L5341 | rotated 180° by `.csel.open .csel-arrow` (L307) |
| `div.csel-menu` | L5342 | `display:none` until `.csel.open` (L308–L309) |
| **`input.csel-search`** | **L5343** | **emitted only when `options.length>6`** — `oninput="cselFilterOptions(this)"`, `onclick="stopEv(event)"`, `placeholder` reuses the widget's own placeholder text |
| `div.csel-opt-list` | L5344 | |
| `div.csel-opt` per option | L5345–L5348 | carries `data-value`, `data-label`, `data-search`, and `.sel` when it is the current value |
| `div.csel-no-results` | L5349 | `display:none` by default; the string is the literal **"No matches"**, hard-coded English |
| **`input[type=hidden]#<fieldId>`** | **L5352** | **the value carrier** — the whole compatibility contract |

**The search blob** (L5346): `(String(o.label)+' '+(o.search||'')).toLowerCase().replace(/"/g,'&quot;')`. So an option may carry an optional `search` field with extra keywords that are matched but never displayed — a documented capability with no example found among the call sites examined here. **UNVERIFIED:** whether any call site actually supplies `o.search`.

**The 6-option threshold** (L5343) is the single most behaviour-changing constant in the widget: at 6 options or fewer there is no search box, so `cselFilterOptions` never runs and `.csel-no-results` can never appear.

### 15.5 `cselFilterOptions(input)` — L5355–L5367

The function Pass 1 found in **no** document. Bound as `oninput=` on `.csel-search` (L5343) and additionally invoked directly from `cselToggle` (L5378 and, in the override, L20718).

```js
window.cselFilterOptions=function(input){
  var q=input.value.trim().toLowerCase();
  var list=input.parentElement.querySelector('.csel-opt-list');
  var opts=list.querySelectorAll('.csel-opt');
  var visibleCount=0;
  opts.forEach(function(o){
    var match=!q||o.getAttribute('data-search').indexOf(q)>=0;
    o.style.display=match?'':'none';
    if(match)visibleCount++;
  });
  var noRes=list.querySelector('.csel-no-results');
  if(noRes)noRes.style.display=visibleCount?'none':'block';
};
```

| Property | Value | Line |
|---|---|---:|
| Match rule | **case-insensitive substring** on `data-search` — `indexOf(q)>=0`. Not fuzzy, not word-prefix, not tokenised. | L5361 |
| Empty query | `!q` short-circuits to "everything matches" | L5361 |
| Hiding mechanism | inline `style.display` per option (`''` or `'none'`) — **not** a class | L5362 |
| Empty state | toggles `.csel-no-results` between `'block'` and `'none'` | L5366 |
| Scope | `input.parentElement.querySelector('.csel-opt-list')` — relies on the search input being a **direct child of `.csel-menu`**, which L5343 guarantees | L5357 |
| Reset path | `cselToggle` sets `search.value=''` then calls this function, so **every open starts unfiltered** | L5377–L5378 |

The `oninput` binding at L5343 is the single non-click inline handler Pass 1 recorded as undocumented (its §5.2). It is the only member of the 35-handler non-click dimension that lacked an owner.

### 15.6 `cselToggle(cselId)` — declared **twice**

This is the most important structural fact about the widget and the reason its documentation was scattered.

**Original — L5368–L5382**, assigned to `window.cselToggle`:

```js
window.cselToggle=function(cselId){
  var wrap=document.getElementById(cselId);
  var willOpen=!wrap.classList.contains('open');     /* throws if wrap is null */
  document.querySelectorAll('.csel.open').forEach(function(e){e.classList.remove('open');});
  if(willOpen){
    wrap.classList.add('open');
    positionCselMenu(wrap);
    var search=wrap.querySelector('.csel-search');
    if(search){ search.value=''; cselFilterOptions(search); setTimeout(function(){search.focus();},10); }
  }
};
```

**Override — L20703–L20722**, a bare global reassignment (`cselToggle=function(cselId){…}`, no `var`, no `window.`):

```js
var __origCselToggle=(typeof cselToggle==='function')?cselToggle:null;   /* L20703 */
cselToggle=function(cselId){
  var wrap=document.getElementById(cselId);
  if(!wrap)return;                                                       /* L20709 — the fix */
  …
  if(typeof positionCselMenu==='function')positionCselMenu(wrap);         /* L20714 */
  …
    if(typeof cselFilterOptions==='function')cselFilterOptions(search);   /* L20718 */
    setTimeout(function(){try{search.focus();}catch(e){}},10);            /* L20719 */
};
```

The reason is stated at L20640–L20642:

> *"`cselToggle` assumed its element still existed. Any re-render between paint and tap — which is constant on the live map — threw. A dropdown that throws on a stale reference is a dead control."*

and again inline at L20706–L20708:

> *"The element can disappear between paint and tap on any page that re-renders on a timer. Silently ignoring a stale reference is correct here — the control the operator aimed at no longer exists."*

**Differences between the two versions**, in full:

| Behaviour | L5368 original | L20704 override |
|---|---|---|
| Missing element | **`TypeError`** at `wrap.classList` | `return` (L20709) |
| `positionCselMenu` call | direct | `typeof`-guarded (L20714) |
| `cselFilterOptions` call | direct | `typeof`-guarded (L20718) |
| `search.focus()` | bare | wrapped in `try/catch` (L20719) |
| Assignment form | `window.cselToggle=` | bare `cselToggle=` — non-strict global reassignment |

Since the file is not in strict mode, the bare assignment at L20704 overwrites the same global binding, so the inline `onclick="cselToggle(…)"` at L5340 resolves to the **override**. Every user-visible toggle is null-safe.

**`__origCselToggle` (L20703) is a dead variable** — captured and never read again. A grep for the identifier returns exactly **1** occurrence in the whole 21,857-line file. There is no restore path, no A/B switch, and no diagnostic that reads it.

### 15.7 `positionCselMenu(wrap)` — L5383–L5393

The menu is `position:fixed` (L308), so it must be placed manually.

| Rule | Line |
|---|---:|
| Measure the button: `btn.getBoundingClientRect()` | L5386 |
| Menu height estimate: `Math.min(230, menu.scrollHeight||230)` — 230 px matches the CSS `max-height` at L308 | L5387 |
| **Flip-up test**: `(r.bottom+menuH+8>window.innerHeight) && (r.top-menuH-8>0)` — opens upward only if there is room above | L5388 |
| Width and left are copied from the button, so the menu always matches the control's width | L5389–L5390 |
| Vertical gap: **4 px** either way | L5391–L5392 |

Because the position is computed once at open time and never recomputed, the `scroll` listener at L5420–L5423 **closes** the menu instead of re-positioning it, with the reason at L5417–L5419: *"A fixed-position menu stays glued to the screen, not the button, if the modal (or the page) scrolls while it's open — closing it on scroll is simpler and safer than re-computing position on every scroll tick."* Note it is registered with `capture: true` (L5423) so it also fires for scrolls inside a modal body.

### 15.8 `cselPick(...)` — L5394–L5413

| Step | Line | Effect |
|---:|---:|---|
| 1 | L5395–L5396 | write `value` into the hidden input — **the only step any consumer depends on** |
| 2 | L5399 | close the menu (`classList.remove('open')`) |
| 3 | L5400–L5401 | set `.csel-val` text to `label` and drop the `placeholder` class |
| 4 | L5402–L5404 | clear `.sel` from every option, re-apply it to `[data-value="<value>"]` |
| 5 | **L5410–L5412** | **`if(onChangeExpr){ try{(new Function(onChangeExpr))();}catch(e){} }`** |

Step 5 is the widget's `onchange` equivalent. The safety argument is at L5406–L5409:

> *"`onChangeExpr` is an authored call expression from our own templates (e.g. `"onChangeDriverReason('SUB-1041')"`), never user input — used so a handler can receive the same arguments a native onchange attribute would have had access to via closure."*

Two behavioural consequences:

- **The `catch(e){}` is silent** (L5411). If the change handler throws, the pick still stands — the hidden input already holds the new value from step 1 — but nothing downstream runs and nothing is logged or toasted. A dropdown can appear to work while its dependent panel never updates.
- `new Function` re-parses the expression string on **every** pick. Since the string is always authored template text (never a value from `DB` or a user field), this is not an injection surface; it is, however, why an `onChangeExpr` must be a global function call and cannot be a closure.

The step-4 lookup at L5403 escapes the value with `String(value).replace(/"/g,'\\"')` before building the attribute selector — a **third** escaping convention, different from both `jsAttrStr` layers.

### 15.9 `cselSetValue(cselId,fieldId,value)` — L5427–L5439

The programmatic counterpart, rationale at L5424–L5426: *"For the handful of places that set a select's value programmatically (e.g. clicking a map row selects a trip in the dropdown too) rather than through a user pick — keeps the visible csel label in sync either way."*

It does steps 1, 3 and 4 of `cselPick` but **not step 5** — it deliberately does not fire `onChangeExpr`, because the caller is already in control of what happens next. It also reads the label from the option's `data-label` attribute rather than being handed one (L5437).

Its two call sites: **L12690** `cselSetValue('csel-map-trip','map-trip',activeTrip)` (Live Map) and **L12808** `cselSetValue('csel-fp3-status','fp3-status',status)`.

### 15.10 Dismissal listeners

| Listener | Line | Rule |
|---|---:|---|
| document `click` | L5414–L5416 | `if(!e.target.closest \|\| !e.target.closest('.csel')) …remove('open')` — any click outside any `.csel` closes **all** open menus. The `!e.target.closest` half guards non-element targets. |
| document `scroll`, capture phase | L5420–L5423 | closes the single open menu |

The `.csel-search` input carries `onclick="stopEv(event)"` (L5343) precisely so that clicking into the search box is not treated as an outside click by the L5414 listener.

### 15.11 Risks & gaps

| # | Severity | Finding | Evidence |
|---|---|---|---|
| **C1** | Medium | **Two live definitions of `cselToggle`.** The original (L5368) is unreachable at runtime but still present in the file, so a reader grepping the name finds the broken version first and the fix 15,000 lines later. Any future edit made to L5368 has no effect. | L5368, L20704 |
| **C2** | Low | **`__origCselToggle` is dead.** Assigned at L20703, never read. One occurrence in the file. | L20703 |
| **C3** | Medium | **`cselPick` swallows every handler error** (L5411). A failing `onChangeExpr` produces no toast, no console path, and a UI that is half-updated: hidden input changed, dependent panel not. | L5410–L5412 |
| **C4** | Low | **Three different escaping conventions inside one widget** — `jsAttrStr`'s two-layer escape (L5332), the ad-hoc `replace(/"/g,'&quot;')` on `data-label` and `data-search` (L5346, L5347), and `replace(/"/g,'\\"')` in the `cselPick` selector (L5403). They are individually correct for their contexts but must be kept aligned by hand. | L5332, L5346, L5347, L5403 |
| **C5** | Low | **No keyboard model.** The widget has no `role="listbox"`, no `aria-expanded`, no arrow-key or Enter handling, and options are `div`s with `onclick` (L5347). Only the search input (L5343, when present) is focusable. The native `<select>` it replaces was fully keyboard-operable. | L5339–L5352 |
| **C6** | Low | **"No matches" (L5349) and every placeholder default `'Select…'` (L5338) are hard-coded English** with no `data-i18n`, in a panel that otherwise carries 86 i18n keys. | L5338, L5349 |
| **C7** | Low | **`cselFilterOptions` assumes the DOM shape.** `input.parentElement.querySelector('.csel-opt-list')` (L5357) breaks if the search input is ever nested one level deeper. Guaranteed correct today only because L5343 is the single emitter. | L5357, L5343 |

### 15.12 Line-number index for §15

| Symbol | Lines |
|---|---|
| `.csel-*` CSS block | 292, 300–323 |
| Design-contract comment | 5317–5324 |
| `jsAttrStr` rationale comment | 5325–5331 |
| **`jsAttrStr(s)`** | **5332–5335** |
| **`customSelectHTML(...)`** | **5336–5354** |
| — `.csel-search` (only when `options.length>6`) | 5343 |
| — option template + `jsAttrStr` ×3 | 5347 |
| — `.csel-no-results` | 5349 |
| — **hidden value input** | **5352** |
| **`cselFilterOptions(input)`** | **5355–5367** |
| **`cselToggle(cselId)`** — original | **5368–5382** |
| — reset + refilter on open | 5377–5378 |
| `positionCselMenu(wrap)` | 5383–5393 |
| — flip-up test | 5388 |
| **`cselPick(...)`** | **5394–5413** |
| — `new Function(onChangeExpr)` | 5410–5412 |
| outside-click dismiss listener | 5414–5416 |
| scroll-close rationale + listener | 5417–5423 |
| `cselSetValue(...)` | 5427–5439 |
| `cselSetValue` call sites | 12690, 12808 |
| override rationale comment | 20640–20642 |
| **`__origCselToggle`** (dead) | **20703** |
| **`cselToggle` override** | **20704–20722** |
| — null guard | 20709 |

---

## 16. Global UI helpers not previously owned (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6.1, item P2-6). Four helpers Pass 1 assigned to this document. `jsAttrStr` and `cselFilterOptions`, also on that list, are covered in §15.

### 16.1 `startTimer` / `stopTimer` — L5305, L5306 (toast auto-dismiss)

Both are **inner functions of `toast()`**, declared per-toast inside its closure — not globals. That is why they carry a per-toast `timer` variable with no id bookkeeping.

```js
var timer=null;                                                   /* L5299 */
function dismiss(){ t.style.opacity='0'; t.style.transform='translateX(28px)';
                    setTimeout(function(){t.remove();},250); }     /* L5300–L5303 */
t.__dismiss=dismiss;                                               /* L5304 */
function startTimer(){timer=setTimeout(dismiss,TOAST_DURATION);}   /* L5305 */
function stopTimer(){if(timer){clearTimeout(timer);timer=null;}}   /* L5306 */
t.__stopTimer=stopTimer;                                           /* L5307 */
startTimer();                                                      /* L5308 */
```

| Binding | Line | Effect |
|---|---:|---|
| initial start | L5308 | the auto-dismiss clock begins as soon as the toast is appended |
| `mouseenter` → `stopTimer` | **L5309** | *"pause the clock while it's being read"* — the source's own comment |
| `mouseleave` → `startTimer` | **L5310** | resumes with a **full** `TOAST_DURATION`, not the remaining time |
| close-button `click` → `stopTimer(); dismiss();` | **L5311** | also `e.stopPropagation()` so the toast's own click handler does not double-fire |
| toast `click` (clickable toasts only) → `stopTimer(); dismiss(); onClick();` | **L5312–L5314** | |

Both are also published on the element — `t.__dismiss` (L5304) and `t.__stopTimer` (L5307) — so external code can cancel or dismiss a specific toast without reaching into the closure. §5 of this file owns the rest of the toast system, including `TOAST_DURATION`.

Reference counts match Pass 1: `startTimer` 2 (L5305 declaration, L5308 + L5310 bindings), `stopTimer` 3 (L5306 declaration, L5307/L5309/L5311/L5313 uses).

**Behavioural note worth recording:** because `startTimer` always schedules a *fresh* `TOAST_DURATION` (L5305), hovering a toast repeatedly resets its life each time. A toast under a moving cursor can persist indefinitely.

### 16.2 `autoSizeSelect(sel)` — L14494–L14515

Measures the widest option of a **native** `<select>` and widens the control so no option is clipped. It does **not** apply to `csel` widgets (§15), which size themselves from the button.

| Step | Line | Detail |
|---:|---:|---|
| Guard | L14495 | returns unless `sel.tagName==='SELECT'` and it has options |
| Font | L14496, L14499 | reconstructs the CSS font shorthand from `getComputedStyle` |
| Measurement | L14497–L14504 | a **single cached `<canvas>`** memoised on the function object as `autoSizeSelect._canvas`; `ctx.measureText` per option |
| Padding | L14505 | adds computed `paddingLeft + paddingRight` |
| Chrome allowance | **L14506** | `+36` px, commented *"native dropdown arrow + border + a little breathing room"* |
| Viewport cap | **L14508** | `Math.max(120, window.innerWidth-48)` — *"never wider than the screen has room for"* |
| Absolute cap | **L14509** | `Math.min(needed, viewportCap, 520)` — **520 px hard ceiling** |
| Monotonic | L14510–L14511 | only ever grows: `if(target>currentMin)` |
| Applied | L14512–L14513 | sets `style.minWidth` and `style.maxWidth='100%'`, so *"it still respects a narrow flex/grid cell if the layout constrains it"* |

**How it reaches every select** — four independent triggers, because most selects in this panel are built by `innerHTML` after load:

| Trigger | Line | Detail |
|---|---:|---|
| `change` delegate | **L14549** | `document.addEventListener('change', e => e.target.tagName==='SELECT' && autoSizeSelect(e.target))` — resizes on selection, since the chosen option may be wider than the placeholder |
| `resize` | L14550 | `debounce(…, 200)` → `autoSizeAllSelects(document)` |
| `MutationObserver` | **L14551–L14553** | observes `document.body` with `{childList:true,subtree:true}` → `scheduleAutoSizeSelects()` |
| Initial sweep | L14554 | `scheduleAutoSizeSelects()` at load |

`autoSizeAllSelects(root)` (L14516–L14518) is the fan-out; `scheduleAutoSizeSelects()` (L14545–L14548) coalesces bursts behind a **60 ms** `_selResizeTimer` (L14519, L14547) so a page render that inserts fifty selects triggers one sweep, not fifty.

Rationale at L14488–L14493: *"…a very long option can't push a dropdown off-screen. A MutationObserver applies this automatically to every select that appears anywhere in the app, since most are built with innerHTML inside page-render functions rather than present at initial load — no per-dropdown code change was needed anywhere else in the file."*

**Risk:** the observer is attached to `document.body` with `subtree:true` and no filter (L14552), so **every** DOM mutation anywhere in the panel — including each toast append (L5292) and each of the 33 renderers fired by the Settings router (`15-settings-shell.md` §2.3) — schedules a full-document `querySelectorAll('select')` sweep. The 60 ms coalescing is the only thing bounding it.

### 16.3 `explainAt(el)` — L20646–L20665 (tap-to-explain popover)

Renders a dark tooltip from an element's `data-explain` or `title` attribute — the touch-accessible replacement for hover-only tooltips.

The problem it solves is stated at L20635–L20638:

> *"…tooltip cannot be opened at all. The explanation of a fare unit, a permission, a held authorisation, a risk score: all written, all unreachable. This is the same fault found on the renewal page, and it is systemic, so it gets a systemic fix rather than 111 edits."*

| Step | Line | Detail |
|---:|---:|---|
| Read text | L20647 | `data-explain` first, then `title`; `if(!text)return` (L20648) |
| Singleton | L20649–L20650 | removes any existing `#explain-pop` — **at most one popover at a time** |
| Build | L20652–L20656 | a `div#explain-pop`, `position:fixed`, `z-index:200`, `max-width:280px`, dark `var(--ink,#1A1A18)` on `#fff`. Content set with **`textContent`** (L20656), so markup in a `title` renders as literal text — deliberate and safe. |
| Place | L20658 | `top=r.bottom+8`; `left=Math.max(8, Math.min(r.left, innerWidth-300))` — clamped 8 px from the left edge and 300 px from the right |
| Flip up | L20659 | if it would overflow the bottom, `top=Math.max(8, r.top-offsetHeight-8)` |
| Dismiss | L20661–L20664 | a `{once:true}` document `click` listener registered inside a `setTimeout(…,0)` so the opening click does not immediately close it |

**How it is reached** — `installExplainLayer()` (L20668–L20684), a **delegated capture-phase** listener, *"so it covers elements that do not exist yet — the panel re-renders constantly and per-element binding would miss most of them"* (L20666–L20667):

| Rule | Line |
|---|---:|
| Idempotent via `window.__explainInstalled` | L20669–L20670 |
| Walks **at most 4 ancestors** from the click target | L20673 |
| Fires only when the text is **longer than 45 characters** — *"only for explanatory text — short labels are fine as hover hints"* | L20676–L20677 |
| Fires only when the element has **no `onclick`** — so it never hijacks a real control | L20677 |
| On a hit: `e.stopPropagation(); explainAt(el); return;` | **L20678** |

`markExplainables(root)` (L20687–L20699) adds the visual affordance — *"Marks them so they look tappable. Without an affordance nobody discovers the explanation exists."* (L20685–L20686) — and `explainSweep()` (L20700) is the pair `installExplainLayer(); return markExplainables(document);`, re-run after navigations by the `go()` wrapper installed in `auditFixBoot()` (L20724–L20730, *"re-mark after renders, since almost every page rebuilds its own DOM"* L20726).

**Behavioural note:** the 45-character threshold (L20677) is the sole discriminator between "hover hint" and "explanation". A genuinely explanatory `title` of 44 characters stays hover-only and remains unreachable on touch — the exact fault the layer was written to fix.

---

## 17. Mount point: `#xloc-wrap` (added in remediation)

> Added by Verification Pass 1 remediation. Pass 1 §7 listed `#xloc-wrap` (L9197) as an undocumented element id and assigned it to `07b-trip-readiness.md` as *"the entity-location modal's canvas wrapper"*. **That attribution is wrong** and has been corrected — see `07b` §19 for the disproof. `xloc` is **export location**, and the element belongs to the global export modal this document already owns as entry 50 of the §3 inventory.

| Element id | Line | Kind | Owner | What fills it |
|---|---:|---|---|---|
| **`#xloc-wrap`** | **L9197** | `div style="padding:0 18px 6px"` — the *"Save location"* radio group | **`exportData(btn,page)`** L9187 | Emitted inline as part of the modal's single `innerHTML` assignment; holds exactly two `.plan-option` rows (L9198, L9199). |

### 17.1 The export modal's two radio groups

| Group | Radio `name` | Rows | Data attribute | Lines |
|---|---|---|---|---:|
| Format | `xfmt` | **CSV** (*"Opens in Excel / Google Sheets"*, selected by default) · **JSON** (*"For systems and APIs"*) | `data-fmt` | L9193–L9194 |
| Save location | `xloc` | **"Choose where to save…"** · **Downloads folder** (*"Instant download"*) | `data-loc` | L9197–L9200 |

Only the location group is wrapped in a named div. The reason is **feature detection**: the wrapper's contents are conditional on `pickerOK`, which reflects support for `window.showSaveFilePicker`.

| State | Effect | Line |
|---|---|---:|
| `pickerOK` true | `data-loc="ask"` row gets `.selected` and `onclick="selDriver(this)"`; its radio is `checked` | L9198 |
| `pickerOK` false | the `ask` row instead gets `style="opacity:.5"` and `title="Not supported in this browser"`, its radio is `disabled`, and `.selected`/`checked` move to `data-loc="dl"` | L9198–L9199 |

Both groups reuse **`selDriver(this)`** (L5872–L5876) as their selection handler — the same helper the driver-picker rows use. It is generic: it clears `.selected` from every `.plan-option` inside `#modal-box` and checks the row's radio. That is why the format and location groups do not interfere: `doExport` reads them by **attribute**, not by radio name.

### 17.2 How the value is read — `doExport(page)` L9204–L9221

```js
var fEl=document.querySelector('#modal-box .plan-option.selected[data-fmt]');  /* L9205 */
var lEl=document.querySelector('#modal-box .plan-option.selected[data-loc]');  /* L9206 */
var fmt=fEl?fEl.getAttribute('data-fmt'):'csv';                                /* L9207 */
var loc=lEl?lEl.getAttribute('data-loc'):'dl';                                 /* L9208 */
```

**Nothing reads `#xloc-wrap` by id.** It is a layout and feature-detection container only; the state lives on the `.plan-option.selected[data-loc]` row inside it. Defaults if either selector misses: `'csv'` and `'dl'`.

| Downstream step | Line |
|---|---:|
| `exportRows(page)` supplies `{head, rows, name}` | L9209, function L9175 |
| JSON path: `JSON.stringify(rows.map(→ object), null, 2)`; CSV path: `buildCSV(head,rows)` (L9183, escaping at L9184) | L9210–L9212 |
| Filename `'eyvar_'+d.name+'_25Jun.'+fmt` — **the date is hard-coded `25Jun`**, matching the demo clock | **L9213** |
| MIME `application/json` or `text/csv` | L9214 |
| `done()` → `closeModal()`, `logAction('export_data','report',page,…)`, toast | L9215 |
| `loc==='ask'` **and** `showSaveFilePicker` available → native save dialog, then `done()` | L9216–L9218 |
| otherwise → synthetic `<a download>` on an object URL, then `done()` | L9220 |

Note L9216 re-tests `typeof window.showSaveFilePicker==='function'` at click time, so a stale `pickerOK` cannot force an unsupported path.

### 17.3 Cross-doc note

`16f-settings-export.md` §9 already records that this modal is *"a superior export modal… unreachable from this tab"* — CSV **or** JSON plus a native save-location picker, versus the Data Export tab's own simpler path. That finding stands; this section supplies the missing DOM anchor for it. Note that `16f` cites the function as `L9188–9204` and `doExport` as `L9130–9152`; the verified declarations are **`exportData` L9187** and **`doExport` L9204–L9221**. The `16f` cites are off by one and by a block respectively, but the finding they support is correct.

### 17.4 Line-number index for §§16–17

| Symbol | Lines |
|---|---|
| toast `dismiss()` | 5300–5303 |
| `t.__dismiss` | 5304 |
| **`startTimer()`** | **5305** |
| **`stopTimer()`** | **5306** |
| `t.__stopTimer` | 5307 |
| initial `startTimer()` | 5308 |
| `mouseenter` / `mouseleave` bindings | 5309 / 5310 |
| close-button binding | 5311 |
| clickable-toast binding | 5312–5314 |
| `selDriver(el)` (shared row selector) | 5872–5876 |
| `exportRows(page)` | 9175 |
| `buildCSV(head,rows)` + `esc()` | 9183–9186 |
| **`exportData(btn,page)`** | **9187** |
| format radios | 9193–9194 |
| "Save location" header | 9196 |
| **`#xloc-wrap`** | **9197** |
| location radios (`pickerOK`-conditional) | 9198–9199 |
| modal footer | 9201 |
| **`doExport(page)`** | **9204–9221** |
| — attribute reads | 9205–9208 |
| — hard-coded `25Jun` filename | 9213 |
| — `showSaveFilePicker` path | 9216–9218 |
| — `<a download>` fallback | 9220 |
| `autoSizeSelect` rationale | 14488–14493 |
| **`autoSizeSelect(sel)`** | **14494–14515** |
| — `+36` chrome allowance | 14506 |
| — viewport cap / 520 px ceiling | 14508 / 14509 |
| `autoSizeAllSelects(root)` | 14516–14518 |
| `_selResizeTimer` | 14519 |
| `scheduleAutoSizeSelects()` (60 ms) | 14545–14548 |
| **`change` delegate** | **14549** |
| `resize` (debounced 200 ms) | 14550 |
| `MutationObserver` on `document.body` | 14551–14553 |
| initial sweep | 14554 |
| explain-layer rationale | 20635–20643 |
| **`explainAt(el)`** | **20646–20665** |
| `installExplainLayer()` | 20668–20684 |
| — 4-ancestor walk | 20673 |
| — 45-char + no-`onclick` test | 20676–20677 |
| — **`explainAt` invocation** | **20678** |
| `markExplainables(root)` | 20687–20699 |
| `explainSweep()` | 20700 |
| `auditFixBoot()` `go()` wrapper | 20724–20730 |
