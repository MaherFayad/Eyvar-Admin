# Team Brief

Read this before doing anything. Every agent on this project reads this file first.

## What Eyvar Admin is

A ride-hailing / subscription **operations console**: drivers, riders, trips, wallets,
fraud review, dispatch, pricing plans. Operators keep it open all day on one screen.
Density is a feature, not an oversight.

## Quick reference — start here

`DESIGN.md` is 5,692 lines. Do not read it to check one rule. `docs/ref/` holds small
lookup files; open a `DESIGN.md` section only when you need the reasoning behind a rule.

| File | Answers |
|---|---|
| `docs/ref/rulings.md` | "The sections disagree - which wins?" |
| `docs/ref/tokens.md` | "What value do I use? Does a token exist?" |
| `docs/ref/patterns.md` | "What shape is this screen?" |
| `docs/ref/surfaces.md` | "Toast, banner, modal, drawer, or page?" |
| `docs/ref/states.md` | "Which states must I build?" |
| `docs/ref/copy.md` | "How do I word this?" |
| `docs/ref/a11y.md` | "Does this pass? What ratio is this token?" |
| `docs/ref/rtl.md` | "Does this mirror in Arabic?" |
| `docs/ref/defects.md` | "Known legacy defect, or one I just made?" |
| `docs/ref/screenshots.md` | "Where's a real example of this pattern?" |
| `docs/ref/modules.md` | "Which of the 60 module docs covers this?" |

Index: `docs/ref/README.md`.

## Where the truth lives

| Question | File |
|---|---|
| What may this look like? | `DESIGN.md` (root) — binding. Start with its cheat sheet and Precedence ladder. |
| What does Shopify actually do? | `docs/06-design-reference/shopify-admin-web/` — 159 real screenshots, 16 folders |
| What does this module do? | `docs/01-modules/*.md` — 52 module specs |
| What exists today, mechanically? | `docs/00-index/GROUND-TRUTH-INVENTORY.md` — 41 pages, 621 ids, 1042 functions |
| How does it behave today? | `eyvar_ops_panel_v40_fixed.html` — the legacy single-file app, 21,857 lines |
| What modals exist? | `MODALS.json`, `modal_table.md` |
| How was DESIGN.md built, and what was wrong with it? | `docs/06-design-reference/_audits/` |

`DESIGN.md` is generated. Edit `docs/06-design-reference/_partials/*.md` and run
`python docs/06-design-reference/build-design.py`. Never hand-edit `DESIGN.md`.

## Stack

- **React + TypeScript + Vite**
- **Tailwind v4 + shadcn/ui.** Components are *copied into* `src/components/ui/`, not
  imported from a package — you own the code and restyle it to `DESIGN.md`.
- **Tokens are still CSS variables.** Tailwind v4 is CSS-first: `--ev-*` tokens live in
  `src/styles/globals.css`, map into shadcn's semantic slots, and are exposed to utilities
  via `@theme inline`. `DESIGN.md` §6.1 is unchanged; only enforcement moved.
- **`components.json` must have `"rtl": true`** — the CLI converts physical classes to
  logical ones on add. That is how §9.1 is enforced mechanically.
- **Vitest + Testing Library** for behaviour, **Playwright** for visual regression.

## The rules that bite

These come from `DESIGN.md`. They are the ones most often broken:

1. **Tokens only — and Tailwind's palette is not your palette.** `bg-blue-500` and
   `text-gray-400` look legitimate and are the fastest way to lose the design system. Only
   semantic slots: `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`.
   No arbitrary values (`p-[13px]`).
2. **A shadcn component arrives non-compliant.** Restyle it on the way in — see
   `docs/ref/components.md`. Using one as-shipped imports someone else's design system.
3. **Four states per screen**: content, empty, loading, error. A PR with only the happy
   path is not done.
4. **One event, one surface** (R10): transient confirmation → toast; standing condition →
   banner. Never both, never two banners.
5. **Red has exactly four permitted uses** (R5a). There is no red badge.
6. **Logical utilities only** (§9.1). `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`. The CLI
   handles components it adds; hand-written code still drifts.
7. **Visible focus on everything interactive** (§7.2). `outline-none` without a
   `focus-visible:ring` is a defect, not a style choice.

## How work flows

```
product-owner      → writes the spec + acceptance criteria from the module doc
product-designer   → picks the DESIGN.md pattern, specifies states and copy
mock-data-engineer → provides typed fixtures behind a swappable seam
utilities-engineer → provides shared hooks/helpers the screen needs
frontend-engineer  → builds it
qa-engineer        → tests behaviour against the acceptance criteria
visual-qa-engineer → tests appearance against DESIGN.md and the screenshots
```

Each role hands off a written artifact, not a conversation. If the artifact you need
doesn't exist, say so and stop — do not invent it and do not do the other role's job.

## Definition of done

A screen is done when: acceptance criteria pass, all four states exist, the visual-QA
report is clean, no off-token values, keyboard-reachable, and it renders correctly in
Arabic. Anything less ships as explicitly incomplete, with what's missing named.
