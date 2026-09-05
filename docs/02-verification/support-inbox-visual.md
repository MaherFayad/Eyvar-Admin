# Visual QA — Support › Contact Centre inbox (design 12, plan Phase B)

**Verifies:** `05-restructure/design/12-inbox.md` §2–§9, `CONTACT-CENTRE-REDESIGN-PLAN.md` §2, §3,
§4 AC-CC-04..11, §8 probe table · `docs/RULINGS.md` (D7, D8/D8-b, R3, R5a, R7, R10, R15)
**Screens:** `/support/contact-centre`, `/support/contact-centre/:id`
**Tree:** worktree `.claude/worktrees/inbox`, branch `support/inbox`, HEAD `2e9a192`. A qa-engineer
was editing `inbox.test.tsx` in the same tree; nothing under `src/` was touched by this pass.
**Role:** visual-qa-engineer. Report and captures only.

---

## 0. What was actually run

| | |
|---|---|
| Server | `npx vite --port 4347` from the worktree. **Port 4337 was already held** by a vite started from the main checkout (PID 13256, not mine; it 404-falls-back on `/src/screens/support/inbox/InboxScreen.tsx`), so the brief's port could not be used without killing a process I did not start |
| Matrix | {en, ar} × {light, dark via `colorScheme` on the context; the theme follows the system} × {1280×800, 390×844} × {list, thread `CNV-102`, note register on `CNV-102`} = **24 captures with probes**, plus 6 header-state routes, 4 focus-ring runs, 4 seam pixel-columns, 4 selected-row pixel-rows, 4 compact header runs |
| Page / console errors | **0** across every run |
| Probe scripts | `.pw-tmp/vqa-inbox{,-2,-3}.mjs` (gitignored); every number below is from their output, saved as `inbox/vqa-report.json` for the matrix run |
| Engineer's harness | `scripts/harness/support-inbox.mjs` run against the same server: **22/22 ok**. It has no probe for either blocking finding below (no header-collision probe; it captures `CNV-102` only, whose name is short) |
| Captures | `docs/02-verification/inbox/*.png` (38 files, cited by name below). Arabic captures were retaken after the language-switch toast cleared; the first set carried it over the composer |
| Main-tree side effect | The worktree server re-optimised deps through the `node_modules` junction. After every run, `curl` to the main tree's `:4327` and `:4337` answered `200` on both `/support/contact-centre` and `/src/main.tsx`; I did not observe the 504 the brief warned about |

Not run: keyboard reachability and screen-reader semantics (accessibility-auditor's verdict);
the empty-thread `CNV-107`, loading and error states of the three panes (qa-engineer's, and
the harness covers `CNV-107`); a full-page snapshot diff (no baseline exists yet).

---

## 1. Findings

Severity: **blocking** = may not merge · **should fix** = fix before the route flips (Phase D) ·
**note** = suggestion or spec gap, not a rule violation.

| # | Severity | Rule | What was observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| V-1 | **blocking** | design 12 §4.1 header anatomy (line 2 carries channel · status · the one running clock; actions inline-end); §7.1 legibility | **The header's SLA pill is painted over by the first action button.** On `CNV-102` at 1280 the identity column is 119px wide, line 2 needs 188px (`line2ScrollW 188 / clientW 119`), and the `overdue 2m` pill overlaps `Create ticket` by **58×20px** (en) / `إنشاء تذكرة` by **56×20px** (ar), both themes. At 390 it overlaps `⋯` by 34×26 (en) / 48×26 (ar); on `CNV-101` at 390 the `Waiting` badge and the `overdue 47m` pill both sit under the filled `Claim` (16×20 and 35×26) and `⋯` (44×26). Both the running clock and the visible action are unreadable | `inbox/header-wide-en-light.png`, `inbox/header-wide-ar-light.png`, `inbox/header-compact-en-light.png`, `inbox/header-compact-ar-light.png`, `inbox/thread-compact-en-light.png`; probe `vqa-inbox-2.mjs` → `overlap`, `vqa-inbox-3.mjs` | `ThreadHeader.tsx:94` line 2 is `flex min-w-0` but its children never shrink and it has no `overflow-hidden`/`truncate`, so it overflows the `flex-1` column into the sibling action group. Give line 2 `min-w-0 overflow-hidden` with the channel word truncating first, or let the action group wrap under the identity when the identity is under ~200px, or move `Create ticket` into `⋯` when a pill is present. Add a harness probe: no header button rect intersects a line-2 child rect |
| V-2 | **blocking** | AC-CC-11 carrier 1 (*wide segmented pair with icon and **full label***); design 12 §5.x; §9.1 Arabic names in an English UI | **The register tabs clip on a long customer name.** `CNV-101` (`الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي`): tab 1 is 356px + tab 2 130px in a 398px list; both are pushed **44px outside** the list on each side (`whitespace-nowrap` from the primitive, `justify-center` on the list) and the surface's `overflow-hidden` cuts them: en reads `eply to …` and `Internal`, ar reads `على الجوهرة …` (the verb `الرد` gone) and `ملاحظ`. At 390 the overrun is 65px (en) / 55px (ar). The composer's placeholder and the consequence line wrap correctly; only the tabs fail | `inbox/state-CNV-101-en-light.png`, `inbox/state-CNV-101-ar-light.png`, `inbox/state-CNV-101-compact-en-light.png`; probe `vqa-inbox-2.mjs` → `tabs.outsideList` | In `Composer.tsx` `tabClass`: `min-w-0` on the trigger, `truncate` on the label span, keep the icon `shrink-0`; `Internal note` never truncates (give it `shrink-0`), so the name is what shortens. The full name stays in `aria-label`. Add `CNV-101` to the harness routes |
| V-3 | should fix | plan §3.3 / AC-CC-03 type floor; design 12 §3.1 states the premise *"`text-2xs` (12px)"* | **`Insert template` renders at 11px** in the composer toolbar (en, every viewport and theme). It is `Button size="xs"` → `text-2xs`, and `--text-2xs` is **11px in English** (`globals.css:3073`), 12px only in Arabic (`:1971`). Every other text node under 12px in pane B is a badge label (`Active`, `overdue 2m`, `Internal note`), which the brief allows | `inbox/thread-wide-en-light.png`; `vqa-report.json` → `small` on every `thread-*-en-*` entry: `{"text":"Insert template","px":11,"badge":false}` | The spec asked for `ghost xs` on a wrong premise. Either the spec moves the trigger to `size="sm"` (32px, `text-xs`), or the token steward decides `Button xs` may carry 11px prose. Spec row §3.1 needs its "(12px)" corrected either way |
| V-4 | should fix | **D8-b** (*the kebab begins at three; two → both labelled*), against design 12 §4.1's own table, which cites "D8: three or more" and then overflows one or two | **`⋯` holds two items or one.** Held-by-you on a resolution breach (`CNV-102`, `CNV-108`): visible `Create ticket · Transfer`, menu `Snooze until… · Close conversation` (**2**). Closed (`CNV-106`): menu `Create ticket` (**1**). Snoozed (`CNV-111`): menu `Create ticket` (**1**). Unheld / held-by-another: menu of 4, correct | `inbox/state-CNV-108-en-light-menu.png`, `inbox/state-CNV-106-en-light-menu.png`, `inbox/state-CNV-111-en-light.png`; probe → `menu` | The build follows the spec table exactly, so this is the **spec's** finding: product-designer to either surface the one/two as labelled ghosts (four ghosts do not fit 432px beside a pill — see V-1) or record a header-specific deviation from D8-b in §10. Not the engineer's to guess |
| V-5 | should fix | design 12 §5 *Refusal line … once*; §8.6.8 reason renders once; §10 row 9 avoids "a second reason line" | **Two refusal sentences under one refused composer.** `CNV-103` (held by another) renders `No email address on file for this rider.` **and** `Lina Al-Otaibi is handling this conversation.`; `CNV-111` likewise pairs the email refusal with `Grab this conversation before replying.` The email-toggle refusal is meaningful only when the composer is live | `inbox/state-CNV-103-en-light.png`, `inbox/state-CNV-111-en-light.png`; probe → `lines` | `Composer.tsx:330`: render `emailSwitch.refusal` only when `refusal === null && !quietlyDisabled` |
| V-6 | note | §7.2 visible focus | The tab's own `focus-visible` ring (4px box-shadow) is clipped on the surface's outer edges by `overflow-hidden` on `[data-inbox-composer-surface]`; the pixel column above the focused tab shows the **surface's** `focus-within` ring at y 606–607, the surface border intact at 610 and no tab ring between. Focus is still visible (surface ring plus the tab ring's inner edges), so this is not a failure, but the indicator is on the card, not the tab | `inbox/focus-tab-en-light-wide.png`, `inbox/focus-tab-ar-dark-wide.png`; probe → `aboveCol` | Optional: `ring-inset` on the trigger's focus ring, or drop `overflow-hidden` and clip only the note bar |
| V-7 | note | plan §3.1 (Phase A, AC-CC-01), Q-CC1 | Dark elevation is at the **pre-Phase-A** value: `--ev-surface` #1a1f26 over `--ev-bg` #14181e = **1.08:1** (plan target ≥1.25:1 over `--ev-bg2`; measured 1.12:1). The composer, the rail cards and the pane seams read by their borders (`--ev-hairline-control` 1.48:1 on the card, `--ev-hairline` 1.28:1 on the ground), which are visible but faint. Phase A is its own PR (plan §3) and is token-steward work; not a finding against the inbox | `inbox/thread-wide-en-dark.png`, `inbox/list-wide-en-dark.png`; contrast arithmetic in §2.6 | None here. Phase A to land before the route flips |
| V-8 | note | `docs/ref/a11y.md` "Disabled controls: none" | Disabled `Send` renders at `opacity-.5`: composited fill #85b3a1 with a white label (**2.34:1**) in light, #346855 with a #1a1e26 label (**2.59:1**) in dark. No rule binds a disabled control, and it is not near-invisible in dark; recorded so nobody re-measures it | probe `vqa-inbox-2.mjs` → `sendPixels` | None |
| V-9 | note (spec gap) | design 12 §3.1 *folder and selection live in the URL*; §3.2 Selected | A deep link to a conversation outside the default folder (`/support/contact-centre/CNV-102` — a **Mine** row while the list opens on **Unassigned**) shows **no selected row** (`selectedInList false`, en and ar). The thread is right; the list has nothing marked. The spec does not say whether the folder should follow the selection | probe `vqa-inbox-2.mjs` → `selectedInList`; `inbox/thread-wide-en-light.png` | product-designer: decide whether `:id` without `?view=` selects the folder that contains it |
| V-10 | note | design 12 §3.1 *`text-2xs` appears only on the age and the folder count* | Folder counts are 11px in English (`countSize 11px`), 12px in Arabic. Inside the spec's own allowance; listed because the plan's floor (§3.3) allows `text-2xs` only for the delivery word and table meta, and the two documents disagree | probe → `folders[].countSize` | Product-designer to reconcile §3.1 with plan §3.3 when V-3 is settled |

Observed and handed to **qa-engineer**, not a visual finding: on `CNV-111` (snoozed, `ownerId USR-1`)
the composer's refusal reads `Grab this conversation before replying.` and the header shows no
`Claim`; whether a snoozed conversation releases its holder is behaviour.

---

## 2. The seven audit items

### 2.1 Panes, pitch, overflow, errors — **pass**

| Probe | en | ar | Spec |
|---|---|---|---|
| Pane widths at 1280 (list / thread / rail) | **272 / 432 / 272** | **272 / 392 / 272** | §2: 272 / 432 (392 ar) / 272 |
| Panes visible with a thread open | 3 | 3 | AC-CC-04 |
| Row pitch = row height | **60** | **64** | `--ev-row-h-media` 60 / 64 |
| Row pitch at 390 | 64 | 68 | compact token (`globals.css:1930`, `:2112`) |
| Header height | 60 | 64 | §4.1 `--ev-row-h-media` |
| Pane borders | list `border-inline-end 1px --ev-hairline`, rail `border-inline-start 1px --ev-hairline` | same, mirrored | §2 |
| `scrollWidth − clientWidth` | 0 on all 24 | 0 | brief |
| Page + console errors | 0 | 0 | brief |

Evidence: `vqa-report.json` → `panes`, `rowPitch`, `overflowX`, `errors` on every entry.

### 2.2 The thread reads as a chat — **pass**

Measured on `CNV-102` in all eight wide/compact × en/ar × light/dark combinations:

- Bubbles: 2, `border-top-width 0px` on both; inbound `start 48 / end 139`, outbound `start 139 / end 48` (en, mirrored exactly in ar); width 245 of a 400px inner thread (≤ two-thirds, §4.2). Radius `4/8/8/8` on the first inbound (`rounded-ss-sm`), `8/4/8/8` on the first outbound (`rounded-se-sm`), mirrored in ar.
- Bubble text: inbound `--ev-ink`, outbound `--ev-bubble-out-ink`; no child element inside a bubble carries any other colour (`textColors` empty — the body is a bare text node).
- Day divider `Today`/`اليوم`: 12px (13px ar), weight 600, `--ev-text-2`, rules `--ev-hairline`.
- Sender groups: 2 avatars in the `ol` for a two-sender thread (§4.2, AC-CC-05).
- Delivery line: one, `Delivered`, 12px `--ev-text-2` under the newest outbound only (§10 row 5, R10).
- NoteBlock: width **400 / 400** of its list (full width), ground `--ev-note`, radius 8, bar **3px** `--ev-note-bar` at **0px from inline-start** in both directions, no avatar; header 12px (13px ar) `--ev-text-2` with the neutral `Internal note` badge; body 14px `--ev-ink`.
- System line: none in this fixture's thread; the component renders `text-center text-xs` with no ground and no rule (`SystemLine.tsx`), read, not measured.

Token contrast, computed from the resolved values on the document (not from the spec's table):

| Pair | Light | Dark | Spec §9 claims | AA |
|---|---|---|---|---|
| `--ev-ink` on `--ev-bubble-in` | **14.93** | **12.20** | 15.0 / 12.3 | ✓ |
| `--ev-bubble-out-ink` on `--ev-bubble-out` | **14.53** | **9.47** | 14.6 / 9.5 | ✓ |
| `--ev-ink` on `--ev-note` | **16.26** | **13.23** | 15.7 / 13.2 | ✓ |
| `--ev-text-2` on `--ev-note` (note header) | **4.52** | **6.31** | 4.52 / 6.3 | ✓ (4.5 floor, by 0.02) |
| `--ev-note-bar` on `--ev-note` (non-text) | **3.21** | **7.07** | 3.2 / 7.1 | ✓ 3:1 |
| `--ev-text-2` on `--ev-bubble-in` (why §4.2 bans it) | 4.15 | 5.82 | "fails" | ✗ light — and it is not used |
| `--ev-bubble-in` over `--ev-bg` | 1.17 | 1.23 | 1.17 / 1.23 | — |
| `--ev-bubble-out` over `--ev-bg` | 1.20 | 1.64 | — | — |

The spec's table is accurate to the second decimal except `--ev-note`/ink light (16.26 measured
vs 15.7 stated; the measured value is higher). No text in a bubble or note falls below AA.

Evidence: `inbox/thread-wide-{en,ar}-{light,dark}.png`, `vqa-report.json` → `bubbles`, `dividers`,
`delivery`, `notes`, `avatars`, `tokens`.

### 2.3 AC-CC-11 — the register — **pass** (V-2 excepted)

Both registers, both themes, both languages, wide and compact (`vqa-report.json` → `tabs`,
`seam`, `surfaceBg`, `composerButtons`, `consequence`):

| Carrier | Reply | Internal note |
|---|---|---|
| Selected tab ground = body ground | `#ffffff` / `#1a1f26` = surface | `#faf7ef` / `#26231a` = `--ev-note` |
| Seam pixel column through the boundary (dark, en) | y 635–650 all `#1a1f26` — **no seam** | y 635–650 all `#26231a` — **no seam** |
| Same column, ar dark | 627–642 all `#1a1f26` | 627–642 all `#26231a` |
| Unselected tab | transparent on the `bg-muted` track (`#f6f8f9` / `#101319`); the column through it shows track → `--ev-hairline-control` at the list's bottom → body | same |
| Weight | selected **600**, unselected **500** | same |
| 2px top edge | `--ev-ink` on the selected tab only | same |
| Consequence line | `Sent to Nora Al-Harbi by Chat`, 12px `--ev-text-2`, send icon | `Internal note. Not sent to the customer.`, eye-off icon |
| Placeholder | `Write a reply to Nora Al-Harbi…` | `Write an internal note…` |
| Filled buttons in the composer | **1** (`Send`, `--primary`) | **0** (`Add note` is `secondary`: white/`#1a1f26` fill, hairline border) |
| Note bar | — | 3px `--ev-note-bar` at inline-start of the surface |
| Key hint | `Enter sends to Nora Al-Harbi · …` | `Enter adds an internal note · …` |
| `Reply to {name}` in Arabic | `الرد على Nora Al-Harbi`, `clipped false`, icon 12px from inline-start | — |

The unselected-tab label on the track: `--ev-text-2` on `bg-muted` = **4.54:1** light,
**7.47:1** dark. Arrow keys switch register and are mirrored (`ArrowRight` en / `ArrowLeft` ar
both land on `Internal note`, `data-state active`).

**The full-label carrier fails on a long name (V-2).** With `CNV-102` the tabs are 199 + 199 in
a 398 list; with `CNV-101` they are 356 + 130 and clip.

Evidence: `inbox/note-wide-en-dark.png`, `inbox/note-wide-ar-light.png`, `inbox/*-seam.png`.

### 2.4 Header action weight — **pass** on weight; V-1 on layout, V-4 on the kebab

| Route | State | Visible (h32) | `⋯` menu | Filled |
|---|---|---|---|---|
| `CNV-102` | held by you, resolution breached, no ticket | `Create ticket` · `Transfer` · `⋯` | Snooze until… · Close conversation | **0** |
| `CNV-108` | same | same | same | **0** |
| `CNV-101` | unheld chat | `Claim` · `⋯` | Transfer · Snooze until… · Create ticket · Close conversation | **1** `Claim` |
| `CNV-104` | unheld email | `Claim` · `⋯` | same four | **1** `Claim` |
| `CNV-103` | held by another | `Take over` · `⋯` | same four | **1** `Take over` |
| `CNV-106` | closed, phone | `Reopen` · `⋯` | Create ticket | **1** `Reopen` |
| `CNV-111` | snoozed | `Transfer` · `Close conversation` · `⋯` | Create ticket | **0** |
| `CNV-101` at 390 | unheld | `←` · `Claim` · `⋯` · `Details` (h44) | rest | **1** `Claim` |

Every non-primary is `ghost` (transparent, transparent border). Exactly one filled button in
the header while unheld, zero while held; `Send` is then the screen's only filled button
(AC-CC-09). `Create ticket` on the breach is the first visible ghost, not filled (Q-CC6).
Evidence: `inbox/state-CNV-*.png`, `vqa-report.json` → `headerButtons`, `menu`.

### 2.5 Type floor in pane B — V-3

Text nodes under 12px in `[data-inbox-pane="thread"]`, en: **4** — `Active` (badge), `overdue 2m`
(badge), `Internal note` (badge), **`Insert template` (11px, not a badge)**. Arabic: **0**
(`--text-2xs` is 12px there). Everything else in the pane is 12px or more: name lines 12/600,
times 12, delivery 12, consequence and key hint 12, note header 12, bodies 14.

### 2.6 Tokens and dark theme — **pass** (V-7 noted)

Mechanical grep over `src/screens/support/inbox/*.tsx|ts` (leads, each then read):

| Pattern | Hits |
|---|---|
| Tailwind palette classes (`bg-blue-500`, `text-gray-*`, …) | **0** |
| Arbitrary values `[…px]`, `[#…]`, `[calc…]` | **0** |
| Raw hex | **0** |
| Physical utilities `ml- mr- pl- pr- left- right- text-left text-right rounded-l/r border-l/r inset-l/r` | **0** (`max-w-2/3` is a fraction, not arbitrary) |
| `outline-none` without `focus-visible:ring-*` | **0** — 6 sites, all paired (`ConversationListItem.tsx:72`, `CustomerCard.tsx:41`, `FolderNav.tsx:83`, `InboxScreen.tsx:815`, `ThreadCard.tsx:93`, `ThreadHeader.tsx:90`) |

New tokens present in both themes and mapped once: `--ev-bubble-in/out/out-ink`, `--ev-note`,
`--ev-note-bar` (`globals.css:790–794`, `:1801–1805`, `@theme :2631–2635`), `--ev-inbox-list-w`,
`--ev-inbox-rail-w`, `--ev-inbox-rail-min-w` (`:1556–1558`). No `dark:` utilities; the dark
theme is the `.dark` token block alone, which is why every colour above resolved from tokens.

Dark theme, measured: pane seams `#262d36` on `#14181e` (1.28:1) — visible; composer border
`#333c47` on `#1a1f26` (1.48:1) — visible; note ground `#26231a` over the pane (1.13:1) plus the
7.07:1 bar — readable; operator bubble 1.64:1 over the ground, customer bubble 1.23:1. Disabled
`Send` 2.57:1 fill-on-surface, `Add note` a dim outlined button — neither near-invisible
(V-8). Elevation of the surface itself is 1.08:1 (V-7).

### 2.7 Arabic — **pass**

`dir="rtl"` through the account menu, 1280 and 390, light and dark:

- Bubbles: inbound `start 125 / end 48`, outbound `start 48 / end 125` (measured from the pane's inline edges) — every bubble on its logical side; squared corners mirror (`8/4/8/8` inbound first, `4/8/8/8` outbound first).
- `Send` (`إرسال`) at **9px from the composer's inline-end** (left edge) in every ar run; `sendEdge 9` also in en.
- Folder nav: label 32px from inline-start, count 13px from inline-end, in both directions; the selected folder `bg-muted` + 600. Search icon 10px from inline-start (right edge in ar); header channel glyph and avatar at inline-start.
- Selected row: `bg-muted` + **3px `--ev-ink` edge** at inline-start (`#171a21 ×3` then ground) on a plain row; **R5a red wins** on a breached row (`#b42318 ×3`), both directions (`inbox/row-selected-*.png`). Unread dot and the R5a marker on the right edge in ar.
- Focus ring on a list row: `ring-2 ring-inset` in `--ring`, `:focus-visible` true, en and ar, light and dark. On a tab: 4px box-shadow ring in `--ring` plus the surface's ring (V-6).
- Digits and times do not mirror (`08:52`, `2m`, `RDR-1041` inside `<bdi>`); the rail's collapse chevron points toward the edge it collapses to.
- Rail on the left, list on the right, composer tab icons at each tab's inline-start (12px / 37px from start).

Evidence: `inbox/thread-wide-ar-{light,dark}.png`, `inbox/note-wide-ar-{light,dark}.png`,
`inbox/list-wide-ar-light.png`, `inbox/thread-compact-ar-light.png`, `inbox/list-compact-ar-light.png`,
`inbox/note-compact-ar-dark.png`, `inbox/row-selected-plain-ar.png`, `inbox/focus-tab-ar-dark-wide.png`.

### Reference comparison (pass 3)

`navattic-web/02b895df.webp` (avatar + two-line identity rows) against `inbox/list-wide-en-light.png`:
same skeleton — 32px square avatar, name 600 when unread, muted preview, end-of-line meta;
Eyvar's rows are denser (D-2). `cfa43315.webp` (search field with leading icon, 32px controls)
matches the list's search and the folder rows. `shopify-admin-web/02-orders/order-detail-timeline-comment-composer.webp`
(composer chrome, toolbar under the field, "only staff" line outside the surface) matches the
composer's structure: field, toolbar row, key hint outside. No structural divergence found. The
bubble grammar has no frame in either set; design 12 §4.2 decided it and §2.2 above measures it.

---

## 3. Plan §8 probe table, measured

| Probe | Plan target | Measured |
|---|---|---|
| Panes visible with a thread open at 1280 | 3 | **3** |
| Bubbles with a border | 0 | **0** |
| Avatar clusters, two-sender thread | 2–4 | **2** |
| Filled buttons in the header while held | 0 | **0** |
| Filled buttons in the composer | 1 | **1** (Reply) / 0 (Note, by AC-CC-11) |
| Text nodes under 12px in the pane (non-badge) | ≤ 2 | **1** (`Insert template`, V-3) |
| Dark-theme AA failures on the pane | 0 | **0** on every text/ground pair measured |
| List rows per 800px | 12 | fixture holds 7; pitch 60 gives a capacity of 8 with folders open (§10 row 2 already records 12 as unreachable) |
| No horizontal overflow | — | **0px** everywhere |

---

## 4. Ship checklist

| Box | Status |
|---|---|
| Approved layout — §2.2 / §8.1 | Not one of the four: three-track grid, recorded as F-12-1 in design 12 §1; not improvised (§10 row 1) |
| Page header: title, status badge, actions in order — §2.2 | Present in §4.1's order; **V-1**: line 2 collides with the actions |
| Card separable by 1px border + 8px radius — D-11 | Rail cards `border-border bg-card rounded-lg`; composer `border-border-control rounded-lg` ✓ |
| Unsaved changes → save bar — §2.3 | n/a (drafts are in-memory, indicated nowhere by design) |
| One documented badge tone per status; no new tones — §3.4, R7 | `Active` info, `Waiting` warning, `Internal note` neutral, `Yours · 20m` success; SLA pill warning. No red badge; R5a red only on the row edge ✓ |
| Index-table rules — §3.1, R4 | n/a — the list is not a `DataTable` (Q-CC3) |
| Money — §8.3 | n/a |
| Copy: sentence case, verbs, no exclamation — §5.7 | ✓ on every string captured |
| Arabic copy, no physical-direction CSS — §9.1 | ✓ §2.6 grep, §2.7 captures |
| Empty state — §3.6, R8 | `Select a conversation to read it.` one grey sentence with no selection (`inbox/list-wide-en-dark.png`); `CNV-107` and first-run not captured here (harness / qa-engineer) |
| Loading / pending — §8.1, §7.5 | not captured (qa-engineer) |
| Error — §4.4, §5.2 | not captured (qa-engineer) |
| One filled primary — R3, §4.6 | ✓ AC-CC-09 measured in §2.4. The filled colour is `--primary` = `--ev-brand` (`globals.css:2208`), the product-wide mapping; R3's `--ev-ink` wording is a standing product matter, not this screen's |
| Destructive actions confirm — §5.3 | behaviour; qa-engineer |
| Toast for success, banner for state — R10 | no toast or banner added by the inbox ✓ (the only toast seen was the shell's language switch) |
| Visible focus on every interactive element — §7.2 | ✓ rows, folders, tabs, links measured; V-6 note |
| Row actions keyboard-reachable, not hover-only — §7.3, D8 | checkbox appears on focus as well as hover (`ConversationListItem.tsx:80–83`); key semantics are accessibility-auditor's |

---

## 5. Verdict

**Not merge-ready.** Two blocking findings, both layout at the fixture's own default data:

1. **V-1** — the thread header paints the running SLA pill under the first action button at
   1280 (58×20px) and at 390 (up to 44×26px, three collisions on `CNV-101`). The one clock
   §4.1 says must show is the thing being covered.
2. **V-2** — the register tabs clip on a long customer name, in English and Arabic, at both
   viewports. AC-CC-11's first carrier is the full label; `eply to` and `ملاحظ` are not it.

Everything else the brief asked for holds and is measured above: the three panes at
272 / 432 / 272 with 60 / 64px rows and zero overflow; a bordered-bubble count of zero with
sides, grounds, inks, dividers, groups, delivery and the note block all on spec and above AA in
both themes; a register with no visible seam (pixel-proved in dark, both languages), 600 vs 500,
the consequence line, no filled button in the note register; header weight exactly one filled
while unheld and zero while held; a clean token grep; and a fully mirrored Arabic layout with
`Send` at the inline-end and visible focus rings.

After V-1 and V-2 are fixed, re-verify with the two harness probes suggested in §1 added to
`support-inbox.mjs` (header rect intersection; `CNV-101` in the route list), and land V-3, V-5
before Phase D. V-4 and V-9 are product-designer decisions.
