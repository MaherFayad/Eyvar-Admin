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

## Resumed (2026-09-15)

The owner said continue. The tree was re-measured before anything was touched, rather than
trusting the numbers recorded at the stop:

| Suite | At the stop | At the resume |
|---|---|---|
| `npm test` (frontend) | 5,658 passing, 25 failing / 13 files | 5,657 passing, **26 failing / 13 files** |
| `npm run typecheck` | 7 errors | 7 errors |

The count moved by one because the earlier figure was taken from a run that had not collected
`scripts/wp-gate.test.mjs`. The 26 are grouped into four disjoint file sets and handed to four
agents, with two further packages opened on trees that collide with nothing:

| Set | Failures | Package |
|---|---|---|
| `src/components/pages/**`, `src/screens/pages/**` | 4 + 2 pinned defects | WP-4.10 finish |
| `src/components/reports/**` | 7 (6 legality, 1 mode memory) + 1 typecheck | WP-8.0 part A |
| `src/screens/reports/**`, `src/data/clients/routes*` | 12 + 6 typecheck | WP-8.0 part B, incl. F-V2-82 |
| `src/i18n/**`, `src/commands/**`, `vitest.config.ts`, `scripts/wp-gate*` | 3 | WP-8.0 part C |
| `api/**` | — | WP-6.2c: audit-log writes, the F-V2-21 gap list, F-V2-38 |
| `.claude/**`, `.mcp.json`, `studies/` | — | WP-7.5: the interactive path, proved by a real spawn |

**WP-7.4 (the analyst frontend) was never built.** `src/screens/analyst/` holds `copy.ts` and
nothing else — the agent that had it was one of the five stopped. It is the largest remaining
gap and it is held back only because it needs `src/data/clients/routes.ts` and `src/i18n/ar/`,
which two running agents own.

## Where this stands (2026-09-15, end of the resume)

| Gate | Result |
|---|---|
| `npm test` (frontend) | **5,739 passing, 1 failing** — the failure is F-V2-83's flake, not analytics v2 |
| `npm run test:api` | **207 passing, 0 failing** |
| `npm --prefix agent test` | **137 passing, 3 skipped, 0 failing** |
| `npm run typecheck` | clean |
| `npm run typecheck:api` | clean — **a gate that did not exist this morning** (F-V2-88) |
| `npm run api:check` | clean, 377 endpoints |
| `npm run i18n:check` | clean, 7,491 keys, 0 `defaultValue` at ceiling 0 |
| `node --test scripts/wp-gate.test.mjs` | 10 passing |

Every one of the 26 failures the resume measured is closed. One analytics-v2 test remains
pinned: AC-1212, on the `duplicatePage` template-title question (F-V2-85), which is the
owner's to answer.

**What the day actually taught, in one line each:**

- Three separate defects shipped behind a green suite — the runner's MCP path, the `ask`
  schema, and an entire project outside every typecheck gate. In all three the tests asserted
  the *shape* of a thing rather than whether it worked.
- The one guard built to catch drift caught drift, the same day, by name (AC-1276 on RPT-6).
  It then turned out to cover everything except the path added last, which is now fixed too.
- Two orchestrator briefs were stale and both agents verified instead of complying.

**Still open, in the order the orchestrator would take them:** push aggregation into SQL
(the 50,000-row cap); make provenance a recorded fact rather than a derived one (F-V2-90);
a `manage_analytics` permission key, absent so anyone who can read analytics can write it;
the `DataTable` dialog race (F-V2-83); AC-1260 and AC-1262's entry points; and `A / B` typed
as a bare `ratio`, so revenue-per-trip loses its currency.

### Progress since the resume

All 26 failures the resume measured are closed, and the packages opened alongside them landed:

| Package | Outcome |
|---|---|
| WP-8.0a `src/components/reports/**` | 261 tests green. One real defect: a disabled option in an off group had lost its `aria-describedby` |
| WP-8.0c `src/i18n`, `src/commands`, vitest config | AC-74 gap closed; the gate is no longer collected by vitest; **CM-3 found to be a shared-layer defect, not residue** (F-V2-83) |
| WP-7.5 interactive analyst | `/analyst` proved by a real spawn. **Found the runner's MCP path defect** (see below) |
| WP-4.10 pages | 82 tests green. `rangeRefused` now visible; AC-1206 regression traced, not reverted |
| WP-8.0b `src/screens/reports/**` | 268 tests green. F-V2-82 rewritten against pages; the fourth view declared; `?pinTo=` read |
| WP-6.2c backend | 206 api tests. Audit writes land; **an `ask` job could never have succeeded** (F-V2-89); **api types were in no gate** (F-V2-88) |
| WP-3.5 unreachable features | 795 tests green; table-columns mode reachable and harness-proved, including RTL |

**The most serious find of the resume** was not in the failure list at all. `agent/mcp.json`
named the tool server by a path relative to the repo root, and the runner spawns with
`cwd: agent/sandbox` — so the MCP server would have failed to start on the runner's **first
real job**. 135 passing tests missed it because they assert the shape of the argv, never that
the path resolves. Fixed, with a guard confirmed to fail on the old value.

**Two briefs written by the orchestrator were stale**, and in both cases the agent verified
rather than complying: the six legality-hint failures were caused by WP-1.9, not by the v2
migration; and two of WP-3.5's four items were already done. Recorded because the pattern
matters more than either instance — a brief is a hypothesis, and this log has been wrong twice
in one day.

## Where this stopped (2026-09-11)

The owner called a halt. Five agents were stopped mid-task; their partial work is committed
and labelled below rather than reverted, because it contains real fixes — including the 409
data-loss repair.

**Suites at the stop:**

| Suite | Result |
|---|---|
| `npm test` (frontend) | **5,658 passing, 25 failing across 13 files** |
| `npm run test:api` | **188 passing, 0 failing** |
| `npm --prefix agent test` | **135 passing, 3 skipped, 0 failing** |
| `npm run typecheck` | **7 errors**, all in two test files |
| `npm run api:check` | clean, 377 endpoints |
| `npm run i18n:check` | clean, 0 `defaultValue` at ceiling 0 |

**What the 25 frontend failures are**, honestly:

- **4 are partial repairs stopped mid-edit** in `addBlockPicker`, `blockMenu` and `turnInto`.
  Two of those (AC-1206's turn-into pair) were **passing before** and regressed while
  `BlockMenu.tsx` was being restructured for the disabled-reason fix. This is a real
  regression introduced by stopping, not a pre-existing defect.
- **4 remain pinned `it.fails` DEFECT tests** — AC-1187 (twice), AC-1205, AC-1212 — the page
  defects WP-4.10 had not reached.
- **The rest** are the residue WP-8.0 was midway through: stale assertions in
  `legalityHint`, `window.control`, `localisedKeys`, plus `reports.mode.test.tsx`'s
  `listDashboards` block (F-V2-82, a genuine rewrite), `routes.test.ts`, `autorun`,
  `modeMemory`, `commands.test.tsx`, and `wp-gate.test.mjs` being collected by vitest when it
  is a `node --test` file.

**The one fix worth naming:** AC-1202 now passes — after a 409 conflict, the kept edit is
resent and persists. That was silent data loss, and it is repaired.

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
| WP-2.1…2.5 Chart surface | frontend-engineer | done — 4 new branches, KPI, legend buttons, View menu, brush; harness ALL PASS |
| WP-2.10 Wire annotations, seed the palette | frontend-engineer | running (orchestrator-opened) |
| WP-2.6 Rail v2 | frontend-engineer | done — formula field, segment picker, transforms, fixed comparison, 36 tests |
| WP-2.6b Measured-as, 2nd split, transform legality | frontend-engineer | done — 3 gaps closed, 106 tests |
| WP-2.7/2.8 Toolbar, export, library | frontend-engineer | done — overflow, PNG with tEXt provenance, library views; harness caught an invisible-line bug |
| WP-3.1/3.2/3.3 Funnel, retention, table | frontend-engineer | done — 82 tests, harness green; two features unreachable, see WP-3.5 |
| WP-1.9 Normalise at the entry points | mock-data-engineer | done — typecheck 52 to 7, test failures 32 to 21 |
| WP-8.0 Clear the migration residue | qa-engineer | running (orchestrator-opened) |
| WP-3.5 Wire the modes up | — | queued, blocked on WP-1.9 freeing report.ts |
| WP-4.2/4.3/4.4/4.5 Pages | frontend-engineer | done — 12 block views, editor, columns, index; coverage regression being repaired |
| WP-4.9 Page test coverage | qa-engineer | done — 24 → 82 tests, ports decided, **8 defects found** |
| WP-4.10 Fix the eight page defects | frontend-engineer | running (orchestrator-opened) |
| WP-5.1/5.2/5.3/5.4 Alerting client | frontend-engineer | done — inline composer, preview chart, feed, history; 41 tests + harness |
| WP-1.4b Formula unit fix | utilities-engineer | done — revenue-per-trip legal, both guards kept, RPT-19 seeded |
| WP-1.5 Serialiser | mock-data-engineer | done — v:2 wire, every v1 URL still decodes, 56 tests |
| WP-1.6a Resolver core | mock-data-engineer | done — pure core + fixture adapter, 52 tests |
| WP-6.4 Compiler | general-purpose | done — 14 saved reports equal the mock bucket for bucket; scale caveat below |
| WP-6.4b Compiler gaps | general-purpose | done — both wrong-number bugs closed, 16/19 reports equal the mock |
| WP-6.4c Server funnel, cohort, journey | — | queued (orchestrator-opened) |
| WP-6.6 Alerts and crons | general-purpose | done — 6 tables, 5 crons, 162 api tests |
| WP-6.7 Agent queue | general-purpose | done — acting-for cannot impersonate, unbacked numbers refused, 181 api tests |
| WP-6.4c Server funnel, cohort, journey | general-purpose | done — **all 19 saved reports equal the mock**, 186 api tests |
| WP-7.4 Analyst frontend | frontend-engineer | running |
| WP-7.1 MCP tool server | general-purpose | done — 20 tools, 84 tests, PII masking proved |
| WP-7.2 Runner | general-purpose | done — real spawns run; 135 agent tests |
| WP-7.3 Prompts and schemas | general-purpose | done — protocol prompt, 5 job templates, 5 schemas, 95 agent tests |
| WP-3.6 Seam violation in two tests | qa-engineer | done — both converted to the client seam, 19 tests kept |
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
| **F-V2-83** | **`commands.test.tsx`'s CM-3 is a real intermittent defect in the shared table layer, not analytics-v2 residue.** `RowActionMenuItem`'s `onSelect` (`src/components/table/rowActions.tsx:190`) opens a `ConfirmDialog` synchronously from inside a *controlled* `DropdownMenu` (`DataTable.tsx:1826`), so the menu's closing `DismissableLayer`/`FocusScope` cleanup can run after the dialog's layer registers. The dialog then never mounts: the losing run's DOM shows `body[data-scroll-locked="1"]` and a focus guard, but no `role="dialog"`. An operator suspending a captain from the row kebab sees the menu close and nothing happen | WP-8.0c | **Not fixed, deliberately.** A change to `DataTable`/`rowActions` lands on forty screens (CLAUDE.md), it is outside the analytics-v2 scope, and jsdom cannot settle portal-unmount ordering — it needs a Playwright harness. Recommended fix: defer the side effect out of the synchronous `onSelect`, into `DropdownMenuContent`'s `onCloseAutoFocus` or a microtask hop. **For the owner to schedule against the shared-layer owner** |
| **F-V2-84** | **The frontend failure count is not deterministic.** F-V2-83 fails roughly 3 runs in 5 in isolation and passed in the combined run. Any single-run figure for this suite — including the 25 recorded at the stop and the 26 recorded at the resume — carries one flake inside it | WP-8.0c | Recorded so that a later "one more failure than yesterday" is not mistaken for a regression. The fix is F-V2-83, not a retry loop |
| **F-V2-85** | **`duplicatePage` titles every copy `"<title> copy"`, including a draft made from a template.** Explicit Duplicate wants the suffix; a new page made from a template arguably does not — it is a new page, not a copy of one. This is a product decision, not a defect with an obvious fix, so no agent made it. It is what still blocks AC-1212 from fully passing | WP-4.10 | **Owner question.** The `?edit=1` half of AC-1212 is fixed and proven; the test stays `it.fails` with a comment naming this as the blocker |
| **F-V2-86** | **`ReportBuilder.tsx` never reads `?pinTo=`, so "add a report to this page" silently forgets the page.** `ReportPickerPanel.tsx:97` has been sending the parameter all along; the builder composes, saves through the ordinary dialog, and the operator returns to a page with nothing added. Not a missing feature — a half-built path where one end ships and the other does not | WP-4.10 | Handed to the reports-screens agent mid-run, as AC-1205. `builderPinTo.test.tsx` stays pinned until its side lands |
| **F-V2-87** | **A block's kebab is named after its type, not its title.** `BlockFrame.tsx` gives the frame and its menu the accessible name `pg.block.report.name` ("Report"), so two report blocks on one page present one identical name to a screen reader. An operator navigating by name cannot tell which block's menu they have opened | WP-8.0b | Open. The test that found it was scoped to document order and commented; the fix belongs with whoever next touches `src/components/pages/BlockFrame.tsx`. Cheap to fix, and it is a real a11y defect on a screen built this week |
| **F-V2-88** | **The `api/` project's types were in no gate, and had been broken for several commits.** `npm run typecheck` is `tsc -b --noEmit` on the root project, which does not include `api/`; `npm run test:api` is vitest, which does not typecheck; `npm run api:check` validates the endpoint contract only. So `api/_lib/handlers/catalogue.ts` built a `funnelCapabilities` without the `exclude` flag that `Measure` had made required, and nothing said so — through every "api clean" report this build has made, including the orchestrator's at the halt | orchestrator | **Fixed:** both errors closed, and `npm run typecheck:api` added so the project is gated from now on. The lesson is the one the build already knows in the drawn layer — a passing suite proves only what the suite checks |
| **F-V2-89** | **An `ask` result could never have been accepted.** The queue validated every kind against the `case-study` schema, so a genuine `AskResult` (`answer`/`findings`/`dataQuality`/`followUps`) was refused with 422 for missing `decision`/`headline`/`baseline`. The most common job kind was the one that could not complete | WP-6.2c | **Fixed:** `ask` gained its own schema, its own evidence check and its own renderer. Note the renderer lives in `api/_lib` because `src/data/types/agent.ts` has no `AskResult` type — closing that is the remaining half |
| **F-V2-90** | **Provenance is not first class.** `AgentToolCallEvent` carries no run record, so `ProvenancePanel` reconstructs which runs produced a finding by reading the `report` blocks saved on the result page. It works today and it is backwards: the product's central promise is *no number without a run*, and provenance is currently a by-product of how the answer happened to be stored rather than a fact recorded when the run happened. Delete or restructure the result page and the citation chain breaks | WP-7.4 | Open, **and the orchestrator rates this the most important open item after the SQL compiler.** A run id belongs on the tool-call event, in `src/data/types/agent.ts` and on the wire. Flagged in code comments at the derivation site |
| **F-V2-91** | **The §7.4 ninth-group fold is implemented and never exercised by a seeded report.** `FILLER_RIDER_CITIES` has 7 distinct cities and the fold needs 8; no other subject-stable dimension in the fixtures clears it either (driver.city 2, vehicleClass 2, rider.status 2) | WP-6.4e | **Deliberately not closed, and the reasoning matters.** This looks like F-V2-67 (the two chart hues nobody had drawn) but it is not the same risk. `dropoffByGroup` — the fold included — is **one exported function in `src/data/reporting/funnelSteps.ts`, imported by both the mock and the server**, so the fold cannot drift between them; it is covered by unit tests. What *could* drift was the subject→group lookup, which genuinely has two implementations (`subjectGroupsOf` in the mock, `computeFunnelGroupOf` on the server) — and RPT-22 now covers exactly that. Widening the rider fixtures to force a ninth city would ripple into unrelated screens tied to the current city distribution, and buy equality coverage of code that is physically shared |
| **F-V2-92** | **The frontend suite is flaky under its own parallel load, and the flaky set is not stable.** Three consecutive full runs failed 1, then 9, then 5 tests — and the *names* differed each time (`disputes` failed on two different cases in two runs; `modeMemory` and `communications` each appeared once). **Every one of them passes in isolation.** Two orphaned vite dev servers and a stray vitest worker, left by harness agents, accounted for part of the load; killing them took 9 down to 5 | orchestrator | Open. The dialog-shaped ones (`disputes`, `communications`, `commands`) are F-V2-83's Radix race, which load makes more likely. The rest (`autorun`, `modeMemory`) are timeout-marginal tests — `autorun` needs three sequential 350 ms auto-run debounces inside a 15 s ceiling. **The honest consequence: this suite cannot currently certify a clean run**, so "N failing" is a range, not a number. Fixing F-V2-83 and giving the debounce-chained tests explicit headroom is the path; raising the global timeout is not, because it would hide the race rather than remove it |
| F-V2-1 | D33 … D37 exist only as prose in `RULINGS.md`'s "Standing owner overrides", never as headed entries in `DECISIONS.md`, though the ID-namespace table says their text lives there | WP-0.1 | Backlog; not fixed in this build. The owner decides whether they get retroactive entries |
| F-V2-2 | Q-RB-3 (week start) and Q-RB-7 (alert cadence) are not in `docs/07-api/OPEN-QUESTIONS.md`; they live in `specs/06-report-builder.md`. D45 and D41 answer them but the spec still poses them | WP-0.1 | Fixed in WP-8.5 |
| ~~F-V2-30~~ | **Fixed in WP-6.4b** via a real live-window model (`live_to_bounds_json`, combined with `LEAST`), not a special case. `subscriptions.active` and `subscriptions.cancelled` do not equal the mock: the mock's liveness is a three-condition window (`startedOn`, `endsOn`, **and** `cancelledAt`), while `measure_sources.live_to_column` is a two-bound scheme that ignores an early cancellation. A cancelled subscription counts as active on the server | WP-6.4 | **WP-6.4b opened.** This is a wrong number, not a missing feature |
| ~~F-V2-31~~ | **Fixed in WP-6.4b.** A saved segment resolves against the seeded `segments` table and an unknown id refuses with `segment-not-found` rather than falling through to everyone. Was: the compiler treated a saved segment as a no-op, matching the mock's behaviour before WP-1.7 gave it a real lookup | WP-6.4 | **WP-6.4b**, once the `segments` table is seeded |
| ~~F-V2-51~~ | `src/data/config.ts` read `import.meta.env.VITE_DATA_SOURCE` unguarded, bypassing the `readEnv` helper the same file defines — whose own docblock says the module "must load under Vite, under Vitest, and under a bare Node script" and that "a throw here would take down every screen". Mock mode crashed under plain Node, which is how the MCP server runs | WP-7.1 | **Fixed by the orchestrator:** the line now uses `readEnv`, matching the file's stated contract |
| F-V2-58 | The exported PNG rendered with an invisible chart line and a black brush: the cloned `<svg>` goes into a standalone object-URL document with no access to the token custom properties or `chart.tsx`'s scoped overrides. **Unit tests could not have caught this** — jsdom has no canvas | WP-2.7 | **Fixed in the same package** by resolving `getComputedStyle` on the live svg and inlining every custom property into the clone. Kept here as the clearest case on this build for why a harness is mandatory |
| F-V2-59 | Two comparison controls reached the screen at once — `ChartToolbar` kept its inline `COMPARISONS` select while the rail added `ComparisonControl` — so `rb.control.compare` labelled two things and `builder.chrome.test.tsx` broke. **Caused by an incorrect orchestrator instruction**, not by either agent | orchestrator | Withdrawn. Design §1.4 puts it in `ChartToolbar`; the rail copy is being removed and `ChartToolbar` is adopting the tested component |
| F-V2-60 | The rules-table sparkline is fetched per row with a client-side `getReport` + `runReport`, because no endpoint returns a rolling reading list for a rule at rest | WP-5.2 | Works, but it is N requests for N rules. A data-model addition for the owner to weigh |
| F-V2-55 | **129 tests across 13 files fail with `query.groupBy is not iterable`.** Root cause is one design asymmetry, not thirteen bugs: `resolveReport` normalises its input, but `planQuery` and `serialiseReportQuery` do not, so any caller holding a v1-shaped query — a stored saved report, a hand-written test, a URL — crashes instead of migrating | WP-3.x | **Orchestrator's ruling: normalise at the entry points.** `planQuery` and `serialiseReportQuery` take a `ReportQuery` that may come from a URL or a stored v1 report; defending at the boundary is correct design and fixes 129 tests at the root instead of editing 13 files. **WP-1.9** |
| F-V2-56 | `resolveFunnel` has no case for `mode: 'sequential'`: called directly, bypassing the planner, it silently computes the same answer as `ordered` — a "best-effort stand-in", as its own comment says. Only `reports.export` reaches it that way today | WP-3.1 | **Ruling: a resolver must refuse, never approximate.** A silently-wrong funnel is the worst failure this product can have. **WP-1.9** adds the refusal; the agent was right not to mint a `ReportWarning` member unilaterally |
| **F-V2-70** | **After a 409 conflict, `Reload` never resends the kept edit.** `usePageEditor`'s autosave fires only on `[debouncedContent, editing]` and `reload()` changes neither, so the operator's edit stays on screen and is never persisted. Navigate away and it is gone, silently | WP-4.9 | **WP-4.10, first.** This is the silent data loss the coverage brief was written to catch, and it was caught only because the two fake-timer tests were finally written |
| F-V2-71 | `duplicatePage` spreads `...row` without touching `blocks`, so a duplicated page shares block **ids** with its source. `validatePage` treats id uniqueness as a rule, and any id-keyed operation can hit the wrong block | WP-4.9 | **WP-4.10** |
| F-V2-72 | The slash command (AC-1197) does not exist: no handler is wired, typing `/` does nothing | WP-4.9 | **WP-4.10** |
| F-V2-73 | Radix will not open a `DropdownMenuSub` whose trigger is disabled, so the disabled reasons written for "Move to column…" and "Turn into…" are unreachable — **a reason that cannot be read is hidden**, which is the rule it was meant to satisfy. `Move up`/`Move down` are also never disabled at the ends | WP-4.9 | **WP-4.10** |
| F-V2-74 | `applyBoardScope` computes `rangeRefused` and no block reads it, so a block that ignored the page's range looks identical to one that honoured it — an operator would believe the numbers share the page window | WP-4.9 | **WP-4.10** |
| F-V2-75 | `?edit=1` (template copies) and `?pinTo=` (save-and-pin) are written into URLs that nothing reads | WP-4.9 | **WP-4.10** |
| F-V2-66 | Annotations are built, tested and unreachable: `ReportBuilder.tsx` never passes `annotations`, `canAnnotate` or `onSaveAnnotation` to `ResultCanvas`, so no operator can see or add one | WP-2.4 | **WP-2.10** |
| F-V2-67 | `--chart-s7` and `--chart-s8` have never been drawn. No seeded report yields seven series, so the two hues D40 authorised — derived and contrast-checked by the token steward — are unexercised. Same for the stacked comparison outline (AC-1132): no stacked report has ≤2 series with a comparison | WP-2.1 | **WP-2.10** seeds both. A palette nobody has seen is not a palette that works |
| ~~F-V2-68~~ | AC-1131 demanded "a click on a mark fires the datapoint handler" for **every** chart type, which would reverse `ResultCanvas`'s standing ruling that the compound plot has no click-through — on six series, a click has no single answer, and §A12's anchor strip replaces it. The agent flagged it rather than reversing the ruling | WP-2.1 | **Fixed by the orchestrator:** AC-1131 restated to say what it was always for — the `INERT` proof — without demanding the click-through a ruling forbids |
| F-V2-69 | AC-1139's Shift+click isolate is not wired (the kebab's `Isolate` reaches the same outcome); AC-1147's label-density rule is implemented but untested | WP-2.2, WP-2.3 | **WP-2.10** |
| F-V2-64 | `QueryPanel`'s measure setter silently dropped the untouched measure ref's `aggregate` on every edit, so changing measure A quietly reset measure B's "measured as" | WP-2.6b | **Fixed in the same package.** A latent bug, found while building the control that made it visible |
| F-V2-65 | `plan.ts` referenced `rb.violation.illegalAggregate` from the moment `illegal-aggregate` landed, but no copy key existed anywhere — the violation would have rendered blank | WP-2.6b | **Fixed in the same package** |
| F-V2-61 | `api/_lib/handlers/reportsSubjectShared.ts` **reimplements** the mock's private helpers (`earliestPerSubject`, `groupBySubject`, `latestPerSubject`, `mergeLatest`) because `src/` exports none of them — the one place on this build where the server has a second copy of logic rather than sharing it | WP-6.4c | Tolerable only because AC-1276's equality test covers every path through them. The right fix is to export them from `src/` and import; if that equality test is ever weakened, this becomes a drift hazard |
| F-V2-62 | Funnel `exclude` is implemented nowhere: `plan.ts` refuses it unconditionally with no capability flag to gate it, unlike `sequential` and `holdConstant` | WP-6.4c | **WP-1.9.** The UI disables it with a reason, the server never sees it, so the feature does not exist end to end |
| F-V2-63 | `sequential` and `holdConstant` semantics are this work package's own design — there is no mock to equality-test against, only hand-checked tests with the arithmetic in the test name. Driver-kind cohorts are implemented but exercised by no fixture | WP-6.4c | Documented in `reportsFunnel.ts`'s header. The owner should read those two definitions and confirm they match the business meaning |
| F-V2-57 | AC-1170's median-time-to-next-step is not built. It was attempted as extra wire series and reverted because it broke the existing "one series per rung" contract | WP-3.1 | **WP-3.5**, under the same ruling as F-V2-49: extend `ReportResult`, one run, one `runId` |
| ~~F-V2-52~~ | **Fixed in WP-3.6** by converting both to fetch the catalogue through `listMeasures`/`listDimensions`, the way the real callers do; no assertion changed and both counts held. Was: two new test files imported fixtures directly, breaking the seam guard that 200 other test files obey. A test reaching past the client seam stops proving the screen works through the seam it ships with | WP-3.3 | **WP-3.6 opened.** The rule is not being exempted for tests |
| F-V2-53 | The agent's compiled output cannot run under plain Node: `src/` uses extensionless imports, legal under bundler resolution and illegal under Node's ESM loader | WP-7.1 | **WP-7.2** bundles with esbuild rather than emitting per file |
| F-V2-54 | T19 `note_finding` keeps findings in a local module map because `src/data/clients/agent.ts` has no `noteAgentFinding`; T3's glossary is a hand-written starter set, not generated, even though WP-6.3 built a real generator in `api/_lib/glossary.ts` | WP-7.1 | Both for phase 7 follow-up; the glossary should read the generator rather than duplicate it |
| F-V2-46 | `plan.ts`'s `COMPUTED_COHORT_GRAINS` is still `['month']`, so the day and week cohort engines WP-3.2 built and tested are unreachable from the product. Same for `MODE_FIXES_GRAIN_TO_NONE`, which must become a function of `measuredAs` before the funnel grain control unlocks | WP-3.2 | **WP-3.5.** Built-but-unreachable is indistinguishable from not built, from an operator's seat |
| F-V2-47 | `ResultTableColumns` (the whole `TableSpec` columns mode, AC-1174 … AC-1178) has **no live caller** — table mode still renders through the old series path. Built, tested, unreachable | WP-3.3 | **WP-3.5** wires a columns editor and a resolver leg per column |
| F-V2-48 | No `cohort-brackets-overlap` violation code exists, so overlapping brackets are refused in the client but not on the wire — the same hand-edited-URL hole as the transforms | WP-3.2 | **WP-3.5** |
| F-V2-49 | AC-1170's grouped drop-off table is a shell: the mock has no per-group-per-rung series, and the agent declined to choose the wire shape alone | WP-3.1 | **Orchestrator's ruling for WP-3.5: extend `ReportResult`, do not issue a second query.** One run means one `runId`, and provenance depends on a finding citing a single run that produced its numbers |
| F-V2-50 | Pre-existing a11y defect in `ReportModePanel.tsx`: "Add a step"'s `<label for>` shares an id with the button, so its accessible name is silently "Steps". Found while fixing the same defect in the new Exclude section | WP-3.1 | **WP-3.5**, or WP-8.1's accessibility pass |
| F-V2-43 | The pages package deleted `dashboard.depth`, `dashboard.chrome`, `dashboards` and `pinnedShape` test files (49 tests) and wrote 24, reporting the content as moved. It was not: a net loss of 25 tests, against an explicit instruction to move and rename rather than delete | WP-4.2 | **WP-4.9 opened.** Every guarantee that survives the rename — recess depth, D33/D34 surfaces, chrome, the report block's five states, the pinned shape — is ported back. Genuinely tile-specific tests stay dropped, named |
| F-V2-44 | Roughly twenty acceptance criteria across pages were built and harness-proven but never unit-tested, including AC-1201/AC-1202 — the autosave debounce and the 409 conflict that must keep an operator's edits. A conflict that discards edits is silent data loss | WP-4.2 | **WP-4.9**, with fake timers |
| ~~F-V2-45~~ | AC-1209's text ("twelve-column at 1344, stacked at 1280") predates ruling O1, which moved `--ev-bp-wide` to 1280. Since `wide:` is inclusive from 1280 and 1280 is the product's supported floor, the stacked case is unreachable on any supported viewport | WP-4.2 | **Fixed by the orchestrator:** AC-1209 restated against the current token, with the stacked case proven at 1279 and marked unreachable in support |
| F-V2-39 | Transform legality lived only in `TransformControls.tsx`: `plan.ts` had no violation code for "cumulative needs additive", "percent-of-total needs a split" or "rolling average needs more buckets". A hand-edited URL carrying an illegal transform was not refused — and this product's URL is lossless by design, so that is a real path | WP-2.6 | **WP-2.6b.** Codes move into the planner and the control renders the planner's reason |
| F-V2-40 | `Measured as` (gap G1, the Amplitude-parity row) is implemented nowhere: the type exists, no fixture measure populates `bucketAggregateOptions`, and the rail has no control | WP-2.6 | **WP-2.6b** |
| F-V2-41 | The second split level (gap G4) has no UI. The resolver folds per level and two-level series ids are tested, but the rail offers one dimension only | WP-2.6 | **WP-2.6b** |
| F-V2-42 | Two controls in the segment popover share the accessible name "Add segment" — the trigger and the submit — because the design spec's copy table gives both that label | WP-2.6 | WP-8.1's accessibility pass, with content-designer for the wording |
| F-V2-38 | Agent result validation is full-depth for `case-study` and `build-page` only; `ask`, `triage-alert` and `weekly-review` are not validated to the same depth **on the server** | WP-6.7 | **Half closed:** WP-7.3 wrote schemas for all five kinds (`triage` and `review` are deliberately the case-study shape). The server should now validate against them too — otherwise the guarantee holds at the runner but not at the queue |
| F-V2-36 | On Hobby the hourly cron cannot deploy. If an operator removes that entry, an hourly rule's `lastEvaluatedAt` is simply never advanced — nothing fabricates it — so the rule reads as growing evaluation lag rather than as armed and healthy | WP-6.6 | Correct behaviour: the degradation is visible, not silent |
| F-V2-37 | Housekeeping decides whether a `report_run` is still referenced by text-scanning `pages.blocks_json` for the run id, because the case-study citation block shape belongs to the agent work package | WP-6.6 | Revisit once WP-6.7 lands the real citation shape; a text scan over-retains rather than deleting a cited run, which is the safe direction |
| F-V2-33 | `src/data/clients/dashboards.ts` could not simply be deleted: three screens import it and a missing module is a Vite resolve crash, not a type error, which took `routes.test.ts` and `seam.test.ts` down with it. The CRUD is gone; the file survives holding only the pure board-scope maths | WP-1.7 | Accepted. The importing screens move to `pages.ts` in phase 4, and the file goes then |
| F-V2-34 | `Page.starredBy` is absent from `03-pages-and-dashboards.md` §2's model even though §7 promises a starred toggle and `05-backend.md` declares `POST /pages/:id/star`. Minted by extension to unblock a documented endpoint | WP-1.7 | Spec gap, resolved by extension; for the owner to confirm |
| F-V2-35 | `cancelAgentJob` is not implemented: `AgentJobState` has no `cancelled` member. Flagged rather than minted, because a cancelled job is a state the runner and the schema must both agree on | WP-1.7 | Phase 7 decides |
| ~~F-V2-32~~ | **Closed in WP-6.4c.** All 19 saved reports are now inside AC-1276's equality loop, none excluded. Was: funnel, cohort and journey were not compiled: the server answers `mode-not-resolved`. RPT-6, RPT-7 and RPT-8 are the only saved reports still outside AC-1276's equality test | WP-6.4 | **WP-6.4c opened.** Without it, three of the five report modes do not work against a real server |
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
