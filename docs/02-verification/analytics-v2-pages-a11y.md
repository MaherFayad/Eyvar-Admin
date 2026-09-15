# Pages of blocks — accessibility audit (WP-4.8)

**Scope** The twelve block views, the block frame and its menu, the add-block picker
(including `/`), turn-into, columns, the page index and templates, publish, autosave and the
409 conflict, the scope bar, print. Keyboard operability, focus visibility/order, screen-reader
semantics, reduced motion, Arabic/RTL, contrast — computed, not eyeballed.

**Method** `npx vite --port 4327` (already running — a concurrent agent's server, reused
rather than starting a second one) plus Playwright, via `scripts/harness/pages-v2.mjs`
(new, committed). Every claim below is either a line in that script's `[OK]`/`[FAIL]` output,
a file:line citation, or explicitly marked unrun. Full output captured this session; rerun
with `node scripts/harness/pages-v2.mjs` (`HARNESS_BASE` env var to point elsewhere).

Fixture used throughout: page `DSH-1` (`Monday morning`, migrated from the dashboard fixture
by `dashboardToPage`) — a hero `report` block, a `columns` block with two `report` blocks, at
`/management/reports/pages/DSH-1`.

---

## Blocking

| # | Issue | Evidence | Fix |
|---|---|---|---|
| B1 | **A focusable element inside a report chart has no visible focus indicator at all**, violating CLAUDE.md rule 5 and the a11y brief's unconditional "`outline-none` without `focus-visible:ring` is a defect wherever it appears." Tabbing through an in-page chart (Recharts, `accessibilityLayer`) lands on `<g class="recharts-layer recharts-brush-traveller" tabindex="0">` (also reproduced on `recharts-layer recharts-pie` in an earlier run against `DistributionCard`'s pie chart) with `outline: rgb(23,26,33) none 3px` (style **none** — not drawn) and `boxShadow: none`. This is a **regression of the exact class of bug already fixed and documented in the same file**: `globals.css:3899` sets `.recharts-layer, .recharts-sector { outline: none; }`, and the only restoring rule is scoped to the outer surface, `globals.css:3911` `.recharts-surface:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`, with a comment recording the original 2026-09-04 measurement ("38 Tabs into `/management/reports/RPT-1` lands on the plot and nothing was drawn"). That fix covers the *outer* `<svg class="recharts-surface">` (confirmed visible: `rgb(12,105,68) solid 2px`, `pages-v2.mjs` §"FOCUS RING") but not the nested `<g>` layers Recharts' own `accessibilityLayer` also makes focusable one Tab press later. | `scripts/harness/pages-v2.mjs` §"FOCUS RING — inside a report block chart", `[FAIL]` line; `src/styles/globals.css:3899-3915` | Extend the CSS carve-out (or set `focusable={false}`/suppress `tabIndex` on the inner Recharts layers via the chart wrapper) so every element `accessibilityLayer` makes focusable gets the same ring `.recharts-surface` does — not just the outermost one. Owner: whoever next touches `src/components/reports/SeriesChart.tsx`/`DistributionCard.tsx` or the chart CSS block. |
| B2 | **Closing the "New page" dialog returns focus to `<body>`, not to the `New page` button that opened it.** Confirmed live: `document.activeElement === document.body` after `Escape`. Per this audit's own charter, "Focus returning to `<body>` is a defect — the operator loses their place," and here it happens on the entry point to AC-1212's whole template flow. | `scripts/harness/pages-v2.mjs` §"NEW PAGE DIALOG", `[FAIL]` line; `src/screens/pages/PagesView.tsx`'s `NewPageCard` wraps `AlertDialog` (Radix) with no explicit focus-return handling, and the default Radix behaviour here is not restoring it (worth checking whether `setCreating(false)` unmounting the trigger's own re-render loses the ref) | Give `NewPageCard`'s `AlertDialog` an explicit `onCloseAutoFocus` (or verify the trigger button survives the state update that closes it) so focus returns to the `New page` button. Owner: whoever next touches `PagesView.tsx`. |

Two further findings are real and reproduced but do not block the *task* because a working
keyboard alternative exists; they are filed as should-fix below rather than here (S1, S3).

## Contrast

| Element | Ink/edge | Ground | Ratio | Floor | Verdict |
|---|---|---|---|---|---|
| `--foreground` `#171a21` | text | `--card` `#fafbfc` (light) | 17.43:1 (from `docs/ref/a11y.md`, `--ink` vs white; re-derived on `--card` here is materially the same ground) | 4.5:1 | PASS |
| `text-muted-foreground` (`--ev-text-2` `#5c636e`) | text | `bg-card` (computed `rgb(250,251,252)`) | **5.850:1** (canvas-composited, `pages-v2.mjs` §"muted-foreground" — see console output) | 4.5:1 | PASS |
| **Callout tone border, light** — `border-info` `#eaf0fe` | UI boundary / the tone's own signal | page `#ffffff` | **1.142:1** | 3:1 (a status signal, not a hairline — see note) | **FAIL** |
| Callout tone border, light — `border-success` `#e7f6ec` | ″ | `#ffffff` | **1.118:1** | 3:1 | **FAIL** |
| Callout tone border, light — `border-warning` `#fff4e6` | ″ | `#ffffff` | **1.086:1** | 3:1 | **FAIL** |
| Callout tone border, dark — `border-info` `#222f4e` | ″ | `#14181e` | **1.344:1** | 3:1 | **FAIL** |
| Callout tone border, dark — `border-success` `#1b3827` | ″ | `#14181e` | **1.392:1** | 3:1 | **FAIL** |
| Callout tone border, dark — `border-warning` `#3f2f18` | ″ | `#14181e` | **1.383:1** | 3:1 | **FAIL** |
| Callout tint background (effective, composited), light — info/success/warning | background wash | `#ffffff` | effective `#fdfdff` / `#fdfefd` / `#fffdfc` — **1-2 sRGB units from white** | n/a (see note) | fails as a *signal*, not as a contrast ratio |
| Neutral callout border (`--border` `#e3e7ea`), light | structural hairline | `#ffffff` | 1.244:1 | none (`a11y.md`: "card hairlines: none") | exempt, correctly |

**Why this is graded a failure and not "decorative":** `docs/ref/a11y.md` exempts "decorative
rules, dividers, card hairlines," and separately requires **3:1 for "graphics needed to
understand content — chart strokes, status dots, progress fills."** A callout's tone
(info/success/warning) is exactly that second category, not the first: `CalloutBlockView.tsx`
renders the `Select` that names the tone (`Info`/`Success`/`Warning`) **only in edit mode**
(`editing && <Select …>`, `CalloutBlockView.tsx:31-46`). In view mode — what every non-editing
operator sees — the tone is carried **solely** by this border/tint pair, computed at
1.09-1.39:1, roughly a third of the 3:1 floor and visually indistinguishable at a glance (the
three tinted backgrounds differ from pure white by 1-2 RGB units each — `#fdfdff` vs `#fdfefd`
vs `#fffdfc` vs `#ffffff`). This is the same trap this brief warned about, arrived at from
`bg-info/10`: `--color-info` is *already* `--tone-info` = `--ev-blue-lt` = `#eaf0fe`, itself
documented as "`--ev-blue` at 10% on white" (`globals.css:884`); `CalloutBlockView.tsx:17`
applies **another** 10% on top (`bg-info/10`), so the callout tint is ~1% of full saturation.
The **proposed fix must be re-measured, not assumed**: swapping `bg-info/10` for `bg-info`
(the un-halved tint) would land the background at `#eaf0fe` itself, whose border-vs-white
ratio is the 1.142:1 already measured above — still failing 3:1, because the underlying token
was never designed to be a 3:1 boundary at 100% either. A real fix needs a new or
re-purposed token, not a class-name swap; flagged for design-token-steward.

Screen-reader carrier is equally absent: `BlockFrame.tsx`'s `blockOwnTitle()` has no case for
`callout`, so an untitled callout's accessible name falls back to `pg.block.positionalName`
("Callout 1") with **no tone in the name at all**. An operator relying on either channel —
sighted-but-low-contrast, or a screen reader — cannot tell an `info` callout from a `warning`
one in view mode. Filed as should-fix (S2), not blocking, because reading the callout's own
text usually discloses its intent in practice, per this fixture's copy — but that is an
authoring accident, not a designed carrier, and R7/§7.5 ("colour is never the only carrier of
meaning") is not met by accident.

## Keyboard walk

Pressed, in order, against `DSH-1`, no mouse:

1. **Can the task be completed?** Yes, for the core edit loop. `Tab` → `Edit` → `Enter` enters
   edit mode. `Tab` (40 presses from a cold load, expected given the shell's own nav/header
   chrome precedes the page body) reaches the first `Add block` affordance; `Enter` opens the
   picker; typing `Heading` filters it; `Enter` inserts. Focused the new block
   programmatically (the equivalent of continuing to Tab to it) and pressed `Alt+ArrowDown` —
   moved it one slot, confirmed by DOM order before/after. `Ctrl+D` duplicated it (block count
   +1). `Delete` removed it, showed a toast with a reachable `Undo` **as an element**, and
   `Ctrl+Z` restored it (block count back to the duplicated total). All ten checks: **`[OK]`**
   in `pages-v2.mjs`. AC-1196, AC-1199, AC-1200 hold end to end by keyboard.
2. **Is focus visible at every stop?** No — **see B1**. Every ordinary control (button, input,
   textarea, the block frame `div[tabindex=0]` itself) carries a visible ring (`box-shadow`
   with `rgb(12,105,68)`, the site's `--ring`, confirmed at 15 consecutive tab stops in the
   trace). The one failure found is entirely inside a Recharts chart's own focusable layers.
3. **Is the order the reading order?** Yes, for everything walked: `BlockList` renders the
   insertion affordance before each block and after the last (`gap(0)`, then per block
   `BlockFrame` + `gap(index+1)`, `BlockList.tsx:100-111`) — DOM order, not a `tabindex` patch,
   matching AC-1196's "between every pair of blocks and at the end."
4. **Does focus go somewhere sensible on open, and return on close?**
   - The kebab menu: **yes**. Opened via a click on the trigger (`Enter` while it's focused,
     confirmed in `pages-v2.mjs`), `Escape` closes it and returns focus to the trigger itself
     (`aria-label` re-read after Escape matches the trigger's own label). AC-1198 holds.
   - The "New page" dialog: **no — see B2.**
   - The report-picker panel (`ReportPickerPanel.tsx`, inline inside a gap, not a Radix
     primitive): opens correctly with `autoFocus` on its search input, but **see S1** — it has
     no `Escape` handler at all.
5. **Does Escape do the obvious thing, and only once?**
   - Kebab menu: yes, one Escape, closes, focus returns (above).
   - New-page dialog: yes, one Escape closes it — but focus lands wrong (B2).
   - Report-picker panel: **no — see S1**, `Escape` does nothing; the only way to close it by
     keyboard is to Tab to the panel's own `Cancel` button.
   - Add-block picker (`cmdk`, a `Popover`): not independently re-tested this pass beyond
     `pages.mjs`'s own coverage (`screenshot ...picker.png`, `Escape` used there to close it);
     no defect suspected — cmdk/Radix `Popover` wires `Escape` and return-focus by default and
     nothing in `AddBlockPicker.tsx` overrides it.

Two further keyboard findings, both real, both non-blocking because a keyboard alternative
exists:

- **S1 — the report-picker panel ignores `Escape`.** `ReportPickerPanel.tsx` is a plain
  `<Card>`, not a Radix `Popover`/`Dialog`, and defines no `onKeyDown`. Confirmed live: after
  opening it and pressing `Escape`, the panel's search input is still present
  (`pages-v2.mjs` §"REPORT PICKER PANEL", `[FAIL]`). The operator can still close it with `Tab`
  → `Cancel` → `Enter`, so the task is completable, just not the way every other popover on
  this page behaves. Owner: whoever next touches `ReportPickerPanel.tsx`/`BlockList.tsx`.
- **S3 — after `Delete`, focus is abandoned to `<body>`, and the toast's `Undo` button is not
  reachable within a reasonable number of further `Tab` presses (checked up to 8; not found).**
  The deleted block held focus; removing it from the DOM leaves no successor set, so the next
  `Tab` restarts from the top of the document (nav rail, header, etc.) rather than landing on
  or near the toast. **`Ctrl+Z` is a full, tested, working alternative for exactly this case**
  (confirmed in the keyboard walk above), so the *task* — undo an accidental delete — remains
  completable by keyboard. But the visible, documented affordance (R10: "a toast, not a
  dialog," with an `Undo` action) is not itself practically reachable by keyboard, which is a
  real defect against Question 4. Owner: `usePageEditor.ts`'s `deleteBlockWithUndo`, or wire a
  focus target (e.g. the toast region, or the next/previous sibling block) after deletion.
- **S4 — `Shift+F10` does not open the block menu**, despite being documented twice as doing
  so (`BlockFrame.tsx:2` "and `Shift+F10` on a focused frame", `PageView.tsx:119` "Shift+F10
  opens the block menu (AC-1199)"). `PageView.tsx`'s `onKeyDown` (lines 122-144) handles
  `Alt+ArrowUp/Down`, `Ctrl+D`/`Cmd+D`, and `Delete`/`Backspace` — there is no `case` for
  `F10`/`shiftKey` at all. Confirmed live: `pages-v2.mjs` `[FAIL]` on this check. **Not
  blocking**: the kebab `<button>` is a real, present-at-all-times DOM node (hidden only by
  `opacity-0`, which does not remove it from the tab order) and is reachable by one ordinary
  `Tab` press after the block frame, confirmed in the full-detail focus trace (`tab+19` frame
  → `tab+20` the kebab, `aria-label="More actions for New subscriptions by plan"`). Fix is
  cheap: add the `F10`+`shiftKey` case to `PageView.tsx`'s `onKeyDown` and call
  `event.preventDefault()` + focus/open the menu for the block the event originated in.

**Tables/roving focus**: no `DataTable` grid appears inside a page block (the `table` block
type is a small hand-built table, not a `DataTable`); roving-focus applicability was not found
to be in scope here.

## Semantics

- **Native elements.** Every interactive control found is a real `<button>` (add-block
  affordance, kebab, toggle disclosure, format-bar buttons, width-control tabs, star toggle)
  or an `<a>`/`Link` (the `New report` link in `ReportPickerPanel.tsx:96-98`). No
  `<div role="button">` found in the files read.
- **F-V2-87, block accessible names — verified fixed, live.** Two freshly-inserted, untitled
  `Text` blocks got `"Text 1"` and `"Text 2"` (`pages-v2.mjs` §"ACCESSIBLE NAMES", `[OK]`), and
  a titled `report` block keeps its own title (`"Captains vs riders · 30 days"`), matching
  `BlockFrame.tsx`'s `blockOwnTitle()`/`pg.block.positionalName` fallback (lines 32-55). **One
  gap remains**: `blockOwnTitle()` has no case for `callout` (see Contrast, above) — its
  accessible name never carries the tone, only "Callout N."
- **F-V2-73, disabled-reason reachability — verified fixed, live and by code.** Opened the
  kebab on the report block that has a live `columns` block and a legal `turn-into` target: as
  expected, "Move to column…" and "Turn into…" render as real, openable
  `DropdownMenuSub`s (`aria-haspopup="menu"`), because both have legal targets
  (`pages-v2.mjs`, menu items list). Code-read confirms the other branch:
  `BlockMenu.tsx:110-116` and `:143-149` render a **plain, always-open, never-a-submenu**
  `DropdownMenuItem` with the reason as visible text (`pg.edit.moveToColumn.none`,
  `pg.edit.turnInto.none`) whenever `columnsBlocks.length === 0` / `turnable.length === 0` —
  e.g. a `divider` block, which is in neither the prose nor pinned `canTurnInto()` groups, so
  `turnable` is always empty for it. This is exactly the fix F-V2-73 called for: a reason that
  cannot be read is hidden, and this reason is never behind a submenu Radix would refuse to
  open.
- **`AC-1192` toggle** — `ToggleBlockView.tsx:21-24` is a real `<button aria-expanded={block.open}>`
  and its content div uses the native `hidden` attribute (`:42`, `hidden={!block.open}`), which
  removes it from the accessibility tree when closed, not just visually — confirmed by code
  read, matches the AC's own wording exactly.
- **Add-block affordance names are not positionally distinct.** Every "Add block" button
  shares the literal copy key `pg.edit.addBlock` = `"Add block"`
  (`src/screens/pages/copy.ts:131`) with no position/context parameter, unlike the F-V2-87 fix
  applied to block frames. A screen-reader operator using "next button" navigation cannot tell
  one insertion point from another by name alone (only by the surrounding block names read in
  sequence). Graded **note**, not should-fix: DOM/tab order still puts each one in the right
  place, and the surrounding block's own (now-distinct, per F-V2-87) name disambiguates it in
  practice when read linearly.
- **Live-region for autosave status** — `PageView.tsx:169` wraps the `Saving…`/`Saved · time`
  text in `<p role="status">`, which is implicitly `aria-live="polite"` — correct per the
  brief ("polite unless the operator must stop"), an autosave confirmation is exactly the
  polite case.
- **Conflict notice** — `PageView.tsx:224` uses `role="alert"` (assertive) for the 409 notice.
  Arguably correct (unsaved-edit risk is worth interrupting for) — graded **note**, a
  judgement call rather than a defect either way.

## Reduced motion and RTL

**Reduced motion.** Forced `reducedMotion: 'reduce'` in a fresh context: `body`'s computed
`transition-duration` is `0.001s` (`pages-v2.mjs`, `[OK]`), confirming `globals.css:1238`'s
global collapse applies inside Pages same as everywhere else — no per-component branch needed
or found missing. Checked specifically for meaning-only-in-motion, per this brief's
instruction to look for it rather than a missing branch:
- `ToggleBlockView.tsx`'s chevron rotation (`rotate-90` on open) is **not** the only signal of
  open/closed state — `aria-expanded` carries it for assistive tech, and the `hidden` content
  div is the sighted-and-unsighted ground truth either way; the rotation is decoration on top
  of a state that is already legible without it. No defect.
- The `Saving…` → `Saved · <time>` swap (`PageView.tsx:169-175`) is a text replacement inside
  a `role="status"`, not an animation — nothing here depends on motion at all.
- No ambient loop was found anywhere in the pages surface (R18) — the pie/bar charts set
  `isAnimationActive={false}` pattern used elsewhere in the reports surface was not
  specifically re-verified for `DistributionCard.tsx` this pass (see Unrun).

**RTL.** Switched language to Arabic (`dir="rtl"` confirmed on `<html>`), entered edit mode,
measured the first block frame's geometry:
`{"frameLeft":32,"frameRight":904,"handleLeft":883,"menuLeft":37}`.
- Drag handle (`DragHandleIcon`, positioned `start-1` in `BlockFrame.tsx:95`) sits at
  `left:883`, **21px from the frame's right edge (904)** — correctly mirrored to the visual
  right under RTL. `[OK]`.
- Kebab menu wrapper (positioned `end-1`, `BlockFrame.tsx:99`) sits at `left:37`, **5px from
  the frame's left edge (32)** — correctly mirrored to the visual left. `[OK]`.
Both use logical Tailwind utilities (`start-`/`end-`), not physical `left`/`right`, so this is
the expected/correct behaviour, verified rather than assumed. Columns-order mirroring under
RTL (AC-1219's other half) was **not** independently re-measured this pass — see Unrun.

## Unrun

- **The 409 conflict, live.** `savePage`'s mock implementation (`src/data/clients/pages.ts`)
  keeps its `pages` array as **module-scoped, per-page-load state** (`DATA_SOURCE === 'mock'`,
  the default with no `VITE_DATA_SOURCE=http` set) — there is no shared backend across browser
  contexts/tabs, so two independent Playwright contexts editing the same page id never collide
  the way two real operators sharing one server would; each starts its own copy at
  `version: <fixture>`. Reproducing a genuine 409 would need either a real backend
  (`VITE_DATA_SOURCE=http`, out of scope for a static-harness run) or driving the mock client's
  internals directly from the page's own JS realm, which risks conflating a test artefact with
  a real finding. **Verified instead by code read**, with file:line citations, in the
  Semantics-adjacent discussion above and in the QA report: `usePageEditor.ts`'s `reload()`
  (lines 160-167) explicitly re-stamps `versionRef` from the conflict and re-sends `content`
  unchanged — the fix F-V2-70 called for (previously, `reload()` changed neither of the
  debounce effect's dependencies, so the kept edit was never resent). This is a code-level
  confirmation, not a browser-level one; flagged as such rather than claimed as passing.
- **Columns order mirroring under `dir="rtl"`** (the second half of AC-1219) — not
  independently screenshotted/measured this pass; `ColumnsBlockView.tsx` uses CSS Grid
  auto-placement with no explicit `grid-column` pins, which mirrors automatically under RTL by
  spec, but this was not verified against a rendered columns block in Arabic.
- **Full print pass** — already covered by the existing `scripts/harness/pages-print.mjs`
  (WP-4.7); not re-run this session since it is outside this work package's new-evidence
  remit and its last recorded state (per the build log) is green. Not independently re-verified
  here.
- **`DistributionCard.tsx`'s `isAnimationActive` setting** — inferred from the same pattern
  documented for `SeriesChart.tsx`/`PanelChart.tsx` in the charts a11y note, not independently
  grepped in this file this pass.
- **Full accessible-name sweep of every block type's edit-mode controls** (e.g. `table` block's
  add-row/add-column, `bookmark` block's target picker) — the twelve block types were read for
  structure and the ones most load-bearing for this brief (toggle, callout, report, metric,
  alert-status) were checked in the browser or by code; the remainder (`table`, `bookmark`,
  `divider`, `agent-insight`) were read for code-level compliance only, not independently
  exercised live.

## Verdict

**Two blocking findings** (B1: invisible focus inside a report chart's nested Recharts layers;
B2: focus lost to `<body>` after closing the New-page dialog) and **four should-fix**
(S1 report-picker Escape, S2 callout tone contrast/no accessible-name carrier, S3 focus
abandoned after Delete with the toast's Undo practically unreachable, S4 documented-but-missing
`Shift+F10`). The core keyboard editing loop — add, move, duplicate, delete, undo — is fully
operable without a mouse and was proven end to end, live, in this session. F-V2-87 and F-V2-73
are confirmed fixed, live. Not a pass: two real, reproduced focus-visibility/focus-management
defects sit on paths (a report chart, and page creation) every operator touches daily.
