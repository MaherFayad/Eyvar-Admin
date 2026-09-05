/**
 * The public surface of the data layer.
 *
 * **Components import from here and from `src/data/types/`. Nothing else.**
 * A component that imports `src/data/fixtures/…` has broken the seam, and the
 * fix is not to add an export — it is to add a client function.
 *
 * That rule is enforced mechanically in `seam.test.ts` and should be an ESLint
 * `no-restricted-imports` rule as well once the project is scaffolded (see the
 * handoff note for the exact config).
 */

/* Static imports for `resetDataLayer` below. None of these modules imports this
   barrel, so there is no cycle. */
import { mockFailures as failureRegistry } from '../config'
import { resetNavCounts as resetCounts } from './navCounts'
import { resetAssurance as resetAssuranceState } from './assurance'
import { resetSafetyIncidents as resetSafety } from './safety'
import { resetFairnessCases } from './fairness'
import { resetNotifications as resetNotifs } from './notifications'
import { resetMockSession as resetSession } from './session'
import { resetAudit as resetAuditLog } from './audit'
import { resetLedger as resetLedgerState } from './ledger'
import { resetRevenue as resetRevenueState } from './revenue'
import { resetPayouts as resetPayoutState } from './payouts'
import { resetCash as resetCashState } from './cash'
import { resetWallets as resetWalletState } from './wallets'
import { resetPricing as resetPricingState } from './pricing'
import { resetZones as resetZoneState } from './zones'
import { resetAuth as resetAuthState } from './auth'
import { resetOnboarding as resetOnboardingState } from './onboarding'
import { resetReports as resetReportState } from './reports'
import { resetDashboards as resetDashboardState } from './dashboards'
import { resetAlerts as resetAlertState } from './alerts'
import { resetConversations as resetConversationState } from './conversations'
import { resetTeam as resetTeamState } from './team'
import { resetSecurityPolicy as resetSecurityPolicyState } from './securityPolicy'
import { resetWorkspace as resetWorkspaceState } from './workspace'
import { resetRealtime as resetRealtimeState } from './realtime'
import { resetTickets as resetTicketState } from './tickets'
import { resetDisputes as resetDisputeState } from './disputes'
import { resetDispatch as resetDispatchState } from './dispatch'
import { resetCorporateAccounts as resetCorporateState } from './corporateAccounts'
import { resetPolicy as resetPolicyState } from './policy'
/* P6-T4 — Admin › Data & Compliance: the integrity run state and the retention
   schedules. Both are session-scoped and both leak across test files without
   this. */
import { resetIntegrity as resetIntegrityState } from './integrity'
import { resetRetention as resetRetentionState } from './retention'
/* P6-T2 — the Communications seam: identities, templates, delivery log, push. */
import { resetEmails as resetEmailState } from './emails'
import { resetIntegrations as resetIntegrationsState } from './integrations'
import { resetPreferences as resetPreferencesState } from './preferences'

const clearFailures = () => failureRegistry.clear()

/* ── the seam itself ─────────────────────────────────────────────────── */
export {
  DATA_SOURCE,
  API_BASE_URL,
  API_VERSION,
  getMockLatency,
  setMockLatency,
  disableMockLatency,
  mockFailures,
  defaultInjectedError,
  seedMockFailuresFromLocation,
  knownOperations,
  type DataSource,
  type MockFailureMode,
} from '../config'

export { http, buildUrl, toSearchParams } from './http'

/* ── shell ───────────────────────────────────────────────────────────── */
export {
  ROUTE_OPERATIONS,
  fetchRouteTable,
  UNBUILT_SUB_TAB_IDS,
  findShellLayer,
  findSubTabById,
  isSubTabBuilt,
  findSubTabByPath,
  getRouteTable,
  getSubTabs,
  getWorkspaces,
  resolveLegacyPage,
  subTabViewPermissions,
  type LegacyResolution,
} from './routes'

export {
  SESSION_OPERATIONS,
  getPreferences,
  getSession,
  getTeamUser,
  listTeamUsers,
  resetMockSession,
  switchMockUser,
  updatePreferences,
} from './session'

export {
  NAV_COUNT_OPERATIONS,
  getNavCounts,
  resetNavCounts,
  useEmptyNavCounts,
} from './navCounts'

export {
  NOTIFICATION_OPERATIONS,
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  previewNotifications,
  resetNotifications,
  useAllReadNotifications,
  useNoNotifications,
  type NotificationQuery,
} from './notifications'

export { PROFILE_OPERATIONS, resolveProfile, resolveProfiles, search } from './profile'

/* ── wave 1: Operations › People, Trips, Subscriptions, Corporate ────── */
export {
  COMPLIANCE_SCAN_PERMISSIONS,
  DRIVER_OPERATIONS,
  getComplianceDocumentFile,
  getDriver,
  getDriverComplianceFacets,
  getDriverFacets,
  getDriverCompliance,
  getDriverMoneyMovements,
  getDriverSupportPresence,
  getDriverTimeline,
  listDriverCompliance,
  listDrivers,
  reinstateDriver,
  suspendDriver,
  type DriverQuery,
} from './drivers'

export {
  RIDER_OPERATIONS,
  getRider,
  getRiderFacets,
  getRiderMoneyMovements,
  getRiderSupportPresence,
  getRiderTimeline,
  listNewRiders,
  listRiders,
  type RiderQuery,
} from './riders'

export {
  APPLICANT_OPERATIONS,
  approveApplicant,
  claimApplicant,
  getApplicant,
  getApplicantFacets,
  getApplicationDocumentFile,
  listApplicants,
  rejectApplicant,
  rejectApplicantDocument,
  releaseApplicant,
  requestApplicantDocumentReupload,
  verifyApplicantDocument,
  type ApplicantQuery,
} from './applicants'

export {
  LOW_RATING_THRESHOLD,
  TRIP_OPERATIONS,
  getTrip,
  getTripFacets,
  getTripTelemetry,
  listTrips,
  setTripFlag,
  flagTrip,
  unflagTrip,
  type TripQuery,
} from './trips'

export {
  EXPIRING_WINDOW_DAYS,
  SUBSCRIPTION_OPERATIONS,
  cancelSubscription,
  freezeSubscription,
  getSubscription,
  getSubscriptionFacets,
  listSubscriptions,
  reassignSubscriptionDriver,
  subscriptionCount,
  type SubscriptionQuery,
} from './subscriptions'

export {
  CORPORATE_OPERATIONS,
  addCorporateEmployee,
  createCorporateAccount,
  getCorporateAccount,
  getCorporateFacets,
  listCorporateAccounts,
  removeCorporateEmployee,
  resetCorporateAccounts,
  sendCorporateInvoice,
  updateCorporateUsagePolicy,
  type CorporateQuery,
  type CreateCorporateAccountInput,
} from './corporateAccounts'

/* Live Dispatch — T1.1 and T1.2. The telemetry read replaces a `TELEMETRY`
   literal; the intervention writes replace two controls that toasted success
   over an act nobody performed. */
export {
  DISPATCH_OPERATIONS,
  acknowledgeIntervention,
  getDispatchTelemetry,
  listInterventions,
  reassignIntervention,
  resetDispatch,
} from './dispatch'

/* ── wave 2: the work queues ─────────────────────────────────────────── */
export {
  REQUEST_OPERATIONS,
  assignRequest,
  claimRequest,
  expireRequest,
  getRequest,
  getRequestFacets,
  listRequests,
  releaseRequest,
  /* **The one predicate for "is this row actually held".** A `Claim` with
     `state: 'claimed'` is not ownership on its own — it goes stale after
     `OWNERSHIP_STALE_MINUTES` and the clients' `unassigned` views already treat
     it as free. `OwnerChip` re-derived ownership as `state === 'claimed'` and
     so disagreed with the list it was rendering: a row the client returned as
     unassigned drew `Held by … · Take over`, contradicting the 30-minute window
     the chip prints in its own tooltip. Exported so the screen asks the same
     question the client answers. */
  liveClaim,
  type RequestQuery,
} from './requests'

export {
  SAFETY_OPERATIONS,
  claimSafetyIncident,
  closeSafetyIncident,
  getSafetyFacets,
  getSafetyIncident,
  listSafetyIncidents,
  precautionarilySuspend,
  releaseSafetyIncident,
  resetSafetyIncidents,
  setSafetyProtocolStep,
  useQuietSafetyQueue,
  type SafetyQuery,
} from './safety'

export {
  FAIRNESS_OPERATIONS,
  claimFairnessCase,
  decideFairnessCase,
  getFairnessCase,
  getFairnessFacets,
  listFairnessCases,
  releaseFairnessCase,
  type FairnessQuery,
} from './fairness'

export {
  ASSURANCE_OPERATIONS,
  acknowledgeLeg,
  claimAssuranceTrip,
  getAssuranceFacets,
  getAssuranceTrip,
  listAbsences,
  listAssuranceTrips,
  offerBackup,
  releaseAssuranceTrip,
  resetAssurance,
  useAbsenceHistory,
  waiveAbsence,
  type AbsenceQuery,
  type AssuranceQuery,
} from './assurance'

export {
  WORK_OPERATIONS,
  getWorkFacets,
  listWorkItems,
  myWorkBacklogSize,
  type WorkQuery,
} from './myWork'

/* ── wave 4: metric tiles and chart cards ────────────────────────────── */
export {
  METRIC_BOARD_SUB_TABS,
  METRIC_KEYS,
  METRIC_OPERATIONS,
  METRIC_SERIES_KEYS,
  getMetricBoard,
  getMetricFacets,
  getMetricSeries,
  listMetrics,
  type MetricQuery,
} from './metrics'

/* ── wave 3: the ledger model and the seven Financials sub-tabs ──────── */
export {
  LEDGER_OPERATIONS,
  accountBalanceFrom,
  accountFlowFrom,
  buildLedger,
  getIdempotencyStats,
  getInvoiceSequence,
  getLedger,
  getPosting,
  getTrialBalance,
  getVatConfig,
  journalEntries,
  listGateways,
  listJournalEntries,
  listReconciliation,
  listRefusedPostings,
  resetLedger,
  resolveSubjectName,
  reversePosting,
  setDefaultGateway,
  setGatewayEnabled,
  useOutOfBalanceLedger,
  type LedgerQuery,
} from './ledger'

export {
  OVERVIEW_OPERATIONS,
  getFinancialsOverview,
  type OverviewQuery,
} from './financialsOverview'

export {
  REVENUE_OPERATIONS,
  getPlanRevenueDetail,
  getRefundFacets,
  getRefundsLedger,
  issueRefund,
  listCreditNotes,
  listRefunds,
  listRevenueByPlan,
  resetRevenue,
  type IssueRefundInput,
} from './revenue'

export {
  PAYOUT_OPERATIONS,
  applyDeduction,
  getCaptainPayableLedger,
  getPayoutFacets,
  listCaptainPayouts,
  listDeductions,
  listEscrowHolds,
  payCaptain,
  releaseEscrow,
  resetPayouts,
  waiveDeduction,
} from './payouts'

export {
  CASH_OPERATIONS,
  cashDebtCapHalalas,
  claimCashReport,
  decideCashReport,
  getCashFacets,
  getCashReport,
  getCaptainDebtLedger,
  listCaptainDebts,
  listCashReports,
  recordCashRepayment,
  releaseCashReport,
  resetCash,
} from './cash'

export {
  DEFAULT_FINANCIALS_PERIOD,
  WALLET_OPERATIONS,
  adjustWallet,
  checkAdjustmentAuthority,
  getWalletFacets,
  getWalletLedger,
  listWallets,
  resetWallets,
  type AdjustWalletInput,
} from './wallets'

/**
 * **`SURGE_SUSPENSION_MAX_HOURS` leaves through the client barrel, not only the
 * type barrel.** It is server policy — the same class as
 * `RESEND_COOLDOWN_SECONDS` — and the pricing screen gates its input on it. A
 * screen that imported the ceiling from `@/data/types` and the operation from
 * `@/data/clients` would be reading one contract from two places.
 */
export { SURGE_SUSPENSION_MAX_HOURS } from '../types/pricing'

export {
  PRICING_OPERATIONS,
  getLiveRateCard,
  getPlan,
  listCancellationRules,
  listPlans,
  listQuickRideTypes,
  listRateCards,
  listSurgeSuspensions,
  listSurgeWindows,
  resetPricing,
  savePlan,
  suspendSurge,
  type SavePlanInput,
} from './pricing'

export { AUDIT_OPERATIONS, auditLogSize, listAuditEntries, resetAudit } from './audit'

/* ── wave 5: authentication and role-based onboarding ────────────────── */
export {
  AUTH_FIXTURE_CODES,
  AUTH_FIXTURE_PASSWORD,
  AUTH_FIXTURE_TOKENS,
  AUTH_OPERATIONS,
  DEVICE_OPERATIONS,
  activateInvite,
  beginTotpEnrolment,
  enrollSecondFactor,
  isDeviceTrusted,
  listDevices,
  reauthenticate,
  requestPasswordReset,
  resendCode,
  resetAuth,
  resetPassword,
  revokeDevice,
  setDeviceTrust,
  signIn,
  signOut,
  signOutEverywhere,
  validateResetToken,
  verifyCode,
} from './auth'

export {
  ONBOARDING_OPERATIONS,
  completeStep,
  dismissOnboarding,
  getOnboarding,
  markOnboardingAutoOpened,
  resetOnboarding,
  restartOnboarding,
  shouldAutoOpen,
  skipStep,
} from './onboarding'

/* ── wave 5: Management › Market & Zones (R4-6b gap 1) ───────────────── */
export {
  ZONE_OPERATIONS,
  getZone,
  getZoneFacets,
  getZoneHealth,
  listCities,
  listZones,
  openSteerOffer,
  queueRecruitment,
  resetZones,
  resolveZones,
  starvedZoneCount,
  summariseZones,
  useLiveSteerOffer,
  useNoZones,
  useZeroSupplyZone,
} from './zones'


/* ── the report builder — measure catalogue, queries, dashboards, alerts ─
   `06-report-builder.md`, D13. The catalogue is exported as *data*: a screen
   asks what can be measured and what it can be split by, and never holds a
   list. That is the difference between a report builder and nine more fixed
   boards. */
export {
  CATALOGUE_OPERATIONS,
  listMeasures,
  listDimensions,
  planReportQuery,
  pairRefusal,
  pairableWith,
  type MeasureQuery,
} from './catalogue'

export {
  REPORT_OPERATIONS,
  runReport,
  listReports,
  getReport,
  saveReport,
  deleteReport,
  exportReport,
  reportToCsv,
  useTruncatedReports,
  serialiseReportQuery,
  resetReports,
  type RunReportOptions,
  type SaveReportInput,
  type SavedReportQuery,
} from './reports'

export {
  DASHBOARD_OPERATIONS,
  listDashboards,
  getDashboard,
  saveDashboard,
  deleteDashboard,
  moveTile,
  moveTileTo,
  resetDashboards,
  type SaveDashboardInput,
} from './dashboards'

export {
  ALERT_OPERATIONS,
  listAlertRules,
  getAlertRule,
  saveAlertRule,
  deleteAlertRule,
  evaluateAlertRule,
  listAlertFirings,
  describeAlertRule,
  resetAlerts,
  type SaveAlertInput,
} from './alerts'

export {
  TICKET_OPERATIONS,
  listTickets,
  getTicket,
  claimTicket,
  releaseTicket,
  currentTickets,
  replyTicket,
  resolveTicket,
  reopenTicket,
  createTicket,
  transferTicket,
  setTicketStatus,
  recodeTicket,
  setTicketPriority,
  sweepTicketSla,
  type TicketQuery,
  type TicketBreachKind,
} from './tickets'

/* ── phase 5a: the support conversation centre ───────────────────────
   Two seams, not one. `realtime.ts` is to events what `http.ts` is to reads,
   and `conversations.ts` is the first client to use both. */
export {
  REALTIME_OPERATIONS,
  advanceRealtime,
  createSocketDriver,
  decodeEnvelope,
  drainRealtime,
  emitMockEvent,
  enqueueMockEvent,
  flushRealtime,
  pendingRealtimeCount,
  publish as publishRealtime,
  realtimeUrl,
  resetRealtime,
  setRealtimeDriver,
  subscribe as subscribeRealtime,
  topicOperation,
  type RealtimeDriver,
  type RealtimeEnvelope,
  type RealtimeGap,
  type RealtimeHandler,
  type RealtimeSocket,
  type RealtimeSocketEventMap,
  type RealtimeSocketFactory,
  type RealtimeStatus,
  type RealtimeTopic,
  type SocketDriverOptions,
  type SubscribeOptions,
  type Unsubscribe,
} from './realtime'

export {
  CONVERSATION_OPERATIONS,
  CONVERSATION_QUEUE_TOPIC,
  PRESENCE_TOPIC,
  claimConversation,
  closeConversation,
  conversationAssignee,
  conversationTopic,
  customerVisible,
  getConversation,
  getConversationFacets,
  listAgentPresence,
  listConversationMessages,
  listConversations,
  releaseConversation,
  replyConversation,
  resetConversations,
  sendTypingIndicator,
  setMyPresence,
  subscribeToConversation,
  subscribeToConversationQueue,
  subscribeToPresence,
  transferConversation,
  useEmptyConversationQueue,
  type ConversationEventHandler,
  type ConversationQuery,
  type ReplyInput,
} from './conversations'

/* Pure query logic — synchronous, so a control can be disabled in place with a
   reason **before** a request is issued (AC-809, AC-816, AC-817, AC-836). */
export {
  CHART_TYPES,
  GRAINS,
  MAX_BUCKETS,
  MAX_GROUPS,
  MAX_MEASURES,
  PIE_MAX_PARTS,
} from '../reporting/plan'

export {
  WEEK_START_DOW,
  bucketStarts,
  comparisonWindow,
  countBuckets,
  localDayOf,
  partialBucketIndexes,
  resolvePreset,
  resolveWindow,
} from '../reporting/buckets'

export {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  reportQueryPath,
} from '../reporting/serialise'

/* §7.4's fold bucket, so a legend can name it rather than string-matching it. */
export { OTHER as OTHER_GROUP } from '../mock/resolveReport'

/* ── the fixed clock, for anything that needs relative time ──────────── */
export {
  EYVAR_NOW,
  EYVAR_TODAY,
  EYVAR_TZ_OFFSET,
  daysSince,
  daysUntil,
  fixedClock,
  toInstant,
  minutesSince,
  systemClock,
  type Clock,
} from '../mock/clock'

/**
 * Reset every mock client's mutable state and every injected failure. Call in
 * `beforeEach`. Without it, one test's `markAllNotificationsRead` leaks into the
 * next file's assertion about the unread badge.
 */
/**
 * **Warm the fixture chunk.** Re-exported here so the one legitimate caller
 * outside `src/data` — the Vitest setup file — reaches it through the public
 * seam rather than importing `data/mock/*` directly, which `seam.test.ts`
 * rightly forbids for everything but the clock.
 *
 * Production never needs this: `mock()` and `mockMutation()` await it before
 * every read. A test needs it because the dynamic `import()` adds a tick the
 * old static import did not have, and an assertion written against the resolved
 * shell would otherwise run one tick early.
 */
export { loadFixtures } from '../mock/fixtures'

export function resetDataLayer(): void {
  clearFailures()
  resetSession()
  resetCounts()
  resetNotifs()
  resetSafety()
  resetFairnessCases()
  resetAssuranceState()
  resetAuditLog()
  resetLedgerState()
  resetRevenueState()
  resetPayoutState()
  resetCashState()
  resetWalletState()
  resetPricingState()
  resetZoneState()
  resetAuthState()
  resetOnboardingState()
  resetReportState()
  resetDashboardState()
  resetAlertState()
  resetConversationState()
  resetPolicyState()
  resetEmailState()
  resetTeamState()
  resetSecurityPolicyState()
  resetWorkspaceState()
  /* Support › Tickets and Support › Disputes. Both hold session state that a
     mutation writes — a logged call, a resolved claim, an advanced lost-property
     report — so one file's verdict would otherwise ride into the next file's
     count of open claims. */
  resetTicketState()
  resetDisputeState()
  /* T1.2. Interventions and corporate accounts hold session state a write
     changes — an acknowledgement, an unlinked employee, a sent invoice. */
  resetDispatchState()
  resetCorporateState()
  /* P6-T4. `integrity` holds a run counter and a per-check last-run stamp; a
     leaked one makes the next file's first run `IRUN-0004` and its catalogue
     already dated, which is exactly the non-determinism the checks are written
     to detect. `retention` holds a saved policy. */
  resetIntegrityState()
  resetRetentionState()
  /* P6-T10. Keys and endpoints hold a mint counter and a delivery log; without
     this a test file's first issued key is `evk_live_…-4` and the previous
     file's replays are still in the log. Left out of the original append on
     purpose — this function sits mid-file and several agents were appending to
     the end of this barrel at the time, so the safe edit was the one at the
     bottom. Added here now that they have landed. */
  resetIntegrationsState()
  /* D16 — the UI-state bag. Also module-level, and a warm entry from one file's
     render would otherwise serve the next file's first mount. */
  resetPreferencesState()
  /* Last: it drops every subscriber, and the resets above emit events. */
  resetRealtimeState()
}

/* ── P6-T3: Admin › Policy — the operational policy and the reason codes ──
   One document for four panes (dispatch · cities · limits · SLA) plus the
   reason-code registry, which is written one code at a time.

   **`SavePolicyResult.changedFields` leaves through this barrel deliberately.**
   It is the audit payload and it is the F-014 regression test's instrument: a
   save that flattens tier inheritance reports every flattened cell as a changed
   field, so *"nothing gained an override"* is an assertion a screen can make
   rather than a property a reviewer has to eyeball. */
export {
  POLICY_OPERATIONS,
  createReasonCode,
  diffPolicy,
  getOperationalPolicy,
  listReasonCodeOptions,
  listReasonCodes,
  resetPolicy,
  resolveReasonCode,
  restoreReasonCode,
  retireReasonCode,
  saveOperationalPolicy,
  saveReasonCode,
  useEmptyReasonCodes,
  useFlattenedSlaPolicy,
  type ReasonCodeQuery,
} from './policy'

/**
 * Server policy that a SCREEN gates on, so it leaves through the client barrel
 * and not only the type barrel — the same reasoning as
 * `SURGE_SUSPENSION_MAX_HOURS` above. `effectiveSlaTargets` is what tells an
 * operator whether a target is inherited or overridden, and
 * `resolutionTargetMinutes` is exactly `SlaInput.targetMinutes` in
 * `src/lib/sla.ts`: one resolution of inheritance, read by the editor and by
 * the clock.
 */
export {
  SLA_TIER_KEYS,
  REASON_SURFACES,
  effectiveSlaTargets,
  overrideCount,
  pickableReasonCodes,
  resolutionTargetMinutes,
} from '../types/policy'

/* ── data integrity (P6-T4) ──────────────────────────────────────────────
 *
 * `integrity.ts` is the one client that owns no fixture array: a check is a
 * computation over what the OTHER clients serve, which is what keeps the seam
 * intact and what stops a check passing because it read a different array from
 * the screen it audits.
 *
 * `sortFindings` leaves through the barrel because the ORDER is part of the
 * contract, not a rendering choice: severity, then check, then record. Legacy
 * groups its findings in `Object.keys` order, so an alert can sit below
 * thirty-nine expected gaps (`16b` §12 item 10). A screen that re-sorts locally
 * would be free to reintroduce that.
 *
 * `resetIntegrity` and `resetRetention` are both called by `resetDataLayer()`:
 * a leaked run counter makes the next test file's first run `IRUN-0004` with a
 * catalogue already dated, which is precisely the non-determinism these checks
 * exist to detect, arriving through the test harness.
 */
export {
  INTEGRITY_OPERATIONS,
  listIntegrityChecks,
  resetIntegrity,
  runIntegrityChecks,
  sortFindings,
} from './integrity'

export {
  INTEGRITY_CHECK_GROUPS,
  INTEGRITY_CHECK_IDS,
  INTEGRITY_LINKABLE_ENTITY_TYPES,
  INTEGRITY_SEVERITY_ORDER,
  INTEGRITY_SEVERITY_TONE,
} from '../types/integrity'

export type {
  IntegrityCheck,
  IntegrityCheckGroup,
  IntegrityCheckId,
  IntegrityEntityType,
  IntegrityFinding,
  IntegrityGrouping,
  IntegrityRun,
  IntegritySeverity,
} from '../types/integrity'

/* ── retention schedules ─────────────────────────────────────────────────
 *
 * Built because `Save retention policy` was a toast and nothing else. Retention
 * is the setting most likely to be believed and least likely to be checked, so
 * a save that does not save is undetectable until a regulator asks.
 */
export { RETENTION_OPERATIONS, getRetentionPolicy, resetRetention, saveRetentionPolicy } from './retention'

export {
  AUDIT_RETENTION_OPTIONS,
  OPERATIONAL_WINDOW_OPTIONS,
  TELEMETRY_RETENTION_OPTIONS,
} from '../types/retention'

export type {
  AuditRetentionDays,
  OperationalWindowMonths,
  RetentionPolicy,
  RetentionPolicyInput,
  TelemetryRetentionDays,
} from '../types/retention'


/* ── P6-T2: Admin › Communications — email, and the push record beside it ──
   Three resources behind one client: the sender identities the system may send
   as, the transactional templates it sends (one per event PER LOCALE), and the
   delivery log in both directions — `outbox` and `inbox`, the two views
   `routeTable.ts:791` declares on the sub-tab.

   **The pure template mechanics leave through this barrel on purpose.**
   `emailTemplateIssues` and `renderEmailPreview` are the same functions the
   mock runs at save time, so the editor can validate on every keystroke and
   preview without a round trip while remaining incapable of disagreeing with
   the server about what a variable reference is. A second implementation in a
   component is how a save the form called valid comes back 422.

   Precondition for P5-T7 (outbound email from a ticket — `EmailDelivery`
   carries `ticketId` and `inReplyTo`) and P5-T8 (canned responses — the
   `ticket.reply` template and its declared variables). */
export {
  EMAIL_OPERATIONS,
  canResendFailure,
  emailDeliveryCount,
  emailTemplateIssues,
  getEmailTemplate,
  listEmailDeliveries,
  listEmailTemplateCoverage,
  listEmailTemplates,
  listMessagingTemplates,
  listPushAudiences,
  listPushBroadcasts,
  listSenderIdentities,
  previewEmailTemplate,
  referencedVariables,
  renderEmailPreview,
  requestSenderVerification,
  resendEmailDelivery,
  resetEmails,
  saveEmailTemplate,
  sendPushBroadcast,
  setDefaultSenderIdentity,
  substituteVariables,
  useCleanEmailDeliveries,
  useNoEmailDeliveries,
  useNoSenderIdentities,
  validateEmailTemplate,
  type EmailTemplateQuery,
} from './emails'

export {
  EMAIL_DELIVERY_STATES,
  EMAIL_LOCALES,
  EMAIL_TEMPLATE_KEYS,
  SENDER_VERIFICATION_STATES,
} from '../types/email'

export type {
  EmailDelivery,
  EmailDeliveryState,
  EmailDirection,
  EmailFailure,
  EmailFailureCode,
  EmailLocale,
  EmailTemplate,
  EmailTemplateCoverage,
  EmailTemplateDraft,
  EmailTemplateIssue,
  EmailTemplateIssueCode,
  EmailTemplateKey,
  EmailTemplatePreview,
  EmailTemplateStatus,
  EmailTemplateValidation,
  EmailTemplateVariable,
  MessagingAudience,
  MessagingChannel,
  MessagingTemplate,
  PushAudience,
  PushAudienceId,
  PushBroadcast,
  PushBroadcastState,
  SenderBlockReason,
  SenderIdentity,
  SenderVerificationState,
} from '../types/email'

/* ── Admin › Team & Access — the operator lifecycle (P6-T5, P6-T8) ────── */

export {
  TEAM_OPERATIONS,
  getOperator,
  getOnCallRota,
  inviteOperator,
  listInvites,
  listOperatorSessions,
  listOperators,
  manageTeamHolderCount,
  offboardOperator,
  permissionsForRole,
  reinstateOperator,
  resendInvite,
  resetTeam,
  revokeInvite,
  revokeOperatorSession,
  setOperatorPermissions,
  suspendOperator,
  transitionRefusal,
  updateOnCallRota,
  useTwoManageTeamHolders,
} from './team'

/* ── Admin › Team & Access › Security policy (D20) ────────────────────── */

export {
  MAX_IDLE_TIMEOUT_MINUTES,
  MIN_IDLE_TIMEOUT_MINUTES,
  SECURITY_POLICY_OPERATIONS,
  getSecurityPolicy,
  resetSecurityPolicy,
  updateSecurityPolicy,
} from './securityPolicy'

/* ── Admin › Workspace — general, branding, legal (P6-T1, D20) ────────── */

export {
  WORKSPACE_OPERATIONS,
  getWorkspaceSettings,
  queueReconsent,
  removeLogo,
  resetWorkspace,
  updateLogo,
  updateWorkspaceSettings,
} from './workspace'

/* ── Support › Disputes & Lost and Found ─────────────────────────────────
   Two collections behind one client, because they are two tabs of one sub-tab
   and one `reset` has to put both back. `resolveDispute` is the money-moving
   operation: it calls `issueRefund` and `adjustWallet` rather than opening a
   second refund path, and writes the captain leg with `postEntry`. */
export {
  DISPUTE_OPERATIONS,
  advanceLostFoundItem,
  claimDispute,
  releaseDispute,
  currentDisputes,
  getDispute,
  getDisputeFacets,
  getLostFoundItem,
  listDisputes,
  listLostFound,
  resetDisputes,
  resolveDispute,
  createDispute,
  createLostFoundItem,
  markLostFoundUnrecoverable,
  type NewDisputeInput,
  type NewLostFoundInput,
  type AdvanceLostFoundInput,
  type DisputeQuery,
  type LostFoundQuery,
  type ResolveDisputeInput,
  type ResolveDisputeResult,
} from './disputes'

/* `logTicketCall` closes the wrap-up that `LogCallModal` collected and threw
   away, and `resetTickets` is exported beside it because a logged call is
   session state that has to be resettable — see the note on `resetDataLayer`
   below. */
export { logTicketCall, resetTickets, takeNextTicket } from './tickets'

/* ── Payments and Complaints ─────────────────────────────────────────────
   The two id spaces the product referenced everywhere and modelled nowhere:
   119+ `PAY-*` on `Trip.paymentId`, `Refund.sourcePaymentId` and
   `CreditNote.againstPaymentId`, and `CMP-*` behind `Driver.openComplaints`
   and notification N6. Both had a workaround index in `clients/profile.ts`
   whose only job was to stop `?entity=` throwing; both are now real.

   Neither client holds mutable state, so neither appears in `resetDataLayer`:
   every mutation returns a new row rather than writing one, which is
   `clients/fairness.ts`' shape and is why that client has no reset either.

   `countOpenComplaints` is the endpoint `Driver.openComplaints` should be
   reconciled against — the count lives on the driver record because an index
   sorts on it, and derives from the complaints because a stored derived value
   is D-F19. */
export {
  PAYMENT_OPERATIONS,
  getPayment,
  getPaymentFacets,
  listPayments,
  listPaymentsForEntity,
  type PaymentQuery,
} from './payments'

export {
  COMPLAINT_OPERATIONS,
  claimComplaint,
  countOpenComplaints,
  getComplaint,
  getComplaintFacets,
  listComplaints,
  releaseComplaint,
  resolveComplaint,
  type ComplaintQuery,
  type ResolveComplaintInput,
} from './complaints'

/* ── D16: per-operator UI state (class 2) ────────────────────────────────
   The unnamed preference bag — column layout, pins, page size, density,
   language, palette recents, last-used view. One versioned resource behind
   `GET`/`PATCH /api/v1/me/ui-state`, per operator, cached write-through in
   `localStorage` by `lib/persistence.ts` and **never** sourced from it.

   The **validators leave through the barrel deliberately**, the same reasoning
   as `SURGE_SUSPENSION_MAX_HOURS`: `defaultUiStore` refuses to cache without a
   type guard, and the guard for a stored preference belongs beside the schema
   it guards rather than being reinvented in `src/hooks`. A hook that wrote its
   own would be reading one contract from two places.

   **`resetPreferences` is NOT yet called by `resetDataLayer()`** — that
   function sits mid-file and this barrel is being appended to by several agents
   at once, so it was left alone deliberately, exactly as `resetIntegrity` and
   `resetRetention` were. It must be added to it; raised in the handoff. */
export {
  DEFAULT_UI_STATE,
  PREFERENCE_OPERATIONS,
  UI_DENSITIES,
  cachedUiState,
  getUiState,
  isUiColumnPinList,
  isUiDensity,
  isUiLanguage,
  isUiPageSize,
  isUiState,
  isUiStringList,
  readUiState,
  resetMockUiState,
  resetPreferences,
  updateUiState,
  usePopulatedUiState,
  useUnknownUiStateVersion,
  type UiColumnPin,
  type UiDensity,
  type UiState,
  type UiStatePatch,
  type UiStateResult,
} from './preferences'

/* ── P6-T10: API keys and webhooks — D20's Integrations pane ─────────────
   Admin › Workspace › Integrations. Named exports, like every block above: an
   `export *` here would re-export `resetIntegrations` and the module-local
   helpers without anybody choosing to, and this barrel is the one file where
   what leaves the data layer is decided on purpose.

   **`resetIntegrations` is NOT yet called by `resetDataLayer()`** — that
   function sits mid-file and this barrel is appended to by several agents at
   once, so it was left alone deliberately, exactly as `resetIntegrity`,
   `resetRetention` and `resetPreferences` were. It must be added to it; raised
   in the handoff. Tests call it directly in the meantime. */
export {
  INTEGRATION_OPERATIONS,
  createWebhookEndpoint,
  issueApiKey,
  listApiKeys,
  listWebhookDeliveries,
  listWebhookEndpoints,
  replayWebhookDelivery,
  resetIntegrations,
  revokeApiKey,
  rotateApiKey,
  rotateWebhookSecret,
  updateWebhookEndpoint,
} from './integrations'

/* ── P5-T3 follow-up: the five §8.6 controls that shipped dead ───────────
   Appended rather than folded into the conversation block above, which several
   agents are editing at once.

   Each of these closes a control the console already renders **disabled in
   place with a stated reason** — the correct interim and a poor destination:

     `retryMessage`                 §8.6.7 `Send again`, design finding **F-2**.
                                    Re-uses the message id and pushes the failed
                                    attempt onto `Message.deliveryHistory`; it
                                    does **not** mint a second transcript line.
     `reopenConversation`           §3.5's header primary on a closed thread,
                                    and the other half of `closeConversation`.
     `createTicketForConversation`  D19's `Create ticket` and **AC-964**, writing
                                    *both* sides of the link in one mutation.

   `ReplyInput` also gains `channel` (D19's `Reply by email`) and `subject`
   (**F-6**), so a chat escalated to email can carry a subject the operator
   wrote. */
export {
  createTicketForConversation,
  reopenConversation,
  retryMessage,
  type ConversationTicketInput,
} from './conversations'
