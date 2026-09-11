# 04 — Alerting v2: monitors, a feed, channels, a history

> Decisions needed: **D41** (server evaluation on Vercel Cron, two cadences), **D43**
> (email and Slack channels, recipient permission at delivery). Phases: **P5** (client),
> **P6** (server). Reference: Amplitude chart monitors (automatic anomaly at a confidence
> interval with a direction; manual absolute, relative-delta and relative-percent operators
> with a comparison interval; daily or hourly frequency; email / Slack / Teams delivery; an
> alerts feed; a config history).

## 1. What stays from spec 06 §12

- One rule targets one series of one saved report. The report is the definition; the rule is
  a condition on it.
- The state machine `armed → firing → cooling → armed`, `suspended`, `error`; hysteresis by
  default; `minReArmMinutes` as the backstop; `mutedUntil` silences delivery, not evaluation.
- A partial bucket is never evaluated. The most recent **complete** bucket at
  `evaluationGrain` is the one tested.
- Delivery lands in the notification centre; nav badges are untouched; no red anywhere. A
  firing rule reads `Firing` in words and a `warning` badge.
- `Test this rule` evaluates once, now, in the foreground, and says "would have fired".
- Evaluation authority is the owner; a recipient who cannot see the measure is not a legal
  recipient.

## 2. Conditions (`src/data/types/alert.ts`, split out of `report.ts`)

```
AlertCondition =
  | { kind: 'static';   comparator: 'gt' | 'gte' | 'lt' | 'lte'; threshold: number }                     // v1, unchanged
  | { kind: 'relative'; direction: 'up' | 'down' | 'either'; measure: 'delta' | 'percent'; amount: number;
      against: 'previous-bucket' | 'same-bucket-previous-week' | 'previous-period' }
  | { kind: 'anomaly';  direction: 'above' | 'below' | 'either'; confidence: 95 | 99; lookback: number | null }
  | { kind: 'missing';  bucketsMissing: number }                                                           // fires when the last n complete buckets are null
```

- `static.threshold` stays in the series' wire unit (halalas for money); the unit is derived.
- `relative.amount` is in the measure's unit for `delta` and in percent points for `percent`.
  `against: 'same-bucket-previous-week'` is legal only at `day` grain; `previous-period`
  compares the bucket to the same bucket one window back (the rule's `evaluationGrain` window
  length is the lookback the report used).
- `anomaly` is computed by `src/data/reporting/anomaly.ts`, pure and shared by the mock and the
  server: over the last `lookback` complete buckets (default 28 for `day`, 12 for `week`, 6 for
  `month`; minimum 8, else `no-baseline`), the band is `median ± k × MAD × 1.4826` with
  `k = 2.0` at 95 and `k = 2.6` at 99; for `day` grain the baseline is taken from the same
  weekday when at least 4 such buckets exist, else from all buckets. The evaluation records
  the band so the history and the chart can draw it. This is a stated, simple estimator; it is
  not Amplitude's model and the copy does not claim otherwise (`rb.alert.anomaly.method`).
- `missing` is the pipeline check: `bucketsMissing` complete buckets in a row are `null`.

`AlertRule` v2 fields (replacing `comparator` and `threshold`, kept readable in v1 form by
`normaliseAlertRule` which lifts them into `condition`):

```
AlertRule {
  id, name, reportId, seriesId
  condition: AlertCondition
  evaluationGrain: 'day' | 'week' | 'month'
  cadence: 'hourly' | 'daily' | null          // D41: the two server cadences; null = not scheduled
  minReArmMinutes: number | null
  consecutiveFailuresBeforeError: number      // 5
  channels: AlertChannel[]                    // D43
  recipientIds: string[]                      // in-app recipients (TeamUser ids)
  severity: 'high' | 'critical'               // renamed from notificationPriority; 'critical' gated as before (Q-RB-9)
  enabled, mutedUntil, state, stateReasonKey
  ownerId, lastEvaluatedAt, lastFiredAt, lastValue, lastBand: { low, high } | null
  acknowledgedAt: IsoDateTime | null, acknowledgedBy: string | null   // per firing, mirrored on the rule for the list
  labels: string[]
  createdAt, updatedAt, updatedBy
}
AlertChannel = { type: 'in-app' } | { type: 'email'; userIds: string[] } | { type: 'slack'; webhookId: string }
```

`in-app` is always present and cannot be removed (the notification centre is the record).
`email` targets team users, never free addresses, so the permission check has an identity to
check. `slack` references a webhook stored server-side (`webhooks` table, secret encrypted,
created by `manage_team` under Admin › Integrations), never a URL typed into the rule.

## 3. Evaluation (server; the mock mirrors it for `Test this rule`)

`src/data/reporting/alerts/evaluate.ts`, pure: `evaluate(rule, result, now): AlertEvaluation`.
The server and the mock both call it; the server persists the transition.

```
AlertEvaluation {
  ruleId, evaluatedAt, bucketStart | null, value | null, unit, currency
  band: { low, high } | null                     // anomaly
  reference: { value, bucketStart } | null       // relative
  outcome: 'would-fire' | 'would-not-fire' | 'no-complete-bucket' | 'no-baseline' | 'series-missing' | 'series-blocked' | 'report-missing'
  transition: { from: AlertState; to: AlertState } | null     // null in foreground tests
  stateChanged: boolean
}
```

Cadence: `hourly` rules are evaluated by `/api/cron/alerts-hourly` (`0 * * * *`), `daily` by
`/api/cron/alerts-daily` (`15 3 * * *` UTC, 06:15 Riyadh, after the day has closed and the
snapshot cron has run). A rule at `week` or `month` grain on a daily cadence evaluates every
day and fires only when the tested complete bucket is a new one (the last tested bucket is
stored as `lastBucketStart`), so a weekly rule fires once per week, not seven times.

The state machine is implemented once, in `src/data/reporting/alerts/machine.ts`, pure, and
tested with every transition in spec 06 §12.4 plus: `error` after 5 failures notifies the
owner once; `suspended` when the owner's permission is gone; a recipient dropped when their
permission is gone (D43) with an owner notification; `mutedUntil` suppressing delivery but not
transitions; `minReArmMinutes` elapsing.

Delivery, per firing, in this order: an `alert_firings` row; a `Notification` row per in-app
recipient (`type: 'alert'`, `route` = the report at the evaluated window, spec 06 §12.5);
email per `email` channel user who still holds the permission; Slack per webhook. Each
delivery attempt is a row in `alert_deliveries` with `status: 'sent' | 'failed'` and the error,
so the history can show that Slack failed without pretending the firing did not happen.

## 4. The alerts surface (`?view=alerts`)

Two tabs inside the view (a `ViewTabs` control, not a route): **Rules** and **Firings**.

**Rules** (the existing table, extended): name with the rule sentence in `title`; condition
summary (`> 40 SAR`, `↓ 20 % vs previous bucket`, `outside 99 % band`); state; cadence
(now editable); last value with a 30-evaluation sparkline that draws the threshold line or the
band (`Sparkline` with a `ReferenceLine`, view-only); last evaluated; channels as glyphs with
`title`; labels. Filters: state, cadence, label, owner. Row actions: edit, `Test now`,
`Mute for…` (a small inline menu: 1 h, 8 h, 24 h, until Monday, custom date; no dialog),
duplicate, history, delete. A banner (R10, one) when the runner… no: when **no rule has a
cadence**, explaining that a rule without a cadence never evaluates, with `Set cadence` as the
banner's action. The banner about the missing scheduler is removed once D41 lands.

**Firings** (new): a ledger (`useIndexTable({ mode: 'ledger' })`) across all rules the viewer
may see: fired at, rule, value against threshold or band, bucket, severity, acknowledged by,
deliveries (in-app ✓ · email ✓ · slack ✗ with the error in `title`), `Explain` (opens the
analyst composer with the firing attached, [01-analyst-agent.md](01-analyst-agent.md) §4).
Row action `Acknowledge` (writes `acknowledgedAt/By`; no state change). Filters: rule, date,
acknowledged, severity. Empty: first-run illustration "No alert has fired yet" only when no rule
exists; when rules exist but nothing fired, one grey sentence.

**The rule composer** (`AlertRuleDialog` becomes an inline panel opened from the toolbar or
from a chart, per the owner's no-dialog ruling; the file keeps its name until the rename
sweep): name; report and series (unchanged, series resolved by running the report); condition
kind as a segmented control (`Threshold · Change · Anomaly · Missing data`) with the fields of
the chosen kind; a **preview chart** beneath the condition that draws the series' last 60
complete buckets with the threshold line or the band and marks where the rule would have fired
(computed by `evaluate()` over a sliding window, client-side, view-only); evaluation grain;
cadence (`Hourly · Daily`, with `Not scheduled` as the third, explained); re-arm (minutes,
optional); channels (in-app fixed; email user picker filtered to users who hold the measure's
permission; Slack webhook picker); recipients; severity (`critical` disabled with the reason
until Q-RB-9); labels. Primary: `Save rule`. A second `Test now` button reuses the existing
evaluation path.

**From a chart** (G15): the toolbar bell in the builder. On an unsaved report it first saves
(`Save to alert`, name required inline), then opens the composer with report and the first
current series prefilled. From a page's report block, the block menu's `Create alert…` does
the same with the block's report.

## 5. History and audit

- `alerts.history` (firings per rule) is unchanged in shape and gains `deliveries[]` and
  `band`.
- `alerts.config-history` is new: every save of a rule writes a row `{ at, by, diff }`, shown
  in a `Changes` tab of the history panel (Amplitude's monitor history). The diff is rendered
  as `field: old → new` with keyed field labels.
- The notification centre's alert notification gains `Acknowledge` and `Explain` actions.

## 6. Digest

Optional per operator (Profile › Notifications): a daily 08:00 Riyadh in-app notification
summarising firings in the last 24 h across the rules they receive, with counts by rule and a
link to the feed. Generated by `/api/cron/alerts-digest` (`0 5 * * *` UTC). Off by default.

## 7. States, added to spec 06 §8.3

| # | State | Sees | Reachable |
|---|---|---|---|
| 23 | No baseline (anomaly) | Rule row states `Needs 8 complete buckets · 5 so far`; `Test now` returns `no-baseline` | a short-coverage measure |
| 24 | Delivery failed | Firing row shows the failed channel with the error; the firing itself is unaffected | seeded `alert_deliveries` failure |
| 25 | Recipient dropped | Owner notification names the recipient and the reason; the rule row lists remaining recipients | `switchMockUser` losing a permission |
| 26 | Muted | Rule row shows `Muted until 18:00`; firings still recorded, deliveries suppressed and marked `muted` | `Mute for 1 h` |
| 27 | Acknowledged | Firing row shows who and when | `Acknowledge` |
| 28 | Evaluation lag | Rule row shows `Last evaluated 3 h ago · expected hourly` in the warning tone when lag > 2 × cadence | server clock |

## 8. Copy

Under `rb.alert.*`: `rb.alert.kind.<static|relative|anomaly|missing>.name/.desc`, `rb.alert.sentence.<kind>`
(the human sentence with named params), `rb.alert.channel.<type>`, `rb.alert.mute.<option>`,
`rb.alert.feed.*`, `rb.alert.history.changes.*`, `rb.alert.anomaly.method` (the one sentence that
states the estimator honestly), `rb.alert.state.lag`. Arabic in `src/i18n/ar/reports.ts`.

## 9. What the backend receives

Full CRUD as today plus `alerts.firings` (cross-rule feed), `alerts.acknowledge`,
`alerts.mute`, `alerts.configHistory`, `alerts.evaluate` (foreground), and the three crons.
The evaluator, the machine and the anomaly estimator are imported from `src/data/reporting/`
so the server cannot disagree with the preview the operator saw. See
[05-backend.md](05-backend.md) §8.
