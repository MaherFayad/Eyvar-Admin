# Why did cancellations rise last week?

**Study date:** 2026-09-15 (Asia/Riyadh) · **Language:** en · **Mode:** interactive ask (no jobId)

---

## Headline answer

**I cannot answer the question as asked. There is no data for last week.**

Every measure in the catalogue stops at **2026-06-25**. Today is 2026-09-15. That is an **82-day gap**. The week of 2026-09-06 has no readings — this is a gap, not zero activity.

For the most recent week that *does* have data (**2026-06-14 → 2026-06-20**, the last complete Sunday-week):

- **Subscription cancellations did rise**: 3 → 5, **+2, +66.7%** (RUN-1).
- The rise is **entirely on the weekly plan** (RUN-7) and **is not explained by base growth** (RUN-9).
- **Trip cancellation rate did not meaningfully rise**: 6.1% in that week, identical to 6.1% three weeks earlier; change across complete buckets is **0** (RUN-4).

**Confidence: low.** Reasons and remedies in the last section.

**Decision assumed:** no decision was named. I assumed the question informs whether ops should intervene on retention this week. The honest answer to that decision is: you cannot judge this week from this console until the data pipeline is repaired.

---

## Scope note: which "cancellations"

"Cancellations" is ambiguous here. Two distinct measures exist, and they disagree. I ran both.

| Measure | Unit | What it counts |
|---|---|---|
| `subscriptions.cancelled` | count | Subscriptions cancelled (churn) |
| `trips.cancellationRate` | percent | Share of that day's ride requests cancelled |

---

## Baseline, before any story

Last complete Sunday-week = **2026-06-14 → 2026-06-20**. Prior complete week = **2026-06-07 → 2026-06-13**. Partial buckets excluded throughout.

| Measure | Prior week | Last complete week | Delta | Trend | Run |
|---|---|---|---|---|---|
| `subscriptions.cancelled` | 3 | 5 | +2 (+66.7%) | slope +0.016/day, r² 0.038 — no trend | RUN-1, RUN-2 |
| `trips.cancellationRate` | 5.1% | 6.1% | +1.0 pt | slope +0.080 pt/day, r² 0.14 — weak | RUN-4, RUN-3 |
| `subscriptions.active` (all plans) | 39 | 51 | +12 (+30.8%) | rising | RUN-5 |

Full weekly series for `trips.cancellationRate`, complete buckets only (RUN-4): **6.1% (wk 05-31) → 5.1% (wk 06-07) → 6.1% (wk 06-14)**. First-to-last change: **0**.

The trip rate oscillates. It did not reach a new level.

---

## Findings

### F1 — The question's window has no data (RUN-1, RUN-3)
Coverage `to` is 2026-06-25 for all 17 measures. The last reading is 82 days old. Nothing can be said about 2026-09-06 onward.

### F2 — Subscription cancellations rose 3 → 5 in the last week that has data (RUN-1)
+2 absolute, +66.7%. Total across the whole coverage window: 8 cancellations.

### F3 — 100% of cancellations are on the weekly plan (RUN-7)
The grouped run returns **only one series**: `weekly`, with points [0, 3, 5, 1]. Biweekly and monthly produced **no cancellation series at all** across the entire window — despite both having healthy starts (RUN-8). A `contribution` call between the two windows attributed **share 100%, rank 1** to `weekly`.

### F4 — Base growth does not explain it (RUN-7 + RUN-9)
This is the finding that matters. The overall active base grew 30.8%, but that growth is in the plans that cancelled nothing.

| Plan | Active, wk 06-07 | Active, wk 06-14 | Change | Cancellations 06-07 → 06-14 |
|---|---|---|---|---|
| weekly | 12 | 13 | **+8.3%** | **3 → 5 (+66.7%)** |
| biweekly | 13 | 19 | +46.2% | none recorded |
| monthly | 14 | 19 | +35.7% | none recorded |

Derived from RUN-7 and RUN-9: weekly-plan cancellations as a share of its own active base rose from **3/12 = 25%** to **5/13 = 38%**. The base grew 8.3% while cancellations grew 66.7%. This is a rate rise, not an arithmetic artefact.

Reinforcing it: weekly-plan *starts* **fell** 8 → 6 (−25%, RUN-8). Fewer joining, more leaving.

### F5 — Concentrated in Comfort (RUN-11)
| Vehicle class | wk 06-07 | wk 06-14 | Window total |
|---|---|---|---|
| Comfort | 3 | 4 | 7 |
| Economy | 0 | 1 | 1 |

Comfort carries 7 of the 8 cancellations in the window.

### F6 — The trip cancellation rate did not rise (RUN-3, RUN-4)
`describe_series` on the daily series: **no change points, no outliers**, r² 0.14. Mean 5.83%, median 6%, MAD 1. The weekly level today equals the level three weeks earlier.

---

## Alternative explanations tested

Six tested. Two are data explanations, as the protocol requires.

| # | Hypothesis | Evidence | Verdict |
|---|---|---|---|
| A1 | **(data)** The rise is unobservable — the asked window is outside coverage | Coverage ends 2026-06-25; 82-day gap (RUN-1, RUN-3) | **supported** |
| A2 | **(data)** The perceived rise comes from a partial bucket | Partial week 2026-06-21 reads 7.6% vs 6.1% complete (RUN-4); partial day 2026-06-25 reads 9% vs 5.83% mean (RUN-3). Both excluded from every claim above | **supported** — this is likely what "rose" refers to |
| A3 | More subscriptions exist, so more can cancel | Weekly-plan base +8.3% vs cancellations +66.7% (RUN-9, RUN-7) | **not supported** |
| A4 | Driver shortage / dispatch degradation | Time to assign flat at 1 minute all 30 days (RUN-6); registered captains 55 → 56, +1.8% (RUN-10) | **inconclusive** — see caveat below |
| A5 | Lingering effect of the 2026-06-10 payment gateway outage (ANN-6) | No change point in daily cancellations (RUN-2) or in the trip rate (RUN-3). The annotation records card failures for ~2 hours, cash and wallet unaffected | **not supported** |
| A6 | Trip-level cancellations drive subscription churn | Same-day Pearson 0.485 / Spearman 0.554 over 24 pairs, but sign flips across lags (−0.42 at lag 3, +0.50 at lag 7) — the signature of a sparse series, not a lag structure | **inconclusive**; correlation is not causation |

**A4 caveat, stated rather than hidden:** `captains.registered` carries the caption *"Registration only. A captain suspended yesterday is still counted for every earlier day."* By construction it can never fall. It therefore **cannot** detect a supply drop, and I am not treating its flatness as proof. One recorded cancellation reason in the row sample was "Driver unavailable", so this leg stays open.

---

## Data quality

- **Gap, not zero.** No data from 2026-06-26 to 2026-09-15 (82 days). The asked window falls entirely inside it. No value was drawn or computed for it.
- **Partial buckets excluded from every number above.** Weeks `2026-05-24`, `2026-05-31` and `2026-06-21`; day `2026-06-25`. `run_report` summaries exclude them and so did I.
- **Blocked series: none.** All 17 measures returned `blocked: false` for this operator. Nothing was worked around.
- **No gaps inside the queried windows.** `gapCount: 0` on both RUN-2 and RUN-3.
- **Reconstructed denominator.** `subscriptions.active` caption: *"Rebuilt from each row's start, cancellation and end dates. There is no status history behind it."* The churn shares in F4 inherit that reconstruction.
- **Hand-captured source.** `trips.cancellationRate` comes from the snapshot table, captured by hand; a day nobody captured has no reading.
- **`requests.timeToAssign` is exactly 1 minute on all 30 days** (RUN-6). A perfectly constant series is low-information. I used it as weak evidence only, not as proof of healthy dispatch.
- **Degenerate outlier flags.** `describe_series` on RUN-2 flags 7 "outliers", but MAD = 0 on a 0/1/2 count series, so every non-zero day trips the test. These are not anomalies and I did not treat them as such.
- **Alert provenance inconsistency.** ALR-1 firing AFR-2 has `firedAt` 2026-06-19T09:14 but `bucketStart` 2026-06-20 — it fired before its own bucket began. Worth a ticket.
- **Two alert rules are not protecting anything.** ALR-3 is `suspended` (`ownerLostAccess`), ALR-4 is in `error` (`runFailed`).
- **Row sample used qualitatively only.** `sample_rows` returned 25 of a capped 50 rows — a sample, not a census, and it carries no `runId`, so no count from it appears in any finding. Every cancelled row in it was on the weekly plan; recorded reasons were "Rider request" and "Driver unavailable". Masked names were not treated as identities.

---

## Recommendations

### R1 — Repair the data pipeline. This blocks everything else.
- **Owner:** USR-1, with whoever owns analytics ingestion.
- **Expected effect:** coverage `to` advances from 2026-06-25 to within 1 day of today, for all 17 measures.
- **Verify:** `catalogue_measures` coverage window.
- **When:** within 3 days.
- **What would change this:** if the warehouse is already current and only this operator's view is stale, it is a replication or permissions fault, not ingestion.

### R2 — Review weekly-plan Comfort retention.
- **Owner:** subscriptions / ops lead.
- **Evidence:** 5 cancellations on a base of 13 in the week of 2026-06-14 (RUN-7, RUN-9); Comfort carries 7 of 8 (RUN-11).
- **Expected effect:** weekly-plan cancellations ≤ 3 per week on a base ≥ 13 — under 25%.
- **Verify:** saved report **RPT-2221** ("Weekly-plan churn watch: cancellations vs active base"), private, tagged `analyst`. Read it against RUN-9.
- **When:** one week after data resumes.
- **What would change this:** if the weekly-plan active base rises above ~20, the count can rise while the share falls. Judge on share, not count.

### R3 — Do not treat the firing cancellation-rate alert as a trip-side problem.
- **Owner:** USR-1 (owner of ALR-1).
- **Evidence:** ALR-1 is `firing`, on daily buckets of 7% (2026-06-24) and 9% (2026-06-20). But complete weekly buckets read 6.1% now and 6.1% three weeks ago (RUN-4).
- **Proposed change:** evaluate ALR-1 on a completed week, or require consecutive days above threshold. *I can only propose; an operator creates or edits the rule.*
- **Expected effect:** fewer firings with no change in the underlying weekly level.
- **What would change this:** if the weekly rate exceeds 6.1% for two consecutive **complete** weeks once data resumes, the alert was right and this recommendation is wrong.

### R4 — Restore the two broken alert rules.
- **Owner:** USR-3 (ALR-3, suspended — owner lost access) and USR-5 (ALR-4, error — run failed).
- **Expected effect:** both return to `armed`.
- **Verify:** the `state` field in `alerts_list`.
- **When:** this week.

### R5 — Make cancellation reason a queryable dimension.
- **Owner:** analytics.
- **Evidence:** `cancellationReason` exists at row level, but `catalogue_dimensions` for `subscriptions.cancelled` returns only `subscription.plan` and `subscription.vehicleClass`. The reason split can only be eyeballed in a sample today, never run.
- **Expected effect:** the 5 cancellations can be split by reason with a `runId` behind it, which would close A4 and A6.
- **What would change this:** if reasons are free text with high cardinality, this fails the ≤8-group rule and needs a controlled vocabulary first.

---

## Confidence: low

**Why:**
1. The question asks about last week, and last week has no data — an 82-day gap.
2. The strongest finding rests on **two** complete weekly buckets and counts of 3 and 5. A swing of two subscriptions is 67%.
3. The supply alternative (A4) could not be cleanly ruled out, because `captains.registered` cannot fall by construction.

**What would raise it:**
- Data current through the asked week.
- At least 8 complete weekly buckets of `subscriptions.cancelled` (enough for a change-point test and for `correlate`'s minimum).
- An **active**-captain measure, distinct from registered.
- `cancellationReason` as a group-by dimension.

---

## Runs cited

| Run | What it produced |
|---|---|
| RUN-1 | Subscription cancellations, weekly, 2026-06-01→06-25 |
| RUN-2 | Subscription cancellations, daily (+ `describe_series`) |
| RUN-3 | Trip cancellation rate, daily (+ `describe_series`) |
| RUN-4 | Trip cancellation rate, weekly |
| RUN-5 | Active subscriptions, weekly |
| RUN-6 | Time to assign, daily |
| RUN-7 | Cancellations by plan, weekly |
| RUN-8 | Subscriptions started by plan, weekly |
| RUN-9 | Active subscriptions by plan, weekly |
| RUN-10 | Registered captains, weekly |
| RUN-11 | Cancellations by vehicle class, weekly |

Plus one `contribution` call (windows 2026-06-07→06-13 vs 2026-06-14→06-20, `groupBy: subscription.plan`), which records two runs of its own; its result is restated from RUN-7 so that every number above traces to a run I can name. Saved artifact: **RPT-2221** (private).

---

**Protocol notes for the caller:** `job_context` and `note_finding` were not called — `EYVAR_JOB_ID` is unset this session and both refuse with `no-job`, as expected. Today's date and coverage came from `catalogue_measures`. No money figures appear in this study, so no halala conversion arises. 27 of 40 tool calls used; nothing was left uninvestigated for budget reasons.
