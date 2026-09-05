/**
 * Domain types. Components import from here; this is the contract both the mock
 * and the real API satisfy.
 *
 * Importing a type is always safe — types have no runtime and cannot leak a
 * fixture. Importing a *value* from `src/data/fixtures/` is what breaks the seam.
 */

export type {
  ApiErrorDetail,
  ApiErrorKind,
  BadgeTone,
  Claim,
  ClaimAffordance,
  ClaimReleaseReason,
  ClaimState,
  ClaimTakeover,
  CountResult,
  CurrencyCode,
  FacetValue,
  Facets,
  FilterOperator,
  FilterSpec,
  FilterValue,
  Halalas,
  IsoDate,
  IsoDateTime,
  LocalisedText,
  Money,
  NavBadgeTone,
  Paginated,
  QueryParams,
  RelatedCount,
  Single,
  SortDirection,
  SortSpec,
} from './common'

export { ApiError, DEFAULT_PAGE_SIZE, isApiError, isRetryableStatus, kindForStatus } from './common'

export type {
  DetailKind,
  DetailRoute,
  NavCounts,
  PageShape,
  PatternKey,
  PermissionKey,
  PermissionLevel,
  PermissionRef,
  RouteTable,
  ShellLayerId,
  ShellLayerRoute,
  SubTabCount,
  SubTabRoute,
  SubTabView,
  Workspace,
  WorkspaceId,
} from './navigation'

export { WORKSPACE_IDS } from './navigation'

export type {
  PermissionDelta,
  ProposedRoleName,
  RoleName,
  Session,
  TeamUser,
  TeamUserStatus,
  UserPreferences,
} from './session'

/**
 * `ROLE_PERMISSIONS` and `effectivePermissions` are **D17's role baseline and
 * its resolver**. They are the mock server's implementation of *"computed
 * server-side and delivered resolved on `Session.permissions`"* — called from
 * `clients/session.ts` and `clients/auth.ts` and from **nothing in the UI**,
 * which re-derives no authority of its own (§8.2).
 */
export { ROLE_NAMES, ROLE_PERMISSIONS, effectivePermissions, granterRoleFor } from './session'

export type {
  Notification,
  NotificationFilter,
  NotificationPriority,
  NotificationSummary,
  NotificationType,
} from './notifications'

export { NOTIFICATION_PREVIEW_SIZE, NOTIFICATION_PRIORITY_RANK } from './notifications'

export type {
  ProfileEntityType,
  ProfileRef,
  ProfileSectionKey,
  SearchResponse,
  SearchResult,
  SearchResultKind,
} from './profile'

export { PROFILE_ENTITY_TYPES, UNRESOLVED_IN_LEGACY } from './profile'

/* ── wave 1 ──────────────────────────────────────────────────────────── */

export type {
  BankAccount,
  BankAccountChange,
  BankAccountStatus,
  ComplianceDoc,
  ComplianceDocDateSource,
  ComplianceDocFile,
  ComplianceDocState,
  ComplianceDocType,
  DocumentType,
  ComplianceDocumentFileRead,
  Driver,
  DriverBalance,
  DriverCompliance,
  DriverMoneyMovement,
  DriverMoneyMovements,
  DriverMovementSource,
  DriverStatus,
  DriverSupportPresence,
  DriverTier,
  DriverTimelineDetail,
  DriverTimelineEvent,
  DriverTimelineKind,
  MovementLogEntry,
  PlanAccess,
  VehicleClass,
} from './driver'

export {
  COMPLIANCE_DOC_FILE_KIND,
  COMPLIANCE_DOC_TYPES,
  DOCUMENT_TYPES,
  documentLabelKey,
  DRIVER_BALANCE_ACCOUNT,
} from './driver'

export type {
  ChurnReason,
  ChurnReasonKey,
  ChurnRisk,
  NewRider,
  Rider,
  RiderMoneyMovement,
  RiderMoneyMovements,
  RiderMovementSource,
  RiderRelatedCount,
  RiderStatus,
  RiderSupportPresence,
  RiderTier,
  RiderTimelineDetail,
  RiderTimelineEvent,
  RiderTimelineKind,
} from './rider'

export type {
  Applicant,
  ApplicantDoc,
  ApplicantDocField,
  ApplicantDocRejectionCode,
  ApplicantDocStatus,
  ApplicantStatus,
} from './applicant'
/* A value, not a type: the five reason codes a document rejection may carry. */
export { APPLICANT_DOC_REJECTION_CODES } from './applicant'

export type { Trip, TripKind, TripStatus } from './trip'
/* Values, not types: the one shared answer to "is this trip still open". */
export { OPEN_TRIP_STATUSES, isOpenTrip, isOpenTripStatus } from './trip'
/* What happened DURING a trip. A separate resource for a separate cardinality —
   see the header on `tripTelemetry.ts`. */
export type { TripStage, TripStageKind, TripTelemetry } from './tripTelemetry'

export type {
  PlanKey,
  Subscription,
  SubscriptionStatus,
  SubscriptionTripKind,
} from './subscription'

export type {
  CorporateAccount,
  CorporateAccountStatus,
  CorporateBillingType,
  CorporateUsagePolicy,
} from './corporateAccount'

/* Live Dispatch — T1.1 and T1.2. */
export type {
  DispatchTelemetry,
  Intervention,
  InterventionKind,
  InterventionStatus,
} from './dispatch'

/* ── wave 2: the work queues ─────────────────────────────────────────── */

export type { SlaSource, SlaTracked, WorkItemSeverity, WorkQueueId, WorkQueueRow } from './workQueue'

export type { RequestChannel, RequestStatus, RideRequest } from './request'
export {
  OFFER_WINDOW_SECONDS,
  REQUEST_SLA_MINUTES,
  SUBSCRIPTION_REQUEST_REMINDER_MINUTES,
} from './request'

export type {
  PrecautionarySuspension,
  SafetyIncident,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
  SafetyIncidentType,
  SafetyProtocolStep,
  SafetyProtocolStepKey,
} from './safety'
export { SAFETY_PROTOCOL_STEPS, SAFETY_REASON_CODE, SAFETY_RESOLVE_MINUTES } from './safety'

export type { FairnessCase, FairnessCaseKind, FairnessCaseStatus, FairnessReasonCode } from './fairness'
export { APPEAL_WINDOW_DAYS, FAIRNESS_RESOLVE_MINUTES } from './fairness'

export type {
  AbsenceEvent,
  AssuranceTrip,
  BackupOffer,
  BackupOfferState,
  CaptainDepartureState,
  LegAckSource,
  LegAcknowledgement,
  LegAckWeight,
} from './assurance'
export {
  ABSENCE_COUNTER_WINDOW_DAYS,
  ASSURANCE_CONFIRM_WINDOW_MINUTES,
  ASSURANCE_DEPARTING_WINDOW_HOURS,
  BACKUP_OFFER_WINDOW_MINUTES,
  CONFIRM_DEADLINE_LOCAL_TIME,
  LEG_ACK_WEIGHT,
} from './assurance'

export type { WorkItem, WorkItemParam, WorkItemParams } from './work'
export { WORK_QUEUE_ROUTE, WORK_REQUEST_ROUTE, WORK_ROUTING } from './work'

/* ── wave 4: metric tiles and chart cards ────────────────────────────── */

export type {
  /* R5-11. The closed union of stores a measure may be waiting on. A closed
     union and not `string | null`, because a free string can be a placeholder
     and pass — `breakdown.row.entity`'s exact failure mode. */
  AwaitedStore,
  BoardNotice,
  BoardNoticeTone,
  /* R5-7. A row label is a key or an entity name and the two are different
     things in the type — `BreakdownList` branches on it to fix V-4. */
  BreakdownLabel,
  DailySnapshot,
  Metric,
  MetricBoard,
  MetricBreakdown,
  MetricBreakdownRow,
  /* R5-9 §20.2. Three fields that exist only together, so one nullable object
     rather than two independent nullables. */
  MetricCaveat,
  MetricCategory,
  MetricComparison,
  MetricDirection,
  MetricUnit,
  NoComparisonReason,
  SeriesPoint,
  SeriesWindow,
  TimeSeries,
  /* R5-1. Exported although nothing imports it yet: a public union with no
     barrel entry is the next agent's blocked build, and this one already cost
     a round trip once. */
  ValueAbsenceReason,
} from './metrics'

/* ── wave 3: the ledger model and the seven Financials sub-tabs ──────── */

export type {
  AccountDefinition,
  AccountKey,
  AccountLine,
  AccountType,
  IdempotencyStats,
  JournalEntry,
  Ledger,
  LedgerPosting,
  NormalSide,
  PostingDirection,
  PostingKind,
  PostingSourceType,
  ReconciliationRow,
  RefusedPosting,
  SettlementState,
  TrialBalance,
  TrialBalanceRow,
} from './ledger'

export {
  ACCOUNT_KEYS,
  CHART_OF_ACCOUNTS,
  PENDING_SETTLEMENTS,
  SETTLEMENT_BADGE_TONE,
  accountDefinition,
  isPendingSettlement,
} from './ledger'

export type {
  AuthorityCheck,
  CaptainDebt,
  CaptainPayout,
  CashClassification,
  CashReport,
  CashReportStatus,
  CreditNote,
  Deduction,
  DeductionState,
  EscrowHold,
  FinancialsComparison,
  FinancialsDailyPoint,
  FinancialsOverview,
  FinancialsPeriod,
  InvoiceSequence,
  PaymentGateway,
  PayoutState,
  PlanRevenueDetail,
  PlanRevenuePoint,
  PlanRevenueRefund,
  Refund,
  RefundDestination,
  RevenueByPlanRow,
  VatConfig,
  WalletSummary,
} from './financials'

/* ── the two resources every screen referenced and nothing modelled ──────
   `Payment` reuses `SettlementState` from './ledger' rather than declaring a
   status of its own, and `Complaint` reuses `SlaTracked` from './workQueue'
   rather than a third work-queue vocabulary. Neither adds a badge tone. */

export type { Payment, PaymentDirection, PaymentKind } from './payment'

export { PAYMENT_KINDS, paymentDirectionFor } from './payment'

export type {
  Complaint,
  ComplaintCategory,
  ComplaintOutcome,
  ComplaintResolution,
  ComplaintSeverity,
  ComplaintStatus,
} from './complaint'

export {
  COMPLAINT_CATEGORIES,
  COMPLAINT_COMPENSATION_HALALAS,
  COMPLAINT_FIRST_RESPONSE_MINUTES,
  COMPLAINT_OUTCOMES,
  COMPLAINT_REASON_CODE,
  COMPLAINT_RESOLVE_MINUTES,
  COMPLAINT_SEVERITIES,
  COMPLAINT_STATUSES,
  OPEN_COMPLAINT_STATUSES,
  isOpenComplaint,
  outcomeAuthorisesCompensation,
} from './complaint'

export type {
  CancellationRule,
  DerivedFieldDefinition,
  PlanFeature,
  PlanStatus,
  QuickRideCancellationRule,
  QuickRideType,
  RateCard,
  RateCardClass,
  RateCardSimulation,
  RateCardStatus,
  SubscriptionCancellationRule,
  SubscriptionPlan,
  SurgeSuspension,
  SurgeWindow,
} from './pricing'

export {
  PLAN_EXAMPLE_INPUTS,
  PLAN_PRICING_DEFINITIONS,
  PLAN_PRICING_INPUT_IDS,
  SURGE_SUSPENSION_MAX_HOURS,
} from './pricing'

export type { AuditAction, AuditEntry } from './audit'

export type {
  AuthIdentity,
  AuthIdentityOutcome,
  DeviceSession,
  ReauthenticateInput,
  ReauthenticateOutcome,
  RequestPasswordResetOutcome,
  ResendCodeOutcome,
  ResetPasswordOutcome,
  SecondFactor,
  SignInFailureReason,
  SignInOutcome,
  TokenState,
  TotpEnrolment,
  ValidateTokenOutcome,
  VerifyCodeOutcome,
  VerifyFailureReason,
} from './auth'

export type {
  OnboardingChecklist,
  OnboardingCompletion,
  OnboardingDestination,
  OnboardingState,
  OnboardingStep,
  OnboardingTracks,
} from './onboarding'

export type { RecruitmentPriority, Zone, ZoneHealthSummary, ZoneSteerOffer } from './zone'
export { HEALTHY_DEMAND_PER_CAPTAIN, RECRUITMENT_PRIORITY_TONE, STARVED_RATIO } from './zone'

/* ── the report builder's semantic layer (06-report-builder.md, D13) ──── */

export type {
  BucketAggregate,
  Dimension,
  DimensionKey,
  DimensionRef,
  Measure,
  MeasureCoverage,
  MeasureGrain,
  MeasureKey,
  MeasurePairRefusal,
  MeasurePopulation,
  Temporality,
} from './measure'

export { GRAIN_RANK, pairRefusal, pairableWith } from './measure'

export type {
  AlertCadence,
  AlertComparator,
  AlertEvaluation,
  AlertFiring,
  AlertRule,
  AlertState,
  ChartType,
  Dashboard,
  DashboardTile,
  DeleteReportOutcome,
  MeasureRef,
  OptionLegality,
  PeriodComparison,
  QueryPlan,
  QueryViolation,
  QueryViolationCode,
  ReportCsv,
  ReportCsvHeader,
  ReportCsvRow,
  ReportGrain,
  ReportPanel,
  CohortGrain,
  CohortSpec,
  FunnelSpec,
  FunnelStep,
  JourneySpec,
  ReportMode,
  ReportPreset,
  ReportQuery,
  ReportResult,
  ReportSeries,
  ReportVisibility,
  ReportWarning,
  ReportWindow,
  RunReportOutcome,
  SaveAlertOutcome,
  SaveDashboardOutcome,
  SaveInvalid,
  SaveInvalidReason,
  SaveReportOutcome,
  SavedReport,
} from './report'

/* P7-T1's values. `reportMode(query)` rather than `query.mode` at every call
   site: `mode` is optional so that every link written before the field existed
   still parses, and absence means `trend`. */
export {
  DEFAULT_REPORT_MODE,
  REPORT_MODES,
  REPORT_NAME_MAX,
  normaliseReportQuery,
  reportMode,
} from './report'

export type {
  Ticket,
  TicketCallLog,
  TicketCallOutcome,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from './ticket'
/* A value, not a type — `verbatimModuleSyntax` means it cannot ride on the
   `export type` line above, and a barrel that re-exports the union while
   withholding the array of its members forces every caller to write the list
   out again. */
export { TICKET_CALL_OUTCOMES } from './ticket'

/* ── the support conversation centre (P5-T1) ─────────────────────────── */

export type {
  AgentPresence,
  Conversation,
  ConversationChannel,
  ConversationCloseReason,
  ConversationEvent,
  ConversationParticipant,
  ConversationStatus,
  Message,
  MessageAttachment,
  MessageDelivery,
  MessageDeliveryState,
  MessageDirection,
  MessageVisibility,
  ParticipantKind,
  PresenceState,
  TypingState,
} from './conversation'

export {
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  MESSAGE_DELIVERY_STATES,
  TYPING_TTL_SECONDS,
  channelIsLive,
  channelReportsRead,
  deliveryAttempts,
  deliveryCanRetry,
  deliveryIsWellFormed,
  isConversationEvent,
  messageSubjectIsWellFormed,
} from './conversation'

/* ── the operator lifecycle (P6-T5) and the workspace pane (P6-T1) ────── */

export type {
  OnCallRota,
  OperatorSessionsResult,
  SecurityPolicy,
  TeamGuardCode,
  TeamInvite,
  TeamInviteInput,
  TeamTransition,
} from './team'

/**
 * The F-016 predicate is exported as a VALUE, not only as a type. A surface
 * that has to disable a control in place (§11.2) asks the same question the
 * client asks, so the two cannot word or scope the refusal differently.
 */
export { manageTeamGuard, manageTeamHolders } from './team'

export type {
  LegalDocument,
  ReconsentResult,
  WorkspaceCurrency,
  WorkspaceLogo,
  WorkspaceSettings,
  WorkspaceSettingsPatch,
  WorkspaceTimezone,
} from './workspace'

export { MAX_LOGO_BYTES } from './workspace'

/* ── Support › Disputes & Lost and Found ─────────────────────────────── */

export type {
  Dispute,
  DisputeClaimantType,
  DisputeEvidence,
  DisputeEvidenceSource,
  DisputeKind,
  DisputeOutcome,
  DisputeResolution,
  DisputeStatus,
  LostFoundItem,
  LostFoundStatus,
} from './dispute'

/**
 * Values, not only types. `LOST_FOUND_FLOW` is the transition ladder the screen
 * reads instead of carrying its own chain of ternaries, and `outcomeMovesMoney`
 * is the one place that says which verdict pays — a screen re-deriving either is
 * a second answer waiting to disagree with this one.
 */
export {
  DISPUTE_KINDS,
  DISPUTE_OUTCOMES,
  DISPUTE_STATUSES,
  LOST_FOUND_FLOW,
  LOST_FOUND_STATUSES,
  nextLostFoundStatus,
  outcomeMovesMoney,
} from './dispute'
