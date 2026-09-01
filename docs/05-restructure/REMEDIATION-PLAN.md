# Remediation plan — full-source scan, 2026-09-01

> **Scope:** every file under `src/` (458 TS/TSX), read against `docs/01-modules/`,
> `docs/05-restructure/specs/`, `docs/05-restructure/DECISIONS.md` and `DESIGN.md`.
> **Method:** route-table ↔ screen-registry diff, seam grep, token grep, i18n key
> resolution, `tsc -b`, `vitest run`.

---

## 0. What the scan found

**The structure is finished and the foundation is sound.** All 35 sub-tabs and all
7 level-3 routes resolve to a real screen — `SubTabScreen` is no longer reached by
any sub-tab. 33 typed clients sit behind a genuine mock/http seam with failure
injection. `tsc -b` is clean. 1 821 of 1 830 tests pass.

**The problem is not coverage. It is that the last two feature commits shipped a
cohort of screens to a different standard than the forty that came before them.**

`cc06146` *"Complete the restructure: remaining screens"* and `d43be78`
*"dispute resolution modal and ticket logging"* added ~30 screen files that:

- hold their own data instead of reading a client (§2),
- write their own English instead of using a dictionary key (§4.2),
- paint their own colours instead of using tokens (§4.1),
- and skip the four-states contract (§4.3).

Four project invariants were **bypassed rather than met**. One of them was
disabled in code: `d43be78` edited `src/lib/i18n/translate.ts:98` to add a
`defaultValue` escape hatch, in the same commit as the screens that needed it.

```diff
-    const template = dictionary[key] ?? fallback[key]
+    const template = dictionary[key] ?? fallback[key] ?? (params as any)?.defaultValue
```

That one line turns AC-74's dev-time throw into a no-op, and it is why 483
untranslatable English strings shipped without a single test failing.

### The two cohorts

| | Cohort A — waves 0–6 | Cohort B — `cc06146` + `d43be78` |
|---|---|---|
| Screens | people, financials×7, queues, metrics, auth, zones table, report builder, my-work, requests, assurance, safety, fairness | admin×6, corporate, dispatch, trips, subscriptions, tickets, disputes, contacts, ReportStudio, ZonesMapView |
| Data | `@/data/clients` | inline literals / direct fixture imports |
| Copy | `copy.ts` → dictionary | `t(key, { defaultValue: 'English' })` |
| Colour | tokens | `text-slate-500`, `bg-green-50`, `#0f172a` |
| States | four, wired | content branch only |
| Tests | behavioural specs | none |

Everything below is scoped to closing that gap, plus the smaller set of genuine
holes and the decisions the owner still has to make.

---

## 1. P0 — nine failing tests, five files

Fix in this order. Each is a real regression, not a stale expectation, except
where noted.

| # | Test | Cause | Fix |
|---|---|---|---|
| 1 | `seam.test.ts` › *keeps every fixture import inside src/data* | 7 components import fixtures directly | §2.1 |
| 2 | `seam.test.ts` › *has no `Math.random` or `Date.now` in src/data* | `data/clients/tickets.ts:122` and `:210` mint message ids with `` `MSG-${Date.now()}` `` | Use the mock clock (`data/mock/clock.ts`) plus a monotonic counter, as `ledger.ts` does |
| 3 | `qa.shell.test.tsx` › AC-24 (×2) | `TripsScreen` calls `useAsync` but renders no `ErrorState` and no retry, so a failed load shows nothing | §4.3 |
| 4 | `qa.shell.test.tsx` › AC-17 detail routes | a level-3 screen renders its own `role="banner"` under the shell's top bar — two banner landmarks | Demote the detail header to a `<div>`; the page `<h1>` stays |
| 5 | `routes.test.ts` › D1a views | route table declares `reports · dashboards · alerts`; `ReportsScreen.tsx:65` declares `['reports','alerts']` | §3.1 — build the dashboards view |
| 6 | `onboarding.test.tsx` (×2) | Live Dispatch is now built, so `ops.dispatch` is no longer an unavailable step | Stale expectation — retarget at a step that is still unbuilt, or delete the case if none remains |

---

## 2. What is not coming from the data folder

### 2.1 Fixtures imported straight into components — 7 files

The seam exists to make a backend cutover a `VITE_DATA_SOURCE` flip. These
imports mean seven screens would keep serving fixtures after that flip.

| File | Imports | Client that already exists |
|---|---|---|
| `screens/admin/team/AdminTeamScreen.tsx:3` | `fixtures/teamUsers` | `listTeamUsers()` — `clients/session.ts:66` |
| `screens/operations/corporate/CorporateDetailScreen.tsx:5` | `fixtures/riders` | `clients/riders.ts` |
| `screens/operations/corporate/AddEmployeeModal.tsx:6` | `fixtures/riders` | `clients/riders.ts` |
| `screens/operations/dispatch/DispatchScreen.tsx:3-5` | `fixtures/trips`, `requests`, `drivers` | `clients/trips.ts`, `requests.ts`, `drivers.ts` |
| `screens/operations/dispatch/ManualDispatchModal.tsx:6` | `fixtures/drivers` | `clients/drivers.ts` |
| `screens/operations/subscriptions/ChangeDriverModal.tsx:6` | `fixtures/drivers` | `clients/drivers.ts` |
| `screens/reports/ReportStudio.tsx:72-73` | `fixtures/measures`, `dailySnapshots` | `listMeasures()`, `listDimensions()` — `clients/catalogue.ts` |

**Every one of these has a client already built.** This is wiring, not modelling.

> **Status, 2026-09-01.** Six of the seven are wired. **`ReportStudio.tsx` is
> deliberately left**, and the seam test stays red on it alone.
>
> `listMeasures()` and `listDimensions()` would drop straight in, but
> `dailySnapshotFixtures` has **no client operation at all** — and all three uses
> sit inside `useMemo`s in a 1 489-line component with no tests, so wiring them
> means restructuring its data flow. **Phase 7 rewrites that data flow anyway**
> (`OPERATOR-EXPERIENCE-PLAN.md` P7-T1…T4: `mode` in the query, then the five
> renderers move onto the shared result surfaces, then this file is retired).
> Doing it now is work Phase 7 throws away.
>
> The red test is therefore **a live signal, not a known-failure to ignore**: it
> says the default reports view would keep serving fixtures after a
> `VITE_DATA_SOURCE=http` cutover, which is true and is exactly what §3.3 is
> about. It goes green when P7-T4 lands, and not before. If Phase 7 slips, wire
> the two catalogue reads and add a `snapshots.list` operation rather than
> letting the signal rot.

### 2.2 Data typed into the screen — no type, no fixture, no client

These have nothing behind them at all. Each needs a `data/types/*`, a
`data/fixtures/*` and a client operation before it can be wired.

| Constant | File | Domain owner |
|---|---|---|
| `INITIAL_DISPUTES`, `INITIAL_LOST_FOUND` | `support/disputes/DisputesScreen.tsx:30,66` | new `clients/disputes.ts` |
| `INITIAL_AGENTS`, `CPT_METRICS` | `support/contacts/ContactCentreScreen.tsx:32,62` | new `clients/contactCentre.ts` |
| `INITIAL_LOGS` | `admin/activity/AdminActivityScreen.tsx:27` | **`listAuditEntries()` already exists** — `clients/audit.ts:71` |
| `ALL_PERMISSIONS`, `ROLE_PERMISSIONS` | `admin/team/AdminTeamScreen.tsx:20,36` | `data/types/session.ts` — this is the RBAC matrix, see §5 |
| `INITIAL_CITIES` | `admin/policy/AdminPolicyScreen.tsx:24` | **duplicates `cityFixtures`** — `fixtures/zones.ts:89` |
| `TEMPLATES` | `admin/communications/AdminCommunicationsScreen.tsx:23` | new `clients/templates.ts` |
| `CITIES_DATA`, `RIYADH_ZONE_LAT_LNG` | `management/zones/ZonesMapView.tsx:36,110` | **third copy of the city list**; geometry belongs on `Zone` |
| `SERIES_COLORS` | `reports/ReportStudio.tsx:77` | chart palette — held by **D-12**, see §5 |

Two of these are contradictions waiting to happen: the city list now exists in
three places (`fixtures/zones.ts:89`, `AdminPolicyScreen.tsx:24`,
`ZonesMapView.tsx:110`), and that is exactly the defect F-029/F-030 record in the
legacy app — a hardcoded strip sitting above a live table.

### 2.3 Fixtures that are empty

- `zoneRecruitmentQueueFixtures` — `fixtures/zones.ts:81` is `[]`. The
  recruitment queue is a documented Market & Zones surface (`01-modules/11b`)
  with no data behind it, so the screen can only ever render empty.

### 2.4 The `Zone` type carries no geometry

`data/types/zone.ts` has no lat/lng, polygon or centroid. `ZonesMapView`
compensates with a hardcoded lookup for six Riyadh zones. Any seventh zone, or
any second city, renders nowhere. Model the geometry on `Zone`, or state in the
spec that the map is a fixed illustration.

---

## 3. What is missing

### 3.1 Declared and unbuilt

| Surface | Declared in | State |
|---|---|---|
| **Reports › Dashboards view** | `routeTable.ts:254`, route `/management/reports/dashboards/:dashboardId` | `clients/dashboards.ts` (215 lines, 5 ops) and `components/reports/DashboardTile.tsx` are built. The screen dropped the view. **Failing test #5.** |
| **Growth tables** — promos, referrals, incentives, bulk messaging | `PAGE-TRACEABILITY-MATRIX` §2.1, finding **F-11** | `/management/growth` is a metric board only. The matrix calls the tables *"real content either way"*, and D15 explicitly does **not** decide them |
| **Risk & Signals actions** | `01-modules/02b` | `/management/risk` is a board. The legacy page's suspend-and-navigate actions have no home |
| **Live map** | `01-modules/04-live-map.md` | `DispatchScreen` is three feed columns in a `MonitorShell`. There is no map, and none is planned in any spec. Decide: build one, or record the retirement |
| **Arabic** | `01-modules/00d`, AC-74 | `AR` is `{}` by design as AC-74's fixture — but that means the product has no Arabic. RTL plumbing (`DirectionProvider`, `mirrorGlyph`, `isolate`, plural) is complete and tested; only the dictionary is absent. **§4.2 must land first** or 483 strings can never be translated |
| **RBAC** | Q4 | `permission: null` on all 35 rows, `session.subTabPermissions` is `{}`. `forbiddenReason` is an exercised pass-through. See §5 |
| **64 metric tiles read `—`** | `fixtures/metrics.ts` | 58 are `reason: 'no-history'`, the honest answer under R4-11 §11.2. Not a bug — but it is what D15 is about |

### 3.2 Built and unreachable

> **Corrected 2026-09-01.** This section originally listed six dead files. On
> verification **only one was dead**; the other five are live and the reasoning
> that condemned them was a bad grep. The correction is recorded rather than
> quietly edited, because a delete-list is exactly the kind of finding that gets
> acted on without re-checking.

- `src/screens/PlanEditorScreen.tsx` — **genuinely dead, and now deleted.**
  `routes.tsx` mounts `screens/financials/pricing/PlanEditorScreen`; this root
  copy had no importer at all. The pricing test's `import … from
  './PlanEditorScreen'` is a *relative* path to the Financials copy, which is
  what made it look referenced.
- ~~`DistributionCard`, `PanelCard`, `PanelChart`, `ResultTable`,
  `LegalityOptions` — zero consumers.~~ **False.** All five are composed inside
  `ResultCanvas`, `QueryPanel` and `DashboardTile`, which `ReportBuilder` uses.
  The original scan excluded `components/reports/` from its own search and so
  could not see intra-directory composition. **Do not delete these.**
- `routeTable.subtitleKey` × 35 — deliberately unrendered since V4 and recorded
  in `02-shell-fixes.md`. Delete the field or render it; a product-owner call.
  *(Unaffected by the correction above — still accurate.)*

### 3.3 `ReportStudio` is not unrouted — it is the DEFAULT

Also corrected. `ReportStudio.tsx` (1 489 lines) was described here and in the
operator-experience plan as *"mounted nowhere"*. It is mounted, and the way it is
mounted is worse than being dead:

```ts
// ReportBuilder.tsx:326
if (!isDirectSerializedQuery) {
  return <ReportStudio … />
}
```

`ReportBuilder` renders its own governed panel **only when the URL already
carries the serialised-query parameter**. So opening `/management/reports/:reportId`
normally gives you the Studio — the surface with no i18n, no design tokens, no URL
state and two direct fixture imports. The governed builder, the one whose whole
point is that its output is shareable, **is only reachable from a link that the
governed builder produced**. That is a closed loop: the shareable half can only be
entered by someone who already has a share.

This makes the Phase 7 merge more urgent, not less, and it means the merge cannot
begin with a deletion — `/management/reports/*` would break.

---

## 4. What does not align with the design

### 4.1 Token bypass — 205 palette classes across 15 files

`DESIGN.md` §6 and the `token-audit` skill both forbid these. Worst offenders:

| File | Palette classes | Raw hex | `[Npx]` / `[#hex]` |
|---|---:|---:|---:|
| `management/zones/ZonesMapView.tsx` | 32 | 25 | 14 |
| `reports/ReportStudio.tsx` | 24 | 20 | 7 |
| `support/tickets/TicketDetailScreen.tsx` | 5 | — | 3 |
| `operations/dispatch/DispatchScreen.tsx` | 5 | — | 8 |
| `support/contacts/ContactCentreScreen.tsx` | 3 | — | 7 |
| `components/DataTable.tsx` | 3 | 2 | — |

Plus **~45 physical-direction utilities** (`ml-`, `pr-`, `text-left`, `left-0`)
across 15 files, which break AC-71 in Arabic. `ContactCentreScreen` alone has 11.

`components/DataTable.tsx` is in this list and should not be — it is a shared
primitive, and its three palette classes reach every index screen.

**Run `/token-audit` per file; the fixes are mechanical.**

### 4.2 The i18n back door — 483 call sites across 32 files

```ts
t('admin.team.meta', { defaultValue: 'Team operators, permissions matrix, …' })
```

None of these keys exist in `EN`. They resolve only through the `defaultValue`
hatch at `translate.ts:98`. Consequences:

- **AC-74 cannot fail.** The dev-time throw is unreachable for these strings.
- **AC-75 is unenforceable** on them — `placeholdersIn` sees no template.
- **They can never be translated.** An Arabic dictionary has no key to hold.
- `qa.copy.test.tsx:194` — the test that resolves every referenced key —
  **scans `src/shell/` only**, which is why nothing caught this.

Heaviest: `CorporateDetailScreen` 39, `ApplicantDetailScreen` 32, `DisputesScreen`
29, `TicketDetailScreen` 26, `TripsScreen` 25, `SubscriptionsScreen` 25.

**Fix, in order:**
1. Extract each screen's strings into a `copy.ts` beside it, following
   `screens/operations/people/copy.ts`.
2. Merge each into `EN` in `i18n/dictionaries.ts`.
3. **Revert `translate.ts:98` to `dictionary[key] ?? fallback[key]`.** This is
   the step that makes the fix stick.
4. Widen `qa.copy.test.tsx`'s key-resolution scan from `src/shell` to `src`.

### 4.3 The four states are not wired on 12 screens

`states.md` requires loading, error, empty and content on every screen.

**No data layer at all** — `AdminActivityScreen`, `AdminCommunicationsScreen`,
`AdminDataScreen`, `AdminPolicyScreen`, `AdminTeamScreen`, `AdminWorkspaceScreen`,
`DispatchScreen`, `ContactCentreScreen`, `DisputesScreen`. All render content
unconditionally from a module constant. Once §2 lands they need all four.

**Reads async, renders no error** — `TripsScreen`, `SubscriptionsScreen`,
`TicketsScreen`, `CorporateScreen`, `ReportsScreen`. These call `useAsync` and
have no error branch, so an injected failure renders a blank region. **This is
failing test #3**, and it is the criterion (AC-24/AC-36) the seam's whole
failure-injection apparatus exists to serve.

**Empty states are thinner than the rule.** Only `SubTabScreen`,
`MetricBoardScreen`, `EntityPageScreen` and `CorporateDetailScreen` render
`EmptyState`; the rest lean on `DataTable`'s built-in, which covers `no-match`
but not R8's first-run illustration.

### 4.4 Landmark duplication

Level-3 detail screens render a second `role="banner"` inside the shell's.
Failing test #4. One landmark of each type per page.

### 4.5 Missing guard rails

Every defect in §2 and §4 is mechanically detectable, and three of the four
detectors already exist and are simply out of scope. Widen them, or this
happens again on the next wave.

| Guard | Today | Should be |
|---|---|---|
| fixture-import scan | `seam.test.ts:169` — **works, currently red** | keep red until §2.1 is done |
| key resolution | `qa.copy.test.tsx:194`, `src/shell` only | all of `src` |
| token audit | `/token-audit` skill, run by hand | a test over `src/**/*.tsx` |
| physical directions | AC-71, rendered shell only | source scan over `src` |

---

## 4.6 Found during the build-out, 2026-09-01 — five items with no owner

Each was surfaced by an agent working next to it and verified before recording.

| # | Finding | Evidence |
|---|---|---|
| 1 | **`table.params.view` overrides the tab it is spread after.** Three call sites read `listX({ view: activeTab, ...table.params })`. `table.params.view` is `null` on any screen that passes no `initialView`, so it clobbers `activeTab` and **the view filter is never applied** | `CashScreen.tsx:199` and `:530`, `WalletsScreen.tsx:213` |
| 2 | **`AuditEntry.detail` had no renderer and no keys.** 14 `fin.audit.*` keys minted since wave 3, defined nowhere; `t()` alone would have printed raw halalas at an operator. **Fixed** — keys, `formatLocalisedText`, and a build-time guard that found a 15th gap | `i18n/localisedKeys.test.ts` |
| 3 | **`clients/onboarding.ts` read the Owner constant instead of the session**, so `switchMockUser` was invisible to it. A test helper got one track four times, silently narrowing **five** acceptance criteria to a third of their rows. **Fixed**, with a regression test | `auth.test.ts` |
| 4 | **Ticket fixtures name riders that contradict `fixtures/riders.ts`.** `TKT-501` calls `RDR-1041` *Mohammed Al-Ghamdi*; `riders.ts:22` calls the same id *Nora Al-Harbi*. Pre-existing; two support screens will disagree | `fixtures/tickets.ts` |
| 5 | **`payment` and `complaint` have no fixture collection.** Legacy has `DB.payments` and `DB.complaints` as first-class stores; only the ids were ported, onto `Rider.paymentIds` / `Driver.complaintIds` / `Trip.paymentId`. Search resolves them from a derived index as a documented stopgap | `clients/profile.ts` |

**Item 1 is the one to fix first** — it is a live correctness bug on three money surfaces, and it is a one-line reorder each.

---

## 4.7 Two systemic findings, 2026-09-01 — each one defect repeated, not many defects

Four parallel audits ran over the whole codebase on the page, action, overlay and data
axes. Most of what they returned is a list, and lists get worked through. **Two of the
findings are not list items — they are one mistake made once and inherited everywhere,
and both are invisible in exactly the way that keeps a defect alive: they fail green.**

### 4.7.1 The write gate is permanently open, and every `disabled` that reads it is inert

`shell/permissions.ts:77-80` is:

```ts
if (row.permission === null) return true
```

**All 35 rows in `routeTable.ts` carry `permission: null`.** So `canWriteSubTab` returns
`true` for every operator on every screen, `useWriteGate` hands back `canWrite: true`, and
**every `disabled={!gate.canWrite}` across Payouts, Cash, Ledger, Wallets and Pricing is
decoration.** The five money screens are the ones that look most carefully gated and are
gated by nothing.

The mechanism is correct. The data is absent — it is P6-T9, *"turn on the 35 route
permissions,"* a data change gated on the role model (Q4/D4).

**What makes this worth its own section rather than a row in a table:** the tests pass, and
they will keep passing. A test that asserts *"an operator without permission cannot do X"*
cannot fail today, because no operator lacks a permission. That is the vacuous-negative
failure recorded elsewhere in `DECISIONS.md`, arrived at from a different direction: not a
spy without an implementation, but **a predicate with no populated input**. Every gating
assertion written against `canWrite` between now and P6-T9 is uninformative, and each one
will look like coverage.

> **The rule: while P6-T9 is open, a refusal test must construct its refusal from state the
> test controls** — a suspended operator, the last holder of `manage_team`, a record already
> in a terminal status — **and never from `canWrite`.** Four agents building gates right now
> have been told this directly.

### 4.7.2 §11.2 is breached by hiding, at roughly fifteen sites

§11.2 is *"disabled in place with a reason, never hidden."* The prevailing pattern in the
codebase is the opposite, and it is always spelled the same way:

```tsx
{canWrite && status !== 'resolved' && (<Button …>Resolve ticket</Button>)}
```

Confirmed at `TicketDetailScreen.tsx:122-129, 264-268, 200` · `TicketsScreen.tsx:190, 228,
233` · `DisputesScreen.tsx:315` · `AdminTeamScreen.tsx:225, 439-443` ·
`AdminDataScreen.tsx:175-181` · `AdminWorkspaceScreen.tsx:178, 216` ·
`AdminCommunicationsScreen.tsx:109-116, 216` · `ContactCentreScreen.tsx:152-159` ·
`CorporateDetailScreen.tsx:348, 390` · `CorporateScreen.tsx:217-222, 244` ·
`DispatchScreen.tsx:341` · `InterventionsCard.tsx:62` ·
`SubscriptionsScreen.tsx:236-246`.

`TicketDetailScreen.tsx:122-129` is the canonical instance and deserves quoting, because
**it is the exact defect `commands/registry.ts`'s own header cites from legacy at `:4113`**
— written up as the reason the registry exists, and still live on the screen the registry
was meant to fix. An operator looking at a resolved ticket cannot see that resolving is a
thing this product does.

**Why hiding is the worse failure, stated plainly:** a disabled control with a reason
teaches the operator the rule. A hidden control teaches them the capability does not exist —
and they stop looking, which means the product never gets the bug report.

The contract is already implemented correctly in `components/table/rowActions.tsx`
(`disabled` + `reason` + `aria-describedby`) and honoured on nine surfaces, listed in the
audit. This is a conversion, not a design question: there is one right shape and it is
already in the tree.

**A third, smaller instance of the same family, fixed in passing:**
`ColumnLayoutPopover.tsx` computed `pinDisabled` from **three distinct conditions** — not
pinnable at all, column hidden, over the width budget — and rendered the operator none of
them. The toggle simply went grey. The refusal object `canPin` returns has carried
`wouldBe` and `budget` since it was written; nothing displayed either, and the only text in
the popover was a footnote about a different column. Now each branch names itself, in the
order the predicate tests them, so the sentence and the disabling cannot drift apart. The
existing ruling that the refusal sentence never states the pixel figure is preserved.

---

## 5. Blocked on the owner — nothing below is an engineering call

From `DECISIONS.md` § *AWAITING THE OWNER'S SIGNATURE* (seven live items):

| Item | What it blocks |
|---|---|
| **D15** — Management collapses 5 boards → 3 | The IA of Management. Holds Q-D16, Q-D18 and every per-board tile count. Product-owner and product-designer both say this is **first in sequence** |
| **Q4** — the 35 sub-tab permissions | All of RBAC. `AdminTeamScreen`'s hardcoded `ROLE_PERMISSIONS` (§2.2) is an engineer's guess at this answer and must not be wired until the real one lands |
| **Q-D16 / Q-D18** — tile counts, cumulative census | Support › Overview and Admin › Overview content. Held behind D15 |
| **§6.2 D-12** — categorical chart palette | `ReportStudio`'s `SERIES_COLORS` (§2.2). Designer recommends **decline**, ship small multiples |
| **§6.2 D-13** — elevation tier 0.5 | Minor; unblocks a control-internal surface |
| **§6.2 D-14** — inline field error red | Clause A ratify the border (no code change); clause B strike §10.4's fill MUST |
| **F-11** — Growth tables | §3.1. Explicitly *not* decided by D15 |

**Recommend putting D15 and Q4 in front of the owner this week.** Everything in
§1–§4 can proceed in parallel; none of it depends on either answer.

---

## 6. Sequence

**Wave 1 — go green (1–2 days).**
§1 items 2, 4, 6 (determinism, landmark, stale onboarding test). Ends with a
green suite except the two tests that §2.1 and §3.1 close.

**Wave 2 — close the seam (2–3 days).**
§2.1 — wire the 7 fixture importers to the clients that already exist.
§2.3 — wire `AdminActivityScreen` to `listAuditEntries`.
Kills failing test #1.

**Wave 3 — model what has no model (3–5 days).**
§2.2 — disputes, lost & found, contact centre, notification templates. One
`/mock-resource` run each: type, fixture, client, seam registration.
De-duplicate the city list into `fixtures/zones.ts` and decide `Zone` geometry.

**Wave 4 — the four states (2–3 days).**
§4.3 across 12 screens. Kills failing test #3. Screens from waves 2–3 arrive
with all four already wired, so this is only the retrofit.

**Wave 5 — copy and tokens (3–4 days, parallelisable per file).**
§4.2 for 32 files, then revert the hatch. §4.1 via `/token-audit` per file.
Widen the three guards in §4.5. **This is the wave that makes Arabic possible.**

**Wave 6 — the declared holes (sized after the owner answers).**
Reports › Dashboards view (kills failing test #5). Growth tables, pending F-11.
Live map, pending a ruling. RBAC, pending Q4. Arabic dictionary, after wave 5.

**Throughout:** every screen touched in waves 2–5 gets a `/verify-behaviour`
pass, because cohort B shipped with no behavioural tests at all.
