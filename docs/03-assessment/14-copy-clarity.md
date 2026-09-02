# 14 — Copy clarity: fingerprints, size, English, Arabic, guidance

**Owner:** ux-writer · **Status:** assessment, read-only. No production code changed.
**Measured against:** `DESIGN.md` §5.7 and §9.6, `docs/ref/copy.md`, R6/R8/R9,
`design/12-refusal-and-undo-surfaces.md`, `design/20-arabic-glossary.md`,
`design/21-voice-refusals-and-permission-names.md`.

**Method.** Not grep over source. The English dictionary was **built** by importing
`EN` from `src/i18n/dictionaries.ts` through vitest and serialising it, so every figure
below is over the 4,563 strings the shell can actually render, with each key mapped back
to `file:line` by parsing the 30 `copy.ts` files with comments stripped. Source em-dash
counts are taken from string literals only, with comments and JSX removed by a small
tokeniser. `npx vite --port 5325` serves 200. `npx vitest run --maxWorkers=4`:
**3,077 passed, 6 failed** across 5 files; the one reproduced in isolation
(`src/screens/support/tickets/tickets.test.tsx:86`, `ticket.sla.heading` never appears)
is a render defect, not a copy defect, and is not a flake — it fails alone too. Pre-existing
on this branch; flagged, not investigated.

---

## 0. Verdict

**On fingerprints the owner's instinct is right about the repository and wrong about the
product.** There are **10,462 em-dashes in `src/`**. Only **116** are in a `copy.ts`
string, and **117** reach the dictionary. The other ~10,300 are in JSDoc and inline
comments, plus 926 inside test assertions. The tic is real and it is enormous, but it lives
in the prose *about* the product, not the prose *in* it. The stated 631 is between the two:
it counts something wider than the dictionary and narrower than the tree.

**On the rest of the fingerprint list there is essentially nothing to find.** Across 4,563
strings: zero "not just X, but Y", zero "isn't X, it's Y", zero "generally", zero
"typically", zero "simply", zero "just", zero "it's worth noting", zero "ensure", zero
"allows you to", zero "leverage/robust/seamless/delve", zero "in order to", zero "a number
of", zero "however,", zero rhetorical questions, zero "successfully", zero "please", zero
exclamation marks, zero "Oops/Sorry". One first-person plural. One portentous framing. One
real hedge. This is not a codebase that needs an AI-slop audit.

**On size the honest answer is uncomfortable and worth reading twice.** I rewrote 55 of the
worst strings twice. The first pass tightened *wording only* and saved **8%** — twelve of
the fifty-five came out no shorter at all. The second pass, where I was allowed to **delete
a fact**, saved **20%** — and even then only **3 of the 55** came under 90 characters. That
is the answer to *"is it as small as possibly possible"*: **yes at the sentence, no at the
decision.** Nothing here is padded. It is long because somebody chose to tell the operator
three or four things, and only a product decision — not an editor — can take one of them
away. Ninety characters is about one fact; this copy carries several per string on purpose.

**On Arabic the glossary is better than most shipped translation memories and has four
specific defects**, all of the same kind: an English word that collides with another English
word on one Arabic term, where Part 4 catches 22 collisions and misses at least four that
are more frequent than several it does list. Three individual terms would make a Riyadh ops
manager stop and reread.

**On guidance there is one systemic gap and it is the important finding in this document:**
five sites put a refusal in a `title` attribute on a `disabled` button, where most browsers
never fire the tooltip and no screen reader ever reads it. The operator sees a grey control
and is told nothing. Everything the refusal grammar achieved is discarded at those five
sites.

---

## 1. AI fingerprints

### 1.1 The counts

Over the 4,563 rendered strings, unless the row says otherwise.

| Category | Count | Note |
|---|---:|---|
| **Em-dash — dictionary strings** | **117** | in 117 distinct strings; one per string, never doubled |
| Em-dash — `copy.ts` string literals | 116 | the 117th is `SLA_MESSAGES_EN` in `src/lib` |
| Em-dash — fixture strings (mock data that renders) | 67 | `conversations.ts` 19, `ledger.ts`, `metrics.ts` |
| Em-dash — hardcoded strings in components/screens | 16 | |
| Em-dash — JSX text nodes | 8 | |
| **Em-dash — total that can reach a screen** | **~208** | |
| Em-dash — test assertion strings | 926 | never rendered |
| Em-dash — comments and JSDoc | **~9,320** | never rendered, and where the tic actually lives |
| **Em-dash — whole `src/` tree** | **10,462** | |
| En-dash in dictionary | 6 | all numeric ranges (`{from}–{to}`); correct |
| "not just X, but Y" and cousins | **0** | |
| "isn't X, it's Y" | **0** | |
| "more than just a" | **0** | |
| Hedges: generally / typically / simply / just / worth noting / keep in mind | **0** | |
| Hedge: "usually" | **1** | the only true hedge in the product |
| may / might / could | 40 | **all deontic** ("is permitted to"), not hedging. Not findings |
| Portentous framing | **1** | |
| delve / leverage / robust / seamless / streamline / holistic / unlock / harness | **0** | |
| "ensure", "allows you to", "designed to" | **0** | |
| Triad "A, B, and C" | 38 | **35 are enumerations of real things.** 3 are rhetorical. See 1.4 |
| First-person plural | **1** | |
| "successfully" / "please" / "!" / "Oops" | **0** | |
| US spelling | **0** | 2 regex hits, both `catalogue`, both false |
| Semicolon in UI copy | 11 | 8 correct, 3 belong to the dev-speak finding |
| Restatement (a clause repeating its own sentence) | **9** | hand-counted during §2's rewrite pass; no regex finds these |
| Dev-speak reaching an operator | **3** | file path, class name, decision reference |

**Total genuine fingerprints: 51** — 36 tic em-dashes, 9 restatements, 3 dev-speak, 1 hedge,
1 portent, 1 first-person plural. Out of 4,563 strings that is a rate of **1.1%**.

### 1.2 The 117 em-dashes, classified

Load-bearing versus tic, by shape:

| Class | n | Verdict |
|---|---:|---|
| **A. Field separator between interpolations** — `{name} — {role}`, `{action} — {reason}`, `{step} — {incident}` | 11 | **Load-bearing but wrong glyph.** A separator between two data fields should be the middle dot the product already uses in `sub.driverOption` (`{name} — {city} · {rating} · {active}/{max} subs` uses both in one string). Pick one. Under RTL an em-dash between two bidi-isolated fields is also a neutral that the bidi algorithm may reorder; `·` is not safer, but the inconsistency is |
| **B. Label + qualifier** — `Disputed — fare`, `365 days — one year`, `Trips — completed and fares collected` | 39 | **Replace with a colon or nothing.** These are 39 dropdown options and column captions. `Disputed: fare` reads identically and is one character shorter; `365 days, one year` is better still |
| **C. Refusal + reason** — `This payout cannot be paid — no bank account is on file.` | 31 | **Systematic, not a tic** — 24 of the 31 are the `fin.bulk.*` family, one construction applied consistently. But a full stop is the right punctuation: `This payout cannot be paid. No bank account is on file.` Two facts, two sentences. Doing it 31 times is a pattern decision, so change it once or not at all |
| **D. Prose aside** | **36** | **This is the tic.** Every one of these is a comma, a full stop or a colon |

**36 of 117 are a writer's tic. 81 are structural**, of which 39 (class B) would be better as
a colon and 31 (class C) better as a full stop. Zero are parenthetical pairs — nobody ever
wrote `— like this —`, which is the shape that reads most like a machine.

### 1.3 The worst twenty, verbatim

Ranked by how much the fingerprint costs the reader.

1. **`admin.team.security.notWired`** · `src/screens/admin/team/copy.ts:138` — dev-speak
   > The shell still expires a session against its own 30-minute constant. Saving here records the policy; wiring the shell to read it is a change to src/shell/session.ts.

   A **file path in operator copy**. An ops manager cannot open `src/shell/session.ts`, and a
   developer does not read this screen. Worst string in the product.

2. **`admin.team.rota.notWired`** · `src/screens/admin/team/copy.ts:148` — dev-speak
   > The top bar's "on call" chip is hardcoded to nobody and cannot read this yet. Reported; the change is one line in AppLayout.

   `AppLayout` is a React component name. "Reported" tells the operator a ticket exists
   somewhere they cannot see. "one line" is an estimate of somebody else's work.

3. **`admin.team.matrix.blocked`** · `src/screens/admin/team/copy.ts:124` — dev-speak
   > This matrix is read-only. The role model and the permission set behind it are an open decision (D4 / Q4), and an editable matrix built against a guess would be wrong in a way nobody could see.

   `(D4 / Q4)` is a citation into a design document. Defensible only if an operator is
   expected to quote it when escalating — decide that, or cut it.

4. **`onboarding.step.owner.position.body`** · `src/screens/onboarding/copy.ts:162` — portent
   > The trial balance and the contribution margin are the two numbers you'll be asked about. **This is where they live**, and this step is done when you can say them out loud.

   "This is where they live" is the only "this is the moment where" construction in the
   product. The step already links the screen.

5. **`dispute.lf.empty.body`** · `src/screens/support/disputes/copy.ts:113` — first person
   > Items reported missing after a trip appear here, from the moment a rider tells **us** until the moment the item is back.

   The only first-person plural in 4,563 strings. §5.7 rule 6 is second person for the
   operator, third for everyone else. → `…from the moment a rider reports it until…`

6. **`admin.integrations.delivery.failure.http5xx`** · `workspace/copy.ts:315` — hedge + em-dash
   > The endpoint errored. This is **usually** temporary — replay it.

   The only hedge. Also the only error string in the product with an adverb in it. →
   `The endpoint errored. Replay it.`

7. **`integrity.check.agree.aggregate-vs-records.desc`** · `admin/data/copy.ts:175` — restatement, 253 chars
   > A rider or captain whose stored trip total is larger than the trips on file is expected — this console keeps a recent window and billing keeps the lifetime. One whose stored total has nothing at all behind it is not, **and that is what this check reports**.

   The longest string in the product, and it ends by restating itself.

8. **`fairness.empty.firstRun.body`** · `support/fairness/copy.ts:119` — em-dash + framing
   > A suspension appealed, a rating disputed, a rider reported. A high overturn rate here **is not a failure — it means** the appeal route is catching bad calls before they cost you a captain.

   "is not a failure — it means" is the closest thing in the product to *not just X, but Y*.
   State the fact: `A high overturn rate is the appeal route catching bad calls…`

9. **`assurance.confirm.choice.help`** · `assurance/copy.ts:91` — em-dash aside
   > The source is on the record. "Assumed" **is not a confirmation — it is** a risk somebody accepted.

   Same construction. → `"Assumed" is a risk somebody accepted, not a confirmation.`

10. **`onboarding.step.ops.requests.body`** · `onboarding/copy.ts:192` — em-dash aside
    > Watch the SLA clock while you hold it. Read what a breach means — a breach is a missed target, not a failure to act.

    The em-dash introduces a definition. A colon does that job and says so.

11. **`admin.integrations.delivery.replay.confirm.body`** · `workspace/copy.ts:323` — em-dash aside in a confirmation
    > The same payload is queued for {endpoint} as a new attempt. {id} stays in the log exactly as it is, including its status code and response — a replay does not undo a failure, it adds an attempt.

    A destructive confirm should be flat declarative sentences. This one ends on a rhetorical
    inversion.

12. **`policy.reasons.desc`** · `admin/policy/copy.ts:152` — em-dash aside, 209 chars
    > …A code is never deleted or renamed — retire it and name what replaced it, because historical records point at the key.

13. **`zones.steer.body`** · `management/zones/copy.ts:58` — restatement
    > **Captains are independent — the offer is an invitation each one can accept or ignore.** It runs for {hours} hours…

    Clause one and clause two say the same thing. Keep the second.

14. **`adminData.retention.desc`** · `admin/data/copy.ts:309` — restatement
    > Shortening a window **destroys evidence you may still need** — **it must never be shorter than** the payment provider's dispute window.

    One rule stated twice, once as consequence and once as prohibition.

15. **`onboarding.intro.owner`** · `onboarding/copy.ts:55` — em-dash + triad
    > You're accountable for the whole console — policy, people, money, and the decisions nobody else can make.

    Three of the four `onboarding.intro.*` strings use the same em-dash-then-list shape. A
    colon is what that punctuation mark is for.

16. **`admin.integrations.delivery.desc`** · `workspace/copy.ts:290` — em-dash aside
    > …A replay is a new attempt — the failed one stays in the log.

17. **`pwa.install.body`** · `src/pwa/copy.ts:44` — em-dash aside
    > An installed window drops the browser toolbar and gives back about 90px — roughly another table row.

    The one place the em-dash is nearly earned (an aside about an aside). A comma still wins.

18. **`policy.sla.grid.desc`** · `admin/policy/copy.ts:116` — em-dash aside
    > An overridden target stops following the tier — revert it to put it back.

    An instruction hanging off a statement. Full stop.

19. **`admin.integrations.webhook.name.help`** · `workspace/copy.ts:244` — em-dash aside
    > Who receives this — the system, not the URL.

    Field helper text, six words long, and it has an em-dash in it. Colon.

20. **`fin.pricing.stageA.body`** · `financials/copy.ts:683` — restatement
    > **Four stores price this product and they disagree.** A plan's catalogue is editable; its rates, commission and discount are shown as they stand.

    Sentence one is a note about the data layer written for whoever is fixing it. The
    operator needs sentence two.

### 1.4 The triads

38 strings match `A, B(,) and C`. **35 are genuine enumerations** — `Operators, roles,
permissions and the on-call rota` names four real things a screen contains, which is
description, not decoration. Three are rhetorical and all three are in `onboarding.intro.*`:
`policy, people, money`, `applications, requests, assurance and dispatch`, `payouts, escrow,
deductions and reconciliation`. Those three are still accurate lists. **No adjective triads
exist in the product.** There is no `clear, fast, and reliable` anywhere.

### 1.5 The finding the owner will care about most

The fingerprint density in the **comments** is roughly 100× the density in the copy. The
`copy.ts` files themselves carry ~9,300 em-dashes across their headers and inline notes,
and those headers are where a reader forms an impression of who wrote this. If "AI
fingerprints are everywhere" is the complaint, the copy is not where they are. This
document does not propose touching them — they are load-bearing engineering prose and the
tree is green — but the distinction should be recorded so the wrong file gets edited.

---

## 2. As small as possible — 55 strings, rewritten

**216 of the 4,563 rendered strings exceed 90 characters.** 101 exceed 120, 32 exceed 160,
9 exceed 200. The 221 in the brief is measured over a slightly wider set — most likely
including the 131 keys that live in a `copy.ts` the shell has not registered
(`docs/08-i18n/KEYS.md`), which are not rendered today.

By family:

| Family | n over 90 | Can it be shorter? |
|---|---:|---|
| Other | 86 | mostly yes |
| Descriptive helper (`.desc`, `.help`, `.explain`) | 38 | **yes, most of the win is here** |
| Empty-state body | 27 | partly |
| Onboarding body | 26 | partly |
| **Refusal** | **22** | **no — must name permission and granter** |
| **Confirm body** | **14** | **no — §5.7 rule 9 requires the "what does not change" clause** |
| Error/status | 3 | yes |

**36 of the 216 are long because a rule makes them long.** A refusal that says
`{count} of the selected deductions cannot be applied. Ask an Owner for the "Captain
payouts" permission.` is 104 characters and every one of them earns its place: what was
refused, why, and who to ask. Same for a destructive confirm. **Leave all 36.**

### 2.1 The two passes, and why the difference matters

| Pass | Rule | Total before | Total after | Saved |
|---|---|---:|---:|---:|
| 1 — tighten wording only | keep every fact | 9,172 | 8,454 | **718 (8%)** |
| 2 — allowed to delete a fact | drop what the operator does not act on | 9,172 | 7,349 | **1,823 (20%)** |

In pass 1, **12 of 55 came out no shorter at all** and 5 came out longer. That is the
measurement: the sentences are not padded. The 20% in pass 2 is bought entirely by deciding
that certain facts do not belong on an operator's screen — chiefly, in the fourteen
`integrity.check.*.desc` strings, *how the check is implemented*. An operator needs to know
what a finding means and what to do about it, not that "this check opens every id in those
lists".

### 2.2 The fifty-five

Pass 2 values. Three are deliberately unchanged and marked; they are counted in the totals
so the arithmetic above is honest.

1. **`integrity.check.agree.aggregate-vs-records.desc`** · `admin/data/copy.ts:175` · **253 → 165** (−88)
   - was: A rider or captain whose stored trip total is larger than the trips on file is expected — this console keeps a recent window and billing keeps the lifetime. One whose stored total has nothing at all behind it is not, and that is what this check reports.
   - now: **Reports a stored trip total with no trips behind it. A total larger than the trips on file is normal: this console keeps a recent window, billing keeps the lifetime.**
   - Verdict first. The trailing clause restated the sentence it ended.

2. **`rb.alert.form.recipients.blocked`** · `reports/copy.ts:667` · **234 → 213** (−21)
   - was: Who else gets told cannot be chosen yet: an operator who cannot see this measure is not allowed to receive the alert, and permissions are not yet fine-grained enough to work that out. The people already on this rule keep getting told.
   - now: **Recipients cannot be chosen yet: an operator who cannot see this measure must not receive the alert, and permissions are not fine-grained enough to work that out. The people already on this rule keep getting told.**
   - Near-load-bearing. Two facts an operator acts on: why the control is dead, and that existing recipients are unaffected.

3. **`adminData.export.desc`** · `admin/data/copy.ts:267` · **222 → 162** (−60)
   - was: Exports a measure from the reporting layer over a window you choose. The file carries a header block naming the report, the window and the moment it was read, so the numbers stay attributable once they reach a spreadsheet.
   - now: **Exports one measure over a window you choose. The file names the report, the window and the moment it was read, so the numbers stay attributable in a spreadsheet.**
   - "from the reporting layer" and "a header block carrying" are implementation.

4. **`conversations.transfer.body`** · `conversations/copy.ts:107` · **215 → 211** (−4)
   - was: The operator you choose owns this conversation from the moment you confirm, and there is no undo. The thread, the waiting time and the customer are unchanged, and a note naming both of you is posted into the thread.
   - now: **The operator you choose owns this conversation from the moment you confirm. There is no undo. The thread, the waiting time and the customer are unchanged, and a note naming both of you is posted into the thread.**
   - **Load-bearing.** Destructive confirm; §5.7 rule 9 requires the unchanged clause. Only the sentence break moves, so "There is no undo" lands alone.

5. **`integrity.check.agree.party-name.desc`** · `admin/data/copy.ts:167` · **212 → 79** (−133)
   - was: Trips, subscriptions, tickets, payouts, holds and deductions each carry a copy of a person's name so a table can render without a second read. This check compares every copy against the record that owns the name.
   - now: **Every stored copy of a person's name, compared against the record that owns it.**
   - The list of six record types and the denormalisation rationale change nothing an operator does. Biggest single saving available in the product.

6. **`policy.reasons.desc`** · `admin/policy/copy.ts:152` · **209 → 187** (−22)
   - was: The closed vocabulary every cancellation, refund, suspension and dispute is coded against. A code is never deleted or renamed — retire it and name what replaced it, because historical records point at the key.
   - now: **The closed vocabulary every cancellation, refund, suspension and dispute is coded against. Records point at the key, so retire a code and name its replacement — never delete or rename it.**
   - Rule and reason merged; the reason now leads, because it is what makes the rule stick.

7. **`integrity.check.money.journal-balance.desc`** · `admin/data/copy.ts:195` · **203 → 127** (−76)
   - was: Debits equal credits on every entry, and both equal the total the entry states. An entry that does not balance is refused rather than written, so anything found here was written before that rule existed.
   - now: **Debits equal credits on every entry, and both equal the stated total. Anything found here was written before that rule existed.**

8. **`integrity.check.agree.escrow-amount.desc`** · `admin/data/copy.ts:171` · **200 → 125** (−75)
   - was: A subscription shows the escrow held against it; Financials holds the record of that escrow. This check compares the two amounts and reports a subscription still showing escrow that has been released.
   - now: **Compares the escrow a subscription shows against the record Financials holds, and reports escrow still showing after release.**

9. **`adminData.retention.desc`** · `admin/data/copy.ts:309` · **200 → 170** (−30)
   - was: How long each kind of record is kept before it is deleted or anonymised. Shortening a window destroys evidence you may still need — it must never be shorter than the payment provider's dispute window.
   - now: **How long each record is kept before deletion or anonymisation. Never set a window shorter than the payment provider's dispute window: it destroys evidence you still need.**
   - The prohibition now leads. One clause instead of two saying the same thing.

10. **`integrity.check.invariant.status-fields.desc`** · `admin/data/copy.ts:179` · **196 → 149** (−47)
    - was: A subscriber holds a subscription, a late trip carries its lateness, a suspended captain carries a reason, a cancelled subscription carries the moment it was cancelled. This check reads each pair.
    - now: **Reads each status against the field that must accompany it — a suspended captain's reason, a cancelled subscription's moment, a late trip's lateness.**
    - "A subscriber holds a subscription" is a tautology; the trailing sentence was a restatement.

11. **`admin.integrations.delivery.replay.confirm.body`** · `workspace/copy.ts:323` · **194 → 146** (−48)
    - was: The same payload is queued for {endpoint} as a new attempt. {id} stays in the log exactly as it is, including its status code and response — a replay does not undo a failure, it adds an attempt.
    - now: **The same payload is queued for {endpoint} as a new attempt. {id} stays in the log unchanged. A replay adds an attempt; it does not undo a failure.**
    - "including its status code and response" is covered by "unchanged".

12. **`admin.team.matrix.blocked`** · `admin/team/copy.ts:124` · **192 → 147** (−45)
    - was: This matrix is read-only. The role model and the permission set behind it are an open decision (D4 / Q4), and an editable matrix built against a guess would be wrong in a way nobody could see.
    - now: **This matrix is read-only. The role model behind it is an open decision (D4 / Q4), and an editable matrix built on a guess would be wrong invisibly.**
    - `D4 / Q4` kept pending the decision in §5.3 below.

13. **`integrity.check.money.trip-split.desc`** · `admin/data/copy.ts:187` · **187 → 151** (−36)
    - was: The fare, the captain's earnings, the extra-stop fee and the Eyvar cut are one identity. Money is whole halalas, so any remainder at all means one of the four was computed somewhere else.
    - now: **Fare, captain earnings, extra-stop fee and the Eyvar cut are one identity in whole halalas. Any remainder means one of the four was computed elsewhere.**

14. **`zones.steer.body`** · `zones/copy.ts:58` · **185 → 136** (−49)
    - was: Captains are independent — the offer is an invitation each one can accept or ignore. It runs for {hours} hours or until {cap} is spent, whichever comes first, and it cannot be extended.
    - now: **The offer is an invitation each captain can accept or ignore. It runs for {hours} hours or until {cap} is spent, and cannot be extended.**
    - "Captains are independent" restated the clause after it; "whichever comes first" is what "or" means.

15. **`fairness.empty.firstRun.body`** · `fairness/copy.ts:119` · **184 → 151** (−33)
    - was: A suspension appealed, a rating disputed, a rider reported. A high overturn rate here is not a failure — it means the appeal route is catching bad calls before they cost you a captain.
    - now: **A suspension appealed, a rating disputed, a rider reported. A high overturn rate is the appeal route catching bad calls before they cost you a captain.**
    - This is a first-run empty state and the warmth stays — it is one of the five licensed moments. What goes is the framing, not the reassurance.

16. **`adminData.integrity.desc`** · `admin/data/copy.ts:38` · **183 → 140** (−43)
    - was: Checks that compare what a record stores against the records behind it. Every finding names the check that produced it, so you can tell a real problem from a rule that has gone stale.
    - now: **Compares what a record stores against the records behind it. Every finding names its check, so a real problem reads apart from a stale rule.**

17. **`admin.integrations.key.empty.body`** · `workspace/copy.ts:170` · **181 → 118** (−63)
    - was: An API key lets a billing job, a partner portal or a warehouse export read and write through the same permissions your operators have. Each key carries only the scopes you grant it.
    - now: **An API key lets another system read and write through your operators' permissions, limited to the scopes you grant it.**
    - The heading above already says "Let another system call Eyvar"; the three examples restate it.

18. **`rb.cohort.grainUnavailable`** · `reports/copy.ts:274` · **175 → 163** (−12)
    - was: Retention is measured a month at a time, because each person carries one last-seen date and nothing finer. Day and week need an activity history the product does not keep yet.
    - now: **Retention is measured a month at a time: each person carries one last-seen date and nothing finer. Day and week need an activity history the product does not keep.**
    - **Near-load-bearing.** Names the constraint and why the finer grain is unavailable. Only "because" and "yet" go.

19. **`rb.alert.cadence.explain`** · `reports/copy.ts:636` · **174 → 141** (−33)
    - was: No checking schedule has been set for this product, and nothing checks these rules while the tab is closed. Until that is decided, a rule keeps its settings and does not run.
    - now: **Nothing checks these rules while the tab is closed. Until a schedule is decided for this product, a rule keeps its settings and does not run.**
    - Consequence first, and the duplicate statement of the missing schedule goes.

20. **`onboarding.intro.support`** · `onboarding/copy.ts:65` · **173 → 156** (−17)
    - was: You answer riders and captains, and you're the first person to hear when something goes wrong. You can see a safety incident and you cannot decide one — an Ops Manager does.
    - now: **You answer riders and captains, and you hear first when something goes wrong. You can see a safety incident and you cannot decide one — an Ops Manager does.**

21. **`rb.warning.funnelCounted`** · `reports/copy.ts:389` · **171 → 167** (−4)
    - was: These steps count totals rather than following the same people, because they are not all about the same kind of person. Read the percentages as a ratio between two totals.
    - now: **These steps count totals rather than following the same people, because they are not about the same kind of person. Read each percentage as a ratio between two totals.**
    - **Load-bearing.** The reader misreads the chart without both clauses.

22. **`integrity.check.money.payout-net.desc`** · `admin/data/copy.ts:199` · **168 → 119** (−49)
    - was: A deduction marked applied has moved money on the captain's payable, and a payout still marked due does not owe a negative amount. This check reads the ledger for both.
    - now: **Reads the ledger behind two claims: that an applied deduction moved money, and that a payout still due is not negative.**

23. **`onboarding.step.owner.position.body`** · `onboarding/copy.ts:162` · **167 → 140** (−27)
    - was: The trial balance and the contribution margin are the two numbers you'll be asked about. This is where they live, and this step is done when you can say them out loud.
    - now: **The trial balance and the contribution margin are the two numbers you will be asked about. This step is done when you can say them out loud.**
    - Removes the only portentous framing in the product.

24. **`admin.integrations.webhook.empty.body`** · `workspace/copy.ts:274` · **167 → 142** (−25)
    - was: A webhook endpoint receives a signed payload the moment a trip completes, a subscription lapses or a payout settles — so a partner system does not have to poll for it.
    - now: **A webhook receives a signed payload the moment a trip completes, a subscription lapses or a payout settles, so a partner system need not poll.**

25. **`admin.team.security.notWired`** · `admin/team/copy.ts:138` · **166 → 123** (−43)
    - was: The shell still expires a session against its own 30-minute constant. Saving here records the policy; wiring the shell to read it is a change to src/shell/session.ts.
    - now: **Saving here records the policy. The shell still expires a session on its own 30-minute constant and does not read this yet.**
    - **Cuts the file path.** An operator cannot open a source file; a developer reads the tracker.

26. **`onboarding.step.common.mywork.body`** · `onboarding/copy.ts:143` · **164 → 139** (−25)
    - was: Operations › My Work is where every queue reaches you. Claim something from Unassigned and release it again, so you learn what a claim is before you're holding six.
    - now: **Every queue reaches you in My Work. Claim something from Unassigned and release it again, so you learn what a claim is before you hold six.**

27. **`integrity.check.money.wallet-balance.desc`** · `admin/data/copy.ts:191` · **160 → 97** (−63)
    - was: The balance on a rider record and the closing balance of that rider's wallet ledger are meant to be the same number from the same source. This check reads both.
    - now: **Compares the balance on a rider record against the closing balance of that rider's wallet ledger.**

28. **`onboarding.step.support.profile.body`** · `onboarding/copy.ts:214` · **159 → 139** (−20)
    - was: One profile carries every piece of personal data the console holds about a person, across 11 record types. Open it only when the work in front of you needs it.
    - now: **One profile holds every piece of personal data about a person, across 11 record types. Open it only when the work in front of you needs it.**

29. **`integrity.check.ref.ledger-subject.desc`** · `admin/data/copy.ts:163` · **158 → 92** (−66)
    - was: A posting on a party account carries the id of that party, and belongs to a journal entry. This check opens both, and the posting a reversal says it reverses.
    - now: **Opens the party, the journal entry and the reversed posting that every ledger posting names.**

30. **`rb.funnel.duplicateStep`** · `reports/copy.ts:268` · **155 → 134** (−21)
    - was: Step {position} repeats an earlier step. Two identical steps convert at 100 %, which measures nothing — change its measure, or give it a filter of its own.
    - now: **Step {position} repeats an earlier step, and two identical steps convert at 100 %. Change its measure, or give it a filter of its own.**
    - "which measures nothing" is what 100 % already says.

31. **`integrity.check.invariant.counters.desc`** · `admin/data/copy.ts:183` · **155 → 128** (−27)
    - was: Open subscription slots follow from the cap minus the active ones; completed trips cannot exceed the trips a plan includes. This check does the arithmetic.
    - now: **Checks the arithmetic: open slots are the cap less the active ones, and completed trips cannot exceed the trips a plan includes.**

32. **`admin.workspace.legal.publishNote`** · `workspace/copy.ts:71` · **153 → 109** (−44)
    - was: Publishing a new version is not built here. Legacy kept a version history per document; this pane shows the version in force and who has not accepted it.
    - now: **This pane shows the version in force and who has not accepted it. Publishing a new version is not built here.**
    - The legacy-app comparison is a note to the rebuild team.

33. **`admin.integrations.delivery.desc`** · `workspace/copy.ts:290` · **153 → 122** (−31)
    - was: Every attempt Eyvar made, what the endpoint answered, and a replay for the ones that failed. A replay is a new attempt — the failed one stays in the log.
    - now: **Every attempt, what the endpoint answered, and a replay for the failures. A replay is a new attempt; the failed one stays.**

34. **`ticket.channel.unknownHelp`** · `tickets/copy.ts:102` · **149 → 120** (−29)
    - was: Nobody has contacted this customer yet, so there is no thread to reply into. Phone them and log the call, or open a channel from their profile first.
    - now: **No thread exists: nobody has contacted this customer. Phone them and log the call, or open a channel from their profile.**
    - Guidance survives intact; it was the point of the string.

35. **`safety.empty.firstRun.body`** · `safety/copy.ts:99` · **147 → 142** (−5)
    - was: An SOS from a moving car, a collision, a report against a captain or a rider — each one is claimed by a named person and worked through four steps.
    - now: **An SOS from a moving car, a collision, a report against a captain or a rider. Each is claimed by a named person and worked through four steps.**
    - Mostly a punctuation fix; this string is close to right already.

36. **`rb.dashboards.firstRun.body`** · `reports/copy.ts:516` · **147 → 128** (−19)
    - was: A dashboard is an ordered list of saved reports. It shows each one's current definition, so editing a report updates every dashboard that holds it.
    - now: **An ordered list of saved reports, each shown at its current definition — so editing a report updates every dashboard holding it.**

37. **`policy.reasons.empty.body`** · `admin/policy/copy.ts:193` · **147 → 130** (−17)
    - was: A reason code is the closed vocabulary operators pick from when they dispose of work. Without one, every disposition is free text nobody can count.
    - now: **The closed vocabulary operators pick from when they dispose of work. Without one, every disposition is free text nobody can count.**

38. **`integrity.check.ref.person-links.desc`** · `admin/data/copy.ts:151` · **145 → 89** (−56)
    - was: A rider record lists its subscriptions, its trips and its corporate account; a captain lists its trips. This check opens every id in those lists.
    - now: **Opens every id a rider or captain record lists — subscriptions, trips, corporate account.**

39. **`fairness.economics.upperBound`** · `fairness/copy.ts:99` · **144 → 139** (−5)
    - was: An engaged hour is time on trip. Waiting time needs captain-app telemetry this console does not receive, so every figure here is an upper bound.
    - now: **An engaged hour is time on trip. Waiting time needs captain-app telemetry this console does not receive, so every figure is an upper bound.**
    - Near-load-bearing: a caveat on a number an operator will quote.

40. **`fin.pricing.stageA.body`** · `financials/copy.ts:683` · **141 → 141** (0) — **UNCHANGED**
    - Load-bearing warning about a known data hazard. The first sentence ("Four stores price this product and they disagree") reads as an engineering note, but it is the fact that stops an operator trusting the panel. **Leave, or delete the whole string** — do not half-edit it.

41. **`onboarding.step.owner.pricing.body`** · `onboarding/copy.ts:165` · **131 → 121** (−10)
    - was: The console computes captain earnings four different ways and nobody has chosen one. That decision is outstanding, and it is yours.
    - now: **The console computes captain earnings four ways and nobody has chosen one. That decision is yours, and it is outstanding.**

42. **`admin.team.rota.notWired`** · `admin/team/copy.ts:148` · **124 → 67** (−57)
    - was: The top bar's "on call" chip is hardcoded to nobody and cannot read this yet. Reported; the change is one line in AppLayout.
    - now: **The top bar's "on call" chip cannot read this yet and shows nobody.**
    - **Cuts the class name and the work estimate.**

43. **`onboarding.step.owner.team.body`** · `onboarding/copy.ts:151` · **137 → 131** (−6)
    - was: One account holds manage_settings, and that key gates 39 of the console's 131 permission checks. Decide whether that is still acceptable.
    - now: **One account holds manage_settings, and that key gates 39 of the console's 131 permission checks. Decide whether that is acceptable.**
    - The raw key **stays**: §10.5 verbatim, and the step is about that key. This is the one legitimate machine identifier in operator copy, and doc 21 §4.1 already recorded it so nobody "fixes" it.

44. **`integrity.check.ref.trip-links.desc`** · `admin/data/copy.ts:143` · **136 → 104** (−32)
    - was: Every trip names a rider, a captain and a subscription. This check opens each of those ids and reports the ones that resolve to nothing.
    - now: **Opens the rider, captain and subscription every trip names, and reports the ids that resolve to nothing.**

45. **`integrity.check.ref.subscription-links.desc`** · `admin/data/copy.ts:147` · **136 → 102** (−34)
    - was: Every subscription names the rider who holds it and the captain who serves it. This check reports the ones whose ids resolve to nothing.
    - now: **Opens the rider and the captain every subscription names, and reports the ids that resolve to nothing.**

46. **`integrity.check.ref.money-party.desc`** · `admin/data/copy.ts:159` · **136 → 119** (−17)
    - was: Payouts, escrow holds and deductions each name a captain, and some name a rider, a subscription or a trip. This check opens all of them.
    - now: **Opens every party a payout, escrow hold or deduction names — a captain always, sometimes a rider, subscription or trip.**

47. **`integrity.check.ref.ticket-subject.desc`** · `admin/data/copy.ts:155` · **133 → 92** (−41)
    - was: A ticket names a rider, a captain or a corporate account. This check looks the id up in the collection the ticket says it belongs to.
    - now: **Looks up the rider, captain or corporate account a ticket names, in the collection it names.**

48. **`adminData.retention.window.help`** · `admin/data/copy.ts:315` · **132 → 105** (−27)
    - was: How much trip history this console holds per customer. Lifetime totals stay a labelled billing reference and are never rebuilt here.
    - now: **How much trip history this console holds per customer. Lifetime totals stay a labelled billing reference.**

49. **`admin.integrations.key.desc`** · `workspace/copy.ts:124` · **128 → 112** (−16)
    - was: What can call Eyvar, and with how much authority. A key is shown once when it is issued and identified by its prefix afterwards.
    - now: **What can call Eyvar, and with how much authority. A key is shown once when issued, and by its prefix afterwards.**

50. **`policy.cities.desc`** · `admin/policy/copy.ts:62` · **130 → 131** (+1) — **UNCHANGED IN SPIRIT**
    - was: Quick rides and subscription packages, switched per city. A switch turned off stops new work; it does not end work already booked.
    - now: **Quick rides and subscription packages, switched per city. Turning a switch off stops new work and does not end work already booked.**
    - **Load-bearing.** The second sentence is the fact operators get wrong. One character longer and clearer; take it or leave it, but do not shorten it.

51. **`pwa.install.body`** · `src/pwa/copy.ts:44` · **100 → 99** (−1)
    - now: **An installed window drops the browser toolbar and gives back about 90px, roughly another table row.**
    - Em-dash to comma.

52. **`myWork.empty.firstRun.body`** · `my-work/copy.ts:92` · **113 → 104** (−9)
    - was: Anything you hold, and anything nobody has picked up, from Requests to Safety — sorted by deadline, not by label.
    - now: **Anything you hold and anything unclaimed, from Requests to Safety, sorted by deadline rather than label.**

53. **`admin.integrations.reveal.warning.key.body`** · `workspace/copy.ts:206` · **213 → 163** (−50)
    - was: Eyvar stores only the prefix {prefix}. The rest is not stored anywhere and cannot be shown again — not by reopening this row, not by an export, and not by support. If it is lost, rotate the key to issue a new one.
    - now: **Eyvar stores only the prefix {prefix}. The rest cannot be shown again — not by reopening this row, not by an export, not by support. If it is lost, rotate the key.**
    - The tricolon stays. It is the one place in the product where repetition is the point: an operator will try all three.

54. **`admin.integrations.key.rotate.confirm.body`** · `workspace/copy.ts:158` · **194 → 181** (−13)
    - was: A new key is issued for {name} and shown once. The current key stops working immediately, so anything still using it will start failing. The name, the scopes and the usage history do not change.
    - now: **A new key is issued for {name} and shown once. The current key stops working immediately, so anything still using it fails. The name, the scopes and the usage history do not change.**
    - **Load-bearing destructive confirm.** Only the future perfect goes.

55. **`onboarding.step.finance.ledger.body`** · `onboarding/copy.ts:170` · **141 → 141** (0) — **UNCHANGED**
    - Learn the sign convention, and learn that a posted row is never edited — it is reversed by a second row. Nothing in Financials undoes itself.
    - **Load-bearing.** The second sentence is the mental model the step exists to install, and the em-dash there is introducing a definition (replace with a colon, keep the words).

### 2.3 Result, and why the 90-character threshold is the wrong target

**52 of 55 shorter. 1,823 characters removed. 20%.**

And after the most aggressive pass I could justify, the length distribution is:

| | after |
|---|---:|
| under 90 characters | **3** |
| under 100 | 7 |
| under 120 | 16 |
| still over 160 | 10 |

**52 of the 55 are still over 90 characters.** Rewriting all 216 the same way would move the
over-90 count from 216 to roughly 205, and would take about a fifth of the reading time out
of every one of them.

That is the real answer to *"is it as small as possibly possible"*. **90 characters is
roughly one fact.** These strings carry two to four, and each of those facts was put there
because an operator got something wrong without it — a confirm that did not say what stays
unchanged, a chart caption that let somebody read a ratio as a conversion, a retention
window somebody shortened below a dispute window. **Counting characters measures the wrong
thing here.** The metric that would improve this copy is *facts per string*, and lowering it
means moving a fact somewhere else — a second line, a details disclosure, a link — or
deciding the operator does not need it. Both are product-designer decisions.

The one place character count *is* the right metric is the toast, where R9 caps it at 60 —
and **there are zero violations.**

---

## 3. Clear in English

### 3.1 Vocabulary drift — the driver/captain problem is fixed in values and open in keys

**Zero occurrences of "driver" in any rendered string.** 331 strings say `captain`. The
earlier finding is closed on the surface.

**But 40 keys still say `driver`:**

```
perm.approve_drivers.name            = 'Captain applications'
account.permission.approve_drivers   = 'Approve and reject captain applications'
people.driverStatus.{active,underReview,suspended,pending}
sub.changeDriver.{title,desc,saveError,error,empty}
sub.{currentDriver,selectDriver,selectDriverLoading,selectDriverPlaceholder,driverOption}
trips.drawer.driverEarnings          = 'Captain payout'
profile.{field.driverEarnings,kind.driver}
rb.dim.driver.{city,vehicleClass,status}
pricing.{cancel.qrDriverFault,derived.driverShare,derived.driverEarns}
comms.audience.driver, adminData.integrity.entity.driver,
admin.integrations.{scope.approve_drivers,event.driverApproved},
admin.workspace.legal.driverAgreement, integrity.detail.danglingDriver,
requests.status.noDrivers, applicant.approvedDriver, command.entity.driver.{other,plural}
```

This is not cosmetic. **A translator works from the key when the English is ambiguous**, and
the glossary at `20-arabic-glossary.md` §3.1 deliberately lists `driver → سائق` as *"the
data layer's word"* alongside `captain → كابتن`. A translator handed `sub.currentDriver`
will render سائق and be wrong, and no reviewer reading only Arabic will catch it. Either
rename the keys, or add one line to §3.1: **"a key containing `driver` is a data-layer
artefact; translate the English value, never the key."** The second is free.

`profile.kind.driver` = `'Captain'` is the sharpest case: the key says driver, the value
says Captain, and it is a **display label for a record type**.

### 3.2 One string, several meanings — real collisions

**436 values are shared by more than one key** and 165 by three or more, which is mostly
correct and mostly good — `Cancel` under 23 keys is one word doing one job, and sharing it
is how the console stays consistent. Four reuses are not:

| Value | Keys | Problem |
|---|---|---|
| `Close` | `shell.layer.close`, `trips.drawer.close`, **`requests.action.expire`**, `safety.action.close`, `onboarding.close`, `admin.team.sessions.close`, `comms.editor.close` | **`requests.action.expire` is a button labelled `Close` that expires a request** — the rider is told nobody is available and an authorisation hold is released. Every other `Close` dismisses a surface. Two different consequences, one word. In Arabic إغلاق will be used for both and the ambiguity gets worse |
| `Claim` | `people.queue.claim`, `queue.claim`, 4 bulk actions, **`dispute.col.case`**, **`dispute.resolve.kind`** | Six are the **verb** "take ownership"; two are the **noun** "a monetary claim". §3.5 of the glossary flags this as the product's one true English homograph and resolves it in Arabic (استلام vs مطالبة) — but **the English never disambiguates**, so a column header reads `Claim` and a button reads `Claim` on the same screen |
| `Withdrawn` | `people.applicantStatus.withdrawn`, 4 status keys, **`fin.pricing.quick.no`** | `fin.pricing.quick.no` is the **"not offered"** value in a city × vehicle-class matrix (`fin.pricing.quick.yes` = `Offered`). "Withdrawn" implies somebody withdrew it. `Not offered` is the pair to `Offered` |
| `Reason` | 13 keys including **`fin.deduction.col.type`** | Key/value mismatch only. The column is correctly labelled `Reason`; the key says `type`. Harmless today, misleading to the next editor |

Also: `'Trips'` serves `fin.pricing.plan.col.execute`, and `'Active'` serves
`people.filter.value.suspended.false`. Both are key-name drift, not screen defects.

### 3.3 Verb drift across the `.action`/`.confirm` families

- `*.confirm` has **41 distinct values**, which is correct — a confirm button must name its
  act (`Approve application`, `Freeze subscription`, `Post adjustment`). But four are bare:
  `Apply` (×3 keys), `Confirm`, `Send`, `Continue`. §5.7 rule 2 permits `Cancel`, `Close`,
  `Done`, `Save`, `Discard` and nothing else. **`fin.deduction.apply.confirm` = `Apply` and
  `fin.bulk.apply.confirm.confirm` = `Apply` are confirm buttons on money movements that do
  not name the money.** → `Apply deduction` / `Apply {count} deductions`.
- `*.retry` has 5 values — `Try again`, `Load again`, `Read again`, `Run again`,
  `Load this measure`. This is **good** drift: each names what will be retried.
- `action.saving` — **closed.** Every call site now points at a screen-local key
  (`corp.action.savingPolicy`, `people.*`, `dispatch`, `sub.reassigning`). Doc 21 §4.3 is
  done.

### 3.4 Words the operator would not use

Only three strings, all in §1.3 above: `src/shell/session.ts`, `AppLayout`, `(D4 / Q4)`.
Everything else that looks like jargon is **domain** jargon an ops manager owns — *escrow*,
*halalas*, *masdar of a posting*, *trial balance*, *contribution margin*, *reason code*,
*idempotency* (absent, correctly). The product does not talk down and does not talk over.

### 3.5 Raw machine vocabulary — the reason-code defect is closed

`src/i18n/vocabulary/copy.ts` now supplies 47 `reason.*` labels and `reasonLabel()` resolves
them. `TicketsScreen.tsx:181` renders the label. `TicketDetailScreen.tsx:534–542` renders
the **label over a `font-mono` `<bdi>` of the code** — the established "human name and the
identifier behind it" shape, deliberately not repeated in the queue. **Correct, and the
`<bdi>` is the right call**: an underscore-joined LTR token would reorder against Arabic.

The 21 `perm.*.name` labels exist at `src/i18n/dictionaries.ts:198–218` and the refusals
quote them. `RouteStates.tsx` no longer renders a raw permission key. Both defects that
motivated doc 21 §4.1 are closed.

### 3.6 Title Case

**37 strings, not 12.** 22 are `subtab.*` destination names plus 8 echoes of the same names
in `myWork.queue.*`, `breakdown.queue.*` and `notice.action.*`, plus `Ops Manager`,
`Customer Support`, `Apache Parquet`, `JSON Lines`, `Economy and Comfort`, `Offer Comfort`,
`Offer Economy`, `Go to Trips`. **Applied with complete consistency** — every reference to
`Trip Assurance` capitalises it in all three files. Doc 21 §4.5 already raised this as one
product-wide naming decision worth ~30 test assertions and correctly declined to change it.
**Restated here with the corrected count so the decision is sized right: 30 destination
names, not 8 tabs.**

---

## 4. Clear in Arabic

`AR` is empty by decision (`AC-74`'s fixture, `DECISIONS.md`). Judged here: the **146-term
glossary**, the **21 permission names**, the **§9.6 rulings**.

**Overall: this is a strong document.** Part 1's eight rulings are correct and the "what it
means at the keyboard" column is the thing most glossaries omit. The R7 gender refinement —
that a verbal sentence with an interpolated noun **must be split into one key per noun** —
is the single most valuable line in it, and it is right. The iḍāfa consequence of R6 is
right and is the reason AC-75's concatenation ban is a grammar rule and not a tidiness rule.
The masdar table is correct on all 22 verbs, and three of its choices are better than the
obvious ones: **إفراج not إطلاق** for escrow release, **إسقاط not تنازل** for waive, and the
**تأييد / نقض** pair for uphold/overturn, which is the actual legal register a Saudi appeals
process uses.

### 4.1 Term by term — the twenty most-used

Frequency measured over the 4,563 strings.

| # | English | Uses | Arabic | Verdict |
|---:|---|---:|---|---|
| 1 | captain | 331 | **كابتن** | **Correct.** The market term in Saudi ride-hailing and what a captain calls himself. Rejecting سائق is the right call and the note explains why |
| 2 | trip | 175 | **رحلة** | **Correct.** Feminine, and R7's gender note flags it |
| 3 | rider | 153 | **راكب** | **Correct** |
| 4 | report | 141 | **تقرير** | **Correct**, but under-specified. The product has *a saved report* (تقرير), *a safety report against a captain* (بلاغ), and *a cash report* (تقرير نقدي / محضر). **بلاغ is the Saudi word for reporting an incident and it is missing.** `safety.*` and `fairness.*` both use "report" in that sense. **Add to Part 4** |
| 5 | subscription | 138 | **اشتراك** | **Correct** |
| 6 | claim | 88 | **مطالبة** / **استلام** | **Correct and well-resolved** — the best entry in Part 4 |
| 7 | ticket | 82 | **تذكرة** | **Correct.** Standard in Arabic support tooling |
| 8 | permission | 74 | **صلاحية** | **Correct term, incomplete instruction.** صلاحية also means *validity* and the glossary itself uses انتهاء الصلاحية for **expiry** (§3.6). A console showing both "Permissions" and "Document expiry" has one word doing two jobs. In practice the plural صلاحيات disambiguates permissions and the singular reads as validity. **State that convention or the collision ships** |
| 9 | hold | 72 | **حجز** | **Wrong, and it is the clearest defect in the glossary.** §3.2 lists `booking → حجز` and §3.4 lists `hold → حجز`. Part 4 resolves *hold (money)* against *hold (account suspension)* and never against *booking*. In a **ride-hailing** console حجز reads as a booking first, every time. Use **احتجاز** (the act of withholding) for escrowed money and leave حجز to booking. `fin.escrow.col.*` is where this lands |
| 10 | plan | 62 | **باقة** | **Correct, and the best judgement call in the document.** باقة is the telecom-derived commercial package every Saudi consumer knows. خطة would have read as a strategy. Part 4 correctly keeps خطة for a *report* plan |
| 11 | queue | 59 | **قائمة العمل** | **Right meaning, slightly long.** Rejecting طابور is correct — طابور is a physical line of people. قائمة المهام is the shorter idiom in Arabic ops tooling. Either works; قائمة العمل will wrap in a nav label at 1280 |
| 12 | payout | 56 | **مستحقات** | **Correct.** This is what a Saudi captain app calls it |
| 13 | operator | 53 | **مُشغِّل** | **Flag this one.** In Saudi transport regulation مُشغِّل means the **operating company** — a TGA-licensed fleet operator. A Riyadh ops manager reading مُشغِّل on a team roster will read "the operator company", not "the person at the desk". The glossary rejects مستخدم for a good reason, but مُشغِّل trades one ambiguity for a worse one. **موظف العمليات** or **المسؤول التشغيلي** is what an ops team actually calls itself. This term appears in 53 strings and in `perm.*` refusal copy |
| 14 | release | 51 | **إفراج** | **Correct**, and Part 4 correctly separates it from إصدار (publishing a version) |
| 15 | balance | 49 | **الرصيد** | **Correct**, and separating رصيد دائن for *credit* is right |
| 16 | deduction | 44 | **خصم** | **Collides, and Part 4 misses it.** خصم is the standard commercial word for **discount**, and the product has a `Discount %` field (`fin.planEditor`, 6 strings). Saudi payroll and GOSI usage for a deduction from earnings is **استقطاع**. Use استقطاع for deduction and leave خصم to discount. This lands on `perm.apply_deductions.name` (`خصومات الكباتن` → `استقطاعات الكباتن`) and on the whole `fin.deduction.*` family |
| 17 | suspend | 42 | **إيقاف** | **Correct for a captain and for surge.** But the glossary also uses إيقاف انتحال الهوية for *stop impersonating*, which is a different act. **إنهاء** there |
| 18 | conversation | 42 | **محادثة** | **Correct** |
| 19 | flagged | 40 | **مُعلَّم** | **Weak.** Undiacritised, مُعلَّم and مُعلِّم (teacher) are the same string, and the console flags a trip **for investigation**. **موسوم** is unambiguous; **مُحال للمراجعة** says what actually happens. `trips.toast.flagged.one` and the Flagged view both carry it |
| 20 | resolve / resolved | 39 | **حلّ** / **محلول** | **The masdar حلّ is correct; the adjective محلول is not.** محلول reads as *dissolved* or *a chemical solution*. A resolved ticket in Arabic support tooling is **تم الحل** or **مُغلق بالحل**. §3.10 lists it as a state adjective, which is exactly where it will be wrong — a status chip on `ticket.status.resolved` (6 keys share the value `Resolved`) |

### 4.2 Three more that would make a Riyadh ops manager stop

- **`exposure → فرص العمل` (§3.7).** فرص العمل is *job opportunities / employment* in every
  Saudi context, from Vision 2030 downwards. A Fairness column headed فرص العمل reads as
  "employment". **حصة التوزيع** (share of dispatch) or **نصيب الطلبات** is what is meant.
  Also: **"exposure" appears zero times in shipped copy.** The glossary spends an entry, and
  a wrong one, on a word the product does not use.
- **`impersonation → انتحال الهوية` (§3.1).** This is the criminal-fraud term — identity
  theft. An audit line reading انتحال الهوية says an operator committed fraud. **الدخول
  نيابةً عن** ("signing in on behalf of") is the product meaning. One occurrence in copy
  today, but it is an audit line, which is the one place a word gets read in anger.
- **`breach → إخلال` (§3.5).** Defensible — an SLA is a contract and إخلال بالعقد is the
  legal phrase. But as a **status chip** on a queue row, مُخِلّ reads like a finding of
  misconduct against the operator. **متجاوز الموعد** (past the deadline) is what the chip
  means. Keep إخلال in prose, use the plainer form in a badge.

### 4.3 The collision table is missing four collisions more frequent than several it lists

Part 4 has 22 rows. Measured against the copy, these four are live and absent:

| English words that collapse | Arabic | Uses | Why it matters |
|---|---|---:|---|
| **request** / **demand** / **application** | طلب | 71 + 36 + 69 | The glossary catches *request* vs *demand* (§3.2) and resolves it with حجم الطلب. It never mentions **application** — the captain onboarding application — which is also طلب. `perm.approve_drivers.name` is already keyed as **طلبات الكباتن**, which in Arabic reads equally as "captains' requests". Three English words, one Arabic word, on three different screens. Use **طلب انضمام** for an application |
| **case** / **status** / **state** | حالة | 21 + 36 + 30 | `dispute.col.case` and `people.col.status` both become حالة. Six English keys already share the literal value `Status`. Use **قضية** or **ملف** for a fairness case |
| **record** / **log** / **audit trail** | سجل | 66 + 35 + 26 | سجل التدقيق is already the glossary's *audit trail*. **record** has 66 uses and no entry at all. A bare سجل on `integrity.*` will read as "the log" |
| **deduction** / **discount** | خصم | 44 + 6 | §4.1 row 16 |

Also **absent entirely, with their use counts**: `record` (66), `application` (69),
`account` (39 — three senses: ledger account, corporate account, user account), `check`
(41 — an integrity check; تحقُّق is already taken by *verification*), `cash` (35),
`profile` (29 — and `perm.view_profiles.name` already renders الملفات الشخصية in doc 21,
so the term exists outside the glossary), `reference` (33), `funnel` and `cohort` (Report
Builder, no Arabic), `erasure` / `anonymise` (Saudi PDPL uses **إتلاف** and **إخفاء
الهوية**, and getting these wrong on a retention screen is a compliance exposure, not a
style one), `ZATCA` (named in `adminData.retention.days.1825`; هيئة الزكاة والضريبة
والجمارك).

### 4.4 The 21 permission names

All twenty-one Arabic names are grammatically correct noun phrases and the note explaining
why R6's masdar ruling does not bite is right. Two corrections, both consequential because
**these strings are quoted verbatim inside every refusal**:

- **`view_admin` → `الوصول إلى المسؤول`.** This says "access to the administrator" — access
  to a *person*. The workspace is called Admin; the name wanted is **الوصول إلى الإدارة**
  (access to administration) or, to distinguish it from `view_analytics`
  (الوصول إلى الإدارة, already taken for *Management*), **الوصول إلى لوحة المسؤول**. As it
  stands two of the six `view_*` permissions are near-homographs in Arabic and the refusal
  copy names one of them.
- **`apply_deductions` → `خصومات الكباتن`** reads as *captains' discounts*. → **استقطاعات
  الكباتن**, per §4.1 row 16.

`release_escrow → الإفراج عن الضمان` is correct as written, but inherits the ضمان question:
ضمان alone is *guarantee / warranty*. Saudi banking says **حساب الضمان** for the account and
**المبلغ المحتجز** for the money. The glossary half-acknowledges this in §3.4 and then uses
the bare form everywhere. **Decide once.**

### 4.5 The refusal template in Arabic

```
'refusal.permission': 'لا يمكنك {act}. اطلب صلاحية «{permission}» من المالك.'
```

Correct: `«»` in the template not in JSX, `{permission}` resolving through `perm.*.name`,
the terminal period last (R2), `{act}` as a per-site key rather than a parameter. **One
addition:** `من المالك` is definite ("from *the* owner") where the English is `an Owner`.
If more than one Owner exists, من أحد الملاك is the accurate form and the operator will not
go looking for a specific person. Small, and exactly the kind of thing that is unfixable
once 4,563 keys are translated around it.

---

## 5. Enough guidance

Separate axis from clarity: where does the copy say **what happened** but not **what to do
next**?

### 5.1 The systemic gap — five refusals rendered as a `title` attribute

```
src/screens/queues/queue.tsx:329, :351, :398    title={blocked ? reason : expiry}
src/screens/financials/cash/CashScreen.tsx:519, :528   title={blocked ? reason : undefined}
```

Every one of these is on a **`disabled`** button. A disabled button does not fire pointer
events in most browsers, so the native tooltip frequently never appears at all; and no
screen reader announces `title` on a disabled control. **The operator sees a grey `Claim`
button and is told nothing** — not what is refused, not why, not who to ask.

The refusal text behind them is good. `queue.owner.heldBy` names the person holding the
item. `gate.reason` resolves the permission refusal. All of it is discarded by the
rendering. `src/components/table/rowActions.tsx:161` already documents this shape as the
defect and does it properly with `aria-describedby`; these five bypass it. Doc 21 §4.2
listed a different five sites, and those are fixed — **these five are new or were missed.**
`design/12-refusal-and-undo-surfaces.md` D17 clause 3, §8.4.4 and §5.7 rule 7 all forbid it.

**This is the one finding in this document that costs an operator time today.**

### 5.2 One refusal does not name its permission

```
queue.action.noPermission = 'You cannot claim or dispose of work in this queue.
                             Ask an Owner for the permission this queue needs.'
```

Every other refusal in the product names the permission in quotes. This one says *"the
permission this queue needs"* — which is precisely the sentence doc 21 §1.1 was written to
abolish. It is the shared queue component, so the permission is not statically known; the
fix is a parameter, not a rewrite: `Ask an Owner for the "{permission}" permission.` with
the gate passing `t(\`perm.${gate.permission}.name\`)`. **The names already exist.**

### 5.3 An empty state that instructs, with the button removed

`src/screens/admin/team/AdminTeamScreen.tsx:859`

```
actions={canWrite ? [{ label: t('admin.team.invite'), ... }] : []}
```

An operator without `manage_team` sees:

> **Everyone who can sign in, and what each may do**
> Invite the people who run dispatch, finance and support. Each one gets a role, a
> permission set and a compensation cap.

…and no button, and no explanation. The body **issues an instruction the reader cannot
follow**. Same shape in `ApiKeysCard.tsx:353`, `WebhooksCard.tsx:197` and
`ReasonCodesCard.tsx:353`. Four sites. The fix is the refusal grammar in the empty state's
place of the action: `You cannot invite operators. Ask an Owner for the "Team
administration" permission.` — `admin.team.refusal.noPermission` already exists.

### 5.4 Fifty-three toasts name a class, not the instance

§5.7 rule 5 is *echo the object exactly*, and `docs/ref/copy.md`'s own rewrite table turns
`OK` into `Archive drivers`. The product does this well in places —

```
subs.toast.cancelled   = 'Subscription cancelled — {amount} refunded'
dispute.toast.resolved = '{id} settled — {amount} credited to {name}'
trips.toast.flagged.undone.one = 'Flag reverted on {id}'
```

— and not at all in others. **131 toast keys. All 131 are under 60 characters, so R9 is
clean with zero violations. 73 carry a parameter; 58 do not, and 53 of those 58 act on a
single named record.** The worst of them:

| Key | Now | Should name |
|---|---|---|
| `fin.payout.toast.paid` | `Payout sent` | the captain — doc 21 §4.4 raised this and it is still open |
| `fin.escrow.toast.released` | `Escrow released` | the hold, or the captain credited |
| `fin.deduction.toast.applied` / `.waived` | `Deduction applied` | the captain |
| `fin.cash.toast.resolved` / `.escalated` | `Report resolved` | the report reference |
| `conversations.toast.closed` | **`Closed`** | one word; the worst offender |
| `conversations.toast.reopened` | **`Reopened`** | |
| `conversations.toast.transferred` | **`Transferred`** | not even who to |
| `queue.toast.claimed` / `.released` / `.takenOver` | **`Claimed`** / **`Released`** / **`Taken over`** | the item |
| `safety.toast.closed` | `Incident closed` | the incident id |
| `subs.toast.frozen.one` | `Subscription frozen` | the subscription |
| `assurance.toast.confirmed` / `.offered` / `.waived` | `Confirmation recorded` | the leg / the captain |
| `zones.toast.steered` | **`Offer live`** | the zone |

`Closed` is `Done` with a different word. In a console where an operator may have three
conversations open and closes the wrong one, a toast that names the object is the undo
affordance.

Bulk toasts (`Payouts sent`, `Deductions applied`) are **correct as they stand** — the
object is the selection and the confirm dialog above named its count.

### 5.5 Errors without a fix

426 error-shaped strings scanned. The overwhelming majority name an imperative fix
(`Try again`, `Sign out and back in to change your second factor`, `Enable it above, then
replay`). A residue does not, and they cluster in one shape — a passive load failure with
no retry named:

```
admin.activity.error                    = 'The activity log could not be loaded.'
admin.integrations.delivery.error       = 'The delivery log could not be loaded.'
account.twoFactor.error                 = "Couldn't load your second factor."
account.field.unavailable               = "Couldn't be read"
```

Each of these sits beside a retry control in the component, so an operator is not stuck —
but §5.7 rule 4 says an error *is* an imperative that names the fix, and the product's own
model is `state.pageError` + `Try again`. → `The activity log didn't load. Try again.`

`admin.integrations.delivery.refusal.succeeded` = *"This one was delivered. Only a failed
attempt is replayed."* is the pattern to copy: what happened, and the rule that explains why
there is nothing to do.

### 5.6 Confirmations that do not say what stays the same

25 confirm families carry a body. **19 name what does not change** — which is §5.7 rule 9,
and a 76% hit rate on the hardest rule in the file is good. Six do not:

| Key | Body | What is missing |
|---|---|---|
| `admin.team.confirm.revoke` | The link stops working and the record is removed. Nothing they have done is affected, because they have never signed in. | Actually compliant — my scan missed the phrasing. **No action** |
| `assurance.confirm` | The leg is marked confirmed and leaves the confirmation queue. The captain is not notified from here. | Compliant. **No action** |
| `comms.editor.confirm` | {name} is sent by a live system event and has been sent {count} times. Saving changes what customers receive from the next send onwards. | **Real gap.** Does not say that messages already sent are unaffected — which is the exact anxiety an operator has when editing a live template |
| `fin.bulk.apply.confirm` | Each amount comes off its own captain payable balance. Anything a payable cannot cover becomes cash receivable rather than being written off. | **Real gap.** Money-moving bulk action. Says what happens to the money, never what happens to the captains, the trips or the deduction records |
| `fin.pricing.surge.suspend` | Fares in the zone return to the base rate until it ends. A suspension cannot be extended — it is raised again. Nothing already priced changes. | Compliant. **No action** |
| `fin.planEditor.banner.rejected` | — | A banner, not a confirm. **No action** |

**Two real gaps, both in money.** `fin.bulk.apply.confirm` is the more serious: it is the
one bulk money action whose confirm does not state its blast radius.

### 5.7 Two long jobs still end in silence

Doc 21 §4.7 raised it and it is open. `rb.canvas.loading` = `Running the report` and
`rb.export` = `Export CSV` have no completion line. The model already exists and is good —
`adminData.integrity.runSummary.clean` leads with `Every check passed.` **Two keys.**

---

## 6. What I would fix first

Ordered by cost to an operator, not by count.

0. **`overview.empty.action` = `Go to Trips`, which no longer exists.** Landed after this
   assessment was measured; see the addendum. One string, and it is the first control a new
   operator is offered.
1. **The five `title`-attribute refusals** (`queue.tsx` ×3, `CashScreen.tsx` ×2). An
   operator is blocked with no explanation, today. Component change; not a copy change.
2. **`queue.action.noPermission` must name its permission.** One parameter; the names exist.
3. **The four empty states that instruct and then remove the button.** Show the refusal where
   the action would be.
4. **The 30 unnamed toasts**, starting with `conversations.toast.{closed,reopened,transferred}`
   and `queue.toast.*`. Some need a call-site parameter, which makes them the
   product-designer's and the engineer's, not a copy edit.
5. **`fin.bulk.apply.confirm` and `comms.editor.confirm`** — add the unchanged clause.
6. **Three dev-speak strings** — delete the file path, the class name, and decide on `D4 / Q4`.
7. **The four Arabic collisions** (`hold`/`booking`, `deduction`/`discount`,
   `request`/`demand`/`application`, `case`/`status`) and the three terms that misread
   (`operator`, `exposure`, `impersonation`) — before any translation starts, because they
   are free now and cost 4,563 keys later.
8. **The 36 tic em-dashes and the 39 class-B label separators.** Mechanical, low value, do
   it last, and do it as one commit so the diff is reviewable.
9. **The Title Case decision** (30 destination names). Product-owner's, per doc 21 §4.5.

**Not recommended:** a general shortening pass. The 8% result of the wording-only rewrite is
the evidence. Shortening this copy further means deciding an operator does not need a fact,
and that is a decision per string, not a policy.

---

## Addendum — re-measured 2026-09-02 12:34

The dictionary was edited by another agent while this assessment was being written
(`src/i18n/dictionaries.ts` 12:08, `src/screens/operations/trips/copy.ts` 11:49, against a
snapshot taken 11:32). Re-extracted and diffed rather than assumed.

**No headline count moved.** 4,563 → **4,566** keys. Em-dash strings **117**, unchanged.
Over 90 characters **216**, unchanged. Over 120 **101**, unchanged. Five keys added, two
removed, **zero existing values changed** — so every quotation, rewrite and count in §1–§5
above still holds.

The change is that **Operations › Trips has been split in two:**

```
- subtab.operations.trips         'Trips'
- subtab.operations.trips.sub     'Every trip taken, and the ones that went wrong'
+ subtab.operations.quickRides            'Quick rides'
+ subtab.operations.quickRides.sub        'One-off journeys, and the ones that went wrong'
+ subtab.operations.subscriptionTrips     'Subscription trips'
+ subtab.operations.subscriptionTrips.sub 'Journeys taken against a standing plan, and the
                                           ones that went wrong'
+ trips.open.payment                      'Open the 360° profile for payment {id}'
```

Both new labels are sentence case, so they do **not** add to §3.6's Title Case set — the
right call, and worth recording as a precedent: **the newest destination names in the
product are sentence case.** That is evidence for resolving §3.6 downwards rather than
ratifying 30 proper nouns.

Two consequences, both new findings:

1. **`overview.empty.action` = `Go to Trips` now names a destination that does not exist.**
   `src/screens/metrics/copy.ts:130`. It is the action button on the Overview first-run
   empty state — the first thing a new operator is offered — and it points at a sub-tab
   that has been replaced by two. Whichever it should now go to, the label must be one of
   `Go to quick rides` or `Go to subscription trips`. This is exactly the failure §5.7
   rule 5 exists to prevent: a control naming an object by a name the product no longer
   uses. **Highest-priority copy defect in the tree as of this timestamp.**

2. **`Quick rides` now labels both a nav destination and a filter inside it.** Three keys
   share the string: `subtab.operations.quickRides` (the sub-tab), `view.trips.quickRides`
   (a saved view), `view.pricing.quickRides` (a pricing view). Before the split none of the
   six sharers was a destination. An operator told "check Quick rides" can no longer tell
   whether that means the sub-tab or the view inside it. This is a sharper instance of the
   §3.2 reuse problem and should be resolved the same way — by meaning, not by preference.

Also stale, though not operator-facing: `src/screens/operations/trips/copy.ts:2` still
documents itself as `Operations › Trips`.

**Method note for whoever re-runs this.** The counts above are reproducible by importing
`EN` from `src/i18n/dictionaries.ts` in a throwaway vitest file and serialising it; grepping
`copy.ts` for em-dashes gives 10,462 across `src/` and answers a different question, because
~9,300 of those are in comments.
