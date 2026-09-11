# Tokens

`src/styles/globals.css` is the token layer, and it is the visual authority (D7): colour,
spacing, radii, borders and type are settled there. Every value below is read from that file
— when the two disagree, the file is right and this page is a defect. Never cite a pixel
figure from `DESIGN.md` §1–§5 against it (R13).

Stack: **Tailwind v4 + shadcn/ui**. Tailwind v4 is CSS-first — there is no
`tailwind.config.js` colour palette. Everything lives in `globals.css`.

## Two layers, one source

```css
/* 1. Eyvar tokens — the source of truth. Raw values live here and nowhere else. */
:root {
  --ev-bg:        #ffffff;   /* content region, edge to edge */
  --ev-surface:   #ffffff;   /* card, tile, table body */
  --ev-bg2:       #f6f8f9;   /* the one subdued tint */
  --ev-bg-nav:    #f6f8f9;   /* nav columns — the same declared tint */
  --ev-bg-rail:   #e9edf1;   /* icon rail, the darkest of the three grounds */
  --ev-nav-hover: #f0f2f4;   /* nav hover fill — NOT a text ground */
  --ev-nav-chip:  #e5e7eb;   /* nav count chip plate; digits are --ev-ink */
  --ev-hairline:         #e3e7ea;  /* structure: card and table edges */
  --ev-hairline-control: #d0d7dd;  /* anything the operator can act on */
  --ev-hairline-strong:  #828b99;  /* R19 only — resting unchecked control */
  --ev-ink:      #171a21;   /* primary text     17.411:1 on white */
  --ev-text-2:   #6b7280;   /* secondary text    4.834:1 on white */
  --ev-text-3:   #9ca3b0;   /* 2.536:1 — NOT a text colour */
  --ev-brand:    #0c6944;  --ev-brand-lt: #e7f0ec;
  --ev-blue:     #2b6ef0;  --ev-blue-lt: #eaf0fe;  --ev-blue-dk: #1b51c4;
  --ev-green:    #1d723c;  --ev-green-lt: #e7f6ec;
  --ev-amber:    #b45309;  --ev-amber-lt: #fff4e6;  --ev-amber-dk: #7a3e12;
  --ev-red:      #b42318;  --ev-red-lt:   #fef0ee;
  --ev-row-critical:          #fff7f6;   /* R5a breached row */
  --ev-row-critical-emphasis: #fef0ee;
}

/* 2. shadcn semantic slots — mapped from Eyvar tokens, never given raw values. */
:root {
  --background:  var(--ev-bg);
  --foreground:  var(--ev-ink);
  --nav:         var(--ev-bg-nav);          /* utility: bg-nav */
  --nav-hover:   var(--ev-nav-hover);
  --nav-chip:    var(--ev-nav-chip);
  --card:        var(--ev-surface);
  --popover:     var(--ev-surface-2);
  --primary:     var(--ev-brand);
  --secondary:   var(--ev-surface);         /* white + hairline */
  --muted:       var(--ev-bg2);             /* NB: a BACKGROUND in shadcn */
  --accent:      var(--ev-bg2);             /* row, menu and nav hover fill */
  --destructive: var(--ev-red);             /* R5a — four uses only */
  --border:      var(--ev-hairline);
  --input:       var(--ev-hairline-control);
  --ring:        var(--ev-brand);
}

/* 3. Expose to utilities. */
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* …one line per slot */
}
```

A dark theme redeclares layer 1 and nothing else. Layer 2 and every component are unchanged,
which is the whole reason for the split.

## The nav's grounds, and why they are not taste values

The rail and the nav columns get a ground darker than the content region (`DECISIONS.md`
**D6**), and the seams carry a hairline.

| Token | Value | What pins it |
|---|---|---|
| `--ev-bg-nav` | `#f6f8f9` | One declared tint, shared with `--ev-bg2`. Two names, one value, so they can diverge later without a rename. |
| `--ev-bg-rail` | `#e9edf1` | The rail is the darkest of the three grounds, so the shell reads dark-to-light inward. It costs a text token: `--ev-text-2` measures 4.264 : 1 here and fails AA, so the rail has its own `--ev-text-2-rail` `#626974` at 4.666 : 1. |
| `--ev-nav-chip` | `#e5e7eb` | The count-chip plate. Digits are `--ev-ink` (14.063 : 1 on the pill), never `--ev-text-2` — any plate dark enough to read as a plate lands `--ev-text-2` below AA at 11 px. |
| `--ev-nav-hover` | `#f0f2f4` | Between the nav ground and the active white, so hover and active stay distinguishable when adjacent. **Not a text ground** — `--ev-text-2` on it is 4.308 : 1. Hover sets the label to `--ev-ink` in the same rule. |

Three rules that come with them:

1. **`--ev-bg-nav` is the nav columns and nothing else.** §2.1 asks for a near-canvas grey,
   not a panel fill: if it reads as a coloured sidebar it is too dark. The top bar spans the
   **content** region, so it stays `--ev-bg`.
2. **The nav's focus ring is `ring-2 ring-inset`, not `ring-offset-2`** — the sub-tab rows sit
   at gap 0, so an offset ring would overlap its neighbour. This is the only place in the
   product that does not use the offset ring, and the zero gap is the reason.
3. **Chip digits are `--ev-ink`, never `--ev-text-2`.**

## Two contrast rules that are easy to break

**A control boundary must clear 3:1 on all five grounds a control can occupy.** Those are
`#ffffff` (a card), `#f6f8f9` (a tinted row or a nav column), `#f0f2f4` (a hovered nav row),
`#fff7f6` (a breached row) and `#fef0ee` (a breached row's emphasis). Sweep all five, not
just white. `#858b99` is the floor — 3.042 on `#f0f2f4`, the worst of the five — and anything
lighter has no margin left. The shipped `--ev-hairline-strong` sits one step inside it at
`#828b99`, 3.066 on that same ground.

**Never walk a critical row's ground lighter to fix ink contrast.** `--ev-red-lt` is that
ground. Lightening it buys a fraction of a point on text and breaks the R19 checkbox boundary
two steps later, because the checkbox sits on the same ground and is already at 3.099. Fix
the ink instead — `--ev-text-2-row-critical` exists for exactly this.

## The name collision — read this once

shadcn and the `--ev-` layer use the **same names for different things**. This is why Eyvar
tokens are prefixed:

| Name | Eyvar meaning | shadcn meaning |
|---|---|---|
| `--muted` | secondary **text** colour | a muted **background** |
| `--border` | hairline colour | the border slot |
| `--primary` | (no equivalent) | primary action |

Secondary text is `--muted-foreground`, mapped from `--ev-text-2`. Getting this backwards
produces grey-on-grey text that passes review and fails contrast.

## Rules

1. **Never write a raw value in a component.** No `bg-[#0c6944]`, no `p-[13px]`, no
   `text-[11px]`.
2. **Never use Tailwind's built-in palette.** `bg-blue-500`, `text-gray-400`,
   `border-slate-200` are not your tokens — they look legitimate and are the biggest drift
   risk under Tailwind. Only semantic utilities: `bg-background`, `text-muted-foreground`,
   `border-border`, `bg-primary`.
3. **New token → `globals.css`**, in the `--ev-*` layer, mapped into a slot, same commit.
4. **`--ev-text-3` (2.536:1) is not a text colour.** Use `--ev-text-2`. See `a11y.md`.
5. **There is no room below `--ev-text-2`.** It clears 4.5 by 0.334 on white. A third muted
   tier goes *above* it, in the 4.834-to-17.411 gap, never below.
6. Run `/token-audit` before handing anything off.

## Spacing, radius, type

Tailwind's default scale is 4px-based, which matches the `DESIGN.md` grid, so use it:
`p-2` `gap-3` `text-sm`. Density (§6.2 D-2) means the compact end of that scale: `text-[13px]`
is banned, `text-sm` with a tightened base is not. The base is set in `@theme` —
`--text-xs: 13px`, `--text-sm: 14px`, `--text-base: 16px` — then the scale is used by name.
Radii are two tokens, `--ev-radius-card` and `--ev-radius-control`, both 8px; a badge takes
4px (R15).

Geometry a screen may not invent: `--ev-rail-w` 80px, `--ev-subnav-w` 224px, `--ev-topbar-h`
52px, `--ev-row-h` 40px, `--ev-control-h` 32px, `--ev-page-pad` 32px, `--ev-page-max` 1120px,
`--ev-drawer-w` 480px. A compact viewport and a coarse pointer each redeclare the heights;
nothing else changes.

## Elevation — the closed set of three

```css
--ev-shadow-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--ev-shadow-2: 0 2px 8px -2px rgb(0 0 0 / 0.12), 0 1px 2px 0 rgb(0 0 0 / 0.06);
--ev-shadow-3: 0 8px 24px -8px rgb(0 0 0 / 0.24), 0 2px 6px -2px rgb(0 0 0 / 0.12);
```

| Tier | Surfaces |
|---|---|
| **none** | rail, sub-tab column, top bar, save bar, banner strip, nested blocks, table rows, canvas, scrim |
| **1** | cards, metric tiles, chart cards, form cards, sticky table header once the body scrolls under it |
| **2** | popovers, dropdown menus, tooltips, command lists, the toast, the bulk-action bar, the shell drawers |
| **3** | modals at 440/560/800 — the only scrimmed surfaces, and nothing else |

- **Three is the whole set.** A fourth needs a row in §6.2.
- All three are `offset-x: 0`, so **nothing mirrors** in Arabic. They do not go under the
  `:root:lang(ar)` hook.
- Achromatic on purpose — `rgb(0 0 0 / α)`, never tinted. A tinted shadow would have to pick
  a side between a warm hairline and a cool ground.
- **Density compresses blur and offset; it does not touch alpha.** At 32px rows surfaces sit
  closer together and need *more* edge definition per pixel, not less.
- **`box-shadow` is one property and §7.2's focus ring already owns it.** Any surface with
  both elevation and focus composes them into one comma list, or moves elevation to a
  wrapper. Getting this wrong reopens defect D20 silently.

## Analytics v2 additions (D40, D39)

The categorical chart ramp runs to eight stops. `--chart-s1`…`--chart-s6` are unchanged; see
`src/styles/globals.css` at `--ev-series-1` for their full derivation. `s7`/`s8` were derived
the same way (worst-of-trichromat/protanope/deuteranope dE76, ≥3:1 non-text on `--card` and
`--ev-bg`, dE76 ≥20 from `--ev-red` and `--ev-amber`, Lab chroma ≥30) and re-solved
independently per theme, same as `s2`–`s6`.

| Token | Light | Dark | Card contrast (light / dark) |
|---|---|---|---|
| `--ev-series-7` (`--chart-s7`) | `#2b661a` (moss) | `#419130` | 6.716 / 5.019 |
| `--ev-series-8` (`--chart-s8`) | `#f31b6a` (rose) | `#ea0619` | 3.916 / 4.283 |
| `--ev-series-7-lt` (`--chart-fill-s7`) | `#eaf0e8` | `#182d13` | — |
| `--ev-series-8-lt` (`--chart-fill-8`) | `#fee8f0` | `#441d20` | — |

`s8`'s dark hue sits 17° from its light twin: dark's `--ev-red` is a different hue from
light's, so the same dE76-from-red floor lands the two themes on different hues. The six's "hue
within 6°" is a preference, not a rule, and loses to the floor here.

| Token | Value | What it is |
|---|---|---|
| `--ev-block-h-s` / `-m` / `-l` / `-xl` (`h-block-h-s` …) | 375 / 500 / 625 / 750 px | A page `report` block's four fixed heights, spec 03 §2, D39. Amplitude's own four row heights. |
| `--ev-heat-1` … `-4` (`bg-heat-1` …) | `color-mix(in srgb, var(--ev-series-1-lt) 25/50/75%, transparent)`, then the fill itself at 100% | Four ascending alpha steps of `--chart-fill-s1` for a retention matrix cell. Same `color-mix` idiom as `--ev-hairline-soft`. |

## Two tokens that are not what they look like

| Token | What it is | What it is not |
|---|---|---|
| `--ev-hairline-strong` | **R19.** The resting boundary of an *unchecked* checkbox or radio, licensed because §7's 3:1 non-text contrast beats §6.4's "no new colour". | Not a border, not a divider, not a hover state. Any second use needs a §6.2 row. |
| `--ev-marker: 3px` | The R5a breached-row leading edge — a geometry token. In Arabic it needs the `inset-inline-start` pseudo-element treatment. | **Not elevation.** Never express it through `--ev-shadow-*`. |
