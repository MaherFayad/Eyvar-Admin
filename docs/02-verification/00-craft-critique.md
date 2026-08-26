# Craft critique — Eyvar Admin, pre-owner gate

**Role:** design critic. Unlike visual-QA (rule conformance) and the reference-match auditor
(pixel deltas against Navattic), this document is allowed to say a thing looks bad, and does.
Every finding names what was seen, why the eye objects, and the specific change.

**Method.** Live app at `http://localhost:5199`, driven with Playwright, screenshots read as
images at 1× and 3× device scale, geometry and computed styles measured in-page rather than
estimated. Rules cited are `DESIGN.md` under `DECISIONS.md` D7.

**Surfaces covered**

| Surface | 1440×900 | 1280×800 | Notes |
|---|---|---|---|
| `/operations/people` — Captains | run | run | |
| `/operations/people` — Applications | run | run | |
| `/operations/people` — Compliance | run | run | |
| `/operations/people` — Riders | run | run | |
| `/management/performance` | run | run | placeholder |
| `/management/zones` (Market & Zones) | run | run | placeholder |
| Loading state | — | run | |
| Error state | run | run | **not reachable by the documented URL** — see Blocking process defect |
| Filtered-to-zero state | — | run | |
| Arabic / RTL | run | run | **direction forced on the DOM** — see F13 |

**Checks NOT run, and why**

- **Arabic string-level checks — not run.** The `ar` dictionary is empty by design (AC-74) and,
  more importantly, *the product has no way to select Arabic at all*: `setLanguage` has zero
  call sites outside `src/shell/qa.copy.test.tsx:59`, `useLanguageState` is called with no
  `initialLanguage` and no store (`ShellContext.tsx:137`), and `persistence.ts` ships no
  storage adapter. Everything under F13 was reached by setting `dir`/`lang` on `<html>` from
  the console. Radix's `DirectionProvider` therefore stayed LTR in those captures, so popover
  side, menu alignment and arrow-key traversal are **not assessed**. Plain-CSS layout is.
- **Motion / transitions — not run.** Judged from stills only.
- **Hover, focus-visible and keyboard traversal — not run.** Out of scope for this pass.

---

## Findings, ranked by what a person notices first

### F1 — Money is amputated mid-digit, and the fix is below the fold `DEFECT`

**What I saw.** Captains at 1440×900, at rest, no interaction. The `Earned (SAR)` column reads
`12,40`, `2,84`, `1,47` — the final glyph is sliced vertically down its middle. The header reads
`Earned`; `(SAR)` is gone. `Last trip` is not on screen at all.

Measured: the table is **1232 px inside a 1070 px scroller — 162 px hidden**. The pinned action
column occupies x 1367–1407 while the `Earned (SAR)` cell spans 1289–1417, so the pin is
*painted on top of* the last 50 px of every money value. The pin has no background fill, no
inline-start border and no shadow, so the digits simply stop.

Every view overflows at 1440: Captains 162 px, Riders 130 px, Compliance 122 px,
Applications 66 px. In Riders the clipped column is `Renewa…` (renewal rate, values 44%, 91%).

**Why it fails.** `12,40` is not an obviously-broken rendering. It is a *plausible wrong number*.
An operator reconciling captain payouts will read it and act on it. Compare `DESIGN.md` §3.1,
which sanctions clipping — but the observed reference clips a **Tags** column, which cannot be
misread. Clipping a currency figure is a different failure class.

Worse, the recovery is invisible. The card is 1171 px tall in a 900 px viewport, so the
horizontal scrollbar that would reveal the money sits roughly 430 px **below the fold**, past all
25 rows. Nothing at the seam says "there is more".

**The rule binds and I side with it** — §3.1 requires horizontal scroll over shrinking columns
below legibility, and that is right. The compliant fix is three parts:

1. Never let a **money or identifier** column be the trailing clipped column. Order columns so
   the trailing edge is occupied by something safely truncatable (`City`, `Last trip`), or drop
   the trailing column at this width the way 1280 already does correctly.
2. Give the pinned action column an **opaque background and an inline-start shadow** so it reads
   as an occluder rather than a paint bug, and add a short gradient fade at the scroll seam.
3. Pin the horizontal scrollbar to the **viewport bottom** of the scroll container, or expose the
   overflow as an affordance at the header row, so it is reachable without scrolling 430 px.

Note 1280×800 is **correct** — it sheds `On time`, `Earned`, `Last trip` cleanly and clips
nothing. The bug is specific to the 1440 breakpoint's column budget.

---

### F2 — The table has no rhythm: six row heights in eight rows `DEFECT`

**What I saw.** Measured row heights, 1440×900:

| View | Row heights (px) |
|---|---|
| Applications | **117, 44, 44, 69, 44, 44, 44, 41** |
| Compliance | **81, 41, 41, 41, 41, 41, 65, 49** |
| Riders | **49, 49, 41, 41, 41, 41, 49, 49, 41, 41, 41, 41, 41** |
| Captains | **65**, then 41 × 24 |

**Why it fails.** This is the single largest contributor to "sloppy". A data table's horizontal
rules are a repeating beat; when the interval changes five times in eight rows the eye reads
damage, not density. It is most violent on Applications, where a 117 px row sits directly above
a 44 px row — a 2.7× jump at the very top of the table, which is the first thing the eye lands on.

`DESIGN.md` §3.1 is self-contradictory here and the build picked the wrong half. The prose says
rows with a two-line primary cell *"grow to fit rather than truncating"*; the **Rules** block says
row height *"MUST be uniform within a table"*. `MUST` wins.

**The change.** Fix the row box at 44 px for one-line identities and 56 px where a two-line
identity cell is in play — and apply the two-line cell to **every** row in that table, not to
whichever rows happen to have a second line. Clamp the identity cell to two lines with an
ellipsis. The 117 px Applications row is a `Decision` cell wrapping to four lines; that cell
should be one line plus a hover/expand, never a paragraph inside a grid.

**Correction to the brief's assumption:** rows are **41 px**, not 64 px. They are tight, not tall.
The two-line identity cell *has* landed — on some rows in Compliance and Riders only. Partial
landing is the problem, not tallness.

---

### F3 — The loading skeleton describes a different table `DEFECT`

**What I saw.** 1280×800, `/operations/people` mid-load. The skeleton's row pitch is **64 px**.
The real table's rows are **41 px**. When data arrives every row shrinks 36%.

At 25 rows that is roughly **575 px of cumulative layout shift** on a normal page load. The
header skeleton also renders 3 bars where the real header has 10 columns, and the body skeleton
renders 7.

Two smaller shifts ride along: `57 captains` has no skeleton and pops in, pushing the card down
28 px; and the top bar's `Mine 2` chip is absent during load, so `On call: unassigned`, the bell
and the avatar all slide horizontally when it appears.

**Why it fails.** A skeleton exists to make loading feel like the page assembling itself. One
that lies about the geometry produces the opposite: content arrives and the page visibly
collapses. This is the first thing the owner sees on every single visit.

**The change.** Derive the skeleton's row height and column count from the same column
definition the table uses, so they cannot diverge. Reserve the subtitle's line box and the
`Mine` chip's width during load.

---

### F4 — The Compliance view is a wall of 51 coloured pills, 33 of which break a MUST `DEFECT`

**What I saw.** Compliance at 1440 renders **51 badges** on one screen. Thirty-three of them are
computed day counts: `405d`, `1,070d`, `928d`, `599d`, `879d`, `260d`, `45d`, `5d`, `13d` and so
on. Green above a threshold, amber below. Five full columns are nothing but pills.

**Why it fails.** Two reasons, and the second is a rule.

*Aesthetically:* colour that is applied to everything signals nothing. The two rows that
genuinely matter — `Expired` documents on `DRV-0202` and `DRV-0104` — do not pop, because they
sit in a field of forty-nine other coloured chips. The eye has nowhere to land. `1,070d` gets the
same visual weight as `5d`.

*By rule:* `DESIGN.md` §3.4 Rules — **"Derived, computed, or descriptive values MUST be plain
text — never a badge"** and **"A value MUST be a badge only if it is a lifecycle state the user
can act on or change."** A remaining-days count is derived. Thirty-three MUST violations on one
screen.

**The change.** Day counts become **plain text**, right-aligned, in the default body colour. The
one case that needs signal — a licence expiring inside the alert window — takes the **critical
text tone**, which §3.4 already prescribes for numeric values carrying a risk reading
(*"a low stock count SHOULD take the critical text tone"*). That drops the screen from 51
coloured elements to about 8, and the two expired records become the loudest things on the page,
which is exactly right.

---

### F5 — `Approved` is green in one column and grey in the next, in the same row `DEFECT`

**What I saw.** Applications, row `APP-2203`. The `Status` cell renders `Approved` as
`bg #E7F6EC / text #15653C` (success). The `Decision` cell, roughly 700 px to the right in the
same row, renders `Approved` as `bg #F6F8F9 / text #6B7280` (neutral). Same word, same record,
two colours, one glance apart.

**Why it fails.** `DESIGN.md` §3.4 Rules: **"Every status MUST map to exactly one tone
product-wide; the same label MUST NOT change tone between screens."** The build breaks it inside
a single row, which is the most visible place it could.

To a reader this looks like a bug even before they can name it — the brain flags the mismatch
before it parses the words.

**The change.** The `Decision` column is not a status; it is a **record of what happened and who
did it**. Drop the badge entirely and render it as plain text: `Approved by Yousef Al-Balawi ·
24 Jun 11:20`. That removes the duplicate word, removes the tone conflict, and fixes F6 below at
the same time.

---

### F6 — Churn risk renders `Low / Medium / High` as badges, and High and Medium are the identical colour `DEFECT`

**What I saw.** Riders. `High` computes to `bg #FFF4E6 / text #7A3E12`. `Medium` computes to
`bg #FFF4E6 / text #7A3E12`. **Byte-identical.** A three-level risk scale in which the two worst
levels are visually indistinguishable.

**Why it fails.** `DESIGN.md` §3.4 states it in as many words: **"Not a badge: graded risk. Fraud
analysis renders `Low / Medium / High` as a…"** — the rule names this exact scale. The identical
colour is not a token bug; it is the symptom of forcing an **ordinal** scale into a **closed
five-tone status palette** where R7/R17 correctly permit only one warning tone.

**Here the rule is right and the build ignored it.** R7 and R17 should not be widened.

**The change.** Churn risk stops being a badge. Two compliant options, both better looking:

- **Preferred:** a three-segment meter (three 8 px ticks, filled to level) plus the word, in body
  text colour. Ordinal, scannable, colourless, sortable by eye down the column.
- **Simpler:** plain text with weight contrast — `High` at 600 in `--primary`, `Medium` and `Low`
  at 400 in `--muted-foreground`. Zero new colour, and the high-risk riders finally stand out.

---

### F7 — The non-interactive badge is outlined more strongly than the button beside it `DEFECT`

**What I saw.** Applications, row `APP-2205`, measured:

| Element | Size | Border | Text | Radius | Weight |
|---|---|---|---|---|---|
| `Pending` **badge** | 58 × 20 | **1 px `#171A21`** (near-black) | `#1B51C4` blue | 8 px | 600 |
| `Approve` **button** | 62 × 24 | **1 px `#F0F2F4`** (1.14:1 on white) | `#171A21` | 8 px | 500 |

**Why it fails.** The affordance is exactly inverted. The thing you *cannot* click has a crisp
black outline; the thing you *must* click has a border at 1.14:1 contrast that all but
disappears. Same radius, same font size, 4 px apart in height. Scanning the row, `Pending`,
`Approve` and `Reject` read as three buttons of which the leftmost is the most prominent.

In the same column, `In review` is a *filled* blue pill and `Approved` is a *filled* green pill.
Four badge constructions in one column of eight rows.

**The `new` outline tone is ratified** (`badge.tsx`: `border-primary bg-transparent
text-info-foreground`, added specifically so R7's five tones survive without a sixth fill). I
side with keeping it. But its execution can be fixed without touching R7:

1. Match the outline to the text — border `--info`, not `--primary`. It stops matching the
   neutral button border.
2. Drop the badge to **18 px** so it can never be mistaken for a 24 px control.
3. Raise the row buttons' border from `--border` `#F0F2F4` to `--input` `#DDE0E4`, so the
   interactive element is at least as defined as the static one.

---

### F8 — The screen has no primary action, so the eye has nowhere to land `DEFECT (hierarchy)`

**What I saw.** Five-second test on Captains at 1440. The eye goes to the **column of 25
identical green `Active` badges**. That is the loudest thing on the page, and it carries zero
information — every visible captain is active.

The page header band is 1072 × 73 px and **93% empty**: `People` (73 px wide) and `57 captains`
sit at the far left, and nothing occupies the remaining 970 px. There is no primary button on
the screen at all. The toolbar is four secondary buttons of equal weight — `Search`, `Filter`,
`Columns`, `Sort` — none of which is what the operator came to do.

**Why it fails.** A screen with no primary action has no focal point, so the strongest *visual*
element becomes the focal point by default, and here that is decoration. It is also why the page
reads as "a table someone put a header on" rather than a designed screen.

**The change.** Put the module's real primary action in the page header's empty right side —
whatever `People` is *for* (`Add captain`, `Invite`, `Export`). If genuinely no create action
exists at this level, the header's right side should carry the thing an ops lead actually needs:
the breached-SLA count as a filter chip, or the last-refreshed time. Something must own the
right end of that band.

Second, **retire the all-`Active` badge column**. §3.4 permits a lifecycle badge, but a column in
which 25 of 25 values are identical is not communicating a lifecycle, it is drawing 25 green
rectangles. Show the badge only for non-default states and leave `Active` rows blank, or move
status to a filter.

---

### F9 — Four different left edges in the top 250 px `DEFECT (alignment)`

**What I saw.** Measured x-coordinates down the left edge of the content column at 1440:

| Element | x |
|---|---|
| `People` (h1) | **336** |
| Card border | **336** |
| `Captains` tab label | **349** |
| Row checkbox | **349** |
| `Captain` column header text | **389** |
| Captain name text | **389** |

**Why it fails.** Misalignment is the most common source of "sloppy", and this is the textbook
case: three distinct left starts stacked vertically within 100 px, none of them wrong on its own.
The 13 px step from the h1 to the tab is the visible one — the page title hangs to the left of
everything under it by just enough to read as an accident rather than an indent.

**The change.** Pick **one** inner rail for the card and hold it. Either the tabs and the
checkbox column both start flush at the card edge (so 336 / 336 / 336), or the card gets a
16 px inner gutter and the h1 is inset to match. The `Captain` header at 389 is fine — it is the
*second* column and is allowed its own register.

---

### F10 — Error and empty are visually the same state, and neither has a button `DEFECT`

**What I saw.**

*Error* (reached by rigging `mockFailures.always('drivers.list')` in-page): a 1072 × 130 card
containing two centred lines — `Couldn't load captains.` in grey, and `Try again` in bold black
text with **no border, no fill, no icon**. No error glyph, no colour, no reason, no request id.
The `57 captains` subtitle disappears, so the whole card jumps up 28 px on failure and back down
on retry. The toolbar stays fully enabled over a table with no data.

*Filtered-to-zero:* an identical construction — `No captains match these filters.` in grey, and
`Clear all filters` in bold black text with no chrome.

**Why it fails.** These are two very different situations — *the system broke* versus *your query
was too narrow* — and they are rendered identically. The owner, who has seen more of these than
of anything else, has no way to tell "retry" from "widen your search" except by reading.

And `Try again` does not look like a button. It looks like the second sentence of the message,
set in bold. It is the only action in the state.

Separately, the copy says **"filters"** after the user typed in a **search** box. Wrong noun.

**Credit where due:** the filtered-to-zero state is otherwise **§3.6-compliant** — no
illustration, a clear-filters affordance, and it correctly does *not* show the first-run
illustrated state. That rule was followed and it was the right call.

**The change.** `Try again` and `Clear all filters` become real secondary buttons (32 px,
`--input` border) — the same control the toolbar uses, so they are recognisable. Give the error
state an inline critical glyph and a second line carrying the reason and request id. Reserve the
subtitle's line box so neither state moves the card. Disable the toolbar's `Filter`/`Sort` when
there is no data to act on — §3.6 says page actions that cannot work MUST be disabled and
visible, and the same logic applies here.

---

### F11 — Applications: three action affordances at three weights on one row, one of which overlaps its column `DEFECT`

**What I saw.** One Applications row carries, left to right: a badge (`Pending`), a badge
(`Unclaimed`), a bare text button (`Claim`), two bordered buttons (`Approve`, `Reject`), and a
kebab (`...`). Six interactive-looking elements in a 44 px row, at four different visual weights.

`Unclaimed  Claim` and `Yousef Al-Balawi  Take over` sit 8 px apart with no separator, so each
pair reads as one phrase. On `APP-2204` the pair **overflows its own cell by 31 px** (measured:
content 182 px in a 151 px cell) and `Take over` crosses the vertical column rule into the
`Decision` column.

In the `Decision` cell of `APP-2203`, the timestamp wraps mid-value across two lines as `24` /
`11:20` — a date broken by a line break.

**Why it fails.** Text buttons with no boundary next to bordered buttons next to badges means
nothing on the row tells you what is clickable by *looking*. The column-rule crossing is the kind
of detail that reads as broken software.

**The change.** One action weight per row: `Claim` / `Take over` / `Release` become the same
bordered 24 px control as `Approve` / `Reject`, or all of them collapse into the kebab and the
row keeps only the single most likely action. Separate the owner *fact* from the owner *action*
with a fixed-width column boundary, and set the `Decision` timestamp `white-space: nowrap`.

---

### F12 — The SLA gauge has an invisible track, so it reads as a stray underline `DEFECT (craft)`

**What I saw.** Under each SLA badge sits a 3 px bar. Measured: every track is **80 px wide** —
they *are* consistent, which corrects my first impression. But the track colour is `#F6F8F9`,
which is **1.03:1 against white**. Invisible.

**Why it fails.** With no visible track, a 30%-elapsed fill and a 100%-overdue fill look like
two underlines of *different lengths* rather than one scale read twice. The gauge cannot be read
as a gauge. On the overdue rows the fill is a dark maroon that matches neither the amber badge
above it nor anything else on the screen, and it floats 6 px below the badge with nothing tying
the two together.

**The change.** Track to `--input` `#DDE0E4` (1.36:1 — still quiet, but present), fill to the
badge's own foreground colour so the pair reads as one object, and close the gap so the bar sits
directly under the badge and matches its width.

---

### F13 — Arabic: unreachable, and broken where it can be forced `DEFECT`

**Reached by setting `dir="rtl"` and `lang="ar"` on `<html>` from the console. Radix's
`DirectionProvider` stayed LTR, so overlay geometry is not assessed.**

**The product cannot reach Arabic at all.** No language control exists anywhere in the shell —
`setLanguage` has zero production call sites, `useLanguageState` receives no `initialLanguage`
and no store, and there is no `localStorage` adapter. The RTL work is unreachable by any user
action. That is the headline: an admin for a Saudi operator ships with no way to switch to Arabic.

What forced RTL shows, at the level I can honestly assess:

- **The clipping of F1 mirrors — and gets more dangerous.** The `Trips` column reads `284`, `L2`,
  `L3`, `57` — `1,284` has lost its **leading** digit, `412` has been sliced into something that
  looks like `L2`. In Arabic the amputation hits the most significant digits. At 1440 RTL the
  `Earned (SAR)` header is clipped down to a lone `)`.
- **At 1280 RTL the `Mine 2` chip overlaps the global search field.** Measured: chip 237–305,
  search field 268–668 — a 37 px collision, with the `⌘K` hint occluded behind the chip. Does
  **not** occur at 1440 RTL (chip 237–305, field 348–748). Both are plain flex children with no
  Radix involvement, so this is real CSS, not an artifact of the forced direction.
- **`⌘K` mirrors to `K ⌘`.** A key sequence is a literal, not prose; it must be bidi-isolated and
  stay `⌘K` in both directions. `TopBar.tsx` already has a `mirrorGlyph` mechanism for exactly
  this class of problem; the kbd hint is not using it.
- **Arabic leading is too tight.** Noto Naskh Arabic shares Inter's 20 px line box. In the
  three-line name cell the descenders of line 1 nearly touch line 2. Arabic needs more leading
  than Latin at the same size — the `:root:lang(ar)` geometry hook exists and should carry a
  larger table-cell `line-height`.

**Correct in RTL, and worth saying:** the rail moves to the inline-end side, nav count chips move
to the inline-end of their labels, the search magnifier moves to the leading edge, Latin numerals
are preserved (`ar-SA-u-nu-latn`), and Arabic names shape and join correctly. A grep over
`src/**/*.tsx` finds **zero physical direction utilities** — no `left-`, `right-`, `ml-`, `pl-`,
`border-l-`, `text-left`. The logical-property discipline is real and it works.

**The change.** Ship the language control. Then re-audit RTL properly through the product path,
with `DirectionProvider` live — everything above should be treated as provisional until then.

---

### F14 — The placeholder screens use the wrong one of the two documented empty patterns `DEFECT`

**What I saw.** `/management/performance` and `/management/zones` each render a **1072 × 49 px
full-width bordered box** containing one grey sentence, left-aligned at the far left:
`Performance is being built.` The box draws a 1072 px rectangle around 180 px of text. Below it,
750 px of nothing.

**Why it fails.** §3.6 documents *two* patterns and the build picked the wrong one. The
**empty card / section** pattern — one grey sentence, no heading, no illustration — is correct
*for a section inside a populated page*. A page whose **entire body** is empty is a
**whole-page empty state**, which §3.6 requires to carry an illustration, a heading that states
the value of the feature, an explanation under roughly 380 px, and an action.

The copy is also a developer status message, not product copy. `Performance is being built.`
tells the owner nothing about what it will do or when.

**Where emptiness is the cause rather than design:** the vast lower two-thirds of these screens
and the 700 px of unused sub-tab column are *content absence*, and I am not marking them as
design failures. The frame itself — rail, nav column, top bar, page header, 32 px gutters — holds
up fine with nothing in it, which is a genuine strength. The failure is specifically the
**full-width bordered stripe**, which is a design choice and a bad one.

**The change.** Centre the block in the card body. Heading that names the value
(`See how the fleet is performing`), one sentence of explanation, and either a disabled primary
action or a link to the nearest working screen. If no illustration asset exists yet, drop the
container border entirely and centre the two lines — a centred sentence on white is far better
than a sentence in a 1072 px box.

---

### F15 — Four toolbar icons at three apparent weights `DEFECT (craft)`

**What I saw.** At 3× on the toolbar: the **Search** magnifier is a light 1.5 px circle and stem;
**Filter** is three heavy horizontal bars (which is the conventional *sort* glyph, not a filter
glyph); **Columns** is a dense rectangle with two internal dividers that reads almost as a filled
block and is visually darker than the label beside it; **Sort** is two thin long-stemmed arrows.

The same disagreement runs through the rail: the `Exec` chart is a thin outline, `Ops` is the
only **dashed-stroke** glyph in the product, `Finance` is a noticeably heavy `$`, and `Support` is
a headset with a near-filled blob.

**Why it fails.** Icon weight is read pre-attentively. A row of controls in which one glyph is
visibly darker than its neighbours makes the set look assembled from different libraries, which
is precisely the "parts, not one product" impression.

**The change.** One stroke weight across the icon set (1.5 px at 16 px), one construction
(outline only — no dashed strokes, no filled blobs), and swap the `Filter` glyph for a funnel or
sliders so it stops reading as "sort" while sitting next to an actual sort control.

---

### F16 — Rail count badges collide with their icons; the bell's count is not a badge at all `DEFECT (craft)`

**What I saw.** In the rail, the `35` chip **touches** the `Ops` target glyph — there is no gap.
On the active item it is a white pill with a border sitting inside a grey pill: a nested
container. The icon-plus-badge cluster's optical centre falls to the right of the label below it,
so every rail item is slightly off-axis.

Meanwhile the notification count is a **bare numeral `6`** floating at the bell's top-right,
unenclosed, with its cap-height nearly touching the top bar's edge. The nav uses pills for counts.
The rail uses pills for counts. The bell uses a naked digit. Three treatments, one concept.

**The change.** Offset the rail badge as a true corner badge with a 2 px gap and a ring in the
surface colour so it never touches the glyph, and keep the item's optical centre on the label's
axis. Give the bell the same pill the other counts use.

---

### F17 — The card that holds everything is invisible `DEFECT`

**What I saw.** Measured: `body` background `#FFFFFF`. Card background **transparent** (so also
white). Card `box-shadow` **fully transparent on all five layers**. Card border `#F0F2F4` —
**1.14:1** against white.

**Why it fails.** §3.1 requires the index table to be *"one card, not a bare `<table>`"* — the
tab bar, filter row, header, rows and bulk bar all inside one rounded white container. The build
satisfies this structurally and then makes the container imperceptible. There is nothing to
distinguish "inside the card" from "the page", so the table reads as floating, and the tab bar
appears to belong to the page rather than to the table.

This is a large part of why the screen reads as parts assembled rather than one object.

**The change.** Give the page ground a tint (the surfaces below `--card` already exist —
`#F6F8F9` is in the palette) so the white card has something to sit on, **or** raise the card
border to `--input` `#DDE0E4`. The first is better looking and matches the reference; the second
is one token change.

---

### F18 — The suggestion panel is wider than the field it belongs to `DEFECT (craft)`

**What I saw.** Typing in the global search opens a suggestion panel spanning x 592–1072 under an
input spanning x 592–992. The panel is **80 px wider than its anchor**, overhanging on the
trailing side only, and it covers the `People` page title.

**The change.** Match the panel's width to the anchor exactly.

---

### F19 — The row-critical marker leaves a 1 px notch `DEFECT (craft, minor)`

**What I saw.** `RowCriticalMarker` measures **3 × 43 px in a 44 px row** — `inset-y-0` resolves
inside the row's content box, so the marker stops 1 px short of the row rule and leaves a white
nick at the bottom of every breached row.

**The rule is right and I side with it.** General frontend-craft doctrine bans coloured
side-stripes outright, but `DESIGN.md` R5a deliberately makes this the *only* per-row criticality
carrier precisely so that R7's five badge tones need no red, and it is implemented with a logical
`start-0` so it mirrors. That reasoning is sound and the stripe should stay.

**The change.** Extend the marker to cover the row's border-bottom, or move it to the `<td>` so
it spans the full 44 px.

**Correcting my own first impression:** I initially read the two markers as *different lengths*.
Measured, both are 43 px. They are consistent. Only the 1 px notch is real.

---

### F20 — Preferences, labelled as such `PREFERENCE`

These are opinions, not defects. Stated so they are on the record, not so they are actioned
before the defects above.

1. **Ten disclosure chevrons in the header row is permanent clutter.** Every column header
   carries a `v` at rest, and because they mirror by alignment, `Status v` and `v Rating` place
   two chevrons 40 px apart pointing at nothing across a column rule. I would show the chevron on
   hover and focus only, and keep the sort arrow permanent on the sorted column. I recognise this
   costs discoverability, which is why it is a preference and not a finding.
2. **The sorted column header is bold and near-black** while §3.1 says header labels are
   *"small, subdued, non-bold"*. The sort arrow already carries the signal; the weight change is
   redundant and makes one word in the header row look like a mistake.
3. **Opening the view search replaces the entire tab row**, so `Applications`, `Compliance` and
   `Riders` vanish while searching. **This is the ratified reference behaviour** (§3.2: *"Clicking
   the magnifier replaces the tab row with a full-width search field"*) and I side with the rule.
   I still think losing view navigation mid-search is a poor trade on a 1440 px desktop where
   there is ample room for both, and would raise it with whoever owns §3.2.
4. **`On call: unassigned` uses the warning brown** in the top bar. It is the same `#7A3E12` as
   `overdue 1d 16h` and as the owner-name chip on Applications — three unrelated meanings, one
   colour, one screen. Combined with the identical pill shape shared with `Mine 2` (a filter), the
   operator cannot tell which of the two chips is clickable.
5. **A negative wallet balance (`-41.50`) gets no treatment.** It is the one number on the Riders
   screen an ops person needs to spot, rendered exactly like `0.00`. §3.4's critical **text** tone
   would cover it without adding a badge.

---

## What is genuinely good

Stated because a manufactured finding costs more than a missing one, and because these should
not be "fixed".

- **Logical properties are clean.** Zero physical direction utilities in `src/**/*.tsx`. The RTL
  mirroring of the rail, nav chips and search affordance all falls out correctly. This is the
  hardest thing on the list to retrofit and it was done properly.
- **Radii agree.** The entire main region uses exactly **two** radii, `8px` and `4px`. No drift.
- **One type stack, correctly composed.** `Inter Variable` with `Noto Naskh Arabic Variable`
  layered in the same declaration — Arabic names shape, join and render correctly inside an
  otherwise Latin table. Latin numerals are preserved under `ar-SA-u-nu-latn`, which is right for
  Saudi ops.
- **The 1280 breakpoint is correct.** It sheds three columns cleanly and clips nothing. The 1440
  bug of F1 is a column-budget error at one width, not a broken responsive system.
- **Header typography is right.** 12 px / 500 grey headers against 14 px near-black body — small,
  subdued, exactly what §3.1 asks for.
- **The filtered-to-zero state follows the correct rule**, including not falling back to a
  first-run illustrated empty state.
- **Badge geometry is executed to spec** — 8 px radius, 20 px tall, 11 px / 600, never a stadium.
  The problem is *where* badges are used, never how they are drawn.
- **The frame survives emptiness.** The rail, nav column, top bar and 32 px gutters hold their
  proportions on a page with one sentence of content. That is not nothing.
- **The error state keeps the tab bar live**, so a failed view does not trap the operator.

---

## Blocking process defect

**`?mockFail=drivers.list` is dead. It was reported dead before and it is still dead.**

`seedMockFailuresFromLocation` is **exported** from `src/data/clients/index.ts:32` and **called
from nowhere in production code** — the only reference outside `config.ts` is
`src/data/clients/seam.test.ts:83`. Its own doc comment says *"Call once at boot, before the
first render, from the app entry point"*; `src/main.tsx` does not call it, and neither does
`App.tsx`.

Navigating to `/operations/people?mockFail=drivers.list` loads the table normally with all 57
captains. I reached the error state instead by importing the client module in-page and calling
`mockFailures.always('drivers.list')` before navigating.

This is more serious than any single visual finding, because it is the mechanism by which the
error state is supposed to be reviewable at all. One line in `main.tsx` restores it.

---

## Verdict

**Not ready. Do not put this in front of the owner for real work yet.**

The frame, the tokens, the type stack, the RTL discipline and the badge *geometry* are all
sound — this is not a bad foundation, and the owner's "so bad and sloppy" is not a verdict on
the architecture. It is a verdict on the table, and the table is where the entire product
currently lives.

Three things stand between this and yes:

1. **Stop amputating numbers (F1).** An operator reading `12,40` where the truth is `12,400.50`
   is a correctness failure wearing a layout bug's clothes, and the scrollbar that would fix it
   is 430 px below the fold. In Arabic it eats the leading digits instead. Nothing else on this
   list can be shipped past.

2. **Give the table one row height and one loading geometry (F2, F3).** Six row heights in eight
   rows, plus a skeleton that is 64 px against a real 41 px, is precisely what "sloppy" means when
   someone cannot name it. Fix the row box, apply the two-line identity cell to every row or to
   none, and derive the skeleton from the same column definition the table uses.

3. **Spend colour once per screen instead of forty times (F4, F5, F6, F8).** Thirty-three
   computed day counts as badges, `Approved` in two tones inside one row, `High` and `Medium`
   byte-identical, and twenty-five green `Active` pills that all say the same thing. `DESIGN.md`
   §3.4 already forbids every one of these; following the rules the project already wrote is the
   whole fix, and it will do more for how this looks than any new design work.

Fix those three and the screen goes from "ugly" to "quiet and correct". F7, F9, F10 and F14 are
the next tier and are each an hour's work. Nothing in this document requires a redesign.
