# Rate card — the copy sheet

**Scope.** Every string an operator reads on Financials › Pricing & Plans › **Rate card**:
`RateCardBlock.tsx`, `SurgeCards.tsx`, the page banner raised by `PricingScreen.tsx`, and the
two suspension-reason literals in `src/data/fixtures/pricing.ts` that reach the Reason column.

**Status.** A spec. **Nothing in this document has been applied.** A frontend engineer applies
it to `src/screens/financials/copy.ts` and `src/i18n/ar/financials.ts` in one commit, then runs
`npm run i18n:keys` and `npx vitest run src/screens/financials/pricing/rateCard.test.tsx`.

**Evidence.** Every current string is cited by file and line. The rendered page is
`scripts/harness/shots/rate-card-light-en-live.png`,
`…-en-draft-unmodelled.png` and `…-light-ar-live.png`; where I claim something wraps or repeats
on screen, that is what I read off those three shots.

**What is not mine.** Layout, the number of rungs in a table head, whether a card gains an
`InfoHint` — the product-designer's, and the rows below that need one are marked
**designer's assent**. The data-layer shape of `RateCardClass.label` is the engineer's.

---

## 1. The rulings, up front

| # | Question | Ruling |
|---|---|---|
| 1 | The Suspend surge panel says everything twice | **The heading names the object, the button names the act, and the instruction is stated once — on the refusal line, where it changes what the operator does.** `…suspend.heading` becomes `Surge by district`; `…suspend.subtitle` and `…suspend.chosen` are **deleted**. The button keeps `Suspend surge`, because the confirm dialog echoes it (`copy.md` rule 5) |
| 2 | `(SAR)` five times in one header row | **Keep the unit in the table head, state it once, and stop repeating it per column** — a unit rung carrying one `<bdi>`-isolated `SAR`, and the five labels drop their suffix. This is a **deviation from §8.3.1** and needs one line in `docs/RULINGS.md`; the exact text is in §5. If the owner refuses, the labels stay as they are and the engineer still has a defect to fix: the header is **not** `<bdi>`-isolated (`RateCardBlock.tsx:414`), which glossary R4 requires of every Latin token in an Arabic string |
| 3 | Em dashes | **3 distinct operator-facing strings** carry U+2014 on this view, across **4 source literals** (5 counting the Arabic twin). Two are fixture suspension reasons, one is a dictionary value. Rewritten in §6 and §4.4. The generator reads dictionaries only, so **nothing catches the fixture pair** |
| 4 | Labels that restate their value | Split verdict. `Modelled on {trips} trips` restates the heading two lines above it — **cut**. `Guardrails a card is checked against.` defines the heading and does not change what the operator does — **cut to the half that does**. `Rider bill before` / `Rider bill after` are **earning their line and do not change**: each names its object, and the repetition is visual, not semantic — a grouping problem, which is the designer's |
| 5 | `This card prices every trip today. Editing waits on the pricing owner decision.` | **Deleted.** Sentence one restates the `Live` badge and the effective line directly above it. Sentence two is the page banner, said a second time twelve lines down — R10 allows one banner, and a footnote repeating it is that banner's second copy. `…footer.superseded` keeps only the half that is said nowhere else |
| 6 | The banner | **Rewritten to what the operator may and may not do.** The ownership dispute is removed: an operator who has never heard of Q7 learns nothing from *"Four stores price this product and they disagree"* except that the org is stuck. The title also drops from 10 words to 3, which takes the X18 word-budget ratchet **down by one** |

**One finding outranks all six.** On this view a permission refusal reads **"You cannot pay a
captain. Ask an Owner for the “Captain payouts” permission."** — `useWriteGate`
(`FinancialsPage.tsx:121`) hands every Financials screen `fin.payout.blocked.permission`
(`copy.ts:335`), and the Rate card view renders it under **Suspend surge**
(`SurgeCards.tsx:298`) and under **Approve** (`RateCardBlock.tsx:374`). There is no captain and
no payout on this screen, and the permission this sub-tab actually gates on is `manage_plans`
(`routeTable.ts:788`), not `process_payouts`. A test currently pins the wrong sentence in place
(`rateCard.test.tsx:591`). Fixed in §4.5.

---

## 2. The banner (item 6)

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.stageA.title` | `Prices are read-only until the rate card owner is decided.` (`copy.ts:722`) | `Prices are read-only` | `الأسعار للقراءة فقط` | 10 words against X18's 4-word title budget — it is one of the 145 keys in the ratchet (`docs/08-i18n/KEYS.md:346`). The subordinate clause is org process, not a fact the operator can act on |
| `fin.pricing.stageA.body` | `Four stores price this product and they disagree. A plan's catalogue is editable; its rates, commission and discount are shown as they stand.` (`copy.ts:723`) | `You can edit a plan's catalogue. Rates, commission, discount and every rate card are read-only.` | `يمكنك تعديل كتالوج الباقة. أما التعرفة والعمولة والخصم وكل جداول التعرفة فللقراءة فقط.` | Says what they can do, then what they cannot, and names all four objects. `Four stores … they disagree` is an engineering fact about the backend; `shown as they stand` is a euphemism for read-only |

**The escalation clause, considered and rejected.** A refusal should name who can lift it. Here
nobody can — that is the whole of Q7 — so naming a team would send the operator into the loop
the dispute already is. The moment Q7 is answered this body gains a third sentence:
`Ask {owner} for a rate change.` Raised to the product-owner, not decided here.

---

## 3. The rate-card block

### 3.1 The rail

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.rail.from` | `From {date} · no end set` (`copy.ts:764`) | `From {date}` | `من {date}` | The pane header, sitting beside the selected row, already reads `Effective from 1 Apr · no end set` (`copy.ts:769`). The rail is the index and the pane is the record: `· no end set` is a property of the record, stated once. A superseded card still reads as a range, so the two shapes stay distinguishable |
| `fin.pricing.rateCard.rail.delta` | `Bill {delta}` (`copy.ts:766`) | `Rider bill {delta}` | `فاتورة الراكب {delta}` | `Bill` alone names nothing — the pane calls the same number `Rider bill before` / `after`. One object, one name, on both surfaces |
| `fin.pricing.rateCard.rail.range` | `{from} – {to}` (`copy.ts:765`) | **unchanged** | unchanged | En dash, numeric range. Correct under `copy.md` 12 |
| `fin.pricing.rateCard.rail.notModelled` | `Not modelled` (`copy.ts:767`) | **unchanged** | unchanged | Two words, states the absence in words |

### 3.2 The pane header

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.stat.consumerPrices` → rename to `…stat.riderPrices` | `Consumer prices` (`copy.ts:772`) | `Rider prices` | `أسعار الراكب` | `consumer` is not a word this product uses of a person and collides with an economics term. The glossary's word is **rider / راكب** (`20-arabic-glossary.md` §3.1), and the same pane says `Rider bill`. Key renamed so it does not lie about its value |
| `fin.pricing.rateCard.vat.included` / `.excluded` | `VAT included` / `VAT not included` (`copy.ts:773–774`) | **unchanged** | unchanged | The value states the fact the label asks about. `VAT` stays Latin (glossary R4) |
| `fin.pricing.rateCard.stat.onDemand` / `.subscription` | `Commission, on demand` / `Commission, on a plan` (`copy.ts:770–771`) | **unchanged** | unchanged | Noun plus qualifier, survives Arabic word order |
| `fin.pricing.rateCard.effective.noEnd` / `.effectiveUntil` | `Effective from {date} · no end set` / `Effective {from} to {to}` (`copy.ts:769`, `:759`) | **unchanged** | unchanged | With the rail trimmed, this is the only place the qualifier is stated |

### 3.3 The class table — item 2

Applies **only if the owner ratifies the deviation in §5**. If they do not, the five labels stay
exactly as they are and only the `<bdi>` fix in §5 is taken.

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.col.base` | `Base (SAR)` (`copy.ts:777`) | `Base` | `الأساسية` | The unit moves to the rung |
| `fin.pricing.rateCard.col.perKm` | `Per km (SAR)` (`copy.ts:778`) | `Per km` | `لكل كم` | as above |
| `fin.pricing.rateCard.col.perMin` | `Per minute (SAR)` (`copy.ts:779`) | `Per minute` | `لكل دقيقة` | as above. Wraps to two lines at 1280 today, in both languages |
| `fin.pricing.rateCard.col.minFare` | `Minimum (SAR)` (`copy.ts:780`) | `Minimum` | `الحد الأدنى` | as above. `الحد الأدنى (SAR)` is the exact string shape `docs/ref/i18n.md` records truncating to `الدين النقدي (R…` in a Payouts header at 1440 |
| `fin.pricing.rateCard.col.cancelFee` | `Cancellation (SAR)` (`copy.ts:781`) | `Cancellation` | `الإلغاء` | as above. Wraps today |
| `fin.pricing.rateCard.table.unit` | — **new** | `SAR` | `SAR` | The one visible unit token, `<bdi>`-isolated, spanning the five money columns. A key rather than a literal so CLAUDE.md rule 7 holds; both dictionaries carry the same Latin value, which glossary R4 requires |
| `fin.pricing.rateCard.table.caption` | `Per-class rates on rate card {version}` (`copy.ts:775`) | `Per-class rates on rate card {version}. All figures in SAR.` | `أسعار كل فئة في جدول التعرفة {version}. القيم كلها بـ SAR.` | The visually-hidden caption is where a screen-reader operator must get the unit, since a `colspan` rung announces poorly |
| `fin.pricing.rateCard.col.class` | `Class` (`copy.ts:776`) | **unchanged** | unchanged | |

**Two class names reach the screen with no key at all.** `RateCardClass.label`
(`src/data/types/pricing.ts:94`) is a raw `string`; the fixture ships `Economy` and `Comfort`
(`fixtures/pricing.ts:150`, `:163`) and `RateCardBlock.tsx:422` renders it untranslated. This is
F-RC-3 again — the defect already fixed for `SurgeWindow.days` — one type along. The Arabic
already exists in the quick-ride fixture (`fixtures/pricing.ts:309`, `:318`).

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.class.economy` | `Economy`, rendered raw (`fixtures/pricing.ts:150`) | `Economy` | `اقتصادية` | An Arabic operator reads English here today |
| `fin.pricing.rateCard.class.comfort` | `Comfort`, rendered raw (`fixtures/pricing.ts:163`) | `Comfort` | `مريحة` | as above |

Engineer: a `classLabel(t, id)` map at the render site, exactly the shape `dayLabel`
(`SurgeCards.tsx:214`) already uses. The data layer does not change. If a third class ships, the
key is added with it.

### 3.4 Modelled impact — item 4

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.impact.trips` | `Modelled on {trips} trips` (`copy.ts:789`) | `Trips: {trips}` | `الرحلات: {trips}` | `Modelled on` restates the heading `Modelled impact` two lines above. It also reads `Modelled on 1 trips` at a count of one; `noun: {count}` is correct at every count in both languages and costs no plural family (`docs/ref/i18n.md`, "Plurals") |
| `fin.pricing.rateCard.impact.ranAt` | `Run {date}` (`copy.ts:790`) | `Run: {date}` | `التشغيل: {date}` | Made parallel to its neighbour on the same rung; the two are separated by `·` at `RateCardBlock.tsx:472` |
| `fin.pricing.rateCard.impact.before` | `Rider bill before` (`copy.ts:791`) | **unchanged** | unchanged | **Earning its line.** Shortening to `Before` / `After` would leave two SAR figures under `Modelled impact` that could be read as revenue. Naming the object twice is the correct trade in money software; the visual repetition is a grouping problem — **designer's** |
| `fin.pricing.rateCard.impact.after` | `Rider bill after` (`copy.ts:792`) | **unchanged** | unchanged | as above |
| `fin.pricing.rateCard.impact.none` | `Not modelled against any trip. A card nobody modelled cannot be approved.` (`copy.ts:795`) | `Not modelled against any trip.` | `لم يُنمذَج على أي رحلة.` | The second sentence is a refusal, and it is stated in the wrong place. On `rate-card-light-en-draft-unmodelled.png` the operator reads *"cannot be approved"* here and then a **different** reason on the control itself, seven lines down. A sentence that changes what the operator does next belongs on the control (`copy.md` X15); this string also renders on live and superseded cards, where approval is not in question at all |
| `…impact.caption.past` / `.future` | `Measured against the card this one replaced.` / `…would replace.` (`copy.ts:793–794`) | **unchanged** | unchanged | Earning their line: they say what the delta is measured against, which nothing else says |

### 3.5 Floors — item 4

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.floors.caption` | `Guardrails a card is checked against. Nothing enforces them yet.` (`copy.ts:800`) | `Nothing enforces these yet.` | `لا شيء يفرض هذه الحدود بعد.` | Sentence one defines the heading; sentence two changes what the operator does with the numbers. X15's test: delete sentence one and the operator acts the same. It also wraps to three lines in a one-third column today |
| `fin.pricing.rateCard.floors.hint` | — **new, conditional** | `The guardrails a rate card is checked against before it is approved.` | `الضوابط التي يُقاس عليها جدول التعرفة قبل اعتماده.` | **Designer's assent.** Only if an `InfoHint` is added beside the `Floors` heading. `Floors` is jargon and the definition is worth keeping somewhere; if the designer declines, this row is dropped and the definition is simply gone |
| `…floors.heading` / `.margin` / `.fee` / `.support` / `.reserve` | `Floors`, `Target margin`, `Payment fee`, `Support per subscriber`, `Emergency reserve` (`copy.ts:799–804`) | **unchanged** | unchanged | Each names its own figure. `Support per subscriber` wraps to two lines at this width — **designer's**, not a wording problem |

### 3.6 The pane footer — item 5

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.footer.live` | `This card prices every trip today. Editing waits on the pricing owner decision.` (`copy.ts:811`) | **DELETE** | — | Two unrelated facts, both already on screen. *"prices every trip today"* is the `Live` badge and `Effective from 1 Apr · no end set`, four lines up. *"Editing waits on the pricing owner decision"* is the page banner, twelve lines up — and it is about an internal decision process, which is not a fact an operator can act on. **Consequence:** `rateCard.test.tsx:383` and the design doc's live-state row lose their assertion; the AC needs amending by whoever owns it |
| `fin.pricing.rateCard.footer.superseded` | `This card priced trips until {date}. It is kept for the trips it priced.` (`copy.ts:813`) | `Kept for the trips it priced.` | `يُحفظ للرحلات التي سعّرها.` | Sentence one is the badge and the effective range again. Sentence two answers the only question the pane raises — why a dead card is still listed — and is said nowhere else |

### 3.7 The Approve refusal

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `…approve.blocked.stage` | `Approving a rate card waits on the pricing owner decision.` (`copy.ts:810`) | `Nobody can approve a rate card yet, whatever their permissions.` | `لا يستطيع أحد اعتماد جدول تعرفة بعد، مهما كانت صلاحياته.` | The operator's question at a disabled button is *"is it just me?"*. The current line answers with org process; this answers the question and closes the "what can I do instead" clause honestly — nothing, and there is nobody to ask. Arabic comma `،` per glossary R1 |
| `…approve.blocked.proposer` | `You proposed this card. Another approver signs it off.` (`copy.ts:808`) | **unchanged** | unchanged | **Earning its line.** What was refused, why, and who does it instead — the three parts, in ten words |
| `…approve.blocked.simulation` | `Model this card against real trips before approving it.` (`copy.ts:809`) | **unchanged** | unchanged | An imperative naming the fix (`copy.md` rule 4) |
| `…approve` | `Approve` (`copy.ts:807`) | **unchanged** | unchanged | Verb |

---

## 4. The surge cards

### 4.1 Surge windows

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.surge.readOnly` | `Windows are set by pricing. Operations may only suspend surge.` (`copy.ts:867`) | `Pricing sets these windows. You can only suspend surge in a district.` | `تضبط إدارة التسعير هذه النوافذ. وليس لك إلا إيقاف تسعير الذروة في حي.` | `copy.md` rule 6 — address the operator as **you**, not as a department. Active voice, and it points at the card next to it |
| `fin.pricing.surge.empty` | `No surge window is configured.` (`copy.ts:874`) | `No surge window is set.` | `لا توجد نافذة ذروة مضبوطة.` | `configured` is the machine's word; the caption one line above now says *"Pricing **sets** these windows"*. Arabic already reads مضبوطة and does not change |
| `fin.pricing.surge.heading` | `Surge windows` (`copy.ts:861`) | **unchanged** | unchanged | Pairs with `Surge by district` below: **when** surge applies, and **where** it can be taken off |

### 4.2 Suspend surge — item 1

The panel today: heading `Suspend surge` → subtitle `Choose a district, then confirm.` → chips →
a disabled primary labelled `Suspend surge` → refusal `Choose a district.` A disabled primary
drops its fill, so the operator reads the same heading and the same instruction twice, six lines
apart (`rate-card-light-en-live.png`, bottom right).

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.surge.suspend.heading` | `Suspend surge` (`copy.ts:891`) | `Surge by district` | `تسعير الذروة حسب الحي` | The heading names the object, the button names the act. Three words, inside X18's 4-word title budget. It also pairs with `Surge windows` — one card is when, the other is where |
| `fin.pricing.surge.suspend.subtitle` | `Choose a district, then confirm.` (`copy.ts:892`) | **DELETE** | — | The refusal line under the button says `Choose a district.` at the moment the operator is stopped. This says it first, before anything is stopped, which is the definition of a line that changes nothing (X15). `then confirm` narrates the UI |
| `fin.pricing.surge.suspend.chosen` | `{district} selected` (`copy.ts:894`) | **DELETE** | — | The chosen chip is already visibly and programmatically pressed (`data-state="on"`, single-select `radiogroup`), and D33 gives it the selected ground. This is the screen reading its own UI back. **Consequence:** `rateCard.test.tsx:603` loses its assertion; `data-state` is already asserted at `:573` |
| `fin.pricing.surge.suspend.prompt` | `Choose a district.` (`copy.ts:895`) | **unchanged** | unchanged | **Earning its line, and it is the survivor.** It sits under a button that names the act, so it needs only the fix |
| `fin.pricing.surge.suspend.confirm` | `Suspend surge` (`copy.ts:913`) | **unchanged** | unchanged | Verb plus object, and the confirm dialog reuses it so its title and its button name the same act (`copy.md` rule 5) |
| `fin.pricing.surge.suspend.group.label` | `District` (`copy.ts:893`) | **unchanged** | unchanged | Never rendered — it is the `radiogroup`'s accessible name. Not visible duplication. (A tidier build would label the group by the visible heading with `aria-labelledby` and delete this key; that is an engineering call, and it is not worth the test churn on its own) |

### 4.3 The suspend confirmation

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.surge.suspend.body` | `Fares in the zone return to the base rate until it ends. A suspension cannot be extended — it is raised again. Nothing already priced changes.` (`copy.ts:912`) | `Fares in the district return to the base rate for {hours} hours. Nothing already priced changes.` | `تعود الأجرة في الحي إلى السعر الأساسي لمدة {hours} ساعة. ولا يتغيّر شيء سُعِّر بالفعل.` | Three fixes in one. **The em dash** (X14, and the `emDashEn`/`emDashAr` ratchets). **`zone` → `district`**: every visible label on this card, the column header and the chips say district; `zone` is the data layer's word leaking into prose. **The magnitude**: a confirmation states the consequence, and the consequence is 12 hours — it was hiding in the Reason field's helper text. `cannot be extended` is cut: nothing on the surface offers to extend, so it answers a question nobody asked, and a confirm states the object and the consequence and stops |
| `fin.pricing.surge.suspend.reason.help` | `Why surge is coming off. Up to {hours} hours.` (`copy.ts:915`) | `Why surge is coming off.` | `لماذا يُرفع تسعير الذروة.` | Helper text under a field states that field's constraint (`copy.md` rule 7). `Up to 12 hours` is not a constraint on the reason — it is the suspension's duration, and it now sits in the body with the rest of the consequence |
| `fin.pricing.surge.suspend.reason.message` | `Enter why surge is being suspended.` (`copy.ts:916`) | `Enter why you are suspending surge.` | `أدخل سبب إيقافك لتسعير الذروة.` | Second person, active voice (`copy.md` rule 6). Still an imperative naming the fix |
| `fin.pricing.surge.suspend.title` | `Suspend surge in {zone}?` (`copy.ts:910`) | **unchanged** | unchanged | Names the act and the object. The `{zone}` **parameter name** is not operator-facing and is left alone |
| `fin.pricing.surge.toast.suspended` | `Surge suspended` (`copy.ts:922`) | **unchanged** | unchanged | 15 characters, names the object, no period. Passes R9 |

> **Arabic plural note for the engineer.** `لمدة {hours} ساعة` is correct at 12 — the shipped
> value of `SURGE_SUSPENSION_MAX_HOURS` (`types/pricing.ts:263`) — and for any value from 11 to
> 99. If the constant is ever lowered into the 3–10 band the Arabic needs `ساعات`, and the key
> becomes a plural family. Raise it rather than change the number quietly.

### 4.4 The suspensions table

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.surge.suspend.zone.empty` → rename to `fin.pricing.surge.suspend.district.empty` | `No zone is tracked.` (`copy.ts:921`) | `No district is tracked.` | `لا يوجد حي متتبَّع.` | One word for one thing. The whole dead `…suspend.zone.*` sub-namespace goes with it (§7) |
| `…suspensions.heading` / `.empty` / `.search` / `.inForce#*` / `.ended#*` | `Suspensions`, `No surge suspension has ever been raised.`, `Search suspensions`, `{count} in force`, `{count} ended` (`copy.ts:896–902`) | **unchanged** | unchanged | The empty state states the absence in words; the counts already carry Arabic's six forms |
| `…surge.col.district` / `.reason` / `.raisedBy` / `.started` / `.suspensionState` | `District`, `Reason`, `Raised by`, `Started`, `State` (`copy.ts:903–907`) | **unchanged** | unchanged | `Raised by` matches `raised` in the empty state |
| `…surge.state.inForce` / `.ended` | `In force` / `Ended` (`copy.ts:908–909`) | **unchanged** | unchanged | Two words, and neither reuses `Running` (R14) |

### 4.5 The permission refusal — the wrong-refusal fix

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.blocked.permission` | — **new**. Today the view renders `fin.payout.blocked.permission` = `You cannot pay a captain. Ask an Owner for the “Captain payouts” permission.` (`copy.ts:335`, via `FinancialsPage.tsx:121`) | `Changing prices needs the “{permission}” permission. An Owner can grant it in Admin › Team & Access.` | `يتطلب تغيير الأسعار صلاحية “{permission}”. يمكن للمالك منحها من إدارة النظام › الفريق والصلاحيات.` | The shipped sentence names an act this screen cannot perform and a permission this screen does not gate on. `{permission}` resolves through `account.permission.manage_plans` = `Edit plans, pricing and cancellation rules` / `تعديل الباقات والتسعير وقواعد الإلغاء` (`dictionaries.ts:703`, `ar/shell.ts:335`) — a quoted label, never a bare key (D17 clause 1). The grammar is the house one, matched word for word to `state.forbidden.body` (`dictionaries.ts:850`), so a route refusal and a control refusal read the same (D17 clause 5) |

**Engineer.** `useWriteGate` is shared by five Financials screens and its reason is hard-coded.
Give it a caller-supplied reason key, or override it in `PricingScreen.tsx`; do **not** change
`fin.payout.blocked.permission`, which is correct on Payouts. Both call sites on this view
(`SurgeCards.tsx:298`, `RateCardBlock.tsx:374`) take the new string.
`rateCard.test.tsx:591` asserts the old key and must be pointed at the new one — AC-RC-27's own
words are *"the reason is visible text"*, which the change does not weaken.

### 4.6 Error copy — three reads with no query to change

`fin.error.read` = `Change the period or the filters, then read again.` (`copy.ts:160`) is
rendered by the rate-card block (`RateCardBlock.tsx:121`), the surge-windows card
(`SurgeCards.tsx:150`) and the district chooser (`SurgeCards.tsx:262`). **None of the three has a
period control or a filter** — `windowed` is false on this view (`PricingScreen.tsx:124`) and
`listRateCards`, `listSurgeWindows` and `listZones` take no query. The error names a fix the
operator cannot perform, which fails `copy.md` rule 4 as squarely as "please" would.

| Key | Current English | Proposed English | Arabic | Why |
|---|---|---|---|---|
| `fin.pricing.rateCard.error.read` | — **new** | `Rate cards did not arrive. Read again.` | `لم تصل جداول التعرفة. أعد القراءة.` | Names the object that is missing and the one act available, which is the button beside it |
| `fin.pricing.surge.error.windows` | — **new** | `Surge windows did not arrive. Read again.` | `لم تصل نوافذ تسعير الذروة. أعد القراءة.` | as above |
| `fin.pricing.surge.error.districts` | — **new** | `Districts did not arrive. Read again.` | `لم تصل الأحياء. أعد القراءة.` | as above |

The suspensions table keeps `fin.error.read`: it has a search box and a district filter, so the
sentence is true there.

---

## 5. Item 2 in full — where the currency belongs

### What is on screen now

Five money columns, five suffixes: `Base (SAR)`, `Per km (SAR)`, `Per minute (SAR)`,
`Minimum (SAR)`, `Cancellation (SAR)` (`copy.ts:777–781`). At 1280 the header row wraps —
`Per minute (SAR)` and `Cancellation (SAR)` break across two lines in English
(`rate-card-light-en-live.png`) and `الحد الأدنى (SAR)` and `لكل دقيقة (SAR)` break in Arabic
(`rate-card-light-ar-live.png`). The cells are bare (`unit="none"`), which is right.

### What an Arabic operator sees

Three things, and only the first is cosmetic.

1. **The token reads correctly but is not isolated.** `RateCardBlock.tsx:414` renders the raw
   `t()` result into the `<th>` with no `<bdi>`. `الأساسية (SAR)` survives because the Latin run
   is trailing and the bracket pair is balanced, so the UBA resolves it at the inline end. That
   is luck, not correctness: glossary **R4** requires every Latin token inside an Arabic string
   to be `<bdi>`-isolated, and the same string with anything after it would move.
2. **Six characters of width, five times, on labels already 4–8% wider.**
   `docs/ref/i18n.md` records the first Arabic pass finding `الدين النقدي (SAR)` truncating to
   `الدين النقدي (R…` in a Payouts header at 1440 — the identical string shape, one column
   narrower. This table is five columns of it at 1280.
3. **The numerals do not flip.** `Money` wraps every value in `<bdi>` with `tabular-nums`, so the
   figures are byte-identical in both languages (AC-73). Only the label rung changes between
   English and Arabic, which is precisely why the fix belongs in the header and not in the cells.

### The ruling

**A unit rung.** One row in the table head, under the labels: the `Class` cell empty, one cell
spanning the five money columns carrying `<bdi>SAR</bdi>` from
`fin.pricing.rateCard.table.unit`, end-aligned. The five labels lose their suffix (§3.3). The
visually-hidden `<caption>` gains `All figures in SAR.` so a screen-reader operator, who will not
hear a `colspan` rung usefully, still gets the unit.

The alternatives, and why not:

- **A visible caption line** — `All figures in SAR.` under the table. Already refused as
  **X-RC-9** in `financials-pricing-rate-card.md`, and the refusal is right: a sentence under a
  table is a footnote nobody reads before the numbers.
- **The unit in the cells** — banned outright by §8.3.1, and it would put `SAR` on screen ten
  times instead of five.
- **The unit only in the sr-only caption** — a sighted operator would see bare numbers with no
  unit anywhere on the surface, which §8.3.1 bans by name.

### The ruling this needs, ready to paste

§8.3.1 is a MUST and reads *"inside a table the unit MUST appear once, in the column header as
`(SAR)`, and MUST NOT repeat in cells"* (`08-eyvar-patterns.md:489`). Five money columns satisfy
its letter and defeat its purpose. This is a §7–§9 rule, so only `docs/RULINGS.md` or the
`DESIGN.md` Rulings table can carry the deviation. Proposed text, for the owner:

> **D-xx — a table with three or more money columns states `SAR` once, in a unit rung.**
> §8.3.1 upheld everywhere else. Where one table has three or more columns in the same currency,
> the `(SAR)` suffix is dropped from every label and the unit is stated once in a second header
> rung spanning them, `<bdi>`-isolated, with the code also in the table's `<caption>`. The unit
> still never appears in a cell. One or two money columns keep the `(SAR)` suffix.

**If the owner refuses**, §3.3 is dropped whole, the five labels stay, and the engineer still
takes one fix: wrap the `<th>` content in `<bdi>` at `RateCardBlock.tsx:414`, per glossary R4.

---

## 6. Fixture strings — not keys, and nothing checks them

`SURGE_SUSPENSION_REASONS` (`fixtures/pricing.ts:494–500`) and the one live suspension's reason
(`:519`) render in the Reason column of the suspensions table and feed its search index
(`SurgeCards.tsx:386`, `:355`).

**Em dashes found: 2 distinct strings, 3 source literals** — `:495`, `:496`, and `:519`, which
repeats `:495` verbatim. Counted with a script that strips comments first, so the twenty-odd em
dashes in this file's prose are excluded.

| Location | Current | Proposed | Why |
|---|---|---|---|
| `fixtures/pricing.ts:495` **and** `:519` | `Stadium event — surge would price out the evening commute` | `Stadium event. Surge would price out the evening commute.` | Two clauses, so two sentences (`copy.md` 12). The second half is a finite clause, not a qualifier, so `·` would be wrong. **Both literals must change** — `:519` is a hardcoded copy of `:495` |
| `fixtures/pricing.ts:496` | `School run window — capped by the operations policy for the term` | `School run window · capped by the operations policy for the term` | Here the second half is a participial qualifier of the first, which is exactly what `·` is for (`copy.md` 12, and its own rewrite row `Offered to Nora · waiting for their reply`) |

**No Arabic entries, deliberately.** These are operator-typed free text in production, and
`docs/ref/i18n.md` names fixture data as the one thing legitimately left in English on an Arabic
screen. They are still copy an operator reads today, and they still obey X14.

**Nothing catches this automatically.** `scripts/i18n-inventory.py` builds its corpus from
`collect_dictionaries()` — `copy.ts` files and `dictionaries.ts` only. The `emDashEn` ratchet, the
X18 word budget and the `defaultValue` guard are all blind to `src/data/fixtures/`. Every copy
rule in `docs/ref/copy.md` applies to a fixture string that reaches the screen, and every one of
them is unenforced there. Worth a line in `docs/ref/copy.md`; raised, not written, since that file
is not mine.

---

## 7. Deletions

| Key | Current English | Why it goes |
|---|---|---|
| `fin.pricing.rateCard.heading` | `Rate card {version}` (`copy.ts:754`) | **Dead.** No render site; the pane heading is the version plus a badge. Verified by exact-string grep across `src/` |
| `fin.pricing.rateCard.effective` | `Effective from {date}` (`copy.ts:758`) | **Dead.** Superseded by `…effective.noEnd` |
| `fin.pricing.surge.suspension.expired` | `Ended` (`copy.ts:890`) | **Dead.** The badge uses `…surge.state.ended` |
| `fin.pricing.surge.suspend.zone.label` | `Zone` (`copy.ts:917`) | **Dead.** The `Select` these four served became a `ToggleGroup` |
| `fin.pricing.surge.suspend.zone.help` | `Where the suspension applies.` (`copy.ts:918`) | **Dead**, as above |
| `fin.pricing.surge.suspend.zone.message` | `Choose a zone.` (`copy.ts:919`) | **Dead**, as above. `…suspend.prompt` is the live one |
| `fin.pricing.surge.suspend.zone.placeholder` | `Choose a zone` (`copy.ts:920`) | **Dead**, as above |
| `fin.pricing.surge.suspend.subtitle` | `Choose a district, then confirm.` (`copy.ts:892`) | **Live, and duplicated.** §4.2 |
| `fin.pricing.surge.suspend.chosen` | `{district} selected` (`copy.ts:894`) | **Live, and restates the pressed chip.** §4.2 |
| `fin.pricing.rateCard.footer.live` | `This card prices every trip today. Editing waits on the pricing owner decision.` (`copy.ts:811`) | **Live, and both halves are said elsewhere.** §3.6 |

Each deletion is two lines: `src/screens/financials/copy.ts` and `src/i18n/ar/financials.ts`.

`fin.pricing.rateCard.col.wait` and `…rateCard.wait` (`copy.ts:784–785`) are **dead and kept** —
F-RC-2 already ruled on them. Not reopened.

---

## 8. The key delta, and which ratchet moves

**There is no ratchet on the number of keys.** `scripts/i18n-budget.json` holds exactly four
ceilings — `defaultValue: 0`, `emDashEn: 84`, `emDashAr: 87`, `overBudget: 145` — and
`scripts/i18n-inventory.py` refuses to raise those four. Key count is reported in
`docs/08-i18n/KEYS.md` and gates nothing. So the delta below is information, not a constraint.

| | English keys |
|---|---:|
| Deleted (§7) | −10 |
| Added — `fin.pricing.blocked.permission` | +1 |
| Added — `…rateCard.class.economy`, `.comfort` | +2 |
| Added — three error keys (§4.6) | +3 |
| Renamed — `…suspend.zone.empty` → `…suspend.district.empty`; `…stat.consumerPrices` → `…stat.riderPrices` | 0 |
| **Net** | **−4** |

Two rows are conditional and are **not** in that total: `…rateCard.table.unit` (+1, only if the
owner ratifies §5) and `…rateCard.floors.hint` (+1, only if the designer adds an `InfoHint`).
Taking both makes it **−2**.

Arabic moves the same way: −10 deleted, +6 added, net **−4**. No key here needs a plural family,
and none is created — `…impact.trips` was rewritten as `noun: {count}` precisely to avoid minting
one English key and six Arabic forms for a count that governs a noun.

**Both moving ratchets fall, and that will fail the check until you regenerate.**

| Ratchet | Now | After | Cause |
|---|---:|---:|---|
| `emDashEn` | 84 | 83 | `fin.pricing.surge.suspend.body` (§4.3) |
| `emDashAr` | 87 | 86 | its Arabic twin, `ar/financials.ts:646` |
| `overBudget` | 145 | 144 | `fin.pricing.stageA.title`, 10 words → 3, against a 4-word title budget |

`npm run i18n:check` returns non-zero when a ratchet **falls** as well as when it breaks — it
prints *"fell from 84 to 83. Run `npm run i18n:keys` and commit so the ceiling follows it down."*
Run the generator and commit `KEYS.md`, `keys.json` and `i18n-budget.json` in the same commit as
the copy. No proposed string classifies over its X18 budget; the longest, the permission refusal,
carries a `.permission` tail and is unclassified, as every refusal sentence is.

---

## 9. Tests and acceptance criteria this moves

| Where | What happens |
|---|---|
| `rateCard.test.tsx:383` | Asserts `…footer.live`, which is deleted. The assertion goes; the live pane's footer is gone |
| `rateCard.test.tsx:603` | Asserts `…suspend.chosen`, which is deleted. `data-state="on"` at `:571` already covers the selection |
| `rateCard.test.tsx:591` | Asserts `fin.payout.blocked.permission`. Repoint at `fin.pricing.blocked.permission` |
| `rateCard.test.tsx:261–266` | Reads the six column headers through `copy()`, so §3.3 needs no test change — but if the unit rung ships, add one assertion that `SAR` appears **once** in the `<thead>` |
| `rateCard.test.tsx:325`, `:336` | Read `…impact.none` and `…floors.caption` through `copy()`; they follow the dictionary and do not change |
| **AC-RC-12**, the live-state and superseded-state rows of `financials-pricing-rate-card.md` §9 | Name strings this sheet changes or deletes. The design doc is being rewritten now; whoever owns it takes the amendment. I did not edit it |

---

## 10. Considered, and deliberately not changed

- **The view-row caption rung**, `4 RATE CARDS · 1 LIVE · 2 DRAFTS · 1 SUPERSEDED`. The total is
  the sum of the parts and adds nothing, and `rate cards` is the third time the words appear on
  one strip after the tab and the rail heading. **Not changed anyway**: `…count.cards` is the only
  member of that group carrying a full six-form Arabic plural family
  (`ar/financials.ts:548–553`), and it is the noun the two plain keys beside it —
  `{count} live`, `{count} superseded` — lean on grammatically. Deleting it to save one arithmetic
  restatement would leave two adjectives in Arabic with no noun to agree with, and fixing that
  properly costs two more plural families. A bad trade for a rung set at 11px and scanned, not read.
- **`Rider bill before` / `Rider bill after`.** See §3.4. The repetition is real and it is
  visual; the fix is a group label, which is layout.
- **`fin.pricing.surge.col.state` and `…col.suspensionState`, both `State`**, while the plans
  table says `Status`. Two tables, two columns, no ambiguity within either. Noted for whoever
  next sweeps vocabulary across the four views; not worth churn on its own.
- **`…rateCard.announce`** = `Showing rate card {version}, {status}.` The one polite region.
  Correct as it stands.
- **Every string on the other three views** of Pricing & Plans. Out of scope. One is visibly
  wrong and belongs to whoever picks them up: `fin.pricing.cancel.notEnforced.title` =
  `Five cancellation rules are stored and never applied.` (`copy.ts:839`) hard-codes **five**
  while the component computes `unenforced` from the data (`PricingScreen.tsx:534`) and renders
  the sentence whenever that count is above zero.
