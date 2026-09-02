# Post-remediation — accessibility audit

Audited 2026-09-02 against the working tree (uncommitted; `HEAD` is `129a21e` and does not
contain this programme). Dev server `npx vite --port 5259`, Chromium 1280×820 via Playwright,
`getComputedStyle` and Chrome's own `Accessibility.getFullAXTree` (CDP) for accessible names.
Every ratio below is computed from two sampled hex values by the WCAG relative-luminance
formula; none is estimated.

**Spot-check of the gate:** `npx vitest run --maxWorkers=4` over the five accessibility-relevant
suites (`shell/qa.keyboard`, `financials/keyboard`, `components/qa.states`, `hooks/useFocusEntry`,
`lib/a11y/announcer`) — **85 / 85 green**. Every finding below sits where no test looks; none
contradicts a passing assertion.

---

## Blocking

Ranked by what stops an operator, not by cost to fix.

| # | Issue | Evidence | Fix |
|---|---|---|---|
| **B1** | **The bulk bar costs 124 Tab presses to reach.** Selecting a row with `Space` renders the bulk action bar as the *last* thing in the document's tab order. No focus move, no shortcut, no announcement. The core select-then-act workflow is keyboard-hostile. | `/operations/trips`: focus row 1 → `Tab` → `Space` (checkbox checked; bar appears with `role="group"` `aria-label="1 selected"` and buttons `Flag` / `Remove flag` / `Clear`). Counted `Tab` presses from the checked box to `Flag`: **124**. `#ev-live-region` did not exist at that moment; nothing announced. | Move focus to the bar's first action on the first selection — it is a mode change the operator caused. `announce(t('table.selectedCount', …))` on selection change. `DataTable.tsx:1883` |
| **B2** | **125 tab stops to cross one table.** Rows are a roving group (1 stop, correct), but every in-row control — checkbox, 1–3 identity links, kebab — is still an individual stop on *every* row. On the three action-heavy index screens the table body is 67–75 % of the whole document's tab order. | Focusables inside `<tbody>` / rows / per row / document total: **Trips 125 / 25 / 5.00 / 166** · **Payouts 82 / 25 / 3.28 / 117** · **People 76 / 25 / 3.04 / 114**. Screens with no in-row controls are unaffected (Ledger 1, Communications 3, Team 5). Tabbing from row 1 leaves `<tbody>` after **125** presses and lands on `<body>` — nothing follows the table. | See "The in-row tab-stop ruling" below. The ruling needs reversing, and the two criteria protecting it assert a mechanism their own docblocks do not require. |
| **B3** | **Enter on a row opens a drawer; Escape drops focus on `<body>`.** Two screens use bespoke drawers that bypass `ShellLayer` and so have neither `useFocusEntry` nor the two prevented auto-focus handlers. The operator loses their place in a 25-row table entirely — arrows stop working, and getting back costs a Tab walk from the top of the document. | `/operations/trips`: focus row 3 (`TRP-9104`) → `Enter` → focus lands on `button[data-slot=sheet-close]`, not the heading → `Escape` → `document.activeElement === document.body`; a following `ArrowDown` does nothing. Identical on `/operations/subscriptions`. Reproduced under `dir="rtl"`. Contrast `/operations/people`, which routes through `ShellLayer`: `Enter` → `h2[data-slot=sheet-title] tabindex="-1"`, `Escape` → focus back on the exact `<tr>`. | `TripDetailDrawer.tsx:102` and `SubscriptionDetailDrawer.tsx:103` raise `SheetContent` directly. Add `useFocusEntry` + the two prevented handlers exactly as `ShellLayer.tsx:158-166` does, or route them through `ShellLayer`. |
| **B4** | **D-11's return leg was not built: a layer opened from a menu closes onto `<body>`.** The hand-off half is correct and verified. The restore half is not — `useFocusEntry` captures `document.activeElement` at open, which for a hand-off **is the Radix menu item**, and that node is detached by the time the layer closes, so `useFocusEntry.ts:64` declines it and focus stays where the unmounting layer left it. The hook's own comment names this outcome as the thing to avoid. | Account menu → `My profile`: focus on `h2 "My profile"` at t≈600 ms **and still at t≈1800 ms** (D-11 holds — it did not snap back). Then `Escape` → **`<body>`**. Bell → `See all`: focus on `h2 "Notifications"`, `Escape` → **`<body>`**. | `useFocusEntry` needs a fallback when the captured opener is detached — the menu/popover *trigger*, which both call sites already hold. A silent no-op is not a safe default here. |
| **B5** | **The bell's most-used path still has the original D-11 defect.** `See all` was fixed; the eight notification rows above it were not. Opening a notification mounts the entity drawer and focus returns to the bell trigger while the drawer is open — exactly what D-11 ruled against. | Bell → `Enter` → focus first notification row → `Enter`. URL becomes `?entity=TRP-7742`, `[role=dialog]` count 1, and `document.activeElement` is `button[data-slot=popover-trigger] "Notifications"` at t=400 ms **and at t=1600 ms**. | `NotificationBell.tsx:169-172` — `onOpen` calls `setOpen(false); onOpenNotification(...)` without `handedOff.current = true`. One line, same shape as the `See all` handler at `:194`. `AppLayout.tsx:341` confirms the target is `setLayer('entity', …)`. |
| **B6** | **Modals lose focus to `<body>` on close.** 22 files render `<Dialog open …>` and 4 render `<AlertDialog open …>`; only 2 files in the tree use a `DialogTrigger`. Radix restores focus to its Trigger, there is none, so every one closes onto `<body>`. | `/admin/communications` → `Send push broadcast` → focus enters the first input, trap verified correct (26 Tabs, all inside, cycling) → `Escape` → **`<body>`**. `/admin/team` → `Invite operator` → identical. | The same fallback B4 needs — a shared return-focus hook, or `onCloseAutoFocus` pointed at the opener ref. |
| **B7** | **Every route has the same `<title>`.** `document.title` is the literal `Eyvar Admin` in `index.html:17` with **zero writers anywhere in `src/`**. WCAG 2.4.2. A screen-reader operator navigating 34 routes hears the same title on all of them; history entries and tab labels are indistinguishable. | Sampled `/`, `/operations/trips`, `/financials/payouts`, `/support/tickets`, `/admin/team`, `/nonexistent-route` — `"Eyvar Admin"` on all six, while `<h1>` correctly reads `Overview` / `Trips` / `Payouts & Escrow` / `Tickets` / `Team & Access` / *(none)*. | Write `document.title` from the route table's `titleKey` in `AppLayout`. The string exists and is already translated. |

---

## Contrast

Floors: **4.5:1** body text — no Eyvar text reaches the large-text tier at 11–14 px — and
**3:1** for UI boundaries a state depends on.

### The brand ramp

| Element | Ink | Ground | Ratio | Floor | Verdict |
|---|---|---|---|---|---|
| `--primary` fill, white label | `#ffffff` | `#0c6944` | **6.731** | 4.5 | PASS — AA, **not** AAA; doc 13's 8.42 was wrong and is corrected in `globals.css` |
| `--primary` as text on the page | `#0c6944` | `#ffffff` | **6.731** | 4.5 | PASS |
| `--primary` on the row hover/accent fill | `#0c6944` | `#f6f8f9` | **6.319** | 4.5 | PASS |
| `--primary` on `--ev-brand-lt` | `#0c6944` | `#e7f0ec` | **5.793** | 4.5 | PASS |
| `--ring` against its white offset gap | `#0c6944` | `#ffffff` | **6.731** | 3 | PASS — measured live as `outline: rgb(12,105,68) solid 2px` + `0 0 0 2px rgb(255,255,255)` offset ring |
| `--ring` on the critical row's emphasis ground | `#0c6944` | `#fef0ee` | **6.062** | 3 | PASS |
| `--ev-green` (moved), badge label | `#1d723c` | `#e7f6ec` | **5.332** | 4.5 | PASS — down from 6.351 at the old `#15653c` |
| `--ev-green` on white | `#1d723c` | `#ffffff` | **5.958** | 4.5 | PASS |

The hue separation between semantic success and brand primary costs 6.351 → 5.332 on the
success badge, which still clears AA with 0.83 of margin.

### The critical row

| Element | Ink | Ground | Ratio | Floor | Verdict |
|---|---|---|---|---|---|
| Derived meta ink, row at rest | `#666d7a` | `#fff7f6` | **4.931** | 4.5 | PASS |
| Derived meta ink, row focused/hovered/selected | `#666d7a` | `#fef0ee` | **4.689** | 4.5 | PASS |
| Identity ink, both grounds | `#171a21` | `#fff7f6` / `#fef0ee` | **16.488 / 15.680** | 4.5 | PASS |
| Unchecked checkbox boundary (R19) | `#828b99` | `#fff7f6` / `#fef0ee` | **3.259 / 3.099** | 3 | PASS — measured live as `border-color: rgb(130,139,153)` on breached rows in Payouts and Assurance |
| The ink the ground alone could not save | `#6b7280` | `#fef0ee` | **4.354** | 4.5 | FAIL — the reason the derived token exists |

Every declared number reproduces exactly. **But two ink sites never reach the derived token** —
see C1.

### The reclaimed ramp's smallest steps — 31 combinations, swept

`--text-2xs` is **11 px** and `--text-xs` **12 px** in Latin; `:root:lang(ar)` raises them to
12 / 13. A sweep of every leaf text node at ≤ 12.5 px across 10 routes, compositing every
`rgba` layer down to an opaque ground, found **31 distinct ink/ground/size combinations and
zero failures at rest.** The five tightest:

| Ratio | Ink | Ground | Size | Where |
|---|---|---|---|---|
| **4.538** | `#6b7280` | `#f6f8f9` | 11–12 px | meta text on a hovered row, a neutral badge, the `⌘K` hint. **0.038 of margin** |
| **4.578** | `#6b7280` | `#fff7f6` | 11 px | the refusal sentence on a resting critical row |
| **4.707** | `#626974` | `#e9edf1` | 11 px | the rail's workspace labels |
| **4.834** | `#6b7280` | `#ffffff` | 11–12 px | the ordinary meta line |
| **4.931** | `#666d7a` | `#fff7f6` | 12 px | the derived critical ink |

Everything else lands 5.3–17.4. Badge tones are comfortable: warning `#7a3e12` on `#fff4e6`
**7.656**, info `#1b51c4` on `#eaf0fe` **6.089**, critical `#b42318` on `#fef0ee` **5.921**.

### C1 — the one real contrast failure, and it is state-dependent

A rest-state sweep of 13 routes returns **zero** failures. Re-running the same sweep while each
row in turn holds focus returns exactly **two**, both the same defect:

| Route | Text | Ink | Ground | Ratio | Floor | Verdict |
|---|---|---|---|---|---|---|
| `/financials/payouts` | *"Add a bank account before paying this captain."* 11 px / 400 | `#6b7280` | `#fef0ee` | **4.354** | 4.5 | **FAIL** |
| `/operations/assurance` | *"25 Jun 09:32 · Omar Farouk"* 12 px / 400 | `#6b7280` | `#fef0ee` | **4.354** | 4.5 | **FAIL** |

At rest both sit on `#fff7f6` at **4.578** and pass. They fail the instant the operator focuses
or hovers the row — which, for a breached row, is the whole point of the row.

**Why the derived token misses them.** `DataTable.tsx:1657-1659` scopes
`text-row-critical-foreground` to `isCritical && tier === 'meta'` on the `<td>`. Both offenders
are `<span>`s *inside* a cell that hard-code `text-muted-foreground`, and the closer element
wins:

- `src/screens/queues/cells.tsx:207` — `SubjectIdentity`'s secondary line. Its cell is tier
  `primary`, so the `<td>` never carries the derived ink at all. This is the most common meta
  line in the product.
- `src/components/table/rowActions.tsx:173` — `RefusalLine`.

**The fix, computed rather than guessed.** `--ev-text-2-row-critical` `#666d7a` measures
**4.689** on `#fef0ee` and **4.931** on `#fff7f6` — both clear. The token exists; it has to
reach these two components. Do **not** reach for a lighter ground: `--ev-red-lt` `#fef0ee` *is*
the ground, and walking it lighter breaks the R19 checkbox boundary two steps later at
`#feecea` (3.015).

**Near-miss, recorded because it passed.** `/financials/cash` renders an `Escalate` badge at
11 px in `#6b7280` inside a breached row. It passes at **4.538**, not 4.354, because the badge
paints its own `#f6f8f9` fill and insulates the label from the row tint.

### C2 — the input boundary is 1.324:1

| Element | Boundary | Ground | Ratio | Floor | Verdict |
|---|---|---|---|---|---|
| `--input` (= `--ev-hairline-control`) on a card | `#dde0e4` | `#ffffff` | **1.324** | 3 | **FAIL** |
| same, on the page's second ground | `#dde0e4` | `#f6f8f9` | **1.243** | 3 | **FAIL** |
| `--ev-hairline` (structural rules) | `#f0f2f4` | `#ffffff` | **1.122** | none | n/a — decorative |

Measured live on `/admin/team`: the select trigger reports `border-color: rgb(221,224,228)`,
and the top-bar search wrapper the same. `globals.css:487` argues the exemption — *"an input has
a fill and a label, a checkbox has neither"* — but the fill is `#ffffff` on a `#ffffff` card and
the label sits outside the control. The 1 px stroke is the only thing saying where the field
begins and ends, which is what 1.4.11 covers.

**The fix, computed.** Walking the neutral hue-220 / 9 % family, the lightest value clearing 3:1
on *all five* grounds a control can occupy (`#ffffff`, `#f6f8f9`, `#f0f2f4`, `#fff7f6`,
`#fef0ee`) is **`#858b99`, min 3.042**. `--ev-hairline-strong` `#828b99` already sits one step
darker at **min 3.066** and is already in the token set. So the correct disposition is
`--input: var(--ev-hairline-strong)` — **no new token** — and it leaves the structural hairline
untouched, so the "list, not spreadsheet" ruling survives.

### C3 — the bulk bar (verified, no defect)

`bg-foreground` / `text-background` = `#ffffff` on `#171a21` = **17.411**. The refusal line at
`text-background/80` composites to `#d1d1d3` on `#171a21` = **11.418** — the code comment claims
11.6; the measured value is 11.418, still comfortably AA.

---

## Keyboard walk

Every sequence below is a real keypress in Chromium, not an inspection.

### 1. Can the task be completed?

**Open a record — yes on 12 of 12 tables, but two of them lose you afterwards.** `Tab`×41 (or
`Tab`, `Enter` on *Skip to content*, then `Tab`) reaches the grid; `↓` `↑` `Home` `End` move
between rows with `loop:false`; `Enter` or `Space` opens. Verified on Trips, Subscriptions,
People, My Work, Payouts. Six further tables (Assurance, Ledger, Cash, Tickets, Communications,
Zones) give the row a tab stop and arrow keys but no `Enter` action — correct, because none of
them paints `cursor: pointer` either. **No table in the product now has a pointer-only row
affordance**, which closes the 2.1.1 defect on forty screens.

**Act on a row — yes.** `Tab` from the row reaches the checkbox, then the identity links, then
the kebab; `Enter` opens the kebab, `↓` moves, `Enter` selects, `Escape` returns to the kebab
(verified LTR and RTL).

**Use the bulk bar — technically yes, practically no.** B1: 124 presses.

**Drive the command palette — yes for a sighted operator, no for a screen reader.** `Ctrl+K`
focuses the top-bar search field; typing renders a `[role=listbox]` with 13 options; `↓` moves
an `aria-selected` highlight (verified: *"Suspend captain"*); `Escape` closes the list and
leaves focus in the field; a second `Escape` does nothing further. See S2.

**Fill a form — yes.** `/admin/team`: focus the 2FA switch, `Space` toggles it, `aria-checked`
flips, and the save bar is **11** `Tab` presses away. Its arrival is not announced.

**Dismiss a layer — yes, and the layering is exemplary.** With the entity drawer open, opening
the Filter popover behind it and pressing `Escape` closes **only** the popover and returns focus
to the `Filter` trigger; a second `Escape` closes the drawer and returns focus to the exact
identity link that opened it. One Escape, one layer, verified two deep.

### 2. Is focus visible at every stop?

Yes. Sampled with `getComputedStyle` on real `Tab`-driven focus: every control paints
`box-shadow: … 0 0 0 2px rgb(255,255,255), 0 0 0 4px rgb(12,105,68)` — a 2 px white offset ring
inside a 2 px brand ring, **6.731:1** against both the gap and the page. The row itself takes
`outline: rgb(12,105,68) solid 2px; outline-offset: -2px` — inset, so the sticky header cannot
clip it — at **6.319:1** against the `#f6f8f9` focus fill it sits on. The top-bar search input
carries no ring itself; its wrapper does, on `focus-within`, and it is visible.

Three files contain `outline-none` with no `focus-visible` sibling — `ui/dialog.tsx:140`,
`ui/alert-dialog.tsx:87`, `ui/command.tsx:127`. All three are `tabindex="-1"` programmatic focus
containers, where suppressing the outline is correct. **No defect.** The other four grep hits
are prose in docblocks.

### 3. Is the order the reading order?

Yes, and it is DOM order throughout — the only `tabindex` values in the product are `0` and
`-1`, both from roving groups. Order: skip link → brand → rail (roving) → pinned Admin → sub-tab
column (roving) → top bar → content. The skip link works properly: `Tab`, `Enter` focuses
`<main tabindex="-1">`, and the next `Tab` lands on the first content control.

One inconsistency: the pinned **Admin** tile is a separate tab stop *below* the rail's roving
group, and arrow keys neither reach it nor leave it. `qa.keyboard.test.tsx:203` asserts this
shape deliberately, so it is a ruling — but an operator who has learned that arrows work in the
rail finds they stop working on its last tile.

### 4. Does focus go somewhere sensible on open, and return on close?

| Layer | On open | On close | Verdict |
|---|---|---|---|
| `ShellLayer` (entity / notifications / account) | `h2[data-slot=sheet-title] tabindex="-1"` | the exact opener element | **correct** |
| `TripDetailDrawer`, `SubscriptionDetailDrawer` | the ✕ close button | **`<body>`** | **B3** |
| `Dialog` / `AlertDialog` (22 + 4 files) | first field; trap correct | **`<body>`** | **B6** |
| Dropdown menu (Account, row kebab) | first item | trigger, on `Escape` and on in-place items | **correct** |
| Popover (bell, Filter, Columns, Sort) | first control | trigger | **correct** |
| Command palette | the search field | stays in the field | **correct** |
| D-11 hand-off (`My profile`, `Getting started`, `See all`) | layer heading, and it **stays** at t=1800 ms | **`<body>`** | half correct — **B4** |
| D-11 hand-off from a notification row | **the bell trigger, drawer open** | — | **B5** |
| Toast | n/a — no toast fires from a row action; the action opens a dialog | — | n/a |

**Does anything trap?** Modals do, correctly and by design (§7.3.3: the scrim owns the keyboard)
— 26 Tabs inside the push composer never left it. The scrimless shell layers deliberately do
not, and `releaseTabAtEdges` is doing its job: `Tab` from the drawer's last control leaves into
the page and the drawer stays open. Both match the written ruling.

### 5. Does Escape do the obvious thing, and only once?

Yes, verified two layers deep (above). Rows do not swallow it: with a row focused, `Ctrl+K`
opens the palette and `Escape` closes the list rather than being eaten.

### The in-row tab-stop ruling — asked for, and here is the verdict

**The ruling is wrong for an operator, and the two criteria protecting it assert a mechanism
their own docblocks do not require.**

The measurement: 125 stops inside `<tbody>` on Trips (5.00 / row), 82 on Payouts (3.28 / row),
76 on People (3.04 / row) — 67–75 % of the whole document's tab order in each case. There is
nothing after the table, so an operator who overshoots wraps the entire document. Rows offer no
escape hatch into their own cells: `ArrowRight`, `ArrowLeft`, `PageUp` and `PageDown` on a
focused row all do nothing, so `Tab` is the only path in and the only path out.

The two criteria in `src/screens/financials/keyboard.test.tsx`:

- `:173` *"a ledger's source link takes focus from the keyboard alone"* — its own docblock states
  the requirement as *"reachable by keyboard without a pointer"*. A `role="grid"` with
  `ArrowRight` / `F2` cell entry satisfies that requirement completely. The test asserts the
  *implementation* (`user.tab()` in a loop), not the requirement it quotes.
- `:212` *"both row actions are reachable and operable from the keyboard alone"* — its final
  assertion is literally *"the second action is the next tab stop"*. Same substitution.

So the ruling was correctly *not* overturned by an implementing agent — it needs an owner — but
the evidence says the owner should overturn it, and the criteria can be rewritten to their own
stated intent without weakening them. A middle path that costs nothing: keep the in-row stops on
the screens carrying fewer than two per row, and take `role="grid"` on the three carrying three
to five.

---

## Semantics

**Native elements.** Clean. Zero `<div role="button">`, `role="link"`, `role="checkbox"` or
`role="tab"` anywhere in `src`. Zero `onClick` on a `div`, `span`, `li`, `td` or `tr` without a
role. `NotificationRow` explicitly renders a `<button>` when there is somewhere to go and a plain
`<div>` when there is not, rather than a disabled-looking button.

**Accessible names — swept with Chrome's own AX tree, not a heuristic.**
`Accessibility.getFullAXTree` over 10 routes (432–2011 nodes each): **zero unnamed interactive
nodes** across `button`, `link`, `checkbox`, `switch`, `radio`, `textbox`, `combobox`,
`searchbox`, `menuitem`, `tab`, `option`. My own DOM heuristic flagged the 2FA switch on
`/admin/team`; the AX tree resolves it to *"Require a second factor"* from `relatedElement`, so
the heuristic was wrong and the control is fine. Recorded because it is the exact failure mode
`verify.md` warns about — a grep that did not mean what it looked like it meant.

**`aria-controls` — the claim holds.** 0 attributes on 5 index screens, 3 on Dispatch, and
**0 dangling** across `aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-owns` and
`aria-activedescendant` on all 6 routes swept. Dispatch's three tabs resolve to
`radix-…-content-trips` / `-pending` / `-fleet`.

**Refusals are rendered, not tooltips — the claim holds.** Only 2 files in the tree use
`<Tooltip>`. On `/financials/payouts`, 19 `aria-describedby` attributes all resolve to visible
`RefusalLine` sentences (*"Add a bank account before paying this captain."*, *"Nothing is payable
after cash debt."*). A regex sweep of the rendered text for `[a-z]+_[a-z_]+` returns **zero
machine identifiers on screen**; `perm.<key>.name` covers 21 keys against a 19-member
`PermissionKey` union and both call sites (`RouteStates.tsx:124`, `DispatchScreen.tsx:450`) go
through `permissionName()`.

**Colour is not the only carrier.** Every breached row carries a word, read out of the rendered
row text: Assurance *"overdue 12h 14m"*, Payouts *"Returned by the bank"*, Zones *"Recruit now"*
against plain rows' *"Healthy"* / *"Watch"*, Cash *"Never reported"*. `RowCriticalMarker` is a
3.5 px `--ev-red` bar at `#b42318` (**6.574:1** on white, floor 3) and correctly `aria-hidden` —
it decorates a state the text already states.

**The four states — this is where the semantics fail.**

| Defect | Evidence |
|---|---|
| **S1. The live region does not exist until the first announcement, so the first announcement is lost.** `announcer.ts:36` creates `#ev-live-region` lazily inside `getLiveRegion()`. A region injected into the DOM at the moment of its own mutation is not reliably announced — AT must already be subscribed to it. | On a freshly loaded `/operations/trips`, `document.getElementById('ev-live-region')` is **null**. It appears only after the first `announce()` — verified by sorting a column, after which it reads *"Sorted by Captain, ascending"*. Mount it once at app start. |
| **S2. The command palette is invisible to a screen reader.** The trigger is a plain `<input type="search" aria-label="Search">` with **no `role="combobox"`, no `aria-expanded`, no `aria-controls`, no `aria-activedescendant`, no `aria-haspopup`.** A `[role=listbox]` with 13 options appears beside it and `↓` moves an `aria-selected` highlight that nothing points at. | Measured on `/operations/trips` after `Ctrl+K` and typing `cap`: listbox `radix-_r_0_`, 13 options, `aria-selected="true"` on *"Suspend captain"*, and `document.activeElement.getAttribute('aria-activedescendant') === null`. The whole-tree sweep confirms **0 `aria-activedescendant` attributes anywhere in the product.** WCAG 4.1.2. |
| **S3. The empty state is silent.** | `/operations/trips`, type `zzzzzzz`: rows 25 → 0, *"No trip matches this search."* renders, and there is **no `role="status"`, no `role="alert"` and no `aria-live` anywhere on the page** at that moment. |
| **S4. The skeleton is a silent screen.** `LoadingSkeleton` sets `aria-busy="true"` and `aria-label={label}` — but **neither call site passes a `label`**, so it is an unnamed busy region and announces nothing. Its own JSDoc says *"Announced once, by the caller's own live-region call"*, and no caller makes that call. | `routes.tsx:261` and `DataTable.tsx:1401` both render `<LoadingSkeleton pattern={…} />`. Measured during a route change: `[aria-busy="true"]` count 1, `aria-label` **null**, live region absent. |
| **S5. Nothing announces route changes or in-page navigations.** | `/operations/trips` → `/operations/people` leaves the live region absent and `document.title` unchanged (B7). `Enter` on a Payouts row rewrites the page to `?captain=DRV-0101`, changes the heading to *"Captain earnings payable · Ahmed Salem"*, drops focus to `<body>` and announces nothing. `/operations/my-work` does the same across a full route change. |
| **S6. Selection is silent.** | Checking a row renders the bulk bar with no announcement (B1). |

**The error state does announce, and the error boundary holds.** Verified by aborting the
`src/screens/financials/**` chunk mid-navigation: `role="alert"` renders *"Couldn't display
Overview — The rest of the console is still working. Try again, or pick another sub-tab from the
list."*, `Try again` / `Go to overview` / `Error detail` are all present, the shell keeps its 13
rail links, and Tab order is intact. `ErrorState` carries `role="alert"` at three scopes.

**Landmarks and structure.** Every route: exactly 1 `<main>`, 2 `<nav>`, 1 banner, 1 `<h1>`.
`th` `scope` is present on 8 of 9 (Trips), 7 of 8 (Payouts, Tickets) and 35 of 35 (Team) — the
one omission each time is the empty select-column header. Low. The 404 route renders **no
`<h1>`**.

**Modal isolation — checked, and it passes.** `aria-modal` is absent and `#root` carries no
`aria-hidden`, which looks like a defect. It is not: opening the push composer collapses the
non-ignored AX tree from **1464 nodes to 56**, with zero background links exposed. I nearly filed
this and the measurement disproved it.

---

## Reduced motion and RTL

### Reduced motion

`globals.css:1985` collapses `animation-duration`, `transition-duration` and
`animation-iteration-count` on `*`, `*::before`, `*::after`. Loaded routes under
`reducedMotion: 'reduce'` and compared against the default.

**No ambient loops exist to ban.** `document.getAnimations()` returns `[]` at rest in **both**
modes on `/operations/trips`. The one sanctioned loop, `@keyframes live-pulse` at
`globals.css:1884` with its 0.4 opacity floor, has **zero consumers in `src/**/*.tsx`** —
`--animate-live-pulse` is declared and unused. R18 is satisfied, if vacuously.

**Meaning that only motion carries — hunted, and nothing blocking found.**

- Both `animate-spin` sites (`ExportCard.tsx:233`, `IntegrityPane.tsx:229`) are `aria-hidden`
  and sit **inside a button whose label already reads *"Running…"* / *"Exporting…"***. Under the
  preference the icon freezes and the sentence carries the state. Correct.
- `Spinner` refuses to name itself unless a caller passes a translated `aria-label`, and
  documents why — an unnamed spinner is furniture, a named one is a `role="status"`.
- The drawer arrives at the same place with the same opacity in both modes (x=800, w=480,
  opacity 1, transform none) — nothing is mid-flight when the animation is killed.
- **One low finding:** `ModuleRail.tsx:292` and `PageNav.tsx:256` render the nav count chip's
  loading placeholder as a bare `animate-pulse` grey pill. Under reduced motion it is a
  motionless grey pill sitting exactly where a real count chip sits, and the only thing that ever
  said "loading, not a value" was the pulse. It is `aria-hidden`, so it is silent either way.
  Give it a `—` or a distinct treatment.
- Skeletons become static grey blocks, which is fine — the *shape* carries the meaning, not the
  shimmer. Their silence to AT is S4, a different problem.

### Arabic — the five questions re-run under `dir="rtl"` `lang="ar"`

Switched by keyboard through the account menu's language radio group. `documentElement.dir`
`rtl`, `lang` `ar`, `body` direction `rtl`, and the Arabic type floors take effect —
`--text-2xs` 11 → **12 px**, `--text-xs` 12 → **13 px**, `--text-sm` **14 px**.

- **Focus order follows visual reading order.** x-coordinates down the first 12 stops:
  1221 → 1197 → 1197 → 945 → 411 → 243 → 201 → 159. Right to left, top bar included. Correct.
- **Vertical arrows are unchanged**, as the hook's comment says they should be: `↓` `↑` `Home`
  `End` move rows identically.
- **Horizontal arrows flip, correctly.** On the column-header roving group, `ArrowLeft` moves
  x 696 → 583 → 431 — visually left, which is toward the list's *end* in Arabic — and
  `ArrowRight` walks back. This matches `useRovingFocus`'s `forwardKey = ArrowLeft` under `rtl`
  and confirms the F-15 comment correction.
- **Escape is unchanged.** Row kebab → `Escape` → back on the kebab.
- **The drawer flips side correctly**: anchored at x=0, w=480 under RTL (inline-end = physical
  left), against x=800 under LTR.
- **B3 reproduces under RTL** — the trip drawer still closes onto `<body>`.

**Arabic timestamps are not reversed — confirmed, and the earlier audit was misreading.** Read
out of the live RTL DOM: `25 يونيو 09:39`, `25 يونيو 09:14`, `25 يونيو 09:11`. 150 `<bdi>`
elements in `<tbody>`. The string is correct and always was.

**One consequence of `AR = {}` worth stating plainly:** under `lang="ar"` every heading and label
is still English (`<h1>Trips</h1>`), so a screen reader announces English text with an Arabic
voice and Arabic pronunciation rules. That is a content decision, not a bug, but it is an
accessibility consequence of shipping the locale switch ahead of the strings.

---

## Unrun

| Check | Why |
|---|---|
| **Real screen readers (NVDA, JAWS, VoiceOver).** | Not available in this environment. Every semantics finding above is computed from Chrome's `Accessibility.getFullAXTree` and from the DOM, which is authoritative for *name, role, value* but **not** for announcement behaviour. S1, S3, S4 and S5 are strongly implied by the markup and would each take ten minutes to confirm with NVDA. |
| **The `route-forbidden` state.** | `RouteGuard`'s `forbiddenReason` returns `null` for all 34 rows (Q4 unanswered), so the state cannot be reached in a browser. Verified by source only: 21 `perm.*.name` keys against a 19-member union, both call sites routed through `permissionName()`. Not claimed as browser-verified. |
| **Peek (`14` G8).** | The execution log marks it *in flight*. I found no shipped peek surface to audit and did not look into unfinished code. |
| **Forced-colors / Windows High Contrast.** | Not exercised. Given C2, forced-colors is where this product would look *better*, not worse — but that is a prediction, not a measurement. |
| **200 % zoom and 320 px reflow (1.4.10).** | Out of scope for this pass; the shell is a fixed three-column desktop layout with a stated 1280 floor and would need a ruling before it could be judged. |
| **The full 3075-test suite.** | Ran the 5 accessibility-relevant suites (85/85 green) rather than the whole thing; the brief states the tree is settled and green and I did not re-derive that. |
| **Every one of 34 routes.** | Swept 13 routes for contrast, 10 for accessible names, 12 for row-keyboard behaviour, 6 for ARIA reference integrity. The remaining routes are not claimed as passing. |

**Also noted, not audited further:** column resize is drag-only. `<div role="separator"
title="Drag to resize, double-click to reset">` carries **no `tabindex`** and there is no keyboard
path to it — a 2.1.1 and 2.5.7 gap. Not blocking: column *visibility* and *pinning* are fully
keyboard-operable through the Columns popover (verified — a checkbox and a `Pin <column>` toggle
for every column, `Escape` returns to the trigger), and width is not load-bearing for any task.

---

## Verdict

**The remediation is real and most of it holds under measurement.** Row roving focus works
exactly as documented, including `Home` / `End`, `loop:false`, the inset ring and Escape
passthrough. The critical-row derivation reproduces to three decimals on live pixels. The
brand-green ramp is AA everywhere it lands, including the focus ring against its own offset gap.
`aria-controls` has zero dangling references. Chrome's own accessibility tree finds **zero unnamed
interactive controls across ten routes** — a result most production apps do not reach. Escape
layering is correct two layers deep. RTL flips arrow direction, drawer side and focus order
correctly, and the Arabic timestamps were never broken. The error boundary leaves the shell
navigable and announces through `role="alert"`. D-11's ruling was implemented conditionally, not
as a blanket suppression, and I confirmed in a browser that it did **not** break Escape or any
in-place menu item — the specific failure mode the brief asked about.

**Two things stop an operator, and they are both about where focus goes next.**

The first is volume: 125 tab stops to cross a table and 124 to reach the bulk bar after making a
selection. The roving fix removed 24 stops from a 149-stop problem; the remaining 125 are the
ones that were always the complaint. This is an owner's ruling and the evidence now exists to
make it.

The second is that **closing a layer drops focus on `<body>` on five separate paths** — the two
bespoke drawers, every triggerless modal, both D-11 hand-offs, and every in-page navigation from
a row. `ShellLayer` + `useFocusEntry` already solve this correctly and provably; the defect is
everything that does not go through them. That is one fallback in `useFocusEntry` and two
components adopting the hook, not a redesign.

**One contrast failure survives, and it survives because it is state-dependent.** A rest-state
sweep of 13 routes is clean. The same sweep with a row focused finds `#6b7280` on `#fef0ee` at
**4.354** in two places. The derived token that fixes it — `#666d7a`, **4.689** on the same
ground — already exists and simply does not reach a `<span>` two levels inside the cell. The
methodological lesson is the one worth keeping: **a contrast audit that only measures resting
pixels will report this product as clean, and it is not.**

**And one deliberate exemption I do not think survives its own reasoning.** `--input` at
`#dde0e4` is **1.324:1** against the white card it sits on, against a 3:1 floor, and the argument
that "an input has a fill and a label" does not hold when the fill is the same white as the page
and the label is outside the box. `--ev-hairline-strong` `#828b99` clears 3:1 on all five grounds
a control can occupy (min **3.066**) and is already in the token set.
