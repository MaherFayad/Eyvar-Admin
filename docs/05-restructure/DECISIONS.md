# Decisions

Binding choices made by the business owner. Each supersedes any earlier proposal in the
repo. Do not re-litigate one in a spec or a review — if it is wrong, change it here.

---

## Index

Grep the heading to jump. **Decided** binds now; **Open** waits on the owner and says what is
blocked; **Practice** is a working rule everyone follows. `docs/RULINGS.md` is the
cross-document index and the precedence order; a new decision is appended here with the next
number and given one row there.

| Heading | Status |
|---|---|
| D1 — Information architecture: 5 workspaces, 35 sub-tabs (amended by D1a) | Decided |
| D1a — Management gains **Reports** at order 6 | Decided |
| D2 — Minimum viewport: 1280px | Decided |
| D3 — Stack | Decided |
| D4 — Role model | **Open** |
| D5 — The sub-tab column never collapses | Decided |
| D6 — The navigation has its own background, one step darker than the canvas | Decided |
| D7 — the **visual** language is the token layer: colour, spacing, radii, type, table style | Decided |
| D7a and the amendments made during remediation — brand green `#0C6944` is `--primary` | Decided |
| D8 — A row kebab is for *many* actions, never for one or two | Decided |
| D9 — ⌘K is a command centre, not a search box | Decided |
| D10 — Two rulings from the owner on chrome | Decided |
| D11 — The index toolbar is TWO rows, and search is a field | Decided |
| D12 — The view switcher is a STADIUM segmented control, and R15 gets one narrow exception | Decided |
| D13 — the ad-hoc **Report Builder** is a semantic layer before it is a screen | Decided |
| D14 — the auth spec governs auth STRUCTURE; D7's visual language governs its look | Decided |
| D16 – D23 — the eight delegated rulings | Decided |
| Four rulings the build raised (D16a, D18a, D19a, and the §6.2 addition) | Decided |
| The conversation-composer design pass — four rulings | Decided |
| D29 — the banned-word list | Decided |
| D30 — credential authority | Decided |
| D-11a — who owns focus when a menu hands off to a layer: **the layer wins** | Decided |
| D-12 — peek is the drawer, not a sixth surface | Decided |
| D-13 — motion has no duration tokens, and the request for a duration scale is refused | Decided |
| D-F32 — a `Metric` derived from a server response is not a minted literal | Decided |
| D21a — Admin: three things the workspace deliberately does not do | Decided |
| D21b — five cross-cutting rules from the Management and Operations pass | Decided |
| AWAITING THE OWNER'S SIGNATURE — seven items | **Open** |
| OPEN — four metric-board items, none blocking | **Open** |
| OPEN — six financials-data findings for product-owner | **Open** |
| OPEN — two money-flow questions for Finance | **Open** |
| OPEN — three report-builder questions that outlive the module | **Open** |
| OPEN — the zone-health table, recorded here so it is not lost again | **Open** |
| CARRIED — items owed to the auth surfaces | **Open** |
| SEQUENCING — D15 comes first, and the tile-count questions are HELD behind it | **Open** |
| PRACTICE — a document may not tick its own acceptance criterion | Practice |
| PRACTICE — three rules that outlive the feature that raised them | Practice |
| PRACTICE — assert the reason, not the presence | Practice |
| PRACTICE — a ratio across two populations is wrong even when both numbers are right | Practice |
| PRACTICE — four more rules about what a claim may assert | Practice |
| PRACTICE — writing a rule about code without reading the code, in both directions | Practice |
| PRACTICE — two more, both about what a rule may claim | Practice |
| PRACTICE — a negative assertion can pass vacuously, and that is a false tick in test form | Practice |

### Superseded, and by what

Kept as one line each so a citation still resolves. Do not cite the left column as a live rule.

| Superseded | By |
|---|---|
| D1's *34 sub-tabs* | **D1a** — the count is 35 |
| D7's *near-black `--primary`* | **D7a** — brand green `#0C6944` |
| §6.2 **D-1** (brand blue is the primary action colour) | **D7** — void |
| §6.2 **D-2** (higher density) | **D7** — retired; only **D-2′**, the 32px page gutter, survives |
| **V3** (`--ev-bg-nav` at `#eaecf1`) | **D7** — the nav is `#F8FAFB` and `#eaecf1` is retired |
| **V9** (no icon on the error state) | `design/04-index-screen-redesign.md` |
| **CQ-1** (the palette stays an anchored popover) | the owner's centred-palette override; `design/05-command-centre.md` §7 |
| **AC-32**, **AC-33** (the sub-tab collapse) | **D5** and **V7** — void |
| **AC-632**, **AC-633**, **AC-634** (skip a step) | withdrawn by the owner; there is no Skip control |
| **Q-CC1 – Q-CC7** | answered as the defaults in `design/12-inbox.md` §11 |
| **Q-F14** | **D-F32** |
| **Q-P1 – Q-P8** | answered as the decisions in `design/05-command-centre.md` §12 |

## D1 — Information architecture: 5 workspaces, 34 sub-tabs

> **Amended by D1a — the count is 35.** The heading keeps its original number on
> purpose: D1 is what was decided, and rewriting it would erase the fact that the
> count moved and who moved it.

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

## D1a — Amendment to D1: 35 sub-tabs. Management gains **Reports** at order 6

**Decided by the business owner**, answering **Q-RB-1**. `specs/06-report-builder.md` §5.1
requires the Report Builder at `management-reports`, which makes **35 sub-tabs where D1 said
34**. The spec is explicit that this is a D1 amendment and must be recorded as one *before*
the route table is edited. This is that record.

**What changed:**
- `SUB_TABS` is **35**, distributed **6 / 9 / 7 / 6 / 7**. Management is six.
- `management-reports` at `/management/reports`, order 6, `shape: 'single'`,
  `hasBacklog: false` (§12.6 — a report is a question, not a queue), `permission: null`
  (still **Q4**, not decided here), `legacyPageIds: []` — genuinely new.
- `DetailKind` gains **`report`** and **`dashboard`**; §3.4's five level-3 routes are now
  seven. A saved report and a dashboard each address one named record, which `?view=`
  cannot carry (§3.8 rule 3).
- **AC-800 and AC-806 move from BLOCKED to testable.**
- No change to `routes.tsx`. The mount point was already keyed on `REPORTS_SUB_TAB_ID`, so
  the row alone made the screen reachable — which is the argument for having waited.

**Why Management rather than Admin** (§5.1): the other five Management sub-tabs are §3.7
boards and the Report Builder is their ad-hoc sibling. Filing *"ask a question about the
business"* under configuration would be wrong.

### The pairing was not honoured, and that is recorded rather than smoothed over

The register asked for **Q-RB-1 and D15 in one sitting**, because D15 proposes collapsing
Management to three sub-tabs and moves the same count in the opposite direction. **Q-RB-1
is answered; D15 is still open.** The owner is entitled to answer one and not the other —
but the consequence the register predicted is now live and must be named:

- **The sub-tab count has been signed once and can be signed again.** If D15 lands, the
  Management order changes and this row moves with it. That is a one-line change to
  `order`, plus the count assertions in `clients/routes.test.ts`, `shell/permissions.test.ts`
  and `shell/qa.copy.test.tsx`.
- **The risk is not the row; it is the second signature.** Whoever answers D15 must be told
  Management is six now, not five, or they will collapse a set they have miscounted.

**D15 stays open and now carries a dependency it did not have.**

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

## D4 — Role model — **OPEN**, and the shell depends on it

`PROPOSED-STRUCTURE.md` §10.4 proposes two roles that do not exist today —
`Trust & Safety` and `Dispatcher` — and §10.5 proposes splitting `manage_settings` into
three permission keys. Its own §10.3 visibility matrix and §13.1 R5 both assume all of
this exists.

**This touches the shell, not one screen:** role membership decides which workspace tiles
render at all.

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
should have a different bg than the rest of the screen."*

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
  **V3** and **re-measured independently before it was written**; the
  two agree to three decimals.
- **`border-e border-border` comes off both nav columns.** With a tonal step, the hairline is
  exactly what §2.1 forbids.
- **The active nav item is a plain white pill** — no 3 px `--ev-marker` leading edge, no 1 px
  hairline, no shadow, at either level. **The ground change is a prerequisite, not a
  companion:** white on `--ev-bg` is 1.142 : 1, and removing the props from a pill that weak
  would have left the active state worse than the version the owner rejected. On the new
  ground it is 1.182 : 1, against an ordinary console's 1.192 : 1. `--ev-marker` survives for
  its real owner, R5a's breached-row edge.
- **The nav count chip gets its own fill and its digits become `--ev-ink`.** The old neutral
  chip was `--ev-bg2`, which is 1.073 : 1 *lighter* than its ground — a plate nobody can see.
  That invisibility is why every nav badge had been promoted to `attention`. `--ev-nav-chip`
  is 1.141 : 1 *darker*, matching the 1.139 : 1 an ordinary console chip runs at.
- **The top bar stays canvas-coloured.** It spans the content region, not the viewport, so it
  belongs to the content side of the seam.
- **`DESIGN.md` §6.2 D-4 is rewritten** in `docs/06-design-reference/_partials/06-eyvar-mapping.md`
  and `DESIGN.md` rebuilt with `build-design.py`. The §2.1 tonal-step clause moves out of the
  suspended list.

---

## D7 — the **visual** language is the token layer, and it is re-derived from scratch

**Decided by the business owner**, after reviewing the built shell:
*"edit the colors and the design layout, and make the whole design look more like it"* ·
*"even the colors, no need to be eyvars colors"* ·
*"so colors, spacing, way it's organized, table style and spacing inside… everything."*

The values, their derivations and their contrast arithmetic are `design/03-visual-language.md`.

**What D7 replaces.** Colour, spacing, radii, borders, type scale, page organisation, nav
treatment, card treatment, table style and the spacing inside it. In `DESIGN.md` terms that
is the **visual** content of §1–§5, plus §6.1's token values.

**What D7 does not touch.** The structural law survives intact, because it was never tied to
any one reference: **§7 accessibility**, **§8 the Eyvar-only patterns**, and **§9
bidirectionality**. Do not read D7 as licence to drop a contrast ratio, a focus ring, a logical
property or a state. Every rule in §7–§9 still binds and the precedence ladder is unchanged.

**Consequences accepted:**

- ⚠ **AMENDED — see [D7a](#d7a--brand-green-replaces-near-black-as---primary-amending-d7-12) at
  the foot of this file.** The primary action is **brand green `#0C6944`**, not near-black.
  D7's colour method and every other value it set are untouched.
- **D-1 is void.** Eyvar brand blue (`#185FA5`) is no longer the primary action colour. The
  accent is **`#2B6EF0`**, and it keeps three roles — focus ring, chart series, selection —
  because at 4.574 : 1 on white it cannot carry 13px text on a tinted ground.
- **`--ev-*` token NAMES are kept; their VALUES are replaced.** Everything in the codebase
  resolves through those names, so a re-skin is one file — `src/styles/globals.css`. Renaming
  the namespace would touch every component for no gain.
- **D-2 (density) is retired.** The claim that Eyvar was denser than an ordinary console was
  measured against a roomier baseline. Re-measured, Eyvar matches the ordinary rhythm and in
  five places was *tighter* and has been loosened. One departure survives as **D-2′**: the page
  gutter is 32px. `03-visual-language.md` §5.
- **The active nav pill inverts; the nav-vs-canvas direction does NOT.** The canvas is pure
  `#FFFFFF` and the nav is `#F8FAFB` — the nav is the *darker* surface, exactly as §2.1 has
  always said. `#F5F7F9` is the icon rail and the tinted strips, never the ground. Only the
  **pill** inverts, to grey on near-white, and it costs almost nothing: 1.172 : 1 against the
  1.192 : 1 the other direction gives.
- **The table grows vertical column hairlines**, lighter than its own outer border, so a column
  rule never reads as an edge of the table.
- **Two elements are Eyvar's own**, covered by no inherited pattern: the sub-tab column's
  **section headings** and the in-card **filter-chip strip** on a tinted ground.
- Screenshot citations in `DESIGN.md` §1–§5 point at a baseline that no longer governs the value
  being cited. They are **provenance**, not authority (**R13**).

**Why:** the owner rejected the built shell outright — *"it looks so bad and sloppy"* — and
the language D7 sets is a closer fit for what an ops console is: dense, neutral, low-chrome,
with the work in a card and the colour spent almost nowhere.

### D7 addendum — a declared value beats a sampled one

Where a value is **declared** — in a stylesheet, in `globals.css`, in a token — the declared
value wins over anything read off a rendered image. A downscaled capture cannot recover a 1px
stroke or a small-text colour; a declaration states them. Sampling remains the check on
geometry, and on anything no declaration covers.

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

### D8-b — the kebab begins at **three** (`design/10-financials-money-flows.md` §8)

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

## D13 — the ad-hoc **Report Builder** is a semantic layer before it is a screen

**Decided by the business owner**, with a product-analytics segmentation chart as the reference — the behaviour is recorded in `specs/06-report-builder.md` §0:
*"a small module for reporting where the user can choose any data he wants and compare it to
any data he wants … number of drivers vs passengers trend, number of subscriptions vs
whatever."*

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

## D14 — the auth spec governs auth STRUCTURE; D7's visual language governs its look

**Proposed by product-owner in `specs/04-auth-and-onboarding.md`, for the owner to confirm
or reverse.** Renumbered from the spec's own "D13", which collided with the Report Builder
entry above — the register is the authority on numbering, not a spec.

The owner asked for the auth flow to follow a familiar console's. **D7 replaced the visual
reference as
the product's visual language.** Both cannot be literally true, so the boundary is drawn
where it costs least:

- **The inherited flow governs the structure** — what screens exist, in what order, what a wrong code does,
  how a reset is worded, how a session dies. That flow is the closest
  well-solved analogue to what Eyvar needs, and there is nothing to reverse-engineer:
  **the legacy app has no login screen at all.** What it has is five seeded users with
  roles (`:2831`), a change-password form that validates only in the browser (`:3011`), and
  a `twoFA` flag that is displayed and never enforced (`:3022`).
- **D7's token layer keeps the look**, because a product whose login page wears a different skin is
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

> **The heading has read five, seven and eight. Three items were appended and
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

### Q-D16 and Q-D17 — appended by product-owner

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
> their merits; their tile-count consequences are not yet.**
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

**Appended by product-owner and later reframed. It absorbs
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

## OPEN — four metric-board items, none blocking

Raised by the metric-board build. Recorded so they are decided rather than rediscovered.

> **Two of the four are closed by `design/09-rulings-r5.md`, and the text below is left
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

## OPEN — six financials-data findings for product-owner

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

## OPEN — two money-flow questions for Finance

**Raised by `design/10-financials-money-flows.md` §10, recorded by product-owner.
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

## OPEN — three report-builder questions that outlive the module

**Recorded by product-owner from ten contradictions the built layer returned. Seven were
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

## OPEN — the zone-health table, recorded here so it is not lost again

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
passes. Verification is the QA role's output, produced against a running build. Where a design or build document wants to show it has met an obligation, it names
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

## CARRIED — items owed to the auth surfaces

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

## PRACTICE — three rules that outlive the feature that raised them

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

## PRACTICE — four more rules about what a claim may assert

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

> **RESOLVED, PARTLY — see D1a.** The owner answered **Q-RB-1** on its own: Reports goes under
> Management, order 6, and the row has landed. **D15 was not answered with it**, so the sitting
> this paragraph asked for did not happen. The warning above stands as written and now applies to
> whoever answers D15: **Management is six sub-tabs, not five.** The count has been signed once;
> the danger the paragraph names is the second signature, not the first.

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

---

## D16 – D23 — the eight delegated rulings

**Delegated by the business owner to product-owner, in one sitting, with the instruction to
rule rather than survey.** Every entry below is decided. None of them says *to be confirmed*,
none returns options, and where a ruling rests on information nobody has, it says so and takes
**the default that costs least to reverse** — explicitly, in the ruling text, not in a footnote.

> **Numbering, before anything else.** These are **`D` numbers — D16 … D23**. They are **not**
> `Q-D` numbers. `Q-D16` and `Q-D18` are two open tile-count questions in the signature register
> above, they are HELD behind **D15**, and **nothing in this round touches them.** The near-
> collision is ugly and it is named here rather than dodged, because skipping D16–D19 to avoid it
> would mint four phantom decisions and the register is the authority on numbering.
>
> **D4 is CLOSED by D17.** Its heading above keeps the word OPEN on purpose, the same way D1 keeps
> "34": what was open is part of the record. Read D4 for the question and D17 for the answer.

**Acceptance criteria: AC-906 … AC-974.** Highest in use before this round was **AC-905**
(`specs/06-report-builder.md` §14a). **The block AC-906–999 is allocated to this round**; 725–799
remains free. Nothing is renumbered.

| # | Ruling, in one line |
|---|---|
| **D16** | Operator-authored state persists **server-side, per operator, behind one new client** — `localStorage` is a cache and never the truth |
| **D17** | **Six roles, twenty permission keys, one view key and one write key per sub-tab**, role baseline plus a signed per-user delta |
| **D18** | Undo is a **real inverse operation on the data seam**, ten seconds, and reversibility is what buys a command out of its confirm step |
| **D19** | Chat and email ship; the queue is **pull-only, no auto-assignment**; grab is a claim and it is reversible |
| **D20** | Admin is **nineteen named panes across the seven existing sub-tabs** — API keys and webhooks in, feature flags out, **no eighth sub-tab** |
| **D21** | Bulk all-or-nothing is **RATIFIED**, with a third sentence for *all blocked* and **one** escape hatch: `Select only the N eligible` |
| **D22** | Chat first response **45 s**, chat resolution **20 min** (a conversion prompt, not an escalation), concurrent cap **3** |
| **D23** | `lastActiveAt` is a **per-entity-type alias to a real stored field**, and `Driver` gains `lastTripAt` computed from the trip store |

---

### D16 — Persistence: operator state lives behind a client, and `localStorage` is a cache that may be wrong

> **The ruling.** Every operator-authored artefact persists **server-side and per operator**, read
> and written through the data seam — named artefacts through their own domain client, unnamed
> preference state through **one new client, `src/data/clients/preferences.ts`** — and
> `src/lib/persistence.ts` keeps its `UiStateStore<T>` interface but gains exactly one adapter: a
> **`localStorage` write-through cache, namespaced per operator, which is a paint accelerator and
> never the source of truth.**

**Q1 is closed.** `lib/persistence.ts` may stop saying it is open.

#### The three classes, because Q1 has been asked as though there were one

The reason Q1 sat open for five rounds is that it was posed as *"`localStorage`, `sessionStorage`,
or server?"* — a transport question about a set of things that do not share a transport. There are
three classes and they get three answers.

| Class | Examples | Where it lives | Why |
|---|---|---|---|
| **1. Ephemeral, URL-expressible** | search text, sort, page, active filters, active view | **The URL. Nowhere else.** | **P1-T1 already rules this** and it is the whole of finding 0.1. A filter in the address bar is bookmarkable, shareable and survives Back. **A filter that is also in a store is two truths, and the store wins the race on mount.** Do not persist these. |
| **2. Unnamed per-operator preference** | column visibility, column pins, page size, density, language, command-palette recents, last-used view per sub-tab | **`clients/preferences.ts` → `GET/PATCH /api/v1/me/ui-state`**, cached in `localStorage` | It follows the person, not the machine. An operator who moves to the loaner laptop at 03:00 should not rebuild their column layout. |
| **3. Named artefacts** | saved reports, dashboards, alert rules, **named** saved filters, canned responses, draft canned responses | **Their own domain client** — `clients/reports.ts`, `dashboards.ts`, `alerts.ts`, and new `clients/views.ts` and `clients/templates.ts` | These have an owner, a name, an audit trail and a visibility. `SavedReport` already carries `ownerId` and `visibility: 'private' \| 'team'` (`types/report.ts:542`). **That is the shape; the other two follow it.** |

**A draft canned response is class 3, not class 2.** A half-written macro is an artefact with a
name and an owner that somebody will finish tomorrow; storing it in a preferences blob makes it
invisible to the library it belongs in.

#### What was rejected, and why

- **`localStorage` as the store.** Rejected. Two operators share a machine at shift change; one
  browser's `localStorage` then holds the other's column layout, recents and drafts, under no
  identity at all. **The recents list is the sharp case: "what did I just do" is a privacy surface**,
  and a shift-change console that shows the previous operator's last five commands is a leak with
  a keyboard shortcut. Namespacing by `userId` fixes the mixing and not the leak.
- **`sessionStorage`.** Rejected outright. It dies on tab close, which means it answers *"does this
  survive a reload"* with *"sometimes"*. A preference that survives F5 and not ⌘W is worse than one
  that survives neither, because the operator forms a belief and it is wrong.
- **A second seam beside `clients/`.** Rejected. `src/data/clients/` is 33 typed clients, each with
  a `DATA_SOURCE` branch per function, an endpoint comment, and a registered operation id for
  failure injection. **Preferences that skip that seam are the seventh fixture-importing screen
  wearing different clothes.** One more client is the cheap answer.
- **Doing nothing until a backend exists.** Rejected. `clients/session.ts:96` already ships
  `getPreferences`/`updatePreferences` against `/me/preferences` in exactly this shape, in both
  modes, today. **The seam is not hypothetical; it is built and unused.**

#### The seam, named precisely

`clients/preferences.ts` **absorbs and widens** `session.ts`'s two preference functions rather than
sitting beside them. `UserPreferences` grows from two fields to a versioned bag:

```
GET   /api/v1/me/ui-state            -> UiState
PATCH /api/v1/me/ui-state            body: Partial<UiState>  -> UiState
```

- **`UiState.schemaVersion: number`.** A preference bag with no version is a migration you cannot
  write. On a version the client does not know, it **discards and re-defaults** rather than
  half-reads — and it says so in a toast, once.
- **The key namespace is `UI_STATE_KEYS`, already enumerated in `lib/persistence.ts`**, including
  the two documented prefixes (`ui.columnPins.<tableId>`, `ui.columnVisibility.<tableId>.<view>`).
  That list exists precisely so a Q1 implementation does not discover thirty-four unlisted keys.
  **It is now the schema.**
- **`ui.subTabNavCollapsed` and `UserPreferences.subTabNavCollapsed` are DELETED**, not migrated.
  **D5** removed the collapse; a preference nothing reads is a field the next migration has to
  reason about. `session.ts` is mock-data-engineer's file — this is a request, not an edit.

#### Scope: **per operator. There is no per-tenant preference in v1.**

Eyvar Admin is one workspace with one operator roster. A per-tenant layer would be a second
inheritance chain with no second tenant to justify it, and inheritance is the expensive half.

**The one thing that is per-tenant is already per-tenant and is not a preference:** everything in
Admin › Workspace and Admin › Operational Policy — branding, cities, dispatch radius, reason codes,
SLA policy, the concurrent-chat cap of **D22**. Those are **configuration**, they live in their own
clients, they are audited, and they are gated on `manage_workspace` / `manage_ops_policy` (**D17**).
**The test that tells them apart: if changing it changes what another operator sees, it is
configuration and not a preference.**

#### `DATA_SOURCE='http'`

Nothing special happens, which is the point.

- **`http`** — `preferences.ts` calls the endpoint. The `localStorage` cache still paints first, and
  the server response overwrites it. **The server always wins**; a cache that can override a fetch
  is not a cache.
- **`mock`** — the mock holds the bag in memory exactly as `session.ts` does today, and the
  `localStorage` cache is what makes it survive a reload. **This is the only reason the cache is
  worth building at all right now**, and that is stated so nobody mistakes it for architecture.
- **A failed read is not a blank console.** `preferences.get` is a registered operation id, so QA
  can fail it from the URL like every other read. On failure the screen renders **defaults** — not
  an ErrorState, because a column layout that will not load is not a reason to withhold the table.
  On a failed **write**, the operator sees a toast that says the preference did not stick. Silent
  write failure is how a preference appears to work for a week and then does not.
- **The cache is keyed `eyvar.<schemaVersion>.<userId>.<key>` and is cleared on sign-out.** Not
  namespacing by operator is the shift-change bug above.

#### What it means for the build

- **P0-T1 is answered. P1-T4 is unblocked** and is now: add the `localStorage` adapter to
  `lib/persistence.ts`, add `clients/preferences.ts`, point `defaultUiStore` at it. **The file's own
  header already promised this is a one-file change; it is.**
- **P1-T5** (page size + density) is unblocked and is class 2.
- **P3-T8 is unblocked** — the command palette's ④ recents block. **Recents are class 2 and
  per-operator, which is what makes them safe to render at rest.**
- **C-4 in `design/05-command-centre.md` is unblocked. CQ-6 is closed.**
- **D13's "whether a saved report persists" is answered: yes, class 3, and it already has a client.**
- **`session.ts` and `lib/persistence.ts` have different owners** — mock-data-engineer and
  utilities-engineer. This ruling touches both. **Neither writes the other's file.**

#### Acceptance criteria

**AC-906** — Reloading any index screen restores the operator's column visibility, column pins,
page size and density exactly as they were before the reload, with no user action.

**AC-907** — Reloading any index screen with a search term, a sort, a page number and filters
applied restores all four **from the URL**, and clearing browser storage does not change that.

**AC-908** — Signing out and signing in as a different seeded operator on the same browser shows
the second operator's column layout, page size and command-palette recents, and none of the first
operator's.

**AC-909** — With `preferences.get` set to fail, every index screen renders its default column
layout and page size, renders no ErrorState for the preference read, and the table's own data still
loads.

**AC-910** — With `preferences.patch` set to fail, changing a column layout shows a toast stating
the preference was not saved, and the next reload shows the previous layout.

**AC-911** — Setting the language to Arabic, reloading, and reloading again leaves the console in
Arabic both times. (Legacy reseeds `en` on every load, `:2570` — this is that defect closed.)

**AC-912** — A `UiState` payload carrying an unknown `schemaVersion` results in default preferences,
one toast, and no console error.

**AC-913** — Grepping `src/` for `localStorage` returns matches in `src/lib/persistence.ts` only.
No screen, hook or client reads it directly.

#### How it would be falsified

If operators turn out to work from **one fixed machine each and never share**, the server round-trip
buys nothing and a per-machine store would have been simpler — the observation would be a
preferences endpoint with a 1:1 operator-to-device ratio in its access log. If preference reads land
on the critical path and delay first paint on a slow connection, the cache-first order is wrong and
the fix is to render defaults immediately and reconcile, not to move the store. **Neither
observation would make `localStorage`-as-truth right**; both would change the fetch order.

---

### D17 — The role model: six roles, twenty keys, and a sub-tab declares TWO permissions, not one level

> **The ruling.** Eyvar Admin has **six named roles** — Owner, Ops Manager, Dispatcher, Trust &
> Safety, Finance, Support — over **twenty permission keys**; every sub-tab declares a **view key**
> and a **write key** (`PermissionLevel` is retired); the model is **a role baseline plus a signed
> per-user delta against a named role**, never a free-floating permission set; and a denied action
> **renders disabled in place, at rest, with a two-sentence reason that names the permission and the
> role that can grant it, as real text and never a tooltip.**

**D4 is closed. Q3 is closed. Q4 is closed. Q-78 is closed.** This unblocks **Phase 6b entirely**,
**P6-T9**, **CQ-7**, and the `roleRefusal` stub at `src/commands/registry.ts:356`.

#### The finding that had to be ruled first: `PermissionRef.level` cannot express the matrix

`PROPOSED-STRUCTURE.md` §10.3 is a 35 × 6 grid of `● full · ◐ read-only · ○ hidden`. The route table
models it as **one** `PermissionRef { key, level }` per row, and `shell/permissions.ts:79` reads:

```ts
export function canWriteSubTab(ctx, row) {
  if (row.permission === null) return true
  return row.permission.level === 'full' && ctx.permissions.includes(row.permission.key)
}
```

**`level` is a property of the ROW.** So a row is `full` or `read` for everybody. The matrix needs
Operations › People to be **●** for Ops Manager and **◐** for Finance *at the same time*, and the
current type cannot say that. **This is a modelling defect, not a missing value**, and shipping 35
`PermissionRef`s into it would have produced a matrix that silently collapses to one column.

> **The row declares two keys:**
> ```ts
> viewPermission:  PermissionKey        // never null except on admin-activity
> writePermission: PermissionKey | null // null = this sub-tab declares no write actions
> ```
> **`PermissionLevel` and `PermissionRef.level` are retired.** `● = holds both · ◐ = holds view only
> · ○ = holds neither`. Read/write is a fact about the **operator**, which is where it always was.

`isSubTabVisible` reads `viewPermission`; `canWriteSubTab` reads `writePermission` and returns
**`false`** when it is `null` — a sub-tab with no write key has nothing to write, and returning
`true` there is the same open-by-default that made `permission: null` mean "ungated".

**This is a `src/data/types/navigation.ts` + `fixtures/routeTable.ts` change and it belongs to
mock-data-engineer. `shell/permissions.ts` moves with it and belongs to the shell owner. Nobody
edits both.**

#### The twenty keys

Twelve survive, one is retired, eight are minted. **Every mint closes a named gap; none is
speculative.**

| Key | Status | Gates |
|---|---|---|
| `view_analytics` | **new** | The six Management sub-tabs. Four of them (`exec-overview`, `predictive`, `growth`, `zones`) are among the 19 legacy pages with no `PAGE_PERMISSIONS` entry to inherit (§10.5 Problem 2) |
| `view_operations` | **new** | The nine Operations sub-tabs |
| `view_finance` | existing (`:3229`) | The seven Financials sub-tabs |
| `view_support` | **new** | The six Support sub-tabs |
| `view_admin` | **new** | Admin › Overview, Workspace, Operational Policy, Communications, Data & Compliance |
| `view_profiles` | existing (`:3234`) | The 360° layer. **Enforced at zero call sites today** (§10.5 Problem 2); this makes it a real gate |
| `approve_drivers` | existing | Applications, compliance, **and suspension** |
| `manage_subscriptions` | existing | Subscriptions, corporate accounts |
| `live_ops` | existing | Dispatch, requests, trips, assurance |
| `manage_plans` | existing | Pricing plans **and promotions** |
| `process_payouts` | existing | Payouts |
| `release_escrow` | existing | Escrow **and payment controls** |
| `apply_deductions` | existing | Deductions, waivers, revenue adjustments, rider-wallet ledger writes |
| `manage_tickets` | existing | Tickets, disputes, fairness, **and the goodwill credit within the `compPolicy` cap** |
| `contact_users` | existing | Outbound contact — chat, email, push, calls |
| `manage_team` | existing | Operators, roles, overrides, sessions |
| `manage_ops_policy` | **new** | Dispatch radius, cities, limits, reason codes, SLA policy, **the D22 chat cap** |
| `manage_workspace` | **new** | General, branding, legal, communications, integrations |
| `manage_data_governance` | **new** | Retention, erasure, integrity, exports |
| `manage_security_policy` | **new** | Second-factor enforcement, session lifetime, re-auth window. **Closes Q-78**, which recorded that AC-663 fails visibly for want of this key |
| ~~`manage_settings`~~ | **RETIRED** | Was 39 of 131 guards, held by one person. §10.5 Problem 1. |

**Why five workspace read keys is completing a pattern rather than inventing one.** `view_finance`
already **is** a workspace read key and has been since the legacy app. The other four workspaces
have none, which is exactly why 19 pages have no entry. **The alternative — bending write-flavoured
keys like `live_ops` into view gates — reproduces `manage_settings`: one key doing two jobs, and
nobody able to grant half of it.**

**Why `manage_settings` splits into four and not three.** §10.5 recommended three. Security policy
does not belong in any of them: it is not ops tuning, it is not branding, and it is not data
governance — it decides **how people authenticate**, which is the highest-privilege setting in the
console. Folding it into `manage_workspace` would mean the person who edits the logo can turn off
the second factor.

#### The 35 rows

`● = view + write · ◐ = view only · ○ = not rendered`

| # | Sub-tab | view | write |
|---:|---|---|---|
| 1 | `management-overview` | `view_analytics` | — |
| 2 | `management-performance` | `view_analytics` | — |
| 3 | `management-risk` | `view_analytics` | `approve_drivers` |
| 4 | `management-growth` | `view_analytics` | `manage_plans` |
| 5 | `management-zones` | `view_analytics` | `manage_ops_policy` |
| 6 | `management-reports` | `view_analytics` | `view_analytics` |
| 7 | `operations-overview` | `view_operations` | — |
| 8 | `operations-my-work` | `view_operations` | `view_operations` |
| 9 | `operations-dispatch` | `view_operations` | `live_ops` |
| 10 | `operations-requests` | `view_operations` | `live_ops` |
| 11 | `operations-subscriptions` | `view_operations` | `manage_subscriptions` |
| 12 | `operations-corporate` | `view_operations` | `manage_subscriptions` |
| 13 | `operations-trips` | `view_operations` | `live_ops` |
| 14 | `operations-assurance` | `view_operations` | `live_ops` |
| 15 | `operations-people` | `view_operations` | `approve_drivers` |
| 16 | `financials-overview` | `view_finance` | — |
| 17 | `financials-revenue` | `view_finance` | `apply_deductions` |
| 18 | `financials-payouts` | `view_finance` | `process_payouts` |
| 19 | `financials-cash` | `view_finance` | `apply_deductions` |
| 20 | `financials-rider-wallets` | `view_finance` | `apply_deductions` |
| 21 | `financials-pricing` | `view_finance` | `manage_plans` |
| 22 | `financials-ledger` | `view_finance` | `release_escrow` |
| 23 | `support-overview` | `view_support` | — |
| 24 | `support-tickets` | `view_support` | `manage_tickets` |
| 25 | `support-disputes` | `view_support` | `manage_tickets` |
| 26 | `support-fairness` | `view_support` | `manage_tickets` |
| 27 | `support-safety` | `view_support` | `approve_drivers` |
| 28 | `support-contact-centre` | `view_support` | `contact_users` |
| 29 | `admin-overview` | `view_admin` | — |
| 30 | `admin-workspace` | `view_admin` | `manage_workspace` |
| 31 | `admin-team` | **`manage_team`** | `manage_team` |
| 32 | `admin-policy` | `view_admin` | `manage_ops_policy` |
| 33 | `admin-communications` | `view_admin` | `manage_workspace` |
| 34 | `admin-data` | `view_admin` | `manage_data_governance` |
| 35 | `admin-activity` | **`null`** | — |

**Three rows are deliberately irregular and each has a reason.**

- **`admin-team` is the one Admin row gated on its own write key.** Read-only access to Team &
  Access exposes the full operator roster, everyone's second-factor state and the whole permission
  matrix. There is no useful `◐` for it: either you administer operators or you have no business
  reading the list.
- **`admin-activity` has NO view key** — every authenticated operator can open the Activity Log, and
  **the rows are filtered server-side to entities the operator can otherwise see.** §10.3 gives all
  four existing roles `◐` on it, and an audit trail that only the accused can hide is not a control.
  **The filtering is server-side and is not optional**; a client-side filter over a full log is a
  leak in the network tab.
- **`operations-my-work` and `management-reports` are self-gating** — their write key is their view
  key. Claiming your own work and saving your own report require no authority beyond being able to
  see the screen. Without this, My Work is `◐` for Dispatcher and §10.4's "● on 5 of 9" is unmeetable.

#### The six roles

| Role | Keys | Lands on | New? |
|---|---|---|---|
| **Owner** | all 20 | `/management/overview` | no |
| **Ops Manager** | `view_analytics` `view_operations` `view_finance` `view_support` `view_admin` `view_profiles` `approve_drivers` `manage_subscriptions` `live_ops` `manage_plans` `manage_tickets` `contact_users` `manage_ops_policy` (13) | `/operations/overview` | no |
| **Dispatcher** | `view_operations` `view_profiles` `live_ops` `contact_users` (4) | `/operations/dispatch` | **yes** |
| **Trust & Safety** | `view_analytics` `view_operations` `view_support` `view_profiles` `approve_drivers` `manage_tickets` `contact_users` (7) | `/support/safety` | **yes** |
| **Finance** | `view_analytics` `view_finance` `view_profiles` `process_payouts` `release_escrow` `apply_deductions` `manage_plans` (7) | `/financials/overview` | no |
| **Support** | `view_operations` `view_support` `view_profiles` `manage_tickets` `contact_users` (5) | `/support/overview` | no |

**Trust & Safety lands on Safety & Incidents, not on Support › Overview**, because Overview's tiles
are ticket metrics they do not own and Safety is the queue they are paid to clear.

**Adopting §10.4's two roles is nearly free and the alternative is not.** `shell/permissions.ts` has
no role list in it — visibility is a filter over permissions, and its own header says adding these
two is *"a data change"*. And `DB.compPolicy` (`:15379`) already carries a `default` tier
(50/300 SAR), so **a new role gets a compensation cap on the day it is created** rather than
throwing. Declining the roles, by contrast, leaves Safety & Incidents write permanently
Ops-Manager-gated (§13.1 R5) and gives the shift dispatcher the Ops Manager's pricing authority.

**Every role gets a seeded holder in `fixtures/teamUsers.ts`.** A role with no holder is a role
nobody has tested, and the legacy seed already proves the failure mode:
`defaultPermissionsForRole()` (`:10521`) returns `[]` for a role with no existing member, so the
first Dispatcher invited would arrive with **zero** permissions.

#### Eight deliberate deviations from §10.3, named rather than absorbed

The matrix was drawn against a 13-key vocabulary and four roles. Under twenty keys and six, eight
cells move. **Each is a widening except the two marked, and none is an accident.**

| Cell | §10.3 | Ruled | Why |
|---|---|---|---|
| Ops Manager × Payouts & Escrow | ○ | **◐** | A workspace read key cannot hide two rows inside the workspace it opens. Read-only money is not a risk; a second key for it is |
| Ops Manager × Ledger & Payment Controls | ○ | **◐** | Same |
| Ops Manager × Admin › Workspace | ○ | **◐** | Read-only branding harms nobody. `admin-team` is the row that needed protecting and it has its own key |
| Finance × Market & Zones | ○ | **◐** | A zone map is not sensitive, and `view_analytics` is one key |
| Finance × Management › Growth | ◐ | **●** | Finance holds `manage_plans` for Pricing. *"May edit a plan but not a promotion"* is a distinction nobody can defend |
| Finance × Admin › Data & Compliance | ◐ | **○** | **A narrowing.** Exports of personal data are a governance function; Finance's export needs are served by the export control on each Financials ledger. Finance does not hold `view_admin` |
| Support × Operations › Corporate | ○ | **◐** | Support answers calls about corporate rides |
| **Support × Safety & Incidents** | ● | **◐** | **A narrowing, and the important one.** §10.3's own R5 says the Support role *"is not equipped for a suspension decision"*. **Trust & Safety now exists and holds it.** This is R5 applied, not overridden |
| **Support × Rider Wallets** | ◐* | **○** | **A narrowing.** The compensation credit Support genuinely needs mid-call is **a command on the rider's 360° profile**, gated on `manage_tickets` plus the `compPolicy` cap — not a Financials screen. Support does not need the Financials workspace at all, and the tile does not render |

#### Additive or strictly role-based: **both, in that order**

> **Effective permissions = the named role's baseline, plus a signed per-user delta.**
> A delta is `{ role: RoleName, granted: PermissionKey[], revoked: PermissionKey[] }`. **There is no
> such thing as an operator without a role**, and there is no free-floating permission set.

- **Computed server-side and delivered resolved on `Session.permissions`.** §8.2's rule already:
  *"a derived value is not a disabled input"*, and a console that re-derives its own authority will
  eventually disagree with the server that granted it.
- **The delta is displayed as a delta, never flattened.** Admin › Team & Access shows
  `Support + release_escrow − contact_users`, because a flattened list makes an exception look like
  a role and nobody ever audits it back.
- **Every grant, revoke and role change writes an audit entry naming both states.** The legacy
  already does this for role changes (`:10498`) and not for permission changes.
- **The F-016 guard is an invariant, not a warning:** the last holder of `manage_team` cannot be
  revoked it, suspended, offboarded, or role-changed away from it. The refusal names why.
- **Custom roles: yes, and they are a named role like any other.** A custom role is a name plus a
  key set; it can be deleted only when it has no holders.

#### What a denied action renders — §11.2 confirmed, with the copy shape ruled

**§11.2 stands: disabled in place, at rest, with the reason.** It is confirmed, not amended. What
was missing is the **shape of the reason**, and the code has three shapes today —
`'Needs the approve_drivers permission'` (`people/copy.ts:197`, which prints a machine key at a
human), the row-action `reason` string, and the bulk bar's stacked sentences.

> **One grammar, two sentences, one dictionary template:**
> ```
> perm.denied = 'You need the “{permission}” permission. {granter} can grant it.'
> ```
> `{permission}` resolves through `perm.label.<key>` — the legacy `PERMISSION_LABELS` strings
> (`:3225`), which are already sentences a human can read. `{granter}` resolves through
> `role.<name>.subject`.

Five clauses ride with it:

1. **The permission is rendered as a quoted label, never as a bare key.** `“Approve / reject driver
   applications”`, not `approve_drivers`. A key is a fact about the software.
2. **The granter names a ROLE, never a person.** Naming *"ask Sarah Al-Rashid"* leaks the roster to
   an operator who cannot open Team & Access.
3. **Real text, never a tooltip, and present at rest.** Already true of the bulk bar
   (`DataTable.tsx:1257`) and it now binds everywhere. A `title=` attribute is not keyboard
   reachable and does not survive translation review.
4. **`aria-describedby` links the disabled control to its reason**, so the refusal is announced
   rather than merely rendered.
5. **`route-forbidden` uses the same two sentences**, so the console has one refusal grammar
   instead of a screen grammar and a route grammar.

**Two i18n flags, raised because they will bite in Arabic and not in English.** `{permission}` is
safe: it is quoted, so it is a name and not a grammatical constituent — the same treatment
`<bdi>`-isolated entity names already get. **`{granter}` is not safe as a bare role name**: it opens
a sentence and Arabic needs a definite form. Hence `role.<name>.subject` as a **separate key from the
role's display name**, and translators get both. **If a translator reports that two sentences cannot
carry the meaning in one order, the fix is a second full template — never a concatenation.**

#### What it means for the build

- **P6-T5 … P6-T9 are unblocked. Phase 6b can start.**
- **P6-T9 is a data change only**, as the plan predicted: 35 rows gain two keys.
- **CQ-7 is closed.** `roleRefusal(ctx, permission, reasonKey)` at `registry.ts:356` currently voids
  its `permission` argument and reads `ctx.session.canWrite`. It now evaluates the key against
  `ctx.session.permissions`, and `CommandSession.canWrite` is deleted.
- **`AdminTeamScreen.tsx:20,36`'s hardcoded `ALL_PERMISSIONS` / `ROLE_PERMISSIONS` are superseded.**
  They were an engineer's guess at this ruling and they must
  not be wired until the real answer lands. **This is the real answer.**
- **`AC-61` becomes testable and `AC-56` gains real denials to assert against.**
- **D13's two permission holes are closed, and they are closed by construction:**
  - **A shared report is a stored QUESTION, never a stored answer.** Its measures resolve against
    the **viewer's** permissions at run time, so a `visibility: 'team'` report opened by an operator
    who cannot see a measure renders that series absent with the reason, not the numbers. **This is
    what makes a report safe to share, and it is a resolver rule, not a UI rule.**
  - **An alert rule's recipients are restricted to operators who could run it themselves.** §13.3
    already evaluates the rule as its owner; that is now paired with a recipient check **at delivery
    time, not at creation time**, so a role change stops the delivery. A recipient who has become
    unreachable is shown as such on the rule.
- **`specs/04-auth-and-onboarding.md` AC-610 and AC-663 unblock.** Q-78's missing key exists.

#### Acceptance criteria

**AC-914** — Signed in as the seeded Dispatcher, the rail renders exactly one workspace tile
(Operations) plus the pinned Admin tile, and Admin's sub-tab list contains only Activity Log.

**AC-915** — Signed in as the seeded Dispatcher, Operations lists nine sub-tab rows; Live Dispatch,
Requests, Trips, Trip Assurance and My Work offer their write actions enabled, and Subscriptions,
Corporate Accounts and People offer theirs disabled with a reason.

**AC-916** — Signed in as the seeded Trust & Safety operator, `Suspend captain` is enabled on
Operations › People and on Safety & Incidents, and every control on Financials is unreachable
because the Financials tile does not render.

**AC-917** — Signed in as the seeded Support operator, the `Suspend` control on Safety & Incidents
renders disabled and its reason reads `You need the “Approve / reject driver applications”
permission. An Owner can grant it.`

**AC-918** — Navigating directly to `/financials/payouts` as Support renders the forbidden state,
names the permission in the same two sentences as AC-917, and does not redirect.

**AC-919** — Every one of the 35 route-table rows carries a non-null `viewPermission`, except
`admin-activity`, which carries `null` and is asserted to be the only such row.

**AC-920** — Signed in as any role, Admin › Activity Log renders, and its rows contain no entry
naming an entity the operator cannot otherwise open.

**AC-921** — Granting `release_escrow` to the seeded Support operator as a per-user override makes
Financials › Ledger's escrow control enabled for them, and Team & Access displays their access as
`Support + release_escrow`, not as a flat list.

**AC-922** — Attempting to revoke `manage_team` from the last operator holding it is refused, the
refusal names the invariant, and the operator's permissions are unchanged afterwards.

**AC-923** — Every grant, revoke, role change and offboarding writes one audit entry naming the
operator, the actor, the previous state and the new state.

**AC-924** — The effective-permission preview for any operator lists exactly the keys that
`forbiddenReason` uses to allow or deny that operator, asserted by one test comparing the two.

**AC-925** — Grepping `src/` for `manage_settings` returns zero matches outside a comment recording
its retirement.

**AC-926** — A `visibility: 'team'` saved report whose query names a measure the viewer's role
cannot see renders that measure's series absent with a stated reason, and renders no value for it.

**AC-927** — An alert rule whose recipient no longer holds the permission to run its report delivers
nothing to that recipient, and the rule shows that recipient as unreachable.

#### How it would be falsified

If, after three months, **no operator holds Dispatcher or Trust & Safety**, the two roles were
organisational fiction and should collapse back into Ops Manager and Support — the observation is
the roster, and the reversal is deleting two rows and reassigning their holders. If the per-user
delta is used on **more than a quarter of operators**, the roles are cut wrong and the answer is to
re-cut roles, not to keep granting exceptions. If `view_analytics` and `view_operations` are always
granted together, they are one key wearing two names.

---

### D18 — Undo is an inverse operation on the seam, ten seconds, and it is what buys a command out of its confirm step

> **The ruling.** An action is undoable **only when its inverse is already a declared command in the
> same registry and no side effect escaped the console**; undo runs that inverse **through the data
> seam as a real, separately audited mutation** — never an optimistic local reversal — inside a
> **10-second window that is exactly the life of the toast offering it**; and **a command carrying an
> undo handle skips its confirmation, while `affordance: 'destructive'` without one must confirm.**

**CQ-5 is closed. P0-T3 is answered.**

#### Why a real inverse and not an optimistic reversal

- **The audit log is the product.** An optimistic reversal that never reaches the server records the
  suspension and not the retraction. The captain stays suspended in the truth and reinstated on the
  screen, and the operator who reads the audit trail next week has no way to know.
- **The mock and the http path would diverge.** A local reversal mutates React state; the mock
  clients return updated rows without writing them back (`people/useRowOverrides.ts`), and the http
  ones do not. **A local undo would be the one operation whose behaviour depends on `DATA_SOURCE` —
  the exact thing the seam exists to prevent.**
- **`CommandOutcome.undo` is already `{ label, run: () => Promise<void> }`** (`registry.ts:239`) — an
  async call, not a state setter. The shape already assumed this ruling; this names it.
- **The inverse can fail, and it must be allowed to.** A second operator may have edited the record
  in the ten seconds. A local reversal cannot discover that; a real one gets a 409 and can say so.

#### What is undoable

**The test is mechanical: an action is undoable iff (a) its inverse is a declared command in the same
registry, and (b) nothing left the console — no message to a customer, no money moved, no
notification pushed, no third party told.**

| Undoable — no confirm, undo on the toast | Not undoable — confirms, no undo offered |
|---|---|
| Suspend ↔ Reinstate a captain | **Anything that sends** — chat reply, email, push, SMS |
| Claim ↔ Release (a queue row, a conversation) | **Anything that moves money** — refund, payout release, escrow release, wallet credit, deduction, waiver |
| Freeze ↔ Unfreeze plan access | **Approve / reject an application** — the applicant is notified |
| Snooze ↔ Un-snooze a conversation | **Erasure execution** (PDPL) |
| Close ↔ Reopen a conversation or ticket | **Offboarding an operator** — sessions die |
| Assign / unassign a tag, an owner, a reason code | **Transfer** a conversation — someone else owns it now (**D19**) |
| Archive / restore | **Take-over** of another operator's claim |

**Approve/reject is the entry that will be argued and it is settled here.** D8 renders it as two
one-click row controls and asks *"say what confirms it, or what undoes it."* **It confirms.** An
approval sends the applicant a decision; the console cannot unsend it, and an undo affordance for
something that already left the building is a lie with a button on it.

#### The window: **10 seconds, and it is the toast**

`sonner.tsx:57` ships `duration={5000}`. **A toast carrying an undo handle lives 10 000 ms; every
other toast keeps 5 000.** One override, one place.

- **There is no undo that outlives its affordance.** A window longer than the toast is a promise
  nobody can see, and it lets the inverse race a second operator's edit for a period the operator
  cannot perceive.
- **10 and not 5** because the operator has to *read* the toast before deciding it was wrong, and
  R9's one-line message plus a decision does not fit in five seconds at the end of a shift.
- **Hovering the toast pauses its timer** — already `sonner`'s behaviour, and it means an operator
  who noticed but is mid-sentence does not lose the window.
- **The window does not extend on bulk.** Twelve records undone is one inverse over twelve ids.

#### The toast shape

| Slot | Rule |
|---|---|
| **Message** | R9 — one line, **names the object**, no full stop. `Nora Al-Harbi suspended` · `12 captains suspended` |
| **Action** | One control, labelled `Undo`. Never an icon, never `Cancel` — `Cancel` reads as *stop the thing in progress* |
| **On success** | A **second** toast: `Suspension reverted for Nora Al-Harbi`. **It carries no undo of its own** — an undo of an undo is a loop with no floor |
| **On failure** | The toast **becomes critical in place**, states that the reversal failed and why, offers `Try again` **once**, and — crucially — **leaves the original action's effect on screen**, because it is still the truth |
| **Second failure** | The `Try again` is replaced by a link to the record. The console stops promising something it has failed at twice |
| **Never** | Silent swallow. A failed undo that closes quietly leaves the operator believing they retracted something they did not |

**An undo is audited as its own entry, never as a deletion of the original.** Two entries: the act
and the retraction. A log that can erase its own rows is not a log.

#### Confirm vs. undo — the ruling CQ-5 actually asked for

> **A reversible command skips its confirmation. An irreversible one confirms. Reversibility is the
> price of skipping the dialog, and there is no third state.**

One clarification, because `Suspend captain` looks like a counter-example and is not:
**`arity: 'needs-input'` always shows its input step, and an input step is not a confirmation.**
Suspension requires a written reason (`clients/drivers.ts` requires it by contract; a suspension with
no stated reason is not appealable), so the modal stays — but it is asking for the reason, not asking
*are you sure*, and it loses its "are you sure" framing. Skipping applies to `immediate` and
`needs-target` only.

**The palette's confirm step (§3) is unaffected** and keeps its own rule: a destructive command
reached from the palette confirms *in* the palette. Two shapes, one decision, as
`design/05-command-centre.md` already recorded.

#### What it means for the build

- **P3-T9 and P4-T2 are unblocked**, and P4-T2's second half is now specified: `destructive` without
  an undo handle requires the confirm step, enforced in `registry.ts`, not per screen.
- **D8's open constraint is answered once**, product-wide, instead of per queue.
- **`captains.ts`'s `suspend` and `reinstate` become each other's undo handle** — no new client
  operation. This is the cheapest possible first implementation and it is the proof of the model.
- **Every registry author now has a mechanical test** for whether to write an undo handle, so the
  question is not re-litigated per domain.
- **`CommandOutcome.undo` stops being an unset field**, and its comment (`registry.ts:233`) can drop
  its "the owner's call is still open" note.

#### Acceptance criteria

**AC-928** — Suspending a captain shows a toast naming that captain and offering `Undo`, and the
suspension is applied without any "are you sure" confirmation appearing.

**AC-929** — Pressing `Undo` on that toast returns the captain to the state they were in before, and
a second toast confirms the reversal and offers no `Undo` of its own.

**AC-930** — Eleven seconds after a suspension, the toast is gone and there is no other affordance
anywhere in the console that reverts that specific action.

**AC-931** — With the inverse operation set to fail, pressing `Undo` leaves the captain suspended,
turns the toast critical, states the failure, and offers `Try again` exactly once.

**AC-932** — Approving an application shows a confirmation dialog before it is applied, and its
outcome toast offers no `Undo`.

**AC-933** — Releasing an escrow shows a confirmation dialog and its outcome toast offers no `Undo`.

**AC-934** — Undoing a suspension leaves two audit entries — the suspension and its reversal — and
removes neither.

**AC-935** — Suspending twelve selected captains and pressing `Undo` once returns all twelve, and
the confirming toast names twelve.

#### How it would be falsified

If operators press `Undo` on **fewer than one action in fifty**, the confirm step was doing useful
work and removing it traded a cheap dialog for an expensive mistake. If undo **failures** are
common — a 409 rate above a few percent — the ten-second window is racing real concurrent edits and
should shrink, not grow. If operators report reaching for undo **after** the toast has gone, the
window is too short and the answer is a per-record `Revert` on the detail page, not a longer toast.

---

### D19 — The support conversation centre: chat and email, a pull queue, and grab is a reversible claim

> **The ruling.** Support › Contact Centre becomes the conversation console: it ships **`chat` and
> `email`** with a compose path, **`phone` read-only** and **`whatsapp` modelled but with no rows and
> no compose**; the queue is **pull-only with no auto-assignment**; **"grab" is `claim` and it is
> reversible by `release`**; **transfer exists, confirms, and is not undoable**; availability is
> **`online · away · offline` with auto-away and a hard concurrent cap (D22)**; and **email and chat
> are one conversation, with a channel switch as an explicit, refusable act.**

**P0-T4 is closed**, and the work behind it is sized.

#### What was already built, and what this ruling is therefore not allowed to move

`types/conversation.ts`, `clients/conversations.ts`, `clients/realtime.ts` and
`fixtures/conversations.ts` exist and are tested — 12 seeded conversations across all four channels,
a claim contract shared with the five wave-2 queues, a per-topic `seq` with gap detection, and a
delivery state machine where `failed` is reachable from any state. **The model is channel-agnostic
by design and this ruling does not change one field of it.** It rules the **UI scope and the
transport**, which is exactly the boundary P0-T4 was written to respect.

#### Channels

| Channel | Ships | Why |
|---|---|---|
| `chat` | **Yes — read and compose** | The owner's ask, verbatim: *"chat with users in live chat"* |
| `email` | **Yes — read and compose** | The owner's ask, verbatim: *"emailing the user with tickets"* |
| `phone` | **Read-only.** Call notes, logged from the console. No compose | `CNV-106` is already a conversation whose every message is internal. A phone channel has no customer-visible message to compose |
| `whatsapp` | **Modelled, no rows, no compose.** The value stays in the union; the channel facet shows it at zero | It needs a vendor and a business account. **A compose box for a pipe that does not exist is the worst possible state** — the operator types, presses send, and the message goes nowhere |

**Transport: the console owns it, behind `clients/realtime.ts`. No vendor is named.** The seam is
already built with a socket driver and a mock driver behind one interface. Naming a vendor
today buys nothing and costs a schema shaped like their webhook. **If a vendor is signed, it becomes
a third `RealtimeDriver` and a `providerMessageId` that stops being `null` — the field is already
there for exactly that day.**

#### The queue

Default view **Unassigned**, sorted **breached-first, then `waitingSince` ascending** (D22).
Views: `Unassigned · Mine · Waiting · Active · Snoozed · Closed`, matching the `view=` values
`clients/conversations.ts` already declares.

A row shows, and shows nothing else: **channel badge · entity name (a link to the 360° layer) ·
subject, or the first customer-visible message where the channel has no subject · the waiting
countdown · unread count · the ticket link if there is one · the claim holder if it is claimed.**

- **`lastMessagePreview` is customer-visible messages only.** The type already says so. The preview
  is the thing an operator screen-shares.
- **`CNV-107` — a conversation with no messages at all — is a real row** and renders the entity and
  the countdown with no preview, not a blank line.
- **`CNV-108` — 64 messages, one page loaded — must render `messageCount`, not `messages.length`.**
- **The queue is a §8.4 work queue and reuses `screens/queues/`.** Claim affordance, confirm dialog,
  SLA countdown and the R5a breached-row marker already exist and are tested.

#### Grab, release, take-over, transfer

| Act | Confirm? | Reversible? | Rule |
|---|---|---|---|
| **Grab** (`claim`) | No | **Yes — `release`** | One click. It is reversible, so **D18** buys it out of the dialog. Refused at the concurrent cap (**D22**) with the reason naming the number |
| **Release** | No | Yes — grab again | The conversation returns to Unassigned with its waiting clock **unreset** |
| **Take-over** | **Yes** | No | Another operator holds a live claim. The dialog **names the holder**. Writes a `ClaimTakeover`. Refused at the cap |
| **Transfer** | **Yes** | **No** | Names a target operator. Writes a `ClaimTakeover`. **Posts a system message into the thread**, so the receiving operator's context is in the thread and not in a handover conversation elsewhere |

- **A claim idle past `OWNERSHIP_STALE_MINUTES` (30) is already free** — the shared contract, and it
  is what stops an operator who walked away at 02:00 from holding a waiting customer hostage.
- **Transfer to an `offline` operator is refused**, with the reason naming their state. Transfer to
  `away` is allowed — away is lunch, not gone.
- **Transfer is not undoable** and therefore confirms: somebody else owns it the moment it lands, and
  a silent bounce-back is worse than a second transfer.

#### Availability, and the ruling that sizes the phase

> **The queue is PULL. Nothing is auto-assigned in v1.**

Push routing needs a routing engine, a skills model, an overflow policy and an escalation ladder,
**none of which exists in any spec**, and a pull queue with a visible cap is where support consoles
converge anyway. This removes P5-T6's *"routing that respects both"* from v1 and leaves the cap,
which is the half that does real work.

- **Three states — `online · away · offline`** — set by the operator from the top bar.
- **Auto-away after 10 minutes** with no console interaction. Auto-offline when the presence
  heartbeat lapses (sign-out, tab close, connection loss).
- **`AgentPresence.activeCount` is the counter, and it is derived** — the type already says
  *"Derived, never stored"*. It is the only thing the cap reads.
- **Only `online` operators appear as transfer targets** by default, with `away` behind a disclosure
  and `offline` refused.
- **Going `offline` does not release claims.** They stay held and go stale on the normal 30-minute
  clock. Auto-releasing on a dropped connection would dump a live conversation back into the queue
  because somebody's wifi blinked.

#### How email and chat relate

> **One conversation, one primary channel, many message channels — and a channel switch is an
> explicit act that can be refused.**

- `Conversation.channel` is the primary. `Message.channel` is per message. **Both already exist**,
  and the type's own comment says why: *"a chat escalated to an email is one conversation with two
  message channels, and losing that is losing the audit trail."*
- **The switch is one control — `Reply by email`** — which stamps `message.channel = 'email'` and
  **requires the customer to have an email `handle`**. With no handle it renders **disabled in place
  with `no_handle` as the reason**. `CNV-110` exists to exercise exactly this and it is the one
  delivery failure a mock can produce honestly.
- **A ticket is created FROM a conversation, never the reverse in v1.** One control, `Create ticket`,
  stamping `ticketId` on the conversation and `conversationId` on the ticket.
- **`TicketMessage` folds into `Message`.** One thread per conversation. Two message types on one
  thread is how a reply gets composed into the wrong half.
- **Canned responses are in scope** (P5-T8): one object, three uses — a chat reply, an email body,
  and a bulk action over a selected set. They are class 3 under **D16** and their store is Admin ›
  Communications › Templates (**D20**).
- **An internal note is `visibility: 'internal'`, is visibly not sent, and carries no delivery
  state.** `deliveryIsWellFormed` already asserts the invariant; the UI must not draw a tick on a
  note.

#### The pattern, and one finding escalated rather than invented

Per `docs/ref/patterns.md`, `contacts` maps to **Index table**. That row describes the *legacy* phone
roster and does not describe this screen.

- The **queue** is `DESIGN.md` §6.4's **Work queue (§8.4)** row — P5-T4's own words, *"a chat queue
  is a queue"*.
- The **conversation pane** is the **Two-column detail (§2.2, §3.8)** row — a thread with a right
  rail carrying the customer, the ticket and the history.

**These are two existing rows composed, not a new page shape**, and `patterns.md`'s `contacts` row
must be re-pointed at them.

> **FINDING F-R5-1, routed to product-designer, not resolved here.** **§6.4 has no row for a message
> composer that SENDS.** §4 governs a form that *saves* — dirty state, a save bar, a discard. A
> composer has no dirty state worth preserving, no discard, an irreversible primary, and a per-message
> delivery state rendered after the fact. **Per `patterns.md`'s own rule — *a page with no row here
> may not be designed until it gets one* — this needs a §6.4 row before design starts.** It is the
> same shape of blocker **D14** recorded for the auth card, and it is raised the same way rather than
> invented in a component file.

#### What it means for the build

- **P5-T4 … P5-T9 are unblocked and sized.** P5-T6 loses its routing half and keeps availability and
  the cap.
- **The contact-centre screen's hardcoded agent list and captain metrics are superseded** by
  `AgentPresence` over `clients/realtime.ts`. A separate `clients/contactCentre.ts` is **not
  needed** — `clients/conversations.ts` already covers it. One fewer client to build.
- **P5-T7 keeps P6-T2 as its precondition** (sender identity and templates), unchanged.
- **`whatsapp` shipping as a modelled-but-empty channel is what makes the facet honest**: the
  operator sees that email exists and is empty rather than assuming chat is all there is.
- **Ticket fixtures contradict rider fixtures** — `TKT-501` names `RDR-1041` *Mohammed Al-Ghamdi*,
  `riders.ts:22` names them *Nora Al-Harbi*. **Two support
  screens will disagree in front of a customer.** Fix before P5-T4, not after.

#### Acceptance criteria

**AC-936** — Support › Contact Centre opens on the Unassigned view, listing only conversations with
no live claim, ordered breached-first then oldest-waiting-first.

**AC-937** — Each queue row renders a channel badge, the entity name as a link to the 360° layer, a
preview drawn only from customer-visible messages, and a waiting countdown; `CNV-107` renders with no
preview and does not render an empty line where one would be.

**AC-938** — `CNV-108` renders a message count of 64 while showing one page of messages, and offers a
control to load earlier messages.

**AC-939** — Pressing `Grab` on an unclaimed conversation assigns it to the current operator with no
confirmation dialog, and `Release` returns it to Unassigned with its waiting countdown continuing
from where it was.

**AC-940** — Pressing `Grab` on a conversation another operator holds shows a confirmation naming
that operator; confirming records a take-over that is visible in the conversation's history.

**AC-941** — Transferring a conversation shows a confirmation, posts a system message into the
thread naming both operators, and offers no undo.

**AC-942** — An operator whose presence is `offline` does not appear in the transfer target list, and
selecting one by any means is refused with a reason naming their state.

**AC-943** — On `CNV-110`, whose customer has no email handle, `Reply by email` renders disabled with
a reason stating there is no email address on file, and no message is queued.

**AC-944** — Composing an internal note and sending it renders it visibly distinct from a customer
message, shows no delivery tick, and it does not appear in the queue row preview.

**AC-945** — A message whose delivery enters `failed` renders as failed with its reason and offers
`Send again`; a message in `sent` or `delivered` offers no such control.

**AC-946** — With the realtime subscription dropped and reconnected across a `seq` gap, the open
conversation refetches and no message is missing from the thread.

**AC-947** — `Create ticket` on a conversation produces a ticket linked to it in both directions, and
the conversation row then renders the ticket link.

**AC-948** — The channel facet lists all four channels with their counts, and `whatsapp` shows zero
and offers no compose control anywhere in the console.

#### How it would be falsified

If operators end up **releasing more conversations than they close**, pull is not working and the
queue needs assignment — the observation is the release:close ratio. If a meaningful share of chats
are answered by an operator who was not looking at the queue, presence is decorative. If WhatsApp
volume arrives before a vendor does, the empty facet becomes a daily complaint and the channel needs
sizing rather than modelling.

---

### D20 — Admin scope: nineteen named panes across the seven existing sub-tabs, and no eighth sub-tab

> **The ruling.** Admin is complete when **nineteen named panes** exist across the **seven existing
> Admin sub-tabs**, each reading a client and persisting its writes; **API keys and webhooks ship**
> as an Integrations pane on Admin › Workspace; **feature flags do not ship**; and **the sub-tab
> count stays 35.**

**P0-T5 is closed.**

**The count is protected on purpose.** D1a moved the count once, D15 proposes moving it again, and
the register already records what a second unannounced signature costs. **An Admin scope ruling that
mints an eighth sub-tab would be a third move, from the one person who was told to protect the
count.** Everything below is a pane inside a `P4` settings shell (§2.4), which is a pane list by
construction.

#### The nineteen panes

| Sub-tab | Pane | Reads | Write key | Done when |
|---|---|---|---|---|
| **Overview** | *(metric board — out of scope of this ruling; held behind D15 / Q-D16)* | — | — | — |
| **Workspace** | **General** | `clients/workspace` | `manage_workspace` | Name, timezone, currency and default locale persist across reload and are audited |
| | **Branding** | `clients/workspace` | `manage_workspace` | **One logo store.** Closes the legacy defect of `DB.branding.logoUrl` and `DB.opsConfig.general.logoDataUrl` never synchronising |
| | **Legal** | `clients/workspace` | `manage_workspace` | Documents with versions and an acceptance record per version. Publishing a version is audited |
| | **Integrations** | new `clients/integrations` | `manage_workspace` | API keys issued, scoped, rotated and revoked, **the secret shown exactly once**; webhooks with a target, a secret, a per-event subscription and a **delivery log with a replay control** |
| **Team & Access** | **Operators** | `clients/session` | `manage_team` | Invite, **resend**, **revoke**, suspend, reinstate, **offboard** — the four in bold are legacy **F-016** and absent today. The F-016 guard refuses the last `manage_team` holder |
| | **Roles & permissions** | new `clients/rbac` | `manage_team` | The **D17** matrix, editable; custom roles; **effective-permission preview** computed from the same predicate the router uses |
| | **Per-user overrides** | `clients/rbac` | `manage_team` | A signed delta against a named role, **displayed as a delta**, audited on every change |
| | **Sessions & devices** | `clients/auth` | `manage_team` | Another operator's sessions listed and revocable. `session.devices` and `revokeDevice` **already exist and no admin surface calls them** |
| | **Security policy** | new `clients/securityPolicy` | **`manage_security_policy`** | Second-factor enforcement, session lifetime, re-auth window. **Closes Q-78 / AC-663.** The per-user `twoFA` toggle (`:3047`) and the workspace `require2FA` switch (`:8028`) are **not** rebuilt — spec §4.2 retires both |
| **Operational Policy** | **Dispatch** | `clients/zones` | `manage_ops_policy` | Radius, the 3-minute instant search, the 2-hour subscription window and the 20-minute backup-offer window all editable by an **Ops Manager without the founder**, which is why §10.5 exists |
| | **Cities** | `clients/zones` | `manage_ops_policy` | **The single city store.** Today the list exists three times — `fixtures/zones.ts:89`, `AdminPolicyScreen.tsx:24`, `ZonesMapView.tsx:110` — which is legacy F-029/F-030 rebuilt |
| | **Limits** | `clients/policy` | `manage_ops_policy` | Multi-subscription cap, debt ceiling, per-role compensation authority (`compPolicy`), **and D22's concurrent-chat cap** |
| | **Reason codes & SLA** | `clients/policy` | `manage_ops_policy` | 40 codes over 4 tiers, per-code `fr`/`res`/`upd` where set and inherited where `null`. **Legacy F-014 — saving destroys tier inheritance for all 40 codes — is the trap; a test asserts a save leaves every `null` still `null`** |
| **Communications** | **Sender identities** | new `clients/templates` | `manage_workspace` | A verified from-address per identity; an unverified one cannot be selected |
| | **Templates** | `clients/templates` | `manage_workspace` | Transactional templates **and D19's canned responses in one store**, with preview and per-locale bodies |
| | **Push composer** | `clients/notifications` | `manage_workspace` | Audience, preview, send, and a record on the delivery log |
| | **Delivery log** | `clients/templates` | — | The existing `inbox` / `outbox` views, per-message state, a failure reason where there is one |
| **Data & Compliance** | **Integrity checks** | new `clients/integrity` | `manage_data_governance` | Orphan and reconciliation checks, **each row naming the check that found it**. Zero coverage today |
| | **Retention & erasure** | `clients/integrity` | `manage_data_governance` | Retention window, erasure queue, PDPL execution — audited on request and on execution, and **not undoable** (**D18**) |
| | **Exports** | `clients/integrity` | `manage_data_governance` | Request, status, download, expiry |
| **Activity Log** | *(one pane, already specified)* | `clients/audit` | — | Wired to `listAuditEntries()`, which already exists; `INITIAL_LOGS` at `AdminActivityScreen.tsx:27` deleted |

**Nineteen panes**, against the legacy's 17 Admin-side panes plus Activity. The three legacy panes
with **no built UI at all** — `emails` (0 references), `reasons` (1), `integrity` (0) — are Templates
/ Sender identities, Reason codes & SLA, and Integrity checks. **AC-15 walks the route table and not
the screens, which is how three empty panes passed it**; that is now three named panes with a
done-condition each.

#### What is ruled OUT, and why

- **Feature flags — OUT.** A flag store the console can edit that **no runtime reads** is a settings
  pane that does nothing, and it would be the fourth pane in this product's history to pass a
  route-table test while rendering nothing an operator can use. It ships when a runtime reads flags.
  *(Cheapest possible reversal: one pane on Workspace, beside Integrations.)*
- **Impersonation — OUT unless asked for.** The plan's own recorded rule. Legacy F-002/F-003 are a
  total RBAC bypass with no indicator and no way back. **If it is wanted it ships permission-gated,
  time-boxed, with a persistent banner and an audit entry on entry AND exit.** It is not built on a
  guess.
- **An eighth Admin sub-tab — OUT.** See above.
- **Per-tenant configuration inheritance — OUT.** **D16**: one workspace, one roster.

#### What it means for the build

- **P6-T10 is IN and lands as Workspace › Integrations. P6-T11 is OUT.** Phase 6c halves.
- **P6-T1 is satisfied by Remediation Waves 2–4**, unchanged — the plan already says these are the
  same work, done once.
- **P6-T2, T3, T4 keep their scope** and now each have a done-condition.
- **P6-T5 … T8 are unblocked by D17.**
- **Four new clients**: `integrations`, `rbac`, `securityPolicy`, `templates`. `disputes` from
  The presence seam is unaffected by this ruling; **`contactCentre` is cancelled by D19.**
- **`INITIAL_CITIES` (`AdminPolicyScreen.tsx:24`) and `CITIES_DATA` (`ZonesMapView.tsx:110`) are
  deleted**, not reconciled. One store.

#### Acceptance criteria

**AC-949** — Every one of the nineteen panes renders, is reachable from its sub-tab's pane
navigation, and none renders a placeholder or a TODO.

**AC-950** — Changing a value in any pane and reloading shows the changed value; changing it writes
one audit entry naming the pane, the field, the previous value and the new one.

**AC-951** — Issuing an API key displays its secret exactly once; reopening the key's row afterwards
shows only its prefix and offers rotate and revoke.

**AC-952** — A webhook endpoint that fails delivery appears in the delivery log with its failure
reason and can be replayed from there.

**AC-953** — Saving Reason codes & SLA with no field edited leaves every code whose `fr`, `res` or
`upd` was inheriting still inheriting. (Legacy F-014.)

**AC-954** — Attempting to offboard the last operator holding `manage_team` is refused with a reason,
and that operator remains active.

**AC-955** — An Ops Manager can change the dispatch radius, the three search windows, the cities list
and every reason-code SLA without any Owner action.

**AC-956** — The city list rendered on Admin › Operational Policy, on Management › Market & Zones and
on the zones map is the same list, asserted by one test reading one fixture.

**AC-957** — Signed in as an Ops Manager, the Security policy pane on Team & Access is not reachable,
and navigating to it directly renders the forbidden state naming `manage_security_policy`.

#### How it would be falsified

If Integrations sits unused for a quarter — no key issued, no webhook registered — it was scoped on
an assumption about integration demand that was wrong, and the observation is the key table's row
count. If operators ask for feature flags within a month of Integrations shipping, the flags call was
wrong and it is one pane to add. If the nineteen panes prove to be too many surfaces for seven
sub-tabs to navigate, the failure is the §2.4 settings shell and not the pane list.

---

### D21 — Bulk set semantics: RATIFIED, with the third sentence written and one escape hatch that is not a partial apply

> **The ruling.** A bulk command is **refused if any selected record would be refused**, the refusal
> **names the count**, there is **no partial apply**, and the escape hatch is a single control —
> **`Select only the N eligible`** — which changes the operator's selection visibly and by their own
> act before the command becomes available.

**The proposal is ratified.** It is already implemented at `src/commands/captains.ts:81` and its
reasoning is already written at `registry.ts:308`. **This ratification adds the two things it was
missing: the third sentence, and the escape hatch.**

#### Why all-or-nothing, restated so it is not re-litigated

Three readings were possible and two are wrong.

- **Run on the eligible subset** — silently drops records the operator selected. The bulk bar says
  `12 selected`, the toast says `7 suspended`, and the operator's mental model of what they just did
  is wrong in a direction they will not check.
- **Refuse only when every target is ineligible** — lets the bulk bar act on a record the row kebab
  refuses. **That is the exact divergence C-1 exists to remove**, reintroduced at the set boundary.
- **Refuse if any would be refused** — the operator's selection is always exactly what was acted on.

#### The copy shape: three sentences, not two

Today each predicate declares `.one` and `.other`. **`.other` is wrong when every target is
blocked** — `3 of the selected captains are already suspended` is true of 3-of-3 and invites the
operator to believe a subset is fine. **A third key, `.all`:**

| Case | Key | English |
|---|---|---|
| 1 target, blocked | `<domain>.action.<verb>.blocked.one` | `This captain is already suspended.` |
| N targets, some blocked | `<domain>.action.<verb>.blocked.other` | `{count} of the selected captains are already suspended.` |
| **N targets, all blocked** | **`<domain>.action.<verb>.blocked.all`** | **`All {count} selected captains are already suspended.`** |

**Which sentence appears changes what the operator does next** — deselect a few, or pick a different
action — which is the whole reason it is worth a third key. The `.one` and `.other` strings above are
verbatim from `screens/operations/people/copy.ts:211–215` and do not move.

**Rendering rules, all of which already hold somewhere and now hold everywhere:**

1. **Real text above the bulk bar, never a tooltip** — `DataTable.tsx:1257` already does this.
2. **The control stays visible and disabled**, per §11.2. It is not hidden.
3. **`aria-describedby` links the disabled control to its sentence.**
4. **The count in the sentence is `formatCount(blocked.length, language)`** — Arabic-Indic digits
   where the locale asks for them. Never `String(n)`.
5. **A permission refusal (D17) outranks a domain refusal.** `roleRefusal(...) ?? domainRefusal(...)`
   — already the shape at `captains.ts:192`. Telling an operator *three are already suspended* when
   the real answer is *you may not suspend anyone* wastes their time twice.

#### The escape hatch: a selection change, not a partial apply

> **`Select only the N eligible` — one control, inside the refusal text, which deselects the blocked
> records and leaves the command available.**

This is not a partial apply and the difference is the whole point: **the selection changes visibly,
in the operator's own act, and the bulk bar's count updates before the command runs.** The toast can
then never name a different number from the bar. It also makes the strict rule cheap, which is what
makes it survivable on a queue somebody works all day.

Three constraints on it:

- **It is not offered when every target is blocked** — there is nothing to narrow to. That case gets
  the `.all` sentence and no control.
- **It is a control in the refusal text, not a fourth button on the inverted bar.** D10b's bar is
  already at its width budget and the refusal panel is where the explanation lives.
- **It never runs the command.** It only changes the selection.

#### What it means for the build

- **`DataTable`'s bulk-action contract gains `eligibleIds?: ReadonlySet<string>`** beside `disabled`
  and `reason`, so the bar can render the control without recomputing a predicate the command owns.
  **`DataTable.tsx` is a Phase-0 shared component: the shell owner makes this change, no screen
  implements it locally** — the same rule D8-b already applied to the kebab threshold.
- **Every `unavailable` predicate declares three sentences, not two.** Cheap now,
  a six-registry retrofit later — the same argument that put Arabic `keywords` in early.
- **P4-T1's ten screens inherit all of it** with no per-screen decision.
- **`registry.ts:308`'s comment stops being "flagged to product-designer as the one ruling this task
  had to make to land" and becomes a citation of this entry.**

#### Acceptance criteria

**AC-958** — Selecting twelve captains of whom three are already suspended and opening the bulk bar
shows `Suspend` disabled, with the sentence `3 of the selected captains are already suspended.` as
visible text above the bar.

**AC-959** — In that state, pressing `Select only the 9 eligible` reduces the selection to nine, the
bulk bar's count reads nine, `Suspend` becomes enabled, and no suspension has yet occurred.

**AC-960** — Selecting three captains all of whom are already suspended shows `All 3 selected
captains are already suspended.` and offers no `Select only…` control.

**AC-961** — For any bulk command, the number in the outcome toast equals the number that was in the
bulk bar when it was invoked, in every case including a refused one.

**AC-962** — For a role lacking the write permission, the bulk bar's refusal is the permission
sentence from **D17** and not a domain sentence, even when some selected records would also be
refused on domain grounds.

#### How it would be falsified

If operators press `Select only the N eligible` **on nearly every bulk action**, the strict rule is
friction and the partial apply is what they actually wanted — the observation is that control's press
rate against bulk invocations. If they instead abandon the bulk bar and act row by row, the refusal
sentence is not telling them what to do next and the copy is wrong, not the rule.

---

### D22 — Chat SLA and the concurrent-chat cap: 45 seconds, 20 minutes, three at a time

> **The ruling.** A `chat` conversation with no ticket promises **first response in 45 seconds** and
> **resolution in 20 minutes**; an `email` conversation with no ticket promises **4 hours** and
> **24 hours**; a conversation **with** a ticket inherits that ticket's reason-code SLA and has no
> second clock; **a first-response breach sorts the row above every non-breached row**, while a
> **resolution breach does not reorder anything** and instead raises `Create ticket` to primary; and
> an operator may hold **three live chats at once**, configurable 1–8 per role in Admin ›
> Operational Policy › Limits.

Both numbers were `unset`. **They are now set, and `SlaSource` gains a fourth value —
`'chat-policy'` — because calling a number nobody inherited `legacy-policy` would be a lie about
provenance.** `types/conversation.ts` says outright: *"Open question for the owner: what is the
first-response promise on a chat with no ticket behind it?"* This is that answer.

#### The numbers, and where each comes from

| Channel | First response | Resolution | Source |
|---|---|---|---|
| `chat`, no ticket | **45 s** | **20 min** | `chat-policy` |
| `email`, no ticket | **4 h** (240 min) | **24 h** (1 440 min) | `chat-policy` |
| `whatsapp`, no ticket | 4 h | 24 h | `chat-policy` — same as email; a send can fail hours later |
| `phone` | none | none | `unset`. Call notes have no promise |
| **any channel, with a ticket** | **the ticket's `rcTargets(code).fr`** | **`.res`** | `legacy-reason-code` — real, shipped, per-code |

- **45 seconds, not 30 and not a minute.** The promise is measured against a customer sitting and
  watching. Under a minute is the convention; **45 s is inside a minute and is reachable while
  reading one screen**, which is what makes it a promise rather than an aspiration. It is also the
  number the cap of 3 is derived from — 15 s of attention per chat per minute.
- **Email 240 / 1 440 are not invented.** They are `T4.firstResponseMin` and `T2.resolveMin` from
  the shipped `DB.slaPolicy` (`:14650`). Reusing shipped numbers for a channel with no live customer
  is cheaper to defend than minting two more.
- **Not the ticket tiers for chat.** T1's `firstResponseMin: 0` and T4's `240` are both wrong for a
  live chat — one is unmeetable, the other is four hours with a person watching a cursor.

#### What a breach does — and the half that does nothing, deliberately

> **First-response breach reorders. Resolution breach does not.**

- **First-response breach sorts the row above every non-breached row**, regardless of
  `waitingSince`, and carries the **R5a leading-edge marker** and the §8.4 page banner with `Show
  only breached`. Within the breached set, oldest first.
  **Why an explicit clause when `waitingSince` ascending already approximates it:** a transferred
  conversation gets a new claim and **`waitingSince` does not reset** — so without this, a breached
  row that changed hands can sink beneath fresher ones. That is the exact case a breach ordering
  exists for.
- **Resolution breach does NOT reorder and does NOT escalate.** It raises **`Create ticket`** to the
  primary action in the conversation pane. **A chat that has run twenty minutes is not a chat; it is
  a ticket**, and the right response is to give it a reason code and a real SLA. So the twenty
  minutes is a **conversion prompt**, and calling it an escalation would promise a ladder that does
  not exist.
- **`breachEscalateTo: 'ops_supervisor'` is not rebuilt for chat.** It is a legacy string with no
  recipient. Escalation is a routing feature and **D19 ruled routing out of v1**.
- **Both clocks pause on `snoozed`.** A snoozed conversation is deliberately parked and it is not in
  the queue; a countdown running against a decision the operator already made is a false breach.
  Chat does **not** pause on customer response (legacy `pauseOnCustomer` is `false` for T1 and true
  for the rest) — a live chat's promise is *answer them*, and it does not stop because they typed.

#### The cap: **3**

> **Three live chats per operator. `channel === 'chat'` and `status !== 'closed'` and a live claim.
> Email, WhatsApp and phone do not count.**

- **Why three.** 45 seconds is only reachable if attention is not fragmented. Three is the number at
  which one operator can hold a 45-second promise on all of them — roughly 15 seconds of attention
  each per minute, which is one exchange. Four makes the promise arithmetic fail before anybody is
  slow.
- **Email does not count** because it has no live promise. An operator holding three chats and
  forty emails is a normal shift.
- **The cap is a refusal, not a throttle.** At cap, `Grab` renders **disabled in place** with the
  reason naming the number — `You are holding 3 live chats, which is the limit.` Take-over is
  refused too. **Release frees a slot immediately.**
- **`AgentPresence.activeCount` is the counter** and it is derived, never stored. The type already
  says so.
- **Configurable per role in Admin › Operational Policy › Limits, default 3, range 1–8** (**D20**).
  A range so the pane has bounds to validate; 8 because above it the promise is arithmetic fiction
  and the console should not offer a number it knows is a lie.
- **The cap does not apply to Owner.** Not a privilege — an Owner grabbing a fourth chat during an
  incident should not be stopped by a throughput heuristic.

#### What it means for the build

- **`SlaSource` gains `'chat-policy'`** — `types/workQueue.ts`, mock-data-engineer's file.
- **`fixtures/conversations.ts` populates `slaTargetMinutes`, `slaDueAt` and `firstResponseDueAt` on
  every non-`phone` row.** Today they are `unset` by design; the design reason is now answered.
- **At least one seeded conversation is first-response-breached and at least one is
  resolution-breached**, or **AC-963** and **AC-964** cannot be verified and the R5a marker ships
  untested. `CNV-103` and `CNV-112` are `waiting` and are the candidates.
- **P5-T6 shrinks to availability plus the cap.** Routing was ruled out by D19.
- **The cap is a field in Admin › Operational Policy › Limits (D20)** and therefore has a home before
  it has a UI.
- **The `attention` nav-badge cap is untouched.** It stands at three sub-tabs (R4-10b). A chat breach
  competes for those three slots on Support › Contact Centre's merits and gets no exemption.

#### Acceptance criteria

**AC-963** — A `chat` conversation with no ticket, unanswered for 46 seconds, renders as
first-response breached, carries the leading-edge marker, and sorts above every non-breached row
regardless of their waiting times.

**AC-964** — A `chat` conversation still open 21 minutes after it started renders `Create ticket` as
its primary action, does **not** move in the queue order, and does not appear in the breach banner's
count.

**AC-965** — A conversation carrying a `ticketId` renders exactly one first-response countdown and
one resolution countdown, both derived from the ticket's reason code, and none derived from
`chat-policy`.

**AC-966** — A `phone` conversation renders no countdown of any kind and appears in no breach count.

**AC-967** — An operator holding three live chats sees `Grab` disabled on every unassigned chat with
a reason naming the number three; releasing one re-enables it immediately.

**AC-968** — An operator holding three live chats and any number of email conversations can still
grab an email conversation.

**AC-969** — Changing the concurrent-chat cap for a role in Admin › Operational Policy › Limits
changes the number at which `Grab` is refused for operators in that role, without a reload.

#### How it would be falsified

If median chat first response sits **well under 45 seconds at cap 3**, operators have headroom and
the **cap** should rise before the promise tightens. If operators at cap 3 **routinely breach 45
seconds**, the cap is too high — not the promise too tight — because the promise is what the customer
experiences and the cap is only how it is met. If a large share of chats are converted to tickets
**before** twenty minutes, the resolution number is too long and should follow the observed
conversion point. **All three are measurable from the conversation store the day it has traffic, and
none requires a survey.**

---

### D23 — Cohort `lastActiveAt` is a per-entity-type alias to a real stored field, and `Driver` gains `lastTripAt`

> **The ruling.** `lastActiveAt` is **a per-entity-type alias declared on the row source** — never a
> new field of that name, never computed at read time — and **`Driver` gains `lastTripAt:
> IsoDateTime | null`, whose fixture value is computed from `fixtures/trips.ts` and never
> hand-written**, so the alias table has two rows and no hole.

`resolveReport.ts:385` names the missing thing precisely: *"one `RowSource`-shaped fact this file
does not yet declare: **which field on which store is `lastActiveAt`** — `riders` carries
`lastTripAt`, `drivers` carries no activity field at all, and inventing one would be AC-453."*
**This declares that fact.**

#### Why an alias, and not the other two

- **Not derived.** `buildCohortMatrix(entities, getJoinedAt, getLastActiveAt, intervals)` takes an
  **accessor** (`reporting/cohorts.ts:40`), not a field. It is already written for an alias. Making
  `lastActiveAt` a computed value would mean a scan of the trip store on every cohort read, and the
  same subject would answer differently depending on which store the query started from.
- **Not a stored field named `lastActiveAt`.** A field called *last active* on both `Rider` and
  `Driver` is a **third** name for a fact each type already has under a better one. It would drift
  from the field it duplicates the first time one is updated and the other is not — and *last
  active* means "last trip" on a rider and would have to mean the same on a driver, so the abstract
  name buys nothing and costs a synchronisation.
- **An alias is one line per row source**, declared where the row source is declared, and it is the
  shape `resolveReport.ts` already says it is missing.

```
riders  → lastActiveAt = lastTripAt      (types/rider.ts:87, exists)
drivers → lastActiveAt = lastTripAt      (types/driver.ts, NEW)
```

**A row source that declares no alias does not offer the cohort mode.** The mode renders **disabled
in place with the reason naming the store** — exactly as `CohortGrain`'s `day` and `week` already do
(`types/report.ts:170`), which is D9 CQ-3's shape and the precedent to follow rather than a new one
to invent.

#### Why adding `Driver.lastTripAt` is not AC-453

**AC-453 forbids inventing a value. This invents nothing.**
`Driver.lastTripAt = max(trip.endedAt)` over `trip.driverId === driver.id` and
`trip.status === 'completed'`. `Trip.driverId` and `Trip.endedAt` both exist (`types/trip.ts:54`,
`:61`). **The fact is already in the trip store; this denormalises it onto the driver so a cohort
read does not scan trips.**

**The fixture value must be COMPUTED from `fixtures/trips.ts` at fixture-build time, never typed by
hand**, and a test must assert the two agree. A hand-written timestamp on a driver whose trips say
otherwise is exactly the class of contradiction the fixture audit already
records for the ticket fixtures, and it would be worse here because a retention matrix would report
it as a business result.

**A driver with no completed trips gets `null`, not the join date.** `null` sorts as *never returned*
in `buildCohortMatrix` (`cohorts.ts:56` — `survivedMonths = 0`), which is the honest answer.
Defaulting to `joinedAt` would report every driver as having survived their first month.

#### The second thing this field pays for

`docs/ref/` and the product-owner brief both use the same example of a criterion written properly:
*"a driver with no completed trips in 30 days shows the `Inactive` badge and is excluded from the
default view."* **That criterion is unbuildable today** — `Driver` carries `totalTrips`,
`onTimePercent` and `joinedAt`, and nothing that says *when*. The same field answers both, which is a
large part of why it is the right one.

#### What does not change

- **Cohorts stay month-grain only.** `day` and `week` remain disabled in place with their stated
  reason. A single last-seen timestamp cannot honestly answer a day-7 column; that needs a real
  activity history, which is `Q-RB-11`'s neighbour and is not this ruling.
- **`CohortSpec.returnMeasureKey: null` keeps meaning "the subject's own activity"** — which is now
  defined as this alias, rather than being defined nowhere.
- **`CohortSpec` gains no field.** The alias belongs to the row source, not to the query.

#### What it means for the build

- **P7-T2's cohort legality is unblocked** for `riders` and `drivers`; every other row source
  declares no alias and disables the mode with its reason.
- **P7-T3's cohort renderer is unblocked.** The maths does not move — `reporting/cohorts.ts` is
  built and tested; only the chrome does.
- **`types/driver.ts` and `fixtures/drivers.ts` are mock-data-engineer's files.** This is a request.
- **`data/reporting/plan.ts` gains the alias declaration per row source** — one line each.
- **An `Inactive` badge on Operations › People becomes specifiable**, which it was not.

#### Acceptance criteria

**AC-970** — Every `Driver` fixture's `lastTripAt` equals the latest `endedAt` among completed trips
carrying that driver's id, or is `null` where there are none — asserted by one test reading both
fixtures.

**AC-971** — A cohort report over riders and a cohort report over drivers both render a matrix, and
neither renders an error.

**AC-972** — A cohort report over a row source with no declared alias offers the cohort mode
**disabled in place**, with a reason naming that store, and does not omit the mode from the control.

**AC-973** — A driver with no completed trips appears in their join month's cohort and in no later
interval column.

**AC-974** — Grepping `src/data/types/` for a field literally named `lastActiveAt` returns matches
only in `types/auth.ts` (a device's last-seen time, an unrelated fact), and none on `Rider`,
`Driver` or any other cohort subject.

#### How it would be falsified

If cohort reports are routinely run over a **third** subject — subscriptions, corporate accounts —
the two-row alias table is too small and the alias should be a required part of every row source
declaration rather than an optional one. If `Driver.lastTripAt` and the trip store are ever observed
to disagree in the running app, the denormalisation is being written by hand somewhere and the fix is
to recompute it, not to trust it. **If a real activity history arrives, this ruling is superseded
entirely and day and week grain unlock with it** — which is the outcome to hope for, and the reason
the alias lives on the row source where one field can be swapped for another.

---

### What these eight rulings changed in the two plan documents

Recorded here rather than edited into those files, because **the register is the authority and a plan
is a schedule.** Whoever next revises them applies this list.

| Plan | Task | Change |
|---|---|---|
| Operator-experience | **P0-T1 … P0-T5** | **All five closed.** |
| | **P1-T4** | Unblocked. Scope named: one adapter + `clients/preferences.ts` + repoint `defaultUiStore` |
| | **P1-T5** | Unblocked (class 2 under D16) |
| | **P2-T1** | `CommandSession.canWrite` deleted; `roleRefusal` evaluates a real key. Every predicate declares **three** sentences (D21), not two |
| | **P2-T2 … P2-T9** | Each registry's `unavailable` predicates gain the `.all` sentence and the `eligibleIds` set |
| | **P3-T8** | Unblocked. Recents are per-operator and server-backed |
| | **P3-T9 · P4-T2** | Unblocked; undo is an inverse operation, 10 s, and gates the confirm step |
| | **P4-T1** | Inherits D21 including the `Select only the N eligible` control |
| | **P5-T4 … T9** | Scoped by D19. `whatsapp` modelled with no rows; `phone` read-only |
| | **P5-T6** | **Halved** — routing is out of v1; availability + the D22 cap remain |
| | **P6-T5 … T9** | Unblocked by D17 |
| | **P6-T10** | **IN**, relocated to Admin › Workspace › Integrations. No new sub-tab |
| | **P6-T11** | **OUT** — feature flags do not ship |
| | **P7-T2 · P7-T3** | Cohort legality and the cohort renderer unblocked by D23 |
| Remediation | **§2.2 `clients/contactCentre.ts`** | **CANCELLED** — `clients/conversations.ts` already covers it |
| | **§2.2 `ROLE_PERMISSIONS` / `ALL_PERMISSIONS`** | Superseded by D17's twenty keys and six roles. Delete, do not wire |
| | **§2.2 `INITIAL_CITIES` · `CITIES_DATA`** | Delete. One city store, owned by Admin › Operational Policy › Cities (D20) |
| | **§2.2 `INITIAL_AGENTS` · `CPT_METRICS`** | Superseded by `AgentPresence` over the realtime seam (D19) |
| | **§2.2 `TEMPLATES`** | `clients/templates.ts` confirmed, and it now also holds D19's canned responses |
| | **§3.1 RBAC row** | Unblocked. It is a data change to 35 rows **plus** the `viewPermission` / `writePermission` type change |
| | **§4.6 item 4** (ticket/rider fixture contradiction) | **Promoted** — it must be fixed before P5-T4, because two support screens disagreeing in front of a customer is worse than a stale metric |
| | **§5 "Blocked on the owner"** | **Q4 removed** (closed by D17). **D15, Q-D16, Q-D18, §6.2 D-12, D-13, D-14 and F-11 remain open and are untouched by this round** |
| | **Wave 6** | RBAC moves out of *"pending Q4"* and into schedulable work |

**One thing deliberately not changed: D15 is still first in sequence.** Nothing in this round touches
tile counts, board membership or the Management sub-tab count, and **D17's permission table is written
against 35 rows in a way that survives D15** — collapsing five Management boards into three removes
three rows carrying `view_analytics` and changes no key.

**One finding escalated and not resolved: F-R5-1** — §6.4 has no row for a message composer that
sends. Routed to product-designer. **Design of the conversation pane may not start until it has one**,
per `patterns.md`'s own rule.

**Three type-seam changes this round requests and does not make**, each named with its owner so two
agents do not ship incompatible answers:

| Change | File | Owner |
|---|---|---|
| `viewPermission` / `writePermission` replace `permission: PermissionRef`; `PermissionLevel` retired | `data/types/navigation.ts`, `data/fixtures/routeTable.ts` | mock-data-engineer |
| `SlaSource` gains `'chat-policy'`; conversation fixtures gain their clocks | `data/types/workQueue.ts`, `data/fixtures/conversations.ts` | mock-data-engineer |
| `Driver.lastTripAt`, computed from the trip fixtures | `data/types/driver.ts`, `data/fixtures/drivers.ts` | mock-data-engineer |
| `bulkActions[].eligibleIds`; the undo toast's 10 s duration | `components/DataTable.tsx`, `components/ui/sonner.tsx` | shell owner (Phase-0 files) |
| The `localStorage` adapter; `defaultUiStore` repointed | `lib/persistence.ts` | utilities-engineer |

---

## Four rulings the build raised

**Two conflicts and two findings, all four surfaced by agents working next to them and all four
flagged in file headers rather than papered over.** None was invented by the agent that raised it,
and in three of the four the raising agent's analysis was already correct — which is recorded here
because *"the agent was right and asked anyway"* is the behaviour this register wants repeated.

**Acceptance criteria: AC-975 … AC-994**, continuing the round's own block. **AC-906–999 now has
five numbers left in it. The next round takes a new block — 1000–1099 — and whoever opens it says
so before writing into it**, which is the discipline D14 recorded after 700–724 was allocated twice.

| # | Ruling, in one line |
|---|---|
| **D24** | **P4-T1 wins on Payouts. AC-476 is superseded and RE-WORDED**, because its reason is right and its scope was wrong; **AC-335 is the invariant and does not move** |
| **D25** | **Selection is a promise of a set-shaped act.** `canSelect` derives from `bulkActions.length > 0` — enforced in the hook, not by review. **AC-46 becomes true by construction**; AC-382 is amended |
| **D26** | **`PAY-` belongs to the payment resource.** The ledger payable stem is renamed **`PYB-`**, and an id-prefix registry with a collision test lands with it |
| **D27** | **Arabic is in scope, is a content project of ≈3,875 strings, and does not ship in halves** — `ar` stays `{}` until the whole dictionary lands |

---

### D24 — AC-476 is superseded and re-worded; the three Payouts tables gain selection

> **The ruling.** **P4-T1 wins.** The three Payouts & Escrow index tables carry selection and a
> bulk bar. **AC-476 is superseded by AC-975 below** — re-worded rather than deleted, because its
> stated reason is correct and survives verbatim. **AC-335 is untouched and is the load-bearing
> invariant: `Reverse` is never a bulk command, and no Financials surface selects postings.**

#### Why this is not "P4-T1 outvoting a shipped criterion"

**AC-476's own last sentence gives its reason, and the reason is about provenance, not about
selection:**

> *"Acquiring selection as a side effect of gaining a row action fails."*

That reason is **intact** in what the Financials agent built. Selection did not arrive as a side
effect of `Reverse`. It arrived with **four declared bulk commands and their refusal predicates**,
each reading the same predicate as its own row action (`payWithheldFrom`, `releaseWithheldFrom`,
`deductionWithheldFrom`) so the two surfaces cannot disagree about the same record. **A criterion
whose reason is satisfied by the thing it appears to forbid is a criterion whose scope is wrong.**

Three further facts settle it:

1. **AC-476 lives inside the reversal flow, AC-468–476, which has not shipped.** It was written to
   fence *that* work. It was never a ruling about what shape Payouts & Escrow takes for all time,
   and reading it as one is reading a fence as a wall.
2. **The mode change is a correction, not a widening.** The three tables were `mode: 'queue'` and
   are now `mode: 'index'`, which is what they always were — an index of captains and of documents,
   with **no claim contract, no owner chip and no closed set of dispositions**. §9.3's checkbox
   restriction is a rule about **queues** (*"only if every bulk action offered is a claim or assign
   action"*), and `Pay` is not a claim. The sanctioned shape for a non-claim bulk command is an
   index table, which `design/00-shell.md` §9.4 already enumerates as *"checkbox column, kebab, sort
   popover, bulk bar"*.
3. **AC-335 does the safety work, and it is not what was in tension.** *"No Financials surface
   offers a bulk-reverse affordance, a select-all, or a reverse action operating on more than one
   posting."* Nothing in P4-T1's Payouts build reverses anything in bulk. **`Reverse` is not among
   the four commands and must never be.**

> **One reading of AC-335 is ruled out here so it does not resurface.** Its middle clause — *"a
> select-all"* — is scoped to **postings**, like the two clauses on either side of it. It is **not**
> a ban on selection anywhere in Financials, and it cannot be: **AC-382 in the same spec gives
> Rider Wallets selection.** A reading that makes a spec contradict itself sixty criteria earlier is
> the wrong reading.

#### The argument that cuts both ways, and which way it actually cuts

The coordinator is right that *"a bulk payout is the most valuable bulk action in the product and
also the most dangerous"*, and right that D21's own text — *a half-applied bulk payout is a
reconciliation incident* — reads as an argument in both directions. **It is not.**

**The reconciliation incident D21 describes is the thing D21 forbids.** Under D21 a bulk payout
cannot half-apply: it pays all twelve or it pays none and names why. **Citing the guard as the
hazard is the error.** What remains is the comparison the guard does not decide, and it is not
close:

- **A wrong bulk payout is one audit entry with twelve ids on it.** It is visible, attributable and
  reversible by the reversal flow AC-468–476 exists to build.
- **A missed payout is invisible.** An operator settling a period one captain at a time across 57
  rows makes errors of *omission*, and no criterion in this spec catches a captain who was simply
  never clicked.

**The console should make the recoverable error possible and the invisible one hard.** That is the
same reasoning R5a applies to breach markers and §8.4 applies to backlogs.

#### Five guards, four of which already exist

| # | Guard | Status |
|---|---|---|
| 1 | **`Reverse` is never a bulk command on any Financials surface**, and no surface selects postings | **AC-335, unchanged and binding** |
| 2 | **Strict all-or-nothing, no partial apply**, with `Select only the N eligible` as the only way out | **D21, already built and tested** |
| 3 | **A permission refusal outranks a domain refusal** | **AC-962, already built** — the `*_REFUSAL_ORDER` arrays |
| 4 | **Select-all is PAGE-SCOPED, and there is no "select all N matching" affordance anywhere** | **Already true**: `toggleAllOnPage` (`useIndexTable.ts:411`) takes the rendered rows. **Ratified here as an invariant rather than left as an accident** — it bounds a mis-click's blast radius to `pageSize`, which is the guard a count cap would have been a worse version of |
| 5 | **A bulk money command confirms, and its confirmation names the COUNT AND THE TOTAL IN SAR** | **New.** D18 already requires the confirm — money moves, nothing is undoable. **The total is the addition**: `Pay 12 captains` is a number nobody can sanity-check, and `Pay 12 captains · 48,320.00 SAR` is one an operator can reject on sight |

**No count cap is minted.** It was considered and rejected: any number above a normal settlement and
below the roster is arbitrary, and guard 4 already bounds the blast radius at the page — which is
the real protection a cap was reaching for.

#### What it means for the build

- **`specs/03-financials.md` AC-476 is struck and replaced by AC-975.** The struck text stays in the
  file with a pointer here, per the register's own practice — **a MUST that is struck quietly grows
  back** (§6.2 D-14's Clause B reasoning, applied to a criterion instead of a rule).
- **The bulk-work pass keeps Payouts.** No amendment to its screen list.
- **`PayoutsScreen.tsx`'s header note (`:70`–`:81`) stops being an open flag and cites this entry.**
  The engineer was right not to pick, and right to ship the build with the flag rather than stall.
- **The fourth bulk command must be enumerated in the spec**, not only in the screen. Whoever
  amends §9.8 lists all four with their refusal predicates, so `Reverse` never quietly becomes a
  fifth.

#### Acceptance criteria

**AC-975** *(supersedes AC-476)* — The three Payouts & Escrow index tables offer selection **only
alongside declared bulk commands**: no checkbox exists on a view that declares none, and **no bulk
command on any Financials surface reverses a posting or operates on more than one posting**
(**AC-335**). Selection acquired as a side effect of gaining a row action still fails.

**AC-976** — Selecting rows on any Payouts & Escrow view and invoking a bulk command shows a
confirmation naming both the number of records and the total in SAR before anything commits.

**AC-977** — A bulk payout over a selection containing any refused captain commits nothing, names
the count in the refusal, and offers `Select only the N eligible` (**D21**).

**AC-978** — The header checkbox on every Payouts & Escrow view selects the rows on the current page
and no others; no control anywhere in the console selects every record matching the filter.

**AC-979** — A committed bulk payout writes one audit entry per posting **and** one naming the batch,
and the batch entry lists every posting id it produced.

**AC-980** — No bulk bar on any Financials surface offers `Reverse`, at any selection state, on any
view.

#### How it would be falsified

If a bulk payout is **never used** — operators settle row by row despite the bar being there — the
value argument was wrong and AC-476 should be reinstated as written, at the cost of one screen's
props. If a bulk payout is used and produces a reversal within the same period more than very
rarely, guard 5's confirmation is not doing its work and the answer is a second-approval step, not
removing the bar.

---

### D25 — Selection is a promise of a set-shaped act, and the hook enforces it

> **The ruling.** A table offers selection **if and only if it declares at least one bulk command.**
> `mode: 'index'` no longer implies `canSelect`; **`canSelect` is derived from
> `bulkActions.length > 0`** in `useIndexTable` / `DataTable`. **AC-46 becomes true by
> construction. AC-382 is amended** — its subject was the index/ledger boundary, not the checkbox.

#### The defect is worse than "selecting produces nothing", and that changes the answer

The audit reported that selecting rows on these tables produces no bar, no count and no clear.
**Read against `DataTable.tsx:782`, it is worse than that:**

```tsx
{selectedCount > 0 ? (
  <TableHead colSpan={columnCount - 1}>{t('table.selectedCount', …)}</TableHead>
) : ( …the real column headers… )}
```

**Selecting a row destroys the column header row.** The labels, the sort affordances and the header
menus are replaced by an `N selected` cell — and then no bar arrives, so there is **no `Clear`, no
action and no acknowledged mode**. The operator has removed their own column labels by ticking a
box, and the only way back is the header checkbox they may not have used to get there.

**So this is not an open design question. It is AC-46 failing on eleven tables:**

> **AC-46** — *"Selecting a row replaces the column header row with an `N selected` count **and shows
> the bulk action bar** inside the table card. Deselecting all restores the column headers and
> removes the bar."*

**AC-46 is a conjunction.** The first conjunct fires; the second cannot, because there is nothing
to render. **The question was never "should selection be suppressed or should commands be
required" — it was "which half of an already-failing criterion do we make true".**

#### Why derive it rather than mandate it

The coordinator's instinct — *require every selectable table to declare at least one bulk command* —
is the right principle, and it is right for the reason given: **an index table an operator can
select on but not act on is a promise the product does not keep.** But enforced by review it has a
failure mode, and it is the one this codebase has already met four times: a rule that must be
remembered gets satisfied by a fig leaf. `Export selected` declared once per table to satisfy an
audit is exactly that, and **no export affordance exists anywhere in the product today**, so
mandating one would be minting a subsystem across eleven tables to make a checkbox honest.

**Deriving `canSelect` from `bulkActions.length > 0` gives the principle for free.** It is one
predicate in one hook. A screen that declares commands gets selection; a screen that declares none
loses the checkbox **without anyone editing it**, and cannot regain it by accident. It also makes
the two halves of AC-46 inseparable in the type system rather than in a reviewer's memory —
**the checkbox that triggers the header swap cannot exist without the bar that completes it.**

Suppressing per screen (the cheaper option) was rejected for the same reason: it is eleven
judgement calls today and a twelfth next quarter, and the twelfth is the one nobody makes.

#### AC-382, amended rather than outvoted

**AC-382's subject is the boundary, not the affordance.** Its own text is a contrast — *"The wallet
index is an index table … The per-rider ledger reached from an identity link is a ledger — none of
those three exists on it"* — and its test is named for the contrast (`wallets.test.tsx:58`: *"the
index is an index and the ledger behind it is a ledger"*). The three-affordance enumeration is how
the boundary was drawn, not a requirement that Rider Wallets carry a checkbox forever.

The screen's own test file had already reasoned to the same place and stopped at the right line:
*"The checkbox column stays because AC-382 puts it there. That leaves it [dangling] … the two ways
out are a genuinely set-shaped command or an amendment to AC-382."* **This is the amendment.**

> **AC-382, amended:** *The wallet index is an index table — **sort and filters** work per foundation
> §7.1, and **selection is present exactly when a bulk command is declared** (AC-981). The per-rider
> ledger reached from an identity link is a ledger — none of the three exists on it.*

**And the reason no bulk command is declared on Rider Wallets is recorded here so nobody supplies
one to restore the checkbox:** a bulk goodwill credit is money, it is irreversible under **D18**,
and **AC-384/385/386 bound every credit by a per-case cap, a daily cap, a per-rider-per-30-day cap
and a second-approval threshold** — four bounds that a set-shaped command would have to evaluate
per record and report in one sentence. **That is a real command someone may specify one day; it is
not a checkbox's justification.**

#### The eleven tables, disposed

| Table | Disposition | Why |
|---|---|---|
| `support/tickets/TicketsScreen` | **Keeps selection** — gains commands from **P4-T1** | Already on P4-T1's ten-screen list |
| `support/disputes/DisputesScreen` ×2 views | **Keeps selection** — **P4-T1** | Same |
| `reports/ReportLibrary` | **Keeps selection** — declares `Delete` | `deleteReport` exists (`clients/reports.ts:280`). One line. **AC-868**'s confirmation already names affected dashboards |
| `reports/DashboardsView` | **Keeps selection** — declares `Delete` | `deleteDashboard` exists (`:181`) |
| `reports/AlertsView` | **Keeps selection** — declares `Delete` | `deleteAlertRule` exists (`:201`). `Enable` / `Disable` are natural seconds and are not required |
| `financials/wallets/WalletsScreen` ×2 index views | **Loses selection** | Above. AC-382 amended |
| `operations/corporate/CorporateScreen` | **Loses selection** | Not on P4-T1's list; no set-shaped act specified anywhere |
| `admin/communications/EmailLogCard` | **Loses selection** | A delivery log is closer to a ledger than to an index. A bulk *resend* is a send — irreversible under D18 — and nobody has specified one |

**Three keep it because they already earn it, three earn it in one line each, five lose it.** No
screen file is edited to remove a checkbox; the five simply stop declaring commands they never had.

#### What it means for the build

- **`useIndexTable.ts` and `DataTable.tsx` are Phase-0 shared files. The shell owner and the
  utilities-engineer make this change between them; no screen implements it locally.** Same rule
  D8-b applied to the kebab threshold and D21 applied to `eligibleIds`.
- **`canSelect` moves from a literal on the mode to a derivation.** `mode: 'ledger'` keeps `false`
  at compile time (**AC-48**) and nothing about ledgers changes.
- **A guard test, not a one-off sweep**: no rendered table may show a selection checkbox while
  declaring zero bulk commands. **The audit that found these eleven must become the test that
  prevents the twelfth**, which is §4.5's own rule about widening detectors rather than re-running
  scans.
- **P4-T1's ten screens are unaffected** — they all gain commands, so they all keep selection.
- **AC-382's verdict must be re-run** against the amended wording.

#### Acceptance criteria

**AC-981** — No table anywhere in the console renders a selection checkbox, a header select-all, or
an `N selected` header while declaring zero bulk commands. A test walks every rendered `DataTable`
and asserts it.

**AC-982** — On Rider Wallets, Corporate Accounts and the Email log, no checkbox column renders, the
column headers are never replaced, and sort and filters continue to work.

**AC-983** — On the Report Library, Dashboards and Alerts, selecting rows shows the bulk bar with
`Delete`, a count and a `Clear`; deselecting all restores the column headers.

**AC-984** — Deleting three selected saved reports names three in its confirmation, names three in
its outcome toast, and leaves every dashboard that pinned them showing the same removal (**AC-868**).

**AC-985** — On every table that does render selection, selecting a row shows both the `N selected`
header **and** the bulk bar, and neither can appear without the other.

**AC-986** — The per-rider wallet ledger renders no selection, no sort control and no filter row —
the ledger half of AC-382, unchanged by this amendment.

**AC-987** — A screen that declares a bulk command and then removes it stops rendering its checkbox
column with no other edit, asserted by one test that toggles the declaration.

#### How it would be falsified

If operators are observed selecting rows on a table **in order to read them** — as a highlighting or
place-keeping device rather than to act — then selection has a second job this ruling does not
recognise, and the answer is a row-highlight affordance, not a checkbox with nothing behind it. If
three screens acquire a token bulk command within a month purely to restore a checkbox, the
derivation is being gamed and the fix is a review rule about what counts as set-shaped work.

---

### D26 — `PAY-` belongs to the payment resource; the ledger payable stem becomes `PYB-`

> **The ruling.** **`PAY-` is the payment resource's prefix and nothing else's.** `payablePrefix()`
> is renamed to mint **`PYB-<captain number>`**, the twenty distinct posting ids in
> `fixtures/ledger.ts` move with it, and **an id-prefix registry lands in `data/types/common.ts`
> with a test asserting no two id spaces share a prefix.**

#### Why the ledger stem moves and not the payment space

Nothing collides today and `resolveProfile('PAY-0102-4')` correctly 404s — the raising agent
verified both, and `fixtures/payments.ts:34` already documents the whole thing rather than leaving
it to be found. **The question is only which space is cheaper to move, and it is not close:**

| | `PAY-5510` — the payment resource | `PAY-0102-4` — the ledger payable posting |
|---|---|---|
| Reachable by `?entity=` | **Yes** — `payment` is one of the eleven `ProfileEntityType`s | No |
| Returned by global search | **Yes** | No |
| Appears in operator-facing copy | **Yes** | Only inside a ledger row |
| Minted by | fixtures + derivation from trip, rider, driver, refund and credit-note references | **one function**, `payablePrefix` (`clients/payouts.ts:138`) |
| Literals to move | ~130 rows across five fixtures, plus every reference that derives them | **45 occurrences, 20 distinct, in 3 files** |

**A prefix an operator types into ⌘K belongs to the thing they are looking for.** Moving the payment
space would break the searchable id an operator quotes to a customer; moving the posting stem
touches one expression and one fixture file.

**And `PAY-` is already doing three jobs, not two** — `PAY-5510` (seeded payments), `PAY-70xx`
(derived from trips), `PAY-W640` (driver payment ids) all belong to the payment space, and
`PAY-0102-4` does not. Two spaces, three shapes, one prefix.

#### The registry is the actual fix

Renaming one stem closes today's instance. **A four-character prefix doing a namespace's job is a
class of defect, and the class is closed by a declared registry plus a test**, not by a rename.

- **One exported table in `data/types/common.ts`** mapping every prefix to exactly one id space and
  the fixture that owns it — `DRV`, `RDR`, `TKT`, `CNV`, `PAY`, `PYB`, `ARD`, `PO`, `JE`, `CN`,
  `CMP`, `USR`, and the rest.
- **A test asserting the mapping is injective**, and that every id literal in `src/data/fixtures/`
  matches a declared prefix. **That is the guard that catches the next one before it ships**, which
  is the §4.5 pattern — the detector exists, it is just not pointed here yet.
- **`resolveProfile` reads the registry** rather than a chain of `startsWith` checks, so a 404 on an
  unknown prefix is a stated fact instead of a fall-through.

#### What it means for the build

- **`data/types/common.ts`, `data/clients/payouts.ts`, `data/fixtures/ledger.ts` and
  `data/clients/financials.test.ts` — mock-data-engineer's files.** This is a request.
- **`PYB` and not `PAYABLE` or `AP`**: three letters, consistent with `ARD` (accounts receivable,
  debt) which already sits beside it in the same function.
- **Do it before the payments resource gains a screen.** After a payment id is on
  an operator's screen it is a customer-quotable reference and the rename stops being free.

#### Acceptance criteria

**AC-988** — Every id literal in `src/data/fixtures/` carries a prefix declared in the id-prefix
registry, and no prefix maps to more than one id space, asserted by one test.

**AC-989** — No ledger posting id begins `PAY-`; every payable posting id begins `PYB-`, and
`resolveProfile('PYB-0102-4')` returns a not-found naming the id rather than resolving it as a
payment.

**AC-990** — Global search for `PAY-` returns payment records only, and no ledger posting appears
among the results.

#### How it would be falsified

If a real payment gateway arrives with its own id format and it is not `PAY-`, the registry's
payment row changes and this rename was work for a prefix nobody kept. That is the only way it goes
wrong, and it costs one row in one table.

---

### D27 — Arabic is in scope, is a content project of ≈3,875 strings, and does not ship in halves

> **The ruling.** Arabic **is** part of *"100% complete, everything populated."* It is a **content
> project owned by a translator with product-owner holding the glossary**, not a data-layer or
> engineering task; the unit of delivery is **the whole dictionary, never a partial one**; and until
> it lands **`ar` stays `{}`**, which is AC-74's own fixture and is the honest state.

#### The number, re-derived rather than relayed

**Three figures are in circulation and all three are wrong.** `src/i18n/dictionaries.ts:22` says
*"200 operator-facing strings"* — that was true of the shell alone, before forty screens.
An earlier count said 483 `defaultValue` call sites — **that number has moved; it is 243
today across 16 files**, because §4.2's extraction is partly done. The coordinator's ≈2,300 is
closer than either and still low.

**Counted this session, by grep over the 25 `copy.ts` modules and `src/shell/copy.ts`:**

| | Count |
|---|---:|
| Distinct keys in the assembled `EN` dictionary | **≈3,632** |
| Operator-facing English strings with **no key at all**, resolving only through the `defaultValue` hatch | **243** |
| **Total to translate** | **≈3,875** |

**This is the third time in this project a count has been relayed instead of re-derived, and the
third time it was wrong.** The register already records that discipline twice — the sub-tab count
and the metric-tile counts. **The count and the list move together, or the count stops being
written.** The figure above is a grep, it is reproducible, and it should be re-derived rather than
quoted the next time anyone sizes this.

#### Three preconditions, in order, and none of them is translation

**Arabic cannot start until these land:**

1. **Extract the 243 unkeyed strings** into their screens' `copy.ts` and merge into `EN`. **A string
   with no key has nothing for an Arabic dictionary to hold** — this is not a step that can be
   done in parallel with translating.
2. **Revert the hatch.** `translate.ts:98`'s `?? (params as any)?.defaultValue` goes. **This is the
   step that makes the fix stick**, and until it lands AC-74's dev-time throw is unreachable and a
   new untranslatable string can ship without a single test failing.
3. **Widen `qa.copy.test.tsx:194`'s key-resolution scan from `src/shell` to `src`.** It is why none
   of this was caught.

#### Why it does not ship in halves

`docs/01-modules/00d` describes a half-Arabic console as **the policy the rebuild exists to
retire**, and `dictionaries.ts`'s own header repeats it. A dictionary at 60% renders an Arabic
console with English scattered through it — which is worse than an English console, because the
operator cannot tell whether a word is untranslated or is a proper noun.

**So the delivery unit is the whole dictionary.** It may be *drafted* incrementally in a translation
tool; it is **merged once**. `ar: {}` is not an embarrassment in the meantime — it is AC-74's test
fixture, and the fixture is doing real work: it is what proves the shell renders entirely in English
with no raw key anywhere.

**What is already done and is not waiting on this:** every piece of RTL plumbing —
`DirectionProvider`, `mirrorGlyph`, `isolate`, plural rules, the `:root:lang(ar)` geometry step
(rail 80 → 88, sub-tab column 224 → 256, **D12**) and the Arabic font stack. **Arabic geometry and
the Arabic face are fully reviewable today.** The dictionary is the only absent piece.

#### What cannot be translated cleanly, and must be flagged to the translator now

Four shapes in the current `EN` will fight Arabic, and they are cheaper to fix in English than to
work around in Arabic:

- **`{granter}` opening a sentence** (**D17**) — a bare role name where Arabic needs a definite
  form. Already ruled: a separate `role.<name>.subject` key.
- **`{count} of the selected captains…`** (**D21**) — Arabic has dual and multiple plural
  categories; the `.one` / `.other` / `.all` triple must become the full CLDR set for `ar`
  (`zero · one · two · few · many · other`), and the plural machinery already supports it.
- **Any count rendered through `String(n)`** — Arabic-Indic digits come from `formatCount`, and a
  raw `String(n)` inside a template bypasses it.
- **Permission and reason-code labels interpolated into sentences** — safe **only** because D17
  ruled them quoted. That ruling is now load-bearing for translation, not just for tone.

#### What it means for the build

- **The key-hygiene wave is the precondition and the "Arabic dictionary" wave is the
  project.** Wave 5 must complete — all three steps, including the revert — before a translator
  is briefed. Briefing one earlier means translating a moving target.
- **The glossary is product-owner's and is written before the dictionary**: the twenty or so domain
  terms — captain, rider, subscription, escrow, payout, deduction, breach, claim, waiver — get one
  Arabic term each, fixed, before 3,875 strings are written around them. **Retrofitting a glossary
  is the expensive half**, exactly as it was for the command registries' Arabic `keywords`.
- **This is not sized in engineer-days and should not be scheduled as though it were.** It is a
  translation contract with a review pass, and its long pole is the review, not the typing.
- **`dictionaries.ts:22`'s "200 strings" is now wrong by a factor of nineteen and must be corrected
  in the same edit as anything else that file gets.**

#### Acceptance criteria

**AC-991** — Zero operator-facing strings in `src/` resolve through a `defaultValue`; the hatch at
`translate.ts:98` is gone and AC-74's dev-time throw fires on a missing key.

**AC-992** — The key-resolution test scans all of `src`, not `src/shell`, and every key referenced
by any screen resolves in `EN`.

**AC-993** — With `ar` empty, the entire console renders in English with no raw i18n key visible on
any of the 35 sub-tabs — AC-74's fixture, re-asserted after the extraction.

**AC-994** — When `ar` lands, every key present in `EN` is present in `ar`, asserted by one test; a
partial dictionary fails rather than degrading.

#### How it would be falsified

If the business does not in fact need Arabic — if every operator reads English and the requirement
was inherited from the legacy app's own unused toggle — then ≈3,875 strings and a glossary is the
single largest piece of unnecessary work in the plan, and the observation is one conversation with
the operations team. **That conversation is worth having before the translator is briefed and is
worthless after.** If Arabic is needed, the all-or-nothing delivery rule is the thing most likely to
be argued against under schedule pressure; the falsification there is an operator preferring a 60%
Arabic console to an English one, which `00d` predicts they will not.

---

### What this addendum changed in the plan documents and specs

| Document | Item | Change |
|---|---|---|
| `specs/03-financials.md` | **AC-476** | **Struck and replaced by AC-975.** Struck text stays with a pointer here |
| | **AC-382** | **Amended** — selection is present exactly when a bulk command is declared. Boundary clause unchanged |
| | **AC-335** | **Unchanged, and restated as the invariant.** Its middle clause is scoped to postings |
| | §9.8 | Must enumerate all four Payouts bulk commands and their refusal predicates |
| `specs/00-foundation.md` | **AC-46** | Unchanged in wording; **satisfiable by construction** once D25 lands. Its eleven current failures close with it |
| the bulk-work pass | **P4-T1** | **Keeps Payouts.** No screen-list amendment |
| | New, implied | Report Library, Dashboards and Alerts each declare `Delete` — three one-line changes, not on P4-T1's list but closing three of the eleven |
| the `defaultValue` count | — | **The 483 figure is stale; it is 243.** The Arabic total is ≈3,875, not 200 and not 2,300 |
| | §4.5 | Two detectors added: the selection-without-commands guard (**AC-981**) and the id-prefix injectivity guard (**AC-988**) |
| | Wave 5 → Wave 6 | Wave 5's three steps are now explicitly the **precondition** for briefing a translator |
| the financials QA pass | AC-382 verdict | Re-run against the amended wording |

**Three shared-file changes requested, none made here**, each with its single owner:

| Change | File | Owner |
|---|---|---|
| `canSelect` derives from `bulkActions.length > 0`; the guard test | `hooks/useIndexTable.ts`, `components/DataTable.tsx` | utilities-engineer + shell owner, between them |
| `payablePrefix` → `PYB-`; the id-prefix registry and its test | `data/clients/payouts.ts`, `data/fixtures/ledger.ts`, `data/types/common.ts` | mock-data-engineer |
| Revert the `defaultValue` hatch; widen the key scan | `lib/i18n/translate.ts`, `shell/qa.copy.test.tsx` | utilities-engineer + shell owner |

**Nothing else in Round 5 is revisited.** D15, Q-D16, Q-D18, §6.2 D-12 and D-14, and F-11 remain
open and untouched; **§6.2 D-13 is reported as shipped against and should be moved out of the
signature register by whoever confirms it**, which is not a product-owner call to make on a report.

---

## The conversation-composer design pass — four rulings

Four items from the inbox design (`design/12-inbox.md`) and `design/12-refusal-and-undo-surfaces.md`,
**plus one the relay did not carry and which this register has to own because D18 created it.**

Three of the four are amendments to rulings already in this round, so they take the register's
existing amendment form — **D16a**, **D18a**, **D19a** — rather than new numbers. Only the §6.2
work is new, and it is **D28**.

> **Two D-registers are now both in the twenties and they are not the same register.**
> `DECISIONS.md` runs **D1 … D28**. `DESIGN.md` §6.2 runs **D-1 … D-16**, hyphenated. D14 recorded
> this once; with §6.2 D-15 and D-16 both live below, it needs saying again. **§6.2 D-15 is the red
> critical toast. `DECISIONS.md` D15 is the Management board collapse. They have nothing to do with
> each other.**

**Acceptance criteria: AC-1000 … AC-1005.** **AC-995–999 are deliberately retired unused.** Round 5's
block was 906–999 and it has five numbers left; splitting one entry's criteria across a block
boundary to save them would cost more in confusion than five integers are worth. **The 1000–1099
block is hereby open**, which is the announcement I said in the last addendum the next opener owes.

---

### D18a — D18 governs the command registry. A composer send does not confirm.

> **The ruling. RATIFIED — the coordinator's interim call stands and becomes the decision.** D18's
> scope is the **command registry**. A composer send is not a registry command and **shows no
> confirmation, in either register.** D18's table row *"anything that sends"* keeps its answer to
> the question it was actually answering — **a send is not undoable** — and loses the implication it
> should never have carried, that a send therefore confirms.

**F-1 closed.** The designer designed to the narrow reading, said why, and was right.

#### D18 conflated two questions, and this is the correction

D18's table has one column heading — *"Not undoable — confirms, no undo offered"* — doing two jobs.
**"Is this undoable?" and "does this confirm?" are the same axis for a registry command and are not
the same axis for a composer**, because the composer carries a protection no registry command has.

**The composer's confirmation is the text.** `Suspend captain` is one click on a row whose identity
the operator may have misread; a confirmation there re-states a fact they might have got wrong. A
send is a paragraph the operator wrote, word by word, and is looking at while they press `Enter`. **A
dialog would re-present content already on screen and add no information.** That is the weakest form
of confirmation there is, and D18's own principle — a confirm step exists to surface something the
operator cannot already see — argues against it.

The SLA argument is the second reason and the coordinator was right that it is the one with a number
attached: **at a cap of 3 live chats against a 45-second first-response promise (D22), a modal per
message is a measurable cost against a stated target.** D22's number is falsifiable; *"sends should
confirm"* is not, and where one side of an argument can be checked and the other cannot, the
checkable side carries.

The third reason is asymmetry of reversal, and it is the coordinator's: **a confirmation is cheap to
add and expensive to remove**, because operators learn to dismiss it. A dialog everybody dismisses
reflexively is worse than no dialog — it trains the dismissal reflex on the dialogs that matter,
which in this product are `Transfer`, `Take over`, and every money command in Financials.

#### Neither of D22's numbers gives, because the collision was in D18's wording

The question *"which of the two numbers gives"* has no answer, and that is the finding: **45 seconds
and 3 concurrent chats both stand unchanged.** What gives is a table row that was written to answer
*undoability* and read as though it answered *ceremony*.

#### What replaces the confirm — because "no confirm" is not on its own a complete answer

| Protection | Status |
|---|---|
| **The operator authored the text and is reading it** | Inherent |
| **The send register is stated on screen, not inferred** — `Enter sends · Shift + Enter adds a line`, and `This reply goes by email to {address}.` | Design spec §5, already specified |
| **Delivery state makes a bad send visible** — `failed` is reachable from any state and the newest outbound message always shows its state (§8.6.6) | Already built |
| **The `Reply by email` toggle resets when the pane closes or the conversation changes** | **New, ruled here** |

**The toggle reset is the one real guard this ruling adds, and it is aimed at the actual expensive
mistake.** That mistake is not *"sent one email"* — it is *"sent five short chat-register replies
into an email thread because the toggle was still on from twenty minutes ago."* Resetting on
pane-close and on conversation-change guards the walked-away-and-came-back case **without punishing
a burst of emails**, which resetting after every send would. Within a session the register is stated
on screen anyway. *(How the reset is surfaced, if at all, is product-designer's — this rules the
behaviour, not its presentation.)*

#### The `queued` hold was considered and is ruled OUT

The designer named it as the cheapest reconciliation if the broad reading stood, and it is a real
option: `MessageDeliveryState` already opens on `queued`, documented as *"accepted by us, not yet
handed to the transport"*, and `scriptDelivery` already runs `queued → sent → delivered | failed`.
So the model supports it and only the seam is missing.

**It is still refused, and the reason is not the metric.** `firstResponseAt` is stamped at reply time
(`clients/conversations.ts:613`, `EYVAR_NOW`), **not at delivery** — so a hold would cost the SLA
number nothing. **It would cost the customer.** A deliberate five-second hold on every message in a
live chat gives away eleven per cent of a 45-second promise to protect against a rare typo, and the
person paying is the one waiting. **A guard that is invisible in the metric and visible to the
customer is the wrong guard**, and it would have been very easy to ship precisely because the
dashboard would not have noticed.

*(If it is ever wanted, it is `cancelQueuedMessage` on the seam plus an `Undo send` on the message —
and it is then subject to D18's real rule, because at that point the send genuinely is reversible.)*

#### Scope, stated so this is not re-litigated a third time

**D18 applies in full, unchanged, to every registry command**, including the ones sitting beside this
composer: `Transfer` and `Take over` are irreversible registry commands and they take their modal.
`Grab`, `Release`, `Close` and `Snooze` are reversible registry commands and D18 buys them out of the
dialog and gives them an undo toast. **Only the composer's own send is outside D18's scope, and it is
outside because it has no `arity`, no `affordance` and no `CommandOutcome`** — the three fields D18's
rule is written in terms of.

#### What it means for the build

- **The building agent ships as instructed. No change to what is in flight.**
- **D18's table gains a scope line** — *"this table governs registry commands; a surface that sends
  its own content is §8.6"* — so the row cannot be read broadly again.
- **The inbox design's deviation 2 is sanctioned** (`design/12-inbox.md` §10) and cites this entry
  instead of an unratified reading.
- **F-2 in that file — no retry operation on the seam — is unaffected and still stands** for
  mock-data-engineer: `deliveryCanRetry()` is a predicate with no operation behind it, and calling
  `replyConversation` again would mint a duplicate under a new id. `retryMessage` is the fix, and
  §3.6's interim ships meanwhile.

#### How it would be falsified

If operators send a materially wrong message — wrong conversation, wrong register, unfinished
sentence — more than very rarely, the text is not the confirmation I claim it is, and the answer is
the `queued` hold with `Undo send`, **not a modal**, because the hold protects without spending the
promise on ceremony. The observation is the rate of a send followed within a minute by a correcting
message in the same thread, which the message store can answer directly.

---

### D19a — AC-943 named the wrong control. Corrected in place.

> **The ruling.** **F-4 accepted; the designer's rewording is adopted verbatim.** AC-943 keeps its
> number, because the substance — *a reason naming the missing address, and no message queued* — is
> unchanged. **This was my error, not a change of intent.**

**AC-943, as written, was unbuildable on the fixture it names.** `CNV-110` is an **email**
conversation whose customer has `handle: null`. There is no second channel, so there is no
`Reply by email` control to disable; the control that must refuse is **`Send`**. The fixture's own
comment asked for exactly this — *"the console should have refused the send rather than queued it"* —
and `clients/conversations.ts:527` confirms the current behaviour is the defect: `scriptDelivery`
runs `queued → failed` with `failureCode: 'no_handle'`, so today the console **accepts the send and
fails it afterwards**. That is the §11.2 pattern this whole product exists to retire — gate at
render, never enabled-then-refused.

> **AC-943, corrected:** *On `CNV-110`, whose customer has no email handle, the send control renders
> disabled with a reason stating there is no email address on file, and no message is queued.*

**The sibling case it was reaching for is real and is blocked.** A **chat** conversation escalating
to email is where `Reply by email` must compute its own disabled state — and it cannot, because
`ConversationParticipant.handle` is *"the address on **this** channel"*, one handle and not a map
(**F-3**, mock-data-engineer). AC-1002 below states that criterion and **names its blocker rather
than pretending it is testable.**

---

### D16a — a composer draft is class 4: ephemeral working state, and it is not persisted anywhere

> **The ruling.** **F-5's default is confirmed and given a name.** D16's taxonomy had three classes
> and needed a fourth. **Class 4 — ephemeral working state — lives in memory for the life of the
> surface, is never written to any store, and is never indicated.** A composer draft is class 4.

**D16's taxonomy was incomplete and that is worth admitting rather than force-fitting.** A composer
draft is genuinely none of the three: not URL-expressible, not a preference in any useful sense, and
not a named artefact. Forcing it into class 2 would have been the easy wrong answer, and the design
pass was right to refuse to guess.

**Why not class 2 (server-backed per-operator preference).** Two reasons. Syncing half-typed text to
a server is a write per keystroke or a debounce nobody has specified — **and an unsent draft is the
operator's private thought until they press send.** Putting it on a server makes it discoverable,
exportable and subject to retention policy, which is a governance surface created by accident to
solve a convenience problem.

**Why not class 3.** A *canned response* draft **is** class 3 — D16 already ruled that, and the
distinction holds: a half-written macro is an artefact somebody intends to finish and file. A
per-conversation composer draft has no name and no intent to keep it.

**The class-4 rule, so the next thing that lands here does not re-ask:**

| Clause | Rule |
|---|---|
| **Lifetime** | In memory, for the life of the surface. Keyed per conversation, so switching conversations and returning restores it |
| **Persistence** | **None.** Not `localStorage`, not `sessionStorage`, not the seam. A reload discards it |
| **Indication** | **None.** An indicator that a draft exists is a promise it will be there later, and it will not be. **The indicator would be the lie** |
| **Navigation guard** | **None.** AC-54's dirty-form interception is for a surface with a save; §8.6 is explicit that a composer has no dirty state. **Guarding a route change while losing the same text to F5 is incoherent** — pick one, and the honest one is neither |

**`sessionStorage` is refused here for the reason D16 already refused it for preferences:** it answers
*"does this survive a reload"* with *"sometimes"*. Class 4's answer is a clean **no**, and a clean no
is a thing an operator can learn.

**Noted, and it does change the register's tone rather than its content:** D16 has now **shipped** —
`src/lib/persistence.ts` carries the `localStorage` adapter with `setUiStateOwner` /
`uiStateCacheKey` / `clearCachedUiState`, and `src/data/clients/preferences.ts` exists. So the seam
this ruling declines to use is real, not notional, and declining it is a choice rather than an
absence.

---

### D28 — two §6.2 entries: D-15 DECLINE recommended, and D-16 proposed because D18 created a defect

#### §6.2 D-15 — a fully red critical toast. **Recommendation: DECLINE.**

**The measurement was re-derived here rather than relayed**, given this register's record on relayed
numbers, and it holds:

| Pair | Designer | Re-derived | Verdict |
|---|---|---|---|
| `--ev-red` `#b42318` on `--ev-ink` `#171a21` | 2.66 : 1 | **2.648 : 1** | **Below §7's 3 : 1 floor.** A red edge inside the ink pill is not legible and was correctly never proposed |
| White on `--ev-red` | 6.574 : 1 | **6.574 : 1** | Exact. A fully red pill **is** legible, and **is** R5a's fifth use of red |

**The designer's three reasons stand** — the four §3.1 changes are sufficient and free; R1 already
rejected the saturated split-strip for banners and this is that treatment on a new surface; and it
would create a second inverted family where the product has exactly one inverted surface and that
scarcity is what makes it read.

**A fourth reason, which is product-owner's to give and strengthens the decline:** **R5a's four uses
are all about the RECORD, never about the console's own condition.** A breached row, a destructive
button, a critical banner, a leading edge — every one says *this thing in the business is wrong*. **A
failed undo is the software failing, not the business.** Colouring it red would be the first use of
red to describe the console's own health, which is a **category change rather than a fifth
instance** — and once red can mean *the app had a problem*, it stops reliably meaning *the business
has a problem*, which is the whole of R5a's value.

**The designer's alternative needs no colour and is better on its own terms: a critical toast is one
that has stopped being transient.** It does not auto-dismiss, it gains a second line in sonner's
existing `description` slot, its action becomes `Try again` then `Open the record`, and it pins to
the bottom of the stack. **Persistence is the strongest possible "this is not over" signal and it is
the only one that cannot be missed** — a colour can be missed by a glance, a toast that is still
there in thirty seconds cannot.

**Nothing is blocked either way. §3.1 ships today and needs no entry.**

#### §6.2 D-16 — the action-bearing toast. **Proposed, and it is D18 that made it necessary.**

**This is the item the relay did not carry** (`design/12-refusal-and-undo-surfaces.md` F-2), and it
has to be owned here rather than passed on, because **D18 is what created it.**

`DESIGN.md` §5.1 / §13.1 forbid an action link in a toast. §6.3 **D7** cites that clause to judge the
legacy toast non-conforming. `sonner.tsx:18` implements the prohibition **in writing** — *"NO ACTION
LINK — a toast never carries an action the operator must take"* — and neutralises a stray `action`
prop deliberately. **D18 requires `Undo`, and D-15's alternative requires `Try again` and `Open the
record`.**

**By §6.2's own rule — *a deviation that does not name its rule is not sanctioned, it is a defect* —
the undo toast this register mandated is currently a defect.** It needs an entry, and the entry
should not be an exception list.

> **§6.2 D-16, proposed:** **A toast may carry an action if and only if either (a) missing the action
> is harmless, or (b) the toast does not auto-dismiss.**

**That is a testable clause rather than a carve-out for `Undo`**, and it explains the original
prohibition instead of contradicting it. §5.1 was right: a toast is transient, so an action inside
one is an action with a deadline the operator did not set, and the failure mode is *missing it*.
**The clause permits exactly the cases where that failure mode does not exist:**

- **`Undo` — (a).** Missing it means the act stands, which is what the operator asked for by
  performing it. The window is 10 s and hover pauses it (**D18**).
- **`Try again` and `Open the record` — (b).** They live on the critical toast, which **persists** by
  §3.1. There is no deadline to miss.
- **Still forbidden, and this is what the clause buys:** an action on an ordinary 5-second toast
  whose omission loses something. That is the legacy defect D7 named, and it stays named.

**Routed to the business owner via this register, alongside D-12, D-13, D-14 and D-15.** It is
bookkeeping in the sense that no behaviour changes — **and it is the kind of bookkeeping that gets
"fixed" as a regression by the next engineer who reads `sonner.tsx`'s comment and does what it
says.** That comment must be updated in the same change as the entry, or the file will keep
instructing people to remove a button the register requires.

---

### Acceptance criteria

**AC-1000** — Sending a message from the composer, in either register, commits with no confirmation
dialog, and the message appears in the thread with its delivery state.

**AC-1001** — With `Reply by email` engaged on a chat conversation, closing the pane and reopening
it, or switching to another conversation and back, leaves the composer in the conversation's primary
register and not in the email register.

**AC-1002** ⛔ **BLOCKED on F-3** — On a **chat** conversation whose customer has no email address on
file, `Reply by email` renders disabled with a reason stating so. *Not testable until
`ConversationParticipant` carries a per-channel handle map; `handle` is single-valued today and the
control cannot compute its own state.* **Owner: mock-data-engineer.**

**AC-1003** — Typing into the composer, switching to another conversation and returning restores the
text; reloading the page discards it; and at no point does any indicator state that a draft exists.

**AC-1004** — Navigating away from a conversation with unsent text in the composer is not
intercepted, and no dialog appears.

**AC-1005** — No toast that auto-dismisses carries an action control, and every toast that carries
one either persists or is the 10-second undo toast, asserted by one test over the toast contract.

---

### What this addendum changed

| Document | Item | Change |
|---|---|---|
| `DECISIONS.md` **D18** | The *"anything that sends"* row | **Scope line added.** The table governs registry commands; a surface that sends its own content is §8.6. **No row's answer changes** — a send is still not undoable |
| `DECISIONS.md` **D19** | **AC-943** | **Corrected in place, number kept.** The refusal is on `Send`, not on `Reply by email` |
| `DECISIONS.md` **D16** | The class taxonomy | **Gains class 4 — ephemeral working state.** Three classes were incomplete |
| `DECISIONS.md` **D22** | 45 s, cap 3 | **Unchanged.** Neither number gives; the collision was in D18's wording |
| `design/12-inbox.md` | Deviation 2 | **Sanctioned.** Cites D18a |
| | F-4 | **Closed** |
| | F-5 | **Closed** — class 4 |
| | F-1 | **Closed** — narrow reading ratified |
| | F-2, F-3 | **Still open, both mock-data-engineer.** `retryMessage`; the per-channel handle map. AC-1002 names the second as its blocker |
| `design/12-refusal-and-undo-surfaces.md` | F-1 / §6.2 D-15 | **DECLINE recommended**, with a fourth reason added and the measurement re-derived |
| | F-2 | **Adopted as §6.2 D-16, proposed** — and reshaped from an exception into a clause |
| | F-3 | Off-grid `ps-3.5` / `pe-1.5` on the bulk bar — **shell owner's**, unchanged, still open |
| `src/components/ui/sonner.tsx` | The `:18` comment | **Must be updated in the same change as §6.2 D-16.** It currently instructs the reader to remove a control the register requires |
| **AWAITING THE OWNER'S SIGNATURE** | — | **§6.2 D-15 and §6.2 D-16 join D-12, D-13 and D-14.** None blocks anything |

**On the two notes.** The Arabic figure: ≈3,875 is a grep and is reproducible, and the point worth
keeping is not the number but that **three relayed counts in this project have now been wrong and
re-deriving one costs a minute** — which is why the contrast ratios above were re-measured rather
than quoted, and why they are recorded with both figures side by side.

**D25 as implemented is stronger than D25 as ruled**, and that is the right direction:
`!isLedger && table.canSelect && bulkActions.length > 0` puts the derivation at the render boundary
where it cannot be bypassed by a screen that constructs its own table state. **The AC-46 framing
belongs in the code comment, which is where it now is** — the next person to meet a checkbox with
nothing behind it will find a criterion rather than a judgement call, and that is the difference
between a fix that holds and one that gets re-argued.

---

## D29 — the banned-word list

### D29 — `please` and `invalid` stay banned everywhere. **`failed` comes off the list.** AC-39 splits in two.

> **The ruling.** **`please` and `invalid` remain banned in every value of `EN`, absolutely, with no
> allow-list and no narrowing of the scan.** **`failed` is REMOVED from the banned-word list** — not
> scoped, not allow-listed, removed — because it names a member of three shipped unions and is
> ordinary past tense everywhere else. **A word list is a valid proxy only for a word with no
> legitimate domain use.** AC-39 keeps the two-word ban and its blame clause; **the vagueness rule it
> was really reaching for becomes AC-1006**, positive and review-checkable, because no regex decides
> whether a sentence is vague.

**Nine strings, zero copy defects. The coordinator was right to leave the test red and right that
none of the nine is a defect.** Leaving a guard red while a conflict is settled, rather than
weakening it to go green, is the practice this register has a section about and it was applied
correctly.

#### The proposed shape was checked and it does not work

The recommendation was: keep the whole-dictionary scan for `please` and `invalid`, **scope `failed`
to error and refusal copy**, plus an allow-list for state labels naming a union member of the same
name.

**Three of the nine are error or refusal copy and would still fail under that scope:**

| Key | Value | Kind |
|---|---|---|
| `comms.identity.blocked.failed` | *Verification failed for this address. Run it again before sending as it.* | **refusal** |
| `admin.integrations.delivery.failure.tlsError` | *The TLS handshake failed. Check the certificate, then replay.* | **error** |
| `admin.integrations.delivery.refusal.succeeded` | *This one was delivered. Only a failed attempt is replayed.* | **refusal** |

So all three would have to join the allow-list — **and at that point the allow-list holds sentences
rather than state labels, and the guard has stopped being a rule and become a list of exceptions.**
A guard whose exception list contains the very copy it was written to judge is not enforcing
anything; it is recording that it was overruled, one string at a time.

**This is the finding, and it is why the answer had to be removal rather than scoping.**

#### What the nine actually are

| # | Key | Value | What it is |
|---:|---|---|---|
| 1 | `comms.state.failed` | `Failed` | **Label** — `EmailDeliveryState.failed` |
| 2 | `comms.push.state.failed` | `Failed` | **Label** — `PushBroadcastState.failed` |
| 3 | `admin.integrations.delivery.state.failed` | `Failed` | **Label** — `WebhookDeliveryState.failed` |
| 4 | `comms.verify.failed` | `Verification failed` | **Label** — the fourth member of `unverified · pending · verified · failed` |
| 5 | `admin.integrations.event.paymentFailed` | `Payment failed` | **A third-party event name** — `payment.failed`, one of eight in a webhook catalogue |
| 6 | `comms.identity.blocked.failed` | *Verification failed for this address. Run it again before sending as it.* | Refusal **that names its next move** |
| 7 | `…delivery.failure.tlsError` | *The TLS handshake failed. Check the certificate, then replay.* | Error **naming a specific cause and a next move** |
| 8 | `…delivery.refusal.succeeded` | *This one was delivered. Only a failed attempt is replayed.* | Refusal **naming the rule** |
| 9 | `…delivery.desc` | *…and a replay for the ones that failed. A replay is a new attempt — the failed one stays in the log.* | **Descriptive prose. Not an error message at all** |

**Five labels, one third-party identifier, one paragraph of prose, and three error/refusal sentences
that each do exactly what §13 asks.** `comms/copy.ts:32` shows the author had already applied the
real rule by hand — *"`comms.identity.blocked.*` and `comms.resend.no.*` each end on a next move."*

**Row 5 is the one that settles it on its own.** `payment.failed` is an **event id a customer
subscribes to**. The console does not get to rename someone else's event, and a label that disagrees
with the id in the webhook payload is a support ticket generator.

#### The two-states-one-word problem, answered — and the relayed detail was wrong in a way that makes the answer stronger

**`bounced` does not render as "Not delivered". It renders as `Bounced`.** The six labels, read from
`copy.ts:59–64`:

> `Queued · Sent · Delivered · Bounced · Marked as spam · Failed`

Six distinct words for six states, and `types/email.ts:267` documents the distinction the union
exists to carry: *"a bounce is the recipient's mailbox refusing, a complaint is the recipient marking
it as spam, **a failure is ours**."*

**So renaming `Failed` to `Not delivered` is worse than the relay suggested, not equally bad.**
*"Not delivered"* is true of **three** of the six — `bounced`, `complained` and `failed` — so it
would collapse three states into one description, not two. **The unions stand and nothing is
renamed.** *(Fourth relayed detail in this project to be slightly off; re-derived here in a minute,
which is the whole point of the practice.)*

#### Why `invalid` stays absolute while `failed` does not — the rule, generalised

The obvious objection is that `EmailFailureCode` has a member literally called **`invalid-address`**,
so `invalid` faces the same collision and survives it. **It survives it for a reason that generalises,
and the reason is the ruling:**

> **A banned word survives contact with a domain vocabulary when the member is a CODE — never
> rendered. It cannot survive when the member is a LABEL — which must be rendered.**

`EmailFailureCode.invalid-address` is a code; its rendered copy is
*"The address is not a valid email address"* (`copy.ts:71`), and the resend refusal reads *"This is
not a valid address. Correct it on the account before sending again."* (`:82`). **The ban pushed both
into plainer English and neither pays a price** — which is the guard producing a better product and
is the reason it does not get an exception now or later.

`EmailDeliveryState.failed` is a **label**. It has to appear on screen, in a facet, in a filter and
in a log row. There is no copy to rewrite, because the copy *is* the state's name.

**`please` has no domain use at all**, in any union, code or label, anywhere in this product. It is
always politeness standing where information should be.

#### What is lost, said plainly rather than buried

**This ruling gives up a real catch.** `profile.field.failureReason: "Why it failed"` → `Reason` was
the guard working, and the rename was right — the word carried nothing the row's own badge did not
already give. **Nothing in this ruling would have caught it.**

That is the trade, and it is taken with the reason stated: **a guard with nine false positives to one
true catch gets suppressed by the next person under a deadline**, and a suppressed guard catches
nothing at all. The register has already watched a rule get disabled in code to make a commit pass
(`translate.ts:98`). **The way that happens is not malice; it is a guard
that has cried wolf nine times.**

#### AC-39 splits, and the half that cannot be mechanised is labelled as such

**The mechanisable half stays a test.** AC-39 keeps the word ban — now two words — and keeps its
blame clause, which is already a second `it()` and is sound.

**The half that is a judgement becomes a judgement, and gets a POSITIVE criterion.** *"Is this
sentence vague?"* is not decidable by regex, and pretending it was is precisely what produced a
three-word list standing in for a review. It also could only ever be a **negative** assertion — and
this register's closing section is about negative assertions passing vacuously.

> **AC-1006 — every error and refusal message names a cause or a next action.** A restatement that
> something did not work is not a message.

Checkable by a QA engineer reading the string and answering yes or no — which is checkable, and is
**not** the same as mechanical. The distinction is worth keeping honest: **not every criterion in
this product can be a test, and a criterion that pretends to be one is worse than a criterion that
admits it is a review.**

*(A two-sentence proxy — "what happened, then what to do" — was considered as a mechanical stand-in
and rejected: it fires correctly on all four good strings above, and also on D21's
`This captain is already suspended.`, which is one sentence and needs no second. Padding a good
refusal to satisfy a counter is the same failure in the opposite direction.)*

#### What it means for the build

- **`src/shell/qa.copy.test.tsx:98` — `BANNED` becomes `['please', 'invalid']`.** One array element
  removed. **The scan does not narrow, no allow-list is added, and no key is exempted.** Shell
  owner's file.
- **The test goes green with nine strings unchanged.** No copy is edited.
- **`specs/00-foundation.md` AC-39 is amended in place**, keeping its number: the word list drops to
  two, and it gains a sentence recording that `failed` was removed and why, so nobody restores it.
  **A struck word that is struck quietly grows back** — the reasoning §6.2 D-14 clause B already
  applied to a rule and the last addendum applied to a criterion.
- **`EmailDeliveryState`, `PushBroadcastState`, `WebhookDeliveryState` and the verification states are
  unchanged.** No union is renamed and no label is rewritten.
- **The test's own comment must carry the code-versus-label rule**, or the next person meeting
  `Failed` in a dictionary will re-add the word.

#### Acceptance criteria

**AC-39, amended** — No error message in the shell contains the words "please" or "invalid", and none
assigns blame to the operator. *("failed" was removed from this list by D29: it names a member of
`EmailDeliveryState`, `PushBroadcastState`, `WebhookDeliveryState` and the sender-verification states,
and a label must render its own state's name. Do not restore it.)*

**AC-1006** — Every error and refusal message names a cause or a next action; none consists only of a
restatement that something did not work. **Verified by reading the enumerated error and refusal keys,
not by pattern match** — this criterion is a review and says so.

**AC-1007** — No value anywhere in `EN` contains "please" or "invalid", asserted over every key with
no allow-list and no exempted namespace.

**AC-1008** — A state label whose key ends in a union member's name renders that member's own word;
`comms.state.failed`, `comms.push.state.failed` and `admin.integrations.delivery.state.failed` each
render `Failed`, and no two members of one state union render the same string.

#### How it would be falsified

If a vague error ships and reaches an operator — a bare *"Failed"* where a cause was available —
then removing the mechanical guard cost more than the nine false positives did, and the answer is
**AC-1008's shape applied to errors**: a per-namespace rule that error keys must differ from their
state labels, not a word list. If `please` or `invalid` ever acquires a legitimate domain use — a
union member, a third-party event name — the code-versus-label test above decides it, and it decides
it the same way it decided `invalid-address`: **a code is not copy.**

---

## D30 — credential authority

### D30 — A key cannot carry a scope its issuer does not hold. **RATIFIED**, with two scopes withdrawn and one guard added.

> **The ruling.** **The delegation rule stands.** An API credential may carry only scopes its issuing
> operator holds at the moment of issue; the refusal is a **422 naming the offending scopes**, the
> pane renders them **disabled in place rather than filtered out**, and the client is the enforcer
> with the form as a convenience. **Two scopes are withdrawn from `API_KEY_SCOPES` entirely, and
> offboarding gains a credential disposition step.**

**The coordinator's reading is right and the agent's reasoning was right: this is D17 applied, not a
new policy.** *A permission an operator does not hold is not theirs to lend.* Without it,
`manage_workspace` — the write key on the pane the form lives on — becomes a universal escalation
route, and one that leaves a **valid credential** behind rather than a denied action. **A bypass that
mints a durable artefact is worse than a bypass that performs one act**, because the artefact
outlives the session, the audit entry and the operator.

Three details of the implementation are ratified with it, because each is load-bearing:

- **Enforced in the client, not only the form.** A form that offers only the operator's own scopes is
  a convenience; a client that refuses is the rule. `integrations.ts:353` is the rule.
- **Disabled in place, not filtered out** (§11.2). The operator learns which scopes exist **and** that
  they personally cannot delegate them. Filtering would teach them the scope does not exist.
- **`manage_settings` is not offerable.** Correct, and it is D17 applied rather than a new call: it
  gates no route row and is scheduled for deletion, so a credential minted against it would silently
  lose authority the day it goes.

#### Two scopes withdrawn — the hole the delegation rule does not close

The rule binds the issuer to their own authority. **It does not stop an Owner, who holds all twenty,
from minting a credential that is Owner-equivalent** — and a machine credential is not a person:

- it has **no second factor** (`manage_security_policy` cannot apply to a thing with no login),
- it has **no session lifetime**,
- and **it survives its issuer's offboarding**.

> **`manage_team` and `manage_security_policy` are removed from `API_KEY_SCOPES`. Seventeen of twenty
> are offerable.**

Those two are the keys that change **who may do things**. A credential holding them can mint
operators or disable the second factor, permanently and without a human in the loop. **A script that
needs to create an operator is a script that should fail and page somebody.** This is not a
delegation question — no issuer, however senior, should be able to put those two behind a bearer
token — which is why it is a withdrawal from the list rather than another clause on the issuer check.

**`manage_data_governance` stays offerable**, because a nightly export is a legitimate automation.
**But it also covers PDPL erasure execution, and erasure by bearer token is not acceptable** — see
AC-1012, which is flagged and unbuilt.

#### The credential must not outlive its issuer silently

`manage_team`'s F-016 guard refuses to strip the last holder. **A credential is the same hole in a
different shape:** offboard the operator, and the key they issued keeps working under authority
nobody holds any more.

> **Offboarding an operator lists the credentials they issued and requires an explicit disposition —
> reassign to a named holder, or revoke — before the offboarding completes.** Not automatic
> revocation, which would take production integrations down at the worst moment; **an explicit act,
> refused silently by nobody.** Same shape as F-016: the transition does not complete on its own.

#### The two related decisions, both ratified as reported

- **Rotation has no overlap window.** Correct, and the reason given is the right one: an overlap makes
  *"is the leaked key dead yet"* unanswerable, and that is usually the question that prompted the
  rotation. **Staged rotation is a real feature, reported rather than invented** — recorded here as
  wanted-not-built so it is asked for rather than discovered as an omission.
- **AC-951 ruled the strong way — endorsed without reservation, and this is the entry that keeps it
  from eroding.** The secret is **not stored**: no `secret` field, **no digest field**. The reasoning
  is exactly right and worth restating in the register because it is the part that gets argued away —
  **a digest is a field with no reader, and it is the first foothold for a
  `GET /api-keys/:id/secret` that "already has the data".** A separate `IssuedSecret` type means no
  `Paginated<ApiKey>` and no cache can ever hold one; `oneTime: true` as a field rather than a comment
  means a future `false` is a reviewable change rather than an invisible one; and the reveal dialog
  having **no close affordance until acknowledged** is the difference between a promise and a
  guarantee. **Rotation is the support path for a lost secret, not a hardening ritual** — stated in
  the type, which is where it survives.

#### Acceptance criteria

**AC-1009** — An operator issuing an API key is offered every scope in `API_KEY_SCOPES`, with the
scopes they do not hold rendered disabled in place and named, not omitted from the list.

**AC-1010** — A request to issue a key carrying a scope the issuer does not hold is refused with a 422
naming every offending scope, and no key is created — asserted against the client directly, not
through the form.

**AC-1011** — `manage_team`, `manage_security_policy` and `manage_settings` are absent from
`API_KEY_SCOPES`, and a request naming any of them is refused as an unknown scope even when the
issuer is an Owner.

**AC-1012** ⛔ **BLOCKED — unbuilt, flagged here rather than assumed.** Erasure execution requires a
human actor and cannot be performed by a bearer credential holding `manage_data_governance`.
**Owner: mock-data-engineer**, with product-owner to spec the actor check.

**AC-1013** — Offboarding an operator who issued at least one live credential lists those credentials
and does not complete until each is reassigned to a named holder or revoked.

**AC-1014** — Rotating a key invalidates the previous credential immediately, with no window in which
both authenticate.

#### How it would be falsified

If integrations are routinely blocked because the operator who needs the credential does not hold the
scope the integration needs, the delegation rule is enforcing an org chart that does not match the
work — and the fix is to grant that operator the permission, which is auditable, **not to loosen the
issuer check**, which is not. If withdrawing `manage_team` blocks a genuine provisioning integration,
that integration wants a purpose-built endpoint with its own audit trail, not a general-purpose key.

---

## D7a and the amendments made during remediation

### D7a — Brand green replaces near-black as `--primary`, amending D7 §1.2

**Ruled during remediation.** A visual proposal held its whole colour pass open —
*"Introducing brand green as `--primary` amends D7 §1.2. That is the owner's call, not mine."*
The call is made: **`--primary` is the Eyvar brand green `#0C6944`.**

**What changed** — four lines in `src/styles/globals.css`, layer 2 only. No component was
touched, which is the entire argument for the token discipline.

| Slot | From | To |
|---|---|---|
| `--primary` | `--ev-ink` `#171a21` | `--ev-brand` `#0c6944` |
| `--ring` | `--ev-blue` `#2b6ef0` | `--ev-brand` |
| `--chart-series` / `--chart-comparison` | `--ev-blue` | `--ev-brand` |
| `--chart-fill` | `--ev-blue-lt` `#eaf0fe` | `--ev-brand-lt` `#e7f0ec` |

`#0C6944` = `hsl(156 79% 23%)` is the dark stop of the brand's own authored axis
(`--brand-hue: 156 / --brand-saturation: 80% / --brand-lightness: 37%` → `#13AA6D`), declared
by `eyvar.com/en` and drawn by the whole `logo2.svg` wordmark. It is not eyedropped.

**What D7 keeps.** Everything else. D7's method, its measurements and its whole ramp stand.
R3 stays killed and D-1 stays void — the primary action did **not** go back to blue, and
Eyvar brand *blue* `#185FA5` remains dead. The reason D7 chose near-black was a correct
reading of a neutral reference; the reason it is now green is that **a reference is not the brand**,
and doc 13 §0.2's finding decides it: the admin contained zero Eyvar green, so a product with
a green identity shipped a blue-and-black console.

**What it costs, computed.** `--primary-foreground` on `--primary` falls from **17.411 : 1**
(white on `--ev-ink`) to **6.731 : 1**. That clears the product's target — WCAG 2.2 **AA**,
4.5 : 1 per `docs/ref/a11y.md` — with margin, and it does not clear AAA. Every other affected
ratio *improved*: the focus ring goes 4.574 → **6.731** on white, 4.294 → **6.319** on
`--ev-bg2`, 3.887 → **5.721** on the rail; the chart series goes 4.006 → **5.793** against its
own area fill.

> **That proposal stated white on `#0C6944` = 8.42 : 1 and "clears AAA". It is
> wrong.** `L(#0C6944) = 0.10601`, so `1.05 / 0.15601` = **6.731 : 1**. Do not cite 8.42.

**The success/primary hue collision (doc 13 §1.4) is resolved, not accepted.** `--ev-green`
`#15653c` sat 6.8° of hue and 1.0 pp of lightness from the brand — dE76 **3.33**, which is
"same colour, other monitor" — and it is spent *bare* on white in `OnboardingStepRow` and
`StrengthMeter`, not only as a badge label. The brand cannot move, so success moved, on all
three axes at once because hue alone only reached dE76 5.9:

`--ev-green: #15653c → #1d723c` = `hsl(142 60% 28%)` — **14.2°** of hue (was 6.8), **5.1 pp
lighter** (was 1.0), **20.1 pp less saturated** (was 13.9), **dE76 10.09** (was 3.33).
Success is now the lighter, softer, yellower green; the brand action is the darker, deeper,
bluer one, so visual weight reads as authority. It still clears AA everywhere it is used —
5.332 on `--ev-green-lt`, 5.958 on white, 5.593 on `--ev-bg2` — and it loses AAA on white,
which was headroom and not a requirement. `--ev-green-lt` is unchanged; it was already 16°
off the brand, and this incidentally closes a 9° disagreement inside the success family.

**Not taken, and escalated rather than decided.** Doc 13 §1.2 lists a fourth re-map — the
link colour, `--ev-blue-dk` → brand. It is **not** done here. The task that authorised this
ruling named three slots, and turning links green removes the last non-brand accent in the
product and collides with `--tone-info`, which is a semantic change rather than a re-skin.
Links stay `--ev-blue-dk` pending a separate ruling.

**Reversible.** Point `--primary` back at `var(--ev-ink)`, `--ring` and `--chart-series` back
at `var(--ev-blue)`, `--chart-fill` back at `var(--ev-blue-lt)`, and `--ev-green` back to
`#15653c`. Five lines in one file, no component change, no migration.

---

## D-11a — who owns focus when a menu hands off to a layer: **the layer wins**

**Status:** ruled and implemented. Supersedes the open question in
`design/02-shell-fixes.md` §13, which assigned it to product-designer and left it unanswered.
`shell/qa.keyboard.test.tsx` carried it as an `it.fails`; that test is now inverted.

**The defect, measured in the production build.** Opening *My profile* from the account menu
puts focus on the sheet title at t=0, on `body` at ~50ms, and **back on the dropdown trigger
at ~150ms — while the drawer is still open.** Radix restores focus to the trigger in
`onCloseAutoFocus`, and that async write lands last. The operator then tabs through the page
behind the thing they just opened. The same shape applies to `NotificationBell`'s *See all*,
which is two of the three routes to a shell layer from the top bar.

**The ruling.** A menu that hands off does not take focus back. The grounds are lifetime
(R10): a menu's focus-restore exists so that *dismissing* it costs nothing, and a layer is not
a dismissal — it is a destination. AC-67 already requires that opening a shell layer move
focus into it, so this is the shell obeying a criterion it already had.

**The mechanism, and why it is conditional.** A ref set only by an item that opens a layer,
read once in `onCloseAutoFocus`. **Blanket suppression is wrong and must not be substituted:**
Escape, and every item that acts in place, must still return the operator to where they were.
Two call sites — `AccountMenu`'s *My profile* and *Onboarding*, and `NotificationBell`'s *See
all*. Reasoning is duplicated in `components/ui/dropdown-menu.tsx` so the next audit does not
refile it.

**Reversible.** Delete the two `onCloseAutoFocus` handlers and the refs that feed them, and
flip the test back to `it.fails`.

---

## D-12 — peek is the drawer, not a sixth surface

**Status:** ruled. Closes the system-wide UX audit's finding G8.

`docs/ref/surfaces.md` already carries the row verbatim: *"a surface consulted against the
page behind it → drawer, no scrim."* Every requirement G8 states for peek was verified
against the **built app**, not the source: no scrim, the page behind stays interactive,
Escape closes, Tab from the last control leaves the drawer while it stays open, focus restores
to the opener, 200ms direction-aware slide.

Peek and drawer are the same object under two names. Adopting both gives **six names to five
surfaces**, and the first argument about which one to use has no principled answer.

**G8's real content is a routing defect.** My Work's *Open* and the Conversations thread
navigate away where they should consult. Send them to `Sheet`; nothing in the component
changes to allow it.

**Two proposed modes refused.** `side` plus a persisted per-operator preference makes the
surface a variable — no design spec could then state what an operator sees, and every bug
report would begin by asking which mode they were in. `full` is component reuse on a route,
which is welcome, but a page is already its own row in `surfaces.md` and does not need to be a
mode of a drawer.

---

## D-13 — motion has no duration tokens, and the request for a duration scale is refused

**Status:** ruled and implemented.

A visual proposal asked for six motion tokens. **Minting them is the defect.** `globals.css`
states the reason at the token: Tailwind's duration scale *is* the token set, and a second
source drifts. `--ev-live-loop: 1800ms` remains the only motion token, because it feeds an
`animation` shorthand the scale cannot reach.

Motion is licensed by purpose, not taste — a layer at 200ms, a popover at 100ms, a live-queue
row at 150ms — and `dist` now emits exactly `.duration-100` and `.duration-200`.

**The blanket property transition is banned outright**, and not on principle. `--font-sans`
leads with Inter Variable declared `font-weight: 100 900`, so `transition: all` interpolates
the **weight axis**: a 500 → 600 change measured `511 → 592.25` over 150ms, physically
thickening a label on every tab selection and every toggle press, in both languages. It also
transitioned the focus ring, which rides on `box-shadow` — and a ring that fades in is a ring
that is not yet there.

**The sanctioned live-feed loop is deliberately not built.** §7.6 makes a pause/stop/hide
control a MUST under SC 2.2.2 and explicitly rules an opacity loop of this shape an AA failure
without one. Where that control lives is a shell decision, and Live Dispatch already says
"Live connected" in words.

Guarded by `src/components/ui/motion.licence.test.ts`, whose class names are assembled at
runtime — because a test that greps for a utility by writing it also ships it.

---

## D-F32 — a `Metric` derived from a server response is not a minted literal

**Status:** ruled and implemented. Closes **Q-F14** (`specs/03-financials.md` §13a).

`src/screens/financials/shared/Figures.tsx` opened with a rule: *a Financials figure is not a
`Metric`, so it must not borrow `MetricTile`*. The premise was stated in the same paragraph —
*"a contribution margin is arithmetic over the period's postings … with no series behind it and
no delta to state"* — and the conclusion followed from it: passing such a figure through a
component built for a keyed measure would mean **minting a fake `Metric` per figure**, which is
the hand-written literal **AC-346** exists to prevent.

**The premise no longer holds.** `FinancialsOverview` now carries a `comparison` window and a
`daily` series (§2.1, §2.2), both computed from the same postings as every other figure on the
read. A `Metric` whose value, whose comparison and whose series all come from one server
response is not minted; it is the response, typed for the component that draws it. The
adapter that does the typing is `src/screens/financials/overview/toBoard.ts`, and it contains
no number literal — the same structural guarantee `getFinancialsOverview` gives.

**What the rule still forbids, unchanged.** A figure with no comparison and no series does not
become a `Metric` by being wrapped in one. Where a Financials surface has only arithmetic —
the H5 calculation card, the payout confirmation's three lines, the trial-balance totals — it
uses `FigureRow`, which draws the **operators** of a sum and which no metric tile can.

**Consequence.** Financials Overview is a board: `BoardHero`, `Chapter`, `ChapterFigures`,
`MetricTile`, `ChartCard`, `BreakdownList`, plus one new `DecisionList`. `Figures.tsx`'s
opening rule is rewritten to say so. Revenue & Refunds' plan detail (§4) follows the same
reading when `PlanRevenueDetail` lands.

**What was NOT decided here.** Whether Financials may use the categorical chart palette
(Q-F11), whether a period closes (Q-F8), and whether a contribution-% target exists (Q-F10)
are all still open and all still ship as the plan's defaults.

---

## D21a — Admin: three things the workspace deliberately does not do

**Status:** decided.

| | Decision |
|---|---|
| **Scoping a role to cities or zones** | **Not now.** D16 stands. The demand is recorded; if it arrives, the cheapest shape is a `cityIds` column on the per-user permission delta. |
| **Impersonation, or *Act as*** | **Out.** The legacy console had it. D20 rules it out and this confirms it: the mock-user switch covers what QA needs, and an audit trail that can say *someone acted as someone else* is a different product. |
| **Bulk invite from a CSV** | **Not now.** Five operators do not need it. A second city might, and then it is one screen. |

Three that **are** in force, so the reasoning is not re-derived: custom roles exist, with the
six built-ins locked and *Duplicate as custom* the only way to start one; the compensation cap
is a role default **plus** a per-operator override, displayed as an override; an invite goes out
as an email the product can show **and** as a copyable link, because email is not always where a
new hire looks. On-call is the two-name rota, and the tile computes from the rota rather than
carrying a literal.

---

## D21b — Five cross-cutting rules settled during the Management and Operations pass

**Status:** decided and implemented.

| # | Rule |
|---|---|
| **O1** | **`--ev-bp-wide` is 1280px**, not 1344. Every `wide:` layout was designed for the operator's screen, and the 64px gap above D2's floor was arithmetic rather than a decision. The six `wide:` widths in `globals.css` are measured against 1280. |
| **O8** | **A nav badge counts what the sub-tab's default view shows**, computed by the same client that draws the view, and its accessible name says so. A badge whose number disagrees with the screen it points at is worse than no badge. |
| **O9** | **An empty cell is blank when the value does not apply** — a decided application has no SLA. A muted word appears only when the absence is a fact the operator acts on: `No owner`, `Not settled`, `Not set`. Never an em dash, never a fill, never an icon. |
| **O10** | **A directional glyph is chosen by `dir` in code**, through the one helper `directionalIcon(dir, Start, End)`. No CSS rotation site remains. |
| **O11** | **The back arrow on a detail route is the page header's**, beside the title where the eye lands. Top bar slot 1 stays empty on every route. |

Two that stay open and are named where they block: a licensed tile provider for the two maps
(`Basemap` isolates the URL), and `Driver.position` on the wire, without which the dispatch map
cannot claim where a captain is.
