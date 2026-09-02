# 18 — Three plans: PWA, Arabic, and humanising the language

**Status:** proposal. Extends `13`–`17`. Each of the three is independent and can ship alone.
**Method:** measured against the tree. Nothing below is proposed without first checking what already exists.

---

# Part 1 — PWA

## 1.1 What exists today: nothing, and one deliberate obstacle

```
public/                          does not exist
manifest.json / sw.js            do not exist
vite-plugin-pwa / workbox        not in package.json
vite.config.ts                   react + tailwind + vitest. No PWA plugin.
index.html                       <meta name="viewport" content="width=1280" />
```

That last line is the important one. **The product declares a fixed 1280px viewport with no responsive meta tag**, and that is not an oversight — the design law says *"There is no second breakpoint anywhere in the product. If a screen needs one, that is a finding against this document, not a local decision"* (`globals.css`, §0.1). One breakpoint exists, `--ev-bp-wide` at 1344px, and it has exactly three licensed uses.

**So a phone-shaped PWA and the design law are in direct conflict**, and pretending otherwise would produce a plan that dies on contact with the first review.

## 1.2 The reframe: PWA is not mobile

Almost everything valuable about a PWA here has nothing to do with small screens:

| Capability | Needs responsive? | Value to an ops console |
|---|---|---|
| **Installable standalone window** | no | The console gets its own window, own icon, own alt-tab entry. No browser chrome eating 90px of vertical budget — which, given `17`'s finding that only ~10.7 rows fit, is real |
| **Offline app shell** | no | A dropped connection shows the console with an offline banner instead of the browser's dinosaur |
| **Cached last-known data** | no | An operator who loses wifi keeps reading the queue they had open |
| **Background sync of queued mutations** | no | A disposition made during a 20-second dropout commits when the link returns instead of being lost |
| **Push notifications** | no | A breached safety incident reaches an operator who has the tab in the background |
| **Phone/tablet layout** | **yes** | The one thing that conflicts with the design law |

**Recommendation: ship the first five, defer the sixth**, and record it as a deliberate scope line rather than an omission.

## 1.3 What the codebase already has that this builds on

This is unusually well-positioned, because three of the hard parts exist:

- **`useAsync` + `requestCache`** already implement stale-while-revalidate. `17` P3-13 notes only 2 of ~250 call sites pass `cacheKey`. **Wiring `cacheKey` is a prerequisite for offline reads and a perceived-speed win on its own** — the same one line buys both.
- **`realtime.ts:497–507`** already has WebSocket reconnect with backoff — the connection-state machine a PWA needs for its online/offline banner.
- **The data seam.** Every read goes through `src/data/clients/*` behind `VITE_DATA_SOURCE`. **A service worker has exactly one layer to intercept**, which is the thing that makes offline tractable in most codebases and impossible in the rest.
- **`persistence.ts`** already keys per-operator preferences and is the natural home for a mutation queue.

## 1.4 The plan

**Phase P1 — Installable shell (1 day).**
Add `vite-plugin-pwa`. `manifest.webmanifest` with `display: "standalone"`, `theme_color` and `background_color` from the brand tokens (`#0C6944` and `#ffffff` — `13` Phase 1), `orientation: "landscape"`, and icons generated from `logo2.svg`. Precache the app shell and the fonts (the four self-hosted woff2 subsets). **Set `start_url` to `/management/overview`**, not `/`.

**Phase P2 — Offline reads (2 days).**
Wire `cacheKey` across the index screens (`17` P3-13). Add a `NetworkStatus` context fed by `navigator.onLine` plus the existing WebSocket state, and a shell banner — `ShellBanner` already enforces the one-banner invariant (R10), so this is a new condition, not new chrome. Cached data renders with an `as-of` timestamp; **stale money never renders without one** (§9.2 discipline).

**Phase P3 — Queued mutations (3 days).**
The riskiest part, so it is scoped hard: **only reversible, non-money commands queue.** Everything else refuses offline, in place, with the reason — which is `unavailableReason`'s existing job (40 sites). `commands/registry.ts` already declares `affordance` and `UndoHandle` per command, so **the registry is again the missing half**: the queue filters on data that already exists.

**Phase P4 — Push (2 days, needs a backend).**
Subscribe through the existing `NotificationBell`. Scope to genuinely urgent classes only — breached safety acknowledgement, escalated dispute, payout failure. **Not** every queue count change, or operators will disable it in a week.

**Explicitly out of scope:** responsive layout, offline writes to money, and any attempt to make this work on a phone. Record all three in `DECISIONS.md`.

---

# Part 2 — Arabic

## 2.1 The honest position

`src/i18n/dictionaries.ts:758` — `export const AR: Dictionary = {}`. This is **deliberate**, and the header (`:6–27`) says why: AC-74 requires every string to resolve through a key, an empty dictionary renders the English fallback for all of them, *"translation of 200 operator-facing strings is a content decision, not an engineering one"*, and the empty map doubles as AC-74's test fixture.

**Measured scope: 4,318 keys** across 26 `copy.ts` files plus `dictionaries.ts` — not 200. That estimate is an order of magnitude stale, and it is the single most important number in this plan.

**What already works and is genuinely excellent:** the mirroring geometry (66 logical-margin utilities, 124 `text-start/end`, zero `flex-row-reverse`, four regression test suites), the `:root:lang(ar)` type ramp raising every step, Noto Naskh self-hosted and subset, Inter first in the stack so numerals match across languages, `ar-SA-u-ca-gregory-nu-latn` pinned to defeat Hijri and Arabic-Indic defaults, and plural forms resolved through `Intl.PluralRules` — **so Arabic's six CLDR categories are already handled**, which is the part teams usually get wrong.

**The product is one dictionary away from being Arabic.** That is a very good place to be.

## 2.2 The four engineering gaps that must close before translation starts

**A1 · 199 strings are not keyed** (`16` §1). `t(key, { defaultValue })` across 10 files — Applicant Detail (55), Corporate Detail (41), Dispatch (23), Corporate screen and modals (41), and others. These are invisible to any translation pass. **Fix: delete `defaultValue` from the `t()` signature** — 199 silent gaps become 199 compile errors — and widen `localisedKeys.test.ts` to scan `t('…')` literals in `.tsx`, which is a check it already performs for data-layer keys and already argues for in its own header.

**A2 · `<bdi>` is missing in table cells.** `isolate.ts` is used in `Money`, `MetricTile`, auth and reports — **and nowhere in `DataTable`.** Audit C observed the consequence in the running app: **every timestamp in every table renders reversed in Arabic** (`09:39 25 يونيو` instead of `25 يونيو 09:39`), and truncation clips the discriminating end of names in both languages. Fix: isolate identity cells, name cells and every `formatDate` call site.

**A3 · Raw machine identifiers bypass the dictionary entirely.** See Part 3 — they are untranslatable by construction, so this is an Arabic blocker as much as a copy one.

**A4 · Arabic is 4–8% wider than English at the same point size**, and six tables already run 15–25 columns (`15` §0.5) with an identity column that collapses to 38px at 1280 (`17` P0-3). **Fix P0-3 before translating**, or every Arabic string will be blamed for a bug that predates it.

## 2.3 The translation plan itself

**Not an engineering task, and it should not be run as one.**

1. **Freeze and extract.** Once A1 lands, every string is behind a key. Export all 4,318 to a translator-facing format with screen context and a screenshot reference.
2. **Terminology glossary first, ~120 terms.** Captain, rider, trip, subscription, escrow, payout, halala, dispute, SLA, breach, claim. **Decide these once with the business, before the bulk work**, or the same noun gets three renderings across three screens and the console reads as three products.
3. **Ratify §9.6's rulings before the bulk pass**, because they are already made and just need honouring: **masdar, not imperative**, for every button; `،` `؛` `؟` for punctuation; MSA, one register, no dialect and no code-switching; Latin proper nouns keep their capitalisation and stay `<bdi>`-isolated; the terminal period must be the last character of the source string and never before a trailing interpolation.
4. **Translate by workspace, not alphabetically.** Ship Operations complete before starting Financials. A half-translated console is worse than an English one — §9.3 names it as the policy the rebuild exists to retire.
5. **Pseudo-localise in CI.** Render every key as its Arabic form padded 40% to catch overflow before a human translator's work gets blamed for a layout bug.

**Sequencing:** A1 and A2 are ~2 days of engineering and unblock everything. The 4,318-string content pass runs in parallel with all of `13`–`17` and gates on nothing but the glossary.

---

# Part 3 — Humanising the language

## 3.1 The surprise: the copy law is already excellent, and already obeyed

DESIGN.md **§5.7 (UX writing rules)** and **§9.6 (Copy rules in Arabic)** mandate: sentence case; buttons are verbs; no exclamation marks; no "successfully"; errors are imperatives naming the fix, with no blame and no "please"; empty-state headings state the section's *value*, not the absence of data; second person; constraints in helper text rather than tooltips; toasts echo the button's object and stay ≤ ~5 words.

**I audited compliance across all 26 `copy.ts` files and `dictionaries.ts`:**

| Banned | Occurrences |
|---|---|
| "successfully" | **0** |
| "please" / "Please" | **0** |
| "!" in system copy | **0** |
| "Oops" / "Sorry" / "Whoops" | **0** |
| US spellings (`canceled`, `utilization`, `color`…) | **0** |
| Title Case | 12, and all are proper nouns (`Trip Assurance`, `Captain Fairness`, `Apache Parquet`) |

Every apparent hit was a **comment documenting the ban**. There are copy tests (`financials.copy.test.ts`) enforcing it. **This is the most disciplined UI copy I have measured in a codebase.**

**So "humanising" is not a compliance problem, and any plan that treats it as one is solving the wrong thing.** There are two real problems instead.

## 3.2 Problem one — the system speaks its own internal vocabulary

Verified, and it is the concrete defect:

```
TicketsScreen.tsx:155        <span className="font-mono text-xs …">{tk.reasonCode}</span>
TicketDetailScreen.tsx:486   <span className="font-mono font-medium …">{data.reasonCode}</span>
```

**No `t()` lookup.** An operator triaging a ticket reads `fare_dispute`, `captain_absence`, `payout_blocked` — in monospace, which announces "this is a machine string" — where they should read *Fare dispute*, *Captain didn't arrive*, *Payout blocked*.

And there are **zero `perm.*` keys in the dictionary** against 20 permission keys (D17), so the same is likely true on `/admin/team`, where audit C observed `view_analytics` and `view_operations` on screen.

The irony is sharp: `ReasonCodesCard.tsx` is 735 lines built entirely around the rule that a reason code is *never deleted and never renamed* because historical records point at the key as a string — *"a key that stops resolving turns a two-year-old decision into a raw `TRP_GHOST_COMPLETE` on screen"*. **The file that exists to prevent raw keys reaching operators is adjacent to two screens that render raw keys to operators.**

**Fix (~1 day):** a `reason.<code>` and `perm.<key>` label per code, resolved through `t()`, with the raw code available on hover or in a detail row for audit purposes — never as the primary rendering. Monospace is retained *only* for genuine identifiers (`TRP-8001`, `RDR-4821`), which is what it is for.

## 3.3 Problem two — the law optimises for precision and is silent on warmth

§5.7's rules are all *prohibitions*: no exclamation, no please, no blame, no successfully, ≤5 words. Follow them perfectly — and the product does — and you get copy that is **correct, terse, and slightly cold.** For a console where a mistake costs money that is largely the right trade, and it should not be undone.

But there are five moments where the law is silent and warmth costs nothing:

**1. Empty states — obey the letter, extend the spirit.** §5.7 already requires the heading to state the section's *value*. Extend it: **the first-run empty state should say what the operator will be able to do**, not what the section contains. Not "No disputes yet" but "Disputes land here when a rider or captain challenges a charge." One sentence, no CTA needed if there is nothing to create.

**2. Refusal reasons — name the fix and the actor.** The existing rule is "imperative naming the fix, no blame". `unavailableReason` already does this well (40 sites — *"Sarah Al-Rashid already owns this ticket."*). What is missing is **who can unblock it** when the operator cannot: *"Only an Ops Manager can approve above SAR 5,000."* is more useful and more human than a greyed button. This pairs with `16` §4's tooltip-on-disabled proposal.

**3. Money confirmations — state consequence in plain words.** `ConfirmMoneyDialog`'s payable/debt/**net** block is the best copy in the product and `14` G5 already generalises it. Add one plain-language line above the figures: *"Ahmed will receive SAR 1,240 — SAR 310 less than the payable, because of outstanding cash debt."* The numbers are the record; the sentence is what stops a misread.

**4. Zero is a fact, not a failure.** Per `14` G4 and Plane's grouped lists, a queue at zero should say *"Nothing waiting."* — which is good news on a work queue — rather than rendering an illustrated empty state that reads like an error. `emptyKind: 'cleared'` already models this distinction; the copy should match the model.

**5. One completion moment.** Onboarding (`OnboardingLayer`) has a `Progress` bar and no acknowledgement at 100%. A single quiet line — no confetti, no exclamation mark, still §5.7-compliant — is the cheapest warmth available in any product.

## 3.4 What NOT to do

- **Do not add personality to error copy.** "Oops!" in a console that moves money is worse than silence, and §5.7 is right to ban it.
- **Do not lengthen toasts.** ≤5 words is correct; an operator sees ~60 a day.
- **Do not soften refusals into suggestions.** "You may want to…" is less respectful than "You can't, and here's who can."
- **Do not translate the voice separately.** §9.6 already binds the same stance in Arabic; the masdar ruling is the Arabic form of "buttons are verbs."

---

# Sequencing across the three

| Work | Days | Blocks / unblocks |
|---|---|---|
| **A1** delete `defaultValue`, widen the key test | 1 | **Unblocks the entire translation pass** |
| **H1** `reason.*` and `perm.*` labels | 1 | Unblocks translating those strings; fixes a live defect |
| **A2** `<bdi>` in table cells | 1 | Fixes every Arabic timestamp *(already day 3 in `17`)* |
| **P1** installable shell | 1 | — |
| **P2** offline reads + `cacheKey` | 2 | Also a perceived-speed win independent of PWA |
| **H2** copy warmth on the five moments | 2 | After `14` G4/G5 land |
| **P3** queued mutations | 3 | Needs the registry's `affordance` data |
| **P4** push | 2 | Needs a backend |
| **Arabic content pass, 4,318 strings** | — | Not engineering. Runs in parallel; gates only on the glossary |

**Do A1 and H1 first.** Two days, and together they are the difference between "we could translate this" and "we can't yet" — plus H1 fixes a defect an operator is looking at today.

**The framing worth holding onto:** all three of these are *finishing* work, not new direction. PWA is mostly wiring caching that already exists. Arabic is one dictionary behind a mechanism that already works. And the copy needs no new law — it needs the law applied to the strings that escaped it, and five moments where being human costs nothing.
