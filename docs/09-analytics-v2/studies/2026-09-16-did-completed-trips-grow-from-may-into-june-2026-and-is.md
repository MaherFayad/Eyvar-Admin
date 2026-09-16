# Did completed trips grow from May into June 2026 — and should driver recruiting budget shift to subscription corridors?

**Prepared:** 2026-09-16 (Asia/Riyadh) · **Data as of:** 2026-06-25T09:14+03:00

**Reference study, WP-7.7 (AC-1268/AC-1269).** Real `claude -p` spawn, `EYVAR_MCP_SOURCE=mock`,
protocol version 1.0.0. Tool log (37 `mcp__eyvar__*` calls, every input and output): sibling
file `2026-09-16-did-completed-trips-grow-from-may-into-june-2026-and-is.tool-log.jsonl`.
Every `RUN-n` cited below was checked against that log by the WP-7.7 agent — see
`docs/02-verification/analytics-v2-analyst-qa.md`'s citation-check note.

---

## Headline answer

**Do not shift driver recruiting budget toward subscription corridors on this evidence. The question cannot be answered from the trip data, and the corridor signal that appears to support the shift is an artifact.**

| | |
|---|---|
| **Confidence** | **Low** |
| **Why** | The only measure that can split demand into subscription vs quick ride (`trips.completed`) holds **94 trips across 45 days** (RUN-1) — roughly 2 per day. Row-level inspection shows it is a hand-seeded fixture, not the trip ledger. It disagrees with the snapshot table by ~11x and correlates with it at **r = 0.02** (RUN-7, RUN-2). |
| **Decision I assumed** | None was named beyond the budget question. I assumed: *allocate Q4 2026 driver-recruiting spend between subscription corridors and quick-ride corridors.* |
| **What is true** | Total completed trips rose **+6 (40 → 46, +15.0%)** between equal 21-day windows (RUN-5, RUN-6). **All +6 was quick ride; subscription was exactly flat at 14 → 14** (RUN-3/RUN-4). |
| **The catch** | That +6 is inside the noise band: trend slope **0.022 trips/day, r² 0.098**, **zero change points**, zero outliers (RUN-1). It is not a growth signal. |
| **The contradiction** | The snapshot/revenue tables say the *opposite*: subscription revenue is growing **twice as fast** as quick-ride revenue (RUN-10). Those two sources cannot both be right. |

A "why" question with two sources pointing opposite ways, on 94 rows, is not a budget mandate.

---

## Baseline — state this before any story

**Measure:** `trips.completed` — *"Bucketed by when the trip ended, never by when it started."*
**Coverage:** 2026-05-11 → 2026-06-25 only. **There is no data for 1–10 May.** A full-calendar-month May vs June comparison is impossible; I used the windows that exist.

| Baseline (RUN-1) | Value |
|---|---|
| Window | 2026-05-11 → 2026-06-25, day grain |
| Complete buckets | 45 (2026-06-25 is partial — excluded everywhere below) |
| Total completed trips | 94 |
| Mean / median per day | 2.09 / 2 |
| Min / max per day | 0 / 3 |
| p10 / p90 | 1 / 3 |
| Trend slope | +0.022 trips/day |
| **Trend r²** | **0.098** |
| Change points | none |
| Outliers | none |
| Gaps inside window | 0 |

**Previous-period delta, equal 21-day windows** (A = 11–31 May, B = 1–21 June):

| Series | A (RUN-5) | B (RUN-6) | Δ abs | Δ % | Source |
|---|---|---|---|---|---|
| **Total** | 40 | 46 | **+6** | **+15.0%** | RUN-5, RUN-6 |
| Quick ride | 26 | 32 | **+6** | **+23.1%** | RUN-3, RUN-4 |
| **Subscription** | **14** | **14** | **0** | **0.0%** | RUN-3, RUN-4 |

Read plainly: on the trips table, **subscription demand did not grow at all**. Every trip of the increase was quick ride. That is the reverse of the premise in the question.

Subscription series on its own (RUN-2): slope **+0.0076 trips/day, r² 0.014**, median 0, MAD 0. Flat. *(The `describe_series` call on this series returned 21 "outliers" — an artifact: MAD is 0, so every non-zero day scores as an outlier. Disregard that list.)*

---

## Findings

### F1 — The growth is quick ride, and it is inside the noise band
`trips.completed` rose +6 trips over 21 days (RUN-5, RUN-6), all of it quick ride (RUN-3/RUN-4). But r² is 0.098 (RUN-1) — the fitted trend explains under 10% of day-to-day variance, on a series whose full range is 0–3 trips/day. CUSUM found **no change point** anywhere in the 45 days. A +6 move on a 40-trip base, with no change point and no outlier, is indistinguishable from random variation.
**Runs:** RUN-1, RUN-3, RUN-4, RUN-5, RUN-6

### F2 — The corridor ranking that would justify the budget shift is a top-8 folding artifact
`trip.pickup` has 12 values; the planner folds to 8 groups plus `__other__` (`panelCount: 9`). The contribution call over the same two windows ranked KAFD (+6, 100% share), Al Wurud (+5, 83%), Al Yasmin (+5, 83%) — against Al Sahafa (−4), Hittin (−4), Olaya (−4), Al Rawdah (−3). **Positive shares sum far past 100% against a total change of 6.** The individual district swings are larger than the total they are meant to explain.

The level runs show why:

| Window | Top-8 districts | Max district |
|---|---|---|
| 11–31 May (RUN-15) | Al Narjis 4, Al Sahafa 4, Hittin 4, Olaya 4, Al Malaz 3, Al Malqa 3, Al Rawdah 3, Al Suwaidi 3, Other 12 | **4** |
| 1–21 June (RUN-16) | KAFD 6, Al Wurud 5, Al Yasmin 5, Al Malaz 4, Al Malqa 4, Al Narjis 4, Al Suwaidi 4, Qurtubah 4, Other 10 | **6** |

KAFD, Al Wurud, Al Yasmin **do not appear in May's top 8 at all** — they sat inside `__other__`. Their apparent "+6/+5/+5" is largely a reshuffle across the folding boundary, not measured corridor growth. No district clears 6 trips in three weeks. **There is no corridor here big enough to aim a recruiting budget at.**
**Runs:** RUN-15, RUN-16 (contribution over windows 2026-05-11→05-31 and 2026-06-01→06-21; that tool returned no runId of its own — the level figures above are the citable form)

### F3 — The revenue tables say subscription is the faster-growing line, contradicting F1
`revenue.subscription` and `revenue.quickRide`, 2026-05-27 → 2026-06-24 (29 complete days; 2026-06-25 partial, excluded):

| Series | First (27 May) | Last (24 Jun) | Δ abs | Δ % | Slope | r² |
|---|---|---|---|---|---|---|
| `revenue.subscription` | 10,917 halalas | 32,544 halalas | **+21,627 halalas** | **+198.1%** | **+809.4 halalas/day** | **0.969** |
| `revenue.quickRide` | 18,588 halalas | 26,627 halalas | +8,039 halalas | +43.2% | +403.7 halalas/day | 0.914 |

Window totals: subscription **570,295 halalas**, quick ride **686,860 halalas**.

Subscription revenue is climbing at **twice the slope** of quick-ride revenue, with a near-deterministic fit. Taken alone this *would* support the proposed shift. It cannot be taken alone — see F4 and H1.
*(Money stated as the integer halalas the tools returned. Conversion to SAR is the UI's job, not this study's.)*
**Runs:** RUN-10

### F4 — Subscription revenue growth tracks an accumulating counter, not rising demand
`subscriptions.active` runs 5 (1 June) → 59 (24 June), +54 (RUN-11). That looks like a 10x subscriber base. It is not.

Its own caption warns: *"Rebuilt from each row's start, cancellation and end dates. There is no status history behind it."* The arithmetic confirms the rebuild is simply cumulative:

- Starts through 24 June = 68 − 2 (25 June) = **66**; cancels through 24 June = 8 − 1 = **7**; 66 − 7 = **59** = the 24 June active value. Exact (RUN-11, RUN-12).

So `subscriptions.active` is **cumulative starts minus cumulative cancels since coverage began on 1 June** — it starts at 5 because the table starts on 1 June, not because the business had 5 subscribers. Meanwhile the actual demand input, `subscriptions.started`, is **flat to declining**: 5/day on 1 June, 2/day on 24 June, mean 2.83, total 68 (RUN-12).

`revenue.subscription` correlates with this accumulating counter at Pearson **0.940**, Spearman **0.988** over 24 pairs. Two monotone ramps correlate trivially — this is consistency with the artifact, **not** evidence of causation.
**Runs:** RUN-11, RUN-12, RUN-10

### F5 — `financials.arpa` is broken and must not be used
`financials.arpa` is captioned *"Subscription revenue per active subscriber in SAR."* It returns a series **identical point-for-point** to `revenue.subscription` (RUN-13 vs RUN-10): 10,917 / 10,788 / 11,410 … 32,544 / 40,137, same total 570,295 halalas, same mean, same +198.1%. It is not divided by active subscribers at all. Any dashboard reading ARPA today is reading gross subscription revenue mislabelled as a per-subscriber figure — and would show "ARPA up 198%" while the subscriber base was allegedly growing 10x, which is arithmetically impossible.
**Runs:** RUN-13, RUN-10

---

## Alternative explanations tested

This is a "why" question, so more than one alternative was required. Four were tested; one is a data explanation.

### H1 — Data explanation: `trips.completed` is a seeded fixture, not the trip ledger — **SUPPORTED**
Three independent checks:

1. **Magnitude.** `trips.quickRides` (snapshot table) averages **16.17 quick rides/day**, total 469 over 29 complete days (RUN-7). `trips.completed` filtered to quick ride averages **1.4/day**, total 63 over 45 days (RUN-2). An ~11x disagreement between two measures of the same thing.
2. **Correlation.** The two quick-ride series correlate at Pearson **0.022**, Spearman **0.022** over 29 paired buckets (RUN-7 × RUN-2). Effectively zero. They are not measuring the same population.
3. **Row level.** `sample_rows` on `trips` returns TRP-8002…TRP-8033 as **one trip per calendar day** walking backwards from 2026-06-24 to 2026-05-24, with `distanceKm` in a clean arithmetic ramp (3.7, 4.4, 5.1, 5.8, 6.5, 7.2, 7.9, 8.6, 9.3, 10.0 …) and `fareHalalas` in lockstep **+137 halalas per row** (1337, 1474, 1611, 1748, 1885, 2022, 2159, 2296, 2433, 2570 …), every row ending at **:14 past the hour**, with routes cycling through a fixed list. Real trip ledgers do not do this.

**This is the finding that governs the answer.** F1 and F2 are computed on fixture rows and carry no business meaning. *(No masked identity was inferred; only structural fields — timestamps, distance, fare — were read.)*

### H2 — Data explanation: coverage truncation makes "May vs June" unanswerable as asked — **SUPPORTED**
- `trips.completed` starts **2026-05-11**: 1–10 May is **no data**, not zero trips. A calendar-month comparison would silently drop a third of May.
- `trips.completed` ends **2026-06-25**, and that bucket is **partial** (`partialBucketIndexes: [45]`, RUN-1) — excluded from every figure above.
- `trips.quickRides`, `revenue.*`, `trips.cancellationRate` all start **2026-05-27**: RUN-7 shows **16 leading nulls** (11–26 May). These are gaps, not zeros. The revenue comparison in F3 therefore spans 27 May → 24 June, **not** May vs June.
- `subscriptions.*` start **2026-06-01**. **There is no May subscription data of any kind.** The literal question — did subscription demand grow from May into June — **cannot be computed**, on any measure, in either direction.

### H3 — The 10 June payment gateway outage suppressed June trips — **NOT SUPPORTED**
`annotations_list` returned exactly one annotation in range: **ANN-6, 2026-06-10, "Payment gateway outage"** — *"Card payments failed for roughly two hours; cash and wallet rides were unaffected."* The daily series shows **2 completed trips on 10 June** (RUN-1) against a 45-day mean of 2.09 — no gap, no zero, no dip. `describe_series` found no change point and no outlier at that index (RUN-1). Revenue on 10 June was 19,578 halalas subscription / 22,982 halalas quick ride, both mid-ramp with no break (RUN-10). The outage left no mark.

### H4 — Driver supply constrained subscription trips, so demand is understated — **NOT SUPPORTED (and the measure is itself suspect)**
`requests.timeToAssign` is **exactly 1 minute on every single day** of the window, mean 1, min 1, max 1, with one gap on 2026-05-11 (RUN-9). No assignment pressure, so a supply squeeze cannot explain flat subscription trips. But a metric that is perfectly constant to the minute for 45 consecutive days is a placeholder or a floor, not a measurement — I am not treating it as real evidence either way.

Supporting: `captains.joined` totals **1 in Jeddah and 1 in Riyadh across the entire 46-day window** (RUN-14). The driver table is at fixture scale too. **The current recruiting rate cannot be sized from this data, which is a further reason not to re-plan a budget against it.**

---

## Data quality

| Item | Detail |
|---|---|
| **Gaps (no data, never zero)** | `trips.completed` / `trips.fareCollected` / `requests.timeToAssign`: no data before **2026-05-11** (RUN-1, RUN-9 — RUN-9 also has a gap *on* 11 May). `trips.quickRides` / `revenue.*` / `financials.arpa` / `trips.cancellationRate`: no data before **2026-05-27** — RUN-7 shows 16 explicit nulls. `subscriptions.*`: no data before **2026-06-01** — RUN-8 shows 21 explicit nulls. None of these were read or drawn as zero. |
| **Partial buckets excluded** | **2026-06-25** is partial in every daily run (RUN-1, RUN-2, RUN-7, RUN-8, RUN-9, RUN-10, RUN-11, RUN-12, RUN-13). Excluded from all totals, means, trends and deltas stated here. Its raw values are conspicuous — 7 completed trips vs a max of 3, and 40,137 halalas subscription revenue vs a previous max of 32,544 — precisely why a partial bucket must never be compared to a complete one. |
| **Blocked series** | **None.** Every measure in `catalogue_measures` returned `blocked: false` for this operator. Nothing was withheld and nothing was worked around. |
| **Truncation** | None. Every run reported `seriesTruncated: false` and `rowCapTruncated: false`. No run approached the 400-bucket cap. `sample_rows` returned its full 50-row cap — the fixture pattern in H1 is drawn from those 50 rows, which is a sample, though the pattern runs unbroken across 30+ consecutive rows. |
| **Dimension folding (§7.4)** | `trip.pickup` has 12 values, folded to 8 + `__other__`. `__other__` held **12 trips in May and 10 in June** (RUN-15, RUN-16) — the largest single bucket in both windows. The folded remainder is bigger than any named district. See F2. |
| **Measure defect** | **`financials.arpa` returns gross subscription revenue, not a per-subscriber figure** (F5, RUN-13 vs RUN-10). Treat as broken. |
| **Measure defect** | **`subscriptions.active` is a cumulative rebuild from the coverage start**, not a true stock (F4, RUN-11 vs RUN-12). Its "+1080%" is not a business number. |
| **Measure defect** | **`requests.timeToAssign` is constant at 1 minute for 45 days** (RUN-9). Implausible as a measurement. |
| **Staleness** | Every run reports `asOf` **2026-06-25T09:14+03:00**. Today is **2026-09-16**. **The data is ~12 weeks stale.** A question about "next quarter" is being asked against evidence that stops at the end of Q2. |

---

## Recommendations

### R1 — Hold the recruiting budget flat; do not reallocate to subscription corridors this quarter
- **Owner:** Operations / driver recruiting
- **Rationale:** F1, F2, H1, H2. Subscription trips were flat (14 → 14, RUN-3/RUN-4); the corridor ranking is a folding artifact (RUN-15, RUN-16); the source table is a fixture (H1).
- **Expected effect:** Avoids committing Q4 spend against a +6-trip signal with r² 0.098 (RUN-1).
- **Verify:** Re-run the 21-day window comparison once trip data past 2026-06-25 lands.
- **Check again:** Within 2 weeks of the pipeline being fixed (R2).
- **What would change this answer:** A subscription-corridor delta of **≥ +20 trips per 21-day window** on a trips table that reconciles with `trips.quickRides` to within 10%, with a CUSUM change point in the subscription series.

### R2 — Fix the trips pipeline before any further trip-based analysis; it is the blocker
- **Owner:** Data engineering
- **Rationale:** H1. `trips.completed` reports 1.4 quick rides/day against the snapshot's 16.17/day (RUN-2, RUN-7), correlating at r = 0.02.
- **Expected effect:** `trips.completed` filtered to quick ride should land near **16/day**, total near **469 per 29 days** (RUN-7 scale), not 63 per 45 days (RUN-2).
- **Verify:** Re-run the RUN-7 × RUN-2 correlation; it should exceed **r = 0.8** at lag 0.
- **Check again:** At the next data load.
- **What would change this answer:** Evidence that the snapshot table double-counts — e.g. counting requests or legs rather than completed trips. That would flip which source is wrong, not whether they disagree.

### R3 — Take `financials.arpa` off every dashboard today
- **Owner:** Data engineering / analytics owner
- **Rationale:** F5. It returns `revenue.subscription` verbatim (RUN-13 vs RUN-10) while claiming to be per-subscriber.
- **Expected effect:** Corrected ARPA on 24 June would be roughly 32,544 halalas over 59 active subscriptions (RUN-10, RUN-11) — **not** the 32,544 halalas currently displayed as a per-subscriber figure.
- **Verify:** ARPA must stop matching `revenue.subscription` point-for-point.
- **Check again:** Immediately; this is a live misreport, not a backlog item.
- **What would change this answer:** Nothing in the data — the two series are identical. Only a spec saying ARPA is defined as gross revenue, which would make the caption wrong instead.

### R4 — Re-specify `subscriptions.active` as a true stock, or relabel it
- **Owner:** Data engineering
- **Rationale:** F4. It equals cumulative starts minus cancels since 1 June (66 − 7 = 59, exactly; RUN-11, RUN-12).
- **Expected effect:** A true stock would not begin at 5 on the first day of coverage.
- **Verify:** Load pre-June subscription rows; the 1 June value should jump well above 5.
- **Check again:** Once subscription coverage extends before 2026-06-01.
- **What would change this answer:** Confirmation that the business genuinely had ~5 active subscriptions on 1 June — which would also mean subscription revenue of 11,910 halalas that day came from 5 subscribers, and is testable against the subscriptions table.

### R5 — Treat the subscription revenue ramp as a real but unexplained lead, not a mandate
- **Owner:** Commercial / finance
- **Rationale:** F3 is the one genuinely strong signal in this dataset: +809.4 halalas/day at r² 0.969 (RUN-10), twice the quick-ride slope. But F4 shows it co-moves with an accumulating counter (Pearson 0.940), and `subscriptions.started` is **declining** (5/day → 2/day, RUN-12) — so it is growth in the installed base, not growth in new demand. New-subscription demand falling while revenue rises is not a case for recruiting more drivers into subscription corridors.
- **Expected effect:** Investigating why starts fell from 5/day to 2/day (RUN-12) likely matters more to Q4 than corridor reallocation.
- **Verify:** Saved report **RPT-2221** *"Subscription vs quick-ride revenue, daily (halalas)"* (private, owned by the acting operator, tagged `analyst`). Propose an alert on `subscriptions.started` falling below 2/day for 3 consecutive days — **an operator must create it; I cannot.**
- **Check again:** Weekly once data resumes past 2026-06-25.
- **What would change this answer:** `subscriptions.started` recovering above 4/day sustained, **with** subscription trips in a reconciled trips table rising in step. That combination would justify revisiting R1.

---

## Confidence: Low

**Reason.** The question asks which demand line drove trip growth. The only measure that can split demand by kind fails three independent validity checks (H1) and has no May data for subscriptions at all (H2). The two available sources give **opposite** answers — trips say quick ride grew and subscription was flat (RUN-3/RUN-4); revenue says subscription grew twice as fast (RUN-10) — and the revenue story is confounded by a cumulative-counter artifact (F4). Three measures in the catalogue are demonstrably defective (F4, F5, H4). The data is 12 weeks stale relative to the decision date.

**Per the protocol: I could not find a cause consistent with the data.** Every candidate explanation for "subscription demand is driving growth" came back not-supported or confounded. Stating that cleanly is the correct outcome here; inventing a corridor story from 94 fixture rows would not be.

**What would raise confidence to high:**

1. A `trips.completed` series that reconciles with `trips.quickRides` to within 10% (R2) — the single biggest lever.
2. Subscription coverage extending back to at least 1 May 2026, enabling the literal May-vs-June comparison the question asks for.
3. Trip data past 2026-06-25, so the answer is not 12 weeks stale.
4. A corrected `financials.arpa` and a true-stock `subscriptions.active`, to separate price effects from volume effects in the revenue ramp.
5. A `trip.pickup` split with ≤ 8 values, or corridor volumes large enough that top-8 folding stops dominating the ranking (F2).

---

## Runs cited

| Run | What it produced |
|---|---|
| RUN-1 | `trips.completed` daily, 2026-05-11→06-25 — baseline, trend, change points |
| RUN-2 | `trips.completed` daily by `trip.kind` |
| RUN-3 / RUN-4 | `compare_windows` by `trip.kind`, 11–31 May vs 1–21 June |
| RUN-5 / RUN-6 | Per-window levels by `trip.kind` |
| RUN-7 | `trips.quickRides` daily (snapshot table) |
| RUN-8 | `subscriptions.started` daily, full window (shows 21 leading gaps) |
| RUN-9 | `requests.timeToAssign` daily |
| RUN-10 | `revenue.subscription` + `revenue.quickRide` daily |
| RUN-11 | `subscriptions.active` daily, June |
| RUN-12 | `subscriptions.started` + `subscriptions.cancelled` daily, June |
| RUN-13 | `financials.arpa` daily |
| RUN-14 | `captains.joined` daily by `driver.city` |
| RUN-15 / RUN-16 | `trips.completed` by `trip.pickup`, per window |

Non-run evidence: `annotations_list` (ANN-6), `sample_rows` on `trips` (50-row cap), `correlate` RUN-7×RUN-2 and RUN-10×RUN-11, `describe_series` on RUN-1, RUN-2, RUN-10. `prior_studies_search` returned no earlier study on this question.

**Artifact created:** saved report **RPT-2221** (private, `analyst`-tagged, not visible to the team until an operator publishes it). No page draft was created. No alert was created — only an operator can do that.

---

**Protocol file read for this run:** `C:\Users\Admin\Documents\GitHub\Eyvar Admin\agent\prompts\analyst.md`
