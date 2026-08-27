# 05 — The wave-2 work queues and the wave-4 metric boards

> Owner: mock-data-engineer. Everything below is inside `src/data/`.
> Consumers: **frontend-engineer** (data is ready), **qa-engineer** (failure injection is
> wired), **product-owner** (§6 — the values I am waiting on), **product-designer**
> (§7 — three findings that are design decisions, not data ones).
>
> Supersedes nothing. Extends the wave-1 seam with six resources and one derived view.

---

## 0. Status

```
$ npx vitest run src/data
 ✓ src/data/fixtures/navCounts.test.ts   (15 tests)
 ✓ src/data/clients/metrics.test.ts      (22 tests)
 ✓ src/data/clients/routes.test.ts       (33 tests)
 ✓ src/data/clients/workQueues.test.ts   (61 tests)
 ✓ src/data/clients/filters.test.ts      (44 tests)
 ✓ src/data/clients/seam.test.ts        (102 tests)

 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 276 passed (277)
```

Wave 1 left 137. All 137 still run and pass; 140 were added.

**The one red test is `seam.test.ts > no component imports a fixture`, and it is doing its
job.** `src/screens/metrics/copy.test.ts:37` imports `metricSeeds` and `timeSeriesFixtures`
from `@/data/fixtures/metrics` directly. That is the seam failing, and the fix is a
one-line import change in a file I do not own — see §7.4. I have added the seam-legal
replacement (`METRIC_KEYS`, `METRIC_SERIES_KEYS`, exported from `@/data/clients`) so the
change is a swap rather than a rewrite. **I have not edited another owner's file to make
my own test go green.**

`npx tsc --noEmit` is clean for `src/data`. Three pre-existing errors remain in
`src/screens/operations/people/*` — unused locals in another owner's in-flight files, not
mine to touch.

`npx vitest run` (whole repo): **962 passed, 1 failed** — `src/shell/qa.copy.test.tsx >
AC-39`, caused by one string in `src/screens/metrics/copy.ts`. Also §7.4. Neither red test
is a data-layer failure and neither is fixable from inside `src/data`.

---

## 1. What landed

| Resource | Type | Fixture | Client | Sub-tab |
|---|---|---|---|---|
| `RideRequest` | `types/request.ts` | `fixtures/requests.ts` | `clients/requests.ts` | Operations › Requests |
| `SafetyIncident` | `types/safety.ts` | `fixtures/safety.ts` | `clients/safety.ts` | Support › Safety & Incidents |
| `FairnessCase` | `types/fairness.ts` | `fixtures/fairness.ts` | `clients/fairness.ts` | Support › Captain Fairness |
| `AssuranceTrip` | `types/assurance.ts` | `fixtures/assurance.ts` | `clients/assurance.ts` | Operations › Trip Assurance |
| `AbsenceEvent` | `types/assurance.ts` | `fixtures/assurance.ts` | `clients/assurance.ts` | …view `absences` |
| `WorkItem` | `types/work.ts` | **none, deliberately** | `clients/myWork.ts` | Operations › My Work |
| `Metric` · `TimeSeries` · `MetricBoard` | `types/metrics.ts` | `fixtures/metrics.ts` | `clients/metrics.ts` | 9 boards (wave 4) |

Shared: `types/workQueue.ts` — `SlaTracked`, `WorkQueueRow`, `WorkQueueId`,
`WorkItemSeverity`, `SlaSource`.

**`Applicant` was retro-fitted onto `SlaTracked`, not left as a second shape.** It gained
`slaStartedAt`, `slaTargetMinutes`, `slaBreachedAt`, `slaSource`, and the three
first-response fields. Its `breached` view now reads the stamp instead of comparing
`slaDueAt` to the clock — which was wrong on `APP-2203`.

**`WorkItem` has no fixture on purpose.** My Work is a routing layer over the other
queues, exactly as legacy `inboxItems()` is (`:19119`). `clients/myWork.ts` derives it, and
`filters.test.ts` asserts both directions: no row here that its source queue does not
serve, and no breach here that its source queue disagrees with.

---

## 2. The endpoint list

Every client documents its endpoint above the function. Consolidated:

### Requests
```
GET    /api/v1/requests                    ?q&channel&status&page&pageSize&sort&filter&view
GET    /api/v1/requests/:id
GET    /api/v1/requests/facets             ?view
POST   /api/v1/requests/:id/claim          { takeOver? }        409 claimed_by_other
POST   /api/v1/requests/:id/release
POST   /api/v1/requests/:id/assign         { driverId }         409 request_not_open · 422 driver_required
POST   /api/v1/requests/:id/expire
```
views: `all` `instant` `subscription` `pending` `assigned` `expired` `mine` `unassigned` `breached`

### Safety & incidents
```
GET    /api/v1/incidents                   ?q&status&type&page&pageSize&sort&filter&view
GET    /api/v1/incidents/:id
GET    /api/v1/incidents/facets            ?view
POST   /api/v1/incidents/:id/claim         { takeOver? }        409 claimed_by_other
POST   /api/v1/incidents/:id/release
PATCH  /api/v1/incidents/:id/protocol/:step { done }            409 incident_closed
POST   /api/v1/incidents/:id/precautionary-suspension { reason } 422 no_counterparty
POST   /api/v1/incidents/:id/close                               422 protocol_incomplete
```
views: `open` `critical-sos` `closed` `all` `mine` `unassigned` `breached`

### Captain fairness
```
GET    /api/v1/fairness-cases              ?q&kind&status&page&pageSize&sort&filter&view
GET    /api/v1/fairness-cases/:id
GET    /api/v1/fairness-cases/facets       ?view
POST   /api/v1/fairness-cases/:id/claim    { takeOver? }        409 claimed_by_other
POST   /api/v1/fairness-cases/:id/release
POST   /api/v1/fairness-cases/:id/decide   { outcome, rationale } 409 already_decided · 422 rationale_required
```
views: `suspension-appeals` `rating-disputes` `rider-reports` `all` `open` `decided` `mine` `unassigned` `breached`

### Trip assurance
```
GET    /api/v1/assurance/trips             ?q&subscriptionId&page&pageSize&sort&filter&view
GET    /api/v1/assurance/trips/:id
GET    /api/v1/assurance/trips/facets      ?view
POST   /api/v1/assurance/trips/:id/claim   { takeOver? }        409 claimed_by_other
POST   /api/v1/assurance/trips/:id/release
POST   /api/v1/assurance/trips/:id/acknowledge { source, note? } 422 note_required
POST   /api/v1/assurance/trips/:id/backup-offer { driverId }     409 offer_outstanding
GET    /api/v1/assurance/absences          ?q&driverId&page&pageSize&sort&filter&view
POST   /api/v1/assurance/absences/:id/waive { reason }           422 reason_required
```
trip views: `departing-24h` `no-backup-captain` `awaiting-confirmation` `all` `uncovered` `mine` `unassigned` `breached`
absence views: `absences` `all` `counting` `waived` `decayed`

### My Work
```
GET    /api/v1/work-items                  ?q&queue&includeOtherRoles&page&pageSize&sort&filter&view
GET    /api/v1/work-items/facets           ?view
```
views: `mine` `unassigned` `everything` `breached`

### Metrics (wave 4)
```
GET    /api/v1/metrics/boards/:subTabId    ?from&to        404 when the sub-tab has a table
GET    /api/v1/metrics                     ?q&subTabId&category&page&pageSize&sort&filter&view
GET    /api/v1/metrics/:key/series         ?from&to&compare
GET    /api/v1/metrics/facets              ?view
```
metric views: `all` `derived` `no-comparison` `against-target` `not-computable`

**Operation ids for failure injection** — `?mockFail=` or `mockFailures.always(...)`:

```
requests.list  requests.get  requests.facets  requests.claim  requests.release
requests.assign  requests.expire
safety.list  safety.get  safety.facets  safety.claim  safety.release  safety.step
safety.suspend  safety.close
fairness.list  fairness.get  fairness.facets  fairness.claim  fairness.release
fairness.decide
assurance.list  assurance.get  assurance.facets  assurance.claim  assurance.release
assurance.acknowledge  assurance.offerBackup  assurance.absences  assurance.waiveAbsence
work.list  work.facets
metrics.board  metrics.list  metrics.series  metrics.facets
```

QA scenario switches, all exported from `@/data/clients`:
`useQuietSafetyQueue()` / `resetSafetyIncidents()` · `useAbsenceHistory()` /
`resetAssurance()`. Both are also cleared by `resetDataLayer()`.

---

## 3. Filterable fields

Wave 1 declared 164. This wave adds **212** across six new shapes, plus **6** on
`Applicant` — **382** in the layer. Every one is grouped by control kind in its client's
`filterable` block, every closed set is in `facetable`, every date goes through
`toInstant`, and `filters.test.ts` asserts each one is reachable without throwing.

| Shape | Fields | Faceted |
|---|---:|---|
| `RideRequest` | 34 | channel · status · vehicleClass · planKey · slaSource · claimedBy · assignedDriverId · assignedByUserId |
| `SafetyIncident` | 37 | type · severity · status · reporterKind · reasonCode · workSeverity · slaSource · claimedBy · againstId |
| `FairnessCase` | 33 | kind · status · reasonCode · slaSource · claimedBy · decidedByUserId · driverId |
| `AssuranceTrip` | 47 | planKey · planName · captainDepartureState · ackSource · ackWeight · offerState · backupDriverId · claimedBy |
| `AbsenceEvent` | 13 | tier · driverId · subscriptionId |
| `WorkItem` | 24 | queue · severity · entityType · slaSource · claimedBy |
| `Metric` | 24 | subTabId · category · unit · sourceResource · comparisonKind · noComparisonReason |
| `Applicant` (+6) | 32 | + slaSource |

The six added to `Applicant`: `breached` · `hasSla` · `slaSource` · `slaTargetMinutes` ·
`slaStartedAt` · `slaBreachedAt`.

Boolean fields worth knowing about, because they exist so a screen never computes them:
`coverageNominal` (registered **and** ineligible), `ackAssumed` (a weak acknowledgement),
`counting` (an absence that is neither waived nor decayed), `hasReporter`, `hasSla`,
`improving` (moved in the direction that is good for *this* metric).

---

## 4. The SLA model

`slaDueAt` alone was not enough for five queues. `SlaTracked` is:

```ts
slaStartedAt · slaDueAt · slaTargetMinutes · slaBreachedAt · slaSource
firstResponseDueAt · firstResponseAt · firstResponseBreachedAt
```

Three things to build against:

**Breach is a stamp, never `slaDueAt < now`.** Four rows across four queues have a
deadline in the past and no breach, because they were disposed of inside their window:
`SREQ-002`, `REQ-505`, `INC-018`, `FC-0005`, `APP-2203`. And two rows are breached *and*
closed: `SREQ-005`, `REQ-506`. `workQueues.test.ts` asserts breaches < rows-past-deadline
across the whole layer, so the field cannot be reduced to a cached comparison.

**Two clocks.** Safety and Fairness make a promise to *answer* as well as to *finish*, and
the first breaks long before the second: `INC-014` and `INC-015` are first-response
breached and still inside their 60-minute resolve window. Requests, Assurance and
Applications have one clock and carry `null` in the three first-response fields.

**`slaSource` says where the number came from.** `legacy-policy` (a constant the legacy app
enforces), `legacy-reason-code` (`rcTargets(code).res`), or `unset` — nobody has decided.
`unset` is not a placeholder for whoever ships first; see §6.

| Queue | Window | Source |
|---|---|---|
| Requests · instant | 3 min | `if(secs>=180){r.status='no_drivers'…}` `:9832` |
| Requests · subscription | 120 min | `SUBREQ_SEARCH_HOURS=2` `:9577` |
| Fairness | 1440 / 2880 min by reason code | `DB.reasonCodes` `:14703`, via `rcTargets` `:14730` |
| Safety · sos / accident / unsafe-driving | 60 min | `SAF_*` §6 codes, T1 |
| Safety · theft | 1440 min | `SAF_THEFT` §6.3, T2 |
| Safety · harassment / other | **none** | no §6 code exists — **Q8** |
| Assurance | deadline 21:00 the evening before; **no window length** | `confirmDeadline` `:16545`; the window's *start* is undefined — **Q8** |
| Applications | 48 h **placeholder** | nothing — **Q8**, unchanged from wave 1 |

---

## 5. The nav badge, and the tone budget

`support-safety` went `0/neutral → 6/attention`. **`operations-people` went
`7/attention → 7/neutral`** — its count and badge are unchanged, it lost the colour.

Counts are now derived and asserted against the clients that serve the rows
(`navCounts.test.ts`): `operations-my-work` 22 = `myWorkBacklogSize()` ·
`operations-requests` 7 = open requests · `operations-assurance` 4 =
`view=no-backup-captain` · `support-safety` 6 = open incidents · `support-fairness` 4 =
open cases.

**The cap of two is still green, and it is now genuinely binding.** Wave 2 produced *four*
sub-tabs with evidenced open breaches against two slots, one of which is permanently spent
on `financials-cash` for the Q12 gate. "attention = breached" and "at most two" cannot both
hold. The fixture adopts a narrower reading and records it rather than resolving it
quietly — see §7.1.

---

## 6. What I am waiting on product-owner for

Every item below is **modelled and left open**. Nothing was synthesised.

| # | Question | Where the shape is | What happens until it is answered |
|---|---|---|---|
| **Q8-a** | **The application SLA window.** 48 h is still a placeholder. | `Applicant.slaTargetMinutes`, `slaSource: 'unset'` | Countdown renders; `operations-people` stays neutral because the breach rests on an undecided number. Answer it and People has a claim on an `attention` slot again. |
| **Q8-b** | **When does the leg-confirmation window open?** The deadline is known (21:00 the evening before, `:16545`); the length is not. | `AssuranceTrip.slaTargetMinutes: null` on every row | The screen can show "due 21:00" and **cannot** draw a progress track. Inventing a start is the `/90` bug at `:11652`. |
| **Q8-c** | **Is T1's `firstResponseMin: 0` a promise or a placeholder?** A zero-minute target means *every* first response is technically late — `INC-017` was answered in two minutes and is late by it. | `SAFETY_RESOLVE_MINUTES`, `firstResponseDueAt` | An unacknowledged SOS is breached the instant it opens, which is what justifies the one visible `attention` tone. If 0 is wrong, that tone moves. |
| **Q8-d** | **Safety windows for `harassment` and `other`.** No §6 reason code covers them. | `SAFETY_RESOLVE_MINUTES.harassment = null` | `INC-011` and `INC-019` render with no countdown, no track, `neutral` band. |
| **Q8-e** | **Confirm or change the two request windows** (3 min instant, 2 h subscription). Unlike the others these have a shipped value to confirm rather than a blank to fill. | `REQUEST_SLA_MINUTES` | Used as-is, cited. |
| **C-1** | **Is a claim past `OWNERSHIP_STALE_MINUTES` (30) free, or still held?** Raised in wave 1, still open. Legacy releases it as a side effect of *reading* (D-L12). | `liveClaim()` in `clients/requests.ts`, shared by four queues | Treated as free for the 409 check; the fixture keeps a stale claim so the screen has to decide visibly. |
| **D-1** | **Must a fairness decision carry a rationale?** Legacy never writes one — every decided case in the legacy app is unexplained (`:15597`). | `FairnessCase.rationale`, and a 422 in `decideFairnessCase` | The mock **requires** it, so the validation state is reachable. One line to relax if the answer is no. |
| **D-2** | **Reason codes for rejection and cancellation.** Both are still free text, wave 1's finding. | `Applicant.rejectionReason`, `Subscription.cancellationReason` | Free text. |
| **M-1** | **Targets.** Four metrics compare against a target (`sameCaptainKept` 95 %, `onTimePickup` 95 %, `promoSpend` cap, `liveCities` 4). Three have `setByUserId: null` because nobody owns them. | `MetricComparison { kind: 'target' }` | Rendered as declared. A target with no owner drifts. |
| **M-2** | **What is "revenue"?** Q7 (the commission split) is still open, so `totalRevenue` and `contributionMargin` are literals rather than derived from `Trip`. | `Metric.sourceResource: null` on both | Two numbers a screen will show that the backend cannot yet reproduce. |

---

## 7. Findings for other owners

### 7.1 product-designer — the tone budget is exhausted *(blocking a decision, not code)*

Four sub-tabs have evidenced, currently-open breaches; two slots exist; one is permanently
spent on `financials-cash`. `fixtures/navCounts.ts` adopts this working definition and
needs it confirmed or replaced:

> `attention` is a breach whose harm is **irreversible or statutory** — where waiting
> longer causes damage that cannot be undone afterwards.

That yields exactly one visible chip today (`support-safety`) and leaves
`operations-requests` and `support-fairness` neutral **with real breaches in them**, which
`navCounts.test.ts` now asserts explicitly so the trade-off is visible rather than buried.
The alternatives — raise the cap, or tone only at workspace level — are equally defensible
and are not mine to choose.

### 7.2 product-designer — `critical` and `high` collapse to one badge tone

Legacy paints a critical SOS `b-red` on a `--red-lt` row (`:13435`). R5a permits no red
badge and R7 has no escalation above `warning`, so `SafetyIncidentSeverity.critical` and
`.high` both map to `warning`. **That is a real loss of resolution on the one screen where
it matters most.** The distinction has to be carried some other way — a row marker, an
icon, or the SLA track. Same issue, smaller stakes, on `RequestStatus.no-drivers`
(`b-red`, `:9893`).

### 7.3 product-designer — three acknowledgement weights that all look like a tick

`ACK_SOURCE` (`:18127`) distinguishes `strong` (the captain acted), `attested` (an operator
vouched under their own name) and `weak` (`assumed` — *"Not a confirmation"*). `UST-4`
carries a weak one. If the UI renders all three as a tick, an operator cannot tell a
confirmed leg from one somebody decided to risk.

### 7.4 frontend-engineer — two one-line fixes, both in `src/screens/metrics/`

**(a) The seam guard is red.** `src/screens/metrics/copy.test.ts:37`:

```ts
import { metricSeeds, timeSeriesFixtures } from '@/data/fixtures/metrics'   // seam violation
```

I have exported the catalogue through the seam so this becomes a swap:

```ts
import { METRIC_KEYS, METRIC_SERIES_KEYS } from '@/data/clients'
```

Same values, no fixture import. (The precedent is `src/shell/navBadges.test.ts`, which
consumes `getNavCounts()` rather than exempting test files from the guard.) I did not edit
your file to turn my own test green.

**(b) One string is failing AC-39.** `src/screens/metrics/copy.ts:181` has
`'chart.management.zones.failedRequests': 'Failed requests'`. **`failed` is one of AC-39's
three banned words** and `src/shell/qa.copy.test.tsx` fails on it — the only red test in
the repo.

I renamed the metric key to **`management.zones.unservedRequests`** so the natural label is
"Unserved requests", which passes and is the truer word (the request did not fail; it found
no captain). Your key needs the matching rename.

### 7.5 A defect the fixtures caught mid-build

`clients/myWork.ts` originally treated *any* acknowledgement as a confirmation, which
dropped `UST-4` — a captain who has not started with twelve minutes to pickup, holding only
an `assumed` acknowledgement — out of the inbox entirely. It was found by
`metrics.test.ts` comparing the Operations-overview tile's breach count against My Work's
and getting 13 against 12. Two independent derivations of one number is worth the twenty
lines.

### 7.6 Legacy defects recorded on the way across

| | |
|---|---|
| **A T1 first response can never breach.** `slaState`'s guard is `frBreached: !firstResponseAtMs && frMs > 0 && …` (`:14780`). T1's `firstResponseMin` is `0`, so the middle clause is always false — **the strictest promise in the product is the one the clock cannot enforce.** |
| **`waiting` and `requestedAt` disagree by 60×.** Every seeded instant request claims to be both seconds and minutes old (`:2787` vs `:9924`). |
| **`REQ-503` is seeded past a threshold it has not crossed** — `no_drivers` at 160 s against a 180 s trigger. |
| **Four of eight `upcomingSubTrips` name a rider who is not the rider on their subscription** (`UST-2` is `SUB-1052`/`RDR-1080`; that plan's rider is `RDR-2031`). |
| **`minsToPickup` is computed from the trip id** — `20-((parseInt(id)||0)%18)` (`:16613`). A plausible number that was never a measurement. |
| **`offerState()` is a getter that writes** — it flips `offered → expired` and logs from inside a read (`:18163`). |
| **The inbox executes strings** — `action:"go('safety',null)"` through `new Function` (`:14970`). Replaced by a route path. |
| **`WORK_ROUTING` names a role no user has.** Every Operations row lists `'Operations'`; the five seeded operators are `Owner`, `Finance`, `Support`, `Ops Manager` ×2. Role routing has never matched an Operations row for anyone but the Owner. Corrected in `types/work.ts`. |
| **A safety incident with no reporter prints `undefined`** — `'Reporter '+nm2(inc.reporter)` (`:13432`), unconditional. `INC-017` is that row. |
| **`Driver` has `rating` and no `ratingCount`**, so an overturned rating can never recompute an average from the index type. `FairnessCase.averageAdjusted` exposes the gap; adding `ratingCount` is a wave-3 item. |

---

## 8. The awkward rows, by name

Build against these; they are the ones that break layouts.

| Row | What it is for |
|---|---|
| `REQ-503` | breached by **2 minutes** against a 3-minute promise, **held by another operator** |
| `SREQ-006` | breached by **5 days** against a 2-hour promise, 44-character Arabic rider name, Arabic notes |
| `SREQ-002` · `REQ-505` · `INC-018` · `FC-0005` · `APP-2203` | deadline long past, **never breached** |
| `SREQ-005` · `REQ-506` | **breached, then resolved** — late and closed at once |
| `REQ-508` | cancelled by the rider inside the window — nobody's fault, still needs a badge |
| `REQ-501` | rider with **no rating** (`★ new`) — the most common row in a growth month |
| `INC-014` · `INC-015` | unacknowledged SOS, **no protocol step ticked**; `INC-015` is notification N7 |
| `INC-017` | **no reporter at all** — device-raised, `reporterKind: 'system'` |
| `INC-019` | precautionary suspension applied, `act` ticked by it, **no SLA clock at all** |
| `FC-0004` | breached by 4½ days, **never answered**, Arabic detail text and Arabic subject name |
| `FC-0006` | overturned, `averageAdjusted: false` — score voided, average not recomputable |
| `UST-2` | backup **registered and ineligible** — the coverage gap `renderCoverage` names |
| `UST-3` vs `UST-5` | same cut-off, same null acknowledgement, **opposite breach states** (one uncovered, one auto-handed-off) |
| `UST-4` | `assumed` acknowledgement — a tick that is not a confirmation |
| `UST-7` | **not breached and in the most trouble on the screen**: confirmed on time, captain offline, offer expired, nobody nearby |
| absences | **empty by default** — an empty strike ledger is the healthy state, not a missing fixture. `useAbsenceHistory()` populates all three tiers |
| `management.zones.unservedRequests` | a chart whose whole range is **zero** — a flat line, not the no-data sentence |
| `support.overview.contactsPerThousandTrips` | a chart with **no points at all** — the no-data sentence |
| `management.performance.onTimePickup` | a **gap in the middle** — a break in the line, not a dip to the axis |
| `management.growth.newSubscriptions` | **no comparison period yet** — one legend chip, em-dash delta |
| `support.overview.overturnRate` | `higherIsBetter: true` on a metric every instinct says to colour red |
| `admin.overview.activityEvents` | 1,247 — four digits, in a tile this time as well as the rail |
