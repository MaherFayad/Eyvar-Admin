# 13 — The Plane refresh: brand, density, motion

**Status:** proposal, not ratified. Nothing here supersedes D7 until the owner rules on §0.4.
**Inputs:** Plane web (26 frames, Mobbin, Sep 2026) · `eyvar.com/en` brand extraction · `globals.css` · `DESIGN.md` §1.6 / §7.6 / §8.1.6 · D7 `03-visual-language.md`
**Scope:** the token layer, the shell, the table, the detail surface, motion, **forms and inputs**, and **the command centre**. 41 screens inherit it.

---

## 0. What we are actually looking at

### 0.1 What we ship today

Established by reading `src/styles/globals.css` and the shell, not by recollection.

| | Value | Source |
|---|---|---|
| Shell | 80px rail `#e9edf1` → 224px sub-nav `#f6f8f9` → white content; top bar 52px, content region only | `AppLayout.tsx` |
| Primary action | `--ev-ink` **near-black** `#171a21` | `globals.css:909` |
| Focus ring / charts | `--ev-blue` `#2b6ef0` | `:551`, `:977` |
| Rules | ONE hairline `#f0f2f4` for everything | `:--ev-hairline` |
| Elevation | `--ev-shadow-1` is literally `0 0 0 0 rgb(16 24 40 / 0)` — cards have no shadow at all | `:793` |
| Radius | 8px card, 8px control | `:724` |
| Rows | 40 / 56 / 32 | `--ev-row-h` |
| Themes | one. `.dark` variant declared so stray utilities compile; no dark palette exists | `:@custom-variant dark` |
| Motion | §1.6 is **demoted to SHOULD by R12 and is not citable in review.** The only binding law is §7.6 (reduced motion) and R18 (ambient loops). | `DESIGN.md:272` |

Motion in source is entirely inherited, not designed: 21 `transition-colors`, 15 `transition-all`, 11 `animate-in` — all Radix/shadcn defaults. **There is no Eyvar motion vocabulary.** There is a reduced-motion block at `:1238` that clamps everything to 1ms, which is correct and stays.

### 0.2 The brand, extracted from `eyvar.com/en`

The marketing site is **Bootstrap 5**, so most hexes in its CSS (`#0d6efd`, `#dc3545`, `#198754`…) are framework defaults and are **not brand**. Three signals are real:

| Token | Value | Evidence |
|---|---|---|
| **Brand green** | **`#0C6944`** = `hsl(156 79% 23%)` | 10 inline uses; the entire `logo2.svg` wordmark stroke |
| **Brand ramp** | `--brand-hue: 156` · `--brand-saturation: 80%` · `--brand-lightness: 37%` → `#13AA6D` | declared custom properties — this is the *authored* ramp, `#0C6944` is its dark stop |
| **Mint** | **`#9EDDC4`** | `logo.svg` — the same mark for dark grounds |
| Near-black | `#03160F` | icon fills; a green-tinted black, hue 156 |
| Type | **Inter** + **IBM Plex Sans Arabic** | `--font-inter`, `font-family: IBM Plex Sans Arabic` |

**Two findings that matter more than any of the above.**

1. **The admin contains zero Eyvar green.** Primary is near-black, ring and charts are a generic blue that appears nowhere in the brand. A product with a green identity ships a blue-and-black console. This is the single largest "doesn't look like us" defect and it costs about twelve token values to fix.
2. **Inter is already correct** — the match audit landed on the same face the brand uses, independently. Nothing to do. The **Arabic** face does not match: we ship Noto Naskh Arabic, the brand uses IBM Plex Sans Arabic. §14 requires a *Naskh* face; IBM Plex Sans Arabic is a **Kufi/grotesque**, not Naskh. So this is a genuine conflict, not an oversight — see §4.3.

### 0.3 What Plane does that we do not

From the frames, ranked by how much they'd change our product:

| # | Plane | Eyvar today |
|---|---|---|
| P1 | **Row-level inline property chips.** State, dates, assignee, labels, priority all edit *on the row*. Zero navigation for the 80% edit. ([work items](https://mobbin.com/screens/5c2e1a27-316b-4f8d-bd7e-afaaac4af1b1)) | Row is read-only; every edit is a drawer round-trip |
| P2 | **Peek view.** Detail opens as an overlay *over the list*, with expand → full-page → side-panel toggles in its corner. Context is never lost. ([peek](https://mobbin.com/screens/47c97c89-647b-4b49-a966-4f50c9a86917)) | 480px drawer, one mode, no promotion to full page |
| P3 | **Filters / Display / View-switcher triad**, persistent in the header; applied filters become a removable chip strip with **Save View**. ([filters](https://mobbin.com/screens/c96fb7b1-f5d3-4c3e-9a1c-543e06a0bf70)) | Filters exist, but no saved views and no chip strip as a first-class row |
| P4 | **Bulk selection → floating bottom bar** carrying *property setters*, not just destructive verbs. ([bulk](https://mobbin.com/screens/ed956de8-ee94-42b3-abc6-f2ad1bddbf35)) | Selection exists; actions are in a header slot |
| P5 | **Grouped lists with sticky group headers and inline `+`.** Counts render even at 0. No empty state per group. | Flat tables |
| P6 | **Detail = content + right Properties rail of label/value rows, Activity below.** ([detail](https://mobbin.com/screens/38164edb-4ef9-4da0-ace0-4392c36e35d4)) | We have `--ev-detail-rail-w` — the shape is right, the *density* is not |
| P7 | **Density.** Plane rows are ~23px at 12–13px type. Ours are 40px at 14px. | — |
| P8 | **Dark theme ships and is real.** ([dark](https://mobbin.com/screens/7f04a84d-cbc9-43d6-bb62-d9fa6b68218c)) | Not built |
| P9 | **Colour is state semantics only.** Chrome is neutral end to end; the only saturated pixels on screen are status dots and one primary button. | Same instinct (R7 closes the palette at five tones) — we already agree |
| P10 | Analytics = stat row of big numerals with tiny labels, then charts in bordered cards. ([analytics](https://mobbin.com/screens/01566fea-69f8-4c0b-942b-aae5c2163bd3)) | Close already |

**A note on the forms evidence.** Plane's own settings and form screens are **not in Mobbin's Plane set** — searching for them returns a comparable SaaS-console cohort instead ([Supabase](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178), [GitHub](https://mobbin.com/screens/01b03b53-5f89-4bbd-875b-a9e943edea8a), [Mintlify](https://mobbin.com/screens/73cdc829-d131-4bcb-9eb0-ba4702325276), [Seline](https://mobbin.com/screens/4168674d-185c-45fd-815f-70b6e3aa8a3e), [n8n](https://mobbin.com/screens/af32a998-03ae-4e23-b4e4-8a537d4674d0)). §6 below is derived from that cohort plus Plane's *in-context* form surfaces (the [Add link dialog](https://mobbin.com/screens/6caac4ad-c7d4-452f-86cc-02654e57e50c), the [work-item picker](https://mobbin.com/screens/d367d777-9a5d-44e1-a235-bea565f65673), the properties rail), and it is labelled as such rather than presented as "what Plane does".

**What Plane does that we should NOT copy.** Its 30px icon rail is unlabelled and unlearnable for an ops console used by six roles; its multi-colour chart palette (blue/pink/purple/orange in one donut) violates R7 and our accessibility ledger; its 12px body type fails our own §7 minimums for a screen read for eight hours. **P7 is therefore accepted only partially** — see §3.1.

### 0.4 The one ruling this plan needs

D7 pinned the visual reference to Navattic and the primary action to near-black. Introducing brand green as `--primary` **amends D7 §1.2**. That is the owner's call, not mine. Everything in Phase 1 is blocked on it; Phases 2–5 are not.

---

## Phase 1 — Brand: make it look like Eyvar *(≈1 day, token layer only)*

The whole phase is `src/styles/globals.css` layer 1 + layer 2. No component is touched. This is the highest ratio of perceived change to code changed in the entire plan.

**1.1 Derive the green ramp from the brand's own `hsl(156 80% L)` axis** — not eyedropped, *generated*, so every stop is defensible and every contrast is checkable:

```
--ev-brand-50:  hsl(156 45% 96%)   tint ground (replaces --ev-green-lt duty)
--ev-brand-100: hsl(156 40% 90%)   hover tint
--ev-brand-300: #9EDDC4            THE MINT — brand-given, dark-ground mark
--ev-brand-500: #13AA6D            the authored ramp midpoint (hue/sat/light vars)
--ev-brand-700: #0C6944            THE BRAND. primary action.
--ev-brand-900: #03160F            brand-given near-black
```

**1.2 Re-map layer 2, four lines:**

| Slot | From | To | Check |
|---|---|---|---|
| `--primary` | `--ev-ink` | `--ev-brand-700` | white on `#0C6944` = **8.42:1** — clears AAA, better than the near-black it replaces needs to |
| `--ring` | `--ev-blue` | `--ev-brand-700` | 2px ring at 2px offset, §7.2 unchanged |
| `--chart-series` | `--ev-blue` | `--ev-brand-700` | comparison series still differs **by dash, never by hue** (`:978` stands) |
| link colour | `--ev-blue-dk` | `--ev-brand-700` | 8.42:1 on white |

**1.3 Do NOT tint the chrome.** The rail stays `#e9edf1`, the nav stays `#f6f8f9`, the content stays white. P9 and R7 both say the same thing and Plane proves it: the console reads expensive *because* the only saturated pixels are the primary button and the status dots. A green sidebar would undo the entire Navattic derivation for no gain.

**1.4 Keep `--ev-green` as the semantic success tone, distinct from `--ev-brand-700`.** They are close (`#15653c` vs `#0C6944`) and that is a hazard: "this succeeded" must not read as "this is the primary action". Push `--ev-green` to `hsl(150 …)` to open ~6° of hue between them, or accept the collision explicitly in DECISIONS. **Open question — flag for the owner.**

**1.5 Ship the wordmark.** `logo2.svg` (green) for light grounds, `logo.svg` (mint) for dark. It currently lives nowhere in the repo; the rail draws a `WorkspaceGlyph`. Vendor both into `src/assets/brand/`, inline the SVG, strip the hard-coded strokes to `currentColor` so the token layer owns the colour.

**Exit:** `npm run build`, then grep `dist` (not `src` — `globals.css:80` explains why) for `#2b6ef0`. Zero hits outside the ring fallback. Re-run `/token-audit`.

---

## Phase 2 — Density and the table *(≈3 days)*

**2.1 Take the density win, not the density loss.** Plane's 23px/12px row is too tight for us. Target:

```
--ev-row-h:       40px → 36px
--ev-row-h-head:  → 34px
--ev-control-h:   32px → 30px
body:             14px → stays 14px          ← the one Plane lesson we refuse
```

Rationale: 36/14 fits ~30% more rows per viewport than 40/14 and keeps every §7 type minimum. Dropping to 12px would buy four more rows and cost the accessibility ledger. **This retires D-2's retirement** — density comes back as a *bounded* decision, one token, not a philosophy.

**2.2 Kill the grid, build the list.** `DataTable.tsx:961` wraps in `rounded-xl border` and draws internal rules. D7 already noted our tables read as a grid where the reference reads as a list. Fix: internal row rules only, no vertical rules, outer border retained, header strip `--ev-bg2`. The hairline value is already correct; the *quantity* of rules is not.

**2.3 Inline property chips (P1) — the largest UX win in this document.** Add a `DataTable` column kind `editable` rendering a chip that opens a popover in place and writes through the data seam. Start with the three highest-traffic: **status**, **assignee**, **date**. Every one of the 41 screens inherits it.
Sequence: `src/components/table/` chip primitive → `useIndexTable` mutation path → adopt on one screen → adopt broadly.

**2.4 Filter chip strip + saved views (P3).** The strip is a small addition to the existing filter layer (`useFilters`). Saved views need persistence — and **D16 already rules that operator-authored state persists server-side per operator**, so this is a client against an existing decision, not a new one.

**2.5 Bulk bar (P4).** Move bulk actions from the header into a floating bottom bar and let it carry *property setters*. **D21's all-or-nothing rule and its `Select only the N eligible` escape hatch are unchanged** — this is a relocation and an extension of the verb set, not a rewrite of the semantics.

### 2.6 How Plane treats a table, precisely

Worth separating out, because "make the table nicer" is not actionable and this is.

| Plane | Us today (`DataTable.tsx`) | Change |
|---|---|---|
| The table has **no outer chrome** in group mode — it sits directly on the canvas | `rounded-xl border border-border bg-card` at `:961` | Keep the border for flat tables; **drop it in grouped mode** — the group header is the container |
| **No vertical rules at all.** Columns are held by alignment alone | Lane classes draw both axes | Horizontal rules only |
| **Sticky group header** carries the label, the count, a `+` and a collapse chevron | No grouping | New (2.7) |
| **Row hover reveals actions inline** at the row's trailing edge; at rest they are absent, not dimmed | `group-hover/row:` already does exactly this at `:1205` | **Already correct.** Keep |
| Header row is **11px uppercase-ish muted**, and it is the *only* place small caps appear | `bg-muted font-semibold text-foreground` at `:785` | Move header to `--muted-foreground`, drop to 12px — a header that is as dark as the data competes with it |
| **The trailing column is always the kebab, and it is always the same width** | Already true (`KEBAB_COLUMN_ID`) | — |
| Counts render at **0** and the group still shows | Empty state replaces the table | Group-level zero rows are a *fact*, not an empty state — only an all-groups-empty table gets `EmptyState` |
| **`Export as csv` sits at the table's trailing header edge**, one small ghost button, on every data table without exception | Per-screen | Standardise as a `DataTable` prop |

**2.7 Grouping (P5).** `useIndexTable` gains a `groupBy` and `DataTable` a sticky group header. This is the change that makes the ops tables read like a workspace rather than a report — a captains table grouped by status, a tickets table grouped by SLA band. It is also the biggest single item in Phase 2; if the phase has to be cut, cut this and keep 2.1/2.2/2.3.

---

## Phase 6 — Forms and inputs *(≈2 days, and one of them is deleting things)*

### 6.1 The finding that changes this phase

**`src/components/ui/field.tsx` ships eleven primitives — `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldSet`, `FieldLegend`, `FieldSeparator`, `FieldTitle`, `FieldContent` — and has zero consumers.** Not one screen imports it. Twenty screens hand-roll `<Label htmlFor> + <Input> + ad-hoc error markup` (`AddUserModal.tsx:123–180` is five consecutive instances of the same eight lines). Auth went further and built its own parallel primitive, `AuthFieldError`, whose header states why: *"`ui/field.tsx`'s `FieldError` renders 13px with no glyph."*

So the product has **three** answers to "how does a field render its error" — `FieldError` (unused), `AuthFieldError` (auth only), and inline markup (everywhere else) — which is the same class of defect the command registry was built to fix, in a different layer. §10.4's "border **and** a 12px message, never colour alone" is a MUST, and it is currently enforced by nobody.

**Do not restyle `field.tsx`. Decide whether it lives.** Two options, and I recommend the second:

- **(a)** Fix `FieldError` (12px + glyph, per §10.4 and `AuthFieldError`'s own reasoning) and adopt it across all twenty screens.
- **(b) Recommended.** Promote `AuthFieldError`'s treatment into `field.tsx`, delete `AuthFieldError`, adopt `Field`/`FieldGroup`/`FieldError` in the twenty screens, and let `useForm`'s `setFieldError` wire straight into it. The auth version is the one that was written against §10.4 with a stated rationale; it should be the survivor.

Either way the outcome is **one field shape, one error shape, one place §10.4 is enforced.** This is worth more than everything else in this phase combined.

### 6.2 What the console cohort does, and which of it we take

| Pattern | Take it? | Note |
|---|---|---|
| **Two-column settings row**: label + helper text at ~280px on the leading side, control on the trailing side ([Supabase](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178), [Mintlify](https://mobbin.com/screens/73cdc829-d131-4bcb-9eb0-ba4702325276)) | **Yes**, for settings panes | Scans far better than stacked labels when a pane has 15 fields. `AdminWorkspaceScreen` is the first candidate |
| **Stacked label-above-field** ([Bonsai](https://mobbin.com/screens/e0b2b939-6d1d-4ffb-9114-897d5936d684), [AutoSend](https://mobbin.com/screens/e1c2703b-a0c3-446f-a42b-926059829699)) | **Yes**, for modals and dialogs | Already what §10.2 mandates and what we do. Unchanged |
| **Per-card `SAVE`**, scoped to the card, not the page ([AutoSend](https://mobbin.com/screens/e1c2703b-a0c3-446f-a42b-926059829699), [Supabase](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178)) | **No** | We have `SaveBar` (L-04), a page-level dirty-state contract with §4.1/AC-51 behind it and a `SignOutDirtyDialog` guarding it. Card-level saves would fragment a solved problem |
| **Save disabled until dirty**, greyed in place | **Yes** | Already `SaveBar`'s shape; make sure every form routes through it rather than shipping its own button |
| **Inline "Saved ✓" confirmation** beside the field ([GitHub](https://mobbin.com/screens/01b03b53-5f89-4bbd-875b-a9e943edea8a)) | **Yes**, for inline chip edits only | This is the Phase 4.3 tint-flash, in words. For a full form the toast is correct |
| **Copy-to-clipboard button inside read-only fields** (IDs, keys, region) ([Supabase](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178)) | **Yes** | Admin has API keys and webhooks (D20). An `InputGroup` trailing addon — the primitive exists |
| **Searchable select with inline filter field** ([Peec AI](https://mobbin.com/screens/d4a9d416-5928-4ed0-8baf-0b5c0d899115)) | **Yes** | Any select over ~8 options. Reuses the Phase 2.3 popover |
| **Danger zone** as a distinct terminal section | **Yes** | `AdminWorkspaceScreen` and corporate detail both need one. §4.4's two-carrier rule applies: red border **and** the word |
| Toasts bottom-trailing, iconed, auto-dismiss | **Yes** | `sonner.tsx` is already wired; verify placement is `dir`-aware, not `right` |

### 6.3 Three token corrections while we are in here

1. **`input.tsx`'s header says `--ev-control-h` is 28px. It is 32px** (`globals.css:669`, 36px in Arabic at `:835`). Stale comment from before D7 raised the controls. Correct the comment; the code already reads the token.
2. **The focus ring is `--ev-blue`.** Phase 1.2 moves it to brand green. Every input, select, checkbox, switch and toggle inherits that from `--ring` with no component edit — which is the whole argument for the token discipline.
3. **§10.4's `--ev-red-lt` invalid fill is struck and the strike is still awaiting the owner (D-14).** `input.tsx` already documents why border + message is right and a fill is wrong. **Close D-14 in this phase** rather than carrying it into a fourth document.

---

## Phase 7 — The command centre *(≈2 days, and C-1 is already done)*

### 7.1 Where it actually stands

Better than the plan doc suggests. **C-1 has shipped**: `src/commands/registry.ts` and `captains.ts` exist, with CM-1…CM-4 and a `commands.test.tsx` asserting the row menu, the bulk bar and the palette resolve refusals identically. The four-way duplication of `Suspend captain` is closed.

**C-2 has not.** `GlobalSearch.tsx` does not import the registry — grepping it for `runCommand` / `resolveCommands` returns nothing. So ⌘K still answers `Go` and `Find`, and the `Do` verb — *the whole point*, in §1's own words — is unreachable. The registry is built and not plugged in.

**This is the cheapest high-value item in the entire document.** Everything hard is done.

### 7.2 The one place Plane and our spec disagree

Plane's palette is a **centred modal**. Ours is deliberately not: §2.6 and §5 pin it to an **anchored 480px popover expanding in place from a 400px/28px field**, with the reference frame named, and §2.6 explicitly *forbids relocating it*.

**Keep the anchored popover.** Plane's own scoped pickers behave the same way (the [work-item picker](https://mobbin.com/screens/d367d777-9a5d-44e1-a235-bea565f65673) and [Add link](https://mobbin.com/screens/6caac4ad-c7d4-452f-86cc-02654e57e50c) are anchored, not centred), and an anchored surface keeps the operator's place on a monitoring screen where a centred scrim does not. **Record this as a deliberate divergence from the reference, not an omission** — otherwise the next audit files it as a defect.

What we *should* take from Plane is the **scoped-picker behaviour inside the popover**: type to filter, arrow to move, `Enter` to commit, chip stays. §5 already specifies most of it.

### 7.3 Sequence

| Step | Deliverable | State |
|---|---|---|
| **C-1** | registry + `captains.ts`, consumed by row and bulk | **done** |
| **C-2** | `GlobalSearch` imports the registry; the `Do` section executes immediate + `needs-target` commands | **next — do this** |
| **C-3** | Selection / open-profile pre-seeding, the confirm step, undo-on-toast | after C-2 |
| **C-4** | Context-at-rest: recent destinations, recent commands | **blocked on CQ-6 / Q1 persistence** — but D16 (server-side per-operator state) is the answer, so this may already be unblocked. Verify before deferring again |
| **C-5** | Remaining domains' registries | rolls with the specs |

**Two open questions carried forward unresolved, both still the owner's:** CQ-5 (does undoability buy a command out of its confirm step) and CQ-7 (`unavailable` cannot check permissions until D4's role model closes). Neither blocks C-2 — an immediate, non-destructive command needs neither.

### 7.4 Motion, per Phase 4

The palette gets `--ev-dur-fast` 140ms scale-from-trigger. Result rows get **no** stagger — a staggered list in a tool used a hundred times a day is a hundred small waits.

---

## Phase 3 — The detail surface *(≈2 days)*

**3.1 Peek view (P2).** Promote the 480px drawer to three modes: `peek` (overlay, current width) · `side` (docked, list stays live) · `full` (route). Toggle lives in the drawer's leading corner, exactly as Plane's does. Mode persists per operator (D16).

**3.2 Properties rail as label/value rows.** `--ev-detail-rail-w` exists; restyle its contents to Plane's shape — 24px rows, icon + muted label at fixed width, value as an editable chip. Reuses the Phase 2.3 chip primitive, so this is composition, not new work.

**3.3 Activity below content, filterable.** Already partly present in `AdminActivityScreen`; generalise it into a `<ActivityFeed>` the drawer can mount.

---

## Phase 4 — Motion: write the law, then ship it *(≈2 days)*

This is where "subtle animations" lives, and it needs a decision before it needs code.

**4.1 §1.6 is currently unusable.** R12 demoted all six of its MUSTs to SHOULD and declared them uncitable, because motion cannot be observed in a still screenshot. So the product has *no enforceable motion spec* — which is exactly why every transition in source is a shadcn default. **Phase 4 replaces §1.6 with an observed one**, derived from Plane rather than inferred from stills.

**4.2 The vocabulary — six entries, and nothing else is licensed:**

| Token | Duration | Easing | Applies to |
|---|---|---|---|
| `--ev-dur-instant` | 80ms | `linear` | hover/active background and border tint |
| `--ev-dur-fast` | 140ms | `cubic-bezier(.2,0,.38,.9)` | popover, dropdown, tooltip enter |
| `--ev-dur-base` | 200ms | same | drawer/peek slide, sheet, mode change |
| `--ev-dur-slow` | 260ms | `cubic-bezier(.2,0,0,1)` | route content cross-fade, bulk bar rise |
| `--ev-ease-out` | — | `cubic-bezier(.2,0,.38,.9)` | everything entering |
| `--ev-ease-in` | — | `cubic-bezier(.4,.14,1,1)` | everything leaving, always faster than its enter |

Ceiling stays 300ms, which keeps R18 intact.

**4.3 The five places motion earns its keep** — and they are the only five:

1. **Row hover** — 80ms background tint. Currently instant; 80ms is the difference between "a web page" and "an application".
2. **Peek/drawer** — 200ms transform + opacity, entering from the inline edge (`translate-x`, direction-aware, never `left`).
3. **Popover / chip editor** — 140ms scale `0.96 → 1` + opacity, origin at the trigger. This is the one that makes P1 feel alive.
4. **Bulk bar** — 260ms rise from below on first selection, 140ms fall. It appears *because* you selected something; the motion is the causal link.
5. **Optimistic write** — a 140ms tint flash on the cell that just committed, once, then nothing. This is `kpiFlash`'s legitimate descendant.

**4.4 Everything R18 forbids stays forbidden.** No ambient loops except the licensed live-feed dot (opacity-only, 1200–2500ms, never below 0.4, never encoding severity). No skeleton `animate-pulse` on anything that isn't actually loading. **No page-transition animation on route change beyond the 260ms cross-fade** — an ops console navigated 200×/day must never make the operator wait for chrome.

**4.5 The reduced-motion block at `:1238` already covers all of it** via the universal selector. Verify, don't rewrite. Add a Playwright check that asserts computed `transition-duration ≤ 1ms` under `prefers-reduced-motion` for the five surfaces above — motion is the one thing a token audit cannot grep for.

---

## Phase 5 — Dark theme *(≈3 days, and it is genuinely optional)*

Plane ships it; we declared the variant and built no palette. The token layer is already the only place values live, so this is one `@media`/`.dark` block, not a component sweep — that is the payoff of D7's discipline.

Ground it in the brand: `#03160F` is a *green-tinted* near-black and is the correct darkest stop, with **`#9EDDC4` as the on-dark brand mark** (which is precisely what `logo.svg` is for). Every one of the ~30 `--ev-*` colour tokens needs a dark counterpart and a re-derived contrast ratio — the ledger in D7 §7 has to be re-run end to end, and *that*, not the CSS, is the three days.

**Recommendation: defer until Phases 1–4 land.** A dark theme over the current density and the current motion buys much less than green + 36px rows + inline chips buys.

---

## Sequence, and what to do first

Ordered by **change delivered per day spent**, not by phase number.

| Order | Phase | Effort | Perceived change | Blocked on |
|---|---|---|---|---|
| 1 | **1 — Brand** | 1d | **highest** | owner ruling §0.4 |
| 2 | **4 — Motion** (4.2–4.3) | 2d | high | — |
| 3 | **7 — Command centre** (C-2) | 1d | high | — · **registry already built** |
| 4 | **6 — Forms** (6.1 only) | 1d | medium, but closes a MUST | pick (a) or (b) |
| 5 | **2 — Density + table** (2.1, 2.2, 2.6) | 1d | high | — |
| 6 | **2.3 — Inline chips** | 2d | **highest UX** | 2.1 |
| 7 | **6 — Forms** (rest) | 1d | medium | 6.1 |
| 8 | **3 — Detail / peek** | 2d | medium | 2.3 |
| 9 | **2.4 / 2.5 / 2.7** | 2d | medium | 2.3, D16 |
| 10 | **5 — Dark** | 3d | low until the rest lands | 1 |

**The first week is the whole argument.** Phase 1 + Phase 4.2–4.3 + C-2 is four days, touches the token layer, one shell file and one wiring, restructures no screen — and after it the product is Eyvar-green, moves like an application instead of a web page, and ⌘K can finally *do* something. Then 2.1 (three token values, ~30% more rows per viewport) and 6.1 (one field shape). **2.3 is the largest genuine UX unlock and it is deliberately sixth**, because it wants the density and the popover motion underneath it.

**Three open questions for the owner:**
1. **§0.4** — does brand green replace near-black as `--primary`? All of Phase 1 waits on it, and Phase 1 is the highest-value day in this document.
2. **§1.4** — 6° of hue between "success" and "primary", or keep them colliding and rely on shape?
3. **§6.1** — fix `field.tsx`'s `FieldError` **(a)**, or promote `AuthFieldError` into it and delete the duplicate **(b)**? I recommend (b).

**Two conflicts to record, not resolve by drift:**
- **§0.2** — the brand's Arabic face (IBM Plex Sans Arabic, a Kufi grotesque) contradicts §14's Naskh requirement. §14 outranks brand consistency; keep Noto Naskh Arabic and write the divergence into DECISIONS rather than quietly matching the marketing site.
- **§7.2** — our ⌘K is an anchored popover where Plane's is a centred modal, and §2.6 forbids relocating it. That is a **ruling we already made**, not a gap. Record it so the next reference audit does not file it as a defect.

**One item that is already correct and should not be "fixed":** row hover revealing trailing actions (`DataTable.tsx:1205`) matches Plane exactly, including the at-rest *absence* rather than a dimmed state.
