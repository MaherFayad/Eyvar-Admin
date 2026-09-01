# 17 — Reconciled findings: three independent audits of the same tree

**Status:** the master view. Supersedes the priority ordering in `13`–`16`; their content stands except where corrected here.
**Sources:** three independent audits of the same working tree, run without access to each other's conclusions.

| | Method | Strength |
|---|---|---|
| **A — static scan** (`13`–`16`) | greps across 205 files, token layer, docs | breadth; token and IA coherence |
| **B — code review** | greps + `tsc` + `dist` inspection | correctness, dead code, dependency reality |
| **C — empirical** | **ran the app**, screenshotted 4 widths × 2 languages, ran axe | the only source that saw what users see |

**The headline: audit C found things no amount of code reading could have.** Running the product at 1280px in Arabic surfaced defects that every static pass — including all four of mine — missed completely. That is the methodological lesson of this exercise.

---

## 1. Verified defects, in priority order

Every item below was independently re-verified against source before being listed. Items that failed verification are in §3.

### P0 — Ship-blocking

**1. `tsc -b` exits 1. The production build does not pass.**
`npm run build` is `tsc -b && vite build`. Verified three times over ~40 minutes, with **different errors each time** (captains.ts ×2 → conversations.ts ×2 + revenue.test.ts + ConversationPane.tsx). The tree is under active concurrent edit, so the specific errors are a moving target; **the stable fact is that the gate is red and nothing enforces it.** Audit C additionally reports the dev server serving a blank page on every route at the moment it ran. *Fix: make typecheck a merge gate. Everything else waits on this.*

**2. A row click fires whatever action is first — including destructive ones.** `DataTable.tsx:960`
The row-click target is chosen by regex-matching the **translated display label**, with `?? declaredActions[0]` as fallback. Verified consequence: `EmailLogCard.tsx:276–282` declares one action, `Resend`, calling `resend(delivery)` with no confirm. "Resend" matches none of the regex alternatives, so it falls through to itself. **Clicking an email-log row re-sends a message to a customer.** Audit B reports the same shape on API-key rotation and webhook replay. Any Arabic verb outside the hardcoded set (`استعراض`, `معاينة`) mis-routes the same way.
*Fix: delete the regex and the fallback; take an explicit `onRowClick`/`primaryAction`. A screen with no safe primary gets no row click.*

**3. The identity column collapses to 38px at 1280 and 0px at 1152.** `pinning.ts:85`, `ui/table.tsx:117`
Audit C measured the `Trip` column across widths: **1152 → 0px · 1280 → 38px · 1366 → 92px · 1512 → 238px · 1920 → 646px.** At 1280×800 — the commonest ops laptop — every row renders with no ID and no route, just an avatar, and there is no horizontal scrollbar to recover it.
Cause verified: the table is `table-fixed` (`ui/table.tsx:117`) and the identity column declares `minWidth` with no `width`. **`min-width` on a table cell is ignored under `table-layout: fixed`.** `pinning.ts:90–92` asserts the opposite in a comment: *"this is what stops the residual from being zero."* It does not.
*Fix: declare a `width`, move `min-width` to the `<table>` so the container's existing `overflow-x-auto` and pinning engage.*

### P1 — Accessibility failure on the rows that matter most

**4. Critical rows fail AA, and the obvious fix fails harder.** `DataTable.tsx:848, 1215, 1257`
axe measured `--ev-text-2` on the `bg-rose-50/95` critical tint at **4.40:1**. Computed independently: white 4.83 ✓ · rose-50 **4.40 ✗** · `--ev-red-lt` **4.35 ✗**. So swapping to the semantic token — which is what `15`'s H5 originally proposed — makes it *worse*. The critical row needs an on-token ground **and** its own derived ink, exactly as `--ev-text-2-rail` was derived when the rail darkened. `globals.css` states the law being broken: *"Darkening a surface without re-deriving the ink on it is how a re-skin quietly drops below AA."* `15` H5 has been amended.

**5. No keyboard path to open a record.** `DataTable.tsx` — zero `onKeyDown`, zero `tabIndex`, while `:1203` is a `<TableRow onClick>` painted `cursor-pointer`. Audit C measured the consequence: **~5 tab stops per row × 25 rows = 125+ stops** to cross one table. Roving focus exists (`useRovingFocus`) and is applied to the header, rail and sub-nav — every group except the rows.

**6. `aria-controls` dangles on every index screen** (axe *critical*). `Tabs` is used as a view switcher with no `TabsContent`, so `aria-controls` points at a non-existent panel.

**7. Arabic text is directionally right and textually broken.** `isolate.ts` / `<bdi>` is used in `Money`, `MetricTile`, auth and reports — **and nowhere in `DataTable`.** Audit C observed the result in the running app: timestamps render `09:39 25 يونيو` instead of `25 يونيو 09:39` — **every timestamp in every table, in Arabic** — and truncation clips the discriminating end of the string in both languages (`…strict 1` for `District 6`; `…ن عبد الله آل عبد الله القحطاني` on payouts).

**8. No error boundary anywhere.** Zero `ErrorBoundary` / `componentDidCatch` / `getDerivedStateFromError` in `src/`. One render throw blanks the console mid-shift.

### P2 — Density: the finding all three audits reached independently

**9. Every non-ledger table runs at 60px rows, unconditionally.** `DataTable.tsx:713`
```ts
const rowHeightClass = isLedger ? 'h-row' : 'h-row-media'   // 60px, 64px in Arabic
```
Not 40px, which is what `13` and `15` assumed when proposing 40→36. **The real number is 60**, whether or not the table has an avatar or a second line. Audit C computed the vertical budget at 1512×900: 204px of chrome leaves 644px = **10.7 rows visible**. At 40px that is 16; at 32, 20.

And `ui.density` — `'comfortable' | 'compact'` — is a fully plumbed persisted preference (`preferences.ts:60,95,134`, `persistence.ts:392`) **with zero consumers.** Both B and C found this independently.

*This makes the density work much more valuable than `13`'s G3 estimated, and it is mostly wiring something that already exists.*

### P3 — Structural

**10. `checkRowCritical` duck-types arbitrary fields.** `DataTable.tsx:320` tests `r.flagged`, `r.starved`, `r.unlinked`, `r.balanceHalalas < 0`, `'refundId' in r`. Found by B and C independently; C observed the live symptom: **on `/operations/trips`, TRP-8001 (`Cancelled`) is tinted red and TRP-9003 (`Cancelled`) is not.** An operator's only reading is "the highlighting is broken."

**11. 2.19 MB single JS chunk.** Zero `React.lazy`, zero `Suspense`, zero dynamic imports; 36 static screen imports in `routes.tsx`; all 26,615 lines of fixtures and recharts on first paint.

**12. No export on any of the 22 index tables**, while `downloadCsv` already exists and serves three other surfaces. Finance staff on Payouts, Ledger, Cash and Wallets cannot get data out.

**13. Stale caching.** `useAsync` implements full stale-while-revalidate, and **2 of ~250 call sites pass `cacheKey`.** Every sub-tab switch repaints a skeleton.

**14. `ZonesMapView`** — all three audits flagged it. B adds a licensing issue: `:286–290` fetches tiles directly from `mt1.google.com/vt/` with no key and no billing account, `loading="eager"` with no `onError`.

---

## 2. Where the three audits converged

Independent convergence is the strongest signal available here.

| Finding | A | B | C |
|---|---|---|---|
| `ZonesMapView` is off-system | ✓ | ✓ | ✓ |
| Confirm dialogs are duplicated and divergent | ✓ | ✓ | |
| Command registry built but unwired | ✓ | ✓ | |
| Critical row uses raw rose | ✓ | ✓ | ✓ (+ measured the AA failure) |
| `checkRowCritical` duck-types | | ✓ | ✓ (+ observed the symptom) |
| Density is wrong / `ui.density` unused | ✓ | ✓ | ✓ |
| Dispatch off-system | ✓ | ✓ | ✓ |
| Keyboard is absent | ✓ | ✓ | ✓ |
| Arabic content is English | ✓ | ✓ | ✓ |
| **Nothing specifies visual hierarchy** | ✓ (`15`) | | ✓ |

**The last row is the one worth noting.** Audit C, with no access to `15`, wrote: *"6,665 lines specify how a pixel is drawn; nothing specifies how a screen decides what an operator sees first… a short new section — 'hierarchy: what gets weight, what gets tone, what gets neither' — would do more for these users than any further refinement of the hairline."* That is `15`'s thesis, reached independently from screenshots rather than greps.

Both A and C also independently challenged the same decision: **D7 imported geometry from Navattic, a low-frequency marketing product, into a high-frequency console.** C's framing is the sharper one and I adopt it: *the reference governs colour, hairlines, radius and the primary action, and does not govern row pitch.*

---

## 3. Claims that did not survive verification

Recording these matters as much as the findings — three audits produced three wrong calls, mine included.

| Claim | Source | Verdict |
|---|---|---|
| "`--chart-series` and `--chart-comparison` are the same colour, so two series are indistinguishable" | B | **Wrong.** Deliberate: `globals.css:978` reads *"differs by DASH, never by hue"*, and R7 closes the palette against the categorical read a second hue invites |
| "12 build errors including 10 missing client exports" | B | **Overstated.** Verified 2, then 4, in different files. The build is red; the specifics were not reproducible |
| "Entire screens render English to Arabic users, outranking every visual item" | **A (mine)** | **Wrong framing.** `AR: Dictionary = {}` is deliberate (`dictionaries.ts:6–27`) — translation is a documented content decision. *Every* screen is English today. The 199 `defaultValue` calls remain a real but smaller defect: those strings are not keyed, so a translation pass cannot see them |
| "`DataTable` is clean of palette classes" | **A (mine)** | **Wrong.** The verification grep omitted `rose`. It has three real sites — and they are the AA failure in P1-4 |
| "Five financials screens have no loading state" | **A (mine)** | **Wrong.** All five forward `status` into `DataTable` |
| "Critical and High sharing amber is an unnoticed defect" | C | **Half right.** Verified deliberate — `tone.ts:11` explains R7 closes the palette at five tones with no red to escalate into. C's *design critique* stands (the support queue loses its top triage distinction); its framing as an oversight does not |

---

## 4. Revised sequencing

This replaces the first weeks proposed in `14` and `16`.

| Day | Work | Source | Why here |
|---|---|---|---|
| **0** | **Fix `tsc -b`; make typecheck a merge gate** | B | The build is red. Nothing else counts |
| **1** | **Row-click contract** — delete the label regex and the `[0]` fallback | B | Clicking a row emails customers |
| **1** | **Identity column width** under `table-fixed` | C | Rows are unidentifiable at 1280 |
| **2** | **Critical row: on-token ground + derived ink** (`15` H5 amended) | A+B+C | The only AA failure, on the rows that matter most |
| **2** | **`checkRowCritical` → explicit per-screen predicate** | B+C | Red rows currently look broken |
| **3** | **Row height + wire `ui.density`** | A+B+C | 60→40 nearly doubles rows visible; the preference already exists |
| **3** | **`<bdi>` on identity, name and every `formatDate` in tables** | C | Every Arabic timestamp is scrambled |
| **4** | **Row keyboard: roving focus, ↑↓ Enter Space** | A+B+C | 125 tab stops per table today |
| **4** | **Error boundary + surface `ApiError.retryable`** | B | A throw blanks the shift |
| **5** | **G1 brand green** *(pending the `--primary` ruling)* | A | Largest perceived change per hour |

**Then**, in roughly this order: ⌘K executes (`14` G12) · one confirm dialog (`14` G5) · `Column.emphasis` (`15` H1) · modal scale and toasts (`14` G6/G9) · `cacheKey` on index screens · CSV export on `DataTable` · code-splitting · Zones and Dispatch back on-system (`14` G11) · motion (`13` Phase 4) · peek (`14` G8).

**What moved, and why:** the first four rounds led with brand, motion and coherence. Empirical testing found that the product **does not build, mis-fires destructive actions on a row click, is unidentifiable at the most common laptop width, and fails contrast on its most important rows.** Those come first. The design work in `13`–`16` is still right; it was queued in front of correctness because a static scan cannot see a 38px column.

---

## 5. What all three audits agreed to leave alone

- **`globals.css`.** C: *"the best-documented token file I have seen in a product codebase."* The `source(none)` + `@source` fix (the docs were shipping the classes they forbid), the layer discipline, the Recharts literal suppression, the `:lang(ar)` ramp.
- **The money layer.** Integer halalas, Western digits forced in Arabic, an invariant that throws on non-integer input, `null → —` where the formatter *cannot* return the dash. Zero float currency math.
- **RTL geometry.** 66 logical-margin utilities, 124 `text-start/end`, zero `flex-row-reverse`, calendar pinned against Hijri defaults, four test suites linting for regressions.
- **`useAsync`, `useTick`, `useUrlTableState`.** Abort per run, latest-wins, one ref-counted interval for the app, table state in the URL in the wire's own grammar.
- **The empty-state taxonomy** — `first-run | no-match | cleared` as a union, with `emptyKind` because `isFiltered` cannot decide it.
- **Refusal-at-render** via `commands/`, so the kebab and the bulk bar cannot word a refusal differently. *(Fix the presentation — `16`/C's row-height blowout — keep the principle.)*
- **Permissions.** Six roles, 52 consumers, 40 `unavailableReason` sites, invisible-not-disabled for whole workspaces.
- **Hygiene.** Zero `console.*`, zero `window.confirm`, one `any`, all timers cleaned up, 39,579 lines of tests.

The recurring note across all three audits is the same: **this is a well-engineered product with an unfinished correctness gate and no hierarchy layer.** Neither of those is a rewrite.
