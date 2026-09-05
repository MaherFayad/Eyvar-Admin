# Browser harnesses

jsdom renders no SVG and does no table layout, so a green Vitest run proves nothing about
a chart, a table's column sizing, or a click on a plot. These scripts render the real thing
in Chromium and print what actually drew. Run one before claiming any of those works.

```
npx vite --port 4327          # in one terminal
node scripts/harness/amp-builder.mjs
```

Screenshots land in `scripts/harness/shots/` (git-ignored).

| Script | Proves |
|---|---|
| `amp-builder.mjs` | the report builder renders; probes strokes and numerals |
| `amp-interact.mjs` | a control issues no run: counts `result.asOf` changes and skeleton frames, not network requests, because `DATA_SOURCE` is `mock` in dev and a run makes no HTTP call |
| `amp-builder-ar-dark.mjs` | Arabic (via the account menu's Arabic radio) and dark (`colorScheme`) |
| `amp-dash.mjs` | dashboard tiles, which reuse the same `ResultCanvas` at a third of the width |
| `fin-revenue.mjs` | the Revenue by plan master-detail: four sparklines, the composed day plot, the composition bar, the 280px list column, the table's footer total and the H6 column preset, at 1280 and 1440 and in Arabic |
| `fin-overview.mjs` | Financials Overview as a board: two day-charts, seventeen numerals, the band's ground, the period control inside it, no card around a figure, `overflowX === 0`. 1280/1440, light/dark/Arabic. Reads `HARNESS_BASE` |
| `admin-access.mjs` | the Admin workspace per role and per pane: switches roles through the account menu and navigates in-app (a `goto` resets the mock session), prints the rail, the Admin rows and the forbidden state on `/admin/team` per role, and per pane the strip, page height, tallest row and small-grey count at 1280, English and Arabic |
| `admin-roster.mjs` | Team & Access roster on `DataTable` (T7.1) and the Limits pane's per-role cap fields (T2.6): column headers, identity cells clipped, overflow, tallest row, kebab per row, role-default lines, English and Arabic at 1280 |
| `table-density.mjs` | row pitch, rows per 800px viewport, column widths and clipped identity cells, at 1280 and 1152. Takes a label: `node scripts/harness/table-density.mjs before` |
| `onboarding.mjs` | the getting-started layer: auto-open after a user switch, the checklist for each of the four roles at 1280, every illustration rendered and inside 96×64 (160×112 for the completed state), the account-menu path, Arabic with the art at inline-end. Reads `HARNESS_BASE` |

Copy one of these for a new surface rather than writing from scratch. Keep the count here
small; a harness nobody runs is scratch, and scratch is not committed.
