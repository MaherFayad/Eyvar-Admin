---
name: token-audit
description: Grep Eyvar Admin source for values that bypass the design tokens - Tailwind palette classes, arbitrary values, raw hex, physical directions, killed focus outlines. Use before handing off a component, before merge, or when auditing drift. Mechanical, fast, no judgement required.
---

# Token audit

`DESIGN.md` §6.4 says every value is a token. Under Tailwind the drift risk is different
from CSS Modules: the danger is not just `bg-[#185FA5]`, it is **`bg-blue-500`** — a
legitimate-looking utility that is not your token and will pass a casual review.

## Run

```bash
# 1. Tailwind's built-in palette - the biggest drift risk. These are NOT Eyvar tokens.
rg -n "\b(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b" src

# 2. Arbitrary values
rg -n "\b[a-z-]+-\[[^\]]+\]" src --glob '*.tsx' --glob '*.css'

# 3. Raw colours anywhere outside the token file
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src | rg -v 'styles/globals.css'

# 4. Physical directions - the CLI converts on add, but hand-written code drifts (§9.1)
rg -n "\b(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right|inset-l|inset-r)-" src --glob '*.tsx'
rg -n "margin-(left|right)|padding-(left|right)|^\s*(left|right)\s*:|text-align:\s*(left|right)" src --glob '*.css'

# 5. Focus killed without replacement
rg -n -A2 "outline-none|outline:\s*none" src | rg -v "focus-visible:ring|focus:ring"

# 6. Inline style objects - bypass the token layer entirely
rg -n "style=\{\{" src --glob '*.tsx'

# 7. Non-focusable click targets (§7.4)
rg -n "<(div|span|li|td|tr)[^>]*onClick" src --glob '*.tsx'

# 8. Hover-only reveals with no focus fallback (§7.3)
rg -n "(group-hover|hover):(opacity-100|visible|flex|block)" src --glob '*.tsx' | rg -v "focus-within|focus-visible"

# 9. shadcn components still carrying stock styling (they arrive non-compliant)
rg -ln "slate-|gray-|zinc-" src/components/ui
```

## Triage

| Hit | Verdict |
|---|---|
| Tailwind palette class | **Defect.** Replace with a semantic slot: `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`. |
| Arbitrary value | **Defect.** Use the scale, or add an `--ev-*` token and map it. |
| Raw colour outside `globals.css` | **Defect**, no exceptions. |
| Physical direction | **Defect** (§9.1). `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`. |
| `outline-none` with no `focus-visible:ring` | **Defect** (§7.2). |
| Inline style | Defect unless genuinely dynamic — a computed chart width, a live marker position. Static styling never. |
| `<div onClick>` | **Defect** (§7.4). Use `<button>`. |
| Hover-only reveal | **Defect** (§7.3). Add `focus-within:`. |
| Stock shadcn colours in `components/ui/` | **Defect.** That component was never restyled — see `docs/ref/components.md`. |

## Check the config too

```bash
rg -n '"rtl"' components.json     # must be true - it is how §9.1 is enforced on add
```

If `rtl` is false or missing, every component added since is suspect. Re-check them, and
fix the config before adding another.

## Report

```markdown
## Token audit — <scope>
| File:line | Category | Value | Verdict | Fix |

Clean: <yes/no>. Exceptions granted: <list, each with a reason>.
```

Zero hits is a normal, good result. Do not invent findings to look thorough.

## Reference

Check the small file, not the whole document:
`docs/ref/tokens.md` · `docs/ref/components.md` · `docs/ref/defects.md`

Index: `docs/ref/README.md`. For a section's full text read its partial in
`docs/06-design-reference/_partials/`; which rule wins is `docs/RULINGS.md`.
