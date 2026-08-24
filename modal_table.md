| 1 | `newTicket()` | L2418 | L2428 | New support ticket | `createTicket()` |
| 2 | `openNewRideRequestModal()` | L2449 | L2466 | 📞 New ride request | `commitNewRideRequest()` |
| 3 | `renderRideRequestTracking()` | L2516 | L2540 | '+(st.vip?'⭐ VIP — ':'')+st.reqId+' — '+nm2(st.rider)+' | `closeRideRequestTracking()` |
| 4 | `openSupportTicket()` | L2542 | L2550 | Open support ticket — '+entityName+' | `createTicketFor()` |
| 5 | `openUserSwitch()` | L3088 | L3096 | 👁 Act as team member | `commitUserSwitch()` |
| 6 | `openSettlement()` | L3639 | L3665 | Early termination settlement — '+subId+' | `commitSettlement()` |
| 7 | `openPublishVersionModal()` | L3821 | L3831 | Publish new version — '+doc.label+' | `commitPublishVersion()` |
| 8 | `openProcessReferralModal()` | L3907 | L3917 | 🎁 Process a referral | `commitProcessReferral()` |
| 9 | `openWalletAdjustModal()` | L3962 | L3975 | '+(kind==='credit'?'Add wallet credit':'Deduct from wallet')+' — '+r.name+' | `commitWalletAdjust()` |
| 10 | `openEditTipModal()` | L4192 | L4202 | 💰 Edit tip — '+tripId+' | `commitEditTip()` |
| 11 | `openInvoiceModal()` | L4429 | L4448 | 🧾 Tax invoice — '+inv.invoiceNumber+' | `toast()` |
| 12 | `renderNewSubModal()` | L4557 | L4635 | New subscription | `commitNewSub()` |
| 13 | `openSubTrackingModal()` | L4787 | L4790 | (no <h3> — see note) | — |
| 14 | `renderSubDispatchUI()` | L4992 | L5020 | New subscription — dispatch in progress | `cancelSubDispatch()` |
| 15 | `renderSubReselectAfterDecline()` | L5043 | L5060 | New subscription — '+drv.name+' declined | `cancelSubDispatch()` |
| 16 | `renderSubAcceptedTracking()` | L5133 | L5162 | '+subId+' — '+drv.name+' accepted | — |
| 17 | `openRenewModal()` | L5174 | L5209 | Upgrade plan — '+rName+' | `confirmModal()` |
| 18 | `openAutoRenewOffReason()` | L5455 | L5470 | Turn off auto-renew — '+subId+' | `commitAutoRenewOff()` |
| 19 | `freezePlan()` | L5485 | L5501 | Freeze subscription — '+subId+' | `doFreeze()` |
| 20 | `cancelSub()` | L5518 | L5546 | Cancel & refund — '+subId+' | `confirmCancelSub()` |
| 21 | `renderChangeDriverModal()` | L5751 | L5788 | Change driver — '+subId+' | — |
| 22 | `confirmActivatePlan()` | L5947 | L5955 | Activate '+p.name+' plan | `doActivatePlan()` |
| 23 | `confirmDeactivatePlan()` | L5966 | L5976 | Deactivate '+p.name+' plan | `doDeactivatePlan()` |
| 24 | `archivePlan()` | L6156 | L6163 | Archive '+p.name+' plan | `doArchivePlan()` |
| 25 | `openNewCorpModal()` | L6498 | L6515 | New corporate account | `commitNewCorp()` |
| 26 | `openCorpInvoiceModal()` | L6669 | L6700 | 🧾 Consolidated invoice — '+c.companyName+' | `commitSendCorpInvoice()` |
| 27 | `openAddEmployeeModal()` | L6724 | L6736 | Add employee | `commitAddEmployee()` |
| 28 | `processAllPayouts()` | L7037 | L7047 | Process all payouts | `confirmProcessAll()` |
| 29 | `confirmApproveDriver()` | L7165 | L7190 | Confirm approval | `approveDriver()` |
| 30 | `confirmPayDriver()` | L7194 | L7211 | Confirm payment — '+d.name+' | `executePayout()` |
| 31 | `previewInboundMessage()` | L7536 | L7547 | '+m.subject+' | `replyToInbound()` |
| 32 | `previewEmail()` | L7578 | L7586 | '+e.subject+' | `openProfile()` |
| 33 | `openCityDeactivateConfirm()` | L7794 | L7802 | ⚠ Turn off '+name+'? | `applyCityToggle()` |
| 34 | `onMultiSubToggle()` | L8049 | L8061 | Disable multi-subscription? | — |
| 35 | `showEntityLocation()` | L8226 | L8264 | 📍 '+(isDrv?'Driver':'Rider')+' location — '+d.name+' | — |
| 36 | `ndvRow()` | L8404 | L8453 | 🗺️ Nearby drivers — '+r.name+(sc?' <span class="b b-'+(sc.color==='red'?'red':sc.color==='amber'?'amber':'gree | `resolveUnavailable()`, `showEntityLocation()` |
| 37 | `callRiderConfirm()` | L8523 | L8534 | 📞 Call rider — '+rr.name+' | `logCallOutcome()` |
| 38 | `callDriverUrgent()` | L8547 | L8557 | 📞 Contact driver — '+dd.name+' | `logDriverCall()` |
| 39 | `notifyRiderChange()` | L8574 | L8588 | 📲 Notify rider of driver change | `sendRiderChangeNotif()` |
| 40 | `openPostponeTrip()` | L8606 | L8632 | 📅 Postpone trip | `confirmPostponeTrip()` |
| 41 | `openReadinessTicket()` | L8657 | L8684 | 🎧 Open support ticket | `createReadinessTicket()` |
| 42 | `createReadinessTicket()` | L8686 | L8700 | Ticket created | — |
| 43 | `confirmReleaseEscrow()` | L8935 | L8946 | Release escrow — '+e.sub+' | `releaseEscrow()` |
| 44 | `applyDeduction()` | L8971 | L8984 | Apply deduction | `confirmApplyDeduction()` |
| 45 | `reviewDriver()` | L8995 | L9001 | Review driver — '+name+' | — |
| 46 | `openFlagAccountModal()` | L9006 | L9024 | 🚩 Flag account — '+d.name+' | `commitFlagAccount()` |
| 47 | `openSuspendAccountModal()` | L9058 | L9077 | 🚫 Suspend account — '+d.name+' | `commitSuspendAccount()` |
| 48 | `onDriverExceptionToggle()` | L9115 | L9125 | Grant exception — '+d.name+' | — |
| 49 | `priorityCall()` | L9149 | L9159 | 📞 Priority call | `logPriorityCall()` |
| 50 | `exportData()` | L9187 | L9202 | Export — '+page+' | `doExport()` |
| 51 | `showActorHistory()` | L9271 | L9279 | '+(actor?actor.name:actorId)+'\u2019s activity | — |
| 52 | `showTeamMemberProfile()` | L10325 | L10336 | Team member | `showActorHistory()` |
| 53 | `editTeamUser()` | L10468 | L10482 | Edit team member | `commitEditTeamUser()` |
| 54 | `openInviteModal()` | L10502 | L10514 | Invite team member | `commitInvite()` |
| 55 | `viewUserPermissions()` | L10800 | L10811 | Permissions — '+u.name+' | `saveUserPermissions()` |
| 56 | `setDocStatus()` | L10852 | L10865 | Reject document | `confirmDocReject()` |
| 57 | `zoomDoc()` | L10883 | L10891 | '+label+' — document preview | — |
| 58 | `openDocDateEditor()` | L11050 | L11062 | 📅 Document dates — '+nm2(driverId)+' | `saveDriverDocDates()` |
| 59 | `confirmRejectDriver()` | L11081 | L11092 | Confirm rejection | `rejectDriver()` |
| 60 | `welcomeRider()` | L11159 | L11174 | Send welcome offer — '+r.name+' | `confirmWelcomeOffer()` |
| 61 | `sendDriverIncentive()` | L11191 | L11206 | Send incentive — '+d.name+' | `confirmDriverIncentive()` |
| 62 | `openRenewFlow()` | L11277 | L11282 | (no <h3> — see note) | — |
| 63 | `openAddStopModal()` | L11683 | L11695 | ➕ Add a stop — '+tripId+' | `commitAddStop()` |
| 64 | `openSendChatModal()` | L11732 | L11740 | 💬 Send message — '+tripId+' | `commitSendChatMsg()` |
| 65 | `interveneTrip()` | L11765 | L11787 | Intervene — '+id+' | — |
| 66 | `cancelLiveTrip()` | L11804 | L11822 | Cancel live trip — '+id+' | `confirmCancelLiveTrip()` |
| 67 | `resolveCashEntry()` | L12146 | L12169 | '+(isEscalate?'🚨 Escalate to Trust & Safety':'✓ Approve cash report')+' — '+e.id+' | `commitCashResolve()` |
| 68 | `recordCashRepayment()` | L12187 | L12201 | 💵 Record cash-debt repayment | `commitCashRepayment()` |
| 69 | `resolveUnavailable()` | L13078 | L13093 | 🚨 Find replacement driver | `confirmReassign()` |
| 70 | `assignBackup()` | L13186 | L13216 | Assign backup captain — '+subId+' | — |
| 71 | `openNewPromo()` | L13531 | L13547 | New promo campaign | `commitNewPromo()` |
| 72 | `openAwardIncentiveModal()` | L13688 | L13700 | 🏆 Award — '+inv.name+' | `commitAwardIncentive()` |
| 73 | `openSteerOffer()` | L14002 | L14021 | 📣 Steer drivers to '+zoneName+' | `commitSteerOffer()` |
| 74 | `openRetentionAction()` | L14255 | L14270 | Proactive retention — '+subId+' | — |
| 75 | `openChangeReason()` | L14887 | L14897 | Change reason code — '+t.id+' | `commitChangeReason()` |
| 76 | `openLowRatingTicket()` | L15302 | L15320 | Ticket from low rating — '+tripId+' | `createTicketFor()` |
| 77 | `openRatingDispute()` | L15522 | L15533 | Rating dispute — '+tripId+' | `commitRatingDispute()` |
| 78 | `openReportRider()` | L15543 | L15557 | Captain reports rider — '+tripId+' | `commitReportRider()` |
| 79 | `openDriverAppeal()` | L15568 | L15580 | Suspension appeal — '+d.name+' | `commitDriverAppeal()` |
| 80 | `openCreditNoteModal()` | L15892 | L15919 | 🧾 Credit note — '+cn.noteNumber+' | — |
| 81 | `openErasureRequest()` | L15978 | L15995 | Account erasure request — '+r.name+' | `commitErasureRequest()` |
| 82 | `openMassEvent()` | L16091 | L16105 | Declare a mass event | `commitMassEvent()` |
| 83 | `bulkReason()` | L16183 | L16191 | Change reason code — '+ids.length+' tickets | `commitBulkReason()` |
| 84 | `openLogContact()` | L16215 | L16228 | Log a contact | `commitLogContact()` |
| 85 | `openDesyncTicket()` | L16437 | L16452 | Ticket from state desync — '+tripId+' | `createTicketFor()` |
| 86 | `openEmergencyClaim()` | L16768 | L16788 | Emergency claim — '+absId+' | `commitEmergencyClaim()` |
| 87 | `commitMenu()` | L16858 | L16905 | '+(extra\|\|'Actions')+' | — |
| 88 | `openArrivalEvidence()` | L17749 | L17758 | 🔍 Arrival evidence — '+tripId+' | — |
| 89 | `confirmAction()` | L17769 | L17800 | '+(o.danger?'⚠ ':'')+o.title+' | `cancelConfirm()`, `runConfirm()` |
| 90 | `openTripReceipt()` | L18788 | L18819 | 🧾 Trip receipt — '+tripId+' | — |
| 91 | `openCaseView()` | L19005 | L19026 | 🔗 '+c.id+' — '+c.label+' | — |
| 92 | `openHandover()` | L19680 | L19706 | 🔁 Hand over your shift | `commitHandover()` |
| 93 | `screenPop()` | L20204 | L20237 | '+(channel==='whatsapp'?'💬 Inbound WhatsApp':'📞 Incoming call')+' | `abandonCall()`, `answerCall()` |
| 94 | `openWrapUp()` | L20277 | L20295 | Wrap up — '+Math.floor(secs/60)+'m '+(secs%60)+'s | `commitWrapUp()` |
| 95 | `openHealthBreakdown()` | L20567 | L20591 | Renewal health — '+subId+' | — |
| 96 | `renewalMenu()` | L20594 | L20619 | '+subId+' — '+nm2(sub.rider)+' | — |
| 97 | `showEffectivePermissions()` | L21048 | L21065 | What '+eff.user.name+' can do | — |
| 98 | `openSuspendSurge()` | L21720 | L21734 | Suspend surge | `commitSuspendSurge()` |
| 99 | `openRateCardChange()` | L21743 | L21760 | Propose a rate card change | `commitRateCardChange()` |
