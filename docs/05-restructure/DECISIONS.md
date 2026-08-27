# Decisions

Binding choices made by the business owner. Each supersedes any earlier proposal in the
repo. Do not re-litigate one in a spec or a review — if it is wrong, change it here.

---

## D1 — Information architecture: 5 workspaces, 34 sub-tabs

**Decided.** The rail adopts `PROPOSED-STRUCTURE.md` as written: five workspaces —
Management · Operations · Financials · Customer Support · Admin — with 34 sub-tabs
beneath them.

Supersedes the 10-module / 41-page taxonomy in the first draft of
`specs/00-foundation.md` §3, which is being revised.

**Consequences accepted:**
- Seven page merges are real product work, not renames. Each needs its scope specified
  before its sub-tab can be built.
- Five page specs change scope substantially: `requests`, `subscriptions`, `readiness`,
  `drivers`, `trips`.
- `interventions` is retired, per the proposal. Its surviving card moves to Live Dispatch.
- Four settings tabs — Payment Gateways, Ledger, Pricing & rate card, Cancellation
  Policy — move out of Admin into Financials.
- `profile` (360°) and `notifications-all` stop being tabs and become shell layers
  reachable from every workspace.
- The 11 pages that currently have no nav entry all gain one. Zero unreachable pages.

**Scope of this decision — read this before citing D1.** D1 adopts the
`PROPOSED-STRUCTURE.md` **information architecture**: the five workspaces, the 34
sub-tabs, the merges, the retirement, the shell layers. It does **not** adopt that
document's organisational recommendations. Its §10.4 (two new roles, `Trust & Safety` and
`Dispatcher`) and §10.5 (splitting `manage_settings` into three permission keys) are a
separate decision — see **D4**.

**Why:** five rail items is a switcher; ten is a list. The proposal was authored by the
business owner against the same census this rebuild uses, and it organises the product by
the job someone is paid to do rather than by how the software was built.

---

## D2 — Minimum viewport: 1280px

**Decided.** The console must work at 1280px wide. Below that is out of scope.

**Consequences accepted:**
- The level-2 page list needs a collapse affordance; it cannot be permanently open at
  1280.
- Detail pages may drop the right rail below a breakpoint — the breakpoint is the
  designer's to set, and it must be one number used everywhere.
  **Set in 0.2: `--ev-bp-wide: 1344px`.** One token, one media query, three uses — the
  sub-tab list's first-run default, the detail right-rail drop, and the metric-tile grid.
  Chosen because a 1366-class laptop reports 1349–1351 CSS px once a scrollbar is
  subtracted, so 1344 keeps it on the wide side where 1360 would not; and it sits on the
  4/8/16 px grids. Recorded honestly (design spec F-4): geometry does **not** force the
  rail drop — a 2:1 detail fits at 1280 with both nav columns open — so the rail restacks
  in a band where it would still fit. That is the price of one number. **Nobody adds a
  second breakpoint to soften it.**
- Both states are real states: every screen is reviewed at 1280 and at 1440+.

---

## D3 — Stack

**Decided** earlier, recorded here for completeness. React + TypeScript + Vite ·
Tailwind v4 · shadcn/ui · TanStack Table · Vitest + Testing Library · Playwright.
Rationale and the trade accepted are in `DESIGN.md` §6.6.

---

## D4 — Role model — **OPEN, needed before 0.7**

`PROPOSED-STRUCTURE.md` §10.4 proposes two roles that do not exist today —
`Trust & Safety` and `Dispatcher` — and §10.5 proposes splitting `manage_settings` into
three permission keys. Its own §10.3 visibility matrix and §13.1 R5 both assume all of
this exists.

**This touches the shell, not one screen:** role membership decides which workspace tiles
render at all. The shell (0.7) cannot be finished without an answer.

It also has teeth beyond navigation. Admin › Operational Policy exists so an Ops Manager
can widen the dispatch radius during a supply shortage without waking the founder — and
that is impossible while a single key gates 39 of 131 permission guards and one person
holds it.

**Options:**
1. Adopt the recommendations — two new roles, three settings keys.
2. Keep today's roles; the visibility matrix collapses to what today's roles can express.
3. Adopt the settings split only, defer the new roles.

Until answered, the shell renders workspace tiles from today's role set and the two
proposed roles are absent.

---

## D5 — The sub-tab column never collapses

**Decided**, by the business owner, looking at the running app: *"remove this, no need to
collapse it."*

The level-2 column is **always visible**. This is a reversal of **D2**'s first consequence
bullet and of design spec §3.9, and it deletes machinery rather than adding any.

**What went, in full:**

- The rail's disclosure button, its popover, and `SubTabDisclosureGlyph`.
- `PageNavPopoverBody` and the whole popover path in `AppLayout` — the column always renders.
- `useNavCollapse` **and its test**, deleted rather than left uncalled. `src/hooks` has a
  single owner (utilities-engineer); this one deletion is the recorded exception.
  `UI_STATE_KEYS.subTabNavCollapsed` in `src/lib/persistence.ts` and
  `UserPreferences.subTabNavCollapsed` in `src/data/types/session.ts` are now unread — theirs
  to remove, flagged, not deleted by me.
- `shell.nav.collapsed` / `toggle` / `setCollapsed` are out of `ShellContext`.

**Consequences accepted:**

- **AC-32 and AC-33 are void.** **This is a real win, not a loss.** AC-33's reload clause was
  the shell's one failing criterion and it failed on the unanswered **Q1** (what persists
  across a reload). Removing the collapse removes the gap rather than hiding it — the shell
  now has no criterion waiting on Q1 at all.
- **AC-64 and §3.9's keyboard order simplify** to: the rail's four workspace tiles → pinned
  `Admin` → the sub-tab list → the top bar → the content region. The disclosure is not in the
  tab order because it does not exist, and design finding **F-3** (which decided *where* in
  the rail to put it) goes with it.
- **The rail labels shorten and the `shortName` / `fullName` split goes.** `Exec · Ops ·
  Finance · Support · Admin`, and **the visible label is now also the accessible name.** The
  old split was justified by WCAG 2.5.3 (Label in Name) because "Customer Support" *contains*
  "Support"; that reasoning breaks on `Ops`, which "Operations" does not contain. The full
  name is not lost — the sub-tab column's header carries it, and so do global search and the
  route table.
- **`--ev-rail-w` returns to the design spec's own 80 px** (88 in Arabic). It had been widened
  to 88 because `Management` at 11 px measured ~71 px in a 72 px content box; the longest
  label is now `Finance` at ~40 px, so the reason is void and the 8 px goes to the content
  region.
- **`--ev-bp-wide: 1344px` survives.** It loses its first use and keeps the other two — the
  detail right-rail drop and the metric-tile grid. **Do not delete the token.**
- **§3.9, AC-32 and AC-33 must be amended in `specs/00-foundation.md`.** Removing the feature
  without amending the spec is a spec violation rather than a fix; the 0.8 QA verdict said so
  and it was right. Done in the same change.

**Geometry at the 1280 px floor, measured in the browser, not calculated:** rail 80 + column
224 = **304 px of navigation**, leaving **976 px of content**. A 2 : 1 detail fits that
exactly (640 + 16 + 320), which is the arithmetic design spec §0.1 already recorded as the
honest cost of a single breakpoint. `<main>` measures x = 304, width = 976 at 1280 and
width = 1136 at 1440.

---

## D6 — The navigation has its own background, one step darker than the canvas

**Decided**, by the business owner, pointing at the rail and the sub-tab column: *"these
should have a different bg than the rest of the screen, as in Shopify."*

**This retires a workaround; it does not add a deviation.** `DESIGN.md` §6.2 **D-4** listed
§2.1's tonal-step rule as suspended, on the grounds that *"`:root` holds no neutral darker
than `--bg` and §6.4 forbids inventing one, so a 1 px `--border` hairline is the separator."*
The owner has authorised the neutral, so the hairline goes and §2.1 is met as written:

> MUST give the left nav a **near-canvas grey one step darker** than the canvas and express
> selection with a white rounded pill; **MUST NOT draw a border, divider or shadow between
> nav and content**.

**Consequences accepted:**

- Three new tokens in `globals.css`: **`--ev-bg-nav: #eaecf1`**, **`--ev-nav-chip: #dadee6`**,
  **`--ev-nav-hover: #f2f4f7`**. None is a taste value. `--ev-bg-nav` is the darkest grey in
  `--ev-bg`'s hue family at which `--ev-text-2` — the resting nav label — still clears AA:
  4.523 : 1, where one shade darker measures 4.482 and fails. Derived in design spec
  `02-visual-refinement.md` V3 and **re-measured independently before it was written**; the
  two agree to three decimals.
- **`border-e border-border` comes off both nav columns.** With a tonal step, the hairline is
  exactly what §2.1 forbids.
- **The active nav item is a plain white pill** — no 3 px `--ev-marker` leading edge, no 1 px
  hairline, no shadow, at either level. **The ground change is a prerequisite, not a
  companion:** white on `--ev-bg` is 1.142 : 1, and removing the props from a pill that weak
  would have left the active state worse than the version the owner rejected. On the new
  ground it is 1.182 : 1, against Shopify's own measured 1.192 : 1. `--ev-marker` survives for
  its real owner, R5a's breached-row edge.
- **The nav count chip gets its own fill and its digits become `--ev-ink`.** The old neutral
  chip was `--ev-bg2`, which is 1.073 : 1 *lighter* than its ground — a plate nobody can see.
  That invisibility is why every nav badge had been promoted to `attention`. `--ev-nav-chip`
  is 1.141 : 1 *darker*, matching Shopify's measured `#DDDDDD` on `#EBEBEB` (1.139 : 1).
- **The top bar stays canvas-coloured.** It spans the content region, not the viewport, so it
  belongs to the content side of the seam.
- **`DESIGN.md` §6.2 D-4 is rewritten** in `docs/06-design-reference/_partials/06-eyvar-mapping.md`
  and `DESIGN.md` rebuilt with `build-design.py`. The §2.1 tonal-step clause moves out of the
  suspended list.

---

## D7 — Navattic replaces Shopify as the **visual** reference

**Decided by the business owner**, after reviewing the built shell:
*"edit the colors and the design layout, and make the whole design look more like it"* ·
*"even the colors, no need to be eyvars colors, take it from navattic"* ·
*"so colors, spacing, way it's organized, table style and spacing inside… everything."*

Reference set: `docs/06-design-reference/navattic-web/` — 15 frames, same 768×523 downscale
and the same S = 1.875 scale factor as the Shopify set.

**What D7 replaces.** Colour, spacing, radii, borders, type scale, page organisation, nav
treatment, card treatment, table style and the spacing inside it. In `DESIGN.md` terms that
is the **visual** content of §1–§5, plus §6.1's token values.

**What D7 does not touch.** The structural law survives intact, because it was never
Shopify-specific: **§7 accessibility**, **§8 the patterns Shopify never covered**, and **§9
bidirectionality**. So do not read D7 as licence to drop a contrast ratio, a focus ring, a
logical property or a state. Every rule in §7–§9 still binds, and the precedence ladder is
unchanged.

**Consequences accepted:**
- **D-1 is void.** Eyvar brand blue (`#185FA5`) is no longer the primary action colour.
  Navattic's accent measures **`#2B6EF0`**.
- **`--ev-*` token NAMES are kept; their VALUES are replaced.** Everything in the codebase
  resolves through those names, so a re-skin is one file — `src/styles/globals.css`. Renaming
  the namespace would touch every component for no gain.
- **D-2 (density) re-bases.** "Denser than Shopify" was measured against a roomier product.
  Navattic is already tight; the deviation must be re-derived against the new reference or
  retired.
- **The active nav treatment inverts; the nav-vs-canvas direction does NOT.**
  ~~Navattic puts a grey pill on a near-white nav, with the canvas *darker* than the nav at
  `#F5F7F9`.~~ **Corrected twice, and both corrections agree.** The design pass sampled all
  15 frames and the match audit read Navattic's own served stylesheet: their **canvas is pure
  `#FFFFFF`** (`--color-bg-default`) and their **nav is `#f6f8f9`** (`bg-muted`) — the nav is
  the *darker* surface, exactly as §2.1 has always said. `#F5F7F9` is the icon rail and the
  tinted strips, never the ground. Only the **pill** inverts (grey on near-white instead of
  white on grey), and it costs almost nothing: 1.172 : 1 against Shopify's 1.192.
  My original claim here was drawn from two frames and a fast sample; it was wrong, and
  anything built on it lands on the wrong ground.
- **The table grows vertical column hairlines.** Navattic rules its columns; Shopify does
  not. This is a real divergence, not an accident of the frames — it is visible across
  every table frame in the set.
- **Two elements are new** and have no Shopify equivalent: the sidebar's **section headings**
  (`Analyze` · `Leads` · `Manage`) and the in-card **filter-chip strip** on a tinted ground.
- Screenshot citations in `DESIGN.md` §1–§5 now point at a reference that no longer governs
  the value being cited. They are kept as **provenance**, not as authority.

**Why:** the owner rejected the built shell outright — *"it looks so bad and sloppy"* — and
Navattic is a closer fit for what an ops console is: dense, neutral, low-chrome, with the
work in a card and the colour spent almost nowhere.

### D7 addendum — the reference publishes its own tokens

`https://app.navattic.com/_next/static/css/98da06fdab16cbfa.css` serves Navattic's **declared
token set** and its `@font-face` block. Every value cross-checked against a sampled frame
agrees to within 1/255, and the row hairline agrees **exactly**.

**Prefer it over pixel sampling.** A 768x523 downscale cannot recover a 1px stroke or small
text colour; a stylesheet states them. Sampling remains the check on geometry and on anything
the stylesheet does not declare — and remains the only evidence for the Shopify set, which
publishes nothing.

---

## D8 — A row kebab is for *many* actions, never for one or two

**Decided by the business owner**, looking at the People table:
*"if only 1 action put the action not 3 dots"* · *"and if it's approve/reject put them check and cross and view not three dots also."*

The `⋯` menu is a **disclosure for a list**. Where there is no list, it hides a single
control behind a click and a read, and the operator pays that cost on every row of a queue
they work all day.

**The rule:**

| Row actions | What renders |
|---|---|
| **1** | that action itself — its own control, labelled, no menu |
| **A decision pair** (approve / reject, and similar) | **✓ and ✗ as direct controls**, plus **View** — no menu |
| **3 or more, no decision pair** | the `⋯` kebab, as before |

**Constraints that do not move.** These are §7 and they outrank D8:

- **AC-68** — row actions are keyboard-operable and **visible without a pointer hovering the
  row**. Legacy defect D19 is hover-only row actions; do not recreate it in a new shape.
- **§7.7 hit target.** Two or three inline controls in one cell must each still be a legal
  target. If they cannot be, the cell is too small — that is a row-height finding, not a
  licence to shrink the target.
- **§7.5** — an icon-only control is never colour-alone and always carries an accessible
  name. `✓` and `✗` are **not** self-explanatory to a screen reader.
- **R5a** — red is enumerated to four uses. A reject control is a **destructive button**,
  which is one of them; it is not a new fifth use, and it is not a red badge.
- **Confirmation.** A one-click approve or reject on a row is a one-click irreversible act.
  Say what confirms it, or what undoes it. Legacy `alert()` at `:5233` is not the answer.

**Where this applies:** every table, but it bites hardest in the §8.4 work queues, whose
whole job is a disposition per row — the five wave-2 sub-tabs.

### D8-b — the kebab begins at **three**. Ruled 2026-08-27, `design/10-financials-money-flows.md` §8

**Read this with D8; D8 alone will mislead you.** The table above defines **1** and **3 or more**
and a **decision pair**, and leaves **2 undefined**. `DataTable` read the gap one way
(`declaredActions.length === 1 ? 'single' : 'menu'` — two collapses to a kebab); **R4-6 §6.4
clause 2** read it the other (*"two actions is not a kebab"*). That is a **gap in D8**, not a
collision between two equal rulings.

> **D8-b.** The lane's shape comes from the count of **declared** actions, never enabled ones:
> **0** → no lane · **1** → that action, labelled · **2** → **both actions, labelled, in declared
> order, in one lane** · **3 or more** → the `⋯` kebab · **a decision pair, any count** → direct
> controls plus `View`, which is D8's own row, unchanged.
>
> **R4-6 §6.4 clause 2 stands. `DataTable`'s threshold moves from 2 to 3.**

**This is consistent with D8 as already settled, not a reversal of it.** D8's heading is *"a kebab
is for many actions, never for one or two"*; its **reason** is that *the `⋯` menu is a disclosure
for a list, and where there is no list it hides a control behind a click and a read*. **Two is not
a list, and the cost D8 objects to is identical at two and at one.** D8's own decision-pair row
already renders **three** controls directly at two dispositions, so a rule that shows three at two
and hides two at two is incoherent on its own terms. **D8-b fixes the threshold in the component;
it does not move the rule.**

**Two constraints ride with it and do not move:** **§7.7** — two labelled controls in one cell must
each be a legal hit target, and a lane that cannot give two is a **row-height** finding, not a
licence to shrink one. **§7.5 / AC-68** — both visible at rest, keyboard-operable, accessibly
named; **icon-only is for approve/reject only**, because *waive* is not *reject*.

**D8-c — the width discipline, as a prohibition.** A table that cannot afford a two-control lane at
1280 in Arabic does **not** fall back to a kebab. It **drops the control that only navigates**,
because every index row already carries an identity link and a second control to the same
destination duplicates it.

**This is a SHARED-COMPONENT change and it touches every index screen in the product.** The
threshold lives in `DataTable`, a Phase-0 file: **the shell owner makes that change, no screen
implements it locally, and hand-declared action columns are deleted only after it lands.** **Any
criterion anywhere that counts row actions needs re-checking against D8-b** — Financials' is
**AC-488** (`specs/03-financials.md` §9.18), which also records the five tables whose lane changes
shape and the two whose duplicate navigation control goes.

---

## D9 — ⌘K is a command centre, not a search box

**Decided by the business owner:**
*"command K should open a command center so the user can type commands, or search for
anything on the system … so there is really rich context menu, not just search but making
actions also."*

**Plan:** `docs/05-restructure/design/05-command-centre.md`. It supersedes §5's
*characterisation* of ⌘K as global search and leaves §5's mechanics — the scope chip, the
two-line row, the escape hatch, the `legacyPageIds` resolution — untouched.

**The load-bearing half is the mapping, not the palette.** `Suspend captain` is currently
declared four times — row action, bulk action, page-header overflow, and (as a dead
`kind: 'action'`) search — and the declarations already disagree: the row action carries a
`disabled` predicate and the bulk action does not, so the same operator is stopped in one
place and allowed in the other. One `src/commands` registry per domain feeds all four.
**C-1 is worth building even if the palette is cut**, and if the plan is trimmed it is
trimmed from the bottom.

**Four rulings it needs** (CQ-1..CQ-4 in the plan): the palette stays an **anchored
popover** (§2.6 is not spent on this); section order is **derived from the query shape**
rather than fixed; **AC-60 governs destinations and records, §11.2 governs actions** — the
first are absent, the second are disabled in place with a reason; and the palette may
**mutate only through `command.run`**, never by calling a client itself.

**Blocked on the two questions that are still open:** Q1 (persistence) gates "recent
commands"; D4 (the role model) gates every `unavailable` predicate that is about a role
rather than about domain state.

---

## D10 — Two rulings from the owner on chrome, applied immediately

**D10a — a menu item is always ONE LINE.**
*"the menu has to wrap for whatever inside so it's always 1 line."*
The menu sizes to its widest item; it never sizes to its trigger. Stock shadcn shipped
`w-(--radix-dropdown-menu-trigger-width)` on `DropdownMenuContent` — the **select/combobox**
rule, *match the input*, wrongly applied to a **command menu**. Against a 28px kebab it
collapsed every row-action menu to the 128px `min-w` floor and wrapped `Open 360° profile`
onto two lines. Fixed in `dropdown-menu.tsx`: `w-max`, a 160px floor, items
`whitespace-nowrap`. The same `whitespace-nowrap` is now on `select.tsx` and `command.tsx`
items, so the rule holds for every menu surface rather than the one that was complained
about.

**D10b — the bulk bar has to READ as actions.**
*"these floating actions need to be floating to the page, and look really like actions not
like that this is so hard to see."*
It was a white 32px strip of ghost text on a white card — `Suspend  Reinstate`, no surface,
no count, no exit — positioned against the card. It is now:

- **`sticky` in the content region's own scroll context**, 24px above the fold, carrying
  **zero layout height**, so it floats against the page for as long as the table is on
  screen and never pushes a row;
- the **one inverted surface in the app** — ink ground, white ink, tier 3 — which is the
  strongest *"this is a temporary mode"* signal available without spending a colour from
  R5a's enumeration;
- **stating the count it will act on**, and **carrying its own exit** (`Clear`).

**Amended, same session** — *"make the actions also have some BG except clear."* The
labelled actions and the overflow kebab now carry a **filled control** on the inverted
ground: white at 20% over `--ev-ink`, 30% on hover. `Clear` stays bare, because it is the
**exit, not an action**, and giving it the same fill would make leaving the mode look like
a third thing to do. Measured: the fill reads `rgb(70,72,77)`, white label on it **8.9 : 1**;
the fill against the bar's ground is **1.9 : 1**, which is below 1.4.11's 3 : 1 for a
control *boundary* — permitted here because every one of these controls is identified by a
visible text label at 8.9 : 1, not by its edge. An icon-only control on this surface would
need the stronger fill.

`--ev-shadow-3` had exactly one consumer (`dialog.tsx`) before this; it now has two, which
is the first time R-3's tier 3 is doing work outside a modal. If that turns out to be too
much elevation for a non-modal surface, the fix is the tier, not the inversion.

---

## D11 — The index toolbar is TWO rows, and search is a field

Three separate complaints across two sessions turned out to be one cause:
*"this search also is so broken the search should appear in the same place as the action"* ·
*"these tabs look so bad, use tabs like the one in the reference"* ·
*"add margin between the table and the tabs this looks really bad"* ·
*"you still didn't fix the tabs and the spacing."*

Everything — four view tabs and four controls — was crammed into **one 40px row with a
bottom border sitting directly on the table header band**. There was no margin to add
because there was no row to add it to, and AC-47's *"search replaces the tab row in place"*
meant activating search **deleted the navigation**.

**Now:**

| Row | Height | Holds |
|---|---|---|
| 1 | 44px, `border-b` | the view tabs, and nothing else. The active tab's 2px rule sits **on** the divider (`after:-bottom-px`), so the underline and the separator are one line rather than two near-misses. |
| 2 | 56px, no border | a **persistent search field** at inline-start, `Filter · Columns · Sort` at inline-end. 32px controls in a 56px row: **the 12px above and below IS the margin** the header band was missing. |

**AC-47 is retired, not broken.** Its constraint was *no vertical shift when search
activates*. A field that is always there cannot shift anything, and it removes the swap
that made the tab row disappear. Nothing in the test suite asserted the swap.

**D11 is a stopgap, and it is now superseded.** It shipped at 22:09; the index-screen
redesign (`design/04-index-screen-redesign.md`) landed at 22:12 and answers the same three
complaints structurally rather than by adding a row:

- the tab strip is **deleted as a band** — the four views become a **segmented control** at
  the inline-start of the control row, carrying their counts (`Captains 57`,
  `Applications 12`), measured off the reference's own `Build | Submissions` control;
- **there is no card** — the table is the bordered object;
- the margin the owner asked for is not a number added between two adjacent things. **They
  stop being adjacent:** the control row's block-end and an always-rendered query strip sit
  between the tabs and the table, each interval a declared 12 px.

D11's *persistent search field* survives verbatim (§5.2, "persistent, never a mode"), and
so does its retirement of AC-47. Its two-row toolbar does not. Keep D11 in the register
rather than deleting it, because the reason it was built — three separate complaints with
one cause — is the evidence the redesign is answering.

---

## D12 — The view switcher is a STADIUM segmented control, and R15 gets one narrow exception

**Decided by the business owner**, with a reference image:
*"for tabs use tabs that look like this not the underlined ones."*

The image is a fully rounded segmented control: a light grey stadium **track**, a **white
raised pill** with a soft shadow for the active segment, muted text and no fill for the
inactive one, segments abutting with no divider.

**What this changes in `design/04-index-screen-redesign.md` §5.1** — only two things. The
construction survives: still a segmented control, still 32px, still at the inline-start of
the control row, still carrying its counts (`Captains 57`). **The radius becomes stadium
instead of 8px, and the active treatment becomes a shadowed white pill instead of a fill
flush with the track.**

**The conflict, stated rather than discovered later.** R15 sets the radius vocabulary and
is the reason the bulk bar is explicitly *"r8, NOT a stadium"*. The owner has now asked for
a stadium in a different component, so R15 and the build disagree.

**Resolution: build it, and scope the exception to one component.** The stadium is
authorised for the **view segmented control** and nowhere else — not buttons, chips,
badges, the bulk bar, or the drawer's tabs, whose underlines keep §11.3's reason intact.
Whether R15 should be *amended* rather than excepted is a finding for the frontend engineer
to argue and the owner to settle; nobody amends R15 unilaterally.

**One open measurement.** The active pill reads as *raised*, and that is the shadow doing
the work. R-3's three tiers were cut for cards, popovers and modals; if none of them fits a
28px pill, that is a genuine gap in the elevation ladder and must be reported as one — not
closed by inventing a fourth tier in a component file. §5.4's width budget also has to be
re-checked, because a stadium track with an inset pill is not the width of a flush r8 one
and the Arabic column had 49px of slack.

**D12 — built, with one deviation the owner has to settle.**

The segmented control is in `tabs.tsx` as `variant="segmented"` and live in `IndexToolbar`.
Stadium track, 2px inset, no divider between segments, white pill for the active view,
ink label at weight 600. Track 375px at 1440, 32px tall.

**The deviation: the active pill has a hairline, not a shadow.** The owner's reference lifts
it with a soft drop shadow. R-3 is explicit — *"THREE TIERS, A CLOSED SET, a fourth needs a
§6.2 entry"* — and none of the three fits a 28px pill: tier 1 **is** *"separation by border
and radius, no shadow"*, and tiers 2 and 3 are popover and modal weight. So the pill is
tier 1, which is the rule-conformant answer and a visible step down from the reference.
**Closing it means minting a tier 0.5 through §6.2, and that is the owner's call, not a
component file's.**

**Two things measured on the way, both of which constrained the build:**

- **The track cannot be darkened.** Matching the reference's greyer track means `#eceef1`,
  and the inactive label `--ev-text-2` `#6b7280` then reads **4.16 : 1** — under the 4.5
  floor. It stays `--ev-bg2` `#f6f8f9`, where the same label is **4.54 : 1**. Darkening the
  track would have meant a second new token for the label, to fix a problem the first token
  created.
- **The Arabic slack is 9px, not 49.** `04-index-screen-redesign.md` §5.4 computed the
  control row against a 912px content column in both languages. It is 912 in English and
  **872 in Arabic** — the `:root:lang(ar)` step widens the rail 80 → 88 and the sub-tab
  column 224 → 256, which is the 40px exactly. **It is a deliberate language step, not an
  RTL defect**, and it also corrects §7.3's column budget: 910 LTR, **870 RTL**.

**The band is not deleted yet.** §5 puts the switcher at the inline-start of the control
row and removes its band; that is blocked on `Filter` and `Sort` relocating into the query
strip, because the switcher plus five controls does not fit in 912px. Moving the tabs
before the controls move would trade a treatment complaint for a truncation.

---

## D13 — The final phase is an ad-hoc **Report Builder**, and it is a semantic layer before it is a screen

**Decided by the business owner**, with an Amplitude segmentation chart as the reference:
*"a small module for reporting where the user can choose any data he wants and compare it to
any data he wants … number of drivers vs passengers trend, number of subscriptions vs
whatever … more like this from amplitude."*

**Sequenced last, deliberately.** Every other screen answers a question somebody already
decided is worth asking. This one lets an operator ask a question nobody anticipated, which
means it can only be built on top of a catalogue of what is measurable — and that catalogue
is being written right now as `specs/05-metrics-content.md`.

**The load-bearing point, stated before anyone starts building.** The 34 sub-tabs are served
by *typed, per-resource clients* — `drivers.list`, `applicants.list`, `postings.list`. That
shape cannot answer *"drivers vs passengers, weekly, last 90 days"*, because the question
names no resource. An explorer needs a **query model** — dimensions, measures, filters,
grain, comparison — resolved against a catalogue, and that is a **different data contract**,
not a new screen over the existing one. Building the panel first and discovering this
second is the expensive order.

**The split of ownership, so two specs do not write the same thing:**

| Owns | Artifact |
|---|---|
| **What is measurable** — every measure, its definition, its source, its grain, its legal dimensions | `specs/05-metrics-content.md` |
| **How a question is composed** — the query model, the panel, the chart contract, saving and sharing | `specs/06-report-builder.md` |

The explorer does not define a single measure of its own. If a measure is missing it is a
finding against the catalogue, which is how the two stay consistent instead of drifting.

**Open, and named now rather than found later:** whether a saved report persists (**Q1**,
still open), whether a report can be shared with an operator whose role cannot see one of
its measures (**D4**, still open — and this is the sharpest form that question has taken
yet, because a report is a permission hole with a URL), and whether comparison means *two
series on one axis* or *two periods of one series* — the reference does both and they are
not the same control.

**D13 extended, same session** — *"and to be able to build quick dashboard, and alerts for
this if it went over certain thresholds."* The module is three things sharing one query
model: **compose a report → pin reports to a dashboard → alert on a threshold.** They stay
in one spec, because splitting them would duplicate the model.

**The half that cannot be faked.** Something has to evaluate a threshold *when nobody is
looking at the screen*. That is a scheduler, and it is server work — every measure in this
product currently resolves against fixtures in the browser. An alert that only evaluates
while the tab is open is not an alert. The spec must say which half is the client's and
which the server's, rather than specifying a thing that cannot exist yet.

**Three collisions with what is already built, resolved rather than rediscovered:**

- **Alerts have a delivery channel and it already exists.** `notifications.ts`, the bell
  popover, and seeded rows like `N7`. An alert lands in that centre; it does not invent a
  second inbox.
- **The nav badge tone cap.** `attention` is capped at two sub-tabs at once, and wave 2
  already had four evidenced candidates for two slots. **A user-defined alert that can turn
  a nav badge red blows that cap open.** The proposed rule is that alerts never affect nav
  tone and the notification centre is their only surface.
- **R5a enumerates four permitted uses of `--ev-red`.** A threshold breach *feels* red. It
  is not currently one of the four, and that is a finding for product-designer — not a
  fifth use a report module authorises for itself.

**And the open questions get sharper, not looser.** Q1 now carries reports, dashboards *and*
alert rules. D4 gets its hardest form yet: a shared report is a permission hole with a URL;
**an alert is a permission hole that actively pushes data at someone, on a schedule,
possibly after their role has changed.**

---

## D14 — Shopify governs auth STRUCTURE; Navattic keeps the visual language

**Proposed by product-owner in `specs/04-auth-and-onboarding.md`, for the owner to confirm
or reverse.** Renumbered from the spec's own "D13", which collided with the Report Builder
entry above — the register is the authority on numbering, not a spec.

The owner asked for auth *"same as shopify design"*. **D7 replaced Shopify with Navattic as
the product's visual language.** Both cannot be literally true, so the boundary is drawn
where it costs least:

- **Shopify governs the flow** — what screens exist, in what order, what a wrong code does,
  how a reset is worded, how a session dies. Shopify Admin's auth is the closest
  well-solved analogue to what Eyvar needs, and there is nothing to reverse-engineer:
  **the legacy app has no login screen at all.** What it has is five seeded users with
  roles (`:2831`), a change-password form that validates only in the browser (`:3011`), and
  a `twoFA` flag that is displayed and never enforced (`:3022`).
- **Navattic keeps the look**, because a product whose login page wears a different skin is
  worse than one that is a shade off a reference.

D14 does not carve an exception out of D7. It records a boundary D7 drew and did not name.

**Scope delivered:** AC-500–681, six auth screens, two new shell layers, four onboarding
tracks, 35 named states.

**What blocks it, and what pointedly does not:**

- **BLOCKING — `DESIGN.md` §6.4 has no row for an auth card or a guided checklist**, and
  `patterns.md` forbids designing a page without one. Two new §6.4 rows and a fifth page
  shape must land **before design starts**. Routed to product-designer.
- **Q-78** — no `manage_security_policy` permission key exists, so AC-663 fails visibly.
- **Q4** — the 34 sub-tab permissions block AC-610.
- **D4 and Q1 do NOT block.** Four onboarding tracks ship against the four roles that
  actually exist, and onboarding is deliberately **server-backed**, so it needs nothing
  from the unresolved persistence question. That is the right call: onboarding state that
  lives in one browser is onboarding that restarts on a new laptop.

**AC numbering, corrected.** `06-report-builder.md` moved from **AC-700–799 to AC-800–899**.
`05-metrics-content.md` was written in parallel, overran its 600 block and reached AC-724,
so 700–724 was allocated twice. The catalogue keeps the lower range because three other
specs cite its criteria; the report builder moved because nothing cites it yet. **The
register is the authority on numbering** — the same rule that renumbered the auth spec's
self-declared "D13" to D14 an hour earlier. Blocks in force:

| Range | Spec |
|---|---|
| 1–79 | `00-foundation.md` |
| 80–116 | `01-table-controls.md` (design) |
| 200–344 | `02-work-queues.md` |
| 300–450 | `03-financials.md` |
| 500–681 | `04-auth-and-onboarding.md` |
| 600–724 | `05-metrics-content.md` |
| 800–899 | `06-report-builder.md` |

**300–344 is double-allocated between wave 2 and wave 3 and has been since both landed.**
Neither spec cites the other in that range, so nothing is broken today — but it is the same
defect caught late, and it should be resolved before either is built against.

---

## AWAITING THE OWNER'S SIGNATURE — seven items

> **The heading has read five, seven and eight today. Three items were appended on 2026-08-27 and
> one — Q-D17 — was retired into another, so the live count is seven.** The number is corrected in
> the same edit as the list, every time, rather than left to go stale: **a superseded question left
> standing in a signature register is the stale-status defect this register has now corrected three
> times, and this one sits in front of the business owner.** That is the same discipline `design/09-rulings-r5.md` §13.1
> applies to its own *"four tiles"* and that `specs/05-metrics-content.md` **AC-726** now requires of
> every board: **a list and the number in front of it move together, or the number stops being
> written.** Nothing below is renumbered.

Nothing below blocks work in progress. Each is recorded so it is decided rather than drifted into.

| # | Item | Designer's recommendation |
|---|---|---|
| **§6.2 D-12** | Mint a categorical chart palette, so two measures can share one axis | **DECLINE** — ship small multiples |
| **R15 scope** | Amend R15 to state that it governs **badge, toast and avatar geometry only** | Amend. D12 reserved this to the owner in writing |
| **§6.2 D-13** | Mint elevation **tier 0.5**, scoped to *a part inside a control* | **SIGN** |
| **D15** ⬆ | **Merge five Management boards into three — now the decision that unblocks Q-D16, Q-D18 and every per-board tile count.** Raised by R4-11 §11.3 from one board's literals; **the same evidence now exists on four** | A **D1 amendment**, and D1 is the owner's. **Recommended by product-designer at R4 and unanswered since. Product-owner concurs that it is now first in sequence** — see the note under Q-D18 |
| **§6.2 D-14** | Ratify the inline field error as R5a's fifth use of red, and settle whether it carries a fill | **SIGN, border-and-message only.** Raised as F-1 by `design/08-auth-and-onboarding.md`; the numbering and the fill half are mine |
| **Q-D16** ⛔ | **HELD — the sort that produced its tile list ran on the wrong predicate.** Does Support › Overview ship without the tiles whose measure has no store (R4-11 §11.2)? — **and, added on the second R5 pass, what does Admin › Overview do about landing on four, which R5-10 does not permit?** | **Product-owner's recommendation: YES** to the removal. On Admin, **drop to three**. Below |
| ~~**Q-D17**~~ | ~~Does Management › Overview render six tiles or seven?~~ **RETIRED — absorbed by Q-D18.** It was one board's instance of a principle that governs a pair, and moving a census between the two is what created the second board's defect | — |
| **Q-D18** ⛔ | **HELD — see the note below.** **Does a cumulative census render as a metric tile anywhere?** Settles Management › Overview and Growth together. Five boards fail the tile-count rule; they resolve into **three** decisions — this one, **Q-107**, and two per-board calls | **Product-owner's recommendation: NO**, and the designer's independently. `Active captains` is decided a second time by **AC-603** regardless. Below |

**R4-7 — R15 was never violated, and I repeated the error to the owner.** R15's own row reads
*"Badge, toast and avatar geometry"* (`DESIGN.md:274`). It has never governed a segmented
control. It was **mis-cited five times** across this project — including by me, when I told
the owner their stadium tabs broke a rule. **D12's narrow exception is withdrawn as
unnecessary**, and the segmented control ships unchanged. Avatars were already amended by
D7: person = circle, entity = rounded square.

**§6.2 D-14 — the inline field error. Three documents, three answers, and the code is a
fourth.** `design/08-auth-and-onboarding.md` §16 F-1 raised this; it is worse than raised.

| Source | What it says | Where |
|---|---|---|
| **R5a** | Red has **four** permitted uses. The inline field error is not one of them. A fifth needs a §6.2 entry. | `DESIGN.md:5298`, `docs/ref/rulings.md:14` |
| **§10.4** | Invalid = 1px `--ev-red` border **AND** `--ev-red-lt` fill **AND** a 12px message. Three signals, a MUST. | quoted in `src/components/ui/input.tsx:22`, `field.tsx:12` |
| **`globals.css`** | `--ev-red-lt` is the **critical banner fill**, and `--tone-critical` is annotated *"banners only (R5a use #2)"*. | `src/styles/globals.css:585`, `:954` |
| **The code** | Ships the border and the message. **`--ev-red-lt` appears nowhere in `src/` except inside comments** — the fill was specified twice and built zero times. | `input.tsx:44`, `textarea.tsx:25`, and six more `aria-invalid:border-destructive` sites |

So the fill is required by §10.4, forbidden to this use by `globals.css`, and absent from
every component that documents it. §10.4's *"three signals"* MUST has never been met.

**Recommendation — ONE entry, TWO clauses, and they are not the same kind of decision.**
The designer challenged my first framing and was right: calling the whole thing a *ledger
correction* buys a cheap signature at a real cost, because a struck MUST that is struck
quietly grows back. Each clause is therefore labelled for what it is.

**Clause A — RATIFY the border. This is bookkeeping and nothing moves.** The 1px `--ev-red`
border already ships on eight primitives. R5a's own prescribed remedy for a fifth use of red
is a §6.2 entry, so writing one follows the rule rather than deviating from it. No code
changes.

**Clause B — STRIKE §10.4's fill clause. This deletes a MUST that four documents promise, and
it is a real decision, not tidying.** Three reasons, strongest first:

1. **It collides with the banner it sits beneath — a correctness argument, not taste.** §4.4's
   layering deliberately puts a page-level critical banner **and** the invalid fields on screen
   together. The banner's fill is `--ev-red-lt`. The fields' fill would be `--ev-red-lt`. The
   summary and the items it summarises become one plate, and the summary is the half carrying
   the count and the fix. This would be worth striking **even if it had shipped**.
2. **It is the wrong shape for R5a.** All four sanctioned uses are a small solid object, a 3px
   edge, or one banner. None is a repeated large flat area inside a working surface — which is
   exactly what `request.ts:59`, `safety.ts:59` and `ComplianceView.tsx:22` each record as the
   legacy `--red-lt` row-fill defect.
3. **§4.4's actual guarantee is already met.** The clause exists so colour is never the only
   carrier (WCAG 1.4.1). Border **+ message text** is two carriers and one of them is words.
   The third signal was never load-bearing for the guarantee it was written to make.

**If clause B is DECLINED, the cost is three things, not one:** the fill gets built on eight
primitives; `--tone-critical`'s *"banners only"* annotation becomes wrong and must be rewritten;
and layers 1 and 2 need **a second red tint** to stay distinguishable from each other — which is
a **sixth** use of red and another §6.2 entry. Declining is legitimate; it is not cheaper.

**Already done, and safe either way:** `input.tsx:22` and `field.tsx:12` each documented a rule
their own file does not implement — the exact comment that makes the next engineer "repair" a
non-bug. Both now state the actual behaviour, name D-14 as the open decision, and give the
collision as the reason not to add a fill. Neither pre-empts the signature.

**Numbering:** §6.2 runs D-1…D-11 today (`DESIGN.md:3357`). D-12 and D-13 are the two
proposed above and unsigned, so this is **D-14**. The designer proposed *D-16*; there is no
D-14 or D-15 in §6.2 to skip — the `DECISIONS.md` D-numbers are a different register and do
not consume §6.2's.

**R4-1 — the palette question is not really about colour.** Every hue that clears 4.5:1 on
white is pinned into one luminance band, so all pairs land 1.04–1.25:1 apart and hue becomes
the sole carrier, which fails WCAG 1.4.1; under deuteranopia blue and violet collapse to
1.145:1. But the owner's own example fails on **scale** first — riders outnumber captains by
an order of magnitude, so on a shared axis the captains line is a flat trace, and two hues
make it a *coloured* flat trace. Small multiples fix both, cost zero new tokens, and reuse
the metric-tile grid. **Neither reference set contains a categorical chart in 174 frames.**

**R4-10b — the `attention` cap moves 2 → 3.** Three queues legitimately qualify under the
tightened rule and the cap was silencing one. The tie-break is now two falsifiable clauses,
clause 2 checkable from `slaSource`.

**One limitation worth recording:** the owner's segmented-control reference image **is not in
the repo**. R4-8 was ruled from the built control and from measurement instead. Every other
visual claim in this project cites a file; this one cannot, and that is a gap in the evidence
chain rather than a judgement call.

### Q-D16 and Q-D17 — appended by product-owner on the R5 pass, 2026-08-27

Both are drafted yes/no in `design/09-rulings-r5.md` §14. **Both are the business owner's**: each is
a scope call about what the product claims to measure, not a design or a data question. **They
interact and should be answered in one sitting** — applying R4-11 §11.2 changes the tile count on
three boards at once, and the grid is checked afterwards, not before.

Neither blocks work. Applying §11.2 proceeds either way; only the enumeration in
`specs/05-metrics-content.md` §5.1 / §11.1 and its criteria AC-612 / AC-668 settle on the answer.

---

**Q-D16 — Does Support › Overview ship without the tiles whose measure has no store?**

> **Yes** — Support ships with the tiles it can compute. The removed tiles are listed in the spec's
> *deliberately not here* table against the store each waits on (§11.4), and they return the day the
> store does.
>
> **No** — they stay as em dashes with a reason beneath. The board keeps its shape and keeps telling
> the operator, twice more than it needs to, that it cannot tell them anything.

**Second R5 pass — the count question is settled and a new one arrives with it.** R5 §14 and §1.2
are corrected in place and **adopt this entry's derivation: Support 8 → 6, Admin 7 → 4.** The open
half is what **Admin** does next: **R5-10 does not permit four**, so Admin either regains two tiles
that have stores or drops to three. **Product-owner's recommendation: drop to three — and on the
fourth R5 pass this half of the question moves to Q-D18**, where it is answered together with the
four other boards it turned out to share a rule with. Left here so the trail is readable, not
duplicated as a second ask. — the four
survivors are erasure overdue, rota gaps, operators without two-factor and active operators, and
`Active operators` is a census this spec already ranks last and calls *the tile I would cut first*
(§12.1). Cutting it lands Admin on a permitted count without inventing a measure to fill a grid,
which is the failure mode to avoid here. *(Recommendation, not a decision.)*

**Product-owner's recommendation on the original question: YES.** *(Recommendation, not a
decision.)* R4-11 §11.2 already ruled this in general a round ago and the ruling was never applied; the tiles in question are not
under-populated, they are unbacked. An em dash is a claim that the number exists somewhere.

**~~One correction to the question as drafted~~ — accepted at source and no longer outstanding.**
§14 said the removal takes *"up to four of eight"* on Support. **It takes two**, and R5 §18 corrects
both §14 and §1.2 in place with the retraction left visible. Re-derived
mechanically at `specs/05-metrics-content.md` §21.4, and the ruling's own §1.2 table agrees:
`ticketsBreaching` and `promiseKept` have no ticket store and go; `contactsPerThousandTrips` and
`uncodedContactShare` are *measured with no current value* — the contact log exists and is empty —
and stay with an em dash and a stated reason. **Support ships as a six-tile board, two of them
em-dashed. Admin ships as a four-tile board, from seven.**

**And the thing that actually answers the owner's complaint is neither answer to this question.**
Support › Overview is empty because **`DB.contacts` is `[]`** (`:14718`). One absent store accounts
for two tile values, the board's only chart, and the ranked list the spec calls *the most valuable
list in the product*. That is a **data capture, not a design change**, it is recorded as **Q-115**
and at `specs/05-metrics-content.md` §1.1, and it is the single highest-value item outstanding on
these eight boards. **No wording of an absence answers it.**

---

**Q-D17 — Does Management › Overview render six tiles or seven?**

> **Six** — one tile is dropped or relocated, and the trailing row of one disappears at the 1280
> minimum.
>
> **Seven** — AC-612's enumeration is amended to seven and `3 + 3 + 1` is accepted as a shape.

**Updated on the second R5 pass — the owner is being asked a constrained question, not an open
one.** `design/09-rulings-r5.md` **R5-10** rules that a board renders a tile count leaving no
trailing row of one at either sanctioned width: `n mod 4 ≠ 1` **and** `n mod 3 ≠ 1`, which permits
2, 3, 6 and 8 and forbids 4, 5, 7, 9 and 10. **Seven is not a permitted count.** Two layout answers
were considered and rejected with reasons — balancing four as `2 + 2` leaves two gaps instead of
one, and picking a divisor makes a four-tile board *wider* at 1280 than at 1440. **So the question
is no longer "six or seven"; it is "which tile leaves, given that six is the only permitted
neighbour".** The recommendation below is unchanged and its grounds are stronger.

**Product-owner's recommendation: SIX, and the tile that leaves is `Active captains`.**
*(Recommendation, not a decision. Which tile leaves is a content call and it is the owner's.)*
It is a supply census, Operations already owns the supply question, and **AC-603** — a number is a
metric tile on exactly one of the eight boards — is the rule this spec exists to enforce.
`specs/05-metrics-content.md` §5.1 has listed six since it was written; the seventh is seeded at
`src/data/fixtures/metrics.ts:257` and appears in no amendment in `specs/`, `design/` or here.

**The consequence this raised is now ruled, and it has moved into Q-D16.** §1.2's *"removes a
chunk of V-6 for free"* was retracted in place; the 1280 half is real, and **R5-10 is the answer to
it** — Admin's four is not a permitted count either, so Admin regains two tiles that have stores or
drops to three. That is priced above rather than left as a surprise. Tables at
`specs/05-metrics-content.md` §21.4 and §21.6.

**~~And a third board fails the same rule~~ — it is five, and all five are in Q-D18 now.**
Successive passes counted two, then three, then five. **Management › Growth and Market & Zones each
render seven**, and seven is three-across at **both** widths — so those two are worse than the fours,
which are ragged only at the floor. **Every pass that relayed the number instead of re-deriving it
got a different one, mine included.** The count is one `grep` over `subTabId` in the metric seed and
the shape is one read of `src/components/metrics/MetricTileRow.tsx:70`; both take a minute. Table at
`specs/05-metrics-content.md` **AC-729** and §21.4.

> ⛔ **HELD — DO NOT PUT Q-D16 OR Q-D18 TO THE OWNER. Superseded within the day by the paragraph
> below; the earlier note is left visible because it was too weak, not because it was wrong.**
>
> **The predicate defect is larger than the four counts it was first scoped to.** Re-running §11.2's
> sort on its own test removes **eight further tiles** — **Growth 7 → 3, Admin 4 → 2**, with Risk
> the only board landing off a permitted count. **The per-board table and the ruling behind it are
> in the SEQUENCING section and in R5-15 (§25.2); they are not copied here**, because two copies of
> a count in one document is how the count that changed three times in this cycle changed three
> times.
>
> **Why held rather than reframed a third time.** **A count question asked against a tile list known
> to be wrong is worse than no question, because the answer arrives with the owner's authority and
> outlives the list.** *"Which tile leaves Growth?"* asked of a seven-tile Growth that is about to
> be a three-tile Growth is answering a question that will not exist. My previous note said the
> subjects were answerable and only the landings were provisional; **that was true of Q-D18 and not
> true enough of Q-D16**, whose whole subject is which tiles leave.
>
> **And the tile counts are downstream of a decision nobody has taken.** Growth at three and Admin
> at two are not boards short of a tile. They are the shape **R4-11 §11.3** already named, in the
> same words and for the same cause: *"a sub-tab whose entire rendered content is one tile is a page
> an operator opens once."* §11.3 argued that from **one** board's literals and recommended **D15**.
> **It can now be argued from four.**
>
> **Sequence: D15, then the per-tile disposition report, then the counts.** Deciding tile counts for
> Growth and Zones before deciding whether Growth and Zones are sub-tabs is deciding the furniture
> before the room. **D15 is already in this register with a recommendation; it now has the evidence.**

> ⚠ **Superseded by the hold above — retained for the trail. Both Q-D16 and Q-D18 are answerable on
> their merits; their tile-count consequences are not yet (added 2026-08-27).**
>
> **§11.2's tile-removal sort was run on the wrong predicate.** The test asks whether a measure has
> a **store**; the sort keyed on **`value: null`**, so a tile with a hand-written number and no
> store passed it. **Fourteen seeds with no declared source — twelve carrying a literal ported from
> legacy — were never sorted**, and nine of those are reported to have no store for their population
> at all. **Re-running it correctly moves four boards' tile counts.** It has gone to
> product-designer as a ruling question, because §11.2 is theirs.
>
> **What this does and does not touch.** **Q-D18's subject is untouched** — both censuses are
> derived from declared resources (`drivers`, `riders`), so *does a cumulative census render as a
> tile* is answerable today and the answer does not move. **Q-D16's subject is untouched** — whether
> tiles with no store leave the board is the same question; **only the list gets longer.** What is
> provisional in both is the **landing count**: which board ends on which number.
>
> **So the order is: answer the principles, re-run the sort, then read the counts off it.** Nothing
> waits on nothing — but **the owner is not asked to ratify a board-count list that a corrected sort
> would invalidate.** This is `specs/05-metrics-content.md` **AC-729**'s own guard running the other
> way: that guard says a count may not decide what a measure is; the converse is that **a count may
> not be ratified before the content that determines it.** F-17 in the spec carries it.

### Q-D18 — Does a cumulative census render as a metric tile anywhere?

**Appended by product-owner on the fourth R5 pass and reframed on the fifth, 2026-08-27. It absorbs
Q-D17, which is retired below.** Five boards fail **AC-729**'s permitted tile counts. They resolve
into **three decisions, not five** — this one, **Q-107**, and two genuine per-board calls — and this
one settles the pair that a board-by-board framing could never have settled together.

**Why the pair cannot be separated.** `specs/05-metrics-content.md` §5.4 already carries the
principle: *a cumulative census is an acquisition number, not a board number.* **It applied it as a
MOVE.** The rider census came off Management › Overview and went onto Growth — **Overview 8 → 7,
Growth 6 → 7, in one edit.**

> **A move is count-neutral. One board's fix became another board's defect**, and applying the same
> principle to the captain census would do it a third time. **A relocation rule cannot resolve a
> count problem across a pair of boards. Only a cut can.**

> **Q-D18 — Does a cumulative census render as a metric tile anywhere?**
>
> **No** — neither census is a tile. Management › Overview drops the **captain** census and Growth
> drops the **rider** census; both land on **six**, which AC-729 permits at both widths. The
> censuses remain reachable as the row counts of the People and Riders tables, which is where a
> census is a fact rather than a decision.
>
> **Yes** — a census is a board number after all. Both boards stay at seven, `3 + 3 + 1` renders at
> **both** widths on two boards, and AC-729 is struck rather than left standing unmet.

**Product-owner's recommendation: NO**, and the designer independently recommends the same.
*(Recommendation, not a decision.)* Three reasons, and the second is the one that does not depend on
the count at all.

1. **The principle is already this spec's, and only the mechanism was wrong.** §5.4 wrote the reason
   down and then relocated instead of cutting.
2. **`Active captains` is decided a second time, by a rule that predates the grid.** **AC-603** — a
   number is a metric tile on exactly one of the eight boards, and the board whose role acts on it
   keeps it — puts the captain census on **Operations**, whose subject is supply. That holds however
   Q-D18 is answered. Management › Overview's seventh tile is that census, and
   `src/data/fixtures/metrics.ts:281` already records its presence as a **spec omission**: §5.1 never
   listed it and §5.4 never reassigned it.
3. **Neither census changes what an operator does this shift**, which is the test §1 of the spec
   sets for every tile on these boards.

**One thing that must not be lost with the tile, and it is named so it is not.**
`metrics.test.ts` asserts `Active captains` equals `listDrivers({ status: 'active' }).total` — the
cross-check that stops the overview and the People table disagreeing about a number four legacy
screens compute independently (`:6903`). **That guarantee belongs to whichever board keeps the tile.
It is a reason to carry the assertion across, not a reason to keep the tile here.**

**What Q-D18 does not settle, so the sitting is complete:**

| Board | Settled by | Note |
|---|---|---|
| Management › Overview, Management › Growth | **Q-D18** | one answer, both boards, both land on six |
| Management › Performance | **Q-107** | not an independent choice: the *No* branch retires `Average rider renewal rate` under §11.2 and lands the board on three, permitted at both widths. **That is a reason to answer Q-107 in the same sitting, not a reason to prefer that branch** |
| Management › Market & Zones | **a per-board call** | its seventh is neither census — `Cities live` is a state count with a legal denominator caption, and the other six are the zone-derived five plus `Worst demand-to-supply ratio`, which **R4-12** rules on by name |
| Admin › Overview | **a per-board call**, and it is Q-D16's remaining half | Four on today's tree, **and provisional on F-17** — two of Admin's four are literal-backed seeds that the corrected sort will test. **Three and five are both one tile away**, so this is a choice rather than a bind. **Product-owner's recommendation: drop `Active operators` to three** — §12.1 ranks it seventh and calls it *"the tile I would cut first"* — **unless the corrected sort leaves Admin needing a different move**, which is why the sort goes first |

**The guard, restated here because this is where the owner reads it.** **AC-729** carries it in its
own text: *the permitted counts constrain which tiles are cut; they never decide whether a measure
earns a tile.* Five boards out of conformance is enough pressure to start cutting whichever tile
makes the arithmetic work, and **a grid rule deciding a measurement question from behind is how a
board ends up with the tiles that fit rather than the tiles that answer its question.** Every cut
recommended above was already ranked last, already named as the one to cut first, or already
assigned elsewhere by AC-603 — **before R5-10 existed.**

**The narrower-set caveat raised here on the fifth pass is CLOSED and the correction improves this
question.** R5-10 was re-derived by enumerating every `n` from 2 to 13 through the component's own
branch: **clean at both widths iff `n mod 3 ≠ 1`, permitted 2, 3, 5, 6, 8, 9, 11, 12**, and the
`mod 4` clause never binds. **The consequence lands on Admin, and it is the difference between a
decision and a bind.** Under the old set Admin's four had to become **six**, which meant finding
**two** measures with stores — on a board that had just lost three to §11.2, so *"find two more"* was
close to asking for the tiles that had been removed. **Five is reachable with one.** The same
loosening applies to Performance's four on Q-107's *Yes* branch. **The three sevens are unaffected**;
6 and 8 were their neighbours under both sets.

**And one consequence of the count choices that the owner should read before making them.**
**Tile width varies between boards at one viewport**, because the column count depends on the tile
count: at 1440 against the measured 1040px column, **three columns give 339px tiles and four give
251px** — Operations (8) and Support (6) are one navigation apart and **88px different**. A board
*gaining* tiles to reach a permitted count makes every remaining tile on it **wider**, which nobody
predicts. **product-designer raised it and deliberately declined to rule it**, and the reason is
recorded rather than paraphrased: fixing it means one fixed column count per width, **which would
invalidate a measured, built, working grid on an argument constructed the same afternoon** — the
over-specification error again, in the other direction. **If the answers land every board on 5, 6 or
9 it disappears on its own.** So it is looked at *after* these counts settle, not before, and it is
**F-16** in the spec.

~~**One thing the owner should know, raised for product-designer and not resolved here.** **R5-10's
permitted set is narrower than the built grid requires.**~~ ~~The rule reads `n mod 4 ≠ 1` and `n mod 3 ≠ 1`, giving 2, 3, 6, 8 … the owner simply has fewer
landing points than the grid allows.~~ **Raised on the fifth pass, ruled on the sixth, and the
re-derivation was done properly — every `n` from 2 to 13 enumerated through the component's branch
rather than the arithmetic read back. Superseded by the paragraph above.**

---

**Q-D17 is RETIRED — absorbed by Q-D18.** It asked whether Management › Overview renders six tiles
or seven. That was one board's instance of a principle that governs a **pair**, and the pair is why
the original framing could not have worked: fixing Overview by moving its census is what created
Growth's seven. Q-D18 answers Overview and Growth in one answer; the recommendation is unchanged —
**six, dropping the captain census** — and its grounds are now **AC-603** and the census principle
rather than a preference about a number. **Retired rather than left standing**, because a superseded
question in a signature register is the stale-status defect this register corrected twice on the
same day, and this one sits in front of the business owner.

### D15 — Management collapses from five sub-tabs to three. **Now first in sequence.**

**Not a new item.** `design/07-rulings-r4.md` **§11.3** recommended it, this register has carried it
since, and it is a **D1 amendment** — the 34 sub-tabs are the owner's and are not re-litigated in a
spec or a review. **What has changed is the evidence, and it changed today.**

**§11.3 argued the merge from ONE board.** Performance's two distinctive pieces were hardcoded
literals with no backing store, so under the R4-11 §11.2 bar both tiles are absent, and *"a sub-tab
whose entire rendered content is one tile is a page an operator opens once."*

**The same argument now runs on four boards, and nobody constructed it — a corrected sort produced
it.** **The magnitude, the per-board table and the ruling that produced it are in the SEQUENCING
section below and in R5-15; they are not restated here.** In one line: §11.2's test asks whether a
measure has a store, the sort keyed on `value: null`, and every literal-backed tile survived it —
**Growth 7 → 3, Admin 4 → 2**, with Risk the only board landing off a permitted count.
(`specs/05-metrics-content.md` §21.4, **F-17**, **AC-732**.)

**Growth at three and Admin at two are not boards short of a tile.** They are §11.3's shape, in
§11.3's words, for §11.3's cause. **A board does not earn a sub-tab by being given more tiles; it
earns one by having a question only it answers** — which is the test §1 of `05-metrics-content.md`
applies to every board in it, and the test Growth and Zones were already marginal against before the
sort.

**Product-owner's position, and it is narrower than a recommendation on the merge itself.**
**D1 is the owner's and the shape of the IA is not mine.** What is mine is the sequence, and on
that I concur with product-designer without reservation:

> **D15 first, then the per-tile disposition report, then the counts.** Deciding tile counts for
> Growth and Zones before deciding whether Growth and Zones are sub-tabs is deciding the furniture
> before the room. **Q-D16, Q-D18 and every per-board count are held on this**, and the reason is
> recorded under Q-D18 rather than left as a gap in the register.

> **Note on this register entry, added after product-designer wrote the SEQUENCING section below in
> the same file.** That section is the **ruling** — the predicate defect, R5-15, the magnitude table
> and the order. **This entry is the owner-facing half**: what the merge question actually is, what
> it does and does not decide, and which register items are held behind it. **The evidence table
> lives there and is deliberately not duplicated here**, because two copies of a count in one
> document is how the count that changed three times in this cycle changed three times.

**What the owner is being asked**, restated from §11.3 so it is answerable without opening that
document: **Management collapses to Overview · Risk & Signals · Market & Zones.** Performance's
surviving content merges into Overview. Growth's promo, referral and incentive **tables** — which
are real content either way, and whose absence is finding **F-11** — move to a `Growth` view on
Operations › Subscriptions, or keep a sub-tab. **The tables are not what is in question. The
metric boards are.**

**One thing this does not decide, and it must not be smuggled in with it.** A merge is an
**IA** decision. It does not retire a measure: a tile that survives the sort survives the merge and
lands on whichever board keeps its question. **AC-729**'s guard and its converse both apply here —
a layout decision may not decide what a measure is, and a count may not be ratified before the
content that determines it. **Q-107 and Q-115 stay open on their own merits regardless of D15.**

---

## OPEN AFTER WAVE R4-4 — four items, none blocking

From `build/08-breakdowns-and-notices.md`. Recorded so they are decided rather than rediscovered.

> **Two of the four closed on 2026-08-27 by `design/09-rulings-r5.md`, and the text below is left
> standing rather than deleted, because the reasoning is the record.**
> **Item 1 (B-3, the caption's scope) — CLOSED by R5-4**, in the ruling's favour rather than the
> spec's: R4-4 §4.2 gains *the direction that counts as good, where the label does not make it
> obvious*, the budget drops 60 → 38 characters, and `Of decided appeals. Higher is better.` is
> legal. `specs/05-metrics-content.md` §11.1 tile 8 needed no change and AC-719 was closed with it.
> **Item 3 (B-8, `labelKey` cannot hold an entity name) — CLOSED by R5-7**, as a discriminated
> union. **It required one thing R5-7 does not mention: AC-713's carve-out for entity data**, which
> is applied at `specs/05-metrics-content.md` **AC-713** — AC-713 unamended is what forced the
> `{name}` fig leaf, and amending AC-697 alone puts it straight back.
> Items 2 and 4 are unaffected.

**1. Two documents disagree on what a tile caption may say (B-3).** R4-4 §4.2 permits a caption
to carry **only** a scope limit or a denominator. `05-metrics-content.md` §11.1 tile 8 says the
overturn-rate tile **must** state that higher is better. `caption.overturnIsNotFailure` currently
renders both sentences — *"Of decided appeals. Higher is better here."* — so the first is legal
and the second is out of scope by the rule that governs it. **The builder changed neither
document, correctly.** This is product-designer's to rule: either §4.2 gains a third permitted
kind (a valence, for a metric whose direction is genuinely counter-intuitive), or the sentence
moves out of the caption and §11.1's requirement moves with it. It cannot stay as it is, because
the next person writing a caption has two rules and no tie-break.

**2. The notice tie-break — CORRECTED. It was never unverified; the board that verifies it was
crashing.** ~~No board declares two notices.~~ **Operations Overview declares two**, and always
did: `notice.operations.applicationsPastWindow` at `warning`/severity 70 and
`notice.operations.complianceExpired` at `critical`/severity 95
(`src/data/fixtures/metrics.ts:2508`–`:2539`).

**Why two independent passes both concluded otherwise.** `fixtures/metrics.ts:2477`–`:2486`
hands **six copy keys** to `src/screens/metrics/copy.ts` in a comment block naming each string
exactly. **The handoff was never picked up.** So `t('notice.operations.complianceExpired.many')`
threw `Missing translation key` and **the board crashed before it rendered** — for any operator
whose data raised the condition. It surfaced as one failing shell test (`qa.shell.test.tsx`,
USR-5 landing on `/operations/overview`), which is a board-level crash wearing a routing test's
name, and which is why a visual pass taking 32 clean captures never saw it. Both passes reported
honestly against a board that could not render.

**Fixed:** all six keys written, from the fixture's own documented strings. **Verified in the
browser, not asserted:** the board renders, one banner, no console or page errors, and the
tie-break picks `critical` over `warning` — **so R4-4 §4.3's tone clause is now exercised by real
fixture data.**

**Still genuinely unverified, and narrower than before:** the `severity` clause (needs two
notices of the *same* tone) and the declaration-order clause. Visual QA's §1.1 adds a sharp
point — **the declaration-order clause may be unreachable by construction** if `severity` is
unique within a tone, which is worth a ruling rather than a fixture.

**The transferable lesson:** *"no fixture exercises this"* and *"the fixture that exercises this
throws"* are indistinguishable from the outside, and only the second is a bug. A conclusion of
absence should be checked against a rendering page, not against a search.

**3. `MetricBreakdownRow.labelKey` cannot hold an entity name (B-8).** The fixture already
concedes it: `breakdown.row.entity` is a pass-through key whose entire English string is
`{name}`. It satisfies the type and **AC-713** and it is a fig leaf — a translated label and a
person's name are different things wearing one type. A union (`{ key, params }` for a closed set,
`{ text }` for an entity) would make them different in the type system. Seconded independently
from the rendering side: the component cannot tell them apart either, which is why every row
label is `<bdi>`-isolated defensively rather than by analysis.

**4. The comment-to-`dist` leak recurred, and here is its exact shape.** `MetricTile.tsx`'s own
doc comment said *"there is no `content-['…']` arbitrary value in the tree"* — and Tailwind v4,
which scans comments as plain text, emitted `.content-\[\'…\'\]` into `dist/assets/*.css`. A
sentence written to say *we do not do this* was the only thing doing it.

**MY EARLIER ANALYSIS OF THIS WAS WRONG, AND THE DECISION THAT RESTED ON IT IS REVERSED.**
I scanned the 140 files Tailwind actually scans, found 16 bracket tokens in comments, concluded
that **only a utility-prefixed arbitrary value leaks** (`content-['…']`, `w-[37px]`), and
declined to build a guard on the grounds that the cost was dead bytes.

**Both halves were wrong.**

- **A leaking token needs no brackets at all.** The phrase *"the detail right-rail drop"* joins a
  physical side-word to the rail noun with an ordinary hyphen, and that resolves against the
  theme and emits a rule setting a **physical** inset from `--ev-rail-w` — in a product where
  every inset is logical. Two ordinary English words. **My bracket scan could never have caught
  it**, so the 16-token result said nothing about the real exposure.
- **It has now recurred four times, and the fourth was mine.** `src/lib/breakpoint.ts:5` (closed
  by excluding `src/lib` from the scan); `MetricTile.tsx`, which shipped an arbitrary value by
  writing that it did not use one; `MetricTileRow.tsx:5`, quoting the same sentence from a
  directory that **is** scanned, so the exclusion did not help; and then **the warning comment I
  wrote about it**, which spelled the token out in order to name it and put the rule straight
  back into `dist`. A warning that performs the defect is not a warning.

**Closed and verified in the built stylesheet, not in source:** `vite build` then grep for any
rule setting a physical `left`/`right` — **zero matches**. The comment now names the parts and
never the token, which is the only form of the warning that does not reproduce it.

**The rule, stated so it generalises:** a class name written in prose **is** a class name. It
needs no brackets, no arbitrary value and no syntax resembling code. When a comment must refer to
a utility, **describe it rather than spell it**. And **verify by grepping `dist/`, never `src/`**
— every one of these four was invisible in source and obvious in the build.

---

## OPEN AFTER WAVE 3 (FINANCIALS DATA) — six spec findings for product-owner

The data layer is built and green (1216 passing, 55 injectable operation ids, 13 accounts with
non-zero trial-balance figures). These are places where **the spec cannot be implemented as
written**, each checked against the legacy source rather than assumed. Three block a screen.

**1. §3.4c's chargeback recipe cannot produce the outcome §3.4c asserts two bullets later.**
The recipe is `Dr ar.rider · Cr cash.gateway` and never touches `liability.wallet`. The next
bullet says *"the rider's balance may go negative — that is the `RDR-4001` −41.50 SAR fixture."*
Both cannot be true. **Both shapes are seeded and labelled**: `JE-00036` is §3.4c verbatim (a
fare chargeback, giving `ar.rider` its first posting since `:19867`), and `JE-00030` is a
**wallet top-up chargeback** (`Dr liability.wallet · Cr cash.gateway`) — the only recipe that
yields −41.50, and one the spec does not contain. **Needs a ruling on which is the real case.**

**2. §3.2 and §7.2 contradict each other on escrow; only one is implementable.** §3.2 says a
positive `liability.escrow` balance means *"held against undelivered trips"*. §7.2 says a `held`
posting is *"excluded from the balance"*. If every escrow posting is `held`, the escrow balance
is permanently zero and can never mean what §3.2 says. **Resolved in build as:** escrow postings
are `settled` (money arriving in escrow is a fact), with `held | released | reversed` kept on
`EscrowHold.settlement` where §6.4 already puts it. AC-312 stays reachable. **Confirm or overturn.**

**3. §7.3 and AC-374 demand a cash-review SLA countdown, and no window exists anywhere.** Legacy
enforces none; a cash report carries no reason code, so `rcTargets` has nothing to look up; and
`types/workQueue.ts` already forbids inventing a window that would then hide among measured ones.
**Every cash report ships `slaSource: 'unset'` with all clock fields null.** The queue renders
with ownership, claims and take-over working, and no countdown. **AC-374's countdown half and
§7.3's "past its SLA" row are unbuildable until the business supplies a window.** This is the one
most at risk of being silently "fixed" by a later agent inventing a number — it must not be.

**4. §6.2 names three giveback lines the closed chart of accounts cannot separate.** Promo,
referral and incentive are distinct cost lines in §6.2; §3.8 has no account for any of them, so
all three can only land in `expense.goodwill`. Served as operational figures on
`givebackOperationalFixture` and flagged. The second refused-posting fixture is literally an
attempt to post to `expense.promo`, so **the gap is visible in the product rather than hidden.**

**5. §3.8's chart has no equity or opening-balance account**, so an opening balance cannot be
carried forward in a balanced entry — every balance in the fixture is built from in-period
activity only. Related: §3.4c mandates a chargeback fee as *"a separate posting to `expense.*`"*
and the closed chart has no expense account that could receive one, so **no chargeback fee is
seeded.**

**6. `DB.compPolicy` — checked, and the obvious reading is wrong.** `perRiderPer30dSAR` 150 vs
`secondApprovalAboveSAR` 200 (`:15386`–`:15388`) *looks* like it makes the second-approval branch
unreachable. Reading `compCheck` (`:15412`) rather than assuming: **the per-rider check does not
block** — it pushes a note and sets `approval = true` (`:15425`). Only reason-code, per-case and
daily block. A first implementation had it blocking and AC-386's `pending` state was unreachable;
**the test caught it.** No spec change needed — recorded so it is not "discovered" again.

**Three more in the source material rather than the spec.** `DESIGN.md` §8.3.3's wireframe is
dated 18–20 July, **three weeks after `EYVAR_NOW`** (inherited from `:13888`), and its header
reads `Pending 0.00 SAR` while its own `WTX-0005` row is 120.00 authorised — both cannot be
right. `DB.rateCard` is `live` with `effectiveFrom: 2026-08-01` against a today of 25 Jun 2026
(`:21431`) — a live card six weeks before it takes effect; the August date survives as the
proposed draft, which is what it must actually have been. And `wallet_debit` books gross to
`revenue.fares` with **no VAT leg** (`:19997`) while `fare_capture` splits the same money into
net + VAT (`:20044`), so a fare paid from a wallet **overstates net revenue by its VAT**; §3
gives no `wallet_debit` recipe, so legacy's is kept and flagged, with `JE-00042` showing the
corrected split-tender shape beside it.

---

## OPEN AFTER THE FINANCIALS MONEY-FLOW DESIGN — two questions for Finance

**Raised by `design/10-financials-money-flows.md` §10, recorded by product-owner 2026-08-27.
Both block a criterion that is already written and already shipped short.** Neither is in the
*Awaiting the owner's signature* list above, and that is deliberate: **both are Finance's, not the
business owner's**, so adding them would move that list's count without moving its subject. The
count discipline in that heading holds.

**One numbering hazard, stated so nobody reads an ordinal as a date.** This register already
carries **Q-D16**, **Q-D17** (retired) and **Q-D18**, minted on the R5 metrics pass. **Q-D1 and
Q-D2 are newer than all three** — the designer took the two lowest free numbers, not the next two.
`Q-D<n>` orders nothing. Where sequence matters, the date does.

---

**Q-D1 — Can a refund be reversed, and what happens to its credit note?**

§3.2 says a `contra.refunds` **credit** means *"a refund was reversed"*, so the ledger model
already contains the shape. §3.4b mints a **credit note** as the tax document for every refund, and
**AC-424** requires the invoice sequence to be **gapless**. Nothing in the spec, the module docs or
legacy says **how a credit note is cancelled** — and a gapless legal sequence is not something an
operations console may quietly void. `specs/03-financials.md` did not notice the case at all; the
design pass found it.

> **What ships until it is answered: no reverse action on the refunds index, and no way to reach
> one from the page-level target step**, which refuses a refund reference by name. Held by
> **AC-489**, written **inverted** — a control appearing is a **fail**, not a feature landing
> early.

**The asymmetry is what makes that default defensible rather than arbitrary, and it is the whole
reason to record it in these words:**

| If we default wrong this way | Cost |
|---|---|
| **Unreversible, and it should have been reversible** | A **missing feature**. Visible on the first day an operator needs it, complained about immediately, cheap to add — the flow, the dialog and the copy all already exist |
| **Reversible, and it breaks a gapless sequence** | A **tax problem**. Invisible until an audit, retrospective across every credit note issued in between, and **not fixable from the console that caused it** |

**A default whose failure mode is visible and cheap beats one whose failure mode is invisible and
legal.** That is the argument; without it the absence reads as an oversight and the next agent
closes it.

**Owner: product-owner with Finance. Blocks: the refund's reverse action (AC-489).** When it is
answered, AC-489 is **replaced**, not satisfied — a visible edit that someone signs.

---

**Q-D2 — What are the members of the correction-reason catalogue?**

**Two catalogues, and only one of them exists.**

| Catalogue | The question it answers | Exists? |
|---|---|---|
| **Money reasons** — why money moved | a refund, an adjustment, a waiver, a repayment | **Yes**, as `DB.reasonCodes` (`:14660`–`:14715`), already used by the fixtures. **It does not cross the seam** — a data-layer item, and **not** what this question is about |
| **Correction reasons** — what was **wrong with the record** | a reversal | **No. It exists nowhere**, in this product or in legacy |

**AC-333 requires a *chosen* code, and *chosen* means selected from a closed, server-supplied set.
With no catalogue there is nothing to choose from, so the criterion is currently
unsatisfiable** — and **AC-334**'s audit clause with it. **The build shipped free text and said so**,
which was the right call and the right disclosure.

**What the catalogue would need**, so the answer arrives complete rather than in three rounds:

1. **Members covering the dimensions of *wrong*** — at minimum **wrong amount · wrong party ·
   wrong account · duplicate posting · authorised in error**. Naming them is product scope with
   Finance; the design document declines to name them and is right to.
2. **A per-act membership list.** A money surface never offers the whole support taxonomy — thirty
   contact reasons in a payout confirmation is a list nobody reads, and a code chosen because it
   was nearest is **worse evidence than no code**.
3. **The fields the authority check needs**: `{ code, labelKey, category, permitsMoneyMovement,
   perCaseCapHalalas }`. **The code is an input to the check, not a label on it** — `compCheck`
   reads `rc.comp` for the per-scenario ceiling (`:15412`, `:14669`–`:14715`) and refuses outright
   where a scenario permits no goodwill. A typed string has nothing to look up, so that branch is
   unreachable. *(This says nothing about AC-385's per-case and daily ceilings, which the build
   enforces correctly and which a typed reason does not weaken. The loss is the per-scenario
   ceiling, and only that.)*
4. **A rule for any catch-all member**: no uncoded catch-all carries a non-zero ceiling, and the
   free-text note is mandatory beside it.

> **What ships until it is answered: no control labelled `Reason code` on the reversal at all**,
> `reasonCode: null`, and a **required note**. **AC-490.** The flow ships one field short with the
> shortfall named, rather than a textarea wearing a code's label — which is precisely what
> `fin.wallet.adjust.reason.label` does today on the wallet adjustment, and which **AC-387 already
> fails** on its own terms.

**An invented catalogue is a fail, not an interim.** It is AC-453's trap one surface away: a list
of plausible reasons in a component or a copy file is indistinguishable from a ratified one the
moment it renders, and it becomes policy by being on screen. **Owner: product-owner with Finance.
Blocks: AC-333 and AC-334's reason-code clauses.**

---

## OPEN AFTER THE REPORT-BUILDER SEMANTIC LAYER — three that outlive the module

**Recorded by product-owner 2026-08-27 from ten contradictions the built layer returned. Seven were
wording and are amended in `specs/06-report-builder.md`; these three are register items because
they bind outside that spec.**

**1. `cadence` is the invented-value defect in a third costume, and it was caught before a fixture
carried it.** §4.2 made evaluation cadence a **required operator choice** between `hourly` and
`daily` — **two values this spec minted** — while §12.1 states plainly that nothing evaluates and
no scheduler exists. **A required field whose only legal values were invented by the document that
requires them is AC-453's failure mode**, and it becomes policy the moment it renders. It ships
`null` on all five rules, meaning *not specified, does not run*, and **AC-901 inverts it so that
supplying a cadence is the fail.** *(Same family: the cash-review SLA (**AC-453**), the refund
authority ceiling (**AC-480**), the correction-reason catalogue (**Q-D2** / **AC-490**). Four
instances now, in three specs, all found the same way — by asking **what returned this value**.)*

**2. A cardinality gate is a forecast before a run and a fact after it, and only one of those is a
guarantee.** `trip.pickup` hints 12 parts against a real 17. The hint feeds `panelCount` and the
pie's six-part gate, so an understated hint can briefly offer a chart that cannot legally be drawn.
**Generalises past this module: a gate fed by an estimate must name which reading governs, and the
authoritative one is the one that arrives last.** **AC-838** now judges it at both layers.
**product-designer should know the gate is advisory pre-run** — the inline fallback in the chart
card is a state that will be reached, not a defensive branch.

**3. Reachability and discoverability are two properties, and a build report conflated them —
so I checked it rather than relaying it.** The report claimed §4.3's *"all registered, so every one
is reachable from `?mockFail=`"* was untrue for any client. **Reachability is fine**:
`mockFailures.take(operation)` matches by string at call time, so injection works whether an
operation is registered or not. **Discoverability is what is broken**: `registerOperations` is
called **inside** `mock()`, so `knownOperations()` under-reports until an operation has been
invoked, while `config.ts:232` claims each client registers at module load — only the four new
report clients actually do. **Nothing consumes `knownOperations()` today, so this is latent, not
live**, and the fix is one line per client across about thirty. **AC-904.** *(`DECISIONS.md`
already says it: **an agent report is evidence, not fact.** This is the fourth time correcting one
changed what got written down.)*

---

## BUILD SLOT — the zone-health table (owner: main, scheduled here so it is not lost again)

**R4-6b** (`design/07-rulings-r4.md` §6.6) settles that *"zones by failure rate"* neither dies nor
moves. The premise was re-checked rather than defended: the breakdown and the table are all six
zones, worst-first, same columns, differing only by two row actions — so same-data-twice holds and
the breakdown stays forbidden. It **does not ship as an interim**, because same-data-twice is a
claim about the page and not about the schedule, and a component built to be deleted is deleted
twice — once from the screen and once from the operator's habits.

Nothing here was ever undecided. **What was missing was a build slot**, and §6.4 clause 2 said the
table *"is built"* without saying when, because R4-6 re-patterned a sub-tab after its wave was
planned. §6.6.3 records that as the designer's own gap.

**Scheduled: with the wave-3 financials screens**, which is the next tranche to start once
`routes.tsx` frees. Two dependencies, both in flight or done:

1. **`zones` as a resource in `src/data`** — mock-data-engineer, in flight, built to R4-6b's
   ten-field shape with the derived columns marked. Legacy defect **L-6** is preserved in shape,
   not in bug: `zones.citiesHealth` computes its real measure for **Riyadh only**, by string
   equality on the city name (`:6940`–`:6942`), so three of four rows have no reading and the
   em dashes are honest.
2. **The four tiles MUST derive from the table's rows.** `management.zones.worstDemandSupplyRatio`
   is `value: 7`, a hand-written literal at `src/data/types/metrics.ts:977`. The strip and its
   table cannot contradict each other **today only because the table does not exist**. This is the
   navCounts defect at page scale, waiting for four more tiles. Badge, four tiles and first row
   come from one array, or they drift.

---

## PRACTICE — a document may not tick its own acceptance criterion

**Three instances, three different document types, and the hit rate is the alarming part.**

| Where | The claim | The truth |
|---|---|---|
| A **build note** | `AC-56` recorded as **`pass ✓T`**, *"unreachable until Q4"* | `ForbiddenScreen` and `forbiddenReason` existed with **zero call sites**. Not a Q4 gap — a missing wire. Caught by shell QA as defect **D-9**; **now closed**, wired through `RouteGuard` and verified behaviourally by 9 tests driving a real denial through `AppRoutes` |
| A **design spec** | `AC-552 ✓ names the count` | True only for `{count} ≥ 1`. The same section introduces an ICU **`=0`** branch that deliberately names no count, because *"0 other sessions ended"* is not a sentence anyone should ship |
| The **same design spec** | `AC-554 ✓ — the trusted-device revocation is stated` | AC-554 requires trusted devices to actually **demand the second factor** — a §11 server guarantee no design document can satisfy. The ✓ claimed credit for someone else's work |

**Two of the three AC ticks in that design spec were wrong.** The designer found the second by
running the search on their own file rather than waiting to be asked, which is how a class gets
closed instead of an instance.

**Why this outranks the defects it hides.** A false ✓ is worse than a false design, because the
✓ is the line a reviewer checks **instead of** the design. Nobody re-derives a tick. A wrong
design gets read and argued with; a wrong tick gets counted and skipped.

**The rule.** A document may state what it provides. It may **not** assert that a criterion
passes. Verification is the QA role's output and lives in `docs/02-verification/`, against a
running build. Where a design or build document wants to show it has met an obligation, it names
**its own share** — *"the design's share is the telling, not the revoking"* — and stops there.

**Two corollaries, both learned the expensive way this project:**

- **A criterion whose satisfaction is an ABSENCE must be inverted so the absence is what passes.**
  A criterion left standing as *known-failing* invites the next agent to make it pass. Where the
  correct behaviour is that nothing renders (`Learn more`, **AC-605**) or that no number exists
  (the cash-review SLA, **AC-374**), the criterion must **fail if the thing appears**. Otherwise
  the gap is closed by whoever meets it next, and an invented SLA is indistinguishable from a
  real one once it is in a fixture.
- **Grep the built artefact, never the source, and read the file rather than the report.** A
  stale *"still needs fixing"* claim propagated to **four** places in one spec — two criteria, a
  section intro and a handoff note, all present-tense about a conflict that had already closed.
  It was caught by opening `docs/ref/copy.md:33` instead of relaying the claim. **An agent report
  is evidence, not fact.**

---

## CARRIED — items owed to the AUTH BUILD, which has not started

Collected so they survive the gap between the agent that found them and the agent that needs
them. Every one is a defect that would otherwise be discovered by shipping it.

**From utilities-engineer (shared layer built, 1216 → 1316 tests):**

1. **The re-auth `AlertDialog` needs `onCloseAutoFocus={(event) => event.preventDefault()}`.**
   Radix restores focus to whatever was focused when the dialog opened — by then `<body>`, since
   the freeze disabled the real element first — and **two restores in one commit race**.
   `useFocusCapture` owns the correct restore; Radix's must be told to stand down.
2. **`useFocusCapture` is a sibling of `useFocusEntry`, not a mode of it, and the reason is the
   phase.** Capture happens in the **render** phase, before React commits, so the DOM is still
   the pre-freeze DOM with shell layers not yet closed. §8.1 rule 5 closes every layer on freeze,
   and each closing layer's `useFocusEntry` restores focus to **its own opener** — so an
   effect-phase capture records the notifications button instead of the field the operator was
   in. There is a test named for exactly that.
3. **The bidi helper is `isolatedRunProps`, returning two prop bags — not a `<Bdi>` component.**
   A `<Bdi>` that forwards `className` (which `src/components/Money.tsx` does today) reintroduces
   the stretched-`<bdi>` defect the first time someone passes `flex-1`. `run` is typed
   `className?: never`, so the box takes the layout and the isolated run cannot.
4. **No client-side lockout counter and no schedule constant.** 30/60/120 s is **server policy**.
   Exporting it invites a client to compute the next deadline, which is the server's fact. The
   mock seam issues deadlines; **AC-532** asserts them there. The resend cooldown ticks; the
   lockout does not, and §4.4 says why they differ.
5. **Plural keys are a family: `key#<selector>`, selector = a CLDR category or an exact integer.**
   `#` rather than a ninth dot segment **so `t('auth.reset.done')` still throws in dev** — the
   bare key genuinely does not exist. Exact beats category (ICU's `=0`). Resolution is
   whole-family and single-dictionary; falling back to English mid-walk would render Arabic at
   count 100 and English at count 3, a defect visible only at certain numbers. **The count is
   selected by type** — params must hold exactly one `number` — which is what lets `{minutes}`,
   `{seconds}` and `{count}` share one API. Two numbers throws, deliberately:
   `onboarding.progress` is one sentence with two numbers, not a plural.

**From product-designer (design spec, 1,687 lines, zero placeholders):**

6. **One `<AuthCredentialForm>` with a `mode` prop, mounted twice.** The spec's two-mount-point
   cost reduces to one form, one validation path, one copy set, two containers.
7. **`readOnly`, NEVER `disabled`, on every text input in every frozen or in-flight state.**
   `disabled` greys the value and drops it from some AT trees — losing the exact thing the freeze
   exists to protect. **AC-562, AC-563 and AC-586 all fail on this one detail**, and it is named
   as the single most likely defect in the document.
8. **One visually-hidden `<p id="session-expired-reason">`**, referenced by `aria-describedby`
   from every frozen control. A `title` attribute is hover-only and **fails AC-563 outright**.
9. **The OTP field is ONE centred input with `dir="ltr"`, not six boxes.**
   `autocomplete="one-time-code"` fills one field and half-fills six. Paste fills, strips
   separators and moves focus to the primary **without submitting**; typing the sixth digit moves
   nothing, because a typist's next keystroke would land on the button where `Space` submits an
   unread code.
10. **No toast on any auth screen, and none on onboarding auto-completion.** Both will read as
    omissions and both are decisions.
11. **`route.overlay` gains `onboarding` and NOT `reauth`** — R4-3 makes re-authentication a modal
    with no route and no URL param. A re-auth surface with an address is one someone can navigate
    past.

**Known-failing on arrival, with blockers named — do not report as regressions:** **AC-663**
(no `manage_security_policy` key exists — Q-78, part of D4) and **AC-610** (every
`requiredPermission` is `null` until the 34 sub-tab permissions land — foundation Q4).
`newrole@eyvar.com` reaches `track-empty` through having zero permissions rather than through a
forbidden step, so **AC-631 passes and AC-610 cannot**.

**A green suite is not evidence of a clean build, and this codebase makes that trap easy.**
`import type` is **erased before Vitest runs**. A frontend pass reported **80 tests passing over
code that did not typecheck** — `BreakdownLabel` was defined in `types/metrics.ts` and never
added to the barrel, so `@/data/types` had no such export and every consumer failed `tsc` while
every test went green. The agent caught it and **declined to report the suite as evidence**,
which is the correct handling.

The rule: **a type-level defect is invisible to the test runner by construction.** Verify types
with `tsc`, behaviour with `vitest`, and the stylesheet by grepping `dist` — three different
questions, three different tools, and a pass in one says nothing about the others. This joins the
same family as *verify in `dist`, never in `src`* and *read the table, not the summary sentence
written about it*: **every one of them is a case of checking the artifact that is easy to reach
instead of the artifact that carries the answer.**

**Corollary for a public union:** export it from the barrel the moment it exists, even with no
importer. A union defined but unreachable is the next agent's identical bug, and it costs a round
trip between two agents who cannot see each other's trees.

**A summary sentence written about a table gets read instead of the table.** Named by the
designer after it was their own defect, and it is the false-tick class in a new place: the summary
is **shorter and it looks like the answer**, so it is what the next reader takes.

Four instances, one day:

| The summary said | The table said |
|---|---|
| *"up to four of eight"* tiles removed from Support (R5 §14) | **two** |
| *"four to six"* (R5 §1.2 prose, against its own table) | **five** |
| `copy.md`'s row *"still needs the period"* in a contradictions table | already fixed, four places stale |
| a build note recording `AC-56` as **`pass ✓T`** | `ForbiddenScreen` had **zero call sites** |

**The R5 §14 instance was the expensive one**: the wrong number sat inside the Q-D16 headline the
**business owner was being asked to answer**, and a build agent was mid-deletion against it when it
was caught. A wrong tile removal deletes a measure the product genuinely captures, and it reads as
data loss rather than as a design decision.

**The rule.** A count, a status or a verdict is authoritative **only in the artifact that computes
it**. A sentence restating one is a convenience copy and goes stale silently, because nothing
recomputes prose. So: **state the test, not the result** — R5's own fix was to publish the
mechanical test (`sourceResource: null` **and** `value: null`) instead of the count it produces,
after which three parties derived the same answer independently and the prose could not drift
again.

**The asymmetry that decides borderline cases**, now adopted into §1.2 as its tiebreaker: **a tile
wrongly kept is visible and correctable; a tile wrongly deleted is invisible and nobody looks for
it again.** Generalise it — when a change is destructive and the classification is contested,
leave the thing rendering and flag it.

**And the corollary for rulings that fire late.** R5-6 raised the ranked bar's contrast from
1.142 : 1 to 4.574 : 1 and immediately exposed `operations.backlogByQueue` drawing bars at
1, 0.857, 0.571, 0.714, 0.714 — because that list sorts **breached-first**, which is what a work
queue is for, and not by the measure its bars drew. **Doing the ruling correctly produced a worse
screen than not doing it**, which is exactly the shape of finding that gets quietly reverted. It
was reported rather than resolved, and the ruling that came back (**R5-12**: a bar is legal only
where the rows are ordered by the measure the bar draws) is better than the fix any single agent
would have applied. **A token faint enough to conceal a data defect for two build passes was wrong
twice over.**

---

## PRACTICE — three rules from R5 §19–§20 that outlive the feature

**1. A slot defined by what it CURRENTLY HOLDS will drift. Define it by what it FORBIDS.**
§4.2 was written as *"a caption carries a scope limit or a denominator"* — which was a
description of the two instances on the designer's desk, not a rule. Every later case looked
like a reasonable extension of the last, and by the time it was caught **nineteen tiles carried
a caption**. Rewritten, the actual rule was four **prohibitions**.

The instructive part: the designer diagnosed that failure in §4 of R5, then **reproduced it twelve
sections later** in §18.1's caveat guard — prose describing what a caveat is, against a type that
renders whatever key it is handed. Caught by the build, conceded without qualification. **Knowing
the failure mode does not protect you from it; only writing the prohibitions does.**

**2. Prose, types and review each catch what the others cannot — and the residue must be NAMED.**
R5 §20 takes all three rather than choosing:

- **Prohibitions** catch what a type cannot express (*"a caveat that cannot name the number that
  raises it and the number that clears it is a **disclaimer**"*).
- **The type** catches what prose cannot enforce — `caveat: { key, params, gatedBy }`, three
  fields that exist only together, where `gatedBy` names the metric already carrying the
  condition and the threshold. §18.6 stops being a paragraph and becomes
  `gate.value === null → caveat is null`.
- **Review** catches the rest — and *the type cannot check that the sentence describes the
  condition* is written down as a fixture-review obligation **in those words**.

**An unenforced guard that reads like an enforced one is the false-✓ failure again.** If a rule
bites only in review, the document must say so.

**The structural fix turned out to be a rule the system already had, one level down.** R4-4 §4.3:
*a notice may only exist for a condition the board already shows a number for.* Swap **banner →
caveat** and **page → card** and it is the same test. It was missed because the work was framed as
*designing a slot* rather than *finding the number behind it*. **When a new guard is needed, look
first for the existing rule at the adjacent scale.**

**3. Free string vs closed union — the deciding question is whether anything can check it.**
`gatedBy` is a free string; `awaitingStore` is a closed union (`'contact-log' |
'payments-by-entity'`). Not an inconsistency: **a metric key has referential integrity — something
can verify it points at a real metric. A store name has nothing to check it against, so the set
gets closed instead.** A free string with no validator **can be a placeholder and pass**, which is
exactly `breakdown.row.entity`'s failure mode — the fig leaf whose whole English string was
`{name}`, satisfying its type and its criterion while meaning nothing.

**Where a check exists, use it; where none does, close the set.**

---

## PRACTICE — assert the reason, not the presence

**R5 §20.5, generalised from a test the build wrote and the designer endorsed as better than what
they would have specified.**

R5-9 places a caveat **above the rows it gates**, and the reason is the ruling: *a gate that
appears after the thing it gates is not a gate.* A presence test — *does the caveat render?* —
**passes in exactly the case the rule exists to forbid**, with the caveat sitting in the footer.
The test written instead asserts its **position**.

**The rule: where a ruling's reason is a position, an ordering or a relationship, assert THAT.**
A presence check is the right test only when presence is the whole requirement.

This is the same error as the false ✓ and the summary-sentence-over-table, in a third costume:
**checking the cheap observable that correlates with the requirement, instead of the requirement.**

---

## PRACTICE — a ratio across two populations is wrong even when both numbers are right

**The sharpest defect of the day, and it was inside a report about this exact defect.**

A build report classified `avgRenewalRate` as an **absence**, on the evidence that
`Rider.renewalRatePercent` was *"populated for 3 of 13"*. I relayed that to two agents as fact.
Product-owner re-derived it; the designer then found the source; I counted the fixture myself
rather than relay a third time.

**Neither source number was wrong.** `fixtures/metrics.ts:445` reads *"of the **47 active
subscriptions**, three belong to a rider carrying a `renewalRatePercent`."* So **3 counts
SUBSCRIPTIONS and 13 counts RIDERS.** The sentence that joined them into a ratio was the defect.

> **A ratio whose numerator and denominator come from two different populations is wrong even
> when both numbers are right.**

**The report about a missing denominator contained a denominator defect of exactly the kind it
was reporting** — which is the strongest possible argument that this class needs a *rule* rather
than more care. It is also the same failure as the tile itself, one level up.

**Both disputed means reproduce, over different populations — the finding confirming itself.**
Then **my own label for one of them failed the same way**, on the next pass:

```
16 rider records · 13 carry renewalRatePercent · 8 non-null
n=8   all riders with a reading   100, 25, 93, 30, 91, 85, 44, 88   → 69.5
n=6   the set I called "subscribers"                                → 63.3   ← NOT a population
n=4   riders with a non-empty subscriptionIds                       → 62.0
      active-subscriber mean                                        → uncomputable
```

**The n=6 set is arithmetically real and nameable by nothing.** It *includes* two riders with an
empty `subscriptionIds` and *excludes* two others with an empty `subscriptionIds` — **no predicate
on that field produces it.** I had labelled it *"subscriber riders"* from a loose regex and flagged
the label as unverified; the check found it does not survive.

**And n=4 is not "subscribers" either.** `riders.ts:63` already records why: a rider whose only
subscription is **cancelled** still has `subs.length === 1` and is not a subscriber. The true
population needs the subscription's *status* — a join that fixture cannot do alone. **No arithmetic
over it produces a subscriber mean at all.**

**42.8 (nulls as zero) is not a fourth option**: `Metric.value`'s own doc names nulls-as-zero as
the defect it exists to prevent, and **AC-606** is the criterion. So three computable bases plus
one uncomputable, **spanning seven points** — and even the `13` in *"8 of 13"* is itself a chosen
population, since 16 records exist.

The tile was never short of data — it is a **derivation** — and classifying it as an absence would
have hidden a live measurement dispute behind an em dash.

**R5-14 — the rule that actually closes it, and the reason it is not about care.** Four people
computed this carefully and got four populations, **because the metric declares none.** A fifth
careful pass would produce a fifth number. `Metric.sourceResource` already exists for exactly this
and is `null` on this tile — its own doc says it is *"what stops the overview and the index table
disagreeing."*

> **An aggregate declares its population in `sourceResource`. `null` there is an undeclared
> denominator, not an absent source.**

One population, **four expressions** — `sourceResource`, the label, the caption's base count, and
the drilldown route — and **three of the four are mechanically checkable against each other.** The
fourth (do the label's words name the same population?) is a review obligation and is labelled as
one, per the §20 rule that unenforceable residue must be named.

This completes R5-13 downward. R5-13 moved the population out of the caption into the **label**,
because a label is read first. R5-14 moves it out of copy **entirely**, because **a population that
exists only in copy cannot be checked against the data it claims to describe.**

**And the ruling that follows is one layer higher than it first looked (R5-13).** A denominator in
the caption cannot rescue a label that names no population: **the label names the population, the
caption names the base count**, because a label is read first and a mean whose population appears
only in its caption is quotable without it. `Average renewal rate` → **`Average rider renewal
rate`**. **The drilldown moves with the population too** — a tile averaging riders that links to
`/operations/subscriptions` is the same population error expressed as a route.

**What naming the base cannot fix.** `renewalRatePercent` is a stored per-rider percentage whose
own numerator and denominator were **discarded at write time**, so *total renewals ÷ total
opportunities* — what "renewal rate" ordinarily means — **is not computable from this field at any
denominator.** Naming the base makes the number honest about what it is; it cannot make it the
renewal rate.

**The rule: a number that decides whether something renders must carry the command that produced
it.** A count inside a report reads like an observation and is actually a claim; nothing recomputes
prose. This is the same failure as *the summary sentence read instead of the table* and *the false
✓ read instead of the design* — **checking the cheap observable that correlates with the
requirement, instead of the requirement.** Third costume, same defect.

**One order-of-reasoning ruling worth keeping, from the same pass.** Management › Performance
fails the new tile-count arithmetic (`4 mod 3 = 1`), and that is **not** a reason to delete a tile.
*A grid rule deciding a measurement question from behind is how a board ends up with the tiles that
fit rather than the tiles that answer its question.* Layout constraints do not get to select
content.

**And one state honestly downgraded rather than assumed:** `Nothing to rank for this period.` now
has **no fixture that reaches it**, and is recorded as *a state with no worked instance* instead of
being counted as covered.

---

## PRACTICE — four rules from R5 §23

**1. A ruling states obligations. Only a verification document states that a check EXISTS — against
a named test in a named tree. The tense is the tell.**

R5 §19.1 asserted *"a test asserts no union member exists without a table entry."* No such test
existed anywhere. Flagged by the build; the designer then ran the search on their own file and
found **a second one** in §22.3.

> *"A test asserts"* is a claim about the world. *"Must fail"* is a claim about the rule. **A
> designer writing the first has promoted themselves to QA.**

Committed **twice inside the document that names the class** — the same shape as the false ✓, and
proof that knowing a failure mode does not prevent it. Only the tense rule does.

**2. A rule that names no layer will be applied at the wrong one.**

§11.4 said interpolation params carry **formatted** values; the shipped contract is **bare
numbers**, formatted by the component. The text was **ambiguous rather than wrong** — it cited a
case where the component formats and hands the result to the translator, meaning *at the
translator* while reading *at the contract*.

**And the reason that decides it is not the one first given.** Arabic-Indic digits are already
foreclosed by **AC-717** (Western numerals in both languages), so that divergence never arrives.
The structural reason is stronger and is the one to reuse: **the fixture never knows the
language.** A value formatted before the language is known is frozen in one locale, while the
things that do vary — grouping separator, percent-sign placement under `dir="rtl"` — vary at
render time, in the layer that holds `language`.

**3. A relocation rule cannot resolve a count problem across a pair of boards. Only a cut can.**

Five of eight boards violate the permitted tile count. §5.4 already carries the principle — *a
cumulative census is an acquisition number, not a board number* — and **applied it as a MOVE**:
the rider census went off Management › Overview and onto Growth. **A move is count-neutral.**
Overview went 8 → 7 and Growth went 6 → 7, so **one board's fix became another board's defect**,
and applying the same principle to the captain census would do it a third time.

That collapses five boards into **three decisions**, and absorbs a question that was scoped to one
board and could never have covered the pair.

**4. What a ruling may not claim about its own confirmation.**

R5 §23.6 records its own exclusions: **R5-9's caveat has never rendered on real data** (its gating
metric is `null`, so all four tests use a constructed fixture); the key-label control is
**jsdom-only**; and **every RTL claim in the document is a claim about direction, not translated
text**, until the `AR` dictionary exists. *A ruling that overstates its own confirmation is the
present-tense-test defect in a different tense.*

Pair this with the state ledger: `Nothing to rank for this period.` and R5-9's caveat are both
**states with no worked instance** — recorded as such, not counted as covered.

---

## PRACTICE — writing a rule about code without reading the code, in both directions

Two defects on one afternoon, in one document, failing **opposite** ways. Either alone reads as
carelessness; together they are a class.

| | Defect | Consequence |
|---|---|---|
| **Under-specified** | A rule said *what* and never *where* — params carry formatted values, with no layer named | **Applied at the wrong layer.** A builder does the wrong thing and the rule endorses it |
| **Over-specified** | A rule constrained tile counts as `n mod 4 ≠ 1 and n mod 3 ≠ 1` | **Removed options that existed.** An owner is stopped from doing a right thing |

**The over-specified case had a real price, not a hypothetical one.** The component takes four
columns **only when four divides the count**, so a four-column row is ragged *never*, by
construction — the `mod 4` clause never binds and the true rule is simply `n mod 3 ≠ 1`. Permitted
counts are **2, 3, 5, 6, 8, 9, 11, 12**; the rule forbade **5 and 9**.

Consequence: **Admin needed one more tile, not two.** It had just lost three tiles to the
render-nothing rule, so *"find two more measures with stores"* was close to asking for the tiles
that had been removed. **Five is reachable with one — the difference between a decision and a
bind.** It also freed the census question to be answered on its merits, since cutting both censuses
lands two boards on five, which is clean.

**The fix for both is the same and it is cheap: read the implementation before writing the rule
about it.** Both were caught by someone enumerating the actual branch rather than reasoning about
what it probably did.

**And one restraint worth copying.** Matching the grid ratifies that column count follows tile
count, so **tile width varies between boards at one viewport** — 339px at three columns, 251px at
four; two boards one navigation apart differ by 88px, and *adding* tiles to a board makes its
remaining tiles **wider**, which nobody predicts. The designer raised it and **declined to rule
it**, because fixing it means one fixed column count per width — *invalidating a measured, built,
working grid on the strength of an argument constructed twenty minutes earlier*, which is the
over-specification error again in the other direction, the same afternoon. Recorded as a finding
with an owner, to be looked at **after** the counts settle: if they land every board on 5, 6 or 9
it disappears without anyone touching the grid.

---

## SEQUENCING — D15 comes first, and the tile-count questions are HELD behind it

**The tile-removal sort asked the wrong question, twice, and the ruling already contained the
answer.**

R4-11 §11.2 says, verbatim: *"a tile backed by a hardcoded literal is a stronger claim than [an em
dash]: **it is a wrong number presented as a right one**."* **The literal is the case the ruling
singles out as aggravated — and the sort never looked at it.** It keyed on `value: null`, and a
seeded literal is not null.

> **A rule about whether a measure EXISTS cannot be implemented as a test on what the fixture
> happens to CONTAIN.** `value: null` and `value: 7` are both seed states.

**AC-602 has the matching hole:** it forbids a value *"hardcoded in a component or a copy string"*.
**A fixture literal is neither.** Fourteen tiles satisfy the criterion while being exactly what it
exists to prevent — L-1 warned about inheriting the legacy habit, and it was inherited **through
the layer the criterion does not name.**

**R5-15 closes it:** `sourceResource` is **required** on an aggregate, and `null` means the tile
does not render. R5-14 turns out to be §11.2's missing half rather than a separate rule.

**The magnitude, counted rather than estimated — eight removals beyond the two already known:**

| Board | Tiles |
|---|---|
| Management › Growth | **7 → 3** |
| Management › Zones | 7 → 6 |
| Admin › Overview | **4 → 2** |
| Support › Fairness | 3 → 2 |
| Management › Risk | 6 → 4, *if* its two sort as no-store — the only case leaving R5-10 unsatisfied, **so sort Risk first** |

**Q-D16, Q-D18 and every per-board count are HELD.**

> **A count question asked against a tile list known to be wrong is worse than no question, because
> the answer arrives with the owner's authority attached and outlives the list it was about.**

**And this is D15's evidence arriving.** Growth at three and Admin at two are not boards needing a
tile added — they are the shape **R4-11 §11.3** already described, in the same words, for the same
cause: *"a sub-tab whose entire rendered content is one tile is a page an operator opens once."*
Its recommendation is **D15 — Management collapses five sub-tabs to three** — a **D1 amendment**,
unanswered since R4. **§11.3 argued that merge from one board's literals. It can now be argued from
four.**

**Order: D15 → the per-tile disposition report → the counts.** Deciding tile counts for Growth and
Zones before deciding whether Growth and Zones are sub-tabs is deciding the furniture before the
room.

**And a second question now moves the same number in the opposite direction. `Q-RB-1` asks the
owner to make Management a 35th sub-tab while D15 asks them to collapse it to three.** Both are
**D1 amendments**, both are the business owner's, and neither mentions the other. **They belong in
one sitting**: answered apart, the sub-tab count is signed twice by someone who saw half the
picture each time, and the second signature silently supersedes the first. Recorded here rather
than in either spec, because neither spec can see the other's question — which is the whole reason
this register exists. **Nothing is blocked by the pairing itself:** the Report Builder screens
build **unrouted behind one mount point**, and **AC-800 / AC-806 are blocked on Q-RB-1**, exactly
as they should be. **A route-table row appearing before the sitting is a fail, not progress.**

---

## PRACTICE — two more, both about what a rule may claim

**1. A rule may not claim a defect it would have missed.** R5-14 declares a metric's *resource*; it
says nothing about the predicate within that resource, nor about a record's internal consistency.
**So it would NOT have caught L-12** — two records whose `status: 'subscriber'` contradicted their
empty `subscriptionIds`. What catches that is a **fixture invariant** (`status === 'subscriber'`
⇔ `subscriptionIds` non-empty): a third check, in a third place, and a corollary of nothing.

> **A rule claiming a defect it would have missed is the false-tick failure applied to causation —
> and it is the more dangerous form, because it retires a gap that is still open.**

**2. When a rule gains a condition, every prior pass of its predicate becomes UNINFORMATIVE, not
confirmatory.** `barIsLegal` returned `true` for the queue whose bars ran 1, 0.857, 0.571, 0.714,
0.714 — all three of R5-6's conditions were satisfied, because the bar was **legal by scale and
illegal by ordering**, and only R5-12 separates those. R5-12 did not *tighten* R5-6; **it added an
axis R5-6 never tested.** The faint token hid the disorder — but so did a passing predicate, and a
green check is more reassuring than a colour nobody can see.

---

## PRACTICE — a negative assertion can pass vacuously, and that is a false tick in test form

**`vi.spyOn` on a client namespace does NOT intercept the `@/data/clients` barrel's live binding
unless the spy is given an implementation.** The consequences are asymmetric, which is what makes
it dangerous:

| Assertion | Behaviour with a bare spy |
|---|---|
| `expect(fn).toHaveBeenCalled()` | **Fails loudly** — the spy never sees the call, so you find out |
| `expect(fn).not.toHaveBeenCalled()` | **Passes vacuously** — *"it was never called"* is indistinguishable from *"I was never watching"* |

Found by the auth build **in its own tests**, chasing a positive assertion that failed. **Three
were in that state, including AC-504's *"issues no network request"*** — a criterion whose entire
content is a negative, previously reported as met.

**The rule: every spy carries an implementation.** `vi.spyOn(clients, 'foo').mockResolvedValue(…)`
or `.mockImplementation(…)`, never a bare `vi.spyOn` on a barrel export.

**The general test, which applies well beyond spies:** for any negative assertion, ask **what would
have to be broken for this to fail?** If the answer is *nothing I can construct*, the test is
vacuous. Where practical, prove the instrument works first — assert the positive case in a sibling
test against the same spy, so a silent no-op is caught by its twin.

**This matters most exactly where it is least visible.** Criteria phrased as absences — *no request
is issued*, *no countdown renders*, *no breach facet is offered* — are the ones a vacuous test
flatters. **AC-453** is the extreme case: an inverted criterion whose passing state **is** an
absence, asserted three ways. A bare spy there proves nothing while looking like the most
thoroughly verified criterion in the file.

**Swept:** the only bare `vi.spyOn` calls remaining are on `globalThis.setInterval` /
`clearInterval` (a global, not a live binding, and deliberately un-stubbed) and one **positive**
client assertion that would fail loudly if it were not intercepting — and does not.

**Same family as everything else in this section:** the false ✓, the summary read instead of the
table, the presence check on a placement rule, the green suite over code that does not typecheck.
**Every one is an instrument that reports success without having measured anything.**
