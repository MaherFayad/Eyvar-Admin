# shadcn components → Eyvar patterns

We use shadcn/ui: components are **copied into `src/components/ui/`**, not imported from a
package. You own the code, so you restyle it to `DESIGN.md` rather than fighting a library.

Add with the CLI, never by hand:

```bash
pnpm dlx shadcn@latest add button badge dialog
```

`components.json` must have `"rtl": true` — the CLI then converts physical classes to
logical ones as it copies (`ml-4`→`ms-4`, `left-*`→`start-*`, `text-left`→`text-start`).
This is how §9.1 is enforced mechanically. Verify it stayed on before adding anything.

## Map

| Eyvar need | shadcn component | Restyle to |
|---|---|---|
| Primary / secondary action | `button` | R3 — primary is `bg-primary` (brand blue), one per screen |
| Status pill | `badge` | R7 five tones, R15 rounded rectangle **not** a stadium pill, no red variant (R5a) |
| Index table, queue, ledger | `table` + `@tanstack/react-table` | §3.1; ledger disables row actions and selection (§8.3) |
| Confirm / short form | `dialog` | §5.3 — question title, consequence body, verb primary |
| Drawer / working panel | `sheet` | §5.5 — **no scrim**; the page behind stays readable |
| Row actions, More actions | `dropdown-menu` | §5.4 |
| Sort, date range, colour | `popover` | §5.4 — stays open while adjusting |
| Icon-only control name | `tooltip` | §5.7 — naming only. Never constraints |
| Toast | `sonner` | R9 one line, names object, ≤60 chars, **no action link**, no emoji |
| Banner | *none — build it* | R1/R16 pale tinted card, four tones. shadcn `alert` is close; restyle |
| Form + validation | `form` + `input` + `label` | §4.4 — inline error, page-level critical banner, disabled-until-valid |
| Select, combobox | `select`, `command` | §4.3 |
| Tabs / saved views | `tabs` | §3.2 — tabs live inside the table card, never the page header |
| Checkbox, radio, switch | `checkbox` `radio-group` `switch` | §4.3 — switch only for instant-effect settings |
| Empty state | *none — build it* | R8 — two kinds, see `states.md` |
| Skeleton / loading | `skeleton` | Shaped like the content, never a centred spinner |
| Pagination | `pagination` | §3.1 |

## Restyle on arrival — every time

A freshly added component is **not** Eyvar-compliant. Before using it:

1. Strip Tailwind palette classes (`bg-slate-100`, `text-gray-500`) → semantic slots.
2. Strip arbitrary values.
3. Apply the `DESIGN.md` rule for that component — geometry (R15), tone set (R7), copy
   (§5.7).
4. Check the focus ring survives (§7.2) and row actions aren't hover-only (§7.3).
5. Run `/token-audit` on the file.

Record the restyle in the component file header: which rules you applied.

## Do not import

- **A second component library.** Radix directly, MUI, Ant, Astryx — one system.
- **Anything that ships its own design language** — chart libraries with built-in themes,
  date pickers with fixed styling. If it can't be themed to tokens, it doesn't come in.
- **`shadcn` blocks/templates wholesale.** They encode someone else's page shapes; ours are
  in `patterns.md`.

## What shadcn does not give you

§8 has no equivalent anywhere: the monitoring shell, the append-only ledger, the work
queue with SLA and the R5a row marker, derived-value fields. Those are built from
primitives. That's four patterns — expected, not a failure of the choice.

## Table controls live in the component, never in the screen

`DataTable` owns sort, filter and column pinning for every column. A screen declares
columns; it does **not** build a sort popover or a filter row. Spec:
`docs/05-restructure/design/01-table-controls.md` (AC-80–AC-116), pattern: `DESIGN.md` §8.5,
deviation: §6.2 **D-6**.

- **The whole header cell is one button** opening a `dropdown-menu`. Never two hit targets
  in one cell — §7.7 forbids it, and D-2's density licence may not be cited against §7.7.
- **The `⌄` renders at rest** on every controllable header. Hover *or* focus takes ink and
  fill. Same two-step as the row kebab (AC-68); hover-only is legacy defect D19.
- **A column filter IS a `FilterSpec`.** So `table.isFiltered` is already true, and
  AC-37/38's `no-match` vs `first-run` choice keeps working untouched. `filterRow` is gone.
- **Pinned columns take elevation tier `none`.** Not a weight judgement — an axis one:
  all three `--ev-shadow-*` are `offset-x: 0` so nothing mirrors, and an inline-edge shadow
  needs an x-offset. Legacy `:751` is what that looks like when you do it anyway.
- **A ledger header offers `Filter…` and `Pin column` only** — never a sort item, never
  `Hide column` (§8.3.3 fixes the column set). `LedgerTable` has no `setSortField` to call,
  so this is a compile error, not a convention.

### Where the two sticky axes cross

A pinned column and the sticky header row are both `position: sticky` and both take
elevation tier `none`, so nothing in `DESIGN.md` said which wins where they meet. **Ruling:**

1. The **sticky header row** sits above pinned **body** cells. The header is the frame; body
   content scrolls under it, pinned or not.
2. The **corner cell** — a pinned column's own header — is sticky on *both* axes and sits
   above everything, because it belongs to both and must never be overlapped by either.
3. Separation at both boundaries is a **hairline**, never a shadow. All three
   `--ev-shadow-*` are `offset-x: 0` so nothing mirrors in Arabic; an inline-edge shadow
   needs an x-offset, which is legacy defect **D25** (`:751`) exactly.

Three stacking levels, no more. A fourth means something is being solved with z-index that
should be solved with layout.
