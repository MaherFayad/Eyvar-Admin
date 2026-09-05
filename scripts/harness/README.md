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
| `people.mjs` | Operations › People at 1280 in both languages: blank `SLA`/`Owner` cells on the default Applications scope, clipped `Next expiry` cells on Compliance, and em dashes per route. Takes a label. Set `HARNESS_BASE` to point at a preview server |
| `table-density.mjs` | row pitch, rows per 800px viewport, column widths and clipped identity cells, at 1280 and 1152. Takes a label: `node scripts/harness/table-density.mjs before` |
| `onboarding.mjs` | the getting-started layer: auto-open after a user switch, the checklist for each of the four roles at 1280, every illustration rendered and inside 96×64 (160×112 for the completed state), the account-menu path, Arabic with the art at inline-end. Reads `HARNESS_BASE` |
| `boards.mjs` | the four management boards at 1280 x 800: chapter grid tracks (T5.6), 12px muted nodes inside cards against the hints that replaced them (T9.9), the period pill's scope (T5.7) and the band's focused `Refresh` (T1.5). Takes a label and a port: `node scripts/harness/boards.mjs before 4341`, and `ar` switches the language |
| `dispatch.mjs` | Live Dispatch at 1280 × 800: the feed and rail boxes, marks off-frame and marks under a panel before and after *Fit to fleet*, enum slugs in the feed, and the meta line 30 s apart. Takes a language: `node scripts/harness/dispatch.mjs ar` |
| `zones.mjs` | Market & Zones at 1280 × 800 in both languages, both surfaces: whether the inspector floats and its two actions are in the viewport, visible zone rows, strip columns, legend size and ground, table column widths and em dashes. Takes a label; `HARNESS_BASE` overrides the port |

Copy one of these for a new surface rather than writing from scratch. Keep the count here
small; a harness nobody runs is scratch, and scratch is not committed.
