# Analytics v2 — build log

Branch `analytics-v2`, started from `71ddfac` on 2026-09-11. The orchestrator keeps this file;
implementing agents do not edit it.

## Deviations from 06-execution-plan.md, and why

| Plan said | What is being done | Why |
|---|---|---|
| One branch per work package | One branch, `analytics-v2`, for the whole build | The orchestrator runs the packages itself and merges nothing; per-WP branches would buy isolation that the allowed-file lists already give |
| Four worktrees for P2, P4, P5, P6 | One tree, with concurrent agents restricted to disjoint file sets | Worktrees on Windows need a `node_modules` junction and break the main tree's dep cache (memory `worktree-agents-windows`); the risk of that outweighs the isolation, given the file sets are disjoint by construction |
| A handoff document per work package | Each agent reports to the orchestrator; this log records the outcome | The handoff chain exists to move work between sessions; there is one session |

Everything else in the plan stands, including every gate.

## Status

| WP | Owner | State |
|---|---|---|
| WP-0.1 Decisions | product-owner | done (rerun) — D38…D46 headed entries + 9 RULINGS rows, every citation verified |
| WP-0.2 WP gate | utilities-engineer | done — gate + 62 manifests, 10 tests green |
| WP-0.3 Tokens | design-token-steward | done — s7/s8 in both themes, block heights, heat ramp, contrast harness green |
| WP-0.4 Copy skeletons | i18n-arabic-engineer | done — pg.* (7 keys), an.* (16 keys), both registered |
| WP-0.5 Design notes | product-designer | done — design/22-analytics-v2.md, every control specced |
| WP-1.1 Types | mock-data-engineer | done — v2 unions + 5 new type modules; 121 downstream compiles broken by design |
| WP-1.3 Buckets, transforms | utilities-engineer | done — quarter grain, 4 presets, 5 transforms, 114 tests |
| WP-1.2 Formula | utilities-engineer | done — parser, units, evaluator, 95 tests; CUMSUM reconciled with transforms |
| WP-1.6b Stats, anomaly | utilities-engineer | done — describe/correlate/contribution, MAD band, 27 tests |
| WP-1.6d Pages, case study | mock-data-engineer | done — validator, migration, caseStudyToBlocks, 45 tests; provenance follow-up in flight |
| WP-1.4 Planner | mock-data-engineer | done — v2 legality, NEAREST, formula violations, 33 new tests |
| WP-1.8 Fixtures | mock-data-engineer | done — v2 migration, 6 new fixture files, AC-1290 table, 61 typecheck errors left (all in reports screens) |
| WP-1.7 Clients | mock-data-engineer | done — 5 new clients, 377 endpoints, contract clean. **Phase 1 closed** |
| WP-2.1/2.2/2.3/2.4/2.5 Chart surface | frontend-engineer | running |
| WP-2.6 Rail v2 | frontend-engineer | running |
| WP-2.7/2.8 Toolbar, export, library | frontend-engineer | running |
| WP-3.1/3.2/3.3 Funnel, retention, table | frontend-engineer | running |
| WP-4.2/4.3/4.4/4.5 Pages | frontend-engineer | running |
| WP-5.1/5.2/5.3/5.4 Alerting client | frontend-engineer | running |
| WP-1.4b Formula unit fix | utilities-engineer | done — revenue-per-trip legal, both guards kept, RPT-19 seeded |
| WP-1.5 Serialiser | mock-data-engineer | done — v:2 wire, every v1 URL still decodes, 56 tests |
| WP-1.6a Resolver core | mock-data-engineer | done — pure core + fixture adapter, 52 tests |
| WP-6.4 Compiler | general-purpose | done — 14 saved reports equal the mock bucket for bucket; scale caveat below |
| WP-6.4b Compiler gaps | general-purpose | done — both wrong-number bugs closed, 16/19 reports equal the mock |
| WP-6.4c Server funnel, cohort, journey | — | queued (orchestrator-opened) |
| WP-6.6 Alerts and crons | general-purpose | running |
| WP-1.6c Alert evaluator | mock-data-engineer | done — 4 condition kinds, 5-state machine, 40 tests |
| WP-4.1 Markdown | utilities-engineer | done — parse+render, 151 tests, no dangerouslySetInnerHTML |
| WP-6.1 Backend scaffold | general-purpose | done — api/ project, router, envelopes, migrations, 5 tests |
| WP-6.2 Auth and sessions | general-purpose | done — sessions, permissions, idempotency, 36 tests |
| WP-6.2b Team and sign-in outcomes | general-purpose | done — 72 api tests; gap list below |
| WP-6.5 Reports, segments, annotations, pages | general-purpose | done — 122 api tests, 409 proved with two concurrent writers |
| WP-6.3 Catalogue | general-purpose | done — full Measure schema, generated glossary, 44 api tests |

## The one finding that needs a decision before production

**The compiler aggregates in Node, not in SQL.** WP-6.4 chose to fetch matching rows
(capped at 50,000 per leg) and then call the *same* `resolveTrendLeg` / `resolveFormulaLeg`
the mock calls, rather than emit `GROUP BY` SQL. SQL does population resolution, filtering
and the row cap; everything after that is shared code.

**Why it is a good decision for now:** it makes server-versus-mock divergence structurally
impossible rather than merely tested. The fold's tie-break, the mean's rounding, gap handling
and partial-bucket marking cannot drift, because there is exactly one implementation. That is
why 14 saved reports come back equal to the mock bucket for bucket.

**Why it cannot ship to production as-is:** a ride-subscription business writes far more than
50,000 trips in any window an operator would report on. Past the cap every leg returns
`truncated: true` — marked, not silent, but a truncated answer is not an answer. Aggregation
has to move into SQL before real volumes, and at that point the equality test becomes the
thing that keeps the SQL honest.

**Recommendation:** keep it for the preview deployment, and treat "push aggregation into SQL,
with AC-1276 as the guard" as the first production work package. Do not raise the row cap
instead; that trades a marked wrong answer for an unmarked slow one.

## Findings raised during the build, for the owner

| # | Finding | Raised by | Disposition |
|---|---|---|---|
| F-V2-1 | D33 … D37 exist only as prose in `RULINGS.md`'s "Standing owner overrides", never as headed entries in `DECISIONS.md`, though the ID-namespace table says their text lives there | WP-0.1 | Backlog; not fixed in this build. The owner decides whether they get retroactive entries |
| F-V2-2 | Q-RB-3 (week start) and Q-RB-7 (alert cadence) are not in `docs/07-api/OPEN-QUESTIONS.md`; they live in `specs/06-report-builder.md`. D45 and D41 answer them but the spec still poses them | WP-0.1 | Fixed in WP-8.5 |
| ~~F-V2-30~~ | **Fixed in WP-6.4b** via a real live-window model (`live_to_bounds_json`, combined with `LEAST`), not a special case. `subscriptions.active` and `subscriptions.cancelled` do not equal the mock: the mock's liveness is a three-condition window (`startedOn`, `endsOn`, **and** `cancelledAt`), while `measure_sources.live_to_column` is a two-bound scheme that ignores an early cancellation. A cancelled subscription counts as active on the server | WP-6.4 | **WP-6.4b opened.** This is a wrong number, not a missing feature |
| ~~F-V2-31~~ | **Fixed in WP-6.4b.** A saved segment resolves against the seeded `segments` table and an unknown id refuses with `segment-not-found` rather than falling through to everyone. Was: the compiler treated a saved segment as a no-op, matching the mock's behaviour before WP-1.7 gave it a real lookup | WP-6.4 | **WP-6.4b**, once the `segments` table is seeded |
| F-V2-33 | `src/data/clients/dashboards.ts` could not simply be deleted: three screens import it and a missing module is a Vite resolve crash, not a type error, which took `routes.test.ts` and `seam.test.ts` down with it. The CRUD is gone; the file survives holding only the pure board-scope maths | WP-1.7 | Accepted. The importing screens move to `pages.ts` in phase 4, and the file goes then |
| F-V2-34 | `Page.starredBy` is absent from `03-pages-and-dashboards.md` §2's model even though §7 promises a starred toggle and `05-backend.md` declares `POST /pages/:id/star`. Minted by extension to unblock a documented endpoint | WP-1.7 | Spec gap, resolved by extension; for the owner to confirm |
| F-V2-35 | `cancelAgentJob` is not implemented: `AgentJobState` has no `cancelled` member. Flagged rather than minted, because a cancelled job is a state the runner and the schema must both agree on | WP-1.7 | Phase 7 decides |
| F-V2-32 | Funnel, cohort and journey modes are not compiled: the server answers `mode-not-resolved`. RPT-6, RPT-7 and RPT-8 are the only saved reports still outside AC-1276's equality test | WP-6.4 | **WP-6.4c opened.** Without it, three of the five report modes do not work against a real server |
| F-V2-28 | There is no `manage_analytics` permission key. Every analytics write the server accepts — saving a report, editing a page, creating an annotation, arming an alert — is gated on `view_analytics`, so anyone who can read analytics can write it. `PermissionRef.level` (`full`/`read`) exists but D17 deprecated it; navigation carries a bare `PermissionKey` | WP-6.5 | **Open, the owner's call, and it is a product decision not a bug.** The existing product gates nothing finer, so the server is faithful to today's behaviour rather than introducing a regression. Minting the key touches the RBAC union, every role fixture, the settings permission matrix and `navigation.test.ts`'s parity assertion, so it is not a change to make unilaterally mid-build |
| F-V2-29 | `api/_db/migrate.mjs` is plain `.mjs` and cannot import the TypeScript `dashboardToPage`, so the dashboard-to-page migration is written and tested but not wired into `npm run db:migrate`. It is moot today: no `dashboards` table exists in Postgres, a v1 dashboard lives only in frontend fixtures | WP-6.5 | Guarded and idempotent; wires up the day a dashboards table exists |
| F-V2-27 | `02-report-builder-v2.md` §2.2 types `A / B` as `ratio` unconditionally, so revenue per trip renders as a bare number with no currency — an operator sees `23.4`, not `SAR 23.40`. Built to the plan, because D42 was signed with that table | WP-1.4b | **Open, the owner's call.** Money divided by a count is money per unit; carrying the currency would read better and cannot mislead. Changing it means amending §2.2, `formulaUnit` and its tests |
| F-V2-24 | `plan.ts` applies the raw-pair `mixed-unit` refusal to a query that carries a formula, so `revenue.total / trips.completed` — revenue per trip, an obvious business metric — is refused. The fixture was changed to same-unit measures rather than seed an illegal saved report | WP-1.8 | **WP-1.4b opened.** A formula's unit is `formulaUnit`'s to decide; the raw-pair check must not also apply |
| F-V2-25 | Type gaps found by seeding real data: `AlertFiring` has no `deliveries[]` or `band` (04 §5), `Page` has no `template` flag, and there is no `AgentRunner` type at all | WP-1.8 | WP-1.7 mints all three; states 24 and "runner offline" cannot be drawn until then |
| F-V2-26 | Alert evaluation lag (state 28) is unreachable from any fixture: every seeded rule has `cadence: null` by design, and lag is only detectable against a known cadence | WP-1.8 | WP-1.7/WP-5.2 seed a rule with a cadence once the client supports it |
| F-V2-21 | WP-6.2b left a named gap list: role CRUD and `changeRole`/`holdersOf`, session listing and revocation, device listing, `listOperators`/`listInvites`, preferences, `releaseHoldingsOf`, and a transport rate limiter. None blocks analytics v2 | WP-6.2b | **WP-6.2c** opened for the remainder, after the analytics phases |
| F-V2-22 | Audit-log persistence is not wired: the clients' `writeAudit`/`appendAudit` run and refuse correctly but record nothing, so Activity Log playback would be empty. WP-6.1 did create the `audit_log` table in `0001_analytics.sql`, so the table exists and only the writes are missing | WP-6.2b | **WP-6.2c.** Raised because an operations console that cannot say who changed what is a real gap, not a cosmetic one |
| F-V2-23 | WP-6.2b added a five-attempt password lockout the mock never had, because the mock shows a static locked fixture with no trigger, and stamps `lockedUntil` once rather than recomputing it on every read (the mock's version would never expire) | WP-6.2b | Accepted: the mock's behaviour is a fixture artefact, not a specification |
| F-V2-18 | Saved segments (`kind: 'saved'`) resolve to "everyone": no segments client or fixture store exists yet. A report using one silently shows unsegmented numbers | WP-1.6a | WP-1.7 creates the client and WP-1.8 the store; the mock adapter wires them. **Must not ship unwired** — silently wrong numbers are worse than a refusal |
| F-V2-19 | `PerformedSpec.window`'s `each-bucket` versus `{rollingDays}` is evaluated over the whole report window, not per bucket | WP-1.6a | Deferred, documented in the function. No AC covers it |
| F-V2-20 | Multi-segment series ids carry a `#seg<n>` suffix because `ReportSeries` has no `segmentLabel` field | WP-1.6a | WP-1.7 adds the field if the legend needs a real label |
| F-V2-16 | `AlertEvaluation.outcome` had no slot for `no-baseline` or `invalid-condition`, so the client folded both into `no-complete-bucket` — which would have shown an operator "no complete bucket" when the real reason was too little history | WP-1.6c | **Fixed by the orchestrator.** Union widened in `types/alert.ts`, stopgap removed in `clients/alerts.ts`; a refusal now carries its own reason to the composer (AC-1230) |
| F-V2-17 | `relative` with `against: 'previous-period'` reads the report's own aligned comparison series rather than an index offset, because a bucket index cannot legally offset past its own array | WP-1.6c | Accepted as the modelling call; the server cron must read the same way |
| F-V2-14 | `measure_sources` is seeded empty: it names the real operational tables, which `05-backend.md` §11 item 1 lists as still the owner's to supply | WP-6.3 | The compiler (WP-6.4) points `measure_sources` at tables seeded from the frontend fixtures, which is what makes the mock-versus-server equality test possible. In production the owner remaps those rows; nothing else changes |
| F-V2-15 | `coverage_from`/`coverage_to` are TEXT, not DATE: every driver behind the `Database` seam parses a DATE into a JS `Date`, which round-trips differently depending on the reading timezone, while `MeasureCoverage` holds plain ISO strings | WP-6.3 | Accepted, and the right call for a product pinned to Riyadh time |
| F-V2-12 | The log-axis refusal ("a series that crosses zero") cannot live in `planQuery`: it needs resolved values, which do not exist before a query runs, and `Measure` has no static "can go negative" field | WP-1.4 | Correctly deferred to WP-2.3, which owns the chart view controls |
| F-V2-13 | `TableSpec` column and row bound-checking has no violation code named in the plan, so the planner did not invent one | WP-1.4 | WP-3.3 owns the data table; it mints the code if one is needed |
| F-V2-10 | `05-backend.md` §3's `users` table has no columns for the team surface the frontend clients already declare — invite, resend, revoke, suspend, reinstate, offboard, permission overrides, the F-016 last-holder guard — nor for the richer `SignInOutcome` union (2FA, TOTP enrolment, device trust, reset, invite activation). WP-6.2 correctly built only what the doc specified | WP-6.2 | **WP-6.2b opened** to finish the surface against the client docblocks, with its own migration |
| F-V2-11 | Passwords hash with scrypt from `node:crypto`, not argon2id, to avoid a native dependency. Swapping is a two-function change in `api/_lib/password.ts`, not a schema change | WP-6.2 | Accepted |
| F-V2-9 | `reports.ts` holds only 10 distinct saved queries, so WP-1.5's 20 v1-URL compatibility fixtures are 10 captured and 10 recombined from field values that each appear somewhere real. Whether the product should seed more genuine saved reports is a product question | WP-1.5 | Logged; WP-1.8 may add fixtures, and the file labels which is which |
| F-V2-6 | `caseStudyToBlocks` could not satisfy AC-1129/AC-1253: a `report` block needs a `reportId` that only exists after the runner saves a chart (T13), and `page.ts` has no `provenance` block type | WP-1.6d | **Resolved.** No new block type: `agent-insight` already carries `runIds` and is the provenance carrier. `caseStudyToBlocks` takes an optional `chartReportIds` map so the runner hands in saved ids; a finding with an id gets a report block followed by its `agent-insight` footer, one without degrades to today's output |
| F-V2-7 | The plan's page rule "order is an integer" has no counterpart in `page.ts` — order is array position | WP-1.6d | Stale plan line, not a type gap. No `order` field added |
| F-V2-8 | `dashboardToPage` sets `title` from `pinnedName` for every tile (not only dangling ones, since a pure function cannot know which are dangling) and defaults migrated pages to `visibility: 'team'` | WP-1.6d | Accepted as the agent's call: a migrated block showing the pinned name beats a blank one, and `team` preserves a dashboard's existing audience |
| F-V2-4 | The plan does not say what a rolling average does when its window contains a gap. WP-1.3 implemented the strict reading: any gap in the trailing window makes the bucket `null`. That never misleads, but one gap blanks N buckets on an N-bucket average. The alternative is to average the non-null values with a minimum count | WP-1.3 | **Open, the owner's call.** The conservative behaviour ships until it is answered |
| F-V2-5 | `ReportPreset` in `src/data/types/report.ts` does not declare `this-quarter`, `last-quarter`, `this-year`, `year-to-date`. WP-1.3 typed against a local `ReportPresetV2` superset in `buckets.ts` rather than edit another WP's file | WP-1.3 | WP-1.4 folds the four literals into `ReportPreset` and `REPORT_PRESETS` |
| F-V2-3 | `MARKDOWN_MESSAGES_EN`'s `markdown.truncated` is not registered in `src/i18n/dictionaries.ts` and has no Arabic entry, so `renderMarkdown`'s truncation notice throws in dev | WP-4.1 | WP-4.2 registers it when it wires `TextBlock` |

## Incident: the stash of 2026-09-11

An agent ran `git stash` to compare a file against `HEAD`, hit a conflict on `git stash pop`,
recovered only its own three files and dropped the stash. Dropping it destroyed every
**tracked-file** edit then in flight across four other agents. Untracked new files survived,
because a plain `git stash` does not take them.

Lost and restored: the `docs/README.md` row, the two dictionary registrations
(`src/i18n/dictionaries.ts`, `src/i18n/ar/index.ts`), the `wp:gate` line in `package.json`,
and D38 … D46 in `DECISIONS.md` and `RULINGS.md` (rerun from scratch).

Two changes came out of it:

1. `AGENT-BRIEF.md` now forbids `git stash` outright and points at `git show HEAD:path`, which
   reads a committed file without touching the working tree.
2. The orchestrator commits a checkpoint after every batch, so the blast radius of any future
   accident is one batch rather than the whole build.
