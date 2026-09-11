# 03 — Pages: dashboards that work like a document

> Decisions needed: **D39** (a dashboard is a page of blocks), **D46** (routes). Phase **P4**.
> Reference: Amplitude's dashboard and notebook layout (rows of up to four items, widths in
> twelfths, four fixed heights, chart / rich text / cohort items), Notion's block model
> (heading, text, callout, toggle, columns, divider), and the owner's standing ruling that
> editing is inline, not in dialogs.

## 1. What changes and what does not

| Keeps | Changes |
|---|---|
| A saved report is a definition; a page shows the current definition (spec 06 §11.3). A block references a `reportId`, never a query copy | A dashboard is one kind of page. A page has blocks, not tiles |
| Board scope: one range and one filter list applied per report block, refusing rather than distorting (`applyBoardScope`) | The scope bar sits at the top of the page and applies to every `report` and `metric` block |
| Integer order, `Move up` / `Move down`, keyboard first | Order is per block within its container; columns are containers |
| The `missing` tile state (deleted report), the `invalid`, `blocked`, `error`, loading states per tile | The same five states per `report` block, unchanged copy |
| One optimistic write path (`writeTiles` → `writeBlocks`) with per-action toast keys | Autosave with a visible `Saved` indicator and a version for conflict detection |
| No drag-and-drop required to do anything | Drag arrives in WP-4.6 as an optional addition with the keyboard path unchanged |
| The 1280 floor and `wide:` breakpoint | Columns use a twelve-column grid inside the content width; below `wide:` a row of columns stacks |

## 2. The model (`src/data/types/page.ts`)

```
Page {
  id, kind: 'dashboard' | 'case-study' | 'note'
  title: string (1–120), icon: IconName | null           // from src/components/icons.ts registry, never an emoji
  description: string | null
  ownerId, visibility: 'private' | 'team', tags: string[], official: boolean
  scope: { range: ReportWindow | null; filters: FilterSpec[] }
  blocks: Block[]
  version: number                                       // server-incremented; 409 on mismatch
  publishedAt: IsoDateTime | null                       // null = draft (agent output, template copy)
  createdAt, updatedAt, updatedBy
}

Block = { id: string; type: ... }   // discriminated on `type`
  heading      { level: 1 | 2 | 3; text: string }
  text         { md: string }                                     // markdown subset, §4
  callout      { tone: 'info' | 'success' | 'warning' | 'neutral'; md: string }
  divider      { }
  toggle       { title: string; open: boolean; blocks: Block[] }  // one level of nesting; a toggle may not hold columns or toggles
  columns      { columns: { width: 3 … 12; blocks: Block[] }[] }  // 2 … 4 columns; widths sum to ≤ 12; may not hold columns
  report       { reportId; view: 'chart' | 'table' | 'headline'; height: 'S' | 'M' | 'L' | 'XL'; title: string | null }
  metric       { reportId; seriesId: string | null; format: 'value' | 'value-delta' | 'sparkline' }
  table        { columns: { key: string; label: string; align: 'start' | 'end' }[]; rows: string[][] }   // a hand table, editable
  alert-status { ruleIds: string[] }                              // state badge and last value per rule
  agent-insight{ jobId; findingId; md: string; runIds: string[] } // read-only; provenance link
  bookmark     { target: { kind: 'page' | 'report'; id: string } }
```

Rules the type and the validator enforce (`src/data/reporting/pages/validate.ts`, pure):

- A page has at most **200** blocks counted recursively; a `columns` block at most 4 columns;
  a column's widths sum to 12 or less (unset widths share the remainder equally, as Amplitude
  does).
- `report.height` maps to tokens `--ev-block-h-s/m/l/xl` (375 / 500 / 625 / 750 px, Amplitude's
  four row heights), minted by design-token-steward. No pixel literal in a component.
- `text.md` is at most 8,000 characters; a heading is at most 200.
- `pinnedName` is gone: a `report` block whose report 404s renders the `missing` state with
  the last known title kept in `title` (the block's own field, set at pin time and editable).
- Block ids are ULIDs generated client-side (`src/lib/ids.ts`, new: `ulid()` with a tested
  monotonic clock) so an optimistic insert has a stable id before the save returns.

**Migration** `dashboardToPage(dashboard): Page` in `src/data/reporting/pages/migrate.ts`, pure,
tested against the three fixture dashboards: each tile in `order` becomes a `report` block
(`view: 'chart'`, `height: 'M'`, `title: null`); consecutive `half` tiles pair into a
`columns` block of two 6-width columns; a `full` tile stands alone. The backend runs the same
function once in migration `0003_pages.sql`'s companion script. `Dashboard` and `DashboardTile`
types are deleted in the same phase; `dashboards.*` operations are removed from
`knownOperations()` and `pages.*` registered. `/management/reports/dashboards/:id` redirects to
`/management/reports/pages/:id` (301 on the server; a route-table alias on the client).

## 3. The renderer (`src/components/pages/`)

| Component | Renders |
|---|---|
| `PageView` | header (title, icon, description, owner, updated, `Edit` primary when permitted, overflow), scope bar, `BlockList` |
| `BlockList` | an ordered list of `BlockFrame`s; `role="list"` in view mode, `role="listbox"`-free (a list of regions) in edit mode |
| `BlockFrame` | the frame around one block: in view mode nothing but the block; in edit mode the handle, the block menu, the insertion affordance above and below |
| `HeadingBlock`, `TextBlock`, `CalloutBlock`, `DividerBlock`, `ToggleBlock`, `ColumnsBlock`, `TableBlock`, `BookmarkBlock` | static blocks |
| `ReportBlock` | reuses `DashboardTile`'s resolution path (renamed `useResolvedReport`): scope application, `requestCache` keyed by `reportId + scope`, five states, `ResultCanvas` or `ReportModeCanvas` with `framed={false}` |
| `MetricBlock` | resolves like `ReportBlock` and renders a `MetricTile`-shaped card for one series |
| `AlertStatusBlock` | `alerts.get` per rule, state badge (R7 tones, `firing` = warning), last value, last evaluated |
| `AgentInsightBlock` | markdown with a `Provenance` link to the job page |

Layout: `BlockList` is a single column of the content width. `ColumnsBlock` is
`grid grid-cols-12 gap-3` with `col-span-{n}` chosen from a fixed map of the ten legal widths
(3 … 12) to avoid arbitrary values; below `wide:` every column becomes `col-span-12`. Report
blocks fill their column's width; the height comes from the token.

Every block is one DOM region with an accessible name (`aria-label` from the block's title or
type), so a screen-reader operator can walk a page block by block.

## 4. Text: the markdown subset and the renderer

`src/lib/markdown/`: `parse(md): Node[]` and `<Markdown md />`. Supported: paragraphs,
`**bold**`, `_italic_`, `` `code` ``, links (`http`, `https`, and internal `/…` only; `rel="noopener"`,
external marked with the existing external-link glyph), bullet and numbered lists (one
level), line breaks. Not supported and rendered as text: raw HTML, images, headings inside
text (headings are blocks), tables inside text (tables are blocks). Every text run is wrapped
for bidi with the existing `isolate` helper so Latin measure names inside Arabic prose do not
reorder. The renderer has exhaustive tests including an XSS corpus (`javascript:` links,
`<script>`, `<img onerror>`), and a size cap.

Editing a text block is a `<textarea>` that grows with its content (`field-sizing: content`
where supported; a measured fallback otherwise), with a four-button formatting bar (bold,
italic, link, list) that wraps the selection with the markdown syntax. Preview is what the
block shows when it is not focused. This is deliberately not a WYSIWYG editor (see
[00-README.md](00-README.md) "What this plan does not do").

## 5. The editor

**Modes.** A page is in **view** mode by default. `Edit` (the one primary in the header)
enters edit mode; `Done` leaves it. In edit mode every block gets a frame; view mode has none.
Operators without `manage_analytics` (or ownership) see no `Edit`.

**Adding a block.** Between any two blocks, and at the end, an `Add block` affordance appears
on hover and on focus (a real `<button>`, `focus-visible` ring). It opens an inline picker
(the `cmdk` primitive already restyled for the command palette, rendered inline, not centred)
listing the block types with one-line descriptions and a search box. In a text block, typing
`/` at the start of a line opens the same picker (slash command).

**Adding a report.** `report` and `metric` blocks open the existing report picker (the
`AddContentDialog` list, re-homed as an inline panel inside the block frame): search, already-
placed reports disabled with a reason, `New report` opens the builder with `?pinTo=<pageId>`
so the builder's `Save` offers `Save and pin`.

**Block menu** (kebab on the frame, and `Shift+F10` on a focused frame): `Move up`, `Move
down`, `Move to column…` (when inside or next to a columns block), `Duplicate`, `Turn into…`
(text ↔ heading ↔ callout; report ↔ metric), `Height` (report), `View` (report), `Delete`.
Keyboard on a focused frame: `Alt+↑` / `Alt+↓` move, `Ctrl+D` duplicate, `Delete` deletes
(with a one-step undo toast, R10: a toast, not a dialog).

**Columns.** `Turn into columns` on a block wraps it in a two-column block with the block on
the start side and an `Add block` slot on the end side. A column's `Width` is a segmented
control of `¼ · ⅓ · ½ · ⅔ · ¾ · full` mapped to 3 / 4 / 6 / 8 / 9 / 12; the validator rejects a
sum over 12 and the control disables the widths that would overflow.

**Saving.** Every edit updates local state and schedules a save 800 ms later (`useDebouncedValue`),
coalesced; the header shows `Saving…` then `Saved · 12:03`. The save is
`PATCH /api/v1/pages/:id` with `{ blocks, version }`; a `409` (someone else saved) shows the
standing notice from spec 06 §8.3 state 11 with `Reload` and never discards local edits (they
are kept in `persistence` under the page id until resolved). Undo is a 20-step in-memory stack
through `src/commands/undo.ts`.

**Scope bar.** Range chip and filter chips as today (`BoardRangeControl`, `BoardFilterControl`),
applied per `report`/`metric` block by `applyBoardScope`; blocks that refuse the range show the
`Own range` badge. In view mode the scope is editable too (it is a question, not a layout) but
not saved unless in edit mode; a `Reset to saved` link appears when it differs.

**Drag-and-drop (WP-4.6, optional).** Pointer drag of the handle moves a block within a list
or into a column; the drop target is the insertion affordance; the keyboard path above is
unchanged and remains what tests use. If the phase runs late, WP-4.6 is dropped without any
other change.

## 6. Templates and creation

`New page` in the pages index opens an inline card: `Blank` · `From template` · `Ask the
analyst` (opens the composer with kind `Draft a page`). Templates are JSON pages in
`src/data/fixtures/pageTemplates.ts` (three shipped: `Monday morning` ops, `Finance weekly`,
`Growth review`), each referencing seeded saved reports by id; a template copy is a draft
until the operator publishes. The backend stores templates as pages with `kind: 'dashboard'`
and `template: true`.

## 7. Pages index (`?view=dashboards` renamed `?view=pages`, with `dashboards` accepted as an alias)

Index table: title with icon, kind badge (neutral tone), owner, updated, block count, starred
toggle, tags. Views: `mine · team · starred · drafts · templates`. Row actions: open, duplicate,
delete (confirm, names nothing else that will be deleted because nothing else is).

## 8. States

| Surface | Content | Empty | Loading | Error |
|---|---|---|---|---|
| Pages index | table | first-run illustration + `New page` / filtered-to-zero sentence | table skeleton | table error |
| A page | blocks | a page with no blocks: one grey sentence and `Add block` (second kind of empty; the page exists) | header then block skeletons shaped by type (`P5` for reports, a text-shaped bar for text) | page-level error only for `pages.get`; a block's failure is its own |
| A report block | chart | spec 06's sentence, frame kept | `P5` in the frame | own retry |
| Draft | a `Draft` badge and `Publish` in the header (only the owner) | | | |
| Conflict | standing notice, `Reload`, local edits kept | | | |

## 9. Print

`@media print` styles for `PageView`: scope bar and edit chrome hidden, blocks in one column,
report blocks at their height with the `asOf` line under each, page title as the document
title. The browser's print-to-PDF is the PDF export; nothing is generated server-side.

## 10. Copy

Namespace `pg.*`: block type names and descriptions (`pg.block.<type>.name/.desc`), the
editor's actions (`pg.edit.*`), states (`pg.state.*`), the index (`pg.index.*`), templates
(`pg.template.<id>.name/.desc`), toasts (`pg.toast.*`). Arabic in `src/i18n/ar/pages.ts`, a new
module spread in `ar/index.ts` after `reports`.

## 11. What the backend receives

`pages.list/get/save/delete/publish/duplicate`, blocks stored as JSONB validated server-side by
the same `validatePage()` (imported from `src/data/reporting/pages/validate.ts`), `version`
optimistic locking, a `page_reports` join maintained on save so `SavedReport.pinnedToPageIds`
(renamed from `pinnedToDashboardIds`) stays a server-derived reverse index and the delete
refusal (spec 06 §11.3) keeps working. See [05-backend.md](05-backend.md) §7.
