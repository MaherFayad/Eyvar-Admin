> **Archived round record.** Rulings here stay binding unless a later entry in
> `docs/05-restructure/DECISIONS.md` or `docs/RULINGS.md` supersedes them. Check
> `docs/RULINGS.md` before citing one.

# 09 — Round 5 rulings: eight questions from three build passes and one visual audit

**Rules:** `design/07-rulings-r4.md` **R4-4** §4.1 / §4.2 / §4.3 (amended here, in place of
their text), **R4-11** §11.2 (applied, not amended), **R4-6b** §6.6.4 (corrected)
**Answers:** the breakdowns build's **B-1, B-2, B-3, B-8**, and the metric-board visual audit's
**V-2, V-3, V-5, V-9, V-11, V-12, V-13**
**Owner:** product-designer
**Precedence:** these are rulings. They sit above every `DESIGN.md` section and above every
acceptance criterion. Where a ruling below contradicts an AC, the AC's replacement text is
drafted in §12 and routed — it is **not** ticked, edited or asserted here (`DECISIONS.md`
*PRACTICE*).

**This document states what it provides. It asserts no criterion passes.**

---

## 0. The docket

| # | Question | Ruling, in one line |
|---|---|---|
| **R5-1** | V-2 — a bare em dash as a value, with no reason | **R4-11 §11.2 already decides most of it and nobody applied it.** Most of those tiles must not render at all. The residue gets `Metric.absenceReason`, rendered where the delta reason goes. §4.2 gains **no** absence kind. |
| **R5-2** | AC-605's hole — `target` with `deltaPercent === null` | **AC-605 is rewritten, not supplemented.** Its subject was always *"a tile that cannot state a delta"*; `kind === 'none'` was a proxy for that, and the proxy broke. |
| **R5-3** | R4-4 §4.3's declaration-order clause | **Deleted. It was mine and it was wrong.** `severity` is unique within a tone, enforced by a test over real fixtures, not by a synthetic one. |
| **R5-4** | B-3 — the overturn caption obeys two documents | **§4.2's scope was drawn wrong.** I listed two instances and called it a definition. The prohibitions are the rule; valence is inside it. Budget drops 60 → 38 characters. |
| **R5-5** | B-1 — two numeric columns, neither named | **The secondary numeric column is withdrawn.** A second number is a noun phrase in the sub-label, which is the reference's own construction and the only shape that names it. |
| **R5-6** | B-2 / V-11 — the bar's 1.142 : 1 band | **The bar stays and changes token: `--chart-series`, 4px, denominator = the largest row shown, and `bar: true` requires `max > min`.** No new token. |
| **R5-7** | B-8 — `labelKey` cannot hold an entity name | **Granted.** A discriminated union, and it is not tidiness — it is what makes V-4 fixable by analysis instead of defensively. |
| **R5-8** | V-3 — a lone ranked list at full page width | **A breakdown never exceeds half the content width.** Charts and breakdowns share one two-column section grid. |
| **R5-9** | F-14 — a breakdown's trustworthiness caveat has no slot | **§4.1 gains a caveat line, under the heading and above the rows.** A gate that appears after the thing it gates is not a gate. §18.1 |
| **R5-10** | V-6 — a lone trailing tile, now at the guaranteed viewport | **The tile count is chosen to fit the grid: `n mod 3 ≠ 1`** — 2, 3, 5, 6, 8, 9, 11, 12. (§18.2 as first written also required `n mod 4 ≠ 1`, which never binds — **corrected in §24**.) |
| **R5-11** | F-15 — §11.2 is silent on breakdowns and charts | **A card keeps its title and says `Nothing is recorded here yet.`** A tile has no body and a card does. §18.3 |
| **R5-12** | Non-monotonic bars on a list sorted by something else | **A bar is legal only where the rows are ordered by the measure the bar draws.** §18.4 |
| **R5-11a** | R5-11 was not buildable — three states, two discriminators | **`awaitingStore: AwaitedStore | null`** on breakdown and series. A named store, not a boolean, so the guard is structural. §19.1 |
| **Q-D18** | Three Management boards render seven tiles | **Does a cumulative census render as a tile anywhere?** §5.4 applied its own principle as a *move*, and a move is count-neutral — one board's fix became another's defect. Absorbs Q-D17. §23.4 |
| **R5-15** | The §11.2 sort keyed on `value: null`; a seeded literal is not null | **`sourceResource` is required on an aggregate, and `null` means the tile does not render.** A rule about whether a measure exists cannot be implemented as a test on what the fixture contains. §25.2 |
| **R5-14** | Four people, four populations, one tile | **An aggregate declares its population in `sourceResource`.** `null` there is not “no row-level source”, it is an undeclared denominator. §22.3 |
| **R5-13** | `avgRenewalRate` states a base but not a population | **The label names the population; the caption names the base count.** A mean whose population is only in its caption is quotable without it. §21.2 |
| **R5-9, corrected** | §18.1's guard was prose against a type that ignored it | **Prohibitions, plus a `gatedBy` metric key the caveat cannot omit.** A caveat may only exist for a condition a tile on the same board shows — R4-4 §4.3's test, one level down. §20 |

Plus **§13**: R4-6b §6.6.4 says *"four tiles"* and there are **five** — corrected, with the
reason it is worth correcting rather than quietly fixing.

---

## 1. R5-1 · V-2 — the unexplained em dash

### 1.1 I tested the audit's judgement rather than accepting it, and it survives — but not for the reason given

The audit calls it a taste question dressed as a finding. It is not a taste question, and here
is the test that settles it without appealing to taste.

**The tile carries two em dashes and one sentence.** `— / Impersonation sessions / — No
comparison period yet`. The sentence sits beside the *lower* dash and explains it. The upper
dash — larger, first in reading order, in the slot the eye goes to first — has nothing. There
is no reading of that tile in which the value's absence is explained, including the correct
reading. **That is ambiguity by construction, not by taste**, and no amount of familiarity
resolves it.

The counter-example the audit supplies is the proof: `Market & Zones` puts `Not launched`
directly under each em dash, and those rows read correctly. Same mark, same emptiness, one
sentence of difference.

**And the reference does not do this at all.** The inherited capture
— a dashboard on a day with no sales — renders `$0.00`, `0`, `0%`, `$0.00` as its four values.
Every em dash on that page is in the **delta** position. Where a card genuinely cannot produce
a value (`Sales by channel`) the card's whole body is replaced by one centred grey sentence,
title retained. **No console worth copying prints a bare em dash where a value goes.** So AC-601's shape
was already a departure from the reference, and the *"and a visible reason"* half was the thing
that made it survivable. Only the first half was built.

The finding stands.

### 1.2 The fix is not new machinery, and this is the part the audit got wrong

**R4-11 §11.2 already rules on this**, and the build has not applied it:

> - **A measure that exists and has no current value** → the tile renders with an **em-dash**
>   (AC-698). We measure it; today there is nothing.
> - **A measure with no store at all** → **the tile does not render.** Not an em-dash, not a
>   skeleton, not a "coming soon". An em-dash is a claim that the number exists somewhere.

Sort the eight flagged tiles by that test, using the fixture's own comments:

| Tile | Fixture's own words | Class |
|---|---|---|
| `support.overview.ticketsBreaching` | *"there is no ticket store in this layer"* | **no store** |
| `support.overview.promiseKept` | *"same missing ticket store"* | **no store** |
| `admin.overview.integrityOrphans` | *"the scan reads a payments ledger this layer does not hold"* | **no store** |
| `admin.overview.impersonationSessions` | *"`NEW DATA` for the pairing"* — the events are logged; the join is not | **no store** for the measure as defined |
| `admin.overview.legalDocsUnaccepted` | *"`NEW DATA` for the grace period"* — the field does not exist | **no store** for the measure as defined |
| `support.overview.contactsPerThousandTrips` | *"`DB.contacts` is seeded empty… `null` says we have not measured it"* | **no current value** |
| `support.overview.uncodedContactShare` | a share over a zero denominator — the store exists and is empty | **no current value** (`not-computable`) |
| `management.performance.avgRenewalRate` | blocked on **Q-107** | **unsorted**, and it stays rendering until Q-107 is answered |

**The count, derived rather than summarised: five of the eight have no store** — two on Support
(`ticketsBreaching`, `promiseKept`) and three on Admin (`integrityOrphans`,
`impersonationSessions`, `legalDocsUnaccepted`). **Two are measured with no current value** and
stay, em-dashed with a reason. **One is unsorted.** So **Support goes 8 → 6** and **Admin goes
7 → 4**.

**A ninth tile sits outside V-2's set and belongs to the same rule:**
`management.performance.avgCaptainRating` derives from `drivers`, has a store, and computes to
nothing because no captain in the dataset carries a rating — a mean of an empty set,
`not-computable`. Found by product-owner, not by this pass.

**Where a tile classifies differently under a re-derivation, it stays rendering.** A tile
wrongly kept is visible and correctable; a tile wrongly deleted is invisible and nobody goes
looking for it again. That asymmetry decides every borderline case in this table.

**Most of V-2 is not a contract gap. It is a ruling that shipped and was never applied.**

> **Corrected 2026-08-27, and the correction is a defect in this document rather than in the
> table above.** This paragraph originally read *"four to six of the eight tiles must be
> absent"*, and §14 repeated it as *"up to four of eight"* on Support. **The table gives five,
> and the prose gave a range nobody could derive from it.** Product-owner re-derived it
> independently and got the same five (`specs/05-metrics-content.md` §21.4, by a sharper test
> than mine: the candidate set is `sourceResource: null` **and** `value: null`, which is exactly
> V-2's eight). A build agent was about to delete tiles on the strength of the prose.
>
> **This is the false-✓ class in a new place: a summary sentence written about a table gets
> read instead of the table**, because it is shorter and it looks like the answer. The fix is
> the same one — the artifact is the table; a sentence may point at it and may not restate its
> arithmetic.

**R4-11 §11.2 had a hole of its own and I am closing it in the same breath.** It said what the
tile does and never said what happens to the criterion that enumerated it. A tile silently
vanishing makes a board's AC wrong, which is exactly **V-6**'s shape. So:

> **R4-11 §11.2, addendum.** When a tile is absent under the bar, the acceptance criterion that
> enumerates that board's tiles is amended in the same pass, and the tile is listed in the
> spec's *deliberately not here* table with the store it waits on. A board's tile count is
> never a surprise to the person reading the spec.

### 1.3 The residue — `Metric.absenceReason`

For the class that survives — *we measure it, today there is nothing* — AC-601's *"and a visible
reason"* has no slot, and that half of V-2 stands.

> **A tile whose `value` is absent states why, in the line where its delta would be.**
>
> ```ts
> /** Why the value is absent. Non-null if and only if `value === null`. */
> export type ValueAbsenceReason =
>   | 'not-captured'    // we do not record the data this number is computed from
>   | 'not-computable'  // the inputs exist; the calculation has no answer
>                       // (a rate over a zero denominator, a mean of an empty set)
>
> Metric { …, absenceReason: ValueAbsenceReason | null }
> ```
>
> **Two members, and a third is added by a spec that needs one** — not pre-invented. A tile the
> operator may not see is **absent**, not em-dashed (`05-metrics-content.md` §11.2 / AC-705), so
> permission is not a member. A measure with no store does not render at all (§1.2), so that is
> not a member either.

**Why the delta line and not a new one.** When the value is absent the delta is *entailed* to be
absent — you cannot compute a change from nothing. So the tile has exactly one line on which to
say one thing, and today it says the less important of the two. The slot already renders
`— {reason}`; it just answers the wrong question. **No new line, no new geometry, no change to
D7 §4.9's tile order.**

**Two consequences, both stated so they are not discovered:**

1. **The caption does not render while the value is absent.** A denominator with no numerator is
   noise, and a tile must carry one explanation, not two. AC-641 / AC-674 / AC-675's *"cannot
   ship without a caption"* is an obligation on the tile **in its content state**.
2. **`comparison.reason` is not shown on such a tile.** It is not deleted — it is still the
   right thing to say when a value exists and a comparison does not.

### 1.4 §4.2 does **not** gain an absence kind, and the reason is sharper than the audit's

The audit says *"do not widen the caption's scope to absorb it"* and gives no reason beyond
tidiness. The reason is this: **the caption sits on tiles that have a value, above the delta
line.** A slot that sometimes qualifies a number and sometimes explains that there is no number
must be read to find out which — and a tile that needs both a scope limit and an absence reason
has no way to give them. The two strings answer different questions and live at different
heights. Keep them apart.

### 1.5 What this ruling does not do, said plainly

**It converts a board that reads as broken into one that reads as honestly empty. It does not
make the board fuller.** Four tiles saying `Not captured yet` are four tiles saying nothing, and
the owner's *"there is so much still can be known"* is not answered by better wording of an
absence. The breakdowns build is right: **a contact log is the highest-value data capture left in the
product.** Nobody should read this ruling as the answer to that complaint. See §14, question 1.

---

## 2. R5-2 · AC-605's hole

`admin.overview.operatorsWithoutTwoFactor` carries `comparison: { kind: 'target', value: 0 }`
with `deltaPercent === null` — a value that is not zero against a target of zero has no
percentage — and renders `— vs 0 target`. AC-617 governs a target **with** a statable
percentage and is scoped to Management › Overview besides. AC-605 governs `none`. The branch
that ships is governed by nothing.

**The builder's reading of AC-605 is right and the split is right.** What is wrong is AC-605's
subject. Its real subject was always *a tile that cannot state a delta*; `kind === 'none'` was a
proxy for that, and `clients/metrics.ts` documents the one deliberate break in the proxy. So
**amend AC-605 rather than write AC-605a** — one criterion, no gap between two.

> **AC-605** (replacement text, routed to product-owner — see §12)
> A tile that cannot state a delta shows an em-dash where the delta would be, never `0 %` and
> never a blank. Where the comparison is `none`, the em-dash is followed by one of exactly three
> reason strings. Where the comparison is a `target` the value cannot be expressed as a
> percentage of, the em-dash is followed by the target itself. **In both cases the absence is
> announced to a screen reader, not only drawn.**

The last sentence is **V-8**, named as an obligation instead of left as a gap. The `none` branch
already satisfies it — its reason string is visible text. The `target` branch hides its em dash
with nothing replacing it, so it takes an `.sr-only` companion. Copy in §11.

**Which existing criterion absorbs it: AC-605, as rewritten. Not AC-617 — that one is
board-scoped and the two-factor tile is on Admin.**

---

## 3. R5-3 · The declaration-order clause is deleted, and it was mine

R4-4 §4.3 orders notices by **tone, then `severity`, then declaration order**.

**The audit is right that the third clause is unreachable if `severity` is unique within a tone,
and right that this is a ruling question rather than a fixture request.** I go further: the
clause should never have been written, and the reason is not reachability.

**A tie-break decided by the order somebody typed an array is not a tie-break. It is a coin
flip with a stable seed.** I wrote *"then declaration order"* to make the rule total, and I made
it total by hiding a genuine ambiguity behind an implementation detail — `Array.prototype.sort`
being stable in this runtime. Two conditions equally severe and equally urgent is a real
editorial problem on a board and it should surface as a defect, not be silently resolved by a
line number.

> **R4-4 §4.3, amended.** The screen renders exactly one notice: **the highest tone, then the
> highest `severity`.** The selection is total because **`severity` is unique among a board's
> notices of the same tone.** Two notices sharing a tone and a severity is a **fixture defect**,
> not a rendering question.

**And the enforcement is the point.** The right artifact is not a fixture that exercises the
third clause — it is a test that proves the collision never exists:

> for every board in the fixtures, no two notices share `(tone, severity)`.

That runs on real data, always, and never goes stale. It is the opposite of a synthetic case.

**Two things stay exactly as the audit records them, and it is right about both:**

- **The tone clause is exercised by real data and has been watched choosing.** `operations-overview`
  declares a `warning` at 70 **first**, then a `critical` at 95 — ordered so that a
  declaration-order implementation renders the wrong banner. That is how a fixture should be
  seeded, and deleting the third clause does not weaken it: the ordering still proves the tone
  comparison runs.
- **The `severity` clause stays, and stays synthetic-only.** It breaks ties *within* a tone and
  no board declares two of one tone. `board.test.ts`'s cases stay labelled `SYNTHETIC`. **A test
  that asserts a rule is not less valuable than one that asserts a rendering** — it is just a
  different claim, and the label is what keeps the two from being confused.

Nothing downstream may record the `severity` clause as verified.

---

## 4. R5-4 · B-3 — the caption's scope was drawn wrong

`caption.overturnIsNotFailure` renders *"Of decided appeals. Higher is better here."*
`05-metrics-content.md` §11.1 tile 8 says the tile **must** state that higher is better. R4-4
§4.2 permits **only** a scope limit or a denominator. The builder changed neither document and
was right not to.

**§4.2 is the document that moves, and the error is mine.** I wrote:

> A caption states a **scope limit or a denominator**. It never states a value, never states a
> status, never carries a call to action, and never carries a link.

The four prohibitions were the rule. The two-item list in front of them was me writing down the
two instances I had on the desk — legacy's *"excludes pending applicants"* and *"5 of 12 total"*
— and mistaking a list of instances for a definition. `Higher is better here.` states no value,
no status, no action and no link. It is doing exactly the job the caption exists for: **a number
whose scope is not stated gets quoted wrong; a number whose direction is not stated gets read
wrong.** Same failure, same slot.

There is a second reason, and it is a consequence of **R4-5** that I under-weighted when I made
that ruling. R4-5 made the delta chip neutral, correctly. The field that would have carried
valence — `higherIsBetter` — is now spent on a screen-reader phrase. **So a sighted operator has
no valence carrier at all except words.** On fifty-five of fifty-six tiles that costs nothing,
because `Tickets breaching now` rising is obviously bad. On the overturn tile the intuition is
backwards, and words are the only instrument left.

> **R4-4 §4.2, amended.**
>
> A caption states **what a reader must know to read the number correctly, and nothing else**: a
> **scope limit**, a **denominator**, or **the direction that counts as good, where the label
> does not make it obvious**. It never states a value, never states a status, never states the
> delta, never carries a call to action, never carries a link. One line, **≤38 characters**, it
> truncates and never wraps. It is a translation key with parameters, never a concatenation. It
> **does not render while the tile's value is absent** (R5-1).

**This closes AC-719 as well, and nobody had noticed it was homeless.** AC-719 speaks of *"a
caveat attached to a tile — the dormancy proxy, the overturn-rate explanation, the
uncoded-ranking warning"* and gives it no slot. **The caveat and the caption are the same
slot.** `caption.dormancyProxy` — *"A proxy: no trip and no subscription."* — is already one of
the three AC-719 names, already shipping in the caption, already legal. The overturn one was
legal too and the rule said otherwise.

**The interaction question the brief asks: valence is that third kind. Absence is not.** A
caption qualifies a number that exists; where there is no number there is nothing to qualify,
and the delta line is free precisely then. The two do not compete for a slot.

### 4.1 The 60-character budget was also wrong — V-5

`--text-xs` at the measured caption box: **270px at 3-up (1280), 225px at 4-up (1440)** → ~46
and ~38 characters. I wrote 60 by analogy with R9's toast budget without measuring the box a
caption actually gets, and the result is that the one caption whose content matters clips on the
**wide** viewport and survives the narrow one.

> **The budget is 38 characters in English.** The character count is a drafting aid; **the rule
> is that the caption fits its 4-up box in both languages without truncating.** Arabic at 13px
> is checked separately — a string that fits at 38 Latin characters is not guaranteed to fit
> translated, and the check is per string, not per rule.

Two of nineteen seeded captions exceed 38. Both are rewritten in §11. The other seventeen fit.

---

## 5. R5-5 · B-1 — two numeric columns, and the slot that should not exist

`admin.rotaGapsByDay` renders `Friday … 6 6`. `risk.highValueRidersAtRisk` renders
`884.00 SAR 63`. Two numbers, neither named. §4.1's own worked example uses the sub-label to
name them — `Supply gap · captains needed` — which collides with the sub-label's stated job of
carrying a *categorical* fact, and which is what produced `Open · past their SLA` (B-6): a
column legend repeated identically on every row, which is what a header row exists to avoid.

**I looked at the reference before deciding, and it answers the question directly.**
In the inherited capture, the conversion-rate card:

```
Added to cart                         0.00%    —
0 sessions
```

**`0 sessions` is the second number, and it is a noun phrase in the sub-label.** The reference
carries exactly one numeric column — the measure the list is ranked by — and puts the second
number where it can be named. `Top locations` and `Top products` in
The inherited captures carry one number each and no second column at all.

> **R4-4 §4.1, amended.** A breakdown row carries **exactly one numeric column**: the measure it
> is ranked by. `secondaryValue` and `secondaryUnit` are **withdrawn from the row**. A second
> numeric fact is a **noun phrase in the sub-label** — `4 of 20 trips ran late`, `63 trips`,
> `3 past their SLA` — carried by `subLabelKey` with **`subLabelParams`**, which the row gains.
> Two facts on one sub-label join with a middot: `Document expired · 3 of 19 trips ran late`.

**Why this and not a column-legend line above the rows.** A card with a heading, a column-label
row and two right-aligned numeric columns is a table without a table's affordances — no sort, no
column control, no row action — and **R4-6 already ruled that when a board's list wants columns
it becomes a table**, on Market & Zones, for exactly this reason. Adding a half-table to the
board would contradict a ruling one round old.

**Three things this buys that the column form could not.**

1. **Every number carries its own noun.** There is no left-to-right convention to learn and none
   to get wrong in Arabic.
2. **It solves the nullable secondary, which is the case the column form cannot state.**
   `zones.citiesHealth` ranks four cities on zones live; three have no failure-rate reading at
   all. As a column that is an em dash — the same mark V-2 is about. As a phrase, **a city with
   no reading simply does not state one, and `Not launched` says why.** The coordinator's note
   on the rebuilt fixture makes this sharper: since `citiesHealth` now computes per city, those
   three `null`s are *real absences with a real reason*, and *"a city with no reading and a city
   with a reading of zero are different facts"*. The phrase form is the only one of the two that
   can render that difference. **That is the strongest argument in this ruling and it arrived
   from the fixture, not from the reference.**
3. **The "a column is a property of the LIST" reasoning becomes moot.** It was a
   good solution to the problem as posed — per-row would have given Riyadh a figure and three
   rows a hole. **I am changing the problem, not overruling the answer.**

**And it reverses B-6, deliberately.** `breakdown.sub.queueStanding` was `{secondary} past their
SLA` and the builder changed it to `Open · past their SLA` because the rule as it stood gave the
number to the column. **The original was right and the rule was wrong.** It goes back, as
`{past} past their SLA`. That is not churn; it is the rule catching up with the copy.

**One consequence to schedule, not to discover: V-9 stops being latent.** `BreakdownList`'s
sub-label is the one slot with no `<bdi>`, and it renders correctly today only because every
sub-label is a pure strong-LTR run. **Every sub-label written under this ruling leads with or
contains a numeral.** V-9 goes from *Low, latent* to *must land in the same pass as this change*.

---

## 6. R5-6 · B-2 / V-11 — the bar earns its place; the token does not

Browser-measured `--chart-fill` (`#eaf0fe`, which is `--ev-blue` at 10 % on white) against the
card: **1.142 : 1**. The audit's verdict — *it buys 20px of row height and returns nothing the
number beside it did not* — is correct **about the band and wrong about the bar**, and the
reference is why.

the inherited capture, `Top locations`:

```
Singapore • Singapore
████████████████████████████████████  4
Boardman • United States
█████████████████████  2
```

**The reference's ranked bar is a saturated fill at full strength, not a tint.** So is
`Customers / First-time` on the same page. A ranked bar in the reference is a *mark*; a pale
area fill is what sits **under a line**, where the line does the delimiting. `--chart-fill` is
the second thing being asked to do the first thing's job.

> **R4-4 §4.1, amended — the bar.**
>
> | | |
> |---|---|
> | **Fill** | **`--chart-series`** (`--ev-blue`, `#2b6ef0`) — **4.574 : 1 on card white** (recomputed this pass; it is D7's own figure for `--ev-blue`). Not `--chart-fill`. The bar and the chart's line are the same object — the quantity mark. The area fill is the thing that is not a mark. |
> | **Track** | unpainted, as today |
> | **Height** | **4px.** The builder chose 6px *"in the absence of one in the ruling"*, reasoning that 4px at 1.15 : 1 is invisible. At 4.574 : 1 it is not. 4px is on the grid; 6px was not on any grid but the half-step. |
> | **Denominator** | **the largest row shown.** `barFraction = value / max(value over rows shown)`, so the top bar is always full. |
> | **Legal when** | one unit, one denominator, **and `max > min` across the rows shown.** |
> | **Semantics** | `aria-hidden`. Every bar sits beside its own number in text (§7.5), so nothing is carried by the fill alone — that stays true and is now belt-and-braces rather than the whole defence. |

**No new token. The audit's conclusion was "a new fill token, or drop the bar"; the answer is
that the token already exists and the wrong one was cited** — by me, in §4.1, where I wrote
`--chart-fill` without asking what a bar with no line above it is.

**The denominator clause is a finding I owe the audit, found while ruling on it.** Three
breakdowns use three different denominators and §4.1's *"one denominator"* only ever constrained
them *within* a list: `risk` divides by the largest row (`barFraction: 1` on the top row),
`operations` by the total, `admin.rotaGapsByDay` by 42 — all the rota's slots, which is neither.
All three are legal by the letter and mean three different things, and a reader moving between
boards has no way to know which. **Once the bar is legible enough to read alone, what it is a
fraction of becomes load-bearing.** Share-of-max is the right choice because a ranked list's
question is *"how far behind the leader?"*; share-of-total answers a composition question that a
`Top 5 of 14` cut-off has already broken.

**V-13 closes as a consequence and not as a fixture judgement call.** `admin.rotaGapsByDay` has
seven rows all valued 6, so `max === min`, so `bar: false` — by rule, not by taste. It also
stops paying 20px a row for seven identical bands. **The finding it encodes survives**: *nobody
is on call at any hour of any day* is what the seven equal numbers say, and they say it.

---

## 7. R5-7 · B-8 — `MetricBreakdownRow.labelKey` gains a union

`breakdown.row.entity` is a pass-through key whose entire English string is `{name}`. It
satisfies the type and AC-713 and it is a fig leaf, and both the fixture and the component say
so independently. **Granted.**

> **R4-4 §4.1, amended — the row label.**
>
> ```ts
> export type BreakdownLabel =
>   | { kind: 'key';  key: string; params: Record<string, string | number> | null }
>   | { kind: 'text'; text: string }
>
> MetricBreakdownRow { label: BreakdownLabel, … }   // replaces labelKey + labelParams
> ```
>
> `kind: 'key'` is **copy** — a closed set: a rota day, a queue, a plan tier, a reason code.
> `kind: 'text'` is **data** — a person, a city, a subscription. Nothing translates it and
> nothing may try.

**This is not tidiness, and that is the part worth defending.** The two kinds need *different
rendering*, and today the component cannot tell them apart, which is why every row label is
`<bdi>`-isolated defensively rather than by analysis:

| | `kind: 'key'` | `kind: 'text'` |
|---|---|---|
| Direction | takes the **page** direction. A translated label in an Arabic console must lay out RTL. | **unknown at build time.** `Abdulaziz Al-Suwailem` in an Arabic console is the shipping case, and it is LTR. |
| Isolation | none needed | `<bdi>`, and the **truncating box** takes the run's direction |

**That second row is V-4.** Under `dir="rtl"` an overflowing Latin row label is ellipsised at its
**head** — `Abdulaziz Al-Suwailem` → `…uwailem` — because the truncating span carries the page's
direction while the `<bdi>` inside carries `ltr`. The audit is right that the naive fix
reintroduces §5.4's stretched-`<bdi>` defect. **With the union, the fix is targetable**:
`dir="auto"` / `unicode-bidi: plaintext` on the truncating box **for `text` labels only**,
leaving `key` labels on the page direction where they belong. Without the union the same
treatment would have to be applied to translated labels too, and that is wrong for them.

**AC-697 is what forced the fig leaf and it needs one clause.** Replacement text in §12. The
clause that would have caught this: *a row label is never a key whose whole string is a
parameter.*

**Sub-labels stay keys** — every one of them is a closed term — and gain `subLabelParams` under
R5-5.

---

## 8. R5-8 · V-3 — a breakdown never exceeds half the content width

Measured at 1440 on `management/zones`: `Riyadh` at x = 368, its `6` at x = 1326. **958px of
white between a name and its number.** Five of the six boards that carry a breakdown carry
exactly one, so five of six render this. `MetricBoardScreen` uses `grid-cols-1` for a lone
breakdown and `grid-cols-2` for two — and does the same for charts.

**The reference does not give a breakdown a row of its own.** In
the inherited captures,
`Online store conversion rate` — a breakdown — sits in the **same three-across row** as `Total
orders` and `Average order value`, both charts, all three sharing top and bottom edges. Its
label-to-value distance is ~200px in the capture.

> **R4-4 gains §4.5 — the board's section grid.**
>
> **Below the tile grid, charts and breakdowns share one two-column grid**, in that order:
> charts first, then breakdowns, each occupying **one half of the content width**. A breakdown
> never occupies more than one cell. Where the count is odd, the trailing cell is **page
> ground** — it is not filled, stretched or padded.

```
┌──────────────────────────── page header ────────────────────────────┐
│  Market & Zones                                                     │
│  Computed 27 Aug 2026, 09:40                                        │
├─────────────────────────────────────────────────────────────────────┤
│  [ banner — at most one, R4-4 §4.3 ]                                │
├───────────────┬───────────────┬───────────────┬─────────────────────┤
│ tile          │ tile          │ tile          │ tile                │  ← 4-up ≥1344, 3-up below
├───────────────┴───────────────┼───────────────┴─────────────────────┤
│ chart card                    │ breakdown card                      │  ← §4.5, halves
│                               │  Riyadh              6              │
│                               │  Live · 45% of requests unserved    │
│                               │  ─────────────────────────────────  │
│                               │  Jeddah              0              │
│                               │  Not launched                       │
└───────────────────────────────┴─────────────────────────────────────┘
```

**Halves, not thirds, and the reason is Eyvar's own content.** Content width at 1440 is ~990px.
Thirded that is ~320px per card, and an Eyvar breakdown row carries a label, a sub-label that
now holds a phrase (R5-5) and a right-aligned numeric column. At 13px body an entity name
truncates at ~320px — and **V-4 proves that truncation is currently destructive in Arabic**.
Half is ~490px, which is what `management/risk` already renders and what the audit measured at
~140px label-to-value. **The product contains its own worked counter-example and it reads
correctly. Copy it.**

**On the trailing empty cell, and why it is not V-6.** A tile grid is a row of *like objects*, so
a gap in it reads as a missing sibling — that is why a lone seventh tile reads as *the page ran
out*. A section grid is a **two-column layout**, and a short last row is how a two-column layout
ends. They are different shapes and only one of them is a defect.

**Arabic.** The grid mirrors; the first cell is at the **inline-start**. Nothing in this ruling
depends on anything being on the left.

**What it changes today:** `management/risk` becomes `[chart | breakdown] / [breakdown | ground]`
instead of a full-width chart above two halves — better than either arrangement it has had.
`management/overview` (two charts) is already correct.

---

## 9. R4-4 as amended — the paste-ready blocks

Everything below **replaces** the corresponding text in `07-rulings-r4.md` §4. Where a row is
unchanged it is repeated, so this table can be read alone.

### 9.1 §4.1 — breakdown anatomy

| Slot | Rule |
|---|---|
| **Heading** | A fragment above the rows stating dimension, ranking and cut-off (AC-690). No period — R6. `Top 5 zones by failure rate`. |
| **Caveat** | Optional, **conditional** — **R5-9, §18.1.** Directly under the heading, above the first row. One sentence stating a reason the ranking below may not be trusted, and nothing else. Takes a period (R6). `--text-xs` / `--ev-text-2`, no icon, no tone, no link. **Wraps; never truncates.** |
| **Label** | `--text-sm` / 500 / `--ev-ink`, truncates, never wraps. **A `BreakdownLabel`** (R5-7): a key for a closed set, text for an entity. A link only if its destination is already filtered to that row (AC-693); otherwise plain text and not a focus stop. |
| **Sub-label** | Optional. `--text-xs` / `--ev-text-2`, one line, truncates. Carries the row's second fact — **categorical, numeric, or both joined by a middot**. A numeric one is a **noun phrase**: `4 of 20 trips ran late`. A key with `subLabelParams`, never a concatenation. |
| **Primary value** | **The only numeric column.** Right-aligned, tabular figures (R4; does not flip in Arabic). Formatted from the row's own `unit`. |
| ~~Secondary value~~ | **Withdrawn — R5-5.** |
| **Bar** | Optional. `--chart-series`, **4px**, unpainted track, `aria-hidden`. Legal only when every row shares one unit and one denominator, **`max > min`** (R5-6), **and the rows are ordered by the measure the bar draws** (R5-12, §18.4). `barFraction = value / max(value over rows shown)`. |
| **Cut-off line** | Last row, `--text-xs` `--ev-text-2`: `Showing the top {shown} of {total} {dimension}.` A sentence, so it takes a period (R6). Only when `total > shown` (AC-696). |
| **Row height** | `--ev-row-h` without the bar, `--ev-row-h-media` with it. Uniform within a breakdown. |
| **Width** | **Never more than half the content width — R5-8.** |

```ts
MetricBreakdownRow {
  id:             string
  label:          BreakdownLabel        // R5-7 — replaces labelKey + labelParams
  subLabelKey:    string | null
  subLabelParams: Record<string, string | number> | null   // NEW — R5-5
  value:          number
  unit:           MetricUnit
  currency:       CurrencyCode | null
  barFraction:    number | null         // 0..1, null when `bar` is false
  drilldownRoute: string | null
}
```

**`MetricBreakdown` is unchanged.** `MetricBoard` is unchanged.

**Note for whoever writes the row-height fixture, and it is `V-15`, not settled here.** A
two-line row at `--ev-row-h` measures 1px of clearance on three lists. R4-4 §4.1 names
`--ev-row-h` for any row without a bar; the `DESIGN.md` cheat sheet says a second line costs
56px. **The build followed R4-4 verbatim and is not at fault.** I have not ruled it in this pass
because R5-5 changes what a second line contains on every list in the product, and the right
measurement is taken after that lands, not before. **Raised, dated, and owed.**

### 9.2 §4.2 — the caption

> A caption states **what a reader must know to read the number correctly, and nothing else**: a
> **scope limit**, a **denominator**, or **the direction that counts as good, where the label
> does not make it obvious**. It never states a value, never states a status, never states the
> delta, never carries a call to action, never carries a link. One line, **≤38 characters**, it
> truncates and never wraps. It is a translation key with parameters, never a concatenation. It
> does not render while the tile's value is absent.
>
> Legal: `Excludes pending applicants.` · `1 of 4 cities is live.` · `Ceiling is 3%.` ·
> `Of decided appeals. Higher is better.`
> Illegal: `Up 8% on last week.` (the delta) · `Needs attention.` (a status — R7 owns those) ·
> `Review the queue →` (an action — a tile is not a banner) · `Not captured yet` (an absence —
> R5-1 owns that, and it lives on the delta line)

Placement is unchanged: glyph → value → label → **caption** → delta chip.

### 9.3 §4.3 — notice selection

> A board **declares conditions**; the page renders **at most one** banner, in the page banner
> slot between the page header and the tile grid, as `Banner variant="page"`, tone from the
> notice, **no dismiss**.
>
> The screen renders the notice with **the highest tone, then the highest `severity`.**
> `severity` is **unique among a board's notices of the same tone**, so the selection is total.
> Two notices sharing a tone and a severity is a fixture defect.
>
> A board declares **at most three**. The suppressed conditions are not lost — each is
> independently visible in the tile or breakdown it came from, and that is the test: **a notice
> may only exist for a condition the board already shows a number for.**

### 9.4 §4.5 — the section grid

Text in §8 above.

### 9.5 §4.6 — the absent value

Text in §1.3 above.

---

## 10. Every state of the metric tile, drawn

The tile has four content-bearing states and they must all be drawn, because three of them
render an em dash and only one of those three is currently explained.

**A. Value and delta — the ordinary case.**

```
┌──────────────────────────────┐
│ ⛁                            │
│ 47                           │   --text-lg / 600 / --ev-ink
│ Active subscriptions         │   --text-xs / --ev-text-2
│ Excludes pending applicants. │   caption — scope limit
│ [↑ +8.1%]  vs 1–25 May       │   neutral chip (R4-5) + grey phrase
└──────────────────────────────┘
```

**B. Value, no statable delta, comparison `none` — AC-605 first sentence.**

```
│ 3                            │
│ Rider accounts sharing a no… │
│ —  No comparison period yet  │   em dash aria-hidden; the reason is the announcement
```

**C. Value, target, no statable percentage — AC-605 second sentence, R5-2.**

```
│ 3                            │
│ Operators without two-factor │
│ —  vs 0 target               │   +.sr-only `No percentage change to state`   ← V-8
```

**D. No value — R5-1. New.**

```
│ —                            │   em dash, aria-hidden
│ Contacts per 1,000 trips     │
│ —  Not captured yet          │   the reason explains the VALUE. No caption on this tile.
```

**E. Not a state: a measure with no store.** The tile does not render (R4-11 §11.2). There is no
skeleton, no placeholder and no ghost cell in the grid.

**Loading** is the board's (P5 tile skeleton, `aria-busy`, not a spinner). **Error** is the
board's (page-scope card, shell intact, one primary `Try again`). **Board-empty** is R8's first
kind — whole page, illustration — and remains unverified visually because no fixture reaches it;
that is recorded, not claimed.

**Breakdown states.** Content as §9.1. **Empty** is R8's second kind: one grey sentence,
`Nothing to rank for this period.`, card and heading retained, no illustration. Loading and
error belong to the board — one request serves it.

---

## 11. Copy — final, every string

Sentence case throughout. Fragments in the chip line take **no** period (R6); the cut-off line
is a sentence and takes one.

### 11.1 New — the absent value (R5-1)

| Key | English |
|---|---|
| `overview.absent.not-captured` | `Not captured yet` |
| `overview.absent.not-computable` | `Nothing to measure yet` |

### 11.2 New — the screen-reader companion (R5-2 / V-8)

| Key | English |
|---|---|
| `overview.compare.targetNoDelta.sr` | `No percentage change to state` |

### 11.3 Captions rewritten to the 38-character budget (R5-4)

| Key | Was | Is | ch |
|---|---|---|---:|
| `caption.overturnIsNotFailure` | `Of decided appeals. Higher is better here.` | **`Of decided appeals. Higher is better.`** | 37 |
| `caption.afterGivebacks` | `After promos, bonuses, refunds and cover.` | **`Gross revenue less all deductions.`** | 34 |

`afterGivebacks` also fixes a second thing: the old string named three of the six deductions
AC-613 lists and read as exhaustive. The new one states the relation, which is what a scope
limit is, and leaves the enumeration to AC-613 where it belongs.

The other seventeen seeded captions are ≤37 characters and are unchanged.

### 11.4 Sub-labels rewritten to carry the second number (R5-5)

| Key | English | Renders |
|---|---|---|
| `breakdown.sub.lateOfTrips` | `{late} of {total} trips ran late` | `4 of 20 trips ran late` |
| `breakdown.sub.lateOfTripsExpired` | `Document expired · {late} of {total} trips ran late` | `Document expired · 3 of 19 trips ran late` |
| `breakdown.sub.churnHighTrips` | `High churn risk · {trips} trips` | `High churn risk · 63 trips` |
| `breakdown.sub.churnMediumTrips` | `Medium churn risk · {trips} trips` | `Medium churn risk · 8 trips` |
| `breakdown.sub.cityLiveUnserved` | `Live · {rate} of requests unserved` | `Live · 45% of requests unserved` |
| `breakdown.sub.cityNotLive` | `Not launched` | unchanged |
| `breakdown.sub.queuePastSla` | `{past} past their SLA` | `3 past their SLA` |
| `breakdown.sub.rotaWeekend` | `Weekend · all {count} are high-risk` | `Weekend · all 6 are high-risk` |
| `breakdown.sub.rotaNightBlock` | `Night block · {count} are high-risk` | `Night block · 2 are high-risk` |

**Retired:** `breakdown.sub.queueStanding`, `breakdown.sub.weekend`, `breakdown.sub.nightBlock`,
`breakdown.sub.churnHigh`, `breakdown.sub.churnMedium`, `breakdown.sub.cityLive`,
`breakdown.sub.documentExpired`.

**Two things a builder must not get wrong here.**

1. ⚠ **INVERTED — see §23.2. Params carry BARE NUMBERS; the COMPONENT formats them, because it
   is the only layer holding `language`, and hands the formatted string to the translator.**
   The text below is right about the translator and wrong about the contract, and it names no
   layer, which is why it was applied at the wrong one.
   ~~Params carry formatted values, never raw numbers.~~ `{rate}` receives `45%` from
   `formatPercent`; `{late}` receives a formatted count. The precedent is
   `overview.compare.target` — `vs {target} target`, where the target arrives already formatted.
   A `%` sign assembled in the component is a concatenation and AC-713 forbids it.
2. **`unserved`, not `fail`.** AC-718 keeps `failed` out of tile labels, chart titles and
   breakdown headings, and names the zones chart `Unserved requests`. The sub-label uses the same
   noun so a board does not call one thing two names.

### 11.5 Headings — unchanged

All seven breakdown headings and the cut-off sentence are unchanged by this pass.

### 11.6 Added by §18

Three further strings — the breakdown caveat, the not-recorded sentence and the reinstated
`breakdown.sub.cityLive` — are in **§18.11**.

---

## 12. Acceptance criteria — replacement text, drafted and routed

**I do not edit `docs/05-restructure/specs/**` and I tick nothing.** These are drafts for
product-owner. Each states what it would require; none asserts anything about the build.

| AC | Why it moves | Replacement text |
|---|---|---|
| **AC-601** | R5-1 / R4-11 §11.2. Today it obliges every `NEW DATA` tile to render an em dash, including tiles that must not render at all. | *A metric whose measure has no store does not render as a tile. A metric that is measured and has no current value renders an em-dash where its value would be, followed by the reason the value is absent, and never renders a number.* |
| **AC-605** | R5-2. Its subject was the wrong one; a real branch is governed by nothing. | Text in §2 above. |
| **AC-612** | V-6. Overview renders seven tiles against the enumerated six, and R4-11 §11.2's addendum (§1.2) makes the count the spec's obligation rather than a surprise. **Content decision — see §14, question 2.** | *Overview renders the tiles enumerated below, and no others.* — with the enumeration decided by the owner. |
| **AC-697** | R5-7. This AC is what forced the `{name}` fig leaf. | *Every breakdown heading, sub-label and cut-off line is a translation key. A row label is either a translation key or an entity name carried as data, and the two are distinguishable in the type; a row label is never a key whose whole string is a parameter.* |
| **§11.1 tile 8** | R5-4 resolves B-3 in this document's favour rather than the spec's, so the spec's sentence is now **satisfiable** and needs no change beyond the string. | No change to the criterion. The string is §11.3. |
| **AC-719** | R5-4. The caveat has a slot and it is the caption. Worth one clause so the next reader does not go looking for a second slot. | *…is a translation key in the same dictionary as its tile, carried in the tile's caption (R4-4 §4.2).* |

---

## 13. Two things from the coordinator, settled

### 13.1 R4-6b §6.6.4 says "four tiles". There are **five**. Corrected.

`management.zones.captainsNeeded` is zone-derived like the other four, and
`05-metrics-content.md` §9.1 ranks it **first** on the board. I wrote *"four"* by counting the
tiles I happened to be looking at.

**It is worth correcting loudly rather than quietly, because it is the ruling's own point
turning on itself.** §6.6.4 exists to stop a hand-seeded literal sitting above a table that
disagrees with it. Deriving four and leaving the fifth a literal is that exact drift, arriving
one tile to the left — and the ruling would have licensed it.

> **§6.6.4, corrected.** *When the table lands, **all five** of Market & Zones' metric tiles MUST
> be derived from the table's own rows. They may not remain literals.* — `captainsNeeded`,
> `starvedZones`, `unservedRequests30d`, `avgFailureRate`, `worstDemandSupplyRatio`.

Recorded with it, because it is the evidence the ruling was worth making: **all five derived
tiles hit the literal they replaced exactly** — 3, 2, 31, 45, 7. The derivation changed no
published number and removed the possibility of one drifting. The `:977` literal the ruling
named is gone.

### 13.2 The `recruit-now` / `watch` tone collapse — **the reading holds. Confirmed.**

Not raising it as a finding was right, and R4-10.1 is not the only rule that says so.

> **A zone's state takes a tone from the five, and `recruit-now` and `watch` take the same one:
> `warning`.** They differ by **label**, not by fill.

- **R17** decides it directly, one level below where R4-10.1 does: *one warning tone — separate
  "waiting on them" from "waiting on you" with the label, not a second fill.* `Recruit now` and
  `Watch` are two labels, and they are good ones: one is an instruction, one is an observation.
- **R7** closes the set at five and **R5a** leaves no red badge, so a sixth tone would need a
  §6.2 entry and there is nothing here to argue for one.
- The rest of the zone strip's states map without strain: a healthy zone is **success**, an
  unlaunched one is **neutral**. Three of five tones, no sixth requested, and the two that
  collapse are the two an operator distinguishes by reading a word they have to read anyway.

---

## 14. Two questions that are the business owner's, not mine

Drafted as yes/no, with the consequence of each answer stated, so neither needs an essay in
reply.

### Q-D16 — Does Support › Overview drop the two tiles it cannot compute?

**The headline of this question was wrong in the first draft and the count with it.** It asked
*"does Support ship as a four-tile board?"* on the strength of a prose summary that disagreed
with §1.2's own table. **Support goes 8 → 6, not 8 → 4. Admin goes 7 → 4.** Derived twice,
independently, from the same table; see §1.2 and `specs/05-metrics-content.md` §21.4.

> **Yes** — `Tickets breaching now` and `Promise kept` stop rendering on Support, and
> `Accounts failing the integrity scan`, `Open impersonation sessions` and
> `Documents awaiting acceptance` stop rendering on Admin. Each is named in its board's
> *deliberately not here* table against the store it waits on (AC-726), and each returns the day
> the store does. Support ships **six** tiles, two of them em-dashed with a reason.
>
> **No** — they stay as em dashes reading `Not captured yet`. Support keeps eight tiles and
> spends four of them telling the operator it cannot tell them anything.

**My recommendation: Yes.** R4-11 §11.2 already says so in general, and the corrected count makes
it a smaller change than the first draft claimed — Support loses two tiles, not four. **But this
is a scope call about what the product claims to measure, and that is the owner's.**

**One consequence the owner should see before answering, because it is not free.** Admin lands
on **four** tiles, which renders `4` at ≥1344 and **`3 + 1` at 1280** — the D2 guaranteed
viewport. That is **V-6**'s lone trailing tile arriving at the width the product promises,
on a shorter board. §1.2's original claim that the removals took a chunk of V-6 *"for free"* was
wrong and is retracted there; **R5-10** (§18.2) answers it with a permitted-count rule rather
than with a layout trick, and it makes Admin's answer arithmetic instead of taste.

**And the thing that actually answers the complaint is neither of these.** *"There is so much
still can be known"* is answered by **a contact log** — one row per contact, with a reason code
— which turns three null tiles, one empty chart and *"the most valuable list in the product"*
into the board Support needs. That is a data capture, not a design change, and it is the single
highest-value item outstanding on these eight boards.

### Q-D17 — Does Management › Overview render six tiles or seven?

**V-6.** Seven render; AC-612 enumerates six; `Active captains` is the seventh and appears in no
amendment in `specs/`, `design/` or `DECISIONS.md`.

> **Six** — one tile is dropped or relocated, four boards go from `3 + 3 + 1` to `3 + 3`, and the
> trailing row of one disappears from Management Overview, Growth, Zones and Admin.
>
> **Seven** — AC-612 is amended to seven and `3 + 3 + 1` is accepted as a shape.

**My recommendation: six, and drop `Active captains`** — it is a supply census that Operations
already owns, and AC-603 says a number appears as a tile on exactly one board. **But which tile
leaves is a content decision and it is the owner's**, and it interacts with Q-D16: applying
§11.2 changes the tile count on four boards at once, so both questions should be answered in one
sitting and the grid checked afterwards, not before.

---

## 15. Where I think the audit is wrong, or incomplete

It is a careful report and most of it survives contact. Four places it does not.

1. **V-2's fix.** *"Needs a contract decision, not a component fix."* Most of it needs neither —
   it needs **R4-11 §11.2 applied**, which is a fixture and a spec change and was ruled a round
   ago. Only the *we measure it, today there is nothing* residue is a contract gap. The audit
   read AC-601 carefully and did not check whether another ruling had already overtaken it. That
   is the same class of miss as its own §1.1 post-mortem, one document over.
2. **V-11's conclusion.** *"It buys 20px of row height and returns nothing"* is true of the band
   and not of the bar, and the reference settles it in one look: `Top locations` draws a
   **saturated** bar. The audit reached for *drop it* where the evidence said *the wrong token
   was cited*. It did offer the token option, and it should have been the recommendation.
3. **V-3's second suggestion.** *"…or right-pack the numeric columns against a narrower measure"*
   — that would leave a full-width card with its content squeezed into half of it, which reads
   worse than either the current state or the fix. Only the first suggestion is right.
4. **V-15, and this is a gap rather than an error.** The 1px-clearance finding is real and the
   audit correctly declines to rule it. It is not ruled here either, and §9.1 says why: **R5-5
   changes what a second line contains on every list in the product**, so the measurement worth
   taking is the one after it lands. Recorded as owed, with a date, so it is not lost.

**And one thing the audit did that is worth copying.** §1.1.3's rule — *an absence finding is
scoped to the tree it was taken from, and names the `HEAD` and the capture time* — is the most
useful paragraph in either report. It generalises past QA: **this document's §1.2 sorts tiles by
fixture comments read at `HEAD` = `8a65130` plus the working tree of 2026-08-27. The
classification is a claim about that tree, and mock-data-engineer should re-derive it from the
sources rather than take my table on trust.**

---

## 16. What changes, file by file

| File | Change | Owner |
|---|---|---|
| `design/07-rulings-r4.md` §4.1, §4.2, §4.3, §6.6.4 | Superseded blocks marked, pointing here | **product-designer — done in this pass** |
| `docs/ref/rulings.md` R3, R15 | **V-12** — R3 still says `--blue`; D7 rewrote it to `--ev-ink`. R15 says `~8px` for all three classes; badges are 4px. The file every role reads instead of `DESIGN.md`, and a stale line in it has already produced **V-10** | **product-designer — done in this pass** |
| `docs/ref/states.md` | Gains the tile's absent-value state | product-designer — done |
| `specs/05-metrics-content.md` AC-601, AC-605, AC-612, AC-697, AC-719 | Replacement text drafted in §12 | product-owner |
| `src/data/types/metrics.ts` | `absenceReason`; `BreakdownLabel`; `subLabelParams`; `secondaryValue`/`secondaryUnit` removed | mock-data-engineer |
| `src/data/fixtures/metrics.ts` | Sort tiles by §1.2's test; remove the no-store tiles; set `absenceReason`; rewrite five breakdowns' sub-labels; `barFraction` → share-of-max; `admin.rotaGapsByDay` → `bar: false` | mock-data-engineer |
| `src/screens/metrics/copy.ts` | §11's strings; seven keys retired | frontend-engineer |
| `src/components/metrics/MetricTile.tsx` | The absent-value branch; caption suppressed while absent; the `.sr-only` on the target branch (**V-8**) | frontend-engineer |
| `src/components/metrics/BreakdownList.tsx` | Secondary column removed; `--chart-series` at 4px; the label union and its bidi split (**V-4**); `<bdi>` on the sub-label (**V-9**, no longer latent) | frontend-engineer |
| `src/screens/metrics/MetricBoardScreen.tsx` | One two-column section grid for charts and breakdowns (**R5-8**) | frontend-engineer |
| `src/screens/metrics/board.test.ts` | Declaration-order cases deleted; a fixture-wide `(tone, severity)` uniqueness test added; severity cases stay `SYNTHETIC` | frontend-engineer |
| `src/components/ui/badge.tsx` | `rounded-sm` — **V-10**, once `docs/ref/rulings.md` R15 is corrected | owner of `src/components/ui/` |
| `src/lib/format/number.ts` | `formatRatio` and `formatPercent` still have no home — **B-5**, unchanged by this pass and still open | utilities-engineer |

---

## 17. Deviations

**None.** Every ruling above either applies an existing rule, corrects a rule of mine, or fills a
gap where no rule existed. Nothing here suspends a `DESIGN.md` MUST, nothing needs a §6.2 entry
and nothing needs a signature.

Three of the eight are corrections to rules I wrote, and they are named as such rather than
softened: **R5-3** (declaration order was a coin flip with a stable seed), **R5-4** (I mistook
two instances for a definition, and the 60-character budget was a guess), **R5-6** (I cited
`--chart-fill` for a mark without asking what a bar with no line above it is). **R5-5** replaces
§4.1's `secondaryValue` slot, which was mine too.

---

## 18. Addendum — the spec pass and the build pass, and two defects of my own

**§14's Q-D16 count and §1.2's *"for free"* claim were wrong and are corrected in place**, with the
retraction left visible rather than tidied away. This section rules the findings the spec pass and
the build pass raised — **F-14**, **F-15**, the non-monotonic bar, the suppressed gate, the fourth
city state — answers the layout consequence handed back, and records what I accept from
`specs/05-metrics-content.md` §21.3.

### 18.1 R5-9 · F-14 — a breakdown's trustworthiness caveat gets its own slot

**AC-674:** *when uncoded contacts exceeds its ceiling, the contact-reasons breakdown states that
its ranking is incomplete.* The spec is right that R5-4 did not close this and right that my own
AC-719 replacement filed it under *"a caveat attached to a tile"* when it attaches to a breakdown.
Two objects, two strings, and I wrote them as one.

**Neither existing slot can take it, and both reasons are the spec's.** The caption is a tile slot
and **R5-1 suppresses it exactly when the tile's value is absent** — so the one caveat that must
render while a number is missing sits on the one slot that switches off then. And a banner is
page-scoped, capped at one per board by R10, and Support's is spoken for by the SOS critical.

> **R4-4 §4.1 gains one slot: the caveat line.**
>
> ⚠ **The two fields below are WITHDRAWN — §20.2 replaces them with one `caveat` object
> carrying a `gatedBy` metric key.** The slot, the position, the wrap rule and the copy in this
> section are unchanged; only the shape of the field is.
>
> ```ts
> MetricBreakdown {
>   …,
>   caveatKey:    string | null                            // WITHDRAWN — §20.2
>   caveatParams: Record<string, string | number> | null   // WITHDRAWN — §20.2
> }
> ```
>
> **A caveat states a reason the ranking below it may not be trusted, and nothing else.** It is
> **conditional** — it renders only while its condition holds, and a caveat that is always true is
> a property of the list and belongs in the heading. One sentence, so it takes a period (R6).
> `--text-xs` / `--ev-text-2`, no icon, no tone, no link, no action — R7 owns statuses and this is
> not one.

**It sits directly under the heading, above the first row, and the position is the ruling.**
`05-metrics-content.md` §11.1 tile 6 says the uncoded tile *"gates the breakdown below it: if a
tenth of contacts are uncoded, the reason-code ranking is not trustworthy and no product fix
should be prioritised from it."* **A gate that appears after the thing it gates is not a gate.** A
reader who scans five rows and forms a conclusion before reaching a footer has already been
misled, which is the whole failure AC-674 exists to prevent.

**It wraps; it does not truncate.** The opposite of the caption rule, deliberately: a caption sits
in a grid cell read across, where a variable height breaks the row; a caveat sits in a card body
where nothing is read across it. **A truncated caveat is worse than no caveat**, because the half
that survives still looks authoritative.

```
┌─ Top 5 contact reasons, per 1,000 trips ───────────────┐
│  12% of contacts are uncoded, so this ranking is       │  ← caveat, conditional
│  incomplete.                                           │
│  ────────────────────────────────────────────────────  │
│  Vehicle condition                              8.2    │
│  Fleet · tier 1                                        │
│  …                                                     │
│  Showing the top 5 of 14 contact reasons.              │  ← cut-off, AC-696
└────────────────────────────────────────────────────────┘
```

**Copy, final.** One key, one parameter, formatted before interpolation (AC-713):

| Key | English | Renders |
|---|---|---|
| `breakdown.caveat.uncodedRanking` | `{share} of contacts are uncoded, so this ranking is incomplete.` | `12% of contacts are uncoded, so this ranking is incomplete.` |

`uncoded` rather than a word about failure — AC-718's discipline, and it is the product's own
term: the tile is `Uncoded contacts` and the field is `uncodedCeilingPct`.

> ⚠ **This guard is SUPERSEDED by §20.1 and §20.2.** It was written the way §4.2 was — in prose,
> against a type that could not enforce it — which is the drift this document spent §4 diagnosing.
> It is now a set of prohibitions plus a `gatedBy` pointer that cannot be omitted.

**Guard, so this does not become the slop field §4.2 nearly was.** A caveat exists only where a
spec criterion names the condition that raises it and the threshold that clears it. AC-674 does
both. **A caveat with no stated condition is a disclaimer, and a disclaimer on a ranking is a sign
the ranking should not ship.**

**And it is conditional on the condition being computable** — see §18.6, which is where this
ruling meets R5-1 and the two are reconciled.

### 18.2 R5-10 · The tile count is chosen to fit the grid, not the grid to fit the count

`specs/05-metrics-content.md` §21.4 hands back a consequence of §1.2 and is right to: applying
§11.2 takes Admin to four tiles, which is `4` at ≥1344 and **`3 + 1` at 1280** — **V-6**'s lone
trailing tile arriving at the viewport **D2** guarantees, on a board that just got shorter. My
*"removes a chunk of V-6 for free"* was true at one width and false at the other, and is retracted
in §1.2.

**I considered two layout answers and rejected both.**

- **Balance the rows** — 4 tiles as `2 + 2` in a three-column grid. That leaves *two* trailing gaps
  instead of one. Stretching the tiles to fill instead gives a board whose tiles are two different
  widths, which breaks the down-column digit scan **R4** exists for and breaks D7 §4.9's *"one
  object read across"*.
- **Choose a column count that divides** — 4 tiles as two columns at 1280. That renders a four-tile
  board with **wider** tiles at the narrow viewport than at the wide one, which is incoherent the
  moment an operator resizes.

Both trade the defect for a worse one. So the grid does not bend:

> ⚠ **CORRECTED — §24. The `n mod 4 ≠ 1` clause never binds, and the set below is narrower than
> the grid requires.** `MetricTileRow` takes four columns **only when four divides the count
> exactly**, so a four-column row is never ragged; below `--ev-bp-wide` it is always three
> columns. **Clean at both widths ⇔ `n mod 3 ≠ 1`**, and the permitted set is **2, 3, 5, 6, 8, 9,
> 11, 12** — everything but 1, 4, 7 and 10. **5 and 9 are clean and the text below wrongly
> forbids them**, which cost Admin the option of reaching a clean count by gaining one tile
> instead of two.
>
> **R5-10.** A board renders **`n` tiles where `n mod 3 ≠ 1`** — no trailing row of one at either
> sanctioned width. A lone tile reads as *the page ran out* whatever it says.
>
> ~~A board renders a number of tiles that leaves no trailing row of one at either sanctioned
> width: `n mod 4 ≠ 1` and `n mod 3 ≠ 1`. In the range a board actually occupies that is 2, 3, 6
> or 8. Every board in the product should be six or eight. 4, 5, 7, 9 and 10 all leave a lone tile
> at one of the two widths.~~

**This turns Q-D17 from taste into arithmetic**, which is the point of writing it down: Management ›
Overview renders **six**, because seven is not a permitted count — not because I prefer six. **And
it gives Admin's four a consequence the owner must price**: four is not permitted either, so Admin
either regains tiles that have stores or drops to three (**one** tile reaches a clean five — §24.3). That is a content decision and it
belongs with Q-D16 in the same sitting.

> ⚠ **FIVE boards fail this, not two and not three — §23.4** (this note first said three).
> Management › Overview, Growth and Zones all render **seven**, ragged at **1440 as well as
> 1280**; Performance and Admin render four. **They resolve to three decisions, not five** —
> the census principle settles Overview and Growth together (**Q-D18**), Q-107 settles
> Performance, and Zones and Admin are genuine per-board calls.
>
> ⚠ **Three boards fail this, not two — §21.1.** `Management › Performance` is **four** tiles and
> renders `3 + 1` at 1280 exactly as Admin does. It is not a third instance of the same question:
> its count is **downstream of Q-107**, and one branch of that answer makes Performance three tiles
> and permitted at no further cost. All three belong in one owner sitting.

**A board of one tile is not a grid problem.** R4-11 §11.2 already says a sub-tab whose whole
rendered content is one tile is a page an operator opens once. A board of zero is R8's first kind.

### 18.3 R5-11 · F-15 — a breakdown or a chart whose measure has no store

§11.2 rules on tiles and is silent on the two other things that can occupy the same position. The
fixture has already had to decide it by analogy, and **AC-687** decided one instance the other way
— *the accounts failing the integrity scan do not render at all.* That instance changes here.

**The asymmetry is real and it decides the case: a tile has no body, and a card does.**

A tile's entire content is its number. There is nowhere to put a sentence without inventing
geometry, and an em dash cannot be made honest — which is exactly why §11.2 deletes the tile. **A
breakdown card and a chart card each have a heading and a body**, and the heading already names the
measure truthfully whether or not the data exists. So the body can carry the truth, and there is no
reason to throw the heading away with it.

> ⚠ **R5-11 shipped without the field that makes it buildable. §19.1 adds it** —
> `awaitingStore: AwaitedStore | null` on `MetricBreakdown` and `TimeSeries`, with the component
> contract and the two invariants written out. Read §19.1 before building this.
>
> **R5-11.** A **breakdown** or a **chart** whose measure has no store **renders, keeps its title,
> and carries one grey sentence in its body: `Nothing is recorded here yet.`** No illustration, no
> heading of its own, no action — R8's second kind of empty.
>
> **Three absences, three sentences, and conflating any two of them is the V-2 defect in a new
> slot:**
>
> | Situation | Sentence |
> |---|---|
> | We ranked; this window had nothing to rank | `Nothing to rank for this period.` |
> | We queried; this date range returned nothing | `There was no data found for this date range.` |
> | **Nothing is captured, so no ranking or query is possible** | **`Nothing is recorded here yet.`** |
>
> Byte-identical wherever it renders, on the same footing as AC-714's no-data sentence.

**Why this and not deletion, given §11.2 deletes the tile.** Deleting the card deletes the heading,
and the heading is the only thing on the screen that names what is missing. *"The most valuable
list in the product"* becoming invisible is how a gap stops being asked about — and §1.5 is
explicit that what answers the owner's complaint is a **contact log**, not wording. A card reading
`Top 5 contact reasons, per 1,000 trips` over `Nothing is recorded here yet.` is the sentence that
gets the log built. An absent card is not.

**Guard, the same one as §18.1.** A card may render under R5-11 **only where a spec section names
the measure and the store it waits on** (AC-726's table). **No card exists for a measure nobody has
specified** — otherwise this becomes a licence to pad a board with placeholder cards, which is the
opposite of everything in this document.

**Copy, final:**

| Key | English |
|---|---|
| `overview.notRecorded` | `Nothing is recorded here yet.` |

**Routing, not a ruling.** **AC-687**'s second clause, and **AC-676** / **AC-677**'s treatment of
Support's chart and list, now resolve differently. That is product-owner's text and I do not edit
it; the replacement clause is *"… renders with its title and the not-recorded sentence, and §12.4
names the store it waits on."*

### 18.4 R5-12 · A bar is legal only where the rows are ordered by the measure the bar draws

`operations.backlogByQueue` renders bars of **1, 0.857, 0.571, 0.714, 0.714** — down, down, up,
flat. The list sorts **breached-first**, by design; the bar draws the **open** count. Two measures,
one card, and the reader is shown a ranking that contradicts itself.

> ⚠ **§25.6 adds the sharper half: `barIsLegal` returns `true` for this list.** All three of
> R5-6's conditions hold, so the bar was **legal by scale and illegal by ordering**. **A check
> that returns true is more reassuring than a colour nobody can see** — the token hid the defect
> from the eye, the predicate hid it from review, and the predicate was the more effective of the
> two. **General form: when a rule gains a condition, every prior pass of its predicate becomes
> uninformative, not confirmatory.**

**This is the ruling working, not failing, and it is worth saying so before ruling it.** Nothing
about that list changed. What changed is that at `--chart-fill`'s **1.142 : 1** nobody could see
it, and at `--chart-series`' **4.574 : 1** everyone will. **A token so faint that it concealed a
data defect for two build passes is a second, independent reason it was the wrong token** — I
argued in R5-6 that the band failed to do the bar's job, and the sharper version is that it failed
loudly enough to hide someone else's.

**The build was right to implement R5-6 as written and report the collision, and right not to sort
by value to make the bars behave.** Re-sorting would have thrown away the ordering the queue exists
to provide in order to rescue a decoration. That is the tail wagging the dog, and it is the kind of
fix that looks like a fix in a screenshot.

> **R4-4 §4.1, the bar clause, gains its third condition.** A bar is legal only when every row
> shares one unit and one denominator, **and `max > min`** (R5-6), **and the rows are ordered by
> the measure the bar draws.** Where a list is ordered by anything else — urgency, severity,
> alphabetical, a workflow's own priority — **it carries no bar.**

**So `operations.backlogByQueue` loses its bar**, and it loses nothing with it. The fixture's own
comment says what that list is: *"a routing table rather than a list of records — it tells an
operator which screen to open."* **Nobody compares magnitudes on a routing table; they pick the
next screen.** Dropping the bar also drops the row from `--ev-row-h-media` to `--ev-row-h`, which
is 20px a row back on a five-row card.

Checked against the other lists so the rule is not written for one case: `risk.highValueRidersAtRisk`
sorts by lifetime value descending and bars lifetime value — monotonic, legal.
`admin.rotaGapsByDay` is flat, so `max === min` already removed its bar. **`backlogByQueue` is the
only list the new clause touches, and it is the only list in the product ordered by something other
than its own number.**

**The general principle, because it will come up again outside these boards:** a bar is a
*redundant* encoding of the number beside it, and redundancy is only redundant if it agrees. **Two
encodings of two different measures in one row is not redundancy, it is a contradiction**, and the
reader has no way to know which one to believe.

### 18.5 The three tiles the build kept, and a better argument for one it removed

`integrityOrphans` was removed under §11.2 on the grounds in its own fixture comment — *the scan
reads a payments ledger this layer does not hold.* **That comment is now stale**: `fixtures/ledger.ts`
exists with 115 postings, and the trips leg alone yields three orphans.

**The removal stands and the grounds change, and the new grounds are better than mine.** The
measure as specified — accounts whose stored lifetime totals reconcile to nothing inside the data
window — needs payments **keyed by entity** plus a data window, and neither exists. What the ledger
can produce is a narrower reconciliation that would render a number under the same label. **Half a
reconciliation is a different, smaller measure wearing the same name**, and that is worse than an
absence, because an absence is not quotable and a wrong number is.

> **R4-11 §11.2's test, refined.** *"Has no store"* does not mean *"no rows exist anywhere"*. It
> means: **can this measure, as specified, be computed from what exists?** A store that yields *a*
> number under a narrower definition does not satisfy the measure — it produces a different measure
> under the same label, and the label is what gets quoted.

This cuts both ways and both are intended. It removes a tile that could be made to render, and it
forbids the opposite failure: **restoring a removed tile by computing an approximation of it**. A
tile comes back when its measure is computable, not when something adjacent is.

### 18.6 The suppressed gate — R5-1 §1.3 and AC-674 reconciled

The build is right that the two rules are in direct tension and right that nothing is broken today.
Closing it rather than leaving it latent:

`uncodedContactShare`'s caption is `The ceiling is 3%.` — a **threshold for a number that does not
exist**. Suppressing it while the value is absent is correct and R5-1 §1.3 stands unamended: a
threshold without a reading is not a reading aid, it is furniture.

**What is load-bearing was never the caption.** It is the *gate on the breakdown*, and **R5-9 has
just given that its own slot on the breakdown card**, where it does not depend on the tile
rendering anything at all. The two rules were only in tension because one string was doing two
jobs — the same shape as B-3, one section earlier.

**And the gate is itself conditional on being computable, which closes it completely.** The caveat
fires when uncoded contacts *exceeds* the ceiling; with no contacts logged, that comparison has no
answer, so the caveat does not fire either. What renders instead is the breakdown's own **R5-11**
sentence, `Nothing is recorded here yet.` — which is the honest statement and the right one:

> **We cannot tell you this ranking is untrustworthy, because we cannot tell you anything.**

So the order of precedence on a breakdown card, stated once:
**not-recorded (R5-11) → caveat (R5-9) → rows → cut-off.** A card in the not-recorded state
renders no caveat and no cut-off, because both are claims about a ranking that did not happen.

### 18.7 `citiesHealth`'s fourth state — a live city with no reading. **Give it a string.**

The build's instinct was right and its conclusion reproduces the defect this whole document is
about. Rendering **no sub-label** leaves a blank in a column where every other row carries a
phrase, and **a blank is exactly what R5-1 rules against**: the reader cannot tell *nothing to
say* from *something we forgot*.

Refusing to fabricate a zero rate was correct — a live city with no zones tracked has no failure
rate, and `0%` would claim a perfect one. Refusing to call it `Not launched` was correct — it is
launched.

> **Reinstate `breakdown.sub.cityLive` = `Live`** for exactly this state. §11.4 retired it on the
> assumption that every live city carries a rate; it does not, and the retirement was mine.

The sub-label column then reads as a set, which is what makes the empty one legible:

```
Riyadh      6    Live · 45% of requests unserved
Jeddah      2    Live
Dammam      0    Not launched
Makkah      0    Not launched
```

`Live` on its own says *launched, no reading yet* by contrast with the row above it, and it says it
without a number nobody has. **Unreachable today and reachable the day a second city launches
before its zones are tracked** — which is a state the product will pass through, not a hypothetical.

### 18.8 The two knowing breaches — both correct, and the order they are in is the point

- **The `BreakdownLabel` union ships in technical breach of AC-713.** That is the right order:
  ruling, then spec, then build. The carve-out is drafted (§18.9's refinement) and is
  product-owner's to apply; the build recording the breach in code rather than waiting is what
  keeps the breach from becoming invisible. **A breach that is written down is a schedule item; one
  that is not is a defect.**
- **`breakdown.row.entity` was retired with no fallback.** Endorsed, and the reasoning is better
  than a compatibility shim: *a fallback is how the fig leaf grows back.* A pass-through key that
  still resolves is a pass-through key someone will use again, and the thing R5-7 deleted was
  precisely a mechanism that satisfied every check while meaning nothing.
- **AC-663's third count** is §21.3's **C-6**, accepted below. The unclaimed count belongs on the
  `Unclaimed work` tile (AC-659) and the build put it there.

### 18.9 What I accept from `specs/05-metrics-content.md` §21.3, and the one thing I would change

**All seven contradictions are accepted, and five are defects in my replacement texts rather than
in the spec.** Recording the ratio plainly, because it is the useful part: I routed five criteria
and four of the five needed reshaping before they were safe to apply.

| | | Note |
|---|---|---|
| **C-1** AC-605 and AC-601 claim the same line | accepted | **Mine.** §10 draws states B and C with a value and D without — the precondition *"a tile that has a value and cannot state a delta"* was drawn and not written. **A criterion that has to be inferred from a wireframe is a criterion that will be read wrong.** |
| **C-2** AC-697 is void without an AC-713 carve-out | accepted | **Mine, and the load-bearing one.** AC-713 is demonstrably what minted the `{name}` fig leaf; amending AC-697 alone puts it back within a sprint. One refinement below. |
| **C-3** AC-668 / AC-679 count tiles §11.2 deletes | accepted | I routed AC-612 for exactly this shape and left the two boards where the deletions land. |
| **C-4** AC-683 asserts the delta R5-2 exists to say is unstatable | accepted | **Mine.** I rewrote AC-605 around this tile as its worked example and did not check what else asserted it. |
| **C-5** AC-673 requires the target phrase unconditionally | accepted | **Mine.** The spec's amendment matches R5-1 §1.3 exactly. See §18.6. |
| **C-6** AC-663 requires three counts; R5-5 leaves room for two | accepted | **Mine.** §11.4 shipped the two-count sub-label and dropped the unclaimed count without naming the criterion that required it. AC-659's tile is the right rehome. |
| **C-7** AC-623 requires an em dash with no reason | accepted | `not-computable` is the correct sort — the `drivers` store exists and the mean is over an empty set. |
| **AC-715**'s accidental exemption | accepted | *"An accidental boundary is one an engineer talks themselves across"* is the better statement of the rule. |
| **AC-695**'s withdrawn carrier | accepted | Zones survives; Operations rehomes to AC-659. |
| **AC-687**'s dimension | accepted | **Seven rows by day, ratified.** A slot-level list where every row is `0` ranks alphabetically, and a list that ranks on nothing is a table's job. I ratified the seven-row shape by name in R5-6 without noticing §12.3 asked for five. Its **second** clause changes under R5-11. |

**The one refinement, and it is on C-2's observable rather than on its carve-out.**

AC-697 now asserts that switching to Arabic *"leaves every entity name character-for-character
unchanged"*. **That is right for a person and wrong for a city.** `Riyadh` has an Arabic name;
`DB.reasonCodes` already carries an English and an Arabic label per code. A record with a localised
name field renders `الرياض` under `dir="rtl"` and would fail the observable **while being correctly
built** — a criterion that fails good code is worse than one that passes bad code, because it gets
suppressed and then ignored.

The carve-out itself is sound: *"never routed through the dictionary in either language"* is the
right test, because a localised record name comes from the **record**, not from `copy.ts`. The
observable needs one clause:

> … and leaves every entity name that has no localised field on its own record — a person's name —
> character-for-character unchanged. **An entity whose record carries a localised name renders that
> name, and is still not routed through the copy dictionary.**

**Design consequence, so it is not discovered at translation time:** an entity label is
`{ kind: 'text' }` (R5-7) in **both** languages, and which text it holds is the **client's** choice
from the record, not the component's. The component never sees two names. That keeps the union at
two members and keeps `<bdi>` correct in both cases — an Arabic city name in an Arabic console is a
strong-RTL run and isolates to RTL, which is what `<bdi>` does unaided.

### 18.10 What §18 changes in §9, §11 and §16

- **§9.1's anatomy table** gains a **Caveat** row (R5-9) between Heading and Label, and its bar row
  gains R5-12's third condition.
- **§11** gains **§11.6** — `breakdown.caveat.uncodedRanking`, `overview.notRecorded`, and
  `breakdown.sub.cityLive` reinstated.
- **§16** gains: `MetricBreakdown.caveatKey` / `caveatParams` and `bar: false` on
  `operations.backlogByQueue` (mock-data-engineer); the caveat line, the not-recorded sentence on
  both card types, and the card-state precedence of §18.6 (frontend-engineer); the permitted tile
  count is a **content** obligation and lands on product-owner with Q-D16 and Q-D17.

### 18.11 §11.6 — the copy §18 adds

| Key | English |
|---|---|
| `breakdown.caveat.uncodedRanking` | `{share} of contacts are uncoded, so this ranking is incomplete.` |
| `overview.notRecorded` | `Nothing is recorded here yet.` |
| `breakdown.sub.cityLive` | `Live` |

---

## 19. R5-11 completed — the field it needed, and two measured results

**R5-11 shipped without the field it requires, and the build was right to refuse to infer one.**
I wrote a rule whose whole point is that three absences must be distinguishable, and then gave the
component two states to distinguish three things with. The inference route the build declined —
`rowsTotal === 0` — is precisely the wrong one: **`rowsTotal` counts rankable rows and is not a
claim about a store**, and `support.contactReasons` has zero of both today for two different
reasons depending on which ruling you read. Guessing there would have been the V-2 defect committed
by the document that names it.

### 19.1 R5-11a · `awaitingStore`, and it is a named store rather than a boolean

**I take the coordinator's recommendation and go one step further than it.**

A boolean makes the guard in §18.3 — *"a card may render under R5-11 only where a spec section
names the measure and the store it waits on"* — a thing a reviewer has to remember to check. A
named store makes it structural: **the field cannot be set without naming what it waits on.** That
is the AC-567 move and it is the same one I endorsed for `breakdown.row.entity` shipping with no
fallback.

**The step further: it is a closed union, not a free `string`.** A `string` can be `''`, `'TODO'`
or `'tbd'` — each satisfies the type, names nothing, and passes every check. **That is exactly
`breakdown.row.entity`'s failure mode**, which is the thing R5-7 exists to delete, and a rule that
re-creates it two sections later has learnt nothing. A union member is a deliberate act with a
name, and it is the contract's own idiom — `MetricUnit`, `NoComparisonReason`, `ValueAbsenceReason`
are all closed for the same reason.

> ```ts
> /**
>  * A store the product does not have yet. Named, so a card cannot claim to be
>  * awaiting one without saying which — R5-11's guard, enforced by the type
>  * rather than by a reviewer remembering to apply it.
>  *
>  * A third member is added by a spec section that names the measure and the
>  * store together (AC-726). It is never added by a fixture.
>  */
> export type AwaitedStore =
>   | 'contact-log'         // one row per contact, with a reason code
>   | 'payments-by-entity'  // postings keyed by account, plus a data window
>
> MetricBreakdown { …, awaitingStore: AwaitedStore | null }   // NEW
> TimeSeries     { …, awaitingStore: AwaitedStore | null }    // NEW
> ```
>
> **Same field name, same type, on both.** The component logic is then identical on the two card
> types and a reader learns one concept, not two.

**The store name does not render to an operator, and that is a ruling rather than an omission.**
`payments-by-entity` is an engineering fact in an operator's register; nobody can act on it; and
R5-11's sentence is byte-identical wherever it renders, on AC-714's footing, which interpolation
would break. **The copy stays one sentence.**

**So it needs a consumer that is not the screen, or it decays into decoration. It has three:**

1. **It is the state discriminant.** The component branches on it, so it cannot be dropped without
   the card losing a state.
2. **AC-726's *deliberately not here* table is checked against it.** Every card carrying an
   `awaitingStore` appears in its board's table with that store named — which is the obligation
   §18.3's guard stated in prose and could not enforce.
3. **An orphaned member — one no card uses and no table names — must be a failure, not a
   comment.** ⚠ **No such check exists in any tree. Routed as a criterion (§23.5), not
   described as though it were in place** — the original wording here was a present-tense
   claim about a test nobody had written, which is §23.1's defect.

#### The component contract, so this is buildable without a second round

**Breakdown card**, in order — this is §18.6's precedence with the missing arm filled in:

```
awaitingStore !== null   → title + `Nothing is recorded here yet.`
                           no caveat, no rows, no cut-off
rows.length === 0        → title + `Nothing to rank for this period.`
                           no caveat, no cut-off
otherwise                → title + [caveat] + rows + [cut-off]
```

**Chart card:**

```
awaitingStore !== null           → title + `Nothing is recorded here yet.`
current.points.length === 0      → title + `There was no data found for this date range.`
every current point is 0         → flat line + the all-zero sentence          (AC-611)
otherwise                        → the chart
```

**Two invariants, both assertable in the data layer:**

- **`awaitingStore !== null` implies the card is empty** — no rows on a breakdown, no points on a
  series. A card cannot both await a store and have content out of it.
- **The converse does not hold and must not be asserted.** Empty with `awaitingStore === null` is
  the legitimate *nothing to rank / nothing in this range* case, and collapsing the two is the
  defect this field exists to prevent.

**`isBoardEmpty` — a card awaiting a store does not count as content.** Same reasoning as R4-4
§4.3's *"a notice deliberately does not count"*: a board whose every card is awaiting a store has
nothing on it, and rendering the same sentence four times is worse than rendering R8's first kind
once (AC-699). Neither Support nor Admin reaches that state — both keep computable tiles — but the
rule has to be right before a board does.

**A note on why this is not `Metric.absenceReason`'s shape.** The tile's field carries a *category*
(`not-captured` / `not-computable`) because it drives two different sentences. The card's carries a
*store* because it drives one sentence and a provenance obligation. Different jobs, so different
shapes, deliberately. Where a tile and a card on one board wait on the same thing — Support's
`contactsPerThousandTrips` and its contact-reasons list both wait on the contact log — **AC-726's
table is where that shows**, and it is the only place it needs to.

### 19.2 R5-10 does not close the 1280 raggedness, and never could

**Confirmed, and worth stating in the ruling rather than leaving to be inferred.** R5-10's
arithmetic is about the **tile grid**; R5-8's section grid is below it and touches neither. Admin
renders four tiles as `4` at 1440 and **`3 + 1` at 1280**, and `MetricTileRow` is doing exactly
what it was told.

**R5-10 defines what a permitted count is. It does not choose one** — that is Q-D17, Admin's count
and Performance's (§21.1), all three on product-owner. So **Q-D17's arithmetic is load-bearing rather than tidy**: until a
count is chosen, V-6 stands at the viewport D2 guarantees, on a board that R5-1 just made shorter.
That is the honest sequence and §18.2 should be read with it: the ruling makes the answer
checkable; it does not supply the answer.

### 19.3 V-3 is closed at half-width, with its residual named

Measured: the widest breakdown card is **448px at 1280 and 512px at 1440**, and
`management/zones`' worst label-to-value gap went **958px → 423px**. V-3 is closed.

**The residual is real and I am not going to rule it away.** 423px is still four times Risk's
~140px, and the reference's third-width equivalent is ~170px. **The gap is a function of label
length, not of card width** — Risk reads well at the same card width because its labels are
21-character names and its values are money, while Zones has `Riyadh` against `6`. No rule keyed to
card width can fix both, and I considered and rejected the two that try:

- **Thirds instead of halves** — helps Zones, and reintroduces head-truncation of long Latin names
  under `dir="rtl"` on Risk and Performance, which is **V-4**, the defect that survives the Arabic
  dictionary landing. Trading a legibility annoyance for a data-destroying one.
- **A bar on `citiesHealth` to bridge it** — legal under R5-6 and R5-12 (one unit, one denominator,
  `max > min`, ordered by the measure), and useless here: Riyadh is 6 and the other three are 0, so
  the bar bridges the gap on exactly one of four rows and costs 20px on all four.

**So: no further rule.** V-3's defect was that the eye had to carry a name *across the page*; 423px
is inside one card, in one glance, above a sub-label that anchors the row's inline-start. **It
reopens if a list ever pairs short labels and short values with ten or more rows** — Zones has
four. That condition is the thing to watch, not the pixel count.

### 19.4 What §19 changes in §16

- `AwaitedStore`; `awaitingStore` on `MetricBreakdown` and `TimeSeries`; the two invariants;
  `awaitingStore` excluded from `isBoardEmpty` — **mock-data-engineer** (type) and
  **frontend-engineer** (`BreakdownList`, `ChartCard`, `MetricBoardScreen`).
- Set on three cards today: `support.contactReasons` and the Support contacts series →
  `'contact-log'`; Admin's integrity-scan breakdown → `'payments-by-entity'`.
- AC-726 gains the check that every card carrying an `awaitingStore` is named in its board's
  *deliberately not here* table with that store — **product-owner**.

---

## 20. R5-9 corrected — §18.1's guard was written the way §4.2 was, and that is the whole objection

**The build is right, the precedent is mine, and I concede it without qualification.**

I spent §4 of this document explaining that §4.2 drifted because I defined the caption by **its two
current contents** rather than by **what it forbids** — and that every new case then looks like a
reasonable extension of the last one. Twelve sections later I wrote §18.1's guard as *"a caveat
exists only where a spec criterion names the condition that raises it and the threshold that clears
it"*, put it in prose, and specified a type — `caveatKey: string | null` — that renders whatever key
it is handed. **A rule stated once in a document nobody opens at fixture-writing time is not a
guard; it is a hope.** The build's *"§4.2 became a slop field the same way"* is exactly right.

**I take options 1 and 2 together, and state 3's residue explicitly rather than leaving it
implied.** The three are not alternatives — prohibitions catch what a type cannot, the type catches
what prose cannot, and what neither catches has to be named or it becomes a false ✓.

### 20.1 The prohibitions — §18.1's scope, rewritten in §4.2's corrected form

> **A caveat states a reason the ranking below it may not be trusted.** It never states a status
> (R7 owns those), never states a value or a delta, never carries an action, never carries a link,
> never restates the cut-off, and **never states a permanent property of the list** — a permanent
> property is what the heading is for.
>
> **And it never states a general uncertainty. A caveat that cannot name the number that raises it
> and the number that clears it is a disclaimer** — and a disclaimer on a ranking is a sign the
> ranking should not ship.

| | |
|---|---|
| Legal | `12% of contacts are uncoded, so this ranking is incomplete.` |
| Illegal | `Data may be approximate.` — nothing raises it, nothing clears it. A disclaimer. |
| Illegal | `Excludes cancelled trips.` — permanent. That is the heading. |
| Illegal | `Needs attention.` — a status, and R7 owns those. |
| Illegal | `Review the contact centre →` — an action. A card is not a banner. |
| Illegal | `Contacts are up 8% on last week.` — a delta, and a delta belongs on the tile. |

A fixture author can now tell whether a new caveat is legal **without finding a criterion**, which
is the test §18.1's version failed.

### 20.2 The structure — a caveat may only exist for a condition a tile on the same board shows

**The second half of the fix turns out not to be new discipline at all. It is R4-4 §4.3's test, one
level down.**

> A notice may only exist for a condition the board already shows a number for. A banner saying
> something no tile on the page can corroborate is a banner the operator cannot act on.

A caveat is that sentence with *banner* replaced by *caveat* and *page* by *card*.
`05-metrics-content.md` §11.1 tile 6 already says so in the product's own words — the uncoded tile
**gates** the breakdown below it. So a caveat does not need a condition field and a threshold
field. **It needs a pointer to the tile that already carries both**, and I missed that because I was
designing a slot instead of looking for the number behind it.

> **R5-9, corrected. `caveatKey` / `caveatParams` are withdrawn and replaced by one object:**
>
> ```ts
> MetricBreakdown {
>   …,
>   caveat: {
>     key:     string
>     params:  Record<string, string | number> | null
>     /**
>      * The `Metric.key`, on THIS board, whose value raises this caveat.
>      * The condition and the threshold are that metric's own `value` and
>      * `comparison`. They are not restated here, because a second copy of a
>      * threshold is a second thing to drift.
>      */
>     gatedBy: string
>   } | null
> }
> ```
>
> **The three fields exist only together.** A caveat cannot be written without naming the number
> behind it, which is §18.1's guard enforced by construction rather than by memory.

**`gatedBy` is a free string and `awaitingStore` is a closed union, and the difference is not
inconsistency.** A store name has nothing to check it against, so a free string there can be empty
or a placeholder and still pass — which is `breakdown.row.entity`'s failure mode exactly. A metric
key has **referential integrity**: it either resolves to a metric on the same board or it does not,
and that is mechanical. **Where a check exists, use it; where none does, close the set.**

**This closes the under-specification flagged alongside it.** The condition and the threshold no
longer live only in prose. `support.overview.uncodedContactShare` carries `value` and
`comparison: { kind: 'target', value: 3 }` in the fixture today — the ceiling, and the reading it is
measured against. **§18.6 stops being an argument and becomes arithmetic:**

```
gate = board.metrics.find(m => m.key === breakdown.caveat.gatedBy)
gate.value === null   →   the condition has no answer   →   caveat is null
```

That is why the caveat does not fire on Support today, and it is now derivable from the data rather
than asserted in a paragraph.

**The component never evaluates the condition.** The data layer decides whether the caveat is
raised; the component renders what it is handed. Same division as `selectNotice`, for the same
reason: a rendering rule that re-derives a threshold is a second place for the threshold to be
wrong.

**What a test can assert, stated as what it checks rather than as a promise:** for every breakdown
carrying a caveat, (a) `gatedBy` resolves to a metric on the same board, and (b) that metric's
`value` is non-null. Both are mechanical, and both catch the real failure modes — a dangling
pointer, and a caveat rendering on a board that can compute nothing.

### 20.3 What is still a review obligation, named so nobody mistakes it for an enforced one

**The type cannot check that the caveat's sentence describes the condition its gating metric
raises.** A fixture can point `gatedBy` at the uncoded tile and write anything. That residue is
real, it is small, and it is **a fixture-review obligation, not a code one**.

Stated plainly, because the alternative is the false-✓ failure: an unenforced guard that reads like
an enforced one is the line a reviewer trusts instead of checking. **Everything above this paragraph
is enforced. This paragraph is not.**

### 20.4 The cost, and why now is the cheapest it will ever be

Two fields become one object of three. `caveatKey` and `caveatParams` are not yet on
`MetricBreakdown` in `types/metrics.ts`, and **there is exactly one caveat in the product** — so
this is a type edit, one fixture entry and one component read, not a migration.

**The second caveat is the one that establishes the pattern, and it does not exist yet.** That is
the whole argument for doing it in this pass: §4.2 was cheap to fix on the day it was written too,
and it was not fixed until nineteen tiles carried one.

### 20.5 The position test — endorsed, and worth generalising

The build covered R5-9 with a test asserting the caveat's **position** rather than its presence,
because *"a gate that appears after the thing it gates is not a gate"* is the ruling and a presence
check would pass with the caveat sitting in the footer.

**That is the correct reading, and a better test than I would have specified.** Worth stating as a
practice, because it generalises past this slot:

> **Where a ruling's reason is a position, an ordering or a relationship, assert that — not the
> presence of the thing.** A presence check on a rule about placement passes in exactly the case
> the rule exists to forbid.

### 20.6 What §20 changes in §16

- `MetricBreakdown.caveat` replaces `caveatKey` / `caveatParams` — **mock-data-engineer** (the type
  and the one fixture entry), **frontend-engineer** (one read in `BreakdownList`).
- The two assertions in §20.2 — **frontend-engineer**, alongside the existing position test.
- **§18.1's guard paragraph is superseded by §20.1 and §20.2.** The rest of §18.1 — the slot, the
  position, the wrap-rather-than-truncate rule and the copy — is unchanged.

---

## 21. Three boards fail R5-10, not two — and `avgRenewalRate` is a label problem before it is a caption one

### 21.1 Performance is the third board, and it is coupled to Q-107 rather than parallel to it

**Confirmed by count rather than accepted.** `grep -n "key: 'management.performance" src/data/fixtures/metrics.ts`
returns four tiles — `cancellationRate`, `avgRenewalRate`, `avgCaptainRating`, `tripsCompleted`
(the two further hits at `:1780` and `:1811` are chart series, in a different array). `4 mod 3 = 1`,
so Performance renders `3 + 1` at 1280 exactly as Admin does. **§18.2 named two boards and there
are three.** Corrected in place.

**And it belongs in the same sitting for a second reason, which is stronger than not asking the
owner twice.** The three boards are not three instances of one question:

| Board | Tiles | Fails R5-10 because | What resolves it |
|---|---:|---|---|
| Management › Overview | 6 or 7 | 7 fails | **Q-D17** — drop one, and 6 is permitted |
| Admin › Overview | 4 | 4 fails | **Q-D16** — nothing in Q-D16 fixes it; Admin must regain two tiles or drop to three |
| Management › Performance | 4 | 4 fails | **Q-107 fixes it for free on one branch** |

**Performance's count is downstream of Q-107, not beside it.** If the stored per-rider stat is not
the measure, `avgRenewalRate` leaves the board under §11.2 and Performance is **three** tiles —
`3 mod 4 = 3`, `3 mod 3 = 0`, permitted at both widths, no further decision needed. If it *is* the
measure, Performance is four and needs a fifth and sixth tile it does not have.

**So Q-107 is not only a measure question. It is also the cheapest available answer to one third of
V-6.** That is worth putting in front of the owner in those terms, because a definition question and
a layout question that resolve together are one decision, not two.

### 21.2 `avgRenewalRate` — I re-ran the count, and the relayed number was a **population** error

**The correction is accepted and the rule taken from it is right. I re-ran it rather than relaying,
and the command is here beside the number, which is the rule applied to itself:**

```
$ grep -o "renewalRatePercent: [^,]*" src/data/fixtures/riders.ts
  13 occurrences
$ … | grep -vc null
  8
  values: 100, 25, 93, 30, 91, 85, 44, 88   → sum 556, mean 69.5
```

**Eight of thirteen and 69.5 % reproduce exactly.** Two further things, and the first is the useful
one.

**I found where the `3` came from, and it is not wrong.** `fixtures/metrics.ts:445` says: *"of the
**47 active subscriptions, three** belong to a rider carrying a `renewalRatePercent`."* So **3** is
a count of **subscriptions** and **13** is a count of **riders**. Both source numbers are correct;
the sentence that joined them was not.

> **That is a sharper version of the lesson than "nobody re-ran it", and it is worth the ledger
> entry instead of the weaker one: a ratio whose numerator and denominator come from two different
> populations is wrong even when both numbers are right.** `3 of 13` is a subscription count over a
> rider count. **The report about a missing denominator contained a denominator defect of exactly
> the kind it was reporting** — which is the best possible argument that this class is worth a rule
> rather than more care.

> ⚠ **WITHDRAWN — §22.1. 63.3 % reproduces, and the reason I could not is that I was computing
> over the population I had.** That is this section's own defect, committed in this section, which
> is the third instance. The mean is arithmetically sound over six values; **the label
> *subscriber* on those six does not survive a check against `subscriptionIds`** — and there are
> **three** defensible bases, not two, spanning 62.0 to 69.5. §22.2 has the table.

~~I could not reproduce 63.3 % from this fixture and I am not repeating it. The two figures I can
derive over riders are 69.5 % (the eight with a reading) and 42.8 % (all thirteen, which nobody
should publish). Neither is 63.3, and a subscription-weighted mean needs the subscriptions fixture I
have not counted. Two defensible bases exist and they disagree — but the number should carry its
command before it is used again.~~

#### The ruling — the population belongs in the **label**, not only in the caption

AC-730 asks the tile to state its denominator. **Right in direction, one layer short.**

> **R5-13.** Where a tile's value is an **average of a stored per-record statistic**, the **label
> names the population** and the **caption names the base count**. A caption is read second and a
> label is read first: **a mean whose population appears only in its caption is quotable without
> it**, which is the failure R5-4's caption exists to prevent, arriving one line higher.

This is AC-715's own division — *a count and its label are separate* — applied to a mean. `Average
renewal rate` names no population, so any base the caption states is a base for a number the label
has already mis-titled.

**Copy, final, for the branch where the tile ships:**

| Key | Was | Is | ch |
|---|---|---|---:|
| `metric.management.performance.avgRenewalRate` | `Average renewal rate` | **`Average rider renewal rate`** | 26 |
| `caption.storedRiderStat` | `A mean of a stored rider statistic.` | **`A mean over {shown} of {total} riders.`** → `A mean over 8 of 13 riders.` | 27 |

The old caption states a **mechanism** — *"a stored rider statistic"* is a data-layer phrase in an
operator's register — and §4.2 permits a scope limit, a denominator or a valence. The replacement is
a denominator, which is squarely inside the rule. Note it renders only once the tile has a value:
R5-1 §1.3 suppresses a caption while the value is absent, so today's tile correctly shows neither.

**And the drilldown moves with the population.** `avgRenewalRate` currently points at
`/operations/subscriptions`. If the measure is a mean over **riders**, AC-607 — *following it lands
on a screen already filtered to the rows the tile counted* — makes that destination wrong, and it
becomes `/operations/people?view=riders`. A tile that averages riders and drills into subscriptions
is the population error again, in a route.

#### The finding I am not ruling, because it is a measure definition

**Naming the base makes the number honest about what it is. It cannot make it the renewal rate.**

`Rider.renewalRatePercent` is a **stored per-rider percentage** — legacy `stats.renewalRate`
(`types/rider.ts:83`). Each value is itself a ratio whose numerator and denominator were **discarded
at write time**. So:

- A mean of those percentages gives every rider equal weight regardless of how many renewals they
  have had. The `100` in that set is almost certainly a rider with a single opportunity, and it
  pulls the mean as hard as the `85`.
- *Total renewals ÷ total opportunities* — what "renewal rate" ordinarily means — **is not
  computable from this field at any denominator**, because the two numbers it needs are gone.

That is **L-4 / Q-107**, which the fixture already states in its own words: *"legacy averages a
per-rider stat string parsed with `parseInt`, not a renewal outcome measured over a period. Those
are different numbers and only one is a metric."* **It is the reason the label has to move and not
just the caption** — and the reason the owner's answer to Q-107 is a yes/no about *what the product
measures*, not a preference about wording.

> **Q-107, restated so it is answerable in one sitting with Q-D16 and Q-D17.**
>
> **Yes — the stored per-rider stat is the measure.** The tile ships as `Average rider renewal rate`
> over the riders that have one, captioned with its base, drilling into riders. Performance is four
> tiles and needs two more or a different shape (R5-10).
>
> **No — it is not.** The tile has no store for the measure its label names and leaves the board
> under §11.2. Performance is three tiles, which R5-10 permits at both widths, and Q-107 closes one
> third of V-6 at no cost.

**My recommendation: No.** A mean of eight stored rider percentages published under a label an
operator will read as the renewal rate is the plausible literal **Q-101** exists to forbid, and the
fixture reached the same conclusion independently before this ruling existed. **But it is a scope
call about what the product claims to measure, and that is the owner's.**

### 21.3 What §21 changes

- **§18.2** and **§19.2** say *two boards*; there are **three**. Corrected in place.
- `metric.management.performance.avgRenewalRate` and `caption.storedRiderStat` — **frontend-engineer**
  (`copy.ts`), on the branch where the tile ships.
- `avgRenewalRate`'s `drilldownRoute`, `sourceResource` and `absenceReason` — **mock-data-engineer**,
  on the same branch.
- **AC-730** gains the label clause (R5-13); **Q-107** is restated above as a yes/no with its layout
  consequence attached — **product-owner**.

---

## 22. The fourth population — and R5-14, which is what stops there being a fifth

**63.3 % reproduces. I withdraw *"could not reproduce"* from §21.2** — I was computing over the
population I had, which is the defect, committed by me, in the section describing it. That is the
third instance. **This section is the fourth**, and it is the one that turns the pattern into a
rule.

### 22.1 The six values are real. The label on them is not — checked, as asked

The caveat was well placed. Here is the check, with the command:

```
$ grep -n "id: 'RDR\|renewalRatePercent:\|subscriptionIds:" src/data/fixtures/riders.ts
```

| Rider | rate | `subscriptionIds` | in the 6-set? |
|---|---:|---|---|
| RDR-1041 | 100 | `[SUB-1041]` | yes |
| RDR-1075 | 25 | `[SUB-1075]` | yes |
| RDR-1080 | 93 | `[SUB-1060]` | yes |
| RDR-1052 | 30 | `[SUB-1052b]` | yes |
| RDR-1060 | 91 | **empty** | **no** |
| RDR-1090 | 85 | **empty** | **no** |
| RDR-4001 | 44 | **empty** | **yes** |
| RDR-4003 | 88 | **empty** | **yes** |

> ⚠ **EXPLAINED — §25.6. It was L-12: a contradiction between two fields on one record.** Two rows
> carried `status: 'subscriber'` against an empty `subscriptionIds`. **The set had no predicate
> because the data disagreed with itself**, not because a population was hard to name. Now fixed.
> The reasoning below is right about what it could check and wrong about what it concluded — the
> answer was a data defect, not a definition.

**The 6-set includes two riders with an empty `subscriptionIds` and excludes two others with an
empty `subscriptionIds`.** No predicate on that field produces it. Whatever the regex matched, it
was not the field that defines a subscriber.

**By `subscriptionIds` non-empty, the mean is 62.0 over four riders**, not 63.3 over six —
`(100 + 25 + 93 + 30) / 4`.

**And even that is not "subscribers".** `fixtures/riders.ts:63` records the reason as a finding of
its own: RDR-2087's *"one subscription is cancelled, so `subs.length` is still 1 and the rider is
not a subscriber."* So the true subscriber population needs the subscription's **status**, which is
a join `riders.ts` cannot do alone. It happens not to move today's mean — RDR-2087's rate is
`null` — but it means **no arithmetic over `riders.ts` alone can produce a subscriber mean at all.**

~~**One more population nobody has counted:** there are **16 rider records** and **13 carry the
field**~~ ⚠ **WITHDRAWN — §25.6. Not a population.** The other three records are `NewRider`, a
**different type** (`types/rider.ts:106`). **The population is 13 and a type boundary is not a
denominator.** I misread a population boundary inside the section arguing about population
boundaries. Original text (`grep -c "id: 'RDR"` → 16; `grep -c "renewalRatePercent:"` → 13). So even the `13` in
*"8 of 13"* — mine, and correct — is itself a chosen population rather than the rider count.

### 22.2 Four candidate populations, one of them forbidden, none of them declared

| Population | n | Mean | Standing |
|---|---:|---:|---|
| Riders carrying the field, nulls read as zero | 13 | 42.8 | **Forbidden.** `Metric.value`'s own doc says it: *"An average renewal rate over zero subscriptions is `null`; a renewal rate that is genuinely zero is `0`. Legacy conflates them."* AC-606 is the criterion. Not a third option — the defect the contract was written to prevent |
| Riders with a reading | 8 | **69.5** | Defensible |
| ~~The 6-set~~ | 6 | 63.3 | **Void — L-12**, a record-level contradiction since fixed (§25.6). Never a population |
| Riders with a reading and a non-empty `subscriptionIds` | 4 | **62.0** | Defensible, and not the same as *subscriber* |
| Riders with a reading and an **active** subscription | ? | not computed | Needs a join `riders.ts` cannot do |

**Two defensible bases, one void and one forbidden — and the tile publishes one number.**
(This said *three defensible, one unnameable*; the unnameable one was **L-12** and is void, not a
base — §25.6.)

> **Nobody in this exchange has been careless.** Four people computed this tile carefully and got
> four populations, because **the metric declares none**. That is the finding. Care does not fix
> it, review does not fix it, and a fifth pass would produce a fifth number.

### 22.3 R5-14 — the population is declared, not inferred, and the contract already has the field

**`Metric.sourceResource` exists for exactly this and `avgRenewalRate` leaves it `null`.** Its own
doc comment says what it is for: *"This is what stops the overview and the index table disagreeing
about the number of active captains."* It is the field that would have made this a five-second
question, and it is empty on the one tile that needed it.

> **R5-14.** A tile whose value is an **aggregate** declares its population in `sourceResource`.
> **`null` there on an aggregate is not "no row-level source" — it is an undeclared denominator**,
> and every reader will supply their own.
>
> **One population, four expressions, and they must agree:**
>
> | Expression | Carries | Rule |
> |---|---|---|
> | `sourceResource` | the **resource** | R5-14 |
> | the **label** | the population, in words | R5-13 |
> | the **caption** | the **base count** within it | R5-13 / §4.2 |
> | the **drilldown** | the destination holding those rows | AC-607 |
>
> **Three of the four are mechanically checkable against each other** — the drilldown's resource
> against `sourceResource`, and the caption's base count as a count of that resource.
> ⚠ **Checkable is not checked: no such test exists, and the obligation is routed (§23.5)
> rather than claimed.** The fourth, whether the label's words name the same population, is the review
> obligation, and it is named as one (§20.3's discipline).

**This is R5-13's layer argument completed downward.** R5-13 moved the population out of the
caption and into the label because a label is read first. R5-14 moves it one further, out of copy
entirely and into the contract, because **a population that exists only in copy cannot be checked
against the data it claims to describe.**

### 22.4 Copy — final for both live branches, so neither waits on the other

The caption's noun follows the declared population. Both strings are inside §4.2's 38-character
budget:

| If the declared population is | Label | Caption |
|---|---|---|
| riders with a reading | `Average rider renewal rate` | **`A mean over {shown} of {total} riders.`** → `A mean over 8 of 13 riders.` (27) |
| riders with an active plan | `Average subscriber renewal rate` | **`A mean over the {shown} riders with a plan.`** → `A mean over the 4 riders with a plan.` (37) |

`caption.storedRiderStat` is retired either way — it names a mechanism, not a denominator (§21.2).

### 22.5 Q-107 — my recommendation is unchanged, and §22.1 strengthens rather than alters it

**Still No, still mine, still not adopted by anyone else.** The supporting fact remains the one the
coordinator identified as the one that ought to decide it: `renewalRatePercent`'s numerator and
denominator were **discarded at write time**, so *total renewals ÷ total opportunities* is not
computable from this field at any denominator.

§22.1 adds a second fact of the same weight and it is worth putting beside the first: **the
population is not recoverable either.** Four attempts produced four bases spanning seven points,
one of which cannot be named and one of which is forbidden. A tile that cannot say what it averages
over, from data that cannot say what it is a ratio of, publishing a single percentage under a label
an operator reads as *the renewal rate* — **that is Q-101's plausible literal with three
independent routes to being wrong.**

**If the answer is Yes anyway**, R5-14 makes it safe rather than lucky: `sourceResource` is set, the
label and caption follow it, the drilldown lands on it, and the next person to compute this number
gets the same one.

### 22.6 What §22 corrects and changes

- **§21.2's *"I could not reproduce 63.3 % and am not repeating it"* is withdrawn.** It reproduces;
  the mean is arithmetically sound; **the population label on it does not survive a check.**
  Corrected in place.
- **§21.2 says two defensible bases. There are three**, plus one unnameable and one forbidden.
  Corrected in place.
- `avgRenewalRate.sourceResource` — **mock-data-engineer**, on whichever branch Q-107 takes.
- The `sourceResource` ↔ drilldown and `sourceResource` ↔ caption-count assertions —
  **frontend-engineer** or **utilities-engineer**, wherever the board's fixture tests live.
- **AC-730** gains R5-14's clause: an aggregate declares its population in the contract, not only in
  its copy — **product-owner**.

---

## 23. Three corrections to the ruling text, and the tile count is five boards resolving to three decisions

### 23.1 Two present-tense test claims, not one — the class closed rather than the instance

**§19.1 asserts a test that does not exist, and so does §22.3.** The first was flagged; I found the
second by running the search on my own file, which is the only way this class gets closed rather
than corrected one instance at a time:

```
$ grep -n "a test asserts\|A test asserts\|is asserted\|are asserted" 09-rulings-r5.md
1359:  3. **A test asserts no union member exists without a table entry** …
1825:  — a test asserts the drilldown's resource matches `sourceResource` …
```

**This is the failure I named in §14 and closed in the auth spec this morning, committed twice in
the document that names it.** A ruling may state an obligation. It may not describe a check in the
present tense, because the present tense is what a reviewer reads instead of looking.

Both are rewritten as obligations and routed as criteria — §23.5. The rule I take from doing it
twice:

> **A ruling states obligations. Only a verification document states that a check exists**, and it
> states it against a named test in a named tree. **The tense is the tell:** *"a test asserts"* is a
> claim about the world; *"must fail"* is a claim about the rule. A designer writing the first has
> quietly promoted themselves to QA.

### 23.2 §11.4 note 1 is inverted — the build is right, and the reason that survives is not the one given

**Corrected in place.** §11.4 said params carry **formatted** values. The shipped contract carries
**bare numbers**, and the component formats before interpolating.

> **§11.4 note 1, replacement.** **`subLabelParams` and `caveat.params` carry bare numbers.** The
> **component** formats them — it is the only layer holding `language` — and passes the formatted
> string to the translator. The translator therefore receives `45%`; the fixture stores `45`.

**The build's call is right and its stated reason does not survive, which matters because the reason
is what the next person reuses.** *A stored 45-percent string can never render Arabic-Indic digits*
is foreclosed by **AC-717**: numerals are Western in both languages, so that divergence never
arrives.

**What decides it is structural and stronger. The fixture never knows the language.** A value
formatted before the language is known is frozen in one locale, and the things that do still vary —
the grouping separator, the placement of the percent sign relative to its number under `dir="rtl"` —
vary at render time, in the layer that has `language` in hand. **Formatting is a rendering concern,
and storing a rendered string in a fixture is the same error as storing a formatted date.**

**My §11.4 was ambiguous rather than simply wrong, and the ambiguity is the instructive part.** It
cited `overview.compare.target` as the precedent — and in that precedent the **component** calls
`formatMetricValue(…, language)` and hands the result to the translator. That is exactly the shipped
behaviour. I wrote *"params carry formatted values"* meaning *at the translator*, and it reads as
*at the contract*. **A rule that names no layer will be applied at the wrong one.**

**Routed, because the same ambiguity is now in an AC:** AC-713's *"a number inside a sub-label
arrives as a formatted parameter"* is right read as *arrives at the translator* and wrong read as
*arrives from the fixture*. It should say which.

### 23.3 §20.3's residue moves into the prohibitions

**Accepted, and the diagnosis is the one that matters: naming an unenforceable residue once, in a
paragraph surrounded by enforcement language, is not loud enough to survive a skim.** That is the
false-tick shape one level up, and §20's own rule requires better of me.

> **R5-9's prohibitions gain a final line, inside the block rather than beneath it:**
>
> **Nothing checks that a caveat's sentence describes the condition its `gatedBy` metric raises.**
> The pointer is enforced; **the claim is not**. A caveat that points at the right metric and says
> the wrong thing passes every check in the product, and the only thing between that and an operator
> is a fixture review.

The surrounding enforcement language stays true — `gatedBy` cannot be omitted, it must resolve, and
the gate's value must be non-null. **The line above says exactly where the enforcement stops.**

### 23.4 Five boards, and they are not five decisions

**§18.2 and §21.1 both say three. It is five**, and the three sevens are the worse case because they
are ragged at **1440 as well**. Corrected in place.

| Board | Tiles | Renders |
|---|---:|---|
| Management › Overview | 7 | `3+3+1` at **both** widths |
| Management › Growth | 7 | `3+3+1` at **both** widths |
| Management › Zones | 7 | `3+3+1` at **both** widths |
| Management › Performance | 4 | `3+1` at 1280 |
| Admin › Overview | 4 | `3+1` at 1280 |

**The three sevens are not three coincidences, and the reason is already in the spec.** §5.4 carries
the principle — *"a cumulative census is an acquisition number, not a board number"* — and the
fixtures record what became of it:

- **Overview's seventh is `activeCaptains`**, a census. The fixture says so at `:281`: *"Spec §5.1
  does not list this tile and §5.4 does not reassign it — a gap in the spec"*, and that §5.4 *"moves
  Registered riders to Growth with a reason and says nothing about the captain census, which is the
  supply side of the same board."*
- **Growth's seventh is `registeredRiders`** — the census §5.4 moved there (`:834`).
- **Zones' seventh is neither.** `liveCities` is a state count with a legal denominator caption
  (`1 of 4 cities is live.`) and `steerOffersLive` is a measured zero. **Zones is a genuine
  per-board decision.**

> **The observation that reframes this: §5.4's principle was applied as a *move*, and a move is
> count-neutral.** Taking the rider census off Overview and onto Growth took Overview from eight to
> seven and Growth from six to seven. **One board's fix became another board's defect**, and the
> same principle applied to the captain census would do it again. **A relocation rule cannot resolve
> a count problem across a pair of boards. Only a cut can.**

So five boards resolve to **three** decisions, and one of them settles two boards:

| Decision | Fixes | |
|---|---|---|
| **Q-D18** — does a cumulative census render as a tile anywhere? | Overview **and** Growth | **New. Absorbs Q-D17**, which was scoped to one board and could not have covered this |
| **Q-107** — is the stored per-rider stat the measure? | Performance | Unchanged (§21.1) — one branch takes it to three tiles, which is permitted |
| **Per-board** | Zones (7 → 5, 6 or 9) · Admin (4 → 3 or **5**) | Genuinely two separate content calls. Options widened by §24.3 |

> **Q-D18, drafted as a yes/no.**
>
> **No — a cumulative census does not render as a tile.** `activeCaptains` and `registeredRiders`
> both **go**, rather than moving. Overview 7 → 6, Growth 7 → 6, both permitted at both widths.
> §5.4's own principle is applied consistently instead of half-applied, and §1's complaint about
> *"cumulative counts an operator cannot act on"* is answered rather than relocated.
>
> **Yes — a census earns a tile.** Both stay somewhere, and Overview and Growth each need a
> different tile to leave — two more per-board decisions on top of Zones and Admin.

**My recommendation: No.** A census answers *how many have we ever had*, which no operator acts on
in a shift — and **AC-603 independently forbids `activeCaptains` from a Management board anyway**:
active captains is Operations' subject, and it is the number four legacy screens compute and
disagree about. **But what the product claims to display is the owner's, and this is the one to
answer first, because it is the only one of the three that closes two boards at once.**

### 23.5 What §23 changes and routes

| | |
|---|---|
| §19.1 item 3 · §22.3 | Rewritten as obligations. **Neither check exists**; both routed below |
| §11.4 note 1 | Inverted to bare numbers, with the layer named |
| §18.1's prohibition block | Gains the line in §23.3 |
| §18.2 · §21.1 | *Three boards* → **five**, with the table above |
| §14's Q-D17 | **Absorbed by Q-D18** — it was scoped to one board of the three the census principle touches |

**Routed to product-owner as criteria, unnumbered here because numbering is theirs:**

1. An `AwaitedStore` member that no card uses and no *deliberately not here* table names is a
   failure, not a comment.
2. A tile's `drilldownRoute` resolves to the resource named in its `sourceResource`, and its
   caption's base count is a count of that resource.
3. AC-713's *"arrives as a formatted parameter"* names the layer it arrives at.

### 23.6 What R5 may and may not claim, given the three exclusions

Recorded because they bound **this document**, not the build — and a ruling that overstates its own
confirmation is §23.1's defect in a different tense.

- **R5-8 and R5-6 are confirmed on real data** — widest breakdown 448/512 against 912/1040, zero
  over half on any board at either width, Zones' gap 958px → 423px; the bar `rgb(43,110,240)` at
  4px, top row full, monotonic, `.bg-chart-fill` absent from `dist`. §19.3's residual stands as
  written.
- **R5-7 is exercised rather than inferred**, and this is the observation that matters: an
  overflowing Latin name on an RTL page truncates at its **tail**, with entity labels computing
  `ltr` while key labels compute `rtl`. **The union doing visibly different things to the two kinds
  is the whole argument for it**, and it is now watched rather than reasoned. The key-label control
  being jsdom-only is a real limit and is not browser-confirmed.
- **R5-9 has never rendered on real data.** Its gating metric has `value: null`, so §20.2's own
  arithmetic makes the caveat `null`. **The ruling is self-consistent and untested against the
  product**, and every caveat test uses a constructed fixture. That is the correct state, and it
  should stay labelled exactly as `board.test.ts`'s severity cases are.
- **Arabic is untested.** The dictionary is `{}`, so what has been measured is English laid out RTL.
  Every RTL claim in this document — R5-7's isolation, R5-8's mirrored grid, §11.4's numeral runs —
  is a claim about **direction**, not about **translated text**, and none may be recorded as
  Arabic-verified until the dictionary lands. **B-4 remains the condition every Arabic capture is
  taken in.**

---

## 24. R5-10 was over-specified — the `mod 4` clause never binds

### 24.1 Verified in the component and by enumeration, not accepted

`MetricTileRow.tsx:70` is the whole answer, and it is two lines:

```ts
const wide = count % 4 === 0 ? 'wide:grid-cols-4' : 'wide:grid-cols-3'
<ul className={cn('grid list-none grid-cols-3 gap-3', wide)}>
```

**Four columns are taken only when four divides the count exactly**, so a four-column row is ragged
**never**, by construction. Below `--ev-bp-wide` the grid is always three columns. I enumerated it
rather than reasoning about it:

```
 n   1280       1440
 2   2          2          clean
 3   3          3          clean
 4   3+1        4          RAGGED
 5   3+2        3+2        clean      ← R5-10 forbids this
 6   3+3        3+3        clean
 7   3+3+1      3+3+1      RAGGED
 8   3+3+2      4+4        clean
 9   3+3+3      3+3+3      clean      ← R5-10 forbids this
10   3+3+3+1    3+3+3+1    RAGGED
11   3+3+3+2    3+3+3+2    clean
12   3+3+3+3    4+4+4      clean
```

**Clean at both widths ⟺ `n mod 3 ≠ 1`.** The `n mod 4 ≠ 1` clause never binds, because the grid
does not use four columns unless four divides `n`. It also matches every measurement taken: Admin at
four renders `3+1` then a clean `4`; the three sevens render `3+3+1` at both, because `7 mod 4 = 3`
puts them in three columns at 1440 as well.

> **R5-10, corrected.** A board renders **`n` tiles where `n mod 3 ≠ 1`** — the permitted set is
> **2, 3, 5, 6, 8, 9, 11, 12**, everything except **1, 4, 7 and 10**.

**Nothing built is wrong and no board needs revisiting**, because the old set is a subset of the
true one. What was wrong is the cost it imposed on a decision that is still open.

### 24.2 The rule I derived it from was the sanctioned widths; the rule that governs is the grid

I wrote R5-10 from *"4-up above `--ev-bp-wide`, 3-up below"* — the two sanctioned widths — and never
checked what the component does with a count those columns do not divide. **The component already
encodes a don't-be-ragged-at-four rule**, so my clause re-imposed it as a constraint on the tile
count rather than reading it as a property of the grid.

> **This is the mirror image of §23.2 and the pair is worth stating together.** That rule was
> **under-specified** — it named no layer, so it was applied at the wrong one. This one was
> **over-specified** — it constrained a count the implementation had already freed, so it removed
> options that existed. **Both come from writing a rule about code without reading the code**, and
> they fail in opposite directions: one lets a builder do the wrong thing, the other stops an owner
> doing a right one.

### 24.3 What it changes for the five boards, and it is not cosmetic

| Board | Now | Old options | **True options** |
|---|---:|---|---|
| Management › Overview | 7 | 6, 8 | **5**, 6, 8, **9** |
| Management › Growth | 7 | 6, 8 | **5**, 6, 8, **9** |
| Management › Zones | 7 | 6, 8 | **5**, 6, 8, **9** |
| Management › Performance | 4 | 3, 6 | 3, **5**, 6 |
| Admin › Overview | 4 | 3, 6 | 3, **5**, 6 |

**The one that matters: Admin needs one more tile, not two.** Under the old set, four had to become
six or drop to three — and Admin has just lost three tiles to §11.2, so *"find two more measures with
stores"* was close to asking for the tiles that were removed. **Five is reachable with one.** That is
a materially different question to put in front of the owner, and it is the difference between a
decision and a bind.

It also loosens Q-D18 without changing my recommendation: cutting **both** censuses takes Overview
and Growth to five, which is clean, so the answer does not have to be balanced against a count.

### 24.4 The consequence I am ratifying by matching the implementation — raised, not ruled

Matching the grid means accepting what the grid does, and it does one thing worth naming:
**the column count depends on the tile count, so tile width varies between boards at the same
viewport.** At 1440 against the measured 1040px content column, with `gap-3`:

- three columns → **339px** per tile
- four columns → **251px** per tile

So Operations (8 tiles, `8 mod 4 = 0`) draws 251px tiles and Support (6 tiles) draws 339px tiles, on
the same screen, one navigation apart. **And Admin gaining two tiles to reach six would make every
remaining tile 88px wider** — adding tiles makes tiles bigger, which is not what anyone predicts.

**The reference does not do this.** The inherited captures are three-across regardless of how many cards
the dashboard holds; the card width is a property of the page, not of the contents.

**I am not ruling it, and the reason is §24.2's own lesson.** Fixing it means one fixed column count
per width, which would invalidate a measured, built, working grid on the strength of an argument I
have just constructed — the same error as the `mod 4` clause, committed in the other direction on
the same afternoon. **It is a finding for a later pass, with an owner and a reference**, and it
should be looked at when the five boards' counts are settled and it is clear how many distinct
column counts the product actually ends up rendering. If the answers land every board on 5, 6 or 9,
the variance disappears on its own and there is nothing to fix.

### 24.5 Both closures acknowledged

- **Q-D17 retired outright into Q-D18, with the stale references redirected in the same edit.** That
  is the right call and stronger than what I wrote — §23.4 said *absorbs*, which would have left two
  questions standing in a register the business owner reads. **A superseded question in a signature
  register is the stale-status defect**, and it is the third instance of that class today.
- **AC-713 now names its layer — fixture carries the raw value, dictionary carries the pattern,
  render layer formats.** That is the three-layer statement §23.2 argued for, and putting it in the
  criterion rather than in the ruling is the correct home. Withdrawing the Arabic-Indic reason per
  AC-717 and recording the structural one, including back through the mock-data handoff that had
  said the opposite, closes it properly rather than at the point it was noticed.

---

## 25. The §11.2 sort keyed on the wrong field — and re-running it re-opens D15

### 25.1 The ruling never needed changing. §11.2 already names the literal, and names it as the worse case

**R4-11 §11.2, verbatim, and I had forgotten I wrote the second clause:**

> A measure with no store at all → **the tile does not render.** Not an em-dash, not a skeleton, not
> a "coming soon". An em-dash is a claim that the number exists somewhere, **and a tile backed by a
> hardcoded literal is a stronger claim than that: it is a wrong number presented as a right one.**

**So the literal case is not a gap in the ruling. It is the case the ruling singles out as
aggravated, and the sort never looked at it**, because the sort keyed on `value: null` and a seeded
literal is not null. The coordinator's framing is exactly right: **the predicate was wrong, not the
conclusion.**

**And the spec has the matching hole.** AC-602 reads *"No tile on any board renders a value
hardcoded in a component or a copy string."* A literal in a **fixture** is in neither — so fourteen
tiles satisfy AC-602 while being precisely what AC-602 exists to prevent. `05-metrics-content.md`
**L-1** records the legacy Finance page's seven hardcoded KPI tiles and says Management › Overview
*"must not inherit the habit (AC-602)"*. **The habit was inherited through the layer the criterion
does not mention.**

### 25.2 R5-15 — the predicate is a declared field, because every seed-shaped predicate has failed

This has now been implemented twice and keyed on a seed property both times — `value: null`, then
implicitly `value !== null`. That is the generalisable defect and it is worth stating above the
disposition:

> **A rule about whether a measure *exists* cannot be implemented as a test on what the fixture
> happens to *contain*.** `value: null` and `value: 7` are both seed states, and neither says
> whether the number can be computed. **The only implementable form is a declared field**, which is
> why R5-14 turns out to be §11.2's missing half rather than a separate rule.

> **R5-15.** **`sourceResource` is required on every metric that is an aggregate over records, and
> `null` there means the tile does not render.** The sort is then a field read, not an inference.
>
> **Disposition, per tile, mechanical:**
>
> 1. Apply §18.5's test — *can this measure, **as specified**, be computed from what exists?*
> 2. **Yes** → set `sourceResource`, derive the value from it, **delete the literal**. The tile
>    renders, and R5-14's three cross-checks become runnable **and true**.
> 3. **No** → the tile does not render. It is named in its board's *deliberately not here* table
>    with the store it waits on (AC-726), and the AC enumerating that board's tiles is amended in
>    the same edit (§1.2's addendum).
> 4. After (2) and (3), **`sourceResource: null` on a rendering aggregate is impossible**, and the
>    invariant is checkable instead of remembered.
>
> `management.overview.contributionMargin` is outside this: it is a margin out of the pricing
> formula, not an aggregate over records, so R5-14 does not reach it and `null` is correct there.
> **That exemption is the reason R5-15 says "aggregate" and not "metric" — and it is the one place
> a `null` must still be defended in a comment rather than by the rule.**

### 25.3 Setting the field on a literal would have been the worse failure, and the refusal was right

The engineer set `sourceResource` on none of the fourteen because naming a resource on a value not
derived from it *"would make the check runnable **and false** … a worse failure than the one the
rule closes, because it looks audited."*

**That is §20.3's residue argument applied to a field instead of a sentence, and it is correct.** I
will add the half that makes it a rule rather than a judgement call: **a cross-check is only worth
having if the thing it checks is the thing that produced the value.** Declaring a population for a
number that did not come from it does not create a check — it creates a **second** claim to be
wrong, and couples them so that fixing either alone makes the pair inconsistent.

**And the refusal is itself the data.** Fourteen tiles that cannot honestly name a population are
fourteen tiles whose population does not exist. **The empty field was the finding**, and R5-15 makes
it one the type can state.

### 25.4 The magnitude, and the sequencing ruling that follows from it

From the header's second table — measures with no store at all — **eight tiles beyond the two
already stated as `not-captured` / `not-computable`**, and I have counted the board impact rather
than accepting *"four boards"*:

| Board | Now | Loses | After | R5-10 |
|---|---:|---|---:|---|
| Management › Growth | 7 | `promoROI`, `promoBudgetConsumed`, `subscriptionsFromPromos`, `referralAndIncentiveSpend` | **3** | clean |
| Management › Zones | 7 | `steerOffersLive` — and `liveCities` becomes **derived**, not removed | **6** | clean |
| Admin › Overview | 4 | `erasureOverdue`, `rotaGaps` | **2** | clean |
| Support › Fairness | 3 | `earningsPerEngagedHour` | **2** | clean |
| Management › Risk | 6 | `churnPredictedSubscriptions`, `paymentRiskRenewals` **if** they sort as no-store | **4** | **ragged** |

**Growth loses four of seven.** That is not a count adjustment; it is most of a board.

The two Risk tiles are the header's *first* table — population nameable, predicate missing — and I
am not sorting them from here. **§18.5's test answers *no* for both as specified** (nothing encodes
a churn prediction), but that is the per-tile judgement the re-run owns, and **Risk is the one board
where the answer changes whether R5-10 is satisfied.** It should be sorted first and reported, not
last.

> **The sequencing ruling, and it is the operative half of this section.**
>
> **Q-D16, Q-D18 and the per-board count questions are HELD until the sort is re-run and reported.**
> Answering *"which tile leaves Growth?"* against a seven-tile Growth that is about to be a
> three-tile Growth is answering a question that will not exist. **A count question asked against a
> tile list that is known to be wrong is worse than no question**, because the answer arrives with
> the owner's authority attached and outlives the list it was about.
>
> R5-10 then applies to the **post-sort** counts, not to today's.

### 25.5 This is D15's evidence arriving, and D15 is already in front of the owner unanswered

**The finding is not really about counts.** Growth at three tiles and Admin at two are not boards
that need a tile added — they are the shape **R4-11 §11.3** already described, in the same words,
about a different sub-tab:

> **A sub-tab whose entire rendered content is one tile is a page an operator opens once.** … Until
> the owner rules, Performance ships as a board with cancellation rate and its charts, with the two
> literal-backed tiles absent. **And it is the state that makes the merge argument visible to the
> owner**, which is worth more than padding it.

**§11.3 predicted exactly this, for exactly this reason — literal-backed tiles going absent — and
recommended D15: Management collapses from five sub-tabs to three.** That recommendation is a **D1
amendment**, it needs the owner's name on it, and it has been sitting unanswered since R4.

> **So the order is: D15 first, then the sort's per-tile report, then the counts.** Deciding tile
> counts for Growth and Zones before deciding whether Growth and Zones are sub-tabs is deciding the
> furniture before the room. **And the sort supplies the evidence D15 was missing** — §11.3 argued
> the merge from one board's literals; it can now be argued from four.

**My recommendation is unchanged and it is §1.5's.** A short board that answers beats a long board
that cannot be reproduced, and the thing that makes any of these boards fuller is captured data, not
retained literals. **But collapsing sub-tabs is D1, and D1 is the owner's.**

### 25.6 The two smaller findings, and one place a rule must not take credit

**L-12 — the unnameable n=6 set was a contradiction between two fields on one record**
(`status: 'subscriber'` against an empty `subscriptionIds`), now fixed. Four people computed four
populations partly because two records disagreed with themselves.

> **R5-14 would not have caught it, and I am not going to let it claim so.** R5-14 declares the
> **resource** — *riders* — not the **predicate** that selects within it, and not a record's
> internal consistency. What would have caught L-12 is a **fixture invariant**: `status ===
> 'subscriber'` ⇔ `subscriptionIds` non-empty. That is a third check, in a third place, and it is
> not a corollary of anything in this document. **A rule taking credit for a defect it would have
> missed is the false-tick failure applied to causation** — and it is the more dangerous form,
> because it retires a gap that is still open.

Two corrections to §22 follow and are made in place: the n=6 set was **not a population**, and my
*"one more population nobody has counted"* — 16 records against 13 — was **wrong**. The other three
are `NewRider`, a **different type** (`types/rider.ts:106`). **The population is 13 and the type
boundary is not a denominator.** §22 was the section arguing about populations, and I misread a
population boundary inside it.

**`barIsLegal` returns `true` for `backlogByQueue`** — all three of R5-6's conditions hold. So the
bar was **legal by scale and illegal by ordering**, and only R5-12 separates those. §18.4 said the
faint token hid the disorder; the sharper statement is the coordinator's and it goes in:

> **A check that returns true is more reassuring than a colour nobody can see.** The token hid the
> defect from the eye; the predicate hid it from review, and the predicate was the more effective of
> the two.
>
> **And the general form: when a rule gains a condition, every prior pass of its predicate becomes
> uninformative, not confirmatory.** R5-12 did not tighten R5-6 — it added an axis R5-6 never
> tested, so no *"the bar is legal"* judgement made before R5-12 carries any information about
> ordering. **A green check is scoped to the conditions it tests, and nothing is scoped to the
> conditions nobody wrote.**

### 25.7 What §25 changes and routes

| | |
|---|---|
| §18.4 | Gains the passing-predicate line and its general form |
| §22.1 | The n=6 set is **L-12**, a record-level contradiction, not a population. The 16-vs-13 remark is **withdrawn** — three records are a different type |
| §22.2 | The unnameable row is re-labelled as a data defect; **three defensible bases become two** |
| §14 Q-D16 · §23.4 Q-D18 · §23.4's per-board calls | **Held** pending the re-run (§25.4) |
| **D15** | **Un-parked and put first.** §11.3's recommendation now has four boards of evidence instead of one |

**Routed:**

- **mock-data-engineer** — re-run the §11.2 sort on **computability**, per tile, using §18.5's test;
  report the split rather than acting on it. Sort the two Risk tiles first (§25.4). `liveCities`
  becomes a derived entry.
- **product-owner** — **D15 before the count questions.** AC-602 needs *"or a fixture"* so the
  criterion reaches the layer the habit actually arrived through. AC-726 owes a row per removal.
- **frontend-engineer** — nothing until the sort reports. **The `caveat: null` on all seven and
  `awaitingStore` on exactly two are the correct states** and should stay labelled as untested
  against real data (§23.6), not quietly promoted once more fixtures land.
