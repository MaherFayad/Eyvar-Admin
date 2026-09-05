# Growth tables — design

**Spec:** `docs/05-restructure/specs/management-growth-tables.md` ·
**Pattern:** `docs/ref/patterns.md` → Index table (§3.1–3.3) beneath Metric tiles (§3.7) ·
**Governed by:** §3.1–3.3, §3.2 (tabs), §3.7, §7.1, §7.5, §8, §9, §11.2, R3, R5a, R7, R8,
R9, R10, R15, D8, D21, D-2′, D-11, T5.4, X18
**Reference examined:**
`shopify-admin-web/09-discounts/discounts-list-with-code.webp` — the structural model: a
tab strip inside the list card with `All` first, a bold code as the identity with a muted
second line under it, a status badge mid-row and a right-aligned count at the end;
`shopify-admin-web/09-discounts/discounts-empty-state.webp` — R8's illustrated whole-page
empty inside the same frame the list occupies;
`navattic-web/223f15e5.webp` — D7's visual language: hairline row rules, one 13px type
size across the body, the search and filter cluster on one row with sort at the
inline-end, and `1-6 of 6` with the pager at the inline-end of the footer.

## Layout

**Page shape: single column** (`SingleColumnPage`, `body="flow"`), which is the board's own
shape and stays it. The board is the page's bleed; the tab strip and the table are its body.

```
┌────────────────────────────────────────────────────────────────────┐  bleed
│ Growth                                                    ⟳  All time│  BoardHero
│ Where new riders come from, what they cost, and whether the         │  §8 slots 1-2
│ promotions are paying for themselves.                               │
│  ┌────────┐ ┌────────┐ ┌────────┐                                   │
│  │   0    │ │  1.8 % │ │  5.2×  │      lead figures (radiogroup)    │
│  └────────┘ └────────┘ └────────┘                                   │
└────────────────────────────────────────────────────────────────────┘

   ( Board )( Promos )( Referrals )( Incentives )( Messages )            the strip,
   ────────────────────────────────────────────────────────────────      y = 507

   ┌ hoisted chart card ────────────┐                                    board content,
   └────────────────────────────────┘                                    unchanged
   ── chapters, charts, breakdowns ──                                    (?view= absent)

?view=promos — the strip becomes the table's own toolbar row, still first:

   ( Board )( Promos )( Referrals )…      [ Search ]  Filter  Columns  ⇅  ⤓
   ─────────────────────────────────────────────────────────────────────
   ☐ │ Code            │ Disc │ Budget burn │ New subs │ Return │ Expires │ Status │ ⋯
   ─────────────────────────────────────────────────────────────────────
   ☐ │ EYVAR30         │ 30 % │        84 % │       61 │  1.3×  │ 31 Jul  │ Active │ Pause
   │ │ New riders      │      │Nearly spent │          │        │         │        │
   ─────────────────────────────────────────────────────────────────────
                                              Showing 1–10 of 10     ‹ ›

   ── the board's chart, chapters and breakdowns follow the table ──
```

**The strip leads the page block, and that is measured rather than preferred.**
With the strip trailing the board's evidence it sat at **y = 1663** on an 800px
viewport: two full scrolls from the top, on the control that reaches four
tables. Above the evidence it is at **y = 507** and the table at **605**, both
inside the first viewport. What stays above it is the band, which carries the
`<h1>`, the lede, the freshness line, the period picker and the three lead
figures: the board an operator reads before choosing a list.

The board is `MetricBoardScreen`'s and is **not reimplemented**: it gains one optional
`below` slot, rendered as the last thing in its page block, and the other seven boards pass
nothing and are byte-identical. The board renders in every view, which is what keeps the
figure and the row that explains it on one page — R4-6's whole argument for this shape.

The page is `body="flow"`, which is the board's own shape: the page scrolls and the
pagination row lands at the end of the table. A bounded scroller needs `fill`, and `fill`
would squeeze a board and a table into one viewport. `ZonesScreen` records the same
measurement for the same reason.

## Page header

There is none, and that is §8's own answer for a board: `BoardHero` carries the `<h1>`,
the lede, the freshness line, the period pill and the refresh control, and §8 slot 4c
withholds a page-level action from a read surface. **R3's one primary is spent nowhere on
this screen** — every act here is a row act or a bulk act, and the `Try again` inside a
failed table is the only primary that ever renders.

## Regions

| Region | Contains | Card? | Notes |
|---|---|---|---|
| Bleed | `BoardHero` — title, lede, `asOf`, period pill, refresh, lead figures | no | Unchanged. The board's own component |
| Board body | hoisted chart, chapters, charts, breakdowns | cards inside | Unchanged. Renders in every view |
| View strip | five tabs, `Board` first | no (D-11: index pages carry no card) | In the four list views it **is** the table's toolbar row, sharing it with search, filter, columns, sort and export. In the board view it is the same strip standing alone |
| Table | `DataTable`, `mode: 'index'` | no | In flow: the page scrolls and the pagination row sits at the table's end |
| Sheet | row detail on `promos`, `incentives`, `messages` | — | §5.5 drawer, **no scrim**: the row behind it stays readable |

**The strip is never in the page header** (§3.2). It sits at the top of the table region,
which is where the reference puts it (`discounts-list-with-code.webp`: the tab row is the
first thing inside the list frame, not beside the page title).

## Column budget

The binding measure is the **Arabic** inner width at the 1280 floor, 870px
(`CorporateScreen.tsx` records the same arithmetic). One flexible identity column per
view; every other column is a fixed px width and every line truncates, so the row pitch is
one value (T5.4).

**Promos** — selection column 40 + action lane 152. Every width below was
**measured** at 1280 in both languages (`scripts/harness/growth.mjs`), not
estimated:

| Column | Width | Align | Type | Notes |
|---|---:|---|---|---|
| Code | flex, min 128 | start | text | Identity. Monospace, weight 600. Second line: target segment |
| Discount | 92 | end | number | `30 %`. 80 wrapped the header in English |
| Budget burn | 108 | end | percent | `84 %`, with `Nearly spent` beneath in the 80-99 band |
| New subs | 84 | end | number | |
| Return | 76 | end | ratio | `1.3×` |
| Expires | 104 | start | date | 96 clipped an Arabic month |
| Status | 124 | start | enum | Badge. 98 clipped `Budget spent` |
| Uses | 76 | end | number | `defaultHidden` — the column picker restores it |
| Target | 148 | start | enum | `defaultHidden`; it is the identity's second line |

588 fixed + 128 floor + 40 + 152 = **908**; the identity takes the 2px back and
measures 130 in English. Arabic's 870 squeezes the numeric columns to 87 / 99 /
82 / 76 and clips none of them.

**Referrals** — no selection, no action lane:

| Column | Width | Align | Type |
|---|---:|---|---|
| Referrer | flex, min 160 | start | text (link). Measured 302 in English, 262 in Arabic |
| Referee | 172 | start | text (link). 140 clipped five names of seven |
| Referrer bonus | 104 | end | money |
| Referee bonus | 104 | end | money |
| Credited | 112 | start | date |
| Signal | 116 | start | enum. 108 clipped `Shared device` |

608 fixed + 160 floor = **768**; the identity takes the rest.

**Incentives** — action lane 152, no selection (§9.3: no declared bulk command,
so no checkbox column):

| Column | Width | Align | Type |
|---|---:|---|---|
| Incentive | flex, min 200 | start | text |
| Reward | 184 | start | text |
| Earned | 88 | end | number |
| Total paid | 112 | end | money |
| Status | 80 | start | enum |
| Condition | 176 | start | enum |

**The condition rides under the name, not in a column of its own**, the way a
promo's target does. Measured with its own column: every rule's condition
truncated to four words and the reward was left 128px, which clipped
`Commission 20% to 17%`. It stays a sortable, filterable, `defaultHidden`
column. 464 fixed + 200 floor + 152 = **816**; the identity takes the rest and
measures 294 in English, 254 in Arabic.

**Messages** — no selection, no action lane:

| Column | Width | Align | Type |
|---|---:|---|---|
| Message | flex, min 240 | start | text. Measured 290; the full body is in the sheet |
| Segment | 180 | start | enum. 168 clipped four sends of eight |
| Channel | 96 | start | enum |
| Recipients | 92 | end | number |
| Sent | 128 | start | date |
| Sent by | 128 | start | text. 116 clipped every Arabic sender |

624 fixed + 240 floor = **864**; the body measures 286 in English, 246 in Arabic.

## The budget-burn cell

The value is the percentage, `tabular-nums`, at the inline-end, and **there is no bar**.
Legacy paints one green, amber or red and prints no number (`:13517`), which is colour as
the only carrier and §7.5 forbids it. The number is the value; a word is the second
carrier where there is something to say:

| Burn | What renders |
|---|---|
| `< 80` | the number |
| `80 – 99` | the number, and `Nearly spent` beneath it in `text-warning-foreground` |
| `>= 100` | the number. The row's own `Budget spent` badge is the second carrier, so the word is not repeated |

`Progress` is not borrowed for this: its own header scopes it to the SLA track and says so.
A second meter with a second meaning would make that scope untrue.

**No red.** R5a permits red for a row-critical marker and a destructive primary; an
over-budget campaign is neither, and there is no red badge in this product.

## States

### Content

The board, the strip, the table. Rows are hairline-ruled, 13px, one pitch. The identity
cell is weight 600; every other cell is regular, and the second line is
`text-xs text-muted-foreground`.

### Empty — first-run (R8, whole page, zero records ever)

Illustration, heading, one-sentence body, **no action** (every act that would create a
record is out of scope; an empty state must not offer a button that does not exist).

| View | Heading | Body |
|---|---|---|
| Promos | `No promo campaigns yet` | `Campaigns you launch appear here with their budget, return and status.` |
| Referrals | `No referrals credited yet` | `Every referral that pays a bonus to both riders is logged here.` |
| Incentives | `No captain incentives yet` | `Bonus rules for captains appear here with what each has paid.` |
| Messages | `No messages sent yet` | `Every message sent to a segment is logged here with its audience.` |

### Empty — no-match (filtered to zero)

One grey sentence and `Clear filters`, never the illustration:
`No campaigns match these filters` · `No referrals match these filters` ·
`No incentives match these filters` · `No messages match these filters`.

### Loading

`DataTable`'s `P1` skeleton — rows shaped like the rows, at the same pitch. Never a
spinner. **The board above keeps rendering**: the two reads are independent, so a slow
list never blanks a number that already arrived.

### Error

The table's own error row, inside the frame:
`Couldn't load campaigns. Try again.` with `Try again` as its one primary. The board is
untouched, and a failed board leaves the table untouched — AC-24's scope, one level down.

### Board-only

`?view=` absent, or set to something that is not one of the four. The board, then the
strip with `Board` selected, then nothing. Not an error and not an empty table: the
operator asked for a board and got one.

### Promo paused · exhausted · expired

| Status | Badge | Tone | Lane |
|---|---|---|---|
| Active | `Active` | success | `Pause` |
| Paused | `Paused` | warning | `Resume` |
| Budget spent | `Budget spent` | neutral | — |
| Expired | `Expired` | neutral | — |

`Budget spent` is neutral rather than warning: a campaign that spent its budget did what
it was told to do. Legacy paints it red (`b b-red`, `:13512`) and R5a forbids that.

### Referral flagged

The `Signal` column reads `Shared device`, warning tone, as a word. No act — suspending
the referee lives on the pre-filtered list Risk & Signals links to (**O4**, T7.2). An
unflagged row's `Signal` cell is **blank**, not an em dash: **O9**, *"blank for
not-applicable"*.

### Incentive inactive

`Paused`, warning tone, and `Activate` in the lane.

### Refused by role

The act renders **disabled in place** with its reason on `RowAction.reason`
(§11.2): `Your role cannot change a campaign` · `Your role cannot change an incentive`.
Never hidden — an operator who cannot see the control cannot learn it exists.

**A DOMAIN refusal renders as a disabled control with no sentence**, and that is
measured rather than preferred. Every promo row declares both `Pause` and
`Resume` and exactly one of them applies, so a sentence on the other put *This
campaign is over* in nine rows out of ten and took the row pitch from 40 to
**77px**. The row's own badge already says `Budget spent` or `Expired`; the lane
does not repeat it. The pitch after the change is **53px** (61 in Arabic), and
the only sentence left in a lane is the permission one, which nothing else on
the row states.

### Bulk partly refused (D21)

The bar states the count, the command is refused for the whole selection, and the reason
names the count that blocks it: `3 of 5 campaigns are not active`. The bar's own
`Select only the 2 eligible` is the way out; it changes the selection visibly, by the
operator's act, and the bar's count updates before the command can run (**AC-961**). A
permission refusal outranks a domain one (**AC-962**).

## Components

| Component | Variant | Tone | Rule |
|---|---|---|---|
| `DataTable` | `mode: 'index'` | — | §3.1–3.3; selection and a bulk bar on `promos` and `incentives` only |
| `Tabs` / `TabsList` / `TabsTrigger` | `segmented` | — | §3.2, D12. Same anatomy in the strip and in the toolbar |
| `StatusBadge` | — | success · warning · neutral | R7, R15. **No red** (R5a) |
| `Money` | — | — | Halalas in, SAR out, in the operator's numerals |
| `Sheet` | side, **no scrim** | — | §5.5 — the row behind stays readable |
| `Button` | `ghost`, `size="xs"` | — | Row lane. Two declared actions is not a kebab (D8) |
| `EmptyState` | `first-run` / `no-match` | — | R8's two kinds |
| `sonner` toast | — | — | R9: one line, names the object, no period, no emoji |

**No shadcn primitive is added.** `Tabs`, `Sheet`, `Button`, `Badge` and `DropdownMenu`
are already in the tree and already restyled; this screen introduces nothing new to
restyle, which is the cheapest possible answer to *"restyle every shadcn component on
arrival"*.

## Copy

Every string below is a key in `src/screens/metrics/growth/copy.ts` with an Arabic entry
in `src/i18n/ar/growth.ts`. No `defaultValue`, no concatenation, no em dash (X14).

| Element | String | Rule |
|---|---|---|
| Tab | `Board` | §3.2, 4-word title budget |
| Tab | `Promos` · `Referrals` · `Incentives` · `Messages` | nouns, not sentences |
| Column | `Code` · `Discount` · `Budget burn` · `New subs` · `Return` · `Expires` · `Status` · `Uses` · `Target` | X18: two words |
| Column | `Referrer` · `Referee` · `Referrer bonus` · `Referee bonus` · `Credited` · `Signal` | |
| Column | `Incentive` · `Condition` · `Reward` · `Earned` · `Total paid` | |
| Column | `Message` · `Segment` · `Channel` · `Recipients` · `Sent` · `Sent by` | |
| Badge | `Active` · `Paused` · `Budget spent` · `Expired` | 2 words |
| Badge | `Shared device` | 2 words |
| Target | `New riders` · `All riders` · `Lapsed subscribers` · `Monthly plan` · `One zone` | keyed enum (X2) |
| Condition | `A package with no missed trip` · `Rating 4.8 or better all package` · `Gold captains` · `Backup captain for three subscriptions` | keyed enum |
| Reward | `{amount} per package` · `{amount}` · `{amount} a week` · `Commission {from} to {to}` | one key each, operands interpolated |
| Segment | `Captains in a zone` · `Packages expiring soon` · `Subscriptions with no backup` · `Documents expiring soon` · `Active subscribers` | keyed enum |
| Channel | `Push` · `SMS` · `In-app` | keyed enum |
| Action | `Pause` · `Resume` · `Activate` · `Deactivate` | verbs, 1 word |
| Search | `Search a code or a target` · `Search a rider` · `Search an incentive` · `Search a message` | |
| Toast | `{code} paused` · `{code} resumed` · `{name} activated` · `{name} paused` | R9, no period |
| Toast | `{count} campaigns paused` | the bulk outcome, and the number is the bar's |
| Refusal | `Your role cannot change a campaign` | §11.2 |
| Refusal | `Your role cannot change an incentive` | §11.2 |
| Bulk refusal | `{count} of {total} campaigns are not active` | D21 names the count |
| Bulk offer | `Select only the {count} eligible` | AC-961 |
| Meta | `{count} campaigns` · `{count} referrals` · `{count} incentives` · `{count} messages` | 6-word meta budget |
| Error | `Couldn't load campaigns. Try again.` (and the three siblings) | imperative, names the fix |
| Sheet | `Campaign` · `Incentive` · `Message` as the sheet's own label | |
| Sheet field | `Target` · `Per rider` · `Expires` · `Spent` · `Budget` · `Uses` | |
| Second line | `Nearly spent` | the 80–99 % burn signal |

## Interaction

| Trigger | Result | Surface (§5.0) | Confirm? |
|---|---|---|---|
| Click a tab | `?view=` replaced, table swaps, selection clears (AC-25), search and filters persist | in place | no |
| Click a promo row | Campaign sheet | drawer, no scrim | no |
| `Pause` on a row | Campaign moves to `Paused`, stays on the list, toast | in place | **yes** — modal. `Pause EYVAR30?` · body: *Riders who try the code from now on are refused. Codes already applied to open bookings are honoured.* · primary `Pause campaign` |
| `Resume` on a row | Campaign moves to `Active`, toast | in place | no — legacy's asymmetry, and it is right: resuming restores a state the operator chose |
| Bulk `Pause` | D21: refused whole if any row is refused; otherwise all pause and one toast states the count | in place | **yes**, same modal with the count |
| Click a referral's rider | The rider's profile | full page | no |
| Click an incentive row | Incentive sheet | drawer, no scrim | no |
| `Deactivate` | Incentive moves to `Paused`, toast | in place | **yes** — `Deactivate perfect package bonus?` · body: *Captains working toward it stop qualifying now. Bonuses already earned are not reversed.* · primary `Deactivate rule` |
| `Activate` | Incentive moves to `Active`, toast | in place | no |
| Click a message row | Message sheet with the full text | drawer, no scrim | no |
| `Export CSV` | The rows in view, same columns, same order | download | no |

**Toast, not banner** (R10): each of these is one completed act with nothing standing
after it. Nothing on this screen raises a page banner.

## Keyboard

| Key | Behaviour |
|---|---|
| `Tab` | Strip → search → filter → columns → sort → export → table → pagination |
| `←` / `→` | Move between tabs inside the strip (Radix roving), `dir`-aware |
| `Enter` / `Space` on a tab | Select it |
| `Enter` on a focused row | Open the sheet, where the view has one |
| `Enter` on a row action | Run it. Row actions are visible without hover (**AC-68**) |
| `Esc` in a sheet | Close it, focus returns to the row |
| `Space` on a row checkbox | Toggle selection |

Every control has a visible `:focus-visible` ring; nothing on this screen sets
`outline-none` without one (§7.2, D20).

## Arabic (§9)

- The strip, the table, the row lane and the pagination all mirror; `ms-`/`me-`/`ps-`/`pe-`
  and `text-start` only.
- **The code cell does not mirror its contents.** `EYVAR30` is a Latin token in an Arabic
  paragraph, so it is wrapped in `<bdi>` and rendered `dir="ltr"` inside; without that the
  digits reorder.
- The burn cell's `84 %` and the return's `1.3×` are numerals beside a bidi-neutral sign,
  so both are isolated the way `CorporateScreen`'s `0 / 40` is (AC-73). `formatRatio` and
  `formatPercent` already emit the right numerals.
- Money is `Money` / `formatMoney`, which places the currency for the language.
- Dates are `formatDate(…, { language })`.
- **`Return` is the header, not `ROI`.** An initialism does not translate, and the Arabic
  glossary has a word for the ratio.
- **`Budget burn`** was checked against `design/20-arabic-glossary.md`'s register: the
  Arabic reads as *consumed budget*, which is what the number is; a literal *burn* does
  not carry.
- Column widths are budgeted at the **Arabic** width (above), so nothing is fitted away
  when the language changes.

## Deviations

| What | Rule suspended | Why |
|---|---|---|
| A fifth tab, `Board`, that renders no table | §3.2's *"saved views over one dataset"* | The strip switches between the board and four datasets, not between four slices of one. `Board` first mirrors the reference's `All` first, and without it the board would be reachable only by editing the address |
| `MetricBoardScreen` gains a `views` slot | the board screen's *"no per-screen file"* | The alternative was a second Growth board, which is the drift that rule exists to prevent. One optional prop, defaulted away on the other seven boards |
| The strip and its table sit **above** the board's chart and chapters | §3.7's *"metric tiles then chart cards"* | The tiles are still first: they are in the band. What moves is the CONTROL, and a control at y = 1663 on an 800px viewport is a control the operator does not have. §3.7 orders content, not chrome |
| One table carries selection and a bulk bar; three do not | §9.4's uniformity | §9.3 gates the checkbox column on a declared bulk command. `promos` declares `Pause`; `incentives` has a row act but no set-shaped one, and `referrals` and `messages` are logs with no act at all, so a checkbox on any of the three would select rows for nothing |
| The row lane renders two direct controls rather than a kebab | — | D8: two declared actions is not a kebab, and only one of the two ever renders on a given row |
| No page primary at all | R3's *one* primary | §8 slot 4c already withholds an action from a board, and the spec puts every creating act out of scope. R3 sets a ceiling, not a floor |
