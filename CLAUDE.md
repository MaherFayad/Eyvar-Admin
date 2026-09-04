# Eyvar Admin

Operations console for a ride-subscription business: drivers, riders, trips, wallets,
dispatch, fraud review, support, pricing. Operators keep it open all day on one 1280px
screen. Density is a feature.

This file is loaded into every session and every subagent. Nothing else is "read first".

## Stack and commands

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui copied into `src/components/ui/`,
Vitest with Testing Library, Playwright for anything drawn.

| Do | Run |
|---|---|
| Dev server for harnesses | `npx vite --port 4327` |
| Tests for the files you changed | `npm run test:changed` |
| One test file | `npx vitest run <path>` |
| Full suite (CI runs it; about 95 s locally) | `npm test` |
| Typecheck | `npm run typecheck` |
| After adding or renaming a string key | `npm run i18n:keys` |
| After changing a client under `src/data/clients/` | `npm run api:contract` |
| Visual proof for a chart, a table's column sizing, a click on a plot | `node scripts/harness/<name>.mjs` against the dev server |

Before saying a change works: typecheck, `test:changed`, and for anything drawn a harness
run. jsdom renders no SVG and does no table layout, so a green suite proves nothing about
those.

## Where truth lives

| Question | Read |
|---|---|
| Which rule wins | `docs/RULINGS.md`, the only precedence index |
| A design rule's full text | `docs/06-design-reference/_partials/<section>.md`. `DESIGN.md` is the same content concatenated into one 540 KB file: never read it whole, never hand-edit it |
| A quick answer on tokens, states, surfaces, copy, RTL, a11y, the table | `docs/ref/<topic>.md` |
| What a screen must do | `docs/05-restructure/specs/` |
| How a screen must look | `docs/05-restructure/design/` |
| What the backend must return | `docs/07-api/` (generated) |
| Every string key | `docs/08-i18n/KEYS.md` (generated) |
| How the legacy app behaved | `eyvar_ops_panel_v40_fixed.html`: grep the page id, read the render function, cite the line |
| Visual reference | Navattic frames in `docs/06-design-reference/navattic-web/` govern colour, spacing, radii and type (D7). Shopify captures in `shopify-admin-web/` govern structure only |

Precedence in one line: owner overrides and decisions in `docs/RULINGS.md`, then the
`DESIGN.md` Rulings table, then §6.2 sanctioned deviations, then §7–§9, then §1–§5. In the
report builder and metric boards, Amplitude fidelity outranks `DESIGN.md` where they conflict.

## Current phase

The 41-page rebuild is complete. Work now is remediation and UX polish on feature branches.
The Phase 0 freeze on `components.json` and `src/components/ui/` is over: add a shadcn
primitive when a screen needs it, restyle it on arrival, and say so in the handoff.

## The rules that bite

1. Tokens only. `bg-blue-500` and `text-gray-400` are not tokens; use `bg-background`,
   `text-muted-foreground`, `border-border`, `bg-primary`. No arbitrary values. A missing
   token is added to `src/styles/globals.css` in the same commit.
2. Restyle every shadcn component on arrival.
3. Four states per screen: content, empty, loading, error.
4. Logical utilities only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`.
   The product ships Arabic.
5. Visible focus. `outline-none` always pairs with `focus-visible:ring-*`. Clickable things
   are `<button>` or `<a>`.
6. One primary button per screen. Red only where R5a permits; there is no red badge.
7. Every operator-facing string is a key in the owning `copy.ts` with an Arabic entry under
   `src/i18n/ar/`. No `defaultValue` literals.

A hook (`scripts/edit-gate.mjs`) checks the text of every edit under `src/` against these
and reports what it finds. Fix the report before moving on.

## How work flows

**Small change** (a bug, a label, one component): one agent does it end to end. No spec,
no handoff chain, no verdict document.

**New screen or new pattern**: product-owner spec, then product-designer spec, then
frontend-engineer, then qa-engineer and visual-qa-engineer in parallel. Each writes its
artifact to the documented path and messages the next role. Nobody sends status messages
to `main`; the final report does that.

**Claims need evidence.** Cite a file and line you read, or a command and its output. A
grep is a lead, not a finding. Never quote a count from a document; count it.

**One writer per tree.** Do not run two sessions or two agents that edit the same working
tree. For parallel work use worktrees. If the build changed underneath you while you were
reading, say so instead of reporting the stale state.

## Comments

A comment says what the code does and why, in at most five lines, and cites a ruling ID
(`R7`, `D7`, `AC-605`) instead of restating it. No measurements, no dates, no history, no
account of how a decision was reached; that belongs in `docs/RULINGS.md` or a decision doc.
Do not extend an existing long comment block. Shorten one when you touch it.

## Tests

Tests assert behaviour an operator perceives, by role, label and text. Never assert on a
sentence in a comment, a count in a document, or a render count. One test per acceptance
criterion, named after it. Run `test:changed` before reporting; run the full suite only
when a shared layer (`DataTable`, `src/lib`, `src/hooks`, `src/data/clients`) changed.

## Generated files

`DESIGN.md`, `docs/07-api/`, `docs/08-i18n/` and `scripts/i18n-budget.json` are generated.
Edit the source, run the generator, commit both. The generators refuse to raise the
`defaultValue` ceiling.
