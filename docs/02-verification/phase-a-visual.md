# Visual QA — Contact Centre plan Phase A (the systemic fixes)

**Verifies:** `05-restructure/CONTACT-CENTRE-REDESIGN-PLAN.md` §3 items 1–5, AC-CC-01..03 ·
`docs/RULINGS.md` (R3, R4, R7, R15, D8/D8-b, D12) · plan §8 probe table where it applies
**Branch:** `visual/phase-a`, HEAD `5761599` (six commits over `main`), worktree
`.claude/worktrees/inbox-a`. Nothing under `src/` touched; `scripts/harness/dark-contrast.mjs`
gained the seven missing routes (the brief asked for it).
**Role:** visual-qa-engineer.

---

## 0. What was actually run

| | |
|---|---|
| Routes | the ten in the brief: `CNV-102`, `INC-013`, `pricing?view=rate-card`, `DSP-101`, `FC-0001`, `TKT-502`, and the four lists |
| Matrix | 10 routes × {en, ar} × {light, dark via `colorScheme`} at 1280×800 = **40 page states**, each captured and probed; plus the header `⋯` opened on the two routes that have one, and two close-ups (the rate card's `Approve`, the incident's checkbox strip) |
| Errors | page and console errors **0** in all 40 (see the server note); `overflowX` **0** in all 40 |
| Probe | `.pw-tmp/vqa-phase-a.mjs` (gitignored); output `phase-a/vqa-phase-a.json` |
| `dark-contrast.mjs` | run with the ten routes against the engineer's server: **10/10 ok, 0 contrast failures**, minimum ratio 5.41 on every route; `under12px` on every route is the module rail's five words and its count numerals |
| Captures | `docs/02-verification/phase-a/*.png`, 32 kept and cited below |

**Server note.** The engineer's server on 4361 (PID 34544, private `cacheDir`) **403s both
webfonts** — `/@fs/C:/Users/…/Eyvar Admin/node_modules/@fontsource-variable/{inter,noto-naskh-arabic}/…` —
because the worktree's `node_modules` is a junction and the real path lies outside Vite's
`fs.allow`. A plain `npx vite` from the worktree does the same. Every capture from that server
renders in a fallback face, which is why the first pass showed two console errors per route.
The numbers and captures in this report come from a second full run on a programmatic server
(port 4363, `server.fs.allow` widened to the main tree; `.pw-tmp/serve.mjs`) on which
`document.fonts` reports `Inter Variable 100 900` loaded and the error count is 0. Colours and
ratios were identical between the two runs; widths (and the one wrapped value in §2.4) are from
the Inter run. Both servers are stopped.

Not run: keyboard and screen-reader semantics (accessibility-auditor); routes outside the ten.

---

## 1. Findings

Severity: **blocking** = may not merge · **should fix** = before the route flips / next PR ·
**note** = suggestion or out of scope, not a rule violation.

| # | Severity | Rule | What was observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| A-1 | should fix | **AC-CC-03**, plan §3 item 3 (*nothing operator-reading under 12px; `text-2xs` only for the delivery word and table meta*) | **The module rail's five words are 11px** in English on every route: `Exec`, `Ops`, `Finance`, `Support`, `Admin` (`ModuleRail.tsx:282`, `text-2xs leading-3`). The brief allows the rail's numerals; the words are not numerals. In Arabic they are 12px (`--text-2xs` is 12 there). Nothing else on any route is under 12px except badge labels, which are now 12px (`badge.tsx` `text-xs`) | probe `smallSummary` on all 20 en states; `dark-contrast.mjs` `under 12px:` line on all 10 | Shell owner: `text-xs leading-3` on the rail label (the tile stays 44 on the grid with `leading-3`), or an explicit AC-CC-03 allowance for the rail written into the plan |
| A-2 | should fix | **D8-b** (*a `⋯` exists only at three or more; one or two render labelled*) | `PageHeader`'s `More actions ▾` opens on **one** item (`Close conversation`) on `/support/contact-centre/CNV-102` (the pre-inbox conversation screen still mounted on this branch). `TKT-502`'s holds four, correct. The cap-and-spill in `PageHeader.tsx:160–164` never checks the count | `phase-a/cc-detail-en-dark-menu.png`; probe `menuItems` = 1 on `cc-detail-*` | `PageHeader`: when `overflow.length < 3` render the items as labelled secondaries (or, past `SECONDARY_CAP`, fold *into* a `⋯` of three or more); the screen is retired in Phase D but the component is shared |
| A-3 | should fix (decision) | plan §3 item 5 (*disabled secondaries render ghost, no border, so the primary is the only full-weight button*), §4.6 (*disabled says "this will become available"*) | **The rate card's `Approve` no longer reads as a control.** It is a 12px/500 `--ev-text-2` word with no fill, border or shadow, 24px tall, alone at the card's foot with the refusal sentence 4px beneath it — the same weight and colour as the `Floors:` caption two lines above. §3 item 5's reasoning (*the primary is the only full-weight button*) assumes a primary beside it; here there is none, so the rule takes away the only silhouette in the group. The header cases (`Close` beside `Claim` on `INC-013`, `Send reply` in the ticket card) read fine because a live control sits next to them | `phase-a/rate-card-approve-en-light.png`, `rate-card-approve-en-dark.png`; extras probe: `bg rgba(0,0,0,0)`, `border 1px rgba(0,0,0,0)`, `color #6b7280` (4.83:1) / `#a9aeb4` (6.48:1) | product-designer: a disabled control that is the **only** control in its group keeps a hairline silhouette (`border-border` at the disabled tone), or the refusal line becomes the affordance (`Approve — You proposed this card…` as one sentence). Not the engineer's to guess |
| A-4 | note | §5.7 copy; plan §3 item 4 | The incident Promises card's acknowledged value wraps to two lines in the 300px rail in English (`Acknowledged 24 Jun 18:52` under the label `Acknowledgement deadline`, 2 lines in Inter). It stays end-aligned and readable; Arabic is one line. The word `Acknowledged` repeats the label | `phase-a/safety-detail-en-light.png`; probe `valueLines` `lines 2` | Copy: when met, label `Acknowledged`, value the time; or `Met · 24 Jun 18:52`. Designer's call |
| A-5 | note (out of scope, present) | §4.6; the engineer's own flag | A **disabled checkbox at `opacity-50` is on one of the ten routes**: `INC-013`'s `Document` step (`checkbox.tsx:65`). Its box border composites to **1.73:1** on the card in light and **1.93:1** in dark (`#4d5661` on `#232a33`), under the 3:1 non-text floor; the enabled unchecked `Act` beside it is 3.44 / 3.66. The engineer's note that none of the opacity-50 primitives appears on these routes is wrong for this one | `phase-a/safety-checkboxes-en-dark.png`, `safety-checkboxes-en-light.png`; extras probe `checkboxes` | Follow-up on the primitive, same treatment as `button.tsx`: no opacity, `--ev-hairline-strong` at the disabled tone. Not a Phase A finding |
| A-6 | note | plan §3 item 1 | Dark popover over a card: `--ev-surface-2` `#2e3641` is **1.19:1** over a card (`#232a33`) and 1.46:1 over the ground; its 1px border `#313944` is 1.05:1 against itself. The tier reads by `--ev-shadow-2` (present) and by the ground under it, not by the edge. Fine in the captures; recorded so nobody re-measures | `phase-a/ticket-detail-en-dark-menu.png`; probe `popover` | none |
| A-7 | note | pre-existing, not this branch | `dropdown-menu.tsx` items carry `outline-hidden` with `focus:bg-accent` as the focus carrier (the shadcn idiom), no `focus-visible:ring`. The lines appear in this branch's diff only because `data-disabled:opacity-50` became `data-disabled:text-muted-foreground` on them | `git diff main...HEAD -- src/components/ui/dropdown-menu.tsx` | none here |

Nothing blocking.

---

## 2. The seven checks

### 2.1 Dark elevation, hairlines, disabled controls — **pass** (A-5, A-6 noted)

Tokens on the document, dark: `--ev-bg` `#14181e`, `--ev-bg2` `#101319`, `--ev-surface`
`#232a33` (was `#1a1f26`), `--ev-surface-2` `#2e3641` (new), `--ev-surface-edge` transparent,
`--ev-hairline` `#313944`, `--ev-hairline-control` `#3c4451`, `--ev-text-2` `#a9aeb4` (was
`#9ba5b4`).

| Pair | Ratio | Plan / floor |
|---|---|---|
| card `#232a33` over `--ev-bg2` | **1.284** | ≥ 1.25 (plan §3 item 1) ✓ |
| card over `--ev-bg` (what the probe sees under every card on these routes) | 1.230 | — |
| popover `#2e3641` over card / over bg | 1.19 / 1.46 | one step further ✓ (A-6) |
| `--ev-hairline` on card | 1.24 | visible: table and key-value rules read in `disputes-en-dark.png`, `safety-detail-en-dark.png` |
| `--ev-hairline-control` on card | 1.47 | ✓ |
| `--ev-text-2` on card / on bg | 6.48 / 7.97 | ≥ 4.5 ✓ |
| old `--ev-surface` `#1a1f26` over bg, for the record | 1.075 | the value the plan set out to fix |

Every `[data-slot=card]` on the 20 dark states: `#232a33` on `#14181e`, border alpha 0 (the card
drops its hairline in dark), `box-shadow` present. Light: `#ffffff` on `#ffffff` with the 1px
`#e3e7ea` hairline (1.24:1), as before.

Disabled controls in headers and composers (label on its ground): `Close` on `INC-013`
**4.83** light / **7.97** dark; `Send` in `CNV-102`'s composer 4.83 / 7.97; `Send reply` in
`TKT-502`'s card 4.83 / 6.48; `Approve` ×3 on the rate card 4.83 / 6.48. All ≥ 4.5, all at
`opacity 1`, none with fill or border. No near-invisible control in any header or composer;
the one `opacity-50` control on the ten routes is the checkbox in A-5.

### 2.2 A chip is never a control — **pass**

- `[data-slot=badge]` silhouettes on every state: **20px, radius 4px, no border** (status) and
  **16px, radius 4px** (nav counts). Buttons: **24px or 32px, radius 8px** (plus the D12 stadium
  view switcher at 26px, sanctioned, and the 36px sort heads). The two families do not share a
  height-and-radius pair anywhere.
- No badge is a control: the probe found no `[data-slot=badge]` that is a `button`/`a`/`[role=button]`.
  Every badge inside a control is a count *inside* a nav link or the bell button (`8 in A`,
  `7 in BUTTON`), which is a decoration of the control, not the control.
- The top bar's `Mine 2`, `Online`, `On call: …` are ghost text buttons with a leading icon
  (`TopBar.tsx`, `AvailabilityControl.tsx` diffs; `phase-a/cc-detail-en-light.png`), no longer
  pills. The old conversation screen's `Reply` / `Internal note` register chips are 24px, radius
  8 secondaries — buttons, not badges.

### 2.3 Type floor — A-1

Under 12px, all 40 states: the module rail only. Badge labels are 12px now (`text-xs`); the
`Button xs` label is 12px; ticket refusal spans moved from `text-2xs` to `text-xs`. Pane B of
the old conversation screen: 0 nodes under 12px. Rail numerals are allowed by the brief; the
five rail **words** at 11px are A-1.

### 2.4 KeyValueGrid — **pass** (A-4 noted)

| Card | Rows | Label column | Label / value colour | Rules | Value alignment |
|---|---|---|---|---|---|
| `INC-013` Promises (300px rail) | 3 | one start at 13px from the card edge | `#6b7280` / `#171a21` (dark `#a9aeb4` / `#e8ecf1`) | `--ev-hairline-soft` (ink 8% → `#eceded`, 1.17:1) spanning **298 of 300px** (edge to edge inside the 1px border) | `end`; acknowledged value 2 lines (A-4) |
| `DSP-101` claim card (596px) | 4 | one start, 13px | same | 594 / 596px | `end` |
| `FC-0001` claim card (596px) | 2 | one start, 13px | same | 594 / 596px | `end` |
| Rate card `KeyValueTable` ×4 (912px) | 2 each | class name in ink as the row head | heads `#6b7280` 12px/500 | 910 / 912px | numbers end-aligned with tabular figures by `MoneyCell` (R4) — the probe's `text-align: start` on the `<td>` is the cell, not the figure; the capture shows the column right-aligned |

Identical in Arabic with the label column at inline-start (right) and values at inline-end
(left): `phase-a/safety-detail-ar-dark.png`, `dispute-detail-ar-dark.png`, `fairness-detail-ar-dark.png`,
`rate-card-ar-dark.png`. Hover ground `--ev-row-hover` is declared on every row (`KEY_VALUE_ROW`).

### 2.5 Header action weight — **pass** (A-2, A-3 noted)

| Route | Header | Enabled filled | Disabled (label ratio light/dark) | Refusal lines | `⋯` |
|---|---|---|---|---|---|
| `CNV-102` (old screen) | Transfer · Snooze until… · More actions ▾ · **Create ticket** | 1 | — | 0 | **1 item** (A-2) |
| `INC-013` | Close (disabled) · **Claim** | 1 | Close 4.83 / 7.97 | 1: `2 protocol steps are still outstanding.` at 12px, id `…-r0`, `aria-describedby` from `Close` | — |
| rate card | none in the page header; `Approve` disabled in each card | 0 | Approve 4.83 / 6.48 | 1 per card, distinct | — |
| `DSP-101` | Resolve claim · **Take claim** | 1 | — | 0 | — |
| `FC-0001` | Uphold · Overturn · **Claim** | 1 | — | 0 | — |
| `TKT-502` | Resolve · Wait on customer · More actions ▾ · **Take over** | 1 | Send reply (card) 4.83 / 6.48 | 0 | 4 items ✓ |
| lists | `New ticket` / `New claim` filled; contact centre and safety none | 1 / 1 / 0 / 0 | — | 0 | — |

Exactly one enabled filled primary wherever the screen is actionable, zero where it is not;
every disabled control legible; one line per distinct reason. Filled = `--primary`
(`--ev-brand`, `globals.css`), the product-wide mapping.

### 2.6 Tokens — **pass** (A-7 noted)

Over the branch's 530 added lines under `src/`: Tailwind palette classes **0**; arbitrary
values **0**; raw hex outside `globals.css` **0**; physical utilities **0**; `outline-none`
without a `focus-visible:ring` **0** new (the three `outline-hidden` hits are pre-existing
menu-item lines re-emitted by an unrelated edit, A-7). New tokens are declared in both themes
and mapped once: `--ev-surface-2` → `--popover`, `--ev-surface-edge` → `--card-border` →
`border-card-border`, `--ev-hairline-soft` → `divide-border-soft`, `--ev-row-hover` →
`bg-row-hover`, `--ev-neutral-lt`.

### 2.7 Arabic — **pass**

All ten routes mirror: rail on the right, sub-nav on the right, page header back arrow at
inline-start, action group at inline-end with the filled primary last, key-value labels at
inline-start and values at inline-end, table numerals end-aligned and not flipped (R4), SLA
pills and dates in `<bdi>`. `overflowX` 0 on all 20 Arabic states; no text under 12px (the rail
is 12px there). Captures: `phase-a/*-ar-dark.png` for the six details, `*-ar-light.png` for the
four lists.

### The three things the engineer flagged

1. **Acknowledged value wrapping in the 300px rail** — confirmed in Inter (2 lines, en only).
   Readable, end-aligned, A-4: a copy fix, not a grid fix.
2. **`opacity-50` disabled primitives elsewhere** — one *does* appear on these routes: the
   `Document` checkbox on `INC-013` (A-5). Calendar, command and accordion do not.
3. **Disabled-primary-no-longer-filled on the rate card's `Approve`** — does **not** read right
   there (A-3): with no live control beside it the word loses its silhouette entirely. The same
   rule reads right on `INC-013`'s `Close` and `TKT-502`'s `Send reply`, where a live control
   anchors the group.

---

## 3. Verdict

**Merge-ready.** AC-CC-01: 0 contrast failures on every text node of all ten routes in dark,
minimum 5.41:1; card elevation 1.28:1 over `--ev-bg2`; hairlines visible; no near-invisible
control in a header or composer. AC-CC-02: no badge is a control and no button wears a badge's
silhouette. AC-CC-03: nothing under 12px outside the rail. Items 4 and 5 measured on all four
grids and all six headers, both directions, both themes.

Before Phase D, in order: A-1 (rail words, shell owner), A-2 (`PageHeader` `⋯` of one, shared
component), A-3 (product-designer decision on a lone disabled control). A-4 and A-5 are
follow-ups; A-6 and A-7 are records.
