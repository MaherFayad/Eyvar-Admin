/**
 * Alert rules and firing history — moved out of `reports.ts` (D42 split
 * `AlertRule` into `types/alert.ts`), extended for v2 (`04-alerting-v2.md`).
 *
 * `ALR-1` … `ALR-5` are unchanged from the v1 set and keep their ids: `ALR-1`
 * is what `fixtures/notifications.ts`'s seeded `N11` points at, and
 * `AlertHistoryDialog.tsx`'s own comment already assumes it fired twice
 * (`AFR-1`, `AFR-2`). `ALR-6` … `ALR-11` are new, one per v2 condition kind
 * plus the delivery and acknowledgement states §7 of the alerting doc adds.
 *
 * ## Two states this file cannot fully seed, and why
 *
 * `AlertFiring` (`types/alert.ts`) has no `deliveries[]` or `band` field yet,
 * though `04-alerting-v2.md` §5 says the history "gains `deliveries[]` and
 * `band`". Until that type is widened, **state 24 (delivery failed)** has no
 * field to carry the failed Slack attempt — `ALR-11` is wired with a `slack`
 * channel so it is ready the day the type lands, and `AFR-4` is its ordinary
 * firing. Likewise `AlertEvaluation.outcome` has no `'no-baseline'` member
 * (`clients/alerts.ts` says the same thing: "widening that type is WP-1.7's"),
 * so **state 23 (no baseline)** — `ALR-9`, seven daily buckets against a
 * 28-bucket default lookback — evaluates today and folds into
 * `no-complete-bucket` rather than naming itself. Both are real fixture gaps,
 * not fixtures I chose not to write; see the handoff for who owns each type.
 *
 * Every cadence stays `null`, for the same reason the v1 set gave: no
 * scheduler exists yet and an invented window is indistinguishable from a
 * measured one once it is in a fixture (AC-453).
 */

import { offsetFromNow } from '../mock/clock'
import type { AlertFiring, AlertRule } from '../types/alert'

export const alertRuleFixtures: AlertRule[] = [
  {
    id: 'ALR-1',
    name: 'Cancellation rate over 6%',
    reportId: 'RPT-5',
    seriesId: 'trips.cancellationRate#_#current',
    comparator: 'gt',
    /* Six, not a round-looking eight: the last **complete** daily bucket in the
       snapshots is 24 Jun at 7 %, so this threshold makes the seeded `firing`
       state agree with what `alerts.evaluate` actually reads. A fixture whose
       state contradicts its own data is the defect this module is about. */
    threshold: 6,
    thresholdUnit: 'percent',
    thresholdCurrency: null,
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    /* Seeded `firing`, because nothing evaluates: §4.4.4 requires one already
       fired rule with a matching notification, or the entire delivered state of
       §12 is unreachable without a scheduler. */
    state: 'firing',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-1', 'USR-5'],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -2 }),
    lastFiredAt: offsetFromNow({ hours: -2 }),
    /* 24 Jun — the last **complete** bucket, at 7 %. 25 Jun reads 9 % and is
       never evaluated, because at 09:14 it is nine hours of a day (§12.3). The
       rule fired on the edge, not on the level (§12.4). */
    lastValue: 7,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -11 }),
    updatedAt: offsetFromNow({ hours: -2 }),
  },
  {
    id: 'ALR-2',
    name: 'Gross revenue below SAR 400 a day',
    reportId: 'RPT-3',
    seriesId: 'revenue.total#_#current',
    comparator: 'lt',
    /* Halalas on the wire, SAR in the field. An operator typing `400` against a
       money measure means 400 SAR; this is that, without loss (AC-876). */
    threshold: 40_000,
    thresholdUnit: 'money',
    thresholdCurrency: 'SAR',
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    /* Muted, still evaluating (§7 state 26). §12.4: the state machine keeps
       running while muted so the rule re-arms correctly, and the first
       notification after the mute expires is a fresh crossing, not a replay
       (AC-887). */
    mutedUntil: offsetFromNow({ hours: 20 }),
    recipientIds: ['USR-2'],
    ownerId: 'USR-2',
    notificationPriority: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -6 }),
    lastFiredAt: null,
    lastValue: 64_737,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -18 }),
    updatedAt: offsetFromNow({ hours: -6 }),
  },
  {
    id: 'ALR-3',
    name: 'Subscription revenue drop',
    reportId: 'RPT-3',
    seriesId: 'revenue.subscription#_#current',
    comparator: 'lt',
    threshold: 25_000,
    thresholdUnit: 'money',
    thresholdCurrency: 'SAR',
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    /* §13.3 — the owner lost access to the measure. It stops evaluating
       immediately: *"an alert that outlives its owner's permission is a
       permission grant with no record of being granted."* USR-3 (Support) holds
       no `view_finance`, so switching to that user reproduces the cause. */
    state: 'suspended',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-3'],
    ownerId: 'USR-3',
    notificationPriority: 'high',
    lastEvaluatedAt: offsetFromNow({ days: -4 }),
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: 'rb.alert.suspended.ownerLostAccess',
    createdAt: offsetFromNow({ days: -25 }),
    updatedAt: offsetFromNow({ days: -4 }),
  },
  {
    id: 'ALR-4',
    name: 'Completed trips below 3 a day',
    reportId: 'RPT-2',
    seriesId: 'trips.completed#_#current',
    comparator: 'lt',
    threshold: 3,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    /* Five consecutive failures. Notified **once**, to the owner only — *"an
       alert that is broken is the owner's problem, not the recipients'"*
       (§12.4, AC-886). */
    state: 'error',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-5'],
    ownerId: 'USR-5',
    notificationPriority: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -9 }),
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: 'rb.alert.error.runFailed',
    createdAt: offsetFromNow({ days: -7 }),
    updatedAt: offsetFromNow({ hours: -9 }),
  },
  {
    id: 'ALR-5',
    name: 'قاعدة تنبيه غير مفعّلة · انخفاض عدد الكباتن المسجلين',
    reportId: 'RPT-1',
    seriesId: 'captains.registered#_#current',
    comparator: 'lte',
    threshold: 40,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'week',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    /* Disabled by its operator. Distinct from `suspended`, which the server
       does, and from `mutedUntil`, which silences without stopping. */
    enabled: false,
    mutedUntil: null,
    recipientIds: [],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    lastEvaluatedAt: null,
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -1 }),
    updatedAt: offsetFromNow({ days: -1 }),
  },
  {
    /* v2 condition kind: `relative`. The v1 pair mirrors it roughly
       (`alertCondition()` ignores them once `condition` is set) but the type
       still requires them. */
    id: 'ALR-6',
    name: 'Completed trips down 20% vs the previous bucket',
    reportId: 'RPT-18',
    seriesId: 'trips.completed#_#current',
    comparator: 'lt',
    threshold: 20,
    thresholdUnit: 'percent',
    thresholdCurrency: null,
    condition: { kind: 'relative', direction: 'down', measure: 'percent', amount: 20, against: 'previous-bucket' },
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-1'],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    severity: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -5 }),
    lastFiredAt: null,
    lastValue: 8,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -6 }),
    updatedAt: offsetFromNow({ hours: -5 }),
  },
  {
    /* v2 condition kind: `anomaly`, and §7 state 25 (recipient dropped):
       USR-3 (Support) holds no `view_finance` and is a recipient anyway. */
    id: 'ALR-7',
    name: 'Gross revenue outside its usual band',
    reportId: 'RPT-3',
    seriesId: 'revenue.total#_#current',
    comparator: 'lt',
    threshold: 40_000,
    thresholdUnit: 'money',
    thresholdCurrency: 'SAR',
    condition: { kind: 'anomaly', direction: 'below', confidence: 95, lookback: 28 },
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-2', 'USR-3'],
    ownerId: 'USR-2',
    notificationPriority: 'high',
    severity: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -6 }),
    lastFiredAt: null,
    lastValue: 64_737,
    lastBand: { low: 50_000, high: 90_000 },
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -15 }),
    updatedAt: offsetFromNow({ hours: -6 }),
  },
  {
    /* v2 condition kind: `missing`. */
    id: 'ALR-8',
    name: 'No newly registered captains for 2 days',
    reportId: 'RPT-1',
    seriesId: 'captains.registered#_#current',
    comparator: 'lt',
    threshold: 1,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    condition: { kind: 'missing', bucketsMissing: 2 },
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-1'],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    severity: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -3 }),
    lastFiredAt: null,
    lastValue: 2,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -5 }),
    updatedAt: offsetFromNow({ hours: -3 }),
  },
  {
    /* §7 state 23 candidate: `RPT-13`'s window is seven daily buckets, short
       of the 28-bucket default lookback, so a real evaluator returns
       `no-baseline`. See the file header — the wire type does not carry that
       outcome yet, so `Test now` reads `no-complete-bucket` until it does. */
    id: 'ALR-9',
    name: 'New subscriptions outside their usual band',
    reportId: 'RPT-13',
    seriesId: 'subscriptions.started#_#current',
    comparator: 'lt',
    threshold: 1,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    condition: { kind: 'anomaly', direction: 'below', confidence: 95, lookback: null },
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-2'],
    ownerId: 'USR-2',
    notificationPriority: 'high',
    severity: 'high',
    lastEvaluatedAt: null,
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -3 }),
    updatedAt: offsetFromNow({ days: -3 }),
  },
  {
    /* §7 state 27: the firing (`AFR-3`) is acknowledged, mirrored here. */
    id: 'ALR-10',
    name: 'Riders registered below 10 a week',
    reportId: 'RPT-1',
    seriesId: 'riders.registered#_#current',
    comparator: 'lt',
    threshold: 10,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'week',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'firing',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-1', 'USR-2'],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    lastEvaluatedAt: offsetFromNow({ hours: -18 }),
    lastFiredAt: offsetFromNow({ hours: -18 }),
    lastValue: 8,
    acknowledgedAt: offsetFromNow({ hours: -10 }),
    acknowledgedBy: 'USR-2',
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -40 }),
    updatedAt: offsetFromNow({ hours: -10 }),
  },
  {
    /* §7 state 24 candidate — see the file header for the type gap. Channels
       carry a `slack` webhook so the row is ready once `deliveries[]` lands. */
    id: 'ALR-11',
    name: 'Active subscriptions below 30',
    reportId: 'RPT-14',
    seriesId: 'subscriptions.active#_#current',
    comparator: 'lt',
    threshold: 30,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: ['USR-1'],
    ownerId: 'USR-1',
    notificationPriority: 'high',
    severity: 'high',
    channels: [{ type: 'in-app' }, { type: 'slack', webhookId: 'WHK-1' }],
    labels: ['ops'],
    lastEvaluatedAt: offsetFromNow({ hours: -4 }),
    lastFiredAt: offsetFromNow({ days: -2 }),
    lastValue: 27,
    stateReasonKey: null,
    createdAt: offsetFromNow({ days: -9 }),
    updatedAt: offsetFromNow({ hours: -4 }),
  },
]

export const alertFiringFixtures: AlertFiring[] = [
  {
    id: 'AFR-1',
    ruleId: 'ALR-1',
    firedAt: offsetFromNow({ hours: -2 }),
    bucketStart: '2026-06-24',
    value: 7,
    threshold: 6,
    notificationId: 'N11',
  },
  {
    id: 'AFR-2',
    ruleId: 'ALR-1',
    firedAt: offsetFromNow({ days: -6 }),
    bucketStart: '2026-06-20',
    value: 9,
    threshold: 6,
    /* An older firing whose notification has since been cleared. `null` is a
       real state and the history must not imply the row is still in the inbox. */
    notificationId: null,
  },
  {
    id: 'AFR-3',
    ruleId: 'ALR-10',
    firedAt: offsetFromNow({ hours: -18 }),
    bucketStart: '2026-06-15',
    value: 8,
    threshold: 10,
    notificationId: null,
  },
  {
    id: 'AFR-4',
    ruleId: 'ALR-11',
    firedAt: offsetFromNow({ days: -2 }),
    bucketStart: '2026-06-23',
    value: 27,
    threshold: 30,
    notificationId: null,
  },
]
