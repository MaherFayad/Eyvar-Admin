# Financials › Pricing and plans — the **Rate card** view, redesigned

Owner request, 2026-09-06: redesign the rate-card view to match a supplied reference. The
reference is a dark capture at ~1280. I could not open it, and neither could anyone else in
this tree — the frame sets `docs/06-design-reference/navattic-web/` and `shopify-admin-web/`
were **deleted** in commit `0ff4148` *"docs: remove captured external product references and
audit folder"*. What I designed against instead is the token layer, which **D7** makes the
visual authority, and the six built surfaces that already solve the same problems, cited by
file and line throughout.

Scope: the `Rate card` view of `/financials/pricing` only. The other three views are untouched.

---

## 0. What changes, and what survives

`src/screens/financials/pricing/PricingScreen.tsx` — `RateCardView` at `:509`, `RateCardCard`
at `:600`, `SurgeCard` at `:~745`.

**Survives, unchanged.**

- Every acceptance criterion the view carries today: **AC-404**, **AC-405** (both `Approve`
  refusals stated at render), **AC-409** (live countdown on the shared clock), **AC-410** (no
  control raises a multiplier), **AC-411** (a suspension needs a reason; the confirm's primary
  is disabled without one).
- `ConfirmMoneyDialog` and `useMoneyActions`. The suspension **write path** is not redesigned.
- `SURGE_SUSPENSION_MAX_HOURS` as the ceiling, read from the data layer.
- The six `fin.pricing.rateCard.col.*` column labels and their `(SAR)` unit suffixes.
- `MoneyCell` for every money figure.
- The screen's one `info` banner (spec §4.5 / R10) and the view stadium.
- Stage B stays BLOCKED. Nothing here builds AC-402–408.

**Changes.**

| Today | After |
|---|---|
| A flat vertical stack: one `Card` per rate card, live first, then every non-live card | A **master–detail block**: a 300px record list at the inline-start, one detail pane at the inline-end |
| Two reads with one cache key — `getLiveRateCard` and `listRateCards`, both keyed `pricing.rateCards`, distinguished by a constant dep (`:511–:540`) | **One read.** `listRateCards` only; the live card is `cards.find(c => c.status === 'live')`. The collision that comment manages stops existing |
| Commission, VAT and the effective range as three muted sentences per card | A pane header: version + status badge, one effective line, and **three statistics** at the inline-end |
| `simulation` as one composed sentence | A `Modelled impact` card: two labelled figures and a signed delta |
| `floors` as one composed sentence of four numbers | A `Floors` card: a two-column key/value grid |
| Surge windows as `FigureRow`s carrying a composed `{label} · {days} · {start} to {end}` string | A five-column table |
| Zone names rendered as buttons that each open a money confirmation directly | A **single-select district group** plus one primary `Suspend surge` |
| Suspensions as `FigureRow`s, no history, no filter, no empty state | A `DataTable` in **queue** mode: district, reason, raised by, started, state |

---

## 1. Pattern, and a gap in `patterns.md`

`docs/ref/patterns.md` gives Pricing & Plans exactly one row:

> **Index table (§3.1–3.3) → Sectioned form + save bar + derived values (§4.1, §2.3, §8.2)**

That row describes the `Subscription plans` view and its editor. It describes **none** of the
other three. `Rate card` is not an index table and has no form. `patterns.md` also says *"A page
with no row here may not be designed until it gets one."*

**F-RC-1 — raised to product-owner, not fixed here.** The Pricing & Plans row needs amending to
name its four views. `DESIGN.md` and its ref files are not mine to change. I am not blocked by
it either, because the shape this view needs is already in the table under another page:

| The row I am governed by | Where it already exists |
|---|---|
| `contacts` — *"**Work queue** for the list; **two-column detail** for the pane"* (§8.4 · §2.2, §3.8) | `patterns.md`, "Pages" table |

I take the **second half only**. The rail is a record list, not a work queue: nothing is
claimed, nothing has an SLA, nothing leaves. So §8.4 does not apply and the R5a row-critical
marker is not in play here (see §3, X-RC-3).

**Page shape: single column** — unchanged. The master–detail is a *block inside the content
region*, exactly as `InboxScreen.tsx:899`'s list + thread is. **No fifth page shape, no new §6.4
row, nothing minted.**

Sections that govern this screen: **§2.2, §3.8** (two-column detail); **§8.3.1 / §8.3.2**
(money); **§7.1–§7.6** (accessibility); **§9** (Arabic); **R3, R4, R5a, R6, R7, R8, R9, R10,
R13, R14, R15, R17**; **§6.3 D18** (uppercase labels); **D33 / D33a / D34** (surfaces);
**R4-5** (the delta is neutral).

---

## 2. Layout

Content width is `--ev-page-max` 1120px at the **D2** 1280px floor. Page header and view row are
`FinancialsPage`'s and do not change.

```
┌ page header ─────────────────────────────────────────────────────────────────┐
│ Pricing and plans                                       [ period control ]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Subscription plans │ Quick rides │(Rate card)│ Cancellation fees ]          │  ViewRow lead
│ 4 RATE CARDS · 1 LIVE · 2 DRAFTS · 1 SUPERSEDED                              │  ViewRow caption rung
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌ Card ────────────────────┬──────────────────────────────────────────────┐  │
│ │ Rate cards           (h3)│ RC-2026-04-01  [Live]      Commission,  22%  │  │
│ ├──────────────────────────┤ Effective from 1 April ·   on demand         │  │
│ │▌RC-2026-04-01     [Live] │ no end set                 Commission,  20%  │  │
│ │ From 1 Apr · no end set  │                            on a plan         │  │
│ │ Bill +5.2%               │                            Consumer   VAT    │  │
│ ├──────────────────────────┤                            prices    included│  │
│ │ RC-2026-09-01    [Draft] │──────────────────────────────────────────────│  │
│ │ From 1 Sept · no end set │ Class    Base  Per km  Per min   Min.  Canc. │  │
│ │ Not modelled             │ Economy  4.50    1.20     0.40  12.00  8.00  │  │
│ ├──────────────────────────┤ Comfort  7.50    1.75     0.55  18.00 12.00  │  │
│ │ RC-2026-08-01    [Draft] │──────────────────────────────────────────────│  │
│ │ From 1 Aug · no end set  │ ┌ Modelled impact ─────────┬ Floors ───────┐ │  │
│ │ Bill +3.4%               │ │ Modelled on 4,186 trips  │ Target   12%  │ │  │
│ ├──────────────────────────┤ │ Rider bill    Rider bill │ margin        │ │  │
│ │ RC-2026-01-01 [Supersed.]│ │ before        after      │ Payment  2.2% │ │  │
│ │ 1 Jan – 1 Apr            │ │ 21.80 SAR     22.94 SAR  │ fee           │ │  │
│ │ Bill 0%                  │ │            +5.2%         │ Support  9.00 │ │  │
│ │                          │ │ Measured against the     │ per sub.      │ │  │
│ │                          │ │ card this one replaced.  │ Reserve  3.5% │ │  │
│ │                          │ └──────────────────────────┴───────────────┘ │  │
│ │                          │ This card prices every trip today. Editing   │  │
│ │                          │ waits on the pricing owner decision.         │  │
│ └──────────────────────────┴──────────────────────────────────────────────┘  │
│                                                                              │
│ ┌ Surge windows ───────────────────────────┐ ┌ Suspend surge ─────────────┐  │
│ │ Windows are set by pricing. Operations   │ │ Choose a district, then    │  │
│ │ may only suspend surge.                  │ │ confirm.                   │  │
│ │ Window   Days      Hours  Mult.   State  │ │ ( Al Narjis )( Al Sahafa ) │  │
│ │ Morning  Sun–Thu    7–9   1.3×  [Running]│ │ ( KAFD / Olaya )( Al Malaz)│  │
│ │ Evening  Sun–Thu   16–19  1.4×  [Running]│ │ ( Qurtubah )( Al Yasmin )  │  │
│ │ Weekend  Fri Sat   19–23  1.2×  [Off]    │ │                            │  │
│ │                                          │ │ [Suspend surge] Al Narjis  │  │
│ │                                          │ │                 selected   │  │
│ └──────────────────────────────────────────┘ └────────────────────────────┘  │
│                                                                              │
│ ┌ Suspensions ─────────────────────────────────────────────────────────────┐ │
│ │ 0 in force · 12 ended                                    [ toolbar ]     │ │
│ │ District      Reason              Raised by     Started      State       │ │
│ │ Al Sahafa     Stadium event …     Yousef …      3 Sept 09:14 [Ended]     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Card order, and why.** The master–detail first, because it answers *what does a trip cost*.
Surge windows next, because a multiplier is applied to the card above it. `Suspend surge` beside
the windows, because it is the one lever on the multipliers at its inline-start. Suspensions last
and full width, because it is history, and history is never the first thing an operator reads.

**Geometry — every value is a live token or a Tailwind step. No new token is required.**

| Slot | Class | Token behind it |
|---|---|---|
| The block | one `Card`, `flex`, `compact:flex-col` | `--ev-radius-card`; `--card-spacing` 12px |
| Rail column | `w-detail-rail shrink-0 border-e border-border` | `--ev-detail-rail-w` **300px** (`globals.css:1705`), exposed as `--spacing-detail-rail` (`:2865`) |
| Detail pane | `min-w-0 flex-1` | — |
| Rail row | `h-row-media px-3 py-1.5`, three 16px lines | `--ev-row-h-media` **60px** (`globals.css:1626`) |
| Row separator | `border-b border-border-soft` | — |
| Pane's two cards | `grid grid-cols-3 gap-3` — impact `col-span-2`, floors `col-span-1` | `SupportDesk.tsx:~132` precedent |
| Surge row | `grid grid-cols-3 gap-3 compact:grid-cols-1` — windows `col-span-2` | same |

The reference says "roughly 290px" for the rail. **300px**, because it is the token the product
already has for exactly this column, it is on the 4px grid, and **R13** voids the reference's
figure as surely as it voids §1–§5's.

---

## 3. The rulings the reference forced

Each is a place the reference contradicts something live. Numbered `X-RC-n`, the convention
`people-rider-profile.md` §11 established.

| # | The reference draws | Ruled | Rule it rests on |
|---|---|---|---|
| **X-RC-1** | **Small uppercase, letter-spaced labels** as the house signature — `4 RATE CARDS`, `CLASS`, `BASE`, `MODELLED IMPACT`, `FLOORS HELD BY EVERY CARD`, `WINDOW`, `DAYS`, `DISTRICT` | **Refused everywhere but one place.** Every section heading, card title and column header is **sentence case**, `text-xs font-medium text-muted-foreground` | **§6.3 D18** — uppercase + letter-spacing is banned for labels, nav section headings and **table headers**. The cheat sheet states it as Eyvar's own rule (`_partials/00-header.md:136`); the source text it points at is `_partials/01-foundations.md:200` (a MUST) and `:178` (*"sentence case (**never** uppercase, **never** letter-spaced)"*). `columns.ts:101` already renders every `DataTable` header this way. **X-4** in `people-rider-profile.md` refused twelve of these on another screen — refusing them again is consistency, not novelty |
| **X-RC-1a** | — | The **one** surviving uppercase run: the **view-row caption rung**, `text-2xs leading-none font-medium uppercase tracking-wider tabular-nums text-muted-foreground`, carrying `4 rate cards · 1 live · 2 drafts · 1 superseded` | Already licensed and already on this screen: `ViewRow.tsx:~115`, **V-9.4 / V-3**, **AC-443**. It is the product's own home for the run the reference is reaching for |
| **X-RC-2** | Money, percentages, deltas and multipliers in a **monospace face** | **Refused.** Money goes through `Money` / `MoneyCell` — Inter, `tabular-nums`, `<bdi>`, `(SAR)` in the header. Percentages, deltas and `1.3×` are Inter with `tabular-nums` | **A standing owner ruling already decided this against an earlier reference.** `MetricTile.tsx:~306`: *"The face is the console's own and NOT the reference's. The reference sets every eyebrow, delta and axis tick in JetBrains Mono. **The owner's ruling is to keep the dashboard's font** … the one thing [a monospaced face] uniquely gives is column-aligned digits, and every numeral run in the product already has that from `tabular-nums`."* Money has a house treatment (`Money.tsx:1–41`) and the reference does not get to override it silently |
| **X-RC-2a** | — | `font-mono` **is** used, for one thing: the **version identifier** `RC-2026-04-01`, in the rail row and the pane heading | The product's existing rule for the face. `--font-mono` is declared (`globals.css:3565`) and every live consumer is an opaque machine identifier: `AdminActivityScreen.tsx:174` (`item.id`), `:251` (`subjectId`), `EmailLogCard.tsx:200` (`templateKey`), `MessagingTemplatesCard.tsx:96` (`code`), `TotpPanel.tsx:54` (the base32 secret — *"so `0`/`O` and `1`/`l` are distinguishable"*). A rate-card version is that kind of token. A rider's bill is not |
| **X-RC-3** | A **brand-green marker** along the selected row's inline-start edge | **Refused as drawn; the marker itself is kept.** `w-marker bg-foreground`, on a **`bg-selected`** ground, with `aria-current="page"` | **Reuse, do not mint.** `ConversationListItem.tsx:60–71` is the shipped selected-record row and already does exactly this: `<span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-foreground" />`. `--ev-marker` 3px (`globals.css:1752`) is the geometry both share. **R5a**'s edge marker is the *red* one and belongs to a breached row (`StatusBadge.tsx:57–105`); a green third stripe would give one instrument three meanings by hue alone, which is what R5 / R5a exist to stop. **The ground is `bg-selected`, not the inbox's `bg-muted`** — see §4 |
| **X-RC-4** | A filled green `Suspend surge` **and** a quiet `Live card` button | **One filled button on this view: `Suspend surge`** (`variant="default"`). **`Live card` is deleted**; its footer sentence stays | **R3** — one primary per screen, and the four views never render together. `Live card` is a noun with no action: a control that does nothing is a badge wearing a control's clothes, and the `Live` badge in the pane header already says it. `copy.md` rule 2 (buttons are verbs) fails it independently |
| **X-RC-5** | The chosen district chip **filled green** | **Refused.** The chosen chip takes **whatever the shipped `Toggle` on-state is** — today `data-[state=on]:bg-selected data-[state=on]:font-semibold` — inside a `ToggleGroup type="single" variant="outline"`. The screen names no fill of its own | `toggle.tsx:8` states it at the component: *"**R3 — THE ON STATE IS NOT `bg-primary`.**"* A green chip beside a green primary would also put two brand fills on one third-width card. The class is named here for the reader, not as a requirement: the requirement is *use the component untouched* |
| **X-RC-6** | `21.80 → 22.94` as one monospace transition | **Refused.** Two labelled figures, `Rider bill before` / `Rider bill after`, side by side | **§9.5 / §9.6** and **X-17** (`people-rider-profile.md`): a direction glyph baked into a string *"cannot mirror, isolate or translate"*. U+2192 is `Bidi_Mirrored=No`, so in Arabic it points away from the reading direction and no CSS fixes it |
| **X-RC-7** | `+5.2%` in a **pill** | **Refused as a pill.** The delta is text: `text-sm font-semibold tabular-nums text-foreground`, signed, **neutral** | **R4-5** — *"the delta chip is **neutral**. §3.7's colour MUST is void."* And `MetricTile.tsx:21`: a badge is *"never a status, never the delta"* — R7's five tones carry status; a delta is a quantity. **§8.3.2**: a negative uses **U+2212**, never a hyphen |
| **X-RC-8** | `1 Apr — open`, `7 — 9` | **Refused.** `From 1 Apr · no end set`; `7–9` | `copy.md` rule 12: *"**No em dash.** `·` separates a qualifier … the en dash is for numeric ranges only."* `1 Jan – 1 Apr` keeps the en dash, because a date range is a range |
| **X-RC-9** | In the class table's footer: `All figures in SAR. This is the live card, so nothing is compared.` | **Both halves deleted.** `(SAR)` is already in every column header; the comparison belongs to the impact card and is stated there | **§8.3.1** — *"inside a table the unit appears ONCE, in the column header as `(SAR)`, and never repeats in cells"* (`Money.tsx:29–31`). Restating it one row under the table is the same redundancy. The table gains a visually-hidden `<caption>` instead |
| **X-RC-10** | `FLOORS HELD BY EVERY CARD` | `Floors`, with the caption `Guardrails a card is checked against. Nothing enforces them yet.` | The heading claims what the data does not carry. `floors` is a **per-card** field (`types/pricing.ts`, `RateCard.floors`) that happens to hold one constant in fixtures — and the type's own doc says these are *"the guardrails `planFloorCheck()` computes and **nothing enforces**"* (**D-F11**). A heading that says "held" of a number nothing holds is exactly the *broken vs unbuilt* conflation `states.md` names |
| **X-RC-11** | A segmented filter `All districts │ Stadium │ School run │ Weather` under the subtitle *"grouped by district"* | **Refused twice.** (a) The segments the reference names are **reason** fragments, not districts — the control contradicts its own subtitle. (b) A per-card segmented filter is refused outright: district filtering is the **`DataTable` column filter** on `District` | (a) `fixtures/pricing.ts:494–500` — `reason` is free text from a five-item sample list, with no catalogue and no id. It cannot be segmented. (b) `patterns.md`, *"Table controls are not per-pattern"*: *"Sort, filter and column pinning belong to `DataTable`, not to the screen … **Do not build a per-page sort or filter control for any pattern.**"* Six districts today and more later; a seven-segment stadium is not a stadium |
| **X-RC-12** | Multi-select districts with `1 selected` | **Single select.** The reference's own words are *"the **chosen one** is filled"* and *"1 selected"*, so single is what it draws | `suspendSurge({ zoneId, … })` takes **one** zone (`clients/pricing.ts`), and `fin.pricing.surge.suspend.title` names one zone. Multi-select means N writes, a partial-failure state nobody has specified, and a confirm title that cannot name its subject |
| **X-RC-13** | A dark ground throughout | **Both themes are specified.** See §4 | **D33 / D33a / D34** |

### 3.1 The type ramp, and the floor — answered explicitly

The product declares two ramps under one hook (`globals.css`: Arabic at `:2030` onward, Latin at
`:3195` onward).

| Step | Latin | Arabic | Licensed for |
|---|---:|---:|---|
| `--text-2xs` | **11px** (`:3207`) | **12px** (`:2056`) | *"The count numeral, the delivery word and table meta, **and nothing else** (H2, AC-CC-03). A badge label and every line an operator reads sit at `--text-xs` or above; **this step is not a size for prose**"* |
| `--text-xs` | **12px** (`:3224`) | **13px** (`:2058`) | Secondary line, helper text, column header, meta |
| `--text-sm` | **14px** (`:3246`) | 14px | Body, table cell, button, input, nav row |

**The floor for anything an operator reads is 12px**, and `--text-2xs` at 11px is not under it by
accident — it is a closed-list step for counts, badge labels and table meta. So:

| Label in this design | Token |
|---|---|
| Rail heading `Rate cards` | `text-xs font-medium text-muted-foreground` (`SupportDesk.tsx:~135` precedent) |
| Rail row line 1, the version | `text-xs font-mono text-foreground` |
| Rail row lines 2 and 3 | `text-xs text-muted-foreground` |
| Pane heading, the version | `text-sm font-mono font-semibold text-foreground` |
| Pane effective line | `text-xs text-muted-foreground` |
| Statistic label | `text-xs text-muted-foreground` |
| Statistic value | `text-sm font-semibold tabular-nums text-foreground` |
| Every table column header | `KEY_VALUE_HEAD` = `py-1.5 text-xs font-medium text-muted-foreground` (`KeyValueGrid.tsx:16`), unchanged |
| Every table cell | `text-sm`; money through `MoneyCell` |
| Card title | `text-sm font-semibold text-foreground`, unchanged from today |
| Card caption / footer sentence | `text-xs text-muted-foreground` |
| Badge label | `--text-2xs`, set by `badge.tsx` — the only `--text-2xs` here besides X-RC-1a |
| View-row caption rung | `text-2xs … uppercase tracking-wider` (X-RC-1a) |

Nothing in this design sets a size class outside that table, and nothing sets an arbitrary size.

---

## 4. Surfaces — the light-theme answer, stated because the reference cannot give it

**D33 — a surface recesses, in both themes.** The block is **one** `Card`. Not two cards side by
side, and not a card inside a card.

- **Light.** Page `#ffffff`, pinned. The block is `bg-card`, one step **darker** than the page,
  and reads as a grey panel on it. The rail is *not* a second ground — it is the same card,
  divided by `border-e border-border`. Giving the rail its own darker fill would be a second
  recess step and a second surface for one concern.
- **Dark.** Page `--ev-bg` `#14181e`, pinned. `--ev-surface` `#080a0d`, **1.113 : 1 under the
  page** (`globals.css:1816` ladder). The card still recesses; the hairline still draws the edge,
  because **D34** deleted the inset highlight that used to.
- **The selected row is `bg-selected`**, and this is the one place I correct a precedent rather
  than copy it. `--ev-selected` (`globals.css:447–469`) is documented as *"**THE SELECTED
  GROUND.** One ground meaning *this is the row, the tile or the zone you chose*, as distinct
  from the one under the pointer … the D33 step applied to a STATE"* — light `#dce1e6`,
  **1.270 under** the card; dark `#252d38`, **1.426 over** it. Both clear 1.25 without a second
  carrier, and both are a larger step than hover, *"so the mouse never outranks the choice"*.
  `--ev-text-2` is 4.605 : 1 on it in light and 6.221 in dark, so the row's second and third
  lines still pass AA. **`bg-muted` would be wrong**: `--ev-bg2` is *"the table header row, the
  filter-chip strip, a card's section-header strip, a promo band, an inner empty panel"* — a
  tint, not a state. `ConversationListItem.tsx:60` still writes `bg-muted` because it predates
  the token; a migration onto `bg-selected` was in flight in this tree while this spec was
  written (`ui/tabs.tsx`, `ui/toggle.tsx`), and the rail is built on the new answer, not the old
  one.
- **Hover** is `bg-row-hover`, which is deliberately a *smaller* step than `bg-selected` in both
  themes.
- **D34 — nothing casts a shadow.** No card, no rail, no chip. Separation is the value step plus
  the hairline. The focus ring survives; a ring is not a shadow.
- **D33a does not apply.** Nothing on this view covers the page. The one covering surface is
  `ConfirmMoneyDialog`, already governed, and it stays white in light.

`docs/ref/tokens.md`'s *"Elevation — the closed set of three"* section is **stale under D34** and
must not be cited against this. Reported as **F-RC-4**, not fixed: it is not my file.

---

## 5. The four states, drawn

The block's states are driven by `listRateCards` alone. The three cards below it keep their own
reads (`listSurgeWindows`, `listSurgeSuspensions`, `listZones`) and their own states; one read
failing never blanks another card.

### 5.1 Content

As drawn in §2. **Rail order is fixed and is never sorted by the operator:** `live`, then `draft`
newest first by `effectiveFrom`, then `superseded` newest first. Against the shipped fixtures
that is `RC-2026-04-01`, `RC-2026-09-01`, `RC-2026-08-01`, `RC-2026-01-01`, whose bill deltas
read `+5.2%`, `Not modelled`, `+3.4%`, `0%` — matching the reference's own order exactly, which
is the evidence that this is the ordering rule it used.

### 5.2 Loading

```
┌ Card ────────────────────┬──────────────────────────────────────────────┐
│ ▭▭▭▭▭▭ (heading bar)     │ ▭▭▭▭▭▭▭▭▭▭▭      ▭▭▭▭  ▭▭▭▭  ▭▭▭▭           │
├──────────────────────────┤ ▭▭▭▭▭▭▭▭▭▭▭▭▭▭   ▭▭    ▭▭    ▭▭             │
│ ▭▭▭▭▭▭▭▭▭      ▭▭▭▭      │──────────────────────────────────────────────│
│ ▭▭▭▭▭▭▭▭▭▭▭▭             │ ▭▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭   (head row)  │
│ ▭▭▭▭▭▭                   │ ▭▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭               │
├──────────────────────────┤ ▭▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭  ▭▭▭               │
│  … four rows in total …  │──────────────────────────────────────────────│
│                          │ ┌ card outline ───────────┬ card outline ──┐ │
└──────────────────────────┴──────────────────────────────────────────────┘
```

- The **whole block** carries `aria-busy="true"`. Rail and pane skeleton render **together**. The
  pane never shows *"select a card"* while the rail loads: there is nothing to select yet, and a
  prompt that cannot be obeyed is a lie.
- **Four** rail rows at `h-row-media`, three bars each, so nothing moves when the data lands
  (§11.3).
- **The block draws its own skeleton inline; no pattern is added to `LoadingSkeleton`.** `P4`
  (what the view uses today) is the sectioned-form shape — a label column beside a five-field
  form card — and has never described this view. `P2` is main + rail with the rail at the
  inline-**end**. `SkeletonPattern` is typed as *"the ten §6.4 patterns"* (`LoadingSkeleton.tsx:37`),
  so minting `P11` means minting a §6.4 row, which §1 has already established is product-owner's.
  Inline `Skeleton` bars, as `ConversationList.tsx:53–66` and `SupportDesk.tsx:~97` both do.

### 5.3 Error

The read failed. **The whole block collapses to one `ErrorState scope="card"` spanning both
columns** — not an error in the rail with a live pane beside it, because a pane whose subject
cannot be listed has no subject.

> Couldn't load rate cards. Try again.  ` [ Try again ] `

Keys: `fin.error.read`, `fin.error.retry` — existing, unchanged.

### 5.4 Empty — and there are three kinds

| Kind | What renders | Copy |
|---|---|---|
| **Zero rate cards, ever** | The block keeps its **rail heading** and shows one grey sentence where the rows would be. The pane is not rendered; the block collapses to one column | `No rate card exists, so nothing can price a trip.` |
| **Exactly one rate card** | The rail renders **normally**: one row, selected, marker and all. It does **not** collapse, and there is no "1 of 1" chrome | — |
| **No card is live** (drafts and superseded only) | Everything renders. The view-row caption rung gains this as its **first** entry | `No card is live` |

**R8, applied.** None of these gets an illustration. This is an empty **block** inside a page that
still renders a view row, two surge cards and a suspensions table — not a whole-page,
zero-records-ever state. One grey sentence, and the block keeps its title so the operator can tell
*what* is missing (`states.md`; R5-11).

**No second banner.** *"No card is live"* is a standing condition, and R10 sends a standing
condition to a banner — but this screen's one banner is already spent on Q7 (spec §4.5), and
R10's other half is *never two banners*. It is stated on the caption rung and in the pane instead.

Retired: `fin.pricing.rateCard.empty.heading`, `fin.pricing.rateCard.empty.action`. `Read the
plans` navigates to a view that answers a different question, and R8 permits an action *"only if
one genuinely exists"* — under Stage B none does.

### 5.5 Domain states, per selected card

| State | Pane header | Class table | Modelled impact | Floors | Footer |
|---|---|---|---|---|---|
| **Live** | `[Live]` success · `Effective from 1 April · no end set` | 6 columns | figures + delta, caption **past tense** | as drawn | `This card prices every trip today. Editing waits on the pricing owner decision.` |
| **Draft, modelled** | `[Draft]` info · `Effective from 1 August · no end set` | 6 columns | figures + delta, caption **conditional** | as drawn | `[Approve]` disabled + `RefusalLine` |
| **Draft, not modelled** | `[Draft]` info | 6 columns | **title kept**, one grey sentence | as drawn | `[Approve]` disabled + `RefusalLine` (AC-404) |
| **Superseded** | `[Superseded]` neutral · `Effective 1 January to 1 April` | 6 columns | figures + delta, caption **past tense** | as drawn | `This card priced trips until 1 April. It is kept for the trips it priced.` |

**What a draft's pane offers that a live one does not** (asked): exactly one thing — the
`Approve` control and its refusal line. Nothing else differs by status except tense and the
effective line. A draft is not editable (Stage B, BLOCKED on Q7), cannot be deleted, and has no
"make live" path. **A live card's pane carries no control at all.**

**What `Not modelled` means** (asked): `simulation === null` — no replay against real trips has
been run. Two consequences, both stated on screen: no bill change can be shown, and under
**AC-404** the card cannot be approved. Copy:

> Not modelled against any trip. A card nobody modelled cannot be approved.

Not an em dash, not `0%`, not blank. An em dash would claim the number exists somewhere
(`states.md`; R5-1).

**Do the three statistics change per selected card** (asked): **yes.** They are read off the
selected card — `commission.onDemandPercent`, `commission.subscriptionPercent`, `vatIncluded` —
and change when the selection does. The pane's whole job is to describe the selected card; a
statistic in it that described a different one would be a lie, and a draft that raises commission
to 24% is precisely what an operator opened it to see. They are **not** put on the view row,
where `usePublishFacts` would make the page header jump on every arrow-key press.

---

## 6. Components

| Element | Component | Variant / tone | Note |
|---|---|---|---|
| The block | `Card` (`ui/card.tsx`) | default | One card. `overflow-hidden` is already on it, so the rail's hairline meets the radius cleanly |
| Rail list | `<ol>` → `<li>` → `<a>` | — | `aria-labelledby` the rail heading |
| Selected marker | `<span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-foreground" />` | — | Copied from `ConversationListItem.tsx:64` |
| Card status badge | `StatusBadge` | `Live` → **success** · `Draft` → **info** · `Superseded` → **neutral** | Unchanged from today. `StatusBadge.tsx:19` names `Draft` as `info` by example |
| Class table | `KeyValueTable` + `KEY_VALUE_HEAD/CELL/ROW` | — | Unchanged mechanism |
| Money | `MoneyCell` | `unit="none"` | The header carries `(SAR)` |
| Delta | plain `<span>` | neutral ink | R4-5; X-RC-7 |
| Approve | `Button` | `secondary`, `size="xs"`, `disabled` | Unchanged (AC-403–406) |
| Refusal line | `RefusalLine` | — | Unchanged |
| Surge-windows table | `KeyValueTable` | — | Three immutable rows. A `DataTable` here is a toolbar with nothing to do |
| Window state badge | `StatusBadge` | `Running` → **success** · `Off` → **neutral** | Existing keys `surge.enabled` / `surge.disabled` |
| District chips | `ToggleGroup type="single" variant="outline"` + `ToggleGroupItem` | the component's own on-state, untouched | Already restyled. **No `shadcn add` is needed for this screen**, and the screen adds no class to the on-state |
| Suspend surge | `Button` | **`variant="default"`**, `size="default"` | The view's one primary (R3). Disabled without a district, and disabled without the gate — with a `RefusalLine`, never a `title` tooltip (§11.2) |
| Suspensions table | `DataTable` + `useIndexTable({ mode: 'queue', getRowId, urlKey: 'sus' })` | no `bulkClaim`, no `rowActions` | **Queue, not ledger.** A ledger is money and is unsortable by rule (AC-48); this is a non-money record list an operator wants sorted by `Started`. Queue mode gives sort and filters; without `bulkClaim` it has no checkbox column |
| Suspension state badge | `StatusBadge` | `In force` → **warning** · `Ended` → **neutral** | **R14 check:** a suspension in force must **not** reuse the word `Running`, which the surge-window table already binds to `success` — the same label always takes the same tone, so the two states use different words. **R17:** one warning tone, and it is the right one — an active suppression is a standing condition someone must end |
| Confirm | `ConfirmMoneyDialog` | unchanged | AC-411 |

**No red anywhere on this view.** No red badge (R7), no destructive button, no page banner in
this view's own right, no row marker. R5a's four uses are all unclaimed here.

---

## 7. Interaction, keyboard, screen reader

### 7.1 The rail is a list of selectable records

**ARIA.** An `<ol>` of `<li>`, each holding one `<a href>`. **Not** `role="listbox"` /
`role="option"`: selection here changes the URL and is deep-linkable, and a listbox option is not
a navigable thing. This mirrors `ConversationList.tsx:~92` and `ConversationListItem.tsx:66–71`,
the product's shipped answer to the same problem.

- The `<ol>` is named by the rail heading via `aria-labelledby`.
- The selected row's `<a>` carries **`aria-current="page"`** — the value
  `ConversationListItem.tsx:71` uses for the same relationship. Consistency inside the product
  beats the argument that `"true"` is technically more precise for a same-route param change.
- The `<a>`'s accessible name is `Show rate card RC-2026-04-01`, because its visible content is
  three fragments and a badge, none of which is a sentence.
- `href` is `?view=rate-card&card=RC-2026-08-01`. `view` is `useScreenViews`'s and is untouched;
  `card` is new and owned by this view. Deep-linkable, so an operator can send a colleague a draft.

**Keyboard.** `useRovingFocus({ itemCount, orientation: 'vertical' })`
(`src/hooks/useRovingFocus.ts`), with `initialIndex` set to the selected row's index.

| Key | Does |
|---|---|
| `Tab` into the rail | Lands on the **selected** row, not the first — that is what the roving tabindex is for |
| `ArrowDown` / `ArrowUp` | Move **focus** within the rail. **They do not select.** The pane does real work; selection-follows-focus would render four panes to reach the fourth card |
| `Home` / `End` | First / last row |
| `Enter` | Selects. The pane updates. **Focus stays on the row** |
| `Tab` out of the rail | Into the pane. On a live or superseded card the pane holds nothing focusable, so the next stop is the `Suspend surge` card's first chip |

`ArrowDown` is down in every language, so a vertical list needs no RTL case — the hook says so
itself (`useRovingFocus.ts:20–22`) and consults `direction` only for horizontal lists.

**What the pane announces when the selection changes.** Focus does not move, so nothing announces
by itself. The pane therefore carries a permanently mounted polite live region whose text is
swapped:

```html
<p className="sr-only" role="status">Showing rate card RC-2026-08-01, draft.</p>
```

One announcement, not two: the pane's `<section aria-labelledby>` heading is not separately
focused, and no `aria-live` sits on the table. The region is mounted at all times — a live region
added to the DOM in the same frame as its text is not announced.

### 7.2 Everything else

| Element | Opens / does |
|---|---|
| Rail row | Selects, in place. **No modal, no drawer, no route change.** §5.0's decision table sends a modal to an irreversible act and a drawer to a peek beside a list. This is neither: it is the view's primary content |
| A class-table row | Nothing. Not clickable |
| A district chip | Toggles within the group. Choosing a second deselects the first |
| `Suspend surge` | Opens `ConfirmMoneyDialog` — the existing money confirmation with the existing reason field (AC-411). An irreversible act confirms (§5.3) |
| A suspensions row | Nothing. No row actions, no kebab (**D8-b**: the kebab begins at three) |
| `Escape` | Nothing on the view; closes the dialog when it is open |

**Focus.** Every interactive element takes the global `:focus-visible` ring — 2px `--ring` at 2px
offset, `globals.css` `@layer base`. Nothing here sets `outline-none` without one.

---

## 8. Arabic (§9)

| Thing | Mirrors? |
|---|---|
| The whole block: rail at the inline-**start**, pane at the inline-**end** | **Yes.** In Arabic the rail renders on the physical right |
| The rail's selection marker | **Yes** — `start-0`, never `left-0` |
| The rail column's divider | **Yes** — `border-e`, never `border-r` |
| The status badge inside a rail row | **Yes** — `ms-auto` pushes it to the row's inline-end |
| Class-table and surge-table **columns** | **Yes.** `Class` is `text-start`; the five numeric columns are `text-end`. In Arabic `end` is the physical left, which is correct: `Money.tsx:~80` — *"`text-align: end` — **never** `text-align: right`, which in Arabic aligns on the side the eye leaves"* |
| The **numeral runs** inside them | **No.** `1,234.00 SAR` keeps its character order (**AC-73**), because `Money` wraps every value in `<bdi>` and `globals.css` pins `tabular-nums` on `table` in `@layer base`. This is **R4**'s *"does not flip"*: the **rule** does not flip, so the column stays end-aligned — the column itself does move to the other side |
| `1.3×` | **No.** `×` is U+00D7, bidi class ON, `Bidi_Mirrored=No`. Rendered as `{value}×` inside `<bdi>` so the numeral and the sign travel as one LTR run in both languages. The existing key `fin.pricing.surge.multiplier` is already `{value}×` and is correct as it stands |
| `7–9` (hours) | **No** — one numeric run in `<bdi>` |
| `1 Jan – 1 Apr` | **The pair mirrors; each date does not.** Two `<bdi>` spans with the en dash as a separate `aria-hidden` element between them, so the "from" date sits at the inline-start in both languages. `ViewRow.tsx:~120` draws its `·` this way for the same reason, and **AC-443** requires it |
| `RC-2026-04-01` in `font-mono` | **No, and the face is safe.** It is an ASCII token in `<bdi>`. `--font-mono` (`ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace`) is never applied to a translated string, so no Arabic glyph ever resolves through it |
| `uppercase` / `tracking-wider` on the view-row caption rung | **No-ops in Arabic**, by design. `globals.css:2137–2141` zeroes the whole tracking scale under `:root:lang(ar)` because letter-spacing breaks cursive joins, and Arabic has no case. The rung keeps its size, weight and colour, which is what carries it |
| Delta sign | `+5.2%` / `−3.4%` (U+2212, §8.3.2), inside `<bdi>` |

**One live i18n defect this design surfaces (F-RC-3).** `SurgeWindow.days` holds `Sun`…`Sat` as
raw English strings from legacy (`types/pricing.ts`, *"as legacy stores them (`:13884`)"*), and
`PricingScreen.tsx` renders them with `window.days.join(' ')`. An Arabic operator reads English
day abbreviations today. The `Days` column must map each value through
`fin.pricing.surge.day.<sun…sat>`, seven new keys. The data layer does not change.

**Prose check.** Nothing in this document says "left" or "right" about a layout. Every label was
written to survive Arabic word order: `Commission, on demand` is a noun with a qualifier, not an
English-order phrase.

---

## 9. Copy — every string, final

Sentence case. Buttons are verbs. No exclamation marks. Full sentences take a period; fragments,
labels and buttons do not (**R6**). No em dash (`copy.md` 12). **No toast changes**: this view
raises exactly one, `fin.pricing.surge.toast.suspended` = `Surge suspended`, 15 characters, which
already passes **R9**.

### 9.1 New keys

**Every key below needs an Arabic entry in `src/i18n/ar/financials.ts` in the same commit.** Run
`npm run i18n:keys` afterwards.

| Key | English |
|---|---|
| `fin.pricing.rateCard.rail.heading` | `Rate cards` |
| `fin.pricing.rateCard.rail.select` | `Show rate card {version}` |
| `fin.pricing.rateCard.rail.from` | `From {date} · no end set` |
| `fin.pricing.rateCard.rail.range` | `{from} – {to}` |
| `fin.pricing.rateCard.rail.delta` | `Bill {delta}` |
| `fin.pricing.rateCard.rail.notModelled` | `Not modelled` |
| `fin.pricing.rateCard.announce` | `Showing rate card {version}, {status}.` |
| `fin.pricing.rateCard.effective.noEnd` | `Effective from {date} · no end set` |
| `fin.pricing.rateCard.stat.onDemand` | `Commission, on demand` |
| `fin.pricing.rateCard.stat.subscription` | `Commission, on a plan` |
| `fin.pricing.rateCard.stat.consumerPrices` | `Consumer prices` |
| `fin.pricing.rateCard.vat.included` | `VAT included` |
| `fin.pricing.rateCard.vat.excluded` | `VAT not included` |
| `fin.pricing.rateCard.table.caption` | `Per-class rates on rate card {version}` |
| `fin.pricing.rateCard.impact.heading` | `Modelled impact` |
| `fin.pricing.rateCard.impact.trips` | `Modelled on {trips} trips` |
| `fin.pricing.rateCard.impact.ranAt` | `Run {date}` |
| `fin.pricing.rateCard.impact.before` | `Rider bill before` |
| `fin.pricing.rateCard.impact.after` | `Rider bill after` |
| `fin.pricing.rateCard.impact.caption.past` | `Measured against the card this one replaced.` |
| `fin.pricing.rateCard.impact.caption.future` | `Measured against the card this one would replace.` |
| `fin.pricing.rateCard.impact.none` | `Not modelled against any trip. A card nobody modelled cannot be approved.` |
| `fin.pricing.rateCard.floors.heading` | `Floors` |
| `fin.pricing.rateCard.floors.caption` | `Guardrails a card is checked against. Nothing enforces them yet.` |
| `fin.pricing.rateCard.floors.margin` | `Target margin` |
| `fin.pricing.rateCard.floors.fee` | `Payment fee` |
| `fin.pricing.rateCard.floors.support` | `Support per subscriber` |
| `fin.pricing.rateCard.floors.reserve` | `Emergency reserve` |
| `fin.pricing.rateCard.footer.live` | `This card prices every trip today. Editing waits on the pricing owner decision.` |
| `fin.pricing.rateCard.footer.superseded` | `This card priced trips until {date}. It is kept for the trips it priced.` |
| `fin.pricing.rateCard.noLive` | `No card is live` |
| `fin.pricing.rateCard.count.cards.one` | `1 rate card` |
| `fin.pricing.rateCard.count.cards.other` | `{count} rate cards` |
| `fin.pricing.rateCard.count.live` | `{count} live` |
| `fin.pricing.rateCard.count.drafts.one` | `1 draft` |
| `fin.pricing.rateCard.count.drafts.other` | `{count} drafts` |
| `fin.pricing.rateCard.count.superseded` | `{count} superseded` |
| `fin.pricing.surge.col.window` | `Window` |
| `fin.pricing.surge.col.days` | `Days` |
| `fin.pricing.surge.col.hours` | `Hours` |
| `fin.pricing.surge.col.multiplier` | `Multiplier` |
| `fin.pricing.surge.col.state` | `State` |
| `fin.pricing.surge.hours` | `{start}–{end}` |
| `fin.pricing.surge.empty` | `No surge window is configured.` |
| `fin.pricing.surge.day.sun` … `.mon` `.tue` `.wed` `.thu` `.fri` `.sat` | `Sun` `Mon` `Tue` `Wed` `Thu` `Fri` `Sat` — seven keys |
| `fin.pricing.surge.suspend.heading` | `Suspend surge` |
| `fin.pricing.surge.suspend.subtitle` | `Choose a district, then confirm.` |
| `fin.pricing.surge.suspend.group.label` | `District` |
| `fin.pricing.surge.suspend.chosen` | `{district} selected` |
| `fin.pricing.surge.suspend.prompt` | `Choose a district.` |
| `fin.pricing.surge.suspensions.heading` | `Suspensions` |
| `fin.pricing.surge.suspensions.inForce.one` | `1 in force` |
| `fin.pricing.surge.suspensions.inForce.other` | `{count} in force` |
| `fin.pricing.surge.suspensions.ended.one` | `1 ended` |
| `fin.pricing.surge.suspensions.ended.other` | `{count} ended` |
| `fin.pricing.surge.suspensions.empty` | `No surge suspension has ever been raised.` |
| `fin.pricing.surge.col.district` | `District` |
| `fin.pricing.surge.col.reason` | `Reason` |
| `fin.pricing.surge.col.raisedBy` | `Raised by` |
| `fin.pricing.surge.col.started` | `Started` |
| `fin.pricing.surge.col.suspensionState` | `State` |
| `fin.pricing.surge.state.inForce` | `In force` |
| `fin.pricing.surge.state.ended` | `Ended` |

### 9.2 Changed keys

| Key | Was | Is |
|---|---|---|
| `fin.pricing.rateCard.empty.body` | `A rate card is what every fare is computed from.` | `No rate card exists, so nothing can price a trip.` |

### 9.3 Retired — delete from `copy.ts` **and** `src/i18n/ar/financials.ts`

`fin.pricing.rateCard.commission` · `fin.pricing.rateCard.vatIncluded` ·
`fin.pricing.rateCard.simulation` · `fin.pricing.rateCard.noSimulation` ·
`fin.pricing.rateCard.floors` · `fin.pricing.rateCard.empty.heading` ·
`fin.pricing.rateCard.empty.action` · `fin.pricing.surge.window` ·
`fin.pricing.surge.suspension` · `fin.pricing.surge.suspension.by` ·
`fin.pricing.surge.suspension.none` · `fin.pricing.surge.suspend`

(The bare `fin.pricing.surge.suspend` label is replaced by `…suspend.heading` and the existing
`…suspend.confirm`, which already reads `Suspend surge`.)

`fin.pricing.rateCard.col.wait` and `fin.pricing.rateCard.wait` are **kept and still unused** —
see F-RC-2.

### 9.4 Unchanged and still correct

`…rateCard.heading` · `…status.live|draft|superseded` · `…effectiveUntil` ·
`…col.class|base|perKm|perMin|minFare|cancelFee` · `…approve` ·
`…approve.blocked.proposer|simulation|stage` · `…surge.readOnly` · `…surge.multiplier` ·
`…surge.enabled` · `…surge.disabled` · `…surge.suspension.expires|expired` ·
`…surge.suspend.title|body|confirm|reason.*|zone.empty` · `…surge.toast.suspended` ·
`fin.error.read` · `fin.error.retry` · `fin.error.row` · `fin.empty.noMatch`.

---

## 10. Acceptance criteria

**The block**

1. **AC-RC-01** The `Rate card` view renders one `Card` containing a 300px rail at the
   inline-start and a detail pane at the inline-end, divided by one hairline. Below the `compact`
   breakpoint the two stack, rail first.
2. **AC-RC-02** The rail lists **every** rate card — live, draft and superseded — in the order
   live, draft newest first, superseded newest first. Against the shipped fixtures the four rows
   read `RC-2026-04-01`, `RC-2026-09-01`, `RC-2026-08-01`, `RC-2026-01-01`.
3. **AC-RC-03** Each rail row renders three lines: version, effective range, bill delta. A card
   with no simulation renders `Not modelled` on the third line — never `0%`, never blank.
4. **AC-RC-04** On arrival the live card is selected. With no live card the newest draft is
   selected; with no draft, the newest superseded.
5. **AC-RC-05** The selected row carries all three of: the `bg-selected` ground, the
   `w-marker bg-foreground` inline-start marker, and `aria-current="page"`. No row anywhere on
   this view carries a red or a green edge marker.
6. **AC-RC-06** The view issues **one** rate-card read. `getLiveRateCard` is not called from this
   screen, and no two `useAsync` calls share `cacheKey: 'pricing.rateCards'`.

**The detail pane**

7. **AC-RC-07** The pane header renders the version in `font-mono`, its status badge, one
   effective line, and three statistics — commission on demand, commission on a plan, consumer
   prices — read from the **selected** card. Selecting a different card changes all three.
8. **AC-RC-08** The class table renders six columns. `Class` is `text-start`; the other five are
   `text-end` with tabular figures, in both languages. Every money cell is a `MoneyCell` with
   `unit="none"`, and `(SAR)` appears only in column headers.
9. **AC-RC-09** No column header, section heading or card title on this view is uppercase or
   letter-spaced. The only uppercase run on the screen is the view-row caption rung.
10. **AC-RC-10** The `Modelled impact` card renders `Rider bill before`, `Rider bill after`, a
    signed delta and a caption. **No `→` character appears anywhere in the rendered output.**
11. **AC-RC-11** The delta is neutral ink in a plain span — not a badge, not a pill. A negative
    delta uses U+2212.
12. **AC-RC-12** A card with `simulation === null` renders the impact card with its **title kept**
    and one grey sentence: `Not modelled against any trip. A card nobody modelled cannot be
    approved.`
13. **AC-RC-13** The `Floors` card renders four labelled values and the caption `Guardrails a card
    is checked against. Nothing enforces them yet.`
14. **AC-RC-14** A live card's pane carries **no** control; a superseded card's pane carries none.
    Only a draft's pane carries `Approve`, disabled, with its `RefusalLine` (AC-403–406 unchanged).
15. **AC-RC-15** There is no button labelled `Live card` anywhere on the view.

**States**

16. **AC-RC-16** While the read is in flight the block renders `aria-busy="true"` with four
    three-bar rail skeletons at `h-row-media` and a pane skeleton whose table has one header row
    and two body rows. **No spinner** is rendered.
17. **AC-RC-17** A failed read renders one `ErrorState` across the whole block with a working
    `Try again`. The three cards below still render their own data.
18. **AC-RC-18** With zero rate cards the block keeps its rail heading, renders `No rate card
    exists, so nothing can price a trip.`, renders **no illustration**, and renders no pane.
19. **AC-RC-19** With exactly one rate card the rail renders normally with that row selected. It
    does not collapse and no "1 of 1" text appears.
20. **AC-RC-20** With no live card the view-row caption rung's first entry is `No card is live`,
    and the screen still renders exactly one banner.

**Keyboard and screen reader**

21. **AC-RC-21** `Tab` into the rail lands on the selected row. `ArrowDown` / `ArrowUp` move focus
    without changing the selection or the pane. `Home` / `End` reach the first and last rows.
    `Enter` selects and leaves focus on the row.
22. **AC-RC-22** The rail is an `<ol>` named by its heading, and each row is an `<a>` whose
    accessible name is `Show rate card {version}`.
23. **AC-RC-23** Changing the selection updates a permanently mounted `role="status"` region to
    `Showing rate card {version}, {status}.` Exactly one live region exists in the block.
24. **AC-RC-24** Selecting a card writes `card={version}` to the search params, and loading that
    URL directly opens that card.

**Surge**

25. **AC-RC-25** `Surge windows` renders a five-column table. Day names render through
    `fin.pricing.surge.day.*` and are translated in Arabic. Hours render `7–9` with an en dash.
    Multipliers render `1.3×` with tabular figures and do not reorder in Arabic.
26. **AC-RC-26** `Suspend surge` renders a single-select `ToggleGroup` of districts. The chosen
    chip is **not** filled with the brand colour. `Suspend surge` is the **only**
    `variant="default"` button on the view, and it is disabled until a district is chosen.
27. **AC-RC-27** Without write permission the primary is disabled and the reason renders as
    visible text in a `RefusalLine`, not as a `title` attribute.
28. **AC-RC-28** Pressing `Suspend surge` opens `ConfirmMoneyDialog` naming the chosen district;
    its primary stays disabled until a reason is entered (AC-411 unchanged).
29. **AC-RC-29** `Suspensions` renders a `DataTable` in queue mode with no checkbox column and no
    row actions, filterable by `District` through the standard column filter. **There is no
    segmented control on the card.**
30. **AC-RC-30** A suspension whose `expiresAt` has passed renders `Ended` in the **neutral** tone;
    one still running renders `In force` in **warning**. No badge on this view is red, and the word
    `Running` is used only by the surge-window table.
31. **AC-RC-31** With no suspensions ever, the card renders `No surge suspension has ever been
    raised.` with no illustration.

---

## 11. Deviations, findings and open questions

### 11.1 Deviations from `DESIGN.md`

**None.** Every choice above resolves to an existing rule, an existing ruling, or an existing
shipped component. Nothing suspends a rule and no §6.2 row is needed.

### 11.2 Deviations from the reference

X-RC-1 through X-RC-13 in §3, each with the rule it rests on. Two more, which are additions
rather than refusals:

- **The class table gains a visually hidden `<caption>`** (`Per-class rates on rate card
  {version}`). §7 wants a table named; the reference's visible footer sentence was doing a
  different job badly.
- **The suspensions card gains sortable columns, a district filter and an empty state**, none of
  which the reference draws and all of which `DataTable` gives for free once the card stops being
  a list of `FigureRow`s.

### 11.3 Findings raised, not fixed

- **F-RC-1** — `docs/ref/patterns.md`'s Pricing & Plans row describes one of four views. It needs
  amending to name them. `DESIGN.md` and its ref files are not mine to change.
- **F-RC-2** — several rate-card fields render **nowhere** in the product: `freeWaitMin`,
  `waitPerMinHalalas`, `returnLegFactor`, `planDiscountPercent`, and `surge.capByCity` /
  `minMultiplier` / `appliesToPlanLegs`. Spec `03-financials.md:664` requires the card to render
  *"read-only **in full** … per-class rates, commission, ladder, floors, surge cap"*. Two dead copy
  keys (`…col.wait`, `…wait`) are the residue. **Not designed here** — it is a card the owner did
  not ask for, and inventing it is inventing scope. Recommended: one `Waiting and other rates`
  card below the class table, in a follow-up.
- **F-RC-3** — `SurgeWindow.days` ships raw English abbreviations to Arabic operators (§8). The fix
  is seven copy keys plus a map at the render site; the data layer does not change.
- **F-RC-4** — `docs/ref/tokens.md`'s *"Elevation — the closed set of three"* section survived
  **D34**, which deleted all three tiers. It will be cited against a correct shadow-free component
  sooner or later.
- **F-RC-5** — **the tree changed under me while this was being written**, and the change is in
  this design's path. Another agent is migrating selection states onto the `bg-selected` slot
  (`ui/tabs.tsx` `data-active:bg-accent` → `bg-selected`; `ui/toggle.tsx` `data-[state=on]:bg-card`
  → `bg-selected`). The token itself already existed (`globals.css:469`, `:1953`, `:2531`), so §4
  is written against the new answer. **`ConversationListItem.tsx:60`'s `bg-muted` is the next
  candidate in that migration** and is reported to whoever owns it — the rail here does not copy
  it.
- **F-RC-6** — `DataTable.tsx:~2420` asserts *"`.dark` is never applied anywhere in this product
  and there is no dark palette"*. It is stale: `globals.css:1816` carries a full dark ladder and
  `src/hooks/useTheme.ts` resolves and applies it. `ui/button.tsx:25` carries the same stale claim
  (*"Eyvar ships one theme"*). Both matter here, because §4 specifies dark.

### 11.4 Open questions — product-owner

- **Q-RC-1** Should a **draft**'s class table mark which figures differ from the live card? The
  data supports it (`classes[]` on both). It is the first thing a pricing owner would look for and
  it is not in the reference. **Not designed here.**
- **Q-RC-2** `surge.capByCity` is keyed by city code (`RUH`, `JED`) and the product has **no
  city-code catalogue**, so anything that renders it shows a raw code. Related to F-RC-2.

---

## 12. Handoff

- **frontend-engineer** — build. The whole of §2, §5, §6, §7 and §10.
- **utilities-engineer** — three helpers this design implies, all small: (1) a `dayLabel` map for
  F-RC-3; (2) a signed-percent formatter that emits U+2212 for X-RC-7 if `formatPercent` does not
  already; (3) confirm `sr-only` is available as a utility for AC-RC-23.
- **No `globals.css` change is required**, and none is requested. Every token this design uses is
  already declared.
