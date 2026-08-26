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
