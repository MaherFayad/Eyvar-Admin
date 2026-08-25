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
