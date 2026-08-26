# 07 — RTL reachability and failure injection

**frontend-engineer.** Two pieces of dead plumbing wired, then the first look anyone has
had at this product in Arabic.

Both wires were reported dead three times by three reviewers. Neither was a design
question; both were one statement missing from a file nobody edits.

---

## 1. What was wired

### 1.1 `setLanguage` now has a production call site — AC-70

`setLanguage` had **zero** production callers. There was no store behind it and no control
that reached it, so `dir="rtl"` was reachable only by hand-editing the DOM. Every §9
finding in every prior report is marked *not run* for that reason.

| File | Change |
|---|---|
| `src/shell/AccountMenu.tsx` | a `DropdownMenuRadioGroup` — `Language` · `English` · `Arabic` — above the `Sign out` separator |
| `src/shell/TopBar.tsx` | forwards `language` + `onSetLanguage` to the account menu |
| `src/shell/AppLayout.tsx` | `setLanguage` callback: calls the hook, then fires §11.6 row 23's toast |
| `src/i18n/dictionaries.ts` | 3 keys — `shell.account.language`, `shell.language.en`, `shell.language.ar` |

**Why the account menu.** §11.6 row 23 describes what a language switch *does* and never
says where the operator does it. The account menu is the shell's existing identity-and-
preferences affordance and it is the one place a twice-a-year control belongs; the top bar
is already the busiest strip on the page. It is a **radio group, not two items and not a
toggle**, because the choice is exclusive and `aria-checked` is what tells a screen reader
which language is live.

`onValueChange` passes Radix's `string` through `isLanguage` rather than casting it — a
cast is how `setLanguage('EN')` reaches `directionFor` and silently resolves to `ltr`.

**Measured behaviour** (production build, `vite preview`):

```
after switch                       rtl/ar      <- on document.documentElement, AC-70
url unchanged                      /operations/people
after in-app nav (SPA)             rtl/ar      <- survives navigation
after RELOAD                       ltr/en      <- Q1 / AC-33 gap, recorded not hidden
localStorage keys                  []          <- no adapter shipped
```

**Persistence is still Q1 and I did not answer it.** `src/lib/persistence.ts` is untouched,
`localStorage` is empty after a switch, and the language resets on reload. That is the
recorded AC-33 gap, not a bug hidden behind this control.

### 1.2 `?mockFail=` now has a caller — AC-36

`seedMockFailuresFromLocation` is exported at `src/data/clients/index.ts:32` and its own
doc comment has said *"Call once at boot, before the first render, from the app entry
point"* since 0.2. Nothing called it. `src/data/` is read-only to me and needed no change —
the function was already correct.

`src/main.tsx` now calls it at **module scope, before `createRoot`**. Not in a `useEffect`:
every mock client calls `mockFailures.take(op)` on its way out and `ShellProvider` fires
three reads in its first effect, so a call ordered after `createRoot` applies the failure to
the *retry* rather than to the load — which looks like it works and does not.

**Verified against the running app, not asserted** (`scratch/mockfail.mjs`, dev server):

| URL | `<main>` renders |
|---|---|
| `/operations/people` | `People · 57 captains ·` full table |
| `/operations/people?mockFail=drivers.list` | **`Couldn't load captains.` + `Try again`** |
| `/operations/people?mockFail=session.current` | **`Couldn't load your workspace` + `Try again`** |
| `/operations/people?mockFail=applicants.list` | full table — correct, the Applications view is not mounted |

No page errors on any of them. The last row matters: the seed is scoped per operation, not
a blanket failure.

`src/shell/qa.shell.test.tsx` already carried QA's source-level assertion for this (D-10).
It was `it.fails` when I started and errored with *"Expect test to fail"* the moment the
wire landed; qa-engineer has since re-cut it and all 43 tests in that file pass.

---

## 2. Verification

Other agents landed work throughout this session, so the numbers moved under me. Both runs
are reported rather than only the flattering one.

| Command | Result |
|---|---|
| `npx tsc -b --noEmit` | **exit 1 — 8 errors, all 8 in `src/data/fixtures/fairness.ts`.** Zero in any file I touched. mock-data-engineer's file, read-only to me. |
| `npx vitest run` (mid-session) | **809 passed / 809**, 37 files, 0 failed |
| `npx vitest run` (final) | **813 passed, 4 failed / 817**, 38 files |
| `npx vite build` | **clean**, 3031 modules, 8.36s |
| `/token-audit` on my 5 files | **clean** — no palette classes, no arbitrary values, no raw colour, no physical directions, no `outline-none`, no inline styles, no `<div onClick>`. `components.json` `"rtl": true`, untouched |

**My own failure count is 0, in both runs.** Accounting for every red test I saw:

- First run, 2 failed: `nav.test.tsx` (`bg-nav-chip` vs `bg-nav-rail-chip` — the reskin) and
  the D-10 `it.fails` above, which my wire turned green and which QA then re-cut. Both were
  fixed by their owners during the session.
- Final run, 4 failed: `src/components/table/columnBudget.test.ts`, a file that did not exist
  when I started. All four are *"fits the 910px inner width"* assertions for the four People
  views. That file is `src/components/table/*` and off-limits to me — but note the number:
  **910px is exactly the LTR scroll width I measured in B-1 below, and Arabic gets 870.**
  Whoever is writing that budget should know the contract has a second, narrower value in
  the other language.

The brief warned ~22 `src/shell` tests were red pending QA's re-cut. None of them were red
by the time I ran; the re-cut had landed.

---

## 3. The Arabic captures

`scratch/shots/`, all taken through **the real control** — open the account menu, click
`Arabic` — against a **production build** served by `vite preview`. Each asserts
`documentElement.dir==='rtl' && lang==='ar'` before the shutter, the pointer is parked so
no stale `:hover` is in frame, and the toast is allowed to expire.

| File | |
|---|---|
| `ar-operations-people-1440.png` · `-1280.png` | the index table |
| `ar-operations-overview-1440.png` · `-1280.png` | metric tiles, charts, breakdown lists |
| `ar-management-overview-1440.png` · `-1280.png` | second overview |
| `ar-account-menu-1440.png` | the new language control, mirrored |
| `ar-bell-popover-1440.png` / `en-bell-popover-1440.png` | side-by-side for attribution |
| `ar-profile-layer-1440.png` / `en-profile-layer-1440.png` | drawer edge, AC-72 |
| `ar-columns-popover-1440.png` · `ar-filter-popover-1440.png` · `ar-row-kebab-1440.png` | overlay alignment |
| `rtl-mockfail-drivers-1440.png` | the injected error state |

> **There are no Arabic strings.** `AR = {}` is deliberate (AC-74's own fixture). Every
> string in these captures is the English fallback, correctly resolved, **with no raw keys
> anywhere**. What these captures reveal is geometry, direction, the Naskh face and numeral
> rendering — *not* translation quality. An empty dictionary is not a regression, and
> nothing below should be read as one.
>
> It does have one consequence worth stating plainly: because every string is English
> today, **§4's bidi defects below hit literally every sentence in the product.** They will
> shrink as `AR` fills, and they will not disappear — operator-entered names, ids and
> amounts stay Latin forever.

---

## 4. RTL defect list

Severity: **A** = an operator would read a wrong value or cannot reach a control ·
**B** = visibly broken · **C** = cosmetic.

### A-1 · Bidi: every English sentence reorders, and trailing punctuation jumps edges

The most widespread defect and the one an empty dictionary hides from code review.

Text elements set `unicode-bidi: isolate` but inherit `direction: rtl`. Isolation alone is
not enough: an English run inside an RTL paragraph still has its neutral characters —
the full stop, the colon, spaces between runs — resolved against the *paragraph* direction.

Measured (`scratch/bidi2.mjs`, word rects sorted by physical x):

| DOM string | Renders as | With `dir="auto"` |
|---|---|---|
| `Every value in this range is zero.` | `.Every value in this range is zero` | `Every value in this range is zero.` ✅ |
| `Computed 25 يونيو 09:14` | `09:14 يونيو Computed 25` | `Computed 25 09:14 يونيو` ⚠️ |
| `57 captains` (page count line) | `captains 57` | — |
| `Overview is being built.` | `.Overview is being built` | — |

Visible in `ar-operations-overview-1440.png` (the No-shows card) and
`ar-management-overview-1440.png`.

**Fix:** `dir="auto"` on any element whose content may be either language — proven above
for the sentence case. **It is necessary but not sufficient for composed strings**: row 2
still swaps its date internals, because `25 يونيو 09:14` is itself a mixed run and needs
the localized date isolated as a unit inside the sentence. Two changes, not one.

Not mine to make — this is `src/components/metrics/*`, `src/components/PageHeader.tsx` and
the screens. Raising it rather than reaching into them.

### A-2 · `Mine` chip overlaps the search field by 37px at 1280 — reproduces exactly

The reported lead is real, and it is RTL-specific.

| | field | Mine chip | |
|---|---|---|---|
| LTR @1280 | `x=592 w=400 end=992` | `x=996 end=1061` | clear by **4px** |
| LTR @1440 | `x=672 w=400 end=1072` | `x=1156 end=1221` | clear by 84px |
| **RTL @1280** | `x=268 w=400 end=668` | `x=237 end=305` | **OVERLAP 37px** |
| RTL @1440 | `x=348 w=400 end=748` | `x=237 end=305` | clear by 43px |

Two things combine. The field is a fixed `w-100` centred between two `flex-1` siblings, and
it lands **~20px further toward the inline-start in RTL than in LTR** (RTL centre 468 vs
content-region centre 488; LTR is exact). That leaves the inline-end group 268px for 305px
of content — `On call: unassigned` + `Mine 2` + bell + avatar — and the group has no shrink
allowance, so it overflows *under* the field instead of compressing.

**LTR @1280 clears by 4px.** This is not an RTL bug that RTL invented; it is a top bar with
no margin at the 1280 floor, and RTL is what tips it over. Owner: shell / whoever holds
`TopBar` slot 3 sizing. Visible in `ar-operations-people-1280.png`.

### A-3 · The `⌘ K` chip reorders to `K ⌘`

`docs/ref/rtl.md`: *"Keyboard chips (`⌘ K`) — position mirrors, glyph order does not."*
The position mirrors correctly. The glyph order does not survive.

```
AR search kbd: {"dom":"⌘ K", "dir":"rtl", "unicode-bidi":"normal"}
```

`⌘` is a bidi-neutral and `K` is strong LTR, so in an RTL paragraph the pair swaps.
`src/shell/GlobalSearch.tsx:176-178` carries a comment asserting the opposite —
*"the glyph ORDER inside it does not [mirror], which is why `⌘ K` is one string in one
key"*. One string in one key does not achieve it; the `Kbd` needs `dir="ltr"` (or
`unicode-bidi: isolate` with an explicit `direction: ltr`). Visible at the top of every
1440 capture. Owner: shell — flagged rather than fixed, since `Kbd` is a primitive and a
reskin is in flight.

### B-1 · The table's scroll viewport is 40px narrower in Arabic

At 1280, same route, same columns:

| | scroller left | right | clientWidth | scrollWidth |
|---|---|---|---|---|
| LTR | 337 | 1247 | **910** | 1232 |
| RTL | 33 | 903 | **870** | 1232 |

The content region is 976px wide in both. LTR insets the table card 33px at each end; RTL
insets 33px at the physical left and **73px** at the physical right. 40px of asymmetric
inline-start padding appears only in Arabic, so Arabic hides more of the table than English
at the same width. Owner: `src/components/table/*` / `DataTable.tsx`.

**This collides with work in flight.** `src/components/table/columnBudget.test.ts` landed
during this session and asserts a **910px inner width** for all four People views. 910 is
the LTR number. In Arabic the same table gets **870**, so a column set tuned to exactly
910 overflows in Arabic by construction. Either the 40px asymmetry is a bug to fix — in
which case the budget is right and this defect blocks it — or the budget needs to be the
narrower of the two. Not my call; raising it before the budget is finalised against a
number that only holds in one language.

### B-2 · Notification popover: items 5+ paint outside the card, over the page

The scroll region inside the bell popover has `max-height: 384px` with **`overflow-y:
visible`**, so everything past the fifth notification renders outside the popover's white
card, unstyled, directly over the table beneath. The `See all` footer overlaps item 4.

```
popover h=471 · inner list h=384 · inner overflow-y: visible
```

**Identical in LTR** — see `en-bell-popover-1440.png` against `ar-bell-popover-1440.png`.
Not an RTL defect; found during this pass and attributed honestly.

### B-3 · The toast is light, not dark — sanctioned deviation #8 is not shipping

`src/components/ui/sonner.tsx` declares `bg-foreground text-background` and documents it as
closing legacy defect **D7** (*"a light tinted card"*). The class is on the element and does
not win:

```
class: "... bg-foreground text-background ..."
computed: background rgb(255,255,255) · color rgb(23,23,23) · border 1px solid rgb(237,237,237)
```

Sonner's own `[data-styled=true]` rules override the utilities. So D7 is **still open** and
deviation #8 is not in the product. Identical in both languages. `ui/sonner.tsx` is mine by
role, but it is not in this task's file list and a reskin is in flight — reporting, not
touching. Visible in every capture that still has the toast in frame.

### B-4 · `ArrowRight` is inert on the view-switcher tablist, in both directions

Focused on `Compliance`, one key press:

| | `ArrowRight` | `ArrowLeft` |
|---|---|---|
| LTR | Compliance → **Compliance** (no move) | Compliance → Applications (visually left ✅) |
| RTL | Compliance → **Compliance** (no move) | Compliance → Riders (visually left, logically *next* ✅) |

**The mirroring is correct** — `DirectionProvider` is doing its job, and in RTL `ArrowLeft`
correctly means "next". The defect is that `ArrowRight` never advances in *either*
direction, so LTR cannot go forward and RTL cannot go back.

Separately, **focus lands on the `Skip to content` link after every arrow press** in both
directions — the view change blows away the operator's position. Neither is RTL-specific.
Owner: whoever owns `src/screens/operations/people/*` (redesign in flight).

### C-1 · Toast close button moves to the trailing corner

The toast region is centre-anchored so the toast itself does not mirror (AC-72, correct —
centre = 720 of 1440 measured). Its `✕` moves from the leading to the trailing corner with
`dir`. Cosmetic; noted so nobody reports it as the legacy `translateX(28px)` bug, which is
genuinely gone.

---

## 5. What is correct in Arabic — verified, not assumed

Worth as much as the defect list, because none of it had ever been looked at.

| | Result |
|---|---|
| **`dir`/`lang` on the document element** | ✅ AC-70. `<html dir="rtl" lang="ar">`, not a subtree, not on `<body>` |
| **Zero physical offsets** | ✅ Swept every positioned element in the live DOM: **0** with a physical-only `left`/`right` and no logical equivalent. The §9.1 discipline holds under real RTL |
| **Rail + sub-tab column** | ✅ AC-71. Both move to the inline-end; badges, pills and icons follow |
| **Shell layer (drawer)** | ✅ AC-72. LTR `x=960 w=480` (physical right) → RTL `x=0 w=480` (physical left) |
| **Radix overlay geometry** | ✅ **Nothing clipped, nothing off-viewport.** Account menu, bell popover, row kebab, Columns and Filter popovers all measured in RTL — every one inside the viewport, every one aligned to the mirrored edge. This is the part that was completely unassessed; `DirectionProvider` in `App.tsx` is earning its place |
| **Radio indicator** | ✅ the check in the language menu renders at the mirrored edge (`end-2` resolves left) |
| **Charts** | ✅ plot areas and axes stay LTR while the card chrome mirrors — exactly `rtl.md`'s ruling (*"a reversed time axis makes axis and numbers run opposite ways"*). Card title, legend and breakdown bars mirror; the plot does not |
| **Numerals** | ✅ Western `0`–`9` throughout. `1,284`, `4.6`, `99%`, `12,400.50` all render intact and in order |
| **Money** | ✅ `12,400.50` `<bdi>`-wrapped, `text-align: end`, no reorder |
| **Dates** | ✅ localize through `Intl` with an empty dictionary — `25 Jun` → `25 يونيو`. The cell aligns inline-start and the numeral run does not reorder, per `rtl.md` |
| **Arabic face** | ✅ `Noto Naskh Arabic Variable` in the stack and rendering; both subsets ship in the build |
| **Rail arrow keys** | ✅ identical traversal in both directions (vertical, so direction-independent) |
| **Menu arrow keys** | ✅ `My profile → Switch user → English` |
| **Toast** | ✅ centre-anchored, does not mirror, `Interface language set to Arabic` verbatim per row 23 |
| **Route + scroll** | ✅ URL unchanged across the switch; language survives in-app navigation |
| **The row marker** | ⚠️ **unverifiable.** Zero `inset-inline-start` pseudo-element markers render on any of the three routes in *either* direction — D7 removed the nav one, and the R5a lane marker needs a flagged row no current fixture produces. Not broken; unreachable. Needs a fixture with a flagged row before anyone can sign it off |

### One capture artifact, so nobody chases it

A second nav pill appears highlighted in the earlier hand-driven captures. It is a **stale
`:hover`**: the pointer sits where the menu item *was* before the layout mirrored, and it
clears on the first mouse move (`bg` returns to transparent, measured). The final captures
park the pointer and are clean. Not a defect.

Likewise, the language appeared to revert to English ~5s after switching during one dev-server
run. That was a **Vite full reload** triggered by another agent saving a file mid-capture.
Re-run with nobody editing: one page load, no reversion. The static build never showed it.

---

## 6. Handoff

**Nothing here is a design decision.** Every defect above is a geometry, bidi or overflow
fact with a measurement attached; none of them should be closed by picking a look.

Open, and owned elsewhere:

1. **A-1 bidi** — needs `dir="auto"` plus date-unit isolation, in the metrics components,
   `PageHeader` and the screens. Two changes, not one. *(product-designer should confirm
   whether an English fallback string in an Arabic UI is even the intended end state, or
   whether `AR` gets filled first.)*
2. **A-2 top-bar overflow** — the 1280 floor has 4px of margin in LTR and −37px in RTL. A
   shell owner needs to decide whether the field shrinks or the chips do. I did not pick.
3. **A-3 `⌘ K`** — a one-attribute fix in `ui/kbd.tsx` or `GlobalSearch.tsx`; contradicts a
   comment already in the file.
4. **B-1 40px** — table card inline-start inset differs by direction, and the new
   `columnBudget` test hard-codes the LTR-only 910px. Whoever owns that budget should see
   this before it is finalised.
5. **B-2 popover overflow** and **B-3 light toast** — both LTR too, both pre-existing.
6. **B-4 `ArrowRight`** — People screen, redesign in flight.
7. **The row marker cannot be verified** until a fixture produces a flagged row.
   mock-data-engineer.
8. **Q1 persistence** remains unanswered and unhidden. The language resets on reload.

Files I changed: `src/main.tsx`, `src/shell/AccountMenu.tsx`, `src/shell/TopBar.tsx`,
`src/shell/AppLayout.tsx`, `src/i18n/dictionaries.ts`. I did not touch `src/lib`,
`src/hooks`, `src/data`, `components.json`, `src/components/table/*`, `DataTable.tsx`,
`src/screens/operations/*`, or any `qa.*.test.tsx` / `nav.test.tsx`.

Repro scripts: `scratch/mockfail.mjs`, `scratch/rtl.mjs`, `scratch/rtl-probe{,2,3,…,9}.mjs`,
`scratch/bidi{,2}.mjs`, `scratch/q1-check.mjs`, `scratch/rtl-final.mjs`. They expect a
`vite preview` on `:5244`.
