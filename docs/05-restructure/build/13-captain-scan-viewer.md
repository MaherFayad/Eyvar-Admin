# 13 — the captain scan viewer, the tab counts and the figure rows

**Role:** frontend-engineer.
**Spec:** `docs/05-restructure/design/people-captain-profile.md` — §6.5a, §6.6a, §6.7a, §8.1b,
§8.2a, §9B, D-CP-15, findings Q–T, AC-CP-116 … AC-CP-150, and §4B / D-CP-12 / D-CP-13 /
AC-CP-64 … AC-CP-115.
**Surfaces:** the captain sheet (`DriverPanels` → `DriverDocuments`) and the captain page
(`DriverProfilePage`). One implementation, two mounts.

---

## 1. What was built

### 1.1 The scan viewer — `src/components/profile/driver/DriverDocuments.tsx`

The expanded document row's **file slot** now carries a 240 × 160 inline preview, an
`Open scan ↗` and a `Download`, and six states. Both surfaces render the same component, so
parity is structural rather than test-enforced.

`Open scan` opens a **new browser tab** on both surfaces. **No overlay is mounted by either
control on either surface**, so `DESIGN.md`:3134 — *"MUST NOT nest a modal inside a drawer"* —
is never engaged, not deviated from and not argued past. On the page, where a modal was legal
and would have kept the operator in context, the better-in-context option is declined to hold
§3's parity. That is §6.5a.1's stated price and it is paid deliberately.

**Consequences worth restating because they are why the answer is cheap:** no scrim, no trap,
**focus is never moved**, and §6.6's `Escape` ladder gains no level.

### 1.2 §8.2a — the shipped refusal that refused the wrong object

| | |
|---|---|
| `profile.driver.refusal.viewDocument` (EN) | was *"Viewing a captain's **documents** needs the operations permission."* → now **"Opening a captain's scans needs the operations permission."** |
| the same key (AR) | was `الاطلاع على مستندات الكابتن يتطلب صلاحية العمليات.` → now `فتح النسخ الممسوحة للكابتن يتطلب صلاحية العمليات.` |

The row's expansion is **never** gated (§6.3, AC-CP-40); only the scan is. The old sentence
sent an operator looking for a permission that would change nothing. Cadence preserved: all
three refusals on this surface now open with `Opening` / `فتح`. The key **name** is unchanged
on purpose — renaming it would touch two dictionaries and a component for zero operator
benefit.

**A second, larger correctness fix rides with it.** §6.3 rules that *"the gate attaches to the
bytes, not to the metadata … the scan record renders for every operator who can open the
profile, and `canOpenCompliance` is not consulted in the expansion at all."* The shipped
component **hid the whole record row** from a refused operator, because there was no control to
disable and §11.2 governs *a control the operator may not use*. §6.5a ships two, so §6.3's
branch is reachable exactly as it predicted: the record row now renders and the two controls
are disabled in place under one linked sentence. `driver.test.tsx`'s assertion is inverted, with
the ruling cited at the assertion.

### 1.3 The three derivations, wired into both surfaces

| | |
|---|---|
| `tabCounts` / `TabCount` | on **both** tab rows. The page shipped with none; the sheet's inline copy is deleted along with its local `TabCount`. One derivation (AC-CP-77) |
| `drivingFigures` + `FigureGrid` | the **Activity** tab, both surfaces, replacing the page's interim `performanceFields` `FieldList` |
| `periodFigures` + `FigureGrid` | the **Earnings** tab, both surfaces, leading the tab above the ledger |
| `performanceFields` | **deleted** — this change removed its last consumer (AC-CP-92) |
| `profile.driver.card.performance` | **deleted**, EN and AR (AC-CP-93). A figure row takes no section heading; its blocks carry their own (D-CP-3) |

---

## 2. The six states, and how each is reached

`?mockFail=` produces each of the three failures independently, which is what keeps three of
the six from rotting. `DRV-0101` has a JPEG (Licence), two PDFs (Registration, Insurance) and
two rows with no file.

| | condition | leading visual | record row | controls | sentence | how to reach it |
|---|---|---|---|---|---|---|
| **A** | `file === null` | none | none | none | `No scan is stored for this document.` | expand `Inspection` or `Operating card` on `DRV-0101`; every row on `DRV-0105` |
| **B** | refused — the flag **or** a late `403` | `▤` | renders | both disabled, one linked reason | `Opening a captain's scans needs the operations permission.` | `?mockFail=compliance.documentFile:403`, or `canOpenCompliance={false}` |
| **C** | permitted, read in flight | `Skeleton`, the frame's exact 240 × 160 box, **images only** | renders | both disabled, **no reason** | none | expand an image row with mock latency on; a PDF reaches it by clicking a control |
| **D** | bytes, image | the scan, `object-contain` | renders | both enabled | none | expand `Licence` on `DRV-0101` |
| **D′** | bytes, PDF | `▤`, **never a frame** | renders | both enabled | `A PDF has no preview. Open the scan to read it.` | expand `Registration` on `DRV-0101` |
| **E** | permitted, read failed | the error, **in the frame's place** for an image; unboxed at the sentence's place for a PDF | renders | both disabled | `Couldn't load this scan. Try again.` **+ `Try again`** | `?mockFail=compliance.documentFile:503` |
| **F** | the store holds no object | `▤` | renders | both disabled | `The record lists a scan that is no longer in storage.` **no `Try again`** | `?mockFail=compliance.documentFile:404`, or a resolved `no-file-on-record` on a record that carries a `file` |

**A versus E is exact.** A says *the record never had a scan* — a compliance gap to chase with
the captain. E says *the record has one and we could not fetch it* — a console fault to retry
and then report. They share no string and never will. **F is the third diagnosis**: the record
and the object store have diverged. It carries no `Try again` because retrying cannot help, and
no invented remedy because this console cannot upload.

**The read's contract, held exactly.** `outcome: 'bytes'` and `outcome: 'no-file-on-record'`
**resolve**; a refusal **rejects** with `403` / `kind: 'forbidden'` / `retryable: false`;
anything else rejects as a failure. A fifth shape — `code: 'aborted'`, from the `AbortSignal` —
**draws nothing at all**: an abort is us cancelling, not the store breaking, and it must never
surface as a failed read.

**404 maps to F, deliberately, and it is the one place the spec and the shipped seam had to be
reconciled.** Finding Q's table says *"`404` on a document whose record carries a `file` → F"*,
and this hook only ever runs on such a record, so the clause applies as written. The seam
additionally reports the same divergence as a **resolved** `no-file-on-record`; both land on F,
and the branch says so in a comment naming both sources.

**The fetch policy is neither eager nor on-demand.** Bytes are fetched **when they are needed to
draw something**: on expansion for an image with the permission, on click for a PDF, never on
list load, never for a collapsed row, never for a row whose `file` is `null`. §6.1's
one-row-at-a-time means the list can cost at most one in-flight read, ever.

---

## 3. Two rulings, applied

### 3.1 A failed compliance read draws no loading chip

`TabCounts` was `number | null`, and `null` meant both *in flight* and *failed*. `TabCount` drew
a `Skeleton` for `null`, so a failed compliance read left **an indefinite shimmer beside a tab
that was not loading** — a chip promising a number that is never coming.

Ruled and implemented: **in flight draws the skeleton, failed draws nothing.** The type is now
a three-way union, `number | 'loading' | 'unknown'`, so a renderer cannot fall through
`'unknown'` into the skeleton branch by accident — which is what two `null`s meaning two things
eventually do. The tab is still rendered, still selectable, and the panel still carries its own
`ErrorState` with `Try again` (AC-CP-76, AC-CP-78).

Measured in Chromium at `/entity/DRV-0101?mockFail=compliance.get`: tabs read
`["Documents", "Earnings", "Activity20", "Identity"]`, **0 skeletons in the tab row**, four tabs
operable, `Try again` present in the panel.

### 3.2 `Trips this period` and `Earnings this month` — two windows, one row

**Not resolved, and not overturned silently.** They are a payout period and a calendar month,
and `CaptainPayout` carries no period bounds to state. **The layout cannot separate them without
inventing a heading**, and D-CP-13 fixes the pairing: `periodFigures` is *"what happened in the
window on screen"*, both figures are `grid-cols-2` at every width by ruling, and the only
separators available are a heading (which AC-CP-88 and §4B.8 both refuse for a figure row) or a
caption (which would have to state a window neither fact carries).

So the row ships as AC-CP-88 pairs it, each label naming its own window, and **this is the
report**: an operator reading the row as one window will divide one by the other. The fix is a
data-layer one — period bounds on `CaptainPayout` would let `Trips this period` carry a
`BlockCaption` naming its window, exactly as `Trips completed` carries `Last trip {date}`.
**Owner: mock-data-engineer, for the field; product-designer, for whether the caption is wanted.**

---

## 4. Was any fact lost in the Performance swap?

**No, and it is proved twice.**

The interim on the page was `performanceFields` in a `FieldList` on the Activity tab — the
ruled tab, the wrong form — shipped deliberately so the seven facts stayed on screen until the
builders existed. AC-CP-04's principle: *a card may shed facts; the RECORD may not.*

| the seven rows | home now |
|---|---|
| `rating`, `onTimePercent`, `totalTrips` | `drivingFigures` → the **Activity** figure row, both surfaces |
| `tripsInPeriod`, `monthEarningsHalalas` | `periodFigures` → the **Earnings** figure row, both surfaces |
| `lastTripAt` | the **caption** on `Trips completed` — a timestamp has nothing to aggregate |
| `capacity` | **struck**; it renders `4 of 5 slots taken`, which *is* `CapacityBlock` in the strip, on every tab. Tiling it would state one fact twice on one screen |

**Proof 1 — the unit assertion is pinned to the spec, not to the dead builder.**
`driver.test.tsx`'s AC-CP-04 test used to read its expectation off `performanceFields`, which
after the deletion would have been a test that could only agree with itself. It now holds a
frozen list of the seven labels taken from §4B.6's table and asserts each has a home.

**Proof 2 — the page test asserts them rendered, on their tabs.**
`driverProfile.test.tsx` renders `?view=activity` and asserts `Rating`, `On time`,
`Trips completed`, `Subscription slots` and the `Last trip` caption are in the document, then
`?view=earnings` for `Earnings this month` and `Trips this period`.

**Measured in Chromium**, `/entity/DRV-0101`:
`?view=activity` → `Rating | On time | Trips completed | Last trip`, word `Performance`: **false**.
`?view=earnings` → `Earnings this month | Trips this period`, word `Performance`: **false**.
The figure grid computes `568px 568px`, `column-gap 24px`, `row-gap 24px`, cells `px-0 py-0`
with **no border, no background, no shadow**, and the grid's inline-start edge is the section's
(x = 112, the same as the strip's first cell).

---

## 4B. Owner amendment, mid-build — the figures go side by side and the trips become a list

Two pieces of owner feedback arrived while this was in flight. Both land in the files above.

### 4B.1 `put all metrics side by side` — D-CP-13's two-across arithmetic was stale

`Rating` and `On time` sat on row one and the third figure wrapped, because `FigureGrid` was
`grid-cols-2` at every width. **D-CP-13 computed that against a main column D-CP-12 removed in
the same amendment**: its argument — *three across leaves 157px against the 154px a
`652.60 SAR` figure needs at `--text-kpi-lead`, and 3px is not clearance* — assumed the page's
320px rail, giving 704px at 1440 and 568 in Arabic.

The grid now **fits its columns rather than declaring them**:
`repeat(auto-fit, minmax(var(--figure-col), 1fr))`, `--figure-col` defaulting to **12rem /
192px** — chosen against the 154px the ruling was defending, with 38px of clearance, and the
track only ever grows from there. Measured in Chromium, all in one row unless stated:

```
  viewport 1440   grid box 1264   2 tracks of 620   1 row
  viewport 1344   grid box 1168   2 tracks of 572   1 row
  viewport 1280   grid box 1136   2 tracks of 556   1 row
  the sheet 480   grid box  447   2 tracks of 211   2 rows — the third figure wraps
```

`auto-fit` is what buys the last line: the row collapses on its own inside the drawer, where
three genuinely does not fit, without a breakpoint variant. **The construction is `FactGrid`'s
verbatim** — the shipped answer to this exact problem, on the Identity tab of this same page.
It is the one arbitrary value in `facts.tsx` and it is named in §7 as a precedent-backed
exception rather than left for an audit to find.

### 4B.2 `trips completed is usually a list` — `src/screens/entity/DriverTripsTable.tsx`

A lifetime count of `412` is not something an operator acts on; the trips are. So the page's
Activity tab gains a real `DataTable`: `heading` `Trips`, ten rows a page,
`infiniteScroll={false}` — *"so we can add pagination without it becoming infinite scroll"* —
scoped server-side by `listTrips`' existing `driverId` filter, ordered `startedAt` descending.
No new read was added. Columns are `trips.*`, already declared and already translated;
**no `Captain` column**, because every row is this captain.

**The count moved rather than disappeared.** It is the table's `subheading`, worded
`412 trips completed` so it reads as a fact about the captain and not as the table's row count
— the pagination beneath states that, and the two would otherwise contradict each other the
first time a cancelled trip appeared in the rows.

**Two things I was asked to judge on the rendered page, judged with measurements:**

1. **`Last trip` is KEPT, and the proposal to drop it was wrong on this data.** The reasoning
   offered was that a newest-first table makes the first row *be* the last trip. Measured on
   `DRV-0101`: `Driver.lastTripAt` is **25 Jun 07:00** and the table's first row is
   **`TRP-8001`, `Cancelled`, `0.00 SAR`, started 25 Jun 09:14**. The newest trip *record* is
   not the last trip the captain *drove*, and a cancellation two hours later is exactly the
   case that makes the difference matter. It rides in the subheading beside the count, as two
   complete localised facts with a decorative separator — `DriverEarningsTable`'s own
   construction for `{count} postings · {window}`, and the reason it is that rather than one
   key is §9.6. Rendered: `412 trips completed · Last trip 25 Jun 07:00`, and in Arabic
   `412 رحلة مكتملة · آخر رحلة في 25 يونيو 07:00`. The test pins it off the client, so a
   fixture edit moves the assertion with it.
2. **The timeline gains a heading, and §4B.8 is applied rather than broken.** It carried none
   on the ground that *the tab is its heading* — true while it was the only list on the tab,
   false the moment a second joined it: two headless lists read as one list that changed shape
   halfway down. The rule is *no section repeats the tab's own name*, and `Activity history` is
   not `Activity`. Trips lead, because they are what an operator came for; the timeline is the
   audit trail of everything else. Rendered order, measured: figures → `Trips` → `Activity
   history` → `Elsewhere in the console`.

### 4B.3 Does removing `Trips completed` leave `drivingFigures` too thin — and does the SHEET lose it?

**That is the part the instruction did not reach, and it is the one that would have silently
broken AC-CP-04.** `drivingFigures` is called by **both** surfaces, and the sheet cannot take
the table.

**Measured, not assumed:** `DataTable`'s narrow rendering is keyed to `--ev-bp-compact`
(**768px**) through a media query on the **viewport** (`useCompactShell`), so at a 1280 viewport
the sheet's 447px panel would get a full `<table>` in a horizontal scroll container — the
sideways scroll D-CP-12 closed, back inside a drawer §4.4 refuses to widen. `MiniLedger` exists
for exactly this reason, one section over.

So the split is **semantic, not per-surface** — the same line `drivingFigures` and
`periodFigures` were already split on, and **neither builder takes a surface argument**, so
neither can be handed the wrong one (AC-CP-92 holds):

| builder | what it is | who calls it |
|---|---|---|
| `drivingFigures` | the two **rates**, which have no list behind them | both surfaces |
| `tripFigures` | the one figure that **is** a list, for a surface that cannot render one | the sheet |
| `DriverTripsTable` | the list | the page |

**AC-CP-04 holds on both surfaces and is asserted on both.** `totalTrips` and `lastTripAt` are
on screen either way: the page states them in the table's head, the sheet in its figure row.
Measured — the sheet's Activity tab has **0** `<table>` elements and three figures across two
rows: `Rating`, `On time`, `Trips completed` with its `Last trip` caption.

**The divergence that remains is real and is reported rather than hidden:** the page shows this
captain's trips and the sheet does not. That is the same shape as `MiniLedger` (six postings, no
balance column) against `DriverEarningsTable` (the windowed table), and §3 permits a surface to
choose the box. **If product-designer wants the sheet to show trips, it needs a compact form
specified — it is not a `DataTable`, and this build will not invent one.**

### 4B.4 Acceptance criteria the owner amendment supersedes

**Named, not quietly broken.** Each is a criterion the amendment changes, with what replaces it.
QA should fail this build against the *right* list.

| criterion | as written | now |
|---|---|---|
| **AC-CP-88** | the Activity figure row is `Rating · On time · Trips completed` | `Rating · On time`. `Trips completed` is the trips table's subheading on the page and `tripFigures` on the sheet. The Earnings row is unchanged |
| **AC-CP-89** | both rows are `grid-cols-2` at **every** width | both rows are `auto-fit` from a 12rem minimum. Its stated reason — the 154px figure at 568px of column — was computed against a column D-CP-12 removed; §4B.1 has the new measurements. **No `compact:` and no `wide:` override still holds**, and the fitting is what makes that possible |
| **AC-CP-90** | `Last trip` renders as the **caption** on `Trips completed` | unchanged **on the sheet**. On the page it is the second half of the table's subheading, because there is no `Trips completed` figure to caption. *No timestamp renders at figure rank on either surface* still holds |
| **AC-CP-92** | `performanceFields` is replaced by `drivingFigures` and `periodFigures`, **both called by both surfaces** | three builders now, and the clause that matters is intact: **none takes a surface argument**, so no surface-specific variant exists. `drivingFigures` and `periodFigures` are still called by both; `tripFigures` is called by the surface that cannot render the list |
| **§4B.8's tab drawing** | the Activity tab is *figure row → timeline → Elsewhere*, timeline unheaded | *figure row → `Trips` (table) → `Activity history` (timeline) → `Elsewhere`*. The heading is added **because** a second list arrived; §4B.8's actual rule — no section repeats its tab's name — is satisfied |

**Nothing above changes what the record states.** Every one of the seven facts the dissolved
`Performance` card carried is still on both surfaces, and §4 proves it on the page and the
sheet separately.

---

## 5. Measurements — Chromium, not jsdom

jsdom cannot answer any of these: `window.open` is a not-implemented stub,
`URL.createObjectURL` does not exist at all (a stub was added to `src/test/setup.ts` in the
established style), and jsdom reports `tabindex="-1"` on every Radix trigger including the
selected one. Everything below was measured against the dev server on `http://localhost:5199`
with Playwright, viewport 1440 × 900 for the page and 1280 × 900 for the sheet, and the numbers
are written into `driver.test.tsx`'s `describe('the scan viewer')` header as a comment.

| | measured | criterion |
|---|---|---|
| the frame | **240 × 160** on both surfaces; `object-contain`; a landscape sample renders 238 × 87.6 centred | AC-CP-121 |
| the sheet's panel | 447 wide; **nothing overflows**, nothing clips | AC-CP-121, AC-CP-79's posture |
| tab stops added by an expanded row | **exactly 2** — `Open scan`, `Download`. The frame is `aria-hidden` + `tabIndex={-1}` and is never focused | AC-CP-137 |
| `Open scan` on a **PDF**, bytes not in hand | opens on the **first** click; the tab lands on `blob:…` with `document.contentType === 'application/pdf'` | AC-CP-119 |
| focus across that click | `document.activeElement` is `Open scan: Registration` **before and after**; no scrim, no dialog | AC-CP-117 |
| `window.opener` in the new tab | `null` | §6.5a.1 |
| `Escape` | one press collapses the row, the sheet stays open; a second closes the sheet | AC-CP-118 |
| object URLs across expand / collapse / re-expand / collapse | every one created was revoked; **0 leaked** | AC-CP-130 |
| `Download` on `DRV-0201` | `استمارة السيارة - الوجه الأمامي والخلفي.jpeg` and `رخصة-القيادة-تجديد-٢٠٢٩.pdf` — on-screen name **byte-identical** to the downloaded name, Arabic-Indic digits **unnormalised** | AC-CP-133 |
| `dir="rtl"` | the frame's x moves to the inline-start; `transform` is `none` on **both** the frame and the `<img>`; `Open scan` (source-order first) sits at the higher x | AC-CP-150, §9B 1–3 |
| Arabic control widths | `فتح النسخة الممسوحة ↗` 152 + `تنزيل` 50 + `gap-2` 8 = **210**; English at 448: 110 + 89 + 8 = **207 in 447** | §6.5a.9's estimate was 188 |
| PDF row | **0** frames, **0** skeletons, **0** `iframe`/`embed`/`object` in any state | AC-CP-122, AC-CP-123 |
| E on a PDF | the error is **1118 × 84**, no border, no background, `text-align: start` — not a frame-shaped box | AC-CP-122 |
| E on an image | the error is **240 × 160**, centred, in the frame's place; the record row still renders | AC-CP-143 |
| tab counts | page and sheet both read `Documents5` / `Activity20` from `tabCounts` | AC-CP-77 |

**One environment caveat, isolated rather than guessed.** Headless Chromium has no PDF viewer,
so navigating a tab to a `blob:` of `application/pdf` leaves it on `about:blank`. Reproduced
with a bare `window.open` + blob across three media types: `text/html` and `image/jpeg`
navigate, `application/pdf` does not. **Headed Chromium navigates all three**, which is how
AC-CP-119 was verified. **A Playwright suite that asserts the PDF tab must run headed.**

---

## 6. Three defects found while measuring

### 6.1 The accordion panel clips anything that grows after it opens — **fixed at the call site, reported to the primitive**

`ui/accordion.tsx`'s content wrapper carries `h-(--radix-accordion-content-height)`, and Radix
measures that variable **once**, in a layout effect keyed on `[open, present]`
(`@radix-ui/react-collapsible/dist/index.mjs:104-121`). The panel's height is therefore frozen
at the instant it opens, and the outer element's `overflow-hidden` clips anything that grows
afterwards — which is **every state of the file slot that arrives after the expansion**.

Measured at `/entity/DRV-0101?mockFail=compliance.documentFile:503`, the PDF row: the panel
opened at **172px**, clicking `Open scan` replaced the one-line sentence with the error and its
`Try again`, `scrollHeight` went to **306px**, and **134px including the retry control was
clipped out of existence**.

Overridden at this call site with `h-auto`. Nothing is lost: `animate-accordion-down` /
`-up` have **no keyframes defined anywhere in the product**, so the variable is doing no
animation work. **Owner: `ui/accordion.tsx`. The fix belongs in the primitive.**

### 6.2 The same primitive imposes 16px of prose spacing on every `<p>` in a panel — **worked around, reported**

`[&_p:not(:last-child)]:mb-4` is a **descendant** selector, so it reaches every `<p>` anywhere
inside an expanded panel. Measured: the shipped record row's `JPG · 1.8 MB` line computed
`margin-bottom: 16px` against the 2px the design draws. A local `mb-0` does **not** win —
`.wrapper p:not(:last-child)` is (0,2,1) against a utility's (0,1,0).

Every line inside the file slot is now `<span className="block">`, with a header note telling
the next reader not to "fix" them back. **This is a pre-existing defect of the primitive that
was already visible on the shipped record row.** Owner: `ui/accordion.tsx`.

### 6.3 A `StrictMode` remount adopted an aborted read and hung the slot on its skeleton — **fixed here**

React mounts, unmounts and remounts every effect in dev. The first run started the read, the
cleanup aborted it, and the second run — running synchronously in the same commit, before the
rejection's microtask — was handed the dead promise back. It resolved to `null` and the slot
sat on its skeleton **for as long as the row stayed open**. Measured in Chromium: the licence
frame never resolved.

Two lines fix it, and both are correct beyond `StrictMode`: the effect's cleanup clears
`pendingRef`, and `load()` refuses to reuse a pending promise whose controller is aborted.

---

## 7. Deviations and things declined

- **`profile.driver.documents.downloadRefused` is NOT declared** (AC-CP-148). One boolean gates
  both controls today (§6.5a.5), so it would be a fourth unreachable state. §8.1b holds its
  wording; it lands the day finding C mints a narrower permission.
- **`NavigateControl` was not widened** (finding S). `Open scan` and `Download` are
  permitted-or-refused **buttons that are not routes**; they share only §11.2's refusal shape
  with it. Two call sites is not three, so the shape is written locally rather than promoted to
  `src/lib`.
- **`scanError`'s copy is shipped verbatim from §8.1b** — `Couldn't load this scan. Try again.`
  beside a button labelled `Try again`. The rest of the product's card errors read
  `Couldn't load {section}.` with no trailing imperative (`profile.state.error`). The spec
  states the sentence twice, so it ships as written; **flagged to product-designer** as a
  possible duplication rather than changed.
- **`Try again` is gated by `ApiError.retryable`**, through `ErrorState`'s own `cause` prop
  (P1-8). A refusal never reaches state E, but a `502 unsupported_media_type` is a failure a
  retry cannot fix; the button is dropped for it by the same system decision that drops it at
  the other 78 call sites. Every failure reachable in mock mode is retryable, so AC-CP-143's
  `Try again` renders.
- **`FigureGrid` carries one arbitrary value, and it is `FactGrid`'s.**
  `grid-cols-[repeat(auto-fit,minmax(var(--figure-col),1fr))]` with the value handed in
  through a CSS variable is the shipped construction for this exact problem, rendered by
  `FieldList layout="grid"` on the Identity tab of this same page. Tailwind v4 has no auto-fit
  utility, `globals.css` is not this task's to edit, and an inline `gridTemplateColumns` would
  be static styling in a `style` object — a worse answer on the same audit. **Named here so a
  token audit reads it as a granted exception rather than a finding.**
- **The preview frame is a `<div>` with `onClick`, and it is a deliberate exception to §7.4.**
  §6.5a.7 rules it: `aria-hidden="true"`, `tabIndex={-1}`, pointer cursor, no second accessible
  name, no second tab stop, never focused. The same act has a named, focusable button 8px
  below, which is what §7.4 exists to guarantee. A `<button>` would be focusable by click in
  Chrome and would draw a ring the spec says it must never draw. **Named here so a token audit
  reads it as a granted exception rather than a finding.**

## 8. Spec ↔ code disagreements, with the measurement

1. **§6.2a's DOM order is not fully buildable yet.** AC-CP-125 asserts *provenance, replacement,
   file slot, derivation*. **Provenance and replacement are not implemented on this surface** —
   grep finds no `dateSource` / `recordedByUserName` consumer in `profile/driver/`. The order
   that exists is preserved: file slot, then derivation. The preview adds nothing outside the
   file slot, which is the clause of AC-CP-125 this change is responsible for. **Owner:
   whoever lands §6.2a.**
2. **§9B item 4 asks for `<bdi>` isolation of `{document}` inside both accessible-name keys, and
   an `aria-label` cannot carry markup.** The Unicode equivalent (U+2068 / U+2069) would work
   but makes the accessible name unqueryable by its visible text — `getByRole(..., { name })`
   and every screen-reader user's own quick-find would miss it. **Not applied.** An `aria-label`
   is consumed as a logical string and is never bidi-reordered for AT; the visible label renders
   no `{document}` at all. **Reported to product-designer and the i18n owner** rather than
   decided here.
3. **AC-CP-92 says delete `performanceFields`; the task brief said do not delete it unless this
   change removes its last consumer.** It did — grep after the swap found zero product
   consumers. Deleted, with the seven facts' homes recorded in `facts.tsx` where the builder
   used to be, and the test's expectation re-pinned to the spec's table. **Trivially reversible
   if that call was wrong.**
4. **The Trips index puts the money unit in the CELL, where every ledger puts it in the
   header.** `trips.col.fare` reads `Fare` and `TripsScreen`'s cell renders `<Money>` with its
   unit, so a row shows `0.00 SAR`; §8.3.1 asks for the unit once in the header and never in a
   cell, which is what `ledgerColumns` does. `DriverTripsTable` **reuses the index's
   construction rather than forking it** — changing where the unit sits on a profile would make
   two tables disagree about one column an operator reads in both places. **Owner: the Trips
   index**, where the decision belongs.
5. **`STATUS_TONE` is copied from `TripsScreen`, not imported.** It is a module constant behind
   a screen barrel that also pulls the flag modal and the trip drawer, so importing it would
   pull a mutation path onto a read-only profile. It belongs in
   `screens/operations/trips/domain.ts`, which is where `people/domain.ts` keeps the identical
   kind of map. **Owner: the Trips index.** Two copies of one tone map is exactly the drift this
   build otherwise refuses, and it is flagged rather than accepted quietly.
6. **The Arabic values for §8.1b are mine, not the i18n owner's.** §8.2a says the replacement
   wording is the i18n owner's; a missing Arabic value fails `inventory.test.ts`, so they are
   written rather than omitted, in the vocabulary `documents.noScan` already uses
   (`نسخة ممسوحة` for a scan, never `مستند`). **Flagged to i18n-arabic-engineer for review.**

---

## 9. Status

| | |
|---|---|
| `tsc -b --noEmit` | **clean, project-wide.** The three `src/data/fixtures/reports.ts` errors named in the brief, and six more in `src/screens/reports` and `src/components/reports`, were present at the start of this session and were resolved by the concurrent session during it. **No new error anywhere, in or out of that file** |
| `npm run i18n:keys` | run; `dictionaries.ts`'s count is **5,035**. 7 scan keys + 10 trips/timeline keys added, 1 deleted, the rest the concurrent session's. `inventory.test.ts` 6/6 green, **`ar missing 0`** |
| `/token-audit` on the changed files | **two hits, both granted and both `FactGrid`'s construction verbatim**: `grid-cols-[repeat(auto-fit,minmax(var(--figure-col),1fr))]` and the `style` that sets that variable, in `FigureGrid`. No palette class, no raw colour, no physical-direction utility, no `outline-none` without a ring, no other arbitrary value, no other inline style. The one `<div onClick>` is §6.5a.7's ruled redundant mouse target — see §7 |
| `src/components/profile` | **136 passed** (3 files) — `driver.test.tsx` **59**, of which 11 are new for the scan viewer and 3 rewritten for the figure split |
| `src/screens/entity` | **81 passed** (2 files) — `driverProfile.test.tsx` **56** (3 new for the figure rows, 1 for the tab counts, 7 for the trips table), `riderProfile.test.tsx` **25**, untouched |
| `src/lib/i18n` | **6 passed** — the key-count and Arabic-coverage guards |
| full suite, **serialised** | **3916 / 3917**, 163 files, 683s |
| full suite, parallel | same one failure |

**The one failure is not mine, and it was isolated four ways rather than assumed.**
`src/commands/commands.test.tsx > CM-3 in CaptainsView > suspends an eligible captain`,
`Unable to find role="dialog"` after the 8s `findBy` budget:

1. It passed in isolation twice earlier in this session, and passes with
   `--no-file-parallelism` alone (**29/29**, 6.76s of test time).
2. It passed with `--no-file-parallelism` across a 50-file set (**878/878**) at a point when
   the same set failed under parallelism.
3. **It reproduces with every one of my changed test and screen files excluded from the run** —
   `src/commands/commands.test.tsx` + `src/screens` minus `src/screens/entity/**` → **803/804**.
4. It exercises `CaptainsView`, which imports nothing this change touched.
   `commands.test.tsx`'s only edge into my work is `@/i18n/dictionaries`, and that is ten more
   keys on a plain object.

It has crossed the budget more often as the session went on — 54 node processes are running on
this machine and `DataTable.tsx` was last modified at 14:54, before my first green full run at
17:08. **The signature is the wait-budget problem `src/test/setup.ts` documents in its own
header**, and the fix belongs in that test's budget or in that machine's load, not here.

## 10. Files

```
src/components/profile/driver/DriverDocuments.tsx    the scan viewer, six states, the fetch policy
src/components/profile/driver/facts.tsx              TabCountValue three-way; performanceFields deleted
src/components/profile/driver/DriverPanels.tsx       the sheet: counts + both figure rows
src/components/profile/driver/copy.ts                7 new keys; refusal.viewDocument corrected; card.performance deleted
src/components/profile/driver/index.ts               barrel: -performanceFields, +TabCountValue
src/components/profile/driver/driver.test.tsx        11 new tests; 2 assertions inverted with rulings cited
src/screens/entity/DriverTripsTable.tsx              NEW — the captain's trips, paginated, headed, count in its subtitle
src/screens/entity/DriverCopy.ts                     entity.driver.trips.* and entity.driver.timeline.title
src/i18n/ar/entityDriver.ts                          the Arabic side of both
src/screens/entity/DriverProfilePage.tsx             the page: counts + figure row + the trips table; the timeline headed
src/screens/entity/driverProfile.test.tsx            3 new tests; 2 adjusted for the count chips
src/i18n/ar/driverProfile.ts                         the Arabic side of all 8
src/test/setup.ts                                    URL.createObjectURL / revokeObjectURL stub
src/i18n/dictionaries.ts                             key count, regenerated
```

**Not touched:** `routeState.ts`, `PageShell.tsx`, `ProfileLayer.tsx`, `ui/*`,
`components.json`, `metrics/*`, anything under `src/data/`.
