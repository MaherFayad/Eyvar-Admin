# 15 — Repo prose assessment

> **Owner:** defect-verifier. **Assessment, read-only.** No production file was changed.
> All counts below were produced by scripts run against a clean tree; the scripts lived in a
> scratch directory outside the repo.
>
> **Question assessed, verbatim:** *"if all the emdashes and AI fingerprints are everywhere, and
> is it as small and as clear as possibly possible"*
>
> **Scope:** the repository's own prose — code comments in `src/` and the markdown in `docs/`.
> UI copy (strings the operator reads) is audited separately and is deliberately excluded here,
> except where the split between the two changes the answer. It does.
>
> **Corpus measured:** 649 `.ts`/`.tsx` files (214,704 lines), 184 markdown files (118,045 lines),
> `src/styles/globals.css` (2,109 lines).
>
> **Method:** a lexical scanner classified every character of every `src` file as code, string
> literal, or comment, so em-dashes in comments could be separated from em-dashes in UI copy.
> 11,866 comment blocks were extracted; 225 were sampled stratified across 165 areas of `src/`
> and read individually. Every `file:line` reference inside a comment was resolved against the
> file it names and checked against the content actually at that line.

---

## 0. The five answers

| # | Question | Verdict |
|---|---|---|
| 1 | Are the em-dashes everywhere? | **Yes — 17.4 per 1,000 words in comments, 19.1 in docs. Roughly 6–10× ordinary technical prose.** But 89% of `src`'s em-dashes are in **comments, not UI copy** (9,313 of 10,462). Only 1,143 are in strings, and most of those are test descriptions. The em-dash problem is a *repo* problem, not a product problem. |
| 2 | Are the AI fingerprints everywhere? | **The famous ones are almost absent.** "Not just X but Y" appears **5 times in 1.7 million words**. "It's not X, it's Y" — zero. What is everywhere is a different tic set: `**bold**` at 14.2/1k, ALLCAPS emphasis at 5.4/1k, and the em-dash. This prose has a *voice*, and the voice is over-emphatic rather than generically AI. |
| 3 | Is it as small as possible? | **No. Not close.** 30.6% of `src` is comment — one comment line per two code lines, **535,758 words of English against 133,696 lines of code**. `docs/` adds 1,179,470 words. 12.8% of comment blocks hold 55.2% of the prose. |
| 4 | Is it as clear as possible? | **No, and the reason is not verbosity — it is staleness.** Of 160 `file:line` references pointing into live `src` code, **only 79 (49%) land on a line containing what the comment names**. Eight comments make confident claims that are now false, three of them used as the *reason* for a design decision. |
| 5 | Should the comments go? | **No. The evidence is on their side.** Obviousness is not this repo's problem: of 2,574 short comments sitting directly above a declaration, **28 (1.1%)** merely re-spell the identifier. Almost every comment is trying to record something real. The fix is a **cap and a citation rule**, not a purge. |

**Both named doc contradictions are real and both were resolved against the code** (§4.1, §4.2).
On money alignment in Arabic, `docs/ref/rulings.md` R4 and `DESIGN.md:264` are **wrong** and
§9.2 is right — the column does mirror. The repo's own audit already caught this and wrote
*"a reviewer reading only `rulings.md` will file a false defect against correct code — I nearly
did"*, and the ruling file was still not fixed. On card titles, **four** comments give four
different answers and none is right: `CardTitle` uses `--text-sm`, which none of them names.

**One-line severity call:** the thing worth stopping for is **staleness, not volume**. A comment
that is merely long costs reading time. A comment that is confidently wrong costs a wrong decision,
and this repo has eight of those in `src/` (§3.3), seventeen verified contradictions in `docs/`
(§4.1–§4.5), and 81 broken line references. The volume problem in §5 can wait a month; these
cannot, because every day they stand is another decision made against them.

**And the cheapest fix is the smallest file.** `docs/ref/rulings.md` is 515 words, is one of the
most-cited documents in the repo, and is wrong about R4, about R2/R3, and about how many rulings
exist. Thirty lines of edit across three short `docs/ref/` files removes more risk than deleting
200,000 words of comment would.

---

## 1. The fingerprint census

### 1.1 The reframe that matters

The headline number in the brief — 10,461 em-dashes in `src/**/*.ts,tsx` — conflates two very
different things. Split by lexical position:

| Where the em-dashes are, in `src/` | count | share |
|---|---:|---:|
| Inside **comments** | **9,313** | **89.0%** |
| Inside **string literals** (UI copy + test names) | 1,143 | 10.9% |
| Anywhere else | 6 | 0.1% |

And the string-literal half is dominated by tests, not by the product:

```
83  src/data/clients/financials.test.ts      34  src/data/clients/metrics.test.ts
38  src/data/clients/auth.test.ts            30  src/screens/financials/copy.ts
35  src/screens/auth/auth.test.tsx           28  src/components/metrics/metrics.test.tsx
```

Eight of the top ten string-em-dash files are `.test` files. **The operator-facing copy is not
where this lives.** Whatever the UI-copy audit concludes, it is auditing about 10% of the problem.

### 1.2 Rates, normalised

Counts alone flatter a large repo. Per 1,000 words of prose:

| Marker | `src/` comments | `docs/` | ordinary technical prose |
|---|---:|---:|---|
| em-dash | **17.38** | **19.07** | ~1–3 |
| `**bold**` span | 14.22 | 32.20 | ~1–2 |
| ALLCAPS emphasis word (4+ letters) | 5.44 | — | ~0.1 |
| italic-quoted `*"…"*` | 2.09 | — | rare |
| "never" (imperative) | 4.37 | — | ~0.3 |

`docs/` uses a bold span every 31 words. That is not emphasis; at that density it is texture, and
the reader stops seeing it — which defeats the reason it was typed.

### 1.3 What is *not* there

I looked for the standard LLM tells and mostly did not find them. This matters, because it means
the prose was not merely generated — it was written to a house style that then over-applied.

| Fingerprint | occurrences in 1.7M words |
|---|---:|
| "not just X but Y" | **5** |
| "isn't X, it's Y" | **0** |
| "in other words / in essence / put simply" | 3 |
| "delve / leverage / tapestry / robust / seamless" family | 56 |
| "it's worth noting / importantly" | 46 |
| "simply" | 94 |

For scale, "simply" appears 94 times in 1.7 million words. That is a rate a careful human editor
would be content with.

### 1.4 What *is* there — the actual tic set

These are the repo's real signature, measured across `src` comments:

| Tic | count | per 1k words |
|---|---:|---:|
| em-dash | 9,313 | 17.38 |
| `**bold**` span | 7,617 | 14.22 |
| ALLCAPS emphasis | 2,913 | 5.44 |
| `, not a/the …` appositive | 910 | 1.70 |
| "deliberate(ly)" | 449 | 0.84 |
| "exactly one / exactly what" | 384 | 0.72 |
| "which is what/why" | 370 | 0.69 |
| "is a real …" | 116 | 0.22 |
| "on purpose" | 115 | 0.21 |
| "which is the whole …" | 40 | 0.07 |

The pattern is a single rhetorical move repeated: *state a decision, then insist it was a
decision.* "Deliberately", "on purpose", "not a style choice", "is a real distinction", "which is
the whole point" — 1,124 instances of the codebase defending itself against an imagined reader
who thinks it was careless. Once the standard in §5 is in place, that defence is unnecessary,
because a comment that survives the cap is self-evidently deliberate.

### 1.5 Worst files

**`src/` — em-dashes in comments:**

```
234  src/data/fixtures/metrics.ts          61  src/commands/registry.ts
161  src/components/DataTable.tsx          60  src/commands/usePalette.ts
 82  src/data/types/metrics.ts             59  src/screens/support/conversations/ConversationPane.tsx
 80  src/i18n/dictionaries.ts              58  src/data/clients/conversations.ts
 73  src/data/fixtures/ledger.ts           58  src/screens/metrics/copy.ts
```

**`docs/` — by em-dash rate, not raw count (files ≥2,000 words):**

```
38.5/1k  docs/01-modules/12c-rider-wallets.md          31.1/1k  docs/01-modules/03c-notifications.md
34.0/1k  docs/01-modules/13c-contact-drivers.md        31.1/1k  docs/01-modules/16i-settings-rota-oncall.md
31.5/1k  docs/03-data/DATA-MODEL.md                    30.8/1k  docs/01-modules/12a-finance.md
31.3/1k  docs/05-restructure/OPERATOR-EXPERIENCE-PLAN.md
```

`src/styles/globals.css` holds 259 em-dashes in 2,109 lines — the densest single file in the repo.

---

## 2. Classification of 225 sampled comments

225 comment blocks were sampled stratified across 165 areas of `src/` and read individually.
25 were structural (section dividers, compiler directives) and are excluded, leaving **200
prose comments** classified.

| Bucket | share | words affected |
|---|---:|---|
| **Load-bearing** — records a decision, measurement, ruling or hazard | **~72%** | keep all of it |
| **Over-written** — a real point buried in paragraphs | **~19%** | keep the point, cut ~60% of the words |
| **Explains the obvious** — narrates the next line | **~7%** | delete |
| **Stale** — describes code that has since changed | **~2% in a random sample; 43% within the referencing subpopulation** | fix first |

The two percentages for *stale* are both true and the gap between them is the finding. Staleness
is not spread evenly. It concentrates almost entirely in comments that make a **checkable claim** —
a line number, a hex value, a contrast ratio, a count. 2,518 comment blocks (21.2%) make such a
claim. Within the subset I could verify mechanically, the error rate is 43%.

### 2.1 Load-bearing — the standard to keep

The exemplar the owner already knows, `src/styles/globals.css:1449–1452`, 44 words:

```css
/* **R7 — comparison differs by DASH, NEVER by hue.** This has been filed as
   a defect by three separate audits and it is not one. It shares the series
   colour deliberately, and moving the series to green does not reopen it:
   the two are the same token because they are the same hue by rule. */
--chart-comparison: var(--ev-brand);
```

This is the whole case for the comment layer. It names the rule, names the evidence (three
audits), and pre-answers the next objection. Nothing here can be recovered from the code.

Three more that earn their place:

`src/components/ErrorBoundary.tsx:82` — records an observed production failure, not a theory:

```
 * Building the label at the call site means `t('state.crashPage.escape')` is
 * evaluated on EVERY render of a healthy shell, and `createTranslator` throws on
 * a missing key — so one typo in a string that only a crashed page ever shows
 * would blank every route in the product. […] (Observed, not theorised: it
 * blanked the running app for as long as the key was missing from the dictionary.)
```

`src/data/clients/revenue.ts:70` — records why a constant is a constant:

```
 * **The document number each sequence continues from is a constant, not
 * `fixtures.length`.** It used to be the array length, and that quietly froze
 * two fixtures at three rows.
```

`src/data/types/email.ts:392` — puts a unit in the contract where it cannot be missed:

```
 * A **percentage, 0–100** — not a fraction. `formatPercent` takes percentage
 * units, and a rate stored as `0.92` reaches it as `0.9%` at exactly one call
 * site out of every two; the unit belongs in the contract, not in a comment at
 * each reader.
```

### 2.2 Explains the obvious — delete

This bucket is genuinely small, and I want to be precise about how small, because it is the
bucket a naive audit would claim is huge.

**Mechanical test:** for every short comment (3–14 words) sitting directly above a declaration,
compare its content words against the identifier being declared. Result: **2,574 candidates,
28 (1.1%) where half or more of the comment's content words merely re-spell the identifier** —
and most of those 28 are endpoint annotations (`GET /api/v1/riders/:id → Rider` above
`getRider`), which are API contract, not restatement.

The real instances are rarer than the reputation suggests:

```
src/data/types/workQueue.ts:99
    /** When this row's clock started. `null` when there is no clock. */
    slaStartedAt: IsoDateTime | null

src/components/table/csv.ts:95
    /** What the toolbar search held. */
    readonly query: string

src/pwa/killSwitch.ts:112
    /** Should the worker be disabled and torn down on this load? */
    disabled: boolean
```

Each restates its identifier and its type and adds nothing. Delete on sight. But at 7% of prose
comments and a handful of words each, **this bucket is worth roughly 1% of the volume**. Anyone
who tells you the fix is deleting obvious comments has not counted.

### 2.3 Over-written — keep the point, cut the words

The largest recoverable volume. 12.8% of blocks (1,519) hold 55.2% of all comment prose:

| words per block | blocks | % of blocks | words | % of prose |
|---|---:|---:|---:|---:|
| 0–5 | 1,533 | 12.9% | 3,930 | 0.7% |
| 6–15 | 3,521 | 29.7% | 37,433 | 7.0% |
| 16–40 | 3,382 | 28.5% | 90,850 | 17.0% |
| 41–80 | 1,911 | 16.1% | 107,603 | 20.1% |
| 81–150 | 839 | 7.1% | 90,892 | 17.0% |
| 151–300 | 433 | 3.6% | 91,095 | 17.0% |
| 301–600 | 213 | 1.8% | 87,047 | 16.2% |
| 600+ | **34** | **0.3%** | **26,906** | **5.0%** |

Thirty-four comment blocks carry 26,906 words — an average of 791 words each, sitting above a
single function or file. `src/hooks/useForm.ts` opens with 562 words before the first import.
`src/components/ui/dropdown-menu.tsx` opens with 687.

A worked example. `src/commands/refusal.ts:1` runs 57 lines and 452 words. Its actual content is
three facts:

> 1. `blockedSentence` was private to `captains.ts`; there are now five registries, so it moved here.
> 2. It is deliberately not shared with `screens/operations/bulkRefusal.ts`: `setRefusal` returns a
>    `SetRefusal` shape for the bulk bar, `Command.unavailable` returns `string | null` for the palette.
> 3. `commands/` importing from `screens/` would invert the layering.

That is 60 words. The other 392 restate them with emphasis. **The rewrite is in §5.3.**

### 2.4 Duplicated prose — the cheapest fix

Distinct from over-writing: 48 comment blocks of 12+ words appear verbatim in more than one place,
accounting for 7,551 duplicated words (1.4% of comment prose). The volume is small; the
**maintenance hazard is not**, because a rule written 45 times is a rule that will be updated in 44.

| copies | words each | the block |
|---:|---:|---|
| **45** | 60 | *"Registered at module load, not on first call. `config.ts` says…"* — in every `src/data/clients/*.ts` |
| **42** | 44 | *"Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static import…"* |
| **18** | 23 | *"Seeded here rather than at module load: these locals are built from late-bound fixtures…"* |
| **17** | 37 | *"Nothing seeded yet: the fixture chunk has not landed…"* |

The first one is self-indicting: its own text says *"`config.ts` says …"*. The rule already has a
canonical home. Forty-five files then paste the explanation next to it.

---

## 3. The stale comments

**This is the section to act on.** A comment that is long is a tax. A comment that is confidently
wrong is a trap, and it is worse than no comment, because it is load-bearing in exactly the way
§2.1 describes — an engineer will use it to decide.

### 3.1 The line-number problem

1,054 comment blocks carry a line reference. 160 of them point at a `.ts`/`.tsx`/`.css` file
inside `src/`. I resolved every one and checked whether the target line contains any of the
symbols the comment names.

| verdict | count | share |
|---|---:|---:|
| **MATCH** — target line contains what the comment names | 79 | 49% |
| **NEAR** — found within ±12 lines, but not at the cited line | 31 | 19% |
| **MISS** — nothing the comment names is anywhere near the target | 36 | 23% |
| **NO TOKENS** — comment names nothing checkable | 11 | 7% |
| **FILE DELETED** — `ReportStudio.tsx` no longer exists | 2 | 1% |
| **OUT OF RANGE** — file has fewer lines than the reference | 1 | 1% |

**Fewer than half of these references are correct.** Verified individually, the drift is large and
systematic — files grew, and the references did not move:

| comment | claims | actually at | off by |
|---|---|---|---|
| `src/data/types/email.ts:316` | `routeTable.ts:791` declares `inbox`/`outbox` | `routeTable.ts:883` | **92** |
| `src/screens/support/safety/SafetyScreen.tsx:129` | `routeTable.ts:602` declares `critical-sos` | `routeTable.ts:756` | **154** |
| `src/screens/operations/requests/RequestsScreen.tsx:118` | `routeTable.ts:280` declares `pending` | `routeTable.ts:400` | **120** |
| `src/data/types/workspace.ts:3` | `routeTable.ts:733` merges `general`/`branding`/`legal` | `routeTable.ts:824` | **91** |
| `src/screens/admin/data/ExportCard.tsx:15` | `reports.ts:367` is `exportReport`, `:314` is `reportToCsv` | `:392` and `:339` | **25** |
| `src/data/types/integrations.ts:378` | `emails.ts:625` is `resendEmailDelivery` | `emails.ts:656` | **31** |
| `src/data/clients/securityPolicy.ts:31` | `shell/session.ts:75` is `DEFAULT_IDLE_TIMEOUT_MINUTES` | `session.ts:84` | **9** |

And three that point at code which no longer exists at all:

- **`src/data/clients/team.ts:6`** — *"`AdminTeamScreen.tsx:118`'s `handleAddUser` minted an id as…"*.
  `handleAddUser` appears nowhere in `AdminTeamScreen.tsx` except inside a comment describing the
  old code. Line 118 is an `import { SelectTrigger }`.
- **`src/screens/admin/policy/policyDraft.ts:331`** — *"`CITY-0${length + 1}` (`AdminPolicyScreen.tsx:96`)"*.
  `handleAddCity` does not exist in that file.
- **`src/commands/registry.ts:144`, `src/commands/captains.ts:67`, `src/commands/session.ts:6`** —
  three separate comments cite `PeopleScreen.tsx:105` as the place `canWrite` is computed.
  **`canWrite` does not appear in `PeopleScreen.tsx` at all.**

### 3.2 The contrast that proves the rule

The same repo makes **1,432** bare `` `:NNN` `` references into the legacy console,
`eyvar_ops_panel_v40_fixed.html`. I checked: that file is 21,857 lines, has **exactly one commit
in its history**, and has never been modified. Every one of the 1,432 references is in range, and
five spot-checks were exact:

```
:2889   DB.plans={
:13936  DB.cancellationPolicy=[
:11968    setInterval(tickEngine,1000);
:15962  var ERASURE_SLA_DAYS=30;
```

**The citation discipline is not the problem. Citing a moving target is.** Line numbers into a
frozen artefact are permanently correct and genuinely valuable. Line numbers into living code
rot at roughly 50% per major refactor. The rule in §5.1 follows directly from this.

### 3.3 Confirmed false claims

Eight comments assert something that is now untrue. Three of them use the false fact as the
*reason* for a decision, which is the dangerous shape: an engineer who checks the reason will find
it wrong and may "fix" the correct decision — exactly the failure mode the `--chart-comparison`
comment was written to prevent.

---

**S-1. `--primary` is described as near-black in four files. It is brand green.**

`src/styles/globals.css:1244` is current and explicit:

```css
     R2 is amended by one colour name and no behaviour: Save is still THE SAME
     PRIMARY as every other primary. **It is now green, and that is not "Save
     is green" — it is "primary is green".**
  --primary: var(--ev-brand);
```

Four comments still describe the previous generation:

| file | says |
|---|---|
| `src/shell/SaveBar.tsx:31` | *"that primary is now NEAR-BLACK, not brand blue. D-1 is void and R3 is killed — `--primary` maps to `--ev-ink`."* |
| `src/shell/ModuleRail.tsx:30` | *"`text-primary` came off the active icon here, **because `--primary` is near-black now** and a near-black glyph on a grey pill says nothing…"* |
| `src/components/table/IndexToolbar.tsx:37` | *"R3 (dead) **no blue primary here.** `--primary` is near-black now"* |
| `src/components/EmptyState.tsx:252` | *"`--primary` moved from brand blue to `--ev-ink`, which would have painted a near-black bar…"* |

A fifth is wrong in the other direction and is the worst of the set.
`src/components/ui/button.tsx:5`:

```
 *   R3 / D-1   primary is `bg-primary` (brand blue), never near-black.
```

That comment is stale **twice over** — brand blue was voided by D7, near-black by D7a — and it sits
52 lines above the variant it describes:

```ts
        // R3 / D-1 — the one primary.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
```

which paints `#0c6944`. Two comments in one file cite the same ruling pair for two different wrong
colours, and the button has been through both.

`ModuleRail.tsx` is the harmful one. The *reason* given for removing `text-primary` from the active
rail icon is that the glyph would be near-black and therefore say nothing. That premise has
reversed: the glyph would now be brand green on a grey pill, which would say something. The
decision may still be right, but the recorded reason no longer supports it, and the next person to
check will find a contradiction with `globals.css` and have no way to tell which won.

**S-2. `globals.css` reports two comments as stale that are not.**

`src/styles/globals.css:713–715`, inside the brand-ruling block:

```
     **Two comments in `src/` still quote the old 7.098** —
     `OnboardingStepRow.tsx:16` and `StrengthMeter.tsx:9`. They belong to their
     owners; this file cannot fix them and they are reported rather than left to rot.
```

All three claims are now wrong. `OnboardingStepRow.tsx` was updated and reads *"`--ev-green` on
white is **5.958 : 1** (it was 7.098 before the 2026-09-02 brand ruling…)"* — correct, and at line
**17**, not 16. `StrengthMeter.tsx` no longer quotes a ratio at all. The stale-comment tracker has
itself gone stale.

**S-3. `securityPolicy.ts` says a permission key does not exist. It exists and is in use.**

`src/data/clients/securityPolicy.ts:15–19`:

```
 * D20 gates this pane on **`manage_security_policy`**, which **does not exist
 * yet** — it is one of D17's eight minted keys and another agent is landing
 * that union. Until it lands the surface gates on `manage_team`, and that is
 * recorded here rather than in a component comment nobody greps: **this is
 * Q-78 / AC-663 and the pane closes them the day the key exists.**
```

Three other files record the opposite. `src/data/types/navigation.ts:162` declares the key and its
comment says *"**Closes Q-78**, which recorded that AC-663 fails visibly for want of this key."*
`src/screens/admin/team/AdminTeamScreen.tsx:187` says *"Closes Q-78; unblocks AC-663"*, and line
193 reads:

```ts
const canWriteSecurity = shell.permissions.permissions.includes('manage_security_policy')
```

The dependency closed. The client's header still describes it as open and still instructs the
reader that the pane gates on `manage_team`. An engineer trusting this header would either redo
landed work or gate the pane on the wrong key.

**S-4. `payments.ts` states three wrong numbers and a line reference off by 317.**

`src/data/fixtures/payments.ts:8–9`:

```
 * `Trip.paymentId` is populated on 118 of the 132 rows in `fixtures/trips.ts`,
 * 109 of them from `fillerTrips`' own `PAY-${7000 + n}` expression (`:406`).
```

Measured: `trips.ts` holds 17 seeded rows plus `fillerTrips` at `length: 120` = **137 rows, not
132**. Populated `paymentId`s are 12 seeded + 109 filler = **121, not 118**. The
`PAY-${7000 + n}` expression is at **`trips.ts:723`**; line 406 is `fareHalalas: 1_765`.
(The "109 from `fillerTrips`" figure is correct — `i % 11 === 0 ? null : …` over 120 rows yields
11 nulls.)

**S-5. `types/team.ts` says the on-call rota is wired to nothing. It is wired.**

`src/data/types/team.ts:175–179`:

```
 * The consumer exists and is wired to nothing: `TopBar.tsx:105` takes
 * `onCallName` and `AppLayout.tsx:396` passes the literal `null`, so the top
 * bar's `No one on call` warning is unconditional.
```

`src/shell/AppLayout.tsx:516` now passes `onCallName={onCall.data ?? null}`, and AppLayout's own
header at line 306 narrates the fix: *"**Who is on call, from the rota rather than from `null`.**
The chip shipped `onCallName={null}` … It does now (`getOnCallRota`)."* One file records the fix;
another still describes the bug. A reader landing in `types/team.ts` would conclude `OnCallRota`
is dead code.

**S-6. `commands/selection.ts` says no screen calls `selectOnly`. The shared table calls it.**

`src/commands/selection.ts:115` — *"**No screen calls this yet** — the ten screens that gain a bulk
bar in P4-T1…"*. `src/components/DataTable.tsx:859` reads `table.selectOnly` and wires it into the
bulk bar at line 913. It is reached from every selectable table, which is a stronger answer than
the comment anticipated.

**S-7. A comment quotes a ruling that has since been amended — and the amendment is visible in the source.**

`docs/05-restructure/design/07-rulings-r4.md:887` carries R4-6b §6.6.4 with the correction made in
place:

```
> **When the table lands, Market & Zones' ~~four~~ FIVE metric tiles MUST be derived from the
> table's own rows. They may not remain literals.** — `captainsNeeded`, `starvedZones`,
> `unservedRequests30d`, `avgFailureRate`, `worstDemandSupplyRatio`.
```

`src/screens/management/zones/ZonesScreen.tsx:18` quotes the current text and explains the
correction. `src/data/types/zone.ts:18` still quotes the superseded one:

```
 * > **When the table lands, Market & Zones' four metric tiles MUST be derived
 * > from the table's own rows. They may not remain literals.**
```

The surrounding argument is built on the old count — *"the strip's **four** tiles are filters into
the table"*, *"**four** hand-written literals sitting above six rows"*. Both files present their
version as a verbatim blockquote of the same ruling, so a reader comparing them cannot tell which
is the source and which is the drift.

This is the one stale class the 150-word cap will not catch, and it argues for a rule the cap does
not supply: **quote a ruling by identifier, not by transcription.** `R4-6b §6.6.4` cannot go stale.
The sentence inside it can, and did.

**S-8. Two comments disagree on the size of the route table.**

`src/routes.tsx:47` says `forbiddenReason` *"returns `null` for all 34 rows"*. The table has
**35** `subTabId` rows. `src/data/types/navigation.ts:256` (*"Non-null on 34 of the 35 rows"*) and
`src/screens/admin/team/adminTeam.test.tsx:200` (*"`null` on all 35 rows"*) are both correct;
`routes.tsx` appears to have copied the 34 from the permission count in its own preceding sentence.

### 3.4 What was checked and found *sound*

For balance, three claims of the same shape that verified clean, so the 43% figure is not read as
a blanket condemnation:

- `src/commands/outcomeToast.ts:13` — *"The palette is its only caller today"*. Confirmed: only
  `usePalette.ts:99` imports it.
- `src/data/clients/revenue.test.ts:10` — *"`financials.test.ts:569` asserts the first issued refund"*.
  Line 569 is `expect(refund.id).toBe('REF-0004')`. Exact.
- `src/data/clients/cash.ts:86` — *"Nothing seeded yet: the fixture chunk has not landed"* reads
  like a project-state claim but describes the runtime guard `if (!fixturesLoaded()) return`
  immediately below it. Correct, though the wording invites the misreading. Reword, do not delete.

---

## 4. The docs

184 markdown files, 118,045 lines, **1,179,470 words**. For scale, that is roughly 2.2× the
comment prose in `src/` and about fifteen average non-fiction books.

The whole tree was written in ten days: **146 files were last touched in August 2026, 28 in
September, and 13 are untracked.** That compression is the root cause of everything below. Nothing
here has had time to be superseded *on purpose*; it has been superseded *by accident*, by a later
document that does not know the earlier one exists.

### 4.1 Contradiction A — money alignment in Arabic. **Verified. `docs/ref/rulings.md` is wrong.**

`docs/ref/rulings.md:12`:

> | R4 | Numeric, currency and count columns are **right-aligned**, tabular figures. Does **not** flip in Arabic. |

`DESIGN.md:264` says the same thing:

> | R4 | … **Always right-align numeric, currency, and count columns**, with tabular figures. … In Arabic this alignment does **not** flip — see §9.2. |

But `DESIGN.md:6094`, in DESIGN.md's own RTL translation table, says the opposite:

> | 2 | "**Always right-align** numeric and currency columns." | Ruling **R4** (72) → §3.1 | Align to the **inline-end**. The *column* mirrors, the *digits inside it* do not — §9.2. |

§9.2, which both of the first two cite as their authority, does not merely fail to support them —
it contains a block titled **"The explicit answer R4 needs"** (`DESIGN.md:6253`) that answers the
question directly and the other way:

> | Layer | Mirrors? | Rule |
> | The **column** — where the number sits in its cell | **Yes** | `text-align: end`. In Arabic the numbers hug the cell's physical **left** edge… |
> | The **numeral run** — digit order and separator position | **No** | Left-to-right, Western digits… |

`DESIGN.md:6644`'s Arabic QA checklist agrees: *"Numeric columns hug the **physical left** edge."*
So DESIGN.md answers this correctly in three places and incorrectly in one — and the incorrect one
cites §9.2 as its authority.

**What the code does** settles it. `src/components/Money.tsx:79`:

```
 * A money **table cell**. R4: numeric, currency and count columns use
 * `text-align: end` — **never** `text-align: right`, which in Arabic aligns on
 * the side the eye leaves.
```

`src/components/DataTable.tsx:1622` implements it as `column.align === 'end' && 'text-end'` — a
**logical** utility, which under `dir="rtl"` renders on the physical left. **The column flips.**
And this is not accidental: `text-right` and `text-left` appear nowhere in production code, and
four tests exist solely to keep it that way (`nav.test.tsx:350`, `qa.copy.test.tsx:404`,
`auth.test.tsx:818`, `financials.test.tsx:615`).

| source | claim | correct? |
|---|---|---|
| `DESIGN.md:6253` §9.2, `:6094` §9.1, `:6644` §9.3 | column mirrors, digits do not | **yes** |
| `src/components/Money.tsx:79`, `DataTable.tsx:1622` | `text-end` | **yes** |
| `DESIGN.md:264` | "alignment does not flip" | **no** |
| `docs/ref/rulings.md:12` | "Does not flip in Arabic" | **no** |

**This has already cost an audit.** `docs/02-verification/post-remediation-visual.md:282` filed it
as V-D1 and recorded the near-miss in the finding itself:

> **`docs/ref/rulings.md` R4 contradicts DESIGN.md §9.2.** … The implementation follows §9.2 and is
> right. … **A reviewer reading only `rulings.md` will file a false defect against correct code — I
> nearly did.**

That is the `--chart-comparison` story again, and this time the defence did not hold: the ruling
file said the wrong thing, the auditor caught it by reading the code, and **nobody then fixed the
ruling file**. It is still wrong today. Fix `rulings.md:12` and `DESIGN.md:264` to read *"aligned to
the inline-end; the column mirrors in Arabic, the digits inside it do not."*

### 4.2 Contradiction B — who owns card titles. **Verified. Both comments are wrong.**

`src/styles/globals.css:1772–1782`, on `--text-base: 16px`:

```
     **H2 — THE ONLY STEP IN THE RAMP USED AT ITS DECLARED SIZE.** 18 uses
     against a role list of nav title, card title, dialog title, drawer title
     and empty-state heading, which is about the number of those there are.
     Nothing to reclaim here.
```

`src/styles/globals.css:1789–1796`, on `--text-lg: 17px`:

```
     **H2 — WHAT IS LEFT OF ITS ROLE HAS NO CONSUMERS, AND THAT IS THE
     FINDING.** All six live non-OTP uses were numbers, not titles; with the
     KPI moved off, this step is at risk of having no consumer at all until
     card and section titles come back to it from --text-base. That is a class
     change in `ui/card.tsx` and the drawer sections, owned by their engineers.
```

One says `--text-base` currently owns card titles and there is nothing to reclaim. The other says
card titles are expected to migrate *to* `--text-lg` *from* `--text-base`. They cannot both be a
settled description of the same role.

**Neither is right.** `src/components/ui/card.tsx:77`:

```tsx
className={cn("text-sm font-semibold text-foreground", className)}
```

Card titles are **`--text-sm` (14px)**. `--text-base` does not own them, so its role list is
inflated and its "nothing to reclaim" conclusion rests on a role it does not have; and `--text-lg`
is waiting for a migration *from a token that is not the source*. The one place a reader can get
the answer is the component.

A third block in the same file, `globals.css:1652`, adjudicates between them and gets it wrong too:

```
     **`--text-lg`'s role list is HALF FICTION.** Its declared role is "card /
     drawer-section title, stat VALUE" and the TITLE half has **zero
     consumers** — card titles render at `--text-base` (`ui/card.tsx`), and so
     do dialog and drawer titles.
```

`ui/card.tsx` renders `text-sm`. `sheet.tsx:312` (the drawer title) renders `text-sm`. Only
`dialog.tsx:209` and `alert-dialog.tsx:152` render `text-base`. And `card.tsx:18` adds a fourth
answer — *"card title is 13px/600"* — against a `--text-sm` of 14px.

**Four comments, four different answers, in three files, about one class on one line.** The
`--text-lg` block is the most wrong, because its claim is checkable and false; its consumer list is
stale too (`MetricTile` and `Figures` both moved to `text-kpi`, and the `ZonesScreen` line numbers
are 601/638, not 584/621). Live non-OTP `text-lg` consumers are down to three, all numbers.

### 4.3 The same token drift, in `docs/`

§3.3's S-1 has a `docs/` half. Four passages still state the superseded token values as current:

| file | says | actual |
|---|---|---|
| `docs/05-restructure/build/04-reskin.md:19` | *"The primary action is near-black, not blue. `--primary` maps to `--ev-ink` `#171a21`."* | `--primary: var(--ev-brand)` `#0c6944` |
| `docs/05-restructure/build/04-reskin.md:105,150,171` | three more restatements of the same | as above |
| `docs/05-restructure/design/03-navattic-language.md:54,635` | `--ev-green` `#15653c`, `6.351`, `7.098` | `#1d723c`, `5.332`, `5.958` |
| `docs/05-restructure/design/04-index-screen-redesign.md:1529` | `--ev-green` `#15653c` … `6.351` AA | as above |
| `docs/05-restructure/design/08-auth-and-onboarding.md:1170` | *"`--ev-green` on white is 7.098 : 1"* | `5.958 : 1` |

Two files record the change correctly — `docs/05-restructure/DECISIONS.md:4420` (a migration table
showing `--ev-ink #171a21` → `--ev-brand #0c6944`) and
`docs/02-verification/post-remediation-a11y.md:47` (*"PASS — down from 6.351 at the old `#15653c`"*).

The `08-auth-and-onboarding.md:1170` case is the instructive one. That passage is the **design spec
that `OnboardingStepRow.tsx` implements.** The code comment was updated on 2026-09-02 and now reads
*"5.958 : 1 (it was 7.098 before the 2026-09-02 brand ruling…)"*. The spec it came from was not.
The implementation is now more current than its own specification, and nothing in either file says
so.

### 4.4 Six more contradictions, each falsifiable in one command

Beyond the two named ones, a systematic sweep found these. Every "actual" column was checked
against the code or a `wc -l`.

| # | doc claim (verbatim) | actual | where |
|---|---|---|---|
| 1 | *"Badge radius **4px**"* (R15) | badge is `rounded-lg` = **8px** | `docs/ref/rulings.md:24` vs `src/components/ui/badge.tsx:45` |
| 2 | *"white on `#0C6944` = **8.42:1** — clears AAA"* | **6.731:1** — AA, not AAA | `design/13-plane-refresh.md:92` vs `DECISIONS.md:4441` |
| 3 | *"All **34** rows ship `permission: null`"* | 35 rows, and `permission` no longer exists — 0 occurrences; replaced by `viewPermission`, 43 | `build/00-shell.md:359` vs `src/data/fixtures/routeTable.ts` |
| 4 | *"`operations/live-dispatch` — **unbuilt**, wave 6"*, *"`support/tickets` — **unbuilt**, wave 5"* | both shipped; `UNBUILT_SUB_TAB_IDS` is `[]` | `design/08-auth-and-onboarding.md:1312,1319` vs `src/data/clients/routes.ts:82` |
| 5 | *"**20 rulings** … do not improvise a twentieth ruling in a code review"* | R20–R24 exist and are cited **30 times** in `src/` | `docs/ref/rulings.md:3,35` vs `design/04-index-screen-redesign.md:1513` |
| 6 | *"the old **40px** row"* | measured single-line pitch is **49px**; `--ev-row-h: 40px` is a floor, not a pitch | `design/13,15` vs `docs/ref/table.md:27` |

Number 1 has the same self-refuting shape as S-1: `badge.tsx:13`'s own comment reads
*"R15 — rounded rectangle, `rounded-lg` (8px)"* — citing R15 as its authority for the value R15
forbids. Number 2 is worse: `design/19-execution-log.md:707` says the 8.42 figure was
*"Corrected in place."* It was not; `13-plane-refresh.md:92` still reads 8.42 today. A correction
log that records corrections that did not happen is the same failure class as `globals.css:713`
(S-2), one layer up.

Number 5 deserves its own note. `docs/ref/rulings.md` instructs reviewers that a twentieth ruling
would be an improvisation. Five exist, they are binding, and `R20` alone is cited 26 times in
`src/` — including in `DataTable.tsx`, the file a change lands on forty screens from. The same
identifiers also collide across namespaces: `docs/01-modules/12b-driver-wallets.md:1092` uses `R20`
for an unrelated legacy badge bug, so grepping `R20` returns a binding row-height ruling and a
defect report.

### 4.5 Five count claims that are simply wrong

| claim | actual |
|---|---|
| `docs/ref/modules.md:3` — *"60 module docs"* | **61** |
| `docs/ref/api.md:7` — *"284 endpoints, **46** client modules, ~64,000 lines"* | **47** clients, **76,212** lines (`docs/07-api/README.md:5` says 47) |
| `docs/ref/table.md:3` — *"**1,620 lines**, and the highest-leverage file"* | **2,059** |
| `docs/ref/verify.md:130` — *"**4,665** keys"* | **4,694** (`docs/08-i18n/KEYS.md` is machine-generated and says so) |
| `docs/00-index/TEAM-BRIEF.md:13`, `docs/ref/README.md:3` — *"`DESIGN.md` is **5,761** lines"* | **6,665** |

None of these is dangerous alone. Together they establish the pattern: **every number written into
prose in this repo drifts, and none of them is checked by anything.** The `4,694` figure is the
exception that proves it — it lives in a generated file with a `<!-- GENERATED … Do not edit -->`
header and is correct. Every hand-typed copy of it is not.

### 4.6 The structural finding: the short files are the stale ones

This is the most important thing in §4, and it inverts the intuition that length is the problem.

`docs/ref/` exists so a reviewer does not have to read 6,665 lines of `DESIGN.md`. Those files are
the most-cited in the repo — `copy.md` draws 96 inbound references, `patterns.md` 51, `states.md`
44, `tokens.md` 23. They are also, per document, **the most wrong**:

- `docs/ref/rulings.md` (515 words) — R4 wrong (§4.1), R2 and R3 assert a near-black primary that is
  now green, and the ruling set closes five rulings short. **No stale banner.**
- `docs/ref/defects.md` — closes the deviation register at D-6 while D-11…D-16 are live, and uses
  unhyphenated `D12`/`D13` for unrelated legacy defects on the same page as the hyphenated
  deviation table.
- `docs/ref/tokens.md` — the one file that *does* banner itself (*"⚠ STALE AS OF `DECISIONS.md` D7
  — every hex below has been replaced"*) and redirects to `design/03-navattic-language.md` §1 as
  *"the live token set"*. **That target is itself wrong** on `--primary` (`#171a21`, 17.411:1),
  `--ev-green` (`#15653c`, 6.351) and `--ev-hairline` (`#e1e4ea` against the shipped `#f0f2f4`),
  and carries no banner. The redirect chain terminates in a stale document.

So the reader who does the *right* thing — reads the short summary instead of the long source — is
the reader most likely to be misled. Summaries go stale faster than what they summarise, because
the source gets edited when the code changes and the summary does not. This is the same mechanism
as §2.4's 45-copy paragraph and §3.3's `--primary` quartet, and it is the single argument running
through this entire audit: **a fact stated in two places will diverge, and the copy is always the
one that loses.**

### 4.7 Which documents are current, which are superseded

There is no supersession marker anywhere in the tree — no `> Superseded by …` header, no status
field. Currency has to be inferred, which is itself the finding. Three signals were available:

**(a) Orphans — 15 files, ~63,000 words, with zero inbound references** from anywhere in `src/` or
`docs/`:

```
docs/02-verification/pass-2d-gate-registry-sweep.md          4,374w   2026-08-24
docs/06-design-reference/_audits/audit-consistency.md        5,925w   2026-08-24
docs/06-design-reference/_partials/07-accessibility.md       8,614w   2026-08-24
docs/06-design-reference/_partials/09-rtl-localisation.md    7,197w   2026-08-24
docs/05-restructure/build/07-rtl-and-failure-injection.md    2,953w   2026-08-26
docs/05-restructure/build/03-auth-and-onboarding.md          1,487w   2026-08-27
docs/05-restructure/build/10-operations-bulk-and-reach.md    1,789w   2026-09-02
docs/05-restructure/build/11-profile-and-shell-remediation.md 2,501w  2026-09-02
docs/05-restructure/build/12-error-boundaries-and-tabs.md    1,820w   untracked
docs/02-verification/post-remediation-a11y.md                5,051w   untracked
docs/02-verification/post-remediation-visual.md              4,494w   untracked
+ the four docs/03-assessment/ files, including this one
```

Orphan status is a weak signal on its own — `post-remediation-a11y.md` is orphaned and is one of
the two *most* current documents in the tree. But `_partials/07-accessibility.md` (8,614 words) and
`_partials/09-rtl-localisation.md` (7,197 words) are pre-restructure reference material that
`docs/ref/a11y.md` and `docs/ref/rtl.md` now cover in a form people actually cite: `docs/ref/`
files draw 9–96 inbound references each, and the `_partials` draw none.

**(b) Explicitly overtaken by a later ruling.** `docs/05-restructure/design/13-plane-refresh.md:99`
raises the success/brand hue collision as *"**Open question — flag for the owner**"* and proposes
*"push `--ev-green` to `hsl(150 …)`"*. That question was answered on 2026-09-02, and
`globals.css:682` answers it while quoting doc 13 back at itself:

> Doc 13 proposed "push --ev-green to hsl(150 ...)" — that is where it ALREADY WAS (149.3), and hue
> alone is not enough

Doc 13 still presents the question as open. So do `04-reskin.md` on `--primary` and
`03-navattic-language.md` on the green ramp. **These are not stale files; they are stale
*sections* inside live files**, which is why deleting documents is the wrong instrument.

**(c) The `01-modules/` series** (61 files) is reverse-engineered documentation of the legacy
console. Like `eyvar_ops_panel_v40_fixed.html` itself, it describes a frozen artefact and cannot go
stale. It is also where the highest em-dash rates in the repo live (38.5/1k in `12c-rider-wallets.md`).
It should be left alone. Rewriting a correct description of a frozen system buys nothing. The same
applies to `docs/03-data/` and `docs/04-relations/`.

**Four documents are genuinely superseded as whole documents**, each with a named successor:

| document | lines | why | superseded by |
|---|---:|---|---|
| `docs/06-design-reference/_audits/audit-consistency.md` | 467 | audits `DESIGN.md` *"(2891 lines)"*; it is now 6,665 | `_audits/corrections-applied.md` |
| `docs/02-verification/post-remediation-visual.md` | 394 | headline is *"DO NOT MERGE until V-1 is fixed"*; V-1 is fixed (`AccountMenu.tsx:154` is braced, guarded by `src/components/jsxComments.test.ts`) | `design/19-execution-log.md` |
| `docs/02-verification/post-remediation-a11y.md` | 438 | its B7 (*"every route has the same `<title>`… zero writers"*) is dead — `src/shell/useDocumentTitle.ts` exists and is wired at `AppLayout.tsx:114` | same |
| `docs/02-verification/pass-2d-gate-registry-sweep.md` | 490 | its own status line says *"complete — 49 corrections applied"*; a spent worklist | the edited module docs |

Keep `post-remediation-visual.md`'s **finding table** — V-D1 in §4.1 and V-5 in §4.4 are both
still open. It is the *verdict* that is superseded, not the evidence. This is the distinction a
status banner would carry and nothing currently does.

**The banner convention already exists and works where it is used.** Six documents carry one:

```
docs/05-restructure/design/00-shell.md:3       ⚠ SUPERSEDED AGAIN by 03-navattic-language.md — D7
docs/05-restructure/design/02-visual-refinement.md:3   ⚠ PARTIALLY SUPERSEDED by 03-navattic-language.md
docs/ref/tokens.md:3                           ⚠ STALE AS OF DECISIONS.md D7 — every hex replaced
docs/05-restructure/design/04-index-screen-redesign.md:3   supersedes clause-by-clause, §14.5 is the ledger
docs/05-restructure/design/17-reconciled-findings.md:3     the master view; supersedes 13–16's ordering
docs/05-restructure/design/09-rulings-r5.md:3   amends 07-rulings-r4.md R4-4 §4.1/4.2/4.3 in place
```

That is the mechanism working. The problem is not that it does not exist; it is that
`docs/ref/rulings.md`, `docs/ref/defects.md`, `design/03-navattic-language.md`,
`design/13-plane-refresh.md` and `build/04-reskin.md` — five of the most-read files — do not use it.

**Numbering cannot be used to infer recency.** `docs/05-restructure/build/` has three files
prefixed `03`, three covering the shell (`00-shell`, `02-shell-fixes`,
`11-profile-and-shell-remediation`) and two covering work queues. `05-work-queues-and-metrics.md:8`
has to say *"Supersedes nothing"* in prose because the prefix cannot.

### 4.8 What to do with `docs/`

Not a cull. Four mechanical changes, in order of value:

1. **Fix `docs/ref/` first, not last.** `rulings.md` (515 words), `defects.md` and `api.md` are
   among the most-cited files in the repo and carry the highest error density. R4, R2/R3, the
   missing R20–R24, the D-11…D-16 gap and the five wrong counts in §4.5 are perhaps **thirty lines
   of edit** across three short files, and they are the errors most likely to be acted on. This is
   the single highest-return change in the entire audit.
2. **Break the `tokens.md` → `03-navattic-language.md` redirect chain.** Either fix §1 of
   `03-navattic-language.md` (three token values) or repoint `tokens.md` at `globals.css`, which is
   correct, self-documenting and cannot drift from itself.
3. **Add a status line to every file in `05-restructure/`.** One line: `> Status: current` or
   `> Status: superseded by <path> on <date>`. 52 files, an afternoon. The convention already
   exists in six files (§4.4) and works; it just is not applied where it is needed.
4. **Retire the four documents in §4.7's table**, and fold `_partials/07-accessibility.md` and
   `_partials/09-rtl-localisation.md` (15,811 words, zero inbound references) into `docs/ref/a11y.md`
   and `docs/ref/rtl.md`, which already carry the same rules and are actually cited.

`DESIGN.md` (73,709 words) and `DECISIONS.md` (46,394) should **not** be cut. They are the two most
referenced files in the repo — `DECISIONS.md` alone draws 171 inbound references — and their length
is the record they exist to be. What `DESIGN.md` needs is the §4.1 fix, because a 73,000-word
document that contradicts itself at two points is more dangerous than a long one.

---

## 5. The recommendation, with a number

### 5.1 The standard — what a comment must earn

A comment stays if it answers a question the code cannot, and a reader would otherwise get wrong.
Concretely, it must do at least one of:

1. **Record a decision and the alternative rejected.** (`--chart-comparison` differs by dash, not hue.)
2. **Record a measurement.** (`5.958 : 1 on white`.)
3. **Record a ruling and its identifier.** (`R5a permits red in four places`.)
4. **Record a hazard.** (`a rate stored as 0.92 reaches formatPercent as 0.9%`.)
5. **Record an observed failure.** (`it blanked the running app`.)

And three prohibitions, each derived from a measured failure above:

- **Never cite a line number in living code.** Cite the symbol: `` `exportReport` in
  `clients/reports.ts` ``, not `` `clients/reports.ts:367` ``. §3.1 measured this discipline at
  49% accuracy against `src/`, and 100% against the frozen legacy file — so line numbers into
  `eyvar_ops_panel_v40_fixed.html` **stay**, and line numbers into `src/` **go**. This one rule
  retires 160 references, 81 of which are currently wrong.
- **Never state a fact that lives in another file.** Point at the file. §2.4's 45-copy paragraph
  and §3.3's `--primary` quartet are the same failure: a fact copied is a fact that will diverge.
- **A file header is 150 words. An inline comment is 45.** If the argument needs more, it is a
  `docs/` entry and the comment is a one-line pointer to it.

### 5.2 The number

Applying the 150/45 cap mechanically across all 11,866 comment blocks:

| | now | target |
|---|---:|---:|
| comment lines in `src/` | 65,777 | **41,643** |
| comment density | **30.6%** | **19.4%** |
| comment prose | 535,758 words | **338,317 words** |
| words removed | — | **197,441 (36.9%)** |

**Target: 19.4%, down from 30.6%.** Not 5%, and not 10%. This repo genuinely carries more decisions
per line than a normal codebase and should stay above the industry-typical 15%. What it should not
carry is the 197,441 words that sit *above* the cap — because those words are, by the distribution
in §2.3, overwhelmingly emphasis and restatement wrapped around a point already made.

Two things this number deliberately does **not** do:

- It does not touch the 72% classified load-bearing. Every one of the five criteria in §5.1 fits
  inside 45 words; the `--chart-comparison` exemplar is 44.
- It does not count the 1,387 section dividers (3,826 lines). They are navigational furniture,
  cost one line, and should stay.

### 5.3 Cut first

Ranked by words above the cap:

| # | words over cap | file | comment lines |
|---:|---:|---|---:|
| 1 | 7,051 | `src/data/fixtures/metrics.ts` | 1,437 / 3,417 (42%) |
| 2 | 4,535 | `src/components/DataTable.tsx` | 929 / 2,060 (45%) |
| 3 | 2,715 | `src/data/types/metrics.ts` | 579 / 729 (79%) |
| 4 | 2,403 | `src/data/clients/conversations.ts` | 603 / 1,523 (40%) |
| 5 | 2,056 | `src/components/metrics/BreakdownList.tsx` | 315 / 547 (58%) |
| 6 | 1,950 | `src/data/fixtures/navCounts.ts` | 348 / 398 (87%) |
| 7 | 1,746 | `src/screens/metrics/copy.ts` | 359 / 589 (61%) |
| 8 | 1,717 | `src/components/metrics/MetricTile.tsx` | 292 |
| 9 | 1,633 | `src/data/clients/metrics.ts` | 413 / 1,018 (41%) |
| 10 | 1,535 | `src/screens/metrics/MetricBoardScreen.tsx` | 246 |

The metrics module occupies five of the top ten. `src/data/fixtures/navCounts.ts` is **87% comment**
— 348 comment lines around 50 lines of data.

**Do these first, out of order, because they are correctness rather than volume.** All of it is
under a day, and none of it deletes a decision:

| | fix | cost | why now |
|---|---|---|---|
| 1 | `docs/ref/rulings.md` — R4 (§4.1), R2/R3 (§4.4), the missing R20–R24, and `DESIGN.md:264` | ~15 lines | 515-word file, top-cited, wrong on the ruling an auditor already nearly mis-filed against |
| 2 | `docs/ref/defects.md` and `docs/ref/api.md` — the D-11…D-16 gap and the counts in §4.5 | ~15 lines | same argument, same files, same afternoon |
| 3 | the five `--primary` comments, S-1 — including `button.tsx:5` | 5 lines | an active contradiction with `globals.css` in the token layer |
| 4 | `securityPolicy.ts:15`, S-3 | 6 lines | tells the reader a closed dependency is open |
| 5 | `globals.css:713`, S-2 and `design/19-execution-log.md:707` (§4.4 #2) | 4 lines | two correction logs recording corrections that did not happen |
| 6 | `types/team.ts:175`, S-5 | 5 lines | reads as "`OnCallRota` is dead code"; it is wired |
| 7 | the stale token passages in `docs/` (§4.3) and the `tokens.md` redirect chain (§4.6) | ~20 lines | includes the design spec `OnboardingStepRow` implements |
| 8 | `globals.css` `--text-lg` / `--text-base` / `card.tsx:18` (§4.2) | 4 lines | four answers, none right |
| 9 | the 81 wrong `file:line` references (§3.1) | mechanical | replace each with a symbol name |

Items 1–8 are **under 80 lines of edit in total** and close every verified contradiction in this
report. None of them deletes a decision. Do them before any of §5.2's volume work.

---

### 5.4 Three files, before and after

#### (a) `src/data/clients/securityPolicy.ts` — stale premise, broken refs, 45× boilerplate

**Before** (header, 37 lines / ~300 words, plus the shared 60-word block at line 52):

```ts
/**
 * The workspace security policy — **D20**'s *Security policy* pane on Admin ›
 * Team & Access, and the client D20 names for it.
 *
 * ## What this replaces
 *
 * Three controls at `AdminTeamScreen.tsx:315`, `:321` and `:335` — mandatory
 * second factor, idle timeout, absolute expiry — each a `useState` seeded with
 * a literal, and **no save control anywhere on that screen persisted any of
 * them**. An operator could set a session timeout and the console forgot it on
 * the next navigation.
 *
 * ## The write key it will need, and the one it uses today
 *
 * D20 gates this pane on **`manage_security_policy`**, which **does not exist
 * yet** — it is one of D17's eight minted keys and another agent is landing
 * that union. Until it lands the surface gates on `manage_team`, and that is
 * recorded here rather than in a component comment nobody greps: **this is
 * Q-78 / AC-663 and the pane closes them the day the key exists.**
 *
 * ## Why it is a client of its own rather than three fields on `team.ts`
 *
 * Because it has a different permission. D20 puts every other Team & Access
 * pane behind `manage_team` and this one behind `manage_security_policy`, and a
 * client that mixes two authorities is a client whose http branch cannot be
 * gated at the route. Splitting it now costs one file; splitting it after the
 * key lands costs a migration of every caller.
 *
 * ## `idleTimeoutMinutes` has a consumer waiting for it
 *
 * `shell/session.ts:75` hardcodes `DEFAULT_IDLE_TIMEOUT_MINUTES = 30` and the
 * shell expires a session against that constant. The seed below **is** 30, so
 * wiring the shell to read this field is a no-op change rather than a silent
 * behaviour change. The bounds are `shell/session.ts`'s own clamp (5…240),
 * restated as numbers rather than imported: `src/data/` does not import from
 * `src/shell/`, and this 422 is what catches the day the clamp moves.
 */
…
/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
```

**After** (10 lines / 88 words, three factual corrections, boilerplate replaced by a pointer):

```ts
/**
 * Workspace security policy — D20's pane on Admin › Team & Access.
 *
 * Its own client, not three fields on `team.ts`, because it has its own
 * permission: `manage_security_policy` (D17; closed Q-78 / AC-663). Mixing two
 * authorities in one client leaves the http branch ungatable at the route.
 *
 * Replaces three `useState` controls on `AdminTeamScreen` that no save control
 * ever persisted — an operator set a session timeout and the console forgot it.
 *
 * The 5…240 bounds mirror `shell/session.ts`'s clamp, restated rather than
 * imported (`src/data/` must not import `src/shell/`). The 422 is what catches
 * the day the clamp moves.
 */
…
/* See `config.ts` — ids register at module load, not on first call. */
```

**Removed:** the "does not exist yet" claim (S-3, now false); `AdminTeamScreen.tsx:315/:321/:335`
(the controls are at 234–236 and 732); `shell/session.ts:75` (it is 84); and the 45× duplicated
paragraph. **Kept:** every one of the four decisions. 300 words → 88.

#### (b) `src/shell/SaveBar.tsx` — a stale premise inside a rules table

**Before** (lines 26–33):

```
 *   §2.3 / R2   inline-end: `Discard` (secondary) then `Save` (**the primary**,
 *               never green, never white-on-white). R2 is AMENDED by D7: Save
 *               is still the same primary as every other primary, and that
 *               primary is now NEAR-BLACK, not brand blue. D-1 is void and R3
 *               is killed — `--primary` maps to `--ev-ink`. One colour name
 *               changed; the reasoning did not.
```

**After** (3 lines):

```
 *   §2.3 / R2   inline-end: `Discard` (secondary) then `Save` (**the primary**).
 *               R2 is amended by D7: Save is whatever `--primary` is, never a
 *               colour of its own. See `--primary` in `globals.css`.
```

The correction and the compression are the same edit. The old text pinned a token value into a
component file, so it went stale the moment the token moved; the new text points at the token,
which cannot. Note that "never green, never white-on-white" also had to go — `--primary` **is**
green now, and the line as written now forbids the shipped state.

The same header runs 55 lines. Applying the 150-word cap: the four rules that state behaviour
(`AC-52`, `§9.2 #7`, `§9.2 #8/#9`, `§4.6`) stay; the three that restate `AppLayout`'s layout
contract collapse into one line pointing at `AppLayout`.

#### (c) `src/data/fixtures/payments.ts` — three wrong numbers

**Before** (lines 6–13):

```
 * ## Why the volume rows are derived and not 119 literals
 *
 * `Trip.paymentId` is populated on 118 of the 132 rows in `fixtures/trips.ts`,
 * 109 of them from `fillerTrips`' own `PAY-${7000 + n}` expression (`:406`).
 * Copying those out as literals would be correct exactly once: the moment
 * anyone changes the filler expression, the trip index and the payment index
 * disagree and every `?entity=PAY-70xx` 404s again — which is the defect this
 * file exists to fix, reintroduced by the fix.
```

**After** (4 lines):

```
 * ## Why the volume rows are derived, not written out
 *
 * Most trips carry a `paymentId`, most of those from `fillerTrips`' own
 * `PAY-${7000 + n}` expression. Copying them out as literals is correct exactly
 * once: change the filler expression and every `?entity=PAY-70xx` 404s again,
 * which is the defect this file exists to fix.
```

The three counts (118, 132, 119) and the line reference (`:406`) all carry the *same* argument, and
all four are now wrong. None of them was load-bearing: the point is "derive, do not copy", and it
survives their removal intact. **Where a count is genuinely the point, assert it in a test, not in
a comment** — `denormalisation.test.ts` already does this for other fixtures, and a test that
fails is worth more than a sentence that lies.

---

## 6. This document, measured against its own finding

I measured this file the way I measured the rest, and the result is worth reporting rather than
hiding.

| document | words | em-dashes | per 1k |
|---|---:|---:|---:|
| `15-repo-prose.md` (this file), excluding quoted material | 5,228 | 81 | **15.5** |
| `12-onboarding.md` | 6,559 | 85 | 13.0 |
| `06-undo-and-recovery.md` | 5,601 | 90 | 16.1 |
| `src/` comments | 535,758 | 9,313 | 17.4 |

**This document reproduces the rate it is criticising**, to within 11%. That is the most useful
single observation in the audit, and it was not intentional: I wrote what felt like plain prose,
having just spent an afternoon counting em-dashes, and landed on the house average anyway. About a
quarter are structural (`### 1.4 What *is* there — the actual tic set`, or
`file.ts:82 — records an observed failure`); the rest are the same appositive habit measured in §1.4.

Two conclusions follow.

First, **the style is contagious, and a style rule that depends on individual restraint will
fail.** The 17.4/1k figure was not produced by carelessness; it is what happens when competent
writing is done inside this repo's conventions. If the rate is to come down it needs a check that
runs, not a guideline that is read — a lint rule counting em-dashes per comment block would take
an afternoon and would hold.

Second, and more important for §5: **this is why the recommendation is a word cap and a citation
rule rather than a style guide.** Both are mechanically checkable. "Write with fewer em-dashes" is
not, and this section is the evidence — I was the person who had most recently counted them, and I
still hit the house average.

The two existing assessment documents should be left alone until they are next edited for other
reasons. Rewriting prose for its own sake is how a repo acquires 1.7 million words.
