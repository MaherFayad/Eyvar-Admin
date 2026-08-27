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

## AWAITING THE OWNER'S SIGNATURE — four items, from `design/07-rulings-r4.md`

Nothing below blocks work in progress. Each is recorded so it is decided rather than drifted into.

| # | Item | Designer's recommendation |
|---|---|---|
| **§6.2 D-12** | Mint a categorical chart palette, so two measures can share one axis | **DECLINE** — ship small multiples |
| **R15 scope** | Amend R15 to state that it governs **badge, toast and avatar geometry only** | Amend. D12 reserved this to the owner in writing |
| **§6.2 D-13** | Mint elevation **tier 0.5**, scoped to *a part inside a control* | **SIGN** |
| **D15** | Merge five Management boards into three | A **D1 amendment**, and D1 is the owner's. Recommended, not taken |

**R4-7 — R15 was never violated, and I repeated the error to the owner.** R15's own row reads
*"Badge, toast and avatar geometry"* (`DESIGN.md:274`). It has never governed a segmented
control. It was **mis-cited five times** across this project — including by me, when I told
the owner their stadium tabs broke a rule. **D12's narrow exception is withdrawn as
unnecessary**, and the segmented control ships unchanged. Avatars were already amended by
D7: person = circle, entity = rounded square.

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
