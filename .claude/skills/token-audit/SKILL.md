---
name: token-audit
description: Grep Eyvar Admin source for values that should be design tokens - literal colours, raw px, physical directions, killed focus outlines, inline styles. Use before handing off a component, before merge, or when auditing drift. Mechanical, fast, no judgement required.
---

# Token audit

`DESIGN.md` §6.4 says every value is a token. This is how that stays true. It is a script,
not an opinion — every hit is a defect or a deliberate, documented exception.

## Run

```bash
# 1. Literal colours outside the token file
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" src --glob '*.css' | rg -v 'styles/tokens.css'

# 2. Raw pixel values in component styles (spacing, radius, size)
rg -n ":\s*-?[0-9.]+px" src --glob '*.module.css'

# 3. Physical directions - forbidden by §9.1, the product ships Arabic
rg -n "margin-(left|right)|padding-(left|right)|border-(left|right)(-|:)|^\s*(left|right)\s*:|text-align:\s*(left|right)" src --glob '*.css'

# 4. Focus killed without a replacement
rg -n -A3 "outline:\s*none" src --glob '*.css'

# 5. Inline styles - they bypass the token layer entirely
rg -n "style=\{\{" src --glob '*.tsx'

# 6. Non-focusable click targets (§7.4)
rg -n "<(div|span|li|td|tr)[^>]*onClick" src --glob '*.tsx'

# 7. Raw durations
rg -n "transition:[^;]*[0-9]+m?s|animation:[^;]*[0-9]+m?s" src --glob '*.css'

# 8. Hover-only reveals without a focus fallback (§7.3)
rg -n -B2 -A2 ":hover" src --glob '*.module.css' | rg -n "opacity:\s*0"
```

## Triage

| Hit | Verdict |
|---|---|
| Colour outside `tokens.css` | Defect. Add the token or use the existing one. |
| `px` in a module CSS | Defect **unless** it is a genuine one-off geometry (a 1px hairline, a border width). Spacing, radius and font-size are always tokens. |
| `margin-left`, `text-align: right`, bare `left:` | Defect (§9.1). Use `margin-inline-start`, `text-align: start`, `inset-inline-start`. |
| `outline: none` with no replacement ring in the same rule | Defect (§7.2). |
| Inline style object | Defect unless the value is genuinely dynamic (a computed chart width, a live position). Static styling belongs in the module. |
| `<div onClick>` | Defect (§7.4). Use `<button>`. |
| Raw duration | Defect. Tokenise it; motion also has to answer to §7.6 and R18. |
| `opacity: 0` revealed only on `:hover` | Defect (§7.3). Add `:focus-within`. |

## If the token doesn't exist

Only colours are tokenised today (`DESIGN.md` §6.1, defect D16). Radius, spacing,
font-size and duration have **no token set yet**, and are frozen until one exists.

So: reuse a value already present in the CSS, note it in the ticket that will close D16 —
or extend `src/styles/tokens.css` deliberately, in the same commit, and say so in the
handoff. What you may not do is inline the value and move on. That is exactly how the
legacy app reached 36 off-token colours, 15 font sizes and 13 radii.

## Report

```markdown
## Token audit — <scope>
| File:line | Category | Value | Verdict | Fix |

Clean: <yes/no>. Exceptions granted: <list, each with a reason>.
```

Zero hits is a normal, good result. Do not invent findings to look thorough.

## Reference

Check the small file, not the 5,692-line document:
`docs/ref/tokens.md` · `docs/ref/defects.md`

Index: `docs/ref/README.md`. Open a `DESIGN.md` section only for the
reasoning or the evidence behind a rule.
