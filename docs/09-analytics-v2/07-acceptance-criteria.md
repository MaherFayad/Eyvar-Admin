# 07 — Acceptance criteria AC-1100 … AC-1299

> One test per criterion, named after it, asserting by role, label and text. `H` marks a
> criterion that can only be proven in a harness (drawn, measured, or a real click); `B` a
> backend test; `A` an agent-package test. Everything else is Vitest with Testing Library.
> Numbers reserved but unused stay unused; nothing is renumbered.

## Query model v2 (AC-1100 … AC-1129)

| AC | Criterion |
|---|---|
| AC-1100 | `normaliseReportQuery` of a v1 query object (string `groupBy`, `conversionWindowDays`, `returnMeasureKey`) deep-equals the v2 form with every default filled, and `normalise(normalise(q))` equals `normalise(q)` |
| AC-1101 | Every v1 URL in `serialise.v1.fixtures.ts` deserialises to exactly the query the v1 code produced for it |
| AC-1102 | For every v2 field, `deserialise(serialise(q))` deep-equals `normaliseReportQuery(q)`, and a query at defaults serialises with no key beyond the v1 set plus `v` |
| AC-1103 | Editing a `ChartView` option (hidden series, log scale, data labels, table beneath, zoom) issues no `reports.run` and changes no URL parameter |
| AC-1104 | The formula grammar parses every expression in the 02 §2.2 table and reports, for an invalid one, the character position and the expected token |
| AC-1105 | `A / B` yields `null` where B is `null` or 0, unit `ratio`; `A / B * 100` yields unit `percent` |
| AC-1106 | `A - B` with different units is refused with `formula-unit`; `A * B` is refused with `formula-unit`; `B` without a second measure is refused with `formula-unknown-ref` |
| AC-1107 | `ROLLAVG(A, n)` is `null` for the first n−1 buckets; `CUMSUM` on a non-additive measure is refused with `formula-needs-additive`; `PCT` without a split is refused with `formula-needs-split` |
| AC-1108 | `quarter` buckets start on 1 Jan, 1 Apr, 1 Jul, 1 Oct in Riyadh local time; `countBuckets` matches `bucketStarts().length` for every grain across every preset |
| AC-1109 | The presets `this-quarter`, `last-quarter`, `this-year`, `year-to-date` resolve to the documented windows against a fixed `today` |
| AC-1110 | `cumulative` never sums a partial bucket into the next complete one's comparison; `percentOfTotal` per bucket sums to 100 across groups including `Other` |
| AC-1111 | `comparisonDisplay: 'difference'` produces one solid series per current series in the measure's unit; `'percent-change'` produces `percent`; both are `null` where either side is a gap |
| AC-1112 | A `fixed` comparison window with a different bucket count is refused with `comparison-length` and `reasonParams.required` equal to the current bucket count |
| AC-1113 | Measures × segments × groups above 12 current series is refused with `too-many-series` carrying the count |
| AC-1114 | A second split level makes `line` and `bar` illegal with `rb.chart.twoLevelsNeedStack` and leaves `stacked-bar`, `stacked-100`, `table` legal |
| AC-1115 | `stacked-bar` is illegal for a non-additive measure and for units `percent`, `ratio`, `rating`, each with its own reason key |
| AC-1116 | `kpi` is illegal with a split or a segment; legal at any grain for one measure |
| AC-1117 | `horizontal-bar` requires `grain: 'none'` and a split |
| AC-1118 | `area` requires one measure |
| AC-1119 | `NEAREST` fallbacks follow 02 §3 and the coerced note names the type it fell back from |
| AC-1120 | `aggregate` on a measure ref outside `bucketAggregateOptions` is refused with `illegal-aggregate`; the rail shows `Measured as` only when options exceed one |
| AC-1121 | The resolver core produces identical results for the same rows whether called from the mock adapter or directly (a pure-function test with a fixed row set) |
| AC-1122 | A `performed` segment on a non-subject measure is refused with `segment-performed-unsupported` in mock |
| AC-1123 | Series ids with two levels are `<measure>#<g1>|<g2>#<role>` and `groupValue` is the joined display value |
| AC-1124 | `describe` returns mean, median, p10, p90, MAD, slope, r², change points and outliers on a known series with the expected values (fixture with hand-computed answers) |
| AC-1125 | `correlate` warns when n < 8 and returns Pearson and Spearman at each lag up to `maxLag` |
| AC-1126 | `contribution` shares sum to 100 % across groups including `Other` and rank by absolute delta |
| AC-1127 | The anomaly band is `median ± k·MAD·1.4826` with the documented k; fewer than 8 complete buckets yields `no-baseline`; `day` grain with ≥ 4 same-weekday buckets uses the weekday baseline |
| AC-1128 | `validatePage` rejects > 200 blocks, a toggle inside a toggle, columns inside columns, widths summing above 12, text above 8,000 characters, a heading above 200 |
| AC-1129 | `caseStudyToBlocks` output validates with `validatePage` and contains one `report` block per finding with a chart and a `provenance` footer listing every run id |

## Charts and controls (AC-1130 … AC-1166)

| AC | Criterion |
|---|---|
| AC-1130 H | Each of `area`, `stacked-bar`, `stacked-100`, `horizontal-bar` renders on the fixture reports in both themes and both languages with no console error |
| AC-1131 H | A click on a mark of every chart type fires the datapoint handler in Chromium (the `INERT` proof) |
| AC-1132 H | A stacked comparison draws as an outline behind the stack, never inside it, in the same hue, dashed |
| AC-1133 | `stacked-100`'s y-axis reads 0–100 % and every bucket's parts sum to 100 |
| AC-1134 H | `horizontal-bar` sorts descending with `Other` last and labels each bar's value at its end, on the inline-end side in Arabic |
| AC-1135 | `kpi` shows the total (flow) or the end value (stock), the neutral delta chip (R4-5) and a sparkline when grain ≠ none |
| AC-1136 | Series seven and eight take `--chart-s7` and `--chart-s8`; `Other` takes `--muted-foreground` in every chart |
| AC-1137 H | No chart carries a shadow (D34) and every chart card recesses within D33b's ceilings in light |
| AC-1138 | Legend entries are buttons with `aria-pressed`; clicking one hides its series, strikes the entry through and keeps it in the legend |
| AC-1139 | Shift+click (and the `Only` action) isolates a series; a second isolate on the same entry restores all |
| AC-1140 | The comparison legend entry toggles every comparison series at once |
| AC-1141 | Hidden series are excluded from the y-axis domain and from the tooltip |
| AC-1142 | The tooltip lists every visible series at the bucket ranked descending with comparison value, absolute and percent delta and the comparison bucket's date; a partial bucket is labelled `partial` |
| AC-1143 | With the chart region focused, arrow keys move the active bucket and the region's description reads the active bucket's values |
| AC-1144 | Log scale is disabled with `rb.view.logNeedsPositive` when any visible value is ≤ 0 or a series is all gaps |
| AC-1145 | `yStartAtZero` defaults true for bar types and false for line and area; the setting persists per report through `persistence` |
| AC-1146 H | x-axis labels never exceed one per 64 px at 1280 and 1440 and are never rotated |
| AC-1147 | Data labels are disabled with a reason when buckets × visible series exceed 60 |
| AC-1148 H | An annotation in the window draws a hairline marker; one outside the window draws nothing |
| AC-1149 | Hover and keyboard focus on a marker show the label and note; the add form is inline and hidden for an operator without `manage_analytics` (disabled with the reason, not removed) |
| AC-1150 | Saving an annotation writes through `annotations.save` and appears without a reload |
| AC-1151 H | Dragging the brush narrows the x domain, shows the `Zoomed · reset` chip, and a mark click still fires afterwards |
| AC-1152 | `[` and `]` move the brush edges by one bucket with the chart region focused; the URL is unchanged |
| AC-1153 | Every planner violation renders its reason sentence in place on the control it names, and `Refresh` is disabled while any exists |
| AC-1154 | The series-ceiling state names the last-added control (segment or split) as the one to remove |
| AC-1155 | The formula field shows the parse error at its position and the unit of a valid formula beneath it |
| AC-1156 | The segment picker offers saved segments and an inline segment; an inline segment's `performed` control is disabled with the reason on an unsupported measure |
| AC-1157 | The compare chip offers `previous-period`, `previous-quarter`, `previous-year`, `fixed`, and the display choice; a fixed range of the wrong length shows the required bucket count in the popover |
| AC-1158 | The date popover lists every preset in 02 §2.7 and the metric boards' popover is unchanged (a snapshot of its option list) |
| AC-1159 H | PNG export downloads an image at 2× whose caption band carries title, window dates, grain, comparison, filters and `asOf`, and whose `tEXt` chunk holds the same text |
| AC-1160 | Every export (CSV and PNG) writes one audit entry through `track`/`audit` with report name, window and filters |
| AC-1161 | The toolbar bell, pin and ask actions are buttons with accessible names and are disabled with a reason when the report has violations |
| AC-1162 | The overflow's `Version history` lists the last saves and `Restore` loads the query into the draft without saving |
| AC-1163 | The library's views `mine · team · starred · official · recent` each filter the fixture list correctly |
| AC-1164 | The star toggle is a button with `aria-pressed` and persists through `reports.star` |
| AC-1165 | `Official` renders as a neutral badge and the toggle is available only to `manage_analytics` |
| AC-1166 | `Duplicate` creates a private copy named `<name> (copy)` and navigates to it |

## Funnel, retention, data table (AC-1167 … AC-1178)

| AC | Criterion |
|---|---|
| AC-1167 | `conversionWindowDays` from a v1 query becomes `{ value, unit: 'day' }` and renders as such |
| AC-1168 | `sequential`, `holdConstant` and `exclude` are disabled with `rb.funnel.needsServer` in mock and legal when the catalogue's `funnelCapabilities` lists them |
| AC-1169 | `conversion-over-time` re-enables the grain control and draws a trend; `time-to-convert` draws p25/p50/p75/p90/p95 in the window's unit |
| AC-1170 | Each funnel step shows count, % of first, % of previous, drop-off and median time to next; the step is a button that opens the drop-off group table when a group-by is set |
| AC-1171 | Retention computes at `day`, `week` and `month`; a cell beyond the cohort's elapsed intervals is `null`, rendered as the absent value, never 0 |
| AC-1172 | `method: 'bracket'` uses the given brackets and refuses overlapping ones with `cohort-brackets-overlap` |
| AC-1173 H | The matrix's strength uses the four heat tokens only (no arbitrary opacity); the curve view folds at 8 cohorts with the average bold |
| AC-1174 | A data table with three measure columns where one is blocked renders the two others and the blocked column's cells as the blocked state, never blanks the table |
| AC-1175 | The totals row appears only when every column is additive; otherwise the total cell reads the aggregate word |
| AC-1176 | Conditional bands use `success`, `warning`, `neutral` tones only; a fixture with a `critical` tone fails validation |
| AC-1177 H | A wide data table scrolls inside its own container and the page never scrolls horizontally at 1280 |
| AC-1178 | Sorting by any column, including a formula column, orders rows correctly with `null` last |

## Pages (AC-1180 … AC-1219)

| AC | Criterion |
|---|---|
| AC-1180 | `dashboardToPage` maps the three fixture dashboards exactly as 03 §2 states (pairs of half tiles into two 6-width columns, full tiles alone, dangling reports into `report` blocks with the last title) |
| AC-1181 | The markdown renderer supports exactly the subset in 03 §4 and renders every item of the XSS corpus as text |
| AC-1182 | Links are limited to `http`, `https` and internal paths; a `javascript:` link renders as text |
| AC-1183 | Text runs are bidi-isolated so a Latin measure name inside Arabic prose keeps its position (a DOM assertion on the `bdi` wrapper) |
| AC-1184 | A text over the size cap is rendered truncated with a stated notice, never dropped |
| AC-1185 | Every block type renders from a fixture page and exposes one region with an accessible name |
| AC-1186 | A `report` block keeps the five resolved states (`ok`, `invalid`, `missing`, `blocked`, `error`) with the same copy as the tile had, and a per-block skeleton |
| AC-1187 | Page scope applies to `report` and `metric` blocks through `applyBoardScope`; a refused range shows the `Own range` badge |
| AC-1188 | `metric` renders one series' value, delta and optional sparkline and shows the absent value when the series is a gap |
| AC-1189 | `alert-status` shows each rule's state badge (R7 tones; `firing` = warning), last value and last evaluated |
| AC-1190 | `agent-insight` renders the markdown and a `Provenance` link to the job page |
| AC-1191 | `bookmark` renders a card with the target's title and opens it |
| AC-1192 | `toggle` is a `<button aria-expanded>` and its content is hidden from the accessibility tree when closed |
| AC-1193 | A page with no blocks shows one grey sentence and `Add block`; the pages index with no pages ever shows the first-run illustration |
| AC-1194 | `pages.get` failure shows the page-level error with retry; a single block's failure does not |
| AC-1195 | `Edit` is the one primary in view mode and appears only for the owner or `manage_analytics`; `Done` replaces it in edit mode |
| AC-1196 | The add-block affordance is a button reachable by keyboard between every pair of blocks and at the end; it opens the inline picker with search |
| AC-1197 | Typing `/` at the start of a line in a text block opens the same picker; `Escape` closes it and restores the caret |
| AC-1198 | The block menu offers move up, move down, move to column, duplicate, turn into, height, view, delete, with items disabled with a reason when inapplicable |
| AC-1199 | `Alt+↑`, `Alt+↓`, `Ctrl+D` and `Delete` act on the focused frame; delete shows one toast with `Undo` |
| AC-1200 | Undo restores the last 20 edits in order through the commands undo stack |
| AC-1201 | Edits save 800 ms after the last change, coalesced, and the header shows `Saving…` then `Saved · <time>` |
| AC-1202 | A `409` keeps every local edit, shows the standing notice with `Reload`, and preserves the edits in `persistence` under the page id until resolved |
| AC-1203 | The text formatting bar wraps the selection with the markdown syntax and the preview renders it when the block loses focus |
| AC-1204 | A `report` block's picker disables already-placed reports with the reason and offers `New report`, which opens the builder with `?pinTo=` |
| AC-1205 | The builder with `?pinTo=` offers `Save and pin`, which saves the report and appends a `report` block to the page |
| AC-1206 | `Turn into` converts text ↔ heading ↔ callout and report ↔ metric without losing the referenced report id |
| AC-1207 | `Turn into columns` wraps a block into a two-column block with the original on the start side |
| AC-1208 | The width control offers ¼ ⅓ ½ ⅔ ¾ full and disables widths that would exceed 12 |
| AC-1209 H | Columns render on a twelve-column grid at 1344 and stack to one column at 1280 |
| AC-1210 | `/management/reports?view=dashboards` renders the pages view and `/management/reports/dashboards/:id` redirects to `/pages/:id` |
| AC-1211 | The pages index views `mine · team · starred · drafts · templates` filter correctly and a draft shows the `Draft` badge |
| AC-1212 | `New page → From template` creates a draft copy of the template owned by the operator and navigates to it in edit mode |
| AC-1213 | `Publish` appears only for the owner of a draft and sets `publishedAt` |
| AC-1214 | Deleting a page removes no report and the confirm names the page only |
| AC-1215 | `Duplicate` copies blocks with new block ids and the same report references |
| AC-1216 H | (optional WP-4.6) Pointer drag moves a block; the keyboard tests of AC-1199 are unchanged |
| AC-1217 H | Print renders one column, hides the scope bar and edit chrome, and shows the `asOf` line under each report block |
| AC-1218 | Every `pg.*` key has an Arabic entry and the pseudo-locale run shows no clipped label on the block menu at +35 % |
| AC-1219 | In `dir="rtl"` the block handle, menu and add affordance sit on the inline-start side and the columns order is mirrored |

## Alerting (AC-1220 … AC-1239)

| AC | Criterion |
|---|---|
| AC-1220 | The state machine performs every transition in spec 06 §12.4 and: `error` after 5 consecutive failures with one owner notification; `suspended` when the owner's permission is gone; `mutedUntil` suppresses delivery but not transitions; `minReArmMinutes` elapsing re-arms |
| AC-1221 | `evaluate()` tests the most recent complete bucket only; a weekly rule on a daily cadence transitions at most once per new bucket (`lastBucketStart`) |
| AC-1222 | `relative` conditions compute against `previous-bucket`, `same-bucket-previous-week` (day grain only) and `previous-period`, and refuse `same-bucket-previous-week` at other grains |
| AC-1223 | `missing` fires when the last n complete buckets are `null` and not when one is 0 |
| AC-1224 | A recipient without the measure's permission is dropped at delivery, the owner is notified once, and the firing records it |
| AC-1225 | The composer is an inline panel (no dialog role) with condition kinds as a segmented control and the fields of the chosen kind only |
| AC-1226 H | The preview chart draws the last 60 complete buckets with the threshold line or the band and marks the buckets where the rule would have fired |
| AC-1227 | Cadence offers `Hourly`, `Daily`, `Not scheduled` with the explanation; saving `Not scheduled` stores `null` |
| AC-1228 | The email channel's user picker lists only users who hold the measure's permission; the Slack picker lists stored webhooks by name and never shows a URL |
| AC-1229 | `critical` severity is disabled with the Q-RB-9 reason |
| AC-1230 | `Test now` returns `no-baseline` for an anomaly rule with fewer than 8 complete buckets and the row states the count |
| AC-1231 | A threshold on a money measure is entered in SAR and stored in halalas (`parseMoneyInput`) |
| AC-1232 | The rules table shows a condition summary sentence per kind from `rb.alert.sentence.<kind>` with named params |
| AC-1233 H | The rules table's sparkline draws the threshold line or the band and never a red stroke |
| AC-1234 | `Mute for…` offers 1 h, 8 h, 24 h, until Monday, custom; the row then shows `Muted until …` |
| AC-1235 | Lag beyond 2 × cadence renders the lag state in the warning tone with the expected cadence named |
| AC-1236 | The firings feed is a ledger (no sort, no selection, no row actions except acknowledge and explain), filtered by rule, date, acknowledged, severity |
| AC-1237 | A failed delivery shows the channel with the error in `title`; the firing row is otherwise normal |
| AC-1238 | `Acknowledge` writes who and when and does not change the rule's state; `Explain` opens the analyst composer with the firing attached |
| AC-1239 | The history panel's `Changes` tab lists every save as `field: old → new` with keyed labels |

## The analyst (AC-1240 … AC-1269)

| AC | Criterion |
|---|---|
| AC-1240 A | Every tool in 01 §5 is registered with a schema; an input violating it is refused with the schema error, not executed |
| AC-1241 A | `run_report` refuses a query with planner violations and returns them; a valid query returns a `runId` and a summary that excludes partial buckets |
| AC-1242 A | `sample_rows` masks every field listed in `measure_sources.pii_columns` and refuses an operator without `view` on the resource |
| AC-1243 A | No tool output exceeds 64 KB; series are capped at 400 points with a stated truncation |
| AC-1244 A | `save_report` and `create_page_draft` create private, unpublished objects owned by the acting operator, tagged `analyst` |
| AC-1245 A | The runner refuses to claim jobs when the login check fails or reports API-key authentication |
| AC-1246 A | `validate.ts` rejects an output citing a `runId` not in the job's tool log, a value that does not match the stored run within rounding, fewer than two alternatives, a missing `dataQuality`, and any unmasked phone or email |
| AC-1247 A | An evidence mismatch triggers exactly one retry with the mismatch appended; a second failure marks `failed:evidence` |
| AC-1248 A | A rate-limit result marks the job `deferred` with `retryAt`, and the runner claims nothing until then |
| AC-1249 A | The spawn argv contains `--allowedTools "mcp__eyvar__*"`, `--permission-prompts none`, `--max-turns`, `--json-schema`, `--append-system-prompt-file`, and the working directory is `agent/sandbox` |
| AC-1250 A | The `PreToolUse` hook exits 2 for any tool not prefixed `mcp__eyvar__` |
| AC-1251 A | The case-study schema rejects a study without `alternatives[2]` or `dataQuality`, and accepts the fixture `done` job's result |
| AC-1252 A | The prompt version string is written into the job's events |
| AC-1253 | `caseStudyToBlocks` renders the headline callout tone by confidence (`success` high, `info` medium, `warning` low) |
| AC-1254 | The analyst view lists jobs with state badges in R7 tones (`failed` is warning, never red) and filters by state, kind and mine/team |
| AC-1255 | The composer is inline with kind, question, context chips and one primary `Ask`; it is disabled with the reason when the runner is offline or at its limit |
| AC-1256 | The job page polls events every 2 s while `running` and stops when the state is terminal (asserted with the seam instrument, not a spy) |
| AC-1257 | Interim findings from `note_finding` appear in the timeline as they arrive |
| AC-1258 | A `done` job renders its result page with the same block renderer and a `Provenance` panel listing every run with query, window and `asOf` |
| AC-1259 | `Open in builder` on a run opens `/management/reports?q=` with that run's query |
| AC-1260 | `Save as page`, `Pin to page…`, `Create alert from finding`, `Re-run` and `Copy link` are buttons with accessible names; `Create alert` prefills the composer with the finding's proposed condition |
| AC-1261 | `deferred` shows `At usage limit until <time>`; `failed:evidence` shows the mismatch; `failed:timeout` shows the findings kept |
| AC-1262 | Entry points exist and prefill context: builder overflow, page header, alert history row, notification action, command palette |
| AC-1263 | The agent's prose renders in the job's `language` and every chrome string around it is an `an.*` key with an Arabic entry |
| AC-1264 | The runner status line reads from `agent.status` and shows online, offline, or limit-until |
| AC-1265 | `/analyst` in a terminal session produces a study file with a tool log under `docs/09-analytics-v2/studies/` |
| AC-1266 | A due schedule enqueues exactly one job per period; a disabled schedule enqueues none |
| AC-1267 | With the runner offline a scheduled job stays `queued` and the job page states why |
| AC-1268 H | `scripts/harness/analyst.mjs` captures the running timeline and the finished page in both languages with no console error |
| AC-1269 | The reference study exists with its tool log and every number in it matches a run in the log (a script check, `scripts/study-check.mjs`) |

## Backend (AC-1270 … AC-1289)

| AC | Criterion |
|---|---|
| AC-1270 B | `vercel dev` serves `/api/v1/health` and `/management/reports` (SPA) without the rewrite catching `/api` |
| AC-1271 B | Migrations apply on PGlite from empty and are idempotent on a second run |
| AC-1272 B | 401 responses are not retryable; 403 responses carry `details[0].field` naming the permission key |
| AC-1273 B | A repeated non-GET with the same `Idempotency-Key` replays the stored response and performs no second write |
| AC-1274 B | The session returns the operator's `PermissionKey[]` and revoking a session invalidates its cookie |
| AC-1275 B | `catalogue.measures` equals the seeded fixture list field for field |
| AC-1276 B | For every seeded saved report, the compiled `reports.run` result equals the mock resolver's result bucket for bucket on the same seed rows |
| AC-1277 B | A leg over the row cap returns `truncated: true` with `truncatedAtRows`; a leg that fails returns `failed` on its series and the other series intact |
| AC-1278 B | A measure the operator may not see returns `blocked` with no points; the agent path resolves permission as the acting operator |
| AC-1279 B | `PATCH /pages/:id` with a stale `version` returns 409 with `details[0].code = 'stale'` |
| AC-1280 B | Saving a page rebuilds `page_reports` and `DELETE /reports/:id` returns 409 naming the pages that pin it |
| AC-1281 B | A page's blocks are validated server-side with `validatePage` and an invalid page is refused with the validator's codes |
| AC-1282 B | The hourly cron evaluates only `hourly` rules and the daily cron only `daily` rules, each stopping at 250 s and resuming from the oldest `last_evaluated_at` |
| AC-1283 B | A firing writes the firing row, one notification per in-app recipient with the report route, and one delivery row per channel attempt |
| AC-1284 B | A Slack delivery failure is recorded as `failed` with the error and does not fail the cron |
| AC-1285 B | The snapshot cron is idempotent per day and writes the nine fields the legacy prototype captured |
| AC-1286 B | Housekeeping deletes runs older than 30 days that no page references and keeps referenced ones |
| AC-1287 B | Two concurrent claims return the job to exactly one runner |
| AC-1288 B | A result citing a `runId` from another job is refused; a valid result stores a draft page owned by the requester and marks `done` |
| AC-1289 B | `api:smoke` calls every GET in `endpoints.json` with a seeded session and every response has the declared envelope |

## Cross-cutting (AC-1290 … AC-1299)

| AC | Criterion |
|---|---|
| AC-1290 | Every state in 02 §10, 03 §8, 04 §7 and 01 §10 is reachable through a named fixture or `?mockFail=`, and a test lists them |
| AC-1291 | Every new client operation is in `knownOperations()` and reachable through `?mockFail=<op>:<status>` |
| AC-1292 | `npm run i18n:check` reports 0 `defaultValue` and every new key has an Arabic entry |
| AC-1293 | `npm run api:check` reports 0 problems on the merged tree |
| AC-1294 H | Every new screen renders in `dir="rtl"` with no horizontal overflow at 1280 and 1440 (`ops-routes.mjs` route list extended) |
| AC-1295 H | Every new screen and card meets D33's ceilings and carries no shadow (D34) in both themes |
| AC-1296 | Every new screen has exactly one primary button |
| AC-1297 | No new dependency is added to the root `package.json` except those named in this plan (`@electric-sql/pglite` dev, `@neondatabase/serverless`, `@vercel/functions`, `@vercel/blob` in `api/`; `@modelcontextprotocol/sdk`, `zod` in `agent/`), and the Agent SDK is absent everywhere |
| AC-1298 | The reports chunk after P8 is within 1.5× its P0 size or the handoff names the reason |
| AC-1299 | `npm test` passes with the same count of skipped tests as P0 plus the `it.fails` entries named in handoffs |
