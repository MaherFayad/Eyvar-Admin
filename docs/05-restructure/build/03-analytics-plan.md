# Analytics & decision-support plan — every informational surface, one by one

> **Scope.** All eleven table-less surfaces, one by one — the nine metric
> boards, the Financials overview, and the self-serve layer (Report Builder /
> Dashboards / Alerts) — plus two findings that belong to no single board.
> **Method.** Each board was read against its fixture seeds, and every proposal
> below was checked against the field that would compute it. Readiness is
> tagged, not assumed.

## Readiness legend

| Tag | Meaning |
|---|---|
| **A** | Derivable **today** from fields already on the fixtures. Build work only. |
| **B** | Needs a **new fixture field or a widened `DailySnapshot`**. Data work first. |
| **C** | **Blocked on a business decision** — a definition the owner must name. |

## The four facts that shape every recommendation

**1. Only nine fields have history.** `DailySnapshot` (30 days × 9 fields:
`riders`, `drivers`, `activeSubs`, `quickRides`, `cancelRatePct`,
`totalRevenueHalalas`, `quickRideRevenueHalalas`, `subRevenueHalalas`) is the
platform's entire time series. Twenty-two tile comparisons already sit on
`reason: 'no-history'` because of it. **Any new tile wanting a trend needs its
field added to the snapshot first** — otherwise it ships with an em-dash where
the delta goes.

**2. There is no cohort primitive.** Neither `MetricSeed` nor the Report
Builder's `Measure` type can express *"group by signup period, measure at age
N"*. Activation, retention, payback and captain survival all need it. This is
one missing capability blocking roughly half of what follows.

**3. Rates survive the demo; counts do not.** The fixture holds 13 captains, 17
riders, 12 subscriptions, 19 trips. The codebase already states the principle —
`cancellationRate` was chosen precisely because *"it is a rate, so it is
level-independent — 3–9 % is as true of 47 subscriptions as of 6"*. **Every
proposal below is a rate, a ratio, a share, or a duration** wherever it could
be. Where a count is unavoidable it is marked.

**4. Referral attribution has never worked.** `rider.referralCode` and
`rider.referredBy` are both **dead writes** in the legacy source — written, read
nowhere. So `promoROI` and `referralAndIncentiveSpend` currently measure spend
with no way to attribute what it bought. Fixing attribution is a prerequisite
for any acquisition-efficiency number.

---

# 1. Management › Overview

**Seven tiles:** contribution margin, gross revenue, active subscriptions,
active captains, net subscription movement, same-captain-kept, on-time pickup.
**Two charts:** quick-ride revenue, subscription revenue.

### Answers today
*Is the business growing, and is it keeping the two promises printed on the
plan card?* It answers that well — the two promise tiles against a 95 % target
are the sharpest thing on any board.

### Cannot answer
- **Is growth coming from more riders, or more spend per rider?** Gross revenue
  moves; nothing decomposes it into volume × price.
- **What is a subscription worth?** No per-unit figure anywhere.
- **Which of the two businesses is winning?** The two revenue charts sit side by
  side, but nothing states the mix or whether it is shifting.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **ARPA — revenue per active subscription** | Splits growth into volume vs price. The single most important number a subscription business does not have. | **A** — `subRevenueHalalas ÷ activeSubs`, both on the snapshot, so it gets a real 30-day trend on day one. |
| **Revenue mix — subscription share of gross** | Says which business is growing. A quick-ride-led month and a subscription-led month need different responses. | **A** — snapshot fields; trends immediately. |
| **Revenue per active captain** | Supply productivity. Falls when you over-recruit, rises when you under-recruit. | **A** — `totalRevenueHalalas ÷ drivers`. |
| **Subscription : quick-ride trip mix** | Whether quick rides feed the subscription business or cannibalise it. | **A** — `Trip.kind`. |

**Also:** `netSubscriptionMovement` is started-minus-cancelled — a net figure
that hides its own composition. **Show the gross halves beside it** (started,
cancelled) so a flat net caused by 30-in/30-out is distinguishable from a quiet
month. Same field, no new data.

---

# 2. Management › Performance

**Four tiles:** cancellation rate, average renewal rate, average captain rating,
trips completed. **Breakdown:** captains by late-trip share. **Charts:** on-time
pickup, cancellation rate.

### Answers today
*Is the service getting worse for people who already pay us?* The cancellation
chart is the board's real asset — 5.2 % → 6.7 % is honest, sourced history.

### Cannot answer
- **Is a bad average one bad captain or a bad system?** Every tile is a mean.
  The late-share breakdown is the only distribution on the board.
- **Does poor service actually cause churn?** Performance and Risk never meet.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **On-time attainment distribution (P10 / median / P90)** | A mean of 91 % hides whether the worst decile sits at 60 %. Fix the tail, not the average. | **A** — `Driver.onTimePercent`. |
| **Complaint rate per 100 trips** | Normalises complaints against volume. A raw complaint count rises simply because you grew. | **A** — `Driver.openComplaints` ÷ `totalTrips`. |
| **Service-to-churn link: renewal rate of riders served by bottom-decile captains vs top** | Turns a service metric into a revenue argument. Justifies the cost of fixing supply quality. | **A** — join `Trip.driverId` → `Subscription.renewalLikelihoodPercent`. |
| **Repeat-lateness concentration — share of late trips from the worst 3 captains** | Distinguishes a coaching problem from a dispatch problem. | **A** — trips fixture. |

**Blocked:** the board has **no satisfaction measure at all**. Legacy's CSAT/NPS
card was *fully hardcoded HTML* — it never held real data, so this is a genuine
absence rather than a regression. Standing up CSAT needs a survey field on
`Trip` or `Subscription`. **C** — the owner must decide whether to collect it.

---

# 3. Management › Risk & Signals

**Six tiles:** revenue at risk, churn-predicted subscriptions, at-risk captains,
identity collisions, repeat-incident captains, payment-risk renewals.
**Breakdowns:** high-value riders at risk, subscriptions by renewal likelihood.

### Answers today
The strongest board in the system. It ports legacy's `subHealthScore` and
`driverRiskScore` and ranks *named subscriptions* by renewal likelihood — the
one place the panel tells an operator exactly who to call.

### Cannot answer
- **Does intervening work?** Risk flags a subscription; nothing records whether
  the retention action saved it.
- **How good is the prediction?** No accuracy measure. A churn score nobody
  scores is a number nobody should trust.
- **Captain churn is entirely absent** — see §B.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Intervention save rate** — flagged subscriptions that renewed after an action vs flagged-and-untouched | The only number that says whether the retention team pays for itself. | **B** — needs an intervention outcome field; the action exists, the outcome is not recorded. |
| **Churn-model precision at 30 days** | Whether to trust the score or re-tune it. | **B** — needs flag history; today's flags are point-in-time. |
| **Revenue at risk as a share of MRR** | A SAR figure means nothing without a denominator. 12 % at risk is a crisis; the same SAR at 2 % is noise. | **A** once MRR exists (§10). |
| **Days-to-renewal on every at-risk row** | Converts a risk list into a work queue ordered by urgency. | **A** — `Subscription.endsOn`. |

---

# 4. Management › Growth  *(the acquisition board — most of your ask lands here)*

**Seven tiles:** promo ROI, promo budget consumed, subscriptions from promos, new
riders, registered riders, dormant rider share, referral & incentive spend.
**Chart:** new subscriptions.

### Answers today
Spend and volume. *How much did we spend, and how many riders arrived.*

### Cannot answer — and this is the biggest hole in the product
- **What does a rider cost, and what is one worth?** No CAC. No LTV:CAC. No
  payback period. Every acquisition decision you make is currently unpriced.
- **Do registered riders ever ride?** `registeredRiders` is a census and
  `newRiders` is an arrival count. **Nothing measures activation** — the share
  who take a first trip.
- **Do quick-ride riders become subscribers?** This is the core conversion of a
  subscription ride-hailing business and it is measured nowhere.
- **Does anyone stay?** No retention curve. Legacy's cohort card was a
  **hardcoded array** — never real.

### Add — the acquisition funnel, end to end

| Metric | The decision it drives | Ready |
|---|---|---|
| **Activation rate — registered riders taking a first trip within 7 / 30 days** | Separates a marketing problem (nobody signs up) from a product problem (they sign up and stall). Completely different fixes. | **A** — `Rider.joinedAt` + `lastTripAt`; `NewRider.firstAction` already records the first thing they did and reaches the data layer but **no screen renders it**. |
| **Quick-ride → subscription conversion rate, and median days to convert** | The core funnel step. Tells you whether quick rides are a cheap acquisition channel or a leak. | **A** — `Rider.status`, `subscriptionIds`, `Subscription.startedOn`. |
| **CAC per subscription and per captain** | Makes the promo budget a decision instead of a line item. | **A** for spend ÷ volume; **C** for a defensible attribution split — needs the referral dead-write fixed and a channel field. |
| **LTV : CAC and payback months** | Whether to accelerate or brake spend. The board currently cannot say. | **A** on the LTV side (`Rider.lifetimeValueHalalas`), gated on CAC. |
| **Subscription retention curve by start cohort — M1 / M3 / M6 survival** | The definitive health measure of a subscription business. | **B** — needs the cohort primitive (§ Enablers). |
| **Dormancy → churn conversion** | `dormantRiderShare` exists but stops short: how many dormant riders come back vs leave. | **A** — `lastTripAt`. |
| **Promo-acquired vs organic subscription retention** | Whether discounting buys customers or buys tourists. Usually the most expensive thing a company learns late. | **B** — needs promo attribution on the subscription. |

---

# 5. Management › Market & Zones  *(the expansion board)*

**Seven tiles:** captains needed, starved zones, unserved requests (30 d), average
failure rate, live steer offers, worst demand/supply ratio, live cities.
**Breakdown:** cities health. **Chart:** unserved requests.

### Answers today
Where **existing** supply is short. It is a supply-balancing board.

### Cannot answer — *"which cities should we expand to"*
Every tile is scoped to zones that **already exist**. A city with demand and no
coverage is invisible by construction: `unservedRequests30d` counts requests
inside served zones, so latent demand outside the footprint never appears.

### Add — an expansion-readiness view

| Metric | The decision it drives | Ready |
|---|---|---|
| **Registered riders in cities with no live zone** | The purest expansion signal you have: demand that already signed up and cannot be served. | **A** to build — `Rider.city` vs `Zone.city` — but **B** to make meaningful: every rider, zone and applicant in the fixture is Riyadh, so it returns zero today (§C). |
| **Applicant supply in the pipeline, per city** | Says whether a city is *enterable*. Zones say you need N captains; applications say M are in the pipe. **These two numbers are never joined today.** | **A** — `Applicant.city` × `Zone.captainsNeeded`. |
| **Expansion-readiness score per candidate city** (riders + request attempts + applicant supply − failure rate) | Ranks candidate cities instead of describing them. One ordered list is the deliverable. | **A** — all four inputs exist. |
| **Revenue per captain per zone** | Whether a starved zone is worth feeding. Some starvation is correct. | **A** — `Trip.pickup` → zone. |
| **Steer-offer effectiveness — acceptance rate and cost per filled trip** | `steerOffersLive` is a *count*, and a count cannot tell you whether the lever works. `ZoneSteerOffer` already carries `accepted`, `sentTo` and `spentHalalas`. | **A** — arithmetic on fields that already exist. |
| **Serviceable-demand gap by gender preference** | `Rider.driverGenderPreference` vs captain gender supply. If female riders request female captains and supply is thin, that demand is structurally unservable and invisible today. | **A** — but seeded on one rider only; needs fixture depth to be meaningful. |

---

# 6. Operations › Overview  *(the waiting board — your "people waiting too long" ask)*

**Eight tiles:** applications past window, pending applications, breached work
items, unclaimed work, legs uncovered, open requests, compliance expired,
captains available. **Breakdown:** backlog by queue.

### Answers today
**Counts of breaches.** How many items are late.

### Cannot answer
**How late.** This is the crux. The SLA machinery is complete — `slaStartedAt`,
`slaDueAt`, `slaTargetMinutes`, `slaBreachedAt`, `firstResponseDueAt`,
`firstResponseAt` all exist on `SlaTracked` — and **every board metric built on
it is a count**. An operator cannot tell three items five minutes late from
three items five hours late, and those demand opposite responses.

There is also **no percentile anywhere in the product** — verified by grep
across `src/screens` and the metric fixtures.

### Add — durations, not counts

| Metric | The decision it drives | Ready |
|---|---|---|
| **Oldest item waiting, per queue** | The single number that says *escalate now*. | **A** — `slaStartedAt`. |
| **Median and P90 time-to-assign, by channel** | Instant rides carry a 3-minute SLA, subscription requests 120 minutes. Neither has an attainment number. | **A** — `requestedAt` → `assignedAt`. |
| **SLA attainment % per queue** | Turns a breach count into a service level you can set a target against. | **A** — `slaDueAt` vs completion. |
| **Rider abandonment rate — requests ending `expired` / `no-drivers` / `cancelled`, split by channel** | The people who gave up. Today they are counted only inside the zones board, so they read as a supply statistic rather than a lost customer. | **A** — `expiredAt`, `cancelledAt`, `RequestStatus`. |
| **Time-to-decision on applications (median, P90)** | Captain acquisition is a race. `applicationsPastWindow` says how many are late; nothing says how slow you are. | **A** — `appliedAt` → `decidedAt`. |
| **Waiting-time distribution histogram** | Whether the backlog is a long tail or a cliff. | **A**, needs a new chart kind (histogram). |

**Recommendation:** these belong together on **one cross-cutting "Who is
waiting" surface**. Waiting is currently scattered across Operations Overview,
Requests, Assurance and My Work — nobody can see the whole of it at once.

---

# 7. Support › Overview

**Six tiles:** unacknowledged critical incidents, open incidents, contacts per
thousand trips, uncoded contact share, open fairness cases, overturn rate.
**Breakdown:** contact reasons.

### Answers today
Genuinely good. `contactsPerThousandTrips` is already normalised — the pattern
the rest of the product should copy.

### Cannot answer
- **How long does a contact take to resolve?** No duration metric.
- **What does support cost per subscription?** No unit economics.
- **Is a contact reason growing or shrinking?** The reasons breakdown is a
  snapshot ranking with no trend.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Median time-to-first-response and time-to-resolve** | Staffing. | **A** — `firstResponseAt`, `SlaTracked`. |
| **Contact reason trend — each reason's rate per 1,000 trips over time** | A rising reason is a product defect announcing itself. A static ranking cannot show that. | **B** — needs contact reasons on the snapshot. |
| **Repeat-contact rate — riders contacting more than once in 30 days** | Distinguishes volume from unresolved volume. | **A** — `Rider.complaintIds`. |
| **Contact rate by plan and by tier** | Which persona is expensive to serve — feeds §A directly. | **A**. |

---

# 8. Support › Captain Fairness

**Two tiles:** earnings per engaged hour, suspended captains. **Chart:** earnings
per engaged hour.

### Answers today
Whether captains are earning acceptably for time actually worked, and how many
are currently suspended. `earningsPerEngagedHour` is the right *shape* of
metric — it divides by engaged time rather than clock time, which is the honest
denominator.

### Cannot answer
- **Who is being treated unfairly.** One mean across the whole fleet. Fairness
  is inherently a question about the tail, and the tail is exactly what a mean
  removes.
- **Are suspensions consistent?** A count with no reason breakdown, no rate, and
  no comparison across operators making the decision.
- **What does a suspension cost the captain?** A suspended captain earns nothing
  while the case sits. Nothing measures how long that is.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Earnings distribution — P10 / median / P90 per engaged hour** | The bottom decile is who leaves. A mean cannot see them. | **A** — the same field the mean already uses. |
| **Suspension rate per 100 active captains, by reason** | A count grows with the fleet; a rate does not. The reason split says whether suspensions are safety, compliance or performance — three different remedies. | **A** — `Driver.suspended`, `suspensionReason`. |
| **Median days under suspension before resolution** | Directly a cost borne by the captain, and today invisible. This is the fairness metric the board is named for and does not have. | **A** — `SlaTracked` on the fairness case. |
| **Post-reinstatement retention — do reinstated captains keep driving?** | Whether the appeal process repairs the relationship or merely ends the case. | **B** — cohort primitive. |
| **Earnings gap by vehicle class and by zone** | Whether the fairness problem is a person problem or an allocation problem. Dispatch, not coaching. | **A** — `Trip.pickup`, `Driver.vehicleClass`. |

**Note:** `overturnRate` sits on Support › Overview, not here. The rate at which
fairness decisions are reversed is the single most relevant number to a fairness
board, and it lives on a different screen. **Move it or mirror it.**

---

# 9. Admin › Overview

**Four tiles:** erasure requests overdue, rota gaps, operators without two-factor,
active operators. **Breakdown:** rota gaps by day. **Chart:** activity events.

### Answers today
Housekeeping — data-protection obligations, security hygiene, and whether the
shift roster has holes. All four are correct and worth keeping.

### Cannot answer
- **Is the team the right size?** `activeOperators` is a headcount with no
  workload beside it.
- **Do rota gaps actually hurt?** The board reports gaps; the Operations board
  reports breaches; **nobody joins them.** That join is the entire business case
  for hiring.
- **Is work distributed fairly across operators?** No per-operator view at all.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Items resolved per operator-hour** | Capacity planning. Converts a headcount into a throughput. | **A** — work items carry `claim` and resolution timestamps. |
| **SLA breach rate during rota gaps vs covered hours** | **The highest-value join in the product.** It converts "we are short-staffed" from an assertion into a measured cost, and it is the argument that gets headcount approved. | **A** — rota fixture × `slaBreachedAt`. |
| **Queue arrival rate by hour vs rota coverage by hour** | Whether the roster is sized to when work actually arrives, rather than to a uniform day. | **A** — `slaStartedAt` hour histogram × rota. |
| **Workload balance — share handled by the busiest vs quietest operator** | Burnout and single-point-of-failure risk, both invisible today. | **A** — `claim.byUserId`. |
| **Dormant operator accounts and permission drift** | A security metric with teeth. `operatorsWithoutTwoFactor` covers enrolment; nothing covers accounts nobody uses any more. | **A** — team users fixture + audit events. |

---

# 10. Financials › Overview & Revenue

**Six flow tiles:** gross, captain earnings, gross margin, giveback,
contribution, contribution %. **Five position tiles:** pending payouts, escrow
held, escrow ready, captain debt, rider wallet liability. **Giveback is already
decomposed** into promo / referral / incentive / refunds / goodwill / emergency —
credit where due; that decomposition is better than most of the boards.

### Cannot answer
- **MRR and its movement.** The standard subscription bridge — new / expansion /
  churned / reactivated — is absent. For a subscription business this is *the*
  financial chart.
- **Which plan *earns*.** Revenue › by plan already shows gross, platform,
  captain and platform % per plan — see §C, which corrects a wrong claim in the
  first pass. But platform % is **take rate before givebacks**, not
  contribution, and there is no per-subscription figure. So the table names the
  biggest plan and not the best one.
- **Whether giveback bought anything.** The decomposition lists SAR by cause with
  no denominator and no outcome.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **MRR + movement bridge** | The headline number of the business model. | **A** for MRR; **B** for the movement split (needs plan-change history). |
| **Contribution and ARPA per plan** — the existing by-plan table, minus givebacks and divided by active subs | Which plans to promote, reprice, or retire. The table exists; the two columns that turn it into a decision do not. | **A** — extends `PlanRevenueRow` with fields already on the summary. |
| **Giveback as % of gross, per cause, with trend** | Turns six SAR figures into six decisions. A cause growing faster than gross is the one to attack. | **A** for the ratio; **B** for trend. |
| **Cash-collection rate and failed-payment recovery** | `paymentRiskRenewals` flags the risk; nothing measures whether you recover. | **A**. |
| **Revenue concentration — share from the top 10 riders / corporate accounts** | Whether the revenue line is a portfolio or three phone calls. | **A**. |

---

# 11. Report Builder / Dashboards / Alerts

**Catalogue: 14 measures**, all volume or revenue — `captains.registered`,
`riders.registered`, `subscriptions.active|started|cancelled`,
`captains.joined`, `riders.joined`, `trips.completed|quickRides|fareCollected`,
`revenue.total|quickRide|subscription`, `trips.cancellationRate`.
**11 dimensions**, all categorical: plan, vehicle class, status, trip kind,
pickup, city.

### The structural limit
The catalogue is a **volume catalogue**. It contains no funnel measure, no
cohort measure, no duration measure and no ratio beyond one cancellation rate.
An analyst therefore cannot self-serve a single question in sections 4, 6, 8 or
9 above — which is most of what you asked for. **Every board fix is a one-off
build until the catalogue widens.**

### Add
1. **Duration measures** — `request.timeToAssign`, `application.timeToDecision`,
   `support.timeToResolve` — with percentile aggregation, not just sum/avg. **A**.
2. **Funnel measures** — `riders.activated`, `riders.convertedToSubscription`,
   `captains.firstTrip`. **A**.
3. **Ratio measures as first-class** — ARPA, utilisation, attainment, so a rate
   is not something each board recomputes for itself. **A**.
4. **Cohort dimension** — `cohort.signupMonth` + an `age` axis. **B**, and it is
   the enabler that unlocks the most.
5. **Segment dimensions** — `rider.tier`, `rider.corporate`, `rider.language`,
   `driver.gender`. **A** — the fields exist; the catalogue omits them.

**Known and unchanged:** alerts do not fire — there is no scheduler, and the UI
correctly says *would have fired*. `New dashboard` and `Pin to dashboard` are
stubs.

---

# A. Personas — a gap that spans boards rather than sitting on one

> **Cross-cutting.** Not a board. The metrics below have no single home today,
> which is itself the finding.

There is **no segmentation surface anywhere**. The fields are unusually rich and
almost entirely unexploited:

`RiderTier` (gold/silver/bronze/new) · `churnRisk` · `lifetimeValueHalalas` ·
`renewalRatePercent` · `city` · `gender` · `appLanguage` ·
`driverGenderPreference` · `corporateAccountId` · `PlanKey` · `VehicleClass`

### Add — a segment value matrix

| Metric | The decision it drives | Ready |
|---|---|---|
| **LTV × retention × contact-cost, by tier / plan / vehicle class** | *Which persona should we acquire more of.* Answers your ask directly, in one table. | **A** — every input exists. |
| **Corporate vs consumer economics** | Corporate accounts are a distinct business with `employeeCount`, `expectedEmployees`, `totalSpendHalalas`, `monthlyCapHalalas`. **No board mentions them at all.** | **A**. |
| **Corporate seat utilisation — `employeeCount` ÷ `expectedEmployees`** | Expansion revenue inside accounts you already won, which is cheaper than any new acquisition. | **A** — both fields exist and are served; no screen renders either. |
| **Corporate collections risk — `invoiceOverdue`, days overdue, exposure** | An overdue B2B invoice is a larger financial event than most tiles on the Risk board. **Served by the corporate client; rendered nowhere.** | **A**. |
| **Language split (`appLanguage`) across riders and captains** | The product ships two languages and reports on neither. Also the honest prerequisite for the untested Arabic copy. | **A**. |

---

# B. Captains — "know more about the drivers and track them"

> **Cross-cutting.** Captain metrics are spread across three boards and no
> single surface answers "how is the fleet doing".

Captain-facing metrics exist across three boards: `avgCaptainRating`,
`atRiskCaptains`, `repeatIncidentCaptains`, `captainsByLateShare`,
`earningsPerEngagedHour`, `suspendedCaptains`, `captainsAvailable`.

### The two absences that matter

**1. There is no captain-churn metric anywhere in the product.** Verified by
grep. In ride-hailing this is typically the largest recurring cost in the
business, and the panel is silent on it.

**2. Slot utilisation is on the type and on no screen.** `Driver` carries
`activeSubscriptions`, `maxSubscriptions` and `openSubscriptionSlots` —
**`openSubscriptionSlots` is served by the driver client and rendered by no screen.** It answers, exactly, *do we need
to recruit or are existing captains under-loaded?* — which is the question the
whole Zones board is trying to answer indirectly.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Fleet slot utilisation — `activeSubscriptions ÷ maxSubscriptions`** | Recruit vs re-load. The cheapest capacity is a slot you already pay for. | **A** — fields exist and are served; nothing renders them. |
| **Captain 30 / 60 / 90-day survival by join cohort** | Where the acquisition budget leaks. | **B** — cohort primitive. |
| **Newly-approved captains who never took a first trip** | Wasted acquisition spend, precisely quantified. | **A** — `Applicant.approvedDriverId` → `Driver.lastTripAt`. |
| **Earnings distribution P10 / median / P90, not the mean** | `earningsPerEngagedHour` is a single mean. The bottom decile is who quits. | **A**. |
| **Concentration risk — trip share of the top 10 captains** | If a fifth of captains carry most subscriptions, losing three is an incident, not attrition. | **A**. |
| **Captain reliability composite** (on-time + cancellation + complaints + doc expiry) | One ranked list for "know your drivers", instead of four boards. | **A** — all four inputs exist. |
| **Application rejection reasons, ranked** | `rejectionReason` is captured and **aggregated nowhere**. Rejecting for fixable reasons (a bad document photo) is a funnel leak you can close this week. | **A**. |

---

# C. Corrections to the first pass

Two claims from the first pass did not survive a second look. Both are recorded
rather than quietly edited, because a plan that hides its own errors is a plan
nobody can audit.

**"No surface shows contribution by plan" — wrong.** Financials › Revenue
already renders **Revenue by plan**: plan, active subs, trips, gross, platform,
captain, and platform %. That is most of the way there. What is genuinely
missing is narrower and worth stating precisely: **platform % is take rate
before givebacks, not contribution**, and there is no per-subscription figure
per plan. So the table can tell you which plan is *biggest* and cannot tell you
which plan *earns*.

**"Riders in cities with no live zone — costs nothing and answers the question
directly" — computable, but there is nothing to compute on.** Every zone (6),
every rider (17) and every applicant (8) in the fixture is Riyadh; exactly one
captain of thirteen is Jeddah. The metric would correctly return zero. It stays
in the plan because it is the right instrument, but its readiness is **A to
build, B to make meaningful** — the expansion question cannot be demonstrated
until the fixture carries a second city's demand.

---

# D. The subscription mechanic — four fields that decide the business

The first pass treated subscriptions as a count that goes up and down. The
mechanics underneath are modelled in detail and rendered nowhere.

### Cannot answer
- **Are subscribers using what they paid for?** `tripsIncluded` and
  `tripsCompleted` sit side by side on every subscription and no screen compares
  them. This is the central economics of a subscription: a rider using 2 of 20
  included trips is high margin **and** about to churn; a rider using 20 of 20
  is loyal **and** possibly unprofitable. Those are opposite interventions and
  today they look identical.
- **Why do people leave?** `cancellationReason` is captured on every cancelled
  subscription and aggregated nowhere.
- **How often does a save work?** `frozenUntil` and `planFrozenUntil` exist. A
  freeze is a churn *deflection* — neither a loss nor a renewal — and it is
  counted as neither.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Plan utilisation — `tripsCompleted ÷ tripsIncluded`, distributed** | Plan design and pricing. The two tails are two different businesses: under-users churn, over-users erode margin. A mean would hide both, so this must ship as a distribution. | **A** — both fields on every subscription. |
| **Churn reasons, ranked, by plan** | The single most actionable table in this document. It converts "we lost 12" into "we lost 12, nine for the same fixable reason". | **A** — `cancellationReason`. |
| **Freeze rate, and what happens after a freeze** | Whether freezing saves subscriptions or merely delays the cancellation. Determines whether to offer it more or less. | **A** — `frozenUntil`, then status at expiry. |
| **Refund rate and refund reasons, by destination** | `RefundRecord` carries `reasonCode` and `destination` (instrument vs wallet). Refunds currently appear as one SAR line in the giveback list; the reason distribution is the part you can act on. | **A**. |
| **Included-trip breakage — trips paid for and never taken** | Revenue quality. Breakage flatters margin today and predicts churn tomorrow, and finance should know how much of the margin is breakage. | **A** — `tripsIncluded − tripsCompleted`. |

---

# E. Time — the grain the product prices in and cannot report

**This is the sharpest structural finding of the second pass.**

The product sets prices by hour and by day. `SurgeWindow` carries `startHour`,
`endHour`, `days` and a `multiplier`. The working week is Sunday–Thursday, and
`WEEK_START_DOW` is a deliberate constant with **Q-RB-3 still unanswered**.

And **every one of the 14 measures declares `minGrain: 'day'`.** `'hour'` exists
in `GRAIN_RANK` and no measure supports it, so it is always illegal.
`ReportResult.buckets` is typed `IsoDate[]` — an hourly bucket has nowhere to
put its hour, which is a contract change rather than a config flag. There is no
time-of-day dimension and no day-of-week dimension anywhere.

So: **you price by hour, and you cannot report by hour.** For a commuter
subscription business whose whole product is the morning and evening leg, that
is the gap most likely to be costing money silently.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Demand and supply by hour of day** | Whether the surge windows are pointed at the right hours. Today they are set by judgement and never checked. | **B** — `Trip.startedAt` carries the hour; `buckets` must widen to `IsoDateTime[]`. |
| **Day-of-week profile, Sunday-first** | A commuter product lives on the working week. Thursday and Friday behave nothing like Monday, and one weekly average hides both. | **B** — needs a day-of-week dimension; also settles **Q-RB-3**. |
| **Peak concentration — share of trips in the top two hours** | Fleet sizing. A fleet sized for the peak is idle all day; one sized for the mean fails twice daily. | **B**. |
| **On-time attainment by hour** | Whether lateness is a captain problem or a rush-hour problem. Same number, two completely different remedies. | **B**. |

---

# F. Pricing levers with no feedback loop

Three levers are fully built and none reports its own effect.

### Cannot answer
- **Does surge work?** A multiplier is configured per window. Nothing measures
  whether it brought supply in or drove demand away — the two outcomes look the
  same in a trip count.
- **What did the last price change do?** `RateCardSimulation` models
  `riderBeforeHalalas`, `riderAfterHalalas` and `deltaPercent` **before** a rate
  card goes live. Nothing measures what actually happened after. There is no
  elasticity estimate anywhere in the product.
- **Do steer offers and incentives pay for themselves?** Spend is recorded;
  outcome is not attributed.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Surge effectiveness — supply response and demand drop per window** | Whether to widen, narrow, or retire each window. Currently a pure judgement call. | **B** — depends on §E's hour grain. |
| **Price-change outcome, before vs after, per rate-card version** | Closes the loop on the simulation the product already runs. `RateCard.effectiveFrom` gives an exact cut point. | **B** — needs history across a version change. |
| **Implied elasticity by vehicle class** | The input to every future pricing decision. | **B**. |
| **Cancellation-fee incidence** | `cancelFeeHalalas` and `freeWaitMin` are configured; nothing reports how often the fee actually lands, or on whom. A fee that fires constantly is a policy problem. | **A** — trips and pricing fixtures. |

---

# G. Judgement — the boards mostly cannot say whether a number is good

A number without a target or a trend is not a decision input. Counted across the
57 seeded metrics:

- **5** carry a target.
- **36** carry no comparison at all — `kind: 'none'` — and **34** of those give
  the reason `no-history`.

So on most tiles the product shows a figure and declines to say whether it is
good, bad, better or worse. **Targets are the cheapest fix in this entire
document**: they are a business input, not a data problem, and they need no
history to work.

Alerting has the mirror problem. `AlertComparator` is `gt | gte | lt | lte`
against a **fixed number**. On a growing business an absolute volume threshold
either fires forever or never fires, and it cannot express the alert you
actually want — *"cancellations are up 40 % on the same day last week."*
`PeriodComparison` already offers `previous-year`, against 30 days of history.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **A target on every tile that can carry one** | Turns 36 bare numbers into 36 judgements. Nothing else in this document buys as much for as little. | **C** — the targets are yours to set; the field already exists. |
| **Percent-change and week-over-week comparators on alert rules** | The alert a subscription business actually needs. An absolute threshold cannot express "up 40 % on the same weekday". | **A** — no new data; a comparator vocabulary change. |
| **Seasonal-aware baselines rather than fixed lines** | Kills the false alarms that make an alerting system get ignored. | **B** — needs history depth. |
| **Forward projection on known future events** | **Nothing in the product forecasts anything.** Renewal dates, document expiries and rota gaps are all *known in advance* and all reported in the past tense. | **A** for the arithmetic — `endsOn`, `expiresOn`, rota are all future-dated already. |
| **Holdout groups for promos and incentives** | Without a control group every promo is measured against "before", which confounds the promo with season and growth. Every ROI number in the Growth board inherits this flaw. | **C** — a capability decision, not a metric. |

---

# H. Controls, governance and the audit trail

Every money-moving action is already audited with an actor, an amount and a
reason code — `payout.pay`, `refund.issue`, `deduction.waive`, `wallet.adjust`,
`posting.reverse`, `gateway.toggle`, and `permission.denied` among them. **None
of it is turned into an indicator.** The audit log is a table you read after
something goes wrong, not a control you watch.

Three integrity counters are worse off than that: `failedPayoutCount`,
`unlinkedCreditNoteCount` and `escalatedCashReportCount` sit on
`FinancialsSummary`, are served, and **appear on no screen**.
(`refusedPostingCount` and `trialBalanceBalanced` do render — credit where due.)

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Goodwill and waivers per operator, with reason-code mix** | The classic control metric. An operator issuing five times the median goodwill is either your best support agent or your largest leak, and you cannot currently tell. | **A** — `AuditEntry.actorId`, `amountHalalas`, `reasonCode`. |
| **Reversal rate — actions later undone** | Measures decision quality, and a rising rate is a training signal. | **A** — the `.reverse` actions are their own audit type. |
| **Denied-permission attempts by operator and by page** | Either people are trying to do their job through a wall, or someone is probing. Both matter and neither is visible. | **A** — `permission.denied`. |
| **The three unrendered integrity counters, surfaced** | Failed payouts and unlinked credit notes are live financial defects. They are counted and shown to nobody. | **A** — already on the summary. |
| **Four-eyes coverage on high-value actions** | Governance. Which large money movements were made by a single operator with no second approval. | **B** — needs an approver field. |

---

# I. Trust in the numbers

A board that reports a figure should also report how much of it is solid. Three
fields already grade their own reliability and none reaches a screen.

- **`Trip.stateDesynced`** — the trip record disagrees with itself. Every
  revenue and on-time number silently includes these rows.
- **`LegAcknowledgement.weight`** — `strong` (app), `attested` (phone,
  WhatsApp), `weak` (**assumed**). So a share of the on-time promise the product
  prints on the plan card rests on *assumed* pickups, and no screen says how
  large that share is.
- **`uncodedContactShare`** — already on the Support board, and the only member
  of this family that made it to a tile. It should be the pattern, not the
  exception.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Evidence quality on the on-time promise — share strong / attested / assumed** | Whether 91 % on-time is a measurement or an assumption. This is the number to check before printing the promise on a plan card. | **A** — `LegAckWeight` is already graded. |
| **Desynced-trip rate** | A data-integrity defect that silently contaminates revenue and service metrics. | **A** — `stateDesynced`, currently rendered nowhere. |
| **Coverage rate per metric — rows with the field populated** | Distinguishes "this is low" from "we barely measured it". `renewalRatePercent` is `null` for riders with no history and would read as 0 % to anyone summing naively. | **A**. |
| **A freshness stamp that reads as data, not decoration** | Every metric already carries `asOf`. Under a widened snapshot, a stale board should say so loudly rather than showing yesterday's number as today's. | **A** — the field exists on every metric. |

---

# J. The people who run it

Three operational surfaces measure their own execution nowhere.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Safety protocol adherence — contact / verify / act / document** | `SafetyProtocolStep` records `done` and `completedAt` per step. Adherence rate and per-step completion time are the only evidence that the protocol is followed rather than merely defined — and the first thing an investigator asks for. | **A**. |
| **Time-to-close by incident severity** | Whether critical incidents actually move faster than normal ones, rather than being labelled as if they do. | **A** — `openedAt` → `closedAt`. |
| **Notification effectiveness — unread-critical rate and time-to-read** | Alert fatigue, measured. If criticals go unread you have an alerting problem wearing an operations problem's clothes. | **A** — `read`, `priority`, `createdAt`. |
| **Employee onboarding completion by role** | You asked for role-based onboarding. `completedStepIds`, `skippedStepIds` and `dismissedAt` are recorded per user and nothing reports whether any of it lands. | **A**. |
| **The most-skipped onboarding step** | A skipped step is a step that failed to explain itself. This is the cheapest product-improvement signal in the system. | **A** — `skippedStepIds`. |

---

# K. Money in motion

The Financials overview reports **positions** — how much is held. It does not
report **how long it has been held**, and in a captain-facing business the delay
is the thing the captain feels.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Payout aging — days from due to paid, and the oldest unpaid** | A captain waiting on money is a churn event in progress. `PayoutState` runs `due → processing → paid → failed → reversed` and no duration is reported across it. | **A**. |
| **Failed-payout recovery time** | A failed payout that nobody chases is a captain who leaves. | **A** — the state machine already distinguishes `failed`. |
| **Escrow aging — how long held before release** | Working capital, and a fairness question at the same time. | **A**. |
| **Corporate days-sales-outstanding** | `invoiceDayOfMonth`, `lastInvoiceGeneratedAt`, `nextInvoiceOn` and `invoiceOverdue` are all modelled. B2B collections is a real cash line with no indicator. | **A**. |
| **Captain debt aging and recovery rate** | `captainDebtHalalas` is a position tile. Debt that is 90 days old is a write-off, not an asset. | **A**. |

---

# L. Supply, seen forward instead of backward

Everything about supply is reported in the past tense, and every input needed to
report it in the future tense is already future-dated.

### Add

| Metric | The decision it drives | Ready |
|---|---|---|
| **Compliance expiry forecast — documents expiring in 7 / 30 / 60 days, by city** | `ComplianceDoc.expiresOn` is known in advance. The board reports `complianceExpired` — **past tense** — so a captain suspended for a lapsed document is a supply outage you had every chance to prevent. | **A**. |
| **Renewal calendar — subscriptions ending in the next 30 days, by plan and value** | The revenue you are about to re-earn or lose, visible before it happens rather than after. | **A** — `Subscription.endsOn`. |
| **Projected captain shortfall by city** | `captainsNeeded` is today's shortfall. Combining it with the expiry forecast and the applicant pipeline gives next month's. | **A** — three existing fixtures joined. |
| **Recruitment funnel velocity** | `recruitmentQueuedAt` records when a zone asked for captains; `Applicant.appliedAt` records when they arrived. The lag between them is the real recruitment lead time, and nothing measures it. | **A**. |
| **Vehicle-class supply/demand balance** | `vehicleClass` is on drivers, subscriptions, requests and rate cards, and no surface balances the two sides per class. A Comfort shortage and an Economy shortage need different recruiting. | **A**. |

---

# Enablers, ranked by what they unblock

| # | Enabler | Unblocks | Cost |
|---|---|---|---|
| **1** | **Widen `DailySnapshot`** — subscription starts/cancels and cancellation reasons, applications received/decided, request waits, contacts, captain actives | Trend on nearly every proposal in this document. Without it new tiles ship with an em-dash where the delta goes. | One fixture, mechanical. |
| **2** | **Sub-daily buckets** — widen `ReportResult.buckets` from `IsoDate[]` to `IsoDateTime[]`, add an hour grain and a day-of-week dimension | All of §E and most of §F. **The product prices by hour and cannot report by hour**; this is the enabler that closes that. | Contract change — the largest item here. |
| **3** | **Cohort primitive** — `groupBy: signupPeriod` + an `age` axis | Retention curves, activation, captain survival, LTV:CAC payback, post-freeze and post-reinstatement outcomes. Roughly half of §4, §8, §B and §D. | Type + planner change. |
| **4** | **Percentile aggregation** — P10 / median / P90 as a measure aggregation | Every duration and distribution metric: §6, §7, §8, §B, §D, §K. **The product has no percentile today.** | Aggregation function + one chart kind. |
| **5** | **Comparator vocabulary on alerts** — percent-change and same-weekday-last-week beside the four absolute operators | §G. An absolute threshold on a growing business fires forever or never. | Rule engine + one form field. |
| **6** | **Fix referral / promo attribution** — the dead `referredBy` write | CAC, promo-vs-organic retention, channel ROI, and every ROI number on the Growth board. | Fixture + write path. |
| **7** | **Widen the measure catalogue** — durations, funnels, ratios, segments, quality grades | Self-serve for everything above; stops each board being a bespoke build. | Catalogue entries. |

# Decisions only you can make

| # | Question | Blocks |
|---|---|---|
| **C-1** | **What are the targets?** Five of 57 metrics carry one; 36 carry no comparison at all. Most boards currently show a number and decline to say whether it is good. | §G — and it is the cheapest thing in this document, because a target needs no history. |
| **C-2** | **What counts as an "acquired" rider** — registered, activated, or subscribed? | Every CAC and funnel number (§4). Three different denominators, three different answers. |
| **C-3** | **Do we collect satisfaction (CSAT/NPS)?** Legacy's card was hardcoded HTML — it has never been real. | Any service-quality outcome measure (§2). |
| **C-4** | **Will you run holdout groups on promos and incentives?** | §G. Without a control group every promo is measured against "before", which confounds it with season and growth. |
| **C-5** | **Which cities are expansion candidates?** The readiness score ranks a list; something must define the list — and the fixture is Riyadh-only today (§C). | §5. |
| **C-6** | **Does the week start on Sunday?** (**Q-RB-3**, unanswered.) Every weekly number in every exported report moves with it. | §E, and every weekly report. |
| **C-7** | **Is `Rider.renewalRatePercent` publishable as a rate?** (**Q-107**.) | Tile counts on two boards. |
| **C-8** | **Do we record retention-intervention outcomes?** | Whether the Risk board can ever prove its own value (§3). |

# Suggested sequence

**Phase 1 — free wins, no new data, no decisions.** Every one of these computes
from fields the data layer already serves and no screen renders:

- **Rota gaps × SLA breaches** (§9) — *build this first.* It is the only metric
  here that turns a staffing complaint into a measured cost, and it needs
  nothing but a join between two fixtures that already exist.
- **Plan utilisation** and **included-trip breakage** (§D) — the central
  subscription mechanic, currently invisible.
- **Churn reasons, ranked** (§D) — turns "we lost twelve" into something you can
  act on.
- Slot utilisation (§B) · steer-offer effectiveness (§5) · rejection reasons
  (§B) · corporate seat utilisation and overdue invoices (§A) · oldest-waiting
  per queue (§6) · suspension rate by reason (§8) · the three unrendered
  integrity counters (§H) · payout and escrow aging (§K) · compliance-expiry
  forecast (§L).

**Phase 2 — set targets (C-1).** No engineering. It converts three dozen bare
numbers into judgements, and it is the highest ratio of decision-value to effort
anywhere in this document.

**Phase 3 — widen the snapshot (Enabler 1).** ARPA · revenue mix · revenue per
captain · giveback as % of gross · SLA attainment · churn-reason trend.
*Everything gains a trend.*

**Phase 4 — percentiles (Enabler 4) and alert comparators (Enabler 5).** Wait
times, earnings spread, time-to-decision, time-to-resolve, payout aging — and
alerts that can finally express "up 40 % on the same weekday".

**Phase 5 — sub-daily buckets (Enabler 2).** Hour-of-day and day-of-week. Surge
effectiveness, peak concentration, on-time by hour. This is where the pricing
levers get a feedback loop for the first time.

**Phase 6 — cohorts (Enabler 3).** Activation · quick-ride conversion ·
retention curves · captain survival · LTV:CAC · what happens after a freeze.
*The subscription-business core.*

**Phase 7 — segments, self-serve and experiments.** The persona matrix, the
catalogue widening that lets an analyst ask the next question without a build,
and holdout groups so the next promo can be evaluated rather than assumed.
