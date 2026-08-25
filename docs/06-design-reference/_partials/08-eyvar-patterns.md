## 8. Patterns Shopify Does Not Cover

> **Why this section exists.** §1–§5 derive their rules from 159 screenshots of the Shopify
> admin, which is a merchant CRUD tool: records are created, edited, listed and archived by
> one person at a time, on their own schedule, against data that does not move while they
> look at it. Eyvar Admin is an operations console. Five of its surface types have no
> Shopify equivalent, or no *governed* Shopify equivalent, and together they are roughly
> half the product:
>
> | Surface type | Eyvar pages | Why §1–§5 does not reach it |
> |---|---|---|
> | Real-time monitoring | `p-live` | The data changes while the operator watches. Nothing in §1–§5 governs a moving surface. |
> | Derived / computed values | `p-plan-edit`, `p-plans` | §4.2 has one line on read-only fields. Eyvar has a computation lattice with a published formula. |
> | Money and ledgers | `p-wallets`, `p-rwallets`, `p-finance` | §4.2 says how to render a currency *input*. Nothing says how to render money as *output*. |
> | Work queues and SLA | `p-fraud`, `p-all-pending`, `p-requests`, `p-interventions`, `p-readiness`, `p-renewal` | §3.1 governs a list of records. A queue is a list of *work*: claimed, timed, decided, gone. |
> | Dense wide tables | every index, queue and ledger page — 23 of the 41 | §3.1 concedes that wide tables scroll and that the checkbox and identity column *"stay pinned while they do"*, and marks both `[Polaris]`. It writes no rule for either, and none at all for an operator freezing a column of their own. |
>
> **Claim marking, extended.** §1–§5 use `[observed]` (visible in a cited screenshot) and
> `[Polaris]` (recalled, unverified). This section adds a third tag:
>
> - `[code]` — verifiable in `eyvar_ops_panel_v40_fixed.html` at the line cited on the same
>   line. Every codebase claim below carries one. Trust it, and check it before changing it.
> - `[ruling]` — a decision for Eyvar where no source, screenshot or code settles the
>   question. Overturn deliberately, in writing, the same way §"Rulings on contested points"
>   works.
>
> **Standing rulings this section touches.** R4 (numeric columns are always right-aligned)
> is upheld and extended in §8.3. R5 (no red badges) is upheld as a *badge* rule and
> **explicitly amended** in §8.4 — see R5a. §1.6 (motion) is **explicitly amended** in
> §8.1 — see R18. §4.2 (computed fields render as normal input boxes) is **overridden** in
> §8.2. **§8.5 introduces no new ruling.** R1–R19 are untouched by it: its one collision
> with §1–§5 — interactive header cells — is settled where the precedence ladder already
> settles that class of collision, by a row in §6.2 (**D-6**), not by a twentieth ruling.

---

### 8.1 Real-time monitoring surfaces

**What was tried and why it does not fit.** §6.4 maps the live map onto §2.5's *full-bleed
editor* layout — the theme-editor pattern, where the page breaks the frame to give one
canvas the whole viewport. It is the closest Shopify has, and it is wrong on two counts.
First, the theme editor's canvas is a *preview of the thing being edited*; the live map's
canvas is a *view of the world*, and the operator's actual work happens in a list beside
it, not on it. Second, and fatally, the theme editor is static: it re-renders when you
change something. `p-live` re-renders because time passed. Every rule in §1–§5 assumes a
surface that only changes when the user changes it — §1.6 caps motion at 300 ms because
motion means "you did something", §3.1 sets a row height because rows sit still, §5.1
gives success a toast because success is an event the user caused. None of that survives
contact with a 1 Hz feed. Shopify's Analytics *Live View* is the only moving surface in the
159 screenshots and it is a read-only globe with bar rows — no rows to act on, no
intervention, no operator interaction to protect. So: a third page layout, and the first
motion rule in the document that governs a loop rather than a transition.

#### 8.1.1 The monitor shell — a third page layout

§2.2 documents two approved layouts (full-width index, centred detail/form) and §2.5 a
third for full-bleed editors. **This is a fourth, and the only one permitted for a surface
that updates without user input.** It is a two-pane grid: a fluid canvas pane on the left
and a fixed-width synchronised side list on the right, both starting at the same top edge,
the side list sticky. `p-live` already ships it at `grid-template-columns:1fr 340px;gap:14px;align-items:start`
`[code]` `eyvar_ops_panel_v40_fixed.html:772`, with the side list's own column carrying
`position:sticky;top:60px` `[code]` `eyvar_ops_panel_v40_fixed.html:826`.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Live map & route history                                                            │  ← .ph, §2.2 header
│  Track active trips, monitor requests, and step in when needed                       │
├───────────────────────────────────────────────────────┬──────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ ⬤ Live tracking · 3 active · updated 2s ago       │ │ │ Active trips now     (3) │ │ ← side list, 340px
│ ├───────────────────────────────────────────────────┤ │ ├──────────────────────────┤ │    sticky, top:60px
│ │  [ ⬤ Live ]   [ ⟳ History ]                       │ │ │ ⬤ TRP-4182  Nora → KFD   │ │
│ ├───────────────────────────────────────────────────┤ │ │   0:42 elapsed · ETA 6m  │ │
│ │ Filter: (All)(In trip)(Done)(Late)(Cancelled)     │ │ │   [Track][Call][Step in] │ │ ← .btn-track /
│ ├────────┬────────┬─────────┬────────┬──────────────┤ │ ├──────────────────────────┤ │   .btn-call /
│ │ ACTIVE │ LATE   │ IDLE    │ AVG ETA│ FEED         │ │ │ ◐ TRP-4190  Sara → Olaya │ │   .btn-intervene
│ │   3    │   1    │   7     │ 6.2 m  │ 2s ago       │ │ │   1:18 elapsed · Late 4m │ │   :357/:359/:361
│ ├────────┴────────┴─────────┴────────┴──────────────┤ │ │   [Track][Call][Step in] │ │
│ │ ┌───────────────────────────────────────────────┐ │ │ └──────────────────────────┘ │
│ │ │ ● start ● end ▬ actual ┄ planned │  ← legend   │ │ ┌──────────────────────────┐ │
│ │ │                                               │ │ │ Sub trip requests    (0) │ │
│ │ │            [ map canvas, ≥360px ]             │ │ ├──────────────────────────┤ │
│ │ │                                               │ │ │ No requests waiting.     │ │
│ │ │                              [+]  ← zoom      │ │ └──────────────────────────┘ │
│ │ │                              [−]              │ │ ┌──────────────────────────┐ │
│ │ └───────────────────────────────────────────────┘ │ │ Ride requests        (3) │ │
│ ├───────────────────────────────────────────────────┤ │ ├──────────────────────────┤ │
│ │ ALL TRIPS — SELECTED DATE                         │ │ │ …                        │ │
│ │ Time  Driver  Rider  Vehicle  Dist  Dur  Status   │ │ └──────────────────────────┘ │
│ └───────────────────────────────────────────────────┘ │                              │
│  ←──────────── canvas pane, fluid (1fr) ────────────→ │ ←──── side list, 340px ────→ │
└───────────────────────────────────────────────────────┴──────────────────────────────┘
     ▲ selecting a row here highlights its marker ──── and selecting a marker scrolls
       the side list to that card. One selection, two panes.
```

The two panes are **one selection model**. `selectTrip()` sets `activeTrip` and both the
table row and the canvas redraw from it `[code]` `eyvar_ops_panel_v40_fixed.html:12687`; the
selected row tints `background:var(--blue-lt)` `[code]` `eyvar_ops_panel_v40_fixed.html:11522`.
That is the pattern, and it is the reason this is a layout and not just a card grid: a
two-pane shell whose panes do not share a selection is two cards, and should use §2.2
instead.

#### 8.1.2 Update cadence

One clock. The app runs exactly one `setInterval(tickEngine,1000)`
`[code]` `eyvar_ops_panel_v40_fixed.html:11968`, and every periodic surface subscribes to a
modulo bucket off it (`%5` ETA + sub-requests `[code]` `:12602`, `%15` SLA sweep
`[code]` `:12512`, `%20` inbox `[code]` `:12513`, `%60` countdown decrement
`[code]` `:12611`). This is correct and must not be diluted by per-page intervals.

Renderers gate on visibility: `if(lp && lp.classList.contains('on'))` before redrawing the
map `[code]` `eyvar_ops_panel_v40_fixed.html:12596`, the same guard on the cash queue
`[code]` `:12141` and the work inbox `[code]` `:19035`. An off-screen page must not paint.

**Rows may not animate on change.** The established technique is an in-place text patch
against a data attribute — `.js-eta[data-trip]` `[code]` `eyvar_ops_panel_v40_fixed.html:12604`
and `.js-wait[data-req]` `[code]` `:12576` — which rewrites one `textContent` and touches
nothing else. That is the only permitted update for a value inside a mounted row. Replacing
the row's HTML, flashing it, transitioning its background, or re-ordering the list to put
the changed row somewhere else all move a click target under a moving hand.

#### 8.1.3 Stale and dead feeds

Two independent conditions, two independent signals.

**Per-entity staleness** is already modelled: `lastPing` increments each tick and crosses
two thresholds — 120 s ("weak signal — check in") and 300 s ("no signal — 5 minutes without
a ping") `[code]` `eyvar_ops_panel_v40_fixed.html:12587-12593`. The three ping classes
`.ping-ok` / `.ping-warn` / `.ping-dead` carry it
`[code]` `eyvar_ops_panel_v40_fixed.html:328-330`.

**Whole-surface staleness** is not modelled at all. `#live-last-update` exists in the markup
`[code]` `eyvar_ops_panel_v40_fixed.html:775` and its only writer sits inside a dead code
path `[code]` `:11582`, so it renders permanently empty. Worse, the same bar hard-codes
`· 3 active trips · updates every second` `[code]` `:775` — a claim about the feed that is
printed whether or not the feed exists. A surface that asserts it is live while showing
frozen data is the single worst failure mode this section is written to prevent.

#### 8.1.4 The live dot

`.map-tab.active .tab-dot` pulses `[code]` `eyvar_ops_panel_v40_fixed.html:341-342`; a
static `.tab-dot` is grey `[code]` `:340`. The dot's meaning must be exactly one thing —
**data arrived recently** — and never "this tab is selected", which is what the current
selector actually says.

#### 8.1.5 Map chrome

| Element | Ships as | Ruling |
|---|---|---|
| Legend | `.ndv-legend`, absolutely positioned `top:8px;left:10px`, translucent white, hairline border `[code]` `:211` | Mandatory whenever more than one marker tone or line style is drawn |
| Canvas height | `#map-canvas` inline `height:360px` `[code]` `:817`; orphan `#map-leaflet{height:400px}` `[code]` `:349` for an element that no longer exists | One height rule, `min-height:360px`, flexible above it |
| Stats bar | `.map-stat` declared twice — flex-gap at `:217`, then redeclared as a divided strip at `:365` (the later wins) | One declaration; the divided strip |
| Marker tones | Hard-coded `#2E7D32` / `#C62828` / `#1A73E8` / `#E8A33D` in the legend markup `[code]` `:806-810` | Tokens only, mapped to §3.4 |
| Filter chips | `.map-fchip` / `.map-fchip.on` `[code]` `:345-347`; `setMapFilter` re-renders the table but never the canvas `[code]` `:11522-11524` | A filter must apply to both panes or to neither |

**Marker tone mapping.** Markers take their tone from the §3.4 badge palette so a marker and
its row's badge cannot disagree: success/`--green` = in trip and on time; warning/`--amber` =
late, or a stale feed; neutral/`--ghost` = idle or completed; `--blue` = the selected entity;
`--red` = a breached or intervened trip. **R5 does not apply here** — R5 bans red *badges*,
and a map marker is not a badge: it has no fill-plus-text pill geometry, carries no label,
and cannot be confused with a status token. Red markers are permitted and are stated as
permitted so nobody has to guess.

#### 8.1.6 Ambient / looping animation — amending §1.6 (R18)

§1.6 governs *transitions*: a discrete state change with a start and an end, capped at
300 ms, restricted to `opacity` and `transform`. It has nothing to say about a loop, and its
300 ms ceiling makes every `infinite` keyframe currently in the file illegal:

| Keyframe | Declared as | Violates §1.6 because |
|---|---|---|
| `ping-pulse` `[code]` `:331` | `1.4s infinite` on `.ping-warn` `[code]` `:329`, `0.7s infinite` on `.ping-dead` `[code]` `:330` | Exceeds 300 ms; dips opacity to `.3` |
| `live-dot` `[code]` `:342` | `2s infinite` on the active tab dot `[code]` `:341` | Exceeds 300 ms **and animates `box-shadow`**, which §1.6 bans outright |
| `reqPulse` `[code]` `:145` | `1.4s ease-in-out infinite`, applied inline to the Requests live chip `[code]` `:2084` and a modal glyph `[code]` `:4811` | Exceeds 300 ms; dips opacity to `.25` |

**R18 [ruling].** §1.6 is amended: it governs transitions only. A separate, narrower licence
covers ambient loops, and the loops above are non-conforming as written and must be
rewritten to it. The licence exists because a monitoring surface needs one honest signal
that the feed is alive — a static dot cannot distinguish "connected" from "frozen at
09:14" — and for nothing else.

**Rules**

- The monitor shell MUST be used for, and only for, a surface whose content updates without user input; it MUST be a two-pane grid of a fluid canvas pane plus a fixed 340 px side list, sticky, both panes top-aligned (`:772`, `:826`).
- The two panes MUST share exactly one selection: selecting in either pane MUST select in the other (`:12687`), and a filter MUST apply to both panes or to neither (`:11522-11524` currently applies to one).
- A monitoring page MUST NOT create its own timer; it MUST subscribe to the single 1000 ms tick (`:11968`) and MUST NOT request a bucket faster than 1 s.
- A renderer MUST NOT paint while its page lacks the `on` class (`:12596`, `:12141`, `:19035`).
- A value inside a mounted row MUST update by in-place text patch against a `data-` attribute (`:12604`, `:12576`). A row MUST NOT be re-rendered, flashed, tinted, transitioned, or highlighted because its data changed.
- A list MUST NOT re-sort or remove rows while the pointer is inside the list's bounding box or any element inside it has focus; the reorder MUST be deferred until neither is true. A row whose menu, modal, or confirm dialog is open MUST NOT be removed until that surface closes.
- Polling MUST NOT pause during operator interaction — only painting is deferred. The one exception already in the code is replay: while `0 < replayPct < 1` the redraw is skipped (`:12595-12600`), because the operator is scrubbing the same canvas.
- Every monitoring surface MUST display a last-update timestamp in its header bar and MUST refresh it every tick (`#live-last-update`, `:775`, currently never written).
- A monitoring surface MUST NOT print a hard-coded cadence or entity count; every number in the header bar MUST be computed from the data being shown (`:775` prints `· 3 active trips · updates every second` as a literal).
- When the last update exceeds 3× the expected interval, the surface MUST enter a stale state: the live dot stops looping and goes neutral, the timestamp switches to `Last update Nm ago`, and one page-level banner (§5.2) states that the feed has stopped. It MUST NOT keep the word "Live" on screen.
- Per-entity feed freshness MUST use exactly three states with the thresholds already in the code — fresh < 120 s, stale 120–299 s, dead ≥ 300 s (`:12587-12593`) — and MUST label each in text, not colour alone (`.ping-label`, `:332`).
- A pulsing live dot MUST mean "data for this entity arrived within the freshness window" and nothing else. Its absence MUST mean "not receiving". It MUST NOT indicate selection, activation, or tab state — the current selector `.map-tab.active .tab-dot` (`:341`) does exactly that and MUST be rebound to feed state.
- Marker tones MUST come from `:root` tokens mapped to the §3.4 badge palette; MUST NOT hard-code hexes (`:806-810`).
- The map MUST render its legend whenever more than one marker tone or line style is drawn, using `.ndv-legend` (`:211`), and every tone and style drawn MUST appear in it.
- The map MUST expose zoom controls and MUST NOT rely on scroll-wheel zoom alone.
- The map MUST cluster markers when more than 25 would render inside one 40 px square, and a cluster MUST show its count and MUST expand on click.
- The map pane MUST use `min-height:360px` and MUST NOT be given a fixed pixel height (`:817` fixes 360; `:349` fixes 400 for a dead element — both MUST be replaced by one rule).
- `.map-stat` MUST be declared once (`:217` and `:365` both declare it).

**Rules — ambient animation (R18, amending §1.6)**

- An ambient loop MUST be used for exactly one purpose: signalling that a live feed is receiving data. Any other looping animation MUST NOT ship.
- An ambient loop MUST animate `opacity` only. It MUST NOT animate `box-shadow` (`live-dot`, `:342`), `width`, `height`, `background`, `color`, or `transform`.
- An ambient loop's period MUST be ≥ 1200 ms and ≤ 2500 ms. `.ping-dead`'s `0.7s` (`:330`) is out of range.
- An ambient loop's opacity MUST NOT fall below `0.4`. `ping-pulse`'s `.3` (`:331`) and `reqPulse`'s `.25` (`:145`) are out of range.
- Loop speed MUST NOT encode severity. A faster loop for a worse state (`.ping-dead` `0.7s` vs `.ping-warn` `1.4s`, `:329-330`) MUST NOT ship; severity is carried by tone and label.
- A loop MUST stop when the condition it reports stops being true. A dead feed MUST NOT pulse (`.ping-dead`, `:330`, pulses to report that nothing is arriving).
- At most one looping element MAY be visible per card, and at most three per viewport.
- Every ambient loop MUST be disabled under `prefers-reduced-motion: reduce`, replaced by the same element rendered statically. This is not optional and is not covered by §1.6's transition clause.
- An ambient loop MUST NOT be the only carrier of its meaning: the element it decorates MUST also carry a text label (`.ping-label`, `:332`) or an adjacent timestamp.

---

### 8.2 Derived and computed values

**What was tried and why it does not fit.** §4.2 has one sentence on this: "Computed /
read-only fields. Rendered as normal boxes but showing a derived value or `--`", evidenced
by Profit and Margin on the product pricing card. That pattern is two leaf values hanging
off one input, with no published formula and nothing downstream. The plan editor is a
lattice: seven inputs feed eleven outputs across four different presentation forms —
a computed box `[code]` `eyvar_ops_panel_v40_fixed.html:1103`, two echo cells in a pricing
table `[code]` `:1121`, two worked-example cells `[code]` `:1121-1122`, and a six-value
preview strip `[code]` `:1086` — governed by a four-line chained formula printed on the page
`[code]` `:1125`. Rendering all of that "as a normal box" produces a form where the operator
cannot tell what they may type in. Worse, §4.6 reserves the flat-grey, reduced-contrast
treatment (`.btn[disabled]{opacity:.42}` `[code]` `:86`) for actions that *will* become
available — and `.computed-box` `[code]` `:255` is a 33 px input-shaped box on `--bg2` with
a `--border2` hairline, which is precisely what a disabled input looks like. The two signals
collide, and the collision resolves the wrong way: an operator reads "temporarily locked,
try again later" when the truth is "this can never be typed into". And §5.7's "constraints
and consequences go under the field, not in a tooltip" removes the obvious place to put the
formula.

#### 8.2.1 Three states, three shapes

| State | Meaning | Shape |
|---|---|---|
| **Editable** | You may type here | Bordered box, `--border2` hairline, white fill, 33 px `[code]` `:252` |
| **Disabled** | You may not type here *yet* | Same bordered box, reduced contrast — the §4.6 treatment `[code]` `:86` |
| **Derived** | Nobody types here, ever | **No box.** No border, no fill. Value in `--blue`, at input size, on the same 33 px baseline so the grid does not break |

**This overrides §4.2.** The border is the affordance: §4.2 itself makes `border-input`
deliberately stronger than `border` "so fields read as targets". A derived value is not a
target, so it does not get the border. Keeping the box and merely tinting the text — what
`.computed-box` does today — asks the border to mean two opposite things.

Derived values are `--blue` but MUST NOT be underlined and MUST NOT be clickable, so they
cannot be mistaken for a link under R3 (links get underline + `--blue-dk`).

#### 8.2.2 Where the formula is disclosed

Not a tooltip — §5.7 forbids it. Not helper text under one field — the formula belongs to
the group, not to any single input. It goes in a `.formula-box`: pale `--blue-lt` panel,
`--blue-dk` body, monospace `<code>` per line, with a `--blue` `.formula-note` footnote
ruled off at the top `[code]` `eyvar_ops_panel_v40_fixed.html:271-274`. The plan editor
already ships the shape correctly `[code]` `:1125`:

```
gross      = (trip_min × price/min) + (trip_km × price/km)
discounted = gross × (1 − discount%/100)
plan_total = discounted × execute_days
driver_earns = plan_total × (1 − eyvar%/100)
─────────────────────────────────────────────────────────
Example uses 10 km / 20 min. Actual computed from real trip data at booking.
```

The defect is not the shape, it is the wiring: that block is hand-written HTML with no link
to `cr()`, the function that actually computes it `[code]` `:12986`. The two can drift
silently, and a published formula that lies is worse than no formula.

#### 8.2.3 Live recompute

`.preview-strip` is the announcement surface: a pale `--blue-lt` band with a `--border`
top rule, sitting directly under the form top bar, holding label/value pairs
`[code]` `eyvar_ops_panel_v40_fixed.html:275-277`, mounted at `:1086`. Recompute is driven
by `upd()` `[code]` `:12987-12999`, bound to seven `input` listeners `[code]` `:13000` and
called once at parse `[code]` `:13001`.

Two real defects define the rules. First, **four inputs that affect the result are not
bound** — `fp3-duration`, `fp3-cap`, `fp3-sort` and the status select are absent from the
listener list `[code]` `:13000`, so the strip can show a stale number with no indication.
Second, **the preview and the saved value disagree on an empty field**: the preview coerces
blank to `0` via `gv()` `[code]` `:12984` while save keeps the previous stored value via
`numval()` `[code]` `:6150-6155`. The operator clears a field, watches the preview drop, and
saves something else entirely.

#### 8.2.4 Worked examples as a form element

A worked example is a first-class element, not decoration: it is the operator's only check
that the formula they just read means what they think. The plan editor renders it as a
column inside the same table as the inputs — `.ptable` `[code]` `:262`, computed columns
marked by `th.ci` (blue header) `[code]` `:264`, example cells `.ex-cell` with `.ex-tot`
(green, total) and `.ex-drv` (blue, driver share) `[code]` `:269-270`, header stating its
inputs literally: `Example (10km · 20min × exec days)` `[code]` `:1119`.

That is the right placement — row-aligned with the inputs it derives from, so the operator
reads across rather than jumping between cards. The defect is again fidelity: the example
column computes 10 km / 20 min without applying surge, while the production fare path does
apply it `[code]` `:12345` vs `:12401-12405`, so the example understates during surge. An
example computed by a second code path is a second product.

#### 8.2.5 Validation and dirty state

A computed field has no input of its own, so it cannot be invalid — only its inputs can.
`fp3-comm` carries HTML `max="100"` with no JS clamp and `fp3-disc` carries no maximum at
all `[code]` `eyvar_ops_panel_v40_fixed.html:1102`, so a discount above 100 % produces a
negative plan total that renders in the preview strip with no warning and saves cleanly.
The error belongs on the discount input and in a page-level critical banner (§5.2), never
on the computed box.

Dirty state is likewise an input property. A recompute is not an edit. Conversely, an
editable control that never reaches the save payload is a lie: the status custom-select at
`[code]` `:1105` is read by nothing in `savePlan()`, so the operator can change it, see it
change, save, and lose it silently.

**Rules**

- A derived value MUST NOT be rendered in an input-shaped box. It MUST have no border and no fill, sit on the same 33 px baseline as sibling inputs (`:252`), and render in `--blue`. **This overrides §4.2's "rendered as normal boxes" clause and retires `.computed-box` (`:255`) as declared.**
- A derived value MUST NOT be focusable, MUST NOT appear in the tab order, and MUST carry `aria-readonly="true"` plus `aria-live="polite"`.
- A derived value MUST NOT be underlined and MUST NOT be clickable, so it cannot be read as a link under R3.
- The disabled treatment (`:86`) MUST NOT be applied to a derived value, and a derived value MUST NOT be styled with `--bg2` fill plus a `--border2` hairline — that combination is reserved for a disabled input.
- A derived value with no computable result MUST render an em-dash `—`, never `0`, never blank, never a spinner. (Same rule as §3.7's delta.)
- The governing formula MUST be disclosed on the page in a `.formula-box` (`:271`) placed inside the same card section as the inputs it consumes, immediately below the last of them. It MUST NOT be disclosed in a tooltip (§5.7), a modal, or helper text under a single field.
- Every line of the chain MUST appear, in `<code>`, in the order it evaluates (`:1125`), and every assumption MUST appear in the `.formula-note` (`:274`).
- The formula box MUST be generated from the same source as the computation. A hand-written formula block that duplicates a compute function (`:1125` vs `cr()` at `:12986`) MUST NOT ship.
- A surface carrying two or more derived values MUST render one `.preview-strip` (`:275`) directly beneath the form top bar (`:1086`), and it MUST carry `aria-live="polite"`.
- Every input named in the formula MUST be bound to the recompute handler. The count of bound listeners MUST equal the count of inputs the formula reads (`:13000` binds 7; the formula plus save read 11).
- Recompute MUST fire on the `input` event, not on `change` or `blur`.
- Recompute MUST NOT animate: no flash, no colour transition, no count-up. The value is replaced in place. (§8.1 and R18 apply.)
- If a recompute cannot complete within 150 ms, every affected derived value MUST be replaced by `—` for the duration. A stale number MUST NOT remain on screen while a newer one is being computed.
- Exactly one numeric coercion function MUST serve both preview and save. Two functions with different blank-field semantics (`gv()` at `:12984` returns 0; `numval()` at `:6150` returns the previous value) MUST NOT ship.
- A computed column in a table MUST be marked in its header (`th.ci`, `:264`) and MUST NOT contain an input.
- A worked example MUST live in the same table as the inputs it derives from, row-aligned (`:1117-1124`), and MUST state its literal inputs in the column header (`:1119`).
- A worked example MUST be computed by the same code path as the production value it illustrates. Two paths (`:12345` vs `:12401-12405`) MUST NOT ship.
- A derived value MUST NOT be independently validated. A result outside its legal range MUST raise the error on the input(s) that produced it, plus one page-level critical banner (§5.2) naming the input to fix.
- Every numeric input feeding a derived value MUST declare and enforce `min` and `max` in JS, not in HTML attributes alone (`:1102`).
- A recompute MUST NOT set the dirty state and MUST NOT arm the save bar. Dirty means an editable field differs from its persisted value.
- Every editable control on a form MUST be read by that form's save handler. A control the save payload ignores (`#fp3-status`, `:1105`) MUST be removed or wired.
- Derived values MUST NOT be persisted. They MUST be recomputed on read from the stored inputs.

---

### 8.3 Money and ledgers

**What was tried and why it does not fit.** Two Shopify patterns were tried and neither
covers the case. §4.2 governs money as an *input* — "currency symbols as an in-field left
prefix, unit codes as an in-field right suffix" — which says nothing about money as output.
§3.5's key-value row (label left, optional grey qualifier, value right-aligned, bold total)
governs money as *output* and is genuinely right for an order summary: one settled amount,
attached to one record, that will never change. Eyvar's money moves. A driver wallet is a
balance with a history; a cash-debt ledger accumulates negatively `[code]` `eyvar_ops_panel_v40_fixed.html:12088-12092`;
a subscription payment sits in an authorization hold before it is captured
`[code]` `:9593-9619`; escrow is held against future delivery `[code]` `:2801-2806`. Shopify
has no negative amount anywhere in 159 screenshots, no running balance, no pending state
that resolves, and no ledger. The document consequently has no rule for the most
consequential thing an ops console displays, and the codebase shows the result: 87
independent money strings, at least three formatters (`fmtSAR()` `[code]` `:4394`, an
identical `fmt()` `[code]` `:12985`, and raw `.toFixed(2)+' SAR'` inline
`[code]` `:6693`), one negative rendered as `'−'+fee.toFixed(2)+' SAR'` in `--red`
`[code]` `:5537`, and a payouts table whose amounts carry no unit at all `[code]` `:985`.

#### 8.3.1 Money formatting

| Property | Ruling | Why |
|---|---|---|
| Unit | ISO code `SAR`, never the ﷼ glyph | The glyph is absent from `system-ui` (`:15`) and ambiguous in a Latin-script UI |
| Position | Trailing, one space: `48230.00 SAR` | Already the codebase convention in all 87 sites (`:4394`, `:6693`, `:5537`) |
| Decimals | Always exactly 2. Never trimmed, never rounded to whole | `.toFixed(2)` throughout (`:4394`) |
| Thousands | `,` every three digits | Absent today: `48,230` is a hand-typed literal (`:932`) while `501.98` is computed (`:936`) — the page mixes both |
| Figures | `font-variant-numeric: tabular-nums` on every money value | Already used once, on the dispatch countdown (`:5015`); decimal points must line up under R4 |
| Alignment | Right, header and value sharing a right edge | R4, upheld and extended: R4 said "right-align"; §8.3 adds that fixed 2 dp + tabular figures are what make right-alignment actually align |
| Zero | `0.00 SAR` | `—` means "not applicable / unknown" and MUST NOT be reused for "no money" |

**Unit placement in tables.** Inside a table the unit goes in the column header once —
`Gross (SAR)` `[code]` `:951` — and MUST NOT repeat in the cells. Outside a table (KPI value,
key-value row, banner, toast, modal summary) every amount carries the code. The payouts
table today does neither: the unit appears only in a badge and a button label
`[code]` `:982`, so the cells are bare numbers.

#### 8.3.2 Negative amounts, and R5

R5 bans red badges. A negative amount is not a badge — it is a value — but the codebase
currently reaches for `--red` anyway `[code]` `eyvar_ops_panel_v40_fixed.html:3953`, `:5537`,
and in a ledger where most rows are debits that makes red mean nothing.

**[ruling]** Sign is carried typographically, never chromatically. The minus is U+2212
(`−`), not a hyphen — which the codebase already gets right `[code]` `:5537` — set
immediately before the digits with no space. The value renders in `--ink` like every other
amount. Colour MAY be added only where the sign already carries the meaning, so that
removing the colour loses nothing; it MUST NOT be the only signal. Accounting parentheses
are banned: `(6.40)` is unreadable next to footnote markers.

A negative amount MUST NOT be placed in a badge or pill of any tone. This is R5 applied
literally, and it retires the pattern at `[code]` `:3953`.

#### 8.3.3 The ledger pattern

A ledger is any table whose rows are postings against a balance. It is not an index table
and it does not get index-table furniture.

```
┌─ Wallet ledger — RDR-1041 · Nora Al-Harbi ─────────────────────────────────────────────┐
│                                                                    Balance  20.00 SAR   │
│                                                                    Pending   0.00 SAR   │
├────────────┬───────────┬─────────────────────────────────┬─────────┬─────────┬─────────┤
│ Date       │ Reference │ Description                     │   Debit │  Credit │ Balance │  ← R4: all
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     three right,
│ 18 Jul     │ —         │ Opening balance                 │       — │       — │    0.00 │  ← opening row
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     bold both sides
│ 18 Jul     │ WTX-0002  │ Referral bonus — Sara Al-Ghamdi │       — │   20.00 │   20.00 │
│ 09:30      │           │                                 │         │         │         │
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤
│ 19 Jul     │ WTX-0003  │ Trip fare — TRP-4182            │    6.40 │       — │   13.60 │
│ 08:12      │           │ ↳ TRP-4182                      │         │         │         │  ← source link,
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     the ONLY
│ 19 Jul     │ WTX-0004  │ Reverses WTX-0003 — fare dispute│       — │    6.40 │   20.00 │     per-row control
│ 11:47      │           │ ↳ WTX-0003                      │         │         │         │  ← correction is a
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     new row, never
│ 20 Jul     │ WTX-0005  │ Subscription — held, not settled│       — │  120.00 │       — │     an edit
│ 07:05      │           │ ⟨ Pending ⟩  authorised, awaiting capture      warning tone     │  ← excluded from
├────────────┼───────────┼─────────────────────────────────┼─────────┼─────────┼─────────┤     the balance
│ Closing balance                                          │    6.40 │   26.40 │   20.00 │  ← closing row
└──────────────────────────────────────────────────────────┴─────────┴─────────┴─────────┘
  No checkbox column.  No hover kebab (.ra, :153).  No bulk action bar.  Not user-sortable.
  Showing 6 of 6 postings.
```

**Debit and credit are two columns, both holding positive numbers.** The sign lives in the
column choice, which is unambiguous, survives right-alignment, and removes the negative-
colour question entirely for the surface where it matters most. The single-signed-column
form is permitted only in a rail card ≤ 320 px, where §8.3.2's U+2212 rule applies instead —
and such a card MUST omit the running balance and link to the full ledger.

**Running balance.** `balanceAfter` is already computed and persisted on every wallet
posting `[code]` `eyvar_ops_panel_v40_fixed.html:3937` (credit), `:3947` (debit), and seeded
on existing records `[code]` `:2594`, `:2599` — and is **rendered nowhere in the product**.
The ledger column is that stored value, not a value recomputed at render time, so a
correction to history cannot silently rewrite what the operator saw.

**Append-only.** A posting is a fact. `releaseEscrow` splices the hold out of the array
`[code]` `:7064` instead of transitioning it, and `payDriver` sets `pending = 0` as a hard
assignment rather than a subtraction `[code]` `:7030`; both destroy history. Corrections are
new reversing rows that reference the original, as `WTX-0004` does in the wireframe.

**Ledger rows are not index rows.** §3.1's row-overflow kebab (`.ra`, `[code]` `:153`) and
§3.3's selection checkbox plus floating bulk-action bar MUST NOT appear on a ledger. They
exist to mutate or remove the records they sit on, which is exactly what a ledger row
forbids. The only per-row control permitted is a read-only link to the source document.

**Order.** A running balance is only meaningful in posting order, so the full ledger is
oldest-first with the opening row at the top and the closing row at the bottom, and it is
not user-sortable. The truncated "recent activity" list — six rows, newest-first, in a rail
card `[code]` `:3951-3953` — is the permitted exception, and it omits the balance column.

#### 8.3.4 Pending and reconciling as lifecycle states

Money has more states than Shopify's `Paid` / `Refunded` / `Voided`, and every one of them
needs an assigned tone from the closed §3.4 palette:

| State | Where it lives | Tone | Rationale |
|---|---|---|---|
| `settled` / `captured` / `paid` | `capturePaymentHold` `[code]` `:9605-9619` | **success** | Money has moved and nothing is owed |
| `held` / `authorised` | `ensureHold` `[code]` `:9593`; `holdBadge` `[code]` `:9639-9644` | **warning** | §3.4 reserves warning for states that block money — a hold is exactly that |
| `pending` | cash queue `[code]` `:12130` | **warning** | Same reason |
| `reconciling` | cash classification `[code]` `:12083-12087` | **warning** | Same reason |
| `released` (no charge) / `reversed` / `voided` | `releasePaymentHold` `[code]` `:9599` | **neutral** | §3.4: terminal factual outcome, no action left |
| `escalated` / `failed` | `resolveCashEntry` `[code]` `:12146` | **not a badge** — R5 | Routed to §8.4's row-level critical signal |

A pending amount is not part of a balance. It is a separate labelled line beneath it, as in
the wireframe, and the running balance column includes settled postings only.

**Rules**

- Exactly one money formatter MUST exist and every money string in the product MUST come from it. Inline `.toFixed(2)+' SAR'` (`:6693`) and duplicate formatters (`fmtSAR()` `:4394`, `fmt()` `:12985`) MUST NOT ship.
- Money MUST render as `<amount> SAR`: ISO code, trailing, one space. MUST NOT use the ﷼ glyph and MUST NOT use a leading symbol. **§4.2's currency-prefix rule governs inputs only and MUST NOT be applied to output.**
- Money MUST render exactly 2 decimal places, always, including whole amounts.
- Money MUST use a `,` thousands separator (`Intl.NumberFormat('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})`). Hand-typed separators (`:932`) MUST NOT ship.
- Every money value MUST set `font-variant-numeric: tabular-nums` (`:5015`).
- Money columns MUST be right-aligned, header and value sharing a right edge (R4, upheld).
- Inside a table the unit MUST appear once, in the column header as `(SAR)` (`:951`), and MUST NOT repeat in cells. Outside a table every amount MUST carry the code. A money cell with no unit anywhere on the surface (`:985`) MUST NOT ship.
- Zero MUST render `0.00 SAR`. `—` MUST be reserved for not-applicable or unknown.
- A negative amount MUST be prefixed with U+2212 `−` (`:5537`), never a hyphen, never parentheses.
- A negative amount MUST NOT rely on colour as its only signal, and MUST NOT be rendered in a badge or pill of any tone (`:3953`). **R5 upheld and applied to values.**
- A ledger MUST use the fixed column order Date · Reference · Description · Debit · Credit · Balance, with debit and credit as two columns holding positive numbers. A single signed amount column is permitted only in a rail card ≤ 320 px wide, which MUST then omit the balance column and MUST link to the full ledger.
- A ledger MUST render a running balance as its last column, MUST source it from the persisted `balanceAfter` (`:3937`, `:3947`), and MUST NOT recompute it at render time.
- A ledger MUST open with a labelled opening-balance row and close with a labelled closing-balance row, both bold on both sides (§3.5's total convention). The closing balance MUST equal the balance displayed in the card header.
- Ledger rows MUST be append-only. A posting MUST NOT be edited or deleted; a correction MUST be a new row that names the row it reverses. Splicing a record out of a money array (`:7064`) and hard-assigning a balance to zero (`:7030`) MUST NOT ship.
- **§3.1 row actions (`.ra`, `:153`) MUST NOT appear on a ledger row, and §3.3 bulk selection — checkbox column, selection header, floating bulk-action bar — MUST NOT appear on a ledger.** The only permitted per-row control is a read-only link to the source document.
- A ledger MUST be sorted oldest-first by posting time and MUST NOT be user-sortable. The truncated rail-card variant (`:3951-3953`) MUST be newest-first, MUST omit the balance column, and MUST link to the full ledger.
- A truncated ledger MUST state its truncation in words below the last row (`Showing 150 of 412 postings`). A silent row cap (`:12250`) MUST NOT ship.
- Every money state MUST map to exactly one §3.4 tone per the table above: settled → success; held / authorised / pending / reconciling → warning; released / reversed / voided → neutral.
- A pending or held amount MUST NOT be included in a displayed balance and MUST NOT be included in the running-balance column. It MUST appear as a separate labelled line beneath the balance.
- A failed or escalated money state MUST NOT be a badge (R5); it MUST use the row-level critical signal defined in §8.4.

---

### 8.4 Work queues and SLA

**What was tried and why it does not fit.** §6.4 maps these pages onto §3.1's index table
plus §3.2's view tabs plus §3.3's bulk actions — the orders-index pattern. The mapping
survives about one screen. An index row is a *resource*: it exists before you open the page
and after you close it, it can be edited and re-edited, and its status is a property you can
change back. A queue row is a *unit of work*: it is claimed by one person, it has a deadline
running against it, it is decided once, and then it leaves. Shopify's nearest approach is
the `Unfulfilled` tab on the orders index, but a fulfilled order is still an order — it does
not exit the list, nobody claims it, and no clock runs on it. Everything a queue needs is
therefore missing: no ownership model, no countdown component, no escalation, no disposition
semantics, no rule for what a row looks like after it is decided. And the sharpest gap is at
the end: R5 routes critical state to a page-level banner, §5.2 forbids stacking banners, and
a queue's critical state is per-row and plural. As written, the document has no legal way to
render "this row is critical". §8.4.6 fixes that.

#### 8.4.1 Claim and assign

Two ownership implementations ship today and they disagree. The lightweight one sets
`_locking` then `claimedBy` / `claimedAt` directly on the request record, with no permission
check at claim time `[code]` `eyvar_ops_panel_v40_fixed.html:11876`, `:10237` — the gate
appears only at commit `[code]` `:11885`. The full one is `DB.ownership`, keyed
`type + ':' + id` `[code]` `:18858`, with `claimItem` `[code]` `:18877-18892`, `releaseItem`
`[code]` `:18897`, confirmed takeover `[code]` `:18942-18954`, a 30-minute stale expiry
`[code]` `:18853`, and audit on every transition. The second is the model; the first is a
defect.

The owner chip is three states `[code]` `:18928-18941`: unclaimed → `✋ Claim`; yours →
success tone, `✋ yours · 4m`, plus a release control; someone else's → warning tone,
`✋ Layla`, plus `take over`.

Two behaviours need naming as defects. `inboxOpen()` claims silently on open
`[code]` `:19301-19310` — deliberate, so two people do not start the same case, but it means
there is no way to *look* at a queue item. And the stale sweep runs as a side effect of
*reading* ownership `[code]` `:18865-18875`, so rendering the inbox mutates state and writes
audit rows up to three times per item every 20 seconds.

#### 8.4.2 SLA countdown display

There are at least six countdown components in the file: `.sla-bar` / `.sla-fill`
`[code]` `:333-334`, the `.days-ok` / `.days-warn` / `.days-crit` pill trio
`[code]` `:140-142`, `dueChip` `[code]` `:19230-19238`, `reqSlaBadge` `[code]` `:9921-9930`,
`subReqSlaBadge` `[code]` `:9937-9947`, and `slaBadge` `[code]` `:14791-14803`. `.days-ok` is
byte-identical to `.b-green` and `.h-green` — the D6 defect in §6.3 — and the audit records
that `.sla-bar` and the `.days-*` trio have no governing rule at all. This is that rule.

**One component.** A remaining-time pill, plus an optional 3 px `.sla-bar` track beneath it
`[code]` `:333-334` shown only when the total window is known.

Format comes from `fmtAge` `[code]` `:14630-14636`: under an hour `12m left`; under a day
`3h 20m left`; beyond that `2d 4h left`; overdue `overdue 14m`. Items with no deadline read
`no clock` in neutral and sort last — "it has no clock, so it cannot be more urgent than
something that has one" `[code]` `:19222-19224`.

**Three bands, mapped to §3.4:** ≥ 50 % of the window remaining → neutral; < 50 % → warning;
breached → critical, which under R5 cannot be a pill, and is therefore handled by §8.4.6.

The bar's denominator MUST be the item's own SLA target. Today it is the literal `90`
`[code]` `:11652`, so the bar means something different on every queue that borrows it.

#### 8.4.3 Escalation

Breach crossing is already modelled correctly once: at 180 s the instant-request engine sets
`no_drivers`, sounds an alert, toasts, pushes one ops notification and writes
`logAction('sla_breach')` `[code]` `eyvar_ops_panel_v40_fixed.html:12544-12553` — once, at
the crossing, not on every subsequent tick. Multiple crossings inside one tick are batched
into a single notification with a count, with the reasoning written into the source
`[code]` `:9674-9678`. Both behaviours are the rule.

Two are not. `playAlertBeep()` fires unconditionally with no mute
`[code]` `:9731-9749`, and `reopenSubReq()` rewrites `requestedAt` to now
`[code]` `:10302-10310`, restarting the clock and destroying the original ask time.

#### 8.4.4 Disposition

A queue's dispositions are a closed set, declared per queue, rendered as buttons in the row's
action cell. The applicant queue is the reference: `Reject` (danger) and `Approve` (success),
side by side, replaced entirely once decided `[code]` `:10925-10928`.

The gating defect is systemic: claim and disposition controls render regardless of
permission and only check at commit `[code]` `:10237`, `:11876`. An operator clicks, waits,
and is told no.

#### 8.4.5 What visibly happens to a row after a decision

The row converts in place. It does not vanish — a row that disappears on click gives the
operator no confirmation of what they just did and no route to undo it. Actions are replaced
by `decisionBadge()`, which names outcome, actor and reason
`[code]` `eyvar_ops_panel_v40_fixed.html:10905-10909`, with the timestamp beneath
`[code]` `:10925`. The same badge drives the detail page's inline status banner
`[code]` `:7124`.

Two corrections. `decisionBadge` renders rejection as `b-red` `[code]` `:10907`, which R5
bans — and §3.4 already supplies the right answer: a rejection is a *terminal factual
outcome with no action left*, which is the neutral-plus-solid-dot case, exactly like
`Refunded` and `Voided`. And the decided row is dimmed with `opacity:.7`
`[code]` `:10929`, which is §4.6's disabled treatment and therefore says "this will become
available again". Decided rows drop to `--muted` text and lose their interactive
affordances instead.

#### 8.4.6 The row-level critical signal — amending R5 (R5a)

**The problem, stated exactly.** R5 says critical state goes to a banner or a red action, not
a red pill. §5.2 says banners MUST NOT stack — merge conditions into one banner with a count.
A queue's critical state is per-row and there can be nine of them at once. So: nine banners
is illegal, one banner cannot point at nine rows, and a red pill on each row is illegal. The
document currently offers no legal rendering.

**[ruling] The solution is three parts, and all three are required.**

**(a) One aggregate banner, with a count and a filter.** §5.2's merge clause is the licence:
a single page-level critical banner reading `4 items are past their SLA.` with one secondary
button, `Show only breached`, that filters the list to them. This is the page-level half R5
demands, it satisfies §5.2's no-stacking rule by construction, and it gives the operator a
route from the banner to the rows.

**(b) A leading edge marker on the row — not a badge.** A 3 px full-height bar in `--red` on
the row's leading edge, drawn as `box-shadow: inset 3px 0 0 var(--red)`. This is legal under
R5 because it is not a badge: it has no pill geometry, no fill-plus-text pairing, no label,
and sits outside the row's content box, so it cannot be mistaken for or confused with a
status token from the §3.4 palette. The idiom is already in the product for a non-badge
state signal — the active nav item uses `box-shadow: inset 3px 0 0 var(--blue)`
`[code]` `eyvar_ops_panel_v40_fixed.html:43`.

**(c) The countdown pill must say it in words.** The marker is never the only signal. The
row's countdown pill switches to `overdue 14m` in warning tone, so the state is legible with
colour removed, at 4.5:1 contrast, and to a screen reader. Colour-only critical state is
banned here exactly as §3.4 bans colour-only badges.

**R5a [ruling], amending R5.** R5 stands: *no red badges*. It is amended to name the complete
set of places red is permitted, so this is not re-litigated per feature:

1. A destructive action (button), per §4.6.
2. A page-level critical banner, per §5.2 — at most one per page.
3. **A 3 px leading edge marker on a queue row whose SLA has breached**, always accompanied
   by the word `overdue` in that row's countdown pill.
4. A map marker, per §8.1.5 — a marker is not a badge.

Red remains banned as a pill or badge fill in every other case, including
`.b-red` `[code]` `:120`, `.days-crit` `[code]` `:142`, and `.h-red` `[code]` `:134`. All
three are non-conforming as used and are the concrete work item behind D5 and D6 in §6.3.

One further consequence: under R18 (§8.1.6) a loop must not encode severity, so a breaching
row MUST NOT pulse. `reqPulse` `[code]` `:145` is not a critical signal and MUST NOT be
applied to one.

The `.al-row` alert row already carries a second red container — the `.ai-r` icon tile
`[code]` `:158`, `:163` — which is legal for the same reason the edge marker is (an icon
container, not a pill). But a row MUST carry at most one red carrier: the edge marker or the
icon tile, never both, or red stops meaning "this one".

**Rules — claim and assign**

- Exactly one ownership model MUST exist. The `DB.ownership` model (`:18858`, `:18877`, `:18897`, `:18942`) is that model; the ad-hoc `_locking` / `claimedBy` fields on request records (`:11876`, `:10237`) MUST be migrated onto it.
- Every queue row MUST render an owner chip in a fixed position — the last cell before the action cell — in one of exactly three states: `✋ Claim` (neutral), yours (success tone, with elapsed hold time and a release control), someone else's (warning tone, with their name and a `take over` control) (`:18928-18941`).
- A claim control MUST check permission at click, not only at commit (`:10237`, `:11876` check only at commit).
- Taking over a live claim MUST open a confirm modal (§5.3) whose title names the current owner and whose body states that they lose the item without being asked (`:18942-18954`).
- A claim MUST expire after a stated idle period, that period MUST be displayed in the UI (30 min, `:18853`), and expiry MUST be evaluated on a timer — never as a side effect of a render (`:18865-18875` expires claims while reading them).
- Opening a queue item MUST NOT claim it. A row MUST expose `Open` and `Claim` as two separate controls (`:19301-19310` claims on open).
- A queue row MUST NOT carry a §3.3 selection checkbox unless every bulk action offered is a claim or assign action. Bulk disposition MUST NOT ship.

**Rules — SLA countdown**

- Exactly one countdown component MUST exist: a remaining-time pill, plus an optional 3 px `.sla-bar` track (`:333-334`) shown only when the total window is known. `.days-ok` / `.days-warn` / `.days-crit` (`:140-142`), `dueChip` (`:19230`), `reqSlaBadge` (`:9921`), `subReqSlaBadge` (`:9937`) and `slaBadge` (`:14791`) MUST collapse into it.
- The countdown label MUST use one format: `Nm left` under 60 minutes, `Nh Mm left` under 24 hours, `Nd Hh left` beyond, `overdue Nm` when breached (`:14630-14636`).
- An item with no deadline MUST read `no clock` in neutral tone and MUST sort last (`:19222-19224`). It MUST NOT render `—` and MUST NOT be given a synthetic deadline. Three queues currently hardcode `dueMs = -1` (`:19155`, `:19169`, `:19192`) and MUST NOT ship.
- The countdown MUST use exactly three tone bands: ≥ 50 % of window remaining → neutral; < 50 % → warning; breached → the §8.4.6 critical signal.
- The `.sla-fill` width MUST be computed from the item's own SLA target. A hardcoded denominator (`90` at `:11652`) MUST NOT ship.
- The countdown MUST tick from the single app clock (`:11968`), MUST update at most once per second, and MUST NOT re-sort or reflow the list while §8.1's pointer-and-focus guard is active.

**Rules — escalation**

- A breach MUST fire its escalation exactly once, at the crossing: one audit entry, one ops notification (`:12544-12553`). It MUST NOT re-fire on subsequent ticks.
- Multiple breaches inside one tick MUST be batched into one notification carrying a count (`:9674-9678`). N toasts MUST NOT ship.
- An audible alert MUST be opt-in and MUST have a visible mute control (`playAlertBeep()` at `:9731-9749` is unconditional).
- Escalation MUST NOT reassign, re-queue, or release ownership automatically.
- Re-opening a decided or expired item MUST preserve its original request timestamp and MUST record the re-open as a separate event. Rewriting `requestedAt` to now (`:10302-10310`) MUST NOT ship.

**Rules — disposition**

- Every queue MUST declare a closed, documented set of dispositions. Each MUST be labelled with a verb (§5.7) and rendered in the row's action cell (`:10925-10928`).
- At most one disposition per row MAY be a filled primary (§4.6). A destructive disposition MUST confirm (§5.3).
- A disposition control MUST check permission at click, not only at commit.
- On decision the row MUST convert in place: action controls replaced by `decisionBadge()` naming outcome, actor and reason (`:10905-10909`), with the decision timestamp beneath (`:10925`).
- A decided row MUST NOT be removed by a background refresh. It MUST remain visible until the operator navigates away or explicitly clears it.
- The queue's count badge and its sidebar badge MUST decrement immediately on decision, while the decided row is still on screen.
- A decided row MUST NOT use `opacity` to de-emphasise (`:10929` uses `.7`, which is §4.6's disabled treatment). It MUST switch its primary text to `--muted` and drop its hover and click affordances.
- A rejection badge MUST be **neutral with a solid dot**, per §3.4's terminal-factual-outcome case. `b-red` (`:10907`) MUST NOT ship. **R5, upheld.**
- A decided row MUST expose a re-open control only where re-opening is permitted, and re-opening MUST NOT restart the original clock.

**Rules — row-level critical signal (R5a, amending R5)**

- A page whose queue contains one or more breached items MUST render **exactly one** page-level critical banner stating the count (`4 items are past their SLA.`) with one secondary button that filters the list to the breached items. It MUST NOT render one banner per item (§5.2).
- A breached row MUST carry a 3 px leading edge marker, `box-shadow: inset 3px 0 0 var(--red)`, following the existing non-badge edge-marker idiom (`:43`).
- A breached row MUST also render the word `overdue` in its countdown pill. The edge marker MUST NOT be the only carrier of the state.
- A breached row MUST NOT render a red badge or pill of any kind. `.b-red` (`:120`), `.days-crit` (`:142`) and `.h-red` (`:134`) MUST NOT be used for it.
- A breached row MUST NOT pulse, blink, or loop (R18, §8.1.6). `reqPulse` (`:145`) MUST NOT be applied to a critical state.
- A row MUST carry at most one red carrier — the edge marker or an `.ai-r` icon tile (`:163`), never both.
- Red MUST appear only in the four places R5a enumerates: a destructive button, one page-level critical banner, a breached-row edge marker, and a map marker. Any fifth use requires a written entry in §6.2.

---

### 8.5 Dense tables: per-column controls and column pinning

**What was tried and why it does not fit.** §3.1 and §3.2 govern a list of records that fits.
Every control they define lives in the **toolbar**: one sort popover, one filter chip row, one
optional columns icon. That works at Shopify's ~40 px rows and six-to-eight columns on a page
someone visits. Eyvar runs 23 of its 41 pages as tables at **32 px rows** (§6.2 D-2), some
carrying twelve columns `[code]` `eyvar_ops_panel_v40_fixed.html:740-751`, in front of an
operator who works one of them all day. Two things break.

**First, the toolbar cannot reach a column.** §3.2's sort popover asks *which field*, which
means the operator must translate "I want this column sorted" into "find its name in a radio
list." §3.1's filter chips have the same indirection. The column is right there, under the
pointer, and the control is 400 px away in a popover.

**Second, §3.1 concedes horizontal scroll and then stops.** *"Wide tables clip at the card's
right edge"* `[observed]` `02-orders/orders-list-with-metrics-row.webp` — the `Tags` column is
cut off with no scrollbar in frame. The document adds: *"That they scroll horizontally, and that
the checkbox + primary cell stay pinned while they do, are both `[Polaris]` — a static frame
cannot show a scroll."* So §3.1 has **already committed to implicit column pinning** on recall,
with no rule attached, no statement of which columns, no visual treatment, and no RTL clause —
in a document whose §9 exists because directional geometry is where this product breaks.

**And §2.5 already makes it a MUST, for exactly one surface:** *"Bulk grids MUST be edge-to-edge
with a sticky header row and a **frozen identity column**."* So a frozen column is normative in
this document today — for the full-bleed bulk editor, and nowhere else, with no statement of
which column beyond "identity", no visual treatment, no cap and no RTL clause. §8.5 generalises
that MUST to every dense table rather than inventing a second rule beside it.

Nothing in §1–§5 covers an operator freezing a column of their own choosing, and Eyvar already
ships one, badly (§8.5.1).

#### 8.5.1 What already exists, and the defect in it

**Shopify does freeze a column** — in the full-screen bulk-edit grid, not the index table.
`03-products/products-bulk-editor-grid.webp` and `03-products/products-bulk-editor-price-columns.webp`
are the same grid at two horizontal scroll offsets. Diffing them with PIL `[observed]`:

```
region                              mean channel diff   max
Product title column   (x < 210)                0.13     14   <- WebP compression noise
first scrolling column (x 230+)                 8.25    220
```

The first column does not move; `Tags` scrolls away and `Status` slides up against it. The
frozen boundary, sampled at a body row in both frames:

```
x           204 ... 211   212    213    214   215
grid        247,247       241    248    255   254
scrolled    247,247       241    248    255   254
```

`[observed]` **One 1 px hairline, identical scrolled and unscrolled.** No gradient falloff, so
no shadow — a `0 ... 6px` blur would render as a ramp across four to eight pixels and there is
none.

**Eyvar already pins a column, physically.** `[code]` `eyvar_ops_panel_v40_fixed.html:751` and
`:3555`, on the twelve-column Subscriptions index:

```html
<th style="position:sticky;right:0;background:var(--bg2);
           box-shadow:-4px 0 6px -4px rgba(0,0,0,.12)">Actions</th>
```

with `.tbl-scroll{overflow-x:auto}` at `:147` as the scroll container `[code]`. Three readings,
all load-bearing:

1. **The thing operators pin is the row's action control**, not a data column. That is a real
   requirement, and §8.5.3 makes it structural rather than optional.
2. **`right:0` has no `[dir="rtl"]` counterpart anywhere in the file.** The only RTL overrides
   are `.sb` `:383-385` and `.settings-nav-col` `:401-402` `[code]`. In Arabic the pinned column
   freezes to the edge the reader's eye *leaves*, and scrolling carries it further away. Same
   family as the three defects §9.1 already lists.
3. **The shadow carries a negative x-offset.** §1.4's elevation set is `offset-x: 0` throughout,
   deliberately, so elevation never needs an RTL branch. `-4px 0 6px -4px` is exactly what that
   closure exists to prevent. It is a defect, not a precedent.

#### 8.5.2 Per-column controls

**[ruling]** A header cell contains **exactly one** interactive element — a button opening a
menu — or **none**. Never two. The menu carries only what the column declares: a sort direction
pair, a filter, a pin, a hide. This is the deviation sanctioned as **D-6**; §6.2 carries the
full argument and the three clauses it suspends.

```
+- 200px -----------------------+   start-aligned header      end-aligned header
| (*)  ^  Sort A to Z           |   +------------------+      +------------------+
| ( )  v  Sort Z to A           |   | Captain  ^  v    |      |    v  v  Trips   |
|      Clear sort               |   +------------------+      +------------------+
| ----------------------------- |     label flush to the        label flush to the
|      Filter...                |     inline-START              inline-END, so header
|      Clear filter             |                               and value share one
| ----------------------------- |                               edge — R4 upheld
|      Pin column               |
|      Hide column              |
+-------------------------------+
```

**Glyph assignment, made disjoint.** §1.5 and §9.1 translation row 9 reserve the trailing caret
*"exclusively for controls that open a menu or select."* §3.1's `[observed]` sort indicator is
also a chevron. Both cannot hold once every header is a menu, so:

| Glyph | Means |
|---|---|
| `⌄` | this opens a menu — header trigger, filter chip, saved-view tab, `More actions` |
| `↑` `↓` | sort direction — header indicator, and §3.2's direction pair, which already uses arrows `[observed]` |
| `⇅` | the toolbar sort control |

Neither mirrors in Arabic. `↑ ↓` are vertical magnitude (§9.2); `⌄` points block-end and only
its *position* moves.

**The affordance is not hover-only.** The `⌄` renders at rest, at `--muted`, on every header
with a menu, and takes `--ink` plus a `--bg2` cell fill on `:hover`, on `:focus-visible` and
while its menu is open — the same two-step §7.3 already requires of the row kebab. §7 beats §3,
and capability that is invisible without a pointer does not exist for a keyboard operator.

**Sorting stays single.** Exactly one column carries a sort arrow, ever. The header menu and
§3.2's toolbar popover are two triggers writing one value; a second sort field would need a
transport change and an ordinal glyph in a 32 px cell, and neither is warranted.

**Filtering stays one model.** A column filter is one filter specification keyed on the column's
field, rendered as a chip in §3.2's existing chip row and summarised in the header as
`Label: value` in semibold. It is not a second filter state living somewhere new. The chip row
remains the complete readout; the header summary may truncate.

**A ledger header may filter and pin. It may never sort.** §8.3.3, unchanged: a running balance
is meaningful only in posting order. Filtering selects a subset of postings and leaves each
posting's persisted `balanceAfter` intact; reordering destroys the column's meaning.

#### 8.5.3 Column pinning

**[ruling]** Three regions. Only one of them belongs to the operator.

```
+-- PINNED, inline-start --------+|~~~ scrolls ~~~~~~~~~~~~~~~~~~~+|+- PINNED, inline-end -+
| # | Captain      ^ v | City v ||| Plan v | Trips v | Earned v ||          ...          |
|---+------------------+--------|||--------+---------+----------|+-----------------------+
| # | Nora Al-Harbi    | Riyadh ||| Weekly |     412 |  4,218.00||          ...          |
| | | DRV-0106         | Dammam ||| Weekly |       0 |      0.00||          ...          |
+-^-+------------------+--------+|+--------+---------+----------++-----------------------+
  |  R5a marker rides the pinned  hairline boundary
  |  region and NEVER scrolls away
```

| Region | Contents | Decided by |
|---|---|---|
| Implicit inline-start | §8.4's row-critical marker lane · selection checkbox · column index 0, the identity | the component, always |
| Operator inline-start | any columns within the width budget, rendered in **column-declaration order** | the operator |
| Implicit inline-end | the row overflow kebab (absent on a ledger) | the component, always |

**The pinned region renders in column-declaration order, never in the order the operator
clicked.** Pinning is a freeze, not a reorder: if pinning one column moved it in front of another
merely because it was clicked first, the operator would have performed a column reorder they
never asked for, and pinning a second column would visibly shuffle the first. Column *order* is
separate per-view state (§3.1 *Column visibility*).

**Only the inline-start edge is operator-pinnable.** The inline-end is spoken for: §3.1 fixes
the kebab at the row's inline-end and `[code]` `:751` shows that the action control is what
operators freeze there. Allowing arbitrary data columns to be inserted between the scrolling
region and the row's action control puts a moving boundary around the one control that must
stay put. Shopify freezes one region, at the start `[observed]`.

**The identity column is never hideable and never unpinnable.** §3.1: the first data cell MUST
be the identity and MUST be a link to the record. You cannot hide or scroll away the only thing
that navigates.

**The row-critical marker rides the pinned region.** §8.4's 3 px leading-edge marker is drawn at
the row's inline-start. On a scrolling region it would vanish the moment the operator scrolled,
and R5a's three parts are explicit that *none substitutes for another*. The implicit block
always exists, so the marker always has a stationary host.

**One guard, measured against the floor — and therefore no resize behaviour at all.** The pinned
region may not exceed **50 %** of the table's inline size **at the narrowest width that table
will ever have**: the content region at the D2 floor, 976 px with both nav columns expanded
(`design/00-shell.md` §1). The implicit block is exempt — it is not operator state. At the floor
that leaves roughly 228 px, or one typical operator pin.

Two consequences:

- **A count cap is redundant.** Three narrow columns and one wide one are not the same risk, and
  a width budget already refuses whichever combination is too much. A second refusal reason would
  be a second sentence to write and a second disabled state to test, for no additional
  protection.
- **Pins never change on resize.** Because the budget is computed against the floor, a pin
  accepted on a wide monitor is still valid at 1280 px. The budget is **not** a live measurement,
  so no demotion-and-restoration path exists, and none may be built — it would be a code path
  nothing can reach. A full-bleed bulk grid (§2.5) has no nav columns and legitimately declares a
  larger floor; that is the only sanctioned override.

A pin that would breach the budget renders **disabled in place, with its reason on a second line
inside the menu item** — gated at render, never at commit (§4.6, §8.4.4). Not a tooltip: §5.7
keeps constraints out of tooltips. The operator is never shown a pixel figure.

**A pinnable column MUST declare an inline size.** §3.1 already requires wide tables to *"scroll
horizontally rather than shrink columns below legibility"*; a column sized `auto` additionally
has no sticky offset until layout has run, and an offset computed after layout is one frame of
visible jump on every scroll.

**Visual treatment: a hairline, and no elevation tier at all.** §1.4 gives the sticky table
header a hairline shadow once the body scrolls under it, and a pinned column is the inline-axis
analogue — but it does **not** inherit the token, for three reasons in order of force:

1. **The axis is wrong and the closed set was closed on purpose.** Every elevation tier is
   `offset-x: 0` so elevation is direction-invariant and needs no RTL branch. Applied to an
   inline edge, a block-axis shadow renders *below* the column; giving it an x-offset creates a
   token that **must** mirror — reintroducing precisely the defect `[code]` `:751` already has.
2. **The measurement says hairline.** Shopify's frozen boundary is one 1 px step, unchanged by
   scroll `[observed]` (§8.5.1).
3. **The primary signal is motion, not the line.** Content moves; the pinned block does not. The
   boundary is a supporting delimiter, which §7.1 classes as a decorative rule with no contrast
   minimum.

So: `border-inline-end: 1px solid var(--border)` on the **innermost pinned column at the
inline-start edge** — the one the scrolling body actually slides under — and
`border-inline-start` on the innermost one at the inline-end edge, **rendered only while the
table actually overflows**. The boundary belongs to a **cell**, not to a wrapper: at the
inline-end edge the innermost pinned column is the *first*-declared one, so "the last in the
array" is the wrong column. With no overflow nothing is frozen in any meaningful sense, and a
permanent vertical rule on every index table in the product would be a large visual change
bought for nothing. Pinned cells take the row's own background, including its hover fill, so
scrolling content cannot show through.

**How the operator knows a column is pinned**, in order: it does not move · the boundary hairline
groups the block · the header menu reads `Unpin column`, state in words · the columns popover
shows the pin toggle pressed. **No pin glyph in the header** — there is none in the icon
vocabulary, and emoji are banned (§5.7).

#### 8.5.4 Bidirectionality — the part most likely to ship broken

Pinning is inherently directional, and §9.1's mandate is not satisfied by good intentions.

| Never | Always |
|---|---|
| `left: 0` / `right: 0` | `position: sticky; inset-inline-start: 0` (inline-end region: `inset-inline-end: 0`) |
| `border-right` | `border-inline-end` |
| `text-align: right` on a numeric header | `text-align: end` — R4, and §9.1 row 2 |
| `box-shadow` with an x-offset | no shadow at all (§8.5.3) |
| `scrollLeft > 0` | `Math.abs(scrollLeft) > 0` — see below |

**What an operator switching to Arabic sees**, stated as a promise because this is what gets
asked after it ships:

- **Which columns are pinned, and their order within the block, do not change.** The identity is
  still first in reading order; it moves from the physical left to the physical right.
- The pinned block, the boundary hairline and the kebab region all move to the mirrored edge.
  `inset-inline-*` and `border-inline-*` do this with no branch.
- Horizontal scroll direction reverses, and **the scroll offset resets to the inline-start** on
  a direction change. An offset carried across the flip is meaningless and lands the operator
  mid-table.
- The row-critical marker stays on the row's leading edge, now physically right, because it
  rides the pinned block.
- Sort arrows do not mirror (§9.2, vertical magnitude). Numeral runs in a range filter do not
  reorder (§9.2).
- A `Label: value` header summary needs the value **bidi-isolated**: a Latin city name, an id or
  `100–500` inside an Arabic label jumps sides without it (§9.2).

**Two mechanical traps.** A right-to-left scroll container's `scrollLeft` is **negative** under
the current specification (Firefox, WebKit, current Chromium) and was positive or inverted in
older engines `[standard]`; anything testing "has this scrolled" must normalise or it is
silently wrong in Arabic. And the second and third pinned columns need an `inset-inline-start`
equal to the accumulated inline size of those before them — a measured number applied to the
**logical** property, never to `left`.

**If a pinned layout is ever persisted, each pin is stored as a column id plus a *logical* edge —
`start` or `end`, never `left` or `right`, and never a pixel offset.** A physical edge makes
every saved layout wrong for every Arabic operator on the first load. Render order is not stored
at all: it comes from the column declaration, and a stored order would be a second, silently
competing source of truth for something §3.1 already governs.

**Rules**

- A table header cell MUST contain **exactly one** interactive element — a button that opens a menu — or **none**. It MUST NOT contain two. **§6.2 D-6.**
- The header menu's affordance MUST render at rest. It MUST NOT be revealed only on `:hover` (§7.3).
- Exactly **one** column MUST carry a sort indicator at any time, in any mode. The indicator MUST be an arrow (`↑` / `↓`) and MUST NOT be a chevron; a chevron in a header MUST mean only that a menu opens (§1.5, §9.1 row 9).
- A ledger header MUST NOT offer sort or hide. It MAY offer filter and pin. This MUST be enforced by the ledger table type carrying no sort members, not by a runtime flag (§8.3.3).
- A column filter MUST produce exactly one filter specification keyed on the column's field, MUST render as a chip in §3.2's chip row, and MUST set the same filtered state that a toolbar filter sets. A column MUST NOT be able to hold two filters at once.
- A filter control MUST NOT be rendered inside a menu. The menu MUST close and a popover MUST open (menu typeahead consumes the keystrokes).
- The row-critical marker lane (§8.4), the selection checkbox and the identity column MUST be pinned to the inline-start implicitly and permanently. The identity column MUST NOT be hideable or unpinnable.
- The row overflow kebab MUST be pinned to the inline-end implicitly and permanently wherever it exists.
- A breached row's leading-edge marker MUST remain visible at every horizontal scroll offset. **R5a's three parts MUST survive scrolling.**
- The pinned region MUST render in column-declaration order. Pinning a column MUST NOT reorder any other column.
- Operator pinning MUST be offered at the inline-start edge only, and the pinned inline-start region MUST NOT exceed 50 % of the table's inline size **at that table's floor width**. There MUST NOT be a second, count-based cap.
- The pin budget MUST be computed against a fixed floor width, never against a live measurement. A pin, once accepted, MUST NOT be demoted, discarded or restored by a viewport change.
- A pinnable column MUST declare an inline size. A column sized `auto` MUST NOT be pinnable.
- A pin blocked by the budget MUST render its control **disabled in place with its reason available**, and MUST NOT be reported only after a click (§4.6, §8.4.4). The reason MUST NOT be a tooltip (§5.7) and MUST NOT state a pixel figure.
- The boundary MUST be drawn on the **innermost pinned column at each edge**, as `border-inline-end` (or `border-inline-start` at the inline-end edge) of 1 px `--border`, MUST render only while the table overflows, and **MUST NOT carry a `box-shadow` of any kind.** `box-shadow:-4px 0 6px -4px` (`:751`, `:3555`) MUST NOT ship.
- Pinned cells MUST be opaque, taking the row's own background including its hover fill.
- The toolbar, the filter chip row, the pagination and the bulk action bar MUST sit **outside** the table's horizontal scroll container.
- A pinned region MUST be positioned with `inset-inline-start` / `inset-inline-end`. `left:` and `right:` (`:751`, `:3555`) MUST NOT ship, and MUST be fixed before the next release.
- Any test for horizontal scroll offset MUST normalise the sign, because a right-to-left container's `scrollLeft` is negative.
- Changing `dir` MUST NOT change which columns are pinned or their order, and MUST reset the horizontal scroll offset to the inline-start.
- A persisted column layout MUST store each pin as a column id plus a **logical** edge (`start` / `end`). It MUST NOT store a physical edge or a pixel offset, and it MUST NOT store a render order — render order comes from the column declaration.
