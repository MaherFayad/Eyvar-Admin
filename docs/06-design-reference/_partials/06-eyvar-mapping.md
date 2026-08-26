## 6. Applying This to Eyvar Admin

Eyvar Admin today is a single-file app (`eyvar_ops_panel_v40_fixed.html`, 21,857 lines,
41 `.page` divs, 21 settings sub-panes) with its own token set declared in the `:root`
block at L11–L21. This section is the bridge: what Eyvar already has, where it diverges
from §1–§5, and which divergences are **sanctioned deviations** versus **defects**.

Read the Precedence ladder in the header before this section. §1–§5 describe Shopify;
this section is what binds.

### 6.1 Current Eyvar token inventory (`eyvar_ops_panel_v40_fixed.html` L11–L21)

> **D7 note — this section is HISTORICAL.** It records what the legacy single-file app had,
> which is what the rebuild had to translate. **It is not the token set.** Every value below
> has been replaced. The live set — every `--ev-*` name with its measurement or its
> derivation, every contrast ratio recomputed — is
> **`docs/05-restructure/design/03-navattic-language.md` §1**, and it is realised in
> `src/styles/globals.css` and nowhere else. Read this table to understand where a name came
> from, never to find out what a value is.

All 24 colour variables, verified line by line:

| Eyvar token | Value | Line | Role today |
|---|---|---|---|
| `--bg` / `--sb-bg` | `#EEF0F3` | L19, L12 | Page canvas + sidebar |
| `--bg2` | `#F8F8F5` | L19 | Subdued fills (table headers, footers, icon buttons) |
| `--white` | `#fff` | L19 | Card and page surface |
| `--border` / `--border2` | `#E4E2DA` / `#DDDBD3` | L20 | Hairlines (rendered at `.5px`) |
| `--ink` / `--muted` / `--ghost` | `#1A1A18` / `#6B6B68` / `#9B9B97` | L18 | Text ramp |
| `--blue` / `--blue-lt` / `--blue-dk` | `#185FA5` / `#E6F1FB` / `#0C447C` | L12 | Primary action + interactive |
| `--green` / `--green-lt` | `#27500A` / `#EAF3DE` | L15 | Success |
| `--amber` / `--amber-lt` / `--amber-dk` / `--amber-border` | `#E8A33D` / `#FAEEDA` / `#633806` / `#E0B368` | L14 | Warning |
| `--red` / `--red-lt` / `--red-border` | `#A32D2D` / `#FCEBEB` / `#E8A9A9` | L16 | Critical |
| `--teal` / `--teal-lt` | `#0B6B6B` / `#E1F5EE` | L13 | Extra badge tone |
| `--purple` / `--purple-lt` | `#4A2889` / `#EDE6FB` | L17 | Extra badge tone |
| `--navy` | `#3D434B` | L12 | Logo / section text |

**Token categories that do not exist.** `:root` holds colours and nothing else — no
radius, spacing, shadow, font-size, duration, or z-index token. Every such value in the
file is a literal. This is why the "use a token" rule in §6.4 is scoped to colour only
until the set is extended; see D15–D17.

Structural facts, verified:

| Property | Eyvar today | Line | Shopify equivalent |
|---|---|---|---|
| Base font size | `13px` | L22 | ~13–14px body |
| Page title | `17px / 500` | L73 | ~20px / 600 |
| Card radius | `11px` | L88 | 12px |
| Card border | `.5px solid var(--border)` | L88 | 1px hairline |
| Sidebar | `52px` collapsed → `236px` open; `268px` in Arabic | L24, L30, L31 | ~240px, always open |
| Top bar | `50px`, **white** | L59 | ~56px, **dark** |
| Table cell padding | `9px 11px`, 12px text | L150 | rows ~40px |
| Modal | `520px`, radius `14px` | L195 | small / medium / large |
| Primary button | blue fill `#185FA5`, radius `8px` | L80 | near-black fill |
| Badge | pill `999px`, `10px / 600` | L117 | pill, tone-mapped |
| Toggle | `32×18`, green when on | L185–189 | used sparingly |
| Toast | JS-injected, bottom-right, light tinted card | L5236–5320 | dark pill, bottom-centre |
| Settings | a `.page` route (`p-settings`) | L1416 | a dismissible overlay |

### 6.2 Sanctioned deviations

Each entry names the rule it suspends. A deviation that does not name its rule is not
sanctioned — it is a defect.

| # | Deviation | Suspends | Why |
|---|---|---|---|
| ~~D-1~~ | ~~**Brand blue is the primary action colour**, not near-black~~ | — | **VOID — `DECISIONS.md` D7.** Navattic's primary button measures `#0C1116`, a cool near-black, so §1.1.4 and §4.6 are **met**, not deviated from, and there is nothing left to suspend. `--ev-blue` `#2b6ef0` keeps three roles — focus ring, chart series, selection — and stays off links, because at 4.259:1 on `--ev-bg2` it is not a compliant text colour. See R3 (rewritten) and `design/03-navattic-language.md` §1.3. |
| ~~D-2~~ | ~~**Higher density** — 13px base text, ~30px rows~~ | — | **RETIRED — `DECISIONS.md` D7, measured not asserted.** Re-measured against Navattic: body text **13px in both** (identical), page title 22–24 vs Eyvar's 17 (**Eyvar was tighter and rises**), nav row 32 vs 28 (**rises**), compact control 28–30 vs 28 (identical), table header row 32 vs 32 (identical), cell padding-inline 12 vs 12 (identical), spacing on a 4px grid in both. Eyvar's rows move **up** — 32 → 40 text, 44 → 56 media — against a reference measuring 41 and 62. **Eyvar is not denser than Navattic; it matches it, and in five places it was tighter and is being loosened.** Its type-ramp (§1.2) and spacing-scale (§1.3) suspensions are void and may not be cited again. Full table: `design/03-navattic-language.md` §5. |
| D-2′ | **The page inline gutter is 32px**, against a reference measuring 68 | Nothing in §1–§5 — D7 replaced their visual content. This is a departure from the **reference**, recorded so it is not mistaken for drift. | At D2's 1280px floor the content region is **976px** (D5, measured: `<main>` x = 304, width = 976). Navattic spends 136px of its own 1173px region on gutters — 11.6% — leaving 1037 for a **six**-column table. Eyvar's index tables run six to nine columns and `01-people.md` records all four People views fitting at 1280 only with `min-w`/`max-w` pinning on the identity column. 68px would leave 840, **78px less than today's effective 918**, and would clip. 32px leaves 912 — 6px less than today, inside the noise of that pinning, and **frontend must re-verify `scrollWidth === clientWidth` at 1280 rather than assume it**. |
| D-11 | **One white ground. A card is separated by a 1px border and an 8px radius, not by a fill step** | §1.1's canvas/surface tonal step; the derived rule that the canvas is grey | Measured in all 15 Navattic frames: the content region is `#FFFFFF` edge to edge (`82923d3f` y=440, x=144–767, n=624, one colour), and cards and stat tiles are white-on-white with 1px borders (`02b895df`, four tiles). §6.3 **D1** stays a defect for the case it was actually written about — white on white **with no border**, which is what the legacy app shipped and which genuinely collapses the distinction. Grey survives in exactly two roles: the two nav columns (`--ev-bg-nav` `#f8fafb`) and the one subdued fill (`--ev-bg2` `#f5f7f9`). |
| D-3 | **Light top bar**, 50px, with a `Title › Subtitle` breadcrumb | §2.1 (dark frame), §2.6 (no breadcrumbs), §2.3 (logo in the save-bar left slot) | The wordmark lives in the rail, so the top bar is free for wayfinding. The §2.3 logo rule is unimplementable on this frame and does not apply. |
| D-4 | **Two-level navigation** — an 80px icon+label workspace rail (5 targets, `Admin` pinned to the bottom, labels `Exec · Ops · Finance · Support · Admin`) plus a 224px sub-tab column listing the selected workspace's 5–9 sub-tabs. **Both columns are always rendered and route-derived; there is no collapse.** The top bar spans the content region only and carries no route trail | §2.1 (fixed ~240px nav, always expanded — R11) · §2.1 (only one nav section MAY be expanded at a time, and it MUST be the one containing the current page) · §2.1 (every primary nav item MUST have a leading icon; secondary items MUST NOT) · §2.1 (a nested active row MUST additionally carry an elbow connector from its parent) · §2.1 (a dark top bar spanning the full viewport width) | Five workspaces organised by the job someone is paid to do (`DECISIONS.md` **D1**) replace a flat 30-item rail over 62 destinations. The second column holds the labels the hover expansion existed to reveal, so hover expansion has no remaining purpose. Level 1 is icon **plus** label because four of the five glyphs are abstract and an unlabelled rail is a recall test performed all day. There is no elbow connector because parent and child sit in different columns. The top bar narrows to the content region because **D-3** already moved the wordmark into the rail, which is what made the full-width bar's left slot meaningful; and it carries no `Title › Subtitle` trail because with the column permanently visible the trail restated the workspace name and the sub-tab name that sit immediately to its own inline-start (`DECISIONS.md` **D5**, design spec `02-visual-refinement.md` V4). |
| D-5 | **Settings is a route, not an overlay** — `Admin` is one of the five workspaces and its level-2 column is its settings nav; four former panes moved to `Financials` | §2.4 (Settings MUST open as an overlay over the current page) · §2.4 (the overlay MUST preserve the page underneath; settings MUST NOT be a route that destroys the previous page) · §2.4 (the settings shell MUST be nav ~289px + gutter ~27px + pane ~707px, centred as one ~1026px block inside the overlay) · §2.4 (settings MUST be dismissible with a single `✕` in its own header) | Under **D1** Admin is a workspace, not a drawer over one, and its 21 legacy pane keys become linkable routes — which §2.4's overlay model cannot do at all. A settings surface that *is* a workspace cannot also be an overlay over a workspace. Its nav is the same level-2 column every other workspace uses, so there is no second nav pattern to maintain. This entry **supersedes §6.3 defect D3**, which described the same behaviour as a defect; it is now a decision. |
| D-6 | **Table header cells are interactive** — each header cell for a column that declares a control is a single button opening a menu that carries that column's sort, filter and pin. A resting `⌄` chevron renders on every such header, without hover. The sort indicator is an **arrow** (`↑` / `↓`), never a chevron | §3.1 (*"Exactly one header MUST show the active sort indicator; the rest MUST show no resting affordance"* — the second half only) · §3.1's `[observed]` description of the sort indicator as a **chevron** · the derived rule *"headers are not interactive anywhere in the product"* (foundation **AC-45**, second clause) | An operations console works one list all day and needs sort, filter and pin **per column**, in the component, so no screen hand-builds them (business-owner request, `01-table-controls.md`). **AC-45's indicator clause is upheld verbatim and strengthened: exactly one column carries a sort arrow, ever.** Only its inertness clause is suspended, and the guarantee it existed to make reviewable — *a ledger cannot be sorted* — moves to a stronger carrier: `LedgerTable` has no `sort`, `setSortField`, `setSortDirection` or `clearSort` **at all**, so a sort item in a ledger header does not compile (**AC-48**, unchanged). The affordance may not be hover-only: §7.2 and the AC-68 precedent make hidden-until-hovered capability nonexistent for a keyboard operator, and §7 beats §3. The glyph split is forced: §1.5 and §9.1 translation row 9 reserve the trailing caret *"exclusively for controls that open a menu or select"*, so `⌄` cannot also mean sort — and §3.2's direction pair already uses arrows `[observed]` `03-products/products-list-sort-popover.webp`. Two interactive elements in one 32px header cell are refused: §7.7 requires ≥24×24 each and **D-2 may not be cited against §7.7**. |

**The two §2.1 nav clauses, restated after D7. Both were rewritten under D6 and one of them
reverses again — read this before touching either nav column.**

- **The tonal step is MET; the "no border" half is now DEVIATED FROM, on measured evidence.**
  §2.1 reads *"a near-canvas grey one step darker than the canvas … MUST NOT draw a border,
  divider or shadow between nav and content."* Under D7 the content region is **white** and
  the nav is `--ev-bg-nav` `#f8fafb`, so the nav is still one step darker and the first half
  holds. But that step is **1.047 : 1** — five units of luminance is not a boundary — and
  Navattic draws a 1px hairline on **both** seams (rail→column and column→content), present
  at destination x = 28 and x = 142 in every sidebar frame. **The hairlines come back**, which
  reverses `DECISIONS.md` **D6**'s second consequence bullet. D6's other bullets survive with
  new values. **D-4 therefore suspends §2.1's no-border clause**, and this sentence is the
  naming that makes it sanctioned rather than a defect.
- **`--bg-nav`'s V3 derivation is VOID.** It was pinned as *"the darkest grey in `--bg`'s hue
  family at which the resting nav label still clears 4.5:1"* — 4.523 against 4.482 one shade
  darker. That constraint assumed a nav materially darker than the canvas. The measured
  Navattic nav is `#f8fafb`, a hair off white, so nothing binds the value and it is simply
  **measured** (`cfa43315` n=12 600, `6a08206b` n=15 300). `#eaecf1` is retired.
- **The active pill INVERTS and costs nothing.** §2.1's *"a white rounded pill"* is now a
  **grey pill `#e6e8ec` on a near-white nav** (`cfa43315`, n=150 flat). The 3px `--marker`
  edge and the 1px border stay **removed**; the pill alone is the treatment, at both levels.
  Pill-to-ground contrast: Shopify measured **1.192**, Eyvar under D6 **1.182**, Navattic
  measured **1.172** — parity, upside down. Only the clause's *elbow-connector* half is
  suspended for its original reason, and it is listed above.

**D-9 — one page width.** `SingleColumnPage`'s `full | capped` width prop is deleted; every
single-column page and every detail page runs the full width of the content region with a
16px inline gutter. **Suspends:** the derived rule that an Overview or a settings pane is
measure-capped. **Why:** two sibling sub-tabs in the same workspace were putting their `<h1>`
244px apart at 1920 — `capped` centres the whole block and moves the header with it — and
nothing else about them differed, so an operator read the movement as breakage. Shopify keeps
alignment fixed by running index pages full-bleed with a uniform page padding (measured:
content starts at x = 264 on both a dense table and an empty state). Measure is not abandoned,
it moves down one level, to the metric-tile grid, the 640px form column and the 384px prose
block. `--page-max` survives with one consumer, the full-bleed plan editor.

**D-10 — the nav row is 28px and the nav count chip has its own two fills.** **Suspends:**
§2.3's observed nav-row figure (R13 makes observed pixel figures non-binding) and §12.1's
single neutral badge fill. **Why:** at 32 the nav row equalled the data row, breaking the
§2.3 ↔ §3.1 relationship that a nav row is *shorter* than a data row, which is why the column
read as a stack of cards rather than a list of links; 28 is one 4px step below and equals the
measured Shopify figure. And the neutral chip on `--bg2` is 1.073:1 **lighter** than the nav
ground — a plate nobody can see — which is precisely why every nav badge had been promoted to
the warning tone. `--nav-chip` (`#dadee6`) is 1.141:1 **darker**, matching Shopify's measured
`#DDDDDD` on `#EBEBEB` (1.139:1); its digits are `--ink`, because `--muted` fails AA at 11px
on any plate dark enough to read. Tone on a **workspace tile** is suppressed entirely: a
tile's number is a sum of heterogeneous queues and a sum of different kinds of thing has no
single status to report.

**D-4 replaces the former D-4 entirely; it does not supplement it.** The former entry
sanctioned an icon rail that expanded on hover (52px → 236px). That behaviour no longer
exists in the product, and leaving the entry in place would sanction something the product
does not do.

**Rules D-4 preserves, re-asserted so they are not quietly re-derived:**

- §2.1 — *"Settings MUST be pinned to the bottom of the nav column and MUST NOT scroll with
  the nav list."* `Admin` is pinned to the bottom of the rail. This is the one §2.1 nav rule
  the deviation keeps intact.
- §2.6 — *"The app MUST NOT use breadcrumbs."* Two columns are not a breadcrumb trail. The
  `Title › Subtitle` pair sanctioned by **D-3** stays, at exactly two tokens, never three.
  Level-3 details keep the single back arrow to the inline-start of the title.
- **D-3 survives; D-1 and D-2 do not.** The top bar is still light and still carries
  `Title › Subtitle` — its height moves 50 → **52px**, measured. **D-1 is void** (the primary
  is near-black) and **D-2 is retired** (Eyvar's type and spacing are the reference's, and
  its rows are rising toward it). Anyone about to cite "D-2 lets me make this smaller" is
  citing a retired row; the surviving departure is **D-2′** and it is about the page gutter
  and nothing else. The 4px-grid rule survives on its own terms via §6.3 **D15**: an off-grid
  literal is a defect regardless of which deviation is in force.

Nothing else is sanctioned. Adding a deviation means adding a row here, naming the rule
it suspends, before the code ships.

### 6.3 Defects

Verified against the source. Each is a divergence nobody decided on.

**Structure and surfaces**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D1 | **NARROWED BY D7.** `.page` sets `background:var(--white)` while cards are also white **and neither carries a border** — that is what collapses the distinction, and it is still a defect. Under **§6.2 D-11** white-on-white is the *intended* ground; a card is separated by a 1px `--ev-hairline` border and an 8px radius, measured that way in `02b895df`. So the defect is now precisely "no border", not "same colour". | §1.1, §6.2 **D-11** | `eyvar_ops_panel_v40_fixed.html:70` |
| D2 | No contextual save bar, and no wired dirty indicator. `.form-footer` exists but is used **once in the entire file** (the plan editor); the other 40 pages and all 21 settings panes have no save chrome. `.settings-dirty-dot` is defined but dead — zero other occurrences. | §2.3 | `:279`, used at `:1127`; `:248` |
| D3 | **RECLASSIFIED — no longer a defect.** Settings is a route, not an overlay. Under `DECISIONS.md` **D1**, `Admin` is one of five workspaces and its level-2 column is its settings nav, so this is now a deliberate choice: see **sanctioned deviation D-5** in §6.2, which names the §2.4 rules it suspends. The number is retained rather than reused, because D1–D24 are cross-referenced from `docs/ref/defects.md` and elsewhere. | §2.4 → **§6.2 D-5** | `:1416`, `:70–71` |
| D4 | Global search is a 230px field in the right-hand cluster, not a centred command surface. | §2.1 | `:569` |

**Status and feedback**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D5 | 11 badge tones (`b-green, b-red, b-amber, b-blue, b-teal, b-purple, b-grey, b-eco, b-com, b-gold, b-silver`) with no documented meaning map. Target is five (R7). | §3.4, R7 | `:118–129` |
| D6 | Three parallel status systems with byte-identical colours: `.b-green` = `.h-green` = `.days-ok`, each repeating `10px/600`, `2px 7px`, `999px`. | §3.4 | `:118–129`, `:131–138`, `:140–142` |
| D7 | **The toast system does not conform.** A complete system exists — `toast()` at `:5269`, 352 call sites, 4 tones, auto-dismiss with hover-pause, RTL-aware stack. Six conformance failures: it is a light tinted card not a dark pill; anchored bottom-right not bottom-centre; carries emoji glyphs (§5.7 forbids); routinely exceeds the length cap (R9); injects a clickable `· view →` link into the body (§5.1 forbids); and all 12 tone hexes are off-token. | §5.1, §5.7, R9 | `:5236–5320`, `:5272–5275`, `:5290` |
| D8 | Banners exist only as ~6 divergent inline-styled implementations — `statusBanner`, `scenarioBannerHTML()`, `commitBanner`, `approvalBanner`, `postponeBanner`, `outcomeBanner`, `reconcileBannerHTML` — with no shared component, tone map, placement rule, or dismiss rule. | §5.2, R1 | `:7124`, `:8329`, `:4313–4329`, `:5139`, `:4106` |
| D9 | Empty states are pervasive (~25) and often well written, but every one is an inline `<td colspan>` or `<div>`: no shared component, padding drifts across 14/16/20/30px, none carries the illustration/heading/action a first-run state requires. | §3.6, R8 | `:2240`, `:3438`, `:4029`, `:6495`, +~20 |
| D10 | A native `alert()` serves as a confirmation: `alert('✅ Subscription confirmed and activated!')` — violates the modal rules, the no-emoji rule and the no-exclamation rule at once. | §5.3, §5.7 | `:5233` |
| D11 | 49 `b b-red` badges in use (84 `b-red` occurrences) with no justification recorded anywhere. | R5 | file-wide |

**Tokens and drift**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D12 | **36 off-token hex colours** in the CSS block alone (44 distinct hexes outside `:root`; only 8 match a token). Includes a second brand blue `#105291`, a third green `#3B6D11`, a fourth `#1E9E5A`, a fifth `#1E7B34`, and Google's blue `#1A73E8`. | §6.4 | `:22–468`; `:80`, `:116`, `:188`, `:328`, `:341` |
| D13 | **15 distinct font sizes** (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 19, 23px) against a six-role ramp. | §1.2 | `:22–468` |
| D14 | **13 distinct border radii** (2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 99, 999px); nine are outside the permitted set. | §1.4 | `:22–468` |
| D15 | Off-grid spacing throughout — `.page{padding:18px;gap:14px}`, `.ch{padding:11px 14px}`, `td{padding:9px 11px}`, `.kpi{padding:13px 15px}`. **An off-grid literal is a defect on its own terms**, independent of any deviation. (This row used to lean on D-2's "smaller, never off-grid" clause; D-2 is retired under D7 and the rule stands without it — Navattic is on the same 4px grid.) | §1.3 | `:70`, `:89`, `:150`, `:104` |
| D16 | No radius, spacing, shadow, font-size or duration tokens exist, so three of the four categories §6.4 governs cannot be checked. | §6.4 | `:11–21` |
| D17 | `.5px` hairlines render inconsistently across DPRs — and **262 of the 316 occurrences are inline styles inside JS template literals**, so a CSS-only fix reaches under 18% of them. | §1.4 | 54 in CSS, 316 file-wide |
| D18 | Uppercase + letter-spacing is banned for labels but used in **8 selectors**, not one: `table.dt th`, `.sb-sec-lbl`, `.kpi-lbl`, `.sec-badge`, `.settings-tab-group-lbl`, `.ptable th`, `.live-sec-hdr`, `.ms-lbl`. | §1.2 | `:149`, `:39`, `:110`, `:227`, `:233`, `:263`, `:363`, `:367` |

**Accessibility** — see §7 for the governing rules.

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D19 | Row actions are `opacity:0` until `:hover`, with no `:focus-within` fallback — unreachable by keyboard and invisible on touch. | §7.3 | `:153–154` |
| D20 | Focus is `outline:none` with only a border-colour change, in **11 places** — 5 in the stylesheet (`.field input:focus`, `.feat-row input:focus`, `.ptable td input:focus`, `select:focus`, `.csel-search`) and **6 more inline on search inputs inside JS template literals**, which no stylesheet fix can reach. | §7.2 | `:253`, `:259`, `:268`, `:290`, `:310`; see §7.2 for the inline six |
| D21 | Text contrast fails in two places, one of them everywhere: `.hint{color:#aaa}` computes to **2.32:1** (2 uses), and **`--ghost` `#9B9B97` computes to 2.79:1 across 431 uses** — it is the default colour for every secondary label in the product. `--muted` (5.35:1) passes and already exists, so the fix needs no new token. `.b-grey` (2.62:1, 100 uses) and `--amber` as a graphic (1.88–2.16:1) also fail. | §7.1 | `:254`, `:18`; §7.1 for the full table |
| D22 | `.field label` is `11px var(--muted)` — labels read as hints. (Contrast is fine at ≈5.07:1; the defect is size and hierarchy, not colour.) | §4.2 | `:250` |
| D23 | `.modal-close` and `.feat-rm` turn red on hover, signalling destruction for a neutral dismiss. | §5.3 | `:198`, `:261` |
| D24 | Three ambient animations loop indefinitely — `ping-pulse`, `live-dot`, `reqPulse` — plus a runtime-injected `spin`, none guarded by `prefers-reduced-motion`. Under R18 all three are illegal as written: a loop may only signal "this feed is live", and may never encode severity. (`kpiFlash` runs once and is not in scope.) | §7.6, §8.1.6, R18 | `:329–331`, `:341–342`, `:145` |

**Fix order.** D1, D16 and D20 first — they are cheap and everything else compounds on
them. Then D5/D6 (collapse three status systems into one), then D7/D8 (make the shipped
toast conform, extract one banner component). D12–D15 and D17 are a mechanical sweep best
done once, after the token set exists.

### 6.4 Surface-by-surface mapping

All 41 pages. A page with no row here may not be designed until it gets one.

| Eyvar page(s) | Pattern | Section |
|---|---|---|
| `drivers`, `riders`, `trips`, `subscriptions`, `corporate`, `contacts`, `quickrides`, `plans`, `zones`, `audit-log` | Index table + view tabs + filters + bulk action bar | §3.1–3.3 |
| `applicant-detail`, `corp-detail`, `ticket-detail`, `profile` | Two-column detail: main + right rail summary, with timeline | §2.2, §3.8 |
| `plan-edit` | Sectioned form + save bar + **derived-value rules** | §4.1, §2.3, §8.2 |
| `settings` (21 panes), `my-account` | Settings shell with its own nav | §2.4, **D-5** |
| `exec-overview`, `dashboard`, `predictive`, `growth`, `coverage`, `commitment`, `fairness`, **`fraud`** | Metric tile row + chart cards | §3.7 |
| `live` | **Monitoring shell** — map + synchronised side list | §8.1 |
| `finance`, `wallets`, `rwallets` | **Ledger** — append-only, money formatting | §8.3 |
| `all-pending`, `requests`, `requests-sub-all`, `requests-instant-all`, `interventions`, `readiness`, `renewal` | **Work queue** — claim, SLA, disposition, row-level critical | §8.4 |
| `support`, `compliance`, `safety` | Index table → detail with timeline | §3.1, §3.8 |
| `inbox`, `notifications-all` | Activity feed | §3.8 |

> **`fraud` moved from Work queue to Metric tiles + chart cards.** Under `DECISIONS.md`
> **D1** it folds into **Management › Risk & Signals**, which `PROPOSED-STRUCTURE.md` §4.2
> describes as *"compute a flag, then send the operator somewhere else"* — every action
> button is a `go()` to another page (`:14320`, `:14336`, `:14351`, `:14363`) — and
> `PAGE-TRACEABILITY-MATRIX.md` row 4 states it *"has no work queue."* It has no claim, no
> SLA clock and no disposition, so §8.4's apparatus is inapplicable to it. Consequence for
> the component inventory: the work-queue pattern now governs **7** legacy pages and the
> metric-tile pattern **8**. No component is added or removed by the change.

**Rules**

- MUST treat §6.2 as the complete list of sanctioned deviations. A new deviation requires
  a row there naming the rule it suspends, written before the code ships.
- MUST NOT introduce a **colour** that is not a `:root` token. Extend `:root` instead.
- MUST NOT introduce a new **radius, font size, spacing value, shadow or duration** until
  D16 is closed and those token sets exist; until then, reuse a value already present in
  the CSS block and record it in the ticket that closes D16.
- MUST map any new page to a row in §6.4 before design starts.
- SHOULD close defects in the order given at the end of §6.3.

### 6.6 Implementation stack

Decided deliberately, after weighing headless primitives against a full design system.

**React + TypeScript + Vite · Tailwind v4 · shadcn/ui · TanStack Table · Vitest + Playwright.**

shadcn components are **copied into `src/components/ui/`**, not imported from a package, so
the team owns the source and restyles it to this document rather than fighting a library.

**What this changes, and what it does not.**

- §6.1's token model is **unchanged**. Tailwind v4 is CSS-first: `--ev-*` tokens live in
  `globals.css`, map into shadcn's semantic slots, and reach utilities via `@theme inline`.
  Tokens are still CSS custom properties in `:root`.
- Tokens are **namespaced `--ev-*`**. shadcn claims `--border`, `--muted` and `--primary`
  as its own semantic slots, and two of those collide with legacy Eyvar names carrying
  different meanings — `--muted` is *secondary text* in the legacy app and a *muted
  background* in shadcn. The prefix removes the collision permanently.
- Defect **D16 is closed by adoption**: Tailwind's 4px-based scale supplies the radius,
  spacing and type tokens that never existed. The "these categories are frozen" rule in
  §6.4 is lifted; the colour rule stands.
- §6.4's `MUST NOT introduce a colour that is not a token` gains a second clause:
  **Tailwind's built-in palette is not a token set.** `bg-blue-500` and `text-gray-400`
  bypass `--ev-*` entirely while looking legitimate, and are now the primary drift risk.
  Only semantic slots are permitted.
- §9.1 gains a **mechanical enforcer**: `"rtl": true` in `components.json` converts
  physical classes to logical ones as the CLI copies a component in. It does not cover
  hand-written code — `/token-audit` does.

**What the stack does not supply.** Banners (R1/R16), empty states (R8), and the whole of
§8 — the monitoring shell, the append-only ledger, the work queue with SLA and the R5a row
marker, derived-value fields. These are built from primitives. Four patterns, expected.

**The trade that was accepted.** shadcn's default styling is discarded, because §1–§5
govern anatomy — badge geometry (R15), banner family (R1), empty states (R8), the save bar
(R2) — and shadcn disagrees with all four by construction. The value bought is velocity
across 41 pages and a component set the team does not have to write. The cost is that
every added component must be restyled on arrival, and that discipline is what
`/token-audit` and the visual-QA pass exist to enforce.

### 6.5 Audit record

Two audits ran against the assembled document.

**Corrections applied.** The first draft of §6.3 claimed Eyvar had no toast system; a
352-call-site toast system exists at `:5236–5320`, and that entry is now a *conformance*
defect (D7). Claims that banners and empty states were absent were likewise overstated —
both ship in quantity as inline implementations (D8, D9). §6.1's `.page` line reference
was wrong (L70, not L75). The defect list has grown from 14 to 24: the omissions were the
largest divergences in the file — off-token colours, font sizes, radii, and settings being
a route.

**Known limits of the NAVATTIC evidence (D7).** 15 frames at the same 768 × 523 downscale,
S = 1.875 — checked against the 32px avatar and the 30px control rather than assumed. Flat
fills survive exactly (a 200 × 140 sample of the icon rail returns one colour for 100.0% of
its pixels), so every ground, tint and pill fill in the token set is a **measurement**. Three
things are below the floor and are reported as bands rather than invented: **1px stroke
colours** (a stroke covers 53.3% of one destination pixel, so borders are recovered by
integrating the luminance deficit, ±5 in Y), **small-text colour** (antialiasing makes the
darkest pixel of a 13px glyph lighter than the truth), and **radii below 8px**. Absent from
the set entirely, and therefore derived by rule and marked as such: a modal, a toast, a
tooltip, a scrim, hover, focus, disabled, error, any form, the success/info/critical tones,
a nav count, and dark mode. Full method and every ±: `design/03-navattic-language.md` §2.

**Known limits of the SHOPIFY evidence.** The screenshots are 768px renders of a ~1440px viewport,
so every pixel figure in §1–§5 is a scaled approximation, not a measurement. No hover,
focus, loading, or dark-mode state appears in the sample. No responsive breakpoint can be
derived from it. Exact hex values were eyeballed from compressed WebP and should be treated
as close, not exact. §1.6 (motion) is inferred end to end and is demoted to SHOULD by R12.
