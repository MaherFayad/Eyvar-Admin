# Browser harnesses

jsdom renders no SVG and does no table layout, so a green Vitest run proves nothing about
a chart, a table's column sizing, or a click on a plot. These scripts render the real thing
in Chromium and print what actually drew. Run one before claiming any of those works.

```
npx vite --port 4327          # in one terminal
node scripts/harness/amp-builder.mjs
```

Several agents share one `node_modules/.vite`, and two dev servers at once have rendered a
blank page. For a capture run, prefer a build:

```
npx vite build && npx vite preview --port 4362
HARNESS_BASE=http://localhost:4362 node scripts/harness/ops-routes.mjs w2
```

Screenshots land in `scripts/harness/shots/` and JSON in `.tmp/`; both are git-ignored.

## Across every route

Run these two first. They sweep all 26 Management and Operations destinations and say
which screen to open a per-screen harness on.

| Script | Proves |
|---|---|
| `ops-routes.routes.mjs` | not a harness: the route list the two below share, so they cannot drift into measuring different sets |
| `ops-routes.mjs` | **T8.2.** Every Management and Operations route at 1280 × 800 and 1440 × 900, both languages: `h1`, banner and `role=alert` counts, horizontal overflow of the document and of `<main>`, how far the window actually scrolls, clipped table cells, and whether the zones inspector, the dispatch feed and rail and each `DetailPage` rail sit inside the first viewport. Exits non-zero on overflow or a panel below the fold at 1280. Takes a label; reads `HARNESS_BASE` |
| `chrome.mjs` | **T9.16.** The same 26 routes at 1280 × 800, both languages: em dashes in `innerText` (X14), visible 12px muted nodes inside cards, cells and headers counted apart (X15), buttons whose whole content is a text glyph and the `Back` controls per page (X16), lucide icons against those glyphs (X17), and the median and tallest table row (X19). Takes a label; reads `HARNESS_BASE` |

**What they supersede.** Nothing is deleted — a per-screen harness prints detail these two
cannot — but where they overlap, the sweep is the number to quote:

- `reports-chrome.mjs`'s em dashes and row heights on three views: `chrome.mjs` prints the
  same measures on all 26.
- `people.mjs`'s and `zones.mjs`'s per-route em-dash counts: same.
- `dispatch.mjs`'s `glyphButtons`: `chrome.mjs` counts them everywhere.
- `dispatch.mjs`'s and `zones.mjs`'s "is the panel inside the first viewport": `ops-routes.mjs`
  asserts it on both maps and every detail page and fails the run. The per-screen scripts
  still own *what is in* the panel — marks off-frame, visible zone rows, the two actions.
- `table-density.mjs`'s and `ops-identity-widths.mjs`'s clipped-cell counts: `ops-routes.mjs`
  gives the per-route total; those two give the per-column widths a fix needs.

## Management

| Script | Proves |
|---|---|
| `boards.mjs` | the four management boards at 1280 x 800: chapter grid tracks (T5.6), 12px muted nodes inside cards against the hints that replaced them (T9.9), the period pill's scope (T5.7) and the band's focused `Refresh` (T1.5). Takes a label and a port: `node scripts/harness/boards.mjs before 4341`, and `ar` switches the language |
| `zones.mjs` | Market & Zones at 1280 × 800 in both languages, both surfaces: whether the inspector floats and its two actions are in the viewport, visible zone rows, strip columns, legend size and ground, table column widths and em dashes. Takes a label; `HARNESS_BASE` overrides the port |
| `reports-chrome.mjs` | T9.13/T9.14/T9.15: per row height, wrapped and clipped cells, em dashes and overflow on the three Reports list views, both languages, at 1280. Port 4343 |
| `amp-builder.mjs` | the report builder renders; probes strokes and numerals |
| `amp-interact.mjs` | a control issues no run: counts `result.asOf` changes and skeleton frames, not network requests, because `DATA_SOURCE` is `mock` in dev and a run makes no HTTP call |
| `amp-builder-ar-dark.mjs` | Arabic (via the account menu's Arabic radio) and dark (`colorScheme`) |
| `amp-dash.mjs` | dashboard tiles, which reuse the same `ResultCanvas` at a third of the width |
| `fin-revenue.mjs` | the Revenue by plan master-detail: four sparklines, the composed day plot, the composition bar, the 280px list column, the table's footer total and the H6 column preset, at 1280 and 1440 and in Arabic |
| `fin-overview.mjs` | Financials Overview as a board: two day-charts, seventeen numerals, the band's ground, the period control inside it, no card around a figure, `overflowX === 0`. 1280/1440, light/dark/Arabic. Reads `HARNESS_BASE` |
| `admin-access.mjs` | the Admin workspace per role and per pane: switches roles through the account menu and navigates in-app (a `goto` resets the mock session), prints the rail, the Admin rows and the forbidden state on `/admin/team` per role, and per pane the strip, page height, tallest row and small-grey count at 1280, English and Arabic |
| `admin-roster.mjs` | Team & Access roster on `DataTable` (T7.1) and the Limits pane's per-role cap fields (T2.6): column headers, identity cells clipped, overflow, tallest row, kebab per row, role-default lines, English and Arabic at 1280 |

## Operations

| Script | Proves |
|---|---|
| `dispatch.mjs` | Live Dispatch at 1280 × 800: the feed and rail boxes, marks off-frame and marks under a panel before and after *Fit to fleet*, enum slugs in the feed, and the meta line 30 s apart. Takes a language: `node scripts/harness/dispatch.mjs ar` |
| `mywork-ar.mjs` | T4.1: the `Item` column of My Work in Arabic. `assembled` (English template or bare enum slug from `clients/myWork.ts`) must be 0; what stays Latin is printed apart as `verbatim`, because a name or a place is the record's own words |
| `queue-identity.mjs` | My Work and Trip Assurance at 1280 in both languages: every column's width against the widest thing in it, clipped cells per column (T5.1) and tone fills per row (T5.12, H7's budget of two) |
| `ops-identity-widths.mjs` | T5.1 on Requests, Subscriptions and Trips: clipped nodes in the identity columns, the width each column would need for nothing to clip, `overflowX` and row heights, so a budget that "fits" by pushing the page sideways or growing the row is caught |
| `corporate.mjs` | Corporate at 1280 in both languages: row pitch, lines per row, per-column clipping and header wrap, card heights and 12px paragraphs inside cards. Takes a label: `node scripts/harness/corporate.mjs before` |
| `people.mjs` | Operations › People at 1280 in both languages: blank `SLA`/`Owner` cells on the default Applications scope, clipped `Next expiry` cells on Compliance, and em dashes per route. Takes a label. Set `HARNESS_BASE` to point at a preview server |
| `table-density.mjs` | row pitch, rows per 800px viewport, column widths and clipped identity cells, at 1280 and 1152. Takes a label: `node scripts/harness/table-density.mjs before` |

## Support, and the dark theme

| Script | Proves |
|---|---|
| `support-queues.mjs` | the Support surfaces at 1280, both languages: row pitch, the tab strip, horizontal overflow and the R5a marker on Disputes, Safety, Fairness and the contact centre. Reads `HARNESS_BASE` |
| `support-tickets.mjs` | Support › Tickets at 1280, both languages: row pitch, the tab strip, overflow and the detail page. Reads `HARNESS_BASE` |
| `dark-contrast.mjs` | **AC-CC-01 / AC-CC-03.** Switches the account menu to Dark, captures the conversation pane, the incident and the rate card, and measures every text node against the ground it sits on. Fails under 4.5 (3.0 at 18px+), prints the lowest ratio, the failing ink/ground pairs and what is still under 12px. Reads `HARNESS_BASE` (port 4334) |

## Financials, and the shell

| Script | Proves |
|---|---|
| `fin-overview.mjs` | Financials Overview as a board: two day-charts, seventeen numerals, the band's ground, the period control inside it, no card around a figure, `overflowX === 0`. 1280/1440, light/dark/Arabic. Reads `HARNESS_BASE` |
| `fin-revenue.mjs` | the Revenue by plan master-detail: four sparklines, the composed day plot, the composition bar, the 280px list column, the table's footer total and the H6 column preset, at 1280 and 1440 and in Arabic |
| `onboarding.mjs` | the getting-started layer: auto-open after a user switch, the checklist for each of the four roles at 1280, every illustration rendered and inside 96×64 (160×112 for the completed state), the account-menu path, Arabic with the art at inline-end. Reads `HARNESS_BASE` |
| `growth.mjs` | T7.1: Management › Growth at 1280 × 800, all five `?view=` states, both languages. Prints the tab strip, per-column widths, columns off the measure, row pitch, truncated identity and body cells, page and table overflow, and em dashes. Takes a label; `HARNESS_BASE` overrides port 4365 |
| `reports-chrome.mjs` | T9.13/T9.14/T9.15: per row height, wrapped and clipped cells, em dashes and overflow on the three Reports list views, both languages, at 1280. Port 4343 |

Copy one of these for a new surface rather than writing from scratch. Keep the count here
small; a harness nobody runs is scratch, and scratch is not committed.
