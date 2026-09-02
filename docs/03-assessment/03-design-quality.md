# 03 — Design quality: is Eyvar Admin actually good?

**Method.** `npx vite --port 5305`, then Playwright drove every one of the 35 sub-tab routes plus
5 detail routes, at **1512×900 and 1280×800**, in **`dir="ltr"` and `dir="rtl"`**, with interaction
states captured (command palette, row peek, bulk-selection bar, filter popover, column popover, row
overflow menu). Every screenshot was looked at. Layout numbers in this document are **measured from
the running DOM**, not estimated: bounding-box intersections, `scrollWidth` vs `clientWidth`,
computed colour and font-size per table cell. Reference comparison is against
`docs/06-design-reference/shopify-admin-web/` (159 captures) — the Mobbin MCP was not available in
this session, so every external comparison below cites a file in that corpus that I opened.

This is not a conformance audit. The product passes its own rules. The question is whether it is
good.

---

## 1. The verdict

**Eyvar Admin reads as forty screens that obey the same rules, not as one designed system — and the
gap between those two things is exactly what the owner is feeling when he says the experience isn't
good.**

The rulebook worked. Tokens are clean, the tone palette is closed, numbers are `tabular-nums` and
right-aligned in 82 places, absence is handled better than in most shipping products (`MetricTile`
says *why* a value is missing and suppresses a meaningless delta; the bulk bar explains *why*
`Reinstate` is disabled). None of that is in question.

What is missing is the layer above rules. Three things, and they are the whole diagnosis:

**1.1 — There is no middle of the type ramp, so nothing composes.**
The Latin ramp is `11 / 12 / 14 / 16 / 17 / 22`. On a real index page the *only* sizes that appear
are **22px once (the H1), then 14px × 209, 12px × 64, 11px × 26** — measured on
`/operations/people`. `16` and `17` are dead steps. That means **every card title, every section
heading, every table cell and every helper sentence is the same 14px**. A page therefore has exactly
two levels: the title, and everything else. You cannot build a hierarchy out of two levels, and no
amount of colour or weight will rescue it. `15-hierarchy-and-scannability.md` diagnosed the *bottom*
of the ramp correctly and fixed it — `text-sm` is now dominant, which is real progress — but it never
reclaimed the *top*. There is no card-title step. That single missing step is the largest aesthetic
deficit in the product.

**1.2 — Nobody drew the 1280 case, and 1280 is the declared viewport.**
This is the finding I would act on first. Measured leaf-text bounding-box collisions in `<main>`:

| | at 1512 | at 1280 |
|---|---|---|
| Total text collisions across 35 screens | **~70** | **~285** |
| Screens with a horizontally clipped container | **18 / 35** | **25 / 35** |
| Worst single screen | zones (23) | **disputes (101)**, communications (34), subscriptions (28), payouts (24), trips (20), fairness (19), contact-centre (17) |

And on **every screen in the product at 1280**, the top bar collides with itself: the search field's
box runs `592→992` and the `Mine 2` pill runs `967→1032`. **25px of overlap, on all 40 screens, at
the one width the product committed to.** The `flex-1` right group is `justify-end` but its children
overflow its start edge because the search is a fixed `w-100`.

The grounding says the viewport is fixed at 1280 with no second breakpoint. Fine — but that decision
was made and then the design work was done at a wider window. The one width you promised to support
is the one that was not designed.

**1.3 — The correct answer already exists inside the product, one tab away from the wrong one.**
This is the strongest evidence that the system is not yet a system.

- `/operations/people` prints a green **`Active`** badge on **9 of 10 visible rows**. A column where
  90 % of the values are identical is a column of decoration.
- `/operations/assurance`, the very next item in the same rail, prints **`On track` as plain grey
  text** and reserves the amber badge for `Rider not confirmed` / `Captain unavailable`. Normal state
  = no ink. Exception = badge. That is correct, and it is right there.
- `/management/reports` puts **`Open` and `Delete` as two equal outline buttons on every row** — 14
  buttons, a destructive one among them, unguarded. Every other index table in the product uses a
  `…` overflow menu.
- `/financials/overview` uses **1 SVG** on the whole page and is the best-looking board in the
  product. `/management/overview` uses **27** and `/operations/dispatch` uses **25**.

Nobody chose between these. Both were legal, so both shipped. That is what a rulebook produces on
its own, and it is why the product feels assembled rather than authored.

**The good news:** the ceiling is high. The peek drawer, the Requests deadline column, the Financials
Overview sectioning and the ticket call guide are better than most shipping ops consoles. The
distance from where it is to where it should be is a week of *deciding*, not a rebuild.

---

## 2. The three screens that are genuinely good

### 2.1 Operations → Requests (`/operations/requests`)

**What I saw at 1512.** Page header `Requests / 6 requests`. Then a pale-red banner:
*"3 requests are past their deadline."* with a single ghost button `Show only past deadline`. Then
the view chips, then a 7-column table. The first two rows carry a **3px red inline-start edge marker
and a pale rose row ground**. Their Deadline cell reads **`overdue 4d 22h`** in a small amber chip
with a **thin dark progress rule underneath it, filled to 100 %**; the rows below read `2m left`,
`3m left`, `31m left` with the same rule filled proportionally.

**Why it is good.** Three separate things do one job. The banner *counts* the problem and hands you a
filter — an alarm with a verb attached. The row marker says *which*. The micro-rule under the
countdown says *how badly*, in a form you read without reading. And it survives the constraints
honestly: no red badge (R7 holds), colour is never the only carrier (the words `overdue 4d 22h` say
it), and it degrades to text under `prefers-reduced-motion` because there is no motion in it.
Compare `shopify-admin-web/02-orders/orders-list-with-metrics-row.webp`: Shopify's `Payment pending`
/ `Unfulfilled` chips carry state but nothing carries *urgency*. Eyvar's deadline column is better
than the reference.

**Its two flaws, so this doesn't read as a whitewash.** (a) The view-chip strip is one control
carrying **two orthogonal axes** — `All · Instant · Subscription` (type) and `Pending · Assigned ·
Expired` (state) — with no separator, so `Instant` and `Pending` look like alternatives when they can
both be true. Split into two controls or insert a divider. (b) Four interactive targets per row
(`Claim`, `Assign`, `Close`, checkbox) plus a clickable row. The `Decision` cell truncates to
`Reem Al… — waiting for …`, which is worse than showing nothing.

### 2.2 Financials → Overview (`/financials/overview`)

**What I saw.** A pale-amber standing banner (*"12 postings were refused."* + `Read refused
postings`), a month stepper, then **three named sections**: **`The period`** — 6 tiles, each a large
`4,432.52 SAR` over a label; **`Where the money is held`** — 5 tiles; **`What was given back`** — a
plain label/amount list.

**Why it is good.** The section headings are doing *conceptual* work, not decorative work. "The
period" is a flow; "Where the money is held" is a balance at a point in time. That is a real
accounting distinction and the layout is the thing that expresses it — no tooltip, no glossary. The
tiles carry **no icon, no delta chip, no sparkline**: value, label, basis. It is the quietest board
in the product and by a distance the most confident-looking one. It is direct proof that the icons on
the other boards are subtracting.

**Its flaw.** *"Period 1 Jun to 30 Jun"* is repeated on all six tiles in section one and *"Balance to
date, outside the period."* on all five in section two. **Eleven repetitions of a fact the section
heading already made.** See §5.

### 2.3 Support → Ticket detail (`/support/tickets/TKT-501`)

**What I saw.** Main + rail. The main column opens with a card headed **`CALL GUIDE — FARE DISPUTE /
MULTIPLIER QUESTION`**, containing **`What to say`** (the sentence sitting in its own tinted quote
box, ready to be read aloud), **`What to do`** (the procedure), and **`Policy POL-FIN-04 §3`** in
mono. Below it, `Conversation`, with the customer's message in a pale green bubble and a reply
composer with `Log a call` / `Send reply` and the disabled reason *"Write something before sending."*
Rail: `FIRST REPLY` (clock state, due time, `Open 69d 4h`), `TICKET` (status, priority, reason code
with its machine key under the human label, owner, `Claim`), `REQUESTER` (`Open 360° profile`).

**Why it is good.** This is the only screen in the product that shows evidence of somebody thinking
about the *person doing the job* rather than the data model. A support agent on a call needs a script,
and this hands them one. `reason_code` shown as **`Rider disputes the fare`** with `fare_dispute`
beneath it in mono is exactly the right treatment for a value that is both human and machine.

**Its flaw.** Two heading systems on one screen: rail cards use 11px uppercase letter-spaced
(`FIRST REPLY`, `TICKET`), the main card uses 14px sentence case (`Conversation`). Pick one. And
there is no timeline (see §4.2).

**Honourable mention — and it is really the best surface in the product: the peek drawer.**
Clicking a row on `/operations/people` opens a 480px inline-start-hairlined drawer at
`?entity=DRV-0101`, **with no scrim**, so the table stays readable behind it. Header: `Ahmed Salem` /
`Corolla 2022 · White`. Then a label/value list — **labels 12px grey on the leading side, values 14px
ink on the trailing side** — which is the emphasis-tier discipline of `15-hierarchy…` §2.3 actually
implemented, and it is the clearest reading surface in the whole app. Footer link `Open full
profile`. Two fixes: eight *collapsed* accordions is 350px of chrome and eight clicks; open the top
two. And the sections are the ones an engineer would name (`Movement`, `Device`), not the ones an
operator would ask for.

---

## 3. The five weakest screens, with a redesign for each

### 3.1 Support → Tickets (`/support/tickets`) — **the worst screen in the product**

**What I saw at 1512.** The view-chip strip is **clipped at both ends simultaneously**: it reads
`)pen · In progress · Waiting · Resolved · By reason cod` — the *default, selected* tab is cut in
half. The column header row is clipped too: `Opene`. Three data rows sit in a bordered box that is
**850px tall** — 333px of empty white inside a visible border. Each row: `Subject` truncated at
`Captain did not arrive for schedule…`; `Category` showing `Assurance` over a *second* truncated copy
of the subject; `Status` showing an amber `Open` badge with `Nobody has taken…` clipped beneath it;
and the trailing cell showing a ghost `Claim` button **overlapping the `Opened` date `25 Jur`**, with
the disabled reason `Sarah Al-Rashid already owns this…` wrapped inside it, pushing the row to
**77px**. Three amber badges per row (`Critical`/`High`, `Open`, `Breached`).

Eight columns. Three rows. Everything truncated. That is not a data-density problem, it is a column
allocation that was never looked at.

**Redesign.**

```
┌─ Tickets ─────────────────────────────── 3 open · 1 breached ──┐
│                                                                 │
│  [Open] In progress  Waiting  Resolved      ⌕ search  ⚙ Filter │   ← chips wrap, never scroll
├─────────────────────────────────────────────────────────────────┤
│ ▎ Captain did not arrive for scheduled pickup      Breached  ⋯ │   ← 15px/500 ink. THE SUBJECT
│   TKT-503 · Assurance · Fahad Al-Shehri · RDR-1043             │   ← 12px meta, one line, no wrap
│   Critical · owned by Sarah Al-Rashid · opened 25 Jun 08:14    │
├─────────────────────────────────────────────────────────────────┤
│   Fare calculation discrepancy on surge trip       No clock  ⋯ │
│   TKT-501 · Billing · Mohammed Al-Ghamdi · RDR-1041            │
│   High · unclaimed · opened 25 Jun 07:14              [Claim]  │
└─────────────────────────────────────────────────────────────────┘
```

- **Stop making this a table.** A ticket queue has one thing you scan (the subject) and a pile of
  metadata. Eight columns force the subject into 210px. A **three-line row** gives it 700px and
  removes every truncation on the page. Shopify does exactly this on
  `shopify-admin-web/02-orders/order-detail-timeline-full-history.webp`, where a log entry is a line
  of prose, not a row of cells.
- **Weight goes to the subject, at the new 16px/500 step** (§6.1). Everything else drops to 12px meta.
- **One badge per row, on the right edge: the SLA clock only.** `Breached` (warning) or `No clock`
  (neutral). Delete the `Open` badge — status is already the tab you are standing in. Delete the
  `Critical`/`High` badge; severity becomes the first word of the meta line, and severity ordering is
  carried by the default sort, which is what an operator actually uses it for.
- **Claim moves inline as a single ghost button on unclaimed rows**; owned rows say `owned by Sarah
  Al-Rashid` as text. No disabled button, no wrapped tooltip inside a cell, no row-height variance.
- **The container hugs its content.** Three rows = three rows tall, then the count line. Never an
  empty bordered box.
- The view chips **wrap to a second line** rather than scrolling. A control whose selected item can
  be scrolled out of sight is not a control.

### 3.2 Admin → Operational Policy (`/admin/policy`) — 8,916px of unbroken scroll

**What I saw.** One column, **8,916px tall at 1512 (9,681px in RTL)**, containing **12 tables and 106
badges**, with no sub-navigation, no anchor list, and no indication of how far down it goes. The
first card, `Matching and dispatch`, renders **three numeric inputs — `5000`, `45`, `250` — each in a
text field ~1,000px wide.** Below them, `Operating cities` with `Quick rides` / `Subscriptions`
switches, then ten more tables of reason codes.

A 1,000px-wide input for a three-digit integer is the clearest single "nobody looked at this" signal
in the product, and `/admin/workspace` (3,772px) and `/operations/corporate/:id` repeat it.

**Redesign.** Take Shopify's answer directly —
`shopify-admin-web/10-settings/settings-billing-overview-bills-and-credits.webp` shows a settings
surface with **its own left nav** (`Domains · Customer events · Brand · Notifications · Custom data ·
Languages · Policies · Store activity log`) and short cards in a **~370px column**. Never a
full-width field.

```
┌ Operational Policy ─────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────────────────────────────────┐ │
│ │ Matching     │ │  Matching and dispatch                             │ │
│ │ Cities     5 │ │  How far the first search reaches, how long it     │ │
│ │ Safety       │ │  runs, and the ceiling surge may not pass.         │ │
│ │ SLA targets  │ │  ────────────────────────────────────────────────  │ │
│ │ Reason codes │ │  Initial search radius        [ 5000 ] m           │ │
│ │ Surge        │ │  metres · 5.0 km                                   │ │
│ │ Escalation   │ │  ────────────────────────────────────────────────  │ │
│ └──────────────┘ │  Search phase timeout         [   45 ] s           │ │
│   200px sticky   │  How long the first search runs before it widens.  │ │
│                  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- **A second-level nav column inside the page**, sticky, 200px, one entry per current card. 8,916px
  becomes seven pages of ~900px. This is `14-system-wide-ux-plan.md`'s G7 two-column settings row,
  which was specified and never built.
- **Field width is a function of the value.** Integers get `w-24` with the unit as a trailing
  adornment. Emails and URLs get `w-96`. Nothing gets 1,000px, ever. Make it a rule with a name so it
  is enforceable.
- **Label + helper on the leading side, control on the trailing side.** The current stacked form makes
  the eye travel 8,900px vertically to read what is a two-column list.
- The ten reason-code tables collapse to **one table with a `Domain` filter**. They have identical
  schemas; ten identical tables stacked is a data-shape leaking into the layout.

### 3.3 Support → Contact Centre (`/support/contact-centre`)

**What I saw at 1280 — this is the one to look at.** A `Your availability` card, **280px tall**,
containing: the label `Availability` above a select reading `Online`; to its right and on a
*different baseline*, the unattached sentence *"Email, WhatsApp and calls do not count towards the
limit."* above `2 live chats`; below both, a grey paragraph about the away timer; then `Support team`
as a wrapping flex of four presence rows where `Yousef Al-Balawi` falls onto its own line. Three
unrelated pieces at three baselines with no alignment logic. Beneath it a red banner. Beneath *that*
the chip strip, clipped both ends (`ed · Mine · Waiting · Active · Snoozed`).

The conversation table starts at y≈595 of 800. **Two rows of seven are visible.** And the identity
cell's second line **renders on top of the neighbouring cell** — `Re: Fare calculation discrepancy on
surge trip` runs straight through the `Email` badge, and the Arabic snippet on row 2 runs through
`Chat`. Measured: **17 leaf-box collisions** on this screen at 1280.

**Redesign.**

```
┌ Contact Centre ─── 7 conversations · 5 past first-response ─────────────┐
│  [● Online ▾]  2 live chats     Team: ●2 online · ○2 offline  ⌄        │  ← 40px, ONE row, in the page header
├─────────────────────────────────────────────────────────────────────────┤
│  Unassigned  Mine  Waiting  Active  Snoozed  Closed    ⌕  ⚙  ⇅  ⤓      │
├─────────────────────────────────────────────────────────────────────────┤
│  ▎ Nora Al-Harbi                    Email   overdue 1h 0m   TKT-501  ⋯ │
│    Re: Fare calculation discrepancy on surge trip · 1 unread            │
```

- **The availability card becomes a 40px strip in the page header**, not a card. It is operator
  *state*, not page *content*, and it should sit beside the page title the way `On call: Yousef
  Al-Balawi` already sits in the top bar. 280px → 40px, and five conversations come above the fold.
- **The support-team roster becomes a popover** on `Team: ●2 online · ○2 offline`. Four people's last-
  seen times are reference material, not something to look at every time you open the queue.
- **Fix the collision at source**: the identity cell's secondary line needs `min-w-0` + `truncate`
  inside a `grid` cell, not an overflowing flex child. This same bug produces the 101 collisions on
  Disputes and the 34 on Communications — it is one fix in `DataTable`, not three.
- The two banners (`5 conversations are past their first-response deadline`) and the availability card
  are two standing conditions stacked; R10 says one event, one surface. Merge the count into the page
  subtitle, keep the banner only for the *action* (`Show only past deadline`).

### 3.4 Support → Disputes & Claims (`/support/disputes`) — **101 text collisions at 1280**

**What I saw at 1280.** Seven columns. The `Status` column is ~100px wide and holds an amber `Open`
badge **plus** the owner sentence `Nobody has taken this`, which wraps and is **sliced in half by the
cell boundary** — every visible row shows the fragment `Nobody` cut through its own baseline. The
last row shows a ghost `Take claim` button floating over the row beneath it, and the row's text
degenerates into unreadable fragments. `What is claimed` truncates at ~40 characters on all 25 rows,
so the claim — the thing the page is for — is never legible. 50 badges over 25 rows.

**Redesign.** Same three-line row as §3.1, plus one specific change this screen needs and Tickets
does not:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ▎ Fare disputed                              60.00 SAR claimed    ⋯    │
│   My morning commute is 85 SAR and I was charged 145 SAR.               │
│   DSP-106 · Mohammed Al-Ghamdi vs Khalid Mansour · unclaimed  [Take]   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **`Claimant X / Against Y` becomes `X vs Y` on the meta line.** Two labelled lines in a 170px column
  is 34 characters of chrome per row to express a relation that one preposition expresses.
- **The claimed amount is the only thing that keeps its own right-aligned column-like position** — it
  is the number the operator triages on, and it should be at the 16px/500 step (§6.1), the loudest
  thing on the row after the reason.
- **Ownership is text, never a badge, and the button appears only when actionable.** `Nobody has
  taken this` → `unclaimed`, one word.
- Kill the `Open` badge entirely (it is the tab you are standing in) — that alone removes 25 of the
  50 badges.

### 3.5 Operations → Live Dispatch (`/operations/dispatch`) — a live board with no live picture

**What I saw at 1512.** Left: a strip of three count chips (`Active trips 4`, `Pending dispatch 6`,
`Fleet online 51`) then a stack of trip cards, each **~186px tall for six facts**: `TRP-7741` + a
`Subscription` badge + `17.65 SAR`, a nested inset box holding `King Fahd St` over `KFUPM`, then
`Nora Al-Harbi` and `Ahmed Salem`. Four cards fill the viewport. Right rail: `LIVE INTERVENTIONS`
with a `2 Active` chip, two alerts (`Delayed Arrival — SUB-1041 +8m SLA`, `Emergency Signal —
TRP-1004 +3m SLA`), each with `Acknowledge` and `Reassign` buttons — **and then the sentence
*"Interventions are read-only until the live alert feed is connected. Acknowledging or reassigning
here would save nothing."*** Four buttons that look enabled and do nothing, with the disclaimer in
grey underneath.

**And at 1280 the rail is gone.** `scrollHeight` goes 897 → 1,358: the main+rail layout silently
stacks and the **Emergency Signal panel falls below the fold**. On the declared design viewport, the
safety alarm is invisible until you scroll.

**Redesign — this is the screen that most wants a different presentation.**
`shopify-admin-web/07-analytics/analytics-live-view-globe-map.webp` is the model: the map is ~65 % of
the width and is the *primary* surface; the numbers are a narrow rail of small cards with inline bar
meters; `Top locations` is a horizontal bar list.

```
┌ Live Dispatch ── 4 in transit · 6 waiting · 51 online ── ● live ────────┐
│ ┌─ 300px ──────────┐ ┌──────────────────────────────────────────────┐  │
│ │ ⚠ 2 INTERVENTIONS│ │                                              │  │
│ │ Emergency signal │ │            RIYADH — LIVE MAP                 │  │
│ │ TRP-1004  +3m    │ │   ● in trip   ○ waiting   △ captain idle     │  │
│ │ [Acknowledge]    │ │   zone shading = demand : supply             │  │
│ │ ──────────────── │ │                                              │  │
│ │ Delayed arrival  │ │        (selecting a pin fills the rail)      │  │
│ │ SUB-1041  +8m    │ │                                              │  │
│ │ ──────────────── │ └──────────────────────────────────────────────┘  │
│ │ Match time  42s  │ ┌──────────────────────────────────────────────┐  │
│ │ Auto-match 96.4%▌│ │ TRP-7741 Sub  Nora → Ahmed  King Fahd→KFUPM │  │  ← 44px rows
│ │ Utilisation 78.2%│ │ TRP-9012 QR   Layla → Omar  Olaya→Granada   │  │
│ └──────────────────┘ └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **The map is the screen.** `/management/zones` already ships an abstract-polygon zone map with
  demand-to-supply shading and a `Shade by` control — the component exists. Dispatch is the screen
  that needs it. A dispatcher's question is *"where is the gap"*, and a vertical list of four cards
  cannot answer a spatial question at any density.
- **The trip cards become 44px rows.** Six short facts do not need 186px and a nested inset box; the
  inset box around pickup/dropoff is a border drawn around two lines of text. Four visible trips
  becomes twenty.
- **The interventions panel is pinned to the top of a rail that never stacks.** At 1280, if something
  must drop, it is the trip list, not the emergency signal. Order the DOM so the alarm is first.
- **Delete the dead buttons.** `Acknowledge` and `Reassign` that "would save nothing" should not
  render. Replace the whole disclaimer with one neutral line: *"Read-only until the alert feed is
  connected."* A disabled control that can never be enabled in this build is not a disabled control,
  it is a lie about the product's state.
- The `● live` dot in the header is where R18's licensed ambient pulse belongs, and it is the one
  place in the product where motion would carry meaning.

---

## 4. Where a better *presentation* exists

The table is the right default and it is right about 30 times out of 40. These are the exceptions.

### 4.1 The eight metric boards want a **strip**, not a wall of tiles — and one of them wants a **single big number**

`/operations/overview` renders **14 cards in a 4-across grid, 12 of which say `— No comparison period
yet`**. `/management/risk` renders **8 tiles carrying the identical shield glyph** and 9 "no
comparison" lines. `/support/overview` renders 10 tiles of which 8 are absence messages.

A 4×3 grid of identical boxes has, by construction, no hierarchy. And an "overview" that is a
separate destination from the work is a page you visit once and never again.

**Do what `shopify-admin-web/02-orders/orders-list-with-metrics-row.webp` does:** put the metrics as a
**thin horizontal strip inside the index page's own header** — `Total orders 2 ▁▂▃`, `Returns 0`,
`Time to fulfil 0 min` — six units, one row, each a label, a value and a 20px sparkline. The metric
lives where the work is.

Concretely for Eyvar:

- **`/operations/overview` → delete the page.** Its 14 tiles belong as a 4-unit strip on Requests,
  Assurance, People and Trips respectively. What remains that is genuinely cross-queue —
  `13 work items past their SLA` — is the **one number that should be a single big number**, at 40px,
  with the five queues as a small bar list beneath it. That is the ops manager's whole morning
  question. Right now it is the third tile of twelve, identical in weight to `50 captains available
  now`.
- **`/management/risk` → a ranked list, not tiles.** `1,847.00 SAR revenue at risk`, `2 subscriptions
  predicted to churn`, `3 captains at risk` are not eight peers; they are one headline (revenue at
  risk) and a breakdown. The `Top 5 riders at risk` panel below it — name, amount, and a filled bar —
  is already the correct form. Promote it and delete the tile wall above it.
- **The `MetricTile` icon comes off, everywhere.** `financials/overview` has 1 SVG and reads best;
  `management/overview` has 27 and reads worst. An icon repeated on all eight tiles of a board cannot
  differentiate anything.

### 4.2 Admin → Activity Log wants a **timeline**, not a table with three column-sets

`/admin/activity` offers `By actor · By action · By entity` — three views of the same table. Its
empty state (which is what ships today) is a bordered 690px box containing three grey/blue bars that
**look exactly like a loading skeleton**, above the heading *"The record of who did what, and when"*.
I genuinely could not tell whether the page had finished loading.

Audit data is chronological and causal. `shopify-admin-web/02-orders/order-detail-timeline-full-
history.webp` shows the form: a vertical rule, dot markers, one line of prose per event, relative
time on the trailing edge, expandable entries with attachments, and a comment composer at the top.
It is scannable *because* it is prose, not because it is columned.

**Proposal.** Activity Log becomes a timeline grouped by day (`Today`, `Yesterday`, `24 Jun`), one
line per event: *"Yousef Al-Balawi suspended captain Bandar Al-Harbi — reason `repeat_incidents`"*,
with the object as a link and the time trailing. `By actor`/`By entity` become **filters**, not views.
And the empty-state illustration must stop resembling a skeleton — under R8 this is a legitimate
whole-page zero-records state, so give it a real mark, or give it the single grey sentence and drop
the graphic entirely.

### 4.3 Financials → Ledger wants a **balance bar**; the trial balance is a comparison, not a list

**What I saw.** `Ledger & Payment Controls` at 1512 renders **three columns across 1,100px**: the
`Account` column is **750px wide** for labels averaging 20 characters, with `Type` and `Balance`
squeezed against the right edge. The footer reads `Debits 12,237.43 SAR · Credits 12,237.43 SAR ·
64 entries`. And the view-chip strip **collides with the search field** — `Payment gateways` is
followed by a clipped glyph and then `Search acco`.

A trial balance is not a list, it is an **assertion that two sides are equal**. The single most
important fact on the page is at the very bottom in 12px grey.

**Proposal.** Promote the balance to the page header as a **two-sided bar**: assets+expenses on one
side, liabilities+revenue on the other, drawn to scale, with the equality stated once and loudly, and
the refused-postings count attached to it. Shopify does the small version of this on the fraud panel
in `order-detail-timeline-full-history.webp` — a three-segment `Low / Medium / High` meter that reads
in a glance. Then group the account rows under `Assets · Liabilities · Revenue · Contra revenue`
subheads with a subtotal per group, and let the `Account` column be 320px.

### 4.4 Management → Market & Zones wants **small multiples** beside the map

The zone map is a genuine strength — abstract polygons, a `Shade by` control (`demand to supply` /
`failure rate` / `requests`), a `Hide shading` toggle, and a legend. Two problems: **the labels
overlap** (`Al Narjis 7.0×` sits on top of `KAFD / Olaya 1.8×`; measured 23 collisions, the most on
any screen at 1512), and **positions carry no meaning** — `Al Malaz` sits alone in the bottom-right
with 400px of white between it and the cluster.

If the polygons are not geographically true, the map is a decoration. Either make it geographic, or
replace it with **six small multiples** — one mini-chart per zone, same axes, sorted by
demand-to-supply — which is the honest form for "compare six things on one measure" and would remove
every label collision. The `Zones` rail beside it, with its inline filled bars, is already halfway
there.

### 4.5 Where a table is right and should stay

`/operations/people`, `/operations/trips`, `/financials/payouts`, `/financials/cash`,
`/operations/subscriptions`, `/admin/team`. Do not touch the form; fix the column allocation and the
badge budget. And `/admin/team`'s **role permission matrix is the best non-table choice already made
in the product** — capabilities down, roles across, ✓/✗ at the intersection. That is a matrix
question answered with a matrix.

---

## 5. What to remove

Ordered by how much each buys.

| # | Remove | Where | Count | Why it earns nothing |
|---|---|---|---|---|
| 1 | **`— No comparison period yet`** | 6 metric boards | **39 instances** | A grey sentence whose content is "nothing". Suppress the whole delta row when there is no comparison; `MetricTile` already suppresses a *meaningless* delta, so extend it one step. |
| 2 | **The `MetricTile` glyph** | every board | 27 on management/overview, 25 on dispatch, 8 identical shields on risk | An icon on every tile differentiates no tile. `financials/overview` uses 1 SVG and is the best board. |
| 3 | **The repeated basis line** | financials/overview | 11 (`Period 1 Jun to 30 Jun` ×6, `Balance to date, outside the period.` ×5) | Said once by the section heading. Move it to the heading; delete it from the tiles. |
| 4 | **The dominant-value status badge** | people (`Active` ×9/10), disputes (`Open` ×25/25), tickets (`Open` ×3/3), subscriptions | ~90 badges | Assurance already does the right thing: normal state = plain grey text, exception = badge. Copy it. |
| 5 | **Second badge per row** | trips (50 over 25 rows), disputes (50), communications (52), policy (106) | ~200 | H7's budget: one badge in the identity column, one status column. `Quick ride` outlined-blue and `Subscription` filled-blue are two *styles* of the same field — pick one and it stops looking like a button. |
| 6 | **Disabled controls that can never enable** | dispatch (`Acknowledge`, `Reassign` ×2), corporate detail (`Generate invoice`) | 5 | Each carries a sentence saying the feature is not connected. Render the sentence; do not render the control. |
| 7 | **Truncated disabled-reason text inside table cells** | payouts (`Add a bank account…`), tickets (`Sarah Al-Rashid already owns this…`), communications (`This message…` ×8) | ~20 | Truncated to the point of meaninglessness, and it is what breaks row height (77px vs 53px) and causes the trailing-cell collisions. Move the reason to the row's `…` menu or a hover card. |
| 8 | **Two-decimal chart axes** | management/overview and every chart | every axis | `0.00 / 100.00 / 200.00 / 300.00`. Axis labels are magnitudes; `0 / 100 / 200 / 300`. |
| 9 | **`Delete` as a row-level button** | reports (7 rows) | 7 | Destructive, unguarded, and equal weight to `Open`. Every other table uses `…`. |
| 10 | **The empty bordered box below short tables** | my-work (+312px), data (+443), pricing (+347), tickets (+333), revenue (+314), cash (+270) | 8 screens | The container reserves viewport height regardless of row count, so two rows sit in a 490px box. Let it hug. |
| 11 | **The second `Computed 25 Jun 09:14`** | every board with charts | 2–3 per board | Already in the page subtitle. Repeating it on each chart card says nothing new. |
| 12 | **`Trip`/`Subscription` row avatars** | trips (`T`), subscriptions (`S`) | 50 | An identical single-letter chip on every row of a single-type table. Avatars disambiguate people; they cannot disambiguate a table of one kind. |

**Net effect, measured:** roughly **400 marks** off the screen. Density is not information — 12 of the
14 tiles on Operations Overview carry the message "we have no data", and removing them makes the two
that carry data visible for the first time.

---

## 6. Cross-cutting fixes, in the order I would do them

These are cheap and they change how the whole product feels, which is what the owner is asking about.

**6.1 Add one type step and use it.** The ramp has `16` and `17` and uses neither. Declare
**`--text-md: 16px / 24px`** as *the card-title and row-subject step* and apply it to: every `Card`
title, every section heading, the identity line of every table row, and the primary value in a
label/value pair. One token, one find-and-replace, and the product acquires a third level of
hierarchy it currently does not have. This is the highest-value item in this document.

**6.2 Fix the top bar at 1280.** The search is `w-100` (400px) fixed; make it `max-w-100 flex-1
min-w-0` and give the right group `shrink-0`. 25px of overlap on 40 screens, one line of CSS.

**6.3 Fix the secondary-line overflow in `DataTable`.** The identity cell's second line is an
overflowing flex child. `min-w-0` + `truncate` inside a grid cell removes **the majority of the 285
collisions at 1280 in one change** — it is the same bug on disputes (101), communications (34),
subscriptions (28), payouts (24), trips (20), fairness (19) and contact-centre (17).

**6.4 Make the view chips wrap, not scroll.** 25 of 35 screens have a clipped horizontal container at
1280, and on `/support/tickets` the *selected* chip is the one cut off. A segmented control that can
hide its own selection is broken. Wrap to a second line; the toolbar is already two rows on several
screens.

**6.5 Do not re-layout the table on selection.** Selecting two rows on `/operations/people` replaces
the header row with `2 selected` and reflows every column — `Captain` goes 478px → 245px and names
that were legible start truncating. Keep the header; put the count in the floating bar, which already
exists and is excellent.

**6.6 Give the delta chip a direction the eye can see.** On `/management/overview` an `↑ +57 %` chip
and a `↓ −15.4 %` chip are **the same grey pill with the same grey arrow**. The screen reader hears
"down, which is worse"; the eye gets nothing. With no red badge available (R5a/R7 — correctly, in my
view), use the two you do have: **`↓ worse` takes the warning tone, `↑ better` stays neutral**. Only
the bad one gets colour. That is stronger than colouring both, and it costs no new token.

**6.7 One heading system.** Rail cards use 11px uppercase tracked (`FIRST REPLY`, `LIVE
INTERVENTIONS`, `DISPATCH VELOCITY`); main cards use 14px sentence case (`Conversation`, `Operators &
access`). Pick sentence case at the new 16px step and delete the uppercase variant. Uppercase
letter-spaced micro-headings are the single most dated thing in the visual language.

**6.8 Row pitch is not what the grounding says.** Measured: **60px** on `/operations/people`, 69px on
zones, 77px on tickets and communications, 53px on most tables, 40px on revenue and data, 43px on
policy. The stated 49–53px band holds on about half the product. The 77px rows are caused by wrapped
disabled-reason text (§5 item 7) — fix that and 77 → 53. The 60px on People is the two-line identity
cell, which is deliberate and fine, but it should be a *declared* second pitch (`--ev-row-h-media`
exists at 60px — it is just not documented as a second band in the grounding).

---

## 7. Arabic and RTL

**The geometry mirrors correctly and that part is well done.** The rail moves to the trailing edge,
table columns reverse, the checkbox and `…` swap ends, numeric alignment survives, chevrons and the
`↑`/`↓` sort arrows flip, and the peek drawer's hairline moves to the correct side. I looked at nine
screens in `dir="rtl"` and found no layout that depended on "left".

**But `AR` is an empty dictionary.** `src/i18n/dictionaries.ts:925` — `export const AR: Dictionary =
{}`. Switching to Arabic renders **every English string inside an RTL container**, and the bidi
algorithm does what it must: *"3 requests are past their deadline."* becomes *".requests are past
their deadline 3"* with the full stop at the visual start; *"Average match time:"* becomes *":Average
match time"*; *"57 captains"* becomes *"captains 57"*.

Most of that vanishes on translation and I am not going to score it as a defect. **Two classes will
survive translation, and they are real:**

- **Signed and unit-suffixed tokens beside Arabic text.** `+8m SLA` rendered as `8m SLA+` — the sign
  detached from its number. `SLA`, `SAR`, `TRP-9103` and `7.0×` will all still be Latin runs inside
  Arabic sentences. Every one of those needs an explicit bidi isolate (`&#x2068;…&#x2069;` or
  `unicode-bidi: isolate`), and today they do not have one.
- **The chip-strip scroll position.** In RTL the Requests strip is scrolled to the wrong end,
  showing `xpired · Assigned · Pending · Subscription · Instant · A` — `All` is cut off. That is pure
  geometry and it is broken in both directions (§6.4).

**The honest headline: roughly 43,000 words of UI copy have never been seen in Arabic.** For a Saudi
operations console where RTL is a first-class requirement, that is the largest unresolved *design*
risk in the product — bigger than anything else in this document. Arabic is not a translation task
that happens after design; column widths, badge label lengths, the 3-line row in §3.1 and the
truncation points all change. I would translate two screens end-to-end now — People and Requests —
and look at them, before building anything else.

---

## 8. On the grounding decisions

Invited to critique, so:

- **Brand green `#0C6944` as `--primary`.** Right, and it is being used with restraint — the only
  saturated marks on a page are the primary button and the `Active` badge. Keep.
- **Five tones, no red badge.** Right in principle, and Requests proves you can express urgency
  without one. But there is a consequence you should see: on `/support/tickets`, **`Critical` and
  `High` are the same amber**, so the severity ramp has no top. Fix it in the *label ordering and the
  default sort*, not with a sixth tone — or let the row edge marker (already licensed, already red,
  already not a badge) be the carrier for `Critical` only.
- **No dark theme.** Right for an ops console read in an office. But `DataTable.tsx` still carries
  `dark:bg-rose-950/*` branches that can never apply — dead code that implies a theme that does not
  exist.
- **Fixed 1280, no second breakpoint.** This is the one I would revisit, not because a second
  breakpoint is needed but because **the commitment was not honoured**. Everything above 1280 is
  currently just wider columns, and everything *at* 1280 is where the product breaks. Either design
  at 1280 and let 1512 be generous, or admit the main+rail screens need a `min-width: 1400` rail rule.
  Live Dispatch dropping its emergency panel below the fold at 1280 is the proof.
- **Motion licensed per surface, no duration tokens.** The result is `29 transition-colors`, 10
  `animate-in`, and essentially nothing else. Motion currently only says "you are hovering". It never
  says *"this row became that drawer"* or *"that banner filtered this table"* — the two places where a
  120ms transform would do real work. I would license exactly those two and stop.
- **Row pitch 49–53 with a 45px compact mode.** See §6.8 — the product runs 40, 43, 53, 60, 69 and 77.
  Document the second (media) band and eliminate the accidental ones.

---

## 9. If you only do five things

1. **Add the 16px card-title/row-subject step and apply it** (§6.1). This is the one that makes the
   product *look* designed, because it is the level the hierarchy is currently missing.
2. **Fix the top bar and the secondary-line overflow** (§6.2, §6.3). Two CSS changes; removes ~250 of
   the ~285 text collisions at 1280 and a 25px overlap on all 40 screens.
3. **Delete the twelve things in §5.** Mostly deletion, no new components, and it is what makes the
   remaining marks legible.
4. **Rebuild Tickets and Disputes as three-line rows** (§3.1, §3.4). Two screens, one pattern, and it
   becomes the pattern for every queue whose subject is prose rather than an identifier.
5. **Give Live Dispatch a map** (§3.5). The zone-map component already exists on
   `/management/zones`. This is the screen that most obviously wants a different presentation, and it
   is the one an operator sits in front of all day.

Items 1–3 are roughly two days and they change the whole product. Items 4–5 are roughly four.

---

### Appendix — instrumentation used

- `docs/03-assessment/` capture set: 35 routes × {1512×900, 1280×800} LTR, 9 routes RTL, 6 interaction
  states, 5 detail routes. Zero console errors and zero page errors on any route.
- Collision detection: pairwise bounding-box intersection over non-nested leaf text nodes inside
  `<main>`, threshold 4px on both axes.
- Clipping detection: `scrollWidth > clientWidth + 2` on elements wider than 60px.
- Typography and colour: `getComputedStyle` on the first text leaf of every cell in row 1 of each
  table.
