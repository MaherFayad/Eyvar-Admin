# Coupling Analysis — the structural verdict

> **Source:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines). `L####` = line in that file.
> **Companion documents:** `ENTITY-RELATIONSHIPS.md` (what links to what),
> `MODULE-DEPENDENCY-MAP.md` (who reads and writes what), `DATA-FLOW.md` (where the chains break).
> **§4 of this document is the direct input to the restructure phase.**

---

## 1. The one-sentence verdict

The panel is not a set of modules that share a database; it is **one database with 41 viewports onto
it**, five of which (`riders`, `drivers`, `subscriptions`, `trips`, `teamUsers`) behave as global
variables that 17% of all state-touching functions reach into directly — and the sidebar's nine
sections are organised by *operator job title*, not by the shape of that data, so almost every
section spans stores it does not own and misses stores it depends on.

---

## 2. Genuinely independent vs entangled

Independence here means: the module's collections are written **only** by its own functions, and its
render path reads little outside them.

### 2.1 Genuinely independent (safe to lift out unchanged)

| Module | Owned collections | Writers | Foreign reads on entry |
|---|---|---|---|
| **05b Corporate accounts** | `corporateAccounts` (6 writers, all `05b`), `corpApprovalLog` (shared with 07c) | `commitNewCorp`, `commitAddEmployee`, `removeEmployeeFromCorp`, `setCorpStatus`, `saveCorpBillingContact`, `commitSendCorpInvoice` | `riders` (member names), `subscriptions` (usage) |
| **14a/14b Pricing plans + editor** | `plans` (6 writers, all plan-admin), `quickRideTypes`, `surgeConfig`, `surgeSchedule` | `newPlan`, `savePlan`, `doActivatePlan`, `doDeactivatePlan`, `doArchivePlan`, `toggleVehicleActive` | none material |
| **11a Promos & growth** | `promos`, `incentives`, `referralConfig`, `referralLog`, `driverBonusLog` | all `11a` | `riders`, `drivers` (tier recalc — see §2.2) |
| **12b Driver wallets** | `payouts`, `escrowHolds`, `deductions`, `cashLedger`, `driverCashDebt` | `ensurePayoutEntry`, `payDriver`, `confirmProcessAll`, `releaseEscrow`, `confirmApplyDeduction`, `waiveDeduction`, `commitCashResolve`, `commitCashRepayment` — **all in `12b`** | `drivers` (names/ratings) |
| **15g–15i Settings: cities, gateways, limits** | `cities`, `paymentGateways`, `opsLimits`, `searchPhases` | add/remove pairs only | none |
| **16a Branding** | `branding` | `saveBranding`, `resetBranding` | none |
| **16i On-call & handover** | `onCall`, `onCallSchedule`, `handovers` | `saveOnCall`, `setRotaSlot`, `commitHandover` | `teamUsers` |

Seven of roughly thirty modules. Notably, **Driver Wallets is the best-encapsulated business module
in the file** — every function that moves payout money lives in it. Its problem is the opposite one:
nothing *outside* it ever credits it (`DATA-FLOW.md` B1.9).

### 2.2 Entangled (cannot be moved without moving something else)

| Module | Entanglement | Evidence |
|---|---|---|
| **05a Subscriptions** | Writes the record 9 other modules also write; reads `riders`, `drivers`, `payments`, `upcomingSubTrips`, `corporateAccounts`, `plans`(label only), `PLANS`(constant) | `MODULE-DEPENDENCY-MAP.md` §3 rank 1 |
| **06b Quick-ride / dispatch engine** | `tickEngine` (`L12508`) is a 5-second global mutator touching `rideRequests`, `liveTrips`, `upcomingSubTrips`, `drivers`, `subscriptions`, `trips`, `cashLedger` and calling `complianceScan`, `recalcDriverTiers`, `renderDashboard`, `renderLiveOps`, `renderRequestsPage`, `renderCompliancePage`, `renderPredictivePage`. It is a module that runs *inside* every other module | `L12508`–`L12630` |
| **08a Drivers** | Owns almost nothing. `DB.drivers` has 13 writers across 9 modules; the Drivers page contributes two (`commitDriverException`, `onDriverTrustToggle`). It also writes `opsConfig` (`commitMultiSubChange`) | §3 rank 2 |
| **09b 360° Profile** | Not a page — a cross-cutting renderer called from 40+ sites (`09b-360-profile-system.md` §15) that also **writes** `trips` (`flagTrip`, `unflagTrip`, `commitEditTip`), `complaints` (`resolveComplaint`) and `tickets` (`createTicketFor`) | `L8827`+ |
| **10b Plan commitment** | Reads `commitPolicy` (36 fns), `subscriptions`, `drivers`, `subBackups`/`backupRegistry`, `absenceEvents`, `emergencyClaims`, `emergencyDispatches`, `planConfirmations`, `legAcks`, `backupOffers`, `arrivalTraces`, `goodwillLedger`, rider wallets | `10b-plan-commitment.md` §13 |
| **10c Coverage** ↔ **10b** | Share one object under two names (`DB.backupRegistry = DB.subBackups`, `L17198`) and one function defined in 10c and deliberately *not* redefined in 10b (`assignBackup`, comment `L17512`–`L17514`) | `L17189`–`L17198` |
| **13a Support** | Ticket creation is owned by three other modules (`createTicketFor` 09b, `createReadinessTicket` 07b, `backfillReasonCodes` 15k) | §3 rank 7 |
| **15/16 Settings** | Not a module at all — 21 tabs, 34 render calls in one `if` branch (`L8819`), owning stores that belong to Finance (`ledger`, `vatConfig`), Support (`reasonCodes`, `slaPolicy`, `onCall`), Operations (`searchPhases`, `commitPolicy`, `cancellationPolicy`) and Pricing (`rateCard`) | `L8819` |
| **00c Identity / audit** | `teamUsers` is read by 56 functions; `can()`/`requirePerm()`/`logAction()` are called from every module | `00c-identity-permissions-and-audit.md` §7 |

---

## 3. The de-facto global variables

Five collections are touched by 50+ distinct functions. There are **663 functions in the file that
touch `DB` at all** (of 1,042 declared), and 1,168 distinct (function, collection) pairs — so the
*average* function touches **1.76 collections**. Coupling is not spread across the code; it is
concentrated in five stores.

| Collection | Touching functions | Share of all DB-touching functions | Distinct writing modules |
|---|---|---|---|
| `DB.riders` | **112** | 16.9% | 8 |
| `DB.drivers` | **112** | 16.9% | 9 |
| `DB.subscriptions` | **86** | 13.0% | 9 |
| `DB.trips` | **61** | 9.2% | 4 |
| `DB.teamUsers` | **56** | 8.4% | 3 |
| *(next tier)* `commitPolicy` 36 · `upcomingSubTrips` 27 · `tickets` 25 · `opsConfig` 24 · `rideRequests` 20 · `liveTrips` 19 · `plans` 18 · `payments` 18 | | | |

**94 functions touch two or more of the big five; 27 touch three or more; 4 touch four or more.**

### 3.1 Why this is *the* architectural problem

Three consequences, each observable in the source rather than theoretical:

**(a) There is no place to put an invariant.** "A suspended driver cannot be dispatched" is a property
of `DB.drivers`. Because 9 modules write that object and 112 functions read it, the rule has been
re-implemented four times, differently, in four places:

| Function | Module | Checks | Misses |
|---|---|---|---|
| `eligibleDrivers` `L5672` | 05a subscription builder | `d.suspended`, `driverAutoRestricted` (declines + min rating), `driverTrustedForSubs` (min trips), `capacityOpen`, `hasOpenComplaint`, `driverCanTakeAnotherSub` | `complianceSuspensions`, `planAccess`, `planFreezeUntilMs` |
| `dispatchEligibility` `L17209` | 10b backup / emergency | `d.suspended`, `d.planAccess`, `d.planFreezeUntilMs`, vehicle class, committed-leg conflict | `complianceSuspensions`, rating, declines, capacity, complaints |
| `steerableDrivers` `L13985` | 11b zones | `status!=='pending'`, **`complianceSuspensions`**, `driverLiveState().busy` | everything else |
| `nextOfferCandidate` `L12496` | 06b instant dispatch | declined list, `offeredElsewhere`, `live.busy`, search radius phase, VIP ordering | **every form of suspension**, rating, docs, capacity |

Only one of the four reads `DB.complianceSuspensions` — and it is the *zone steering* function, the
least consequential of the four. The auto-suspension notification says *"Driver removed from dispatch
until renewed"* (`L13309`); three of the four dispatch paths never learn about it
(`DATA-FLOW.md` B2.5).

**(b) Every write is a potential silent overwrite.** `DB.subscriptions` is written by 18 functions in
9 modules. `completeTrip` increments `sub.trips` (`L12458`–`L12461`); `renderSuccess` resets it to
`'0/N'` (`L11436`); `promoteBackup` rewrites `sub.driver`; `approveCorpSubscription` flips
`sub.status`. Nothing serialises them, nothing versions them, nothing notifies the others. The
mitigations that exist are all *manual re-render calls* — `renderSubscriptionsTable()` is called from
`L10292`, `L11446`, `L12472` and `L13231` by four different modules that each remembered to do it.
`refreshOwnershipSurfaces` (`L19045`) hardcodes a five-page refresh list and calls a function
(`renderInterventions`) that does not exist (`L19054`).

**(c) The blast radius of any schema change is the whole file.** `sub.trips` is the string `'5/5'`.
Changing it to `{done, total}` means touching 86 functions. `sub.plan` is a display label
(`'Weekly Economy'`); making it a key means touching every renderer plus `planKeyFromLabel`. This is
why four pricing models coexist: nobody could safely change the one that was already load-bearing, so
each new pricing surface brought its own.

### 3.2 The secondary global: `go()`

`window.go` (`L8774`–`L8826`) hard-references **77 distinct render functions** across every business
module. It is a second global variable — a control-flow one. The `settings` branch calls 34 render
functions in a single statement (`L8819`); `support` is handled by **two** branches that both run
(`L8789` and `L8806`). Adding a page requires edits in five places
(`00a-global-navigation-and-routing.md` §13).

---

## 4. Where the sidebar cuts across the real data boundaries

**This section is the direct input to the restructure phase.** Each row is a concrete mismatch between
the current IA and the data, with the evidence and the implication.

### 4.1 One data surface split into two nav items

| Current IA | Reality | Evidence |
|---|---|---|
| Operations ▸ **All trips** (`L505`) and Operations ▸ **Quick rides** (`L504`) | **The same collection.** `renderTripsTable` (`L3388`) and `renderQuickRidesTable` (`L3440`) both iterate `DB.trips`; the only difference is a `kind` filter, and All Trips already has its own kind filter (`setTripsKindFilter`). Two sidebar items, one table | `L3388`, `L3440` |
| Operations ▸ **Requests** (`L508`) plus the hidden pages `requests-sub-all` and `requests-instant-all` | Three pages over two collections that model the same concept — an unmatched demand signal. `renderRequestsPage` `L10071`, `renderRequestsSubAll` `L10137`, `renderRequestsInstantAll` `L10183` | `L10071`–`L10183` |
| Fleet ▸ **Drivers** (`L512`) and the embedded pending-drivers card plus the hidden `all-pending` and `applicant-detail` pages | One lifecycle (`applicant → driver`) split across a card, a page with no sidebar entry, and a detail page reached by `classList` manipulation (`L8873`) | `L887`–`L894`, `L1324`, `L1342` |
| Finance ▸ **Driver wallets** (`L528`) and **Rider wallets** (`L529`) | Correct data split (`payouts`/`escrowHolds`/`deductions` vs `rider.wallet`) — **keep**. But `rwallets` has **zero inbound links** despite six modules writing rider wallets | §4.5 |

### 4.2 One data domain split across the sidebar *and* Settings

| Domain | Where it lives now | Should be one place |
|---|---|---|
| **Pricing** | Config ▸ Pricing Plan (`DB.plans`, `DB.quickRideTypes`, `DB.surgeConfig`, `DB.surgeSchedule`) · Settings ▸ Pricing & rate card (`DB.rateCard`, `surgeSuspensions`, `rateCardHistory`) · a frozen `var PLANS` at `L4389` that outranks both for the only flow that charges anyone | Three IA locations, four (five with `PLANS`) models, zero authority. `16g-settings-pricing-windows.md` §10.1 |
| **Money reconciliation** | Finance (`refunds`, `creditNotes`, contribution margin) · Driver wallets (`payouts`, `escrow`, `deductions`, `cash`) · Rider wallets (`rider.wallet`) · **Settings ▸ Ledger & money safety** (`DB.ledger`, `idempotency`, `moneyRejects`, `trialBalance`) | The reconciliation authority is filed under Settings, three sections away from the money it reconciles — and never sees driver payouts at all (`MODULE-DEPENDENCY-MAP.md` §4.4) |
| **Support policy** | Support ▸ Support Center (`tickets`) · Support ▸ Contact drivers (`contacts`, `callSessions`) · Settings ▸ Reason codes & SLA (`reasonCodes`, `slaPolicy`, `compPolicy`) · Settings ▸ On-call & handover (`onCall`, `handovers`) | The SLA clock that stamps every ticket is configured in a settings tab the agent working the ticket cannot see |
| **Dispatch policy** | Settings ▸ Matching & Dispatch (`searchPhases`, `opsConfig.quickRideRadiusKm`) · Settings ▸ Operational limits (`opsLimits`) · Settings ▸ Cancellation policy · Fleet ▸ Plan commitment (`commitPolicy`, 36 readers) | Four locations for the rules that decide who gets offered a trip. `commitPolicy` — the largest policy object in the file — is edited on a *Fleet* page, not in Settings |
| **Documents** | Fleet ▸ Compliance (`driverDocs`, 5 `DOC_TYPES`) · the applicant document card inside Drivers (`applicant.docs`, a different 5-key set) | Two document models for one driver (`ENTITY-RELATIONSHIPS.md` X6) |

### 4.3 Nav sections that span stores they do not own

| Sidebar section | Collections its pages read on entry | Collections its pages write |
|---|---|---|
| **Overview** (inbox, dashboard, live) | `tickets`, `disputes`, `fairnessCases`, `emergencyClaims`, `emergencyDispatches`, `absenceEvents`, `planConfirmations`, `backupOffers`, `legAcks`, `trips`, `incidents`, `lostFound`, `erasureRequests`, `subscriptions`, `commitPolicy`, `slaPolicy`, `reasonCodes`, `teamUsers`, `liveTrips`, `drivers`, `riders`, `refunds`, `deductions`, `pendingDrivers`, `plans` — **25+** | `liveTrips`, `rideRequests` |
| **Fleet** (drivers, riders, fairness, commitment, coverage, compliance, safety) | `drivers`, `riders`, `subscriptions`, `driverDocs`, `complianceSuspensions`, `incidents`, `fairnessCases`, `commitPolicy`, `subBackups`, `absenceEvents`, `opsConfig` | `drivers`, `complianceSuspensions`, `fairnessCases`, `subBackups`, `absenceEvents`, `opsConfig`, `subscriptions` |
| **Config** (plans, settings, audit-log) | 30+ collections via the 34-call `settings` branch | `plans`, `opsConfig`, `cities`, `gateways`, `limits`, `reasonCodes`, `slaPolicy`, `compPolicy`, `onCall`, `branding`, `rateCard`, `commitPolicy`, `teamUsers`, `searchPhases`, `cancellationPolicy`, `dataWindow`, `legalDocuments` |

The Work Inbox reads more collections than any other page in the system (10 in `inboxItems` alone,
the highest of any single function after the boot initialisers) while owning none of them. It is the
correct *shape* for this system — a queue over everything — and it is buried third in the sidebar
under "Overview", with the Dashboard building a **second, independent** intervention feed over
overlapping data (`buildInterventionItems` `L9450` vs `inboxItems` `L19120`; `03b-work-inbox.md` §12).

### 4.4 Sidebar items that are analytics with no workflow

`exec-overview` (`L487`), `predictive` (`L491`), `fraud` (`L492`), `growth` (`L522`), `rwallets`
(`L529`) and `contacts` (`L533`) each have **exactly one `go()` call site in the whole file — their
own sidebar item**. Nothing in the product routes an operator to them.
`fraud` is a leaf in both directions: `02b-fraud-and-risk.md` §12 records that no `go(…)` originates
from the Fraud page body either. The system computes `driverRiskScore` (`L14284`),
`subHealthScore` (`L14210`) and `riderChurnRisk` (`L4048`) — and then never sends anyone to look.

Conversely the two real hubs are `commitment` (13 inbound `go()` sites) and `wallets` (12) — neither
of which is where an operator's shift begins.

### 4.5 Pages with no home in the IA at all

| Page | Status |
|---|---|
| `interventions` (`L2068`) | **Unreachable.** Router branch at `L8788`, renderer at `L10338`, no sidebar item, and `go('interventions')` appears **nowhere** in 135 `go()` call sites. It emits an edge (`go('inbox')`, `L2073`) and receives none |
| `profile`, `applicant-detail`, `ticket-detail` | Shown by direct `classList.add('on')` (`L8834`, `L8873`, `L8885`), bypassing the router — so `navCurrent`, the sidebar highlight and the back stack are all maintained by hand, which is why Back is unreliable |
| `my-account`, `notifications-all`, `plan-edit`, `corp-detail`, `all-pending`, `requests-sub-all`, `requests-instant-all` | Legitimate drill-downs, but each is a full `.page` div in a flat 41-page namespace with no parent/child relationship expressed anywhere |

---

## 5. What the restructure has to decide

Ranked by how much of the coupling each decision removes.

1. **Give the big five owners.** `riders`, `drivers`, `subscriptions`, `trips` and `teamUsers` need a
   single writing module each, with every other module going through it. Concretely: one
   `driverEligibility(driverId, context)` replacing the four functions in §3.1(a); one
   `applyToSubscription(subId, change)` replacing 18 direct writers.

2. **Merge the split surfaces.** All trips + Quick rides = one table with a kind facet. The three
   Requests pages = one queue with a type facet. Drivers + all-pending + applicant-detail = one
   roster with a lifecycle facet.

3. **Move policy next to the operation it governs.** `commitPolicy` out of Fleet and into a
   policy home; `slaPolicy`/`reasonCodes` out of Settings and into Support; `ledger` out of Settings
   and into Finance; all four (five) pricing models into one Pricing module with one authority.

4. **Promote the Work Inbox to the entry point** and delete the Dashboard's duplicate intervention
   builder — it is already the only surface that reads across every queue.

5. **Route the analytics.** Give `predictive`, `fraud` and `exec-overview` inbound links from the
   objects they score (a driver row should link to its risk breakdown), or fold their signals into
   the rows themselves and drop the standalone pages.

6. **Close the four write-side breaks first**, because they are what makes the module boundaries
   *look* correct while producing wrong answers: live reassign/cancel not writing `DB.trips`
   (`MODULE-DEPENDENCY-MAP.md` §4.1), `docStatus` with no writer (§4.2), compliance suspension not
   reaching dispatch (`DATA-FLOW.md` B2.5), and driver payouts bypassing the ledger (§4.4).
