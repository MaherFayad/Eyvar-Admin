## 9. Bidirectionality & Localisation

Eyvar Admin ships one non-English locale: Arabic (`ar`), selected at
`eyvar_ops_panel_v40_fixed.html:1495–1500`, applied by `applyLanguage` at `:7939–7953`, with an
88-key dictionary at `:7903–7938`, 86 `data-i18n` keys in markup, and a hand-written RTL
stylesheet at `:370–402` `[observed]`. Operational context is Saudi: seeded
`timezone:'Asia/Riyadh'`, `currency:'SAR'`, `language:'en'` (`:2570`) `[observed]`.

Arabic is right-to-left. Every rule in §1–§8 that names a physical direction is therefore either
wrong in Arabic or ambiguous about which edge it means. **This section binds every numbered
section of this document, present and future**, and removes that ambiguity for all of them.

---

### 9.1 The logical-properties mandate

§1–§8 are read as **logical**, not physical: *left* means **inline-start**, *right*
**inline-end**, *top* **block-start**, *bottom* **block-end** — except the cases in §9.2. In
`dir="ltr"` these resolve to the same physical edges, so **no LTR rendering changes** `[standard]`.
*Leading* / *trailing* are already logical and unchanged (leading = inline-start); where this
document uses both vocabularies for one geometry, the logical pair is authoritative.

**Complete translation table** — every normative statement in §1–§6 naming a physical direction.
Line numbers are this document's; the section reference is authoritative.

| # | Rule as written | Section (line) | Logical restatement |
|---|---|---|---|
| 1 | "Page uses an approved layout (single column, **main + right rail**, or full-bleed editor)" | Ship checklist (44) | main + **inline-end rail** |
| 2 | "**Always right-align** numeric and currency columns." | Ruling **R4** (72) → §3.1 | Align to the **inline-end**. The *column* mirrors, the *digits inside it* do not — §9.2. |
| 3 | "MUST give the **left nav** the same fill as the canvas…" | §1.1 (195) | the **inline-start nav** |
| 4 | "…blue **leading** icon" | §1.1 (200) | unchanged (inline-start) |
| 5 | "SHOULD **right-align** numeric table columns and **left-align** everything else." | §1.2 (243) | `text-align: end` / `text-align: start` |
| 6 | "MUST use a 2:1 ratio for main-content-plus-**right-sidebar** detail pages" | §1.3 (301) | **inline-end-sidebar** |
| 7 | "…align them to the **right edge** of the page header." | §1.3 (305) | **inline-end edge** |
| 8 | "SHOULD put a **leading** icon on every item in a popover menu…" | §1.5 (405) | unchanged (inline-start) |
| 9 | "SHOULD reserve the **trailing** caret exclusively for controls that open a menu or select." | §1.5 (406) | unchanged (inline-end). Caret points **down** and does not mirror; its position moves — §9.5. |
| 10 | "MUST NOT animate `width`, `height`, `top`, or **`left`**" | §1.6 (432) | `inset-block-start` / **`inset-inline-start`**. `translateX` needs a direction-aware sign — see below. |
| 11 | "…plus a fixed **left nav** (~256 px)" | §2.1 (563) | **inline-start nav** |
| 12 | "…keyboard hint inside the field, **right-aligned**." | §2.1 (568) | field's **inline-end** |
| 13 | "The top bar's **right cluster** MUST be exactly: notifications, then the store/account switcher." | §2.1 (569) | **inline-end cluster** |
| 14 | "Every primary nav item MUST have a **leading** icon" | §2.1 (571) | unchanged (inline-start) |
| 15 | "**Count badges MUST be right-aligned numerals** on the row…" | §2.1 (576) | Badge sits at the row's **inline-end**; the numeral stays Western-digit LTR — §9.2. Implemented at `eyvar_ops_panel_v40_fixed.html:385`, with a defect below. |
| 16 | "title **left edge** = first card **left edge**; last button **right edge** = rail **right edge**." | §2.2 (670–671) | **inline-start edge** = card inline-start edge; button **inline-end edge** = rail inline-end edge |
| 17 | "The action cluster MUST order **left-to-right** as: secondary → `More actions ▾` → primary" | §2.2 (676) | **inline-start → inline-end**. In Arabic the primary sits **left**. |
| 18 | "The **right rail** MUST hold only status, publishing, summary, and metadata" | §2.2 (683) | **inline-end rail** |
| 19 | "…keep the product logo in the **left slot** and MUST remove global search and the **right cluster**." | §2.3 (741–742) | **inline-start slot** … **inline-end cluster**. The logo **artwork** does not mirror — §9.5. |
| 20 | "SHOULD repeat a single **right-aligned** `Save`… aligned to the **right edge** of the full content block." | §2.3 (752–753) | **inline-end-aligned**, to the **inline-end edge** |
| 21 | "…exit affordance in the **left slot** of their own bar." | §2.5 (922) | **inline-start slot** |
| 22 | "…keyboard shortcut on the row, **right-aligned** before any submenu [chevron]" | §2.6 (1044) | **inline-end-aligned**. Keycap glyph order does **not** mirror — §9.2. |
| 23 | "Hierarchy MUST be expressed by a single **back arrow left of** the page title." | §2.6 (1046, 989) | **inline-start of** the title. The **arrow glyph mirrors** — §9.5. |
| 24 | "…controls at its **right end**, and SHOULD offer a **trailing** `+`" | §2.6 (1050) | **inline-end**; trailing `+` unchanged |
| 25 | "Transient creation flows SHOULD use a ~400 px **right sheet**" | §2.6 (1059) | **inline-end sheet** |
| 26 | "**Numeric, currency, and count columns MUST be right-aligned**, header and value sharing a **right edge**." | §3.1 (1156) | **inline-end-aligned**, sharing an **inline-end edge**. Digits stay LTR — §9.2. |
| 27 | "Text and date columns MUST be **left-aligned**." | §3.1 (1157) | **inline-start-aligned** cell; the date *string* does not reorder — §9.2. |
| 28 | "…view tabs + `+` on the **left**, icon buttons on the **right**." | §3.2 (1222) | **inline-start** / **inline-end** |
| 29 | "Only section headings and the **trailing** `Learn more` link may sit on the bare canvas." | §3.5 (1436) | unchanged (inline-end) |
| 30 | "Key-value rows MUST **right-align** values and **left-align** labels" | §3.5 (1439) | values **inline-end**, labels **inline-start** |
| 31 | "**Right-rail** summary cards MUST be read-only displays…" | §3.5 (1442) | **inline-end-rail** |
| 32 | "Each entry MUST carry a timestamp, **right-aligned**…" | §3.8 (1657) | **inline-end-aligned**; string does not reorder — §9.2 |
| 33 | "Events with expandable detail MUST use a **trailing** chevron" | §3.8 (1658) | unchanged; the chevron **glyph mirrors** — §9.5 |
| 34 | "`☐ ▸ 16px from card edge text/dates ▸ **left** numbers/money ▸ **right**`" | §3.9 (1709) | `card inline-start edge text/dates ▸ start numbers/money ▸ end` |
| 35 | "…currency symbols as an in-field **left prefix** and unit codes as an in-field **right suffix**" | §4.2 (1901) | **inline-start prefix** / **inline-end suffix**. **Overridden for Arabic** — affix position is locale data — §9.2. |
| 36 | "MUST use a **leading** magnifier icon on… fields that search or autocomplete." | §4.2 (1903) | unchanged; magnifier glyph is **non-mirroring** — §9.5 |
| 37 | "…character counter… **right-aligned** inside the field." | §4.2 (1904) | **inline-end-aligned**; `0/40` stays LTR — §9.2 |
| 38 | "…an HTML source toggle placed at the **far right**." | §4.5 (2153) | toolbar's **far inline-end** |
| 39 | "…repeat both in the **trailing** 'Add' tile of a filled grid." | §4.5 (2155) | unchanged (inline-end) |
| 40 | "MUST pair every resource picker with a **leading** magnifier…" | §4.5 (2156) | unchanged (inline-start) |
| 41 | "Page top bar / save bar: secondary on the **left**, primary on the **right**" | §4.6 (2179–2180) | secondary **inline-start**, primary **inline-end** |
| 42 | "Page header action row: secondaries **left** → dropdown → primary **rightmost**" | §4.6 (2181) | **inline-start** → dropdown → **inline-end-most** |
| 43 | "Modal footer: **right-aligned** pair, `Cancel` **left of** the primary" | §4.6 (2184) | **inline-end-aligned**, `Cancel` **inline-start of** the primary |
| 44 | "Card footer: **right-aligned** pair inside the card" | §4.6 (2188) | **inline-end-aligned** |
| 45 | "**MUST place the primary on the right** in page top bars, page headers, modal footers and card footers, with secondaries **to its left**." | §4.6 (2226–2227) | **primary at the inline-end**, secondaries **inline-start of it**. In Arabic the primary is on the **physical left**. |
| 46 | "…a `⌄` caret at the **right**; opens a menu aligned to the button's **right edge**" | §4.6 (2204) | caret **inline-end**; menu to the button's **inline-end edge** |
| 47 | "One **trailing** affordance only: a small × on the **right** inside the pill." | §5.1 (2384) | × at the pill's **inline-end** |
| 48 | "MUST render toasts as a dark pill, **bottom-centre** of the viewport" | §5.1 (2419) | **block-end, inline-centred** — direction-neutral. **Eyvar deviates** to a corner; see §9.2. |
| 49 | "…header (title + ×) / body / **right-aligned** footer with secondary before primary." | §5.3 (2534) | title **inline-start**, × **inline-end**, footer **inline-end-aligned** |
| 50 | "…**right-edge-aligned** to the trigger… Rows are **left-aligned**" | §5.4 (2550–2551) | **inline-end-edge-aligned**; rows **inline-start-aligned** |
| 51 | "…triggered by a '⋯' at the row's **right edge**" | §5.4 (2556) | row's **inline-end edge** |
| 52 | "…keycap chips, **right-aligned** before the chevron." | §5.4 (2586) | **inline-end-aligned** |
| 53 | "**MUST anchor drawers to the right edge**, full height, with title + × in the header." | §5.5 (2629) | **inline-end edge**. In Arabic the drawer docks on the **physical left**. |
| 54 | "MUST pin committing actions to the drawer's bottom edge, **right-aligned**, primary last" | §5.5 (2631) | **block-end** edge, **inline-end-aligned** |
| 55 | "MUST cap detail and form pages at ~1000 px and **center** them" | §1.3 (300) | unchanged — centring is direction-neutral |
| 56 | "Page gutter: 24 px **left and right**" | §1.3 (259) | **inline-start and inline-end** — symmetric, no visual change |
| 57 | "Settings modal … inset ~8 px from the **left/right**" | §1.4 (339) | **inline-start/inline-end** — symmetric |
| 58 | "**Right-side guide drawer** — flush to the **right edge**, hairline **left border**" | §1.4 (340), §5.5 (2616) | **inline-end** drawer, `border-inline-start` |
| 59 | "…slides in **from the right edge** (~200 ms, ease-out)" | §1.6 (422) | **from the inline-end edge** — sign flip required, below |
| 60 | "Full-width, **left-aligned**" for index pages | §2.2 (626) | **inline-start-aligned** |
| 61 | "checkbox ~16 px from the card's **left edge**" / "first column **left padding**… **leading** checkbox" | §3.1 (1095), §1.3 (292) | card's **inline-start edge**; `padding-inline-start` |
| 62 | "Wide tables clip at the card's **right edge**" | §3.1 (1132) | **inline-end edge**; overflow scrolls toward the inline-end |
| 63 | "badges sit **inline to the right of** the page title" | §3.4 (1355) | **inline-end of** the title |
| 64 | "Label… **left-aligned**" / "Helper text… **left-aligned** to the field" | §4.2 (1815), §4.1 (1778) | **inline-start-aligned** |
| 65 | "resize grip at the **bottom-right** corner" | §4.2 (1874), §4.5 (2070) | **block-end / inline-end** corner |
| 66 | "eye icon at the **right edge** inside the field" / "circled `?` at the field's **right edge**" / "flag + chevron docked at the **right edge** of the phone field" | §4.2 (1868, 1865, 1857) | field's **inline-end edge**. The phone **value** stays LTR — §9.2. |
| 67 | "banner: icon at **left**, × at **top-right**" | §5.2 (2447) | icon **inline-start**, × **block-start / inline-end** |
| 68 | "Composer: avatar at the **left**… actions **right-aligned**" | §3.8 (1607, 1610) | avatar **inline-start**, actions **inline-end-aligned** |
| 69 | "Metric tile: title at **top left**; report icon at **top right**; delta immediately **to its right**" | §3.7 (1509–1511) | block-start/inline-start; block-start/inline-end; delta **inline-end of** the value |
| 70 | "**Legend.** **Bottom-right** of the card" | §3.7 (1518) | **block-end / inline-end**. Chart internals do **not** mirror — §9.2. |

Directional prose in the anatomy paragraphs of §1–§6 inherits the same reading: physical
direction in descriptive prose describes the LTR rendering and carries no independent authority.

**The CSS-level rule.** Author every direction-sensitive declaration logically `[standard]`:

| Never write | Always write |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left:` / `right:` on positioned elements | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `border-radius: 8px 0 0 8px` | `border-start-start-radius` etc. (or the logical 4-value form) |
| `float: left` / `right` | `float: inline-start` / `inline-end` |
| `top` / `bottom`, `margin-top` / `margin-bottom` | `inset-block-*`, `margin-block-*` |
| `box-shadow: inset 3px 0 0 …` | pseudo-element at `inset-inline-start: 0` (no logical form exists) |
| `transform: translateX(28px)` | `translateX(calc(var(--flip) * 28px))`, `--flip: -1` under `[dir="rtl"]` |

Symmetric shorthands (`margin: 0 8px`, `inset: 0`) are direction-neutral. `flex-direction:
row-reverse` and `order:` are **not** substitutes: they reverse visual order without changing the
inline axis, so alignment, scroll direction, and caret behaviour inside the reversed children stay
LTR `[standard]`. The shell uses `row-reverse` (`eyvar_ops_panel_v40_fixed.html:382, 386`)
precisely because it must be a physical flip, not a directional one (§9.3) — correct there, not
the pattern for new content.

**Direction-aware transforms.** `translateX` is direction-blind: positive X is physically
rightward regardless of `dir` `[standard]`. **Currently broken:** the toast stack anchors to
`left:18px` in Arabic and `right:18px` in English (`eyvar_ops_panel_v40_fixed.html:5254`)
`[observed]`, but its entry/exit transform is a hard-coded `translateX(28px)` (`:5288`, `:5301`)
`[observed]` — so in Arabic the toast slides in *from the right*, away from its own anchor and
across the content, then exits back across it.

**Migration.** Counted across the whole file, stylesheet and inline `style=` `[observed]`:
`margin-left` 44, `margin-right` 19, `padding-left` 3, `padding-right` 1, `border-left` 13,
`border-right` 3, `text-align:left` 9, `text-align:right` 37, `left:` 77, `right:` 40 — and
**zero** occurrences of `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`,
`text-align:start`, `text-align:end`, `margin-block`, `unicode-bidi`, `<bdi>`, `&rlm;`, `&lrm;`.
Converting all 246 at once changes nothing visible and touches nearly every line for no shipped
benefit, since 40 of 41 page shells are untranslated (§9.3). Order: (1) regions shipping Arabic
today — sidebar `:24–48`, `:382–385`; Settings shell and sub-nav `:386`, `:401–402`;
`#stab-general` `:393–396`; `#stab-security` `:397–400` — now, deleting the `[dir="rtl"]`
overrides as they become redundant; (2) any region newly claiming Arabic support, before it
ships; (3) everything else opportunistically.

Three live defects the migration fixes, all `[observed]`:

- **`.sb-sec-lbl` loses its inset in Arabic.** `:39` sets `padding:0 0 0 16px`; `:384`
  right-aligns the text but leaves the padding on the left, so all nine translated section labels
  sit flush against the Arabic sidebar's inline-start edge while the gap opens on the wrong side.
- **`.sb-badge` loses its 12 px edge gap.** `:48` sets `margin-left:auto;margin-right:12px`; the
  RTL override at `:385` sets `margin-right:auto`, overriding the `12px`.
- **`.sb-item.on` marks the wrong edge.** `:43` draws the active indicator with
  `box-shadow:inset 3px 0 0 var(--blue)` — a physical left inset with no RTL counterpart, so in
  Arabic the blue rule sits on the far side of the row from the reader's starting edge.

**Rules**

- MUST read every physical direction in §1–§8 as its logical equivalent per the table above, except the cases enumerated in §9.2.
- MUST write `margin-inline-start` / `margin-inline-end`, `padding-inline-start` / `padding-inline-end`, `border-inline-start` / `border-inline-end`, `inset-inline-start` / `inset-inline-end`, `text-align: start` / `text-align: end`, and `float: inline-start` / `float: inline-end` in all new or edited CSS.
- MUST NOT introduce a new `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, `border-right`, `text-align:left`, `text-align:right`, `float:left`, or `float:right` declaration in any region that declares Arabic support under §9.3.
- MUST NOT introduce a new positioned element using bare `left:` or `right:` in any region that declares Arabic support under §9.3.
- MUST pair every `translateX` on an inline-edge-anchored element with a sign flip under `[dir="rtl"]` (or a `--flip` custom property), and MUST fix `eyvar_ops_panel_v40_fixed.html:5288` and `:5301` before the next release.
- MUST replace `eyvar_ops_panel_v40_fixed.html:39` (`padding:0 0 0 16px`) with `padding-inline-start:16px`, `:48` (`margin-left:auto;margin-right:12px`) with the `margin-inline-*` pair, and `:43`'s `inset 3px 0 0` shadow with an `inset-inline-start`-positioned pseudo-element.
- MUST delete each `[dir="rtl"]` override at `eyvar_ops_panel_v40_fixed.html:383–385` and `:394–:402` as the corresponding base declaration becomes logical. A logical base rule plus a surviving physical override is a defect.
- MUST NOT use `flex-direction: row-reverse` or `order:` as a substitute for `dir` on any region containing translated running text.
- SHOULD convert a physical declaration to its logical form whenever the surrounding rule is edited for any other reason.

---

### 9.2 What does NOT mirror

Mirroring is a property of **layout**, not **content**. The following are content, or diagrams
whose geometry carries meaning, and retain LTR order inside an RTL page `[standard]`.

| Content | Mirrors? | Why, and the rule it overrides |
|---|---|---|
| **Numeral runs** | No | Digits are bidi class `EN`/`AN`; the UBA lays a digit run out left-to-right inside an RTL line with no author intervention `[standard]`. `1,234.56` stays `1,234.56`. |
| **Digit system** | n/a | Saudi digital UI convention is Western `0`–`9`, not Arabic-Indic `٠`–`٩` `[standard]`. Arabic-Indic digits appear **zero times** in the file `[observed]`. |
| **Currency affix position** | Locale data | **Overrides §4.2 (1901).** `en-US` puts `$` before, `ar-SA` puts `ر.س.` after `[standard]`. Eyvar ignores both: money is `n.toFixed(2)+' SAR'` at 92 call sites, `Intl` never used (`eyvar_ops_panel_v40_fixed.html:4394`) `[observed]`. |
| **Dates and times** | No | Numeric runs. Cell aligns inline-start (§3.1 1157); the string does not reorder. See the `ar-SA` trap below. |
| **Phone numbers, IDs, IBANs, IPs, plates** | No | Single LTR tokens. A leading `+` is bidi class `ES` and moves to the wrong side without isolation `[standard]`. §4.2 (1857) docks the country select inline-end; the **value** keeps `direction: ltr` — the pattern already shipping at `eyvar_ops_panel_v40_fixed.html:396`, `:400` `[observed]`. |
| **Keyboard shortcut chips** | Position only | `⌘ K` is a chord, pressed modifier-first in every locale `[standard]`. §2.1 (568), §5.4 (2586) place the cluster inline-end; glyph order inside does not change. |
| **Map canvas, markers, headings, routes, compass** | No | Geography: north is up, east is right in every locale `[standard]`. §2.5, §6.4. A vehicle heading glyph points at its real bearing. Map **chrome** (stats bar `eyvar_ops_panel_v40_fixed.html:365–368`, live rail, filter chips, legend) does mirror. |
| **Code, query, monospace editors** | No | Syntax is LTR by specification `[standard]`. §4.5 (2130–2136). Body carries `dir="ltr"`; line numbers and caret stay physical-left. Toolbar and footer are chrome and mirror. |
| **Chart plot areas and axes** | No | §3.7 (1509–1531). A time-series x-axis MUST NOT reverse: its labels are LTR digits and dates, so reversing the axis makes axis and numbers run in opposite directions. The SVG generators at `eyvar_ops_panel_v40_fixed.html:6806, 6818, 6822` use `text-anchor="end"` and absolute `translate` `[observed]` — correct as-is, provided they never inherit `direction: rtl`. |
| **Delta arrows `↑` `↓`** | No | A magnitude on the vertical axis, not a direction of reading. |
| **Media, brand, imagery** | No | `▶` means *forward in time*, not rightward `[standard]`. Logo `eyvar_ops_panel_v40_fixed.html:32–35`, partner and payment marks, photographs, avatars, QR codes. §2.3 (741) moves the *slot*, not the *artwork*. Full glyph inventory in §9.5. |
| **Toast / notification corner** | **Yes** | §5.1 (2419) mandates bottom-*centre*, which is direction-neutral; Eyvar deviates to a corner for a reason documented at `eyvar_ops_panel_v40_fixed.html:5245–5252` `[observed]`. Given the deviation, the corner is layout and mirrors — the JS already flips it (`:5238`, `:5254`), as does the notification panel (`:2218–2220`) `[observed]`. Both are correct in outcome and wrong in form: `dir`-blind JS reimplementations of `inset-inline-end`, duplicated, and one has already drifted from its own animation (§9.1). The deviation is absent from §6.2's closed list and must be added there. |

**The explicit answer R4 needs.** Ruling **R4** (line 72) and §3.1 (1156) split in two:

| Layer | Mirrors? | Rule |
|---|---|---|
| The **column** — where the number sits in its cell | **Yes** | `text-align: end`. In Arabic the numbers hug the cell's physical **left** edge; header and value still share one edge, now the inline-end edge. |
| The **numeral run** — digit order and separator position | **No** | Left-to-right, Western digits, `.` decimal, `,` grouping. Automatic under the UBA; do not fight it with `direction` or `unicode-bidi`. |

This is not a compromise: R4's real content is *"numbers align on their least-significant digit so
a column scans"*, and `text-align: end` preserves that in both directions where a blanket
`text-align: right` breaks it in Arabic by aligning on the side the eye leaves.

**The `ar-SA` trap.** In `Intl.DateTimeFormat`, `ar-SA` defaults to the **Islamic (Hijri)
calendar** and to **Arabic-Indic digits** `[standard]`. Switching the locale string alone silently
converts every date in the panel and contradicts the digit rule above. Both must be pinned:
`ar-SA-u-ca-gregory-nu-latn`. Today the panel does neither — dates split between a hard-coded
`'en-GB'` (8 sites) and the viewer's browser locale via an empty locale array (10 sites), so the
same panel already renders different date formats to different operators and never follows its own
language setting `[observed]`.

**Rules**

- MUST render all numerals in Arabic mode using Western digits `0`–`9`; MUST NOT emit Arabic-Indic digits (`٠`–`٩`) anywhere in the interface.
- MUST align numeric, currency, and count columns with `text-align: end` (never `text-align: right`), and MUST NOT apply `direction` or `unicode-bidi` to the numeral run inside the cell.
- MUST format every currency amount through `Intl.NumberFormat` with the active locale and `numberingSystem: 'latn'`; MUST NOT concatenate a hard-coded currency string (replacing the `n.toFixed(2)+' SAR'` pattern at `eyvar_ops_panel_v40_fixed.html:4394` and its 91 other call sites).
- MUST format every date and time through `Intl.DateTimeFormat` with an explicit calendar and numbering system (`ar-SA-u-ca-gregory-nu-latn` for Arabic); MUST NOT pass a bare `'ar'` or `'ar-SA'` locale, and MUST NOT pass an empty locale array.
- MUST set `dir="ltr"` on every phone-number, identifier, IBAN, IP, and plate field and display.
- MUST set `dir="ltr"` on every code, query, and monospace editor body, and MUST keep its line numbers and caret on the physical left in both languages.
- MUST NOT apply `dir="rtl"`, `direction: rtl`, or `transform: scaleX(-1)` to the map canvas, any map marker, any chart plot area, any SVG axis group, or any media element.
- MUST NOT reverse a time-series axis in Arabic mode.
- MUST NOT mirror the Eyvar logo, any partner or payment brand mark, any photograph, any avatar, or any QR code.
- MUST NOT reorder the glyphs inside a keyboard-shortcut chip.
- MUST anchor the toast stack and the notification panel with `inset-inline-end` in CSS rather than a JavaScript `left`/`right` ternary, replacing `eyvar_ops_panel_v40_fixed.html:5254` and `:2219–:2220`.
- MUST add the bottom-corner toast position to §6.2 as a written deviation, per §6.4's rule that any deviation requires an entry there before it ships.

---

### 9.3 Partial localisation policy

This document has no rule for a half-translated product. Eyvar is one, deliberately, and is likely
to remain one. Measured `[observed]`:

| Metric | Value |
|---|---|
| `data-i18n` keys in markup | **86** |
| Static shell elements with an id | **621** → translation ceiling **13.8%** |
| Page shells with ≥1 `data-i18n` | **1 of 41** (`p-settings`) |
| `data-i18n` emitted by any JS string builder | **0** |
| Top-bar elements translated | **0** |
| Settings panels with a translated body | **2 of 21** (`#stab-general`, `#stab-security`) |
| Translatable attributes (`placeholder`, `title`, `aria-label`) | **0 supported** |

**The scoping decision is ratified as policy.** `eyvar_ops_panel_v40_fixed.html:370–381` states it
`[observed]`: *"scoped to the sidebar shell only, which is the part actually translated… mirroring
layout without translated text would look broken, not helpful. Deliberately never sets
dir/direction on `<html>` or `<body>`: direction is inherited, so doing that leaks RTL into `.main`
and jumbles every English table/card on the page."* Direction MUST follow translation, not precede
it. The **technique** is ratified too: because `direction` inherits, RTL can only be scoped to a
subtree that is a **sibling** of untranslated content — `.sb` is a sibling of `.main`, so
`dir="rtl"` on it cannot leak (`:7944`), and `body.lang-ar` reorders the two with `row-reverse`
(`:382`), leaving `body`'s direction `ltr` so there is no double reversal `[observed]`.

**Before a surface may claim Arabic support** — a claim about a page, drawer, pane, or modal, not
about the product — all seven must hold: (1) every visible string resolves in Arabic, including
JS-concatenated strings, structurally impossible today (`data-i18n` in generated markup: **0**)
`[observed]`; (2) every translatable attribute resolves — none are supported `[observed]`;
(3) every empty state, error, validation message, and toast it can produce is translated;
(4) every dictionary key its markup references exists — five do not
(`eyvar_ops_panel_v40_fixed.html:1431–1435`), and since `applyLanguage` falls back to cached
English on a miss (`:7951`), a missing translation is **visually indistinguishable** from a
deliberate one `[observed]`; (5) numbers, dates, money per §9.2; (6) CSS logical per §9.1;
(7) typography per §9.4. Fail one and the surface does not get `dir="rtl"`.

**An untranslated region is plain English, plain LTR, unmarked** — not mirrored, not right-aligned,
not degraded, greyed, badged, or annotated as untranslated, which would be noise on 40 of 41 pages.
Scope is disclosed **once, at the point of choice**: the selector at
`eyvar_ops_panel_v40_fixed.html:1495–1500` sits above a disclaimer at `:1502` stating that Arabic
translates the sidebar and group labels and flips the menu to RTL while the rest stays English
`[observed]`. That disclaimer is now required, not optional.

**Mixed direction and the bidi isolation rule.** The characteristic Eyvar string is an Arabic label
beside an English record name: `الرصيد: 1,240.50 SAR`. Neutral characters (space, `:`, `(`, `-`,
`+`, `.`, `/`) between an RTL and an LTR run take direction from their surroundings, not from
authorial intent `[standard]` — so `(RDR-4821)` can render as `RDR-4821)(` with nothing in the
source to predict it. Every runtime-interpolated value of unknown or opposite direction MUST be
wrapped in `<bdi>` or `unicode-bidi: isolate` `[standard]`; where markup is impossible (`title`,
`alt`, `aria-label`, `<option>` label), bracket with `U+2068 FSI` … `U+2069 PDI`. This applies
**in both languages** — the panel already fails the reverse case:
`eyvar_ops_panel_v40_fixed.html:14759` concatenates `labelEn + '  —  ' + labelAr` into every
reason-code option unconditionally and `:15078` renders an always-visible Arabic column
`[observed]`. `<bdi>`, `unicode-bidi`, `&rlm;`, `&lrm;` appear a combined **zero** times.

**Rules**

- MUST NOT set `dir` or `direction` on `<html>`, `<body>`, or any ancestor of untranslated content.
- MUST scope RTL to a subtree that is a sibling of untranslated content, and MUST reorder siblings with `flex-direction: row-reverse` or `order:` rather than by setting `direction` on their shared parent.
- MUST satisfy all seven conditions above before a surface receives `dir="rtl"` or is described as supporting Arabic.
- MUST leave untranslated regions in English and LTR, unmirrored, unaligned, and unmarked.
- MUST NOT ship a machine-translated, transliterated, or partially translated string.
- MUST display a scope disclaimer adjacent to the language selector whenever coverage is below 100%, and MUST update it when coverage changes (`eyvar_ops_panel_v40_fixed.html:1502` satisfies this today).
- MUST wrap every runtime-interpolated name, identifier, amount, phone number, email, URL, or operator-typed value in `<bdi>` (or `unicode-bidi: isolate`) in both languages.
- MUST bracket the same values with `U+2068` … `U+2069` when they appear in an attribute that cannot contain markup.
- MUST fail the build when a `data-i18n` key present in markup is absent from `LANG_STRINGS.ar`. Five such keys exist today (`eyvar_ops_panel_v40_fixed.html:1431–1435`).
- MUST NOT render an Arabic string in English mode (`eyvar_ops_panel_v40_fixed.html:14759` and `:15078` violate this today).
- MUST support `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-alt`, and `data-i18n-aria-label` before any surface containing such an attribute claims Arabic support.
- MUST assign the translated element's text with a markup-preserving mechanism; the current `el.textContent` assignment at `eyvar_ops_panel_v40_fixed.html:7951` irreversibly flattens two shipping elements (`:1502` loses a `<b>`, `:1992` loses a `<span class="settings-soon">`) `[observed]`.
- SHOULD translate a surface in whole units — a page, a drawer, a settings pane — never a fragment of one.

---

### 9.4 Typography in Arabic

**Confidence statement.** §1.2's ramp is derived from English evidence only. No Arabic
rendering of the reference set or of Eyvar Admin has been measured. **No value in this subsection is `[observed]`** — the metrics are `[standard]` Arabic
typesetting practice; code facts about the current implementation are `[observed]` and marked.

**Why 13 px does not transfer.** §1.2's 13 px body / 20 px line-height was measured on a Latin
face. Arabic letters are distinguished by dots above and below the baseline (ب ت ث ن ي) and by
hamza, shadda, madda — marks that scale with the em, not the x-height, and merge below ~14 px at 1×
`[standard]`; ب and ت differ only by a dot count, where Latin degrades to a distinguishable
silhouette. Arabic is also cursive with deep descenders (ج ح خ ع غ), so a Latin-tuned line box
crowds. §1.2's **density intent** survives: Arabic reaches the same visual density at a larger
nominal size, because the same content occupies fewer characters.

Applied only within a `dir="rtl"` region (§9.3); floors, not targets `[standard]`. These are the
**same six roles** at different values, so §1.2's six-role cap is unaffected.

| Role (§1.2) | Latin | Arabic floor | Line-height floor |
|---|---|---|---|
| Page title | ~20 px / 600 | 20 px | 1.5 |
| Modal / sheet title | ~15–16 px / 600 | 17 px | 1.5 |
| Section / card heading | ~13–14 px / 600 | 15 px | 1.6 |
| **Body** | **13 px / 400, 20 px** | **14 px** | **1.7** |
| Small / subdued | ~12 px / 400 | 13 px | 1.7 |
| Table column header | ~12–13 px / 500 | 13 px | 1.6 |
| Button label | ~13 px / 500–600 | 14 px | 1.5 |
| Field label | ~12–13 px / 400–500 | 13 px | 1.6 |
| Badge label | ~11–12 px / 500 | 12 px | 1.5 |

**Casing, uppercase, letter-spacing.** Arabic has **no letter case** `[standard]`, so §1.2's and
§5.7's sentence-case mandates are inert there. What replaces them is a prohibition, because the CSS
implementing casing elsewhere is actively harmful: `text-transform: uppercase` is a no-op on
Arabic, and `letter-spacing` **breaks cursive joining** — it inserts gaps between joined forms and
can visually sever a word `[standard]`. Both ship today on a **translated** element `[observed]`:

| Element | Line | Declaration | Translated? |
|---|---|---|---|
| `.sb-sec-lbl` | `:39` | `text-transform:uppercase; letter-spacing:.8px` | **Yes** — all 9 sidebar section labels carry `data-i18n` |
| `.sb-logo-text` | `:36` | `text-transform:uppercase; letter-spacing:1.5px` | No |
| `table.dt th` | `:149` | `text-transform:uppercase; letter-spacing:.3px` | No (also violates §1.2 in English — defect **D7**, §6.3) |
| `.live-sec-hdr` | `:363` | `text-transform:uppercase; letter-spacing:.5px` | No |
| `.ms-lbl` | `:367` | `text-transform:uppercase; letter-spacing:.4px` | No |

**Weight.** §1.2's ban on italic becomes absolute — Arabic has no oblique tradition and synthetic
obliquing skews cursive joins `[standard]`. But **semibold (600) is often unavailable**: many
Arabic families ship 400 and 700 only, and synthesised 600 fills the counters of dense letterforms
(ص ض ط ظ). §1.2's "separate headings by weight, not a size jump (≤2 px)" depends on a weight step
existing; where 600 is missing the fallback is **700 with the ≤2 px constraint retained**, not a
larger size jump.

**Family.** Eyvar declares `font-family: system-ui, -apple-system, sans-serif`
(`eyvar_ops_panel_v40_fixed.html:22`) `[observed]` — **no Arabic face is named anywhere in the
file**, so Arabic renders in whatever the OS substitutes (Segoe UI/Tahoma, Geeza Pro/SF Arabic,
Noto Naskh Arabic), making the same screen a different density per machine. §1.2's one-family rule
is kept in spirit, relaxed in letter: a stack naming one Latin and one Arabic face is one type
system `[standard]`. The Arabic face must be **Naskh** (not Kufi, Diwani, Ruq'ah), ship ≥3 weights
including 600, cover both digit sets so a numeral does not fall back mid-string, cover `، ؛ ؟`, and
be height-matched so a `<bdi>`-isolated English name does not jump. IBM Plex Sans Arabic, Noto Sans
Arabic, Cairo, and Tajawal meet all five `[standard]`.

**Rules**

- MUST NOT claim any Arabic type value in this section as `[observed]`; no Arabic rendering of Eyvar Admin or of the reference set has been reviewed.
- MUST set Arabic body text to at least 14 px with a line-height of at least 1.7, overriding §1.2's 13 px / 20 px mandate within `dir="rtl"` regions only.
- MUST meet the per-role size and line-height floors above for every role rendered in Arabic.
- MUST NOT apply `text-transform` to any element that can render Arabic text.
- MUST NOT apply a non-zero `letter-spacing` to any element that can render Arabic text; MUST remove `letter-spacing:.8px` from `eyvar_ops_panel_v40_fixed.html:39`, which currently applies to nine translated sidebar section labels.
- MUST NOT apply `font-style: italic` or `font-synthesis` obliquing to Arabic text.
- MUST declare an explicit Arabic font family in the stack at `eyvar_ops_panel_v40_fixed.html:22`; MUST NOT rely on `system-ui` substitution for Arabic.
- MUST select an Arabic face that is Naskh-style, ships weights 400/600/700, and covers Western digits and the `، ؛ ؟` punctuation set.
- MUST keep §1.2's six-role cap and its ≤2 px heading-to-body size constraint in Arabic; where weight 600 is unavailable, MUST step to 700 rather than increase the size gap.
- SHOULD test every Arabic surface at 1× device pixel ratio, where diacritic separation fails first.

---

### 9.5 Icon and glyph mirroring

A glyph mirrors when it depicts **direction of travel through content**; it does not when it
depicts an **object**, a **fixed physical fact**, or a **brand** `[standard]`. §1.5 governs the icon
system and names none of this.

**MUST mirror**

| Glyph | Where in §1–§6 | LTR | RTL |
|---|---|---|---|
| Back arrow | §2.6 (989, 1046) | `←` | `→` |
| Forward / next arrow | §2.6, §5.6 | `→` | `←` |
| Row and menu disclosure chevron | §2.6 (1046), §4.7 (2303) | `›` | `‹` |
| Submenu chevron on a shortcut row | §5.4 (2586) | `›` | `‹` |
| "Learn more →" / CTA / additive-link arrow | §5.7, §4.6 (2202) | `→` | `←` |
| Pagination previous / next | §3.1 | `‹` `›` | `›` `‹` |
| Indentation and nesting guides in nav and settings trees | §2.1 (546, 554) | indent right | indent left |
| Progress bars and step trackers | §3.7, §5.6 | fills L→R | fills R→L |
| Undo / redo | §2.5 (876), §4.5 (2130) | `↶` `↷` | swapped |
| Text-alignment, list indent / outdent icons | §4.5 (2070–2073, 2153) | as authored | mirrored |
| Bulk-edit back (`⇤ Back`) | §2.5 (889) | `⇤` | `⇥` |
| Slide-in transform sign for drawers, sheets, panels, toasts | §1.6 (422), §5.5 (2629) | `+X` | `−X` |
| Sidebar collapse/expand chevron, where one is added | §2.1; not present in markup today `[observed]` | points inline-start | points inline-end |

**MUST NEVER mirror**

| Glyph | Why |
|---|---|
| Checkmark `✓` | A mark, not a direction; mirrored it reads as a stray tick. |
| `×` close, `+` add, `−` remove | Symmetric. §5.1 (2384), §5.2 (2447), §5.3 (2480), §5.5 (2616), §3.2 (1003, 1050). |
| Clock, calendar | Objects; clock hands turn clockwise in every locale. §4.5 (2102). |
| Magnifier / search | An object; mirroring flips the handle to the wrong quadrant. §1.5, §4.2 (1903), §4.5 (2156). |
| Media playback `▶ ⏸ ⏹ ⏭ ⏮`, volume, mic | `▶` means *forward in time*, not rightward. |
| External-link `↗` | A conventional composite mark, recognised as a unit. §2.6 (1031). |
| Eyvar logo and wordmark | Brand. `eyvar_ops_panel_v40_fixed.html:32–35`; §2.3 (741). |
| Partner, channel, app, payment-brand marks | Brand. §4.3 (1960). |
| Bell, gear, trash | Objects. §2.1 (519, 569), §2.4 (791), §4.5 (2099). |
| `⚠` `ⓘ` `⛔`, badge status dots | Symmetric marks. §1.1 (200), §5.2, §3.4 (1308). |
| `⋯` overflow, `⠿` drag handle | Symmetric. §5.4 (2556), §3.7 (1566). |
| `⌘` `⌃` `⇧` keycaps | Fixed key names. §9.2. |
| Up/down sort carets, stacked select chevrons `⌃⌄`, delta `↑` `↓` | Vertical axis. §4.3 (1911), §3.7 (1511). |
| Split-button `⌄` caret | Points down; only its *position* moves (§9.1 row 46). |
| Country flags in the phone select | Geographic artwork. §4.2 (1857). |
| Map pins, heading markers, compass; chart glyphs, donut segments, sparklines | §9.2. |
| Avatars, photographs, uploads, QR codes; currency glyphs `$` `ر.س.` | Content and characters. §9.2. |

Mirroring is per-glyph, so a blanket `[dir="rtl"] svg { transform: scaleX(-1) }` is forbidden — it
would flip every entry in the second table. Use an opt-in class:
`[dir="rtl"].icon-mirror { transform: scaleX(-1); }`. Text glyphs used as icons (`←` `→` `›` `↗`
`⇤` `↻` `⬆`, all present in the file's string builders `[observed]`) cannot be mirrored by class
and must be swapped at construction time — which requires the builder to know the active
direction, a capability the panel lacks since `applyLanguage` reaches only static `[data-i18n]`
markup `[observed]`.

**Rules**

- MUST mirror every glyph in the first table under `dir="rtl"`.
- MUST NOT mirror any glyph in the second table under any circumstances.
- MUST NOT apply a blanket `scaleX(-1)` to `svg`, `[class*="icon"]`, or any selector broader than an explicit opt-in class.
- MUST swap directional text glyphs (`←` `→` `›` `‹` `⇤` `⇥`) at string-construction time rather than with CSS.
- MUST NOT mirror a vertical-axis glyph (`↑` `↓` `⌃` `⌄`) in any locale.
- MUST reverse the sign of the slide-in transform for every drawer, sheet, panel, and toast under `dir="rtl"` (§9.1).
- SHOULD carry the mirror decision in the icon's own definition, so a glyph added once is classified once.

---

### 9.6 Copy rules in Arabic

§5.7 is written entirely against English orthography. Two mandates — **sentence case** and the
**terminal-period rule** — need Arabic answers; the rest bind unchanged, being about stance not
orthography: verb-first buttons; no exclamation marks, emoji, or "successfully"; imperative errors
naming the fix without blame or "please"; empty states stating the section's value; second person;
constraints in helper text not tooltips; toasts echoing the button's exact object; end-of-list
stated in words; toasts ≤ ~5 words.

**Replacing sentence case.** Arabic has no letter case `[standard]`, so §5.7's casing mandate has
no operation to perform. It is replaced by: no `text-transform`, no `letter-spacing` (§9.4); Latin
proper nouns keeping English capitalisation inside an Arabic string (`Eyvar`, `SAR`, `RDR-4821`)
and `<bdi>`-isolated (§9.3); and one register — MSA, no dialect, no code-switching. The dictionary
is MSA with colloquial constructions in the long explanatory strings (`gen.disclaimer`
`eyvar_ops_panel_v40_fixed.html:7927`, `gen.logo_note` `:7929`) `[observed]`, to be normalised.

**Punctuation** `[standard]`:

| English | Arabic | Codepoint |
|---|---|---|
| `,` comma | **`،`** | U+060C |
| `;` semicolon | **`؛`** | U+061B |
| `?` question mark | **`؟`** | U+061F |
| `.` full stop | **`.`** — Arabic uses the Latin full stop; there is no separate Arabic period | U+002E |
| `:` colon, `%` percent | unchanged (`٪` U+066A exists but is rare in Saudi digital contexts) | — |
| `-` hyphen, `` parentheses | unchanged, but bidi-neutral — see §9.3 | — |

The dictionary already uses `،` correctly at `eyvar_ops_panel_v40_fixed.html:7922,:7927,:7929,
:7936` `[observed]`; `؛` does not yet occur in it.

**The terminal-period rule transfers unchanged**, since Arabic uses the same `.` (U+002E). One
refinement: the period MUST be the last character of the source string, never placed before a
trailing interpolated value, or the UBA moves it to the visually wrong end of the line `[standard]`.

**Button labels.** §5.7's verb-first rule is *stronger* in Arabic — MSA is verb-initial (VSO), so a
verb-first label is the natural register `[standard]`. One choice must be made and held
product-wide: **imperative** (`احفظ`) or **masdar / verbal noun** (`حفظ`). Both are idiomatic;
mixing them is not. The shipping dictionary uses the masdar (`حفظ الإعدادات العامة`
`eyvar_ops_panel_v40_fixed.html:7930`, `حفظ إعدادات الأمان` `:7934`) `[observed]`, so **masdar is
the ruling convention**. §5.7's permitted non-verb labels map to verbal nouns: `إلغاء` / `إغلاق` /
`تم`.

**Numbers, plurals, gender, length.** Digits are Western `0`–`9` (§9.2). Arabic has **six** CLDR
plural categories — `zero`, `one`, `two`, `few`, `many`, `other` — against English's two, and marks
exactly-two grammatically (`رحلتان`), so an English string handling `1` and `n` is wrong at `2`
`[standard]`. Verbs and adjectives agree with the noun's gender, so `{entity} تم تحديثه` breaks
when `{entity}` is feminine, and concatenation (`'تم تحديث ' + n + ' سجل'`) cannot be grammatical
across six categories. The panel has no plural machinery and no `Intl` usage `[observed]`. Arabic
runs ~20–25% shorter than English in character count `[standard]` — which is why the Arabic sidebar
is *wider*, not narrower (§9.7): the shortening is in characters, while rendered width grows with
the larger size (§9.4) and wider inter-word spacing.

**Rules**

- MUST use `،` (U+060C) for commas, `؛` (U+061B) for semicolons, and `؟` (U+061F) for question marks in all Arabic strings; MUST NOT use `,`, `;`, or `?`.
- MUST use `.` (U+002E) as the Arabic full stop, and MUST keep it as the final character of the source string.
- MUST NOT apply `text-transform` or `letter-spacing` to Arabic strings (restating §9.4).
- MUST write Arabic button labels as masdar (verbal-noun) forms, matching the convention already shipping at `eyvar_ops_panel_v40_fixed.html:7930` and `:7934`; MUST NOT mix masdar and imperative forms within the product.
- MUST write all Arabic UI copy in Modern Standard Arabic; MUST NOT use dialect or code-switching.
- MUST render every count-bearing Arabic string through a six-category plural selector (`zero`/`one`/`two`/`few`/`many`/`other`); MUST NOT build a count string by concatenation.
- MUST author entity-specific strings rather than templating one string across entities of differing grammatical gender.
- MUST keep §5.7's prohibitions on exclamation marks, emoji, "please", and blame in Arabic.
- MUST `<bdi>`-isolate every Latin proper noun, product name, and identifier appearing inside an Arabic string (restating §9.3).
- MUST NOT size an Arabic container from its English string length.

---

### 9.7 The untokenised width

`[observed]`, all in `eyvar_ops_panel_v40_fixed.html`:

| Line | Declaration | Meaning |
|---|---|---|
| `:24` | `.sb{width:52px}` | Collapsed rail, both languages |
| `:30` | `.sb:hover,.sb.pin{width:236px}` | Expanded rail, English |
| `:31` | `body.lang-ar.sb:hover,body.lang-ar.sb.pin{width:268px}` | Expanded rail, **Arabic** |
| `:429` | `.sb{…width:236px!important}` (≤768 px) | Mobile drawer, English |
| `:435` | `.sb[dir="rtl"]{…width:268px!important}` (≤768 px) | Mobile drawer, **Arabic** |

Arabic is **+32 px (+13.6%)**, to fit longer nav labels. The `:root` block at `:11–21` contains
**only colour tokens** — there is no `--sb-w` or any dimension custom property anywhere in the file
`[observed]`. All five widths are literals, and the two Arabic values are duplicated across two
hooks (`body.lang-ar` at `:31`, `.sb[dir="rtl"]` at `:435`) expressing the same concept.

**Does §6.4 forbid it?** Its rule reads *"MUST NOT introduce a new **colour, radius, shadow, or
font size** that is not already a token in `:root`"*. Read literally the enumeration is closed and
excludes dimensions, so `268px` does not violate the rule *as written*. Read for intent —
*"extend the token set instead of hard-coding a value"* — it plainly does. And §6.2's list of
sanctioned deviations has four entries, none a language-conditional width, while §6.4 requires
*"a written entry there before it ships"*. So: **`268px` is outside the letter of §6.4, contrary
to its intent, and an unsanctioned deviation under §6.2.**

**Ruling: tokenise, do not sanction.** (1) It is a measurement, not a decision — §6.2's four
deviations are brand and density *choices*; "Arabic labels need 32 more pixels" is a fact about a
translation, misfiled in a list of principles. (2) It is already duplicated and can drift: changing
`:31` without `:435` gives a desktop rail and a mobile drawer of different widths in one language.
(3) Every surface gaining Arabic support under §9.3 needs the same treatment — a token generalises,
a §6.2 entry does not. (4) `.main` has no `body.lang-ar` rule and absorbs the 32 px via flex
`[observed]` — correct, but currently correct by accident.

```css
:root{ --sb-w-collapsed: 52px; --sb-w-expanded: 236px; }   /* Latin */
body.lang-ar{ --sb-w-expanded: 268px; }                    /* Arabic — +32px for longer nav labels */
```

`:24`, `:30`, `:31`, `:429`, `:435` then all consume the custom properties, `:31` disappears, and
`:435` loses its width declaration — collapsing the two competing hooks into one. This is not a new
deviation and needs no §6.2 entry; it is the existing rule being followed.

§6.4's enumeration is amended: the token requirement covers **colour, radius, shadow, font size,
and any dimension that varies by language, theme, or breakpoint**. The trigger is **variance**, not
size — a one-off language-invariant dimension (a modal's `520px`) is unaffected. Also untokenised in
the RTL block: the literal `#DCE0E6` at `:383` (and `:24`, `:32`, `:36`) `[observed]` — a colour,
which §6.4 forbids as written with no ambiguity at all.

**Rules**

- MUST define `--sb-w-collapsed` and `--sb-w-expanded` in `:root` (`eyvar_ops_panel_v40_fixed.html:11–21`) and MUST redefine `--sb-w-expanded` under `body.lang-ar` rather than restating a width.
- MUST replace the literal widths at `eyvar_ops_panel_v40_fixed.html:24`, `:30`, `:31`, `:429`, and `:435` with those custom properties, and MUST delete `:31` and `:435`'s width declaration once done.
- MUST express any dimension that varies by language, theme, or breakpoint as a custom property; §6.4's token rule is extended from "colour, radius, shadow, font size" to include such dimensions.
- MUST NOT add a `268px`-style language-conditional literal to §6.2; it is not a sanctioned deviation, it is an untokenised value.
- MUST replace the literal `#DCE0E6` at `eyvar_ops_panel_v40_fixed.html:383`, `:24`, `:32`, and `:36` with a `:root` colour token, per §6.4 as already written.
- MUST use exactly one selector hook for language-conditional styling; MUST NOT maintain both `body.lang-ar` and `.sb[dir="rtl"]` as parallel expressions of the same condition.
- SHOULD leave `.main` without a language-conditional width rule; the flex layout absorbing the delta is the intended behaviour and MUST be stated in a comment rather than implemented.

---

### 9.8 Review checklist

**Setup — 30 s.** Sidebar → Settings → General → *Interface language* → **العربية** → press **Save
general settings**. Three `[observed]` traps: changing the `<select>` alone does nothing (no
`onchange` at `eyvar_ops_panel_v40_fixed.html:1496`); the path is gated by
`requirePerm('manage_settings')` (`:7987`), which only `USR-1` holds in seeded data; and the choice
is **not persisted** (`:2570` re-seeds `'en'` on every load), so a refresh loses it.

| # | Check | Time | Pass condition | Rule |
|---|---|---|---|---|
| 1 | **Does this surface claim Arabic support?** | 15 s | If no, the only valid state is unmirrored English LTR. Jump to check 9. | §9.3 |
| 2 | **Untranslated text in a mirrored region** | 30 s | Zero English strings inside any `dir="rtl"` subtree. A single English word fails. | §9.3 |
| 3 | **Missing-key silence** | 20 s | Console shows no missing-key warnings. Absent the build lint, spot-check the settings tab rail: `stab.branding`, `stab.integrity`, `stab.rota`, `stab.ledger`, `stab.pricing` (`eyvar_ops_panel_v40_fixed.html:1431–1435`) are known-missing. | §9.3 |
| 4 | **Number, money, date sanity** | 45 s | Digits `0`–`9`, never `٠`–`٩`. Dates **Gregorian**, not Hijri. Money reads `1,234.56` with the affix on the locale's side. Numeric columns hug the **physical left** edge and share it with their header. | §9.2 |
| 5 | **Bidi damage on interpolated values** | 30 s | Find a row with an English name or bracketed ID inside an Arabic string: parentheses, `+`, `-`, `:` on the intended side; `(RDR-4821)` has not become `RDR-4821)(`. | §9.3 |
| 6 | **Primary action position** | 20 s | Primary button on the **physical left** in page headers, modal footers, card footers, drawer footers, save bar. | §9.1 rows 41–45, 54 |
| 7 | **Directional glyphs** | 30 s | Back arrow `→`. Row chevrons `‹`. Checkmarks, `×`, clock, magnifier, `↗`, media controls, Eyvar logo **un**mirrored. | §9.5 |
| 8 | **Motion direction** | 20 s | Open a drawer, fire a toast: each enters **from the edge it is anchored to**, not across the page. (Known-failing: `eyvar_ops_panel_v40_fixed.html:5288`, `:5301`.) | §9.1 |
| 9 | **Non-mirroring content** | 30 s | Map north up, pins on real coordinates. Chart time axes earliest-left. Code and query editors LTR with caret physical-left. Phone numbers read `+966 …`. | §9.2 |
| 10 | **Typography** | 30 s | Arabic body ≥14 px, line-height ≥1.7. **No tracking between Arabic letters** — check sidebar section labels specifically (`eyvar_ops_panel_v40_fixed.html:39` currently fails). No uppercase attempt, no italics. | §9.4 |
| 11 | **Copy** | 30 s | Commas `،`, question marks `؟`. Buttons masdar. No exclamation marks or emoji. Count strings grammatical at 1, 2, 3, and 11. | §9.6 |
| 12 | **Layout truncation** | 20 s | No Arabic label clipped, ellipsised, or wrapping in a one-line container. Sidebar is 268 px and content has not been squeezed into a horizontal scroll. | §9.7, §9.6 |
| 13 | **Switch back to English** | 20 s | Every string returns to English **with its inline markup**. (Known-failing: `:1502` loses a `<b>`, `:1992` loses a badge `<span>`, permanently, on the first toggle — `:7951` uses `textContent`.) | §9.3 |

**Total: ~4 min 40 s.**

**Rules**

- MUST run all 13 checks against every surface that claims Arabic support, before it ships.
- MUST re-run checks 2, 3, and 13 whenever a `data-i18n` key is added, renamed, or removed.
- MUST re-run checks 4, 5, and 11 whenever a string builder that interpolates a value is edited.
- MUST log a failed check against the section it violates, not as a generic "RTL bug".
- MUST NOT sign off a surface as Arabic-supporting on check 1 alone.
- SHOULD review as `USR-1`; no other seeded operator can change the interface language (`eyvar_ops_panel_v40_fixed.html:7987`) `[observed]`.
