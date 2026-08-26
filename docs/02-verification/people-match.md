# People (Operations) vs `navattic-web/223f15e5.webp` — match report

**Scale factor:** S = 1.875 (768 px frame ⇒ 1440 px viewport), pinned against three
independents: (a) `docs/06-design-reference/navattic-web/README.md` and DECISIONS D7 both
declare it; (b) 768 × 1.875 = 1440 exactly; (c) an **Inter-metric solve** — I loaded
Navattic's own `Inter-Regular.a74be992.woff2` and measured ink advances for three strings in
the frame (`rows per page`, `an hour ago`, `Not identified`), which back-solve to a body size
of 13.5–13.8 px at S = 1.875, i.e. **14 px within measurement bias**. Read the other way the
same solve gives S = 1.92 ± 0.02, so **S = 1.875 is right to ~2.5 %**. Every "theirs" length
below carries **±3 %**; every "theirs" flat fill is exact (flat fills survive the downscale).

**Ours:** `http://localhost:5199/operations/people` at **1440 × 820**, measured live with
Playwright `getComputedStyle` / `getBoundingClientRect`, plus PIL on a 1:1 capture.
**Reference:** `223f15e5.webp`, region y = 0–470 only (watermark strip ignored);
`cfa43315.webp` and `79a31934.webp` consulted for the sort control and drawer.

> **A second, stronger source became available mid-audit.** Navattic's app stylesheet is
> publicly served: `https://app.navattic.com/_next/static/css/98da06fdab16cbfa.css` (694 KB).
> It contains their **entire declared token set** and their `@font-face` block. Where a value
> below is quoted from that file it is marked `[css]` and is **exact, not sampled**. Every
> `[css]` value I could also sample from the frame agrees with the sample to within 1/255 —
> see *Cross-check* at the end. This removes essentially all colour guesswork from this audit.

---

## 0. Corrections to standing beliefs

Three things the team currently believes are **backwards or misplaced**. They are listed
first because each one, on its own, makes the screen feel wrong while individual hexes match.

| # | Standing belief | Measured truth | Evidence |
|---|---|---|---|
| C1 | *"the canvas **darker** than the nav at `#F5F7F9`"* (DECISIONS D7); ours ships canvas `#f7f8fa` **darker** than nav `#fbfcfd` | **Inverted.** Their **canvas is pure `#ffffff`**; their **nav is `#f6f8f9`** — the nav is the darker surface, the canvas is the lightest thing on screen. | Frame: canvas mean over (600,430)–(760,465), (300,400)–(600,460) and (300,8)–(600,14) = `#ffffff`, deficit 0.00 in all three. Rail x 2–8 = deficit 8.00 for the full 470 px height. `[css]` `--color-bg-default: var(--color-white)`; `--color-bg-muted: var(--color-gray-50)` = `hsl(207 20% 97%)` = **`#f6f8f9`**. |
| C2 | *"the in-card filter-chip strip"* (D7) — ours renders it **inside** the card as a full-bleed band | Their filter strip is a **standalone rounded bar above the card**, same width, with a **13 px white gap** and **no enclosing border**. | Frame: strip fill runs y 105.7 → 131.3; the card's first ink is at y 138.0. Column profile x 176–190 across y 136–137 reads 0.0–1.3 deficit — no card border bridges the gap. |
| C3 | Our `--border: #e5e8ed` is "the hairline" | Their table hairline is **`#f0f2f4`** — a full step lighter. `#e5e8ed` is the equivalent of their **`gray-200` / `border-subtle`**, which they do **not** use for table rules. | Frame: integrated darkness of the row separator = 6.86 across the native rows ⇒ true stroke L = 242.1. `[css]` `--color-border-muted: var(--color-gray-100)` = `hsl(220 14% 95%)` = `#f0f2f4`, **mean 242.1**. Exact agreement. |

---

## 1. Separation mechanism — asked for specifically

**Question: border, tonal step, or shadow?**

| Boundary | Their mechanism | Their value | Our mechanism | Our value |
|---|---|---|---|---|
| Table card ↔ canvas | **1 px border only. No shadow.** | 1 px `#f0f2f4`, radius ≈ 10 px | 1 px border **plus a soft shadow** | 1 px `#e5e8ed`, radius 12 px, `box-shadow` present |
| Row ↔ row | **1 px border-bottom** — no zebra, no tonal step | 1 px `#f0f2f4` on `#ffffff` | 1 px border-bottom | 1 px `#e5e8ed` on `#ffffff` |
| Column ↔ column | **1 px vertical border on body cells only** — absent from the header strip | 1 px, L ≈ 238 (`#f0f2f4` within webp error) | **none** | — |
| Header row ↔ body | **Tonal step plus 1 px border** | fill `#f6f8f9` on `#ffffff`, rule `#f0f2f4` | **1 px border only** — the header is white | header `#ffffff`, rule `#e5e8ed` |
| Filter strip ↔ everything | **Tonal step only**, floating, no border | fill `#f6f8f9`, radius ≈ 8 px | Tonal step, full-bleed **inside** the card, with a bottom border | fill `#f4f6f8` + 1 px `#e5e8ed` |
| Nav ↔ canvas | **Tonal step plus 1 px divider**; nav is the *darker* side | `#f6f8f9` \| `#ffffff`, divider ≈ `#f0f2f4` | Tonal step, **inverted**; nav is the *lighter* side, no divider | `#fbfcfd` \| `#f7f8fa` |
| Top bar ↔ page | 1 px bottom hairline on white | `#f0f2f4` | 1 px bottom hairline on canvas grey | `#e5e8ed` on `#f7f8fa` |

**Shadow test (theirs).** Column profile immediately outside the card at a text-free row band
(y 224–232): x 722–727 = **0.00**, x 728–730 = 1.0–2.0, x 731 = 3.33 (the border), x 733+ =
**0.00**. On the inline-start side: x 168–176 = **0.00**, x 178–179 = 3.33. The signal
collapses to zero within one pixel of the stroke on both sides. **There is no shadow, no
glow, and no second tonal ring.** Ours spills 3.0 deficit one pixel outside the border on
both edges — a faint but real shadow the reference does not have.

**The headline.** Their whole page is white, and *separation is bought with two tinted strips
(`#f6f8f9`) and a very light 1 px rule (`#f0f2f4`) — nothing else.* Ours does the opposite: a
tinted canvas, a white card lifted off it with a shadow, and a hairline **1.7× darker** than
theirs. That is why the two read differently even where the hexes are close.

---

## 2. The real type stack — asked for specifically

### Theirs — resolved, not requested

From `98da06fdab16cbfa.css`:

```
font-family: var(--nv-font-sans, Inter), ui-sans-serif, system-ui, sans-serif;
@font-face { font-family: Inter var experimental; font-weight: 100 900; ... }
@font-face { font-family: Inter var;             font-weight: 100 900; ... }
@font-face { font-family: Inter; font-weight: 100...900; font-display: block;
             src: url(/_next/static/media/Inter-Regular.a74be992.woff2) format("woff2"), ... }
```

`--nv-font-sans` is **not defined anywhere in the stylesheet**, so the declared fallback takes
it. The only families they self-host are Inter faces. **Navattic resolves to Inter** —
self-hosted, static instances 100–900 plus italics, `font-display: block`. Their marketing
site independently declares `font-family:'Inter','Inter Fallback'`. No ambiguity, and no
system-font fallback in play.

### Ours — resolved, not requested

`--font-sans: "Geist Variable", "Noto Naskh Arabic Variable", "Noto Naskh Arabic",
"Noto Sans Arabic", ui-sans-serif, "Segoe UI", system-ui, sans-serif`

**Ours resolves to Geist Variable.** Verified, not assumed: on a rendering route
`document.fonts.check('400 20px "Geist Variable"')` returns `true`, the face reports `loaded`,
and a span carrying the full stack measures **84.56 px** for `rows per page` at 13 px/400 —
identical to the same span forced to `"Geist Variable"`, and **≠ 81.84 px** (`Segoe UI`, the
next real family in the stack). So the stack is not silently falling through.

*One caveat worth logging:* on a route where the app throws before painting, the same probe
returns `check → false` and the stack measures as `Segoe UI`. **Geist is `font-display`-dependent
and there is a real fallback window** — which Navattic closes with `font-display: block`.

### Computed comparison

| Role | Theirs (Inter) | Ours (Geist Variable) | Delta |
|---|---|---|---|
| Family | **Inter**, self-hosted, `font-display: block` | **Geist Variable**, self-hosted | different family — Geist is narrower and more geometric; at equal px it sets ~4 % short |
| Table cell / body | **14 px / 400 / 20 px** | **13 px / 400 / 20 px** | **−1 px** |
| Column header | ≈ **14 px / 500**, same optical size as the cell text (ink heights match at 7–8 native px) | **12 px / 500 / 16 px** | **−2 px**, and ours is optically smaller than its own body text; theirs is not |
| Identity, line 1 | 14 px / 600 | 13 px / 400 | −1 px, **−200 weight** |
| Identity, line 2 | ≈ 12–14 px / 400 | *does not exist* | structural |
| Page H1 | **≈ 22 px / 600** (solve: 21.95 px from ink width 43 native) | **17 px / 600 / 24 px** | **−5 px (−23 %)** |
| Page subtitle | *does not exist* — no count line under the H1 | 12 px / 400 / 16 px | structural |
| Nav item | **≈ 14 px** (solve: 14.2–14.4 px) | 13 px / 400 / 20 px | −1 px |
| Nav title | **≈ 16 px / 600** (solve: 15.5 px) | 13 px / 600 / 20 px | **−3 px** |
| Letter-spacing | not separately measurable at S = 1.875 — **unmeasured** | `normal` everywhere | unmeasured |
| Line-height | not separately measurable — **unmeasured**; their `[css]` Tailwind scale gives `--text-sm: .875rem / calc(1.25/.875)` = **14 / 20 px** | 20 px at 13 px | ratio 1.43 vs ours 1.54 |

---

## 3. Structural gaps — what exists in one and not the other

Ranked by what an eye lands on first.

| # | Region | Reference | Ours | Fix |
|---|---|---|---|---|
| S1 | **Page ground** | Main canvas is **`#ffffff`**; the nav is the tinted surface | Canvas `#f7f8fa`, nav `#fbfcfd` — **the tonal direction is reversed** | Swap: canvas → `#ffffff`, nav → `#f6f8f9`. Highest-leverage single change on the page. |
| S2 | **Table row height** | 6 rows at **61.9 px pitch** | 25 rows at **33 px pitch** (row 1 = 41 px where Arabic wraps) | Nearly double the row box. Their density is *roomy rows, small controls*; ours is *small everything*. |
| S3 | **Column hairlines** | 1 px vertical rule between **every** body column; **none in the header strip** | none | Add `border-inline-end` on `td` only, `#f0f2f4`. Do **not** put them in the `th` row. |
| S4 | **Identity cell** | 30 px avatar circle plus **two lines** (name 14/600 `#384252`; secondary `#9ca3b0`) | one line, 13/400, no avatar | Add avatar and secondary line. Secondary ink cannot be their colour — see *Will not match, by law*. |
| S5 | **Table header ground** | Tinted strip **`#f6f8f9`**, 32 px | **White**, 32 px | Tint the header. The height already matches. |
| S6 | **Card furniture** | No selection checkbox column, no trailing `…` actions column, no status badges in this table | 40 px checkbox column, trailing actions column, green `Active` badges | These are §3/§8 patterns, not Navattic omissions — keep them, but budget for them: they cost ~80 px of the row and change its rhythm. See W4. |
| S7 | **Tab strip** | **None.** No tabs anywhere; the card holds only the table. | `Captains / Applications / Compliance / Riders` tab row inside the card, 28 px tall, above the filter strip | Their equivalent scoping lives in the **top-bar breadcrumb** (`Visitors / [All visitors ⌄]`). Product decision, not a styling one. |
| S8 | **Toolbar** | **Above the card**, on the canvas: `[Search 184×30]` `[Filter 1]` inline-start; `[Sort · Last Seen ⌄]` `[Jan 12, 2026 – Now]` inline-end. All **labelled**, all 30 px tall. | **Inside the card**, four **unlabelled 24 px icon buttons** (`Search`, `Add filter`, `Columns`, `Sorted by Captain`) crammed at the inline-end of the tab row | Move out of the card, label them, grow to 30 px. |
| S9 | **Filter strip position** | Standalone tinted bar **above the card**, 1039 × 48, 13 px gap below it | Full-bleed band **inside** the card, 1102 × 37, with a bottom border | Detach it, widen to card width, grow 37 → 48 px, drop the border. |
| S10 | **Filter strip content** | `Events:` label · `Engaged ✕` chip · `⌄` · `+ Add filter` · `✕ Clear` | `+ Add filter` only | Add the label, the chip, and Clear. |
| S11 | **Page header actions** | `Export` button plus 2 icon buttons, inline-end on the H1 row | none | Add. |
| S12 | **Top bar** | Breadcrumb `Visitors / [All visitors ⌄]` inline-start; **one** item (`Support`) inline-end. Nothing centred. | 400 px centred search, `Mine 2`, `On call: unassigned`, bell, avatar | Their top bar is nearly empty; ours is the busiest strip on the page. |
| S13 | **Nav section headings** | `Analyze` · `Leads` · `Manage` — three headings partitioning the list | flat list, no headings | Add. |
| S14 | **Nav count badges** | **none** anywhere in the nav or rail | count badge on **every** rail tile (`6`, `35`, `2`, `10`, `99+`) and most sub-nav items (`12`, `3`, `8`, `1`, `4`, `7`) | The badges are the loudest colour on our page and have no counterpart. |
| S15 | **Rail contents** | icon-only, 52 px, no labels, no badges; three glyphs top, three bottom | 80 px with a **text label under every icon** (`Exec`/`Ops`/`Finance`/`Support`/`Admin`) plus badges | −28 px width and drop the labels, or accept a permanent 28 px offset on everything downstream. |
| S16 | **Pagination footer** | **Below** the card, aligned to its edges: `[25 ⌄] rows per page` inline-start; `1-6 of 6 · Previous · Next` inline-end | Exists — `Showing 1–25 of 57 ‹ Previous Next ›` at y = 1080 — but the card is 944 px tall in an 820 px viewport, so **the footer is off-screen and the owner has never seen it** | Cap the table body height so the footer sits in view. |
| S17 | **Table width vs card** | Table exactly fills the card (1039 px, six columns) | Table is **1256 px inside a 1104 px card** → horizontal scroll, 11 columns | Either fewer columns or a wider content column (see G15/G40). |

---

## 4. Measured deltas

Walk order: outer ground → rail → nav column → top bar → page header → toolbar → filter strip
→ card → header → row → cell → footer → overlays.

| # | Region | Property | Theirs | Ours | Delta | Severity |
|---|---|---|---|---|---|---|
| G1 | Outer ground | main canvas fill | **`#ffffff`** `[css]` `bg-default` | `#f7f8fa` | −8/255 luminance, **wrong direction** | **Critical** |
| G2 | Nav rail | width | **52 px** (28 native) | **80 px** | **+28 px** | High |
| G3 | Nav rail | fill | **`#f6f8f9`** `[css]` `bg-muted` | `#fbfcfd` | ours 4/255 too light | High |
| G4 | Nav column | width | **214 px** (113.5 native) | **224 px** | +10 px | Medium |
| G5 | Nav column | fill | **vertical gradient `#ffffff` → `#f6f8f9`** — deficit 0.0 at y<45 native, 2.0 at y 130–260, 4.1 at y 320, 5.8 at y 400, 8.5 at y 450 | flat `#fbfcfd` | ours is flat; theirs ramps a full step top→bottom | Medium |
| G6 | Nav total | rail + column | **266 px** | **304 px** | **+38 px** — pushes every downstream x | High |
| G7 | Nav divider | rule at the column's inline-end | 1 px, L ≈ 238 (`#f0f2f4`) | **none** | missing | Low |
| G8 | Nav item | row pitch | **32 px** (17 native, icon-centre to icon-centre, measured three times) | **28 px** | −4 px | Medium |
| G9 | Nav selected chip | fill | **`#e5e7eb`** `[css]` `gray-200` (sampled `#e6e8eb`) | `#e2e3e6` | ours ~3/255 dark and **violet-shifted** (hue 240 vs their 220) | Low |
| G10 | Nav selected chip | box | **189 × 31 px**, radius ≈ 6 px | 194 × 22 px | −9 px height | Low |
| G11 | Top bar | height | **61 px** (bottom hairline at y = 32.5 native; ±9 px depending on whether the 5-native-px `#f6f8f9` strip at the frame's top edge is capture chrome or a real inset — **unresolved**) | **48 px** | **+13 px** | Medium |
| G12 | Top bar | fill | `#ffffff` | `#f7f8fa` | ours tinted | High |
| G13 | Top bar | bottom rule | 1 px `#f0f2f4` | 1 px `#e5e8ed` | ours 1.7× darker | Medium |
| G14 | Content column | padding-inline | **69 px start / 67.5 px end** (nav edge 266.25 → card edge 335.6; frame edge 1440 → 1372.5) | **16 px / 16 px** | **−53 px each side** | **Critical** |
| G15 | Content column | width | **1039 px** | **1104 px** | +65 px | High |
| G16 | Page header | H1 size | **≈ 22 px / 600** | **17 px / 600** | −5 px | High |
| G17 | Page header | H1 ink | `#1d2735`–`#070a0d` (`gray-800`/`900`; darkest sampled pixel `#202128`) | `#24242f` | ours is violet-grey (hue 240) where theirs is blue-grey (hue 210–214) | Low |
| G18 | Page header | block height | H1 row ≈ 61 px tall (y 44 → 76 native), no subtitle | 60 px (24 px H1 + 4 + 16 px subtitle + 16 pb) | ≈ equal box, different contents | — |
| G19 | Toolbar | control height | **30 px** (16 native; search input borders at y 83.5 and 99.5) | 24 px icon buttons / 28 px tabs | **−6 px** | Medium |
| G20 | Toolbar | search input | **184 × 30 px**, 1 px border, on the canvas, inline-**start** | 400 × 28 px, in the **top bar**, **centred** | different element in a different place | High |
| G21 | Filter strip | box | **1039 × 48 px**, standalone, radius ≈ 8 px, **no border** | **1102 × 37 px**, in-card, full-bleed, 1 px bottom border | −11 px height, +63 px width, wrong container | High |
| G22 | Filter strip | fill | **`#f6f8f9`** (deficit 8.00, flat across x 178–731) | **`#f4f6f8`** | ours ~2/255 darker — **closest single match on the page** | Low |
| G23 | Gap, strip → card | — | **13 px** (7 native) | 0 (contiguous) | +13 px | Medium |
| G24 | Table card | box | **1039 × 403 px** (x 335.6→1372.5, y 258.8→661.9) | **1104 × 944 px** | width +65; height set by row count | High |
| G25 | Table card | border | 1 px, L ≈ 238–242 → **`#f0f2f4`** | 1 px **`#e5e8ed`** (L 232.7) | ours **1.7× darker** | High |
| G26 | Table card | radius | **≈ 10 px** (corner arc spans 5.5 native px; `[css]` `--radius-lg: .5rem` = 8 px is the likely intent) | **12 px** | −2 px, within error | Low |
| G27 | Table card | elevation | **no shadow** — profile hits 0.00 within 1 px of the border on both sides | shadow present (3.0 deficit spill at x 319 and x 1424) | remove | Medium |
| G28 | Table header | fill | **`#f6f8f9`** | **`#ffffff`** | missing tonal step | High |
| G29 | Table header | height | **32 px** (17 native) | **32 px** | **0** ✓ | — |
| G30 | Table header | label size / weight / ink | ≈ 14 px / 500 / `#4b5563`–`#384252` (darkest sampled `#4a4c50`) | 12 px / 500 / `#5f646e` | −2 px, lighter ink | Medium |
| G31 | Table header | vertical rules | **absent** | absent | **0** ✓ | — |
| G32 | Table row | pitch | **61.9 px** (33.0 native — six separators at y 187 / 220 / 253 / 286 / 319 / 352, pitch 33 exactly four times) | **33 px** | **−29 px (−47 %)** | **Critical** |
| G33 | Table row | separator | 1 px **`#f0f2f4`** (integrated darkness 6.86 ⇒ L 242.1; `[css]` value mean = **242.1**) | 1 px `#e5e8ed` (integrated 22.3 ⇒ L 232.7) | ours **1.7× darker** | High |
| G34 | Table row | fill | `#ffffff`, no zebra | `#ffffff`, no zebra | **0** ✓ | — |
| G35 | Table cell | padding-inline | **12 px** (label lefts 185 / 312.7 / 435 / 515 / 570 / 661.7 vs rules 178 / 306 / 428 / 508 / 562 / 654 ⇒ 7 native = 13 px including the 1 px rule) | **12 px** | **0** ✓ | — |
| G36 | Table cell | padding-block | ≈ 16 px each side (62 px row − 20 px line − 10 px second line) | **4 px** | **−12 px** | **Critical** |
| G37 | Table cell | ink, ordinary values | **`#6b7280`** `[css]` `text-subtle` (`an hour ago` darkest = `#727475`, mean 115.7; token mean 116.1) | **`#24242f`** (mean 39.7) | ours is **3× darker** — every cell shouts | **Critical** |
| G38 | Table cell | ink, emphasised (names) | **`#384252`** `[css]` `text-default` (`Sam Lee` darkest `#414141`, mean 65.0; token mean 67.8) | `#24242f` | ours darker, and **undifferentiated** — theirs runs two ink levels per row, ours one | High |
| G39 | Identity avatar | size / fill | **30 px circle**, fill ≈ `#f0f2f4` (`gray-100`) | absent | structural | High |
| G40 | Column widths | Name / Company / Total time / Visits / Last seen / City | **240 / 229 / 150 / 101 / 173 / 144** = 1037 px | 11 columns: 40 / 200 / 120 / 128 / 88 / 120 / 88 / 96 / 96 / … = **1256 px in a 1104 card** | overflow | High |
| G41 | Footer | container | **outside** the card, aligned to its edges (the `25 ⌄` pill's inline-start edge lands at x = 178–179 native, the card's own border column) | outside the card ✓, aligned to the content column ✓ | **0** ✓ (but off-screen — S16) | — |
| G42 | Footer | rows-per-page select | **76 × 27 px** pill (x 178.5–219, y 358.5–373), label `rows per page` 14 px `#6b7280` | no select — text only, `Showing 1–25 of 57` | structural | Medium |
| G43 | Footer | pager | `1-6 of 6` plus `Previous` / `Next` as **bordered buttons**, ≈ 27 px | `‹ Previous` / `Next ›` | close | Low |
| G44 | Accent | primary | **`#286ef0`** `[css]` `brand-500` = `hsl(219 87% 55%)` | **`#2b6ef0`** | **ΔRGB (3, 0, 0)** — effectively exact ✓ | — |
| G45 | Badges | status pills | **none in this table** | `Active` pill, `#eaf3de` on green, 11/600, radius 8 | see W4 | Medium |
| G46 | Grey ramp hue | — | **blue-grey**, hue 207–220, saturation 9–20 % throughout `[css]` | **`#24242f` is hue 240, sat 13 % — violet**; `#5f646e` hue 218 ✓; `#f7f8fa` hue 220 ✓ | one token off-hue | Medium |

### Their full declared ramp, for the product-designer working in parallel

`[css]`, light mode, resolved from `hsl()`:

| Token | HSL | Hex | Used for (evidenced in this frame) |
|---|---|---|---|
| `gray-50` = `bg-muted` | `207 20% 97%` | **`#f6f8f9`** | nav ground, filter strip, table header strip |
| `gray-100` = `bg-subtle` / **`border-muted`** | `220 14% 95%` | **`#f0f2f4`** | **every hairline on the page**, avatar fill |
| `gray-200` = `bg-emphasis` / `border-subtle` | `220 13% 91%` | **`#e5e7eb`** | selected nav chip |
| `gray-300` = `border-default` | `216 12% 88%` | `#dde0e4` | input borders |
| `gray-400` = **`text-muted`** | `218 11% 65%` | `#9ca3b0` | identity secondary line, `Not identified` |
| `gray-500` = **`text-subtle`** | `220 9% 46%` | **`#6b7280`** | ordinary cell values, `rows per page` |
| `gray-600` | `215 14% 34%` | `#4b5563` | column header labels, nav items |
| `gray-700` = **`text-default`** | `217 19% 27%` | **`#384252`** | identity name |
| `gray-800` | `214 30% 16%` | `#1d2735` | page H1 |
| `gray-900` = `text-emphasis` | `210 30% 4%` | `#070a0d` | nav title |
| `brand-500` | `219 87% 55%` | **`#286ef0`** | accent |
| radii | — | `sm / default 4 px · md 6 px · lg 8 px · xl 12 px` | card ≈ `lg` |

`gray-500` and `gray-600` are Tailwind's stock `gray` values exactly; 50 / 100 / 300 are tuned.

---

## 5. Matches

One line each, as required — regions that already agree.

- **Card surface** — theirs `#ffffff`, ours `#ffffff`. Exact.
- **Row fill / zebra** — both plain `#ffffff`, no striping. Exact.
- **Table header height** — both **32 px**. Exact.
- **Cell padding-inline** — both **12 px**. Exact.
- **Header row carries no vertical rules** — true of both. Exact.
- **Accent** — theirs `#286ef0`, ours `#2b6ef0`. ΔRGB (3, 0, 0); indistinguishable.
- **Filter strip fill** — theirs `#f6f8f9`, ours `#f4f6f8`. Δ 2/255; the closest fill on the page.
- **Card radius** — theirs ≈ 10 px, ours 12 px; inside the ±3 % measurement band.
- **Pagination sits outside the card, aligned to the content column** — true of both.
- **The card is a single container holding the whole table** — true of both.
- **Letter-spacing `normal` throughout** — ours confirmed; theirs consistent with the frame.
- **No rule between the last row and the footer beyond the row's own border** — true of both.

---

## 6. Will not match, by law

| Region | Delta | Rule | Why the rule wins |
|---|---|---|---|
| **W1 — Identity secondary-line ink** | Theirs `#9ca3b0` (`text-muted`) on `#ffffff` = **2.54:1** | `DESIGN.md` §7.1.1: body text 4.5:1. §7.1.1 states explicitly: *"The large-text allowance does not exist in Eyvar… Every text colour in this product is measured against 4.5:1. There is no 3:1 tier to fall back on."* | Their secondary line fails AA by a factor of ~1.8. Ours must sit at `#6b7280` (4.83:1) or our `#5f646e` (5.94:1). **The two-line structure is matchable; that exact grey is not.** §7.1.2 already names `--ghost #9B9B97` (2.79:1) as *"the largest single accessibility defect in the file"* — `#9ca3b0` is the same defect by the same mechanism. |
| **W2 — `Not identified` and other placeholder-class cell text** | Theirs sampled darkest `#929496`; token is `gray-400`/`gray-500` | §7.1.1 lists **hints and placeholders** at 4.5:1 | As W1. Match the italic and the muting *level*, not the value. |
| **W3 — Nav section headings (`Analyze` / `Leads` / `Manage`)** | Theirs sampled darkest `#868686` on `#f6f8f9` ⇒ `gray-400`-class, ≈ 2.4:1 | §7.1.1, body and label text at 4.5:1 | Add the headings — S13 stands — but at `#6b7280` or darker on `#f6f8f9` (4.54:1). |
| **W4 — Selection checkbox column, row-actions column, status badges** | Theirs: none of the three in this table | `DESIGN.md` **§3.3** bulk selection, **§3.4** the badge family, **§8.5** dense tables and column pinning. D7 replaces §1–§5 *visually* but explicitly *"does not touch… §8"*, and warns *"do not read D7 as licence to drop… a state."* | These are function, not decoration. **Keep them** — but budget for them: the checkbox column alone is 40 px, and the badge is the loudest colour on our page. Style them down into the Navattic register rather than removing them. |
| **W5 — Their disabled `Previous` / `Next`** | Rendered at very low contrast | §7.1.1 exempts disabled controls | Not a violation on either side; recorded so it is not mistaken for one. |
| **W6 — Row-1 height when the name is Arabic** | Their rows are uniform at 61.9 px | §9 bidirectionality, §9.4 Arabic typography | Our Arabic captain name wraps and makes row 1 **41 px vs 33 px**. At the target 62 px row this disappears — the taller row absorbs the wrap. Not a conflict; **G32 fixes it for free.** |

**Nothing above proposes dropping a rule, and nothing above is offered as a reason to stop.**
Each is a bounded, named divergence.

---

## 7. Cross-check — how far to trust these numbers

| Quantity | Sampled from the frame | Declared in their CSS | Agreement |
|---|---|---|---|
| Tinted strip / nav fill | mean 247.0 (deficit 8.00) | `#f6f8f9`, mean **247.4** | **0.4 / 255** |
| Table row hairline | integrated 6.86 ⇒ L **242.1** | `#f0f2f4`, mean **242.1** | **exact** |
| Ordinary cell ink | darkest pixel `#727475`, mean 115.7 | `#6b7280`, mean **116.1** | **0.4 / 255** |
| Identity name ink | darkest `#414141`, mean 65.0 | `#384252`, mean **67.8** | 2.8 / 255 (antialiasing bias) |
| Selected nav chip | mean `#e6e8eb`, 232 | `#e5e7eb`, mean **231.7** | **0.3 / 255** |
| Accent | not sampled — no flat accent region in this frame | `#286ef0` | — |

The hairline agreeing **exactly** independently validates the downscale-integration method
used for every 1 px stroke in this report: a 1 CSS px line covers 0.533 native px at
S = 1.875, so `L = 255 − Σdeficit / 0.533`.

**Unmeasured, with reason:**

- Letter-spacing and line-height, theirs — not recoverable at 768 px.
- The 5-native-px `#f6f8f9` strip along the frame's top edge — could be capture chrome or a
  real inset app frame. It puts a ±9 px band on G11 only.
- Column-header font size, theirs — inferred from ink-height parity with body text, not
  separately solved against Inter metrics.
- Their vertical column rule reads L ≈ 238 against the horizontal's 242.1. Within webp error
  of the same token; I have **not** proven they are one token.
- Overlays: no menu, dialog, drawer or toast is open in either screen. `cfa43315` (sort menu)
  and `79a31934` (detail drawer) were consulted for the sort control's shape only.

**A live-build caveat.** Two engineers are editing `src/` during this audit. The route threw
`Column "captain" cannot be pinned without a positive width, got 0` for part of it and then
recovered; between my capture and my final probe the table changed from 57 rows to 25 with a
pager. **Colour and type numbers above are from the recovered live build; the 1:1 pixel
geometry is from the capture taken minutes earlier.** Re-run before acting on G40.

---

## Verdict

**Not indistinguishable — not close.** A person putting these side by side sees a different
product in under a second, and would still do so if every hex in this report were fixed and
nothing else were.

The gap is **not primarily colour**. It is three things, in this order:

1. **The tonal direction is inverted.** Their page is white with a tinted nav; ours is tinted
   with a white card floating on a shadow. Until the canvas goes `#ffffff` and the nav goes
   `#f6f8f9`, every other correction lands on the wrong ground. (S1, G1, G3, G12, G27)
2. **The page is half as tall as it should be and twice as tight to the edges.** Their row is
   **62 px**; ours is **33 px**. Their content inset is **69 px**; ours is **16 px**. Ours is
   not a denser version of theirs — it is a different rhythm. (G14, G32, G36, G19)
3. **Every rule on our page is 1.7× too dark, and every word is too black.** Their hairline is
   `#f0f2f4` and their ordinary cell text is `#6b7280`. Ours are `#e5e8ed` and `#24242f`. The
   reference is quiet; ours shouts in greyscale. (G25, G33, G37, G38)

### Shortest path to closing the gap

Ordered by visible change per unit of work. The first four are a token file plus a handful of
class edits, and they close most of the perceived distance:

1. **Invert the ground.** `--background: #ffffff`; `--nav: #f6f8f9`; drop the card's shadow;
   top bar to `#ffffff`. *One file:* `src/styles/globals.css`. **(G1, G3, G12, G27)**
2. **Lighten the rules and the ink.** Introduce their two-level border: `--border-muted: #f0f2f4`
   for **all table rules and the card border**, keeping `#e5e8ed` only where §7.1.1 requires a
   3:1 component boundary. Re-point ordinary cell text to `#6b7280`, emphasised text to
   `#384252`, and correct `--foreground` off its violet hue. **(G25, G33, G37, G38, G46)**
3. **Open the page up.** Content padding-inline 16 → **68 px**; row pitch 33 → **62 px** (cell
   padding-block 4 → 16 px); table header stays 32 px and gains the `#f6f8f9` fill.
   **(G14, G32, G36, G28)**
4. **Type up one step.** Body and cells 13 → **14 px**; column headers 12 → **14 / 500**; H1
   17 → **22 px**; nav items 13 → 14 px; nav title 13 → 16 px. **(G16, G30, and §2)**

Then the structural work, which is real component change:

5. Add the **vertical column rules on `td` only**, and the **two-line identity cell with a
   30 px avatar** — secondary ink at `#6b7280`, not `#9ca3b0` (W1). **(S3, S4, G39)**
6. **Move the toolbar out of the card**, label the four icon buttons, grow them to 30 px, and
   put a 184 × 30 search input at the inline-start. **(S8, G19, G20)**
7. **Detach the filter strip** above the card: 48 px, `#f6f8f9`, no border, 13 px gap, and give
   it `Events:` / chip / `Clear`. **(S9, S10, G21, G23)**
8. **Cap the table body height so the pagination footer is on screen** — it exists and the
   owner has never seen it. Add the `rows per page` select. **(S16, G42)**
9. **Narrow the rail to 52 px** (icon-only, no labels, no badges) and the nav column to 214 px;
   add the three section headings; add the nav divider; nav row pitch to 32 px.
   **(S13, S14, S15, G2, G4, G6, G7, G8)**
10. **Empty the top bar** down to a breadcrumb plus one inline-end item, and add `Export` plus
    two icon buttons to the page header. **(S11, S12)**

Steps 1–4 are a palette-and-spacing pass and should be re-audited before steps 5–10 begin,
because they will change what the remaining gaps look like. **Re-run this report after step 4.**

---
---

# ROUND 2 — re-run after the re-skin (`build/04-reskin.md`) and the table controls (`build/03-table-controls.md`)

**Round 1 above is unaltered.** Everything below is a fresh measurement taken after both
builds landed. Where a round-1 finding is referenced by its id (G*, S*, W*, C*) the id means
the same thing it meant then.

**Scale factor:** **S = 1.875, unchanged**, re-pinned this round against three independents:
(a) 768 × 1.875 = 1440 exactly; (b) the table-header strip measures 17 native px ⇒ 31.9 CSS,
i.e. a declared **32**; (c) the row separators sit at native y 187/220/253/286/319/352 —
pitch 33 ⇒ **61.9 CSS**. A fourth known resolved this round: the top-bar rule sits at native
y 32.5 with a 5-native-px `#f6f8f9` band above it; treating that band as capture chrome gives
27.5 × 1.875 = **51.6 CSS**, which is a declared **52**. Round 1 left that ±9 px open; it is
now closed, and **our 52 px top bar is right.**

**Ours:** `http://localhost:5199/operations/people` at **1440 × 820** and **1280 × 820**,
Playwright `getComputedStyle` / `getBoundingClientRect`, plus PIL on 1:1 captures. Both widths
give identical type, colour and row geometry; only the content width differs, and both are
reported where they differ. **Zero console errors, zero page errors, at both widths.**
**Reference:** `223f15e5.webp` re-sampled with PIL, plus `98da06fdab16cbfa.css` per the D7
addendum.

---

## R2.0 The answers to the five questions asked

**1 — The row is neither 62 nor 64. It is 41, and the token is stranded.**
`--ev-row-h-media` is declared **64 px** and `--ev-row-h` **40 px**, but the People table
renders `h-row`: measured **41.0 px pitch** (40 + the 1 px rule) at both widths, over 25 rows,
after a 6 s settle. The identity cell holds **one line, `font-weight: 400`, no avatar** — two
children, neither of them an `[data-slot=avatar]`; `document.querySelector('tbody [data-slot=avatar]')`
returns `null`. So the row is **not tall and half-empty — it is short and single-line**,
exactly as `04-reskin.md` §4 F-4 warned it would be until `columns.ts` lands the media cell.
Against the reference's **61.9 px** this is **−20.9 px, −34 %**, and it is the single largest
visible difference left on the page.

*Footnote on the 64:* at S = 1.875 a 64 px row would require S = 64/33 = 1.939, which puts the
frame at 1489 px, not 1440. **The reference row is 62, not 64.** The +2 on-grid correction is
a sanctioned 3.2 % divergence, just inside round 1's stated ±3 % band on lengths — and moot
while the table renders 41.

**2 — Inputs read as bounded. Buttons and filter chips do not.**
`--input: var(--ev-hairline-control)` is live: the top-bar search wrapper computes
`border: 1px rgb(221,224,228)` = **`#dde0e4`, 1.324 : 1** ✓. But `button.tsx`'s `secondary`
variant — which is what `Search`, `Filter`, `Columns` and the sort control all use — declares
`border-border`, and `FilterChipRow` declares `border-border` on every chip. Both resolve to
**`#f0f2f4`**. Pixel-verified on our own capture: the `Search` button's top border reads
`(240,242,244)` on white = **1.122 : 1**; the `Status: Active` chip's border reads
`(240,242,244)` against the strip's `(246,248,249)` = **1.024 : 1** — the chip has effectively
no edge.

**The reference bounds its controls at the control weight, and I solved it twice from the
frame rather than trusting the declaration.** Their filter chip's top border at native
(196,110) reads L 235 between a tint of 248 and a white of 255; at 0.533 native px coverage
that back-solves to **L 220.5**. Their search input's top border at (200, 83–84) integrates a
deficit of 15 against 254 ⇒ **L 225.9**. The two solves bracket the declared `border-default`
`#dde0e4` (**L 224.3**). So `--ev-hairline-control` is the right token with the right value —
**it is simply not wired to the two control families that need it most.**
`border-border-control` has **zero consumers in `src/`**.

**3 — Nothing depended on `--ev-shadow-1`, confirmed.** It has 13 consumers; every one is a
`rounded-xl border border-border bg-card` surface, i.e. a bordered card, and every overlay
class (dialog, popover, dropdown-menu, sheet, tooltip, sonner, `ShellLayer`) takes `shadow-2`
or `shadow-3` instead. On this screen the card's separation is now a border alone, which is
what the reference does. Pixel check outside the card at y = 400: x 335 = `(255,255,255)`,
x 336 = `(240,242,244)`, x 337 = `(255,255,255)`; x 1406/1407/1408 the same. **Zero spill on
both edges — G27 closed.** *One watch item, unmeasured here:* a `shadow-1` card placed on
`--ev-bg2` would sit at **1.054 : 1** with no elevation to help it. No such card exists on
People; other screens not checked.

**4 — `swap` is right, but the flash is a 9 % reflow, not a blink, and it is fixable without
touching §7.** Resolved family is **`Inter Variable`** (fontsource, latin + latin-ext,
`font-display: swap`, status `loaded`); the reference self-hosts static `Inter` at
`font-display: block`. Same typeface, different instance — not a visible difference once
loaded. The fallback window is: the same 41-character string sets **291.36 px in Inter
Variable** and **267.88 px in Segoe UI** at 14/400 — an **8.8 %** horizontal shift on every
label — and 467.64 vs 432.14 at 22/600, **8.2 %**, on the H1. There is **no metric-matched
fallback face declared.** The correct close is not `block` (§7 has no rule licensing invisible
text, and the build is right to refuse it) but an `@font-face { font-family: "Inter Fallback";
src: local("Segoe UI"); size-adjust: ~108.8 % }` appended to the stack — which is what
Navattic's own marketing site does (`'Inter','Inter Fallback'`, quoted in round 1 §2).
**Judgement: the flash as it stands is not acceptable — it moves layout, not just colour — and
it does not need a rule waiver to fix.**

**5 — The filter strip shipped with the right skin in the wrong place, and it is absent at
rest.** Measured with a `Status: Active` filter applied: **1046 × 48 px**, fill
`rgb(246,248,249)` = **`#f6f8f9`** ✓, `border-radius: 8px` ✓, **`border-width: 0px` on all four
sides** ✓, `padding: 8px` ✓, content `Status: Active | Add filter | Clear` ✓. Fill, height,
radius, borderlessness and content **all match round 1's spec.** What does not: it is
**inside the card** (`insideCard: true`, `margin: 12px/12px/0px/12px`, so x = 349 inside a card
at x = 336), and `mb-0` puts the **gap below it at 0 px** — its next sibling's top is y 257,
the strip's own bottom. The reference's is a standalone bar on the canvas with a **13 px white
gap**. And ours renders **only when something is filtered** (`DataTable.tsx:631`) — the
reference frame shows `Events: Engaged ✕` **at rest**, which is that product's resting state,
not a state we can assert. Ours at rest has **no strip at all**.

---

## R2.1 Structural gaps — what still exists in one and not the other

Ranked by what an eye lands on first. **These outrank every colour delta below.**

| # | Region | Reference | Ours | Status since R1 |
|---|---|---|---|---|
| **S2′** | **Table row** | 61.9 px pitch, **two-line identity + 30 px avatar circle**, 6 rows | **41.0 px** pitch, one line, `font-weight: 400`, **no avatar**; `--ev-row-h-media: 64` declared and unused | **open** — S2 + S4 + G32 + G36 + G39, now one item |
| **S16′** | **Pagination** | **Outside and below the card** — card bottom at native y 352, pager buttons at y 364–371 ⇒ a ~22 px white gap; `[25 ⌄] rows per page` at the inline-start | **Inside** the card, 48 px, `border-top` `#f0f2f4`, at **y = 1278, bottom 1326, in an 820 px viewport** ⇒ `inViewport: false` at **both** widths; still no rows-per-page select | **worse** — moved to the wrong side of the card *and* still off-screen |
| S7 | Tab strip | none | `Captains / Applications / Compliance / Riders`, 32 px, inside the card | open, product decision |
| S8′ | Toolbar | **Above the card on the canvas**, 30 px, labelled | **Inside the card** at y 160.5, **32 px, labelled** (`Search` 91 px · `Filter` 78 · `Columns` 125 · `Captain ↑` 136) | **half closed** — labels and height landed; position did not |
| S9′ | Filter strip position | standalone above the card, 13 px gap | inside the card, 12 px inset, **0 px gap below**, absent at rest | half closed — see R2.0 #5 |
| S11 | Page header actions | `Export` + 2 icon buttons | actions slot renders at **width 0** — empty | open |
| S12 | Top bar | breadcrumb + one item | 400 × 32 centred search, `Mine 2`, `On call: unassigned`, bell `6`, avatar `SA` | open, named divergence |
| S13 | Nav section headings | `Analyze` · `Leads` · `Manage` | absent — nav text runs `Overview, My Work, Live Dispatch, …` with no heading node | **open, and blocked** as declared |
| S14 | Nav count badges | none anywhere | `12, 3, 8, 1, 4, 7` in the column; `6, 35, 2, 10, 99+` on the rail | open, §8.4 function |
| S15 | Rail | 52 px, icon-only | **80 px** with a text label under every glyph | open, D-4 |
| S17′ | Table width | 6 columns, fills the card exactly | **12 columns, `scrollWidth` 1232 against `clientWidth` 1070 at 1440 and 910 at 1280** | **open, and wider than reported** — see R2.4 |

---

## R2.2 Closed since round 1 — measured, not assumed

| R1 id | Property | Round 1 | Round 2 | Reference |
|---|---|---|---|---|
| C1 / S1 / G1 | canvas fill | `#f7f8fa` | **`#ffffff`** ✓ | `#ffffff` |
| G3 | rail + nav fill | `#fbfcfd` | **`#f6f8f9`** (pixel `(246,248,249)`) ✓ | `#f6f8f9` |
| G7 | nav seams | none | **1 px `#f0f2f4` on both**, pixel-verified at x 303 ✓ | present |
| C3 / G25 | card border | `#e5e8ed` | **`#f0f2f4`** ✓ | `#f0f2f4` |
| G33 | row separator | `#e5e8ed` | **`#f0f2f4`** ✓ | `#f0f2f4` (L 242.1, exact) |
| G27 | card elevation | shadow, 3.0 spill | **none** — 0.00 spill both edges ✓ | none |
| G28 | table-header fill | `#ffffff` | **`#f6f8f9`** ✓ | `#f6f8f9` |
| S3 (half) | column rules, body | none | **present** at x 639/727/847/935/1031/1127/1255/1367, `#f0f2f4` ✓ | present |
| G37 | ordinary cell ink | `#24242f` | **`#6b7280`** — their `text-subtle` **exactly**, 4.834 : 1 on white ✓ | `#6b7280` |
| G12 / G13 | top bar | `#f7f8fa`, rule `#e5e8ed` | **`#ffffff`**, rule **`#f0f2f4`** ✓ | white, `#f0f2f4` |
| G11 | top-bar height | 48 | **52** ✓ (and the reference's ±9 px now resolves to 51.6) | ≈52 |
| G16 | H1 | 17/600 | **22 px / 600 / 28** ✓ | ≈22/600 |
| §2 | body / cells | 13 px | **14 px / 400 / 20** ✓ | 14/400/20 |
| §2 | nav item | 13 px | **14 px** ✓ | ≈14 |
| §2 | nav title | 13/600 | **16 px / 600** ✓ | ≈15.5–16/600 |
| §2 | family | Geist Variable | **Inter Variable** ✓ | Inter |
| G8 | nav row pitch | 28 | **32** ✓ | 32 |
| G9 | nav chip | `#e2e3e6`, hue 240 | **`#e5e7eb`** ✓ | `#e5e7eb` |
| G26 | card radius | 12 | **8** ✓ | ≈8–10 (`--radius-lg`) |
| G46 | grey hue | `#24242f` hue 240, violet | **`#171a21`, hue 222** ✓ | blue-grey 207–220 |
| G14 (part) | content gutter | 16 px | **32 px** — half the distance to their 69 | 69 / 67.5 |
| S10 | strip content | `+ Add filter` only | **label · chip · `Add filter` · `Clear`** ✓ | `Events:` · chip · `Add filter` · `Clear` |
| G19 / G20 (part) | toolbar controls | 24 px unlabelled icons | **32 px labelled** ✓ | 30 px labelled |
| G21 (part) | strip skin | `#f4f6f8`, 37 px, bordered | **`#f6f8f9`, 48 px, r8, borderless** ✓ | `#f6f8f9`, 48, r8, none |
| G44 | accent | `#2b6ef0` | `#2b6ef0` ✓ | `#286ef0`, ΔRGB (3,0,0) |

**That is 24 findings closed and closed correctly.** The re-skin is the largest single
improvement this screen has had.

---

## R2.3 New deltas — introduced since round 1

These did not exist in round 1. Two of them were **matches** then.

| # | Region | Property | Theirs | Ours | Delta | Severity |
|---|---|---|---|---|---|---|
| **N1** | **Table header** | vertical column rules | **absent** — the header's horizontal deficit profile is flat at 8.15–8.35 across x 206–264, no spikes | **present** — `#f0f2f4` at x 639, 727, 847, 935, 1031, 1127, 1255, 1367 on scan rows y 200, 201, 226, 227 | **G31 flipped from match to mismatch.** The rule is declared once on `<table>` as `[&_tr>*:not(:last-child)]`, which catches `<thead>` too | **High** — a gridded header is the exact "reads as a grid, not a list" defect `04-reskin.md` §1 names |
| **N2** | **Pagination** | container | **outside** the card, ~22 px below its bottom edge | **inside** the card, `border-top` above it | **G41 flipped from match to mismatch**, and S16 did not close: `inViewport: false` at 1440 **and** 1280 | **High** |
| **N3** | **Buttons / chips** | boundary colour | **`#dde0e4`** — solved twice from the frame at L 220.5 and L 225.9, declared 224.3 | **`#f0f2f4`**, L 241.7 | **−17.4/255**; 1.122 : 1 on white and **1.024 : 1** for a chip on the strip, against their 1.324 : 1 | **High** |
| **N4** | **Pinned column edge** | boundary weight | n/a (reference does not pin) | `pinning.ts:100` writes `var(--ev-hairline)`; `--ev-hairline2` now holds the **same** `#f0f2f4`. On scroll all four leading cells report `1px rgb(240,242,244)` | The "one step darker" frozen edge the spec calls for is **zero steps darker** — the pin has no visible boundary | **Medium** — internal-consistency defect, not a reference delta |
| **N5** | **Row 1 (Arabic)** | height | uniform 61.9 px | **65 px against 41 px** for every other row | **+24 px**, a visible stagger at the top of the table. W6 predicted a 62 px row would absorb this; **41 px does not** | **Medium** |
| **N6** | **Web font** | fallback metrics | `font-display: block` — no shift, text hidden instead | `swap`, **no metric-matched fallback face**: 291.36 px vs 267.88 px at 14/400 | **8.8 % reflow** of every label on a cold cache | **Medium** |
| **N7** | **`--ev-text-3`** | consumers | — | `#9ca3b0`, **2.536 : 1**, **zero consumers in `src/`** | a failing value kept alive as a name; W1 goes live the moment the identity cell uses it | **Low, latent** |

---

## R2.4 Measured deltas still open — walk order

| # | Region | Property | Theirs | Ours | Delta | Severity |
|---|---|---|---|---|---|---|
| G32′ | Table row | pitch | **61.9 px** | **41.0 px** | **−20.9 px, −34 %** | **Critical** |
| G36′ | Table cell | padding-block | ≈16 px | **8 px** | **−8 px** | **Critical** |
| G39′ | Identity cell | avatar | 30 px circle, `#f0f2f4` | **absent** | structural | **Critical** |
| — | Identity cell | lines / weight | 2 lines, line 1 at 600 | **1 line at 400** | structural + **−200 weight** | **Critical** |
| G38′ | Identity ink | colour | **`#384252`** (`text-default`, 10.148 : 1) | **`#171a21`** (17.411 : 1) | ours **1.7× the contrast** — the two-level ink ladder exists now, but its top rung is too black | Medium |
| G14′ | Content column | padding-inline | **69 / 67.5 px** | **32 / 32 px** | **−37 px each side** | High |
| G15′ | Content column | width | 1039 px | **1072** @1440 · **912** @1280 | +33 / −127 | Medium |
| G30′ | Header label | size / ink | ≈14 px / 500 / **`#4b5563`** (7.094 : 1 on the tint) | **12 px / 500 / `#6b7280`** (4.538 : 1 on the tint) | **−2 px**, and ours is now **lighter** than theirs where round 1 had it darker | Medium |
| G2 / G4 / G6 | Nav | widths | 52 + 214 = **266** | **80 + 224 = 304** | **+38 px**, pushes every downstream x | High |
| G5 | Nav column | fill | **vertical gradient `#ffffff` → `#f6f8f9`** | **flat `#f6f8f9`** | ours flat | Medium |
| G10 | Nav chip | box | 189 × 31 | 207 × 32 | +18 w | Low |
| G40′ | Columns | fit | 6 columns fill the card exactly | **12 columns, `scrollWidth` 1232** vs `clientWidth` **1070 @1440** and **910 @1280** | **clips at BOTH widths — 162 px at 1440, 322 px at 1280** | High |
| G42 | Footer | rows-per-page select | 76 × 27 pill | absent — `Showing 1–25 of 57` only | structural | Medium |
| — | Footer | ink | `#6b7280` | **`#171a21`** | ours 3.6× the contrast on a secondary readout | Low |
| G45 | Badges | status pills | none | `Active`, `#e7f6ec` / `#15653c`, 11/600, r8 | see W4 | Medium |
| G18′ | Page header | subtitle | **none** | `57 captains` still renders under the H1 | structural, minor | Low |

---

## R2.5 Matches — regions that now agree

One line each. Canvas `#ffffff` · nav and rail `#f6f8f9` · both nav seams 1 px `#f0f2f4` ·
top bar white, 52 px, 1 px `#f0f2f4` rule · card surface `#ffffff` · card border 1 px
`#f0f2f4` · card radius 8 · **no card shadow, zero spill both edges** · table-header strip
`#f6f8f9` at 32 px · header carries no zebra · row fill `#ffffff`, no zebra · row separator
1 px `#f0f2f4` · vertical column rules present on body cells at `#f0f2f4` · cell
`padding-inline` 12 px · ordinary cell ink `#6b7280`, exact · body type 14/400/20 ·
`letter-spacing: normal` throughout · H1 22/600 · nav item 14 px · nav title 16/600 · nav row
pitch 32 · nav chip `#e5e7eb` · accent `#2b6ef0` vs `#286ef0` · family Inter · filter-strip
fill, height, radius and borderlessness · toolbar controls labelled.

---

## R2.6 Will not match, by law — restated, and none has moved

| Region | Delta | Rule | Status this round |
|---|---|---|---|
| **W1 — identity secondary-line ink** | Theirs `#9ca3b0`, **2.536 : 1** on white | §7.1.1, 4.5 : 1, no large-text tier | **Unmoved, and currently dormant** — the second line does not exist yet. `--ev-text-3` holds the value with **zero consumers**. The moment the two-line cell lands, that line must take `#6b7280` (4.834 : 1), not `#9ca3b0`. |
| **W2 — placeholder / `Not identified` class** | Theirs `gray-400`/`gray-500` | §7.1.1 | **Unmoved.** Ours routes placeholders through `--muted-foreground` → `--ev-text-2` `#6b7280`. Compliant, and one step darker than theirs. |
| **W3 — nav section headings** | Theirs ≈2.4 : 1 on `#f6f8f9` | §7.1.1 | **Unmoved, and the headings are still unbuilt.** When built: `#6b7280` on `#f6f8f9` = **4.538 : 1**, which clears 4.5 by 0.038 — thin. `#4b5563` gives 7.094 and is the safer pick. |
| **W4 — checkbox column, kebab column, status badges** | Theirs: none of the three | §3.3, §3.4, §8.5; D7 does not touch §8 | **Unmoved.** All three still render. The badge re-toned to `#e7f6ec` / `#15653c`, quieter than round 1's olive — the divergence is smaller but still a divergence. |
| **W5 — their disabled `Previous` / `Next`** | very low contrast | §7.1.1 exempts disabled | **Unmoved.** Not a violation on either side. |
| **W6 — Arabic row 1** | theirs uniform 61.9 px | §9, §9.4 | **Moved — for the worse.** Round 1 said a 62 px row absorbs the wrap "for free". At the shipped **41 px** it does not: row 1 is **65 px against 41**. Still not a rule conflict, but **G32′ no longer fixes it for free** and it is now visible. |

**Nothing above proposes dropping a rule.** N6 is deliberately *not* in this table: the font
flash is closable with a metric-matched fallback face and needs no waiver.

---

## R2.7 Unmeasured, with reason

- Letter-spacing and line-height, theirs — still not recoverable at 768 px.
- Whether their vertical and horizontal rules are one token — still unproven (L ≈ 238 vs 242.1).
- Overlays — no menu, dialog, drawer or toast is open in the reference frame. Our header menu
  and filter popover were opened only to reach the chip strip; their skin was not audited
  against a reference, because there is none for them in this frame.
- `shadow-1` cards on a tinted ground — none exists on People; other screens not checked.
- RTL — out of scope for this pair; `04-reskin.md` reports it separately.
- Their frame's filter strip is populated at rest and ours is empty at rest. Whether that is a
  product difference or a styling one is **not decidable from one frame.**

---

## R2 Verdict

**Still not indistinguishable — but the reason has changed completely, and that is progress.**

Round 1's verdict was "a different product in under a second". That is no longer true of the
**surface**: put the two side by side and the grounds, the greys, the rules, the type and the
accent now read as the same design system. Twenty-four findings closed, and the three headline
problems of round 1 — inverted tonal direction, 1.7× rules, black cell ink — are **gone**.

What a person still sees, in the order they see it:

1. **Our table is a spreadsheet and theirs is a list.** 41 px single-line rows against 62 px
   two-line rows with avatars, and — new this round — **vertical rules running through the
   header strip**, which is the one place the reference deliberately leaves clean. That is one
   glance, and it is the whole difference.
2. **Their card holds a table. Ours holds a tab strip, a toolbar, a filter strip, a table and
   a pager.** Everything that floats on white in the reference is boxed in ours.
3. **The pager is off the bottom of the screen** at both widths — and it moved *into* the card,
   away from the reference, without solving that. **The owner still has never seen it.**
4. **Our controls have no edges.** Buttons and chips at 1.122 : 1 and 1.024 : 1 against the
   reference's 1.324 : 1. The token that fixes this was added, measured and documented — and
   then wired to inputs only.
5. **The table clips at 1440, not just 1280.** 1232 against 1070.

### Shortest path to closing the gap

1. **Land the media row.** `h-row-media` on People's `<tr>`, the 32 px avatar circle, the
   two-line identity cell (line 1 at 600 / `#384252`, line 2 at `#6b7280` per W1),
   `padding-block` 8 → 16. Closes S2′, G32′, G36′, G39′, G38′, N5 and W6 in one change, and it
   is the only item on this list a person would notice from across the room.
2. **Take the vertical rules out of `<thead>`.** Change the one selector from
   `[&_tr>*:not(:last-child)]` to a `tbody`-scoped one. **N1.** One line.
3. **Wire `border-border-control`** to `button.tsx`'s `secondary` variant and to
   `FilterChipRow`'s chip. **N3.** Two lines. The token already exists and already carries the
   right number.
4. **Put the pager back outside the card and cap the table body** so it lands inside 820 px.
   Add the rows-per-page select. **N2, S16′, G42.**
5. **Move the toolbar and the filter strip out of the card**, onto the canvas above it, with
   the 13 px gap. **S8′, S9′.**
6. Then the slower ones: gutter 32 → 68, nav 304 → 266, header labels 12 → 14 / `#4b5563`, the
   nav gradient, the section headings when their data field lands, `defaultHidden` for the
   column overflow, and the `Inter Fallback` metric face.

**Steps 1–3 are roughly twelve lines of code and close the two findings that flipped from
match to mismatch plus the largest remaining one. Re-run after step 3.**
