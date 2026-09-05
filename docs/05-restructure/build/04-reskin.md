# 04 — The Navattic re-skin

**Implements:** `DECISIONS.md` **D7** · `design/03-visual-language.md` §9 fix list items
**1, 2, 3 (part), 4, 5, 10 (audit clause), 14 (token), 15 (token), 16 (token), 19**
**Corrected mid-build by:** `docs/02-verification/people-match.md` — Navattic serves its own
stylesheet, and where a declared value disagrees with a sampled one, **the declared value wins.**
**Owner:** frontend-engineer (shell + page frame + state components).
**Not in this document:** the table, the screens, `components.json`. See §6.

---

## 1. The one thing to read

`src/styles/globals.css` is the whole re-skin. Everything else in this document is a
consequence of it or a comment correcting a derivation that is now void.

**Three things changed that are bigger than a hex:**

1. **The primary action is near-black, not blue.** `--primary` maps to `--ev-ink` `#171a21`.
   **R3 is dead and D-1 is void.** `--ev-blue` `#2b6ef0` is confirmed exactly but measures
   4.574 : 1 on white and **4.294 on the tint**, so it is not a compliant fill-with-white-text
   on any tinted ground. Blue keeps the focus ring, the chart series, selection, and a link on
   white (through `--ev-blue-dk`). A blue primary anywhere is now a defect.
2. **The typeface is Inter, not Geist.** Self-hosted, latin + latin-ext only, `font-display:
   swap`. Body is **14px/20**, H1 **22px/28**. The Arabic Naskh half of the stack is untouched.
3. **There is one hairline and it is very light** — `#f0f2f4`, and one firm boundary for
   controls and pinned edges, `#dde0e4`. The value in the tree before this (`#e5e8ed`) was the
   reference's `gray-200`, which they never use for a rule. **That single number is why our
   tables read as a grid and theirs reads as a list.**

---

## 2. The correction the brief asked for, and one it did not

**Asked for, and applied.** `--ev-bg: #f7f8fa` is gone. **There is no grey canvas.** The
content region is `#ffffff` edge to edge. The tonal direction does **not** invert: the nav is
still one step *darker* than the content, exactly as §2.1 says. Only the *pill* inverts, and
it costs almost nothing — grey-on-near-white measures **1.162 : 1** against Shopify's 1.192.

**Not asked for, and it corrects D7 §1.1 itself.** The brief and the spec both give a
three-step ladder — rail `#F5F7F9`, nav `#F8FAFB`, content `#FFFFFF`. The reference's own
stylesheet has **two** surfaces, not three:

```
--color-bg-default : #ffffff   the content region
--color-bg-muted   : #f6f8f9   the icon rail AND the nav column AND the filter strip
                               AND the table header strip — one token, four jobs
```

`#f5f7f9` and `#f8fafb` are the same declared token read through a 3.5× area downscale, two
units apart in opposite directions. `--ev-bg2` and `--ev-bg-nav` therefore hold the **same
value** today. Both names are kept so the strip and the nav can be separated again in one
file; the comment says loudly not to "fix" one of them darker.

**The nav seams are back on both columns**, reversing D6's second bullet: a border is present
at destination x = 28 **and** x = 142 in every sidebar frame, and at a 1.054 : 1 tonal step it
has to be. Five units of luminance is not a boundary.

---

## 3. What changed, file by file

### 3.1 `src/styles/globals.css` — item 1

Every `--ev-*` value replaced. **Four stale comment blocks rewritten**, as required:
`--ev-bg-nav` (V3's derivation is void — it solved for a nav *darker* than the canvas, and the
binding constraint no longer exists), `--ev-nav-chip` (the pill inverted), `--ev-hairline2`
(its meaning flipped to the *lighter*, in-table rule), and all three `--ev-shadow-*`.
A fifth, `--ev-hairline`, was rewritten too because its value moved two ramp steps.

| Token | Was (in tree) | Now | Source |
|---|---|---|---|
| `--ev-bg` | `#f7f8fa` | `#ffffff` | `[css]` `bg-default` |
| `--ev-surface` | `#ffffff` | `#ffffff` | identical to `--ev-bg` on purpose — D-11 |
| `--ev-bg2` | `#f4f6f8` | `#f6f8f9` | `[css]` `gray-50 / bg-muted` |
| `--ev-bg-nav` | `#fbfcfd` | `#f6f8f9` | same token — see §2 |
| `--ev-nav-hover` | `#f2f4f7` | `#f0f2f4` | `[css]` `gray-100`, the declared midpoint |
| `--ev-nav-chip` | `#e8eaee` | `#e5e7eb` | `[css]` `gray-200`; sampled `#e6e8eb`, 0.3/255 |
| `--ev-hairline` | `#e5e8ed` | `#f0f2f4` | `[css]` `border-muted`; integration agrees **exactly** |
| **`--ev-hairline-control`** | *new* | `#dde0e4` | `[css]` `border-default` — see §3.2 |
| `--ev-hairline2` | `#d8dce3` | `#f0f2f4` | same token as `--ev-hairline`; see §4 F-2 |
| `--ev-hairline-strong` | `#8a8f99` | `#828b99` | R19, re-derived; 3.231 on the worst ground |
| `--ev-ink` | `#24242f` | `#171a21` | hue 240 → 222; the old value was the one violet token |
| `--ev-text-2` | `#5f646e` | `#6b7280` | `[css]` `text-subtle`; 4.834 / 4.538 |
| `--ev-text-3` | `#9aa0aa` | `#9ca3b0` | `[css]` `text-muted` — **value only, never the role** |
| `--ev-blue` | `#2b6ef0` | `#2b6ef0` | confirmed; theirs is `#286ef0`, ΔRGB (3,0,0) |
| `--ev-blue-lt` / `-dk` | `#eaf1fe` / `#1d53c4` | `#eaf0fe` / `#1b51c4` | D7 §1.3 |
| `--ev-green` / `-lt` | `#27500a` / `#eaf3de` | `#15653c` / `#e7f6ec` | out of Shopify's olive |
| `--ev-amber` | `#e8a33d` | `#b45309` | **closes a 1.88 : 1 defect** — now 4.623 on its fill |
| `--ev-amber-lt` / `-dk` | `#faeeda` / `#633806` | `#fff4e6` / `#7a3e12` | M / D |
| `--ev-red` / `-lt` | `#a32d2d` / `#fcebeb` | `#b42318` / `#fef0ee` | R5a's four uses |
| `--ev-topbar-h` | 48 | **52** | M |
| `--ev-navrow-h` | 28 | **32** | M — pill height and pitch coincide, so gap 0 |
| `--ev-row-h` | 32 | **40** | single-line rows |
| `--ev-row-h-media` | 44 | **64** | two-line / avatar rows — see §4 F-4 |
| **`--ev-row-h-head`** | *new* | 32 | declared, not smuggled (D15) |
| `--ev-control-h` / `-lg` | 28 / 36 | **32 / 40** | M / D |
| **`--ev-page-pad`** | *new* | 32 | D-2′ |
| `--ev-drawer-w` | 406 | **480** | R13's named-figure carve-out spent here |
| `--ev-radius-card` | 12 | **8** | 12 is falsified, not re-preferred |
| `--ev-shadow-1` | `0 1px 2px / .05` | **transparent** | measured zero, twice — see §3.3 |
| `--ev-shadow-2` | `0 2px 8px -2px` | `0 8px 24px -2px` | the old tier reached a third as far |
| `--ev-shadow-3` | `0 8px 24px -8px` | `0 20px 48px -12px` | **unevidenced** — no modal in 15 frames |

Slot remaps: `--primary: var(--ev-ink)` · `--input: var(--ev-hairline-control)` ·
**new** `--border-control` → `--color-border-control`. `--ring` is unchanged and still passes
(4.574 white / 4.294 tint / 4.369 nav / 3.807 on `--primary`).

Type: `--text-sm` 13 → **14/20**, `--text-base` 15 → **16/24**, **`--text-xl` added at 22/28**
(the page title; it redefines an existing Tailwind name and adds no `--ev-*` token).
Arabic floors: eight dimensions now, not seven (`--ev-row-h-head` joins), plus
`--text-xl: 24/32`. `--ev-page-pad` deliberately does **not** vary by language — a gutter is
not a line box.

New utilities exposed: `h-row-head`, `p-page-pad`, `border-border-control`.

### 3.2 The two rule weights, verified rather than assumed

The orchestrator asked for this specifically. They are distinguishable:

| | Value | Mean | On white | Role |
|---|---|---|---|---|
| `--ev-hairline` | `#f0f2f4` | 242.0 | 1.122 : 1 | row rules, column rules, card edge, both nav seams, top-bar rule, drawer edge |
| `--ev-hairline-control` | `#dde0e4` | 224.3 | 1.324 : 1 | **functional boundaries** — a control's outline, a frozen/pinned column's edge |
| the two against each other | | | **1.180 : 1** | larger than the active nav pill's own 1.162 against its ground |

`--ev-hairline-control` is the one token added on my own judgement, and it is added because
`--ev-hairline` moved: an input bounded by a 1.122 : 1 stroke on white has no boundary at all.
The reference splits at exactly this point and declares the value. **A pinned-column edge
cannot be a plain utility** — `table.tsx` draws the internal rules with a specificity that
beats one, silently — so an inline style is correct there, as long as it reads
`var(--ev-hairline-control)` and never a literal.

### 3.3 No shadow on the card

`--ev-shadow-1` is now `0 0 0 0 rgb(16 24 40 / 0)`. D7 §1.5 argued against a value of `none`
("a tier whose value is `none` invites someone to delete the tier") and specified 0.04 alpha
instead. **The reasoning is kept and the value is not:** the tier keeps its name, its slot in
R-3's ladder and its `shadow-1` utility, and paints nothing. The audit profiled the
reference's card directly — the signal collapses to 0.00 within one pixel of the stroke on
both sides. Ours spilled 3.0 deficit. Separation is bought with two tinted strips and one very
light rule; a shadow **on top of** a tint gets neither.

### 3.4 `src/shell/*` — items 2, 3 (part), 4

- **`AppLayout.tsx`** — comment only. The §1.1 clause claiming "the canvas is grey, not white,
  so canvas and card are finally distinct" was the D1 argument and it is now wrong twice; it is
  replaced by D-11's, and the 1280 arithmetic corrected to 80 + 224 = 304 / 976.
- **`ModuleRail.tsx`** — `border-e border-border` restored. `text-primary` removed from the
  active glyph (it existed to make the glyph *blue*; `--primary` is near-black now, so the
  class had become a no-op that read as a third carrier). The vertical-register comment
  corrected 48 → 52. The nav-count decision recorded at its call site.
- **`PageNav.tsx`** — `border-e border-border` restored. Column heading `text-sm` → `text-base`
  (16px; the audit solves the reference's nav title at ~15.5 against our 13). Row geometry
  needed no class change: `h-navrow`, gap 0 and `rounded-lg` already resolve to 32 / 0 / 8.
- **`TopBar.tsx` / `SaveBar.tsx`** — comment only. Both already read `h-topbar`,
  `bg-background` and `border-b border-border`, so 52 / white / hairline followed the token.
  R2's "brand-blue primary" wording corrected in `SaveBar`.
- **`ShellLayer.tsx`** — comment only; 406 → 480 and the tier-2 note. `sheet.tsx` already uses
  `w-drawer`, `shadow-2` and the leading hairline, so the drawer moved with the token.

### 3.5 `src/components/*` — items 5, 10, 14/15/16 by token

- **`PageShell.tsx`** — `PAGE_BLOCK` is `w-full p-page-pad` (32px, D-2′). One constant, every
  page shape, so no shape can drift from another. The 1440-vs-1280 question and why it is not
  a `wide:` override are recorded at the constant.
- **`PageHeader.tsx`** — `<h1>` `text-lg` → **`text-xl`** (22/600). `meta` `text-xs` →
  `text-sm`. Header block `pb-4` → `pb-5` (title → toolbar is 20px; the old 16 was set against
  a 17px title and read as a collision under a 22px one).
- **`EmptyState.tsx`** — the illustration audit. It used `fill-primary` for its accent bar and
  `fill-border` for the quiet ones; `--primary` moved to near-black and `--border` moved to
  1.12 : 1, so the same classes would have painted a black bar and two invisible ones. Now
  `fill-info-foreground` on the pale-blue row (6.089 on that fill) and `fill-muted-foreground`
  on the two resting rows. The wrapper is `text-muted-foreground`, not `text-primary`.
- **`LoadingSkeleton.tsx`** — the table skeleton's header row is `h-row-head` on `bg-muted`
  (the real header is a tinted 32px strip under D7; a skeleton without the tint moves the eye
  when the tint arrives), and its body rows take a new `media` flag → `h-row-media`. **This is
  coupled to the identity-cell decision in §4 F-4** and the comment says so.
- **`Banner.tsx` · `ErrorState.tsx` · `StatusBadge.tsx` · `Money.tsx`** — no change needed.
  Every value in them already resolves through a slot, so they re-skinned with the token file.
  Their remaining geometry work lives in `ui/alert.tsx` and `ui/badge.tsx` — see §6.

---

## 4. Findings answered, and one I could not

**F-4 — the row-pitch disagreement was not a disagreement, and I made the call.**
The language spec derived 40, the audit measured 62, we rendered 41. Both figures are right
for different content: **62 is the reference's two-line identity row** (avatar + name +
qualifying line); **40 is a single-line row.** They are the two tokens, not a conflict. Eyvar
takes **the two-line identity cell with the avatar and the tall row**, because the owner asked
for "identically looking, in everything" and the halves do not separate — a 62px row holding
one line is just a loose table, and a 40px row cannot hold two lines.

One correction to the reference on the way through: **62 is off the 4px grid** and D15 records
off-grid literals as the defect, so `--ev-row-h-media` is **64** — a 32px avatar + 16/16
padding-block, which is the reference's own geometry read on-grid and 2px inside the audit's
own ±3% band on that figure. Arabic 68.

> **The other half is not mine to build.** `columns.ts` / `DataTable.tsx` must give the
> identity column its 32px avatar circle and its second line, and the People table must render
> `h-row-media`, not `h-row`. **Until that lands, the token is ahead of the cell** and the
> loading skeleton is 24px per row taller than the table it replaces. That is one flag
> (`media` on `RowBars`) if the call is reversed.

**F-2 — the outer card border, checked as asked.** The earlier "1.7× too dark" reading was of
the outer border, and the internal rules had since shipped at `#eceef2`, 4/255 out. Both are
now `#f0f2f4`, which is *exact* on the internal rule (integration L 242.1 vs the declared
token's 242.1) and inside the audit's own band on the card border (L ≈ 238–242). **The
reference declares one `border-muted` and spends it on both**, and the audit records that it
has *not* proven the vertical rule is a different token. So the two-level structure D7 inferred
from the downscale is not reinstated. The firm weight the signal needs is
`--ev-hairline-control`, and §3.2 shows it is distinguishable.

**F-3 — not mine, and I did not work around it.** All four People views overflow at 1280.
`--ev-page-pad` stays at 32. D-2′ is already a sanctioned departure from a measured 68, its
arithmetic is written at the constant, and shrinking it further to buy a column is exactly what
D-2′ tells the next engineer not to do. **The remaining lever is `defaultHidden`, and that is a
product-designer judgement about what an operator needs on first sight.**

**Nav count badges — the choice, stated.** The reference has **no count badge anywhere**, in
the rail or the column, and ours were the loudest colour on the page. They are §8.4 *function*
and D7 explicitly does not touch §8, so they are **not deleted**. What changed is the plate:
`--ev-nav-chip` is the reference's own `gray-200` `#e5e7eb`, 1.162 : 1 on the nav, with ink
digits at 14.063 : 1. It now sits **under** the white content region rather than over it. The
one exception R7 still licenses is a *breached* sub-tab row, rarely — that is V6's rule and
`navBadges.ts` owns it.

---

## 5. Verification — the real output

```
npx tsc -b --noEmit      clean, no output
npx vite build           ✓ built in 4.86s
npx vitest run           765 tests, 741 passed, 24 failed  (see below)
```

**The 24 failures, separated as asked.**

| File | Count | Mine? |
|---|---|---|
| `src/shell/qa.keyboard.test.tsx` | 11 | no — pre-existing, awaiting the QA re-cut |
| `src/shell/qa.shell.test.tsx` | 8 | no — same |
| `src/shell/qa.copy.test.tsx` | 3 | no — same |
| **`src/shell/nav.test.tsx`** | **2** | **no, but they are new-since-HEAD and they are stale against D7** |

The two in `nav.test.tsx` are both named *"expresses ACTIVE as a white pill alone — no marker,
no border (§2.3)"* and both assert `bg-card` on the active tile / row. The pill is
**`bg-nav-chip`** — grey — which is D7 §3.3 and §4.1, and which `03-visual-language.md` §10
records explicitly: *"V2 — the plain white pill — **SUPERSEDED**. The pill is grey now."* The
flip was already in the tree before this task (the owner's hand-edit); this build kept it and
gave it the declared value. **These two need re-cutting to the grey pill, not reverting.**
They are the only test movement attributable to this work.

**`dist/` — greped, not assumed.**

```
@media(min-width:1344px)          1     ← exactly one, as required
@media(hover:hover)               5     ← not a min-width; the check counts min-width only
@media(prefers-reduced-motion)    2
@media(forced-colors:active)      1
Tailwind palette classes          0
physical direction utilities      0
escaped arbitrary-value classes   0
rgb(0 0 0 …)                      0
geist font files                  0     ← the package is uninstalled, not merely unimported
```

Every hex surviving into `dist` is a token value or a Recharts *selector* being overridden
(`#3182bd`, `#808080`). None of the retired values (`#e5e8ed`, `#e1e4ea`, `#eceef2`, `#24242f`,
`#5f646e`, `#9aa0aa`) appears anywhere.

**Live probe, 4 captures.** `scratch/reskin-shots.mjs`, against `localhost:5199`:

```
body font   "Inter Variable", "Noto Naskh Arabic Variable", …
body size   14px
h1          22px  (24px under lang="ar" — the new floor fires)
main        transparent over #ffffff
rail        rgb(246,248,249)   border-inline-end  rgb(240,242,244) 1px
sub-tab col rgb(246,248,249)   border-inline-end  1px
top bar     52px  rgb(255,255,255)
page errors none, on all four
```

**Captures** — `scratch/shots/`:

| File | |
|---|---|
| `reskin-people-1440.png` | the densest screen, 1440 |
| `reskin-people-1280.png` | the floor |
| `reskin-overview-1440.png` | a non-table page |
| `reskin-rtl-1280.png` | `dir="rtl" lang="ar"` — rail and column on the inline-end side, seams intact, numeric columns unflipped, Arabic type floors applied |

---

## 6. Skipped, and why

**Fix-list items 6 and 7 — deliberately not done.** Vertical column hairlines and reverting
`01-people.md`'s `[&_td]:py-1` bridge live in `src/components/ui/table.tsx` /
`DataTable.tsx`, which another frontend-engineer holds. Both are now unblocked by the token
file: `--ev-hairline2` is the light in-table rule, and at a 40px single-line row the Q2
conflict (24 target + 8 padding + 20 badge) dissolves — 24 + 8 + 8 = 40 exactly.

**Also outside my files, relayed rather than done:**

| Item | File | Note |
|---|---|---|
| 8 · card r8, `--card-spacing: 16px`, card off index pages | `ui/card.tsx`, `screens/*` | radius already follows the token |
| 9 · re-measure `scrollWidth === clientWidth` at 1280 | `table/columns.ts` | this is F-3; **do not shrink the gutter** |
| 10 · button geometry and the blue audit | `ui/button.tsx` | `bg-primary` is near-black by token; the geometry is theirs |
| 11 · the filter-chip strip | `table/FilterChipRow.tsx` | **and the audit corrects D7 here:** the strip is a **standalone rounded bar above the card**, 48px, `bg-muted`, r8, **no border**, with a ~13px white gap below it — *not* an in-card full-bleed band |
| 12 · badge r4 / 12px | `ui/badge.tsx`, `StatusBadge.tsx` | tones moved by token; `StatusBadge` needed no change |
| 13 · banner r8, 12px padding, `color-mix` border | `ui/alert.tsx` | `Banner.tsx` composes it and carries no geometry |
| 14 · avatar 32px **circle** | `ui/avatar.tsx` | R15's avatar clause is dead; coupled to F-4 |
| 17 · pagination footer 48px | `ui/pagination.tsx`, `DataTable.tsx` | the audit adds: it is **off-screen today** at 820px — cap the body height |
| 18 · stat tiles | `screens/*` | `--chart-*` already resolve; the values moved under them |

**Item 3's section heading is blocked, not skipped.** D7 §4.1 specifies it fully — 12px
`--ev-text-2`, sentence case, its own 32px row, 24px above the group, 0 below, not focusable,
`role="presentation"` with the group labelled by it — but it does not say **which sub-tabs form
a group or what each group is called**, and neither does the data. `SubTabRoute`
(`src/data/types/navigation.ts:115`) is flat and `routeTable.ts` carries no grouping; there are
no `nav.section.*` copy keys. Building it would have meant hard-coding a partition of 34
sub-tabs plus five to eight English labels inside `PageNav.tsx` — a design decision and a copy
decision taken in the wrong place. It needs:

- **mock-data-engineer** — `SubTabRoute.sectionKey: string | null`, valued on all 34 rows.
  `null` means "no heading above me", which makes `Overview` fall out for free.
- **product-designer** — the group labels and their keys, **sentence case, never uppercase**
  (§6.3 D18, and the reference agrees). W3 of the match report adds the ink constraint: the
  reference's own heading grey is ~2.4 : 1 and does not transfer; ours is `--ev-text-2`.

Once both land it is ~15 lines in `PageNav.tsx` and nothing else moves. The blocker is written
into that file's header so the next reader finds it.

---

## 7. Open, for someone else to close

1. **The two `nav.test.tsx` assertions** encode V2's white pill. → qa-engineer. §5.
2. **`--ev-shadow-3` is unevidenced** — there is no modal in the 15 frames and it is derived by
   applying R-3's own tier-2→tier-3 ratio. The first modal built against it needs a human eye.
3. **`--ev-text-3` still fails AA** at 2.536 : 1, and the reference is no better. It survives
   only because deleting a name is a rename. It should be retired deliberately, not quietly.
4. **`--ev-page-pad` at 1440** — one value serves both widths, so 1440 gets the 1280 answer and
   reads tighter than the reference's 68. The clean fix is `wide:`, but redefining a token
   inside a `@media` block risks a second `@media (min-width:)` in `dist`, which the
   one-breakpoint check counts. Deliberately not done; it is a ticket with a build re-run
   attached, not a local decision. → product-owner.
5. **`--ev-rail-w` stays 80** against a measured 52. The reference's rail is **icon-only**;
   Eyvar's carries a label under every glyph by D-4, so the figure does not transfer. If the
   owner wants the 28px back, that is a D-4 reversal, not a token edit.
6. **The reference's top bar is nearly empty and ours is the busiest strip on the page** —
   theirs holds a breadcrumb and one item; ours holds a 400px centred search, two chips, a bell
   and an avatar. That is §4's slot list and §5's global search, i.e. function, and D7 does not
   touch §8. Recorded as a named divergence so it is not mistaken for drift. → product-owner.
7. **`font-display: swap`, not the reference's `block`.** Their `block` closes the fallback
   window by hiding text for up to 3s; §7 has no rule licensing invisible text and both other
   faces in the file use `swap`. The cost is a one-frame fallback to `Segoe UI`. Recorded, not
   hidden. → product-designer if the flash is unacceptable.
