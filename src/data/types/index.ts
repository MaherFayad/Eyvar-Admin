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
  ProposedRoleName,
  RoleName,
  Session,
  TeamUser,
  TeamUserStatus,
  UserPreferences,
} from './session'

export { ROLE_NAMES } from './session'

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
  ComplianceDocState,
  ComplianceDocType,
  Driver,
  DriverCompliance,
  DriverStatus,
  DriverTier,
  MovementLogEntry,
  PlanAccess,
  VehicleClass,
} from './driver'

export { COMPLIANCE_DOC_TYPES } from './driver'

export type { ChurnRisk, NewRider, Rider, RiderStatus, RiderTier } from './rider'

export type { Applicant, ApplicantDoc, ApplicantDocStatus, ApplicantStatus } from './applicant'

export type { Trip, TripKind, TripStatus } from './trip'

export type { PlanKey, Subscription, SubscriptionStatus } from './subscription'

export type {
  CorporateAccount,
  CorporateAccountStatus,
  CorporateBillingType,
  CorporateUsagePolicy,
} from './corporateAccount'

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

export type { WorkItem } from './work'
export { WORK_QUEUE_ROUTE, WORK_ROUTING } from './work'

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
  FinancialsOverview,
  FinancialsPeriod,
  InvoiceSequence,
  PaymentGateway,
  PayoutState,
  Refund,
  RefundDestination,
  RevenueByPlanRow,
  VatConfig,
  WalletSummary,
} from './financials'

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

export { REPORT_NAME_MAX } from './report'

export type { Ticket, TicketMessage, TicketPriority, TicketStatus } from './ticket'
