# Ground-Truth Inventory (machine-extracted)

> Mechanically extracted from `eyvar_ops_panel_v40_fixed.html` — no interpretation.
> Purpose: the objective checklist every module doc is audited against.
> Generated during analysis pass; regenerate with the commands in METHODOLOGY.md.

## File facts

| Metric | Value |
|---|---|
| Lines | 21857 |
| Bytes | 1580139 |
| CSS block | L9-L468 |
| HTML body | L472-L2165 |
| JS block | L2166-L21855 |
| `.page` divs | 41 |
| Settings sub-tab panes | 21 |
| `function` declarations | 1042 |
| Distinct `render*()` fns | 136 |
| Static `<input>` | 225 |
| Static `<select>` | 19 |
| Static `<textarea>` | 12 |
| Static `<button>` | 711 |
| Distinct `onclick` handlers | 355 |
| Distinct `data-i18n` keys | 86 |
| Distinct element ids | 621 |

## A. All pages (`.page` divs) — 41

| # | Page id | div id | HTML start line |
|---|---|---|---|
| 1 | `exec-overview` | `p-exec-overview` | L583 |
| 2 | `corporate` | `p-corporate` | L634 |
| 3 | `corp-detail` | `p-corp-detail` | L644 |
| 4 | `fraud` | `p-fraud` | L650 |
| 5 | `dashboard` | `p-dashboard` | L676 |
| 6 | `subscriptions` | `p-subscriptions` | L713 |
| 7 | `live` | `p-live` | L768 |
| 8 | `trips` | `p-trips` | L848 |
| 9 | `renewal` | `p-renewal` | L861 |
| 10 | `readiness` | `p-readiness` | L869 |
| 11 | `drivers` | `p-drivers` | L887 |
| 12 | `riders` | `p-riders` | L907 |
| 13 | `finance` | `p-finance` | L928 |
| 14 | `wallets` | `p-wallets` | L968 |
| 15 | `rwallets` | `p-rwallets` | L1020 |
| 16 | `plans` | `p-plans` | L1030 |
| 17 | `plan-edit` | `p-plan-edit` | L1082 |
| 18 | `quickrides` | `p-quickrides` | L1132 |
| 19 | `my-account` | `p-my-account` | L1151 |
| 20 | `notifications-all` | `p-notifications-all` | L1171 |
| 21 | `predictive` | `p-predictive` | L1190 |
| 22 | `coverage` | `p-coverage` | L1220 |
| 23 | `compliance` | `p-compliance` | L1236 |
| 24 | `safety` | `p-safety` | L1252 |
| 25 | `growth` | `p-growth` | L1264 |
| 26 | `zones` | `p-zones` | L1304 |
| 27 | `all-pending` | `p-all-pending` | L1324 |
| 28 | `applicant-detail` | `p-applicant-detail` | L1342 |
| 29 | `support` | `p-support` | L1351 |
| 30 | `ticket-detail` | `p-ticket-detail` | L1380 |
| 31 | `profile` | `p-profile` | L1384 |
| 32 | `inbox` | `p-inbox` | L1392 |
| 33 | `commitment` | `p-commitment` | L1397 |
| 34 | `fairness` | `p-fairness` | L1402 |
| 35 | `contacts` | `p-contacts` | L1409 |
| 36 | `settings` | `p-settings` | L1416 |
| 37 | `audit-log` | `p-audit-log` | L2051 |
| 38 | `interventions` | `p-interventions` | L2068 |
| 39 | `requests` | `p-requests` | L2079 |
| 40 | `requests-sub-all` | `p-requests-sub-all` | L2123 |
| 41 | `requests-instant-all` | `p-requests-instant-all` | L2144 |

## B. Sidebar sections & nav items (source L486-L546)

| Line | Section | Nav label (en) | i18n key | Target page | Badge id |
|---|---|---|---|---|---|
| L486 | **Executive** (`sec.executive`) | | | | |
| L487 | Executive | Overview | `nav.exec-overview` | `exec-overview` | — |
| L490 | **Intelligence** (`sec.intelligence`) | | | | |
| L491 | Intelligence | Predictive signals | `nav.predictive` | `predictive` | `sbb-predictive` |
| L492 | Intelligence | Fraud & risk | `nav.fraud` | `fraud` | `sbb-fraud` |
| L495 | **Overview** (`sec.overview`) | | | | |
| L496 | Overview | Work inbox | `nav.inbox` | `inbox` | `sbb-inbox` |
| L497 | Overview | Dashboard | `nav.dashboard` | `dashboard` | `sbb-dash` |
| L498 | Overview | Live map | `nav.live` | `live` | — |
| L501 | **Operations** (`sec.operations`) | | | | |
| L502 | Operations | Subscriptions | `nav.subscriptions` | `subscriptions` | `sbb-subs` |
| L503 | Operations | Corporate accounts | `nav.corporate` | `corporate` | `sbb-corporate` |
| L504 | Operations | Quick rides | `nav.quickrides` | `quickrides` | `sbb-qr` |
| L505 | Operations | All trips | `nav.trips` | `trips` | — |
| L506 | Operations | Renewal pipeline | `nav.renewal` | `renewal` | `sbb-renew` |
| L507 | Operations | Trip readiness | `nav.readiness` | `readiness` | `sb-readiness-badge` |
| L508 | Operations | Requests | `nav.requests` | `requests` | `sbb-requests` |
| L511 | **Fleet** (`sec.fleet`) | | | | |
| L512 | Fleet | Drivers | `nav.drivers` | `drivers` | — |
| L513 | Fleet | Riders | `nav.riders` | `riders` | — |
| L514 | Fleet | Captain fairness | `nav.fairness` | `fairness` | `sbb-fairness` |
| L515 | Fleet | Plan commitment | `nav.commitment` | `commitment` | `sbb-commit` |
| L516 | Fleet | Coverage &amp; capacity | `nav.coverage` | `coverage` | `sbb-coverage` |
| L517 | Fleet | Compliance | `nav.compliance` | `compliance` | `sbb-compliance` |
| L518 | Fleet | Safety | `nav.safety` | `safety` | `sbb-safety` |
| L521 | **Growth** (`sec.growth`) | | | | |
| L522 | Growth | Promos &amp; growth | `nav.growth` | `growth` | — |
| L523 | Growth | Zones | `nav.zones` | `zones` | `sbb-zones` |
| L526 | **Finance** (`sec.finance`) | | | | |
| L527 | Finance | Finance | `nav.finance` | `finance` | — |
| L528 | Finance | Driver wallets | `nav.wallets` | `wallets` | — |
| L529 | Finance | Rider wallets | `nav.rwallets` | `rwallets` | — |
| L532 | **Support** (`sec.support`) | | | | |
| L533 | Support | Support Center | `nav.support` | `support` | `sb-ticket-badge` |
| L534 | Support | Contact drivers | `nav.contacts` | `contacts` | `sbb-contacts` |
| L537 | **Config** (`sec.config`) | | | | |
| L538 | Config | Pricing Plan | `nav.plans` | `plans` | — |
| L539 | Config | Settings | `nav.settings` | `settings` | — |
| L540 | Config | Activity log | `nav.audit-log` | `audit-log` | — |

**Totals:** 9 sidebar sections · **30** nav items · 41 pages → **11 pages are not directly reachable from the sidebar** (detail/drill-down pages). _(Corrected: an earlier revision of this line said 27 nav items and 14 unreachable pages. The table above always listed all 30; the prose summary was miscounted. Verified: `grep -c 'class="sb-item'` → 30.)_

### B.1 Pages with no sidebar entry

- `all-pending`
- `applicant-detail`
- `corp-detail`
- `interventions`
- `my-account`
- `notifications-all`
- `plan-edit`
- `profile`
- `requests-instant-all`
- `requests-sub-all`
- `ticket-detail`

## C. Settings sub-tabs — 21 tabs in 3 groups (source L1419-L1443)

| Line | Group | Tab key | Pane id | Label |
|---|---|---|---|---|
| L1420 | **Workspace** | | | |
| L1421 | Workspace | `general` | `#stab-general` | General |
| L1422 | Workspace | `team` | `#stab-team` | Team & Roles |
| L1423 | Workspace | `permissions` | `#stab-permissions` | Permissions |
| L1424 | **Operations** | | | |
| L1425 | Operations | `dispatch` | `#stab-dispatch` | Matching & Dispatch |
| L1426 | Operations | `cities` | `#stab-cities` | Cities & Regions |
| L1427 | Operations | `gateways` | `#stab-gateways` | Payment Gateways |
| L1428 | Operations | `limits` | `#stab-limits` | Operational Limits |
| L1429 | Operations | `cancelpolicy` | `#stab-cancelpolicy` | Cancellation Policy |
| L1430 | Operations | `reasons` | `#stab-reasons` | Reason Codes &amp; SLA |
| L1431 | Operations | `branding` | `#stab-branding` | Branding &amp; logo |
| L1432 | Operations | `integrity` | `#stab-integrity` | Data integrity |
| L1433 | Operations | `rota` | `#stab-rota` | On-call &amp; handover |
| L1434 | Operations | `ledger` | `#stab-ledger` | Ledger &amp; money safety |
| L1435 | Operations | `pricing` | `#stab-pricing` | Pricing &amp; rate card |
| L1436 | **System** | | | |
| L1437 | System | `notifications` | `#stab-notifications` | Alert Preferences |
| L1438 | System | `push` | `#stab-push` | Push Notifications |
| L1439 | System | `emails` | `#stab-emails` | Email Log |
| L1440 | System | `security` | `#stab-security` | Security |
| L1441 | System | `legal` | `#stab-legal` | Legal & Consent |
| L1442 | System | `activity` | `#stab-activity` | Activity |
| L1443 | System | `export` | `#stab-export` | Data Export |

### C.1 Nested sub-tabs elsewhere (not Settings tabs)

| Line | Container | Control id | Switcher | Label |
|---|---|---|---|---|
| L1034 | Pricing Plan page | `pricingsub-plans` | `switchPricingSubTab('plans')` | 📦 Subscription Plans |
| L1035 | Pricing Plan page | `pricingsub-quickrides` | `switchPricingSubTab('quickrides')` | 🚕 Quick Rides |
| L1854 | Settings ▸ Email Log | `mailsub-inbox` | `switchMailSubTab('inbox')` | 📥 Inbox (+ `inbox-unread-badge`) |
| L1855 | Settings ▸ Email Log | `mailsub-outbox` | `switchMailSubTab('outbox')` | 📤 Outbox |

## D. Router map — `window.go(id, el, isBack)` (L8774-L8826)

| Line | Page id | Render functions invoked |
|---|---|---|
| L8787 | `dashboard` | `renderDashboard();` |
| L8788 | `interventions` | `renderInterventionsPage();` |
| L8789 | `support` | `renderSupportTeam();` |
| L8790 | `live` | `renderMapFilterSelects();renderMapTripsTable();setTimeout(function(){setMapMode(MAP_MODE||'live');},50);renderLiveOps();` |
| L8791 | `drivers` | `renderSupplyKpis();renderDriversTable();renderPendingDrivers();if(typeof renderFleetCounts==='function')renderFleetCounts();` |
| L8792 | `riders` | `renderSupplyKpis();renderRidersTable();renderNewRiders();` |
| L8793 | `all-pending` | `renderAllPending('');` |
| L8794 | `requests` | `renderRequestsPage();` |
| L8795 | `plan-edit` | `loadPlanEditForm();renderPlanFeatures();` |
| L8796 | `coverage` | `renderCoveragePage();` |
| L8797 | `compliance` | `renderCompliancePage();` |
| L8798 | `safety` | `renderSafetyPage();` |
| L8799 | `growth` | `renderGrowthPage();renderReferralProgram();` |
| L8800 | `zones` | `renderZonesPage();` |
| L8801 | `predictive` | `renderPredictivePage();` |
| L8802 | `notifications-all` | `renderAllNotificationsPage();` |
| L8803 | `my-account` | `renderMyAccountPage();` |
| L8804 | `requests-sub-all` | `renderRequestsSubAll(document.getElementById('requests-sub-all-search')?document.getElementById('requests-sub-all-search').value:'');` |
| L8805 | `requests-instant-all` | `renderRequestsInstantAll(document.getElementById('requests-instant-all-search')?document.getElementById('requests-instant-all-search').value:'');` |
| L8806 | `support` | `renderTkFilterSelect();renderTickets();renderDisputes();renderLostFound();` |
| L8807 | `plans` | `renderPlansFormSelects();renderPlansTable();renderRideTypesTable();renderSurgeSchedule();switchPricingSubTab('plans');` |
| L8808 | `quickrides` | `renderQuickRidesTable();` |
| L8809 | `trips` | `renderTripsTable();` |
| L8810 | `renewal` | `renderRenewalPipeline();` |
| L8811 | `exec-overview` | `renderExecOverview();renderExecTrendChart();` |
| L8812 | `corporate` | `renderCorporateList();` |
| L8813 | `fraud` | `renderFraudPage();renderIdentityCollisions();` |
| L8814 | `rwallets` | `renderRiderWalletsList();` |
| L8815 | `finance` | `renderRefundsTable();renderContributionCard();renderCreditNotes();` |
| L8816 | `wallets` | `renderPayoutsTable();renderEscrow();renderDeductions();renderCashReconciliation();` |
| L8817 | `readiness` | `renderReadiness();` |
| L8818 | `subscriptions` | `renderSubscriptionsTable();` |
| L8819 | `settings` | `renderTeamTable();renderAuditLog();renderOpsRadiusConfig();renderGeneralConfig();renderNotificationConfig();renderSecurityConfig();renderCitiesTable();renderOpsLimitsTable();renderCancellationPolicy();renderEmailOutbox();renderLeadInbox();renderPaymentGateways();renderSearchPhasesTable();renderPlanVisibility();renderExportCounts();renderSnapshotsTable();renderPushOutbox();renderLegalConsent();renderReasonCodesTable();renderSlaPolicyForm();renderCompPolicyTable();renderOnCall();renderCommitSettings();renderDispatchSettings();renderBrandingSettings();renderIntegrity();renderRota();renderLedger();renderWindowSettings();renderPricing();updateBroadcastAudienceCount();updatePushAudienceCount();renderSettingsMeta();switchSettingsTab('general');fitSettingsNavHeight();` |
| L8820 | `contacts` | `renderContactsPage();renderContactsExtra();renderQueueMetrics();` |
| L8821 | `fairness` | `renderFairnessPage();renderCaptainEconomics();` |
| L8822 | `inbox` | `renderInbox();` |
| L8823 | `commitment` | `renderCommitmentPage();` |
| L8824 | `audit-log` | `renderAuditLog();` |

**Pages with NO render branch in `go()`** — static markup only, or populated by their opener function:

- `applicant-detail`
- `corp-detail`
- `profile`
- `ticket-detail`

> ⚠️ **Duplicate branch:** `support` is handled twice — L8789 (`renderSupportTeam()`) and L8806 (`renderTkFilterSelect(); renderTickets(); renderDisputes(); renderLostFound()`). Both run. Flagged for verification.

## E. All `render*()` functions (136 distinct)

| Line | Function |
|---|---|
| L2229 | `renderNotifPanel)` |
| L2298 | `renderAllNotificationsPage)` |
| L2330 | `renderTickets)` |
| L2516 | `renderRideRequestTracking)` |
| L2920 | `renderMyAccountPage)` |
| L2923 | `renderMaProfile)` |
| L3004 | `renderMaSecurity)` |
| L3065 | `renderMaPermissions)` |
| L3203 | `renderRefundsTable)` |
| L3308 | `renderRenewalPipeline)` |
| L3388 | `renderTripsTable)` |
| L3440 | `renderQuickRidesTable)` |
| L3477 | `renderSubscriptionsTable)` |
| L3801 | `renderLegalConsent)` |
| L3877 | `renderReferralProgram)` |
| L4010 | `renderRiderWalletsList)` |
| L4557 | `renderNewSubModal)` |
| L4800 | `renderSubTrackingWidget)` |
| L4992 | `renderSubDispatchUI)` |
| L5043 | `renderSubReselectAfterDecline)` |
| L5133 | `renderSubAcceptedTracking)` |
| L5592 | `renderFraudPage)` |
| L5751 | `renderChangeDriverModal)` |
| L5887 | `renderNsDriverMap)` |
| L5927 | `renderPlansTable)` |
| L5998 | `renderPlanFeatures)` |
| L6313 | `renderDriverCircuit)` |
| L6343 | `renderDriversTable)` |
| L6406 | `renderRidersTable)` |
| L6472 | `renderCorporateList)` |
| L6571 | `renderCorpDetail)` |
| L6765 | `renderExecTrendChart)` |
| L6769 | `renderTrendChart)` |
| L6901 | `renderExecOverview)` |
| L6980 | `renderRetentionWatchlist)` |
| L7339 | `renderSettingsMeta)` |
| L7362 | `renderCancellationPolicy)` |
| L7398 | `renderOpsLimitsTable)` |
| L7461 | `renderPaymentGateways)` |
| L7521 | `renderLeadInbox)` |
| L7557 | `renderEmailOutbox)` |
| L7658 | `renderSnapshotsTable)` |
| L7668 | `renderExportCounts)` |
| L7748 | `renderPushOutbox)` |
| L7764 | `renderCitiesTable)` |
| L7980 | `renderGeneralConfig)` |
| L8003 | `renderNotificationConfig)` |
| L8018 | `renderSecurityConfig)` |
| L8036 | `renderOpsRadiusConfig)` |
| L8087 | `renderSearchPhasesTable)` |
| L8122 | `renderPlanVisibility)` |
| L8906 | `renderEscrow)` |
| L8948 | `renderDeductions)` |
| L9230 | `renderAuditFilterSelect)` |
| L9322 | `renderAuditLog)` |
| L10071 | `renderRequestsPage)` |
| L10137 | `renderRequestsSubAll)` |
| L10183 | `renderRequestsInstantAll)` |
| L10313 | `renderSupportTeam)` |
| L10338 | `renderInterventionsPage)` |
| L10346 | `renderDashboard)` |
| L10451 | `renderTeamTable)` |
| L10711 | `renderPagePermMatrix)` |
| L10750 | `renderRoleMatrix)` |
| L10894 | `renderPendingDrivers)` |
| L10939 | `renderAllPending)` |
| L11136 | `renderNewRiders)` |
| L11300 | `renderStep1)` |
| L11341 | `renderStep2)` |
| L11394 | `renderRenewalApprovalHold)` |
| L11418 | `renderSuccess)` |
| L11465 | `renderFailure)` |
| L11504 | `renderLiveOps)` |
| L11522 | `renderMapTripsTableFiltered)` |
| L11632 | `renderLiveMap)` |
| L11637 | `renderSubRequests)` |
| L11658 | `renderActiveTrips)` |
| L11850 | `renderRideRequests)` |
| L12239 | `renderCashReconciliation)` |
| L12283 | `renderSurgeSchedule)` |
| L12342 | `renderRideTypesTable)` |
| L12660 | `renderMapTripsTable)` |
| L12706 | `renderMapFilterSelects)` |
| L12775 | `renderTkFilterSelect)` |
| L12796 | `renderPlansFormSelects)` |
| L13147 | `renderCoveragePage)` |
| L13238 | `renderCapacityGrid)` |
| L13320 | `renderCompliancePage)` |
| L13397 | `renderSafetyPage)` |
| L13506 | `renderPromoList)` |
| L13664 | `renderIncentives)` |
| L13740 | `renderBulkMsg)` |
| L13762 | `renderCohorts)` |
| L13786 | `renderCsat)` |
| L14058 | `renderZoneMomentum)` |
| L14131 | `renderZonesPage)` |
| L14236 | `renderPredSubs)` |
| L14307 | `renderPredDrivers)` |
| L14325 | `renderPredPayment)` |
| L14341 | `renderPredIncidents)` |
| L14356 | `renderPredZones)` |
| L14367 | `renderPredictivePage)` |
| L14386 | `renderGrowthPage)` |
| L14397 | `renderDisputes)` |
| L14454 | `renderLostFound)` |
| L15011 | `renderContactsPage)` |
| L15070 | `renderReasonCodesTable)` |
| L15128 | `renderSlaPolicyForm)` |
| L15463 | `renderCompPolicyTable)` |
| L15636 | `renderFairnessPage)` |
| L15741 | `renderContributionCard)` |
| L15789 | `renderOnCall)` |
| L15921 | `renderCreditNotes)` |
| L16045 | `renderErasureQueue)` |
| L16150 | `renderBulkBar)` |
| L16243 | `renderContactsExtra)` |
| L16291 | `renderCaptainEconomics)` |
| L16492 | `renderIdentityCollisions)` |
| L16912 | `renderCommitmentPage)` |
| L17080 | `renderCommitSettings)` |
| L17360 | `renderEmergencyDispatch)` |
| L17408 | `renderDispatchSettings)` |
| L17515 | `renderCoverage)` |
| L18401 | `renderBrandingSettings)` |
| L18576 | `renderIntegrity)` |
| L19239 | `renderInbox)` |
| L19744 | `renderRota)` |
| L20069 | `renderLedger)` |
| L20265 | `renderCallBar)` |
| L20335 | `renderQueueMetrics)` |
| L20492 | `renderWindowSettings)` |
| L21035 | `renderImpersonationBar)` |
| L21152 | `renderFleetCounts)` |
| L21228 | `renderSupplyKpis)` |
| L21353 | `renderPresence)` |
| L21622 | `renderPricing)` |

## F. All `onclick` handlers (355 distinct, by call-site frequency)

| Call sites | Handler |
|---|---|
| 230 | `closeModal` |
| 100 | `openProfile` |
| 72 | `go` |
| 34 | `kpiScrollTo` |
| 22 | `switchSettingsTab` |
| 18 | `stopEv` |
| 17 | `selDriver` |
| 11 | `priorityCall` |
| 8 | `selOpt` |
| 6 | `setReqFilter` |
| 6 | `setNotifFilter` |
| 5 | `showNearbyDriversMap` |
| 5 | `setMapFilter` |
| 5 | `openRenewFlow` |
| 4 | `quickSuspendFromFraud` |
| 4 | `openTicketDetail` |
| 4 | `if` |
| 4 | `goBack` |
| 4 | `filterZones` |
| 4 | `filterCoverage` |
| 4 | `filterCompliance` |
| 4 | `closeRideRequestTracking` |
| 4 | `cancelSubDispatch` |
| 4 | `callDriverUrgent` |
| 4 | `assignManually` |
| 3 | `showEntityLocation` |
| 3 | `reviewDriver` |
| 3 | `resolveDispute` |
| 3 | `renderStep2` |
| 3 | `openWalletAdjustModal` |
| 3 | `openHealthBreakdown` |
| 3 | `openAllNotifications` |
| 3 | `filterSafety` |
| 3 | `createTicketFor` |
| 3 | `commitRetentionAction` |
| 3 | `auditGoToPage` |
| 3 | `assignBackup` |
| 2 | `welcomeRider` |
| 2 | `toggleMobileSidebar` |
| 2 | `toggleLowRatingFilter` |
| 2 | `toggleDocExpiryEdit` |
| 2 | `toast` |
| 2 | `switchPricingSubTab` |
| 2 | `switchMailSubTab` |
| 2 | `simulateCall` |
| 2 | `showZoneHourly` |
| 2 | `showActorHistory` |
| 2 | `setTripsKindFilter` |
| 2 | `setTicketStatus` |
| 2 | `setReadinessSort` |
| 2 | `setMapMode` |
| 2 | `selectTrip` |
| 2 | `scrollTrendChart` |
| 2 | `savePlan` |
| 2 | `saveOpsRadiusConfig` |
| 2 | `respondBackupOffer` |
| 2 | `resolveUnavailable` |
| 2 | `resolveCashEntry` |
| 2 | `processCharge` |
| 2 | `openUserSwitch` |
| 2 | `openSupportTicket` |
| 2 | `openSubReqAssign` |
| 2 | `openSteerOffer` |
| 2 | `openRenewModal` |
| 2 | `openReadinessTicket` |
| 2 | `openNewRiderProfile` |
| 2 | `openLogContact` |
| 2 | `openCorpDetail` |
| 2 | `markAllRead` |
| 2 | `filterCommit` |
| 2 | `exportData` |
| 2 | `decideFairness` |
| 2 | `decideEmergency` |
| 2 | `confirmSubDriverCommit` |
| 2 | `confirmRejectDriver` |
| 2 | `confirmPayDriver` |
| 2 | `confirmApproveDriver` |
| 2 | `commitDriverChange` |
| 2 | `changeDriver` |
| 2 | `cancelConfirm` |
| 2 | `callRiderConfirm` |
| 2 | `bulkStatus` |
| 1 | `zoomDoc` |
| 1 | `waiveDeduction` |
| 1 | `viewUserPermissions` |
| 1 | `unflagTrip` |
| 1 | `tryAnotherCard` |
| 1 | `toggleSubValueSort` |
| 1 | `toggleRenewalFlat` |
| 1 | `togglePagePermExpand` |
| 1 | `toggleNsDriverMap` |
| 1 | `toggleNotifPanel` |
| 1 | `toggleFleetCounts` |
| 1 | `tkSelectAll` |
| 1 | `stopImpersonating` |
| 1 | `startReplay` |
| 1 | `simulateWhatsApp` |
| 1 | `showTeamMemberProfile` |
| 1 | `showEffectivePermissions` |
| 1 | `setRenewalFilter` |
| 1 | `setInboxTab` |
| 1 | `setDefaultGateway` |
| 1 | `setCorpStatus` |
| 1 | `sendTripReceipt` |
| 1 | `sendTicketReply` |
| 1 | `sendRiderChangeNotif` |
| 1 | `sendRetentionOfferToRider` |
| 1 | `sendRenewalApprovalRequest` |
| 1 | `sendReconsentReminder` |
| 1 | `sendPushNotification` |
| 1 | `sendDriverIncentive` |
| 1 | `sendBulkMsg` |
| 1 | `sendBroadcast` |
| 1 | `selectCitySuggestion` |
| 1 | `saveUserPermissions` |
| 1 | `saveSurgeSchedule` |
| 1 | `saveSurgeConfig` |
| 1 | `saveSlaPolicy` |
| 1 | `saveSecurityConfig` |
| 1 | `saveSearchPhases` |
| 1 | `saveRideTypes` |
| 1 | `saveReferralConfig` |
| 1 | `saveReasonCodes` |
| 1 | `savePlanVisibility` |
| 1 | `saveOpsLimits` |
| 1 | `saveOnCall` |
| 1 | `saveNotificationConfig` |
| 1 | `saveMaProfile` |
| 1 | `saveGeneralConfig` |
| 1 | `saveDriverDocDates` |
| 1 | `saveDocExpiry` |
| 1 | `saveDataWindow` |
| 1 | `saveCorpUsagePolicy` |
| 1 | `saveCorpBillingContact` |
| 1 | `saveCompPolicy` |
| 1 | `saveCommitPolicy` |
| 1 | `saveCancellationPolicy` |
| 1 | `saveBranding` |
| 1 | `runConfirm` |
| 1 | `resumePromo` |
| 1 | `resolveComplaint` |
| 1 | `resolveAlert` |
| 1 | `resetBranding` |
| 1 | `replyToInbound` |
| 1 | `reopenTicket` |
| 1 | `reopenSubReq` |
| 1 | `renewalMenu` |
| 1 | `renderStep1` |
| 1 | `renderPresence` |
| 1 | `renderIntegrity` |
| 1 | `renderChangeDriverModal` |
| 1 | `removeSurgeWindow` |
| 1 | `removeSearchPhase` |
| 1 | `removeRideType` |
| 1 | `removePlanFeature` |
| 1 | `removeIncentiveRule` |
| 1 | `removeGateway` |
| 1 | `removeEmployeeFromCorp` |
| 1 | `removeCustomLimit` |
| 1 | `removeCity` |
| 1 | `removeAvatar` |
| 1 | `releaseEscrow` |
| 1 | `rejectSubReqCorp` |
| 1 | `rejectErasure` |
| 1 | `rejectDriver` |
| 1 | `rejectCorpSubscription` |
| 1 | `reinstateProbationary` |
| 1 | `reinstateAccount` |
| 1 | `redispatchToNewDriver` |
| 1 | `recordCashRepayment` |
| 1 | `recordAbsence` |
| 1 | `reconsiderApplicant` |
| 1 | `rebuildAllHistory` |
| 1 | `reassignLiveDriver` |
| 1 | `quickContactDriver` |
| 1 | `queueRecruitment` |
| 1 | `promoteBackup` |
| 1 | `processAllPayouts` |
| 1 | `proceedChangeDriver` |
| 1 | `previewInboundMessage` |
| 1 | `previewEmail` |
| 1 | `precautionSuspend` |
| 1 | `pickPlan` |
| 1 | `pickNearbyDriver` |
| 1 | `pausePromo` |
| 1 | `openWrapUp` |
| 1 | `openTripReceipt` |
| 1 | `openTripChatView` |
| 1 | `openSuspendSurge` |
| 1 | `openSuspendAccountModal` |
| 1 | `openSettlement` |
| 1 | `openSendChatModal` |
| 1 | `openRetentionAction` |
| 1 | `openReportRider` |
| 1 | `openRatingDispute` |
| 1 | `openRateCardChange` |
| 1 | `openPublishVersionModal` |
| 1 | `openProcessReferralModal` |
| 1 | `openPostponeTrip` |
| 1 | `openPlanEdit` |
| 1 | `openNewRideRequestModal` |
| 1 | `openNewPromo` |
| 1 | `openNewCorpModal` |
| 1 | `openMassEvent` |
| 1 | `openLowRatingTicket` |
| 1 | `openInvoiceModal` |
| 1 | `openInviteModal` |
| 1 | `openHandover` |
| 1 | `openFlagAccountModal` |
| 1 | `openErasureRequest` |
| 1 | `openEmergencyClaim` |
| 1 | `openEditTipModal` |
| 1 | `openEarningsStatement` |
| 1 | `openDriverAppeal` |
| 1 | `openDocDateEditor` |
| 1 | `openDesyncTicket` |
| 1 | `openCreditNoteModal` |
| 1 | `openCorpInvoiceModal` |
| 1 | `openChangeReason` |
| 1 | `openAwardIncentiveModal` |
| 1 | `openArrivalEvidence` |
| 1 | `openApplicantDetail` |
| 1 | `openAddStopModal` |
| 1 | `openAddEmployeeModal` |
| 1 | `notifyRiderChange` |
| 1 | `newTicket` |
| 1 | `newPlan` |
| 1 | `manualRecalcTiers` |
| 1 | `logPriorityCall` |
| 1 | `logOutSession` |
| 1 | `logNdvContact` |
| 1 | `logDriverCall` |
| 1 | `logCallOutcome` |
| 1 | `interveneTrip` |
| 1 | `inboxOpen` |
| 1 | `impersonate` |
| 1 | `handleNotifClick` |
| 1 | `freezePlan` |
| 1 | `forceResync` |
| 1 | `focusLiveTrip` |
| 1 | `flagTrip` |
| 1 | `finalizeReassign` |
| 1 | `filterDriversByTier` |
| 1 | `fetchFullHistory` |
| 1 | `exportSubscriptions` |
| 1 | `exportSnapshots` |
| 1 | `exportRiders` |
| 1 | `exportRequestsSnapshot` |
| 1 | `exportPushLog` |
| 1 | `exportPayments` |
| 1 | `exportIntegrity` |
| 1 | `exportInbox` |
| 1 | `exportEmailLog` |
| 1 | `exportDrivers` |
| 1 | `exportContacts` |
| 1 | `exportAuditLog` |
| 1 | `executePayout` |
| 1 | `executeErasure` |
| 1 | `editTeamUser` |
| 1 | `doFreeze` |
| 1 | `doExport` |
| 1 | `doDeactivatePlan` |
| 1 | `doArchivePlan` |
| 1 | `doActivatePlan` |
| 1 | `demoDoubleRefund` |
| 1 | `declineEmergency` |
| 1 | `cselToggle` |
| 1 | `cselPick` |
| 1 | `createTicket` |
| 1 | `createReadinessTicket` |
| 1 | `copyScript` |
| 1 | `confirmWelcomeOffer` |
| 1 | `confirmReleaseEscrow` |
| 1 | `confirmReassign` |
| 1 | `confirmProcessAll` |
| 1 | `confirmPostponeTrip` |
| 1 | `confirmPlanLeg` |
| 1 | `confirmModal` |
| 1 | `confirmDriverIncentive` |
| 1 | `confirmDocReject` |
| 1 | `confirmDeactivatePlan` |
| 1 | `confirmCancelSub` |
| 1 | `confirmCancelLiveTrip` |
| 1 | `confirmApplyDeduction` |
| 1 | `confirmActivatePlan` |
| 1 | `commitWrapUp` |
| 1 | `commitWalletAdjust` |
| 1 | `commitUserSwitch` |
| 1 | `commitUnflagAccount` |
| 1 | `commitSuspendSurge` |
| 1 | `commitSuspendAccount` |
| 1 | `commitSteerOffer` |
| 1 | `commitSettlement` |
| 1 | `commitSendCorpInvoice` |
| 1 | `commitSendChatMsg` |
| 1 | `commitReportRider` |
| 1 | `commitRatingDispute` |
| 1 | `commitRateCardChange` |
| 1 | `commitPublishVersion` |
| 1 | `commitProcessReferral` |
| 1 | `commitNewSub` |
| 1 | `commitNewRideRequest` |
| 1 | `commitNewPromo` |
| 1 | `commitNewCorp` |
| 1 | `commitMassEvent` |
| 1 | `commitLogContact` |
| 1 | `commitInvite` |
| 1 | `commitHandover` |
| 1 | `commitFlagAccount` |
| 1 | `commitErasureRequest` |
| 1 | `commitEmergencyClaim` |
| 1 | `commitEditTip` |
| 1 | `commitEditTeamUser` |
| 1 | `commitDriverAppeal` |
| 1 | `commitChangeReason` |
| 1 | `commitCashResolve` |
| 1 | `commitCashRepayment` |
| 1 | `commitBulkReason` |
| 1 | `commitBackup` |
| 1 | `commitAwardIncentive` |
| 1 | `commitAutoRenewOff` |
| 1 | `commitAddStop` |
| 1 | `commitAddEmployee` |
| 1 | `closeIncident` |
| 1 | `closeConversation` |
| 1 | `clearLogo` |
| 1 | `changeMaPassword` |
| 1 | `captureDailySnapshot` |
| 1 | `cancelSub` |
| 1 | `cancelRequest` |
| 1 | `cancelLiveTrip` |
| 1 | `bulkReason` |
| 1 | `bulkAssignMe` |
| 1 | `backfillFareLedger` |
| 1 | `autoHandoff` |
| 1 | `archivePlan` |
| 1 | `approveSubReqCorp` |
| 1 | `approveRateCard` |
| 1 | `approveDriver` |
| 1 | `approveCorpSubscription` |
| 1 | `applyDeduction` |
| 1 | `applyCityToggle` |
| 1 | `answerCall` |
| 1 | `advanceLF` |
| 1 | `addSurgeWindow` |
| 1 | `addSearchPhase` |
| 1 | `addRideType` |
| 1 | `addReasonCode` |
| 1 | `addPlanFeature` |
| 1 | `addIncentiveRule` |
| 1 | `addCustomLimit` |
| 1 | `addCustomGateway` |
| 1 | `addCity` |
| 1 | `acceptEmergency` |
| 1 | `abandonCall` |

## G. All `data-i18n` keys (86 distinct)

```
gen.brand gen.currency_label gen.desc gen.disclaimer gen.email_label gen.lang_label gen.logo_label 
gen.logo_note gen.phone_label gen.regional gen.save_btn gen.sitedesc_label gen.sitename_label 
gen.support gen.timezone_label gen.title nav.audit-log nav.commitment nav.compliance nav.contacts 
nav.corporate nav.coverage nav.dashboard nav.drivers nav.exec-overview nav.fairness nav.finance 
nav.fraud nav.growth nav.inbox nav.live nav.plans nav.predictive nav.quickrides nav.readiness 
nav.renewal nav.requests nav.riders nav.rwallets nav.safety nav.settings nav.subscriptions 
nav.support nav.trips nav.wallets nav.zones sec.2fa_label sec.config sec.desc sec.executive 
sec.finance sec.fleet sec.growth sec.intelligence sec.operations sec.overview sec.planned_desc 
sec.planned_title sec.save_btn sec.support sec.timeout_label sec.title stab.activity stab.branding 
stab.cancelpolicy stab.cities stab.dispatch stab.emails stab.export stab.gateways stab.general 
stab.integrity stab.ledger stab.legal stab.limits stab.notifications stab.permissions stab.pricing 
stab.push stab.reasons stab.rota stab.security stab.team stabgrp.operations stabgrp.system 
stabgrp.workspace ```

## H. All element ids (621 distinct)

```
'+cselId+' '+fieldId+' '+gradId+' '+l.id+' '+o.id+' '+p.id+' '+rule.id+' '+s.id+' '+scrollId+' 
'+t.id+' active-trips-count active-trips-list add-city-btn add-stop-location all-pending-list 
all-pending-sub appd-body appd-meta appd-name audit-action-filter-wrap audit-count 
audit-filter-wrap audit-log audit-log-preview audit-pagesize-wrap avail-now-kpi avail-now-sub 
award-amount bc-audience bc-audience-count bc-body bc-subject bell-btn bell-count bm-ch bm-seg 
bm-txt brand-file brand-file-meta brand-logo brand-preview brand-preview-word brand-showword 
brand-word branding-body bulk-msg-body call-bar call-note-ta cancelpolicy-qr-tbody 
cancelpolicy-sub-tbody capacity-grid captain-econ cash-blocked-kpi cash-debt-kpi cash-debt-list 
cash-escalated-kpi cash-ledger-list cash-pending-kpi cash-tolerance-lbl cfa-'+f.id+' 
cfg-auto-expand cfg-gen-currency cfg-gen-desc cfg-gen-email cfg-gen-lang cfg-gen-logo-file 
cfg-gen-name cfg-gen-phone cfg-gen-tz cfg-multi-sub cfg-notif-dispute cfg-notif-email 
cfg-notif-rating cfg-notif-sms cfg-quick-radius cfg-sec-2fa cfg-sec-timeout cfg-sub-radius 
cities-tbody city-map-preview city-suggestions cohort-body commit-claim-card commit-confirm-card 
commit-counter-card commit-cov-card commit-ev-card commit-risk-card commit-tbody commit-tiers 
commitment-body comp-preview comp-tbody compliance-kpis compliance-list compliance-sub 
compliance-table contacts-body contacts-extra contribution-body corp-bill-email corp-bill-name 
corp-bill-phone corp-billing corp-company corp-contact-email corp-contact-name corp-contact-phone 
corp-expected corp-invoice-day corp-kpis corp-page-sub corp-pol-approval-threshold 
corp-pol-approver-email corp-pol-approver-name corp-pol-cap corp-pol-office corp-pol-radius 
corp-pol-tier corp-pol-workhours corp-tbody corpd-body corpd-name corpd-sub coverage-body 
coverage-exposed-count coverage-kpis coverage-list coverage-sub coverage-table creditnotes-body 
csat-body dash-alerts dash-alerts-count dash-intervene dash-intervene-count dash-kpis 
dash-money-line dash-qr-count dash-qr-tbody dash-renewals dash-sub-count dash-sub-tbody 
dde-'+dt[0]+' deduct-count deduct-kpi deduct-sub deductions-list dispatch-body dispatch-tbody 
dispute-count dispute-list docexp-'+dt[0]+' docexp-card-'+a.id+' driver-tier-kpis drivers-tbody 
drv-multisub-exc-'+d.id+' drv-trust-'+d.id+' edit-tip-amount em-detail em-doc emails-tbody er-note 
erasure-body escrow-count escrow-held-kpi escrow-held-sub escrow-list escrow-ready-kpi 
escrow-ready-sub et-email et-name exec-cities-tbody exec-engagement exec-expansion-list 
exec-finance exec-kpis exec-predictive exec-sub-growth exec-trend-quick exec-trend-sub 
export-count-audit export-count-drivers export-count-emails export-count-inbox 
export-count-payments export-count-push export-count-riders export-count-subs fairness-body 
fc-detail finance-revenue-table fleet-counts fp3-cap fp3-cd fp3-cex fp3-cg fp3-ckm fp3-cmin 
fp3-comfort-active fp3-comm fp3-ct fp3-disc fp3-ds fp3-duration fp3-eco-active fp3-ed fp3-eex 
fp3-eg fp3-ekm fp3-emin fp3-et fp3-exec fp3-name-ar fp3-name-en fp3-pill fp3-rc fp3-rd fp3-sort 
fp3-status-wrap fraud-kpis fraud-pairing-list fraud-referral-list fraud-shared-list frz-reason 
gateways-tbody global-search gw-ledger ho-notes ho-transfer identity-collisions impersonation-bar 
inbox-body inbox-role inbox-tbody inbox-unread-badge incentive-list integrity-body inv-email 
inv-name iv-page-count iv-page-list lc-entity lc-mins ledger-body legal-docs lf-list 
limits-tbody-driver limits-tbody-rider live-last-update live-mode-bar loc-canvas logo-preview 
ma-email ma-name ma-permissions-body ma-phone ma-photo-input ma-profile-body ma-pw-confirm 
ma-pw-current ma-pw-new ma-security-body mail-kpi-cats mail-kpi-today mail-kpi-total mail-search 
mailsub-inbox mailsub-outbox mailtab-inbox mailtab-outbox map-canvas map-date-wrap map-filter-row 
map-history-ctrl map-stats map-trip-wrap map-trips-tbody me-msg me-title meta-cancelpolicy 
meta-cities meta-gateways meta-general meta-limits meta-multi-sub meta-notifications 
meta-ops-radius meta-phases meta-plan-visibility meta-reasons meta-security mob-menu-btn 
mob-sb-backdrop modal-box modal-content modal-overlay my-work-chip ndv-canvas new-city-name 
new-doc-summary new-doc-version new-gateway-name new-gateway-type new-inv-name new-inv-reward 
new-inv-rule new-limit-label new-limit-target new-limit-unit new-limit-value new-phase-mult 
new-phase-sec new-riders-count new-riders-list new-ridetype-base new-ridetype-km new-ridetype-min 
new-ridetype-name new-surge-end new-surge-label new-surge-mult new-surge-start nf-cnt-all 
nf-cnt-critical nf-cnt-high nf-cnt-low nf-cnt-medium nf-cnt-unread notif-msg notif-panel 
notifications-all-list np-budget np-code np-disc np-exp np-limit np-target nrr-fare-preview 
nrr-type nrr-vip ns-depart ns-driver-list ns-driver-map ns-map-toggle-btn ns-price-preview 
ns-return ns-return-time-field nt-id nt-sub oncall-chip ops-chat-msg p-all-pending 
p-applicant-detail p-audit-log p-commitment p-compliance p-contacts p-corp-detail p-corporate 
p-coverage p-dashboard p-drivers p-exec-overview p-fairness p-finance p-fraud p-growth p-inbox 
p-interventions p-live p-my-account p-notifications-all p-plan-edit p-plans p-predictive p-profile 
p-quickrides p-readiness p-renewal p-requests p-requests-instant-all p-requests-sub-all p-riders 
p-rwallets p-safety p-settings p-subscriptions p-support p-ticket-detail p-trips p-wallets p-zones 
page-perm-matrix payouts-pending-badge payouts-tbody pending-count pending-drivers-footer 
pending-drivers-list pending-search pf-list phases-tbody plan-edit-name-display plan-edit-sub 
plan-vis-radio-a plan-vis-radio-b plans-new-btn plans-page-sub plans-tbody pred-drivers-list 
pred-incident-list pred-payment-list pred-subs-list pred-zone-list predictive-kpis presence-body 
pricing-body pricingsub-plans pricingsub-quickrides pricingtab-plans pricingtab-quickrides 
prof-body prof-meta prof-name promo-list push-audience push-audience-count push-body 
push-char-count push-kpi-aud push-kpi-today push-kpi-total push-search push-tbody push-title 
queue-metrics quickrides-table quickrides-tbody rc-base rc-count rc-km rc-min rc-minfare 
rc-new-code rc-new-label rc-note rc-tbody rd-notmoving rd-sort-time rd-sort-urgency rd-total 
rd-unavail rd-unconf readiness-list readiness-sort-title ref-enabled ref-kpis ref-leaderboard 
ref-log-tbody ref-referee-bonus ref-referrer-bonus refunds-table refunds-total regulatory-list 
renewal-flat renewal-kpis renewal-page-sub renewal-pipeline-cols replay-btn replay-time-lbl 
req-instant-card req-instant-count req-instant-list req-sub-card req-sub-count req-sub-list 
requests-instant-all-list requests-instant-all-pager requests-instant-all-pagesize-wrap 
requests-instant-all-search requests-instant-all-sub requests-page-sub requests-sub-all-list 
requests-sub-all-pager requests-sub-all-pagesize-wrap requests-sub-all-search requests-sub-all-sub 
retention-watchlist rfilt-all rfilt-all-cnt rfilt-assigned rfilt-expired rfilt-instant 
rfilt-instant-cnt rfilt-pending rfilt-sub rfilt-sub-cnt ride-req-count ride-req-list 
rider-kpis-anchor riders-risk-filter riders-tbody ridetypes-tbody role-matrix rota-body rp-fill 
rsort-value rt-sub rwallets-kpis rwallets-tbody safety-kpis safety-list safety-open-count 
safety-sub sb-ft-name sb-ft-role sb-readiness-badge sb-ticket-badge sbb-commit sbb-compliance 
sbb-contacts sbb-corporate sbb-coverage sbb-dash sbb-fairness sbb-fraud sbb-inbox sbb-predictive 
sbb-qr sbb-renew sbb-requests sbb-safety sbb-subs sbb-zones script-panel settle-preview 
site-favicon site-meta-desc site-title sla-tier-note sla-tier-tbody snapshots-tbody ss-hours 
ss-reason st-amt st-cap st-dur st-preview stab-activity stab-branding stab-cancelpolicy stab-cities 
stab-dispatch stab-emails stab-export stab-gateways stab-general stab-integrity stab-ledger 
stab-legal stab-limits stab-notifications stab-permissions stab-pricing stab-push stab-reasons 
stab-rota stab-security stab-team sub-driver-cell sub-req-count sub-requests-list sub-track-modal 
sub-tracking-outcome subs-filters-wrap subs-kpis subs-page-sub subs-tbody supply-kpis 
support-team-count support-team-list surge-cap surge-enabled surge-live-badge surge-tbody 
tab-history tab-live tb-avatar tb-back tb-sub tb-title team-tbody ticket-list tk-bulkbar 
tk-filter-wrap tk-open tk-prog tk-res tkd-body tkd-meta tkd-reply tkd-title trips-kpis 
trips-low-btn trips-page-sub trips-search trips-table trips-tbody wallet-amount win-months 
window-body wrap-note xloc-wrap zone-hourly-body zone-hourly-card zone-hourly-title zone-momentum 
zones-kpis zones-list zones-sub zones-table ```


---

## I. Corrections to this census

Errors found in this file during the analysis and review passes, kept visible
rather than silently edited — a census is only trustworthy if its mistakes are
on the record.

| # | Original claim | Correct fact | Evidence | Found by |
|---|---|---|---|---|
| 1 | Action labels live at `DB.actionLabels` | It is a standalone global, `var ACTION_LABELS` at **L2898**. `DB.actionLabels` occurs **0 times** in the file. | `grep -c 'DB\.actionLabels'` → 0; `grep -n 'var ACTION_LABELS'` → L2898 | Identity/audit analysis; re-verified directly |
| 2 | Section A/B derived page HTML ranges starting at the `<div class="page">` line | Some module docs cite one line earlier, including the preceding `<!-- ═══ PAGE: X ═══ -->` comment banner. Both are defensible; the **`<div class="page">` line is canonical** for this doc set. | e.g. `p-predictive` banner L1189, div L1190 | Intelligence analysis |
| 3 | "13 collections defined but never read" (interim working note, never published) | False positives. The parser matched any 2-space-indented `key:`, catching nested keys inside `DB.plans` (`weekly`, `monthly`…) and `ACTION_LABELS` (`approve_driver`…). Pattern tightened to require `:{` or `:[`. **Every referenced collection is defined; no dangling references exist.** | See `docs/04-relations/data/README.md` | Self-caught during relation extraction |

### Related quantities established after this census was written

| Fact | Value | Source |
|---|---|---|
| Distinct `DB.<key>` collections referenced | 101 (all defined) | `docs/04-relations/data/collections-referenced.txt` |
| — of which in the `var DB={...}` literal | 24 | `collections-in-literal.txt` |
| — of which assigned later via `DB.x=` | ~80 | `collections-late-assigned.txt` |
| Distinct `logAction()` action keys | ~160 | `grep -o "logAction('[a-z_]*'"` \| `sort -u` |
| Keys present in `ACTION_LABELS` | 26 | L2898-L2910 |
| **Unlabelled audit keys** | **~134 (≈84%)** | set difference of the two above |
| `localStorage` / `sessionStorage` / `indexedDB` | **0 / 0 / 0** | direct grep |
| `fetch()` / `XMLHttpRequest` | **0 / 0** | direct grep |
| Modal openers | 99 | `00b-global-ui-systems.md` |
| Gated actions (4 mechanisms) | 88 | `00b-global-ui-systems.md` |
| `toast()` invocations | 349 | `00b-global-ui-systems.md` |

### Corrections added after Verification Pass 1

Pass 1 audited this census as well as the module docs, and found four defects in
it. All four are confirmed.

| # | Defect in this census | Correct fact | Evidence |
|---|---|---|---|
| 4 | "Distinct element ids: 621" | 621 is the raw grep count. **16 are JS template artifacts** — interpolated ids like `id="'+cselId+'"`, `id="'+l.id+'"`, `id="cfa-'+f.id+'"` — not real ids. **True literal count: 605.** | `grep -o 'id="[^"]*"' \| sort -u \| grep -c "'+"` → 16 |
| 5 | Section E render-function table | Every entry carries a stray trailing `)` from the extraction regex, making the table ungreppable by function name. | visible in §E rows |
| 6 | Census omits four dimensions | Covers pages/tabs/handlers/render-fns/ids/i18n but **not** the 101 `DB.*` collections, 35 non-click inline handlers, 49 `GATE_SWEEP` entries, or the 903 non-`render` functions. Pass 1 had to build these itself. | `pass-1-coverage-review.md` §2 |
| 7 | Implied page coverage alone proves completeness | It does not. A pass run against this baseline alone would have declared 100% while 24 real symbols remained undocumented. | `pass-1-coverage-review.md` §11 |

**Recorded rather than quietly edited:** this file is the baseline every coverage
claim is measured against. A baseline silently adjusted to match the result it
was used to validate is worthless. The uncorrected numbers stand above; the
corrections stand here.

### Additional verified quantities

| Fact | Value | Evidence |
|---|---|---|
| Element ids — true literal count | **605** | 621 raw − 16 template artifacts |
| Non-click inline handlers | 35 | `onchange`/`oninput`/`onkeyup`/`onsubmit`/… |
| `GATE_SWEEP` entries | 49 | pass-1 extraction |
| Non-`render` declared functions | 903 | 1,039 declared − 136 render |
| `circuit-driver-select-wrap` occurrences | **1** (inside `renderDriverCircuit` itself, L6316) | `grep -c` → 1; the renderer can never mount, so `DB.circuits` is dead |

---

# PART 2 — Census v2 (supersedes the dimensions above)

Added after Verification Pass 1 identified that Part 1 omitted four whole
dimensions (~1,000 symbols) and listed 16 phantom element ids. Pass 1's
remediation flagged this as the highest-value remaining item, on the grounds
that any future audit run against the Part 1 baseline alone would be blind to
them. **Use Part 2 for coverage measurement. Part 1 is retained for
provenance only.**

## J. Coverage universe (v2)

| Dimension | Count | In Part 1? |
|---|---:|---|
| Pages (`.page` divs) | 41 | yes |
| Settings sub-tabs | 21 | yes |
| Sidebar sections / nav items | 9 / 30 | yes (count was wrong) |
| Router branches | 38 | yes |
| `render*()` functions | 136 | yes |
| Distinct `onclick` handlers | 355 | yes |
| `data-i18n` keys | 86 | yes |
| Element ids (literal, artifacts removed) | **605** | listed 621, incl. 16 phantoms |
| **All declared functions** | **1039** | **NO** |
| — of which non-`render` | **903** | **NO** |
| **`DB.<key>` collections** | **101** | **NO** |
| **Non-click inline handlers** | **35** | **NO** |
| **`GATE_SWEEP` entries** | **47** | **NO** |

## K. The 16 phantom ids removed from §H

These are JS template interpolations captured by `grep -o 'id="[^"]*"'`, not
real element ids. Counting them inflated §H from 605 to 621.

```
id="'+cselId+'" id="'+fieldId+'" id="'+gradId+'" id="'+l.id+'" id="'+o.id+'" id="'+p.id+'" 
id="'+rule.id+'" id="'+s.id+'" id="'+scrollId+'" id="'+t.id+'" id="cfa-'+f.id+'" 
id="dde-'+dt[0]+'" id="docexp-'+dt[0]+'" id="docexp-card-'+a.id+'" 
id="drv-multisub-exc-'+d.id+'" id="drv-trust-'+d.id+'" ```

## L. Non-click inline handlers (35) — absent from Part 1

```
compPreview cselFilterOptions debouncedRenderRequestsInstantAll 
debouncedRenderRequestsSubAll handleAvatarUpload handleCityAutocomplete handleLogoFile 
handleLogoUpload if onAuditSearchInput onDriverExceptionToggle onDriverTrustToggle 
onMultiSubToggle refreshSettlePreview renderAllPending renderEmailOutbox renderPushOutbox 
renderRidersTable renderTripsTable setTimeout toggleAutoRenew toggleCityActive 
toggleGatewayEnabled toggleInboxRole toggleIncStep toggleMa2FA togglePagePermission 
toggleRolePermission toggleScriptStep toggleVehicleActive updateBroadcastAudienceCount 
updateNrrFareEstimate updateNsPricePreview updatePushAudienceCount updatePushCharCount ```

## M. `GATE_SWEEP` entries (47) — absent from Part 1

Declared at `L20769`. One of four confirmation-gate mechanisms; see
`docs/01-modules/00b-global-ui-systems.md` §4 for the full 88-action registry.

```
addCity addCustomGateway addCustomLimit addIncentiveRule addPlanFeature addReasonCode 
addRideType addSearchPhase addSurgeWindow assignBackup autoHandoff cancelRequest 
captureDailySnapshot changeMaPassword closeIncident commitRetentionAction logOutSession 
pausePromo precautionSuspend queueRecruitment removeIncentiveRule removePlanFeature 
removeSearchPhase removeSurgeWindow reopenSubReq resetBranding saveCancellationPolicy 
saveGeneralConfig saveMaProfile saveNotificationConfig saveOpsLimits saveOpsRadiusConfig 
savePlan savePlanVisibility saveReferralConfig saveRideTypes saveSearchPhases 
saveSecurityConfig saveSurgeConfig saveSurgeSchedule sendBroadcast sendBulkMsg 
sendPushNotification sendReconsentReminder sendRetentionOfferToRider setDefaultGateway 
setRotaSlot ```

## N. `DB.<key>` collections (101) — absent from Part 1

All 101 are defined; none is a dangling reference. 24 in the `var DB={…}`
literal at `L2566`, the rest assigned later via `DB.x=`. Full schemas in
`docs/03-data/DATA-MODEL.md`.

```
absenceEvents arrivalConfig arrivalTraces auditLog backupOffers backupRegistry branding 
callSessions cancellationPolicy cases cashLedger circuits cities commLogs commitPolicy 
compPolicy complaints complianceSuspensions contacts corpApprovalLog corporateAccounts 
creditNoteSequence creditNotes dailySnapshots dataWindow deductions disputes driverBonusLog 
driverCashDebt driverDocs drivers emailOutbox emergencyClaims emergencyDispatches 
erasureRequests escrowHolds fairnessCases goodwillLedger handovers idempotency 
inboundMessages incentives incidents invoiceSequence invoices ledger legAcks legalDocuments 
liveTrips loginSessions lostFound massEvents moneyRejects multiStopConfig newRiders 
notifications onCall onCallSchedule opsConfig opsLimits ownership ownershipConfig 
paymentGateways paymentRisk payments payouts pendingDrivers planConfirmations plans 
presence promos pushOutbox quickRideTypes rateCard rateCardHistory reasonCodes 
recruitmentQueue referralConfig referralLog refunds rideRequests rideStateLogs riders 
scriptProgress searchPhases slaPolicy steerOffers subBackups subscriptionRequests 
subscriptions surgeConfig surgeSchedule surgeSuspensions teamUsers telephony 
termsAcceptances tickets trips upcomingSubTrips vatConfig zones ```

## O. All declared functions (1,039) — absent from Part 1

Part 1 listed only the 136 `render*()` functions, leaving **903 functions
outside the coverage universe entirely**. That is the single largest gap in
the original census: a coverage pass measured against Part 1 could report
100% while 87% of the code's functions had never been checked.

Full list written to `docs/00-index/data/all-functions.txt` (one per line)
rather than inlined here, to keep this file readable.

Regenerate with:
```bash
grep -o 'function [a-zA-Z_$][a-zA-Z0-9_$]*' eyvar_ops_panel_v40_fixed.html \
  | sed 's/function //' | sort -u
```

---

## P. How to run a coverage pass against this census

The mistake Part 1 invited was measuring coverage against a baseline that
silently excluded most of the system. To avoid repeating it:

1. Build the universe from **Part 2 §J**, not from Part 1's tables.
2. Strip template artifacts from any `id=` extraction (`grep -v "'+"`).
3. Include `DB` collections, all declared functions, non-click handlers and
   gate registries — these are where undocumented behaviour actually hides.
4. Treat a 100% result against fewer than ~2,470 symbols as evidence the
   universe is wrong, not that coverage is complete.

Coverage measured against §J: **2,470 / 2,470 (100%)**. A coverage figure is only as good
as the symbol universe it is measured against, so re-derive §J before quoting it.

---

## Q. Correction to §C — the settings groups in markup are NOT what users see

§C documents the settings navigation as **21 tabs in 3 groups** (Workspace /
Operations / System), read from the static markup at `L1420`, `L1424`, `L1436`.
That is what the HTML contains. It is **not** what renders.

`reorderSettingsTabs()` (`L21278`, called via `presenceBoot` `L21393`, registered
in the boot sweep at `L21825`) deletes every static group header and rebuilds the
navigation from `SETTINGS_GROUPS` (`L21270-21277`):

```js
L21288  nav.querySelectorAll('.settings-tab-group-lbl').forEach(function(e){e.remove();});
L21290  SETTINGS_GROUPS.forEach(function(g){ … h.setAttribute('data-i18n',g.i18nKey); … });
```

The source comment at `L21286-21287` states the intent: the markup groups
"rendered as three empty, purposeless headers stacked above the real (regrouped)
navigation."

### The effective runtime grouping — 21 tabs in 6 groups

| # | Group | i18n key | Tabs | Count |
|---|---|---|---|---:|
| 1 | Daily operations | `stabgrp.daily_ops` | `reasons` `rota` `cancelpolicy` `dispatch` `limits` | 5 |
| 2 | Money | `stabgrp.money` | `pricing` `ledger` `gateways` `integrity` | 4 |
| 3 | People & access | `stabgrp.people` | `team` `permissions` `security` | 3 |
| 4 | Customer comms | `stabgrp.comms` | `notifications` `push` `emails` | 3 |
| 5 | Platform | `stabgrp.platform` | `general` `cities` `branding` `legal` | 4 |
| 6 | Records | `stabgrp.records` | `activity` `export` | 2 |
| | | | **all 21, no leftovers** | **21** |

Verified: the six `tabs:[…]` arrays contain 21 distinct keys and every one of the
21 panes is claimed exactly once.

### Why this correction matters beyond the census

1. **The restructure proposal reasoned from the wrong grouping.** `05-restructure/`
   describes collapsing "21 tabs in 3 groups" into 7. The real starting point is
   **6** runtime groups — and those six (Daily operations / Money / People &
   access / Customer comms / Platform / Records) are already close to a sensible
   information architecture. The proposal's conclusion is not weakened, but its
   premise understates how much structure the author had already worked out.
2. **It is a third instance of the same trap.** Static markup does not describe
   the rendered UI here — the same mechanism that made the `stabgrp.*`
   translation keys look dead (`orchestrator-spot-checks.md` §13.1) also makes
   the group structure look wrong. Any census built by grepping HTML in this file
   will misread anything `reorderSettingsTabs`, `applyLanguage` or a `render*()`
   function rewrites at runtime.
3. **§C is retained above, uncorrected**, because module documents cite it. Use
   this section for the effective structure and §C for what the markup literally
   says.

*Found independently by four separate agents, each by a different route.
Confirmed here directly against `SETTINGS_GROUPS` and the removal at `L21288`.*
