# 12 — Refusal and undo surfaces

**Owner:** product-designer · **Raised by:** D19's design round · **Status:** specified,
one item needs the owner's signature and ships without it in the meantime.

## 0. Why these three are one document, and not in the composer spec

`11-conversation-composer.md` is a screen. These three are **shared components used by 41
screens** — `DataTable`'s bulk bar, `table/rowActions.tsx`'s kebab item, and the single
`Toaster`. Burying a product-wide rule inside one screen's file is how a rule stops being
found, and `patterns.md` exists because that has happened here before.

They are one document because they are one question asked three times: **how does a surface
say no, or say it failed, without becoming a different kind of surface?**

**This document does not edit `00-shell.md` or `01-table-controls.md`.** Both have owners.
It names the sections it amends, and the owner of each file applies it:

| Amends | File | Owner |
|---|---|---|
| §11.5 Toast — the critical state | `design/00-shell.md` | shell owner |
| The bulk refusal panel | `src/components/DataTable.tsx` | shell owner (Phase-0 shared component) |
| The kebab refusal line | `src/components/table/rowActions.tsx` | shell owner |
| §9.3's refusal note | `design/01-table-controls.md` | table owner |

---

## 1. The bulk refusal panel — a real treatment

**What is flagged.** `DataTable.tsx:1300` — *"The visual treatment is provisional and flagged
for product-designer."* The rule it implements (a refusal is real text, keyboard-reachable,
`aria-describedby`-linked) is not provisional and stays exactly as built. Only the surface
changes.

### 1.1 What is wrong with the provisional treatment

Five things, each citable:

1. **It is a borderless white card floating on a white page.** §6.2 **D-11**: a card is
   separated by *"a 1px border and an 8px radius, not by a fill step."* §6.3 **D1** records
   white-on-white **with no border** as the defect, in as many words. `bg-card ... shadow-2`
   with no `border` is that defect, newly built.
2. **Two materials for one object.** The refusal explains a button that lives on the ink
   pill. Splitting them across two surfaces is what makes the panel read as a floating
   tooltip — and §11.2 and §8.4.4 both exist to say a refusal is *not* a tooltip.
3. **`text-2xs` is the wrong token.** `globals.css` annotates `--text-2xs` as *"count badge
   numeral, status badge label"* (11px) and `--text-xs` as *"secondary line and helper
   text"* (12px). The one sentence explaining why the primary is dead is set at the badge
   size.
4. **`text-center` on a wrapping sentence**, in the second-lightest ink, at the smallest
   size — three separate ways of saying *this is a caption*. It is the only content on the
   surface with an imperative in it.
5. **Off-grid literals.** `gap-0.5` (2px) and `py-1.5` (6px) — §6.3 **D15**, an off-grid
   literal is a defect on its own terms.

A sixth, milder: the escape hatch is `text-foreground` + `underline`, which borrows a link's
treatment without a link's colour (R3 gives links `--ev-blue-dk` + underline). It reads as a
link, navigates nowhere, and at 11px inline it is the least discoverable control on the
surface — while D21's own falsification test is *that control's press rate*.

### 1.2 The treatment — one object, two compartments

```
        ┌────────────────────────────────────────────────────────────┐
        │ Suspend — 3 of the selected captains are already            │  refusal compartment
        │ suspended.                    [ Select only the 9 eligible ]│  ink, background/80
        ├────────────────────────────────────────────────────────────┤  1px background/20
        │  12 selected │ [Suspend] [Reinstate] [⋯] │ [Clear]          │  action compartment
        └────────────────────────────────────────────────────────────┘  ink, background
```

**The refusal joins the bar. It stops being a second surface.**

| Part | Spec |
|---|---|
| Container | The existing `rounded-xl bg-foreground text-background shadow-3`, now `flex-col`. One element, one shadow, one radius. |
| Refusal compartment | `px-4 py-2`, `text-xs` (12px), `text-background/80`, `text-start`, `max-w-prose`. **11.6 : 1** on `--ev-ink` — computed, passes AA with room. |
| Divider | `h-px bg-background/20` — the same rule the bar already draws between its own groups. |
| Action compartment | Unchanged in content and order. `h-11`, `items-center`. |
| Escape hatch | `Button size="xs"`, the bar's own on-ink ghost treatment (`bg-background/20 text-background hover:bg-background/30 focus-visible:ring-background`), at the compartment's **inline-end**; wraps to its own line below the sentence when the sentence is long. |
| Growth | Upward. The container is already bottom-aligned in a zero-height sticky row, so adding a compartment above the action row moves nothing on the page. |

**Why this does not violate D21.** D21 says the control is *"a control in the refusal text,
not a fourth button on the inverted bar. D10b's bar is already at its width budget and the
refusal panel is where the explanation lives."* **The reason D21 gives is the bar's width
budget**, and the action row's width is untouched — the control sits in the refusal
compartment, which has its own line. The constraint is honoured on its own stated terms.

**Why the escape hatch leaves the sentence.** §7.7.1's *inline* exception means the 11px
text-button is **conformant**, and this is not an accessibility fix. It is a discoverability
fix: at `size="xs"` the control is ≥28px tall, sits at a predictable edge, and stops
competing with the sentence it is embedded in. Its **label does not change** —
`Select only the {count} eligible`, exactly as `table.bulk.selectEligible` already reads, so
`bulkSelection.test.tsx`'s `getByRole('button', { name: 'Select only the 9 eligible' })`
keeps passing.

### 1.3 More than one refusal at once

Today each disabled action renders its own unlabelled sentence, stacked. With two disabled
actions the operator cannot tell which sentence belongs to which dead button.

| Case | Render |
|---|---|
| One refusal | The sentence alone, no label prefix. |
| Several refusals, **identical** sentences | **Once**, no label prefix. Every disabled control points `aria-describedby` at that one line. |
| Several refusals, **different** sentences | One line each, prefixed with the action's own label: `{action} — {reason}`. Dictionary key `table.bulk.refusalLabelled`, so a translator can change the separator. |
| No refusal | No compartment. The bar is the pill alone, as today. |

**A permission refusal outranks a domain refusal** and there is then only ever one sentence
— D21 rule 5, `roleRefusal(...) ?? domainRefusal(...)`, already the shape at `captains.ts:192`.

### 1.4 Arabic

Nothing here is physically anchored. `text-start`, `px-4`, the hatch at the inline-end. The
count is `formatCount(n, language)` (D21 rule 4) and the sentence is one dictionary template
with a `{count}` placeholder — never a concatenation, which cannot survive bidi. The em dash
in `{action} — {reason}` is in the template, not in JSX, so a translator can replace it with
`: ` or an Arabic colon.

---

## 2. The two-sentence refusal grammar, on two surfaces

**D17:** `perm.denied = 'You need the “{permission}” permission. {granter} can grant it.'`

**Does it read the same in both places? Yes — and that is the finding.** The grammar is
surface-independent by construction and needs no change:

- it contains **no deictic** — no *this*, no *these*, no *the selected*. It is equally true
  of one row and of twelve.
- it contains **no count**, so it does not have to agree with a selection that changes under
  it.
- it names a **permission and a role**, both of which are facts about the operator, not about
  the record — so nothing in it can be right on one surface and wrong on another.

That is not luck; it is why D17 wrote a *capability* sentence instead of a *record* sentence.
**Record-shaped refusals do not travel**, which is exactly why D21 had to mint three keys
(`.one` / `.other` / `.all`) for the domain sentence sitting underneath it.

**Three things change, and none of them is the copy.**

### 2.1 The container must give the sentence a measure

The same ~70-character string is one line in the bulk compartment (`max-w-prose`) and **four
or five lines inside a kebab item**, because `DropdownMenuContent` is content-width and
`RefusalLine` is `whitespace-normal`. The item's own label sits above that, so a denied kebab
item becomes a paragraph with a heading.

> **A menu containing any item that carries a reason takes a minimum inline size of 256px**
> (`min-w-64`), and the reason line moves from `text-2xs` to `text-xs`.

`--text-2xs` is documented in `globals.css` as the **badge** size. `--text-xs` is documented
as *"secondary line and helper text"*, which is what a reason is. Same correction as §1.1
item 3, same reason, and it applies to `SingleRowAction`'s reason line too.

### 2.2 Identical refusals collapse to one instance per container

Three denied items in one kebab, all for the same missing permission, print the same two
sentences three times. That is not clearer; it is a wall.

> **When every reason in one container is the same string, it renders once and every refused
> control points `aria-describedby` at it.**

| Container | Where the single instance goes |
|---|---|
| Kebab menu | A non-interactive row at the **end** of the menu, after a `DropdownMenuSeparator`. The denied items above it keep `aria-label={label}` and gain `aria-describedby` pointing at it. |
| Bulk bar | The refusal compartment, unprefixed (§1.3). |
| A whole screen | One line beneath the primary surface it governs — for the conversation pane, beneath the composer (§8.6.8). |

Distinct reasons are never collapsed and stay on their own items.

### 2.3 The ink token differs, because the ground does

| Surface | Ground | Reason line |
|---|---|---|
| Kebab item, single row action | `--ev-surface` | `text-muted-foreground` (`--ev-text-2`, **4.87 : 1**) |
| Bulk bar refusal compartment | `--ev-ink` | `text-background/80` (**11.6 : 1**) |

Same words, same size, two tokens. Named here so nobody hardcodes one of them into a shared
copy helper and ships an invisible sentence on the other surface.

### 2.4 The rest, so it is not re-litigated

- **The period stays, on both surfaces.** R6 — full sentences take one. `copy.md` rule 8's
  "no period on a menu item" governs the item's **label**, not a sentence rendered inside it.
- **Arabic, both surfaces identically:** `“{permission}”` is a quoted name and takes
  `<bdi>` isolation; `{granter}` opens sentence 2 and resolves through `role.<name>.subject`,
  never the role's display name (D17's two i18n flags). The quotation marks live in the
  dictionary template, not in JSX, so a translator can change them.
- **Neither surface may use a tooltip**, ever, on either. D17 clause 3, §8.4.4, §5.7.

---

## 3. The critical toast — R9's fork, specified

**D18:** on a failed undo the toast *"becomes critical in place, states that the reversal
failed and why, offers `Try again` **once**, and leaves the original action's effect on
screen."* R9 does not describe this state and `00-shell.md` §11.5 does not either.

### 3.1 The ruling

> **A critical toast is not a red toast. It is a toast that has stopped being transient.**

The ink ground, the 8px radius (R15) and the white label are unchanged, because none of them
was ever what made a toast benign. **Four things change, and every one survives greyscale:**

1. **It does not auto-dismiss.** The timer is cleared. It persists until the operator
   dismisses it or `Try again` succeeds. This is the load-bearing change, and it is what
   reconciles the state with **R10**: a failed undo is a *standing condition*, and R10
   decides surfaces by lifetime. A toast that has stopped being transient is allowed to
   carry one.
2. **It gains a second line.** Line 1 is unchanged in kind — it still names the object
   exactly and is still ≤60 characters, so **R9 is scoped, not suspended**: R9 governs the
   message, and the second line is the `description` slot `sonner.tsx` already styles
   (`text-sm text-background/80`). D18 requires the reason (*"states that the reversal failed
   **and why**"*); R9 never spoke to a description.
3. **Its action becomes `Try again`, offered once.** After a second failure the action is
   replaced by `Open the record` (D18: *"the `Try again` is replaced by a link to the
   record"*).
4. **It is pinned to the bottom of the stack.** §11.5's *"newest nearest the bottom edge,
   older push up"* would carry the one toast that requires an act off the top of a 3-toast
   stack. The critical toast holds the bottom slot; transient toasts stack above it. **At
   most one critical toast is visible** — a second critical outcome replaces the first.

### 3.2 What is deliberately not done, with the number that killed it

**`--ev-red` `#b42318` on `--ev-ink` `#171a21` measures 2.66 : 1** — below §7's 3:1 floor for
a non-text graphic. A red edge, a red rule or a red glyph inside the ink pill is **not
legible**, and it is not proposed. That closes the obvious first idea on evidence rather than
on taste.

Turning the **whole pill** `--ev-red` with a white label **is** legible (white on
`--ev-red` = 6.574 : 1, per the token's own annotation) and it **is R5a's fifth use of red**,
so it needs a §6.2 entry and the owner's signature — the same route D-14 is taking.

> **Raised as §6.2 D-15, recommendation DECLINE.** Three reasons, strongest first. (a) The
> four changes in §3.1 are sufficient and none costs anything: persistence is the strongest
> possible "this is not over" signal and it is the only one that cannot be missed. (b) R1
> rejected the saturated split-strip for banners; a saturated red pill is that treatment
> reintroduced on a different surface. (c) It would create a **second inverted family** —
> ink toasts and red toasts — where the product currently has exactly one inverted surface
> and that scarcity is what makes it read. **Nothing is blocked by the signature either way:
> §3.1 ships today and needs no entry.**

### 3.3 The three toasts of an undo, with final copy

| Moment | Line 1 | Line 2 | Action | Life |
|---|---|---|---|---|
| The act | `Nora Al-Harbi suspended` (23) | — | `Undo` | **10 000 ms**, hover pauses |
| Undo succeeded | `Suspension reverted for Nora Al-Harbi` (37) | — | **none** — an undo of an undo is a loop with no floor | 5 000 ms |
| Undo failed, 1st | `Couldn't revert the suspension for Nora Al-Harbi` (48) | `Someone else changed this record in the meantime.` | `Try again` | **persists** |
| Undo failed, 2nd | same | `The reversal still didn't go through.` | `Open the record` | **persists** |
| Bulk | `12 captains suspended` (21) | — | `Undo` | 10 000 ms |
| Bulk undo failed | `Couldn't revert 12 suspensions` (30) | as above | `Try again` | **persists** |

Every line 1 is ≤60 characters and names the object exactly (**R9**). No period on line 1 —
it is a fragment. Line 2 **takes** a period — it is a full sentence (**R6**). No exclamation
mark, no emoji, no "failed to", no blame (§5.7).

Line 2 is chosen from the error, not written by the screen:

| `ApiError.kind` | Line 2 |
|---|---|
| `conflict` (409) | `Someone else changed this record in the meantime.` |
| `network` | `The reversal didn't reach the server.` |
| anything else | `ApiError.message`, which the clients already write as an operator sentence. |

**The original action's effect stays on screen.** D18 is explicit and it is right: the
captain is still suspended, because that is still the truth.

### 3.4 Announcement, focus and dismissal

- **Announced through the single live region** (AC-29). A toast that changes content in place
  is a polite update to a region that has already spoken, and polite updates to changed
  content are routinely dropped — so **the critical toast is announced assertively**
  (`role="alert"` on the toast element). It must not create a second live region.
- **Focus does not move to it.** Moving focus out of the operator's hands to a toast they did
  not ask for is worse than the toast being missed; it is persistent precisely so it can be
  reached at leisure.
- **`✕` is still present and is the only dismissal.** Dismissing a critical toast is an
  operator act and it does not come back.
- **It survives a route change** within its life (AC-23) — and its life is now unbounded, so
  it survives every route change until dismissed.

### 3.5 Arabic

Unchanged from §11.5: the region is centre-anchored, so there is no corner to flip and the
entry transform is `translateY` only. The second line and the action button sit in the same
flow as the label and mirror with it. **The action is at the inline-end of the toast in both
languages.**

---

## 4. Findings

| # | Finding | Owner | Blocks |
|---|---|---|---|
| **F-1** | **§6.2 D-15 — a red critical toast is R5a's fifth use of red.** Recommendation **DECLINE**; §3.1 ships without it. Recorded because "make it red" will be requested. | business owner, via product-owner | nothing |
| **F-2** | **The undo toast's `Undo` button is itself unsanctioned today.** §5.1 forbids an action link in a toast, §6.3 **D7** cites that clause to judge the legacy toast non-conforming, and `sonner.tsx` disables the action slot in writing. **D18 requires the button.** There is no §6.2 row naming the suspension, so by §6.2's own rule (*"a deviation that does not name its rule is not sanctioned — it is a defect"*) the shipped undo toast is a defect. It needs a §6.2 row covering the **action-bearing toast** as a class — `Undo`, `Try again`, `Open the record` — independent of F-1. | product-owner → owner | nothing today; it is bookkeeping that will otherwise be "fixed" as a regression |
| **F-3** | `DataTable.tsx`'s bulk bar carries `ps-3.5` (14px) and `pe-1.5` (6px). §6.3 **D15**: an off-grid literal is a defect on its own terms. Not changed here — it is the shell owner's file and it is unrelated to the flagged block. | shell owner | nothing |
