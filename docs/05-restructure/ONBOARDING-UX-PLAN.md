# Onboarding UX plan — a checklist that notices, art that carries it, and no tour

> **Owner:** product-designer + frontend-engineer. **Consumers:** mock-data-engineer (one seam
> change), content-designer (26 illustration subjects, two new sentences), i18n-arabic-engineer
> (about 12 keys), design-token-steward (five fill utilities), qa-engineer and visual-qa-engineer
> (one new harness), the owner (five decisions in §7).
>
> **Inputs.** The onboarding spec (`specs/04-auth-and-onboarding.md` §8, §13.6–13.9), the design
> (`design/08-auth-and-onboarding.md` §10), the shipped layer (`src/screens/onboarding/`, 572 +
> 273 lines, 22 tests green on 2026-09-05), the data client (`src/data/clients/onboarding.ts`),
> the system-wide UX plan (`design/14-system-wide-ux-plan.md` B7), the reference frames named in
> `DESIGN.md` §5.6, and a six-image style pilot generated on Higgsfield (Recraft V4.1, vector
> output) and kept at `design/onboarding-illustrations/pilot/`. Every finding cites a file and
> line that was read, or a command and its output.
>
> **Precedence.** `docs/RULINGS.md` governs. §5.6's last MUST (*no modal wizards, coach-mark
> tours, or blocking overlays*) is a structural rule and D7 leaves it standing; this plan does
> not reopen it. R8 (illustration only on a whole-page zero-records-ever empty) governs empty
> states and says nothing about guides; §7 asks the owner to say so in one row.

---

## 0. What this plan decides, in one screen

| # | Decision | Where |
|---|---|---|
| **O-1** | The checklist stays. It is the right shape (§5.6, spec §8.2) and it is built. Nothing here replaces it with a tour, a wizard, or a landing-page card. | §2 |
| **O-2** | Three things the spec promised are **not wired** and are fixed first, in one change: auto-open on the first session, auto-detection when the operator does the real task, and a real destination for the Support profile step. | §3 |
| **O-3** | Every step, every role intro and the completion state gets **one flat two-tone vector illustration** in the brand palette, generated on Higgsfield with Recraft V4.1 in vector mode, converted to token-coloured inline SVG. Twenty-six subjects. The art is decorative, `aria-hidden`, never the carrier of meaning, and appears **only inside the onboarding layer**. | §4 |
| **O-4** | "Fun" is the tool acknowledging the operator, not confetti: a drawn-in tick when a step completes, a progress fill that moves, and a completion state with its own picture and one sentence. Reduced motion is honoured. | §5 |
| **O-5** | "Help with their work" is done without a tour: browser Back from a step's destination reopens the checklist at that step, a ⌘K command reaches the current step from anywhere, and the intro card names the one place work arrives. Nothing is pinned over the workspace. | §6 |
| **O-6** | Five product events are emitted so the two questions the analytics plan already asks (completion by role, most-skipped step) can be answered. | §6.4 |
| — | Five things this plan refuses to decide, each with an owner | §7 |

---

## 1. What exists today, verified

**Built and green.** A 480px inline-end shell layer with no scrim ([OnboardingLayer.tsx:1-75](../../src/screens/onboarding/OnboardingLayer.tsx#L1-L75)), an intro card, a `{done} of {total}` line with a 4px bar, a single-expand accordion of step rows, `Skipped (n)` and archived groups, a footer with `Restart onboarding` and `Dismiss`. Four tracks, 21 step rows ([onboardingTracks.ts:163-446](../../src/data/fixtures/onboardingTracks.ts#L163-L446)), every step gated by the permission its destination requires. Loading, error and track-empty states. The account-menu entry with its count ([AccountMenu.tsx:205-208](../../src/shell/AccountMenu.tsx#L205-L208)). Arabic: 78 keys in `src/i18n/ar/onboarding.ts`.

```
npx vitest run src/screens/onboarding
 ✓ src/screens/onboarding/onboarding.test.tsx (22 tests) 1494ms
```

**What the spec promised and the build does not do.** Each of these is a first-session experience an operator actually has.

| # | Finding | Evidence |
|---|---|---|
| **F-1** | **The layer never opens itself.** AC-593 and AC-594 (*auto-open exactly once, on the first session*) were deferred because the client had no "never seen" signal. The client has since gained `autoOpenedAt`, a `markAutoOpened` operation and a `shouldAutoOpen()` helper, and the shell still does not call it. A new operator signs in, lands on their route, and sees nothing. | [AppLayout.tsx:241-274](../../src/shell/AppLayout.tsx#L241-L274) still reads *DEFERRED*; [onboarding.ts:131-133](../../src/data/clients/onboarding.ts#L131-L133) defines `shouldAutoOpen`; `grep -rn shouldAutoOpen src` finds one export and **zero callers** outside the client. |
| **F-2** | **No step ever completes itself.** Four steps declare an `autoSignal` (`queue.item.claimed`, `queue.item.disposed` ×2, `application.decided`), and nothing in the product emits one. `completeStep(id, 'auto')` has no call site. An operator who claims an item in My Work, exactly as step 2 asks, comes back to an unticked row. | [onboardingTracks.ts:182,292,329,341](../../src/data/fixtures/onboardingTracks.ts#L182); `grep -rn "completeStep(" src` → the client definition and one manual call at [OnboardingLayer.tsx:325](../../src/screens/onboarding/OnboardingLayer.tsx#L325). |
| **F-3** | **The Support profile step has no button.** `destinationPath` returns `null` for `layer: 'profile'` because the checklist names no entity, so the step is manual-only with no way to get there from the row. | [OnboardingLayer.tsx:555-561](../../src/screens/onboarding/OnboardingLayer.tsx#L555-L561). |
| **F-4** | The accordion switches from uncontrolled to controlled on first expand (`expanded` starts `undefined`). Radix warns on every test that opens a step. Harmless today, a focus bug tomorrow. | Test stderr above: *Accordion is changing from uncontrolled to controlled*. |
| **F-5** | **No picture anywhere.** The layer is text from top to bottom. The §5.6 reference frame the design cites shows *"a small illustration at the right"* of the expanded task, and the Finances variant opens with a hero illustration; neither was carried into §10. | `DESIGN.md` §5.6, [05-feedback-overlays.md:338](../06-design-reference/_partials/05-feedback-overlays.md#L338), [:353-356](../06-design-reference/_partials/05-feedback-overlays.md#L353-L356). |
| **F-6** | **Completion is a line.** The system-wide plan names the progress bar as *"the one place a completion moment is worth building"* and nothing was built. | [14-system-wide-ux-plan.md:276](design/14-system-wide-ux-plan.md#L276). |
| **F-7** | `Learn more` is absent on all 21 steps because there is no help centre (Q-82). Recorded, not a defect; §7 gives it an owner. | [onboardingTracks.ts:52-56](../../src/data/fixtures/onboardingTracks.ts#L52-L56). |
| **F-8** | No motion tokens exist yet (`grep -E "^\s*--ev-(dur|ease)" globals.css` is empty), so G2 of the system-wide plan has not landed. §5 uses Tailwind's duration utilities and names the token to add. | `src/styles/globals.css`. |

---

## 2. The position, and why it is unchanged

An operator's first day in an ops console is a day of real work with a live queue. The spec's answer, a checklist whose every step is a real task on a real screen, is the right one, and the reasons are structural, not stylistic:

- **A tour explains the screen; a checklist makes you do the job.** Step 2 is *claim one item, then release it*. No coach mark can teach what a claim is; holding one for thirty seconds can.
- **The layer has no scrim, so the workspace stays operable behind it** (AC-596). That is why it is not the blocking overlay §5.6 forbids, and it is also why a "follow-me" surface is unnecessary: the checklist and the screen it describes are readable at once.
- **Quiet means one voice.** The standing signal is the account-menu count (R10); the layer is the only place that talks; auto-completion makes no toast (AC-612). Every addition below either lives inside the layer or is a keyboard route to it.

What was missing is not the shape. It is that the checklist does not *notice* the operator (F-1, F-2), does not *look like anything* (F-5), and does not *acknowledge* finishing (F-6).

---

## 3. Phase A — make the spec true, one change

| # | Move | Detail |
|---|---|---|
| **A-1** | **Auto-open, exactly once** (AC-593, AC-594) | In `AppLayout`, after the landing route's first successful data render, if `shouldAutoOpen(state)` then `setLayer('onboarding','1')` and `markAutoOpened()`. "First successful render" is the first transition of the landing screen's own async status to `success`; the shell already reads it for the skeleton. Never on a route other than the landing route, never while another layer is open, never twice: `autoOpenedAt` is stamped before the layer opens, so a refresh mid-open does not repeat it. Dismissed accounts never qualify (the helper already says so). |
| **A-2** | **Auto-detection** (AC-612) | A tiny signal bus in `src/lib/onboardingSignals.ts`: `emitOnboardingSignal(id)` and `onOnboardingSignal(id, fn)`. `ShellContext` subscribes once, maps a signal to the reachable steps that declare it, and calls `completeStep(step.id, 'auto')` then `refreshOnboarding()`. Producers, each one line at the point the real mutation succeeds: My Work claim → `queue.item.claimed`; any queue disposition (Requests, reconciliation) → `queue.item.disposed`; applicant approve/reject → `application.decided`. No toast. A step already done or skipped ignores the signal. |
| **A-3** | **Support profile step gets a door** (F-3) | Destination becomes `operations-people` with the button `Open People`; the body already says *"from any rider or captain"*. Completion stays manual. Fixture edit plus one copy key. |
| **A-4** | Controlled accordion (F-4) | `expanded` initialises to the first incomplete step id on data arrival instead of `undefined`. Removes the warning and makes "first incomplete step is expanded" (§10.1) true on first paint rather than after an effect. |
| **A-5** | Tests | One per criterion: AC-593/594 (opens once, not on second sign-in, not when dismissed), AC-612 (claim in My Work ticks `common.mywork` with no toast), F-3 (Support step renders `Open People`). |

---

## 4. Phase B — illustrations, and the Higgsfield pipeline

### 4.1 The style, decided by the pilot

Six images were generated to choose a direction: three subjects (claim-and-release, account security, track complete) in two styles. Contact sheet: [contact-sheet.png](design/onboarding-illustrations/pilot/contact-sheet.png).

| Style | Verdict |
|---|---|
| **Flat two-tone** (top row): brand green `--ev-brand` fills, ink outlines, pale green `--ev-brand-lt` tints, white ground | **Chosen.** Reads at 96px: the tinted shield, the code slot and the ticked list survive the reduction. Sits inside a `--ev-bg2` card without a frame. |
| Monoline outline (bottom row): single ink stroke, one green accent | Declined. Below about 150px the drawing dissolves into lines; the technical-diagram feel is closer to the product's own icons than to a picture, so it adds nothing the lucide set does not. |

Two corrections carried into the brief from the pilot: **no arrows or cursors** (the claim-and-release arrow encodes a reading direction and O10 forbids mirroring art with CSS), and **no digits or text** (the code-slot came back empty, which is correct, and it stays a rule).

### 4.2 Where the art appears, and where it does not

| Surface | Art | Size | Rule |
|---|---|---|---|
| The expanded step's sub-card | That step's illustration, inline-end of the description, above the buttons on narrow widths | 96 × 64 | §5.6 reference, *"a small illustration at the right"* of the expanded task. Decorative: `aria-hidden`, `focusable="false"`, no `<title>`. |
| The intro card | The role's illustration at inline-end | 96 × 64 | One per role, four total. |
| The completed state (AC-635) | The completion illustration above `✓ Done` | 160 × 106 | The one hero-sized picture, because it is the one moment. |
| Collapsed rows, the skipped group, the archived group, the account menu, the banner | **None** | — | A picture per row is noise; the row's job is scanning. |
| Any empty state, including `track-empty` | **None** | — | R8 unchanged. Q-36 unchanged. |

The art carries no meaning the text does not: remove every SVG and every acceptance criterion still passes. That is the test that keeps it decorative.

### 4.3 The pipeline

1. **Generate.** Model `recraft_v4_1`, `model_type: vector`, `resolution: 1k`, `aspect_ratio: 3:2`, `background_color: #ffffff`, `colors: [#0c6944, #171a21, #e7f0ec, #f6f8f9, #6b7280]`. Cost measured at **2.5 credits per image**. Two variants per subject, 26 subjects, 52 images, **130 credits** of the 496 on the account.
2. **Choose.** One contact sheet per batch, rendered with the harness pattern in §4.6, read once, one variant kept per subject.
3. **Clean.** Strip the `<metadata>` C2PA block (4.3 KB per file), the `xmlns:c2pa`, `style`, `width`, `height` and `preserveAspectRatio` attributes. The pilot files came back at 6–15 KB after this.
4. **Tokenise.** Recraft honours the palette exactly and writes `fill="rgb(r,g,b)"`, so the mapping is a five-line replace and the edit-gate's literal-colour check (`scripts/edit-gate.mjs:52`) forces it: `rgb(12,105,68)` → `fill-primary`, `rgb(23,26,33)` → `fill-foreground`, `rgb(231,240,236)` → `fill-brand-lt`, `rgb(255,255,255)` → `fill-background`, `rgb(107,114,128)` → `fill-muted-foreground`. Every one of those is a Tailwind theme colour already ([globals.css:2571-2642](../../src/styles/globals.css#L2571-L2642)); any fill outside the five is a rejected image, regenerated. A script under `scripts/illustrations/` does steps 3–4 so the next batch is one command.
5. **Ship.** One component per subject under `src/screens/onboarding/illustrations/`, exported through a map keyed by step id and role name. Budget 12 KB per file, about 300 KB on the onboarding chunk, which is already lazy.

### 4.4 The prompt template

> Flat vector spot illustration, minimal, for a software admin console. **{subject}.** Two-tone palette: deep green #0c6944 and near-black ink #171a21 on white, pale green tint #e7f0ec for fills. No text, no digits, no arrows, no cursors, no people, no gradients, no shadows, generous white space, geometric shapes, consistent 2px strokes, calm and precise.

### 4.5 The 26 subjects

| Key | Subject (the noun phrase in the prompt) |
|---|---|
| `common.account` | a shield with a checkmark beside a phone, and two small device tiles, one crossed out |
| `common.mywork` | an inbox tray with one card lifted just above the others |
| `common.audit` | a ledger page of ruled lines with one line highlighted in green |
| `owner.team` | a three-by-three grid of small tiles, one column filled green |
| `owner.policy` | a document with a wax-seal circle and a ruler beside it |
| `owner.position` | a balance scale with two equal pans |
| `owner.pricing` | four coins stacked at different heights, one ringed in green |
| `finance.ledger` | a two-column ledger with one row struck through and rewritten below |
| `finance.escrow` | a padlock resting on a folded banknote |
| `finance.reconciliation` | two receipts side by side with a green tick between them |
| `finance.goodwill` | a wallet with a coin half inside, and a small bracket marking a limit |
| `finance.routing` | a signpost with two boards, one filled green |
| `ops.application` | a clipboard with a photo tile and a document tile, one green tick |
| `ops.requests` | a small clock face beside a card with a ticked box |
| `ops.assurance` | a car outline under an umbrella |
| `ops.dispatch` | a radar sweep with a single green dot |
| `ops.fairness` | a balance scale with a small captain's cap on one pan |
| `support.ticket` | an envelope open with a speech bubble rising from it |
| `support.profile` | an identity card with a photo tile and a small padlock |
| `support.goodwill` | a wallet with a coin half inside, and a small bracket marking a limit |
| `support.boundary` | a door ajar with a small stop sign on its face |
| role `Owner` | a keyring with four keys |
| role `Ops Manager` | a clipboard over a map pin |
| role `Finance` | a calculator beside a stack of coins |
| role `Support` | a headset resting on a heart outline |
| completion | a checklist card with five ticked rows and a single leaf resting on its corner (the pilot subject, kept) |

### 4.6 Proof

jsdom renders no SVG. One harness, `scripts/harness/onboarding.mjs`, opens `?onboarding=1` for each of the four mock users, expands the first incomplete step, and screenshots the layer at 1280 in English and Arabic; it prints the rendered size of each `[data-illustration]` node and fails if any is 0 × 0 or exceeds 96 × 64 inside a step. Run before claiming any of §4 works.

---

## 5. Phase C — the completion moment, and two small acknowledgements

| # | Move | Detail |
|---|---|---|
| **C-1** | **The tick draws in.** | When a step transitions to done while the layer is open, the `✓` path animates `stroke-dashoffset` over 160 ms and the progress fill moves over 200 ms (`transition-[width]` is already there). Under `prefers-reduced-motion` both are instant. No sound, no toast, no colour flash. |
| **C-2** | **Completion state** (AC-635) | The list collapses to the completion illustration (160 × 106), `✓ Done`, and the existing sentence. `Dismiss` takes primary emphasis in the footer as designed. The picture is the moment; there is no confetti, and no exclamation mark (§5.7). |
| **C-3** | **The common three** | When `common.account`, `common.mywork` and `common.audit` are all done and role steps remain, the intro card's third line changes once to: *"The three steps everyone does are done. The rest is yours."* Key `onboarding.intro.commonDone`. One sentence, in the card, no banner. |
| **C-4** | Motion token | `--ev-dur-fast: 160ms`, `--ev-dur: 200ms`, `--ev-ease: cubic-bezier(.2,0,0,1)` added to `globals.css` by design-token-steward, the first three of G2. C-1 uses them. |

---

## 6. Phase D — help with the work, without a tour

| # | Move | Detail |
|---|---|---|
| **D-1** | **Back returns to the step.** | `Open {sub-tab}` navigates and closes the layer (AC-607). Because the layer is a URL param, the previous history entry still carries `?onboarding=1`, so browser Back reopens the checklist. Make that deliberate: the layer restores the expanded step from the URL (`?onboarding=1&step=<id>`), so the operator lands back on the row they left, not the first incomplete one. Zero new surface. |
| **D-2** | **⌘K reaches the current step.** | One command in `src/commands/`: *Getting started: {current step title}*, opening the layer at that step. Present while the track is incomplete and undismissed, absent otherwise. Keyboard-only, no visual weight anywhere. |
| **D-3** | **The intro card names the work.** | Already built (§8.3 part 3, the My Work link). Kept. |
| **D-4** | **Analytics** (O-6) | Emit `onboarding.opened {auto|menu|command|back}`, `onboarding.step.completed {stepId, role, mode}`, `onboarding.step.skipped`, `onboarding.dismissed {done, total}`, `onboarding.completed {role, days}` through whatever `03-analytics-plan.md` designates as the event seam. The two questions the plan already asks ([03-analytics-plan.md:659-660](build/03-analytics-plan.md#L659-L660)) become answerable. |

What this phase deliberately does not build: a pinned "current step" strip over the workspace, spotlight highlights on the destination screen, or a floating "next" button. Each is a coach mark by another name (AC-615), each competes with R10's one banner, and each is noise to the 40 operators who are not new.

---

## 7. Five things this plan refuses to decide

| # | Question | Owner | Default if unanswered |
|---|---|---|---|
| **Q-O1** | Add one row to `docs/RULINGS.md`: *"R8 governs empty states. A guided checklist's expanded task and its completed state may carry a decorative illustration (§5.6 reference). Nowhere else."* | owner | Phase B ships behind that reading and the row is written as proposed. |
| **Q-O2** | Q-82, the help centre: who writes 21 short *"More about this"* articles, and where they live. Until then `learnMoreKey` stays `null` and nothing renders. | content-designer, owner | Nothing renders. |
| **Q-O3** | Should auto-open wait for the landing route's first successful render (design §10.4) or open on the first paint of the shell? | product-designer | First successful render, as designed. |
| **Q-O4** | D4: the Trust & Safety and Dispatcher roles. Two more tracks and two more role illustrations if adopted. | owner | Four tracks. |
| **Q-O5** | Whether the role illustration should also appear in the account menu header. | product-designer | No; the menu is a list. |

---

## 8. Sequencing

| # | Work | Days | Depends on |
|---|---|---|---|
| 1 | Phase A (A-1 to A-5) | 1 | — |
| 2 | Phase B: generate 52, choose 26, tokenise, place, harness | 1.5 | Q-O1 default |
| 3 | Phase C (C-1 to C-4) | 0.5 | motion tokens |
| 4 | Phase D (D-1, D-2, D-4) | 1 | — |
| 5 | Arabic entries, `npm run i18n:keys`, `npm run api:contract` if the seam changed, full suite, harness runs, handoff | 0.5 | all |

---

## 9. Files

| File | Change |
|---|---|
| `src/shell/AppLayout.tsx` | A-1 auto-open; D-1 step param |
| `src/shell/ShellContext.tsx` | A-2 subscription |
| `src/lib/onboardingSignals.ts` (new) | A-2 bus |
| `src/screens/operations/my-work/*`, `requests/*`, `people/*`, `financials/cash/*` | A-2 producers, one line each |
| `src/data/fixtures/onboardingTracks.ts` | A-3 destination |
| `src/screens/onboarding/OnboardingLayer.tsx`, `OnboardingStepRow.tsx` | A-4, B placement, C-1, C-2, C-3, D-1 |
| `src/screens/onboarding/illustrations/` (new) | B, 26 components + index |
| `src/screens/onboarding/copy.ts`, `src/i18n/ar/onboarding.ts` | A-3, C-3, D-2 keys |
| `src/commands/onboarding.ts` (new) | D-2 |
| `src/styles/globals.css` | C-4 tokens |
| `scripts/illustrations/tokenise.mjs` (new) | B-3, B-4 |
| `scripts/harness/onboarding.mjs` (new) | B-6 |
| `docs/RULINGS.md` | Q-O1 row, once answered |

---

## 10. Status — landed 2026-09-05

Everything in §3–§6 is built on `feat/remediation-and-ux-phase1`. Evidence, and where the build departs from the plan as written:

| Item | Evidence |
|---|---|
| A-1 auto-open, A-2 auto-detection, A-3 the People door, A-4 controlled accordion, D-1 the URL step, C-3 the intro line | `npx vitest run src/screens/onboarding/onboarding.plan.test.tsx` → 9 passed. The existing 22 onboarding tests, the shell, palette, gates and auth suites → 151 passed. |
| Illustrations | 26 components under `src/screens/onboarding/illustrations/`, sources under `design/onboarding-illustrations/source/`. `node scripts/harness/onboarding.mjs` renders every one at **96×64** inside its step and intro card for all four roles, English and Arabic, art at inline-end under `dir=rtl`. |
| Auto-detection producers | 20 client mutations emit a signal through `src/data/signals.ts`: ten `claim*` → `queue.item.claimed`; `decideCashReport`, `resolveComplaint`, `resolveDispute`, `decideFairnessCase`, `closeSafetyIncident`, `resolveTicket`, `assignRequest`, `expireRequest` → `queue.item.disposed`; `approveApplicant`, `rejectApplicant` → `application.decided`. `npm run api:contract` → 312 endpoints, 0 problems. |
| ⌘K | `usePalette` takes a `guide` option; the row sits first under *Resume* with an empty query and joins the destinations when the query matches `getting started`, `onboarding`, `checklist`, `guide`, `البدء`, `التهيئة`. |

**Departures from the plan.**

- **Auto-open settles per account, not per mount.** A mock user switch is a new first session, so the guard is keyed by `userId`. Without it the second operator of a session never saw the layer.
- **The art box is fixed at 96×64** (`h-16 w-24`) and the drawing fits inside it; cropping the viewBox to the drawing alone gave heights up to 107px.
- **A solid fill outside the palette snaps to the nearest token** and is reported, instead of rejecting the image. Recraft added a mid-grey to the Finance role art twice in a row; gradients are still rejected and forced a regeneration of the radar and clock subjects.
- **Two files exceed the 12 KB budget**: `OwnerPricingArt` (23 KB) and `RoleFinanceArt` (26 KB). Total for the 26 is about 200 KB, on the lazy onboarding chunk.
- **C-4 is withdrawn.** `docs/ref/motion.md` forbids a second duration source beside Tailwind's scale, and its licence table is closed; `motion.licence.test.ts` enforces both. No `--ev-dur*` token exists. The tick draws in at the licensed 150 ms through the one `animation` shorthand (`--animate-draw`, the queue-row licence read onto a checklist row changing state on a live signal, for the owner to confirm), and the progress bar keeps the transition it already had.
- **The analytics seam is in-memory** (`src/lib/analytics.ts`: `track`, `onTrack`, `recentEvents`). No vendor is attached; the plan names none.
- **No RULINGS.md row was written.** Q-O1 stays with the owner; the build ships behind the plan's reading that R8 governs empty states only.
- **Credits spent on Higgsfield:** 41 images at 2.5 credits, about 103 of the 496 available.
