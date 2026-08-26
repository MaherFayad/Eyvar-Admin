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
