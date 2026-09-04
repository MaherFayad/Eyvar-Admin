# Endpoint index

**Generated. Do not edit.** Regenerate with
`python scripts/extract-api-contract.py`.

The source of truth is the docblock above each exported function in
`src/data/clients/`. If a row here is wrong, the docblock is wrong: fix the
client and regenerate. Conventions, envelopes, auth and error shapes live in
[CONTRACT.md](CONTRACT.md); this file is only *what exists*.

**316 endpoints across 47 client modules.**

## `src/data/clients/alerts.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/alerts` | `Paginated<AlertRule>` | `q · filters[state] · page · pageSize` | - | `listAlertRules()` |
| POST | `/api/v1/alerts` | `Single<AlertRule>` | `SaveAlertInput` | - | `saveAlertRule()` |
| DELETE | `/api/v1/alerts/:id` | `204` | - | - | `deleteAlertRule()` |
| GET | `/api/v1/alerts/:id` | `Single<AlertRule>` | - | - | `getAlertRule()` |
| PATCH | `/api/v1/alerts/:id` | `Single<AlertRule>` | `SaveAlertInput` | - | `saveAlertRule()` |
| POST | `/api/v1/alerts/:id/evaluate` | `AlertEvaluation` | - | - | `evaluateAlertRule()` |
| GET | `/api/v1/alerts/:id/history` | `Paginated<AlertFiring>` | `page · pageSize` | - | `listAlertFirings()` |

## `src/data/clients/applicants.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/applications` | `Paginated<Applicant>` | `q · status · page · pageSize · sort · filter ·` | - | `listApplicants()` |
| GET | `/api/v1/applications/:id` | `Applicant` | - | - | `getApplicant()` |
| POST | `/api/v1/applications/:id/approve` | `Applicant  (with `approvedDriverId` set to the new `DRV-*` record)` | - | **403** without `approve_drivers`<br>**422** when a required document is not verified | `approveApplicant()` |
| POST | `/api/v1/applications/:id/claim` | `Applicant` | `{ takeOver?: boolean }` | **409** when another operator holds it and `takeOver` was not sent | `claimApplicant()` |
| POST | `/api/v1/applications/:id/documents/:type/reject` | `Applicant` | `{ code }` | - | `rejectApplicantDocument()` |
| POST | `/api/v1/applications/:id/documents/:type/request-reupload` | `Applicant` | - | - | `requestApplicantDocumentReupload()` |
| POST | `/api/v1/applications/:id/documents/:type/verify` | `Applicant` | - | **422** when nothing has been uploaded | `verifyApplicantDocument()` |
| POST | `/api/v1/applications/:id/reject` | `Applicant` | `{ reason: string }` | **422** when `reason` is empty — a rejection with no stated reason is not appealable | `rejectApplicant()` |
| POST | `/api/v1/applications/:id/release` | `Applicant` | - | - | `releaseApplicant()` |
| GET | `/api/v1/applications/documents/:documentId/file` | `bytes, or 204 for no upload on record` | - | **403** without `approve_drivers` | `getApplicationDocumentFile()` |
| GET | `/api/v1/applications/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getApplicantFacets()` |

## `src/data/clients/assurance.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/assurance/absences` | `Paginated<AbsenceEvent>` | `q · driverId · page · pageSize · sort · filter ·` | - | `listAbsences()` |
| POST | `/api/v1/assurance/absences/:id/waive` | `AbsenceEvent` | `{ reason: string }` | **422** when `reason` is empty | `waiveAbsence()` |
| GET | `/api/v1/assurance/trips` | `Paginated<AssuranceTrip>` | `q · subscriptionId · page · pageSize · sort · filter ·` | - | `listAssuranceTrips()` |
| GET | `/api/v1/assurance/trips/:id` | `AssuranceTrip` | - | - | `getAssuranceTrip()` |
| POST | `/api/v1/assurance/trips/:id/acknowledge` | `AssuranceTrip` | `{ source: 'app' \| 'phone' \| 'whatsapp' \| 'assumed', note?: string }` | **422** when `source === 'assumed'` and no note is given | `acknowledgeLeg()` |
| POST | `/api/v1/assurance/trips/:id/backup-offer` | `AssuranceTrip` | `{ driverId: string }` | **409** when an offer is already outstanding | `offerBackup()` |
| POST | `/api/v1/assurance/trips/:id/claim` | `AssuranceTrip` | `{ takeOver?: boolean }` | **404** when the trip does not exist<br>**409** when another operator holds it | `claimAssuranceTrip()` |
| POST | `/api/v1/assurance/trips/:id/release` | `AssuranceTrip` | - | **404** when the trip does not exist | `releaseAssuranceTrip()` |
| GET | `/api/v1/assurance/trips/facets` | `Facets` | `view` | - | `getAssuranceFacets()` |

## `src/data/clients/audit.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/audit` | `Paginated<AuditEntry>, newest-first` | `subjectType · subjectId · action · page · pageSize` | - | `listAuditEntries()` |

## `src/data/clients/auth.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/activate` | `ResetPasswordOutcome` | `{ token, password }` | - | `activateInvite()` |
| POST | `/api/v1/auth/enroll-second-factor` | `SignInOutcome   (a `challenge`, because enrolment confirms with a code)` | `{ enrolmentToken, method: 'sms' \| 'totp', destination }` | - | `enrollSecondFactor()` |
| POST | `/api/v1/auth/reauthenticate` | `ReauthenticateOutcome` | `{ password }        ← and **nothing else**` | - | `reauthenticate()` |
| POST | `/api/v1/auth/request-password-reset` | `RequestPasswordResetOutcome   — always `{ kind: 'accepted' }`` | `{ email }` | - | `requestPasswordReset()` |
| POST | `/api/v1/auth/resend-code` | `ResendCodeOutcome   { sent | cooling-down | failed }` | `{ challengeId }` | - | `resendCode()` |
| POST | `/api/v1/auth/reset-password` | `ResetPasswordOutcome` | `{ token, password }` | - | `resetPassword()` |
| GET | `/api/v1/auth/reset-token/:token` | `ValidateTokenOutcome   { state, email, purpose }` | - | - | `validateResetToken()` |
| POST | `/api/v1/auth/sign-in` | `SignInOutcome   { challenge | enrolment-required | failed }` | `{ email, password, rememberDevice?: boolean }` | **429** with `Retry-After` when the transport rate-limits | `signIn()` |
| POST | `/api/v1/auth/sign-out` | `{ signedOut: true }` | - | - | `signOut()` |
| POST | `/api/v1/auth/sign-out-everywhere` | `{ sessionsEnded: number }` | - | - | `signOutEverywhere()` |
| POST | `/api/v1/auth/totp-secret` | `TotpEnrolment   { secret, otpauthUri, enrolmentToken }` | `{ enrolmentToken }` | - | `beginTotpEnrolment()` |
| POST | `/api/v1/auth/verify-code` | `VerifyCodeOutcome   { signed-in | failed }` | `{ challengeId, code, rememberDevice?: boolean }` | - | `verifyCode()` |
| GET | `/api/v1/me/devices` | `{ items: DeviceSession[] }` | - | - | `listDevices()` |
| DELETE | `/api/v1/me/devices/:deviceId` | `{ revoked: true }` | - | - | `revokeDevice()` |
| POST | `/api/v1/me/devices/:deviceId/trust` | `DeviceSession` | `{ trusted: boolean }` | - | `setDeviceTrust()` |

## `src/data/clients/cash.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/captain-debts` | `Paginated<CaptainDebt>` | `q · page · pageSize · sort · filter · view=all\|over-cap\|in-credit` | - | `listCaptainDebts()` |
| POST | `/api/v1/captain-debts/:captainId/repayment` | `CaptainDebt` | `{ amountHalalas, reasonCode }` | **422** on a non-positive amount or an amount above the balance | `recordCashRepayment()` |
| GET | `/api/v1/cash-reports` | `Paginated<CashReport>` | `q · page · pageSize · sort · filter ·` | - | `listCashReports()` |
| GET | `/api/v1/cash-reports/:id` | `CashReport` | - | - | `getCashReport()` |
| POST | `/api/v1/cash-reports/:id/claim` | `CashReport` | `{ takeOver?: boolean }  ·  409 when another operator holds it` | - | `claimCashReport()` |
| POST | `/api/v1/cash-reports/:id/decide` | `CashReport` | `{ disposition: 'resolve' \| 'escalate', reasonCode }` | **409** when already decided  ·  422 without a reason code | `decideCashReport()` |
| POST | `/api/v1/cash-reports/:id/release` | `CashReport` | - | - | `releaseCashReport()` |
| GET | `/api/v1/cash-reports/facets` | `Facets` | `view` | - | `getCashFacets()` |
| GET | `/api/v1/ledgers/ar.driver/:captainId` | `Ledger` | `from · to · page · pageSize` | - | `getCaptainDebtLedger()` |

## `src/data/clients/catalogue.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/catalogue/dimensions` | `Paginated<Dimension>` | `page · pageSize` | - | `listDimensions()` |
| GET | `/api/v1/catalogue/measures` | `Paginated<Measure>` | `q · category · pairableWith · page · pageSize` | - | `listMeasures()` |

## `src/data/clients/complaints.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/complaints` | `Paginated<Complaint>` | `q · category · severity · status · driverId · riderId ·` | - | `listComplaints()` |
| GET | `/api/v1/complaints/:id` | `Complaint` | - | **404** naming the id (§9.2 `overlay-not-found`). | `getComplaint()` |
| POST | `/api/v1/complaints/:id/claim` | `Complaint` | `{ takeOver?: boolean }  ·  409 when another operator holds it` | - | `claimComplaint()` |
| POST | `/api/v1/complaints/:id/release` | `Complaint` | - | - | `releaseComplaint()` |
| POST | `/api/v1/complaints/:id/resolve` | `Complaint` | `{ outcome, compensationHalalas, note }` | **403** without the support disposition permission<br>**409** when the complaint is already disposed<br>**422** when `dismissed` carries compensation, or compensation is not a | `resolveComplaint()` |
| GET | `/api/v1/complaints/count` | `{ count, ids }` | `driverId` | - | `countOpenComplaints()` |
| GET | `/api/v1/complaints/facets` | `Facets` | `view` | - | `getComplaintFacets()` |

## `src/data/clients/conversations.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/conversations` | `Paginated<Conversation>` | `q · channel · status · ticketId · page · pageSize · sort · filter ·` | - | `listConversations()` |
| GET | `/api/v1/conversations/:id` | `Conversation` | - | **404** naming the id | `getConversation()` |
| POST | `/api/v1/conversations/:id/claim` | `Conversation` | `{ takeOver?: boolean }` | **409** `claimed_by_other` when another operator holds it and `takeOver` was | `claimConversation()` |
| POST | `/api/v1/conversations/:id/close` | `Conversation` | `{ reason: ConversationCloseReason }` | **409** when already closed — closing twice would restamp `closedAt` and lose | `closeConversation()` |
| GET | `/api/v1/conversations/:id/messages` | `Paginated<Message>` | `page · pageSize` | - | `listConversationMessages()` |
| POST | `/api/v1/conversations/:id/messages` | `Message` | `{ body: string, visibility: 'customer' \| 'internal' }` | **422** when `body` is empty<br>**409** when the conversation is closed | `replyConversation()` |
| POST | `/api/v1/conversations/:id/messages/:messageId/retry` | `Message   (the **same** message, with a fresh delivery attempt)` | - | **404** naming the conversation, or the message inside it<br>**409** `conversation_closed`<br>**409** `retry_refused` when the message's current delivery is not `failed` — | `retryMessage()` |
| POST | `/api/v1/conversations/:id/release` | `Conversation` | - | - | `releaseConversation()` |
| POST | `/api/v1/conversations/:id/reopen` | `Conversation` | - | **409** `conversation_not_closed` — reopening an open conversation would | `reopenConversation()` |
| POST | `/api/v1/conversations/:id/ticket` | `{ conversation: Conversation, ticket: Ticket }` | `{ subject?, category, reasonCode, priority }` | **409** `ticket_exists` when this conversation already has one<br>**422** `entity_not_ticketable` for an entity `Ticket` cannot describe | `createTicketForConversation()` |
| POST | `/api/v1/conversations/:id/transfer` | `Conversation` | `{ toUserId: string, note?: string }` | **422** when `toUserId` is not an operator<br>**409** when the conversation is closed | `transferConversation()` |
| POST | `/api/v1/conversations/:id/typing` | `204` | `{ typing: boolean }` | - | `sendTypingIndicator()` |
| GET | `/api/v1/conversations/facets` | `Facets` | `view` | - | `getConversationFacets()` |
| GET | `/api/v1/presence/agents` | `AgentPresence[]` | - | - | `listAgentPresence()` |
| PUT | `/api/v1/presence/me` | `AgentPresence` | `{ state: 'online' \| 'away' \| 'offline' }` | - | `setMyPresence()` |

## `src/data/clients/corporateAccounts.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/corporate-accounts` | `Paginated<CorporateAccount>` | `q · status · page · pageSize · sort · filter · view=all\|overdue` | - | `listCorporateAccounts()` |
| POST | `/api/v1/corporate-accounts` | `CorporateAccount   (status `Pending`, empty `riderIds`)` | `CreateCorporateAccountInput` | **422** when company name, contact name or contact email is missing | `createCorporateAccount()` |
| GET | `/api/v1/corporate-accounts/:id` | `CorporateAccount` | - | - | `getCorporateAccount()` |
| POST | `/api/v1/corporate-accounts/:id/employees` | `CorporateAccount` | `{ riderId: string }` | **409** when the rider is already covered by another account | `addCorporateEmployee()` |
| DELETE | `/api/v1/corporate-accounts/:id/employees/:riderId` | `CorporateAccount` | - | **404** when the account does not exist<br>**422** `rider_not_linked` when the rider is not on this account<br>**409** `unbilled_spend` when the rider has spend the open invoice has not billed | `removeCorporateEmployee()` |
| POST | `/api/v1/corporate-accounts/:id/invoice` | `CorporateAccount  (with `lastInvoiceGeneratedAt` and `nextInvoiceOn` moved)` | - | **404** when the account does not exist<br>**409** `account_not_active` when the account is pending or suspended<br>**422** `prepaid_account` when the account is not invoiced at all<br>**422** `no_billable_spend` when there is nothing to invoice | `sendCorporateInvoice()` |
| PATCH | `/api/v1/corporate-accounts/:id/usage-policy` | `CorporateAccount` | `Partial<CorporateUsagePolicy>` | - | `updateCorporateUsagePolicy()` |
| GET | `/api/v1/corporate-accounts/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getCorporateFacets()` |

## `src/data/clients/dashboards.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/dashboards` | `Paginated<Dashboard>` | `q · page · pageSize` | - | `listDashboards()` |
| POST | `/api/v1/dashboards` | `Single<Dashboard>` | `{ name, tiles }` | - | `saveDashboard()` |
| DELETE | `/api/v1/dashboards/:id` | `204` | - | - | `deleteDashboard()` |
| GET | `/api/v1/dashboards/:id` | `Single<Dashboard>` | - | - | `getDashboard()` |
| PATCH | `/api/v1/dashboards/:id` | `Single<Dashboard>` | `{ name, tiles }` | - | `saveDashboard()` |

## `src/data/clients/dispatch.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/dispatch/interventions` | `Intervention[]` | `status` | - | `listInterventions()` |
| POST | `/api/v1/dispatch/interventions/:id/acknowledge` | `Intervention` | `{ note: string \| null }` | **404** when the id does not exist<br>**409** `already_acknowledged` when somebody has already taken it | `acknowledgeIntervention()` |
| POST | `/api/v1/dispatch/interventions/:id/reassign` | `Intervention` | `{ driverId: string }` | **404** when the intervention or the captain does not exist<br>**422** `driver_unavailable` when the captain is not online and free<br>**422** `same_driver` when the captain named is the one already on the trip | `reassignIntervention()` |
| GET | `/api/v1/dispatch/telemetry` | `DispatchTelemetry` | `none — the server scopes to the caller's cities` | - | `getDispatchTelemetry()` |

## `src/data/clients/disputes.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/disputes` | `Paginated<Dispute>` | `QueryParams + status · kind · claimantType` | - | `listDisputes()` |
| GET | `/api/v1/disputes/:id` | `Dispute` | - | **404** when the id does not exist | `getDispute()` |
| POST | `/api/v1/disputes/:id/claim` | `Dispute` | `{ userId, takeOver }` | **404** when the id does not exist<br>**409** `already_resolved` when the dispute is resolved<br>**409** `claimed_by_other` when another operator holds it and `takeOver` is unset | `claimDispute()` |
| POST | `/api/v1/disputes/:id/release` | `Dispute` | - | **404** when the id does not exist<br>**409** `already_resolved` when the dispute is resolved | `releaseDispute()` |
| POST | `/api/v1/disputes/:id/resolve` | `{ dispute, refund }` | `{ outcome, refundHalalas, note }` | **409** when the dispute is already resolved<br>**422** on an amount that contradicts the outcome<br>**403** when a goodwill credit is above the operator's authority (`adjustWallet`) | `resolveDispute()` |
| GET | `/api/v1/disputes/facets` | `Facets — field name -> [{ value, count }], count-descending` | - | - | `getDisputeFacets()` |
| GET | `/api/v1/lost-found` | `Paginated<LostFoundItem>` | `{ disputeId: dispute.id },` | - | `listLostFound()` |
| GET | `/api/v1/lost-found/:id` | `LostFoundItem` | - | **404** when the id does not exist | `getLostFoundItem()` |
| POST | `/api/v1/lost-found/:id/advance` | `LostFoundItem` | - | **409** when the item is already returned<br>**422** when the next step needs a captain and the report has none | `advanceLostFoundItem()` |

## `src/data/clients/drivers.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/compliance/documents/:documentId/file` | `the bytes, with Content-Type: image/jpeg | image/png | application/pdf` | - | **204** when the document exists and holds no file — NOT an error, and the common case<br>**403** when the operator lacks view_operations or view_profiles<br>**404** when no document has that id<br>**502** when the store returns a media type this app cannot decode | `getComplianceDocumentFile()` |
| GET | `/api/v1/compliance/drivers` | `Paginated<DriverCompliance>` | `q · page · pageSize · sort · filter · view=compliance\|needs-attention` | - | `listDriverCompliance()` |
| GET | `/api/v1/compliance/drivers/:driverId` | `DriverCompliance` | - | **404** when the captain has no compliance record | `getDriverCompliance()` |
| GET | `/api/v1/compliance/drivers/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getDriverComplianceFacets()` |
| GET | `/api/v1/drivers` | `Paginated<Driver>` | `q · status · page · pageSize · sort=<field>:<dir> · filter=<field>:<op>:<value>` | - | `listDrivers()` |
| GET | `/api/v1/drivers/:id` | `Driver` | - | **404** when the id does not exist | `getDriver()` |
| GET | `/api/v1/drivers/:id/movements` | `DriverMoneyMovements` | - | **404** when the captain does not exist | `getDriverMoneyMovements()` |
| POST | `/api/v1/drivers/:id/reinstate` | `Driver` | - | - | `reinstateDriver()` |
| GET | `/api/v1/drivers/:id/support` | `DriverSupportPresence` | - | **404** when the captain does not exist | `getDriverSupportPresence()` |
| POST | `/api/v1/drivers/:id/suspend` | `Driver` | `{ reason: string }` | - | `suspendDriver()` |
| GET | `/api/v1/drivers/:id/timeline` | `Paginated<DriverTimelineEvent> — newest first` | `page · pageSize · sort · filter (kind, at)` | **404** when the captain does not exist | `getDriverTimeline()` |
| GET | `/api/v1/drivers/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getDriverFacets()` |

## `src/data/clients/emails.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/email/deliveries` | `Paginated<EmailDelivery>, newest first` | `view=outbox\|inbox\|all · q · state · templateKey · sort · page · pageSize` | - | `listEmailDeliveries()` |
| POST | `/api/v1/email/deliveries/:id/resend` | `EmailDelivery — **the new row**, queued` | - | - | `resendEmailDelivery()` |
| GET | `/api/v1/email/identities` | `Paginated<SenderIdentity>, default first` | `q · verification · page · pageSize` | - | `listSenderIdentities()` |
| POST | `/api/v1/email/identities/:id/default` | `SenderIdentity[]` | - | - | `setDefaultSenderIdentity()` |
| POST | `/api/v1/email/identities/:id/verify` | `SenderIdentity` | - | - | `requestSenderVerification()` |
| GET | `/api/v1/email/templates` | `Paginated<EmailTemplate>` | `q · key · locale · status · page · pageSize` | - | `listEmailTemplates()` |
| GET | `/api/v1/email/templates/:id` | `EmailTemplate` | - | - | `getEmailTemplate()` |
| PUT | `/api/v1/email/templates/:id` | `EmailTemplate` | `draft + `confirmInUse`` | - | `saveEmailTemplate()` |
| POST | `/api/v1/email/templates/:id/preview` | `EmailTemplatePreview` | `the unsaved draft, or nothing for the saved template` | - | `previewEmailTemplate()` |
| POST | `/api/v1/email/templates/:id/validate` | `EmailTemplateValidation` | - | - | `validateEmailTemplate()` |
| GET | `/api/v1/email/templates/coverage` | `EmailTemplateCoverage[]` | - | - | `listEmailTemplateCoverage()` |
| GET | `/api/v1/messaging/templates` | `Paginated<MessagingTemplate>` | - | - | `listMessagingTemplates()` |
| GET | `/api/v1/push/audiences` | `PushAudience[]` | - | - | `listPushAudiences()` |
| GET | `/api/v1/push/broadcasts` | `Paginated<PushBroadcast>, newest first` | - | - | `listPushBroadcasts()` |
| POST | `/api/v1/push/broadcasts` | `PushBroadcast` | - | - | `sendPushBroadcast()` |

## `src/data/clients/fairness.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/fairness-cases` | `Paginated<FairnessCase>` | `q · kind · status · page · pageSize · sort · filter ·` | - | `listFairnessCases()` |
| GET | `/api/v1/fairness-cases/:id` | `FairnessCase` | - | - | `getFairnessCase()` |
| POST | `/api/v1/fairness-cases/:id/claim` | `FairnessCase` | `{ takeOver?: boolean }  ·  409 when another operator holds it` | - | `claimFairnessCase()` |
| POST | `/api/v1/fairness-cases/:id/decide` | `FairnessCase` | `{ outcome: 'upheld' \| 'overturned', rationale: string }` | **403** without `approve_drivers`<br>**409** when the case is already decided<br>**422** when `rationale` is empty | `decideFairnessCase()` |
| POST | `/api/v1/fairness-cases/:id/release` | `FairnessCase` | - | - | `releaseFairnessCase()` |
| GET | `/api/v1/fairness-cases/facets` | `Facets` | `view` | - | `getFairnessFacets()` |

## `src/data/clients/financialsOverview.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/financials/overview` | `FinancialsOverview` | `from · to` | - | `getFinancialsOverview()` |

## `src/data/clients/integrations.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/integrations/api-keys` | `Paginated<ApiKey>, newest first` | `q · state · sort · page · pageSize` | - | `listApiKeys()` |
| POST | `/api/v1/integrations/api-keys` | `ApiKeyIssueResult — **the only response in the product that carries a` | `IssueApiKeyInput` | - | `issueApiKey()` |
| POST | `/api/v1/integrations/api-keys/:id/revoke` | `ApiKey` | - | - | `revokeApiKey()` |
| POST | `/api/v1/integrations/api-keys/:id/rotate` | `ApiKeyIssueResult — a new secret, once, for the **same** key` | - | - | `rotateApiKey()` |
| GET | `/api/v1/integrations/webhook-deliveries` | `Paginated<WebhookDelivery>, newest first` | `q · endpointId · state · event · sort · page · pageSize` | - | `listWebhookDeliveries()` |
| POST | `/api/v1/integrations/webhook-deliveries/:id/replay` | `WebhookDelivery — **the new row**, pending` | - | - | `replayWebhookDelivery()` |
| GET | `/api/v1/integrations/webhooks` | `WebhookEndpoint[]` | - | - | `listWebhookEndpoints()` |
| POST | `/api/v1/integrations/webhooks` | `WebhookEndpointCreateResult — endpoint plus the signing secret, once` | `WebhookEndpointDraft` | - | `createWebhookEndpoint()` |
| PATCH | `/api/v1/integrations/webhooks/:id` | `WebhookEndpoint` | `Partial<WebhookEndpointDraft> & { state? }` | - | `updateWebhookEndpoint()` |
| POST | `/api/v1/integrations/webhooks/:id/rotate-secret` | `IssuedSecret — once` | - | - | `rotateWebhookSecret()` |

## `src/data/clients/integrity.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/integrity/checks` | `IntegrityCheck[]` | `{` | - | `listIntegrityChecks()` |
| POST | `/api/v1/integrity/runs` | `IntegrityRun` | `{ checkIds?: IntegrityCheckId[] }` | - | `runIntegrityChecks()` |

## `src/data/clients/ledger.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/gateways` | `PaymentGateway[]` | `from · to` | - | `listGateways()` |
| POST | `/api/v1/gateways/:id/default` | `PaymentGateway[]` | - | **409** when the gateway is disabled | `setDefaultGateway()` |
| POST | `/api/v1/gateways/:id/enabled` | `PaymentGateway` | `{ enabled: boolean }` | **409** when disabling the default gateway | `setGatewayEnabled()` |
| GET | `/api/v1/invoice-sequence` | `InvoiceSequence` | - | - | `getInvoiceSequence()` |
| GET | `/api/v1/ledger/idempotency` | `IdempotencyStats` | - | - | `getIdempotencyStats()` |
| GET | `/api/v1/ledger/journal` | `Paginated<JournalEntry>` | `page · pageSize` | - | `listJournalEntries()` |
| GET | `/api/v1/ledger/reconciliation` | `ReconciliationRow[]` | - | - | `listReconciliation()` |
| GET | `/api/v1/ledger/refused` | `RefusedPosting[]` | - | - | `listRefusedPostings()` |
| GET | `/api/v1/ledger/trial-balance` | `TrialBalance` | `from · to` | - | `getTrialBalance()` |
| GET | `/api/v1/ledgers/:account/:subjectId` | `Ledger` | `from · to · page · pageSize` | - | `getLedger()` |
| GET | `/api/v1/postings/:id` | `LedgerPosting` | - | - | `getPosting()` |
| POST | `/api/v1/postings/:id/reverse` | `{ original: LedgerPosting, reversal: LedgerPosting | null }` | `{ reasonCode, note }` | **409** when already reversed  ·  422 without a reason code | `reversePosting()` |
| GET | `/api/v1/vat-config` | `VatConfig` | - | - | `getVatConfig()` |

## `src/data/clients/metrics.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/metrics` | `Paginated<Metric>` | `null,` | - | `listMetrics()` |
| GET | `/api/v1/metrics/:key/series` | `TimeSeries  { current, comparison | null }` | `from · to · compare=previous-period\|none` | **404** when the metric has no series. A metric tile without a chart is normal | `getMetricSeries()` |
| GET | `/api/v1/metrics/boards/:subTabId` | `MetricBoard  { subTabId, asOf, metrics[], charts[], breakdowns[], notices[] }` | `from · to   (the §3.7 date-range chip, both `YYYY-MM-DD`, both or neither)` | **404** when the sub-tab has no board, which is every sub-tab with a table. That | `getMetricBoard()` |
| GET | `/api/v1/metrics/facets` | `Facets — powers the metrics-library sidebar's category grouping` | `view` | - | `getMetricFacets()` |

## `src/data/clients/myWork.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/work-items` | `Paginated<WorkItem>` | `q · queue · includeOtherRoles · page · pageSize · sort · filter ·` | - | `listWorkItems()` |
| GET | `/api/v1/work-items/facets` | `Facets` | `view` | - | `getWorkFacets()` |

## `src/data/clients/navCounts.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/nav/counts` | `NavCounts` | `none — the server scopes to the caller's permissions` | - | `getNavCounts()` |

## `src/data/clients/notifications.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/notifications` | `Paginated<Notification>` | `filter=all\|unread\|<type> · page · pageSize` | - | `listNotifications()` |
| POST | `/api/v1/notifications/:id/read` | `Notification` | - | - | `markNotificationRead()` |
| POST | `/api/v1/notifications/read-all` | `NotificationSummary` | - | - | `markAllNotificationsRead()` |
| GET | `/api/v1/notifications/summary` | `NotificationSummary` | - | - | `getNotificationSummary()` |
| GET | `/api/v1/notifications?pageSize=8` | `Paginated<Notification>` | - | - | `previewNotifications()` |

## `src/data/clients/onboarding.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/me/onboarding` | `OnboardingChecklist  { steps[], state, counts }` | `userId  (omit for the caller; another operator's needs `manage_team`)` | - | `getOnboarding()` |
| POST | `/api/v1/me/onboarding/auto-opened` | `OnboardingChecklist` | - | - | `markOnboardingAutoOpened()` |
| POST | `/api/v1/me/onboarding/dismiss` | `OnboardingChecklist` | - | - | `dismissOnboarding()` |
| POST | `/api/v1/me/onboarding/restart` | `OnboardingChecklist` | `{ userId? }   ← another operator's needs `manage_team` (**AC-641**)` | - | `restartOnboarding()` |
| POST | `/api/v1/me/onboarding/steps/:stepId/complete` | `OnboardingChecklist` | `{ source: 'manual' \| 'auto' }` | - | `completeStep()` |
| POST | `/api/v1/me/onboarding/steps/:stepId/skip` | `OnboardingChecklist` | `{ skipped: boolean }   ← `false` is AC-633's `Do this step`` | - | `skipStep()` |

## `src/data/clients/payments.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/payments` | `Paginated<Payment>` | `q · kind · settlement · direction · riderId · captainId · tripId ·` | - | `listPayments()` |
| GET | `/api/v1/payments/:id` | `Payment` | - | **404** naming the id, so `overlay-not-found` can print it (§9.2). | `getPayment()` |
| GET | `/api/v1/payments/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getPaymentFacets()` |
| GET | `/api/v1/payments/for/:entityId` | `Paginated<Payment>` | `page · pageSize · sort` | - | `listPaymentsForEntity()` |

## `src/data/clients/payouts.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/deductions` | `Paginated<Deduction>` | `q · page · pageSize · sort · filter · view=all\|pending\|applied\|waived` | - | `listDeductions()` |
| POST | `/api/v1/deductions/:id/apply` | `Deduction` | `{ reasonCode }` | - | `applyDeduction()` |
| POST | `/api/v1/deductions/:id/waive` | `Deduction` | `{ reasonCode, note }` | **422** without a reason code | `waiveDeduction()` |
| GET | `/api/v1/escrow` | `Paginated<EscrowHold>` | `q · page · pageSize · sort · filter · view=all\|held\|releasable\|released\|cancelled` | - | `listEscrowHolds()` |
| POST | `/api/v1/escrow/:id/release` | `EscrowHold` | `{ reasonCode }` | **409** when the trips are not delivered, or the hold is not `held` | `releaseEscrow()` |
| GET | `/api/v1/ledgers/liability.driver/:captainId` | `Ledger` | `from · to · page · pageSize` | - | `getCaptainPayableLedger()` |
| GET | `/api/v1/payouts` | `Paginated<CaptainPayout>` | `q · page · pageSize · sort · filter · view=all\|due\|failed\|in-debt` | - | `listCaptainPayouts()` |
| POST | `/api/v1/payouts/:captainId` | `CaptainPayout` | `{ reasonCode }` | **409** when there is nothing payable<br>**422** when the amount exceeds the net payable | `payCaptain()` |
| GET | `/api/v1/payouts/facets` | `Facets` | `view` | - | `getPayoutFacets()` |

## `src/data/clients/policy.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/policy` | `OperationalPolicy` | - | - | `getOperationalPolicy()` |
| PUT | `/api/v1/policy` | `SavePolicyResult` | `SaveOperationalPolicyInput` | **422** on a malformed grid, a negative or fractional target, an empty city | `saveOperationalPolicy()` |
| GET | `/api/v1/policy/reason-codes` | `Paginated<ReasonCode>, active first then retired, `key` within each` | `q · surface · state · page · pageSize` | - | `listReasonCodes()` |
| POST | `/api/v1/policy/reason-codes` | `ReasonCode` | `CreateReasonCodeInput` | **409** when the key already exists — including when the existing one is retired<br>**422** on a malformed key, a missing label in either language, or no surface | `createReasonCode()` |
| GET | `/api/v1/policy/reason-codes/:key` | `ReasonCode` | - | **404** only when the key was never defined | `resolveReasonCode()` |
| PUT | `/api/v1/policy/reason-codes/:key` | `ReasonCode` | `SaveReasonCodeInput` | - | `saveReasonCode()` |
| POST | `/api/v1/policy/reason-codes/:key/restore` | `ReasonCode` | - | **409** when the code is already active | `restoreReasonCode()` |
| POST | `/api/v1/policy/reason-codes/:key/retire` | `ReasonCode` | `{ supersededByKey }` | **409** when the code is already retired<br>**422** when the named successor does not exist, is itself retired, or is the | `retireReasonCode()` |
| GET | `/api/v1/policy/reason-codes/options` | `ReasonCode[] — **active only**` | `surface` | - | `listReasonCodeOptions()` |

## `src/data/clients/preferences.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/me/ui-state` | `UiState` | `none — the server reads the auth cookie` | - | `getUiState()` |
| PATCH | `/api/v1/me/ui-state` | `UiState` | `Partial<UiState> — `schemaVersion` is the server's and is not accepted` | - | `updateUiState()` |

## `src/data/clients/pricing.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/cancellation-rules` | `CancellationRule[]` | - | - | `listCancellationRules()` |
| GET | `/api/v1/plans` | `SubscriptionPlan[], in `sortOrder`` | - | - | `listPlans()` |
| GET | `/api/v1/plans/:id` | `SubscriptionPlan` | - | - | `getPlan()` |
| PUT | `/api/v1/plans/:id` | `SubscriptionPlan` | `SavePlanInput` | **422** when either name is empty, a feature is missing a language or exceeds | `savePlan()` |
| GET | `/api/v1/quick-ride-types` | `QuickRideType[]` | - | - | `listQuickRideTypes()` |
| GET | `/api/v1/rate-cards` | `RateCard[], newest first` | `status` | - | `listRateCards()` |
| GET | `/api/v1/rate-cards/live` | `RateCard` | - | - | `getLiveRateCard()` |
| GET | `/api/v1/surge-suspensions` | `SurgeSuspension[]` | - | - | `listSurgeSuspensions()` |
| POST | `/api/v1/surge-suspensions` | `SurgeSuspension` | `{ zoneId, zoneName, reason, hours }` | **422** without a reason, or above the 12-hour ceiling | `suspendSurge()` |
| GET | `/api/v1/surge-windows` | `SurgeWindow[]` | - | - | `listSurgeWindows()` |

## `src/data/clients/profile.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/entities/:entityId` | `ProfileRef` | - | **404** when the id resolves to nothing — and the copy must name the id that | `resolveProfile()` |
| POST | `/api/v1/entities/resolve` | `{ entities: Record<string, ProfileRef | null> }` | `{ ids: string[] }` | - | `resolveProfiles()` |
| GET | `/api/v1/search` | `SearchResponse` | `q · scope · limit` | - | `search()` |

## `src/data/clients/reports.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/reports` | `Paginated<SavedReport>` | `q · view=mine\|team · page · pageSize` | - | `listReports()` |
| POST | `/api/v1/reports` | `Single<SavedReport>` | `{ name, description, query, visibility }` | - | `saveReport()` |
| DELETE | `/api/v1/reports/:id` | `204, or 409 with the dashboards that pin it` | - | - | `deleteReport()` |
| GET | `/api/v1/reports/:id` | `Single<SavedReport>` | - | - | `getReport()` |
| PATCH | `/api/v1/reports/:id` | `Single<SavedReport>` | `{ name, description, query, visibility }` | - | `saveReport()` |
| POST | `/api/v1/reports/export` | `ReportCsv` | `ReportQuery` | - | `exportReport()` |
| POST | `/api/v1/reports/run` | `ReportResult` | `ReportQuery` | - | `runReport()` |

## `src/data/clients/requests.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/requests` | `Paginated<RideRequest>` | `q · channel · status · page · pageSize · sort · filter ·` | - | `listRequests()` |
| GET | `/api/v1/requests/:id` | `RideRequest` | - | - | `getRequest()` |
| POST | `/api/v1/requests/:id/assign` | `RideRequest` | `{ driverId: string }` | **409** when the request is no longer open — legacy re-reads the index before<br>**422** when `driverId` is empty | `assignRequest()` |
| POST | `/api/v1/requests/:id/claim` | `RideRequest` | `{ takeOver?: boolean }` | **409** when another operator holds it and `takeOver` was not sent | `claimRequest()` |
| POST | `/api/v1/requests/:id/expire` | `RideRequest` | `{ reason?: string }` | - | `expireRequest()` |
| POST | `/api/v1/requests/:id/release` | `RideRequest` | - | - | `releaseRequest()` |
| GET | `/api/v1/requests/facets` | `Facets` | `view` | - | `getRequestFacets()` |

## `src/data/clients/retention.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/settings/retention` | `RetentionPolicy` | - | - | `getRetentionPolicy()` |
| PUT | `/api/v1/settings/retention` | `RetentionPolicy` | `RetentionPolicyInput` | - | `saveRetentionPolicy()` |

## `src/data/clients/revenue.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/credit-notes` | `Paginated<CreditNote>` | `q · page · pageSize · sort · filter · view=all\|unlinked` | - | `listCreditNotes()` |
| GET | `/api/v1/financials/revenue-by-plan` | `RevenueByPlanRow[]` | `from · to · include=daily` | - | `listRevenueByPlan()` |
| GET | `/api/v1/financials/revenue/by-plan/:planId` | `PlanRevenueDetail` | `from · to` | **404** when no plan carries that id | `getPlanRevenueDetail()` |
| GET | `/api/v1/ledgers/contra.refunds` | `Ledger` | `from · to · page · pageSize` | - | `getRefundsLedger()` |
| GET | `/api/v1/refunds` | `Paginated<Refund>` | `q · page · pageSize · sort · filter · view=all\|to-wallet\|to-instrument\|unsourced` | - | `listRefunds()` |
| POST | `/api/v1/refunds` | `{ refund: Refund, creditNote: CreditNote }` | `IssueRefundInput` | **409** when an identical unconfirmed refund already exists<br>**422** on a non-positive amount | `issueRefund()` |
| GET | `/api/v1/refunds/facets` | `Facets` | `view` | - | `getRefundFacets()` |

## `src/data/clients/riders.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/riders` | `Paginated<Rider>` | `q · status · churnRisk · page · pageSize · sort · filter · view=riders\|overdrawn` | - | `listRiders()` |
| GET | `/api/v1/riders/:id` | `Rider` | - | - | `getRider()` |
| GET | `/api/v1/riders/:id/movements` | `RiderMoneyMovements` | - | **404** when the rider does not exist | `getRiderMoneyMovements()` |
| GET | `/api/v1/riders/:id/support` | `RiderSupportPresence` | - | **404** when the rider does not exist | `getRiderSupportPresence()` |
| GET | `/api/v1/riders/:id/timeline` | `Paginated<RiderTimelineEvent> — newest first` | `page · pageSize · sort · filter (kind, at)` | **404** when the rider does not exist | `getRiderTimeline()` |
| GET | `/api/v1/riders/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getRiderFacets()` |
| GET | `/api/v1/riders/new` | `Paginated<NewRider>` | `q · page · pageSize · sort` | - | `listNewRiders()` |

## `src/data/clients/routes.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/routes` | `RouteTable` | `none` | - | `fetchRouteTable()` |

## `src/data/clients/safety.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/incidents` | `Paginated<SafetyIncident>` | `q · status · type · page · pageSize · sort · filter ·` | - | `listSafetyIncidents()` |
| GET | `/api/v1/incidents/:id` | `SafetyIncident` | - | - | `getSafetyIncident()` |
| POST | `/api/v1/incidents/:id/claim` | `SafetyIncident   (with `firstResponseAt` stamped, if it was not already)` | `{ takeOver?: boolean }  ·  409 when another operator holds it` | - | `claimSafetyIncident()` |
| POST | `/api/v1/incidents/:id/close` | `SafetyIncident` | - | **422** when any protocol step is outstanding | `closeSafetyIncident()` |
| POST | `/api/v1/incidents/:id/precautionary-suspension` | `SafetyIncident   (with `act` ticked and `precautionarySuspension` set)` | `{ reason: string }` | **403** without `approve_drivers`<br>**422** when the incident has no counterparty to suspend | `precautionarilySuspend()` |
| PATCH | `/api/v1/incidents/:id/protocol/:step` | `SafetyIncident` | `{ done: boolean }` | **409** on a closed incident — legacy disables the checkbox (`:13425`) rather | `setSafetyProtocolStep()` |
| POST | `/api/v1/incidents/:id/release` | `SafetyIncident` | - | - | `releaseSafetyIncident()` |
| GET | `/api/v1/incidents/facets` | `Facets` | `view` | - | `getSafetyFacets()` |

## `src/data/clients/securityPolicy.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/security-policy` | `SecurityPolicy` | - | - | `getSecurityPolicy()` |
| PATCH | `/api/v1/security-policy` | `SecurityPolicy` | `Partial<SecurityPolicy>` | - | `updateSecurityPolicy()` |

## `src/data/clients/session.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/me/preferences` | `UserPreferences` | - | - | `getPreferences()` |
| PATCH | `/api/v1/me/preferences` | `UserPreferences` | `Partial<UserPreferences>` | - | `updatePreferences()` |
| GET | `/api/v1/session` | `Session` | `none — the server reads the auth cookie` | - | `getSession()` |
| GET | `/api/v1/team-users` | `{ items: TeamUser[] }` | `none (the roster is five people; pagination would be theatre)` | - | `listTeamUsers()` |
| GET | `/api/v1/team-users/:id` | `TeamUser` | - | - | `getTeamUser()` |

## `src/data/clients/subscriptions.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/subscriptions` | `Paginated<Subscription>` | `q · status · planKey · riderId · driverId · page · pageSize ·` | - | `listSubscriptions()` |
| GET | `/api/v1/subscriptions/:id` | `Subscription` | - | - | `getSubscription()` |
| POST | `/api/v1/subscriptions/:id/cancel` | `Subscription  (with `refundedHalalas` computed for unused trips)` | `{ reason: string }` | - | `cancelSubscription()` |
| POST | `/api/v1/subscriptions/:id/driver` | `Subscription` | `{ driverId: string, reason: string }` | **404** when the subscription or the captain does not exist<br>**409** `not_reassignable` when the subscription is cancelled or expired<br>**422** `same_driver` when the captain named already holds it<br>**422** `driver_unavailable` when the captain is not active<br>**422** `vehicle_class_below_plan` when their vehicle is below the plan's tier | `reassignSubscriptionDriver()` |
| POST | `/api/v1/subscriptions/:id/freeze` | `Subscription` | `{ until: IsoDate }` | **409** when the subscription is cancelled or expired | `freezeSubscription()` |
| GET | `/api/v1/subscriptions/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getSubscriptionFacets()` |

## `src/data/clients/team.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/team/invites` | `{ items: TeamInvite[] }` | - | - | `listInvites()` |
| DELETE | `/api/v1/team/invites/:userId` | `{ revoked: true }` | - | - | `revokeInvite()` |
| POST | `/api/v1/team/invites/:userId/resend` | `TeamInvite` | - | - | `resendInvite()` |
| GET | `/api/v1/team/on-call` | `OnCallRota` | - | - | `getOnCallRota()` |
| PUT | `/api/v1/team/on-call` | `OnCallRota` | `{ primaryUserId, secondaryUserId }` | - | `updateOnCallRota()` |
| GET | `/api/v1/team/operators` | `Paginated<TeamUser>` | `page · pageSize · q · sort · filters · view` | - | `listOperators()` |
| POST | `/api/v1/team/operators` | `TeamUser` | `{ name, email, phone, role, compensationCapHalalas }` | - | `inviteOperator()` |
| DELETE | `/api/v1/team/operators/:id` | `{ offboarded: true }` | - | - | `offboardOperator()` |
| GET | `/api/v1/team/operators/:id` | `TeamUser` | - | - | `getOperator()` |
| PUT | `/api/v1/team/operators/:id/permissions` | `TeamUser` | `{ permissions }` | - | `setOperatorPermissions()` |
| POST | `/api/v1/team/operators/:id/reinstate` | `TeamUser` | - | - | `reinstateOperator()` |
| GET | `/api/v1/team/operators/:id/sessions` | `{ items: DeviceSession[], canRevoke, refusal }` | - | - | `listOperatorSessions()` |
| DELETE | `/api/v1/team/operators/:id/sessions/:deviceId` | `{ revoked: true }` | - | - | `revokeOperatorSession()` |
| POST | `/api/v1/team/operators/:id/suspend` | `TeamUser` | `{ reason }` | - | `suspendOperator()` |

## `src/data/clients/tickets.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/tickets` | `Paginated<Ticket>` | `q, view, page, pageSize, sort, filter` | - | `listTickets()` |
| POST | `/api/v1/tickets` | `Ticket` | `NewTicketInput` | - | `createTicket()` |
| GET | `/api/v1/tickets/:id` | `Ticket` | - | **404** when the id does not exist | `getTicket()` |
| POST | `/api/v1/tickets/:id/call-log` | `Ticket` | `{ outcome, notes }` | **422** on an outcome outside the closed set. A call moves the ticket on as a | `logTicketCall()` |
| POST | `/api/v1/tickets/:id/claim` | `Ticket` | `{ takeOver? }` | **404** when the id does not exist<br>**409** `claimed_by_other` when another operator holds a live claim and `takeOver` is unset<br>**409** `ticket_decided` on a resolved or closed ticket | `claimTicket()` |
| POST | `/api/v1/tickets/:id/priority` | `Ticket` | `{ priority }` | - | `setTicketPriority()` |
| POST | `/api/v1/tickets/:id/reason-code` | `Ticket` | `{ reasonCode }` | **409** `ticket_decided` on a resolved or closed ticket. Re-derives the priority | `recodeTicket()` |
| POST | `/api/v1/tickets/:id/release` | `Ticket` | - | **404** when the id does not exist | `releaseTicket()` |
| POST | `/api/v1/tickets/:id/reopen` | `Ticket` | - | **404** when the id does not exist<br>**409** `ticket_open` when the ticket is not decided. Releases the decided claim; | `reopenTicket()` |
| POST | `/api/v1/tickets/:id/reply` | `Ticket` | `{ body }` | **404** when the id does not exist<br>**409** `ticket_closed` on a closed ticket<br>**422** `no_channel` when the ticket has no reply destination | `replyTicket()` |
| POST | `/api/v1/tickets/:id/resolve` | `Ticket` | - | **404** when the id does not exist<br>**409** `ticket_decided` when already resolved or closed. The claim becomes | `resolveTicket()` |
| POST | `/api/v1/tickets/:id/status` | `Ticket` | `{ status: 'waiting' \| 'in-progress' }` | **409** `ticket_decided` on a resolved or closed ticket. `waiting` pauses the | `setTicketStatus()` |
| POST | `/api/v1/tickets/:id/transfer` | `Ticket` | `{ toUserId, note }` | **404** when the id or the operator does not exist<br>**409** `ticket_decided` on a resolved or closed ticket<br>**422** `note_required` when the note is empty. The note lands as an internal message (AC-S-13). | `transferTicket()` |

## `src/data/clients/trips.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/trips` | `Paginated<Trip>` | `q · kind · status · riderId · driverId · subscriptionId ·` | - | `listTrips()` |
| GET | `/api/v1/trips/:id` | `Trip` | - | - | `getTrip()` |
| POST | `/api/v1/trips/:id/flag` | `Trip` | `{ flagged: boolean }` | - | `setTripFlag()` |
| GET | `/api/v1/trips/:id/telemetry` | `TripTelemetry` | - | - | `getTripTelemetry()` |
| GET | `/api/v1/trips/facets` | `Facets — field name -> [{ value, count }], count-descending` | `view` | - | `getTripFacets()` |

## `src/data/clients/wallets.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/ledgers/liability.wallet/:riderId` | `Ledger` | `from · to · page · pageSize` | - | `getWalletLedger()` |
| GET | `/api/v1/wallets` | `Paginated<WalletSummary>` | `q · page · pageSize · sort · filter · view=all-wallets\|negative-balances\|goodwill` | - | `listWallets()` |
| POST | `/api/v1/wallets/:riderId/adjust` | `{ posting: LedgerPosting, authority: AuthorityCheck }` | `{ amountHalalas, direction, reasonCode, note }` | **403** when the authority check refuses  ·  422 without a reason code | `adjustWallet()` |
| GET | `/api/v1/wallets/:riderId/authority` | `AuthorityCheck` | `amountHalalas · reasonCode` | - | `checkAdjustmentAuthority()` |
| GET | `/api/v1/wallets/facets` | `Facets` | `view` | - | `getWalletFacets()` |

## `src/data/clients/workspace.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| POST | `/api/v1/workspace/legal/:key/reconsent` | `ReconsentResult` | - | - | `queueReconsent()` |
| DELETE | `/api/v1/workspace/logo` | `WorkspaceSettings` | - | - | `removeLogo()` |
| PUT | `/api/v1/workspace/logo` | `WorkspaceSettings` | `{ dataUrl, fileName, sizeBytes }` | - | `updateLogo()` |
| GET | `/api/v1/workspace/settings` | `WorkspaceSettings` | - | - | `getWorkspaceSettings()` |
| PATCH | `/api/v1/workspace/settings` | `WorkspaceSettings` | `WorkspaceSettingsPatch` | - | `updateWorkspaceSettings()` |

## `src/data/clients/zones.ts`

| Method | Path | Returns | Request | Fails with | Function |
|---|---|---|---|---|---|
| GET | `/api/v1/zones` | `Paginated<Zone>` | `q · view=all\|starved\|offers\|needs-captains · sort · filters ·` | - | `listZones()` |
| GET | `/api/v1/zones/:zoneId` | `Zone` | - | - | `getZone()` |
| POST | `/api/v1/zones/:zoneId/recruitment` | `{ zoneId, queuedAt }` | - | - | `queueRecruitment()` |
| POST | `/api/v1/zones/:zoneId/steer-offers` | `ZoneSteerOffer` | `{ bonusPerTripHalalas, budgetCapHalalas, durationMinutes }` | - | `openSteerOffer()` |
| GET | `/api/v1/zones/facets` | `Facets   { city: [...], recruitmentPriority: [...] }` | `view` | - | `getZoneFacets()` |
| GET | `/api/v1/zones/health` | `ZoneHealthSummary` | - | - | `getZoneHealth()` |

