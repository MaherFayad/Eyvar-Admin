# Eyvar Ops Panel — Data Model

> Source: `eyvar_ops_panel_v40_fixed.html` (21,857 lines) | `var DB={` at **L2566**, literal closes at **L2842** (`};`)
> Inline script region: **L2166–L21855** (`<script>` at L2166; the only other script is the Leaflet CDN tag at L470).
> Verified against the file on 2026-08-24. Every claim below carries a line citation. Anything not directly observable in the file is marked `UNVERIFIED`.

## 0. How to read this document

* **Shape** — `object-keyed-by-id` means `DB.x['ID']={...}`; `array` means `DB.x=[{...}]`; `map` means a plain object used as a lookup (`key → scalar` or `key → record`); `config-object` means a singleton settings blob, not a collection.
* **Seed count** — number of records present in the source literal *before* any boot/seed function runs. Runtime seeding is called out separately, because `bootModules()` (L21807–L21856) and `seedMoreRequests()` (L9787, invoked L14557) materially change several counts after page load.
* **Readers / Writers** — derived mechanically from every `DB.<key>` occurrence in the file, attributed to its enclosing top-level function. A *writer* is any site matching assignment (`=`, `+=`, `++`), mutating array methods (`push`/`unshift`/`pop`/`shift`/`splice`/`sort`/`reverse`), or `delete`. `<top-level>` means the module scope (the seed literal itself, or a bare `DB.x=` statement outside any function).
* **Required?** — "seed" = present on every seeded record; "runtime" = only added by code after some event; "optional" = present on some seed records but not all.

---

## 1. Overview

**101 distinct `DB.<key>` collections are referenced in the file. All 101 are defined** — 21 inside the `var DB` literal, 80 by later top-level `DB.<key>=` statements. **There are zero referenced-but-never-defined keys** (§4).

### 1.1 Defined in the `DB` literal (21)

| # | Collection | Shape | Lines | Seed count | Purpose |
|---|---|---|---|---|---|
| 1 | `opsConfig` | config-object | L2567–2575 | 1 (5 nested groups) | Global ops settings: dispatch radii, branding, notifications, security, commission, plan visibility |
| 2 | `opsLimits` | array | L2583–2592 | 8 | Self-describing operational limit rules (rider/driver caps), each with an `enforced` flag |
| 3 | `riders` | object-keyed-by-id | L2593–2630 | 10 | Rider master records — profile, wallet, device/IP, movement log, denormalised link arrays, stats |
| 4 | `drivers` | object-keyed-by-id | L2631–2669 | 6 | Driver (captain) master records — profile, vehicle, bank, tier, link arrays, stats |
| 5 | `trips` | object-keyed-by-id | L2670–2684 | 8 | Completed/in-flight trip ledger (both Quick ride and Subscription kinds) |
| 6 | `subscriptions` | object-keyed-by-id | L2685–2693 | 7 | Subscription (plan) records binding one rider to one captain for a cadence |
| 7 | `payments` | object-keyed-by-id | L2694–2705 | 10 | Money movements — rider charges and driver payouts |
| 8 | `complaints` | object-keyed-by-id | L2706–2711 | 4 | Rider-against-driver complaint records |
| 9 | `pendingDrivers` | array | L2712–2743 | 5 | Driver applications awaiting approval/rejection |
| 10 | `newRiders` | array | L2744–2748 | 3 | Recently registered riders not yet promoted into `riders` |
| 11 | `commLogs` | map: tripId → array | L2749–2762 | 3 keys / 6 entries | Call + chat log per trip |
| 12 | `tickets` | array | L2763–2772 | 4 | Support tickets with message threads |
| 13 | `notifications` | array | L2773–2780 | 6 | Ops bell-panel notifications |
| 14 | `liveTrips` | array | L2781–2785 | 3 | Trips currently in progress, with dispatch stage + ETA |
| 15 | `rideRequests` | array | L2786–2790 | 3 (+53 at runtime) | Quick-ride requests in the dispatch funnel |
| 16 | `subscriptionRequests` | array | L2794–2800 | 5 | Rider-initiated subscription requests awaiting driver assignment |
| 17 | `escrowHolds` | array | L2801–2806 | 4 | Escrowed subscription money held until trip count is met |
| 18 | `deductions` | array | L2807–2811 | 3 | Penalty deductions against driver payouts |
| 19 | `payouts` | map: driverId → record | L2812–2816 | 3 | Per-driver payout running totals |
| 20 | `circuits` | map: driverId → array | L2817–2829 | 2 keys / 7 legs | A driver's scheduled daily leg list |
| 21 | `teamUsers` | array | L2830–2841 | 5 | Ops staff accounts, roles and permission arrays |

### 1.2 Assigned later, outside the literal (80)

| # | Collection | Shape | Defined at | Seed count | Purpose |
|---|---|---|---|---|---|
| 22 | `auditLog` | array | L2863 | 8 | Immutable record of every state-mutating operator action |
| 23 | `refunds` | array | L2881 | 2 | Refund ledger for cancelled subscriptions |
| 24 | `plans` | map: planKey → record | L2889 | 3 (`weekly`/`biweekly`/`monthly`) | Subscription plan catalogue (pricing, cadence, features, status) |
| 25 | `loginSessions` | map: userId → array | L2994 | 4 keys / 5 sessions | Active browser/app sessions per team user |
| 26 | `upcomingSubTrips` | array | L6177 (re-asserted L6243) | 8 | Next scheduled subscription legs with confirmation + driver state |
| 27 | `cashLedger` | array | L12080 | 0 | Cash-collection reconciliation entries |
| 28 | `driverCashDebt` | map: driverId → number | L12081 | 0 | Running cash balance owed per driver (negative = owes) |
| 29 | `subBackups` | map: subId → driverId | L13140 | 2 | Standing backup captain per subscription |
| 30 | `driverDocs` | map: driverId → record | L13278 | 5 | Document expiry dates per driver |
| 31 | `complianceSuspensions` | map: driverId → string | L13285 | 0 | Active suspension reason per driver |
| 32 | `incidents` | array | L13389 | 3 | Safety incidents with a 4-step handling checklist |
| 33 | `promos` | array | L13495 | 4 | Promo codes with budget/burn tracking |
| 34 | `incentives` | array | L13564 | 4 | Driver incentive rules |
| 35 | `dailySnapshots` | array | L13802 | 30 (`.reverse()`d) | Daily platform metrics time series |
| 36 | `emailOutbox` | array | L13834 | 0 | Every system email actually sent |
| 37 | `pushOutbox` | array | L13835 | 0 | Every push broadcast actually sent |
| 38 | `corporateAccounts` | map: corpId → record | L13846 | 1 | B2B accounts with usage policy + billing |
| 39 | `referralConfig` | config-object | L13855 | 1 | Referral bonus amounts and on/off |
| 40 | `surgeConfig` | config-object | L13861 | 1 | Surge master switch + hard cap multiplier |
| 41 | `multiStopConfig` | config-object | L13862 | 1 | Extra-stop fee |
| 42 | `legalDocuments` | map: docKey → record | L13867 | 3 docs / 8 versions | Legal document version history |
| 43 | `surgeSchedule` | array | L13883 | 3 | Time/day surge windows |
| 44 | `referralLog` | array | L13888 | 1 | Referrals actually processed |
| 45 | `driverBonusLog` | array | L13895 | 2 | Incentive bonuses actually paid |
| 46 | `inboundMessages` | array | L13899 | 3 | Website contact-form leads |
| 47 | `quickRideTypes` | array | L13908 | 3 | Quick-ride vehicle classes and fare formulas |
| 48 | `paymentGateways` | array | L13913 | 6 | Payment methods, enable/default flags |
| 49 | `searchPhases` | array | L13925 | 3 | Dispatch radius-expansion ladder |
| 50 | `cancellationPolicy` | array | L13936 | 8 | Every cancellation scenario and its fee |
| 51 | `cities` | array | L13946 | 4 | Cities and launch status |
| 52 | `zones` | array | L13952 | 6 | Demand/supply/failure stats per zone |
| 53 | `steerOffers` | array | L13960 | 0 | Active driver-steering incentive offers |
| 54 | `recruitmentQueue` | array | L13961 | 0 | Zones queued for driver acquisition |
| 55 | `corpApprovalLog` | array | L13962 | 0 | Corporate manager approval decisions |
| 56 | `vatConfig` | config-object | L13971 | 1 | ZATCA VAT registration details |
| 57 | `invoiceSequence` | number | L13972 | `0` | Gapless invoice counter |
| 58 | `invoices` | map: paymentId → record | L13973 | 0 | One stable tax invoice per payment |
| 59 | `paymentRisk` | map: riderId → string | L14199 | 1 | Free-text payment risk note per rider |
| 60 | `disputes` | array | L14391 | 2 | Rider/driver disputes with evidence bundles |
| 61 | `lostFound` | array | L14448 | 3 | Lost-item cases |
| 62 | `slaPolicy` | config-object | L14650 | 1 (4 tiers) | SLA tiers, at-risk %, escalation target |
| 63 | `reasonCodes` | array | L14667 | 40 | The contact-reason taxonomy (bilingual) |
| 64 | `contacts` | array | L14718 | 0 | One row per customer contact (CPT spine) |
| 65 | `compPolicy` | config-object | L15379 | 1 (5 roles) | Goodwill/compensation authority limits per role |
| 66 | `goodwillLedger` | array | L15391 | 0 | Goodwill credits actually issued |
| 67 | `fairnessCases` | array | L15505 | 0 (seeded at boot) | Driver fairness appeals (rating/suspension) |
| 68 | `onCall` | config-object | L15776 | 1 | Simple primary/secondary on-call pair |
| 69 | `creditNotes` | map: cnId → record | L15847 | 0 | VAT credit notes against refunds |
| 70 | `creditNoteSequence` | number | L15848 | `0` | Gapless credit-note counter |
| 71 | `erasureRequests` | array | L15961 | 0 | GDPR-style rider erasure requests |
| 72 | `massEvents` | array | L16082 | 0 | Mass-incident groupings of tickets |
| 73 | `rideStateLogs` | map: tripId → array | L16337 | 0 (seeded at boot) | Ride state-machine transition log per trip |
| 74 | `commitPolicy` | config-object | L16541 | 1 | Plan-commitment rules: grace, absence tiers, payouts, appeals |
| 75 | `planConfirmations` | map: subId → record | L16563 | 0 (seeded at boot) | Captain confirmation of a scheduled leg |
| 76 | `absenceEvents` | array | L16564 | 0 | Captain absence strikes (rolling counter source of truth) |
| 77 | `emergencyClaims` | array | L16565 | 0 | Captain emergency/force-majeure claims against an absence |
| 78 | `termsAcceptances` | array | L16566 | 0 | Captain acceptance of the plan-terms version |
| 79 | `backupRegistry` | **alias** of `subBackups` | L17198 | (same object) | Same object reference as `DB.subBackups` — not a copy |
| 80 | `emergencyDispatches` | array | L17199 | 0 (seeded at boot) | Replacement-captain dispatch attempts |
| 81 | `arrivalConfig` | config-object | L17605 | 1 | Geofence radii and dwell thresholds for arrival adjudication |
| 82 | `arrivalTraces` | map: tripId → record | L17611 | 0 (seeded L18102) | GPS ping traces + events for no-show adjudication |
| 83 | `legAcks` | map: subId → record | L18123 | 0 | Captain acknowledgement of a leg, with source weight |
| 84 | `backupOffers` | map: subId → record | L18124 | 0 | Pending offer to a backup captain |
| 85 | `branding` | config-object | L18388 | 1 | Logo/wordmark/accent colour |
| 86 | `ownership` | map: `'type:id'` → record | L18851 | 0 | Work-item claim ("who holds this") |
| 87 | `cases` | map: caseId → record | L18852 | 0 | Correlated multi-record cases |
| 88 | `ownershipConfig` | config-object | L18853 | 1 | Claim staleness minutes, takeover warning |
| 89 | `scriptProgress` | map: ticketId → array | L19410 | 0 | Checked steps of a ticket handling script |
| 90 | `onCallSchedule` | config-object | L19598 | 1 (3 blocks, 2 tiers) | Full on-call rota grid + overrides |
| 91 | `handovers` | array | L19607 | 0 | Shift handover records |
| 92 | `ledger` | array | L19879 | 0 | Double-entry journal entries |
| 93 | `idempotency` | map: key → record | L19880 | 0 | Replay-protection keys for money operations |
| 94 | `moneyRejects` | array | L19881 | 0 | Ledger postings refused (unbalanced / unknown account) |
| 95 | `telephony` | config-object | L20174 | 1 | Target answer/wrap-up seconds, adapter |
| 96 | `callSessions` | array | L20175 | 0 | Inbound/outbound call records |
| 97 | `dataWindow` | config-object | L20403 | 1 | Data-retention window in months + rationale |
| 98 | `presence` | map: userId → record | L21324 | 0 | Live operator presence/session tracking |
| 99 | `rateCard` | config-object | L21431 | 1 | Live price book: classes, commission, discounts, floors |
| 100 | `rateCardHistory` | array | L21463 | 0 | Superseded/draft rate cards |
| 101 | `surgeSuspensions` | array | L21464 | 0 | Time-boxed per-zone surge suspensions |

### 1.3 Runtime seeding — counts change after load

`bootModules()` at **L21807–L21856** runs 16 gated seed/boot steps, each declaring the `DB` keys it needs; a step with a missing key is skipped and reported to the console (L21836–L21841) and surfaced as a toast (L21850). This is the mechanism that populates most of the zero-seed collections:

| Boot step | Function | Declares `needs` | Line |
|---|---|---|---|
| reason codes + SLA | `slaBoot` | `reasonCodes`, `slaPolicy`, `contacts` | L21812 |
| per-trip ratings | `backfillTripRatings` | `trips` | L21813 |
| fairness cases | `seedFairness` | `fairnessCases` | L21814 |
| credit notes | `gapsBoot2` | `creditNotes`, `erasureRequests`, `massEvents` | L21815 |
| ride state logs | `desyncBoot` → `seedRideStates` | `rideStateLogs` | L21816, L16515–16517 |
| plan commitment | `commitBoot` | `commitPolicy`, `planConfirmations`, `absenceEvents` | L21817 |
| emergency dispatch | `dispatchBoot` | `emergencyDispatches`, `backupRegistry` | L21818 |
| backup coverage | `coverageBoot` | `backupRegistry` | L21819 |
| history reconstruction | `historyBoot` | `trips`, `payments`, `riders` | L21820 |
| work inbox | `inboxBoot` | `ownership`, `cases` | L21821 |
| on-call rota | `rotaBoot` | `onCallSchedule`, `handovers` | L21822 |
| ledger | `ledgerBoot` | `ledger`, `idempotency` | L21823 |
| audit fixes | `auditFixBoot` | `reasonCodes` | L21824 |
| panel fixes | `fixesBoot` | `branding`, `drivers` | L21825 |
| ux restructure | `presenceBoot` | `presence`, `teamUsers` | L21826 |
| pricing engine | `pricingBoot` | `rateCard`, `trips` | L21827 |

Two further seeders run outside `bootModules`:

* `seedArrivalTraces()` — called unconditionally at **L18102**, populating `DB.arrivalTraces`.
* `seedMoreRequests()` — defined L9787, called from a `setTimeout` at **L14557**. Guarded by `window.__reqSeeded` (L9788). It adds **45 riders** to `DB.riders` (L9808, loop L9820) and **53 ride requests** to `DB.rideRequests` (L9840; 14 `searching` + 13 `no_drivers` + 13 `assigned` + 13 `expired`, L9847–L9850). After it runs, `DB.riders` holds ~55 records and `DB.rideRequests` ~56 — **the seed counts in §1.1 are pre-boot values only.**

---

## 2. Collections defined in the `DB` literal

### 2.1 `opsConfig` — L2567–2575 | config-object | 1 record

Global ops settings. Five nested groups plus three top-level scalars.

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `quickRideRadiusKm` | number | km | `6` | Dispatch search radius for quick rides (L2568) | seed |
| `subRadiusKm` | number | km | `8` | Dispatch search radius when matching a subscription driver (L2568) | seed |
| `autoExpandRadius` | boolean | — | `true` | Whether the radius widens as a request ages (L2568) | seed |
| `allowMultiSubPerDriver` | boolean | — | `false` | Can a driver hold more than one active subscription (L2569) | seed |
| `general.companyName` | string | — | `'Eyvar'` | Brand name (L2570) | seed |
| `general.siteDescription` | string | — | `'Eyvar operations panel — …'` | Meta description (L2570) | seed |
| `general.logoDataUrl` | string | data-URI | `''` | Uploaded logo, written by `handleLogoUpload`, cleared by `clearLogo` (L2570) | seed |
| `general.supportEmail` | string | email | `'support@eyvar.app'` | (L2570) | seed |
| `general.supportPhone` | string | E.164-ish | `'+966 11 000 0000'` | (L2570) | seed |
| `general.timezone` | string | IANA | `'Asia/Riyadh'` | (L2570) | seed |
| `general.currency` | string | ISO-4217 | `'SAR'` | (L2570) | seed |
| `general.language` | string | ISO-639 | `'en'` | UI language; `'ar'` switches on `LANG_STRINGS` (L2570) | seed |
| `notifications.emailAlerts` | boolean | — | `true` | (L2571) | seed |
| `notifications.smsAlerts` | boolean | — | `false` | (L2571) | seed |
| `notifications.lowRatingThreshold` | number | ★ | `2.5` | Rating at/below which a trip is flagged (L2571) | seed |
| `notifications.notifyOnDispute` | boolean | — | `true` | (L2571) | seed |
| `security.sessionTimeoutMin` | number | minutes | `30` | (L2572) | seed |
| `security.require2FA` | boolean | — | `false` | (L2572) | seed |
| `pricing.driverCommissionPct` | number | % | `80` | Driver's share of the fare — read by `driverCommissionRate()` (L2573) | seed |
| `planVisibility.hideIfNoCoverage` | boolean | — | `false` | Hide plans in uncovered areas — read by `isPlanVisibleForRider()` (L2574) | seed |

**Readers (22 fns):** `<top-level>`, `applySiteBranding`, `buildEntityProfile`, `commitMultiSubChange`, `completeTrip`, `driverCanTakeAnotherSub`, `driverCommissionRate`, `isPlanVisibleForRider`, `lowRatingThreshold`, `nearestAvailableDrivers`, `renderDriversTable`, `renderGeneralConfig`, `renderNotificationConfig`, `renderOpsRadiusConfig`, `renderPlanVisibility`, `renderSecurityConfig`, `renderTeamTable`, `saveGeneralConfig`, `saveNotificationConfig`, `saveOpsRadiusConfig`, `savePlanVisibility`, `saveSecurityConfig`.
**Writers (5 fns):** `clearLogo`, `commitMultiSubChange`, `handleLogoUpload`, `saveOpsRadiusConfig`, `saveGeneralConfig`/`saveNotificationConfig`/`saveSecurityConfig`/`savePlanVisibility` (the last four write nested groups).
**Foreign keys:** none.

---

### 2.2 `opsLimits` — L2583–2592 | array | 8 records

Self-describing limit rules; the Settings table renders whatever the array holds, so adding a row needs no other code change (comment L2576–2582).

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | slug | `'driver_max_consecutive_declines'` | Stable key, used by `getLimit(id)` | seed |
| `appliesTo` | string | enum | `'driver'` | Which side the limit governs | seed |
| `label` | string | — | `'Max consecutive declined offers before flag'` | Human label | seed |
| `value` | number | varies (see `unit`) | `3` | The limit value | seed |
| `unit` | string | enum | `'declines'` | Unit of `value` | seed |
| `enabled` | boolean | — | `true` | Whether the rule is switched on | seed |
| `enforced` | boolean | — | `true` | Whether real code actually applies it | seed |
| `enforcedBy` | string \| null | — | `'Instant-ride offer engine — …'` | Prose naming the enforcing hook; `null` when `enforced:false` | seed |
| `custom` | boolean | — | `false` | `true` for rows added via "+ Add custom limit" | seed |

**Enumerations**
* `appliesTo`: `'driver'` (L2584–2586, L2590–2591), `'rider'` (L2587–2589). Custom rows also take one of these two — `addCustomLimit` is the only other writer.
* `unit` (seed): `'declines'`, `'★'`, `'trips'`, `'requests'`, `'per day'`, `'seconds'`, `'subscriptions'`.
* `enforced:true` rows (3): `driver_max_consecutive_declines`, `driver_min_rating_for_dispatch`, `driver_min_trips_for_subs`. `enforced:false` rows (5): `rider_max_active_requests`, `rider_max_cancellations_day`, `rider_request_cooldown`, `driver_max_active_subs`, `driver_min_rating`.

**Readers:** `<top-level>`, `getLimit`, `removeCustomLimit`, `renderOpsLimitsTable`, `saveOpsLimits`.
**Writers:** `addCustomLimit`, `removeCustomLimit` (`DB.opsLimits=DB.opsLimits.filter(...)` at L7425).
**Foreign keys:** none.

**Integrity note:** `driver_min_rating_for_dispatch` (3.5★) and `driver_min_rating` (3.5★) encode the same threshold twice, one enforced and one not (L2585 vs L2591).

---

### 2.3 `riders` — L2593–2630 | object-keyed-by-id (`RDR-####`) | 10 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'RDR-1041'` | Primary key (mirrors the map key) | seed |
| `name` | string | — | `'Nora Al-Harbi'` | Full name | seed |
| `phone` | string | — | `'+966 51 234 5678'` | Contact — used by `findByPhone` | seed |
| `rating` | number | ★ 0–5 | `4.9` | Rider rating; `0` for brand-new | seed |
| `lvl` | string | enum | `'gold'` | Loyalty tier | seed |
| `joined` | string | `MMM YYYY` | `'Mar 2026'` | Join month — parsed by `parseJoinedDate` | seed |
| `hasPhoto` | boolean | — | `true` | Whether to render a photo gradient vs initials | seed |
| `gender` | string | enum | `'Female'` | `'Male'`/`'Female'` | seed |
| `driverGenderPref` | string | enum | `'female'` | Preferred captain gender — **only on RDR-1041** (L2594) | optional |
| `wallet.balance` | number | SAR | `20` | Wallet balance | optional (2 of 10 seed riders) |
| `wallet.transactions[]` | array | — | see below | Wallet ledger | optional |
| `wallet.transactions[].id` | string | — | `'WTX-seed-2'` | Transaction id | — |
| `wallet.transactions[].type` | string | enum | `'credit'` | `'credit'` / `'debit'` | — |
| `wallet.transactions[].amount` | number | SAR | `20` | Amount | — |
| `wallet.transactions[].reason` | string | — | `'Referral bonus — referred Sara Al-Ghamdi'` | Why | — |
| `wallet.transactions[].date` | string | `DD MMM HH:mm` | `'18 Jul 09:30'` | When | — |
| `wallet.transactions[].balanceAfter` | number | SAR | `20` | Balance after — **never read anywhere** (see §6) | — |
| `address` | string | — | `'King Fahd District, Riyadh'` | Home address | seed |
| `city` | string | — | `'Riyadh'` | City — joins `DB.cities[].name` | seed |
| `device` | string | — | `'iPhone 14 Pro · iOS 17.4'` | Device string | seed |
| `appLang` | string | enum | `'Arabic'` | `'Arabic'` / `'English'` | seed |
| `lastIp` | string | IPv4 | `'92.96.14.201'` | Last IP — used by `identityCollisions` | seed |
| `mapPos` | `{x,y}` | canvas % | `{x:55,y:42}` | Position on the schematic map | seed |
| `ipLocation` | string | — | `'Riyadh, SA'` | Geo-IP label | seed |
| `movementLog[]` | array | — | `{date,action,location}` | Account-activity trail | seed |
| `subs[]` | string[] | FK | `['SUB-1041']` | → `DB.subscriptions` | seed |
| `trips[]` | string[] | FK | `['TRP-7741']` | → `DB.trips` | seed |
| `payments[]` | string[] | FK | `['PAY-5510']` | → `DB.payments` | seed |
| `complaints[]` | string[] | FK | `['CMP-310']` | → `DB.complaints` | seed |
| `stats.totalTrips` | number | trips | `42` | Lifetime trips | seed |
| `stats.totalPaid` | string | SAR (formatted) | `'259.50 SAR'` | Lifetime spend — **string, not number** | seed |
| `stats.renewalRate` | string | % or `'—'` | `'100%'` | Renewal rate | seed |
| `stats.quickRides` | number | trips | `6` | Quick rides taken | seed |
| `corpAccountId` | string | FK | `'CORP-001'` | → `DB.corporateAccounts`; written by `commitAddEmployee`, cleared by `removeEmployeeFromCorp` | runtime |
| `payMethod` | string | — | `'Visa ···4821'` | Read at L9611 when capturing a hold | runtime/UNVERIFIED (never seeded) |

**Enumerations**
* `lvl`: `'gold'`, `'silver'`, `'new'` in the seed; the closed set from code is **`new | standard | silver | gold`** (`TIER_RANK` L13579, `computeDriverTier` L13598–13602). Riders never get `'standard'` in the seed but `seedMoreRequests` L9806 assigns `'standard'` at runtime.
* `gender`: `'Male'`, `'Female'`.
* `appLang`: `'Arabic'`, `'English'`.
* `movementLog[].action` (seed): `'Account registered'`, `'Address updated'`, `'App opened'`, `'Complaint filed'`, `'First trip completed'` (L2744–2747).
* `wallet.transactions[].type`: `'credit'` (seed), `'debit'` (written by `debitRiderWallet`).

**Readers (99 functions).** Highest-traffic collection in the file alongside `drivers`. Notable: `buildRiderHistory`, `buildSubProfile`, `renderRidersTable`, `openProfile`, `entityDerived`, `nearestAvailableDrivers`, `eligibleDrivers`, `creditRiderWallet`, `debitRiderWallet`, `erasureBlockers`, `executeErasure`, `identityCollisions`, `integrityScan`, `riderLTV`, `corpTotalSpend`, `exportRiders`, `emailFor`, `findByPhone`, `fleetCounts`, `cityStats`, `captureDailySnapshot`.
**Writers (5 functions):** `commitAddEmployee` (sets `corpAccountId`), `materializeSubscription` (L9635 pushes into `subs`), `openNewRiderProfile` (promotes a `newRiders` row into `DB.riders`, L11156), `removeEmployeeFromCorp`, `seedMoreRequests` (L9808, adds 45 riders).
**Foreign keys:** `subs[]`→`subscriptions`, `trips[]`→`trips`, `payments[]`→`payments`, `complaints[]`→`complaints`, `city`→`cities.name`, `corpAccountId`→`corporateAccounts`.

---

### 2.4 `drivers` — L2631–2669 | object-keyed-by-id (`DRV-####`) | 6 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'DRV-0101'` | Primary key | seed |
| `name` | string | — | `'Ahmed Salem'` | Full name | seed |
| `phone` | string | — | `'+966 53 001 0101'` | Contact | seed |
| `email` | string | email | `'ahmed.salem86@gmail.com'` | Real email — `emailFor()` falls back to a synthesised one (L3576) | seed |
| `rating` | number | ★ 0–5 | `4.9` | Driver rating | seed |
| `lvl` | string | enum | `'gold'` | Tier — recomputed by `computeDriverTier` (L13598) | seed |
| `vehicle` | string | — | `'Corolla 2022 · White'` | Vehicle description — parsed by `verifyVehicleClass` against `VEHICLE_CLASS_MAP` | seed |
| `type` | string | enum | `'Economy'` | Service class | seed |
| `joined` | string | `MMM YYYY` | `'Feb 2025'` | Join month — drives `driverTenureDays` (L13590) | seed |
| `hasPhoto` | boolean | — | `true` | Avatar rendering | seed |
| `gender` | string | enum | `'Male'` | Used to satisfy `driverGenderPref` | seed |
| `multiSubException` | boolean | — | `true` | Per-driver override of `opsConfig.allowMultiSubPerDriver` — **only on DRV-0101** (L2632) | optional |
| `address`, `city`, `device`, `appLang`, `lastIp`, `ipLocation`, `mapPos` | as per riders | — | — | Same semantics as `riders` | seed |
| `capacity` | string | enum-ish | `'1 open'` | Free subscription slots as prose | seed |
| `movementLog[]` | array | — | `{date,action,location}` | Activity trail | seed |
| `bank.bankName` | string | — | `'Al Rajhi Bank'` | Payout bank | seed |
| `bank.iban` | string | IBAN | `'SA44 8000 …'` | Payout IBAN | seed |
| `bank.holder` | string | — | `'Ahmed Salem'` | Account holder | seed |
| `bank.status` | string | enum | `'Verified'` | Bank verification state | seed |
| `bankHistory[]` | array | — | `{bankName,iban,holder,replacedDate,reason}` | Previous bank details — **only DRV-0104** (L2657) | optional |
| `notifLog[]` | array | — | `{date,channel,msg}` | Notifications sent to the driver; seeded empty, appended by `finalizeNewSub` (L5105) | seed (empty) |
| `trips[]` | string[] | FK | `['TRP-7741',…]` | → `DB.trips` | seed |
| `payments[]` | string[] | FK | `['PAY-W640']` | → `DB.payments` | seed |
| `complaints[]` | string[] | FK | `['CMP-301']` | → `DB.complaints` | seed |
| `stats.totalTrips` | number | trips | `412` | Lifetime trips | seed |
| `stats.monthEarn` | string | SAR (formatted) | `'2,840 SAR'` | This month's earnings — **string** | seed |
| `stats.onTime` | string | % | `'96%'` | On-time rate — **string** | seed |
| `stats.activeSubs` | string | `used/cap` | `'4/5'` | Subscription slot usage — **string** | seed |
| `declineStreak` | number | declines | `0` | Consecutive declined offers — written by `driverDeclineOrTimeout`/`driverAcceptOffer` | runtime |
| `flaggedForDeclines` | boolean | — | `true` | Set when `declineStreak` crosses `driver_max_consecutive_declines` | runtime |
| `dob`, `nid` | string | — | `'14 Mar 1994'`, `'1098234567'` | Copied from the application on approval (L11099) | runtime |
| `acceptedTrips`, `cancelledTrips` | number | trips | `0` | Copied from the application on approval (L11099) | runtime |
| `docExpiry` | object | — | — | Read from the *application* record at L11111 | (on `pendingDrivers`, not here) |

**Enumerations**
* `lvl`: seed shows `'gold'`, `'silver'`, `'standard'`; the full closed set is **`new | standard | silver | gold`** (`TIER_RANK` L13579). `'new'` is assigned on approval (L11099) and by `computeDriverTier` when `rating===0` (L13598).
* `type`: `'Economy'`, `'Comfort'` in the seed. `DB.quickRideTypes` (L13908) additionally defines `'Large'`, and `DB.rateCard.classes` (L21438) defines only `economy`/`comfort` — see §7.
* `bank.status`: `'Verified'`, `'Pending verification'` (L2666).
* `capacity` (seed): `'1 open'`, `'2 open'`, `'3 open'`, `'Full'`.
* `gender`: `'Male'`, `'Female'`.

**Readers (96 functions).** Notable: `renderDriversTable`, `nearestAvailableDrivers`, `eligibleDrivers`, `changeDriverCandidates`, `driverCanTakeAnotherSub`, `driverTrustedForSubs`, `driverAutoRestricted`, `dispatchEligibility`, `driverCompletedTripsCount`, `captainEconomics`, `recalcDriverTiers`, `complianceScan`, `driverRiskScore`, `exportDrivers`, `fleetCounts`, `steerableDrivers`.
**Writers (2 functions):** `approveDriver` (L11099 — creates a driver from an application), `driverAcceptOffer` (resets `declineStreak`). Note `declineStreak`/`flaggedForDeclines` writes go through `DB.drivers[id].x=` sites.
**Foreign keys:** `trips[]`→`trips`, `payments[]`→`payments`, `complaints[]`→`complaints`, `city`→`cities.name`. Referenced *by*: `subscriptions.driver`, `trips.driver`, `liveTrips.driver`, `escrowHolds.driver`, `deductions.driver`, `payouts` key, `circuits` key, `driverDocs` key, `subBackups` value, `complianceSuspensions` key, `driverCashDebt` key, `driverBonusLog.driverId`, `absenceEvents.driverId`, `fairnessCases.driverId`, `lostFound.driver`, `disputes.against`, `complaints.against`.

**Data-integrity note:** `DRV-0103.stats.activeSubs` is `'6/6'` (L2648) while `opsLimits.driver_max_active_subs` is `5` (L2590) — the seed exceeds its own configured cap.

---

### 2.5 `trips` — L2670–2684 | object-keyed-by-id (`TRP-####`) | 8 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'TRP-7741'` | Primary key | seed |
| `kind` | string | enum | `'Subscription'` | `'Subscription'` \| `'Quick ride'` | seed |
| `rider` | string | FK | `'RDR-1041'` | → `DB.riders` | seed |
| `driver` | string | FK | `'DRV-0101'` | → `DB.drivers` | seed |
| `sub` | string \| null | FK | `'SUB-1041'` | → `DB.subscriptions`; `null` for quick rides | seed |
| `date` | string | `DD MMM HH:mm` | `'25 Jun 07:00'` | Trip timestamp | seed |
| `route` | string | — | `'King Fahd St → KFUPM'` | Origin → destination | seed |
| `km` | string | km | `'6.5'` | Distance — **string**, `'—'` when cancelled | seed |
| `min` | string | minutes | `'18'` | Duration — **string**, `'—'` when cancelled | seed |
| `fare` | string | SAR | `'17.65'` | Rider-paid fare — **string** | seed |
| `driverEarn` | string | SAR | `'14.12'` | Driver share — **string**, `'—'` when cancelled | seed |
| `tip` | number | SAR | `5` | Tip — **only TRP-9008** (L2678); editable via `commitEditTip` | optional |
| `status` | string | enum | `'In trip'` | Trip state | seed |
| `pay` | string \| null | FK | `'PAY-5510'` | → `DB.payments`; `null` when cancelled | seed |
| `stops[]` | array | — | — | Extra stops, written by `completeTrip` (L12421) | runtime |
| `stopFee` | number | SAR | — | Multi-stop surcharge (`multiStopConfig.extraStopFeeSAR`) | runtime |
| `dateMs` | number | epoch ms | — | Sortable timestamp, written by `buildRiderHistory` (L18756) | runtime |
| `driverRatingGiven` | number | ★ | — | Rating the rider gave (L18759) | runtime |
| `riderRatingGiven` | number \| null | ★ | — | Rating the driver gave (L18760) | runtime |
| `fareBreakdown` | object | — | — | Itemised fare (L18761) | runtime |
| `payMethod` | string | — | `'Mada ···2210'` | Payment method (L18761) | runtime |
| `reconstructed` | boolean | — | `true` | Marks a back-filled historical trip (L18761) | runtime |

**Enumerations**
* `kind`: `'Subscription'`, `'Quick ride'` (both in seed; both assigned at L12421 and L18754).
* `status` (seed): `'In trip'`, `'Done'`, `'Late +8'`, `'Cancelled'`. Assigned in code: `'In trip'` (L12421), `'Done'` (L12423 `base.status='Done'`), `'Cancelled'` / `'Done'` (L18758). **`'Late +8'` appears only in the seed and is never produced by code** — it is a formatted variant, not a stable enum member (see §7).

**Readers (56 functions):** `renderDashboard`, `buildEntityProfile`, `buildSubProfile`, `entityDerived`, `captainEconomics`, `contributionMargin`, `onTimeStats`, `drawMap`, `focusLiveTrip`, `openTripReceipt`, `postFareCapture`, `backfillFareLedger`, `backfillTripRatings`, `lowRatedTripIds`, `priorTripsWithRider`, `massEventAffected`, `cptStats`, `ledgerBoot`, `exportRows`, `renderFraudPage`, `decideFairness`, `departureRisk`, `driverLiveState`, `driverCompletedTripsCount`, and ~30 more.
**Writers (3):** `<top-level>` (seed + `desyncBoot`), `buildRiderHistory` (L18754 — mints reconstructed history trips using `'TRP-'+(++__histSeq)` from 90000), `completeTrip` (L12421).
**Foreign keys:** `rider`→`riders`, `driver`→`drivers`, `sub`→`subscriptions`, `pay`→`payments`. Referenced *by*: `commLogs` key, `liveTrips.id`, `deductions.trip`, `payments.trip`, `incidents.trip`, `lostFound.trip`, `rideStateLogs` key, `arrivalTraces` key, `planConfirmations` key (by tripId per the comment at L16563, though written keyed by `subId` — see §7).

---

### 2.6 `subscriptions` — L2685–2693 | object-keyed-by-id (`SUB-####`) | 7 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'SUB-1041'` | Primary key (note `'SUB-1052b'` breaks the numeric pattern, L2689) | seed |
| `rider` | string | FK | `'RDR-1041'` | → `DB.riders` | seed |
| `driver` | string | FK | `'DRV-0101'` | → `DB.drivers` | seed |
| `plan` | string | label | `'Weekly Economy'` | `<PlanLabel> <VehicleType>` — a composed display string, **not** a `DB.plans` key | seed |
| `started` | string | `DD MMM` | `'19 Jun'` | Start date; `null` when pending approval (L5098) | seed |
| `ends` | string | `DD MMM` | `'26 Jun'` | End date | seed |
| `trips` | string | `used/total` | `'5/5'` | Trip consumption — **string** | seed |
| `paid` | string | SAR (formatted) | `'86.50 SAR'` | Amount paid — **string** | seed |
| `status` | string | enum | `'Expiring'` | Subscription state | seed |
| `direction` | string | enum | `'one-way'` | `'one-way'` \| `'round-trip'` (L5099, L9631) | runtime |
| `route` | string \| null | — | — | Route label (L5099) | runtime |
| `departTime` / `returnTime` | string \| null | `HH:mm` | — | Leg times (L5099) | runtime |
| `days[]` | string[] | weekday | `['Sun','Mon',…]` | Scheduled weekdays (L5100, L9632) | runtime |
| `perTripFare` | number | SAR | — | Fare per leg (L5100) | runtime |
| `startOutcome` | any \| null | — | `null` | Result of `evaluateSubStart` (L5100) | runtime |
| `pendingDriverCommit` | boolean | — | `false` | Awaiting captain commitment (L5100) | runtime |
| `pendingManagerApproval` | boolean | — | — | Corporate approval gate (L5101) | runtime |
| `approvalCorp` | string \| null | FK | `'CORP-001'` | → `DB.corporateAccounts` (L5101) | runtime |
| `approvalThreshold` | number \| null | SAR | — | Corp `requireApprovalAboveSAR` snapshot (L5101) | runtime |
| `driverChanges` | number/array | — | — | Captain-change counter, written at `DB.subscriptions[..].driverChanges=` | runtime |

**Enumerations**
* `status` seed: `'Expiring'`, `'Active'`, `'Cancelled'`. Assigned in code: `'Cancelled'` (L3689 `commitSettlement`, L4902 `rejectCorpSubscription`, L5556 `confirmCancelSub`), `'Active'` (L4887 `approveCorpSubscription`, L11438 `renderSuccess`), `'Frozen'` (L5510 `doFreeze`), `'Pending Approval'` (L5098 at creation). **Full set: `Active | Expiring | Frozen | Cancelled | Pending Approval`.**
* `plan` (seed labels): `'Weekly Economy'`, `'Bi-weekly Comfort'`, `'Monthly Comfort'`, `'Weekly Comfort'`. Composed at L5097 as `plan.label+' '+vehicleType` from `PLANS[k].label` × `{Economy|Comfort}`.

**Readers (82 functions).** Notable: `renderSubscriptionsTable`, `buildSubProfile`, `activeSubsList`, `activeSubsForPlanCadence`, `changeDriver`, `changeDriverCandidates`, `driverActiveSubCount`, `absenceExposure`, `commitmentReserve`, `backupCoverage`, `hasBackup`, `subIsCovered`, `subHealthScore`, `emergencyDispatch`, `dispatchEligibility`, `evaluateSubStart`, `generateUpcomingTripsForSubscription`, `corpPolicyViolations`, `exportSubscriptions`, `captureDailySnapshot`.
**Writers (5):** `acceptEmergency`, `finalizeNewSub` (L5097), `materializeSubscription` (L9627), `recordAbsence`, `renderSuccess` (L11443).
**Foreign keys:** `rider`→`riders`, `driver`→`drivers`, `approvalCorp`→`corporateAccounts`. Referenced *by*: `trips.sub`, `escrowHolds.sub`, `upcomingSubTrips.sub`, `subBackups` key, `disputes.sub`, `subscriptionRequests.assignedSub`, `absenceEvents.subId`, `emergencyDispatches.subId`, `legAcks` key, `backupOffers` key, `planConfirmations` key, `payments.trip` (when a payment is for a subscription).

**Data-integrity note:** `payments.trip` holds a **subscription id** for subscription charges (e.g. `PAY-5510.trip = 'SUB-1041'`, L2695) and a **trip id** for quick-ride fares (`PAY-6008.trip = 'TRP-9008'`, L2699). One field, two target collections.

---

### 2.7 `payments` — L2694–2705 | object-keyed-by-id (`PAY-*`) | 10 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'PAY-5510'` | Primary key; driver payouts use a `PAY-W###` form (L2704) | seed |
| `entity` | string | FK | `'RDR-1041'` | → `DB.riders` **or** `DB.drivers` (polymorphic) | seed |
| `type` | string | enum | `'Subscription charge'` | Payment type | seed |
| `amount` | string | SAR (formatted) | `'86.50 SAR'` | Amount — **string** | seed |
| `method` | string | — | `'Visa ···4821'` | Payment method — matched against `paymentGateways[].matchPrefix` | seed |
| `date` | string | `DD MMM` | `'19 Jun'` | Value date | seed |
| `status` | string | enum | `'Paid'` | Payment state | seed |
| `trip` | string \| null | FK | `'SUB-1041'` | → `DB.trips` **or** `DB.subscriptions`; `'—'` for payouts | seed |
| `reconstructed` | boolean | — | `true` | Back-filled by `buildRiderHistory` (L18771) | runtime |

**Enumerations**
* `type`: `'Subscription charge'`, `'Quick ride fare'`, `'Driver payout'` (all three in seed; first two also assigned at L18767).
* `status`: `'Paid'`, `'Refunded'`, `'Pending'` (seed L2695–2704); `'Paid'` also assigned at L9611 and L18770. Full set: **`Paid | Refunded | Pending`**.
* `method` (seed): `'Visa ···4821'`, `'Mada ···2210'`, `'Apple Pay'`, `'Mada ···5540'`, `'Visa ···7766'`, `'Mada ···9013'`, `'Bank transfer'`. `PAY_METHODS` (L18653) adds `'STC Pay'`, `'Cash'`, `'Mastercard ···9034'` at runtime.

**Readers (15):** `captureDailySnapshot`, `contributionMargin`, `entityDerived`, `exportPayments`, `findInvoiceForRefund`, `gatewayStats`, `getOrCreateInvoice`, `openCorpInvoiceModal`, `payTable`, `renderExecOverview`, `renderExportCounts`, `renderQuickRidesTable`, `renderSubscriptionsTable`, `riderLTV`, `<top-level>`.
**Writers (2):** `buildRiderHistory` (L18766), `capturePaymentHold` (L9611).
**Foreign keys:** `entity`→`riders`|`drivers`, `trip`→`trips`|`subscriptions`. Referenced *by*: `riders.payments[]`, `drivers.payments[]`, `trips.pay`, `invoices` key.

---

### 2.8 `complaints` — L2706–2711 | object-keyed-by-id (`CMP-###`) | 4 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'CMP-301'` | Primary key | seed |
| `against` | string | FK | `'DRV-0103'` | → `DB.drivers` | seed |
| `by` | string | FK | `'RDR-2031'` | → `DB.riders` | seed |
| `subject` | string | — | `'Late pickup 3× consecutive'` | Complaint summary | seed |
| `date` | string | `DD MMM` | `'24 Jun'` | Filed date | seed |
| `severity` | string | enum | `'High'` | Severity | seed |
| `status` | string | enum | `'Open'` | State | seed |
| `reasonCode` | string | FK | — | → `DB.reasonCodes[].code`; back-filled by `backfillReasonCodes` | runtime |

**Enumerations**
* `severity`: `'High'`, `'Low'`, `'Medium'` (seed only — no code ever assigns `severity` on a complaint). Full set: **`Low | Medium | High`**.
* `status`: `'Open'`, `'Resolved'` (seed). `resolveComplaint` writes `'Resolved'` (L4381). Full set: **`Open | Resolved`**.

**Readers (6):** `backfillReasonCodes`, `cmpTable`, `driverOpenComplaints`, `hasOpenComplaint`, `openComplaintFor`, `resolveComplaint`.
**Writers:** **none at the collection level** — `resolveComplaint` mutates a record it already holds a reference to (L4381), so no `DB.complaints…=` write site exists. New complaints are never created; the collection is seed-only.
**Foreign keys:** `against`→`drivers`, `by`→`riders`. Referenced *by*: `riders.complaints[]`, `drivers.complaints[]`.

---

### 2.9 `pendingDrivers` — L2712–2743 | array | 5 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'APP-2201'` | Application id | seed |
| `name`, `phone` | string | — | — | Applicant identity | seed |
| `vehicle` | string | — | `'Elantra 2024 · Blue'` | Vehicle | seed |
| `plate` | string | — | `'ABC 4521'` | Plate number | seed |
| `type` | string | enum | `'Economy'` | Service class | seed |
| `applied` | string | prose | `'24 Jun · 2 days ago'` | Application date | seed |
| `dob` | string | `DD MMM YYYY` | `'14 Mar 1994'` | Date of birth | seed |
| `nid` | string | — | `'1098234567'` | National ID | seed |
| `address`, `city`, `gender`, `device`, `appLang`, `lastIp`, `ipLocation`, `hasPhoto` | — | — | — | Same semantics as `drivers` | seed |
| `movementLog[]` | array | — | `{date,action,location}` | Application trail | seed |
| `bank` | object | — | `{bankName,iban,holder,status}` | Payout details, copied verbatim on approval | seed |
| `docs` | object | — | see below | Per-document verification state | seed |
| `acceptedTrips`, `cancelledTrips` | number | trips | `0` | Copied on approval (L11099) | seed |
| `status` | string | enum | `'pending'` | Application state | seed |
| `decidedBy` | string | — | `'Sarah Al-Rashid'` | Who decided (L11114/L11128) — **hardcoded**, not `CURRENT_USER_ID` | runtime |
| `decidedAt` | string | — | `'Just now'` | When decided | runtime |
| `approvedAs` | string | FK | `'DRV-0138'` | → `DB.drivers`, set on approval (L11114) | runtime |
| `reason` | string | enum | `'Document mismatch'` | Rejection reason (L11128) | runtime |
| `docExpiry` | object | — | `{license:'2027-…',…}` | Expiry dates entered during review, read at L11111 | runtime |

**Enumerations**
* `docs` keys: `license`, `id_card`, `vehicle_reg`, `background`, `insurance` (5). Values in the seed: `'✓ Verified'`, `'⏳ Pending'`. `setDocStatus` / `confirmDocReject` write these. Note this key set is **different** from `DOC_TYPES` (L13277: `license`, `vehicle_reg`, `inspection`, `insurance`, `operating_card`) — see §7.
* `status`: `'pending'` (seed), `'approved'` (L11114), `'rejected'` (L11128); `reconsiderApplicant` resets to `'pending'` (L10914). Full set: **`pending | approved | rejected`**.
* `reason` (from the rejection dropdown, L11090): `'Document mismatch'`, `'Failed background check'`, `'Vehicle does not meet requirements'`, `'Incomplete application'`, `'Other'`.
* `type`: `'Economy'`, `'Comfort'`.

**Readers (12):** `approveDriver`, `confirmDocReject`, `confirmRejectDriver`, `reconsiderApplicant`, `rejectDriver`, `renderAllPending`, `renderDashboard`, `renderPendingDrivers`, `saveDocExpiry`, `setDocStatus`, `toggleDocExpiryEdit`, `<top-level>`.
**Writers:** **none at the collection level** — approved/rejected applications are mutated in place and never removed from the array, so the pending queue never shrinks (see §7).
**Foreign keys:** `approvedAs`→`drivers`.

---

### 2.10 `newRiders` — L2744–2748 | array | 3 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'RDR-3001'` | Rider id (same namespace as `DB.riders`) | seed |
| `name`, `phone` | string | — | — | Identity | seed |
| `joined` | string | prose | `'25 Jun · today'` | Registration label | seed |
| `firstAction` | string | prose | `'No trips yet'` | What they have done so far | seed |
| `dob`, `nid`, `address`, `city`, `hasPhoto`, `gender`, `device`, `appLang`, `lastIp`, `ipLocation` | — | — | — | Same semantics as `riders` | seed |
| `movementLog[]` | array | — | `{date,action,location}` | Activity trail | seed |

**Enumerations** — `firstAction` (seed): `'No trips yet'`, `'1 quick ride completed'`, `'Browsing — no trips yet'`.

**Readers (5):** `openNewRiderProfile`, `renderExecOverview`, `renderNewRiders`, `renderRidersTable`, `welcomeRider`.
**Writers:** none — rows are never added or removed. `openNewRiderProfile` (L11156) *copies* a row into `DB.riders` on first view but leaves the original in `newRiders`, so the same person can exist in both collections (§7).
**Foreign keys:** none declared; `id` shares the `RDR-` namespace with `riders`.

---

### 2.11 `commLogs` — L2749–2762 | map: tripId → array | 3 keys / 6 entries

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| *(key)* | string | FK | `'TRP-7741'` | → `DB.trips` | — |
| `type` | string | enum | `'call'` | Communication channel | seed |
| `who` | string | enum | `'Driver → Rider'` | Direction / speaker | seed |
| `dur` | string | `m:ss` | `'0:42'` | Call duration — **calls only** | optional |
| `time` | string | `HH:mm` | `'06:58'` | When | seed |
| `note` | string | — | `'Confirming pickup location'` | Content / transcript line | seed |

**Enumerations**
* `type`: `'call'`, `'chat'` (seed L2750–2760). `commitSendChatMsg` and `simulateLiveChatMessage` write `'chat'`.
* `who`: `'Driver → Rider'`, `'Rider → Driver'` (calls); `'Rider'`, `'Driver'`, `'System'` (chat).

**Readers (4):** `<top-level>`, `buildTripProfile`, `commitSendChatMsg`, `simulateLiveChatMessage`.
**Writers (2):** `commitSendChatMsg`, `simulateLiveChatMessage`.
**Foreign keys:** key→`trips`.

---

### 2.12 `tickets` — L2763–2772 | array | 4 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'TKT-501'` | Ticket id | seed |
| `entity` | string | FK | `'RDR-1075'` | → `DB.riders` **or** `DB.drivers` | seed |
| `entityName` | string | — | `'Sara Al-Ghamdi'` | Denormalised name | seed |
| `subject` | string | — | `'Driver was rude during trip'` | Ticket subject | seed |
| `category` | string | enum | `'Driver behavior'` | Category | seed |
| `priority` | string | enum | `'High'` | Priority | seed |
| `status` | string | enum | `'Open'` | State | seed |
| `created` | string | prose | `'25 Jun · 08:10'` | Created timestamp | seed |
| `agent` | string | — | `'Lina Al-Otaibi'` | Assigned agent; `'—'` when unassigned | seed |
| `thread[]` | array | — | `{from,role,time,msg}` | Message thread | seed |
| `thread[].role` | string | enum | `'rider'` | `'rider'` \| `'driver'` \| `'agent'` | seed |
| `reasonCode` | string | FK | `'CAP_CONDUCT'` | → `DB.reasonCodes[].code`; set by `slaStampNewTicket`/`backfillReasonCodes`/`commitChangeReason` | runtime |
| `slaBreaches[]` | string[] | — | — | Breach kinds already fired, guards against duplicates (L14939) | runtime |

**Enumerations**
* `category` (seed): `'Driver behavior'`, `'Payments'`, `'Billing'`, `'Account'`. At runtime `createTicket` derives it via `rcCategory(reasonCode)` (L2435), so the live set is the `cat` values of `DB.reasonCodes`: **`Captain | Booking | Payment | Trip | Technical | Safety | Feedback | Subscription | Driver | Corporate | Other`** (L14669–14716). A hardcoded `'Pre-departure'` is also possible (L8690).
* `priority`: `'High'`, `'Medium'`, `'Low'` (seed). At runtime derived by `rcPriority()`.
* `status`: `'Open'`, `'In progress'`, `'Resolved'` (seed); code writes `'Closed'` (L2401 `closeConversation`) and `'Open'` (L2412 `reopenTicket`). `setTicketStatus` is the general writer. Full observed set: **`Open | In progress | Waiting on customer | Resolved | Closed`** (`'Waiting on customer'` appears in status comparisons, `slaState` pause logic).

**Readers (24):** `renderTickets`, `buildInterventionItems`, `bulkAssignMe`, `closeConversation`, `commitBulkReason`, `commitChangeReason`, `cptStats`, `createTicket`, `createTicketFor`, `erasureBlockers`, `inboxItems`, `massEventAffected`, `openChangeReason`, `renderContactsPage`, `reopenTicket`, `runAutoReply`, `sendTicketReply`, `setTicketStatus`, `slaStampNewTicket`, `slaSweep`, `toggleScriptStep`, `updateContactsBadge`, `backfillReasonCodes`, `<top-level>`.
**Writers (3):** `<top-level>` (seed + `slaBoot`), `createTicket` (L2435), `createTicketFor` (L2554).
**Foreign keys:** `entity`→`riders`|`drivers`, `reasonCode`→`reasonCodes`. Referenced *by*: `massEvents.ticketIds[]`, `scriptProgress` key.

---

### 2.13 `notifications` — L2773–2780 | array | 6 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'N1'` | Notification id | seed |
| `type` | string | enum | `'alert'` | Category, drives the icon | seed |
| `title` | string | — | `'No-show — TRP-9003'` | Headline | seed |
| `desc` | string | — | `'Bandar Al-Harbi · ride auto-cancelled'` | Detail line | seed |
| `time` | string | prose | `'07:55'` \| `'Yesterday'` \| `'2 days ago'` \| `'Just now'` | Timestamp label | seed |
| `read` | boolean | — | `false` | Read state — flipped by `handleNotifClick` / `markAllRead` | seed |
| `action` | any | — | — | Optional click target, set by `pushOpsNotification` (L9663) | runtime |

**Enumerations** — `type` seed: `'alert'`, `'ticket'`, `'renewal'`, `'approval'`, `'payout'`, `'complaint'`. `pushOpsNotification(type,…)` accepts any string; observed call sites also pass `'ticket'` (L14941). **UNVERIFIED**: the full runtime set is open, not closed.

**Readers (5):** `handleNotifClick`, `markAllRead`, `renderAllNotificationsPage`, `renderNotifPanel`, `updateBellBadge`.
**Writers (1):** `pushOpsNotification` (L9663).
**Foreign keys:** none structurally; ids appear inside `title`/`desc` as free text only.

**Note:** `NOTIF_PRIORITY_RANK`/`NOTIF_PRIORITY_LABEL` (L2188–2189) define a `critical|high|medium|low` priority vocabulary, but **no seed notification carries a `priority` field**, and `NOTIF_PRIORITY_LABEL` has zero readers (§6).

---

### 2.14 `liveTrips` — L2781–2785 | array | 3 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | FK | `'TRP-7741'` | → `DB.trips` (same id namespace) | seed |
| `rider` | string | FK | `'RDR-1041'` | → `DB.riders` | seed |
| `driver` | string | FK | `'DRV-0101'` | → `DB.drivers` | seed |
| `stage` | number | 0-based index | `3` | Index into `STAGES` (L11495) | seed |
| `eta` | string | prose | `'4 min'` \| `'2 min to pickup'` | ETA label | seed |
| `route` | string | — | `'King Fahd St → KFUPM'` | Route | seed |
| `mapTrip` | string \| null | FK | `'TRP-7741'` | Key into `MAP_ROUTES`/`TRIP_COORDS`; `null` for runtime trips (L11898) | seed |
| `type` | string | enum | `'Economy'` | Service class — added only by runtime pushes (L11898, L12483) | runtime |

**Enumerations** — `stage` ∈ `{0..4}` indexing `STAGES = ['Requested','Driver assigned','En route to pickup','In trip','Completed']` (L11495). Seed uses `2` and `3`; code pushes `2` (L11898, L12483).

**Readers (17):** `cancelLiveTrip`, `commitAddStop`, `commitLiveReassign`, `completeTrip`, `confirmCancelLiveTrip`, `drawMap`, `driverLiveState`, `initMapClicks`, `interveneTrip`, `openAddStopModal`, `openTripChatView`, `reassignLiveDriver`, `renderActiveTrips`, `renderRideRequestTracking`, `tickEngine`, `updateLiveMarkers`, `<top-level>`.
**Writers (4):** `commitRequestAssign` (L12483), `completeTrip`, `confirmCancelLiveTrip`, `driverAcceptOffer` (L11898).
**Foreign keys:** `id`→`trips`, `rider`→`riders`, `driver`→`drivers`, `mapTrip`→`MAP_ROUTES`/`TRIP_COORDS` (globals, not `DB`).

---

### 2.15 `rideRequests` — L2786–2790 | array | 3 seed (+53 at runtime)

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'REQ-501'` | Request id | seed |
| `rider` | string | FK | `'RDR-2090'` | → `DB.riders` | seed |
| `pickup` | string | — | `'Al Sahafa District'` | Origin district — mapped to a zone by `zoneOfPickup` | seed |
| `dest` | string | — | `'King Saud University'` | Destination | seed |
| `type` | string | enum | `'Economy'` | Requested class | seed |
| `waiting` | string | `m:ss` | `'0:38'` | Time spent searching | seed |
| `status` | string | enum | `'searching'` | Funnel state | seed |
| `requestedAt` | string | `DD MMM HH:mm` | `'25 Jun 08:36'` | Request time — parsed by `parseReqTimestamp` | seed |
| `vip` | boolean | — | `true` | VIP flag, only from `commitNewRideRequest` (L2488) | runtime |
| `offerTo` / `offerIndex` / `offerSentAt` | — | — | — | Offer-engine bookkeeping written by `sendDriverOffer` (L11990) / `nextOfferCandidate` | runtime |
| `assignment` | — | — | — | **Appears in the seed comment scope but is never read anywhere** (see §6) | UNVERIFIED |

**Enumerations** — `status`: seed has `'searching'`, `'no_drivers'`. Code assigns `'offered'` (L11990), `'searching'` (L12009), `'no_drivers'` (L12545), `'assigned'` (L10289 on the *subscriptionRequests* path; `seedMoreRequests` L9849 also pushes `'assigned'`), `'expired'` (L9687, L9850). Full set: **`searching | offered | assigned | no_drivers | expired`**.

**Readers (17):** `assignManually`, `buildInterventionItems`, `cancelRequest`, `commitNewRideRequest`, `commitRequestAssign`, `driverAcceptOffer`, `exportRequestsSnapshot`, `nextOfferCandidate`, `openRideRequestTracking`, `refreshNavCounts`, `renderRequestsInstantAll`, `renderRequestsPage`, `renderRideRequestTracking`, `renderRideRequests`, `reqClearLocks`, `tickEngine`, `<top-level>`.
**Writers (5):** `cancelRequest`, `commitNewRideRequest` (L2490), `commitRequestAssign`, `driverAcceptOffer`, `seedMoreRequests` (L9840).
**Foreign keys:** `rider`→`riders`; `offerTo`→`drivers`.

---

### 2.16 `subscriptionRequests` — L2794–2800 | array | 5 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'SREQ-001'` | Request id | seed |
| `rider` | string | FK | `'RDR-3001'` | → `DB.riders` / `DB.newRiders` | seed |
| `plan` | string | enum | `'weekly'` | **A `DB.plans` key**, unlike `subscriptions.plan` which is a label | seed |
| `vehicle` | string | enum | `'Economy'` | Requested class | seed |
| `pickup`, `dest` | string | — | — | Route ends | seed |
| `preferredTime` | string | `hh:mm AM/PM` | `'07:00 AM'` | Desired departure | seed |
| `requestedAt` | string | `DD MMM HH:mm` | `'25 Jun 07:45'` | When requested | seed |
| `status` | string | enum | `'pending'` | State | seed |
| `assignedSub` | string | FK | `'SUB-1052b'` | → `DB.subscriptions`, on assignment | optional |
| `assignedBy` | string | — | `'Sarah Al-Rashid'` | Operator name (L10289) | optional |
| `assignedAt` | string | — | `'25 Jun 07:10'` | When assigned | optional |
| `expiredAt` | string | — | `'25 Jun 06:00'` | When the search window lapsed (L9687) | optional |
| `notes` | string | — | `'First subscription — wants female driver…'` | Free text | seed |
| `hold` | object | — | — | Escrow hold created by `ensureHold(r)` (L9631) | runtime |
| `approvalCorp` etc. | — | — | — | Corporate approval fields (L9982/L9994) | runtime |

**Enumerations**
* `plan`: `'weekly'`, `'biweekly'`, `'monthly'` — the exact key set of `DB.plans` (L2890–2894), `PLANS` (L4389) and `CADENCE_DAYS` (L11231).
* `status`: `'pending'`, `'assigned'`, `'expired'` (seed); code writes `'assigned'` (L10289), `'pending'` (L10306 `reopenSubReq`, which also deletes `expiredAt`), `'expired'` (L9687), `'declined'` (L9995 `rejectSubReqCorp`). Full set: **`pending | assigned | expired | declined`**.
* `vehicle`: `'Economy'`, `'Comfort'`.

**Readers (14):** `approveSubReqCorp`, `commitSubReqAssign`, `exportRequestsSnapshot`, `openSubReqAssign`, `processSubReqSearchWindow`, `refreshNavCounts`, `rejectSubReqCorp`, `renderRequestsPage`, `renderRequestsSubAll`, `reopenSubReq`, `reqClearLocks`, `showZoneHourly`, `zoneSubMomentum`, `<top-level>`.
**Writers (1):** `seedMoreRequests`. All other mutations are in-place on a held reference.
**Foreign keys:** `rider`→`riders`, `plan`→`plans` key, `assignedSub`→`subscriptions`.

---

### 2.17 `escrowHolds` — L2801–2806 | array | 4 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'ESC-1041'` | Hold id | seed |
| `sub` | string | FK | `'SUB-1041'` | → `DB.subscriptions` | seed |
| `driver` | string | FK | `'DRV-0101'` | → `DB.drivers` | seed |
| `rider` | string | FK | `'RDR-1041'` | → `DB.riders` | seed |
| `amount` | number | SAR | `69.20` | Held amount — **number, unlike `payments.amount`** | seed |
| `tripsRequired` | number | trips | `5` | Trips needed to release | seed |
| `tripsCompleted` | number | trips | `4` | Trips done so far | seed |
| `status` | string | enum | `'held'` | Hold state | seed |
| `releasedAt` / `capturedAt` | string | — | — | Set by `releasePaymentHold` (L9602) / `capturePaymentHold` (L9608) | runtime |

**Enumerations** — `status`: `'held'`, `'ready'` (seed); code writes `'released'` (L9602) and `'captured'` (L9608). Full set: **`held | ready | released | captured`**.

**Readers (5):** `buildEntityProfile`, `confirmReleaseEscrow`, `renderEscrow`, `renderExecOverview`, `<top-level>`.
**Writers:** `<top-level>` only. Status changes happen in place on the referenced object.
**Foreign keys:** `sub`→`subscriptions`, `driver`→`drivers`, `rider`→`riders`.

**Consistency check:** `ESC-1041` says `tripsCompleted:4/5` (L2802) while `SUB-1041.trips` says `'5/5'` (L2686). The two counters disagree (§7).

---

### 2.18 `deductions` — L2807–2811 | array | 3 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'DED-01'` | Deduction id | seed |
| `driver` | string | FK | `'DRV-0103'` | → `DB.drivers` | seed |
| `type` | string | free text | `'Late pickup (+8 min)'` | Reason for the penalty | seed |
| `trip` | string | FK | `'TRP-7742'` | → `DB.trips` | seed |
| `amount` | number | SAR | `15` | Deducted amount | seed |
| `date` | string | `DD MMM` | `'25 Jun'` | Date | seed |
| `status` | string | enum | `'pending'` | State | seed |

**Enumerations** — `status`: `'pending'`, `'applied'` (seed); code writes `'applied'` (L7077, top-level `applyDeduction` path) and `'waived'` (L8989 `waiveDeduction`). Full set: **`pending | applied | waived`**.
`type` is free text, not an enum — the three seed values are distinct prose strings.

**Readers (6):** `applyDeduction`, `buildEntityProfile`, `renderDashboard`, `renderDeductions`, `waiveDeduction`, `<top-level>`.
**Writers:** none at the collection level (records mutated in place).
**Foreign keys:** `driver`→`drivers`, `trip`→`trips`.

---

### 2.19 `payouts` — L2812–2816 | map: driverId → record | 3 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| *(key)* | string | FK | `'DRV-0101'` | → `DB.drivers` | — |
| `trips` | number | trips | `412` | Trips in the payout basis | seed |
| `earned` | number | SAR | `2840` | Gross earned | seed |
| `paidOut` | number | SAR | `2200` | Already paid | seed |
| `pending` | number | SAR | `640` | Awaiting payout | seed |
| `lastPayout` | string | `DD MMM` | `'22 Jun'` | Last payout date | seed |
| `deductionNote` | string \| null | — | `null` | Note attached by `applyDeduction` | seed |

**Readers (3):** `applyDeduction`, `ensurePayoutEntry`, `<top-level>`.
**Writers (1):** `ensurePayoutEntry`.
**Foreign keys:** key→`drivers`.

**Coverage gap:** only 3 of the 6 seeded drivers have payout rows (`DRV-0103`, `DRV-0105`, `DRV-0106` are missing) — `ensurePayoutEntry` exists precisely to backfill this on demand.

---

### 2.20 `circuits` — L2817–2829 | map: driverId → array | 2 keys / 7 legs

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| *(key)* | string | FK | `'DRV-0101'` | → `DB.drivers` | — |
| `time` | string | `HH:mm` | `'06:15'` | Leg departure time | seed |
| `rider` | string | FK | `'RDR-1080'` | → `DB.riders` | seed |
| `km` | string | `'N.N km'` | `'8.2 km'` | Leg distance — **string with unit baked in** | seed |
| `status` | string | enum | `'Done'` | Leg state | seed |

**Enumerations** — `status`: `'Done'`, `'Active'`, `'+8 min'`, `'Pending'` (seed only). Nothing writes this collection, so the seed *is* the closed set.

**Readers (1):** `renderDriverCircuit`.
**Writers:** **none — the collection is entirely read-only** (§6).
**Foreign keys:** key→`drivers`, `rider`→`riders`.

---

### 2.21 `teamUsers` — L2830–2841 | array | 5 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'USR-1'` | Operator id; `CURRENT_USER_ID` defaults to `'USR-1'` (L2862) | seed |
| `name` | string | — | `'Sarah Al-Rashid'` | Full name | seed |
| `email` | string | email | `'sarah@eyvar.com'` | Login email | seed |
| `phone` | string | — | `'+966 50 123 4567'` | Contact | seed |
| `photo` | string \| null | data-URI | `null` | Avatar, set by `handleAvatarUpload`, cleared by `removeAvatar` | seed |
| `role` | string | enum | `'Owner'` | Role | seed |
| `lastLogin` | string | prose | `'Today 09:00'` \| `'Not yet'` | Last login label | seed |
| `status` | string | enum | `'Active'` | Account state | seed |
| `twoFA` | boolean | — | `true` | 2FA enabled — toggled by `toggleMa2FA` | seed |
| `permissions[]` | string[] | enum | `['approve_drivers',…]` | Legacy permission grants | seed |
| `pagePerms` | object | — | — | Per-page permission map derived by `defaultPagePerms()` from `permissions` (L10658) | runtime |

**Enumerations**
* `role`: `'Owner'`, `'Finance'`, `'Support'`, `'Ops Manager'` (seed) — matching `TEAM_ROLES` (L10501). `DB.compPolicy.roles` (L15380–15385) keys on `'Owner'`, `'Operations'`, `'Support'`, `'Finance'`, `'default'` — **`'Operations'` does not exist as a role value**, so an Ops Manager falls through to `'default'` limits (§7).
* `status`: `'Active'`, `'Invited'` (seed). `commitInvite` creates `'Invited'` rows.
* `permissions[]` — the closed 13-member set from `PERMISSION_LABELS` (L3225–3239): `approve_drivers`, `manage_subscriptions`, `live_ops`, `manage_plans`, `view_finance`, `process_payouts`, `release_escrow`, `apply_deductions`, `manage_tickets`, `view_profiles`, `contact_users`, `manage_team`, `manage_settings`. Seed grants: USR-1 all 13; USR-2 five (`process_payouts`, `release_escrow`, `apply_deductions`, `view_finance`, `view_profiles`); USR-3 and USR-4 three each (`manage_tickets`, `view_profiles`, `contact_users`); USR-5 eight.

**Readers (55 functions):** the RBAC core `can()`, `requirePerm`, `effectivePermissions`, `currentRole`, `meUser`, `currentUserName`, `currentUserPagePerms`, plus `logAction`, `logContact`, `logGoodwill`, `commitHandover`, `decideEmergency`, `decideFairness`, `renderTeamTable`, `renderMaProfile`, `renderMaPermissions`, `renderRoleMatrix`, `presenceBoot`, `onCallNow`, and ~35 more.
**Writers (1):** `commitInvite`. All edits (`commitEditTeamUser`, `saveUserPermissions`, `toggleRolePermission`, `handleAvatarUpload`, …) mutate a held reference.
**Foreign keys:** referenced *by* `auditLog.actorId`, `loginSessions` key, `onCall.primary`/`.secondary`, `onCallSchedule.assign` values, `presence` key, `ownership.ownerId`, `handovers.fromId`/`.toId`, `surgeSuspensions.setBy`, `rateCard.approvedBy`/`.proposedBy`, `contacts.agentId`, `goodwillLedger.agentId`.

---

## 3. Collections assigned later (`DB.<key>= …`)

All 80 of these are assigned by a **top-level statement** (column 0), not inside a function, so they exist unconditionally at load. Nine keys are *also* reassigned inside functions (`DB.opsLimits=` L7425, `DB.paymentGateways=` L7509, `DB.cities=` L7892, `DB.searchPhases=` L8110, `DB.surgeSchedule=` L12316, `DB.quickRideTypes=` L12370, `DB.incentives=` L13726, `DB.branding=` L18455, `DB.rateCard=` L21597) — those are filter/replace operations on an already-defined key, not definitions.

### 3.1 `auditLog` — L2863–2879 | array | 8 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'AUD-0008'` | Entry id | seed |
| `ts` | string | `DD MMM, hh:mm AM/PM` | `'25 Jun, 08:14 AM'` | When | seed |
| `actorId` | string | FK | `'USR-1'` | → `DB.teamUsers` | seed |
| `actorName` | string | — | `'Sarah Al-Rashid'` | Denormalised actor name | seed |
| `action` | string | enum | `'assign_driver'` | Action key — see `ACTION_LABELS` (L2898) | seed |
| `entityType` | string | enum | `'trip'` | What kind of thing was acted on | seed |
| `entityId` | string | — | `'UST-1'` | Id of that thing (`''` when N/A) | seed |
| `summary` | string | — | `'Assigned Ahmed Salem to …'` | Human summary | seed |
| `before` | object \| null | — | `{driver:'—'}` | State before | seed |
| `after` | object \| null | — | `{driver:'Ahmed Salem',distance:'1.9 km'}` | State after | seed |

**Enumerations**
* `action` seed values (8): `assign_driver`, `apply_deduction`, `invite_team_user`, `process_all_payouts`, `release_escrow`, `approve_driver`, `edit_user_permissions`, `pay_driver`. `ACTION_LABELS` (L2898–2914) declares **26** keys. Code emits at least these additional actions not in `ACTION_LABELS`: `late_pickup_logged` (L16681), `plan_leg_confirmed` (L18209), `ledger_rejected` (L19925), `credit_note_issued` (L15884), `surge_suspended` (L21537). See §6.
* `entityType` seed: `trip`, `driver`, `team_user`, `finance`. Code also emits `ride_request` (L2492), `promo` (L13529), `money` (L19925), `pricing` (L21537), `rider`, `ownership` (L18885).

**Readers (8):** `auditForEntity`, `exportAuditLog`, `logAction`, `renderAuditLog`, `renderExportCounts`, `settingsLastUpdated`, `showTeamMemberProfile`, `<top-level>`.
**Writers (2):** `<top-level>` (seed), `logAction` — the single append point (called at every successful mutation).
**Foreign keys:** `actorId`→`teamUsers`; `entityId`→ the collection named by `entityType` (polymorphic, unenforced).

---

### 3.2 `refunds` — L2881–2884 | array | 2 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'REF-0002'` | Refund id | seed |
| `date` | string | `DD MMM` | `'19 Jun'` | Refund date | seed |
| `riderId` | string | FK | `'RDR-2087'` | → `DB.riders` | seed |
| `riderName` | string | — | `'Layla Al-Faraj'` | Denormalised name | seed |
| `amount` | number | SAR | `69.20` | Refunded amount | seed |
| `reason` | string | enum-ish | `'Rider request'` | Why | seed |
| `source` | string | enum | `'Subscription cancellation'` | What generated it | seed |
| `relatedId` | string | FK | `'SUB-0998'` | → `DB.subscriptions` | seed |
| `processedBy` | string | — | `'Sarah Al-Rashid'` | Operator | seed |
| `status` | string | enum | `'Processed'` | State | seed |

**Enumerations** — `reason` seed: `'Rider request'`, `'Driver unavailable'`. `source` seed: `'Subscription cancellation'`. `status` seed: `'Processed'`. No code assigns any of these three fields to a different value, so the seed is the observed set. **UNVERIFIED** whether `recordRefund` accepts other values — it takes them as arguments.

**Readers (8):** `backfillCreditNotes`, `backfillReasonCodes`, `contributionMargin`, `ledgerReconcile`, `recordRefund`, `renderDashboard`, `renderRefundsTable`, `<top-level>`.
**Writers (2):** `<top-level>`, `recordRefund` (wrapped at L19961 by `__origRecordRefund` so every refund also posts to `DB.ledger`).
**Foreign keys:** `riderId`→`riders`, `relatedId`→`subscriptions`. Referenced *by*: `creditNotes.refundId`.

---

### 3.3 `plans` — L2889–2896 | map: planKey → record | 3 records

Keys: `weekly`, `biweekly`, `monthly`.

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `key` | string | — | `'weekly'` | Self-key | seed |
| `name` | string | — | `'Weekly'` | English name | seed |
| `nameAr` | string | — | `'الباقة الأسبوعية'` | Arabic name | seed |
| `duration` | number | days | `7` | Cycle length — **duplicated by `CADENCE_DAYS` L11231** | seed |
| `execute` | number | trips | `5` | Trips included — **duplicated by `PLANS[k].exec` L4389** | seed |
| `cap` | number | count | `1` | Postponement/skip cap | seed |
| `eyvarPct` | number | % | `20` | Platform commission — **duplicated by `CADENCE_META` L4520** | seed |
| `discountPct` | number | % | `0` | Plan discount — **duplicated by `CADENCE_META`** | seed |
| `ecoMin` | number | SAR/min | `0.95` | Economy per-minute rate | seed |
| `ecoKm` | number | SAR/km | `1.10` | Economy per-km rate | seed |
| `comfortMin` | number | SAR/min | `1.35` | Comfort per-minute rate | seed |
| `comfortKm` | number | SAR/km | `1.60` | Comfort per-km rate | seed |
| `sortOrder` | number | — | `1` | Display order | seed |
| `ecoActive` | boolean | — | `true` | Economy variant offered | seed |
| `comfortActive` | boolean | — | `true` | Comfort variant offered | seed |
| `status` | string | enum | `'Active'` | Plan lifecycle state | seed |
| `features[]` | array | — | `{en,ar}` | Bilingual selling points — **`PLAN_FEATURES` L5992 duplicates weekly's list** | seed |

**Enumerations** — `status`: `'Active'` (weekly, biweekly), `'Draft'` (monthly, L2894). Code writes `'Active'` (L5961 `doActivatePlan`), `'Draft'` (L5982 `doDeactivatePlan`), `'Archived'` (L6170 `doArchivePlan`). Full set: **`Draft | Active | Archived`**.

**Readers (16):** `archivePlan`, `commissionRateForPlan`, `confirmActivatePlan`, `confirmDeactivatePlan`, `doActivatePlan`, `doArchivePlan`, `doDeactivatePlan`, `liveSubtitles`, `loadPlanEditForm`, `newPlan`, `renderDashboard`, `renderPlansFormSelects`, `renderPlansTable`, `savePlan`, `toggleVehicleActive`, `<top-level>`.
**Writers (2):** `<top-level>`, `newPlan`.
**Foreign keys:** referenced *by* `subscriptionRequests.plan` (the key), and indirectly by `subscriptions.plan` (a composed label, not the key).

**Critical finding:** the *pricing* half of the app never reads `DB.plans`. `PLANS` (L4389), `CADENCE_META` (L4520), `CADENCE_DAYS` (L11231) and `PLAN_FEATURES` (L5992) hold parallel copies, and `finalizeNewSub`/`materializeSubscription`/`renewOptionsFor` price off those globals. Editing a plan in the admin UI therefore cannot change what a new subscription costs. See `GLOBAL-STATE.md` §Duplication.

---

### 3.4 `loginSessions` — L2994–3003 | map: userId → array | 4 keys / 5 sessions

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| *(key)* | string | FK | `'USR-1'` | → `DB.teamUsers` | — |
| `id` | string | — | `'SESS-1'` | Session id | seed |
| `device` | string | — | `'Chrome on macOS'` | User agent label | seed |
| `location` | string | — | `'Riyadh, SA'` | Geo-IP label | seed |
| `ip` | string | IPv4 | `'92.96.7.40'` | IP | seed |
| `lastActive` | string | prose | `'Active now'` \| `'2 hours ago'` \| `'3 days ago'` | Recency label | seed |
| `current` | boolean | — | `true` | The session viewing the panel now | seed |

Per-user counts: `USR-1` 3, `USR-2` 1, `USR-3` 1, `USR-4` 0 (L2995–3002). `USR-5` has **no key at all** — `renderMaSecurity` guards with `||[]` (L3007).

**Readers (3):** `logOutSession`, `renderMaSecurity`, `<top-level>`. **Writers (1):** `<top-level>` only — `logOutSession` splices the held array.
**Foreign keys:** key→`teamUsers`.

---

### 3.5 `upcomingSubTrips` — L6177–6242 | array | 8 records

Re-asserted at L6243 as `DB.upcomingSubTrips=DB.upcomingSubTrips||[…4 rows…]`. Because the L6177 assignment already produced a truthy array, **the 4-row fallback is dead code** — the 8-row version always wins.

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'UST-1'` | Leg id | seed |
| `sub` | string | FK | `'SUB-1041'` | → `DB.subscriptions` | seed |
| `rider` | string | FK | `'RDR-1041'` | → `DB.riders` | seed |
| `driver` | string | FK | `'DRV-0101'` | → `DB.drivers` | seed |
| `scheduledTime` | string | prose | `'10:00 AM'` \| `'Tomorrow 06:30 AM'` | Departure | seed |
| `minutesUntil` | number | minutes | `46` | Countdown | seed |
| `riderConfirmed` | boolean | — | `true` | Rider confirmed the leg | seed |
| `confirmedAt` | string \| null | prose | `'08:14 AM'` | When confirmed | seed |
| `driverStatus` | string | enum | `'moving'` | Captain readiness | seed |
| `unavailReason` | string | — | `'Vehicle breakdown — flat tyre reported'` | Only when `driverStatus==='unavailable'` | optional |
| `route` | string | — | `'King Fahd St → KFUPM Gate 1'` | Route | seed |
| `notes` | string | — | `'Regular daily run — no issues'` | Ops note | seed |

**Enumerations** — `driverStatus`: **`moving | not_started | unavailable`** (L6182/6190/6198, confirmed by the comparisons at L11512-region and `driverStatus===` greps).

**Readers (10):** `buildInterventionItems`, `buildSubProfile`, `commitDriverChange`, `refreshNavCounts`, `renderCapacityGrid`, `renderSubRequests`, `renderSubscriptionsTable`, `showZoneHourly`, `tickEngine`, `<top-level>`.
**Writers (2):** `<top-level>`, `generateUpcomingTripsForSubscription`.
**Foreign keys:** `sub`→`subscriptions`, `rider`→`riders`, `driver`→`drivers`.

**Data-integrity note:** `UST-2` (L6186) pairs `sub:'SUB-1052'` with `rider:'RDR-1080'`, but `SUB-1052.rider` is `'RDR-2031'` (L2687) and `RDR-1080` belongs to `SUB-1060` (L2688). Similarly `UST-6` (L6210) attaches `RDR-1090` to `SUB-1041` whose rider is `RDR-1041`. Several of the 8 rows have rider/sub pairs that contradict `DB.subscriptions` (§7).

---

### 3.6 `cashLedger` — L12080 | array | 0 seed

Populated by `maybeGenerateCashEvent` (entry built L12124–L12131, pushed L12132).

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'CASH-1'` | `'CASH-'+(++window.__cashSeq)` (L12125) | runtime |
| `tripId` | string | FK | — | → `DB.trips` | runtime |
| `driver` | string | FK | — | → `DB.drivers` | runtime |
| `rider` | string | FK | — | → `DB.riders` | runtime |
| `expectedFare` | number | SAR | — | What the meter said | runtime |
| `reportedAmount` | number \| null | SAR | — | What the driver reported; `null` = no report | runtime |
| `topupAmount` | number | SAR | — | Wallet top-up applied | runtime |
| `reason` | string \| null | enum | — | One of `CASH_REASONS` (L12100), 45 % of the time | runtime |
| `classification` | string | enum | — | `classifyCashReport()` verdict | runtime |
| `riderConfirmed` | boolean | — | — | Rider confirmed the amount | runtime |
| `status` | string | enum | `'pending'` | Review state | runtime |
| `createdAt` | string | — | — | `fmtReqNowLabel()` | runtime |

**Enumerations** — `classification` is fully closed: `classifyCashReport()` (L12083–L12087) returns exactly **`match`** (|deviation| ≤ `CASH_TOLERANCE` = 2.00 SAR, L12077), **`over_report`**, or **`under_report`**; `maybeGenerateCashEvent` substitutes **`no_report`** when `reportedAmount==null` (L12123). Full set: **`match | over_report | under_report | no_report`**. `status` is `'pending'` when the classification is `under_report` or `no_report`, otherwise `'resolved'` (L12129). `reason` ∈ `CASH_REASONS` (L12100), three fixed strings. `applyCashDebtImpact` additionally writes a **`debtAdded`** field onto the entry (L12090) that the seed shape does not declare.
`status`: `'pending'` \| `'resolved'` (L12129).
`reason` ∈ `CASH_REASONS` (L12100): three fixed strings.

**Readers (4):** `commitCashResolve`, `driverCashRiskCount`, `renderCashReconciliation`, `resolveCashEntry`. **Writers (2):** `<top-level>`, `maybeGenerateCashEvent`.
**Foreign keys:** `tripId`→`trips`, `driver`→`drivers`, `rider`→`riders`.

---

### 3.7 `driverCashDebt` — L12081 | map: driverId → number | 0 seed

Value is a **signed SAR balance**; negative means the driver owes Eyvar. `driverCashBlocked(id)` returns true when the balance `<= CASH_DEBT_CAP` (`-300`, L12078, check at L12082). Written by `applyCashDebtImpact` (L12091) and zeroed by `commitCashRepayment` (L12207).
**Readers (6):** `applyCashDebtImpact`, `commitCashRepayment`, `driverCashBlocked`, `driverRiskScore`, `recordCashRepayment`, `renderCashReconciliation`. **Writers (3):** `<top-level>`, `applyCashDebtImpact`, `commitCashRepayment`.
**Foreign keys:** key→`drivers`.

---

### 3.8 `subBackups` — L13140 | map: subId → driverId | 2 records

`{'SUB-1052':'DRV-0105','SUB-1060':'DRV-0101'}`. Re-asserted defensively at L17197 (`DB.subBackups=DB.subBackups||{}` — a no-op).
**Readers (10):** `assignBackup`, `commitMenu`, `driverRiskScore`, `installActionGates`, `openRetentionAction`, `promoteBackup`, `renderCoveragePage`, `subHealthScore`, `subIsCovered`, `<top-level>`. **Writers (3):** `<top-level>`, `commitBackup`, `promoteBackup`.
**Foreign keys:** key→`subscriptions`, value→`drivers`.

---

### 3.9 `backupRegistry` — L17198 | **alias** of `subBackups`

`DB.backupRegistry=DB.subBackups;` — the same object reference, **not a copy**. Writing through either name mutates the other. Declared as a `needs` of two boot steps (L21818–L21819).
**Readers (3):** `backupCoverage`, `hasBackup`, `renderCommitmentPage`. **Writers (2):** `<top-level>`, `dispatchBoot`.

---

### 3.10 `driverDocs` — L13278–13284 | map: driverId → record | 5 records

Fields are the five `DOC_TYPES` keys (L13277): `license`, `vehicle_reg`, `inspection`, `insurance`, `operating_card`. Each value is an ISO date string `'YYYY-MM-DD'` (e.g. `'2027-03-12'`, L13279). `docDaysLeft()` (L13287) computes days remaining against `REQ_NOW_REF`.

All five keys are only ever accessed **dynamically** via `DOC_TYPES.forEach(dt => …[dt[0]])` (L11113, `complianceScan`, `renderCompliancePage`), so a literal-name grep shows zero direct reads — they are *not* orphans.

`DRV-0106` (seeded L2664) has **no `driverDocs` entry**, so it is invisible to `complianceScan` until `approveDriver` style backfill runs.

**Readers (7):** `approveDriver`, `complianceScan`, `driverRiskScore`, `markDocRenewed`, `openDocDateEditor`, `renderCompliancePage`, `saveDriverDocDates`. **Writers (3):** `<top-level>`, `approveDriver` (L11112–13), `saveDriverDocDates`.
**Foreign keys:** key→`drivers`.

---

### 3.11 `complianceSuspensions` — L13285 | map: driverId → string | 0 seed

Value is a free-text reason. Two writers produce structured prefixes:
* `complianceScan` L13307 → `'Expired: '+expired.join(', ')` (auto, cleared at L13311 when nothing is expired).
* `precautionSuspend` L13468 → `'Precautionary — pending '+incId+' investigation'`.
`renderSafetyPage` counts precautionary suspensions with `/Precautionary/.test(...)` (L13404) — the prefix is load-bearing.
**Readers (6):** `complianceScan`, `driverRiskScore`, `renderCompliancePage`, `renderSafetyPage`, `steerableDrivers`, `subHealthScore`. **Writers (3):** `<top-level>`, `complianceScan`, `precautionSuspend`.
**Foreign keys:** key→`drivers`.

---

### 3.12 `incidents` — L13389–13393 | array | 3 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'INC-014'` | Incident id | seed |
| `type` | string | enum | `'SOS'` | Incident kind | seed |
| `severity` | string | enum | `'critical'` | Severity | seed |
| `status` | string | enum | `'open'` | State | seed |
| `opened` | string | prose | `'09:02'` \| `'Yesterday 18:40'` \| `'22 Jun'` | When opened | seed |
| `trip` | string | FK | `'TRP-9012'` | → `DB.trips` | seed |
| `reporter` | string | FK | `'RDR-2087'` | → `riders`/`drivers` | seed |
| `against` | string \| null | FK | `'DRV-0102'` | → `drivers` (or `null`) | seed |
| `summary` | string | — | — | Description | seed |
| `steps` | object | — | `{contact:{done},verify:{done},act:{done},document:{done}}` | 4-step protocol, keys from `INC_STEPS` (L13394) | seed |
| `steps.<k>.by` / `.at` | string | — | `'Sarah Al-Rashid'` / `'22 Jun 10:15'` | Set when a step is completed | optional |

**Enumerations**
* `type` (seed): `'SOS'`, `'Accident'`, `'Harassment report'`. Free-form — no code assigns it.
* `severity`: `'critical'`, `'high'` (seed). `severity===` comparisons in the file cover `critical`, `high`, plus `'Medium'`/`'High'` (those belong to `complaints`) and `'orphan'` (an integrity-scan value, unrelated). **Observed incident set: `critical | high`** — a `medium`/`low` tier is not evidenced. `UNVERIFIED` whether lower tiers are intended.
* `status`: `'open'`, `'closed'` (seed); `closeIncident` writes `'closed'` (L13481). Full set: **`open | closed`**.
* `steps` keys are exactly `INC_STEPS` (L13394): `contact`, `verify`, `act`, `document` — accessed dynamically, so not orphans.

**Readers (9):** `closeIncident`, `driverRiskScore`, `inboxItems`, `precautionSuspend`, `renderPredIncidents`, `renderPredictivePage`, `renderSafetyPage`, `subHealthScore`, `toggleIncStep`. **Writers (1):** `<top-level>` only — incidents are never created at runtime.
**Foreign keys:** `trip`→`trips`, `reporter`→`riders`|`drivers`, `against`→`drivers`.

**Dangling references:** `INC-013.trip='TRP-8977'` (L13391) and `INC-011.trip='TRP-8720'` (L13392) do **not** exist in `DB.trips` (which holds only TRP-77xx/90xx ids, L2670–2683). Same for `lostFound` (§3.21).

---

### 3.13 `promos` — L13495–13500 | array | 4 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `code` | string | — | `'EYVAR30'` | Promo code (primary key) | seed |
| `discountPct` | number | % | `30` | Discount | seed |
| `budget` | number | SAR | `5000` | Budget cap | seed |
| `spent` | number | SAR | `4180` | Spend to date | seed |
| `uses` | number | count | `214` | Redemptions | seed |
| `newSubs` | number | count | `61` | Attributed new subscriptions | seed |
| `perUserLimit` | number | count | `1` | Redemptions per rider | seed |
| `target` | string | prose | `'New riders only'` | Audience description | seed |
| `expires` | string | ISO date | `'2026-07-31'` | Expiry | seed |
| `status` | string | enum | `'active'` | State | seed |

**Enumerations** — `status`: `'active'`, `'exhausted'`, `'expired'` (seed); `pausePromo` writes `'paused'` (L13529), `resumePromo` writes `'active'` (L13530). Full set: **`active | paused | exhausted | expired`**.
`promoROI(p)` (L13501) values a new sub at a hardcoded **86.50 SAR** — the weekly-economy price from `PLANS` (L4390), duplicated a fourth time.

**Readers (5):** `commitNewPromo`, `contributionMargin`, `pausePromo`, `renderPromoList`, `resumePromo`. **Writers (4):** `<top-level>`, `commitNewPromo`, `pausePromo`, `resumePromo`.

---

### 3.14 `incentives` — L13564–13569 | array | 4 records

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'INV-1'` | Incentive id | seed |
| `name` | string | — | `'Perfect package bonus'` | Name | seed |
| `rule` | string | prose | `'Complete a package with 0 missed trips'` | Eligibility rule (**prose, not executable**) | seed |
| `reward` | string | prose | `'+40 SAR per package'` | Reward description (**prose, not a number**) | seed |
| `active` | boolean | — | `true` | Enabled | seed |

**Readers (4):** `commitAwardIncentive`, `openAwardIncentiveModal`, `removeIncentiveRule`, `renderIncentives`. **Writers (4):** `<top-level>`, `addIncentiveRule`, `removeIncentiveRule` (L13726 filter), `renderIncentives`.
**Foreign keys:** referenced *by* `driverBonusLog.incentiveId`.

**Note:** `reward` is prose, so the actual bonus amount must be re-entered by the operator in `commitAwardIncentive` — the rule and the payout are not linked (the header comment at L13570–13573 says so explicitly).

---

### 3.15 `dailySnapshots` — L13802–13833 | array | 30 records (`.reverse()`d at L13833)

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'SNAP-0001'` | Snapshot id | seed |
| `date` | string | `D MMM HH:mm` | `'26 Jun 09:00'` | Snapshot time | seed |
| `riders` | number | count | `6` | Rider count that day | seed |
| `drivers` | number | count | `4` | Driver count | seed |
| `activeSubs` | number | count | `2` | Active subscriptions | seed |
| `quickRides` | number | count | `8` | Quick rides | seed |
| `cancelRatePct` | number | % | `7` | Cancellation rate | seed |
| `totalRevenue` | string | SAR | `'295.05'` | Total revenue — **string** | seed |
| `quickRideRevenue` | string | SAR | `'185.88'` | Quick-ride share — **string** | seed |
| `subRevenue` | string | SAR | `'109.17'` | Subscription share — **string** | seed |

Date range 26 Jun → 25 Jul (L13803–13832), stored newest-first after the `.reverse()`.
**Readers (5):** `captureDailySnapshot`, `exportSnapshots`, `renderSnapshotsTable`, `renderTrendChart`, `<top-level>`. **Writers (2):** `<top-level>`, `captureDailySnapshot`.

**Integrity note:** the snapshot series claims 6–10 riders and 4–7 drivers, whereas `DB.riders` seeds 10 and `DB.drivers` seeds 6 — and after `seedMoreRequests` the live rider count is ~55. The series is illustrative, not derived (§7).

---

### 3.16 `emailOutbox` — L13834 | array | 0 seed

Written by `sendSystemEmail` (entry L3580, `unshift` L3581) and `replyToInbound` (L7553).

| Field | Type | Unit | Example | Meaning |
|---|---|---|---|---|
| `id` | string | — | `'MAIL-0001'` | `'MAIL-'+length+1` zero-padded to 4 |
| `toId` | string \| null | FK | `'DRV-0138'` | → `riders`/`drivers`; `null` for inbound-lead replies (L7553) |
| `toName` | string | — | — | `nm2(toId)` |
| `toEmail` | string | email | — | `emailFor(toId)` or the lead's address |
| `subject` | string | — | — | Subject |
| `body` | string | — | — | Body |
| `category` | string | enum | `'transactional'` | Email class |
| `ts` | string | — | — | `toLocaleString` |

**Enumerations** — `category` from `EMAIL_CATEGORY_LABEL` (L7514): **`csat | promo | transactional | broadcast`**.
**Readers (7):** `exportEmailLog`, `previewEmail`, `renderEmailOutbox`, `renderExportCounts`, `replyToInbound`, `sendSystemEmail`, `<top-level>`. **Writers (3):** `<top-level>`, `replyToInbound`, `sendSystemEmail`.

---

### 3.17 `pushOutbox` — L13835 | array | 0 seed

Written only by `sendPushNotification` (L7742): `{id:'PUSH-####', title, body, audience, recipients, ts}`. `audience` resolves through `PUSH_AUDIENCE_LABEL` (L7710, 11 segment keys: `all_riders`, `gold`, `silver`, `nosub`, `high_risk_riders`, `all_drivers`, `gold_drivers`, `silver_drivers`, `economy_drivers`, `comfort_drivers`, `flagged_drivers`).
**Readers (4):** `exportPushLog`, `renderExportCounts`, `renderPushOutbox`, `sendPushNotification`. **Writers (2):** `<top-level>`, `sendPushNotification`.

---

### 3.18 `corporateAccounts` — L13846–13849 | map: corpId → record | 1 record (`CORP-001`)

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'CORP-001'` | Primary key | seed |
| `companyName` | string | — | `'Al-Dossari Logistics'` | Company | seed |
| `contactName` / `contactEmail` / `contactPhone` | string \| null | — | — | Billing contact | seed |
| `billingType` | string | enum | `'Monthly invoice'` | Billing mode | seed |
| `expectedEmployees` | number | count | `40` | Expected headcount | seed |
| `invoiceDayOfMonth` | number | 1–31 | `1` | Invoice day | seed |
| `lastInvoiceGeneratedAt` | string \| null | — | `null` | Last invoice run | seed |
| `riders[]` | string[] | FK | `[]` | → `DB.riders`; managed by `commitAddEmployee` / `removeEmployeeFromCorp` | seed |
| `status` | string | enum | `'Pending'` | Account state | seed |
| `createdAt` | string | `DD MMM` | `'14 Jul'` | Created | seed |
| `usagePolicy.monthlyCapSAR` | number | SAR | `200` | Per-employee monthly cap | seed |
| `usagePolicy.vehicleTier` | string | enum | `'Economy'` | Allowed class | seed |
| `usagePolicy.workHoursOnly` | boolean | — | `true` | Restrict to work hours | seed |
| `usagePolicy.workHoursStart` / `workHoursEnd` | string | `HH:mm` | `'07:00'` / `'19:00'` | Window | seed |
| `usagePolicy.officeDistrict` | string | — | `'Olaya / KAFD'` | Office location | seed |
| `usagePolicy.geoRestrictKm` | number | km | `12` | Radius limit | seed |
| `requireApprovalAboveSAR` | number | SAR | — | Manager-approval threshold, read at L5101 | runtime/UNVERIFIED (never seeded) |

**Enumerations** — `status`: `'Pending'` (seed); `setCorpStatus` is the writer. `UNVERIFIED` — the full set was not enumerable from a seed of one. `billingType`: `'Monthly invoice'` (seed only).

**Readers (13):** `buildSubProfile`, `commitAddEmployee`, `commitNewCorp`, `commitSendCorpInvoice`, `findCorpForRider`, `openAddEmployeeModal`, `openCorpInvoiceModal`, `removeEmployeeFromCorp`, `renderCorpDetail`, `renderCorporateList`, `saveCorpBillingContact`, `saveCorpUsagePolicy`, `setCorpStatus`. **Writers (2):** `<top-level>`, `commitNewCorp`.
**Foreign keys:** `riders[]`→`riders`. Referenced *by* `riders.corpAccountId`, `subscriptions.approvalCorp`, `corpApprovalLog.corpId`.

---

### 3.19 `referralConfig` / `surgeConfig` / `multiStopConfig` — L13855 / L13861 / L13862 | config-objects

| Key | Fields | Values | Readers | Writers |
|---|---|---|---|---|
| `referralConfig` | `enabled`, `referrerBonus`, `refereeBonus` | `true`, `20` SAR, `10` SAR | `openProcessReferralModal`, `processReferral`, `renderReferralProgram`, `saveReferralConfig` | `<top-level>`, `saveReferralConfig` |
| `surgeConfig` | `enabled`, `capMultiplier` | `true`, `2.5`× | `currentSurgeMultiplier`, `renderSurgeSchedule`, `saveSurgeConfig` | `<top-level>`, `saveSurgeConfig` |
| `multiStopConfig` | `extraStopFeeSAR` | `3` SAR | `commitAddStop`, `completeTrip`, `openAddStopModal` | `<top-level>` only |

**Note:** `surgeConfig.capMultiplier` (`2.5`) and `rateCard.surge.capByCity` (`{RUH:2.0,JED:2.0}`, L21460) are two different caps for the same thing (§7).

---

### 3.20 `legalDocuments` — L13867–13882 | map: docKey → record | 3 docs / 8 versions

Keys: `tos`, `privacy`, `driverAgreement`.

| Field | Type | Example | Meaning |
|---|---|---|---|
| `label` | string | `'Terms of Service'` | Display name |
| `currentVersion` | string | `'2.1'` | The version currently in force |
| `versions[]` | array | — | Every published version, newest first |
| `versions[].version` | string | `'2.1'` | Version number |
| `versions[].publishedDate` | string | `'01 Jul'` | Publication date |
| `versions[].summary` | string | — | What changed |

Version counts: `tos` 3 (2.1 / 2.0 / 1.0), `privacy` 2 (1.3 / 1.0), `driverAgreement` 3 (3.0 / 2.0 / 1.0).
**Readers (6):** `commitPublishVersion`, `getUserConsent`, `isConsentCurrent`, `openPublishVersionModal`, `renderLegalConsent`, `sendReconsentReminder`. **Writers (1):** `<top-level>` — `commitPublishVersion` mutates the held object.
**Related:** `DB.termsAcceptances` (§3.55) records the *driver* acceptance of `commitPolicy.termsVersion` (`'PLAN-TERMS-v1.0'`, L16559), which is a **separate versioning scheme** from `legalDocuments.driverAgreement.currentVersion` (`'3.0'`) — two independent consent trackers (§7).

---

### 3.21 `surgeSchedule` — L13883–13887 | array | 3 records

`{id, label, startHour, endHour, days[], multiplier, enabled}` — e.g. `{id:'surge_1',label:'Morning rush',startHour:7,endHour:9,days:['Sun','Mon','Tue','Wed','Thu'],multiplier:1.3,enabled:true}`.
`days[]` values come from `WEEKDAYS` (L4525). Seed rows: Morning rush (1.3×, enabled), Evening rush (1.5×, enabled), Weekend evening (1.2×, **disabled**).
**Readers (4):** `currentSurgeMultiplier`, `removeSurgeWindow`, `renderSurgeSchedule`, `saveSurgeSchedule`. **Writers (3):** `<top-level>`, `addSurgeWindow`, `removeSurgeWindow` (L12316 filter).

---

### 3.22 `referralLog` — L13888–13890 | array | 1 record

`{id:'REF-seed-1', referrerId:'RDR-1041', refereeId:'RDR-1075', referrerBonus:20, refereeBonus:10, date:'18 Jul 09:30'}`.
**Readers (5):** `contributionMargin`, `processReferral`, `renderFraudPage`, `renderReferralProgram`, `<top-level>`. **Writers (2):** `<top-level>`, `processReferral`.
**Foreign keys:** `referrerId`, `refereeId` → `riders`. Cross-check: `RDR-1041.wallet.transactions[0]` is the matching +20 SAR credit (L2594) — the two agree.

---

### 3.23 `driverBonusLog` — L13895–13898 | array | 2 records

`{id, driverId, incentiveId, amount, note, date}` — e.g. `{id:'BON-seed-1',driverId:'DRV-0101',incentiveId:'INV-1',amount:40,note:'Perfect package bonus',date:'10 Jul'}`.
**Readers (4):** `buildEntityProfile`, `contributionMargin`, `incentiveEarnedCount`, `incentiveTotalPaid`. **Writers (2):** `<top-level>`, `commitAwardIncentive`.
**Foreign keys:** `driverId`→`drivers`, `incentiveId`→`incentives`.

---

### 3.24 `inboundMessages` — L13899–13903 | array | 3 records

`{id, name, email, subject, message, receivedAt, status}`.
**Enumerations** — `status`: `'new'`, `'read'` (seed); `previewInboundMessage` promotes `'new'`→`'read'` (L7539), `replyToInbound` writes `'replied'` (L7552). Full set: **`new | read | replied`**.
**Readers (5):** `exportInbox`, `previewInboundMessage`, `renderExportCounts`, `renderLeadInbox`, `replyToInbound`. **Writers (1):** `<top-level>`.
**Cross-link:** `INB-001` (Fahad Al-Dossari, L13900) is the same person and email as `CORP-001.contactName`/`contactEmail` (L13847) — the lead-to-account path, though there is no id linking them.

---

### 3.25 `quickRideTypes` — L13908–13912 | array | 3 records

`{id, name, baseFare, perKm, perMin, active}`:

| id | name | baseFare (SAR) | perKm (SAR) | perMin (SAR) | active |
|---|---|---|---|---|---|
| `economy` | Economy | 2.50 | 1.10 | 0.35 | true |
| `comfort` | Comfort | 4.00 | 1.60 | 0.50 | true |
| `large` | Large | 6.00 | 2.10 | 0.65 | true |

**Readers (5):** `computeDynamicSubPrice`, `quickRideFare`, `removeRideType`, `renderRideTypesTable`, `saveRideTypes`. **Writers (3):** `<top-level>`, `addRideType`, `removeRideType` (L12370 filter).

**Conflict:** `DB.rateCard.classes` (L21438–21441) defines a *different* fare model for the same two classes (`economy` base 5.00 / perKm 1.20 / perMin 0.40; `comfort` base 8.00 / 1.75 / 0.55) and has **no `large` class at all**. Two live price books (§7).

---

### 3.26 `paymentGateways` — L13913–13920 | array | 6 records

`{id, name, type, matchPrefix, enabled, isDefault, custom}`.

| id | name | type | matchPrefix | enabled | isDefault |
|---|---|---|---|---|---|
| `mada` | Mada | Card | `Mada` | true | **true** |
| `visa` | Visa / Mastercard | Card | `Visa` | true | false |
| `apple_pay` | Apple Pay | Wallet | `Apple Pay` | true | false |
| `bank_transfer` | Bank transfer | Bank | `Bank transfer` | true | false |
| `stc_pay` | STC Pay | Wallet | `STC Pay` | false | false |
| `tabby` | Tabby (Buy now, pay later) | BNPL | `Tabby` | false | false |

**Enumerations** — `type`: **`Card | Wallet | Bank | BNPL`**.
`matchPrefix` is matched against `payments.method` by `gatewayStats`. `PAY_METHODS` (L18653) can emit `'Mastercard ···9034'`, which matches **no** `matchPrefix` (the Visa gateway matches only the literal `'Visa'`) — see §7.
**Readers (4):** `removeGateway`, `renderPaymentGateways`, `setDefaultGateway`, `toggleGatewayEnabled`. **Writers (3):** `<top-level>`, `addCustomGateway`, `removeGateway` (L7509 filter).

---

### 3.27 `searchPhases` — L13925–13929 | array | 3 records

`{id, afterSec, multiplier}`: `phase_1` (0 s, 1×), `phase_2` (8 s, 1.5×), `phase_3` (18 s, 3×). Applied by `currentRadiusMultiplier` → `nearestAvailableDrivers` (comment L13921–13924).
**Readers (4):** `currentRadiusMultiplier`, `removeSearchPhase`, `renderSearchPhasesTable`, `saveSearchPhases`. **Writers (3):** `<top-level>`, `addSearchPhase`, `removeSearchPhase` (L8110 filter).

---

### 3.28 `cancellationPolicy` — L13936–13945 | array | 8 records

| id | appliesTo | fee | flags |
|---|---|---|---|
| `qr_before_assigned` | quick_ride | `feeAmount:0` | `enabled:false`, `locked:true` |
| `qr_grace_period` | quick_ride | `feeAmount:0`, `graceMin:2` | `enabled:true` |
| `qr_after_grace` | quick_ride | `feeAmount:5` | `enabled:true` |
| `qr_after_arrival` | quick_ride | `feeAmount:10` | `enabled:true` |
| `qr_driver_fault` | quick_ride | `feeAmount:0` | `enabled:false`, `locked:true` |
| `qr_rider_noshow` | quick_ride | `feeAmount:10` | `enabled:true` |
| `sub_before_first_trip` | subscription | `feePct:0` | `enabled:false`, `locked:true` |
| `sub_mid_cycle` | subscription | `feePct:10` | `enabled:true` |

**Enumerations** — `appliesTo`: **`quick_ride | subscription`**. Quick-ride rows carry `feeAmount` (SAR); subscription rows carry `feePct` (% of the refund otherwise owed) — the two are mutually exclusive (comment L13930–13935). `enabled:false` is enforced as "no fee" regardless of the amount.
**Readers (3):** `getCancellationRule`, `renderCancellationPolicy`, `saveCancellationPolicy`. **Writers (1):** `<top-level>`.

---

### 3.29 `cities` — L13946–13951 | array | 4 records

`{name, active, launched, seed}`: Riyadh (`active:true`, `launched:'2025'`), Jeddah / Dammam / Makkah (all `active:false`, `launched:null`). `seed:true` on all four marks them as non-deletable defaults.
**Readers (7):** `addCity`, `applyCityToggle`, `handleCityAutocomplete`, `isCityActive`, `removeCity`, `renderCitiesTable`, `renderExecOverview`. **Writers (3):** `<top-level>`, `addCity`, `removeCity` (L7892 filter by `name`).
**Foreign keys:** `name` referenced by `riders.city`, `drivers.city`, `pendingDrivers.city`, `newRiders.city`.
**Note:** the separate `KNOWN_CITIES` global (L7819, 24 entries with lat/lng) is the autocomplete source and is never updated when `DB.cities` changes.

---

### 3.30 `zones` — L13952–13958 | array | 6 records

`{name, demand, supply, failures30d}`: Al Narjis (14/2/11), Al Sahafa (9/3/6), KAFD / Olaya (22/12/4), Al Malaz (8/6/2), Qurtubah (6/5/1), Al Yasmin (11/4/7). `zoneFailRate(z)` = `failures30d/demand` as a percentage (L13974).
**Readers (9):** `cityStats`, `openSuspendSurge`, `renderExecOverview`, `renderPredZones`, `renderZoneMomentum`, `renderZonesPage`, `showZoneHourly`, `zoneCongestionMultiplier`, `zoneOfPickup`. **Writers (1):** `<top-level>` — zone stats are never updated from live data (§7).
**Foreign keys:** `name` referenced by `steerOffers.zone`, `recruitmentQueue.zone`, `surgeSuspensions.zoneId`.

---

### 3.31 `steerOffers` — L13960 | array | 0 seed

Pushed by `commitSteerOffer` (L14029): `{zone, amount, cap, spent, accepted, sentTo, minutesLeft, status}`. `tickSteerOffers` (L14182) writes `status='closed'` when the timer expires. **Enumerations** — `status`: **`active | closed`**.
**Readers (4):** `openSteerOffer`, `renderZoneMomentum`, `renderZonesPage`, `tickSteerOffers`. **Writers (2):** `<top-level>`, `commitSteerOffer`.
**Foreign keys:** `zone`→`zones.name`.

---

### 3.32 `recruitmentQueue` — L13961 | array | 0 seed

Pushed by `queueRecruitment` (L13997): `{zone, queuedAt, status:'Queued'}`. Only value observed for `status` is `'Queued'`.
**Readers (2):** `queueRecruitment`, `renderZonesPage`. **Writers (2):** `<top-level>`, `queueRecruitment`.

---

### 3.33 `corpApprovalLog` — L13962 | array | 0 seed

Unshifted at four sites: `approveCorpSubscription` (L4888), `rejectCorpSubscription` (L4903), `approveSubReqCorp` (L9982), `rejectSubReqCorp` (L9994).
`{corpId, subId, riderId, amount, decision, context, decidedAt}`.
**Enumerations** — `decision`: **`Approved | Declined`**. `context`: **`New subscription | Subscription request`**.
**Readers (1):** `renderCorpDetail`. **Writers (5):** `<top-level>` + the four decision functions.
**Foreign keys:** `corpId`→`corporateAccounts`, `subId`→`subscriptions` (or a `SREQ-*` id from L9982 — polymorphic), `riderId`→`riders`.

---

### 3.34 `vatConfig` / `invoiceSequence` / `invoices` — L13971 / L13972 / L13973

* `vatConfig` = `{registrationNumber:'310123456700003', companyLegalName:'Eyvar Technologies LLC', companyAddress:'Riyadh, Saudi Arabia', ratePct:15}`. Readers (9): `getOrCreateInvoice`, `invoiceQRData`, `issueCreditNote`, `openCorpInvoiceModal`, `openCreditNoteModal`, `openInvoiceModal`, `postFareCapture`, `renderPricing`, `<top-level>`. Writer: `<top-level>` only.
* `invoiceSequence` = `0`, incremented at L4404 (`getOrCreateInvoice`) and by `openCorpInvoiceModal`. Feeds `'EYV-'+year+'-'+padStart(6)`.
* `invoices` — map keyed by **payment id**, one stable invoice per payment (L4411). Record shape (L4409–4410): `{invoiceNumber, paymentId, issuedAt, buyerName, buyerId, description, subtotal, vatAmount, total, method}`. VAT is back-computed from a VAT-**inclusive** total (L4401–4403). Readers (1): `getOrCreateInvoice`. Writers (2): `<top-level>`, `getOrCreateInvoice`.
**Foreign keys:** `invoices` key + `paymentId`→`payments`; `buyerId`→`riders`|`drivers`.

---

### 3.35 `paymentRisk` — L14199 | map: riderId → string | 1 record

`{'RDR-1041':'Prior renewal attempt declined once (card ···4821) before succeeding on retry'}` — a free-text risk note.
**Readers (3):** `renderPredPayment`, `renderPredictivePage`, `subHealthScore`. **Writers (1):** `<top-level>` — never updated at runtime (§6).

---

### 3.36 `disputes` — L14391–14396 | array | 2 records

| Field | Type | Example | Meaning |
|---|---|---|---|
| `id` | string | `'DSP-07'` | Dispute id |
| `sub` | string FK | `'SUB-1075'` | → `DB.subscriptions` |
| `claim` | string | `'"Driver never arrived on Tuesday" — …'` | The claim |
| `claimant` | string FK | `'RDR-1075'` | → `riders` |
| `against` | string FK | `'DRV-0101'` | → `drivers` |
| `status` | string enum | `'open'` | State |
| `evidence[]` | array of `[label, detail]` pairs | `[['GPS trail','Driver device at pickup point 06:54–07:12…'],…]` | Evidence bundle |
| `outcome` | string | — | Set by `resolveDispute` (L14441) |

**Enumerations** — `status`: `'open'` (seed); `resolveDispute` writes `'resolved'` (L14441). Full set: **`open | resolved`**.
**Readers (8):** `driverRiskScore`, `inboxItems`, `installActionGates`, `renderDisputes`, `renderPredIncidents`, `renderPredictivePage`, `resolveDispute`, `subHealthScore`. **Writers (1):** `<top-level>` — disputes are never created at runtime.

---

### 3.37 `lostFound` — L14448–14452 | array | 3 records

`{id, item, trip, rider, driver, reported, status}`.
**Enumerations** — `status`: **`searching | with_driver | returned`**, and the legal transitions are declared in the `LF_FLOW` global (L14453): `searching → with_driver → returned`, one-way only.
**Readers (4):** `advanceLF`, `inboxItems`, `installActionGates`, `renderLostFound`. **Writers (1):** `<top-level>`.
**Foreign keys:** `trip`→`trips` (`LF-08.trip='TRP-8977'` and `LF-07.trip='TRP-8720'` are **dangling**, §7), `rider`→`riders`, `driver`→`drivers`.

---

### 3.38 `slaPolicy` — L14650–14660 | config-object

| Field | Type | Value | Meaning |
|---|---|---|---|
| `tiers.T1` | object | `{label:'Critical', firstResponseMin:0, resolveMin:240, hours:'24/7', pauseOnCustomer:false}` | Critical tier |
| `tiers.T2` | object | `{label:'High', firstResponseMin:15, resolveMin:1440, hours:'24/7', pauseOnCustomer:true}` | High |
| `tiers.T3` | object | `{label:'Medium', firstResponseMin:60, resolveMin:2880, hours:'24/7', pauseOnCustomer:true}` | Medium |
| `tiers.T4` | object | `{label:'Low', firstResponseMin:240, resolveMin:4320, hours:'business', pauseOnCustomer:true}` | Low |
| `atRiskPct` | number | `75` | % of the clock at which a ticket is "at risk" |
| `breachEscalateTo` | string | `'ops_supervisor'` | Escalation target |
| `uncodedCeilingPct` | number | `3` | Max acceptable share of uncoded contacts |

**Enumerations** — tier keys **`T1 | T2 | T3 | T4`**; `hours` ∈ **`24/7 | business`**.
**Readers (9):** `buildInterventionItems`, `rcTierObj`, `renderContactsPage`, `renderSlaPolicyForm`, `renderTickets`, `saveSlaPolicy`, `slaBadge`, `slaDetailStrip`, `updateContactsBadge`. **Writers (1):** `<top-level>`.

---

### 3.39 `reasonCodes` — L14667–14716 | array | 40 records

The contact-reason taxonomy. Each row:

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `code` | string | — | `'CAP_LATE'` | Primary key | seed |
| `ref` | string \| null | — | `'1.2'` | Section reference in the source guide; `null` for panel-invented codes | seed |
| `cat` | string | enum | `'Captain'` | Category | seed |
| `target` | string | enum | `'rider'` | Who raises it | seed |
| `tier` | string | enum | `'T3'` | → `slaPolicy.tiers` | seed |
| `fr` | number \| null | minutes | `15` | First-response target; `null` inherits the tier default | seed |
| `res` | number \| null | minutes | `240` | Resolution target | seed |
| `upd` | number \| null | minutes | `15` | Recurring-update promise | seed |
| `comp` | number | SAR | `15` | Standard goodwill compensation | seed |
| `owner` | string \| null | enum | `'Ops'` | Team that can make the contact stop existing | seed |
| `labelEn` | string | — | `'Captain late for pickup'` | English label | seed |
| `labelAr` | string | — | `'تأخر الكابتن عن الالتقاط'` | Arabic label | seed |
| `active` | boolean | — | `true` | Selectable | seed |

**Full enumerations**
* `cat` (11): `Captain` (5), `Booking` (4), `Payment` (3), `Trip` (3), `Technical` (4), `Safety` (3), `Feedback` (3), `Subscription` (4), `Driver` (8), `Corporate` (2), `Other` (1).
* `target` (3): **`rider | driver | corp`**.
* `tier` (4): **`T1 | T2 | T3 | T4`**.
* `owner` (9 + null): `Supply`, `Ops`, `Compliance`, `Product`, `Payments`, `Engineering`, `Marketing`, `Safety`, `Finance`, and `null` (4 rows: `BKG_CANCEL_REQ`, `SUB_POSTPONE`, `SUB_RENEWAL`, `CORP_EMPLOYEE_MGMT`).
* `comp` distinct values: `0`, `15`, `20`, `25`, `50`, `100`.
* All 40 codes, in file order: `CAP_CANCEL_ADV`, `CAP_LATE`, `CAP_NOSHOW`, `CAP_OFFPLATFORM_PAY`, `CAP_CONDUCT`, `BKG_CANCEL_REQ`, `BKG_WRONG_SLOT`, `BKG_NO_SUPPLY`, `BKG_CAPTAIN_PREF`, `PAY_INCORRECT_CHARGE`, `PAY_DECLINED`, `PAY_REFUND_REQ`, `TRP_ROUTE_DEVIATION`, `TRP_LOST_ITEM`, `TRP_GHOST_COMPLETE`, `APP_LOGIN`, `APP_CRASH`, `TECH_STATE_DESYNC`, `APP_PROMO`, `SAF_RIDER_UNSAFE`, `SAF_ACCIDENT`, `SAF_THEFT`, `FBK_COMPLAINT`, `FBK_ACCOUNT_DELETE`, `FBK_INVOICE`, `SUB_SAME_CAPTAIN_BROKEN`, `SUB_POSTPONE`, `SUB_FREEZE`, `SUB_RENEWAL`, `DRV_RIDER_NOSHOW`, `DRV_RIDER_CONDUCT`, `DRV_VEHICLE_DAMAGE`, `DRV_PAYOUT_ISSUE`, `DRV_RATING_DISPUTE`, `DRV_DEDUCTION_DISPUTE`, `DRV_SUSPENSION_APPEAL`, `DRV_DOC_HELP`, `CORP_BILLING`, `CORP_EMPLOYEE_MGMT`, `OTHER_UNCODED`.

**Readers (6):** `openMassEvent`, `openWalletAdjustModal`, `rcById`, `reasonSelectHTML`, `renderReasonCodesTable`, `saveReasonCodes`. **Writers (2):** `<top-level>`, `addReasonCode`.
**Referenced by:** `tickets.reasonCode`, `contacts.reasonCode`, `complaints.reasonCode`, `goodwillLedger.reasonCode`, `fairnessCases.reasonCode`, `massEvents.reasonCode`, `callSessions.reasonCode`, and the `RC_KEYWORD_MAP` global (L15160, 20 regex→code pairs).

---

### 3.40 `contacts` — L14718 | array | 0 seed (populated by `slaBoot` at boot, L21812)

One row per customer contact. Built in `logContact(o)` at L14920–14932.

| Field | Type | Unit | Example | Meaning | Required? |
|---|---|---|---|---|---|
| `id` | string | — | `'CT-00001'` | `'CT-'+length+1` padded to 5 (L14921) | runtime |
| `tsMs` | number | epoch ms | — | Contact time (L14922) | runtime |
| `channel` | string | enum | `'in_app'` | Contact channel (L14923) | runtime |
| `direction` | string | enum | `'inbound'` | Direction (L14924) | runtime |
| `agentId` | string | FK | `'USR-1'` | → `DB.teamUsers` (L14925) | runtime |
| `agentName` | string | — | `'Sarah Al-Rashid'` | Denormalised (L14926) | runtime |
| `reasonCode` | string | FK | `'CAP_LATE'` | → `DB.reasonCodes`; defaults to `'OTHER_UNCODED'` (L14927) | runtime |
| `entityId` | string | FK | `'RDR-1041'` | → `riders`/`drivers`; `'—'` when unknown (L14928) | runtime |
| `entityName` | string | — | — | Denormalised name (L14929) | runtime |
| `linked` | object \| null | — | `null` | Related record pointer (L14930) | runtime |
| `outcome` | string | enum | `'pending'` | Handling outcome (L14931) | runtime |

**Enumerations**
* `channel`: default `'in_app'`; observed call sites pass `'phone_out'` and `sess.channel` from `callSessions` (L20310). Observed set: **`in_app | phone | phone_out | whatsapp`** — `UNVERIFIED` as exhaustive (channel is a free parameter).
* `direction`: **`inbound | outbound`** (L20311 chooses between them).
* `outcome`: default `'pending'`; `commitWrapUp` passes `'resolved'` and the wrap-up dropdown default is `'resolved'` (L20300). `UNVERIFIED` as exhaustive.

**Bounded growth:** `DB.contacts.length=2000` truncation at L14933 — the only collection in the file with a size cap.
**Readers (7):** `commitLogContact`, `commitWrapUp`, `cptStats`, `exportContacts`, `logContact`, `renderContactsExtra`, `screenPop`. **Writers (4):** `<top-level>`, `commitLogContact`, `commitWrapUp`, `logContact`.

---

### 3.41 `compPolicy` — L15379–15390 | config-object

| Field | Type | Value | Meaning |
|---|---|---|---|
| `roles.Owner` | object | `{perCaseSAR:1000, dailySAR:10000}` | Goodwill authority |
| `roles.Operations` | object | `{perCaseSAR:200, dailySAR:2000}` | — |
| `roles.Support` | object | `{perCaseSAR:75, dailySAR:600}` | — |
| `roles.Finance` | object | `{perCaseSAR:500, dailySAR:5000}` | — |
| `roles.default` | object | `{perCaseSAR:50, dailySAR:300}` | Fallback |
| `secondApprovalAboveSAR` | number | `200` | Threshold for a second approver (L15430) |
| `perRiderPer30dSAR` | number | `150` | Rolling per-rider cash cap |
| `perRiderPer30dCount` | number | `3` | Rolling per-rider case cap |

**Readers (4):** `compCheck`, `compLimitsFor`, `renderCompPolicyTable`, `saveCompPolicy`. **Writers (1):** `<top-level>`.
**Defect:** `roles` keys on `'Operations'`, but `DB.teamUsers[].role` uses `'Ops Manager'` (L2839) and `TEAM_ROLES` (L10501) lists `'Ops Manager'`. `currentRole()` (L15393) returns the raw `u.role`, so an Ops Manager gets `roles.default` — **50 SAR per case instead of 200** (§7).

---

### 3.42 `goodwillLedger` — L15391 | array | 0 seed

Built in `logGoodwill` (L15438–15442): `{id:'GW-####', tsMs, date, riderId, riderName, amount, reasonCode, agentId, agentName, note}`.
**Readers (6):** `contributionMargin`, `goodwillForRider`, `goodwillToday`, `ledgerReconcile`, `logGoodwill`, `renderCompPolicyTable`. **Writers (2):** `<top-level>`, `logGoodwill`.
**Foreign keys:** `riderId`→`riders`, `agentId`→`teamUsers`, `reasonCode`→`reasonCodes`.

---

### 3.43 `fairnessCases` — L15505 | array | 0 seed (populated by `seedFairness` at boot, L21814)

Built in `fcNew` (L15508–15514): `{id:'FC-####', kind, driverId, subjectId, detail, reasonCode, status:'Open', openedAtMs, date, decision:null, decidedBy:null, decidedAtMs:null, rationale:null}`.
**Enumerations** — `kind`: **`Rating dispute | Suspension appeal`** (the two values compared against `.kind===` in the file). `status`: `'Open'` at creation; `decideFairness` writes the decision. Observed decision values: `'Upheld'`, `'Overturned'` (from the `status===` grep).
**Readers (9):** `decideFairness`, `erasureBlockers`, `fcNew`, `inboxItems`, `installActionGates`, `renderFairnessPage`, `riderNoShowCount`, `seedFairness`, `updateContactsBadge`. **Writers (2):** `<top-level>`, `fcNew`.
**Foreign keys:** `driverId`→`drivers`, `subjectId`→`riders`/`trips` (polymorphic), `reasonCode`→`reasonCodes`.

---

### 3.44 `onCall` — L15776 | config-object

`{primary:'USR-1', secondary:'USR-3', window:'24/7 — set per shift', updatedBy:null}`.
**Readers (3):** `onCallNameSimple`, `renderOnCall`, `saveOnCall`. **Writers (2):** `<top-level>`, `saveOnCall`.
**Foreign keys:** `primary`, `secondary`, `updatedBy` → `teamUsers`.
**Overlap:** `DB.onCallSchedule` (§3.53) is a full rota covering the same concept. Both exist; `onCallName()` prefers the rota and `onCallNameSimple()` reads this one (comment L15777) — two on-call sources of truth (§7).

---

### 3.45 `creditNotes` / `creditNoteSequence` — L15847 / L15848

`creditNotes` is a map keyed by credit-note id. Built in `issueCreditNote` (L15869–15882):

| Field | Type | Example | Meaning |
|---|---|---|---|
| `id` | string | `'CN-0001'` | `'CN-'+seq` padded to 4 |
| `noteNumber` | string | `'EYV-CN-2026-000001'` | ZATCA-style number |
| `refundId` | string FK | `'REF-0002'` | → `DB.refunds` |
| `againstInvoice` | string \| null | — | → `invoices[].invoiceNumber` |
| `againstPayment` | string \| null FK | — | → `DB.payments` |
| `buyerId` / `buyerName` | string | — | → `DB.riders` |
| `reason` / `source` | string | — | Copied from the refund |
| `subtotal` / `vatAmount` / `total` | number (SAR) | — | VAT back-computed at 15 % from a VAT-inclusive total (L15865–15867) |
| `issuedAt` / `issuedBy` | string | — | Date / operator |
| `unlinked` | boolean | `true` | **`true` when no invoice could be matched** — the integrity flag `renderCreditNotes` counts (L15927) |

**Readers (2):** `openCreditNoteModal`, `renderCreditNotes`. **Writers (2):** `<top-level>`, `issueCreditNote`.

---

### 3.46 `erasureRequests` — L15961 | array | 0 seed (populated by `gapsBoot2` at boot, L21815)

Built in `commitErasureRequest` (L16003–16006): `{id:'ERA-####', riderId, riderName, status:'Pending', openedAtMs, dueAtMs (= now + `ERASURE_SLA_DAYS`×86 400 000, L15962 = 30 days), note, requestedBy, executedAtMs:null}`.
**Enumerations** — `status`: `'Pending'` at creation; `executeErasure` writes `'Executed'` + `executedAtMs` (L16029), `rejectErasure` writes `'Rejected'` (L16040). Full set: **`Pending | Executed | Rejected`**. A duplicate-guard blocks a second `'Pending'` request per rider (L15999).
**Readers (6):** `commitErasureRequest`, `executeErasure`, `inboxItems`, `installActionGates`, `rejectErasure`, `renderErasureQueue`. **Writers (2):** `<top-level>`, `commitErasureRequest`.
**Foreign keys:** `riderId`→`riders`.

---

### 3.47 `massEvents` — L16082 | array | 0 seed (populated by `gapsBoot2`)

Built in `commitMassEvent` (L16114–16119): `{id:'EVT-###', title, reasonCode, windowMin, openedAtMs, ticketIds[], riderIds[], message, status:'Open'}`.
**Enumerations** — `status`: `'Open'` at creation. No other value is written; `UNVERIFIED` whether a close path exists.
**Readers (2):** `commitMassEvent`, `renderContactsExtra`. **Writers (2):** `<top-level>`, `commitMassEvent`.
**Foreign keys:** `reasonCode`→`reasonCodes`, `ticketIds[]`→`tickets`, `riderIds[]`→`riders`.

---

### 3.48 `rideStateLogs` — L16337 | map: tripId → array | 0 seed (populated by `seedRideStates` at boot, L21816)

Each array element (L16354–16357): `{v, from, to, tsMs, actor, transport, driverAcked, riderAcked, latencyMs}`.

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `v` | number | version | Monotonic transition number (1-based) |
| `from` / `to` | string | enum | Previous / new ride state |
| `tsMs` | number | epoch ms | Transition time |
| `actor` | string | enum | Who caused it |
| `transport` | string | enum | Delivery channel |
| `driverAcked` / `riderAcked` | boolean | — | Per-app acknowledgement — a `false` `riderAcked` is the desync signal |
| `latencyMs` | number | ms | Propagation latency (380–1280, L16349) |

**Enumerations**
* `from`/`to` ∈ `RIDE_STATE_FLOW` (L16335): **`REQUESTED | MATCHING | ACCEPTED | ARRIVING | ARRIVED | IN_PROGRESS | COMPLETED`**.
* `actor`: **`rider`** (on `REQUESTED`), **`driver`** (on `ACCEPTED`), **`system`** (all others) — L16355.
* `transport`: **`socket | push | poll`**, assigned round-robin by index (L16356).

**Readers (5):** `desyncedTripIds`, `detectDesync`, `forceResync`, `rideStateTimelineHTML`, `seedRideStates`. **Writers (2):** `<top-level>`, `rideStateSeed`.
**Foreign keys:** key→`trips`.

---

### 3.49 `commitPolicy` — L16541–16560 | config-object (the most-read config in the file: 32 reader functions)

| Field | Type | Unit | Value | Meaning |
|---|---|---|---|---|
| `lateGraceMin` | number | min | `10` | Logged, affects reliability, never a penalty |
| `lateAsAbsenceMin` | number | min | `25` | Beyond this, lateness is an absence |
| `confirmDeadline` | string | `HH:mm` | `'21:00'` | Fixed evening confirmation cut-off |
| `riderWaitMin` | number | min | `10` | Rider-side grace, symmetric with the captain's |
| `riderNoShowPayPct` | number | % | `50` | Captain paid for held capacity on a rider no-show |
| `payoutDays` | number | days | `3` | Payout lag |
| `backupMultiplierPct` | number | % | `125` | Backup captain premium, funded from commission |
| `counterWindowDays` | number | days | `30` | Rolling absence-counter window |
| `decayDays` | number | days | `30` | Clean days that erase one strike |
| `rehabDays` | number | days | `90` | Rehabilitation period |
| `appealWindowDays` | number | days | `7` | Appeal filing window |
| `appealResponseHours` | number | hours | `24` | Ops response SLA on an appeal |
| `regulatorCancelLimit` | number | count | `5` | GAT limit: 30-day suspension past 5 post-acceptance cancels |
| `tiers[]` | array | — | 3 rows | Absence escalation ladder |
| `termsVersion` | string | — | `'PLAN-TERMS-v1.0'` | Plan-terms version drivers accept |
| `emergencyMultiplierPct` | number | % | `150` | **Added at L17182.** Short-notice premium, above the 125 % standing-backup rate |
| `dispatchWindowSec` | number | s | `45` | **Added at L17183.** Per-captain acceptance window before escalating |
| `dispatchMaxCandidates` | number | count | `5` | **Added at L17184.** Captains to try before manual sourcing |
| `riderCompPctPer10Min` | number | % | `20` | **Added at L17185.** Delay compensation, scaled per 10 min |
| `riderCompCapPct` | number | % | `100` | **Added at L17186.** Compensation ceiling |
| `riderCompMinSAR` | number | SAR | `10` | **Added at L17187.** Compensation floor |
| `commitmentReservePct` | number | % | `0` | **Added at L17465.** `0` = feature off (the comment suggests 15 to activate) |
| `offerWindowMin` | number | min | `20` | **Added at L18125.** How long a backup has to answer |

The eight fields above are attached to `DB.commitPolicy` by later top-level statements (L17182–L17187, L17465, L18125), not by the L16541 literal — so the object's real shape is 23 fields, not the 15 the literal shows. `renderDispatchSettings` (L17412–L17414) exposes `emergencyMultiplierPct`, `dispatchWindowSec` and `dispatchMaxCandidates` as editable settings.

`tiers[]` rows (L16556–16558):

| n | label | freezeDays | forfeitRemaining | pullPlan | terminate | demoteTier |
|---|---|---|---|---|---|---|
| 1 | First absence | 7 | true | true | false | — |
| 2 | Second absence | 30 | true | true | false | true |
| 3 | Third absence | 0 | true | true | **true** | — |

**Readers (32):** `absenceCount`, `acceptPlanTerms`, `applyDecay`, `autoHandoff`, `classifyDelay`, `commitEmergencyClaim`, `commitmentReserve`, `confirmPlanLeg`, `emergencyDispatch`, `exposureLineHTML`, `inboxItems`, `installActionGates`, `nearestEligibleDrivers`, `nextTier`, `offerChip`, `offerEmergency`, `offerState`, `openEmergencyClaim`, `recordAbsence`, `rehabCandidates`, `rehabCardHTML`, `reinstateProbationary`, `renderCommitSettings`, `renderCommitmentPage`, `renderDispatchSettings`, `renderEmergencyDispatch`, `riderDelayCompensation`, `riderNoShowCardHTML`, `riderNoShowCount`, `saveCommitPolicy`, `updateContactsBadge`, `<top-level>`.
**Writers (2):** `<top-level>` (L16541 + L18125), `saveCommitPolicy`.

---

### 3.50 `planConfirmations` — L16563 | map: subId → record | 0 seed (populated by `commitBoot`, L21817)

The declaring comment says `tripId -> {…}` (L16563), but **every write keys it by `subId`** (L16589, L16596, L17145, L18209, L18221) — the comment is wrong (§7).
Record: `{confirmedAtMs, autoHandedOff}` plus `ackSource` when set via `setLegAck` (L18209).
* `confirmPlanLeg` → `{confirmedAtMs:nowMs(), autoHandedOff:false}` (L16589).
* `autoHandoff` → `{confirmedAtMs:null, autoHandedOff:true}` (L16596, L18221).
**Readers (2):** `dispatchEligibility`, `pendingConfirmations`. **Writers (4):** `<top-level>`, `autoHandoff`, `commitBoot`, `confirmPlanLeg`.

---

### 3.51 `absenceEvents` — L16564 | array | 0 seed

Built in `recordAbsence` (L16687–16693):

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | — | `'ABS-####'` |
| `driverId` / `driverName` | string / string | FK | → `drivers` |
| `subId` | string | FK | → `subscriptions` |
| `tsMs` / `date` | number / string | — | When |
| `tier` | number | 1–3 | `commitPolicy.tiers[].n` reached |
| `forfeited` | number | SAR | Undelivered remainder forfeited |
| `reserveForfeited` | number | SAR | Commitment reserve forfeited |
| `freezeDays` | number | days | From the tier |
| `terminated` | boolean | — | Tier-3 outcome |
| `waived` | boolean | — | Flipped to `true` at L8989-equivalent waive path |
| `decayed` | boolean | — | Set by `applyDecay` |
| `appealId` | string \| null | FK | → an appeal record |
| `emergencyId` | string \| null | FK | → `DB.emergencyClaims` (set at L16801) |

`classifyDelay` gates this: lateness under `lateAsAbsenceMin` logs `late_pickup_logged` and returns `null` **without** creating an absence (L16679–16684).
**Readers (15):** `absenceCount`, `acceptEmergency`, `applyDecay`, `commitBoot`, `commitEmergencyClaim`, `commitMenu`, `decideEmergency`, `dispatchBoot`, `inboxItems`, `installActionGates`, `openEmergencyClaim`, `recordAbsence`, `regulatorCount`, `rehabCandidates`, `renderCommitmentPage`. **Writers (2):** `<top-level>`, `recordAbsence`.

---

### 3.52 `emergencyClaims` — L16565 | array | 0 seed

Built in `commitEmergencyClaim` (L16793–16799): `{id:'EMG-####', absenceId, driverId, kind, doc, detail, status:'Open', openedAtMs, dueAtMs (= now + `commitPolicy.appealResponseHours`×3 600 000)}`.
**Enumerations** — `kind` defaults to `'accident'` from the `em-kind` select (L16795); the full option list lives in the modal HTML, **UNVERIFIED** beyond the `'accident'` default. `status`: `'Open'` at creation; `decideEmergency` resolves it.
**Readers (5):** `commitEmergencyClaim`, `decideEmergency`, `inboxItems`, `installActionGates`, `renderCommitmentPage`. **Writers (2):** `<top-level>`, `commitEmergencyClaim`.
**Foreign keys:** `absenceId`→`absenceEvents`, `driverId`→`drivers`. Back-reference: `absenceEvents.emergencyId` (L16801).

---

### 3.53 `termsAcceptances` — L16566 | array | 0 seed

Built in `acceptPlanTerms` (L17134–17135): `{driverId, version, tsMs, date}` where `version` is `DB.commitPolicy.termsVersion`.
**Readers: ZERO.** This collection is written and never read anywhere in the file — the only such collection (§6).
**Writers (2):** `<top-level>`, `acceptPlanTerms`.
**Foreign keys:** `driverId`→`drivers`.

---

### 3.54 `emergencyDispatches` — L17199 | array | 0 seed (populated by `dispatchBoot`, L21818)

Built in `emergencyDispatch` (L17265–17276):

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `id` | string | — | `'DSP-####'` — **collides with the `DSP-` prefix used by `DB.disputes`** (`DSP-07`, L14392); see §7 |
| `subId` | string | FK | → `subscriptions` |
| `absenceId` | string \| null | FK | → `absenceEvents` |
| `riderId` | string | FK | → `riders` |
| `absentDriver` | string | FK | → `drivers` |
| `openedAtMs` / `delayMin` | number | ms / min | Timing |
| `usedBackup` | boolean | — | Whether a standing backup existed |
| `queue[]` | array | — | Candidate captains, backup first: `{id,name,km,etaMin,eligible,standing}` |
| `offerIndex` | number | — | Position in `queue` currently being offered |
| `status` | string | enum | Dispatch state |
| `acceptedBy` / `acceptedAtMs` | string \| null / number | FK | → `drivers` (L17320) |
| `baseFare` | number | SAR | Per-leg fare derived from `sub.paid / totalTrips` (L17263) |
| `multiplierPct` | number | % | `commitPolicy.backupMultiplierPct` (125) when a standing backup exists, else `emergencyMultiplierPct` (150) — L17274 |
| `replacementPay` | number | SAR | `baseFare × multiplierPct/100` (L17265) |
| `recovered` / `eyvarNet` | number | SAR | Financial reconciliation |
| `riderCompensation` | number | SAR | From `riderDelayCompensation()` |
| `log[]` | array | — | `{tsMs,msg}` narrative |

**Enumerations** — `status`: `'Searching'` at creation (L17272); code writes `'No captain available'` (L17292), `'Exhausted'` (L17304), `'Offered'` (L17310), `'Accepted'` (L17320). Full set: **`Searching | Offered | Accepted | Exhausted | No captain available`**.
**Readers (12):** `acceptEmergency`, `commitMenu`, `contributionMargin`, `declineEmergency`, `dispatchBoot`, `emergencyDispatch`, `inboxItems`, `offerEmergency`, `recordAbsence`, `renderCommitmentPage`, `renderEmergencyDispatch`, `<top-level>`. **Writers (2):** `<top-level>`, `emergencyDispatch`.

---

### 3.55 `arrivalConfig` / `arrivalTraces` — L17605 / L17611

`arrivalConfig` = `{arrivalRadiusM:120, meetRadiusM:40, minDwellMin:5, riderGraceMin:10}` (L17606–17609).
`arrivalTraces` is keyed by trip id; each value (L17617): `{pings:[], riderPings:[], events:[], shape}`.
* `pings[]` / `riderPings[]` elements: `{tsMs, distanceM}` (L17618).
* `events[]` elements: `[minuteOffset, actor, text]` triples — actor ∈ **`driver | rider | system`** (L17621–17637).
* `shape` ∈ **`arrived_rider_absent | never_arrived | ambiguous | (else → clean meeting)`** (L17619, 17624, 17629, 17634).
Verdicts derived by `arrivalEvidence()` map onto the `VERDICT_LABEL` global (L17700): **`captain_performed | captain_absent | both_present_no_contact | inconclusive`**.
**Readers:** `arrivalEvidence`, `arrivalEvidenceHTML` (config); `arrivalEvidence`, `seedArrivalTraces` (traces). **Writers:** `<top-level>`, `seedArrivalTrace`.

---

### 3.56 `legAcks` / `backupOffers` — L18123 / L18124 | maps keyed by subId | 0 seed

* `legAcks[subId]` (L18142–18144) = `{source, weight, tsMs, by, note}`. `source` ∈ `ACK_SOURCE` keys (L18127): **`app | phone | whatsapp | assumed`**; `weight` ∈ **`strong | attested | weak`**, copied from `ACK_SOURCE[source].weight`. `by` is `'captain'` when `source==='app'`, otherwise the operator's name.
* `backupOffers[subId]` (L18180) = `{driverId, state, tsMs}`. `state`: `'offered'` at creation; `respondBackupOffer` resolves it. **UNVERIFIED** beyond `'offered'`.
**Readers:** `legAck`, `setLegAck` / `backupOffer`, `createBackupOffer`. **Writers:** `<top-level>` + `setLegAck` / `createBackupOffer`.

---

### 3.57 `branding` — L18388 | config-object

`{logoUrl:'', wordmark:'eyvar', showWordmark:true, accent:'#185FA5'}`. Reset to the same literal by `resetBranding` (L18455).
**Readers (3):** `applyBranding`, `handleLogoFile`, `renderBrandingSettings`. **Writers (3):** `<top-level>`, `resetBranding`, `saveBranding`.
**Overlap:** `opsConfig.general.logoDataUrl` (L2570) and `opsConfig.general.companyName` cover the same ground from the Settings → General page — two branding stores (§7).

---

### 3.58 `ownership` / `cases` / `ownershipConfig` — L18851 / L18852 / L18853

* `ownership` — keyed `'type:id'` via `ckey(type,id)`. Record (L18887–18890): `{key, type, id, ownerId, ownerName, claimedAtMs, touchedAtMs, state, takeovers[]}`. `state`: **`claimed`** at claim; `releaseItem`/`completeItem` change it (values observed in comparisons: `'claimed'`, L19349). `claimedAtMs` is preserved on re-claim by the same owner (L18888).
* `cases` — keyed `'CASE-####'`. Record (L18965–18966): `{id, kind, rootType, rootId, label, children:[{type,id}], openedAtMs, closedAtMs}`.
* `ownershipConfig` = `{staleMin:30, warnTakeover:true}`.
**Readers:** ownership 10 (`claimItem`, `closeCase`, `commitHandover`, `completeItem`, `myOpenClaims`, `ownershipStats`, `presenceList`, `releaseItem`, `touchClaim`, `whoHolds`); cases 5 (`caseFor`, `closeCase`, `linkToCase`, `newCase`, `openCaseView`); config 4.
**Writers:** `<top-level>` + `claimItem` / `newCase` / (config: none).
**Foreign keys:** `ownership.ownerId`→`teamUsers`; `ownership.id` and `cases.rootId`/`children[].id`→ the collection named by `type`/`rootType` (polymorphic). `type`/`rootType` values come from the `WORK_ROUTING` queue keys (L19090): `ticket`, `dispute`, `fairness`, `emergency`, `dispatch`, `absence`, `leg`, `risk`, `incident`, `lostfound`, `erasure`, `coverage`.

---

### 3.59 `scriptProgress` — L19410 | map: ticketId → number[] | 0 seed

Value is an array of checked step indices into a `SCRIPT_LIBRARY` entry (L19336, 24 scripts keyed `'1.1'`…). Toggled by `toggleScriptStep` (L19442).
**Readers (2):** `scriptPanelHTML`, `toggleScriptStep`. **Writers (2):** `<top-level>`, `toggleScriptStep`.
**Foreign keys:** key→`tickets`.

---

### 3.60 `onCallSchedule` / `handovers` — L19598 / L19607

`onCallSchedule` (L19598–19606):

| Field | Type | Value |
|---|---|---|
| `timezone` | string | `'Asia/Riyadh'` |
| `blocks[]` | array | `{key:'morning',label:'Morning',from:6,to:14}`, `{key:'evening',…,from:14,to:22}`, `{key:'night',…,from:22,to:6}` |
| `tiers[]` | array | `{key:'primary',label:'Primary'}`, `{key:'escalation',label:'Escalation'}` |
| `assign` | object | `'day:block:tier' → userId`, built by `slotKey()` (L19609); empty at seed |
| `overrides[]` | array | `{day, block, tier, userId, note, tsMs}`; empty at seed |

`handovers` — built in `commitHandover` (L19716–19719): `{id:'HO-####', fromId, fromName, toId, toName, tsMs, block, day, notes, items:[{type,id}], transferred}`.
**Readers:** schedule 6 (`currentBlock`, `onCallNow`, `renderRota`, `rotaBoot`, `rotaGaps`, `rotaStats`); handovers 2 (`commitHandover`, `renderRota`).
**Writers:** schedule 3 (`<top-level>`, `rotaBoot`, `setRotaSlot`); handovers 2 (`<top-level>`, `commitHandover`).
**Foreign keys:** `assign` values, `overrides[].userId`, `handovers.fromId`/`toId` → `teamUsers`; `handovers.items[]` → `ownership` claims.
**Enumerations:** `block` ∈ **`morning | evening | night`**; `tier` ∈ **`primary | escalation`**; `day` ∈ `DAY_KEYS` (L19594) **`sun…sat`**, with `WEEKEND=['fri','sat']` (L19596).

---

### 3.61 `ledger` / `idempotency` / `moneyRejects` — L19879 / L19880 / L19881

Double-entry bookkeeping, all populated by `postLedger` (L19917–19932).

* `ledger[]` entry (L19930–19931): `{id:'JE-#####', ref, type, tsMs, postings[], meta, total}`. `postings[]` elements carry `{account, debit?, credit?}`.
* **Validation is enforced**: a posting is refused if any `account` is not a key of the `ACCOUNTS` global (L19865, 12 accounts) **or** if debits ≠ credits (L19921). Refused postings go to `moneyRejects` with `{ref, type, why, tsMs, postings}` (L19924) and `logAction('ledger_rejected',…)`; **nothing is written to `ledger`**.
* `ACCOUNTS` keys: `cash.gateway`, `ar.rider` (assets); `liability.wallet`, `liability.driver`, `liability.escrow`, `tax.vat_output` (liabilities); `revenue.fares`; `contra.refunds`; `expense.driver_pay`, `expense.goodwill`, `expense.emergency`, `expense.compensation`.
* `idempotency[key]` (L19906) = `{key, operation, tsMs, attempts, result}`; `withIdempotency` bumps `attempts` on replay and `idemStats` counts keys with `attempts>1` (L19911).

**Readers:** ledger 4 (`accountBalance`, `postLedger`, `renderLedger`, `trialBalance`); idempotency 2 (`idemStats`, `withIdempotency`); moneyRejects 1 (`renderLedger`).
**Writers:** `<top-level>` + `postLedger` (ledger, moneyRejects) / `withIdempotency` (idempotency).

---

### 3.62 `telephony` / `callSessions` — L20174 / L20175

`telephony` = `{targetAnswerSec:20, wrapUpSec:60, adapter:null}` — `adapter:null` means no real telephony backend is wired.
`callSessions[]` is written from two paths:
* `abandonCall` (L20257–20259): `{id:'CALL-####', entityId, channel, ringAtMs, answerAtMs:null, endAtMs, abandoned:true, waitSec}`.
* `commitWrapUp` (L20303–20309): the `_activeCall` object augmented with `endAtMs, handledSec, waitSec, reasonCode, outcome, note, abandoned:false, agentName`.
**Enumerations** — `channel`: **`phone` (inbound) | `phone_out` (outbound)** (inferred from L20311). `outcome`: default `'resolved'` (L20300); `UNVERIFIED` as a closed set.
**Readers:** telephony 2 (`queueStats`, `renderQueueMetrics`); callSessions 4 (`abandonCall`, `answerCall`, `queueStats`, `renderQueueMetrics`).
**Writers:** callSessions 3 (`<top-level>`, `abandonCall`, `commitWrapUp`).
**Foreign keys:** `entityId`→`riders`/`drivers`, `reasonCode`→`reasonCodes`.

---

### 3.63 `dataWindow` — L20403–20410 | config-object

`{months:13, rationale:'12 months for year-on-year comparison + 1 month headroom. Must not be shorter than the payment provider's dispute window.'}`. `windowStartMs()` (L20411) = `nowMs() - months × 30.44 × 86 400 000`.
**Readers (6):** `buildRiderHistory`, `renderIntegrity`, `renderWindowSettings`, `windowNoteHTML`, `windowStartMs`, `<top-level>`. **Writers (2):** `<top-level>`, `saveDataWindow`.
**Self-declared uncertainty:** the inline comment (L20405–20408) states the binding constraint is the payment network's dispute window and must be confirmed with the provider — this is `UNVERIFIED` by design.

---

### 3.64 `presence` — L21324 | map: userId → record | 0 seed (populated by `presenceBoot`, L21826)

Record (L21330): `{userId, sessionStartMs, lastSeenMs, page, actions}`. `markPresence` increments `actions` and refreshes `lastSeenMs`; idle is `PRESENCE_IDLE_MIN` = 10 minutes (L21325).
**Readers (2):** `markPresence`, `presenceList`. **Writers (3):** `<top-level>`, `markPresence`, `presenceBoot`.
**Foreign keys:** key→`teamUsers`. `presenceList` joins `DB.ownership` to count each operator's held claims (L21349).

---

### 3.65 `rateCard` / `rateCardHistory` / `surgeSuspensions` — L21431 / L21463 / L21464

`rateCard` (L21431–21462):

| Field | Type | Unit | Value | Meaning |
|---|---|---|---|---|
| `version` | string | — | `'RC-2026-08-01'` | Price-book version |
| `effectiveFrom` | string | ISO date | `'2026-08-01'` | Effective date |
| `status` | string | enum | `'live'` | Lifecycle |
| `currency` | string | ISO-4217 | `'SAR'` | Currency |
| `vatIncluded` | boolean | — | `true` | Prices are VAT-inclusive |
| `approvedBy` / `proposedBy` | string \| null | FK | `null` | → `teamUsers` |
| `classes.economy` | object | — | `{label:'Economy', base:5.00, perKm:1.20, perMin:0.40, minFare:12.00, cancelFee:8.00, freeWaitMin:5, waitPerMin:0.50}` | Economy pricing |
| `classes.comfort` | object | — | `{label:'Comfort', base:8.00, perKm:1.75, perMin:0.55, minFare:18.00, cancelFee:12.00, freeWaitMin:5, waitPerMin:0.75}` | Comfort pricing |
| `commission.onDemand` | number | % | `22` | On-demand take rate |
| `commission.subscription` | number | % | `20` | Subscription take rate |
| `returnLegFactor` | number | ratio | `0.90` | Return-leg discount |
| `planDiscountPct` | object | % | `{weekly:12, biweekly:16, monthly:20}` | Commitment ladder |
| `surge.capByCity` | object | ratio | `{RUH:2.0, JED:2.0}` | Per-city surge cap |
| `surge.minMultiplier` | number | ratio | `1.0` | Floor |
| `surge.appliesToPlanLegs` | boolean | — | `false` | Never surge a plan leg |
| `floors.targetMarginPct` | number | % | `12` | Margin target |
| `floors.supportCostPerSubscriber` | number | SAR | `9.00` | Support cost |
| `floors.paymentFeePct` | number | % | `2.2` | Payment fees |
| `floors.emergencyReservePct` | number | % | `3.5` | Emergency reserve |
| `effectiveTo` | string | — | — | Set at L21593 when superseded |

**Enumerations** — `status`: `'live'` (seed); `proposeRateCard` writes `'draft'` (L21559), `approveRateCard` writes `'superseded'` on the old card (L21593) and `'live'` on the new (L21595). Full set: **`draft | live | superseded`**.
`rateCardHistory[]` holds superseded/draft copies (deep-cloned via `JSON.parse(JSON.stringify(old))`, L21594).
`surgeSuspensions[]` (L21536–21537): `{zoneId, reason, setBy, startedAtMs, expiresAtMs}`; capped at **12 hours** (`Math.min(hours||6,12)`, L21535).
**Readers:** rateCard 9 (`approveRateCard`, `commitRateCardChange`, `fareFor`, `openRateCardChange`, `planQuote`, `pricingBoot`, `proposeRateCard`, `renderPricing`, `surgeCapFor`); history 4; suspensions 2 (`effectiveSurge`, `renderPricing`).
**Writers:** rateCard 3 (`<top-level>`, `approveRateCard`, `pricingBoot`); history 3; suspensions 2.

---

## 4. Referenced but never defined

**None.** All 101 `DB.<key>` names referenced anywhere in the file have a definition — 21 in the literal (L2566–2842) and 80 in top-level `DB.<key>=` statements. This was checked by extracting every `DB\.([A-Za-z_]\w*)` occurrence in all 21,857 lines and differencing against the defined set; the difference is empty.

Nor is there any dangling **field** read on `DB`: the eight `commitPolicy` sub-fields that the L16541 literal omits (`emergencyMultiplierPct`, `dispatchWindowSec`, `dispatchMaxCandidates`, `riderCompPctPer10Min`, `riderCompCapPct`, `riderCompMinSAR`, `commitmentReservePct`, `offerWindowMin`) are all assigned by later top-level statements at L17182–L17187, L17465 and L18125, ahead of every read of them (the earliest read is L17239). I initially recorded two of these as dangling; that was wrong and is corrected here.

The genuinely absent things are field-level and belong to §6 rather than here: `rideRequests.assignment`, `riders.payMethod` and `corporateAccounts.requireApprovalAboveSAR` are read by code but never seeded, and `riders.wallet.transactions[].balanceAfter` is seeded but never read.

---

## 5. Entity-relationship map

Every relationship below is expressed as a stored field pointing at another collection. There is no referential-integrity enforcement anywhere in the file — all of these are conventions, and several are already broken in the seed (§7).

### 5.1 Core entity graph

| # | Relationship | From | To | Via field | Cardinality |
|---|---|---|---|---|---|
| 1 | Rider owns subscriptions | `riders` | `subscriptions` | `riders.subs[]` | 1 → 0..N |
| 2 | Subscription belongs to rider | `subscriptions` | `riders` | `subscriptions.rider` | N → 1 |
| 3 | Subscription assigned to captain | `subscriptions` | `drivers` | `subscriptions.driver` | N → 1 |
| 4 | Rider took trips | `riders` | `trips` | `riders.trips[]` | 1 → 0..N |
| 5 | Trip belongs to rider | `trips` | `riders` | `trips.rider` | N → 1 |
| 6 | Captain drove trips | `drivers` | `trips` | `drivers.trips[]` | 1 → 0..N |
| 7 | Trip driven by captain | `trips` | `drivers` | `trips.driver` | N → 1 |
| 8 | Trip belongs to a subscription | `trips` | `subscriptions` | `trips.sub` (nullable) | N → 0..1 |
| 9 | Trip settled by a payment | `trips` | `payments` | `trips.pay` (nullable) | 1 → 0..1 |
| 10 | Payment charges an entity | `payments` | `riders` **or** `drivers` | `payments.entity` | N → 1 (**polymorphic**) |
| 11 | Payment covers a trip *or* a subscription | `payments` | `trips` **or** `subscriptions` | `payments.trip` | N → 1 (**polymorphic**) |
| 12 | Rider made payments | `riders` | `payments` | `riders.payments[]` | 1 → 0..N |
| 13 | Captain received payouts | `drivers` | `payments` | `drivers.payments[]` | 1 → 0..N |
| 14 | Complaint filed by rider | `complaints` | `riders` | `complaints.by` | N → 1 |
| 15 | Complaint against captain | `complaints` | `drivers` | `complaints.against` | N → 1 |
| 16 | Rider's complaints | `riders` | `complaints` | `riders.complaints[]` | 1 → 0..N |
| 17 | Captain's complaints | `drivers` | `complaints` | `drivers.complaints[]` | 1 → 0..N |
| 18 | Application becomes a captain | `pendingDrivers` | `drivers` | `pendingDrivers.approvedAs` | 1 → 0..1 |
| 19 | Live trip mirrors a trip | `liveTrips` | `trips` | `liveTrips.id` (shared id) | 1 → 1 |
| 20 | Live trip's rider / captain | `liveTrips` | `riders` / `drivers` | `.rider` / `.driver` | N → 1 each |
| 21 | Comm log belongs to a trip | `commLogs` | `trips` | map key | 1 → 1 |
| 22 | Circuit belongs to a captain | `circuits` | `drivers` | map key | 1 → 1 |
| 23 | Circuit leg serves a rider | `circuits[].rider` | `riders` | `.rider` | N → 1 |
| 24 | Payout row per captain | `payouts` | `drivers` | map key | 1 → 1 |
| 25 | Deduction against a captain | `deductions` | `drivers` | `deductions.driver` | N → 1 |
| 26 | Deduction cites a trip | `deductions` | `trips` | `deductions.trip` | N → 1 |
| 27 | Escrow hold on a subscription | `escrowHolds` | `subscriptions` | `escrowHolds.sub` | 1 → 1 |
| 28 | Escrow hold names captain + rider | `escrowHolds` | `drivers` / `riders` | `.driver` / `.rider` | N → 1 each |
| 29 | Ride request from a rider | `rideRequests` | `riders` | `.rider` | N → 1 |
| 30 | Ride request offered to a captain | `rideRequests` | `drivers` | `.offerTo` (runtime) | N → 0..1 |
| 31 | Sub request from a rider | `subscriptionRequests` | `riders` / `newRiders` | `.rider` | N → 1 |
| 32 | Sub request names a plan | `subscriptionRequests` | `plans` | `.plan` (key) | N → 1 |
| 33 | Sub request materialises a subscription | `subscriptionRequests` | `subscriptions` | `.assignedSub` | 1 → 0..1 |
| 34 | Upcoming leg belongs to a subscription | `upcomingSubTrips` | `subscriptions` | `.sub` | N → 1 |
| 35 | Upcoming leg's rider / captain | `upcomingSubTrips` | `riders` / `drivers` | `.rider` / `.driver` | N → 1 each |

### 5.2 Operations & staff

| # | Relationship | From | To | Via field | Cardinality |
|---|---|---|---|---|---|
| 36 | Audit entry names an actor | `auditLog` | `teamUsers` | `.actorId` | N → 1 |
| 37 | Audit entry targets a record | `auditLog` | *(any)* | `.entityId` typed by `.entityType` | N → 1 (**polymorphic**) |
| 38 | Sessions per operator | `loginSessions` | `teamUsers` | map key | 1 → 1 |
| 39 | Presence per operator | `presence` | `teamUsers` | map key | 1 → 1 |
| 40 | Claim held by an operator | `ownership` | `teamUsers` | `.ownerId` | N → 1 |
| 41 | Claim covers a work item | `ownership` | *(any queue)* | `.type` + `.id` (key `'type:id'`) | 1 → 1 (**polymorphic**) |
| 42 | Case groups records | `cases` | *(any)* | `.rootType`/`.rootId`, `children[].type/.id` | 1 → N (**polymorphic**) |
| 43 | Handover between operators | `handovers` | `teamUsers` | `.fromId`, `.toId` | N → 1 each |
| 44 | Handover carries claims | `handovers` | `ownership` | `items[]` `{type,id}` | 1 → N |
| 45 | Rota slot assigns an operator | `onCallSchedule.assign` | `teamUsers` | value | N → 1 |
| 46 | Simple on-call pair | `onCall` | `teamUsers` | `.primary`, `.secondary` | 1 → 1 each |
| 47 | Contact logged by an agent | `contacts` | `teamUsers` | `.agentId` | N → 1 |
| 48 | Contact about an entity | `contacts` | `riders` / `drivers` | `.entityId` | N → 1 (**polymorphic**) |
| 49 | Goodwill issued by an agent | `goodwillLedger` | `teamUsers` | `.agentId` | N → 1 |
| 50 | Rate card approved by | `rateCard` | `teamUsers` | `.approvedBy`, `.proposedBy` | 1 → 0..1 |
| 51 | Surge suspension set by | `surgeSuspensions` | `teamUsers` | `.setBy` | N → 1 |

### 5.3 Support, safety & compliance

| # | Relationship | From | To | Via field | Cardinality |
|---|---|---|---|---|---|
| 52 | Ticket about an entity | `tickets` | `riders` / `drivers` | `.entity` | N → 1 (**polymorphic**) |
| 53 | Ticket classified by reason | `tickets` | `reasonCodes` | `.reasonCode` | N → 1 |
| 54 | Reason code maps to an SLA tier | `reasonCodes` | `slaPolicy.tiers` | `.tier` (`T1`–`T4`) | N → 1 |
| 55 | Script progress per ticket | `scriptProgress` | `tickets` | map key | 1 → 1 |
| 56 | Mass event groups tickets | `massEvents` | `tickets` | `ticketIds[]` | 1 → N |
| 57 | Mass event affects riders | `massEvents` | `riders` | `riderIds[]` | 1 → N |
| 58 | Contact classified by reason | `contacts` | `reasonCodes` | `.reasonCode` | N → 1 |
| 59 | Goodwill classified by reason | `goodwillLedger` | `reasonCodes` | `.reasonCode` | N → 1 |
| 60 | Call classified by reason | `callSessions` | `reasonCodes` | `.reasonCode` | N → 1 |
| 61 | Call about an entity | `callSessions` | `riders` / `drivers` | `.entityId` | N → 1 |
| 62 | Complaint classified by reason | `complaints` | `reasonCodes` | `.reasonCode` (runtime) | N → 1 |
| 63 | Incident on a trip | `incidents` | `trips` | `.trip` | N → 1 |
| 64 | Incident reporter / subject | `incidents` | `riders`/`drivers` / `drivers` | `.reporter` / `.against` | N → 1 each |
| 65 | Dispute on a subscription | `disputes` | `subscriptions` | `.sub` | N → 1 |
| 66 | Dispute claimant / respondent | `disputes` | `riders` / `drivers` | `.claimant` / `.against` | N → 1 each |
| 67 | Lost item on a trip | `lostFound` | `trips` | `.trip` | N → 1 |
| 68 | Lost item rider / captain | `lostFound` | `riders` / `drivers` | `.rider` / `.driver` | N → 1 each |
| 69 | Document expiry per captain | `driverDocs` | `drivers` | map key | 1 → 1 |
| 70 | Suspension per captain | `complianceSuspensions` | `drivers` | map key | 1 → 0..1 |
| 71 | Erasure request for a rider | `erasureRequests` | `riders` | `.riderId` | N → 1 |
| 72 | Fairness case for a captain | `fairnessCases` | `drivers` | `.driverId` | N → 1 |
| 73 | Fairness case subject | `fairnessCases` | `riders`/`trips` | `.subjectId` | N → 0..1 (**polymorphic**) |
| 74 | Ride state log per trip | `rideStateLogs` | `trips` | map key | 1 → 1 |
| 75 | Arrival trace per trip | `arrivalTraces` | `trips` | map key | 1 → 1 |

### 5.4 Commitment, dispatch & coverage

| # | Relationship | From | To | Via field | Cardinality |
|---|---|---|---|---|---|
| 76 | Backup captain per subscription | `subBackups` (= `backupRegistry`) | `subscriptions` → `drivers` | key → value | 1 → 1 |
| 77 | Leg acknowledgement per subscription | `legAcks` | `subscriptions` | map key | 1 → 1 |
| 78 | Backup offer per subscription | `backupOffers` | `subscriptions` → `drivers` | key → `.driverId` | 1 → 1 |
| 79 | Plan confirmation per subscription | `planConfirmations` | `subscriptions` | map key | 1 → 1 |
| 80 | Absence against a captain | `absenceEvents` | `drivers` | `.driverId` | N → 1 |
| 81 | Absence on a subscription | `absenceEvents` | `subscriptions` | `.subId` | N → 1 |
| 82 | Absence escalation tier | `absenceEvents` | `commitPolicy.tiers` | `.tier` (1–3) | N → 1 |
| 83 | Emergency claim against an absence | `emergencyClaims` | `absenceEvents` | `.absenceId` | 1 → 1 |
| 84 | Absence links back to its claim | `absenceEvents` | `emergencyClaims` | `.emergencyId` | 1 → 0..1 |
| 85 | Emergency claim by a captain | `emergencyClaims` | `drivers` | `.driverId` | N → 1 |
| 86 | Dispatch for a subscription | `emergencyDispatches` | `subscriptions` | `.subId` | N → 1 |
| 87 | Dispatch triggered by an absence | `emergencyDispatches` | `absenceEvents` | `.absenceId` | N → 0..1 |
| 88 | Dispatch queue of candidates | `emergencyDispatches` | `drivers` | `queue[].id`, `.acceptedBy` | 1 → N / 1 → 0..1 |
| 89 | Terms acceptance by a captain | `termsAcceptances` | `drivers` | `.driverId` | N → 1 |
| 90 | Terms acceptance of a version | `termsAcceptances` | `commitPolicy.termsVersion` | `.version` | N → 1 |

### 5.5 Money, pricing & growth

| # | Relationship | From | To | Via field | Cardinality |
|---|---|---|---|---|---|
| 91 | Invoice per payment | `invoices` | `payments` | map key + `.paymentId` | 1 → 1 |
| 92 | Invoice buyer | `invoices` | `riders`/`drivers` | `.buyerId` | N → 1 |
| 93 | Credit note against a refund | `creditNotes` | `refunds` | `.refundId` | 1 → 1 |
| 94 | Credit note against an invoice | `creditNotes` | `invoices` / `payments` | `.againstInvoice` / `.againstPayment` | 1 → 0..1 |
| 95 | Refund for a rider | `refunds` | `riders` | `.riderId` | N → 1 |
| 96 | Refund relates to a subscription | `refunds` | `subscriptions` | `.relatedId` | N → 1 |
| 97 | Journal entry references a source | `ledger` | *(any)* | `.ref` | N → 1 (**polymorphic, free-text**) |
| 98 | Journal posting hits an account | `ledger[].postings[]` | `ACCOUNTS` (global) | `.account` | N → 1 (**enforced**, L19920) |
| 99 | Cash entry on a trip | `cashLedger` | `trips`/`drivers`/`riders` | `.tripId`/`.driver`/`.rider` | N → 1 each |
| 100 | Cash debt per captain | `driverCashDebt` | `drivers` | map key | 1 → 1 |
| 101 | Bonus paid to a captain | `driverBonusLog` | `drivers` | `.driverId` | N → 1 |
| 102 | Bonus under an incentive rule | `driverBonusLog` | `incentives` | `.incentiveId` | N → 1 |
| 103 | Referral between two riders | `referralLog` | `riders` | `.referrerId`, `.refereeId` | N → 1 each |
| 104 | Corporate account employs riders | `corporateAccounts` | `riders` | `.riders[]` | 1 → N |
| 105 | Rider belongs to a corporate account | `riders` | `corporateAccounts` | `.corpAccountId` | N → 0..1 |
| 106 | Subscription needs corp approval | `subscriptions` | `corporateAccounts` | `.approvalCorp` | N → 0..1 |
| 107 | Approval decision logged | `corpApprovalLog` | `corporateAccounts` / `subscriptions` / `riders` | `.corpId` / `.subId` / `.riderId` | N → 1 each |
| 108 | Steer offer targets a zone | `steerOffers` | `zones` | `.zone` | N → 1 |
| 109 | Recruitment queued for a zone | `recruitmentQueue` | `zones` | `.zone` | N → 1 |
| 110 | Surge suspended in a zone | `surgeSuspensions` | `zones` | `.zoneId` | N → 1 |
| 111 | Person's city | `riders`/`drivers`/`pendingDrivers`/`newRiders` | `cities` | `.city` → `.name` | N → 1 |
| 112 | Rate card supersession chain | `rateCardHistory` | `rateCard` | `.version` | N → 1 |
| 113 | Payment method matched to a gateway | `payments` | `paymentGateways` | `.method` matched against `.matchPrefix` | N → 1 (**prefix match, not a key**) |

### 5.6 Hub summary

Ranked by inbound foreign keys:

| Collection | Referenced by (inbound FKs) |
|---|---|
| `drivers` | 24 — `subscriptions.driver`, `trips.driver`, `liveTrips.driver`, `escrowHolds.driver`, `deductions.driver`, `payouts` key, `circuits` key, `driverDocs` key, `complianceSuspensions` key, `driverCashDebt` key, `subBackups` value, `backupOffers.driverId`, `driverBonusLog.driverId`, `absenceEvents.driverId`, `emergencyClaims.driverId`, `emergencyDispatches.absentDriver`/`queue[]`/`acceptedBy`, `fairnessCases.driverId`, `lostFound.driver`, `disputes.against`, `incidents.against`/`reporter`, `complaints.against`, `termsAcceptances.driverId`, `cashLedger.driver`, `rideRequests.offerTo` |
| `riders` | 21 — `subscriptions.rider`, `trips.rider`, `liveTrips.rider`, `escrowHolds.rider`, `circuits[].rider`, `rideRequests.rider`, `subscriptionRequests.rider`, `upcomingSubTrips.rider`, `refunds.riderId`, `complaints.by`, `disputes.claimant`, `lostFound.rider`, `erasureRequests.riderId`, `goodwillLedger.riderId`, `referralLog.referrerId`/`refereeId`, `paymentRisk` key, `corporateAccounts.riders[]`, `massEvents.riderIds[]`, `cashLedger.rider`, `emergencyDispatches.riderId`, `corpApprovalLog.riderId` |
| `subscriptions` | 13 — `trips.sub`, `escrowHolds.sub`, `upcomingSubTrips.sub`, `subBackups` key, `legAcks` key, `backupOffers` key, `planConfirmations` key, `absenceEvents.subId`, `emergencyDispatches.subId`, `disputes.sub`, `refunds.relatedId`, `subscriptionRequests.assignedSub`, `riders.subs[]` |
| `trips` | 11 — `commLogs` key, `liveTrips.id`, `deductions.trip`, `payments.trip`, `incidents.trip`, `lostFound.trip`, `rideStateLogs` key, `arrivalTraces` key, `cashLedger.tripId`, `riders.trips[]`, `drivers.trips[]` |
| `teamUsers` | 12 — `auditLog.actorId`, `loginSessions` key, `presence` key, `ownership.ownerId`, `handovers.fromId`/`toId`, `onCall.primary`/`secondary`, `onCallSchedule.assign` values, `contacts.agentId`, `goodwillLedger.agentId`, `rateCard.approvedBy`/`proposedBy`, `surgeSuspensions.setBy` |
| `reasonCodes` | 7 — `tickets`, `contacts`, `complaints`, `goodwillLedger`, `fairnessCases`, `massEvents`, `callSessions` |

---

## 6. Orphan & unused fields

### 6.1 Fields present in the seed but never read

Determined by extracting every key name from each seed block and searching the remaining 21,000+ lines for `.<field>` or `['<field>']`.

| Collection | Field | Line | Note |
|---|---|---|---|
| `riders` | `wallet.transactions[].balanceAfter` | L2594, L2603 | Seeded on both wallet transactions; **no code ever reads it**. Wallet balance is tracked on `wallet.balance` instead, so the running-total column is dead. |
| `auditLog` | `after.addedToPending`, `after.driversProcessed`, `before.escrowStatus`, `before.pendingTotal` | L2867–L2872 | Ad-hoc keys inside the free-form `before`/`after` blobs. `renderAuditLog` prints the blob generically, so these specific names are never referenced — expected for a schemaless diff payload, listed for completeness. |
| `dailySnapshots` | `quickRideRevenue`, `subRevenue` | L13803–13832 | Seeded on all 30 rows; only `totalRevenue` is charted (`renderTrendChart`) and exported. The revenue split is stored and never surfaced. |
| `corporateAccounts` | `usagePolicy.workHoursStart`, `usagePolicy.workHoursEnd` | L13848 | `workHoursOnly` is checked but the actual window bounds are never read — the policy cannot be enforced as written. |
| `legalDocuments` | `driverAgreement` (whole document) | L13875–L13879 | `tos` and `privacy` are both read by name in the consent UI; `driverAgreement` is never referenced by key. Driver terms are tracked separately via `commitPolicy.termsVersion` (§7). |
| `paymentRisk` | *(entire collection)* | L14199 | One seeded note, three readers, **no writer** — it can never grow. |

**Accessed dynamically, so *not* orphans** (a literal-name grep shows zero hits, but a loop supplies the key):
* `driverDocs.{license, vehicle_reg, inspection, insurance, operating_card}` — reached only via `DOC_TYPES.forEach(dt => …[dt[0]])` (L11113, `complianceScan`, `renderCompliancePage`).
* `pendingDrivers.docs.{license, id_card, vehicle_reg, background, insurance}` — reached via the docs-grid loop.
* `incidents.steps.{contact, verify, act, document}` — reached via `INC_STEPS` (L13394).
* `plans.{weekly,biweekly,monthly}` — reached via `DB.plans[currentPlanKey]` and `DB.plans[cadenceKey]`.

### 6.2 Fields written by code but absent from the seed

| Collection | Field | Written at | Note |
|---|---|---|---|
| `drivers` | `declineStreak`, `flaggedForDeclines` | `driverDeclineOrTimeout` / `driverAcceptOffer` | Decline-tracking, added lazily |
| `drivers` | `dob`, `nid`, `acceptedTrips`, `cancelledTrips` | L11099 | Only exist on drivers created from an application; the 6 seed drivers lack them |
| `riders` | `corpAccountId` | `commitAddEmployee` | Corporate membership |
| `riders` | `payMethod` | **read at L9611, never written** | `(rdr&&rdr.payMethod)` falls back to a random `'Visa ···NNNN'` — the field is read-only-optional and never populated |
| `subscriptions` | `direction`, `route`, `departTime`, `returnTime`, `days[]`, `perTripFare`, `startOutcome`, `pendingDriverCommit`, `pendingManagerApproval`, `approvalCorp`, `approvalThreshold` | L5099–L5101 | Only on runtime-created subscriptions; all 7 seed subscriptions lack them, so `buildSubProfile` and `generateUpcomingTripsForSubscription` see `undefined` for every seeded plan |
| `subscriptions` | `driverChanges` | `commitDriverChange` | Captain-change counter |
| `trips` | `stops[]`, `stopFee`, `dateMs`, `driverRatingGiven`, `riderRatingGiven`, `fareBreakdown`, `payMethod`, `reconstructed` | L12421, L18754–L18761 | Runtime/back-filled only |
| `payments` | `reconstructed` | L18771 | Back-filled history marker |
| `tickets` | `reasonCode`, `slaBreaches[]` | `slaStampNewTicket`, L14939 | Added by the SLA layer at boot |
| `complaints` | `reasonCode` | `backfillReasonCodes` | Added at boot |
| `escrowHolds` | `releasedAt`, `capturedAt` | L9602, L9608 | Resolution timestamps |
| `pendingDrivers` | `decidedBy`, `decidedAt`, `approvedAs`, `reason`, `docExpiry` | L11114, L11128, L11111 | Decision outcome |
| `subscriptionRequests` | `hold`, `assignedSub`/`assignedBy`/`assignedAt` (on `pending` rows), `expiredAt` | `ensureHold`, L10289, L9687 | Lifecycle fields |
| `notifications` | `action` | L9663 | Click target |
| `liveTrips` | `type` | L11898, L12483 | Only on runtime pushes; the 3 seed rows lack it |
| `rideRequests` | `vip`, `offerTo`, `offerIndex`, `offerSentAt` | L2488, L11990 | Dispatch bookkeeping |
| `cashLedger` | `debtAdded` | L12090 | Added by `applyCashDebtImpact` after the entry is built |
| `corporateAccounts` | `requireApprovalAboveSAR` | **read at L5101, never written** | `corpPol.requireApprovalAboveSAR` is read when deciding whether a subscription needs manager approval; the single seeded account (L13847) does not define it |
| `rateCard` | `effectiveTo` | L21593 | Set when superseded |
| `commitPolicy` | 8 fields | L17182–L17187, L17465, L18125 | See §3.49 |
| `absenceEvents` | `emergencyId` | L16801 | Back-link set by `commitEmergencyClaim` |
| `planConfirmations` | `ackSource` | L18209 | Added by the `setLegAck` path |

### 6.3 Collections referenced but never defined

**None** — see §4.

### 6.4 Collections defined but never read

| Collection | Line | Status |
|---|---|---|
| `termsAcceptances` | L16566 | **Written by `acceptPlanTerms` (L17134), read by nothing.** The only truly write-only collection in the file. A driver's terms acceptance is recorded and can never be checked. |

### 6.5 Collections with no writer (seed-only, immutable at runtime)

| Collection | Line | Consequence |
|---|---|---|
| `circuits` | L2817 | 1 reader (`renderDriverCircuit`), 0 writers — the daily circuit view is frozen at the seed and cannot reflect a reassignment |
| `complaints` | L2706 | 6 readers, 0 collection-level writers — no new complaint can ever be created; `resolveComplaint` only flips a held reference |
| `deductions` | L2807 | 6 readers, 0 collection-level writers — `applyDeduction`/`waiveDeduction` mutate held references only |
| `newRiders` | L2744 | 5 readers, 0 writers — the "new riders" list never shrinks. `openNewRiderProfile` (L11156) **copies** the row into `DB.riders` but leaves the original in place, so the same person exists in both collections simultaneously |
| `pendingDrivers` | L2712 | 12 readers, 0 writers — approved and rejected applications stay in the array forever (only `status` changes), so the pending queue never empties |
| `incidents` | L13389 | 9 readers, 1 writer (`<top-level>` only) — no incident can be created from the UI |
| `disputes` | L14391 | 8 readers, 1 writer (`<top-level>`) — no dispute can be filed |
| `lostFound` | L14448 | 4 readers, 1 writer (`<top-level>`) — no lost item can be reported |
| `escrowHolds` | L2801 | 5 readers, 1 writer (`<top-level>`) — holds are never created for new subscriptions |
| `loginSessions` | L2994 | 3 readers, 1 writer (`<top-level>`) — sessions are never created; `USR-5` has no entry at all |
| `zones` | L13952 | 9 readers, 1 writer (`<top-level>`) — `demand`/`supply`/`failures30d` never update from live data |
| `paymentRisk` | L14199 | 3 readers, 1 writer (`<top-level>`) |
| `slaPolicy`, `cancellationPolicy`, `compPolicy`, `multiStopConfig`, `arrivalConfig`, `ownershipConfig`, `vatConfig`, `telephony`, `legalDocuments` | various | Config objects edited in place through a held reference by their `save*` functions — the *collection* has no writer but the *values* do change |

### 6.6 Dead vocabulary

* `NOTIF_PRIORITY_RANK` / `NOTIF_PRIORITY_LABEL` (L2188–2189) define a `critical|high|medium|low` notification priority, but **no `DB.notifications` record carries a `priority` field** and `NOTIF_PRIORITY_LABEL` has zero readers.
* `ACTION_LABELS` (L2898–2914) declares 26 audit action labels, but `logAction` is called with at least 5 action strings that are not in it (`late_pickup_logged` L16681, `plan_leg_confirmed` L18209, `credit_note_issued` L15884, `ledger_rejected` L19925, `surge_suspended` L21537, `plan_terms_accepted` L17136). Those actions appear in the log but **cannot be selected in the audit filter dropdown**, which is built from `ACTION_LABELS` keys.

---

## 7. Data integrity observations

Every item below was verified by reading the cited lines. Nothing here is inferred.

### 7.1 Dangling foreign keys in the seed

Checked by extracting the primary-key universes (`trips` = 8 ids L2670–2684, `subscriptions` = 7 L2685–2693, `drivers` = 6 L2631–2669, `riders` = 10 L2593–2630, `payments` = 10 L2694–2705) and testing every `TRP-`/`SUB-`/`DRV-`/`RDR-`/`PAY-` literal inside each seed block against them.

| Source | Field | Dangling value | Line | Note |
|---|---|---|---|---|
| `drivers['DRV-0101'].trips[]` | — | `TRP-7720` | L2637 | Not in `DB.trips` |
| `drivers['DRV-0102'].payments[]` | — | `PAY-W820` | L2643 | Not in `DB.payments` |
| `drivers['DRV-0104'].payments[]` | — | `PAY-W900` | L2659 | Not in `DB.payments` |
| `incidents['INC-011']` | `.trip` | `TRP-8720` | L13392 | Not in `DB.trips` |
| `incidents['INC-013']` | `.trip` | `TRP-8977` | L13391 | Not in `DB.trips` |
| `lostFound['LF-07']` | `.trip` | `TRP-8720` | L14451 | Not in `DB.trips` |
| `lostFound['LF-08']` | `.trip` | `TRP-8977` | L14450 | Not in `DB.trips` |
| `auditLog['AUD-0003']` | `.entityId` | `DRV-0138` | L2871 | Historical approval; the driver was never added to `DB.drivers` |
| `subscriptionRequests` SREQ-001/002/004 | `.rider` | `RDR-3001`, `RDR-3002`, `RDR-3003` | L2796–L2799 | These riders live in `DB.newRiders` (L2745–2747), **not** `DB.riders`. Any resolver that only checks `DB.riders` will fail on them. |
| `auditLog['AUD-0008']` | `.entityId` | `UST-1` | L2864 | Points at `upcomingSubTrips`, a collection defined 3,300 lines later |

Only `PAY-W640` (L2704) of the three `PAY-W*` payout ids actually exists.

### 7.2 Counters that disagree with each other

| Claim A | Claim B | Lines | Conflict |
|---|---|---|---|
| `SUB-1041.trips = '5/5'` | `ESC-1041.tripsCompleted = 4` of `tripsRequired = 5` | L2686 vs L2802 | The subscription says all 5 trips are used; the escrow hold says 4. `ESC-1041.status` is still `'held'`, so money that should have released is stuck. |
| `SUB-1075.trips = '2/5'` | `ESC-1075.tripsCompleted = 2 / 5` | L2688 vs L2805 | Consistent — included for contrast. |
| `DRV-0103.stats.activeSubs = '6/6'` | `opsLimits.driver_max_active_subs.value = 5` | L2648 vs L2590 | Seeded driver exceeds the configured cap. Also, only `SUB-1052` (L2687) actually names `DRV-0103`, so the real count is 1, not 6. |
| `DRV-0101.stats.activeSubs = '4/5'` | `SUB-1041` + `SUB-1075` name `DRV-0101` | L2632 vs L2686/L2688 | Real count 2, stated 4. |
| `subs` page-subtitle global: `'142 active subscriptions'`, `'24 active drivers'`, `'284 registered riders'` | `DB` holds 7 / 6 / 10 | L2169 vs L2685/2631/2593 | Header counts are hardcoded prose written straight into the DOM (L8786, L9408) and never recomputed. |
| `MSG_SEGMENTS[4].count = 142` | same as above | L13738 | The broadcast audience size is the same stale 142. |
| `dailySnapshots` claims 6–10 riders / 4–7 drivers | Seed has 10 riders / 6 drivers, and ~55 riders after `seedMoreRequests` | L13803–13832 vs L2593/L2631/L9820 | The 30-day series is illustrative, not derived from `DB`. |

### 7.3 Two live copies of the same concept

| Concept | Copy A | Copy B | Consequence |
|---|---|---|---|
| **Plan catalogue** | `DB.plans` L2889 (the admin page's store) | `PLANS` L4389 + `CADENCE_META` L4520 + `CADENCE_DAYS` L11231 + `PLAN_FEATURES` L5992 (the pricing path's store) | Editing a plan in the UI **cannot change what a new subscription costs**. `savePlan` writes only `DB.plans`; `finalizeNewSub`/`materializeSubscription`/`renewOptionsFor` price only off the globals. `DB.plans.monthly.status='Draft'` (L2894) yet `PLANS.monthly` is unconditionally offerable. |
| **Platform commission** | `DB.plans[k].eyvarPct` (20/18/15) L2890–2894 | `EYVAR_COMMISSION_PCT=20` L3604, `CADENCE_META[k].eyvarPct` L4521, `CASH_COMMISSION_RATE=0.20` L12076, `DB.rateCard.commission` `{onDemand:22, subscription:20}` L21453 | **Five** independent encodings. `rateCard.commission.subscription=20` and `plans.monthly.eyvarPct=15` directly contradict each other for the monthly plan. |
| **Quick-ride fare model** | `DB.quickRideTypes` L13908 (`economy` base 2.50 / perKm 1.10 / perMin 0.35) | `DB.rateCard.classes` L21438 (`economy` base 5.00 / perKm 1.20 / perMin 0.40) | Two live price books for the same class, differing by 2× on base fare. `quickRideFare()` reads the first; `fareFor()`/`planQuote()` read the second. `quickRideTypes` also defines a `large` class that `rateCard` has no equivalent for. |
| **Surge cap** | `DB.surgeConfig.capMultiplier = 2.5` L13861 | `DB.rateCard.surge.capByCity = {RUH:2.0, JED:2.0}` L21460 | Two caps; `currentSurgeMultiplier` uses the first, `surgeCapFor` the second. |
| **On-call** | `DB.onCall` L15776 (a primary/secondary pair) | `DB.onCallSchedule` L19598 (a day × block × tier grid) | Two sources of truth; `onCallNameSimple()` reads the pair, `onCallNow()`/`renderRota()` read the grid. The comment at L15777 acknowledges the collision. |
| **Backup registry** | `DB.subBackups` L13140 | `DB.backupRegistry` L17198 | `backupRegistry` is an **alias** (same object reference), so these cannot drift — but two names for one object means `grep` on either name misses half the call sites. |
| **Branding** | `DB.opsConfig.general.{companyName, logoDataUrl}` L2570 | `DB.branding.{wordmark, logoUrl, accent}` L18388 | Two branding stores edited from two different settings panes. |
| **Driver-terms versioning** | `DB.legalDocuments.driverAgreement.currentVersion = '3.0'` L13875 | `DB.commitPolicy.termsVersion = 'PLAN-TERMS-v1.0'` L16559 | Two independent consent schemes for drivers. `DB.termsAcceptances` tracks the second and is never read (§6.4); `legalDocuments.driverAgreement` is never read by key (§6.1). Neither consent trail is actually usable. |
| **Cities** | `DB.cities` L13946 (4 records, launch status) | `KNOWN_CITIES` L7819 (24 records, lat/lng) | `addCity`/`removeCity` touch only `DB.cities`; a city added by an operator is absent from the autocomplete source and gets no coordinates. |
| **Districts / zones** | `DB.zones` L13952 (`'Al Malaz'`, `'Qurtubah'`) | `RIYADH_DISTRICTS` L7243 (`'Al Malaz District'`, `'Qurtubah District'`) | Two district vocabularies that **already disagree on spelling**, so they cannot be joined by key. |

### 7.4 Role-vocabulary mismatch (functional defect)

`DB.teamUsers[].role` values are `'Owner'`, `'Finance'`, `'Support'`, `'Ops Manager'` (L2831–2839), matching `TEAM_ROLES` (L10501). But two other tables key on **`'Operations'`**, a value no user ever has:

* `DB.compPolicy.roles` (L15381) — `'Operations': {perCaseSAR:200, dailySAR:2000}`. `currentRole()` (L15393) returns the raw `u.role`, so an Ops Manager falls through to `roles.default` and gets **50 SAR per case instead of 200**.
* `WORK_ROUTING` (L19090–19102) — 10 of the 12 queues grant access to `'Operations'`. `UNVERIFIED` whether `inboxFiltered` normalises the name before comparing; if it does not, those queues are visible to no one but Owners and Support.

### 7.5 String-typed numerics

Money, distance and duration are stored as **formatted strings** across most of the seed, forcing repeated `parseFloat`/`replace(/[^\d.]/g,'')` at every arithmetic site (e.g. L17262–17263 parses `sub.paid` and `sub.trips` back into numbers):

| Collection | String-typed numeric fields |
|---|---|
| `trips` | `km`, `min`, `fare`, `driverEarn` (L2671) — and `'—'` when cancelled (L2683), which parses to `NaN` |
| `subscriptions` | `paid` (`'86.50 SAR'`), `trips` (`'5/5'`) (L2686) |
| `payments` | `amount` (`'86.50 SAR'`) (L2695) |
| `riders.stats` | `totalPaid`, `renewalRate` (L2596) |
| `drivers.stats` | `monthEarn`, `onTime`, `activeSubs` (L2635) |
| `dailySnapshots` | `totalRevenue`, `quickRideRevenue`, `subRevenue` (L13803) |
| `circuits` | `km` (`'8.2 km'`) (L2818) |

By contrast `escrowHolds.amount`, `deductions.amount`, `refunds.amount`, `payouts.*` and everything in `rateCard`/`quickRideTypes` are proper numbers — the file is inconsistent about this, not uniformly wrong.

### 7.6 Polymorphic fields with no discriminator

| Field | Points at | Discriminator |
|---|---|---|
| `payments.entity` | `riders` **or** `drivers` | none — resolved by `DB.riders[id]\|\|DB.drivers[id]` (L4408) |
| `payments.trip` | `trips` **or** `subscriptions` | none — a `SUB-` prefix vs `TRP-` prefix is the only signal (L2695 vs L2699) |
| `tickets.entity` | `riders` **or** `drivers` | none (the thread's `role` hints at it) |
| `contacts.entityId`, `callSessions.entityId` | `riders` **or** `drivers` | none |
| `auditLog.entityId` | any collection | `entityType` — the one case that *does* carry a discriminator |
| `fairnessCases.subjectId` | `riders` **or** `trips` | none |
| `corpApprovalLog.subId` | `subscriptions` **or** `subscriptionRequests` | none — L4888 passes a `SUB-` id, L9982 passes an `SREQ-` id into the same field |
| `ledger[].ref` | anything | none — free text |

### 7.7 Id-prefix collision

`DB.disputes` uses `'DSP-07'`, `'DSP-06'` (L14392, L14394) and `DB.emergencyDispatches` mints `'DSP-'+padStart(4)` → `'DSP-0001'` (L17266). Two unrelated collections share the `DSP-` namespace. Global id resolvers that switch on prefix will mis-route.

### 7.8 Documentation/implementation drift inside the file

* `DB.planConfirmations` is documented as `tripId -> {…}` (comment L16563) but **every write keys it by `subId`** (L16589, L16596, L17145, L18209, L18221).
* `DB.upcomingSubTrips` is re-asserted at L6243 as `DB.upcomingSubTrips = DB.upcomingSubTrips || [...4 rows...]`. Because L6177 already assigned a truthy 8-element array, the 4-row fallback is unreachable dead code — and its rows disagree with the 8-row version (e.g. `UST-2.rider` is `RDR-2031` in the fallback, `RDR-1080` in the live version).
* `DB.subBackups = DB.subBackups || {}` at L17197 is likewise a no-op.
* `DB.upcomingSubTrips` rider/subscription pairs contradict `DB.subscriptions`: `UST-2` pairs `SUB-1052` with `RDR-1080` (L6186–6187) but `SUB-1052.rider` is `RDR-2031` (L2687); `UST-6` pairs `SUB-1041` with `RDR-1090` (L6210) but `SUB-1041.rider` is `RDR-1041` (L2686); `UST-7` pairs `SUB-1075` with `RDR-2087` (L6218) but `SUB-1075.rider` is `RDR-1075` (L2688). Five of the eight rows have this problem.

### 7.9 Coverage gaps

| Gap | Evidence |
|---|---|
| `DB.payouts` covers only `DRV-0101`, `DRV-0102`, `DRV-0104` (L2813–2815). `DRV-0103`, `DRV-0105`, `DRV-0106` have no payout row. | `ensurePayoutEntry` exists to backfill on demand |
| `DB.driverDocs` covers `DRV-0101`–`DRV-0105` (L13279–13283). `DRV-0106` (added at L2664) has **no** document record, so it is invisible to `complianceScan`. | The comment at L11106–L11110 says exactly this risk was the reason `approveDriver` now backfills |
| `DB.loginSessions` has no key for `USR-5` (L2995–3002) | `renderMaSecurity` guards with `\|\|[]` (L3007) |
| `DB.circuits` covers 2 of 6 drivers (L2818, L2824) | — |
| `DB.commLogs` covers 3 of 8 trips (L2750, L2755, L2758) | — |

### 7.10 Growth without bound

Only `DB.contacts` is capped (`length = 2000`, L14933) and only `navStack` among globals (`shift()` past 40, L7006). Every other append-only collection — `auditLog`, `ledger`, `emailOutbox`, `pushOutbox`, `callSessions`, `absenceEvents`, `goodwillLedger`, `cashLedger`, `moneyRejects`, `handovers`, `corpApprovalLog`, `rateCardHistory`, `surgeSuspensions` — grows without limit for the life of the page.

Several id generators derive the next id from `collection.length + 1` (e.g. `'CT-'+String(DB.contacts.length+1)` L14921, `'MAIL-'+…` L3580, `'GW-'+…` L15439, `'JE-'+…` L19930). Because `contacts` is *truncated* at 2000 (L14933), its generator will start reissuing `CT-02001` forever once the cap is hit — **a real id-collision bug**, unique to `contacts` because it is the only capped collection.

### 7.11 Hardcoded operator identity

`approveDriver` (L11114) and `rejectDriver` (L11128) write `decidedBy:'Sarah Al-Rashid'` as a **string literal** rather than resolving `CURRENT_USER_ID` (L2862). Every other mutation path resolves the acting user properly (`logAction`, `logContact`, `logGoodwill`, `commitHandover`, …). Impersonation (`impersonate` L21071) therefore cannot be reflected in driver-approval decisions.

---

## 8. UNVERIFIED items

| # | Item | Why it could not be verified |
|---|---|---|
| 1 | `DB.notifications[].type` closed set | `pushOpsNotification(type,…)` (L9663) accepts any string; the 6 seed values plus `'ticket'` (L14941) are all that were observed, but nothing constrains it. |
| 2 | `DB.contacts.channel` and `.outcome` closed sets | Both are free parameters of `logContact(o)` (L14923, L14931). Observed values only. |
| 3 | `DB.corporateAccounts.status` closed set | Only one seeded account (`'Pending'`, L13848). `setCorpStatus` takes the value as an argument. |
| 4 | `DB.emergencyClaims.kind` closed set | Read from the `em-kind` `<select>` (L16795); the option list lives in modal HTML that was not enumerated. Only the `'accident'` default is confirmed. |
| 5 | `DB.backupOffers[].state` closed set | Only `'offered'` (L18180) is confirmed; `respondBackupOffer`'s resolution values were not read. |
| 6 | `DB.massEvents[].status` beyond `'Open'` | No close path was found; a mass event may never leave `'Open'`. |
| 7 | `DB.refunds.reason` / `.source` / `.status` closed sets | `recordRefund` receives them as arguments; only the two seed rows were observable. |
| 8 | Whether `inboxFiltered` normalises `'Ops Manager'` → `'Operations'` | The function body was not read; if it does not, the `WORK_ROUTING` mismatch (§7.4) is a live access-control bug rather than a naming inconsistency. |
| 9 | Whether `loadPlanEditForm` fully re-seeds `PLAN_FEATURES` from `DB.plans[currentPlanKey].features` | If it does not, editing one plan's features can overwrite another's, because `PLAN_FEATURES` (L5992) is a single module-global buffer. |
| 10 | `DB.dataWindow.months = 13` correctness | The file's own comment (L20405–20408) states the value must not be shorter than the payment provider's dispute window and has not been confirmed with the provider. |
| 11 | Real post-boot record counts | `bootModules()` (L21807) runs 16 seeders whose output volume depends on `Math.random()` (`seedMoreRequests` L9805, `maybeGenerateCashEvent` L12120, `buildRiderHistory` L18654). Counts in §1 are pre-boot literal counts only. |
| 12 | `DB.incidents.severity` lower tiers | Only `'critical'` and `'high'` appear. Whether `'medium'`/`'low'` are intended could not be determined — nothing assigns `severity` at runtime. |
| 13 | Whether any action name appears in **both** `GATE_SPECS` (L18245) and `GATE_SWEEP` (L20769) | The two confirm-dialog registries were not cross-differenced; a collision would double-gate an action. |
| 14 | `DB.ownership[].state` values beyond `'claimed'` | `releaseItem`/`completeItem` bodies were not read; only `'claimed'` (L18889) and the comparison at L19349 are confirmed. |
| 15 | `DB.fairnessCases.decision` closed set | `'Upheld'` / `'Overturned'` were recovered from a global `status===` scan and are attributed to this collection by context, not by reading `decideFairness`. |

---

## 9. Line-number index

### 9.1 Structural landmarks

| What | Line |
|---|---|
| Leaflet CDN `<script>` | L470 |
| Inline `<script>` opens | L2166 |
| `var DB={` | **L2566** |
| `DB` literal closes (`};`) | **L2842** |
| `var navStack` / `var navCurrent` | L2849 / L2850 |
| `var CURRENT_USER_ID='USR-1'` | L2862 |
| `var ACTION_LABELS` | L2898 |
| `bootModules()` IIFE | L21807–L21856 |
| Inline `</script>` closes | L21855 |

### 9.2 Every collection, by definition line

| Line | Collection | Line | Collection |
|---|---|---|---|
| 2567 | `opsConfig` | 14448 | `lostFound` |
| 2583 | `opsLimits` | 14650 | `slaPolicy` |
| 2593 | `riders` | 14667 | `reasonCodes` |
| 2631 | `drivers` | 14718 | `contacts` |
| 2670 | `trips` | 15379 | `compPolicy` |
| 2685 | `subscriptions` | 15391 | `goodwillLedger` |
| 2694 | `payments` | 15505 | `fairnessCases` |
| 2706 | `complaints` | 15776 | `onCall` |
| 2712 | `pendingDrivers` | 15847 | `creditNotes` |
| 2744 | `newRiders` | 15848 | `creditNoteSequence` |
| 2749 | `commLogs` | 15961 | `erasureRequests` |
| 2763 | `tickets` | 16082 | `massEvents` |
| 2773 | `notifications` | 16337 | `rideStateLogs` |
| 2781 | `liveTrips` | 16541 | `commitPolicy` |
| 2786 | `rideRequests` | 16563 | `planConfirmations` |
| 2794 | `subscriptionRequests` | 16564 | `absenceEvents` |
| 2801 | `escrowHolds` | 16565 | `emergencyClaims` |
| 2807 | `deductions` | 16566 | `termsAcceptances` |
| 2812 | `payouts` | 17198 | `backupRegistry` *(alias)* |
| 2817 | `circuits` | 17199 | `emergencyDispatches` |
| 2830 | `teamUsers` | 17605 | `arrivalConfig` |
| 2863 | `auditLog` | 17611 | `arrivalTraces` |
| 2881 | `refunds` | 18123 | `legAcks` |
| 2889 | `plans` | 18124 | `backupOffers` |
| 2994 | `loginSessions` | 18388 | `branding` |
| 6177 | `upcomingSubTrips` | 18851 | `ownership` |
| 12080 | `cashLedger` | 18852 | `cases` |
| 12081 | `driverCashDebt` | 18853 | `ownershipConfig` |
| 13140 | `subBackups` | 19410 | `scriptProgress` |
| 13278 | `driverDocs` | 19598 | `onCallSchedule` |
| 13285 | `complianceSuspensions` | 19607 | `handovers` |
| 13389 | `incidents` | 19879 | `ledger` |
| 13495 | `promos` | 19880 | `idempotency` |
| 13564 | `incentives` | 19881 | `moneyRejects` |
| 13802 | `dailySnapshots` | 20174 | `telephony` |
| 13834 | `emailOutbox` | 20175 | `callSessions` |
| 13835 | `pushOutbox` | 20403 | `dataWindow` |
| 13846 | `corporateAccounts` | 21324 | `presence` |
| 13855 | `referralConfig` | 21431 | `rateCard` |
| 13861 | `surgeConfig` | 21463 | `rateCardHistory` |
| 13862 | `multiStopConfig` | 21464 | `surgeSuspensions` |
| 13867 | `legalDocuments` | | |
| 13883 | `surgeSchedule` | | |
| 13888 | `referralLog` | | |
| 13895 | `driverBonusLog` | | |
| 13899 | `inboundMessages` | | |
| 13908 | `quickRideTypes` | | |
| 13913 | `paymentGateways` | | |
| 13925 | `searchPhases` | | |
| 13936 | `cancellationPolicy` | | |
| 13946 | `cities` | | |
| 13952 | `zones` | | |
| 13960 | `steerOffers` | | |
| 13961 | `recruitmentQueue` | | |
| 13962 | `corpApprovalLog` | | |
| 13971 | `vatConfig` | | |
| 13972 | `invoiceSequence` | | |
| 13973 | `invoices` | | |
| 14199 | `paymentRisk` | | |
| 14391 | `disputes` | | |

### 9.3 In-function reassignments of an already-defined key

| Line | Statement | Effect |
|---|---|---|
| L7425 | `DB.opsLimits=DB.opsLimits.filter(...)` | `removeCustomLimit` |
| L7509 | `DB.paymentGateways=…filter(...)` | `removeGateway` |
| L7892 | `DB.cities=…filter(...)` | `removeCity` |
| L8110 | `DB.searchPhases=…filter(...)` | `removeSearchPhase` |
| L12316 | `DB.surgeSchedule=…filter(...)` | `removeSurgeWindow` |
| L12370 | `DB.quickRideTypes=…filter(...)` | `removeRideType` |
| L13726 | `DB.incentives=…filter(...)` | `removeIncentiveRule` |
| L18455 | `DB.branding={…}` | `resetBranding` |
| L21597 | `DB.rateCard=draft` | `approveRateCard` |

### 9.4 Late field additions to `DB.commitPolicy`

L17182 `emergencyMultiplierPct=150` · L17183 `dispatchWindowSec=45` · L17184 `dispatchMaxCandidates=5` · L17185 `riderCompPctPer10Min=20` · L17186 `riderCompCapPct=100` · L17187 `riderCompMinSAR=10` · L17465 `commitmentReservePct=0` · L18125 `offerWindowMin=20`

### 9.5 Runtime seeders

| Line | Function | Effect |
|---|---|---|
| L9787 (called L14557) | `seedMoreRequests` | +45 riders, +53 ride requests |
| L18102 | `seedArrivalTraces` | fills `arrivalTraces` |
| L21807 | `bootModules` | runs 16 gated boot steps (table in §1.3) |
