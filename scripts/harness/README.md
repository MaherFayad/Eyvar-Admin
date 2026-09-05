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
| `table-density.mjs` | row pitch, rows per 800px viewport, column widths and clipped identity cells, at 1280 and 1152. Takes a label: `node scripts/harness/table-density.mjs before` |
| `dispatch.mjs` | Live Dispatch at 1280 × 800: the feed and rail boxes, marks off-frame and marks under a panel before and after *Fit to fleet*, enum slugs in the feed, and the meta line 30 s apart. Takes a language: `node scripts/harness/dispatch.mjs ar` |

Copy one of these for a new surface rather than writing from scratch. Keep the count here
small; a harness nobody runs is scratch, and scratch is not committed.
