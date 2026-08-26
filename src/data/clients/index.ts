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
  findShellLayer,
  findSubTabById,
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
  METRIC_OPERATIONS,
  getMetricBoard,
  getMetricFacets,
  getMetricSeries,
  listMetrics,
  type MetricQuery,
} from './metrics'

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
}
