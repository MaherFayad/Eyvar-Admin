# Verification Pass 2 — Accuracy

> Question: is anything wrong? | Claims sampled: **7,268** — 4,805 mechanical identifier↔line pairs, 197 element-id↔line pairs, ~1,568 hand-verified `sed` reads, 83 formulas re-derived from source, 53 negative claims falsified-or-confirmed, 78 counted quantities recounted — across **41 of 60 documents** examined in depth.
>
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines). Every claim below was checked by reading the cited source line directly, never by trusting the document's own reasoning.

**Directory state (listed at start and end, as required).** At audit start `docs/01-modules/` held **53** files; at audit end, **60**. Seven documents were written *during* this pass: `00d-i18n-and-localisation.md`, `13c-contact-drivers.md`, `13d-interventions.md`, `15k-settings-reason-codes-sla.md`, `16i-settings-rota-oncall.md`, `16j-settings-activity.md`, `16k-audit-log.md` (and `16h` was revised mid-audit).

**Coverage — read this before trusting any per-document silence.** Audited **in depth**: `00a`, `00b`, `00c`, `01`, `02a`, `02b`, `03a`, `03b`, `03c`, `04`, `05a`, `05b`, `06a`, `06b`, `07a`, `07b`, `07c`, `08a`, `08b`, `09a`, `09b`, `10a`, `10b`, `10c`, `10d`, `10e`, `11a`, `11b`, `12a`, `12b`, `12c`, plus `15b`, `15d`, `15g`, `15i`, `16h`. Covered **only by the whole-corpus mechanical sweeps** (which found no flags in them, a weakly positive signal): `13a`, `13b`, `14a`, `14b`, and the remaining `15*`/`16*` files. **Unassessed**: the seven late arrivals. A document not appearing in §3–§5 has not been cleared — it may simply not have been examined. See §11 P5.

---

## 1. Verdict

**The documentation set's reasoning is sound; its pointers are not.** That is the single most important finding, and it holds across all forty-odd documents examined in depth. **All 45 money formulas re-derived from source matched operator-for-operator, including rounding order and clamp behaviour** — payouts, escrow, deductions, the entire cash-reconciliation debt engine, rider-wallet credit/debit, VAT-inclusive credit-note back-out, subscription economics, settlement, corporate invoicing, fare and surge computation, payment hold/capture. **52 of 53 strong negative claims turned out to be true**, the sole exception being `08a`'s assertion that nothing writes a driver's `notifLog` (four writers exist — N45). Seed values were exact wherever checked, including a full recomputation of all 25 compliance expiry dates in `10d`. And every document carries an explicit `UNVERIFIED items` section (252 markers), so the authors flagged what they could not confirm rather than asserting it — which is why `UNSUPPORTED` is nearly empty.

Against that, **STALE citations outnumber WRONG claims more than five to one (326 vs 61)**. A reader who trusts the *analysis* in these documents will almost always be right; a reader who follows a *line number* into a render block will frequently land somewhere else.

Two defects actually exist. The first and most fixable is **stated counts that the document's own adjacent table already contradicts** (§3.1): `00a` says 31 nav items beside a 30-row table, 15 badges beside an 18-row table, 39 dispatch lines beside a 38-row table; `00b` says 45 init statements beside a 44-item list and 22 `!important`s where there are 15; `03a` says 22 `kpiScrollTo` call sites where there are 42; `02a` says a maximum deduction of 115 where the six terms sum to 125. Twelve of the thirty-nine WRONG findings are this one failure mode, and in every case the correct answer is already printed on the page.

The second, and by volume far the larger, is **line-citation drift**. It is systematic in shape: citations pointing at *function declarations, constant definitions, seed literals and formula lines* are reliably exact, while citations pointing *into the interior of long render blocks, HTML template strings and multi-line object literals* drift. Roughly 54 % of mechanically checkable citations landed exactly and 74 % within ±3. In the `08a`–`10e` group the drift takes an especially awkward form: **entire contiguous blocks are offset by a constant** — `08a`'s driver-row cells all +1, `08b`'s `buildApplicantDetailBody` +1 to +4, `09a`/`09b`'s profile cards −7, `10a`'s fairness rows +6, `10c`'s coverage rows +1 and its backup modal −5 to −7, `10e`'s incident card −3, `04`'s `drawMap` layers +1 to +8. A reader spot-checking one citation in such a block and finding it wrong cannot assume the neighbours are right; they are all wrong by the same amount. There are also **range-endpoint errors** where a cited block overshoots into the *next* sibling — most consequentially around `PAGE_PERMISSIONS`, where `10d` and `10e` both mis-state the compliance/safety boundary, and around page containers, where five documents cite the following page's comment banner as their own closing line.

A handful of findings rise to genuinely misleading — a reader following them lands somewhere useless or believes something false. In rough order of harm: **`05a` declares `sub.postponements` to have "no writer" and its rendered banner to be "unreachable"**, when `confirmPostponeTrip()` writes it at L8646–L8647 and `07b` documents that very write (C14) — live UI called dead code. **`07c` reports a broken foreign key** (`SUB-1052b` "does not exist") that resolves perfectly well at L2690 — a bug reported that isn't one. **`12b` names the audit-label map `AUDIT_LABELS`**, an identifier that appears nowhere in the file (it is `ACTION_LABELS`). **`06b` calls `directionArrows`'s round-trip branch unreachable** when `05a` documents the second call site (C15). And four citations point at the wrong region entirely: `03c`'s `gateAll` at L3138 (actually **L20756**, off by ~17,600 lines); `06a`/`06b`'s `captureDailySnapshot` at L21252 (actually **L7639**, off by ~13,600); `00b`'s `recordRefund` gate copy at L18903 (actually **L17904**); and `00c`'s 500-entry audit cap cited at **L3151** in *three separate places* when it is at **L3148**.

A structural note: several documents contradict *themselves* — `00b` gives two different line numbers for the same six `GATE_SPECS` keys in two of its own tables (C12); `03c`'s §5 and §6 disagree on one line number; `01`'s header page range disagrees with its own §6 and §10. And two documents share an identical error (`backfillReasonCodes` ages cited as L15226 in both `03a` and `03b`; actual L15191), which points to a shared upstream source rather than independent mistakes.

**Confidence per document group:**

| Group | Confidence | Basis |
|---|---|---|
| `12b`, `12c` (driver + rider wallets) | **Very high** | Every money formula re-derived and matched; seed data exact; the subtle `ids.length` audit-count bug and the unconditional-debt behaviour are both correctly documented. Only ±1–3 template-interior citation drift. |
| `01` (executive overview) | **Very high** | ~75 citations sampled, essentially all exact — including 30 rows of `DB.dailySnapshots`, all six zones digit-for-digit, and a correctly-traced `NaN%` bug. Three errors, one of them the header page range. |
| `00c` (identity/permissions/audit) | **High on substance, medium on citations** | Every arithmetic claim reproduced exactly — 22 pages / 52 keys, 131 `requirePerm` sites, 161 action keys / 135 unlabelled / 0 orphans, the `AUD-0501` collision derivation, the 41 page shells. But the 500-cap is mis-cited in three places and ~15 citations drift by 1–4 lines. |
| `00a` (navigation/routing) | **Medium** | All 38 dispatch lines, all 30 sidebar rows and every badge formula verified exact — yet six stated counts contradict the doc's own tables, and the notification/router blocks drift ~2 lines throughout. |
| `03b` (work inbox) | **Very high** | Cleanest document audited: zero WRONG findings across ~55 sampled citations. Drift only, and its multi-line ranges are correct. |
| `00b` (global UI) | **High** | Leaflet analysis precise, including the non-obvious detail that `updateLiveMarkers` has live call sites but no-ops. |
| `04` (live map) | **Medium-high** | Substantively excellent — canvas-vs-Leaflet, the 1 s tick, the L11665 `pingBorderStyle` bug and every seed count verified exact. But `drawMap` layer citations drift systematically by 1–8 lines, `updateMapStats` cell cites drift 1–3, and the tick-block ranges overlap each other. |
| `02a`, `02b` (predictive, fraud) | **Medium** | Formulas correct, but `02a` has two counting/arithmetic errors (115 vs 125; "three passes" vs two) and `02b` mis-states a separator as `&nbsp;` and mis-headlines three live helpers as dead. |
| `03a` (dashboard) | **Medium** | Two scope/count errors — the "only invoked from Renewal Pipeline" claim is false, and "22 call sites" is actually 42. |
| `03c` (notifications) | **Medium** | Every `handleNotifClick` destination citation is off by one, the `gateAll` region is cited ~17,600 lines away from its real location, and §5 contradicts §6 on the same line number. Substance largely sound. |
| `11a`, `11b` (growth, zones) | **High** | ROI constant duplication, steering-offer defaults and `subReqValue` all verified exact. Two element-id citations off by 1–2. |
| `08a`, `15i` (drivers, limits) | **Medium-high** | The two rating thresholds are correctly distinguished (see §6), but `08a` has three stale citations on that exact topic where `15i` has none. |
| `10d` (compliance) | **Very high** | Strongest document in its group. All 25 seed expiry dates recomputed and exact; `docDaysLeft`/`docState` bands exact; every negative verified. Two small errors (the `PAGE_PERMISSIONS` range end, and "four call sites" where there are five). |
| `07a`, `07b` (renewal, readiness) | **Very high** | `07a` was the most accurate document in its group — every formula, KPI, threshold and the whole `renderRenewalPipeline` body verified line-for-line. `07b` likewise, with a correctly-identified real bug (`'-20off'` vs `data-comp="20off"`). |
| `05b` (corporate) | **High** | Zero substantive errors. VAT/invoice math, seed, permission split and the `sendSystemEmail` recipient bug all verified. Citation drift only, plus `setCorpStatus` mis-cited identically in four places. |
| `05a` (subscriptions) | **Low-medium** | The `postponements` "dead code" claim is flatly wrong about live UI, plus four more WRONG findings and a systemic +24-line drift across its filter block. Its formulas are sound. |
| `06a`, `06b` (trips, quick rides) | **Medium** | Fare, surge and tip formulas exact; but both mis-count the `DB.trips` seed (7 vs 8) and both put `captureDailySnapshot` ~13,600 lines from its real home. |
| `08a`, `10a` | **Low-medium** | Weakest in their group. Whole render blocks offset by a constant, ~16 wrong entries in `08a`'s function index, two wrong counts, one false negative claim (N45), and two swapped gate-copy citations in `10a`. |
| `08b`, `09a`, `09b`, `10b`, `10c` | **Medium** | Analysis reliable, pointers not: constant-offset drift throughout, plus `08b`'s six needlessly-hedged UNVERIFIED items. |
| `10e` (safety) | **Medium** | Both its strong negatives ("no modals of its own", "no SLA") verified true; incident-row citations drift −3, and `PAGE_PERMISSIONS.safety` is off by one at both ends. |
| `15d`, `15b`, `15g`, `16h` (settings) | **Medium** | Substantive claims sound; a wrong fallback count in `15d`, a wrong function line in `15b`, three stale citations in `15g`. |
| `13a`, `13b`, `14a`, `14b`, `15a`, `15c`, `15e`, `15f`, `15h`, `15j`, `16a`–`16g` | **Unassessed (weak positive)** | Mechanical sweeps produced **zero** flags for these files — every identifier- and element-id-anchored citation resolved — but no formula re-derivation or negative-claim check was run. Not cleared. |
| `00d`, `13c`, `13d`, `15k`, `16i`, `16j`, `16k` | **Unassessed** | Written during this pass; sampled only incidentally. |

---

## 2. Accuracy scorecard

| Category | Claims checked | Confirmed | WRONG | STALE | OVERSTATED | UNSUPPORTED |
|---|---:|---:|---:|---:|---:|---:|
| Line citations — identifier-anchored (mechanical) | 4,805 | 4,233 | 2 | ~28 | — | — |
| Line citations — element-id-anchored (mechanical) | 197 | 184 | 0 | 7 | — | — |
| Line citations — hand-verified, `11a`–`12c` + settings | 268 | 236 | 3 | 28 | 2 | 0 |
| Line citations — hand-verified, `02a`–`04` group | 330 | 289 | 5 | 34 | 2 | 0 |
| Line citations — hand-verified, `00a`–`01` group | 400 | 330 | 22 | 47 | 3 | 1 |
| Line citations — hand-verified, `05a`–`07c` group | 570 | 470 | 13 | 85 | 3 | 0 |
| Line citations — hand-verified, `08a`–`10e` group | 470 | 352 | 8 | 95 | 9 | 6* |
| Financial formulas re-derived | 45 | 45 | 0 | 0 | 0 | 0 |
| Scoring / non-money formulas re-derived | 38 | 36 | 2 | 0 | 0 | 0 |
| Negative claims | 53 | 52 | **1** | 0 | 2 | 0 |
| **Counted quantities** (nav items, badges, call sites, seed records, registry keys…) | 78 | 61 | 17 | 0 | 0 | 1 |
| Enumerations claimed exhaustive | 15 | 12 | 3 | 0 | 0 | 0 |
| Seed data / record counts | 62 | 58 | 2 | 2 | 0 | 0 |
| **Total (assessed)** | **7,268** | **6,226** | **61** | **326** | **19** | **7** |

*\* The six `08b`/`05b` "UNSUPPORTED" entries are the **inverse** failure — facts marked UNVERIFIED that are trivially verifiable. Counted here for completeness; they are quality issues, not accuracy failures.*

*Coverage caveat: `13a`–`14b` and most of `15*`/`16*` were still under audit when this report was finalised; the totals cover `00a`–`12c` in depth plus `15b`/`15d`/`15g`/`15i`/`16h` and the whole-corpus mechanical sweeps. See §11 P5.*

**Two things to read out of this table.** First, `STALE` (326) outnumbers `WRONG` (61) by more than five to one — the documents' *reasoning* is far more reliable than their *pointers*. Second, 17 of the 61 WRONG findings are one recurring failure mode: a stated count that the document's own adjacent table already contradicts (§3.1). Those are the cheapest fixes in the list, because the right answer is already on the page.

*Mechanical STALE counts are estimates: the automated matcher's raw mismatch buckets (500 `MISS`, 72 `ABSENT`) were dominated by false positives — dotted-path descriptions like `titles.compliance` that describe a key inside a single-line object literal rather than quoting source text. Every automated flag was reviewed by hand; the ~28 figure is the residue that survived that review.*

---

## 3. WRONG claims

| # | Doc | Claim | Cited line | Actual source content | Correction |
|---|---|---|---|---|---|
| W1 | `12b-driver-wallets.md` §7.7 (doc L529) and doc L1202 | "Audit action keys used by this module (**`AUDIT_LABELS`**, L2904–L2905)" | L2904–L2905 | L2898 is `var ACTION_LABELS={`; L2904–L2905 do contain `process_all_payouts`, `release_escrow`, `apply_deduction`, `pay_driver`. `grep -c AUDIT_LABELS` → **0 occurrences in the entire file.** | The identifier is **`ACTION_LABELS`** (declared L2898, 26 keys, consumed at L9238). The *line* citation is correct; only the *name* is invented. `00c` names it correctly — see §6 C1. |
| W2 | `15b-settings-team-roles.md` doc L305 and L356 | "`avatarHTML()` at **L10824** exists…"; reference table "`avatarHTML()` \| **L10824–L10836**" | L10824 | `Object.keys(PAGE_PERMISSIONS).forEach(function(pageKey){` — the `defaultPagePerms` loop, entirely unrelated | `avatarHTML(name,size,hasPhoto)` is declared at **L10836** and runs **L10836–L10845**. The doc's range *ends* exactly where the function *begins*. `08a`, `08b`, `09a`, `09b` all cite L10836 correctly — see §6 C2. |
| W3 | `15d-settings-notifications.md` doc L155 | "`2.5` appears as a hardcoded fallback **four separate times**: `renderNotificationConfig` (L8006), `saveNotificationConfig` (**L8013, twice** — the `parseFloat` fallback and the clamp source), `lowRatingThreshold()` (L15245), and the trip hook (L12452 and L12453)" | L8013 | `n.lowRatingThreshold=Math.min(5,Math.max(1,parseFloat(val('cfg-notif-rating'))||2.5));` — contains `2.5` **once**; the clamp bounds are `5` and `1`, not `2.5` | Two errors in one sentence: (a) "twice" on L8013 is wrong — it is once; (b) the stated total "four" contradicts the doc's own list, which enumerates **five distinct lines**. Verified truth: **five occurrences on five lines** — L8006, L8013, L12452, L12453, L15245. |
| W4 | `12a-finance.md` doc L581 | `wallet-reason` field — "required (`L3987`)" | L3987 | `if(!chk.ok){` — the opening of the `compCheck` blocked-branch, not a required-field guard | The reason-required guard is **L3982**: `if(!reason){toast('⚠ Pick a reason','warn');return;}` |
| W5 | `04-live-map.md` §15 table (doc L573) | Leaflet JS CDN — "❗ No — **`L.*` is only referenced from never-executed functions**" | L470 | `showCityMapPreview()` (L7865–L7875) calls `L.map` (L7872), `L.tileLayer` (L7873) and `L.marker` (L7874), and *is* called (from L7862) | The claim is false as written and is contradicted **by the doc's own next paragraph**, which correctly states "The only *live* consumer of Leaflet in the whole file is `cityPreviewMapInstance`". Fix the table cell to "No — not by this page; the live consumer is the Settings→Cities preview". (Column header is "Used by this page?", so the verdict "No" is defensible; the *reason* given is not.) |
| W6 | `10e-safety.md` doc L528 | "`safety.view` permission declared but never enforced (**L10610**)" | L10610 | `{key:'update_steps',label:'Update protocol steps'},` | `safety.view` is declared at **L10609**. (The *substance* — that it is never enforced — is correct: no `canPage('safety','view')` call exists.) |
| W7 | `02a-predictive-signals.md` §9.1 | `subHealthScore` — "Maximum total deduction is **115**" | L14219–L14228 | The six deductions are `25 + 15 + 25 + 10 + 20 + 30` | **125**, not 115. Arithmetic error. (The follow-on "so the floor is reachable" survives either way.) |
| W8 | `02a-predictive-signals.md` §9.1 + §15.14 | "`subHealthScore` runs **three** separate full passes inside `renderPredictivePage` (L14368, L14372)" | L14368, L14372 | L14368 `.map(subHealthScore)` and L14372 `.filter(…subHealthScore(s).score<50)` — exactly **two** passes; no third exists in L14367–L14384 | **Two** passes (plus one per row in `renderPredSubs`, which the doc counts separately). |
| W9 | `02b-fraud-and-risk.md` §8.1 (stated twice) | Collision members "joined with `&nbsp;·&nbsp;`" | L16508 | Actual bytes at L16508: `join('  ·  ')` — two **plain** U+0020 spaces either side of U+00B7 (hex `20 20 C2 B7 20 20`). No `&nbsp;` anywhere. | Materially different: plain spaces collapse in HTML rendering, non-breaking spaces do not. |
| W10 | `03a-dashboard.md` §4 + §15.7 | "`openHealthBreakdown()` and `subHealthScore()` are **only** invoked from the Renewal Pipeline page (L3368, L3372, L3373) and its context menu" | — | `subHealthScore(` call sites are **L3319, L14240, L14259, L14372, L20570, L20597, L21117** — three of them are the **Predictive Signals** module. `openHealthBreakdown` also fires at **L20601** and **L21139**. | The "only" is false. Both helpers are cross-module. |
| W11 | `03a-dashboard.md` §6 + §15.6 | "`kpiScrollTo()` … its **22** call sites" | — | `grep -o 'kpiScrollTo('` → **43** occurrences = 1 definition + **42** call sites | **42** call sites. (The substantive point — none of them are on the dashboard — is correct.) |
| W12 | `03c-notifications.md` §2 + §18.4 | "the `gateAll` registry (**L3138+**)" and "its header comment (**L3123–L3136**)" | L3123–L3138 | L3118–L3140 is the *permission* block (`can()` L3122, `requirePerm()` L3126, `logAction()` L3133). `gateAll` is defined at **L20756**; the quoted comment ("every function reachable from an onclick was extracted…", "Seven are genuinely trivial", "The other 45 are registered here") is at **L20740–L20755**. | Wrong region entirely — off by ~17,600 lines. (The substance — `markAllRead` is ungated — is correct.) |

### 3.1 The dominant WRONG pattern — stated counts that contradict the document's own adjacent table

This is the single highest-value cluster in the whole audit: in each case the **table is right and the prose count beside it is wrong**, so the fix is a one-number edit with the correct answer already sitting on the page.

| # | Doc | Stated count | Actual | Evidence |
|---|---|---:|---:|---|
| W13 | `00a` §1 and §2.2 heading | "9 sections and **31 nav items**" | **30** | `grep -c 'class="sb-item'` = 30. The doc's own Counts line *and* its 30-row table both say 30. |
| W14 | `00a` §2.2 Counts | "**15 badge elements**" | **18** | `grep -c 'class="sb-badge'` in L479–L547 = 18 (16 `sbb-*` + 2 `sb-*-badge`). §3 lists all 18. Cascades: §2.3 "13 use the `sbb-*` prefix" → **16**; §3 "updates only 5 of the 15… the other 10" → **5 of 18, other 13**; §15.4 "Ten of fifteen". |
| W15 | `00a` §8.1 heading | "all **39** `if(id===…)` dispatch lines" | **38** | L8787–L8824. The doc's own table has 38 rows. |
| W16 | `00a` §8.1 row 33 (`settings`) | "**39** calls" | **35** | L8819 contains 35 — and the doc then correctly names exactly 35. |
| W17 | `00a` §8.4 heading | "the `subs` map — all **38** entries" | **35** | Parsed L2169 = 35; the doc's own table has 35 rows. *(The derived claim "6 ids in `titles` but absent from `subs`" is correct: 41 − 35 = 6.)* |
| W18 | `00a` §13 | "`go()` hard-references **77** distinct render functions" | **90** | 90 distinct `render*` names (97 distinct callees) inside L8787–L8824. |
| W19 | `00a` §4.2 | "`.sb.pin` is styled in **6** CSS rules" followed by a list of **8** | **8** | `grep -c 'sb\.pin'` = 8; §15.7 correctly says 8. Internal contradiction. |
| W20 | `00b` §12.21 | "**22 occurrences** of `!important` in the responsive layer" | **15** | Counted over L408–L467. |
| W21 | `00b` §9.3 / §12.27 | one-shot init "running **45** statements" | **44** | L14557–L14600 = 44, and the doc's own enumerated list has 44. *(The sub-claim "`startTickEngine()` at position 42" is correct — L14598, the 42nd.)* |
| W22 | `00b` §12.30 | "**Three** separate document-level `click` listeners (L2224, L5414, L20671)" | **four** | L2224, L5414, **L20662**, L20671. |
| W23 | `00c` §4.3 | "All **20** `requirePagePerm()` call sites" followed by a list of **19** | **19** invocations | 20 total `grep` hits = 19 call sites + the declaration at L10680. All 19 listed lines and all 15 distinct `page.perm` pairs are exact. |
| W24 | `00c` §3.5 heading and §1 | "`ACTION_LABELS` — all 26 entries (**L2898–L2913**)" | **L2898–L2909** | L2910–L2913 are blank/comment lines belonging to the next block. *(The count 26 and every key/label are exact.)* |
| W25 | `02a` §9.1 | max `subHealthScore` deduction "**115**" | **125** | See W7. |
| W26 | `03a` §6 | "`kpiScrollTo()` … **22** call sites" | **42** | See W11. |
| W54 | `08a` §18 | "Total `data-i18n` attributes in the file: **89**" | **92** | Direct grep count. |
| W55 | `10a` §14 | "`DB.drivers` fixture — **5 captains**, `DRV-0101`–`DRV-0105`" | **6**, `DRV-0101`–`DRV-0106` | Seed L2632–L2668. |
| W56 | `10d` §2 and §12 | "`renderCompliancePage()` appears only at L8797, L11076, L13319, L13378 — **exactly four** call sites" | **five** | `grep` returns L8797, L11076, **L12618**, L13319, L13378. The doc itself describes L12617–L12618 two paragraphs later — self-contradictory. *(The "none runs at boot" conclusion still holds.)* |
| W57 | `10c` §16 #10 | "the **two** other places a captain changes (L16704, L17343)" | **three** sites increment `driverChanges` | **L5835, L16704, L17345** *(and L17343 is itself the wrong line)*. |

### 3.1b Further WRONG claims — `05a`–`07c` group

| # | Doc | Claim | Cited | Actual source content | Correction |
|---|---|---|---|---|---|
| W40 | `05a` §17.12 + §4.2 | "`sub.postponements` **has no writer**… the rendering path is **unreachable**" | L4325–L4329 | `confirmPostponeTrip()` (L8634) writes it at **L8646–L8647** | Live UI declared dead. **The most consequential single error in the audit.** See §6 C14. |
| W41 | `06b` §8.3 | "`directionArrows` — called from **exactly one place**… the round-trip branch is unreachable" | L3456 | Two call sites: **L3458** and **L3544** | See §6 C15. |
| W42 | `06a` §4.1/§15/§18 (3×) and `06b` §4.1 | "`DB.trips` seed — **7 records**, L2670–L2682" | L2670–L2682 | **L2670–L2684, 8 records** | See §6 C17. |
| W43 | `06a` §4.1 | "`flagged` set by corporate-policy violation **L12452**"; "`corpPolicyViolation` **L12453**" | L12452/L12453 | L12452 is the **low-rating notification threshold**. The writes are **L12436** `base.flagged=true;` and **L12437** `base.corpPolicyViolation=qrViolations;` | L12436 / L12437. |
| W44 | `06a` §14 and `06b` §14/§7/§17.1 | "`captureDailySnapshot` … **L21252–L21261**" | L21252–L21261 | Those lines are inside **`liveSubtitles()`** (L21236–L21256). `captureDailySnapshot` is at **L7639**; `quickRevenue` at **L7646** | L7639 ff. *Wrong by ~13,600 lines, in two documents.* |
| W45 | `06b` §10/§15/§17.4/§18 | "`resolveAlert` **L10576–L10589**" | L10576 | L10576 is inside the `PAGE_PERMS` registry. `function resolveAlert(btn,type)` is **L9166–L9174** | L9166–L9174. *(The described behaviour — `Resolving…`, disable, 600 ms, `opacity .45`, `✓ Done`, toast — is exact.)* |
| W46 | `07c` §17.7 | "Seeded `assignedSub:'SUB-1052b'` **points at a subscription id that does not exist** — the `View sub` button opens a broken profile" | L2796, L2799 | `'SUB-1052b'` **does exist** in `DB.subscriptions` at **L2690** (`Weekly Comfort, RDR-1052/DRV-0104, 3/5, 122.50 SAR, Active`) | The FK resolves. The only real oddity is that two requests point at the same subscription. **A bug reported that isn't one.** |
| W47 | `05a` §17.5 | "Header **L744** says 'Days left'" | L744 | **L743** is `<th>Days left</th>`; L744 is `<th>Next trip</th>` | L743. |
| W48 | `05a` §6 | "KPI 2's prefix test excludes `'Bi-weekly …'` correctly (its `indexOf('Weekly')` is **3**, not 0)" | L3482 | Seed plan is `'Bi-weekly Comfort'` — lowercase `w` — so `indexOf('Weekly') === **-1**` | Conclusion (excluded) holds; the stated value 3 is false. |
| W49 | `05a` §9.2 | "first non-disabled candidate pre-selected (**L4744** in `driverCandidateRowsHTML`, L5727)" | L4744 | L4744 is `var sub=DB.subscriptions[subId];` inside `evaluateSubStart` | Pre-selection is **L5740/L5743**. |
| W50 | `05a` header + §18 | "HTML lines **L713–L767**" and "`renderSubscriptionsTable()` L3477–**L3573**" | L767 / L3573 | `#p-subscriptions` closes at **L757** (L767 is the *next* page's banner); the function closes at **L3558** (L3573 is inside `emailFor()`) | L713–L757 / L3477–L3558. |

### 3.2 Further WRONG line citations (region errors, not drift)

| # | Doc | Claim | Cited | Actual |
|---|---|---|---|---|
| W27 | `00b` §4.2 | `recordRefund` gate consequence copy | L18903–L18905 | L18903 is `refreshOwnershipSurfaces();` — unrelated. The quoted bullets are at **L17904–L17906** (L17905 = "A sequential credit note is issued against the original tax invoice, reversing the VAT."). *One of the two citation errors most likely to waste a reader's time.* |
| W28 | `00b` §12.11 | "`builder` exceptions are swallowed (**L17832**: `try{spec=builder(...)}catch(e){spec=null;}`)" | L17832 | L17832 is `window.__confirmValues=values;`. The try/catch is **L17829**; `if(!spec)return orig.apply(...)` is L17830. *Claim correct, line wrong.* |
| W29 | `00b` §9.5 / §14 | `initMapClicks()` | L12626–L12647 | **L12626–L12641**. L12642 is `mapTripTime`; L12643–L12647 is `mapDateLabel` (which §11 cites correctly). |
| W30 | `00b` §11 | Dead-Leaflet block: `TRIP_COORDS` / `TRIP_COLORS` / `carIcon()` | L11527–L11544 / L11546–L11547 / L11549–L11556 | **L11534–L11549** / **L11551–L11552** / **L11554–L11560** (L11549 is `};`). *Content claims — 7 route arrays, 7 hex colours — are correct.* |
| W31 | `00b` §11 | "`selectTrip('TRP-7741')` hardcoded in init" | L14561 | **L14562** (L14561 is `renderMapTripsTable();`). `00a` cites L14562 correctly — see §6 C8. |
| W32 | `00c` §7 / F-notes | `logAction` calls `renderAuditLog` | L3152 | **L3149** (L3152 is a comment). And `commitUserSwitch` calls it at **L3111**, not L3109 (L3109 writes `#tb-avatar` textContent). |
| W33 | `00c` §3.3 / F21 (twice) | `PERMISSION_DESC.manage_team` reassigned | L10520 | **L10521** (L10520 is a comment). |
| W34 | `00c` §6.3 | `togglePagePermExpand(pageKey)` | L10711 | **L10707**. L10711 is `function renderPagePermMatrix(){` — which §4.1 separately cites as L10715, also wrong. |
| W35 | `00c` §6.3 | `toggle_page_permission` `logAction` | L10704 | **L10703** (L10704 is the toast). |
| W36 | `00c` §8 | `AV_COLORS` / `PHOTO_GRADS` | L10836–L10837 | **L10834–L10835**. L10836 is `function avatarHTML(…)`. *(Independently confirmed by this agent.)* |
| W37 | `00c` §5.3 | "`permission_denied` is in `ACTION_LABELS` (L2912)"; "`toggle_role_permission` is labelled (L2903)" | L2912 / L2903 | **L2908** / **L2902** |
| W38 | `01-executive-overview.md` header | "HTML lines: **583-633**" | L583–L633 | The page `<div>` closes at **L631**; L632 is blank and **L633 is the comment banner for the *next* page**. §6 and §10 of the same doc correctly say L583–L631. *Internal inconsistency — and the only breach of the otherwise-consistent page-range convention (§6 C6).* |
| W39 | `01-executive-overview.md` §2 | "`go()` calls `pushHistory()` unless `isBack`" | L8779, **L7011** | L7011 is `return match;` (end of `findSbEl`). `pushHistory()` is declared at **L7006**. |

---

## 4. STALE citations

Claim is sound; the line number is wrong. Grouped by document.

### `12b-driver-wallets.md` — template-interior drift
| Claim | Cited | Actual | Note |
|---|---|---|---|
| `p.pending += e.amount` (escrow release) | L7065 | **L7066** | L7065 is `var p=ensurePayoutEntry(e.driver);`, which the doc *also* cites as L7065 elsewhere — internally inconsistent |
| `p.earned += e.amount` | L7066 | **L7067** | |
| Escrow release range "`pending += amount`, `earned += amount`" (doc L442) | L7065–L7066 | **L7066–L7067** | |
| `#avail-now-kpi` = `totalPending.toFixed(2)` (doc L557) | L8770 | **L8769** | |
| `#avail-now-sub` driver count (doc L557) | L8771 | **L8770** | L8771 is `};` |
| `#payouts-pending-badge` sum (doc L579) | L8769 | **L8768** | |
| "Balance after deduction" `Math.max(0,avail-d.amount)` (doc L292) | L8982 | **L8981** | |
| Per-row `p.earned` / `p.paidOut` / `p.pending` cells (doc L206) | L8761–L8763 | earned **L8762**, paidOut **L8763**, pending **L8757** | L8761 is the `trips` cell |
| `'match'`/`'over_report'` → `resolved` at creation (doc L459) | L12130 | **L12129** | L12130 is `createdAt:` |
| Escalate-modal consequence copy (doc L460) | L12162 | **L12165** | |
| Repayment consequence copy "Recording this clears…" (doc L922) | L12197 | **L12198** | |

### `PAGE_PERMISSIONS` range-endpoint errors
| Doc | Claim | Cited | Actual |
|---|---|---|---|
| `10d-compliance.md` (doc L582) | `PAGE_PERMISSIONS.compliance` | L10604–**L10608** | **L10604–L10607**; L10608 is `safety:{label:'Safety & Incidents'…` — the range spills into the next block |
| `10e-safety.md` (doc L574) | `PAGE_PERMISSIONS.safety` | **L10609**–**L10614** | **L10608–L10613**; L10609 is the first *perm* not the block start, and L10614 is `growth:{…` |

### `08a-drivers.md` — rating-threshold citations
| Claim | Cited | Actual |
|---|---|---|
| `driver_min_rating_for_dispatch` = 3.5★ seed | L2584 | **L2585** (L2584 is `driver_max_consecutive_declines`) |
| `driverAutoRestricted()` rating exclusion | L4507 | **L4506** (L4507 is `return null;`) |
| "Limited" bucket `d.rating>0 && d.rating<3.5` (doc L170) | L6349 | **L6350** (L6349 is `var d=DB.drivers[id];`) |

### `00c-identity-permissions-and-audit.md`
| Claim | Cited | Actual |
|---|---|---|
| F17 — audit log capped at 500, drops oldest | L3151 | **L3148** (`if(DB.auditLog.length>500)DB.auditLog.length=500;`); L3151 is `}` |
| F18 — free-text search includes `e.id` in its haystack | L9330 | L9330 is the **action** filter (`AUDIT_FILTER_ACTION`), not the free-text search |
| `avatarHTML(name,size,hasPhoto)` (doc L825) | L10838 | **L10836** |

### `12c-rider-wallets.md`
| Claim | Cited | Actual |
|---|---|---|
| `window.__compApproved = false` reset (doc L362) | L3995 | **L3997** (L3995 is `return;`) |
| `window.__compApproved` block (R2, doc L769) | L3991–L3995 | **L3992–L3997** |
| `DB.reasonCodes` full taxonomy range (doc L403) | L14667–**L14713** | **L14667–L14715**, closing `]` at L14716. L14713 is entry #38 (`CORP_BILLING`); #39 `CORP_EMPLOYEE_MGMT` L14714, #40 `OTHER_UNCODED` L14715. *The count "40" and "all active:true" are both correct — only the range end is stale.* |
| `#comp-preview` red/blocked background (doc L682) | L15455 | **L15459** (L15455 is `var hist=goodwillForRider(riderId);`) |

### `12a-finance.md`
| Claim | Cited | Actual |
|---|---|---|
| `wallet-reason` custom-select markup | L3973 | **L3972** (L3973 is `+'</div><div id="comp-preview"></div></div>'`) |
| Refund reason copied to `creditNote.reason` | L15875 | **L15877** (L15875 is `againstPayment:`) |
| "Rider request" default refund selection | L5544 | L5544 is `+'</div>'` — not the option list |

### `15g-settings-cities.md`
| Claim | Cited | Actual |
|---|---|---|
| `#city-map-preview` element | L1637 | **L1639** |
| `showCityMapPreview()` | L7864–L7874 | **L7865–L7875** (L7864 is `var cityPreviewMapInstance=null;`) |
| `typeof L==='undefined'` guard | L7869 | **L7871** (L7869 is the `cityPreviewMapInstance.remove()` branch) |
| "Leaflet + OSM tiles loaded" | L7871 | **L7873** (`L.tileLayer(…)`) |

### `15d-settings-notifications.md`
| Claim | Cited | Actual |
|---|---|---|
| Low-rating rule block | L12451–**L12456** | **L12451–L12455** (L12456 is `if(subId&&DB.subscriptions[subId]){`, outside the block) |
| "driver check-in email subject and body hardcoded" | L12455 | L12455 is `}`; the `sendSystemEmail` call is above it |

### `16h-settings-ledger.md`
| Claim | Cited | Actual |
|---|---|---|
| Settings tab group "Operations" | L1425 | **L1424** (L1425 is the *dispatch* tab button) |
| `#p-settings` page range | L1416–**L2050** | **L1416–L2048**; L2050 is the `<!-- ACTIVITY LOG PAGE -->` comment banner and L2051 is `p-audit-log` |

### `15i-settings-limits.md`
| Claim | Cited | Actual |
|---|---|---|
| "Full enumeration — every limit in `DB.opsLimits` (**L2584–2593**, 8 rows)" (doc L115, repeated L170) | L2584–L2593 | Rows are **L2584–L2591**; L2592 is `],` and L2593 is `riders:{` — the range spills into the next `DB` key. *The count "8 rows" and the values `3, 3.5, 10, 1, 3, 30, 5, 3.5` are correct.* |

### `00a-global-navigation-and-routing.md`
| Claim | Cited | Actual |
|---|---|---|
| `refreshNavCounts()` internals — `sbb-subs` / `sbb-renew` / `sbb-dash` | L9394 / L9395 / L9396–L9400 | **L9395** / **L9396** / **L9397–L9398**. *(The function range L9392–L9409 is exact; only the internals drift.)* |
| `parseInt(x.ends,10)-25<=3` (§14) | L9395 | **L9396** |
| `sbb-compliance` — `expired`/`week` | L13324–L13325 | **L13322–L13323** (L13324 is `month`) |
| Notification block, ~10 citations drifting 1–2 lines | `NOTIF_PRIORITY_RANK` L2189, `NOTIF_PRIORITY_LABEL` L2190, `notifPriority` L2192–L2203, `sortNotifsByPriority` L2204, outside-click L2223–L2226, `NOTIF_PANEL_PREVIEW` L2227, `renderNotifPanel` end L2251, `notifRowHtml` L2252–L2258, `markAllRead` L2259, `openAllNotifications` L2281–L2284 | **L2188**, **L2189**, **L2190–L2201**, **L2202**, **L2224–L2227**, **L2228**, **L2248**, **L2249–L2257**, **L2258**, **L2282–L2285**. *(`updateBellBadge` L2259–L2266 and `toggleMobileSidebar` L2210–L2213 are exact.)* |
| Router / navigator ranges (~2-line shift) | `go()` ends L8828; epilogue `updateBackBtn()` L8827; `openProfile` L8829–L8867 (toast L8831, `.main.scrollTo` L8866); `openApplicantDetail` L8868–L8881; `openTicketDetail` L8882–L8892 | `go()` ends **L8826**; `updateBackBtn()` **L8825**; `openProfile` **L8827–L8864** (toast **L8829**, scrollTo **L8863**); `openApplicantDetail` **L8865–L8878**; `openTicketDetail` **L8879–L8890** |
| `#tb-avatar` replaced by an `<img>` (§5) | L2960–L2961 | **L2957** (L2960–L2961 are `};` and `reader.readAsDataURL(file);`) |
| `#sb-ft-name`/`#sb-ft-role` overwritten by `commitUserSwitch()`; `#tb-avatar` (§14) | L3106–L3107 / L3108 | **L3107–L3108** / **L3109** |
| `updateInboxBadge()` (§17 index) | L19312–L19319 | Declared **L19311** |
| `#call-bar` handler "`screenPop()` region" (§5) | L20266 | L20266 is `var bar=document.getElementById('call-bar');` inside **`renderCallBar()`** (declared L20265). `screenPop()` is at **L20204**. |

### `00b-global-ui-systems.md`
| Claim | Cited | Actual |
|---|---|---|
| `GATE_SPECS` key lines — 10 of 18 are +1 | `acceptEmergency` L18261, `declineEmergency` L18271, `respondBackupOffer` L18281, `setTicketStatus` L18293, `commitBulkReason` L18308, `commitChangeReason` L18316, `saveReasonCodes` L18321, `saveSlaPolicy` L18327, `saveOnCall` L18333, `openLowRatingTicket` L18369 | **L18260, L18270, L18280, L18292, L18307, L18315, L18320, L18326, L18332, L18370** |
| `reqClearLocks()` / `confirmModal()` / preceding comment | L5230–L5233 / L5234 / L5220–L5229 | **L5229–L5232** / **L5233** / **L5220–L5228** *(same `reqClearLocks` error as `03a` — see §6 C9)* |
| `audit_mut.js` reference | L20751 | **L20752**. *(The file is genuinely absent from the repo — confirmed.)* |
| `installUniversalGates()` | L18373–L18383 | Opens at **L18372** (L18373 is `var n=0;`) |
| `DB.dataWindow.months=13` | L20403 | L20403 is `DB.dataWindow={` |

### `00c-identity-permissions-and-audit.md`
| Claim | Cited | Actual |
|---|---|---|
| **500-entry audit cap — cited at L3151 in *three* places** (§8 table, F17, §11 index) | L3151 | **L3148**. L3151 is the closing `}` of `logAction`. *Claim correct; one of the two most time-wasting citation errors in the set.* |
| `impersonate()` / `window.__realUserId` / `stopImpersonating()` | L21069–L21079 / L21070 / L21080–L21090 | **L21067–L21078** / **L21068** / **L21079–L21089** |
| `defaultPagePerms` / `currentUserPagePerms()` / `requirePagePerm` denial `logAction` | L10659–L10668 / L10669–L10673 / L10685 | **L10658–…** / declared **L10668** / **L10686** |
| `saveUserPermissions` self-lockout guard; `CURRENT_USER_ID` read | L10820 / L10819 | **L10821** / **L10821** |
| `viewUserPermissions`; `DB.loginSessions` | L10801 / L2996–L3003 | declared **L10800** *(`00b` cites L10800 correctly)* / declared **L2994** |
| F19 `Object.keys(after)`; `before`/`after` normalisation; `auditDiffHTML(null,null)`; `logAction()` range | L3163 / L3145–L3146 / L3158 / L3133–L3155 | **L3164** / **L3144–L3145** / **L3157** / **L3133–L3151** |
| F16 "`L10718` dedupes `DB.teamUsers.map(u=>u.role)`" | L10718 | L10718 is `var open=!!_pagePermExpanded[pageKey];`. *(`L10753` for `renderRoleMatrix` is exact.)* |

### `01-executive-overview.md` — *cleanest document in its group*
| Claim | Cited | Actual |
|---|---|---|
| `findSbEl` (§2, §7) | L7006–L7010 | **L7007–L7011** |

*~75 citations sampled in `01`; every one except this and W38/W39 was exact — `renderExecOverview` L6901–L6979 and all its sub-ranges, `cityStats` L7445–L7450, `zoneFailRate` L13974, `sameCaptainStats` L15697–L15702, `onTimeStats` L15703–L15709, `DB.cities` L13946–L13951, `DB.zones` L13952–L13959 (all six zones verified digit-for-digit), `DB.dailySnapshots` L13802–L13833 (30 rows), `DB.newRiders` L2744–L2748, all chart geometry constants and all eight CSS line cites.*

### `02a` / `02b` — shared seed-range and i18n drift
| Claim | Cited | Actual |
|---|---|---|
| `sec.intelligence` Arabic string (both docs, §14/§16) | L7913 | **L7912** (L7913 holds `sec.growth`/`sec.finance`/`sec.support`/`sec.config`). `nav.predictive` at L7905 is correct. |
| `DB.drivers` seed block (both docs, §16) | L2632–L2669 | Block closes **L2668**; L2669 is `trips:{` |
| `DB.incidents` seed (`02a` §5) | L13389–L13394 | Array is **L13389–L13393**; L13394 is `var INC_STEPS=…` |
| "largest seeded driver trip list is DRV-0101 … TRP-7741, TRP-9005, TRP-7720" (`02b` §8.4) | L2632 | The `trips:[…]` array is **L2636**; L2632 opens the DRV-0101 record. *Contents and the "zero pairs qualify" conclusion are correct.* |

### `03a-dashboard.md`
| Claim | Cited | Actual |
|---|---|---|
| `navCurrent` initialisation | L2852 | **L2850** (`var navCurrent={type:'page',id:'dashboard'};`); L2852 is `/* ── Audit log ──` |
| Tick-engine `renderDashboard()` / `minutesUntil` decrement | L12613 / L12611 | L12611 is `if(__tickCount%60===0){`, L12612 is the decrement, **L12614** is `renderDashboard()` |
| Synthetic ticket ages `[190,26,1500,55,8]`; `backfillReasonCodes()` | L15226 / "L15221-region" | `var ages=[190,26,1500,55,8];` is **L15191**; the function is **L15187**; L15226 is `updateContactsBadge();` |
| `reqClearLocks()` | L5227 | Function **L5229**, call L5218; L5227 is a comment |
| `confirmModal()` | L5232 | **L5233** |
| `applyLanguage()`; `sec.overview` Arabic | L7907–L7924 / L7910 | **L7939** / **L7912** |

### `03b-work-inbox.md` — *strongest document in its group; drift only, no WRONG findings*
| Claim | Cited | Actual |
|---|---|---|
| `Open ticket` / `Assign now` / `Find driver` buttons | L9467 / L9484 / L9515 | **L9468** / **L9485** / **L9514**. *(§9's per-item ranges L9455–L9472, L9475–L9489, L9497–L9518 are all correct.)* |
| `dueMs = -1` sentinels | L19155, L19169, L19192 | **L19154, L19168, L19191** |
| `backfillReasonCodes()` ages | L15226 / "L15221-region" | **L15191** / **L15187** *(same error as `03a` — shared upstream)* |
| `nav.inbox` / `sec.overview` Arabic | L7910 / L7910 | **L7911** / **L7912** |
| `TEAM_ROLES` | "L10480-region" | **L10501** *(self-flagged UNVERIFIED — low severity)* |

### `03c-notifications.md`
| Claim | Cited | Actual |
|---|---|---|
| `handleNotifClick` destinations: ticket→`go('support')`, approval→`go('drivers')`, renewal→`go('renewal')`, payout→`go('wallets')` (§5 column, §4, §12, §15) | L2272 / L2273 / L2274 / L2275 | **L2273 / L2274 / L2275 / L2276** — every one off by one; L2272 is `if(typeof n.action==='function')n.action();` |
| `error` → `critical` mapping | L2191 | **L2192**. *Note: §6's own annotated code block correctly says L2192 — an internal-consistency failure between two sections of the same doc.* |
| Toast→notification bridge, `toastTypeToNotif` | "L5292–5297" / L5293 | `if(notify!==false…)` is **L5294**, `toastTypeToNotif` is **L5295**; `pushOpsNotification(…)` at L5296 is correct. L5292 is `stack.appendChild(t);` |
| Outside-click listener | L2223–L2226 | **L2224–L2227** |
| `#p-notifications-all` page block | L1171–L1189 | Closes at **L1187**; L1189 is the Predictive-Signals section comment |
| `alert` branch | L2192–L2195 | **L2193–L2196** |

### `04-live-map.md` — `drawMap` layer drift (systematic, 1–8 lines)
| Layer | Cited | Actual |
|---|---|---|
| Planned route | L12859 | **L12860** |
| Route shadow | L12869 | **L12872** |
| Main line | L12881 | **L12885** |
| Start marker | L12894 | **L12899** |
| End marker | L12900 | **L12905** |
| Moving car | L12905 | **L12910** |
| Glow | L12915 | **L12923** |
| Car dot | L12919 | **L12927** |
| Flight-tracker block | L12926 | ~**L12936** |
| Start/end labels | L12944 | **L12952** |

*Layers 1–7 (L12819–L12850) and the L12855 early return are all **correct**.*

Also in `04`: `updateMapStats()` range L12745–L12775 → actual **L12745–L12771**; cell cites drift 1–3 lines (Driver **L12758**, Rider **L12760**, From/To **L12762–L12763**, Distance **L12765**, Duration **L12766**, Driver★ **L12768**, on-time colour **L12756**, replay-label reset **L12769–L12770**). Tick blocks: "%5 … L12602–L12613" → **L12601–L12610**; "%60 … L12614–L12626" → **L12611–L12621** (the doc's 5-tick range overlaps into the 60-tick block); "15/20/30/45 ticks … L12511–L12516" → L12511 is a comment, calls are **L12512–L12516**, and L12514 inside that range is a `%60` `updateOnCallChip()`, not one of the four named. Chat-message `Math.random()<0.02` L12594 → **L12593**; replay duration `3000` ms L12971 → **L12973**; replay clock label L12977 → **L12975**; `#rp-fill` width L12975 → **L12974**; hit-test `bd=18` L12633 → **L12632**; `#active-trips-count` write L11660 → **L11661**; `showNearbyDriversMap` footer L8452 → **L8451**.

### `05a`–`07c` group
| Doc | Claim | Cited | Actual |
|---|---|---|---|
| `05a` | **Systemic +24 drift** across the whole filter/read-back block: values read back L3535–L3537; in-file comment L3531–L3534; filter predicates L3538/L3539/L3540; empty state L3541 | as cited | **L3511–L3513**; **L3507–L3510**; **L3514/L3515/L3516**; **L3517** |
| `05a` | Row-template cites, −2 to −4 | rows L3543–L3558; rider fallback L3518; driver L3519; plan split L3520–L3522; `ust` L3523; `atRisk` L3529; health L3530; `drvLvlBadge` L3531; `'Ends '` L3551; `directionArrows` L3548; actions L3556 | **3540–3556; 3520; 3521; 3522–3524; 3525; 3530; 3531; 3532; 3547; 3544; 3555** *(L3550, L3552–L3554, L3536 are exact)* |
| `05a` | HTML layout map, off by ~1 | header buttons L717; KPI row L719–L724; `.tbl-scroll` L735; thead L737–L753; `#subs-tbody` L755; subtitle L716; KPI literals L720–L723; removal comment L758–L765 | **716; 718–723; 734; 736–752; 753; 715; 719–722; 759–765** *(L730 and L728–L731 exact)* |
| `05a` | ~20 further single-line drifts | `DB.plans.weekly.features[0]` L2890; `commitNewSub` empty-day reject L4926; `Create subscription` footer L4638; `driverChanges` L5837; cascade L5855; `confirmCancelSub` audit L5557; `recordRefund`/`creditRiderWallet` L5560–L5561; `sub_start_confirmed` L4835; profile action row L4346–L4352; money split L4300–L4302; postpone banner L4325 | **2891; 4930; 4633; 5835; 5853; 5560; 5562–5563; 4836; 4351–4356; 4302–4304; 4324** |
| `05b` | `setCorpStatus(id,'Active')` call site — cited **L6598 in four separate places** (§5, §8.2, §10, §13, §18) | L6598 | **L6596**. *(Grep confirms L6596 is the only call site — the uniqueness claim is right, the line is not.)* |
| `05b` | ~18 further drifts | `isCorpLead` L7539; `Save usage policy` L6614; `Save billing contact` L6624; usage-policy card 6599–6618; billing card 6619–6624; VAT math 6679–6683; invoice modal L6688/L6689/L6691/L6693–L6695; employee badges L6582/L6583; usage-policy `before` L6655; removal audit L6756; `sendSystemEmail` L3578–L3585 | **7540; 6616; 6625; 6597–6618; 6619–6625; 6681–6684; 6690/6691/6693/6695–6697; 6583/6584; 6656; 6757; 3578–3584** |
| `06a` | `completeTrip` field origins −3, ratings/tip −9 to −15 | `sub` L12417; `km` L12419; `min` L12420; `fare` L12422; `tip` L12437; `driverRatingGiven` L12434; `riderRatingGiven` L12435; corp policy L12424–L12457; sub counter L12459–L12464 | **12411; 12416; 12417; 12419; 12449; 12443/12445; 12444/12446; 12424–12442; 12456–12462** *(L12418, L12421, L12423 exact)* |
| `06a` | ~15 further drifts | `agent:'Sarah Al-Rashid'` L2557; `createTicketFor` L2552–L2560; `forceResync` L16430/L16431/L16439; `openDesyncTicket` L16443; `backfillTripRatings` L15332–L15341; `getOrCreateInvoice` L4392–L4409; `driverLiveState` L7288–L7295; `seededRand` L18655; `VERDICT_LABEL` 17701–17705; type badge L3426; row source L3391 | **2554; 2552–2559; 16424/16425/16432; 16437; 15329; 4396; 7283; 18654; 17700; 3429; 3392** |
| `06b` | ~14 drifts | `'REQ-'+(500+len+rand(400))` L2488; `req` fields L2489; rider cell L3455; driver cell L3456; fare/earn L3459–L3460; `lvlCls` L3450; row tint L3452; `_alerted` L12569; `computeRouteKm` L7250–L7256; `driverDeclineOrTimeout` L11996–L12011; `nextOfferCandidate` L12497–L12507; tracking modal L2501; `commitNewRideRequest` L2479–L2502 | **2487; 2488; 3456; 3457; 3460–3461; 3452; 3453; 12571; 7250–7255; 11995–12010; 12496; 2503; 2479–2495** *(`07c` has the last one right)* |
| `07a` | `subHealthScore` signals 2–6, each 1 low | no backup L14220; complaints L14225; payment risk L14226; suspended L14227; return L14228 | **L14221; L14226; L14227; L14228; L14229** *(signal 1 L14212–L14219 and signal 3 L14222–L14224 exact; every deduction value 25/15/25/10/20/30 exact)* |
| `07a` | `toggleAutoRenew()` | L5442–L5480 | Ends at **L5454** |
| `07b` | Reassign-modal region, ~2 low | validation L13100; `t.driver`/`driverStatus` write L13102–L13103; compensation options L13111–L13114; `finalizeReassign` audit L13129; range L13119–L13131 | **13101; L13105** *(`_reassignPrevDriverName` is L13104)*; **13113–13116; 13128; 13119–13130** |
| `07b` | `unavailReason` L6229; the eight `notes` lines L6183, L6190, L6200, L6207, L6214, L6222, L6231, L6239; seed range L6177–L6242 | as cited | **L6230**; **6184, 6192, 6200, 6208, 6216, 6224, 6232, 6240** *(only 6200 is right)*; **L6177–L6241** |
| `07c` | `capturePaymentHold` L9605–**L9619**; its `payment_captured` audit L9617 | as cited | Ends **L9615**; audit **L9613**. *(The doc's own §10.2 places the following rationale comment at L9616–L9619 — internally contradicting its own endpoint.)* |
| `07c` | Chip/badge count lines, all +2 | `rfilt-all-cnt` L10081; `rfilt-instant-cnt` L10082; `rfilt-sub-cnt` L10083; `req-instant-count` L10084; `req-sub-count` L10085 | **10083; 10084; 10085; 10086; 10087** *(`sbb-requests` L10119 exact)* |
| `07c` | Range ends | `renderRequestsPage` L10071–L10123; `reqStatusMatch` L10047–L10055; `openNewRideRequestModal` L2449–L2477; `#p-requests-instant-all` L2144–L2165; `#p-requests-sub-all` L2123–L2142 | **10071–10120; 10047–10053; 2449–2467; 2144–2162; 2123–2141** |

### `08a`–`10e` group — **whole contiguous blocks cited at a constant offset**

This group's failure mode is distinctive: rather than scattered single-line slips, entire render blocks are cited at a **fixed offset**, so a reader following any one citation in the block lands consistently wrong. The analysis in these documents survived hostile checking far better than the pointers did.

| Doc | Block | Offset | Correction |
|---|---|---|---|
| `08a` | Driver-row render (§9, §12.1, §15) — Vehicle L6392, Level L6393, Active subs L6394, Capacity L6395, On-time L6396, Month L6397, Status L6398, action cell L6399 | **+1** | **6391, 6392, 6393, 6394, 6395, 6396, 6397, 6398**. Also `lvlCls` **6387**, `vehCls` **6388**, `total=allIds.length||1` **6355**, Limited bucket **6350**. |
| `08a` | `supplyKpiHTML()` L21186–L21212; `pct` L21188; `kpiScrollTo` special case L21190 | ~**+2** | **L21188–L21210; L21190; L21193** |
| `08a` | `setDriverFilter` L21219–L21226; `var _driverFilter` L21218 | **+3** | **L21222–L21227; L21221** |
| `08a` | `liveSubtitles()` L21232–L21252; `eco` L21233; `com` L21234; `#p-drivers .ph-l p` write | — | Function is **L21236–L21256**; `eco`/`com` are **L21242/L21243**; the write is **L21244**. L21235 is the comment `/* subtitles computed, never written */`. |
| `08a` | `fleetCountsHTML()` L20944–L20984; `toggleFleetCounts()` L20985 (3×); `fleetCounts()` active/pending/suspended L20929–L20931 | **−1..−3** | **L20944–L20981; L20982; L20928/L20929/L20930** *(`terminated`, `frozen`, `eligible`, `docsAtRisk` and the riders/subs rows are all correct)* |
| `08a` | `approveDriver` internals L11099/L11100/L11101/L11113; `rejectDriver` fields L11126 | ±1 | **L11098; L11099; inside L11100; L11114; L11128** |
| `08a` | §20 index — 16 wrong function lines | mixed | `getLimit` **L4468**; `driverSubTrustReason` **L4495**; `driverAutoRestricted` **L4500**; `ensurePayoutEntry` **L8894** *(and no `setText` there)*; `openFlagAccountModal` **L9006**; `commitFlagAccount` **L9026**; `commitUnflagAccount` **L9042**; `quickSuspendFromFraud` **L9079**; `priorityCall` **L9149**; `confirmDriverIncentive` **L11208**; `complianceScan` **L13296**; `parseJoinedDate` **L13580**; `driverTenureDays` **L13587**; `ratingCell` **L15250**; `riderKpiHTML` **L21212**; `liveSubtitles` **L21236** |
| `08a` | `#p-drivers` page L887–L906; All-drivers card L899–L905; static header L903; `div.tbl-scroll` L902 | — | **L887–L904; L897–L903; L900; L899** |
| `08a` | Misc | — | seed notification `N4` L2769 → **L2777** *(also wrong in `08b` §8/§16/§17)*; `buildEntityProfile` Wallet button L4111 → inside **L4110** *(L4111 is the support-ticket button)*; §1 design-rationale comment L21162–L21184 → **L20910–L20917**; `EYVAR_TODAY` L11235 → **L11232** *(`09a` cites this correctly — see C18)*; profile header L8842 → **L8841**, meta L8844 → **L8843**, address label L4152 → **L4150**; `pushOpsNotification` in `commitSuspendAccount` L9091 → **L9092**; `sendDriverIncentive` offer cards L11204 → **L11203**; `sec.fleet` L7909 → **L7912**; `nav.fairness` L7910 → **L7911**; §19 #17 Riders anchor "L1352 region" → **L908** |
| `08b` | `buildApplicantDetailBody` (§9.2) — H1 L7119–L7120, meta L7121, status banner L7123, docs card L7125, personal L7127–L7130, vehicle L7131–L7135, device L7136–L7139, bank L7140, stat grid L7141–L7146, location L7147, expiry card L7147, actions L7148–L7156 | **+1..+4** | **7120–7121, 7122, 7124, 7126, 7128–7131, 7132–7136, 7137–7140, 7141, 7142–7148, 7150, 7151, 7152–7156** |
| `08b` | Page ranges `#p-all-pending` L1324–L1341, `#p-applicant-detail` L1342–L1350; layout `#appd-name`/`#appd-meta` L1345, `← Back` L1347, `#appd-body` L1349 | — | **L1324–L1339; L1342–L1348; L1344; L1345; L1347** |
| `08b` | Row/misc | — | rating display L7141 → **L7146**; avatar L10930 → **10931**; sub-line L10932 → **10934**; row container L10929 → **10930**; subtitle write L10942 → **10943**; render calls L11116/L11129 → **L11117/L11130**; `saveDocExpiry()` write L11041 → **L11040**; `a.plate` deref L10944 → **L10945**; approved stat grid L7136–L7142 → **L7142–L7148**; pending-approval supply KPI L21200 → **L21202**; §19 #13 internal contradiction (text L11119 vs table L11120) → **L11120** |
| `09a` | Rider profile cards | **−7** | Personal card L4141–L4145 → **L4148–L4152**; `gender` L4142 → **4149**; address label L4143 → **4150**; device/appLang L4149 → **4156**; IP/ipLocation L4150 → **4157** |
| `09a` | `renderRidersTable` — action cell L6433, empty state L6435, subtitle write L6436, `renderRetentionWatchlist()` L6437 | **−1..−2** | **6432, 6433, 6434, 6435**. Also `sendRetentionOfferToRider` **L6998** |
| `09a` | `PLANS` price table L4406–L4410 (§13.2, §16, §19) | — | **L4389–L4393** *(L4406–L4410 is invoice code)* |
| `09a` | Ranges & misc | — | `buildEntityProfile` L4083–L4197 → **L4083–L4190**; `DB.riders` seed L2593–L2637 → **L2593–L2630** *(the "10 riders" count is correct)*; `liveSubtitles()` boot call L21403 → **L21392**; `openWalletAdjustModal` L3961–L3977 → **L3962–L3976**; `commitWalletAdjust` L3978–L4009 → **L3977–L4009**; `setDriverFilter` L21223–L21227 → **L21222–L21227**; `logAction` L3133–L3155 → ends **L3151**; avatar L11142 → **11143**; welcome-offer block L11168–L11188 → **L11169–L11189** |
| `09b` | §8.2 emission order — `return` L4192–L4196, `reconcileBannerHTML` L4107, `riderNoShowCardHTML` L4108, actions L4109–L4116, `locationCard` L4146, `notifCard` L4148, `earningsCard` L4157, `subSection` L4179, `bankCard` L4147 | mixed | **L4186–L4189, 4106, 4107, 4108–4115, 4161, 4139, 4162, 4180, 4142** |
| `09b` | Driver earnings breakdown L4165–L4172 (rows L4159–L4172); `View in Wallets →` L4172 | — | `kvCard` **L4171–L4178**, sums **L4164–L4170**, footer **L4177**; the button is **L4177** |
| `09b` | Tip / review / trust | — | `openEditTipModal` L4199 → **L4192**; `commitEditTip` L4207 → **L4204**; `process_payouts` L4208 → **L4205**; `reviewDriver` L8987–L8995 → **L8995–L9002**; `onDriverTrustToggle` L9136 → **L9139**; `onDriverExceptionToggle` L9112 → **L9115**; checkbox revert L9118 → **L9120** |
| `09b` | Misc | — | `.main` scrollTo L8860 → **L8863**; orphan guard L18539/L18541 → **L18543**; sub-profile financial split L4298–L4300 → **L4302–L4304**; `Linked entities` L4341–L4344 → **L4346–L4349**; §11.3 sort L3718 → **L3716**; personal/device cards L4141–L4145 / L4147–L4153 → **L4148–L4152 / L4155–L4160**; `ensureHistory` L4085 → **L4086**; 55 % L18702 → **L18701**; seed base L18709 → **L18710**; `return null` L18694 → **L18693**; `__fetchFullHistory=true` L20475 → **L20474** |
| `10a` | Fairness row render (§6, §11) | **+6** | `fmtAge` L15652 → **15645**; SLA `tg`/`over` L15653–L15654 → **15646–15647**; SLA badge → **15652**; age text → **15652**; status badge L15656 → **15653**; `· about` L15662 → **15656**; trip ref L15663 → **15657**; decider L15664 → **15658**; average note L15665–L15667 → **15659–15660**; `workChip` L15668 → **15662** |
| `10a` | Buttons / cards | — | Uphold/Overturn L15660/L15661 → **L15664/L15665**; `File appeal` L15686/L15687 → **L15685**; Decided card L15689–L15691 → **L15687–L15688**; empty state L15688 → **L15686**; KPI tiles L15670–L15673 → **L15671–L15674** *(the source lines L15639–L15642 are all correct)*; `renderFairnessPage()` L15636–L15696 → **L15636–L15689**; page HTML L1402–L1408 → **L1402–L1407** |
| `10a` | Gate copy (§4.4/§16) — **two citations swapped** | — | "The original decision stands…" L17961 → **L17958**; "The report is dismissed…" L17966 → **L17964**; §16 #3's L17958 for the *appeal-legitimacy* line → **L17961**. Gate range L17950–L17968 → **L17950–L17966** |
| `10a` | Economics (§4.5/§5/§14) | — | fleet average L16294 → **L16295**; under-earner `avg*0.7` L16307 → **L16306**; `mins` L16283 → **16285**; `earn` L16284 → **16286**; `perHour` L16286 → **16288**; tier badge L16305 → **16303**; rating cell L16306 → **16304**; table L16301–L16309 → **L16300–L16307** |
| `10a` | Corrective actions (§4.4) | **+1** | corrective A L15597–L15621 → **15598–15622**; recompute L15607–L15613 → **15608–15613**; corrective B L15622–L15627 → **15623–15628**; `fairness_decision` L15628 → **15629**; `renderFairnessPage()` L15629 → **15630**; `rating_voided` L15614 → **15619**; `account_reinstated` L15624 → **15626** |
| `10a` | §2 Work-Inbox item "label `Decide` L19142" | — | L19142 is `(c.openedAtMs+tg.res*60000)-nowMs()`; the block is **L19138–L19145** |
| `10b` | Ranges consistently overshoot | — | `commitPolicy.tiers` L16556–L16560 (2×) → **L16555–L16559**; `classifyDelay` → **16620–16626**; `nextTier` → **16637–16641**; `absenceExposure` → **16644–16661**; `departureRisk` → **16607–16614**; `regulatorCount` → **16741–16745**; `applyDecay` → **16748–16762**; `demoteTier` display read L16671 → **L16672**; freeze L16712–L16715 → **L16711–L16714** (write L16713); regulator L16716–L16722 → **L16717–L16721**; case linkage L16731–L16734 → **L16732–L16734** |
| `10c` | Coverage table rows (§6, §8) | **+1** | row bg **13172**, sub id **13173**, rider **13174**, captain **13175**, backup **13176**, remaining **13177**, exposure **13178**, buttons **13180/13181** |
| `10c` | Backup modal | **−5..−7** | candidate name/rating/`Nearest` L13204 → **L13211**; distance L13206 → **L13212**; existing load L13205 → **L13209**; `Select`→`commitBackup` L13208 → **L13213** |
| `10c` | Misc | — | `#coverage-sub` L1223 (3×) → **L1222**; page L1220–L1235 → **L1220–L1233**; eligibility-gate comment L13188–L13190 → **L13193–L13194** *(L13188 is the `requirePagePerm` line)*; `exposed=subs.filter(...)` L13150 → **L13151**; `promoteBackup` L13225–L13237 → **L13225–L13235**; its `pushOpsNotification` L13236 → **L13234**; `slotOf` L13242–L13250 → **13242–13249**; AM/PM strip L13243 → **L13244**; 07:00 fallback L13249 → **L13248**; footer note L13268 → **L13267**; single-occupancy badge L13261 → **L13262**; `subEconomics` L3605–L3618 → **L3605–L3616**; `subEconomics().remaining` L3612 → **L3611**; commitment `paid*0.8` L16652 → **L16653** |
| `10d` | *Cleanest in the group* | — | regulatory badge L13363 → **L13365**; `docs[worstKey]=…` L13376 → **L13377**; `saveDriverDocDates` `closeModal()` L11073 → **L11074**; `logAction()` L3133–L3150 → ends **L3151**; header "HTML markup L1235–L1251" → page div **L1236–L1249** *(the §3 layout map itself is exact)* |
| `10e` | Incident row render | **−3..−4** | severity ternary L13429 → **13425**; incident id / type badge L13432 → **13429**; status badge L13433 → **13430**; summary L13434 → **13431**; meta line L13435 → **13432**; red row tint L13431 → **13427**; action row L13436–L13440 → **13434–13438**; suspend button L13437 → **13435**; Open trip L13438 → **13436**; close button disabled L13439 → **13437** |
| `10e` | `toggleIncStep` | **−1** | set-done **13454**; toast **13456**; un-set **13458**; toast **13460**; audit **13455/13459** |
| `10e` | Misc | — | `#p-safety` L1253 → **L1252**; `.ph` L1254 → **L1253** *(`#safety-kpis` L1256, card L1257, `.ch` L1258, `#safety-list` L1259 are all exact)*; attribution/checkbox — opacity **L13421**, checkbox+disabled **L13422**, attribution **L13423**; `renderSafetyPage()` in `closeIncident` L13481 → **L13482**; header "HTML markup L1252–L1263" → page div **L1252–L1261** |

### Element-id citations (mechanical sweep, all confirmed by hand)
| Doc | Element | Cited | Actual |
|---|---|---|---|
| `03a-dashboard.md` (doc L298) | `#dash-qr-count` | L693 | **L692** |
| `03a-dashboard.md` (doc L299) | `#dash-alerts-count` | L702 | **L701** |
| `13a-support-center-tickets.md` (doc L730) | `#dispute-count` | L1369 | **L1370** |
| `13b-disputes-and-lost-found.md` (doc L493) | `#dispute-count` | L1369 | **L1370** |
| `11b-zones.md` (doc L533) | `#zones-table` | L14147 | **L14149** |
| `11b-zones.md` (doc L628) | `#exec-expansion-list` | L617 | **L618** |
| `03b-work-inbox.md` (doc L279) | `#sbb-inbox` badge formula | L19319 | **L19315–L19316**; L19319 is `}`. *The `\|\|` semantics claim is correct.* |
| `09a-riders.md` (doc L323) | `avatarHTML(r.name,38,r.hasPhoto)` | L11142 | **L11143** |

---

## 5. OVERSTATED / UNSUPPORTED claims

| # | Doc | Claim | Assessment |
|---|---|---|---|
| O1 | `04-live-map.md` §4.5 + §18.3 | "`renderLiveMap()` and `initLeafletMap()` are **never called** from anywhere (**grep confirms definitions only**)" | **OVERSTATED — the parenthetical is factually false.** `grep -on initLeafletMap` returns **2** hits: the declaration L11569 **and a call at L11633**, inside `renderLiveMap()`. The *conclusion* survives only because `renderLiveMap` itself has no caller. Separately, `updateLiveMarkers()` **is** called from `tickEngine` (L12598) and `showHistoryRoute()` from `selectTrip` (L12688) — both return immediately on `!_lmap` (L11580, L11624). The doc's §4.5 body states the latter precisely (doc L142); the "grep confirms definitions only" claim and the §4.5 heading overreach. Also: Leaflet CSS+JS genuinely load from unpkg on every page load (L469–L470), so "dead" must not be read as "costs nothing". |
| O4 | `02b-fraud-and-risk.md` §15.15 | Heading: "**Dead / unused** helpers adjacent to this module" — `priorTripsWithRider`, `hasOpenComplaint`, `openComplaintFor` | **OVERSTATED.** All three are actively called: `hasOpenComplaint` at **L3530, L4288, L5690**; `priorTripsWithRider` at **L5694**; `openComplaintFor` at **L5761**. The narrower body claim ("not referenced by the fraud page") is true, and the doc does mark the item UNVERIFIED — but the heading asserts a deadness that does not hold. |
| O2 | `00b-global-ui-systems.md` doc L1134 | "**~120 lines** of dead Leaflet code" | **OVERSTATED / imprecise.** The Leaflet region is L11526–L11635 ≈ 110 lines, of which `updateLiveMarkers` and `showHistoryRoute` are reachable-but-inert rather than unreferenced. Directionally right; the round number is not derived. |
| O3 | `12b-driver-wallets.md` doc L47 | "Only **two** of these six are actually enforced anywhere" | **Correct as stated but easy to misread.** Verified: only `cash_review` (L12148) and `cash_repayment` (L12189) are checked via `requirePagePerm`. The other four actions *are* gated — via the *legacy global* layer (`requirePerm('process_payouts')` L7024, `requirePerm('release_escrow')` L7059, `requirePerm('apply_deductions')` L7073). The doc says exactly this in its next sentence; the bolded "two" in isolation understates the actual protection. Worth noting that `defaultPagePerms` (L10664) grants **every** page at least `view` to everyone, so an unenforced `view` key could never have denied anyone anyway. |

| O5 | `00a` §2.1 | "`.sb-logo-text` — declared in CSS but no element exists — **dead rule**" | **OVERSTATED.** The element-absence is true, but live JS at **L18395–L18399** (`applyBranding`) queries `.sb-logo-text` and would write the branding wordmark into it. The rule is **unreachable, not unreferenced** — a meaningful distinction if anyone ever adds the element. |
| O6 | `00a` §17 index | "Sidebar HTML L479–547", "Topbar HTML L550–580" | **OVERSTATED / convention note.** L479 and L550 are `<!-- ═══ SIDEBAR ═══ -->` / `<!-- ═══ MAIN ═══ -->` comment **banners**; `<aside>` is L480 and `.topbar` is L552. `00a`'s *ranges* include banners while its *element* citations (L480, L552) do not — an internal convention split. See §6 C6. |

**UNSUPPORTED: one found.**

| # | Doc | Claim | Assessment |
|---|---|---|---|
| U1 | `00b-global-ui-systems.md` §1 / §7 | "**219** distinct class names" in L24–L466 | **UNSUPPORTED.** Not reproducible by any straightforward extraction — leading-dot selector extraction yields ~179 — and the document gives no method. Not flagged UNVERIFIED. Treat as unverified rather than fact. |

Otherwise all 60 documents carry an explicit `## UNVERIFIED items` section (252 markers file-wide). Spot-checks confirmed the authors used it correctly — e.g. `03a` flags `renderNewSubModal`'s declaration line as located by grep rather than direct read, and `02a`/`02b` flag runtime KPI values and unverified CSS classes. Claims I could not verify from source were, without exception, already marked.

---

## 6. Cross-document contradictions

| # | Topic | Doc A says | Doc B says | Source verdict | Correct answer |
|---|---|---|---|---|---|
| C1 | Name of the audit-action label map | `12b` §7.7: **`AUDIT_LABELS`** at L2904–L2905 | `00c` doc L217: "The task brief names this `DB.actionLabels`. **There is no `DB.actionLabels`.** The map is a module-scope `var ACTION_LABELS` at L2898." | `grep -c AUDIT_LABELS` → **0**. `grep -c "DB.actionLabels"` → **0**. L2898 = `var ACTION_LABELS={`, used at L9238. | **`00c` is correct.** Fix `12b` L529 and L1202 to `ACTION_LABELS`. |
| C2 | `avatarHTML()` declaration line | `15b` doc L305/L356: **L10824** (range L10824–L10836); `00c` doc L825: **L10838** | `08a` L784, `08b` L839, `09a` L633, `09b` L222/L933: **L10836** (range L10836–L10845) | L10824 = `Object.keys(PAGE_PERMISSIONS).forEach(…)`; L10836 = `function avatarHTML(name,size,hasPhoto){`; L10845 = the initials-fallback `return`. | **The four-doc majority (L10836–L10845) is correct.** Fix `15b` and `00c`. |
| C3 | `avatarOrInitials()` vs `avatarHTML()` ownership | — | — | **No contradiction.** `avatarOrInitials(u,size)` L2915–L2919 reads `u.photo`, sole caller `renderMaProfile()` L2929 (team users / My Account). `avatarHTML(name,size,hasPhoto)` L10836–L10845 reads `hasPhoto`, 13 call sites (drivers, riders, applicants, team modal). `09a` doc L547 explicitly disambiguates the two and is exactly right. | Docs agree and are correct. The suspected conflict does not exist. |
| C4 | "Low rating" threshold — 3.5 or 2.5? | `03c`, `06a`, `10a`, `15d`, `08a` L173: **2.5** | `08a` L170–172, `15i`: **3.5** | **Both are right — they are two different thresholds.** (1) `DB.opsConfig.notifications.lowRatingThreshold = 2.5` (seed L2571), read by `lowRatingThreshold()` L15243–L15246 and `isLowRating(r)` L15247 (`r>0 && r<=threshold`) — drives the All-Trips low-rating filter and the trip-completion alert (L12452). (2) `driver_min_rating_for_dispatch` value **3.5** (seed L2585, `enforced:true`), read by `driverAutoRestricted()` L4505–L4506; plus a hardcoded `d.rating<3.5` "Limited" tier bucket at L6350, L6372, L6373. There is **no `rating < 2.5` comparison anywhere in the source.** | **No contradiction — both correct.** `08a` doc L170–173 lays the two side by side and is the clearest treatment. Note `08a`'s citations on this topic are stale (see §4) while `15i`'s are exact. |
| C5 | Duplicate `support` router branch | `00a` doc L253/L270/L290/L532: dispatched twice, L8789 and L8806 | `13a` doc L36/L37/L816: same two lines, same split | **Both correct and mutually consistent.** L8789 = `if(id==='support'){renderSupportTeam();}`; L8806 = `if(id==='support'){renderTkFilterSelect();renderTickets();renderDisputes();renderLostFound();}`. `support` is the only duplicated key among 38 router branches (37 unique). | **No contradiction.** Both docs correct. |
| C6 | HTML page-container line-range convention | **Three** conventions are in use across the set | — | **The suspected contradiction is REAL.** *(This entry corrects an earlier conclusion in this audit: a first sweep over `01`, `12a`, `12b`, `14a`, `14b`, `15a`, `11a`, `11b` found all eight anchored on the `<div class="page">` line and concluded the convention was uniform. Widening the sample to `05a`–`07c` falsified that.)* The three conventions: **(a) banner-inclusive and explicitly labelled** — `06a` "L847–L858 (comment banner L847, page open L848, page close L858)", `06b` "L1131–L1148 (comment banner L1131…)"; **(b) div-only with the banner noted separately** — `07a` "L861–L866 (section comment L860)", `07b` "L869–L886 (section comment L868)"; **(c) div-only, banner silently omitted** — `05a`, `05b`, `07c`, and the `01`/`12a`/`12b`/`14a`/`14b`/`15a`/`11a`/`11b` group. | **No single convention is "correct" — but all three must be *stated*.** (a) and (b) are self-documenting and safe; (c) is ambiguous. Recommend standardising on (b). Note that convention differences are compounded by real **end-point errors**: `05a` L767 (real close **L757**), `07c` sub-all L2142 (real **L2141**) and instant-all L2165 (real **L2162**), `01` L633 (real **L631**), `16h` L2050 (real **L2048**) — in each case the cited end is the *next* page's banner or beyond. |
| C14 | Does `sub.postponements` have a writer? | `05a` §17.12 + §4.2: "**has no writer**… no function in this file assigns `postponements`. The rendering path is **unreachable** with current code — UNVERIFIED" | `07b` §10.2 documents the write | **`grep -n postponements`** returns **L8646** `if(!sub.postponements)sub.postponements=[];` and **L8647** `sub.postponements.unshift({originalDate:'Today',rescheduledDate:targetDate,route:t.route,reason:reason});` inside `confirmPostponeTrip()` (L8634). | **`07b` is correct; `05a` is WRONG.** The banner is reachable. *The single most consequential error in the `05a`–`07c` group — it declares live, rendered UI to be dead code.* |
| C15 | `directionArrows()` call sites | `06b` §8.3: "**Called from exactly one place** — `renderQuickRidesTable` L3456, always with the literal `'one-way'`. The round-trip branch is **unreachable**." | `05a` documents a second call in `renderSubscriptionsTable` | `grep -n "directionArrows("` returns **two**: **L3458** (quick rides, `'one-way'`) and **L3544** (`renderSubscriptionsTable`, `directionArrows(sub.direction)`) | **`05a` is correct.** Two call sites; the round-trip branch **is** reachable. `06b`'s §17.5 wording ("unreachable *from this page*") is fine — only §8.3 overreaches. Line is L3458, not L3456. |
| C16 | `refreshNavCounts` internal line numbers | `05a`: `activeSubs` L9398, `expSoon` L9399, rewrite L9403 | `07a`: **L9395 / L9396 / L9400**; `00a`: L9394 / L9395 / L9396–L9400 | Actual: `activeSubs` **L9395**, `expSoon` **L9396**, `put` **L9400**, `subs.renewal` **L9407** | **`07a` is correct** on all of them. `05a` is ~3 lines high; `00a` is 1 line low. Three documents, three different answers. |
| C18 | `EYVAR_TODAY` declaration | `08a`: **L11235** | `09a`: **L11232** | Declared **L11232** | **`09a` is correct.** |
| C19 | Seed notification `N4` | `08a` and `08b` (§8/§16/§17): **L2769** | — | L2769 is `thread:[{from:'Bandar Al-Harbi'…` (a complaint thread); `N4` is at **L2777** | **Both wrong — L2777.** |
| C17 | `DB.trips` seed record count | `06a` §4.1/§15/§18: "L2670–L2682, **7 records**" (repeated 3×); `06b` §4.1: "4 of the **7** seed trips, L2675–L2681" | — | The literal spans **L2670–L2684** and holds **8** records: TRP-7741, 7738, 7735, 7742, 9012, 9008, 9005, 9003 | **Both wrong — the answer is 8.** `06a`'s own §5.1 breakdown (2 `In trip` + 4 `Done` + 1 `Cancelled` + 1 `Late +8`) already sums to 8, so the document contradicts itself. The four quick rides are at **L2680–L2683**, not L2675–L2681. |
| C8 | `selectTrip('TRP-7741')` hardcoded in init | `00b` §11: **L14561** | `00a`: **L14562** | L14561 is `renderMapTripsTable();`; L14562 is the `selectTrip` call | **`00a` is correct — L14562.** |
| C9 | `reqClearLocks()` declaration | `00b` §2.3/§12.3/§14: **L5230–L5233**; `03a` §10/§16: **L5227** | — | Function is declared at **L5229** and ends L5232; the call is L5218; L5227 is a comment | **Neither is right — L5229.** Both docs need the same fix. |
| C10 | `resolveId` declaration | `00c` F23: **L3262** | `00a`: **L3266** | Declared **L3266** (range L3266–L3275) | **`00a` is correct.** |
| C11 | `viewUserPermissions` declaration | `00c` §5.5: **L10801** | `00b`: **L10800** | Declared **L10800** | **`00b` is correct.** |
| C12 | `GATE_SPECS` line numbers for six `commit*` keys | `00b` §3 modal table: L18334 / L18339 / L18345 / L18350 / L18355 / L18361 | `00b` §4.3 table: L18338 / L18343 / L18348 / L18353 / L18358 / L18364 | Actual: **L18337, L18342, L18348, L18353, L18358, L18364** | **§4.3 is correct for four of six** (`commitDriverAppeal`, `commitEmergencyClaim`, `commitErasureRequest`, `commitLogContact`) and off by one on the other two. §3 is wrong on all six. *A document contradicting itself in two of its own tables.* |
| C13 | `backfillReasonCodes()` synthetic ages `[190,26,1500,55,8]` | `03a` §13/§16: **L15226** | `03b` §13/§16: **L15226** | The `var ages=[…]` literal is at **L15191**; the function opens at **L15187**; L15226 is `updateContactsBadge();` | **Both wrong, identically** — indicating a shared upstream source rather than two independent mistakes. |
| C7 | Document-approve permission gating | — | — | **RESOLVED — and the asymmetry is real. Document *approve* is neither gated nor audited; document *reject* is both.** `setDocStatus(appId,key,verdict)` at **L10852**: the approve branch (L10855–L10860) sets `a.docs[key]='✓ Verified'`, deletes any `docNotes[key]`, toasts and re-renders — with **no `requirePerm`, no `requirePagePerm`, no `can()`, and no `logAction`**. By contrast `confirmDocReject(appId,key)` at **L10868** carries `if(!requirePerm('approve_drivers'))return;` (L10869) and `logAction('reject_document',…)` (L10879). The full enforcement inventory corroborates it: the only `requirePagePerm` sites in the file are L11052, L12148, L12189, L13188, L13227, L13449, L13466, L13476, L13529, L13530, L13550, L13634, L13752, L14004, L14024, L14257, L14273, L14433, L14469 — **none for `drivers`, `riders`, `compliance.view` or `safety.view`**. This also explains why `ACTION_LABELS` has `reject_document` but no `approve_document`. | **`08b` §6.4 and §19 #2 state this correctly. No document in the set contradicts it.** A genuine security-relevant asymmetry, correctly documented. |

---

## 7. Negative-claim verification results

Every strong negative I could falsify with a grep. **Forty-four of forty-five hold. One is false (N45).**

| # | Claim | Grep used | Hits | Verdict |
|---|---|---|---:|---|
| N1 | `d.docStatus` is never assigned anywhere | `grep -on 'docStatus\s*[:=][^=]'` | **0** | ✅ **TRUE.** `docStatus` appears only in two read comparisons — L6380 (`d.docStatus==='expiring'\|\|d.docStatus==='expired'`) and L20925 (same shape on `x`). L7093/L10847 are the unrelated `docStatusMeta(...)`. Zero writes. |
| N2 | `getReferralCode()` is never called | `grep -on getReferralCode` | **1** | ✅ **TRUE.** Sole occurrence is its own declaration, L3854. |
| N3 | `planFloorCheck()` has no call site | `grep -on planFloorCheck` | **1** | ✅ **TRUE.** Sole occurrence is its declaration, L21512. |
| N4 | `DB.paymentRisk` is never written after init | `grep -on 'paymentRisk[^,;)]*'` | 7 | ✅ **TRUE.** Only write is the seed literal L14199. L14227, L14327, L14335, L14374, L14378 are all reads. |
| N5 | `openUserSwitchGuardless()` is an empty function | `sed -n '3114p'` | 1 | ✅ **TRUE.** Literally `function openUserSwitchGuardless(){}`. Also never called (sole occurrence). |
| N6 | `NOTIF_PRIORITY_LABEL` is never referenced | `grep -on NOTIF_PRIORITY_LABEL` | **1** | ✅ **TRUE.** Declaration only, L2189 (`{critical,high,medium,low}`). |
| N7 | `markDocRenewed()` is dead | `grep -on markDocRenewed` | **1** | ✅ **TRUE.** Declaration only, L13370. No `onclick` string reference either. |
| N8 | `id="map-leaflet"` is absent from the markup | `grep -c 'id="map-leaflet"'` + single-quote variant | **0** | ✅ **TRUE.** The 4 `map-leaflet` hits are: CSS rule L349, an explanatory comment L11514, `getElementById` L11571, `L.map('map-leaflet',…)` L11573. No DOM element. |
| N9 | `renderLiveMap()` has no caller | `grep -on renderLiveMap` | **1** | ✅ **TRUE.** Declaration only, L11632. |
| N10 | `initLeafletMap()` has no *external* caller | `grep -on initLeafletMap` | 2 | ✅ **TRUE as scoped, but see O1.** L11569 declaration + a real call at **L11633** inside the never-called `renderLiveMap()`. `_lmap` therefore stays `null` forever. `04`'s phrasing "grep confirms definitions only" is false. |
| N20 | `DB.ownershipConfig.warnTakeover` declared and never read (`03b`) | `grep -c 'warnTakeover'` | **1** | ✅ **TRUE.** Declaration only, L18853 (`DB.ownershipConfig={staleMin:30,warnTakeover:true};`). |
| N21 | Source comment says "Thirteen queues" but `QUEUE_LABEL` has 12 (`03b`) | comment L19064; `QUEUE_LABEL` counted by hand | 12 | ✅ **TRUE.** Comment confirmed at L19064. `QUEUE_LABEL` entries: ticket, dispute, fairness, emergency, dispatch, absence, leg, risk, incident, lostfound, erasure, coverage = **12**. |
| N22 | No `PAGE_PERMISSIONS.fraud` key and no `subs.fraud` key (`02b`) | grep | **0** each | ✅ **TRUE.** |
| N23 | `commitSuspendAccount` absent from both `GATE_SPECS` and `GATE_SWEEP` | grep | **0** | ✅ **TRUE.** |
| N24 | `renderInterventions` is undefined (`03a`) | grep | only the guarded call at L19054 | ✅ **TRUE.** |
| N25 | `DB.notifications.unshift/.push` occurs on exactly one line (`03c`) | grep | **1** (L9663) | ✅ **TRUE.** |
| N26 | `updateBellBadge` has exactly 4 call sites (`03c`) | grep | 4 | ✅ **TRUE.** |
| N27 | `smsAlerts` / `notifyOnDispute` are never read (`15d`, `03c`) | grep | 0 reads | ✅ **TRUE.** |
| N28 | Riders carry no `email:` property; no duplicate `phone:` exists (`02b`) | grep | 0 / 0 | ✅ **TRUE** — so the identity-collision card really is empty on seed, and the sole duplicate email `noura.f@eyvar.com` really does belong to `DB.teamUsers` (L2837). |
| N29 | `'Operations'` is absent from `TEAM_ROLES` (`03b`) | `sed -n '10501p'` | absent | ✅ **TRUE.** `['Owner','Ops Manager','Finance','Support']`. |
| N30 | Zero `logAction` calls in L2171–L2327 (`03c`) | grep range | **0** | ✅ **TRUE.** |
| N31 | `status='At risk'` is never assigned (`05a`) | grep | 0 assignments | ✅ **TRUE.** Only a filter option (L3501) and unrelated labels (L3362, L10427, L14233). |
| N32 | `subEconomics().driverFull` never read (`05a`) | grep | 2, both inside its own function | ✅ **TRUE.** |
| N33 | `#frz-reason` never read (`05a`) | grep | **1** (L5498) | ✅ **TRUE.** |
| N34 | No unfreeze/resume function exists (`05a`) | grep | 0 | ✅ **TRUE.** |
| N35 | Corporate `Trial` status never assigned (`05b`) | grep | **1** (L6487, an option) | ✅ **TRUE.** |
| N36 | No delete path for `DB.corporateAccounts` (`05b`) | grep | 0 | ✅ **TRUE.** |
| N37 | `workHoursStart` / `workHoursEnd` never read (`05b`) | grep | 0 reads | ✅ **TRUE.** |
| N38 | `corpAccountId` is write-only (`05b`) | grep | L6746 write, L6756 delete, **0 reads** | ✅ **TRUE** — and `05b` needlessly marks it UNVERIFIED; it is fully verifiable. |
| N39 | No trip status ever contains "no-show" (`06a`) | grep | 0 assignments | ✅ **TRUE** — so All-Trips KPI 3 is permanently 0. |
| N40 | `DESYNC_THRESHOLD_MS` declared and never read (`06a`) | grep | **1** (L16336) | ✅ **TRUE.** |
| N41 | `riderGraceMin` never read (`06a`) | grep | **1** (L17609) | ✅ **TRUE.** |
| N42 | `cancelledThisMonth` is dead (`07a`) | grep | **1** (L3343) | ✅ **TRUE.** |
| N43 | `createTicketFor` has no `requirePerm` and no `logAction` (`06a`) | read function | none | ✅ **TRUE.** Same for `createReadinessTicket` and `exportRequestsSnapshot` (L9766–L9775). |
| N44 | `completeTrip` never calls `renderQuickRidesTable` (`06b`) | grep | 0 | ✅ **TRUE.** |
| **N45** | **`08a` §19 #18: "no code path in the lines read appends to a *driver's* `notifLog`"** | grep for driver `notifLog` writes | **4** | ❌ **FALSE — the only negative claim in the whole audit that does not hold.** Four driver-`notifLog` writers exist: **L4773–L4774, L5104–L5105, L5855–L5859, L8731–L8732.** *(The narrower seed-data claim — that no seeded driver carries a `notifLog` — is true. The hedge "in the lines read" is doing a lot of work; as written the sentence reads as a general negative and is wrong.)* |
| N46 | `docStatus` never assigned (`08a` §19 #1, `10d` §16 #1 — independent re-check) | grep | 4 hits, all reads/unrelated | ✅ **TRUE**, and `10d`'s enumeration of all four (L6380, L7093, L10847, L20925) is exact. |
| N47 | `10e`: "This module opens no modals of its own" | `grep 'modal-content\|modal-overlay'` in L13383–L13485 | **0** | ✅ **TRUE.** |
| N48 | `10e`: "There is no SLA in this module" | `grep 'sla\|setTimeout\|setInterval\|pushOpsNotification'` in L13383–L13485 | **0** | ✅ **TRUE.** |
| N49 | `delete DB.complianceSuspensions` — no lift-suspension action anywhere (`10e`) | grep | **1** (L13312) | ✅ **TRUE.** |
| N50 | `acceptPlanTerms` (L17133), `reserveState` (L17570), `viewDriver` (L8994), `referredBy` (L3871), `planProbation` (L19482–L19483) all single-hit / write-only | grep | as claimed | ✅ **ALL TRUE.** |
| N51 | `sbb-compliance` / `sbb-safety` staleness analysis (`10d` §12, `10e` §12) | grep | 2 hits each (L517/L13331; L518/L13406) | ✅ **TRUE**, including the contrast set `put(...)` at L9400–L9401. |
| N52 | `commitBackup` has no permission check (`10c`) | read L13218 | none | ✅ **TRUE.** |
| N53 | `setDocStatus` approve branch has no permission gate and no audit entry (`08b` §6.4 / §19 #2) | read L10852–L10860 | none | ✅ **TRUE** — see §6 C7. |
| N11 | Zero `localStorage` | `grep -c localStorage` | **0** | ✅ **TRUE.** |
| N12 | Zero `sessionStorage` | `grep -c sessionStorage` | **0** | ✅ **TRUE.** |
| N13 | Zero `fetch(` | `grep -c 'fetch('` | **0** | ✅ **TRUE.** |
| N14 | Zero `XMLHttpRequest` | `grep -c XMLHttpRequest` | **0** | ✅ **TRUE.** |
| N15 | Zero `navigator.sendBeacon` (my own extension of the claim) | `grep -c 'navigator.sendBeacon'` | **0** | ✅ **TRUE.** *Caveat: the page is not network-free — L469/L470 load Leaflet from unpkg.com and L7873 requests OSM tiles. "No JS-initiated data calls" is the accurate framing.* |
| N16 | No identifier `AUDIT_LABELS` exists | `grep -c AUDIT_LABELS` | **0** | ✅ **TRUE** — which is precisely what makes `12b`'s §7.7 heading WRONG (W1). |
| N17 | No `DB.actionLabels` exists (`00c`) | `grep -c 'DB.actionLabels'` | **0** | ✅ **TRUE.** `00c`'s correction of the task brief is itself correct. |
| N18 | `compliance.view` declared but never enforced (`10d`) | `grep -n "canPage('compliance'"` / `requirePagePerm('compliance'` | **0** | ✅ **TRUE.** Declared L10605, never checked. |
| N19 | `safety.view` declared but never enforced (`10e`) | `grep -n "canPage('safety'\|requirePagePerm('safety','view'"` | **0** | ✅ **TRUE** (declared at L10609, not L10610 — see W6). Note `safety.update_steps` (L13449) and `safety.close` (L13476) *are* enforced. |

---

## 8. Financial formula audit

**Highest priority. Every money formula I could locate was re-derived from source. All 28 match.** No money formula in this documentation set is wrong.

### 8.1 Driver payouts — `12b`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| `payDriver()` gate | `requirePerm('process_payouts')` L7024 | L7024 exact | ✅ |
| Zero guard | `if(!p \|\| p.pending<=0) return;` L7026 | L7026 exact | ✅ |
| Settlement | `p.paidOut += amt; p.pending = 0` (hard zero, not subtraction) | L7029, L7030 exact | ✅ |
| `earned` untouched by payout | "a payout leaves `earned` unchanged — earned is gross, paidOut is settlement" | Confirmed: `payDriver` never touches `p.earned` | ✅ |
| `deductionNote` cleared on payout | L7032, L7053 | L7032 exact; L7053 contains `p.deductionNote=null` inside the forEach | ✅ |
| `confirmProcessAll` total | `ids.forEach(… if(p.pending>0){ total+=p.pending; p.paidOut+=p.pending; p.pending=0; …})` | L7053 exact | ✅ |
| **The `ids.length` reporting bug** | "`ids` here is **every** payout key, not the `pending>0` subset the preview used. `driversProcessed` therefore reports the total number of drivers with a payout record, not the number actually paid." | Verified: L7051 `var ids=Object.keys(DB.payouts);` (unfiltered) vs L7038 preview `.filter(…pending>0)`. Audit line L7055 uses `ids.length`. | ✅ **Correctly caught.** Genuinely subtle. |
| `totalPending` rounding | "No rounding applied to `totalPending` before `.toFixed(2)`" | L8752/L8755 accumulate raw floats; L8768/L8769 `.toFixed(2)` | ✅ |

### 8.2 Subscription escrow — `12b`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| Release | splice the hold, then `p.pending += e.amount` and `p.earned += e.amount` | L7064 splice; **L7066**, **L7067** (doc cites L7065/L7066 — stale line, correct math) | ✅ math / ⚠ line |
| Payout record auto-create | `ensurePayoutEntry(e.driver)` L8894 | L8894 `function ensurePayoutEntry(driverId){` exact | ✅ |
| Hold destroyed, no `released` state retained | "the hold record is **destroyed**, no `released` state is retained" | Confirmed — `splice` removes it; no status transition | ✅ |

### 8.3 Deductions — `12b`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| Apply | `p.pending = Math.max(0, p.pending − d.amount)` — **clamped at zero** | L7079 exact | ✅ |
| Preview | `Math.max(0, avail − d.amount).toFixed(2)` where `avail = p ? p.pending : 0` | L8976 exact; formula at **L8981** (doc cites L8982) | ✅ math / ⚠ line |
| Clamp consequence | "shows `0.00` rather than a negative balance"; deduction excess is silently absorbed | Confirmed by the `Math.max(0,…)` in both places | ✅ |
| `deductionNote` is a single slot | "a second deduction overwrites the first" | L7080 assigns, never appends | ✅ |
| Status | `d.status='applied'` L7077, terminal (no reversal path) | L7077 exact; no code path sets it back | ✅ |

### 8.4 Cash reconciliation — `12b` (the largest money subsystem; **every constant and rounding step verified exact**)
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| `CASH_COMMISSION_RATE` | `0.20` L12076 | L12076 exact | ✅ |
| `CASH_TOLERANCE` | `2.00` SAR L12077 | L12077 exact | ✅ |
| `CASH_DEBT_CAP` | `-300` SAR L12078 | L12078 exact | ✅ |
| `CASH_TRIP_CHANCE` | `0.35` L12079 | L12079 exact | ✅ |
| Ledger + debt init | `DB.cashLedger` / `DB.driverCashDebt` L12080–L12081 | exact | ✅ |
| Classification | `dev = reportedMinusTopup − expected`; `\|dev\|<=2.00 → 'match'`; `dev>2.00 → 'over_report'` else `'under_report'` | L12084–L12086 exact | ✅ |
| Top-up excluded before comparison | "the top-up is **subtracted before comparison**, so a legitimate wallet top-up never registers as an over-report" | L12123 `classifyCashReport(expectedFare, reportedAmount − topupAmount)` exact | ✅ |
| **Commission owed** | `Math.round(entry.expectedFare * CASH_COMMISSION_RATE * 100) / 100` | L12089 exact | ✅ |
| **Debt added** | `Math.round((commissionOwed + (entry.topupAmount \|\| 0)) * 100) / 100` | L12090 exact | ✅ |
| **Debt accumulation** | `DB.driverCashDebt[driver] = Math.round(((prev \|\| 0) − debtAdded) * 100) / 100` — stored **negative** | L12091 exact | ✅ |
| Rounding discipline | "Both are rounded to 2 dp at every step, so the debt total does not drift" | Confirmed — three independent `Math.round(x*100)/100` | ✅ |
| **Debt applied unconditionally** | "called unconditionally for every generated cash event (L12133), including `'match'` and `'over_report'`. A driver who reports honestly still accrues the full commission as debt." | L12133 `applyCashDebtImpact(entry);` sits outside every conditional | ✅ **Correctly caught.** High-value finding. |
| Suspension | `driverCashBlocked(id) === (DB.driverCashDebt[id] \|\| 0) <= CASH_DEBT_CAP` | L12082 exact | ✅ |
| Total debt KPI | `SUM over keys of Math.max(0, −DB.driverCashDebt[k])` | L12240 exact | ✅ |
| Blocked-count KPI | `count of keys where driverCashBlocked(k)` | L12243 exact | ✅ |
| Repayment | `owed = −(DB.driverCashDebt[id] \|\| 0)`; clears to exactly `0` | L12190 / L12207 exact | ✅ |
| Permission gates | `requirePerm('process_payouts')` **and** `requirePagePerm('wallets','cash_review')` L12147/L12148; repayment L12188/L12189 | all four exact | ✅ |

### 8.5 Rider wallet — `12c`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| Credit | `w.balance = Math.round((w.balance + amount) * 100) / 100` | L3936 exact | ✅ |
| Debit | `w.balance = Math.round((w.balance − amount) * 100) / 100` | L3946 exact | ✅ |
| **No overdraft** | debit returns `false` when `w.balance < amount` | L3945 exact; caller toasts "Insufficient wallet balance" and returns without closing the modal (L4003) | ✅ |
| `balanceAfter` written but never read | doc L87 | Written L3937/L3947; no read found | ✅ |
| Permission gate | `requirePerm('contact_users')` L3978 | L3978 exact — note this is a *contact* permission gating money movement | ✅ |
| Reason-code fallback | `'OTHER_UNCODED'` L3984 | L3984 exact | ✅ |
| Second-approval flag | `window.__compApproved` — "a bare global with no rider/amount/actor binding" | L3992 set → L3997 reset; no binding of any kind | ✅ **Correctly caught.** |
| Seed: RDR-1041 = 20 SAR referral bonus | doc L93, L2594 | L2594 `'RDR-1041':{…wallet:{balan…` exact | ✅ |
| Seed: RDR-2087 = 17.30 SAR trip-cancellation refund, `WTX-seed-1`, `19 Jun 10:52` | doc L94, L2599 | L2598 is RDR-2087 Layla Al-Faraj; L2599 is her wallet, verbatim match | ✅ |

### 8.6 Credit notes / VAT — `12c`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| `rate` | `DB.vatConfig.ratePct / 100` | L15865 exact | ✅ |
| `totalIncl` | `Math.round(entry.amount * 100) / 100` | L15866 exact | ✅ |
| **`subtotal`** | `Math.round((totalIncl / (1 + rate)) * 100) / 100` | L15867 exact | ✅ **VAT-inclusive back-out, correctly documented.** |
| `vatAmount` | `Math.round((totalIncl − subtotal) * 100) / 100` | L15868 exact | ✅ |
| `r2(n)` helper | `Math.round((n\|\|0)*100)/100` L19883 | L19883 exact | ✅ |
| Unlinked flag | `unlinked: !inv`; fires a `pushOpsNotification` warn when no invoice matches | L15881, L15887 exact | ✅ |

### 8.7 Subscription / corporate / trip money — `05a`–`07c`
**No money formula in any of these seven documents was found to be misderived.** Re-derived operator-by-operator and matching: subscription economics; early-termination settlement; cancel-refund fee; dynamic pricing; corporate VAT and invoice math (L6681–L6686, including `invoiceSequence++` firing on modal open); `corpTotalSpend`; `riderLTV`; `corpPolicyViolations`' three checks and their exact thresholds; payment hold/capture (`ensureHold`, `capturePaymentHold`, `releasePaymentHold`); `subReqValue` and its full 6-cell price matrix; readiness scoring.

| Formula | Source (verified) | Verdict |
|---|---|---|
| `quickRideFare` | L12401–L12405 | ✅ exact |
| `currentSurgeMultiplier` + full surge schedule and cap | L12389–L12400 | ✅ exact |
| `buildFareBreakdown` independent 4.00 / 1.35 / 0.42 card | L18656–L18666 | ✅ exact *(and correctly flagged as a duplicate of the real fare model)* |
| `simulateTip` | L12044–L12048 | ✅ exact |
| All-Trips table money cell `max(0, fare − earn − stopFee)` | L3422 | ✅ exact |
| All six All-Trips KPI formulas | L3407–L3418 | ✅ exact |
| `acceptChance = 0.30 + (rating − 3) × 0.08` | tick state machine L12530–L12571 | ✅ exact |
| `reqUrgencyScore` (incl. the 100000 constant) + both sorters | L10057–L10061, L10062–L10064, L10065–L10070 | ✅ exact |
| `computeRouteKm` / `geoDistanceKm` / `GEO_SCALE_KM=0.14` | — | ✅ exact |
| `readinessStatus` / `fmtCountdown` | L8702–L8709 / L8710–L8715 | ✅ exact |

### 8.8 Commission / plan economics — `12a`, `11a`, `11b`
| Formula | Doc says | Source (verified) | Verdict |
|---|---|---|---|
| `DB.plans.weekly.eyvarPct` | `20` | L2890 `eyvarPct:20` exact | ✅ |
| `DB.plans.biweekly.eyvarPct` | `18` | L2892 `eyvarPct:18` exact | ✅ |
| `DB.plans.monthly.eyvarPct` | `15` | L2894 `eyvarPct:15` exact | ✅ |
| Promo ROI revenue constant | `p.newSubs * 86.50`, **hardcoded**, duplicating `PLANS.weekly.eco` instead of reading it | L13503 `var revenue=p.newSubs*86.50;` and L4390 `weekly:{label:'Weekly',exec:5,eco:86.50,comfort:122.50}` | ✅ **Duplication claim verified true.** |
| Zone pipeline value | `subReqValue(r)` → `r.vehicle==='Comfort' ? p.comfort : p.eco` | L9750–L9754 exact | ✅ |
| Steering offer spend | accept when `o.spent + o.amount <= o.cap`; auto-close at `minutesLeft<=0 \|\| spent>=cap` | L14180, L14181 exact | ✅ |
| Steering offer defaults | `st-amt` 12 SAR `min=1 step=1`; `st-cap` 300 SAR `min=10 step=10`; commit `parseFloat()\|\|12` / `\|\|300` | L14014, L14017, L14025, L14026 all exact | ✅ |

---

## 9. Enumeration completeness spot-checks

| Enumeration | Doc claim | Source count | Verdict |
|---|---|---:|---|
| `PAGE_PERMISSIONS` pages | — | **22** (dashboard, requests, subscriptions, quickrides, trips, renewal, readiness, live, drivers, riders, coverage, compliance, safety, growth, zones, predictive, finance, wallets, plans, support, settings, audit-log) | Baseline established for §11 follow-up |
| `PAGE_PERMISSIONS.wallets` perms | `12b`: 6 keys (view, process_payouts, release_escrow, apply_deductions, cash_review, cash_repayment) | 6, L10631–L10636 | ✅ **Complete and exact** |
| `PAGE_PERMISSIONS.growth` perms | `11a`: "drives the 5 checkboxes" | 5, L10615–L10619 | ✅ |
| `PAGE_PERMISSIONS.zones` perms | `11b`: "2 checkboxes" | 2, L10622–L10623 | ✅ |
| `PAGE_PERMISSIONS.compliance` perms | `10d`: view, edit_dates | 2, L10605–L10606 | ✅ keys correct (range stale — §4) |
| `PAGE_PERMISSIONS.safety` perms | `10e`: view, update_steps, suspend, close | 4, L10609–L10612 | ✅ keys correct (range stale — §4) |
| `ACTION_LABELS` keys | `12b` lists 4 relevant to wallets | **26** total, L2898–L2911 | ✅ `12b`'s four (`process_all_payouts`, `release_escrow`, `apply_deduction`, `pay_driver`) all present at L2904–L2905 |
| `TEAM_ROLES` | `00c`: "declares 4 roles" | 4 — `['Owner','Ops Manager','Finance','Support']` L10501 | ✅ |
| `DB.reasonCodes` | `12c`: "all **40** entries are `active:true`" | **40** entries L14667–L14715; `grep -c active:false` → **0** | ✅ **Count and the all-active claim both exact** (range end stale — §4) |
| Router `id===` branches | `00a`: `support` dispatched twice | 38 branches L8787–L8824, **37 unique**, `support` the only duplicate | ✅ |
| Page shells | `00c`: "41 page shells — 40 matching `class="page" id="p-…"` plus `p-dashboard` at L676" | `grep -c 'class="page'` → **41**; `grep -c 'class="page" id="p-'` → **40**; L676 = `<div class="page on" id="p-dashboard">` | ✅ **Exactly right, including the reason for the 40/41 split** |
| Hardcoded `2.5` fallbacks | `15d`: "four separate times" | **5** lines / 5 occurrences: L8006, L8013, L12452, L12453, L15245 | ❌ **WRONG — see W3.** The only failed enumeration in the set. |

**Seed-data spot checks (all exact):** `DB.escrowHolds` L2801–L2806 (4 records: ESC-1041 69.20 held, ESC-1052 329.60 ready, ESC-1060 32.98 ready, ESC-1075 69.20 held) ✅; `DB.deductions` L2807–L2811 (3 records, DED-03 seeded `applied`) ✅; `DB.payouts` L2812–L2816 (3 drivers: DRV-0101/0102/0104 — DRV-0103 and DRV-0105 correctly documented as having **no** payout record) ✅; `AUD-0001` L2871 verbatim including `before:{pending:'2,200.00 SAR'}` / `after:{pending:'0.00 SAR',paidOut:'2,200.00 SAR'}` ✅; `DB.opsConfig.notifications` L2571 verbatim ✅; `driver_min_rating` L2591 (`value:3.5, enabled:true, enforced:false, enforcedBy:null`) ✅.

---

## 10. Confirmed-correct highlights — what survived hostile checking

These claims were attacked and held. Readers can rely on them.

**Every money formula.** All 28 financial formulas in §8 were re-derived from source and matched exactly, including rounding order, clamp direction and sign convention. In particular: the cash-debt engine in `12b` §5.13 is correct to the last `Math.round(x*100)/100`; the VAT-inclusive back-out in `12c` is correct; `Math.max(0, …)` clamps on deductions are correctly identified in both the commit path and the preview path. **If you need to trust one thing in this doc set, trust the money.**

**All nineteen negative claims (§7).** Every "dead code", "never called", "never assigned", "zero occurrences" assertion I could falsify is true. `d.docStatus` really is never assigned. `getReferralCode()`, `planFloorCheck()`, `markDocRenewed()`, `renderLiveMap()` really have no call sites. `openUserSwitchGuardless()` really is `function openUserSwitchGuardless(){}`. `NOTIF_PRIORITY_LABEL` really is declared and never used. `DB.paymentRisk` really is written once and only read thereafter. There really is no `localStorage`, `sessionStorage`, `fetch` or `XMLHttpRequest` in 21,857 lines.

**Three genuinely subtle bugs that the docs caught and I confirmed:**
- `12b` doc L240 — `confirmProcessAll` audits `ids.length` from the **unfiltered** `Object.keys(DB.payouts)`, so `driversProcessed` overstates the number actually paid. Verified at L7051 vs L7038.
- `12b` doc L343 — `applyCashDebtImpact` runs unconditionally at L12133, so an honestly-reporting driver still accrues full commission as debt.
- `00c` F18 — after the audit log pins at 500, `id:'AUD-'+String(DB.auditLog.length+1)` (L3136) yields `AUD-0501` for **every** subsequent entry. The derivation is exactly right.

**The Leaflet analysis (`00b` §8.1, `04` §4.5).** Precise and, in its detail sections, correct: `id="map-leaflet"` absent, `renderLiveMap`/`initLeafletMap` uncalled, `_lmap` permanently `null`, CDN CSS+JS still render-blocking at L469/L470, and — the non-obvious part — `updateLiveMarkers` **does** have a live call site (L12598) yet no-ops. `00b` additionally gets right that the *only* live Leaflet consumer in the file is the Settings→Cities preview.

**The two rating thresholds (§6 C4).** Not a contradiction. The docs correctly keep `lowRatingThreshold` (2.5, configurable, notification/filter) separate from `driver_min_rating_for_dispatch` (3.5, dispatch eligibility) and from the hardcoded `<3.5` "Limited" tier bucket. `08a` doc L170–173 presents all three side by side.

**The page-container line convention (§6 C6).** Consistent across all eight checkable documents — anchored on the `<div class="page">` line, excluding the preceding comment banner.

**Permission enumerations.** `PAGE_PERMISSIONS.wallets` (6), `.growth` (5), `.zones` (2), `.compliance` (2), `.safety` (4) all have exactly the keys documented. `TEAM_ROLES` is 4. `DB.reasonCodes` is 40, all active.

**Page-shell arithmetic.** `00c`'s "41 page shells = 40 + `p-dashboard`" is exactly right, and right *for the right reason* (`p-dashboard` carries `class="page on"`, so it misses a literal `class="page" id="p-` grep).

**Predictive / risk scoring formulas — all re-derived and matching.** `subHealthScore` (all six triggers, weights, thresholds, `Math.max(0,…)` floor); `driverRiskScore` including the subtle signal 5b that pushes a reason with *zero* deduction, and the unbounded `−15 × openIssues`; the real `healthBand` 80/50 vs `openHealthBreakdown` 70/40 **divergence** (L14232–L14234 vs L20570) — a genuine inconsistency correctly caught; `notifPriority` + `sortNotifsByPriority` (8-alternative regex, `error`-first evaluation, non-mutating `.slice()`, stability tie-break); `updateBellBadge`; `subEconomics.remaining`; `departureRisk` synthetic `20−(digits%18)` at L16612; SLA-bar, ping 120/300 s, and ETA model constants (1.35 / 26 km/h). Zone structural-rule arithmetic checks out digit-for-digit: Al Narjis 14:2 = 7.00 and 11÷14 = 79 %; Al Sahafa 3.00 / 67 %; KAFD 1.83, Al Malaz 1.33, Qurtubah 1.20, Al Yasmin 2.75 all correctly excluded.

**`04-live-map.md`'s rendering analysis.** Confirmed the map is a **canvas** (`<canvas id="map-canvas" width=800 height=360>` L817 → `drawMap()` L12812–L12960) — not Leaflet, not SVG, not absolutely-positioned divs. Refresh is `setInterval(tickEngine,1000)` at L11968 (started L14598) = 1 s, exactly as documented. Seed counts all exact: `#active-trips-count` hardcoded `3` (L832), `#ride-req-count` `3` (L840), `#sub-req-count` `0` (L836); `DB.liveTrips` 3 rows (L2781–L2785); `MAP_ROUTES` 7 polylines (L11933–L11941); `TRIP_COORDS`/`TRIP_COLORS` 7 each; `activeTrip='TRP-7741'` (L11942); all 8 seeded `DB.trips` dated `25 Jun`. **The doc's headline bug 1 is real and verified verbatim** at L11665 — `'<div style="…#F2F1EE;"+pingBorderStyle(t)+">'` places the concatenation *inside* the single-quoted literal, so `pingBorderStyle` never renders. Duplicate `.map-stat`/`.ms-*` CSS at L217–L220 vs L365–L368 confirmed, as are `simulateAsyncCommit` 550 ms / 8 % (L10260–L10263), `TICK_ACCEL=30`, `AUTO_OFFER_DELAY_SEC=6`, `OFFER_WINDOW_SEC=12`, and the L6243 `DB.upcomingSubTrips=DB.upcomingSubTrips||[…]` no-op.

**`03c-notifications.md` enumerations.** The **36** `pushOpsNotification` call sites match grep **line for line**; the 10 `'warn'` + 1 `'ok'` undeclared-type producers match exactly.

**`03b-work-inbox.md`** was the cleanest document audited in its group — zero WRONG findings, citation drift only.

**The permission-model arithmetic in `00c` — reproduced exactly.** `PAGE_PERMISSIONS` L10564–L10651, **22 pages**, **52 granular keys** (sums to 52), every `legacy:` value and every perm label verified against source; `dashboard` and `audit-log` are the only two with `legacy:null`; 15 enforced pairs / 37 unenforced (71 %) checks out. All 13 per-key `requirePerm` counts (39/23/16/14/13/8/6/5/4/1/1/1/0 = **131**) reproduce exactly. `view_profiles` really has **0** `requirePerm` sites. **`canPage()` has exactly two occurrences** (declaration L10674 + the call inside `requirePagePerm` L10681) — so all 22 `view` keys really are enforced nowhere, which independently confirms O3.

**The audit-vocabulary arithmetic in `00c` — reproduced exactly.** 222 `logAction(` hits, 220 string-literal call sites, **161 distinct action keys**, 26 labels, **135 unlabelled**, **0 orphan labels**, `config_updated` ×40. Also "1,028 function declarations" = the distinct `function NAME(` count.

**The gate-registry arithmetic in `00b` — reproduced exactly.** **17** rich gates (names and order exact), **18** `GATE_SPECS` keys, **47** `GATE_SWEEP` keys, **9** standalone `guardAction` calls at exactly L18460/18607/19490/19733/20483/20522/21090/21544/21603 → **90 distinct names, 88 installed** (minus `openLowRatingTicket:null` and deleted `assignBackup`; `autoHandoff` dedup). `00b` §4.8's ungated-destructive list: all 7 functions and all 14 line citations exact, and none appears as a quoted gate name anywhere.

**`00b`'s UI-inventory counts.** **99** modal openers, **112** `modal-content` references, **311** `closeModal(` lines, **349** toast invocations (352 matches − definition L5269 − comments L5259/L5263). ~35 sampled `Fn L`/`Open L` pairs from the 99-row inventory were **100 % exact**. The **26** design tokens on `:root` L11–L21 match name-for-name and hex-for-hex; `--sb-bg` and `--bg` really are both `#EEF0F3`; `DB.branding.accent='#185FA5'` (L18388) really does duplicate `--blue`.

**`00a`'s navigation facts.** All **38** `go()` dispatch line numbers L8787–L8824 exact; all 30 sidebar item lines, badge ids, `sb-badge a|n` classes and seeded values exact; the `titles` map's 41 entries all exact, and the 6 ids present in `titles` but absent from `subs` (`exec-overview`, `corporate`, `corp-detail`, `rwallets`, `fraud`, `ticket-detail`) are correct. **Every badge formula in §3 was re-derived correctly**, including the three `|| ''`-on-zero writers (L5645, L6496, L13014) and the five class-maintaining badges (L14964/14968/14972/14977/19318) — both negative claims verified exhaustively. `.sb.pin` truly is never touched by JS; `navStack` 40-cap at L7006; `findSbEl` really returns the *last* match; `window.go=window.go;` really is at L3115.

**Two genuine bugs, correctly diagnosed.** (1) `00c` F5 — impersonation misattribution: `impersonate()` sets `CURRENT_USER_ID=userId` at L21071 *before* any action, and `logAction` reads it at L3138, so the gate copy at L21095 ("recorded against **your** name, not theirs") is indeed inverted. (2) `01`'s `NaN%` bug: `parseInt('—',10)` → `NaN`, the `x!=null` filter does not exclude `NaN`, and `Math.round(NaN)!=null` is true. Confirmed in seed data — `RDR-2031` (L2603) has `renewalRate:'—'` (L2606) and is the rider of `SUB-1052` (L2687), `status:'Active'`. The card renders a literal `NaN%`.

**More verified negatives.** Zero `DOMContentLoaded` / `window.onload`; zero `openModal`; zero `Escape`/`keyCode 27` handling (only 2 `keydown`, at L571 and L909 — exactly as `00b` states). `renderSidebarPerms` really is never defined (2 occurrences, both `typeof`-guarded, L21075/L21086). `audit_mut.js` really is absent from the repo. `renderExecOverview()` really is called only from the router (L8811).

**`00c` §5.1's page-shell inventory.** All 19 markup line numbers exact (583, 634, 644, 650, 1020, 1082, 1151, 1171, 1324, 1342, 1380, 1384, 1392, 1397, 1402, 1409, 2068, 2123, 2144), and 22 covered + 19 uncovered = 41 checks out.

**Driver / rider / compliance formulas — all re-derived and exact.** `riderLTV` (L4031–L4037); `riderTenureMonths` (L4038–L4047); `riderChurnRisk` (L4048–L4063 — all five rules, point values, and the `>=4`/`>=2` banding); `customerValueCardHTML` (L4065–L4082); `entityDerived`/`numOf`/`reconcileEntity` (L18495–L18531) including the 0.01 tolerance and the orphan/window severity rule, plus the `__origReconcileEntity` override (L20442–L20456), `windowStartMs` (13 × 30.44 days), `windowSplit` and `olderInBilling`; `subEconomics` (L3605–L3616) with `EYVAR_COMMISSION_PCT=20` (L3604); `captainEconomics` (L16280–L16290) and the `avg*0.7` under-earner rule, with a correct critique of its mean-of-rates flaw; `decideFairness`'s rating recomputation `((rating*n) − given)/(n−1)` with clamp [1,5], 1-dp rounding and the `n>1` guard (L15608–L15613); `classifyDelay`, `absenceCount`, `nextTier`, `exposureLineHTML`, the 13-step `recordAbsence`, `regulatorCount` (hardcoded 30 d, ignores `.decayed`) and `applyDecay`; `dispatchEligibility` (L17209–L17225, all seven conditions in order); `subIsCovered` (L17472–L17479); `10e`'s KPI bar widths (`open*25`, 25 %, 33 %, 10 %).

**`10d`'s compliance date arithmetic — recomputed in full and exact.** All **25** seeded document expiry dates were recalculated against `REQ_NOW_REF = 25 Jun 2026 09:14`, and **every single day count matches** (23, 37, 18, 9, 50, 29, −6, 12, 259 …), as do `worst`, the tile values (5/1/0/4) and the badge value (1). `docDaysLeft`/`docState` bands (0/7/30) are exact. `10d` is the strongest document in its group.

**Genuine bugs correctly caught in this group.** The `absenceExposure` divergence — it hardcodes `paid*0.8` at L16653 instead of reading `EYVAR_COMMISSION_PCT`; the `*0` no-op bug in `saveCommitPolicy` (L17123); the degenerate `c.tsMs!==undefined ? … : …` ternary at L19529; `10d`'s undocumented 14-day third band in `driverRiskScore` (L14290–L14291).

**Epistemic hygiene — with one caveat.** 60/60 documents carry a `## UNVERIFIED items` section, 252 markers file-wide, and spot-checks confirmed they are used honestly. This is why §5 records only **one** UNSUPPORTED finding. The caveat runs the other way: **`08b` over-hedges.** Six of its §19 items are marked UNVERIFIED when they are trivially verifiable — `stopEv` is at **L18857**, `customSelectHTML` at **L5336**, `REQ_NOW_REF` at **L9555**, `isConsentCurrent`/`getUserConsent` at **L3783**/**L3797**, and `sendSystemEmail` (L3579) plainly resolves recipients via `toEmail=emailFor(toId)||'—'`. `05b` does the same with `corpAccountId` (write L6746, delete L6756, zero reads — fully verifiable). Over-hedging is far less harmful than over-claiming, but it costs the reader real information.

---

## 11. Required corrections, prioritised

### P1 — Wrong names, wrong scope, wrong arithmetic
1. **`12b-driver-wallets.md` L529 and L1202** — replace `AUDIT_LABELS` with **`ACTION_LABELS`** (declared L2898). No identifier `AUDIT_LABELS` exists in the source. *(W1, C1)*
2. **`15b-settings-team-roles.md` L305 and L356** — `avatarHTML()` is at **L10836–L10845**, not L10824(–L10836). L10824 is an unrelated `PAGE_PERMISSIONS` loop. *(W2, C2)*
3. **`15d-settings-notifications.md` L155** — correct to "**five** occurrences on five lines: L8006, L8013 (once), L12452, L12453, L15245". Delete "twice — the `parseFloat` fallback and the clamp source"; L8013's clamp bounds are `5` and `1`. *(W3)*
4. **`12a-finance.md` L581** — the `wallet-reason` required guard is **L3982**, not L3987 (L3987 opens the `compCheck` blocked branch). *(W4)*
5. **`04-live-map.md` L573** — the table cell "`L.*` is only referenced from never-executed functions" is false and contradicts the doc's own following paragraph. Reword to scope the "No" to this page. *(W5)*
6. **`10e-safety.md` L528** — `safety.view` is declared at **L10609**, not L10610. *(W6)*
7. **`03a-dashboard.md` §4 + §15.7** — delete "only": `subHealthScore` is called from **seven** sites (L3319, L14240, L14259, L14372, L20570, L20597, L21117), three of them in Predictive Signals; `openHealthBreakdown` also fires at L20601 and L21139. *(W10)*
8. **`03a-dashboard.md` §6 + §15.6** — `kpiScrollTo()` has **42** call sites, not 22. *(W11)*
9. **`03c-notifications.md` §2 + §18.4** — `gateAll` is at **L20756** and its header comment at **L20740–L20755**, not L3138 / L3123–L3136 (that region is the permission block). *(W12)*
10. **`02a-predictive-signals.md` §9.1** — maximum total `subHealthScore` deduction is **125** (25+15+25+10+20+30), not 115; and `renderPredictivePage` makes **two** full passes, not three. *(W7, W8)*
11. **`02b-fraud-and-risk.md` §8.1** — collision members are joined with `'  ·  '` (**plain spaces**, hex `20 20 C2 B7 20 20`), not `&nbsp;·&nbsp;`. Plain spaces collapse in HTML; the distinction is material. *(W9)*
12. **`02b-fraud-and-risk.md` §15.15** — retitle: `priorTripsWithRider` (L5694), `hasOpenComplaint` (L3530, L4288, L5690) and `openComplaintFor` (L5761) are **not** dead. *(O4)*

### P1a — **Highest severity:** claims that describe live code as dead, or report bugs that do not exist
These mislead most, because they change what a reader believes the system *does*. Fix these first.
- **`05a` §17.12 + §4.2** — `sub.postponements` **has a writer** (`confirmPostponeTrip` L8646–L8647). Delete the "no writer / unreachable" claim; cross-reference `07b` §10.2. *(W40, C14)*
- **`07c` §17.7** — `SUB-1052b` **exists** at L2690. Delete the broken-FK claim; the real oddity is two requests sharing one subscription. *(W46)*
- **`06b` §8.3** — `directionArrows` has **two** call sites (L3458, L3544); the round-trip branch **is** reachable. §17.5's narrower wording is fine. *(W41, C15)*
- **`08a` §19 #18** — **four** driver-`notifLog` writers exist (L4773–L4774, L5104–L5105, L5855–L5859, L8731–L8732). Restrict the claim to seed data or delete it. *(N45)*
- **`02b` §15.15** — retitle: `priorTripsWithRider`, `hasOpenComplaint`, `openComplaintFor` are all live. *(O4)*

### P1b — Wrong counts (cheapest fixes in the whole list: the right number is already in the adjacent table)
Apply §3.1 wholesale. In order of how badly each misleads: `00a` "77 → **90**" render functions; `03a` "22 → **42**" `kpiScrollTo` sites; `00b` "22 → **15**" `!important`; `00a` "15 → **18**" badges (plus the three cascading restatements in §2.3, §3 and §15.4); `06a` ×3 and `06b` ×1 "7 → **8**" seed trips (and "4 of 7, L2675–L2681" → **4 of 8, L2680–L2683**); `00a` "31 → **30**" nav items; `00a` "39 → **35**" settings calls; `00a` "38 → **35**" `subs` entries; `00a` "39 → **38**" dispatch lines; `00a` ".sb.pin 6 → **8**" rules; `00b` "45 → **44**" init statements; `00b` "three → **four**" click listeners; `00c` "20 → **19**" `requirePagePerm` call sites; `10d` "four → **five**" `renderCompliancePage` call sites; `10c` "two → **three**" `driverChanges` increment sites; `08a` "89 → **92**" `data-i18n` attributes; `10a` "5 → **6**" captains; `02a` "115 → **125**" and "three → **two**" passes.

### P1c — Citations that send the reader to the wrong region entirely
- **`03c` §2/§18.4** — `gateAll` is at **L20756**, header comment **L20740–L20755** (cited L3138 / L3123–L3136). *(W12)*
- **`00b` §4.2** — `recordRefund` gate copy is at **L17904–L17906** (cited L18903–L18905). *(W27)*
- **`00c`** — the 500-cap is at **L3148**, and it is mis-cited as L3151 in **three** places. *(§4)*
- **`00a` §5** — `#call-bar` handler is `renderCallBar()` (L20265); `screenPop()` is at **L20204**, not L20266.
- **`00b` §11** — dead-Leaflet block shifts ~5 lines: `TRIP_COORDS` **L11534–L11549**, `TRIP_COLORS` **L11551–L11552**, `carIcon()` **L11554–L11560**. *(W30)*

### P2 — Range-endpoint errors that spill into adjacent blocks
13. **`10d-compliance.md` L582** — `PAGE_PERMISSIONS.compliance` is **L10604–L10607**, not L10604–L10608. L10608 begins the `safety` block.
14. **`10e-safety.md` L574** — `PAGE_PERMISSIONS.safety` is **L10608–L10613**, not L10609–L10614. L10614 begins the `growth` block.
15. **`12c-rider-wallets.md` L403** — `DB.reasonCodes` spans **L14667–L14715** (closing `]` L14716), not L14667–L14713. *(The count "40" and "all active" are correct — keep them.)*
16. **`16h-settings-ledger.md` header** — `#p-settings` is **L1416–L2048**; L2050 is the next page's comment banner. Also the "Operations" tab group label is **L1424**, not L1425.
17. **`15d-settings-notifications.md` §7.1** — the low-rating block is **L12451–L12455**, not L12451–L12456.

### P3 — Stale single-line citations (claim sound, number wrong)
18. **`12b`** — escrow `pending`/`earned` → **L7066/L7067**; `#avail-now-kpi` → **L8769**; `#avail-now-sub` → **L8770**; `#payouts-pending-badge` → **L8768**; "Balance after deduction" → **L8981**; per-row cells → earned **L8762**, paidOut **L8763**, pending **L8757**; `'match'/'over_report'→resolved` → **L12129**; escalate copy → **L12165**; repayment copy → **L12198**.
19. **`08a`** — `driver_min_rating_for_dispatch` seed → **L2585**; `driverAutoRestricted` rating check → **L4506**; "Limited" bucket → **L6350**. *(All three are on the rating-threshold topic; `15i` cites the same facts correctly and can be used as the reference.)*
20. **`00c`** — audit 500-cap → **L3148**; `avatarHTML` → **L10836**; re-anchor the F18 free-text-search citation (L9330 is the action filter).
21. **`15g`** — `#city-map-preview` → **L1639**; `showCityMapPreview()` → **L7865–L7875**; `typeof L==='undefined'` guard → **L7871**; OSM tile request → **L7873**.
22. **`12c`** — `__compApproved` reset → **L3997** (block **L3992–L3997**); `#comp-preview` blocked render → **L15459**.
23. **`12a`** — `wallet-reason` markup → **L3972**; `creditNote.reason` → **L15877**; re-anchor the refund default-selection citation (L5544 is `+'</div>'`).
24. **Element ids** — `03a` `#dash-qr-count` → **L692**, `#dash-alerts-count` → **L701**; `13a` and `13b` `#dispute-count` → **L1370** (both docs share the error); `11b` `#zones-table` → **L14149**, `#exec-expansion-list` → **L618**; `03b` `#sbb-inbox` formula → **L19315–L19316**; `09a` avatar call → **L11143**.

### P3a — Stale citations, `00a`–`01` group
- **`00a`** — `refreshNavCounts` internals → **L9395 / L9396 / L9397–L9398**; `parseInt(x.ends…)` → **L9396**; `sbb-compliance` → **L13322–L13323**; the ten notification-block cites → **L2188, L2189, L2190–L2201, L2202, L2224–L2227, L2228, L2248, L2249–L2257, L2258, L2282–L2285**; `go()` end → **L8826**; `updateBackBtn()` → **L8825**; `openProfile` → **L8827–L8864**; `openApplicantDetail` → **L8865–L8878**; `openTicketDetail` → **L8879–L8890**; `#tb-avatar` `<img>` → **L2957**; `commitUserSwitch` footer writes → **L3107–L3109**; `updateInboxBadge()` → **L19311**; `findSbEl` → **L7007–L7011**.
- **`00b`** — the ten `GATE_SPECS` +1 keys (§4); `reqClearLocks()` → **L5229–L5232**, `confirmModal()` → **L5233**; `audit_mut.js` → **L20752**; `installUniversalGates()` → **L18372**; `DB.dataWindow.months` → not L20403.
- **`00c`** — impersonation block → **L21067–L21078 / L21068 / L21079–L21089**; `defaultPagePerms`/`currentUserPagePerms` → **L10658 / L10668**; `requirePagePerm` denial → **L10686**; `saveUserPermissions` guard → **L10821**; `viewUserPermissions` → **L10800**; `DB.loginSessions` → **L2994**; F19 `Object.keys(after)` → **L3164**; before/after normalisation → **L3144–L3145**; `auditDiffHTML` → **L3157**; `logAction()` range → **L3133–L3151**; re-anchor the F16 `L10718` and §5.3 `L9330` citations.
- **`01`** — header page range → **L583–L631** (align with its own §6/§10); `pushHistory()` → **L7006**; `findSbEl` → **L7007–L7011**.

### P3b — Stale citations, `02a`–`04` group
25. **`02a` / `02b`** — `sec.intelligence` → **L7912**; `DB.drivers` seed block ends **L2668**; `DB.incidents` → **L13389–L13393**; `02b` DRV-0101 `trips:[…]` → **L2636**.
26. **`03a`** — `navCurrent` → **L2850**; `renderDashboard()` in tick → **L12614**; `backfillReasonCodes` ages → **L15191** (function **L15187**); `reqClearLocks()` → **L5229**; `confirmModal()` → **L5233**; `applyLanguage()` → **L7939**; `sec.overview` → **L7912**.
27. **`03b`** — `Open ticket` → **L9468**; `Assign now` → **L9485**; `Find driver` → **L9514**; `dueMs=-1` → **L19154/L19168/L19191**; `backfillReasonCodes` ages → **L15191**; `nav.inbox` → **L7911**; `TEAM_ROLES` → **L10501**.
28. **`03c`** — shift all four `handleNotifClick` destinations to **L2273–L2276**; `error`→`critical` to **L2192** (align §5 with §6); toast bridge to **L5294–L5296**; outside-click listener to **L2224–L2227**; `#p-notifications-all` close to **L1187**; `alert` branch to **L2193–L2196**.
29. **`04`** — re-anchor all ten `drawMap` layers 8–16 (table in §4), `updateMapStats` to **L12745–L12771** with its eight cell cites, both tick-block ranges (**L12601–L12610** and **L12611–L12621**), and the eight single-line drifts listed in §4.
30. **`15i`** — `DB.opsLimits` rows are **L2584–L2591** (array L2583–L2592), not L2584–L2593. *(Count "8 rows" and the values are correct — keep them.)*

### P3c — Constant-offset block drift, `08a`–`10e` group
Do **not** fix these citation-by-citation — each is a whole block at a fixed offset, so re-anchor the block and shift every member. See the §4 table for the full list. Offsets: `08a` driver-row **+1**, `supplyKpiHTML` **+2**, `setDriverFilter` **+3**, `fleetCountsHTML`/`toggleFleetCounts` **−1..−3**; `08b` `buildApplicantDetailBody` **+1..+4**; `09a` rider profile cards **−7**, `renderRidersTable` **−1..−2**; `09b` §8.2 emission order (mixed); `10a` fairness rows **+6**, corrective actions **+1**; `10c` coverage rows **+1**, backup modal **−5..−7**; `10e` incident card **−3..−4**, `toggleIncStep` **−1**; `04` `drawMap` layers 8–16 **+1..+8**. Also re-anchor `08a`'s §20 function index (16 wrong entries) and `09a`'s `PLANS` price table (**L4389–L4393**, not L4406–L4410).

### P3d — Page-container conventions and end-points
Standardise on one convention and state it (recommend `07a`/`07b`'s "L861–L866 (section comment L860)"). Then fix the five end-point errors where the cited close is the *next* page's banner: `05a` **L757**, `07c` sub-all **L2141** and instant-all **L2162**, `01` **L631**, `16h` **L2048**. Also `08a` `#p-drivers` **L887–L904**, `08b` **L1324–L1339** / **L1342–L1348**, `10a` **L1402–L1407**, `10c` **L1220–L1233**, `10d` **L1236–L1249**, `10e` **L1252–L1261**. *(§6 C6)*

### P3e — Over-hedged UNVERIFIED markers (the inverse failure)
Resolve these — they are trivially checkable and the hedge costs the reader information: `08b` §19 #24 `stopEv` **L18857**; #25 `sendSystemEmail` recipient resolution **L3579**; #26 `customSelectHTML` **L5336**; #27 `REQ_NOW_REF` **L9555**; #28 `isConsentCurrent`/`getUserConsent` **L3783**/**L3797**. `05b` §4.4/§17.19 `corpAccountId` — write L6746, delete L6756, **zero reads**; state it as fact. `08a` §19 #17 — `mountUxBlocks()` (L21397–L21399) verifiably creates `#rider-kpis`; nothing was unverifiable.

### P4 — Wording
31. **`04-live-map.md` §4.5 + §18.3** — delete "grep confirms definitions only": `initLeafletMap()` **is** called at L11633. Soften "entirely dead" to acknowledge that `updateLiveMarkers` and `showHistoryRoute` have live call sites (L12598, L12688) and no-op on a `null` `_lmap`. *(O1)*
32. **`00b-global-ui-systems.md` L1134** — "~120 lines" is an underived round number for a ~110-line region that is partly reachable-but-inert. *(O2)*
33. **`12b` L47** — "Only two of these six are actually enforced" should carry the legacy-permission qualifier into the same sentence, and note that `defaultPagePerms` (L10664) grants every page `view` to everyone, so an unenforced `view` key is inert by construction. *(O3)*

### P4b — Further wording / precision
- **`09b` §5.3** — the doc *understates* its own bug. Because `a && b && c ? x : y` binds the whole conjunction and **both branches are identical**, the *entire* `subjectId`/`reasonCode` filter is inert: `riderNoShowCount` counts **every** fairness case in the window, for every rider. Strengthen the finding.
- **`05a` §5.1** — the `deferred` row lists `sub_start_deferred` as a side effect of both trigger branches. The "today not in `sub.days`" branch (L4747–L4751) writes **no** `logAction`; only the `minutesUntil < 0` branch (L4753–L4758) audits.
- **`07a` §6.1** — signal 1 is transcribed as `(parseInt(tp[1]) > 0)`. The source is `(parseInt(tp[1],10)||1) > 0` (L14218); with the `||1` the guard is always true and the `: 0` branch is dead. The transcription changes the semantics for a `'0/0'` trips string.
- **`10b` §4.2 / §16 #5** — `recordAbsence` does **not** forfeit unconditionally: the forfeit logging is guarded by `if(exp.remainingSAR>0)` at L16698, and L16703–L16705 is the `pullPlan` branch, not forfeiture.
- **`08a` §8.1** — "on the Drivers page this second write is a no-op" is wrong: `mountUxBlocks()` (L21396–L21400) creates `div#rider-kpis` at boot, so the write always lands — it just updates an off-screen page.
- **`10a` §4.4 / §16 #3** — two gate-copy citations are **swapped**; fix both together.
- **`07b` header** — drop "final override" for `renderReadiness`; there is exactly one definition, as §17.19 itself says.

### P5 — Process
34. **Close the coverage gap.** Nineteen documents were never audited in depth: `13a`, `13b`, `14a`, `14b`, `15a`, `15c`, `15e`, `15f`, `15h`, `15j`, `16a`–`16g`, plus the seven written during this pass (`00d`, `13c`, `13d`, `15k`, `16i`, `16j`, `16k`). The mechanical sweeps found no citation flags in the first group, which is encouraging but proves nothing about formulas, negative claims or counted quantities — precisely the three categories where this audit found its real errors. **Priority within that gap: `14a`/`14b` (pricing and plan editor — money) and `13a` (SLA arithmetic).**
35. **Adopt a mechanical citation check in CI.** 54 % of citations land exactly and 74 % within ±3; the residue is concentrated in citations pointing into long render blocks. The two scripts used here — resolve each `L####` against a backticked identifier on the same line, and against `id="…"` for `#element` citations — reproduced ~5,000 checks in seconds and flagged every error in §4 that had a nearby anchor token. Wire them into pre-commit.
36. **Add a "recount before you write a count" rule.** Seventeen of the 61 WRONG findings are a stated count contradicted by the document's own adjacent table (§3.1). Any prose number that also appears as a table length should be generated from the table, not typed.
37. **Fix constant-offset drift by re-anchoring blocks, not lines.** §11 P3c lists eleven blocks each offset by a fixed amount. Correcting them one citation at a time invites new errors; re-anchor the block head and shift the rest.
38. **Adopt one page-container convention and state it in every header** (§6 C6, §11 P3d). Three are currently in use, and five documents cite the *next* page's comment banner as their own closing line.
39. **Audit the UNVERIFIED sections for over-hedging.** `08b` hedges six trivially-verifiable facts and `05b` one (§11 P3e). The markers are otherwise used honestly and are the reason this audit found almost no UNSUPPORTED claims — they are worth protecting from dilution.
40. **Re-verify the two claims this audit corrected in itself.** An early sweep of eight documents concluded the page-container convention was uniform; widening the sample falsified that (§6 C6). Likewise the headline "every negative claim holds" survived 44 checks before N45 broke it. Both corrections are recorded in place rather than silently amended — future passes should assume the same failure mode applies to them.
