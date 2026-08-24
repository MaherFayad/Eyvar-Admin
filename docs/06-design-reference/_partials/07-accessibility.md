## 7. Accessibility

> **Why this section exists.** Three defect entries in §6.3 — D19, D20, D21 — and two
> lines of the Ship checklist cite "§7" as their rule source. Until now there was no §7.
> The word `aria` appears **zero** times in `eyvar_ops_panel_v40_fixed.html`, and so does
> `focus-visible`, and so does `prefers-reduced-motion`. This section is the missing law.
>
> **Precedence.** Per the Precedence ladder, §7 is Eyvar-specific law and **overrides
> §1–§5 within its subject**. Where it does, it says so inline and names the section.
> §6.2 sanctions four deviations; none of them names §7, and §6.2's own rule is that a
> deviation which does not name its rule is not sanctioned. **Nothing in §6.2 suspends
> anything in §7.**
>
> **Claim marking.** §1–§5 use `[observed]` / `[Polaris]`. §7 needs three more, because
> its subject is not visible in a screenshot:
>
> - `[observed]` — visible in a screenshot cited on the same line.
> - `[Polaris]` — recalled from the Polaris design system, not verifiable here.
> - `[source]` — read out of `eyvar_ops_panel_v40_fixed.html` at the cited line. Trust it;
>   every one was grepped, none was recalled.
> - `[computed]` — arithmetic on `[source]` values. Contrast ratios use the sRGB relative
>   luminance formula from WCAG 2.x, rounded to two decimals.
> - `[WCAG]` — the text of a WCAG 2.2 success criterion.
>
> **What the screenshots cannot do.** The 159 captures in
> `docs/06-design-reference/shopify-admin-web/` can evidence *contrast* and *resting
> focus styling*, and they are cited for exactly that in §7.1 and §7.2. They cannot
> evidence tab order, ARIA, accessible names, live-region politeness, or screen-reader
> output — a still image has no DOM. **Nothing in §7.3, §7.4 or §7.5 carries an
> `[observed]` tag, and no reviewer may cite a screenshot to close a finding in those
> subsections.**
>
> **Citation form.** `eyvar_ops_panel_v40_fixed.html:LINE`, shortened to `:LINE` inside
> tables, matching §6.3.

---

### 7.1 Contrast

#### 7.1.1 The ratios that bind

| Content | Minimum | Source |
|---|---|---|
| Body text, labels, badge labels, table headers, hints, placeholders | **4.5:1** | SC 1.4.3 `[WCAG]` |
| "Large" text — ≥24 px, or ≥18.66 px at weight ≥700 | 3:1 | SC 1.4.3 `[WCAG]` |
| Interactive component boundaries and state indicators (input borders, checkbox/radio/toggle outlines, focus rings, selected-tab underlines) | **3:1** | SC 1.4.11 `[WCAG]` |
| Graphics required to understand content (chart strokes and fills, status dots, progress-bar fills, meter tracks) | **3:1** | SC 1.4.11 `[WCAG]` |
| Purely decorative rules, dividers, and card hairlines | none | SC 1.4.11 exception `[WCAG]` |
| Disabled controls | none | SC 1.4.3 / 1.4.11 exception `[WCAG]` |

**The large-text allowance does not exist in Eyvar.** The largest type in the file is
`.kpi-val` at `23px/500` (`:111`) `[source]`; the page title `.ph-l h1` is `17px/500`
(`:73`) `[source]`. Neither reaches 24 px, and no weight-700 run reaches 18.66 px — the
heaviest are `.settings-panel-title` at `14px/700` (`:245`) and `.sb-logo-text` at
`9.5px/700` (`:36`) `[source]`. **Every text colour in this product is measured against
4.5:1. There is no 3:1 tier to fall back on.** This is a direct consequence of §6.2 D-2
(higher density), and it is the price of that deviation: Eyvar bought density and spent
its contrast headroom doing it.

#### 7.1.2 The text ramp, measured

| Token / value | Line | On | Ratio `[computed]` | 4.5:1 |
|---|---|---|---|---|
| `--ink` `#1A1A18` | `:18` | `#FFFFFF` | **17.43** | PASS |
| `--muted` `#6B6B68` | `:18` | `#FFFFFF` | **5.35** | PASS |
| `--muted` `#6B6B68` | `:18` | `--bg2` `#F8F8F5` | **5.02** | PASS |
| `--muted` `#6B6B68` | `:18` | `--bg` `#EEF0F3` | **4.68** | PASS |
| `--ghost` `#9B9B97` | `:18` | `#FFFFFF` | **2.79** | **FAIL** |
| `--ghost` `#9B9B97` | `:18` | `--bg2` `#F8F8F5` | **2.62** | **FAIL** |
| `--ghost` `#9B9B97` | `:18` | `--bg` `#EEF0F3` | **2.44** | **FAIL** |
| `.hint` `#aaa` | `:254` | `#FFFFFF` | **2.32** | **FAIL** |
| `--blue` `#185FA5` | `:12` | `#FFFFFF` | **6.52** | PASS |
| `--blue-dk` `#0C447C` | `:12` | `#FFFFFF` | **9.84** | PASS |
| `#FFFFFF` | — | `--blue` `#185FA5` | **6.52** | PASS |

**`--ghost` is the largest single accessibility defect in the file by occurrence count.**
`var(--ghost)` appears **431 times** `[source]`, and it is the declared colour of, among
others: `table.dt th` (`:149`), `.ptable th` (`:263`), `.kpi-lbl` (`:110`), `.td-sub`
(`:156`), `.al-time` (`:169`), `.tb-sub` (`:63`), `.ph-l p` (`:74`), `.sec-sub` (`:229`),
`.dc-km` (`:177`), `.ms-lbl` (`:219`, `:367`), `.settings-tab-group-lbl` (`:233`),
`.settings-meta` (`:247`), `.live-card-route` (`:354`), `.live-sec-hdr` (`:363`),
`.ex-cell` (`:269`), `.feat-rm` (`:260`), `.csel-val.placeholder` (`:305`),
`.csel-opt-hint` (`:321`), `.aud-diff` (`:324`), `.preview-strip .lbl` (`:276`),
`.ch-tgl` (`:90`), `.neu` (`:113`), `.settings-soon` (`:242`) `[source]`. Every one of
those is failing text.

§6.3 D21 flags `.hint{color:#aaa}` (`:254`) alone. **D21 is understated: it is two
occurrences of `#aaa` against 431 occurrences of a token that fails by the same
mechanism.** Both must be closed together, and the fix is the same one.

**The fix takes no new token.** `--muted` (`#6B6B68`) passes on all three Eyvar surfaces
(5.35 / 5.02 / 4.68). Substituting `--muted` for `--ghost` and for `#aaa` closes all 433
occurrences without extending `:root` — which matters, because §6.4's rules forbid
introducing a colour that is not already a token. `--ghost` survives only for genuinely
decorative fills that carry no meaning.

`.field label` at `11px var(--muted)` (`:250`) computes to **5.35:1** on white and
**5.02:1** on `--bg2` `[computed]` — both pass. This confirms §6.3 D22's parenthetical:
the label defect is size and hierarchy, not colour. §7.1 does not add to D22.

#### 7.1.3 Badge tones, measured

Badge text is `10px/600` (`.b`, `:118`) `[source]` — **not** large text, so 4.5:1 applies
to every row.

| Selector | Line | Fill | Text | Ratio `[computed]` | 4.5:1 |
|---|---|---|---|---|---|
| `.b-green` | `:119` | `--green-lt` `#EAF3DE` | `--green` `#27500A` | **8.21** | PASS |
| `.b-amber` | `:121` | `--amber-lt` `#FAEEDA` | `--amber-dk` `#633806` | **8.72** | PASS |
| `.b-red` | `:120` | `--red-lt` `#FCEBEB` | `--red` `#A32D2D` | **6.13** | PASS |
| `.b-blue` | `:122` | `--blue-lt` `#E6F1FB` | `--blue-dk` `#0C447C` | **8.60** | PASS |
| `.b-teal` | `:123` | `--teal-lt` `#E1F5EE` | `--teal` `#0B6B6B` | **5.56** | PASS |
| `.b-purple` | `:124` | `--purple-lt` `#EDE6FB` | `--purple` `#4A2889` | **8.85** | PASS |
| `.b-grey` | `:125` | `--bg2` `#F8F8F5` | `--ghost` `#9B9B97` | **2.62** | **FAIL** |

The four undocumented tones flagged by §6.3 D5 also compute, for completeness:
`.b-eco` `#2C5F8A` on `#EEF4FB` = **6.10** `[computed]`, `.b-com` = **8.85** (identical to
`.b-purple`, which is D6's point), `.b-gold` `#7A5C00` on `#FBF3E0` = **5.66**,
`.b-silver` `#555` on `#F0F0EE` = **6.53**, all at `:126–129` `[source]`. **They pass
contrast and are still defects** — D5 removes them for having no meaning map, and R7 caps
the palette at five tones. Passing §7.1 does not exempt a tone from R7.

**`.b-grey` is the only failing tone, and it is used 100 times** `[source]`. It fails for
exactly one reason: it is the only tone that pairs a fill with `--ghost` rather than a
dark same-hue text colour. Recolouring its text to `--muted` gives 5.02:1 `[computed]` and
keeps it inside the tonal-badge rule of §1.1.5.

The parallel `.health` (`:131–138`) and `.days-*` (`:140–142`) systems repeat the badge
hexes byte-for-byte, so they inherit the same ratios — `.h-green` = 8.21, `.h-amber` =
8.72, `.h-red` = 6.13 `[computed]`. All pass. That is not a reprieve: §6.3 D6 deletes both
systems.

**Rule for text on tinted fills.** A tonal badge is not exempt because its fill is pale.
The text is measured against **the badge's own fill**, never against the card behind it,
and never against the darkest fill in the family. Shopify's tonal badges are built the
same way — pale fill, deep same-hue text `[observed]`
`03-products/products-list-default.webp`, `02-orders/orders-list-with-metrics-row.webp`.

#### 7.1.4 Non-text UI, measured

| Element | Line | Foreground | Adjacent | Ratio `[computed]` | 3:1 |
|---|---|---|---|---|---|
| Input / select / `.csel-btn` boundary | `:252`, `:301` | `--border2` `#DDDBD3` | `#FFFFFF` | **1.39** | **FAIL** |
| Card / divider hairline | `:88`, `:89` | `--border` `#E4E2DA` | `#FFFFFF` | **1.30** | exempt (decorative) |
| `.tog-sl` off-state track | `:186` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |
| `.tog-sl` on-state track | `:188` | `#1E9E5A` | `#FFFFFF` | **3.45** | PASS |
| `.kf-b` KPI bar fill | `:116` | `--blue` `#185FA5` | `--bg` `#EEF0F3` | **5.71** | PASS |
| `.kf-g` KPI bar fill | `:116` | `#3B6D11` | `--bg` `#EEF0F3` | **5.44** | PASS |
| `.kf-r` KPI bar fill | `:116` | `--red` `#A32D2D` | `--bg` `#EEF0F3` | **6.19** | PASS |
| `.kf-t` KPI bar fill | `:116` | `--teal` `#0B6B6B` | `--bg` `#EEF0F3` | **5.52** | PASS |
| `.kf-a` KPI bar fill | `:116` | `--amber` `#E8A33D` | `--bg` `#EEF0F3` | **1.89** | **FAIL** |
| `.rf-a` renewal bar fill | `:182` | `--amber` `#E8A33D` | `--bg` `#EEF0F3` | **1.89** | **FAIL** |
| `.h-amber::before` status dot | `:137` | `--amber` `#E8A33D` | `--amber-lt` `#FAEEDA` | **1.88** | **FAIL** |
| `.stars` rating glyphs | `:144` | `--amber` `#E8A33D` | `#FFFFFF` | **2.16** | **FAIL** |
| `.h-green::before` status dot | `:136` | `#3B6D11` | `#EAF3DE` | **5.43** | PASS |
| `.h-red::before` status dot | `:138` | `--red` `#A32D2D` | `#FCEBEB` | **6.13** | PASS |
| `.ping-ok` dot | `:328` | `#1E7B34` | `#FFFFFF` | **5.33** | PASS |
| `.ping-warn` dot | `:329` | `#B45309` | `#FFFFFF` | **5.02** | PASS |
| `.ping-dead` dot | `:330` | `#C62828` | `#FFFFFF` | **5.62** | PASS |
| `select` chevron stroke | `:285` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |
| `.csel-arrow` | `:306` | `#9B9B97` | `#FFFFFF` | **2.79** | **FAIL** |

Two findings deserve naming.

**`--amber` `#E8A33D` cannot carry meaning on any Eyvar surface.** It tops out at 2.16:1
on white and sits at 1.88–1.89:1 on `--bg` and `--amber-lt` `[computed]`. Wherever it is a
*fill*, *dot*, or *stroke* that a user must perceive to read the state, it fails. It is
fine as the light half of a tonal pair — `--amber-lt` behind `--amber-dk` text is 8.72:1.
This matches Shopify, which uses **dark** text and icons on amber and reserves
white-on-solid for green and red `[observed]`
`04-customers/customer-detail-erasure-request-banner.webp`,
`11-apps-and-channels/app-detail-shop-channel-needs-attention.webp`.

**Input boundaries are the only thing identifying an Eyvar field, and they are invisible
at 1.39:1.** SC 1.4.11 exempts a component boundary when the component's own fill already
differs by 3:1 from its surroundings — but Eyvar inputs are `background:var(--white)`
(`:252`) inside white cards, so the border does all the work alone. This is the one place
in §7 that requires extending `:root`, and §6.4's rule permits that ("extend `:root`
instead"): a `--border-input` token computed at ≥3:1 against `#FFFFFF`. §1.1.3 records the
same split in Shopify — `border-input` is "deliberately stronger than card borders so
fields read as targets" `[observed]` `04-customers/customer-new-form-empty.webp`.

**Rules**

- MUST render every text run at **≥4.5:1** against its own computed background. The 3:1
  large-text tier MUST NOT be claimed by any Eyvar surface — no type in the product
  reaches 24 px or 18.66 px/700 (`:111`, `:73`, `:245`).
- MUST measure badge, chip, pill and tag text against **the tinted fill it sits on**, not
  against the card or page behind it.
- MUST NOT use `--ghost` `#9B9B97` or the literal `#aaa` as a text colour, a placeholder
  colour, or an icon stroke that identifies a control. Substitute `--muted` `#6B6B68`.
  Closes §6.3 D21 and the 431 `var(--ghost)` occurrences it omits.
- MUST recolour `.b-grey` text (`:125`) from `--ghost` to `--muted`; 2.62:1 is a fail and
  it ships 100 times.
- MUST render interactive component boundaries — input, select, textarea, `.csel-btn`,
  checkbox, radio, and both toggle states — at **≥3:1** against the surface behind them.
  `--border2` at 1.39:1 and `.tog-sl` off-state at 2.79:1 do not qualify.
- MUST render every chart stroke, chart fill, progress fill, meter fill and status dot at
  **≥3:1** against its own track **and** against any adjacent series it must be
  distinguished from.
- MUST NOT use `--amber` `#E8A33D` as a fill, dot, stroke, or glyph that carries meaning
  on `#FFFFFF`, `--bg`, `--bg2` or `--amber-lt`. Use `--amber-dk` `#633806`.
- MUST NOT encode a state in hue alone. Every tone-coded row, dot, bar and badge MUST
  also carry a text label or a shape difference (SC 1.4.1). `.ping-label` (`:332`) is the
  correct pattern and MUST accompany every `.ping-dot`.
- MUST record the computed ratio, to two decimals, in the ticket that introduces any new
  colour pairing. A pairing with no recorded ratio is not reviewable and MUST be rejected.
- MUST NOT treat a disabled control's contrast as a defect (`:86`), and MUST NOT let the
  `opacity:.42` dim be the *only* signal that a control is unavailable — the disabled
  state MUST also be exposed programmatically (§7.4).
- SHOULD keep decorative hairlines (`--border`, `:88`) exactly as they are; they are
  exempt and darkening them would cost the surface calm §1.4 depends on.

---

### 7.2 Focus

#### 7.2.1 The indicator

One ring, everywhere, on every focusable element:

```css
:focus-visible {
  outline: 2px solid var(--blue);   /* #185FA5 */
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #FFFFFF;    /* separator, fills the 2px offset gap */
  border-radius: inherit;
}
```

**Why these numbers.**

| Ground the ring lands on | Ring vs ground `[computed]` | Verdict |
|---|---|---|
| `#FFFFFF` card / page | **6.52** | passes on the outer edge |
| `--bg` `#EEF0F3` canvas | **5.71** | passes on the outer edge |
| `--bg2` `#F8F8F5` (`.map-ctrl`, `.form-footer`, `.feat-row`) | **6.13** | passes on the outer edge |
| `--blue-lt` `#E6F1FB` (`.kpi.click.on`, `.settings-tab.on`, `.csel-opt.sel`) | **5.70** | passes on the outer edge |
| `--amber-lt` `#FAEEDA` (`.btn.warn`, `.settings-sensitive`) | **5.69** | passes on the outer edge |
| `--green-lt` `#EAF3DE` (`.btn.success`) | **5.71** | passes on the outer edge |
| `--red-lt` `#FCEBEB` (`.btn.danger`, `.feat-rm:hover`) | **5.66** | passes on the outer edge |
| `--blue` `#185FA5` fill (`.btn.p`, `.map-fchip.on`, `.replay-btn`) | **1.00** | **the blue ring vanishes** |
| `--ink` `#1A1A18` (`#trend-tooltip`) | **2.67** | below 3:1 |

The last two rows are why the white separator is not optional. A single blue ring is
invisible on `.btn.p` (`:79`) and marginal on `#trend-tooltip` (`:316`) `[source]`. The
2 px white shadow sits in the offset gap and reaches **6.52:1** against `--blue` and
**17.43:1** against `--ink` `[computed]`, so the two-tone ring always has one edge above
3:1 — which is what SC 1.4.11 requires of a focus indicator `[WCAG]`.

**This overrides §1.1.3, which records `border-focus` as a "dark/near-black 2px ring"
`[observed]` `03-products/product-edit-pricing-inventory-shipping.webp`.** That is a
description of Shopify, whose primary is near-black; Eyvar's primary is brand blue by
R3 and §6.2 D-1, and a near-black ring on Eyvar's blue primary would be the same
collision in a different colour. **Eyvar's focus ring is `--blue`.** The width — 2 px — is
taken from §1.4, which already carves out the focus ring as the single permitted stroke
wider than 1 px, so §7.2 does not conflict with §1.4.

**Blue now carries three roles: primary fill, focus ring, and — per R3 — *not* links.**
This does not reopen R3. R3's concern is two *persistent, text-level* uses of one hue
becoming indistinguishable. The focus ring is transient, geometric, never applied to text,
and never present without a keyboard interaction that produced it. Links remain
`--blue-dk` plus underline, as R3 requires.

#### 7.2.2 `:focus-visible` vs `:focus`

`:focus` fires on mouse clicks too, which is why the file's authors reached for
`outline:none` in the first place — a persistent ring after every click reads as a bug.
`:focus-visible` fires only when the browser judges the focus to warrant an indicator:
keyboard, programmatic focus moves, and text fields regardless of input method.

The file contains **zero** occurrences of `focus-visible` `[source]`.

`:focus` retains exactly one job: the **`:focus-within`** family, used to reveal
hover-gated content (§7.3). It MUST NOT be used to paint the ring.

#### 7.2.3 Every selector in the file that kills focus without replacing it

**Group A — `outline:none` replaced only by a `.5px` border-colour change.** These are the
five selectors §6.3 D20 names.

| # | Selector | Line | What replaces the outline |
|---|---|---|---|
| A1 | `.field input:focus, .field select:focus` | `:253` | `border-color:var(--blue)` on a `.5px` border |
| A2 | `.feat-row input:focus` | `:259` | `border-color:var(--blue)` on a `.5px` border |
| A3 | `.ptable td input[type=number]:focus` | `:268` | `border-color:var(--blue)` on a `.5px` border |
| A4 | `select:focus` | `:290` | `border-color:var(--blue)!important` on a `.5px` border |
| A5 | `.csel-search` | `:310` | **nothing** — `border:none` plus `outline:none` on the base rule, so the field has no focus indicator in any state |

A1–A4 are not "no indicator", but they are not a conforming one either: the indicator is a
hue change on a `.5px` line that is already present when unfocused, its perceived width
does not change, and at fractional-pixel rendering (§6.3 D17) it can disappear entirely on
non-integer DPRs.

**Group B — inline `outline:none` on `<input>` elements, which D20 does not list.** All six
also carry `border:none`, so they have **no** focus indicator of any kind.

| # | Element | Line |
|---|---|---|
| B1 | `#global-search` in the top bar | `:571` |
| B2 | Unnamed "Search rider, driver…" field | `:730` |
| B3 | Riders page "Search RDR-id or name…" field | `:909` |
| B4 | `#pending-search` | `:1334` |
| B5 | `#requests-sub-all-search` | `:2134` |
| B6 | `#requests-instant-all-search` | `:2155` |

**Eleven declarations in total: five CSS selectors and six inline styles.** §6.3 D20 counts
five. **D20 is understated and MUST be widened to eleven** — the six inline ones cannot be
reached by a stylesheet fix, which is the same trap §6.3 D17 documents for `.5px`
hairlines.

**Group C — focusable but visually absent, no `outline:none` involved.**

| # | Element | Line | Problem |
|---|---|---|---|
| C1 | `.tog input` | `:185` | `opacity:0;width:0;height:0` — a real, focusable tab stop with zero rendered area. Any ring drawn on it is drawn on nothing. The visible `.tog-sl` is a **sibling** and never receives focus. |
| C2 | Buttons inside `.ra` | `:153` | `opacity:0` until `tr:hover` — focusable and invisible (§7.3, §6.3 D19). |

**Group D — ancestors that clip the ring.** An `outline` is clipped by an ancestor's
`overflow:hidden`. Four containers do it: `.sb` (`:24`), `.sb-sec` (`:38`), `.sb-ft`
(`:52`), `.card` (`:88`) `[source]`. A 2 px ring at 2 px offset on the first or last child
of any of these is cropped or lost.

**What still works.** No rule in the file removes the user-agent focus ring from
`<button>` or `<a>`, so the **701 `<button onclick>`** and **5 `<a onclick>`** elements
`[source]` do get *a* ring today — the browser's, which differs per engine, is not
token-coloured, and is not guaranteed to reach 3:1 on `.btn.p`. It is a floor, not
compliance.

**Rules**

- MUST define exactly one `:focus-visible` rule for the whole product: `outline:2px solid
  var(--blue); outline-offset:2px; box-shadow:0 0 0 2px #FFFFFF`. MUST NOT define a second
  focus style for any component.
- MUST NOT write `outline:none` or `outline:0` without a replacement indicator, in the same
  rule, that meets §7.1's 3:1 non-text floor. A `border-color` change on a `.5px` border is
  **not** a replacement.
- MUST close all eleven declarations listed in §7.2.3 Groups A and B, not the five named
  in §6.3 D20.
- MUST NOT rely on a bare `:focus` selector to paint the indicator; the ring MUST be
  attached to `:focus-visible`.
- MUST make the focus target the element that is visually rendered. A zero-size focusable
  input behind a styled sibling (`:185`) MUST be replaced by a natively focusable control,
  or MUST forward the ring to the rendered element via `:has()` / `:focus-within`.
- MUST NOT let an ancestor clip the ring: any container in §7.2.3 Group D that holds
  focusable children MUST either drop `overflow:hidden` or reserve ≥4 px of inner padding
  on the clipped edge.
- MUST keep the focused element fully visible (SC 2.4.11). While `.sb.mob-open` (`:432`) or
  `#modal-overlay` (`:191`) is open, focus MUST be inside that surface; the bottom-anchored
  toast stack MUST NOT overlap a focusable control, which MUST be guaranteed by reserving
  bottom padding on the scroll container equal to the stack's maximum height.
- MUST verify the ring on all nine grounds tabulated in §7.2.1 before a component ships,
  and MUST record the two worst ratios in the ticket.
- SHOULD NOT animate the ring's appearance. It arrives at full opacity in one frame.

---

### 7.3 Keyboard operation

Nothing in this subsection can be evidenced by a screenshot. Every claim is `[source]`
or `[WCAG]`.

#### 7.3.1 Reaching everything

The file contains **zero `tabindex` attributes** `[source]`. Nothing has been added to the
tab order and nothing has been removed from it — so the tab order is exactly the document
order of the natively focusable elements, and every non-native click target is
unreachable. §7.4 counts them: **253 handlers on `<div>`, `<span>`, `<td>` and `<tr>`**.

The most visible casualty is the primary navigation. All **30 sidebar items are
`<div class="sb-item">`** (`:480` onward) `[source]` — a keyboard user cannot reach the
nav at all. `.settings-tab` (25 of them) and `.map-tab` (2) are correctly `<button>`
`[source]`; the 18 `.map-fchip` filter chips are `<span>` `[source]`.

Two things correctly *leave* the tab order and MUST be preserved: `.page` is `display:none`
unless `.on` (`:70–71`), and `.card.clpsd>*:not(.ch)` is `display:none!important` (`:92`)
`[source]`. Hidden pages and collapsed card bodies are properly excluded.

#### 7.3.2 Escape and Enter

**The file handles the Escape key nowhere.** Zero occurrences of `Escape` `[source]`.
`closeModal()` (`:5216`) is reachable only by clicking `.modal-close` or clicking the
scrim (`:475`) `[source]`. `#modal-overlay` (`:191`) has no `role="dialog"`, no
`aria-modal`, no key handler, and no focus trap, so a keyboard user who opens a modal can
tab straight out of it into the page behind the scrim and interact with content they
cannot see.

Enter is handled in exactly two places — `onkeydown="if(event.key==='Enter')globalSearch(…)"`
at `:571` and `:909` `[source]`. Everywhere else, Enter works only because the target
happens to be a `<button>`.

Escape MUST also close the four other dismissible surfaces: `.csel-menu` (`:308`),
`.notif-panel` (`:576`), `.sb.mob-open` (`:432`), and `#trend-tooltip` (`:316`).

#### 7.3.3 Trapping and restoring focus

Focus is moved after opening a surface in exactly **three** places in ~21,857 lines:
`:5379` and `:20719` (a search field, inside a `setTimeout`) and `:6035` (the first input
of the last-added section) `[source]`. Focus is **never** restored on close.

The trap rule is not uniform, and §5.5 is why:

| Surface | Behaviour | Basis |
|---|---|---|
| `#modal-overlay` (`:191`), `.sb.mob-open` (`:432`) — has a scrim | **Trap.** Tab and Shift+Tab cycle inside; the page behind is inert. | Both render a backdrop (`:191`, `:434`) and block the page |
| Non-scrimmed drawer / side panel | **Do not trap.** Tab leaves the panel and continues into the page. | §5.5: "MUST omit the scrim and keep the page behind interactive" — a trap would contradict it |
| `.csel-menu` (`:308`), `.notif-panel` (`:576`) — popovers | **Do not trap.** Arrow keys move within; Tab closes and moves on. | Popover convention `[Polaris]` |

This is not a conflict with §5.5; it is §5.5 applied. **The scrim decides the trap.** If a
surface dims the page, it owns the keyboard. If it does not, it does not.

#### 7.3.4 Skip to content

There is no skip link — zero matches for `skip` `[source]`. `<aside class="sb">` (`:480`)
precedes `.main` in document order and holds 30 nav items, so once §7.3.1 is fixed and
those become buttons, every page will cost 30 Tab presses before the first piece of
content. That is exactly the condition SC 2.4.1 exists for `[WCAG]`.

#### 7.3.5 The hover-gated row actions

```css
.ra{display:flex;gap:5px;opacity:0;transition:opacity .1s}   /* :153 */
table.dt tr:hover .ra{opacity:1}                              /* :154 */
```

`.ra` appears **26 times** `[source]`, each wrapping one to three `<button>` elements —
`Open`, `View`, `Change driver`, `Settle`, `Review` (`:3437`, `:3465`, `:3555`)
`[source]`. Those buttons are natively focusable. `opacity:0` does **not** remove them
from the tab order. So a keyboard user tabs *into* them, one row at a time, and sees
nothing move. This fails SC 2.4.7 (no visible focus indicator) and SC 2.4.11 (focus fully
hidden) simultaneously `[WCAG]`, and on touch, where `:hover` does not exist, the actions
are unreachable by anyone.

This is §6.3 D19. **The fix is two lines:**

```css
table.dt tr:hover .ra,
table.dt tr:focus-within .ra { opacity: 1 }
```

`:focus-within` matches an ancestor while any descendant holds focus, so focusing the
first `.ra` button reveals the whole group — the same reveal `:hover` produces, on the same
`.1s` transition. Row-level (`tr:focus-within`) rather than group-level
(`.ra:focus-within`) because it keeps the two selectors symmetrical and reveals the group
before the ring is painted on the first button.

**The same defect exists in the sidebar and needs the same fix.** `.sb-lbl` and
`.sb-badge` are `opacity:0` until `.sb:hover` (`:46–49`) `[source]`. Once `.sb-item`
becomes a button, a keyboard user tabbing the rail would see icons with no labels. Add
`.sb:focus-within` alongside `.sb:hover,.sb.pin` at `:30`, `:37`, `:40`, `:47`, `:49`
and `:54`.

**Rules**

- MUST make every interactive element natively focusable — `<button>`, `<a href>`,
  `<input>`, `<select>`, `<textarea>` — or MUST give it `tabindex="0"`, a `role`, and
  Enter/Space handlers. A `<div onclick>` with none of these MUST NOT ship.
- MUST convert all 30 `.sb-item` divs (`:480`+) and all 18 `.map-fchip` spans (`:345`) to
  `<button>`.
- MUST make tab order follow visual order. A control that needs `tabindex` greater than 0
  to be reachable in the right order MUST be moved in the DOM instead.
- MUST close every dismissible surface on Escape: `#modal-overlay` (`:191`), `.csel-menu`
  (`:308`), `.notif-panel` (`:576`), `.sb.mob-open` (`:432`), `#trend-tooltip` (`:316`).
- MUST activate every control on both Enter and Space when it carries a button role, and
  on Enter alone when it carries a link role.
- MUST move focus into a modal or scrimmed drawer on open — to its first focusable control,
  or to the dialog container when the first control is destructive — and MUST return focus
  to the element that opened it on close.
- MUST trap Tab and Shift+Tab inside any surface that renders a scrim, and MUST NOT trap
  inside any surface that does not (§5.5).
- MUST provide a "Skip to content" link as the first focusable element in `<body>`,
  visually hidden until focused, targeting the `<main>` element §7.4 requires.
- MUST add `tr:focus-within` beside every `tr:hover` rule that changes opacity or
  visibility — `:154` today. Closes §6.3 D19.
- MUST add `.sb:focus-within` beside `.sb:hover` at `:30`, `:37`, `:40`, `:47`, `:49` and
  `:54`.
- MUST NOT reveal an interactive control on `:hover` alone anywhere in the product. Hover
  MAY change emphasis; it MUST NOT gate reachability.
- SHOULD support Escape twice in a nested surface — innermost first — and MUST NOT nest a
  modal inside a drawer at all (§5.5).

---

### 7.4 Semantics and names

#### 7.4.1 The 992 handlers

`onclick=` appears **992 times** in the file `[source]`. Where those handlers sit:

| Host element | Count | Focusable? | Enter/Space? | Announced as |
|---|---|---|---|---|
| `<button>` | **701** | yes | yes | button |
| `<a>` | 5 | yes | Enter | link |
| `<input>` / `<label>` | 4 | yes | yes | its control |
| `<div>` | **156** | **no** | **no** | **nothing** |
| `<span>` | **64** | **no** | **no** | **nothing** |
| `<td>` | **25** | **no** | **no** | cell |
| `<tr>` | **8** | **no** | **no** | row |

**253 of 992 handlers — 25.5% — sit on an element with no role, no tab stop, and no
keyboard activation** `[computed]` from the counts above.

What that implies is precise, and it is not "the file needs some ARIA": **71% of the
interactive surface is already correct.** The authors reached for `<button>` seven times
out of ten. The defect is a *residue*, not a philosophy — which means it is a bounded,
countable, mechanically closable list, and §7.8 gives the one-line console check that
counts it.

The choice among the three is not stylistic:

- **`<button>`** — anything that changes state, opens a surface, or runs a command,
  *including* things that look like links. Default `type` inside a form is `submit`; use
  `type="button"`.
- **`<a href>`** — anything that navigates to a resource with an address. If it has no
  URL it is not a link. Eyvar's page router makes this rare, and that is fine.
- **`<div>` / `<span>`** — never interactive. Not with `role="button"`, not with
  `tabindex`, unless a native element genuinely cannot be styled to the spec — which in
  this file is never.

#### 7.4.2 Landmarks and headings

Landmark elements present: **`<aside>` × 1** (`:480`, the sidebar). `<main>`, `<nav>`,
`<header>`, `<footer>`, `<section>`: **zero** `[source]`. The top bar is
`<div class="topbar">` (`:59`), the content region is `<div class="page">` (`:70`).

Headings: **41 `<h1>`, 166 `<h2>`, 112 `<h3>`, zero `<h4>`–`<h6>`** `[source]`. The 41 h1s
are one per `.page`, and `.page` is `display:none` unless `.on` (`:70–71`), so **exactly
one h1 is exposed at any moment** — that part is correct and MUST be preserved. `.ch h2`
(`:97`) is the card heading and `.modal-head h3` (`:196`) the modal title, which is a
coherent h1 → h2 → h3 ladder.

The gap is headings rendered as non-headings: `.settings-panel-title` is a `<div>`, **24
times** (`:245`); `.sec-title` is a `<p>`, 3 times (`:228`); `.live-sec-hdr` (`:363`) and
`.settings-tab-group-lbl` (`:233`) are neither `[source]`. Each visually introduces a block
of content and is invisible to heading navigation.

#### 7.4.3 Tables

**74 `<table>` elements, 470 `<th>` elements, 0 `scope` attributes, 0 `<caption>`
elements** `[source]`. (The single `scope` match in the file, at `:20688`, is a JavaScript
local variable, not an HTML attribute.)

At 470 header cells, a screen reader announces no column or row association for any of the
74 tables. Column headers take `scope="col"`; where the first cell of a row is the record's
identity — which §3.1 requires it to be — that cell takes `<th scope="row">`. A `<caption>`
names the table; where the page title already names it, the caption MAY be visually hidden
but MUST exist.

`table.dt th` also carries `text-transform:uppercase` (`:149`), which §6.3 D18 already
flags on typographic grounds. §7.4 adds a second reason: some screen readers spell out
short all-caps strings letter by letter. The two defects share one fix.

#### 7.4.4 Icon-only buttons and accessible names

`.ic-btn` is a 30×30 box containing a bare `<svg>` and no text (`:65–66`) `[source]`.
Three instances: `#mob-menu-btn` (`:554`) and `#tb-back` (`:557`) are `<button>` with
`title="Menu"` / `title="Back"`; `#bell-btn` (`:573`) is a **`<div>` with no title and no
text at all** `[source]` — it has neither a role nor a name.

The file uses `title=` **103 times** `[source]`. **`title` is not an accessible name.** It
is not surfaced on touch, is not surfaced to keyboard users without a pointer, is announced
inconsistently across screen readers, and disappears the moment a tooltip component
replaces it. It is a supplement, never the name.

§4.6 already rules: "MUST give every icon-only button an accessible name and a tooltip."
§7.4 makes it testable — `aria-label` on the button, `aria-hidden="true"` on the decorative
`<svg>` inside it, and the tooltip separately.

The same applies to `.ch-tgl`, the collapse chevron, which is a `<span>` created in
JavaScript with `textContent='▼'` and `title='Collapse / expand'` (`:9385–9387`)
`[source]`. Its accessible name today is the glyph "▼".

#### 7.4.5 Labels

**235 `<label>` elements. Zero `for=` attributes** `[source]`. And none wraps its control:
`.field` is `display:flex;flex-direction:column` (`:232`), so the label and the input are
siblings —

```html
<div class="field"><label>Eyvar commission %</label><input type="number" id="fp3-comm" …></div>
```

— at `:1101`, with the same shape at `:1102`, `:1103` and `:1104` `[source]`. **Not one
form control in the product has a programmatically associated label.** A screen reader
announces "edit, blank" for all of them.

623 `id=` attributes already exist `[source]`, so most controls have the id a `for=` needs;
the fix is largely mechanical.

Two related cases:

- `.computed-box` (`:255`, used at `:1103`) is a **`<div>`** displaying a derived value
  under a `<label>`. It is not a form control, so `for=` cannot reach it. It MUST become
  `<output>` with `for` naming the inputs it derives from — see §7.5.
- `.tog input` (`:185`) is a zero-size checkbox whose visible surface is a sibling `<span>`.
  It MUST carry an `aria-label` or a `for=`-associated label, and the toggle's on/off state
  MUST come from the checkbox's own `checked`, not from a class.

**Rules**

- MUST put every click handler on `<button>`, `<a href>`, or a form control. The console
  check in §7.8 MUST return `0`; it returns **253** today.
- MUST NOT use `role="button"` plus `tabindex` on a `<div>` or `<span>` as a substitute for
  `<button>`.
- MUST expose exactly one `<h1>` per rendered page, and MUST NOT skip a heading level.
- MUST render `.settings-panel-title` (`:245`), `.sec-title` (`:228`), `.live-sec-hdr`
  (`:363`) and `.settings-tab-group-lbl` (`:233`) as real heading elements at the level
  their nesting implies.
- MUST wrap the content region in `<main>`, the top bar in `<header>`, and the rail's nav
  list in `<nav>`; MUST give the second `<nav>` (the settings rail) an `aria-label` that
  distinguishes it from the first.
- MUST give every `<th>` a `scope` attribute — `col` for column headers, `row` for the
  identity cell §3.1 requires. All 470 have none today.
- MUST give every `<table>` a `<caption>`, visually hidden where the page title already
  names it.
- MUST give every icon-only control an `aria-label`, and MUST mark its `<svg>`
  `aria-hidden="true"` and `focusable="false"`. Makes §4.6's icon-name rule testable.
- MUST NOT use `title=` as the accessible name of anything. It is a supplement.
- MUST associate every one of the 235 `<label>` elements with its control via `for=`/`id`
  or by wrapping it. Zero unassociated labels MUST remain.
- MUST render derived read-only values as `<output for="…">`, not `<div>` (`:255`).
- MUST expose disabled state via the `disabled` attribute or `aria-disabled`, never via
  `opacity` alone (`:86`).
- SHOULD name a control from its visible text wherever visible text exists; an
  `aria-label` that differs from the visible label breaks voice control (SC 2.5.3).

---

### 7.5 Live regions and async feedback

#### 7.5.1 The toast announces nothing

`toast()` at `:5269` builds a `<div>`, styles it inline, and appends it to `#toast-stack`
via `ensureToastStack()` `[source]`. Neither the toast nor the stack carries `role`,
`aria-live`, or `aria-atomic` — the file has **zero `aria-` attributes of any kind**
`[source]`. The toast has **352 call sites** (§6.3 D7). **Every one of them is silent to a
screen reader.**

Worse, the toast is carrying content §5.1 forbids it to carry. Validation failures are
routed to it:

| Call | Line |
|---|---|
| `toast('Please select a rider','err')` | `:2485` |
| `toast('Please select pickup and destination','err')` | `:2486` |
| `toast('⚠ Name cannot be empty','warn')` | `:2979` |
| `toast('⚠ Enter a valid email address','warn')` | `:2980` |
| `toast('⚠ Enter your current password','warn')` | `:3040` |
| `toast('⚠ New password must be at least 8 characters','warn')` | `:3041` |

§5.1 already rules "MUST NOT use a toast to report an error the user must fix — use an
inline error or a critical banner", and §4.4 requires three simultaneous inline signals.
§7.5 does not create a new rule here; it states the cost. A transient, unannounced,
auto-dismissing pill in the corner is the single worst carrier for a blocking error: the
user who most needs it is the one who cannot see it, and it is gone in seconds either way.

#### 7.5.2 Politeness, per case

| Case | Region | Politeness | Also required |
|---|---|---|---|
| Success confirmation ("Ticket TCK-4021 created") | `role="status"` | `polite` | The mutation MUST be visible in the page — the new row, the changed badge, the updated count |
| Warning that does not block | `role="status"` | `polite` | A banner if the condition persists (R10) |
| Blocking validation error | `role="alert"` | `assertive` | Inline error on the field, all three signals of §4.4 |
| Form-level validation summary | `role="alert"` | `assertive` | Focus MUST move to the summary; each item MUST link to its field |
| Async operation started | `role="status"` | `polite` | The trigger MUST become `aria-busy="true"` |
| Async operation finished | `role="status"` | `polite` | The result MUST be in the DOM before the announcement |
| Destructive action completed | `role="status"` | `polite` | Undo, where offered, MUST be a real control, not toast text |
| Derived / computed field recalculated (`.computed-box` `:255`, `.formula-box` `:271`, `.preview-strip` `:275`) | `aria-live="polite"` on the `<output>` | `polite`, debounced ≥500 ms | Only when the recalculation is a direct consequence of the user's own edit |
| Continuously ticking values — live map, dispatch counters, SLA timers | **`aria-live="off"`** | none | See §7.5.3 |

**`assertive` interrupts whatever the screen reader is currently saying.** It is reserved
for the two rows above that block the user's task. Everything else is `polite`.

#### 7.5.3 Continuously updating values MUST NOT be a live region

Five one-second re-render loops run in this file:

| Loop | Line |
|---|---|
| `setInterval(renderRideRequestTracking,1000)` | `:2509` |
| `_subTrackInterval` | `:4791` |
| `_nsDispatch.interval` | `:4962` |
| `_subTrackInterval` (second site) | `:5165` |
| `setInterval(tickEngine,1000)` | `:11968` |

A live region on any of these produces one announcement per second, forever, which makes
the page unusable and drowns the announcements that matter. **The correct treatment is the
opposite of a live region:** mark the ticking container `aria-live="off"`, and provide the
same information as a *pollable* status the user can read on demand — a labelled region
with a heading, reachable by heading navigation, plus one summary status region that
announces at most once per 30 seconds and only when a value crosses a threshold the user
has asked to be told about.

This is where §7.5 hands off to §8.1, which owns the monitoring-shell pattern.

#### 7.5.4 A toast is never the only carrier

The governing rule, and the reason it is not optional: a toast is transient, auto-dismisses,
can be pre-empted by a later toast (`TOAST_MAX`, `:5280`), and is announced to nobody
today. **Any information that exists only inside a toast is information the product did not
deliver.**

Every toast MUST have a durable counterpart:

| Toast says | Durable counterpart |
|---|---|
| A record changed | The row, badge, or field shows the new value |
| A record was created | The record is in the list, or the page navigated to it |
| A record was deleted | The row is gone, and a count decremented |
| Something failed | An inline error (§4.4) or a banner (§5.2, R10) |
| A background job started | A pending state on the affected object (§8.1) |
| A standing condition arose | A banner — per R10, standing conditions are banners, not toasts |

The notification centre already in the file (`:2277`) is the natural durable home for
anything with no on-page counterpart, and MUST be used for exactly that.

**Rules**

- MUST wrap the toast stack in a container with `role="status"` and `aria-live="polite"`,
  created once and present in the DOM before the first toast is inserted. A live region
  added at the same moment as its content is not announced.
- MUST use `role="alert"` / `aria-live="assertive"` **only** for blocking validation errors
  and form-level error summaries. Every other announcement MUST be `polite`.
- MUST NOT deliver a blocking error through a toast. Reinforces §5.1 and §4.4; §6.3 D7's
  six conformance failures MUST be widened to include the six error calls listed in §7.5.1.
- MUST move focus to a form-level error summary when a submit fails, and MUST make each
  summary item a link to the field it names.
- MUST pair every toast with a durable counterpart from the §7.5.4 table. A toast MUST NOT
  be the only place a fact appears.
- MUST set `aria-live="off"` on every container refreshed by the five interval loops at
  `:2509`, `:4791`, `:4962`, `:5165` and `:11968`.
- MUST debounce any `polite` region attached to a derived value to **≥500 ms**, and MUST
  announce the value only when it changes.
- MUST render `.computed-box` (`:255`), `.formula-box` (`:271`) and `.preview-strip`
  (`:275`) as `<output for="…">` so the derived value is associated with the inputs that
  produced it.
- MUST set `aria-busy="true"` on the region under an in-flight async operation and MUST
  clear it when the result is in the DOM.
- MUST NOT announce an ambient threshold crossing more than once per 30 seconds per region.
- SHOULD announce the count with the result — "4 drivers found" — rather than announcing
  that a search completed.

---

### 7.6 Motion and autoplay

The file contains **zero** occurrences of `prefers-reduced-motion` `[source]`.

#### 7.6.1 What loops today

**Eight `animation:` declarations carry `infinite`, across four keyframe sets:**

| Keyframes | Declared at | Duration | What it animates |
|---|---|---|---|
| `ping-pulse` (`:331`) | `:329` (`.ping-warn`), `:330` (`.ping-dead`), `:9156` (inline, calling state) | 1.4s / 0.7s / 0.7s | `opacity` 1 → .3 → 1 |
| `live-dot` (`:342`) | `:341` (`.map-tab.active .tab-dot`) | 2s | `box-shadow` spread 3px → 6px |
| `reqPulse` (`:145`) | `:2084` (inline), `:4811` (inline) | 1.4s | `opacity` 1 → .25 → 1 |
| `spin` (injected at `:8727`, `:11384`) | `:8724`, `:11380` (inline) | 0.8s | `transform:rotate` |

**Two corrections to §6.3 D24.** D24 names four looping animations as `ping-pulse`,
`live-dot`, `reqPulse` and `kpiFlash`.

1. **`kpiFlash` does not loop.** `.kpi-flash-target{animation:kpiFlash 1.4s ease-out}`
   (`:109`) declares no iteration count, so it runs **once** `[source]`. It is a one-shot
   attention flash, not ambient motion. It still needs a reduced-motion guard — a
   background flash is motion-adjacent — but it is not in the same category.
2. **`spin` is missing from D24.** Two loading spinners at `:8724` and `:11380` rotate
   indefinitely, with their keyframes injected at runtime (`:8727`, `:11384`) so a
   stylesheet-only reduced-motion block will not reach them `[source]`.

The corrected count is **four looping keyframe sets across eight declarations, one of them
runtime-injected**, plus two finite animations (`kpiFlash` `:109`, `mIn` `:193`).

#### 7.6.2 SC 2.2.2 applies before reduced motion does

`prefers-reduced-motion` is a preference. **SC 2.2.2 Pause, Stop, Hide is a requirement,
and it applies to every user regardless of preference** `[WCAG]`: content that blinks or
moves automatically, starts on load, runs longer than five seconds, and is presented
alongside other content MUST offer a mechanism to pause, stop, or hide it.

`ping-pulse`, `live-dot` and `reqPulse` satisfy every one of those conditions and none of
them offers a mechanism. **These are AA failures today, independent of any media query.**

They are not SC 2.3.1 (flash) failures: at 1.4s and 0.7s cycles the fastest is ≈1.4 flashes
per second `[computed]`, below the three-per-second threshold `[WCAG]`. The problem is
duration, not frequency.

`spin` is exempt while it genuinely represents an operation in progress — a loading
indicator is the documented exception to 2.2.2 `[WCAG]` — but it MUST stop when the
operation ends, and it MUST NOT be the only signal that something is loading.

#### 7.6.3 What must not be lost

`ping-pulse` is doing semantic work: it distinguishes `.ping-warn` from `.ping-dead` by
*rate* (1.4s vs 0.7s), on top of a hue difference (`#B45309` vs `#C62828`, `:329–330`)
`[source]`. Strip the animation naively and two states collapse into a colour difference
alone — which is an SC 1.4.1 failure (§7.1). `.ping-label` (`:332`) already exists and MUST
carry the state as text so that removing the motion removes nothing.

The guard, complete:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .ping-warn, .ping-dead, .map-tab.active .tab-dot { animation: none !important }
}
```

The universal selector is deliberate: it is the only thing that reaches the inline
`animation:` strings at `:2084`, `:4811`, `:8724`, `:9156` and `:11380` and the
runtime-injected `spin` keyframes that a component-by-component block would miss — the same
reach problem §6.3 D17 documents for `.5px` hairlines.

**Rules**

- MUST ship a `@media (prefers-reduced-motion: reduce)` block that reduces every animation
  and transition in the product to ≤0.01ms or `none`, applied via the universal selector so
  it reaches inline and runtime-injected declarations.
- MUST set `animation-iteration-count:1` or `animation:none` on all four looping keyframe
  sets — `ping-pulse` (`:329`, `:330`, `:9156`), `live-dot` (`:341`), `reqPulse` (`:2084`,
  `:4811`), `spin` (`:8724`, `:11380`) — under reduced motion. Corrects and closes §6.3
  D24.
- MUST provide a pause/stop/hide mechanism for `ping-pulse`, `live-dot` and `reqPulse` for
  **all** users, not only those who set the preference (SC 2.2.2). A single persistent
  "Pause live animation" control on the monitoring shell satisfies this for every loop on
  that surface.
- MUST NOT let a looping animation be the only carrier of a state difference. `.ping-warn`
  and `.ping-dead` MUST each render `.ping-label` (`:332`) text.
- MUST stop `spin` (`:8724`, `:11380`) when its operation completes, and MUST pair it with
  a text status announced per §7.5.
- MUST replace removed motion with an equivalent static treatment — a border, a shape, or a
  label — never with nothing.
- MUST NOT autoplay video or audio. The file contains none today; this rule is pre-emptive.
- MUST NOT introduce parallax, auto-advancing carousels, or scroll-hijacking on any admin
  surface.
- **§1.6 is demoted to SHOULD in full by R12 and is not citable in review.** Its
  reduced-motion MUST ("MUST respect `prefers-reduced-motion` by reducing every transition
  … to a plain opacity fade or no motion at all") is restated here in checkable form and is
  binding **from §7.6**, not from §1.6. §1.6's other motion MUSTs — including "MUST NOT
  animate hover states with more than ~100 ms of delay — an admin must feel instantaneous"
  — are unreviewable as written and MUST NOT be cited against a change.

---

### 7.7 Targets and density

#### 7.7.1 The requirement, stated exactly

SC 2.5.8 Target Size (Minimum), Level AA: a pointer target is at least **24 × 24 CSS px**,
**unless** one of these applies `[WCAG]`:

- **Spacing** — the target is smaller than 24 px, but a 24 px-diameter circle centred on it
  does not intersect the circle of any other target.
- **Inline** — the target sits inside a sentence or a block of text.
- **User agent** — the size is browser-determined and unmodified by the author.
- **Essential** — a legally required or information-preserving presentation demands it.
- **Equivalent** — the same function is available through another control that does meet
  24 px.

SC 2.5.5 Target Size (Enhanced) raises this to 44 × 44 px. **That is Level AAA and is out
of scope** (§7.8).

#### 7.7.2 The honest reconciliation with §6.2 D-2

The tempting answer is that density is sanctioned, so small targets are sanctioned. **That
answer is wrong on the document's own terms, twice.**

First, **§6.2 D-2 names the rules it suspends: §1.2 (type ramp), §1.3 (spacing scale),
§3.1 (row height). It does not name §7.7 or SC 2.5.8.** §6.2's own governing rule is that a
deviation which does not name its rule is not sanctioned — it is a defect. D-2 does not
reach here.

Second, and more usefully: **the two requirements are not actually in tension, because they
measure different boxes.** Density is a property of *ink* — type size, row height, padding,
the vertical rhythm an operator scans all day. SC 2.5.8 is a property of the *pointer
target* — the region that dispatches a click. In CSS these are independent. A 22 px-tall
button can carry a 24 px hit area with `padding` plus a compensating negative margin, or
with an `::after` overlay inset to −2px, and neither changes a single pixel of rendered
layout.

So the reconciliation is a rule, not a compromise: **density constrains the visible box; it
does not constrain the hit box, and the hit box is what conformance measures.** Where that
is genuinely impossible, the spacing exception is the second route — and Eyvar's layout
usually satisfies it already, because density in an ops console tends to mean *small
controls in roomy rows*, not *small controls crammed together*.

There is one honest cost, and it is worth stating rather than hiding: an invisible hit area
larger than its visible control makes mis-clicks possible near the edges of a dense table
row. That is a real trade, and the rule below resolves it in a fixed direction — expand
downward and sideways into padding the row already owns, never into a neighbouring target's
24 px circle.

#### 7.7.3 Measured against the file

Heights below are computed from the declared `font-size`, `padding` and `border`, with the
UA `normal` line-height at ≈1.2 — which is itself the reason for the first rule in this
subsection.

| Control | Line | Size `[computed]` | ≥24 px? | Spacing exception |
|---|---|---|---|---|
| `.ic-btn` | `:65` | 30 × 30 | PASS | — |
| `.avatar` | `:68` | 30 × 30 | PASS | — |
| `.modal-close` | `:197` | 28 × 28 | PASS | — |
| `.csel-btn` | `:301` | h 33 | PASS | — |
| `.csel.sm .csel-btn` | `:323` | h 29 | PASS | — |
| `.field input`, `.field select` | `:252` | h 33 | PASS | — |
| `.sb-item` | `:41` | h ≈ 33 | PASS | — |
| `.settings-tab` | `:235` | h ≈ 40 | PASS | — |
| `.map-tab` | `:337` | h ≈ 35 | PASS | — |
| `.trend-nav-btn` | `:314` | 24 × 24 | PASS (exactly) | — |
| `.btn` | `:77` | h ≈ 27 | PASS | — |
| `.btn.sm` | `:81` | h ≈ 22 | **FAIL** | **passes** — inside `.ra`, `gap:5px`, `td` padding `9px 11px` (`:150`) puts row pitch at ≈40 px and horizontal centres ≥50 px apart |
| `.map-fchip` | `:345` | h ≈ 22 | **FAIL** | `gap:6px` (`:344`) puts centres well over 24 px apart horizontally; MUST be re-verified per row |
| `.tog` | `:184` | 32 × **18** | **FAIL** | **unresolved** — MUST be verified per settings row |
| `.feat-rm` | `:260` | ≈ 30 × 19 | **FAIL** | `.feat-row` `margin-bottom:6px` (`:257`) → pitch ≈ 33 px, passes vertically |
| `.ch-tgl` | `:90` | ≈ 17 × 17 | **FAIL** | **unresolved** — `.ch-right` `gap:10px` (`:96`) → centres ≈27 px apart, marginal |
| `.toast-x` | `:5271` | ≈ 15 × 14 | **FAIL** | sole target inside the pill, passes |
| Role-matrix checkbox | `:10763` | 15 × 15 | **FAIL** | `.ptable td` padding `8px 9px` (`:265`) → vertical pitch ≈ 31 px, passes; **column pitch unresolved** |
| `.plan-option input[type=radio]` | `:202` | 14 × 14 | n/a | **Equivalent** — the whole `.plan-option` row (`:199`, padding `12px 14px`) is the target |

**The good news is real: eleven of nineteen pass outright, and most of the rest pass the
spacing exception.** The list of genuinely unresolved targets is short — `.tog`, `.ch-tgl`,
and the role-matrix checkbox's horizontal pitch. That is a closable list, not an
architectural problem.

The first rule below exists because half this table is a computed estimate. `body` sets no
`line-height` (`:22`) `[source]`, so every button height in the file depends on a UA default
that varies by font and platform. **A conformance requirement MUST NOT rest on an inherited
default.**

**Rules**

- MUST give every button, chip and icon control an explicit `min-height` in CSS. A control
  whose height is produced by an inherited `line-height` is not measurable and MUST NOT
  ship. `body` (`:22`) MUST declare a `line-height`.
- MUST give every pointer target a hit area of **≥24 × 24 CSS px**, or MUST satisfy the
  24 px spacing exception, or MUST qualify under `inline`, `essential`, or `equivalent`.
- MUST expand an undersized hit area **without changing the rendered box** — padding plus a
  compensating negative margin, or an inset `::after` overlay. MUST NOT enlarge the visible
  control to reach 24 px in a dense table.
- MUST NOT expand a hit area into a neighbouring target's 24 px circle. Where two adjacent
  targets cannot both reach 24 px without overlapping, the layout MUST change — increase
  `gap` — not the hit areas.
- MUST record, in the ticket, which of the five routes each sub-24 px control takes, and
  MUST record the measured centre-to-centre distance when the route is `spacing`.
- MUST resolve the three unresolved targets in §7.7.3: `.tog` (`:184`, 18 px tall),
  `.ch-tgl` (`:90`, ≈17 px with 10 px neighbours), and the role-matrix checkbox (`:10763`)
  column pitch.
- MUST NOT cite §6.2 D-2 against any rule in §7.7. D-2 suspends §1.2, §1.3 and §3.1 by name
  and reaches nothing else.
- SHOULD set `min-height:24px` on `.btn.sm` (`:81`) and `.map-fchip` (`:345`) rather than
  relying on the spacing exception, because the exception must be re-verified every time a
  row's contents change and `min-height` need not be.
- SHOULD target 44 px on any control a dispatcher operates under time pressure — the
  intervene, call and track actions on the monitoring shell (`:357–362`) — even though
  44 px is AAA and out of scope. Speed is the argument there, not conformance.

---

### 7.8 Conformance target

#### 7.8.1 The standard

**Eyvar Admin conforms to WCAG 2.2 Level A and Level AA**, for the desktop web admin
surfaces named in the document's scope line, in both English and Arabic (§9).

A screen conforms when every success criterion at A and AA passes for that screen. A screen
with one open finding does not "mostly conform" — the term does not exist. It has an open
finding, tracked like any other defect in §6.3.

#### 7.8.2 Explicitly out of scope

Naming these matters as much as naming the target: an unbounded standard is an
unenforceable one.

| Out of scope | Why | Lapses when |
|---|---|---|
| **Level AAA in full** — including SC 2.4.13 Focus Appearance and SC 2.5.5 Target Size (Enhanced, 44 px) | AAA is not a general conformance target for any product `[WCAG]` | never; individual AAA criteria may still be adopted per-surface, as §7.7 does for dispatcher controls |
| **SC 1.2.1–1.2.5, time-based media** | The panel ships no audio or video | the first `<video>` or `<audio>` element lands |
| **The internal DOM of Leaflet 1.9.4** (`:469–470`, loaded from unpkg) | Third-party, not authored here | Eyvar forks or wraps it |
| **The map tile canvas** (`#map-leaflet`, `:349`) | Treated as a decorative graphic | — but a **text equivalent of everything the map conveys MUST exist beside it**, which is in scope and is §8.1's |
| **Native mobile applications** | The scope line is desktop web | a native client ships |
| **Print stylesheets** | None exists | one is authored |
| **Browsers without `:focus-visible` or `:has()`** | Both are baseline in every current evergreen engine | an enterprise customer pins an older engine |

Everything Eyvar authors *over* the map — `.map-ctrl` (`:215`), `.map-tab` (`:337`),
`.map-fchip` (`:345`), `.map-stat` (`:365`), `.live-card` (`:351`) — is fully in scope.

#### 7.8.3 The five-minute screen review

Run in order. Any FAIL blocks the screen. Total ≈4:30.

**1. Tab the screen, mouse untouched. (90s)**
From the address bar, Tab to the end. Every stop shows the blue ring of §7.2.1. You reach
every nav item, every row action, every filter chip. You never land on something you cannot
see, and focus order matches reading order.
*FAIL if:* any stop is invisible; any control is unreachable; focus jumps backwards.

**2. Modal keyboard contract. (30s)**
Open the screen's modal. Escape closes it. Focus returns to the control that opened it.
Shift+Tab from the first control does not reach the page behind the scrim.
*FAIL if:* Escape does nothing; focus lands on `<body>` after close; Tab escapes the scrim.

**3. Two console one-liners. (30s)**

```js
// non-native click targets — MUST be 0 (file-wide today: 253)
$$('[onclick]').filter(e => !['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL']
  .includes(e.tagName) && !e.hasAttribute('tabindex')).length

// unassociated labels + unscoped headers — MUST be 0 (file-wide today: 235 + 470)
$$('label:not([for])').filter(l => !l.querySelector('input,select,textarea')).length
  + $$('th:not([scope])').length
```

**4. Automated pass. (45s)**
axe DevTools or Lighthouse on the rendered screen. **Zero** violations at *serious* or
*critical*. Automated tooling catches roughly a third of WCAG issues — a clean run is
necessary, never sufficient, and never closes a finding from steps 1, 2 or 5.

**5. Empty submit. (45s)**
Submit the screen's form with nothing filled in. The error appears **inline beside the
field** with all three signals of §4.4, and is announced — verify the container carries
`role="alert"` in the DOM inspector, or turn on VoiceOver/NVDA.
*FAIL if:* the only error feedback is a toast (§7.5.1).

**6. Reduced motion, then zoom. (30s)**
Enable the OS "reduce motion" setting and reload: nothing is still looping. Then zoom the
browser to 200%: no horizontal scrolling of the page body, nothing clipped, nothing
overlapping.

**What this review does not cover, and what does.** Five minutes catches the mechanical
failures, which is where all of §6.3's accessibility defects live. It does not catch a
wrong heading hierarchy, a misleading accessible name, or a live region that announces the
wrong thing. Those need one full screen-reader pass per *pattern* — not per screen — run
once against each row of §6.4's surface map and re-run when that pattern changes.

**Rules**

- MUST target **WCAG 2.2 Level AA**. A screen with an open A or AA finding MUST NOT be
  described as conforming.
- MUST treat every exclusion in §7.8.2 as closed. Adding one requires a row in that table
  naming what lapses it — the same discipline §6.2 imposes on deviations.
- MUST run the six-step review in §7.8.3 before a screen ships, and MUST record the result
  in the ticket.
- MUST NOT close an accessibility finding on the strength of an automated scan alone.
- MUST NOT cite a screenshot from `docs/06-design-reference/shopify-admin-web/` to close a
  finding in §7.3, §7.4 or §7.5. A still image cannot evidence tab order, ARIA, or
  screen-reader output.
- MUST run one full screen-reader pass per **pattern** in §6.4, not per screen, and MUST
  re-run it when that pattern changes.
- SHOULD add the two console one-liners of §7.8.3 step 3 to CI, asserting `0`, once §7.4's
  defects are closed — they are the cheapest regression guard in this document.
