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

export type { ChurnRisk, NewRider, Rider, RiderStatus, RiderTier, WalletTransaction } from './rider'

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
  BoardNotice,
  BoardNoticeTone,
  DailySnapshot,
  Metric,
  MetricBoard,
  MetricBreakdown,
  MetricBreakdownRow,
  MetricCategory,
  MetricComparison,
  MetricDirection,
  MetricUnit,
  NoComparisonReason,
  SeriesPoint,
  SeriesWindow,
  TimeSeries,
} from './metrics'
