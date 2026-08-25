# 00 — Primitives: the token layer, `components.json`, and all 38 shadcn files

> **Phase 0, steps 0.3 (remainder) and 0.4.** Owner: frontend-engineer.
> Consumers: every Phase 1 engineer, qa-engineer, visual-qa-engineer, product-designer.
>
> **Spec:** `docs/05-restructure/specs/00-foundation.md` §5.1–§5.4
> **Design spec:** `docs/05-restructure/design/00-shell.md` — §1.2 (tokens), §5.2 (the
> primitive list), §12 (the component inventory), §12.2 (restyle notes), §14 (Arabic), §18
> **Binding decisions:** **D1**, **D2** (`--ev-bp-wide: 1344px`), **D3**
> **Upstream artifact consumed:** `docs/05-restructure/build/00-utilities.md` (0.5)
>
> **`components.json` IS NOW FROZEN. No Phase 1 agent may run `shadcn add`.**

---

## 0. Status

| Check | Result |
|---|---|
| `npx tsc -b --noEmit` | **clean**, exit 0, zero diagnostics |
| `npx vitest run` | **339 passed / 339**, 19 files (0.5's suite; 0.4 adds no tests — that is qa's) |
| `npx vite build` | clean, 94.09 kB CSS / 15.70 kB gzip |
| `/token-audit` — Tailwind palette classes | **zero**, in source *and* in the built stylesheet |
| `/token-audit` — raw hex outside `globals.css` | **zero** |
| `/token-audit` — physical-direction utilities | **zero** (see §6 for the one documented exception) |
| `/token-audit` — `outline-none` with no replacement | **zero** (see §6 for the roving-highlight note) |
| `/token-audit` — `<div onClick>` | zero |
| `/token-audit` — hover-only reveals | zero |
| `/token-audit` — stock shadcn greys in `src/components/ui` | zero |
| Arbitrary values in the built stylesheet | **one**, `transition-[width]`, deliberate — §6 |
| `@media (min-width: …)` rules in the built stylesheet | **exactly one: `1344px`** |
| Renders under `dir="rtl"` + `lang="ar"` | verified — §7 |
| Restyle header naming the rules applied | **38 of 38 files** |

**Versions:** shadcn `4.19.0` · tailwindcss `4.3.3` · recharts `3.8.0` · React 19 · Vite 6.

---

## 1. Q5 — does shadcn `chart` theme entirely to `--ev-*`? **CLOSED**

Design spec finding **F-8** and spec §5.2 item 33 both said this had to close inside 0.4,
because `ChartCard` (D-09) and eight sub-tabs are blocked on it: Management × 3 plus five
Overview surfaces. Spec §5.2 states it as *"a constraint, not a choice: it must theme
entirely to `--ev-*` and ship no built-in palette."*

### The answer

> **Yes for the shadcn wrapper. No for Recharts underneath. The gap is real, it is
> enumerable, and it is now closed in `globals.css` — so the answer for the stack as
> shipped is YES, and no separate chart primitive is needed. Q5 does not become a
> Phase-0-sized task.**

Three separate questions were hiding inside Q5. Taking them in order:

### 1.1 Does the shadcn wrapper ship a palette? **No.**

`src/components/ui/chart.tsx` contains no colour value of any kind. `ChartStyle` takes the
`ChartConfig` the caller passes and emits one `--color-<key>` custom property per series,
scoped to a single generated chart id:

```
[data-chart=chart-r1a] { --color-revenue: <whatever the caller passed>; }
```

Every other class in the file is a semantic slot — `fill-muted-foreground`,
`stroke-border`, `bg-background`, `text-foreground`, `fill-muted`. There is nothing to
strip. **This half of Q5 passes as-shipped.**

### 1.2 Did `shadcn init` write a palette into our CSS? **Yes — and it is deleted.**

`shadcn init` wrote `--chart-1` … `--chart-5` into `:root` as a five-step neutral `oklch`
ramp, plus five matching `--color-chart-N` entries in `@theme inline`. That *is* shadcn's
built-in palette, and it landed in a file I own.

**All ten are deleted, not remapped.** Remapping five slots to token values would have
preserved a *categorical* five-colour affordance that Eyvar does not have. `DESIGN.md`
§3.7 specifies the chart style exactly:

> *"Single-hue blue line, thin, with a very pale area fill beneath it; the comparison
> series is the same hue dotted; … no gridlines beyond the axis baseline."*

So the product has **two** chart colour roles, not five, and they differ by **dash, not
hue**. `globals.css` now declares exactly:

| Slot | Maps to | Role |
|---|---|---|
| `--chart-series` | `--ev-blue` | the series |
| `--chart-comparison` | `--ev-blue` | the comparison series — **same hue**, distinguished by dashing |
| `--chart-fill` | `--ev-blue-lt` | the very pale area fill |
| `--chart-axis` | `--ev-text-2` | axis lines and tick labels |
| `--chart-grid` | `--ev-hairline` | the axis baseline |

**There is no `--chart-3`.** If someone needs a categorical multi-series chart, that is a
question for product-designer against R7, not a colour to invent. Recorded here so nobody
"restores" the ramp.

### 1.3 Does Recharts leak? **Yes — ~30 literals. This is the real finding.**

Recharts 3.8.0 ships hard-coded colour literals as **prop defaults**, so a mark rendered
without an explicit `fill` or `stroke` paints an off-token colour that **no token audit of
our source can see** — the value is in `node_modules`, not in a class we wrote.

Census, from `node_modules/recharts/es6`, by grepping the default-props objects:

| Component | File:line | Literal | Covered by the stock shadcn wrapper? |
|---|---|---|:--:|
| `CartesianGrid` | `cartesian/CartesianGrid.js:292` | `stroke: '#ccc'` | yes |
| `Cursor` (tooltip cursor) | `component/Cursor.js:99` | `stroke: '#ccc'` | yes |
| `ActivePoints` | `component/ActivePoints.js:38` | `stroke: '#fff'` | yes |
| `PolarGrid` | `polar/PolarGrid.js:48,74,95` | `stroke: '#ccc'` ×3 | yes |
| `RadialBar` background | `polar/RadialBar.js:263` | `fill: '#eee'` | yes |
| `ReferenceLine` | `cartesian/ReferenceLine.js:228` | `stroke: '#ccc'` | yes |
| `Pie` sector stroke | `polar/Pie.js:563` | `stroke: '#fff'` | yes |
| **`Line`** | `cartesian/Line.js:571` | **`stroke: '#3182bd'`** | **NO** |
| **`Line`** dot fill | `cartesian/Line.js:566` | `fill: '#fff'` | **NO** |
| **`Area`** | `cartesian/Area.js:548,553` | **`fill`/`stroke: '#3182bd'`** | **NO** |
| **`Bar`** | `cartesian/Bar.js:136` | **`fill: '#eee'`** | **NO** |
| **`Pie`** | `polar/Pie.js:550` | **`fill: '#808080'`** | **NO** |
| **`Funnel`** | `cartesian/Funnel.js:248,255` | `fill: '#808080'`, `stroke: '#fff'` | **NO** |
| **`CartesianAxis`** | `cartesian/CartesianAxis.js:53` | **`stroke: '#666'`** | **NO** |
| **`ReferenceDot`** | `cartesian/ReferenceDot.js:122,123` | `fill: '#fff'`, `stroke: '#ccc'` | **NO** |
| **`ReferenceArea`** | `cartesian/ReferenceArea.js:142` | `fill: '#ccc'` | **NO** |
| **`Brush`** | `cartesian/Brush.js:866,867` | `fill: '#fff'`, `stroke: '#666'` | **NO** |
| **`PolarRadiusAxis`** | `polar/defaultPolarRadiusAxisProps.js:16` | `stroke: '#ccc'` | **NO** |
| `DefaultTooltipContent` | `component/DefaultTooltipContent.js:28,36` | `#fff` / `#000` | n/a — we always pass `ChartTooltipContent` |
| `Treemap`, `SunburstChart` | `chart/*.js` | `#fff`, `#333`, `#FFF` | n/a — neither chart type is in the product |

The stock wrapper neutralises **nine**. `#3182bd` in particular is a blue that is *not*
`--ev-blue`, and it is the default for the single most-used mark in the product — a line
series. A `<Line dataKey="trips" />` written without a `stroke` would have painted it, and
it would have passed every review.

### 1.4 How the gap is closed

Two layers, and the second is the one that matters:

1. **`ChartCard` (D-09, built in 0.7 or by the first Phase 1 consumer) must set every
   mark's colour from `--color-<key>`.** That is the intended shadcn usage.
2. **`globals.css` carries a defence block scoped to `[data-slot="chart"]` that overrides
   every literal above by attribute selector.** This converts *"remember to pass a
   colour"* into *"the wrong colour cannot render"*, which is the only version that
   survives twelve engineers and eight sub-tabs.

All 30 literals now live in exactly one file — the one file where a raw value is legal.
**The nine the wrapper used to handle inline were moved there too**: they arrived as
`[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50`-style classes, which
is raw hex inside a component. `chart.tsx`'s `ChartContainer` class list is now
`"flex aspect-video justify-center text-xs"` and nothing else.

**Verification.** Built stylesheet, `dist/assets/*.css`: the only hex values present are
the 18 `--ev-*` tokens (once each), `#0000` / `#0000001a` (transparent, and Tailwind's own
shadow colour — see §8 R-3), and `#ccc` / `#fff` / `#3182bd` / `#808080` / `#eee`
appearing **inside attribute selectors** in the defence block, where they match Recharts'
literals rather than set a colour. `oklch(` count: **0**.

### 1.5 What Q5 does *not* cover

`ChartCard` still has to obey §3.7 and `rtl.md` by construction, and no CSS can enforce
those:

- comparison series is **dotted, same hue** — never a second colour;
- **no gridlines beyond the axis baseline**;
- **plot areas and axes do not mirror in RTL**, and neither do delta arrows;
- money on an axis or in a tooltip goes through `formatMoney`, never `toLocaleString()`.

---

## 2. What was added — 38 files, 3 more than spec §5.2's list

### 2.1 Spec §5.2's 33, all present

`button` `badge` `card` `table` `tabs` `dialog` `alert-dialog` `sheet` `dropdown-menu`
`popover` `tooltip` `input` `label` **`form`→`field`** `textarea` `select` `checkbox`
`radio-group` `switch` `separator` `skeleton` `sonner` `alert` `avatar` `command`
`pagination` `scroll-area` `accordion` `collapsible` `progress` `calendar` `toggle-group`
`chart`

Plus `toggle`, pulled in transitively by `toggle-group`. **35 files** so far.

**One substitution, and it needs recording.** Spec §5.2 item 14 asks for `form`. In shadcn
4.19 **the `form` registry item is an empty alias** — I fetched it and it contains no
`files` array at all, ships no `react-hook-form` binding, and resolves to `field`. `field`
is installed and is the item the spec's requirement now lands on. **Consequence: no form
library is installed.** See §5, request U-A.

### 2.2 Three added beyond the list, each with its reason

Spec §5.2 says *"err toward adding"*, and a primitive missed here blocks a sub-tab that
cannot run the CLI. These three are each required by a named clause of the design spec:

| Added | Required by | Why it cannot wait |
|---|---|---|
| `direction` | **AC-70**, **AC-71**, §14 | Radix reads text direction from a React **context**, not from the DOM. Without `DirectionProvider`, every popover side, every menu alignment and every arrow-key traversal stays LTR while the page mirrors. `shadcn init` itself printed a pointer to the RTL provider docs. Arabic is not a Phase 2 item and this is one file. |
| `kbd` | design spec **§4 slot 3** | The top-bar search field carries a trailing `⌘ K` / `Ctrl K` keycap chip. §14 has a specific rule about it (position mirrors, glyph order does not), so it is a named component, not decoration. |
| `input-group` | design spec **§10.2** ×4, **§2.6** ×1 | **Five** separate requirements are all "an addon inside the input box": the money `SAR` inline-start prefix; the `0/40` character counter inside the field; the phone country-code select docked inline-end; the search field's leading magnifier plus trailing keycap; and global search's removable scope chip **inside** the input. Hand-rolling five of these across five sub-tabs is how a design system drifts. |

`spinner` was also added, for §11.6 state 7 (`save-in-flight`: *"`Save` shows an inline
progress indicator, is not re-triggerable"*). Its header states its one legal use and
forbids the rest, because `states.md` is emphatic that no pattern renders a centred
spinner. **38 files.**

### 2.3 Deliberately NOT added

Spec §5.2's "deliberately not added" table is honoured in full: `breadcrumb`, `drawer`,
**`sidebar`**, `navigation-menu`, `menubar`, `context-menu`, `slider`, `hover-card`,
`carousel`, `aspect-ratio`, `resizable`, `input-otp`. Plus, from shadcn 4's larger
registry:

| Not added | Reason |
|---|---|
| **`sidebar`** | **Q6 is closed** (design spec §0.2). The rail and the sub-tab column are **built** from `button` / `badge` / `tooltip` / `popover` / `scroll-area` / `separator`, all of which are on the list. `sidebar`'s `useIsMobile` re-derives collapse from a **resize listener**, which §3.9 forbids by name, and `useNavCollapse` (0.5) already implements the correct first-run-only semantics. **I was asked to price the alternative and I did: adopting `sidebar` costs more than it saves.** It would also hard-code a cookie (pre-empting Q1), model level 2 as `SidebarMenuSub` (re-importing the nested-pill and elbow-connector semantics D-4 suspends), and give level 2 no independent scroll context — which **AC-19** tests. Nothing in §0.2's four objections is cheaper to override than to avoid. |
| `combobox` | Its registry entry declares a dependency on **`@base-ui/react`** — a second component library. `components.md`: *"one system."* §10.2 defines the combobox as `command` inside a `popover`, and both are installed. |
| `empty` | §5.3 B-02 specifies `EmptyState` as **built** from `button`, with **two kinds** (`first-run` and `no-match`) whose difference is load-bearing under R8. shadcn's `empty` encodes a single illustrated shape. **Flagged as the one place I may have chosen wrong** — see §8 R-1. |
| `button-group` | `toggle-group` covers the segmented control; the sort popover's direction pair is a radio group (§3.2). |
| `item`, `native-select`, `toast` (legacy) | `item` duplicates hand-composed rows; `native-select` collides with §10.2's chevron-pair affordance; `toast` is superseded by `sonner`, which the spec names. |
| `attachment`, `bubble`, `message`, `message-scroller`, `questionnaire`, `marker` | AI-chat components. No pattern in `patterns.md` uses them. |

### 2.4 Coverage against the 41 legacy page shapes

Spec §5.1 warns that counts are of legacy **page shapes**, not routes, and that a merged
sub-tab carries the **union** of its patterns. Checked pattern by pattern:

| Pattern | Legacy pages | Primitives it needs | Present? |
|---|---:|---|:--:|
| P1 index table | 10 | table, tabs, checkbox, dropdown-menu, popover, command, input, pagination, badge, card, button | ✅ |
| P2 two-column detail | 4 | card, separator, avatar, scroll-area, collapsible, badge, dropdown-menu | ✅ |
| P3 sectioned form | 1 | field, label, input, textarea, select, checkbox, radio-group, switch, calendar, input-group, button | ✅ |
| P4 settings shell (21 panes + `my-account`) | 22 | field, switch, accordion, separator, card, dialog, alert-dialog | ✅ |
| P5 metric tiles + charts | 8 | card, badge, **chart**, toggle-group, calendar (date range) | ✅ |
| P6 monitoring shell | 1 | scroll-area, card, toggle-group, badge, button | ✅ |
| P7 ledger | 3 | table, card, pagination — **and no checkbox, no kebab, no sort** | ✅ |
| P8 work queue | 7 | table, card, **progress** (SLA track), badge, button, dialog | ✅ |
| P9 index → detail + timeline | 3 | P1's set + avatar, separator, scroll-area | ✅ |
| P10 activity feed | 2 | avatar, badge, scroll-area | ✅ |
| SH shell | — | button, badge, tooltip, popover, scroll-area, separator, avatar, dropdown-menu, input, command, **kbd**, **input-group**, sheet, sonner, alert, skeleton, **direction** | ✅ |

**Nothing on the design spec's §12 inventory could not be added.** Every one of the 41
build-it components (S-01…S-09, B-01…B-04, L-01…L-06, D-01…D-11, V-01…V-12) composes from
primitives that are now present. The four `DESIGN.md` §6.6 acknowledges have no shadcn
equivalent — monitoring shell, append-only ledger, SLA work queue, derived-value fields —
are built in 0.7 and Phase 1, as expected.

---

## 3. `components.json` — and `"rtl": true` verified

```json
{
  "style": "radix-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles/globals.css",
                "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "rtl": true,
  "aliases": { "components": "@/components", "utils": "@/lib/utils",
               "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```

**`"rtl": true` is in the written file, set by the CLI's `--rtl` flag** — shadcn 4.19
supports it natively (it is in `https://ui.shadcn.com/schema.json` and in `init --help`),
so no hand-editing was needed. **It was set at `init`, before the first `add`**, so no
component is suspect. Verified in the output: the CLI converted `left-*`→`start-*`,
`ml-*`→`ms-*`, `text-left`→`text-start`, and it even emitted paired `rtl:` transform
variants on the switch thumb and the select's popper offsets.

**`-b radix` was chosen over shadcn 4's new Base UI default.** The design spec's §12.2
restyle table describes Radix-based behaviour by name — *"`sheet`: scrim + focus trap"* —
and every `docs/ref` file assumes the classic implementation. Choosing Base UI would have
silently invalidated the restyle notes I was told to apply.

**Two things `shadcn init` did that need naming:**

- It created **`src/lib/utils.ts`** (the `cn` helper). That path belongs to
  utilities-engineer under the single-owner table, but every shadcn primitive imports
  `cn` from it and the CLI writes it as part of `init`. It is CLI-generated, unmodified by
  me, and 0.5 has since confirmed it keeps importing `cn` from there. **Nobody should
  rewrite its export.**
- It added `@fontsource-variable/geist` and `next-themes`. **`next-themes` is
  uninstalled** — the stock `sonner` wrapper read the theme from it, Eyvar ships one
  theme, and the toast is dark by spec regardless. That was the one outstanding typecheck
  error the orchestrator flagged; it is fixed at the source rather than papered over.

---

## 4. `globals.css` — the token layer

Four layers, in order, as `docs/ref/tokens.md` specifies. Full file:
`src/styles/globals.css`.

### 4.1 Colour — 18 tokens, exactly the rebuilt set

`--ev-bg` `--ev-surface` `--ev-bg2` `--ev-hairline` `--ev-hairline2` · `--ev-ink`
`--ev-text-2` `--ev-text-3` · `--ev-blue` `--ev-blue-lt` `--ev-blue-dk` · `--ev-green`
`--ev-green-lt` · `--ev-amber` `--ev-amber-lt` `--ev-amber-dk` · `--ev-red` `--ev-red-lt`

Values are `docs/ref/tokens.md`'s, unchanged. Teal, purple, navy, `--amber-border` and
`--red-border` from `DESIGN.md` §6.1's 24-colour legacy inventory are **not carried over**
— R7 closes the badge palette at five tones and §6.4 forbids inventing a colour.
**`--ev-teal-lt` is correctly absent**; the `new` tone is an outline treatment (§12.1).
`--ev-text-3` is present but carries an inline warning that it computes to 2.79:1 and is
not a text colour.

### 4.2 Geometry — all 16 from design spec §1.2, plus one declared addition

All present and unchanged: `--ev-bp-wide` `--ev-rail-w` `--ev-subnav-w` `--ev-topbar-h`
`--ev-shellbar-h` `--ev-navrow-h` `--ev-row-h` `--ev-row-h-media` `--ev-control-h`
`--ev-control-h-lg` `--ev-page-max` `--ev-detail-rail-w` `--ev-monitor-aside-w`
`--ev-drawer-w` `--ev-radius-card` `--ev-radius-control`.

**One token added deliberately, declared here as required: `--ev-marker: 3px`.** The
design spec names 3px three times as a *named figure* — the SLA countdown track (§8.4.2 /
V-04), the R5a row-critical leading edge (`box-shadow: inset 3px 0 0`, V-05), and the
active nav tile's inset leading bar (§2.3). 3px is off the 4px grid, but D15 records
off-grid **literals** as the defect and R13 preserves individually named figures. One
token beats three literals that can drift apart. **Owner: product-designer, to confirm the
name.**

`--ev-live-loop: 1800ms` is also present, feeding the `LiveDot` keyframe (R18: 1200–2500
ms, never below 0.4 opacity). Transition **durations** deliberately have no `--ev-*`
token: Tailwind's `duration-*` scale is already a token set, and a second source would
drift.

### 4.3 The single language hook — and a discrepancy in the design spec

```css
:root:lang(ar) { … }
```

**One hook, per §9.7 and §14.** Not `body.lang-ar`, not `[dir="rtl"]`, and never both —
direction and language are different questions, and only *language* moves these numbers.
`DirectionProvider` handles direction; this handles size.

> **FINDING F-9 (new, for product-designer).** Design spec §18 says *"Arabic overrides for
> **the six** that vary by language."* The §1.2 table lists **seven**: `--ev-rail-w`,
> `--ev-subnav-w`, `--ev-navrow-h`, `--ev-row-h`, `--ev-row-h-media`, `--ev-control-h`
> **and `--ev-control-h-lg`** (36 → 40). I implemented all seven, treating the table as
> normative and the prose as a miscount. If `--ev-control-h-lg` is *not* meant to grow,
> say so and I will remove one line. 0.5's review independently counted seven and calls
> the layer complete.

**§14's type floors are implemented as the same mechanism**, which required adding a small
set of names that design spec §1.2 does not have. §9.7 rules that *any* dimension varying
by language is a custom property, and a type size is a dimension. Rather than invent
`--ev-fs-*` names, the floors **raise Tailwind's own scale**, so every `text-xs` /
`text-sm` in all 38 components moves without a second class anywhere:

| Utility | Latin | Arabic | §14 floor it implements |
|---|---:|---:|---|
| `text-2xs` | 11px | 12px | badge label 11 → 12 |
| `text-xs` | 12px | 13px | table header 12 → 13 |
| `text-sm` | 13px | 14px | body / nav row / button / table body 13 → 14 |
| `text-base` | 15px | 16px | (first-run empty-state heading) |
| `text-lg` | 17px | 18px | (page header title) |

Arabic `--text-sm--line-height` is 24px on 14px = **1.71**, satisfying §14's *"line-height
≥ 1.7 for body"*.

**Verified in the built stylesheet:** `.text-sm{font-size:var(--text-sm);…}` — the
utility resolves *through* the variable, so the `:root:lang(ar)` block (specificity 0,2,0)
overrides it by cascade. The ramp is therefore in plain `@theme`, **not** `@theme inline`;
inlining would have baked 13px in and silently broken every Arabic floor.

### 4.4 shadcn slots

All 19 mapped from `--ev-*`, none given a raw value. The name collision in
`docs/ref/tokens.md` is respected: **`--muted` is a BACKGROUND** (`--ev-bg2`) and
**secondary text is `--muted-foreground`** (`--ev-text-2`). Plus ten tone slots the shadcn
set has no equivalent for — `--tone-success|warning|info|neutral|critical` and their
foregrounds — surfaced as `bg-success` / `text-warning-foreground` etc.

**`--sidebar-*` (8 slots) deleted**, since `sidebar` is not added. **`--chart-1…5`
deleted**, per §1.2 above. The `.dark` palette is deleted; `@custom-variant dark` is
retained as a one-line no-op so a stray `dark:` utility compiles to nothing rather than
breaking the build.

### 4.5 Radius scale — an off-grid defect fixed

shadcn's stock scale is `calc(var(--radius) * 0.6)`, which with an 8px control radius
produces **4.8px** — exactly the off-grid literal D15 records as a defect. The scale is
declared explicitly instead: `xs` 2 · `sm` 4 · `md` 6 · **`lg` = `--ev-radius-control`
(8)** · **`xl` = `--ev-radius-card` (12)**, with `2xl`/`3xl`/`4xl` **clamped to the card
radius** so nothing larger — and no stadium — is reachable by utility (R15).

### 4.6 Two mechanical defences

1. **`prefers-reduced-motion`** — a global guard (AC-69, §7.6). No component can forget it.
2. **The Recharts literal suppression** — §1.4 above.

---

## 5. What I need from other roles

### From **utilities-engineer** (0.5 is merged; these are follow-ups)

| # | Request | Why |
|---|---|---|
| **U-A** | **A form-state helper, or a ruling that we hand-wire.** shadcn 4's `form` is an empty alias and no form library is installed. §4.4 / §10.4 need: per-field validity, a **count** of blocking items for the page-level banner, `dirty` / `dirty-invalid` / `saving` for the save bar (AC-52), and disabled-until-valid. Every sectioned form and all 21 settings panes need identical behaviour. **This is the largest remaining gap between 0.4 and a buildable P3/P4.** |
| **U-B** | Confirm `cn` stays exported from `src/lib/utils.ts`. It is CLI-generated and all 38 primitives import it. | |
| **U-C** | A `toast()` wrapper that **structurally cannot** pass an `action` (R9: a toast never carries an action link) and enforces ≤ 60 characters. `sonner`'s own API accepts both; §11.5 forbids both. | |

### Decisions I am taking, per the 0.5 handoff

- **`SLA_MESSAGES_EN` merges at the dictionary module, not the provider.** The provider
  should have one input. A dictionary assembled in two places is a dictionary that
  disagrees with itself when one caller forgets a merge. Keys are unchanged either way.
- **U-4 (`<bdi>` on money cells) is accepted as mine.** `formatMoney` correctly does not
  embed U+2068/U+2069 — that poisons copy-paste, CSV export and test assertions — so the
  isolation is markup. It is recorded in `table.tsx`'s header and belongs to `Money`
  (V-02) in 0.7.

### From **product-designer**

- **F-9** — six vs seven Arabic overrides (§4.3 above).
- **R-2** — confirm the name `--ev-marker` (§4.2).
- **R-3** — **there is no shadow token.** `DESIGN.md` D15–D17 record that `:root` holds
  colour and nothing else, and `docs/ref/tokens.md` closes the gap for spacing, radius and
  type by adopting Tailwind's scales — but it is silent on shadow. Popovers, menus,
  drawers and the floating bulk bar all need one ("soft shadow", §9.1). They currently use
  Tailwind's `shadow-md` / `shadow-lg`, whose colour is `rgb(0 0 0 / 0.1)`. **Confirm that
  Tailwind's shadow scale is the token set, or give me `--ev-shadow-*`.** This is the only
  category still resolving to a non-Eyvar value.
- **R-4** — the **unchecked checkbox and radio outline is `--ev-hairline` on white, which
  does not reach the 3:1 that `a11y.md` requires for an interactive boundary.** The token
  set has no darker neutral and §6.4 forbids inventing one. Currently mitigated by the
  ≥24px hit area and the label, but it is a real §7.1 gap that needs either a token or a
  written acceptance.
- **R-5** — **the Arabic typeface is unspecified.** §14 requires a **Naskh** face shipping
  400/600/700 and covering Western digits and `، ؛ ؟`, and says *"`system-ui` alone is not
  acceptable."* `--font-sans` currently falls back through `Noto Naskh Arabic` /
  `Noto Sans Arabic` **without shipping either**, so on a machine without them §14 is not
  met. Latin is Geist (installed by the chosen shadcn preset). Choosing and shipping the
  Arabic face is a design decision, not mine.

### From **product-owner**

Nothing new. F-1 (AC-67, amended), F-2 (AC-72, amended) and F-3 (AC-64) are already
reflected in the code: `sheet` does not trap, the toast has no horizontal transform in
either language.

---

## 6. `/token-audit` — the four documented exceptions

Everything else is clean. These four are deliberate and a reviewer should not re-raise
them:

1. **`transition-[width]` in `progress.tsx`** — the one arbitrary value in the built
   stylesheet. It names a *property*, not a value; there is no token being bypassed.
   Chosen over the stock `transform: translateX(-N%)`, which fills the SLA track from the
   wrong edge under `dir="rtl"`.

2. **`data-[side=left]:slide-in-from-right-2` in `popover` / `dropdown-menu` / `select` /
   `tooltip`** — physical direction words, deliberately. Radix's `data-side` reports the
   **physical** side it actually resolved after collision detection, so the animation must
   match physically. Mirroring these would break the very case they exist for. Every
   *layout* utility in all 38 files is logical.

3. **Roving-highlight focus in `dropdown-menu` / `select` / `command`** — menu items carry
   `outline-hidden` and no `focus-visible:ring`. The visible focus state is the `--ev-bg2`
   accent fill on `data-highlighted`, which **is** a replacement for the outline (what
   §7.2 requires). A ring on top of a roving highlight double-signals on every arrow-key
   press. Recorded in each file's header. Every non-menu interactive element has the 2px
   `--ev-blue` ring at 2px offset.

4. **Three inline `style={{}}` objects** — `chart.tsx` (the caller's series colour),
   `progress.tsx` (the SLA percentage), `toggle-group.tsx` (the gap prop). All genuinely
   dynamic, which the audit's own triage permits. No static styling is inline anywhere.

---

## 7. Two defects I found in my own work — worth reading

Both are the **same bug**, and it is not obvious.

### 7.1 Tailwind v4 harvested the documentation's banned classes into production

Tailwind v4's automatic content detection scans **every non-ignored file in the repo**,
including `docs/`. `docs/ref/tokens.md` and `TEAM-BRIEF.md` quote Tailwind's palette
utilities and arbitrary-value examples *in order to ban them* — and Tailwind emitted a
working rule for every one into `dist/assets/*.css`, along with `--color-blue-500`,
`--color-slate-100/200` and `--color-gray-400/500`.

**The documentation that forbids Tailwind's palette was shipping Tailwind's palette**, and
a stray `bg-blue-500` in any component would have *silently worked* while passing a source
grep of `src/`.

Fixed with `@import "tailwindcss" source(none)` plus two explicit `@source` lines for
`index.html` and `src/**/*.{ts,tsx}`. **Do not remove `source(none)`.** Verified: those
rules and theme variables are gone.

### 7.2 …and then my own restyle headers did exactly the same thing

**Tailwind scans comments.** Every *"Removed on arrival: `ring-[3px]`, `rounded-[2px]`"*
line in a restyle header minted the utility it was documenting. `.ring-[3px]`,
`.rounded-[2px]`, `.rounded-[4px]`, `.h-[14px]`, `.w-[24px]`, `.w-[32px]`, `.bg-black/10`
and five `sm:`/`md:` breakpoints were all live in the stylesheet — emitted by the prose
that condemned them. Sixteen headers now describe stock values in prose instead of as
literals.

**Guard for reviewers and for visual-QA: grep the BUILT stylesheet, not just `src/`.** A
banned pattern can reach production from a comment, a doc, or a test fixture.

### 7.3 A consequence worth keeping — one breakpoint, enforced

Design spec §0.1: *"There is no second breakpoint anywhere in the product. If a screen
needs one, that is a finding against this document, not a local decision."* Tailwind ships
five. All five are now deleted (`--breakpoint-*: initial`) and exactly one is declared:

```css
--breakpoint-wide: 1344px;   /* the only responsive variant: `wide:` */
```

A stray `lg:` or `sm:` utility is now a visible no-op rather than a working escape hatch
that quietly softens D2. Two dead `sm:`/`md:` classes inherited from stock shadcn were
found and removed this way. **Built stylesheet contains exactly one `@media (min-width:)`
rule, at 1344px.**

> **Note the one unavoidable duplication.** `1344` is written twice: once as
> `--breakpoint-wide` (a media query cannot read a custom property) and once as
> `--ev-bp-wide` on `:root` (because `useNavCollapse` reads it at runtime through
> `getComputedStyle`, per 0.5's handoff item 5). **They move together or the first-run nav
> default silently disagrees with the layout.** Both carry that comment.

---

## 8. Open risks I am handing on

| # | Risk | Owner |
|---|---|---|
| **R-1** | **`empty` was not added, and `components.json` is now frozen.** §5.3 specifies `EmptyState` (B-02) as built from `button` with two kinds whose difference R8 makes load-bearing, and shadcn's `empty` encodes one illustrated shape — so building it is right. But if 0.7 or a Phase 1 agent decides otherwise, they cannot add it. **If product-designer wants shadcn `empty` as the base, say so now and I will unfreeze for one addition.** |
| **R-2** | No form library. See U-A. P3 (plan editor) and P4 (21 settings panes) are the exposed surfaces. |
| **R-3** | No shadow token (§5, R-3). The only category still resolving to a non-Eyvar value. |
| **R-4** | Unchecked checkbox / radio outline fails 3:1 (§5, R-4). |
| **R-5** | No Arabic Naskh face is shipped (§5, R-5). §14 is not met on a machine without Noto Naskh installed. |
| **R-6** | `--ev-hairline2`, `--ev-text-3`, `--ev-page-max`, `--ev-detail-rail-w`, `--ev-monitor-aside-w`, `--ev-shellbar-h` are declared but not yet consumed — 0.7 and Phase 1 consume them. Flagged so nobody "cleans up an unused token". |

---

## 9. For the next engineer — the six things that will bite

1. **Never run `shadcn add`.** `components.json` is frozen. Need a primitive? Ask the
   shell owner; adding one in Phase 1 corrupts another agent's files.
2. **`Button`'s default variant is `secondary`, not `default`.** R3 allows one primary per
   screen, so the primary must be asked for by name: `<Button variant="default">`. It
   cannot arrive by omission. There is **no `outline` variant** — Eyvar has one secondary
   treatment, not two.
3. **`Badge` takes `tone`, not `variant`,** and **there is no `destructive` tone.** The
   five are `success | warning | info | neutral | new`, and `new` is an outline. R5a:
   there is no red badge. Per-row criticality is `RowCriticalMarker` (V-05) plus the
   countdown pill's own words.
4. **The table mode is `table.mode` from `useIndexTable`, not a prop you invent.** It is a
   discriminated union: `if (table.mode === 'ledger')` narrows selection and sort away and
   the compiler refuses a checkbox. Adding a second `mode` prop creates a weaker parallel
   source of truth and undoes AC-48.
5. **`Sheet` is `modal={false}` with no overlay and no trap, and an outside click does not
   close it.** That is §5.5 + §7.3.3 + AC-20, not an oversight. `Dialog` is the opposite —
   scrim, trap, closes on outside click — and both are correct. **A modal nested inside a
   drawer is forbidden.**
6. **Read the header of the file before you use it.** All 38 carry the rules applied, the
   stock behaviour removed, and — more usefully — the rule that will be broken next.
