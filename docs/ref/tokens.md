# Tokens

Stack: **Tailwind v4 + shadcn/ui**. Tailwind v4 is CSS-first — there is no
`tailwind.config.js` colour palette. Everything lives in `src/styles/globals.css`.

## Two layers, one source

```css
/* 1. Eyvar tokens — the source of truth. DESIGN.md §6.1. */
:root {
  --ev-bg:        #EEF0F3;   /* page canvas */
  --ev-surface:   #ffffff;   /* card */
  --ev-bg2:       #F8F8F5;   /* subdued fill */
  --ev-hairline:  #E4E2DA;
  --ev-hairline2: #DDDBD3;
  --ev-ink:       #1A1A18;   /* primary text     17.43:1 */
  --ev-text-2:    #6B6B68;   /* secondary text    5.35:1 */
  --ev-text-3:    #9B9B97;   /* 2.79:1 — NOT for text */
  --ev-blue:      #185FA5;   /* primary action, R3 */
  --ev-blue-lt:   #E6F1FB;
  --ev-blue-dk:   #0C447C;   /* links, + underline */
  --ev-green:     #27500A;  --ev-green-lt: #EAF3DE;
  --ev-amber:     #E8A33D;  --ev-amber-lt: #FAEEDA;  --ev-amber-dk: #633806;
  --ev-red:       #A32D2D;  --ev-red-lt:   #FCEBEB;
}

/* 2. shadcn semantic slots — mapped from Eyvar tokens, never given raw values. */
:root {
  --background: var(--ev-bg);
  --foreground: var(--ev-ink);
  --card: var(--ev-surface);
  --primary: var(--ev-blue);
  --primary-foreground: #ffffff;
  --muted: var(--ev-bg2);            /* NB: a BACKGROUND in shadcn */
  --muted-foreground: var(--ev-text-2);
  --border: var(--ev-hairline);
  --destructive: var(--ev-red);
  --ring: var(--ev-blue);
}

/* 3. Expose to utilities. */
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* …one line per slot */
}
```

## The name collision — read this once

shadcn and the legacy app use the **same names for different things**. This is why Eyvar
tokens are prefixed `--ev-`:

| Name | Legacy Eyvar meaning | shadcn meaning |
|---|---|---|
| `--muted` | secondary **text** colour | a muted **background** |
| `--border` | hairline colour | the border slot |
| `--primary` | (didn't exist) | primary action |

Secondary text is `--muted-foreground` in shadcn, mapped from `--ev-text-2`. Getting this
backwards produces grey-on-grey text that passes review and fails contrast.

## Rules

1. **Never write a raw value in a component.** No `bg-[#185FA5]`, no `p-[13px]`, no
   `text-[11px]`.
2. **Never use Tailwind's built-in palette.** `bg-blue-500`, `text-gray-400`,
   `border-slate-200` are not your tokens — they look legitimate and are the biggest drift
   risk under Tailwind. Only semantic utilities: `bg-background`, `text-muted-foreground`,
   `border-border`, `bg-primary`.
3. **New token → `globals.css`**, in the `--ev-*` layer, mapped into a slot, same commit.
4. **`--ev-text-3` (2.79:1) is not a text colour.** Use `--ev-text-2`. See `a11y.md`.
5. Run `/token-audit` before handing anything off.

## Spacing, radius, type

Tailwind's default scale is 4px-based, which matches the `DESIGN.md` grid, so use it:
`p-2` `gap-3` `text-sm`. This closes legacy defect D16 — those categories finally have a
token set.

Density (§6.2 D-2) means the compact end of the scale: `text-[13px]` is banned, but
`text-sm` with a tightened base is not. Set the base in `@theme`, then use the scale.

## Elevation — the closed set of three

Set in Phase 0.2 (R-3), measured from five reference frames with PIL rather than eyeballed.
Reasoning and the measurement floor are in
`docs/05-restructure/design/00-decisions-r3.md`; the surface map is `00-shell.md` §1.3.

```css
--ev-shadow-1: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--ev-shadow-2: 0 2px 8px -2px rgb(0 0 0 / 0.12), 0 1px 2px 0 rgb(0 0 0 / 0.06);
--ev-shadow-3: 0 8px 24px -8px rgb(0 0 0 / 0.24), 0 2px 6px -2px rgb(0 0 0 / 0.12);
```

| Tier | Surfaces |
|---|---|
| **none** | rail, sub-tab column, top bar, save bar, banner strip, nested blocks, table rows, canvas, scrim |
| **1** | cards, metric tiles, chart cards, form cards, sticky table header once the body scrolls under it |
| **2** | popovers, dropdown menus, tooltips, command lists, the toast, the bulk-action bar, the 406px shell drawers |
| **3** | modals at 440/560/800 — the only scrimmed surfaces, and nothing else |

- **Three is the whole set.** A fourth needs a row in §6.2.
- All three are `offset-x: 0`, so **nothing mirrors** in Arabic. They do not go under the
  `:root:lang(ar)` hook.
- Achromatic on purpose — `rgb(0 0 0 / α)`, never tinted. Every sampled frame is R=G=B, and
  Eyvar's palette is split (warm `#E4E2DA` hairline on a cool `#EEF0F3` canvas), so a
  tinted shadow would have to pick a side.
- **Density compresses blur and offset; it does not touch alpha.** At 32px rows surfaces sit
  closer together and need *more* edge definition per pixel, not less.
- **`box-shadow` is one property and §7.2's focus ring already owns it.** Any surface with
  both elevation and focus composes them into one comma list, or moves elevation to a
  wrapper. Getting this wrong reopens defect D20 silently.

## Two tokens that are not what they look like

| Token | What it is | What it is not |
|---|---|---|
| `--ev-hairline-strong` | **R19.** The resting boundary of an *unchecked* checkbox or radio, licensed because §7's 3:1 non-text contrast beats §6.4's "no new colour". | Not a border, not a divider, not a hover state. Any second use needs a §6.2 row. |
| `--ev-marker: 3px` | The R5a breached-row leading edge — a geometry token. In Arabic it needs the `inset-inline-start` pseudo-element treatment. | **Not elevation.** Never express it through `--ev-shadow-*`. |
