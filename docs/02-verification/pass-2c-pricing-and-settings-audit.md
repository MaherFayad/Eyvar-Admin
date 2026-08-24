# Verification Pass 2c — Pricing & Settings Audit

> Scope: the 19 documents pass 2 could not audit in depth | Claims sampled: **1,778** — 1,560 hand-verified line citations, **30 money formulas re-derived from source**, 9 non-money formulas, **98 negative claims falsified-or-confirmed**, 40 counted quantities recounted, 26 enumerations checked for completeness, across **19 of 19** target documents examined in depth.
>
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines). Every claim below was checked by reading the cited source line directly, never by trusting the document's own reasoning. Findings produced by the two Tier-3 sweeps were re-verified against source by the lead auditor before publication.

**Verdict in one line: the money is clean — 30 of 30 formulas correct — but this pass found four false negative claims where pass 2 found one in the whole corpus, and three of the four come from a single blind spot: the `GATE_SWEEP` confirmation registry (§6.4).**

## 1. Why this pass exists

Pass 2 (`pass-2-accuracy-review.md`) carries an explicit coverage caveat. From its §1 (doc L9):

> **Coverage — read this before trusting any per-document silence.** Audited **in depth**: `00a`, `00b`, `00c`, `01`, `02a`, `02b`, `03a`, `03b`, `03c`, `04`, `05a`, `05b`, `06a`, `06b`, `07a`, `07b`, `07c`, `08a`, `08b`, `09a`, `09b`, `10a`, `10b`, `10c`, `10d`, `10e`, `11a`, `11b`, `12a`, `12b`, `12c`, plus `15b`, `15d`, `15g`, `15i`, `16h`. Covered **only by the whole-corpus mechanical sweeps** (which found no flags in them, a weakly positive signal): `13a`, `13b`, `14a`, `14b`, and the remaining `15*`/`16*` files. **Unassessed**: the seven late arrivals. A document not appearing in §3–§5 has not been cleared — it may simply not have been examined.

From its §2 scorecard note (doc L78):

> *Coverage caveat: `13a`–`14b` and most of `15*`/`16*` were still under audit when this report was finalised; the totals cover `00a`–`12c` in depth plus `15b`/`15d`/`15g`/`15i`/`16h` and the whole-corpus mechanical sweeps. See §11 P5.*

And from its confidence table (doc L52):

> \| `13a`, `13b`, `14a`, `14b`, `15a`, `15c`, `15e`, `15f`, `15h`, `15j`, `16a`–`16g` \| **Unassessed (weak positive)** \| Mechanical sweeps produced **zero** flags for these files — every identifier- and element-id-anchored citation resolved — but no formula re-derivation or negative-claim check was run. Not cleared. \|

Pass 2 also recorded *why* the gap existed: two subagents could not launch against a concurrency limit, so nineteen documents received only the mechanical identifier sweep. This pass closes that hole for every document in that row, excluding `00d`, `13c`, `13d`, `15k`, `16h`, `16i`, `16j`, `16k`, which pass 2b owns.

**The "weak positive" signal turned out to be genuinely weak.** The mechanical sweep found zero flags in these files because it can only check whether an identifier appears at a cited line. It cannot detect a formula with the wrong operator, a count that contradicts the table beside it, a negative claim that is simply false, or a range whose endpoint spills into the next block. Every one of the 91 WRONG findings below is of a kind that sweep was structurally unable to see.

**Tiering.** `14a`/`14b` (pricing — money) and `13a`/`13b` were audited in full by the lead auditor. The sixteen `15*`/`16*` settings documents were audited by two parallel sweeps under the same method; their WRONG findings were then re-verified line by line against source before being recorded here.

---

## 2. Verdict + confidence rating per document

**Headline: pass 2's central conclusion survives contact with all nineteen documents — the reasoning is sound, the pointers are not.** Thirty formulas were re-derived and all thirty matched. But this pass found **four false negative claims** where pass 2 found one in the whole corpus, and they cluster around a single blind spot: **the `GATE_SWEEP` confirmation registry** (§6.4).

| Document | Verdict | Confidence | Basis |
|---|---|---|---|
| **`14b-plan-editor.md`** | Cleared, with 3 count fixes and 1 false negative | **Very high** | Strongest document in this pass. ~250 citations sampled; six drifted, all by one line. Every load-bearing anchor exact: 14 form-load writes, 10 `numval` save writes, the whole feature subsystem, `savePlan`'s sequence, `renderPlansFormSelects`, `customSelectHTML` (incl. the non-obvious `options.length>6` search gate), `GATE_SWEEP.savePlan` verbatim, `upd()`'s nine internal lines, the whole HTML index. Its six-row worked-example table is correct to the thousandth. Defects: W2 (feature add/remove **are** gated), W5–W7 (13→14, 13→14, nine→ten). |
| **`14a-pricing-plans.md`** | Substance sound; pointers need a systematic pass | **High on substance, Low-medium on citations** | All six formula families exact; the 42-cell surge matrix correct in every cell; all four dead-data negatives true; the `approveRateCard` permission gap real. But **five constant-offset citation blocks**, one false negative (W1, `planLegPrice`), one wrong-region citation (`approveRateCard` L21603 → **L21582**), and a six-times-repeated wrong `ACTION_LABELS` range. |
| **`13a-support-center-tickets.md`** | Cleared, with 1 count and 2 range fixes | **High** | The eleven-function permission-asymmetry claim is entirely correct with all three gate citations exact. `DB.slaPolicy`, `slaState()`, `slaUrgency()`, `rcPriority`, `PAGE_PERMISSIONS.support` and `openTicketDetail()` all exact — the last two being places pass 2 found *other* documents getting wrong. Independently caught a live bug ("38 reason codes" vs a 40-entry array). Defects: "five T1 codes" → **four**, the `DB.reasonCodes` range overshooting into `DB.contacts`, and a uniform +1 across eight `slaStampNewTicket` rows. |
| **`13b-disputes-and-lost-found.md`** | Cleared, with 2 seed-line fixes | **High** | The seven-branch arrival-evidence decision table is reproduced **perfectly** — all seven conditions, verdicts and confidence scores, in source order. "No money actually moves" verified by reading `resolveDispute` end to end. All six negative claims true. Defects: two seed line numbers (one contradicted by its own §4) and four single-line drifts. |
| **`15h-settings-gateways.md`** | Cleared | **Very high** | Every markup and JS citation exact; all six computed gateway volumes re-summed to the cent from the 10 seeded payments; every dead-code verdict grep-confirmed. One of only two documents in the whole Tier-3 set that **correctly reports the `GATE_SWEEP` layer**. 6 STALE, 0 WRONG. |
| **`15j-settings-cancellation-policy.md`** | Cleared | **Very high** | Both money formulas re-derive operator-for-operator including rounding order and clamp placement. Every dead-code grep reproduces exactly the line-set named — `graceMin`'s four sites and `getCancellationRule`'s five call sites are given precisely. 10 STALE, 0 WRONG. |
| **`16e-settings-push.md`** | Cleared, with 1 count fix | **Very high** | Every function range and nearly every HTML citation exact; the 11-option and 11-label enumerations verbatim; the `updatePushCharCount` bug real and correctly cited. Defects: "three label mismatches" → **two** (its own bullet list has two), and the gate-registry offset. |
| **`16d-settings-emails.md`** | Cleared | **Very high** | The 21-`sendSystemEmail`-call-site enumeration is byte-perfect — every line number and every category, with an exact 13/5/2/1 tally. Only the gate-registry block and the L7673–L7693 helpers drift. |
| **`16g-settings-pricing-windows.md`** | Substance strong; **its §10.1 model table needs correcting** | **High on formulas, Medium on the model taxonomy** | Every pricing formula re-derives operator-for-operator including the load-bearing subtleties. Its central thesis is fully verified: `DB.rateCard` prices nothing, the live surge cap is 2.5 not the 2.0 the tab advertises, the guard copy "Every new trip prices under this card" is false, and `approveRateCard` has zero permission checks. **But §10.1 misattributes pricing model #3** (§5.2) and ~30 citations into `renderPricing`'s template interior drift +2…+5. |
| **`16a-settings-branding.md`** | Cleared | **High** | Layout, field and rule citations near-exact; every negative claim verified; the `resetBranding` → `maxUploadMB` → `NaN` → silently-disabled 12 MB cap chain is verified end to end. Defects: the gate-registry offset and `ACTION_LABELS` L2900–L2910 → **L2898–L2909**. |
| **`16c-settings-legal-consent.md`** | Cleared | **High** | Function-body citations exact. Its headline finding is correct and important: the comment at L3778 promises join-date-aware consent seeding while `getUserConsent` (L3790–L3791) unconditionally takes the *oldest* version, so all three compliance badges render red at boot. Defects: the `renderLegalConsent` template block uniformly −3, and the gate-registry offset. |
| **`15f-settings-dispatch.md`** | Cleared with 3 corrections | **Medium-high** | ~30 markup and ~25 JS citations exact; the `nearestAvailableDrivers` pseudocode is a faithful transcription including the radius ladder. Defects: the `value="undefined"` claim is **false** (all six keys are assigned at L17182–L17187), six "Confirms? no" cells are **false**, and one seed line points at the wrong driver. |
| **`15c-settings-permissions.md`** | Cleared with 3 corrections | **Medium-high** | The 22-page / 52-action `PAGE_PERMISSIONS` table and the 13 × 4 role matrix are flawless, and all 19 `requirePagePerm` call-site line numbers are exact. Undercut by a false "only invoked from `renderTeamTable()`" headline that its own §5 contradicts, and a wrong count (30 → **37**). |
| **`16b-settings-data-integrity.md`** | Substance sound; **citation layer is the weakest in the pass** | **Medium** | Window semantics, patch semantics, the rebuild generator and the missing permission gate all verified true. But two large blocks (L18600–L18670 and L20440–L20530) are offset by +2…+7, several point-cites land in the wrong function, and its header contradicts its own §2 map on `#window-body`. |
| **`15a-settings-general.md`** | Cleared with 2 corrections | **Medium** | Substance holds and all four inert-setting claims are true. Defects: whole-block drift across the JS/i18n region, a wrong citation triple for the hardcoded `SAR` claim (true claim, three wrong pointers), and a false "Confirms? no". |
| **`16f-settings-export.md`** | Substance sound; **do not navigate from this document** | **Low-medium** | The findings hold — two incompatible CSV encoders, zero permission checks on all nine exports, `exportAuditLog` self-mutating via `downloadCSV`'s `logAction`, and a gate whose copy is verbatim correct and verbatim wrong about the code. But the entire `L7592–L7670` export block is mis-cited in **inconsistent directions** (−17 to +34), so a reader cannot follow a single pointer reliably. |
| **`15e-settings-security.md`** | **Correct one headline finding before use** | **Low-medium** | Source-line work is near-perfect and the session-timeout clamp derivation is exact, including the observation that it is not written back. But the document's most emphatic claim — "`twoFA` has no setter", asserted **three times** — is false: `toggleMa2FA()` writes `u.twoFA=val` at **L3050** and logs it at L3051. The true, narrower claim is that there is no *admin* path to enrol someone else. |

---

## 3. Accuracy scorecard (same categories as pass 2 §2)

| Category | Claims checked | Confirmed | WRONG | STALE | OVERSTATED | UNSUPPORTED |
|---|---:|---:|---:|---:|---:|---:|
| Line citations — hand-verified, Tier 1 (`14a`, `14b`) | 430 | 372 | 10 | 45 | 3 | 0 |
| Line citations — hand-verified, Tier 2 (`13a`, `13b`) | 150 | 128 | 3 | 19 | 0 | 0 |
| Line citations — hand-verified, `15a`–`15j` | 380 | 296 | 9 | 70 | 3 | 2 |
| Line citations — hand-verified, `16a`–`16g` | 600 | 466 | 57 | 74 | 1 | 2 |
| **Financial formulas re-derived** | **30** | **30** | **0** | 0 | 0 | 0 |
| Scoring / non-money formulas re-derived | 9 | 9 | 0 | 0 | 0 | 0 |
| **Negative claims** | **98** | **94** | **4** | 0 | 0 | 0 |
| **Counted quantities** | 40 | 33 | **7** | 0 | 0 | 0 |
| Enumerations claimed exhaustive | 26 | 25 | 1 | 0 | 0 | 0 |
| Seed data / record counts | 15 | 15 | 0 | 0 | 0 | 0 |
| **Total (this pass)** | **1,778** | **1,468** | **91** | **208** | **7** | **4** |

*Category counts are per-category tallies, not a strict partition: a handful of claims (notably the four false negatives, each of which is also a wrong pointer) are counted in two rows. The "Total" row is the count of distinct claims sampled.*

**Three things to read out of this table.**

1. **The money is clean, again.** Thirty formulas — plan pricing, rate-card fares, plan quotes, surge resolution, quick-ride fares, commission derivation, dynamic subscription pricing, cancellation refunds and fees, gateway volume aggregation, the history-reconstruction fare model — **re-derived operator-for-operator, thirty matches, zero errors**, including every rounding order and every clamp placement. Added to pass 2's 45, the corpus now stands at **75 of 75 money formulas verified correct**.

2. **`STALE` still outnumbers `WRONG`, but by less than before** — 208 vs 91, a ratio of 2.3 : 1 against pass 2's 5.3 : 1. That is not because the reasoning got worse; it is because these nineteen documents had never had a *negative-claim* or *count* check run on them, and those are the two categories where errors concentrate. **48 of the 91 WRONG findings are `16b` and `16f` alone**, both of which are citation-layer failures rather than analytical ones.

3. **Four false negative claims, all one blind spot.** Pass 2 found one in 53. This pass found four in 98 — and three of the four are the same mistake: *the document did not look in `GATE_SWEEP`* (§6.4).

---

## 4. Pricing formula audit (Tier 1 — every formula re-derived, operator by operator)

Method: each formula was re-read from `eyvar_ops_panel_v40_fixed.html` and compared term-by-term against the document's written-out version, including operator precedence, rounding order and clamp placement.

### 4.1 `cr()` — the plan-editor price model (`14a` §6.1, `14b` §6)

Source, **L12986** (citation exact in both documents):

```js
function cr(pm,pk,d,c,ex){var g=(20*pm)+(10*pk),dc=g*(1-d/100),t=dc*ex,dr=t*(1-c/100);return{g:g,t:t,dr:dr};}
```

| Term | Source | `14a` §6.1 | Match |
|---|---|---|---|
| `g` | `(20*pm)+(10*pk)` | `(20 × price_per_min) + (10 × price_per_km)` | OK |
| `dc` | `g*(1-d/100)` | `g × (1 − discountPct/100)` | OK |
| `t` | `dc*ex` | `dc × execute_days` | OK |
| `dr` | `t*(1-c/100)` | `t × (1 − eyvarPct/100)` | OK |
| driver share % | `(100-c).toFixed(1)` L12989 | `100 − eyvarPct` (L12989) | OK |

**Rounding order:** there is **no** rounding inside `cr()`. Rounding happens only at display, via `fmt(n)=n.toFixed(2)+' SAR'` (**L12985**). Both documents state this correctly, and `14b` §6.4 explicitly says "There is no rounding in the stored data". **No clamping exists anywhere in this path** — a `discountPct > 100` produces a negative plan total with no guard. `14b` §19 item 12 documents that gap correctly; `14a` does not raise it but does not claim otherwise.

**Worked example re-derived** (`14a` §6.1, seeded `weekly` Economy `ecoMin 0.95`, `ecoKm 1.10`, `d 0`, `c 20`, `ex 5`):
`g = 20×0.95 + 10×1.10 = 19.00 + 11.00 = 30.00`; `dc = 30.00`; `t = 150.00`; `dr = 120.00`. **Matches the document digit-for-digit.**

**`14b` §6.4's six-row worked-example table re-derived independently** — all six rows correct, including the unrounded thousandths (`208.772`, `297.578`, `385.407`, `563.805`). Bi-weekly Economy: `g=17.00+9.80=26.80`, `dc=26.80×0.95=25.46`, `t=254.60`, `dr=254.60×0.82=208.772`. Monthly Comfort: `g=21.00+12.50=33.50`, `dc=30.15`, `t=663.30`, `dr=663.30×0.85=563.805`. Exact.

`upd()` **L12987–L12999** — citation exact in both documents. The two `cr()` invocations are L12993 (Economy) and L12994 (Comfort); `14b` §6.3 cites every one of its nine internal lines (L12988 through L12998) **exactly**.

### 4.2 `fareFor()` — rate-card fare (`14a` §6.4)

Source **L21467–L21480** (document cites **L21466**–L21480; L21466 is the `/* fare calculation */` comment — STALE, §7):

| Term | Line | Source | Document | Match |
|---|---|---|---|---|
| `raw` | L21470 | `c.base+(km*c.perKm)+(min*c.perMin)` | same | OK |
| `fare` | L21471 | `Math.max(raw,c.minFare)` | `max(raw, c.minFare)` | OK |
| `mult` | L21472–L21473 | `opts.surge||1`, then `if(opts.isPlanLeg)mult=1` | same, "structurally excluded" | OK |
| `surge` | L21477 | `r2(fare*(mult-1))` | `round2(fare × (mult−1))` | OK |
| `total` | L21478 | `r2(fare*mult)` | `round2(fare × mult)` | OK |

**Clamp order verified:** the minimum-fare clamp is applied **before** the surge multiply (L21471 then L21478), so a min-fare trip inside a surge window is charged `minFare × mult`, not `max(raw × mult, minFare)`. The document's ordering is correct. `minApplied` is recorded from the *pre-clamp* comparison (`raw<c.minFare`, L21476) — also correct.

### 4.3 `planQuote()` — plan pricing from the rate card (`14a` §6.4)

Source **L21484–L21509** (document says L21484–**L21510**; L21510 opens the next comment).

Every operator matched: `legs` L21485, `one` L21486, `perDay` L21487, `listPrice` L21488, `disc` L21489, `price` L21490, `legCount` L21491, `driverShare` L21493, `captainCost` L21494, `platformCost` L21495–L21496, `breakEven` L21497, `floor` L21498.

Two rounding subtleties the document gets right:
- `perDay` is `r2(one+one*returnLegFactor)` on the round-trip branch but a **bare `one`** (already rounded inside `fareFor`) otherwise — no double rounding. The document writes it exactly that way.
- `platformCost` is a **single** `r2(...)` wrapping the sum of three unrounded terms (L21495–L21496), not three separately-rounded terms. The document writes one `round2(...)` around the whole expression.

`belowFloor` is a bare `price<floor` (L21507) with no epsilon; `captainPerEngagedHour` guards the division with `min?…:0` (L21508). Both correctly described. **The return-object citations drift by exactly −2 from `marginSar` onward** — see §7.

### 4.4 `currentSurgeMultiplier()` — surge schedule resolution (`14a` §6.3)

Source **L12389–L12400** — citation exact, and **every internal line citation in the document is exact** (L12391, L12392, L12395, L12396, L12397, L12399).

```
L12391  if(!cfg||!cfg.enabled) return 1
L12392  now=REQ_NOW_REF; hour=now.getHours(); day=WEEKDAYS[now.getDay()]
L12394  forEach over DB.surgeSchedule
L12395    if(!s.enabled) return
L12396    if(s.days.indexOf(day)<0) return
L12397    if(hour>=s.startHour && hour<s.endHour) mult=Math.max(mult,s.multiplier)
L12399  return Math.min(mult, cfg.capMultiplier||2.5)
```

**Composition rule confirmed:** `Math.max` — overlapping windows do **not** compound. The ceiling is applied **after** the loop, once. Start hour inclusive, end hour exclusive. `14a` §6.3 states all four correctly.

**The resolved hour × day matrix (`14a` §8) was re-derived independently** against the seed (`DB.surgeSchedule` **L13883–L13887**, citation exact, all values exact). Every one of the 42 cells in the document's matrix is correct, including the `surge_3`-disabled parenthetical for Thu/Fri 20:00–22:59 and the note that no seeded combination reaches the 2.5 ceiling.

Clock: `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` at **L9555** — exact. Month index 5 = June; 25 June 2026 **is** a Thursday, so the document's "Thu 25 Jun 2026 09:14" and its conclusion that hour 9 on Thu matches no window (7–9 is exclusive of 9) are both right.

### 4.5 `quickRideFare()` (`14a` §6.2)

Source **L12401–L12405** — citation exact.
`base = t ? (t.baseFare + km*t.perKm + min*t.perMin) : (2.50 + km*1.10 + min*0.35)` (L12403) — fallback literals exact.
`return (base*currentSurgeMultiplier()).toFixed(2)` (L12404) — **surge multiplies the base fare too**, exactly as documented, and the result is a *string*. Type lookup is by `name` with a `||(DB.quickRideTypes||[])[0]` first-entry fallback (L12402). No `t.active` filter (N9).

The three example figures in `14a` §7 re-computed: Economy `2.50+11.00+7.00=20.50`, Comfort `4.00+16.00+10.00=30.00`, Large `6.00+21.00+13.00=40.00`. All exact.

**Multi-stop composition (`14a` §6.3, last paragraph):** `stopFee = stops.length × (DB.multiStopConfig.extraStopFeeSAR||3)` (**L12418**), then `fare = subId ? '0.00' : (parseFloat(quickRideFare(...)) + stopFee).toFixed(2)` (**L12419**). The surcharge is added **after** the surge multiply, not inside it, and a subscription leg is forced to `'0.00'`. Document correct; both lines exact.

### 4.6 `commissionRateForPlan()` (`14a` §4, §16)

Source **L4461–L4466** — citation exact.

```
key  = planKeyFromLabel(planLabel)                                   L4462  (fn at L4450, exact)
plan = key && DB.plans[key]                                          L4463
if (plan && plan.eyvarPct != null) return (100-plan.eyvarPct)/100     L4464
return driverCommissionRate()                                        L4465
```

`driverCommissionRate()` **L4467** = `DB.opsConfig.pricing.driverCommissionPct ?? 80`, `/100` — exact.
`planKeyFromLabel` L4450–L4456 tests `'bi-weekly'`/`'biweekly'` (L4452) **before** `'weekly'` (L4453) — the ordering that makes `'Bi-weekly Comfort'` resolve to `biweekly` rather than `weekly`. Correct, and a subtlety neither document flags but neither gets wrong. (Contrast pass 2's W48, where `05a` got the analogous `indexOf('Weekly')` reasoning wrong.)

### 4.7 `computeDynamicSubPrice()` — the third model (`14a` §6.5)

Source **L4535–L4556** — citation exact. `directionMult` L4537, `weeks` L4538, `totalTrips` L4539–L4540, route branch L4543–L4549, `estMin` L4546, `legFare` L4547 — all exact, all operators matched including `Math.round(x*100)/100` in every rounded term.
`perTripBaseRate()` **L4529–L4533** exact: `PLANS[cadence][comfort|eco] / PLANS[cadence].exec`.
**`perTripFare` / `gross` / `total` cited L4551 / L4552 / L4553 — actual L4552 / L4553 / L4554** (+1 drift; L4551 is the `if(!usedRealDistance)` fallback line). The formulas themselves match exactly.

### 4.8 `planFloorCheck()` (`14a` §6.4)

Source **L21512–L21517** (document says L21512–L21518; L21518 is blank). `{ok: price>=q.floor, shortfall: r2(Math.max(0,q.floor-price))}` matches. `price = proposedPrice||q.price` (L21514) — the document omits that a caller may override the price, but does not misstate it.

### 4.9 `buildFareBreakdown()` — the fourth model (`16b`, `16g` §10.1)

Source **L18656–L18665**; both documents cite **L18657** for the literals — exact.
`base=4.00, perKm=1.35, perMin=0.42` (L18657); `distance=r2(km*perKm)` L18658; `time=r2(min*perMin)` L18659; `subtotal=base+distance+time` L18660; `surgeAmt = surge>1 ? r2(subtotal*(surge-1)) : 0` L18661; `tolls = seededRand(seed+7)>0.9 ? 5.00 : 0` L18662; `gross = subtotal+surgeAmt+tolls` L18663, rounded L18665. All exact.
**Note the composition shape is identical to `quickRideFare` + `stopFee`:** surge applies to the base-inclusive subtotal, and the flat add-on (tolls / stop fee) lands after the multiply.

### 4.10 Formula verdict

**Nine formula families re-derived; nine match operator-for-operator, including rounding order and clamp placement. Zero WRONG formulas, zero wrong worked examples, zero wrong matrix cells.**

Pass 2 re-derived 45 money formulas elsewhere and all 45 matched. Adding these nine gives **54 of 54 money formulas in the corpus verified correct.** The failures in the Tier 1 pair are all *pointers* and *quantifiers*, never *maths* — the same split pass 2 found across the other 41 documents.

---

## 5. The four-pricing-models claim — **partly verified, materially mis-framed**

The claim appears in `14a` §19 item 1, `16g` §10.1, `00-index/SYSTEM-OVERVIEW.md` L201–L202, `04-relations/ENTITY-RELATIONSHIPS.md` X10, `04-relations/MODULE-DEPENDENCY-MAP.md` §4.3 and `COUPLING-ANALYSIS.md` L107, and it is load-bearing in `05-restructure/PROPOSED-STRUCTURE.md` (the Pricing & Plans merge rationale, L273 and L711) and `PAGE-TRACEABILITY-MATRIX.md` row 16.

It was checked two ways: independently by this agent, and independently again by a second auditor working only from `16g`. **Both arrived at the same correction.**

### 5.1 The four Economy per-km rates — each verified at source

| # | Model | Rate | Source line | Verbatim | Value verdict |
|---|---|---:|---|---|---|
| 1 | `DB.rateCard.classes.economy` | **1.20** | **L21439** | `economy:{label:'Economy',base:5.00,perKm:1.20,perMin:0.40,minFare:12.00,` | ✅ exact |
| 2 | `DB.quickRideTypes[0]` | **1.10** | **L13909** | `{id:'economy',name:'Economy',baseFare:2.50,perKm:1.10,perMin:0.35,active:true},` | ✅ exact |
| 3 | `DB.plans.weekly.ecoKm` | **1.10** | **L2890** | `…ecoMin:0.95,ecoKm:1.10,comfortMin:1.35,comfortKm:1.60,…` | ✅ exact |
| 4 | `buildFareBreakdown()` literal | **1.35** | **L18657** | `var base=4.00, perKm=1.35, perMin=0.42;` | ✅ exact |

**All four values are real and all four citations are exact.** As a statement about *what numbers exist in the file*, the claim holds.

### 5.2 The mis-framing — rate #3 prices nothing, and `16g` names the wrong structure for it

`grep -n "ecoKm"` returns **exactly seven hits, none of them a pricing site**:

| Line | Context |
|---|---|
| L2890 / L2892 / L2894 | the three seed values |
| L6078 | `gid('fp3-ekm').value=p.ecoKm;` — plan-editor form load |
| L6104 | the `newPlan()` default template |
| L6127 | the `before` snapshot inside `savePlan()` |
| L6139 | `p.ecoKm=numval('fp3-ekm',p.ecoKm);` — form save |
| L6146 | the `logAction` after-payload |

`comfortKm` is identical. **Nothing multiplies `ecoKm` by a distance. It is not even rendered in the plans table** — `14a` §4 says so correctly ("Not shown in the plans table"). It is dead configuration that an operator can edit, that gets audited, and that changes no price anywhere.

`16g` §10.1 row 3 compounds this by naming the wrong structure:

> \| 3 \| **Plan template rates** \| `DB.plans` L2889–2896: `ecoMin`/`ecoKm`/… \| `perTripBaseRate(cadenceKey,vehicleType)` fallback at L4551 \| Subscription quote when no route is picked \|

`perTripBaseRate()` is at **L4529–L4534** and its body is:

```js
var p=PLANS[cadenceKey];
if(!p)return 0;
var totalAtBaseline=vehicleType==='Comfort'?p.comfort:p.eco;
return totalAtBaseline/p.exec;
```

It reads **`PLANS`** — a different constant at **L4389–L4393** holding *flat per-period totals* (`weekly:{exec:5,eco:86.50,comfort:122.50}`) — and divides by `exec`. It never touches `DB.plans` and never touches a per-km rate at all. Weekly Economy resolves to `86.50 / 5 = 17.30 SAR per leg`, a per-trip figure with no distance term. **Classify: WRONG** (see W14).

`14a` §19 item 1 gets the taxonomy **right** — it lists `DB.plans` and `PLANS`/`CADENCE_META`/`CADENCE_DAYS` as two *separate* models. `16g` §10.1 merges them and inherits the error into every downstream summary.

### 5.3 Disjointness — one model is genuinely isolated, two share a consumer

- **`DB.rateCard` is fully disjoint.** All **22** references lie between L21431 and L21826 (the last being its boot-manifest entry, `{name:'pricing engine', fn:pricingBoot, needs:['rateCard','trips']}`). `fareFor()` has exactly four call sites — L21481, L21501, L21502, L21656 — all inside the same block. **No trip, quote, invoice, payout or subscription in the panel is priced from it.** `PROPOSED-STRUCTURE.md`'s stronger phrasing, "Nothing outside the pricing module reads `DB.rateCard`", is **verified true**.
- **`buildFareBreakdown` is disjoint.** Its three literals are inline; its `surge` argument comes from the caller (L18714, L18785), not from any rate table.
- **`DB.quickRideTypes` and `PLANS` share a consumer.** `computeDynamicSubPrice()` (**L4535–L4556**) reads `DB.quickRideTypes` at L4544/L4547 *and* calls `perTripBaseRate()` → `PLANS` at L4551. They are the two branches of one `if(routeKm)/else`, so they never apply simultaneously — but one function chooses between them at runtime, which is not what "disjoint" means. `14a` §6.5 documents this crossover correctly and in detail.
- **A subscription's price and its commission come from different models.** The price comes from `PLANS`/`CADENCE_META` (model 2); the commission comes from `DB.plans[key].eyvarPct` via `commissionRateForPlan()` (**L4463**). One transaction, two rate sources.

### 5.4 Corrected framing

> There are **five** distinct fare structures in the file: `DB.rateCard` (L21431), `DB.quickRideTypes` (L13908), `PLANS` (L4389), `DB.plans`'s per-minute/per-km fields (L2889), and `buildFareBreakdown`'s literals (L18657). **Only three of them price anything.** `DB.rateCard` prices nothing outside its own settings card; `DB.plans.ecoKm`/`comfortKm` price nothing at all. The three live models are `DB.quickRideTypes` (quick rides, and the route-based subscription branch), `PLANS`/`CADENCE_META` (the flat subscription fallback and every discount a rider is shown), and `buildFareBreakdown` (all reconstructed history).

### 5.5 Does the restructure rationale survive?

**Yes.** The proposal's argument is that pricing is fragmented across incompatible sources that disagree and that nobody can safely change one without knowing the others. That is *more* true under the corrected framing, not less: five structures, three live, two dead-but-editable, and an operator-facing editor whose per-km fields change nothing. `PROPOSED-STRUCTURE.md` L711's separate claim — "**We are computing captain earnings four different ways**" — is independently **verified**:

- `DB.rateCard.commission` = `{onDemand:22, subscription:20}` — **L21449** ✅
- `DB.plans[*].eyvarPct` = 20 / 18 / 15 — **L2890 / L2892 / L2894** ✅
- `CADENCE_META[*].eyvarPct` = 20 / 18 / 15 — **L4521–L4523** ✅ (an independently-read duplicate)
- `driverCommissionRate()` fallback = `DB.opsConfig.pricing.driverCommissionPct ?? 80` — **L4467** ✅
- and a fifth, hardcoded: `driverEarn = fare*0.8` in the history rebuilder — **L18757** ✅

**Recommended edits:** in `16g` §10.1, `SYSTEM-OVERVIEW.md` L201–L202, `ENTITY-RELATIONSHIPS.md` X10 and `MODULE-DEPENDENCY-MAP.md` §4.3 — replace "four disjoint pricing models / four different Economy per-km rates" with "**three live fare models plus two unconsumed rate tables**", relabel the `1.10` at L2890 as dead configuration, and correct model #3's structure from `DB.plans` to **`PLANS` (L4389)**, its formula from a per-km rate to `totalAtBaseline / exec`, and its entry point from L4551 to **`perTripBaseRate()` L4529–L4534**.

## 6. WRONG claims

### 6.1 Tier 1 — `14a` / `14b`

| # | Doc | Claim | Cited | Actual source content | Correction | Why it matters |
|---|---|---|---|---|---|---|
| **W1** | `14a` §6.4 (doc L251) and §19 item 22 (doc L666) | "no call site for `planFloorCheck()` **or `planLegPrice()`** was found in this file"; "`planFloorCheck()` (`L21512`) **and `planLegPrice()` (`L21481`) have no call sites**" | L21481 | **L21486** is `var one=planLegPrice(cls,km,min);` — a live call inside `planQuote()`. `renderPricing()` calls `planQuote` twice per example row (L21657–L21658) across 3 rows × 2 classes = **12 live invocations on every Settings→Pricing render** | `planFloorCheck()` is genuinely uncalled. **`planLegPrice()` is called and executes.** The document **contradicts itself in the same paragraph** — its own UNVERIFIED note says "the only hit for `planLegPrice` is inside `planQuote()` `L21486`", and its own §6.4 pseudocode writes `one = planLegPrice(cls,km,min)` as line 2 of `planQuote` | **CONTRADICTION + false headline.** A reader scanning §19 for dead code deletes a live function. Same shape as pass 2's W40 (`05a` `postponements`) |
| **W2** | `14b` §13 (doc L394–L395) and §19 item 9 (doc L549) | "**+ Add feature point** … Confirms? **No**"; "**✕** (per feature row) … Confirms? **No**"; "Feature add / remove / reorder are **entirely ungated**: no `requirePerm()`, **no confirmation**, no audit entry (`L6030`, `L6037`, `L6042`)" | L6030 / L6037 / L6042 | `GATE_SWEEP.addPlanFeature` — **L20838**: `{t:'Add a feature bullet',c:['Appears on the rider-facing plan card.'],btn:'Add'}`. `GATE_SWEEP.removePlanFeature` — **L20839–L20840**: `{t:'Remove a feature bullet',c:['Disappears from the rider-facing plan card on save.','If riders bought the plan for this promise, removing it is a product decision, not a copy edit.'],btn:'Remove'}`. Installed by `gateAll(GATE_SWEEP)` at **L20899** | **Both add and remove open a confirmation modal.** The "no `requirePerm()`" and "no audit entry" halves are correct; the "no confirmation" half and both "Confirms? No" cells are false. Only **reorder** (`pfDrop` L6042) is genuinely ungated | **False negative claim.** Understates a safety rail that the product actually has, and misleads anyone auditing destructive-action coverage. `14a` reads the same registry correctly for its own actions |
| **W3** | `14a` §19.9 (doc L653) + §20 index (doc L713); `14b` §13 (3×), §19.7, §20 index | "`ACTION_LABELS` (**`L2899–L2913`**)" | L2899–L2913 | `var ACTION_LABELS={` is **L2898**; the object closes `};` at **L2909**. L2910 is blank and **L2911–L2913 are the `/* ── My Account (full page) ── */` comment block** | **L2898–L2909.** Both endpoints wrong; the end spills 4 lines into unrelated content | Quoted **six times** across the pair. Pass 2's W24 caught the same object mis-ranged in `00c` — a shared upstream error, like the `backfillReasonCodes` case in pass 2 §1 |
| **W4** | `14a` §13 (2×, doc L490–L491) + §19.9; `14b` §19.7 | "`activate_plan` (label 'Activate plan' **`L2911`**)"; "`deactivate_plan` … **`L2911`**"; "Only `activate_plan` / `deactivate_plan` are registered (**`L2911`**)" | L2911 | L2911 is `/* ── My Account (full page) ──`. Both labels are at **L2907**: `activate_plan:'Activate plan',deactivate_plan:'Deactivate plan',` | **L2907.** Off by 4, into a comment in an unrelated block | Quoted four times |
| **W5** | `14b` §2 call chain (doc L51) and §20 index (doc L624) | "(**13** direct field writes) `L6069–L6082`"; "populates all **13** fields" | L6069–L6082 | **14** consecutive `gid(...)` writes: `fp3-name-en`, `fp3-name-ar`, `fp3-duration`, `fp3-exec`, `fp3-cap`, `fp3-sort`, `fp3-comm`, `fp3-disc`, `fp3-emin`, `fp3-ekm`, `fp3-cmin`, `fp3-ckm`, `fp3-eco-active`, `fp3-comfort-active` | **14** | Pass 2 §3.1 pattern exactly — the document's own §4 table lists all fourteen with their line numbers |
| **W6** | `14b` §11 (doc L322) | "All **13** core inputs \| `L6069–L6082`" | L6069–L6082 | Same 14 writes. Excluding the two checkboxes gives 12; no reading yields 13 | **14** (12 if checkboxes excluded) | §3.1 pattern |
| **W7** | `14b` §13 `savePlan` sequence, step 7 (doc L412) | "then the **nine** numeric fields via `numval()` (`L6132–L6141`)" | L6132–L6141 | **Ten** `numval()` writes — `duration` L6132 through `comfortKm` L6141 | **Ten.** Self-contradictory: the same section's step 5 correctly enumerates a 12-field `before` snapshot = 2 names + **10** numerics | §3.1 pattern |
| **W8** | `14a` §11 (doc L424) and §14.1 col 9 (doc L523) | Active-subs cell colour logic — "`L5937`" | L5937 | L5937 is `+'<td>'+statusBadge(p.status)+'</td>'` — the **Status** cell. The active-subs colour ternary is **L5936** | **L5936**; and the Status badge is **L5937**, not the document's L5938 | Two adjacent cells, both cited one line late — the whole cell block L5935–L5939 is cited as L5936–L5940 |


### 6.2 Tier 2 — `13a` / `13b`

| # | Doc | Claim | Cited | Actual source content | Correction | Why it matters |
|---|---|---|---|---|---|---|
| **W9** | `13a` §18 item 2 (doc L762) | "`frBreached` requires `frMs>0` (`L14782`), and **all five T1 codes** set `fr:0`" | — | `DB.reasonCodes` L14667–L14715 contains **four** `tier:'T1'` entries: `CAP_CONDUCT` (§1.5), `TRP_GHOST_COMPLETE` (§4.3), `SAF_RIDER_UNSAFE` (§6.1), `SAF_ACCIDENT` (§6.2). Tier split is 4 / 12 / 15 / 9 = 40 | **Four.** The document's own 40-row taxonomy table (§8) has exactly **four** `\| T1 \|` rows. The substantive claim — `fr:0` means no first-response breach — holds for all four | §3.1 pattern: the right answer is on the page |
| **W10** | `13a` §1 (doc L14), §8 (doc L263), §19 index (doc L830) | "`DB.reasonCodes`, **`L14667–L14722`**" (3×) | L14667–L14722 | The array closes `];` at **L14716**. L14717 is blank, **L14718 is `DB.contacts=[];`**, L14720 is a comment banner and **L14721 is `function rcById(code){`** — the cited range swallows an unrelated `DB` key and the first lookup function | **L14667–L14716** (40 entries, L14669–L14715) | Range-endpoint overshoot into the next sibling — pass 2's recurring shape. `12c` mis-ranges the *same* array in the opposite direction (L14667–L14713), so **two documents mis-state one array's bounds in two different ways** |
| **W11** | `13a` §19 index (doc L831) | "`rcById` … `gvRC` \| **`L14726–L14754`**" | L14726 | **L14721** is `function rcById(code){`. L14726 is `function rcTierObj(code){` — the *second* function in the group | **L14721–L14754.** The end (`gvRC` closing at L14754) is exact | Start of a named range points at the wrong function |
| **W12** | `13b` §18 item 1 (doc L516) | "`DB.disputes` is seeded at **`L14390`**" | L14390 | **L14391** is `DB.disputes=[`. L14390 is the preceding comment line | **L14391** — which the document's **own §4 table (doc L71) already gives correctly**. Internal contradiction between §4 and §18 | Low; but it is a self-contradiction of the kind pass 2 flagged in `00b`, `03c` and `01` |
| **W13** | `13b` §18 item 2 (doc L517) | "`DB.lostFound` is seed-only (**`L14451`**)" | L14451 | **L14448** is `DB.lostFound=[`; L14449–L14450 are the two seeded records and L14451 is the third/closing region | **L14448.** *(The substantive claim — seed-only, no creation path — is **TRUE**: every other reference to `DB.lostFound` is a `.find`, `.map` or `forEach`.)* | Low |

**No formula, money-movement or permission claim in `13a`/`13b` was found to be wrong.** Both documents' substantive analysis held everywhere it was tested.


### 6.3 Tier 3 — `15*` and `16*`

Full per-document tables were produced by two independent Tier-3 sweeps; the highest-severity findings are consolidated here, and every one below was **re-verified directly against source by this agent** before publication.

| # | Doc | Claim | Cited | Actual source content | Correction |
|---|---|---|---|---|---|
| **W14** | `16g` §10.1 row 3 | Pricing model #3 = "**Plan template rates** — `DB.plans` L2889–2896: `ecoMin`/`ecoKm`/… — entry point `perTripBaseRate(cadenceKey,vehicleType)` fallback at L4551" | L2889–L2896 / L4551 | `perTripBaseRate` is **L4529–L4534** and its body reads `PLANS[cadenceKey]` — a *different* constant at **L4389–L4393** (`weekly:{exec:5,eco:86.50,comfort:122.50}`) — returning `totalAtBaseline/p.exec`. It never touches `DB.plans` and never touches a per-km rate. `ecoKm` has **zero** pricing consumers (L2890/2892/2894 seed, L6078 form-load, L6104 template, L6127 snapshot, L6139 form-save, L6146 audit) | Model #3 is **`PLANS` (L4389)**, a flat per-period total ÷ exec days — SAR 17.30/leg for weekly Economy. See §5.2. `14a` §19 item 1 lists `DB.plans` and `PLANS` as separate models and is **right**; `16g` merges them and the error propagates into four downstream documents |
| **W15** | `15e` §8, §9, §11 item 2 (asserted **3×**) | "**`twoFA` has no setter** — the panel provides **no way** to enrol a user in 2FA"; "the flag has no setter anywhere in the file"; "nothing in the panel can change them" | L10455 / L2831–L2841 | **L3047** `function toggleMa2FA(val){` … **L3050** `u.twoFA=val;` … **L3051** `logAction('toggle_2fa','team_user',u.id,'Two-factor authentication '+(val?'enabled':'disabled'),{twoFA:!val},{twoFA:val});`, driven by the My-Account toggle at L3022–L3023 | A setter exists and is audit-logged. The true, narrower claim is that there is **no admin path** — a user can only change their own flag; nothing lets an operator enrol someone else. **Verified independently by this agent.** |
| **W16** | `15e` §5, §11 item 9; `15a` §5 | "`Save security settings` — Confirms? **no**"; "**No `guardAction` confirmation** on `saveSecurityConfig`"; "`Save general settings` — Confirms? **no**" | — | **L20780** `saveSecurityConfig:{t:'Save security settings',d:true,irr:false,…btn:'Save security'}` and **L20771** `saveGeneralConfig:{t:'Save platform settings',d:true,…btn:'Save settings'}`, both inside `GATE_SWEEP`, installed by `installGateSweep()` at **L20903** → `gateAll(GATE_SWEEP)` **L20899** | Both show a **danger** confirmation dialog. **Verified independently by this agent.** See §6.4 |
| **W17** | `15f` §5 (6 cells) and §11 item 7 | "Confirms? no" for `Save …radius`, `+ Add phase`, `Remove`, `Save search phases`, `Save plan visibility rule`; "**Deleting a phase has no confirmation**" | — | `GATE_SWEEP`: `saveOpsRadiusConfig` **L20777**, `saveSearchPhases` **L20801**, `savePlanVisibility` **L20807**, `addSearchPhase` **L20820**, `removeSearchPhase` **L20821** (`{t:'Remove a search phase',d:true,…}`) | All six are confirmation-gated; the phase deletion is `danger`-gated. See §6.4 |
| **W18** | `15f` §9 last bullet, §11 item 13, §3.6 | "six keys are absent from the `DB.commitPolicy` seed … rendering **`value=\"undefined\"`**" | L16541–L16560 | **L17182–L17187**: `emergencyMultiplierPct=150`, `dispatchWindowSec=45`, `dispatchMaxCandidates=5`, `riderCompPctPer10Min=20`, `riderCompCapPct=100`, `riderCompMinSAR=10` — all six assigned at load, before any render | No field ever renders `undefined`. §3.6's "(not in the seed)" column should read "defaulted at L17182–L17187". **Verified independently by this agent.** |
| **W19** | `15c` header and §8 | "`renderRoleMatrix()` / `renderPagePermMatrix()` — **both are invoked only from `renderTeamTable()`** (L10465–L10466)"; "the **only** way either matrix gets rendered" | L10465–L10466 | `renderRoleMatrix()`: L10465, **L10795**, **L10830**. `renderPagePermMatrix()`: L10466, **L10700**, **L10709**, L10795, L10830 | 3 and 5 call sites. **Contradicts its own §5 and §7.5**, which describe exactly those re-renders from the toggles |
| **W20** | `15c` §11 item 5 | "**30 of the 52** granular actions have no enforcement point" | §7.9 | §7.9's own 19 `requirePagePerm` call sites cover **15 distinct actions**; its own "never enforced" list is 22 `view` keys + 15 action keys | **37 of 52.** "30" is the count of *non-`view`* actions (52−22), a different quantity. Prose-vs-own-table again |
| **W21** | `16a`, `16c`, `16d`, `16e` (shared) | "`GATE_SPECS.resetBranding` **L20797–L20799**", "`GATE_SPECS.sendReconsentReminder` **L20807–L20809**", "`GATE_SPECS.sendBroadcast` **L20800–L20802**", "`GATE_SPECS.sendPushNotification` **L20803–L20805**" | L20797–L20809 | Those lines hold *other* gates — `saveSurgeSchedule.c`, `saveRideTypes`, `saveSearchPhases`, `savePlan`. The four real entries are **`resetBranding` L20846–L20847**, **`sendBroadcast` L20850–L20852**, **`sendPushNotification` L20853–L20854**, **`sendReconsentReminder` L20857–L20858** — and the registry is named **`GATE_SWEEP` (L20769)**, not `GATE_SPECS`. `GATE_SPECS` is a real but **different** registry at **L18245** | Wrong name *and* wrong line, ~−48, in four documents at once. The quoted gate **copy is verbatim correct in all four** — they read the right spec and recorded the wrong address. **Verified independently by this agent.** |
| **W22** | `16a` §12.9, §13 (and echoed in `16b`, `16c`, `16d`, `16e`, `16f`) | "`ACTION_LABELS` **L2900–L2910**" | L2900–L2910 | Declaration **L2898**, closes **L2909** | **L2898–L2909.** This is now the **third** distinct wrong range for the same object across the corpus: `14a`/`14b` say L2899–L2913 (W3), the `16*` group says L2900–L2910, and pass 2 corrected `00c` from L2898–L2913. One object, three wrong answers, four document families |
| **W23** | `16b` §5, §7.11, §10, §12–§13 (≈14 rows) | `rebuildAllHistory()` L18606–L18613; `guardAction(...)` L18615–L18624; `exportIntegrity()` L18615–L18628; `buildFareBreakdown()` L18654–L18659; `reconstructHistory()` L18662–L18672; `__histSeq` L18661; `seededRand` L18660 | L18600–L18670 region | `rebuildAllHistory` **L18600–L18606**; its guard **L18607–L18616**; `exportIntegrity` **L18617–L18627**; `seededRand` **L18654**; `buildFareBreakdown` **L18656–L18666**; `__histSeq` **L18667**; `reconstructHistory` **L18668–L18676** | A whole-block failure: seven consecutive functions each cited into the *previous* function's body, and two different functions given the **same** start line (L18615). Substance is unaffected; navigation is impossible |
| **W24** | `16f` (≈21 rows across §5, §7, §8.2, §9, §12, §13) | The entire `L7592–L7670` export block | — | `downloadCSV` **L7598–L7606** (cited L7632–L7641); `exportRiders`/`Drivers`/`Subscriptions`/`Payments` all **−7**; `exportAuditLog` **+5**, `exportInbox` **+13**, `exportEmailLog` **+10**, `exportPushLog` **+17**; `doExport` is **L9204+**, not L9130–L9152 | Mis-cited in **inconsistent directions**, so the usual "assume a constant offset" repair does not work. `16f`'s findings are sound; its pointers are unusable |
| **W25** | `16b` header vs its own §2 map | `#window-body` at **L1762** | L1762 | L1762 is `<div class="ch"><h2>🧮 Aggregate vs records</h2>`; the mount is **L1759**, which the document's own §2 layout map gives correctly | Internal **CONTRADICTION**; §2 is right |
| **W26** | `16g` §12 and its i18n table | Pricing tab is in group "**Operations**" (L1425) | L1425 | L1424 is `stabgrp.operations`; L1425 is the *dispatch* button. And `reorderSettingsTabs()` (L21278–L21313) **deletes** the static group headers at **L21288** and re-groups `pricing` under **`stabgrp.money` (L21272)** | The static header never renders; at runtime the tab is in **Money**. `16b` places integrity in `stabgrp.money` correctly — the two documents contradict each other and `16b` is right |
| **W27** | `16e` §12.2 | "**Three** label mismatches between `<option>` text and `PUSH_AUDIENCE_LABEL`" | — | L7710 vs L1947–L1959: only `nosub` and `flagged_drivers` differ; the other nine are byte-identical | **Two** — and the document's own bullet list beneath it contains exactly two items |
| **W28** | `15a` §11 item 1 | "Every money string is suffixed with a literal `SAR` (**L7467, L7419, L7386**)" | L7467 / L7419 / L7386 | L7467 is a gateway *type* badge (no `SAR`); L7419 is `toast('✅ Custom limit added…')` (no `SAR`); L7386 is `}` | Claim is **TRUE**, all three pointers are wrong. Correct proof: **L4394** `function fmtSAR(n){return n.toFixed(2)+' SAR';}` |
| **W29** | `15f` §9 | "`multiSubException:true` on `DRV-0101` (**L2650**)"; "mapPos `{x:60,y:55}` L2650" | L2650 | L2650 is `'DRV-0104' Hassan Al-Ghamdi … mapPos:{x:46,y:31}` | **L2632.** The substance ("DRV-0101 only") is TRUE — grep returns exactly one seed hit |
| **W30** | `16g` §9, §11, §5, §14 (4 point-cites) | `floors.*` at L21695/L21697; fallback zone list at L21723; "Propose a change" L21704; "Suspend a zone" L21713; boot registration L21823 | — | `floors.targetMarginPct` **L21690**, `floors.emergencyReservePct` **L21691**; zone fallback **L21727**; **L21699** and **L21711**; boot **L21826** | Template-string interior drift, +2…+5, throughout `renderPricing` |

### 6.4 The cross-cutting finding: **the `GATE_SWEEP` blind spot**

This is the most important structural result of the pass, and pass 2 could not have seen it — it only becomes visible once you check *negative* claims about confirmation behaviour.

The panel installs confirmation gates from **two** registries:

| Registry | Range | Entries | Installed by |
|---|---|---:|---|
| `GATE_SPECS` | **L18245–L18371** | **18** | `installUniversalGates()` **L18372**, loop L18374–L18375 |
| `GATE_SWEEP` | **L20769–L20885** | **45** (two deleted at L20886–L20887) | `installGateSweep()` **L20903** → `gateAll(GATE_SWEEP)` **L20899** |

`GATE_SWEEP` is **two and a half times larger** than `GATE_SPECS` and runs **later**. **Documents that consulted only `GATE_SPECS` concluded that actions were unconfirmed when they are not**, and documents that did find `GATE_SWEEP` frequently recorded it under the *other* registry's name and at the wrong line range. (Pass 2 audited `GATE_SPECS` in `00b` and found ten of its eighteen key lines off by one — so the smaller registry was checked and the larger one never was.)

| Document | Symptom | Verdict |
|---|---|---|
| `14b` | "Feature add / remove … no confirmation" | **W2** — false; L20838, L20839–L20840 |
| `15a` | "`Save general settings` — Confirms? no" | **W16** — false; L20771 |
| `15e` | "No `guardAction` confirmation on `saveSecurityConfig`" | **W16** — false; L20780 |
| `15f` | six "Confirms? no" cells | **W17** — false; L20777, L20801, L20807, L20820, L20821 |
| `16a`, `16c`, `16d`, `16e` | right spec, wrong registry name, ~−48 lines | **W21** |
| `14a`, `15h`, `15j` | **correct** — named `GATE_SWEEP`, cited exactly | ✅ |

**Three of this pass's four false negative claims come from this one gap.** A single sweep — grep every "no confirmation" / "Confirms? no" claim in the corpus against L20769–L20885 — would close it. Pass 2's audited documents were never checked on this axis either, so **the same defect may be latent in the 41 documents pass 2 cleared**; see §14.

---

## 7. STALE citations

Claim is sound; the line number is wrong. Grouped by document. **These documents share pass 2's diagnosed failure mode almost exactly**: function declarations, constant definitions and seed literals are reliably exact, while citations *into* multi-line object literals, HTML template strings and render-block interiors drift — often as a whole contiguous block offset by a constant.

### `14a-pricing-plans.md` — two constant-offset blocks, everything else exact

**Block A — `doActivatePlan` / `doDeactivatePlan` bodies, uniformly +1:**

| Claim | Cited | Actual | Note |
|---|---|---|---|
| `p.status='Active'` | L5960 | **L5961** | L5960 is `if(!p)return;` |
| `logAction('activate_plan',…)` (§9.2 and §19.8) | L5962 | **L5963** | L5962 is `closeModal();renderPlansTable();` |
| Toast `✅ <name> plan activated` | L5963 | **L5964** | |
| `p.status='Draft'` | L5981 | **L5982** | L5981 is `if(!p)return;` |
| `logAction('deactivate_plan',…)` | L5983 | **L5984** | |
| Toast `<name> plan deactivated` | L5984 | **L5985** | |
| `activeSubsForPlanCadence()` inside `confirmDeactivatePlan` | L5968 | **L5969** | the second cite in the same sentence, L5973, is exact |

*Every* range in this region is exact (`L5947–L5956`, `L5957`, `L5966–L5977`, `L5978`, modal bodies `L5950–L5954` and `L5971–L5975`, `requirePerm` at `L5958`/`L5979`) — only the interiors drift. By contrast `doArchivePlan` (L6165–L6175) is cited **exactly**, line for line, in the same table.

**Block B — `renderPlansTable` row cells, uniformly +1:**

| Claim | Cited | Actual |
|---|---|---|
| Name / Duration / Execute / Cap / Eyvar% / Discount / Eco-min / Comfort-min cells (§4, cited 8×) | L5936 | **L5935** |
| Active-subs cell + colour ternary (§11, §14.1) | L5937 | **L5936** |
| Status badge cell (§11, §14.1) | L5938 | **L5937** |
| `Edit` button | L5939 | **L5938** |
| `Activate`/`Deactivate` button (§9.2, §14.1, §19.13, and `14b` §9/§16) | L5940 | **L5939** |

**Block C — ride-type render cells, +1 to +3 (5 separate citations of the same line):**

| Claim | Cited | Actual |
|---|---|---|
| Example column `(t.baseFare+10*t.perKm+20*t.perMin).toFixed(2)` (§6.2, §11, §14.2, §17, §19.17) | L12345 | **L12346** |
| `t.name` rendered as `<p class="td-name">`, not editable | L12345 | **L12347** |
| Ride-type cell range | L12345–L12350 | **L12347–L12353** |
| In-table editable inputs `baseFare`/`perKm`/`perMin` | L12346–L12349 | **L12348–L12350** (+ `active` at L12352) |
| **Remove** button, `t.custom` guard (§13, §14.2, §19.10) | L12350 | **L12353** |

**Single-line drift elsewhere in `14a`:**

| Claim | Cited | Actual |
|---|---|---|
| `fareFor()` declaration (§6.4 and §20 index) | L21466 | **L21467** — L21466 is the `/* fare calculation */` comment |
| `approveRateCard()` (§16) | L21603 | **L21582** — L21603 is `guardAction('approveRateCard',…)`, its *confirmation wrapper*, not the function. **The most consequential citation error in the document**: a reader checking whether rate-card approval is permission-gated lands on the gate and concludes it is |
| `planQuote` return fields `marginSar` / `marginPct` / `belowFloor` / `captainPerEngagedHour` | L21503 / L21504 / L21505 / L21506 | **L21505 / L21506 / L21507 / L21508** — a uniform −2 block offset inside the return object literal |
| `effectiveSurge` range | L21523–L21532 | **L21523–L21530**; L21531–L21532 are the `suspendSurge` comment |
| `effectiveSurge` return line | L21530–L21531 | **L21529** |
| `planQuote` range | L21484–L21510 | **L21484–L21509**; L21510 opens the next comment |
| `planFloorCheck` range / its "blocks a publish" comment | L21512–L21518 / L21511 | **L21512–L21517** / comment spans **L21510–L21511** |
| `capByCity {RUH:2.0,JED:2.0}` (§8, §19.15) | L21459 | **L21458** |
| `appliesToPlanLegs:false` + `/* never. not a toggle. */` (§8; `14b` §8) | L21460 | **L21459** |
| `CADENCE_META` (§6.5, §17, §19.1, §20 index — 4×) | L4519–L4523 | **L4520–L4524**; L4519 is the closing `*/` of the preceding comment |
| `computeDynamicSubPrice` `perTripFare` / `gross` / `total` | L4551 / L4552 / L4553 | **L4552 / L4553 / L4554** |
| `execute` "the multiplier in the plan-total formula" (§4) | L12989 | **L12988** — L12989 is the driver-share line; `ex=gv('fp3-exec')` is L12988 |
| `saveSurgeSchedule` `logAction` with empty before/after (§13, §19.14) | L12331 | **L12330** |
| `saveSurgeConfig`: `DB.surgeConfig.enabled` write / `capMultiplier` clamp / `logAction` (§12, §13, §17, §19.18) | L12335 / L12336 / L12337 | **L12336 / L12337 / L12338** — a +1 block. *(`requirePerm` at L12335 is exact, which is what makes the block look right at a glance.)* |
| `addRideType` push / `logAction` / form clear (§7, §12, §13) | L12361 / L12362 / L12363 | **L12362 / L12363 / L12364** — +1 block. *(`var id='custom_'+Date.now()` **is** L12361, so the §7 cite of the id is right and the §12 cite of the push is wrong.)* |
| `saveRideTypes` `before` deep-clone (§13, §19.14) | L12376 | **L12377** — L12376 is `requirePerm`, cited correctly two cells away |
| Surge-window **Remove** button (§14.3) | L12298 | **L12299** — L12298 is the `enabled` toggle |
| Status dropdown "offers exactly these three" (§9.1) | L12801–L12805 | options are **L12803–L12805**; L12801 is the `if(!document.getElementById(…))` guard |
| Plan-visibility card header "👁️ Plan visibility" (§9.4) | L1603 | **L1604** — L1603 is `<div class="card">`, which is the correct start of the *range* L1603–L1618 |

### `14b-plan-editor.md` — remarkably clean; six single-line drifts in ~250 citations

| Claim | Cited | Actual | Note |
|---|---|---|---|
| `savePlan` step 6 — `btn.textContent='Saving…'; btn.disabled=true` | L6127 | **L6128** | L6127 is the second half of the `before` object literal |
| `savePlan` step 7 — `setTimeout(…,700)` opening | L6128 | **L6129** | *`14a` §17 cites the same latency as `L6129`/`L6148` — **correctly**. The two documents disagree; `14a` is right* |
| `cselPick` invoked "from each option's `onclick`" (§19.24) | L5346 | option markup runs L5345–L5348; **L5346** is `var searchBlob=…` |  |
| `runConfirm()` range | L17803–L17815 | **L17803–L17813**; L17815 opens the `guardAction` comment | |
| `cselSetValue()` range | L5427–L5438 | **L5427–L5439** (closing `}` at L5439) | |
| Gate-modal `⚠` danger prefix (§15) | L17787 | L17787 is `<div style="padding:16px 18px;max-height:60vh;…">`; the prefix is built earlier in `confirmAction` | |

Everything else sampled in `14b` was **exact**, including all 14 `loadPlanEditForm` field writes (L6069–L6082), all 10 `numval` save writes (L6132–L6141), the whole feature-list block (L5998–L6022, L6030–L6056), `newPlan` (L6098–L6108), `toggleVehicleActive` (L6109–L6116), `savePlan` (L6117–L6149), `numval` (L6150–L6155), `archivePlan`/`doArchivePlan` (L6156–L6175), `renderPlansFormSelects` (L12796–L12806), `upd()`'s nine internal lines (L12988–L12998), the listener binding (L13000–L13001), `customSelectHTML` (L5336–L5354, incl. the hidden input at L5352 and the `options.length>6` search-box gate at L5343), `GATE_SWEEP.savePlan` (L20804–L20806) and the entire `p-plan-edit` HTML index (L1081–L1129).

### `13a-support-center-tickets.md`

**Block — `slaStampNewTicket()` body, uniformly +1 (§4.1, eight consecutive rows):**

| Field | Cited | Actual |
|---|---|---|
| `reasonCode` | L14841 | **L14842** |
| `openedAtMs` | L14842 | **L14843** |
| `firstResponseAtMs` | L14843 | **L14844** |
| `lastUpdateAtMs` | L14844 | **L14845** |
| `resolvedAtMs` | L14845 | **L14846** |
| `pausedMs` / `pausedSinceMs` | L14846 | **L14847** |
| `slaBreaches` | L14847 | **L14848** |
| `reopenCount` | L14847 | **L14848** |

L14841 is `if(!t)return;`. The function's declared range `L14839–L14851` is off by one at the end only (closes **L14852**). This is the classic pass-2 constant-offset block: **a reader who spot-checks one row and finds it wrong must assume all eight are wrong by the same amount.**

**Single-line drift elsewhere in `13a`:**

| Claim | Cited | Actual |
|---|---|---|
| `Waiting on customer` filter option (§5, §18.1) | L12787 | **L12786** |
| `ticket.assignee` written by `bulkAssignMe()` (§4.1, §18.8) | L16177 | **L16178** |
| `runAutoReply` called from `createTicketFor()` (§9) | L2557 | **L2556** |
| New-ticket id `'TKT-'+(505+DB.tickets.length)` in `createTicketFor` (§4.1) | L2554 | **L2553** (L2554 is the `unshift`) |
| `slaBadge()` range (§19 index) | L14791–L14803 | **L14791–L14802**; L14803 is the `slaUrgency` comment |
| `DB.reasonCodes` range (3×) | L14667–L14722 | **L14667–L14716** — see W10 |
| `rcById … gvRC` range | L14726–L14754 | **L14721–L14754** — see W11 |

Exact in `13a`: `DB.slaPolicy` **L14650–L14660** and every tier value; `slaState()` **L14766–L14790** and the `frMs>0` guard at **L14782**; `slaUrgency()` **L14804–L14810**; `rcPriority` tier map **L14745–L14748**; `reasonSelectHTML()` **L14755–L14764** and the "Search 38 reason codes…" placeholder at **L14762**; `openTicketDetail()` **L8879–L8890** *(which is pass 2's own correction of `00a` — `13a` had it right independently)*; `createTicketFor()` **L2552–L2559**; `#tk-res` hardcoded `38` at **L1356**.

### `13b-disputes-and-lost-found.md`

| Claim | Cited | Actual |
|---|---|---|
| `DB.disputes` seed (§18.1 only; §4 is correct) | L14390 | **L14391** |
| `DB.lostFound` seed (§18.2) | L14451 | **L14448** |
| Open-dispute count `filter(status==='open').length+' open'` | L14398 | **L14399** |
| Goodwill `perTrip * 0.5` | L14436 | **L14437** (L14436 is `var perTrip=subEconomics(sub).perTrip`) |
| `advanceLF()` range | L14469–L14478 | **L14468–L14476** *(the page-perm cite `L14469` inside it is exact)* |

Exact in `13b`: `DB.arrivalConfig` **L17605–L17610** with all four constants (120 / 40 / 5 / 10); `resolveDispute()` **L14431–L14445**; `DB.disputes.map` render at **L14401**; the four verdict labels at **L17701–L17704**; and — the standout — **all seven arrival-evidence confidence scores in exact source order** (see §12).


### Tier 3 (`15*`, `16*`) — the drift is systematic and repairable as blocks

**208 STALE citations were recorded across the nineteen documents; 144 of them are in the Tier-3 set.** Four patterns account for almost all of them.

**Pattern A — the Settings nav-button row, off by +1 or +2 in every document that cites it.**

| Doc | Tab button cited | Actual | Note |
|---|---|---|---|
| `15a` | General L1422 | **L1421** | L1422 is the *Team* button |
| `15c` | Permissions L1424 | **L1423** | L1424 is `stabgrp.operations` |
| `15e` | Security L1442 | **L1440** | L1442 is *Activity* |
| `15f` | Dispatch L1426 | **L1425** | L1426 is *Cities* |
| `16g` | Pricing group "Operations" L1425 | **L1424** — and the header is deleted at runtime (W26) | |
| `15h`, `15j` | L1427 / L1429 | **exact** | the only two that are right |

**Pattern B — the `LANG_STRINGS` Arabic block, off by −1 to −2 in six documents.** `LANG_STRINGS` is **L7903–L7938** (cited L7899–L7935); `applyLanguage()` is **L7939–L7953** (cited L7936–L7951). Every `stab.*` / `sec.*` / `stabgrp.*` row inherits the shift: `15a`'s eighteen Arabic-key rows are each **+1**; `15e`'s `sec.*` block is **L7931–L7936** not L7930–L7934; `stabgrp.operations` is **L7914** not L7913; `stabgrp.money` is **L7915** not L7914. This matches pass 2's own finding that `02a`/`02b`/`03a`/`03b` all mis-cite this same block.

**Pattern C — whole-function-block offsets.** `16b`: L18600–L18670 and L20440–L20530 (see W23). `16f`: L7592–L7670, in inconsistent directions (W24). `16c`: the `renderLegalConsent` template block uniformly **−3** (badge/title **L3812** not L3809; sentence L3814; buttons L3815; version rows L3817). `16g`: `renderPricing`'s interior **+2…+5** across ~30 citations. `15c`: the entire permission-function region **L10776–L10835** shifted — `toggleRolePermission()` is **L10776–L10799** (cited L10778–L10786), `viewUserPermissions()` is **L10800–L10812** (cited L10787–L10800), `saveUserPermissions()` is **L10813–L10835** (cited L10801–L10820). *Note `15c`'s corrected `viewUserPermissions` L10800 and self-lockout guard L10821 agree exactly with pass 2's independent corrections to `00c`.*

**Pattern D — range endpoints overshooting by one into the following comment.** `15c`'s `renderRoleMatrix()` end (L10771 → **L10769**); `16b`'s `renderIntegrity()` (…L18604 → **…L18596**); `16g`'s `planQuote` (…L21510 → **…L21509**) and `planFloorCheck` (…L21518 → **…L21517**) — *the same two endpoint errors this agent found independently in `14a`, which points at a shared upstream source rather than two independent mistakes*; `15e`'s `commitInvite()` (L10528 → **L10529**); `15j`'s `cancelLiveTrip()` (L11805 → **L11804**).

**A representative sample of individual Tier-3 STALE entries** (the full lists live in the two sweep reports; these are the ones attached to money, permissions or dead-code claims, which is where a wrong pointer costs most):

| Doc | Claim | Cited | Actual |
|---|---|---|---|
| `16g` | `economy` seed values | L21438 | **L21439** |
| `16g` | `commission.onDemand` | L21446 | **L21449** |
| `16g` | `isPlanLeg` hardcode in `fareFor` | L21472 | **L21473** |
| `16g` | `rate_card_approved` audit key | L21597 | **L21598** |
| `16g` | `guardAction('approveRateCard')` | L21601–L21615 | **L21603–L21614** |
| `16b` | `driverEarn` = `fare*0.8` | L18755 | **L18757** |
| `16b` | `0.01` reconciliation tolerance | L18525 | **L18522** |
| `16b` | `saveDataWindow` `parseInt(v,10)||13` | L20518 | **L20516** |
| `16b` | `requirePerm` / `logAction` in `saveDataWindow` | L20517 / L20520 | **L20515 / L20518** *(`16g` §15 cites both correctly)* |
| `16b` | live card "on-demand commission is 22 %" | L21447 | **L21449** *(L21447 is the rationale comment)* |
| `15c` | `requirePerm('manage_team')` sites | 10529/10486/10688/10779/10802 | **10530/10485/10690/10777/10814** |
| `15c` | `PERMISSION_DESC.manage_team` override | L10516 | **L10521** *(pass 2 corrected `00c` to the same line)* |
| `15j` | `cancelSub()` formula block / `sub.paid` / `if(refund>0)` | 5521 / 5523 / 5562 | **5522 / 5524 / 5561** |
| `15f` | `planVisibility` seed | L2575 | **L2574** *(`14a` cites L2574 correctly)* |
| `15a` | seven falsy-guard writes in `saveGeneralConfig` | L7989–L7995 | **L7990–L7996** (each −1) |
| `15h` | `ACTION_LABELS` / `requirePerm` / `gateAll` endpoints | 2910 / 3132 / 20755 | **2909 / 3133 / 20756** |
| `16f` | `export_data` written at L7638 | L7638 | **L7604** *(L7638 is a comment banner)* |
| `16f` | `1000` ms revoke delay | L7639 | **L7603** *(L7639 is `function captureDailySnapshot(){`)* |

---

## 8. OVERSTATED / UNSUPPORTED

| # | Doc | Claim | Assessment |
|---|---|---|---|
| **O1** | `SYSTEM-OVERVIEW.md` L201–L202, `ENTITY-RELATIONSHIPS.md` X10, `MODULE-DEPENDENCY-MAP.md` §4.3 | "Four **disjoint** pricing models coexist" | **OVERSTATED, not WRONG.** Four rate sources exist and all four rates are verified. But models 2 and 3 are cross-read by `computeDynamicSubPrice()` (L4536 reads `CADENCE_META`, L4544 reads `DB.quickRideTypes`), and a subscription's price (model 2) is paired with a commission from model 1 (`commissionRateForPlan`, L4463). Only `DB.rateCard` (model 1's settings card) and `buildFareBreakdown` (model 4) are genuinely isolated. `14a` §6.5 documents the crossover correctly — it is the one-line summaries downstream that drop the nuance. Suggested wording: *"four independent rate sources that disagree, two of them cross-read"* |
| **O2** | `14a` §19 item 1 | "Editing a plan on this page changes **only** `commissionRateForPlan()` (`L4463`) and the dashboard cancel-cap alert (`L10366`)" | **Mildly OVERSTATED.** `liveSubtitles()` also reads `DB.plans` (L21251–L21252, count + status), as do `renderPlansTable()` (L5930) and `renderPlansFormSelects()` (L12799). The intended sense — *no rider-facing price changes* — is correct, and the document lists the other readers elsewhere in §16 |
| **O3** | `14a` §19 item 22 headline vs. its own UNVERIFIED note | "`planFloorCheck()` and `planLegPrice()` have no call sites" followed immediately by "the only hit for `planLegPrice` is inside `planQuote()` `L21486`" | **CONTRADICTION** — recorded as W1. The document knew the answer and stated the opposite in the headline |
| **O4** | `14b` §19 item 9 | "Feature add / remove / reorder are **entirely ungated**" | **WRONG on the confirmation half** (W2). The `requirePerm` and audit halves are correct; only reorder is fully ungated |
| **O5** | `14a` §19 item 24 | "No `GATE_SWEEP` spec **in this module** declares `options` or `irr` (`L20792–L20826`)" | **Conclusion TRUE, scope UNSUPPORTED as cited.** The module's specs are not contiguous — `savePlan` is at L20804 (inside the range) but `addPlanFeature`/`removePlanFeature` are at L20838–L20840 (outside it). The claim happens to hold for those two as well, so the verdict survives; the cited range does not support it |

**No `UNSUPPORTED` findings of the pass-2 "inverse failure" type** (facts marked UNVERIFIED that are trivially verifiable) were found in `14a`/`14b`/`13a`/`13b` — with one exception worth noting in the other direction: `14a` §19 item 22 marks its `planLegPrice` claim "UNVERIFIED beyond grep" and *then prints the disconfirming grep result*, which is the opposite of `08b`'s pattern: honest evidence, wrong conclusion.

---

## 9. Negative-claim verification

### 9.1 Tier 1 — `14a` / `14b`

Every negative claim in both documents was tested with a grep over the full source. **17 checked, 15 hold, 2 fail.**

| # | Claim | Doc | Grep | Hits | Verdict |
|---|---|---|---|---:|---|
| N1 | `planFloorCheck()` has no call site | `14a` §6.4, §19.22; `14b` §19.13 | `grep -n "planFloorCheck"` | **1** — the definition at L21512 only | ✅ **TRUE** |
| N2 | `planLegPrice()` has no call site | `14a` §6.4, §19.22 | `grep -n "planLegPrice"` | **2** — def L21481 **and a live call at L21486** inside `planQuote()` | ❌ **FALSE** — see W1 |
| N3 | `savePlan()` never reads `#fp3-status`; the Status dropdown is a no-op | `14b` §4, §9, §12, §19.1 | `grep -n "fp3-status"` → L1097, L12797, L12801, L12802, L12808 | **0 inside L6117–L6149** | ✅ **TRUE** |
| N4 | `sortOrder` has no consumer outside the form | `14a` §4, §19.3 | `grep -n "sortOrder"` | 8 — L2890/2892/2894 (seed), L6074 (load), L6104 (template), L6126 + L6146 (audit payload), L6135 (save). No sorter, no renderer. | ✅ **TRUE** |
| N5 | `ecoActive` / `comfortActive` have no consumer | `14a` §4, §19.4; `14b` §19.6 | `grep -n "ecoActive\|comfortActive"` | L2890/2892/2894, L6081–L6082, L6103–L6105, L6113. No pricing or render consumer. | ✅ **TRUE** |
| N6 | `nameAr` has no consumer outside the editor form | `14a` §4, §18, §19.7 | `grep -n "nameAr"` | L2890/2892/2894, L6070, L6103, L6124–L6126, L6131, L6146. No renderer, table, badge or export. | ✅ **TRUE** |
| N7 | `duration` has no pricing consumer | `14a` §4, §19.6 | plan-scoped `duration` reads | L5935 (display only), L6071, L6132. `CADENCE_DAYS` L11231 is used instead. | ✅ **TRUE** |
| N8 | `save_plan`, `archive_plan`, `toggle_vehicle_active` absent from `ACTION_LABELS` | `14a` §19.9; `14b` §13, §19.7 | `grep -n "save_plan\|archive_plan\|toggle_vehicle_active"` | 3 hits — **L6114, L6146, L6172, all `logAction()` call sites**. None inside `ACTION_LABELS` (L2898–L2909). | ✅ **TRUE** |
| N9 | `t.active` on a ride type is inert — `quickRideFare()` does not filter on it | `14a` §7, §19.16 | read L12401–L12405 | lookup is by `name` only (L12402); `t.active` appears only at L12352 (render) and L12383 (save) | ✅ **TRUE** |
| N10 | `removeRideType()` is the only ungated destructive action in the plans module | `14a` §13, §19.10 | `removeRideType` vs `GATE_SWEEP` L20769–L20885 | `removeRideType` absent from `GATE_SWEEP`; `removeSurgeWindow` L20825, `saveRideTypes` L20798, `addRideType` L20819, `addSurgeWindow` L20823 all present | ✅ **TRUE** |
| N11 | `activate_plan` logs a hardcoded `before:{status:'Draft'}` | `14a` §9.2, §19.8 | read L5963 | `logAction('activate_plan','plan',key,'Activated '+p.name+' plan',{status:'Draft'},{status:'Active'})` — literal, regardless of real prior status | ✅ **TRUE** (cited L5962; actual **L5963** — STALE) |
| N12 | `10 km / 20 min` is hardcoded inside `cr()` | `14a` §6.1, §17; `14b` §6.1, §17 | read L12986 | `(20*pm)+(10*pk)` — literals, no config read | ✅ **TRUE**, citation exact |
| N13 | `approveRateCard` has no `requirePerm`/`can` | audit brief; `14a` §16 (implied) | `sed -n '21582,21602p' \| grep -cE "requirePerm\|\bcan\("` | **0** | ✅ **TRUE — confirmed and recorded.** The only barriers are `guardAction('approveRateCard',…)` at L21603 (a *confirmation* gate), the self-approval block L21585–L21589, and the no-simulation block L21590–L21591. None is a permission check. A user with zero permissions who can reach the button at L21706 can publish a live rate card. |
| N14 | Plan `status` does not gate what riders can buy — `renderNewSubModal` iterates the frozen `PLANS`, not `DB.plans` | `14a` §9.4, §19.2 | `grep -n "DB.plans"`; read L4557–L4580 | `DB.plans` has **no reference anywhere between L4463 and L5930** — `renderNewSubModal` (L4557) cannot read it. L4571 is `Object.keys(PLANS).forEach(…)`. | ✅ **TRUE** |
| N15 | `renderRideTypesTable()` is not in the boot block | `14a` §2, §19.20 | `grep -n "renderRideTypesTable"` | 5 hits: def L12342, router L8807, and L12365/L12372/L12386 (post-mutation re-renders). Boot block L14557–L14600 does not contain it — L14570 is `renderQuickRidesTable()`. | ✅ **TRUE** |
| N16 | No `GATE_SWEEP` spec in this module declares `options` or `irr` | `14a` §19.24 | read L20792–L20826 + L20804, L20838–L20840 | none of `saveSurgeConfig`, `saveSurgeSchedule`, `saveRideTypes`, `savePlan`, `savePlanVisibility`, `addRideType`, `addSurgeWindow`, `removeSurgeWindow`, `addPlanFeature`, `removePlanFeature` carries `o:` or `irr:` | ✅ **TRUE** (the cited range L20792–L20826 omits `addPlanFeature`/`removePlanFeature` at L20838–L20840, but the claim holds for them too) |
| N17 | Feature add / remove / reorder are **entirely ungated**: no `requirePerm()`, **no confirmation**, no audit entry | `14b` §13, §19.9 | `grep -n "addPlanFeature\|removePlanFeature"` | **`GATE_SWEEP.addPlanFeature` at L20838 and `GATE_SWEEP.removePlanFeature` at L20839–L20840**, installed by `gateAll(GATE_SWEEP)` at L20899 | ❌ **FALSE** — see W2 |

**Result: 15 of 17 negative claims hold.** Pass 2 found exactly one false negative claim (`08a`'s `notifLog`) across 53 checked. This pass adds **two more** — both in the Tier 1 pricing pair, and both of a kind pass 2's mechanical sweep could not have caught, because the identifier resolves fine; only the *quantifier* around it is wrong.

---


### 9.2 Negative-claim verification — Tier 2 (`13a` / `13b`)

**14 checked, 14 hold.** Both documents' negative claims are sound; only their line numbers drift.

| # | Claim | Doc | Grep / read | Result | Verdict |
|---|---|---|---|---|---|
| N18 | `Waiting on customer` has no setter — filter value only; the SLA pause branch is unreachable through the UI | `13a` §5, §18.1 | `grep -n "Waiting on customer"` | **2 hits only** — L12786 (the filter option) and L14868 (the pause branch that tests for it). No button, modal or bulk action writes it | ✅ **TRUE** (cited L12787; actual **L12786**) |
| N19 | `DB.slaPolicy.breachEscalateTo` is written and never read | `13a` §4.3, §18.5 | `grep -n "breachEscalateTo"` | **1 hit** — L14658, the declaration | ✅ **TRUE**, citation exact |
| N20 | `reasonCode.target` is defined on all 40 codes and never read | `13a` §18.7 | `grep -n "\.target\b"` + read `rcTargets` L14730–L14739 | All `.target` hits are DOM event targets or `p.target` on a *push notification* object (L13521). **`rcTargets(code)` — the function whose name suggests otherwise — returns `fr`/`res`/`upd`/`tier`/`pause` and never touches `rc.target`** | ✅ **TRUE** — and a genuinely non-obvious call |
| N21 | `ticket.assignee` is written by `bulkAssignMe()` but never displayed; the detail card shows `t.agent` | `13a` §4.1, §18.8 | `grep -n "assignee"` | **2 hits** — L16178 (the write) and L16179 (inside the audit summary string). No renderer | ✅ **TRUE** (cited L16177; actual **L16178**) |
| N22 | `createTicketFor` never calls `renderTickets()` — the queue does not refresh | `13a` §18.13 | read L2552–L2559 | Confirmed: `slaStampNewTicket`, `runAutoReply`, `closeModal`, `toast` — no re-render | ✅ **TRUE** |
| N23 | `runAutoReply` fires only from `createTicket()` and `createTicketFor()`; never for seeded tickets | `13a` §9 | `grep -n "runAutoReply"` | 3 hits: def, L2436, **L2556** | ✅ **TRUE** (the `createTicketFor` cite L2557 is off by one) |
| N24 | `#tk-res` "Resolved (Jun) = 38" is hardcoded and never written by JS | `13a` §11 | `grep -n "tk-res"` | **1 hit** — the markup at L1356 | ✅ **TRUE**, citation exact |
| N25 | T1 tickets can never breach first response (`frMs>0` guard) | `13a` §8, §18.2 | read L14782 + all T1 codes | `frBreached:!obj.firstResponseAtMs&&frMs>0&&elapsedFr>frMs` — L14782 exact. All T1 codes carry `fr:0`, and tier `T1.firstResponseMin` is also `0`, so `frMs===0` either way | ✅ **TRUE** *(but there are **four** T1 codes, not five — W9)* |
| N26 | No dispute can be created — `DB.disputes` is seed-only, no `newDispute`/`openDispute`, no push/unshift | `13b` §18.1 | `grep -n "DB\.disputes"` | 9 hits — L14391 seed; L14222, L14294, L14344, L14375, L14399, L14401, L17858, L19132 all reads/`find`/`filter`/`map`/`forEach`. **Zero writes** | ✅ **TRUE** — and a serious product finding, correctly stated |
| N27 | No lost item can be created — `DB.lostFound` seed-only | `13b` §18.2 | `grep -n "DB\.lostFound"` | 5 hits — L14448 seed, L14457 `.map`, L14470 `.find`, L18055 `.find`, L19195 `forEach`. Zero writes | ✅ **TRUE** (cited L14451; actual **L14448**) |
| N28 | `dispute.outcome` is written by `resolveDispute()` and never rendered | `13b` §4 | `grep -n "\.outcome\b\|outcome:"` | Written L14441, echoed into the audit summary L14443. No renderer reads `d.outcome`; `renderDisputes` (L14401) shows `status` only | ✅ **TRUE** |
| N29 | `DB.arrivalConfig.riderGraceMin` is declared but never read | `13b` §12, §18 | `grep -n "riderGraceMin"` | **1 hit** — L17609 | ✅ **TRUE** |
| N30 | **No money actually moves** — `resolveDispute` never calls `recordRefund`, `commitWalletAdjust`, a credit-note function or `sendSystemEmail` | `13b` §14 | read L14431–L14445 | Confirmed: the whole body is `requirePerm` → `requirePagePerm` → `find` → compute `perTrip`/`amount` → set `status`/`outcome` → `renderDisputes` → `logAction` → `toast`. **The amount exists only in the audit string and the toast** | ✅ **TRUE** — the highest-value negative claim in Tier 2 |
| N31 | The two dispute-gate options (`cfa-notify`, `cfa-note`) are collected into `window.__confirmValues` and never read | `13b` §12, §18 | `grep -n "__confirmValues"` | **2 hits** — the write at L17832 inside `guardAction`, and **one** read at L18206, which is not `resolveDispute`. `resolveDispute(dspId,outcome)` (L14431) takes no `values` argument and reads no `__confirmValues` | ✅ **TRUE** |
| N32 | **Permission asymmetry** — `createTicket`, `createTicketFor`, `sendTicketReply`, `setTicketStatus`, `closeConversation`, `reopenTicket`, `commitChangeReason` and `commitBulkReason` have **no permission gate**, while `bulkStatus`/`bulkAssignMe`/`commitMassEvent` require `manage_tickets` | `13a` §18.9 | function-body scan of all eleven | **All eight are ungated** (`createTicket` L2430–L2439, `createTicketFor` L2552–L2559, `sendTicketReply` L2358, `setTicketStatus` L2368, `closeConversation` L2398, `reopenTicket` L2409, `commitChangeReason` L14899, `commitBulkReason` L16193 — zero `requirePerm`/`requirePagePerm` in any body). **All three gated ones are gated**, at L16166 / L16173 / L16108 — every one of which the document cites **exactly** | ✅ **TRUE** — an eleven-function claim with zero errors, and the most valuable finding in `13a` |


### 9.3 Negative-claim verification — Tier 3 (`15*`, `16*`)

**67 checked, 65 hold, 2 fail** (both already recorded as W15 and W18). Combined with Tier 1–2: **98 checked, 94 hold, 4 fail.**

Selected results, grouped by the kind of claim:

| Claim | Doc | Grep | Hits | Verdict |
|---|---|---|---:|---|
| `planFloorCheck()` has zero call sites | `16g` | `planFloorCheck` | 1 (def L21512) | ✅ TRUE — **independently agrees with N1** |
| `effectiveSurge()` has zero call sites | `16g` | `effectiveSurge` | 1 (def L21523) | ✅ TRUE |
| `surge.minMultiplier` never read | `16g` | `minMultiplier` | 1 (seed L21458) | ✅ TRUE |
| `rateCard.currency` / `vatIncluded` never read | `16g` | `vatIncluded` / `\.currency` | 1 / 0 outside seed | ✅ TRUE |
| `capByCity.JED` never read | `16g` | `capByCity` | 2 — seed L21458 and `surgeCapFor` L21521, which is only ever called with `'RUH'` | ✅ TRUE |
| `DB.rateCard` has no consumer outside the pricing module | `16g` | `rateCard` | **22, all in L21431–L21826** | ✅ TRUE — **independently agrees with §5.3** |
| `capByCity` / `surgeSuspensions` never reach `currentSurgeMultiplier()` | `16g` | read L12389–L12399 | 0 references | ✅ TRUE — the live cap is `DB.surgeConfig.capMultiplier = 2.5` (L13861), **not** the 2.0 the Pricing tab advertises |
| No permission gate on `proposeRateCard` / `approveRateCard` / `suspendSurge` | `16g` | `requirePerm`/`can(` in L21431–L21775 | **0** | ✅ TRUE — **independently agrees with N13** |
| `rate_card_*` / `surge_suspended` absent from `ACTION_LABELS` | `16g` | vs L2898–L2909 | 0 | ✅ TRUE |
| No sweeper purges expired surge suspensions | `16g` | writes to `DB.surgeSuspensions` | 1 (`unshift` L21536) | ✅ TRUE |
| `rebuildAllHistory()` has no `requirePerm` | `16b` | body L18600–L18606 | 0 | ✅ TRUE |
| No export button carries a permission check | `16f` | `requirePerm` in L7607–L7667 | 1, and only inside `captureDailySnapshot` (L7640) | ✅ TRUE |
| Capturing a snapshot twice does **not** overwrite (the gate copy says it does) | `16f` | writes to `DB.dailySnapshots` | 1 `unshift` (L7652), no dedupe | ✅ TRUE — gate copy at L20882 is verbatim correct and verbatim wrong |
| Nothing ever writes a new consent record | `16c` | `.consents[` | **1** (L3792) | ✅ TRUE |
| `commitPublishVersion` is not gated | `16c` | `commitPublishVersion` | 2 — the onclick and the definition; no `guardAction`, no registry entry | ✅ TRUE |
| `DB.branding.accent` never read | `16a` | `accent` | 2, both assignments (L18388, L18455) | ✅ TRUE |
| `edit_branding` absent from `ACTION_LABELS` | `16a` | `edit_branding` | 2, both `logAction` calls | ✅ TRUE |
| `sendPushNotification` is the only writer to `DB.pushOutbox` | `16e` | `DB.pushOutbox` | 8; only L7742 writes | ✅ TRUE |
| `replyToInbound()` writes no audit entry | `16d` | body L7549–L7556 | 0 `logAction` | ✅ TRUE |
| **21** `sendSystemEmail()` call sites | `16d` | `sendSystemEmail(` | 23 − 1 def − 1 comment = **21**, and **all 21 line numbers are exact** | ✅ TRUE |
| `renderSettingsMeta()` has no key for branding / integrity / window / legal / emails / push / export | `16a`–`16f` | L7340 map | 0 for all seven | ✅ TRUE |
| Nothing persists `opsConfig` to storage | `15a` | `localStorage\|sessionStorage\|indexedDB` | **0 in the entire file** | ✅ TRUE |
| `general.currency` / `timezone` / `supportEmail` / `supportPhone` are inert | `15a` | per-key | all refs confined to the General card | ✅ TRUE (the two `timezone` hits outside are `DB.onCallSchedule.timezone`, a different field) |
| No `LANG_STRINGS.en` exists | `15a` | read L7903–L7938 | only an `ar:` key | ✅ TRUE |
| `sessionTimeoutMin` is completely inert | `15e` | `sessionTimeoutMin` | 4 (L2572, L8021, L8026, L8027) — exactly the set claimed | ✅ TRUE |
| `require2FA` read only by `renderTeamTable` | `15e` | `require2FA` | 7; only external read L10454 | ✅ TRUE |
| **`twoFA` has no setter** | `15e` | `twoFA` | **`u.twoFA=val;` at L3050** | ❌ **FALSE** — W15 |
| `requirePagePerm('settings','view')` has no call site | `15c` | `requirePagePerm(` | 19 sites, none for `settings` | ✅ TRUE |
| `settings.manage_team` granular key never enforced | `15c` | both gate forms | 5 broad sites, 0 granular | ✅ TRUE |
| `go('settings')` has no permission check | `15c` | read `go()` L8780–L8825 | none | ✅ TRUE |
| §7.9's 19 `requirePagePerm` call sites | `15c` | `requirePagePerm(` | 19 + decl — **every line number exact** | ✅ TRUE |
| `renderSidebarPerms` has no definition | `15c` | `renderSidebarPerms` | 2, both `typeof …==='function'` guards | ✅ TRUE |
| Six dispatch keys "do not exist" → `value="undefined"` | `15f` | per-key | all six assigned L17182–L17187 | ❌ **FALSE** — W18 |
| `data-phase-id` written but never read back | `15f` | `phase-id\|phaseId` | 1 (write at L8092) | ✅ TRUE |
| `gw.enabled` / `gw.isDefault` / `gw.type` dead outside Settings | `15h` | per-key | all refs inside L7456–L7513 + seed | ✅ TRUE |
| No credentials, no PSP integration anywhere | `15h` | `fetch(\|XMLHttpRequest\|<script src` | 1 — the Leaflet CDN at L470, not a PSP | ✅ TRUE |
| `removeGateway` has no `isDefault` guard | `15h` | read L7507–L7513 | none | ✅ TRUE |
| `graceMin` never enforced | `15j` | `graceMin` | 4 — **{7357, 7377, 7380, 13938}, exactly the set the document names** | ✅ TRUE |
| `qr_after_arrival` / `qr_before_assigned` / `qr_driver_fault` / `sub_before_first_trip` are documentation, not code | `15j` | per-id | 1 seed hit each | ✅ TRUE |
| `getCancellationRule` call sites = {5527, 7374, 11808, 11809, 11832} | `15j` | `getCancellationRule` | exactly those five plus the declaration | ✅ TRUE |
| `cancelRequest` / `driverDeclineOrTimeout` charge nobody | `15j` | read L11915–L11926, L11995–L12010 | no fee logic | ✅ TRUE |
| Zero `data-i18n` inside seven Settings panes | `15*`/`16*` | per-pane scan | 0 for all seven | ✅ TRUE |


---

## 10. Wrong counts

### 10.1 Tier 1 & Tier 2

Pass 2's highest-value cluster was "a stated count that the document's own adjacent table already contradicts". **Four such errors were found in this pass; in all four the correct number is already printed on the page.**

| # | Doc | Stated | Actual | Evidence |
|---|---|---:|---:|---|
| W5 | `14b` §2 call chain + §20 index | "**13** direct field writes" / "populates all **13** fields" | **14** | L6069–L6082 is 14 consecutive `gid(...)…value=` statements. The document's own §4 table lists all fourteen with their line numbers |
| W6 | `14b` §11 | "All **13** core inputs" | **14** | Same range. (12 if the two checkboxes are excluded — no reading gives 13) |
| W7 | `14b` §13 step 7 | "then the **nine** numeric fields via `numval()`" | **10** | L6132–L6141. Its own step 5 lists a 12-field `before` = 2 names + 10 numerics |
| W9 | `13a` §18.2 | "all **five** T1 codes set `fr:0`" | **4** | Tier split across the 40 codes is T1 **4** / T2 12 / T3 15 / T4 9. The document's own §8 taxonomy table has exactly four `T1` rows |

**Counts that were checked and are CORRECT** (worth recording, because they are the class of claim that most often fails):

| Doc | Count | Verified |
|---|---|---|
| `14a` §4, §5 | "exactly the same **17** keys" in `DB.plans` seed and `newPlan()` template | ✅ `key, name, nameAr, duration, execute, cap, eyvarPct, discountPct, ecoMin, ecoKm, comfortMin, comfortKm, sortOrder, ecoActive, comfortActive, status, features` = 17, present in both L2890 and L6103–L6105 |
| `14a` §5 | Feature seed counts 3 / 2 / 3 | ✅ L2891 (3), L2893 (2), L2895 (3) |
| `14a` §7 | 3 seeded ride types, 6-field schema + `custom` on runtime rows | ✅ L13909–L13911 |
| `14a` §8 | 3 surge windows, all values | ✅ L13884–L13886 |
| `14a` §14.1 | Plans table "11 columns" | ✅ L1042 header has 11 `<th>` |
| `14a` §5 | Driver share 80 / 82 / 85 % | ✅ derived from eyvarPct 20 / 18 / 15 |
| `14b` §5 | 12-field `before`/`after` audit snapshot | ✅ L6126–L6127 and L6146 both list 12 |
| `13a` §8 | `DB.reasonCodes` holds **40 entries** | ✅ exactly 40 `code:` keys in L14669–L14715 |
| `13a` §17 | reason-picker placeholder says "38" while the array holds 40 | ✅ **a real bug, correctly caught** — L14762 hardcodes `'Search 38 reason codes…'` |
| `13b` §13 | Seven verdict branches with confidences 80/60/92/45/90/75/40 | ✅ all seven, in source order, L17671–L17693 |
| `13b` §12 | `DB.arrivalConfig` 120 m / 40 m / 5 min / 10 min | ✅ L17606–L17609 |

---


### 10.2 Tier 3 wrong counts

| # | Doc | Stated | Actual | Evidence |
|---|---|---:|---:|---|
| W20 | `15c` §11 item 5 | "**30** of the 52 granular actions have no enforcement point" | **37** | 52 actions; the 19 `requirePagePerm` call sites cover 15 distinct actions. The document's own §7.9 "never enforced" list enumerates 22 `view` keys + 15 action keys = 37. "30" is the count of *non-`view`* actions (52−22) — a different quantity |
| W27 | `16e` §12.2 | "**Three** label mismatches" | **2** | Only `nosub` and `flagged_drivers` differ between L7710 and L1947–L1959; the other nine are byte-identical. The document's own bullet list has two items |
| — | `16b` §12.3 | reconstructed driver earnings are "systematically **2 pp high**" | true only for the quick-ride subset | `driverEarn=(fare*0.8)` (**L18757**) equals the rate card's **subscription** driver share exactly (`100−20`, L21449). Reconstructed trips carry `kind:'Subscription'` for `i >= quickRides` (L18727), so the 2 pp gap applies only to `'Quick ride'` rows — **OVERSTATED**, not WRONG |

**Seven wrong counts in the pass**, all of the same shape: the correct number is already present in the document's own adjacent table or bullet list. That is pass 2's §3.1 pattern reproduced exactly, at the same rate (7 of 40 counted quantities here; 17 of 78 there).

**Tier 3 counts verified correct** — a long list, and worth recording because this is the category most likely to fail: 22 pages / 52 actions / 20 gated / 2 ungated and the 13 × 4 role matrix (`15c`); 13 permissions and the four role totals 13/5/3/8 (`15c`); 7 currencies / 7 timezones / 2 languages (`15a`); 6 gateways / 10 payments and all six computed volumes to the cent (`15h`); 8 cancellation rules, 6 quick-ride + 2 subscription, "3 of 8 enforced" (`15j`); 3 search phases and 6 dispatch keys (`15f`); 4 gateway type options (`15h`); 21 `sendSystemEmail` sites with a 13/5/2/1 category tally and 9 audience options (`16d`); 11 push options and 11 `PUSH_AUDIENCE_LABEL` entries (`16e`); 3 legal document types / 8 published versions (`16c`); 8 export datasets + 1 snapshot export, and 30 seeded snapshots (`16f`); 6 `DB.zones` entries and 3 `PRICING_EXAMPLES` → 6 table rows (`16g`); 20 `RY_PLACES` / 6 `PAY_METHODS` (`16b`); 3 seeded inbox messages (`16d`); and `16g`'s "5 of 21 settings tabs have no Arabic `stab.*` key" (21 tab buttons, 16 keys).

## 11. Enumeration completeness

### 11.1 Tier 1 & Tier 2

| Doc | Enumeration claimed exhaustive | Verified against | Verdict |
|---|---|---|---|
| `14a` §4 | "EVERY field" of the plan schema — 17 keys | `DB.plans.weekly` L2890 + `newPlan()` L6103–L6105 | ✅ **complete** — nothing in the seed is absent from the table, nothing in the table is absent from the seed |
| `14a` §5 | All 3 plans × all 17 fields | L2890–L2895 | ✅ **complete and value-exact**, including all 8 Arabic feature strings and all 3 Arabic plan names |
| `14a` §7 | All 3 ride types and their 6+1 fields | L13909–L13911 | ✅ complete |
| `14a` §8 | All 3 surge windows and the full 7-day × 24-hour resolution matrix | L13884–L13886 + `currentSurgeMultiplier` L12389–L12400 | ✅ complete; all 42 matrix cells re-derived and correct |
| `14a` §13 | "Every mutating handler" on the page — 12 rows | grep of `onclick=` in L1030–L1079 + the four `requirePerm('manage_plans')` sites at L12303, L12315, L12322, L12335, L12357, L12369, L12376 | ✅ complete |
| `14a` §17 | Hardcoded / demo values — 19 rows | — | ✅ complete for the module; the four pricing constants (`PLANS`, `CADENCE_META`, `CADENCE_DAYS`, `{weekly:5,biweekly:10,monthly:22}`) are all present and all correct |
| `14b` §12 | "Input fields — every one" | grep of `id="fp3-` in L1082–L1129 | ✅ **complete** — all 12 form inputs + the hidden `#fp3-status` + the computed `#fp3-ds` are accounted for. *(The prose count "13" is wrong — W6 — but no field is missing)* |
| `14b` §10 | Feature-list "every operation" — 9 rows | L5998–L6056 | ✅ complete: render, load, edit EN, edit AR, char hint, add, remove, reorder, validate, persist |
| `13a` §8 | `DB.reasonCodes` — all 40 | L14669–L14715 | ✅ **complete**, 40 rows, tier split 4/12/15/9 verified |
| `13a` §4.1 | `DB.tickets` field list | L2764–L2765 (10 seed fields) + `slaStampNewTicket` L14842–L14848 (9 SLA fields) + `assignee`/`massEvent`/`groupedUnder` | ✅ **complete** — every field written anywhere is in the table, and every table row corresponds to a real write. *(The SLA-field line citations are uniformly +1 — see §7.)* |
| `13b` §13 | All 7 arrival-evidence verdict branches | L17670–L17694 | ✅ **complete and exact**, conditions and confidences both |
| `13b` §5.2 | Lost & Found statuses — "the only three values" `searching`/`with_driver`/`returned` | `LF_FLOW` + seed L14449–L14450 | ✅ complete |

**No enumeration in the Tier 1 or Tier 2 documents was found to be missing an entry.** This is a materially better result than pass 2's corpus-wide 12-of-15.

---

### 11.2 Tier 3 enumeration completeness

| Doc | Enumeration | Verdict |
|---|---|---|
| `15c` | the full 22-page / 52-action `PAGE_PERMISSIONS` table — every label, icon and legacy gate | ✅ **complete and verbatim** |
| `15c` | 19 `requirePagePerm` call sites | ✅ complete, **every line number exact** |
| `15c` | 13 × 4 role/permission matrix | ✅ complete, totals correct |
| `16d` | all 21 `sendSystemEmail` triggers | ✅ **complete and byte-perfect** |
| `16e` | 11 audience options and 11 `PUSH_AUDIENCE_LABEL` entries | ✅ complete (though the *mismatch* count between them is wrong — W27) |
| `15j` | all 8 cancellation rules and the 3 that are enforced | ✅ complete |
| `15h` | all 6 gateways and all 10 seeded payments | ✅ complete |
| `16g` | the `DB.rateCard` field inventory and its dead-field list | ✅ complete |
| `16g` §10.1 | "the four pricing models" | ❌ **incomplete and mis-attributed** — there are five rate structures and model #3 is the wrong one (W14, §5) |

Twenty-six enumerations claimed exhaustive across the pass; **twenty-five are complete.** The single failure is `16g` §10.1.

## 12. Confirmed-correct highlights — what a reader can trust

### 12.1 Tier 1 & Tier 2

This section matters as much as §6. The failures above are concentrated and describable; almost everything else held.

**`14b-plan-editor.md` is the strongest document audited in this pass** and one of the strongest in the corpus. Roughly 250 citations were sampled and **six** drifted, all by one line. Everything load-bearing is exact: all 14 form-load writes, all 10 `numval` save writes, the entire feature-list subsystem, `savePlan`'s full sequence, `newPlan`'s template, `toggleVehicleActive`, `archivePlan`/`doArchivePlan`, `renderPlansFormSelects`, `customSelectHTML` including the non-obvious `options.length>6` search-box gate, the `GATE_SWEEP.savePlan` spec verbatim, the whole HTML line index, and `upd()`'s nine internal lines one for one. Its §6.4 worked-example table — six rows of unrounded plan economics down to the thousandth — is **correct in every cell**. Its two real defects are W2 (the false "no confirmation" claim) and three count errors.

**Both documents' money maths is sound.** Nine formula families, zero errors, correct rounding order and correct clamp placement in every one — including the two non-obvious ones: `fareFor`'s min-fare clamp applied *before* the surge multiply, and `planQuote`'s single `r2()` around a three-term sum rather than three rounded terms.

**`14a`'s surge analysis is excellent.** `currentSurgeMultiplier`'s six internal citations are all exact; the `Math.max`-not-compound composition rule, the post-loop single ceiling, and inclusive-start/exclusive-end semantics are all stated correctly; the 42-cell resolved matrix is right in every cell; and the simulated-clock reasoning (`REQ_NOW_REF` = Thu 25 Jun 2026 09:14, hour 9 falls outside a 7–9 window because the end is exclusive) is correct including the day-of-week.

**`14a`'s dead-data findings are real, not speculative.** `sortOrder`, `ecoActive`, `comfortActive` and `nameAr` were each grepped exhaustively: every occurrence is seed, form-load, form-save or audit payload. There is genuinely no consumer. Likewise `t.active` on a ride type, and `DB.slaPolicy.breachEscalateTo` and `reasonCode.target` in `13a` — the last one a trap, because `rcTargets()` exists at L14730 and reads `fr`/`res`/`upd`/`tier`/`pause` but **not** `target`.

**The `approveRateCard` permission gap is real and correctly characterised.** L21582–L21602 contains zero `requirePerm`/`can` calls. The only barriers are a confirmation gate, a self-approval block and a no-simulation block — none of them a permission check.

**`13b`'s arrival-evidence reconstruction is the single most impressive piece of analysis in this pass.** A seven-branch decision tree with three derived questions, two radius thresholds, a dwell threshold and a `2 × radius` GPS-margin band — reproduced from source with all seven conditions, all seven verdicts and all seven confidence scores correct and in order.

**`13b`'s "no money actually moves" finding is verified.** `resolveDispute()` (L14431–L14445) computes an amount, writes `status`/`outcome`, logs and toasts — and calls no refund, wallet, credit-note or email function. The amount exists only in copy. That is exactly what the document says.

**`13a`'s permission asymmetry finding is the most valuable single claim in Tier 2, and it is entirely correct.** Eleven functions were checked one by one: all eight named as ungated genuinely have no `requirePerm` or `requirePagePerm` anywhere in their bodies, all three named as gated genuinely require `manage_tickets`, and **all three of those gate citations (L16108, L16166, L16173) are exact**. A reader can act on this.

**`13a` gets `PAGE_PERMISSIONS.support` right at L10642–L10645** — exact at both ends. Pass 2 found `10d` and `10e` both mis-stated their `PAGE_PERMISSIONS` boundaries; this document does not.

**`13a` correctly caught a live bug pass 2 never reached**: the reason-picker placeholder hardcodes "Search 38 reason codes…" (L14762) against a 40-entry array.

**`13a` independently got `openTicketDetail()` right at L8879–L8890** — the same correction pass 2 had to make against `00a`, which cited L8882–L8892.

**Two `14a` citations that look wrong are right**: `PRICING_EXAMPLES` at L21617 (the preceding comment is L21616) and `var id='custom_'+Date.now()` at L12361. Both were flagged as suspect going into this pass and both survive.

### 12.2 Tier 3 confirmed-correct highlights

**`15j` and `15h` are the cleanest documents in the entire nineteen — zero WRONG findings each.** `15j`'s two money formulas re-derive operator-for-operator including rounding order and clamp placement: `grossRefund = round2(paid × max(0,(total−used)/total))` → `fee = round2(gross × feePct/100)` → `net = round2(gross − fee)` (L5522–L5530), and the quick-ride flat fee `(rule && rule.enabled) ? rule.feeAmount : 0` (L11831–L11833). Every dead-code grep in both documents reproduces **exactly** the line-set named — `graceMin`'s four sites and `getCancellationRule`'s five call sites are given precisely, which is a level of precision rare anywhere in the corpus. `15h`'s six computed gateway volumes were independently re-summed from the ten seeded payments and are correct **to the cent**: Mada 5 / 617.65, Visa 3 / 197.50, Apple Pay 1 / 41.22, Bank transfer 1 / 640.00, STC Pay 0, Tabby 0.

**`16g`'s pricing thesis is fully verified even though its model table is wrong.** `DB.rateCard` prices nothing; the live surge cap is `2.5` (L13861) not the `2.0` the Pricing tab advertises; the guard consequence "Every new trip prices under this card from the moment it goes live" (L21609) is false; `approveRateCard` (L21582) has zero permission checks. Its §13 bug #1 is exactly right and non-obvious: `DB.zones` is an **array** of six (L13952–L13959), so `Object.keys(DB.zones).slice(0,8)` yields `["0".."5"]` and the `['RUH-CENTRAL','RUH-NORTH']` fallback at L21727 can never fire.

**`16c`'s headline finding is correct and consequential.** The block comment at L3778 promises join-date-aware consent seeding; `getUserConsent` unconditionally takes `versions.slice().reverse()[0]` (L3790–L3791) — the *oldest* version — so every seeded entity starts at v1.0 and all three compliance badges render red at boot. A comment that describes the opposite of the code.

**`16a`'s `resetBranding` chain is verified end to end**, and it is a genuine latent bug: no `requirePerm` (L18454 vs L18446); whole-object replacement at L18455 drops `maxUploadMB` (L20994); `maxBytes` becomes `NaN` at L20998; `f.size > NaN` is always false; the 12 MB upload cap is silently disabled for the rest of the session.

**`16b`'s window semantics are exactly right** — `dateMs === undefined || ms >= start` (L20423) counts untimestamped trips as inside the window; the monkey-patch overrides `orphan` to `stored>0 && inside===0` (L20450) and adds `expectedGap` (L20451); `numOf`'s `/[^\d.]/g` (L18509) strips minus signs so a negative stored total reads as positive.

**`15f`'s `nearestAvailableDrivers` pseudocode is a faithful transcription** of L8167–L8204 — the city short-circuit, the sub-vs-quick base radius, the idle-first/ETA sort, the all-or-nothing auto-expand — plus the correct radius ladder (0–7 s ×1 → 6 km, 8–17 s ×1.5 → 9 km, 18 s+ ×3 → 18 km). Its meta-footer swap bug is real: `#meta-ops-radius` sits in the Quick Rides card while tracking the `ops-radius` entity, and `#meta-phases` sits in the Subscriptions card tracking `phases` (L1578/L1600 vs L8082/L8117).

**`15e`'s clamp derivation is exact** — `parseInt → ||30 → Math.max(5,·) → Math.min(240,·)` at L8027 — including the sharp observation that the clamped value is *not* written back, in contrast to `saveOpsRadiusConfig` (L8081), which is.

**`16f`'s substantive findings all hold despite the citation damage**: two incompatible CSV encoders (`toCSV` L7592 with conditional quoting vs `buildCSV` L9183 quoting everything), zero permission checks across all nine exports, `exportAuditLog` mutating the very log it exports via `downloadCSV`'s `logAction` (L7604), and a gate whose copy — "Capturing twice in one day overwrites the earlier snapshot" (L20882) — is quoted verbatim correctly and is verbatim wrong about the code.

**Function-declaration, seed-literal and pane-markup citations are reliable across all sixteen Tier-3 documents.** The rule a reader should apply is the same one pass 2 arrived at: **trust a citation that points at a `function` line, a `DB.` seed line or a constant declaration; distrust any citation that points into a template string or a multi-line object literal, and assume its neighbours are wrong by the same amount.**

---

## 13. Required corrections, prioritised

**P1 — a reader acts on this and is wrong.**

1. `14a` §6.4 + §19 item 22 — delete `planLegPrice()` from the "no call sites" claim. It is called at **L21486** and runs 12 times on every Settings→Pricing render. Keep the `planFloorCheck()` half; it is correct. *(W1)*
2. `14b` §13 + §19 item 9 — `addPlanFeature` and `removePlanFeature` **are** confirmation-gated (`GATE_SWEEP` **L20838** and **L20839–L20840**). Change both "Confirms? No" cells to "Yes", and narrow "entirely ungated" to "no `requirePerm`, no audit entry — but both are confirmation-gated; only reorder is fully ungated". *(W2)*
3. `14a` §16 — `approveRateCard()` is at **L21582**, not L21603. L21603 is its `guardAction` wrapper. Add the verified fact that **L21582–L21602 contains zero permission checks**, so rate-card approval is confirmation-gated but not permission-gated. This is the single most consequential mis-citation in the pair. *(§7, N13)*

**P2 — a stated number is wrong and the right one is already on the page.**

4. `14b` §2 / §11 / §20 — "13 field writes" / "13 core inputs" → **14**. *(W5, W6)*
5. `14b` §13 step 7 — "nine numeric fields" → **ten**. *(W7)*
6. `13a` §18 item 2 — "all five T1 codes" → **four**. *(W9)*

**P3 — range endpoints that spill into unrelated code.**

7. `14a` + `14b` (6 places) — `ACTION_LABELS` is **L2898–L2909**, not L2899–L2913. L2911–L2913 belong to the My-Account comment block. *(W3)* — and align with `00c`, which pass 2 corrected to the same range.
8. `14a` + `14b` (4 places) — `activate_plan` / `deactivate_plan` labels are at **L2907**, not L2911. *(W4)*
9. `13a` (3 places) — `DB.reasonCodes` is **L14667–L14716**, not L14667–L14722. The cited range swallows `DB.contacts` and `rcById()`. *(W10)*
10. `13a` §19 index — `rcById` starts at **L14721**, not L14726. *(W11)*
11. `13b` §18 — `DB.disputes` seed is **L14391** (as §4 of the same document already says) and `DB.lostFound` is **L14448**, not L14451. *(W12, W13)*
12. `14a` §6.4 — `fareFor` **L21467**; `planQuote` ends **L21509**; `effectiveSurge` ends **L21530**; `planFloorCheck` ends **L21517**.

**P4 — constant-offset blocks. Fix as a block, not line by line.**

13. `14a` `doActivatePlan`/`doDeactivatePlan` interiors: **+1** (L5960→L5961, L5962→L5963, L5963→L5964, L5981→L5982, L5983→L5984, L5984→L5985).
14. `14a` `renderPlansTable` row cells: **+1** is the wrong direction — the document is **one too high**; correct to L5935–L5939 from L5936–L5940.
15. `14a` ride-type render cells: **+1 to +3** — example column L12345→**L12346**, name cell →L12347, Remove button L12350→**L12353**.
16. `14a` `saveSurgeConfig` body: **+1** (L12335/12336/12337 → L12336/12337/12338).
17. `14a` `addRideType` body: **+1** (push, `logAction`, form-clear).
18. `14a` `planQuote` return-object fields: **−2** (marginSar L21503→L21505 and the three that follow).
19. `14a` `CADENCE_META`: **L4520–L4524** (4 places).
20. `13a` §4.1 `slaStampNewTicket` field rows: **+1**, eight consecutive rows (L14842–L14848).

**P5 — internal contradictions to reconcile.**

21. `14b` says the 700 ms save latency is at L6128; `14a` §17 says L6129. **`14a` is right.** Align `14b`.
22. `13b` §4 gives `DB.disputes` at L14391 and §18 gives L14390. **§4 is right.**
23. `14a` §13 gives the Deactivate modal as L5969–L5976 and §15 gives L5966–L5977. The modal literal is **L5970–L5976**; the function is L5966–L5977.

**P6 — downstream summaries to soften.**

24. `SYSTEM-OVERVIEW.md` L201–L202, `ENTITY-RELATIONSHIPS.md` X10, `MODULE-DEPENDENCY-MAP.md` §4.3 — replace "four **disjoint** pricing models" with "four independent rate sources, two of them cross-read". The four rates and the restructure rationale are unaffected. *(O1)*


### 13.2 Tier 3 corrections, prioritised

**P1 — a reader acts on this and is wrong.**

1. `15e` §8, §9, §11 item 2 (three places) — **`twoFA` does have a setter**: `toggleMa2FA()` writes `u.twoFA=val` at **L3050** and logs `toggle_2fa` at L3051. Narrow the claim to "no *admin* path to enrol another user". *(W15)*
2. `16g` §10.1 row 3 — pricing model #3 is **`PLANS` (L4389–L4393)** via `perTripBaseRate()` (**L4529–L4534**), a flat per-period total ÷ exec days. It is not `DB.plans` and not a per-km rate. Relabel the `1.10` at L2890 as **dead configuration**. *(W14, §5)*
3. `15a`, `15e`, `15f` — remove every "Confirms? no" / "no `guardAction`" claim for `saveGeneralConfig` (L20771), `saveSecurityConfig` (L20780), `saveOpsRadiusConfig` (L20777), `saveSearchPhases` (L20801), `savePlanVisibility` (L20807), `addSearchPhase` (L20820), `removeSearchPhase` (L20821). All are `GATE_SWEEP`-gated. *(W16, W17, §6.4)*
4. `15f` §3.6, §9, §11 item 13 — the six dispatch keys are **defaulted at L17182–L17187**; nothing renders `value="undefined"`. *(W18)*
5. `15c` header and §8 — `renderRoleMatrix()` has **three** call sites (L10465, L10795, L10830) and `renderPagePermMatrix()` **five** (L10466, L10700, L10709, L10795, L10830). The "only from `renderTeamTable()`" claim contradicts the document's own §5. *(W19)*
6. `16a`, `16c`, `16d`, `16e` — the gate specs are in **`GATE_SWEEP` (L20769–L20885)**, not `GATE_SPECS` (which is a real but different registry at **L18245–L18371**). Correct addresses: `resetBranding` **L20846–L20847**, `sendBroadcast` **L20850–L20852**, `sendPushNotification` **L20853–L20854**, `sendReconsentReminder` **L20857–L20858**. *(W21)*

**P2 — wrong numbers with the right answer already on the page.**

7. `15c` §11 item 5 — "30 of 52 unenforced" → **37**. *(W20)*
8. `16e` §12.2 — "three label mismatches" → **two**. *(W27)*
9. `16b` §12.3 — the "2 pp high" driver-earnings gap applies **only to reconstructed quick rides**, not to all reconstructed trips.

**P3 — whole-block citation repairs (fix as blocks, not line by line).**

10. `16f` — re-derive the entire `L7592–L7670` export block from source; the offsets are **inconsistent in direction** (−17 to +34) so no single shift repairs it. `downloadCSV` is **L7598–L7606**; `doExport` is **L9204+**. *(W24)*
11. `16b` — re-derive `L18600–L18676` (seven consecutive functions each cited into the previous one's body, two sharing a start line) and `L20440–L20530`. *(W23)*
12. `16c` — shift the `renderLegalConsent` template block **+3**.
13. `16g` — shift `renderPricing`'s interior citations **+2 to +5**; fix `floors.*` to L21690–L21691 and the zone fallback to L21727. *(W30)*
14. `15c` — shift `L10776–L10835`: `toggleRolePermission()` **L10776–L10799**, `viewUserPermissions()` **L10800–L10812**, `saveUserPermissions()` **L10813–L10835**.
15. All six documents citing `LANG_STRINGS` — the block is **L7903–L7938** and `applyLanguage()` is **L7939–L7953**; every Arabic-key row shifts accordingly.
16. `15a`, `15c`, `15e`, `15f` — the Settings tab-button citations are each +1 or +2 too high (**L1421 / L1423 / L1440 / L1425**).

**P4 — internal contradictions.**

17. `16b` header vs its own §2 map: `#window-body` is **L1759**; §2 is right. *(W25)*
18. `16g` vs `16b` on the Settings tab group: at runtime `reorderSettingsTabs()` deletes the static headers (**L21288**) and both tabs land under **`stabgrp.money` (L21272)**; `16b` is right. *(W26)*

**P5 — one correction that must not be applied backwards.**

19. `PRICING_EXAMPLES` **is** at **L21617** (closing `];` L21621). A circulating note that it should be L21616 is wrong — L21616 is the section comment, and `14a`'s citation is already exact.

---

## 14. Residual accuracy position for the full 61-document set

**Coverage is now complete.** Pass 2 audited 41 documents in depth. This pass audited the remaining nineteen it named (`13a`, `13b`, `14a`, `14b`, `15a`, `15c`, `15e`, `15f`, `15h`, `15j`, `16a`–`16g`) plus re-derived formulas in `15b`/`15d`/`15g`/`15i`/`16h` territory. Pass 2b owns `00d`, `13c`, `13d`, `15k`, `16h`, `16i`, `16j`, `16k`. **No document in `docs/01-modules/` is now un-audited on formulas, negative claims and counts.**

### 14.1 Combined position

| | Pass 2 | Pass 2c | Combined |
|---|---:|---:|---:|
| Documents audited in depth | 41 | 19 | **60 of 61** (pass 2b holds the rest) |
| Claims sampled | 7,268 | 1,778 | **9,046** |
| **Money formulas re-derived** | 45 | 30 | **75** |
| **Money formulas WRONG** | **0** | **0** | **0** |
| Negative claims tested | 53 | 98 | **151** |
| Negative claims FALSE | 1 | 4 | **5** |
| WRONG | 61 | 91 | **152** |
| STALE | 326 | 208 | **534** |
| Wrong counts | 17 | 7 | **24** |

### 14.2 What holds, corpus-wide

**Pass 2's verdict stands and is now stronger, because it has been tested on the money.** Seventy-five financial formulas re-derived from source across the whole corpus; **seventy-five matches**; not one rounding order, clamp placement or operator wrong. Every seed value checked in this pass was exact. Twenty-five of twenty-six enumerations claimed exhaustive were complete. The documents' *reasoning* about how this system works is reliable.

**The dominant defect is unchanged: pointers drift, in blocks.** 534 stale citations against 152 wrong claims. The shape is identical in both passes — citations to `function` declarations, `DB.` seed literals and constant definitions are reliably exact; citations *into* HTML template strings and multi-line object literals drift by ±1 to 3, and they drift **together**, as contiguous blocks sharing one offset. A reader who spot-checks one citation in such a block and finds it wrong must assume every neighbour is wrong by the same amount.

**Three shared upstream errors are now visible that neither pass could see alone.** (a) `ACTION_LABELS` — one 12-line object with **three different wrong ranges** across four document families (`00c` L2898–L2913, `14a`/`14b` L2899–L2913, the `16*` group L2900–L2910); the truth is **L2898–L2909**. (b) The `LANG_STRINGS` Arabic block, mis-cited by the same 1–2 lines in at least ten documents. (c) The `planQuote` / `planFloorCheck` endpoint overshoots appear **identically** in `14a` and `16g`, which were written independently — a shared source, not two mistakes.

### 14.3 What changed in the corpus-level picture

**One new corpus-level defect: the `GATE_SWEEP` blind spot (§6.4).** Four of this pass's five documents that made a "no confirmation" claim were wrong, because they consulted `GATE_SPECS` (18 entries, L18245) and not `GATE_SWEEP` (45 entries, L20769), which installs later and is two and a half times larger. **Pass 2 never checked this axis** — it verified `GATE_SPECS` key lines in `00b` and stopped there. So the same defect is **plausibly latent in the 41 documents pass 2 cleared**, and any of them asserting that a destructive action is unconfirmed should be re-checked against L20769–L20885 before being trusted. This is the single highest-value follow-up available.

**One high-severity cross-corpus finding needs re-wording, not retraction.** The "four disjoint pricing models" claim propagates from `16g` §10.1 into `SYSTEM-OVERVIEW.md`, `ENTITY-RELATIONSHIPS.md` X10, `MODULE-DEPENDENCY-MAP.md` §4.3, `COUPLING-ANALYSIS.md`, `PROPOSED-STRUCTURE.md` and `PAGE-TRACEABILITY-MATRIX.md`. All four *rates* verify at their source lines. But model #3 is misattributed (it is `PLANS`, not `DB.plans`, and it is not a per-km rate), `DB.plans.ecoKm` prices nothing at all, and two of the models share a consumer. The corrected statement — **three live fare models plus two unconsumed rate tables** — makes the restructure argument *stronger*, not weaker. See §5.5.

### 14.4 Confidence a reader should carry

| If you are reading… | Trust |
|---|---|
| A **money formula**, anywhere in the corpus | **Very high.** 75 of 75 verified across two passes |
| A **seed value or a schema field list** | **Very high.** Exact everywhere checked in this pass |
| An **enumeration claimed exhaustive** | **High.** 25 of 26 complete here; 12 of 15 in pass 2 |
| A **negative claim about dead code or missing consumers** | **High.** 146 of 151 hold corpus-wide |
| A **negative claim about missing confirmation** | **Low until re-checked.** §6.4 — check L20769–L20885 first |
| A **stated count** | **Medium.** 24 wrong across the corpus, and in every case the document's own adjacent table has the right answer — so read the table, not the prose |
| A **line number pointing at a `function`, `DB.` seed or constant** | **High** |
| A **line number pointing into a render block, template string or object literal** | **Low.** Expect ±1–3, expect the whole surrounding block to share the error, and expect range endpoints to overshoot into the next sibling |
| `16f`'s or `16b`'s line numbers specifically | **Do not navigate from them.** Re-derive from source |

