> **Archived round record.** Rulings here stay binding unless a later entry in
> `docs/05-restructure/DECISIONS.md` or `docs/RULINGS.md` supersedes them. Check
> `docs/RULINGS.md` before citing one.

# 00 — Four decisions raised against the shell spec

> **Decision pass.** Owner: product-designer.
> Consumers: **frontend-engineer** (0.7, the shell build — **R-3 unblocks it**),
> **utilities-engineer** (0.5, `src/styles/globals.css`), **mock-data-engineer** (0.6, `nav.badgeTone`).
>
> **Answers:** **R-3** (the shadow scale) · **R-1** (shadcn `empty`) · **F-9** (six vs seven) ·
> **Q12** (badge-tone roll-up).
> **Parent spec:** `docs/05-restructure/design/00-shell.md` — amended in the same pass (§7 below lists
> every edit).
> **Rulings applied:** R7 · R8 · R13 · R15 · R19 (as precedent only) · sanctioned deviation **D-2**.
>
> > pixel with PIL, not eyeballed:
>
> **No `DESIGN.md` amendment is needed for any of the four.** §6 explains why, per decision. The
> partials are untouched and no rebuild is required by this pass.

---

## 1. R-3 — the shadow scale

### 1.1 The values. Three tokens, and only three.

```css
/* --- Elevation. §1.4's border-vs-shadow principle, Eyvar's numbers.
   Three tiers, closed set. A fourth needs a §6.2 entry, exactly the way
   §1.4's radius rule works. Derivation + reference evidence:
   docs/05-restructure/design/00-decisions-r3.md §1.
   Offset-x is 0 in all three — elevation does not mirror (§9.5). ------- */

--ev-shadow-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);

--ev-shadow-2:
  0 2px 8px -2px rgb(0 0 0 / 0.12),
  0 1px 2px 0 rgb(0 0 0 / 0.06);

--ev-shadow-3:
  0 8px 24px -8px rgb(0 0 0 / 0.24),
  0 2px 6px -2px rgb(0 0 0 / 0.12);
```

Nothing else in the product sets a `box-shadow` except the focus ring (§7.2) and the 3 px
leading-edge marker (`--ev-marker`, R5a / §2.3). Those two are **not** elevation and must never be
written in terms of these tokens. See §1.7 for the collision between them.

### 1.2 Which surface takes which

| Token | Surfaces | Why |
|---|---|---|
| **none** | workspace rail · sub-tab column · top bar · save bar · shell banner strip · nested blocks inside a card · table rows · page canvas · the scrim itself | Frame, not layer. §1.4: *border signals "part of the page."* The save bar is explicitly shadowless in the reference, and it replaces the top bar **in place at identical height** (00-shell §4.1) — a shadow appearing on save would be a visible layout event where AC-51 requires none |
| **`--ev-shadow-1`** | card (`--ev-radius-card`) · metric tile · chart card · form card · the sticky table header **once the body has scrolled under it** · the bulk-action bar's host card | Attached furniture. Border does the work; the shadow is a 1 px contact seam so a white card does not hard-band against `--ev-bg`. §1.4: *"MUST give persistent surfaces a border and **at most a hairline shadow**"*, and *"MUST NOT give a card a large drop shadow — a card that appears to float is a bug"* |
| **`--ev-shadow-2`** | `popover` · `dropdown-menu` · `tooltip` · `command` / combobox list · sort, filter and date-range popovers · global search popover (480 px) · bell popover (360 px) · sub-tab popover (224 px) · toast · bulk-action bar · **the three shell drawers (`--ev-drawer-w` 406 px)** | Detached, near the page, dismissible, **no scrim**. Everything here sits over content the operator is still reading, so the shadow must resolve inside ~8 px. §1.4: *"MUST give transient surfaces (popovers, modals, drawers, toasts, floating action bars) a shadow"* |
| **`--ev-shadow-3`** | `dialog` and `alert-dialog` at **440 / 560 / 800 px** — and nothing else | The only scrimmed surfaces in the product. §5.0 forbids a modal nested in a drawer, so tier 3 never composites over tier 2 |

**The shell drawers get `--ev-shadow-2` *plus* the 1 px `--ev-hairline` on their inline-start edge.**
Both, not either. Justified in §1.5 — the reference does **not** support this and I say so there.

The auth card is outside this spec's scope. When it is designed its default is `--ev-shadow-2`
(the inherited capture shows a card floating on a backdrop, with no canvas
relationship to anchor a border); that spec may argue otherwise.

### 1.3 The measurements

Every number below is a direct pixel read. Canvas measures **241** (`#F1F1F1`), card white **255**,
and under the modal the scrim plateaus at **120–121**. Alpha is recovered as `1 − sample / base`.
Distances are converted at **1 image px ≈ 1.97 CSS px** (768 px wide from a ~1512 px capture).

| Surface | Frame | Peak α | Downward reach | Lateral reach |
|---|---|---:|---:|---:|
| Card on canvas | the inherited capture | **0.04** | ~2 px | **0** |
| Popover | the inherited capture | **0.07** | ~8 px | ~4 px |
| Bulk-action bar (on white) | the inherited capture | **0.075** | ~8 px | — |
| Drawer, no scrim | the inherited capture | **0.00** | — | **0** |
| Modal (over scrim) | the inherited capture | **0.15** | ~30 px | ~5 px |

Two profiles worth printing, because they are what the tiers are built from.

**Popover, bottom edge, x = 710:** `222` (border) → `238, 247, 252, 254, 255`. Recovered from white:
peak α **0.067** one pixel below the border, at zero by ~8 CSS px.
**Popover, top edge, x = 710:** `222` (border) → `255` immediately. **Nothing above the box at all** —
the shadow is entirely downward-offset.

**Modal, bottom edge, x = 300**, scrim base 120: `86` (border) → `102, 102, 104, 104, 104, 106, 108,
112, 114, 116, 118, 118, 118, 119, 119, 119, 120`. Peak α **0.15**, a short plateau, then a long
decay reaching the noise floor at ~30 CSS px.
**Modal, left edge, y = 240:** base `121` → `111` at one pixel out → back to `121` two pixels out.
Lateral α **0.083**, reach ~5 CSS px. Strongly asymmetric: a large downward offset with negative
spread suppressing the sides.

**Every sample is achromatic — R = G = B in all five frames, at every pixel.** There is no hue in
these shadows. Eyvar's shadows are therefore `rgb(0 0 0 / α)`, not tinted toward `--ev-ink`
(`#1A1A18`, warm) or toward `--ev-bg` (`#EEF0F3`, cool). This matters: the Eyvar palette is
internally split — a warm hairline `#E4E2DA` on a cool canvas `#EEF0F3` — and a tinted shadow would
have to pick a side. Pure black composites neutrally over both. Recorded as a deliberate choice, not
an omission.

### 1.4 What I cannot read, stated plainly

The brief asked for honesty about a compressed 768 px WebP. Five limits, all of which shaped the
answer:

1. **Sub-4 px blur is unreadable.** One image pixel ≈ 2 CSS px, so a 3 px blur occupies 1.5 image
   pixels and is indistinguishable from compression ringing. I saw the ringing directly: the sort
   popover reads `245, 235, 255` across x = 671–673 — that jump back to pure white *inside* the
   border is a WebP artifact, not a design decision. **`--ev-shadow-1`'s 1 px offset and 2 px blur
   are below my measurement floor.** They are a design choice consistent with a 0.04 peak and a
   ~2 px reach, not a recovered value.
2. **I cannot separate blur from spread.** `0 4px 8px 0` and `0 8px 16px -4px` produce nearly
   identical profiles at this resolution. The two-layer decompositions in §1.1 are a **model that
   reproduces the measured falloff**, not a recovery of any declaration. I verified the
   model numerically — a Gaussian approximation of `--ev-shadow-2` predicts α 0.078 at the bottom
   edge against 0.07 measured, and 0.038 laterally against ~0.03; `--ev-shadow-3` predicts 0.156
   against 0.15 measured, and 0.074 laterally against 0.083 — but a different two-layer pair would
   fit almost as well.
3. **The modal's shadow cannot be read independently of its scrim.** Every modal number is a ratio
   against the scrim's own 120/255 plateau, so one level of quantisation is ~0.8 % of alpha.
4. **α below ~0.015 is invisible** (4 levels of 255). "Reach" in §1.3 means *reach above the noise
   floor*, never true zero.
5. **The no-scrim drawer shows no measurable shadow, contradicting `DESIGN.md` §1.4's own table.**
   §1.4 records *"hairline left border + soft shadow"*. Three scanlines at y = 300, 330 and 430 all
   read `241, 241, 241, 242, 235, 242, 255` — canvas, canvas, canvas, hairline, white. There is no
   gradient. I report this rather than smooth it over; §1.5 explains what I did about it.

**No pixel figure above is cited as binding (R13).** What I took from the reference is the
*relationship* — card ≪ popover < modal, downward-asymmetric, achromatic. The absolute numbers in
§1.1 are Eyvar's own.

### 1.5 The drawer, where I depart from the pixels

The reference drawer has a hairline and no shadow. I am shipping a hairline **and** `--ev-shadow-2`.
Three reasons, and the third is the one that decides it:

1. §1.4's own **rule** — as opposed to its observation table — names drawers in a MUST: *"MUST give
   transient surfaces (popovers, modals, drawers, toasts, floating action bars) a shadow."* The rule
   and the observation disagree inside one section of `DESIGN.md`.
2. The inherited guide panel is a **companion** to the page it opened from — semi-persistent, part of the
   home surface. Eyvar's three shell layers are **dismissible overlays reachable from anywhere**
   (`openProfile` has 100 call sites) that close on `Escape` and vanish from the URL. They are
   transient in a way the guide panel is not.
3. **Eyvar's drawer can land on white.** The inherited guide panel abuts a grey canvas at `241`, where
   a `235` hairline is a legible step. Eyvar's drawer opens over the **monitoring shell** and over
   full-bleed content that reaches the viewport edge with no card boundary to butt against; a
   hairline alone at `#E4E2DA` on `#FFFFFF` is a 1.1:1 step. The shadow is what keeps the boundary
   readable in the case the reference never had to handle.

The hairline stays as well, because at 406 px on a 1280 px viewport the drawer's inline-start edge is
the operator's only cue about how much page is left, and an 8 px gradient is a softer edge than the
density warrants (D-2). Belt and hairline.

### 1.6 Why these numbers and not the inherited ones — D-2 applied

**Blur and offset compress. Alpha does not.** That is the whole rule, and it is worth stating because
it is the non-obvious half.

- **Dimensions compress.** The inherited modal shadow blooms ~30 CSS px under a product with ~40 px rows
  and a 20 px page title. Eyvar runs 32 px rows and a 17 px page title (D-2). A shadow whose bloom is
  about one table row tall reads as elevation; one that is taller than a card header reads as a
  smudge. `--ev-shadow-3` reaches ~20 px — roughly two thirds of that, close to the density
  ratio (32/40, 13 px body against 14). This is a judgement calibrated to D-2, not a derivation, and
  I am naming it as one.
- **Alpha does not compress.** Alpha is a contrast signal, not a dimension, and D-2 licences smaller
  *values on the grid*, not weaker contrast. At higher density surfaces sit closer together, so they
  need **more** edge definition per pixel, not less. Scaling the alphas down would have produced the
  exact failure the brief warned about from the other direction: a scale so faint it reads as dirt.
  `--ev-shadow-2` and `--ev-shadow-3` carry the measured peaks — 0.07 and 0.15 — reproduced by
  the layer pairs, unchanged.

**On the 4 px grid.** D-2 licences smaller, never off-grid, and D15 records off-grid literals as a
defect. Both are about **layout dimensions** — a blur radius is an optical value, not a layout
dimension, and no element's position or size depends on it. The values are nonetheless kept on the
2 px grid (offsets 1/2/8, blurs 2/8/24, spreads −2/−8) with tier steps of roughly ×4, so the set
composes and nobody has to guess what a fourth tier would be. **There is no fourth tier.**

**Two layers per tier, not one.** A single low-alpha shadow at this density either reads as nothing
or as a grey halo. The tight contact layer draws the edge; the wide layer carries the elevation.
This is also what the measurements demand — a modal with 30 px of downward reach and only 5 px of
lateral reach cannot be one shadow.

### 1.7 Implementation notes the frontend engineer needs

- **`box-shadow` is a single property and the focus ring already uses it.** §7.2's ring is
  `outline: 2px solid var(--ev-blue); outline-offset: 2px; box-shadow: 0 0 0 2px #FFFFFF`. Any
  element that can hold **both** an elevation and focus — a focusable card, the bulk-action bar's
  buttons' host, a drawer that takes focus on open — must either compose both into one comma-separated
  `box-shadow` list **or** move the elevation to a wrapper element. Silently dropping the white
  separator re-opens D20. This is the single easiest way to get the shadow scale wrong.
- **Nothing mirrors.** All three tokens have `offset-x: 0`, deliberately, so elevation is
  direction-invariant and no RTL branch is needed (§9.5). Contrast `--ev-marker`'s
  `inset 3px 0 0`, which is a physical left inset with no logical form and **does** need the
  `inset-inline-start` pseudo-element (§9, `rtl.md`).
- **No dark theme exists.** If one is ever added these values must be re-derived from scratch —
  a black shadow on a dark surface is invisible, and the elevation cue has to move to a lighter
  border. Do not scale them.
- **The `sonner` restyle keeps the shadow.** 00-shell §12 already deletes the action slot and
  relocates the toast; elevation is `--ev-shadow-2`, unchanged from what `sonner` ships in spirit
  though its literal `rgb(0 0 0 /.1)` must go.
- **Delete every literal.** After this lands, `grep -rn "box-shadow" src/` should return only
  `globals.css`, the focus-ring utility, and the `--ev-marker` pseudo-element. Any `shadow-sm` /
  `shadow-md` / `shadow-lg` Tailwind class is a `/token-audit` failure.

---

## 2. R-1 — shadcn `empty`: **upheld. Do not add. `components.json` stays frozen.**

0.4 read §5.3 B-02 correctly and I am confirming it, not overruling it.

**What `empty` would give us.** It is a composition of `div`s — `Empty`, `EmptyHeader`, `EmptyMedia`,
`EmptyTitle`, `EmptyDescription`, `EmptyContent` — carrying Tailwind class strings and a
`variant="icon" | "default"` on the media slot. No logic, no state, no accessibility wiring, no
behaviour. Every class string it ships would be stripped on arrival under 00-shell §12 (*"every
shadcn primitive arrives non-compliant"*). What is left after the restyle is the slot names.

**Why the slot names are the problem, not the benefit.** R8's whole content is that there are **two**
empties and choosing wrongly is a defect (`AC-37`, `AC-38`). 00-shell §11.1 therefore makes `kind`
the load-bearing prop with exactly two values, `first-run | no-match`. A slotted API has no `kind`.
Anyone can drop `EmptyMedia` into a filtered-to-zero state and nothing in the type system objects —
which is precisely the mistake R8 exists to prevent. **A two-value `kind` prop makes the wrong state
unrepresentable; a slot API makes it one import away.** That is the answer to "what does `empty` give
you that a component honouring both kinds does not": it gives us a cheaper way to violate R8.

**And neither of our two shapes is its shape.**

- `no-match` is **one grey sentence**, no heading, no media. Where it lands in a table it is a
  `<td colspan>` inside the table body, aligned to the content — not a centred flex column with a
  media slot above a title. Using `Empty` here means suppressing every slot it has.
- `first-run` puts the ~160 px illustration, heading, body and action row **inside the index card**,
  and the `Learn more about {resource}.` line **outside** it (00-shell §11.1,
  the inherited capture. That is a two-region layout `Empty` does not model.

**Cost of building it.** `EmptyState` is a switch on two values over about forty lines. Freezing
`components.json` is worth more than forty lines, and the frozen list is what stops the inventory
drifting for the next thirty-four screens.

**What we lose.** `EmptyMedia variant="icon"`'s pre-styled 40 px rounded icon container. R8 wants
either a ~160 px illustration or nothing, so we lose nothing we would use.

**Do not unfreeze.**

---

## 3. F-9 — six vs seven: **seven. §18's prose was wrong; §1.2's table is normative.**

The seven geometry tokens that are redefined under the single `:root:lang(ar)` hook:

| # | Token | Latin | Arabic |
|---:|---|---:|---:|
| 1 | `--ev-rail-w` | 80 px | 96 px |
| 2 | `--ev-subnav-w` | 224 px | 256 px |
| 3 | `--ev-navrow-h` | 32 px | 36 px |
| 4 | `--ev-row-h` | 32 px | 36 px |
| 5 | `--ev-row-h-media` | 44 px | 48 px |
| 6 | `--ev-control-h` | 28 px | 32 px |
| 7 | `--ev-control-h-lg` | 36 px | 40 px |

**`--ev-control-h-lg` is the one the prose dropped.** It has to move with `--ev-control-h` or the
in-form primary stops matching the field beside it at exactly the language where the type floor rose
(§9.4) — the one condition that makes a mismatch visible. Seven is correct and 0.4 implemented it
correctly; the comment 0.4 left in `globals.css` is right too.

Eight tokens do **not** vary: `--ev-bp-wide`, `--ev-topbar-h`, `--ev-shellbar-h`, `--ev-page-max`,
`--ev-detail-rail-w`, `--ev-monitor-aside-w`, `--ev-drawer-w`, and the two radii.

The **§14 type floors** (`--text-2xs` … `--text-lg`) also live under that hook and also vary by
language. They are **not** part of the seven and must not be counted into it: the seven are
geometry, the floors are type, and §9.4 and §9.7 are different rules. Saying "seven dimensions plus
the type floors" is the accurate phrasing.

00-shell §18 is corrected in this pass (§7 below). The three shadow tokens added by §1 are
language-invariant and change none of this.

---

## 4. Q12 — badge-tone roll-up: **0.6's escalation confirmed, with one clause added.**

### 4.1 The rule, final

Evaluated in this order, over **only the sub-tabs the role can see** (AC-57, AC-58):

```
workspaceCount = Σ subTabCount
workspaceTone  = warning   if ∃ sub-tab where subTabCount > 0 AND badgeTone === 'attention'
                 neutral   otherwise
render         = nothing   if workspaceCount === 0
```

`99+` is applied **once**, to the sum, at render. Never per child.

### 4.2 The escalation is right

0.6 escalated on the right grounds and I am confirming it. At 1280 px the sub-tab column is collapsed
on first run (§0.1, §3.3), so **the rail is the entire visible navigation** and the workspace badge is
the only backlog signal on screen (§2.4, AC-27). A neutral roll-up over an `attention` child would
render the one condition the operator must act on in the same tone as a catalogue count. That inverts
the purpose of the badge. Escalate.

### 4.3 The clause 0.6 was missing: gate it on `count > 0`

"Any `attention` child makes the parent `attention`" is one clause short, and the missing clause is
the one that keeps the rule honest.

`nav.badgeTone` is a property of the **sub-tab**, not of the current number — it says *what kind of
backlog this is* (an SLA-bearing queue is `attention`; a catalogue count is `neutral`). It does not
go quiet when the queue empties. But a sub-tab whose count is zero **renders nothing at all**
(AC-26, `notif-unread-zero` — never a `0`, never a `—`, never an empty chip). So under 0.6's wording
a tile could show a warning badge whose only cause is a row that, when the operator expands the
column, shows **nothing**. The tone would be unfalsifiable — and unfalsifiable badges are exactly
what taught operators to stop reading the legacy rail's eleven zeroes.

**The governing test, which a unit test can assert and visual-QA can check:**

> Any tone on a workspace tile must be explained by at least one **visible** sub-tab row carrying the
> same tone and a non-zero count. Expanding the column must always show the operator what the tile
> was telling them.

### 4.4 Three consequences worth writing down

- **Permission filters first.** The sum and the escalation both run over visible sub-tabs only. A
  hidden sub-tab must never tone a tile the operator cannot act on — that is a badge for a page that
  does not exist for them.
- **The output stays inside R7 and R5a.** Two inputs, two outputs, mapped by §2.4 to exactly two of
  the five tones: `attention` → **warning**, `neutral` → **neutral**. The roll-up can never produce
  info, success, `new`, or a sixth tone, and it can never produce red. Criticality is carried by the
  row's own SLA marker (§7.4, R5a), never by a nav badge.
- **Loading is unaffected.** Labels render immediately from the route table; only badges are
  skeletons (§2.4). A workspace whose counts have not arrived shows a skeleton, not a neutral badge —
  a neutral badge would be a claim.

### 4.5 Where it is recorded so the shell can cite it

00-shell **§2.4** — the normative home, amended in this pass to carry all three clauses in order and
to state the reveal test. 0.6's route-table contract (`nav.subTabCount`, `nav.workspaceCount`,
`nav.badgeTone`) is unchanged: **the roll-up is computed in the shell from the sub-tab data, not
stored on the workspace.** 0.6 must not ship a `nav.workspaceBadgeTone` field — two sources for one
answer is how they drift apart.

**Fixture request to mock-data-engineer (0.6), so §4.3 is testable:** at least one workspace must
contain a sub-tab with `badgeTone: 'attention'` and `subTabCount: 0` alongside siblings with non-zero
neutral counts. That workspace's tile must render a **neutral** badge. Without that fixture the added
clause is untested and will be lost in the first refactor.

---

## 5. Deviations

**None.** No decision in this document suspends a `DESIGN.md` rule.

For the record, the three that were checked and found not to be deviations:

| Decision | Looks like a deviation because | Why it is not |
|---|---|---|
| Adding `--ev-shadow-1/2/3` | §6.4 forbids *"introducing a new colour, radius, shadow, font size"* | §6.4's rule is that such values must be **tokens**. Three tokens satisfy it. Legacy defect **D16** records that no shadow tokens exist in `eyvar_ops_panel_v40.html` — creating the category is compliance with §6.4, not an exception to it. No R19-style ruling is needed here: unlike `--ev-hairline-strong`, this introduces no colour, and §1.4 enumerates no closed shadow set to break |
| `--ev-shadow-3` reaching ~20 px where the baseline reaches ~30 px | departs from a measured reference figure | **R13**: no pixel figure in §1–§5 binds. The relationship binds, and it is preserved — card ≪ popover < modal, downward-asymmetric. The compression is **D-2 applied**, the same way `--ev-topbar-h: 48px` was |
| The drawer taking a shadow the reference does not show | departs from a `[observed]` row in §1.4 | §1.4's own **MUST** names drawers. Where §1.4's observation table and its rule disagree, the rule governs and R13 voids the figure. Argued in §1.5 |

---

## 6. Why no `DESIGN.md` amendment

Checked per decision, deliberately, because amending is a separate act and a rebuild mid-build is a
cost:

- **R-3.** `DESIGN.md` §1.4 already contains the governing principle (*shadow signals "temporarily
  above the page"; border signals "part of the page"*) and the MUSTs that assign shadows to
  transient surfaces. It does not need Eyvar's numbers; §6.1's token table is where Eyvar's values
  live and that is `globals.css`, not the document. **Legacy defect D16 is unchanged** — it describes
  `eyvar_ops_panel_v40.html:11–21`, which still has no shadow tokens and always will. It is not a
  statement about the rebuild and must not be edited to look like one.
- **R-1.** A decision not to add a component is not a design rule. `components.json`'s
  "deliberately not added" list is the right home, alongside `sidebar`.
- **F-9.** A typo in my own spec. Nothing in `DESIGN.md` says six.
- **Q12.** The inherited baseline has no two-level rail, so `DESIGN.md` §8.4 has nothing to say about a parent tone
  and §6.2 **D-4** already carries the two-level nav's full text without descending to badge
  arithmetic. Adding it there would push implementation detail up a level it does not belong at.
  00-shell §2.4 is the citable home.

**The partials are untouched and no rebuild is required by this pass.**

---

## 7. Edits made to `00-shell.md` in this pass

| Where | Change |
|---|---|
| New **§1.3 Elevation tokens** | The three tokens, the surface assignment table, the closed-set rule, the focus-ring collision, and the no-mirroring note. Pointer here for the derivation |
| **§2.4** | The roll-up row now carries all three clauses in order, gated on `count > 0`, with the reveal test and the "computed, never stored" instruction |
| **§11.1** | R-1 recorded: shadcn `empty` is not added; `kind` stays the load-bearing prop |
| **§12** | Elevation added to the restyle checklist — every primitive arrives with a Tailwind shadow that must be replaced by an `--ev-shadow-*` token |
| **§13.1** | Modal sizes line now names `--ev-shadow-3`; the drawer rows name `--ev-shadow-2` + hairline |
| **§15** | Deviations table gains a closing line: this pass adds none |
| **§17** | **F-9** and **Q12** added as **closed**, with the answer inline |
| **§18** | *"six"* → *"seven"*, with all seven named; the three shadow tokens added to the utilities-engineer request; `--ev-marker` confirmed; the 0.6 fixture request added |
