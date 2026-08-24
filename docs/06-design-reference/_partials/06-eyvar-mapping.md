## 6. Applying This to Eyvar Admin

Eyvar Admin today is a single-file app (`eyvar_ops_panel_v40_fixed.html`, 21,857 lines,
41 `.page` divs, 21 settings sub-panes) with its own token set declared in the `:root`
block at L11–L21. This section is the bridge: what Eyvar already has, where it diverges
from §1–§5, and which divergences are **sanctioned deviations** versus **defects**.

Read the Precedence ladder in the header before this section. §1–§5 describe Shopify;
this section is what binds.

### 6.1 Current Eyvar token inventory (`eyvar_ops_panel_v40_fixed.html` L11–L21)

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
| D-1 | **Brand blue is the primary action colour**, not near-black | §1.1.4, §4.6 (near-black primary) | Eyvar is a branded operations product, not a Shopify app. Consequence, per R3: blue stops carrying links; links take `--blue-dk` + underline. |
| D-2 | **Higher density** — 13px base text, ~30px rows | §1.2 (type ramp), §1.3 (spacing scale), §3.1 (row height) | An ops console is watched all day on one screen. Density is the product. **This sanctions smaller values on the 4px grid — it does not sanction off-grid values** (see D18). |
| D-3 | **Light top bar**, 50px, with a `Title › Subtitle` breadcrumb | §2.1 (dark frame), §2.6 (no breadcrumbs), §2.3 (logo in the save-bar left slot) | The wordmark lives in the rail, so the top bar is free for wayfinding. The §2.3 logo rule is unimplementable on this frame and does not apply. |
| D-4 | **Icon rail that expands on hover** — 52px → 236px | §2.1 (fixed ~240px nav, always expanded) | Screen width is worth more to the live map and wide tables than a permanently open nav. |

Nothing else is sanctioned. Adding a deviation means adding a row here, naming the rule
it suspends, before the code ships.

### 6.3 Defects

Verified against the source. Each is a divergence nobody decided on.

**Structure and surfaces**

| # | Defect | Rule | Evidence |
|---|---|---|---|
| D1 | `.page` sets `background:var(--white)` while cards are also white — the canvas/surface distinction collapses. (`body` and `.sb` do it correctly; only `.page` is wrong.) | §1.1 | `eyvar_ops_panel_v40_fixed.html:70` |
| D2 | No contextual save bar, and no wired dirty indicator. `.form-footer` exists but is used **once in the entire file** (the plan editor); the other 40 pages and all 21 settings panes have no save chrome. `.settings-dirty-dot` is defined but dead — zero other occurrences. | §2.3 | `:279`, used at `:1127`; `:248` |
| D3 | Settings is a **route**, not an overlay — `<div class="page" id="p-settings">` — so entering it destroys the previous page instead of layering over it. | §2.4 | `:1416`, `:70–71` |
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
| D15 | Off-grid spacing throughout — `.page{padding:18px;gap:14px}`, `.ch{padding:11px 14px}`, `td{padding:9px 11px}`, `.kpi{padding:13px 15px}`. D-2 sanctions *smaller*, not *off-grid*. | §1.3, D-2 | `:70`, `:89`, `:150`, `:104` |
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
| `settings` (21 panes), `my-account` | Settings shell with its own nav | §2.4, D3 |
| `exec-overview`, `dashboard`, `predictive`, `growth`, `coverage`, `commitment`, `fairness` | Metric tile row + chart cards | §3.7 |
| `live` | **Monitoring shell** — map + synchronised side list | §8.1 |
| `finance`, `wallets`, `rwallets` | **Ledger** — append-only, money formatting | §8.3 |
| `fraud`, `all-pending`, `requests`, `requests-sub-all`, `requests-instant-all`, `interventions`, `readiness`, `renewal` | **Work queue** — claim, SLA, disposition, row-level critical | §8.4 |
| `support`, `compliance`, `safety` | Index table → detail with timeline | §3.1, §3.8 |
| `inbox`, `notifications-all` | Activity feed | §3.8 |

**Rules**

- MUST treat §6.2 as the complete list of sanctioned deviations. A new deviation requires
  a row there naming the rule it suspends, written before the code ships.
- MUST NOT introduce a **colour** that is not a `:root` token. Extend `:root` instead.
- MUST NOT introduce a new **radius, font size, spacing value, shadow or duration** until
  D16 is closed and those token sets exist; until then, reuse a value already present in
  the CSS block and record it in the ticket that closes D16.
- MUST map any new page to a row in §6.4 before design starts.
- SHOULD close defects in the order given at the end of §6.3.

### 6.5 Audit record

Two audits ran against the assembled document.

**Corrections applied.** The first draft of §6.3 claimed Eyvar had no toast system; a
352-call-site toast system exists at `:5236–5320`, and that entry is now a *conformance*
defect (D7). Claims that banners and empty states were absent were likewise overstated —
both ship in quantity as inline implementations (D8, D9). §6.1's `.page` line reference
was wrong (L70, not L75). The defect list has grown from 14 to 24: the omissions were the
largest divergences in the file — off-token colours, font sizes, radii, and settings being
a route.

**Known limits of the evidence.** The screenshots are 768px renders of a ~1440px viewport,
so every pixel figure in §1–§5 is a scaled approximation, not a measurement. No hover,
focus, loading, or dark-mode state appears in the sample. No responsive breakpoint can be
derived from it. Exact hex values were eyeballed from compressed WebP and should be treated
as close, not exact. §1.6 (motion) is inferred end to end and is demoted to SHOULD by R12.
