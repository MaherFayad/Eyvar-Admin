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

export { PROFILE_OPERATIONS, resolveProfile, search } from './profile'

/* ── wave 1: Operations › People, Trips, Subscriptions, Corporate ────── */
export {
  DRIVER_OPERATIONS,
  getDriver,
  getDriverComplianceFacets,
  getDriverFacets,
  getDriverCompliance,
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
  listApplicants,
  rejectApplicant,
  releaseApplicant,
  type ApplicantQuery,
} from './applicants'

export {
  LOW_RATING_THRESHOLD,
  TRIP_OPERATIONS,
  getTrip,
  getTripFacets,
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
  type SubscriptionQuery,
} from './subscriptions'

export {
  CORPORATE_OPERATIONS,
  addCorporateEmployee,
  createCorporateAccount,
  getCorporateAccount,
  getCorporateFacets,
  listCorporateAccounts,
  updateCorporateUsagePolicy,
  type CorporateQuery,
  type CreateCorporateAccountInput,
} from './corporateAccounts'

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
  replyTicket,
  resolveTicket,
  reopenTicket,
  createTicket,
  type TicketQuery,
} from './tickets'

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
export function resetDataLayer(): void {
  clearFailures()
  resetSession()
  resetCounts()
  resetNotifs()
  resetSafety()
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
}
