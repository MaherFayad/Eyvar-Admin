# DESIGN.md — consistency & truth audit

> Audit target: `DESIGN.md` (2891 lines) against `eyvar_ops_panel_v40_fixed.html` (21857 lines).
> All `file:line` citations below were read directly, not inferred.
> CSS block = L9–L468; HTML body = L472–L2165; JS = L2166–L21855.
> Nothing in `DESIGN.md` or the HTML was modified.

**Headline:** §6.1 is almost entirely accurate. §6.3 is not — 3 of 14 defects are false or
substantially overstated, and the defect list omits the largest actual divergence in the file
(36 off-token colours, 15 font sizes, 13 radii). All `§N.M` numeric references resolve, but four
of them point at sections that do not contain the rule being cited, and the entire Contents block
is broken. Sections 1–5 contain at least seven direct MUST-vs-MUST or MUST-vs-Ruling contradictions,
the worst being that the primary button colour is specified three incompatible ways.

---

## 1. §6 claim verification

### 1a. §6.1 — token inventory (DESIGN.md L2801–L2832)

The section header claims the `:root` block is at "L11–L21". **Correct** — `:root{` opens at
`eyvar_ops_panel_v40_fixed.html:11` and closes at `:21`.

| Claim | Verified? | Evidence line | Correction |
|---|---|---|---|
| `--bg` / `--sb-bg` = `#EEF0F3` | ✅ | `eyvar_ops_panel_v40_fixed.html:19`, `:12` | — |
| `--bg2` = `#F8F8F5` | ✅ | `:19` | — |
| `--white` = `#fff` | ✅ | `:19` | — |
| `--border` / `--border2` = `#E4E2DA` / `#DDDBD3` | ✅ | `:20` | — |
| `--ink`/`--muted`/`--ghost` = `#1A1A18`/`#6B6B68`/`#9B9B97` | ✅ | `:18` | — |
| `--blue`/`--blue-lt`/`--blue-dk` = `#185FA5`/`#E6F1FB`/`#0C447C` | ✅ | `:12` | — |
| `--green` / `--green-lt` = `#27500A` / `#EAF3DE` | ✅ | `:15` | — |
| `--amber`/`--amber-lt`/`--amber-dk` = `#E8A33D`/`#FAEEDA`/`#633806` | ✅ | `:14` | — |
| `--red` / `--red-lt` = `#A32D2D` / `#FCEBEB` | ✅ | `:16` | — |
| `--teal`, `--purple` = `#0B6B6B`, `#4A2889` — "Extra badge tones" | ⚠️ partial | `:13`, `:17` | Values correct, **inventory incomplete**. The table omits four tokens that exist in `:root`: `--teal-lt` `#E1F5EE` (`:13`), `--purple-lt` `#EDE6FB` (`:17`), `--amber-border` `#E0B368` (`:14`), `--red-border` `#E8A9A9` (`:16`). `--amber-border`/`--red-border` are **not** badge tones — they are button-border tokens (`.btn.danger`/`.btn.warn`, `:82–83`). The doc lists 22 tokens; `:root` holds 24. |
| Base font size `13px` (`body`) | ✅ | `:22` | — |
| Page title `17px / 500` (`.ph-l h1`) | ✅ | `:73` | — |
| Card radius `11px` (`.card`) | ✅ | `:88` | — |
| Card border `.5px solid var(--border)` | ✅ | `:88` | — |
| Sidebar `52px` collapsed, `236px` on hover/pin | ⚠️ incomplete | `:24`, `:30` | Both correct, but a **third** width exists and is unmentioned: `body.lang-ar .sb:hover,.sb.pin{width:268px}` (`:31`) and `268px!important` under the mobile breakpoint (`:435`). |
| Top bar `50px`, white | ✅ | `:59` | — |
| Table row `9px 11px` cell padding, 12px text | ✅ | `:150` (`td`), `:148` (`font-size:12px`) | Header padding differs (`8px 11px`, `:149`) — not stated either way. |
| Modal `520px`, radius `14px` | ✅ | `:193` | — |
| Primary button blue fill `#185FA5`, radius `8px` | ✅ | `:79` (`.btn.p`), `:77` (`border-radius:8px`) | — |
| Badge pill `999px`, `10px / 600` | ✅ | `:118` (`.b`) | — |
| Toggle `32×18` green-when-on | ⚠️ overstated-as-clean | `:184`, `:188` | Dimensions correct. The "green" is **`#1E9E5A`** (`:188`) — a hard-coded hex that is *not* `--green` (`#27500A`) and not any `:root` token. This is exactly the violation §6.4's `MUST NOT introduce a new colour…` forbids, and §6.3 does not list it. |
| "41 `.page` divs, 21 settings sub-panes" (§6 preamble, L2795–96) | ✅ | 41 `class="page"` matches; 21 `class="settings-panel"` / 21 `id="stab-*"` | Matches `docs/00-index/GROUND-TRUTH-INVENTORY.md` file-facts table exactly. |
| Header claim: "159 real screenshots" across 16 folders | ✅ | `find docs/06-design-reference/shopify-admin-web -name '*.webp'` → 159; 16 numbered folders present | — |
| §6.4 reference to `MODALS.json` | ✅ | `./MODALS.json` exists at repo root | — |

### 1b. §6.3 — the 14 alleged defects (DESIGN.md L2848–L2866)

| # | Claim | Verified? | Evidence line | Correction |
|---|---|---|---|---|
| D1 | `.page` sets `background:var(--white)`; canvas/surface collapse. "`.page` (L~75)" | ✅ claim / ❌ line | `eyvar_ops_panel_v40_fixed.html:70` | Substantively **true**. Line ref is wrong: `.page` is at **L70**, not L75. L75 is `.br`. Worth adding: `body` *does* carry `background:var(--bg)` (`:22`) and `.sb` uses `--sb-bg` (`:24`), so the nav/canvas relation §1.1.1 L195 demands is actually satisfied — the collapse is only on `.page`. |
| D2 | No contextual save bar; long forms rely on a footer `.form-footer` only | ⚠️ **understated** | `:279`, used once at `:1127` | Directionally true but the reality is worse than stated. `.form-footer` appears **exactly once in the whole file** — the plan editor (`:1127`), paired with `.form-topbar` (`:1085`). The other 40 pages and all 21 settings panes have *no* form-level save chrome at all. Separately, `.settings-dirty-dot` **is** defined (`:248`) but is dead CSS — no other occurrence anywhere in 21.8k lines, so dirty state is never surfaced. D2 should read "no save bar and no wired dirty indicator; one page has a footer". |
| D3 | **"No toast system in CSS; feedback appears ad hoc"** | ❌ **FALSE** | `:5236–5320` | A complete toast system exists in JS with **352 call sites**. `toast(msg,type,onClick,notify)` at `:5269`; `ensureToastStack()` at `:5236`; `TOAST_DURATION=6000` (`:5257`), `TOAST_MAX=1` (`:5258`). It has four tones (`:5271–5276`), a stack container fixed bottom-right that flips to bottom-left under `body.lang-ar` (`:5256`), enter/exit transform+opacity transitions (`:5288`), an `×` dismiss (`:5291`), auto-dismiss with hover-pause (`:5305–5310`), and automatic mirroring into a Notification Center via `pushOpsNotification` (`:5294–5296`, defined `:9661`). D3 is wrong on the facts and, worse, it hides six *real* §5.1 conformance defects that no D-entry covers: (a) toasts are a **light tinted card**, not the dark pill §5.1 L2419 mandates; (b) **bottom-right**, not the bottom-centre L2419 mandates; (c) they carry an **emoji glyph** (`:5272–5275`) which §5.7 L2780 forbids outright; (d) call sites routinely exceed the "≤ ~5 words" cap of L2420 (e.g. `:4029`, `:2407`); (e) a clickable **`· view →` link** is injected into the toast body (`:5290`), banned by L2423; (f) all 12 tone hexes (`:5272–5275`) are off-token. Rewrite D3 as a conformance defect, not an absence. |
| D4 | No banner component (`success`/`warning`/`critical` in-page banners) | ⚠️ **half-true** | `:7124`, `:8329–8344`, `:4313–4329`, `:5139` | There is no reusable *class*, correct — but banners are shipped in quantity as inline-styled HTML strings: `statusBanner` (`:7124`, a full tone-mapped approve/reject/pending banner), `scenarioBannerHTML()` (`:8329`), `commitBanner`/`approvalBanner`/`postponeBanner` (`:4313–4329`), `outcomeBanner` (`:5139`), `reconcileBannerHTML` (`:4106`). Reword to "banners exist only as ~6 divergent inline implementations with no shared component, tone map, dismiss rule, or placement rule" — that is the actual defect and it is more actionable. |
| D5 | Badge palette has 11 tones with no meaning map. "`.b-*` (L~120)" | ✅ | `:118–129` | Count is exactly right: `b-green, b-red, b-amber, b-blue, b-teal, b-purple, b-grey, b-eco, b-com, b-gold, b-silver` = **11**. Line region is `:118–129`, not "L~120" — close enough to be usable. |
| D6 | Two parallel status systems, `.b-*` vs `.health`/`.days-*`, duplicated colours. "L~120–142" | ✅ | `:118–129`, `:131–138`, `:140–142` | Confirmed, and the duplication is literal, not approximate: `.h-green` (`:132`) is `#EAF3DE`/`#27500A`, byte-identical to `.b-green`'s `var(--green-lt)`/`var(--green)`; `.days-ok` (`:140`) repeats the same pair a third time. All three also repeat the same `font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px`. Line region `:118–142` — accurate. |
| D7 | Table headers uppercase 10px + `--bg2` fill | ✅ but **scoped too narrowly** | `:149` | `table.dt th` confirmed exactly (`font-size:10px;text-transform:uppercase;letter-spacing:.3px;background:var(--bg2)`). But §1.2 L241 bans uppercase + letter-spacing on "table headers, badges, and nav section labels", and **seven further selectors violate it**, none listed: `.sb-sec-lbl` (`:39`), `.kpi-lbl` (`:110`), `.sec-badge` (`:227`), `.settings-tab-group-lbl` (`:233`), `.ptable th` (`:263`), `.live-sec-hdr` (`:363`), `.ms-lbl` (`:367`). Fixing only `table.dt th` leaves the rule broken in 7 places. |
| D8 | Row actions `opacity:0` until hover. "`.ra`" | ✅ | `:153–154` | `.ra{…opacity:0…}` / `table.dt tr:hover .ra{opacity:1}`. Confirmed. Note there is no `:focus-within` fallback, so the keyboard claim is exactly right. |
| D9 | `.modal-close` turns red on hover | ✅ | `:198` | `.modal-close:hover{background:var(--red-lt);color:var(--red)}`. Confirmed. The same anti-pattern also exists on `.feat-rm:hover` (`:261`) — unlisted. |
| D10 | Hairlines at `.5px`; "global" | ✅ **and worse** | 54 in CSS (`:9–468`); **316 file-wide** | "Global" is right but the scale matters for remediation: only 54 of the 316 `.5px solid` occurrences are in the `<style>` block. The other **262 are inline `style="…"` strings inside JS template literals**, so a CSS-only or token-based fix reaches under 18% of them. |
| D11 | Focus sets `border-color` only, no ring. "`.field input:focus`" | ✅ | `:253` | `.field input:focus,.field select:focus{outline:none;border-color:var(--blue)}` — `outline:none` with no replacement. Confirmed. Same pattern repeats unlisted at `:259` (`.feat-row input:focus`), `:268` (`.ptable td input:focus`), `:290` (`select:focus`), `:310` (`.csel-search`). |
| D12 | `.hint` is `#aaa` on white, below 4.5:1 | ✅ | `:254` | `.hint{font-size:10px;color:#aaa}` on `--white`. Computed contrast **2.32:1** — well below 4.5:1 and below even 3:1. Confirmed, and `#AAA` is also an off-token literal. |
| D13 | "Empty states are undocumented/absent as a component" | ⚠️ **overstated** | `:2240`, `:3438`, `:3444`, `:3517`, `:4029`, `:6002`, `:6383`, `:6495`, +~20 more | Empty states are **pervasive and often well-written**, with context-aware copy and next-step guidance — e.g. `:4029` "No rider has any wallet activity yet — add a credit from any rider's 360° profile to get started."; `:6495` "No corporate accounts yet — check the Inbox for leads, or add one directly."; `:3438` branches three ways on filter/query/first-run, which is precisely what §3.6 L1499 asks for. What is absent is a *shared class*: every one is an inline-styled `<td colspan>` or `<div>`, and the padding drifts across 14/16/20/30px and the colour is always `var(--ghost)` with no illustration or action. Reword to "≈25 inline empty-state implementations with no shared component; padding and structure drift; none carries the illustration/heading/action §3.6 L1492–1496 requires for a first-run state." |
| D14 | Field labels `11px var(--muted)` | ✅ | `:250` | `.field label{font-size:11px;color:var(--muted)}`. Confirmed. Note the contrast criticism is soft: `--muted` `#6B6B68` on white is ≈5.07:1, which passes; the defect is size and hierarchy, not contrast — worth saying so, since D12 next to it *is* a contrast defect and the two read as the same complaint. |

### 1c. Defects §6.3 omits entirely

These are larger than several of the D-entries and are forbidden by §6.4's own `MUST NOT` rule
(DESIGN.md L2885–86):

| Missing defect | Evidence | Rule violated |
|---|---|---|
| **36 off-token hex colours in the CSS block alone** (44 distinct hexes used outside `:root`; only 8 match a token value). Includes a second brand blue `#105291` (`:80`, `:222`), a third green `#3B6D11` (`:116`, `:136`, `:174`), a fourth `#1E9E5A` (`:188`), a fifth `#1E7B34` (`:328`), and an entirely foreign blue `rgba(26,115,232,…)` = `#1A73E8` (`:341`, `:342`, `:347`) which is Google's blue, not `--blue`. | `:22–468` | §6.4 L2885 `MUST NOT introduce a new colour … not already a token in :root` |
| **15 distinct font sizes** in the CSS block (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 19, 23px) | `:22–468` | §1.2 L239 `MUST cap the ramp at six roles … MUST NOT add sizes ad hoc`; §6.4 L2885 |
| **13 distinct border radii** (2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 99, 999px). §1.4 L351 permits only {4, 8, 12, 16, full}; nine of the thirteen are illegal. | `:22–468` | §1.4 L351; §6.4 L2885 |
| **Off-grid spacing throughout** — `.page{padding:18px;gap:14px}` (`:70`), `.ch{padding:11px 14px}` (`:89`), `table.dt td{padding:9px 11px}` (`:150`), `.kpi{padding:13px 15px}` (`:104`). §1.3 L297 names 10/14/18/22px as the exact values not to ship. §6.2's "higher density" deviation sanctions *smaller* values, not *off-grid* ones. | `:22–468` | §1.3 L297 |
| **Settings is a route, not an overlay** — `<div class="page" id="p-settings">` at `:1416`; switching to it hides the previous `.page` via `.page.on` (`:71`). §2.4 L828–831 states settings `MUST` be an overlay that keeps the app top bar above it, `MUST` be `×`-dismissible, and `MUST NOT` be a route that destroys the previous page. Not in §6.2, not in §6.3. | `:1416`, `:70–71` | §2.4 L828–831 |
| **The top bar carries no logo** — the wordmark lives in `.sb-logo` (`:481`); `.tb-left` is title + `.tb-sep` + subtitle (`:60–63`). §2.3 L741 requires the save bar to `MUST keep the product logo in the left slot`, which is unimplementable on Eyvar's frame. Not reconciled anywhere. | `:59–63`, `:481` | §2.3 L741 |
| **Global search is not centred** — `.tb-search` is a 230px field inside the right-hand cluster (`:569`). §2.1 L567 requires it `MUST be horizontally centred on the viewport`. | `:569` | §2.1 L567 |
| **A native `alert()` is used for a confirmation** — `function confirmModal(){alert('✅ Subscription confirmed and activated!');closeModal();}` (`:5233`). Violates §5.3 wholesale plus §5.7 L2780 (no exclamation marks, no emoji). | `:5233` | §5.3, §5.7 L2780 |
| **49 `b b-red` badges in use** (84 `b-red` occurrences total). R5 rules "no red badges" and says `b-red` "becomes an exception requiring justification" — but no D-entry, no §6.2 entry, and no justification exists anywhere in the repo. | file-wide | Ruling R5 |
| **Ambient looping animations** — `ping-pulse … infinite` (`:329–331`), `live-dot 2s infinite` (`:341–342`), `reqPulse` (`:145`), `kpiFlash 1.4s` (`:108–109`). §1.6 L431 caps *all* UI transitions at 100–250ms and forbids exceeding 300ms. | `:108`, `:145`, `:329–342` | §1.6 L431 |

---

## 2. Dangling references

**Numeric `§N.M` refs: all 26 resolve.** Every `§` reference in the document
(§1, §1.1, §2, §2.2, §2.3, §2.4, §2.5, §3, §3.1, §3.4, §3.6, §3.7, §3.8, §4, §4.1, §4.4, §4.6,
§5, §5.1, §5.2, §5.3, §5.5, §5.7, §6.1, §6.2, §6.4) matches a heading that exists. No numerically
dangling reference.

**But four references resolve to a section that does not contain the cited rule**, and one whole
block of links is broken:

| Location | Reference | Problem |
|---|---|---|
| **DESIGN.md L10–L15** (Contents) | all six anchors | **Every TOC link is dead.** The anchors are written `#-1-foundations`, `#-2-layout--navigation`, `#-3-data-display`, `#-4-forms-inputs--actions`, `#-5-feedback-overlays--voice`, `#-6-applying-this-to-eyvar-admin` — each carries a **leading hyphen** that GitHub's slugifier does not produce (correct: `#1-foundations`, etc.). The link *text* also literally reads `## 1. Foundations`, markdown markers included. Six of six broken. |
| **DESIGN.md L59** (Ship checklist) | "Every interactive element has a visible focus state — **§4.4**" | §4.4 is *Validation and errors* (L1992–L2066). Its rule list (L2054–L2063) contains **no focus rule of any kind**. The focus rule is at **§4.2 L1899**, with the stroke-width permission at **§1.4 L354**. A reader following the checklist lands on the wrong section. |
| **DESIGN.md L52** (Ship checklist) | "Empty, **loading**, and error states are all designed — §3.6, §5.2" | §3.6 is empty states; §5.2 is banners. **Neither mentions loading.** The word "loading" appears in the whole document exactly twice outside this line: at L448, where §1.7 *admits* loading states could not be established, and at L1589, which forbids a spinner in a chart card. The checklist mandates a deliverable the document never specifies. |
| **DESIGN.md L74** (Ruling R6) | "a missing trailing period on the **products** no-data line — **§3.7**" | §3.7 is *Analytics display*. The only no-data evidence it cites is `07-analytics/analytics-dashboard-today-no-data.webp` (L1507, L1516, L1533, L1537, L1555) — **analytics, not products**. The punctuation rule R6 actually establishes lives in §5.7 L2787; the products empty-state material is §3.6. The cited artifact does not exist in the cited section. |
| **DESIGN.md L70** (Ruling R2) | "contextual save bar … — **§1, §4.6**" | The save-bar specification is **§2.3** (L692–L757), which R2 never cites. §1 is a 360-line section; §4.6 is the button system. Both resolve, neither is where the reader needs to go. |
| **DESIGN.md L2859, L2862, L2863** (§6.3, D8/D11/D12) | "§3 Index table + **a11y**", "§4 Forms + **a11y**", "§1 Colour + **a11y**" | **There is no a11y section.** Three defects cite a rule source that does not exist in the document. The document contains zero occurrences of "aria", "screen reader", "WCAG", or "a11y" outside these three D-rows and the two glancing mentions at L199 (`≥4.5:1`) and L2232 (accessible name). |
| **DESIGN.md L2871** | "§3.1–3.3" | A range, not a link. §3.2 and §3.3 are never individually referenced anywhere in the document, and §3.9 (*Reference wireframe*) is referenced zero times despite L1715 declaring `New index pages MUST be built from this wireframe`. |

---

## 3. Rule conflicts

### 3.1 The primary button colour has three incompatible answers

This is the single most damaging conflict in the document, because it governs the most common
decision a developer makes.

| Source | Line | Says |
|---|---|---|
| §1.1.4 rules | L196 | `MUST use near-black #303030 … blue is reserved for links and MUST NOT be used as a button fill` |
| §4.6 rules | L2228 | `MUST use the near-black primary; MUST NOT introduce a second primary colour in the admin` |
| Ruling R3 | L71 | `Eyvar keeps brand blue --blue for primary actions` |
| §6.2.1 | L2834–36 | `Keep --blue for primary buttons and the active nav indicator` |
| §2.3 rules (save bar) | L750 | `Eyvar Admin SHOULD standardise on Discard + light Save` — a light/white fill |
| Ruling R2 | L70 | `Use the neutral/brand primary` for the save bar |

Four of these are `MUST` or `MUST NOT`. §1.1.4 and §4.6 are written as unqualified, unmarked MUSTs
binding on this repo (the document's own status line, L3, says "binding for all new UI work"), with
no "Shopify-only" tag and no forward pointer to R3 or §6.2. A developer who opens §4.6 — the
obvious place to look up a button — ships a `#303030` primary and is wrong.

Compounding it: the save bar's primary is specified as *brand blue* by R2, *light/white* by §2.3
L750, and *near-black* by §4.6 L2228. And §2.3's "light Save" is derived from Shopify's **dark**
top bar; Eyvar's top bar is white (`:59`, sanctioned by §6.2.3), so a light-filled Save on it would
be invisible. The document never notices this.

**Also unstated anywhere:** the precedence order between the Rulings table, §1–5, and §6.2.
"How to use it" (L32–39) tells the reader to check §1 and §6.1 before writing CSS but never says
which wins when they disagree.

### 3.2 Badge palette: 5 tones vs 6 tones vs "no critical"

| Source | Line | Says |
|---|---|---|
| §1.1.5 | L201 | `SHOULD ship exactly six badge tones (success, warning, critical, info, new, neutral) and SHOULD NOT invent a seventh` |
| §3.4 | L1363 | `The badge palette MUST be closed: success, warning, neutral, critical, info` — **five**, no "new" |
| Ruling R5 | L73 | `no red badges. A critical state is communicated by a banner or a red action, not a red pill` |
| §1.7 | L446 | `A critical-tone badge never appeared in the 33 captures read` |

Three different palettes. §1.1.5 and §3.4 disagree on whether "new" is a tone (6 vs 5), and **both
mandate a `critical` tone that R5 forbids.** §1.7's own observation supports R5 and contradicts both
rule lists. Nothing reconciles them, and §6.3 D5 ("11 tones with no meaning map") cannot be closed
until the target number is settled — it is currently 5, 6, or 4-plus-a-banner depending on which
line you read.

### 3.3 Empty states: illustration required, forbidden, and required again

| Source | Line | Says |
|---|---|---|
| §1.5 | L404 | `MUST use an illustration, not an enlarged icon, for empty states` (unqualified) |
| §3.6 | L1492 | `A resource with zero records MUST show the illustrated whole-page empty state` |
| §3.6 | L1497 | `An empty card or section MUST NOT use an illustration or heading — one grey sentence only` |
| §3.6 | L1498 | `An empty section whose emptiness is meaningful MAY add … a small inline illustration` |
| §3.8 | L1663 | `Timelines MUST NOT use an illustrated empty state` |
| §5.7 | L2782 | `MUST title empty states with the value of the section and give them an illustration, a one-to-two-sentence body, and at least one action` (unqualified) |

§5.7 L2782 and §1.5 L404 are blanket MUSTs that directly contradict §3.6 L1497 and §3.8 L1663.
§3.6 L1497 (`MUST NOT use an illustration`) and L1498 (`MAY add … a small inline illustration`)
contradict each other one line apart, with "whose emptiness is meaningful" as the only
discriminator — an untestable predicate.

### 3.4 Toast: ≤5 words vs echo the exact name

| Source | Line | Says |
|---|---|---|
| §5.1 | L2420 | `MUST limit a toast to one line of ≤ ~5 words plus an optional value` |
| §5.1 | L2426 | `SHOULD echo the object's exact UI name in the toast, including parentheticals` |
| §5.7 | L2784 | `MUST echo the triggering button's exact object in the resulting toast or banner` |

A five-word budget cannot accommodate an exact object name *with parentheticals*. L2784 promotes
the echo to a MUST, so the two MUSTs are in direct tension for any object whose name exceeds three
words — which describes most Eyvar records (`Weekly plan — Riyadh North`).

### 3.5 Toast vs banner pairing

- §5.0 L2377: `SHOULD pair a toast with a banner when the action both succeeded and opened a next step`
- §5.2 L2474: `MUST NOT use a banner where a toast would do (no next step, no standing condition)`
- §5.2 L2473: `MUST NOT stack more than one page-level banner`
- §4.4 L2063: `SHOULD confirm success with a transient dark toast, not a persistent banner`

L2377 and L2063 point opposite ways for the same event (a successful save that opens a next step).
L2474's escape clause ("no next step") technically resolves it, but only by requiring the reader to
hold three rules from two sections simultaneously.

### 3.6 Breadcrumbs: forbidden by §2.6, shipped by §6.2

- §2.6 L1046: `The app MUST NOT use breadcrumbs. Hierarchy MUST be expressed by a single back arrow left of the page title`
- §6.2.3 L2842–44: sanctions Eyvar's "white 50px top bar with **breadcrumb-style title**" as a deliberate deviation

Confirmed in code: `.tb-title` + `.tb-sep` + `.tb-sub` (`:60–63`), rendered as `Title › Subtitle`.
§6.2 does not cite the rule it is overriding — none of the four §6.2 entries do — so the conflict
is invisible unless the reader has both sections open. Since §6.4 L2883 declares §6.2 "the complete
list of sanctioned deviations", this one *is* sanctioned; the defect is that §6.2 never names which
MUST each deviation suspends.

### 3.7 §6.4's central `MUST NOT` is unsatisfiable

§6.4 L2885–86: `MUST NOT introduce a new colour, radius, shadow, or font size that is not already a
token in :root; extend the token set instead of hard-coding a value.`

`:root` (`:11–21`) contains **24 colour variables and nothing else** — no radius token, no shadow
token, no font-size token, no spacing token, no z-index token. Three of the four categories the
rule governs have zero tokens to check against, so the rule is impossible to comply with as
written and impossible to enforce in review. The live file already carries 13 radii, 15 font sizes,
and every shadow as a literal `rgba()`.

### 3.8 §1.6 is a section of MUSTs the document says are unverified

§1.6 L431–436 issues six motion MUSTs. §1.6 L437 then says:
`SHOULD re-verify every value in this subsection against a live product before treating it as a
spec — all of it is inferred, none of it is observed.`

A section cannot simultaneously bind and disclaim itself. Either the MUSTs demote to SHOULDs or
L437 is removed; as written, §1.6 is unenforceable and a reviewer cannot cite it.

### 3.9 MUSTs that are untestable as written

A MUST must be a pass/fail check. These are not:

| Line | Rule | Why it fails |
|---|---|---|
| L435 | `MUST NOT animate hover states with more than ~100 ms of delay — an admin must feel instantaneous` | "~100 ms" is an approximation on a hard threshold, and "must feel instantaneous" is a sentiment, not a check. Split into `transition-delay: 0ms` on hover (checkable) and delete the clause. |
| L2420 | `MUST limit a toast to one line of ≤ ~5 words` | `≤ ~5` is self-contradictory notation — an inequality applied to an approximation. Pick 5 or pick "one line at 360px". |
| L1494 | `The explanation … MUST NOT exceed ~380 px measure` | Tilde on a MUST. Also unmeasurable without a font/size fixed; give a `max-width` value. |
| L303 | `MUST NOT let a table row with a 32 px thumbnail be shorter than ~52 px` | Tilde on a MUST. |
| L563 | `The frame MUST be a fixed dark top bar (~56 px) plus a fixed left nav (~256 px)` | Tilde on a MUST, **and the number is internally inconsistent** — see 3.10. |
| L1802–03 | `MUST put one concern per card … MUST NOT stack unrelated field groups into one card` | "concern" and "unrelated" are unbounded judgment calls with no test. |
| L2469 | `MUST give a banner an icon, a title, and — for anything beyond a bare confirmation — one body sentence` | "bare confirmation" is never defined. |
| L1498 | `An empty section whose emptiness is meaningful … MAY add …` | "meaningful" is untestable, and it gates an exception to a MUST NOT one line above. |
| L2472 | `SHOULD give success banners a next-step affordance` | SHOULD, so acceptable — flagged only because it is the pair to L2377/L2474 above. |
| L1159 | `Row height SHOULD be ~40 px … and MUST be uniform within a table` | The MUST half (uniform) is testable; correctly split. Included as the model the others should follow. |

### 3.10 Three different left-nav widths

| Source | Line | Value |
|---|---|---|
| §1 preamble (measurement calibration) | L86 | `left nav (128 img px → **240 px**)` — used as one of the two constants proving the 1.875× scale |
| §2.1 rules | L563 | `a fixed left nav (~256 px)` |
| §6.1 structural table | L2825 | Shopify equivalent: `fixed ~232px, always expanded` |
| §2.4 rules | L832 | settings nav `~304 px` |

The 240px figure at L86 is load-bearing — it is one of two measurements the document uses to
establish that every "px" value in §1 is trustworthy. If the nav is 256px (L563) or 232px (L2825),
the scale factor and therefore *every derived measurement in §1* shifts. These three numbers cannot
all be right, and the document does not acknowledge the discrepancy.

---

## 4. Coverage gaps

`docs/00-index/GROUND-TRUTH-INVENTORY.md` §A lists 41 pages. §6.4 (DESIGN.md L2867–L2881) has
**9 rows**, covering roughly 20 of them. About 21 pages have no row at all, including
`fraud`, `finance`, `wallets`, `rwallets`, `coverage`, `compliance`, `safety`, `growth`,
`commitment`, `fairness`, `contacts`, `audit-log`, `interventions`, `requests`,
`requests-sub-all`, `requests-instant-all`, `readiness`, `renewal`, `quickrides`,
`corporate`, `corp-detail`, `my-account`.

This makes §6.4's own closing rule — `MUST map any new page to a row in §6.4 before design starts`
(L2889) — unenforceable today: half the existing product already fails it, so the rule provides no
signal.

The five specific gaps:

### 4.1 Live dispatch map — mapped to the wrong pattern

§6.4 maps `Live map → Full-bleed editor layout (breaks the frame) — §2.5`. But §2.5's rules
(L921–L935) describe **editors**: exit affordance in the left slot, device-width preview toggles,
a ~328px inspector panel, bulk grids with frozen identity columns. A live dispatch map is not an
editor — it is a continuously-updating monitoring surface. None of §2.5's rules apply, and the
things the surface actually needs are unaddressed.

Code that has no governing rule: `.tab-row`/`.map-tab` with a pulsing `live-dot` (`:336–342`),
`.map-filter-row`/`.map-fchip` (`:344–347`), `.ping-ok`/`.ping-warn`/`.ping-dead` with infinite
pulse animations (`:327–332`), `#map-leaflet` at a fixed `height:400px` (`:349`), the `.live-card`
side list with `.btn-track`/`.btn-call`/`.btn-intervene` row actions (`:351–362`), `.ndv-legend`
(`:211–212`), `.map-stat` strip (`:365–368`), and the `.replay-btn`/`.replay-progress` scrubber
(`:221–224`).

**Rules the document still owes:** (a) a real-time surface pattern — update cadence, whether rows
animate on change, how a stale feed is signalled, whether polling pauses while the operator is
interacting; (b) an ambient/looping animation rule, since §1.6 L431 governs only *transitions* and
its 300ms ceiling makes every `infinite` keyframe in the file illegal; (c) map chrome — legend,
zoom/pan controls, cluster behaviour, marker tone mapping against the badge palette; (d) the
map-plus-synchronised-side-list layout, which is a two-pane monitoring shell with no equivalent in
§2.2; (e) a "live" indicator rule — what earns the pulsing dot and what it means when it stops.

### 4.2 Plan/pricing editor with computed formula boxes — no pattern anywhere

§6.4 maps `Plan editor → Sectioned form + contextual save bar — §2.3, §4.1`, which covers the
*shell* but not the content. §4.5 ("Specialised inputs", L2067–L2167) enumerates rich text, media,
resource pickers, date/time, address, code editors and bulk grids — **there is no derived-value
input**, and §4.2's rules (L1895–L1905) assume every field is editable.

Unaddressed code: `.computed-box` (`:255`) — a **33px-tall, input-shaped, non-focusable box** that
renders a calculated number in `--blue`; `.formula-box`/`.formula-note` (`:271–274`) — the formula
documentation panel; `.ptable` with `th.ci` "computed" column marking (`:262–268`);
`.ex-cell`/`.ex-tot`/`.ex-drv` worked-example cells (`:269–270`); `.preview-strip` (`:275–277`) —
a live recompute bar pinned under the form.

**Rules the document still owes:** (a) how a derived value is visually distinguished from an
editable field — `.computed-box` currently looks like a disabled input, and §4.6 L2231 reserves the
disabled treatment for *actions that will become available*, so the two signals collide; (b) where
the governing formula is disclosed (inline panel, helper text, or tooltip — §5.7 L2786 forbids
tooltips for constraints, which rules out the obvious choice); (c) how a live recompute is
announced, including to assistive tech — the document has zero coverage of live regions; (d) worked
examples as a first-class form element; (e) how a computed field participates in validation and the
dirty state that gates Save (§4.4 L2061).

### 4.3 Wallet ledgers — no money-display rule at all

`wallets` (`:968`) and `rwallets` (`:1020`) have no §6.4 row. §3.1's index-table rules cover a
resource list; a ledger is not one. The only money-adjacent rules in the entire document are
§4.2 L1901 (currency symbol as an in-field **input** prefix) and the right-align rules
(§3.1 L1156, R4) — nothing governs how money is *displayed* in a table.

Code with no rule: `l.amount.toFixed(2)+' SAR'` (`:6693`), `'−'+fee.toFixed(2)+' SAR'` (`:5537`,
using U+2212 MINUS with a trailing currency code), running-balance rendering at `:3959`, `:4029`.

**Rules the document still owes:** (a) money formatting — symbol vs code, leading vs trailing,
decimal places, thousands separator, and which of these flip under `lang-ar`; (b) negative-amount
representation (minus sign, parentheses, or a red tone — and R5 already bans a red pill, so the
answer must be stated); (c) the ledger pattern itself — running-balance column, debit/credit
convention, opening/closing rows, and the fact that ledger rows are append-only so the row-action
and bulk-action rules of §3.1/§3.3 must not apply; (d) reconciliation/pending state, which is a
lifecycle state and therefore a badge under §3.4 L1364 but has no assigned tone.

### 4.4 Fraud review queue — no queue pattern, and R5 has no answer for it

`fraud` (`:650`), plus the work-queue pages `all-pending`, `requests`, `interventions`,
`readiness`, `renewal` — none has a §6.4 row. §3.1 describes a **resource index**, where rows
persist. A review queue is different in kind: items are claimed, worked, decided, and then leave
the list.

Code with no rule: `.sla-bar`/`.sla-fill` (`:333–334`), the `.days-ok`/`.days-warn`/`.days-crit`
countdown pills (`:140–142`), `reqPulse` for breaching items (`:145`), `decisionBadge` and the
inline `statusBanner` approve/reject/pending strip (`:7124`), `.al-row` alert rows with
`.ai-r`/`.ai-a`/`.ai-b` icon tones (`:158–165`).

**Rules the document still owes:** (a) a queue/triage pattern — claim/assign, SLA countdown
display, escalation, disposition actions, and what visibly happens to a row after a decision;
(b) **a row-level critical signal.** This is the sharpest gap R5 creates: R5 routes critical state
to "a banner or a red action", but a fraud queue's critical state is *per row*, and a page-level
banner cannot express it (and §5.2 L2473 forbids stacking banners, so one per flagged row is
illegal). The document currently has no legal way to render "this row is critical", which is the
entire point of the screen; (c) an SLA/countdown component — the three `.days-*` pills are a
duplicate status system D6 flags for deletion, with no sanctioned replacement; (d) a decision-record
banner (who decided, when, on what basis) — currently six divergent inline implementations
(see D4 above).

### 4.5 Arabic / RTL mode — zero coverage

`DESIGN.md` contains **zero** occurrences of "RTL", "Arabic", "i18n", "right-to-left", or
"localisation". The product has a live Arabic mode: `body.lang-ar` (`:31`, `:382`, `:386`,
`:393–400`, `:435`), `.sb[dir="rtl"]` (`:383–385`, `:401–402`), **86 distinct `data-i18n` keys**
(per `GROUND-TRUTH-INVENTORY.md`), and JS that flips the toast stack to the opposite corner on
language switch (`:5238`, `:5256`). `docs/01-modules/00d-i18n-and-localisation.md` documents it.
§6.2 does not sanction it, §6.3 does not flag it, §6.4 has no row — the entire i18n layer is
invisible to the document.

This is not a cosmetic omission, because **the document's rules are written in physical directions
throughout**, and each of these is wrong or ambiguous in RTL:

| Line | Rule | RTL problem |
|---|---|---|
| L2226 | `MUST place the primary on the right` | Must become "trailing/inline-end" |
| L2629 | `MUST anchor drawers to the right edge` | Must become inline-end |
| L1046 | back arrow `left of the page title` | Must become inline-start |
| L576 | `Count badges MUST be right-aligned numerals` | Must become inline-end (the app already flips this at `:385`) |
| L1156 / R4 | `Numeric, currency, and count columns MUST be right-aligned` | Numerals conventionally stay LTR in Arabic — this one probably must *not* flip, and the document must say so |
| L2419 | toasts `bottom-centre` | Eyvar ships bottom-right→bottom-left (`:5256`); centre would be RTL-neutral but conflicts with the shipped code |
| L237–239 | 13px body, six-role ramp | A Latin metric; Arabic needs its own size floor for legibility |

**Rules the document still owes:** (a) a logical-properties mandate — every physical direction in
§1–5 restated as inline-start/inline-end, with an explicit list of what does *not* mirror (numerals,
currency, dates, phone numbers, the map); (b) a **partial-localisation policy** — Eyvar deliberately
scopes RTL to the sidebar and two settings panes and documents why in a 15-line CSS comment
(`:370–400`); the document has no rule for a product that is half-translated, which is the actual
state and likely to persist; (c) a mirroring rule for the icon set (§1.5) — which glyphs flip;
(d) resolution of the untokenised `268px` Arabic sidebar width (`:31`, `:435`) against §6.4 L2885;
(e) a copy rule for §5.7's sentence-case and terminal-period mandates (L2778, L2787), neither of
which has an Arabic equivalent.

---

## 5. Blockers for a first-time implementer

Could a developer who has never seen Shopify build a correct screen from this? **Mostly yes for
layout and tables — sections 2 and 3 are genuinely good, and §3.9's wireframe is the strongest
thing in the document.** Three things would stop them.

### Blocker 1 — The most common decision on any screen is answered three ways, with no precedence rule

A developer building their first screen needs a primary button. §4.6 — the section literally
titled "The button system" — tells them `MUST use the near-black primary; MUST NOT introduce a
second primary colour` (L2228). §1.1.4 agrees and adds `blue … MUST NOT be used as a button fill`
(L196). Both are correct-for-Shopify and **wrong for Eyvar**, where R3 (L71) and §6.2.1 (L2834)
mandate `--blue`. Nothing in §4.6 or §1.1.4 points forward to the override, and "How to use it"
(L32–39) never establishes whether the Rulings table, §1–5, or §6.2 wins a disagreement. The
same trap fires on badge shape (§1.4 L353 `never as full pills` vs the shipped `999px` pill at
`:118`, which §6.2 does not sanction and §6.3 does not flag) and on the save-bar colour (three
answers, §3.1 above).

**Fix:** state the precedence order explicitly in "How to use it" (§6.2 > Rulings > §1–5), and add
an inline `→ overridden for Eyvar by §6.2.1` marker on every §1–5 MUST that §6 supersedes. Add a
fourth row to §6.2 for the badge pill, or a D15 for it — right now it is in neither list.

### Blocker 2 — There is nothing to build with: the token set the rules assume does not exist

§6.4's binding rule is `MUST NOT introduce a new colour, radius, shadow, or font size that is not
already a token in :root` (L2885). `:root` (`:11–21`) holds **24 colour variables and nothing
else**. There is no radius token, no spacing token, no shadow token, no font-size token, no
z-index token. So three of the four categories the rule governs have no token to reference, and
the developer's only options are to hard-code (violating the rule) or to invent tokens (which the
rule's second clause permits but the document never names or scopes).

Meanwhile §1 issues precise numeric mandates — a 4px spacing scale (L297), a radius set
{4, 8, 12, 16, full} (L351), a six-role type ramp (L239) — that exist nowhere in code. The live
file already ships **15 font sizes, 13 radii, and 36 off-token hex colours** in the CSS block
alone. A newcomer who tries to comply will find no `--radius-card` to call and will copy the
nearest existing screen, reproducing the drift.

**Fix:** §6 must ship the token names, not just the target values — a concrete `:root` extension
covering radius, spacing, shadow, type scale and z-index, plus a mapping from each §1 rule to the
token that satisfies it. Until then §1 is aspirational and §6.4 L2885 is unenforceable.

### Blocker 3 — Three of the four states every screen needs are missing, misdescribed, or point at the wrong section

The Ship checklist is the document's contract, and three of its sixteen boxes cannot be ticked:

- **Loading** (checklist L52). Required by the checklist, pointed at §3.6 and §5.2, **specified
  nowhere.** §1.7 L448 concedes loading states were never observed; §3.7 L1589 only forbids a
  spinner in a chart card. There is no skeleton rule, no threshold for when a spinner appears, no
  optimistic-update rule. The developer has to invent it and will not match anyone else.
- **Focus** (checklist L59). Pointed at §4.4, which contains no focus rule (§2 above). The real
  rule is §4.2 L1899 (`a ~2 px darker border (plus focus ring)`) plus §1.4 L354 — but **no colour,
  offset, or geometry is given**, and §4.8 L2329 explicitly admits the geometry could not be
  determined. "Every interactive element has a visible focus state" is therefore not a checkable
  box, and the shipped code (`outline:none` at `:253`, `:259`, `:268`, `:290`, `:310`) gives no
  pattern to copy.
- **Toasts** (checklist L58). The developer is misdirected twice. §6.3 D3 tells them no toast
  system exists, so they will build one — but a complete system with 352 call sites is already
  there (`:5236–5320`). And §5.1's spec (dark pill, bottom-centre, ≤5 words, no link, no emoji)
  describes the opposite of what ships (light tinted card, bottom-right, emoji-led, with an
  embedded `· view →` link). Following the document produces a second, incompatible toast system.

**Fix:** write §3.x/§5.x rules for loading and skeleton states; move or duplicate the focus rule
into §4.4 and give it a concrete `outline` declaration; and rewrite D3 as a conformance gap
against §5.1 with the six specific divergences named, so the developer reuses `toast()` rather
than replacing it.

### Honourable mention (not in the top three, but close)

There is **no accessibility section**. D8, D11 and D12 cite "a11y" as their rule source
(L2859, L2862, L2863) and no such section exists; the document contains zero occurrences of
"aria", "screen reader", or "WCAG". For a product with keyboard-driven ops queues and a
`.ra{opacity:0}` row-action pattern, that is a structural hole, not a detail.
