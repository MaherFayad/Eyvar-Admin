# Analytics v2 — the plan

> **Status:** built. D38 … D46 are signed and live in `docs/05-restructure/DECISIONS.md`;
> the work packages are recorded in `BUILD-LOG.md`, which is the honest account of what
> shipped, what was deliberately left, and what still needs an owner decision.
> **Scope:** four asks from the owner, in one plan because they share one query model:
>
> 1. An **analyst agent** inside the product, with tools for reporting, charts, pages and
>    alerts, able to reason and write case studies that inform business decisions, running on
>    the owner's **Claude Code subscription** (print mode), never on an API key.
> 2. The **report builder and charts** brought to Amplitude fidelity: what can be measured,
>    compared, segmented, transformed and drawn.
> 3. **Dashboards become pages**: a Notion-like block document that holds charts, tables,
>    metrics, text and agent findings.
> 4. **Alerting** rebuilt as monitors: static, relative and anomaly conditions, evaluated on a
>    server schedule, delivered to channels, with a history and a feed.
>
> Everything must run as a static frontend on Vercel, with a backend that is also hostable on
> Vercel and documented for whoever builds it.

## How to read this folder

| File | What it settles | Who reads it |
|---|---|---|
| [00-README.md](00-README.md) | This index; the non-negotiables; the decisions the owner must sign; the numbering | everyone, first |
| [01-analyst-agent.md](01-analyst-agent.md) | The agent: where it runs, how it is invoked, every tool, the reasoning protocol, the output schemas, the guardrails | agent-runner builder, MCP builder, frontend-engineer for the analyst view |
| [02-report-builder-v2.md](02-report-builder-v2.md) | Query model v2, result v2, the chart catalogue, the toolbar and rail, the Amplitude gap list with a disposition for each row | mock-data-engineer, frontend-engineer, product-designer |
| [03-pages-and-dashboards.md](03-pages-and-dashboards.md) | The Page and Block model, the renderer, the editor, migration from tiles, templates | mock-data-engineer, frontend-engineer, product-designer |
| [04-alerting-v2.md](04-alerting-v2.md) | Monitor conditions, the evaluator, channels, the feed, history and audit | mock-data-engineer, frontend-engineer, backend |
| [05-backend.md](05-backend.md) | Hosting on Vercel, database schema, the measure compiler, cron jobs, auth, the agent job queue, every new endpoint | backend engineer, api-contract-steward |
| [06-execution-plan.md](06-execution-plan.md) | Phases, work packages, owners, allowed files, commands, done criteria, the gates that stop a bad agent | the orchestrator and every implementing agent |
| [07-acceptance-criteria.md](07-acceptance-criteria.md) | AC-1100 … AC-1299, one test each | qa-engineer, visual-qa-engineer |

`CLAUDE.md` is still loaded first. Nothing here overrides it. Where this plan and an existing
spec conflict, the conflict is named in the file and resolved by one of the decisions below;
until the owner signs that decision the existing spec wins.

## What is already built, so nobody rebuilds it

Read before designing anything. Line references are to commit `71ddfac`.

| Already there | Where | Consequence for this plan |
|---|---|---|
| A query model with five modes (`trend`, `funnel`, `table`, `cohort`, `journey`), a legality planner, URL serialisation, a measure catalogue with temporality, additivity, `minGrain`, dimensions, filterable fields and permission | `src/data/types/report.ts`, `src/data/types/measure.ts`, `src/data/reporting/plan.ts`, `src/data/reporting/serialise.ts` | v2 **extends** these types. No parallel model. Every addition is a field with a default so v1 URLs still deserialise |
| Auto-run with a 350 ms debounce, mode memory, `askedOf` stripping `chartType` so a redraw costs no request | `src/screens/reports/ReportBuilder.tsx:271`, `:332`, `:537` | Keep. New view-only options (legend isolate, log axis, data labels) must also cost no request |
| `SeriesChart` with six hues (`--chart-s1…s6`), dashed comparison in the same hue, a ranked all-series tooltip, a hand-rolled SVG legend, `INERT` on every mark | `src/components/reports/SeriesChart.tsx:111`, `:119-135`, `:542-616` | Area, stacked, 100 %, horizontal and KPI are new branches of this file, not a new chart component. `INERT` stays; a harness proves every new mark |
| Saved reports, dashboards as ordered report tiles with `span: 'half' \| 'full'`, board scope (`range`, `filters`) applied per tile with refusal | `src/data/clients/dashboards.ts:323-422`, `src/screens/reports/DashboardDetailScreen.tsx` | Pages keep board scope unchanged; a tile becomes a `report` block; the migration is a pure function |
| Alert rules with the five-state machine, a foreground `Test this rule`, seeded firing rule and history | `src/data/clients/alerts.ts`, `src/data/types/report.ts:752-872` | v2 adds condition kinds and channels; the state machine is unchanged and the server implements it |
| The notification centre as the alert delivery surface; alerts never touch nav badges | spec 06 §12.5–§12.6 | Unchanged |
| The `DATA_SOURCE` seam, `?mockFail=`, `registerOperations`, the endpoint docblock the contract extractor parses | `src/data/config.ts`, `scripts/extract-api-contract.py` | Every new client function follows the same shape or it does not exist to the backend |
| Edit gate (tokens, logical utilities, focus, `defaultValue`, em dash), `i18n:check` with a `defaultValue` ceiling of 0, `api:check`, harnesses on port 4327 | `scripts/edit-gate.mjs`, `scripts/i18n-inventory.py`, `scripts/harness/README.md` | Gates in [06-execution-plan.md](06-execution-plan.md) are built on these, not beside them |

## The non-negotiables

These are restated from `CLAUDE.md`, `docs/RULINGS.md` and the two specs, in the form an
implementing agent needs. Each phase's gate checks them.

1. **One query model.** `ReportQuery` is the only way to ask for numbers. A page block, an
   alert, an agent tool call and a CSV export all carry a `ReportQuery` or a reference to a
   saved one. No screen computes a number from records on its own (spec 05 §4.1, D13).
2. **The URL is lossless.** `deserialise(serialise(q))` deep-equals `normaliseReportQuery(q)`
   for every v2 query, and every v1 URL in the wild still opens (AC-853, extended by AC-1101).
3. **A gap is `null`, never `0`.** In results, in the anomaly band, in a page metric, in an
   agent's evidence. The renderer draws a break (spec 06 §3.6).
4. **A partial bucket is drawn, marked, and excluded from every comparison, delta and alert
   evaluation** (spec 06 §3.5, §12.3).
5. **Illegal is disabled in place with a reason, never hidden** (spec 06 §7.3, D9 CQ-3).
   This now includes: an illegal formula, an illegal segment pairing, a stacked chart of a
   non-additive measure, a log axis on a series that crosses zero.
6. **Tokens only; logical utilities only; visible focus; buttons are buttons; one primary per
   screen; no red badge; every string is a key with an Arabic entry.** The edit gate reports
   these. A phase does not close with an open edit-gate finding.
7. **Money is integer halalas on the wire and decimal SAR in the CSV, nowhere else.**
8. **Riyadh time, Sunday week start.** D45 answered Q-RB-3: the position in
   `src/data/reporting/buckets.ts:50` stands, ratified rather than provisional, and the backend
   implements the same.
9. **Permission is resolved per viewer, per measure, server-side.** A blocked series renders
   as blocked; nothing is redacted silently (spec 06 §13.1). The agent inherits the requesting
   operator's permission and nothing more.
10. **No number without a run.** An agent finding cites the run ids that produced its numbers,
    and the runner refuses an output whose numbers do not match those runs
    ([01-analyst-agent.md](01-analyst-agent.md) §7).
11. **A green suite does not verify a chart.** Every drawn change ships with a harness run
    and a screenshot named in the handoff (`CLAUDE.md`, `scripts/harness/README.md`).
12. **One writer per tree.** Parallel phases run in worktrees; the merge order is fixed in
    [06-execution-plan.md](06-execution-plan.md) §2.

## The decisions analytics v2 rests on

**These are in force.** All nine were appended to `docs/05-restructure/DECISIONS.md` as headed
entries with rows in `docs/RULINGS.md`; that is their canonical text and it wins over any
paraphrase. The table below is kept as the summary of what analytics v2 decided and why,
not as a proposal awaiting signature.

| ID | Proposed decision | Needed by |
|---|---|---|
| **D38** | **The analyst agent runs on the owner's Claude Code subscription through print mode, on a runner the owner operates.** No API key anywhere in the product. No model call from the browser or from Vercel. The Agent SDK is not used, because Anthropic's policy reserves subscription login for first-party use and the SDK requires API-key authentication (source: `code.claude.com/docs/en/agent-sdk/overview`). The runner is an internal tool used by the account that owns the subscription; it is not offered to third parties. Usage counts against the subscription's rolling windows and the product shows when the agent is at its limit | Phase 7 |
| **D39** | **A dashboard is a page: an ordered list of blocks.** Supersedes spec 06 §11.1 ("nothing more") and the refusal of text tiles at `DashboardDetailScreen.tsx:1276-1281`. A saved-report tile is one block kind among several. Order stays an integer per block; columns are a block that holds blocks; no free geometry and no per-breakpoint layout. Existing dashboards migrate by a pure function | Phase 4 |
| **D40** | **Two measures, or several segments, may share one axis when they share a unit and a temporality**; the palette override already recorded in `docs/RULINGS.md` ("Standing owner overrides") is extended by two hues, `--chart-s7` and `--chart-s8`, so an eight-way split reads without a wrap. `pairRefusal` still forces separate panels for different units. R7 stands: a **period** comparison is the same hue, dashed | Phase 2 |
| **D41** | **Alerts evaluate on the server, on Vercel Cron, at two cadences: `hourly` and `daily`.** The client's cadence control offers exactly these two. `cadence: null` remains legal and means "not scheduled". This answers Q-RB-7 | Phase 5 (client), Phase 6 (server) |
| **D42** | **The query model gains formulas, transforms, segments and comparison display.** `ReportQuery` v2 fields are optional with defaults; the URL carries a version key; the planner refuses what the catalogue cannot support | Phase 1 |
| **D43** | **An alert may deliver to email and to a Slack incoming webhook in addition to the notification centre.** A recipient must hold the rule's measure permission at delivery time; the server drops a recipient who does not and notifies the owner (spec 06 §13.3, now implementable because the server resolves permission). Nav badges remain untouched (§12.6) | Phase 5 |
| **D44** | **The agent may read a masked sample of the records behind a bucket** through one tool, `sample_rows`, gated by the requesting operator's permission on the resource, capped at 50 rows, with PII fields masked by the server. Every call is audit-logged | Phase 7 |
| **D45** | **Week start.** Answers Q-RB-3. The plan assumes Sunday; the owner confirms or changes it before the backend computes a weekly number | Phase 6 |
| **D46** | **The Report Builder gains a fourth view, `analyst`,** and two detail routes, `/management/reports/analyst/:jobId` and `/management/reports/pages/:pageId` (the latter replaces `/dashboards/:dashboardId`, which redirects). Amends D1a's sub-tab row; the count of sub-tabs does not change | Phase 4, Phase 7 |

## Numbering

- Acceptance criteria in this plan are **AC-1100 … AC-1299**. AC-1000–AC-1014 are taken by
  `DECISIONS.md`; AC-600–AC-732 by the metrics spec; AC-800–AC-905 by the report-builder spec.
- Work packages are **WP-nn**, phases **P0 … P8**.
- Findings against another spec are **F-V2-n**.
- Copy namespaces: `rb.*` stays the builder's; pages take `pg.*`; the analyst takes `an.*`;
  alerts stay under `rb.alert.*` because their screens live in the reports sub-tab.

## What this plan does not do

- It does not change the metric boards (`MetricBoardScreen`) except where a page embeds a saved
  report; the boards keep their own spec.
- It does not design a phone shell. The 1280 viewport meta stands.
- It does not add drag-and-drop as the only way to do anything. Where drag arrives (P4 WP-4.6,
  optional), the keyboard path already exists and stays primary.
- It does not add a rich-text engine. Text blocks are a markdown subset rendered by a small,
  safe renderer in `src/lib/markdown/`. TipTap, ProseMirror, Slate and Lexical are refused:
  bundle size, RTL bugs and an accessibility surface nobody here can audit.
- It does not put a model behind the UI on Vercel. See D38.
